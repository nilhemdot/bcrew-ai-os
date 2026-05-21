export function registerFoundationBuildIntelRoutes(app, deps = {}) {
  const {
    requireAdminToken,
    sendApiError,
    getFoundationSnapshot,
    getActiveFoundationCurrentSprint,
    getExtractionControlSnapshot,
    listFoundationFeedbackItems,
    listFoundationAcknowledgedStates,
    listSourceCrawlItems,
    searchSharedCommunicationArtifactsForContext,
    getFoundationBuildCloseouts,
    getSourceContracts,
    buildCreatorWatchlistSnapshot,
    buildYoutubeCreatorDailyWatchReadSnapshot,
    buildMultimodalExtractorContractSnapshot,
    buildResearchInboxContractSnapshot,
    buildFoundationControlCompressionSnapshot,
    buildImplementationIntelligenceSnapshot,
    buildBuildIntelExtractionImplementationSnapshot,
    buildGStackBuildIntelSnapshot,
  } = deps

  app.get('/api/foundation/build-intel-watchlist', requireAdminToken, async (_req, res) => {
    try {
      res.json(buildCreatorWatchlistSnapshot())
    } catch (error) {
      sendApiError(
        res,
        500,
        'build_intel_watchlist_load_failed',
        error instanceof Error ? error.message : 'Failed to load Build Intel watchlist.'
      )
    }
  })

  app.get('/api/foundation/build-intel/youtube-creator-daily-watch', requireAdminToken, async (_req, res) => {
    try {
      const [foundationSnapshot, extractionControl, items] = await Promise.all([
        getFoundationSnapshot(),
        getExtractionControlSnapshot({ limit: 200 }),
        listSourceCrawlItems({ targetKey: 'youtube-creator-daily-watch', limit: 200, order: 'desc' }),
      ])
      const target = (extractionControl.targets || []).find(item => item.targetKey === 'youtube-creator-daily-watch') || null
      const report = (foundationSnapshot.intelligenceAtomSpine?.recentReports || [])
        .find(item => item.reportArtifactId === 'research-pool:youtube-creator-daily-watch') || null
      const latestJobRun = (foundationSnapshot.runtime?.jobs || foundationSnapshot.foundationJobs?.jobs || [])
        .find(item => item.key === 'youtube-creator-daily-watch')?.latestRun || null
      res.json(buildYoutubeCreatorDailyWatchReadSnapshot({
        target,
        items,
        report,
        latestJobRun,
      }))
    } catch (error) {
      sendApiError(
        res,
        500,
        'youtube_creator_daily_watch_load_failed',
        error instanceof Error ? error.message : 'Failed to load YouTube creator daily watch snapshot.'
      )
    }
  })

  app.get('/api/foundation/multimodal-extractor-contract', requireAdminToken, async (_req, res) => {
    try {
      res.json(buildMultimodalExtractorContractSnapshot())
    } catch (error) {
      sendApiError(
        res,
        500,
        'multimodal_extractor_contract_load_failed',
        error instanceof Error ? error.message : 'Failed to load multimodal extractor contract.'
      )
    }
  })

  app.get('/api/foundation/research-inbox-contract', requireAdminToken, async (_req, res) => {
    try {
      res.json(buildResearchInboxContractSnapshot())
    } catch (error) {
      sendApiError(
        res,
        500,
        'research_inbox_contract_load_failed',
        error instanceof Error ? error.message : 'Failed to load Research Inbox contract.'
      )
    }
  })

  app.get('/api/foundation/control-compression', requireAdminToken, async (_req, res) => {
    try {
      const snapshot = await getFoundationSnapshot()
      const activeFoundationSprint = await getActiveFoundationCurrentSprint()
      const [feedbackItems, ackStates] = await Promise.all([
        listFoundationFeedbackItems({ limit: 50 }).catch(() => []),
        listFoundationAcknowledgedStates({ limit: 50 }).catch(() => []),
      ])
      res.json(buildFoundationControlCompressionSnapshot({
        backlogItems: snapshot.backlogItems || [],
        closeouts: getFoundationBuildCloseouts(),
        currentSprint: activeFoundationSprint,
        feedbackItems,
        ackStates,
        sources: getSourceContracts(),
        extractionControl: snapshot.extractionControl,
        intelligenceAtomSpine: snapshot.intelligenceAtomSpine,
        intelligenceSynthesis: snapshot.intelligenceSynthesis,
        intelligenceActionRouter: snapshot.intelligenceActionRouter,
      }))
    } catch (error) {
      sendApiError(
        res,
        500,
        'foundation_control_compression_load_failed',
        error instanceof Error ? error.message : 'Failed to load Foundation control compression snapshot.'
      )
    }
  })

  app.get('/api/foundation/implementation-intelligence', requireAdminToken, async (_req, res) => {
    try {
      const snapshot = await getFoundationSnapshot()
      const activeFoundationSprint = await getActiveFoundationCurrentSprint()
      res.json(buildImplementationIntelligenceSnapshot({
        backlogItems: snapshot.backlogItems || [],
        currentSprint: activeFoundationSprint,
      }))
    } catch (error) {
      sendApiError(
        res,
        500,
        'implementation_intelligence_load_failed',
        error instanceof Error ? error.message : 'Failed to load Implementation Intelligence snapshot.'
      )
    }
  })

  app.get('/api/foundation/build-intel-extraction', requireAdminToken, async (_req, res) => {
    try {
      const snapshot = await getFoundationSnapshot()
      const activeFoundationSprint = await getActiveFoundationCurrentSprint()
      const transcriptContexts = await searchSharedCommunicationArtifactsForContext({
        query: 'AI team setup folder structure agents workflows prompts dashboard build implementation',
        sourceIds: ['SRC-YOUTUBE-INTEL-001'],
        artifactTypes: ['video_transcript'],
        limit: 10,
        excerptChars: 1800,
      })
      res.json(buildBuildIntelExtractionImplementationSnapshot({
        transcriptContexts,
        backlogItems: snapshot.backlogItems || [],
        currentSprint: activeFoundationSprint,
      }))
    } catch (error) {
      sendApiError(
        res,
        500,
        'build_intel_extraction_load_failed',
        error instanceof Error ? error.message : 'Failed to load Build Intel extraction snapshot.'
      )
    }
  })

  app.get('/api/foundation/gstack-build-intel', requireAdminToken, async (_req, res) => {
    try {
      res.json(await buildGStackBuildIntelSnapshot({ allowMissingRepo: true }))
    } catch (error) {
      sendApiError(
        res,
        500,
        'gstack_build_intel_load_failed',
        error instanceof Error ? error.message : 'Failed to load GStack Build Intel snapshot.'
      )
    }
  })
}
