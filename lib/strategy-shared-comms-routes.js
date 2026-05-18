import {
  ACTION_ROUTE_REVIEW_INBOX_API_PATH,
  buildActionRouteReviewInboxSnapshot,
} from './action-route-review-inbox.js'

export const STRATEGY_SHARED_COMMS_ROUTES_SPLIT_CARD_ID = 'STRATEGY-SHARED-COMMS-ROUTES-SPLIT-001'
export const STRATEGY_SHARED_COMMS_ROUTES_SPLIT_CLOSEOUT_KEY = 'strategy-shared-comms-routes-split-v1'
export const STRATEGY_SHARED_COMMS_ROUTES_SPLIT_PLAN_PATH = 'docs/process/strategy-shared-comms-routes-split-001-plan.md'
export const STRATEGY_SHARED_COMMS_ROUTES_SPLIT_APPROVAL_PATH = 'docs/process/approvals/STRATEGY-SHARED-COMMS-ROUTES-SPLIT-001.json'
export const STRATEGY_SHARED_COMMS_ROUTES_SPLIT_SCRIPT_PATH = 'scripts/process-strategy-shared-comms-routes-split-check.mjs'
export const STRATEGY_SHARED_COMMS_ROUTES_SPLIT_SPRINT_ID = 'foundation-server-monolith-closeout-2026-05-15'
export const STRATEGY_SHARED_COMMS_ROUTES_SPLIT_BEFORE_SERVER_LINES = 6115
export const STRATEGY_SHARED_COMMS_ROUTES_SPLIT_ROUTE_BUDGET_MS = 15000
export const STRATEGY_SHARED_COMMS_ROUTES_SPLIT_ROUTE_BUDGET_BYTES = 2_000_000

const MOVED_ROUTE_MARKERS = [
  "app.get('/api/shared-communications/archive'",
  "app.get('/api/shared-communications/coverage'",
  "app.get('/api/shared-communications/candidates'",
  "app.get('/api/shared-communications/synthesis'",
  "app.post('/api/shared-communications/candidates/:candidateKey/apply-to-backlog'",
  "app.post('/api/shared-communications/candidates/:candidateKey/apply-to-decision'",
  "app.post('/api/shared-communications/candidates/:candidateKey/apply-to-question'",
  "app.post('/api/shared-communications/candidates/:candidateKey/:action'",
  "app.get('/api/strategic-execution/prework-coverage'",
  "app.get('/api/strategic-execution/goal-truth'",
  "app.get('/api/strategic-execution/operating-truth'",
  "app.get('/api/strategic-execution/v2'",
  "app.get('/api/strategic-execution/action-routes'",
  "app.post('/api/strategic-execution/action-routes/:routeId/review'",
  "app.post('/api/strategic-execution/advisor'",
  "app.get('/api/foundation/action-review'",
  '/api/foundation/action-route-review-inbox',
  "app.post('/api/foundation/action-review/:routeId/review'",
]

const DIRECT_FOUNDATION_WRITE_MARKERS = [
  "app.post('/api/foundation/" + "backlog'",
  "app.patch('/api/foundation/" + "backlog/:id'",
  "app.post('/api/foundation/" + "decisions'",
  "app.patch('/api/foundation/" + "decisions/:id'",
  "app.post('/api/foundation/" + "questions'",
  "app.patch('/api/foundation/" + "questions/:id'",
]

function requireDependency(deps, key) {
  const value = deps[key]
  if (value === undefined || value === null) throw new Error(`registerStrategySharedCommsRoutes requires ${key}.`)
  return value
}

