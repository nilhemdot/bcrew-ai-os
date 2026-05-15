export const FRONTEND_MONOLITH_SPLIT_CARD_ID = 'FRONTEND-MONOLITH-SPLIT-001'
export const FRONTEND_MONOLITH_SPLIT_CLOSEOUT_KEY = 'frontend-monolith-split-v1'
export const FRONTEND_MONOLITH_SPLIT_PLAN_PATH = 'docs/process/frontend-monolith-split-001-plan.md'
export const FRONTEND_MONOLITH_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FRONTEND-MONOLITH-SPLIT-001.json'
export const FRONTEND_MONOLITH_SPLIT_SCRIPT_PATH = 'scripts/process-frontend-monolith-split-check.mjs'
export const FRONTEND_MONOLITH_SPLIT_SPRINT_ID = 'frontend-monolith-split-2026-05-15'
export const FRONTEND_MONOLITH_SPLIT_BEFORE_LINES = 16061
export const FRONTEND_MONOLITH_SPLIT_BEFORE_BYTES = 613000
export const FRONTEND_MONOLITH_SPLIT_ROUTE_BUDGET_MS = 2000
export const FRONTEND_MONOLITH_SPLIT_BYTE_GROWTH_LIMIT = 1.05

export const FRONTEND_MONOLITH_SCRIPT_ORDER = [
  '/foundation-nav-config.js',
  '/foundation-data.js',
  '/foundation.js',
  '/foundation-router.js',
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

export function evaluateFrontendScriptOrder(order = []) {
  const indexes = FRONTEND_MONOLITH_SCRIPT_ORDER.map(src => order.indexOf(src))
  return {
    ok: indexes.every(index => index !== -1) &&
      indexes.every((index, idx) => idx === 0 || index > indexes[idx - 1]),
    order,
    required: FRONTEND_MONOLITH_SCRIPT_ORDER,
    indexes,
  }
}

export function buildFrontendMonolithSplitDogfoodProof(input = {}) {
  const goodOrder = evaluateFrontendScriptOrder(input.order || FRONTEND_MONOLITH_SCRIPT_ORDER)
  const missingData = evaluateFrontendScriptOrder(['/foundation-nav-config.js', '/foundation.js', '/foundation-router.js'])
  const wrongOrder = evaluateFrontendScriptOrder(['/foundation-router.js', '/foundation-nav-config.js', '/foundation-data.js', '/foundation.js'])
  const routeDispatch = input.routeDispatch || {}
  const cache = input.cache || {}
  const lineCounts = input.lineCounts || {}
  const oldFailureRejected = missingData.ok === false && wrongOrder.ok === false
  const ok = goodOrder.ok === true &&
    oldFailureRejected &&
    routeDispatch.backlog === true &&
    routeDispatch.systemHealth === true &&
    cache.repeatedReadUsesCache === true &&
    cache.clearInvalidates === true &&
    cache.mutationClears === true &&
    Number(lineCounts.after || 0) > 0 &&
    Number(lineCounts.after || 0) < FRONTEND_MONOLITH_SPLIT_BEFORE_LINES

  return {
    ok,
    invariant: 'script order, route dispatch, cache invalidation, and line-count decrease stay true after splitting public/foundation.js',
    goodOrder,
    oldFailures: {
      missingDataRejected: missingData.ok === false,
      wrongOrderRejected: wrongOrder.ok === false,
      oldFailureRejected,
    },
    routeDispatch,
    cache,
    lineCounts,
  }
}
