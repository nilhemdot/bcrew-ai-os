#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  CODEX_DIRECT_SUBSCRIPTION_ROUTE_APPROVAL_PATH as APPROVAL_PATH,
  CODEX_DIRECT_SUBSCRIPTION_ROUTE_CARD_ID as CARD_ID,
  CODEX_DIRECT_SUBSCRIPTION_ROUTE_CLOSEOUT_KEY as CLOSEOUT_KEY,
  CODEX_DIRECT_SUBSCRIPTION_ROUTE_CLOSEOUT_PATH as CLOSEOUT_PATH,
  CODEX_DIRECT_SUBSCRIPTION_ROUTE_NEXT_CARD_ID as NEXT_CARD_ID,
  CODEX_DIRECT_SUBSCRIPTION_ROUTE_NOT_NEXT as NOT_NEXT,
  CODEX_DIRECT_SUBSCRIPTION_ROUTE_PLAN_PATH as PLAN_PATH,
  CODEX_DIRECT_SUBSCRIPTION_ROUTE_SCRIPT_PATH as SCRIPT_PATH,
  CODEX_DIRECT_SUBSCRIPTION_ROUTE_SPRINT_ID as SPRINT_ID,
  CODEX_DIRECT_SUBSCRIPTION_CREDENTIAL_KEY,
  CODEX_DIRECT_SUBSCRIPTION_PRIMARY_MODEL,
  CODEX_DIRECT_SUBSCRIPTION_ROUTE_KEY,
  buildCodexDirectRouteProbeInput,
  buildCodexDirectRuntimeMetadata,
  buildCodexDirectSubscriptionCredential,
  buildCodexDirectSubscriptionRoute,
  buildSyntheticCodexDirectSubscriptionRouteProof,
  evaluateCodexDirectSubscriptionRoute,
  runCodexDirectSubscriptionRouteProof,
} from '../lib/codex-direct-subscription-route.js'
import {
  closeFoundationDb,
  createLlmCall,
  finishLlmCall,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getLlmRuntimeSnapshot,
  getPlanCriticRunsByCardIds,
  initFoundationDb,
  recordLlmRouteProbe,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
  upsertLlmCredential,
  upsertLlmRoute,
} from '../lib/foundation-db.js'
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
const ACTOR = 'codex-direct-subscription-route-proof'

const CHANGED_FILES = [
  'lib/codex-direct-subscription-route.js',
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
  'node --check lib/codex-direct-subscription-route.js lib/llm-router.js scripts/process-codex-direct-subscription-route-check.mjs',
  'npm run process:codex-direct-subscription-route-check -- --close-card --json',
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
    runId: `codex-direct-subscription-route-${stableRunId(PLAN_PATH)}`,
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
      'lib/foundation-llm-runtime-store.js',
    ],
    existingDocs: [
      'docs/handoffs/2026-05-20-orchestrator-builder-run-checkpoint.md',
      'docs/handoffs/2026-05-20-harlan-auth-escalation-loop-closeout.md',
      'docs/_archive/handoffs/2026-05-26-hot-doc-refresh/2026-05-20-brain-fleet-quota-ledger-closeout.md',
      'docs/_archive/handoffs/2026-05-26-hot-doc-refresh/2026-05-20-brain-fleet-model-capability-registry-closeout.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
    ],
    existingScripts: [
      'scripts/process-harlan-auth-escalation-loop-check.mjs',
      'scripts/process-brain-fleet-quota-ledger-check.mjs',
      'scripts/process-brain-fleet-model-capability-registry-check.mjs',
      'process:foundation-ship',
    ],
    existingPolicy: [
      'Brain Fleet is not a hidden subscription/account workaround farm.',
      'Direct Codex subscription route is local-tooling only unless future policy explicitly promotes it.',
      'Every Brain Fleet provider attempt must write ledger truth before execution.',
      'Auth-needed goes through Harlan and fails closed.',
      'No external writes or credential mutation from route probes.',
    ],
    reused: [
      'Codex CLI ChatGPT auth status and model catalog',
      'Brain Fleet quota ledger',
      'Harlan auth-needed dry-run escalation',
      'LLM runtime credential/route/probe store',
      'model capability registry metadata shape',
    ],
    notRebuilt: [
      'No second LLM router',
      'No custom Codex API wrapper',
      'No OpenClaw dependency for direct Codex',
      'No extractor runtime',
      'No credential manager',
    ],
    exactGap: 'AIOS has OpenClaw Codex-adjacent routes but no native direct local Codex CLI route with model/Fast/quota/auth/ledger proof.',
    overBroadRisk: 'This card can drift into a generic backend API or extraction route; v1 stays a bounded local tooling probe with experimental policy.',
    readyBy: 'Steve May 20 rolling Foundation Builder queue',
    readyAt: '2026-05-20T16:00:00-04:00',
  }
}

