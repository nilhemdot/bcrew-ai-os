export const FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_CARD_ID = 'FRONTEND-DECISION-QUESTION-RENDERERS-SPLIT-001'
export const FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_CLOSEOUT_KEY = 'frontend-decision-question-renderers-split-v1'
export const FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_PLAN_PATH = 'docs/process/frontend-decision-question-renderers-split-001-plan.md'
export const FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FRONTEND-DECISION-QUESTION-RENDERERS-SPLIT-001.json'
export const FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_SCRIPT_PATH = 'scripts/process-frontend-decision-question-renderers-split-check.mjs'
export const FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_SPRINT_ID = 'frontend-decision-question-renderers-split-2026-05-15'
export const FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_BEFORE_LINES = 6348
export const FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_MAX_AFTER_LINES = 5000
export const FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_BEFORE_BYTES = 613829
export const FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_ROUTE_BUDGET_MS = 2000
export const FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_BYTE_GROWTH_LIMIT = 1.05

export const FRONTEND_DECISION_QUESTION_SCRIPT_ORDER = [
  '/foundation-nav-config.js',
  '/foundation-data.js',
  '/foundation.js',
  '/foundation-source-registry-renderers.js',
  '/foundation-fub-lead-source-renderers.js',
  '/foundation-system-inventory-renderers.js',
  '/foundation-current-state-renderers.js',
  '/foundation-decision-question-renderers.js',
  '/foundation-source-lifecycle-renderers.js',
  '/foundation-runtime-renderers.js',
  '/foundation-operations-renderers.js',
  '/foundation-router.js',
]

export const FRONTEND_DECISION_QUESTION_RENDERER_NAMES = [
  'formatDecisionStatusLabel',
  'renderDecisionMemoryCard',
  'renderCaptureItem',
  'renderOpenQuestionCard',
  'parseCommaList',
  'parseDecisionIdList',
  'getDecisionSortTimestamp',
  'sortDecisionsNewestFirst',
  'getDecisionTextTokens',
  'getDecisionKeywordSet',
  'hasDecisionLink',
  'getDecisionReviewPriority',
  'getDecisionReviewSnapshot',
  'buildDecisionReplacementMap',
  'filterDecisionItems',
  'getDecisionStageGroups',
  'renderDecisionStack',
  'renderDecisionReviewItem',
  'renderDecisionReviewPanel',
  'getOpenQuestionSortTimestamp',
  'sortOpenQuestionsNewestFirst',
  'getOpenQuestionGroups',
  'renderOpenQuestionStack',
  'renderDecisionCreatePanel',
  'renderDecisionEditor',
  'renderDocProposalForm',
  'renderPendingDocUpdateCard',
  'renderQuestionCreatePanel',
  'renderQuestionEditor',
]

export function extractFoundationDecisionQuestionScriptOrder(htmlSource = '') {
  const order = []
  const scriptPattern = /<script\s+[^>]*src="([^"]+)"[^>]*><\/script>/gi
  let match = scriptPattern.exec(htmlSource)
  while (match) {
    order.push(match[1].split('?')[0])
    match = scriptPattern.exec(htmlSource)
  }
  return order.filter(src => src.includes('foundation'))
}

export function evaluateFrontendDecisionQuestionScriptOrder(order = []) {
  const indexes = FRONTEND_DECISION_QUESTION_SCRIPT_ORDER.map(src => order.indexOf(src))
  return {
    ok: indexes.every(index => index !== -1) &&
      indexes.every((index, idx) => idx === 0 || index > indexes[idx - 1]),
    order,
    required: FRONTEND_DECISION_QUESTION_SCRIPT_ORDER,
    indexes,
  }
}

