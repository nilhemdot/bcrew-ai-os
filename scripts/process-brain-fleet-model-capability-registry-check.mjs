#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_APPROVAL_PATH as APPROVAL_PATH,
  BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_CARD_ID as CARD_ID,
  BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_CLOSEOUT_KEY as CLOSEOUT_KEY,
  BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_CLOSEOUT_PATH as CLOSEOUT_PATH,
  BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_NEXT_CARD_ID as NEXT_CARD_ID,
  BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_NOT_NEXT as NOT_NEXT,
  BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_PLAN_PATH as PLAN_PATH,
  BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_SCRIPT_PATH as SCRIPT_PATH,
  BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_SPRINT_ID as SPRINT_ID,
  assertBrainFleetCapabilitySourcesUnchanged,
  buildBrainFleetModelCapabilityRegistry,
  buildSyntheticBrainFleetModelCapabilityRegistryProof,
  evaluateBrainFleetModelCapabilityRegistry,
} from '../lib/brain-fleet-model-capability-registry.js'
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
import { getLlmRuntimeSnapshot } from '../lib/foundation-runtime-jobs-db.js'
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
const ACTOR = 'codex-brain-fleet-model-capability-registry'

const CHANGED_FILES = [
  'lib/brain-fleet-model-capability-registry.js',
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
  'node --check lib/brain-fleet-model-capability-registry.js scripts/process-brain-fleet-model-capability-registry-check.mjs',
  'npm run process:brain-fleet-model-capability-registry-check -- --close-card --json',
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
    runId: `brain-fleet-model-capability-registry-${stableRunId(PLAN_PATH)}`,
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
      'lib/brain-fleet-foundation.js',
      'lib/brain-fleet-quota-ledger.js',
      'lib/foundation-llm-runtime-store.js',
      'lib/llm-router.js',
      'lib/llm-credential-registry.js',
      'lib/llm-hub-capacity.js',
    ],
    existingDocs: [
      'docs/handoffs/2026-05-20-orchestrator-builder-run-checkpoint.md',
      'docs/_archive/handoffs/2026-05-26-hot-doc-refresh/2026-05-20-brain-fleet-foundation-closeout.md',
      'docs/handoffs/2026-05-20-harlan-auth-escalation-loop-closeout.md',
      'docs/_archive/handoffs/2026-05-26-hot-doc-refresh/2026-05-20-brain-fleet-quota-ledger-closeout.md',
      'docs/rebuild/current-runtime-map.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
    ],
    existingScripts: [
      'scripts/process-brain-fleet-foundation-check.mjs',
      'scripts/process-harlan-auth-escalation-loop-check.mjs',
      'scripts/process-brain-fleet-quota-ledger-check.mjs',
      'process:foundation-ship',
    ],
    existingPolicy: [
      'No live provider probes before Harlan auth escalation, quota ledger, and capability registry ship.',
      'Brain Fleet must reuse the existing LLM router and credential registry.',
      'Every Brain Fleet call must write ledger truth before live provider work.',
      'Unknown model, auth, quota, speed, and support truth must be explicit instead of guessed.',
    ],
    reused: [
      'Brain Fleet no-auth route contract',
      'Brain Fleet quota ledger stop/ledger boundary',
      'existing llm_credentials/llm_routes/llm_route_probes runtime truth',
      'Foundation process write guards',
    ],
    notRebuilt: [
      'No second LLM router',
      'No second credential registry',
      'No route probe runner',
      'No provider adapter implementation',
      'No live extractor runtime',
    ],
    exactGap: 'Brain Fleet has route and ledger contracts, but each route still needs explicit model/speed/reasoning/video/vision/long-context/quota/auth/limitation truth before live provider probes.',
    overBroadRisk: 'This card can drift into provider probes or adapter work; v1 stays read-only capability truth and hands off bounded probes to the next route cards.',
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
    definitionOfDone: 'Brain Fleet model capability registry v1 records route capability truth for provider, model, speed mode, reasoning posture, video/vision/long-context support, quota posture, auth posture, known limitations, and allowed workloads from existing LLM runtime truth; no live provider probes or credential/provider-config mutation occur.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: 'BRAIN-FLEET-FOUNDATION-001, HARLAN-AUTH-ESCALATION-LOOP-001, and BRAIN-FLEET-QUOTA-LEDGER-001 are closed; live provider probes remain blocked until this registry ships.',
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      capabilityRegistryReadOnly: true,
      noLiveProviderProbes: true,
      noCredentialMutation: true,
      blockersBlockActionsNotSprint: true,
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
    planRef: cloned.planRef || 'docs/process/codex-direct-subscription-route-001-plan.md',
    definitionOfDone: cloned.definitionOfDone || 'A bounded direct Codex subscription route proof records account label, model availability, speed/Fast availability, quota/status, auth posture, and a Brain Fleet ledger entry with no external writes.',
    proofCommands: cloned.proofCommands?.length ? cloned.proofCommands : [
      'npm run process:system-health-nightly-audit-check -- --json',
      'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    readinessBlockerCleared: `${CARD_ID} closed under ${CLOSEOUT_KEY}; bounded direct Codex route proof may proceed only through Harlan auth-needed flow and Brain Fleet quota ledger.`,
    notNextBoundaries: [
      ...(cloned.notNextBoundaries || []),
      'Do not run broad extraction, external writes, provider account workarounds, Strategy, or People work from the direct Codex route card.',
      'If auth is needed, use the Harlan auth-needed flow and fail closed.',
      'Every probe attempt must write Brain Fleet quota ledger truth.',
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
  const currentItem = buildSprintItem(byId.get(CARD_ID) || { cardId: CARD_ID, order: 6 }, { closeCard, currentHead })
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
      ? `Done under ${CLOSEOUT_KEY}. Continue ${NEXT_CARD_ID}; no broad extraction or external writes.`
      : 'Build Brain Fleet model capability registry v1 over existing llm_credentials, llm_routes, and llm_route_probes; no live provider probes or credential mutation.',
    statusNote: closeCard
      ? `Closed 2026-05-20 under ${CLOSEOUT_KEY}; proof records read-only route capability truth for provider, model, speed, reasoning, video/vision/long-context support, quota, auth, limitations, and allowed workloads. See ${CLOSEOUT_PATH}.`
      : `Executing ${CLOSEOUT_KEY}; read-only capability metadata proof only, no provider probes, no external writes, no credential or route mutation.`,
  }
}

