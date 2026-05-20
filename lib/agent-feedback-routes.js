export const AGENT_FEEDBACK_ROUTES_SPLIT_CARD_ID = 'AGENT-FEEDBACK-ROUTES-SPLIT-001'
export const AGENT_FEEDBACK_ROUTES_SPLIT_CLOSEOUT_KEY = 'agent-feedback-routes-split-v1'
export const AGENT_FEEDBACK_ROUTES_SPLIT_PLAN_PATH = 'docs/process/agent-feedback-routes-split-001-plan.md'
export const AGENT_FEEDBACK_ROUTES_SPLIT_APPROVAL_PATH = 'docs/process/approvals/AGENT-FEEDBACK-ROUTES-SPLIT-001.json'
export const AGENT_FEEDBACK_ROUTES_SPLIT_SCRIPT_PATH = 'scripts/process-agent-feedback-routes-split-check.mjs'
export const AGENT_FEEDBACK_ROUTES_SPLIT_SPRINT_ID = 'foundation-server-monolith-closeout-2026-05-15'
export const AGENT_FEEDBACK_ROUTES_SPLIT_BEFORE_SERVER_LINES = 4928
export const AGENT_FEEDBACK_ROUTES_SPLIT_ROUTE_BUDGET_MS = 2000
export const AGENT_FEEDBACK_ROUTES_SPLIT_ROUTE_BUDGET_BYTES = 256 * 1024

export const AGENT_FEEDBACK_PUBLIC_ROUTE_MARKERS = [
  "app.get('/api/agent-feedback/session'",
  "app.post('/api/agent-feedback/submit'",
]

const OUT_OF_SCOPE_ROUTE_MARKERS = [
  "app.get('/api/foundation/agent-feedback-production-" + "dry-run'",
  "app.get('/api/ops/agent-feedback-production-" + "dry-run'",
  "app.post('/api/sales-hub/" + "listing-assignment'",
  "app.post('/api/intelligence/" + "evidence'",
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
  return String(serverSource || '').includes('registerAgentFeedbackRoutes(app')
}

function moduleOwnsPublicRoutes(moduleSource = '') {
  return includesAll(moduleSource, AGENT_FEEDBACK_PUBLIC_ROUTE_MARKERS) &&
    String(moduleSource || '').includes('registerAgentFeedbackRoutes') &&
    String(moduleSource || '').includes('buildAgentFeedbackRoutesSplitDogfoodProof')
}

function serverNoLongerOwnsPublicRoutes(serverSource = '') {
  return excludesAll(serverSource, AGENT_FEEDBACK_PUBLIC_ROUTE_MARKERS)
}

function outOfScopeRoutesRemainOutsideModule(serverSource = '', moduleSource = '') {
  return hasRegistrar(serverSource) &&
    excludesAll(moduleSource, OUT_OF_SCOPE_ROUTE_MARKERS)
}

function proofScriptHasSafeRouteProbes(proofScriptSource = '') {
  return includesAll(proofScriptSource, [
    'invalid session token',
    'invalid submit token',
    'synthetic valid token invalid score',
    'row-count fingerprints stay unchanged',
    'metadata-only privacy proof',
  ])
}

function proofScriptDoesNotLogRawTokenMaterial(proofScriptSource = '') {
  const source = String(proofScriptSource || '')
  const forbidden = [
    'rawToken',
    'console.log(token',
    'tokenHash:',
    'session.tokenHash',
    'console.log(agentName',
    'console.log(improvementFeedback',
  ]
  return forbidden.every(marker => !source.includes(marker))
}

function evaluateAgentFeedbackRoutesSplit({ serverSource = '', moduleSource = '', proofScriptSource = '' } = {}) {
  const checks = {
    moduleOwnsPublicRoutes: moduleOwnsPublicRoutes(moduleSource),
    serverDelegates: hasRegistrar(serverSource),
    serverNoLongerOwnsPublicRoutes: serverNoLongerOwnsPublicRoutes(serverSource),
    outOfScopeRoutesRemainOutsideModule: outOfScopeRoutesRemainOutsideModule(serverSource, moduleSource),
    proofScriptHasSafeRouteProbes: proofScriptHasSafeRouteProbes(proofScriptSource),
    proofScriptDoesNotLogRawTokenMaterial: proofScriptDoesNotLogRawTokenMaterial(proofScriptSource),
  }
  return {
    ok: Object.values(checks).every(Boolean),
    checks,
  }
}

