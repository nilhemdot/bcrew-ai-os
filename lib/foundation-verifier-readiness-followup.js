export const VERIFIER_READINESS_FOLLOWUP_SPLIT_CARD_ID = 'VERIFIER-READINESS-FOLLOWUP-SPLIT-001'
export const VERIFIER_READINESS_FOLLOWUP_SPLIT_CLOSEOUT_KEY = 'verifier-readiness-followup-split-v1'
export const VERIFIER_READINESS_FOLLOWUP_SPLIT_PLAN_PATH = 'docs/process/verifier-readiness-followup-split-001-plan.md'
export const VERIFIER_READINESS_FOLLOWUP_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-READINESS-FOLLOWUP-SPLIT-001.json'
export const VERIFIER_READINESS_FOLLOWUP_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-readiness-followup-split-check.mjs'
export const VERIFIER_READINESS_FOLLOWUP_SPLIT_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-verifier-readiness-followup-split-closeout.md'
export const VERIFIER_READINESS_FOLLOWUP_SPLIT_BEFORE_LINES = 11949

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function includesAll(source, needles = []) {
  return needles.every(needle => String(source || '').includes(needle))
}

function evaluateReadinessFollowupFixture(fixture = {}) {
  const findings = []
  if (fixture.readyReviewPasses !== true) findings.push('ready_review_not_proven')
  if (fixture.followupOwnsOnlyCapture !== true) findings.push('followup_closeout_owns_feature_scope')
  if (fixture.followupCardsStayScoped !== true) findings.push('followup_cards_not_scoped_or_closed')
  if (fixture.systemGroupsSeparated !== true) findings.push('systems_service_groups_not_separated')
  if (fixture.salesGlsCloseoutCovered !== true) findings.push('sales_gls_closeout_not_covered')
  if (fixture.shippedSystemsRegistered !== true) findings.push('shipped_systems_not_registered')
  if (fixture.leaksPrivateAgentFeedbackLink === true) findings.push('private_agent_feedback_link_leaked')
  return { ok: findings.length === 0, findings }
}

export function buildFoundationVerifierReadinessFollowupDogfoodProof() {
  const healthy = evaluateReadinessFollowupFixture({
    readyReviewPasses: true,
    followupOwnsOnlyCapture: true,
    followupCardsStayScoped: true,
    systemGroupsSeparated: true,
    salesGlsCloseoutCovered: true,
    shippedSystemsRegistered: true,
    leaksPrivateAgentFeedbackLink: false,
  })
  const rejected = {
    hiddenReadinessFailure: evaluateReadinessFollowupFixture({
      readyReviewPasses: false,
      followupOwnsOnlyCapture: true,
      followupCardsStayScoped: true,
      systemGroupsSeparated: true,
      salesGlsCloseoutCovered: true,
      shippedSystemsRegistered: true,
      leaksPrivateAgentFeedbackLink: false,
    }),
    followupScopeCreep: evaluateReadinessFollowupFixture({
      readyReviewPasses: true,
      followupOwnsOnlyCapture: false,
      followupCardsStayScoped: false,
      systemGroupsSeparated: true,
      salesGlsCloseoutCovered: true,
      shippedSystemsRegistered: true,
      leaksPrivateAgentFeedbackLink: false,
    }),
    combinedServiceBucket: evaluateReadinessFollowupFixture({
      readyReviewPasses: true,
      followupOwnsOnlyCapture: true,
      followupCardsStayScoped: true,
      systemGroupsSeparated: false,
      salesGlsCloseoutCovered: true,
      shippedSystemsRegistered: true,
      leaksPrivateAgentFeedbackLink: false,
    }),
    missingShippedSystem: evaluateReadinessFollowupFixture({
      readyReviewPasses: true,
      followupOwnsOnlyCapture: true,
      followupCardsStayScoped: true,
      systemGroupsSeparated: true,
      salesGlsCloseoutCovered: true,
      shippedSystemsRegistered: false,
      leaksPrivateAgentFeedbackLink: false,
    }),
    privateLinkLeak: evaluateReadinessFollowupFixture({
      readyReviewPasses: true,
      followupOwnsOnlyCapture: true,
      followupCardsStayScoped: true,
      systemGroupsSeparated: true,
      salesGlsCloseoutCovered: true,
      shippedSystemsRegistered: true,
      leaksPrivateAgentFeedbackLink: true,
    }),
  }
  const ok = healthy.ok && Object.values(rejected).every(result => result.ok === false)
  return {
    ok,
    healthy,
    rejected,
    dogfoodInvariant: ok
      ? 'healthy readiness/follow-up fixture passes; hidden readiness, follow-up scope creep, combined service buckets, missing shipped systems, and private-link leaks fail closed'
      : 'readiness/follow-up verifier dogfood did not reject every known failure fixture',
  }
}

