import {
  AGENT_FEEDBACK_PUBLIC_ROUTE_MARKERS,
  AGENT_FEEDBACK_ROUTES_SPLIT_APPROVAL_PATH,
  AGENT_FEEDBACK_ROUTES_SPLIT_BEFORE_SERVER_LINES,
  AGENT_FEEDBACK_ROUTES_SPLIT_CARD_ID,
  AGENT_FEEDBACK_ROUTES_SPLIT_CLOSEOUT_KEY,
  AGENT_FEEDBACK_ROUTES_SPLIT_PLAN_PATH,
  AGENT_FEEDBACK_ROUTES_SPLIT_SCRIPT_PATH,
  AGENT_FEEDBACK_ROUTES_SPLIT_SPRINT_ID,
  buildAgentFeedbackRoutesSplitDogfoodProof,
} from './agent-feedback-routes.js'
import {
  APP_PAGE_ROUTES_SPLIT_APPROVAL_PATH,
  APP_PAGE_ROUTES_SPLIT_BEFORE_SERVER_LINES,
  APP_PAGE_ROUTES_SPLIT_CARD_ID,
  APP_PAGE_ROUTES_SPLIT_CLOSEOUT_KEY,
  APP_PAGE_ROUTES_SPLIT_PLAN_PATH,
  APP_PAGE_ROUTES_SPLIT_SCRIPT_PATH,
  APP_PAGE_ROUTES_SPLIT_SPRINT_ID,
  buildAppPageRoutesSplitDogfoodProof,
} from './app-page-routes.js'
import {
  AUTH_ROUTES_SPLIT_APPROVAL_PATH,
  AUTH_ROUTES_SPLIT_BEFORE_SERVER_LINES,
  AUTH_ROUTES_SPLIT_CARD_ID,
  AUTH_ROUTES_SPLIT_CLOSEOUT_KEY,
  AUTH_ROUTES_SPLIT_PLAN_PATH,
  AUTH_ROUTES_SPLIT_SCRIPT_PATH,
  AUTH_ROUTES_SPLIT_SPRINT_ID,
  buildAuthRoutesSplitDogfoodProof,
} from './auth-routes.js'
import {
  FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_APPROVAL_PATH,
  FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_BEFORE_SERVER_LINES,
  FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_CARD_ID,
  FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_PLAN_PATH,
  FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_SCRIPT_PATH,
  FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_SPRINT_ID,
  buildFoundationRuntimeReadRoutesSplitDogfoodProof,
} from './foundation-runtime-read-routes.js'
import {
  FOUNDATION_WRITE_ROUTE_MARKERS,
  FOUNDATION_WRITE_ROUTES_SPLIT_APPROVAL_PATH,
  FOUNDATION_WRITE_ROUTES_SPLIT_BEFORE_SERVER_LINES,
  FOUNDATION_WRITE_ROUTES_SPLIT_CARD_ID,
  FOUNDATION_WRITE_ROUTES_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_WRITE_ROUTES_SPLIT_PLAN_PATH,
  FOUNDATION_WRITE_ROUTES_SPLIT_SCRIPT_PATH,
  FOUNDATION_WRITE_ROUTES_SPLIT_SPRINT_ID,
  buildFoundationWriteRoutesSplitDogfoodProof,
} from './foundation-write-routes.js'
import {
  FUB_SOURCE_ROUTE_SPLIT_APPROVAL_PATH,
  FUB_SOURCE_ROUTE_SPLIT_BEFORE_SERVER_LINES,
  FUB_SOURCE_ROUTE_SPLIT_CARD_ID,
  FUB_SOURCE_ROUTE_SPLIT_CLOSEOUT_KEY,
  FUB_SOURCE_ROUTE_SPLIT_PLAN_PATH,
  FUB_SOURCE_ROUTE_SPLIT_SCRIPT_PATH,
  FUB_SOURCE_ROUTE_SPLIT_SPRINT_ID,
  buildFubSourceRouteSplitDogfoodProof,
} from './fub-source-routes.js'
import {
  HUB_READ_ROUTES_SPLIT_APPROVAL_PATH,
  HUB_READ_ROUTES_SPLIT_BEFORE_SERVER_LINES,
  HUB_READ_ROUTES_SPLIT_CARD_ID,
  HUB_READ_ROUTES_SPLIT_CLOSEOUT_KEY,
  HUB_READ_ROUTES_SPLIT_PLAN_PATH,
  HUB_READ_ROUTES_SPLIT_SCRIPT_PATH,
  HUB_READ_ROUTES_SPLIT_SPRINT_ID,
  buildHubReadRoutesSplitDogfoodProof,
} from './hub-read-routes.js'
import {
  STRATEGY_SHARED_COMMS_ROUTES_SPLIT_APPROVAL_PATH,
  STRATEGY_SHARED_COMMS_ROUTES_SPLIT_BEFORE_SERVER_LINES,
  STRATEGY_SHARED_COMMS_ROUTES_SPLIT_CARD_ID,
  STRATEGY_SHARED_COMMS_ROUTES_SPLIT_CLOSEOUT_KEY,
  STRATEGY_SHARED_COMMS_ROUTES_SPLIT_PLAN_PATH,
  STRATEGY_SHARED_COMMS_ROUTES_SPLIT_SCRIPT_PATH,
  STRATEGY_SHARED_COMMS_ROUTES_SPLIT_SPRINT_ID,
  buildStrategySharedCommsRoutesSplitDogfoodProof,
} from './strategy-shared-comms-routes.js'

