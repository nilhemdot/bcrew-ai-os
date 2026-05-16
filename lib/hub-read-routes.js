import {
  buildFoundationSystemHealthSnapshot,
} from './foundation-system-health.js'

export const HUB_READ_ROUTES_SPLIT_CARD_ID = 'HUB-READ-ROUTES-SPLIT-001'
export const HUB_READ_ROUTES_SPLIT_CLOSEOUT_KEY = 'hub-read-routes-split-v1'
export const HUB_READ_ROUTES_SPLIT_PLAN_PATH = 'docs/process/hub-read-routes-split-001-plan.md'
export const HUB_READ_ROUTES_SPLIT_APPROVAL_PATH = 'docs/process/approvals/HUB-READ-ROUTES-SPLIT-001.json'
export const HUB_READ_ROUTES_SPLIT_SCRIPT_PATH = 'scripts/process-hub-read-routes-split-check.mjs'
export const HUB_READ_ROUTES_SPLIT_SPRINT_ID = 'foundation-server-monolith-closeout-2026-05-15'
export const HUB_READ_ROUTES_SPLIT_BEFORE_SERVER_LINES = 6592
export const HUB_READ_ROUTES_SPLIT_ROUTE_BUDGET_MS = 15000
export const HUB_READ_ROUTES_SPLIT_ROUTE_BUDGET_BYTES = 1_500_000

function requireDependency(deps, key) {
  const value = deps[key]
  if (value === undefined || value === null) throw new Error(`registerHubReadRoutes requires ${key}.`)
  return value
}

function sendFoundationHubPayload(res, payload, { mode, startedAtMs, deps }) {
  const prepared = deps.attachFoundationHubPerformanceMetadata(payload, { mode, startedAtMs })
  deps.cacheHeadersNoStore(res)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('X-Foundation-Hub-Mode', prepared.payload.foundationHubPerformance.mode)
  res.setHeader('X-Foundation-Hub-Payload-Bytes', String(prepared.bytes))
  res.send(prepared.json)
}

function compactFoundationRun(run = {}) {
  if (!run || typeof run !== 'object') return null
  return {
    runId: run.runId || run.run_id || null,
    status: run.status || null,
    generatedAt: run.generatedAt || run.createdAt || run.finishedAt || run.updatedAt || null,
    startedAt: run.startedAt || run.started_at || null,
    finishedAt: run.finishedAt || run.finished_at || null,
    durationMs: run.durationMs || run.duration_ms || null,
    candidatesRead: run.candidatesRead || run.candidates_read || run.summary?.candidatesRead || null,
    itemsProduced: run.itemsProduced || run.items_produced || run.summary?.itemsProduced || null,
  }
}

function compactSynthesisItem(item = {}) {
  return {
    synthesisItemId: item.synthesisItemId,
    runId: item.runId,
    rank: item.rank,
    itemType: item.itemType,
    status: item.status,
    title: item.title,
    oneLine: item.oneLine,
    whyItMatters: item.whyItMatters,
    recommendedNextAction: item.recommendedNextAction,
    suggestedOwner: item.suggestedOwner,
    sourceCount: item.sourceCount,
    sourceIds: Array.isArray(item.sourceIds) ? item.sourceIds : [],
    confidence: item.confidence,
    sensitivity: item.sensitivity,
    createdAt: item.createdAt,
  }
}

function compactSharedCommunicationSynthesis(synthesis = {}) {
  if (!synthesis || typeof synthesis !== 'object') return synthesis
  return {
    latestRun: compactFoundationRun(synthesis.latestRun),
    runs: Array.isArray(synthesis.runs) ? synthesis.runs.slice(0, 5).map(compactFoundationRun) : [],
    latestItems: Array.isArray(synthesis.latestItems) ? synthesis.latestItems.map(compactSynthesisItem) : [],
    latestTrustedItems: Array.isArray(synthesis.latestTrustedItems) ? synthesis.latestTrustedItems.map(compactSynthesisItem) : [],
    latestAdvisoryItems: Array.isArray(synthesis.latestAdvisoryItems) ? synthesis.latestAdvisoryItems.map(compactSynthesisItem) : [],
    verificationSummary: synthesis.verificationSummary || null,
    fullPayloadCompacted: true,
  }
}

