#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  BRAIN_FLEET_QUOTA_LEDGER_APPROVAL_PATH as APPROVAL_PATH,
  BRAIN_FLEET_QUOTA_LEDGER_CARD_ID as CARD_ID,
  BRAIN_FLEET_QUOTA_LEDGER_CLOSEOUT_KEY as CLOSEOUT_KEY,
  BRAIN_FLEET_QUOTA_LEDGER_CLOSEOUT_PATH as CLOSEOUT_PATH,
  BRAIN_FLEET_QUOTA_LEDGER_NEXT_CARD_ID as NEXT_CARD_ID,
  BRAIN_FLEET_QUOTA_LEDGER_NOT_NEXT as NOT_NEXT,
  BRAIN_FLEET_QUOTA_LEDGER_PLAN_PATH as PLAN_PATH,
  BRAIN_FLEET_QUOTA_LEDGER_SCRIPT_PATH as SCRIPT_PATH,
  BRAIN_FLEET_QUOTA_LEDGER_SPRINT_ID as SPRINT_ID,
  BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS,
  buildSyntheticBrainFleetQuotaLedgerProof,
  evaluateBrainFleetQuotaLedger,
  planAndRecordBrainFleetLedgerCall,
} from '../lib/brain-fleet-quota-ledger.js'
import { planBrainFleetRoute } from '../lib/brain-fleet-foundation.js'
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
const ACTOR = 'codex-brain-fleet-quota-ledger'

const CHANGED_FILES = [
  'lib/brain-fleet-quota-ledger.js',
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
  'node --check lib/brain-fleet-quota-ledger.js scripts/process-brain-fleet-quota-ledger-check.mjs',
  'npm run process:brain-fleet-quota-ledger-check -- --close-card --json',
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
    runId: `brain-fleet-quota-ledger-${stableRunId(PLAN_PATH)}`,
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
      'lib/foundation-llm-runtime-store.js',
      'lib/llm-router.js',
      'lib/llm-credential-registry.js',
      'lib/llm-hub-capacity.js',
    ],
    existingDocs: [
      'docs/handoffs/2026-05-20-orchestrator-builder-run-checkpoint.md',
      'docs/_archive/handoffs/2026-05-26-hot-doc-refresh/2026-05-20-brain-fleet-foundation-closeout.md',
      'docs/handoffs/2026-05-20-harlan-auth-escalation-loop-closeout.md',
      'docs/rebuild/current-runtime-map.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
    ],
    existingScripts: [
      'scripts/process-brain-fleet-foundation-check.mjs',
      'scripts/process-harlan-auth-escalation-loop-check.mjs',
      'process:foundation-ship',
    ],
    existingPolicy: [
      'No live provider probes before Harlan auth escalation, quota ledger, and capability registry ship.',
      'Brain Fleet must reuse the existing LLM router and credential registry.',
      'Every Brain Fleet call must write ledger truth before live provider work.',
      'Quota, auth, rate-limit, and provider failures must stop runs instead of thrashing.',
    ],
    reused: [
      'Brain Fleet no-auth route contract',
      'existing llm_calls runtime table',
      'credential quota_state/account_label truth',
      'Foundation process write guards',
    ],
    notRebuilt: [
      'No second LLM router',
      'No second credential registry',
      'No provider probe runner',
      'No live extractor runtime',
    ],
    exactGap: 'Brain Fleet has route contracts and Harlan auth flow, but no enforced call ledger for workload/route/model/account/quota/artifact/failure/stop truth.',
    overBroadRisk: 'This card can drift into provider probes or quota-account workarounds; v1 stays ledger-only and fail-closed.',
    readyBy: 'Steve May 20 ordered queue',
    readyAt: '2026-05-20T16:00:00-04:00',
  }
}