function buildSprintItem(item = {}, { closeCard = false, currentHead = '' } = {}) {
  return {
    ...cloneSprintItem(item),
    cardId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: PLAN_PATH,
    definitionOfDone: 'Direct Codex subscription route v1 adds a bounded local Codex CLI route separate from OpenClaw, records model availability, GPT-5.5/Fast and GPT-5.4-mini fallback truth, quota/status posture, auth posture, route-probe evidence, Harlan auth-needed behavior, and a Brain Fleet ledger entry with no external writes or credential mutation.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: 'BRAIN-FLEET-MODEL-CAPABILITY-REGISTRY-001 closed route capability truth; direct Codex may run one bounded ledgered local CLI probe.',
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      directCodexRouteKey: CODEX_DIRECT_SUBSCRIPTION_ROUTE_KEY,
      directCodexCredentialKey: CODEX_DIRECT_SUBSCRIPTION_CREDENTIAL_KEY,
      primaryModel: CODEX_DIRECT_SUBSCRIPTION_PRIMARY_MODEL,
      localToolingOnly: true,
      noGenericBackendApi: true,
      noExternalWrites: true,
      noCredentialMutation: true,
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
    planRef: cloned.planRef || 'docs/process/gemini-video-brain-route-001-plan.md',
    definitionOfDone: cloned.definitionOfDone || 'A bounded Gemini video/long-context route proof records auth method, quota tier, video/long-context capability, artifact contract, fallback, and Brain Fleet ledger truth.',
    proofCommands: cloned.proofCommands?.length ? cloned.proofCommands : [
      'npm run process:system-health-nightly-audit-check -- --json',
      'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    readinessBlockerCleared: `${CARD_ID} closed under ${CLOSEOUT_KEY}; continue bounded Gemini video/long-context route proof with ledger and Harlan auth-needed flow.`,
    notNextBoundaries: [
      ...(cloned.notNextBoundaries || []),
      'Do not run broad extraction or paid/private source crawls from the Gemini route card.',
      'If auth is needed, use the Harlan auth-needed flow and fail closed.',
      'Every Gemini probe attempt must write Brain Fleet quota ledger truth.',
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
  const currentItem = buildSprintItem(byId.get(CARD_ID) || { cardId: CARD_ID, order: 7 }, { closeCard, currentHead })
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
      ? `Done under ${CLOSEOUT_KEY}. Continue ${NEXT_CARD_ID}; keep direct Codex local-tooling-only and do not start extractor proof yet.`
      : 'Build and run one bounded direct Codex subscription route proof with Brain Fleet ledger, Harlan auth-needed flow, model/Fast/quota/auth truth, no external writes, and no credential mutation.',
    statusNote: closeCard
      ? `Closed 2026-05-20 under ${CLOSEOUT_KEY}; direct Codex route ${CODEX_DIRECT_SUBSCRIPTION_ROUTE_KEY} is separate from OpenClaw, model/Fast/fallback truth and route-probe evidence are recorded, and the bounded Codex CLI probe wrote Brain Fleet ledger truth. The route remains experimental/local-tooling-only, not a generic backend API. See ${CLOSEOUT_PATH}.`
      : `Executing ${CLOSEOUT_KEY}; one bounded local Codex CLI probe only, ledgered before execution, no external writes, no credential mutation, no extractor runtime.`,
  }
}

async function upsertCodexRuntimeRows(proof, { preflight = false } = {}) {
  const metadata = preflight ? {} : buildCodexDirectRuntimeMetadata(proof)
  const quotaState = {
    status: 'unknown',
    resetAt: null,
    source: 'codex_doctor_does_not_expose_quota_or_reset',
  }
  const status = preflight ? 'unknown' : proof.ok ? 'available' : proof.stopCondition === 'auth_needed' ? 'blocked' : 'unknown'
  const routeStatus = preflight ? 'probe_required' : proof.ok ? 'available' : 'blocked'
  const riskClass = preflight ? 'untested' : proof.ok ? 'low' : 'blocked'
  const credential = await upsertLlmCredential(buildCodexDirectSubscriptionCredential({
    status,
    policyClassification: 'experimental',
    quotaState,
    metadata,
  }), ACTOR)
  const route = await upsertLlmRoute(buildCodexDirectSubscriptionRoute({
    status: routeStatus,
    policyClassification: 'experimental',
    riskClass,
    metadata,
  }), ACTOR)
  const probe = preflight ? null : await recordLlmRouteProbe(buildCodexDirectRouteProbeInput(proof), ACTOR)
  return { credential, route, probe }
}

async function ensureLiveState({ closeCard = false, planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'update direct Codex route backlog card, Plan Critic row, and Current Sprint overlay',
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
          currentStatus: closeCard ? 'codex_direct_subscription_route_closed_gemini_next' : 'codex_direct_subscription_route_building',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `${NEXT_CARD_ID}: add/probe bounded Gemini video/long-context route with ledger and Harlan auth-needed flow.`
            : `${CARD_ID}: run bounded direct Codex CLI route proof with ledger and no external writes.`,
          activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
          buildLaneCount: 1,
          strategyPeopleParked: true,
          directCodexRouteKey: CODEX_DIRECT_SUBSCRIPTION_ROUTE_KEY,
          noGenericBackendApi: true,
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
      reason: 'Steve ordered direct Codex route before Gemini, Claude, OpenClaw adapter boundary, or extractor proof.',
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
    readRepoFile('lib/codex-direct-subscription-route.js'),
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
    declaredRisk: 'Full ship gate because direct Codex route proof touches LLM route truth, live llm_calls/llm_route_probes rows, Current Sprint truth, closeout registry, and verifier coverage while running one bounded provider call.',
  })
  const syntheticProof = await buildSyntheticCodexDirectSubscriptionRouteProof()
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null

  addCheck(checks, approvalValidation.ok && Number(approvalValidation.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan approval validates at threshold', approvalValidation.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for direct Codex route', buildPlanCriticResultSummary(planReview))

  const earlyFailures = checks.filter(check => !check.ok)
  if (!earlyFailures.length && (args.apply || args.closeCard)) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: SCRIPT_PATH,
      operation: 'upsert direct Codex route metadata, run bounded ledgered route proof, and record route probe evidence',
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
    })
    runtimeWrites = await upsertCodexRuntimeRows({}, { preflight: true })
    if (args.closeCard) {
      liveProof = await runCodexDirectSubscriptionRouteProof({
        liveProbe: true,
        writeLedger: true,
        createCall: createLlmCall,
        finishCall: finishLlmCall,
        actor: ACTOR,
        runId: stableRunId(`${CARD_ID}-${Date.now()}`),
      })
      runtimeWrites = await upsertCodexRuntimeRows(liveProof)
    }
  }

  const evaluation = evaluateCodexDirectSubscriptionRoute({
    moduleSource,
    scriptSource,
    planSource,
    packageJson,
    llmRouterSource,
    closeout,
    syntheticProof,
    liveProof: args.closeCard ? liveProof : null,
  })
  addCheck(checks, evaluation.ok, 'direct Codex route evaluator passes', evaluation.failed.map(item => item.check).join(', ') || 'all checks passed')
  addCheck(checks, closeout && (closeout.backlogIds || []).includes(CARD_ID), 'closeout registry links direct Codex route card', closeout ? closeout.key : 'missing closeout')
  addCheck(checks, packageJson.scripts?.['process:codex-direct-subscription-route-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package script points to focused direct Codex proof', packageJson.scripts?.['process:codex-direct-subscription-route-check'] || 'missing')
  if (args.closeCard) {
    addCheck(checks, liveProof?.ok === true, 'close-card ran successful bounded live Codex proof', liveProof?.failureReason || liveProof?.status || 'missing live proof')
    addCheck(checks, liveProof?.finishedLedger?.ledgerRecord?.status === 'succeeded', 'close-card wrote successful Brain Fleet ledger row', liveProof?.finishedLedger?.ledgerRecord?.status || 'missing ledger')
    addCheck(checks, runtimeWrites?.probe?.status === 'passed', 'close-card recorded direct Codex route-probe evidence', runtimeWrites?.probe?.status || 'missing probe')
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
  const expectedActive = args.closeCard ? NEXT_CARD_ID : CARD_ID
  const directCredential = llmRuntime.credentials.find(item => item.credentialKey === CODEX_DIRECT_SUBSCRIPTION_CREDENTIAL_KEY) || null
  const directRoute = llmRuntime.routes.find(item => item.routeKey === CODEX_DIRECT_SUBSCRIPTION_ROUTE_KEY) || null
  const directProbe = llmRuntime.recentProbes.find(item => item.credentialKey === CODEX_DIRECT_SUBSCRIPTION_CREDENTIAL_KEY && item.probeType === 'bounded_local_cli_probe') || null

  addCheck(checks, activeSprint.sprint?.sprintId === SPRINT_ID && activeSprint.sprint?.activeBlockerCardId === expectedActive, 'Current Sprint active blocker matches direct Codex route state', `${activeSprint.sprint?.sprintId || 'missing'}:${activeSprint.sprint?.activeBlockerCardId || 'missing'}`)
  addCheck(checks, currentCard && currentCard.lane === (args.closeCard ? 'done' : (args.apply ? 'executing' : currentCard.lane)), 'direct Codex backlog lane matches check posture', currentCard ? `${currentCard.id}:${currentCard.lane}` : 'missing')
  addCheck(checks, currentItem && currentItem.stage === (args.closeCard ? 'done_this_sprint' : (args.apply ? 'building_now' : currentItem.stage)), 'direct Codex sprint item stage matches check posture', currentItem ? `${currentItem.cardId}:${currentItem.stage}` : 'missing')
  addCheck(checks, !args.closeCard || (nextCard && nextItem && activeSprint.sprint?.activeBlockerCardId === NEXT_CARD_ID), 'close-card advances Gemini route as next blocker', nextItem ? `${nextItem.cardId}:${nextItem.stage}` : 'missing next item')
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE) || (!args.apply && !args.closeCard && planReview.status === 'pass'), 'durable or in-memory Plan Critic pass exists', planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || `in-memory ${planReview.status}/${planReview.score}`)
  addCheck(checks, await repoFileExists(CLOSEOUT_PATH), 'closeout handoff exists', CLOSEOUT_PATH)
  if (args.closeCard || args.apply) {
    addCheck(checks, directCredential && directCredential.provider === 'codex' && directCredential.authPath === 'codex_subscription', 'live direct Codex credential row exists', directCredential ? `${directCredential.credentialKey}:${directCredential.status}` : 'missing')
    addCheck(checks, directRoute && directRoute.provider === 'codex' && directRoute.authPath === 'codex_subscription', 'live direct Codex route row exists', directRoute ? `${directRoute.routeKey}:${directRoute.status}` : 'missing')
  }
  if (args.closeCard) {
    addCheck(checks, directCredential?.status === 'available', 'direct Codex credential is available after successful proof', directCredential?.status || 'missing')
    addCheck(checks, directRoute?.status === 'available', 'direct Codex route is available after successful proof', directRoute?.status || 'missing')
    addCheck(checks, directRoute?.policyClassification === 'experimental', 'direct Codex route remains experimental/local-tooling-only', directRoute?.policyClassification || 'missing')
    addCheck(checks, directProbe?.status === 'passed', 'latest direct Codex route probe passed', directProbe ? `${directProbe.probeId}:${directProbe.status}` : 'missing')
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
      modelAvailability: liveProof.cliStatus?.modelAvailability,
      doctor: liveProof.cliStatus?.doctor,
      execution: liveProof.execution,
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
      directCredential: directCredential ? `${directCredential.credentialKey}:${directCredential.status}` : null,
      directRoute: directRoute ? `${directRoute.routeKey}:${directRoute.status}` : null,
    },
    checks,
    findings: failures,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Direct Codex subscription route check: ${result.status}`)
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
