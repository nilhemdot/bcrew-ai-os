export const FRONTEND_OPERATIONS_RENDERERS_SPLIT_CARD_ID = 'FRONTEND-OPERATIONS-RENDERERS-SPLIT-001'
export const FRONTEND_OPERATIONS_RENDERERS_SPLIT_CLOSEOUT_KEY = 'frontend-operations-renderers-split-v1'
export const FRONTEND_OPERATIONS_RENDERERS_SPLIT_PLAN_PATH = 'docs/process/frontend-operations-renderers-split-001-plan.md'
export const FRONTEND_OPERATIONS_RENDERERS_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FRONTEND-OPERATIONS-RENDERERS-SPLIT-001.json'
export const FRONTEND_OPERATIONS_RENDERERS_SPLIT_SCRIPT_PATH = 'scripts/process-frontend-operations-renderers-split-check.mjs'
export const FRONTEND_OPERATIONS_RENDERERS_SPLIT_SPRINT_ID = 'frontend-operations-renderers-split-2026-05-15'
export const FRONTEND_OPERATIONS_RENDERERS_SPLIT_BEFORE_LINES = 15305
export const FRONTEND_OPERATIONS_RENDERERS_SPLIT_BEFORE_BYTES = 614208
export const FRONTEND_OPERATIONS_RENDERERS_SPLIT_ROUTE_BUDGET_MS = 2000
export const FRONTEND_OPERATIONS_RENDERERS_SPLIT_BYTE_GROWTH_LIMIT = 1.05

export const FRONTEND_OPERATIONS_SCRIPT_ORDER = [
  '/foundation-nav-config.js',
  '/foundation-data.js',
  '/foundation.js',
  '/foundation-operations-renderers.js',
  '/foundation-router.js',
]

export const FRONTEND_OPERATIONS_RENDERER_NAMES = [
  'renderDataHealth',
  'renderSystemActivity',
  'renderDailySummary',
  'renderBuildLog',
  'renderCurrentSprintPanel',
  'renderBuildExecutiveSummary',
]

export function extractFoundationScriptOrder(htmlSource = '') {
  const order = []
  const scriptPattern = /<script\s+[^>]*src="([^"]+)"[^>]*><\/script>/gi
  let match = scriptPattern.exec(htmlSource)
  while (match) {
    order.push(match[1].split('?')[0])
    match = scriptPattern.exec(htmlSource)
  }
  return order.filter(src => src.includes('foundation'))
}

export function evaluateFrontendOperationsScriptOrder(order = []) {
  const indexes = FRONTEND_OPERATIONS_SCRIPT_ORDER.map(src => order.indexOf(src))
  return {
    ok: indexes.every(index => index !== -1) &&
      indexes.every((index, idx) => idx === 0 || index > indexes[idx - 1]),
    order,
    required: FRONTEND_OPERATIONS_SCRIPT_ORDER,
    indexes,
  }
}

export function evaluateFrontendOperationsRendererSplit({
  foundationSource = '',
  operationsSource = '',
  htmlSource = '',
  lineCounts = {},
  routeDispatch = {},
  helperBehavior = {},
} = {}) {
  const order = evaluateFrontendOperationsScriptOrder(extractFoundationScriptOrder(htmlSource))
  const movedFromMonolith = FRONTEND_OPERATIONS_RENDERER_NAMES.every(name => !foundationSource.includes(`function ${name}(`))
  const movedToModule = FRONTEND_OPERATIONS_RENDERER_NAMES.every(name => operationsSource.includes(`function ${name}(`))
  const afterLines = Number(lineCounts.after || 0)
  const beforeLines = Number(lineCounts.before || FRONTEND_OPERATIONS_RENDERERS_SPLIT_BEFORE_LINES)
  const lineCountDecreased = afterLines > 0 && afterLines < beforeLines
  const routeDispatchOk = routeDispatch.buildLog === true &&
    routeDispatch.systemHealth === true &&
    routeDispatch.systemActivity === true &&
    routeDispatch.dailySummary === true
  const helperBehaviorOk = helperBehavior.anchor === true &&
    helperBehavior.commitGrouping === true &&
    helperBehavior.textList === true &&
    helperBehavior.daySelector === true
  const missingModule = evaluateFrontendOperationsScriptOrder([
    '/foundation-nav-config.js',
    '/foundation-data.js',
    '/foundation.js',
    '/foundation-router.js',
  ])
  const wrongOrder = evaluateFrontendOperationsScriptOrder([
    '/foundation-nav-config.js',
    '/foundation-data.js',
    '/foundation-operations-renderers.js',
    '/foundation.js',
    '/foundation-router.js',
  ])

  return {
    ok: order.ok &&
      movedFromMonolith &&
      movedToModule &&
      lineCountDecreased &&
      routeDispatchOk &&
      helperBehaviorOk &&
      missingModule.ok === false &&
      wrongOrder.ok === false,
    invariant: 'operations renderers live in their own module, public/foundation.js shrinks, script order is enforced, and route dispatch can reach moved renderer globals',
    order,
    movedFromMonolith,
    movedToModule,
    lineCounts: {
      before: beforeLines,
      after: afterLines,
    },
    routeDispatch,
    helperBehavior,
    oldFailures: {
      missingModuleRejected: missingModule.ok === false,
      wrongOrderRejected: wrongOrder.ok === false,
    },
  }
}