async function ensureLiveState({ closeCard = false, planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'update Brain Fleet model capability registry backlog card, Plan Critic row, and Current Sprint overlay',
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
          currentStatus: closeCard ? 'brain_fleet_model_capability_registry_closed_codex_direct_next' : 'brain_fleet_model_capability_registry_building',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `${NEXT_CARD_ID}: add/probe bounded direct Codex subscription route with ledger and Harlan auth-needed flow.`
            : `${CARD_ID}: record route capability truth before live provider probes.`,
          activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
          buildLaneCount: 1,
          strategyPeopleParked: true,
          noLiveProviderProbes: !closeCard,
          capabilityRegistryReadOnly: true,
        },
      },
      items: buildSprintItems(previous, { closeCard, currentHead }),
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || SPRINT_ID,
      reason: 'Steve ordered model capability registry before direct Codex, Gemini, Claude, OpenClaw, or extractor route probes.',
    },
  )
}

async function buildLiveCapabilityProof() {
  const llmRuntime = await getLlmRuntimeSnapshot({ limit: 50 })
  const registry = buildBrainFleetModelCapabilityRegistry({ llmRuntime })
  const providerModels = registry.capabilities.map(capability => ({
    routeKey: capability.routeKey,
    provider: capability.provider,
    model: capability.model,
    speedMode: capability.speedMode,
    reasoningPosture: capability.reasoningPosture,
    support: capability.support,
    quotaPosture: capability.quota.posture,
    authPosture: capability.authPosture,
  }))
  return {
    llmRuntime,
    registry,
    providerModels,
  }
}

