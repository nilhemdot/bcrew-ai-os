import path from 'node:path'

export function registerFoundationSourceRoutes(app, deps = {}) {
  const {
    requireAdminToken,
    sendApiError,
    sendAccessDenied,
    cacheHeadersNoStore,
    AccessDeniedError,
    buildSourceOfTruthPayload,
    getFoundationSnapshot,
    getExtractionControlSnapshot,
    getSourceContracts,
    getSourceConnectors,
    getGroupedSourceSystems,
    getFoundationJobDefinitions,
    buildSourceLifecycleStatus,
    buildSourceMaturityGridSnapshot,
    buildSourceExtractionCoverageSnapshot,
    buildSourceCoverageCloseoutSnapshot,
    buildSourceConnectorMatrixSnapshot,
    buildConnectorCredentialRegistrySnapshot,
    buildSourceHubRoutingMatrixSnapshot,
    buildMarketingAvatarImportSnapshot,
    buildMarketingSourceMapSnapshot,
    buildBrandStackSnapshot,
    buildTierBehavioralCompletionSnapshot,
    buildBacklogHygieneSnapshot,
    getFoundationBuildCloseouts,
    buildResearchCurationStatus,
    getRecentChangeEvents,
    buildVerificationRunsSnapshot,
    buildPerUserChangelogSnapshot,
    buildDecisionRestrictedQueueSnapshot,
    getActiveFoundationCurrentSprint,
    buildFoundationCurrentSprintStatus,
    buildFoundationUiCompleteSnapshot,
    listFoundationUsers,
    readFileSafe,
    MARKETING_AVATAR_REFERENCE_BRIEF_PATH,
    MARKETING_AVATAR_RETAIN_SOURCE_PATH,
    MARKETING_AVATAR_ATTRACT_SOURCE_PATH,
    MARKETING_AVATAR_OLD_README_PATH,
    MARKETING_SOURCE_MAP_NOTE_PATH,
    repoRoot,
  } = deps

  function isAccessDenied(error) {
    return AccessDeniedError && error instanceof AccessDeniedError
  }

  function sendSourceRouteError(res, status, code, message, error) {
    if (isAccessDenied(error)) {
      sendAccessDenied(res, error)
      return
    }
    sendApiError(
      res,
      status,
      code,
      error instanceof Error ? error.message : message,
    )
  }

  function buildMarketingAvatarRegistry() {
    return buildMarketingAvatarImportSnapshot({
      referenceBriefText: readFileSafe(path.join(repoRoot, MARKETING_AVATAR_REFERENCE_BRIEF_PATH)) || '',
      retainProfilesText: readFileSafe(path.join(repoRoot, MARKETING_AVATAR_RETAIN_SOURCE_PATH)) || '',
      attractProfilesText: readFileSafe(path.join(repoRoot, MARKETING_AVATAR_ATTRACT_SOURCE_PATH)) || '',
      oldReadmeText: readFileSafe(path.join(repoRoot, MARKETING_AVATAR_OLD_README_PATH)) || '',
    })
  }

  function buildMarketingSourceMapFromRegistry(avatarRegistry = buildMarketingAvatarRegistry()) {
    return buildMarketingSourceMapSnapshot({
      sourceContracts: getSourceContracts(),
      avatarRegistry,
      sourceNoteText: readFileSafe(path.join(repoRoot, MARKETING_SOURCE_MAP_NOTE_PATH)) || '',
    })
  }

  function buildSourceLifecycleBase(foundationSnapshot, extractionControl) {
    return buildSourceLifecycleStatus({
      sources: getSourceContracts(),
      connectors: getSourceConnectors(),
      groupedSystems: getGroupedSourceSystems(),
      extractionControl,
      foundationJobs: getFoundationJobDefinitions(),
    })
  }

  function buildSourceMaturityFromSnapshot(foundationSnapshot, extractionControl, lifecycle) {
    return buildSourceMaturityGridSnapshot({
      sources: getSourceContracts(),
      extractionControl,
      sharedCommunicationsCoverage: foundationSnapshot.sharedCommunicationsCoverage,
      intelligenceSynthesisFacts: foundationSnapshot.intelligenceSynthesisFacts,
      intelligenceSynthesis: foundationSnapshot.intelligenceSynthesis,
      intelligenceActionRouter: foundationSnapshot.intelligenceActionRouter,
      sourceMaturityOperational: foundationSnapshot.sourceMaturityOperational,
      lifecycle,
    })
  }

  function buildSourceConnectorMatrixFromSnapshot(foundationSnapshot, extractionControl) {
    return buildSourceConnectorMatrixSnapshot({
      sources: getSourceContracts(),
      connectors: getSourceConnectors(),
      extractionControl,
      sharedCommunicationsCoverage: foundationSnapshot.sharedCommunicationsCoverage,
      intelligenceSynthesisFacts: foundationSnapshot.intelligenceSynthesisFacts,
      intelligenceSynthesis: foundationSnapshot.intelligenceSynthesis,
      intelligenceActionRouter: foundationSnapshot.intelligenceActionRouter,
      sourceMaturityOperational: foundationSnapshot.sourceMaturityOperational,
    })
  }

  app.get('/api/source-of-truth', requireAdminToken, async (_req, res) => {
    res.json(await buildSourceOfTruthPayload({ repoRoot }))
  })

  app.get('/api/foundation/source-lifecycle', requireAdminToken, async (_req, res) => {
    try {
      const foundationSnapshot = await getFoundationSnapshot()
      const extractionControl = foundationSnapshot.extractionControl || await getExtractionControlSnapshot({ limit: 200 })
      const sourceLifecycle = buildSourceLifecycleBase(foundationSnapshot, extractionControl)
      sourceLifecycle.sourceMaturityGrid = buildSourceMaturityFromSnapshot(foundationSnapshot, extractionControl, sourceLifecycle)
      sourceLifecycle.sourceExtractionCoverage = buildSourceExtractionCoverageSnapshot({
        sources: getSourceContracts(),
        extractionControl,
        sourceMaturityGrid: sourceLifecycle.sourceMaturityGrid,
        lifecycle: sourceLifecycle,
      })
      sourceLifecycle.sourceCoverageCloseout = buildSourceCoverageCloseoutSnapshot({
        sources: getSourceContracts(),
        sourceMaturityGrid: sourceLifecycle.sourceMaturityGrid,
        sourceExtractionCoverage: sourceLifecycle.sourceExtractionCoverage,
      })
      sourceLifecycle.sourceConnectorMatrix = buildSourceConnectorMatrixFromSnapshot(foundationSnapshot, extractionControl)
      sourceLifecycle.connectorCredentialPreflight = buildConnectorCredentialRegistrySnapshot({
        sourceContracts: getSourceContracts(),
        sourceConnectors: getSourceConnectors(),
      })
      sourceLifecycle.sourceHubRoutingMatrix = buildSourceHubRoutingMatrixSnapshot({
        connectorMatrix: sourceLifecycle.sourceConnectorMatrix,
      })
      const marketingAvatarRegistry = buildMarketingAvatarRegistry()
      sourceLifecycle.marketingSourceMap = buildMarketingSourceMapFromRegistry(marketingAvatarRegistry)
      sourceLifecycle.brandStack = buildBrandStackSnapshot({
        marketingSourceMap: sourceLifecycle.marketingSourceMap,
      })
      sourceLifecycle.tierBehavioralCompletion = buildTierBehavioralCompletionSnapshot()
      const backlogHygiene = buildBacklogHygieneSnapshot({
        backlogItems: foundationSnapshot.backlogItems || [],
        closeouts: getFoundationBuildCloseouts(),
      })
      const researchCuration = buildResearchCurationStatus({
        backlogItems: foundationSnapshot.backlogItems || [],
      })
      const perUserChangeEvents = await getRecentChangeEvents(100)
      sourceLifecycle.verificationRuns = buildVerificationRunsSnapshot({
        backlogItems: foundationSnapshot.backlogItems || [],
        researchCuration,
        intelligenceSynthesis: foundationSnapshot.intelligenceSynthesis || {},
        intelligenceActionRouter: foundationSnapshot.intelligenceActionRouter || {},
        backlogHygiene,
      })
      sourceLifecycle.perUserChangelog = buildPerUserChangelogSnapshot({
        users: foundationSnapshot.users || [],
        changeEvents: perUserChangeEvents,
        limit: 100,
      })
      sourceLifecycle.restrictedDecisionQueue = buildDecisionRestrictedQueueSnapshot({
        decisions: foundationSnapshot.decisions || [],
      })
      const activeFoundationSprint = await getActiveFoundationCurrentSprint()
      const currentSprint = buildFoundationCurrentSprintStatus({
        sprint: activeFoundationSprint.sprint,
        items: activeFoundationSprint.items,
        backlogItems: foundationSnapshot.backlogItems || [],
        closeouts: getFoundationBuildCloseouts(),
        planCriticRuns: activeFoundationSprint.planCriticRuns || [],
      })
      sourceLifecycle.foundationUiComplete = buildFoundationUiCompleteSnapshot({
        sourceLifecycle,
        currentSprint,
      })
      sourceLifecycle.currentSprint = currentSprint
      cacheHeadersNoStore(res)
      res.json(sourceLifecycle)
    } catch (error) {
      sendSourceRouteError(res, 500, 'foundation_source_lifecycle_load_failed', 'Failed to load Foundation source lifecycle.', error)
    }
  })

  app.get('/api/foundation/marketing-source-map', requireAdminToken, async (_req, res) => {
    try {
      const marketingSourceMap = buildMarketingSourceMapFromRegistry()
      cacheHeadersNoStore(res)
      res.json(marketingSourceMap)
    } catch (error) {
      sendSourceRouteError(res, 500, 'foundation_marketing_source_map_load_failed', 'Failed to load Foundation marketing source map.', error)
    }
  })

  app.get('/api/foundation/brand-stack', requireAdminToken, async (_req, res) => {
    try {
      const marketingSourceMap = buildMarketingSourceMapFromRegistry()
      const brandStack = buildBrandStackSnapshot({ marketingSourceMap })
      cacheHeadersNoStore(res)
      res.json(brandStack)
    } catch (error) {
      sendSourceRouteError(res, 500, 'foundation_brand_stack_load_failed', 'Failed to load Foundation brand stack.', error)
    }
  })

  app.get('/api/foundation/tier-behavioral-completion', requireAdminToken, async (_req, res) => {
    try {
      cacheHeadersNoStore(res)
      res.json(buildTierBehavioralCompletionSnapshot())
    } catch (error) {
      sendSourceRouteError(res, 500, 'foundation_tier_behavioral_completion_failed', 'Failed to load Foundation tier behavior proof.', error)
    }
  })

  app.get('/api/foundation/verification-runs', requireAdminToken, async (_req, res) => {
    try {
      const snapshot = await getFoundationSnapshot()
      const backlogHygiene = buildBacklogHygieneSnapshot({
        backlogItems: snapshot.backlogItems || [],
        closeouts: getFoundationBuildCloseouts(),
      })
      const researchCuration = buildResearchCurationStatus({
        backlogItems: snapshot.backlogItems || [],
      })
      const verificationRuns = buildVerificationRunsSnapshot({
        backlogItems: snapshot.backlogItems || [],
        researchCuration,
        intelligenceSynthesis: snapshot.intelligenceSynthesis || {},
        intelligenceActionRouter: snapshot.intelligenceActionRouter || {},
        backlogHygiene,
      })
      cacheHeadersNoStore(res)
      res.json(verificationRuns)
    } catch (error) {
      sendSourceRouteError(res, 500, 'foundation_verification_runs_failed', 'Failed to load Foundation verification runs.', error)
    }
  })

  app.get('/api/foundation/per-user-changelog', requireAdminToken, async (req, res) => {
    try {
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100))
      const [users, changeEvents] = await Promise.all([
        listFoundationUsers({ activeOnly: true }),
        getRecentChangeEvents(limit),
      ])
      const perUserChangelog = buildPerUserChangelogSnapshot({
        users,
        changeEvents,
        limit,
      })
      cacheHeadersNoStore(res)
      res.json(perUserChangelog)
    } catch (error) {
      sendSourceRouteError(res, 500, 'foundation_per_user_changelog_failed', 'Failed to load Foundation per-user changelog.', error)
    }
  })

  app.get('/api/foundation/restricted-decision-queue', requireAdminToken, async (req, res) => {
    try {
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100))
      const snapshot = await getFoundationSnapshot()
      const restrictedDecisionQueue = buildDecisionRestrictedQueueSnapshot({
        decisions: snapshot.decisions || [],
        limit,
      })
      cacheHeadersNoStore(res)
      res.json(restrictedDecisionQueue)
    } catch (error) {
      sendSourceRouteError(res, 500, 'foundation_restricted_decision_queue_failed', 'Failed to load Foundation restricted decision queue.', error)
    }
  })

  app.get('/api/foundation/source-coverage-closeout', requireAdminToken, async (_req, res) => {
    try {
      const snapshot = await getFoundationSnapshot()
      const sourceLifecycle = buildSourceLifecycleBase(snapshot, snapshot.extractionControl)
      const sourceMaturityGrid = buildSourceMaturityFromSnapshot(snapshot, snapshot.extractionControl, sourceLifecycle)
      const sourceExtractionCoverage = buildSourceExtractionCoverageSnapshot({
        sources: getSourceContracts(),
        extractionControl: snapshot.extractionControl,
        sourceMaturityGrid,
        lifecycle: sourceLifecycle,
      })
      const sourceCoverageCloseout = buildSourceCoverageCloseoutSnapshot({
        sources: getSourceContracts(),
        sourceMaturityGrid,
        sourceExtractionCoverage,
      })
      cacheHeadersNoStore(res)
      res.json(sourceCoverageCloseout)
    } catch (error) {
      sendSourceRouteError(res, 500, 'foundation_source_coverage_closeout_load_failed', 'Failed to load Foundation source coverage closeout.', error)
    }
  })

  app.get('/api/foundation/source-extraction-coverage', requireAdminToken, async (_req, res) => {
    try {
      const snapshot = await getFoundationSnapshot()
      const sourceLifecycle = buildSourceLifecycleBase(snapshot, snapshot.extractionControl)
      const sourceMaturityGrid = buildSourceMaturityFromSnapshot(snapshot, snapshot.extractionControl, sourceLifecycle)
      const sourceExtractionCoverage = buildSourceExtractionCoverageSnapshot({
        sources: getSourceContracts(),
        extractionControl: snapshot.extractionControl,
        sourceMaturityGrid,
        lifecycle: sourceLifecycle,
      })
      cacheHeadersNoStore(res)
      res.json(sourceExtractionCoverage)
    } catch (error) {
      sendSourceRouteError(res, 500, 'foundation_source_extraction_coverage_load_failed', 'Failed to load Foundation source extraction coverage.', error)
    }
  })

  app.get('/api/foundation/source-maturity-grid', requireAdminToken, async (_req, res) => {
    try {
      const snapshot = await getFoundationSnapshot()
      const sourceLifecycle = buildSourceLifecycleBase(snapshot, snapshot.extractionControl)
      const sourceMaturityGrid = buildSourceMaturityFromSnapshot(snapshot, snapshot.extractionControl, sourceLifecycle)
      cacheHeadersNoStore(res)
      res.json(sourceMaturityGrid)
    } catch (error) {
      sendSourceRouteError(res, 500, 'foundation_source_maturity_grid_load_failed', 'Failed to load Foundation source maturity grid.', error)
    }
  })

  app.get('/api/foundation/source-connector-matrix', requireAdminToken, async (_req, res) => {
    try {
      const snapshot = await getFoundationSnapshot()
      const sourceConnectorMatrix = buildSourceConnectorMatrixFromSnapshot(snapshot, snapshot.extractionControl)
      cacheHeadersNoStore(res)
      res.json(sourceConnectorMatrix)
    } catch (error) {
      sendSourceRouteError(res, 500, 'foundation_source_connector_matrix_load_failed', 'Failed to load Foundation source connector matrix.', error)
    }
  })

  app.get('/api/foundation/connector-credential-preflight', requireAdminToken, async (_req, res) => {
    try {
      const connectorCredentialPreflight = buildConnectorCredentialRegistrySnapshot({
        sourceContracts: getSourceContracts(),
        sourceConnectors: getSourceConnectors(),
      })
      cacheHeadersNoStore(res)
      res.json(connectorCredentialPreflight)
    } catch (error) {
      sendSourceRouteError(res, 500, 'foundation_connector_credential_preflight_load_failed', 'Failed to load Foundation connector credential preflight.', error)
    }
  })

  app.get('/api/foundation/source-hub-routing-matrix', requireAdminToken, async (_req, res) => {
    try {
      const snapshot = await getFoundationSnapshot()
      const sourceConnectorMatrix = buildSourceConnectorMatrixFromSnapshot(snapshot, snapshot.extractionControl)
      const sourceHubRoutingMatrix = buildSourceHubRoutingMatrixSnapshot({
        connectorMatrix: sourceConnectorMatrix,
      })
      cacheHeadersNoStore(res)
      res.json(sourceHubRoutingMatrix)
    } catch (error) {
      sendSourceRouteError(res, 500, 'foundation_source_hub_routing_matrix_load_failed', 'Failed to load Foundation source hub routing matrix.', error)
    }
  })
}
