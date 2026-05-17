export const FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_CARD_ID = 'FRONTEND-CURRENT-STATE-RENDERERS-SPLIT-001'
export const FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_CLOSEOUT_KEY = 'frontend-current-state-renderers-split-v1'
export const FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_PLAN_PATH = 'docs/process/frontend-current-state-renderers-split-001-plan.md'
export const FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FRONTEND-CURRENT-STATE-RENDERERS-SPLIT-001.json'
export const FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_SCRIPT_PATH = 'scripts/process-frontend-current-state-renderers-split-check.mjs'
export const FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_SPRINT_ID = 'frontend-current-state-renderers-split-2026-05-15'
export const FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_BEFORE_LINES = 7710
export const FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_MAX_AFTER_LINES = 6500
export const FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_BEFORE_BYTES = 613839
export const FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_ROUTE_BUDGET_MS = 2000
export const FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_BYTE_GROWTH_LIMIT = 1.05

export const FRONTEND_CURRENT_STATE_SCRIPT_ORDER = [
  '/foundation-nav-config.js',
  '/foundation-data.js',
  '/foundation-doc-markdown-renderers.js',
  '/foundation.js',
  '/foundation-source-registry-renderers.js',
  '/foundation-fub-lead-source-renderers.js',
  '/foundation-system-inventory-renderers.js',
  '/foundation-current-state-renderers.js',
  '/foundation-source-lifecycle-renderers.js',
  '/foundation-runtime-renderers.js',
  '/foundation-operations-renderers.js',
  '/foundation-router.js',
]

export const FRONTEND_CURRENT_STATE_RENDERER_NAMES = [
  'renderFoundationSequenceCard',
  'renderCurrentStateLevelCard',
  'getCurrentStateSourceHref',
  'renderCurrentStateSourceStamp',
  'buildCurrentStateSourceLinks',
  'buildBacklogFocusHref',
  'getCurrentStateBacklogItems',
  'getCurrentStateActiveBacklogItems',
  'renderCurrentStateStatus',
  'renderCurrentStateBacklogCell',
  'renderCurrentStateCloseoutCard',
  'renderCurrentStateCloseoutBoard',
  'renderCurrentStateInfoList',
  'renderCurrentStatePackageParts',
  'renderCurrentStatePackageDetailTable',
  'renderCurrentStateSurfaceTable',
  'renderCurrentStateLevelGuide',
  'getPhaseGCard',
  'getPhaseGNextCard',
  'getPhaseGFollowingCard',
  'getCurrentSprintStageItems',
  'renderFoundationCurrentTruthPanel',
  'renderFoundationExecutionOrderPanel',
  'renderCurrentStateSurfaceCard',
  'renderCurrentStateSimpleCard',
  'summarizeStructureWorkbooks',
  'renderCurrentStateChangeWatchPanel',
  'renderOwnersReviewQueuePanel',
  'renderCurrentState',
]

export function extractFoundationCurrentStateScriptOrder(htmlSource = '') {
  const order = []
  const scriptPattern = /<script\s+[^>]*src="([^"]+)"[^>]*><\/script>/gi
  let match = scriptPattern.exec(htmlSource)
  while (match) {
    order.push(match[1].split('?')[0])
    match = scriptPattern.exec(htmlSource)
  }
  return order.filter(src => src.includes('foundation'))
}

export function evaluateFrontendCurrentStateScriptOrder(order = []) {
  const indexes = FRONTEND_CURRENT_STATE_SCRIPT_ORDER.map(src => order.indexOf(src))
  return {
    ok: indexes.every(index => index !== -1) &&
      indexes.every((index, idx) => idx === 0 || index > indexes[idx - 1]),
    order,
    required: FRONTEND_CURRENT_STATE_SCRIPT_ORDER,
    indexes,
  }
}

