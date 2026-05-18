export const VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_CARD_ID = 'VERIFIER-PROCESS-CONTROL-GOVERNANCE-SPLIT-001'
export const VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_CLOSEOUT_KEY = 'verifier-process-control-governance-split-v1'
export const VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_PLAN_PATH = 'docs/process/verifier-process-control-governance-split-001-plan.md'
export const VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-PROCESS-CONTROL-GOVERNANCE-SPLIT-001.json'
export const VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-process-control-governance-split-check.mjs'
export const VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_HANDOFF_PATH = 'docs/handoffs/2026-05-17-verifier-process-control-governance-split-closeout.md'
export const VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_BEFORE_LINES = 8940
export const VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_CARD_ID = 'VERIFIER-PROCESS-CONTROL-ORCHESTRATION-SPLIT-001'
export const VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_CLOSEOUT_KEY = 'verifier-process-control-orchestration-split-v1'
export const VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_PLAN_PATH = 'docs/process/verifier-process-control-orchestration-split-001-plan.md'
export const VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-PROCESS-CONTROL-ORCHESTRATION-SPLIT-001.json'
export const VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-process-control-orchestration-split-check.mjs'
export const VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_HANDOFF_PATH = 'docs/handoffs/2026-05-17-verifier-process-control-orchestration-split-closeout.md'
export const VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_BEFORE_LINES = 5718

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function includesAll(text = '', patterns = []) {
  return patterns.every(pattern => String(text || '').includes(pattern))
}

function evaluateProcessControlGovernanceFixture(fixture = {}) {
  const findings = []
  if (fixture.connectorRoutingTruthClosed !== true) findings.push('connector_routing_truth_hidden_failure')
  if (fixture.processGovernanceClosed !== true) findings.push('process_governance_hidden_failure')
  if (fixture.readinessFollowupClosed !== true) findings.push('readiness_followup_hidden_failure')
  if (fixture.guardrailCloseoutClosed !== true) findings.push('guardrail_closeout_hidden_failure')
  if (fixture.controlLoopClosed !== true) findings.push('control_loop_hidden_failure')
  if (fixture.oldInlinePredicatesRemoved !== true) findings.push('old_process_control_inline_predicates_present')
  return { ok: findings.length === 0, findings }
}

