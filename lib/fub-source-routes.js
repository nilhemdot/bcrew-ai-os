export const FUB_SOURCE_ROUTE_SPLIT_CARD_ID = 'FUB-SOURCE-ROUTE-SPLIT-001'
export const FUB_SOURCE_ROUTE_SPLIT_CLOSEOUT_KEY = 'fub-source-route-split-v1'
export const FUB_SOURCE_ROUTE_SPLIT_PLAN_PATH = 'docs/process/fub-source-route-split-001-plan.md'
export const FUB_SOURCE_ROUTE_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FUB-SOURCE-ROUTE-SPLIT-001.json'
export const FUB_SOURCE_ROUTE_SPLIT_SCRIPT_PATH = 'scripts/process-fub-source-route-split-check.mjs'
export const FUB_SOURCE_ROUTE_SPLIT_SPRINT_ID = 'fub-source-route-split-2026-05-15'
export const FUB_SOURCE_ROUTE_SPLIT_BEFORE_SERVER_LINES = 7136

const FUB_ROUTE_MARKERS = [
  "app.get('/api/fub/health'",
  "app.get('/api/fub/person'",
  "app.get('/api/fub/lead-sources'",
  "app.post('/api/fub/lead-sources/refresh'",
  "app.patch('/api/fub/lead-sources'",
  "app.post('/api/fub/request'",
]

const FUB_ROUTE_STRINGS = [
  '/api/fub/health',
  '/api/fub/person',
  '/api/fub/lead-sources',
  '/api/fub/lead-sources/refresh',
  '/api/fub/request',
]

function requireDependency(deps, key) {
  const value = deps[key]
  if (typeof value !== 'function') {
    throw new Error(`registerFubSourceRoutes requires ${key}.`)
  }
  return value
}

function routeModuleOwnsFubRoutes(moduleSource = '') {
  const source = String(moduleSource || '')
  return FUB_ROUTE_STRINGS.every(route => source.includes(route)) &&
    source.includes('registerFubSourceRoutes')
}

function serverDelegatesFubRoutes(serverSource = '') {
  const source = String(serverSource || '')
  return source.includes('registerFubSourceRoutes(app')
}

function serverNoLongerOwnsInlineFubRoutes(serverSource = '') {
  const source = String(serverSource || '')
  return FUB_ROUTE_MARKERS.every(marker => !source.includes(marker))
}

export function buildFubSourceRouteSplitDogfoodProof({
  serverSource = '',
  moduleSource = '',
  proofScriptSource = '',
} = {}) {
  const healthy = {
    serverSource,
    moduleSource,
    proofScriptSource,
  }
  const missingModule = {
    ...healthy,
    moduleSource: '',
  }
  const oldInlineServer = {
    ...healthy,
    serverSource: `${serverSource}\napp.get('/api/fub/health', requireAdminToken, async (_req, res) => res.json({ ok: true }))`,
  }
  const missingRegistrar = {
    ...healthy,
    serverSource: serverSource.replace('registerFubSourceRoutes(app', 'registerNotFubSourceRoutes(app'),
  }
  const mutatingProof = {
    ...healthy,
    proofScriptSource: `${proofScriptSource}\nawait updateBacklogItem('BAD', {})`,
  }

  const scriptReadOnly = source => ![
    'create' + 'BacklogItem',
    'update' + 'BacklogItem',
    'upsert' + 'FoundationCurrentSprintOverlay',
    'INSERT' + ' INTO',
    'UPDATE' + ' ',
    'DELETE' + ' FROM',
    'fs.' + 'writeFile',
    'write' + 'File(',
  ].some(token => String(source || '').includes(token))

  const evaluate = fixture =>
    routeModuleOwnsFubRoutes(fixture.moduleSource) &&
    serverDelegatesFubRoutes(fixture.serverSource) &&
    serverNoLongerOwnsInlineFubRoutes(fixture.serverSource) &&
    scriptReadOnly(fixture.proofScriptSource)

  const rejected = {
    missingModule: !evaluate(missingModule),
    oldInlineServer: !evaluate(oldInlineServer),
    missingRegistrar: !evaluate(missingRegistrar),
    mutatingProof: !evaluate(mutatingProof),
  }

  return {
    ok: evaluate(healthy) && Object.values(rejected).every(Boolean),
    passing: evaluate(healthy),
    rejected,
    summary: 'FUB route split dogfood accepts healthy registrar/module ownership and rejects missing module, old inline server route, missing registrar, and mutating proof fixtures.',
  }
}

