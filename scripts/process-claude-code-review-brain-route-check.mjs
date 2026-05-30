#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  CLAUDE_CODE_REVIEW_BRAIN_ROUTE_APPROVAL_PATH as APPROVAL_PATH,
  CLAUDE_CODE_REVIEW_BRAIN_ROUTE_CARD_ID as CARD_ID,
  CLAUDE_CODE_REVIEW_BRAIN_ROUTE_CLOSEOUT_KEY as CLOSEOUT_KEY,
  CLAUDE_CODE_REVIEW_BRAIN_ROUTE_CLOSEOUT_PATH as CLOSEOUT_PATH,
  CLAUDE_CODE_REVIEW_BRAIN_ROUTE_NEXT_CARD_ID as NEXT_CARD_ID,
  CLAUDE_CODE_REVIEW_BRAIN_ROUTE_NOT_NEXT as NOT_NEXT,
  CLAUDE_CODE_REVIEW_BRAIN_ROUTE_PLAN_PATH as PLAN_PATH,
  CLAUDE_CODE_REVIEW_BRAIN_ROUTE_SCRIPT_PATH as SCRIPT_PATH,
  CLAUDE_CODE_REVIEW_BRAIN_ROUTE_SPRINT_ID as SPRINT_ID,
  CLAUDE_CODE_REVIEW_CREDENTIAL_KEY,
  CLAUDE_CODE_REVIEW_MODEL,
  CLAUDE_CODE_REVIEW_PROBE_TYPE,
  CLAUDE_CODE_REVIEW_ROUTE_KEY,
  buildClaudeCodeReviewCredential,
  buildClaudeCodeReviewRoute,
  buildClaudeCodeReviewRouteProbeInput,
  buildClaudeCodeReviewRuntimeMetadata,
  buildSyntheticClaudeCodeReviewBrainRouteProof,
  evaluateClaudeCodeReviewBrainRoute,
  runClaudeCodeReviewBrainRouteProof,
} from '../lib/claude-code-review-brain-route.js'
import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  createLlmCall,
  finishLlmCall,
  getLlmRuntimeSnapshot,
  recordLlmRouteProbe,
  upsertLlmCredential,
  upsertLlmRoute,
} from '../lib/foundation-runtime-jobs-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
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
const ACTOR = 'claude-code-review-brain-route-proof'

const CHANGED_FILES = [
  'lib/claude-code-review-brain-route.js',
  'lib/llm-router.js',
  SCRIPT_PATH,
  PLAN_PATH,
  APPROVAL_PATH,
  CLOSEOUT_PATH,
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'lib/foundation-build-closeout-model-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'scripts/foundation-verify.mjs',
  'package.json',
]

const PROOF_COMMANDS = [
  'node --check lib/claude-code-review-brain-route.js lib/llm-router.js scripts/process-claude-code-review-brain-route-check.mjs',
  'npm run process:claude-code-review-brain-route-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:foundation-ship -- --card=${CARD_ID} --planApprovalRef=${APPROVAL_PATH} --closeoutKey=${CLOSEOUT_KEY} --commitRef=HEAD`,
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

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

async function repoFileExists(relativePath) {
  try {
    return (await fs.stat(path.join(repoRoot, relativePath))).isFile()
  } catch {
    return false
  }
}

async function git(args = []) {
  const { spawnSync } = await import('node:child_process')
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  })
  if (result.status !== 0) throw new Error(result.stderr || `git ${args.join(' ')} failed`)
  return String(result.stdout || '').trim()
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `claude-code-review-brain-route-${stableRunId(PLAN_PATH)}`,
    result: {
      status: planReview.status,
      score: planReview.score,
      cardId: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
      summary: buildPlanCriticResultSummary(planReview),
    },
  }
}

