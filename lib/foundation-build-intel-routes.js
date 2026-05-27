import {
  DEV_TEAM_HUB_V0_API_ROUTE,
  buildDevTeamHubV0Snapshot,
} from './dev-team-hub.js'
import {
  buildSourcePacketPreview,
  validateSourcePacketPreview,
} from './build-intel-link-approval-source-packets.js'
import {
  SOURCE_PACKET_APPROVAL_DECISION_TARGET_KEY,
  buildSourcePacketDecisionRecord,
  persistSourcePacketDecisionRecord,
} from './source-packet-approval-decision-ledger.js'
import {
  SOURCE_PACKET_WORKER_RUNNER_ROUTE,
  SOURCE_PACKET_WORKER_RUNNER_TARGET_KEY,
  SOURCE_PACKET_WORKER_QUEUE_ROUTE,
  buildSourcePacketWorkerQueue,
  buildSourcePacketWorkerDecisionStatus,
  persistSourcePacketWorkerRun,
  runSourcePacketWorker,
} from './source-packet-worker-runner.js'
import {
  EXTRACTOR_HANDS_PRODUCTION_RUNNER_ROUTE,
  EXTRACTOR_HANDS_PRODUCTION_RUNNER_TARGET_KEY,
  EXTRACTOR_HANDS_PRODUCTION_QUEUE_ROUTE,
  buildExtractorHandsProductionDecisionRecord,
  buildExtractorHandsProductionQueue,
  persistExtractorHandsProductionRun,
  runExtractorHandsProductionRunner,
} from './extractor-hands-production-runner.js'
import {
  YOUTUBE_CREATOR_DAILY_WATCH_JOB_KEY,
  YOUTUBE_CREATOR_DAILY_WATCH_REPORT_ARTIFACT_ID,
  YOUTUBE_CREATOR_DAILY_WATCH_READBACK_LIMIT,
  YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
} from './youtube-creator-daily-watch.js'
import {
  YOUTUBE_SCOUT_REPORT_ARTIFACT_ID,
} from './youtube-scout-latest-video-vision.js'
import {
  YOUTUBE_BUILD_INTEL_LINK_RESOURCE_REPORT_ARTIFACT_ID,
} from './youtube-build-intel-link-resource.js'
import {
  GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID,
} from './god-mode-extractor-eyes-quality-loop.js'
import {
  MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID,
} from './mark-kashef-god-mode-small-batch.js'
import {
  MARK_KASHEF_BASELINE_REPORT_ARTIFACT_ID,
} from './god-mode-youtube-end-to-end-extractor.js'
import {
  isYoutubeLatest20FullWatchReportId,
} from './youtube-latest-20-full-watch-runner.js'
import {
  DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID,
} from './dev-team-intelligence-director.js'
import {
  BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID,
} from './build-intel-source-value-grader.js'

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function reportId(item = {}) {
  return item.reportArtifactId || item.report_artifact_id || ''
}

function reportUpdatedAt(item = {}) {
  return item.updatedAt || item.updated_at || item.createdAt || item.created_at || ''
}

function findLatestApiFullWatchReportId(foundationSnapshot = {}) {
  return list(foundationSnapshot.intelligenceAtomSpine?.recentReports)
    .filter(item => {
      const id = reportId(item)
      return id === MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID || isYoutubeLatest20FullWatchReportId(id)
    })
    .sort((left, right) => text(reportUpdatedAt(right)).localeCompare(text(reportUpdatedAt(left))))
    .map(reportId)
    .find(Boolean) || MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID
}