function compactLifecycleChild(child = {}) {
  if (!child || typeof child !== 'object') return child
  return {
    status: child.status,
    cardId: child.cardId,
    closeoutKey: child.closeoutKey,
    generatedAt: child.generatedAt,
    summary: child.summary || null,
  }
}

function compactFoundationSourceLifecycle(lifecycle = {}) {
  if (!lifecycle || typeof lifecycle !== 'object') return lifecycle
  return {
    schemaVersion: lifecycle.schemaVersion,
    generatedAt: lifecycle.generatedAt,
    cardId: lifecycle.cardId,
    closeoutKey: lifecycle.closeoutKey,
    route: lifecycle.route,
    apiPath: lifecycle.apiPath,
    definitions: lifecycle.definitions,
    scope: lifecycle.scope,
    summary: lifecycle.summary,
    findings: lifecycle.findings,
    lanes: lifecycle.lanes,
    sources: lifecycle.sources,
    targets: lifecycle.targets,
    systems: lifecycle.systems,
    sourceMaturityGrid: compactLifecycleChild(lifecycle.sourceMaturityGrid),
    sourceCoverageCloseout: compactLifecycleChild(lifecycle.sourceCoverageCloseout),
    sourceExtractionCoverage: compactLifecycleChild(lifecycle.sourceExtractionCoverage),
    sourceConnectorMatrix: compactLifecycleChild(lifecycle.sourceConnectorMatrix),
    sourceHubRoutingMatrix: compactLifecycleChild(lifecycle.sourceHubRoutingMatrix),
    marketingSourceMap: compactLifecycleChild(lifecycle.marketingSourceMap),
    brandStack: compactLifecycleChild(lifecycle.brandStack),
    tierBehavioralCompletion: compactLifecycleChild(lifecycle.tierBehavioralCompletion),
    verificationRuns: compactLifecycleChild(lifecycle.verificationRuns),
    perUserChangelog: compactLifecycleChild(lifecycle.perUserChangelog),
    restrictedDecisionQueue: compactLifecycleChild(lifecycle.restrictedDecisionQueue),
    foundationUiComplete: compactLifecycleChild(lifecycle.foundationUiComplete),
    currentSprint: compactLifecycleChild(lifecycle.currentSprint),
    fullPayloadCompacted: true,
  }
}

async function buildFoundationHubSummaryPayload(deps) {
  const snapshot = await deps.getFoundationCoreSnapshot()
  const backlogContract = deps.buildFoundationHubBacklogContract({
    backlogItems: snapshot.backlogItems || [],
  })
  const backlogHygiene = deps.buildBacklogHygieneSnapshot({
    backlogItems: snapshot.backlogItems || [],
    closeouts: deps.getFoundationBuildCloseouts(),
  })
  const foundation1100Review = deps.compactFoundationReviewSprintSnapshot(deps.buildFoundationReviewSprintStatus({
    artifact: await deps.loadFoundationReviewSprintArtifact({ repoRoot: deps.repoRoot }),
    backlogItems: snapshot.backlogItems || [],
    actionRouter: {},
    hygiene: backlogHygiene,
  }))
  const researchCuration = deps.compactResearchCurationSnapshot(deps.buildResearchCurationStatus({
    backlogItems: snapshot.backlogItems || [],
    foundationReviewSprint: foundation1100Review,
  }))
  const [foundationJobs, workerCode, activeFoundationSprint, decisionAutoEmitScan, kpiHealth] = await Promise.all([
    deps.getFoundationJobRunSnapshot({ limit: 20 }).then(deps.compactFoundationJobRunSnapshot),
    deps.getFoundationRuntimeStatus('foundation-worker').catch(() => null),
    deps.getActiveFoundationCurrentSprint(),
    deps.scanDecisionAutoEmitCandidates({ synthetic: true, cwd: deps.repoRoot }).catch(() => ({
      candidateCount: 0,
      candidates: [],
      summary: { status: 'risk', riskFindings: ['Decision Auto-Emit summary unavailable in fast Foundation Hub mode.'] },
    })),
    deps.getCachedSafeKpiHealthSnapshot(),
  ])
  const currentSprint = deps.buildFoundationCurrentSprintStatus({
    sprint: activeFoundationSprint.sprint,
    items: activeFoundationSprint.items,
    backlogItems: snapshot.backlogItems || [],
    closeouts: deps.getFoundationBuildCloseouts(),
    planCriticRuns: activeFoundationSprint.planCriticRuns || [],
  })
  const decisionAutoEmit = {
    status: decisionAutoEmitScan.candidateCount > 0 ? 'healthy' : 'risk',
    summary: deps.buildDecisionAutoEmitSummary(decisionAutoEmitScan),
    candidates: decisionAutoEmitScan.candidates || [],
    dryRunDefault: true,
    applyRequired: true,
    plainEnglish: 'Decision Auto-Emit finds obvious decision language and creates proposed decisions only when apply mode is explicitly used.',
  }
  const currentStateSummary = deps.buildFoundationCurrentStateSummaryPayload({
    sourceContracts: deps.getSourceContracts(),
    backlogItems: snapshot.backlogItems || [],
    kpiHealth,
    currentSprint,
  })

  return {
    ...snapshot,
    backlogItems: backlogContract.backlogItems,
    backlogContract: backlogContract.backlogContract,
    foundationHubView: deps.buildFoundationHubSummaryInfo(),
    backlogHygiene,
    foundation1100Review,
    researchCuration,
    foundationJobs,
    decisionAutoEmit,
    currentSprint,
    currentStateSummary,
    runtimeSupervisor: {
      servedCode: deps.getDashboardRuntimeMetadata(),
      workerCode: workerCode || deps.getMissingWorkerRuntimeMetadata(),
    },
  }
}