export function evaluateFrontendCurrentStateRendererSplit({
  foundationSource = '',
  currentStateSource = '',
  dataSource = '',
  runtimeSource = '',
  routerSource = '',
  htmlSource = '',
  lineCounts = {},
  routeGlobals = {},
  helperBehavior = {},
} = {}) {
  const order = evaluateFrontendCurrentStateScriptOrder(extractFoundationCurrentStateScriptOrder(htmlSource))
  const movedFunctionsFromMonolith = FRONTEND_CURRENT_STATE_RENDERER_NAMES.every(name => !foundationSource.includes(`function ${name}(`))
  const movedFunctionsToModule = FRONTEND_CURRENT_STATE_RENDERER_NAMES.every(name => currentStateSource.includes(`function ${name}(`))
  const dataDependenciesPresent = dataSource.includes('function fetchFoundationHub(') &&
    dataSource.includes('function fetchSourceOfTruth(') &&
    dataSource.includes('function fetchDoc(') &&
    dataSource.includes('function fetchSheetStructureStatus(')
  const routerDispatchPresent = routerSource.includes('renderCurrentState()')
  const sharedHelpersPresent = htmlSource.includes('/foundation-doc-markdown-renderers.js') &&
    runtimeSource.includes('function createActionLink(') &&
    runtimeSource.includes('function renderFoundationShortcutCard(')
  const afterLines = Number(lineCounts.after || 0)
  const beforeLines = Number(lineCounts.before || FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_BEFORE_LINES)
  const lineCountDecreased = afterLines > 0 && afterLines < beforeLines
  const lineCountUnderThreshold = afterLines > 0 && afterLines < FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_MAX_AFTER_LINES
  const routeGlobalsOk = routeGlobals.currentState === true &&
    routeGlobals.truthPanel === true &&
    routeGlobals.executionOrder === true &&
    routeGlobals.surfaceTable === true &&
    routeGlobals.sourceHref === true
  const helperBehaviorOk = helperBehavior.sourceLinks === true &&
    helperBehavior.backlogCell === true &&
    helperBehavior.surfaceTable === true &&
    helperBehavior.routeRender === true
  const missingModule = evaluateFrontendCurrentStateScriptOrder([
    '/foundation-nav-config.js',
    '/foundation-data.js',
    '/foundation-doc-markdown-renderers.js',
    '/foundation.js',
    '/foundation-source-registry-renderers.js',
    '/foundation-fub-lead-source-renderers.js',
    '/foundation-system-inventory-renderers.js',
    '/foundation-source-lifecycle-renderers.js',
    '/foundation-runtime-renderers.js',
    '/foundation-operations-renderers.js',
    '/foundation-router.js',
  ])
  const wrongOrder = evaluateFrontendCurrentStateScriptOrder([
    '/foundation-nav-config.js',
    '/foundation-data.js',
    '/foundation-current-state-renderers.js',
    '/foundation-doc-markdown-renderers.js',
    '/foundation.js',
    '/foundation-source-registry-renderers.js',
    '/foundation-fub-lead-source-renderers.js',
    '/foundation-system-inventory-renderers.js',
    '/foundation-source-lifecycle-renderers.js',
    '/foundation-runtime-renderers.js',
    '/foundation-operations-renderers.js',
    '/foundation-router.js',
  ])

  return {
    ok: order.ok &&
      movedFunctionsFromMonolith &&
      movedFunctionsToModule &&
      dataDependenciesPresent &&
      routerDispatchPresent &&
      sharedHelpersPresent &&
      lineCountDecreased &&
      lineCountUnderThreshold &&
      routeGlobalsOk &&
      helperBehaviorOk &&
      missingModule.ok === false &&
      wrongOrder.ok === false,
    invariant: 'Current State renderers live in their own module, public/foundation.js drops below 6,500 lines, route globals remain callable, and script order is enforced',
    order,
    movedFunctionsFromMonolith,
    movedFunctionsToModule,
    dataDependenciesPresent,
    routerDispatchPresent,
    sharedHelpersPresent,
    lineCounts: {
      before: beforeLines,
      after: afterLines,
      maxAfter: FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_MAX_AFTER_LINES,
    },
    routeGlobals,
    helperBehavior,
    oldFailures: {
      missingModuleRejected: missingModule.ok === false,
      wrongOrderRejected: wrongOrder.ok === false,
    },
  }
}
