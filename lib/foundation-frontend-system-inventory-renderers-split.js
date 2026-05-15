export const FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_CARD_ID = 'FRONTEND-SYSTEM-INVENTORY-RENDERERS-SPLIT-001'
export const FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_CLOSEOUT_KEY = 'frontend-system-inventory-renderers-split-v1'
export const FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_PLAN_PATH = 'docs/process/frontend-system-inventory-renderers-split-001-plan.md'
export const FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FRONTEND-SYSTEM-INVENTORY-RENDERERS-SPLIT-001.json'
export const FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_SCRIPT_PATH = 'scripts/process-frontend-system-inventory-renderers-split-check.mjs'
export const FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_SPRINT_ID = 'frontend-system-inventory-renderers-split-2026-05-15'
export const FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_BEFORE_LINES = 9774
export const FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_MAX_AFTER_LINES = 9000
export const FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_BEFORE_BYTES = 596616
export const FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_ROUTE_BUDGET_MS = 2000
export const FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_BYTE_GROWTH_LIMIT = 1.05

export const FRONTEND_SYSTEM_INVENTORY_SCRIPT_ORDER = [
  '/foundation-nav-config.js',
  '/foundation-data.js',
  '/foundation.js',
  '/foundation-source-registry-renderers.js',
  '/foundation-system-inventory-renderers.js',
  '/foundation-source-lifecycle-renderers.js',
  '/foundation-runtime-renderers.js',
  '/foundation-operations-renderers.js',
  '/foundation-router.js',
]

export const FRONTEND_SYSTEM_INVENTORY_RENDERER_NAMES = [
  'buildByKey',
  'renderFoundationSystemLinkedList',
  'renderFoundationSystemBacklogItems',
  'renderFoundationSystemJobs',
  'renderFoundationSystemFullCard',
  'getFoundationSystemImplementationTone',
  'groupFoundationSystemsByServiceArea',
  'renderFoundationSystemsServiceAreaSummary',
  'renderFoundationSystemsServiceAreaGroup',
  'renderFoundationSystems',
  'renderCapabilityCard',
  'getInventoryUsageTag',
  'renderInventoryDocCard',
  'renderInventoryGroupStack',
  'isArchiveHistoryDoc',
  'isCurrentInventoryDoc',
  'splitInventoryDocs',
  'renderInventoryDocs',
  'renderInventoryArchiveHistory',
  'renderSystemInventoryPurposePanel',
  'renderCapabilitySection',
]

export const FRONTEND_SYSTEM_INVENTORY_MOVED_GLOBALS = [
  ...FRONTEND_SYSTEM_INVENTORY_RENDERER_NAMES,
  'capabilityCatalog',
  'currentInventoryDocCategories',
  'archiveHistoryInventoryDocCategories',
]

export function extractFoundationSystemInventoryScriptOrder(htmlSource = '') {
  const order = []
  const scriptPattern = /<script\s+[^>]*src="([^"]+)"[^>]*><\/script>/gi
  let match = scriptPattern.exec(htmlSource)
  while (match) {
    order.push(match[1].split('?')[0])
    match = scriptPattern.exec(htmlSource)
  }
  return order.filter(src => src.includes('foundation'))
}

export function evaluateFrontendSystemInventoryScriptOrder(order = []) {
  const indexes = FRONTEND_SYSTEM_INVENTORY_SCRIPT_ORDER.map(src => order.indexOf(src))
  return {
    ok: indexes.every(index => index !== -1) &&
      indexes.every((index, idx) => idx === 0 || index > indexes[idx - 1]),
    order,
    required: FRONTEND_SYSTEM_INVENTORY_SCRIPT_ORDER,
    indexes,
  }
}

