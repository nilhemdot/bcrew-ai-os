import {
  STYLESHEET_MODULE_PATHS,
  STYLESHEET_MONOLITH_SPLIT_APPROVAL_PATH,
  STYLESHEET_MONOLITH_SPLIT_CARD_ID,
  STYLESHEET_MONOLITH_SPLIT_CLOSEOUT_KEY,
  STYLESHEET_MONOLITH_SPLIT_PLAN_PATH,
  STYLESHEET_MONOLITH_SPLIT_SCRIPT_PATH,
  STYLESHEET_MONOLITH_SPLIT_SPRINT_ID,
  buildStylesheetMonolithSplitDogfoodProof,
  evaluateStylesheetMonolithSplit,
} from './foundation-stylesheet-monolith-split.js'
import {
  VERIFIER_FRONTEND_SPLIT_MODULE_APPROVAL_PATH,
  VERIFIER_FRONTEND_SPLIT_MODULE_BEFORE_LINES,
  VERIFIER_FRONTEND_SPLIT_MODULE_CARD_ID,
  VERIFIER_FRONTEND_SPLIT_MODULE_CLOSEOUT_KEY,
  VERIFIER_FRONTEND_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_FRONTEND_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_FRONTEND_SPLIT_MODULE_SPRINT_ID,
  buildFoundationFrontendSplitVerifierDogfoodProof,
  evaluateFoundationFrontendSplitVerifier,
} from './foundation-frontend-split-verifier.js'

export const VERIFIER_FRONTEND_SPLIT_ASSURANCE_CARD_ID = 'VERIFIER-FRONTEND-SPLIT-ASSURANCE-001'
export const VERIFIER_FRONTEND_SPLIT_ASSURANCE_CLOSEOUT_KEY = 'verifier-frontend-split-assurance-v1'
export const VERIFIER_FRONTEND_SPLIT_ASSURANCE_PLAN_PATH = 'docs/process/verifier-frontend-split-assurance-001-plan.md'
export const VERIFIER_FRONTEND_SPLIT_ASSURANCE_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-FRONTEND-SPLIT-ASSURANCE-001.json'
export const VERIFIER_FRONTEND_SPLIT_ASSURANCE_SCRIPT_PATH = 'scripts/process-verifier-frontend-split-assurance-check.mjs'
export const VERIFIER_FRONTEND_SPLIT_ASSURANCE_HANDOFF_PATH = 'docs/handoffs/2026-05-17-verifier-frontend-split-assurance-closeout.md'
export const VERIFIER_FRONTEND_SPLIT_ASSURANCE_BEFORE_LINES = 11065

const FRONTEND_SPLIT_VERIFIER_COVERED_CARD_IDS = [
  'FRONTEND-MONOLITH-SPLIT-001',
  'FRONTEND-OPERATIONS-RENDERERS-SPLIT-001',
  'FRONTEND-RUNTIME-RENDERERS-SPLIT-001',
  'FRONTEND-SOURCE-LIFECYCLE-RENDERERS-SPLIT-001',
  'FRONTEND-SOURCE-REGISTRY-RENDERERS-SPLIT-001',
  'FRONTEND-FUB-LEAD-SOURCE-RENDERERS-SPLIT-001',
  'FRONTEND-SYSTEM-INVENTORY-RENDERERS-SPLIT-001',
  'FRONTEND-CURRENT-STATE-RENDERERS-SPLIT-001',
  'FRONTEND-DECISION-QUESTION-RENDERERS-SPLIT-001',
]

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function evaluateFrontendSplitFixture(fixture = {}) {
  const findings = []
  if (fixture.stylesheetChecksPass !== true) findings.push('stylesheet_split_failure_hidden')
  if (fixture.frontendVerifierChecksPass !== true) findings.push('frontend_split_verifier_failure_hidden')
  if (fixture.dogfoodPresent !== true) findings.push('frontend_split_dogfood_missing')
  if (fixture.oldInlinePredicatesRemoved !== true) findings.push('old_frontend_inline_predicates_present')
  if (fixture.closeoutProofPresent !== true) findings.push('frontend_split_closeout_proof_missing')
  return { ok: findings.length === 0, findings }
}

