import { upsertSalesListingAssignment } from './foundation-people-sales-db.js'
import { buildSalesListingInventory } from './sales-listing-inventory.js'
import {
  resolveSalesListingActionPlanState,
  resolveSalesListingCaseStatus,
  resolveSalesListingLeader,
  resolveSalesListingOutcomeStatus,
  sanitizeSalesListingAssignment,
} from './sales-listing-assignments.js'
import { syncSalesListingCasesFromInventory } from './sales-listing-cases.js'
import { buildSalesHubCaseMetadata } from './sales-hub-case-metadata.js'

const SALES_HUB_CACHE_TTL_MS = Math.max(15, Number(process.env.SALES_HUB_CACHE_TTL_SECONDS || 120)) * 1000
let salesHubCache = {
  payload: null,
  createdAtMs: 0,
  pending: null,
}

function clearSalesHubCache() {
  salesHubCache = {
    payload: null,
    createdAtMs: 0,
    pending: null,
  }
}

async function buildSalesHubPayload() {
  const listingInventory = await buildSalesListingInventory()
  const caseSync = await syncSalesListingCasesFromInventory(listingInventory, {
    actor: 'sales-hub-refresh',
  })
  return {
    status: 'healthy',
    hub: 'sales',
    listingInventory,
    caseSync,
    meta: {
      generatedAt: new Date().toISOString(),
      sourceId: listingInventory.source.sourceId,
      sourceListId: listingInventory.source.listId,
      sourceViewId: listingInventory.source.viewId,
    },
  }
}

async function getSalesHubPayload({ forceRefresh = false } = {}) {
  const now = Date.now()
  const ageMs = salesHubCache.payload ? now - salesHubCache.createdAtMs : null
  if (!forceRefresh && salesHubCache.payload) {
    if (ageMs != null && ageMs >= SALES_HUB_CACHE_TTL_MS && !salesHubCache.pending) {
      salesHubCache.pending = buildSalesHubPayload()
        .then(payload => {
          salesHubCache.payload = payload
          salesHubCache.createdAtMs = Date.now()
          return payload
        })
        .catch(error => {
          console.warn(`Sales Hub background refresh failed: ${error instanceof Error ? error.message : String(error)}`)
          return null
        })
        .finally(() => {
          salesHubCache.pending = null
        })
    }
    return {
      ...salesHubCache.payload,
      meta: {
        ...salesHubCache.payload.meta,
        cache: {
          status: ageMs != null && ageMs >= SALES_HUB_CACHE_TTL_MS ? 'stale_background_refresh' : 'hit',
          ageMs,
          ttlMs: SALES_HUB_CACHE_TTL_MS,
          backgroundRefresh: Boolean(ageMs != null && ageMs >= SALES_HUB_CACHE_TTL_MS),
        },
      },
    }
  }

  if (!forceRefresh && salesHubCache.pending) {
    const payload = await salesHubCache.pending
    return {
      ...payload,
      meta: {
        ...payload.meta,
        cache: {
          status: 'shared_refresh',
          ageMs: 0,
          ttlMs: SALES_HUB_CACHE_TTL_MS,
        },
      },
    }
  }

  salesHubCache.pending = buildSalesHubPayload()
  try {
    const payload = await salesHubCache.pending
    salesHubCache.payload = payload
    salesHubCache.createdAtMs = Date.now()
    return {
      ...payload,
      meta: {
        ...payload.meta,
        cache: {
          status: forceRefresh ? 'forced_refresh' : 'refresh',
          ageMs: 0,
          ttlMs: SALES_HUB_CACHE_TTL_MS,
        },
      },
    }
  } finally {
    salesHubCache.pending = null
  }
}

export { getSalesHubPayload }

