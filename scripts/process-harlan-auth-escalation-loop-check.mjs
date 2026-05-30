#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { validateBuildLaneCardScaffold, validateBuildLaneSprintItemMetadata } from '../lib/build-lane-reliability.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
import { closeFoundationDb } from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  HARLAN_AUTH_ESCALATION_LOOP_APPROVAL_PATH as APPROVAL_PATH,
  HARLAN_AUTH_ESCALATION_LOOP_CARD_ID as CARD_ID,
  HARLAN_AUTH_ESCALATION_LOOP_CLOSEOUT_KEY as CLOSEOUT_KEY,
  HARLAN_AUTH_ESCALATION_LOOP_CLOSEOUT_PATH as CLOSEOUT_PATH,
  HARLAN_AUTH_ESCALATION_LOOP_DOC_PATH as DOC_PATH,
  HARLAN_AUTH_ESCALATION_LOOP_NEXT_CARD_ID as NEXT_CARD_ID,
  HARLAN_AUTH_ESCALATION_LOOP_PLAN_PATH as PLAN_PATH,
  HARLAN_AUTH_ESCALATION_LOOP_SCRIPT_PATH as SCRIPT_PATH,
  HARLAN_AUTH_ESCALATION_LOOP_SPRINT_ID as SPRINT_ID,
  HARLAN_AUTH_ESCALATION_NOT_NEXT_BOUNDARIES as NOT_NEXT,
  HARLAN_AUTH_ESCALATION_OLD_SYSTEM_SOURCE_REFS as OLD_SYSTEM_SOURCE_REFS,
  HARLAN_AUTH_ESCALATION_PROOF_COMMANDS as PROOF_COMMANDS,
  buildHarlanAuthEscalationLoop,
  buildHarlanAuthEscalationLoopDogfoodProof,
  evaluateHarlanAuthEscalationLoop,
} from '../lib/harlan-auth-escalation-loop.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
  buildPlanCriticResultSummary,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-harlan-auth-escalation-loop'

const CHANGED_FILES = [
  'lib/harlan-auth-escalation-loop.js',
  SCRIPT_PATH,
  PLAN_PATH,
  APPROVAL_PATH,
  DOC_PATH,
  'docs/agents/harlan.md',
  CLOSEOUT_PATH,
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'lib/foundation-build-closeout-agent-runtime-records.js',
  'lib/foundation-runtime-reliability-verifier.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'scripts/foundation-verify.mjs',
  'package.json',
]

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] }),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
  }
}

function normalizeText(value) {
  return String(value || '').trim()
}

function stableRunId(seed = '') {
  return crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 12)
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

async function readRepoFile(relativePath, { optional = false } = {}) {
  try {
    return await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
  } catch (error) {
    if (optional && error?.code === 'ENOENT') return ''
    throw error
  }
}

async function readFileAbsolute(filePath) {
  return fs.readFile(filePath, 'utf8')
}

async function repoFileExists(relativePath) {
  try {
    return (await fs.stat(path.join(repoRoot, relativePath))).isFile()
  } catch {
    return false
  }
}