function buildSprintItem(item = {}, { closeCard = false, currentHead = '' } = {}) {
  return {
    ...cloneSprintItem(item),
    cardId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: PLAN_PATH,
    definitionOfDone: 'Brain Fleet quota ledger v1 records every Brain Fleet call through llm_calls with workload, route, model, account label, status, artifact ref, quota/reset posture, failure reason, and stop condition; auth/rate/quota/provider failures stop the workload instead of retrying blindly; no provider probes or credential mutation occur.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: 'BRAIN-FLEET-FOUNDATION-001 and HARLAN-AUTH-ESCALATION-LOOP-001 are closed; live provider probes remain blocked until this ledger and the model capability registry ship.',
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      ledgerWritesLlmCalls: true,
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
    planRef: cloned.planRef || 'docs/process/brain-fleet-model-capability-registry-001-plan.md',
    definitionOfDone: cloned.definitionOfDone || 'Route capability truth records provider, model, speed mode, reasoning posture, vision/video/long-context support, quota posture, auth posture, limitations, and allowed workloads before live route probes.',
    proofCommands: cloned.proofCommands?.length ? cloned.proofCommands : [
      'npm run process:system-health-nightly-audit-check -- --json',
      'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    readinessBlockerCleared: `${CARD_ID} closed under ${CLOSEOUT_KEY}; continue capability registry before live provider probes.`,
    notNextBoundaries: [
      ...(cloned.notNextBoundaries || []),
      'Do not run live provider probes until capability truth and explicit route card proof are in place.',
      'Do not start extractor runtime proof from the capability registry card.',
      'Do not mutate credentials or provider config from capability metadata proof.',
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
  const currentItem = buildSprintItem(byId.get(CARD_ID) || { cardId: CARD_ID, order: 5 }, { closeCard, currentHead })
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
      ? `Done under ${CLOSEOUT_KEY}. Continue ${NEXT_CARD_ID}; no live provider probes until capability registry also ships.`
      : 'Build Brain Fleet quota ledger v1 over existing llm_calls and route contract; no live provider probes or credential mutation.',
    statusNote: closeCard
      ? `Closed 2026-05-20 under ${CLOSEOUT_KEY}; proof records a skipped internal llm_calls ledger row with workload, route, model, account label, artifact ref, explicit quota/reset posture, failure reason, and stop condition. See ${CLOSEOUT_PATH}.`
      : `Executing ${CLOSEOUT_KEY}; ledger-only proof over llm_calls, no provider probes, no external writes, no credential mutation.`,
  }
}

async function ensureLiveState({ closeCard = false, planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'update Brain Fleet quota ledger backlog card, Plan Critic row, and Current Sprint overlay',
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
          currentStatus: closeCard ? 'brain_fleet_quota_ledger_closed_capability_registry_next' : 'brain_fleet_quota_ledger_building',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `${NEXT_CARD_ID}: record route model/capability truth before live provider probes.`
            : `${CARD_ID}: ship call ledger truth before live provider probes.`,
          activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
          buildLaneCount: 1,
          strategyPeopleParked: true,
          noLiveProviderProbes: true,
        },
      },
      items: buildSprintItems(previous, { closeCard, currentHead }),
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || SPRINT_ID,
      reason: 'Steve ordered Brain Fleet quota ledger before model capability registry, provider probes, or extractor proof.',
    },
  )
}

