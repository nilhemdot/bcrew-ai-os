export const FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_CARD_ID = 'FRONTEND-SOURCE-REGISTRY-RENDERERS-SPLIT-001'
export const FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_CLOSEOUT_KEY = 'frontend-source-registry-renderers-split-v1'
export const FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_PLAN_PATH = 'docs/process/frontend-source-registry-renderers-split-001-plan.md'
export const FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FRONTEND-SOURCE-REGISTRY-RENDERERS-SPLIT-001.json'
export const FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_SCRIPT_PATH = 'scripts/process-frontend-source-registry-renderers-split-check.mjs'
export const FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_SPRINT_ID = 'frontend-source-registry-renderers-split-2026-05-15'
export const FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_BEFORE_LINES = 11223
export const FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_MAX_AFTER_LINES = 10000
export const FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_BEFORE_BYTES = 595180
export const FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_ROUTE_BUDGET_MS = 2000
export const FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_BYTE_GROWTH_LIMIT = 1.05

export const FRONTEND_SOURCE_REGISTRY_SCRIPT_ORDER = [
  '/foundation-nav-config.js',
  '/foundation-data.js',
  '/foundation.js',
  '/foundation-source-registry-renderers.js',
  '/foundation-source-lifecycle-renderers.js',
  '/foundation-runtime-renderers.js',
  '/foundation-operations-renderers.js',
  '/foundation-router.js',
]

export const FRONTEND_SOURCE_REGISTRY_RENDERER_NAMES = [
  'getSourceKind',
  'getSourcePresence',
  'getSourceTrust',
  'getSourceSearchText',
  'getSourceSystemName',
  'getSourceUnitName',
  'filterSourceContracts',
  'sortSourceContracts',
  'renderSourceTag',
  'renderSourceMetaItem',
  'areAllSourceContractsDocs',
  'renderSourceLinkGroup',
  'renderSourceBulletGroup',
  'renderSourceContractCard',
  'renderSourceAccordionItem',
  'renderSourceLegendPanel',
  'getSourceSystemState',
  'groupSourceContractsBySystem',
  'renderSourceSystemStack',
  'getConnectorState',
  'renderConnectorCard',
  'renderConnectorStack',
  'getSourceContractsForSection',
  'renderSourceHero',
  'countSourcePresence',
  'countConnectorStates',
  'renderDataSourcePurposePanel',
  'renderSourceSystemsPanel',
  'renderGroupedSourceSystemCard',
  'renderGroupedSourceSystemsPanel',
  'getKpiHealthTone',
  'renderKpiHealthTableCard',
  'renderKpiHealthRpcCard',
  'renderKpiSupabaseHealthPanel',
  'renderKpiHealthRuntimeWarning',
  'renderSourceConnectorsPanel',
  'renderSourceOperatorNotesDrawer',
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

export function evaluateFrontendSourceRegistryScriptOrder(order = []) {
  const indexes = FRONTEND_SOURCE_REGISTRY_SCRIPT_ORDER.map(src => order.indexOf(src))
  return {
    ok: indexes.every(index => index !== -1) &&
      indexes.every((index, idx) => idx === 0 || index > indexes[idx - 1]),
    order,
    required: FRONTEND_SOURCE_REGISTRY_SCRIPT_ORDER,
    indexes,
  }
}

export function evaluateFrontendSourceRegistryRendererSplit({
  foundationSource = '',
  sourceRegistrySource = '',
  sourceLifecycleSource = '',
  runtimeSource = '',
  operationsSource = '',
  htmlSource = '',
  lineCounts = {},
  routeDispatch = {},
  helperBehavior = {},
} = {}) {
  const order = evaluateFrontendSourceRegistryScriptOrder(extractFoundationScriptOrder(htmlSource))
  const movedFromMonolith = FRONTEND_SOURCE_REGISTRY_RENDERER_NAMES.every(name => !foundationSource.includes(`function ${name}(`))
  const movedToModule = FRONTEND_SOURCE_REGISTRY_RENDERER_NAMES.every(name => sourceRegistrySource.includes(`function ${name}(`))
  const foundationRetainsRouteOwner = foundationSource.includes('function renderSourceRegistry(section)') &&
    foundationSource.includes('renderSourceHero(') &&
    foundationSource.includes('renderSourceSystemsPanel(') &&
    foundationSource.includes('renderSourceConnectorsPanel(') &&
    foundationSource.includes('renderKpiSupabaseHealthPanel(')
  const dependentModulesStillCallSharedHelpers = sourceLifecycleSource.includes('renderSourceTag(') &&
    sourceLifecycleSource.includes('renderSourceBulletGroup(') &&
    runtimeSource.includes('function renderLlmRuntimePanel(') &&
    operationsSource.includes('function renderDataHealth()')
  const afterLines = Number(lineCounts.after || 0)
  const beforeLines = Number(lineCounts.before || FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_BEFORE_LINES)
  const lineCountDecreased = afterLines > 0 && afterLines < beforeLines
  const lineCountUnderDangerThreshold = afterLines > 0 && afterLines < FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_MAX_AFTER_LINES
  const routeDispatchOk = routeDispatch.sourceRegistry === true &&
    routeDispatch.hero === true &&
    routeDispatch.systems === true &&
    routeDispatch.connectors === true &&
    routeDispatch.kpi === true
  const helperBehaviorOk = helperBehavior.tag === true &&
    helperBehavior.meta === true &&
    helperBehavior.bullet === true &&
    helperBehavior.connector === true &&
    helperBehavior.sourceLifecycleUsesSharedHelpers === true
  const missingModule = evaluateFrontendSourceRegistryScriptOrder([
    '/foundation-nav-config.js',
    '/foundation-data.js',
    '/foundation.js',
    '/foundation-source-lifecycle-renderers.js',
    '/foundation-runtime-renderers.js',
    '/foundation-operations-renderers.js',
    '/foundation-router.js',
  ])
  const wrongOrder = evaluateFrontendSourceRegistryScriptOrder([
    '/foundation-nav-config.js',
    '/foundation-data.js',
    '/foundation-source-registry-renderers.js',
    '/foundation.js',
    '/foundation-source-lifecycle-renderers.js',
    '/foundation-runtime-renderers.js',
    '/foundation-operations-renderers.js',
    '/foundation-router.js',
  ])

  return {
    ok: order.ok &&
      movedFromMonolith &&
      movedToModule &&
      foundationRetainsRouteOwner &&
      dependentModulesStillCallSharedHelpers &&
      lineCountDecreased &&
      lineCountUnderDangerThreshold &&
      routeDispatchOk &&
      helperBehaviorOk &&
      missingModule.ok === false &&
      wrongOrder.ok === false,
    invariant: 'source registry renderers live in their own module, public/foundation.js drops below 10K lines, route owners can reach moved globals, and script order is enforced',
    order,
    movedFromMonolith,
    movedToModule,
    foundationRetainsRouteOwner,
    dependentModulesStillCallSharedHelpers,
    lineCounts: {
      before: beforeLines,
      after: afterLines,
      maxAfter: FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_MAX_AFTER_LINES,
    },
    routeDispatch,
    helperBehavior,
    oldFailures: {
      missingModuleRejected: missingModule.ok === false,
      wrongOrderRejected: wrongOrder.ok === false,
    },
  }
}
