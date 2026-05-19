import { PLAN_CRITIC_MIN_PASS_SCORE } from './process-plan-critic.js'
import { SOURCE_LIFECYCLE_REQUIRED_TARGET_COUNT } from './source-lifecycle.js'
import {
  SOURCE_LIFECYCLE_ACCEPTED_BLOCKED_SOURCE_IDS,
  SOURCE_LIFECYCLE_COMPLETION_CARD_ID,
  SOURCE_LIFECYCLE_COMPLETION_CLOSEOUT_KEY,
  SOURCE_LIFECYCLE_COMPLETION_PLAN_PATH,
  SOURCE_LIFECYCLE_COMPLETION_SUMMARY_MARKER,
  SOURCE_LIFECYCLE_LOAD_BEARING_SOURCE_IDS,
} from './source-lifecycle-completion.js'
import {
  SOURCE_LIFECYCLE_DYNAMIC_COUNTS_CARD_ID,
  SOURCE_LIFECYCLE_DYNAMIC_COUNTS_CLOSEOUT_KEY,
  SOURCE_LIFECYCLE_DYNAMIC_COUNTS_PLAN_PATH,
  SOURCE_LIFECYCLE_DYNAMIC_COUNTS_SCRIPT_PATH,
  SOURCE_LIFECYCLE_DYNAMIC_COUNTS_SPRINT_ID,
  buildSourceLifecycleDynamicCountsDogfoodProof,
} from './source-lifecycle-dynamic-counts.js'
import {
  SYNTHESIS_VERIFY_CARD_ID,
  SYNTHESIS_VERIFY_CLOSEOUT_KEY,
  SYNTHESIS_VERIFY_PLAN_PATH,
  SYNTHESIS_VERIFY_SUMMARY_MARKER,
} from './synthesis-claim-verification.js'
import {
  EXTRACT_RUN_HARDENING_CARD_ID,
  EXTRACT_RUN_HARDENING_CLOSEOUT_KEY,
  EXTRACT_RUN_HARDENING_PLAN_PATH,
  EXTRACT_RUN_HARDENING_SUMMARY_MARKER,
} from './extraction-run-hardening.js'
import {
  DRIVE_ACCESS_REQUEST_CARD_ID,
  DRIVE_ACCESS_REQUEST_CLOSEOUT_KEY,
  DRIVE_ACCESS_REQUEST_PLAN_PATH,
  DRIVE_ACCESS_REQUEST_SUMMARY_MARKER,
} from './drive-access-preflight.js'
import {
  MEETING_VAULT_ACL_CARD_ID,
  MEETING_VAULT_ACL_SUMMARY_MARKER,
  MEETING_VAULT_POLICY_VERSION,
} from './meeting-vault-acl.js'
import {
  MEETING_VAULT_AUTO_ENFORCEMENT_CARD_ID,
  MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY,
  MEETING_VAULT_AUTO_ENFORCEMENT_PLAN_PATH,
  MEETING_VAULT_AUTO_ENFORCEMENT_SUMMARY_MARKER,
} from './meeting-vault-auto-enforcement.js'
import { FOUNDATION_DONE_TEST_CARD_ID } from './foundation-readiness-gates.js'

export const VERIFIER_READINESS_BLOCKER_CLOSEOUT_SPLIT_CARD_ID = 'VERIFIER-READINESS-BLOCKER-CLOSEOUT-SPLIT-001'
export const VERIFIER_READINESS_BLOCKER_CLOSEOUT_SPLIT_CLOSEOUT_KEY = 'verifier-readiness-blocker-closeout-split-v1'
export const VERIFIER_READINESS_BLOCKER_CLOSEOUT_SPLIT_PLAN_PATH = 'docs/process/verifier-readiness-blocker-closeout-split-001-plan.md'
export const VERIFIER_READINESS_BLOCKER_CLOSEOUT_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-READINESS-BLOCKER-CLOSEOUT-SPLIT-001.json'
export const VERIFIER_READINESS_BLOCKER_CLOSEOUT_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-readiness-blocker-closeout-split-check.mjs'
export const VERIFIER_READINESS_BLOCKER_CLOSEOUT_SPLIT_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-verifier-readiness-blocker-closeout-split-closeout.md'
export const VERIFIER_READINESS_BLOCKER_CLOSEOUT_SPLIT_BEFORE_LINES = 10618

const SOURCE_LIFECYCLE_COMPLETION_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'SOURCE-LIFECYCLE-COMPLETION-001',
]

const SYNTHESIS_VERIFY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'SYNTHESIS-VERIFY-001',
]

const DRIVE_ACCESS_REQUEST_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'DRIVE-ACCESS-REQUEST-001',
]

const MEETING_VAULT_AUTO_ENFORCEMENT_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'MEETING-VAULT-AUTO-ENFORCEMENT-001',
  'MEETING-VAULT-ACL-001',
]

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function includesAll(text = '', patterns = []) {
  return patterns.every(pattern => String(text || '').includes(pattern))
}

function evaluateReadinessBlockerCloseoutFixture(fixture = {}) {
  const findings = []
  if (fixture.sourceLifecycleCompletionClosed !== true) findings.push('source_lifecycle_completion_hidden_failure')
  if (fixture.synthesisVerificationClosed !== true) findings.push('synthesis_verification_hidden_failure')
  if (fixture.extractionHardeningClosed !== true) findings.push('extraction_hardening_hidden_failure')
  if (fixture.driveAndMeetingVaultClosed !== true) findings.push('drive_meeting_vault_hidden_failure')
  if (fixture.oldInlinePredicatesRemoved !== true) findings.push('old_readiness_blocker_inline_predicates_present')
  return { ok: findings.length === 0, findings }
}