export function evaluateFrontendSystemInventoryRendererSplit({
  foundationSource = '',
  systemInventorySource = '',
  sourceRegistrySource = '',
  routerSource = '',
  htmlSource = '',
  lineCounts = {},
  routeGlobals = {},
  helperBehavior = {},
} = {}) {
  const order = evaluateFrontendSystemInventoryScriptOrder(extractFoundationSystemInventoryScriptOrder(htmlSource))
  const movedFunctionsFromMonolith = FRONTEND_SYSTEM_INVENTORY_RENDERER_NAMES.every(name => !foundationSource.includes(`function ${name}(`))
  const movedFunctionsToModule = FRONTEND_SYSTEM_INVENTORY_RENDERER_NAMES.every(name => systemInventorySource.includes(`function ${name}(`))
  const movedGlobalsFromMonolith = !foundationSource.includes('var capabilityCatalog =') &&
    !foundationSource.includes('var currentInventoryDocCategories =') &&
    !foundationSource.includes('var archiveHistoryInventoryDocCategories =')
  const movedGlobalsToModule = systemInventorySource.includes('var capabilityCatalog =') &&
    systemInventorySource.includes('var currentInventoryDocCategories =') &&
    systemInventorySource.includes('var archiveHistoryInventoryDocCategories =')
  const routerUsesRouteGlobals = [
    'renderFoundationSystems()',
    'renderInventoryDocs()',
    'renderInventoryArchiveHistory()',
    'renderCapabilitySection(section)',
  ].every(marker => routerSource.includes(marker))
  const sharedHelpersLoadBeforeModule = order.order.indexOf('/foundation-source-registry-renderers.js') !== -1 &&
    order.order.indexOf('/foundation-system-inventory-renderers.js') > order.order.indexOf('/foundation-source-registry-renderers.js') &&
    sourceRegistrySource.includes('function renderSourceTag(') &&
    sourceRegistrySource.includes('function renderSourceMetaItem(') &&
    sourceRegistrySource.includes('function renderSourceBulletGroup(')
  const afterLines = Number(lineCounts.after || 0)
  const beforeLines = Number(lineCounts.before || FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_BEFORE_LINES)
  const lineCountDecreased = afterLines > 0 && afterLines < beforeLines
  const lineCountUnderThreshold = afterLines > 0 && afterLines < FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_MAX_AFTER_LINES
  const routeGlobalsOk = routeGlobals.foundationSystems === true &&
    routeGlobals.inventoryDocs === true &&
    routeGlobals.inventoryArchive === true &&
    routeGlobals.capabilitySection === true &&
    routeGlobals.capabilityCatalog === true
  const helperBehaviorOk = helperBehavior.systemGrouping === true &&
    helperBehavior.systemCard === true &&
    helperBehavior.inventorySplit === true &&
    helperBehavior.capabilityCard === true
  const missingModule = evaluateFrontendSystemInventoryScriptOrder([
    '/foundation-nav-config.js',
    '/foundation-data.js',
    '/foundation.js',
    '/foundation-source-registry-renderers.js',
    '/foundation-source-lifecycle-renderers.js',
    '/foundation-runtime-renderers.js',
    '/foundation-operations-renderers.js',
    '/foundation-router.js',
  ])
  const wrongOrder = evaluateFrontendSystemInventoryScriptOrder([
    '/foundation-nav-config.js',
    '/foundation-data.js',
    '/foundation-system-inventory-renderers.js',
    '/foundation.js',
    '/foundation-source-registry-renderers.js',
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
      routerUsesRouteGlobals &&
      sharedHelpersLoadBeforeModule &&
      lineCountDecreased &&
      lineCountUnderThreshold &&
      routeGlobalsOk &&
      helperBehaviorOk &&
      missingModule.ok === false &&
      wrongOrder.ok === false,
    invariant: 'Systems and System Inventory renderers live in their own module, public/foundation.js drops below 9K lines, route globals remain callable, and script order is enforced',
    order,
    movedFunctionsFromMonolith,
    movedFunctionsToModule,
    movedGlobalsFromMonolith,
    movedGlobalsToModule,
    routerUsesRouteGlobals,
    sharedHelpersLoadBeforeModule,
    lineCounts: {
      before: beforeLines,
      after: afterLines,
      maxAfter: FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_MAX_AFTER_LINES,
    },
    routeGlobals,
    helperBehavior,
    oldFailures: {
      missingModuleRejected: missingModule.ok === false,
      wrongOrderRejected: wrongOrder.ok === false,
    },
  }
}
