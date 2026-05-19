import { PLAN_CRITIC_MIN_PASS_SCORE } from './process-plan-critic.js'
import { FOUNDATION_SOURCE_ONCE_OVER_SPRINT_ID } from './foundation-current-sprint.js'
import {
  STRATEGY_HUB_MEETING_READY_CARD_ID,
  STRATEGY_HUB_MEETING_READY_CLOSEOUT_KEY,
  STRATEGY_HUB_MEETING_READY_PLAN_PATH,
  STRATEGY_HUB_MEETING_READY_SCRIPT_PATH,
  STRATEGY_HUB_MEETING_READY_SUMMARY_MARKER,
} from './strategy-hub-meeting-ready.js'
import {
  AVATAR_IMPORT_CARD_ID,
  AVATAR_IMPORT_CLOSEOUT_KEY,
  AVATAR_IMPORT_PLAN_PATH,
  AVATAR_IMPORT_SCRIPT_PATH,
  AVATAR_IMPORT_SUMMARY_MARKER,
  MARKETING_AVATAR_EXPECTED_COUNTS,
} from './marketing-avatar-registry.js'
import {
  AUTO_DEPLOY_ROLLBACK_CARD_ID,
  AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY,
  AUTO_DEPLOY_ROLLBACK_PLAN_PATH,
  AUTO_DEPLOY_ROLLBACK_RUNNER_PATH,
  AUTO_DEPLOY_ROLLBACK_SCRIPT_PATH,
  AUTO_DEPLOY_ROLLBACK_SUMMARY_MARKER,
} from './auto-deploy-rollback.js'
import {
  SOURCE_MATURITY_GRID_CARD_ID,
  SOURCE_MATURITY_GRID_CLOSEOUT_KEY,
  SOURCE_MATURITY_GRID_PLAN_PATH,
  SOURCE_MATURITY_GRID_SCRIPT_PATH,
  SOURCE_MATURITY_GRID_SUMMARY_MARKER,
  SOURCE_MATURITY_STAGE_KEYS,
} from './source-maturity-grid.js'
import {
  EXTRACT_RUN_HARDENING_CARD_ID,
  EXTRACT_RUN_HARDENING_CLOSEOUT_KEY,
} from './extraction-run-hardening.js'
import {
  SOURCE_EXTRACTION_COVERAGE_CARD_ID,
  SOURCE_EXTRACTION_COVERAGE_CLOSEOUT_KEY,
  SOURCE_EXTRACTION_COVERAGE_PLAN_PATH,
  SOURCE_EXTRACTION_COVERAGE_SCRIPT_PATH,
  SOURCE_EXTRACTION_COVERAGE_STATES,
  SOURCE_EXTRACTION_COVERAGE_SUMMARY_MARKER,
} from './source-extraction-coverage.js'
import {
  SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
  SOURCE_COVERAGE_CLOSEOUT_CLOSEOUT_KEY,
  SOURCE_COVERAGE_CLOSEOUT_DECISIONS,
  SOURCE_COVERAGE_CLOSEOUT_PLAN_PATH,
  SOURCE_COVERAGE_CLOSEOUT_SCRIPT_PATH,
  SOURCE_COVERAGE_CLOSEOUT_SUMMARY_MARKER,
  SOURCE_EXTRACT_GAP_FOLLOWUP_CARD_ID,
  SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID,
} from './source-coverage-closeout.js'
import {
  MARKETING_SOURCE_MAP_CARD_ID,
  MARKETING_SOURCE_MAP_CLOSEOUT_KEY,
  MARKETING_SOURCE_MAP_PLAN_PATH,
  MARKETING_SOURCE_MAP_SCRIPT_PATH,
  MARKETING_SOURCE_MAP_SUMMARY_MARKER,
} from './marketing-source-map.js'
import {
  BRAND_STACK_CARD_ID,
  BRAND_STACK_CLOSEOUT_KEY,
  BRAND_STACK_PLAN_PATH,
  BRAND_STACK_SCRIPT_PATH,
  BRAND_STACK_SUMMARY_MARKER,
} from './brand-stack.js'
import {
  TIER_BEHAVIORAL_COMPLETION_CARD_ID,
  TIER_BEHAVIORAL_COMPLETION_CLOSEOUT_KEY,
  TIER_BEHAVIORAL_COMPLETION_PLAN_PATH,
  TIER_BEHAVIORAL_COMPLETION_SCRIPT_PATH,
  TIER_BEHAVIORAL_COMPLETION_SUMMARY_MARKER,
} from './tier-behavioral-completion.js'
import {
  VERIFICATION_RUNS_CARD_ID,
  VERIFICATION_RUNS_CLOSEOUT_KEY,
  VERIFICATION_RUNS_NEXT_CARD_ID,
  VERIFICATION_RUNS_PLAN_PATH,
  VERIFICATION_RUNS_SCRIPT_PATH,
  VERIFICATION_RUNS_SUMMARY_MARKER,
} from './verification-runs.js'
import {
  PER_USER_CHANGELOG_CARD_ID,
  PER_USER_CHANGELOG_CLOSEOUT_KEY,
  PER_USER_CHANGELOG_NEXT_CARD_ID,
  PER_USER_CHANGELOG_PLAN_PATH,
  PER_USER_CHANGELOG_SCRIPT_PATH,
  PER_USER_CHANGELOG_SUMMARY_MARKER,
} from './per-user-changelog.js'
import {
  DECISION_RESTRICTED_QUEUE_CARD_ID,
  DECISION_RESTRICTED_QUEUE_CLOSEOUT_KEY,
  DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID,
  DECISION_RESTRICTED_QUEUE_PLAN_PATH,
  DECISION_RESTRICTED_QUEUE_SCRIPT_PATH,
  DECISION_RESTRICTED_QUEUE_SUMMARY_MARKER,
} from './decision-restricted-queue.js'
import {
  FOUNDATION_UI_COMPLETE_CARD_ID,
  FOUNDATION_UI_COMPLETE_CLOSEOUT_KEY,
  FOUNDATION_UI_COMPLETE_PLAN_PATH,
  FOUNDATION_UI_COMPLETE_SCRIPT_PATH,
  FOUNDATION_UI_COMPLETE_SUMMARY_MARKER,
} from './foundation-ui-complete.js'

export const VERIFIER_SOURCE_ONCE_OVER_PROGRESSION_SPLIT_CARD_ID = 'VERIFIER-SOURCE-ONCE-OVER-PROGRESSION-SPLIT-001'
export const VERIFIER_SOURCE_ONCE_OVER_PROGRESSION_SPLIT_CLOSEOUT_KEY = 'verifier-source-once-over-progression-split-v1'
export const VERIFIER_SOURCE_ONCE_OVER_PROGRESSION_SPLIT_PLAN_PATH = 'docs/process/verifier-source-once-over-progression-split-001-plan.md'
export const VERIFIER_SOURCE_ONCE_OVER_PROGRESSION_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-SOURCE-ONCE-OVER-PROGRESSION-SPLIT-001.json'
export const VERIFIER_SOURCE_ONCE_OVER_PROGRESSION_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-source-once-over-progression-split-check.mjs'
export const VERIFIER_SOURCE_ONCE_OVER_PROGRESSION_SPLIT_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-verifier-source-once-over-progression-split-closeout.md'
export const VERIFIER_SOURCE_ONCE_OVER_PROGRESSION_SPLIT_BEFORE_LINES = 9984
export const VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_CARD_ID = 'VERIFIER-SOURCE-ONCE-OVER-ORCHESTRATION-SPLIT-001'
export const VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_CLOSEOUT_KEY = 'verifier-source-once-over-orchestration-split-v1'
export const VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_PLAN_PATH = 'docs/process/verifier-source-once-over-orchestration-split-001-plan.md'
export const VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-SOURCE-ONCE-OVER-ORCHESTRATION-SPLIT-001.json'
export const VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-source-once-over-orchestration-split-check.mjs'
export const VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-verifier-source-once-over-orchestration-split-closeout.md'
export const VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_BEFORE_LINES = 5815

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function includesAll(text = '', patterns = []) {
  return patterns.every(pattern => String(text || '').includes(pattern))
}

function evaluateSourceOnceOverProgressionFixture(fixture = {}) {
  const findings = []
  if (fixture.strategyMeetingClosed !== true) findings.push('strategy_meeting_hidden_failure')
  if (fixture.avatarImportClosed !== true) findings.push('avatar_import_hidden_failure')
  if (fixture.sourceCoverageClosed !== true) findings.push('source_coverage_hidden_failure')
  if (fixture.marketingAndBrandClosed !== true) findings.push('marketing_brand_hidden_failure')
  if (fixture.verificationAndDecisionClosed !== true) findings.push('verification_decision_hidden_failure')
  if (fixture.foundationUiCompleteClosed !== true) findings.push('foundation_ui_complete_hidden_failure')
  if (fixture.oldInlinePredicatesRemoved !== true) findings.push('old_source_once_over_inline_predicates_present')
  return { ok: findings.length === 0, findings }
}

