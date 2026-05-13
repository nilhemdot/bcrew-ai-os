#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  PROCESS_CHECK_APPLY_BOUNDARY_CARD_ID,
  RUNTIME_SAFETY_HARDENING_SCRIPT_PATH,
  RUNTIME_SAFETY_HARDENING_SPRINT_ID,
  VERIFY_READONLY_GATE_CARD_ID,
  buildFoundationVerifyRetryOptions,
  buildVerifyReadOnlyGateDogfoodProof,
} from '../lib/foundation-runtime-safety.js'
import {
  buildProcessCheckApplyBoundaryDogfoodProof,
} from '../lib/process-write-guard.js'
import {
  PROCESS_CHECK_SCHEDULED_MUTATION_GUARD_CARD_ID,
  buildScheduledMutationGuardDogfoodProof,
  getFoundationJobDefinitions,
  getFoundationJobRuntime,
} from '../lib/foundation-jobs.js'
import {
  CURRENT_SPRINT_MUTATION_GUARDS_CARD_ID,
  BACKLOG_STORE_CONCURRENCY_CARD_ID,
  FOUNDATION_DB_INIT_SEED_SPLIT_CARD_ID,
  buildCurrentSprintMutationGuardsDogfoodProof,
  buildFoundationDbInitSeedSplitDogfoodProof,
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'
import {
  buildBacklogStoreConcurrencyDogfoodProof,
} from '../lib/backlog-store-concurrency.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const CARD_IDS = [
  VERIFY_READONLY_GATE_CARD_ID,
  PROCESS_CHECK_APPLY_BOUNDARY_CARD_ID,
  PROCESS_CHECK_SCHEDULED_MUTATION_GUARD_CARD_ID,
  FOUNDATION_DB_INIT_SEED_SPLIT_CARD_ID,
  CURRENT_SPRINT_MUTATION_GUARDS_CARD_ID,
  BACKLOG_STORE_CONCURRENCY_CARD_ID,
]

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false, card: VERIFY_READONLY_GATE_CARD_ID }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg.startsWith('--card=')) args.card = arg.slice('--card='.length)
  }
  return args
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function buildVerifyReadOnlyGateStatus() {
  const checks = []
  const cardId = VERIFY_READONLY_GATE_CARD_ID
  const [packageSource, foundationVerifySource, runtimeSafetySource] = await Promise.all([
    readRepoFile('package.json'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('lib/foundation-runtime-safety.js'),
  ])
  const packageJson = JSON.parse(packageSource)
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: `docs/process/approvals/${cardId}.json`,
    cardId,
  })
  const planCriticRuns = await getPlanCriticRunsByCardIds([cardId])
  const backlogItems = await getBacklogItemsByIds([cardId])
  const activeSprint = await getActiveFoundationCurrentSprint().catch(() => ({ sprint: null, items: [] }))
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === cardId) || null
  const card = backlogItems.find(item => item.id === cardId) || null
  const proof = await buildVerifyReadOnlyGateDogfoodProof()
  const forbiddenResetFunctionToken = ['reset', 'Foundation', 'Db'].join('')
  const forbiddenRetryRepairHookToken = ['before', 'Retry'].join('')
  let repairHookThrows = false
  try {
    buildFoundationVerifyRetryOptions({ beforeRetry: async () => {} })
  } catch {
    repairHookThrows = true
  }

  addCheck(
    checks,
    approval.ok && Number(approval.approval?.score) >= 9.8,
    `${cardId} approval file is valid at 9.8+`,
    approval.failures?.map(item => item.check).join(', ') || `score=${approval.approval?.score}`,
  )
  addCheck(
    checks,
    planCriticRuns.some(run => run.cardId === cardId && run.status === 'pass' && Number(run.score) >= 9.8),
    `${cardId} has durable Plan Critic pass row`,
    planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing',
  )
  addCheck(
    checks,
    card && ['scoped', 'done'].includes(card.lane),
    `${cardId} exists in live backlog`,
    card ? `${card.lane} / ${card.priority}` : 'missing',
  )
  addCheck(
    checks,
    activeSprint.sprint?.sprintId === RUNTIME_SAFETY_HARDENING_SPRINT_ID &&
      ['building_now', 'done_this_sprint'].includes(sprintItem?.stage),
    `${cardId} is active in the runtime safety sprint`,
    activeSprint.sprint ? `${activeSprint.sprint.sprintId} / ${sprintItem?.stage || 'missing stage'}` : 'missing active sprint',
  )
  addCheck(
    checks,
    proof.ok === true &&
      proof.legacyRepairThenPass?.wentGreenAfterRepair === true &&
      proof.readOnlyFailClosed?.failedClosed === true &&
      proof.readOnlyFailClosed?.repairCalls === 0 &&
      proof.repairHookRejected?.ok === true,
    'dogfood proof blocks repair-then-pass verifier behavior',
    JSON.stringify(proof),
  )
  addCheck(
    checks,
    repairHookThrows,
    'foundation:verify retry options reject repair hooks',
    repairHookThrows ? 'repair hook rejected' : 'repair hook accepted',
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:runtime-safety-hardening-check'] === `node --env-file-if-exists=.env ${RUNTIME_SAFETY_HARDENING_SCRIPT_PATH}`,
    'package exposes runtime safety focused proof',
    packageJson.scripts?.['process:runtime-safety-hardening-check'] || 'missing',
  )
  addCheck(
    checks,
    foundationVerifySource.includes('buildFoundationVerifyRetryOptions') &&
      foundationVerifySource.includes('buildVerifyReadOnlyGateDogfoodProof') &&
      !foundationVerifySource.includes(forbiddenResetFunctionToken) &&
      !foundationVerifySource.includes(forbiddenRetryRepairHookToken),
    'foundation:verify source uses read-only retry helper and no live repair hook',
    `${forbiddenResetFunctionToken}=absent ${forbiddenRetryRepairHookToken}=absent`,
  )
  addCheck(
    checks,
    runtimeSafetySource.includes('repair-then-pass') &&
      runtimeSafetySource.includes('foundation:verify is read-only') &&
      runtimeSafetySource.includes('buildVerifyReadOnlyGateDogfoodProof'),
    'runtime safety helper owns the dogfood invariant',
    'dogfood helper present',
  )

  return { checks, proof }
}