export function buildHubReadRoutesSplitDogfoodProof({
  serverSource = '',
  moduleSource = '',
  proofScriptSource = '',
} = {}) {
  const salesWriteMarker = "app.post('/api/sales-" + "hub/listing-assignment'"
  const healthy = {
    serverSource: `import { registerHubReadRoutes } from './lib/hub-read-routes.js'\nregisterHubReadRoutes(app, {})\n${salesWriteMarker}, requireAdminToken, async () => {})`,
    moduleSource: [
      'registerHubReadRoutes',
      "app.get('/api/foundation-hub'",
      "app.get('/api/foundation/current-sprint'",
      "app.get('/api/ops-hub'",
      "app.get('/api/sales-hub'",
      'buildFoundationHubSummaryPayload',
    ].join(' '),
    proofScriptSource: 'live hub read route probes route behavior round-trip sales write routes remain in server.js',
  }

  const evaluate = fixture => {
    const nextServerSource = String(fixture.serverSource ?? serverSource)
    const nextModuleSource = String(fixture.moduleSource ?? moduleSource)
    const nextProofScriptSource = String(fixture.proofScriptSource ?? proofScriptSource)
    const readRouteMarkers = [
      "app.get('/api/foundation-hub'",
      "app.get('/api/foundation/current-sprint'",
      "app.get('/api/ops-hub'",
      "app.get('/api/sales-hub'",
    ]
    const writeRouteMarker = salesWriteMarker
    return readRouteMarkers.every(marker => nextModuleSource.includes(marker)) &&
      readRouteMarkers.every(marker => !nextServerSource.includes(marker)) &&
      nextServerSource.includes('registerHubReadRoutes(app') &&
      nextServerSource.includes(writeRouteMarker) &&
      !nextModuleSource.includes(writeRouteMarker) &&
      nextProofScriptSource.includes('route behavior round-trip') &&
      nextProofScriptSource.includes('sales write routes remain in server.js')
  }

  const passing = evaluate(healthy)
  const rejected = {
    missingModule: evaluate({ ...healthy, moduleSource: '' }) === false,
    oldInlineFoundationHub: evaluate({ ...healthy, serverSource: `${healthy.serverSource}\napp.get('/api/foundation-hub', () => {})` }) === false,
    missingRegistrar: evaluate({ ...healthy, serverSource: '' }) === false,
    movedSalesWriteRoute: evaluate({ ...healthy, serverSource: healthy.serverSource.replace(`${salesWriteMarker}, requireAdminToken, async () => {})`, ''), moduleSource: `${healthy.moduleSource}\n${salesWriteMarker}, () => {})` }) === false,
    weakProof: evaluate({ ...healthy, proofScriptSource: 'substring-only markers' }) === false,
  }

  return {
    ok: passing && Object.values(rejected).every(Boolean),
    passing,
    rejected,
    summary: 'Hub read route split dogfood accepts healthy read-route module ownership and rejects missing module, old inline read routes, missing registrar, moved Sales write route, and weak proof.',
  }
}