async function main() {
  const args = parseArgs()
  const checks = []

  await initFoundationDb()
  const [
    packageJson,
    moduleSource,
    scriptSource,
    planSource,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/brain-fleet-model-capability-registry.js'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile(PLAN_PATH),
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
    declaredRisk: 'Full ship gate because Brain Fleet model capability registry touches runtime route interpretation, live sprint truth, closeout registry, and verifier coverage while provider execution remains blocked.',
  })
  const liveProof = await buildLiveCapabilityProof()
  const syntheticProof = await buildSyntheticBrainFleetModelCapabilityRegistryProof()
  const evaluation = evaluateBrainFleetModelCapabilityRegistry({
    moduleSource,
    scriptSource,
    planSource,
    packageJson,
    llmRuntime: liveProof.llmRuntime,
    registry: liveProof.registry,
    syntheticProof,
  })
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null

  addCheck(checks, approvalValidation.ok && Number(approvalValidation.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan approval validates at threshold', approvalValidation.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for Brain Fleet model capability registry', buildPlanCriticResultSummary(planReview))
  addCheck(checks, evaluation.ok, 'Brain Fleet model capability registry evaluator passes', evaluation.failed.map(item => item.check).join(', ') || 'all checks passed')
  addCheck(checks, closeout && (closeout.backlogIds || []).includes(CARD_ID), 'closeout registry links model capability registry card', closeout ? closeout.key : 'missing closeout')
  addCheck(checks, packageJson.scripts?.['process:brain-fleet-model-capability-registry-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package script points to focused model capability proof', packageJson.scripts?.['process:brain-fleet-model-capability-registry-check'] || 'missing')
  addCheck(checks, liveProof.registry.summary?.capabilityCount > 0, 'live capability registry records route capabilities', JSON.stringify(liveProof.registry.summary || {}))
  addCheck(checks, liveProof.registry.providerExecutionAllowed === false && liveProof.registry.liveProviderProbesAllowed === false, 'live capability proof does not allow provider execution/probes', `execute=${liveProof.registry.providerExecutionAllowed} probes=${liveProof.registry.liveProviderProbesAllowed}`)

  const writeFailures = checks.filter(check => !check.ok)
  let sourceMutationProof = null
  if (!writeFailures.length && (args.apply || args.closeCard)) {
    const beforeRuntime = await getLlmRuntimeSnapshot({ limit: 50 })
    await ensureLiveState({ closeCard: args.closeCard, planReview })
    const afterRuntime = await getLlmRuntimeSnapshot({ limit: 50 })
    sourceMutationProof = {
      noSourceMutation: assertBrainFleetCapabilitySourcesUnchanged(beforeRuntime, afterRuntime),
      beforeRouteCount: beforeRuntime.routes.length,
      afterRouteCount: afterRuntime.routes.length,
      beforeCredentialCount: beforeRuntime.credentials.length,
      afterCredentialCount: afterRuntime.credentials.length,
    }
    addCheck(checks, sourceMutationProof.noSourceMutation === true, 'close-card proof does not mutate LLM runtime source truth', JSON.stringify(sourceMutationProof))
  }

  const [activeSprint, cards, planCriticRuns] = await Promise.all([
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID]),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])
  const currentCard = cards.find(card => card.id === CARD_ID) || null
  const nextCard = cards.find(card => card.id === NEXT_CARD_ID) || null
  const currentItem = (activeSprint.items || []).find(item => item.cardId === CARD_ID) || null
  const nextItem = (activeSprint.items || []).find(item => item.cardId === NEXT_CARD_ID) || null
  const expectedActive = args.closeCard ? NEXT_CARD_ID : CARD_ID

  addCheck(checks, activeSprint.sprint?.sprintId === SPRINT_ID && activeSprint.sprint?.activeBlockerCardId === expectedActive, 'Current Sprint active blocker matches model capability registry state', `${activeSprint.sprint?.sprintId || 'missing'}:${activeSprint.sprint?.activeBlockerCardId || 'missing'}`)
  addCheck(checks, currentCard && currentCard.lane === (args.closeCard ? 'done' : (args.apply ? 'executing' : currentCard.lane)), 'model capability backlog lane matches check posture', currentCard ? `${currentCard.id}:${currentCard.lane}` : 'missing')
  addCheck(checks, currentItem && currentItem.stage === (args.closeCard ? 'done_this_sprint' : (args.apply ? 'building_now' : currentItem.stage)), 'model capability sprint item stage matches check posture', currentItem ? `${currentItem.cardId}:${currentItem.stage}` : 'missing')
  addCheck(checks, !args.closeCard || (nextCard && nextItem && activeSprint.sprint?.activeBlockerCardId === NEXT_CARD_ID), 'close-card advances direct Codex route as next blocker', nextItem ? `${nextItem.cardId}:${nextItem.stage}` : 'missing next item')
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE) || (!args.apply && !args.closeCard && planReview.status === 'pass'), 'durable or in-memory Plan Critic pass exists', planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || `in-memory ${planReview.status}/${planReview.score}`)
  addCheck(checks, await repoFileExists(CLOSEOUT_PATH), 'closeout handoff exists', CLOSEOUT_PATH)

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    nextCardId: NEXT_CARD_ID,
    closeCard: args.closeCard,
    liveCapabilityProof: {
      summary: liveProof.registry.summary,
      providerModels: liveProof.providerModels,
      status: liveProof.registry.status,
    },
    sourceMutationProof,
    syntheticProof,
    planReview: {
      status: planReview.status,
      score: planReview.score,
      summary: buildPlanCriticResultSummary(planReview),
    },
    llmRuntimeSummary: {
      credentialCount: liveProof.llmRuntime.credentials?.length || 0,
      routeCount: liveProof.llmRuntime.routes?.length || 0,
      recentProbeCount: liveProof.llmRuntime.recentProbes?.length || 0,
    },
    checks,
    findings: failures,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Brain Fleet model capability registry check: ${result.status}`)
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