async function buildProcessCheckApplyBoundaryStatus() {
  const checks = []
  const cardId = PROCESS_CHECK_APPLY_BOUNDARY_CARD_ID
  const highRiskScriptPaths = [
    'scripts/process-source-maturity-grid-check.mjs',
    'scripts/process-connector-credential-check.mjs',
    'scripts/process-llm-auth-audit-check.mjs',
    'scripts/process-source-extraction-gap-followup-check.mjs',
  ]
  const [
    packageSource,
    writeGuardSource,
    focusedProofSource,
    foundationVerifySource,
    ...highRiskSources
  ] = await Promise.all([
    readRepoFile('package.json'),
    readRepoFile('lib/process-write-guard.js'),
    readRepoFile(RUNTIME_SAFETY_HARDENING_SCRIPT_PATH),
    readRepoFile('scripts/foundation-verify.mjs'),
    ...highRiskScriptPaths.map(scriptPath => readRepoFile(scriptPath)),
  ])
  const packageJson = JSON.parse(packageSource)
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: `docs/process/approvals/${cardId}.json`,
    cardId,
  })
  const planCriticRuns = await getPlanCriticRunsByCardIds([cardId])
  const backlogItems = await getBacklogItemsByIds([cardId])
  const activeSprint = await getActiveFoundationCurrentSprint().catch(() => ({ sprint: null, items: [] }))
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === cardId) || null
  const card = backlogItems.find(item => item.id === cardId) || null
  const proof = await buildProcessCheckApplyBoundaryDogfoodProof()
  const guardedHighRiskScripts = highRiskSources.map((source, index) => ({
    scriptPath: highRiskScriptPaths[index],
    guarded: source.includes('assertProcessCheckWriteAllowed') &&
      source.includes('isProcessCheckWriteRequested') &&
      source.includes('close-card') &&
      source.includes('mutate-sprint'),
  }))

  addCheck(
    checks,
    approval.ok && Number(approval.approval?.score) >= 9.8,
    `${cardId} approval file is valid at 9.8+`,
    approval.failures?.map(item => item.check).join(', ') || `score=${approval.approval?.score}`,
  )
  addCheck(
    checks,
    planCriticRuns.some(run => run.cardId === cardId && run.status === 'pass' && Number(run.score) >= 9.8),
    `${cardId} has durable Plan Critic pass row`,
    planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing',
  )
  addCheck(
    checks,
    card && ['scoped', 'done'].includes(card.lane),
    `${cardId} exists in live backlog`,
    card ? `${card.lane} / ${card.priority}` : 'missing',
  )
  addCheck(
    checks,
    activeSprint.sprint?.sprintId === RUNTIME_SAFETY_HARDENING_SPRINT_ID &&
      ['building_now', 'done_this_sprint'].includes(sprintItem?.stage),
    `${cardId} is active in the runtime safety sprint`,
    activeSprint.sprint ? `${activeSprint.sprint.sprintId} / ${sprintItem?.stage || 'missing stage'}` : 'missing active sprint',
  )
  addCheck(
    checks,
    proof.ok === true &&
      proof.blockedNoFlag?.ok === true &&
      proof.allowedApply?.ok === true &&
      proof.allowedCloseCard?.ok === true &&
      proof.blockedWrongFlag?.ok === true &&
      proof.reportAllowed?.ok === true,
    'dogfood proof blocks no-flag process-check writes and permits explicit write posture',
    JSON.stringify(proof),
  )
  addCheck(
    checks,
    writeGuardSource.includes('ProcessWriteGuardError') &&
      writeGuardSource.includes('PROCESS_CHECK_WRITE_BLOCKED') &&
      writeGuardSource.includes('assertProcessCheckWriteAllowed') &&
      writeGuardSource.includes('buildProcessCheckApplyBoundaryDogfoodProof'),
    'shared process write guard owns the write-posture invariant',
    'lib/process-write-guard.js',
  )
  addCheck(
    checks,
    guardedHighRiskScripts.every(item => item.guarded),
    'audited high-risk process-check mutation paths route through the guard',
    guardedHighRiskScripts.map(item => `${item.scriptPath}=${item.guarded ? 'guarded' : 'missing'}`).join(', '),
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:runtime-safety-hardening-check'] === `node --env-file-if-exists=.env ${RUNTIME_SAFETY_HARDENING_SCRIPT_PATH}`,
    'package exposes runtime safety focused proof',
    packageJson.scripts?.['process:runtime-safety-hardening-check'] || 'missing',
  )
  addCheck(
    checks,
    focusedProofSource.includes('buildProcessCheckApplyBoundaryDogfoodProof') &&
      focusedProofSource.includes('PROCESS_CHECK_APPLY_BOUNDARY_CARD_ID'),
    'focused proof script covers process-check apply boundary',
    RUNTIME_SAFETY_HARDENING_SCRIPT_PATH,
  )
  addCheck(
    checks,
    foundationVerifySource.includes(PROCESS_CHECK_APPLY_BOUNDARY_CARD_ID) &&
      foundationVerifySource.includes('buildProcessCheckApplyBoundaryDogfoodProof'),
    'foundation verifier has process-check apply boundary coverage',
    PROCESS_CHECK_APPLY_BOUNDARY_CARD_ID,
  )

  return { checks, proof }
}