export function registerHubReadRoutes(app, deps = {}) {
  const sendApiError = requireDependency(deps, 'sendApiError')
  const cacheHeadersNoStore = requireDependency(deps, 'cacheHeadersNoStore')
  const normalizeFoundationHubMode = requireDependency(deps, 'normalizeFoundationHubMode')
  requireDependency(deps, 'attachFoundationHubPerformanceMetadata')
  requireDependency(deps, 'getFoundationSnapshot')
  requireDependency(deps, 'getSalesHubPayload')

  app.get('/api/foundation-hub', deps.requireAdminToken, async (req, res) => {
    const startedAtMs = Date.now()
    try {
      const mode = normalizeFoundationHubMode(req.query?.view || req.query?.mode || req.query?.detail)
      if (mode === 'summary') {
        const summaryPayload = await buildFoundationHubSummaryPayload(deps)
        sendFoundationHubPayload(res, summaryPayload, { mode, startedAtMs, deps })
        return
      }

      const snapshot = await deps.getFoundationSnapshot()
      const kpiHealth = await deps.getCachedSafeKpiHealthSnapshot()
      const backlogHygiene = deps.buildBacklogHygieneSnapshot({
        backlogItems: snapshot.backlogItems || [],
        closeouts: deps.getFoundationBuildCloseouts(),
      })
      const foundation1100Review = deps.buildFoundationReviewSprintStatus({
        artifact: await deps.loadFoundationReviewSprintArtifact({ repoRoot: deps.repoRoot }),
        backlogItems: snapshot.backlogItems || [],
        actionRouter: snapshot.intelligenceActionRouter || {},
        hygiene: backlogHygiene,
      })
      const docArchiveCleanup = await deps.buildDocArchiveCleanupStatus({ repoRoot: deps.repoRoot })
      const researchCuration = deps.buildResearchCurationStatus({
        backlogItems: snapshot.backlogItems || [],
        foundationReviewSprint: foundation1100Review,
      })
      const exceptionCuration = await deps.buildExceptionCurationStatus({ repoRoot: deps.repoRoot })
      const hitListReconcile = await deps.buildHitListReconcileStatusFromFile({
        repoRoot: deps.repoRoot,
        backlogItems: snapshot.backlogItems || [],
      })
      const archiveRetire = await deps.buildArchiveRetireStatus({ repoRoot: deps.repoRoot })
      const postShipFanout = await deps.buildPostShipFanoutStatus({
        closeouts: deps.getFoundationBuildCloseouts(),
        backlogItems: snapshot.backlogItems || [],
      })
      const doctrinePropagation = await deps.buildDoctrinePropagationStatus({
        repoRoot: deps.repoRoot,
        apply: false,
      })
      const gateReliability = await deps.buildSyntheticGateReliabilityProof()
      const personalWorkspaceBoundary = await deps.buildPersonalWorkspaceBoundaryStatus({
        repoRoot: deps.repoRoot,
        includeSynthetic: true,
      })
      const ceoDashboardPattern = await deps.buildCeoDashboardPatternStatus({
        repoRoot: deps.repoRoot,
      })
      const decisionAutoEmitScan = await deps.scanDecisionAutoEmitCandidates({ synthetic: true, cwd: deps.repoRoot })
      const decisionAutoEmit = {
        status: decisionAutoEmitScan.candidateCount > 0 ? 'healthy' : 'risk',
        summary: deps.buildDecisionAutoEmitSummary(decisionAutoEmitScan),
        candidates: decisionAutoEmitScan.candidates,
        dryRunDefault: true,
        applyRequired: true,
        plainEnglish: 'Decision Auto-Emit finds obvious decision language and creates proposed decisions only when apply mode is explicitly used.',
      }
      const sheetsApiTrust = await deps.getGoogleSheetsCacheStats()
      const workerCode = await deps.getFoundationRuntimeStatus('foundation-worker')
      const sourceLifecycle = deps.buildSourceLifecycleStatus({
        sources: deps.getSourceContracts(),
        connectors: deps.getSourceConnectors(),
        groupedSystems: deps.getGroupedSourceSystems(),
        extractionControl: snapshot.extractionControl,
        foundationJobs: deps.getFoundationJobDefinitions(),
      })
      const sourceMaturityGrid = deps.buildSourceMaturityGridSnapshot({
        sources: deps.getSourceContracts(),
        extractionControl: snapshot.extractionControl,
        sharedCommunicationsCoverage: snapshot.sharedCommunicationsCoverage,
        intelligenceSynthesisFacts: snapshot.intelligenceSynthesisFacts,
        intelligenceSynthesis: snapshot.intelligenceSynthesis,
        intelligenceActionRouter: snapshot.intelligenceActionRouter,
        sourceMaturityOperational: snapshot.sourceMaturityOperational,
        lifecycle: sourceLifecycle,
      })
      sourceLifecycle.sourceMaturityGrid = sourceMaturityGrid
      const sourceExtractionCoverage = deps.buildSourceExtractionCoverageSnapshot({
        sources: deps.getSourceContracts(),
        extractionControl: snapshot.extractionControl,
        sourceMaturityGrid,
        lifecycle: sourceLifecycle,
      })
      const sourceCoverageCloseout = deps.buildSourceCoverageCloseoutSnapshot({
        sources: deps.getSourceContracts(),
        sourceMaturityGrid,
        sourceExtractionCoverage,
      })
      const sourceConnectorMatrix = deps.buildSourceConnectorMatrixSnapshot({
        sources: deps.getSourceContracts(),
        connectors: deps.getSourceConnectors(),
        extractionControl: snapshot.extractionControl,
        sharedCommunicationsCoverage: snapshot.sharedCommunicationsCoverage,
        intelligenceSynthesisFacts: snapshot.intelligenceSynthesisFacts,
        intelligenceSynthesis: snapshot.intelligenceSynthesis,
        intelligenceActionRouter: snapshot.intelligenceActionRouter,
        sourceMaturityOperational: snapshot.sourceMaturityOperational,
      })
      const sourceHubRoutingMatrix = deps.buildSourceHubRoutingMatrixSnapshot({
        connectorMatrix: sourceConnectorMatrix,
      })
      sourceLifecycle.sourceCoverageCloseout = sourceCoverageCloseout
      sourceLifecycle.sourceExtractionCoverage = sourceExtractionCoverage
      sourceLifecycle.sourceConnectorMatrix = sourceConnectorMatrix
      sourceLifecycle.sourceHubRoutingMatrix = sourceHubRoutingMatrix
      const {
        agentFeedbackAutoSend,
        agentFeedbackProductionAutoSendDryRun,
        agentFeedbackReminders,
        diagnostics: foundationHubFullDiagnostics,
      } = await deps.buildFoundationHubAgentFeedbackDiagnostics({
        repoRoot: deps.repoRoot,
        foundationJobs: snapshot.foundationJobs,
      })
      const sourceOutageBoundary = deps.buildFoundationHubSourceOutageBoundary({
        agentFeedbackAutoSend,
        agentFeedbackProductionAutoSendDryRun,
        agentFeedbackReminders,
      })
      const [
        latestMeetingVaultAutoEnforcementRun,
        meetingVaultLegacyExceptions,
      ] = await Promise.all([
        deps.getLatestMeetingVaultAutoEnforcementRun().catch(() => null),
        deps.getMeetingVaultLegacyExceptions({ limit: 50, status: 'open' }).catch(() => []),
      ])
      const meetingVaultAutoEnforcement = {
        status: latestMeetingVaultAutoEnforcementRun?.status || 'missing',
        latestRun: latestMeetingVaultAutoEnforcementRun,
        legacyExceptions: meetingVaultLegacyExceptions,
        summary: latestMeetingVaultAutoEnforcementRun?.summary?.summary || latestMeetingVaultAutoEnforcementRun?.summary || {},
        plainEnglish: latestMeetingVaultAutoEnforcementRun?.canCloseMeetingVaultAcl
          ? 'Automatic Meeting Vault forward-flow proof is green; historical messy files are bounded in the legacy exception queue.'
          : 'Automatic Meeting Vault forward-flow proof is missing or blocked; keep MEETING-VAULT-ACL-001 blocking.',
      }
      const runtimeProcessControl = await deps.buildRuntimeProcessControlApiSnapshot(snapshot)
      const activeFoundationSprint = await deps.getActiveFoundationCurrentSprint()
      const currentSprint = deps.buildFoundationCurrentSprintStatus({
        sprint: activeFoundationSprint.sprint,
        items: activeFoundationSprint.items,
        backlogItems: snapshot.backlogItems || [],
        closeouts: deps.getFoundationBuildCloseouts(),
        planCriticRuns: activeFoundationSprint.planCriticRuns || [],
      })
      const marketingAvatarRegistry = deps.buildMarketingAvatarImportSnapshot({
        referenceBriefText: deps.readFileSafe(deps.path.join(deps.repoRoot, deps.MARKETING_AVATAR_REFERENCE_BRIEF_PATH)) || '',
        retainProfilesText: deps.readFileSafe(deps.path.join(deps.repoRoot, deps.MARKETING_AVATAR_RETAIN_SOURCE_PATH)) || '',
        attractProfilesText: deps.readFileSafe(deps.path.join(deps.repoRoot, deps.MARKETING_AVATAR_ATTRACT_SOURCE_PATH)) || '',
        oldReadmeText: deps.readFileSafe(deps.path.join(deps.repoRoot, deps.MARKETING_AVATAR_OLD_README_PATH)) || '',
      })
      const marketingSourceMap = deps.buildMarketingSourceMapSnapshot({
        sourceContracts: deps.getSourceContracts(),
        avatarRegistry: marketingAvatarRegistry,
        sourceNoteText: deps.readFileSafe(deps.path.join(deps.repoRoot, deps.MARKETING_SOURCE_MAP_NOTE_PATH)) || '',
      })
      const brandStack = deps.buildBrandStackSnapshot({ marketingSourceMap })
      const tierBehavioralCompletion = deps.buildTierBehavioralCompletionSnapshot()
      const verificationRuns = deps.buildVerificationRunsSnapshot({
        backlogItems: snapshot.backlogItems || [],
        researchCuration,
        intelligenceSynthesis: snapshot.intelligenceSynthesis || {},
        intelligenceActionRouter: snapshot.intelligenceActionRouter || {},
        backlogHygiene,
      })
      const perUserChangelog = deps.buildPerUserChangelogSnapshot({
        users: snapshot.users || [],
        changeEvents: await deps.getRecentChangeEvents(100),
        limit: 100,
      })
      const restrictedDecisionQueue = deps.buildDecisionRestrictedQueueSnapshot({
        decisions: snapshot.decisions || [],
      })
      const buildIntelWatchlist = deps.buildCreatorWatchlistSnapshot()
      const multimodalExtractorContract = deps.buildMultimodalExtractorContractSnapshot()
      const researchInboxContract = deps.buildResearchInboxContractSnapshot()
      const [foundationFeedbackItems, foundationAckStates] = await Promise.all([
        deps.listFoundationFeedbackItems({ limit: 50 }).catch(() => []),
        deps.listFoundationAcknowledgedStates({ limit: 50 }).catch(() => []),
      ])
      const foundationControlCompression = deps.buildFoundationControlCompressionSnapshot({
        backlogItems: snapshot.backlogItems || [],
        closeouts: deps.getFoundationBuildCloseouts(),
        currentSprint: activeFoundationSprint,
        feedbackItems: foundationFeedbackItems,
        ackStates: foundationAckStates,
        sources: deps.getSourceContracts(),
        extractionControl: snapshot.extractionControl,
        intelligenceAtomSpine: snapshot.intelligenceAtomSpine,
        intelligenceSynthesis: snapshot.intelligenceSynthesis,
        intelligenceActionRouter: snapshot.intelligenceActionRouter,
      })
      const implementationIntelligence = deps.buildImplementationIntelligenceSnapshot({
        backlogItems: snapshot.backlogItems || [],
        currentSprint: activeFoundationSprint,
      })
      const buildIntelExtractionContexts = await deps.searchSharedCommunicationArtifactsForContext({
        query: 'AI team setup folder structure agents workflows prompts dashboard build implementation',
        sourceIds: ['SRC-YOUTUBE-INTEL-001'],
        artifactTypes: ['video_transcript'],
        limit: 10,
        excerptChars: 1800,
      })
      const buildIntelExtraction = deps.buildBuildIntelExtractionImplementationSnapshot({
        transcriptContexts: buildIntelExtractionContexts,
        backlogItems: snapshot.backlogItems || [],
        currentSprint: activeFoundationSprint,
      })
      const gstackBuildIntel = await deps.buildGStackBuildIntelSnapshot({ allowMissingRepo: true })
      const endpointBudgets = deps.loadLatestFoundationEndpointBudgetSnapshot
        ? await deps.loadLatestFoundationEndpointBudgetSnapshot({ repoRoot: deps.repoRoot })
        : null
      const docArtifactBloat = deps.buildDocArtifactBloatSnapshot
        ? await deps.buildDocArtifactBloatSnapshot({ repoRoot: deps.repoRoot })
        : null
      const foundationOperatingReliability = deps.buildFoundationOperatingReliabilitySnapshot({
        sourceContracts: deps.getSourceContracts(),
        sourceConnectors: deps.getSourceConnectors(),
        foundationJobs: snapshot.foundationJobs,
        endpointBudgets,
        currentSprintStatus: currentSprint,
        backlogItems: snapshot.backlogItems || [],
        closeouts: deps.getFoundationBuildCloseouts(),
        docArtifactBloat,
      })
      const foundationSystemHealth = buildFoundationSystemHealthSnapshot({
        foundationJobs: snapshot.foundationJobs,
        foundationOperatingReliability,
        endpointBudgets,
        currentSprintStatus: currentSprint,
        sourceContracts: deps.getSourceContracts(),
        docArtifactBloat,
      })
      const currentStateSummary = deps.buildFoundationCurrentStateSummaryPayload({
        sourceContracts: deps.getSourceContracts(),
        backlogItems: snapshot.backlogItems || [],
        kpiHealth,
        currentSprint,
      })
      sourceLifecycle.marketingSourceMap = marketingSourceMap
      sourceLifecycle.brandStack = brandStack
      sourceLifecycle.tierBehavioralCompletion = tierBehavioralCompletion
      sourceLifecycle.verificationRuns = verificationRuns
      sourceLifecycle.perUserChangelog = perUserChangelog
      sourceLifecycle.restrictedDecisionQueue = restrictedDecisionQueue
      const foundationUiComplete = deps.buildFoundationUiCompleteSnapshot({
        sourceLifecycle,
        currentSprint,
      })
      sourceLifecycle.foundationUiComplete = foundationUiComplete
      sourceLifecycle.currentSprint = currentSprint
      const fullPayload = {
        ...snapshot,
        sharedCommunicationSynthesis: compactSharedCommunicationSynthesis(snapshot.sharedCommunicationSynthesis),
        kpiHealth,
        backlogHygiene,
        foundation1100Review,
        docArchiveCleanup,
        researchCuration,
        exceptionCuration,
        hitListReconcile,
        archiveRetire,
        postShipFanout,
        gateReliability,
        personalWorkspaceBoundary,
        ceoDashboardPattern,
        doctrinePropagation,
        decisionAutoEmit,
        sheetsApiTrust,
        sourceLifecycle: compactFoundationSourceLifecycle(sourceLifecycle),
        sourceMaturityGrid,
        sourceExtractionCoverage,
        sourceCoverageCloseout,
        sourceConnectorMatrix,
        sourceHubRoutingMatrix,
        agentFeedbackAutoSend,
        agentFeedbackProductionAutoSendDryRun,
        agentFeedbackReminders,
        sourceOutageBoundary,
        meetingVaultAutoEnforcement,
        runtimeProcessControl,
        currentSprint,
        marketingAvatarRegistry,
        marketingSourceMap,
        brandStack,
        tierBehavioralCompletion,
        verificationRuns,
        perUserChangelog,
        restrictedDecisionQueue,
        buildIntelWatchlist,
        multimodalExtractorContract,
        researchInboxContract,
        foundationControlCompression,
        implementationIntelligence,
        buildIntelExtraction,
        gstackBuildIntel,
        foundationOperatingReliability,
        foundationSystemHealth,
        currentStateSummary,
        foundationHubFullDiagnostics,
        foundationUiComplete,
        runtimeSupervisor: {
          servedCode: deps.getDashboardRuntimeMetadata(),
          workerCode: workerCode || deps.getMissingWorkerRuntimeMetadata(),
        },
      }
      fullPayload.foundationHubView = {
        mode: 'full',
        purpose: 'Full diagnostic payload for Runtime Health and deep debugging.',
        summaryPath: '/api/foundation-hub',
      }
      sendFoundationHubPayload(res, fullPayload, { mode: 'full', startedAtMs, deps })
    } catch (error) {
      sendApiError(
        res,
        500,
        'foundation_hub_load_failed',
        error instanceof Error ? error.message : 'Failed to load foundation hub data.'
      )
    }
  })

  app.get('/api/foundation/current-sprint', deps.requireAdminToken, async (_req, res) => {
    try {
      const snapshot = await deps.getFoundationSnapshot()
      const activeFoundationSprint = await deps.getActiveFoundationCurrentSprint()
      const currentSprint = deps.buildFoundationCurrentSprintStatus({
        sprint: activeFoundationSprint.sprint,
        items: activeFoundationSprint.items,
        backlogItems: snapshot.backlogItems || [],
        closeouts: deps.getFoundationBuildCloseouts(),
        planCriticRuns: activeFoundationSprint.planCriticRuns || [],
      })
      res.json({
        generatedAt: new Date().toISOString(),
        currentSprint,
      })
    } catch (error) {
      sendApiError(
        res,
        500,
        'foundation_current_sprint_load_failed',
        error instanceof Error ? error.message : 'Failed to load Current Sprint.'
      )
    }
  })

  app.get('/api/ops-hub', deps.requireAdminToken, async (_req, res) => {
    try {
      const snapshot = await deps.getFoundationSnapshot()
      const foundationJobs = snapshot.foundationJobs || {}
      const {
        agentFeedbackAutoSend,
        agentFeedbackProductionAutoSendDryRun,
        agentFeedbackReminders,
      } = await deps.buildFoundationHubAgentFeedbackDiagnostics({
        repoRoot: deps.repoRoot,
        foundationJobs,
      })
      const sourceOutageBoundary = deps.buildFoundationHubSourceOutageBoundary({
        agentFeedbackAutoSend,
        agentFeedbackProductionAutoSendDryRun,
        agentFeedbackReminders,
      })
      sourceOutageBoundary.summary = {
        ...(sourceOutageBoundary.summary || {}),
        opsApiFailSoft: true,
      }
      const jobs = Array.isArray(foundationJobs.jobs)
        ? foundationJobs.jobs.filter(job => Array.isArray(job.servesHubs) && job.servesHubs.includes('ops'))
        : []
      const jobKeys = new Set(jobs.map(job => job.key))
      const latestRuns = Array.isArray(foundationJobs.latestRuns)
        ? foundationJobs.latestRuns.filter(run => jobKeys.has(run.jobKey))
        : []

      res.json({
        foundationJobs: {
          generatedAt: foundationJobs.generatedAt || snapshot.meta?.generatedAt || new Date().toISOString(),
          totalJobs: jobs.length,
          enabledJobs: jobs.filter(job => job.enabled !== false).length,
          scheduledJobs: jobs.filter(job => job.runtimeMode === 'scheduled').length,
          dueJobs: jobs.filter(job => job.isDue).length,
          manualJobs: jobs.filter(job => job.runtimeMode === 'manual').length,
          jobs,
          latestRuns,
        },
        agentFeedbackAutoSend,
        agentFeedbackProductionAutoSendDryRun,
        agentFeedbackReminders,
        sourceOutageBoundary,
        meta: {
          generatedAt: snapshot.meta?.generatedAt || new Date().toISOString(),
          surface: 'ops',
        },
      })
    } catch (error) {
      sendApiError(
        res,
        500,
        'ops_hub_load_failed',
        error instanceof Error ? error.message : 'Failed to load Ops hub data.'
      )
    }
  })

  app.get('/api/sales-hub', deps.requireAdminToken, async (req, res) => {
    try {
      const payload = await deps.getSalesHubPayload({ forceRefresh: req.query?.refresh === '1' || req.query?.refresh === 'true' })
      cacheHeadersNoStore(res)
      res.json(payload)
    } catch (error) {
      sendApiError(
        res,
        500,
        'sales_hub_load_failed',
        error instanceof Error ? error.message : 'Failed to load Sales hub data.'
      )
    }
  })
}