export function buildStrategySharedCommsRoutesSplitDogfoodProof({
  serverSource = '',
  moduleSource = '',
  proofScriptSource = '',
} = {}) {
  const healthy = {
    serverSource: [
      "import { registerStrategySharedCommsRoutes } from './lib/strategy-shared-comms-routes.js'",
      'registerStrategySharedCommsRoutes(app, {})',
      DIRECT_FOUNDATION_WRITE_MARKERS[0],
      DIRECT_FOUNDATION_WRITE_MARKERS[1],
    ].join('\n'),
    moduleSource: [
      'registerStrategySharedCommsRoutes',
      'buildStrategyHubV2Payload',
      'buildFoundationActionReviewSnapshot',
      ...MOVED_ROUTE_MARKERS,
    ].join(' '),
    proofScriptSource: 'live Strategy/shared communications route probes plus safe invalid POST probes without creating backlog decisions questions or applying routes',
  }

  const evaluate = fixture => {
    const nextServerSource = String(fixture.serverSource ?? serverSource)
    const nextModuleSource = String(fixture.moduleSource ?? moduleSource)
    const nextProofScriptSource = String(fixture.proofScriptSource ?? proofScriptSource)
    return MOVED_ROUTE_MARKERS.every(marker => nextModuleSource.includes(marker)) &&
      MOVED_ROUTE_MARKERS.every(marker => !nextServerSource.includes(marker)) &&
      nextServerSource.includes('registerStrategySharedCommsRoutes(app') &&
      DIRECT_FOUNDATION_WRITE_MARKERS.slice(0, 2).every(marker => nextServerSource.includes(marker)) &&
      DIRECT_FOUNDATION_WRITE_MARKERS.every(marker => !nextModuleSource.includes(marker)) &&
      nextModuleSource.includes('buildStrategyHubV2Payload') &&
      nextModuleSource.includes('buildFoundationActionReviewSnapshot') &&
      nextProofScriptSource.includes('safe invalid POST probes') &&
      nextProofScriptSource.includes('without creating backlog decisions questions or applying routes')
  }

  const passing = evaluate(healthy)
  const rejected = {
    missingModule: evaluate({ ...healthy, moduleSource: '' }) === false,
    oldInlineServer: evaluate({ ...healthy, serverSource: `${healthy.serverSource}\n${MOVED_ROUTE_MARKERS[0]}, requireAdminToken, async () => {})` }) === false,
    missingRegistrar: evaluate({ ...healthy, serverSource: DIRECT_FOUNDATION_WRITE_MARKERS[0] }) === false,
    foundationWriteLeak: evaluate({ ...healthy, moduleSource: `${healthy.moduleSource}\n${DIRECT_FOUNDATION_WRITE_MARKERS[0]}, requireAdminToken, async () => {})` }) === false,
    weakProof: evaluate({ ...healthy, proofScriptSource: 'route strings exist' }) === false,
  }

  return {
    ok: passing && Object.values(rejected).every(Boolean),
    passing,
    rejected,
    summary: 'Strategy/shared-comms route split dogfood accepts healthy module ownership and rejects missing module, old inline server ownership, missing registrar, direct Foundation write leakage, and weak proof.',
  }
}