async function buildScheduledMutationGuardStatus() {
  const checks = []
  const cardId = PROCESS_CHECK_SCHEDULED_MUTATION_GUARD_CARD_ID
  const [
    packageSource,
    foundationJobsSource,
    foundationDbSource,
    foundationWorkerSource,
    runFoundationJobSource,
    foundationVerifySource,
    focusedProofSource,
  ] = await Promise.all([
    readRepoFile('package.json'),
    readRepoFile('lib/foundation-jobs.js'),
    readRepoFile('lib/foundation-db.js'),
    readRepoFile('scripts/foundation-worker.mjs'),
    readRepoFile('scripts/run-foundation-job.mjs'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile(RUNTIME_SAFETY_HARDENING_SCRIPT_PATH),
  ])
  const packageJson = JSON.parse(packageSource)
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: `docs/process/approvals/${cardId}.json`,
    cardId,
  })
  const planCriticRuns = await getPlanCriticRunsByCardIds([cardId])
  const backlogItems = await getBacklogItemsByIds([cardId])
  const activeSprint = await getActiveFoundationCurrentSprint().catch(() => ({ sprint: null, items: [] }))
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === cardId) || null
  const card = backlogItems.find(item => item.id === cardId) || null
  const proof = buildScheduledMutationGuardDogfoodProof()
  const jobs = getFoundationJobDefinitions()
  const verificationRunsJob = jobs.find(job => job.key === 'verification-runs') || null
  const scheduledProcessChecks = jobs.filter(job => job.runtimeMode === 'scheduled' && job.processCheck?.isProcessCheck)
  const scheduledProcessCheckRuntime = scheduledProcessChecks.map(job => ({
    job,
    runtime: getFoundationJobRuntime(job, null, new Date('2026-05-13T12:00:00.000Z')),
  }))
  const unsafeScheduledProcessChecks = scheduledProcessCheckRuntime.filter(({ job, runtime }) =>
    job.scheduleMutationGuard?.ok === false && runtime.scheduleStatus !== 'blocked',
  )

  addCheck(
    checks,
    approval.ok && Number(approval.approval?.score) >= 9.8,
    `${cardId} approval file is valid at 9.8+`,
    approval.failures?.map(item => item.check).join(', ') || `score=${approval.approval?.score}`,
  )
  addCheck(
    checks,
    planCriticRuns.some(run => run.cardId === cardId && run.status === 'pass' && Number(run.score) >= 9.8),
    `${cardId} has durable Plan Critic pass row`,
    planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing',
  )
  addCheck(
    checks,
    card && ['scoped', 'done'].includes(card.lane),
    `${cardId} exists in live backlog`,
    card ? `${card.lane} / ${card.priority}` : 'missing',
  )
  addCheck(
    checks,
    activeSprint.sprint?.sprintId === RUNTIME_SAFETY_HARDENING_SPRINT_ID &&
      ['building_now', 'done_this_sprint'].includes(sprintItem?.stage),
    `${cardId} is active in the runtime safety sprint`,
    activeSprint.sprint ? `${activeSprint.sprint.sprintId} / ${sprintItem?.stage || 'missing stage'}` : 'missing active sprint',
  )
  addCheck(
    checks,
    proof.ok === true &&
      proof.scheduledMutatingCheck?.scheduleStatus === 'blocked' &&
      proof.scheduledUnknownCheck?.scheduleStatus === 'blocked' &&
      proof.scheduledReadOnlyCheck?.scheduleStatus !== 'blocked' &&
      proof.scheduledReportOnlyCheck?.scheduleStatus !== 'blocked' &&
      proof.manualMutatingCheck?.scheduleStatus === 'manual' &&
      proof.realVerificationRuns?.scheduleStatus === 'blocked',
    'dogfood proof blocks scheduled mutating/unknown process checks while allowing declared read-only/report-only checks',
    JSON.stringify(proof),
  )
  addCheck(
    checks,
    verificationRunsJob?.mutationPosture === 'mutating' &&
      verificationRunsJob?.scheduleMutationGuard?.ok === false,
    'existing scheduled verification-runs process check is classified mutating and blocked',
    verificationRunsJob
      ? `${verificationRunsJob.runtimeMode}/${verificationRunsJob.mutationPosture}/${verificationRunsJob.scheduleMutationGuard?.reason || 'missing reason'}`
      : 'missing verification-runs job',
  )
  addCheck(
    checks,
    unsafeScheduledProcessChecks.length === 0,
    'no scheduled process-check job bypasses the schedule mutation guard',
    unsafeScheduledProcessChecks.map(({ job }) => job.key).join(', ') || `${scheduledProcessChecks.length} scheduled process-check jobs evaluated`,
  )
  addCheck(
    checks,
    foundationJobsSource.includes('validateFoundationJobSchedulePosture') &&
      foundationJobsSource.includes('buildScheduledMutationGuardDogfoodProof') &&
      foundationJobsSource.includes('mutationPosture') &&
      foundationJobsSource.includes('process:verification-runs-check') &&
      foundationJobsSource.includes('scheduler must block it'),
    'foundation job registry owns mutation posture and scheduler-block dogfood helper',
    'lib/foundation-jobs.js',
  )
  addCheck(
    checks,
    foundationDbSource.includes('scheduleMutationGuard') &&
      foundationDbSource.includes("scheduleStatus === 'blocked'"),
    'Foundation job snapshots expose blocked schedule posture',
    'lib/foundation-db.js',
  )
  addCheck(
    checks,
    foundationWorkerSource.includes('scheduleMutationGuard?.ok !== false') &&
      foundationWorkerSource.includes("scheduleStatus !== 'blocked'"),
    'Foundation worker selection refuses blocked scheduled jobs',
    'scripts/foundation-worker.mjs',
  )
  addCheck(
    checks,
    runFoundationJobSource.includes('validateFoundationJobSchedulePosture') &&
      runFoundationJobSource.includes('Foundation job is not runnable') &&
      runFoundationJobSource.includes('scheduleMutationGuard.reason'),
    'direct Foundation job runner refuses schedule-blocked jobs',
    'scripts/run-foundation-job.mjs',
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:runtime-safety-hardening-check'] === `node --env-file-if-exists=.env ${RUNTIME_SAFETY_HARDENING_SCRIPT_PATH}`,
    'package exposes runtime safety focused proof',
    packageJson.scripts?.['process:runtime-safety-hardening-check'] || 'missing',
  )
  addCheck(
    checks,
    focusedProofSource.includes('buildScheduledMutationGuardDogfoodProof') &&
      focusedProofSource.includes('PROCESS_CHECK_SCHEDULED_MUTATION_GUARD_CARD_ID'),
    'focused proof script covers scheduled mutation guard',
    RUNTIME_SAFETY_HARDENING_SCRIPT_PATH,
  )
  addCheck(
    checks,
    foundationVerifySource.includes(PROCESS_CHECK_SCHEDULED_MUTATION_GUARD_CARD_ID) &&
      foundationVerifySource.includes('buildScheduledMutationGuardDogfoodProof'),
    'foundation verifier has scheduled mutation guard coverage',
    PROCESS_CHECK_SCHEDULED_MUTATION_GUARD_CARD_ID,
  )

  return { checks, proof }
}

