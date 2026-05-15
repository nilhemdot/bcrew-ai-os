export const FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_CARD_ID = 'FRONTEND-SOURCE-LIFECYCLE-RENDERERS-SPLIT-001'
export const FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_CLOSEOUT_KEY = 'frontend-source-lifecycle-renderers-split-v1'
export const FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_PLAN_PATH = 'docs/process/frontend-source-lifecycle-renderers-split-001-plan.md'
export const FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FRONTEND-SOURCE-LIFECYCLE-RENDERERS-SPLIT-001.json'
export const FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_SCRIPT_PATH = 'scripts/process-frontend-source-lifecycle-renderers-split-check.mjs'
export const FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_SPRINT_ID = 'frontend-source-lifecycle-renderers-split-2026-05-15'
export const FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_BEFORE_LINES = 12717
export const FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_BEFORE_BYTES = 595180
export const FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_ROUTE_BUDGET_MS = 2000
export const FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_BYTE_GROWTH_LIMIT = 1.05

export const FRONTEND_SOURCE_LIFECYCLE_SCRIPT_ORDER = [
  '/foundation-nav-config.js',
  '/foundation-data.js',
  '/foundation.js',
  '/foundation-source-lifecycle-renderers.js',
  '/foundation-runtime-renderers.js',
  '/foundation-operations-renderers.js',
  '/foundation-router.js',
]

export const FRONTEND_SOURCE_LIFECYCLE_RENDERER_NAMES = [
  'sourceLifecycleTone',
  'renderSourceLifecycleHero',
  'renderSourceLifecycleSummary',
  'renderFoundationUiCompletePanel',
  'renderSourceMaturityStageCell',
  'renderSourceMaturityGridPanel',
  'renderConnectorFlowCell',
  'renderSourceConnectorMatrixPanel',
  'renderSourceHubRoutingMatrixPanel',
  'renderSourceExtractionCoveragePanel',
  'sourceCoverageCloseoutTone',
  'sourceCoverageCloseoutLabel',
  'renderSourceCoverageCloseoutPanel',
  'renderMarketingSourceMapPanel',
  'renderBrandStackPanel',
  'renderTierBehavioralCompletionPanel',
  'renderVerificationRunsPanel',
  'renderPerUserChangelogPanel',
  'renderRestrictedDecisionQueuePanel',
  'renderSourceLifecycleDefinitions',
  'renderSourceLifecycleEvidence',
  'renderSourceLifecycleLaneCard',
  'renderSourceLifecycleLanes',
  'renderSourceLifecycleTargetCard',
  'renderSourceLifecycleTargets',
  'renderSourceLifecycleParked',
  'renderSourceLifecycleScope',
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

export function evaluateFrontendSourceLifecycleScriptOrder(order = []) {
  const indexes = FRONTEND_SOURCE_LIFECYCLE_SCRIPT_ORDER.map(src => order.indexOf(src))
  return {
    ok: indexes.every(index => index !== -1) &&
      indexes.every((index, idx) => idx === 0 || index > indexes[idx - 1]),
    order,
    required: FRONTEND_SOURCE_LIFECYCLE_SCRIPT_ORDER,
    indexes,
  }
}

export function evaluateFrontendSourceLifecycleRendererSplit({
  foundationSource = '',
  sourceLifecycleSource = '',
  runtimeSource = '',
  operationsSource = '',
  htmlSource = '',
  lineCounts = {},
  routeDispatch = {},
  helperBehavior = {},
} = {}) {
  const order = evaluateFrontendSourceLifecycleScriptOrder(extractFoundationScriptOrder(htmlSource))
  const movedFromMonolith = FRONTEND_SOURCE_LIFECYCLE_RENDERER_NAMES.every(name => !foundationSource.includes(`function ${name}(`))
  const movedToModule = FRONTEND_SOURCE_LIFECYCLE_RENDERER_NAMES.every(name => sourceLifecycleSource.includes(`function ${name}(`))
  const foundationRetainsRouteOwner = foundationSource.includes('function renderSourceLifecycle()') &&
    foundationSource.includes('renderSourceLifecycleHero(') &&
    foundationSource.includes('renderSourceLifecycleScope(')
  const laterModulesStillLoaded = runtimeSource.includes('function renderLlmRuntimePanel(') &&
    operationsSource.includes('function renderDataHealth()')
  const afterLines = Number(lineCounts.after || 0)
  const beforeLines = Number(lineCounts.before || FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_BEFORE_LINES)
  const lineCountDecreased = afterLines > 0 && afterLines < beforeLines
  const routeDispatchOk = routeDispatch.sourceLifecycle === true &&
    routeDispatch.hero === true &&
    routeDispatch.summary === true &&
    routeDispatch.scope === true
  const helperBehaviorOk = helperBehavior.hero === true &&
    helperBehavior.summary === true &&
    helperBehavior.maturityGrid === true &&
    helperBehavior.coverage === true
  const missingModule = evaluateFrontendSourceLifecycleScriptOrder([
    '/foundation-nav-config.js',
    '/foundation-data.js',
    '/foundation.js',
    '/foundation-runtime-renderers.js',
    '/foundation-operations-renderers.js',
    '/foundation-router.js',
  ])
  const wrongOrder = evaluateFrontendSourceLifecycleScriptOrder([
    '/foundation-nav-config.js',
    '/foundation-data.js',
    '/foundation-source-lifecycle-renderers.js',
    '/foundation.js',
    '/foundation-runtime-renderers.js',
    '/foundation-operations-renderers.js',
    '/foundation-router.js',
  ])

  return {
    ok: order.ok &&
      movedFromMonolith &&
      movedToModule &&
      foundationRetainsRouteOwner &&
      laterModulesStillLoaded &&
      lineCountDecreased &&
      routeDispatchOk &&
      helperBehaviorOk &&
      missingModule.ok === false &&
      wrongOrder.ok === false,
    invariant: 'source lifecycle renderers live in their own module, public/foundation.js shrinks, the route owner can reach moved globals, and script order is enforced',
    order,
    movedFromMonolith,
    movedToModule,
    foundationRetainsRouteOwner,
    laterModulesStillLoaded,
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
