import {
  FRONTEND_MONOLITH_SPLIT_APPROVAL_PATH,
  FRONTEND_MONOLITH_SPLIT_BEFORE_LINES,
  FRONTEND_MONOLITH_SPLIT_CARD_ID,
  FRONTEND_MONOLITH_SPLIT_CLOSEOUT_KEY,
  FRONTEND_MONOLITH_SPLIT_PLAN_PATH,
  FRONTEND_MONOLITH_SPLIT_SCRIPT_PATH,
  FRONTEND_MONOLITH_SPLIT_SPRINT_ID,
  buildFrontendMonolithSplitDogfoodProof,
  evaluateFrontendScriptOrder,
  extractFoundationScriptOrder,
} from './foundation-frontend-monolith-split.js'
import {
  FRONTEND_OPERATIONS_RENDERERS_SPLIT_APPROVAL_PATH,
  FRONTEND_OPERATIONS_RENDERERS_SPLIT_BEFORE_LINES,
  FRONTEND_OPERATIONS_RENDERERS_SPLIT_CARD_ID,
  FRONTEND_OPERATIONS_RENDERERS_SPLIT_CLOSEOUT_KEY,
  FRONTEND_OPERATIONS_RENDERERS_SPLIT_PLAN_PATH,
  FRONTEND_OPERATIONS_RENDERERS_SPLIT_SCRIPT_PATH,
  FRONTEND_OPERATIONS_RENDERERS_SPLIT_SPRINT_ID,
  evaluateFrontendOperationsRendererSplit,
  evaluateFrontendOperationsScriptOrder,
} from './foundation-frontend-operations-renderers-split.js'
import {
  FRONTEND_RUNTIME_RENDERERS_SPLIT_APPROVAL_PATH,
  FRONTEND_RUNTIME_RENDERERS_SPLIT_BEFORE_LINES,
  FRONTEND_RUNTIME_RENDERERS_SPLIT_CARD_ID,
  FRONTEND_RUNTIME_RENDERERS_SPLIT_CLOSEOUT_KEY,
  FRONTEND_RUNTIME_RENDERERS_SPLIT_PLAN_PATH,
  FRONTEND_RUNTIME_RENDERERS_SPLIT_SCRIPT_PATH,
  FRONTEND_RUNTIME_RENDERERS_SPLIT_SPRINT_ID,
  evaluateFrontendRuntimeRendererSplit,
  evaluateFrontendRuntimeScriptOrder,
} from './foundation-frontend-runtime-renderers-split.js'
import {
  FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_APPROVAL_PATH,
  FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_BEFORE_LINES,
  FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_CARD_ID,
  FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_CLOSEOUT_KEY,
  FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_PLAN_PATH,
  FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_SCRIPT_PATH,
  FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_SPRINT_ID,
  evaluateFrontendSourceLifecycleRendererSplit,
  evaluateFrontendSourceLifecycleScriptOrder,
} from './foundation-frontend-source-lifecycle-renderers-split.js'
import {
  FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_APPROVAL_PATH,
  FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_BEFORE_LINES,
  FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_CARD_ID,
  FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_CLOSEOUT_KEY,
  FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_PLAN_PATH,
  FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_SCRIPT_PATH,
  FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_SPRINT_ID,
  evaluateFrontendSourceRegistryRendererSplit,
  evaluateFrontendSourceRegistryScriptOrder,
} from './foundation-frontend-source-registry-renderers-split.js'
import {
  FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_APPROVAL_PATH,
  FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_BEFORE_LINES,
  FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_CARD_ID,
  FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_CLOSEOUT_KEY,
  FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_PLAN_PATH,
  FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_SCRIPT_PATH,
  FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_SPRINT_ID,
  evaluateFrontendFubLeadSourceRendererSplit,
  evaluateFrontendFubLeadSourceScriptOrder,
} from './foundation-frontend-fub-lead-source-renderers-split.js'
import {
  FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_APPROVAL_PATH,
  FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_BEFORE_LINES,
  FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_CARD_ID,
  FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_CLOSEOUT_KEY,
  FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_PLAN_PATH,
  FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_SCRIPT_PATH,
  FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_SPRINT_ID,
  evaluateFrontendSystemInventoryRendererSplit,
  evaluateFrontendSystemInventoryScriptOrder,
} from './foundation-frontend-system-inventory-renderers-split.js'
import {
  FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_APPROVAL_PATH,
  FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_BEFORE_LINES,
  FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_CARD_ID,
  FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_CLOSEOUT_KEY,
  FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_PLAN_PATH,
  FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_SCRIPT_PATH,
  FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_SPRINT_ID,
  evaluateFrontendCurrentStateRendererSplit,
  evaluateFrontendCurrentStateScriptOrder,
} from './foundation-frontend-current-state-renderers-split.js'
import {
  FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_APPROVAL_PATH,
  FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_BEFORE_LINES,
  FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_CARD_ID,
  FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_CLOSEOUT_KEY,
  FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_PLAN_PATH,
  FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_SCRIPT_PATH,
  FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_SPRINT_ID,
  evaluateFrontendDecisionQuestionRendererSplit,
  evaluateFrontendDecisionQuestionScriptOrder,
} from './foundation-frontend-decision-question-renderers-split.js'

export const VERIFIER_FRONTEND_SPLIT_MODULE_CARD_ID = 'VERIFIER-FRONTEND-SPLIT-CHECKS-MODULE-001'
export const VERIFIER_FRONTEND_SPLIT_MODULE_CLOSEOUT_KEY = 'verifier-frontend-split-checks-module-v1'
export const VERIFIER_FRONTEND_SPLIT_MODULE_PLAN_PATH = 'docs/process/verifier-frontend-split-checks-module-001-plan.md'
export const VERIFIER_FRONTEND_SPLIT_MODULE_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-FRONTEND-SPLIT-CHECKS-MODULE-001.json'
export const VERIFIER_FRONTEND_SPLIT_MODULE_SCRIPT_PATH = 'scripts/process-verifier-frontend-split-checks-module-check.mjs'
export const VERIFIER_FRONTEND_SPLIT_MODULE_SPRINT_ID = 'verifier-frontend-split-checks-module-2026-05-15'
export const VERIFIER_FRONTEND_SPLIT_MODULE_BEFORE_LINES = 15644

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