async function upsertPlanCriticRun(planReview) {
  const pool = createPool()
  const client = await pool.connect()
  try {
    const run = buildPlanCriticRun(planReview)
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
        run.runId,
        CARD_ID,
        PLAN_PATH,
        planReview.status,
        Number(planReview.score),
        PLAN_CRITIC_MIN_PASS_SCORE,
        planReview.gateDecision?.level || 'full',
        CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify(run.result),
        ACTOR,
      ],
    )
  } finally {
    client.release()
    await pool.end()
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

function repoPosture(currentHead = '') {
  return {
    integrationBranch: 'main',
    expectedBaseCommit: currentHead,
    commitPushRequiredAfterCard: true,
    mainMustEqualOriginMainAtCloseout: true,
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/llm-router.js',
      'lib/brain-fleet-quota-ledger.js',
      'lib/brain-fleet-model-capability-registry.js',
      'lib/harlan-auth-escalation-loop.js',
      'scripts/audit-llm-auth-paths.mjs',
    ],
    existingDocs: [
      'docs/_archive/handoffs/2026-05-20-orchestrator-builder-run-checkpoint.md',
      'docs/_archive/handoffs/2026-05-20-harlan-auth-escalation-loop-closeout.md',
      'docs/_archive/handoffs/2026-05-26-hot-doc-refresh/2026-05-20-brain-fleet-quota-ledger-closeout.md',
      'docs/_archive/handoffs/2026-05-26-hot-doc-refresh/2026-05-20-brain-fleet-model-capability-registry-closeout.md',
      'docs/_archive/handoffs/2026-05-20-gemini-video-brain-route-closeout.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
    ],
    existingScripts: [
      'scripts/process-harlan-auth-escalation-loop-check.mjs',
      'scripts/process-brain-fleet-quota-ledger-check.mjs',
      'scripts/process-brain-fleet-model-capability-registry-check.mjs',
      'scripts/process-gemini-video-brain-route-check.mjs',
      'process:foundation-ship',
    ],
    existingPolicy: [
      'Every Brain Fleet provider attempt must write ledger truth before execution.',
      'Auth-needed goes through Harlan and fails closed.',
      'Claude Code stays experimental/local-tooling-only unless a later policy card promotes it.',
      'Extractor v1 is not blocked on Claude Code or Agent SDK ambiguity.',
    ],
    reused: [
      'Claude Code local CLI and existing auth-audit route labels',
      'Brain Fleet quota ledger',
      'Harlan auth-needed dry-run escalation',
      'LLM runtime credential/route/probe store',
      'model capability registry metadata shape',
    ],
    notRebuilt: [
      'No second LLM router',
      'No credential manager',
      'No broad extractor runtime',
      'No Claude cloud review or background agents',
      'No Agent SDK application runtime',
    ],
    exactGap: 'AIOS has Claude Code candidate route labels and earlier fail-closed router proof, but no bounded ledgered local Claude Code / Agent SDK route proof with model/auth/quota/SDK posture and no-credential-mutation evidence.',
    overBroadRisk: 'This card can drift into cloud code review, background agents, Agent SDK app runtime, or extractor work; v1 stops at route readiness and classification.',
    readyBy: 'Steve May 20 rolling Foundation Builder queue',
    readyAt: '2026-05-20T17:00:00-04:00',
  }
}

function buildSprintItem(item = {}, { closeCard = false, currentHead = '' } = {}) {
  return {
    ...cloneSprintItem(item),
    cardId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: PLAN_PATH,
    definitionOfDone: 'A bounded Claude Code / Agent SDK local route proof records auth source, policy posture, selected model, SDK posture, allowed workloads, Brain Fleet ledger entry, route-probe evidence, Harlan auth-needed behavior, and stop conditions while keeping the route experimental and not blocking extractor v1 on ambiguity.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: 'GEMINI-VIDEO-BRAIN-ROUTE-001 closed Gemini video/long-context route proof; Claude may run one bounded ledgered local CLI route probe.',
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      claudeRouteKey: CLAUDE_CODE_REVIEW_ROUTE_KEY,
      claudeCredentialKey: CLAUDE_CODE_REVIEW_CREDENTIAL_KEY,
      policyPosture: 'experimental',
      extractorV1Blocked: false,
      noBroadExtraction: true,
      noCredentialMutation: true,
      noExternalWrites: true,
      repoPosture: repoPosture(currentHead),
    },
  }
}