export function buildAgentFeedbackRoutesSplitDogfoodProof({ serverSource = '', moduleSource = '', proofScriptSource = '' } = {}) {
  const agentFeedbackSessionMarker = "app.get('/api/agent-feedback/" + "session'"
  const foundationDryRunMarker = "app.get('/api/foundation/agent-feedback-production-" + "dry-run'"
  const tokenLogMarker = 'console.log(token'
  const passing = evaluateAgentFeedbackRoutesSplit({ serverSource, moduleSource, proofScriptSource })
  const missingModule = evaluateAgentFeedbackRoutesSplit({ serverSource, moduleSource: '', proofScriptSource })
  const oldInlineServer = evaluateAgentFeedbackRoutesSplit({
    serverSource: `${serverSource}\n${AGENT_FEEDBACK_PUBLIC_ROUTE_MARKERS.join('\n')}`,
    moduleSource,
    proofScriptSource,
  })
  const missingRegistrar = evaluateAgentFeedbackRoutesSplit({
    serverSource: String(serverSource || '').replace('registerAgentFeedbackRoutes(app', 'registerAgentFeedbackRoutesMissing(app'),
    moduleSource,
    proofScriptSource,
  })
  const movedAdminDryRun = evaluateAgentFeedbackRoutesSplit({
    serverSource: String(serverSource || '').replace(foundationDryRunMarker, ''),
    moduleSource: `${moduleSource}\n${foundationDryRunMarker}`,
    proofScriptSource,
  })
  const weakProof = evaluateAgentFeedbackRoutesSplit({
    serverSource,
    moduleSource,
    proofScriptSource: 'substring-only proof without live route probes',
  })
  const tokenLeakProof = evaluateAgentFeedbackRoutesSplit({
    serverSource,
    moduleSource,
    proofScriptSource: `${proofScriptSource}\n${tokenLogMarker}`,
  })

  return {
    ok: passing.ok &&
      !missingModule.ok &&
      !oldInlineServer.ok &&
      !missingRegistrar.ok &&
      !movedAdminDryRun.ok &&
      !weakProof.ok &&
      !tokenLeakProof.ok,
    passing: passing.ok,
    rejected: {
      missingModule: !missingModule.ok,
      oldInlineServer: !oldInlineServer.ok,
      missingRegistrar: !missingRegistrar.ok,
      movedAdminDryRun: !movedAdminDryRun.ok,
      weakProof: !weakProof.ok,
      tokenLeakProof: !tokenLeakProof.ok,
    },
    summary: 'Agent Feedback route split dogfood accepts healthy public route ownership and rejects missing module, old inline server ownership, missing registrar, moved out-of-scope routes, weak proof, and raw token logging proof.',
    publicRouteMarker: agentFeedbackSessionMarker,
  }
}