export function buildFoundationVerifierSourceOnceOverProgressionDogfoodProof() {
  const healthy = evaluateSourceOnceOverProgressionFixture({
    strategyMeetingClosed: true,
    avatarImportClosed: true,
    sourceCoverageClosed: true,
    marketingAndBrandClosed: true,
    verificationAndDecisionClosed: true,
    foundationUiCompleteClosed: true,
    oldInlinePredicatesRemoved: true,
  })
  const rejected = {
    hiddenStrategyMeeting: evaluateSourceOnceOverProgressionFixture({
      strategyMeetingClosed: false,
      avatarImportClosed: true,
      sourceCoverageClosed: true,
      marketingAndBrandClosed: true,
      verificationAndDecisionClosed: true,
      foundationUiCompleteClosed: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenAvatarImport: evaluateSourceOnceOverProgressionFixture({
      strategyMeetingClosed: true,
      avatarImportClosed: false,
      sourceCoverageClosed: true,
      marketingAndBrandClosed: true,
      verificationAndDecisionClosed: true,
      foundationUiCompleteClosed: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenSourceCoverage: evaluateSourceOnceOverProgressionFixture({
      strategyMeetingClosed: true,
      avatarImportClosed: true,
      sourceCoverageClosed: false,
      marketingAndBrandClosed: true,
      verificationAndDecisionClosed: true,
      foundationUiCompleteClosed: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenMarketingBrand: evaluateSourceOnceOverProgressionFixture({
      strategyMeetingClosed: true,
      avatarImportClosed: true,
      sourceCoverageClosed: true,
      marketingAndBrandClosed: false,
      verificationAndDecisionClosed: true,
      foundationUiCompleteClosed: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenVerificationDecision: evaluateSourceOnceOverProgressionFixture({
      strategyMeetingClosed: true,
      avatarImportClosed: true,
      sourceCoverageClosed: true,
      marketingAndBrandClosed: true,
      verificationAndDecisionClosed: false,
      foundationUiCompleteClosed: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenFoundationUiComplete: evaluateSourceOnceOverProgressionFixture({
      strategyMeetingClosed: true,
      avatarImportClosed: true,
      sourceCoverageClosed: true,
      marketingAndBrandClosed: true,
      verificationAndDecisionClosed: true,
      foundationUiCompleteClosed: false,
      oldInlinePredicatesRemoved: true,
    }),
    oldInlinePredicate: evaluateSourceOnceOverProgressionFixture({
      strategyMeetingClosed: true,
      avatarImportClosed: true,
      sourceCoverageClosed: true,
      marketingAndBrandClosed: true,
      verificationAndDecisionClosed: true,
      foundationUiCompleteClosed: true,
      oldInlinePredicatesRemoved: false,
    }),
  }
  const ok = healthy.ok && Object.values(rejected).every(result => result.ok === false)
  return {
    ok,
    healthy,
    rejected,
    dogfoodInvariant: ok
      ? 'healthy Source Once-Over progression fixture passes; hidden strategy, avatar, source coverage, marketing/brand, verification/decision, Foundation UI, and old-inline failures fail closed'
      : 'Source Once-Over progression dogfood did not reject every known failure fixture',
  }
}

function evaluateSourceOnceOverOrchestrationFixture(fixture = {}) {
  const findings = []
  if (fixture.wrapperDelegationPresent !== true) findings.push('wrapper_delegation_missing')
  if (fixture.bundleInputSupported !== true) findings.push('bundle_input_not_supported')
  if (fixture.oldDirectRootCallRemoved !== true) findings.push('old_direct_root_call_present')
  if (fixture.closeoutRegistered !== true) findings.push('orchestration_closeout_missing')
  if (fixture.focusedProofRegistered !== true) findings.push('focused_proof_not_registered')
  if (fixture.lineCountDecreased !== true) findings.push('root_line_count_not_reduced')
  return { ok: findings.length === 0, findings }
}

export function buildFoundationVerifierSourceOnceOverOrchestrationDogfoodProof() {
  const healthy = evaluateSourceOnceOverOrchestrationFixture({
    wrapperDelegationPresent: true,
    bundleInputSupported: true,
    oldDirectRootCallRemoved: true,
    closeoutRegistered: true,
    focusedProofRegistered: true,
    lineCountDecreased: true,
  })
  const rejected = {
    missingWrapper: evaluateSourceOnceOverOrchestrationFixture({
      wrapperDelegationPresent: false,
      bundleInputSupported: true,
      oldDirectRootCallRemoved: true,
      closeoutRegistered: true,
      focusedProofRegistered: true,
      lineCountDecreased: true,
    }),
    missingBundleInput: evaluateSourceOnceOverOrchestrationFixture({
      wrapperDelegationPresent: true,
      bundleInputSupported: false,
      oldDirectRootCallRemoved: true,
      closeoutRegistered: true,
      focusedProofRegistered: true,
      lineCountDecreased: true,
    }),
    oldDirectRootCall: evaluateSourceOnceOverOrchestrationFixture({
      wrapperDelegationPresent: true,
      bundleInputSupported: true,
      oldDirectRootCallRemoved: false,
      closeoutRegistered: true,
      focusedProofRegistered: true,
      lineCountDecreased: true,
    }),
    missingCloseout: evaluateSourceOnceOverOrchestrationFixture({
      wrapperDelegationPresent: true,
      bundleInputSupported: true,
      oldDirectRootCallRemoved: true,
      closeoutRegistered: false,
      focusedProofRegistered: true,
      lineCountDecreased: true,
    }),
    missingProofRegistration: evaluateSourceOnceOverOrchestrationFixture({
      wrapperDelegationPresent: true,
      bundleInputSupported: true,
      oldDirectRootCallRemoved: true,
      closeoutRegistered: true,
      focusedProofRegistered: false,
      lineCountDecreased: true,
    }),
    noLineDrop: evaluateSourceOnceOverOrchestrationFixture({
      wrapperDelegationPresent: true,
      bundleInputSupported: true,
      oldDirectRootCallRemoved: true,
      closeoutRegistered: true,
      focusedProofRegistered: true,
      lineCountDecreased: false,
    }),
  }
  return {
    ok: healthy.ok && Object.values(rejected).every(result => result.ok === false),
    healthy,
    rejected,
    dogfoodInvariant: 'Source Once-Over orchestration accepts bundled domain inputs and rejects missing wrapper delegation, missing bundle support, old direct root calls, missing closeout, missing focused proof registration, and no line-count reduction.',
  }
}

function flattenSourceOnceOverBundles(input = {}) {
  const output = { ...input }
  for (const [key, value] of Object.entries(input || {})) {
    if (!key.endsWith('Bundle') || !value || typeof value !== 'object' || Array.isArray(value)) continue
    Object.assign(output, value)
  }
  return output
}

export function evaluateFoundationVerifierSourceOnceOverProgression(input = {}) {
  let {
    activeSprintAtOrPast = () => false,
    autoDeployRollback,
    autoDeployRollbackApproval,
    autoDeployRollbackApprovalValidation,
    autoDeployRollbackPlanReview,
    autoDeployRollbackPlanSource,
    autoDeployRollbackRunnerSource,
    autoDeployRollbackScriptSource,
    autoDeployRollbackSource,
    autoDeployRollbackSynthetic,
    avatarImport,
    avatarImportApproval,
    avatarImportApprovalValidation,
    avatarImportPlanReview,
    avatarImportPlanSource,
    avatarImportScriptSource,
    avatarImportSnapshot,
    avatarImportSource,
    avatarImportSynthetic,
    avatarRegistryReadmeSource,
    brandStack,
    brandStackApproval,
    brandStackApprovalValidation,
    brandStackPlanReview,
    brandStackPlanSource,
    brandStackScriptSource,
    brandStackSource,
    brandStackSynthetic,
    buildLogAutoDeployRollbackBuild,
    buildLogAvatarImportBuild,
    buildLogBrandStackBuild,
    buildLogDecisionRestrictedQueueBuild,
    buildLogFoundationUiCompleteBuild,
    buildLogMarketingSourceMapBuild,
    buildLogPerUserChangelogBuild,
    buildLogSourceCoverageCloseoutBuild,
    buildLogSourceExtractionCoverageBuild,
    buildLogSourceMaturityGridBuild,
    buildLogStrategyHubMeetingReadyBuild,
    buildLogTierBehavioralCompletionBuild,
    buildLogVerificationRunsBuild,
    currentPlan = '',
    currentState = '',
    currentStateMentionsActiveBlockerOrLater,
    decisionRestrictedQueue,
    decisionRestrictedQueueApproval,
    decisionRestrictedQueueApprovalValidation,
    decisionRestrictedQueuePlanReview,
    decisionRestrictedQueuePlanSource,
    decisionRestrictedQueueScriptSource,
    decisionRestrictedQueueSource,
    decisionRestrictedQueueSynthetic,
    extractRunHardening,
    foundationBrandStack,
    foundationCurrentSprintSource,
    foundationCurrentSprintStatus,
    foundationDbWithBacklogSeedSource,
    foundationFrontendSource,
    foundationHub = {},
    foundationJobsSource,
    foundationMarketingSourceMap,
    foundationPerUserChangelog,
    foundationRestrictedDecisionQueue,
    foundationSourceCoverageCloseout,
    foundationSourceExtractionCoverage,
    foundationSourceLifecycle = {},
    foundationSourceMaturityGrid,
    foundationSourceRoutesSource,
    foundationStylesSource,
    foundationTierBehavioralCompletion,
    foundationUiComplete,
    foundationUiCompleteApproval,
    foundationUiCompleteApprovalValidation,
    foundationUiCompletePlanReview,
    foundationUiCompletePlanSource,
    foundationUiCompleteScriptSource,
    foundationUiCompleteSource,
    foundationUiCompleteSynthetic,
    foundationVerificationRuns,
    foundationVerifySource,
    marketmastersStrategySource,
    marketingSourceMap,
    marketingSourceMapApproval,
    marketingSourceMapApprovalValidation,
    marketingSourceMapNoteSource,
    marketingSourceMapPlanReview,
    marketingSourceMapPlanSource,
    marketingSourceMapScriptSource,
    marketingSourceMapSource,
    marketingSourceMapSynthetic,
    packageJson = {},
    perUserChangelog,
    perUserChangelogApproval,
    perUserChangelogApprovalValidation,
    perUserChangelogPlanReview,
    perUserChangelogPlanSource,
    perUserChangelogScriptSource,
    perUserChangelogSource,
    perUserChangelogSynthetic,
    securityAccessSource,
    serverRouteSource,
    sharedCandidateExtractionSource,
    sourceCoverageCloseout,
    sourceCoverageCloseoutApproval,
    sourceCoverageCloseoutApprovalValidation,
    sourceCoverageCloseoutPlanReview,
    sourceCoverageCloseoutPlanSource,
    sourceCoverageCloseoutScriptSource,
    sourceCoverageCloseoutSource,
    sourceCoverageCloseoutSynthetic,
    sourceCrawlStoreOwnershipSource,
    sourceExtractionCoverage,
    sourceExtractionCoverageApproval,
    sourceExtractionCoverageApprovalValidation,
    sourceExtractionCoveragePlanReview,
    sourceExtractionCoveragePlanSource,
    sourceExtractionCoverageScriptSource,
    sourceExtractionCoverageSource,
    sourceExtractionCoverageSynthetic,
    sourceExtractionGapFollowup,
    sourceMaturityGapFollowup,
    sourceMaturityGrid,
    sourceMaturityGridApproval,
    sourceMaturityGridApprovalValidation,
    sourceMaturityGridPlanReview,
    sourceMaturityGridPlanSource,
    sourceMaturityGridScriptSource,
    sourceMaturityGridSource,
    sourceMaturityGridSynthetic,
    sourceOnceOverCardsHaveVerifiedCloseouts,
    strategicExecutionHtmlSource,
    strategicExecutionUiSource,
    strategyHubMeetingReady,
    strategyHubMeetingReadyApproval,
    strategyHubMeetingReadyApprovalValidation,
    strategyHubMeetingReadyPlanReview,
    strategyHubMeetingReadyPlanSource,
    strategyHubMeetingReadyScriptSource,
    strategyHubMeetingReadySource,
    strategyHubMeetingReadySynthetic,
    strategySharedCommsRouteSource,
    tierBehavioralCompletion,
    tierBehavioralCompletionApproval,
    tierBehavioralCompletionApprovalValidation,
    tierBehavioralCompletionPlanReview,
    tierBehavioralCompletionPlanSource,
    tierBehavioralCompletionScriptSource,
    tierBehavioralCompletionSource,
    tierBehavioralCompletionSynthetic,
    verificationRuns,
    verificationRunsApproval,
    verificationRunsApprovalValidation,
    verificationRunsPlanReview,
    verificationRunsPlanSource,
    verificationRunsScriptSource,
    verificationRunsSource,
    verificationRunsSynthetic,
  } = input
  if (typeof activeSprintAtOrPast !== 'function') activeSprintAtOrPast = () => false
  if (typeof currentStateMentionsActiveBlockerOrLater !== 'function') {
    currentStateMentionsActiveBlockerOrLater = (...snippets) => snippets.some(snippet => String(currentState || '').includes(snippet))
  }
  const checks = []
  const strategyHubMeetingReadyBuildLogExact = buildLogStrategyHubMeetingReadyBuild?.backlogIds?.length === 1 &&
    buildLogStrategyHubMeetingReadyBuild.backlogIds.includes(STRATEGY_HUB_MEETING_READY_CARD_ID) &&
    [
      AVATAR_IMPORT_CARD_ID,
      'INTEL-SCOPER-001',
      'STRATEGIC-INTEL-001',
    ].every(id => (buildLogStrategyHubMeetingReadyBuild.mentionedBacklogIds || []).includes(id)) &&
    [
      AVATAR_IMPORT_CARD_ID,
      'INTEL-SCOPER-001',
      'STRATEGIC-INTEL-001',
    ].every(id => !(buildLogStrategyHubMeetingReadyBuild.backlogIds || []).includes(id))
  const avatarImportBuildLogExact = buildLogAvatarImportBuild?.backlogIds?.length === 1 &&
    buildLogAvatarImportBuild.backlogIds.includes(AVATAR_IMPORT_CARD_ID) &&
    [
      AUTO_DEPLOY_ROLLBACK_CARD_ID,
      'AVATAR-001',
      'MARKETING-PIPELINE-REBUILD-001',
      'BRAND-STACK-001',
    ].every(id => (buildLogAvatarImportBuild.mentionedBacklogIds || []).includes(id)) &&
    [
      AUTO_DEPLOY_ROLLBACK_CARD_ID,
      'AVATAR-001',
      'MARKETING-PIPELINE-REBUILD-001',
      'BRAND-STACK-001',
    ].every(id => !(buildLogAvatarImportBuild.backlogIds || []).includes(id))
  const autoDeployRollbackBuildLogExact = buildLogAutoDeployRollbackBuild?.backlogIds?.length === 1 &&
    buildLogAutoDeployRollbackBuild.backlogIds.includes(AUTO_DEPLOY_ROLLBACK_CARD_ID) &&
    [
      'REPLY-WATCHING-LOOP-001',
      'SYSTEM-010-GHOST-CLOSEOUT-001',
      'PROCESS-HOOKS-002',
    ].every(id => (buildLogAutoDeployRollbackBuild.mentionedBacklogIds || []).includes(id)) &&
    [
      'REPLY-WATCHING-LOOP-001',
      'SYSTEM-010-GHOST-CLOSEOUT-001',
      'PROCESS-HOOKS-002',
    ].every(id => !(buildLogAutoDeployRollbackBuild.backlogIds || []).includes(id))
  const sourceMaturityGridBuildLogExact = buildLogSourceMaturityGridBuild?.backlogIds?.length === 1 &&
    buildLogSourceMaturityGridBuild.backlogIds.includes(SOURCE_MATURITY_GRID_CARD_ID) &&
    [
      SOURCE_EXTRACTION_COVERAGE_CARD_ID,
      'SOURCE-COVERAGE-CLOSEOUT-001',
      'MARKETING-SOURCE-MAP-001',
      'FOUNDATION-UI-COMPLETE-001',
    ].every(id => (buildLogSourceMaturityGridBuild.mentionedBacklogIds || []).includes(id)) &&
    [
      SOURCE_EXTRACTION_COVERAGE_CARD_ID,
      'SOURCE-COVERAGE-CLOSEOUT-001',
      'MARKETING-SOURCE-MAP-001',
      'FOUNDATION-UI-COMPLETE-001',
    ].every(id => !(buildLogSourceMaturityGridBuild.backlogIds || []).includes(id))
  const sourceExtractionCoverageBuildLogExact = buildLogSourceExtractionCoverageBuild?.backlogIds?.length === 1 &&
    buildLogSourceExtractionCoverageBuild.backlogIds.includes(SOURCE_EXTRACTION_COVERAGE_CARD_ID) &&
    [
      SOURCE_MATURITY_GRID_CARD_ID,
      SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
      EXTRACT_RUN_HARDENING_CARD_ID,
      'FOUNDATION-UI-COMPLETE-001',
    ].every(id => (buildLogSourceExtractionCoverageBuild.mentionedBacklogIds || []).includes(id)) &&
    [
      SOURCE_MATURITY_GRID_CARD_ID,
      SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
      EXTRACT_RUN_HARDENING_CARD_ID,
      'FOUNDATION-UI-COMPLETE-001',
    ].every(id => !(buildLogSourceExtractionCoverageBuild.backlogIds || []).includes(id))
  const sourceCoverageCloseoutBuildLogExact = buildLogSourceCoverageCloseoutBuild?.backlogIds?.length === 1 &&
    buildLogSourceCoverageCloseoutBuild.backlogIds.includes(SOURCE_COVERAGE_CLOSEOUT_CARD_ID) &&
    [
      SOURCE_MATURITY_GRID_CARD_ID,
      SOURCE_EXTRACTION_COVERAGE_CARD_ID,
      SOURCE_EXTRACT_GAP_FOLLOWUP_CARD_ID,
      SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID,
      MARKETING_SOURCE_MAP_CARD_ID,
      'FOUNDATION-UI-COMPLETE-001',
    ].every(id => (buildLogSourceCoverageCloseoutBuild.mentionedBacklogIds || []).includes(id)) &&
    [
      SOURCE_MATURITY_GRID_CARD_ID,
      SOURCE_EXTRACTION_COVERAGE_CARD_ID,
      SOURCE_EXTRACT_GAP_FOLLOWUP_CARD_ID,
      SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID,
      MARKETING_SOURCE_MAP_CARD_ID,
      'FOUNDATION-UI-COMPLETE-001',
    ].every(id => !(buildLogSourceCoverageCloseoutBuild.backlogIds || []).includes(id))
  const marketingSourceMapBuildLogExact = buildLogMarketingSourceMapBuild?.backlogIds?.length === 1 &&
    buildLogMarketingSourceMapBuild.backlogIds.includes(MARKETING_SOURCE_MAP_CARD_ID) &&
    [
      AVATAR_IMPORT_CARD_ID,
      'SOURCE-016',
      BRAND_STACK_CARD_ID,
      'MARKETING-PIPELINE-REBUILD-001',
      'FOUNDATION-UI-COMPLETE-001',
    ].every(id => (buildLogMarketingSourceMapBuild.mentionedBacklogIds || []).includes(id)) &&
    [
      AVATAR_IMPORT_CARD_ID,
      'SOURCE-016',
      BRAND_STACK_CARD_ID,
      'MARKETING-PIPELINE-REBUILD-001',
      'FOUNDATION-UI-COMPLETE-001',
    ].every(id => !(buildLogMarketingSourceMapBuild.backlogIds || []).includes(id))
  const brandStackBuildLogExact = buildLogBrandStackBuild?.backlogIds?.length === 1 &&
    buildLogBrandStackBuild.backlogIds.includes(BRAND_STACK_CARD_ID) &&
    [
      MARKETING_SOURCE_MAP_CARD_ID,
      TIER_BEHAVIORAL_COMPLETION_CARD_ID,
      'MARKETING-PIPELINE-REBUILD-001',
      'DECISION-RESTRICTED-QUEUE-001',
      'FOUNDATION-UI-COMPLETE-001',
    ].every(id => (buildLogBrandStackBuild.mentionedBacklogIds || []).includes(id)) &&
    [
      MARKETING_SOURCE_MAP_CARD_ID,
      TIER_BEHAVIORAL_COMPLETION_CARD_ID,
      'MARKETING-PIPELINE-REBUILD-001',
      'DECISION-RESTRICTED-QUEUE-001',
      'FOUNDATION-UI-COMPLETE-001',
    ].every(id => !(buildLogBrandStackBuild.backlogIds || []).includes(id))
  const tierBehavioralCompletionBuildLogExact = buildLogTierBehavioralCompletionBuild?.backlogIds?.length === 1 &&
    buildLogTierBehavioralCompletionBuild.backlogIds.includes(TIER_BEHAVIORAL_COMPLETION_CARD_ID) &&
    [
      'SECURITY-BEHAVIOR-PROOF-001',
      'VERIFICATION-RUNS-001',
      'PER-USER-CHANGELOG-001',
      'DECISION-RESTRICTED-QUEUE-001',
      'FOUNDATION-UI-COMPLETE-001',
    ].every(id => (buildLogTierBehavioralCompletionBuild.mentionedBacklogIds || []).includes(id)) &&
    [
      'SECURITY-BEHAVIOR-PROOF-001',
      'VERIFICATION-RUNS-001',
      'PER-USER-CHANGELOG-001',
      'DECISION-RESTRICTED-QUEUE-001',
      'FOUNDATION-UI-COMPLETE-001',
    ].every(id => !(buildLogTierBehavioralCompletionBuild.backlogIds || []).includes(id))
  const verificationRunsBuildLogExact = buildLogVerificationRunsBuild?.backlogIds?.length === 1 &&
    buildLogVerificationRunsBuild.backlogIds.includes(VERIFICATION_RUNS_CARD_ID) &&
    [
      VERIFICATION_RUNS_NEXT_CARD_ID,
      'DECISION-RESTRICTED-QUEUE-001',
      'FOUNDATION-UI-COMPLETE-001',
      'REPLY-WATCHING-LOOP-001',
    ].every(id => (buildLogVerificationRunsBuild.mentionedBacklogIds || []).includes(id)) &&
    [
      VERIFICATION_RUNS_NEXT_CARD_ID,
      'DECISION-RESTRICTED-QUEUE-001',
      'FOUNDATION-UI-COMPLETE-001',
      'REPLY-WATCHING-LOOP-001',
    ].every(id => !(buildLogVerificationRunsBuild.backlogIds || []).includes(id))
  const perUserChangelogBuildLogExact = buildLogPerUserChangelogBuild?.backlogIds?.length === 1 &&
    buildLogPerUserChangelogBuild.backlogIds.includes(PER_USER_CHANGELOG_CARD_ID) &&
    [
      PER_USER_CHANGELOG_NEXT_CARD_ID,
      'FOUNDATION-UI-COMPLETE-001',
      'REPLY-WATCHING-LOOP-001',
      'FOUNDATION-USERS-001',
    ].every(id => (buildLogPerUserChangelogBuild.mentionedBacklogIds || []).includes(id)) &&
    [
      PER_USER_CHANGELOG_NEXT_CARD_ID,
      'FOUNDATION-UI-COMPLETE-001',
      'REPLY-WATCHING-LOOP-001',
      'FOUNDATION-USERS-001',
    ].every(id => !(buildLogPerUserChangelogBuild.backlogIds || []).includes(id))
  const decisionRestrictedQueueBuildLogExact = buildLogDecisionRestrictedQueueBuild?.backlogIds?.length === 1 &&
    buildLogDecisionRestrictedQueueBuild.backlogIds.includes(DECISION_RESTRICTED_QUEUE_CARD_ID) &&
    [
      DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID,
      'REPLY-WATCHING-LOOP-001',
      'MARKETING-PIPELINE-REBUILD-001',
      'TELEGRAM-BOTS-REBUILD-001',
      'INTEL-DIRECTORS-REBUILD-001',
    ].every(id => (buildLogDecisionRestrictedQueueBuild.mentionedBacklogIds || []).includes(id)) &&
    [
      DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID,
      'REPLY-WATCHING-LOOP-001',
      'MARKETING-PIPELINE-REBUILD-001',
      'TELEGRAM-BOTS-REBUILD-001',
      'INTEL-DIRECTORS-REBUILD-001',
    ].every(id => !(buildLogDecisionRestrictedQueueBuild.backlogIds || []).includes(id))
  const foundationUiCompleteBuildLogExact = buildLogFoundationUiCompleteBuild?.backlogIds?.length === 1 &&
    buildLogFoundationUiCompleteBuild.backlogIds.includes(FOUNDATION_UI_COMPLETE_CARD_ID) &&
    [
      SOURCE_MATURITY_GRID_CARD_ID,
      SOURCE_EXTRACTION_COVERAGE_CARD_ID,
      SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
      MARKETING_SOURCE_MAP_CARD_ID,
      BRAND_STACK_CARD_ID,
      TIER_BEHAVIORAL_COMPLETION_CARD_ID,
      VERIFICATION_RUNS_CARD_ID,
      PER_USER_CHANGELOG_CARD_ID,
      DECISION_RESTRICTED_QUEUE_CARD_ID,
      'REPLY-WATCHING-LOOP-001',
    ].every(id => (buildLogFoundationUiCompleteBuild.mentionedBacklogIds || []).includes(id)) &&
    [
      SOURCE_MATURITY_GRID_CARD_ID,
      SOURCE_EXTRACTION_COVERAGE_CARD_ID,
      SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
      MARKETING_SOURCE_MAP_CARD_ID,
      BRAND_STACK_CARD_ID,
      TIER_BEHAVIORAL_COMPLETION_CARD_ID,
      VERIFICATION_RUNS_CARD_ID,
      PER_USER_CHANGELOG_CARD_ID,
      DECISION_RESTRICTED_QUEUE_CARD_ID,
      'REPLY-WATCHING-LOOP-001',
    ].every(id => !(buildLogFoundationUiCompleteBuild.backlogIds || []).includes(id))
  ensure(
    checks,
    strategyHubMeetingReady?.lane === 'done' &&
      String(strategyHubMeetingReady?.statusNote || '').includes(STRATEGY_HUB_MEETING_READY_CLOSEOUT_KEY) &&
      packageJson.scripts?.['process:strategy-hub-meeting-ready-check'] === `node --env-file-if-exists=.env ${STRATEGY_HUB_MEETING_READY_SCRIPT_PATH}` &&
      strategyHubMeetingReadyApprovalValidation.ok &&
      strategyHubMeetingReadyApprovalValidation.mode === 'v2' &&
      strategyHubMeetingReadyApproval.cardId === STRATEGY_HUB_MEETING_READY_CARD_ID &&
      Number(strategyHubMeetingReadyApproval.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
      strategyHubMeetingReadyApproval.approvedPlanRef === STRATEGY_HUB_MEETING_READY_PLAN_PATH &&
      strategyHubMeetingReadyPlanReview.status === 'pass' &&
      strategyHubMeetingReadyPlanReview.score >= PLAN_CRITIC_MIN_PASS_SCORE &&
      strategyHubMeetingReadySynthetic.ok &&
      strategyHubMeetingReadySynthetic.summary.pressureCardCount >= 4 &&
      strategyHubMeetingReadySynthetic.summary.agendaItemCount >= 5 &&
      strategyHubMeetingReadySynthetic.summary.hiddenOperationalRoutes === 1 &&
      strategyHubMeetingReadySynthetic.summary.variantChanged === true &&
      strategyHubMeetingReadySynthetic.summary.substringOnlyProofRejected === true &&
      includesAll(strategyHubMeetingReadySource, [
        'buildStrategyMeetingReadySnapshot',
        'buildSyntheticStrategyHubMeetingReadyProof',
        'isStrategyHubMeetingRoute',
        'changed_values_affect_packet',
        'hiddenOperationalRoutes',
      ]) &&
      includesAll(strategyHubMeetingReadyScriptSource, [
        STRATEGY_HUB_MEETING_READY_SUMMARY_MARKER,
        'Strategy meeting packet behavior proof passes',
        'Current Sprint active blocker advanced through Avatar import',
      ]) &&
      includesAll(strategyHubMeetingReadyPlanSource, [
        STRATEGY_HUB_MEETING_READY_CLOSEOUT_KEY,
        'real function path',
        'changed-value',
        'Substring-only proof is rejected',
      ]) &&
      includesAll(strategySharedCommsRouteSource, [
        'buildStrategyMeetingReadySnapshot',
        'meetingReady',
        'buildStrategyHubV2Payload',
      ]) &&
      includesAll(strategicExecutionHtmlSource, [
        'data-section="meeting"',
        'Meeting Packet',
      ]) &&
      includesAll(strategicExecutionUiSource, [
        'renderMeetingReady',
        'renderMeetingPacketPreview',
        'meetingReady',
        'strategy-v2-meeting-agenda',
      ]) &&
      includesAll(foundationStylesSource, [
        'strategy-v2-meeting-grid',
        'strategy-v2-agenda-item',
        'strategy-v2-meeting-proof',
      ]) &&
      includesAll(foundationCurrentSprintSource, [
        STRATEGY_HUB_MEETING_READY_CLOSEOUT_KEY,
        'AVATAR_IMPORT_CARD_ID',
        'process:strategy-hub-meeting-ready-check',
      ]) &&
      buildLogStrategyHubMeetingReadyBuild?.operatorCloseout === true &&
      strategyHubMeetingReadyBuildLogExact &&
      foundationCurrentSprintStatus.status === 'healthy' &&
      foundationHub.currentSprint?.status === 'healthy' &&
      activeSprintAtOrPast([AVATAR_IMPORT_CARD_ID, AUTO_DEPLOY_ROLLBACK_CARD_ID, SOURCE_MATURITY_GRID_CARD_ID, SOURCE_EXTRACTION_COVERAGE_CARD_ID, SOURCE_COVERAGE_CLOSEOUT_CARD_ID, MARKETING_SOURCE_MAP_CARD_ID, BRAND_STACK_CARD_ID, TIER_BEHAVIORAL_COMPLETION_CARD_ID, 'VERIFICATION-RUNS-001', VERIFICATION_RUNS_NEXT_CARD_ID, PER_USER_CHANGELOG_NEXT_CARD_ID, DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID]) &&
      ['scoped', 'done'].includes(avatarImport?.lane) &&
      currentPlan.includes(STRATEGY_HUB_MEETING_READY_CLOSEOUT_KEY) &&
      currentPlan.includes('owner-only Strategy meeting packet') &&
      currentPlan.includes(AVATAR_IMPORT_CARD_ID) &&
      currentState.includes(STRATEGY_HUB_MEETING_READY_CLOSEOUT_KEY) &&
      currentStateMentionsActiveBlockerOrLater('Current sprint active blocker is now `AVATAR-IMPORT-001`') &&
      currentState.includes('meeting packet') &&
      foundationVerifySource.includes('buildSyntheticStrategyHubMeetingReadyProof'),
    'STRATEGY-HUB-MEETING-READY-001 ships an owner-only Strategy meeting packet with behavior proof',
    `lane=${strategyHubMeetingReady?.lane || 'missing'} approval=${strategyHubMeetingReadyApprovalValidation.ok} agenda=${strategyHubMeetingReadySynthetic.summary.agendaItemCount} next=${foundationHub.currentSprint?.activeBlocker?.cardId || 'missing'}`,
  )
  ensure(
    checks,
    avatarImport?.lane === 'done' &&
      String(avatarImport?.statusNote || '').includes(AVATAR_IMPORT_CLOSEOUT_KEY) &&
      packageJson.scripts?.['process:avatar-import-check'] === `node --env-file-if-exists=.env ${AVATAR_IMPORT_SCRIPT_PATH}` &&
      avatarImportApprovalValidation.ok &&
      avatarImportApprovalValidation.mode === 'v2' &&
      avatarImportApproval.cardId === AVATAR_IMPORT_CARD_ID &&
      Number(avatarImportApproval.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
      avatarImportApproval.approvedPlanRef === AVATAR_IMPORT_PLAN_PATH &&
      avatarImportPlanReview.status === 'pass' &&
      avatarImportPlanReview.score >= PLAN_CRITIC_MIN_PASS_SCORE &&
      avatarImportSynthetic.ok &&
      avatarImportSnapshot.status === 'healthy' &&
      avatarImportSnapshot.summary.totalAvatars === MARKETING_AVATAR_EXPECTED_COUNTS.total &&
      avatarImportSnapshot.summary.retainAvatars === MARKETING_AVATAR_EXPECTED_COUNTS.retain &&
      avatarImportSnapshot.summary.attractAvatars === MARKETING_AVATAR_EXPECTED_COUNTS.attract &&
      avatarImportSnapshot.summary.platformBehaviorSections === MARKETING_AVATAR_EXPECTED_COUNTS.total &&
      avatarImportSnapshot.summary.objectionSections === MARKETING_AVATAR_EXPECTED_COUNTS.total &&
      avatarImportSnapshot.summary.buyingSignalSections === MARKETING_AVATAR_EXPECTED_COUNTS.total &&
      foundationHub.marketingAvatarRegistry?.status === 'healthy' &&
      foundationHub.marketingAvatarRegistry?.summary?.totalAvatars === MARKETING_AVATAR_EXPECTED_COUNTS.total &&
      includesAll(avatarImportSource, [
        'parseMarketingAvatarReferenceBrief',
        'buildMarketingAvatarImportSnapshot',
        'buildSyntheticAvatarImportProof',
        'missingFieldRejected',
        'marketingPipelineBuilt: false',
      ]) &&
      includesAll(avatarImportScriptSource, [
        AVATAR_IMPORT_SUMMARY_MARKER,
        'real imported avatar registry snapshot is healthy',
        'Current Sprint active blocker advanced to Auto Deploy rollback',
      ]) &&
      includesAll(avatarImportPlanSource, [
        AVATAR_IMPORT_CLOSEOUT_KEY,
        'real registry parser/function path',
        'wrong-count',
        'missing-required-field',
        'Substring-only proof is rejected',
      ]) &&
      includesAll(avatarRegistryReadmeSource, [
        'source/old-bcrew-buddy/retain-avatars.md',
        'source/old-bcrew-buddy/attract-avatars.md',
        'optional overlays',
      ]) &&
      includesAll(serverRouteSource, [
        'buildMarketingAvatarImportSnapshot',
        'marketingAvatarRegistry',
        'MARKETING_AVATAR_REFERENCE_BRIEF_PATH',
      ]) &&
      includesAll(foundationCurrentSprintSource, [
        AVATAR_IMPORT_CLOSEOUT_KEY,
        'activeBlockerCardId: AUTO_DEPLOY_ROLLBACK_CARD_ID',
        'process:avatar-import-check',
      ]) &&
      buildLogAvatarImportBuild?.operatorCloseout === true &&
      avatarImportBuildLogExact &&
      foundationCurrentSprintStatus.status === 'healthy' &&
      foundationHub.currentSprint?.status === 'healthy' &&
      activeSprintAtOrPast([AUTO_DEPLOY_ROLLBACK_CARD_ID, SOURCE_MATURITY_GRID_CARD_ID, SOURCE_EXTRACTION_COVERAGE_CARD_ID, SOURCE_COVERAGE_CLOSEOUT_CARD_ID, MARKETING_SOURCE_MAP_CARD_ID, BRAND_STACK_CARD_ID, TIER_BEHAVIORAL_COMPLETION_CARD_ID, 'VERIFICATION-RUNS-001', VERIFICATION_RUNS_NEXT_CARD_ID, PER_USER_CHANGELOG_NEXT_CARD_ID, DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID]) &&
      currentPlan.includes(AVATAR_IMPORT_CLOSEOUT_KEY) &&
      currentPlan.includes('10 RETAIN and 5 ATTRACT avatars') &&
      currentPlan.includes(AUTO_DEPLOY_ROLLBACK_CARD_ID) &&
      currentState.includes(AVATAR_IMPORT_CLOSEOUT_KEY) &&
      currentStateMentionsActiveBlockerOrLater('Current sprint active blocker is now `AUTO-DEPLOY-ROLLBACK-001`') &&
      currentState.includes('15 avatars') &&
      foundationVerifySource.includes('buildSyntheticAvatarImportProof'),
    'AVATAR-IMPORT-001 imports old avatars as governed source-backed registry truth',
    `lane=${avatarImport?.lane || 'missing'} approval=${avatarImportApprovalValidation.ok} avatars=${avatarImportSnapshot.summary.totalAvatars} next=${foundationHub.currentSprint?.activeBlocker?.cardId || 'missing'}`,
  )
  ensure(
    checks,
    autoDeployRollback?.lane === 'done' &&
      String(autoDeployRollback?.statusNote || '').includes(AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY) &&
      packageJson.scripts?.['auto-deploy:rollback'] === `node --env-file-if-exists=.env ${AUTO_DEPLOY_ROLLBACK_RUNNER_PATH}` &&
      packageJson.scripts?.['process:auto-deploy-rollback-check'] === `node --env-file-if-exists=.env ${AUTO_DEPLOY_ROLLBACK_SCRIPT_PATH}` &&
      autoDeployRollbackApprovalValidation.ok &&
      autoDeployRollbackApprovalValidation.mode === 'v2' &&
      autoDeployRollbackApproval.cardId === AUTO_DEPLOY_ROLLBACK_CARD_ID &&
      Number(autoDeployRollbackApproval.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
      autoDeployRollbackApproval.approvedPlanRef === AUTO_DEPLOY_ROLLBACK_PLAN_PATH &&
      autoDeployRollbackPlanReview.status === 'pass' &&
      autoDeployRollbackPlanReview.score >= PLAN_CRITIC_MIN_PASS_SCORE &&
      autoDeployRollbackSynthetic.ok &&
      autoDeployRollbackSynthetic.summary.dirtyWorktreeRejected === true &&
      autoDeployRollbackSynthetic.summary.missingTargetRejected === true &&
      autoDeployRollbackSynthetic.summary.failedHealthRollsBack === true &&
      autoDeployRollbackSynthetic.summary.healthyDeployDoesNotRollback === true &&
      includesAll(autoDeployRollbackSource, [
        'buildAutoDeployPlan',
        'buildAutoDeployHealthStatus',
        'buildRollbackDecision',
        'buildSyntheticAutoDeployRollbackProof',
        'dirty_worktree',
        'failedHealthRollsBack',
      ]) &&
      includesAll(autoDeployRollbackRunnerSource, [
        'isTrue(args.apply)',
        "['merge', '--ff-only', targetRef]",
        'git reset',
        'waitForFoundationHealth',
        'dirtyFiles',
        'AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY',
      ]) &&
      includesAll(autoDeployRollbackScriptSource, [
        AUTO_DEPLOY_ROLLBACK_SUMMARY_MARKER,
        'synthetic deploy rollback proof passes',
        'runner dry-run executes without mutation',
      ]) &&
      includesAll(autoDeployRollbackPlanSource, [
        AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY,
        'previous SHA',
        'dry-run',
        'failed health',
        'Substring-only proof is rejected',
      ]) &&
      includesAll(foundationCurrentSprintSource, [
        AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY,
        'process:auto-deploy-rollback-check',
        'auto-deploy rollback',
      ]) &&
      buildLogAutoDeployRollbackBuild?.operatorCloseout === true &&
      autoDeployRollbackBuildLogExact &&
      foundationCurrentSprintStatus.status === 'healthy' &&
      foundationHub.currentSprint?.status === 'healthy' &&
      activeSprintAtOrPast([AUTO_DEPLOY_ROLLBACK_CARD_ID, SOURCE_MATURITY_GRID_CARD_ID, SOURCE_EXTRACTION_COVERAGE_CARD_ID, SOURCE_COVERAGE_CLOSEOUT_CARD_ID, MARKETING_SOURCE_MAP_CARD_ID, BRAND_STACK_CARD_ID, TIER_BEHAVIORAL_COMPLETION_CARD_ID, 'VERIFICATION-RUNS-001', VERIFICATION_RUNS_NEXT_CARD_ID, PER_USER_CHANGELOG_NEXT_CARD_ID, DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID]) &&
      currentPlan.includes(AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY) &&
      currentPlan.includes('previous SHA') &&
      currentPlan.includes('REPLY-WATCHING-LOOP-001') &&
      currentState.includes(AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY) &&
      currentStateMentionsActiveBlockerOrLater('Current sprint active blocker stays pinned to `AUTO-DEPLOY-ROLLBACK-001`') &&
      currentState.includes('failed health rolls back') &&
      foundationVerifySource.includes('buildSyntheticAutoDeployRollbackProof'),
    'AUTO-DEPLOY-ROLLBACK-001 adds Mac mini deploy rollback behavior proof',
    `lane=${autoDeployRollback?.lane || 'missing'} approval=${autoDeployRollbackApprovalValidation.ok} rollback=${autoDeployRollbackSynthetic.summary.failedHealthRollsBack} next=${foundationHub.currentSprint?.activeBlocker?.cardId || 'missing'}`,
  )
  ensure(
    checks,
    sourceMaturityGrid?.lane === 'done' &&
      String(sourceMaturityGrid?.statusNote || '').includes(SOURCE_MATURITY_GRID_CLOSEOUT_KEY) &&
      ['scoped', 'done'].includes(sourceExtractionCoverage?.lane) &&
      packageJson.scripts?.['process:source-maturity-grid-check'] === `node --env-file-if-exists=.env ${SOURCE_MATURITY_GRID_SCRIPT_PATH}` &&
      sourceMaturityGridApprovalValidation.ok &&
      sourceMaturityGridApprovalValidation.mode === 'v2' &&
      sourceMaturityGridApproval.cardId === SOURCE_MATURITY_GRID_CARD_ID &&
      Number(sourceMaturityGridApproval.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
      sourceMaturityGridApproval.approvedPlanRef === SOURCE_MATURITY_GRID_PLAN_PATH &&
      sourceMaturityGridPlanReview.status === 'pass' &&
      sourceMaturityGridPlanReview.score >= PLAN_CRITIC_MIN_PASS_SCORE &&
      sourceMaturityGridSynthetic.ok &&
      Array.isArray(foundationSourceMaturityGrid.rows) &&
      foundationSourceMaturityGrid.rows.length >= 35 &&
      SOURCE_MATURITY_STAGE_KEYS.every(key => foundationSourceMaturityGrid.stageKeys?.includes(key)) &&
      foundationSourceMaturityGrid.rows.every(row => SOURCE_MATURITY_STAGE_KEYS.every(key => typeof row.stages?.[key]?.ok === 'boolean')) &&
      foundationSourceMaturityGrid.summary?.sourceCount === foundationSourceMaturityGrid.rows.length &&
      Array.isArray(foundationSourceMaturityGrid.topGaps) &&
      foundationSourceMaturityGrid.topGaps.length > 0 &&
      foundationSourceLifecycle.sourceMaturityGrid?.closeoutKey === SOURCE_MATURITY_GRID_CLOSEOUT_KEY &&
      foundationHub.sourceMaturityGrid?.closeoutKey === SOURCE_MATURITY_GRID_CLOSEOUT_KEY &&
      includesAll(sourceMaturityGridSource, [
        'buildSourceMaturityGridSnapshot',
        'SOURCE_MATURITY_STAGE_KEYS',
        'buildSyntheticSourceMaturityGridProof',
        'SOURCE_MATURITY_GRID_CLOSEOUT_KEY',
      ]) &&
      includesAll(sourceMaturityGridScriptSource, [
        SOURCE_MATURITY_GRID_SUMMARY_MARKER,
        'every grid row has seven behavior stage objects',
        'Current Sprint active blocker advanced to extraction coverage',
      ]) &&
      includesAll(sourceMaturityGridPlanSource, [
        SOURCE_MATURITY_GRID_CLOSEOUT_KEY,
        'seven stages',
        'reject substring-only',
        SOURCE_EXTRACTION_COVERAGE_CARD_ID,
      ]) &&
      includesAll(foundationSourceRoutesSource, [
        '/api/foundation/source-maturity-grid',
        'buildSourceMaturityGridSnapshot',
        'sourceMaturityGrid',
      ]) &&
      includesAll(foundationFrontendSource, [
        'renderSourceMaturityGridPanel',
        'sourceMaturityGrid',
        'source-maturity-grid',
      ]) &&
      includesAll(foundationStylesSource, [
        '.source-maturity-panel',
        '.source-maturity-table',
      ]) &&
      includesAll(foundationCurrentSprintSource, [
        'buildFoundationSourceOnceOverSprintSeed',
        FOUNDATION_SOURCE_ONCE_OVER_SPRINT_ID,
        SOURCE_EXTRACTION_COVERAGE_CARD_ID,
      ]) &&
      buildLogSourceMaturityGridBuild?.operatorCloseout === true &&
      sourceMaturityGridBuildLogExact &&
      foundationCurrentSprintStatus.status === 'healthy' &&
      foundationHub.currentSprint?.status === 'healthy' &&
      activeSprintAtOrPast([SOURCE_EXTRACTION_COVERAGE_CARD_ID, SOURCE_COVERAGE_CLOSEOUT_CARD_ID, MARKETING_SOURCE_MAP_CARD_ID, BRAND_STACK_CARD_ID, TIER_BEHAVIORAL_COMPLETION_CARD_ID, 'VERIFICATION-RUNS-001', VERIFICATION_RUNS_NEXT_CARD_ID, PER_USER_CHANGELOG_NEXT_CARD_ID, DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID]) &&
      currentPlan.includes(SOURCE_MATURITY_GRID_CLOSEOUT_KEY) &&
      currentPlan.includes('Foundation Source Once-Over') &&
      currentPlan.includes(SOURCE_EXTRACTION_COVERAGE_CARD_ID) &&
      currentState.includes(SOURCE_MATURITY_GRID_CLOSEOUT_KEY) &&
      currentState.includes('Source Once-Over is closed for v1') &&
      currentState.includes('seven-stage source maturity grid') &&
      foundationVerifySource.includes('buildSyntheticSourceMaturityGridProof'),
    'SOURCE-MATURITY-GRID-001 exposes source depth and advances the Source Once-Over sprint',
    `lane=${sourceMaturityGrid?.lane || 'missing'} approval=${sourceMaturityGridApprovalValidation.ok} rows=${foundationSourceMaturityGrid.rows?.length || 0} next=${foundationHub.currentSprint?.activeBlocker?.cardId || 'missing'}`,
  )
  ensure(
    checks,
    sourceExtractionCoverage?.lane === 'done' &&
      String(sourceExtractionCoverage?.statusNote || '').includes(SOURCE_EXTRACTION_COVERAGE_CLOSEOUT_KEY) &&
      ['scoped', 'done'].includes(sourceCoverageCloseout?.lane) &&
      packageJson.scripts?.['process:source-extraction-coverage-check'] === `node --env-file-if-exists=.env ${SOURCE_EXTRACTION_COVERAGE_SCRIPT_PATH}` &&
      sourceExtractionCoverageApprovalValidation.ok &&
      sourceExtractionCoverageApprovalValidation.mode === 'v2' &&
      sourceExtractionCoverageApproval.cardId === SOURCE_EXTRACTION_COVERAGE_CARD_ID &&
      Number(sourceExtractionCoverageApproval.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
      sourceExtractionCoverageApproval.approvedPlanRef === SOURCE_EXTRACTION_COVERAGE_PLAN_PATH &&
      sourceExtractionCoveragePlanReview.status === 'pass' &&
      sourceExtractionCoveragePlanReview.score >= PLAN_CRITIC_MIN_PASS_SCORE &&
      sourceExtractionCoverageSynthetic.ok &&
      Array.isArray(foundationSourceExtractionCoverage.rows) &&
      foundationSourceExtractionCoverage.rows.length >= 35 &&
      foundationSourceExtractionCoverage.rows.every(row => SOURCE_EXTRACTION_COVERAGE_STATES.includes(row.extractionState) && String(row.reason || '').trim()) &&
      foundationSourceExtractionCoverage.summary?.sourceCount === foundationSourceExtractionCoverage.rows.length &&
      Number(foundationSourceExtractionCoverage.summary?.targetCount || 0) >= 12 &&
      typeof foundationSourceExtractionCoverage.summary?.last24hRuns === 'number' &&
      typeof foundationSourceExtractionCoverage.summary?.last24hItems === 'number' &&
      Array.isArray(foundationSourceExtractionCoverage.topAttention) &&
      (
        foundationSourceExtractionCoverage.topAttention.length > 0 ||
        (
          Number(foundationSourceExtractionCoverage.summary?.sourcesWithFailure || 0) === 0 &&
          Number(foundationSourceExtractionCoverage.summary?.sourcesPending || 0) === 0
        )
      ) &&
      foundationSourceLifecycle.sourceExtractionCoverage?.closeoutKey === SOURCE_EXTRACTION_COVERAGE_CLOSEOUT_KEY &&
      foundationHub.sourceExtractionCoverage?.closeoutKey === SOURCE_EXTRACTION_COVERAGE_CLOSEOUT_KEY &&
      extractRunHardening?.lane === 'done' &&
      String(extractRunHardening?.statusNote || '').includes(EXTRACT_RUN_HARDENING_CLOSEOUT_KEY) &&
      includesAll(sourceExtractionCoverageSource, [
        'buildSourceExtractionCoverageSnapshot',
        'SOURCE_EXTRACTION_COVERAGE_STATES',
        'buildSyntheticSourceExtractionCoverageProof',
        'SOURCE_EXTRACTION_COVERAGE_CLOSEOUT_KEY',
      ]) &&
      includesAll(sourceExtractionCoverageScriptSource, [
        SOURCE_EXTRACTION_COVERAGE_SUMMARY_MARKER,
        'every source row has one allowed extraction state',
        'Current Sprint active blocker advanced to source coverage closeout',
      ]) &&
      includesAll(sourceExtractionCoveragePlanSource, [
        SOURCE_EXTRACTION_COVERAGE_CLOSEOUT_KEY,
        'source-level extraction coverage',
        'EXTRACT-RUN-HARDENING-001',
        SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
      ]) &&
      includesAll(foundationSourceRoutesSource, [
        '/api/foundation/source-extraction-coverage',
        'buildSourceExtractionCoverageSnapshot',
        'sourceExtractionCoverage',
      ]) &&
      includesAll(sourceCrawlStoreOwnershipSource, [
        'last24hItems',
        'runsLast24h',
        'last24h',
      ]) &&
      includesAll(foundationFrontendSource, [
        'renderSourceExtractionCoveragePanel',
        'sourceExtractionCoverage',
        'source-extraction-coverage',
      ]) &&
      includesAll(foundationStylesSource, [
        '.source-extraction-panel',
        '.source-extraction-table',
      ]) &&
      includesAll(foundationCurrentSprintSource, [
        'sourceExtractionCoverageStage',
        'SOURCE_EXTRACTION_COVERAGE_CLOSEOUT_KEY',
        SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
      ]) &&
      buildLogSourceExtractionCoverageBuild?.operatorCloseout === true &&
      sourceExtractionCoverageBuildLogExact &&
      foundationCurrentSprintStatus.status === 'healthy' &&
      foundationHub.currentSprint?.status === 'healthy' &&
      activeSprintAtOrPast([SOURCE_COVERAGE_CLOSEOUT_CARD_ID, MARKETING_SOURCE_MAP_CARD_ID, BRAND_STACK_CARD_ID, TIER_BEHAVIORAL_COMPLETION_CARD_ID, 'VERIFICATION-RUNS-001', VERIFICATION_RUNS_NEXT_CARD_ID, PER_USER_CHANGELOG_NEXT_CARD_ID, DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID]) &&
      currentPlan.includes(SOURCE_EXTRACTION_COVERAGE_CLOSEOUT_KEY) &&
      currentPlan.includes(SOURCE_COVERAGE_CLOSEOUT_CARD_ID) &&
      currentState.includes(SOURCE_EXTRACTION_COVERAGE_CLOSEOUT_KEY) &&
      currentState.includes('Source Once-Over is closed for v1') &&
      currentState.includes('source-level extraction coverage') &&
      foundationVerifySource.includes('buildSyntheticSourceExtractionCoverageProof'),
    'SOURCE-EXTRACTION-COVERAGE-001 exposes source-level extraction coverage and advances the Source Once-Over sprint',
    `lane=${sourceExtractionCoverage?.lane || 'missing'} approval=${sourceExtractionCoverageApprovalValidation.ok} rows=${foundationSourceExtractionCoverage.rows?.length || 0} next=${foundationHub.currentSprint?.activeBlocker?.cardId || 'missing'}`,
  )
  ensure(
    checks,
    sourceCoverageCloseout?.lane === 'done' &&
      String(sourceCoverageCloseout?.statusNote || '').includes(SOURCE_COVERAGE_CLOSEOUT_CLOSEOUT_KEY) &&
      ['scoped', 'executing', 'done'].includes(sourceExtractionGapFollowup?.lane) &&
      ['scoped', 'done'].includes(sourceMaturityGapFollowup?.lane) &&
      ['scoped', 'done'].includes(marketingSourceMap?.lane) &&
      packageJson.scripts?.['process:source-coverage-closeout-check'] === `node --env-file-if-exists=.env ${SOURCE_COVERAGE_CLOSEOUT_SCRIPT_PATH}` &&
      sourceCoverageCloseoutApprovalValidation.ok &&
      sourceCoverageCloseoutApprovalValidation.mode === 'v2' &&
      sourceCoverageCloseoutApproval.cardId === SOURCE_COVERAGE_CLOSEOUT_CARD_ID &&
      Number(sourceCoverageCloseoutApproval.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
      sourceCoverageCloseoutApproval.approvedPlanRef === SOURCE_COVERAGE_CLOSEOUT_PLAN_PATH &&
      sourceCoverageCloseoutPlanReview.status === 'pass' &&
      sourceCoverageCloseoutPlanReview.score >= PLAN_CRITIC_MIN_PASS_SCORE &&
      sourceCoverageCloseoutSynthetic.ok &&
      Array.isArray(foundationSourceCoverageCloseout.rows) &&
      foundationSourceCoverageCloseout.rows.length >= 35 &&
      foundationSourceCoverageCloseout.rows.every(row =>
        SOURCE_COVERAGE_CLOSEOUT_DECISIONS.includes(row.decision) &&
          String(row.reason || '').trim() &&
          ['closed', 'routed'].includes(row.status)
      ) &&
      foundationSourceCoverageCloseout.summary?.sourceCount === foundationSourceCoverageCloseout.rows.length &&
      foundationSourceCoverageCloseout.summary?.unresolvedDecisionCount === 0 &&
      foundationSourceCoverageCloseout.rows
        .filter(row => row.decision === 'advance_extraction_gap')
        .every(row => row.nextCardId === SOURCE_EXTRACT_GAP_FOLLOWUP_CARD_ID) &&
      foundationSourceCoverageCloseout.rows
        .filter(row => row.decision === 'advance_maturity_gap')
        .every(row => row.nextCardId === SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID) &&
      foundationSourceLifecycle.sourceCoverageCloseout?.closeoutKey === SOURCE_COVERAGE_CLOSEOUT_CLOSEOUT_KEY &&
      foundationHub.sourceCoverageCloseout?.closeoutKey === SOURCE_COVERAGE_CLOSEOUT_CLOSEOUT_KEY &&
      includesAll(sourceCoverageCloseoutSource, [
        'buildSourceCoverageCloseoutSnapshot',
        'SOURCE_COVERAGE_CLOSEOUT_DECISIONS',
        'buildSyntheticSourceCoverageCloseoutProof',
        'SOURCE_COVERAGE_CLOSEOUT_CLOSEOUT_KEY',
      ]) &&
      includesAll(sourceCoverageCloseoutScriptSource, [
        SOURCE_COVERAGE_CLOSEOUT_SUMMARY_MARKER,
        'every source row has one allowed closeout decision',
        'Current Sprint active blocker advanced to marketing source map',
      ]) &&
      includesAll(sourceCoverageCloseoutPlanSource, [
        SOURCE_COVERAGE_CLOSEOUT_CLOSEOUT_KEY,
        'source coverage closeout',
        SOURCE_EXTRACT_GAP_FOLLOWUP_CARD_ID,
        MARKETING_SOURCE_MAP_CARD_ID,
      ]) &&
      includesAll(foundationSourceRoutesSource, [
        '/api/foundation/source-coverage-closeout',
        'buildSourceCoverageCloseoutSnapshot',
        'sourceCoverageCloseout',
      ]) &&
      includesAll(foundationDbWithBacklogSeedSource, [
        SOURCE_EXTRACT_GAP_FOLLOWUP_CARD_ID,
        SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID,
      ]) &&
      includesAll(foundationFrontendSource, [
        'renderSourceCoverageCloseoutPanel',
        'sourceCoverageCloseout',
        'source-coverage-closeout',
      ]) &&
      includesAll(foundationStylesSource, [
        '.source-coverage-closeout-panel',
        '.source-coverage-closeout-table',
      ]) &&
      includesAll(foundationCurrentSprintSource, [
        'sourceCoverageCloseoutStage',
        'SOURCE_COVERAGE_CLOSEOUT_CLOSEOUT_KEY',
        MARKETING_SOURCE_MAP_CARD_ID,
      ]) &&
      buildLogSourceCoverageCloseoutBuild?.operatorCloseout === true &&
      sourceCoverageCloseoutBuildLogExact &&
      foundationCurrentSprintStatus.status === 'healthy' &&
      foundationHub.currentSprint?.status === 'healthy' &&
      activeSprintAtOrPast([MARKETING_SOURCE_MAP_CARD_ID, BRAND_STACK_CARD_ID, TIER_BEHAVIORAL_COMPLETION_CARD_ID, 'VERIFICATION-RUNS-001', VERIFICATION_RUNS_NEXT_CARD_ID, PER_USER_CHANGELOG_NEXT_CARD_ID, DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID]) &&
      currentPlan.includes(SOURCE_COVERAGE_CLOSEOUT_CLOSEOUT_KEY) &&
      currentPlan.includes(MARKETING_SOURCE_MAP_CARD_ID) &&
      currentState.includes(SOURCE_COVERAGE_CLOSEOUT_CLOSEOUT_KEY) &&
      currentState.includes('Source Once-Over is closed for v1') &&
      currentState.includes('source coverage closeout') &&
      foundationVerifySource.includes('buildSyntheticSourceCoverageCloseoutProof'),
    'SOURCE-COVERAGE-CLOSEOUT-001 routes source gaps and advances the Source Once-Over sprint',
    `lane=${sourceCoverageCloseout?.lane || 'missing'} approval=${sourceCoverageCloseoutApprovalValidation.ok} rows=${foundationSourceCoverageCloseout.rows?.length || 0} next=${foundationHub.currentSprint?.activeBlocker?.cardId || 'missing'}`,
  )
  ensure(
    checks,
    marketingSourceMap?.lane === 'done' &&
      String(marketingSourceMap?.statusNote || '').includes(MARKETING_SOURCE_MAP_CLOSEOUT_KEY) &&
      ['scoped', 'done'].includes(brandStack?.lane) &&
      packageJson.scripts?.['process:marketing-source-map-check'] === `node --env-file-if-exists=.env ${MARKETING_SOURCE_MAP_SCRIPT_PATH}` &&
      marketingSourceMapApprovalValidation.ok &&
      marketingSourceMapApprovalValidation.mode === 'v2' &&
      marketingSourceMapApproval.cardId === MARKETING_SOURCE_MAP_CARD_ID &&
      Number(marketingSourceMapApproval.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
      marketingSourceMapApproval.approvedPlanRef === MARKETING_SOURCE_MAP_PLAN_PATH &&
      marketingSourceMapPlanReview.status === 'pass' &&
      marketingSourceMapPlanReview.score >= PLAN_CRITIC_MIN_PASS_SCORE &&
      marketingSourceMapSynthetic.ok &&
      Array.isArray(foundationMarketingSourceMap.lanes) &&
      foundationMarketingSourceMap.status === 'healthy' &&
      foundationMarketingSourceMap.summary?.laneCount === 5 &&
      foundationMarketingSourceMap.summary?.avatarCount === MARKETING_AVATAR_EXPECTED_COUNTS.total &&
      foundationMarketingSourceMap.summary?.missingSourceRefs === 0 &&
      foundationMarketingSourceMap.summary?.marketingProductionBuilt === false &&
      foundationMarketingSourceMap.summary?.brandStackBuilt === false &&
      foundationMarketingSourceMap.lanes.some(lane => lane.laneId === 'benson-crew' && lane.avatarCount === 15) &&
      foundationMarketingSourceMap.lanes.some(lane => lane.laneId === 'steve-zahnd' && lane.avatarCount === 5) &&
      foundationMarketingSourceMap.lanes.every(lane =>
        (lane.sourceRefs || []).every(ref => ref.state !== 'missing')
      ) &&
      foundationSourceLifecycle.marketingSourceMap?.closeoutKey === MARKETING_SOURCE_MAP_CLOSEOUT_KEY &&
      foundationHub.marketingSourceMap?.closeoutKey === MARKETING_SOURCE_MAP_CLOSEOUT_KEY &&
      includesAll(marketingSourceMapSource, [
        'buildMarketingSourceMapSnapshot',
        'MARKETING_BRAND_LANES',
        'buildSyntheticMarketingSourceMapProof',
        'MARKETING_SOURCE_MAP_CLOSEOUT_KEY',
      ]) &&
      includesAll(marketingSourceMapScriptSource, [
        MARKETING_SOURCE_MAP_SUMMARY_MARKER,
        'every source reference resolves to a registered source contract',
        'Current Sprint active blocker advanced to Brand Stack',
      ]) &&
      includesAll(marketingSourceMapPlanSource, [
        MARKETING_SOURCE_MAP_CLOSEOUT_KEY,
        'five brand lanes',
        '15 avatars',
        BRAND_STACK_CARD_ID,
      ]) &&
      includesAll(marketingSourceMapNoteSource, [
        'Benson Crew',
        'Zahnd Team Ag',
        'Steve Zahnd',
        'MarketMasters',
      ]) &&
      includesAll(foundationSourceRoutesSource, [
        '/api/foundation/marketing-source-map',
        'buildMarketingSourceMapSnapshot',
        'marketingSourceMap',
      ]) &&
      includesAll(foundationFrontendSource, [
        'renderMarketingSourceMapPanel',
        'marketingSourceMap',
        'marketing-source-map',
      ]) &&
      includesAll(foundationStylesSource, [
        '.marketing-source-map-panel',
        '.marketing-source-map-grid',
      ]) &&
      includesAll(foundationCurrentSprintSource, [
        'marketingSourceMapStage',
        'MARKETING_SOURCE_MAP_CLOSEOUT_KEY',
        BRAND_STACK_CARD_ID,
      ]) &&
      buildLogMarketingSourceMapBuild?.operatorCloseout === true &&
      marketingSourceMapBuildLogExact &&
      foundationCurrentSprintStatus.status === 'healthy' &&
      foundationHub.currentSprint?.status === 'healthy' &&
      activeSprintAtOrPast([BRAND_STACK_CARD_ID, TIER_BEHAVIORAL_COMPLETION_CARD_ID, 'VERIFICATION-RUNS-001', VERIFICATION_RUNS_NEXT_CARD_ID, PER_USER_CHANGELOG_NEXT_CARD_ID, DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID]) &&
      currentPlan.includes(MARKETING_SOURCE_MAP_CLOSEOUT_KEY) &&
      currentPlan.includes(BRAND_STACK_CARD_ID) &&
      currentState.includes(MARKETING_SOURCE_MAP_CLOSEOUT_KEY) &&
      currentState.includes('Source Once-Over is closed for v1') &&
      currentState.includes('marketing source map') &&
      foundationVerifySource.includes('buildSyntheticMarketingSourceMapProof'),
    'MARKETING-SOURCE-MAP-001 maps avatars and marketing sources to brand lanes and advances the Source Once-Over sprint',
    `lane=${marketingSourceMap?.lane || 'missing'} approval=${marketingSourceMapApprovalValidation.ok} lanes=${foundationMarketingSourceMap.summary?.laneCount || 0} next=${foundationHub.currentSprint?.activeBlocker?.cardId || 'missing'}`,
  )
  ensure(
    checks,
    brandStack?.lane === 'done' &&
      String(brandStack?.statusNote || '').includes(BRAND_STACK_CLOSEOUT_KEY) &&
      ['scoped', 'done'].includes(tierBehavioralCompletion?.lane) &&
      packageJson.scripts?.['process:brand-stack-check'] === `node --env-file-if-exists=.env ${BRAND_STACK_SCRIPT_PATH}` &&
      brandStackApprovalValidation.ok &&
      brandStackApprovalValidation.mode === 'v2' &&
      brandStackApproval.cardId === BRAND_STACK_CARD_ID &&
      Number(brandStackApproval.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
      brandStackApproval.approvedPlanRef === BRAND_STACK_PLAN_PATH &&
      brandStackPlanReview.status === 'pass' &&
      brandStackPlanReview.score >= PLAN_CRITIC_MIN_PASS_SCORE &&
      brandStackSynthetic.ok &&
      Array.isArray(foundationBrandStack.brands) &&
      foundationBrandStack.status === 'healthy' &&
      foundationBrandStack.summary?.brandCount === 5 &&
      foundationBrandStack.summary?.guardianBoundaryCount === 5 &&
      foundationBrandStack.summary?.missingMarketingLaneCount === 0 &&
      foundationBrandStack.summary?.missingSourceRefCount === 0 &&
      foundationBrandStack.summary?.brandGuardianEnforcementBuilt === false &&
      foundationBrandStack.summary?.marketingProductionBuilt === false &&
      foundationBrandStack.brands.some(brand => brand.label === 'Benson Crew' && brand.avatarCount === 15) &&
      foundationBrandStack.brands.some(brand => brand.label === 'MarketMasters' && brand.guardianRules?.some(rule => rule.includes('direct recruiting'))) &&
      foundationBrandStack.brands.every(brand => brand.guardianBoundaryDefined === true && brand.sourceMapLaneStatus !== 'missing') &&
      foundationSourceLifecycle.brandStack?.closeoutKey === BRAND_STACK_CLOSEOUT_KEY &&
      foundationHub.brandStack?.closeoutKey === BRAND_STACK_CLOSEOUT_KEY &&
      includesAll(brandStackSource, [
        'buildBrandStackSnapshot',
        'BRAND_STACK_ENTITIES',
        'buildSyntheticBrandStackProof',
        'BRAND_STACK_CLOSEOUT_KEY',
      ]) &&
      includesAll(brandStackScriptSource, [
        BRAND_STACK_SUMMARY_MARKER,
        'every brand resolves to a marketing source-map lane with source refs',
        'Current Sprint active blocker advanced to tier behavioral completion',
      ]) &&
      includesAll(brandStackPlanSource, [
        BRAND_STACK_CLOSEOUT_KEY,
        'five brand entities',
        'Brand Guardian boundaries',
        TIER_BEHAVIORAL_COMPLETION_CARD_ID,
      ]) &&
      includesAll(marketmastersStrategySource, [
        'Trust = MarketMasters',
        'Execution = Benson Crew',
      ]) &&
      includesAll(foundationSourceRoutesSource, [
        '/api/foundation/brand-stack',
        'buildBrandStackSnapshot',
        'brandStack',
      ]) &&
      includesAll(foundationFrontendSource, [
        'renderBrandStackPanel',
        'brandStack',
        'brand-stack',
      ]) &&
      includesAll(foundationStylesSource, [
        '.brand-stack-panel',
        '.brand-stack-grid',
      ]) &&
      includesAll(foundationCurrentSprintSource, [
        'brandStackStage',
        'BRAND_STACK_CLOSEOUT_KEY',
        TIER_BEHAVIORAL_COMPLETION_CARD_ID,
      ]) &&
      buildLogBrandStackBuild?.operatorCloseout === true &&
      brandStackBuildLogExact &&
      foundationCurrentSprintStatus.status === 'healthy' &&
      foundationHub.currentSprint?.status === 'healthy' &&
      activeSprintAtOrPast([TIER_BEHAVIORAL_COMPLETION_CARD_ID, VERIFICATION_RUNS_CARD_ID, VERIFICATION_RUNS_NEXT_CARD_ID, PER_USER_CHANGELOG_NEXT_CARD_ID, DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID]) &&
      currentPlan.includes(BRAND_STACK_CLOSEOUT_KEY) &&
      currentPlan.includes(TIER_BEHAVIORAL_COMPLETION_CARD_ID) &&
      currentState.includes(BRAND_STACK_CLOSEOUT_KEY) &&
      currentState.includes('Source Once-Over is closed for v1') &&
      currentState.includes('brand stack') &&
      foundationVerifySource.includes('buildSyntheticBrandStackProof'),
    'BRAND-STACK-001 models brand entities and Guardian boundaries and advances the Source Once-Over sprint',
    `lane=${brandStack?.lane || 'missing'} approval=${brandStackApprovalValidation.ok} brands=${foundationBrandStack.summary?.brandCount || 0} next=${foundationHub.currentSprint?.activeBlocker?.cardId || 'missing'}`,
  )
  ensure(
    checks,
    tierBehavioralCompletion?.lane === 'done' &&
      String(tierBehavioralCompletion?.statusNote || '').includes(TIER_BEHAVIORAL_COMPLETION_CLOSEOUT_KEY) &&
      ['scoped', 'done'].includes(verificationRuns?.lane) &&
      packageJson.scripts?.['process:tier-behavioral-completion-check'] === `node --env-file-if-exists=.env ${TIER_BEHAVIORAL_COMPLETION_SCRIPT_PATH}` &&
      tierBehavioralCompletionApprovalValidation.ok &&
      tierBehavioralCompletionApprovalValidation.mode === 'v2' &&
      tierBehavioralCompletionApproval.cardId === TIER_BEHAVIORAL_COMPLETION_CARD_ID &&
      Number(tierBehavioralCompletionApproval.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
      tierBehavioralCompletionApproval.approvedPlanRef === TIER_BEHAVIORAL_COMPLETION_PLAN_PATH &&
      tierBehavioralCompletionPlanReview.status === 'pass' &&
      tierBehavioralCompletionPlanReview.score >= PLAN_CRITIC_MIN_PASS_SCORE &&
      tierBehavioralCompletionSynthetic.ok &&
      foundationTierBehavioralCompletion.status === 'healthy' &&
      foundationTierBehavioralCompletion.summary?.surfaceCount >= 14 &&
      foundationTierBehavioralCompletion.summary?.missingRoutePostureCount === 0 &&
      foundationTierBehavioralCompletion.summary?.roleFilteredSurfaceCount >= 4 &&
      foundationTierBehavioralCompletion.summary?.ownerOnlySurfaceCount >= 7 &&
      foundationTierBehavioralCompletion.summary?.redactionReadyOwnerOnlySurfaceCount >= 3 &&
      foundationTierBehavioralCompletion.summary?.subjectPersonProofOk === true &&
      foundationTierBehavioralCompletion.summary?.broadSharedCommsOpened === false &&
      foundationTierBehavioralCompletion.summary?.strategyTeamAccessOpened === false &&
      foundationTierBehavioralCompletion.summary?.foundationTeamAccessOpened === false &&
      foundationTierBehavioralCompletion.surfaces.some(surface => surface.id === 'ops-hub' && surface.ok && surface.hasNonOwnerAllowed) &&
      foundationTierBehavioralCompletion.surfaces.some(surface => surface.id === 'sales-hub' && surface.ok && surface.hasNonOwnerAllowed) &&
      foundationTierBehavioralCompletion.surfaces.some(surface => surface.id === 'intelligence-evidence' && surface.ok && !surface.hasNonOwnerAllowed && surface.subjectPersonProofRequired) &&
      foundationSourceLifecycle.tierBehavioralCompletion?.closeoutKey === TIER_BEHAVIORAL_COMPLETION_CLOSEOUT_KEY &&
      foundationHub.tierBehavioralCompletion?.closeoutKey === TIER_BEHAVIORAL_COMPLETION_CLOSEOUT_KEY &&
      includesAll(tierBehavioralCompletionSource, [
        'TIER_BEHAVIORAL_SURFACES',
        'buildTierBehavioralCompletionSnapshot',
        'buildSyntheticTierBehavioralCompletionProof',
        TIER_BEHAVIORAL_COMPLETION_CLOSEOUT_KEY,
      ]) &&
      includesAll(tierBehavioralCompletionScriptSource, [
        TIER_BEHAVIORAL_COMPLETION_SUMMARY_MARKER,
        'role-filtered non-owner reads are proven',
        'Current Sprint active blocker advanced to verification runs',
      ]) &&
      includesAll(tierBehavioralCompletionPlanSource, [
        TIER_BEHAVIORAL_COMPLETION_CLOSEOUT_KEY,
        'first-read surface matrix',
        'VERIFICATION-RUNS-001',
      ]) &&
      includesAll(securityAccessSource, [
        '/api/foundation/source-maturity-grid',
        '/api/foundation/marketing-source-map',
        '/api/foundation/tier-behavioral-completion',
        '/api/foundation/current-sprint',
      ]) &&
      includesAll(foundationSourceRoutesSource, [
        '/api/foundation/tier-behavioral-completion',
        'buildTierBehavioralCompletionSnapshot',
        'tierBehavioralCompletion',
      ]) &&
      includesAll(foundationFrontendSource, [
        'renderTierBehavioralCompletionPanel',
        'tierBehavioralCompletion',
        'tier-behavioral-completion',
      ]) &&
      includesAll(foundationStylesSource, [
        '.tier-behavior-panel',
        '.tier-behavior-grid',
      ]) &&
      includesAll(foundationCurrentSprintSource, [
        'tierBehavioralCompletionStage',
        'TIER_BEHAVIORAL_COMPLETION_CLOSEOUT_KEY',
        'VERIFICATION-RUNS-001',
      ]) &&
      buildLogTierBehavioralCompletionBuild?.operatorCloseout === true &&
      tierBehavioralCompletionBuildLogExact &&
      foundationCurrentSprintStatus.status === 'healthy' &&
      foundationHub.currentSprint?.status === 'healthy' &&
      activeSprintAtOrPast([VERIFICATION_RUNS_CARD_ID, VERIFICATION_RUNS_NEXT_CARD_ID, PER_USER_CHANGELOG_NEXT_CARD_ID, DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID]) &&
      currentPlan.includes(TIER_BEHAVIORAL_COMPLETION_CLOSEOUT_KEY) &&
      currentPlan.includes(VERIFICATION_RUNS_CARD_ID) &&
      currentState.includes(TIER_BEHAVIORAL_COMPLETION_CLOSEOUT_KEY) &&
      currentState.includes('Source Once-Over is closed for v1') &&
      currentState.includes('first non-owner read') &&
      foundationVerifySource.includes('buildSyntheticTierBehavioralCompletionProof'),
    'TIER-BEHAVIORAL-COMPLETION-001 proves first non-owner read decisions and advances the Source Once-Over sprint',
    `lane=${tierBehavioralCompletion?.lane || 'missing'} approval=${tierBehavioralCompletionApprovalValidation.ok} surfaces=${foundationTierBehavioralCompletion.summary?.surfaceCount || 0} next=${foundationHub.currentSprint?.activeBlocker?.cardId || 'missing'}`,
  )
  ensure(
    checks,
    verificationRuns?.lane === 'done' &&
      String(verificationRuns?.statusNote || '').includes(VERIFICATION_RUNS_CLOSEOUT_KEY) &&
      ['scoped', 'done'].includes(perUserChangelog?.lane) &&
      packageJson.scripts?.['process:verification-runs-check'] === `node --env-file-if-exists=.env ${VERIFICATION_RUNS_SCRIPT_PATH}` &&
      verificationRunsApprovalValidation.ok &&
      verificationRunsApprovalValidation.mode === 'v2' &&
      verificationRunsApproval.cardId === VERIFICATION_RUNS_CARD_ID &&
      Number(verificationRunsApproval.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
      verificationRunsApproval.approvedPlanRef === VERIFICATION_RUNS_PLAN_PATH &&
      verificationRunsPlanReview.status === 'pass' &&
      verificationRunsPlanReview.score >= PLAN_CRITIC_MIN_PASS_SCORE &&
      verificationRunsSynthetic.ok &&
      ['healthy', 'review_due'].includes(foundationVerificationRuns.status) &&
      foundationVerificationRuns.summary?.proposedOnly === true &&
      foundationVerificationRuns.summary?.autoExpiredCount === 0 &&
      foundationVerificationRuns.summary?.nextCardId === VERIFICATION_RUNS_NEXT_CARD_ID &&
      typeof foundationVerificationRuns.summary?.candidateCount === 'number' &&
      foundationVerificationRuns.thresholds?.staleFindingDays >= 7 &&
      foundationSourceLifecycle.verificationRuns?.closeoutKey === VERIFICATION_RUNS_CLOSEOUT_KEY &&
      foundationHub.verificationRuns?.closeoutKey === VERIFICATION_RUNS_CLOSEOUT_KEY &&
      foundationHub.sourceLifecycle?.verificationRuns?.closeoutKey === VERIFICATION_RUNS_CLOSEOUT_KEY &&
      includesAll(verificationRunsSource, [
        'buildVerificationRunsSnapshot',
        'buildSyntheticVerificationRunsProof',
        VERIFICATION_RUNS_CLOSEOUT_KEY,
        'proposedOnly',
        'autoExpiredCount',
      ]) &&
      includesAll(verificationRunsScriptSource, [
        VERIFICATION_RUNS_SUMMARY_MARKER,
        'synthetic verification runs proof detects stale-only candidates',
        'Current Sprint active blocker advanced to per-user changelog',
      ]) &&
      includesAll(verificationRunsPlanSource, [
        VERIFICATION_RUNS_CLOSEOUT_KEY,
        'proposed-only',
        VERIFICATION_RUNS_NEXT_CARD_ID,
      ]) &&
      includesAll(foundationSourceRoutesSource, [
        '/api/foundation/verification-runs',
        'buildVerificationRunsSnapshot',
        'verificationRuns',
      ]) &&
      includesAll(foundationFrontendSource, [
        'renderVerificationRunsPanel',
        'verificationRuns',
        'verification-runs',
      ]) &&
      includesAll(foundationStylesSource, [
        '.verification-runs-panel',
        '.verification-runs-grid',
      ]) &&
      includesAll(foundationJobsSource, [
        "key: 'verification-runs'",
        'process:verification-runs-check',
        'daily stale research/finding review',
      ]) &&
      securityAccessSource.includes('/api/foundation/verification-runs') &&
      includesAll(foundationCurrentSprintSource, [
        'verificationRunsStage',
        'VERIFICATION_RUNS_CLOSEOUT_KEY',
        VERIFICATION_RUNS_NEXT_CARD_ID,
      ]) &&
      buildLogVerificationRunsBuild?.operatorCloseout === true &&
      verificationRunsBuildLogExact &&
      foundationCurrentSprintStatus.status === 'healthy' &&
      foundationHub.currentSprint?.status === 'healthy' &&
      activeSprintAtOrPast([VERIFICATION_RUNS_NEXT_CARD_ID, PER_USER_CHANGELOG_NEXT_CARD_ID, DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID]) &&
      currentPlan.includes(VERIFICATION_RUNS_CLOSEOUT_KEY) &&
      currentPlan.includes(VERIFICATION_RUNS_NEXT_CARD_ID) &&
      currentState.includes(VERIFICATION_RUNS_CLOSEOUT_KEY) &&
      currentState.includes('Source Once-Over is closed for v1') &&
      currentState.includes('proposed-only') &&
      foundationVerifySource.includes('buildSyntheticVerificationRunsProof'),
    'VERIFICATION-RUNS-001 restores stale research/finding review and advances the Source Once-Over sprint',
    `lane=${verificationRuns?.lane || 'missing'} approval=${verificationRunsApprovalValidation.ok} candidates=${foundationVerificationRuns.summary?.candidateCount ?? 'missing'} next=${foundationHub.currentSprint?.activeBlocker?.cardId || 'missing'}`,
  )
  ensure(
    checks,
    perUserChangelog?.lane === 'done' &&
      String(perUserChangelog?.statusNote || '').includes(PER_USER_CHANGELOG_CLOSEOUT_KEY) &&
      ['scoped', 'done'].includes(decisionRestrictedQueue?.lane) &&
      packageJson.scripts?.['process:per-user-changelog-check'] === `node --env-file-if-exists=.env ${PER_USER_CHANGELOG_SCRIPT_PATH}` &&
      perUserChangelogApprovalValidation.ok &&
      perUserChangelogApprovalValidation.mode === 'v2' &&
      perUserChangelogApproval.cardId === PER_USER_CHANGELOG_CARD_ID &&
      Number(perUserChangelogApproval.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
      perUserChangelogApproval.approvedPlanRef === PER_USER_CHANGELOG_PLAN_PATH &&
      perUserChangelogPlanReview.status === 'pass' &&
      perUserChangelogPlanReview.score >= PLAN_CRITIC_MIN_PASS_SCORE &&
      perUserChangelogSynthetic.ok &&
      foundationPerUserChangelog.status === 'partial' &&
      typeof foundationPerUserChangelog.summary?.eventCount === 'number' &&
      typeof foundationPerUserChangelog.summary?.actorCount === 'number' &&
      foundationPerUserChangelog.summary?.metadataValuesIncluded === false &&
      foundationPerUserChangelog.summary?.missingCoverageCount === 3 &&
      foundationPerUserChangelog.summary?.nextCardId === PER_USER_CHANGELOG_NEXT_CARD_ID &&
      Array.isArray(foundationPerUserChangelog.missingCoverage) &&
      ['viewed', 'ignored', 'received'].every(key => foundationPerUserChangelog.missingCoverage.some(item => item.key === key)) &&
      foundationSourceLifecycle.perUserChangelog?.closeoutKey === PER_USER_CHANGELOG_CLOSEOUT_KEY &&
      foundationHub.perUserChangelog?.closeoutKey === PER_USER_CHANGELOG_CLOSEOUT_KEY &&
      foundationHub.sourceLifecycle?.perUserChangelog?.closeoutKey === PER_USER_CHANGELOG_CLOSEOUT_KEY &&
      includesAll(perUserChangelogSource, [
        'buildPerUserChangelogSnapshot',
        'buildSyntheticPerUserChangelogProof',
        PER_USER_CHANGELOG_CLOSEOUT_KEY,
        'metadataValuesIncluded: false',
        'missingCoverage',
      ]) &&
      includesAll(perUserChangelogScriptSource, [
        PER_USER_CHANGELOG_SUMMARY_MARKER,
        'real snapshot excludes metadata values',
        'Current Sprint active blocker advanced to restricted decision queue',
      ]) &&
      includesAll(perUserChangelogPlanSource, [
        PER_USER_CHANGELOG_CLOSEOUT_KEY,
        'viewed/ignored/received',
        PER_USER_CHANGELOG_NEXT_CARD_ID,
      ]) &&
      includesAll(foundationSourceRoutesSource, [
        '/api/foundation/per-user-changelog',
        'buildPerUserChangelogSnapshot',
        'perUserChangelog',
      ]) &&
      securityAccessSource.includes('/api/foundation/per-user-changelog') &&
      includesAll(foundationFrontendSource, [
        'renderPerUserChangelogPanel',
        'perUserChangelog',
        'per-user-changelog',
      ]) &&
      includesAll(foundationStylesSource, [
        '.per-user-changelog-panel',
        '.per-user-changelog-grid',
      ]) &&
      includesAll(foundationCurrentSprintSource, [
        'perUserChangelogStage',
        'PER_USER_CHANGELOG_CLOSEOUT_KEY',
        PER_USER_CHANGELOG_NEXT_CARD_ID,
      ]) &&
      buildLogPerUserChangelogBuild?.operatorCloseout === true &&
      perUserChangelogBuildLogExact &&
      foundationCurrentSprintStatus.status === 'healthy' &&
      foundationHub.currentSprint?.status === 'healthy' &&
      activeSprintAtOrPast([PER_USER_CHANGELOG_NEXT_CARD_ID, DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID]) &&
      currentPlan.includes(PER_USER_CHANGELOG_CLOSEOUT_KEY) &&
      currentPlan.includes(PER_USER_CHANGELOG_NEXT_CARD_ID) &&
      currentState.includes(PER_USER_CHANGELOG_CLOSEOUT_KEY) &&
      currentState.includes('Source Once-Over is closed for v1') &&
      currentState.includes('viewed/ignored/received') &&
      foundationVerifySource.includes('buildSyntheticPerUserChangelogProof'),
    'PER-USER-CHANGELOG-001 restores per-actor write history and advances the Source Once-Over sprint',
    `lane=${perUserChangelog?.lane || 'missing'} approval=${perUserChangelogApprovalValidation.ok} actors=${foundationPerUserChangelog.summary?.actorCount ?? 'missing'} next=${foundationHub.currentSprint?.activeBlocker?.cardId || 'missing'}`,
  )
  ensure(
    checks,
    decisionRestrictedQueue?.lane === 'done' &&
      String(decisionRestrictedQueue?.statusNote || '').includes(DECISION_RESTRICTED_QUEUE_CLOSEOUT_KEY) &&
      packageJson.scripts?.['process:decision-restricted-queue-check'] === `node --env-file-if-exists=.env ${DECISION_RESTRICTED_QUEUE_SCRIPT_PATH}` &&
      decisionRestrictedQueueApprovalValidation.ok &&
      decisionRestrictedQueueApprovalValidation.mode === 'v2' &&
      decisionRestrictedQueueApproval.cardId === DECISION_RESTRICTED_QUEUE_CARD_ID &&
      Number(decisionRestrictedQueueApproval.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
      decisionRestrictedQueueApproval.approvedPlanRef === DECISION_RESTRICTED_QUEUE_PLAN_PATH &&
      decisionRestrictedQueuePlanReview.status === 'pass' &&
      decisionRestrictedQueuePlanReview.score >= PLAN_CRITIC_MIN_PASS_SCORE &&
      decisionRestrictedQueueSynthetic.ok &&
      foundationRestrictedDecisionQueue.status === 'healthy' &&
      typeof foundationRestrictedDecisionQueue.summary?.decisionCount === 'number' &&
      foundationRestrictedDecisionQueue.summary?.ownerOnly === true &&
      foundationRestrictedDecisionQueue.summary?.proposedOnly === true &&
      foundationRestrictedDecisionQueue.summary?.autoApplies === false &&
      foundationRestrictedDecisionQueue.summary?.autoLocks === false &&
      foundationRestrictedDecisionQueue.summary?.nextCardId === DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID &&
      foundationSourceLifecycle.restrictedDecisionQueue?.closeoutKey === DECISION_RESTRICTED_QUEUE_CLOSEOUT_KEY &&
      foundationHub.restrictedDecisionQueue?.closeoutKey === DECISION_RESTRICTED_QUEUE_CLOSEOUT_KEY &&
      foundationHub.sourceLifecycle?.restrictedDecisionQueue?.closeoutKey === DECISION_RESTRICTED_QUEUE_CLOSEOUT_KEY &&
      includesAll(decisionRestrictedQueueSource, [
        'classifyDecisionRestriction',
        'buildDecisionRestrictedQueueSnapshot',
        'filterGeneralDecisionRecords',
        'buildSyntheticDecisionRestrictedQueueProof',
        'owner_only_restricted_review',
        'performance_concern',
      ]) &&
      includesAll(decisionRestrictedQueueScriptSource, [
        DECISION_RESTRICTED_QUEUE_SUMMARY_MARKER,
        'synthetic restricted queue proof covers restricted/general routing',
        'Current Sprint active blocker advanced to Foundation UI Complete',
      ]) &&
      includesAll(decisionRestrictedQueuePlanSource, [
        DECISION_RESTRICTED_QUEUE_CLOSEOUT_KEY,
        'termination, compensation, performance concern',
        DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID,
      ]) &&
      includesAll(foundationSourceRoutesSource, [
        '/api/foundation/restricted-decision-queue',
        'buildDecisionRestrictedQueueSnapshot',
        'restrictedDecisionQueue',
      ]) &&
      sharedCandidateExtractionSource.includes('filterGeneralDecisionRecords') &&
      securityAccessSource.includes('/api/foundation/restricted-decision-queue') &&
      includesAll(foundationFrontendSource, [
        'renderRestrictedDecisionQueuePanel',
        'restrictedDecisionQueue',
        'restricted-decision-queue',
      ]) &&
      includesAll(foundationStylesSource, [
        '.restricted-decision-queue-panel',
        '.restricted-decision-queue-grid',
      ]) &&
      includesAll(foundationCurrentSprintSource, [
        'decisionRestrictedQueueStage',
        'DECISION_RESTRICTED_QUEUE_CLOSEOUT_KEY',
        DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID,
      ]) &&
      buildLogDecisionRestrictedQueueBuild?.operatorCloseout === true &&
      decisionRestrictedQueueBuildLogExact &&
      foundationCurrentSprintStatus.status === 'healthy' &&
      foundationHub.currentSprint?.status === 'healthy' &&
      activeSprintAtOrPast([DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID]) &&
      currentPlan.includes(DECISION_RESTRICTED_QUEUE_CLOSEOUT_KEY) &&
      currentPlan.includes(DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID) &&
      currentState.includes(DECISION_RESTRICTED_QUEUE_CLOSEOUT_KEY) &&
      currentState.includes('Source Once-Over is closed for v1') &&
      currentState.includes('termination, compensation, performance concern') &&
      foundationVerifySource.includes('buildSyntheticDecisionRestrictedQueueProof'),
    'DECISION-RESTRICTED-QUEUE-001 sequesters sensitive decisions before broader routing',
    `lane=${decisionRestrictedQueue?.lane || 'missing'} approval=${decisionRestrictedQueueApprovalValidation.ok} restricted=${foundationRestrictedDecisionQueue.summary?.restrictedCount ?? 'missing'} next=${foundationHub.currentSprint?.activeBlocker?.cardId || 'missing'}`,
  )
  ensure(
    checks,
    foundationUiComplete?.lane === 'done' &&
      String(foundationUiComplete?.statusNote || '').includes(FOUNDATION_UI_COMPLETE_CLOSEOUT_KEY) &&
      packageJson.scripts?.['process:foundation-ui-complete-check'] === `node --env-file-if-exists=.env ${FOUNDATION_UI_COMPLETE_SCRIPT_PATH}` &&
      foundationUiCompleteApprovalValidation.ok &&
      foundationUiCompleteApprovalValidation.mode === 'v2' &&
      foundationUiCompleteApproval.cardId === FOUNDATION_UI_COMPLETE_CARD_ID &&
      Number(foundationUiCompleteApproval.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
      foundationUiCompleteApproval.approvedPlanRef === FOUNDATION_UI_COMPLETE_PLAN_PATH &&
      foundationUiCompletePlanReview.status === 'pass' &&
      foundationUiCompletePlanReview.score >= PLAN_CRITIC_MIN_PASS_SCORE &&
      foundationUiCompleteApproval.approvedPlanSha256 === 'c57051f98d42680f2659b2ade5e1ba7d0c2b6b6663e71eb12d270978824cbc0c' &&
      foundationUiCompleteSynthetic.ok &&
      foundationSourceLifecycle.foundationUiComplete?.status === 'healthy' &&
      foundationSourceLifecycle.foundationUiComplete?.closeoutKey === FOUNDATION_UI_COMPLETE_CLOSEOUT_KEY &&
      foundationSourceLifecycle.foundationUiComplete?.summary?.sectionCount === 10 &&
      foundationSourceLifecycle.foundationUiComplete?.summary?.sourceCount >= 35 &&
      foundationSourceLifecycle.foundationUiComplete?.summary?.brandLaneCount >= 5 &&
      foundationSourceLifecycle.foundationUiComplete?.summary?.avatarCount === 15 &&
      foundationSourceLifecycle.foundationUiComplete?.summary?.tierSurfaceCount >= 14 &&
      typeof foundationSourceLifecycle.foundationUiComplete?.summary?.verificationCandidateCount === 'number' &&
      typeof foundationSourceLifecycle.foundationUiComplete?.summary?.auditActorCount === 'number' &&
      typeof foundationSourceLifecycle.foundationUiComplete?.summary?.restrictedDecisionCount === 'number' &&
      foundationSourceLifecycle.foundationUiComplete?.summary?.productExpansionBuilt === false &&
      (foundationSourceLifecycle.foundationUiComplete?.topVisibleGaps || []).length > 0 &&
      foundationHub.foundationUiComplete?.closeoutKey === FOUNDATION_UI_COMPLETE_CLOSEOUT_KEY &&
      foundationHub.sourceLifecycle?.foundationUiComplete?.closeoutKey === FOUNDATION_UI_COMPLETE_CLOSEOUT_KEY &&
      foundationHub.currentSprint?.status === 'healthy' &&
      activeSprintAtOrPast([FOUNDATION_UI_COMPLETE_CARD_ID]) &&
      sourceOnceOverCardsHaveVerifiedCloseouts &&
      includesAll(foundationUiCompleteSource, [
        'buildFoundationUiCompleteSnapshot',
        'buildSyntheticFoundationUiCompleteProof',
        'REQUIRED_SECTIONS',
        FOUNDATION_UI_COMPLETE_CLOSEOUT_KEY,
      ]) &&
      includesAll(foundationUiCompleteScriptSource, [
        FOUNDATION_UI_COMPLETE_SUMMARY_MARKER,
        'real Source Lifecycle payload exposes healthy Foundation UI Complete summary',
        'all Source Once-Over sprint cards are done this sprint',
      ]) &&
      includesAll(foundationUiCompletePlanSource, [
        FOUNDATION_UI_COMPLETE_CLOSEOUT_KEY,
        '30-Second Read',
        'all ten Source Once-Over surfaces',
      ]) &&
      includesAll(foundationSourceRoutesSource, [
        'buildFoundationUiCompleteSnapshot',
        'sourceLifecycle.foundationUiComplete',
        'foundationUiComplete',
      ]) &&
      includesAll(foundationFrontendSource, [
        'renderFoundationUiCompletePanel',
        'Foundation 30-Second Read',
        'data-foundation-ui-complete-section',
      ]) &&
      includesAll(foundationStylesSource, [
        '.foundation-ui-complete-panel',
        '.foundation-ui-complete-grid',
        '.foundation-ui-complete-card',
      ]) &&
      includesAll(foundationCurrentSprintSource, [
        'foundationUiCompleteStage',
        'FOUNDATION_UI_COMPLETE_CLOSEOUT_KEY',
        'FOUNDATION_UI_COMPLETE_SCRIPT_PATH',
      ]) &&
      buildLogFoundationUiCompleteBuild?.operatorCloseout === true &&
      foundationUiCompleteBuildLogExact &&
      currentPlan.includes(FOUNDATION_UI_COMPLETE_CLOSEOUT_KEY) &&
      currentPlan.includes('Source Once-Over is closed for v1') &&
      currentState.includes(FOUNDATION_UI_COMPLETE_CLOSEOUT_KEY) &&
      currentState.includes('Source Once-Over is closed for v1') &&
      currentState.includes('Foundation 30-second read') &&
      foundationVerifySource.includes('buildSyntheticFoundationUiCompleteProof'),
    'FOUNDATION-UI-COMPLETE-001 closes the Source Once-Over UI pass without product expansion',
    `lane=${foundationUiComplete?.lane || 'missing'} approval=${foundationUiCompleteApprovalValidation.ok} sections=${foundationSourceLifecycle.foundationUiComplete?.summary?.sectionCount ?? 'missing'} sprint=${foundationHub.currentSprint?.cadence?.currentStatus || 'missing'}`,
  )
  return { checks }
}

export function evaluateFoundationVerifierSourceOnceOverProgressionOrchestration(input = {}) {
  const normalizedInput = flattenSourceOnceOverBundles(input)
  const sourceOnceOverProgressionVerifier = evaluateFoundationVerifierSourceOnceOverProgression(normalizedInput)
  const checks = [...sourceOnceOverProgressionVerifier.checks]
  const sourceOnceOverDogfood = buildFoundationVerifierSourceOnceOverProgressionDogfoodProof()
  const orchestrationDogfood = buildFoundationVerifierSourceOnceOverOrchestrationDogfoodProof()
  const backlogItems = normalizedInput.foundationHub?.backlogItems || []
  const orchestrationCard = backlogItems.find(item => item.id === VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_CARD_ID) || null
  const orchestrationCloseout = (normalizedInput.foundationBuildCloseouts || [])
    .find(closeout => closeout.key === VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_CLOSEOUT_KEY) || null
  const foundationVerifySource = normalizedInput.foundationVerifySource || ''
  const rootLineCount = String(foundationVerifySource || '').split('\n').length
  const rootDelegatesThroughWrapper =
    foundationVerifySource.includes('evaluateFoundationVerifierSourceOnceOverProgressionOrchestration({') &&
    foundationVerifySource.includes('sourceOnceOverProgressionVerifier.checks')
  const oldDirectRootCallRemoved = !foundationVerifySource.includes('evaluateFoundationVerifierSourceOnceOverProgression({')
  const focusedProofRegistered =
    normalizedInput.packageJson?.scripts?.['process:verifier-source-once-over-orchestration-split-check'] ===
      `node --env-file-if-exists=.env ${VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_SCRIPT_PATH}`
  const closeoutRegistered =
    orchestrationCard &&
    ['executing', 'done'].includes(orchestrationCard.lane) &&
    String(orchestrationCard.statusNote || '').includes(VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_CLOSEOUT_KEY) &&
    orchestrationCloseout?.operatorCloseout === true &&
    (orchestrationCloseout.backlogIds || []).includes(VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_CARD_ID)
  const bundleInputSupported = [
    'autoDeployRollbackBundle',
    'avatarImportBundle',
    'brandStackBundle',
    'decisionRestrictedQueueBundle',
    'foundationUiCompleteBundle',
    'marketingSourceMapBundle',
    'perUserChangelogBundle',
    'sourceCoverageCloseoutBundle',
    'sourceExtractionCoverageBundle',
    'sourceMaturityGridBundle',
    'strategyHubMeetingReadyBundle',
    'tierBehavioralCompletionBundle',
    'verificationRunsBundle',
  ].every(key => Object.prototype.hasOwnProperty.call(input, key))
  const orchestrationFixture = evaluateSourceOnceOverOrchestrationFixture({
    wrapperDelegationPresent: rootDelegatesThroughWrapper,
    bundleInputSupported,
    oldDirectRootCallRemoved,
    closeoutRegistered,
    focusedProofRegistered,
    lineCountDecreased: rootLineCount < VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_BEFORE_LINES,
  })

  ensure(
    checks,
    orchestrationFixture.ok === true &&
      orchestrationDogfood.ok === true &&
      sourceOnceOverDogfood.ok === true,
    'VERIFIER-SOURCE-ONCE-OVER-ORCHESTRATION-SPLIT-001 moves Source Once-Over verifier orchestration into bundled domain inputs',
    orchestrationCard
      ? `lane=${orchestrationCard.lane} dogfood=${orchestrationDogfood.ok ? 'pass' : 'blocked'} lines=${VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_BEFORE_LINES}->${rootLineCount}`
      : `missing ${VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_CARD_ID}`,
  )

  return {
    checks,
    sourceOnceOverProgressionVerifier,
    dogfood: sourceOnceOverDogfood,
    orchestrationDogfood,
  }
}
