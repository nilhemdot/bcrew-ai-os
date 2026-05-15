export const FRONTEND_RUNTIME_RENDERERS_SPLIT_CARD_ID = 'FRONTEND-RUNTIME-RENDERERS-SPLIT-001'
export const FRONTEND_RUNTIME_RENDERERS_SPLIT_CLOSEOUT_KEY = 'frontend-runtime-renderers-split-v1'
export const FRONTEND_RUNTIME_RENDERERS_SPLIT_PLAN_PATH = 'docs/process/frontend-runtime-renderers-split-001-plan.md'
export const FRONTEND_RUNTIME_RENDERERS_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FRONTEND-RUNTIME-RENDERERS-SPLIT-001.json'
export const FRONTEND_RUNTIME_RENDERERS_SPLIT_SCRIPT_PATH = 'scripts/process-frontend-runtime-renderers-split-check.mjs'
export const FRONTEND_RUNTIME_RENDERERS_SPLIT_SPRINT_ID = 'frontend-runtime-renderers-split-2026-05-15'
export const FRONTEND_RUNTIME_RENDERERS_SPLIT_BEFORE_LINES = 14206
export const FRONTEND_RUNTIME_RENDERERS_SPLIT_BEFORE_BYTES = 613308
export const FRONTEND_RUNTIME_RENDERERS_SPLIT_ROUTE_BUDGET_MS = 2000
export const FRONTEND_RUNTIME_RENDERERS_SPLIT_BYTE_GROWTH_LIMIT = 1.05

export const FRONTEND_RUNTIME_SCRIPT_ORDER = [
  '/foundation-nav-config.js',
  '/foundation-data.js',
  '/foundation.js',
  '/foundation-runtime-renderers.js',
  '/foundation-operations-renderers.js',
  '/foundation-router.js',
]

export const FRONTEND_RUNTIME_RENDERER_NAMES = [
  'renderFoundationOperationsPurposePanel',
  'renderFoundationJobsPanel',
  'renderRuntimeProcessControlPanel',
  'renderMeetingVaultAutoEnforcementPanel',
  'renderAgentFeedbackAutoSendPanel',
  'renderAgentFeedbackProductionDryRunPanel',
  'renderAgentFeedbackReminderPanel',
  'renderServedCodeTrustPanel',
  'renderWorkerCodeTrustPanel',
  'renderBacklogHygienePanel',
  'renderPostShipFanoutPanel',
  'renderCardReferenceTrustPanel',
  'renderSourceReferenceTrustPanel',
  'renderDocArchiveCleanupPanel',
  'renderExceptionCurationPanel',
  'renderHitListReconcilePanel',
  'renderArchiveRetirePanel',
  'renderResearchCurationPanel',
  'renderSheetsApiTrustPanel',
  'renderDoctrinePropagationPanel',
  'renderDecisionAutoEmitPanel',
  'renderLlmRuntimePanel',
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

export function evaluateFrontendRuntimeScriptOrder(order = []) {
  const indexes = FRONTEND_RUNTIME_SCRIPT_ORDER.map(src => order.indexOf(src))
  return {
    ok: indexes.every(index => index !== -1) &&
      indexes.every((index, idx) => idx === 0 || index > indexes[idx - 1]),
    order,
    required: FRONTEND_RUNTIME_SCRIPT_ORDER,
    indexes,
  }
}

export function evaluateFrontendRuntimeRendererSplit({
  foundationSource = '',
  runtimeSource = '',
  operationsSource = '',
  htmlSource = '',
  lineCounts = {},
  routeDispatch = {},
  helperBehavior = {},
} = {}) {
  const order = evaluateFrontendRuntimeScriptOrder(extractFoundationScriptOrder(htmlSource))
  const movedFromMonolith = FRONTEND_RUNTIME_RENDERER_NAMES.every(name => !foundationSource.includes(`function ${name}(`))
  const movedToModule = FRONTEND_RUNTIME_RENDERER_NAMES.every(name => runtimeSource.includes(`function ${name}(`))
  const operationsRetainsOwner = operationsSource.includes('function renderDataHealth()') &&
    operationsSource.includes('renderFoundationOperationsPurposePanel(') &&
    operationsSource.includes('renderFoundationJobsPanel(') &&
    operationsSource.includes('renderLlmRuntimePanel(')
  const afterLines = Number(lineCounts.after || 0)
  const beforeLines = Number(lineCounts.before || FRONTEND_RUNTIME_RENDERERS_SPLIT_BEFORE_LINES)
  const lineCountDecreased = afterLines > 0 && afterLines < beforeLines
  const routeDispatchOk = routeDispatch.systemHealth === true &&
    routeDispatch.jobs === true &&
    routeDispatch.llmRuntime === true &&
    routeDispatch.runtimeProcess === true
  const helperBehaviorOk = helperBehavior.purposePanel === true &&
    helperBehavior.statusGroup === true &&
    helperBehavior.llmPanel === true
  const missingRuntime = evaluateFrontendRuntimeScriptOrder([
    '/foundation-nav-config.js',
    '/foundation-data.js',
    '/foundation.js',
    '/foundation-operations-renderers.js',
    '/foundation-router.js',
  ])
  const wrongOrder = evaluateFrontendRuntimeScriptOrder([
    '/foundation-nav-config.js',
    '/foundation-data.js',
    '/foundation-runtime-renderers.js',
    '/foundation.js',
    '/foundation-operations-renderers.js',
    '/foundation-router.js',
  ])

  return {
    ok: order.ok &&
      movedFromMonolith &&
      movedToModule &&
      operationsRetainsOwner &&
      lineCountDecreased &&
      routeDispatchOk &&
      helperBehaviorOk &&
      missingRuntime.ok === false &&
      wrongOrder.ok === false,
    invariant: 'runtime diagnostics renderers live in their own module, public/foundation.js shrinks, operations renderers can reach moved globals, and script order is enforced',
    order,
    movedFromMonolith,
    movedToModule,
    operationsRetainsOwner,
    lineCounts: {
      before: beforeLines,
      after: afterLines,
    },
    routeDispatch,
    helperBehavior,
    oldFailures: {
      missingRuntimeRejected: missingRuntime.ok === false,
      wrongOrderRejected: wrongOrder.ok === false,
    },
  }
}
