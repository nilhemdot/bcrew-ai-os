#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  OPENCLAW_ADAPTER_BOUNDARY_APPROVAL_PATH as APPROVAL_PATH,
  OPENCLAW_ADAPTER_BOUNDARY_CARD_ID as CARD_ID,
  OPENCLAW_ADAPTER_BOUNDARY_CLOSEOUT_KEY as CLOSEOUT_KEY,
  OPENCLAW_ADAPTER_BOUNDARY_CLOSEOUT_PATH as CLOSEOUT_PATH,
  OPENCLAW_ADAPTER_BOUNDARY_NEXT_CARD_ID as NEXT_CARD_ID,
  OPENCLAW_ADAPTER_BOUNDARY_PLAN_PATH as PLAN_PATH,
  OPENCLAW_ADAPTER_BOUNDARY_SCRIPT_PATH as SCRIPT_PATH,
  OPENCLAW_ADAPTER_BOUNDARY_SPRINT_ID as SPRINT_ID,
  OPENCLAW_ADAPTER_NOT_NEXT as NOT_NEXT,
  OPENCLAW_ADAPTER_ROUTE_KEYS,
  OPENCLAW_CREDENTIAL_KEY,
  buildOpenClawAdapterRouteUpdates,
  buildSyntheticOpenClawAdapterBoundaryProof,
  evaluateOpenClawAdapterBoundary,
} from '../lib/openclaw-adapter-boundary.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getLlmRuntimeSnapshot,
  getPlanCriticRunsByCardIds,
  initFoundationDb,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
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
const ACTOR = 'openclaw-adapter-boundary-proof'

const CHANGED_FILES = [
  'lib/openclaw-adapter-boundary.js',
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
  'node --check lib/openclaw-adapter-boundary.js lib/llm-router.js scripts/process-openclaw-adapter-boundary-check.mjs',
  'npm run process:openclaw-adapter-boundary-check -- --close-card --json',
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

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value).sort().reduce((acc, key) => {
    if (value[key] !== undefined) acc[key] = stableValue(value[key])
    return acc
  }, {})
}

function stableString(value) {
  return JSON.stringify(stableValue(value || null))
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
    runId: `openclaw-adapter-boundary-${stableRunId(PLAN_PATH)}`,
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
        VALUES ($1,$2,$3,$4,$5,10,$6,'P1',$7,true,$8::text[],$9::jsonb,$10::jsonb,$11)
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
      'lib/brain-fleet-model-capability-registry.js',
      'lib/foundation-llm-runtime-store.js',
      'Foundation Current Sprint overlay',
    ],
    existingDocs: [
      'docs/handoffs/2026-05-20-orchestrator-brain-fleet-extractor-checkpoint.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
    ],
    existingScripts: [
      'scripts/process-brain-fleet-foundation-check.mjs',
      'scripts/process-brain-fleet-quota-ledger-check.mjs',
      'scripts/process-brain-fleet-model-capability-registry-check.mjs',
      'scripts/process-codex-direct-subscription-route-check.mjs',
      'scripts/process-gemini-video-brain-route-check.mjs',
      'scripts/process-claude-code-review-brain-route-check.mjs',
      'process:foundation-ship',
    ],
    existingPolicy: [
      'Foundation OS owns source truth, permissions, backlog, jobs, ledgers, and provenance.',
      'Brain Fleet owns provider/model/speed/routing/capacity decisions.',
      'OpenClaw remains a provider adapter only; its limits do not define Foundation architecture.',
    ],
    reused: 'Existing LLM router, LLM runtime DB rows, Brain Fleet capability registry, and Current Sprint gates.',
    notRebuilt: [
      'No new router',
      'No credential manager',
      'No OpenClaw gateway changes',
      'No extractor runtime',
    ],
    exactGap: 'OpenClaw routes existed as useful subscription gateway candidates, but were not explicitly labeled adapter-only with non-OpenClaw fallback truth and hard-dependency guardrails.',
    overBroadRisk: 'This card can drift into OpenClaw provider probing, gateway/runtime repair, or extractor work; v1 stops at adapter metadata and proof.',
    readyBy: 'Steve May 20 rolling Foundation Builder queue',
    readyAt: '2026-05-20T18:05:00-04:00',
  }
}

