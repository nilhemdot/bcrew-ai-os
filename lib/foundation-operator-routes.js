import path from 'node:path'

export function registerFoundationOperatorRoutes(app, deps = {}) {
  const {
    requireAdminToken,
    sendApiError,
    cacheHeadersNoStore,
    getRecentChangeEvents,
    getRecentBuildLog,
    getFoundationSnapshot,
    getBacklogItemsByIds,
    listPendingDocUpdates,
    buildBacklogHygieneSnapshot,
    getFoundationBuildCloseouts,
    buildFoundationReviewSprintStatus,
    loadFoundationReviewSprintArtifact,
    buildResearchCurationStatus,
    buildFoundationChangeLog,
    buildFoundationDailyExecSummary,
    summarizeFoundationBuildLog,
    groupFoundationBuildLog,
    FOUNDATION_BUILD_CLOSEOUT_SCHEMA_VERSION,
    validateFoundationBacklogCardId,
    buildFoundationBacklogDetailPayload,
    readFileSafe,
    repoRoot,
  } = deps

  app.get('/api/foundation/changes', requireAdminToken, async (req, res) => {
    try {
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
      const changes = await getRecentChangeEvents(limit)
      res.json({ changes })
    } catch (error) {
      sendApiError(
        res,
        500,
        'foundation_changes_load_failed',
        error instanceof Error ? error.message : 'Failed to load recent changes.'
      )
    }
  })

  app.get('/api/foundation/change-log', requireAdminToken, async (req, res) => {
    try {
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100))
      const [builds, changeEvents] = await Promise.all([
        getRecentBuildLog(240),
        getRecentChangeEvents(Math.max(100, limit)),
      ])
      const changeLog = buildFoundationChangeLog({
        builds,
        changeEvents,
        limit,
      })
      cacheHeadersNoStore(res)
      res.json(changeLog)
    } catch (error) {
      sendApiError(
        res,
        500,
        'foundation_change_log_load_failed',
        error instanceof Error ? error.message : 'Failed to load Foundation change log.'
      )
    }
  })

  app.get('/api/foundation/daily-summary', requireAdminToken, async (req, res) => {
    try {
      const days = Math.min(14, Math.max(1, Number(req.query.days) || 7))
      const selectedDate = String(req.query.date || '').trim()
      const [snapshot, builds, changeEvents] = await Promise.all([
        getFoundationSnapshot(),
        getRecentBuildLog(240),
        getRecentChangeEvents(100),
      ])
      const backlogHygiene = buildBacklogHygieneSnapshot({
        backlogItems: snapshot.backlogItems || [],
        closeouts: getFoundationBuildCloseouts(),
      })
      const foundation1100Review = buildFoundationReviewSprintStatus({
        artifact: await loadFoundationReviewSprintArtifact({ repoRoot }),
        backlogItems: snapshot.backlogItems || [],
        actionRouter: snapshot.intelligenceActionRouter || {},
        hygiene: backlogHygiene,
      })
      const researchCuration = buildResearchCurationStatus({
        backlogItems: snapshot.backlogItems || [],
        foundationReviewSprint: foundation1100Review,
      })
      const foundationHub = {
        ...snapshot,
        backlogHygiene,
        foundation1100Review,
        researchCuration,
      }
      const changeLog = buildFoundationChangeLog({
        builds,
        changeEvents,
        limit: 100,
      })
      const dailySummary = buildFoundationDailyExecSummary({
        selectedDate,
        days,
        builds,
        changeLog,
        foundationHub,
        currentPlanText: readFileSafe(path.join(repoRoot, 'docs/rebuild/current-plan.md')) || '',
        currentStateText: readFileSafe(path.join(repoRoot, 'docs/rebuild/current-state.md')) || '',
      })
      cacheHeadersNoStore(res)
      res.json(dailySummary)
    } catch (error) {
      sendApiError(
        res,
        500,
        'foundation_daily_summary_load_failed',
        error instanceof Error ? error.message : 'Failed to load Foundation daily summary.'
      )
    }
  })

  app.get('/api/foundation/build-log', requireAdminToken, async (req, res) => {
    try {
      const limit = Math.min(240, Math.max(1, Number(req.query.limit) || 30))
      const builds = await getRecentBuildLog(limit)
      res.json({
        generatedAt: new Date().toISOString(),
        source: 'git log on main',
        schemaVersion: FOUNDATION_BUILD_CLOSEOUT_SCHEMA_VERSION,
        summary: summarizeFoundationBuildLog(builds),
        groups: groupFoundationBuildLog(builds),
        builds,
      })
    } catch (error) {
      sendApiError(
        res,
        500,
        'foundation_build_log_load_failed',
        error instanceof Error ? error.message : 'Failed to load recent build log.'
      )
    }
  })

  app.get('/api/foundation/backlog/:cardId', requireAdminToken, async (req, res) => {
    try {
      const validation = validateFoundationBacklogCardId(req.params.cardId)
      if (!validation.ok) {
        sendApiError(res, 400, 'foundation_backlog_card_id_invalid', 'Backlog card ID is malformed.')
        return
      }
      const backlogItems = await getBacklogItemsByIds([validation.cardId])
      const payload = buildFoundationBacklogDetailPayload({
        cardId: validation.cardId,
        backlogItems,
      })
      if (payload.httpStatus === 404) {
        sendApiError(res, 404, 'foundation_backlog_card_not_found', `Backlog card ${validation.cardId} was not found.`)
        return
      }
      cacheHeadersNoStore(res)
      res.json(payload)
    } catch (error) {
      sendApiError(
        res,
        500,
        'foundation_backlog_detail_failed',
        error instanceof Error ? error.message : 'Failed to load backlog card detail.'
      )
    }
  })

  app.get('/api/foundation/doc-updates', requireAdminToken, async (_req, res) => {
    try {
      const docUpdates = await listPendingDocUpdates()
      res.json({ docUpdates })
    } catch (error) {
      sendApiError(
        res,
        500,
        'doc_updates_load_failed',
        error instanceof Error ? error.message : 'Failed to load pending doc updates.'
      )
    }
  })
}