export function buildFoundationVerifierFrontendSplitAssuranceDogfoodProof() {
  const healthy = evaluateFrontendSplitFixture({
    stylesheetChecksPass: true,
    frontendVerifierChecksPass: true,
    dogfoodPresent: true,
    oldInlinePredicatesRemoved: true,
    closeoutProofPresent: true,
  })
  const rejected = {
    hiddenStylesheetFailure: evaluateFrontendSplitFixture({
      stylesheetChecksPass: false,
      frontendVerifierChecksPass: true,
      dogfoodPresent: true,
      oldInlinePredicatesRemoved: true,
      closeoutProofPresent: true,
    }),
    hiddenFrontendVerifierFailure: evaluateFrontendSplitFixture({
      stylesheetChecksPass: true,
      frontendVerifierChecksPass: false,
      dogfoodPresent: true,
      oldInlinePredicatesRemoved: true,
      closeoutProofPresent: true,
    }),
    missingDogfood: evaluateFrontendSplitFixture({
      stylesheetChecksPass: true,
      frontendVerifierChecksPass: true,
      dogfoodPresent: false,
      oldInlinePredicatesRemoved: true,
      closeoutProofPresent: true,
    }),
    oldInlinePredicate: evaluateFrontendSplitFixture({
      stylesheetChecksPass: true,
      frontendVerifierChecksPass: true,
      dogfoodPresent: true,
      oldInlinePredicatesRemoved: false,
      closeoutProofPresent: true,
    }),
    missingCloseoutProof: evaluateFrontendSplitFixture({
      stylesheetChecksPass: true,
      frontendVerifierChecksPass: true,
      dogfoodPresent: true,
      oldInlinePredicatesRemoved: true,
      closeoutProofPresent: false,
    }),
  }
  const ok = healthy.ok && Object.values(rejected).every(result => result.ok === false)
  return {
    ok,
    healthy,
    rejected,
    dogfoodInvariant: ok
      ? 'healthy frontend split fixture passes; hidden stylesheet/frontend failures, missing dogfood, inline predicates, and missing closeout proof fail closed'
      : 'frontend split assurance dogfood did not reject every known failure fixture',
  }
}