export function registerFoundationBuildIntelRoutes(app, deps = {}) {
  const {
    requireAdminToken,
    sendApiError,
    getFoundationSnapshot,
    getIntelligenceAtomSpineSnapshot,
    getActiveFoundationCurrentSprint,
    getExtractionControlSnapshot,
    getIntelligenceReportBundle,
    listLlmCalls,
    listFoundationFeedbackItems,
    listFoundationAcknowledgedStates,
    listSourceCrawlItems,
    upsertSourceCrawlTarget,
    upsertSourceCrawlItem,
    upsertIntelligenceReportArtifact,
    searchSharedCommunicationArtifactsForContext,
    getFoundationBuildCloseouts,
    getSourceContracts,
    getRequestActor,
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
        listSourceCrawlItems({
          targetKey: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
          limit: YOUTUBE_CREATOR_DAILY_WATCH_READBACK_LIMIT,
          order: 'desc',
        }),
      ])
      const target = (extractionControl.targets || []).find(item => item.targetKey === YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY) || null
      const report = (foundationSnapshot.intelligenceAtomSpine?.recentReports || [])
        .find(item => item.reportArtifactId === YOUTUBE_CREATOR_DAILY_WATCH_REPORT_ARTIFACT_ID) || null
      const latestJobRun = (foundationSnapshot.runtime?.jobs || foundationSnapshot.foundationJobs?.jobs || [])
        .find(item => item.key === YOUTUBE_CREATOR_DAILY_WATCH_JOB_KEY)?.latestRun || null
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

  app.get('/api/foundation/dev-team-hub', requireAdminToken, async (_req, res) => {
    try {
      const [
        foundationSnapshot,
        fullReportSpine,
        activeFoundationSprint,
        extractionControl,
        items,
        scoutBundle,
        linkResourceBundle,
        eyesBundle,
        markApiFullWatchBundle,
        markBaselineApiFullWatchBundle,
        directorBundle,
        sourceValueGraderBundle,
        geminiVideoReviewCalls,
        sourcePacketDecisionItems,
        sourcePacketWorkerRunItems,
        sourcePacketHandsRunItems,
      ] = await Promise.all([
        getFoundationSnapshot(),
        typeof getIntelligenceAtomSpineSnapshot === 'function'
          ? getIntelligenceAtomSpineSnapshot({ limit: 500 })
          : Promise.resolve(null),
        getActiveFoundationCurrentSprint(),
        getExtractionControlSnapshot({ limit: 200 }),
        listSourceCrawlItems({
          targetKey: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
          limit: YOUTUBE_CREATOR_DAILY_WATCH_READBACK_LIMIT,
          order: 'desc',
        }),
        getIntelligenceReportBundle(YOUTUBE_SCOUT_REPORT_ARTIFACT_ID, { atomLimit: 50, hitLimit: 100 }),
        getIntelligenceReportBundle(YOUTUBE_BUILD_INTEL_LINK_RESOURCE_REPORT_ARTIFACT_ID, { atomLimit: 50, hitLimit: 100 }),
        getIntelligenceReportBundle(GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID, { atomLimit: 50, hitLimit: 100 }),
        getIntelligenceReportBundle(MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID, { atomLimit: 300, hitLimit: 300 }),
        getIntelligenceReportBundle(MARK_KASHEF_BASELINE_REPORT_ARTIFACT_ID, { atomLimit: 300, hitLimit: 300 }),
        getIntelligenceReportBundle(DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID, { atomLimit: 50, hitLimit: 100 }),
        getIntelligenceReportBundle(BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID, { atomLimit: 10, hitLimit: 10 }),
        typeof listLlmCalls === 'function'
          ? listLlmCalls({ provider: 'gemini', workload: 'video_vision', status: 'succeeded', limit: 5000 })
          : Promise.resolve([]),
        listSourceCrawlItems({ targetKey: SOURCE_PACKET_APPROVAL_DECISION_TARGET_KEY, limit: 200, order: 'desc' }),
        listSourceCrawlItems({ targetKey: SOURCE_PACKET_WORKER_RUNNER_TARGET_KEY, limit: 200, order: 'desc' }),
        listSourceCrawlItems({ targetKey: EXTRACTOR_HANDS_PRODUCTION_RUNNER_TARGET_KEY, limit: 200, order: 'desc' }),
      ])
      const latestApiFullWatchReportId = findLatestApiFullWatchReportId(foundationSnapshot)
      const latestApiFullWatchBundle = latestApiFullWatchReportId === MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID
        ? markApiFullWatchBundle
        : await getIntelligenceReportBundle(latestApiFullWatchReportId, { atomLimit: 300, hitLimit: 300 })
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
      const sourcePacketWorkerQueue = buildSourcePacketWorkerQueue({
        decisionItems: sourcePacketDecisionItems,
        workerRunItems: sourcePacketWorkerRunItems,
      })
      const sourcePacketHandsQueue = buildExtractorHandsProductionQueue({
        decisionItems: sourcePacketDecisionItems,
        handsRunItems: sourcePacketHandsRunItems,
      })
      res.json(buildDevTeamHubV0Snapshot({
        foundationSnapshot,
        sourceContracts: getSourceContracts(),
        creatorWatchlist: buildCreatorWatchlistSnapshot(),
        dailyWatch,
        scoutBundle,
        linkResourceBundle,
        eyesBundle,
        markApiFullWatchBundle,
        markBaselineApiFullWatchBundle,
        latestApiFullWatchBundle,
        directorBundle,
        sourceValueGraderBundle,
        geminiVideoReviewCalls,
        youtubeFullWatchReports: fullReportSpine?.recentReports || [],
        sourcePacketWorkerQueue,
        sourcePacketWorkerRunItems,
        sourcePacketHandsQueue,
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

  app.get('/api/foundation/dev-team-hub/link-source-packet-preview', requireAdminToken, async (req, res) => {
    try {
      const packet = buildSourcePacketPreview({
        url: req.query?.url,
        host: req.query?.host,
        sourceVideoId: req.query?.sourceVideoId,
        sourceUrl: req.query?.sourceUrl,
        reportArtifactId: req.query?.reportArtifactId,
        reason: req.query?.reason,
        operatorNote: req.query?.operatorNote,
      })
      const validation = validateSourcePacketPreview(packet)
      res.json({
        status: validation.ok ? 'ready_for_operator_confirmation' : 'needs_adjustment',
        reportOnly: true,
        startsCrawler: false,
        writesBacklog: false,
        writesExternalSystems: false,
        packet,
        validation,
        plainEnglish: validation.ok
          ? 'This is a preview. It records what approval would mean, but it does not crawl, log in, buy, submit, or start a worker.'
          : 'This packet needs adjustment before it can be approved.',
      })
    } catch (error) {
      sendApiError(
        res,
        500,
        'link_source_packet_preview_failed',
        error instanceof Error ? error.message : 'Failed to build source packet preview.'
      )
    }
  })

  app.post('/api/foundation/dev-team-hub/link-source-packet-decision', requireAdminToken, async (req, res) => {
    try {
      const body = req.body || {}
      const actor = typeof getRequestActor === 'function' ? getRequestActor(req) : 'system'
      const record = buildSourcePacketDecisionRecord({
        url: body.url,
        host: body.host,
        sourceVideoId: body.sourceVideoId,
        sourceUrl: body.sourceUrl,
        reportArtifactId: body.reportArtifactId,
        reason: body.reason,
        operatorNote: body.operatorNote,
        operatorAction: body.operatorAction,
        decision: body.decision,
        decidedBy: body.decidedBy || actor || 'Steve',
      })
      const result = await persistSourcePacketDecisionRecord(record, {
        upsertSourceCrawlTarget,
        upsertSourceCrawlItem,
        actor,
      })
      const workerStatus = buildSourcePacketWorkerDecisionStatus(result.ok ? result.record : record)
      if (!result.ok) {
        res.status(400).json({
          status: 'blocked',
          reportOnly: false,
          startsCrawler: false,
          startsWorker: false,
          writesBacklog: false,
          writesExternalSystems: false,
          record,
          workerStatus,
          validation: result.validation,
          plainEnglish: 'The decision was not recorded because the packet needs adjustment. No crawl or worker started.',
        })
        return
      }
      res.json({
        status: 'recorded',
        reportOnly: false,
        startsCrawler: false,
        startsWorker: false,
        writesBacklog: false,
        writesExternalSystems: false,
        record: result.record,
        sourceCrawlItem: result.sourceCrawlItem,
        target: result.target,
        workerStatus,
        sideEffects: result.sideEffects,
        plainEnglish: result.record.plainEnglish,
      })
    } catch (error) {
      sendApiError(
        res,
        500,
        'link_source_packet_decision_failed',
        error instanceof Error ? error.message : 'Failed to record source packet decision.'
      )
    }
  })

  app.post(SOURCE_PACKET_WORKER_RUNNER_ROUTE, requireAdminToken, async (req, res) => {
    try {
      const body = req.body || {}
      const actor = typeof getRequestActor === 'function' ? getRequestActor(req) : 'system'
      const decisionRecord = body.decisionRecord || buildSourcePacketDecisionRecord({
        url: body.url,
        host: body.host,
        sourceVideoId: body.sourceVideoId,
        sourceUrl: body.sourceUrl,
        reportArtifactId: body.reportArtifactId,
        reason: body.reason,
        operatorNote: body.operatorNote,
        operatorAction: body.operatorAction || 'hold_packet',
        decision: body.decision,
        decidedBy: body.decidedBy || actor || 'Steve',
      })
      const run = await runSourcePacketWorker({
        decisionRecord,
        html: body.html,
        mode: body.mode || 'synthetic_fixture',
        allowLive: body.allowLive === true,
        followLinks: body.followLinks === true,
        submitForms: body.submitForms === true,
        downloadFiles: body.downloadFiles === true,
        authSessionUsed: body.authSessionUsed === true,
        externalWrites: body.externalWrites === true,
        writesBacklog: body.writesBacklog === true,
      })

      if (!run.ok) {
        res.status(400).json({
          status: 'blocked',
          reportOnly: true,
          startsCrawler: false,
          startsWorker: false,
          writesBacklog: false,
          writesExternalSystems: false,
          decisionRecord,
          run,
          validation: run.validation,
          plainEnglish: 'The source-packet worker did not run. The packet, mode, or boundary failed validation.',
        })
        return
      }

      const persistence = await persistSourcePacketWorkerRun(run, {
        upsertSourceCrawlTarget,
        upsertSourceCrawlItem,
        upsertIntelligenceReportArtifact,
        actor,
      })
      if (!persistence.ok) {
        res.status(400).json({
          status: 'blocked',
          reportOnly: false,
          startsCrawler: false,
          startsWorker: false,
          writesBacklog: false,
          writesExternalSystems: false,
          decisionRecord,
          run,
          persistence,
          validation: persistence.validation,
          plainEnglish: 'The worker produced evidence, but persistence failed validation.',
        })
        return
      }

      res.json({
        status: 'completed_evidence_persisted',
        reportOnly: false,
        startsCrawler: false,
        startsWorker: true,
        writesBacklog: false,
        writesExternalSystems: false,
        decisionRecord,
        run,
        persistence,
        plainEnglish: 'The approved packet ran through the exact-page worker and saved status/evidence. Discovered links were recorded as separate source-packet candidates only.',
      })
    } catch (error) {
      sendApiError(
        res,
        500,
        'source_packet_worker_run_failed',
        error instanceof Error ? error.message : 'Failed to run approved source packet worker.'
      )
    }
  })

  app.post(EXTRACTOR_HANDS_PRODUCTION_RUNNER_ROUTE, requireAdminToken, async (req, res) => {
    try {
      const body = req.body || {}
      const actor = typeof getRequestActor === 'function' ? getRequestActor(req) : 'system'
      const decisionRecord = buildExtractorHandsProductionDecisionRecord({
        decisionRecord: body.decisionRecord,
        url: body.url,
        host: body.host,
        sourceVideoId: body.sourceVideoId,
        sourceUrl: body.sourceUrl,
        reportArtifactId: body.reportArtifactId,
        reason: body.reason,
        operatorNote: body.operatorNote,
        operatorAction: body.operatorAction || 'hold_packet',
        decision: body.decision,
        decidedBy: body.decidedBy || actor || 'Steve',
        decidedAt: body.decidedAt,
        packet: body.packet,
      })
      const run = await runExtractorHandsProductionRunner({
        decisionRecord,
        handsPolicy: body.handsPolicy || body.policy || null,
        html: body.html,
        fixturePages: body.fixturePages,
        afterHtml: body.afterHtml,
        mode: body.mode || 'synthetic_fixture',
        allowLive: body.allowLive === true,
        followLinks: body.followLinks === true,
        submitForms: body.submitForms === true,
        downloadFiles: body.downloadFiles === true,
        authSessionUsed: body.authSessionUsed === true,
        purchaseOrOptIn: body.purchaseOrOptIn === true,
        externalWrites: body.externalWrites === true,
        writesBacklog: body.writesBacklog === true,
      })

      if (!run.ok) {
        res.status(400).json({
          status: 'blocked',
          reportOnly: true,
          startsCrawler: false,
          startsWorker: false,
          writesBacklog: false,
          writesExternalSystems: false,
          decisionRecord,
          run,
          validation: run.validation,
          plainEnglish: 'The bounded Hands runner did not run. The packet, Hands policy, mode, or boundary failed validation.',
        })
        return
      }

      const persistence = await persistExtractorHandsProductionRun(run, {
        upsertSourceCrawlTarget,
        upsertSourceCrawlItem,
        upsertIntelligenceReportArtifact,
        actor,
      })
      if (!persistence.ok) {
        res.status(400).json({
          status: 'blocked',
          reportOnly: false,
          startsCrawler: false,
          startsWorker: false,
          writesBacklog: false,
          writesExternalSystems: false,
          decisionRecord,
          run,
          persistence,
          validation: persistence.validation,
          plainEnglish: 'The bounded Hands runner produced evidence, but persistence failed validation.',
        })
        return
      }

      res.json({
        status: 'completed_bounded_hands_evidence_persisted',
        reportOnly: false,
        startsCrawler: false,
        startsWorker: true,
        writesBacklog: false,
        writesExternalSystems: false,
        decisionRecord,
        run,
        persistence,
        plainEnglish: 'The approved packet ran through the bounded Hands runner and saved status/evidence. No broad crawl, login, form, download, purchase, external write, or backlog write happened.',
      })
    } catch (error) {
      sendApiError(
        res,
        500,
        'extractor_hands_production_run_failed',
        error instanceof Error ? error.message : 'Failed to run bounded Hands packet.'
      )
    }
  })

  app.get(SOURCE_PACKET_WORKER_QUEUE_ROUTE, requireAdminToken, async (_req, res) => {
    try {
      const [decisionItems, workerRunItems] = await Promise.all([
        listSourceCrawlItems({ targetKey: SOURCE_PACKET_APPROVAL_DECISION_TARGET_KEY, limit: 200, order: 'desc' }),
        listSourceCrawlItems({ targetKey: SOURCE_PACKET_WORKER_RUNNER_TARGET_KEY, limit: 200, order: 'desc' }),
      ])
      res.json(buildSourcePacketWorkerQueue({ decisionItems, workerRunItems }))
    } catch (error) {
      sendApiError(
        res,
        500,
        'source_packet_worker_queue_failed',
        error instanceof Error ? error.message : 'Failed to load source-packet worker queue.'
      )
    }
  })

  app.get(EXTRACTOR_HANDS_PRODUCTION_QUEUE_ROUTE, requireAdminToken, async (_req, res) => {
    try {
      const [decisionItems, handsRunItems] = await Promise.all([
        listSourceCrawlItems({ targetKey: SOURCE_PACKET_APPROVAL_DECISION_TARGET_KEY, limit: 200, order: 'desc' }),
        listSourceCrawlItems({ targetKey: EXTRACTOR_HANDS_PRODUCTION_RUNNER_TARGET_KEY, limit: 200, order: 'desc' }),
      ])
      res.json(buildExtractorHandsProductionQueue({ decisionItems, handsRunItems }))
    } catch (error) {
      sendApiError(
        res,
        500,
        'source_packet_hands_queue_failed',
        error instanceof Error ? error.message : 'Failed to load source-packet Hands queue.'
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