export function buildFoundationVerifierReadinessBlockerCloseoutDogfoodProof() {
  const healthy = evaluateReadinessBlockerCloseoutFixture({
    sourceLifecycleCompletionClosed: true,
    synthesisVerificationClosed: true,
    extractionHardeningClosed: true,
    driveAndMeetingVaultClosed: true,
    oldInlinePredicatesRemoved: true,
  })
  const rejected = {
    hiddenSourceLifecycleCompletion: evaluateReadinessBlockerCloseoutFixture({
      sourceLifecycleCompletionClosed: false,
      synthesisVerificationClosed: true,
      extractionHardeningClosed: true,
      driveAndMeetingVaultClosed: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenSynthesisVerification: evaluateReadinessBlockerCloseoutFixture({
      sourceLifecycleCompletionClosed: true,
      synthesisVerificationClosed: false,
      extractionHardeningClosed: true,
      driveAndMeetingVaultClosed: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenExtractionHardening: evaluateReadinessBlockerCloseoutFixture({
      sourceLifecycleCompletionClosed: true,
      synthesisVerificationClosed: true,
      extractionHardeningClosed: false,
      driveAndMeetingVaultClosed: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenDriveMeetingVaultCloseout: evaluateReadinessBlockerCloseoutFixture({
      sourceLifecycleCompletionClosed: true,
      synthesisVerificationClosed: true,
      extractionHardeningClosed: true,
      driveAndMeetingVaultClosed: false,
      oldInlinePredicatesRemoved: true,
    }),
    oldInlinePredicate: evaluateReadinessBlockerCloseoutFixture({
      sourceLifecycleCompletionClosed: true,
      synthesisVerificationClosed: true,
      extractionHardeningClosed: true,
      driveAndMeetingVaultClosed: true,
      oldInlinePredicatesRemoved: false,
    }),
  }
  const ok = healthy.ok && Object.values(rejected).every(result => result.ok === false)
  return {
    ok,
    healthy,
    rejected,
    dogfoodInvariant: ok
      ? 'healthy readiness blocker closeout fixture passes; hidden source/synthesis/extraction/Drive/Meeting Vault and old-inline failures fail closed'
      : 'readiness blocker closeout dogfood did not reject every known failure fixture',
  }
}

export async function evaluateFoundationVerifierReadinessBlockerCloseout(input = {}) {
  const {
    activeFoundationSprint,
    buildLogDriveAccessRequestBuild,
    buildLogExtractRunHardeningBuild,
    buildLogMeetingVaultAutoEnforcementBuild,
    buildLogSourceLifecycleCompletionBuild,
    buildLogSynthesisVerifyBuild,
    currentPlan,
    currentSprintItemsById,
    currentState,
    driveAccessPreflightSource,
    driveAccessRequest,
    driveAccessRequestApproval,
    driveAccessRequestApprovalValidation,
    driveAccessRequestDocSource,
    driveAccessRequestPlanSource,
    driveAccessRequestScriptSource,
    driveMeetingVaultStoreOwnershipSource,
    extractRunHardening,
    extractRunHardeningApproval,
    extractRunHardeningApprovalValidation,
    extractRunHardeningDocSource,
    extractRunHardeningPlanSource,
    extractRunHardeningScriptSource,
    extractRunHardeningSource,
    extractionTargetSource,
    foundationBuildCloseouts,
    foundationDoneTestReadinessStatus,
    foundationDoneTestRegistrySource,
    foundationFrontendSource,
    foundationHub,
    foundationVerifySource,
    foundationWorkerSource,
    intelligenceActionRouterSource,
    intelligenceSynthesisSource,
    latestDriveAccessPreflightRun,
    latestMeetingVaultAclAudit,
    latestMeetingVaultAutoEnforcementRun,
    meetingVaultAcl,
    meetingVaultAclDocSource,
    meetingVaultAclScriptSource,
    meetingVaultAclSource,
    meetingVaultAutoEnforcement,
    meetingVaultAutoEnforcementApproval,
    meetingVaultAutoEnforcementApprovalValidation,
    meetingVaultAutoEnforcementClosed,
    meetingVaultAutoEnforcementDocSource,
    meetingVaultAutoEnforcementPlanSource,
    meetingVaultAutoEnforcementScriptSource,
    meetingVaultAutoEnforcementSource,
    meetingVaultNoDuplicateGoogleDocProof,
    mirrorMeetingArchiveToDriveSource,
    packageJson,
    repoFileExists = async () => false,
    serverRouteSource,
    sourceCrawlStoreOwnershipSource,
    sourceLifecycleCompletion,
    sourceLifecycleCompletionApproval,
    sourceLifecycleCompletionApprovalValidation,
    sourceLifecycleCompletionDocSource,
    sourceLifecycleCompletionPlanSource,
    sourceLifecycleCompletionRegistrySource,
    sourceLifecycleCompletionScriptSource,
    sourceLifecycleCompletionStatus,
    sourceLifecycleDynamicCounts,
    sourceLifecycleDynamicCountsApproval,
    sourceLifecycleDynamicCountsApprovalValidation,
    sourceLifecycleDynamicCountsPlanSource,
    sourceLifecycleDynamicCountsScriptSource,
    sourceLifecycleDynamicCountsSource,
    syncMeetingNotesArchiveSource,
    synthesisVerify,
    synthesisVerifyApproval,
    synthesisVerifyApprovalValidation,
    synthesisVerifyDocSource,
    synthesisVerifyPlanSource,
    synthesisVerifyRegistrySource,
    synthesisVerifyScriptSource,
    syntheticDriveAccessPreflight,
    syntheticMeetingVaultAcl,
    syntheticMeetingVaultAutoEnforcement,
  } = input
  const checks = []

  const sourceLifecycleCompletionBuildLogExact = buildLogSourceLifecycleCompletionBuild?.backlogIds?.length === 1 &&
    buildLogSourceLifecycleCompletionBuild.backlogIds.includes(SOURCE_LIFECYCLE_COMPLETION_CARD_ID) &&
    ['SYNTHESIS-VERIFY-001', 'EXTRACT-RUN-HARDENING-001', 'MEETING-VAULT-ACL-001', 'DRIVE-ACCESS-REQUEST-001']
      .every(id => (buildLogSourceLifecycleCompletionBuild.mentionedBacklogIds || []).includes(id)) &&
    !['SYNTHESIS-VERIFY-001', 'EXTRACT-RUN-HARDENING-001', 'MEETING-VAULT-ACL-001', 'DRIVE-ACCESS-REQUEST-001']
      .some(id => (buildLogSourceLifecycleCompletionBuild.backlogIds || []).includes(id))
  ensure(
    checks,
    sourceLifecycleCompletion?.lane === 'done' &&
      String(sourceLifecycleCompletion?.statusNote || '').includes(SOURCE_LIFECYCLE_COMPLETION_CLOSEOUT_KEY) &&
      sourceLifecycleCompletionApprovalValidation.ok &&
      sourceLifecycleCompletionApprovalValidation.mode === 'v2' &&
      sourceLifecycleCompletionApproval.cardId === SOURCE_LIFECYCLE_COMPLETION_CARD_ID &&
      Number(sourceLifecycleCompletionApproval.score) >= 9.8 &&
      sourceLifecycleCompletionApproval.approvedPlanRef === SOURCE_LIFECYCLE_COMPLETION_PLAN_PATH &&
      sourceLifecycleCompletionApprovalValidation.approval?.approvedPlanRef === SOURCE_LIFECYCLE_COMPLETION_PLAN_PATH &&
      includesAll(sourceLifecycleCompletionPlanSource, [
        'source contracts must be revalidated',
        'Must Become Complete For Readiness',
        'Must Become Accepted Blocked/Parked',
        'Proof output is metadata-only',
      ]) &&
      includesAll(sourceLifecycleCompletionRegistrySource, [
        SOURCE_LIFECYCLE_COMPLETION_CLOSEOUT_KEY,
        'SOURCE_LIFECYCLE_COMPLETION_RULES',
        'SOURCE_LIFECYCLE_ACCEPTED_BLOCKED_SOURCE_IDS',
        'buildSourceLifecycleCompletionStatus',
        'accepted_blocked',
        'metadata-only',
      ]) &&
      includesAll(sourceLifecycleCompletionScriptSource, [
        SOURCE_LIFECYCLE_COMPLETION_SUMMARY_MARKER,
        '/api/foundation/source-lifecycle',
        '/api/source-of-truth',
        '/api/foundation-hub',
      ]) &&
      includesAll(sourceLifecycleCompletionDocSource, [
        'Source Lifecycle Completion Closeout',
        'source contracts',
        'metadata-only',
        'accepted-blocked',
      ]) &&
      includesAll(foundationVerifySource, SOURCE_LIFECYCLE_COMPLETION_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE) &&
      packageJson.scripts?.['process:source-lifecycle-completion-check'] === 'node --env-file-if-exists=.env scripts/process-source-lifecycle-completion-check.mjs' &&
      sourceLifecycleCompletionStatus.status === 'healthy' &&
      sourceLifecycleCompletionStatus.summary?.requiredMissingTerminalRuleCount === 0 &&
      sourceLifecycleCompletionStatus.summary?.terminalRuleMissingContractCount === 0 &&
      sourceLifecycleCompletionStatus.summary?.requiredMissingLifecycleRowCount === 0 &&
      sourceLifecycleCompletionStatus.summary?.loadBearingSourceCount === SOURCE_LIFECYCLE_LOAD_BEARING_SOURCE_IDS.length &&
      sourceLifecycleCompletionStatus.summary?.acceptedBlockedSourceCount === SOURCE_LIFECYCLE_ACCEPTED_BLOCKED_SOURCE_IDS.length &&
      sourceLifecycleCompletionStatus.summary?.privateOrRawLeakFindings === 0 &&
      sourceLifecycleCompletionStatus.summary?.extractionTargetCount === SOURCE_LIFECYCLE_REQUIRED_TARGET_COUNT &&
      sourceLifecycleCompletionStatus.summary?.readinessStillNamesSourceLifecycleCompletion === false &&
      !(foundationDoneTestReadinessStatus.blockingCards || []).includes(SOURCE_LIFECYCLE_COMPLETION_CARD_ID) &&
      buildLogSourceLifecycleCompletionBuild?.operatorCloseout === true &&
      sourceLifecycleCompletionBuildLogExact &&
      currentPlan.includes(SOURCE_LIFECYCLE_COMPLETION_CLOSEOUT_KEY) &&
      currentState.includes(SOURCE_LIFECYCLE_COMPLETION_CLOSEOUT_KEY),
    'SOURCE-LIFECYCLE-COMPLETION-001 closes source completion/revalidation readiness blocker honestly',
    `sources=${sourceLifecycleCompletionStatus.summary?.terminalSourceCount} loadBearing=${sourceLifecycleCompletionStatus.summary?.loadBearingSourceCount} acceptedBlocked=${sourceLifecycleCompletionStatus.summary?.acceptedBlockedSourceCount} readinessNamesSource=${sourceLifecycleCompletionStatus.summary?.readinessStillNamesSourceLifecycleCompletion}`,
  )

  const sourceLifecycleDynamicCountsCurrentItem = currentSprintItemsById.get(SOURCE_LIFECYCLE_DYNAMIC_COUNTS_CARD_ID) || null
  const sourceLifecycleDynamicCountsDogfood = buildSourceLifecycleDynamicCountsDogfoodProof()
  const sourceLifecycleDynamicCountsCloseout = foundationBuildCloseouts.find(closeout => closeout.key === SOURCE_LIFECYCLE_DYNAMIC_COUNTS_CLOSEOUT_KEY) || null
  const sourceLifecycleDynamicCountsClosed = sourceLifecycleDynamicCounts?.lane === 'done'
  const sourceLifecycleDynamicCountsCloseoutOk = !sourceLifecycleDynamicCountsClosed ||
    (String(sourceLifecycleDynamicCounts?.statusNote || '').includes(SOURCE_LIFECYCLE_DYNAMIC_COUNTS_CLOSEOUT_KEY) &&
      sourceLifecycleDynamicCountsCloseout?.operatorCloseout === true &&
      (sourceLifecycleDynamicCountsCloseout.backlogIds || []).includes(SOURCE_LIFECYCLE_DYNAMIC_COUNTS_CARD_ID) &&
      await repoFileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-16-source-lifecycle-dynamic-counts-closeout.md'))
  ensure(
    checks,
    sourceLifecycleDynamicCounts &&
      ['executing', 'done'].includes(sourceLifecycleDynamicCounts.lane) &&
      (sourceLifecycleDynamicCountsCurrentItem || sourceLifecycleDynamicCountsClosed) &&
      (activeFoundationSprint.sprint?.sprintId === SOURCE_LIFECYCLE_DYNAMIC_COUNTS_SPRINT_ID || sourceLifecycleDynamicCountsClosed) &&
      sourceLifecycleDynamicCountsApprovalValidation.ok &&
      sourceLifecycleDynamicCountsApprovalValidation.mode === 'v2' &&
      sourceLifecycleDynamicCountsApproval.cardId === SOURCE_LIFECYCLE_DYNAMIC_COUNTS_CARD_ID &&
      Number(sourceLifecycleDynamicCountsApproval.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
      sourceLifecycleDynamicCountsApproval.approvedPlanRef === SOURCE_LIFECYCLE_DYNAMIC_COUNTS_PLAN_PATH &&
      sourceLifecycleDynamicCountsDogfood.ok === true &&
      sourceLifecycleDynamicCountsSource.includes('buildSourceLifecycleDynamicCoverage') &&
      sourceLifecycleDynamicCountsSource.includes('buildSourceLifecycleDynamicCountsDogfoodProof') &&
      sourceLifecycleCompletionRegistrySource.includes('buildSourceLifecycleDynamicCoverage') &&
      !sourceLifecycleCompletionRegistrySource.includes('SOURCE_LIFECYCLE_COMPLETION_EXPECTED_SOURCE_COUNT') &&
      !sourceLifecycleCompletionRegistrySource.includes('sourceContracts.length ===') &&
      packageJson.scripts?.['process:source-lifecycle-dynamic-counts-check'] === `node --env-file-if-exists=.env ${SOURCE_LIFECYCLE_DYNAMIC_COUNTS_SCRIPT_PATH}` &&
      sourceLifecycleDynamicCountsScriptSource.includes('scriptIsReadOnly') &&
      sourceLifecycleDynamicCountsPlanSource.includes(SOURCE_LIFECYCLE_DYNAMIC_COUNTS_CARD_ID) &&
      sourceLifecycleDynamicCountsCloseoutOk,
    'SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001 replaces exact source-count baselines with required/optional coverage',
    sourceLifecycleDynamicCounts
      ? `lane=${sourceLifecycleDynamicCounts.lane} dogfood=${sourceLifecycleDynamicCountsDogfood.ok ? 'pass' : 'blocked'} requiredMissing=${sourceLifecycleCompletionStatus.summary?.requiredMissingTerminalRuleCount ?? 'missing'} optional=${sourceLifecycleCompletionStatus.summary?.optionalUnruledSourceCount ?? 0}`
      : `missing ${SOURCE_LIFECYCLE_DYNAMIC_COUNTS_CARD_ID}`,
  )

  const synthesisVerifyBuildLogExact = buildLogSynthesisVerifyBuild?.backlogIds?.length === 1 &&
    buildLogSynthesisVerifyBuild.backlogIds.includes(SYNTHESIS_VERIFY_CARD_ID) &&
    ['EXTRACT-RUN-HARDENING-001', 'MEETING-VAULT-ACL-001', 'DRIVE-ACCESS-REQUEST-001']
      .every(id => (buildLogSynthesisVerifyBuild.mentionedBacklogIds || []).includes(id)) &&
    !['EXTRACT-RUN-HARDENING-001', 'MEETING-VAULT-ACL-001', 'DRIVE-ACCESS-REQUEST-001']
      .some(id => (buildLogSynthesisVerifyBuild.backlogIds || []).includes(id))
  ensure(
    checks,
    synthesisVerify?.lane === 'done' &&
      String(synthesisVerify?.statusNote || '').includes(SYNTHESIS_VERIFY_CLOSEOUT_KEY) &&
      synthesisVerifyApprovalValidation.ok &&
      synthesisVerifyApprovalValidation.mode === 'v2' &&
      synthesisVerifyApproval.cardId === SYNTHESIS_VERIFY_CARD_ID &&
      Number(synthesisVerifyApproval.score) >= 9.8 &&
      synthesisVerifyApproval.approvedPlanRef === SYNTHESIS_VERIFY_PLAN_PATH &&
      synthesisVerifyApprovalValidation.approval?.approvedPlanRef === SYNTHESIS_VERIFY_PLAN_PATH &&
      includesAll(synthesisVerifyPlanSource, [
        'central verification layer',
        'single-evidence Strategy claims fail closed',
        'Strategy Hub v2 only includes verified Strategy routes',
        'Advisor remains fail-closed',
      ]) &&
      includesAll(synthesisVerifyRegistrySource, [
        SYNTHESIS_VERIFY_CLOSEOUT_KEY,
        'SYNTHESIS_CLAIM_SURFACES',
        'verifySynthesizedRecord',
        'requireVerifiedSynthesisRecord',
        'filterVerifiedSynthesisRecords',
      ]) &&
      includesAll(synthesisVerifyScriptSource, [
        SYNTHESIS_VERIFY_SUMMARY_MARKER,
        'unsupported',
        'single_evidence_strategy_claim',
        'buildSynthesisVerificationDbReport',
      ]) &&
      includesAll(intelligenceSynthesisSource, [
        'verifySynthesizedRecord',
        'SYNTHESIS-VERIFY-001 blocked governed synthesis item',
      ]) &&
      includesAll(intelligenceActionRouterSource, [
        'requireVerifiedSynthesisRecord',
        "item.metadata->'synthesisVerification'->>'status' = 'verified'",
        'unverified_decision_grade_routes',
      ]) &&
      includesAll(synthesisVerifyDocSource, [
        'Synthesis Claim Verification Closeout',
        'Unsupported, stale, contradicted, missing-tier',
        'Strategy Advisor remains fail-closed',
      ]) &&
      includesAll(foundationVerifySource, SYNTHESIS_VERIFY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE) &&
      packageJson.scripts?.['process:synthesis-verify-check'] === 'node --env-file-if-exists=.env scripts/process-synthesis-verify-check.mjs' &&
      !(foundationDoneTestReadinessStatus.blockingCards || []).includes(SYNTHESIS_VERIFY_CARD_ID) &&
      buildLogSynthesisVerifyBuild?.operatorCloseout === true &&
      synthesisVerifyBuildLogExact &&
      currentPlan.includes(SYNTHESIS_VERIFY_CLOSEOUT_KEY) &&
      currentState.includes(SYNTHESIS_VERIFY_CLOSEOUT_KEY),
    'SYNTHESIS-VERIFY-001 closes synthesized-claim verification readiness blocker honestly',
    `lane=${synthesisVerify?.lane || 'missing'} closeout=${SYNTHESIS_VERIFY_CLOSEOUT_KEY} readinessNamesSynthesis=${(foundationDoneTestReadinessStatus.blockingCards || []).includes(SYNTHESIS_VERIFY_CARD_ID)}`,
  )

  const extractRunHardeningBuildLogExact = buildLogExtractRunHardeningBuild?.backlogIds?.length === 1 &&
    buildLogExtractRunHardeningBuild.backlogIds.includes(EXTRACT_RUN_HARDENING_CARD_ID) &&
    ['MEETING-VAULT-ACL-001', 'DRIVE-ACCESS-REQUEST-001']
      .every(id => (buildLogExtractRunHardeningBuild.mentionedBacklogIds || []).includes(id)) &&
    !['MEETING-VAULT-ACL-001', 'DRIVE-ACCESS-REQUEST-001']
      .some(id => (buildLogExtractRunHardeningBuild.backlogIds || []).includes(id))
  ensure(
    checks,
    extractRunHardening?.lane === 'done' &&
      String(extractRunHardening?.statusNote || '').includes(EXTRACT_RUN_HARDENING_CLOSEOUT_KEY) &&
      extractRunHardeningApprovalValidation.ok &&
      extractRunHardeningApprovalValidation.mode === 'v2' &&
      extractRunHardeningApproval.cardId === EXTRACT_RUN_HARDENING_CARD_ID &&
      Number(extractRunHardeningApproval.score) >= 9.8 &&
      extractRunHardeningApproval.approvedPlanRef === EXTRACT_RUN_HARDENING_PLAN_PATH &&
      extractRunHardeningApprovalValidation.approval?.approvedPlanRef === EXTRACT_RUN_HARDENING_PLAN_PATH &&
      includesAll(extractRunHardeningPlanSource, [
        'retry/backoff',
        'Run IDs And Idempotency',
        'stale item lease',
        'bounded backfill',
      ]) &&
      includesAll(extractRunHardeningSource, [
        EXTRACT_RUN_HARDENING_CLOSEOUT_KEY,
        'EXTRACTION_RETRY_STATES',
        'normalizeExtractionRetryPolicy',
        'classifyExtractionItemRetry',
        'buildExtractionNextSafeCommand',
        'buildSyntheticExtractionRunHardeningProof',
      ]) &&
      includesAll(sourceCrawlStoreOwnershipSource, [
        'source_crawl_item_attempts',
        'retry_state',
        'last_source_crawl_run_id',
        'getRetryableSourceCrawlItems',
        'leaseRetryableSourceCrawlItems',
        'markStaleSourceCrawlItems',
        'getExtractionRunHardeningSnapshot',
      ]) &&
      includesAll(extractionTargetSource, [
        '--crawlRunId=',
        'EXTRACTION_CRAWL_RUN_ID',
        'classifySourceCrawlItemRetries',
        'buildExtractionNextSafeCommand',
      ]) &&
      includesAll(foundationWorkerSource, [
        'markStaleSourceCrawlItems',
        'stale source-crawl item lease',
      ]) &&
      includesAll(extractRunHardeningScriptSource, [
        EXTRACT_RUN_HARDENING_SUMMARY_MARKER,
        'buildSyntheticExtractionRunHardeningProof',
        'failed items have queryable retry state',
        'partial/failed targets expose next safe command or blocker',
      ]) &&
      includesAll(extractRunHardeningDocSource, [
        'Extraction Run Hardening',
        'queryable retry fields',
        'source_crawl_item_attempts',
        'Foundation may still report `not_ready`',
      ]) &&
      packageJson.scripts?.['process:extract-run-hardening-check'] === 'node --env-file-if-exists=.env scripts/process-extract-run-hardening-check.mjs' &&
      foundationHub.extractionControl?.hardeningStatus?.status === 'healthy' &&
      Number(foundationHub.extractionControl?.summary?.targetCount || 0) >= 12 &&
      Number(foundationHub.extractionControl?.summary?.failedItemsWithoutRetryState || 0) === 0 &&
      Number(foundationHub.extractionControl?.summary?.staleLeasedItems || 0) === 0 &&
      !(foundationDoneTestReadinessStatus.blockingCards || []).includes(EXTRACT_RUN_HARDENING_CARD_ID) &&
      buildLogExtractRunHardeningBuild?.operatorCloseout === true &&
      extractRunHardeningBuildLogExact &&
      currentPlan.includes(EXTRACT_RUN_HARDENING_CLOSEOUT_KEY) &&
      currentState.includes(EXTRACT_RUN_HARDENING_CLOSEOUT_KEY),
    'EXTRACT-RUN-HARDENING-001 closes extraction retry/ledger/backfill readiness blocker honestly',
    `lane=${extractRunHardening?.lane || 'missing'} hardening=${foundationHub.extractionControl?.hardeningStatus?.status || 'missing'} readinessNamesExtract=${(foundationDoneTestReadinessStatus.blockingCards || []).includes(EXTRACT_RUN_HARDENING_CARD_ID)}`,
  )

  const driveAccessRequestBuildLogExact = buildLogDriveAccessRequestBuild?.backlogIds?.length === 1 &&
    buildLogDriveAccessRequestBuild.backlogIds.includes(DRIVE_ACCESS_REQUEST_CARD_ID) &&
    [MEETING_VAULT_ACL_CARD_ID, FOUNDATION_DONE_TEST_CARD_ID]
      .every(id => (buildLogDriveAccessRequestBuild.mentionedBacklogIds || []).includes(id)) &&
    ![MEETING_VAULT_ACL_CARD_ID, FOUNDATION_DONE_TEST_CARD_ID]
      .some(id => (buildLogDriveAccessRequestBuild.backlogIds || []).includes(id))
  ensure(
    checks,
    driveAccessRequest?.lane === 'done' &&
      String(driveAccessRequest?.statusNote || '').includes(DRIVE_ACCESS_REQUEST_CLOSEOUT_KEY) &&
      driveAccessRequestApprovalValidation.ok &&
      driveAccessRequestApprovalValidation.mode === 'v2' &&
      driveAccessRequestApproval.cardId === DRIVE_ACCESS_REQUEST_CARD_ID &&
      Number(driveAccessRequestApproval.score) >= 9.8 &&
      driveAccessRequestApproval.approvedPlanRef === DRIVE_ACCESS_REQUEST_PLAN_PATH &&
      driveAccessRequestApprovalValidation.approval?.approvedPlanRef === DRIVE_ACCESS_REQUEST_PLAN_PATH &&
      includesAll(driveAccessRequestPlanSource, [
        'DRIVE-ACCESS-REQUEST-001: dry-run/preflight only',
        'no emails',
        'no Drive permission mutation',
        'request-access-needed',
      ]) &&
      includesAll(driveAccessPreflightSource, [
        DRIVE_ACCESS_REQUEST_CLOSEOUT_KEY,
        'buildDriveFilePreflight',
        'classifyDrivePermission',
        'classifyDriveRepairAuthority',
        'buildSyntheticDriveAccessPreflightProof',
        'REQUEST_ACCESS_REQUIRED',
      ]) &&
      !driveAccessPreflightSource.includes('createDrivePermission') &&
      !driveAccessPreflightSource.includes('deleteDrivePermission') &&
      includesAll(driveMeetingVaultStoreOwnershipSource, [
        'drive_access_preflight_runs',
        'drive_access_preflight_items',
        'recordDriveAccessPreflightRun',
        'listMeetingRawDriveFileCandidates',
      ]) &&
      includesAll(driveAccessRequestScriptSource, [
        DRIVE_ACCESS_REQUEST_SUMMARY_MARKER,
        'proof output is metadata-only',
        'requestAccessNeededCount',
        'recordDriveAccessPreflightRun',
      ]) &&
      includesAll(meetingVaultAclSource, [
        MEETING_VAULT_POLICY_VERSION,
        'MEETING_VAULT_SENSITIVITY_CLASSES',
        'classifyMeetingVaultSensitivity',
        'allowInternalUsers',
        'assertMeetingAclMutationApproved',
        'buildMeetingAclDryRunPlan',
        'buildMeetingVaultNoDuplicateGoogleDocProof',
        'buildSyntheticMeetingVaultAclProof',
        'MEETING_VAULT_SOURCE_FILE_ROLES',
      ]) &&
      includesAll(meetingVaultAclScriptSource, [
        MEETING_VAULT_ACL_SUMMARY_MARKER,
        'Apply path fails closed without Phase B approval',
        'No duplicate Google Docs rule',
        'annotateMeetingSourceRoles',
        'sensitivityClassCounts',
        'recordMeetingVaultAclAudit',
      ]) &&
      includesAll(syncMeetingNotesArchiveSource, [
        'ownerEmailsForFile',
        'crewbertOwned',
        'return candidateIsCopy ? current : candidate',
        'upsertSharedCommunicationArtifact',
        'originalFileId',
        'legacyCrewbertDuplicateFileIds',
      ]) &&
      includesAll(mirrorMeetingArchiveToDriveSource, [
        'Drive mirror writes are disabled',
        'Meeting archive/search lives in the database',
        'Drive files created: 0',
      ]) &&
      includesAll(driveAccessRequestDocSource, [
        'dry-run delegated Drive preflight only',
        'does not send request-access emails',
        'does not add, remove, or transfer Google Drive permissions',
      ]) &&
      includesAll(meetingVaultAclDocSource, [
        'Phase A dry-run implementation only',
        'Training, all-hands, huddles, workshops, sales sessions, and broad team meetings are not sensitive by default',
        'Unknown/unclassified files stay blocked until classified',
        'No Duplicate Google Docs Rule',
        'Not Approved',
        'further unapproved Google Drive permission mutations',
      ]) &&
      includesAll(foundationVerifySource, DRIVE_ACCESS_REQUEST_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE) &&
      packageJson.scripts?.['process:drive-access-request-check'] === 'node --env-file-if-exists=.env scripts/process-drive-access-request-check.mjs' &&
      packageJson.scripts?.['process:meeting-vault-acl-check'] === 'node --env-file-if-exists=.env scripts/process-meeting-vault-acl-check.mjs' &&
      syntheticDriveAccessPreflight.ok &&
      syntheticMeetingVaultAcl.ok &&
      latestDriveAccessPreflightRun?.status === 'healthy' &&
      Number(latestDriveAccessPreflightRun?.inspectedFileCount || 0) > 0 &&
      latestMeetingVaultAclAudit?.status &&
      meetingVaultNoDuplicateGoogleDocProof.ok &&
      !(foundationDoneTestReadinessStatus.blockingCards || []).includes(DRIVE_ACCESS_REQUEST_CARD_ID) &&
      (meetingVaultAutoEnforcementClosed
        ? !(foundationDoneTestReadinessStatus.blockingCards || []).includes(MEETING_VAULT_ACL_CARD_ID)
        : (foundationDoneTestReadinessStatus.blockingCards || []).includes(MEETING_VAULT_ACL_CARD_ID)) &&
      buildLogDriveAccessRequestBuild?.operatorCloseout === true &&
      driveAccessRequestBuildLogExact &&
      currentPlan.includes(DRIVE_ACCESS_REQUEST_CLOSEOUT_KEY) &&
      currentState.includes(DRIVE_ACCESS_REQUEST_CLOSEOUT_KEY),
    'DRIVE-ACCESS-REQUEST-001 closes delegated Drive dry-run/preflight while Meeting Vault Phase B mutations stay separately approved',
    `lane=${driveAccessRequest?.lane || 'missing'} latest=${latestDriveAccessPreflightRun?.status || 'missing'} noDuplicateDocs=${meetingVaultNoDuplicateGoogleDocProof.ok ? 'yes' : meetingVaultNoDuplicateGoogleDocProof.findings.join(',')} readinessNamesDrive=${(foundationDoneTestReadinessStatus.blockingCards || []).includes(DRIVE_ACCESS_REQUEST_CARD_ID)} meeting=${meetingVaultAcl?.lane || 'missing'}`,
  )

  const meetingVaultAutoEnforcementBuildLogExact = (buildLogMeetingVaultAutoEnforcementBuild?.backlogIds || []).length === 2 &&
    [MEETING_VAULT_AUTO_ENFORCEMENT_CARD_ID, MEETING_VAULT_ACL_CARD_ID]
      .every(id => (buildLogMeetingVaultAutoEnforcementBuild.backlogIds || []).includes(id)) &&
    [DRIVE_ACCESS_REQUEST_CARD_ID, FOUNDATION_DONE_TEST_CARD_ID]
      .every(id => (buildLogMeetingVaultAutoEnforcementBuild.mentionedBacklogIds || []).includes(id)) &&
    ![DRIVE_ACCESS_REQUEST_CARD_ID, FOUNDATION_DONE_TEST_CARD_ID]
      .some(id => (buildLogMeetingVaultAutoEnforcementBuild.backlogIds || []).includes(id))
  ensure(
    checks,
    meetingVaultAutoEnforcementClosed &&
      meetingVaultAutoEnforcementApprovalValidation.ok &&
      meetingVaultAutoEnforcementApprovalValidation.mode === 'v2' &&
      meetingVaultAutoEnforcementApproval.cardId === MEETING_VAULT_AUTO_ENFORCEMENT_CARD_ID &&
      Number(meetingVaultAutoEnforcementApproval.score) >= 9.8 &&
      meetingVaultAutoEnforcementApproval.approvedPlanRef === MEETING_VAULT_AUTO_ENFORCEMENT_PLAN_PATH &&
      meetingVaultAutoEnforcementApprovalValidation.approval?.approvedPlanRef === MEETING_VAULT_AUTO_ENFORCEMENT_PLAN_PATH &&
      includesAll(meetingVaultAutoEnforcementPlanSource, [
        'Original Gemini note is source truth',
        'Legacy Exception Queue',
        'When MEETING-VAULT-ACL-001 Can Stop Blocking Foundation',
        'no Drive mutation',
      ]) &&
      includesAll(meetingVaultAutoEnforcementSource, [
        MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY,
        'classifyMeetingVaultAutoEnforcementItem',
        'buildMeetingVaultAutoEnforcementStatus',
        'assertMeetingVaultAutoEnforcementMutationApproved',
        'buildSyntheticMeetingVaultAutoEnforcementProof',
        'legacy_exception',
        'remove_high_risk_public_or_domain',
      ]) &&
      includesAll(meetingVaultAutoEnforcementScriptSource, [
        MEETING_VAULT_AUTO_ENFORCEMENT_SUMMARY_MARKER,
        'recordMeetingVaultAutoEnforcementRun',
        'updateBacklogItem',
        'noDuplicateGoogleDocProof',
        'proof output is metadata-only',
        'noDriveMutations',
      ]) &&
      includesAll(driveMeetingVaultStoreOwnershipSource, [
        'meeting_vault_enforcement_runs',
        'meeting_vault_enforcement_items',
        'meeting_vault_legacy_exceptions',
        'recordMeetingVaultAutoEnforcementRun',
        'getLatestMeetingVaultAutoEnforcementRun',
      ]) &&
      includesAll(foundationDoneTestRegistrySource, [
        MEETING_VAULT_AUTO_ENFORCEMENT_CARD_ID,
        MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY,
        'npm run process:meeting-vault-auto-enforcement-check',
      ]) &&
      includesAll(serverRouteSource, [
        'meetingVaultAutoEnforcement',
        'getLatestMeetingVaultAutoEnforcementRun',
        'getMeetingVaultLegacyExceptions',
      ]) &&
      includesAll(foundationFrontendSource, [
        'renderMeetingVaultAutoEnforcementPanel',
        'Meeting Vault Auto-Enforcement',
        'hub.meetingVaultAutoEnforcement',
      ]) &&
      includesAll(meetingVaultAutoEnforcementDocSource, [
        'Meeting Vault Auto-Enforcement',
        MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY,
        'report_only',
        'Legacy exceptions remain visible work',
      ]) &&
      packageJson.scripts?.['process:meeting-vault-auto-enforcement-check'] === 'node --env-file-if-exists=.env scripts/process-meeting-vault-auto-enforcement-check.mjs' &&
      syntheticMeetingVaultAutoEnforcement.ok &&
      meetingVaultNoDuplicateGoogleDocProof.ok &&
      latestMeetingVaultAutoEnforcementRun?.reportHash &&
      foundationHub.meetingVaultAutoEnforcement?.latestRun?.reportHash === latestMeetingVaultAutoEnforcementRun?.reportHash &&
      foundationDoneTestReadinessStatus.status === 'ready' &&
      foundationDoneTestReadinessStatus.readyForStrategy === true &&
      !(foundationDoneTestReadinessStatus.blockingCards || []).includes(MEETING_VAULT_ACL_CARD_ID) &&
      !(foundationDoneTestReadinessStatus.blockingCards || []).includes(MEETING_VAULT_AUTO_ENFORCEMENT_CARD_ID) &&
      buildLogMeetingVaultAutoEnforcementBuild?.operatorCloseout === true &&
      meetingVaultAutoEnforcementBuildLogExact &&
      currentPlan.includes(MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY) &&
      currentState.includes(MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY) &&
      currentState.includes('automatic report-only forward-flow proof') &&
      includesAll(foundationVerifySource, MEETING_VAULT_AUTO_ENFORCEMENT_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'MEETING-VAULT-AUTO-ENFORCEMENT-001 closes the meeting raw Drive ACL/vault readiness blocker through automatic forward-flow proof',
    `auto=${meetingVaultAutoEnforcement?.lane || 'missing'} meeting=${meetingVaultAcl?.lane || 'missing'} run=${latestMeetingVaultAutoEnforcementRun?.status || 'missing'} hash=${latestMeetingVaultAutoEnforcementRun?.reportHash || 'missing'} readiness=${foundationDoneTestReadinessStatus.status}`,
  )

  return {
    ok: checks.every(check => check.ok),
    summary: {
      passed: checks.filter(check => check.ok).length,
      total: checks.length,
    },
    checks,
  }
}