async function buildFoundationDbInitSeedSplitStatus() {
  const checks = []
  const cardId = FOUNDATION_DB_INIT_SEED_SPLIT_CARD_ID
  const [
    packageSource,
    foundationDbSource,
    focusedProofSource,
    foundationVerifySource,
  ] = await Promise.all([
    readRepoFile('package.json'),
    readRepoFile('lib/foundation-db.js'),
    readRepoFile(RUNTIME_SAFETY_HARDENING_SCRIPT_PATH),
    readRepoFile('scripts/foundation-verify.mjs'),
  ])
  const packageJson = JSON.parse(packageSource)
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: `docs/process/approvals/${cardId}.json`,
    cardId,
  })
  const planCriticRuns = await getPlanCriticRunsByCardIds([cardId])
  const backlogItems = await getBacklogItemsByIds([cardId])
  const activeSprint = await getActiveFoundationCurrentSprint().catch(() => ({ sprint: null, items: [] }))
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === cardId) || null
  const card = backlogItems.find(item => item.id === cardId) || null
  const proof = await buildFoundationDbInitSeedSplitDogfoodProof()

  addCheck(
    checks,
    approval.ok && Number(approval.approval?.score) >= 9.8,
    `${cardId} approval file is valid at 9.8+`,
    approval.failures?.map(item => item.check).join(', ') || `score=${approval.approval?.score}`,
  )
  addCheck(
    checks,
    planCriticRuns.some(run => run.cardId === cardId && run.status === 'pass' && Number(run.score) >= 9.8),
    `${cardId} has durable Plan Critic pass row`,
    planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing',
  )
  addCheck(
    checks,
    card && ['scoped', 'done'].includes(card.lane),
    `${cardId} exists in live backlog`,
    card ? `${card.lane} / ${card.priority}` : 'missing',
  )
  addCheck(
    checks,
    activeSprint.sprint?.sprintId === RUNTIME_SAFETY_HARDENING_SPRINT_ID &&
      ['building_now', 'done_this_sprint'].includes(sprintItem?.stage),
    `${cardId} is active in the runtime safety sprint`,
    activeSprint.sprint ? `${activeSprint.sprint.sprintId} / ${sprintItem?.stage || 'missing stage'}` : 'missing active sprint',
  )
  addCheck(
    checks,
    proof.ok === true &&
      proof.schemaInitFunction === 'initFoundationDb' &&
      proof.explicitBootstrapFunction === 'bootstrapFoundationDb' &&
      Array.isArray(proof.changedTables) &&
      proof.changedTables.length === 0 &&
      proof.watchedTables.includes('backlog_items') &&
      proof.watchedTables.includes('foundation_sprints') &&
      proof.watchedTables.includes('foundation_sprint_items'),
    'dogfood proof shows schema init does not rewrite backlog/source/sprint seed truth',
    JSON.stringify(proof),
  )
  addCheck(
    checks,
    foundationDbSource.includes('FOUNDATION_DB_INIT_SEED_SPLIT_CARD_ID') &&
      foundationDbSource.includes('includeBootstrapSeed') &&
      foundationDbSource.includes('export async function bootstrapFoundationDb') &&
      foundationDbSource.includes('buildFoundationDbInitSeedSplitDogfoodProof') &&
      foundationDbSource.includes('schema-init-black-box-before-after'),
    'foundation DB module separates schema init from explicit bootstrap and owns dogfood proof',
    'lib/foundation-db.js',
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:runtime-safety-hardening-check'] === `node --env-file-if-exists=.env ${RUNTIME_SAFETY_HARDENING_SCRIPT_PATH}` &&
      packageJson.scripts?.['foundation:db-bootstrap'] === 'node --env-file-if-exists=.env scripts/bootstrap-foundation-db.mjs --apply',
    'package exposes runtime proof and explicit DB bootstrap command',
    `proof=${packageJson.scripts?.['process:runtime-safety-hardening-check'] || 'missing'} bootstrap=${packageJson.scripts?.['foundation:db-bootstrap'] || 'missing'}`,
  )
  addCheck(
    checks,
    focusedProofSource.includes('buildFoundationDbInitSeedSplitDogfoodProof') &&
      focusedProofSource.includes('FOUNDATION_DB_INIT_SEED_SPLIT_CARD_ID'),
    'focused proof script covers DB init seed split',
    RUNTIME_SAFETY_HARDENING_SCRIPT_PATH,
  )
  addCheck(
    checks,
    foundationVerifySource.includes(FOUNDATION_DB_INIT_SEED_SPLIT_CARD_ID) &&
      foundationVerifySource.includes('buildFoundationDbInitSeedSplitDogfoodProof'),
    'foundation verifier has DB init seed split coverage',
    FOUNDATION_DB_INIT_SEED_SPLIT_CARD_ID,
  )

  return { checks, proof }
}