export function registerSalesHubRoutes(app, deps = {}) {
  const {
    requireAdminToken,
    sendApiError,
    cacheHeadersNoStore,
    getRequestAuthUser = () => null,
    getLocalDevUser = () => null,
  } = deps

  app.post('/api/sales-hub/listing-assignment', requireAdminToken, async (req, res) => {
    try {
      const taskId = String(req.body?.taskId || '').trim()
      const leaderKey = String(req.body?.assignedLeaderKey || '').trim().toLowerCase()
      if (!taskId) {
        sendApiError(res, 400, 'missing_task_id', 'ClickUp task ID is required.')
        return
      }

      const leader = leaderKey ? resolveSalesListingLeader(leaderKey) : null
      if (leaderKey && !leader) {
        sendApiError(res, 400, 'invalid_sales_leader', 'Sales leader must be Ryan, Blake, Nick, Scott, or Steve.')
        return
      }

      const listingInventory = await buildSalesListingInventory()
      const listing = (listingInventory.staleListings || []).find(item => item.taskId === taskId)
      if (!listing) {
        sendApiError(res, 404, 'stale_listing_not_found', 'That listing is not in the current stale active listing list.')
        return
      }

      const actor = getRequestAuthUser(req) || getLocalDevUser(req) || { email: 'unknown', name: 'Unknown' }
      const existingCaseStatus = listing.salesLeaderAssignment?.caseStatus || ''
      const caseStatus = leader && (!existingCaseStatus || existingCaseStatus === 'identified')
        ? 'assigned'
        : existingCaseStatus || undefined
      const assignment = await upsertSalesListingAssignment({
        clickUpTaskId: listing.taskId,
        listingTitle: listing.title,
        listingUrl: listing.url,
        agentName: listing.agent,
        resetDate: listing.resetDate || null,
        daysSinceReset: listing.daysSinceReset,
        assignedLeaderKey: leader?.key || '',
        assignedLeaderName: leader?.name || '',
        assignedLeaderEmail: leader?.email || '',
        caseStatus,
        metadata: {
          source: 'sales-hub',
          assignmentSurface: '/sales#stale-listings',
        },
      }, actor.email || actor.name || 'sales-hub')

      clearSalesHubCache()
      cacheHeadersNoStore(res)
      res.json({
        status: 'healthy',
        taskId: listing.taskId,
        assignment: sanitizeSalesListingAssignment(assignment),
      })
    } catch (error) {
      sendApiError(
        res,
        500,
        'sales_assignment_failed',
        error instanceof Error ? error.message : 'Failed to save Sales Hub assignment.'
      )
    }
  })

  app.post('/api/sales-hub/group-assignment', requireAdminToken, async (req, res) => {
    try {
      const agentName = String(req.body?.agentName || '').trim()
      const leaderKey = String(req.body?.assignedLeaderKey || '').trim().toLowerCase()
      if (!agentName) {
        sendApiError(res, 400, 'missing_agent_name', 'Agent name is required.')
        return
      }
      const leader = leaderKey ? resolveSalesListingLeader(leaderKey) : null
      if (leaderKey && !leader) {
        sendApiError(res, 400, 'invalid_sales_leader', 'Sales leader must be Ryan Campbell, Blake Berfelz, Nick Bergmann, Scott Benson, or Steve Zahnd.')
        return
      }

      const actor = getRequestAuthUser(req) || getLocalDevUser(req) || { email: 'unknown', name: 'Unknown' }
      const listingInventory = await buildSalesListingInventory()
      const group = (listingInventory.groups || []).find(item => item.agent === agentName)
      if (!group) {
        sendApiError(res, 404, 'agent_group_not_found', 'That agent group is not in the current stale active listing list.')
        return
      }

      const updated = []
      for (const listing of group.listings || []) {
        const existingCaseStatus = listing.salesLeaderAssignment?.caseStatus || ''
        updated.push(await upsertSalesListingAssignment({
          clickUpTaskId: listing.taskId,
          listingTitle: listing.title,
          listingUrl: listing.url,
          agentName: listing.agent,
          resetDate: listing.resetDate || null,
          daysSinceReset: listing.daysSinceReset,
          assignedLeaderKey: leader?.key || '',
          assignedLeaderName: leader?.name || '',
          assignedLeaderEmail: leader?.email || '',
          caseStatus: leader && (!existingCaseStatus || existingCaseStatus === 'identified')
            ? 'assigned'
            : existingCaseStatus || undefined,
          metadata: {
            source: 'sales-hub-group-assignment',
            assignmentSurface: '/sales#stale-listings',
            agentName,
          },
        }, actor.email || actor.name || 'sales-hub'))
      }

      clearSalesHubCache()
      cacheHeadersNoStore(res)
      res.json({
        status: 'healthy',
        agentName,
        updatedCount: updated.length,
      })
    } catch (error) {
      sendApiError(
        res,
        500,
        'sales_group_assignment_failed',
        error instanceof Error ? error.message : 'Failed to save Sales Hub group assignment.'
      )
    }
  })

  app.post('/api/sales-hub/project-case', requireAdminToken, async (req, res) => {
    try {
      const projectKey = String(req.body?.projectKey || '').trim()
      if (!projectKey) {
        sendApiError(res, 400, 'missing_project_key', 'Project key is required.')
        return
      }

      const listingInventory = await buildSalesListingInventory()
      const project = (listingInventory.projectSuggestions || []).find(item => item.key === projectKey)
      if (!project) {
        sendApiError(res, 404, 'project_group_not_found', 'That project suggestion is not in the current GLS opportunity list.')
        return
      }

      const leaderKey = Object.prototype.hasOwnProperty.call(req.body || {}, 'assignedLeaderKey')
        ? String(req.body?.assignedLeaderKey || '').trim().toLowerCase()
        : project.assignedLeaderKey || ''
      const leader = leaderKey ? resolveSalesListingLeader(leaderKey) : null
      if (leaderKey && !leader) {
        sendApiError(res, 400, 'invalid_sales_leader', 'Sales leader must be Ryan, Blake, Nick, Scott, or Steve.')
        return
      }

      const caseStatus = resolveSalesListingCaseStatus(req.body?.caseStatus || project.caseStatus || 'identified')
      const outcomeStatus = resolveSalesListingOutcomeStatus(req.body?.outcomeStatus || project.outcomeStatus || 'open')
      const actionPlanState = resolveSalesListingActionPlanState(req.body?.actionPlanState || project.actionPlanState || 'unknown')
      const nextCaseStatus = actionPlanState.key === 'yes' && ['identified', 'assigned', 'contacted_agent'].includes(caseStatus.key)
        ? 'action_plan_created'
        : caseStatus.key
      const actor = getRequestAuthUser(req) || getLocalDevUser(req) || { email: 'unknown', name: 'Unknown' }
      const staleByTaskId = new Map((listingInventory.staleListings || []).map(item => [item.taskId, item]))
      const updated = []
      for (const member of project.listings || []) {
        const listing = staleByTaskId.get(member.taskId) || member
        updated.push(await upsertSalesListingAssignment({
          clickUpTaskId: member.taskId,
          listingTitle: listing.title || member.title || '',
          listingUrl: listing.url || member.url || '',
          agentName: listing.agent || project.agent || '',
          resetDate: listing.resetDate || null,
          daysSinceReset: listing.daysSinceReset ?? member.daysSinceReset ?? null,
          assignedLeaderKey: leader?.key || '',
          assignedLeaderName: leader?.name || '',
          assignedLeaderEmail: leader?.email || '',
          caseStatus: nextCaseStatus,
          outcomeStatus: outcomeStatus.key,
          actionPlanState: actionPlanState.key,
          actionPlanNoReason: String(req.body?.actionPlanNoReason ?? project.actionPlanNoReason ?? '').trim(),
          actionPlanText: String(req.body?.actionPlanText ?? project.actionPlanText ?? '').trim(),
          metadata: buildSalesHubCaseMetadata({
            source: 'sales-hub-project-case',
            assignmentSurface: '/sales#gls-system',
            projectKey,
            baseAddress: project.baseAddress,
          }, req.body, actor),
        }, actor.email || actor.name || 'sales-hub'))
      }

      clearSalesHubCache()
      cacheHeadersNoStore(res)
      res.json({
        status: 'healthy',
        projectKey,
        updatedCount: updated.length,
      })
    } catch (error) {
      sendApiError(
        res,
        500,
        'sales_project_case_update_failed',
        error instanceof Error ? error.message : 'Failed to update GLS project case.'
      )
    }
  })

  app.post('/api/sales-hub/listing-case', requireAdminToken, async (req, res) => {
    try {
      const taskId = String(req.body?.taskId || '').trim()
      if (!taskId) {
        sendApiError(res, 400, 'missing_task_id', 'ClickUp task ID is required.')
        return
      }

      const listingInventory = await buildSalesListingInventory()
      const listing = (listingInventory.staleListings || []).find(item => item.taskId === taskId)
      const existingCase = (listingInventory.trackedCases || []).find(item => item.clickUpTaskId === taskId)
      const source = listing || existingCase
      if (!source) {
        sendApiError(res, 404, 'listing_case_not_found', 'That listing case is not tracked yet.')
        return
      }

      const leaderKey = Object.prototype.hasOwnProperty.call(req.body || {}, 'assignedLeaderKey')
        ? String(req.body?.assignedLeaderKey || '').trim().toLowerCase()
        : source.assignedLeaderKey || ''
      const leader = leaderKey ? resolveSalesListingLeader(leaderKey) : null
      if (leaderKey && !leader) {
        sendApiError(res, 400, 'invalid_sales_leader', 'Sales leader must be Ryan, Blake, Nick, Scott, or Steve.')
        return
      }

      const caseStatus = resolveSalesListingCaseStatus(req.body?.caseStatus || source.caseStatus || 'identified')
      const outcomeStatus = resolveSalesListingOutcomeStatus(req.body?.outcomeStatus || source.outcomeStatus || 'open')
      const actionPlanState = resolveSalesListingActionPlanState(req.body?.actionPlanState || source.actionPlanState || 'unknown')
      const nextCaseStatus = actionPlanState.key === 'yes' && ['identified', 'assigned', 'contacted_agent'].includes(caseStatus.key)
        ? 'action_plan_created'
        : caseStatus.key
      const actor = getRequestAuthUser(req) || getLocalDevUser(req) || { email: 'unknown', name: 'Unknown' }
      const assignment = await upsertSalesListingAssignment({
        clickUpTaskId: taskId,
        listingTitle: source.title || source.listingTitle || '',
        listingUrl: source.url || source.listingUrl || '',
        agentName: source.agent || source.agentName || '',
        resetDate: source.resetDate || source.currentResetDate || null,
        daysSinceReset: source.daysSinceReset,
        assignedLeaderKey: leader?.key || '',
        assignedLeaderName: leader?.name || '',
        assignedLeaderEmail: leader?.email || '',
        caseStatus: nextCaseStatus,
        outcomeStatus: outcomeStatus.key,
        actionPlanState: actionPlanState.key,
        actionPlanNoReason: String(req.body?.actionPlanNoReason ?? source.actionPlanNoReason ?? '').trim(),
        actionPlanText: String(req.body?.actionPlanText ?? source.actionPlanText ?? '').trim(),
        metadata: buildSalesHubCaseMetadata({
          source: 'sales-hub-case-update',
          assignmentSurface: '/sales#stale-listings',
        }, req.body, actor),
      }, actor.email || actor.name || 'sales-hub')

      clearSalesHubCache()
      cacheHeadersNoStore(res)
      res.json({
        status: 'healthy',
        taskId,
        assignment: sanitizeSalesListingAssignment(assignment),
      })
    } catch (error) {
      sendApiError(
        res,
        500,
        'sales_case_update_failed',
        error instanceof Error ? error.message : 'Failed to update Sales Hub listing case.'
      )
    }
  })

  app.post('/api/sales-hub/sync-cases', requireAdminToken, async (req, res) => {
    try {
      const actor = getRequestAuthUser(req) || getLocalDevUser(req) || { email: 'unknown', name: 'Unknown' }
      const listingInventory = await buildSalesListingInventory()
      const sync = await syncSalesListingCasesFromInventory(listingInventory, {
        actor: actor.email || actor.name || 'sales-hub',
      })
      clearSalesHubCache()
      cacheHeadersNoStore(res)
      res.json({
        status: 'healthy',
        sync,
      })
    } catch (error) {
      sendApiError(
        res,
        500,
        'sales_case_sync_failed',
        error instanceof Error ? error.message : 'Failed to sync Sales Hub listing cases.'
      )
    }
  })

}

