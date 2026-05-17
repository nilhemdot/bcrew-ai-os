export const VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_CARD_ID = 'VERIFIER-OPERATOR-LIVE-SURFACE-ASSURANCE-SPLIT-001'
export const VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_CLOSEOUT_KEY = 'verifier-operator-live-surface-assurance-split-v1'
export const VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_PLAN_PATH = 'docs/process/verifier-operator-live-surface-assurance-split-001-plan.md'
export const VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-OPERATOR-LIVE-SURFACE-ASSURANCE-SPLIT-001.json'
export const VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-operator-live-surface-assurance-split-check.mjs'
export const VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_HANDOFF_PATH = 'docs/handoffs/2026-05-17-verifier-operator-live-surface-assurance-split-closeout.md'
export const VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_BEFORE_LINES = 7388

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function includesAll(text = '', patterns = []) {
  return patterns.every(pattern => String(text || '').includes(pattern))
}

function backlogItemText(item = null) {
  return [
    item?.title,
    item?.summary,
    item?.whyItMatters,
    item?.nextAction,
    item?.statusNote,
  ].filter(Boolean).join('\n')
}

function evaluateOperatorLiveSurfaceAssuranceFixture(fixture = {}) {
  const findings = []
  if (fixture.opsSurfaceContractsVisible !== true) findings.push('ops_surface_contract_hidden_failure')
  if (fixture.strategyHubSourceReviewEnforced !== true) findings.push('strategy_hub_source_review_hidden_failure')
  if (fixture.extractionControlProofVisible !== true) findings.push('extraction_control_hidden_failure')
  if (fixture.ownersGovernanceVisible !== true) findings.push('owners_governance_hidden_failure')
  if (fixture.recentBuildsDisciplineTracked !== true) findings.push('recent_builds_discipline_hidden_failure')
  if (fixture.oldInlinePredicatesRemoved !== true) findings.push('old_operator_live_surface_inline_predicates_present')
  return { ok: findings.length === 0, findings }
}