export function buildFoundationVerifierProcessControlGovernanceDogfoodProof() {
  const healthy = evaluateProcessControlGovernanceFixture({
    connectorRoutingTruthClosed: true,
    processGovernanceClosed: true,
    readinessFollowupClosed: true,
    guardrailCloseoutClosed: true,
    controlLoopClosed: true,
    oldInlinePredicatesRemoved: true,
  })
  const rejected = {
    hiddenConnectorRoutingTruth: evaluateProcessControlGovernanceFixture({
      connectorRoutingTruthClosed: false,
      processGovernanceClosed: true,
      readinessFollowupClosed: true,
      guardrailCloseoutClosed: true,
      controlLoopClosed: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenProcessGovernance: evaluateProcessControlGovernanceFixture({
      connectorRoutingTruthClosed: true,
      processGovernanceClosed: false,
      readinessFollowupClosed: true,
      guardrailCloseoutClosed: true,
      controlLoopClosed: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenReadinessFollowup: evaluateProcessControlGovernanceFixture({
      connectorRoutingTruthClosed: true,
      processGovernanceClosed: true,
      readinessFollowupClosed: false,
      guardrailCloseoutClosed: true,
      controlLoopClosed: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenGuardrailCloseout: evaluateProcessControlGovernanceFixture({
      connectorRoutingTruthClosed: true,
      processGovernanceClosed: true,
      readinessFollowupClosed: true,
      guardrailCloseoutClosed: false,
      controlLoopClosed: true,
      oldInlinePredicatesRemoved: true,
    }),
    hiddenControlLoop: evaluateProcessControlGovernanceFixture({
      connectorRoutingTruthClosed: true,
      processGovernanceClosed: true,
      readinessFollowupClosed: true,
      guardrailCloseoutClosed: true,
      controlLoopClosed: false,
      oldInlinePredicatesRemoved: true,
    }),
    oldInlinePredicate: evaluateProcessControlGovernanceFixture({
      connectorRoutingTruthClosed: true,
      processGovernanceClosed: true,
      readinessFollowupClosed: true,
      guardrailCloseoutClosed: true,
      controlLoopClosed: true,
      oldInlinePredicatesRemoved: false,
    }),
  }
  const ok = healthy.ok && Object.values(rejected).every(result => result.ok === false)
  return {
    ok,
    healthy,
    rejected,
    dogfoodInvariant: ok
      ? 'healthy process/control governance fixture passes; connector routing, process governance, readiness follow-up, guardrail closeout, control-loop, and old-inline failures fail closed'
      : 'process/control governance dogfood did not reject every known failure fixture',
  }
}

function evaluateProcessControlOrchestrationFixture(fixture = {}) {
  const findings = []
  if (fixture.wrapperDelegationPresent !== true) findings.push('wrapper_delegation_missing')
  if (fixture.bundleInputSupported !== true) findings.push('bundle_input_not_supported')
  if (fixture.oldDirectRootCallRemoved !== true) findings.push('old_direct_root_call_present')
  if (fixture.closeoutRegistered !== true) findings.push('orchestration_closeout_missing')
  if (fixture.focusedProofRegistered !== true) findings.push('focused_proof_not_registered')
  if (fixture.lineCountDecreased !== true) findings.push('root_line_count_not_reduced')
  return { ok: findings.length === 0, findings }
}

export function buildFoundationVerifierProcessControlOrchestrationDogfoodProof() {
  const healthy = evaluateProcessControlOrchestrationFixture({
    wrapperDelegationPresent: true,
    bundleInputSupported: true,
    oldDirectRootCallRemoved: true,
    closeoutRegistered: true,
    focusedProofRegistered: true,
    lineCountDecreased: true,
  })
  const rejected = {
    missingWrapper: evaluateProcessControlOrchestrationFixture({
      wrapperDelegationPresent: false,
      bundleInputSupported: true,
      oldDirectRootCallRemoved: true,
      closeoutRegistered: true,
      focusedProofRegistered: true,
      lineCountDecreased: true,
    }),
    missingBundleInput: evaluateProcessControlOrchestrationFixture({
      wrapperDelegationPresent: true,
      bundleInputSupported: false,
      oldDirectRootCallRemoved: true,
      closeoutRegistered: true,
      focusedProofRegistered: true,
      lineCountDecreased: true,
    }),
    oldDirectRootCall: evaluateProcessControlOrchestrationFixture({
      wrapperDelegationPresent: true,
      bundleInputSupported: true,
      oldDirectRootCallRemoved: false,
      closeoutRegistered: true,
      focusedProofRegistered: true,
      lineCountDecreased: true,
    }),
    missingCloseout: evaluateProcessControlOrchestrationFixture({
      wrapperDelegationPresent: true,
      bundleInputSupported: true,
      oldDirectRootCallRemoved: true,
      closeoutRegistered: false,
      focusedProofRegistered: true,
      lineCountDecreased: true,
    }),
    missingProofRegistration: evaluateProcessControlOrchestrationFixture({
      wrapperDelegationPresent: true,
      bundleInputSupported: true,
      oldDirectRootCallRemoved: true,
      closeoutRegistered: true,
      focusedProofRegistered: false,
      lineCountDecreased: true,
    }),
    noLineDrop: evaluateProcessControlOrchestrationFixture({
      wrapperDelegationPresent: true,
      bundleInputSupported: true,
      oldDirectRootCallRemoved: true,
      closeoutRegistered: true,
      focusedProofRegistered: true,
      lineCountDecreased: false,
    }),
  }
  return {
    ok: healthy.ok && Object.values(rejected).every(result => result.ok === false),
    healthy,
    rejected,
    dogfoodInvariant: 'Process Control orchestration accepts bundled process/control inputs and rejects missing wrapper delegation, missing bundle support, old direct root calls, missing closeout, missing focused proof registration, and no line-count reduction.',
  }
}

function flattenProcessControlBundles(input = {}) {
  const output = { ...input }
  for (const [key, value] of Object.entries(input || {})) {
    if (!key.endsWith('Bundle') || !value || typeof value !== 'object' || Array.isArray(value)) continue
    Object.assign(output, value)
  }
  return output
}

export async function evaluateFoundationVerifierProcessControlGovernance(input = {}) {
  const {
    AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID,
    AGENT_FEEDBACK_SEND_CARD_ID,
    AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID,
    ATOM_FLOW_AUTO_DEMOTION_CARD_ID,
    ATOM_FLOW_AUTO_DEMOTION_CLOSEOUT_KEY,
    ATOM_FLOW_AUTO_DEMOTION_PLAN_PATH,
    ATOM_FLOW_AUTO_DEMOTION_SCRIPT_PATH,
    CANONICAL_DECISION_CATEGORIES,
    CODE_QUALITY_NIGHTLY_AUDIT_CLOSEOUT_KEY,
    CONNECTOR_CREDENTIAL_CARD_ID,
    CONNECTOR_CREDENTIAL_CLOSEOUT_KEY,
    CONNECTOR_CREDENTIAL_PLAN_PATH,
    CONNECTOR_CREDENTIAL_REQUIRED_KEYS,
    CONNECTOR_CREDENTIAL_SCRIPT_PATH,
    CONNECTOR_ROUTING_TRUTH_CARD_IDS,
    CURRENT_SPRINT_DYNAMIC_TRUTH_CARD_ID,
    CURRENT_SPRINT_DYNAMIC_TRUTH_CLOSEOUT_KEY,
    CURRENT_SPRINT_DYNAMIC_TRUTH_PLAN_PATH,
    CURRENT_SPRINT_DYNAMIC_TRUTH_SCRIPT_PATH,
    DOCTRINE_PROPAGATION_SOURCES,
    DRIVE_ACCESS_REQUEST_CARD_ID,
    EXTRACTION_RETRY_FAILED_JOB_KEY,
    EXTRACTION_RETRY_FAILED_SCRIPT_PATH,
    EXTRACT_RUN_HARDENING_CARD_ID,
    EXTRACT_RUN_HARDENING_EXECUTION_CARD_ID,
    EXTRACT_RUN_HARDENING_EXECUTION_CLOSEOUT_KEY,
    EXTRACT_RUN_HARDENING_EXECUTION_PLAN_PATH,
    EXTRACT_RUN_HARDENING_EXECUTION_SCRIPT_PATH,
    FOUNDATION_DONE_TEST_CARD_ID,
    FOUNDATION_DONE_TEST_CLOSEOUT_KEY,
    FOUNDATION_DONE_TEST_PLAN_PATH,
    FOUNDATION_DONE_TEST_SUMMARY_MARKER,
    FOUNDATION_FOLLOWUP_BUILD_ORDER,
    FOUNDATION_FOLLOWUP_CARD_CAPTURE_APPROVED_PLAN_PATH,
    FOUNDATION_FOLLOWUP_CARD_CAPTURE_CARD_ID,
    FOUNDATION_FOLLOWUP_CARD_CAPTURE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    FOUNDATION_FOLLOWUP_NON_SCOPE_PHRASES,
    FOUNDATION_PLAN_RECONCILE_CARD_ID,
    FOUNDATION_PLAN_RECONCILE_CLOSEOUT_KEY,
    FOUNDATION_PLAN_RECONCILE_PLAN_PATH,
    FOUNDATION_PLAN_RECONCILE_SCRIPT_PATH,
    FOUNDATION_READINESS_GATE_CARD_IDS,
    FOUNDATION_READINESS_REQUIRED_LEG_KEYS,
    FOUNDATION_SPRINT_REVIEW_CARD_ID,
    FOUNDATION_SPRINT_REVIEW_DOC_PATH,
    FOUNDATION_SPRINT_REVIEW_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    FOUNDATION_SYSTEMS_APPROVED_GROUPED_SYSTEM_COUNT,
    FOUNDATION_SYSTEMS_SERVICE_GROUPING_APPROVED_PLAN_PATH,
    FOUNDATION_SYSTEMS_SERVICE_GROUPING_CARD_ID,
    FOUNDATION_SYSTEMS_SERVICE_GROUPING_CLOSEOUT_KEY,
    FOUNDATION_SYSTEMS_SERVICE_GROUPING_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    FOUNDATION_SYSTEMS_SERVICE_GROUPING_NON_SCOPE_PHRASES,
    FOUNDATION_SYSTEMS_SERVICE_GROUPS,
    FOUNDATION_VERIFY_LLM_AUTH_AUDIT_SCRIPT_PATH,
    LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID,
    LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CLOSEOUT_KEY,
    LLM_AUTH_AUDIT_CARD_ID,
    LLM_AUTH_AUDIT_CLOSEOUT_KEY,
    MEETING_VAULT_ACL_CARD_ID,
    MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY,
    PLAN_CRITIC_REPLACEMENT_CARD_ID,
    PLAN_CRITIC_ROOT_VS_PATCH_FINDING_KEY,
    PROCESS_REPAIR_VERIFIER_SPRINT_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    REBUILD_PLAN_RECONCILE_CARD_ID,
    RESEARCH_LANE_PURGE_CARD_ID,
    RESEARCH_LANE_PURGE_CLOSEOUT_KEY,
    RESEARCH_LANE_PURGE_PLAN_PATH,
    RESEARCH_LANE_PURGE_SCRIPT_PATH,
    SALES_GLS_SCOREBOARD_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    SECURITY_BEHAVIOR_PROOF_CARD_ID,
    SOURCE_EXTRACTION_GAP_FOLLOWUP_CARD_ID,
    SOURCE_EXTRACTION_GAP_FOLLOWUP_CLOSEOUT_KEY,
    SOURCE_EXTRACTION_GAP_FOLLOWUP_PLAN_PATH,
    SOURCE_EXTRACTION_GAP_FOLLOWUP_SCRIPT_PATH,
    SOURCE_LIFECYCLE_COMPLETION_CARD_ID,
    SPRINT_STAGE_GATE_CARD_ID,
    SPRINT_STAGE_GATE_CLOSEOUT_KEY,
    SPRINT_STAGE_GATE_PLAN_PATH,
    SPRINT_STAGE_GATE_SCRIPT_PATH,
    SYNTHESIS_VERIFY_CARD_ID,
    SYSTEM_010_CARD_ID,
    SYSTEM_010_CLOSEOUT_KEY,
    SYSTEM_010_PLAN_PATH,
    SYSTEM_REGISTRATION_AGENT_FEEDBACK_SYSTEM_ID,
    SYSTEM_REGISTRATION_GLS_SYSTEM_ID,
    SYSTEM_REGISTRATION_SHIPPED_SYSTEM_REQUIREMENTS,
    SYSTEM_REGISTRATION_SWEEP_APPROVED_PLAN_PATH,
    SYSTEM_REGISTRATION_SWEEP_CARD_ID,
    SYSTEM_REGISTRATION_SWEEP_CLOSEOUT_KEY,
    SYSTEM_REGISTRATION_SWEEP_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
    VERIFIER_CONTROL_LOOP_SPLIT_APPROVAL_PATH,
    VERIFIER_CONTROL_LOOP_SPLIT_BEFORE_LINES,
    VERIFIER_CONTROL_LOOP_SPLIT_CARD_ID,
    VERIFIER_CONTROL_LOOP_SPLIT_CLOSEOUT_KEY,
    VERIFIER_CONTROL_LOOP_SPLIT_HANDOFF_PATH,
    VERIFIER_CONTROL_LOOP_SPLIT_PLAN_PATH,
    VERIFIER_CONTROL_LOOP_SPLIT_SCRIPT_PATH,
    VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_APPROVAL_PATH,
    VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_BEFORE_LINES,
    VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_CARD_ID,
    VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_CLOSEOUT_KEY,
    VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_HANDOFF_PATH,
    VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_PLAN_PATH,
    VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_SCRIPT_PATH,
    VERIFIER_PROCESS_GOVERNANCE_SPLIT_APPROVAL_PATH,
    VERIFIER_PROCESS_GOVERNANCE_SPLIT_BEFORE_LINES,
    VERIFIER_PROCESS_GOVERNANCE_SPLIT_CARD_ID,
    VERIFIER_PROCESS_GOVERNANCE_SPLIT_CLOSEOUT_KEY,
    VERIFIER_PROCESS_GOVERNANCE_SPLIT_HANDOFF_PATH,
    VERIFIER_PROCESS_GOVERNANCE_SPLIT_PLAN_PATH,
    VERIFIER_PROCESS_GOVERNANCE_SPLIT_SCRIPT_PATH,
    VERIFIER_READINESS_FOLLOWUP_SPLIT_APPROVAL_PATH,
    VERIFIER_READINESS_FOLLOWUP_SPLIT_BEFORE_LINES,
    VERIFIER_READINESS_FOLLOWUP_SPLIT_CARD_ID,
    VERIFIER_READINESS_FOLLOWUP_SPLIT_CLOSEOUT_KEY,
    VERIFIER_READINESS_FOLLOWUP_SPLIT_HANDOFF_PATH,
    VERIFIER_READINESS_FOLLOWUP_SPLIT_PLAN_PATH,
    VERIFIER_READINESS_FOLLOWUP_SPLIT_SCRIPT_PATH,
    actionReviewApi,
    actionRouteReviewInboxApi,
    actionReviewApproval,
    actionRouterSnapshot,
    atomFlowAutoDemotion,
    atomFlowAutoDemotionApprovalValidation,
    atomFlowAutoDemotionCloseout,
    atomFlowAutoDemotionCurrentItem,
    atomFlowAutoDemotionPlanSource,
    atomFlowAutoDemotionScriptSource,
    atomFlowAutoDemotionSource,
    atomFlowAutoDemotionSynthetic,
    backlogHygieneApi,
    foundationBacklogListApi,
    buildDoctrinePropagationStatus,
    buildFoundationVerifierControlLoopDogfoodProof,
    buildFoundationVerifierGuardrailCloseoutsDogfoodProof,
    buildFoundationVerifierProcessGovernanceDogfoodProof,
    buildFoundationVerifierReadinessFollowupDogfoodProof,
    buildLlmAuthAuditStatus,
    buildLlmAuthAuditVerifierDogfoodProof,
    buildLogFoundationDoneTestBuild,
    buildLogFoundationFollowupCardCaptureBuild,
    buildLogFoundationSystemsServiceGroupingBuild,
    buildLogSalesGlsScoreboardBuild,
    buildLogSystem010GhostCloseoutBuild,
    buildLogSystemRegistrationSweepBuild,
    buildResearchLanePurgeSnapshot,
    buildSyntheticStaleSkillSource,
    connectorCredential,
    connectorCredentialApprovalValidation,
    connectorCredentialCheckSource,
    connectorCredentialCloseout,
    connectorCredentialCurrentItem,
    connectorCredentialPlanSource,
    connectorCredentialRegistry,
    connectorCredentialRegistrySource,
    connectorCredentialSyntheticSafety,
    connectorRoutingProcessRepairCloseout,
    connectorRoutingProcessRepairSource,
    connectorRoutingTruthCloseout,
    connectorRoutingTruthSprintDone,
    currentPlan,
    currentSprintDynamicTruth,
    currentSprintDynamicTruthApprovalValidation,
    currentSprintDynamicTruthCheckSource,
    currentSprintDynamicTruthCloseout,
    currentSprintDynamicTruthPlanSource,
    currentSprintItemsById,
    currentSprintStoreSource,
    currentState,
    dataStructuredContracts,
    decisionAutoEmit,
    decisionAutoEmitApproval,
    decisionAutoEmitDoc,
    decisionAutoEmitScriptSource,
    decisionAutoEmitSource,
    decisionAutoEmitText,
    docAuthority,
    doctrinePropagation,
    doctrinePropagationApproval,
    doctrinePropagationDoc,
    doctrinePropagationScriptSource,
    doctrinePropagationSource,
    doctrinePropagationText,
    driveContentExtractionSource,
    evaluateDoctrineSkillSource,
    evaluateFoundationVerifierControlLoop,
    evaluateFoundationVerifierGuardrailCloseouts,
    evaluateFoundationVerifierProcessGovernance,
    evaluateFoundationVerifierReadinessFollowup,
    evaluateLlmAuthAuditVerifierCheck,
    extractDecisionCandidatesFromText,
    extractRunHardeningExecution,
    extractRunHardeningExecutionApprovalValidation,
    extractRunHardeningExecutionCloseout,
    extractRunHardeningExecutionCurrentItem,
    extractRunHardeningExecutionPlanSource,
    extractRunHardeningExecutionScriptSource,
    extractRunHardeningExecutionSource,
    extractRunHardeningExecutionSynthetic,
    extractionRetryFailedScriptSource,
    foundationBuildCloseouts,
    foundationBuildIntelRoutesSource,
    foundationBuildLogRegistrySource,
    foundationCurrentSprintSource,
    foundationCurrentSprintStatus,
    foundationDbSource,
    foundationDbWithBacklogSeedSource,
    foundationDoneTest,
    foundationDoneTestApproval,
    foundationDoneTestApprovalValidation,
    foundationDoneTestDocSource,
    foundationDoneTestPlanSource,
    foundationDoneTestReadinessStatus,
    foundationDoneTestRegistrySource,
    foundationDoneTestScriptSource,
    foundationFollowupCardCapture,
    foundationFollowupCardCaptureApprovalValidation,
    foundationFollowupCardCaptureApprovedPlan,
    foundationFollowupCardCaptureAudit,
    foundationFollowupCardCaptureStatus,
    foundationFollowupCards,
    foundationFrontendSource,
    foundationHub,
    foundationJobsSource,
    foundationPlanReconcile,
    foundationPlanReconcileApprovalValidation,
    foundationPlanReconcileCheckSource,
    foundationPlanReconcileCloseout,
    foundationPlanReconcileCurrentItem,
    foundationPlanReconcilePlanSource,
    foundationRuntimeReadRoutesSource,
    foundationSourceLifecycle,
    foundationSourceRoutesSource,
    foundationSprintReview,
    foundationSprintReviewSource,
    foundationStylesSource,
    foundationSystemsServiceGrouping,
    foundationSystemsServiceGroupingApprovalValidation,
    foundationSystemsServiceGroupingApprovedPlan,
    foundationSystemsServiceGroupingBaseline,
    foundationSystemsServiceGroupingManualReview,
    foundationSystemsServiceGroupingStatus,
    foundationVerifierControlLoopSource,
    foundationVerifierGuardrailCloseoutsSource,
    foundationVerifierProcessControlGovernanceSource,
    foundationVerifierProcessGovernanceSource,
    foundationVerifierReadinessFollowupSource,
    foundationVerifySource,
    fubKpiConnectionMapSource,
    fubZahndMiddlewareSource,
    googleDelegatedSource,
    googleSheetsCacheSource,
    historicalCardHasVerifiedCloseout,
    hitListReconcile,
    kpiDashboardSource,
    llmAuthAudit,
    llmAuthAuditApprovalValidation,
    llmAuthAuditCheckSource,
    llmAuthAuditCloseout,
    llmAuthAuditCurrentItem,
    llmAuthAuditJobDefinition,
    llmAuthAuditPlanSource,
    llmAuthAuditProofSource,
    llmAuthAuditVerifierCheckSource,
    llmAuthAuditVerifierModuleSource,
    llmAuthBudgetLabelApprovalValidation,
    llmAuthBudgetLabelCard,
    llmAuthBudgetLabelCheckSource,
    llmAuthBudgetLabelCloseout,
    llmAuthBudgetLabelCurrentItem,
    llmAuthBudgetLabelPlanSource,
    llmAuthBudgetLabelProofSource,
    meetingVaultAutoEnforcementClosed,
    packageJson,
    packageSource,
    planCriticSource,
    planCriticSynthetic,
    processRepairVerifierSprintPlanSource,
    processRepairVerifierSprintScriptSource,
    processRootVsPatch,
    processRootVsPatchCheckSource,
    processRootVsPatchCloseout,
    repoFileExists,
    repoRoot,
    researchLanePurge,
    researchLanePurgeApprovalValidation,
    researchLanePurgeCloseout,
    researchLanePurgeCurrentItem,
    researchLanePurgePlanSource,
    researchLanePurgeReportSource,
    researchLanePurgeScriptSource,
    researchLanePurgeSource,
    researchLanePurgeSynthetic,
    salesGlsScoreboard,
    salesHtmlSource,
    salesHubCheckSource,
    salesUiSource,
    scanDecisionAutoEmitCandidates,
    security001,
    security002,
    security002Approval,
    security002PlanSource,
    security002ProofCheckSource,
    security006,
    securityAccessSource,
    serverRouteSource,
    serverSource,
    sheetsQuotaHardening,
    sheetsQuotaHardeningApproval,
    sheetsQuotaHardeningDoc,
    source021,
    source021Proof,
    source021WriterProofCheckSource,
    sourceConnectorMatrix,
    sourceConnectorMatrixSource,
    sourceContractsSource,
    sourceExtractionGapFollowupApprovalValidation,
    sourceExtractionGapFollowupCard,
    sourceExtractionGapFollowupCheckSource,
    sourceExtractionGapFollowupCloseout,
    sourceExtractionGapFollowupCurrentItem,
    sourceExtractionGapFollowupPlanSource,
    sourceExtractionGapFollowupReportSource,
    sourceExtractionGapFollowupSnapshot,
    sourceExtractionGapFollowupSource,
    sourceExtractionGapMissingIds,
    sourceExtractionGapSyntheticMissingProof,
    sourceHubRoutingMatrix,
    sourceMaturityGridSource,
    sourceOfTruth,
    sourceRegistry,
    sprintProcessRepair,
    sprintProcessRepairPlanSource,
    sprintStageGate,
    sprintStageGateApprovalValidation,
    sprintStageGateCheckSource,
    sprintStageGateCloseout,
    sprintStageGatePlanSource,
    strategySharedCommsRouteSource,
    system010Approval,
    system010ApprovalValidation,
    system010DocSource,
    system010GhostCloseout,
    system010PlanSource,
    system010ProcessScriptSource,
    system010RuntimeSource,
    systemRegistrationSweep,
    systemRegistrationSweepApprovalValidation,
    systemRegistrationSweepApprovedPlan,
    systemRegistrationSweepProof,
    systemRegistrationSweepStatus,
    verifierModularSplit,
    verifierModularSplitCheckSource,
    verifierModularSplitCloseout,
    verifierSprintIndependence,
    verifierSprintIndependenceCloseout,
    verifierSprintProofModuleSource,
  } = input
  const checks = []
  const splitDelegationSource = [foundationVerifySource, foundationVerifierProcessControlGovernanceSource].filter(Boolean).join('\n')
  ensure(
    checks,
    CONNECTOR_ROUTING_TRUTH_CARD_IDS.every(cardId =>
      (foundationHub.backlogItems || []).some(item => item.id === cardId && item.lane === 'done')
    ) &&
      connectorRoutingTruthCloseout &&
      CONNECTOR_ROUTING_TRUTH_CARD_IDS.every(cardId => (connectorRoutingTruthCloseout.backlogIds || []).includes(cardId)) &&
      connectorRoutingTruthSprintDone &&
      packageJson.scripts?.['process:atom-promotion-diagnose-check'] === 'node --env-file-if-exists=.env scripts/process-atom-promotion-diagnose-check.mjs' &&
      packageJson.scripts?.['process:sprint-db-reconcile-check'] === 'node --env-file-if-exists=.env scripts/process-sprint-db-reconcile-check.mjs' &&
      packageJson.scripts?.['process:plan-critic-log-check'] === 'node --env-file-if-exists=.env scripts/process-plan-critic-log-check.mjs' &&
      packageJson.scripts?.['process:source-connector-matrix-check'] === 'node --env-file-if-exists=.env scripts/process-source-connector-matrix-check.mjs' &&
      packageJson.scripts?.['process:source-hub-routing-matrix-check'] === 'node --env-file-if-exists=.env scripts/process-source-hub-routing-matrix-check.mjs' &&
      Array.isArray(sourceConnectorMatrix.rows) &&
      sourceConnectorMatrix.summary?.rowCount >= 25 &&
      Number(sourceConnectorMatrix.summary?.blockedCount || 0) >= 1 &&
      Number(sourceConnectorMatrix.summary?.requiredMissingOrBlockedCount || 0) >= Number(sourceConnectorMatrix.summary?.blockedCount || 0) &&
      ['has_contract', 'has_connector', 'has_extraction_target', 'has_artifacts', 'has_candidates', 'has_promoted_atoms', 'has_synthesis', 'has_routing', 'blocked_reason'].every(column => (sourceConnectorMatrix.columns || []).includes(column)) &&
      Array.isArray(sourceHubRoutingMatrix.rows) &&
      sourceHubRoutingMatrix.summary?.rowCount >= 25 &&
      sourceHubRoutingMatrix.summary?.hubCount >= 16 &&
      ['route', 'candidate', 'blocked', 'n/a', 'unknown'].every(state => (sourceHubRoutingMatrix.states || []).includes(state)) &&
      includesAll(foundationSourceRoutesSource, [
        '/api/foundation/source-connector-matrix',
        '/api/foundation/source-hub-routing-matrix',
        'sourceConnectorMatrix',
        'sourceHubRoutingMatrix',
      ]) &&
      includesAll(foundationFrontendSource, [
        'renderSourceConnectorMatrixPanel',
        'renderSourceHubRoutingMatrixPanel',
        'sourceConnectorMatrix',
        'sourceHubRoutingMatrix',
      ]) &&
      includesAll(foundationVerifySource, CONNECTOR_ROUTING_TRUTH_CARD_IDS),
    'Connector Routing Truth Sprint closes atom flow, gate drift, Plan Critic logging, connector matrix, and hub routing matrix',
    `cards=${CONNECTOR_ROUTING_TRUTH_CARD_IDS.length}/6 connectorRows=${sourceConnectorMatrix.summary?.rowCount ?? 'missing'} routingRows=${sourceHubRoutingMatrix.summary?.rowCount ?? 'missing'} hubs=${sourceHubRoutingMatrix.summary?.hubCount ?? 'missing'}`,
  )
  const processGovernanceVerifier = await evaluateFoundationVerifierProcessGovernance({
    ATOM_FLOW_AUTO_DEMOTION_CARD_ID,
    ATOM_FLOW_AUTO_DEMOTION_CLOSEOUT_KEY,
    ATOM_FLOW_AUTO_DEMOTION_PLAN_PATH,
    ATOM_FLOW_AUTO_DEMOTION_SCRIPT_PATH,
    CODE_QUALITY_NIGHTLY_AUDIT_CLOSEOUT_KEY,
    CONNECTOR_CREDENTIAL_CARD_ID,
    CONNECTOR_CREDENTIAL_CLOSEOUT_KEY,
    CONNECTOR_CREDENTIAL_PLAN_PATH,
    CONNECTOR_CREDENTIAL_REQUIRED_KEYS,
    CONNECTOR_CREDENTIAL_SCRIPT_PATH,
    CURRENT_SPRINT_DYNAMIC_TRUTH_CARD_ID,
    CURRENT_SPRINT_DYNAMIC_TRUTH_CLOSEOUT_KEY,
    CURRENT_SPRINT_DYNAMIC_TRUTH_PLAN_PATH,
    CURRENT_SPRINT_DYNAMIC_TRUTH_SCRIPT_PATH,
    EXTRACTION_RETRY_FAILED_JOB_KEY,
    EXTRACTION_RETRY_FAILED_SCRIPT_PATH,
    EXTRACT_RUN_HARDENING_EXECUTION_CARD_ID,
    EXTRACT_RUN_HARDENING_EXECUTION_CLOSEOUT_KEY,
    EXTRACT_RUN_HARDENING_EXECUTION_PLAN_PATH,
    EXTRACT_RUN_HARDENING_EXECUTION_SCRIPT_PATH,
    FOUNDATION_PLAN_RECONCILE_CARD_ID,
    FOUNDATION_PLAN_RECONCILE_CLOSEOUT_KEY,
    FOUNDATION_PLAN_RECONCILE_PLAN_PATH,
    FOUNDATION_PLAN_RECONCILE_SCRIPT_PATH,
    FOUNDATION_VERIFY_LLM_AUTH_AUDIT_SCRIPT_PATH,
    LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID,
    LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CLOSEOUT_KEY,
    LLM_AUTH_AUDIT_CARD_ID,
    LLM_AUTH_AUDIT_CLOSEOUT_KEY,
    PLAN_CRITIC_ROOT_VS_PATCH_FINDING_KEY,
    PROCESS_REPAIR_VERIFIER_SPRINT_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    RESEARCH_LANE_PURGE_CARD_ID,
    RESEARCH_LANE_PURGE_CLOSEOUT_KEY,
    RESEARCH_LANE_PURGE_PLAN_PATH,
    RESEARCH_LANE_PURGE_SCRIPT_PATH,
    SOURCE_EXTRACTION_GAP_FOLLOWUP_CARD_ID,
    SOURCE_EXTRACTION_GAP_FOLLOWUP_CLOSEOUT_KEY,
    SOURCE_EXTRACTION_GAP_FOLLOWUP_PLAN_PATH,
    SOURCE_EXTRACTION_GAP_FOLLOWUP_SCRIPT_PATH,
    SPRINT_STAGE_GATE_CARD_ID,
    SPRINT_STAGE_GATE_CLOSEOUT_KEY,
    SPRINT_STAGE_GATE_PLAN_PATH,
    SPRINT_STAGE_GATE_SCRIPT_PATH,
    atomFlowAutoDemotion,
    atomFlowAutoDemotionApprovalValidation,
    atomFlowAutoDemotionCloseout,
    atomFlowAutoDemotionCurrentItem,
    atomFlowAutoDemotionPlanSource,
    atomFlowAutoDemotionScriptSource,
    atomFlowAutoDemotionSource,
    atomFlowAutoDemotionSynthetic,
    buildLlmAuthAuditStatus,
    buildLlmAuthAuditVerifierDogfoodProof,
    buildResearchLanePurgeSnapshot,
    connectorCredential,
    connectorCredentialApprovalValidation,
    connectorCredentialCheckSource,
    connectorCredentialCloseout,
    connectorCredentialCurrentItem,
    connectorCredentialPlanSource,
    connectorCredentialRegistry,
    connectorCredentialRegistrySource,
    connectorCredentialSyntheticSafety,
    connectorRoutingProcessRepairCloseout,
    connectorRoutingProcessRepairSource,
    currentPlan,
    currentSprintDynamicTruth,
    currentSprintDynamicTruthApprovalValidation,
    currentSprintDynamicTruthCheckSource,
    currentSprintDynamicTruthCloseout,
    currentSprintDynamicTruthPlanSource,
    currentSprintItemsById,
    currentSprintStoreSource,
    currentState,
    evaluateLlmAuthAuditVerifierCheck,
    extractRunHardeningExecution,
    extractRunHardeningExecutionApprovalValidation,
    extractRunHardeningExecutionCloseout,
    extractRunHardeningExecutionCurrentItem,
    extractRunHardeningExecutionPlanSource,
    extractRunHardeningExecutionScriptSource,
    extractRunHardeningExecutionSource,
    extractRunHardeningExecutionSynthetic,
    extractionRetryFailedScriptSource,
    foundationCurrentSprintSource,
    foundationCurrentSprintStatus,
    foundationDbSource,
    foundationHub,
    foundationJobsSource,
    foundationPlanReconcile,
    foundationPlanReconcileApprovalValidation,
    foundationPlanReconcileCheckSource,
    foundationPlanReconcileCloseout,
    foundationPlanReconcileCurrentItem,
    foundationPlanReconcilePlanSource,
    foundationRuntimeReadRoutesSource,
    foundationSourceLifecycle,
    foundationSourceRoutesSource,
    foundationVerifySource,
    historicalCardHasVerifiedCloseout,
    llmAuthAudit,
    llmAuthAuditApprovalValidation,
    llmAuthAuditCheckSource,
    llmAuthAuditCloseout,
    llmAuthAuditCurrentItem,
    llmAuthAuditJobDefinition,
    llmAuthAuditPlanSource,
    llmAuthAuditProofSource,
    llmAuthAuditVerifierCheckSource,
    llmAuthAuditVerifierModuleSource,
    llmAuthBudgetLabelApprovalValidation,
    llmAuthBudgetLabelCard,
    llmAuthBudgetLabelCheckSource,
    llmAuthBudgetLabelCloseout,
    llmAuthBudgetLabelCurrentItem,
    llmAuthBudgetLabelPlanSource,
    llmAuthBudgetLabelProofSource,
    packageJson,
    planCriticSource,
    planCriticSynthetic,
    processRepairVerifierSprintPlanSource,
    processRepairVerifierSprintScriptSource,
    processRootVsPatch,
    processRootVsPatchCheckSource,
    processRootVsPatchCloseout,
    researchLanePurge,
    researchLanePurgeApprovalValidation,
    researchLanePurgeCloseout,
    researchLanePurgeCurrentItem,
    researchLanePurgePlanSource,
    researchLanePurgeReportSource,
    researchLanePurgeScriptSource,
    researchLanePurgeSource,
    researchLanePurgeSynthetic,
    serverSource,
    sourceConnectorMatrix,
    sourceConnectorMatrixSource,
    sourceExtractionGapFollowupApprovalValidation,
    sourceExtractionGapFollowupCard,
    sourceExtractionGapFollowupCheckSource,
    sourceExtractionGapFollowupCloseout,
    sourceExtractionGapFollowupCurrentItem,
    sourceExtractionGapFollowupPlanSource,
    sourceExtractionGapFollowupReportSource,
    sourceExtractionGapFollowupSnapshot,
    sourceExtractionGapFollowupSource,
    sourceExtractionGapMissingIds,
    sourceExtractionGapSyntheticMissingProof,
    sourceMaturityGridSource,
    sprintProcessRepair,
    sprintProcessRepairPlanSource,
    sprintStageGate,
    sprintStageGateApprovalValidation,
    sprintStageGateCheckSource,
    sprintStageGateCloseout,
    sprintStageGatePlanSource,
    verifierModularSplit,
    verifierModularSplitCheckSource,
    verifierModularSplitCloseout,
    verifierSprintIndependence,
    verifierSprintIndependenceCloseout,
    verifierSprintProofModuleSource,
  })
  checks.push(...processGovernanceVerifier.checks)
  const verifierProcessGovernanceSplitCard = (foundationHub.backlogItems || []).find(item => item.id === VERIFIER_PROCESS_GOVERNANCE_SPLIT_CARD_ID) || null
  const verifierProcessGovernanceSplitCloseout = foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_PROCESS_GOVERNANCE_SPLIT_CLOSEOUT_KEY) || null
  const verifierProcessGovernanceSplitDogfood = buildFoundationVerifierProcessGovernanceDogfoodProof()
  const foundationVerifyLineCountAfterProcessGovernanceSplit = String(foundationVerifySource || '').split('\n').length
  const oldProcessGovernanceInlineMarker = 'const sprintProcess' + "RepairCurrentItem = currentSprintItemsById.get('SPRINT-PROCESS-REPAIR-001')"
  ensure(
    checks,
    verifierProcessGovernanceSplitCard &&
      ['executing', 'done'].includes(verifierProcessGovernanceSplitCard.lane) &&
      String(verifierProcessGovernanceSplitCard.statusNote || '').includes(VERIFIER_PROCESS_GOVERNANCE_SPLIT_CLOSEOUT_KEY) &&
      verifierProcessGovernanceSplitCloseout?.operatorCloseout === true &&
      (verifierProcessGovernanceSplitCloseout.backlogIds || []).includes(VERIFIER_PROCESS_GOVERNANCE_SPLIT_CARD_ID) &&
      verifierProcessGovernanceSplitDogfood.ok === true &&
      processGovernanceVerifier.summary.passed === processGovernanceVerifier.summary.total &&
      packageJson.scripts?.['process:verifier-process-governance-split-check'] === `node --env-file-if-exists=.env ${VERIFIER_PROCESS_GOVERNANCE_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(VERIFIER_PROCESS_GOVERNANCE_SPLIT_PLAN_PATH) &&
      await repoFileExists(VERIFIER_PROCESS_GOVERNANCE_SPLIT_APPROVAL_PATH) &&
      await repoFileExists(VERIFIER_PROCESS_GOVERNANCE_SPLIT_HANDOFF_PATH) &&
      splitDelegationSource.includes('evaluateFoundationVerifierProcessGovernance({') &&
      splitDelegationSource.includes('processGovernanceVerifier.checks') &&
      !foundationVerifySource.includes(oldProcessGovernanceInlineMarker) &&
      foundationVerifyLineCountAfterProcessGovernanceSplit < VERIFIER_PROCESS_GOVERNANCE_SPLIT_BEFORE_LINES &&
      foundationVerifierProcessGovernanceSource.includes(VERIFIER_PROCESS_GOVERNANCE_SPLIT_CARD_ID),
    'VERIFIER-PROCESS-GOVERNANCE-SPLIT-001 extracts process-governance verifier checks into a focused module',
    verifierProcessGovernanceSplitCard
      ? `lane=${verifierProcessGovernanceSplitCard.lane} dogfood=${verifierProcessGovernanceSplitDogfood.ok ? 'pass' : 'blocked'} processChecks=${processGovernanceVerifier.summary.passed}/${processGovernanceVerifier.summary.total} lines=${VERIFIER_PROCESS_GOVERNANCE_SPLIT_BEFORE_LINES}->${foundationVerifyLineCountAfterProcessGovernanceSplit}`
      : `missing ${VERIFIER_PROCESS_GOVERNANCE_SPLIT_CARD_ID}`,
  )
  const readinessFollowupVerifier = await evaluateFoundationVerifierReadinessFollowup({
    AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID,
    AGENT_FEEDBACK_SEND_CARD_ID,
    AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID,
    FOUNDATION_FOLLOWUP_BUILD_ORDER,
    FOUNDATION_FOLLOWUP_CARD_CAPTURE_APPROVED_PLAN_PATH,
    FOUNDATION_FOLLOWUP_CARD_CAPTURE_CARD_ID,
    FOUNDATION_FOLLOWUP_CARD_CAPTURE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    FOUNDATION_FOLLOWUP_NON_SCOPE_PHRASES,
    FOUNDATION_SPRINT_REVIEW_CARD_ID,
    FOUNDATION_SPRINT_REVIEW_DOC_PATH,
    FOUNDATION_SPRINT_REVIEW_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    FOUNDATION_SYSTEMS_APPROVED_GROUPED_SYSTEM_COUNT,
    FOUNDATION_SYSTEMS_SERVICE_GROUPING_APPROVED_PLAN_PATH,
    FOUNDATION_SYSTEMS_SERVICE_GROUPING_CARD_ID,
    FOUNDATION_SYSTEMS_SERVICE_GROUPING_CLOSEOUT_KEY,
    FOUNDATION_SYSTEMS_SERVICE_GROUPING_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    FOUNDATION_SYSTEMS_SERVICE_GROUPING_NON_SCOPE_PHRASES,
    FOUNDATION_SYSTEMS_SERVICE_GROUPS,
    MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY,
    PLAN_CRITIC_REPLACEMENT_CARD_ID,
    REBUILD_PLAN_RECONCILE_CARD_ID,
    SALES_GLS_SCOREBOARD_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    SECURITY_BEHAVIOR_PROOF_CARD_ID,
    SYSTEM_REGISTRATION_AGENT_FEEDBACK_SYSTEM_ID,
    SYSTEM_REGISTRATION_GLS_SYSTEM_ID,
    SYSTEM_REGISTRATION_SHIPPED_SYSTEM_REQUIREMENTS,
    SYSTEM_REGISTRATION_SWEEP_APPROVED_PLAN_PATH,
    SYSTEM_REGISTRATION_SWEEP_CARD_ID,
    SYSTEM_REGISTRATION_SWEEP_CLOSEOUT_KEY,
    SYSTEM_REGISTRATION_SWEEP_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
    buildLogFoundationFollowupCardCaptureBuild,
    buildLogFoundationSystemsServiceGroupingBuild,
    buildLogSalesGlsScoreboardBuild,
    buildLogSystemRegistrationSweepBuild,
    currentPlan,
    currentState,
    foundationDbWithBacklogSeedSource,
    foundationDoneTestReadinessStatus,
    foundationFollowupCardCapture,
    foundationFollowupCardCaptureApprovalValidation,
    foundationFollowupCardCaptureApprovedPlan,
    foundationFollowupCardCaptureAudit,
    foundationFollowupCardCaptureStatus,
    foundationFollowupCards,
    foundationFrontendSource,
    foundationSprintReview,
    foundationSprintReviewSource,
    foundationStylesSource,
    foundationSystemsServiceGrouping,
    foundationSystemsServiceGroupingApprovalValidation,
    foundationSystemsServiceGroupingApprovedPlan,
    foundationSystemsServiceGroupingBaseline,
    foundationSystemsServiceGroupingManualReview,
    foundationSystemsServiceGroupingStatus,
    foundationVerifySource: [foundationVerifySource, foundationVerifierReadinessFollowupSource].filter(Boolean).join('\n'),
    packageSource,
    salesGlsScoreboard,
    salesHtmlSource,
    salesHubCheckSource,
    salesUiSource,
    serverSource,
    sourceContractsSource,
    sourceOfTruth,
    sourceRegistry,
    systemRegistrationSweep,
    systemRegistrationSweepApprovalValidation,
    systemRegistrationSweepApprovedPlan,
    systemRegistrationSweepProof,
    systemRegistrationSweepStatus,
  })
  checks.push(...readinessFollowupVerifier.checks)
  const verifierReadinessFollowupSplitCard = (foundationHub.backlogItems || []).find(item => item.id === VERIFIER_READINESS_FOLLOWUP_SPLIT_CARD_ID) || null
  const verifierReadinessFollowupSplitCloseout = foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_READINESS_FOLLOWUP_SPLIT_CLOSEOUT_KEY) || null
  const verifierReadinessFollowupSplitDogfood = buildFoundationVerifierReadinessFollowupDogfoodProof()
  const foundationVerifyLineCountAfterReadinessFollowupSplit = String(foundationVerifySource || '').split('\n').length
  const oldReadinessFollowupInlineMarker = 'const foundationFollowup' + 'CardsHaveAllowedState = foundationFollowupCards.length === 3'
  ensure(
    checks,
    verifierReadinessFollowupSplitCard &&
      ['executing', 'done'].includes(verifierReadinessFollowupSplitCard.lane) &&
      String(verifierReadinessFollowupSplitCard.statusNote || '').includes(VERIFIER_READINESS_FOLLOWUP_SPLIT_CLOSEOUT_KEY) &&
      verifierReadinessFollowupSplitCloseout?.operatorCloseout === true &&
      (verifierReadinessFollowupSplitCloseout.backlogIds || []).includes(VERIFIER_READINESS_FOLLOWUP_SPLIT_CARD_ID) &&
      verifierReadinessFollowupSplitDogfood.ok === true &&
      readinessFollowupVerifier.summary.passed === readinessFollowupVerifier.summary.total &&
      packageJson.scripts?.['process:verifier-readiness-followup-split-check'] === 'node --env-file-if-exists=.env ' + VERIFIER_READINESS_FOLLOWUP_SPLIT_SCRIPT_PATH &&
      await repoFileExists(VERIFIER_READINESS_FOLLOWUP_SPLIT_PLAN_PATH) &&
      await repoFileExists(VERIFIER_READINESS_FOLLOWUP_SPLIT_APPROVAL_PATH) &&
      await repoFileExists(VERIFIER_READINESS_FOLLOWUP_SPLIT_HANDOFF_PATH) &&
      splitDelegationSource.includes('evaluateFoundationVerifierReadinessFollowup({') &&
      splitDelegationSource.includes('readinessFollowupVerifier.checks') &&
      !foundationVerifySource.includes(oldReadinessFollowupInlineMarker) &&
      foundationVerifyLineCountAfterReadinessFollowupSplit < VERIFIER_READINESS_FOLLOWUP_SPLIT_BEFORE_LINES &&
      foundationVerifierReadinessFollowupSource.includes(VERIFIER_READINESS_FOLLOWUP_SPLIT_CARD_ID),
    'VERIFIER-READINESS-FOLLOWUP-SPLIT-001 extracts READY/follow-up shipped-system checks into a focused module',
    verifierReadinessFollowupSplitCard
      ? 'lane=' + verifierReadinessFollowupSplitCard.lane + ' dogfood=' + (verifierReadinessFollowupSplitDogfood.ok ? 'pass' : 'blocked') + ' readinessChecks=' + readinessFollowupVerifier.summary.passed + '/' + readinessFollowupVerifier.summary.total + ' lines=' + VERIFIER_READINESS_FOLLOWUP_SPLIT_BEFORE_LINES + '->' + foundationVerifyLineCountAfterReadinessFollowupSplit
      : 'missing ' + VERIFIER_READINESS_FOLLOWUP_SPLIT_CARD_ID,
  )
  const guardrailCloseoutsVerifier = await evaluateFoundationVerifierGuardrailCloseouts({
    CANONICAL_DECISION_CATEGORIES,
    DOCTRINE_PROPAGATION_SOURCES,
    buildDoctrinePropagationStatus,
    buildSyntheticStaleSkillSource,
    currentState,
    dataStructuredContracts,
    decisionAutoEmit,
    decisionAutoEmitApproval,
    decisionAutoEmitDoc,
    decisionAutoEmitScriptSource,
    decisionAutoEmitSource,
    decisionAutoEmitText,
    docAuthority,
    doctrinePropagation,
    doctrinePropagationApproval,
    doctrinePropagationDoc,
    doctrinePropagationScriptSource,
    doctrinePropagationSource,
    doctrinePropagationText,
    driveContentExtractionSource,
    evaluateDoctrineSkillSource,
    extractDecisionCandidatesFromText,
    foundationBuildLogRegistrySource,
    foundationFrontendSource,
    foundationHub,
    fubKpiConnectionMapSource,
    fubZahndMiddlewareSource,
    googleDelegatedSource,
    googleSheetsCacheSource,
    hitListReconcile,
    kpiDashboardSource,
    packageJson,
    packageSource,
    repoRoot,
    scanDecisionAutoEmitCandidates,
    security001,
    security002,
    security002Approval,
    security002PlanSource,
    security002ProofCheckSource,
    security006,
    securityAccessSource,
    serverRouteSource,
    serverSource,
    sheetsQuotaHardening,
    sheetsQuotaHardeningApproval,
    sheetsQuotaHardeningDoc,
    source021,
    source021Proof,
    source021WriterProofCheckSource,
  })
  checks.push(...guardrailCloseoutsVerifier.checks)
  const verifierGuardrailCloseoutSplitCard = (foundationHub.backlogItems || []).find(item => item.id === VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_CARD_ID) || null
  const verifierGuardrailCloseoutSplitCloseout = foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_CLOSEOUT_KEY) || null
  const verifierGuardrailCloseoutSplitDogfood = buildFoundationVerifierGuardrailCloseoutsDogfoodProof()
  const foundationVerifyLineCountAfterGuardrailCloseoutSplit = String(foundationVerifySource || '').split('\n').length
  const oldGuardrailCloseoutInlineMarker = 'const doctrinePropagationStatus = await buildDoctrine' + 'PropagationStatus({'
  ensure(
    checks,
    verifierGuardrailCloseoutSplitCard &&
      ['executing', 'done'].includes(verifierGuardrailCloseoutSplitCard.lane) &&
      String(verifierGuardrailCloseoutSplitCard.statusNote || '').includes(VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_CLOSEOUT_KEY) &&
      verifierGuardrailCloseoutSplitCloseout?.operatorCloseout === true &&
      (verifierGuardrailCloseoutSplitCloseout.backlogIds || []).includes(VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_CARD_ID) &&
      verifierGuardrailCloseoutSplitDogfood.ok === true &&
      guardrailCloseoutsVerifier.summary.passed === guardrailCloseoutsVerifier.summary.total &&
      packageJson.scripts?.['process:verifier-guardrail-closeout-split-check'] === 'node --env-file-if-exists=.env ' + VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_SCRIPT_PATH &&
      await repoFileExists(VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_PLAN_PATH) &&
      await repoFileExists(VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_APPROVAL_PATH) &&
      await repoFileExists(VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_HANDOFF_PATH) &&
      splitDelegationSource.includes('evaluateFoundationVerifierGuardrailCloseouts({') &&
      splitDelegationSource.includes('guardrailCloseoutsVerifier.checks') &&
      !foundationVerifySource.includes(oldGuardrailCloseoutInlineMarker) &&
      foundationVerifyLineCountAfterGuardrailCloseoutSplit < VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_BEFORE_LINES &&
      foundationVerifierGuardrailCloseoutsSource.includes(VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_CARD_ID),
    'VERIFIER-GUARDRAIL-CLOSEOUT-SPLIT-001 extracts guardrail closeout checks into a focused module',
    verifierGuardrailCloseoutSplitCard
      ? 'lane=' + verifierGuardrailCloseoutSplitCard.lane + ' dogfood=' + (verifierGuardrailCloseoutSplitDogfood.ok ? 'pass' : 'blocked') + ' guardrailChecks=' + guardrailCloseoutsVerifier.summary.passed + '/' + guardrailCloseoutsVerifier.summary.total + ' lines=' + VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_BEFORE_LINES + '->' + foundationVerifyLineCountAfterGuardrailCloseoutSplit
      : 'missing ' + VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_CARD_ID,
  )
  const controlLoopVerifier = evaluateFoundationVerifierControlLoop({
    DRIVE_ACCESS_REQUEST_CARD_ID,
    EXTRACT_RUN_HARDENING_CARD_ID,
    FOUNDATION_DONE_TEST_CARD_ID,
    FOUNDATION_DONE_TEST_CLOSEOUT_KEY,
    FOUNDATION_DONE_TEST_PLAN_PATH,
    FOUNDATION_DONE_TEST_SUMMARY_MARKER,
    FOUNDATION_READINESS_GATE_CARD_IDS,
    FOUNDATION_READINESS_REQUIRED_LEG_KEYS,
    MEETING_VAULT_ACL_CARD_ID,
    SOURCE_LIFECYCLE_COMPLETION_CARD_ID,
    SYNTHESIS_VERIFY_CARD_ID,
    SYSTEM_010_CARD_ID,
    SYSTEM_010_CLOSEOUT_KEY,
    SYSTEM_010_PLAN_PATH,
    actionReviewApi,
    actionRouteReviewInboxApi,
    actionReviewApproval,
    actionRouterSnapshot,
    backlogHygieneApi,
    foundationBacklogListApi,
    buildLogFoundationDoneTestBuild,
    buildLogSystem010GhostCloseoutBuild,
    currentPlan,
    currentState,
    foundationBuildCloseouts,
    foundationBuildIntelRoutesSource,
    foundationDbSource,
    foundationDoneTest,
    foundationDoneTestApproval,
    foundationDoneTestApprovalValidation,
    foundationDoneTestDocSource,
    foundationDoneTestPlanSource,
    foundationDoneTestReadinessStatus,
    foundationDoneTestRegistrySource,
    foundationDoneTestScriptSource,
    foundationFrontendSource,
    foundationHub,
    foundationJobsSource,
    foundationRuntimeReadRoutesSource,
    meetingVaultAutoEnforcementClosed,
    packageJson,
    serverRouteSource,
    sourceRegistry,
    strategySharedCommsRouteSource,
    system010Approval,
    system010ApprovalValidation,
    system010DocSource,
    system010GhostCloseout,
    system010PlanSource,
    system010ProcessScriptSource,
    system010RuntimeSource,
  })
  checks.push(...controlLoopVerifier.checks)
  const verifierControlLoopSplitCard = (foundationHub.backlogItems || []).find(item => item.id === VERIFIER_CONTROL_LOOP_SPLIT_CARD_ID) || null
  const verifierControlLoopSplitCloseout = foundationBuildCloseouts.find(closeout => closeout.key === VERIFIER_CONTROL_LOOP_SPLIT_CLOSEOUT_KEY) || null
  const verifierControlLoopSplitDogfood = buildFoundationVerifierControlLoopDogfoodProof()
  const foundationVerifyLineCountAfterControlLoopSplit = String(foundationVerifySource || '').split('\n').length
  const oldControlLoopInlineMarker = 'const foundationDone' + 'FailedKeys = new Set'
  ensure(
    checks,
    verifierControlLoopSplitCard &&
      ['executing', 'done'].includes(verifierControlLoopSplitCard.lane) &&
      String(verifierControlLoopSplitCard.statusNote || '').includes(VERIFIER_CONTROL_LOOP_SPLIT_CLOSEOUT_KEY) &&
      verifierControlLoopSplitCloseout?.operatorCloseout === true &&
      (verifierControlLoopSplitCloseout.backlogIds || []).includes(VERIFIER_CONTROL_LOOP_SPLIT_CARD_ID) &&
      verifierControlLoopSplitDogfood.ok === true &&
      controlLoopVerifier.summary.passed === controlLoopVerifier.summary.total &&
      packageJson.scripts?.['process:verifier-control-loop-split-check'] === 'node --env-file-if-exists=.env ' + VERIFIER_CONTROL_LOOP_SPLIT_SCRIPT_PATH &&
      await repoFileExists(VERIFIER_CONTROL_LOOP_SPLIT_PLAN_PATH) &&
      await repoFileExists(VERIFIER_CONTROL_LOOP_SPLIT_APPROVAL_PATH) &&
      await repoFileExists(VERIFIER_CONTROL_LOOP_SPLIT_HANDOFF_PATH) &&
      splitDelegationSource.includes('evaluateFoundationVerifierControlLoop({') &&
      splitDelegationSource.includes('controlLoopVerifier.checks') &&
      !foundationVerifySource.includes(oldControlLoopInlineMarker) &&
      foundationVerifyLineCountAfterControlLoopSplit < VERIFIER_CONTROL_LOOP_SPLIT_BEFORE_LINES &&
      foundationVerifierControlLoopSource.includes(VERIFIER_CONTROL_LOOP_SPLIT_CARD_ID),
    'VERIFIER-CONTROL-LOOP-SPLIT-001 extracts Foundation control-loop checks into a focused module',
    verifierControlLoopSplitCard
      ? 'lane=' + verifierControlLoopSplitCard.lane + ' dogfood=' + (verifierControlLoopSplitDogfood.ok ? 'pass' : 'blocked') + ' controlLoopChecks=' + controlLoopVerifier.summary.passed + '/' + controlLoopVerifier.summary.total + ' lines=' + VERIFIER_CONTROL_LOOP_SPLIT_BEFORE_LINES + '->' + foundationVerifyLineCountAfterControlLoopSplit
      : 'missing ' + VERIFIER_CONTROL_LOOP_SPLIT_CARD_ID,
  )
  return { checks }
}

export async function evaluateFoundationVerifierProcessControlGovernanceOrchestration(input = {}) {
  const normalizedInput = flattenProcessControlBundles(input)
  const processControlGovernanceVerifier = await evaluateFoundationVerifierProcessControlGovernance(normalizedInput)
  const checks = [...processControlGovernanceVerifier.checks]
  const processControlDogfood = buildFoundationVerifierProcessControlGovernanceDogfoodProof()
  const orchestrationDogfood = buildFoundationVerifierProcessControlOrchestrationDogfoodProof()
  const backlogItems = normalizedInput.foundationHub?.backlogItems || []
  const orchestrationCard = backlogItems.find(item => item.id === VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_CARD_ID) || null
  const orchestrationCloseout = (normalizedInput.foundationBuildCloseouts || [])
    .find(closeout => closeout.key === VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_CLOSEOUT_KEY) || null
  const foundationVerifySource = normalizedInput.foundationVerifySource || ''
  const rootLineCount = String(foundationVerifySource || '').split('\n').length
  const rootDelegatesThroughWrapper =
    foundationVerifySource.includes('evaluateFoundationVerifierProcessControlGovernanceOrchestration({') &&
    foundationVerifySource.includes('processControlGovernanceVerifier.checks')
  const oldDirectRootCallRemoved = !foundationVerifySource.includes('evaluateFoundationVerifierProcessControlGovernance({')
  const focusedProofRegistered =
    normalizedInput.packageJson?.scripts?.['process:verifier-process-control-orchestration-split-check'] ===
      `node --env-file-if-exists=.env ${VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_SCRIPT_PATH}`
  const closeoutRegistered =
    orchestrationCard &&
    ['executing', 'done'].includes(orchestrationCard.lane) &&
    String(orchestrationCard.statusNote || '').includes(VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_CLOSEOUT_KEY) &&
    orchestrationCloseout?.operatorCloseout === true &&
    (orchestrationCloseout.backlogIds || []).includes(VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_CARD_ID)
  const bundleInputSupported = [
    'processGovernanceBundle',
    'readinessFollowupBundle',
    'guardrailCloseoutBundle',
    'controlLoopBundle',
    'processControlSharedBundle',
  ].every(key => Object.prototype.hasOwnProperty.call(input, key))
  const orchestrationFixture = evaluateProcessControlOrchestrationFixture({
    wrapperDelegationPresent: rootDelegatesThroughWrapper,
    bundleInputSupported,
    oldDirectRootCallRemoved,
    closeoutRegistered,
    focusedProofRegistered,
    lineCountDecreased: rootLineCount < VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_BEFORE_LINES,
  })

  ensure(
    checks,
    orchestrationFixture.ok === true &&
      orchestrationDogfood.ok === true &&
      processControlDogfood.ok === true,
    'VERIFIER-PROCESS-CONTROL-ORCHESTRATION-SPLIT-001 moves Process Control verifier orchestration into bundled domain inputs',
    orchestrationCard
      ? `lane=${orchestrationCard.lane} dogfood=${orchestrationDogfood.ok ? 'pass' : 'blocked'} lines=${VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_BEFORE_LINES}->${rootLineCount}`
      : `missing ${VERIFIER_PROCESS_CONTROL_ORCHESTRATION_SPLIT_CARD_ID}`,
  )

  return {
    checks,
    processControlGovernanceVerifier,
    dogfood: processControlDogfood,
    orchestrationDogfood,
  }
}