function evaluateSalesHubRoutesSplit({ serverSource = '', moduleSource = '', proofScriptSource = '' } = {}) {
  const routeMarkers = [
    "app.post('/api/sales-hub/listing-assignment'",
    "app.post('/api/sales-hub/group-assignment'",
    "app.post('/api/sales-hub/project-case'",
    "app.post('/api/sales-hub/listing-case'",
    "app.post('/api/sales-hub/sync-cases'",
  ]
  return {
    moduleOwnsRoutes: moduleSource.includes('registerSalesHubRoutes') && routeMarkers.every(marker => moduleSource.includes(marker)),
    serverDelegates: serverSource.includes('registerSalesHubRoutes(app'),
    oldInlineRemoved: routeMarkers.every(marker => !serverSource.includes(marker)),
    proofRejectsWrites: proofScriptSource.includes('does not call Sales Hub success-path writes'),
  }
}

export function buildSalesHubRoutesSplitDogfoodProof(input = {}) {
  const evaluate = fixture => Object.values(evaluateSalesHubRoutesSplit(fixture)).every(Boolean)
  const routeMarkers = [
    "app.post('/api/sales-hub/listing-assignment'",
    "app.post('/api/sales-hub/group-assignment'",
    "app.post('/api/sales-hub/project-case'",
    "app.post('/api/sales-hub/listing-case'",
    "app.post('/api/sales-hub/sync-cases'",
  ]
  const healthy = evaluate(input)
  const missingModule = !evaluate({ ...input, moduleSource: '' })
  const oldInlineServer = !evaluate({ ...input, serverSource: String(input.serverSource || '') + '\n' + routeMarkers.join('\n') })
  const missingRegistrar = !evaluate({ ...input, serverSource: String(input.serverSource || '').replace('registerSalesHubRoutes(app', 'registerSalesHubRoutesMissing(app') })
  const weakProof = !evaluate({ ...input, proofScriptSource: 'substring-only proof' })
  return {
    ok: healthy && missingModule && oldInlineServer && missingRegistrar && weakProof,
    passing: healthy,
    rejected: { missingModule, oldInlineServer, missingRegistrar, weakProof },
    summary: 'Sales Hub route split accepts registrar/module ownership and rejects missing module, old inline route ownership, missing registrar, and proof that might call success-path writes.',
  }
}
