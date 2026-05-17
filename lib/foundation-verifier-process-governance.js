export const VERIFIER_PROCESS_GOVERNANCE_SPLIT_CARD_ID = 'VERIFIER-PROCESS-GOVERNANCE-SPLIT-001'
export const VERIFIER_PROCESS_GOVERNANCE_SPLIT_CLOSEOUT_KEY = 'verifier-process-governance-split-v1'
export const VERIFIER_PROCESS_GOVERNANCE_SPLIT_PLAN_PATH = 'docs/process/verifier-process-governance-split-001-plan.md'
export const VERIFIER_PROCESS_GOVERNANCE_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-PROCESS-GOVERNANCE-SPLIT-001.json'
export const VERIFIER_PROCESS_GOVERNANCE_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-process-governance-split-check.mjs'
export const VERIFIER_PROCESS_GOVERNANCE_SPLIT_HANDOFF_PATH = 'docs/handoffs/2026-05-17-verifier-process-governance-split-closeout.md'
export const VERIFIER_PROCESS_GOVERNANCE_SPLIT_BEFORE_LINES = 12408

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function includesAll(source, needles = []) {
  return needles.every(needle => String(source || '').includes(needle))
}

function evaluateProcessGovernanceFixture(fixture = {}) {
  const findings = []
  if (fixture.sprintRepairDone !== true) findings.push('sprint_repair_not_done')
  if (fixture.verifiedCloseout !== true) findings.push('verified_closeout_missing')
  if (fixture.stageGateEnforced !== true) findings.push('stage_gate_not_enforced')
  if (fixture.allowsSkippedStageHistory === true) findings.push('skipped_stage_history_allowed')
  if (fixture.planCriticRootVsPatchRejectsSymptom !== true) findings.push('root_vs_patch_not_rejected')
  if (fixture.sourceGapStartsExtraction === true) findings.push('source_gap_started_extraction')
  if (fixture.researchPurgeMutatesBacklog === true) findings.push('research_purge_mutated_backlog')
  return { ok: findings.length === 0, findings }
}

export function buildFoundationVerifierProcessGovernanceDogfoodProof() {
  const healthy = evaluateProcessGovernanceFixture({
    sprintRepairDone: true,
    verifiedCloseout: true,
    stageGateEnforced: true,
    allowsSkippedStageHistory: false,
    planCriticRootVsPatchRejectsSymptom: true,
    sourceGapStartsExtraction: false,
    researchPurgeMutatesBacklog: false,
  })
  const rejected = {
    missingCloseout: evaluateProcessGovernanceFixture({
      sprintRepairDone: true,
      verifiedCloseout: false,
      stageGateEnforced: true,
      allowsSkippedStageHistory: false,
      planCriticRootVsPatchRejectsSymptom: true,
      sourceGapStartsExtraction: false,
      researchPurgeMutatesBacklog: false,
    }),
    skippedStageShortcut: evaluateProcessGovernanceFixture({
      sprintRepairDone: true,
      verifiedCloseout: true,
      stageGateEnforced: true,
      allowsSkippedStageHistory: true,
      planCriticRootVsPatchRejectsSymptom: true,
      sourceGapStartsExtraction: false,
      researchPurgeMutatesBacklog: false,
    }),
    missingStageGate: evaluateProcessGovernanceFixture({
      sprintRepairDone: true,
      verifiedCloseout: true,
      stageGateEnforced: false,
      allowsSkippedStageHistory: false,
      planCriticRootVsPatchRejectsSymptom: true,
      sourceGapStartsExtraction: false,
      researchPurgeMutatesBacklog: false,
    }),
    symptomPatchAccepted: evaluateProcessGovernanceFixture({
      sprintRepairDone: true,
      verifiedCloseout: true,
      stageGateEnforced: true,
      allowsSkippedStageHistory: false,
      planCriticRootVsPatchRejectsSymptom: false,
      sourceGapStartsExtraction: false,
      researchPurgeMutatesBacklog: false,
    }),
    sourceGapMutatesExtraction: evaluateProcessGovernanceFixture({
      sprintRepairDone: true,
      verifiedCloseout: true,
      stageGateEnforced: true,
      allowsSkippedStageHistory: false,
      planCriticRootVsPatchRejectsSymptom: true,
      sourceGapStartsExtraction: true,
      researchPurgeMutatesBacklog: false,
    }),
    researchPurgeMutates: evaluateProcessGovernanceFixture({
      sprintRepairDone: true,
      verifiedCloseout: true,
      stageGateEnforced: true,
      allowsSkippedStageHistory: false,
      planCriticRootVsPatchRejectsSymptom: true,
      sourceGapStartsExtraction: false,
      researchPurgeMutatesBacklog: true,
    }),
  }
  const ok = healthy.ok && Object.values(rejected).every(result => result.ok === false)
  return {
    ok,
    healthy,
    rejected,
    dogfoodInvariant: ok
      ? 'healthy process-governance fixture passes; missing closeout, skipped stage, missing stage gate, symptom patch, source extraction mutation, and research mutation fixtures fail closed'
      : 'process-governance verifier dogfood did not reject every known failure fixture',
  }
}