async function buildLiveLedgerProof({ writeLedger = false } = {}) {
  const request = {
    workload: 'extraction',
    hubKey: 'foundation',
    caller: 'process-brain-fleet-quota-ledger-check',
    inputArtifactRef: 'artifact://synthetic/brain-fleet-quota-ledger/proof-input',
    outputArtifactRef: 'artifact://synthetic/brain-fleet-quota-ledger/proof-output',
  }
  if (!writeLedger) {
    const plan = await planBrainFleetRoute({ request })
    return {
      wroteLedger: false,
      routeKey: plan.routeContract?.routeKey || null,
      provider: plan.routeContract?.provider || null,
      model: plan.routeContract?.model || null,
      accountLabel: plan.routeContract?.accountLabel || null,
      proofBoundary: plan.routeContract?.proofBoundary || null,
      canExecute: plan.routeContract?.readiness?.canExecute === true,
    }
  }

  const recorded = await planAndRecordBrainFleetLedgerCall({
    request,
    status: 'skipped',
    actor: ACTOR,
    metadata: {
      proofCardId: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
      dryRunOnly: true,
    },
  })
  return {
    wroteLedger: true,
    callId: recorded.ledger.call.callId,
    callStatus: recorded.ledger.call.status,
    routeKey: recorded.plan.routeContract?.routeKey || null,
    provider: recorded.plan.routeContract?.provider || null,
    model: recorded.plan.routeContract?.model || null,
    accountLabel: recorded.plan.routeContract?.accountLabel || null,
    canExecute: recorded.plan.routeContract?.readiness?.canExecute === true,
    stopCondition: recorded.ledger.ledgerRecord.stopCondition,
    failureReason: recorded.ledger.ledgerRecord.failureReason,
    ledgerValid: recorded.ledger.validation.ok === true,
    metadataHasLedger: Boolean(recorded.ledger.call.metadata?.brainFleetLedger),
    providerExecutionAllowed: recorded.plan.routeContract?.readiness?.providerExecutionAllowed === true,
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
    readRepoFile('lib/brain-fleet-quota-ledger.js'),
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
    declaredRisk: 'Full ship gate because Brain Fleet quota ledger touches runtime LLM call logging, live sprint truth, closeout registry, and verifier coverage while provider execution remains blocked.',
  })
  const llmRuntime = await getLlmRuntimeSnapshot({ limit: 50 })
  const syntheticProof = await buildSyntheticBrainFleetQuotaLedgerProof()
  const evaluation = evaluateBrainFleetQuotaLedger({
    moduleSource,
    scriptSource,
    planSource,
    packageJson,
    llmRuntime,
    syntheticProof,
  })
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null

  addCheck(checks, approvalValidation.ok && Number(approvalValidation.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan approval validates at threshold', approvalValidation.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for Brain Fleet quota ledger', buildPlanCriticResultSummary(planReview))
  addCheck(checks, evaluation.ok, 'Brain Fleet quota ledger evaluator passes', evaluation.failed.map(item => item.check).join(', ') || 'all checks passed')
  addCheck(checks, closeout && (closeout.backlogIds || []).includes(CARD_ID), 'closeout registry links quota ledger card', closeout ? closeout.key : 'missing closeout')
  addCheck(checks, packageJson.scripts?.['process:brain-fleet-quota-ledger-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package script points to focused quota ledger proof', packageJson.scripts?.['process:brain-fleet-quota-ledger-check'] || 'missing')

  const preliminaryFailures = checks.filter(check => !check.ok)
  let liveLedgerProof = null
  if (!preliminaryFailures.length) {
    liveLedgerProof = await buildLiveLedgerProof({ writeLedger: args.apply || args.closeCard })
    addCheck(checks, Boolean(liveLedgerProof.routeKey), 'live route plan exists for ledger proof', `${liveLedgerProof.routeKey || 'missing'} ${liveLedgerProof.provider || ''}/${liveLedgerProof.model || ''}`)
    addCheck(checks, liveLedgerProof.canExecute === false, 'live Brain Fleet plan remains provider-execution blocked', `canExecute=${liveLedgerProof.canExecute}`)
    if (args.apply || args.closeCard) {
      addCheck(checks, liveLedgerProof.wroteLedger === true && liveLedgerProof.callStatus === 'skipped', 'close-card proof writes skipped llm_calls ledger row', liveLedgerProof.callId || 'missing callId')
      addCheck(checks, liveLedgerProof.ledgerValid === true && liveLedgerProof.metadataHasLedger === true, 'live llm_calls row contains Brain Fleet ledger metadata', liveLedgerProof.stopCondition || 'missing stop condition')
      addCheck(checks, liveLedgerProof.providerExecutionAllowed === false, 'live ledger proof does not enable provider execution', `providerExecutionAllowed=${liveLedgerProof.providerExecutionAllowed}`)
    }
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
  const expectedActive = args.closeCard ? NEXT_CARD_ID : CARD_ID

  addCheck(checks, activeSprint.sprint?.sprintId === SPRINT_ID && activeSprint.sprint?.activeBlockerCardId === expectedActive, 'Current Sprint active blocker matches quota ledger state', `${activeSprint.sprint?.sprintId || 'missing'}:${activeSprint.sprint?.activeBlockerCardId || 'missing'}`)
  addCheck(checks, currentCard && currentCard.lane === (args.closeCard ? 'done' : (args.apply ? 'executing' : currentCard.lane)), 'quota ledger backlog lane matches check posture', currentCard ? `${currentCard.id}:${currentCard.lane}` : 'missing')
  addCheck(checks, currentItem && currentItem.stage === (args.closeCard ? 'done_this_sprint' : (args.apply ? 'building_now' : currentItem.stage)), 'quota ledger sprint item stage matches check posture', currentItem ? `${currentItem.cardId}:${currentItem.stage}` : 'missing')
  addCheck(checks, !args.closeCard || (nextCard && nextItem && activeSprint.sprint?.activeBlockerCardId === NEXT_CARD_ID), 'close-card advances capability registry as next blocker', nextItem ? `${nextItem.cardId}:${nextItem.stage}` : 'missing next item')
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
    liveLedgerProof,
    syntheticProof,
    planReview: {
      status: planReview.status,
      score: planReview.score,
      summary: buildPlanCriticResultSummary(planReview),
    },
    llmRuntimeSummary: {
      credentialCount: llmRuntime.credentials?.length || 0,
      routeCount: llmRuntime.routes?.length || 0,
      recentCallCount: llmRuntime.recentCalls?.length || 0,
    },
    checks,
    findings: failures,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Brain Fleet quota ledger check: ${result.status}`)
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
