import fs from 'node:fs'

export const FOUNDATION_WRITE_ROUTES_SPLIT_CARD_ID = 'FOUNDATION-WRITE-ROUTES-SPLIT-001'
export const FOUNDATION_WRITE_ROUTES_SPLIT_CLOSEOUT_KEY = 'foundation-write-routes-split-v1'
export const FOUNDATION_WRITE_ROUTES_SPLIT_PLAN_PATH = 'docs/process/foundation-write-routes-split-001-plan.md'
export const FOUNDATION_WRITE_ROUTES_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-WRITE-ROUTES-SPLIT-001.json'
export const FOUNDATION_WRITE_ROUTES_SPLIT_SCRIPT_PATH = 'scripts/process-foundation-write-routes-split-check.mjs'
export const FOUNDATION_WRITE_ROUTES_SPLIT_SPRINT_ID = 'foundation-server-monolith-closeout-2026-05-15'
export const FOUNDATION_WRITE_ROUTES_SPLIT_BEFORE_SERVER_LINES = 5447
export const FOUNDATION_WRITE_ROUTES_SPLIT_ROUTE_BUDGET_MS = 5000
export const FOUNDATION_WRITE_ROUTES_SPLIT_ROUTE_BUDGET_BYTES = 1024 * 1024

export const FOUNDATION_WRITE_ROUTE_MARKERS = [
  "app.post('/api/foundation/jobs/:jobKey/control'",
  "app.post('/api/foundation/job-runs/:runId/stop'",
  "app.post('/api/foundation/jobs/:jobKey/decommission'",
  "app.post('/api/foundation/backlog'",
  "app.patch('/api/foundation/backlog/:id'",
  "app.post('/api/foundation/decisions'",
  "app.patch('/api/foundation/decisions/:id'",
  "app.post('/api/foundation/questions'",
  "app.patch('/api/foundation/questions/:id'",
  "app.post('/api/foundation/doc-updates'",
  "app.post('/api/foundation/doc-updates/:id/approve'",
  "app.post('/api/foundation/doc-updates/:id/reject'",
  "app.post('/api/foundation/doc-updates/:id/apply'",
]

const OUT_OF_SCOPE_SERVER_ROUTE_MARKERS = [
  "app.post('/api/sales-hub/" + "listing-assignment'",
  "app.post('/api/intelligence/" + "evidence'",
]

const OUT_OF_SCOPE_MODULE_ROUTE_MARKERS = [
  ...OUT_OF_SCOPE_SERVER_ROUTE_MARKERS,
  "app.get('/api/agent-feedback/" + "session'",
  "app.post('/api/agent-feedback/" + "submit'",
]

function includesAll(source = '', markers = []) {
  const text = String(source || '')
  return markers.every(marker => text.includes(marker))
}

function excludesAll(source = '', markers = []) {
  const text = String(source || '')
  return markers.every(marker => !text.includes(marker))
}

function hasRegistrar(serverSource = '') {
  return String(serverSource || '').includes('registerFoundationWriteRoutes(app')
}

function moduleOwnsMovedRoutes(moduleSource = '') {
  return includesAll(moduleSource, FOUNDATION_WRITE_ROUTE_MARKERS) &&
    String(moduleSource || '').includes('registerFoundationWriteRoutes') &&
    String(moduleSource || '').includes('buildFoundationWriteRoutesSplitDogfoodProof')
}

function serverNoLongerOwnsMovedRoutes(serverSource = '') {
  return excludesAll(serverSource, FOUNDATION_WRITE_ROUTE_MARKERS)
}

function outOfScopeRoutesRemainInServer(serverSource = '', moduleSource = '') {
  return includesAll(serverSource, OUT_OF_SCOPE_SERVER_ROUTE_MARKERS) &&
    excludesAll(moduleSource, OUT_OF_SCOPE_MODULE_ROUTE_MARKERS)
}

function proofScriptHasSafeInvalidWriteProbes(proofScriptSource = '') {
  return includesAll(proofScriptSource, [
    'invalid backlog create',
    'invalid backlog update',
    'invalid decision create',
    'invalid decision update',
    'invalid question create',
    'invalid question update',
    'invalid doc update create',
    'missing doc update approve',
    'missing doc update reject',
    'missing doc update apply',
    'job control decommission misuse',
    'missing job run stop',
    'missing job decommission',
  ])
}