export const VERIFIER_SERVER_ROUTE_SPLIT_MODULE_CARD_ID = 'VERIFIER-SERVER-ROUTE-SPLIT-MODULE-001'
export const VERIFIER_SERVER_ROUTE_SPLIT_MODULE_CLOSEOUT_KEY = 'verifier-server-route-split-module-v1'
export const VERIFIER_SERVER_ROUTE_SPLIT_MODULE_PLAN_PATH = 'docs/process/verifier-server-route-split-module-001-plan.md'
export const VERIFIER_SERVER_ROUTE_SPLIT_MODULE_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-SERVER-ROUTE-SPLIT-MODULE-001.json'
export const VERIFIER_SERVER_ROUTE_SPLIT_MODULE_SCRIPT_PATH = 'scripts/process-verifier-server-route-split-module-check.mjs'
export const VERIFIER_SERVER_ROUTE_SPLIT_MODULE_SPRINT_ID = 'verifier-server-route-split-module-2026-05-15'
export const VERIFIER_SERVER_ROUTE_SPLIT_MODULE_BEFORE_LINES = 15980

export const FOUNDATION_SERVER_ROUTE_SPLIT_VERIFIER_SOURCE_PATHS = {
  fubScript: FUB_SOURCE_ROUTE_SPLIT_SCRIPT_PATH,
  fubPlan: FUB_SOURCE_ROUTE_SPLIT_PLAN_PATH,
  runtimeScript: FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_SCRIPT_PATH,
  runtimePlan: FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_PLAN_PATH,
  appPageScript: APP_PAGE_ROUTES_SPLIT_SCRIPT_PATH,
  appPagePlan: APP_PAGE_ROUTES_SPLIT_PLAN_PATH,
  authScript: AUTH_ROUTES_SPLIT_SCRIPT_PATH,
  authPlan: AUTH_ROUTES_SPLIT_PLAN_PATH,
  hubReadScript: HUB_READ_ROUTES_SPLIT_SCRIPT_PATH,
  hubReadPlan: HUB_READ_ROUTES_SPLIT_PLAN_PATH,
  strategySharedCommsScript: STRATEGY_SHARED_COMMS_ROUTES_SPLIT_SCRIPT_PATH,
  strategySharedCommsPlan: STRATEGY_SHARED_COMMS_ROUTES_SPLIT_PLAN_PATH,
  foundationWriteScript: FOUNDATION_WRITE_ROUTES_SPLIT_SCRIPT_PATH,
  foundationWritePlan: FOUNDATION_WRITE_ROUTES_SPLIT_PLAN_PATH,
  agentFeedbackScript: AGENT_FEEDBACK_ROUTES_SPLIT_SCRIPT_PATH,
  agentFeedbackPlan: AGENT_FEEDBACK_ROUTES_SPLIT_PLAN_PATH,
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function findCard(cards = [], cardId) {
  return (cards || []).find(item => item.id === cardId) || null
}

function findCloseout(closeouts = [], closeoutKey) {
  return (closeouts || []).find(closeout => closeout.key === closeoutKey || closeout.closeoutKey === closeoutKey) || null
}

function lineCount(source = '') {
  return String(source || '').split('\n').length
}

function salesHubRouteSourceIncludes(input = {}, marker = '') {
  return `${input.serverSource || ''}\n${input.salesHubRoutesSource || ''}`.includes(marker)
}

function fallbackRepoFileExists() {
  return false
}

function activeSprintMatches(activeFoundationSprint, sprintId, cardId, activeSprintAtOrPast, card, closeout) {
  return activeFoundationSprint?.sprint?.sprintId === sprintId ||
    (typeof activeSprintAtOrPast === 'function' && activeSprintAtOrPast([cardId])) ||
    (card?.lane === 'done' &&
      closeout?.operatorCloseout === true &&
      (closeout.backlogIds || []).includes(cardId))
}

function cardStatusOrCloseoutReferences(card, closeout, closeoutKey) {
  return String(card?.statusNote || '').includes(closeoutKey) || closeout?.operatorCloseout === true
}

export async function evaluateFoundationServerRouteSplitVerifier(input = {}) {
  const checks = []
  const cards = input.foundationHub?.backlogItems || input.cards || []
  const closeouts = input.foundationBuildCloseouts || input.closeouts || []
  const packageScripts = input.packageJson?.scripts || input.packageScripts || {}
  const repoFileExists = input.repoFileExists || fallbackRepoFileExists
  const serverLineCount = lineCount(input.serverSource)

  const fubCard = findCard(cards, FUB_SOURCE_ROUTE_SPLIT_CARD_ID)
  const fubCloseout = findCloseout(closeouts, FUB_SOURCE_ROUTE_SPLIT_CLOSEOUT_KEY)
  const fubDogfood = buildFubSourceRouteSplitDogfoodProof({
    serverSource: input.serverSource,
    moduleSource: input.fubSourceRoutesSource,
    proofScriptSource: input.fubSourceRouteSplitScriptSource,
  })
  addCheck(
    checks,
    fubCard &&
      ['executing', 'done'].includes(fubCard.lane) &&
      cardStatusOrCloseoutReferences(fubCard, fubCloseout, FUB_SOURCE_ROUTE_SPLIT_CLOSEOUT_KEY) &&
      fubCloseout?.operatorCloseout === true &&
      (fubCloseout.backlogIds || []).includes(FUB_SOURCE_ROUTE_SPLIT_CARD_ID) &&
      fubDogfood.ok === true &&
      packageScripts['process:fub-source-route-split-check'] === `node --env-file-if-exists=.env ${FUB_SOURCE_ROUTE_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(FUB_SOURCE_ROUTE_SPLIT_PLAN_PATH) &&
      await repoFileExists(FUB_SOURCE_ROUTE_SPLIT_APPROVAL_PATH) &&
      await repoFileExists('docs/handoffs/2026-05-15-fub-source-route-split-closeout.md') &&
      input.fubSourceRoutesSource?.includes('registerFubSourceRoutes') &&
      input.fubSourceRoutesSource?.includes("app.get('/api/fub/health'") &&
      input.fubSourceRoutesSource?.includes("app.post('/api/fub/request'") &&
      input.fubSourceRouteSplitScriptSource?.includes('moved validation routes still reject invalid requests') &&
      input.fubSourceRouteSplitPlanSource?.includes('no success-path FUB refresh/lead-source sync is called by the proof') &&
      input.serverSource?.includes('registerFubSourceRoutes(app') &&
      !input.serverSource?.includes("app.get('/api/fub/health'") &&
      !input.serverSource?.includes("app.get('/api/fub/person'") &&
      !input.serverSource?.includes("app.post('/api/fub/request'") &&
      serverLineCount < FUB_SOURCE_ROUTE_SPLIT_BEFORE_SERVER_LINES &&
      input.currentPlan?.includes(FUB_SOURCE_ROUTE_SPLIT_CLOSEOUT_KEY) &&
      input.currentState?.includes(FUB_SOURCE_ROUTE_SPLIT_CLOSEOUT_KEY) &&
      activeSprintMatches(input.activeFoundationSprint, FUB_SOURCE_ROUTE_SPLIT_SPRINT_ID, FUB_SOURCE_ROUTE_SPLIT_CARD_ID, input.activeSprintAtOrPast, fubCard, fubCloseout) &&
      input.foundationVerifySource?.includes('evaluateFoundationServerRouteSplitVerifier') &&
      input.moduleSource?.includes('FUB_SOURCE_ROUTE_SPLIT_CARD_ID'),
    'FUB-SOURCE-ROUTE-SPLIT-001 extracts FUB source routes into a focused module',
    fubCard
      ? `lane=${fubCard.lane} dogfood=${fubDogfood.ok ? 'pass' : 'blocked'} lines=${FUB_SOURCE_ROUTE_SPLIT_BEFORE_SERVER_LINES}->${serverLineCount}`
      : `missing ${FUB_SOURCE_ROUTE_SPLIT_CARD_ID}`,
  )

  const runtimeCard = findCard(cards, FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_CARD_ID)
  const runtimeCloseout = findCloseout(closeouts, FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_CLOSEOUT_KEY)
  const runtimeDogfood = buildFoundationRuntimeReadRoutesSplitDogfoodProof({
    serverSource: input.serverSource,
    moduleSource: input.foundationRuntimeReadRoutesSource,
    proofScriptSource: input.foundationRuntimeReadRoutesSplitScriptSource,
  })
  addCheck(
    checks,
    runtimeCard &&
      ['executing', 'done'].includes(runtimeCard.lane) &&
      cardStatusOrCloseoutReferences(runtimeCard, runtimeCloseout, FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_CLOSEOUT_KEY) &&
      runtimeCloseout?.operatorCloseout === true &&
      (runtimeCloseout.backlogIds || []).includes(FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_CARD_ID) &&
      runtimeDogfood.ok === true &&
      packageScripts['process:foundation-runtime-read-routes-split-check'] === `node --env-file-if-exists=.env ${FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_PLAN_PATH) &&
      await repoFileExists(FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_APPROVAL_PATH) &&
      await repoFileExists('docs/handoffs/2026-05-15-foundation-runtime-read-routes-split-closeout.md') &&
      input.foundationRuntimeReadRoutesSource?.includes('registerFoundationRuntimeReadRoutes') &&
      input.foundationRuntimeReadRoutesSource?.includes("app.get('/api/foundation/jobs'") &&
      input.foundationRuntimeReadRoutesSource?.includes("app.get('/api/foundation/active-processes'") &&
      input.foundationRuntimeReadRoutesSource?.includes("app.get('/api/foundation/llm-runtime'") &&
      input.foundationRuntimeReadRoutesSource?.includes("app.get('/api/foundation/extraction-control'") &&
      !input.foundationRuntimeReadRoutesSource?.includes("app.post('/api/foundation/jobs/:jobKey/control'") &&
      !input.foundationRuntimeReadRoutesSource?.includes("app.post('/api/foundation/job-runs/:runId/stop'") &&
      !input.foundationRuntimeReadRoutesSource?.includes("app.post('/api/foundation/jobs/:jobKey/decommission'") &&
      input.foundationRuntimeReadRoutesSplitScriptSource?.includes('moved read routes return expected runtime status payloads without POSTing job-control mutations') &&
      input.foundationRuntimeReadRoutesSplitPlanSource?.includes('For server.js route or API work, the plan includes a performance budget') &&
      input.serverSource?.includes('registerFoundationRuntimeReadRoutes(app') &&
      !input.serverSource?.includes("app.get('/api/foundation/jobs'") &&
      !input.serverSource?.includes("app.get('/api/foundation/active-processes'") &&
      !input.serverSource?.includes("app.get('/api/foundation/llm-runtime'") &&
      !input.serverSource?.includes("app.get('/api/foundation/extraction-control'") &&
      input.foundationWriteRouteSource?.includes("app.post('/api/foundation/jobs/:jobKey/control'") &&
      serverLineCount < FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_BEFORE_SERVER_LINES &&
      input.currentPlan?.includes(FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_CLOSEOUT_KEY) &&
      input.currentState?.includes(FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_CLOSEOUT_KEY) &&
      activeSprintMatches(input.activeFoundationSprint, FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_SPRINT_ID, FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_CARD_ID, input.activeSprintAtOrPast, runtimeCard, runtimeCloseout) &&
      input.foundationVerifySource?.includes('evaluateFoundationServerRouteSplitVerifier') &&
      input.moduleSource?.includes('FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_CARD_ID'),
    'FOUNDATION-RUNTIME-READ-ROUTES-SPLIT-001 extracts Foundation runtime read routes into a focused module',
    runtimeCard
      ? `lane=${runtimeCard.lane} dogfood=${runtimeDogfood.ok ? 'pass' : 'blocked'} lines=${FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_BEFORE_SERVER_LINES}->${serverLineCount}`
      : `missing ${FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_CARD_ID}`,
  )

  const appPageCard = findCard(cards, APP_PAGE_ROUTES_SPLIT_CARD_ID)
  const appPageCloseout = findCloseout(closeouts, APP_PAGE_ROUTES_SPLIT_CLOSEOUT_KEY)
  const appPageDogfood = buildAppPageRoutesSplitDogfoodProof({
    serverSource: input.serverSource,
    moduleSource: input.appPageRoutesSource,
    proofScriptSource: input.appPageRoutesSplitScriptSource,
  })
  addCheck(
    checks,
    appPageCard &&
      ['executing', 'done'].includes(appPageCard.lane) &&
      cardStatusOrCloseoutReferences(appPageCard, appPageCloseout, APP_PAGE_ROUTES_SPLIT_CLOSEOUT_KEY) &&
      appPageCloseout?.operatorCloseout === true &&
      (appPageCloseout.backlogIds || []).includes(APP_PAGE_ROUTES_SPLIT_CARD_ID) &&
      appPageDogfood.ok === true &&
      packageScripts['process:app-page-routes-split-check'] === `node --env-file-if-exists=.env ${APP_PAGE_ROUTES_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(APP_PAGE_ROUTES_SPLIT_PLAN_PATH) &&
      await repoFileExists(APP_PAGE_ROUTES_SPLIT_APPROVAL_PATH) &&
      await repoFileExists('docs/handoffs/2026-05-15-app-page-routes-split-closeout.md') &&
      input.appPageRoutesSource?.includes('registerAppPageRoutes') &&
      input.appPageRoutesSource?.includes("app.get('/doc'") &&
      input.appPageRoutesSource?.includes("app.get('/foundation'") &&
      input.appPageRoutesSource?.includes("app.get('/foundation/export/strategy'") &&
      input.appPageRoutesSource?.includes("app.get('/strategic-execution'") &&
      input.appPageRoutesSource?.includes("app.get('/sales'") &&
      input.appPageRoutesSource?.includes("app.get('/ops'") &&
      input.appPageRoutesSource?.includes("app.get('/agent-feedback'") &&
      input.appPageRoutesSource?.includes("app.use('/api'") &&
      input.appPageRoutesSource?.includes("app.get('/'") &&
      input.appPageRoutesSource?.includes("app.get('*'") &&
      !input.appPageRoutesSource?.includes("app.get('/foundation/export/strategy.pdf'") &&
      input.appPageRoutesSplitScriptSource?.includes('moved page and fallback routes return expected HTML/API fallback payloads') &&
      input.appPageRoutesSplitPlanSource?.includes('Strategy PDF export route stays in `server.js`') &&
      input.serverSource?.includes('registerAppPageRoutes(app') &&
      input.serverSource?.includes("app.get('/foundation/export/strategy.pdf'") &&
      !input.serverSource?.includes("app.get('/doc'") &&
      !input.serverSource?.includes("app.get('/foundation', requirePageAccess('owner')") &&
      !input.serverSource?.includes("app.get('/foundation/export/strategy', requirePageAccess('owner')") &&
      !input.serverSource?.includes("app.get('/strategic-execution'") &&
      !input.serverSource?.includes("app.get('/sales'") &&
      !input.serverSource?.includes("app.get('/ops'") &&
      !input.serverSource?.includes("app.get('/agent-feedback'") &&
      !input.serverSource?.includes("app.use('/api'") &&
      !input.serverSource?.includes("app.get('/', requirePageAccess('home')") &&
      !input.serverSource?.includes("app.get('*', requirePageAccess('owner')") &&
      serverLineCount < APP_PAGE_ROUTES_SPLIT_BEFORE_SERVER_LINES &&
      input.currentPlan?.includes(APP_PAGE_ROUTES_SPLIT_CLOSEOUT_KEY) &&
      input.currentState?.includes(APP_PAGE_ROUTES_SPLIT_CLOSEOUT_KEY) &&
      activeSprintMatches(input.activeFoundationSprint, APP_PAGE_ROUTES_SPLIT_SPRINT_ID, APP_PAGE_ROUTES_SPLIT_CARD_ID, input.activeSprintAtOrPast, appPageCard, appPageCloseout) &&
      input.foundationVerifySource?.includes('evaluateFoundationServerRouteSplitVerifier') &&
      input.moduleSource?.includes('APP_PAGE_ROUTES_SPLIT_CARD_ID'),
    'APP-PAGE-ROUTES-SPLIT-001 extracts app page and fallback routes into a focused module',
    appPageCard
      ? `lane=${appPageCard.lane} dogfood=${appPageDogfood.ok ? 'pass' : 'blocked'} lines=${APP_PAGE_ROUTES_SPLIT_BEFORE_SERVER_LINES}->${serverLineCount}`
      : `missing ${APP_PAGE_ROUTES_SPLIT_CARD_ID}`,
  )

  const authCard = findCard(cards, AUTH_ROUTES_SPLIT_CARD_ID)
  const authCloseout = findCloseout(closeouts, AUTH_ROUTES_SPLIT_CLOSEOUT_KEY)
  const authDogfood = buildAuthRoutesSplitDogfoodProof({
    serverSource: input.serverSource,
    moduleSource: input.authRoutesSource,
    proofScriptSource: input.authRoutesSplitScriptSource,
  })
  addCheck(
    checks,
    authCard &&
      ['executing', 'done'].includes(authCard.lane) &&
      cardStatusOrCloseoutReferences(authCard, authCloseout, AUTH_ROUTES_SPLIT_CLOSEOUT_KEY) &&
      authCloseout?.operatorCloseout === true &&
      (authCloseout.backlogIds || []).includes(AUTH_ROUTES_SPLIT_CARD_ID) &&
      authDogfood.ok === true &&
      packageScripts['process:auth-routes-split-check'] === `node --env-file-if-exists=.env ${AUTH_ROUTES_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(AUTH_ROUTES_SPLIT_PLAN_PATH) &&
      await repoFileExists(AUTH_ROUTES_SPLIT_APPROVAL_PATH) &&
      await repoFileExists('docs/handoffs/2026-05-15-auth-routes-split-closeout.md') &&
      input.authRoutesSource?.includes('registerAuthRoutes') &&
      input.authRoutesSource?.includes("app.get('/login'") &&
      input.authRoutesSource?.includes("app.post('/api/auth/login'") &&
      input.authRoutesSource?.includes("app.post('/api/auth/google'") &&
      input.authRoutesSource?.includes("app.get('/api/auth/session'") &&
      input.authRoutesSource?.includes("app.post('/api/auth/logout'") &&
      input.authRoutesSource?.includes('express.static') &&
      input.authRoutesSplitScriptSource?.includes('moved auth/session/static routes return expected behavior') &&
      input.authRoutesSplitPlanSource?.includes('Do not rewrite auth providers.') &&
      input.serverSource?.includes('registerAuthRoutes(app') &&
      !input.serverSource?.includes("app.get('/login'") &&
      !input.serverSource?.includes("app.post('/api/auth/login'") &&
      !input.serverSource?.includes("app.post('/api/auth/google'") &&
      !input.serverSource?.includes("app.get('/api/auth/session'") &&
      !input.serverSource?.includes("app.post('/api/auth/logout'") &&
      !input.serverSource?.includes('app.use(setSecurityHeaders)') &&
      !input.serverSource?.includes('app.use(logApiRequest)') &&
      serverLineCount < AUTH_ROUTES_SPLIT_BEFORE_SERVER_LINES &&
      input.currentPlan?.includes(AUTH_ROUTES_SPLIT_CLOSEOUT_KEY) &&
      input.currentState?.includes(AUTH_ROUTES_SPLIT_CLOSEOUT_KEY) &&
      activeSprintMatches(input.activeFoundationSprint, AUTH_ROUTES_SPLIT_SPRINT_ID, AUTH_ROUTES_SPLIT_CARD_ID, input.activeSprintAtOrPast, authCard, authCloseout) &&
      input.foundationVerifySource?.includes('evaluateFoundationServerRouteSplitVerifier') &&
      input.moduleSource?.includes('AUTH_ROUTES_SPLIT_CARD_ID'),
    'AUTH-ROUTES-SPLIT-001 extracts auth/session/static routes into a focused module',
    authCard
      ? `lane=${authCard.lane} dogfood=${authDogfood.ok ? 'pass' : 'blocked'} lines=${AUTH_ROUTES_SPLIT_BEFORE_SERVER_LINES}->${serverLineCount}`
      : `missing ${AUTH_ROUTES_SPLIT_CARD_ID}`,
  )

  const hubReadCard = findCard(cards, HUB_READ_ROUTES_SPLIT_CARD_ID)
  const hubReadCloseout = findCloseout(closeouts, HUB_READ_ROUTES_SPLIT_CLOSEOUT_KEY)
  const hubReadDogfood = buildHubReadRoutesSplitDogfoodProof({
    serverSource: input.serverSource,
    moduleSource: input.hubReadRoutesSource,
    proofScriptSource: input.hubReadRoutesSplitScriptSource,
  })
  addCheck(
    checks,
    hubReadCard &&
      ['executing', 'done'].includes(hubReadCard.lane) &&
      cardStatusOrCloseoutReferences(hubReadCard, hubReadCloseout, HUB_READ_ROUTES_SPLIT_CLOSEOUT_KEY) &&
      hubReadCloseout?.operatorCloseout === true &&
      (hubReadCloseout.backlogIds || []).includes(HUB_READ_ROUTES_SPLIT_CARD_ID) &&
      hubReadDogfood.ok === true &&
      packageScripts['process:hub-read-routes-split-check'] === `node --env-file-if-exists=.env ${HUB_READ_ROUTES_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(HUB_READ_ROUTES_SPLIT_PLAN_PATH) &&
      await repoFileExists(HUB_READ_ROUTES_SPLIT_APPROVAL_PATH) &&
      await repoFileExists('docs/handoffs/2026-05-15-hub-read-routes-split-closeout.md') &&
      input.hubReadRoutesSource?.includes('registerHubReadRoutes') &&
      input.hubReadRoutesSource?.includes("app.get('/api/foundation-hub'") &&
      input.hubReadRoutesSource?.includes("app.get('/api/foundation/current-sprint'") &&
      input.hubReadRoutesSource?.includes("app.get('/api/ops-hub'") &&
      input.hubReadRoutesSource?.includes("app.get('/api/sales-hub'") &&
      !input.hubReadRoutesSource?.includes("app.post('/api/sales-hub/listing-assignment'") &&
      input.hubReadRoutesSplitScriptSource?.includes('moved hub read routes return expected behavior') &&
      input.hubReadRoutesSplitScriptSource?.includes('Sales write routes remain in server.js') &&
      input.hubReadRoutesSplitPlanSource?.includes('No Sales write route moves.') &&
      input.hubReadRoutesSplitPlanSource?.includes('No payload expansion.') &&
      input.serverSource?.includes('registerHubReadRoutes(app') &&
      !input.serverSource?.includes("app.get('/api/foundation-hub'") &&
      !input.serverSource?.includes("app.get('/api/foundation/current-sprint'") &&
      !input.serverSource?.includes("app.get('/api/ops-hub'") &&
      !input.serverSource?.includes("app.get('/api/sales-hub'") &&
      salesHubRouteSourceIncludes(input, "app.post('/api/sales-hub/listing-assignment'") &&
      serverLineCount < HUB_READ_ROUTES_SPLIT_BEFORE_SERVER_LINES &&
      input.currentPlan?.includes(HUB_READ_ROUTES_SPLIT_CLOSEOUT_KEY) &&
      input.currentState?.includes(HUB_READ_ROUTES_SPLIT_CLOSEOUT_KEY) &&
      activeSprintMatches(input.activeFoundationSprint, HUB_READ_ROUTES_SPLIT_SPRINT_ID, HUB_READ_ROUTES_SPLIT_CARD_ID, input.activeSprintAtOrPast, hubReadCard, hubReadCloseout) &&
      input.foundationVerifySource?.includes('evaluateFoundationServerRouteSplitVerifier') &&
      input.moduleSource?.includes('HUB_READ_ROUTES_SPLIT_CARD_ID'),
    'HUB-READ-ROUTES-SPLIT-001 extracts hub read routes into a focused module',
    hubReadCard
      ? `lane=${hubReadCard.lane} dogfood=${hubReadDogfood.ok ? 'pass' : 'blocked'} lines=${HUB_READ_ROUTES_SPLIT_BEFORE_SERVER_LINES}->${serverLineCount}`
      : `missing ${HUB_READ_ROUTES_SPLIT_CARD_ID}`,
  )

  const strategyCard = findCard(cards, STRATEGY_SHARED_COMMS_ROUTES_SPLIT_CARD_ID)
  const strategyCloseout = findCloseout(closeouts, STRATEGY_SHARED_COMMS_ROUTES_SPLIT_CLOSEOUT_KEY)
  const strategyDogfood = buildStrategySharedCommsRoutesSplitDogfoodProof({
    serverSource: input.serverSource,
    moduleSource: input.strategySharedCommsRoutesSource,
    proofScriptSource: input.strategySharedCommsRoutesSplitScriptSource,
  })
  addCheck(
    checks,
    strategyCard &&
      ['executing', 'done'].includes(strategyCard.lane) &&
      cardStatusOrCloseoutReferences(strategyCard, strategyCloseout, STRATEGY_SHARED_COMMS_ROUTES_SPLIT_CLOSEOUT_KEY) &&
      strategyCloseout?.operatorCloseout === true &&
      (strategyCloseout.backlogIds || []).includes(STRATEGY_SHARED_COMMS_ROUTES_SPLIT_CARD_ID) &&
      strategyDogfood.ok === true &&
      packageScripts['process:strategy-shared-comms-routes-split-check'] === `node --env-file-if-exists=.env ${STRATEGY_SHARED_COMMS_ROUTES_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(STRATEGY_SHARED_COMMS_ROUTES_SPLIT_PLAN_PATH) &&
      await repoFileExists(STRATEGY_SHARED_COMMS_ROUTES_SPLIT_APPROVAL_PATH) &&
      await repoFileExists('docs/handoffs/2026-05-15-strategy-shared-comms-routes-split-closeout.md') &&
      input.strategySharedCommsRoutesSource?.includes('registerStrategySharedCommsRoutes') &&
      input.strategySharedCommsRoutesSource?.includes("app.get('/api/shared-communications/archive'") &&
      input.strategySharedCommsRoutesSource?.includes("app.post('/api/shared-communications/candidates/:candidateKey/apply-to-decision'") &&
      input.strategySharedCommsRoutesSource?.includes("app.get('/api/strategic-execution/v2'") &&
      input.strategySharedCommsRoutesSource?.includes("app.post('/api/strategic-execution/action-routes/:routeId/review'") &&
      input.strategySharedCommsRoutesSource?.includes("app.get('/api/foundation/action-review'") &&
      input.strategySharedCommsRoutesSource?.includes('buildStrategyHubV2Payload') &&
      input.strategySharedCommsRoutesSource?.includes('buildFoundationActionReviewSnapshot') &&
      input.strategySharedCommsRoutesSplitScriptSource?.includes('safe invalid POST probes fail before mutation') &&
      input.strategySharedCommsRoutesSplitPlanSource?.includes('No direct Foundation write route extraction.') &&
      input.strategySharedCommsRoutesSplitPlanSource?.includes('No Sales route movement.') &&
      input.serverSource?.includes('registerStrategySharedCommsRoutes(app') &&
      !input.serverSource?.includes("app.get('/api/shared-communications/archive'") &&
      !input.serverSource?.includes("app.get('/api/strategic-execution/v2'") &&
      !input.serverSource?.includes("app.post('/api/strategic-execution/action-routes/:routeId/review'") &&
      !input.serverSource?.includes("app.get('/api/foundation/action-review'") &&
      input.foundationWriteRouteSource?.includes("app.post('/api/foundation/backlog'") &&
      salesHubRouteSourceIncludes(input, "app.post('/api/sales-hub/listing-assignment'") &&
      input.agentFeedbackRouteSource?.includes("app.get('/api/agent-feedback/session'") &&
      serverLineCount < STRATEGY_SHARED_COMMS_ROUTES_SPLIT_BEFORE_SERVER_LINES &&
      input.currentPlan?.includes(STRATEGY_SHARED_COMMS_ROUTES_SPLIT_CLOSEOUT_KEY) &&
      input.currentState?.includes(STRATEGY_SHARED_COMMS_ROUTES_SPLIT_CLOSEOUT_KEY) &&
      activeSprintMatches(input.activeFoundationSprint, STRATEGY_SHARED_COMMS_ROUTES_SPLIT_SPRINT_ID, STRATEGY_SHARED_COMMS_ROUTES_SPLIT_CARD_ID, input.activeSprintAtOrPast, strategyCard, strategyCloseout) &&
      input.foundationVerifySource?.includes('evaluateFoundationServerRouteSplitVerifier') &&
      input.moduleSource?.includes('STRATEGY_SHARED_COMMS_ROUTES_SPLIT_CARD_ID'),
    'STRATEGY-SHARED-COMMS-ROUTES-SPLIT-001 extracts Strategy/shared communications routes into a focused module',
    strategyCard
      ? `lane=${strategyCard.lane} dogfood=${strategyDogfood.ok ? 'pass' : 'blocked'} lines=${STRATEGY_SHARED_COMMS_ROUTES_SPLIT_BEFORE_SERVER_LINES}->${serverLineCount}`
      : `missing ${STRATEGY_SHARED_COMMS_ROUTES_SPLIT_CARD_ID}`,
  )

  const writeCard = findCard(cards, FOUNDATION_WRITE_ROUTES_SPLIT_CARD_ID)
  const writeCloseout = findCloseout(closeouts, FOUNDATION_WRITE_ROUTES_SPLIT_CLOSEOUT_KEY)
  const currentOutOfScopeRouteSource = `${input.serverSource || ''}\n${input.salesHubRoutesSource || ''}`
  const writeDogfood = buildFoundationWriteRoutesSplitDogfoodProof({
    serverSource: currentOutOfScopeRouteSource,
    moduleSource: input.foundationWriteRoutesSource,
    proofScriptSource: input.foundationWriteRoutesSplitScriptSource,
  })
  addCheck(
    checks,
    writeCard &&
      ['executing', 'done'].includes(writeCard.lane) &&
      cardStatusOrCloseoutReferences(writeCard, writeCloseout, FOUNDATION_WRITE_ROUTES_SPLIT_CLOSEOUT_KEY) &&
      writeCloseout?.operatorCloseout === true &&
      (writeCloseout.backlogIds || []).includes(FOUNDATION_WRITE_ROUTES_SPLIT_CARD_ID) &&
      writeDogfood.ok === true &&
      packageScripts['process:foundation-write-routes-split-check'] === `node --env-file-if-exists=.env ${FOUNDATION_WRITE_ROUTES_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(FOUNDATION_WRITE_ROUTES_SPLIT_PLAN_PATH) &&
      await repoFileExists(FOUNDATION_WRITE_ROUTES_SPLIT_APPROVAL_PATH) &&
      await repoFileExists('docs/handoffs/2026-05-15-foundation-write-routes-split-closeout.md') &&
      input.foundationWriteRoutesSource?.includes('registerFoundationWriteRoutes') &&
      FOUNDATION_WRITE_ROUTE_MARKERS.every(marker => input.foundationWriteRoutesSource?.includes(marker)) &&
      input.foundationWriteRoutesSource?.includes('createBacklogItem') &&
      input.foundationWriteRoutesSource?.includes('updateFoundationJobControl') &&
      input.foundationWriteRoutesSource?.includes('markPendingDocUpdateApplied') &&
      input.foundationWriteRoutesSplitScriptSource?.includes('safe invalid write probes do not change live truth row counts') &&
      input.foundationWriteRoutesSplitScriptSource?.includes('invalid doc update create') &&
      input.foundationWriteRoutesSplitScriptSource?.includes('job control decommission misuse') &&
      input.foundationWriteRoutesSplitPlanSource?.includes('No Sales route movement.') &&
      input.foundationWriteRoutesSplitPlanSource?.includes('No Agent Feedback route movement.') &&
      input.serverSource?.includes('registerFoundationWriteRoutes(app') &&
      FOUNDATION_WRITE_ROUTE_MARKERS.every(marker => !input.serverSource?.includes(marker)) &&
      salesHubRouteSourceIncludes(input, "app.post('/api/sales-hub/listing-assignment'") &&
      input.agentFeedbackRouteSource?.includes("app.get('/api/agent-feedback/session'") &&
      input.serverSource?.includes("app.post('/api/intelligence/evidence'") &&
      serverLineCount < FOUNDATION_WRITE_ROUTES_SPLIT_BEFORE_SERVER_LINES &&
      serverLineCount < 5000 &&
      input.currentPlan?.includes(FOUNDATION_WRITE_ROUTES_SPLIT_CLOSEOUT_KEY) &&
      input.currentState?.includes(FOUNDATION_WRITE_ROUTES_SPLIT_CLOSEOUT_KEY) &&
      activeSprintMatches(input.activeFoundationSprint, FOUNDATION_WRITE_ROUTES_SPLIT_SPRINT_ID, FOUNDATION_WRITE_ROUTES_SPLIT_CARD_ID, input.activeSprintAtOrPast, writeCard, writeCloseout) &&
      input.foundationVerifySource?.includes('evaluateFoundationServerRouteSplitVerifier') &&
      input.moduleSource?.includes('FOUNDATION_WRITE_ROUTES_SPLIT_CARD_ID'),
    'FOUNDATION-WRITE-ROUTES-SPLIT-001 extracts direct Foundation write routes into a focused module',
    writeCard
      ? `lane=${writeCard.lane} dogfood=${writeDogfood.ok ? 'pass' : 'blocked'} lines=${FOUNDATION_WRITE_ROUTES_SPLIT_BEFORE_SERVER_LINES}->${serverLineCount}`
      : `missing ${FOUNDATION_WRITE_ROUTES_SPLIT_CARD_ID}`,
  )

  const feedbackCard = findCard(cards, AGENT_FEEDBACK_ROUTES_SPLIT_CARD_ID)
  const feedbackCloseout = findCloseout(closeouts, AGENT_FEEDBACK_ROUTES_SPLIT_CLOSEOUT_KEY)
  const feedbackDogfood = buildAgentFeedbackRoutesSplitDogfoodProof({
    serverSource: currentOutOfScopeRouteSource,
    moduleSource: input.agentFeedbackRoutesSource,
    proofScriptSource: input.agentFeedbackRoutesSplitScriptSource,
  })
  addCheck(
    checks,
    feedbackCard &&
      ['executing', 'done'].includes(feedbackCard.lane) &&
      cardStatusOrCloseoutReferences(feedbackCard, feedbackCloseout, AGENT_FEEDBACK_ROUTES_SPLIT_CLOSEOUT_KEY) &&
      feedbackCloseout?.operatorCloseout === true &&
      (feedbackCloseout.backlogIds || []).includes(AGENT_FEEDBACK_ROUTES_SPLIT_CARD_ID) &&
      feedbackDogfood.ok === true &&
      packageScripts['process:agent-feedback-routes-split-check'] === `node --env-file-if-exists=.env ${AGENT_FEEDBACK_ROUTES_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(AGENT_FEEDBACK_ROUTES_SPLIT_PLAN_PATH) &&
      await repoFileExists(AGENT_FEEDBACK_ROUTES_SPLIT_APPROVAL_PATH) &&
      await repoFileExists('docs/handoffs/2026-05-15-agent-feedback-routes-split-closeout.md') &&
      input.agentFeedbackRoutesSource?.includes('registerAgentFeedbackRoutes') &&
      AGENT_FEEDBACK_PUBLIC_ROUTE_MARKERS.every(marker => input.agentFeedbackRoutesSource?.includes(marker)) &&
      input.agentFeedbackRoutesSource?.includes('verifyAgentFeedbackToken') &&
      input.agentFeedbackRoutesSource?.includes('writeAgentFeedbackToClickUp') &&
      input.agentFeedbackRoutesSource?.includes('sendAgentFeedbackResponseNotification') &&
      input.agentFeedbackRoutesSplitScriptSource?.includes('row-count fingerprints stay unchanged') &&
      input.agentFeedbackRoutesSplitScriptSource?.includes('metadata-only privacy proof') &&
      input.agentFeedbackRoutesSplitScriptSource?.includes('synthetic valid token invalid score') &&
      input.agentFeedbackRoutesSplitPlanSource?.includes('Do not submit real feedback.') &&
      (
        input.agentFeedbackRoutesSplitPlanSource?.includes('No ClickUp/Gmail/notification mutation from proof.') ||
        input.agentFeedbackRoutesSplitPlanSource?.includes('Do not write ClickUp, Gmail, reminders, or response notifications from the focused proof.')
      ) &&
      input.serverSource?.includes('registerAgentFeedbackRoutes(app') &&
      AGENT_FEEDBACK_PUBLIC_ROUTE_MARKERS.every(marker => !input.serverSource?.includes(marker)) &&
      input.serverSource?.includes("app.get('/api/foundation/agent-feedback-production-dry-run'") &&
      input.serverSource?.includes("app.get('/api/ops/agent-feedback-production-dry-run'") &&
      input.foundationWriteRouteSource?.includes("app.post('/api/foundation/backlog'") &&
      salesHubRouteSourceIncludes(input, "app.post('/api/sales-hub/listing-assignment'") &&
      serverLineCount < AGENT_FEEDBACK_ROUTES_SPLIT_BEFORE_SERVER_LINES &&
      serverLineCount < 5000 &&
      input.currentPlan?.includes(AGENT_FEEDBACK_ROUTES_SPLIT_CLOSEOUT_KEY) &&
      input.currentState?.includes(AGENT_FEEDBACK_ROUTES_SPLIT_CLOSEOUT_KEY) &&
      activeSprintMatches(input.activeFoundationSprint, AGENT_FEEDBACK_ROUTES_SPLIT_SPRINT_ID, AGENT_FEEDBACK_ROUTES_SPLIT_CARD_ID, input.activeSprintAtOrPast, feedbackCard, feedbackCloseout) &&
      input.foundationVerifySource?.includes('evaluateFoundationServerRouteSplitVerifier') &&
      input.moduleSource?.includes('AGENT_FEEDBACK_ROUTES_SPLIT_CARD_ID'),
    'AGENT-FEEDBACK-ROUTES-SPLIT-001 extracts public Agent Feedback session/submit routes into a focused module',
    feedbackCard
      ? `lane=${feedbackCard.lane} dogfood=${feedbackDogfood.ok ? 'pass' : 'blocked'} lines=${AGENT_FEEDBACK_ROUTES_SPLIT_BEFORE_SERVER_LINES}->${serverLineCount}`
      : `missing ${AGENT_FEEDBACK_ROUTES_SPLIT_CARD_ID}`,
  )

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    checks,
    failed,
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
      serverLineCount,
    },
  }
}

export async function buildFoundationServerRouteSplitVerifierDogfoodProof(input = {}) {
  const healthy = await evaluateFoundationServerRouteSplitVerifier(input)
  const missingModule = await evaluateFoundationServerRouteSplitVerifier({
    ...input,
    fubSourceRoutesSource: '',
  })
  const oldInlineServer = await evaluateFoundationServerRouteSplitVerifier({
    ...input,
    serverSource: `${input.serverSource || ''}\napp.get('/api/fub/health', requireAdminToken, async (_req, res) => res.json({ ok: true }))`,
  })
  const missingRegistrar = await evaluateFoundationServerRouteSplitVerifier({
    ...input,
    serverSource: String(input.serverSource || '').replace('registerHubReadRoutes(app', 'registerHubReadRoutesMissing(app'),
  })
  const movedOutOfScope = await evaluateFoundationServerRouteSplitVerifier({
    ...input,
    serverSource: String(input.serverSource || '').replace("app.post('/api/sales-hub/listing-assignment'", ''),
    salesHubRoutesSource: String(input.salesHubRoutesSource || '').replace("app.post('/api/sales-hub/listing-assignment'", ''),
    foundationWriteRoutesSource: `${input.foundationWriteRoutesSource || ''}\napp.post('/api/sales-hub/listing-assignment'`,
  })
  const weakProof = await evaluateFoundationServerRouteSplitVerifier({
    ...input,
    foundationWriteRoutesSplitScriptSource: 'substring-only proof',
  })

  return {
    ok: healthy.ok === true &&
      missingModule.ok === false &&
      oldInlineServer.ok === false &&
      missingRegistrar.ok === false &&
      movedOutOfScope.ok === false &&
      weakProof.ok === false,
    healthy,
    rejected: {
      missingModule: missingModule.ok === false,
      oldInlineServer: oldInlineServer.ok === false,
      missingRegistrar: missingRegistrar.ok === false,
      movedOutOfScope: movedOutOfScope.ok === false,
      weakProof: weakProof.ok === false,
    },
    invariant: 'The server-route split verifier accepts the healthy split route state and rejects missing route module ownership, old inline server route ownership, missing registrars, moved out-of-scope routes, and weak substring-only proof scripts.',
  }
}
