export const VERIFIER_FRONTEND_STRUCTURAL_ASSURANCE_SPLIT_CARD_ID = 'VERIFIER-FRONTEND-STRUCTURAL-ASSURANCE-SPLIT-001'
export const VERIFIER_FRONTEND_STRUCTURAL_ASSURANCE_SPLIT_CLOSEOUT_KEY = 'verifier-frontend-structural-assurance-split-v1'
export const VERIFIER_FRONTEND_STRUCTURAL_ASSURANCE_SPLIT_PLAN_PATH = 'docs/process/verifier-frontend-structural-assurance-split-001-plan.md'
export const VERIFIER_FRONTEND_STRUCTURAL_ASSURANCE_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-FRONTEND-STRUCTURAL-ASSURANCE-SPLIT-001.json'
export const VERIFIER_FRONTEND_STRUCTURAL_ASSURANCE_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-frontend-structural-assurance-split-check.mjs'
export const VERIFIER_FRONTEND_STRUCTURAL_ASSURANCE_SPLIT_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-verifier-frontend-structural-assurance-split-closeout.md'
export const VERIFIER_FRONTEND_STRUCTURAL_ASSURANCE_SPLIT_BEFORE_LINES = 8772

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function evaluateFrontendStructuralAssuranceFixture(fixture = {}) {
  const findings = []
  if (fixture.frontendAssuranceClosed !== true) findings.push('frontend_assurance_hidden_failure')
  if (fixture.oldInlinePredicatesRemoved !== true) findings.push('old_frontend_structural_assurance_inline_predicates_present')
  return { ok: findings.length === 0, findings }
}

export function buildFoundationVerifierFrontendStructuralAssuranceDogfoodProof() {
  const healthy = evaluateFrontendStructuralAssuranceFixture({
    frontendAssuranceClosed: true,
    oldInlinePredicatesRemoved: true,
  })
  const rejected = {
    hiddenFrontendAssurance: evaluateFrontendStructuralAssuranceFixture({
      frontendAssuranceClosed: false,
      oldInlinePredicatesRemoved: true,
    }),
    oldInlinePredicate: evaluateFrontendStructuralAssuranceFixture({
      frontendAssuranceClosed: true,
      oldInlinePredicatesRemoved: false,
    }),
  }
  const ok = healthy.ok && Object.values(rejected).every(result => result.ok === false)
  return {
    ok,
    healthy,
    rejected,
    dogfoodInvariant: ok
      ? 'healthy frontend structural assurance fixture passes; frontend assurance and old-inline failures fail closed'
      : 'frontend structural assurance dogfood did not reject every known failure fixture',
  }
}

