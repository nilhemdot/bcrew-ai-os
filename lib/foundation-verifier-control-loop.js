import {
  BUILD_INTEL_INTAKE_CLOSEOUT_KEY,
  buildCreatorWatchlistSnapshot,
} from './build-intel-watchlist.js'
import {
  FOUNDATION_CONTROL_COMPRESSION_CARD_IDS,
  FOUNDATION_CONTROL_COMPRESSION_CLOSEOUT_KEY,
  buildIncrementalVerifierCoveragePlan,
} from './foundation-control-compression.js'
import {
  buildMultimodalExtractorContractSnapshot,
  validateMultimodalExtractionEnvelope,
} from './multimodal-extractor-contract.js'
import {
  buildResearchInboxContractSnapshot,
  buildResearchInboxPromotionProposal,
  validateResearchInboxItem,
} from './research-inbox.js'

export const VERIFIER_CONTROL_LOOP_SPLIT_CARD_ID = 'VERIFIER-CONTROL-LOOP-SPLIT-001'
export const VERIFIER_CONTROL_LOOP_SPLIT_CLOSEOUT_KEY = 'verifier-control-loop-split-v1'
export const VERIFIER_CONTROL_LOOP_SPLIT_PLAN_PATH = 'docs/process/verifier-control-loop-split-001-plan.md'
export const VERIFIER_CONTROL_LOOP_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-CONTROL-LOOP-SPLIT-001.json'
export const VERIFIER_CONTROL_LOOP_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-control-loop-split-check.mjs'
export const VERIFIER_CONTROL_LOOP_SPLIT_HANDOFF_PATH = 'docs/handoffs/2026-05-17-verifier-control-loop-split-closeout.md'
export const VERIFIER_CONTROL_LOOP_SPLIT_BEFORE_LINES = 11601

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function includesAll(source, needles = []) {
  return needles.every(needle => String(source || '').includes(needle))
}

function evaluateControlLoopFixture(fixture = {}) {
  const findings = []
  if (fixture.readinessExitStaysHonest !== true) findings.push('readiness_exit_false_green')
  if (fixture.runtimeLegClosedInReadiness !== true) findings.push('runtime_leg_missing')
  if (fixture.actionReviewRequiresDestinationProof !== true) findings.push('action_review_missing_destination_proof')
  if (fixture.buildIntelIntakeProposalOnly !== true) findings.push('build_intel_intake_mutates_or_stores_screenshot')
  if (fixture.controlCompressionReadOnly !== true) findings.push('control_compression_mutates_or_suppresses_failures')
  return { ok: findings.length === 0, findings }
}

export function buildFoundationVerifierControlLoopDogfoodProof() {
  const healthy = evaluateControlLoopFixture({
    readinessExitStaysHonest: true,
    runtimeLegClosedInReadiness: true,
    actionReviewRequiresDestinationProof: true,
    buildIntelIntakeProposalOnly: true,
    controlCompressionReadOnly: true,
  })
  const rejected = {
    readinessFalseGreen: evaluateControlLoopFixture({
      readinessExitStaysHonest: false,
      runtimeLegClosedInReadiness: true,
      actionReviewRequiresDestinationProof: true,
      buildIntelIntakeProposalOnly: true,
      controlCompressionReadOnly: true,
    }),
    missingRuntimeLeg: evaluateControlLoopFixture({
      readinessExitStaysHonest: true,
      runtimeLegClosedInReadiness: false,
      actionReviewRequiresDestinationProof: true,
      buildIntelIntakeProposalOnly: true,
      controlCompressionReadOnly: true,
    }),
    missingDestinationProof: evaluateControlLoopFixture({
      readinessExitStaysHonest: true,
      runtimeLegClosedInReadiness: true,
      actionReviewRequiresDestinationProof: false,
      buildIntelIntakeProposalOnly: true,
      controlCompressionReadOnly: true,
    }),
    buildIntelMutation: evaluateControlLoopFixture({
      readinessExitStaysHonest: true,
      runtimeLegClosedInReadiness: true,
      actionReviewRequiresDestinationProof: true,
      buildIntelIntakeProposalOnly: false,
      controlCompressionReadOnly: true,
    }),
    controlCompressionMutation: evaluateControlLoopFixture({
      readinessExitStaysHonest: true,
      runtimeLegClosedInReadiness: true,
      actionReviewRequiresDestinationProof: true,
      buildIntelIntakeProposalOnly: true,
      controlCompressionReadOnly: false,
    }),
  }
  const ok = healthy.ok && Object.values(rejected).every(result => result.ok === false)
  return {
    ok,
    healthy,
    rejected,
    dogfoodInvariant: ok
      ? 'healthy control-loop fixture passes; readiness false-green, missing runtime leg, Action Review proof gaps, Build Intel mutation, and control-compression mutation fail closed'
      : 'control-loop verifier dogfood did not reject every known failure fixture',
  }
}