export function evaluateFrontendDecisionQuestionRendererSplit({
  foundationSource = '',
  decisionQuestionSource = '',
  dataSource = '',
  sourceRegistrySource = '',
  runtimeSource = '',
  routerSource = '',
  htmlSource = '',
  lineCounts = {},
  routeGlobals = {},
  helperBehavior = {},
} = {}) {
  const order = evaluateFrontendDecisionQuestionScriptOrder(extractFoundationDecisionQuestionScriptOrder(htmlSource))
  const movedFunctionsFromMonolith = FRONTEND_DECISION_QUESTION_RENDERER_NAMES.every(name => !foundationSource.includes(`function ${name}(`))
  const movedFunctionsToModule = FRONTEND_DECISION_QUESTION_RENDERER_NAMES.every(name => decisionQuestionSource.includes(`function ${name}(`))
  const routeOwnersRemain = foundationSource.includes('function renderDecisions()') &&
    foundationSource.includes('function renderOpenQuestions()')
  const dataDependenciesPresent = dataSource.includes('function fetchFoundationHub(') &&
    dataSource.includes('function foundationMutation(')
  const sharedHelpersPresent = foundationSource.includes('function buildField(') &&
    foundationSource.includes('function buildInput(') &&
    foundationSource.includes('function buildTextarea(') &&
    foundationSource.includes('function buildSelect(') &&
    foundationSource.includes('function renderStatusCard(') &&
    foundationSource.includes('function sortBacklogItems(') &&
    sourceRegistrySource.includes('function renderSourceTag(') &&
    runtimeSource.includes('function renderFoundationOperationsPurposePanel(')
  const routerDispatchPresent = routerSource.includes('renderDecisions()') &&
    routerSource.includes('renderOpenQuestions()')
  const afterLines = Number(lineCounts.after || 0)
  const beforeLines = Number(lineCounts.before || FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_BEFORE_LINES)
  const lineCountDecreased = afterLines > 0 && afterLines < beforeLines
  const lineCountUnderThreshold = afterLines > 0 && afterLines < FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_MAX_AFTER_LINES
  const routeGlobalsOk = routeGlobals.decisionCard === true &&
    routeGlobals.decisionReview === true &&
    routeGlobals.docUpdate === true &&
    routeGlobals.questionCard === true &&
    routeGlobals.questionEditor === true
  const helperBehaviorOk = helperBehavior.decisionCard === true &&
    helperBehavior.decisionReview === true &&
    helperBehavior.docUpdate === true &&
    helperBehavior.questionGroups === true &&
    helperBehavior.questionCard === true &&
    helperBehavior.createEditors === true &&
    helperBehavior.routeRender === true
  const missingModule = evaluateFrontendDecisionQuestionScriptOrder([
    '/foundation-nav-config.js',
    '/foundation-data.js',
    '/foundation.js',
    '/foundation-source-registry-renderers.js',
    '/foundation-fub-lead-source-renderers.js',
    '/foundation-system-inventory-renderers.js',
    '/foundation-current-state-renderers.js',
    '/foundation-source-lifecycle-renderers.js',
    '/foundation-runtime-renderers.js',
    '/foundation-operations-renderers.js',
    '/foundation-router.js',
  ])
  const wrongOrder = evaluateFrontendDecisionQuestionScriptOrder([
    '/foundation-nav-config.js',
    '/foundation-data.js',
    '/foundation-decision-question-renderers.js',
    '/foundation.js',
    '/foundation-source-registry-renderers.js',
    '/foundation-fub-lead-source-renderers.js',
    '/foundation-system-inventory-renderers.js',
    '/foundation-current-state-renderers.js',
    '/foundation-source-lifecycle-renderers.js',
    '/foundation-runtime-renderers.js',
    '/foundation-operations-renderers.js',
    '/foundation-router.js',
  ])

  return {
    ok: order.ok &&
      movedFunctionsFromMonolith &&
      movedFunctionsToModule &&
      routeOwnersRemain &&
      dataDependenciesPresent &&
      sharedHelpersPresent &&
      routerDispatchPresent &&
      lineCountDecreased &&
      lineCountUnderThreshold &&
      routeGlobalsOk &&
      helperBehaviorOk &&
      missingModule.ok === false &&
      wrongOrder.ok === false,
    invariant: 'Decision/Open Question renderers live in their own module, public/foundation.js drops below 5,000 lines, route owners remain callable, and script order is enforced',
    order,
    movedFunctionsFromMonolith,
    movedFunctionsToModule,
    routeOwnersRemain,
    dataDependenciesPresent,
    sharedHelpersPresent,
    routerDispatchPresent,
    lineCounts: {
      before: beforeLines,
      after: afterLines,
      maxAfter: FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_MAX_AFTER_LINES,
    },
    routeGlobals,
    helperBehavior,
    oldFailures: {
      missingModuleRejected: missingModule.ok === false,
      wrongOrderRejected: wrongOrder.ok === false,
    },
  }
}