function evaluateFoundationWriteRoutesSplit({ serverSource = '', moduleSource = '', proofScriptSource = '' } = {}) {
  const checks = {
    moduleOwnsMovedRoutes: moduleOwnsMovedRoutes(moduleSource),
    serverDelegates: hasRegistrar(serverSource),
    serverNoLongerOwnsMovedRoutes: serverNoLongerOwnsMovedRoutes(serverSource),
    outOfScopeRoutesRemainInServer: outOfScopeRoutesRemainInServer(serverSource, moduleSource),
    proofScriptHasSafeInvalidWriteProbes: proofScriptHasSafeInvalidWriteProbes(proofScriptSource),
  }
  return {
    ok: Object.values(checks).every(Boolean),
    checks,
  }
}

export function buildFoundationWriteRoutesSplitDogfoodProof({ serverSource = '', moduleSource = '', proofScriptSource = '' } = {}) {
  const salesListingAssignmentMarker = "app.post('/api/sales-hub/" + "listing-assignment'"
  const passing = evaluateFoundationWriteRoutesSplit({ serverSource, moduleSource, proofScriptSource })
  const missingModule = evaluateFoundationWriteRoutesSplit({ serverSource, moduleSource: '', proofScriptSource })
  const oldInlineServer = evaluateFoundationWriteRoutesSplit({
    serverSource: `${serverSource}\n${FOUNDATION_WRITE_ROUTE_MARKERS.join('\n')}`,
    moduleSource,
    proofScriptSource,
  })
  const missingRegistrar = evaluateFoundationWriteRoutesSplit({
    serverSource: String(serverSource || '').replace('registerFoundationWriteRoutes(app', 'registerFoundationWriteRoutesMissing(app'),
    moduleSource,
    proofScriptSource,
  })
  const movedOutOfScope = evaluateFoundationWriteRoutesSplit({
    serverSource: String(serverSource || '').replace(salesListingAssignmentMarker, ''),
    moduleSource: `${moduleSource}\n${salesListingAssignmentMarker}`,
    proofScriptSource,
  })
  const weakProof = evaluateFoundationWriteRoutesSplit({
    serverSource,
    moduleSource,
    proofScriptSource: 'substring-only proof without safe invalid write probes',
  })

  return {
    ok: passing.ok &&
      !missingModule.ok &&
      !oldInlineServer.ok &&
      !missingRegistrar.ok &&
      !movedOutOfScope.ok &&
      !weakProof.ok,
    passing: passing.ok,
    rejected: {
      missingModule: !missingModule.ok,
      oldInlineServer: !oldInlineServer.ok,
      missingRegistrar: !missingRegistrar.ok,
      movedOutOfScope: !movedOutOfScope.ok,
      weakProof: !weakProof.ok,
    },
    summary: 'Foundation write route split dogfood accepts healthy module ownership and rejects missing module, old inline server ownership, missing registrar, moved out-of-scope routes, and weak proof without safe invalid write probes.',
  }
}