export async function evaluateFoundationVerifierReadinessFollowup(input = {}) {
  const {
    AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID,
    AGENT_FEEDBACK_SEND_CARD_ID,
    AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID,
    FOUNDATION_FOLLOWUP_BUILD_ORDER,
    FOUNDATION_FOLLOWUP_CARD_CAPTURE_APPROVED_PLAN_PATH,
    FOUNDATION_FOLLOWUP_CARD_CAPTURE_CARD_ID,
    FOUNDATION_FOLLOWUP_CARD_CAPTURE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    FOUNDATION_FOLLOWUP_NON_SCOPE_PHRASES,
    FOUNDATION_SPRINT_REVIEW_CARD_ID,
    FOUNDATION_SPRINT_REVIEW_DOC_PATH,
    FOUNDATION_SPRINT_REVIEW_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    FOUNDATION_SYSTEMS_APPROVED_GROUPED_SYSTEM_COUNT,
    FOUNDATION_SYSTEMS_SERVICE_GROUPING_APPROVED_PLAN_PATH,
    FOUNDATION_SYSTEMS_SERVICE_GROUPING_CARD_ID,
    FOUNDATION_SYSTEMS_SERVICE_GROUPING_CLOSEOUT_KEY,
    FOUNDATION_SYSTEMS_SERVICE_GROUPING_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    FOUNDATION_SYSTEMS_SERVICE_GROUPING_NON_SCOPE_PHRASES,
    FOUNDATION_SYSTEMS_SERVICE_GROUPS,
    MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY,
    PLAN_CRITIC_REPLACEMENT_CARD_ID,
    REBUILD_PLAN_RECONCILE_CARD_ID,
    SALES_GLS_SCOREBOARD_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    SECURITY_BEHAVIOR_PROOF_CARD_ID,
    SYSTEM_REGISTRATION_AGENT_FEEDBACK_SYSTEM_ID,
    SYSTEM_REGISTRATION_GLS_SYSTEM_ID,
    SYSTEM_REGISTRATION_SHIPPED_SYSTEM_REQUIREMENTS,
    SYSTEM_REGISTRATION_SWEEP_APPROVED_PLAN_PATH,
    SYSTEM_REGISTRATION_SWEEP_CARD_ID,
    SYSTEM_REGISTRATION_SWEEP_CLOSEOUT_KEY,
    SYSTEM_REGISTRATION_SWEEP_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
    buildLogFoundationFollowupCardCaptureBuild,
    buildLogFoundationSystemsServiceGroupingBuild,
    buildLogSalesGlsScoreboardBuild,
    buildLogSystemRegistrationSweepBuild,
    currentPlan,
    currentState,
    foundationDbWithBacklogSeedSource,
    foundationDoneTestReadinessStatus,
    foundationFollowupCardCapture,
    foundationFollowupCardCaptureApprovalValidation,
    foundationFollowupCardCaptureApprovedPlan,
    foundationFollowupCardCaptureAudit,
    foundationFollowupCardCaptureStatus,
    foundationFollowupCards,
    foundationFrontendSource,
    foundationSprintReview,
    foundationSprintReviewSource,
    foundationStylesSource,
    foundationSystemsServiceGrouping,
    foundationSystemsServiceGroupingApprovalValidation,
    foundationSystemsServiceGroupingApprovedPlan,
    foundationSystemsServiceGroupingBaseline,
    foundationSystemsServiceGroupingManualReview,
    foundationSystemsServiceGroupingStatus,
    foundationVerifySource,
    packageSource,
    salesGlsScoreboard,
    salesHtmlSource,
    salesHubCheckSource,
    salesUiSource,
    serverSource,
    sourceContractsSource,
    sourceOfTruth,
    sourceRegistry,
    systemRegistrationSweep,
    systemRegistrationSweepApprovalValidation,
    systemRegistrationSweepApprovedPlan,
    systemRegistrationSweepProof,
    systemRegistrationSweepStatus,
  } = input
  const checks = []

  ensure(
    checks,
    foundationSprintReview?.lane === 'done' &&
      String(foundationSprintReview?.statusNote || '').includes(FOUNDATION_SPRINT_REVIEW_DOC_PATH) &&
      String(foundationSprintReview?.nextAction || '').includes(REBUILD_PLAN_RECONCILE_CARD_ID) &&
      includesAll(foundationSprintReviewSource, [
        'What Shipped',
        'What READY Means',
        'Meeting Vault Legacy Exceptions',
        'Remaining Follow-Ups',
        'Risks And Weak Spots',
        'Recommended Next Sprint',
        'Audit update on 2026-05-12',
        REBUILD_PLAN_RECONCILE_CARD_ID,
        PLAN_CRITIC_REPLACEMENT_CARD_ID,
        SECURITY_BEHAVIOR_PROOF_CARD_ID,
        VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
        'STRATEGY-HUB-MEETING-READY-001',
        'No Drive mutations',
        'No Sales or Agent Feedback expansion',
        'No advisor chat',
      ]) &&
      foundationSprintReviewSource.includes('readyForStrategy: true') &&
      foundationSprintReviewSource.includes(MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY) &&
      foundationSprintReviewSource.includes('92be8addc997a9f61ed881be6bc478fcef7021dea8425cc3f4e7368ace99caa1') &&
      foundationDoneTestReadinessStatus.status === 'ready' &&
      foundationDoneTestReadinessStatus.readyForStrategy === true &&
      currentPlan.includes(FOUNDATION_SPRINT_REVIEW_CARD_ID) &&
      currentPlan.includes(FOUNDATION_SPRINT_REVIEW_DOC_PATH) &&
      currentPlan.includes(REBUILD_PLAN_RECONCILE_CARD_ID) &&
      currentPlan.includes(PLAN_CRITIC_REPLACEMENT_CARD_ID) &&
      currentPlan.includes(SECURITY_BEHAVIOR_PROOF_CARD_ID) &&
      currentPlan.includes(VERIFIER_BEHAVIOR_SWEEP_CARD_ID) &&
      currentPlan.includes('STRATEGY-HUB-MEETING-READY-001') &&
      currentState.includes(FOUNDATION_SPRINT_REVIEW_CARD_ID) &&
      currentState.includes(FOUNDATION_SPRINT_REVIEW_DOC_PATH) &&
      currentState.includes('readyForStrategy: yes') &&
      currentState.includes(REBUILD_PLAN_RECONCILE_CARD_ID) &&
      includesAll(foundationVerifySource, FOUNDATION_SPRINT_REVIEW_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'FOUNDATION-SPRINT-REVIEW-001 preserves READY review and points to the audit-reset next card without feature work',
    `lane=${foundationSprintReview?.lane || 'missing'} readiness=${foundationDoneTestReadinessStatus.status} next=${foundationSprintReview?.nextAction || 'missing'}`,
  )
  const foundationFollowupCardCaptureBuildLogExact = buildLogFoundationFollowupCardCaptureBuild?.backlogIds?.length === 1 &&
    buildLogFoundationFollowupCardCaptureBuild.backlogIds.includes(FOUNDATION_FOLLOWUP_CARD_CAPTURE_CARD_ID) &&
    FOUNDATION_FOLLOWUP_BUILD_ORDER.every(id => (buildLogFoundationFollowupCardCaptureBuild.mentionedBacklogIds || []).includes(id)) &&
    (buildLogFoundationFollowupCardCaptureBuild.mentionedBacklogIds || []).includes('PEOPLE-006') &&
    ![...FOUNDATION_FOLLOWUP_BUILD_ORDER, 'PEOPLE-006'].some(id =>
      (buildLogFoundationFollowupCardCaptureBuild.backlogIds || []).includes(id)
    )
  const foundationFollowupCardsHaveAllowedState = foundationFollowupCards.length === 3 &&
    foundationFollowupCards.every(card => {
      if (card?.id === FOUNDATION_SYSTEMS_SERVICE_GROUPING_CARD_ID) {
        return card?.lane === 'scoped' ||
          (card?.lane === 'done' && /foundation-systems-service-grouping-v1/.test(card?.statusNote || ''))
      }
      if (card?.id === AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID) {
        return card?.lane === 'scoped' ||
          (card?.lane === 'done' && /agent-onboarding-feedback-system-v1/.test(card?.statusNote || ''))
      }
      if (card?.id === AGENT_FEEDBACK_SEND_CARD_ID) {
        return card?.lane === 'scoped' ||
          (card?.lane === 'done' && /agent-feedback-send-v1/.test(card?.statusNote || ''))
      }
      return card?.lane === 'scoped'
    })
  ensure(
    checks,
    foundationFollowupCardCapture?.lane === 'done' &&
      /foundation-followup-card-capture-v1/.test(foundationFollowupCardCapture?.statusNote || '') &&
      foundationFollowupCardsHaveAllowedState &&
      foundationFollowupCardCaptureApprovalValidation.ok &&
      foundationFollowupCardCaptureApprovalValidation.mode === 'v2' &&
      foundationFollowupCardCaptureApprovalValidation.approval?.approvedPlanRef === FOUNDATION_FOLLOWUP_CARD_CAPTURE_APPROVED_PLAN_PATH &&
      includesAll(foundationFollowupCardCaptureApprovedPlan, [
        FOUNDATION_FOLLOWUP_CARD_CAPTURE_CARD_ID,
        ...FOUNDATION_FOLLOWUP_BUILD_ORDER,
        ...FOUNDATION_FOLLOWUP_NON_SCOPE_PHRASES,
        '`PEOPLE-006` stays related/context only',
        'Submitted feedback still writes Completed, score, and feedback text back to the correct ClickUp Onboarding NPS 30/60/90 Status, Score, and Feedback fields',
      ]) &&
      includesAll(foundationFollowupCardCaptureAudit, [
        FOUNDATION_FOLLOWUP_CARD_CAPTURE_CARD_ID,
        ...FOUNDATION_FOLLOWUP_BUILD_ORDER,
        ...FOUNDATION_FOLLOWUP_NON_SCOPE_PHRASES,
      ]) &&
      includesAll(foundationVerifySource, FOUNDATION_FOLLOWUP_CARD_CAPTURE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE) &&
      includesAll(packageSource, ['"process:foundation-followup-card-capture-check"', 'scripts/process-foundation-followup-card-capture-check.mjs']) &&
      foundationFollowupCardCaptureStatus.status === 'healthy' &&
      foundationFollowupCardCaptureStatus.summary?.scopedCardCount === 3 &&
      foundationFollowupCardCaptureStatus.summary?.scopedCardsRemainScoped === true &&
      foundationFollowupCardCaptureStatus.summary?.requiredGroups === FOUNDATION_SYSTEMS_SERVICE_GROUPS.length &&
      foundationFollowupCardCaptureStatus.summary?.peopleContextOnly === true &&
      foundationFollowupCardCaptureStatus.summary?.closeoutOwnsOnlyCapture === true &&
      buildLogFoundationFollowupCardCaptureBuild?.operatorCloseout === true &&
      foundationFollowupCardCaptureBuildLogExact &&
      currentPlan.includes('FOUNDATION-FOLLOWUP-CARD-CAPTURE-001` is done for v1') &&
      currentPlan.includes('1. FOUNDATION-SYSTEMS-SERVICE-GROUPING-001') &&
      currentPlan.includes('2. AGENT-ONBOARDING-FEEDBACK-SYSTEM-001') &&
      currentPlan.includes('3. AGENT-FEEDBACK-SEND-001') &&
      currentState.includes('FOUNDATION-FOLLOWUP-CARD-CAPTURE-001` is done for v1') &&
      currentState.includes('1. FOUNDATION-SYSTEMS-SERVICE-GROUPING-001') &&
      currentState.includes('2. AGENT-ONBOARDING-FEEDBACK-SYSTEM-001') &&
      currentState.includes('3. AGENT-FEEDBACK-SEND-001'),
    'FOUNDATION-FOLLOWUP-CARD-CAPTURE-001 captures missing follow-up cards without feature work',
    `scoped=${foundationFollowupCardCaptureStatus.summary?.scopedCardCount}/3 groups=${foundationFollowupCardCaptureStatus.summary?.requiredGroups} closeout=${buildLogFoundationFollowupCardCaptureBuild?.closeoutKey || 'missing'}`,
  )
  const foundationSystemsServiceGroupingBuildLogExact = buildLogFoundationSystemsServiceGroupingBuild?.backlogIds?.length === 1 &&
    buildLogFoundationSystemsServiceGroupingBuild.backlogIds.includes(FOUNDATION_SYSTEMS_SERVICE_GROUPING_CARD_ID) &&
    (buildLogFoundationSystemsServiceGroupingBuild.mentionedBacklogIds || []).includes('AGENT-ONBOARDING-FEEDBACK-SYSTEM-001') &&
    !(buildLogFoundationSystemsServiceGroupingBuild.backlogIds || []).includes('AGENT-ONBOARDING-FEEDBACK-SYSTEM-001') &&
    !(buildLogFoundationSystemsServiceGroupingBuild.backlogIds || []).includes('AGENT-FEEDBACK-SEND-001')
  ensure(
    checks,
    foundationSystemsServiceGrouping?.lane === 'done' &&
      /foundation-systems-service-grouping-v1/.test(foundationSystemsServiceGrouping?.statusNote || '') &&
      foundationSystemsServiceGroupingApprovalValidation.ok &&
      foundationSystemsServiceGroupingApprovalValidation.mode === 'v2' &&
      foundationSystemsServiceGroupingApprovalValidation.approval?.approvedPlanRef === FOUNDATION_SYSTEMS_SERVICE_GROUPING_APPROVED_PLAN_PATH &&
      includesAll(foundationSystemsServiceGroupingApprovedPlan, [
        FOUNDATION_SYSTEMS_SERVICE_GROUPING_CARD_ID,
        FOUNDATION_SYSTEMS_SERVICE_GROUPING_CLOSEOUT_KEY,
        ...FOUNDATION_SYSTEMS_SERVICE_GROUPS,
        ...FOUNDATION_SYSTEMS_SERVICE_GROUPING_NON_SCOPE_PHRASES,
        'No combined Sales/Recruiting bucket',
        'Unclassified systems must fail the check',
      ]) &&
      includesAll(foundationSystemsServiceGroupingBaseline, [
        'Baseline source: 137d428',
        'Existing grouped systems: 12',
        'Approved service groups: 14',
      ]) &&
      includesAll(foundationSystemsServiceGroupingManualReview, [
        'Failures: 0',
        'desktop 1440x900',
        'mobile 390x844',
        '/foundation#systems',
        'no horizontal overflow',
        'no overlapping text',
        'service groups visible',
        'system cards readable',
        'technical metadata still reachable',
      ]) &&
      includesAll(foundationVerifySource, FOUNDATION_SYSTEMS_SERVICE_GROUPING_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE) &&
      includesAll(packageSource, ['"process:foundation-systems-service-grouping-check"', 'scripts/process-foundation-systems-service-grouping-check.mjs']) &&
      Array.isArray(sourceOfTruth.systemServiceAreas) &&
      sourceOfTruth.systemServiceAreas.length === FOUNDATION_SYSTEMS_SERVICE_GROUPS.length &&
      Array.isArray(sourceOfTruth.groupedSystems) &&
      sourceOfTruth.groupedSystems.length === FOUNDATION_SYSTEMS_APPROVED_GROUPED_SYSTEM_COUNT &&
      foundationSystemsServiceGroupingStatus.status === 'healthy' &&
      foundationSystemsServiceGroupingStatus.summary?.approvedServiceGroupCount === FOUNDATION_SYSTEMS_SERVICE_GROUPS.length &&
      foundationSystemsServiceGroupingStatus.summary?.groupedSystemCount === FOUNDATION_SYSTEMS_APPROVED_GROUPED_SYSTEM_COUNT &&
      foundationSystemsServiceGroupingStatus.summary?.primaryAssignedCount === FOUNDATION_SYSTEMS_APPROVED_GROUPED_SYSTEM_COUNT &&
      foundationSystemsServiceGroupingStatus.summary?.invalidSystemCount === 0 &&
      foundationSystemsServiceGroupingStatus.summary?.salesRecruitingSeparated === true &&
      foundationSystemsServiceGroupingStatus.summary?.closeoutOwnsOnlyGrouping === true &&
      includesAll(sourceContractsSource, ['FOUNDATION_SYSTEM_SERVICE_AREAS', 'serviceArea', 'secondaryServiceAreas']) &&
      includesAll(foundationFrontendSource, [
        'renderFoundationSystemsServiceAreaSummary',
        'renderFoundationSystemsServiceAreaGroup',
        'No mapped systems yet.',
      ]) &&
      includesAll(foundationStylesSource, [
        '.foundation-service-area-summary-grid',
        '.foundation-service-area-stack',
        '.foundation-service-area-group',
      ]) &&
      buildLogFoundationSystemsServiceGroupingBuild?.operatorCloseout === true &&
      foundationSystemsServiceGroupingBuildLogExact &&
      currentPlan.includes('FOUNDATION-SYSTEMS-SERVICE-GROUPING-001` is done for v1') &&
      currentPlan.includes('AGENT-ONBOARDING-FEEDBACK-SYSTEM-001') &&
      currentState.includes('FOUNDATION-SYSTEMS-SERVICE-GROUPING-001` is done for v1') &&
      currentState.includes('AGENT-ONBOARDING-FEEDBACK-SYSTEM-001'),
    'FOUNDATION-SYSTEMS-SERVICE-GROUPING-001 groups Systems by service area only',
    `systems=${foundationSystemsServiceGroupingStatus.summary?.groupedSystemCount}/${FOUNDATION_SYSTEMS_APPROVED_GROUPED_SYSTEM_COUNT} groups=${foundationSystemsServiceGroupingStatus.summary?.approvedServiceGroupCount}/${FOUNDATION_SYSTEMS_SERVICE_GROUPS.length} closeout=${buildLogFoundationSystemsServiceGroupingBuild?.closeoutKey || 'missing'}`,
  )
  ensure(
    checks,
    salesGlsScoreboard?.lane === 'done' &&
      salesGlsScoreboard?.priority === 'P1' &&
      /sales-gls-scoreboard-v1|docs\/(?:_archive\/handoffs\/2026-05-19-hot-doc-cleanup|handoffs)\/2026-05-01-sales-gls-v1-closeout\.md/i.test(salesGlsScoreboard?.statusNote || '') &&
      buildLogSalesGlsScoreboardBuild?.operatorCloseout === true &&
      buildLogSalesGlsScoreboardBuild?.backlogIds?.length === 1 &&
      buildLogSalesGlsScoreboardBuild.backlogIds.includes('SALES-GLS-SCOREBOARD-V1') &&
      buildLogSalesGlsScoreboardBuild.proofCommands?.includes('npm run process:sales-listings-hub-check') &&
      includesAll(foundationVerifySource, SALES_GLS_SCOREBOARD_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE) &&
      includesAll(packageSource, ['"process:sales-listings-hub-check"', 'scripts/process-sales-listings-hub-check.mjs']) &&
      includesAll(serverSource, [
        '/api/sales-hub',
        'stale_background_refresh',
        '/api/sales-hub/project-case',
        '/api/sales-hub/listing-case',
      ]) &&
      includesAll(salesHtmlSource, [
        'GLS System',
        'GLS Manager',
        'Open or close Sales navigation',
        'sales.js?v=20260501t',
      ]) &&
      includesAll(salesUiSource, [
        'Get Listings Sold (GLS) Dashboard',
        'Active GLS pipeline',
        'Total GLS cases',
        'Sales leader scoreboard',
        'Weekly cohort view',
        'Moved / sold cases',
        'Case history',
        'Refresh from ClickUp',
        'Last ClickUp refresh',
        'GLS edits save to AIOS immediately',
        'found-nav-active',
        'found-nav-open',
      ]) &&
      includesAll(salesHubCheckSource, [
        'Nick grouped project must count as one GLS case',
        'Synthetic Nick proof must collapse seven units into one grouped GLS case',
        'Synthetic sold/closed case must remain visible from persisted history',
        'Sales Hub must serve cached data immediately while stale ClickUp refresh runs in the background',
      ]) &&
      includesAll(foundationDbWithBacklogSeedSource, [
        'SALES-GLS-GROUPING-OVERRIDES-001',
        'SALES-GLS-RESTALE-REOPEN-001',
        'SALES-GLS-MANAGER-USABILITY-001',
        'SALES-GLS-LEADER-ACCOUNTABILITY-001',
        'SALES-GLS-FUNNEL-FILTERS-001',
        'SALES-GLS-HISTORY-CONTROLS-001',
      ]) &&
      !salesUiSource.includes('Open ClickUp View') &&
      !salesUiSource.includes('found-sidebar-open'),
    'SALES-GLS-SCOREBOARD-V1 closeout keeps Sales Hub GLS v1 covered',
    `card=${salesGlsScoreboard?.lane || 'missing'} closeout=${buildLogSalesGlsScoreboardBuild?.closeoutKey || 'missing'} nav=${salesUiSource.includes('found-nav-open') ? 'foundation-mobile' : 'missing'} refresh=${serverSource.includes('stale_background_refresh') ? 'cached' : 'missing'}`,
  )
  const systemRegistrationSweepBuildLogExact = buildLogSystemRegistrationSweepBuild?.backlogIds?.length === 1 &&
    buildLogSystemRegistrationSweepBuild.backlogIds.includes(SYSTEM_REGISTRATION_SWEEP_CARD_ID) &&
    (buildLogSystemRegistrationSweepBuild.mentionedBacklogIds || []).includes('SALES-GLS-SCOREBOARD-V1') &&
    (buildLogSystemRegistrationSweepBuild.mentionedBacklogIds || []).includes(AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID) &&
    (buildLogSystemRegistrationSweepBuild.mentionedBacklogIds || []).includes(AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID) &&
    !(buildLogSystemRegistrationSweepBuild.backlogIds || []).includes('SALES-GLS-SCOREBOARD-V1') &&
    !(buildLogSystemRegistrationSweepBuild.backlogIds || []).includes(AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID) &&
    !(buildLogSystemRegistrationSweepBuild.backlogIds || []).includes(AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID)
  const glsGroupedSystem = (sourceOfTruth.groupedSystems || []).find(system =>
    system.systemId === SYSTEM_REGISTRATION_GLS_SYSTEM_ID
  ) || null
  const agentOnboardingFeedbackGroupedSystem = (sourceOfTruth.groupedSystems || []).find(system =>
    system.systemId === SYSTEM_REGISTRATION_AGENT_FEEDBACK_SYSTEM_ID
  ) || null
  ensure(
    checks,
    systemRegistrationSweep?.lane === 'done' &&
      /system-registration-sweep-v1/.test(systemRegistrationSweep?.statusNote || '') &&
      systemRegistrationSweepApprovalValidation.ok &&
      systemRegistrationSweepApprovalValidation.mode === 'v2' &&
      systemRegistrationSweepApprovalValidation.approval?.approvedPlanRef === SYSTEM_REGISTRATION_SWEEP_APPROVED_PLAN_PATH &&
      includesAll(systemRegistrationSweepApprovedPlan, [
        SYSTEM_REGISTRATION_SWEEP_CARD_ID,
        SYSTEM_REGISTRATION_SWEEP_CLOSEOUT_KEY,
        'Register `SYS-SALES-GLS-001` as `GLS System / Get Listings Sold`.',
        'Put GLS under service area `Sales` with implementation state `live`.',
        '`/sales#gls-dashboard`',
        '`/sales#gls-system`',
        'ClickUp Deal Data Entry / `SRC-CLICKUP-001`',
        'KPI Shopping List / `SRC-SUPABASE-001` as supporting evidence only',
        'active listings crossing the stale threshold',
        'Sales Leadership',
        '`SALES-GLS-SCOREBOARD-V1` closeout',
        '`SYS-AGENT-ONBOARDING-FEEDBACK-001` remains visible as live under Agent Onboarding',
        'Do not build new GLS features',
        'Do not build new onboarding features',
        'Do not start Strategy, Scoper, Agent, or corpus work',
        'Closeout owns only `SYSTEM-REGISTRATION-SWEEP-001`',
      ]) &&
      includesAll(systemRegistrationSweepProof, [
        SYSTEM_REGISTRATION_SWEEP_CARD_ID,
        SYSTEM_REGISTRATION_SWEEP_CLOSEOUT_KEY,
        SYSTEM_REGISTRATION_GLS_SYSTEM_ID,
        'GLS System / Get Listings Sold',
        'Service area: `Sales`',
        'Implementation state: `live`',
        '`/sales#gls-dashboard`, `/sales#gls-system`',
        'ClickUp Deal Data Entry / `SRC-CLICKUP-001`',
        'KPI Shopping List / `SRC-SUPABASE-001`',
        'SALES-GLS-SCOREBOARD-V1',
        SYSTEM_REGISTRATION_AGENT_FEEDBACK_SYSTEM_ID,
      ]) &&
      !/@/.test(systemRegistrationSweepProof) &&
      !/token=|agent-feedback\?token/i.test(systemRegistrationSweepProof) &&
      includesAll(foundationVerifySource, SYSTEM_REGISTRATION_SWEEP_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE) &&
      includesAll(packageSource, ['"process:system-registration-sweep-check"', 'scripts/process-system-registration-sweep-check.mjs']) &&
      includesAll(sourceContractsSource, [
        SYSTEM_REGISTRATION_GLS_SYSTEM_ID,
        'GLS System / Get Listings Sold',
        'sourceOfTruthIds',
        'supportingSourceIds',
        '/sales#gls-dashboard',
        '/sales#gls-system',
      ]) &&
      includesAll(foundationFrontendSource, [
        'supportingSourceIds',
        'Supporting evidence sources',
        'renderFoundationSystemFullCard',
      ]) &&
      sourceRegistry.includes(SYSTEM_REGISTRATION_GLS_SYSTEM_ID) &&
      glsGroupedSystem?.serviceArea === 'Sales' &&
      glsGroupedSystem?.implementationState === 'live' &&
      (glsGroupedSystem?.sourceOfTruthIds || []).includes('SRC-CLICKUP-001') &&
      (glsGroupedSystem?.supportingSourceIds || []).includes('SRC-SUPABASE-001') &&
      (glsGroupedSystem?.actions || []).some(action => action.href === '/sales#gls-dashboard') &&
      (glsGroupedSystem?.actions || []).some(action => action.href === '/sales#gls-system') &&
      agentOnboardingFeedbackGroupedSystem?.serviceArea === 'Agent Onboarding' &&
      agentOnboardingFeedbackGroupedSystem?.implementationState === 'live' &&
      systemRegistrationSweepStatus.status === 'healthy' &&
      systemRegistrationSweepStatus.summary?.groupedSystemCount === FOUNDATION_SYSTEMS_APPROVED_GROUPED_SYSTEM_COUNT &&
      systemRegistrationSweepStatus.summary?.shippedSystemRequirementCount === SYSTEM_REGISTRATION_SHIPPED_SYSTEM_REQUIREMENTS.length &&
      systemRegistrationSweepStatus.summary?.missingShippedSystemCount === 0 &&
      systemRegistrationSweepStatus.summary?.glsSystemVisible === true &&
      systemRegistrationSweepStatus.summary?.glsServiceArea === 'Sales' &&
      systemRegistrationSweepStatus.summary?.glsImplementationState === 'live' &&
      systemRegistrationSweepStatus.summary?.glsSourceTruthCorrect === true &&
      systemRegistrationSweepStatus.summary?.glsSupportingEvidenceCorrect === true &&
      systemRegistrationSweepStatus.summary?.glsRoutesVisible === true &&
      systemRegistrationSweepStatus.summary?.agentOnboardingFeedbackVisible === true &&
      systemRegistrationSweepStatus.summary?.agentOnboardingFeedbackLive === true &&
      systemRegistrationSweepStatus.summary?.closeoutOwnsOnlySweep === true &&
      buildLogSystemRegistrationSweepBuild?.operatorCloseout === true &&
      systemRegistrationSweepBuildLogExact &&
      currentPlan.includes('SYSTEM-REGISTRATION-SWEEP-001` is done') &&
      currentPlan.includes(SYSTEM_REGISTRATION_GLS_SYSTEM_ID) &&
      currentState.includes('SYSTEM-REGISTRATION-SWEEP-001` is done') &&
      currentState.includes(SYSTEM_REGISTRATION_GLS_SYSTEM_ID),
    'SYSTEM-REGISTRATION-SWEEP-001 keeps shipped systems discoverable',
    `systems=${systemRegistrationSweepStatus.summary?.groupedSystemCount}/${FOUNDATION_SYSTEMS_APPROVED_GROUPED_SYSTEM_COUNT} gls=${systemRegistrationSweepStatus.summary?.glsSystemVisible ? 'visible' : 'missing'} agent=${systemRegistrationSweepStatus.summary?.agentOnboardingFeedbackLive ? 'live' : 'missing'} closeout=${buildLogSystemRegistrationSweepBuild?.closeoutKey || 'missing'}`,
  )

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    checks,
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
    },
  }
}