function buildSprintItem(item = {}, { closeCard = false, currentHead = '' } = {}) {
  return {
    ...cloneSprintItem(item),
    cardId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: PLAN_PATH,
    definitionOfDone: 'OpenClaw is demoted to adapter-only status with route metadata, fallback truth, hard-dependency dogfood, no provider calls, no credential mutation, and Current Sprint advancement to extractor proof only after raw-green gates pass.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: 'CLAUDE-CODE-REVIEW-BRAIN-ROUTE-001 closed; OpenClaw adapter boundary can label OpenClaw without probing providers.',
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      openclawAdapterOnly: true,
      coreDependencyAllowed: false,
      providerProbeRun: false,
      credentialMutation: false,
      noExternalWrites: true,
      nextCardId: NEXT_CARD_ID,
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
    planRef: cloned.planRef || 'docs/process/extractor-brain-fleet-proof-001-plan.md',
    definitionOfDone: cloned.definitionOfDone || 'First governed extractor proof runs through Brain Fleet with approved source item, artifact/provenance preservation, atom/training-note creation, review route, duplicate/staleness guard, and explicit stop conditions.',
    proofCommands: cloned.proofCommands?.length ? cloned.proofCommands : [
      'npm run process:system-health-nightly-audit-check -- --json',
      'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    readinessBlockerCleared: `${CARD_ID} closed under ${CLOSEOUT_KEY}; continue only with approved source items and Brain Fleet ledger/provenance proof.`,
    notNextBoundaries: [
      ...(cloned.notNextBoundaries || []),
      'Do not run broad Skool, MyICOR, Loom, YouTube, or private-source crawls from extractor proof.',
      'Do not mutate credentials, browser profiles, source systems, Drive permissions, public exposure settings, or external systems.',
      'Do not run extraction without approved exact source item, artifact/provenance preservation, Brain Fleet ledger truth, and stop conditions.',
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
  const currentItem = buildSprintItem(byId.get(CARD_ID) || { cardId: CARD_ID, order: 10 }, { closeCard, currentHead })
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
      ? `Done under ${CLOSEOUT_KEY}. Continue ${NEXT_CARD_ID}; do not run broad extraction or source work without exact source approval and Brain Fleet ledger/provenance proof.`
      : 'Label OpenClaw routes adapter-only, prove non-OpenClaw fallback truth and hard-dependency dogfood, and do not run provider calls or mutate credentials.',
    statusNote: closeCard
      ? `Closed 2026-05-20 under ${CLOSEOUT_KEY}; OpenClaw remains useful as an adapter but is not the Foundation architecture owner. OpenClaw core routes are labeled adapter-only, require non-OpenClaw fallback truth, and no provider call, credential mutation, external write, or extractor work was run. See ${CLOSEOUT_PATH}.`
      : `Executing ${CLOSEOUT_KEY}; metadata/dogfood boundary only, no OpenClaw provider probe, no credential mutation, no external writes, no extractor proof.`,
  }
}

function credentialComparable(credential = {}) {
  if (!credential) return null
  return {
    credentialKey: credential.credentialKey,
    provider: credential.provider,
    authPath: credential.authPath,
    status: credential.status,
    policyClassification: credential.policyClassification,
    allowedWorkloads: credential.allowedWorkloads || [],
    quotaState: credential.quotaState || {},
    notes: credential.notes || '',
    metadata: credential.metadata || {},
  }
}

async function upsertOpenClawRouteMetadata(snapshot = {}) {
  const beforeCredential = (snapshot.credentials || []).find(item => item.credentialKey === OPENCLAW_CREDENTIAL_KEY) || null
  const routeUpdates = buildOpenClawAdapterRouteUpdates(snapshot.routes || [])
  const writtenRoutes = []
  for (const route of routeUpdates) {
    writtenRoutes.push(await upsertLlmRoute(route, ACTOR))
  }
  const afterSnapshot = await getLlmRuntimeSnapshot({ limit: 50 })
  const afterCredential = (afterSnapshot.credentials || []).find(item => item.credentialKey === OPENCLAW_CREDENTIAL_KEY) || null
  return {
    routeUpdates,
    writtenRoutes,
    afterSnapshot,
    credentialMutationProof: {
      unchanged: stableString(credentialComparable(beforeCredential)) === stableString(credentialComparable(afterCredential)),
      before: credentialComparable(beforeCredential),
      after: credentialComparable(afterCredential),
    },
  }
}

async function ensureLiveState({ closeCard = false, planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'update OpenClaw adapter-boundary backlog card, Plan Critic row, and Current Sprint overlay',
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
          currentStatus: closeCard ? 'openclaw_adapter_boundary_closed_extractor_proof_next' : 'openclaw_adapter_boundary_building',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `${NEXT_CARD_ID}: run first governed extractor proof only with approved source item, Brain Fleet ledger, artifact/provenance preservation, and stop controls.`
            : `${CARD_ID}: demote OpenClaw to adapter-only status with route metadata, fallback truth, and no provider call.`,
          activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
          buildLaneCount: 1,
          strategyPeopleParked: true,
          openclawAdapterOnly: true,
          openclawCoreDependencyAllowed: false,
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
      reason: 'Steve ordered OpenClaw adapter boundary before extractor proof; OpenClaw must remain an adapter, not Foundation architecture.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  let runtimeWrites = null

  await initFoundationDb()
  const [
    packageJson,
    moduleSource,
    scriptSource,
    planSource,
    llmRouterSource,
    capabilityRegistrySource,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/openclaw-adapter-boundary.js'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile(PLAN_PATH),
    readRepoFile('lib/llm-router.js'),
    readRepoFile('lib/brain-fleet-model-capability-registry.js'),
  ])

  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: APPROVAL_PATH,
    cardId: CARD_ID,
  })
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: { id: CARD_ID, priority: 'P1' },
    changedFiles: CHANGED_FILES,
    declaredRisk: 'Full ship gate because this card mutates LLM route metadata, Current Sprint truth, closeout registry, verifier coverage, and active plan/state truth while guarding provider architecture.',
  })
  const syntheticProof = buildSyntheticOpenClawAdapterBoundaryProof()
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  let llmRuntime = await getLlmRuntimeSnapshot({ limit: 50 })

  addCheck(checks, approvalValidation.ok && Number(approvalValidation.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan approval validates at threshold', approvalValidation.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for OpenClaw adapter boundary', buildPlanCriticResultSummary(planReview))
  addCheck(checks, syntheticProof.ok === true, 'synthetic dogfood rejects OpenClaw hard-dependency failures', syntheticProof.ok ? syntheticProof.mode : JSON.stringify(syntheticProof))

  const earlyFailures = checks.filter(check => !check.ok)
  if (!earlyFailures.length && (args.apply || args.closeCard)) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: SCRIPT_PATH,
      operation: 'upsert OpenClaw adapter-only route metadata without provider calls or credential mutation',
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
    })
    runtimeWrites = await upsertOpenClawRouteMetadata(llmRuntime)
    llmRuntime = runtimeWrites.afterSnapshot
  }

  const evaluation = evaluateOpenClawAdapterBoundary({
    routes: llmRuntime.routes || [],
    credentials: llmRuntime.credentials || [],
    moduleSource,
    routerSource: llmRouterSource,
    capabilityRegistrySource,
    planSource,
    scriptSource,
    packageJson,
    closeout,
    syntheticProof,
  })
  addCheck(checks, evaluation.ok, 'OpenClaw adapter-boundary evaluator passes', evaluation.failed.map(item => item.check).join(', ') || 'all checks passed')
  if (args.apply || args.closeCard) {
    addCheck(checks, runtimeWrites?.writtenRoutes?.length === OPENCLAW_ADAPTER_ROUTE_KEYS.length, 'OpenClaw route metadata was written for every adapter route', `${runtimeWrites?.writtenRoutes?.length || 0}/${OPENCLAW_ADAPTER_ROUTE_KEYS.length}`)
    addCheck(checks, runtimeWrites?.credentialMutationProof?.unchanged === true, 'OpenClaw credential row was not mutated', runtimeWrites?.credentialMutationProof?.unchanged ? 'unchanged' : 'changed')
  }

  const writeFailures = checks.filter(check => !check.ok)
  if (!writeFailures.length && (args.apply || args.closeCard)) {
    await ensureLiveState({ closeCard: args.closeCard, planReview })
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
  const cardAlreadyClosed = currentCard?.lane === 'done' &&
    currentItem?.stage === 'done_this_sprint' &&
    activeSprint.sprint?.activeBlockerCardId === NEXT_CARD_ID
  const expectedActive = args.closeCard || cardAlreadyClosed ? NEXT_CARD_ID : CARD_ID

  addCheck(checks, activeSprint.sprint?.sprintId === SPRINT_ID && activeSprint.sprint?.activeBlockerCardId === expectedActive, 'Current Sprint active blocker matches OpenClaw adapter state', `${activeSprint.sprint?.sprintId || 'missing'}:${activeSprint.sprint?.activeBlockerCardId || 'missing'}`)
  addCheck(checks, currentCard && currentCard.lane === (args.closeCard || cardAlreadyClosed ? 'done' : (args.apply ? 'executing' : currentCard.lane)), 'OpenClaw backlog lane matches check posture', currentCard ? `${currentCard.id}:${currentCard.lane}` : 'missing')
  addCheck(checks, currentItem && currentItem.stage === (args.closeCard || cardAlreadyClosed ? 'done_this_sprint' : (args.apply ? 'building_now' : currentItem.stage)), 'OpenClaw sprint item stage matches check posture', currentItem ? `${currentItem.cardId}:${currentItem.stage}` : 'missing')
  addCheck(checks, !args.closeCard || (nextCard && nextItem && activeSprint.sprint?.activeBlockerCardId === NEXT_CARD_ID), 'close-card advances extractor Brain Fleet proof as next blocker', nextItem ? `${nextItem.cardId}:${nextItem.stage}` : 'missing next item')
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
    runtimeWrites: runtimeWrites ? {
      writtenRoutes: runtimeWrites.writtenRoutes.map(route => ({
        routeKey: route.routeKey,
        status: route.status,
        policyClassification: route.policyClassification,
        fallbackRouteKey: route.fallbackRouteKey,
        adapterOnly: route.metadata?.openclawAdapterBoundary?.adapterOnly === true,
      })),
      credentialMutationProof: {
        unchanged: runtimeWrites.credentialMutationProof.unchanged,
        credentialKey: OPENCLAW_CREDENTIAL_KEY,
      },
    } : null,
    syntheticProof,
    evaluation: {
      routeKeys: evaluation.routeKeys,
      failed: evaluation.failed,
    },
    planReview: {
      status: planReview.status,
      score: planReview.score,
      summary: buildPlanCriticResultSummary(planReview),
    },
    liveRuntimeSummary: {
      credentialCount: llmRuntime.credentials?.length || 0,
      routeCount: llmRuntime.routes?.length || 0,
      openclawRoutes: (llmRuntime.routes || [])
        .filter(route => route.provider === 'openclaw')
        .map(route => `${route.routeKey}:${route.status}:${route.metadata?.openclawAdapterBoundary?.adapterOnly === true ? 'adapter_only' : 'unlabeled'}`),
    },
    checks,
    findings: failures,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`OpenClaw adapter-boundary check: ${result.status}`)
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
