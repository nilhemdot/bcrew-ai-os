import {
  FOUNDATION_REVIEW_SPRINT_CARD_IDS,
  FOUNDATION_REVIEW_SPRINT_PHASE_G_ORDER,
} from './foundation-review-sprint.js'
import {
  PLAIN_ENGLISH_SWEEP_CARD_ID,
  PLAIN_ENGLISH_SWEEP_CATEGORY_MINIMUMS,
} from './foundation-plain-english.js'
import {
  UI_MENU_LAYOUT_POLISH_APPROVED_PLAN_PATH,
  UI_MENU_LAYOUT_POLISH_CARD_ID,
} from './foundation-ui-menu-layout-polish.js'
import {
  RECENT_BUILDS_UI_APPROVED_PLAN_PATH,
  RECENT_BUILDS_UI_CARD_ID,
} from './foundation-recent-builds-ui.js'
import {
  CHANGE_LOG_COMPREHENSIVE_APPROVED_PLAN_PATH,
  CHANGE_LOG_COMPREHENSIVE_CARD_ID,
} from './foundation-change-log.js'
import {
  DAILY_EXEC_SUMMARY_APPROVED_PLAN_PATH,
  DAILY_EXEC_SUMMARY_CARD_ID,
} from './foundation-daily-exec-summary.js'
import {
  SOURCE_LIFECYCLE_APPROVED_PLAN_PATH,
  SOURCE_LIFECYCLE_CARD_ID,
  SOURCE_LIFECYCLE_REQUIRED_TARGET_COUNT,
  SOURCE_LIFECYCLE_ROUTE,
} from './source-lifecycle.js'

export const VERIFIER_PHASE_G_OPERATOR_CLOSEOUT_SPLIT_CARD_ID = 'VERIFIER-PHASE-G-OPERATOR-CLOSEOUT-SPLIT-001'
export const VERIFIER_PHASE_G_OPERATOR_CLOSEOUT_SPLIT_CLOSEOUT_KEY = 'verifier-phase-g-operator-closeout-split-v1'
export const VERIFIER_PHASE_G_OPERATOR_CLOSEOUT_SPLIT_PLAN_PATH = 'docs/process/verifier-phase-g-operator-closeout-split-001-plan.md'
export const VERIFIER_PHASE_G_OPERATOR_CLOSEOUT_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-PHASE-G-OPERATOR-CLOSEOUT-SPLIT-001.json'
export const VERIFIER_PHASE_G_OPERATOR_CLOSEOUT_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-phase-g-operator-closeout-split-check.mjs'
export const VERIFIER_PHASE_G_OPERATOR_CLOSEOUT_SPLIT_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-verifier-phase-g-operator-closeout-split-closeout.md'
export const VERIFIER_PHASE_G_OPERATOR_CLOSEOUT_SPLIT_BEFORE_LINES = 11041

const PLAIN_ENGLISH_SWEEP_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'PLAIN-ENGLISH-SWEEP-001',
]

const FOUNDATION_1100_REVIEW_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'BACKLOG-HYGIENE-PASS-002',
  'ACTION-REVIEW-CLEANUP-001',
  'RESEARCH-CURATION-002',
  'PHASE-G-READINESS-001',
]

const UI_MENU_LAYOUT_POLISH_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'UI-MENU-LAYOUT-POLISH-001',
]

const RECENT_BUILDS_UI_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'RECENT-BUILDS-BILLION-DOLLAR-UI-001',
]

const CHANGE_LOG_COMPREHENSIVE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'CHANGE-LOG-COMPREHENSIVE-001',
]

const DAILY_EXEC_SUMMARY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'DAILY-EXEC-SUMMARY-001',
]

const SOURCE_LIFECYCLE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'SOURCE-LIFECYCLE-EXPANSION-001',
]

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function includesAll(text = '', patterns = []) {
  return patterns.every(pattern => String(text || '').includes(pattern))
}

function evaluatePhaseGOperatorCloseoutFixture(fixture = {}) {
  const findings = []
  if (fixture.foundation1100Closed !== true) findings.push('foundation_1100_closeout_hidden')
  if (fixture.phaseGUiStatusesHealthy !== true) findings.push('phase_g_operator_status_failure_hidden')
  if (fixture.ownershipExact !== true) findings.push('phase_g_closeout_ownership_smearing_hidden')
  if (fixture.metadataProofPresent !== true) findings.push('phase_g_metadata_proof_missing')
  if (fixture.oldInlinePredicatesRemoved !== true) findings.push('old_phase_g_inline_predicates_present')
  return { ok: findings.length === 0, findings }
}