export function registerAgentFeedbackRoutes(app, deps = {}) {
  const {
    cacheHeadersNoStore,
    sendApiError,
    verifyAgentFeedbackToken,
    getAgentOnboardingFeedbackResponseByTokenHash,
    getAgentOnboardingFeedbackResponseForMilestone,
    upsertAgentOnboardingFeedbackResponse,
    writeAgentFeedbackToClickUp,
    sendAgentFeedbackResponseNotification,
  } = deps

  app.get('/api/agent-feedback/session', async (req, res) => {
    try {
      const session = verifyAgentFeedbackToken(req.query.token)
      const [existingResponse, existingMilestoneResponse] = await Promise.all([
        getAgentOnboardingFeedbackResponseByTokenHash(session.tokenHash),
        getAgentOnboardingFeedbackResponseForMilestone({
          taskId: session.taskId,
          milestoneDay: session.milestoneDay,
        }),
      ])
      if (existingResponse || existingMilestoneResponse) {
        sendApiError(
          res,
          409,
          'agent_feedback_link_already_submitted',
          'This feedback link has already been submitted.'
        )
        return
      }
      cacheHeadersNoStore(res)
      res.json({
        agentName: session.agentName,
        milestoneDay: session.milestoneDay,
        scoreQuestion: 'On a scale of 1-10, how likely would you recommend the Benson Crew to another agent based on your first ' + session.milestoneDay + ' days?',
        improvementQuestion: 'If not a 10, what would make it a 10? Any positive or negative feedback is helpful.',
        privacyNote: 'This will only be read by Steve so you can be open and honest about what would make the experience better.',
      })
    } catch (error) {
      if (error instanceof Error && /already been used/i.test(error.message)) {
        sendApiError(
          res,
          409,
          'agent_feedback_link_already_submitted',
          'This feedback link has already been submitted.'
        )
        return
      }
      sendApiError(
        res,
        400,
        'invalid_agent_feedback_token',
        error instanceof Error ? error.message : 'Invalid feedback link.'
      )
    }
  })

  app.post('/api/agent-feedback/submit', async (req, res) => {
    try {
      const session = verifyAgentFeedbackToken(req.body?.token)
      const [existingResponse, existingMilestoneResponse] = await Promise.all([
        getAgentOnboardingFeedbackResponseByTokenHash(session.tokenHash),
        getAgentOnboardingFeedbackResponseForMilestone({
          taskId: session.taskId,
          milestoneDay: session.milestoneDay,
        }),
      ])
      if (existingResponse || existingMilestoneResponse) {
        sendApiError(
          res,
          409,
          'agent_feedback_link_already_submitted',
          'This feedback link has already been submitted.'
        )
        return
      }

      const score = Number(req.body?.score)
      const improvementFeedback = String(req.body?.improvementFeedback || '').trim().slice(0, 5000)

      if (!Number.isInteger(score) || score < 1 || score > 10) {
        sendApiError(res, 400, 'invalid_agent_feedback_score', 'Choose a score from 1 to 10.')
        return
      }

      const response = await upsertAgentOnboardingFeedbackResponse({
        tokenHash: session.tokenHash,
        clickUpTaskId: session.taskId,
        agentName: session.agentName,
        milestoneDay: session.milestoneDay,
        score,
        improvementFeedback,
        userAgent: req.get('user-agent') || '',
      })
      let clickUpWriteback = null
      try {
        const writebackResult = await writeAgentFeedbackToClickUp({
          taskId: session.taskId,
          milestoneDay: session.milestoneDay,
          score,
          improvementFeedback,
        })
        clickUpWriteback = {
          status: 'succeeded',
          repairStatus: 'none',
          ...writebackResult,
        }
      } catch (error) {
        clickUpWriteback = {
          status: 'failed',
          repairStatus: 'clickup_completed_writeback_failed',
          errorClass: error instanceof Error ? error.name : 'Error',
        }
      }

      const responseNotification = await sendAgentFeedbackResponseNotification({
        response,
        clickUpWriteback,
      })

      cacheHeadersNoStore(res)
      res.json({
        ok: true,
        submittedAt: response.submittedAt,
        clickUpWriteback,
        responseNotification: {
          status: responseNotification.status,
          recipientRoles: responseNotification.recipientRoles,
          duplicateBlocked: Boolean(responseNotification.duplicateBlocked),
          repairStatus: responseNotification.repairStatus || 'none',
        },
      })
    } catch (error) {
      if (error instanceof Error && /already been used/i.test(error.message)) {
        sendApiError(
          res,
          409,
          'agent_feedback_link_already_submitted',
          'This feedback link has already been submitted.'
        )
        return
      }
      sendApiError(
        res,
        400,
        'agent_feedback_submit_failed',
        error instanceof Error ? error.message : 'Failed to submit feedback.'
      )
    }
  })
}