export function registerFubSourceRoutes(app, deps = {}) {
  const requireAdminToken = requireDependency(deps, 'requireAdminToken')
  const sendApiError = requireDependency(deps, 'sendApiError')
  const cacheHeadersNoStore = requireDependency(deps, 'cacheHeadersNoStore')
  const getAllowedBodyKeys = requireDependency(deps, 'getAllowedBodyKeys')
  const requireStringField = requireDependency(deps, 'requireStringField')
  const optionalStringField = requireDependency(deps, 'optionalStringField')
  const sanitizeFubRequestHeaders = requireDependency(deps, 'sanitizeFubRequestHeaders')
  const getRequestActor = requireDependency(deps, 'getRequestActor')
  const getFubContextsSummary = requireDependency(deps, 'getFubContextsSummary')
  const getFubHealth = requireDependency(deps, 'getFubHealth')
  const getFubPerson = requireDependency(deps, 'getFubPerson')
  const resolveFubContext = requireDependency(deps, 'resolveFubContext')
  const getFubLeadSourceSnapshot = requireDependency(deps, 'getFubLeadSourceSnapshot')
  const listFubLeadSourceRules = requireDependency(deps, 'listFubLeadSourceRules')
  const buildFubLeadSourcePayload = requireDependency(deps, 'buildFubLeadSourcePayload')
  const syncFubLeadSourceDriftEvent = requireDependency(deps, 'syncFubLeadSourceDriftEvent')
  const buildSourceWatchFreshness = requireDependency(deps, 'buildSourceWatchFreshness')
  const getLatestChangeEventForEntity = requireDependency(deps, 'getLatestChangeEventForEntity')
  const listFubLeadSources = requireDependency(deps, 'listFubLeadSources')
  const saveFubLeadSourceSnapshot = requireDependency(deps, 'saveFubLeadSourceSnapshot')
  const upsertFubLeadSourceRule = requireDependency(deps, 'upsertFubLeadSourceRule')
  const fubJsonFetch = requireDependency(deps, 'fubJsonFetch')
  const refreshPageLimit = Number(deps.FUB_LEAD_SOURCE_REFRESH_PAGE_LIMIT || 100)
  const refreshMaxPages = Number(deps.FUB_LEAD_SOURCE_REFRESH_MAX_PAGES || 1000)

  app.get('/api/fub/health', requireAdminToken, async (req, res) => {
    try {
      const requestedContext = typeof req.query.context === 'string' ? req.query.context.trim().toLowerCase() : ''
      const contexts = getFubContextsSummary()
      const knownContext = requestedContext ? contexts.find(context => context.key === requestedContext) : null

      if (requestedContext && !knownContext) {
        sendApiError(res, 400, 'invalid_fub_context', 'Unknown Follow Up Boss context requested.')
        return
      }

      const targetKeys = requestedContext
        ? [requestedContext]
        : contexts.filter(context => context.configured).map(context => context.key)

      if (!targetKeys.length) {
        sendApiError(res, 503, 'fub_unconfigured', 'No configured Follow Up Boss contexts were found.')
        return
      }

      const checks = await Promise.all(
        targetKeys.map(async contextKey => {
          try {
            return await getFubHealth(contextKey)
          } catch (error) {
            return {
              context: { key: contextKey },
              status: 'error',
              error: {
                message: error instanceof Error ? error.message : 'Follow Up Boss health check failed.',
                status: error && typeof error === 'object' && 'status' in error ? error.status : null,
              },
            }
          }
        })
      )

      const okCount = checks.filter(check => check.status === 'ok').length
      const overallStatus = okCount === checks.length ? 'ok' : okCount > 0 ? 'partial' : 'error'

      cacheHeadersNoStore(res)
      res.status(overallStatus === 'error' ? 502 : 200).json({
        overallStatus,
        checkedAt: new Date().toISOString(),
        contexts,
        checks,
      })
    } catch (error) {
      sendApiError(
        res,
        500,
        'fub_health_failed',
        error instanceof Error ? error.message : 'Failed to read Follow Up Boss health.'
      )
    }
  })

  app.get('/api/fub/person', requireAdminToken, async (req, res) => {
    try {
      const contextKey = typeof req.query.context === 'string' ? req.query.context.trim().toLowerCase() : ''
      const personInput =
        (typeof req.query.person === 'string' && req.query.person.trim()) ||
        (typeof req.query.url === 'string' && req.query.url.trim()) ||
        ''

      if (!personInput) {
        sendApiError(
          res,
          400,
          'missing_fub_person',
          'Provide ?person=<id> or ?url=<follow-up-boss-person-url>.'
        )
        return
      }

      const resolvedContext = resolveFubContext(contextKey || undefined)
      const person = await getFubPerson(resolvedContext.key, personInput)

      cacheHeadersNoStore(res)
      res.json({
        context: {
          key: resolvedContext.key,
          label: resolvedContext.label,
          description: resolvedContext.description,
        },
        person,
      })
    } catch (error) {
      const statusCode = error && typeof error === 'object' && 'status' in error && error.status ? error.status : 500
      sendApiError(
        res,
        statusCode,
        'fub_person_lookup_failed',
        error instanceof Error ? error.message : 'Failed to read Follow Up Boss person.'
      )
    }
  })

  app.get('/api/fub/lead-sources', requireAdminToken, async (req, res) => {
    try {
      const contextKey = typeof req.query.context === 'string' ? req.query.context.trim().toLowerCase() : ''
      const resolvedContext = resolveFubContext(contextKey || undefined)
      const [snapshot, rules] = await Promise.all([
        getFubLeadSourceSnapshot(resolvedContext.key),
        listFubLeadSourceRules(),
      ])

      const payload = buildFubLeadSourcePayload(snapshot, rules, {
        key: resolvedContext.key,
        label: resolvedContext.label,
      })
      const syncResult = await syncFubLeadSourceDriftEvent(payload, 'system')
      const latestEvent = syncResult && syncResult.event
        ? syncResult.event
        : await getLatestChangeEventForEntity('fub_lead_source_snapshots', resolvedContext.key, ['source_drift_detected', 'source_drift_cleared'])

      payload.freshness = !payload.snapshot.available
        ? buildSourceWatchFreshness(latestEvent, false, {
            missing: true,
            reason: 'No saved FUB lead-source snapshot exists yet.',
          })
        : buildSourceWatchFreshness(latestEvent, payload.drift.status === 'review', {
            forcedStatus: payload.drift.stale && payload.drift.stale.isStale ? 'stale' : '',
            forcedReason: payload.drift.stale && payload.drift.stale.isStale
              ? 'Saved FUB source snapshot is older than 24 hours.'
              : '',
          })
      payload.freshness.snapshotAgeHours = payload.drift && payload.drift.stale ? payload.drift.stale.ageHours : null

      cacheHeadersNoStore(res)
      res.json(payload)
    } catch (error) {
      const statusCode = error && typeof error === 'object' && 'status' in error && error.status ? error.status : 500
      sendApiError(
        res,
        statusCode,
        'fub_lead_sources_failed',
        error instanceof Error ? error.message : 'Failed to load Follow Up Boss lead sources.'
      )
    }
  })

  app.post('/api/fub/lead-sources/refresh', requireAdminToken, async (req, res) => {
    const allowedKeys = ['context']
    const unknownFields = getAllowedBodyKeys(req.body, allowedKeys)
    if (unknownFields.length) {
      sendApiError(res, 400, 'invalid_fub_lead_source_refresh_body', 'Unknown FUB lead-source refresh fields.', { unknownFields })
      return
    }

    const errors = {}
    const contextKey = optionalStringField(errors, req.body, 'context', 'Context')
    if (Object.keys(errors).length) {
      sendApiError(res, 400, 'invalid_fub_lead_source_refresh_body', 'FUB lead-source refresh is not valid.', { fields: errors })
      return
    }

    try {
      const live = await listFubLeadSources(contextKey || undefined, {
        pageLimit: refreshPageLimit,
        maxPages: refreshMaxPages,
      })
      const snapshot = await saveFubLeadSourceSnapshot({
        contextKey: live.context.key,
        contextLabel: live.context.label,
        sources: live.sources,
        scan: live.stats,
      }, getRequestActor(req))
      const rules = await listFubLeadSourceRules()
      const payload = buildFubLeadSourcePayload(snapshot, rules, {
        key: live.context.key,
        label: live.context.label,
      })
      const syncResult = await syncFubLeadSourceDriftEvent(payload, getRequestActor(req))
      payload.freshness = buildSourceWatchFreshness(syncResult && syncResult.event ? syncResult.event : null, payload.drift.status === 'review', {
        forcedStatus: payload.drift && payload.drift.stale && payload.drift.stale.isStale ? 'stale' : '',
        forcedReason: payload.drift && payload.drift.stale && payload.drift.stale.isStale
          ? 'Saved FUB source snapshot is older than 24 hours.'
          : '',
      })
      payload.freshness.snapshotAgeHours = payload.drift && payload.drift.stale ? payload.drift.stale.ageHours : null

      cacheHeadersNoStore(res)
      res.json(payload)
    } catch (error) {
      const statusCode = error && typeof error === 'object' && 'status' in error && error.status ? error.status : 500
      sendApiError(
        res,
        statusCode,
        'fub_lead_sources_refresh_failed',
        error instanceof Error ? error.message : 'Failed to refresh Follow Up Boss lead sources.'
      )
    }
  })

  app.patch('/api/fub/lead-sources', requireAdminToken, async (req, res) => {
    const allowedKeys = ['context', 'source', 'marketingType', 'ownershipType', 'flagState', 'sourceGroup', 'notes']
    const unknownFields = getAllowedBodyKeys(req.body, allowedKeys)
    if (unknownFields.length) {
      sendApiError(res, 400, 'invalid_fub_lead_source_body', 'Unknown FUB lead-source fields.', { unknownFields })
      return
    }

    const errors = {}
    const contextKey = optionalStringField(errors, req.body, 'context', 'Context')
    const source = requireStringField(errors, req.body, 'source', 'Lead source')
    const marketingType = optionalStringField(errors, req.body, 'marketingType', 'Marketing type') || 'unclassified'
    const ownershipType = optionalStringField(errors, req.body, 'ownershipType', 'Ownership type') || 'unclassified'
    const flagState = optionalStringField(errors, req.body, 'flagState', 'Flag state') || 'none'
    const sourceGroup = optionalStringField(errors, req.body, 'sourceGroup', 'Source group', 120)
    const notes = optionalStringField(errors, req.body, 'notes', 'Notes', 1000)

    if (!['marketing', 'non_marketing', 'unclassified'].includes(marketingType)) {
      errors.marketingType = 'Marketing type must be marketing, non_marketing, or unclassified.'
    }
    if (!['company', 'agent', 'referral', 'other', 'unclassified'].includes(ownershipType)) {
      errors.ownershipType = 'Ownership type must be company, agent, referral, other, or unclassified.'
    }
    if (!['none', 'needs_cleanup', 'not_canonical', 'merge_candidate'].includes(flagState)) {
      errors.flagState = 'Flag state must be none, needs_cleanup, not_canonical, or merge_candidate.'
    }

    if (Object.keys(errors).length) {
      sendApiError(res, 400, 'invalid_fub_lead_source_body', 'FUB lead-source update is not valid.', { fields: errors })
      return
    }

    try {
      const rule = await upsertFubLeadSourceRule({
        source,
        marketingType,
        ownershipType,
        flagState,
        sourceGroup,
        notes,
      }, getRequestActor(req))
      const resolvedContext = resolveFubContext(contextKey || undefined)
      const snapshot = await getFubLeadSourceSnapshot(resolvedContext.key)
      const rules = await listFubLeadSourceRules()
      const current = buildFubLeadSourcePayload(snapshot, rules, {
        key: resolvedContext.key,
        label: resolvedContext.label,
      })
      const syncResult = await syncFubLeadSourceDriftEvent(current, getRequestActor(req))
      current.freshness = !current.snapshot.available
        ? buildSourceWatchFreshness(syncResult && syncResult.event ? syncResult.event : null, false, {
            missing: true,
            reason: 'No saved FUB lead-source snapshot exists yet.',
          })
        : buildSourceWatchFreshness(syncResult && syncResult.event ? syncResult.event : null, current.drift.status === 'review', {
            forcedStatus: current.drift && current.drift.stale && current.drift.stale.isStale ? 'stale' : '',
            forcedReason: current.drift && current.drift.stale && current.drift.stale.isStale
              ? 'Saved FUB source snapshot is older than 24 hours.'
              : '',
          })
      current.freshness.snapshotAgeHours = current.drift && current.drift.stale ? current.drift.stale.ageHours : null

      cacheHeadersNoStore(res)
      res.json({ rule, current })
    } catch (error) {
      sendApiError(
        res,
        500,
        'fub_lead_source_update_failed',
        error instanceof Error ? error.message : 'Failed to update FUB lead-source rule.'
      )
    }
  })

  app.post('/api/fub/request', requireAdminToken, async (req, res) => {
    const allowedKeys = ['context', 'method', 'endpoint', 'body', 'headers']
    const unknownFields = getAllowedBodyKeys(req.body, allowedKeys)
    if (unknownFields.length) {
      sendApiError(res, 400, 'invalid_fub_request_body', 'Unknown FUB request fields.', { unknownFields })
      return
    }

    const errors = {}
    const method = requireStringField(errors, req.body, 'method', 'Method')
    const endpoint = requireStringField(errors, req.body, 'endpoint', 'Endpoint')
    const contextKey = optionalStringField(errors, req.body, 'context', 'Context')
    const normalizedMethod = method ? method.trim().toUpperCase() : ''
    if (normalizedMethod && !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(normalizedMethod)) {
      errors.method = 'Method must be GET, POST, PUT, PATCH, or DELETE.'
    }
    if (normalizedMethod && normalizedMethod !== 'GET' && process.env.FUB_PROXY_ALLOW_MUTATION !== 'true') {
      errors.method = 'Generic FUB proxy mutations are disabled. Use the governed endpoint for writes, or set FUB_PROXY_ALLOW_MUTATION=true for a supervised local run.'
    }

    let headers = {}
    try {
      headers = sanitizeFubRequestHeaders(req.body.headers)
    } catch (error) {
      errors.headers = error instanceof Error ? error.message : 'Headers must be an object.'
    }

    if (Object.keys(errors).length) {
      sendApiError(res, 400, 'invalid_fub_request_body', 'FUB request is not valid.', { fields: errors })
      return
    }

    try {
      const resolvedContext = resolveFubContext(contextKey || undefined)
      const payload = await fubJsonFetch(resolvedContext.key, endpoint, {
        method: normalizedMethod,
        headers,
        body: 'body' in req.body ? req.body.body : undefined,
      })

      cacheHeadersNoStore(res)
      res.json({
        context: {
          key: resolvedContext.key,
          label: resolvedContext.label,
          description: resolvedContext.description,
        },
        request: {
          method: normalizedMethod,
          endpoint,
        },
        payload,
      })
    } catch (error) {
      const statusCode = error && typeof error === 'object' && 'status' in error && error.status ? error.status : 500
      sendApiError(
        res,
        statusCode,
        'fub_request_failed',
        error instanceof Error ? error.message : 'Follow Up Boss request failed.'
      )
    }
  })
}