function cloneSprintItem(item = {}) {
  return {
    cardId: item.cardId || item.backlogId,
    order: item.order || item.sprintOrder,
    stage: item.stage || 'scoping',
    planRef: item.planRef || null,
    definitionOfDone: item.definitionOfDone || '',
    proofCommands: item.proofCommands || [],
    readinessBlockerCleared: item.readinessBlockerCleared || null,
    notNextBoundaries: item.notNextBoundaries || [],
    existingWorkCheck: item.existingWorkCheck || {},
    returnedReason: item.returnedReason || null,
    metadata: item.metadata || {},
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/brain-fleet-foundation.js',
      'lib/harlan-operator-loop.js',
      'lib/foundation-runtime-reliability-verifier.js',
      ...OLD_SYSTEM_SOURCE_REFS,
    ],
    existingDocs: [
      'docs/agents/harlan.md',
      'docs/agents/harlan-operator-loop.md',
      'docs/_archive/handoffs/2026-05-26-hot-doc-refresh/2026-05-20-brain-fleet-foundation-closeout.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
    ],
    existingScripts: [
      'scripts/process-brain-fleet-foundation-check.mjs',
      'scripts/process-harlan-operator-loop-check.mjs',
      'scripts/process:foundation-ship',
      SCRIPT_PATH,
    ],
    existingPolicy: [
      'Current Sprint API owns active blocker truth.',
      'No live provider probes before auth escalation, quota ledger, and capability registry ship.',
      'No external sends or credential mutation from proof paths.',
      'No MEETING-VAULT-ACL-001 Phase B or Drive permission mutation.',
    ],
    reused: [
      'Brain Fleet no-auth route contract',
      'Harlan operator-loop governance',
      'old-system auth escalation protocol',
      'process write guards',
      'Foundation ship gate',
    ],
    oldSystemSources: OLD_SYSTEM_SOURCE_REFS,
    reusedPatterns: [
      'auth-escalate dual-channel Steve notification copy and dedup policy',
      'browser-auth service config plus 2FA wait posture',
      'myicor-auth needs_manual signal',
      'web-extractor wait2FAResolution timeout and resume shape',
      'reply-context DONE routing/TTL context shape',
      'auth-escalation-protocol blocked-auth and silent reverify rules',
    ],
    notRebuilt: [
      'No live Telegram sender',
      'No browser auth automation',
      'No credential/token mutation',
      'No live provider probe',
      'No live source extraction',
    ],
    exactGap: 'Brain Fleet and extractor work need a Foundation-owned auth_needed event loop before any paid/private/live provider proof can start.',
    overBroadRisk: 'The card can drift into live sends, browser auth, provider probes, or extraction; v1 remains dry-run contract/proof only.',
    readyBy: 'Steve May 20 ordered queue',
    readyAt: '2026-05-20T16:00:00-04:00',
  }
}

function buildSprintItem(item = {}, { closeCard = false } = {}) {
  return {
    ...cloneSprintItem(item),
    cardId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: PLAN_PATH,
    definitionOfDone: 'Harlan auth escalation v1 records auth_needed as blocked-auth, prepares Steve-only dry-run Harlan-on-Telegram notification, dedups duplicate issues, waits for DONE, silently re-verifies, resumes only after proof, fails closed on timeout, cites old-system sources, and proves no credential mutation or external send.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: 'BRAIN-FLEET-FOUNDATION-001 closed the no-auth Brain Fleet contract; live probes stay blocked until this auth loop, quota ledger, and capability registry ship.',
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      ...(item.metadata || {}),
      approvalRef: APPROVAL_PATH,
      closeoutKey: CLOSEOUT_KEY,
      oldSystemSourceRefs: OLD_SYSTEM_SOURCE_REFS,
    },
  }
}

function buildNextSprintItem(item = {}) {
  return {
    ...cloneSprintItem(item),
    cardId: NEXT_CARD_ID,
    stage: 'scoping',
    readinessBlockerCleared: `${CARD_ID} closed under ${CLOSEOUT_KEY}; continue quota ledger before live provider probes.`,
    metadata: {
      ...(item.metadata || {}),
      previousCloseoutKey: CLOSEOUT_KEY,
    },
  }
}

function buildBacklogUpdate({ closeCard = false } = {}) {
  return {
    lane: closeCard ? 'done' : 'executing',
    nextAction: closeCard
      ? `Done under ${CLOSEOUT_KEY}. Continue ${NEXT_CARD_ID}; no live provider probes or extractor proof until quota ledger and capability registry also ship.`
      : 'Build Harlan auth_needed -> blocked-auth -> Steve-only notification -> DONE/reverify/resume/fail-closed loop as dry-run proof only.',
    statusNote: closeCard
      ? `Closed 2026-05-20 under ${CLOSEOUT_KEY}; proof: npm run process:harlan-auth-escalation-loop-check -- --close-card --json, foundation:verify, and process:foundation-ship. Old-system auth escalation sources are cited; dogfood covers 2FA/auth-needed, dedup/no spam, timeout/fail-closed, DONE/retry/resume, and no credential mutation. See ${CLOSEOUT_PATH}.`
      : `Executing ${CLOSEOUT_KEY}; dry-run contract/proof only, no external sends, browser auth, credential mutation, provider probe, or live extraction.`,
  }
}

