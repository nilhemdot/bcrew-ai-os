export const FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_CARD_ID = 'FRONTEND-FUB-LEAD-SOURCE-RENDERERS-SPLIT-001'
export const FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_CLOSEOUT_KEY = 'frontend-fub-lead-source-renderers-split-v1'
export const FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_PLAN_PATH = 'docs/process/frontend-fub-lead-source-renderers-split-001-plan.md'
export const FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FRONTEND-FUB-LEAD-SOURCE-RENDERERS-SPLIT-001.json'
export const FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_SCRIPT_PATH = 'scripts/process-frontend-fub-lead-source-renderers-split-check.mjs'
export const FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_SPRINT_ID = 'frontend-fub-lead-source-renderers-split-2026-05-15'
export const FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_BEFORE_LINES = 8388
export const FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_MAX_AFTER_LINES = 7750
export const FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_BEFORE_BYTES = 613839
export const FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_ROUTE_BUDGET_MS = 2000
export const FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_BYTE_GROWTH_LIMIT = 1.05

export const FRONTEND_FUB_LEAD_SOURCE_SCRIPT_ORDER = [
  '/foundation-nav-config.js',
  '/foundation-data.js',
  '/foundation.js',
  '/foundation-source-registry-renderers.js',
  '/foundation-fub-lead-source-renderers.js',
  '/foundation-system-inventory-renderers.js',
  '/foundation-source-lifecycle-renderers.js',
  '/foundation-runtime-renderers.js',
  '/foundation-operations-renderers.js',
  '/foundation-router.js',
]

export const FRONTEND_FUB_LEAD_SOURCE_RENDERER_NAMES = [
  'getFubSourceGroupOrder',
  'getFubMarketingTag',
  'getFubOwnershipTag',
  'getFubFlagTag',
  'formatDriftAge',
  'renderFubDriftBucket',
  'renderFubLeadSourceDriftPanel',
  'renderOwnersLeadSourceGovernancePanel',
  'renderFubLeadSourceRuleItem',
  'renderFubLeadSourceManagerPanel',
]

export const FRONTEND_FUB_LEAD_SOURCE_MOVED_GLOBALS = [
  ...FRONTEND_FUB_LEAD_SOURCE_RENDERER_NAMES,
  'fubLeadSourceViewState',
  'FUB_SOURCE_GROUP_OPTIONS',
]

export function extractFoundationFubLeadSourceScriptOrder(htmlSource = '') {
  const order = []
  const scriptPattern = /<script\s+[^>]*src="([^"]+)"[^>]*><\/script>/gi
  let match = scriptPattern.exec(htmlSource)
  while (match) {
    order.push(match[1].split('?')[0])
    match = scriptPattern.exec(htmlSource)
  }
  return order.filter(src => src.includes('foundation'))
}

export function evaluateFrontendFubLeadSourceScriptOrder(order = []) {
  const indexes = FRONTEND_FUB_LEAD_SOURCE_SCRIPT_ORDER.map(src => order.indexOf(src))
  return {
    ok: indexes.every(index => index !== -1) &&
      indexes.every((index, idx) => idx === 0 || index > indexes[idx - 1]),
    order,
    required: FRONTEND_FUB_LEAD_SOURCE_SCRIPT_ORDER,
    indexes,
  }
}

export function evaluateFrontendFubLeadSourceRendererSplit({
  foundationSource = '',
  fubLeadSourceSource = '',
  sourceRegistrySource = '',
  dataSource = '',
  htmlSource = '',
  lineCounts = {},
  routeGlobals = {},
  helperBehavior = {},
} = {}) {
  const order = evaluateFrontendFubLeadSourceScriptOrder(extractFoundationFubLeadSourceScriptOrder(htmlSource))
  const movedFunctionsFromMonolith = FRONTEND_FUB_LEAD_SOURCE_RENDERER_NAMES.every(name => !foundationSource.includes(`function ${name}(`))
  const movedFunctionsToModule = FRONTEND_FUB_LEAD_SOURCE_RENDERER_NAMES.every(name => fubLeadSourceSource.includes(`function ${name}(`))
  const movedGlobalsFromMonolith = !foundationSource.includes('var fubLeadSourceViewState =') &&
    !foundationSource.includes('var FUB_SOURCE_GROUP_OPTIONS =')
  const movedGlobalsToModule = fubLeadSourceSource.includes('var fubLeadSourceViewState =') &&
    fubLeadSourceSource.includes('var FUB_SOURCE_GROUP_OPTIONS =')
  const sharedHelpersLoadBeforeModule = order.order.indexOf('/foundation-source-registry-renderers.js') !== -1 &&
    order.order.indexOf('/foundation-fub-lead-source-renderers.js') > order.order.indexOf('/foundation-source-registry-renderers.js') &&
    sourceRegistrySource.includes('function renderSourceTag(') &&
    foundationSource.includes('function buildSelect(') &&
    foundationSource.includes('function buildField(') &&
    dataSource.includes('function fetchFubLeadSources(') &&
    dataSource.includes('function refreshFubLeadSources(')
  const afterLines = Number(lineCounts.after || 0)
  const beforeLines = Number(lineCounts.before || FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_BEFORE_LINES)
  const lineCountDecreased = afterLines > 0 && afterLines < beforeLines
  const lineCountUnderThreshold = afterLines > 0 && afterLines < FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_MAX_AFTER_LINES
  const routeGlobalsOk = routeGlobals.manager === true &&
    routeGlobals.ownersGovernance === true &&
    routeGlobals.state === true &&
    routeGlobals.groupOptions === true
  const helperBehaviorOk = helperBehavior.tagHelpers === true &&
    helperBehavior.groupOrder === true &&
    helperBehavior.driftPanel === true &&
    helperBehavior.managerRender === true &&
    helperBehavior.noLiveMutationOnInitialRender === true
  const missingModule = evaluateFrontendFubLeadSourceScriptOrder([
    '/foundation-nav-config.js',
    '/foundation-data.js',
    '/foundation.js',
    '/foundation-source-registry-renderers.js',
    '/foundation-system-inventory-renderers.js',
    '/foundation-source-lifecycle-renderers.js',
    '/foundation-runtime-renderers.js',
    '/foundation-operations-renderers.js',
    '/foundation-router.js',
  ])
  const wrongOrder = evaluateFrontendFubLeadSourceScriptOrder([
    '/foundation-nav-config.js',
    '/foundation-data.js',
    '/foundation-fub-lead-source-renderers.js',
    '/foundation.js',
    '/foundation-source-registry-renderers.js',
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
      movedGlobalsFromMonolith &&
      movedGlobalsToModule &&
      sharedHelpersLoadBeforeModule &&
      lineCountDecreased &&
      lineCountUnderThreshold &&
      routeGlobalsOk &&
      helperBehaviorOk &&
      missingModule.ok === false &&
      wrongOrder.ok === false,
    invariant: 'FUB lead-source renderers live in their own module, public/foundation.js drops below 7,750 lines, route globals remain callable, and script order is enforced',
    order,
    movedFunctionsFromMonolith,
    movedFunctionsToModule,
    movedGlobalsFromMonolith,
    movedGlobalsToModule,
    sharedHelpersLoadBeforeModule,
    lineCounts: {
      before: beforeLines,
      after: afterLines,
      maxAfter: FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_MAX_AFTER_LINES,
    },
    routeGlobals,
    helperBehavior,
    oldFailures: {
      missingModuleRejected: missingModule.ok === false,
      wrongOrderRejected: wrongOrder.ok === false,
    },
  }
}
