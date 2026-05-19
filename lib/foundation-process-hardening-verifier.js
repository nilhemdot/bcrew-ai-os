import {
  PARALLEL_BUILDER_WORKTREE_PROTOCOL_APPROVAL_PATH,
  PARALLEL_BUILDER_WORKTREE_PROTOCOL_CARD_ID,
  PARALLEL_BUILDER_WORKTREE_PROTOCOL_CLOSEOUT_KEY,
  PARALLEL_BUILDER_WORKTREE_PROTOCOL_CLOSEOUT_PATH,
  PARALLEL_BUILDER_WORKTREE_PROTOCOL_PLAN_PATH,
  PARALLEL_BUILDER_WORKTREE_PROTOCOL_SCRIPT_PATH,
  buildParallelBuilderWorktreeProtocol,
  buildParallelBuilderWorktreeProtocolDogfoodProof,
  evaluateParallelBuilderWorktreeProtocol,
} from './parallel-builder-worktree-protocol.js'
import {
  PARALLEL_BUILDER_OPERATING_SYSTEM_APPROVAL_PATH,
  PARALLEL_BUILDER_OPERATING_SYSTEM_CARD_ID,
  PARALLEL_BUILDER_OPERATING_SYSTEM_CLOSEOUT_KEY,
  PARALLEL_BUILDER_OPERATING_SYSTEM_CLOSEOUT_PATH,
  PARALLEL_BUILDER_OPERATING_SYSTEM_PLAN_PATH,
  PARALLEL_BUILDER_OPERATING_SYSTEM_PROTOCOL_PATH,
  PARALLEL_BUILDER_OPERATING_SYSTEM_SCRIPT_PATH,
  buildParallelBuilderOperatingSystemDogfoodProof,
  buildParallelBuilderOperatingSystemProtocol,
  evaluateParallelBuilderOperatingSystem,
} from './parallel-builder-operating-system.js'
import {
  PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_APPROVAL_PATH,
  PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_CARD_ID,
  PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_CLOSEOUT_KEY,
  PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_CLOSEOUT_PATH,
  PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_PLAN_PATH,
  PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_PROTOCOL_PATH,
  PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_SCRIPT_PATH,
  buildParallelBuilderMergeLaneEnforcementDogfoodProof,
  buildParallelBuilderMergeLaneProtocol,
  evaluateParallelBuilderMergeLaneEnforcement,
} from './parallel-builder-merge-lane-enforcement.js'

export const VERIFIER_PROCESS_HARDENING_SPLIT_MODULE_CARD_ID = 'VERIFIER-PROCESS-HARDENING-SPLIT-MODULE-001'
export const VERIFIER_PROCESS_HARDENING_SPLIT_MODULE_CLOSEOUT_KEY = 'verifier-process-hardening-split-module-v1'
export const VERIFIER_PROCESS_HARDENING_SPLIT_MODULE_PLAN_PATH = 'docs/process/verifier-process-hardening-split-module-001-plan.md'
export const VERIFIER_PROCESS_HARDENING_SPLIT_MODULE_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-PROCESS-HARDENING-SPLIT-MODULE-001.json'
export const VERIFIER_PROCESS_HARDENING_SPLIT_MODULE_SCRIPT_PATH = 'scripts/process-verifier-process-hardening-split-module-check.mjs'
export const VERIFIER_PROCESS_HARDENING_SPLIT_MODULE_SPRINT_ID = 'verifier-process-hardening-split-module-2026-05-16'
export const VERIFIER_PROCESS_HARDENING_SPLIT_MODULE_BEFORE_LINES = 13743
export const VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_CARD_ID = 'VERIFIER-PROCESS-HARDENING-ORCHESTRATION-SPLIT-001'
export const VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_CLOSEOUT_KEY = 'verifier-process-hardening-orchestration-split-v1'
export const VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_PLAN_PATH = 'docs/process/verifier-process-hardening-orchestration-split-001-plan.md'
export const VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-PROCESS-HARDENING-ORCHESTRATION-SPLIT-001.json'
export const VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-process-hardening-orchestration-split-check.mjs'
export const VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_HANDOFF_PATH = 'docs/handoffs/2026-05-17-verifier-process-hardening-orchestration-split-closeout.md'
export const VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_BEFORE_LINES = 6651

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function includesAll(source, needles = []) {
  return needles.every(needle => String(source || '').includes(needle))
}

function countTextLines(value) {
  return String(value || '').split('\n').length
}

function evaluateProcessHardeningFixture(fixture = {}) {
  const findings = []
  if (fixture.readOnlyFailClosed !== true) findings.push('read_only_gate_not_fail_closed')
  if (fixture.scheduledMutatingCheckBlocked !== true) findings.push('scheduled_mutating_check_not_blocked')
  if (fixture.jobMutationAllowlistOk !== true) findings.push('job_mutation_allowlist_missing')
  if (fixture.dbSeedWouldWriteByDefault === true) findings.push('db_seed_writes_by_default')
  if (fixture.backlogLostUpdatePrevented !== true) findings.push('backlog_lost_update_not_prevented')
  return { ok: findings.length === 0, findings }
}

export function buildFoundationProcessHardeningVerifierDogfoodProof() {
  const healthy = evaluateProcessHardeningFixture({
    readOnlyFailClosed: true,
    scheduledMutatingCheckBlocked: true,
    jobMutationAllowlistOk: true,
    dbSeedWouldWriteByDefault: false,
    backlogLostUpdatePrevented: true,
  })
  const rejected = {
    verifierCanRepair: evaluateProcessHardeningFixture({
      readOnlyFailClosed: false,
      scheduledMutatingCheckBlocked: true,
      jobMutationAllowlistOk: true,
      dbSeedWouldWriteByDefault: false,
      backlogLostUpdatePrevented: true,
    }),
    scheduledMutation: evaluateProcessHardeningFixture({
      readOnlyFailClosed: true,
      scheduledMutatingCheckBlocked: false,
      jobMutationAllowlistOk: true,
      dbSeedWouldWriteByDefault: false,
      backlogLostUpdatePrevented: true,
    }),
    seedWritesByDefault: evaluateProcessHardeningFixture({
      readOnlyFailClosed: true,
      scheduledMutatingCheckBlocked: true,
      jobMutationAllowlistOk: true,
      dbSeedWouldWriteByDefault: true,
      backlogLostUpdatePrevented: true,
    }),
    backlogLostUpdate: evaluateProcessHardeningFixture({
      readOnlyFailClosed: true,
      scheduledMutatingCheckBlocked: true,
      jobMutationAllowlistOk: true,
      dbSeedWouldWriteByDefault: false,
      backlogLostUpdatePrevented: false,
    }),
  }
  const ok = healthy.ok && Object.values(rejected).every(result => result.ok === false)
  return {
    ok,
    healthy,
    rejected,
    dogfoodInvariant: ok
      ? 'healthy fixture passes; verifier repair, scheduled mutation, seed writeback, and lost-update fixtures fail closed'
      : 'process-hardening verifier dogfood did not reject every known failure fixture',
  }
}