async function upsertPlanCriticRun(planReview) {
  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,$6,'P0',$7,true,$8::text[],$9::jsonb,$10::jsonb,$11)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            gate_level = EXCLUDED.gate_level,
            full_verify_required = EXCLUDED.full_verify_required,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result,
            created_at = NOW()
      `,
      [
        `harlan-auth-escalation-loop-${stableRunId(PLAN_PATH)}`,
        CARD_ID,
        PLAN_PATH,
        planReview.status,
        Number(planReview.score),
        PLAN_CRITIC_MIN_PASS_SCORE,
        planReview.gateDecision?.level || 'full',
        CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({
          status: planReview.status,
          score: planReview.score,
          cardId: CARD_ID,
          closeoutKey: CLOSEOUT_KEY,
          summary: buildPlanCriticResultSummary(planReview),
        }),
        ACTOR,
      ],
    )
  } finally {
    client.release()
    await pool.end()
  }
}

async function ensureLiveState({ closeCard = false, planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'update HARLAN-AUTH-ESCALATION-LOOP-001 backlog row, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  if (!previous?.sprint?.sprintId) throw new Error('No active Current Sprint found for Harlan auth escalation update.')

  await upsertPlanCriticRun(planReview)
  await updateBacklogItem(CARD_ID, buildBacklogUpdate({ closeCard }), ACTOR)

  const previousItems = previous.items || []
  const nextItems = previousItems.map(item => {
    const cardId = item.cardId || item.backlogId
    if (cardId === CARD_ID) return buildSprintItem(item, { closeCard })
    if (closeCard && cardId === NEXT_CARD_ID) return buildNextSprintItem(item)
    return cloneSprintItem(item)
  })

  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SPRINT_ID,
        status: 'active',
        goal: previous.sprint.goal || 'Build Foundation control-plane and Brain Fleet readiness before extractor runtime work.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          ...(previous.sprint.metadata || {}),
          activeQueue: [
            CARD_ID,
            NEXT_CARD_ID,
            'BRAIN-FLEET-MODEL-CAPABILITY-REGISTRY-001',
            'CODEX-DIRECT-SUBSCRIPTION-ROUTE-001',
            'GEMINI-VIDEO-BRAIN-ROUTE-001',
            'CLAUDE-CODE-REVIEW-BRAIN-ROUTE-001',
            'OPENCLAW-ADAPTER-BOUNDARY-001',
            'EXTRACTOR-BRAIN-FLEET-PROOF-001',
            'YOUTUBE-BUILD-INTEL-RUNTIME-PROOF-001',
          ],
          currentStatus: closeCard ? `continue ${NEXT_CARD_ID}` : `building ${CARD_ID}`,
          closeoutKey: closeCard ? CLOSEOUT_KEY : previous.sprint.metadata?.closeoutKey,
          notNext: NOT_NEXT,
        },
      },
      items: nextItems.length ? nextItems : [buildSprintItem({}, { closeCard })],
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint.sprintId,
      reason: closeCard
        ? `Close ${CARD_ID} and advance to ${NEXT_CARD_ID}.`
        : `Mark ${CARD_ID} building now.`,
    },
  )
}

function oldSystemHarvestChecks(sources = {}) {
  const authEscalate = sources[OLD_SYSTEM_SOURCE_REFS[0]] || ''
  const browserAuth = sources[OLD_SYSTEM_SOURCE_REFS[1]] || ''
  const myicorAuth = sources[OLD_SYSTEM_SOURCE_REFS[2]] || ''
  const webExtractor = sources[OLD_SYSTEM_SOURCE_REFS[3]] || ''
  const replyContext = sources[OLD_SYSTEM_SOURCE_REFS[4]] || ''
  const protocol = sources[OLD_SYSTEM_SOURCE_REFS[5]] || ''
  return [
    {
      ok: authEscalate.includes('AUTH ESCALATION') &&
        authEscalate.includes('Reply DONE when complete') &&
        authEscalate.includes('Dedup') &&
        authEscalate.includes('Telegram') &&
        authEscalate.includes('Email'),
      check: 'old auth-escalate source has dual-channel DONE and dedup behavior',
      detail: OLD_SYSTEM_SOURCE_REFS[0],
    },
    {
      ok: browserAuth.includes('--wait-2fa') &&
        browserAuth.includes('2FA') &&
        browserAuth.includes('notify'),
      check: 'old browser-auth source has service config and 2FA wait posture',
      detail: OLD_SYSTEM_SOURCE_REFS[1],
    },
    {
      ok: myicorAuth.includes('needs_manual') &&
        myicorAuth.includes('2FA required'),
      check: 'old myicor-auth source emits manual 2FA signal',
      detail: OLD_SYSTEM_SOURCE_REFS[2],
    },
    {
      ok: webExtractor.includes('wait2FAResolution') &&
        webExtractor.includes('2fa_waiting') &&
        webExtractor.includes('timed out after 10 minutes') &&
        webExtractor.includes('reply: continue'),
      check: 'old web-extractor source has wait/resume/timeout shape',
      detail: OLD_SYSTEM_SOURCE_REFS[3],
    },
    {
      ok: replyContext.includes('registerReplyContext') &&
        replyContext.includes('context_key') &&
        replyContext.includes('expires_at'),
      check: 'old reply-context source has reply routing context',
      detail: OLD_SYSTEM_SOURCE_REFS[4],
    },
    {
      ok: protocol.includes('blocked-auth') &&
        protocol.includes('Reply DONE') &&
        protocol.includes('Send ONE escalation per issue') &&
        protocol.includes('Re-verify silently'),
      check: 'old auth escalation protocol has blocked-auth, no-spam, and reverify rules',
      detail: OLD_SYSTEM_SOURCE_REFS[5],
    },
  ]
}

async function main() {
  const args = parseArgs()
  const checks = []
  const planSource = await readRepoFile(PLAN_PATH)
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: {
      id: CARD_ID,
      title: 'Harvest old-system auth escalation loop for Harlan and extractors',
      priority: 'P0',
      lane: args.closeCard ? 'done' : 'executing',
      nextAction: buildBacklogUpdate({ closeCard: args.closeCard }).nextAction,
      statusNote: buildBacklogUpdate({ closeCard: args.closeCard }).statusNote,
    },
    changedFiles: CHANGED_FILES,
    declaredRisk: 'Foundation-owned Harlan auth escalation loop before paid/private provider or extractor work',
    repoRoot,
  })

  if (args.apply || args.closeCard) await ensureLiveState({ closeCard: args.closeCard, planReview })

  const oldSourcePairs = await Promise.all(OLD_SYSTEM_SOURCE_REFS.map(async ref => [ref, await readFileAbsolute(ref)]))
  const oldSources = Object.fromEntries(oldSourcePairs)
  const [
    approval,
    packageJson,
    moduleSource,
    scriptSource,
    runtimeVerifierSource,
    coverageSource,
    closeoutRecordsSource,
    docSource,
    harlanDoc,
    closeoutDoc,
    currentPlan,
    currentState,
    cards,
    sprint,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile('package.json').then(JSON.parse),
    readRepoFile('lib/harlan-auth-escalation-loop.js'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/foundation-runtime-reliability-verifier.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-agent-runtime-records.js'),
    readRepoFile(DOC_PATH),
    readRepoFile('docs/agents/harlan.md'),
    readRepoFile(CLOSEOUT_PATH, { optional: true }),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID]),
    getActiveFoundationCurrentSprint(),
  ])
  const sprintCardIds = Array.from(new Set([CARD_ID, ...(sprint.items || []).map(item => item.cardId).filter(Boolean)]))
  const planCriticRuns = await getPlanCriticRunsByCardIds(sprintCardIds)
  await closeFoundationDb()

  const card = cards.find(item => item.id === CARD_ID) || null
  const nextCard = cards.find(item => item.id === NEXT_CARD_ID) || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === CARD_ID) || null
  const closeouts = getFoundationBuildCloseouts()
  const closeout = closeouts.find(record => record.key === CLOSEOUT_KEY) || null
  const currentSprintStatus = buildFoundationCurrentSprintStatus({ sprint: sprint.sprint, items: sprint.items, backlogItems: cards, closeouts, planCriticRuns })
  const scaffold = validateBuildLaneCardScaffold(card || {})
  const sprintMetadata = validateBuildLaneSprintItemMetadata(sprintItem || {})
  const loopStatus = evaluateHarlanAuthEscalationLoop(buildHarlanAuthEscalationLoop())
  const dogfood = buildHarlanAuthEscalationLoopDogfoodProof()
  const oldChecks = oldSystemHarvestChecks(oldSources)
  const sourceCombined = `${moduleSource}\n${scriptSource}`
  const historicalCloseoutMode = card?.lane === 'done' && sprint.sprint?.sprintId !== SPRINT_ID
  const expectedActiveBlockerCardId = args.closeCard || card?.lane === 'done' ? NEXT_CARD_ID : CARD_ID
  const forbiddenSendTokens = [
    ['sendTelegramMessage', '('].join(''),
    ['gmail.googleapis', 'com'].join('.'),
    ['execSync', '('].join(''),
    ['fetch', '('].join(''),
    ['messages', 'send'].join('/'),
  ]

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(failure => failure.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', buildPlanCriticResultSummary(planReview))
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, card?.priority === 'P0' && (args.closeCard ? card?.lane === 'done' : ['scoped', 'executing', 'done'].includes(card?.lane)), 'live Harlan auth card exists and is staged', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, scaffold.ok, 'live backlog card passes scaffold guard', scaffold.missing.join(', ') || 'complete')
  addCheck(
    checks,
    historicalCloseoutMode || sprint.sprint?.sprintId === SPRINT_ID,
    'Harlan auth proof accepts active sprint mode or closed-card historical mode',
    historicalCloseoutMode ? `historical closeout mode; active sprint=${sprint.sprint?.sprintId || 'missing'}` : sprint.sprint?.sprintId || 'missing',
  )
  addCheck(
    checks,
    historicalCloseoutMode || sprint.sprint?.activeBlockerCardId === expectedActiveBlockerCardId,
    'Current Sprint active blocker is reconciled when this card is active',
    historicalCloseoutMode ? `closed card; current active blocker=${sprint.sprint?.activeBlockerCardId || 'missing'}` : sprint.sprint?.activeBlockerCardId || 'missing',
  )
  addCheck(
    checks,
    historicalCloseoutMode || sprintMetadata.ok,
    'Current Sprint item metadata is complete when this card is active',
    historicalCloseoutMode ? 'closed card; metadata checked through closeout and registry proof' : sprintMetadata.missing.join(', ') || 'complete',
  )
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint status is healthy', currentSprintStatus.findings?.map(item => item.detail || item.check).join('; ') || 'healthy')
  addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'next quota ledger card remains live', nextCard ? `${nextCard.lane}/${nextCard.priority}` : 'missing')
  for (const check of oldChecks) addCheck(checks, check.ok, check.check, check.detail)
  addCheck(checks, loopStatus.ok && loopStatus.summary.sourceRefCount === OLD_SYSTEM_SOURCE_REFS.length, 'healthy Harlan auth escalation contract passes', `${loopStatus.status}/${loopStatus.summary.sourceRefCount} old sources`)
  addCheck(checks, dogfood.ok, 'dogfood simulates auth-needed, dedup, timeout, DONE/resume, and no credential mutation', dogfood.invariant)
  addCheck(checks, dogfood.authNeededBlocked && dogfood.dedupNoSpam && dogfood.timeoutFailClosed && dogfood.doneRetryResume, 'dogfood covers required runtime branches', JSON.stringify({ authNeeded: dogfood.authNeededBlocked, dedup: dogfood.dedupNoSpam, timeout: dogfood.timeoutFailClosed, done: dogfood.doneRetryResume }))
  addCheck(checks, dogfood.noCredentialMutation && dogfood.unsafeExternalSendRejected, 'dogfood blocks credential mutation and live external sends', JSON.stringify({ noCredentialMutation: dogfood.noCredentialMutation, unsafeExternalSendRejected: dogfood.unsafeExternalSendRejected }))
  addCheck(checks, dogfood.missingOldSourceRejected && dogfood.missingDoneTokenRejected && dogfood.noReverifyRejected, 'dogfood rejects weak protocol shapes', JSON.stringify({ sources: dogfood.missingOldSourceRejected, done: dogfood.missingDoneTokenRejected, reverify: dogfood.noReverifyRejected }))
  addCheck(checks, packageJson.scripts?.['process:harlan-auth-escalation-loop-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:harlan-auth-escalation-loop-check'] || 'missing')
  addCheck(checks, !forbiddenSendTokens.some(token => sourceCombined.includes(token)), 'focused proof has no live notification/send implementation', forbiddenSendTokens.filter(token => sourceCombined.includes(token)).join(', ') || 'dry-run only')
  addCheck(checks, moduleSource.includes('externalSent: false') && moduleSource.includes('credentialMutationAllowed: false'), 'module encodes no external-send and no credential-mutation posture', 'lib/harlan-auth-escalation-loop.js')
  addCheck(checks, docSource.includes('auth_needed') && docSource.includes('blocked-auth') && docSource.includes('DONE') && docSource.includes('dry-run'), 'Harlan auth doc captures event and proof boundary', DOC_PATH)
  addCheck(checks, harlanDoc.includes('Harlan Auth Escalation Loop'), 'Harlan doctrine links auth escalation loop', 'docs/agents/harlan.md')
  addCheck(checks, runtimeVerifierSource.includes(CARD_ID) && runtimeVerifierSource.includes('buildHarlanAuthEscalationLoopDogfoodProof'), 'runtime reliability verifier covers Harlan auth loop', 'lib/foundation-runtime-reliability-verifier.js')
  addCheck(checks, coverageSource.includes('HARLAN_AUTH_ESCALATION_LOOP_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE') && coverageSource.includes(CARD_ID), 'verifier coverage IDs include Harlan auth loop', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'closeout registry record is registered', closeout?.key || 'missing')
  addCheck(checks, closeoutRecordsSource.includes(CLOSEOUT_KEY) && closeoutRecordsSource.includes(CARD_ID), 'closeout registry source contains card and key', CLOSEOUT_KEY)
  addCheck(checks, await repoFileExists(CLOSEOUT_PATH), 'closeout handoff exists', CLOSEOUT_PATH)
  addCheck(checks, closeoutDoc.includes('No live external messages') && closeoutDoc.includes('no credential mutation'), 'closeout documents no-send and credential boundary', CLOSEOUT_PATH)
  addCheck(checks, currentPlan.includes(CLOSEOUT_KEY) && currentPlan.includes(NEXT_CARD_ID), 'current plan mentions closeout and next card', CLOSEOUT_KEY)
  addCheck(checks, currentState.includes(CLOSEOUT_KEY) && currentState.includes(NEXT_CARD_ID), 'current state mentions closeout and next card', CLOSEOUT_KEY)
  addCheck(checks, moduleSource.split('\n').length < 1500, 'new module is under preferred module budget', `${moduleSource.split('\n').length} lines`)
  addCheck(checks, scriptSource.split('\n').length < 1500, 'focused proof script is under preferred module budget', `${scriptSource.split('\n').length} lines`)

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'fail' : 'pass',
    cardId: CARD_ID,
    sprintId: sprint.sprint?.sprintId || null,
    closeoutKey: CLOSEOUT_KEY,
    nextCardId: NEXT_CARD_ID,
    checkCount: checks.length,
    failedCount: failed.length,
    loopStatus: loopStatus.status,
    dogfoodOk: dogfood.ok,
    checks,
    failed,
  }

  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`${CARD_ID} check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  }

  if (failed.length) process.exitCode = 1
}

main().catch(async error => {
  try {
    await closeFoundationDb()
  } catch {}
  console.error(error?.stack || error?.message || String(error))
  process.exitCode = 1
})