export function registerFoundationWriteRoutes(app, deps = {}) {
  const {
    requireAdminToken,
    sendApiError,
    cacheHeadersNoStore,
    getRequestActor,
    getAllowedBodyKeys,
    requireStringField,
    optionalStringField,
    optionalStringArrayField,
    optionalNumberField,
    validateBacklogPrefix,
    validateCategory,
    backlogScopeKeys,
    createBacklogItem,
    updateBacklogItem,
    createDecision,
    updateDecision,
    createOpenQuestion,
    updateOpenQuestion,
    createPendingDocUpdate,
    approvePendingDocUpdate,
    rejectPendingDocUpdate,
    getPendingDocUpdate,
    markPendingDocUpdateApplied,
    markPendingDocUpdateFailed,
    getFoundationJobRunSnapshot,
    updateFoundationJobControl,
    getFoundationJobRunById,
    getCurrentRepoHeadCommit,
    getDashboardRuntimeMetadata,
    buildStopDecision,
    terminateProcessTree,
    markFoundationJobRunStopped,
    buildRuntimeProcessControlApiSnapshot,
    buildDecommissionDecision,
    resolveRequestedDoc,
    readFileSafe,
    getHeadingSection,
    slugify,
    buildSimpleDiff,
    hashText,
    isDocUpdateAllowlisted,
    toRelativeDocPath,
    getGitStatusForFile,
    getGitStatus,
    runGit,
    replaceHeadingSection,
    restoreTrackedFile,
  } = deps

  app.post('/api/foundation/jobs/:jobKey/control', requireAdminToken, async (req, res) => {
    try {
      const jobKey = String(req.params.jobKey || '').trim()
      const actor = req.body && req.body.actor ? String(req.body.actor) : 'dashboard'
      if (req.body?.runtimeMode === 'decommissioned') {
        sendApiError(res, 400, 'use_decommission_route', 'Use /api/foundation/jobs/:jobKey/decommission with explicit confirmation to decommission a job.')
        return
      }
      const control = await updateFoundationJobControl(jobKey, {
        runtimeMode: req.body?.runtimeMode,
        enabled: typeof req.body?.enabled === 'boolean' ? req.body.enabled : undefined,
        scheduleEveryMinutes: req.body?.scheduleEveryMinutes,
        pauseReason: req.body?.pauseReason,
      }, actor)
      const snapshot = await getFoundationJobRunSnapshot({ limit: 30 })
      cacheHeadersNoStore(res)
      res.json({ ok: true, control, snapshot })
    } catch (error) {
      sendApiError(
        res,
        400,
        'foundation_job_control_failed',
        error instanceof Error ? error.message : 'Failed to update Foundation job control.'
      )
    }
  })

  app.post('/api/foundation/job-runs/:runId/stop', requireAdminToken, async (req, res) => {
    try {
      const runId = String(req.params.runId || '').trim()
      const actor = getRequestActor(req)
      const run = await getFoundationJobRunById(runId, { includeOutput: false })
      if (!run) {
        sendApiError(res, 404, 'foundation_job_run_not_found', 'Foundation job run was not found.')
        return
      }
      const currentRepoHead = await getCurrentRepoHeadCommit()
      const decision = buildStopDecision({
        run,
        servedCode: getDashboardRuntimeMetadata(),
        currentRepoHead,
        signal: req.body?.signal || 'SIGTERM',
      })
      if (!decision.ok) {
        sendApiError(res, 409, 'foundation_job_run_stop_blocked', decision.reasons.join(' '))
        return
      }

      let termination = null
      try {
        termination = await terminateProcessTree(decision.childPid, { signal: decision.signal })
      } catch (error) {
        if (error?.code === 'ESRCH') {
          termination = {
            ok: true,
            pid: decision.childPid,
            signal: decision.signal,
            method: 'already_exited',
          }
        } else {
          throw error
        }
      }

      const stopped = await markFoundationJobRunStopped(runId, {
        signal: decision.signal,
        reason: String(req.body?.reason || '').trim() || 'Stopped from Runtime Health active-process controls.',
        stopDecision: decision,
      }, actor)
      const snapshot = await buildRuntimeProcessControlApiSnapshot()
      cacheHeadersNoStore(res)
      res.json({ ok: true, decision, termination, stopped, snapshot })
    } catch (error) {
      sendApiError(
        res,
        500,
        'foundation_job_run_stop_failed',
        error instanceof Error ? error.message : 'Failed to stop Foundation job run.'
      )
    }
  })

  app.post('/api/foundation/jobs/:jobKey/decommission', requireAdminToken, async (req, res) => {
    try {
      const jobKey = String(req.params.jobKey || '').trim()
      const actor = getRequestActor(req)
      const foundationJobs = await getFoundationJobRunSnapshot({ limit: 50 })
      const job = (foundationJobs.jobs || []).find(item => item.key === jobKey) || null
      if (!job) {
        sendApiError(res, 404, 'foundation_job_not_found', 'Foundation job was not found.')
        return
      }
      const decision = buildDecommissionDecision({
        job,
        confirmation: req.body?.confirmation,
      })
      if (!decision.ok) {
        sendApiError(res, 409, 'foundation_job_decommission_blocked', decision.reasons.join(' '))
        return
      }
      const control = await updateFoundationJobControl(jobKey, decision.control, actor)
      const snapshot = await buildRuntimeProcessControlApiSnapshot()
      cacheHeadersNoStore(res)
      res.json({ ok: true, decision, control, snapshot })
    } catch (error) {
      sendApiError(
        res,
        500,
        'foundation_job_decommission_failed',
        error instanceof Error ? error.message : 'Failed to decommission Foundation job.'
      )
    }
  })

  app.post('/api/foundation/backlog', requireAdminToken, async (req, res) => {
    const allowedKeys = ['idPrefix', 'title', 'scope', 'team', 'lane', 'priority', 'rank', 'source', 'summary', 'whyItMatters', 'nextAction', 'statusNote', 'owner']
    const unknownFields = getAllowedBodyKeys(req.body, allowedKeys)
    if (unknownFields.length) {
      sendApiError(res, 400, 'invalid_backlog_body', 'Unknown backlog fields.', { unknownFields })
      return
    }

    const errors = {}
    const title = requireStringField(errors, req.body, 'title', 'Title')
    const scope = requireStringField(errors, { scope: req.body.scope ?? req.body.team }, 'scope', 'Scope')
    const lane = requireStringField(errors, req.body, 'lane', 'Lane')
    const priority = requireStringField(errors, req.body, 'priority', 'Priority')
    const idPrefix = requireStringField(errors, req.body, 'idPrefix', 'ID prefix')
    const rank = optionalNumberField(errors, req.body, 'rank', 'Rank')
    const source = optionalStringField(errors, req.body, 'source', 'Source')
    const summary = optionalStringField(errors, req.body, 'summary', 'Summary')
    const whyItMatters = optionalStringField(errors, req.body, 'whyItMatters', 'Why it matters')
    const nextAction = optionalStringField(errors, req.body, 'nextAction', 'Next action')
    const statusNote = optionalStringField(errors, req.body, 'statusNote', 'Status note')
    const owner = optionalStringField(errors, req.body, 'owner', 'Owner')

    if (scope && !backlogScopeKeys.includes(scope)) errors.scope = `Scope must be one of ${backlogScopeKeys.join(', ')}.`
    if (lane && !['research', 'scoped', 'ranked', 'executing', 'parked', 'done'].includes(lane)) errors.lane = 'Invalid backlog lane.'
    if (priority && !['P0', 'P1', 'P2', 'P3'].includes(priority)) errors.priority = 'Invalid priority.'
    if (idPrefix && !validateBacklogPrefix(idPrefix)) errors.idPrefix = 'Choose a valid backlog ID prefix.'

    if (Object.keys(errors).length) {
      sendApiError(res, 400, 'invalid_backlog_body', 'Backlog item is not valid.', { fields: errors })
      return
    }

    try {
      const item = await createBacklogItem({
        idPrefix,
        title,
        scope,
        lane,
        priority,
        rank,
        source,
        summary,
        whyItMatters,
        nextAction,
        statusNote,
        owner,
      }, getRequestActor(req))
      cacheHeadersNoStore(res)
      res.status(201).json({ item })
    } catch (error) {
      sendApiError(res, 500, 'backlog_create_failed', error instanceof Error ? error.message : 'Failed to create backlog item.')
    }
  })

  app.patch('/api/foundation/backlog/:id', requireAdminToken, async (req, res) => {
    const allowedKeys = ['title', 'scope', 'team', 'lane', 'priority', 'rank', 'source', 'summary', 'whyItMatters', 'nextAction', 'statusNote', 'owner']
    const unknownFields = getAllowedBodyKeys(req.body, allowedKeys)
    if (unknownFields.length) {
      sendApiError(res, 400, 'invalid_backlog_body', 'Unknown backlog fields.', { unknownFields })
      return
    }

    const errors = {}
    const requestedScope = 'scope' in req.body ? req.body.scope : req.body.team
    if (requestedScope && !backlogScopeKeys.includes(String(requestedScope).trim().toLowerCase())) {
      errors.scope = `Scope must be one of ${backlogScopeKeys.join(', ')}.`
    }
    if ('lane' in req.body && req.body.lane && !['research', 'scoped', 'ranked', 'executing', 'parked', 'done'].includes(req.body.lane)) errors.lane = 'Invalid backlog lane.'
    if ('priority' in req.body && req.body.priority && !['P0', 'P1', 'P2', 'P3'].includes(req.body.priority)) errors.priority = 'Invalid priority.'
    const rank = 'rank' in req.body ? optionalNumberField(errors, req.body, 'rank', 'Rank') : undefined

    if (Object.keys(errors).length) {
      sendApiError(res, 400, 'invalid_backlog_body', 'Backlog update is not valid.', { fields: errors })
      return
    }

    try {
      const item = await updateBacklogItem(req.params.id, {
        ...req.body,
        scope: requestedScope,
        rank,
      }, getRequestActor(req))
      cacheHeadersNoStore(res)
      res.json({ item })
    } catch (error) {
      if (error instanceof Error && /not found/i.test(error.message)) {
        sendApiError(res, 404, 'backlog_not_found', error.message)
        return
      }
      sendApiError(res, 500, 'backlog_update_failed', error instanceof Error ? error.message : 'Failed to update backlog item.')
    }
  })

  app.post('/api/foundation/decisions', requireAdminToken, async (req, res) => {
    const allowedKeys = ['title', 'summary', 'category', 'rationale', 'sourceRef', 'supersedesIds', 'decisionOwner', 'confirmedBy', 'participantNames', 'contextRef', 'evidenceNotes', 'provenanceType', 'provenanceStatus', 'provenanceNotes', 'sourceIds', 'routeRefs', 'artifactRefs', 'meetingRef', 'sessionRef', 'threadRef', 'participantRoles']
    const unknownFields = getAllowedBodyKeys(req.body, allowedKeys)
    if (unknownFields.length) {
      sendApiError(res, 400, 'invalid_decision_body', 'Unknown decision fields.', { unknownFields })
      return
    }

    const errors = {}
    const title = requireStringField(errors, req.body, 'title', 'Title')
    const summary = requireStringField(errors, req.body, 'summary', 'Summary')
    const category = requireStringField(errors, req.body, 'category', 'Category')
    const rationale = optionalStringField(errors, req.body, 'rationale', 'Rationale')
    const sourceRef = optionalStringField(errors, req.body, 'sourceRef', 'Source reference')
    const decisionOwner = optionalStringField(errors, req.body, 'decisionOwner', 'Decision owner', 120)
    const confirmedBy = optionalStringField(errors, req.body, 'confirmedBy', 'Confirmed by', 120)
    const participantNames = optionalStringArrayField(errors, req.body, 'participantNames', 'Participants')
    const contextRef = optionalStringField(errors, req.body, 'contextRef', 'Context reference', 500)
    const evidenceNotes = optionalStringField(errors, req.body, 'evidenceNotes', 'Evidence notes', 4000)
    const provenanceType = optionalStringField(errors, req.body, 'provenanceType', 'Provenance type', 40)
    const provenanceStatus = optionalStringField(errors, req.body, 'provenanceStatus', 'Provenance status', 40)
    const provenanceNotes = optionalStringField(errors, req.body, 'provenanceNotes', 'Provenance notes', 4000)
    const sourceIds = optionalStringArrayField(errors, req.body, 'sourceIds', 'Source IDs')
    const routeRefs = optionalStringArrayField(errors, req.body, 'routeRefs', 'Route refs')
    const artifactRefs = optionalStringArrayField(errors, req.body, 'artifactRefs', 'Artifact refs')
    const meetingRef = optionalStringField(errors, req.body, 'meetingRef', 'Meeting ref', 500)
    const sessionRef = optionalStringField(errors, req.body, 'sessionRef', 'Session ref', 500)
    const threadRef = optionalStringField(errors, req.body, 'threadRef', 'Thread ref', 500)
    const participantRoles = Object.prototype.hasOwnProperty.call(req.body, 'participantRoles') ? req.body.participantRoles : undefined

    if (category && !validateCategory(category)) errors.category = 'Choose one of the four canonical decision categories.'
    if ('supersedesIds' in req.body && !Array.isArray(req.body.supersedesIds)) errors.supersedesIds = 'supersedesIds must be an array of decision IDs.'
    if (provenanceType && !['direct', 'route_derived', 'backfilled', 'unknown'].includes(provenanceType)) errors.provenanceType = 'Invalid provenance type.'
    if (provenanceStatus && !['strong', 'needs_review', 'weak_backfill', 'missing'].includes(provenanceStatus)) errors.provenanceStatus = 'Invalid provenance status.'
    if (participantRoles !== undefined && (!participantRoles || typeof participantRoles !== 'object' || Array.isArray(participantRoles))) errors.participantRoles = 'participantRoles must be an object.'

    if (Object.keys(errors).length) {
      sendApiError(res, 400, 'invalid_decision_body', 'Decision is not valid.', { fields: errors })
      return
    }

    try {
      const decision = await createDecision({
        title,
        summary,
        category,
        rationale,
        sourceRef,
        supersedesIds: req.body.supersedesIds,
        decisionOwner,
        confirmedBy,
        participantNames,
        contextRef,
        evidenceNotes,
        provenanceType,
        provenanceStatus,
        provenanceNotes,
        sourceIds,
        routeRefs,
        artifactRefs,
        meetingRef,
        sessionRef,
        threadRef,
        participantRoles,
      }, getRequestActor(req))
      cacheHeadersNoStore(res)
      res.status(201).json({ decision })
    } catch (error) {
      sendApiError(res, 500, 'decision_create_failed', error instanceof Error ? error.message : 'Failed to create decision.')
    }
  })

  app.patch('/api/foundation/decisions/:id', requireAdminToken, async (req, res) => {
    const allowedKeys = ['category', 'status', 'rationale', 'sourceRef', 'supersedesIds', 'decisionOwner', 'confirmedBy', 'participantNames', 'contextRef', 'evidenceNotes', 'provenanceType', 'provenanceStatus', 'provenanceNotes', 'sourceIds', 'routeRefs', 'artifactRefs', 'meetingRef', 'sessionRef', 'threadRef', 'participantRoles']
    const unknownFields = getAllowedBodyKeys(req.body, allowedKeys)
    if (unknownFields.length) {
      sendApiError(res, 400, 'invalid_decision_body', 'Unknown decision fields.', { unknownFields })
      return
    }

    const errors = {}
    if ('category' in req.body && req.body.category && !validateCategory(req.body.category)) errors.category = 'Choose one of the four canonical decision categories.'
    if ('status' in req.body && req.body.status && !['proposed', 'locked', 'superseded'].includes(req.body.status)) errors.status = 'Invalid decision status.'
    if ('supersedesIds' in req.body && !Array.isArray(req.body.supersedesIds)) errors.supersedesIds = 'supersedesIds must be an array of decision IDs.'
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
    const participantNames = optionalStringArrayField(errors, req.body, 'participantNames', 'Participants')
    const contextRef = Object.prototype.hasOwnProperty.call(req.body, 'contextRef')
      ? optionalStringField(errors, req.body, 'contextRef', 'Context reference', 500)
      : undefined
    const evidenceNotes = Object.prototype.hasOwnProperty.call(req.body, 'evidenceNotes')
      ? optionalStringField(errors, req.body, 'evidenceNotes', 'Evidence notes', 4000)
      : undefined
    const provenanceType = Object.prototype.hasOwnProperty.call(req.body, 'provenanceType')
      ? optionalStringField(errors, req.body, 'provenanceType', 'Provenance type', 40)
      : undefined
    const provenanceStatus = Object.prototype.hasOwnProperty.call(req.body, 'provenanceStatus')
      ? optionalStringField(errors, req.body, 'provenanceStatus', 'Provenance status', 40)
      : undefined
    const provenanceNotes = Object.prototype.hasOwnProperty.call(req.body, 'provenanceNotes')
      ? optionalStringField(errors, req.body, 'provenanceNotes', 'Provenance notes', 4000)
      : undefined
    const sourceIds = Object.prototype.hasOwnProperty.call(req.body, 'sourceIds')
      ? optionalStringArrayField(errors, req.body, 'sourceIds', 'Source IDs')
      : undefined
    const routeRefs = Object.prototype.hasOwnProperty.call(req.body, 'routeRefs')
      ? optionalStringArrayField(errors, req.body, 'routeRefs', 'Route refs')
      : undefined
    const artifactRefs = Object.prototype.hasOwnProperty.call(req.body, 'artifactRefs')
      ? optionalStringArrayField(errors, req.body, 'artifactRefs', 'Artifact refs')
      : undefined
    const meetingRef = Object.prototype.hasOwnProperty.call(req.body, 'meetingRef')
      ? optionalStringField(errors, req.body, 'meetingRef', 'Meeting ref', 500)
      : undefined
    const sessionRef = Object.prototype.hasOwnProperty.call(req.body, 'sessionRef')
      ? optionalStringField(errors, req.body, 'sessionRef', 'Session ref', 500)
      : undefined
    const threadRef = Object.prototype.hasOwnProperty.call(req.body, 'threadRef')
      ? optionalStringField(errors, req.body, 'threadRef', 'Thread ref', 500)
      : undefined
    const participantRoles = Object.prototype.hasOwnProperty.call(req.body, 'participantRoles') ? req.body.participantRoles : undefined
    if (provenanceType && !['direct', 'route_derived', 'backfilled', 'unknown'].includes(provenanceType)) errors.provenanceType = 'Invalid provenance type.'
    if (provenanceStatus && !['strong', 'needs_review', 'weak_backfill', 'missing'].includes(provenanceStatus)) errors.provenanceStatus = 'Invalid provenance status.'
    if (participantRoles !== undefined && (!participantRoles || typeof participantRoles !== 'object' || Array.isArray(participantRoles))) errors.participantRoles = 'participantRoles must be an object.'

    if (Object.keys(errors).length) {
      sendApiError(res, 400, 'invalid_decision_body', 'Decision update is not valid.', { fields: errors })
      return
    }

    try {
      const decision = await updateDecision(req.params.id, {
        ...req.body,
        rationale,
        sourceRef,
        decisionOwner,
        confirmedBy,
        participantNames,
        contextRef,
        evidenceNotes,
        provenanceType,
        provenanceStatus,
        provenanceNotes,
        sourceIds,
        routeRefs,
        artifactRefs,
        meetingRef,
        sessionRef,
        threadRef,
        participantRoles,
      }, getRequestActor(req))
      cacheHeadersNoStore(res)
      res.json({ decision })
    } catch (error) {
      if (error instanceof Error && /not found/i.test(error.message)) {
        sendApiError(res, 404, 'decision_not_found', error.message)
        return
      }
      sendApiError(res, 500, 'decision_update_failed', error instanceof Error ? error.message : 'Failed to update decision.')
    }
  })

  app.post('/api/foundation/questions', requireAdminToken, async (req, res) => {
    const allowedKeys = ['title', 'summary', 'owner']
    const unknownFields = getAllowedBodyKeys(req.body, allowedKeys)
    if (unknownFields.length) {
      sendApiError(res, 400, 'invalid_question_body', 'Unknown question fields.', { unknownFields })
      return
    }

    const errors = {}
    const title = requireStringField(errors, req.body, 'title', 'Title')
    const summary = requireStringField(errors, req.body, 'summary', 'Summary')
    const owner = optionalStringField(errors, req.body, 'owner', 'Owner')

    if (Object.keys(errors).length) {
      sendApiError(res, 400, 'invalid_question_body', 'Question is not valid.', { fields: errors })
      return
    }

    try {
      const question = await createOpenQuestion({ title, summary, owner }, getRequestActor(req))
      cacheHeadersNoStore(res)
      res.status(201).json({ question })
    } catch (error) {
      sendApiError(res, 500, 'question_create_failed', error instanceof Error ? error.message : 'Failed to create question.')
    }
  })

  app.patch('/api/foundation/questions/:id', requireAdminToken, async (req, res) => {
    const allowedKeys = ['title', 'summary', 'owner', 'status', 'resolutionNote']
    const unknownFields = getAllowedBodyKeys(req.body, allowedKeys)
    if (unknownFields.length) {
      sendApiError(res, 400, 'invalid_question_body', 'Unknown question fields.', { unknownFields })
      return
    }

    const errors = {}
    if ('status' in req.body && req.body.status && !['open', 'resolved'].includes(req.body.status)) errors.status = 'Status must be open or resolved.'
    if (Object.keys(errors).length) {
      sendApiError(res, 400, 'invalid_question_body', 'Question update is not valid.', { fields: errors })
      return
    }

    try {
      const question = await updateOpenQuestion(req.params.id, req.body, getRequestActor(req))
      cacheHeadersNoStore(res)
      res.json({ question })
    } catch (error) {
      if (error instanceof Error && /not found/i.test(error.message)) {
        sendApiError(res, 404, 'question_not_found', error.message)
        return
      }
      sendApiError(res, 500, 'question_update_failed', error instanceof Error ? error.message : 'Failed to update question.')
    }
  })

  app.post('/api/foundation/doc-updates', requireAdminToken, async (req, res) => {
    const allowedKeys = ['decisionId', 'targetDocPath', 'targetSection', 'summary', 'proposedText']
    const unknownFields = getAllowedBodyKeys(req.body, allowedKeys)
    if (unknownFields.length) {
      sendApiError(res, 400, 'invalid_doc_update_body', 'Unknown doc update fields.', { unknownFields })
      return
    }

    const errors = {}
    const targetDocPath = requireStringField(errors, req.body, 'targetDocPath', 'Target doc path')
    const targetSection = requireStringField(errors, req.body, 'targetSection', 'Target section')
    const summary = requireStringField(errors, req.body, 'summary', 'Summary')
    const proposedText = requireStringField(errors, req.body, 'proposedText', 'Proposed text')
    const decisionId = optionalStringField(errors, req.body, 'decisionId', 'Decision ID')

    const resolvedPath = targetDocPath ? resolveRequestedDoc(targetDocPath) : null
    if (targetDocPath && !resolvedPath) errors.targetDocPath = 'Target doc path must point to a markdown file inside docs/.'

    if (Object.keys(errors).length) {
      sendApiError(res, 400, 'invalid_doc_update_body', 'Doc update proposal is not valid.', { fields: errors })
      return
    }

    const content = readFileSafe(resolvedPath)
    if (!content) {
      sendApiError(res, 404, 'doc_not_found', 'Target document not found.')
      return
    }

    const section = getHeadingSection(content, targetSection)
    if (!section) {
      sendApiError(res, 404, 'target_section_not_found', 'Target section was not found in the document.')
      return
    }

    try {
      const docUpdate = await createPendingDocUpdate({
        decisionId,
        targetDocPath,
        targetSection: slugify(targetSection),
        summary,
        currentText: section.currentText,
        proposedText,
        proposedDiff: buildSimpleDiff(section.currentText, proposedText),
        metadata: {
          currentHash: hashText(section.currentText),
          heading: section.heading,
        },
      }, getRequestActor(req))
      cacheHeadersNoStore(res)
      res.status(201).json({ docUpdate })
    } catch (error) {
      sendApiError(res, 500, 'doc_update_create_failed', error instanceof Error ? error.message : 'Failed to create doc update proposal.')
    }
  })

  app.post('/api/foundation/doc-updates/:id/approve', requireAdminToken, async (req, res) => {
    try {
      const docUpdate = await approvePendingDocUpdate(req.params.id, getRequestActor(req))
      cacheHeadersNoStore(res)
      res.json({ docUpdate })
    } catch (error) {
      if (error instanceof Error && /not found/i.test(error.message)) {
        sendApiError(res, 404, 'doc_update_not_found', error.message)
        return
      }
      if (error instanceof Error && /cannot be approved from/i.test(error.message)) {
        sendApiError(res, 409, 'doc_update_invalid_state', error.message)
        return
      }
      sendApiError(res, 500, 'doc_update_approve_failed', error instanceof Error ? error.message : 'Failed to approve doc update.')
    }
  })

  app.post('/api/foundation/doc-updates/:id/reject', requireAdminToken, async (req, res) => {
    try {
      const docUpdate = await rejectPendingDocUpdate(req.params.id, getRequestActor(req))
      cacheHeadersNoStore(res)
      res.json({ docUpdate })
    } catch (error) {
      if (error instanceof Error && /not found/i.test(error.message)) {
        sendApiError(res, 404, 'doc_update_not_found', error.message)
        return
      }
      if (error instanceof Error && /cannot be rejected from/i.test(error.message)) {
        sendApiError(res, 409, 'doc_update_invalid_state', error.message)
        return
      }
      sendApiError(res, 500, 'doc_update_reject_failed', error instanceof Error ? error.message : 'Failed to reject doc update.')
    }
  })

  app.post('/api/foundation/doc-updates/:id/apply', requireAdminToken, async (req, res) => {
    const docUpdate = await getPendingDocUpdate(req.params.id)
    if (!docUpdate) {
      sendApiError(res, 404, 'doc_update_not_found', 'Pending doc update not found.')
      return
    }

    if (!['approved', 'failed'].includes(docUpdate.status)) {
      sendApiError(res, 409, 'doc_update_not_ready', 'Approve the doc update before applying it.')
      return
    }

    if (!isDocUpdateAllowlisted(docUpdate.targetDocPath)) {
      sendApiError(res, 409, 'not_in_allowlist', 'This document is not on the B1 apply allowlist.')
      return
    }

    const resolvedPath = resolveRequestedDoc(docUpdate.targetDocPath)
    if (!resolvedPath) {
      sendApiError(res, 400, 'invalid_doc_path', 'Target doc path is not allowed.')
      return
    }

    const relativePath = toRelativeDocPath(resolvedPath)
    const currentContent = readFileSafe(resolvedPath)
    if (!currentContent) {
      sendApiError(res, 404, 'doc_not_found', 'Target document not found.')
      return
    }

    const gitStatus = await getGitStatusForFile(relativePath)
    if (gitStatus) {
      sendApiError(res, 409, 'doc_file_dirty', 'Target document has uncommitted changes. Apply is blocked until the file is clean.')
      return
    }

    const repoStatus = await getGitStatus()
    if (repoStatus) {
      sendApiError(res, 409, 'repo_dirty', 'Repository has uncommitted changes. Apply is blocked so it cannot commit unrelated work.')
      return
    }

    const section = getHeadingSection(currentContent, docUpdate.targetSection)
    if (!section) {
      sendApiError(res, 409, 'target_section_not_found', 'Target section no longer exists in the document.')
      return
    }

    const currentHash = hashText(section.currentText)
    const expectedHash = docUpdate.metadata && docUpdate.metadata.currentHash
    if ((expectedHash && currentHash !== expectedHash) || section.currentText.trim() !== String(docUpdate.currentText || '').trim()) {
      sendApiError(res, 409, 'doc_section_conflict', 'The document changed after the proposal was created. Review it again before applying.')
      return
    }

    const replacement = replaceHeadingSection(currentContent, docUpdate.targetSection, docUpdate.proposedText)
    if (!replacement) {
      sendApiError(res, 409, 'target_section_not_found', 'Target section could not be replaced.')
      return
    }

    try {
      fs.writeFileSync(resolvedPath, replacement.content, 'utf8')
      await runGit(['add', '--', relativePath])
      await runGit([
        'commit',
        '--only',
        '-m',
        `Apply doc update ${docUpdate.id}: ${docUpdate.summary}`,
        '-m',
        'Co-Authored-By: BCrew AI OS <system@bensoncrew.ai>',
        '--',
        relativePath,
      ])
      const { stdout } = await runGit(['rev-parse', 'HEAD'])
      const appliedCommit = stdout.trim()
      const applied = await markPendingDocUpdateApplied(docUpdate.id, appliedCommit, 'system')
      cacheHeadersNoStore(res)
      res.json({ docUpdate: applied, appliedCommit })
    } catch (error) {
      await restoreTrackedFile(relativePath)
      try {
        const recoveredContent = readFileSafe(resolvedPath)
        if (recoveredContent !== currentContent) {
          fs.writeFileSync(resolvedPath, currentContent, 'utf8')
        }
      } catch {
        // Best-effort recovery only.
      }

      try {
        await markPendingDocUpdateFailed(docUpdate.id, {
          errorDetail: error instanceof Error ? error.message : 'Failed to apply doc update.',
          partialWrite: false,
        }, 'system')
      } catch {
        // Preserve the original apply error below.
      }

      sendApiError(
        res,
        500,
        'doc_update_apply_failed',
        error instanceof Error ? error.message : 'Failed to apply doc update.'
      )
    }
  })
}