export async function evaluateFoundationVerifierFrontendStructuralAssurance(input = {}) {
  const {
    VERIFIER_FRONTEND_SPLIT_ASSURANCE_APPROVAL_PATH,
    VERIFIER_FRONTEND_SPLIT_ASSURANCE_BEFORE_LINES,
    VERIFIER_FRONTEND_SPLIT_ASSURANCE_CARD_ID,
    VERIFIER_FRONTEND_SPLIT_ASSURANCE_CLOSEOUT_KEY,
    VERIFIER_FRONTEND_SPLIT_ASSURANCE_HANDOFF_PATH,
    VERIFIER_FRONTEND_SPLIT_ASSURANCE_PLAN_PATH,
    VERIFIER_FRONTEND_SPLIT_ASSURANCE_SCRIPT_PATH,
    activeFoundationSprint,
    activeSprintAtOrPast,
    agentFeedbackHtmlSource,
    buildFoundationVerifierFrontendSplitAssuranceDogfoodProof,
    currentPlan,
    currentState,
    evaluateFoundationVerifierFrontendSplitAssurance,
    foundationBuildCloseouts,
    foundationCurrentStateRenderersSource,
    foundationDataSource,
    foundationDecisionQuestionRenderersSource,
    foundationFrontendSplitVerifierSource,
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
    foundationVerifierFrontendSplitAssuranceSource,
    foundationVerifierFrontendStructuralAssuranceSource,
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
    loginHtmlSource,
    opsHtmlSource,
    packageJson,
    repoFileExists,
    salesHtmlSource,
    strategicExecutionHtmlSource,
    verifierFrontendSplitModulePlanSource,
    verifierFrontendSplitModuleScriptSource,
  } = input
  const checks = []
  const frontendStructuralAssuranceDelegationSource = [foundationVerifySource, foundationVerifierFrontendStructuralAssuranceSource].filter(Boolean).join('\n')
  const verifierFrontendSplitAssurance = await evaluateFoundationVerifierFrontendSplitAssurance({
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
    moduleSource: foundationVerifierFrontendSplitAssuranceSource,
    opsHtmlSource,
    packageJson,
    repoFileExists,
    salesHtmlSource,
    strategicExecutionHtmlSource,
    verifierFrontendSplitModulePlanSource,
    verifierFrontendSplitModuleScriptSource,
  })
  checks.push(...verifierFrontendSplitAssurance.checks)
  const verifierFrontendSplitAssuranceCard = (foundationHub.backlogItems || []).find(item => item.id === VERIFIER_FRONTEND_SPLIT_ASSURANCE_CARD_ID) || null
  const verifierFrontendSplitAssuranceCloseout = foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_FRONTEND_SPLIT_ASSURANCE_CLOSEOUT_KEY) || null
  const verifierFrontendSplitAssuranceDogfood = buildFoundationVerifierFrontendSplitAssuranceDogfoodProof()
  const foundationVerifyLineCountAfterFrontendSplitAssurance = String(foundationVerifySource || '').split('\n').length
  const oldFrontendSplitAssuranceInlineMarker = 'const stylesheet' + 'MonolithSplitCard ='
  ensure(
    checks,
    verifierFrontendSplitAssuranceCard &&
      ['executing', 'done'].includes(verifierFrontendSplitAssuranceCard.lane) &&
      String(verifierFrontendSplitAssuranceCard.statusNote || '').includes(VERIFIER_FRONTEND_SPLIT_ASSURANCE_CLOSEOUT_KEY) &&
      verifierFrontendSplitAssuranceCloseout?.operatorCloseout === true &&
      (verifierFrontendSplitAssuranceCloseout.backlogIds || []).includes(VERIFIER_FRONTEND_SPLIT_ASSURANCE_CARD_ID) &&
      verifierFrontendSplitAssuranceDogfood.ok === true &&
      verifierFrontendSplitAssurance.summary.passed === verifierFrontendSplitAssurance.summary.total &&
      packageJson.scripts?.['process:verifier-frontend-split-assurance-check'] === 'node --env-file-if-exists=.env ' + VERIFIER_FRONTEND_SPLIT_ASSURANCE_SCRIPT_PATH &&
      await repoFileExists(VERIFIER_FRONTEND_SPLIT_ASSURANCE_PLAN_PATH) &&
      await repoFileExists(VERIFIER_FRONTEND_SPLIT_ASSURANCE_APPROVAL_PATH) &&
      await repoFileExists(VERIFIER_FRONTEND_SPLIT_ASSURANCE_HANDOFF_PATH) &&
      frontendStructuralAssuranceDelegationSource.includes('evaluateFoundationVerifierFrontendSplitAssurance({') &&
      frontendStructuralAssuranceDelegationSource.includes('verifierFrontendSplitAssurance.checks') &&
      !foundationVerifySource.includes(oldFrontendSplitAssuranceInlineMarker) &&
      foundationVerifyLineCountAfterFrontendSplitAssurance < VERIFIER_FRONTEND_SPLIT_ASSURANCE_BEFORE_LINES &&
      foundationVerifierFrontendSplitAssuranceSource.includes(VERIFIER_FRONTEND_SPLIT_ASSURANCE_CARD_ID),
    'VERIFIER-FRONTEND-SPLIT-ASSURANCE-001 extracts frontend structural split assurance into a focused module',
    verifierFrontendSplitAssuranceCard
      ? 'lane=' + verifierFrontendSplitAssuranceCard.lane + ' dogfood=' + (verifierFrontendSplitAssuranceDogfood.ok ? 'pass' : 'blocked') + ' frontendSplitChecks=' + verifierFrontendSplitAssurance.summary.passed + '/' + verifierFrontendSplitAssurance.summary.total + ' lines=' + VERIFIER_FRONTEND_SPLIT_ASSURANCE_BEFORE_LINES + '->' + foundationVerifyLineCountAfterFrontendSplitAssurance
      : 'missing ' + VERIFIER_FRONTEND_SPLIT_ASSURANCE_CARD_ID,
  )

  return { checks }
}