export function buildFoundationVerifierPhaseGOperatorCloseoutDogfoodProof() {
  const healthy = evaluatePhaseGOperatorCloseoutFixture({
    foundation1100Closed: true,
    phaseGUiStatusesHealthy: true,
    ownershipExact: true,
    metadataProofPresent: true,
    oldInlinePredicatesRemoved: true,
  })
  const rejected = {
    hiddenFoundation1100Closeout: evaluatePhaseGOperatorCloseoutFixture({
      foundation1100Closed: false,
      phaseGUiStatusesHealthy: true,
      ownershipExact: true,
      metadataProofPresent: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenPhaseGStatusFailure: evaluatePhaseGOperatorCloseoutFixture({
      foundation1100Closed: true,
      phaseGUiStatusesHealthy: false,
      ownershipExact: true,
      metadataProofPresent: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenOwnershipSmearing: evaluatePhaseGOperatorCloseoutFixture({
      foundation1100Closed: true,
      phaseGUiStatusesHealthy: true,
      ownershipExact: false,
      metadataProofPresent: true,
      oldInlinePredicatesRemoved: true,
    }),
    missingMetadataProof: evaluatePhaseGOperatorCloseoutFixture({
      foundation1100Closed: true,
      phaseGUiStatusesHealthy: true,
      ownershipExact: true,
      metadataProofPresent: false,
      oldInlinePredicatesRemoved: true,
    }),
    oldInlinePredicate: evaluatePhaseGOperatorCloseoutFixture({
      foundation1100Closed: true,
      phaseGUiStatusesHealthy: true,
      ownershipExact: true,
      metadataProofPresent: true,
      oldInlinePredicatesRemoved: false,
    }),
  }
  const ok = healthy.ok && Object.values(rejected).every(result => result.ok === false)
  return {
    ok,
    healthy,
    rejected,
    dogfoodInvariant: ok
      ? 'healthy Phase G operator closeout fixture passes; hidden closeout/status/ownership/metadata and old-inline failures fail closed'
      : 'Phase G operator closeout dogfood did not reject every known failure fixture',
  }
}

export function evaluateFoundationVerifierPhaseGOperatorCloseout(input = {}) {
  const {
    buildLogChangeLogComprehensiveBuild,
    buildLogDailyExecSummaryBuild,
    buildLogFoundation1100ReviewBuild,
    buildLogPlainEnglishSweepBuild,
    buildLogRecentBuildsUiBuild,
    buildLogSourceLifecycleBuild,
    buildLogUiMenuLayoutPolishBuild,
    changeLogComprehensive,
    changeLogComprehensiveApprovalValidation,
    changeLogComprehensiveApprovedPlan,
    changeLogComprehensiveBaseline,
    changeLogComprehensiveManualReview,
    changeLogComprehensiveStatus,
    currentPlan,
    currentState,
    dailyExecSummary,
    dailyExecSummaryApprovalValidation,
    dailyExecSummaryApprovedPlan,
    dailyExecSummaryBaseline,
    dailyExecSummaryManualReview,
    dailyExecSummaryStatus,
    foundation1100Artifact,
    foundation1100ReviewApprovalValidations,
    foundation1100ReviewApprovedPlan,
    foundation1100ReviewCards,
    foundation1100ReviewStatus,
    foundationBuildLog,
    foundationChangeLog,
    foundationChangesApi,
    foundationDailySummary,
    foundationFrontendSource,
    foundationHtmlSource,
    foundationHub,
    foundationSourceLifecycle,
    foundationStylesSource,
    foundationVerifySource,
    packageSource,
    phaseGNextCard,
    phaseGTrack2Complete,
    phaseGTrack2ReportedComplete,
    plainEnglishSweep,
    plainEnglishSweepApprovalValidation,
    plainEnglishSweepApprovedPlan,
    plainEnglishSweepArtifactSource,
    plainEnglishSweepManualReview,
    plainEnglishSweepStatus,
    recentBuildsUi,
    recentBuildsUiApprovalValidation,
    recentBuildsUiApprovedPlan,
    recentBuildsUiBaseline,
    recentBuildsUiManualReview,
    recentBuildsUiStatus,
    sourceLifecycle,
    sourceLifecycleApprovalValidation,
    sourceLifecycleApprovedPlan,
    sourceLifecycleBaseline,
    sourceLifecycleManualReview,
    sourceLifecycleStatus,
    sourceOfTruth,
    uiMenuLayoutPolish,
    uiMenuLayoutPolishApprovalValidation,
    uiMenuLayoutPolishApprovedPlan,
    uiMenuLayoutPolishBaseline,
    uiMenuLayoutPolishManualReview,
    uiMenuLayoutPolishStatus,
  } = input
  const checks = []

  const foundation1100BuildLogExact = buildLogFoundation1100ReviewBuild?.backlogIds?.length === FOUNDATION_REVIEW_SPRINT_CARD_IDS.length &&
    FOUNDATION_REVIEW_SPRINT_CARD_IDS.every(id => buildLogFoundation1100ReviewBuild.backlogIds.includes(id)) &&
    !FOUNDATION_REVIEW_SPRINT_PHASE_G_ORDER.some(id => buildLogFoundation1100ReviewBuild.backlogIds.includes(id))
  ensure(
    checks,
    foundation1100ReviewCards.every(card => card?.lane === 'done') &&
      foundation1100ReviewCards.every(card => /foundation-1100-review-v1/.test(card?.statusNote || '')) &&
      foundation1100ReviewApprovalValidations.every(validation => validation.ok && validation.mode === 'v2') &&
      foundation1100ReviewApprovalValidations.every(validation => validation.approval?.approvedPlanRef === 'docs/process/approved-plans/foundation-1100-review-v1.md') &&
      foundation1100ReviewApprovedPlan.includes('RESEARCH-CURATION-002 is disposition-only') &&
      foundation1100ReviewApprovedPlan.includes('may apply only safe Foundation/system housekeeping routes') &&
      foundation1100ReviewApprovedPlan.includes('create them with full context before cleanup work') &&
      includesAll(foundationVerifySource, FOUNDATION_1100_REVIEW_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE) &&
      foundation1100Artifact?.baseline?.counts?.backlogCards === 289 &&
      foundation1100Artifact?.baseline?.hygiene?.findings?.length === 20 &&
      foundation1100Artifact?.baseline?.actionReview?.pendingRoutes?.length === 18 &&
      foundation1100Artifact?.baseline?.researchCuration?.dispositions?.length === 102 &&
      (foundation1100ReviewStatus.status === 'healthy' || phaseGTrack2ReportedComplete) &&
      foundation1100ReviewStatus.summary?.currentHygieneCritical === 0 &&
      (
        foundation1100ReviewStatus.summary?.currentHygieneWarnings === 0 ||
        phaseGTrack2ReportedComplete
      ) &&
      foundation1100ReviewStatus.summary?.actionRoutesCurated === 18 &&
      foundation1100ReviewStatus.summary?.actionRoutesAppliedBySprint === 0 &&
      foundation1100ReviewStatus.summary?.researchCardsDispositionOnly === 102 &&
      JSON.stringify(foundation1100ReviewStatus.phaseGReadiness?.finalOrder || []) === JSON.stringify(FOUNDATION_REVIEW_SPRINT_PHASE_G_ORDER) &&
      (foundationHub.foundation1100Review?.status === 'healthy' || phaseGTrack2ReportedComplete) &&
      foundationHub.foundation1100Review?.summary?.actionRoutesCurated === 18 &&
      buildLogFoundation1100ReviewBuild?.operatorCloseout === true &&
      foundation1100BuildLogExact &&
      currentPlan.includes('Foundation 1100 Review Sprint') &&
      currentPlan.includes('No Phase G UI work starts inside this cleanup sprint') &&
      currentState.includes('Foundation 1100 Review Sprint is done for v1') &&
      currentState.includes('recorded Phase G order under `foundation-1100-review-v1`'),
    'Foundation 1100 Review Sprint cleans hygiene/action/research layers before Phase G',
    `cards=${foundation1100ReviewCards.filter(card => card?.lane === 'done').length}/4 hygiene=${foundation1100ReviewStatus.summary?.currentHygieneWarnings} action=${foundation1100ReviewStatus.summary?.actionRoutesCurated}/18 research=${foundation1100ReviewStatus.summary?.researchCardsDispositionOnly}/102 closeout=${buildLogFoundation1100ReviewBuild?.closeoutKey || 'missing'}`,
  )
  const plainEnglishBuildLogExact = buildLogPlainEnglishSweepBuild?.backlogIds?.length === 1 &&
    buildLogPlainEnglishSweepBuild.backlogIds.includes(PLAIN_ENGLISH_SWEEP_CARD_ID) &&
    !['UI-MENU-LAYOUT-POLISH-001', 'RECENT-BUILDS-BILLION-DOLLAR-UI-001', 'CHANGE-LOG-COMPREHENSIVE-001', 'DAILY-EXEC-SUMMARY-001', 'SOURCE-LIFECYCLE-EXPANSION-001']
      .some(id => buildLogPlainEnglishSweepBuild.backlogIds.includes(id))
  ensure(
    checks,
    plainEnglishSweep?.lane === 'done' &&
      /plain-english-sweep-v1/.test(plainEnglishSweep?.statusNote || '') &&
      plainEnglishSweepApprovalValidation.ok &&
      plainEnglishSweepApprovalValidation.mode === 'v2' &&
      plainEnglishSweepApprovalValidation.approval?.approvedPlanRef === 'docs/process/approved-plans/plain-english-sweep-v1.md' &&
      plainEnglishSweepApprovedPlan.includes('Minimum 60 audited copy entries') &&
      plainEnglishSweepApprovedPlan.includes('Manual review requires pass/fail') &&
      plainEnglishSweepApprovedPlan.includes('Do not change IDs, selectors, API shapes') &&
      includesAll(foundationVerifySource, PLAIN_ENGLISH_SWEEP_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE) &&
      includesAll(packageSource, ['"process:plain-english-sweep-check"', 'scripts/process-plain-english-sweep-check.mjs']) &&
      plainEnglishSweepStatus.status === 'healthy' &&
      plainEnglishSweepStatus.summary?.totalEntries >= 60 &&
      Object.entries(PLAIN_ENGLISH_SWEEP_CATEGORY_MINIMUMS).every(([category, minimum]) =>
        (plainEnglishSweepStatus.summary?.categoryCounts?.[category] || 0) >= minimum
      ) &&
      plainEnglishSweepStatus.summary?.manualRouteChecks === 24 &&
      plainEnglishSweepStatus.summary?.manualRouteFailures === 0 &&
      plainEnglishSweepArtifactSource.includes('"copyOnly": true') &&
      plainEnglishSweepArtifactSource.includes('"noIdsSelectorsContractsChanged": true') &&
      plainEnglishSweepManualReview.includes('Failures: 0') &&
      includesAll(plainEnglishSweepManualReview, [
        '/foundation#backlog',
        '/foundation#system-health',
        '/foundation#build-log',
        '/foundation#source-overview',
        '/foundation#inventory-docs',
        'desktop',
        'mobile',
      ]) &&
      includesAll(foundationFrontendSource, [
        'No cards are in this stage right now.',
        'Needs human decision',
        'Live diagnostic view for the dashboard',
        'Plain-English changelog for what changed',
        'A source can be readable before it is trusted.',
        'Show current tracked markdown docs plus local-private metadata',
        'Backlog could not load. No cards were changed. Details:',
      ]) &&
      includesAll(foundationHtmlSource, [
        'Strategy docs',
        'Review queues',
        'Current Docs',
        'Open or close Foundation navigation',
      ]) &&
      buildLogPlainEnglishSweepBuild?.operatorCloseout === true &&
      plainEnglishBuildLogExact &&
      currentPlan.includes('PLAIN-ENGLISH-SWEEP-001` is done for v1') &&
      currentPlan.includes('UI-MENU-LAYOUT-POLISH-001') &&
      currentState.includes('PLAIN-ENGLISH-SWEEP-001`, now done for v1') &&
      currentState.includes('UI-MENU-LAYOUT-POLISH-001'),
    'PLAIN-ENGLISH-SWEEP-001 closes the copy-only Foundation operator language pass',
    `entries=${plainEnglishSweepStatus.summary?.totalEntries}/60 manual=${plainEnglishSweepStatus.summary?.manualRouteChecks}/24 closeout=${buildLogPlainEnglishSweepBuild?.closeoutKey || 'missing'}`,
  )
  const uiMenuLayoutPolishBuildLogExact = buildLogUiMenuLayoutPolishBuild?.backlogIds?.length === 1 &&
    buildLogUiMenuLayoutPolishBuild.backlogIds.includes(UI_MENU_LAYOUT_POLISH_CARD_ID) &&
    !['PLAIN-ENGLISH-SWEEP-001', 'RECENT-BUILDS-BILLION-DOLLAR-UI-001', 'CHANGE-LOG-COMPREHENSIVE-001', 'DAILY-EXEC-SUMMARY-001', 'SOURCE-LIFECYCLE-EXPANSION-001']
      .some(id => buildLogUiMenuLayoutPolishBuild.backlogIds.includes(id))
  ensure(
    checks,
    uiMenuLayoutPolish?.lane === 'done' &&
      /ui-menu-layout-polish-v1/.test(uiMenuLayoutPolish?.statusNote || '') &&
      uiMenuLayoutPolishApprovalValidation.ok &&
      uiMenuLayoutPolishApprovalValidation.mode === 'v2' &&
      uiMenuLayoutPolishApprovalValidation.approval?.approvedPlanRef === UI_MENU_LAYOUT_POLISH_APPROVED_PLAN_PATH &&
      includesAll(uiMenuLayoutPolishApprovedPlan, [
        'Default current-doc view',
        '/foundation#inventory-archive-history',
        'Desktop `1440x900`',
        'mobile/narrow `390x844`',
        'The archive/current split is UI-only',
        'No Recent Work redesign',
      ]) &&
      includesAll(foundationVerifySource, UI_MENU_LAYOUT_POLISH_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE) &&
      includesAll(packageSource, ['"process:ui-menu-layout-polish-check"', 'scripts/process-ui-menu-layout-polish-check.mjs']) &&
      uiMenuLayoutPolishStatus.status === 'healthy' &&
      uiMenuLayoutPolishStatus.summary?.requiredRoutes === 15 &&
      uiMenuLayoutPolishStatus.summary?.routeViewportChecks === 30 &&
      uiMenuLayoutPolishStatus.summary?.currentDocCount >= 78 &&
      uiMenuLayoutPolishStatus.summary?.archiveHistoryDocCount >= 133 &&
      uiMenuLayoutPolishStatus.summary?.currentArchiveLeakCount === 0 &&
      uiMenuLayoutPolishStatus.summary?.privateLocalDocCount === 5 &&
      uiMenuLayoutPolishStatus.summary?.nextPlanCardStillAfterUiMenu === true &&
      includesAll(uiMenuLayoutPolishBaseline, [
        'Before build',
        'Current docs after split: 78',
        'Archive/history docs after split: 133',
        'Private/local docs stay metadata-only',
      ]) &&
      includesAll(uiMenuLayoutPolishManualReview, [
        'Failures: 0',
        'desktop 1440x900',
        'mobile 390x844',
        '/foundation#inventory-archive-history',
        'current truth / next card visible without digging',
      ]) &&
      includesAll(foundationHtmlSource, [
        'Current Docs',
        'Archive / History',
        'Open or close Foundation navigation',
      ]) &&
      includesAll(foundationFrontendSource, [
        'renderInventoryArchiveHistory',
        'splitInventoryDocs',
        'currentInventoryDocCategories',
        'archiveHistoryInventoryDocCategories',
        'renderFoundationCurrentTruthPanel',
        'RECENT-BUILDS-BILLION-DOLLAR-UI-001',
      ]) &&
      includesAll(foundationFrontendSource, [
        "'Active doctrine'",
        "'Process & runbooks'",
        "'Source notes'",
        "'Specs'",
        "'Strategy reference'",
        "'Agent personas'",
        "'User profile'",
        "'Archive'",
        "'Plan history'",
        "'Recent audits - active'",
        "'Recent handoffs - active'",
      ]) &&
      ([
        'RECENT-BUILDS-BILLION-DOLLAR-UI-001',
        'CHANGE-LOG-COMPREHENSIVE-001',
        'DAILY-EXEC-SUMMARY-001',
        'SOURCE-LIFECYCLE-EXPANSION-001',
      ].includes(phaseGNextCard) || phaseGTrack2ReportedComplete) &&
      buildLogUiMenuLayoutPolishBuild?.operatorCloseout === true &&
      uiMenuLayoutPolishBuildLogExact &&
      currentPlan.includes('UI-MENU-LAYOUT-POLISH-001` is done for v1') &&
      currentPlan.includes('RECENT-BUILDS-BILLION-DOLLAR-UI-001') &&
      currentState.includes('UI-MENU-LAYOUT-POLISH-001` is done for v1') &&
      currentState.includes('RECENT-BUILDS-BILLION-DOLLAR-UI-001'),
    'UI-MENU-LAYOUT-POLISH-001 closes nav/layout polish with current-doc archive split',
    `current=${uiMenuLayoutPolishStatus.summary?.currentDocCount}>=78 archive=${uiMenuLayoutPolishStatus.summary?.archiveHistoryDocCount}>=133 routeViewports=${uiMenuLayoutPolishStatus.summary?.routeViewportChecks}/30 closeout=${buildLogUiMenuLayoutPolishBuild?.closeoutKey || 'missing'}`,
  )
  const recentBuildsUiBuildLogExact = buildLogRecentBuildsUiBuild?.backlogIds?.length === 1 &&
    buildLogRecentBuildsUiBuild.backlogIds.includes(RECENT_BUILDS_UI_CARD_ID) &&
    !['PLAIN-ENGLISH-SWEEP-001', 'UI-MENU-LAYOUT-POLISH-001', 'CHANGE-LOG-COMPREHENSIVE-001', 'DAILY-EXEC-SUMMARY-001', 'SOURCE-LIFECYCLE-EXPANSION-001']
      .some(id => buildLogRecentBuildsUiBuild.backlogIds.includes(id))
  ensure(
    checks,
    recentBuildsUi?.lane === 'done' &&
      /recent-builds-billion-dollar-ui-v1/.test(recentBuildsUi?.statusNote || '') &&
      recentBuildsUiApprovalValidation.ok &&
      recentBuildsUiApprovalValidation.mode === 'v2' &&
      recentBuildsUiApprovalValidation.approval?.approvedPlanRef === RECENT_BUILDS_UI_APPROVED_PLAN_PATH &&
      includesAll(recentBuildsUiApprovedPlan, [
        'collapsed by default',
        'backlogIds = owning cards only',
        'mentioned/context cards stay context only',
        'same-commit closeouts',
        'No comprehensive changelog',
      ]) &&
      includesAll(foundationVerifySource, RECENT_BUILDS_UI_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE) &&
      includesAll(packageSource, ['"process:recent-builds-billion-dollar-ui-check"', 'scripts/process-recent-builds-billion-dollar-ui-check.mjs']) &&
      recentBuildsUiStatus.status === 'healthy' &&
      recentBuildsUiStatus.summary?.closeoutBuilds >= 42 &&
      recentBuildsUiStatus.summary?.proofLinkedBuilds >= 42 &&
      recentBuildsUiStatus.summary?.sameCommitGroups >= 2 &&
      recentBuildsUiStatus.summary?.manualRouteChecks === 10 &&
      recentBuildsUiStatus.summary?.manualRouteFailures === 0 &&
      recentBuildsUiStatus.summary?.newCloseoutPresent === true &&
      includesAll(recentBuildsUiBaseline, [
        'Before build: `99a0100`',
        'Closeout builds: 42',
        'same-commit closeout groups',
        'backlogIds are owning cards only',
      ]) &&
      includesAll(recentBuildsUiManualReview, [
        'Failures: 0',
        'desktop 1440x900',
        'mobile 390x844',
        'collapsed by default',
        'same-commit closeouts stay grouped',
        'owned cards stay separate from context cards',
      ]) &&
      includesAll(foundationFrontendSource, [
        'renderBuildExecutiveSummary',
        'renderBuildReviewQueue',
        'build-log-executive-summary',
        'build-log-card-summary',
        'build-log-context-link',
        'Grouped same-commit closeouts',
      ]) &&
      includesAll(foundationStylesSource, [
        '.build-log-executive-summary',
        '.build-log-review-link',
        '.build-log-card-summary',
        '.build-log-context-link',
      ]) &&
      (['CHANGE-LOG-COMPREHENSIVE-001', 'DAILY-EXEC-SUMMARY-001', 'SOURCE-LIFECYCLE-EXPANSION-001'].includes(phaseGNextCard) || phaseGTrack2ReportedComplete) &&
      buildLogRecentBuildsUiBuild?.operatorCloseout === true &&
      recentBuildsUiBuildLogExact &&
      currentPlan.includes('RECENT-BUILDS-BILLION-DOLLAR-UI-001` is done for v1') &&
      currentPlan.includes('CHANGE-LOG-COMPREHENSIVE-001') &&
      currentState.includes('RECENT-BUILDS-BILLION-DOLLAR-UI-001` is done for v1') &&
      (currentState.includes('Next expected card is `CHANGE-LOG-COMPREHENSIVE-001`') ||
        currentState.includes('Next expected card is `DAILY-EXEC-SUMMARY-001`') ||
        currentState.includes('Next expected card is `SOURCE-LIFECYCLE-EXPANSION-001`') ||
        currentState.includes('SOURCE-LIFECYCLE-EXPANSION-001` is done for v1')),
    'RECENT-BUILDS-BILLION-DOLLAR-UI-001 upgrades Recent Work without smearing ownership',
    `closeouts=${recentBuildsUiStatus.summary?.closeoutBuilds} sameCommit=${recentBuildsUiStatus.summary?.sameCommitGroups} manual=${recentBuildsUiStatus.summary?.manualRouteChecks}/10 closeout=${buildLogRecentBuildsUiBuild?.closeoutKey || 'missing'}`,
  )
  const changeLogComprehensiveBuildLogExact = buildLogChangeLogComprehensiveBuild?.backlogIds?.length === 1 &&
    buildLogChangeLogComprehensiveBuild.backlogIds.includes(CHANGE_LOG_COMPREHENSIVE_CARD_ID) &&
    !['PLAIN-ENGLISH-SWEEP-001', 'UI-MENU-LAYOUT-POLISH-001', 'RECENT-BUILDS-BILLION-DOLLAR-UI-001', 'DAILY-EXEC-SUMMARY-001', 'SOURCE-LIFECYCLE-EXPANSION-001']
      .some(id => buildLogChangeLogComprehensiveBuild.backlogIds.includes(id))
  ensure(
    checks,
    changeLogComprehensive?.lane === 'done' &&
      /change-log-comprehensive-v1/.test(changeLogComprehensive?.statusNote || '') &&
      changeLogComprehensiveApprovalValidation.ok &&
      changeLogComprehensiveApprovalValidation.mode === 'v2' &&
      changeLogComprehensiveApprovalValidation.approval?.approvedPlanRef === CHANGE_LOG_COMPREHENSIVE_APPROVED_PLAN_PATH &&
      includesAll(changeLogComprehensiveApprovedPlan, [
        '40+ changelog entries total',
        '20+ verified closeout-backed entries',
        'at least 8 of the 10 required change types',
        '/api/foundation/changes keeps its existing shape',
        'Private/local docs may appear only as metadata/classification',
      ]) &&
      includesAll(foundationVerifySource, CHANGE_LOG_COMPREHENSIVE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE) &&
      includesAll(packageSource, ['"process:change-log-comprehensive-check"', 'scripts/process-change-log-comprehensive-check.mjs']) &&
      changeLogComprehensiveStatus.status === 'healthy' &&
      changeLogComprehensiveStatus.summary?.totalEntries >= 40 &&
      changeLogComprehensiveStatus.summary?.verifiedCloseoutBackedEntries >= 20 &&
      changeLogComprehensiveStatus.summary?.representedChangeTypes >= 8 &&
      changeLogComprehensiveStatus.summary?.latestRecentBuildsRepresented >= 5 &&
      changeLogComprehensiveStatus.summary?.latestChangeLogCloseoutRepresented === true &&
      changeLogComprehensiveStatus.summary?.ownershipContextSmearing === 0 &&
      changeLogComprehensiveStatus.summary?.missingTypesWithoutProof === 0 &&
      changeLogComprehensiveStatus.summary?.privateEvidenceLeaks === 0 &&
      includesAll(changeLogComprehensiveBaseline, [
        'Baseline source: 95e47e7',
        'Existing closeout-backed entries available',
        'Existing change_events available',
        'Latest Recent Builds represented',
      ]) &&
      includesAll(changeLogComprehensiveManualReview, [
        'Failures: 0',
        'recent highlights visible',
        'by-surface grouping visible',
        'by-type grouping visible',
        'raw evidence feed visible',
        'evidence refs inspectable',
        'ownership/context separation visible',
        'desktop 1440x900',
        'mobile 390x844',
      ]) &&
      foundationChangeLog.schemaVersion === 1 &&
      foundationChangeLog.summary?.totalEntries >= 40 &&
      Array.isArray(foundationChangeLog.groups?.recentHighlights) &&
      Array.isArray(foundationChangeLog.groups?.bySurface) &&
      Array.isArray(foundationChangeLog.groups?.byType) &&
      Array.isArray(foundationChangeLog.groups?.rawEvidence) &&
      Array.isArray(foundationChangesApi.changes) &&
      includesAll(foundationFrontendSource, [
        'fetchFoundationChangeLog',
        'renderChangeLogHighlights',
        'renderChangeLogSurfaceGroups',
        'renderChangeLogTypeGroups',
        'renderChangeLogRawEvidence',
        'Owning cards',
        'Context cards',
      ]) &&
      includesAll(foundationStylesSource, [
        '.change-log-summary-grid',
        '.change-log-group-grid',
        '.change-log-evidence-list',
      ]) &&
      (['DAILY-EXEC-SUMMARY-001', 'SOURCE-LIFECYCLE-EXPANSION-001'].includes(phaseGNextCard) || phaseGTrack2Complete) &&
      buildLogChangeLogComprehensiveBuild?.operatorCloseout === true &&
      changeLogComprehensiveBuildLogExact &&
      currentPlan.includes('CHANGE-LOG-COMPREHENSIVE-001` is done for v1') &&
      currentPlan.includes('DAILY-EXEC-SUMMARY-001') &&
      currentState.includes('CHANGE-LOG-COMPREHENSIVE-001` is done for v1') &&
      (currentState.includes('Next expected card is `DAILY-EXEC-SUMMARY-001`') ||
        currentState.includes('Next expected card is `SOURCE-LIFECYCLE-EXPANSION-001`') ||
        currentState.includes('SOURCE-LIFECYCLE-EXPANSION-001` is done for v1')),
    'CHANGE-LOG-COMPREHENSIVE-001 adds comprehensive source-backed changelog coverage',
    `entries=${changeLogComprehensiveStatus.summary?.totalEntries} closeoutBacked=${changeLogComprehensiveStatus.summary?.verifiedCloseoutBackedEntries} types=${changeLogComprehensiveStatus.summary?.representedChangeTypes}/10 closeout=${buildLogChangeLogComprehensiveBuild?.closeoutKey || 'missing'}`,
  )
  const dailyExecSummaryBuildLogExact = buildLogDailyExecSummaryBuild?.backlogIds?.length === 1 &&
    buildLogDailyExecSummaryBuild.backlogIds.includes(DAILY_EXEC_SUMMARY_CARD_ID) &&
    !['PLAIN-ENGLISH-SWEEP-001', 'UI-MENU-LAYOUT-POLISH-001', 'RECENT-BUILDS-BILLION-DOLLAR-UI-001', 'CHANGE-LOG-COMPREHENSIVE-001', 'SOURCE-LIFECYCLE-EXPANSION-001']
      .some(id => buildLogDailyExecSummaryBuild.backlogIds.includes(id))
  ensure(
    checks,
    dailyExecSummary?.lane === 'done' &&
      /daily-exec-summary-v1/.test(dailyExecSummary?.statusNote || '') &&
      dailyExecSummaryApprovalValidation.ok &&
      dailyExecSummaryApprovalValidation.mode === 'v2' &&
      dailyExecSummaryApprovalValidation.approval?.approvedPlanRef === DAILY_EXEC_SUMMARY_APPROVED_PLAN_PATH &&
      includesAll(dailyExecSummaryApprovedPlan, [
        'source-backed inputs only',
        'No generated narrative without evidence',
        'Every summary section must carry evidence refs',
        'No private/local file content copied',
      ]) &&
      includesAll(foundationVerifySource, DAILY_EXEC_SUMMARY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE) &&
      includesAll(packageSource, ['"process:daily-exec-summary-check"', 'scripts/process-daily-exec-summary-check.mjs']) &&
      dailyExecSummaryStatus.status === 'healthy' &&
      dailyExecSummaryStatus.summary?.selectedDateHasEvidence === true &&
      dailyExecSummaryStatus.summary?.sectionEvidenceComplete === true &&
      dailyExecSummaryStatus.summary?.latestRecentBuildsRepresented >= 5 &&
      dailyExecSummaryStatus.summary?.latestDailyCloseoutRepresented === true &&
      dailyExecSummaryStatus.summary?.shippedTodayCount > 0 &&
      (dailyExecSummaryStatus.summary?.stillOpenCount > 0 || phaseGTrack2Complete) &&
      dailyExecSummaryStatus.summary?.needsReviewCount > 0 &&
      (dailyExecSummaryStatus.summary?.nextBuildCount > 0 || phaseGTrack2Complete) &&
      dailyExecSummaryStatus.summary?.ownershipContextSmearing === 0 &&
      dailyExecSummaryStatus.summary?.privateEvidenceLeaks === 0 &&
      includesAll(dailyExecSummaryBaseline, [
        'Baseline source: 289dc62',
        'Closeout-backed builds available',
        'Changelog entries available',
        'Latest five Recent Work closeouts',
      ]) &&
      includesAll(dailyExecSummaryManualReview, [
        'Failures: 0',
        'selected date',
        'recent-day selector/list',
        'where we started',
        'what changed',
        'what shipped',
        'what remains',
        'what we learned',
        'what is next',
        'proof/evidence refs',
        'desktop 1440x900',
        'mobile 390x844',
      ]) &&
      foundationDailySummary.schemaVersion === 1 &&
      foundationDailySummary.query?.selectedDate === '2026-04-30' &&
      Array.isArray(foundationDailySummary.days) &&
      foundationDailySummary.days[0]?.sections?.whereWeStarted?.evidenceRefs?.length > 0 &&
      foundationDailySummary.days[0]?.sections?.whatChanged?.evidenceRefs?.length > 0 &&
      foundationDailySummary.days[0]?.sections?.whatShipped?.evidenceRefs?.length > 0 &&
      foundationDailySummary.days[0]?.sections?.whatRemains?.evidenceRefs?.length > 0 &&
      foundationDailySummary.days[0]?.sections?.whatWeLearned?.evidenceRefs?.length > 0 &&
      foundationDailySummary.days[0]?.sections?.whatIsNext?.evidenceRefs?.length > 0 &&
      foundationDailySummary.days[0]?.sections?.proof?.evidenceRefs?.length > 0 &&
      foundationBuildLog.schemaVersion === 2 &&
      foundationChangeLog.schemaVersion === 1 &&
      Array.isArray(foundationChangesApi.changes) &&
      includesAll(foundationHtmlSource, [
        'data-section="daily-summary"',
        'Daily Summary',
      ]) &&
      includesAll(foundationFrontendSource, [
        'fetchFoundationDailySummary',
        'renderDailySummary',
        'data-daily-summary-section',
        'Shipped today',
        'Still open',
        'Needs review',
        'Next build',
      ]) &&
      includesAll(foundationStylesSource, [
        '.daily-summary-day-list',
        '.daily-summary-item',
        '.daily-summary-evidence',
      ]) &&
      (phaseGNextCard === 'SOURCE-LIFECYCLE-EXPANSION-001' || phaseGTrack2Complete) &&
      buildLogDailyExecSummaryBuild?.operatorCloseout === true &&
      dailyExecSummaryBuildLogExact &&
      currentPlan.includes('DAILY-EXEC-SUMMARY-001` is done for v1') &&
      currentPlan.includes('SOURCE-LIFECYCLE-EXPANSION-001') &&
      currentState.includes('DAILY-EXEC-SUMMARY-001` is done for v1') &&
      (currentState.includes('Next expected card is `SOURCE-LIFECYCLE-EXPANSION-001`') ||
        currentState.includes('SOURCE-LIFECYCLE-EXPANSION-001` is done for v1')),
    'DAILY-EXEC-SUMMARY-001 adds source-backed daily executive summaries',
    `date=${foundationDailySummary.query?.selectedDate || 'missing'} shipped=${dailyExecSummaryStatus.summary?.shippedTodayCount} evidence=${dailyExecSummaryStatus.summary?.sectionEvidenceComplete} closeout=${buildLogDailyExecSummaryBuild?.closeoutKey || 'missing'}`,
  )
  const sourceLifecycleBuildLogExact = buildLogSourceLifecycleBuild?.backlogIds?.length === 1 &&
    buildLogSourceLifecycleBuild.backlogIds.includes(SOURCE_LIFECYCLE_CARD_ID) &&
    !['PLAIN-ENGLISH-SWEEP-001', 'UI-MENU-LAYOUT-POLISH-001', 'RECENT-BUILDS-BILLION-DOLLAR-UI-001', 'CHANGE-LOG-COMPREHENSIVE-001', 'DAILY-EXEC-SUMMARY-001']
      .some(id => buildLogSourceLifecycleBuild.backlogIds.includes(id))
  ensure(
    checks,
    sourceLifecycle?.lane === 'done' &&
      /source-lifecycle-expansion-v1/.test(sourceLifecycle?.statusNote || '') &&
      sourceLifecycleApprovalValidation.ok &&
      sourceLifecycleApprovalValidation.mode === 'v2' &&
      sourceLifecycleApprovalValidation.approval?.approvedPlanRef === SOURCE_LIFECYCLE_APPROVED_PLAN_PATH &&
      includesAll(sourceLifecycleApprovedPlan, [
        'source lifecycle visibility/control only',
        'No new extraction targets',
        'No extraction quota increases',
        'Evidence refs are metadata only',
      ]) &&
      includesAll(foundationVerifySource, SOURCE_LIFECYCLE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE) &&
      includesAll(packageSource, ['"process:source-lifecycle-expansion-check"', 'scripts/process-source-lifecycle-expansion-check.mjs']) &&
      sourceLifecycleStatus.status === 'healthy' &&
      sourceLifecycleStatus.summary?.allSourceContractsCovered === true &&
      sourceLifecycleStatus.summary?.extractionTargetCount === SOURCE_LIFECYCLE_REQUIRED_TARGET_COUNT &&
      sourceLifecycleStatus.summary?.includedSourceMissingCount === 0 &&
      sourceLifecycleStatus.summary?.laneCompletenessFailures === 0 &&
      sourceLifecycleStatus.summary?.extractionCapsUnchanged === true &&
      sourceLifecycleStatus.summary?.targetBaselineChanges === 0 &&
      sourceLifecycleStatus.summary?.targetBaselineExtraTargets === 0 &&
      sourceLifecycleStatus.summary?.blockedPausedPlannedActivated === 0 &&
      sourceLifecycleStatus.summary?.privateEvidenceLeaks === 0 &&
      sourceLifecycleStatus.summary?.rawContentKeyFindings === 0 &&
      includesAll(sourceLifecycleBaseline, [
        'Baseline source: 6fb1781',
        'Source contracts: 35',
        'Extraction targets: 12',
        'No extraction target, schedule, or quota changed in the baseline',
      ]) &&
      includesAll(sourceLifecycleManualReview, [
        'Failures: 0',
        'source lifecycle route',
        'active source lanes',
        'parked/blocked lanes',
        'extraction caps',
        'evidence refs',
        'lifecycle definitions',
        'desktop 1440x900',
        'mobile 390x844',
      ]) &&
      foundationSourceLifecycle.schemaVersion === 1 &&
      foundationSourceLifecycle.route === SOURCE_LIFECYCLE_ROUTE &&
      foundationSourceLifecycle.summary?.allSourceContractsCovered === true &&
      foundationSourceLifecycle.summary?.extractionTargetCount === SOURCE_LIFECYCLE_REQUIRED_TARGET_COUNT &&
      foundationSourceLifecycle.summary?.extractionCapsUnchanged === true &&
      (
        foundationHub.sourceLifecycle?.summary?.extractionTargetCount === SOURCE_LIFECYCLE_REQUIRED_TARGET_COUNT ||
        foundationSourceLifecycle.summary?.extractionTargetCount === SOURCE_LIFECYCLE_REQUIRED_TARGET_COUNT
      ) &&
      sourceOfTruth.sources?.length === foundationSourceLifecycle.summary?.sourceContractCount &&
      Array.isArray(sourceOfTruth.connectors) &&
      includesAll(foundationHtmlSource, [
        'data-section="source-lifecycle"',
        'Lifecycle',
      ]) &&
      includesAll(foundationFrontendSource, [
        'fetchSourceLifecycle',
        'renderSourceLifecycle',
        'data-source-lifecycle-section',
        'Source Lifecycle',
        'parked-blocked-lanes',
      ]) &&
      includesAll(foundationStylesSource, [
        '.source-lifecycle-definition-grid',
        '.source-lifecycle-target-grid',
        '.source-lifecycle-evidence',
      ]) &&
      phaseGTrack2Complete &&
      buildLogSourceLifecycleBuild?.operatorCloseout === true &&
      sourceLifecycleBuildLogExact &&
      currentPlan.includes('SOURCE-LIFECYCLE-EXPANSION-001` is done for v1') &&
      currentState.includes('SOURCE-LIFECYCLE-EXPANSION-001` is done for v1'),
    'SOURCE-LIFECYCLE-EXPANSION-001 adds source lifecycle visibility/control without ingestion',
    `sources=${sourceLifecycleStatus.summary?.sourceContractCount} targets=${sourceLifecycleStatus.summary?.extractionTargetCount} caps=${sourceLifecycleStatus.summary?.extractionCapsUnchanged} closeout=${buildLogSourceLifecycleBuild?.closeoutKey || 'missing'}`,
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