export async function evaluateFoundationVerifierProcessGovernance(input = {}) {
  const {
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
  } = input
  const checks = []

  const sprintProcessRepairCurrentItem = currentSprintItemsById.get('SPRINT-PROCESS-REPAIR-001')
  const verifierSprintIndependenceCurrentItem = currentSprintItemsById.get('VERIFIER-SPRINT-INDEPENDENCE-001')
  const verifierModularSplitCurrentItem = currentSprintItemsById.get('VERIFIER-MODULAR-SPLIT-001')
  const processRootVsPatchCurrentItem = currentSprintItemsById.get('PROCESS-ROOT-VS-PATCH-001')
  const currentSprintDynamicTruthCurrentItem = currentSprintItemsById.get(CURRENT_SPRINT_DYNAMIC_TRUTH_CARD_ID)
  const currentSprintDynamicTruthIsBuilding =
    currentSprintDynamicTruthCurrentItem?.stage === 'building_now' &&
    currentSprintDynamicTruthCurrentItem?.existingWorkCheckStatus === 'complete' &&
    foundationHub.currentSprint?.activeBlocker?.cardId === CURRENT_SPRINT_DYNAMIC_TRUTH_CARD_ID
  const currentSprintDynamicTruthIsClosed =
    currentSprintDynamicTruth?.lane === 'done' &&
    String(currentSprintDynamicTruth?.statusNote || '').includes(CURRENT_SPRINT_DYNAMIC_TRUTH_CLOSEOUT_KEY) &&
    currentSprintDynamicTruthCloseout?.operatorCloseout === true &&
    (currentSprintDynamicTruthCloseout.backlogIds || []).includes(CURRENT_SPRINT_DYNAMIC_TRUTH_CARD_ID) &&
    historicalCardHasVerifiedCloseout(CURRENT_SPRINT_DYNAMIC_TRUTH_CARD_ID)
  const sprintStageGateCurrentItem = currentSprintItemsById.get(SPRINT_STAGE_GATE_CARD_ID)
  const sprintStageGateIsBuilding =
    sprintStageGateCurrentItem?.stage === 'building_now' &&
    sprintStageGateCurrentItem?.existingWorkCheckStatus === 'complete' &&
    foundationHub.currentSprint?.activeBlocker?.cardId === SPRINT_STAGE_GATE_CARD_ID
  const sprintStageGateIsClosed =
    sprintStageGate?.lane === 'done' &&
    String(sprintStageGate?.statusNote || '').includes(SPRINT_STAGE_GATE_CLOSEOUT_KEY) &&
    sprintStageGateCloseout?.operatorCloseout === true &&
    (sprintStageGateCloseout.backlogIds || []).includes(SPRINT_STAGE_GATE_CARD_ID) &&
    historicalCardHasVerifiedCloseout(SPRINT_STAGE_GATE_CARD_ID)
  const foundationPlanReconcileIsBuilding =
    foundationPlanReconcileCurrentItem?.stage === 'building_now' &&
    foundationPlanReconcileCurrentItem?.existingWorkCheckStatus === 'complete' &&
    foundationHub.currentSprint?.activeBlocker?.cardId === FOUNDATION_PLAN_RECONCILE_CARD_ID
  const foundationPlanReconcileIsClosed =
    foundationPlanReconcile?.lane === 'done' &&
    String(foundationPlanReconcile?.statusNote || '').includes(FOUNDATION_PLAN_RECONCILE_CLOSEOUT_KEY) &&
    foundationPlanReconcileCloseout?.operatorCloseout === true &&
    (foundationPlanReconcileCloseout.backlogIds || []).includes(FOUNDATION_PLAN_RECONCILE_CARD_ID) &&
    historicalCardHasVerifiedCloseout(FOUNDATION_PLAN_RECONCILE_CARD_ID)
  const connectorCredentialIsBuilding =
    connectorCredentialCurrentItem?.stage === 'building_now' &&
    connectorCredentialCurrentItem?.existingWorkCheckStatus === 'complete' &&
    foundationHub.currentSprint?.activeBlocker?.cardId === CONNECTOR_CREDENTIAL_CARD_ID
  const connectorCredentialIsClosed =
    connectorCredential?.lane === 'done' &&
    String(connectorCredential?.statusNote || '').includes(CONNECTOR_CREDENTIAL_CLOSEOUT_KEY) &&
    connectorCredentialCloseout?.operatorCloseout === true &&
    (connectorCredentialCloseout.backlogIds || []).includes(CONNECTOR_CREDENTIAL_CARD_ID) &&
    historicalCardHasVerifiedCloseout(CONNECTOR_CREDENTIAL_CARD_ID)
  const llmAuthAuditRuntimeStatus = buildLlmAuthAuditStatus({
    llmRuntime: foundationHub.llmRuntime,
    foundationJobs: {
      ...(foundationHub.foundationJobs || {}),
      jobs: llmAuthAuditJobDefinition ? [llmAuthAuditJobDefinition] : (foundationHub.foundationJobs?.jobs || []),
    },
    maxAgeHours: 0,
  })
  const llmAuthAuditIsBuilding =
    llmAuthAuditCurrentItem?.stage === 'building_now' &&
    llmAuthAuditCurrentItem?.existingWorkCheckStatus === 'complete' &&
    foundationHub.currentSprint?.activeBlocker?.cardId === LLM_AUTH_AUDIT_CARD_ID
  const llmAuthAuditIsClosed =
    llmAuthAudit?.lane === 'done' &&
    String(llmAuthAudit?.statusNote || '').includes(LLM_AUTH_AUDIT_CLOSEOUT_KEY) &&
    llmAuthAuditCloseout?.operatorCloseout === true &&
    (llmAuthAuditCloseout.backlogIds || []).includes(LLM_AUTH_AUDIT_CARD_ID) &&
    historicalCardHasVerifiedCloseout(LLM_AUTH_AUDIT_CARD_ID)
  const sourceExtractionGapFollowupIsBuilding =
    sourceExtractionGapFollowupCurrentItem?.stage === 'building_now' &&
    sourceExtractionGapFollowupCurrentItem?.existingWorkCheckStatus === 'complete' &&
    foundationHub.currentSprint?.activeBlocker?.cardId === SOURCE_EXTRACTION_GAP_FOLLOWUP_CARD_ID
  const sourceExtractionGapFollowupIsClosed =
    sourceExtractionGapFollowupCard?.lane === 'done' &&
    String(sourceExtractionGapFollowupCard?.statusNote || '').includes(SOURCE_EXTRACTION_GAP_FOLLOWUP_CLOSEOUT_KEY) &&
    sourceExtractionGapFollowupCloseout?.operatorCloseout === true &&
    (sourceExtractionGapFollowupCloseout.backlogIds || []).includes(SOURCE_EXTRACTION_GAP_FOLLOWUP_CARD_ID) &&
    historicalCardHasVerifiedCloseout(SOURCE_EXTRACTION_GAP_FOLLOWUP_CARD_ID)
  const atomFlowAutoDemotionIsBuilding =
    atomFlowAutoDemotionCurrentItem?.stage === 'building_now' &&
    atomFlowAutoDemotionCurrentItem?.existingWorkCheckStatus === 'complete' &&
    foundationHub.currentSprint?.activeBlocker?.cardId === ATOM_FLOW_AUTO_DEMOTION_CARD_ID
  const atomFlowAutoDemotionIsClosed =
    atomFlowAutoDemotion?.lane === 'done' &&
    String(atomFlowAutoDemotion?.statusNote || '').includes(ATOM_FLOW_AUTO_DEMOTION_CLOSEOUT_KEY) &&
    atomFlowAutoDemotionCloseout?.operatorCloseout === true &&
    (atomFlowAutoDemotionCloseout.backlogIds || []).includes(ATOM_FLOW_AUTO_DEMOTION_CARD_ID) &&
    historicalCardHasVerifiedCloseout(ATOM_FLOW_AUTO_DEMOTION_CARD_ID)
  const extractRunHardeningExecutionIsBuilding =
    extractRunHardeningExecutionCurrentItem?.stage === 'building_now' &&
    extractRunHardeningExecutionCurrentItem?.existingWorkCheckStatus === 'complete' &&
    foundationHub.currentSprint?.activeBlocker?.cardId === EXTRACT_RUN_HARDENING_EXECUTION_CARD_ID
  const extractRunHardeningExecutionIsClosed =
    extractRunHardeningExecution?.lane === 'done' &&
    String(extractRunHardeningExecution?.statusNote || '').includes(EXTRACT_RUN_HARDENING_EXECUTION_CLOSEOUT_KEY) &&
    extractRunHardeningExecutionCloseout?.operatorCloseout === true &&
    (extractRunHardeningExecutionCloseout.backlogIds || []).includes(EXTRACT_RUN_HARDENING_EXECUTION_CARD_ID) &&
    historicalCardHasVerifiedCloseout(EXTRACT_RUN_HARDENING_EXECUTION_CARD_ID)
  const researchLanePurgeIsBuilding =
    researchLanePurgeCurrentItem?.stage === 'building_now' &&
    researchLanePurgeCurrentItem?.existingWorkCheckStatus === 'complete' &&
    foundationHub.currentSprint?.activeBlocker?.cardId === RESEARCH_LANE_PURGE_CARD_ID
  const researchLanePurgeIsClosed =
    researchLanePurge?.lane === 'done' &&
    String(researchLanePurge?.statusNote || '').includes(RESEARCH_LANE_PURGE_CLOSEOUT_KEY) &&
    researchLanePurgeCloseout?.operatorCloseout === true &&
    (researchLanePurgeCloseout.backlogIds || []).includes(RESEARCH_LANE_PURGE_CARD_ID) &&
    historicalCardHasVerifiedCloseout(RESEARCH_LANE_PURGE_CARD_ID)
  const researchLanePurgeSnapshot = buildResearchLanePurgeSnapshot({
    backlogItems: foundationHub.backlogItems || [],
  })
  const atomFlowRows = foundationSourceLifecycle.sourceMaturityGrid?.rows || foundationHub.sourceMaturityGrid?.rows || []
  const atomFlowRowsMissingStatus = atomFlowRows.filter(row => !row.atomFlow || !row.atomFlow.status)
  const staleAtomFlowRows = atomFlowRows.filter(row => row.atomFlow?.status === 'stale')
  const verifierSprintIndependenceIsBuilding =
    verifierSprintIndependence?.lane === 'executing' &&
    verifierSprintIndependenceCurrentItem?.stage === 'building_now' &&
    verifierSprintIndependenceCurrentItem?.existingWorkCheckStatus === 'complete' &&
    foundationHub.currentSprint?.activeBlocker?.cardId === 'VERIFIER-SPRINT-INDEPENDENCE-001'
  const verifierSprintIndependenceClosedByArtifacts =
    verifierSprintIndependence?.lane === 'done' &&
    String(verifierSprintIndependence?.statusNote || '').includes('verifier-sprint-independence-v1') &&
    verifierSprintIndependenceCloseout?.operatorCloseout === true &&
    (verifierSprintIndependenceCloseout.backlogIds || []).includes('VERIFIER-SPRINT-INDEPENDENCE-001') &&
    historicalCardHasVerifiedCloseout('VERIFIER-SPRINT-INDEPENDENCE-001')
  const verifierModularSplitClosedByArtifacts =
    verifierModularSplit?.lane === 'done' &&
    String(verifierModularSplit?.statusNote || '').includes('verifier-modular-split-v1') &&
    verifierModularSplitCloseout?.operatorCloseout === true &&
    (verifierModularSplitCloseout.backlogIds || []).includes('VERIFIER-MODULAR-SPLIT-001') &&
    historicalCardHasVerifiedCloseout('VERIFIER-MODULAR-SPLIT-001')
  const processRootVsPatchClosedByArtifacts =
    processRootVsPatch?.lane === 'done' &&
    String(processRootVsPatch?.statusNote || '').includes('process-root-vs-patch-v1') &&
    processRootVsPatchCloseout?.operatorCloseout === true &&
    (processRootVsPatchCloseout.backlogIds || []).includes('PROCESS-ROOT-VS-PATCH-001') &&
    historicalCardHasVerifiedCloseout('PROCESS-ROOT-VS-PATCH-001')
  const verifierSprintIndependenceIsClosed =
    verifierSprintIndependenceClosedByArtifacts &&
    ((verifierModularSplitCurrentItem?.stage === 'building_now' &&
      verifierModularSplitCurrentItem?.existingWorkCheckStatus === 'complete' &&
      foundationHub.currentSprint?.activeBlocker?.cardId === 'VERIFIER-MODULAR-SPLIT-001') ||
      verifierModularSplitClosedByArtifacts ||
      (verifierModularSplitCurrentItem?.stage === 'done_this_sprint' &&
        verifierModularSplitCurrentItem?.existingWorkCheckStatus === 'complete' &&
        processRootVsPatchCurrentItem?.existingWorkCheckStatus === 'complete' &&
        ((processRootVsPatchCurrentItem?.stage === 'building_now' &&
          foundationHub.currentSprint?.activeBlocker?.cardId === 'PROCESS-ROOT-VS-PATCH-001') ||
          (processRootVsPatchCurrentItem?.stage === 'done_this_sprint' &&
            foundationHub.currentSprint?.activeBlocker === null))))
  const verifierModularSplitIsBuilding =
    verifierModularSplit?.lane === 'executing' &&
    verifierModularSplitCurrentItem?.stage === 'building_now' &&
    verifierModularSplitCurrentItem?.existingWorkCheckStatus === 'complete' &&
    foundationHub.currentSprint?.activeBlocker?.cardId === 'VERIFIER-MODULAR-SPLIT-001'
  const verifierModularSplitIsClosed =
    verifierModularSplitClosedByArtifacts &&
    ((processRootVsPatchCurrentItem?.stage === 'building_now' &&
      foundationHub.currentSprint?.activeBlocker?.cardId === 'PROCESS-ROOT-VS-PATCH-001') ||
      processRootVsPatchClosedByArtifacts ||
      (processRootVsPatchCurrentItem?.stage === 'done_this_sprint' &&
        foundationHub.currentSprint?.activeBlocker === null))
  const processRootVsPatchIsBuilding =
    processRootVsPatch?.lane === 'executing' &&
    processRootVsPatchCurrentItem?.stage === 'building_now' &&
    processRootVsPatchCurrentItem?.existingWorkCheckStatus === 'complete' &&
    foundationHub.currentSprint?.activeBlocker?.cardId === 'PROCESS-ROOT-VS-PATCH-001'
  const processRootVsPatchIsClosed =
    processRootVsPatchClosedByArtifacts
  const oldConnectorRoutingShortcutA = ['connectorRoutingTruthSprintActive', 'expectedSnippets'].join(' || ')
  const oldConnectorRoutingShortcutB = ['expectedCardIds.includes(currentSprintActiveBlockerCardId)', 'connectorRoutingTruthSprintActive'].join(' || ')
  ensure(
    checks,
    sprintProcessRepair?.lane === 'done' &&
      String(sprintProcessRepair?.statusNote || '').includes('connector-routing-process-repair-v1') &&
      (verifierSprintIndependenceIsBuilding || verifierSprintIndependenceIsClosed) &&
      connectorRoutingProcessRepairCloseout?.operatorCloseout === true &&
      (connectorRoutingProcessRepairCloseout.backlogIds || []).includes('SPRINT-PROCESS-REPAIR-001') &&
      ['VERIFIER-SPRINT-INDEPENDENCE-001', 'VERIFIER-MODULAR-SPLIT-001', 'PROCESS-ROOT-VS-PATCH-001'].every(id =>
        (connectorRoutingProcessRepairCloseout.mentionedBacklogIds || []).includes(id)
      ) &&
      packageJson.scripts?.['process:repair-verifier-sprint-check'] === 'node --env-file-if-exists=.env scripts/process-repair-verifier-sprint-check.mjs' &&
      historicalCardHasVerifiedCloseout('SPRINT-PROCESS-REPAIR-001') &&
      includesAll(processRepairVerifierSprintScriptSource, [
        'process-repair-verifier-independence-2026-05-12',
        'evaluateAndLogPlans',
        'buildConnectorRoutingClosedSeed',
        'closeVerifierSprintIndependence',
        'SPRINT-PROCESS-REPAIR-001',
        'VERIFIER-SPRINT-INDEPENDENCE-001',
      ]) &&
      includesAll(processRepairVerifierSprintPlanSource, [
        'Scoping, Sprint Ready, and Building Now',
        'Plan Critic',
        'does not fake skipped stage history',
      ]) &&
      includesAll(sprintProcessRepairPlanSource, [
        'after-action doctrine',
        'does not fake historical stage progression',
        'process:repair-verifier-sprint-check',
      ]) &&
      includesAll(connectorRoutingProcessRepairSource, [
        'honest after-action repair',
        'does not backdate Plan Critic or fake stage history',
      ]) &&
      includesAll(foundationVerifySource, PROCESS_REPAIR_VERIFIER_SPRINT_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'SPRINT-PROCESS-REPAIR-001 repairs skipped sprint doctrine without fake stage history',
    `lane=${sprintProcessRepair?.lane || 'missing'} blocker=${foundationHub.currentSprint?.activeBlocker?.cardId || 'missing'} closeout=${connectorRoutingProcessRepairCloseout?.key || 'missing'}`,
  )
  ensure(
    checks,
    verifierSprintIndependenceIsClosed &&
      (verifierSprintIndependenceCloseout.mentionedBacklogIds || []).includes('VERIFIER-MODULAR-SPLIT-001') &&
      (verifierSprintIndependenceCloseout.proofCommands || []).includes('npm run foundation:verify') &&
      !foundationVerifySource.includes(oldConnectorRoutingShortcutA) &&
      !foundationVerifySource.includes(oldConnectorRoutingShortcutB) &&
      includesAll(foundationVerifySource, [
        'historicalCardHasVerifiedCloseout',
        'connectorRoutingTruthSprintDone',
        'sourceOnceOverCardsHaveVerifiedCloseouts',
        'VERIFIER-SPRINT-INDEPENDENCE-001',
      ]),
    'VERIFIER-SPRINT-INDEPENDENCE-001 closes active-sprint verifier shortcut without replacing it',
    `lane=${verifierSprintIndependence?.lane || 'missing'} blocker=${foundationHub.currentSprint?.activeBlocker?.cardId || 'missing'} closeout=${verifierSprintIndependenceCloseout?.key || 'missing'}`,
  )
  ensure(
    checks,
    (verifierModularSplitIsBuilding || verifierModularSplitIsClosed) &&
      packageJson.scripts?.['process:verifier-modular-split-check'] === 'node --env-file-if-exists=.env scripts/process-verifier-modular-split-check.mjs' &&
      includesAll(foundationVerifySource, [
        "from '../lib/foundation-verifier-sprint-proof.js'",
        'buildSprintProofHelpers({',
      ]) &&
      includesAll(verifierSprintProofModuleSource, [
        'export function indexCloseoutsByBacklogId',
        'export function cardHasVerifiedCloseout',
        'export function buildSprintProofHelpers',
        'export function buildSyntheticSprintProofModuleStatus',
      ]) &&
      includesAll(verifierModularSplitCheckSource, [
        'buildSyntheticSprintProofModuleStatus',
        'process:verifier-modular-split-check',
        'old inline closeout index loop is removed',
      ]),
    'VERIFIER-MODULAR-SPLIT-001 extracts first verifier proof module boundary',
    `lane=${verifierModularSplit?.lane || 'missing'} stage=${verifierModularSplitCurrentItem?.stage || 'missing'}`,
  )
  ensure(
    checks,
    verifierModularSplitIsClosed &&
      (verifierModularSplitCloseout.mentionedBacklogIds || []).includes('PROCESS-ROOT-VS-PATCH-001') &&
      (verifierModularSplitCloseout.proofCommands || []).includes('npm run process:verifier-modular-split-check -- --json') &&
      includesAll(processRepairVerifierSprintScriptSource, [
        'closeVerifierModularSplitCard',
        'VERIFIER-MODULAR-SPLIT-001',
        'PROCESS-ROOT-VS-PATCH-001',
      ]),
    'VERIFIER-MODULAR-SPLIT-001 closes first verifier module split and advances root-vs-patch',
    `lane=${verifierModularSplit?.lane || 'missing'} blocker=${foundationHub.currentSprint?.activeBlocker?.cardId || 'missing'} closeout=${verifierModularSplitCloseout?.key || 'missing'}`,
  )
  ensure(
    checks,
    (processRootVsPatchIsBuilding || processRootVsPatchIsClosed) &&
      packageJson.scripts?.['process:root-vs-patch-check'] === 'node --env-file-if-exists=.env scripts/process-root-vs-patch-check.mjs' &&
      planCriticSynthetic.symptomPatch?.status === 'revise' &&
      planCriticSynthetic.symptomPatch?.findings?.some(finding => finding.key === PLAN_CRITIC_ROOT_VS_PATCH_FINDING_KEY) &&
      planCriticSynthetic.rootInvariant?.status === 'pass' &&
      !planCriticSynthetic.rootInvariant?.findings?.some(finding => finding.key === PLAN_CRITIC_ROOT_VS_PATCH_FINDING_KEY) &&
      includesAll(planCriticSource, [
        'PLAN_CRITIC_ROOT_VS_PATCH_FINDING_KEY',
        'root_vs_patch_invariant',
        'symptomPatchSurfaceRisk',
        'rootInvariant',
      ]) &&
      includesAll(processRootVsPatchCheckSource, [
        'symptom patch plan is rejected',
        'root invariant verifier plan passes',
        'process:root-vs-patch-check',
      ]),
    'PROCESS-ROOT-VS-PATCH-001 teaches Plan Critic to reject symptom patches without root proof',
    `lane=${processRootVsPatch?.lane || 'missing'} stage=${processRootVsPatchCurrentItem?.stage || 'missing'} synthetic=${planCriticSynthetic.symptomPatch?.status || 'missing'} root=${planCriticSynthetic.rootInvariant?.status || 'missing'}`,
  )
  ensure(
    checks,
    !processRootVsPatchIsClosed ||
      ((processRootVsPatchCloseout.proofCommands || []).includes('npm run process:root-vs-patch-check -- --json') &&
        (processRootVsPatchCloseout.proofCommands || []).includes('npm run process:plan-critic-check -- --json=true') &&
        includesAll(processRepairVerifierSprintScriptSource, [
          'closeRootVsPatchCard',
          'process-root-vs-patch-v1',
          'activeBlockerCardId: null',
        ])),
    'PROCESS-ROOT-VS-PATCH-001 closes repair sprint without a done active blocker',
    `lane=${processRootVsPatch?.lane || 'missing'} blocker=${foundationHub.currentSprint?.activeBlocker?.cardId || 'none'} closeout=${processRootVsPatchCloseout?.key || 'missing'}`,
  )
  ensure(
    checks,
    (currentSprintDynamicTruthIsBuilding || currentSprintDynamicTruthIsClosed) &&
      packageJson.scripts?.['process:current-sprint-dynamic-truth-check'] === `node --env-file-if-exists=.env ${CURRENT_SPRINT_DYNAMIC_TRUTH_SCRIPT_PATH}` &&
      currentSprintDynamicTruthApprovalValidation.ok &&
      currentSprintDynamicTruthApprovalValidation.mode === 'v2' &&
      currentSprintDynamicTruthApprovalValidation.approval?.approvedPlanRef === CURRENT_SPRINT_DYNAMIC_TRUTH_PLAN_PATH &&
      foundationHub.currentSprint?.status === 'healthy' &&
      foundationCurrentSprintStatus.status === 'healthy' &&
      foundationHub.currentSprint?.cadence?.truthSource?.sprintRecord === 'live-db' &&
      foundationHub.currentSprint?.cadence?.truthSource?.exitCriteria === 'live-db-metadata' &&
      includesAll(currentSprintDynamicTruthCheckSource, [
        'dynamic-truth-proof',
        'restoreLiveSnapshot',
        'sprint_exit_criteria_required',
        '/api/foundation/current-sprint',
      ]) &&
      includesAll(currentSprintDynamicTruthPlanSource, [
        'Hardcoded seed/default builders are limited',
        'stale-hardcoded',
        'actual function path and API route',
      ]) &&
      includesAll(foundationCurrentSprintSource, [
        'sprint_exit_criteria_required',
        'truthSource',
        'bootstrap-default',
      ]),
    'CURRENT-SPRINT-DYNAMIC-TRUTH-001 makes active sprint command truth live-DB-backed',
    `lane=${currentSprintDynamicTruth?.lane || 'missing'} stage=${currentSprintDynamicTruthCurrentItem?.stage || 'closed'} blocker=${foundationHub.currentSprint?.activeBlocker?.cardId || 'none'}`,
  )
  ensure(
    checks,
    (sprintStageGateIsBuilding || sprintStageGateIsClosed) &&
      packageJson.scripts?.['process:sprint-stage-gate-check'] === `node --env-file-if-exists=.env ${SPRINT_STAGE_GATE_SCRIPT_PATH}` &&
      sprintStageGateApprovalValidation.ok &&
      sprintStageGateApprovalValidation.mode === 'v2' &&
      sprintStageGateApprovalValidation.approval?.approvedPlanRef === SPRINT_STAGE_GATE_PLAN_PATH &&
      foundationHub.currentSprint?.status === 'healthy' &&
      foundationCurrentSprintStatus.status === 'healthy' &&
      includesAll(sprintStageGateCheckSource, [
        'validateFoundationSprintStageGate',
        'dogfood rejects original skipped Connector/Routing state',
        'stage_gate_plan_critic_pass_required',
        '/api/foundation/current-sprint',
      ]) &&
      includesAll(sprintStageGatePlanSource, [
        'rejects the original six-card Connector/Routing skipped state',
        'accepts the repaired after-action Connector/Routing state',
        'Future transition helpers fail closed',
      ]) &&
      includesAll(foundationCurrentSprintSource, [
        'validateFoundationSprintStageGate',
        'stage_gate_plan_critic_pass_required',
        'active_blocker_not_done_this_sprint',
      ]) &&
      includesAll(`${foundationDbSource}\n${currentSprintStoreSource}`, [
        'planCriticRuns',
        'getPlanCriticRunsByCardIds',
      ]),
    'SPRINT-STAGE-GATE-001 enforces visible sprint stage prerequisites',
    `lane=${sprintStageGate?.lane || 'missing'} stage=${sprintStageGateCurrentItem?.stage || 'closed'} blocker=${foundationHub.currentSprint?.activeBlocker?.cardId || 'none'}`,
  )
  ensure(
    checks,
    (foundationPlanReconcileIsBuilding || foundationPlanReconcileIsClosed) &&
      packageJson.scripts?.['process:foundation-plan-reconcile-check'] === `node --env-file-if-exists=.env ${FOUNDATION_PLAN_RECONCILE_SCRIPT_PATH}` &&
      foundationPlanReconcileApprovalValidation.ok &&
      foundationPlanReconcileApprovalValidation.mode === 'v2' &&
      foundationPlanReconcileApprovalValidation.approval?.approvedPlanRef === FOUNDATION_PLAN_RECONCILE_PLAN_PATH &&
      foundationHub.currentSprint?.status === 'healthy' &&
      foundationCurrentSprintStatus.status === 'healthy' &&
      includesAll(foundationPlanReconcileCheckSource, [
        '/api/foundation/current-sprint',
        'stale active sprint markers are rejected',
        'sectionBetween',
        'noRawProof',
      ]) &&
      includesAll(foundationPlanReconcilePlanSource, [
        '/api/foundation/current-sprint',
        'rejects stale markers',
        'not source substring alone',
      ]) &&
      // liveTruthPosture: historical_closeout_only - this block accepts the closed control-plane sprint only as documented history.
      (includesAll(currentPlan, [
        'Current Sprint: Foundation Control Plane + Connector Readiness',
        'control-plane-connector-readiness-2026-05-12',
        'Current Sprint API owns the active blocker',
        'Queued, not pulled into this sprint',
      ]) ||
        includesAll(currentPlan, [
          CODE_QUALITY_NIGHTLY_AUDIT_CLOSEOUT_KEY,
          'foundation-code-quality-nightly-audit-2026-05-13',
          'Previous completed control-plane sprint ID: `control-plane-connector-readiness-2026-05-12`',
          'Findings are proposed backlog fixes only',
        ])) &&
      (includesAll(currentState, [
        'control-plane-connector-readiness-2026-05-12',
        'Current Sprint API owns the active blocker',
        'Queued, not pulled into this sprint',
      ]) ||
        includesAll(currentState, [
          FOUNDATION_PLAN_RECONCILE_CLOSEOUT_KEY,
          'Historical closeout notes below preserve',
        ])) &&
      ['ATOM-FLOW-AUTO-DEMOTION-001', 'EXTRACT-RUN-HARDENING-EXECUTION-001', 'RESEARCH-LANE-PURGE-001'].every(cardId =>
        currentPlan.includes(cardId) && currentState.includes(cardId)
      ) &&
      !currentPlan.includes('## Current Sprint: Foundation Source Once-Over') &&
      !currentState.includes('The active sprint is now the Foundation Source Once-Over sprint.'),
    'FOUNDATION-PLAN-RECONCILE-001 reconciles rebuild docs to live control-plane sprint truth',
    `lane=${foundationPlanReconcile?.lane || 'missing'} stage=${foundationPlanReconcileCurrentItem?.stage || 'closed'} blocker=${foundationHub.currentSprint?.activeBlocker?.cardId || 'none'}`,
  )
  ensure(
    checks,
    (connectorCredentialIsBuilding || connectorCredentialIsClosed) &&
      packageJson.scripts?.['process:connector-credential-check'] === `node --env-file-if-exists=.env ${CONNECTOR_CREDENTIAL_SCRIPT_PATH}` &&
      connectorCredentialApprovalValidation.ok &&
      connectorCredentialApprovalValidation.mode === 'v2' &&
      connectorCredentialApprovalValidation.approval?.approvedPlanRef === CONNECTOR_CREDENTIAL_PLAN_PATH &&
      foundationHub.currentSprint?.status === 'healthy' &&
      foundationCurrentSprintStatus.status === 'healthy' &&
      connectorCredentialRegistry.summary?.rowCount >= 21 &&
      connectorCredentialRegistry.summary?.metadataOnly === true &&
      CONNECTOR_CREDENTIAL_REQUIRED_KEYS.every(key => (connectorCredentialRegistry.rows || []).some(row => row.key === key)) &&
      connectorCredentialSyntheticSafety.ok &&
      sourceConnectorMatrix.summary?.credentialCoveredCount >= 25 &&
      ['has_credential', 'credential_status'].every(column => (sourceConnectorMatrix.columns || []).includes(column)) &&
      (sourceConnectorMatrix.rows || []).every(row => Array.isArray(row.credentialRegistryKeys) && row.credentialRegistryKeys.length > 0) &&
      includesAll(connectorCredentialRegistrySource, [
        'buildConnectorCredentialRegistrySnapshot',
        'credentialRefNames',
        'sourceUnlocked',
        'assertNoConnectorCredentialSecrets',
      ]) &&
      includesAll(connectorCredentialCheckSource, [
        'synthetic credential sentinel values are not output',
        'matrixRowsWithoutCredential',
        'CONNECTOR_CREDENTIAL_REQUIRED_KEYS',
        'closeSprintCard',
      ]) &&
      includesAll(connectorCredentialPlanSource, [
        'no-secret connector credential',
        'No raw secret values',
        'Connector matrix can consume registry status',
      ]) &&
      includesAll(sourceConnectorMatrixSource, [
        'buildConnectorCredentialRegistrySnapshot',
        'credentialRegistryKeys',
        'has_credential',
        'credential_status',
      ]) &&
      includesAll(foundationSourceRoutesSource, [
        '/api/foundation/connector-credential-preflight',
        'buildConnectorCredentialRegistrySnapshot',
        'connectorCredentialPreflight',
      ]) &&
      (!connectorCredentialIsClosed ||
        ((connectorCredentialCloseout.proofCommands || []).includes('npm run process:connector-credential-check -- --json') &&
          (connectorCredentialCloseout.backlogIds || []).includes(CONNECTOR_CREDENTIAL_CARD_ID))),
    'CONNECTOR-CREDENTIAL-001 adds no-secret connector credential/preflight truth',
    `lane=${connectorCredential?.lane || 'missing'} stage=${connectorCredentialCurrentItem?.stage || 'closed'} registryRows=${connectorCredentialRegistry.summary?.rowCount || 0} credentialRows=${sourceConnectorMatrix.summary?.credentialCoveredCount ?? 'missing'}`,
  )
  const llmAuthAuditVerifierCheck = evaluateLlmAuthAuditVerifierCheck({
    llmAuthAuditIsBuilding,
    llmAuthAuditIsClosed,
    packageJson,
    llmAuthAuditApprovalValidation,
    foundationHub,
    foundationCurrentSprintStatus,
    llmAuthAuditRuntimeStatus,
    llmAuthAuditProofSource,
    llmAuthAuditCheckSource,
    llmAuthAuditPlanSource,
    serverSource: `${serverSource}\n${foundationRuntimeReadRoutesSource}`,
    llmAuthAuditCloseout,
    foundationJobs: {
      ...(foundationHub.foundationJobs || {}),
      jobs: llmAuthAuditJobDefinition ? [llmAuthAuditJobDefinition] : (foundationHub.foundationJobs?.jobs || []),
    },
    llmAuthBudgetLabelCard,
    llmAuthBudgetLabelCloseout,
    llmAuthBudgetLabelApprovalValidation,
    llmAuthBudgetLabelCurrentItem,
    llmAuthBudgetLabelProofSource,
    llmAuthBudgetLabelCheckSource,
    llmAuthBudgetLabelPlanSource,
  })
  const llmAuthAuditVerifierDogfoodProof = buildLlmAuthAuditVerifierDogfoodProof()
  ensure(
    checks,
    llmAuthAuditVerifierCheck.ok &&
      llmAuthAuditVerifierDogfoodProof.ok &&
      packageJson.scripts?.['process:foundation-verify-llm-auth-audit-check'] === `node --env-file-if-exists=.env ${FOUNDATION_VERIFY_LLM_AUTH_AUDIT_SCRIPT_PATH}` &&
      includesAll(llmAuthAuditVerifierModuleSource, [
        'evaluateLlmAuthAuditVerifierCheck',
        'buildLlmAuthAuditVerifierDogfoodProof',
        'missingCloseoutProof',
      ]) &&
      includesAll(llmAuthAuditVerifierCheckSource, [
        'buildLlmAuthAuditVerifierDogfoodProof',
        'FOUNDATION_VERIFY_LLM_AUTH_AUDIT_CARD_ID',
      ]),
    'LLM-AUTH-AUDIT-001 records fresh model route/auth truth without opening new spending paths',
    `lane=${llmAuthAudit?.lane || 'missing'} stage=${llmAuthAuditCurrentItem?.stage || 'closed'} status=${llmAuthAuditRuntimeStatus.status} routes=${llmAuthAuditRuntimeStatus.summary?.routeCount || 0} latestJob=${llmAuthAuditRuntimeStatus.summary?.latestJob?.status || 'missing'} module=${llmAuthAuditVerifierCheck.detail}`,
  )
  ensure(
    checks,
    (sourceExtractionGapFollowupIsBuilding || sourceExtractionGapFollowupIsClosed) &&
      packageJson.scripts?.['process:source-extraction-gap-followup-check'] === `node --env-file-if-exists=.env ${SOURCE_EXTRACTION_GAP_FOLLOWUP_SCRIPT_PATH}` &&
      sourceExtractionGapFollowupApprovalValidation.ok &&
      sourceExtractionGapFollowupApprovalValidation.mode === 'v2' &&
      sourceExtractionGapFollowupApprovalValidation.approval?.approvedPlanRef === SOURCE_EXTRACTION_GAP_FOLLOWUP_PLAN_PATH &&
      foundationHub.currentSprint?.status === 'healthy' &&
      foundationCurrentSprintStatus.status === 'healthy' &&
      sourceExtractionGapFollowupSnapshot.summary?.triageItemCount >= 20 &&
      sourceExtractionGapFollowupSnapshot.summary?.triageItemCount === sourceExtractionGapFollowupSnapshot.summary?.rowsNeedingTriage &&
      sourceExtractionGapMissingIds.length === 0 &&
      sourceExtractionGapSyntheticMissingProof.ok &&
      ['ATOM-FLOW-AUTO-DEMOTION-001', 'EXTRACT-RUN-HARDENING-EXECUTION-001', 'RESEARCH-LANE-PURGE-001'].every(cardId =>
        sourceExtractionGapFollowupSnapshot.queuedNextSprintCandidates.some(item => item.cardId === cardId)
      ) &&
      ['SRC-MISSIVE-001', 'SRC-SLACK-001', 'SRC-GDRIVE-001', 'SRC-FUB-001', 'SRC-CLICKUP-001', 'SRC-GADS-001', 'SRC-PUBLISH-001', 'SRC-SKOOL-001', 'SRC-LOOM-001', 'SRC-MYICRO-001', 'SRC-REAL-001'].every(sourceId =>
        sourceExtractionGapFollowupSnapshot.triageItems.some(item => item.sourceId === sourceId)
      ) &&
      sourceExtractionGapFollowupSnapshot.triageItems.every(item =>
        item.sourceId &&
          item.connectorKey &&
          item.currentMatrixState &&
          item.proposedNextCard &&
          item.notNextBoundary &&
          typeof item.blockedReason === 'string'
      ) &&
      sourceExtractionGapFollowupReportSource.includes('Rows needing triage: 23') &&
      sourceExtractionGapFollowupReportSource.includes('ATOM-FLOW-AUTO-DEMOTION-001') &&
      sourceExtractionGapFollowupReportSource.includes('It does not start extraction jobs') &&
      includesAll(sourceExtractionGapFollowupSource, [
        'buildSourceExtractionGapFollowupSnapshot',
        'buildSyntheticMissingGapProof',
        'SOURCE_EXTRACTION_GAP_NEXT_SPRINT_CANDIDATES',
        'renderSourceExtractionGapTriageReport',
      ]) &&
      includesAll(sourceExtractionGapFollowupCheckSource, [
        'buildLiveTriageSnapshot',
        'synthetic missing-gap variant is rejected',
        'triage card does not import extraction job runners',
        'active_blocker_card_id = NULL',
      ]) &&
      includesAll(sourceExtractionGapFollowupPlanSource, [
        'triage only',
        'No source extraction job is started',
        'rejects missing high-priority gap rows',
      ]) &&
      (!sourceExtractionGapFollowupIsClosed ||
        ((sourceExtractionGapFollowupCloseout.proofCommands || []).includes('npm run process:source-extraction-gap-followup-check -- --json') &&
          (sourceExtractionGapFollowupCloseout.backlogIds || []).includes(SOURCE_EXTRACTION_GAP_FOLLOWUP_CARD_ID))),
    'SOURCE-EXTRACTION-GAP-FOLLOWUP-001 ranks source gaps without starting ingestion',
    `lane=${sourceExtractionGapFollowupCard?.lane || 'missing'} stage=${sourceExtractionGapFollowupCurrentItem?.stage || 'closed'} triage=${sourceExtractionGapFollowupSnapshot.summary?.triageItemCount || 0} missing=${sourceExtractionGapMissingIds.join(',') || 'none'}`,
  )
  ensure(
    checks,
    (atomFlowAutoDemotionIsBuilding || atomFlowAutoDemotionIsClosed) &&
      packageJson.scripts?.['process:atom-flow-auto-demotion-check'] === `node --env-file-if-exists=.env ${ATOM_FLOW_AUTO_DEMOTION_SCRIPT_PATH}` &&
      atomFlowAutoDemotionApprovalValidation.ok &&
      atomFlowAutoDemotionApprovalValidation.mode === 'v2' &&
      atomFlowAutoDemotionApprovalValidation.approval?.approvedPlanRef === ATOM_FLOW_AUTO_DEMOTION_PLAN_PATH &&
      atomFlowAutoDemotionSynthetic.ok &&
      atomFlowRows.length >= 35 &&
      atomFlowRowsMissingStatus.length === 0 &&
      Number(foundationSourceLifecycle.sourceMaturityGrid?.summary?.atomFlowWindowHours || foundationHub.sourceMaturityGrid?.summary?.atomFlowWindowHours || 0) > 0 &&
      staleAtomFlowRows.every(row => row.stages?.atomized?.ok === false) &&
      includesAll(atomFlowAutoDemotionSource, [
        'buildAtomFlowStatus',
        'buildSyntheticAtomFlowAutoDemotionProof',
        'demoteAtomized',
        'no promoted intelligence_atoms',
      ]) &&
      includesAll(sourceMaturityGridSource, [
        'atomFlowWindowHours',
        'staleAtomFlowSources',
        'demoteAtomized',
        'atomFlow',
      ]) &&
      includesAll(atomFlowAutoDemotionScriptSource, [
        'buildSyntheticGridProof',
        'sourceRowsMissingAtomFlow',
        'live stale atom-flow rows are demoted from atomized green state',
        'EXTRACT-RUN-HARDENING-EXECUTION-001',
      ]) &&
      includesAll(atomFlowAutoDemotionPlanSource, [
        'no recent promoted `intelligence_atoms`',
        'No substring-only proof',
        'focused gate',
      ]) &&
      (!atomFlowAutoDemotionIsClosed ||
        ((atomFlowAutoDemotionCloseout.proofCommands || []).includes('npm run process:atom-flow-auto-demotion-check -- --json') &&
          (atomFlowAutoDemotionCloseout.backlogIds || []).includes(ATOM_FLOW_AUTO_DEMOTION_CARD_ID))),
    'ATOM-FLOW-AUTO-DEMOTION-001 demotes stale source atom-flow claims',
    `lane=${atomFlowAutoDemotion?.lane || 'missing'} stage=${atomFlowAutoDemotionCurrentItem?.stage || 'closed'} stale=${staleAtomFlowRows.length} missing=${atomFlowRowsMissingStatus.length}`,
  )
  ensure(
    checks,
    (extractRunHardeningExecutionIsBuilding || extractRunHardeningExecutionIsClosed) &&
      packageJson.scripts?.['extraction:retry-failed'] === `node --env-file-if-exists=.env ${EXTRACTION_RETRY_FAILED_SCRIPT_PATH}` &&
      packageJson.scripts?.['process:extract-run-hardening-execution-check'] === `node --env-file-if-exists=.env ${EXTRACT_RUN_HARDENING_EXECUTION_SCRIPT_PATH}` &&
      extractRunHardeningExecutionApprovalValidation.ok &&
      extractRunHardeningExecutionApprovalValidation.mode === 'v2' &&
      extractRunHardeningExecutionApprovalValidation.approval?.approvedPlanRef === EXTRACT_RUN_HARDENING_EXECUTION_PLAN_PATH &&
      extractRunHardeningExecutionSynthetic.ok &&
      includesAll(extractRunHardeningExecutionSource, [
        'selectEligibleExtractionRetryItems',
        'finishExtractionRetryItem',
        'buildSyntheticExtractionRetryExecutionProof',
        'source_crawl_item_attempts',
      ]) &&
      includesAll(extractionRetryFailedScriptSource, [
        'classifySourceCrawlItemRetries',
        'getRetryableSourceCrawlItems',
        '--dryRun=true',
      ]) &&
      includesAll(extractRunHardeningExecutionScriptSource, [
        'runRetryDryRun',
        'synthetic retry execution covers success',
        'RESEARCH-LANE-PURGE-001',
      ]) &&
      includesAll(foundationJobsSource, [
        EXTRACTION_RETRY_FAILED_JOB_KEY,
        "args: ['run', 'extraction:retry-failed', '--', '--target=meetings-current-day', '--limit=10']",
        "runtimeMode: 'manual'",
      ]) &&
      includesAll(extractRunHardeningExecutionPlanSource, [
        'eligible failed `source_crawl_items`',
        'No substring-only proof',
        'manual-only',
      ]) &&
      (!extractRunHardeningExecutionIsClosed ||
        ((extractRunHardeningExecutionCloseout.proofCommands || []).includes('npm run process:extract-run-hardening-execution-check -- --json') &&
          (extractRunHardeningExecutionCloseout.backlogIds || []).includes(EXTRACT_RUN_HARDENING_EXECUTION_CARD_ID))),
    'EXTRACT-RUN-HARDENING-EXECUTION-001 runs bounded failed-item retry execution',
    `lane=${extractRunHardeningExecution?.lane || 'missing'} stage=${extractRunHardeningExecutionCurrentItem?.stage || 'closed'} synthetic=${extractRunHardeningExecutionSynthetic.ok}`,
  )
  ensure(
    checks,
    (researchLanePurgeIsBuilding || researchLanePurgeIsClosed) &&
      packageJson.scripts?.['process:research-lane-purge-check'] === `node --env-file-if-exists=.env ${RESEARCH_LANE_PURGE_SCRIPT_PATH}` &&
      researchLanePurgeApprovalValidation.ok &&
      researchLanePurgeApprovalValidation.mode === 'v2' &&
      researchLanePurgeApprovalValidation.approval?.approvedPlanRef === RESEARCH_LANE_PURGE_PLAN_PATH &&
      researchLanePurgeSynthetic.ok &&
      researchLanePurgeSnapshot.summary?.researchCardCount >= 100 &&
      researchLanePurgeSnapshot.summary?.researchCardCount === researchLanePurgeSnapshot.items.length &&
      researchLanePurgeSnapshot.items.every(item => item.proposedOnly === true && item.cardId && item.updateSignal && item.proposedDisposition && item.reason) &&
      includesAll(researchLanePurgeSource, [
        'buildResearchLanePurgeSnapshot',
        'renderResearchLanePurgeReport',
        'researchLaneSignature',
        'buildSyntheticResearchLanePurgeProof',
      ]) &&
      includesAll(researchLanePurgeScriptSource, [
        'beforeResearchSignature',
        'afterResearchSignature',
        'writeReport',
        'skipClose',
      ]) &&
      includesAll(researchLanePurgePlanSource, [
        'No substring-only proof',
        'No backlog card is moved',
        'docs/handoffs/research-purge-2026-05-13.md',
      ]) &&
      includesAll(researchLanePurgeReportSource, [
        'PROPOSED ONLY',
        'No backlog cards were deleted, closed, or moved by this report.',
        'No future-concepts parking doc is edited or created',
      ]) &&
      (!researchLanePurgeIsClosed ||
        ((researchLanePurgeCloseout.proofCommands || []).includes('npm run process:research-lane-purge-check -- --json') &&
          (researchLanePurgeCloseout.backlogIds || []).includes(RESEARCH_LANE_PURGE_CARD_ID))),
    'RESEARCH-LANE-PURGE-001 generates proposed-only research purge report',
    `lane=${researchLanePurge?.lane || 'missing'} stage=${researchLanePurgeCurrentItem?.stage || 'closed'} rows=${researchLanePurgeSnapshot.summary?.researchCardCount || 0} synthetic=${researchLanePurgeSynthetic.ok}`,
  )

  return {
    ok: checks.every(check => check.ok),
    checks,
    summary: {
      total: checks.length,
      passed: checks.filter(check => check.ok).length,
      failed: checks.filter(check => !check.ok).length,
    },
  }
}