async function buildCurrentSprintMutationGuardsStatus() {
  const checks = []
  const cardId = CURRENT_SPRINT_MUTATION_GUARDS_CARD_ID
  const [
    packageSource,
    foundationDbSource,
    focusedProofSource,
    foundationVerifySource,
  ] = await Promise.all([
    readRepoFile('package.json'),
    readRepoFile('lib/foundation-db.js'),
    readRepoFile(RUNTIME_SAFETY_HARDENING_SCRIPT_PATH),
    readRepoFile('scripts/foundation-verify.mjs'),
  ])
  const packageJson = JSON.parse(packageSource)
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: `docs/process/approvals/${cardId}.json`,
    cardId,
  })
  const planCriticRuns = await getPlanCriticRunsByCardIds([cardId])
  const backlogItems = await getBacklogItemsByIds([cardId])
  const activeSprint = await getActiveFoundationCurrentSprint().catch(() => ({ sprint: null, items: [] }))
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === cardId) || null
  const card = backlogItems.find(item => item.id === cardId) || null
  const proof = await buildCurrentSprintMutationGuardsDogfoodProof()

  addCheck(
    checks,
    approval.ok && Number(approval.approval?.score) >= 9.8,
    `${cardId} approval file is valid at 9.8+`,
    approval.failures?.map(item => item.check).join(', ') || `score=${approval.approval?.score}`,
  )
  addCheck(
    checks,
    planCriticRuns.some(run => run.cardId === cardId && run.status === 'pass' && Number(run.score) >= 9.8),
    `${cardId} has durable Plan Critic pass row`,
    planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing',
  )
  addCheck(
    checks,
    card && ['scoped', 'done'].includes(card.lane),
    `${cardId} exists in live backlog`,
    card ? `${card.lane} / ${card.priority}` : 'missing',
  )
  addCheck(
    checks,
    activeSprint.sprint?.sprintId === RUNTIME_SAFETY_HARDENING_SPRINT_ID &&
      ['building_now', 'done_this_sprint'].includes(sprintItem?.stage),
    `${cardId} is active in the runtime safety sprint`,
    activeSprint.sprint ? `${activeSprint.sprint.sprintId} / ${sprintItem?.stage || 'missing stage'}` : 'missing active sprint',
  )
  addCheck(
    checks,
    proof.ok === true &&
      proof.unsafeNoApply?.blocked === true &&
      proof.missingExpectedPreviousActiveSprintId?.blocked === true &&
      proof.missingAllowItemReplacement?.blocked === true &&
      proof.explicitAllowed?.ok === true &&
      proof.explicitAllowed?.itemDiff?.changedCount >= 2 &&
      proof.syntheticRollback?.active_sprint_restored === true &&
      proof.syntheticRollback?.existing_item_restored === true &&
      proof.syntheticRollback?.replacement_card_exists === false,
    'dogfood proof blocks unsafe Current Sprint overlay calls and allows explicit apply+expected-id+replacement posture',
    JSON.stringify(proof),
  )
  addCheck(
    checks,
    foundationDbSource.includes('FoundationCurrentSprintMutationGuardError') &&
      foundationDbSource.includes('FOUNDATION_CURRENT_SPRINT_MUTATION_BLOCKED') &&
      foundationDbSource.includes('expectedPreviousActiveSprintId') &&
      foundationDbSource.includes('allowItemReplacement') &&
      foundationDbSource.includes('buildCurrentSprintMutationGuardsDogfoodProof') &&
      foundationDbSource.includes('mutationPosture') &&
      foundationDbSource.includes('itemDiff'),
    'foundation DB module owns Current Sprint mutation guard and diff proof',
    'lib/foundation-db.js',
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:runtime-safety-hardening-check'] === `node --env-file-if-exists=.env ${RUNTIME_SAFETY_HARDENING_SCRIPT_PATH}`,
    'package exposes runtime safety focused proof',
    packageJson.scripts?.['process:runtime-safety-hardening-check'] || 'missing',
  )
  addCheck(
    checks,
    focusedProofSource.includes('buildCurrentSprintMutationGuardsDogfoodProof') &&
      focusedProofSource.includes('CURRENT_SPRINT_MUTATION_GUARDS_CARD_ID'),
    'focused proof script covers Current Sprint mutation guards',
    RUNTIME_SAFETY_HARDENING_SCRIPT_PATH,
  )
  addCheck(
    checks,
    foundationVerifySource.includes(CURRENT_SPRINT_MUTATION_GUARDS_CARD_ID) &&
      foundationVerifySource.includes('buildCurrentSprintMutationGuardsDogfoodProof'),
    'foundation verifier has Current Sprint mutation guard coverage',
    CURRENT_SPRINT_MUTATION_GUARDS_CARD_ID,
  )

  return { checks, proof }
}