function buildNextSprintItem(item = {}, { currentHead = '' } = {}) {
  const cloned = cloneSprintItem(item)
  return {
    ...cloned,
    cardId: NEXT_CARD_ID,
    stage: 'scoping',
    planRef: cloned.planRef || 'docs/process/openclaw-adapter-boundary-001-plan.md',
    definitionOfDone: cloned.definitionOfDone || 'OpenClaw is demoted to an adapter boundary: useful where proven, not the Foundation architecture owner, with limits and fallback recorded.',
    proofCommands: cloned.proofCommands?.length ? cloned.proofCommands : [
      'npm run process:system-health-nightly-audit-check -- --json',
      'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    readinessBlockerCleared: `${CARD_ID} closed under ${CLOSEOUT_KEY}; continue OpenClaw adapter boundary before extractor proof.`,
    notNextBoundaries: [
      ...(cloned.notNextBoundaries || []),
      'Do not start extractor proof or broad extraction from the OpenClaw boundary card.',
      'Do not let OpenClaw limitations define Foundation architecture.',
      'Do not mutate provider credentials or external systems from adapter-boundary proof.',
    ],
    metadata: {
      ...(cloned.metadata || {}),
      closeoutKey: null,
      previousCloseoutKey: CLOSEOUT_KEY,
      blockersBlockActionsNotSprint: true,
      repoPosture: repoPosture(currentHead),
    },
  }
}

function buildSprintItems(previous = {}, { closeCard = false, currentHead = '' } = {}) {
  const items = (previous.items || []).map(cloneSprintItem)
  const byId = new Map(items.map(item => [item.cardId, item]))
  const currentItem = buildSprintItem(byId.get(CARD_ID) || { cardId: CARD_ID, order: 9 }, { closeCard, currentHead })
  const nextItem = buildNextSprintItem(byId.get(NEXT_CARD_ID) || { cardId: NEXT_CARD_ID, order: currentItem.order + 1 }, { currentHead })
  const nextItems = items.map(item => {
    if (item.cardId === CARD_ID) return currentItem
    if (item.cardId === NEXT_CARD_ID) return nextItem
    return item
  })
  if (!byId.has(CARD_ID)) nextItems.push(currentItem)
  if (!byId.has(NEXT_CARD_ID)) nextItems.push(nextItem)
  return nextItems
    .sort((a, b) => Number(a.order || 999) - Number(b.order || 999))
    .map((item, index) => ({ ...item, order: index + 1 }))
}

function buildBacklogUpdate({ closeCard = false } = {}) {
  return {
    lane: closeCard ? 'done' : 'executing',
    nextAction: closeCard
      ? `Done under ${CLOSEOUT_KEY}. Continue ${NEXT_CARD_ID}; do not start extractor proof until OpenClaw adapter boundary closes.`
      : 'Run one bounded Claude Code local route proof with Brain Fleet ledger, auth source, selected model, SDK posture, Harlan auth-needed flow, no broad extraction, and no credential mutation.',
    statusNote: closeCard
      ? `Closed 2026-05-20 under ${CLOSEOUT_KEY}; Claude route ${CLAUDE_CODE_REVIEW_ROUTE_KEY} recorded local CLI auth, selected model, SDK posture, experimental policy posture, explicit unknown quota reset posture, route-probe evidence, and Brain Fleet ledger truth. It did not run extractor work, cloud review/background agents, mutate credentials, or send external writes. See ${CLOSEOUT_PATH}.`
      : `Executing ${CLOSEOUT_KEY}; one bounded Claude Code local route proof only, ledgered before execution, no extractor work, no external writes, no credential mutation.`,
  }
}

async function upsertClaudeRuntimeRows(proof, { preflight = false } = {}) {
  const metadata = preflight ? {} : buildClaudeCodeReviewRuntimeMetadata(proof)
  const quotaState = proof?.claudeStatus?.quotaState || {
    status: 'unknown',
    tier: 'unknown',
    resetAt: null,
    source: preflight ? 'pre_probe_quota_unknown' : 'claude_code_json_output_no_quota_reset',
  }
  const status = preflight ? 'unknown' : proof.ok ? 'available' : proof.stopCondition === 'auth_needed' ? 'auth_needed' : 'blocked'
  const routeStatus = preflight ? 'probe_required' : proof.ok ? 'available' : 'blocked'
  const riskClass = preflight ? 'untested' : proof.ok ? 'low' : 'blocked'
  const model = preflight ? CLAUDE_CODE_REVIEW_MODEL : proof?.claudeStatus?.selectedModel || CLAUDE_CODE_REVIEW_MODEL
  const credential = await upsertLlmCredential(buildClaudeCodeReviewCredential({
    status,
    quotaState,
    metadata,
  }), ACTOR)
  const route = await upsertLlmRoute(buildClaudeCodeReviewRoute({
    status: routeStatus,
    riskClass,
    model,
    metadata,
  }), ACTOR)
  const probe = preflight ? null : await recordLlmRouteProbe(buildClaudeCodeReviewRouteProbeInput(proof), ACTOR)
  return { credential, route, probe }
}

async function ensureLiveState({ closeCard = false, planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'update Claude route backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const currentHead = await git(['rev-parse', 'HEAD'])
  const previous = await getActiveFoundationCurrentSprint()
  await updateBacklogItem(CARD_ID, buildBacklogUpdate({ closeCard }), ACTOR)
  await upsertPlanCriticRun(planReview)
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: SPRINT_ID,
        status: 'active',
        goal: previous.sprint?.goal || 'Build Brain Fleet and extractor readiness without breaking Foundation health.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentHead,
          currentStatus: closeCard ? 'claude_code_review_brain_route_closed_openclaw_next' : 'claude_code_review_brain_route_building',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `${NEXT_CARD_ID}: demote OpenClaw to adapter status and keep Foundation architecture provider-agnostic.`
            : `${CARD_ID}: run bounded Claude Code review route proof with ledger, Harlan auth-needed flow, SDK posture, and experimental policy classification.`,
          activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
          buildLaneCount: 1,
          strategyPeopleParked: true,
          claudeRouteKey: CLAUDE_CODE_REVIEW_ROUTE_KEY,
          claudeRoutePolicyPosture: 'experimental',
          extractorV1BlockedByClaude: false,
          noBroadExtraction: true,
          noCredentialMutation: true,
          noExternalWrites: true,
        },
      },
      items: buildSprintItems(previous, { closeCard, currentHead }),
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || SPRINT_ID,
      reason: 'Steve ordered Claude Code review route after Gemini and before OpenClaw adapter boundary; Claude ambiguity must not block extractor v1.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  let liveProof = null
  let runtimeWrites = null

  await initFoundationDb()
  const [
    packageJson,
    moduleSource,
    scriptSource,
    planSource,
    llmRouterSource,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/claude-code-review-brain-route.js'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile(PLAN_PATH),
    readRepoFile('lib/llm-router.js'),
  ])

  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: APPROVAL_PATH,
    cardId: CARD_ID,
  })
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: { id: CARD_ID, priority: 'P0' },
    changedFiles: CHANGED_FILES,
    declaredRisk: 'Full ship gate because Claude route proof touches LLM route truth, live llm_calls/llm_route_probes rows, Current Sprint truth, closeout registry, and verifier coverage while running one bounded provider call.',
  })
  const syntheticProof = await buildSyntheticClaudeCodeReviewBrainRouteProof()
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null

  addCheck(checks, approvalValidation.ok && Number(approvalValidation.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan approval validates at threshold', approvalValidation.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for Claude Code review route', buildPlanCriticResultSummary(planReview))

  const earlyFailures = checks.filter(check => !check.ok)
  if (!earlyFailures.length && (args.apply || args.closeCard)) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: SCRIPT_PATH,
      operation: 'upsert Claude route metadata, run bounded ledgered route proof, and record route probe evidence',
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
    })
    runtimeWrites = await upsertClaudeRuntimeRows({}, { preflight: true })
    if (args.closeCard) {
      liveProof = await runClaudeCodeReviewBrainRouteProof({
        liveProbe: true,
        writeLedger: true,
        createCall: createLlmCall,
        finishCall: finishLlmCall,
        actor: ACTOR,
        runId: stableRunId(`${CARD_ID}-${Date.now()}`),
      })
      runtimeWrites = await upsertClaudeRuntimeRows(liveProof)
    }
  }

  const evaluation = evaluateClaudeCodeReviewBrainRoute({
    moduleSource,
    scriptSource,
    planSource,
    packageJson,
    llmRouterSource,
    closeout,
    syntheticProof,
    liveProof: args.closeCard ? liveProof : null,
  })
  addCheck(checks, evaluation.ok, 'Claude Code review route evaluator passes', evaluation.failed.map(item => item.check).join(', ') || 'all checks passed')
  addCheck(checks, closeout && (closeout.backlogIds || []).includes(CARD_ID), 'closeout registry links Claude route card', closeout ? closeout.key : 'missing closeout')
  addCheck(checks, packageJson.scripts?.['process:claude-code-review-brain-route-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package script points to focused Claude proof', packageJson.scripts?.['process:claude-code-review-brain-route-check'] || 'missing')
  if (args.closeCard) {
    addCheck(checks, liveProof?.ok === true, 'close-card ran successful bounded live Claude proof', liveProof?.failureReason || liveProof?.status || 'missing live proof')
    addCheck(checks, liveProof?.finishedLedger?.ledgerRecord?.status === 'succeeded', 'close-card wrote successful Brain Fleet ledger row', liveProof?.finishedLedger?.ledgerRecord?.status || 'missing ledger')
    addCheck(checks, runtimeWrites?.probe?.status === 'passed', 'close-card recorded Claude route-probe evidence', runtimeWrites?.probe?.status || 'missing probe')
  }

  const writeFailures = checks.filter(check => !check.ok)
  if (!writeFailures.length && (args.apply || args.closeCard)) {
    await ensureLiveState({ closeCard: args.closeCard, planReview })
  }

  const [activeSprint, cards, planCriticRuns, llmRuntime] = await Promise.all([
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID]),
    getPlanCriticRunsByCardIds([CARD_ID]),
    getLlmRuntimeSnapshot({ limit: 50 }),
  ])
  const currentCard = cards.find(card => card.id === CARD_ID) || null
  const nextCard = cards.find(card => card.id === NEXT_CARD_ID) || null
  const currentItem = (activeSprint.items || []).find(item => item.cardId === CARD_ID) || null
  const nextItem = (activeSprint.items || []).find(item => item.cardId === NEXT_CARD_ID) || null
  const cardAlreadyClosed = currentCard?.lane === 'done' &&
    currentItem?.stage === 'done_this_sprint' &&
    activeSprint.sprint?.activeBlockerCardId === NEXT_CARD_ID
  const expectedActive = args.closeCard || cardAlreadyClosed ? NEXT_CARD_ID : CARD_ID
  const claudeCredential = llmRuntime.credentials.find(item => item.credentialKey === CLAUDE_CODE_REVIEW_CREDENTIAL_KEY) || null
  const claudeRoute = llmRuntime.routes.find(item => item.routeKey === CLAUDE_CODE_REVIEW_ROUTE_KEY) || null
  const claudeProbe = llmRuntime.recentProbes.find(item => item.credentialKey === CLAUDE_CODE_REVIEW_CREDENTIAL_KEY && item.probeType === CLAUDE_CODE_REVIEW_PROBE_TYPE) || null

  addCheck(checks, activeSprint.sprint?.sprintId === SPRINT_ID && activeSprint.sprint?.activeBlockerCardId === expectedActive, 'Current Sprint active blocker matches Claude route state', `${activeSprint.sprint?.sprintId || 'missing'}:${activeSprint.sprint?.activeBlockerCardId || 'missing'}`)
  addCheck(checks, currentCard && currentCard.lane === (args.closeCard || cardAlreadyClosed ? 'done' : (args.apply ? 'executing' : currentCard.lane)), 'Claude backlog lane matches check posture', currentCard ? `${currentCard.id}:${currentCard.lane}` : 'missing')
  addCheck(checks, currentItem && currentItem.stage === (args.closeCard || cardAlreadyClosed ? 'done_this_sprint' : (args.apply ? 'building_now' : currentItem.stage)), 'Claude sprint item stage matches check posture', currentItem ? `${currentItem.cardId}:${currentItem.stage}` : 'missing')
  addCheck(checks, !args.closeCard || (nextCard && nextItem && activeSprint.sprint?.activeBlockerCardId === NEXT_CARD_ID), 'close-card advances OpenClaw adapter boundary as next blocker', nextItem ? `${nextItem.cardId}:${nextItem.stage}` : 'missing next item')
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE) || (!args.apply && !args.closeCard && planReview.status === 'pass'), 'durable or in-memory Plan Critic pass exists', planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || `in-memory ${planReview.status}/${planReview.score}`)
  addCheck(checks, await repoFileExists(CLOSEOUT_PATH), 'closeout handoff exists', CLOSEOUT_PATH)
  if (args.closeCard || args.apply) {
    addCheck(checks, claudeCredential && claudeCredential.provider === 'claude_code' && claudeCredential.authPath === 'claude_code_subscription', 'live Claude credential row exists', claudeCredential ? `${claudeCredential.credentialKey}:${claudeCredential.status}` : 'missing')
    addCheck(checks, claudeRoute && claudeRoute.provider === 'claude_code' && claudeRoute.authPath === 'claude_code_subscription', 'live Claude route row exists', claudeRoute ? `${claudeRoute.routeKey}:${claudeRoute.status}` : 'missing')
  }
  if (args.closeCard) {
    addCheck(checks, claudeCredential?.status === 'available', 'Claude credential is available after successful proof', claudeCredential?.status || 'missing')
    addCheck(checks, claudeRoute?.status === 'available', 'Claude route is available after successful proof', claudeRoute?.status || 'missing')
    addCheck(checks, claudeRoute?.policyClassification === 'experimental', 'Claude route remains experimental and non-blocking for extractor v1', claudeRoute?.policyClassification || 'missing')
    addCheck(checks, claudeProbe?.status === 'passed', 'latest Claude route probe passed', claudeProbe ? `${claudeProbe.probeId}:${claudeProbe.status}` : 'missing')
  }

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    nextCardId: NEXT_CARD_ID,
    closeCard: args.closeCard,
    liveProof: liveProof ? {
      ok: liveProof.ok,
      status: liveProof.status,
      routeKey: liveProof.routeKey,
      credentialKey: liveProof.credentialKey,
      selectedModel: liveProof.claudeStatus?.selectedModel || null,
      version: liveProof.claudeStatus?.version || null,
      capability: liveProof.claudeStatus?.capability || null,
      sdkPosture: liveProof.claudeStatus?.sdkPosture || null,
      quotaState: liveProof.claudeStatus?.quotaState || null,
      ledgerCallId: liveProof.ledger?.call?.callId || liveProof.finishedLedger?.call?.callId || null,
      ledgerStatus: liveProof.finishedLedger?.ledgerRecord?.status || null,
      stopCondition: liveProof.stopCondition,
      failureReason: liveProof.failureReason,
      harlanAuth: liveProof.harlanAuth ? {
        finalStatus: liveProof.harlanAuth.finalStatus,
        externalSent: liveProof.harlanAuth.notifications?.some(item => item.externalSent === true) || false,
      } : null,
      credentialMutationProof: liveProof.credentialMutationProof,
      externalWrites: liveProof.externalWrites,
      experimental: liveProof.experimental,
    } : null,
    runtimeWrites: runtimeWrites ? {
      credential: runtimeWrites.credential ? {
        credentialKey: runtimeWrites.credential.credentialKey,
        status: runtimeWrites.credential.status,
        policyClassification: runtimeWrites.credential.policyClassification,
      } : null,
      route: runtimeWrites.route ? {
        routeKey: runtimeWrites.route.routeKey,
        status: runtimeWrites.route.status,
        model: runtimeWrites.route.model,
        policyClassification: runtimeWrites.route.policyClassification,
        riskClass: runtimeWrites.route.riskClass,
      } : null,
      probe: runtimeWrites.probe ? {
        probeId: runtimeWrites.probe.probeId,
        status: runtimeWrites.probe.status,
        probeType: runtimeWrites.probe.probeType,
      } : null,
    } : null,
    syntheticProof,
    planReview: {
      status: planReview.status,
      score: planReview.score,
      summary: buildPlanCriticResultSummary(planReview),
    },
    liveRuntimeSummary: {
      credentialCount: llmRuntime.credentials?.length || 0,
      routeCount: llmRuntime.routes?.length || 0,
      recentProbeCount: llmRuntime.recentProbes?.length || 0,
      claudeCredential: claudeCredential ? `${claudeCredential.credentialKey}:${claudeCredential.status}` : null,
      claudeRoute: claudeRoute ? `${claudeRoute.routeKey}:${claudeRoute.status}` : null,
    },
    checks,
    findings: failures,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Claude Code review brain route check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failures.length) process.exitCode = 1
}

main()
  .catch(async error => {
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    await closeFoundationDb().catch(() => {})
    process.exitCode = 1
  })