export function buildFoundationVerifierOperatorLiveSurfaceAssuranceDogfoodProof() {
  const healthy = evaluateOperatorLiveSurfaceAssuranceFixture({
    opsSurfaceContractsVisible: true,
    strategyHubSourceReviewEnforced: true,
    extractionControlProofVisible: true,
    ownersGovernanceVisible: true,
    recentBuildsDisciplineTracked: true,
    oldInlinePredicatesRemoved: true,
  })
  const rejected = {
    hiddenOpsSurfaceContract: evaluateOperatorLiveSurfaceAssuranceFixture({
      opsSurfaceContractsVisible: false,
      strategyHubSourceReviewEnforced: true,
      extractionControlProofVisible: true,
      ownersGovernanceVisible: true,
      recentBuildsDisciplineTracked: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenStrategyHubSourceReview: evaluateOperatorLiveSurfaceAssuranceFixture({
      opsSurfaceContractsVisible: true,
      strategyHubSourceReviewEnforced: false,
      extractionControlProofVisible: true,
      ownersGovernanceVisible: true,
      recentBuildsDisciplineTracked: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenExtractionControlProof: evaluateOperatorLiveSurfaceAssuranceFixture({
      opsSurfaceContractsVisible: true,
      strategyHubSourceReviewEnforced: true,
      extractionControlProofVisible: false,
      ownersGovernanceVisible: true,
      recentBuildsDisciplineTracked: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenOwnersGovernance: evaluateOperatorLiveSurfaceAssuranceFixture({
      opsSurfaceContractsVisible: true,
      strategyHubSourceReviewEnforced: true,
      extractionControlProofVisible: true,
      ownersGovernanceVisible: false,
      recentBuildsDisciplineTracked: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenRecentBuildsDiscipline: evaluateOperatorLiveSurfaceAssuranceFixture({
      opsSurfaceContractsVisible: true,
      strategyHubSourceReviewEnforced: true,
      extractionControlProofVisible: true,
      ownersGovernanceVisible: true,
      recentBuildsDisciplineTracked: false,
      oldInlinePredicatesRemoved: true,
    }),
    oldInlinePredicate: evaluateOperatorLiveSurfaceAssuranceFixture({
      opsSurfaceContractsVisible: true,
      strategyHubSourceReviewEnforced: true,
      extractionControlProofVisible: true,
      ownersGovernanceVisible: true,
      recentBuildsDisciplineTracked: true,
      oldInlinePredicatesRemoved: false,
    }),
  }
  const ok = healthy.ok && Object.values(rejected).every(result => result.ok === false)
  return {
    ok,
    healthy,
    rejected,
    dogfoodInvariant: ok
      ? 'healthy operator/live-surface assurance fixture passes; hidden Ops, Strategy Hub, extraction control, Owners governance, Recent Builds, and old-inline failures fail closed'
      : 'operator/live-surface assurance dogfood did not reject every known failure fixture',
  }
}

export async function evaluateFoundationVerifierOperatorLiveSurfaceAssurance(input = {}) {
  const {
    currentPlan,
    currentState,
    driveContentExtractionSource,
    extractionCoverageTargets = [],
    extractionLaneItemShapeAudit,
    extractionRecentStaleReapedRuns = [],
    extractionStaleActiveRuns = [],
    extractionTargets = [],
    foundationBacklogStoreSource,
    foundationBuildCloseouts = [],
    foundationDbSource,
    foundationDbWithBacklogSeedSource,
    foundationFrontendSource,
    foundationHtmlSource,
    foundationHub = {},
    foundationJobsSource,
    foundationStrategyGoalTruthSource,
    foundationStrategyOperatingTruthSource,
    foundationSurfaceMap = [],
    foundationUiSource,
    foundationVerifierOperatorLiveSurfaceAssuranceSource,
    foundationVerifySource,
    intelligenceActionRouterSource,
    opsHtmlSource,
    opsHub = {},
    opsUiSource,
    ownersLeadSourceGovernance,
    ownersReviewQueue,
    packageJson = {},
    packageSource,
    repoFileExists,
    serverSource,
    sourceCrawlStoreOwnershipSource,
    staleSourceCrawlRuns = [],
    strategyEvidencePacketSource,
    strategicExecutionUiSource,
    strategyGoalTruthApi = {},
    strategyGoalTruthSnapshot = {},
    strategyHubV2Api = {},
    strategyOperatingTruthApi = {},
    strategyOperatingTruthSnapshot = {},
    strategyPreworkCoverageApi = {},
    strategyPreworkCoverageSnapshot = {},
    strategySharedCommsRouteSource,
    syncMissiveSource,
    syncSlackSource,
  } = input
  const checks = []
  const backlogItems = foundationHub.backlogItems || []
  const legacyQuestions = (foundationHub.openQuestions || []).filter(item =>
    ['Q-001', 'Q-002', 'Q-003', 'Q-004', 'Q-005'].includes(item.id)
  )

  ensure(
    checks,
    legacyQuestions.length === 5 &&
      legacyQuestions.every(item => item.status === 'resolved') &&
      includesAll(foundationFrontendSource, [
        'function renderFoundationOperationsPurposePanel',
        'Backlog Page Job',
        'Decision Page Job',
        'Question Page Job',
        'Activity Page Job',
        'Runtime Health Page Job',
      ]) &&
      includesAll(currentState, [
        'Foundation Operations Surfaces',
        'Working as a manual first slice',
        'old stale carry-forward questions were resolved',
        'SYSTEM-007',
        'SYSTEM-008',
      ]),
    'Foundation Operations pages state their purpose and stale questions are cleared',
    legacyQuestions.map(item => `${item.id}=${item.status}`).join(' / '),
  )

  const opsServedJobs = (foundationHub.foundationJobs?.jobs || []).filter(job =>
    Array.isArray(job.servesHubs) && job.servesHubs.includes('ops')
  )
  ensure(
    checks,
    opsServedJobs.some(job => job.key === 'admin-deal-review-readonly') &&
      opsServedJobs.some(job => job.key === 'conditional-deal-review-readonly') &&
      opsServedJobs.some(job => job.key === 'agent-roster-review'),
    'Foundation jobs expose systems serving Ops Hub',
    opsServedJobs.length
      ? opsServedJobs.map(job => job.key).join(', ')
      : 'no Ops-serving jobs tagged',
  )

  const opsHubJobs = opsHub.foundationJobs?.jobs || []
  ensure(
    checks,
    Array.isArray(opsHubJobs) &&
      opsHubJobs.length > 0 &&
      opsHubJobs.every(job => Array.isArray(job.servesHubs) && job.servesHubs.includes('ops')) &&
      !Object.prototype.hasOwnProperty.call(opsHub, 'backlogItems') &&
      !Object.prototype.hasOwnProperty.call(opsHub, 'decisions') &&
      !Object.prototype.hasOwnProperty.call(opsHub, 'sharedCommunicationCandidates'),
    'api/ops-hub exposes only Ops-serving runtime metadata',
    `${opsHubJobs.length} Ops jobs / restricted Foundation payload`,
  )

  ensure(
    checks,
    includesAll(opsHtmlSource, ['Ops Hub', '/ops.js']) &&
      includesAll(opsUiSource, ['getHubServedJobs', 'fetchOwnersReviewQueue', '/api/ops-hub', 'Systems Serving Ops']) &&
      !String(foundationHtmlSource || '').includes('data-section="ops-hub"') &&
      !String(foundationUiSource || '').includes('function renderOpsHub'),
    'Ops Hub is a dedicated hub surface, not nested in Foundation nav',
    'public/ops.html + public/ops.js own the Ops cockpit; Foundation keeps system metadata only',
  )

  ensure(
    checks,
    foundationHub.sharedCommunicationSynthesis?.latestRun &&
      Array.isArray(foundationHub.sharedCommunicationSynthesis?.latestItems) &&
      foundationHub.sharedCommunicationSynthesis.latestItems.length > 0,
    'api/foundation-hub exposes persisted shared-comms synthesis',
    foundationHub.sharedCommunicationSynthesis?.latestRun
      ? `${foundationHub.sharedCommunicationSynthesis.latestRun.runId} / ${foundationHub.sharedCommunicationSynthesis.latestItems.length} items`
      : 'missing synthesis payload',
  )

  ensure(
    checks,
    String(packageSource || '').includes('"strategy:evidence-packet"') &&
      includesAll(strategyEvidencePacketSource, [
        'strategy_evidence_packet_v1',
        'direct_strategy_artifacts',
        'getStrategyGoalTruthSnapshot',
        'getStrategyOperatingTruthSnapshot',
        'current_goal_truth',
        'current_operating_truth',
        'goal_claim_rule',
        'operating_truth_rule',
        'recordSharedCommunicationSynthesisRun',
        "packetType: 'strategy_evidence_packet_v1'",
      ]) &&
      includesAll(foundationJobsSource, [
        "key: 'strategy-evidence-packet-v1'",
        "servesHubs: ['strategy']",
        'Strategy Evidence Packet V1',
      ]) &&
      String(strategySharedCommsRouteSource || '').includes('packetType = req.query.packetType') &&
      String(strategyEvidencePacketSource || '').includes('priorityRecommendationFeedDisabled: true') &&
      !String(strategyEvidencePacketSource || '').includes('recommended_90_day_priorities: {') &&
      !String(strategyEvidencePacketSource || '').includes("packetSection: 'recommended_90_day_priorities'") &&
      !String(strategyEvidencePacketSource || '').includes("itemType: 'action_item'") &&
      includesAll(strategicExecutionUiSource, [
        'Strategy Command',
        'Goal And Operating Truth',
        'source-to-gap manifest',
        'Advisor remains blocked',
      ]),
    'Strategy Evidence Packet v1 remains debug/history while active priority generation is disabled',
    'strategy:evidence-packet persists packetType=strategy_evidence_packet_v1, but no longer generates active 90-day priority action items',
  )

  const strategyGoalGroups = new Map((strategyGoalTruthSnapshot.groups || []).map(group => [group.key, group]))
  const strategyGoalApiGroups = new Map((strategyGoalTruthApi.groups || []).map(group => [group.key, group]))
  ensure(
    checks,
    strategyGoalGroups.get('team_volume')?.status === 'behind' &&
      /Behind/.test(strategyGoalGroups.get('team_volume')?.statusLabel || '') &&
      strategyGoalGroups.get('community_agents')?.status === 'ahead' &&
      /Ahead/.test(strategyGoalGroups.get('community_agents')?.statusLabel || '') &&
      strategyGoalGroups.get('agent_engine_capacity')?.status === 'behind' &&
      /Behind/.test(strategyGoalGroups.get('agent_engine_capacity')?.statusLabel || '') &&
      strategyGoalApiGroups.get('community_agents')?.status === 'ahead' &&
      String(strategySharedCommsRouteSource || '').includes("app.get('/api/strategic-execution/goal-truth'") &&
      String(serverSource || '').includes('currentGoalTruth') &&
      String(foundationDbSource || '').includes('getStrategyGoalTruthSnapshot') &&
      String(foundationDbSource || '').includes('getStrategyGoalTruthSnapshotFromSources') &&
      String(foundationStrategyGoalTruthSource || '').includes('Team Goal: $2B') &&
      String(foundationStrategyGoalTruthSource || '').includes('Community Goal: 10,000 Agents') &&
      String(foundationStrategyGoalTruthSource || '').includes('Agent Engine Capacity'),
    'Strategy goal truth guardrails distinguish live BHAG and Agent Engine pace',
    [
      `team=${strategyGoalGroups.get('team_volume')?.statusLabel || 'missing'}`,
      `community=${strategyGoalGroups.get('community_agents')?.statusLabel || 'missing'}`,
      `capacity=${strategyGoalGroups.get('agent_engine_capacity')?.statusLabel || 'missing'}`,
    ].join(' / '),
  )

  const strategyOperatingSourceIds = new Set((strategyOperatingTruthSnapshot.sourceCards || []).map(card => card.sourceId))
  const strategyOperatingApiSourceIds = new Set((strategyOperatingTruthApi.sourceCards || []).map(card => card.sourceId))
  ensure(
    checks,
    ['SRC-OWNERS-001', 'SRC-FINANCE-001', 'SRC-FUB-001', 'SRC-SUPABASE-001'].every(sourceId =>
      strategyOperatingSourceIds.has(sourceId) && strategyOperatingApiSourceIds.has(sourceId)
    ) &&
      strategyOperatingTruthSnapshot.rule?.includes('Shared-comms candidates are leads/evidence, not final operating truth') &&
      String(strategySharedCommsRouteSource || '').includes("app.get('/api/strategic-execution/operating-truth'") &&
      String(serverSource || '').includes('currentOperatingTruth') &&
      String(foundationDbSource || '').includes('getStrategyOperatingTruthSnapshot') &&
      String(foundationDbSource || '').includes('getStrategyOperatingTruthSnapshotFromSources') &&
      String(foundationStrategyOperatingTruthSource || '').includes('Do not recommend "install weekly finance truth" as if the source does not exist'),
    'Strategy operating truth guardrails force live Owners/Finance/FUB/KPI checks before recommendations',
    `sources=${Array.from(strategyOperatingSourceIds).join(', ')}`,
  )

  const strategyHubV2Routes = Array.isArray(strategyHubV2Api.actionRouter?.recentRoutes)
    ? strategyHubV2Api.actionRouter.recentRoutes
    : []
  const strategyHubProofRoutes = strategyHubV2Routes.filter(route =>
    Array.isArray(route.sourceProof?.items) && route.sourceProof.items.length > 0
  )
  const strategyHubHumanProofItems = strategyHubProofRoutes
    .flatMap(route => route.sourceProof.items)
    .filter(item =>
      item?.sourceId &&
      item?.title &&
      item?.occurredAt &&
      (item?.from || (Array.isArray(item?.participants) && item.participants.length > 0)) &&
      item?.threadStatus &&
      item?.quote
    )
  ensure(
    checks,
    String(strategySharedCommsRouteSource || '').includes("app.post('/api/strategic-execution/advisor'") &&
      String(strategySharedCommsRouteSource || '').includes("app.get('/api/strategic-execution/v2'") &&
      String(strategySharedCommsRouteSource || '').includes("app.post('/api/strategic-execution/action-routes/:routeId/review'") &&
      String(strategySharedCommsRouteSource || '').includes('approveActionRoute') &&
      String(strategySharedCommsRouteSource || '').includes('applyApprovedActionRoute') &&
      String(strategySharedCommsRouteSource || '').includes('rejectActionRoute') &&
      String(strategySharedCommsRouteSource || '').includes('rerouteActionRoute') &&
      String(strategySharedCommsRouteSource || '').includes('saveStrategyHubSnapshot') &&
      String(strategySharedCommsRouteSource || '').includes('getStrategyHubSnapshot') &&
      String(strategySharedCommsRouteSource || '').includes('isStrategyHubReviewRoute') &&
      String(foundationDbSource || '').includes('CREATE TABLE IF NOT EXISTS strategy_hub_snapshots') &&
      String(strategySharedCommsRouteSource || '').includes('strategy_hub_v2_in_progress') &&
      String(strategySharedCommsRouteSource || '').includes('Strategy Advisor is offline while Strategy Hub v2 rebuilds deterministic source snapshots') &&
      String(strategicExecutionUiSource || '').includes('/api/strategic-execution/v2') &&
      String(strategicExecutionUiSource || '').includes('/api/strategic-execution/action-routes/') &&
      includesAll(strategicExecutionUiSource, [
        'function renderSourceToGap',
        'function renderOverview',
        'function renderRouteReview',
        'function sectionFromHash',
        'Strategic review',
        'strategy prep, source-map gaps, goal gaps, and pillar decisions',
        'Operating tasks stay out of Strategy',
        'function renderSourceProof',
        'Owner decision',
        'Snooze for',
        '1 day',
        '1 week',
        '1 month',
        '1 quarter',
        'Custom date',
        'Action guide',
        'Applied / done',
        'Technical refs',
        'Proof items: ',
        "provenance.open = route.approvalStatus === 'pending'",
        'window.confirm',
        'Optional review note',
        'Source fallback active',
        'Advisor remains blocked',
      ]) &&
      String(intelligenceActionRouterSource || '').includes('buildSourceProofForRoute') &&
      String(intelligenceActionRouterSource || '').includes('enrichRoutesWithSourceProof') &&
      String(strategySharedCommsRouteSource || '').includes('resolveSnoozeUntil') &&
      String(strategySharedCommsRouteSource || '').includes('snoozeDuration') &&
      String(strategySharedCommsRouteSource || '').includes('normalizeRouteOwnerInput') &&
      strategyHubV2Api.mode === 'source_to_gap_route_review' &&
      strategyHubV2Api.advisorStatus === 'strategy_hub_v2_in_progress' &&
      ['live', 'degraded'].includes(strategyHubV2Api.sourceTruthStatus) &&
      strategyHubV2Api.goalTruth?.groups?.length >= 3 &&
      strategyHubV2Api.operatingTruth?.sourceCards?.length >= 4 &&
      Array.isArray(strategyHubV2Routes) &&
      strategyHubV2Api.actionRouter?.totalRoutes === strategyHubV2Routes.length &&
      Number(strategyHubV2Api.operationalRouteSummary?.hiddenRoutes || 0) >= 1 &&
      strategyHubProofRoutes.length >= 1 &&
      strategyHubHumanProofItems.length >= strategyHubProofRoutes.length &&
      strategyHubV2Routes.every(route =>
        route.approvalRequired === true &&
        route.synthesizedItemId &&
        Array.isArray(route.factRefs) && route.factRefs.length > 0 &&
        Array.isArray(route.evidenceRefs) && route.evidenceRefs.length > 0 &&
        Array.isArray(route.evidenceChunkRefs) && route.evidenceChunkRefs.length > 0
      ) &&
      strategyHubV2Api.retrievalEval?.status === 'succeeded' &&
      !String(strategicExecutionUiSource || '').includes('/api/strategic-execution/advisor') &&
      !String(strategicExecutionUiSource || '').includes('renderStrategyAdvisorWorkspace') &&
      !String(strategicExecutionUiSource || '').includes('renderRecommendedPriorities') &&
      !String(strategicExecutionUiSource || '').includes('AI-Suggested 90-Day Priorities') &&
      !String(serverSource || '').includes('recommended90DayPriorities:'),
    'Strategy Hub v2 renders source-to-gap and route review while advisor remains offline',
    `strategyRoutes=${strategyHubV2Api.actionRouter?.totalRoutes || 0} / hiddenOperational=${strategyHubV2Api.operationalRouteSummary?.hiddenRoutes || 0} / eval=${strategyHubV2Api.retrievalEval?.status || 'missing'}`,
  )

  const strategyPreworkParticipants = Array.isArray(strategyPreworkCoverageSnapshot.participants)
    ? strategyPreworkCoverageSnapshot.participants
    : []
  const strategyPreworkApiParticipants = Array.isArray(strategyPreworkCoverageApi.participants)
    ? strategyPreworkCoverageApi.participants
    : []
  const strategyPreworkNames = strategyPreworkParticipants.map(participant => participant.name)
  const strategyPreworkReadNames = strategyPreworkParticipants
    .filter(participant => participant.status !== 'missing')
    .map(participant => participant.name)
  ensure(
    checks,
    strategyPreworkCoverageSnapshot.summary?.expectedCount >= 9 &&
      strategyPreworkCoverageSnapshot.summary?.readCount >= 8 &&
      strategyPreworkCoverageSnapshot.summary?.artifactCount >= 10 &&
      strategyPreworkApiParticipants.length === strategyPreworkParticipants.length &&
      ['Steve Zahnd', 'Scott Benson', 'Ryan Campbell', 'Carson', 'Georgia Huntley', 'Nick Bergmann', 'Clare', 'Ahsan', 'Blake Berfelz'].every(name => strategyPreworkNames.includes(name)) &&
      ['Steve Zahnd', 'Scott Benson', 'Ryan Campbell', 'Carson', 'Georgia Huntley', 'Nick Bergmann', 'Clare', 'Ahsan'].every(name => strategyPreworkReadNames.includes(name)) &&
      String(strategySharedCommsRouteSource || '').includes("app.get('/api/strategic-execution/prework-coverage'") &&
      String(serverSource || '').includes('preworkReadCoverage') &&
      String(foundationDbSource || '').includes('getStrategyPreworkCoverageSnapshot') &&
      String(foundationDbSource || '').includes('getStrategyPreworkCoverageSnapshotFromSources') &&
      String(foundationStrategyGoalTruthSource || '').includes('strategyPreworkExpectedParticipants') &&
      String(foundationStrategyGoalTruthSource || '').includes('pdfFormFieldsUsed'),
    'Strategy pre-work read coverage API remains source-backed while advisor stays offline',
    `${strategyPreworkCoverageSnapshot.summary?.readCount || 0}/${strategyPreworkCoverageSnapshot.summary?.expectedCount || 0} expected notes read; API keeps missing rows explicit while source-to-gap view is active`,
  )

  ensure(
    checks,
    foundationHub.sharedCommunicationsCoverage?.totalArtifacts > 0 &&
      foundationHub.sharedCommunicationsCoverage?.totalCandidates > 0 &&
      Array.isArray(foundationHub.sharedCommunicationsCoverage?.sources) &&
      foundationHub.sharedCommunicationsCoverage.sources.length > 0,
    'api/foundation-hub exposes shared-comms coverage',
    foundationHub.sharedCommunicationsCoverage
      ? `${foundationHub.sharedCommunicationsCoverage.totalArtifacts} artifacts / ${foundationHub.sharedCommunicationsCoverage.totalCandidates} candidates`
      : 'missing coverage payload',
  )

  const coverageSources = foundationHub.sharedCommunicationsCoverage?.sources || []
  const sourcesWithExtractionDepth = coverageSources.filter(source =>
    typeof source.artifactsWithCandidates === 'number' &&
    typeof source.artifactsWithoutCandidates === 'number' &&
    typeof source.artifactsProcessed === 'number' &&
    typeof source.artifactsPendingProcessing === 'number' &&
    typeof source.processingCoveragePercent === 'number' &&
    typeof source.extractionCoveragePercent === 'number'
  )
  ensure(
    checks,
    coverageSources.length > 0 &&
      sourcesWithExtractionDepth.length === coverageSources.length,
    'api/foundation-hub exposes shared-comms extraction and processing depth',
    coverageSources.length
      ? `${sourcesWithExtractionDepth.length}/${coverageSources.length} sources expose candidate and processing counts`
      : 'missing coverage sources',
  )

  ensure(
    checks,
    foundationHub.llmRuntime?.summary &&
      Number(foundationHub.llmRuntime.summary.credentialCount || 0) > 0 &&
      Number(foundationHub.llmRuntime.summary.routeCount || 0) > 0 &&
      Array.isArray(foundationHub.llmRuntime.routes),
    'api/foundation-hub exposes policy-aware LLM runtime status',
    foundationHub.llmRuntime?.summary
      ? `${foundationHub.llmRuntime.summary.credentialCount} credentials / ${foundationHub.llmRuntime.summary.routeCount} routes`
      : 'missing LLM runtime payload',
  )

  ensure(
    checks,
    foundationHub.extractionControl?.summary &&
      Number(foundationHub.extractionControl.summary.targetCount || 0) > 0 &&
      typeof foundationHub.extractionControl.summary.staleActiveRuns === 'number' &&
      typeof foundationHub.extractionControl.summary.recentStaleReapedRuns === 'number' &&
      typeof foundationHub.extractionControl.summary.targetRiskFindings === 'number' &&
      typeof foundationHub.extractionControl.summary.targetWarningFindings === 'number' &&
      Array.isArray(foundationHub.extractionControl.staleActiveRuns) &&
      Array.isArray(foundationHub.extractionControl.recentStaleReapedRuns) &&
      extractionTargets.length > 0 &&
      extractionTargets.every(target => target.itemSummary && Array.isArray(target.healthFindings)) &&
      Array.isArray(foundationHub.extractionControl.recentItems) &&
      Array.isArray(foundationHub.extractionControl.recentRuns),
    'api/foundation-hub exposes extraction control targets',
    foundationHub.extractionControl?.summary
      ? `${foundationHub.extractionControl.summary.targetCount} targets / ${foundationHub.extractionControl.summary.currentDayTargets} current-day / ${foundationHub.extractionControl.recentItems?.length ?? 0} recent items / ${foundationHub.extractionControl.recentRuns?.length ?? 0} recent runs / stale active=${foundationHub.extractionControl.summary.staleActiveRuns} / findings=${foundationHub.extractionControl.summary.targetRiskFindings} risk ${foundationHub.extractionControl.summary.targetWarningFindings} warning`
      : 'missing extraction control payload',
  )

  ensure(
    checks,
    includesAll(sourceCrawlStoreOwnershipSource, [
      'getSourceCrawlTargetItemSummaries',
      'buildSourceCrawlTargetHealthFindings',
      'missing_slack_channel_item_proof',
    ]) &&
      includesAll(foundationFrontendSource, [
        'itemSummary',
        'healthFindings',
        'targetRiskFindings',
        'targetWarningFindings',
      ]) &&
      includesAll(syncSlackSource, [
        'upsertSourceCrawlItem',
        'slack_channel',
        'EXTRACTION_TARGET_SUMMARY',
        'Crawl items failed',
      ]) &&
      includesAll(syncMissiveSource, [
        'upsertSourceCrawlItem',
        'missive_conversation',
        'EXTRACTION_TARGET_SUMMARY',
        'Crawl items failed',
      ]),
    'Runtime Health surfaces extraction item summaries and findings',
    'Foundation DB, UI, Slack runner, and Missive runner include item-level proof/finding hooks',
  )

  const driveCorpusCoverage = extractionCoverageTargets.find(target => target.targetKey === 'drive-corpus-backfill')
  const driveContentCoverage = extractionCoverageTargets.find(target => target.targetKey === 'drive-content-extract-backfill')
  ensure(
    checks,
    extractionCoverageTargets.length === extractionTargets.length &&
      extractionCoverageTargets.length > 0 &&
      extractionCoverageTargets.every(target =>
        target.targetKey &&
        Object.prototype.hasOwnProperty.call(target, 'lastSuccessAt') &&
        Object.prototype.hasOwnProperty.call(target, 'lastFailureAt') &&
        Object.prototype.hasOwnProperty.call(target, 'nextBiteAt') &&
        target.counts &&
        Object.prototype.hasOwnProperty.call(target.counts, 'totalItems') &&
        Object.prototype.hasOwnProperty.call(target.counts, 'succeededItems') &&
        Object.prototype.hasOwnProperty.call(target.counts, 'skippedItems') &&
        Object.prototype.hasOwnProperty.call(target.counts, 'failedItems') &&
        Array.isArray(target.topReasons) &&
        Array.isArray(target.remainingBacklogIndicators)
      ) &&
      extractionCoverageTargets.some(target => Number(target.counts.skippedItems || 0) > 0 && target.topReasons.length > 0) &&
      driveCorpusCoverage?.remainingBacklogIndicators?.some(indicator => /Queued Drive folders/i.test(indicator.label || '')) &&
      driveContentCoverage?.topReasons?.some(reason => reason.status === 'skipped') &&
      includesAll(sourceCrawlStoreOwnershipSource, [
        'getSourceCrawlTargetRunCoverage',
        'buildSourceCrawlTargetCoverage',
        'coverageByTarget',
        'remainingBacklogIndicators',
      ]) &&
      includesAll(foundationFrontendSource, [
        'renderExtractionCoverageCard',
        'Extraction Control: Coverage By Target',
        'Last success',
        'Last failure',
        'Next bite',
        'Top failed/skipped reasons',
        'Remaining backlog',
      ]),
    'Runtime Health exposes extraction coverage-by-target',
    extractionCoverageTargets.length
      ? `${extractionCoverageTargets.length} targets / skipped-visible=${extractionCoverageTargets.filter(target => Number(target.counts?.skippedItems || 0) > 0).length} / backlog-indicators=${extractionCoverageTargets.filter(target => target.remainingBacklogIndicators?.length).length}`
      : 'missing coverageByTarget payload',
  )

  const googleDriveArchiveCoverage = Array.isArray(foundationHub.sharedCommunicationsCoverage?.sources)
    ? foundationHub.sharedCommunicationsCoverage.sources.find(source => source.sourceId === 'SRC-GDRIVE-001')
    : null
  ensure(
    checks,
    Number(googleDriveArchiveCoverage?.artifactTypes?.drive_spreadsheet?.total || 0) >= 5,
    'Drive Sheets extraction archived source artifacts',
    googleDriveArchiveCoverage?.artifactTypes?.drive_spreadsheet
      ? `${googleDriveArchiveCoverage.artifactTypes.drive_spreadsheet.total} Drive spreadsheet artifacts`
      : 'missing drive_spreadsheet artifacts',
  )

  const nonStaleExtractionStatuses = new Set(['succeeded', 'partial', 'leased', 'running'])
  const slackCurrentDayTarget = extractionTargets.find(target => target.targetKey === 'slack-current-day')
  const slackCurrentDayHasHealthyItemProof = Boolean(
    slackCurrentDayTarget?.itemSummary &&
      Number(slackCurrentDayTarget.itemSummary.totalItems || 0) > 0 &&
      Number(slackCurrentDayTarget.itemSummary.failedItems || 0) === 0 &&
      Number(slackCurrentDayTarget.itemSummary.staleLeasedItems || 0) === 0 &&
      Number(slackCurrentDayTarget.itemSummary.retryExhaustedItems || 0) === 0,
  )
  const slackCurrentDayLatestRunStillActive = ['running', 'leased'].includes(
    slackCurrentDayTarget?.scheduler?.latestRunStatus,
  )
  const slackCurrentDayFailedByStaleReaperWithHealthyProof =
    slackCurrentDayHasHealthyItemProof &&
    slackCurrentDayTarget?.lastStatus === 'failed' &&
    String(slackCurrentDayTarget?.lastError || '').includes('stale source-crawl run reaper')
  const slackCurrentDayStatusAcceptable =
    nonStaleExtractionStatuses.has(slackCurrentDayTarget?.lastStatus) ||
    (
      slackCurrentDayLatestRunStillActive &&
      slackCurrentDayHasHealthyItemProof &&
      String(slackCurrentDayTarget?.lastError || '').includes('stale source-crawl run reaper')
    ) ||
    slackCurrentDayFailedByStaleReaperWithHealthyProof
  ensure(
    checks,
    slackCurrentDayHasHealthyItemProof &&
      Array.isArray(slackCurrentDayTarget.healthFindings) &&
      slackCurrentDayStatusAcceptable,
    'Slack current-day crawl has channel-level item proof after stale-run recovery',
    slackCurrentDayTarget?.itemSummary
      ? `${slackCurrentDayTarget.lastStatus || 'unknown'} / ${slackCurrentDayTarget.itemSummary.totalItems || 0} items / ${slackCurrentDayTarget.itemSummary.succeededItems || 0} succeeded / ${slackCurrentDayTarget.itemSummary.skippedItems || 0} skipped / ${slackCurrentDayTarget.itemSummary.failedItems || 0} failed`
      : 'missing slack-current-day target item summary',
  )

  const missiveCurrentDayTarget = extractionTargets.find(target => target.targetKey === 'missive-current-day')
  ensure(
    checks,
    missiveCurrentDayTarget?.itemSummary &&
      Number(missiveCurrentDayTarget.itemSummary.totalItems || 0) >= 100 &&
      Number(missiveCurrentDayTarget.itemSummary.skippedItems || 0) >= 1 &&
      Number(missiveCurrentDayTarget.itemSummary.failedItems || 0) === 0 &&
      Array.isArray(missiveCurrentDayTarget.healthFindings) &&
      nonStaleExtractionStatuses.has(missiveCurrentDayTarget.lastStatus),
    'Missive current-day crawl has conversation-level item proof',
    missiveCurrentDayTarget?.itemSummary
      ? `${missiveCurrentDayTarget.lastStatus || 'unknown'} / ${missiveCurrentDayTarget.itemSummary.totalItems || 0} items / ${missiveCurrentDayTarget.itemSummary.succeededItems || 0} succeeded / ${missiveCurrentDayTarget.itemSummary.skippedItems || 0} skipped / ${missiveCurrentDayTarget.itemSummary.failedItems || 0} failed`
      : 'missing missive-current-day target item summary',
  )

  ensure(
    checks,
    includesAll(extractionLaneItemShapeAudit, [
      'missive-current-day',
      'Before normalization',
      'missive_conversation',
      'drive-content-extract-backfill',
      '4 failed crawl items',
      'EXTRACT-RETRY-001',
    ]),
    'extraction lane item-shape inspection is persisted as repo evidence',
    'docs/audits/2026-04-28-extraction-lane-item-shape.md records Missive normalization and remaining Drive failures',
  )

  ensure(
    checks,
    staleSourceCrawlRuns.length === 0 &&
      extractionStaleActiveRuns.length === 0,
    'source_crawl_target_runs has no stale active runs',
    staleSourceCrawlRuns.length || extractionStaleActiveRuns.length
      ? [...staleSourceCrawlRuns, ...extractionStaleActiveRuns].map(run => `${run.targetKey}:${run.runId}`).join(', ')
      : 'no running source-crawl target runs past lease/threshold',
  )

  const knownStaleSlackRunId = 'crawl-slack-current-day-20260427145904292-3f93bebd'
  ensure(
    checks,
    extractionRecentStaleReapedRuns.some(run => run.runId === knownStaleSlackRunId) ||
      extractionStaleActiveRuns.some(run => run.runId === knownStaleSlackRunId),
    'Foundation sweep catches the known stale Slack crawl proof case',
    extractionRecentStaleReapedRuns.some(run => run.runId === knownStaleSlackRunId)
      ? `${knownStaleSlackRunId} visible as reaped stale run`
      : extractionStaleActiveRuns.some(run => run.runId === knownStaleSlackRunId)
        ? `${knownStaleSlackRunId} visible as active stale run`
        : `${knownStaleSlackRunId} not visible in extraction control stale-run payload`,
  )

  const scheduledExtractionTargets = extractionTargets.filter(target => target.scheduler?.source === 'foundation_job')
  ensure(
    checks,
    scheduledExtractionTargets.length > 0 &&
      scheduledExtractionTargets.every(target =>
        target.foundationJobKey &&
        target.scheduler?.scheduleStatus &&
        target.scheduler?.scheduleTruth === 'foundation_job' &&
        target.nextRunAt === target.scheduler?.nextRunAt &&
        target.effectiveNextRunAt === target.scheduler?.nextRunAt &&
        Object.prototype.hasOwnProperty.call(target.scheduler, 'crawlCheckpointNextRunAt')
      ) &&
      !scheduledExtractionTargets.some(target =>
        (target.healthFindings || []).some(finding => finding.type === 'job_target_schedule_mismatch')
      ) &&
      includesAll(sourceCrawlStoreOwnershipSource, ['scheduleTruth', 'crawlCheckpointNextRunAt']) &&
      !String(foundationDbSource || '').includes('targetNextRunAt') &&
      includesAll(foundationFrontendSource, ['crawlCheckpointNextRunAt', 'Runner checkpoint']),
    'api/foundation-hub derives extraction schedules from Foundation jobs',
    scheduledExtractionTargets.length
      ? `${scheduledExtractionTargets.length} targets derive visible schedule from job runtime`
      : 'no target schedule derivations found',
  )

  const driveCorpusTarget = extractionTargets.find(target => target.targetKey === 'drive-corpus-backfill')
  ensure(
    checks,
    driveCorpusTarget?.cursorState?.driveInventory &&
      Number(driveCorpusTarget.cursorState.driveInventory.inspectedFolderCount || 0) >= 1 &&
      Number(driveCorpusTarget.cursorState.driveInventory.queuedFolderCount || 0) >= 1,
    'api/foundation-hub exposes Drive corpus inventory cursor',
    driveCorpusTarget?.cursorState?.driveInventory
      ? `${driveCorpusTarget.cursorState.driveInventory.inspectedFolderCount || 0} inspected folders / ${driveCorpusTarget.cursorState.driveInventory.queuedFolderCount || 0} queued`
      : 'missing Drive corpus cursor',
  )

  ensure(
    checks,
    foundationHub.driveCorpusInventory?.summary &&
      Number(foundationHub.driveCorpusInventory.summary.totalItems || 0) > 0 &&
      Array.isArray(foundationHub.driveCorpusInventory.valueRoutes),
    'api/foundation-hub exposes Drive corpus inventory review surface',
    foundationHub.driveCorpusInventory?.summary
      ? `${foundationHub.driveCorpusInventory.summary.totalItems} items / ${foundationHub.driveCorpusInventory.valueRoutes?.length || 0} value routes`
      : 'missing Drive corpus inventory payload',
  )

  const driveContentTarget = extractionTargets.find(target => target.targetKey === 'drive-content-extract-backfill')
  ensure(
    checks,
    driveContentTarget?.status === 'active' &&
      driveContentTarget.runtimeMode === 'scheduled' &&
      Number(driveContentTarget.budget?.maxPdfBytes || 0) >= 80000000 &&
      Array.isArray(driveContentTarget.budget?.retrySkippedReasonPrefixes) &&
      includesAll(driveContentExtractionSource, [
        'extractPdfFormFieldText',
        'drive_pdf_pdftotext_form_fields_v1',
        'forceReprocess',
      ]) &&
      Number(driveContentTarget.cursorState?.artifactCount || 0) > 0,
    'api/foundation-hub exposes scheduled Drive content extraction target',
    driveContentTarget
      ? `${driveContentTarget.status} / ${driveContentTarget.runtimeMode} / ${driveContentTarget.cursorState?.artifactCount || 0} Drive artifacts`
      : 'missing Drive content extraction target',
  )

  ensure(
    checks,
    ownersLeadSourceGovernance?.sourceId === 'SRC-OWNERS-001' &&
      ownersLeadSourceGovernance?.drift &&
      ownersLeadSourceGovernance?.freshness &&
      Array.isArray(ownersLeadSourceGovernance.drift.buckets?.unexpectedInOwnersList) &&
      Array.isArray(ownersLeadSourceGovernance.drift.buckets?.missingFromOwnersList) &&
      Array.isArray(ownersLeadSourceGovernance.drift.buckets?.duplicates),
    'api/owners/lead-source-governance exposes governed dropdown drift',
    ownersLeadSourceGovernance?.drift
      ? `${ownersLeadSourceGovernance.drift.status} / ${ownersLeadSourceGovernance.drift.stats?.reviewNow ?? 'invalid'} review items`
      : 'missing drift payload',
  )

  ensure(
    checks,
    ownersReviewQueue?.sourceId === 'SRC-OWNERS-001' &&
      ownersReviewQueue?.reviewQueue &&
      ownersReviewQueue.reviewQueue.freshness &&
      ownersReviewQueue.reviewQueue.freshnessRules &&
      ownersReviewQueue.reviewQueue.sections &&
      ownersReviewQueue.reviewQueue.sections.admin?.freshness &&
      ownersReviewQueue.reviewQueue.sections.conditional?.freshness &&
      ownersReviewQueue.reviewQueue.sections.fubDrift?.freshness &&
      ownersReviewQueue.reviewQueue.sections.ownersGovernance?.freshness &&
      ownersReviewQueue.reviewQueue.sections.agentRoster?.freshness &&
      Array.isArray(ownersReviewQueue.reviewQueue.sections.admin?.items) &&
      Array.isArray(ownersReviewQueue.reviewQueue.sections.conditional?.items) &&
      Array.isArray(ownersReviewQueue.reviewQueue.sections.fubDrift?.items) &&
      Array.isArray(ownersReviewQueue.reviewQueue.sections.ownersGovernance?.items) &&
      Array.isArray(ownersReviewQueue.reviewQueue.sections.agentRoster?.items),
    'api/owners/review-queue exposes the governed Owners inbox',
    ownersReviewQueue?.reviewQueue
      ? `${ownersReviewQueue.reviewQueue.status} / ${ownersReviewQueue.reviewQueue.stats?.openItems ?? 'invalid'} open items`
      : 'missing review queue payload',
  )

  const foundationCloseout = backlogItems.find(item => item.id === 'FOUNDATION-002') || null
  ensure(
    checks,
    foundationCloseout?.lane === 'done' &&
      foundationCloseout?.title === 'Close out the Admin-tab sign-off and route remaining follow-on work to the right cards',
    'FOUNDATION-002 matches signed-off reality',
    foundationCloseout ? `${foundationCloseout.lane} / ${foundationCloseout.title}` : 'missing',
  )

  const foundationSurfaceSweep = backlogItems.find(item => item.id === 'FOUNDATION-SWEEP-001') || null
  ensure(
    checks,
    foundationSurfaceSweep?.lane === 'done' &&
      foundationSurfaceSweep?.priority === 'P0' &&
      /source contracts, connectors, jobs, docs, backlog cards, or system maps change/.test(foundationSurfaceSweep?.summary || '') &&
      /31 Foundation nav pages/.test(foundationSurfaceSweep?.statusNote || '') &&
      /crawl-slack-current-day-20260427145904292-3f93bebd/.test(foundationSurfaceSweep?.statusNote || '') &&
      String(currentPlan || '').includes('Foundation surfaces must not rely on Steve noticing stale truth') &&
      String(currentPlan || '').includes('FOUNDATION-SWEEP-001'),
    'Foundation surface freshness sweep v1 is closed with stale-run proof',
    foundationSurfaceSweep
      ? `${foundationSurfaceSweep.lane} / ${foundationSurfaceSweep.priority} / ${foundationSurfaceSweep.title}`
      : 'missing FOUNDATION-SWEEP-001',
  )

  const foundationChangelog = backlogItems.find(item => item.id === 'FOUNDATION-CHANGELOG-001') || null
  ensure(
    checks,
    foundationChangelog?.lane === 'done' &&
      foundationChangelog?.priority === 'P0' &&
      /Recent Builds/.test(foundationChangelog?.summary || foundationChangelog?.nextAction || '') &&
      /done-lane guard/.test(foundationChangelog?.nextAction || '') &&
      String(foundationBacklogStoreSource || '').includes('assertBacklogDoneCloseout') &&
      String(foundationDbWithBacklogSeedSource || '').includes('FOUNDATION-CHANGELOG-001'),
    'Foundation build closeout discipline is tracked and enforced',
    foundationChangelog ? `${foundationChangelog.lane} / ${foundationChangelog.title}` : 'missing FOUNDATION-CHANGELOG-001',
  )

  const foundationChangelogV2 = backlogItems.find(item => item.id === 'FOUNDATION-CHANGELOG-002') || null
  ensure(
    checks,
    foundationChangelogV2?.lane === 'done' &&
      foundationChangelogV2?.priority === 'P0' &&
      /operator changelog/.test(foundationChangelogV2?.summary || '') &&
      /related backlog card/.test(foundationChangelogV2?.summary || foundationChangelogV2?.nextAction || '') &&
      /proof command/.test(foundationChangelogV2?.summary || foundationChangelogV2?.nextAction || '') &&
      /repo-truth closeout records/.test(foundationChangelogV2?.statusNote || foundationChangelogV2?.nextAction || '') &&
      /foundation:verify/.test(foundationChangelogV2?.statusNote || '') &&
      String(currentPlan || '').includes('Recent Builds v2 merges git history') &&
      String(currentState || '').includes('Recent Builds groups work by day/system area'),
    'Foundation Recent Builds v2 operator changelog hardening is closed',
    foundationChangelogV2 ? `${foundationChangelogV2.lane} / ${foundationChangelogV2.title}` : 'missing FOUNDATION-CHANGELOG-002',
  )

  const foundationSurfaceUpdates = backlogItems.find(item => item.id === 'FOUNDATION-SURFACE-UPDATES-001') || null
  const foundationSurfaceUpdatesText = backlogItemText(foundationSurfaceUpdates)
  ensure(
    checks,
    foundationSurfaceUpdates?.lane === 'scoped' &&
      foundationSurfaceUpdates?.priority === 'P1' &&
      foundationSurfaceUpdatesText.includes('plain-English') &&
      foundationSurfaceUpdatesText.includes('Overview -> Systems -> Backlog -> Recent Work') &&
      foundationSurfaceUpdatesText.includes('clickable app breadcrumbs') &&
      foundationSurfaceUpdatesText.includes('done-velocity') &&
      foundationSurfaceUpdatesText.includes('moved-to-done date') &&
      foundationSurfaceUpdatesText.includes('Phase 1 / Truth Cleanup') &&
      foundationSurfaceUpdatesText.includes('command-order') &&
      foundationSurfaceUpdatesText.includes('backend-only') &&
      foundationSurfaceUpdatesText.includes('app surface metadata') &&
      foundationSurfaceUpdatesText.includes('at least 3 recent closeouts') &&
      foundationSurfaceUpdatesText.includes('Recent Builds / Recent Work owns') &&
      foundationSurfaceUpdatesText.includes('technical terms must have a plain-English meaning next to them') &&
      String(currentPlan || '').includes('Foundation is the CEO dashboard for system-building') &&
      String(currentPlan || '').includes('Overview -> Systems -> Backlog -> Recent Work') &&
      String(currentPlan || '').includes('Recent Builds / Recent Work should default collapsed') &&
      String(currentState || '').includes("Steve's operator UX standard is now active") &&
      foundationSurfaceMap.some(surface =>
        surface.section === 'build-log' &&
          (surface.backlogIds || []).includes('FOUNDATION-SURFACE-UPDATES-001')
      ),
    'Foundation operator UX and Recent Work follow-up is parked as scoped P1',
    foundationSurfaceUpdates
      ? `${foundationSurfaceUpdates.lane} / ${foundationSurfaceUpdates.priority} / ${foundationSurfaceUpdates.title}`
      : 'missing FOUNDATION-SURFACE-UPDATES-001',
  )

  const verifierOperatorLiveSurfaceAssuranceSplitCard = backlogItems.find(item => item.id === VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_CARD_ID) || null
  const verifierOperatorLiveSurfaceAssuranceSplitCloseout = foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_CLOSEOUT_KEY) || null
  const verifierOperatorLiveSurfaceAssuranceDogfood = buildFoundationVerifierOperatorLiveSurfaceAssuranceDogfoodProof()
  const foundationVerifyLineCountAfterOperatorLiveSurfaceAssuranceSplit = String(foundationVerifySource || '').split('\n').length
  const operatorLiveSurfaceDelegationSource = [foundationVerifySource, foundationVerifierOperatorLiveSurfaceAssuranceSource].filter(Boolean).join('\n')
  const oldInlineMessages = [
    'Foundation Operations pages state their purpose and stale questions are cleared',
    'Strategy Hub v2 renders source-to-gap and route review while advisor remains offline',
    'api/foundation-hub exposes extraction control targets',
    'api/owners/review-queue exposes the governed Owners inbox',
    'Foundation operator UX and Recent Work follow-up is parked as scoped P1',
  ]
  ensure(
    checks,
    verifierOperatorLiveSurfaceAssuranceSplitCard &&
      ['executing', 'done'].includes(verifierOperatorLiveSurfaceAssuranceSplitCard.lane) &&
      String(verifierOperatorLiveSurfaceAssuranceSplitCard.statusNote || '').includes(VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_CLOSEOUT_KEY) &&
      verifierOperatorLiveSurfaceAssuranceSplitCloseout?.operatorCloseout === true &&
      (verifierOperatorLiveSurfaceAssuranceSplitCloseout.backlogIds || []).includes(VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_CARD_ID) &&
      verifierOperatorLiveSurfaceAssuranceDogfood.ok === true &&
      packageJson.scripts?.['process:verifier-operator-live-surface-assurance-split-check'] === `node --env-file-if-exists=.env ${VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_SCRIPT_PATH}` &&
      typeof repoFileExists === 'function' &&
      await repoFileExists(VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_PLAN_PATH) &&
      await repoFileExists(VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_APPROVAL_PATH) &&
      await repoFileExists(VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_HANDOFF_PATH) &&
      operatorLiveSurfaceDelegationSource.includes('evaluateFoundationVerifierOperatorLiveSurfaceAssurance({') &&
      operatorLiveSurfaceDelegationSource.includes('operatorLiveSurfaceAssuranceVerifier.checks') &&
      oldInlineMessages.every(message => !String(foundationVerifySource || '').includes(message)) &&
      foundationVerifyLineCountAfterOperatorLiveSurfaceAssuranceSplit < VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_BEFORE_LINES &&
      String(foundationVerifierOperatorLiveSurfaceAssuranceSource || '').includes('Strategy Hub v2 renders source-to-gap') &&
      String(foundationVerifierOperatorLiveSurfaceAssuranceSource || '').includes('api/foundation-hub exposes extraction control targets') &&
      String(foundationVerifierOperatorLiveSurfaceAssuranceSource || '').includes('api/owners/review-queue exposes the governed Owners inbox') &&
      String(foundationVerifierOperatorLiveSurfaceAssuranceSource || '').includes('Foundation Recent Builds v2 operator changelog hardening is closed'),
    'VERIFIER-OPERATOR-LIVE-SURFACE-ASSURANCE-SPLIT-001 extracts operator/live-surface assurance checks into a focused module',
    verifierOperatorLiveSurfaceAssuranceSplitCard
      ? `lane=${verifierOperatorLiveSurfaceAssuranceSplitCard.lane} dogfood=${verifierOperatorLiveSurfaceAssuranceDogfood.ok ? 'pass' : 'blocked'} lines=${VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_BEFORE_LINES}->${foundationVerifyLineCountAfterOperatorLiveSurfaceAssuranceSplit}`
      : `missing ${VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_CARD_ID}`,
  )

  return { checks }
}