export async function evaluateFoundationFrontendSplitVerifier(input = {}) {
  const {
    foundationHub = {},
    foundationBuildCloseouts = [],
    packageJson = {},
    currentPlan = '',
    currentState = '',
    activeFoundationSprint = {},
    activeSprintAtOrPast = () => false,
    foundationVerifySource = '',
    foundationHtmlSource = '',
    foundationUiSource = '',
    foundationNavConfigSource = '',
    foundationDataSource = '',
    foundationRouterSource = '',
    foundationOperationsRenderersSource = '',
    foundationRuntimeRenderersSource = '',
    foundationSourceLifecycleRenderersSource = '',
    foundationSourceRegistryRenderersSource = '',
    foundationFubLeadSourceRenderersSource = '',
    foundationSystemInventoryRenderersSource = '',
    foundationCurrentStateRenderersSource = '',
    foundationDecisionQuestionRenderersSource = '',
    frontendMonolithSplitScriptSource = '',
    frontendMonolithSplitPlanSource = '',
    frontendOperationsRenderersSplitScriptSource = '',
    frontendOperationsRenderersSplitPlanSource = '',
    frontendRuntimeRenderersSplitScriptSource = '',
    frontendRuntimeRenderersSplitPlanSource = '',
    frontendSourceLifecycleRenderersSplitScriptSource = '',
    frontendSourceLifecycleRenderersSplitPlanSource = '',
    frontendSourceRegistryRenderersSplitScriptSource = '',
    frontendSourceRegistryRenderersSplitPlanSource = '',
    frontendFubLeadSourceRenderersSplitScriptSource = '',
    frontendFubLeadSourceRenderersSplitPlanSource = '',
    frontendSystemInventoryRenderersSplitScriptSource = '',
    frontendSystemInventoryRenderersSplitPlanSource = '',
    frontendCurrentStateRenderersSplitScriptSource = '',
    frontendCurrentStateRenderersSplitPlanSource = '',
    frontendDecisionQuestionRenderersSplitScriptSource = '',
    frontendDecisionQuestionRenderersSplitPlanSource = '',
    repoFileExists = async () => false,
  } = input
  const checks = []

  const frontendMonolithSplitCard = (foundationHub.backlogItems || []).find(item => item.id === FRONTEND_MONOLITH_SPLIT_CARD_ID) || null
  const frontendMonolithSplitCloseout = foundationBuildCloseouts.find(closeout => closeout.key === FRONTEND_MONOLITH_SPLIT_CLOSEOUT_KEY) || null
  const frontendScriptOrder = evaluateFrontendScriptOrder(extractFoundationScriptOrder(foundationHtmlSource))
  const frontendUiLineCount = String(foundationUiSource || '').split('\n').length
  const frontendMonolithDogfood = buildFrontendMonolithSplitDogfoodProof({
    order: frontendScriptOrder.order,
    routeDispatch: {
      backlog: true,
      systemHealth: true,
    },
    cache: {
      repeatedReadUsesCache: true,
      clearInvalidates: true,
      mutationClears: true,
    },
    lineCounts: {
      before: FRONTEND_MONOLITH_SPLIT_BEFORE_LINES,
      after: frontendUiLineCount,
    },
  })
  ensure(
    checks,
      frontendMonolithSplitCard &&
      frontendMonolithSplitCard.lane === 'done' &&
      String(frontendMonolithSplitCard.statusNote || '').includes(FRONTEND_MONOLITH_SPLIT_CLOSEOUT_KEY) &&
      frontendMonolithSplitCloseout?.operatorCloseout === true &&
      (frontendMonolithSplitCloseout.backlogIds || []).includes(FRONTEND_MONOLITH_SPLIT_CARD_ID) &&
      frontendScriptOrder.ok === true &&
      frontendMonolithDogfood.ok === true &&
      packageJson.scripts?.['process:frontend-monolith-split-check'] === `node --env-file-if-exists=.env ${FRONTEND_MONOLITH_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(FRONTEND_MONOLITH_SPLIT_PLAN_PATH) &&
      await repoFileExists(FRONTEND_MONOLITH_SPLIT_APPROVAL_PATH) &&
      await repoFileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-15-frontend-monolith-split-closeout.md') &&
      foundationNavConfigSource.includes('sectionLabels') &&
      foundationDataSource.includes('function fetchFoundationHub') &&
      foundationDataSource.includes('function foundationMutation') &&
      foundationRouterSource.includes('function route()') &&
      foundationRouterSource.includes('function init()') &&
      !foundationUiSource.includes('var cache = {') &&
      !foundationUiSource.includes('function fetchFoundationHub()') &&
      !foundationUiSource.includes('function route()') &&
      !foundationUiSource.includes('function init()') &&
      frontendMonolithSplitScriptSource.includes('runBrowserDogfood') &&
      frontendMonolithSplitScriptSource.includes('vm.runInContext') &&
      frontendMonolithSplitScriptSource.includes('VM browser proof routes to expected renderers') &&
      frontendMonolithSplitPlanSource.includes('Route/performance budget') &&
      currentPlan.includes(FRONTEND_MONOLITH_SPLIT_CLOSEOUT_KEY) &&
      currentState.includes(FRONTEND_MONOLITH_SPLIT_CLOSEOUT_KEY) &&
      (activeFoundationSprint.sprint?.sprintId === FRONTEND_MONOLITH_SPLIT_SPRINT_ID ||
        activeSprintAtOrPast([FRONTEND_MONOLITH_SPLIT_CARD_ID])) &&
      foundationVerifySource.includes('evaluateFoundationFrontendSplitVerifier'),
    'FRONTEND-MONOLITH-SPLIT-001 splits Foundation nav, data/cache, and router seams out of public/foundation.js',
    frontendMonolithSplitCard
      ? `lane=${frontendMonolithSplitCard.lane} dogfood=${frontendMonolithDogfood.ok ? 'pass' : 'blocked'} lines=${FRONTEND_MONOLITH_SPLIT_BEFORE_LINES}->${frontendUiLineCount}`
      : `missing ${FRONTEND_MONOLITH_SPLIT_CARD_ID}`,
  )
  const frontendOperationsRenderersSplitCard = (foundationHub.backlogItems || []).find(item => item.id === FRONTEND_OPERATIONS_RENDERERS_SPLIT_CARD_ID) || null
  const frontendOperationsRenderersSplitCloseout = foundationBuildCloseouts.find(closeout => closeout.key === FRONTEND_OPERATIONS_RENDERERS_SPLIT_CLOSEOUT_KEY) || null
  const frontendOperationsScriptOrder = evaluateFrontendOperationsScriptOrder(extractFoundationScriptOrder(foundationHtmlSource))
  const frontendOperationsDogfood = evaluateFrontendOperationsRendererSplit({
    foundationSource: foundationUiSource,
    operationsSource: foundationOperationsRenderersSource,
    htmlSource: foundationHtmlSource,
    lineCounts: {
      before: FRONTEND_OPERATIONS_RENDERERS_SPLIT_BEFORE_LINES,
      after: frontendUiLineCount,
    },
    routeDispatch: {
      buildLog: true,
      systemHealth: true,
      systemActivity: true,
      dailySummary: true,
    },
    helperBehavior: {
      anchor: true,
      commitGrouping: true,
      textList: true,
      daySelector: true,
    },
  })
  ensure(
    checks,
      frontendOperationsRenderersSplitCard &&
      frontendOperationsRenderersSplitCard.lane === 'done' &&
      String(frontendOperationsRenderersSplitCard.statusNote || '').includes(FRONTEND_OPERATIONS_RENDERERS_SPLIT_CLOSEOUT_KEY) &&
      frontendOperationsRenderersSplitCloseout?.operatorCloseout === true &&
      (frontendOperationsRenderersSplitCloseout.backlogIds || []).includes(FRONTEND_OPERATIONS_RENDERERS_SPLIT_CARD_ID) &&
      frontendOperationsScriptOrder.ok === true &&
      frontendOperationsDogfood.ok === true &&
      packageJson.scripts?.['process:frontend-operations-renderers-split-check'] === `node --env-file-if-exists=.env ${FRONTEND_OPERATIONS_RENDERERS_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(FRONTEND_OPERATIONS_RENDERERS_SPLIT_PLAN_PATH) &&
      await repoFileExists(FRONTEND_OPERATIONS_RENDERERS_SPLIT_APPROVAL_PATH) &&
      await repoFileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-15-frontend-operations-renderers-split-closeout.md') &&
      foundationOperationsRenderersSource.includes('function renderDataHealth()') &&
      foundationOperationsRenderersSource.includes('function renderSystemActivity()') &&
      foundationOperationsRenderersSource.includes('function renderDailySummary()') &&
      foundationOperationsRenderersSource.includes('function renderBuildLog()') &&
      !foundationUiSource.includes('function renderDataHealth()') &&
      !foundationUiSource.includes('function renderDailySummary()') &&
      !foundationUiSource.includes('function renderBuildLog()') &&
      frontendOperationsRenderersSplitScriptSource.includes('runOperationsBrowserDogfood') &&
      frontendOperationsRenderersSplitScriptSource.includes('VM router dispatch reaches extracted operations renderers') &&
      frontendOperationsRenderersSplitPlanSource.includes('read-only by default') &&
      currentPlan.includes(FRONTEND_OPERATIONS_RENDERERS_SPLIT_CLOSEOUT_KEY) &&
      currentState.includes(FRONTEND_OPERATIONS_RENDERERS_SPLIT_CLOSEOUT_KEY) &&
      (activeFoundationSprint.sprint?.sprintId === FRONTEND_OPERATIONS_RENDERERS_SPLIT_SPRINT_ID ||
        activeSprintAtOrPast([FRONTEND_OPERATIONS_RENDERERS_SPLIT_CARD_ID])) &&
      foundationVerifySource.includes('evaluateFoundationFrontendSplitVerifier'),
    'FRONTEND-OPERATIONS-RENDERERS-SPLIT-001 splits Foundation operations renderers out of public/foundation.js',
    frontendOperationsRenderersSplitCard
      ? `lane=${frontendOperationsRenderersSplitCard.lane} dogfood=${frontendOperationsDogfood.ok ? 'pass' : 'blocked'} lines=${FRONTEND_OPERATIONS_RENDERERS_SPLIT_BEFORE_LINES}->${frontendUiLineCount}`
      : `missing ${FRONTEND_OPERATIONS_RENDERERS_SPLIT_CARD_ID}`,
  )
  const frontendRuntimeRenderersSplitCard = (foundationHub.backlogItems || []).find(item => item.id === FRONTEND_RUNTIME_RENDERERS_SPLIT_CARD_ID) || null
  const frontendRuntimeRenderersSplitCloseout = foundationBuildCloseouts.find(closeout => closeout.key === FRONTEND_RUNTIME_RENDERERS_SPLIT_CLOSEOUT_KEY) || null
  const frontendRuntimeScriptOrder = evaluateFrontendRuntimeScriptOrder(extractFoundationScriptOrder(foundationHtmlSource))
  const frontendRuntimeDogfood = evaluateFrontendRuntimeRendererSplit({
    foundationSource: foundationUiSource,
    runtimeSource: foundationRuntimeRenderersSource,
    operationsSource: foundationOperationsRenderersSource,
    htmlSource: foundationHtmlSource,
    lineCounts: {
      before: FRONTEND_RUNTIME_RENDERERS_SPLIT_BEFORE_LINES,
      after: frontendUiLineCount,
    },
    routeDispatch: {
      systemHealth: true,
      jobs: true,
      llmRuntime: true,
      runtimeProcess: true,
    },
    helperBehavior: {
      purposePanel: true,
      statusGroup: true,
      llmPanel: true,
    },
  })
  ensure(
    checks,
      frontendRuntimeRenderersSplitCard &&
      frontendRuntimeRenderersSplitCard.lane === 'done' &&
      String(frontendRuntimeRenderersSplitCard.statusNote || '').includes(FRONTEND_RUNTIME_RENDERERS_SPLIT_CLOSEOUT_KEY) &&
      frontendRuntimeRenderersSplitCloseout?.operatorCloseout === true &&
      (frontendRuntimeRenderersSplitCloseout.backlogIds || []).includes(FRONTEND_RUNTIME_RENDERERS_SPLIT_CARD_ID) &&
      frontendRuntimeScriptOrder.ok === true &&
      frontendRuntimeDogfood.ok === true &&
      packageJson.scripts?.['process:frontend-runtime-renderers-split-check'] === `node --env-file-if-exists=.env ${FRONTEND_RUNTIME_RENDERERS_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(FRONTEND_RUNTIME_RENDERERS_SPLIT_PLAN_PATH) &&
      await repoFileExists(FRONTEND_RUNTIME_RENDERERS_SPLIT_APPROVAL_PATH) &&
      await repoFileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-15-frontend-runtime-renderers-split-closeout.md') &&
      foundationRuntimeRenderersSource.includes('function renderFoundationOperationsPurposePanel(') &&
      foundationRuntimeRenderersSource.includes('function renderFoundationJobsPanel(') &&
      foundationRuntimeRenderersSource.includes('function renderRuntimeProcessControlPanel(') &&
      foundationRuntimeRenderersSource.includes('function renderLlmRuntimePanel(') &&
      !foundationUiSource.includes('function renderFoundationOperationsPurposePanel(') &&
      !foundationUiSource.includes('function renderFoundationJobsPanel(') &&
      !foundationUiSource.includes('function renderLlmRuntimePanel(') &&
      foundationOperationsRenderersSource.includes('renderFoundationOperationsPurposePanel(') &&
      foundationOperationsRenderersSource.includes('renderFoundationJobsPanel(') &&
      frontendRuntimeRenderersSplitScriptSource.includes('runRuntimeBrowserDogfood') &&
      frontendRuntimeRenderersSplitScriptSource.includes('VM Runtime Health dispatch reaches extracted runtime renderers') &&
      frontendRuntimeRenderersSplitPlanSource.includes('read-only by default') &&
      currentPlan.includes(FRONTEND_RUNTIME_RENDERERS_SPLIT_CLOSEOUT_KEY) &&
      currentState.includes(FRONTEND_RUNTIME_RENDERERS_SPLIT_CLOSEOUT_KEY) &&
      (activeFoundationSprint.sprint?.sprintId === FRONTEND_RUNTIME_RENDERERS_SPLIT_SPRINT_ID ||
        activeSprintAtOrPast([FRONTEND_RUNTIME_RENDERERS_SPLIT_CARD_ID])) &&
      foundationVerifySource.includes('evaluateFoundationFrontendSplitVerifier'),
    'FRONTEND-RUNTIME-RENDERERS-SPLIT-001 splits Foundation runtime diagnostics renderers out of public/foundation.js',
    frontendRuntimeRenderersSplitCard
      ? `lane=${frontendRuntimeRenderersSplitCard.lane} dogfood=${frontendRuntimeDogfood.ok ? 'pass' : 'blocked'} lines=${FRONTEND_RUNTIME_RENDERERS_SPLIT_BEFORE_LINES}->${frontendUiLineCount}`
      : `missing ${FRONTEND_RUNTIME_RENDERERS_SPLIT_CARD_ID}`,
  )
  const frontendSourceLifecycleRenderersSplitCard = (foundationHub.backlogItems || []).find(item => item.id === FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_CARD_ID) || null
  const frontendSourceLifecycleRenderersSplitCloseout = foundationBuildCloseouts.find(closeout => closeout.key === FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_CLOSEOUT_KEY) || null
  const frontendSourceLifecycleScriptOrder = evaluateFrontendSourceLifecycleScriptOrder(extractFoundationScriptOrder(foundationHtmlSource))
  const frontendSourceLifecycleDogfood = evaluateFrontendSourceLifecycleRendererSplit({
    foundationSource: foundationUiSource,
    sourceLifecycleSource: foundationSourceLifecycleRenderersSource,
    runtimeSource: foundationRuntimeRenderersSource,
    operationsSource: foundationOperationsRenderersSource,
    htmlSource: foundationHtmlSource,
    lineCounts: {
      before: FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_BEFORE_LINES,
      after: frontendUiLineCount,
    },
    routeDispatch: {
      sourceLifecycle: true,
      hero: true,
      summary: true,
      scope: true,
    },
    helperBehavior: {
      hero: true,
      summary: true,
      maturityGrid: true,
      coverage: true,
    },
  })
  ensure(
    checks,
      frontendSourceLifecycleRenderersSplitCard &&
      frontendSourceLifecycleRenderersSplitCard.lane === 'done' &&
      String(frontendSourceLifecycleRenderersSplitCard.statusNote || '').includes(FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_CLOSEOUT_KEY) &&
      frontendSourceLifecycleRenderersSplitCloseout?.operatorCloseout === true &&
      (frontendSourceLifecycleRenderersSplitCloseout.backlogIds || []).includes(FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_CARD_ID) &&
      frontendSourceLifecycleScriptOrder.ok === true &&
      frontendSourceLifecycleDogfood.ok === true &&
      packageJson.scripts?.['process:frontend-source-lifecycle-renderers-split-check'] === `node --env-file-if-exists=.env ${FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_PLAN_PATH) &&
      await repoFileExists(FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_APPROVAL_PATH) &&
      await repoFileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-15-frontend-source-lifecycle-renderers-split-closeout.md') &&
      foundationSourceLifecycleRenderersSource.includes('function renderSourceLifecycleHero(') &&
      foundationSourceLifecycleRenderersSource.includes('function renderSourceMaturityGridPanel(') &&
      foundationSourceLifecycleRenderersSource.includes('function renderSourceExtractionCoveragePanel(') &&
      foundationSourceLifecycleRenderersSource.includes('function renderSourceLifecycleScope(') &&
      !foundationUiSource.includes('function renderSourceLifecycleHero(') &&
      !foundationUiSource.includes('function renderSourceMaturityGridPanel(') &&
      !foundationUiSource.includes('function renderSourceLifecycleScope(') &&
      foundationUiSource.includes('function renderSourceLifecycle()') &&
      foundationUiSource.includes('renderSourceLifecycleHero(') &&
      foundationUiSource.includes('renderSourceLifecycleScope(') &&
      frontendSourceLifecycleRenderersSplitScriptSource.includes('runSourceLifecycleBrowserDogfood') &&
      frontendSourceLifecycleRenderersSplitScriptSource.includes('VM Source Lifecycle dispatch reaches extracted renderers') &&
      frontendSourceLifecycleRenderersSplitPlanSource.includes('read-only by default') &&
      currentPlan.includes(FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_CLOSEOUT_KEY) &&
      currentState.includes(FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_CLOSEOUT_KEY) &&
      (activeFoundationSprint.sprint?.sprintId === FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_SPRINT_ID ||
        activeSprintAtOrPast([FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_CARD_ID])) &&
      foundationVerifySource.includes('evaluateFoundationFrontendSplitVerifier'),
    'FRONTEND-SOURCE-LIFECYCLE-RENDERERS-SPLIT-001 splits Foundation source lifecycle renderers out of public/foundation.js',
    frontendSourceLifecycleRenderersSplitCard
      ? `lane=${frontendSourceLifecycleRenderersSplitCard.lane} dogfood=${frontendSourceLifecycleDogfood.ok ? 'pass' : 'blocked'} lines=${FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_BEFORE_LINES}->${frontendUiLineCount}`
      : `missing ${FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_CARD_ID}`,
  )
  const frontendSourceRegistryRenderersSplitCard = (foundationHub.backlogItems || []).find(item => item.id === FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_CARD_ID) || null
  const frontendSourceRegistryRenderersSplitCloseout = foundationBuildCloseouts.find(closeout => closeout.key === FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_CLOSEOUT_KEY) || null
  const frontendSourceRegistryScriptOrder = evaluateFrontendSourceRegistryScriptOrder(extractFoundationScriptOrder(foundationHtmlSource))
  const frontendSourceRegistryDogfood = evaluateFrontendSourceRegistryRendererSplit({
    foundationSource: foundationUiSource,
    sourceRegistrySource: foundationSourceRegistryRenderersSource,
    sourceLifecycleSource: foundationSourceLifecycleRenderersSource,
    runtimeSource: foundationRuntimeRenderersSource,
    operationsSource: foundationOperationsRenderersSource,
    htmlSource: foundationHtmlSource,
    lineCounts: {
      before: FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_BEFORE_LINES,
      after: frontendUiLineCount,
    },
    routeDispatch: {
      sourceRegistry: true,
      hero: true,
      systems: true,
      connectors: true,
      kpi: true,
    },
    helperBehavior: {
      tag: true,
      meta: true,
      bullet: true,
      connector: true,
      sourceLifecycleUsesSharedHelpers: true,
    },
  })
  ensure(
    checks,
      frontendSourceRegistryRenderersSplitCard &&
      frontendSourceRegistryRenderersSplitCard.lane === 'done' &&
      String(frontendSourceRegistryRenderersSplitCard.statusNote || '').includes(FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_CLOSEOUT_KEY) &&
      frontendSourceRegistryRenderersSplitCloseout?.operatorCloseout === true &&
      (frontendSourceRegistryRenderersSplitCloseout.backlogIds || []).includes(FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_CARD_ID) &&
      frontendSourceRegistryScriptOrder.ok === true &&
      frontendSourceRegistryDogfood.ok === true &&
      packageJson.scripts?.['process:frontend-source-registry-renderers-split-check'] === `node --env-file-if-exists=.env ${FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_PLAN_PATH) &&
      await repoFileExists(FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_APPROVAL_PATH) &&
      await repoFileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-15-frontend-source-registry-renderers-split-closeout.md') &&
      foundationSourceRegistryRenderersSource.includes('function renderSourceHero(') &&
      foundationSourceRegistryRenderersSource.includes('function renderSourceSystemsPanel(') &&
      foundationSourceRegistryRenderersSource.includes('function renderSourceConnectorsPanel(') &&
      foundationSourceRegistryRenderersSource.includes('function renderKpiSupabaseHealthPanel(') &&
      foundationSourceRegistryRenderersSource.includes('function renderSourceTag(') &&
      !foundationUiSource.includes('function renderSourceHero(') &&
      !foundationUiSource.includes('function renderSourceSystemsPanel(') &&
      !foundationUiSource.includes('function renderSourceConnectorsPanel(') &&
      !foundationUiSource.includes('function renderKpiSupabaseHealthPanel(') &&
      foundationUiSource.includes('function renderSourceRegistry(section)') &&
      foundationUiSource.includes('renderSourceHero(') &&
      foundationUiSource.includes('renderSourceConnectorsPanel(') &&
      foundationSourceLifecycleRenderersSource.includes('renderSourceTag(') &&
      frontendSourceRegistryRenderersSplitScriptSource.includes('runSourceRegistryBrowserDogfood') &&
      frontendSourceRegistryRenderersSplitScriptSource.includes('VM Source Registry dispatch reaches extracted renderers') &&
      frontendSourceRegistryRenderersSplitPlanSource.includes('read-only by default') &&
      currentPlan.includes(FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_CLOSEOUT_KEY) &&
      currentState.includes(FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_CLOSEOUT_KEY) &&
      (activeFoundationSprint.sprint?.sprintId === FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_SPRINT_ID ||
        activeSprintAtOrPast([FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_CARD_ID])) &&
      foundationVerifySource.includes('evaluateFoundationFrontendSplitVerifier'),
    'FRONTEND-SOURCE-REGISTRY-RENDERERS-SPLIT-001 splits Foundation source registry renderers out of public/foundation.js',
    frontendSourceRegistryRenderersSplitCard
      ? `lane=${frontendSourceRegistryRenderersSplitCard.lane} dogfood=${frontendSourceRegistryDogfood.ok ? 'pass' : 'blocked'} lines=${FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_BEFORE_LINES}->${frontendUiLineCount}`
      : `missing ${FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_CARD_ID}`,
  )
  const frontendFubLeadSourceRenderersSplitCard = (foundationHub.backlogItems || []).find(item => item.id === FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_CARD_ID) || null
  const frontendFubLeadSourceRenderersSplitCloseout = foundationBuildCloseouts.find(closeout => closeout.key === FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_CLOSEOUT_KEY) || null
  const frontendFubLeadSourceScriptOrder = evaluateFrontendFubLeadSourceScriptOrder(extractFoundationScriptOrder(foundationHtmlSource))
  const frontendFubLeadSourceDogfood = evaluateFrontendFubLeadSourceRendererSplit({
    foundationSource: foundationUiSource,
    fubLeadSourceSource: foundationFubLeadSourceRenderersSource,
    sourceRegistrySource: foundationSourceRegistryRenderersSource,
    dataSource: foundationDataSource,
    htmlSource: foundationHtmlSource,
    lineCounts: {
      before: FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_BEFORE_LINES,
      after: frontendUiLineCount,
    },
    routeGlobals: {
      manager: true,
      ownersGovernance: true,
      state: true,
      groupOptions: true,
    },
    helperBehavior: {
      tagHelpers: true,
      groupOrder: true,
      driftPanel: true,
      managerRender: true,
      noLiveMutationOnInitialRender: true,
    },
  })
  ensure(
    checks,
      frontendFubLeadSourceRenderersSplitCard &&
      frontendFubLeadSourceRenderersSplitCard.lane === 'done' &&
      String(frontendFubLeadSourceRenderersSplitCard.statusNote || '').includes(FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_CLOSEOUT_KEY) &&
      frontendFubLeadSourceRenderersSplitCloseout?.operatorCloseout === true &&
      (frontendFubLeadSourceRenderersSplitCloseout.backlogIds || []).includes(FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_CARD_ID) &&
      frontendFubLeadSourceScriptOrder.ok === true &&
      frontendFubLeadSourceDogfood.ok === true &&
      packageJson.scripts?.['process:frontend-fub-lead-source-renderers-split-check'] === `node --env-file-if-exists=.env ${FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_PLAN_PATH) &&
      await repoFileExists(FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_APPROVAL_PATH) &&
      await repoFileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-15-frontend-fub-lead-source-renderers-split-closeout.md') &&
      foundationFubLeadSourceRenderersSource.includes('function renderFubLeadSourceManagerPanel()') &&
      foundationFubLeadSourceRenderersSource.includes('function renderOwnersLeadSourceGovernancePanel(loaded)') &&
      foundationFubLeadSourceRenderersSource.includes('function renderFubLeadSourceDriftPanel(loaded)') &&
      foundationFubLeadSourceRenderersSource.includes('var fubLeadSourceViewState =') &&
      foundationFubLeadSourceRenderersSource.includes('var FUB_SOURCE_GROUP_OPTIONS =') &&
      !foundationUiSource.includes('function renderFubLeadSourceManagerPanel()') &&
      !foundationUiSource.includes('function renderOwnersLeadSourceGovernancePanel(loaded)') &&
      !foundationUiSource.includes('function renderFubLeadSourceDriftPanel(loaded)') &&
      !foundationUiSource.includes('var fubLeadSourceViewState =') &&
      !foundationUiSource.includes('var FUB_SOURCE_GROUP_OPTIONS =') &&
      foundationUiSource.includes('renderOwnersLeadSourceGovernancePanel(governance)') &&
      foundationUiSource.includes('renderFubLeadSourceManagerPanel()') &&
      frontendFubLeadSourceRenderersSplitScriptSource.includes('runFubLeadSourceBrowserDogfood') &&
      frontendFubLeadSourceRenderersSplitScriptSource.includes('VM FUB lead-source dispatch reaches extracted renderers') &&
      frontendFubLeadSourceRenderersSplitPlanSource.includes('read-only by default') &&
      currentPlan.includes(FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_CLOSEOUT_KEY) &&
      currentState.includes(FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_CLOSEOUT_KEY) &&
      (activeFoundationSprint.sprint?.sprintId === FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_SPRINT_ID ||
        activeSprintAtOrPast([FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_CARD_ID])) &&
      foundationVerifySource.includes('evaluateFoundationFrontendSplitVerifier'),
    'FRONTEND-FUB-LEAD-SOURCE-RENDERERS-SPLIT-001 splits Foundation FUB lead-source renderers out of public/foundation.js',
    frontendFubLeadSourceRenderersSplitCard
      ? `lane=${frontendFubLeadSourceRenderersSplitCard.lane} dogfood=${frontendFubLeadSourceDogfood.ok ? 'pass' : 'blocked'} lines=${FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_BEFORE_LINES}->${frontendUiLineCount}`
      : `missing ${FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_CARD_ID}`,
  )
  const frontendSystemInventoryRenderersSplitCard = (foundationHub.backlogItems || []).find(item => item.id === FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_CARD_ID) || null
  const frontendSystemInventoryRenderersSplitCloseout = foundationBuildCloseouts.find(closeout => closeout.key === FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_CLOSEOUT_KEY) || null
  const frontendSystemInventoryScriptOrder = evaluateFrontendSystemInventoryScriptOrder(extractFoundationScriptOrder(foundationHtmlSource))
  const frontendSystemInventoryDogfood = evaluateFrontendSystemInventoryRendererSplit({
    foundationSource: foundationUiSource,
    systemInventorySource: foundationSystemInventoryRenderersSource,
    sourceRegistrySource: foundationSourceRegistryRenderersSource,
    routerSource: foundationRouterSource,
    htmlSource: foundationHtmlSource,
    lineCounts: {
      before: FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_BEFORE_LINES,
      after: frontendUiLineCount,
    },
    routeGlobals: {
      foundationSystems: true,
      inventoryDocs: true,
      inventoryArchive: true,
      capabilitySection: true,
      capabilityCatalog: true,
    },
    helperBehavior: {
      systemGrouping: true,
      systemCard: true,
      inventorySplit: true,
      capabilityCard: true,
    },
  })
  ensure(
    checks,
      frontendSystemInventoryRenderersSplitCard &&
      frontendSystemInventoryRenderersSplitCard.lane === 'done' &&
      String(frontendSystemInventoryRenderersSplitCard.statusNote || '').includes(FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_CLOSEOUT_KEY) &&
      frontendSystemInventoryRenderersSplitCloseout?.operatorCloseout === true &&
      (frontendSystemInventoryRenderersSplitCloseout.backlogIds || []).includes(FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_CARD_ID) &&
      frontendSystemInventoryScriptOrder.ok === true &&
      frontendSystemInventoryDogfood.ok === true &&
      packageJson.scripts?.['process:frontend-system-inventory-renderers-split-check'] === `node --env-file-if-exists=.env ${FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_PLAN_PATH) &&
      await repoFileExists(FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_APPROVAL_PATH) &&
      await repoFileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-15-frontend-system-inventory-renderers-split-closeout.md') &&
      foundationSystemInventoryRenderersSource.includes('function renderFoundationSystems()') &&
      foundationSystemInventoryRenderersSource.includes('function renderInventoryDocs()') &&
      foundationSystemInventoryRenderersSource.includes('function renderInventoryArchiveHistory()') &&
      foundationSystemInventoryRenderersSource.includes('function renderCapabilitySection(section)') &&
      foundationSystemInventoryRenderersSource.includes('var capabilityCatalog =') &&
      !foundationUiSource.includes('function renderFoundationSystems()') &&
      !foundationUiSource.includes('function renderInventoryDocs()') &&
      !foundationUiSource.includes('function renderInventoryArchiveHistory()') &&
      !foundationUiSource.includes('function renderCapabilitySection(section)') &&
      !foundationUiSource.includes('var capabilityCatalog =') &&
      foundationRouterSource.includes('renderFoundationSystems()') &&
      foundationRouterSource.includes('renderInventoryDocs()') &&
      foundationRouterSource.includes('renderInventoryArchiveHistory()') &&
      foundationRouterSource.includes('renderCapabilitySection(section)') &&
      frontendSystemInventoryRenderersSplitScriptSource.includes('runSystemInventoryBrowserDogfood') &&
      frontendSystemInventoryRenderersSplitScriptSource.includes('VM System Inventory dispatch reaches extracted renderers') &&
      frontendSystemInventoryRenderersSplitPlanSource.includes('read-only by default') &&
      currentPlan.includes(FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_CLOSEOUT_KEY) &&
      currentState.includes(FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_CLOSEOUT_KEY) &&
      (activeFoundationSprint.sprint?.sprintId === FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_SPRINT_ID ||
        activeSprintAtOrPast([FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_CARD_ID])) &&
      foundationVerifySource.includes('evaluateFoundationFrontendSplitVerifier'),
    'FRONTEND-SYSTEM-INVENTORY-RENDERERS-SPLIT-001 splits Foundation system inventory renderers out of public/foundation.js',
    frontendSystemInventoryRenderersSplitCard
      ? `lane=${frontendSystemInventoryRenderersSplitCard.lane} dogfood=${frontendSystemInventoryDogfood.ok ? 'pass' : 'blocked'} lines=${FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_BEFORE_LINES}->${frontendUiLineCount}`
      : `missing ${FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_CARD_ID}`,
  )
  const frontendCurrentStateRenderersSplitCard = (foundationHub.backlogItems || []).find(item => item.id === FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_CARD_ID) || null
  const frontendCurrentStateRenderersSplitCloseout = foundationBuildCloseouts.find(closeout => closeout.key === FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_CLOSEOUT_KEY) || null
  const frontendCurrentStateScriptOrder = evaluateFrontendCurrentStateScriptOrder(extractFoundationScriptOrder(foundationHtmlSource))
  const frontendCurrentStateDogfood = evaluateFrontendCurrentStateRendererSplit({
    foundationSource: foundationUiSource,
    currentStateSource: foundationCurrentStateRenderersSource,
    dataSource: foundationDataSource,
    runtimeSource: foundationRuntimeRenderersSource,
    routerSource: foundationRouterSource,
    htmlSource: foundationHtmlSource,
    lineCounts: {
      before: FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_BEFORE_LINES,
      after: frontendUiLineCount,
    },
    routeGlobals: {
      currentState: true,
      truthPanel: true,
      executionOrder: true,
      surfaceTable: true,
      sourceHref: true,
    },
    helperBehavior: {
      sourceLinks: true,
      backlogCell: true,
      surfaceTable: true,
      routeRender: true,
    },
  })
  ensure(
    checks,
      frontendCurrentStateRenderersSplitCard &&
      frontendCurrentStateRenderersSplitCard.lane === 'done' &&
      String(frontendCurrentStateRenderersSplitCard.statusNote || '').includes(FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_CLOSEOUT_KEY) &&
      frontendCurrentStateRenderersSplitCloseout?.operatorCloseout === true &&
      (frontendCurrentStateRenderersSplitCloseout.backlogIds || []).includes(FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_CARD_ID) &&
      frontendCurrentStateScriptOrder.ok === true &&
      frontendCurrentStateDogfood.ok === true &&
      packageJson.scripts?.['process:frontend-current-state-renderers-split-check'] === `node --env-file-if-exists=.env ${FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_PLAN_PATH) &&
      await repoFileExists(FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_APPROVAL_PATH) &&
      await repoFileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-15-frontend-current-state-renderers-split-closeout.md') &&
      foundationCurrentStateRenderersSource.includes('function renderCurrentState()') &&
      foundationCurrentStateRenderersSource.includes('function renderFoundationCurrentTruthPanel(hub)') &&
      foundationCurrentStateRenderersSource.includes('function renderCurrentStateSurfaceTable(rows)') &&
      foundationCurrentStateRenderersSource.includes('function renderOwnersReviewQueuePanel(payload)') &&
      !foundationUiSource.includes('function renderCurrentState()') &&
      !foundationUiSource.includes('function renderFoundationCurrentTruthPanel(hub)') &&
      !foundationUiSource.includes('function renderCurrentStateSurfaceTable(rows)') &&
      !foundationUiSource.includes('function renderOwnersReviewQueuePanel(payload)') &&
      foundationRouterSource.includes('renderCurrentState()') &&
      frontendCurrentStateRenderersSplitScriptSource.includes('runCurrentStateBrowserDogfood') &&
      frontendCurrentStateRenderersSplitScriptSource.includes('VM Current State dispatch reaches extracted renderers') &&
      frontendCurrentStateRenderersSplitPlanSource.includes('read-only by default') &&
      currentPlan.includes(FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_CLOSEOUT_KEY) &&
      currentState.includes(FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_CLOSEOUT_KEY) &&
      (activeFoundationSprint.sprint?.sprintId === FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_SPRINT_ID ||
        activeSprintAtOrPast([FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_CARD_ID])) &&
      foundationVerifySource.includes('evaluateFoundationFrontendSplitVerifier'),
    'FRONTEND-CURRENT-STATE-RENDERERS-SPLIT-001 splits Foundation Current State renderers out of public/foundation.js',
    frontendCurrentStateRenderersSplitCard
      ? `lane=${frontendCurrentStateRenderersSplitCard.lane} dogfood=${frontendCurrentStateDogfood.ok ? 'pass' : 'blocked'} lines=${FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_BEFORE_LINES}->${frontendUiLineCount}`
      : `missing ${FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_CARD_ID}`,
  )
  const frontendDecisionQuestionRenderersSplitCard = (foundationHub.backlogItems || []).find(item => item.id === FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_CARD_ID) || null
  const frontendDecisionQuestionRenderersSplitCloseout = foundationBuildCloseouts.find(closeout => closeout.key === FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_CLOSEOUT_KEY) || null
  const frontendDecisionQuestionScriptOrder = evaluateFrontendDecisionQuestionScriptOrder(extractFoundationScriptOrder(foundationHtmlSource))
  const frontendDecisionQuestionDogfood = evaluateFrontendDecisionQuestionRendererSplit({
    foundationSource: foundationUiSource,
    decisionQuestionSource: foundationDecisionQuestionRenderersSource,
    dataSource: foundationDataSource,
    sourceRegistrySource: foundationSourceRegistryRenderersSource,
    runtimeSource: foundationRuntimeRenderersSource,
    routerSource: foundationRouterSource,
    htmlSource: foundationHtmlSource,
    lineCounts: {
      before: FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_BEFORE_LINES,
      after: frontendUiLineCount,
    },
    routeGlobals: {
      decisionCard: true,
      decisionReview: true,
      docUpdate: true,
      questionCard: true,
      questionEditor: true,
    },
    helperBehavior: {
      decisionCard: true,
      decisionReview: true,
      docUpdate: true,
      questionGroups: true,
      questionCard: true,
      createEditors: true,
      routeRender: true,
    },
  })
  ensure(
    checks,
      frontendDecisionQuestionRenderersSplitCard &&
      frontendDecisionQuestionRenderersSplitCard.lane === 'done' &&
      String(frontendDecisionQuestionRenderersSplitCard.statusNote || '').includes(FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_CLOSEOUT_KEY) &&
      frontendDecisionQuestionRenderersSplitCloseout?.operatorCloseout === true &&
      (frontendDecisionQuestionRenderersSplitCloseout.backlogIds || []).includes(FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_CARD_ID) &&
      frontendDecisionQuestionScriptOrder.ok === true &&
      frontendDecisionQuestionDogfood.ok === true &&
      packageJson.scripts?.['process:frontend-decision-question-renderers-split-check'] === `node --env-file-if-exists=.env ${FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_PLAN_PATH) &&
      await repoFileExists(FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_APPROVAL_PATH) &&
      await repoFileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-15-frontend-decision-question-renderers-split-closeout.md') &&
      foundationDecisionQuestionRenderersSource.includes('function renderDecisionMemoryCard(item, hub, pendingUpdates, replacedBy)') &&
      foundationDecisionQuestionRenderersSource.includes('function renderOpenQuestionCard(item)') &&
      foundationDecisionQuestionRenderersSource.includes('function renderDecisionReviewPanel(hub)') &&
      foundationDecisionQuestionRenderersSource.includes('function renderQuestionEditor(item)') &&
      !foundationUiSource.includes('function renderDecisionMemoryCard(item, hub, pendingUpdates, replacedBy)') &&
      !foundationUiSource.includes('function renderOpenQuestionCard(item)') &&
      !foundationUiSource.includes('function renderDecisionReviewPanel(hub)') &&
      !foundationUiSource.includes('function renderQuestionEditor(item)') &&
      foundationUiSource.includes('function renderDecisions()') &&
      foundationUiSource.includes('function renderOpenQuestions()') &&
      foundationRouterSource.includes('renderDecisions()') &&
      foundationRouterSource.includes('renderOpenQuestions()') &&
      frontendDecisionQuestionRenderersSplitScriptSource.includes('runDecisionQuestionBrowserDogfood') &&
      frontendDecisionQuestionRenderersSplitScriptSource.includes('VM Decisions / Open Questions dispatch reaches extracted renderers') &&
      frontendDecisionQuestionRenderersSplitPlanSource.includes('read-only by default') &&
      currentPlan.includes(FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_CLOSEOUT_KEY) &&
      currentState.includes(FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_CLOSEOUT_KEY) &&
      (activeFoundationSprint.sprint?.sprintId === FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_SPRINT_ID ||
        activeSprintAtOrPast([FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_CARD_ID])) &&
      foundationVerifySource.includes('evaluateFoundationFrontendSplitVerifier'),
    'FRONTEND-DECISION-QUESTION-RENDERERS-SPLIT-001 splits Foundation Decisions / Open Questions renderers out of public/foundation.js',
    frontendDecisionQuestionRenderersSplitCard
      ? `lane=${frontendDecisionQuestionRenderersSplitCard.lane} dogfood=${frontendDecisionQuestionDogfood.ok ? 'pass' : 'blocked'} lines=${FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_BEFORE_LINES}->${frontendUiLineCount}`
      : `missing ${FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_CARD_ID}`,
  )

  return {
    ok: checks.every(check => check.ok),
    checks,
    summary: {
      total: checks.length,
      passed: checks.filter(check => check.ok).length,
      failed: checks.filter(check => !check.ok).map(check => check.check),
    },
  }
}

export async function buildFoundationFrontendSplitVerifierDogfoodProof(input = {}) {
  const passing = await evaluateFoundationFrontendSplitVerifier(input)
  const missingDecisionModule = await evaluateFoundationFrontendSplitVerifier({
    ...input,
    foundationDecisionQuestionRenderersSource: '',
  })
  const oldInlineDecisionRenderer = await evaluateFoundationFrontendSplitVerifier({
    ...input,
    foundationUiSource: String(input.foundationUiSource || '') + '\nfunction renderDecisionMemoryCard(item, hub, pendingUpdates, replacedBy) { return item }\n',
  })
  const missingDecisionCloseout = await evaluateFoundationFrontendSplitVerifier({
    ...input,
    foundationBuildCloseouts: (input.foundationBuildCloseouts || []).filter(closeout => closeout?.key !== FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_CLOSEOUT_KEY),
  })
  const wrongScriptOrder = await evaluateFoundationFrontendSplitVerifier({
    ...input,
    foundationHtmlSource: '',
  })
  const missingDecisionModuleRejected = missingDecisionModule.checks.some(check =>
    check.check.includes(FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_CARD_ID) && check.ok === false)
  const oldInlineDecisionRendererRejected = oldInlineDecisionRenderer.checks.some(check =>
    check.check.includes(FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_CARD_ID) && check.ok === false)
  const missingDecisionCloseoutRejected = missingDecisionCloseout.checks.some(check =>
    check.check.includes(FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_CARD_ID) && check.ok === false)
  const wrongScriptOrderRejected = wrongScriptOrder.checks.some(check => check.ok === false)
  return {
    ok: passing.ok === true &&
      missingDecisionModuleRejected &&
      oldInlineDecisionRendererRejected &&
      missingDecisionCloseoutRejected &&
      wrongScriptOrderRejected,
    invariant: 'frontend split verifier accepts healthy live fixtures and rejects missing module, old inline renderer, missing closeout, and wrong script-order fixtures',
    passing,
    missingDecisionModule,
    oldInlineDecisionRenderer,
    missingDecisionCloseout,
    wrongScriptOrder,
    rejected: {
      missingDecisionModule: missingDecisionModuleRejected,
      oldInlineDecisionRenderer: oldInlineDecisionRendererRejected,
      missingDecisionCloseout: missingDecisionCloseoutRejected,
      wrongScriptOrder: wrongScriptOrderRejected,
    },
  }
}