export async function evaluateFoundationProcessHardeningVerifierChecks(input = {}) {
  const {
    ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_CARD_ID,
    ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_CLOSEOUT_KEY,
    ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_SCRIPT_PATH,
    BACKLOG_STORE_CONCURRENCY_CARD_ID,
    CLOSEOUT_OWNERSHIP_GUARD_CARD_ID,
    CURRENT_SPRINT_MUTATION_GUARDS_CARD_ID,
    DB_SEED_CARD_ID,
    DB_SEED_CLOSEOUT_KEY,
    DB_SEED_SCRIPT_PATH,
    FOUNDATION_DB_INIT_SEED_SPLIT_CARD_ID,
    FOUNDATION_DB_STORE_SPLIT_CARD_ID,
    FOUNDATION_DB_STORE_SPLIT_CLOSEOUT_KEY,
    FOUNDATION_DB_STORE_SPLIT_SCRIPT_PATH,
    FOUNDATION_HUB_COMMITTED_BASELINE,
    FOUNDATION_JOB_MUTATION_ALLOWLIST_CARD_ID,
    FOUNDATION_JOB_MUTATION_ALLOWLIST_SCRIPT_PATH,
    FOUNDATION_OPERATING_RELIABILITY_CLOSEOUT_KEY,
    FOUNDATION_VERIFICATION_CLEANUP_CLOSEOUT_KEY,
    FOUNDATION_VERIFICATION_CLEANUP_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    FOUNDATION_VERIFICATION_CLEANUP_SCRIPT_PATH,
    HUB_PERF_VERIFICATION_REPORT_PATH,
    KPI_HEALTH_API_CACHE_CARD_ID,
    KPI_HEALTH_API_CACHE_CLOSEOUT_KEY,
    KPI_HEALTH_API_CACHE_SCRIPT_PATH,
    KPI_HEALTH_FETCH_TIMEOUT_MS,
    LIVE_TRUTH_VERIFY_DECOUPLE_CARD_ID,
    LIVE_TRUTH_VERIFY_DECOUPLE_SCRIPT_PATH,
    PROCESS_CHECK_APPLY_BOUNDARY_CARD_ID,
    PROCESS_CHECK_READONLY_MODE_CARD_ID,
    PROCESS_CHECK_READONLY_MODE_SCRIPT_PATH,
    PROCESS_CHECK_SCHEDULED_MUTATION_GUARD_CARD_ID,
    RECURRING_DEEP_AUDIT_JOB_KEY,
    RECURRING_DEEP_AUDIT_SCRIPT_PATH,
    RUNTIME_SAFETY_HARDENING_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    RUNTIME_SAFETY_HARDENING_SCRIPT_PATH,
    SPRINT_CHECK_HISTORICAL_MODE_CARD_ID,
    SPRINT_CHECK_HISTORICAL_MODE_SCRIPT_PATH,
    VERIFY_READONLY_GATE_CARD_ID,
    baseUrl,
    buildActiveVsHistoricalVerifierSplitDogfoodProof,
    buildBacklogStoreConcurrencyDogfoodProof,
    buildCurrentSprintMutationGuardsDogfoodProof,
    buildDbSeedGovernanceDogfoodProof,
    buildFoundationDbInitSeedSplitDogfoodProof,
    buildFoundationJobMutationAllowlistDogfoodProof,
    buildFoundationJobMutationAllowlistReport,
    buildVerifyReadOnlyGateDogfoodProof,
    buildKpiHealthApiCacheDogfoodProof,
    buildLiveTruthVerifyDecoupleStatus,
    buildProcessCheckApplyBoundaryDogfoodProof,
    buildProcessCheckReadonlyModeProof,
    buildRecurringDeepAuditContract,
    buildRecurringDeepAuditDogfoodProof,
    buildScheduledMutationGuardDogfoodProof,
    buildSyntheticFoundationCurrentSprintStoreSplitProof,
    buildSyntheticFoundationHubPerformanceDogfoodProof,
    buildSyntheticSprintCheckHistoricalModeProof,
    closeoutOwnershipGuardCard,
    currentSprintStoreSource,
    evaluateDbSeedModuleSplit,
    evaluateFoundationCurrentSprintStoreSplit,
    evaluateFoundationHubPerformanceMeasurement,
    evaluateRecurringDeepAuditJob,
    findBuildLogCloseoutEntry,
    foundationBacklogSeedSource,
    foundationBacklogStoreSource,
    foundationBuildCloseoutCleanupRecordsSource,
    foundationBuildCloseoutRecordsSource,
    foundationBuildLogCloseoutValidationProof,
    foundationBuildLogRegistrySource,
    foundationBuildLogValidation,
    foundationDbSource,
    foundationDbSchemaSeedStoreSource,
    foundationHub,
    foundationHubKpiHealth,
    foundationHubPerformanceVerificationSource,
    foundationJobsSource,
    foundationVerificationCleanupCloseout,
    foundationVerificationCleanupScriptSource,
    foundationVerifySource,
    foundationWorkerSource,
    getFoundationJobDefinitions,
    getFoundationJobRuntime,
    hubReadRoutesSource,
    kpiHealthSource,
    packageJson,
    parallelBuilderWorktreeProtocolSource,
    planCriticArchitecturalRulesProof,
    processCheckReadonlyProofIsHistoricalAware,
    readRepoFile,
    recurringDeepAuditScriptSource,
    recurringDeepAuditSource,
    repoFileExists,
    repoRoot,
    sourceOfTruthPayloadSource,
    sourceTruthKpiHealth,
  } = input
  const checks = []

  ensure(
    checks,
    closeoutOwnershipGuardCard &&
      ['executing', 'done'].includes(closeoutOwnershipGuardCard.lane) &&
      foundationBuildLogCloseoutValidationProof.ok === true &&
      (foundationBuildLogCloseoutValidationProof.overlapping.ownershipOverlapViolations || [])
        .some(violation => (violation.overlappingBacklogIds || []).includes('SYNTHETIC-A')) &&
      (foundationBuildLogValidation.ownershipOverlapViolations || []).length === 0,
    'CLOSEOUT-OWNERSHIP-GUARD-001 blocks closeout ownership/context overlap',
    closeoutOwnershipGuardCard
      ? `lane=${closeoutOwnershipGuardCard.lane} dogfood=${foundationBuildLogCloseoutValidationProof.ok ? 'pass' : 'blocked'} realOverlaps=${(foundationBuildLogValidation.ownershipOverlapViolations || []).length}`
      : `missing ${CLOSEOUT_OWNERSHIP_GUARD_CARD_ID}`,
  )
  const foundationVerificationCleanupCards = FOUNDATION_VERIFICATION_CLEANUP_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE
    .map(id => (foundationHub.backlogItems || []).find(item => item.id === id) || null)
  const foundationHubPerformanceVerificationProof = buildSyntheticFoundationHubPerformanceDogfoodProof()
  const foundationHubCommittedPerformance = evaluateFoundationHubPerformanceMeasurement(FOUNDATION_HUB_COMMITTED_BASELINE)
  const recurringDeepAuditContract = buildRecurringDeepAuditContract()
  const verificationCleanupJobs = getFoundationJobDefinitions()
  const recurringDeepAuditJob = verificationCleanupJobs.find(job => job.key === RECURRING_DEEP_AUDIT_JOB_KEY) || null
  const recurringDeepAuditEvaluation = evaluateRecurringDeepAuditJob(recurringDeepAuditJob || {}, recurringDeepAuditContract)
  const recurringDeepAuditDogfood = buildRecurringDeepAuditDogfoodProof(recurringDeepAuditJob || {})
  const foundationVerificationCleanupRecordLineCount = countTextLines(foundationBuildCloseoutRecordsSource)
  ensure(
    checks,
      foundationVerificationCleanupCards.every(card =>
        card &&
        ['scoped', 'done'].includes(card.lane) &&
        String(card.statusNote || '').includes(FOUNDATION_VERIFICATION_CLEANUP_CLOSEOUT_KEY)
      ) &&
      foundationVerificationCleanupCloseout?.operatorCloseout === true &&
      FOUNDATION_VERIFICATION_CLEANUP_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE.every(id => (foundationVerificationCleanupCloseout.backlogIds || []).includes(id)) &&
      planCriticArchitecturalRulesProof.ok === true &&
      planCriticArchitecturalRulesProof.hotRouteNoBudget?.status === 'revise' &&
      planCriticArchitecturalRulesProof.hotRouteNoBudget?.findings?.some(finding => finding.key === 'architecture_hot_route_performance_budget') &&
      planCriticArchitecturalRulesProof.compliant?.status === 'pass' &&
      foundationHubPerformanceVerificationProof.ok === true &&
      foundationHubCommittedPerformance.ok === true &&
      FOUNDATION_HUB_COMMITTED_BASELINE.summary?.seconds < 5 &&
      FOUNDATION_HUB_COMMITTED_BASELINE.summary?.bytes < 1000000 &&
      FOUNDATION_HUB_COMMITTED_BASELINE.fullDiagnostics?.seconds > 30 &&
      foundationHubPerformanceVerificationSource.includes('buildSyntheticFoundationHubPerformanceDogfoodProof') &&
      foundationHubPerformanceVerificationSource.includes('FOUNDATION_HUB_PRIOR_BASELINE') &&
      foundationHubPerformanceVerificationSource.includes('fullDiagnostics') &&
      foundationVerificationCleanupScriptSource.includes('Plan Critic dogfood rejects architecture-risk and hot-route/no-budget plans') &&
      foundationVerificationCleanupScriptSource.includes('root closeout records file line count decreased') &&
      recurringDeepAuditEvaluation.ok === true &&
      recurringDeepAuditDogfood.ok === true &&
      recurringDeepAuditSource.includes('buildRecurringDeepAuditContract') &&
      recurringDeepAuditSource.includes('manualApprovalRequired') &&
      recurringDeepAuditSource.includes('autoMutatesBacklog: false') &&
      recurringDeepAuditScriptSource.includes('dogfood rejects scanner-only and autonomous/mutating reviewer shapes') &&
      recurringDeepAuditJob?.runtimeMode === 'manual' &&
      recurringDeepAuditJob?.mutationPosture === 'report_only' &&
      packageJson.scripts?.['process:recurring-deep-audit-check'] === `node --env-file-if-exists=.env ${RECURRING_DEEP_AUDIT_SCRIPT_PATH}` &&
      packageJson.scripts?.['process:foundation-verification-cleanup-check'] === `node --env-file-if-exists=.env ${FOUNDATION_VERIFICATION_CLEANUP_SCRIPT_PATH}` &&
      foundationBuildCloseoutRecordsSource.includes("import { cleanupCloseoutRecords }") &&
      foundationBuildCloseoutRecordsSource.includes('...cleanupCloseoutRecords') &&
      foundationBuildCloseoutCleanupRecordsSource.includes(FOUNDATION_VERIFICATION_CLEANUP_CLOSEOUT_KEY) &&
      foundationBuildCloseoutCleanupRecordsSource.includes(FOUNDATION_OPERATING_RELIABILITY_CLOSEOUT_KEY) &&
      foundationVerificationCleanupRecordLineCount < 5862 &&
      foundationBuildLogRegistrySource.includes(FOUNDATION_VERIFICATION_CLEANUP_CLOSEOUT_KEY) &&
      await repoFileExists(HUB_PERF_VERIFICATION_REPORT_PATH) &&
      includesAll(foundationVerifySource, FOUNDATION_VERIFICATION_CLEANUP_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'Foundation Verification + Cleanup dogfoods architecture gates, records hub performance, splits closeout records, and registers recurring deep audit cadence',
    `cards=${foundationVerificationCleanupCards.filter(card => card).length}/${FOUNDATION_VERIFICATION_CLEANUP_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE.length} summary=${FOUNDATION_HUB_COMMITTED_BASELINE.summary?.seconds}s full=${FOUNDATION_HUB_COMMITTED_BASELINE.fullDiagnostics?.seconds}s closeoutRecordLines=${foundationVerificationCleanupRecordLineCount} auditJob=${recurringDeepAuditJob?.runtimeMode || 'missing'}`,
  )
  const parallelBuilderWorktreeProtocolCard = (foundationHub.backlogItems || []).find(item => item.id === PARALLEL_BUILDER_WORKTREE_PROTOCOL_CARD_ID) || null
  const parallelBuilderWorktreeProtocolCloseout = findBuildLogCloseoutEntry(PARALLEL_BUILDER_WORKTREE_PROTOCOL_CARD_ID, PARALLEL_BUILDER_WORKTREE_PROTOCOL_CLOSEOUT_KEY)
  const parallelBuilderWorktreeProtocol = buildParallelBuilderWorktreeProtocol()
  const parallelBuilderWorktreeProtocolStatus = evaluateParallelBuilderWorktreeProtocol(parallelBuilderWorktreeProtocol)
  const parallelBuilderWorktreeProtocolDogfood = buildParallelBuilderWorktreeProtocolDogfoodProof()
  ensure(
    checks,
      parallelBuilderWorktreeProtocolCard &&
      ['scoped', 'executing', 'done'].includes(parallelBuilderWorktreeProtocolCard.lane) &&
      parallelBuilderWorktreeProtocolCard.lane === 'done' &&
      String(parallelBuilderWorktreeProtocolCard.statusNote || '').includes(PARALLEL_BUILDER_WORKTREE_PROTOCOL_CLOSEOUT_KEY) &&
      parallelBuilderWorktreeProtocolCloseout?.operatorCloseout === true &&
      (parallelBuilderWorktreeProtocolCloseout.backlogIds || []).includes(PARALLEL_BUILDER_WORKTREE_PROTOCOL_CARD_ID) &&
      parallelBuilderWorktreeProtocolStatus.ok === true &&
      parallelBuilderWorktreeProtocolDogfood.ok === true &&
      parallelBuilderWorktreeProtocolDogfood.sameWorktreeRejected === true &&
      parallelBuilderWorktreeProtocolDogfood.sharedBranchRejected === true &&
      parallelBuilderWorktreeProtocolDogfood.overlappingScopesRejected === true &&
      parallelBuilderWorktreeProtocolDogfood.uncoordinatedSharedFileRejected === true &&
      packageJson.scripts?.['process:parallel-builder-worktree-protocol-check'] === `node --env-file-if-exists=.env ${PARALLEL_BUILDER_WORKTREE_PROTOCOL_SCRIPT_PATH}` &&
      await repoFileExists(PARALLEL_BUILDER_WORKTREE_PROTOCOL_PLAN_PATH) &&
      await repoFileExists(PARALLEL_BUILDER_WORKTREE_PROTOCOL_APPROVAL_PATH) &&
      await repoFileExists(PARALLEL_BUILDER_WORKTREE_PROTOCOL_CLOSEOUT_PATH) &&
      includesAll(parallelBuilderWorktreeProtocolSource, [
        'buildParallelBuilderWorktreeProtocolDogfoodProof',
        'sameWorktreeRejected',
        'sharedBranchRejected',
        'overlappingScopesRejected',
        'uncoordinatedSharedFileRejected',
      ]) &&
      includesAll(foundationVerifySource, ['PARALLEL_BUILDER_WORKTREE_PROTOCOL_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE']),
    'PARALLEL-BUILDER-WORKTREE-PROTOCOL-001 gates overnight parallel builders with worktree/file ownership proof',
    parallelBuilderWorktreeProtocolCard
      ? `lane=${parallelBuilderWorktreeProtocolCard.lane} status=${parallelBuilderWorktreeProtocolStatus.status} dogfood=${parallelBuilderWorktreeProtocolDogfood.ok ? 'pass' : 'blocked'}`
      : `missing ${PARALLEL_BUILDER_WORKTREE_PROTOCOL_CARD_ID}`,
  )
  const parallelBuilderOperatingSystemCard = (foundationHub.backlogItems || []).find(item => item.id === PARALLEL_BUILDER_OPERATING_SYSTEM_CARD_ID) || null
  const parallelBuilderOperatingSystemCloseout = findBuildLogCloseoutEntry(PARALLEL_BUILDER_OPERATING_SYSTEM_CARD_ID, PARALLEL_BUILDER_OPERATING_SYSTEM_CLOSEOUT_KEY)
  const parallelBuilderOperatingSystem = buildParallelBuilderOperatingSystemProtocol()
  const parallelBuilderOperatingSystemStatus = evaluateParallelBuilderOperatingSystem(parallelBuilderOperatingSystem)
  const parallelBuilderOperatingSystemDogfood = buildParallelBuilderOperatingSystemDogfoodProof()
  ensure(
    checks,
      parallelBuilderOperatingSystemCard &&
      parallelBuilderOperatingSystemCard.lane === 'done' &&
      String(parallelBuilderOperatingSystemCard.statusNote || '').includes(PARALLEL_BUILDER_OPERATING_SYSTEM_CLOSEOUT_KEY) &&
      parallelBuilderOperatingSystemCloseout?.operatorCloseout === true &&
      (parallelBuilderOperatingSystemCloseout.backlogIds || []).includes(PARALLEL_BUILDER_OPERATING_SYSTEM_CARD_ID) &&
      parallelBuilderOperatingSystemStatus.ok === true &&
      parallelBuilderOperatingSystemStatus.summary.visibleAssignmentCount >= 4 &&
      parallelBuilderOperatingSystemDogfood.ok === true &&
      parallelBuilderOperatingSystemDogfood.sameWorktreeRejected === true &&
      parallelBuilderOperatingSystemDogfood.sameBranchRejected === true &&
      parallelBuilderOperatingSystemDogfood.overlappingOwnershipRejected === true &&
      parallelBuilderOperatingSystemDogfood.hiddenSubagentRejected === true &&
      parallelBuilderOperatingSystemDogfood.uncoordinatedSharedCommitRejected === true &&
      parallelBuilderOperatingSystemDogfood.dirtyNoWrapRejected === true &&
      packageJson.scripts?.['process:parallel-builder-operating-system-check'] === `node --env-file-if-exists=.env ${PARALLEL_BUILDER_OPERATING_SYSTEM_SCRIPT_PATH}` &&
      await repoFileExists(PARALLEL_BUILDER_OPERATING_SYSTEM_PLAN_PATH) &&
      await repoFileExists(PARALLEL_BUILDER_OPERATING_SYSTEM_PROTOCOL_PATH) &&
      await repoFileExists(PARALLEL_BUILDER_OPERATING_SYSTEM_APPROVAL_PATH) &&
      await repoFileExists(PARALLEL_BUILDER_OPERATING_SYSTEM_CLOSEOUT_PATH) &&
      includesAll(foundationVerifySource, ['PARALLEL_BUILDER_WORKTREE_PROTOCOL_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE']),
    'PARALLEL-BUILDER-OPERATING-SYSTEM-001 gates visible parallel builders and hidden-subagent confusion',
    parallelBuilderOperatingSystemCard
      ? `lane=${parallelBuilderOperatingSystemCard.lane} status=${parallelBuilderOperatingSystemStatus.status} dogfood=${parallelBuilderOperatingSystemDogfood.ok ? 'pass' : 'blocked'} visible=${parallelBuilderOperatingSystemStatus.summary.visibleAssignmentCount}`
      : `missing ${PARALLEL_BUILDER_OPERATING_SYSTEM_CARD_ID}`,
  )
  const parallelBuilderMergeLaneCard = (foundationHub.backlogItems || []).find(item => item.id === PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_CARD_ID) || null
  const parallelBuilderMergeLaneCloseout = findBuildLogCloseoutEntry(PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_CARD_ID, PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_CLOSEOUT_KEY)
  const parallelBuilderMergeLaneProtocol = buildParallelBuilderMergeLaneProtocol()
  const parallelBuilderMergeLaneStatus = evaluateParallelBuilderMergeLaneEnforcement(parallelBuilderMergeLaneProtocol)
  const parallelBuilderMergeLaneDogfood = buildParallelBuilderMergeLaneEnforcementDogfoodProof()
  const parallelBuilderMergeLaneSource = await readRepoFile('lib/parallel-builder-merge-lane-enforcement.js')
  ensure(
    checks,
      parallelBuilderMergeLaneCard &&
      parallelBuilderMergeLaneCard.lane === 'done' &&
      String(parallelBuilderMergeLaneCard.statusNote || '').includes(PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_CLOSEOUT_KEY) &&
      parallelBuilderMergeLaneCloseout?.operatorCloseout === true &&
      (parallelBuilderMergeLaneCloseout.backlogIds || []).includes(PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_CARD_ID) &&
      parallelBuilderMergeLaneStatus.ok === true &&
      parallelBuilderMergeLaneStatus.summary.activeMergeCount <= 1 &&
      parallelBuilderMergeLaneDogfood.ok === true &&
      parallelBuilderMergeLaneDogfood.sameWorktreeRejected === true &&
      parallelBuilderMergeLaneDogfood.sameBranchRejected === true &&
      parallelBuilderMergeLaneDogfood.overlappingScopeRejected === true &&
      parallelBuilderMergeLaneDogfood.untrackedBuilderRejected === true &&
      parallelBuilderMergeLaneDogfood.missingQueueEntryRejected === true &&
      parallelBuilderMergeLaneDogfood.simultaneousMergesRejected === true &&
      parallelBuilderMergeLaneDogfood.missingPostMergeVerifyRejected === true &&
      parallelBuilderMergeLaneDogfood.mainFailedNoRepairRejected === true &&
      parallelBuilderMergeLaneDogfood.unmergedPileupRejected === true &&
      parallelBuilderMergeLaneDogfood.blockedConflictRejected === true &&
      parallelBuilderMergeLaneDogfood.blockedSafeAccepted === true &&
      packageJson.scripts?.['process:parallel-builder-merge-lane-enforcement-check'] === `node --env-file-if-exists=.env ${PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_SCRIPT_PATH}` &&
      await repoFileExists(PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_PLAN_PATH) &&
      await repoFileExists(PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_PROTOCOL_PATH) &&
      await repoFileExists(PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_APPROVAL_PATH) &&
      await repoFileExists(PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_CLOSEOUT_PATH) &&
      includesAll(parallelBuilderMergeLaneSource, [
        'buildParallelBuilderMergeLaneEnforcementDogfoodProof',
        'unmergedPileupRejected',
        'simultaneousMergesRejected',
        'blockedConflictRejected',
      ]) &&
      includesAll(foundationVerifySource, [PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_CARD_ID]),
    'PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001 blocks branch pileup and serializes parallel builder merges',
    parallelBuilderMergeLaneCard
      ? `lane=${parallelBuilderMergeLaneCard.lane} status=${parallelBuilderMergeLaneStatus.status} dogfood=${parallelBuilderMergeLaneDogfood.ok ? 'pass' : 'blocked'} activeMerges=${parallelBuilderMergeLaneStatus.summary.activeMergeCount}`
      : `missing ${PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_CARD_ID}`,
  )
  const verifyReadOnlyGateCard = (foundationHub.backlogItems || []).find(item => item.id === VERIFY_READONLY_GATE_CARD_ID) || null
  const verifyReadOnlyDogfoodProof = await buildVerifyReadOnlyGateDogfoodProof()
  const verifierLiveRepairFunctionToken = ['reset', 'Foundation', 'Db'].join('')
  const verifierRetryRepairHookToken = ['before', 'Retry'].join('')
  ensure(
    checks,
      verifyReadOnlyGateCard &&
      ['scoped', 'done'].includes(verifyReadOnlyGateCard.lane) &&
      verifyReadOnlyDogfoodProof.ok === true &&
      verifyReadOnlyDogfoodProof.legacyRepairThenPass?.wentGreenAfterRepair === true &&
      verifyReadOnlyDogfoodProof.readOnlyFailClosed?.failedClosed === true &&
      verifyReadOnlyDogfoodProof.readOnlyFailClosed?.repairCalls === 0 &&
      verifyReadOnlyDogfoodProof.repairHookRejected?.ok === true &&
      packageJson.scripts?.['process:runtime-safety-hardening-check'] === `node --env-file-if-exists=.env ${RUNTIME_SAFETY_HARDENING_SCRIPT_PATH}` &&
      foundationVerifySource.includes('buildFoundationVerifyRetryOptions') &&
      foundationVerifySource.includes('buildVerifyReadOnlyGateDogfoodProof') &&
      !foundationVerifySource.includes(verifierLiveRepairFunctionToken) &&
      !foundationVerifySource.includes(verifierRetryRepairHookToken) &&
      includesAll(foundationVerifySource, RUNTIME_SAFETY_HARDENING_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'VERIFY-READONLY-GATE-001 keeps foundation:verify read-only and proves repair-then-pass is blocked',
    verifyReadOnlyGateCard
      ? `lane=${verifyReadOnlyGateCard.lane} legacyRepair=${verifyReadOnlyDogfoodProof.legacyRepairThenPass?.wentGreenAfterRepair ? 'blocked-by-new-path' : 'missing'} failClosed=${verifyReadOnlyDogfoodProof.readOnlyFailClosed?.failedClosed ? 'yes' : 'no'} ${verifierLiveRepairFunctionToken}=absent`
      : 'missing VERIFY-READONLY-GATE-001',
  )
  const processCheckApplyBoundaryCard = (foundationHub.backlogItems || []).find(item => item.id === PROCESS_CHECK_APPLY_BOUNDARY_CARD_ID) || null
  const processCheckApplyBoundaryProof = await buildProcessCheckApplyBoundaryDogfoodProof()
  const processWriteGuardSource = await readRepoFile('lib/process-write-guard.js')
  const processCheckApplyBoundaryHighRiskScripts = await Promise.all([
    'scripts/process-source-maturity-grid-check.mjs',
    'scripts/process-connector-credential-check.mjs',
    'scripts/process-llm-auth-audit-check.mjs',
    'scripts/process-source-extraction-gap-followup-check.mjs',
  ].map(async scriptPath => ({ scriptPath, source: await readRepoFile(scriptPath) })))
  ensure(
    checks,
      processCheckApplyBoundaryCard &&
      ['scoped', 'done'].includes(processCheckApplyBoundaryCard.lane) &&
      processCheckApplyBoundaryProof.ok === true &&
      processCheckApplyBoundaryProof.blockedNoFlag?.ok === true &&
      processCheckApplyBoundaryProof.allowedApply?.ok === true &&
      processCheckApplyBoundaryProof.allowedCloseCard?.ok === true &&
      processCheckApplyBoundaryProof.blockedWrongFlag?.ok === true &&
      processCheckApplyBoundaryProof.reportAllowed?.ok === true &&
      processWriteGuardSource.includes('PROCESS_CHECK_WRITE_BLOCKED') &&
      processWriteGuardSource.includes('assertProcessCheckWriteAllowed') &&
      processCheckApplyBoundaryHighRiskScripts.every(item =>
        item.source.includes('assertProcessCheckWriteAllowed') &&
        item.source.includes('isProcessCheckWriteRequested'),
      ) &&
      includesAll(foundationVerifySource, RUNTIME_SAFETY_HARDENING_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'PROCESS-CHECK-APPLY-BOUNDARY-001 blocks no-flag process-check writes while allowing explicit apply posture',
    processCheckApplyBoundaryCard
      ? `lane=${processCheckApplyBoundaryCard.lane} noFlag=${processCheckApplyBoundaryProof.blockedNoFlag?.ok ? 'blocked' : 'missing'} apply=${processCheckApplyBoundaryProof.allowedApply?.ok ? 'allowed' : 'blocked'} highRisk=${processCheckApplyBoundaryHighRiskScripts.length}`
      : 'missing PROCESS-CHECK-APPLY-BOUNDARY-001',
  )
  const processCheckReadonlyModeCard = (foundationHub.backlogItems || []).find(item => item.id === PROCESS_CHECK_READONLY_MODE_CARD_ID) || null
  const processCheckReadonlyModeProof = await buildProcessCheckReadonlyModeProof({ repoRoot })
  const processCheckReadonlyModeModuleSource = await readRepoFile('lib/process-check-readonly-mode.js')
  const processCheckReadonlyModeScriptSource = await readRepoFile(PROCESS_CHECK_READONLY_MODE_SCRIPT_PATH)
  ensure(
    checks,
      processCheckReadonlyModeCard &&
      ['executing', 'done'].includes(processCheckReadonlyModeCard.lane) &&
      processCheckReadonlyModeProof.ok === true &&
      processCheckReadonlyModeProof.unguardedFixture?.protected === false &&
      processCheckReadonlyModeProof.guardedFixture?.protected === true &&
      processCheckReadonlyModeProof.noFlagBlocked?.code === 'PROCESS_CHECK_WRITE_BLOCKED' &&
      processCheckReadonlyModeProof.explicitAllowed?.ok === true &&
      processCheckReadonlyModeProof.scan?.ok === true &&
      processCheckReadonlyModeModuleSource.includes('PROCESS_CHECK_READONLY_LEGACY_CLASSIFICATIONS') &&
      processCheckReadonlyModeModuleSource.includes('buildProcessCheckReadonlyModeProof') &&
      foundationBacklogStoreSource.includes('assertCurrentProcessCheckWriteAllowed') &&
      packageJson.scripts?.['process:process-check-readonly-mode-check'] === `node --env-file-if-exists=.env ${PROCESS_CHECK_READONLY_MODE_SCRIPT_PATH}` &&
      processCheckReadonlyModeScriptSource.includes('scriptIsReadOnly') &&
      foundationVerifySource.includes('PROCESS_CHECK_READONLY_MODE_CLOSEOUT_KEY'),
    'PROCESS-CHECK-READONLY-MODE-001 sweeps legacy process checks and blocks unguarded live mutators',
    processCheckReadonlyModeCard
      ? `lane=${processCheckReadonlyModeCard.lane} scan=${processCheckReadonlyModeProof.scan?.ok ? 'clean' : 'dirty'} scripts=${processCheckReadonlyModeProof.scan?.scriptCount || 0}`
      : 'missing PROCESS-CHECK-READONLY-MODE-001',
  )
  const sprintCheckHistoricalModeCard = (foundationHub.backlogItems || []).find(item => item.id === SPRINT_CHECK_HISTORICAL_MODE_CARD_ID) || null
  const sprintCheckHistoricalModeProof = buildSyntheticSprintCheckHistoricalModeProof()
  const sprintCheckHistoricalModeModuleSource = await readRepoFile('lib/sprint-check-historical-mode.js')
  const sprintCheckHistoricalModeScriptSource = await readRepoFile(SPRINT_CHECK_HISTORICAL_MODE_SCRIPT_PATH)
  ensure(
    checks,
      sprintCheckHistoricalModeCard &&
      ['executing', 'done'].includes(sprintCheckHistoricalModeCard.lane) &&
      sprintCheckHistoricalModeProof.ok === true &&
      sprintCheckHistoricalModeProof.activeCurrent?.mode === 'active_current' &&
      sprintCheckHistoricalModeProof.historicalPass?.mode === 'historical_closeout' &&
      sprintCheckHistoricalModeProof.historicalNoCloseout?.ok === false &&
      sprintCheckHistoricalModeProof.scopedWithCloseout?.ok === false &&
      processCheckReadonlyProofIsHistoricalAware(processCheckReadonlyModeScriptSource) &&
      sprintCheckHistoricalModeModuleSource.includes('evaluateSprintCheckHistoricalMode') &&
      sprintCheckHistoricalModeModuleSource.includes('findVerifiedHistoricalCloseout') &&
      packageJson.scripts?.['process:sprint-check-historical-mode-check'] === `node --env-file-if-exists=.env ${SPRINT_CHECK_HISTORICAL_MODE_SCRIPT_PATH}` &&
      sprintCheckHistoricalModeScriptSource.includes('previousSprintMode') &&
      sprintCheckHistoricalModeScriptSource.includes('historical_closeout') &&
      foundationVerifySource.includes('SPRINT_CHECK_HISTORICAL_MODE_CLOSEOUT_KEY'),
    'SPRINT-CHECK-HISTORICAL-MODE-001 keeps focused sprint checks valid after verified closeout rollover',
    sprintCheckHistoricalModeCard
      ? `lane=${sprintCheckHistoricalModeCard.lane} active=${sprintCheckHistoricalModeProof.activeCurrent?.mode || 'missing'} historical=${sprintCheckHistoricalModeProof.historicalPass?.mode || 'missing'} readonlyAware=${processCheckReadonlyProofIsHistoricalAware(processCheckReadonlyModeScriptSource) ? 'yes' : 'no'}`
      : 'missing SPRINT-CHECK-HISTORICAL-MODE-001',
  )
  const liveTruthVerifyDecoupleCard = (foundationHub.backlogItems || []).find(item => item.id === LIVE_TRUTH_VERIFY_DECOUPLE_CARD_ID) || null
  const liveTruthVerifyDecoupleStatus = await buildLiveTruthVerifyDecoupleStatus({ repoRoot, baseUrl, skipEndpointFetch: true })
  ensure(
    checks,
      liveTruthVerifyDecoupleCard &&
      ['executing', 'done'].includes(liveTruthVerifyDecoupleCard.lane) &&
      liveTruthVerifyDecoupleStatus.status === 'healthy' &&
      liveTruthVerifyDecoupleStatus.currentSprintFindingCount === 0 &&
      liveTruthVerifyDecoupleStatus.baseline?.length >= 8 &&
      liveTruthVerifyDecoupleStatus.baseline.every(item => item.ok) &&
      liveTruthVerifyDecoupleStatus.synthetic?.ok === true &&
      packageJson.scripts?.['process:live-truth-verify-decouple-check'] === `node --env-file-if-exists=.env ${LIVE_TRUTH_VERIFY_DECOUPLE_SCRIPT_PATH}` &&
      foundationVerifySource.includes('buildLiveTruthVerifyDecoupleStatus'),
    'LIVE-TRUTH-VERIFY-DECOUPLE-001 decouples active live sprint truth from historical/bootstrap literals',
    liveTruthVerifyDecoupleCard
      ? `lane=${liveTruthVerifyDecoupleCard.lane} currentSprintFindings=${liveTruthVerifyDecoupleStatus.currentSprintFindingCount} baseline=${liveTruthVerifyDecoupleStatus.baseline?.filter(item => item.ok).length || 0}/8`
      : 'missing LIVE-TRUTH-VERIFY-DECOUPLE-001',
  )
  const activeVsHistoricalVerifierSplitCard = (foundationHub.backlogItems || []).find(item => item.id === ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_CARD_ID) || null
  const activeVsHistoricalVerifierSplitProof = buildActiveVsHistoricalVerifierSplitDogfoodProof()
  ensure(
    checks,
      activeVsHistoricalVerifierSplitCard &&
      ['executing', 'done'].includes(activeVsHistoricalVerifierSplitCard.lane) &&
      activeVsHistoricalVerifierSplitProof.ok === true &&
      activeVsHistoricalVerifierSplitProof.activePass?.mode === 'active_live_truth' &&
      activeVsHistoricalVerifierSplitProof.activeStaleWithCloseout?.ok === false &&
      activeVsHistoricalVerifierSplitProof.activeStaleWithCloseout?.mode === 'active_live_truth_mismatch' &&
      activeVsHistoricalVerifierSplitProof.activeStaleWithCloseout?.hasHistoricalCloseout === true &&
      activeVsHistoricalVerifierSplitProof.historicalPass?.mode === 'historical_closeout' &&
      activeVsHistoricalVerifierSplitProof.historicalMissingCloseout?.ok === false &&
      activeVsHistoricalVerifierSplitProof.historicalCardNotDone?.ok === false &&
      packageJson.scripts?.['process:active-vs-historical-verifier-split-check'] === `node --env-file-if-exists=.env ${ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_SCRIPT_PATH}` &&
      foundationVerifySource.includes('buildActiveVsHistoricalVerifierSplitDogfoodProof') &&
      foundationVerifySource.includes('ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_CLOSEOUT_KEY'),
    'ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001 separates active live-truth proof from historical closeout proof',
    activeVsHistoricalVerifierSplitCard
      ? `lane=${activeVsHistoricalVerifierSplitCard.lane} active=${activeVsHistoricalVerifierSplitProof.activeStaleWithCloseout?.mode || 'missing'} historical=${activeVsHistoricalVerifierSplitProof.historicalPass?.mode || 'missing'} closeout=${ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_CLOSEOUT_KEY}`
      : 'missing ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001',
  )
  const processCheckScheduledMutationGuardCard = (foundationHub.backlogItems || []).find(item => item.id === PROCESS_CHECK_SCHEDULED_MUTATION_GUARD_CARD_ID) || null
  const scheduledMutationGuardProof = buildScheduledMutationGuardDogfoodProof()
  const foundationJobs = getFoundationJobDefinitions()
  const verificationRunsJob = foundationJobs.find(job => job.key === 'verification-runs') || null
  const verificationRunsRuntime = verificationRunsJob ? getFoundationJobRuntime(verificationRunsJob, null, new Date('2026-05-13T12:00:00.000Z')) : null
  const scheduledProcessCheckRuntimes = foundationJobs
    .filter(job => job.runtimeMode === 'scheduled' && job.processCheck?.isProcessCheck)
    .map(job => ({ job, runtime: getFoundationJobRuntime(job, null, new Date('2026-05-13T12:00:00.000Z')) }))
  ensure(
    checks,
      processCheckScheduledMutationGuardCard &&
      ['scoped', 'done'].includes(processCheckScheduledMutationGuardCard.lane) &&
      scheduledMutationGuardProof.ok === true &&
      scheduledMutationGuardProof.scheduledMutatingCheck?.scheduleStatus === 'blocked' &&
      scheduledMutationGuardProof.scheduledUnknownCheck?.scheduleStatus === 'blocked' &&
      scheduledMutationGuardProof.scheduledReadOnlyCheck?.scheduleStatus !== 'blocked' &&
      scheduledMutationGuardProof.scheduledReportOnlyCheck?.scheduleStatus !== 'blocked' &&
      scheduledMutationGuardProof.manualMutatingCheck?.scheduleStatus === 'manual' &&
      verificationRunsJob?.mutationPosture === 'read_only' &&
      verificationRunsJob?.scheduleMutationGuard?.ok === true &&
      verificationRunsRuntime?.scheduleStatus !== 'blocked' &&
      scheduledProcessCheckRuntimes.every(({ job, runtime }) =>
        job.scheduleMutationGuard?.ok !== false || runtime.scheduleStatus === 'blocked',
      ) &&
      foundationJobsSource.includes('validateFoundationJobSchedulePosture') &&
      foundationJobsSource.includes('buildScheduledMutationGuardDogfoodProof') &&
      foundationJobsSource.includes('mutationPosture') &&
      foundationJobsSource.includes('historical closeout writeback now requires explicit --apply') &&
      foundationWorkerSource.includes("scheduleStatus !== 'blocked'") &&
      includesAll(foundationVerifySource, RUNTIME_SAFETY_HARDENING_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'PROCESS-CHECK-SCHEDULED-MUTATION-GUARD-001 blocks scheduled mutating process checks',
    processCheckScheduledMutationGuardCard
      ? `lane=${processCheckScheduledMutationGuardCard.lane} verification-runs=${verificationRunsRuntime?.scheduleStatus || 'missing'} scheduledChecks=${scheduledProcessCheckRuntimes.length}`
      : 'missing PROCESS-CHECK-SCHEDULED-MUTATION-GUARD-001',
  )
  const foundationJobMutationAllowlistCard = (foundationHub.backlogItems || []).find(item => item.id === FOUNDATION_JOB_MUTATION_ALLOWLIST_CARD_ID) || null
  const foundationJobMutationAllowlistReport = buildFoundationJobMutationAllowlistReport({ jobs: foundationJobs })
  const foundationJobMutationAllowlistDogfood = buildFoundationJobMutationAllowlistDogfoodProof()
  ensure(
    checks,
      foundationJobMutationAllowlistCard &&
      ['executing', 'done'].includes(foundationJobMutationAllowlistCard.lane) &&
      foundationJobMutationAllowlistReport.ok === true &&
      foundationJobMutationAllowlistReport.scheduledCount >= 20 &&
      foundationJobMutationAllowlistReport.missingCount === 0 &&
      foundationJobMutationAllowlistReport.mismatchCount === 0 &&
      foundationJobMutationAllowlistReport.allowedCount >= 20 &&
      foundationJobMutationAllowlistReport.rows.some(row => row.key === 'verification-runs' && row.allowlistStatus === 'allowed_scheduled_read_only') &&
      foundationJobMutationAllowlistDogfood.ok === true &&
      foundationJobMutationAllowlistDogfood.scheduledMissing?.status === 'missing_allowlist' &&
      foundationJobMutationAllowlistDogfood.scheduledMismatch?.status === 'posture_mismatch' &&
      packageJson.scripts?.['process:foundation-job-mutation-allowlist-check'] === `node --env-file-if-exists=.env ${FOUNDATION_JOB_MUTATION_ALLOWLIST_SCRIPT_PATH}` &&
      foundationJobsSource.includes('evaluateFoundationJobMutationAllowlist') &&
      foundationVerifySource.includes('buildFoundationJobMutationAllowlistReport'),
    'FOUNDATION-JOB-MUTATION-ALLOWLIST-001 requires explicit scheduled job mutation posture',
    foundationJobMutationAllowlistCard
      ? `lane=${foundationJobMutationAllowlistCard.lane} scheduled=${foundationJobMutationAllowlistReport.scheduledCount} allowed=${foundationJobMutationAllowlistReport.allowedCount} blocked=${foundationJobMutationAllowlistReport.blockedCount}`
      : `missing ${FOUNDATION_JOB_MUTATION_ALLOWLIST_CARD_ID}`,
  )
  const foundationDbInitSeedSplitCard = (foundationHub.backlogItems || []).find(item => item.id === FOUNDATION_DB_INIT_SEED_SPLIT_CARD_ID) || null
  const foundationDbInitSeedSplitProof = await buildFoundationDbInitSeedSplitDogfoodProof()
  ensure(
    checks,
      foundationDbInitSeedSplitCard &&
      ['scoped', 'done'].includes(foundationDbInitSeedSplitCard.lane) &&
      foundationDbInitSeedSplitProof.ok === true &&
      foundationDbInitSeedSplitProof.schemaInitFunction === 'initFoundationDb' &&
      foundationDbInitSeedSplitProof.explicitBootstrapFunction === 'bootstrapFoundationDb' &&
      (foundationDbInitSeedSplitProof.changedTables || []).length === 0 &&
      (foundationDbInitSeedSplitProof.watchedTables || []).includes('backlog_items') &&
      (foundationDbInitSeedSplitProof.watchedTables || []).includes('foundation_sprints') &&
      (foundationDbInitSeedSplitProof.watchedTables || []).includes('foundation_sprint_items') &&
      foundationDbSource.includes('export const bootstrapFoundationDb = foundationDbSchemaSeedStore.bootstrapFoundationDb') &&
      foundationDbSchemaSeedStoreSource.includes('async function bootstrapFoundationDb') &&
      foundationDbSchemaSeedStoreSource.includes('includeBootstrapSeed') &&
      foundationDbSource.includes('buildFoundationDbInitSeedSplitDogfoodProof') &&
      packageJson.scripts?.['foundation:db-bootstrap'] === 'node --env-file-if-exists=.env scripts/bootstrap-foundation-db.mjs --apply' &&
      includesAll(foundationVerifySource, RUNTIME_SAFETY_HARDENING_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'FOUNDATION-DB-INIT-SEED-SPLIT-001 keeps schema init separate from seed/repair writes',
    foundationDbInitSeedSplitCard
      ? `lane=${foundationDbInitSeedSplitCard.lane} changedTables=${(foundationDbInitSeedSplitProof.changedTables || []).length} watched=${(foundationDbInitSeedSplitProof.watchedTables || []).length}`
      : `missing ${FOUNDATION_DB_INIT_SEED_SPLIT_CARD_ID}`,
  )
  const dbSeedCard = (foundationHub.backlogItems || []).find(item => item.id === DB_SEED_CARD_ID) || null
  const dbSeedDogfood = buildDbSeedGovernanceDogfoodProof()
  const dbSeedSplitEvaluation = evaluateDbSeedModuleSplit({
    foundationDbSource,
    backlogSeedSource: foundationBacklogSeedSource,
  })
  ensure(
    checks,
      dbSeedCard &&
      ['executing', 'done'].includes(dbSeedCard.lane) &&
      dbSeedDogfood.ok === true &&
      dbSeedDogfood.mutableDrift?.status === 'live_mutable_drift_report_only' &&
      dbSeedDogfood.mutableDrift?.wouldWriteByDefault === false &&
      dbSeedDogfood.missingLive?.status === 'bootstrap_candidate' &&
      dbSeedDogfood.missingLive?.wouldWriteByDefault === false &&
      dbSeedDogfood.report?.defaultMutationPosture === 'report_only' &&
      dbSeedSplitEvaluation.ok === true &&
      packageJson.scripts?.['process:db-seed-check'] === `node --env-file-if-exists=.env ${DB_SEED_SCRIPT_PATH}` &&
      foundationVerifySource.includes('buildDbSeedGovernanceDogfoodProof') &&
      foundationVerifySource.includes('DB_SEED_CLOSEOUT_KEY'),
    'DB-SEED-001 splits backlog seed truth from live DB migrations',
    dbSeedCard
      ? `lane=${dbSeedCard.lane} splitLines=${dbSeedSplitEvaluation.foundationDbLineCount} mutable=${dbSeedDogfood.mutableDrift?.status || 'missing'} closeout=${DB_SEED_CLOSEOUT_KEY}`
      : `missing ${DB_SEED_CARD_ID}`,
  )
  const kpiHealthApiCacheCard = (foundationHub.backlogItems || []).find(item => item.id === KPI_HEALTH_API_CACHE_CARD_ID) || null
  const kpiHealthApiCacheCloseout = findBuildLogCloseoutEntry(KPI_HEALTH_API_CACHE_CARD_ID, KPI_HEALTH_API_CACHE_CLOSEOUT_KEY)
  const kpiHealthApiCacheDogfood = await buildKpiHealthApiCacheDogfoodProof()
  const sourceTruthKpiCacheStatus = sourceTruthKpiHealth.routeCache?.cacheStatus || null
  const foundationHubKpiCacheStatus = foundationHubKpiHealth.routeCache?.cacheStatus || null
  const acceptedKpiRouteCacheStatuses = ['memory', 'persisted', 'refreshed']
  ensure(
    checks,
      kpiHealthApiCacheCard &&
      ['executing', 'done'].includes(kpiHealthApiCacheCard.lane) &&
      (kpiHealthApiCacheCard.lane !== 'done' || Boolean(kpiHealthApiCacheCloseout)) &&
      kpiHealthApiCacheDogfood.ok === true &&
      kpiHealthApiCacheDogfood.timeout?.abortObserved === true &&
      Number.isFinite(Number(KPI_HEALTH_FETCH_TIMEOUT_MS)) &&
      KPI_HEALTH_FETCH_TIMEOUT_MS >= 1000 &&
      acceptedKpiRouteCacheStatuses.includes(sourceTruthKpiCacheStatus) &&
      acceptedKpiRouteCacheStatuses.includes(foundationHubKpiCacheStatus) &&
      packageJson.scripts?.['process:kpi-health-api-cache-check'] === `node --env-file-if-exists=.env ${KPI_HEALTH_API_CACHE_SCRIPT_PATH}` &&
      includesAll(kpiHealthSource, [
        'AbortController',
        'KPI_HEALTH_FETCH_TIMEOUT_MS',
        'buildKpiHealthApiCacheDogfoodProof',
        'getCachedSafeKpiHealthSnapshot',
      ]) &&
      sourceOfTruthPayloadSource.includes('getCachedSafeKpiHealthSnapshot') &&
      hubReadRoutesSource.includes('getCachedSafeKpiHealthSnapshot') &&
      foundationVerifySource.includes('buildKpiHealthApiCacheDogfoodProof') &&
      foundationVerifySource.includes('KPI_HEALTH_API_CACHE_CLOSEOUT_KEY'),
    'KPI-HEALTH-API-CACHE-001 bounds KPI health probes and keeps request paths cached/degraded',
    kpiHealthApiCacheCard
      ? `lane=${kpiHealthApiCacheCard.lane} timeout=${KPI_HEALTH_FETCH_TIMEOUT_MS}ms sourceCache=${sourceTruthKpiCacheStatus || 'missing'} hubCache=${foundationHubKpiCacheStatus || 'missing'} closeout=${kpiHealthApiCacheCloseout?.key || kpiHealthApiCacheCloseout?.closeoutKey || 'pending'}`
      : `missing ${KPI_HEALTH_API_CACHE_CARD_ID}`,
  )
  const currentSprintMutationGuardsCard = (foundationHub.backlogItems || []).find(item => item.id === CURRENT_SPRINT_MUTATION_GUARDS_CARD_ID) || null
  const currentSprintMutationGuardsProof = await buildCurrentSprintMutationGuardsDogfoodProof()
  ensure(
    checks,
      currentSprintMutationGuardsCard &&
      ['scoped', 'done'].includes(currentSprintMutationGuardsCard.lane) &&
      currentSprintMutationGuardsProof.ok === true &&
      currentSprintMutationGuardsProof.unsafeNoApply?.blocked === true &&
      currentSprintMutationGuardsProof.missingExpectedPreviousActiveSprintId?.blocked === true &&
      currentSprintMutationGuardsProof.missingAllowItemReplacement?.blocked === true &&
      currentSprintMutationGuardsProof.explicitAllowed?.ok === true &&
      currentSprintMutationGuardsProof.explicitAllowed?.itemDiff?.changedCount >= 2 &&
      currentSprintMutationGuardsProof.syntheticRollback?.active_sprint_restored === true &&
      currentSprintMutationGuardsProof.syntheticRollback?.existing_item_restored === true &&
      currentSprintMutationGuardsProof.syntheticRollback?.replacement_card_exists === false &&
      `${foundationDbSource}\n${currentSprintStoreSource}`.includes('FoundationCurrentSprintMutationGuardError') &&
      currentSprintStoreSource.includes('expectedPreviousActiveSprintId') &&
      currentSprintStoreSource.includes('allowItemReplacement') &&
      `${foundationDbSource}\n${currentSprintStoreSource}`.includes('buildCurrentSprintMutationGuardsDogfoodProof') &&
      includesAll(foundationVerifySource, RUNTIME_SAFETY_HARDENING_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'CURRENT-SPRINT-MUTATION-GUARDS-001 blocks unsafe Current Sprint overlay mutation',
    currentSprintMutationGuardsCard
      ? `lane=${currentSprintMutationGuardsCard.lane} blocked=${currentSprintMutationGuardsProof.unsafeNoApply?.blocked ? 'yes' : 'no'} diff=${currentSprintMutationGuardsProof.explicitAllowed?.itemDiff?.changedCount || 0}`
      : `missing ${CURRENT_SPRINT_MUTATION_GUARDS_CARD_ID}`,
  )
  const foundationDbStoreSplitCard = (foundationHub.backlogItems || []).find(item => item.id === FOUNDATION_DB_STORE_SPLIT_CARD_ID) || null
  const foundationDbStoreSplitEvaluation = evaluateFoundationCurrentSprintStoreSplit({
    foundationDbSource,
    currentSprintStoreSource,
  })
  const foundationDbStoreSplitSyntheticProof = buildSyntheticFoundationCurrentSprintStoreSplitProof()
  ensure(
    checks,
      foundationDbStoreSplitCard &&
      ['scoped', 'done'].includes(foundationDbStoreSplitCard.lane) &&
      foundationDbStoreSplitEvaluation.ok === true &&
      foundationDbStoreSplitSyntheticProof.ok === true &&
      packageJson.scripts?.['process:foundation-db-store-split-check'] === `node --env-file-if-exists=.env ${FOUNDATION_DB_STORE_SPLIT_SCRIPT_PATH}` &&
      currentSprintStoreSource.includes(FOUNDATION_DB_STORE_SPLIT_CLOSEOUT_KEY),
    'FOUNDATION-DB-STORE-SPLIT-001 splits Current Sprint store out of foundation-db.js',
    foundationDbStoreSplitCard
      ? `lane=${foundationDbStoreSplitCard.lane} lines=${foundationDbStoreSplitEvaluation.foundationDbLineCount} proof=${foundationDbStoreSplitSyntheticProof.ok ? 'ok' : 'blocked'}`
      : `missing ${FOUNDATION_DB_STORE_SPLIT_CARD_ID}`,
  )
  const backlogStoreConcurrencySource = await readRepoFile('lib/backlog-store-concurrency.js')
  const backlogStoreConcurrencyCard = (foundationHub.backlogItems || []).find(item => item.id === BACKLOG_STORE_CONCURRENCY_CARD_ID) || null
  const backlogStoreConcurrencyProof = await buildBacklogStoreConcurrencyDogfoodProof()
  ensure(
    checks,
      backlogStoreConcurrencyCard &&
      ['scoped', 'done'].includes(backlogStoreConcurrencyCard.lane) &&
      backlogStoreConcurrencyProof.ok === true &&
      backlogStoreConcurrencyProof.legacyLostUpdate?.lostWriterAUpdate === true &&
      backlogStoreConcurrencyProof.safeConcurrentWriters?.preservedWriterAUpdate === true &&
      backlogStoreConcurrencyProof.safeConcurrentWriters?.preservedWriterBUpdate === true &&
      backlogStoreConcurrencyProof.safeConcurrentWriters?.writerBReadSawWriterACommit === true &&
      backlogStoreConcurrencyProof.changeEventProof?.hasFullBeforeAfter === true &&
      foundationBacklogStoreSource.includes('SELECT * FROM backlog_items WHERE id = $1 FOR UPDATE') &&
      foundationBacklogStoreSource.includes('changedFields') &&
      backlogStoreConcurrencySource.includes('buildBacklogStoreConcurrencyDogfoodProof') &&
      backlogStoreConcurrencySource.includes('legacyUnsafeBacklogMergeWrite') &&
      backlogStoreConcurrencySource.includes('bcrew_ai_os_dogfood_') &&
      includesAll(foundationVerifySource, RUNTIME_SAFETY_HARDENING_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'BACKLOG-STORE-CONCURRENCY-001 prevents silent backlog lost updates',
    backlogStoreConcurrencyCard
      ? `lane=${backlogStoreConcurrencyCard.lane} legacyLost=${backlogStoreConcurrencyProof.legacyLostUpdate?.lostWriterAUpdate ? 'yes' : 'no'} final=${backlogStoreConcurrencyProof.safeConcurrentWriters?.finalSummary || 'missing'}/${backlogStoreConcurrencyProof.safeConcurrentWriters?.finalStatusNote || 'missing'}`
      : `missing ${BACKLOG_STORE_CONCURRENCY_CARD_ID}`,
  )

  return checks
}

export async function evaluateFoundationProcessHardeningVerifierOrchestration(input = {}) {
  const {
    activeFoundationSprint = { sprint: null, items: [] },
    currentPlan = '',
    currentState = '',
    foundationBuildCloseouts = [],
    foundationProcessHardeningVerifierSource = '',
    foundationVerifyProcessHardeningRunnerSource = '',
    foundationVerifyRootSource = '',
    packageJson = {},
    repoFileExists = async () => false,
  } = input
  const checks = []
  const processHardeningVerifierChecks = await evaluateFoundationProcessHardeningVerifierChecks(input)
  checks.push(...processHardeningVerifierChecks)
  const processHardeningDogfood = buildFoundationProcessHardeningVerifierDogfoodProof()
  const backlogItems = input.foundationHub?.backlogItems || []
  const item = id => backlogItems.find(backlogItem => backlogItem.id === id) || null
  const activeSprintItem = id =>
    (activeFoundationSprint.items || [])
      .map(sprintItem => sprintItem.backlog)
      .find(backlogItem => backlogItem?.id === id) || null
  const foundationVerifyLineCount = String(foundationVerifyRootSource || '').split('\n').length
  const verifierProcessHardeningSplitModuleCard =
    item(VERIFIER_PROCESS_HARDENING_SPLIT_MODULE_CARD_ID) ||
    activeSprintItem(VERIFIER_PROCESS_HARDENING_SPLIT_MODULE_CARD_ID)
  const verifierProcessHardeningSplitModuleCloseout =
    foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_PROCESS_HARDENING_SPLIT_MODULE_CLOSEOUT_KEY) || null
  const verifierProcessHardeningSplitModuleClosed = verifierProcessHardeningSplitModuleCard?.lane === 'done'
  const verifyReadonlyGateOldInlineMessage = 'VERIFY-READONLY-GATE-001 keeps foundation:verify ' + 'read-only'
  const backlogConcurrencyOldInlineMessage = 'BACKLOG-STORE-CONCURRENCY-001 prevents silent backlog lost ' + 'updates'
  const processHardeningOldInlinePatterns = [
    new RegExp(`ensure\\(\\s*checks,[\\s\\S]{0,1400}'${verifyReadonlyGateOldInlineMessage}`),
    new RegExp(`ensure\\(\\s*checks,[\\s\\S]{0,1400}'${backlogConcurrencyOldInlineMessage}'`),
  ]
  const processHardeningRootDelegates =
    foundationVerifyRootSource.includes('evaluateFoundationProcessHardeningVerifierOrchestration({') ||
    (
      foundationVerifyRootSource.includes('runFoundationVerifyProcessHardeningVerifier({') &&
      foundationVerifyProcessHardeningRunnerSource.includes('evaluateFoundationProcessHardeningVerifierOrchestration({')
    )

  ensure(
    checks,
    verifierProcessHardeningSplitModuleCard &&
      ['executing', 'done'].includes(verifierProcessHardeningSplitModuleCard.lane) &&
      (!verifierProcessHardeningSplitModuleClosed || (
        String(verifierProcessHardeningSplitModuleCard.statusNote || '').includes(VERIFIER_PROCESS_HARDENING_SPLIT_MODULE_CLOSEOUT_KEY) &&
        verifierProcessHardeningSplitModuleCloseout?.operatorCloseout === true &&
        (verifierProcessHardeningSplitModuleCloseout.backlogIds || []).includes(VERIFIER_PROCESS_HARDENING_SPLIT_MODULE_CARD_ID) &&
        await repoFileExists('docs/handoffs/2026-05-16-verifier-process-hardening-split-module-closeout.md')
      )) &&
      processHardeningDogfood.ok === true &&
      processHardeningVerifierChecks.every(check => check.ok) &&
      packageJson.scripts?.['process:verifier-process-hardening-split-module-check'] === `node --env-file-if-exists=.env ${VERIFIER_PROCESS_HARDENING_SPLIT_MODULE_SCRIPT_PATH}` &&
      await repoFileExists(VERIFIER_PROCESS_HARDENING_SPLIT_MODULE_PLAN_PATH) &&
      await repoFileExists(VERIFIER_PROCESS_HARDENING_SPLIT_MODULE_APPROVAL_PATH) &&
      foundationProcessHardeningVerifierSource.includes('evaluateFoundationProcessHardeningVerifierChecks') &&
      foundationProcessHardeningVerifierSource.includes('buildFoundationProcessHardeningVerifierDogfoodProof') &&
      processHardeningRootDelegates &&
      foundationVerifyRootSource.includes('processHardeningOrchestrationVerifier.checks') &&
      processHardeningOldInlinePatterns.every(pattern => !pattern.test(foundationVerifyRootSource)) &&
      currentPlan.includes(VERIFIER_PROCESS_HARDENING_SPLIT_MODULE_CLOSEOUT_KEY) &&
      currentState.includes(VERIFIER_PROCESS_HARDENING_SPLIT_MODULE_CLOSEOUT_KEY) &&
      (activeFoundationSprint.sprint?.sprintId === VERIFIER_PROCESS_HARDENING_SPLIT_MODULE_SPRINT_ID || verifierProcessHardeningSplitModuleClosed) &&
      foundationProcessHardeningVerifierSource.includes(VERIFIER_PROCESS_HARDENING_SPLIT_MODULE_CARD_ID),
    'VERIFIER-PROCESS-HARDENING-SPLIT-MODULE-001 extracts process-hardening verifier checks into a focused module',
    verifierProcessHardeningSplitModuleCard
      ? `lane=${verifierProcessHardeningSplitModuleCard.lane} dogfood=${processHardeningDogfood.ok ? 'pass' : 'blocked'} processChecks=${processHardeningVerifierChecks.filter(check => check.ok).length}/${processHardeningVerifierChecks.length} lines=${VERIFIER_PROCESS_HARDENING_SPLIT_MODULE_BEFORE_LINES}->${foundationVerifyLineCount}`
      : `missing ${VERIFIER_PROCESS_HARDENING_SPLIT_MODULE_CARD_ID}`,
  )

  const verifierProcessHardeningOrchestrationCard =
    item(VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_CARD_ID) ||
    activeSprintItem(VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_CARD_ID)
  const verifierProcessHardeningOrchestrationCloseout =
    foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_CLOSEOUT_KEY) || null
  const processHardeningOrchestrationOldRootPatterns = [
    'for (const processHardeningCheck of processHardeningVerifierChecks)',
    'const processHardeningDogfood = buildFoundationProcessHardeningVerifierDogfoodProof()',
    'const verifierProcessHardeningSplitModuleCard =',
    'const processHardeningVerifierChecks = await evaluateFoundationProcessHardeningVerifierChecks({',
  ]
  ensure(
    checks,
    verifierProcessHardeningOrchestrationCard &&
      ['executing', 'done'].includes(verifierProcessHardeningOrchestrationCard.lane) &&
      String(verifierProcessHardeningOrchestrationCard.statusNote || '').includes(VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_CLOSEOUT_KEY) &&
      verifierProcessHardeningOrchestrationCloseout?.operatorCloseout === true &&
      (verifierProcessHardeningOrchestrationCloseout.backlogIds || []).includes(VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_CARD_ID) &&
      processHardeningDogfood.ok === true &&
      processHardeningVerifierChecks.every(check => check.ok) &&
      packageJson.scripts?.['process:verifier-process-hardening-orchestration-split-check'] === `node --env-file-if-exists=.env ${VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_PLAN_PATH) &&
      await repoFileExists(VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_APPROVAL_PATH) &&
      await repoFileExists(VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_HANDOFF_PATH) &&
      foundationProcessHardeningVerifierSource.includes('evaluateFoundationProcessHardeningVerifierOrchestration') &&
      processHardeningRootDelegates &&
      foundationVerifyRootSource.includes('processHardeningOrchestrationVerifier.checks') &&
      processHardeningOrchestrationOldRootPatterns.every(pattern => !foundationVerifyRootSource.includes(pattern)) &&
      foundationVerifyLineCount < VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_BEFORE_LINES,
    'VERIFIER-PROCESS-HARDENING-ORCHESTRATION-SPLIT-001 moves process-hardening orchestration into the focused module',
    verifierProcessHardeningOrchestrationCard
      ? `lane=${verifierProcessHardeningOrchestrationCard.lane} dogfood=${processHardeningDogfood.ok ? 'pass' : 'blocked'} processChecks=${processHardeningVerifierChecks.filter(check => check.ok).length}/${processHardeningVerifierChecks.length} lines=${VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_BEFORE_LINES}->${foundationVerifyLineCount}`
      : `missing ${VERIFIER_PROCESS_HARDENING_ORCHESTRATION_SPLIT_CARD_ID}`,
  )

  return {
    checks,
    processHardeningVerifierChecks,
    dogfood: processHardeningDogfood,
  }
}
