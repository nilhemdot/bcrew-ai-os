import {
  DEV_TEAM_HUB_V0_API_ROUTE,
  buildDevTeamHubV0Snapshot,
} from './dev-team-hub.js'
import {
  YOUTUBE_CREATOR_DAILY_WATCH_JOB_KEY,
  YOUTUBE_CREATOR_DAILY_WATCH_REPORT_ARTIFACT_ID,
  YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
} from './youtube-creator-daily-watch.js'
import {
  YOUTUBE_SCOUT_REPORT_ARTIFACT_ID,
} from './youtube-scout-latest-video-vision.js'

export function registerFoundationBuildIntelRoutes(app, deps = {}) {
  const {
    requireAdminToken,
    sendApiError,
    getFoundationSnapshot,
    getActiveFoundationCurrentSprint,
    getExtractionControlSnapshot,
    getIntelligenceReportBundle,
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

  app.get(DEV_TEAM_HUB_V0_API_ROUTE, requireAdminToken, async (_req, res) => {
    try {
      const [
        foundationSnapshot,
        activeFoundationSprint,
        extractionControl,
        items,
        scoutBundle,
      ] = await Promise.all([
        getFoundationSnapshot(),
        getActiveFoundationCurrentSprint(),
        getExtractionControlSnapshot({ limit: 200 }),
        listSourceCrawlItems({ targetKey: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, limit: 200, order: 'desc' }),
        getIntelligenceReportBundle(YOUTUBE_SCOUT_REPORT_ARTIFACT_ID, { atomLimit: 50, hitLimit: 100 }),
      ])
      const target = (extractionControl.targets || [])
        .find(item => item.targetKey === YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY) || null
      const dailyWatchReport = (foundationSnapshot.intelligenceAtomSpine?.recentReports || [])
        .find(item => item.reportArtifactId === YOUTUBE_CREATOR_DAILY_WATCH_REPORT_ARTIFACT_ID) || null
      const latestJobRun = (foundationSnapshot.runtime?.jobs || foundationSnapshot.foundationJobs?.jobs || [])
        .find(item => item.key === YOUTUBE_CREATOR_DAILY_WATCH_JOB_KEY)?.latestRun || null
      const dailyWatch = buildYoutubeCreatorDailyWatchReadSnapshot({
        target,
        items,
        report: dailyWatchReport,
        latestJobRun,
      })
      res.json(buildDevTeamHubV0Snapshot({
        sourceContracts: getSourceContracts(),
        creatorWatchlist: buildCreatorWatchlistSnapshot(),
        dailyWatch,
        scoutBundle,
        actionRouter: foundationSnapshot.intelligenceActionRouter || {},
        currentSprint: activeFoundationSprint,
        extractionControl,
      }))
    } catch (error) {
      sendApiError(
        res,
        500,
        'dev_team_hub_load_failed',
        error instanceof Error ? error.message : 'Failed to load Dev Team Hub snapshot.'
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