async function buildBacklogStoreConcurrencyStatus() {
  const checks = []
  const cardId = BACKLOG_STORE_CONCURRENCY_CARD_ID
  const [
    packageSource,
    backlogConcurrencySource,
    foundationDbSource,
    focusedProofSource,
    foundationVerifySource,
  ] = await Promise.all([
    readRepoFile('package.json'),
    readRepoFile('lib/backlog-store-concurrency.js'),
    readRepoFile('lib/foundation-db.js'),
    readRepoFile(RUNTIME_SAFETY_HARDENING_SCRIPT_PATH),
    readRepoFile('scripts/foundation-verify.mjs'),
  ])
  const packageJson = JSON.parse(packageSource)
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: `docs/process/approvals/${cardId}.json`,
    cardId,
  })
  const planCriticRuns = await getPlanCriticRunsByCardIds([cardId])
  const backlogItems = await getBacklogItemsByIds([cardId])
  const activeSprint = await getActiveFoundationCurrentSprint().catch(() => ({ sprint: null, items: [] }))
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === cardId) || null
  const card = backlogItems.find(item => item.id === cardId) || null
  const proof = await buildBacklogStoreConcurrencyDogfoodProof()

  addCheck(
    checks,
    approval.ok && Number(approval.approval?.score) >= 9.8,
    `${cardId} approval file is valid at 9.8+`,
    approval.failures?.map(item => item.check).join(', ') || `score=${approval.approval?.score}`,
  )
  addCheck(
    checks,
    planCriticRuns.some(run => run.cardId === cardId && run.status === 'pass' && Number(run.score) >= 9.8),
    `${cardId} has durable Plan Critic pass row`,
    planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing',
  )
  addCheck(
    checks,
    card && ['scoped', 'done'].includes(card.lane),
    `${cardId} exists in live backlog`,
    card ? `${card.lane} / ${card.priority}` : 'missing',
  )
  addCheck(
    checks,
    activeSprint.sprint?.sprintId === RUNTIME_SAFETY_HARDENING_SPRINT_ID &&
      ['building_now', 'done_this_sprint'].includes(sprintItem?.stage),
    `${cardId} is active in the runtime safety sprint`,
    activeSprint.sprint ? `${activeSprint.sprint.sprintId} / ${sprintItem?.stage || 'missing stage'}` : 'missing active sprint',
  )
  addCheck(
    checks,
    proof.ok === true &&
      proof.legacyLostUpdate?.lostWriterAUpdate === true &&
      proof.safeConcurrentWriters?.preservedWriterAUpdate === true &&
      proof.safeConcurrentWriters?.preservedWriterBUpdate === true &&
      proof.safeConcurrentWriters?.writerBReadSawWriterACommit === true &&
      proof.changeEventProof?.hasFullBeforeAfter === true,
    'dogfood proof shows old backlog merge writes lose updates and locked updates preserve both writers',
    JSON.stringify(proof),
  )
  addCheck(
    checks,
    foundationDbSource.includes('BACKLOG_STORE_CONCURRENCY_CARD_ID') &&
      foundationDbSource.includes('SELECT * FROM backlog_items WHERE id = $1 FOR UPDATE') &&
      foundationDbSource.includes('changedFields') &&
      backlogConcurrencySource.includes('buildBacklogStoreConcurrencyDogfoodProof') &&
      backlogConcurrencySource.includes('legacyUnsafeBacklogMergeWrite') &&
      backlogConcurrencySource.includes('bcrew_ai_os_dogfood_'),
    'foundation DB module owns backlog row locking, full change-event metadata, and dogfood proof',
    'lib/foundation-db.js + lib/backlog-store-concurrency.js',
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:runtime-safety-hardening-check'] === `node --env-file-if-exists=.env ${RUNTIME_SAFETY_HARDENING_SCRIPT_PATH}`,
    'package exposes runtime safety focused proof',
    packageJson.scripts?.['process:runtime-safety-hardening-check'] || 'missing',
  )
  addCheck(
    checks,
    focusedProofSource.includes('buildBacklogStoreConcurrencyDogfoodProof') &&
      focusedProofSource.includes('BACKLOG_STORE_CONCURRENCY_CARD_ID'),
    'focused proof script covers backlog store concurrency',
    RUNTIME_SAFETY_HARDENING_SCRIPT_PATH,
  )
  addCheck(
    checks,
    foundationVerifySource.includes(BACKLOG_STORE_CONCURRENCY_CARD_ID) &&
      foundationVerifySource.includes('buildBacklogStoreConcurrencyDogfoodProof'),
    'foundation verifier has backlog store concurrency coverage',
    BACKLOG_STORE_CONCURRENCY_CARD_ID,
  )

  return { checks, proof }
}