export function evaluateFoundationVerifierControlLoop(input = {}) {
  const {
    DRIVE_ACCESS_REQUEST_CARD_ID,
    EXTRACT_RUN_HARDENING_CARD_ID,
    FOUNDATION_DONE_TEST_CARD_ID,
    FOUNDATION_DONE_TEST_CLOSEOUT_KEY,
    FOUNDATION_DONE_TEST_PLAN_PATH,
    FOUNDATION_DONE_TEST_SUMMARY_MARKER,
    FOUNDATION_READINESS_GATE_CARD_IDS,
    FOUNDATION_READINESS_REQUIRED_LEG_KEYS,
    MEETING_VAULT_ACL_CARD_ID,
    SOURCE_LIFECYCLE_COMPLETION_CARD_ID,
    SYNTHESIS_VERIFY_CARD_ID,
    SYSTEM_010_CARD_ID,
    SYSTEM_010_CLOSEOUT_KEY,
    SYSTEM_010_PLAN_PATH,
    actionReviewApi,
    actionReviewApproval,
    actionRouterSnapshot,
    backlogHygieneApi,
    buildLogFoundationDoneTestBuild,
    buildLogSystem010GhostCloseoutBuild,
    currentPlan,
    currentState,
    foundationBuildCloseouts,
    foundationBuildIntelRoutesSource,
    foundationDbSource,
    foundationDoneTest,
    foundationDoneTestApproval,
    foundationDoneTestApprovalValidation,
    foundationDoneTestDocSource,
    foundationDoneTestPlanSource,
    foundationDoneTestReadinessStatus,
    foundationDoneTestRegistrySource,
    foundationDoneTestScriptSource,
    foundationFrontendSource,
    foundationHub,
    foundationJobsSource,
    foundationRuntimeReadRoutesSource,
    meetingVaultAutoEnforcementClosed,
    packageJson,
    serverRouteSource,
    sourceRegistry,
    strategySharedCommsRouteSource,
    system010Approval,
    system010ApprovalValidation,
    system010DocSource,
    system010GhostCloseout,
    system010PlanSource,
    system010ProcessScriptSource,
    system010RuntimeSource,
  } = input
  const checks = []

  const foundationDoneFailedKeys = new Set((foundationDoneTestReadinessStatus.failedLegs || []).map(leg => leg.key))
  const foundationDoneBlockingCards = new Set(foundationDoneTestReadinessStatus.blockingCards || [])
  const foundationDonePassedKeys = new Set((foundationDoneTestReadinessStatus.legs || [])
    .filter(leg => leg.status === 'pass')
    .map(leg => leg.key))
  const foundationDoneBuildLogExact = buildLogFoundationDoneTestBuild?.backlogIds?.length === 1 &&
    buildLogFoundationDoneTestBuild.backlogIds.includes(FOUNDATION_DONE_TEST_CARD_ID) &&
    ['SOURCE-LIFECYCLE-COMPLETION-001', 'SYNTHESIS-VERIFY-001', 'SYSTEM-010-GHOST-CLOSEOUT-001', 'EXTRACT-RUN-HARDENING-001', 'MEETING-VAULT-ACL-001', 'DRIVE-ACCESS-REQUEST-001']
      .every(id => (buildLogFoundationDoneTestBuild.mentionedBacklogIds || []).includes(id)) &&
    !['SECURITY-002', 'MEETING-VAULT-ACL-001', 'EXTRACT-RUN-HARDENING-001']
      .some(id => (buildLogFoundationDoneTestBuild.backlogIds || []).includes(id))
  const foundationDoneReadinessExpectationMet = meetingVaultAutoEnforcementClosed
    ? foundationDoneTestReadinessStatus.status === 'ready' &&
      foundationDoneTestReadinessStatus.readyForStrategy === true &&
      foundationDoneFailedKeys.size === 0 &&
      foundationDoneBlockingCards.size === 0 &&
      FOUNDATION_READINESS_REQUIRED_LEG_KEYS.every(key => foundationDonePassedKeys.has(key))
    : foundationDoneTestReadinessStatus.status === 'not_ready' &&
      foundationDoneTestReadinessStatus.readyForStrategy === false &&
      ['meeting_raw_drive_acl_vault']
        .every(key => foundationDoneFailedKeys.has(key)) &&
      !foundationDoneFailedKeys.has('source_verifiable_answer') &&
      !foundationDoneFailedKeys.has('runtime_process_control') &&
      !foundationDoneFailedKeys.has('extraction_retry_ledger_backfill') &&
      ['source_verifiable_answer', 'tier_redaction_safety', 'p0_structural_coverage', 'runtime_process_control', 'extraction_retry_ledger_backfill', 'clear_pass_fail_output']
        .every(key => foundationDonePassedKeys.has(key)) &&
      [MEETING_VAULT_ACL_CARD_ID]
        .every(id => foundationDoneBlockingCards.has(id)) &&
      !foundationDoneBlockingCards.has(DRIVE_ACCESS_REQUEST_CARD_ID) &&
      !foundationDoneBlockingCards.has(EXTRACT_RUN_HARDENING_CARD_ID) &&
      !foundationDoneBlockingCards.has(SYNTHESIS_VERIFY_CARD_ID) &&
      !foundationDoneBlockingCards.has(SOURCE_LIFECYCLE_COMPLETION_CARD_ID) &&
      !foundationDoneBlockingCards.has(SYSTEM_010_CARD_ID)
  ensure(
    checks,
    foundationDoneTest?.lane === 'done' &&
      String(foundationDoneTest?.statusNote || '').includes(FOUNDATION_DONE_TEST_CLOSEOUT_KEY) &&
      foundationDoneTestApprovalValidation.ok &&
      foundationDoneTestApprovalValidation.mode === 'v2' &&
      foundationDoneTestApproval.cardId === FOUNDATION_DONE_TEST_CARD_ID &&
      foundationDoneTestApproval.score >= 9.8 &&
      foundationDoneTestApproval.approvedPlanRef === FOUNDATION_DONE_TEST_PLAN_PATH &&
      foundationDoneTestApprovalValidation.approval?.approvedPlanRef === FOUNDATION_DONE_TEST_PLAN_PATH &&
      includesAll(foundationDoneTestPlanSource, [
        'Source-verifiable answer',
        'Tier/redaction safety',
        'Structural Verifier Coverage For Every P0 Gate',
        'Runtime/Process Control Health Test',
        'Extraction Retry/Ledger/Backfill Health Test',
        'Meeting Raw Drive ACL/Vault',
        'It does not have to make Foundation pass the exit test',
      ]) &&
      includesAll(foundationDoneTestRegistrySource, [
        FOUNDATION_DONE_TEST_CARD_ID,
        FOUNDATION_DONE_TEST_CLOSEOUT_KEY,
        ...FOUNDATION_READINESS_REQUIRED_LEG_KEYS,
        ...FOUNDATION_READINESS_GATE_CARD_IDS,
        'buildFoundationReadinessStatus',
      ]) &&
      includesAll(foundationDoneTestScriptSource, [
        FOUNDATION_DONE_TEST_SUMMARY_MARKER,
        'reportOnly',
        'report-only',
        '/api/foundation-hub',
        'buildFoundationReadinessStatus',
      ]) &&
      includesAll(foundationDoneTestDocSource, [
        'Foundation Readiness Exit Test',
        'not_ready',
        'SYNTHESIS-VERIFY-001',
        'MEETING-VAULT-ACL-001',
      ]) &&
      packageJson.scripts?.['process:foundation-done-test'] === 'node --env-file-if-exists=.env scripts/process-foundation-done-test.mjs' &&
      foundationDoneReadinessExpectationMet &&
      FOUNDATION_READINESS_REQUIRED_LEG_KEYS.every(key =>
        (foundationDoneTestReadinessStatus.legs || []).some(leg => leg.key === key)
      ) &&
      buildLogFoundationDoneTestBuild?.operatorCloseout === true &&
      foundationDoneBuildLogExact &&
      currentPlan.includes('foundation-done-test-v1') &&
      currentPlan.includes('does not make the blocker cards pass') &&
      currentState.includes('FOUNDATION-DONE-TEST-001` is done') &&
      currentState.includes('That means the test exists, not that Foundation is ready'),
    'FOUNDATION-DONE-TEST-001 defines an honest Foundation readiness exit gate',
    `status=${foundationDoneTestReadinessStatus.status} failed=${foundationDoneTestReadinessStatus.summary?.failedLegs} blockers=${foundationDoneTestReadinessStatus.blockingCards.join(',')}`,
  )
  ensure(
    checks,
    system010GhostCloseout?.lane === 'done' &&
      String(system010GhostCloseout?.statusNote || '').includes(SYSTEM_010_CLOSEOUT_KEY) &&
      system010ApprovalValidation.ok &&
      system010ApprovalValidation.mode === 'v2' &&
      system010Approval.cardId === SYSTEM_010_CARD_ID &&
      Number(system010Approval.score) >= 9.8 &&
      system010Approval.approvedPlanRef === SYSTEM_010_PLAN_PATH &&
      includesAll(system010PlanSource.toLowerCase(), [
        'active-process view',
        'dead-man/liveness',
        'decommissioned',
        'auto-restart-on-push',
        'cost/process risk',
        'process:system-010-ghost-closeout-check',
      ]) &&
      includesAll(system010DocSource, [
        'Runtime Process-Control Closeout',
        'Fail-Closed Rules',
        '/api/foundation/active-processes',
        'DECOMMISSION <jobKey>',
      ]) &&
      packageJson.scripts?.['process:system-010-ghost-closeout-check'] === 'node --env-file-if-exists=.env scripts/process-system-010-ghost-closeout-check.mjs' &&
      includesAll(system010RuntimeSource, [
        SYSTEM_010_CLOSEOUT_KEY,
        'buildRuntimeProcessControlSnapshot',
        'buildStopDecision',
        'buildDecommissionDecision',
        'getJobRunPermission',
        'terminateProcessTree',
        'decommissionedJobsCannotRun',
      ]) &&
      includesAll(foundationDbSource, [
        "'scheduled', 'manual', 'paused', 'decommissioned'",
        'getFoundationJobControl',
        'updateFoundationJobRunMetadata',
        'markFoundationJobRunStopped',
      ]) &&
      foundationJobsSource.includes("runtimeMode === 'decommissioned'") &&
      includesAll(foundationRuntimeReadRoutesSource, [
        "app.get('/api/foundation/active-processes'",
      ]) &&
      includesAll(serverRouteSource, [
        "app.post('/api/foundation/job-runs/:runId/stop'",
        "app.post('/api/foundation/jobs/:jobKey/decommission'",
        'use_decommission_route',
        'runtimeProcessControl',
      ]) &&
      includesAll(foundationFrontendSource, [
        'renderRuntimeProcessControlPanel',
        'stopFoundationJobRun',
        'decommissionFoundationJob',
        'DECOMMISSION ',
      ]) &&
      includesAll(system010ProcessScriptSource, [
        'SYSTEM_010_SUMMARY_MARKER',
        'runOwnedStopFixture',
        'unowned PID stop decision fails closed',
        'decommissioned job cannot run even with force',
        '/api/foundation/active-processes',
      ]) &&
      foundationDonePassedKeys.has('runtime_process_control') &&
      !foundationDoneBlockingCards.has(SYSTEM_010_CARD_ID) &&
      foundationHub.runtimeProcessControl?.summary &&
      buildLogSystem010GhostCloseoutBuild?.operatorCloseout === true,
    'SYSTEM-010-GHOST-CLOSEOUT-001 closes runtime/process-control readiness blocker',
    `card=${system010GhostCloseout?.lane || 'missing'} runtimeLeg=${foundationDonePassedKeys.has('runtime_process_control') ? 'pass' : 'fail'} activeRuns=${foundationHub.runtimeProcessControl?.summary?.activeFoundationJobRuns ?? 'missing'}`,
  )
  const knownCleanedCardIds = new Set([
    'DOC-AUTHORITY-001',
    'DATA-004',
    'SOURCE-021',
    'SOURCE-021-PROOF-001',
    'SECURITY-001',
    'SECURITY-006',
  ])
  const knownCleanedCriticalFindings = Array.isArray(backlogHygieneApi.findings)
    ? backlogHygieneApi.findings.filter(finding =>
      finding.severity === 'critical' && knownCleanedCardIds.has(finding.cardId)
    )
    : []
  ensure(
    checks,
    knownCleanedCriticalFindings.length === 0,
    'Backlog Hygiene does not re-flag cleaned cards as critical drift',
    knownCleanedCriticalFindings.length
      ? knownCleanedCriticalFindings.map(finding => finding.cardId).join(', ')
      : 'known cleanup set has no critical hygiene finding',
  )
  const actionReviewApply = (foundationHub.backlogItems || []).find(item => item.id === 'ACTION-REVIEW-APPLY-001') || null
  const actionReviewApplyText = [
    actionReviewApply?.title,
    actionReviewApply?.summary,
    actionReviewApply?.whyItMatters,
    actionReviewApply?.nextAction,
    actionReviewApply?.statusNote,
  ].filter(Boolean).join('\n')
  const actionReviewApplyTextLower = actionReviewApplyText.toLowerCase()
  ensure(
    checks,
    actionReviewApply?.lane === 'done' &&
      actionReviewApply?.priority === 'P0' &&
      actionReviewApplyText.includes('18 pending') &&
      actionReviewApplyText.includes('Foundation > Backlog > Action Review') &&
      actionReviewApplyTextLower.includes('approve') &&
      actionReviewApplyTextLower.includes('reject') &&
      actionReviewApplyTextLower.includes('apply') &&
      actionReviewApplyTextLower.includes('destination proof') &&
      actionReviewApplyTextLower.includes('aged/stuck') &&
      actionReviewApplyText.includes('Stop and re-plan with Steve') &&
      currentPlan.includes('`ACTION-REVIEW-APPLY-001` is done for v1') &&
      currentState.includes('`ACTION-REVIEW-APPLY-001` is done for v1'),
    'Action Router review/apply child card is closed with visible home and stop-to-replan guardrail',
    actionReviewApply
      ? `${actionReviewApply.lane} / ${actionReviewApply.priority} / ${actionReviewApply.title}`
      : 'missing ACTION-REVIEW-APPLY-001',
  )
  ensure(
    checks,
    actionReviewApi.visibleHome === 'Foundation > Backlog > Action Review' &&
      actionReviewApi.summary?.totalRoutes === actionRouterSnapshot.totalRoutes &&
      actionReviewApi.summary?.pendingRoutes === actionRouterSnapshot.pendingRoutes &&
      actionReviewApi.summary?.appliedRoutesWithDestinationRecord === actionRouterSnapshot.appliedRoutesWithDestinationRecord &&
      actionReviewApi.thresholds?.agedPendingDays === 3 &&
      Array.isArray(actionReviewApi.routes) &&
      actionReviewApi.routes.length >= actionRouterSnapshot.recentRoutes.length &&
      actionReviewApi.routes.some(route => route.approvalStatus === 'pending' && route.actionReview?.plainStatus === 'Needs review') &&
      actionReviewApi.routes.some(route => route.approvalStatus === 'applied' && route.destinationRecordId),
    'Foundation Action Review API exposes pending/apply state and destination proof',
    `${actionReviewApi.summary?.pendingRoutes || 0} pending / ${actionReviewApi.summary?.appliedRoutesWithDestinationRecord || 0} applied destination proofs / home=${actionReviewApi.visibleHome || 'missing'}`,
  )
  ensure(
    checks,
    strategySharedCommsRouteSource.includes("app.get('/api/foundation/action-review'") &&
      strategySharedCommsRouteSource.includes("app.post('/api/foundation/action-review/:routeId/review'") &&
      strategySharedCommsRouteSource.includes("action === 'approve'") &&
      strategySharedCommsRouteSource.includes("action === 'apply'") &&
      strategySharedCommsRouteSource.includes("action === 'reject'") &&
      strategySharedCommsRouteSource.includes('Reject needs a reason so the finding is not silently lost.') &&
      foundationFrontendSource.includes('function renderActionReviewPanel') &&
      foundationFrontendSource.includes('/api/foundation/action-review') &&
      foundationFrontendSource.includes('Review system findings before they become decisions') &&
      foundationFrontendSource.includes('Reject needs a reason so the finding is not silently lost.') &&
      foundationFrontendSource.includes('Applied proof:') &&
      foundationFrontendSource.includes("renderActionReviewButton(route, 'approve'") &&
      foundationFrontendSource.includes("renderActionReviewButton(route, 'apply'") &&
      foundationFrontendSource.includes("renderActionReviewButton(route, 'reject'"),
    'Foundation Backlog renders Action Review approve/reject/apply controls',
    'API wrapper, plain-English panel, reject reason, and destination proof are present',
  )
  ensure(
    checks,
    actionReviewApproval.cardId === 'ACTION-REVIEW-APPLY-001' &&
      Number(actionReviewApproval.score) >= 9.8 &&
      actionReviewApproval.approvedBy === 'Steve' &&
      !Number.isNaN(new Date(actionReviewApproval.approvedAt).getTime()) &&
      /risks and mitigations/i.test(actionReviewApproval.approvalSource || ''),
    'Action Review plan approval evidence exists for process gate',
    `${actionReviewApproval.score || 'missing'} by ${actionReviewApproval.approvedBy || 'missing'}`,
  )
  const creatorWatchlist = (foundationHub.backlogItems || []).find(item => item.id === 'CREATOR-WATCHLIST-001') || null
  const multimodalExtractor = (foundationHub.backlogItems || []).find(item => item.id === 'MULTIMODAL-EXTRACTOR-001') || null
  const researchInbox = (foundationHub.backlogItems || []).find(item => item.id === 'RESEARCH-INBOX-001') || null
  const buildIntelIntakeCloseout = (foundationBuildCloseouts || []).find(closeout => closeout.key === BUILD_INTEL_INTAKE_CLOSEOUT_KEY) || null
  const buildIntelWatchlistSnapshot = buildCreatorWatchlistSnapshot()
  const multimodalContractSnapshot = buildMultimodalExtractorContractSnapshot()
  const researchInboxContractSnapshot = buildResearchInboxContractSnapshot()
  const validBuildIntelInboxItem = {
    sourceRef: 'https://www.youtube.com/watch?v=-WCNwxz3uoM',
    sourceType: 'youtube',
    whySteveCared: 'Builder showed an AIOS workflow pattern.',
    plainEnglishTakeaway: 'The workflow can improve how AIOS scopes Build Intel ideas.',
    systemFit: 'Foundation intake and future Build Scoper proposal flow.',
    relatedCards: ['CREATOR-WATCHLIST-001', 'MULTIMODAL-EXTRACTOR-001'],
    recommendation: 'Consider adding a bounded extraction proof.',
    evidenceLinks: ['https://www.youtube.com/watch?v=-WCNwxz3uoM&t=60s'],
    owner: 'Steve+Codex',
    proposedDisposition: 'enrich_existing_card',
    status: 'proposal_ready',
    autoCreateBacklogCard: false,
  }
  const publicVideoEnvelope = {
    sourceId: 'SRC-YOUTUBE-INTEL-001',
    sourceType: 'public_youtube_video',
    sourceUrl: 'https://www.youtube.com/watch?v=-WCNwxz3uoM',
    accessClass: 'public_permitted',
    rightsClass: 'public_reference_internal_learning',
    contentUseBoundary: 'internal Build Intel learning only',
    evidenceLevels: ['transcript_text', 'visual_model_observation'],
    route: {
      provider: 'gemini',
      model: 'video-understanding-route',
      authPath: 'api_route',
      estimatedCostUsd: 0.05,
    },
    observations: [{ timestamp: '00:01:00', text: 'Builder demonstrates a workflow.' }],
    sourceAnchors: [{ type: 'timestamp', value: '00:01:00' }],
    recommendation: 'adapt',
    confidence: 0.8,
    captureMethod: 'official_or_video_model_first',
    autoBacklogMutation: false,
  }
  const unsafeScreenshotEnvelope = {
    ...publicVideoEnvelope,
    evidenceLevels: ['transcript_text', 'screenshot_keyframe_reference'],
  }
  const publicVideoValidation = validateMultimodalExtractionEnvelope(publicVideoEnvelope)
  const unsafeScreenshotValidation = validateMultimodalExtractionEnvelope(unsafeScreenshotEnvelope)
  const inboxValidation = validateResearchInboxItem(validBuildIntelInboxItem)
  const inboxProposal = buildResearchInboxPromotionProposal(validBuildIntelInboxItem)
  ensure(
    checks,
    creatorWatchlist?.lane === 'done' &&
      multimodalExtractor?.lane === 'done' &&
      researchInbox?.lane === 'done' &&
      [creatorWatchlist, multimodalExtractor, researchInbox].every(card => String(card?.statusNote || '').includes(BUILD_INTEL_INTAKE_CLOSEOUT_KEY)) &&
      buildIntelIntakeCloseout?.operatorCloseout === true &&
      ['CREATOR-WATCHLIST-001', 'MULTIMODAL-EXTRACTOR-001', 'RESEARCH-INBOX-001'].every(id => (buildIntelIntakeCloseout.backlogIds || []).includes(id)) &&
      buildIntelWatchlistSnapshot.summary?.buildIntelCount === 23 &&
      buildIntelWatchlistSnapshot.summary?.marketingContentLaterCount === 4 &&
      buildIntelWatchlistSnapshot.entries.every(entry => entry.approvedForExtractionThisSprint === false) &&
      multimodalContractSnapshot.publicYouTubePolicy?.bulkBrowserScreenshot === 'blocked' &&
      publicVideoValidation.ok &&
      !unsafeScreenshotValidation.ok &&
      unsafeScreenshotValidation.findings.includes('screenshot_storage_policy_missing') &&
      researchInboxContractSnapshot.proposalOnly === true &&
      researchInboxContractSnapshot.autoMutationAllowed === false &&
      inboxValidation.ok &&
      inboxProposal.proposalOnly === true &&
      inboxProposal.writesBacklog === false &&
      packageJson.scripts?.['process:build-intel-intake-check'] === 'node --env-file-if-exists=.env scripts/process-build-intel-intake-check.mjs' &&
      foundationBuildIntelRoutesSource.includes("app.get('/api/foundation/build-intel-watchlist'") &&
      foundationBuildIntelRoutesSource.includes("app.get('/api/foundation/multimodal-extractor-contract'") &&
      foundationBuildIntelRoutesSource.includes("app.get('/api/foundation/research-inbox-contract'") &&
      currentPlan.includes(BUILD_INTEL_INTAKE_CLOSEOUT_KEY) &&
      currentPlan.includes('Build Intel Extraction Implementation Sprint') &&
      currentState.includes(BUILD_INTEL_INTAKE_CLOSEOUT_KEY) &&
      sourceRegistry.includes('/api/foundation/build-intel-watchlist'),
    'Build Intel intake foundation closes watchlist, extractor contract, and Research Inbox gate without extraction',
    `watchlist=${buildIntelWatchlistSnapshot.summary?.buildIntelCount || 0}+${buildIntelWatchlistSnapshot.summary?.marketingContentLaterCount || 0} extractor=${multimodalContractSnapshot.status} inbox=${researchInboxContractSnapshot.status}`,
  )
  const foundationControlCompressionCards = FOUNDATION_CONTROL_COMPRESSION_CARD_IDS
    .map(id => (foundationHub.backlogItems || []).find(item => item.id === id) || null)
  const foundationControlCompressionCloseout = (foundationBuildCloseouts || []).find(closeout => closeout.key === FOUNDATION_CONTROL_COMPRESSION_CLOSEOUT_KEY) || null
  const foundationControlCompressionVerifierCoverageIds = [
    'FEEDBACK-CAPTURE-001',
    'FEEDBACK-TRIAGE-001',
    'BACKLOG-MONITOR-001',
    'SPRINT-MASTER-ADVISOR-001',
    'SYSTEM-FLOW-MAP-001',
    'FOUNDATION-DONE-VELOCITY-001',
    'PROCESS-ACK-STATES-001',
    'VERIFIER-INCREMENTAL-COVERAGE-001',
  ]
  const foundationControlCompression = foundationHub.foundationControlCompression || {}
  const incrementalStaticPlan = buildIncrementalVerifierCoveragePlan({
    cardId: 'VERIFIER-INCREMENTAL-COVERAGE-001',
    changedFiles: ['docs/process/verifier-incremental-coverage-001-plan.md'],
  })
  const incrementalFullPlan = buildIncrementalVerifierCoveragePlan({
    cardId: 'VERIFIER-INCREMENTAL-COVERAGE-001',
    changedFiles: ['server.js', 'scripts/foundation-verify.mjs'],
  })
  ensure(
    checks,
      foundationControlCompressionCards.every(card => card?.lane === 'done' && String(card?.statusNote || '').includes(FOUNDATION_CONTROL_COMPRESSION_CLOSEOUT_KEY)) &&
      foundationControlCompressionCloseout?.operatorCloseout === true &&
      FOUNDATION_CONTROL_COMPRESSION_CARD_IDS.every(id => (foundationControlCompressionCloseout.backlogIds || []).includes(id)) &&
      foundationControlCompressionVerifierCoverageIds.every(id => FOUNDATION_CONTROL_COMPRESSION_CARD_IDS.includes(id)) &&
      FOUNDATION_CONTROL_COMPRESSION_CARD_IDS.every(id => foundationControlCompressionVerifierCoverageIds.includes(id)) &&
      foundationControlCompression.proposalOnly === true &&
      foundationControlCompression.writesBacklog === false &&
      foundationControlCompression.writesSprint === false &&
      foundationControlCompression.feedbackCapture?.writesBacklog === false &&
      foundationControlCompression.feedbackTriage?.proposalOnly === true &&
      foundationControlCompression.feedbackTriage?.writesBacklog === false &&
      foundationControlCompression.backlogMonitor?.counts?.total >= 300 &&
      foundationControlCompression.backlogMonitor?.counts?.foundationResearch >= 100 &&
      foundationControlCompression.backlogMonitor?.writesBacklog === false &&
      foundationControlCompression.sprintAdvisor?.proposalOnly === true &&
      foundationControlCompression.sprintAdvisor?.opensSprint === false &&
      foundationControlCompression.sprintAdvisor?.options?.length >= 3 &&
      foundationControlCompression.systemFlowMap?.liveData === true &&
      /flowchart LR/.test(foundationControlCompression.systemFlowMap?.mermaid || '') &&
      foundationControlCompression.doneVelocity?.totalDone >= 100 &&
      foundationControlCompression.doneVelocity?.writesBacklog === false &&
      foundationControlCompression.acknowledgedStates?.suppressesCriticalVerifierFailures === false &&
      incrementalStaticPlan.focusedProofAllowed === true &&
      incrementalFullPlan.fullVerifyRequired === true &&
      packageJson.scripts?.['process:foundation-control-compression-check'] === 'node --env-file-if-exists=.env scripts/process-foundation-control-compression-check.mjs' &&
      foundationBuildIntelRoutesSource.includes("app.get('/api/foundation/control-compression'") &&
      currentPlan.includes(FOUNDATION_CONTROL_COMPRESSION_CLOSEOUT_KEY) &&
      currentState.includes(FOUNDATION_CONTROL_COMPRESSION_CLOSEOUT_KEY),
    'Foundation control compression closes feedback, backlog, sprint advisor, flow, velocity, ack, and incremental proof primitives',
    `cards=${foundationControlCompressionCards.filter(card => card?.lane === 'done').length}/${FOUNDATION_CONTROL_COMPRESSION_CARD_IDS.length} backlog=${foundationControlCompression.backlogMonitor?.counts?.total || 0} proposals=${foundationControlCompression.sprintAdvisor?.options?.length || 0}`,
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