export async function evaluateFoundationVerifierFrontendSplitAssurance(input = {}) {
  const {
    activeFoundationSprint,
    activeSprintAtOrPast,
    agentFeedbackHtmlSource,
    currentPlan,
    currentState,
    foundationBuildCloseouts,
    foundationCurrentStateRenderersSource,
    foundationDataSource,
    foundationDecisionQuestionRenderersSource,
    foundationFubLeadSourceRenderersSource,
    foundationHtmlSource,
    foundationHub,
    foundationNavConfigSource,
    foundationOperationsRenderersSource,
    foundationRouterSource,
    foundationRuntimeRenderersSource,
    foundationSourceLifecycleRenderersSource,
    foundationSourceRegistryRenderersSource,
    foundationStylesModuleSources,
    foundationStylesRootSource,
    foundationSystemInventoryRenderersSource,
    foundationUiSource,
    foundationVerifySource,
    frontendCurrentStateRenderersSplitPlanSource,
    frontendCurrentStateRenderersSplitScriptSource,
    frontendDecisionQuestionRenderersSplitPlanSource,
    frontendDecisionQuestionRenderersSplitScriptSource,
    frontendFubLeadSourceRenderersSplitPlanSource,
    frontendFubLeadSourceRenderersSplitScriptSource,
    frontendMonolithSplitPlanSource,
    frontendMonolithSplitScriptSource,
    frontendOperationsRenderersSplitPlanSource,
    frontendOperationsRenderersSplitScriptSource,
    frontendRuntimeRenderersSplitPlanSource,
    frontendRuntimeRenderersSplitScriptSource,
    frontendSourceLifecycleRenderersSplitPlanSource,
    frontendSourceLifecycleRenderersSplitScriptSource,
    frontendSourceRegistryRenderersSplitPlanSource,
    frontendSourceRegistryRenderersSplitScriptSource,
    frontendSystemInventoryRenderersSplitPlanSource,
    frontendSystemInventoryRenderersSplitScriptSource,
    foundationFrontendSplitVerifierSource,
    loginHtmlSource,
    moduleSource,
    opsHtmlSource,
    packageJson,
    repoFileExists,
    salesHtmlSource,
    strategicExecutionHtmlSource,
    verifierFrontendSplitModulePlanSource,
    verifierFrontendSplitModuleScriptSource,
  } = input
  const checks = []
  const assuranceSource = [foundationVerifySource, moduleSource].filter(Boolean).join('\n')

  const stylesheetMonolithSplitCard = (foundationHub.backlogItems || []).find(item => item.id === STYLESHEET_MONOLITH_SPLIT_CARD_ID) || null
  const stylesheetMonolithSplitCloseout = foundationBuildCloseouts.find(closeout => closeout.key === STYLESHEET_MONOLITH_SPLIT_CLOSEOUT_KEY) || null
  const stylesheetMonolithSplitDogfood = buildStylesheetMonolithSplitDogfoodProof()
  const stylesheetMonolithEvaluation = evaluateStylesheetMonolithSplit({
    rootSource: foundationStylesRootSource,
    moduleSources: foundationStylesModuleSources,
    htmlSources: {
      'public/foundation.html': foundationHtmlSource,
      'public/login.html': loginHtmlSource,
      'public/ops.html': opsHtmlSource,
      'public/sales.html': salesHtmlSource,
      'public/agent-feedback.html': agentFeedbackHtmlSource,
      'public/strategic-execution.html': strategicExecutionHtmlSource,
    },
  })
  const stylesheetMonolithSprintActive = activeFoundationSprint.sprint?.sprintId === STYLESHEET_MONOLITH_SPLIT_SPRINT_ID &&
    (activeFoundationSprint.items || []).some(item => item.cardId === STYLESHEET_MONOLITH_SPLIT_CARD_ID && ['building_now', 'done_this_sprint'].includes(item.stage))
  const stylesheetMonolithClosed = stylesheetMonolithSplitCard?.lane === 'done' &&
    String(stylesheetMonolithSplitCard.statusNote || '').includes(STYLESHEET_MONOLITH_SPLIT_CLOSEOUT_KEY) &&
    stylesheetMonolithSplitCloseout?.operatorCloseout === true &&
    (stylesheetMonolithSplitCloseout.backlogIds || []).includes(STYLESHEET_MONOLITH_SPLIT_CARD_ID)
  ensure(
    checks,
    stylesheetMonolithSplitCard &&
      (stylesheetMonolithSprintActive || stylesheetMonolithClosed) &&
      stylesheetMonolithSplitDogfood.ok === true &&
      stylesheetMonolithEvaluation.ok === true &&
      packageJson.scripts?.['process:stylesheet-monolith-split-check'] === `node --env-file-if-exists=.env ${STYLESHEET_MONOLITH_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(STYLESHEET_MONOLITH_SPLIT_PLAN_PATH) &&
      await repoFileExists(STYLESHEET_MONOLITH_SPLIT_APPROVAL_PATH) &&
      STYLESHEET_MODULE_PATHS.every(modulePath => foundationStylesRootSource.includes(modulePath.replace('public/', './'))) &&
      (activeFoundationSprint.sprint?.sprintId === STYLESHEET_MONOLITH_SPLIT_SPRINT_ID || activeSprintAtOrPast([STYLESHEET_MONOLITH_SPLIT_CARD_ID])),
    'STYLESHEET-MONOLITH-SPLIT-001 splits public/styles.css into ordered CSS modules',
    stylesheetMonolithSplitCard
      ? `lane=${stylesheetMonolithSplitCard.lane} dogfood=${stylesheetMonolithSplitDogfood.ok ? 'pass' : 'blocked'} rootLines=${stylesheetMonolithEvaluation.rootLines} modules=${stylesheetMonolithEvaluation.moduleLineCounts.map(item => `${item.path}:${item.lines}`).join(',')}`
      : `missing ${STYLESHEET_MONOLITH_SPLIT_CARD_ID}`,
  )

  const frontendSplitVerifierInput = {
    foundationHub,
    foundationBuildCloseouts,
    packageJson,
    currentPlan,
    currentState,
    activeFoundationSprint,
    activeSprintAtOrPast,
    foundationVerifySource: assuranceSource,
    foundationHtmlSource,
    foundationUiSource,
    foundationNavConfigSource,
    foundationDataSource,
    foundationRouterSource,
    foundationOperationsRenderersSource,
    foundationRuntimeRenderersSource,
    foundationSourceLifecycleRenderersSource,
    foundationSourceRegistryRenderersSource,
    foundationFubLeadSourceRenderersSource,
    foundationSystemInventoryRenderersSource,
    foundationCurrentStateRenderersSource,
    foundationDecisionQuestionRenderersSource,
    frontendMonolithSplitScriptSource,
    frontendMonolithSplitPlanSource,
    frontendOperationsRenderersSplitScriptSource,
    frontendOperationsRenderersSplitPlanSource,
    frontendRuntimeRenderersSplitScriptSource,
    frontendRuntimeRenderersSplitPlanSource,
    frontendSourceLifecycleRenderersSplitScriptSource,
    frontendSourceLifecycleRenderersSplitPlanSource,
    frontendSourceRegistryRenderersSplitScriptSource,
    frontendSourceRegistryRenderersSplitPlanSource,
    frontendFubLeadSourceRenderersSplitScriptSource,
    frontendFubLeadSourceRenderersSplitPlanSource,
    frontendSystemInventoryRenderersSplitScriptSource,
    frontendSystemInventoryRenderersSplitPlanSource,
    frontendCurrentStateRenderersSplitScriptSource,
    frontendCurrentStateRenderersSplitPlanSource,
    frontendDecisionQuestionRenderersSplitScriptSource,
    frontendDecisionQuestionRenderersSplitPlanSource,
    repoFileExists,
  }
  const frontendSplitVerifier = await evaluateFoundationFrontendSplitVerifier(frontendSplitVerifierInput)
  for (const check of frontendSplitVerifier.checks) {
    ensure(checks, check.ok, check.check, check.detail)
  }
  const verifierFrontendSplitModuleCard = (foundationHub.backlogItems || []).find(item => item.id === VERIFIER_FRONTEND_SPLIT_MODULE_CARD_ID) || null
  const verifierFrontendSplitModuleCloseout = foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_FRONTEND_SPLIT_MODULE_CLOSEOUT_KEY) || null
  const verifierFrontendSplitModuleDogfood = await buildFoundationFrontendSplitVerifierDogfoodProof(frontendSplitVerifierInput)
  const foundationVerifyLineCountAfterFrontendVerifierSplit = String(foundationVerifySource || '').split('\n').length
  ensure(
    checks,
    verifierFrontendSplitModuleCard &&
      ['executing', 'done'].includes(verifierFrontendSplitModuleCard.lane) &&
      String(verifierFrontendSplitModuleCard.statusNote || '').includes(VERIFIER_FRONTEND_SPLIT_MODULE_CLOSEOUT_KEY) &&
      verifierFrontendSplitModuleCloseout?.operatorCloseout === true &&
      (verifierFrontendSplitModuleCloseout.backlogIds || []).includes(VERIFIER_FRONTEND_SPLIT_MODULE_CARD_ID) &&
      verifierFrontendSplitModuleDogfood.ok === true &&
      frontendSplitVerifier.summary.passed === frontendSplitVerifier.summary.total &&
      FRONTEND_SPLIT_VERIFIER_COVERED_CARD_IDS.length === 9 &&
      packageJson.scripts?.['process:verifier-frontend-split-checks-module-check'] === `node --env-file-if-exists=.env ${VERIFIER_FRONTEND_SPLIT_MODULE_SCRIPT_PATH}` &&
      await repoFileExists(VERIFIER_FRONTEND_SPLIT_MODULE_PLAN_PATH) &&
      await repoFileExists(VERIFIER_FRONTEND_SPLIT_MODULE_APPROVAL_PATH) &&
      await repoFileExists('docs/handoffs/2026-05-15-verifier-frontend-split-checks-module-closeout.md') &&
      foundationFrontendSplitVerifierSource.includes('evaluateFoundationFrontendSplitVerifier') &&
      foundationFrontendSplitVerifierSource.includes('buildFoundationFrontendSplitVerifierDogfoodProof') &&
      verifierFrontendSplitModuleScriptSource.includes('dogfood rejects old frontend split verifier failures') &&
      verifierFrontendSplitModulePlanSource.includes('Substring-only proof is rejected') &&
      assuranceSource.includes('evaluateFoundationFrontendSplitVerifier(frontendSplitVerifierInput)') &&
      !foundationVerifySource.includes('const frontendCurrentState' + 'RenderersSplitCard =') &&
      !foundationVerifySource.includes('const frontendDecisionQuestion' + 'RenderersSplitCard =') &&
      String(verifierFrontendSplitModuleCloseout.proofStatus || '').includes('drops from 15,644') &&
      currentPlan.includes(VERIFIER_FRONTEND_SPLIT_MODULE_CLOSEOUT_KEY) &&
      currentState.includes(VERIFIER_FRONTEND_SPLIT_MODULE_CLOSEOUT_KEY) &&
      (activeFoundationSprint.sprint?.sprintId === VERIFIER_FRONTEND_SPLIT_MODULE_SPRINT_ID ||
        activeSprintAtOrPast([VERIFIER_FRONTEND_SPLIT_MODULE_CARD_ID])) &&
      assuranceSource.includes(VERIFIER_FRONTEND_SPLIT_MODULE_CARD_ID),
    'VERIFIER-FRONTEND-SPLIT-CHECKS-MODULE-001 extracts frontend split verifier checks into a focused module',
    verifierFrontendSplitModuleCard
      ? `lane=${verifierFrontendSplitModuleCard.lane} dogfood=${verifierFrontendSplitModuleDogfood.ok ? 'pass' : 'blocked'} frontendSplitChecks=${frontendSplitVerifier.summary.passed}/${frontendSplitVerifier.summary.total} lines=${VERIFIER_FRONTEND_SPLIT_MODULE_BEFORE_LINES}->${foundationVerifyLineCountAfterFrontendVerifierSplit}`
      : `missing ${VERIFIER_FRONTEND_SPLIT_MODULE_CARD_ID}`,
  )

  return {
    ok: checks.every(check => check.ok),
    summary: {
      passed: checks.filter(check => check.ok).length,
      total: checks.length,
    },
    checks,
  }
}