export function registerStrategySharedCommsRoutes(app, deps = {}) {
  const requireAdminToken = requireDependency(deps, 'requireAdminToken')
  const sendApiError = requireDependency(deps, 'sendApiError')
  const cacheHeadersNoStore = requireDependency(deps, 'cacheHeadersNoStore')
  const getRequestActor = requireDependency(deps, 'getRequestActor')
  const getAllowedBodyKeys = requireDependency(deps, 'getAllowedBodyKeys')
  const validateCategory = requireDependency(deps, 'validateCategory')
  const optionalStringField = requireDependency(deps, 'optionalStringField')
  const optionalStringArrayField = requireDependency(deps, 'optionalStringArrayField')
  const getSharedCommunicationArchiveSnapshot = requireDependency(deps, 'getSharedCommunicationArchiveSnapshot')
  const getSharedCommunicationCoverageSnapshot = requireDependency(deps, 'getSharedCommunicationCoverageSnapshot')
  const getSharedCommunicationCandidateSnapshot = requireDependency(deps, 'getSharedCommunicationCandidateSnapshot')
  const getSharedCommunicationSynthesisSnapshot = requireDependency(deps, 'getSharedCommunicationSynthesisSnapshot')
  const applySharedCommunicationCandidateToBacklog = requireDependency(deps, 'applySharedCommunicationCandidateToBacklog')
  const applySharedCommunicationCandidateToDecision = requireDependency(deps, 'applySharedCommunicationCandidateToDecision')
  const applySharedCommunicationCandidateToQuestion = requireDependency(deps, 'applySharedCommunicationCandidateToQuestion')
  const updateSharedCommunicationCandidateStatus = requireDependency(deps, 'updateSharedCommunicationCandidateStatus')
  const getStrategyPreworkCoverageSnapshot = requireDependency(deps, 'getStrategyPreworkCoverageSnapshot')
  const getStrategyGoalTruthSnapshot = requireDependency(deps, 'getStrategyGoalTruthSnapshot')
  const getStrategyOperatingTruthSnapshot = requireDependency(deps, 'getStrategyOperatingTruthSnapshot')
  const getFoundationSnapshot = requireDependency(deps, 'getFoundationSnapshot')
  const getActionRouterSnapshot = requireDependency(deps, 'getActionRouterSnapshot')
  const getIntelligenceRetrievalSnapshot = requireDependency(deps, 'getIntelligenceRetrievalSnapshot')
  const saveStrategyHubSnapshot = requireDependency(deps, 'saveStrategyHubSnapshot')
  const getStrategyHubSnapshot = requireDependency(deps, 'getStrategyHubSnapshot')
  const buildStrategyMeetingReadySnapshot = requireDependency(deps, 'buildStrategyMeetingReadySnapshot')
  const isDecisionGradeActionRoute = requireDependency(deps, 'isDecisionGradeActionRoute')
  const isSynthesisRecordVerified = requireDependency(deps, 'isSynthesisRecordVerified')
  const getActionRoute = requireDependency(deps, 'getActionRoute')
  const approveActionRoute = requireDependency(deps, 'approveActionRoute')
  const applyApprovedActionRoute = requireDependency(deps, 'applyApprovedActionRoute')
  const rejectActionRoute = requireDependency(deps, 'rejectActionRoute')
  const rerouteActionRoute = requireDependency(deps, 'rerouteActionRoute')

  function isStrategyHubReviewRoute(route = {}) {
    const metadata = route.metadata && typeof route.metadata === 'object' ? route.metadata : {}
    const surface = String(
      metadata.strategySurface ||
      metadata.hubSurface ||
      metadata.reviewSurface ||
      ''
    ).toLowerCase()
    const strategyCandidate = metadata.strategyHubEligible === true ||
      surface === 'strategy' ||
      surface === 'strategy_hub' ||
      surface === 'strategic_execution'
    if (!strategyCandidate) return false
    if (!isDecisionGradeActionRoute(route)) return true
    return isSynthesisRecordVerified(route)
  }

  function buildStrategyHubV2Payload({ goalTruth, operatingTruth, actionRouter, retrieval, sourceTruthStatus = 'live', fallback = null }) {
    const allRoutes = Array.isArray(actionRouter.recentRoutes) ? actionRouter.recentRoutes : []
    const strategyRoutes = allRoutes.filter(isStrategyHubReviewRoute)
    const generatedAt = new Date().toISOString()
    const strategyActionRouter = {
      ...actionRouter,
      totalRoutes: strategyRoutes.length,
      pendingRoutes: strategyRoutes.filter(route => route.approvalStatus === 'pending').length,
      approvedRoutes: strategyRoutes.filter(route => route.approvalStatus === 'approved').length,
      appliedRoutes: strategyRoutes.filter(route => route.approvalStatus === 'applied').length,
      recentRoutes: strategyRoutes,
      operationalTotalRoutes: actionRouter.totalRoutes || allRoutes.length,
      hiddenOperationalRoutes: Math.max(0, Number(actionRouter.totalRoutes || allRoutes.length || 0) - strategyRoutes.length),
    }
    const meetingReady = buildStrategyMeetingReadySnapshot({
      goalTruth,
      operatingTruth,
      actionRouter: strategyActionRouter,
      retrieval,
      generatedAt,
    })
    return {
      generatedAt,
      mode: 'source_to_gap_route_review',
      advisorStatus: 'strategy_hub_v2_in_progress',
      sourceTruthStatus,
      fallback,
      goalTruth,
      operatingTruth,
      actionRouter: strategyActionRouter,
      meetingReady,
      retrievalEval: retrieval.latestEvalRun || null,
      operationalRouteSummary: {
        totalRoutes: actionRouter.totalRoutes || allRoutes.length,
        hiddenRoutes: strategyActionRouter.hiddenOperationalRoutes,
        visibilityRule: 'Strategy Hub only shows routes explicitly marked strategyHubEligible or routed to the strategy review surface.',
      },
      routeReview: {
        pendingRoutes: strategyActionRouter.pendingRoutes,
        approvedRoutes: strategyActionRouter.approvedRoutes,
        appliedRoutes: strategyActionRouter.appliedRoutes,
        recentRoutes: strategyRoutes,
      },
    }
  }

  const ACTION_REVIEW_AGED_ROUTE_DAYS = 3

  function getRouteAgeDays(route) {
    const timestamp = route?.routedAt || route?.createdAt || route?.updatedAt || ''
    const parsed = new Date(timestamp)
    if (Number.isNaN(parsed.getTime())) return null
    return Math.max(0, Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24)))
  }

  function actionReviewDestinationLabel(route) {
    const table = String(route?.destinationTable || '').trim()
    if (table === 'backlog_items') return 'Backlog work item'
    if (table === 'decisions') return 'Decision'
    if (table === 'open_questions') return 'Open question'
    if (table === 'intelligence_synthesized_items') {
      return route?.routeType === 'snooze' ? 'Snoozed finding' : 'Ignored finding'
    }
    return table || 'Destination record'
  }

  function buildFoundationActionReviewSnapshot(actionRouter) {
    const routes = (actionRouter?.recentRoutes || []).map(route => {
      const ageDays = getRouteAgeDays(route)
      const isAgedPending = route.approvalStatus === 'pending' &&
        ageDays !== null &&
        ageDays >= ACTION_REVIEW_AGED_ROUTE_DAYS
      return {
        ...route,
        actionReview: {
          ageDays,
          isAgedPending,
          destinationLabel: actionReviewDestinationLabel(route),
          plainStatus: route.approvalStatus === 'pending'
            ? 'Needs review'
            : route.approvalStatus === 'approved'
              ? 'Approved, ready to apply'
              : route.approvalStatus === 'applied'
                ? 'Applied to its destination'
                : route.approvalStatus === 'rejected'
                  ? 'Rejected by human review'
                  : String(route.approvalStatus || 'Unknown'),
        },
      }
    })
    const pendingRoutes = routes.filter(route => route.approvalStatus === 'pending')
    const approvedRoutes = routes.filter(route => route.approvalStatus === 'approved')
    const appliedRoutes = routes.filter(route => route.approvalStatus === 'applied')
    const rejectedRoutes = routes.filter(route => route.approvalStatus === 'rejected')
    const agedPendingRoutes = routes.filter(route => route.actionReview?.isAgedPending)
    return {
      generatedAt: new Date().toISOString(),
      visibleHome: 'Foundation > Backlog > Action Review',
      thresholds: {
        agedPendingDays: ACTION_REVIEW_AGED_ROUTE_DAYS,
      },
      summary: {
        totalRoutes: actionRouter?.totalRoutes || routes.length,
        pendingRoutes: pendingRoutes.length,
        approvedRoutes: approvedRoutes.length,
        appliedRoutes: appliedRoutes.length,
        rejectedRoutes: rejectedRoutes.length,
        agedPendingRoutes: agedPendingRoutes.length,
        appliedRoutesWithDestinationRecord: actionRouter?.appliedRoutesWithDestinationRecord || 0,
        routesRequiringApproval: actionRouter?.routesRequiringApproval || 0,
        routesWithSourceProvenance: actionRouter?.routesWithSourceProvenance || 0,
        routesByDestination: actionRouter?.routesByDestination || [],
        routesByType: actionRouter?.routesByType || [],
      },
      routes,
    }
  }

  function normalizeRouteOwnerInput(value) {
    const normalized = String(value || '').trim()
    if (!normalized || normalized === 'keep-current') return ''
    return normalized
  }

  function isNeedsOwnerQueueValue(value) {
    return String(value || '').trim() === 'needs-owner-decision'
  }

  function resolveSnoozeUntil(duration, customValue) {
    const custom = String(customValue || '').trim()
    if (custom) {
      const parsed = new Date(custom)
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
    }
    const now = new Date()
    const normalized = String(duration || '1w').trim()
    if (normalized === '1d') now.setDate(now.getDate() + 1)
    else if (normalized === '1m') now.setMonth(now.getMonth() + 1)
    else if (normalized === '1q') now.setMonth(now.getMonth() + 3)
    else now.setDate(now.getDate() + 7)
    return now.toISOString()
  }

  app.get('/api/shared-communications/archive', requireAdminToken, async (req, res) => {
    try {
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
      const sourceId = req.query.sourceId ? String(req.query.sourceId) : undefined
      const artifactType = req.query.artifactType ? String(req.query.artifactType) : undefined
      const archive = await getSharedCommunicationArchiveSnapshot({ sourceId, artifactType, limit, includeSensitive: true })
      cacheHeadersNoStore(res)
      res.json(archive)
    } catch (error) {
      sendApiError(
        res,
        500,
        'shared_communications_archive_failed',
        error instanceof Error ? error.message : 'Failed to load shared communications archive.'
      )
    }
  })

  app.get('/api/shared-communications/coverage', requireAdminToken, async (_req, res) => {
    try {
      const coverage = await getSharedCommunicationCoverageSnapshot()
      cacheHeadersNoStore(res)
      res.json(coverage)
    } catch (error) {
      sendApiError(
        res,
        500,
        'shared_communications_coverage_failed',
        error instanceof Error ? error.message : 'Failed to load shared communications coverage.'
      )
    }
  })

  app.get('/api/shared-communications/candidates', requireAdminToken, async (req, res) => {
    try {
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
      const sourceId = req.query.sourceId ? String(req.query.sourceId) : undefined
      const candidateType = req.query.candidateType ? String(req.query.candidateType) : undefined
      const status = req.query.status ? String(req.query.status) : undefined
      const candidates = await getSharedCommunicationCandidateSnapshot({
        sourceId,
        candidateType,
        status,
        limit,
        includeItems: true,
      })
      cacheHeadersNoStore(res)
      res.json(candidates)
    } catch (error) {
      sendApiError(
        res,
        500,
        'shared_communications_candidates_failed',
        error instanceof Error ? error.message : 'Failed to load shared communications candidates.'
      )
    }
  })

  app.get('/api/shared-communications/synthesis', requireAdminToken, async (req, res) => {
    try {
      const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 3))
      const itemLimit = Math.min(100, Math.max(1, Number(req.query.itemLimit) || 20))
      const packetType = req.query.packetType ? String(req.query.packetType) : ''
      const synthesis = await getSharedCommunicationSynthesisSnapshot({ limit, itemLimit, packetType })
      cacheHeadersNoStore(res)
      res.json(synthesis)
    } catch (error) {
      sendApiError(
        res,
        500,
        'shared_communications_synthesis_failed',
        error instanceof Error ? error.message : 'Failed to load shared communications synthesis.'
      )
    }
  })

  app.get('/api/strategic-execution/prework-coverage', requireAdminToken, async (_req, res) => {
    try {
      const coverage = await getStrategyPreworkCoverageSnapshot()
      cacheHeadersNoStore(res)
      res.json(coverage)
    } catch (error) {
      sendApiError(
        res,
        500,
        'strategy_prework_coverage_failed',
        error instanceof Error ? error.message : 'Failed to load strategy pre-work coverage.'
      )
    }
  })

  app.get('/api/strategic-execution/goal-truth', requireAdminToken, async (_req, res) => {
    try {
      const goalTruth = await getStrategyGoalTruthSnapshot()
      cacheHeadersNoStore(res)
      res.json(goalTruth)
    } catch (error) {
      sendApiError(
        res,
        500,
        'strategy_goal_truth_failed',
        error instanceof Error ? error.message : 'Failed to load strategy goal truth.'
      )
    }
  })

  app.get('/api/strategic-execution/operating-truth', requireAdminToken, async (_req, res) => {
    try {
      const operatingTruth = await getStrategyOperatingTruthSnapshot()
      cacheHeadersNoStore(res)
      res.json(operatingTruth)
    } catch (error) {
      sendApiError(
        res,
        500,
        'strategy_operating_truth_failed',
        error instanceof Error ? error.message : 'Failed to load strategy operating truth.'
      )
    }
  })

  app.get('/api/strategic-execution/v2', requireAdminToken, async (req, res) => {
    try {
      const [goalTruth, operatingTruth, actionRouter, retrieval] = await Promise.all([
        getStrategyGoalTruthSnapshot(),
        getStrategyOperatingTruthSnapshot(),
        getActionRouterSnapshot({ limit: 50 }),
        getIntelligenceRetrievalSnapshot({ limit: 20 }),
      ])
      const payload = buildStrategyHubV2Payload({ goalTruth, operatingTruth, actionRouter, retrieval })
      try {
        await saveStrategyHubSnapshot({
          snapshotKey: 'source_to_gap_route_review',
          payload,
          sourceStatus: 'live',
          generatedAt: payload.generatedAt,
        }, getRequestActor(req))
      } catch (snapshotError) {
        console.warn(`Strategy Hub v2 last-known-good snapshot save failed: ${snapshotError instanceof Error ? snapshotError.message : String(snapshotError)}`)
      }
      cacheHeadersNoStore(res)
      res.json(payload)
    } catch (error) {
      let fallbackSnapshot = null
      try {
        fallbackSnapshot = await getStrategyHubSnapshot('source_to_gap_route_review')
      } catch (snapshotError) {
        console.warn(`Strategy Hub v2 last-known-good snapshot read failed: ${snapshotError instanceof Error ? snapshotError.message : String(snapshotError)}`)
      }
      if (fallbackSnapshot?.payload) {
        cacheHeadersNoStore(res)
        res.json({
          ...fallbackSnapshot.payload,
          generatedAt: new Date().toISOString(),
          sourceTruthStatus: 'degraded',
          fallback: {
            reason: error instanceof Error ? error.message : 'Strategy Hub source read failed.',
            lastKnownGoodAt: fallbackSnapshot.generatedAt || fallbackSnapshot.updatedAt,
            snapshotKey: fallbackSnapshot.snapshotKey,
          },
        })
        return
      }
      sendApiError(
        res,
        500,
        'strategy_hub_v2_failed',
        error instanceof Error ? error.message : 'Failed to load Strategy Hub v2 source-to-gap snapshot.'
      )
    }
  })

  app.get('/api/strategic-execution/action-routes', requireAdminToken, async (_req, res) => {
    try {
      const actionRouter = await getActionRouterSnapshot({ limit: 50 })
      cacheHeadersNoStore(res)
      res.json(actionRouter)
    } catch (error) {
      sendApiError(
        res,
        500,
        'strategy_action_routes_failed',
        error instanceof Error ? error.message : 'Failed to load Strategy Hub action routes.'
      )
    }
  })

  app.get('/api/foundation/action-review', requireAdminToken, async (_req, res) => {
    try {
      const actionRouter = await getActionRouterSnapshot({ limit: 100 })
      cacheHeadersNoStore(res)
      res.json(buildFoundationActionReviewSnapshot(actionRouter))
    } catch (error) {
      sendApiError(
        res,
        500,
        'foundation_action_review_failed',
        error instanceof Error ? error.message : 'Failed to load Foundation Action Review.'
      )
    }
  })

  app.get(ACTION_ROUTE_REVIEW_INBOX_API_PATH, requireAdminToken, async (_req, res) => {
    try {
      const [actionRouter, foundationSnapshot] = await Promise.all([
        getActionRouterSnapshot({ limit: 100 }),
        getFoundationSnapshot(),
      ])
      cacheHeadersNoStore(res)
      res.json(buildActionRouteReviewInboxSnapshot({
        actionRouter,
        backlogItems: foundationSnapshot.backlogItems || [],
      }))
    } catch (error) {
      sendApiError(
        res,
        500,
        'action_route_review_inbox_failed',
        error instanceof Error ? error.message : 'Failed to load Action Route Review Inbox.'
      )
    }
  })

  app.post('/api/strategic-execution/action-routes/:routeId/review', requireAdminToken, async (req, res) => {
    try {
      const routeId = String(req.params.routeId || '').trim()
      const action = String(req.body?.action || '').trim()
      const note = String(req.body?.note || '').trim()
      const actor = getRequestActor(req)
      const approvedBy = String(req.body?.approvedBy || req.body?.approved_by || actor).trim()
      const selectedOwner = normalizeRouteOwnerInput(req.body?.owner || req.body?.selectedOwner || req.body?.selected_owner)
      const concreteSelectedOwner = selectedOwner && !isNeedsOwnerQueueValue(selectedOwner) ? selectedOwner : ''
      const snoozeDuration = String(req.body?.snoozeDuration || req.body?.snooze_duration || '').trim()
      const snoozeUntil = resolveSnoozeUntil(snoozeDuration, req.body?.snoozeUntil || req.body?.snooze_until)
      let route = await getActionRoute(routeId)
      if (!route) {
        sendApiError(res, 404, 'action_route_not_found', `Action route not found: ${routeId}`)
        return
      }

      if (action === 'approve_apply') {
        if (
          route.approvalStatus === 'pending' &&
          concreteSelectedOwner &&
          concreteSelectedOwner !== route.owner
        ) {
          route = await rerouteActionRoute(routeId, {
            routeType: route.routeType,
            owner: concreteSelectedOwner,
            ownerConfidence: 'high',
            note: note || `Human review assigned owner ${concreteSelectedOwner}.`,
          }, actor)
        }
        if (route.approvalStatus === 'pending') {
          route = await approveActionRoute(routeId, { approvedBy, approvalNote: note }, actor)
        }
        if (route.approvalStatus === 'approved') {
          route = await applyApprovedActionRoute(routeId, { applyNote: note }, actor)
        } else if (route.approvalStatus !== 'applied') {
          sendApiError(res, 409, 'action_route_not_approvable', `Action route cannot be approved/applied from status ${route.approvalStatus}.`)
          return
        }
      } else if (action === 'reject') {
        if (!['pending', 'approved'].includes(route.approvalStatus)) {
          sendApiError(res, 409, 'action_route_not_rejectable', `Action route cannot be rejected from status ${route.approvalStatus}.`)
          return
        }
        route = await rejectActionRoute(routeId, { rejectedBy: approvedBy, rejectionNote: note }, actor)
      } else if (action === 'needs_owner') {
        if (concreteSelectedOwner) {
          route = await rerouteActionRoute(routeId, {
            routeType: route.routeType,
            owner: concreteSelectedOwner,
            ownerConfidence: 'high',
            note: note || `Human review assigned owner ${concreteSelectedOwner}.`,
          }, actor)
        } else {
          route = await rerouteActionRoute(routeId, {
            routeType: 'needs_owner_decision',
            note: note || 'Human review requested owner assignment before this route becomes work.',
          }, actor)
        }
        route = await approveActionRoute(routeId, { approvedBy, approvalNote: note }, actor)
        route = await applyApprovedActionRoute(routeId, { applyNote: note }, actor)
      } else if (action === 'ignore' || action === 'snooze') {
        route = await rerouteActionRoute(routeId, {
          routeType: action,
          snoozeDuration: action === 'snooze' ? (snoozeDuration || '1w') : '',
          snoozeUntil: action === 'snooze' ? snoozeUntil : '',
          note: note || `Human review marked this route as ${action}.`,
        }, actor)
        route = await approveActionRoute(routeId, { approvedBy, approvalNote: note }, actor)
        route = await applyApprovedActionRoute(routeId, { applyNote: note }, actor)
      } else {
        sendApiError(res, 400, 'unsupported_route_review_action', 'Supported actions: approve_apply, reject, needs_owner, ignore, snooze.')
        return
      }

      const actionRouter = await getActionRouterSnapshot({ limit: 50 })
      cacheHeadersNoStore(res)
      res.json({ route, actionRouter })
    } catch (error) {
      sendApiError(
        res,
        500,
        'strategy_action_route_review_failed',
        error instanceof Error ? error.message : 'Failed to review Strategy Hub action route.'
      )
    }
  })

  app.post('/api/foundation/action-review/:routeId/review', requireAdminToken, async (req, res) => {
    try {
      const routeId = String(req.params.routeId || '').trim()
      const action = String(req.body?.action || '').trim()
      const note = String(req.body?.note || '').trim()
      const actor = getRequestActor(req)
      const reviewedBy = String(req.body?.reviewedBy || req.body?.approvedBy || req.body?.approved_by || actor).trim()
      let route = await getActionRoute(routeId)
      if (!route) {
        sendApiError(res, 404, 'action_route_not_found', `Action route not found: ${routeId}`)
        return
      }

      if (action === 'approve') {
        if (route.approvalStatus !== 'pending') {
          sendApiError(res, 409, 'action_route_not_approvable', `Action route must be pending before approval. Current status: ${route.approvalStatus}.`)
          return
        }
        route = await approveActionRoute(routeId, { approvedBy: reviewedBy, approvalNote: note }, actor)
      } else if (action === 'apply') {
        if (route.approvalStatus !== 'approved') {
          sendApiError(res, 409, 'action_route_not_applicable', `Action route must be approved before apply. Current status: ${route.approvalStatus}.`)
          return
        }
        route = await applyApprovedActionRoute(routeId, { applyNote: note }, actor)
      } else if (action === 'reject') {
        if (!note) {
          sendApiError(res, 400, 'action_route_reject_reason_required', 'Reject needs a reason so the finding is not silently lost.')
          return
        }
        if (!['pending', 'approved'].includes(route.approvalStatus)) {
          sendApiError(res, 409, 'action_route_not_rejectable', `Action route cannot be rejected from status ${route.approvalStatus}.`)
          return
        }
        route = await rejectActionRoute(routeId, { rejectedBy: reviewedBy, rejectionNote: note }, actor)
      } else {
        sendApiError(res, 400, 'unsupported_action_review_action', 'Supported actions: approve, apply, reject.')
        return
      }

      const actionRouter = await getActionRouterSnapshot({ limit: 100 })
      cacheHeadersNoStore(res)
      res.json({ route, actionReview: buildFoundationActionReviewSnapshot(actionRouter) })
    } catch (error) {
      sendApiError(
        res,
        500,
        'foundation_action_review_mutation_failed',
        error instanceof Error ? error.message : 'Failed to update Foundation Action Review route.'
      )
    }
  })

  app.post('/api/strategic-execution/advisor', requireAdminToken, async (_req, res) => {
    cacheHeadersNoStore(res)
    sendApiError(
      res,
      423,
      'strategy_hub_v2_in_progress',
      'Strategy Advisor is offline while Strategy Hub v2 rebuilds deterministic source snapshots, memory/retrieval, synthesis facts, and action routing.'
    )
  })

  app.post('/api/shared-communications/candidates/:candidateKey/apply-to-backlog', requireAdminToken, async (req, res) => {
    try {
      const payload =
        req.body && typeof req.body === 'object' && !Array.isArray(req.body)
          ? req.body
          : {}

      const result = await applySharedCommunicationCandidateToBacklog(
        String(req.params.candidateKey),
        payload,
        getRequestActor(req),
      )

      cacheHeadersNoStore(res)
      res.json(result)
    } catch (error) {
      sendApiError(
        res,
        500,
        'shared_communications_candidate_apply_to_backlog_failed',
        error instanceof Error ? error.message : 'Failed to apply shared communications candidate to backlog.'
      )
    }
  })

  app.post('/api/shared-communications/candidates/:candidateKey/apply-to-decision', requireAdminToken, async (req, res) => {
    const allowedKeys = ['title', 'summary', 'category', 'rationale', 'sourceRef', 'supersedesIds', 'decisionOwner', 'confirmedBy', 'participantNames', 'contextRef', 'evidenceNotes']
    const unknownFields = getAllowedBodyKeys(req.body, allowedKeys)
    if (unknownFields.length) {
      sendApiError(res, 400, 'invalid_decision_body', 'Unknown decision fields.', { unknownFields })
      return
    }

    const errors = {}
    if ('category' in req.body && req.body.category && !validateCategory(req.body.category)) {
      errors.category = 'Choose one of the four canonical decision categories.'
    }
    if ('supersedesIds' in req.body && !Array.isArray(req.body.supersedesIds)) {
      errors.supersedesIds = 'supersedesIds must be an array of decision IDs.'
    }

    const rationale = Object.prototype.hasOwnProperty.call(req.body, 'rationale')
      ? optionalStringField(errors, req.body, 'rationale', 'Rationale')
      : undefined
    const sourceRef = Object.prototype.hasOwnProperty.call(req.body, 'sourceRef')
      ? optionalStringField(errors, req.body, 'sourceRef', 'Source reference')
      : undefined
    const decisionOwner = Object.prototype.hasOwnProperty.call(req.body, 'decisionOwner')
      ? optionalStringField(errors, req.body, 'decisionOwner', 'Decision owner', 120)
      : undefined
    const confirmedBy = Object.prototype.hasOwnProperty.call(req.body, 'confirmedBy')
      ? optionalStringField(errors, req.body, 'confirmedBy', 'Confirmed by', 120)
      : undefined
    const participantNames = Object.prototype.hasOwnProperty.call(req.body, 'participantNames')
      ? optionalStringArrayField(errors, req.body, 'participantNames', 'Participants')
      : undefined
    const contextRef = Object.prototype.hasOwnProperty.call(req.body, 'contextRef')
      ? optionalStringField(errors, req.body, 'contextRef', 'Context reference', 500)
      : undefined
    const evidenceNotes = Object.prototype.hasOwnProperty.call(req.body, 'evidenceNotes')
      ? optionalStringField(errors, req.body, 'evidenceNotes', 'Evidence notes', 4000)
      : undefined
    const title = Object.prototype.hasOwnProperty.call(req.body, 'title')
      ? optionalStringField(errors, req.body, 'title', 'Title', 200)
      : undefined
    const summary = Object.prototype.hasOwnProperty.call(req.body, 'summary')
      ? optionalStringField(errors, req.body, 'summary', 'Summary', 4000)
      : undefined

    if (Object.keys(errors).length) {
      sendApiError(res, 400, 'invalid_decision_body', 'Decision candidate apply payload is not valid.', { fields: errors })
      return
    }

    try {
      const result = await applySharedCommunicationCandidateToDecision(
        String(req.params.candidateKey),
        {
          ...(title !== undefined ? { title } : {}),
          ...(summary !== undefined ? { summary } : {}),
          ...(req.body.category ? { category: req.body.category } : {}),
          ...(rationale !== undefined ? { rationale } : {}),
          ...(sourceRef !== undefined ? { sourceRef } : {}),
          ...(Array.isArray(req.body.supersedesIds) ? { supersedesIds: req.body.supersedesIds } : {}),
          ...(decisionOwner !== undefined ? { decisionOwner } : {}),
          ...(confirmedBy !== undefined ? { confirmedBy } : {}),
          ...(participantNames !== undefined ? { participantNames } : {}),
          ...(contextRef !== undefined ? { contextRef } : {}),
          ...(evidenceNotes !== undefined ? { evidenceNotes } : {}),
        },
        getRequestActor(req),
      )

      cacheHeadersNoStore(res)
      res.json(result)
    } catch (error) {
      sendApiError(
        res,
        500,
        'shared_communications_candidate_apply_to_decision_failed',
        error instanceof Error ? error.message : 'Failed to apply shared communications candidate to a decision.'
      )
    }
  })

  app.post('/api/shared-communications/candidates/:candidateKey/apply-to-question', requireAdminToken, async (req, res) => {
    const allowedKeys = ['title', 'summary', 'owner']
    const unknownFields = getAllowedBodyKeys(req.body, allowedKeys)
    if (unknownFields.length) {
      sendApiError(res, 400, 'invalid_question_body', 'Unknown question fields.', { unknownFields })
      return
    }

    const errors = {}
    const title = Object.prototype.hasOwnProperty.call(req.body, 'title')
      ? optionalStringField(errors, req.body, 'title', 'Title', 200)
      : undefined
    const summary = Object.prototype.hasOwnProperty.call(req.body, 'summary')
      ? optionalStringField(errors, req.body, 'summary', 'Summary', 4000)
      : undefined
    const owner = Object.prototype.hasOwnProperty.call(req.body, 'owner')
      ? optionalStringField(errors, req.body, 'owner', 'Owner', 120)
      : undefined

    if (Object.keys(errors).length) {
      sendApiError(res, 400, 'invalid_question_body', 'Question candidate apply payload is not valid.', { fields: errors })
      return
    }

    try {
      const result = await applySharedCommunicationCandidateToQuestion(
        String(req.params.candidateKey),
        {
          ...(title !== undefined ? { title } : {}),
          ...(summary !== undefined ? { summary } : {}),
          ...(owner !== undefined ? { owner } : {}),
        },
        getRequestActor(req),
      )

      cacheHeadersNoStore(res)
      res.json(result)
    } catch (error) {
      sendApiError(
        res,
        500,
        'shared_communications_candidate_apply_to_question_failed',
        error instanceof Error ? error.message : 'Failed to apply shared communications candidate to an open question.'
      )
    }
  })

  app.post('/api/shared-communications/candidates/:candidateKey/:action', requireAdminToken, async (req, res) => {
    try {
      const action = String(req.params.action || '').trim().toLowerCase()
      const statusByAction = {
        approve: 'approved',
        reject: 'rejected',
        duplicate: 'duplicate',
        reset: 'pending',
      }
      const nextStatus = statusByAction[action]
      if (!nextStatus) {
        sendApiError(res, 400, 'shared_communications_candidate_action_invalid', `Unsupported action: ${action}`)
        return
      }

      const metadataPatch =
        req.body && typeof req.body === 'object' && !Array.isArray(req.body)
          ? req.body
          : {}

      const candidate = await updateSharedCommunicationCandidateStatus(
        String(req.params.candidateKey),
        nextStatus,
        getRequestActor(req),
        metadataPatch,
      )

      cacheHeadersNoStore(res)
      res.json({ candidate })
    } catch (error) {
      sendApiError(
        res,
        500,
        'shared_communications_candidate_action_failed',
        error instanceof Error ? error.message : 'Failed to update shared communications candidate status.'
      )
    }
  })
}