async function main() {
  const args = parseArgs()
  const checks = []
  let proof = null

  if (!CARD_IDS.includes(args.card)) {
    addCheck(checks, false, 'requested card is implemented in this focused proof', args.card || 'missing --card')
  } else if (args.card === VERIFY_READONLY_GATE_CARD_ID) {
    const status = await buildVerifyReadOnlyGateStatus()
    checks.push(...status.checks)
    proof = status.proof
  } else if (args.card === PROCESS_CHECK_APPLY_BOUNDARY_CARD_ID) {
    const status = await buildProcessCheckApplyBoundaryStatus()
    checks.push(...status.checks)
    proof = status.proof
  } else if (args.card === PROCESS_CHECK_SCHEDULED_MUTATION_GUARD_CARD_ID) {
    const status = await buildScheduledMutationGuardStatus()
    checks.push(...status.checks)
    proof = status.proof
  } else if (args.card === FOUNDATION_DB_INIT_SEED_SPLIT_CARD_ID) {
    const status = await buildFoundationDbInitSeedSplitStatus()
    checks.push(...status.checks)
    proof = status.proof
  } else if (args.card === CURRENT_SPRINT_MUTATION_GUARDS_CARD_ID) {
    const status = await buildCurrentSprintMutationGuardsStatus()
    checks.push(...status.checks)
    proof = status.proof
  } else if (args.card === BACKLOG_STORE_CONCURRENCY_CARD_ID) {
    const status = await buildBacklogStoreConcurrencyStatus()
    checks.push(...status.checks)
    proof = status.proof
  }

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'unhealthy' : 'healthy',
    card: args.card,
    sprintId: RUNTIME_SAFETY_HARDENING_SPRINT_ID,
    scriptPath: RUNTIME_SAFETY_HARDENING_SCRIPT_PATH,
    proof,
    findings: failures,
    checks,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Runtime safety hardening check: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }

  await closeFoundationDb()
  if (failures.length) process.exitCode = 1
}

main().catch(async error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  await closeFoundationDb().catch(() => {})
  process.exitCode = 1
})
