#!/usr/bin/env node

import process from 'node:process'
import { getGroupedSourceSystems, getSourceContracts, getSourceConnectors } from '../lib/source-contracts.js'
import {
  CLOSEOUT_OWNERSHIP_GUARD_CARD_ID,
  buildSyntheticBuildLogCloseoutValidationProof,
  buildSyntheticBuildLogOwnershipProof,
  getFoundationBuildCloseouts,
  getFoundationBuildCloseoutValidation,
  FOUNDATION_BUILD_CLOSEOUT_SCHEMA_VERSION,
} from '../lib/foundation-build-log.js'
import {
  CANVA_CLIENT_PLAN_PATH,
  CANVA_CLIENT_SCRIPT_PATH,
  VERIFIER_CANVA_CLIENT_SPLIT_MODULE_CARD_ID,
  VERIFIER_CANVA_CLIENT_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_CANVA_CLIENT_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_CARD_ID,
  evaluateFoundationCanvaClientVerifierOrchestration,
} from '../lib/foundation-canva-client-verifier.js'
import { buildSprintProofHelpers } from '../lib/foundation-verifier-sprint-proof.js'
import {
  buildSyntheticApprovalIntegrityStatus,
  PHASE_1_ENFORCEMENT_CARD_IDS,
  PHASE_1_ENFORCEMENT_PLAN_REF,
  PHASE_1_ENFORCEMENT_PLAN_SHA256,
  validatePlanApprovalFile,
} from '../lib/approval-integrity.js'
import {
  buildSyntheticGateReliabilityProof,
  formatFoundationGateRetryMessage,
  runWithFoundationGateRetry,
} from '../lib/foundation-gate-reliability.js'
import {
  PROCESS_CHECK_APPLY_BOUNDARY_CARD_ID,
  RUNTIME_SAFETY_HARDENING_SCRIPT_PATH,
  VERIFY_READONLY_GATE_CARD_ID,
  buildFoundationVerifyRetryOptions,
  buildVerifyReadOnlyGateDogfoodProof,
} from '../lib/foundation-runtime-safety.js'
import {
  buildProcessCheckApplyBoundaryDogfoodProof,
} from '../lib/process-write-guard.js'
import {
  PROCESS_CHECK_READONLY_MODE_CARD_ID,
  PROCESS_CHECK_READONLY_MODE_CLOSEOUT_KEY,
  PROCESS_CHECK_READONLY_MODE_SCRIPT_PATH,
  buildProcessCheckReadonlyModeProof,
} from '../lib/process-check-readonly-mode.js'
import {
  SPRINT_CHECK_HISTORICAL_MODE_CARD_ID,
  SPRINT_CHECK_HISTORICAL_MODE_CLOSEOUT_KEY,
  SPRINT_CHECK_HISTORICAL_MODE_SCRIPT_PATH,
  buildSyntheticSprintCheckHistoricalModeProof,
  processCheckReadonlyProofIsHistoricalAware,
} from '../lib/sprint-check-historical-mode.js'
import {
  LIVE_TRUTH_VERIFY_DECOUPLE_CARD_ID,
  LIVE_TRUTH_VERIFY_DECOUPLE_SCRIPT_PATH,
  buildLiveTruthVerifyDecoupleStatus,
} from '../lib/live-truth-verify-decouple.js'
import {
  FOUNDATION_JOB_MUTATION_ALLOWLIST_CARD_ID,
  FOUNDATION_JOB_MUTATION_ALLOWLIST_SCRIPT_PATH,
  buildFoundationJobMutationAllowlistDogfoodProof,
  buildFoundationJobMutationAllowlistReport,
} from '../lib/foundation-job-mutation-allowlist.js'
import {
  ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_CARD_ID,
  ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_CLOSEOUT_KEY,
  ACTIVE_VS_HISTORICAL_VERIFIER_SPLIT_SCRIPT_PATH,
  buildActiveVsHistoricalVerifierSplitDogfoodProof,
} from '../lib/foundation-active-historical-verifier.js'
import {
  DB_SEED_CARD_ID,
  DB_SEED_CLOSEOUT_KEY,
  DB_SEED_SCRIPT_PATH,
  buildDbSeedGovernanceDogfoodProof,
  evaluateDbSeedModuleSplit,
} from '../lib/foundation-db-seed-governance.js'
import {
  PROCESS_CHECK_SCHEDULED_MUTATION_GUARD_CARD_ID,
  buildScheduledMutationGuardDogfoodProof,
  getFoundationJobDefinition,
  getFoundationJobDefinitions,
  getFoundationJobRuntime,
} from '../lib/foundation-jobs.js'
import {
  buildPersonalWorkspaceBoundaryStatus,
} from '../lib/foundation-personal-workspace-boundary.js'
import {
  buildCeoDashboardPatternStatus,
} from '../lib/foundation-ceo-dashboard-pattern.js'
import {
  buildFoundationReviewSprintStatus,
  FOUNDATION_REVIEW_SPRINT_CARD_IDS,
  FOUNDATION_REVIEW_SPRINT_CLOSEOUT_KEY,
  loadFoundationReviewSprintArtifact,
} from '../lib/foundation-review-sprint.js'
import {
  IMPLEMENTATION_INTELLIGENCE_CARD_IDS,
  IMPLEMENTATION_INTELLIGENCE_CLOSEOUT_KEY,
  buildImplementationIntelligenceSnapshot,
} from '../lib/implementation-intelligence.js'
import {
  BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CARD_IDS,
  BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CLOSEOUT_KEY,
  BUILD_INTEL_EXTRACTION_IMPLEMENTATION_REPORT_PATH,
  BUILD_INTEL_EXTRACTION_IMPLEMENTATION_SCRIPT_PATH,
  buildBuildIntelExtractionImplementationSnapshot,
} from '../lib/build-intel-extraction-implementation.js'
import {
  GSTACK_BUILD_INTEL_CARD_IDS,
  GSTACK_BUILD_INTEL_CLOSEOUT_KEY,
  GSTACK_BUILD_INTEL_EXPECTED_COMMIT,
  GSTACK_BUILD_INTEL_REPORT_PATH,
  GSTACK_BUILD_INTEL_SCRIPT_PATH,
  buildGStackBuildIntelSnapshot,
} from '../lib/gstack-build-intel.js'
import {
  CODE_QUALITY_NIGHTLY_AUDIT_CARD_IDS,
  CODE_QUALITY_NIGHTLY_AUDIT_CLOSEOUT_KEY,
  CODE_QUALITY_NIGHTLY_AUDIT_JOB_KEY,
  CODE_QUALITY_NIGHTLY_AUDIT_REPORT_PATH,
  CODE_QUALITY_NIGHTLY_AUDIT_REQUIRED_ENDPOINTS,
  CODE_QUALITY_NIGHTLY_AUDIT_SCRIPT_PATH,
  buildCodeQualityNightlyAudit,
  buildSyntheticCodeQualityNightlyAuditProof,
} from '../lib/code-quality-nightly-audit.js'
import {
  NIGHTLY_DEEP_AUDIT_APPROVAL_PATH,
  NIGHTLY_DEEP_AUDIT_JOB_KEY,
  NIGHTLY_DEEP_AUDIT_PLAN_PATH,
  NIGHTLY_DEEP_AUDIT_SCRIPT_PATH,
  NIGHTLY_DEEP_AUDIT_UPGRADE_CARD_ID,
  NIGHTLY_DEEP_AUDIT_UPGRADE_CLOSEOUT_KEY,
  buildNightlyDeepAuditUpgrade,
  buildNightlyDeepAuditUpgradeDogfoodProof,
} from '../lib/nightly-deep-audit-upgrade.js'
import {
  FOUNDATION_ROUTE_BUDGET_CLEANUP_CARD_IDS,
  FOUNDATION_ROUTE_BUDGET_CLEANUP_CLOSEOUT_KEY,
  VERIFIER_ROUTE_BUDGET_MODULE_SPLIT_CARD_ID,
  buildFoundationRouteBudgetVerifierDogfoodProof,
  evaluateFoundationRouteBudgetVerifier,
} from '../lib/foundation-route-budget-verifier.js'
import {
  FOUNDATION_ENDPOINT_BUDGETS_CARD_ID,
  FOUNDATION_ENDPOINT_BUDGETS_CLOSEOUT_KEY,
  FOUNDATION_ENDPOINT_BUDGETS_PLAN_PATH,
  FOUNDATION_ENDPOINT_BUDGETS_SCRIPT_PATH,
  FOUNDATION_ENDPOINT_BUDGETS_SPRINT_ID,
  FOUNDATION_ENDPOINT_BUDGET_ROUTES,
  buildFoundationEndpointBudgetsDogfoodProof,
  loadLatestFoundationEndpointBudgetSnapshot,
} from '../lib/foundation-endpoint-budgets.js'
import {
  FOUNDATION_FRONTEND_ASSET_BUDGET_CARD_ID,
  FOUNDATION_FRONTEND_ASSET_BUDGET_CLOSEOUT_KEY,
  FOUNDATION_FRONTEND_ASSET_BUDGET_PLAN_PATH,
  FOUNDATION_FRONTEND_ASSET_BUDGET_SCRIPT_PATH,
  FOUNDATION_FRONTEND_ASSET_BUDGET_SPRINT_ID,
  buildFoundationFrontendAssetBudgetDogfoodProof,
  measureFoundationFrontendAssetsFromRepo,
} from '../lib/foundation-frontend-asset-budgets.js'
import {
  FOUNDATION_FRONTEND_DOM_BUDGET_APPROVAL_PATH,
  FOUNDATION_FRONTEND_DOM_BUDGET_CARD_ID,
  FOUNDATION_FRONTEND_DOM_BUDGET_CLOSEOUT_KEY,
  FOUNDATION_FRONTEND_DOM_BUDGET_PLAN_PATH,
  FOUNDATION_FRONTEND_DOM_BUDGET_SCRIPT_PATH,
  FOUNDATION_FRONTEND_DOM_BUDGET_SPRINT_ID,
  buildFoundationFrontendDomBudgetDogfoodProof,
  measureFoundationFrontendDomBudgetFromRepo,
} from '../lib/foundation-frontend-dom-budgets.js'
import {
  VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_APPROVAL_PATH,
  VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_BEFORE_LINES,
  VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_CARD_ID,
  VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_CLOSEOUT_KEY,
  VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_SPRINT_ID,
  buildFoundationOperatorBudgetVerifierDogfoodProof,
  evaluateFoundationOperatorBudgetVerifier,
} from '../lib/foundation-operator-budget-verifier.js'
import {
  VERIFIER_HUB_SAFETY_SPLIT_MODULE_CARD_ID,
  VERIFIER_HUB_SAFETY_SPLIT_MODULE_CLOSEOUT_KEY,
  VERIFIER_HUB_SAFETY_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_HUB_SAFETY_SPLIT_MODULE_SCRIPT_PATH,
  buildFoundationHubSafetyVerifierDogfoodProof,
  evaluateFoundationHubSafetyVerifier,
} from '../lib/foundation-hub-safety-verifier.js'
import {
  VERIFIER_ROUTE_SPLIT_MODULE_APPROVAL_PATH,
  VERIFIER_ROUTE_SPLIT_MODULE_CARD_ID,
  VERIFIER_ROUTE_SPLIT_MODULE_CLOSEOUT_KEY,
  VERIFIER_ROUTE_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_ROUTE_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_ROUTE_SPLIT_MODULE_SPRINT_ID,
  buildFoundationRouteSplitVerifierDogfoodProof,
  evaluateFoundationRouteSplitVerifier,
} from '../lib/foundation-route-split-verifier.js'
import { evaluateFoundationRecentBuildsVerifierOrchestration } from '../lib/foundation-recent-builds-verifier.js'
import {
  buildFoundationVerifierBuildLogCloseoutEntries,
  buildFoundationVerifierBuildLogCloseoutEntry,
  closeoutRecordAsBuildLogEntry,
} from '../lib/foundation-verifier-build-log-closeouts.js'
import { buildFoundationVerifierPlanReviews } from '../lib/foundation-verifier-plan-reviews.js'
import {
  buildFoundationVerifierSourceBundle,
} from '../lib/foundation-verifier-snapshot-wiring-repair.js'
import { readFoundationBacklogSeedSourceBundle } from '../lib/foundation-backlog-seed-source.js'
import {
  VERIFIER_PROCESS_GOVERNANCE_SPLIT_APPROVAL_PATH,
  VERIFIER_PROCESS_GOVERNANCE_SPLIT_BEFORE_LINES,
  VERIFIER_PROCESS_GOVERNANCE_SPLIT_CARD_ID,
  VERIFIER_PROCESS_GOVERNANCE_SPLIT_CLOSEOUT_KEY,
  VERIFIER_PROCESS_GOVERNANCE_SPLIT_HANDOFF_PATH,
  VERIFIER_PROCESS_GOVERNANCE_SPLIT_PLAN_PATH,
  VERIFIER_PROCESS_GOVERNANCE_SPLIT_SCRIPT_PATH,
  buildFoundationVerifierProcessGovernanceDogfoodProof,
  evaluateFoundationVerifierProcessGovernance,
} from '../lib/foundation-verifier-process-governance.js'
import {
  VERIFIER_READINESS_FOLLOWUP_SPLIT_APPROVAL_PATH,
  VERIFIER_READINESS_FOLLOWUP_SPLIT_BEFORE_LINES,
  VERIFIER_READINESS_FOLLOWUP_SPLIT_CARD_ID,
  VERIFIER_READINESS_FOLLOWUP_SPLIT_CLOSEOUT_KEY,
  VERIFIER_READINESS_FOLLOWUP_SPLIT_HANDOFF_PATH,
  VERIFIER_READINESS_FOLLOWUP_SPLIT_PLAN_PATH,
  VERIFIER_READINESS_FOLLOWUP_SPLIT_SCRIPT_PATH,
  buildFoundationVerifierReadinessFollowupDogfoodProof,
  evaluateFoundationVerifierReadinessFollowup,
} from '../lib/foundation-verifier-readiness-followup.js'
import {
  VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_APPROVAL_PATH,
  VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_BEFORE_LINES,
  VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_CARD_ID,
  VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_CLOSEOUT_KEY,
  VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_HANDOFF_PATH,
  VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_PLAN_PATH,
  VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_SCRIPT_PATH,
  buildFoundationVerifierGuardrailCloseoutsDogfoodProof,
  evaluateFoundationVerifierGuardrailCloseouts,
} from '../lib/foundation-verifier-guardrail-closeouts.js'
import {
  VERIFIER_CONTROL_LOOP_SPLIT_APPROVAL_PATH,
  VERIFIER_CONTROL_LOOP_SPLIT_BEFORE_LINES,
  VERIFIER_CONTROL_LOOP_SPLIT_CARD_ID,
  VERIFIER_CONTROL_LOOP_SPLIT_CLOSEOUT_KEY,
  VERIFIER_CONTROL_LOOP_SPLIT_HANDOFF_PATH,
  VERIFIER_CONTROL_LOOP_SPLIT_PLAN_PATH,
  VERIFIER_CONTROL_LOOP_SPLIT_SCRIPT_PATH,
  buildFoundationVerifierControlLoopDogfoodProof,
  evaluateFoundationVerifierControlLoop,
} from '../lib/foundation-verifier-control-loop.js'
import {
  VERIFIER_FRONTEND_SPLIT_ASSURANCE_APPROVAL_PATH,
  VERIFIER_FRONTEND_SPLIT_ASSURANCE_BEFORE_LINES,
  VERIFIER_FRONTEND_SPLIT_ASSURANCE_CARD_ID,
  VERIFIER_FRONTEND_SPLIT_ASSURANCE_CLOSEOUT_KEY,
  VERIFIER_FRONTEND_SPLIT_ASSURANCE_HANDOFF_PATH,
  VERIFIER_FRONTEND_SPLIT_ASSURANCE_PLAN_PATH,
  VERIFIER_FRONTEND_SPLIT_ASSURANCE_SCRIPT_PATH,
  buildFoundationVerifierFrontendSplitAssuranceDogfoodProof,
  evaluateFoundationVerifierFrontendSplitAssurance,
} from '../lib/foundation-verifier-frontend-split-assurance.js'
import {
  evaluateFoundationVerifierPhaseGOperatorCloseout,
} from '../lib/foundation-verifier-phase-g-operator-closeout.js'
import {
  evaluateFoundationVerifierReadinessBlockerCloseout,
} from '../lib/foundation-verifier-readiness-blocker-closeout.js'
import {
  evaluateFoundationVerifierSprintGateProgression,
} from '../lib/foundation-verifier-sprint-gate-progression.js'
import {
  VERIFIER_SOURCE_ONCE_OVER_PROGRESSION_SPLIT_APPROVAL_PATH,
  VERIFIER_SOURCE_ONCE_OVER_PROGRESSION_SPLIT_BEFORE_LINES,
  VERIFIER_SOURCE_ONCE_OVER_PROGRESSION_SPLIT_CARD_ID,
  VERIFIER_SOURCE_ONCE_OVER_PROGRESSION_SPLIT_CLOSEOUT_KEY,
  VERIFIER_SOURCE_ONCE_OVER_PROGRESSION_SPLIT_HANDOFF_PATH,
  VERIFIER_SOURCE_ONCE_OVER_PROGRESSION_SPLIT_PLAN_PATH,
  VERIFIER_SOURCE_ONCE_OVER_PROGRESSION_SPLIT_SCRIPT_PATH,
  buildFoundationVerifierSourceOnceOverProgressionDogfoodProof,
  evaluateFoundationVerifierSourceOnceOverProgressionOrchestration,
} from '../lib/foundation-verifier-source-once-over-progression.js'
import {
  VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_APPROVAL_PATH,
  VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_BEFORE_LINES,
  VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_CARD_ID,
  VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_CLOSEOUT_KEY,
  VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_HANDOFF_PATH,
  VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_PLAN_PATH,
  VERIFIER_PROCESS_CONTROL_GOVERNANCE_SPLIT_SCRIPT_PATH,
  evaluateFoundationVerifierProcessControlGovernanceOrchestration,
} from '../lib/foundation-verifier-process-control-governance.js'
import {
  evaluateFoundationVerifierStructuralAssuranceCore,
} from '../lib/foundation-verifier-structural-assurance-core.js'
import {
  evaluateFoundationVerifierFrontendStructuralAssurance,
} from '../lib/foundation-verifier-frontend-structural-assurance.js'
import {
  evaluateFoundationVerifierHistoricalSplitCloseouts,
} from '../lib/foundation-verifier-historical-split-closeouts.js'
import {
  evaluateFoundationVerifierBuildLogRegistryAssurance,
} from '../lib/foundation-verifier-build-log-registry-assurance.js'
import {
  evaluateFoundationVerifierHealthLiveSummary,
} from '../lib/foundation-verifier-health-live-summary.js'
import {
  evaluateFoundationVerifierFollowupBacklogAssurance,
} from '../lib/foundation-verifier-followup-backlog-assurance.js'
import {
  evaluateFoundationVerifierCleanupControlAssurance,
} from '../lib/foundation-verifier-cleanup-control-assurance.js'
import {
  evaluateFoundationVerifierOperatorLiveSurfaceAssurance,
} from '../lib/foundation-verifier-operator-live-surface-assurance.js'
import {
  VERIFIER_RUNTIME_RELIABILITY_SPLIT_CARD_ID,
  VERIFIER_RUNTIME_RELIABILITY_SPLIT_PLAN_PATH,
  VERIFIER_RUNTIME_RELIABILITY_SPLIT_SCRIPT_PATH,
  VERIFIER_RUNTIME_RELIABILITY_ORCHESTRATION_SPLIT_CARD_ID,
  evaluateFoundationRuntimeReliabilityVerifierOrchestration,
} from '../lib/foundation-runtime-reliability-verifier.js'
import {
  evaluateFoundationEngineeringFitnessVerifierCoverage,
} from '../lib/foundation-engineering-fitness-gates.js'
import {
  VERIFIER_HEALTH_SCRIPT_MODULE_CARD_ID,
} from '../lib/foundation-health-script-verifier.js'
import {
  VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_CARD_ID,
  VERIFIER_SOURCE_CONTRACT_MODULE_PLAN_PATH,
  VERIFIER_SOURCE_CONTRACT_MODULE_SCRIPT_PATH,
  evaluateFoundationSourceContractVerifierOrchestration,
} from '../lib/foundation-source-contract-verifier.js'
import {
  VERIFIER_SOURCE_TRUST_SPLIT_MODULE_CARD_ID,
  VERIFIER_SOURCE_TRUST_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_SOURCE_TRUST_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_SOURCE_TRUST_ORCHESTRATION_SPLIT_CARD_ID,
  evaluateFoundationSourceTrustVerifierOrchestration,
} from '../lib/foundation-source-trust-verifier.js'
import {
  VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_APPROVAL_PATH,
  VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_CARD_ID,
  VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_CLOSEOUT_KEY,
  VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_SPRINT_ID,
  buildFoundationCurrentSprintVerifierDogfoodProof,
  evaluateFoundationCurrentSprintVerifier,
} from '../lib/foundation-current-sprint-verifier.js'
import {
  VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_APPROVAL_PATH,
  VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_BEFORE_LINES,
  VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_CARD_ID,
  VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_CLOSEOUT_KEY,
  VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_SPRINT_ID,
  buildFoundationIntelligenceAuditVerifierDogfoodProof,
  evaluateFoundationIntelligenceAuditVerifier,
} from '../lib/foundation-intelligence-audit-verifier.js'
import {
  VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_CARD_ID,
  VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_CORE_GOVERNANCE_ORCHESTRATION_SPLIT_CARD_ID,
  evaluateFoundationCoreGovernanceVerifierOrchestration,
} from '../lib/foundation-core-governance-verifier.js'
import {
  buildDbConstraintDogfoodProof,
} from '../lib/db-constraint-hardening.js'
import {
  buildSourceIdConstraintContractDogfoodProof,
} from '../lib/source-id-constraint-contract.js'
import {
  VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_CARD_ID,
  VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_INTELLIGENCE_SPINE_ORCHESTRATION_SPLIT_CARD_ID,
  evaluateFoundationIntelligenceSpineVerifierOrchestration,
} from '../lib/foundation-intelligence-spine-verifier.js'
import {
  VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_CARD_ID,
  VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_EXTRACTION_RUNTIME_ORCHESTRATION_SPLIT_CARD_ID,
  evaluateFoundationExtractionRuntimeVerifierOrchestration,
} from '../lib/foundation-extraction-runtime-verifier.js'
import {
  EXTRACTION_RUNTIME_READINESS_CLOSEOUT_PATH,
  EXTRACTION_RUNTIME_READINESS_PLAN_PATH,
  EXTRACTION_RUNTIME_READINESS_SCRIPT_PATH,
} from '../lib/extraction-runtime-readiness.js'
import {
  EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CLOSEOUT_PATH,
  EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_PLAN_PATH,
  EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_SCRIPT_PATH,
} from '../lib/extractor-queue-karpathy-kb-video-pack.js'
import { CRAWL_RUN_LEDGER_SCRIPT_PATH } from '../lib/crawl-run-ledger.js'
import {
  EXTRACT_RETIRE_PLAN_PATH,
  EXTRACT_RETIRE_SCRIPT_PATH,
} from '../lib/extract-retire.js'
import {
  EXTRACT_RETRY_PLAN_PATH,
  EXTRACT_RETRY_SCRIPT_PATH,
} from '../lib/extract-retry.js'
import {
  VERIFIER_SURFACE_TRUST_SPLIT_MODULE_CARD_ID,
  VERIFIER_SURFACE_TRUST_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_SURFACE_TRUST_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_CARD_ID,
  apiRouteExists,
  backlogCardText,
  buildCloseoutText,
  evaluateFoundationSurfaceTrustVerifierOrchestration,
  extractClaimedApiRoutesFromText,
  extractClaimedFilesFromText,
  extractClaimedNpmScriptsFromText,
  findDoneCardsWithoutVerifierCoverage,
  findMissingArtifactClaims,
  normalizeClaim,
  validateVerifierExceptionLedger,
} from '../lib/foundation-surface-trust-verifier.js'
import {
  VERIFIER_PROCESS_HARDENING_SPLIT_MODULE_CARD_ID,
} from '../lib/foundation-process-hardening-verifier.js'
import { runFoundationVerifyProcessHardeningVerifier } from '../lib/foundation-verify-process-hardening-runner.js'
import {
  VERIFIER_PROCESS_TRUST_SPLIT_MODULE_CARD_ID,
  evaluateFoundationProcessTrustVerifierOrchestration,
} from '../lib/foundation-process-trust-verifier.js'
import {
  VERIFIER_AGENT_FEEDBACK_SPLIT_MODULE_CARD_ID,
  evaluateFoundationAgentFeedbackVerifierOrchestration,
} from '../lib/foundation-agent-feedback-verifier.js'
import {
  VERIFIER_SERVER_ROUTE_SPLIT_MODULE_APPROVAL_PATH,
  VERIFIER_SERVER_ROUTE_SPLIT_MODULE_BEFORE_LINES,
  VERIFIER_SERVER_ROUTE_SPLIT_MODULE_CARD_ID,
  VERIFIER_SERVER_ROUTE_SPLIT_MODULE_CLOSEOUT_KEY,
  VERIFIER_SERVER_ROUTE_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_SERVER_ROUTE_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_SERVER_ROUTE_SPLIT_MODULE_SPRINT_ID,
  buildFoundationServerRouteSplitVerifierDogfoodProof,
  evaluateFoundationServerRouteSplitVerifier,
} from '../lib/foundation-server-route-split-verifier.js'
import {
  VERIFIER_FOUNDATION_DB_SPLIT_MODULE_APPROVAL_PATH,
  VERIFIER_FOUNDATION_DB_SPLIT_MODULE_BEFORE_LINES,
  VERIFIER_FOUNDATION_DB_SPLIT_MODULE_CARD_ID,
  VERIFIER_FOUNDATION_DB_SPLIT_MODULE_CLOSEOUT_KEY,
  VERIFIER_FOUNDATION_DB_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_FOUNDATION_DB_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_FOUNDATION_DB_SPLIT_MODULE_SPRINT_ID,
  buildFoundationDbSplitVerifierDogfoodProof,
  evaluateFoundationDbSplitVerifier,
} from '../lib/foundation-db-split-verifier.js'
import {
  FOUNDATION_SOURCE_CRAWL_STORE_SPLIT_PLAN_PATH,
  FOUNDATION_SOURCE_CRAWL_STORE_SPLIT_SCRIPT_PATH,
} from '../lib/foundation-source-crawl-store.js'
import {
  FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_PLAN_PATH,
  FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_SCRIPT_PATH,
} from '../lib/foundation-drive-meeting-vault-store.js'
import {
  FOUNDATION_AGENT_FEEDBACK_STORE_SPLIT_PLAN_PATH,
  FOUNDATION_AGENT_FEEDBACK_STORE_SPLIT_SCRIPT_PATH,
} from '../lib/foundation-agent-feedback-store.js'
import {
  FOUNDATION_SALES_LISTING_STORE_SPLIT_PLAN_PATH,
  FOUNDATION_SALES_LISTING_STORE_SPLIT_SCRIPT_PATH,
} from '../lib/foundation-sales-listing-store.js'
import {
  FUB_SOURCE_ROUTE_SPLIT_APPROVAL_PATH,
  FUB_SOURCE_ROUTE_SPLIT_BEFORE_SERVER_LINES,
  FUB_SOURCE_ROUTE_SPLIT_CARD_ID,
  FUB_SOURCE_ROUTE_SPLIT_CLOSEOUT_KEY,
  FUB_SOURCE_ROUTE_SPLIT_PLAN_PATH,
  FUB_SOURCE_ROUTE_SPLIT_SCRIPT_PATH,
  FUB_SOURCE_ROUTE_SPLIT_SPRINT_ID,
  buildFubSourceRouteSplitDogfoodProof,
} from '../lib/fub-source-routes.js'
import {
  FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_APPROVAL_PATH,
  FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_BEFORE_SERVER_LINES,
  FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_CARD_ID,
  FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_PLAN_PATH,
  FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_SCRIPT_PATH,
  FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_SPRINT_ID,
  buildFoundationRuntimeReadRoutesSplitDogfoodProof,
} from '../lib/foundation-runtime-read-routes.js'
import {
  APP_PAGE_ROUTES_SPLIT_APPROVAL_PATH,
  APP_PAGE_ROUTES_SPLIT_BEFORE_SERVER_LINES,
  APP_PAGE_ROUTES_SPLIT_CARD_ID,
  APP_PAGE_ROUTES_SPLIT_CLOSEOUT_KEY,
  APP_PAGE_ROUTES_SPLIT_PLAN_PATH,
  APP_PAGE_ROUTES_SPLIT_SCRIPT_PATH,
  APP_PAGE_ROUTES_SPLIT_SPRINT_ID,
  buildAppPageRoutesSplitDogfoodProof,
} from '../lib/app-page-routes.js'
import {
  AUTH_ROUTES_SPLIT_APPROVAL_PATH,
  AUTH_ROUTES_SPLIT_BEFORE_SERVER_LINES,
  AUTH_ROUTES_SPLIT_CARD_ID,
  AUTH_ROUTES_SPLIT_CLOSEOUT_KEY,
  AUTH_ROUTES_SPLIT_PLAN_PATH,
  AUTH_ROUTES_SPLIT_SCRIPT_PATH,
  AUTH_ROUTES_SPLIT_SPRINT_ID,
  buildAuthRoutesSplitDogfoodProof,
} from '../lib/auth-routes.js'
import {
  HUB_READ_ROUTES_SPLIT_APPROVAL_PATH,
  HUB_READ_ROUTES_SPLIT_BEFORE_SERVER_LINES,
  HUB_READ_ROUTES_SPLIT_CARD_ID,
  HUB_READ_ROUTES_SPLIT_CLOSEOUT_KEY,
  HUB_READ_ROUTES_SPLIT_PLAN_PATH,
  HUB_READ_ROUTES_SPLIT_SCRIPT_PATH,
  HUB_READ_ROUTES_SPLIT_SPRINT_ID,
  buildHubReadRoutesSplitDogfoodProof,
} from '../lib/hub-read-routes.js'
import {
  STRATEGY_SHARED_COMMS_ROUTES_SPLIT_APPROVAL_PATH,
  STRATEGY_SHARED_COMMS_ROUTES_SPLIT_BEFORE_SERVER_LINES,
  STRATEGY_SHARED_COMMS_ROUTES_SPLIT_CARD_ID,
  STRATEGY_SHARED_COMMS_ROUTES_SPLIT_CLOSEOUT_KEY,
  STRATEGY_SHARED_COMMS_ROUTES_SPLIT_PLAN_PATH,
  STRATEGY_SHARED_COMMS_ROUTES_SPLIT_SCRIPT_PATH,
  STRATEGY_SHARED_COMMS_ROUTES_SPLIT_SPRINT_ID,
  buildStrategySharedCommsRoutesSplitDogfoodProof,
} from '../lib/strategy-shared-comms-routes.js'
import {
  FOUNDATION_WRITE_ROUTE_MARKERS,
  FOUNDATION_WRITE_ROUTES_SPLIT_APPROVAL_PATH,
  FOUNDATION_WRITE_ROUTES_SPLIT_BEFORE_SERVER_LINES,
  FOUNDATION_WRITE_ROUTES_SPLIT_CARD_ID,
  FOUNDATION_WRITE_ROUTES_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_WRITE_ROUTES_SPLIT_PLAN_PATH,
  FOUNDATION_WRITE_ROUTES_SPLIT_SCRIPT_PATH,
  FOUNDATION_WRITE_ROUTES_SPLIT_SPRINT_ID,
  buildFoundationWriteRoutesSplitDogfoodProof,
} from '../lib/foundation-write-routes.js'
import {
  AGENT_FEEDBACK_PUBLIC_ROUTE_MARKERS,
  AGENT_FEEDBACK_ROUTES_SPLIT_APPROVAL_PATH,
  AGENT_FEEDBACK_ROUTES_SPLIT_BEFORE_SERVER_LINES,
  AGENT_FEEDBACK_ROUTES_SPLIT_CARD_ID,
  AGENT_FEEDBACK_ROUTES_SPLIT_CLOSEOUT_KEY,
  AGENT_FEEDBACK_ROUTES_SPLIT_PLAN_PATH,
  AGENT_FEEDBACK_ROUTES_SPLIT_SCRIPT_PATH,
  AGENT_FEEDBACK_ROUTES_SPLIT_SPRINT_ID,
  buildAgentFeedbackRoutesSplitDogfoodProof,
} from '../lib/agent-feedback-routes.js'
import {
  buildFoundationVerifyCheckOutput,
  buildFoundationVerifyJsonSummary,
  buildFoundationVerifyReporterDogfoodProof,
} from '../lib/foundation-verify-reporter.js'
import {
  HUB_WORK_CHECK_SCRIPT_PATH,
  HUB_WORK_COORDINATION_APPROVAL_PATH,
  HUB_WORK_COORDINATION_CARD_ID,
  HUB_WORK_COORDINATION_CLOSEOUT_KEY,
  HUB_WORK_COORDINATION_PLAN_PATH,
  HUB_WORK_COORDINATION_SPRINT_ID,
  HUB_WORK_HANDOFF_TEMPLATE_PATH,
  HUB_WORK_OWNERSHIP_MATRIX_PATH,
  HUB_WORK_PROMPT_TEMPLATE_PATH,
  HUB_WORK_PROTOCOL_PATH,
  buildHubWorkDogfoodProof,
  loadHubWorkOwnershipMatrix,
} from '../lib/hub-work-check.js'
import {
  SOURCE_OUTAGE_BOUNDARY_APPROVAL_PATH,
  SOURCE_OUTAGE_BOUNDARY_CARD_ID,
  SOURCE_OUTAGE_BOUNDARY_CLOSEOUT_KEY,
  SOURCE_OUTAGE_BOUNDARY_PLAN_PATH,
  SOURCE_OUTAGE_BOUNDARY_SCRIPT_PATH,
  buildSourceOutageBoundaryDogfoodProof,
} from '../lib/source-outage-boundary.js'
import {
  FOUNDATION_FULL_DIAGNOSTICS_BUDGET,
  FOUNDATION_FULL_DIAGNOSTICS_CLOSEOUT_KEY,
  FOUNDATION_FULL_DIAGNOSTICS_PERF_CARD_ID,
  FOUNDATION_FULL_DIAGNOSTICS_SCRIPT_PATH,
  FOUNDATION_HUB_FULL_ROUTE_SPLIT_CARD_ID,
  buildSyntheticFoundationFullDiagnosticsDogfoodProof,
} from '../lib/foundation-hub-full-diagnostics.js'
import {
  buildConnectorUptimeSnapshot,
  CONNECTOR_UPTIME_MONITOR_JOB_KEY,
  FOUNDATION_OPERATING_RELIABILITY_CARD_IDS,
  FOUNDATION_OPERATING_RELIABILITY_CLOSEOUT_KEY,
  FOUNDATION_OPERATING_RELIABILITY_SCRIPT_PATH,
  buildFoundationOperatingReliabilityDogfoodProof,
} from '../lib/connector-uptime-monitor.js'
import {
  FOUNDATION_READY_SAFE_HUB_LANE_CLOSEOUT_KEY,
  FOUNDATION_READY_SAFE_HUB_LANE_SPRINT_ID,
  buildHubConsumerContract,
  buildHubConsumerFixture,
  validateHubConsumerContractPayload,
} from '../lib/hub-consumer-contract.js'
import {
  FOUNDATION_HUB_BACKLOG_CONTRACT_CARD_ID,
  FOUNDATION_HUB_BACKLOG_CONTRACT_CLOSEOUT_KEY,
  FOUNDATION_HUB_BACKLOG_CONTRACT_DEFAULT_ROUTE_BUDGET_BYTES,
  FOUNDATION_HUB_BACKLOG_CONTRACT_SCRIPT_PATH,
  FOUNDATION_HUB_BACKLOG_CONTRACT_SPRINT_ID,
  FOUNDATION_HUB_BACKLOG_CONTRACT_VERSION,
  buildFoundationHubBacklogContractDogfoodProof,
  validateFoundationHubBacklogContract,
} from '../lib/foundation-hub-backlog-contract.js'
import {
  FOUNDATION_BACKLOG_DETAIL_ENDPOINT_CARD_ID,
  FOUNDATION_BACKLOG_DETAIL_ENDPOINT_CLOSEOUT_KEY,
  FOUNDATION_BACKLOG_DETAIL_ENDPOINT_SCRIPT_PATH,
  FOUNDATION_BACKLOG_DETAIL_ENDPOINT_SPRINT_ID,
  FOUNDATION_BACKLOG_DETAIL_ENDPOINT_VERSION,
  buildFoundationBacklogDetailEndpointDogfoodProof,
  validateFoundationBacklogDetailPayload,
} from '../lib/foundation-backlog-detail.js'

import {
  buildPlainEnglishSweepStatus,
  PLAIN_ENGLISH_SWEEP_ARTIFACT_PATH,
  PLAIN_ENGLISH_SWEEP_CARD_ID,
  PLAIN_ENGLISH_SWEEP_CLOSEOUT_KEY,
  PLAIN_ENGLISH_SWEEP_MANUAL_REVIEW_PATH,
} from '../lib/foundation-plain-english.js'
import {
  buildUiMenuLayoutPolishStatus,
  UI_MENU_LAYOUT_POLISH_APPROVAL_PATH,
  UI_MENU_LAYOUT_POLISH_APPROVED_PLAN_PATH,
  UI_MENU_LAYOUT_POLISH_BASELINE_PATH,
  UI_MENU_LAYOUT_POLISH_CARD_ID,
  UI_MENU_LAYOUT_POLISH_CLOSEOUT_KEY,
  UI_MENU_LAYOUT_POLISH_MANUAL_REVIEW_PATH,
} from '../lib/foundation-ui-menu-layout-polish.js'
import {
  buildRecentBuildsBillionDollarUiStatus,
  RECENT_BUILDS_UI_APPROVAL_PATH,
  RECENT_BUILDS_UI_APPROVED_PLAN_PATH,
  RECENT_BUILDS_UI_BASELINE_PATH,
  RECENT_BUILDS_UI_CARD_ID,
  RECENT_BUILDS_UI_CLOSEOUT_KEY,
  RECENT_BUILDS_UI_MANUAL_REVIEW_PATH,
} from '../lib/foundation-recent-builds-ui.js'
import {
  buildChangeLogComprehensiveStatus,
  CHANGE_LOG_COMPREHENSIVE_APPROVAL_PATH,
  CHANGE_LOG_COMPREHENSIVE_APPROVED_PLAN_PATH,
  CHANGE_LOG_COMPREHENSIVE_BASELINE_PATH,
  CHANGE_LOG_COMPREHENSIVE_CARD_ID,
  CHANGE_LOG_COMPREHENSIVE_CLOSEOUT_KEY,
  CHANGE_LOG_COMPREHENSIVE_MANUAL_REVIEW_PATH,
} from '../lib/foundation-change-log.js'
import {
  buildDailyExecSummaryStatus,
  DAILY_EXEC_SUMMARY_APPROVAL_PATH,
  DAILY_EXEC_SUMMARY_APPROVED_PLAN_PATH,
  DAILY_EXEC_SUMMARY_BASELINE_PATH,
  DAILY_EXEC_SUMMARY_CARD_ID,
  DAILY_EXEC_SUMMARY_CLOSEOUT_KEY,
  DAILY_EXEC_SUMMARY_MANUAL_REVIEW_PATH,
} from '../lib/foundation-daily-exec-summary.js'
import {
  buildSourceLifecycleExpansionCheck,
  SOURCE_LIFECYCLE_APPROVAL_PATH,
  SOURCE_LIFECYCLE_APPROVED_PLAN_PATH,
  SOURCE_LIFECYCLE_BASELINE_PATH,
  SOURCE_LIFECYCLE_CARD_ID,
  SOURCE_LIFECYCLE_CLOSEOUT_KEY,
  SOURCE_LIFECYCLE_MANUAL_REVIEW_PATH,
  SOURCE_LIFECYCLE_REQUIRED_TARGET_COUNT,
} from '../lib/source-lifecycle.js'
import {
  SOURCE_LIFECYCLE_ACCEPTED_BLOCKED_SOURCE_IDS,
  SOURCE_LIFECYCLE_COMPLETION_APPROVAL_PATH,
  SOURCE_LIFECYCLE_COMPLETION_CARD_ID,
  SOURCE_LIFECYCLE_COMPLETION_CLOSEOUT_KEY,
  SOURCE_LIFECYCLE_COMPLETION_DOC_PATH,
  SOURCE_LIFECYCLE_COMPLETION_PLAN_PATH,
  SOURCE_LIFECYCLE_COMPLETION_SCRIPT_PATH,
  SOURCE_LIFECYCLE_COMPLETION_SUMMARY_MARKER,
  SOURCE_LIFECYCLE_LOAD_BEARING_SOURCE_IDS,
  buildSourceLifecycleCompletionStatus,
} from '../lib/source-lifecycle-completion.js'
import {
  SOURCE_LIFECYCLE_DYNAMIC_COUNTS_APPROVAL_PATH,
  SOURCE_LIFECYCLE_DYNAMIC_COUNTS_CARD_ID,
  SOURCE_LIFECYCLE_DYNAMIC_COUNTS_CLOSEOUT_KEY,
  SOURCE_LIFECYCLE_DYNAMIC_COUNTS_PLAN_PATH,
  SOURCE_LIFECYCLE_DYNAMIC_COUNTS_SCRIPT_PATH,
  SOURCE_LIFECYCLE_DYNAMIC_COUNTS_SPRINT_ID,
  buildSourceLifecycleDynamicCountsDogfoodProof,
} from '../lib/source-lifecycle-dynamic-counts.js'
import {
  SYNTHESIS_VERIFY_APPROVAL_PATH,
  SYNTHESIS_VERIFY_CARD_ID,
  SYNTHESIS_VERIFY_CLOSEOUT_KEY,
  SYNTHESIS_VERIFY_DOC_PATH,
  SYNTHESIS_VERIFY_PLAN_PATH,
  SYNTHESIS_VERIFY_SCRIPT_PATH,
  SYNTHESIS_VERIFY_SUMMARY_MARKER,
} from '../lib/synthesis-claim-verification.js'
import {
  EXTRACT_RUN_HARDENING_APPROVAL_PATH,
  EXTRACT_RUN_HARDENING_CARD_ID,
  EXTRACT_RUN_HARDENING_CLOSEOUT_KEY,
  EXTRACT_RUN_HARDENING_DOC_PATH,
  EXTRACT_RUN_HARDENING_PLAN_PATH,
  EXTRACT_RUN_HARDENING_SCRIPT_PATH,
  EXTRACT_RUN_HARDENING_SUMMARY_MARKER,
} from '../lib/extraction-run-hardening.js'
import {
  DRIVE_ACCESS_REQUEST_APPROVAL_PATH,
  DRIVE_ACCESS_REQUEST_CARD_ID,
  DRIVE_ACCESS_REQUEST_CLOSEOUT_KEY,
  DRIVE_ACCESS_REQUEST_DOC_PATH,
  DRIVE_ACCESS_REQUEST_PLAN_PATH,
  DRIVE_ACCESS_REQUEST_SCRIPT_PATH,
  DRIVE_ACCESS_REQUEST_SUMMARY_MARKER,
  buildSyntheticDriveAccessPreflightProof,
} from '../lib/drive-access-preflight.js'
import {
  MEETING_VAULT_ACL_CARD_ID,
  MEETING_VAULT_ACL_CLOSEOUT_KEY,
  MEETING_VAULT_ACL_DOC_PATH,
  MEETING_VAULT_ACL_PLAN_PATH,
  MEETING_VAULT_ACL_SCRIPT_PATH,
  MEETING_VAULT_ACL_SUMMARY_MARKER,
  MEETING_VAULT_POLICY_VERSION,
  buildMeetingVaultNoDuplicateGoogleDocProof,
  buildSyntheticMeetingVaultAclProof,
} from '../lib/meeting-vault-acl.js'
import {
  MEETING_VAULT_AUTO_ENFORCEMENT_APPROVAL_PATH,
  MEETING_VAULT_AUTO_ENFORCEMENT_CARD_ID,
  MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY,
  MEETING_VAULT_AUTO_ENFORCEMENT_DOC_PATH,
  MEETING_VAULT_AUTO_ENFORCEMENT_PLAN_PATH,
  MEETING_VAULT_AUTO_ENFORCEMENT_SCRIPT_PATH,
  MEETING_VAULT_AUTO_ENFORCEMENT_SUMMARY_MARKER,
  buildSyntheticMeetingVaultAutoEnforcementProof,
} from '../lib/meeting-vault-auto-enforcement.js'
import {
  FOUNDATION_DONE_TEST_APPROVAL_PATH,
  FOUNDATION_DONE_TEST_CARD_ID,
  FOUNDATION_DONE_TEST_CLOSEOUT_KEY,
  FOUNDATION_DONE_TEST_DOC_PATH,
  FOUNDATION_DONE_TEST_PLAN_PATH,
  FOUNDATION_DONE_TEST_REGISTRY_PATH,
  FOUNDATION_DONE_TEST_SCRIPT_PATH,
  FOUNDATION_DONE_TEST_SUMMARY_MARKER,
  FOUNDATION_READINESS_GATE_CARD_IDS,
  FOUNDATION_READINESS_REQUIRED_LEG_KEYS,
  buildFoundationReadinessStatus,
} from '../lib/foundation-readiness-gates.js'
import {
  SYSTEM_010_APPROVAL_PATH,
  SYSTEM_010_CARD_ID,
  SYSTEM_010_CLOSEOUT_KEY,
  SYSTEM_010_DOC_PATH,
  SYSTEM_010_PLAN_PATH,
  SYSTEM_010_PROCESS_SCRIPT_PATH,
  SYSTEM_010_SUMMARY_MARKER,
} from '../lib/runtime-process-control.js'
import {
  buildFoundationFollowupCardCaptureStatus,
  FOUNDATION_FOLLOWUP_BUILD_ORDER,
  FOUNDATION_FOLLOWUP_CARD_CAPTURE_APPROVAL_PATH,
  FOUNDATION_FOLLOWUP_CARD_CAPTURE_APPROVED_PLAN_PATH,
  FOUNDATION_FOLLOWUP_CARD_CAPTURE_AUDIT_PATH,
  FOUNDATION_FOLLOWUP_CARD_CAPTURE_CARD_ID,
  FOUNDATION_FOLLOWUP_CARD_CAPTURE_CLOSEOUT_KEY,
  FOUNDATION_FOLLOWUP_NON_SCOPE_PHRASES,
  FOUNDATION_SYSTEMS_SERVICE_GROUPS,
} from '../lib/foundation-followup-card-capture.js'
import {
  buildFoundationSystemsServiceGroupingStatus,
  FOUNDATION_SYSTEMS_AGENT_ONBOARDING_GROUPED_SYSTEM_COUNT,
  FOUNDATION_SYSTEMS_APPROVED_GROUPED_SYSTEM_COUNT,
  FOUNDATION_SYSTEMS_BASELINE_GROUPED_SYSTEM_COUNT,
  FOUNDATION_SYSTEMS_SERVICE_GROUPING_APPROVAL_PATH,
  FOUNDATION_SYSTEMS_SERVICE_GROUPING_APPROVED_PLAN_PATH,
  FOUNDATION_SYSTEMS_SERVICE_GROUPING_BASELINE_PATH,
  FOUNDATION_SYSTEMS_SERVICE_GROUPING_CARD_ID,
  FOUNDATION_SYSTEMS_SERVICE_GROUPING_CLOSEOUT_KEY,
  FOUNDATION_SYSTEMS_SERVICE_GROUPING_MANUAL_REVIEW_PATH,
  FOUNDATION_SYSTEMS_SERVICE_GROUPING_NON_SCOPE_PHRASES,
} from '../lib/foundation-systems-service-grouping.js'
import {
  AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID,
  AGENT_ONBOARDING_FEEDBACK_SYSTEM_CLOSEOUT_KEY,
} from '../lib/agent-onboarding-feedback-system.js'
import {
  buildSystemRegistrationSweepStatus,
  SYSTEM_REGISTRATION_AGENT_FEEDBACK_SYSTEM_ID,
  SYSTEM_REGISTRATION_GLS_SYSTEM_ID,
  SYSTEM_REGISTRATION_SHIPPED_SYSTEM_REQUIREMENTS,
  SYSTEM_REGISTRATION_SWEEP_APPROVAL_PATH,
  SYSTEM_REGISTRATION_SWEEP_APPROVED_PLAN_PATH,
  SYSTEM_REGISTRATION_SWEEP_CARD_ID,
  SYSTEM_REGISTRATION_SWEEP_CLOSEOUT_KEY,
  SYSTEM_REGISTRATION_SWEEP_PROOF_PATH,
} from '../lib/system-registration-sweep.js'
import {
  AGENT_FEEDBACK_SEND_CARD_ID,
  AGENT_FEEDBACK_SEND_CLOSEOUT_KEY,
} from '../lib/agent-feedback-send.js'
import {
  AGENT_FEEDBACK_AUTO_SEND_CARD_ID,
  AGENT_FEEDBACK_AUTO_SEND_CLOSEOUT_KEY,
  AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CLOSEOUT_KEY,
} from '../lib/agent-feedback-auto-send.js'
import {
  AGENT_FEEDBACK_PRODUCTION_AUTOSEND_DRY_RUN_CLOSEOUT_KEY,
} from '../lib/agent-feedback-production-autosend-dry-run.js'
import {
  AGENT_FEEDBACK_RESPONSE_NOTIFY_CARD_ID,
  AGENT_FEEDBACK_RESPONSE_NOTIFY_CLOSEOUT_KEY,
} from '../lib/agent-feedback-response-notify.js'
import {
  AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID,
  AGENT_FEEDBACK_LIVE_REMINDERS_CLOSEOUT_KEY,
  AGENT_FEEDBACK_REMINDER_CARD_ID,
  AGENT_FEEDBACK_REMINDER_CLOSEOUT_KEY,
} from '../lib/agent-feedback-reminders.js'
import {
  AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CARD_ID,
  AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CLOSEOUT_KEY,
  AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID,
  AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID,
} from '../lib/agent-feedback-company-email-policy.js'
import {
  AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CLOSEOUT_KEY,
} from '../lib/agent-feedback-steve-full-loop-test.js'
import {
  AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID,
  AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CLOSEOUT_KEY,
} from '../lib/agent-feedback-real-user-submit-repair.js'
import {
  FOUNDATION_VERIFY_HEALTH_REPAIR_CARD_ID,
  FOUNDATION_VERIFY_HEALTH_REPAIR_CLOSEOUT_KEY,
} from '../lib/foundation-verify-health-repair.js'
import {
  buildGitHookInstallStatus,
  buildSyntheticGitHookScopeProof,
  PROTECTED_FOUNDATION_PATH_PATTERNS,
} from '../lib/process-git-hooks.js'
import {
  BACKLOG_STORE_CONCURRENCY_CARD_ID,
  CURRENT_SPRINT_MUTATION_GUARDS_CARD_ID,
  FOUNDATION_DB_INIT_SEED_SPLIT_CARD_ID,
  buildCurrentSprintMutationGuardsDogfoodProof,
  assertFoundationDbReadyForReadOnlyGate,
  buildFoundationDbInitSeedSplitDogfoodProof,
  closeFoundationDb,
  getActionRouterSnapshot,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getBacklogSeedDriftSnapshot,
  getFoundationDbConstraintAudit,
  getIntelligenceAtomSpineSnapshot,
  getIntelligenceJobLedgerSnapshot,
  getIntelligenceRetrievalSnapshot,
  getSynthesisEngineSnapshot,
  getSynthesisFactsSnapshot,
  getSharedCommunicationProcessingProvenanceGaps,
  getStaleSourceCrawlTargetRuns,
  getStaleLlmCalls,
  getLatestDriveAccessPreflightRun,
  getLatestMeetingVaultAclAudit,
  getLatestMeetingVaultAutoEnforcementRun,
  getStrategyGoalTruthSnapshot,
  getStrategyOperatingTruthSnapshot,
  getStrategyPreworkCoverageSnapshot,
} from '../lib/foundation-db.js'
import {
  FOUNDATION_DB_STORE_SPLIT_CARD_ID,
  FOUNDATION_DB_STORE_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_DB_STORE_SPLIT_SCRIPT_PATH,
  buildSyntheticFoundationCurrentSprintStoreSplitProof,
  evaluateFoundationCurrentSprintStoreSplit,
} from '../lib/foundation-current-sprint-store.js'
import {
  buildBacklogStoreConcurrencyDogfoodProof,
} from '../lib/backlog-store-concurrency.js'
import {
  FOUNDATION_BACKLOG_STORE_SPLIT_APPROVAL_PATH,
  FOUNDATION_BACKLOG_STORE_SPLIT_CARD_ID,
  FOUNDATION_BACKLOG_STORE_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_BACKLOG_STORE_SPLIT_PLAN_PATH,
  FOUNDATION_BACKLOG_STORE_SPLIT_SCRIPT_PATH,
  FOUNDATION_BACKLOG_STORE_SPLIT_SPRINT_ID,
  buildFoundationBacklogStoreSplitDogfoodProof,
} from '../lib/foundation-backlog-store.js'
import {
  FOUNDATION_DECISION_STORE_SPLIT_APPROVAL_PATH,
  FOUNDATION_DECISION_STORE_SPLIT_CARD_ID,
  FOUNDATION_DECISION_STORE_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_DECISION_STORE_SPLIT_PLAN_PATH,
  FOUNDATION_DECISION_STORE_SPLIT_SCRIPT_PATH,
  FOUNDATION_DECISION_STORE_SPLIT_SPRINT_ID,
  buildFoundationDecisionStoreSplitDogfoodProof,
} from '../lib/foundation-decision-store.js'
import {
  FOUNDATION_CORE_SEED_SPLIT_APPROVAL_PATH,
  FOUNDATION_CORE_SEED_SPLIT_CARD_ID,
  FOUNDATION_CORE_SEED_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_CORE_SEED_SPLIT_PLAN_PATH,
  FOUNDATION_CORE_SEED_SPLIT_SCRIPT_PATH,
  FOUNDATION_CORE_SEED_SPLIT_SPRINT_ID,
  buildFoundationCoreSeedSplitDogfoodProof,
  evaluateFoundationCoreSeedSplit,
  getFoundationCoreSeedSummary,
} from '../lib/foundation-core-seed.js'
import {
  FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_APPROVAL_PATH,
  FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_CARD_ID,
  FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_PLAN_PATH,
  FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_SCRIPT_PATH,
  FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_SPRINT_ID,
  buildFoundationStrategySourceSnapshotSplitDogfoodProof,
  evaluateFoundationStrategySourceSnapshotSplit,
} from '../lib/foundation-strategy-source-snapshots.js'
import {
  FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_APPROVAL_PATH,
  FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_CARD_ID,
  FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_PLAN_PATH,
  FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_SCRIPT_PATH,
  FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_SPRINT_ID,
  buildFoundationStrategyOperatingTruthSplitDogfoodProof,
  evaluateFoundationStrategyOperatingTruthSplit,
} from '../lib/foundation-strategy-operating-truth.js'
import {
  FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_APPROVAL_PATH,
  FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_CARD_ID,
  FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_PLAN_PATH,
  FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_SCRIPT_PATH,
  FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_SPRINT_ID,
  buildFoundationStrategyGoalTruthSplitDogfoodProof,
  evaluateFoundationStrategyGoalTruthSplit,
} from '../lib/foundation-strategy-goal-truth.js'
import {
  FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_APPROVAL_PATH,
  FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_CARD_ID,
  FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_PLAN_PATH,
  FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_SCRIPT_PATH,
  FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_SPRINT_ID,
  buildFoundationFubLeadSourceStoreSplitDogfoodProof,
  evaluateFoundationFubLeadSourceStoreSplit,
} from '../lib/foundation-fub-lead-source-store.js'
import {
  FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_APPROVAL_PATH,
  FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_CARD_ID,
  FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_PLAN_PATH,
  FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_SCRIPT_PATH,
  FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_SPRINT_ID,
  buildFoundationSharedCommsCoverageSplitDogfoodProof,
  evaluateFoundationSharedCommsCoverageSplit,
} from '../lib/foundation-shared-comms-coverage.js'
import {
  FOUNDATION_SHARED_COMMS_STORE_SPLIT_APPROVAL_PATH,
  FOUNDATION_SHARED_COMMS_STORE_SPLIT_CARD_ID,
  FOUNDATION_SHARED_COMMS_STORE_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_SHARED_COMMS_STORE_SPLIT_PLAN_PATH,
  FOUNDATION_SHARED_COMMS_STORE_SPLIT_SCRIPT_PATH,
  FOUNDATION_SHARED_COMMS_STORE_SPLIT_SPRINT_ID,
  buildFoundationSharedCommsStoreSplitDogfoodProof,
  evaluateFoundationSharedCommsStoreSplit,
} from '../lib/foundation-shared-comms-store.js'
import {
  FOUNDATION_LLM_RUNTIME_STORE_SPLIT_PLAN_PATH,
  FOUNDATION_LLM_RUNTIME_STORE_SPLIT_SCRIPT_PATH,
} from '../lib/foundation-llm-runtime-store.js'
import {
  FOUNDATION_RUNTIME_JOB_STORE_SPLIT_PLAN_PATH,
  FOUNDATION_RUNTIME_JOB_STORE_SPLIT_SCRIPT_PATH,
} from '../lib/foundation-runtime-job-store.js'
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
} from '../lib/foundation-frontend-monolith-split.js'
import { STYLESHEET_MODULE_PATHS, STYLESHEET_MONOLITH_SPLIT_APPROVAL_PATH, STYLESHEET_MONOLITH_SPLIT_CARD_ID, STYLESHEET_MONOLITH_SPLIT_CLOSEOUT_KEY, STYLESHEET_MONOLITH_SPLIT_PLAN_PATH, STYLESHEET_MONOLITH_SPLIT_SCRIPT_PATH, STYLESHEET_MONOLITH_SPLIT_SPRINT_ID, buildStylesheetMonolithSplitDogfoodProof, combineImportedStylesheets, evaluateStylesheetMonolithSplit } from '../lib/foundation-stylesheet-monolith-split.js'
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
} from '../lib/foundation-frontend-operations-renderers-split.js'
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
} from '../lib/foundation-frontend-runtime-renderers-split.js'
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
} from '../lib/foundation-frontend-source-lifecycle-renderers-split.js'
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
} from '../lib/foundation-frontend-source-registry-renderers-split.js'
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
} from '../lib/foundation-frontend-fub-lead-source-renderers-split.js'
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
} from '../lib/foundation-frontend-system-inventory-renderers-split.js'
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
} from '../lib/foundation-frontend-current-state-renderers-split.js'
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
} from '../lib/foundation-frontend-decision-question-renderers-split.js'
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
} from '../lib/foundation-frontend-split-verifier.js'
import {
  FOUNDATION_CURRENT_SPRINT_STAGES,
  FOUNDATION_SPRINT_CADENCE_APPROVAL_PATH,
  FOUNDATION_SPRINT_CADENCE_CARD_ID,
  FOUNDATION_SPRINT_CADENCE_CLOSEOUT_KEY,
  FOUNDATION_SPRINT_CADENCE_DOC_PATH,
  FOUNDATION_SPRINT_CADENCE_PLAN_PATH,
  FOUNDATION_SPRINT_CADENCE_SCRIPT_PATH,
  FOUNDATION_SPRINT_CADENCE_SUMMARY_MARKER,
  CURRENT_SPRINT_DYNAMIC_TRUTH_APPROVAL_PATH,
  CURRENT_SPRINT_DYNAMIC_TRUTH_CARD_ID,
  CURRENT_SPRINT_DYNAMIC_TRUTH_CLOSEOUT_KEY,
  CURRENT_SPRINT_DYNAMIC_TRUTH_PLAN_PATH,
  CURRENT_SPRINT_DYNAMIC_TRUTH_SCRIPT_PATH,
  SPRINT_STAGE_GATE_APPROVAL_PATH,
  SPRINT_STAGE_GATE_CARD_ID,
  SPRINT_STAGE_GATE_CLOSEOUT_KEY,
  SPRINT_STAGE_GATE_PLAN_PATH,
  SPRINT_STAGE_GATE_SCRIPT_PATH,
  FOUNDATION_PLAN_RECONCILE_APPROVAL_PATH,
  FOUNDATION_PLAN_RECONCILE_CARD_ID,
  FOUNDATION_PLAN_RECONCILE_CLOSEOUT_KEY,
  FOUNDATION_PLAN_RECONCILE_PLAN_PATH,
  FOUNDATION_PLAN_RECONCILE_SCRIPT_PATH,
  FOUNDATION_SPRINT_DONE_VELOCITY_FOLLOW_UP_CARD_ID,
  FOUNDATION_SPRINT_EXIT_CRITERIA,
  FOUNDATION_SPRINT_SURFACE_FOLLOW_UP_CARD_ID,
  FOUNDATION_SPRINT_SYSTEM_APPROVAL_PATH,
  FOUNDATION_SPRINT_SYSTEM_CARD_ID,
  FOUNDATION_SPRINT_SYSTEM_CLOSEOUT_KEY,
  FOUNDATION_SPRINT_SYSTEM_DOC_PATH,
  FOUNDATION_SPRINT_SYSTEM_PLAN_PATH,
  FOUNDATION_SPRINT_SYSTEM_SCRIPT_PATH,
  FOUNDATION_SPRINT_SYSTEM_SUMMARY_MARKER,
  REBUILD_PLAN_RECONCILE_APPROVAL_PATH,
  REBUILD_PLAN_RECONCILE_CARD_ID,
  REBUILD_PLAN_RECONCILE_CLOSEOUT_KEY,
  REBUILD_PLAN_RECONCILE_PLAN_PATH,
  REBUILD_PLAN_RECONCILE_SCRIPT_PATH,
  PLAN_CRITIC_REPLACEMENT_CARD_ID,
  PLAN_CRITIC_REPLACEMENT_APPROVAL_PATH,
  PLAN_CRITIC_REPLACEMENT_CLOSEOUT_KEY,
  PLAN_CRITIC_REPLACEMENT_PLAN_PATH,
  PLAN_CRITIC_REPLACEMENT_SCRIPT_PATH,
  PLAN_CRITIC_DECISION_TREE_PATH,
  SECURITY_BEHAVIOR_PROOF_CARD_ID,
  VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
  VERIFIER_BEHAVIOR_SWEEP_APPROVAL_PATH,
  VERIFIER_BEHAVIOR_SWEEP_CLOSEOUT_KEY,
  VERIFIER_BEHAVIOR_SWEEP_PLAN_PATH,
  VERIFIER_BEHAVIOR_SWEEP_SCRIPT_PATH,
  STRATEGY_HUB_MEETING_READY_CARD_ID,
  STRATEGY_HUB_MEETING_READY_APPROVAL_PATH,
  STRATEGY_HUB_MEETING_READY_CLOSEOUT_KEY,
  STRATEGY_HUB_MEETING_READY_PLAN_PATH,
  STRATEGY_HUB_MEETING_READY_SCRIPT_PATH,
  AUTO_DEPLOY_ROLLBACK_CARD_ID,
  FOUNDATION_SOURCE_ONCE_OVER_SPRINT_ID,
  BRAND_STACK_CARD_ID,
  TIER_BEHAVIORAL_COMPLETION_CARD_ID,
  MARKETING_SOURCE_MAP_CARD_ID,
  SOURCE_EXTRACTION_COVERAGE_CARD_ID,
  SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
  buildFoundationCurrentSprintStatus,
  buildSyntheticFoundationCurrentSprintProof,
} from '../lib/foundation-current-sprint.js'
import { getFoundationSurfaceMap } from '../lib/foundation-surface-map.js'
import {
  KPI_HEALTH_API_CACHE_CARD_ID,
  KPI_HEALTH_API_CACHE_CLOSEOUT_KEY,
  KPI_HEALTH_API_CACHE_SCRIPT_PATH,
  KPI_HEALTH_FETCH_TIMEOUT_MS,
  buildKpiHealthApiCacheDogfoodProof,
} from '../lib/kpi-health.js'
import {
  buildSyntheticVerifyGateTieringProof,
  VERIFY_GATE_TIERING_CARD_ID,
  VERIFY_GATE_TIERING_CLOSEOUT_KEY,
  VERIFY_GATE_TIERING_FOCUSED_PROOF_COMMAND,
  VERIFY_GATE_TIERING_PLAN_PATH,
  VERIFY_GATE_TIERING_SCRIPT_PATH,
} from '../lib/process-verify-gate-tiering.js'
import {
  buildPlanCriticResultSummary,
  buildSyntheticPlanCriticArchitecturalRulesProof,
  buildSyntheticPlanCriticProof,
  evaluatePlanCriticPlan,
  PLAN_CRITIC_ARCHITECTURAL_RULES_CARD_ID,
  PLAN_CRITIC_ARCHITECTURAL_RULES_CLOSEOUT_KEY,
  PLAN_CRITIC_ARCHITECTURAL_RULES_SCRIPT_PATH,
  PLAN_CRITIC_MIN_PASS_SCORE,
  PLAN_CRITIC_ROOT_VS_PATCH_FINDING_KEY,
  PLAN_CRITIC_SCORING_SCHEMA,
  PLAN_CRITIC_SUMMARY_MARKER,
} from '../lib/process-plan-critic.js'
// Coverage literal for the Plan Critic architectural rules proof: PLAN-CRITIC-ARCHITECTURAL-RULES-001.
import {
  FOUNDATION_HUB_SUMMARY_BUDGET,
  FOUNDATION_PERFORMANCE_CARD_ID,
  FOUNDATION_PERFORMANCE_CLOSEOUT_KEY,
  FOUNDATION_PERFORMANCE_SCRIPT_PATH,
  buildSyntheticFoundationHubBudgetProof,
} from '../lib/foundation-hub-performance.js'
import {
  FOUNDATION_HUB_COMMITTED_BASELINE,
  HUB_PERF_VERIFICATION_REPORT_PATH,
  buildSyntheticFoundationHubPerformanceDogfoodProof,
  evaluateFoundationHubPerformanceMeasurement,
} from '../lib/foundation-hub-performance-verification.js'
import {
  FOUNDATION_BUILD_CLOSEOUT_RECORDS_PATH,
  FOUNDATION_BUILD_LOG_BEHAVIOR_PATH,
  FOUNDATION_BUILD_LOG_MONOLITH_SLICE_CLOSEOUT_KEY,
} from '../lib/foundation-build-log-monolith-slice.js'
import {
  FOUNDATION_BUILD_CLOSEOUT_CONTROL_PLANE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_CARD_ID,
  FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_CLOSEOUT_KEY,
} from '../lib/foundation-build-closeout-registry-split.js'
import {
  RECURRING_DEEP_AUDIT_JOB_KEY,
  buildRecurringDeepAuditContract,
  buildRecurringDeepAuditDogfoodProof,
  evaluateRecurringDeepAuditJob,
} from '../lib/recurring-deep-audit.js'
import {
  buildSyntheticSecurityBehaviorProof,
  SECURITY_BEHAVIOR_PROOF_APPROVAL_PATH,
  SECURITY_BEHAVIOR_PROOF_CLOSEOUT_KEY,
  SECURITY_BEHAVIOR_PROOF_PLAN_PATH,
  SECURITY_BEHAVIOR_PROOF_SCRIPT_PATH,
  SECURITY_BEHAVIOR_PROOF_SUMMARY_MARKER,
} from '../lib/security-behavior-proof.js'
import {
  VERIFIER_BEHAVIOR_SWEEP_MIN_TARGETS,
  VERIFIER_BEHAVIOR_SWEEP_SUMMARY_MARKER,
  buildSyntheticVerifierBehaviorSweepProof,
} from '../lib/verifier-behavior-sweep.js'
import {
  STRATEGY_HUB_MEETING_READY_SUMMARY_MARKER,
  buildSyntheticStrategyHubMeetingReadyProof,
} from '../lib/strategy-hub-meeting-ready.js'
import {
  AVATAR_IMPORT_APPROVAL_PATH,
  AVATAR_IMPORT_CARD_ID,
  AVATAR_IMPORT_CLOSEOUT_KEY,
  AVATAR_IMPORT_PLAN_PATH,
  AVATAR_IMPORT_SCRIPT_PATH,
  AVATAR_IMPORT_SUMMARY_MARKER,
  MARKETING_AVATAR_ATTRACT_SOURCE_PATH,
  MARKETING_AVATAR_EXPECTED_COUNTS,
  MARKETING_AVATAR_OLD_README_PATH,
  MARKETING_AVATAR_REFERENCE_BRIEF_PATH,
  MARKETING_AVATAR_REGISTRY_README_PATH,
  MARKETING_AVATAR_RETAIN_SOURCE_PATH,
  buildMarketingAvatarImportSnapshot,
  buildSyntheticAvatarImportProof,
} from '../lib/marketing-avatar-registry.js'
import {
  AUTO_DEPLOY_ROLLBACK_APPROVAL_PATH,
  AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY,
  AUTO_DEPLOY_ROLLBACK_PLAN_PATH,
  AUTO_DEPLOY_ROLLBACK_RUNNER_PATH,
  AUTO_DEPLOY_ROLLBACK_SCRIPT_PATH,
  AUTO_DEPLOY_ROLLBACK_SUMMARY_MARKER,
  buildSyntheticAutoDeployRollbackProof,
} from '../lib/auto-deploy-rollback.js'
import {
  SOURCE_MATURITY_GRID_APPROVAL_PATH,
  SOURCE_MATURITY_GRID_CARD_ID,
  SOURCE_MATURITY_GRID_CLOSEOUT_KEY,
  SOURCE_MATURITY_GRID_PLAN_PATH,
  SOURCE_MATURITY_GRID_SCRIPT_PATH,
  SOURCE_MATURITY_GRID_SUMMARY_MARKER,
  SOURCE_MATURITY_STAGE_KEYS,
  buildSyntheticSourceMaturityGridProof,
} from '../lib/source-maturity-grid.js'
import {
  ATOM_FLOW_AUTO_DEMOTION_APPROVAL_PATH,
  ATOM_FLOW_AUTO_DEMOTION_CARD_ID,
  ATOM_FLOW_AUTO_DEMOTION_CLOSEOUT_KEY,
  ATOM_FLOW_AUTO_DEMOTION_PLAN_PATH,
  ATOM_FLOW_AUTO_DEMOTION_SCRIPT_PATH,
  buildSyntheticAtomFlowAutoDemotionProof,
} from '../lib/atom-flow-auto-demotion.js'
import {
  EXTRACT_RUN_HARDENING_EXECUTION_APPROVAL_PATH,
  EXTRACT_RUN_HARDENING_EXECUTION_CARD_ID,
  EXTRACT_RUN_HARDENING_EXECUTION_CLOSEOUT_KEY,
  EXTRACT_RUN_HARDENING_EXECUTION_PLAN_PATH,
  EXTRACT_RUN_HARDENING_EXECUTION_SCRIPT_PATH,
  EXTRACTION_RETRY_FAILED_JOB_KEY,
  EXTRACTION_RETRY_FAILED_SCRIPT_PATH,
  buildSyntheticExtractionRetryExecutionProof,
} from '../lib/extraction-run-hardening-execution.js'
import {
  RESEARCH_LANE_PURGE_APPROVAL_PATH,
  RESEARCH_LANE_PURGE_CARD_ID,
  RESEARCH_LANE_PURGE_CLOSEOUT_KEY,
  RESEARCH_LANE_PURGE_PLAN_PATH,
  RESEARCH_LANE_PURGE_REPORT_PATH,
  RESEARCH_LANE_PURGE_SCRIPT_PATH,
  buildResearchLanePurgeSnapshot,
  buildSyntheticResearchLanePurgeProof,
} from '../lib/research-lane-purge.js'
import {
  SOURCE_EXTRACTION_COVERAGE_APPROVAL_PATH,
  SOURCE_EXTRACTION_COVERAGE_CLOSEOUT_KEY,
  SOURCE_EXTRACTION_COVERAGE_PLAN_PATH,
  SOURCE_EXTRACTION_COVERAGE_SCRIPT_PATH,
  SOURCE_EXTRACTION_COVERAGE_STATES,
  SOURCE_EXTRACTION_COVERAGE_SUMMARY_MARKER,
  buildSyntheticSourceExtractionCoverageProof,
} from '../lib/source-extraction-coverage.js'
import {
  CONNECTOR_CREDENTIAL_APPROVAL_PATH,
  CONNECTOR_CREDENTIAL_CARD_ID,
  CONNECTOR_CREDENTIAL_CLOSEOUT_KEY,
  CONNECTOR_CREDENTIAL_PLAN_PATH,
  CONNECTOR_CREDENTIAL_REQUIRED_KEYS,
  CONNECTOR_CREDENTIAL_SCRIPT_PATH,
  assertNoConnectorCredentialSecrets,
  buildConnectorCredentialRegistrySnapshot,
} from '../lib/connector-credential-registry.js'
import {
  LLM_AUTH_AUDIT_APPROVAL_PATH,
  LLM_AUTH_AUDIT_CARD_ID,
  LLM_AUTH_AUDIT_CLOSEOUT_KEY,
  LLM_AUTH_AUDIT_PLAN_PATH,
  LLM_AUTH_AUDIT_SCRIPT_PATH,
  buildLlmAuthAuditStatus,
} from '../lib/llm-auth-audit-proof.js'
import {
  LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_APPROVAL_PATH,
  LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID,
  LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CLOSEOUT_KEY,
  LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_PLAN_PATH,
  LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_SCRIPT_PATH,
} from '../lib/llm-auth-audit-budget-label-clarity.js'
import {
  FOUNDATION_VERIFY_LLM_AUTH_AUDIT_SCRIPT_PATH,
  buildLlmAuthAuditVerifierDogfoodProof,
  evaluateLlmAuthAuditVerifierCheck,
} from '../lib/foundation-verify-llm-auth-audit.js'
import {
  buildClickUpSourceVerifierDogfoodProof,
} from '../lib/clickup-source-verifier.js'
import {
  FOUNDATION_SHIP_PREFLIGHT_SCRIPT_PATH,
  buildFoundationShipPreflightDogfoodProof,
} from '../lib/foundation-ship-preflight.js'
import {
  SOURCE_EXTRACTION_GAP_FOLLOWUP_APPROVAL_PATH,
  SOURCE_EXTRACTION_GAP_FOLLOWUP_CARD_ID,
  SOURCE_EXTRACTION_GAP_FOLLOWUP_CLOSEOUT_KEY,
  SOURCE_EXTRACTION_GAP_FOLLOWUP_PLAN_PATH,
  SOURCE_EXTRACTION_GAP_FOLLOWUP_REPORT_PATH,
  SOURCE_EXTRACTION_GAP_FOLLOWUP_SCRIPT_PATH,
  buildSourceExtractionGapFollowupSnapshot,
  buildSyntheticMissingGapProof,
  findMissingTriageSourceIds,
} from '../lib/source-extraction-gap-followup.js'
import {
  SOURCE_COVERAGE_CLOSEOUT_APPROVAL_PATH,
  SOURCE_COVERAGE_CLOSEOUT_CLOSEOUT_KEY,
  SOURCE_COVERAGE_CLOSEOUT_DECISIONS,
  SOURCE_COVERAGE_CLOSEOUT_PLAN_PATH,
  SOURCE_COVERAGE_CLOSEOUT_SCRIPT_PATH,
  SOURCE_COVERAGE_CLOSEOUT_SUMMARY_MARKER,
  SOURCE_EXTRACT_GAP_FOLLOWUP_CARD_ID,
  SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID,
  buildSyntheticSourceCoverageCloseoutProof,
} from '../lib/source-coverage-closeout.js'
import {
  MARKETING_SOURCE_MAP_APPROVAL_PATH,
  MARKETING_SOURCE_MAP_CLOSEOUT_KEY,
  MARKETING_SOURCE_MAP_NOTE_PATH,
  MARKETING_SOURCE_MAP_PLAN_PATH,
  MARKETING_SOURCE_MAP_SCRIPT_PATH,
  MARKETING_SOURCE_MAP_SUMMARY_MARKER,
  buildSyntheticMarketingSourceMapProof,
} from '../lib/marketing-source-map.js'
import {
  BRAND_STACK_APPROVAL_PATH,
  BRAND_STACK_CLOSEOUT_KEY,
  BRAND_STACK_PLAN_PATH,
  BRAND_STACK_SCRIPT_PATH,
  BRAND_STACK_SUMMARY_MARKER,
  buildSyntheticBrandStackProof,
} from '../lib/brand-stack.js'
import {
  TIER_BEHAVIORAL_COMPLETION_APPROVAL_PATH,
  TIER_BEHAVIORAL_COMPLETION_CLOSEOUT_KEY,
  TIER_BEHAVIORAL_COMPLETION_PLAN_PATH,
  TIER_BEHAVIORAL_COMPLETION_SCRIPT_PATH,
  TIER_BEHAVIORAL_COMPLETION_SUMMARY_MARKER,
  buildSyntheticTierBehavioralCompletionProof,
} from '../lib/tier-behavioral-completion.js'
import {
  VERIFICATION_RUNS_APPROVAL_PATH,
  VERIFICATION_RUNS_CARD_ID,
  VERIFICATION_RUNS_CLOSEOUT_KEY,
  VERIFICATION_RUNS_NEXT_CARD_ID,
  VERIFICATION_RUNS_PLAN_PATH,
  VERIFICATION_RUNS_SCRIPT_PATH,
  VERIFICATION_RUNS_SUMMARY_MARKER,
  buildSyntheticVerificationRunsProof,
} from '../lib/verification-runs.js'
import {
  PER_USER_CHANGELOG_APPROVAL_PATH,
  PER_USER_CHANGELOG_CARD_ID,
  PER_USER_CHANGELOG_CLOSEOUT_KEY,
  PER_USER_CHANGELOG_NEXT_CARD_ID,
  PER_USER_CHANGELOG_PLAN_PATH,
  PER_USER_CHANGELOG_SCRIPT_PATH,
  PER_USER_CHANGELOG_SUMMARY_MARKER,
  buildSyntheticPerUserChangelogProof,
} from '../lib/per-user-changelog.js'
import {
  DECISION_RESTRICTED_QUEUE_APPROVAL_PATH,
  DECISION_RESTRICTED_QUEUE_CARD_ID,
  DECISION_RESTRICTED_QUEUE_CLOSEOUT_KEY,
  DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID,
  DECISION_RESTRICTED_QUEUE_PLAN_PATH,
  DECISION_RESTRICTED_QUEUE_SCRIPT_PATH,
  DECISION_RESTRICTED_QUEUE_SUMMARY_MARKER,
  buildSyntheticDecisionRestrictedQueueProof,
} from '../lib/decision-restricted-queue.js'
import {
  FOUNDATION_UI_COMPLETE_APPROVAL_PATH,
  FOUNDATION_UI_COMPLETE_CARD_ID,
  FOUNDATION_UI_COMPLETE_CLOSEOUT_KEY,
  FOUNDATION_UI_COMPLETE_PLAN_PATH,
  FOUNDATION_UI_COMPLETE_SCRIPT_PATH,
  FOUNDATION_UI_COMPLETE_SUMMARY_MARKER,
  buildSyntheticFoundationUiCompleteProof,
} from '../lib/foundation-ui-complete.js'
import {
  buildDoctrinePropagationStatus,
  buildSyntheticStaleSkillSource,
  DOCTRINE_PROPAGATION_SOURCES,
  evaluateDoctrineSkillSource,
} from '../lib/doctrine-propagation.js'
import { DOC_INVENTORY_CATEGORIES } from '../lib/doc-categorization.js'
import {
  buildDecisionAutoEmitSafetyProof,
  CANONICAL_DECISION_CATEGORIES,
  extractDecisionCandidatesFromText,
  scanDecisionAutoEmitCandidates,
} from '../lib/decision-auto-emit.js'
import {
  buildCardReferenceTrustStatus,
  buildSyntheticPhantomCardReferenceStatus,
} from '../lib/card-reference-trust.js'
import { buildSourceReferenceTrustStatus } from '../lib/source-reference-trust.js'
import {
  buildArchiveRetireStatus,
  buildDocArchiveCleanupStatus,
  buildExceptionCurationStatus,
  buildHitListReconcileStatusFromFile,
  buildResearchCurationStatus,
} from '../lib/phase-d-cleanup.js'
import {
  CLICKUP_SOURCE_VERIFY_SCRIPT_PATH,
  CLICKUP_VERIFY_HEALTH_BOUNDARY_SCRIPT_PATH,
  BUILD_LANE_RELIABILITY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  PARALLEL_BUILDER_WORKTREE_PROTOCOL_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  FOUNDATION_ENGINEERING_FITNESS_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  FOUNDATION_BACKLOG_DETAIL_ENDPOINT_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  FOUNDATION_CLICKUP_VERIFY_HEALTH_BOUNDARY_CLOSEOUT_KEY,
  FOUNDATION_CLICKUP_VERIFY_HEALTH_BOUNDARY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  FOUNDATION_FOLLOWUP_CARD_CAPTURE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  FOUNDATION_FULL_DIAGNOSTICS_PERF_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  FOUNDATION_HUB_BACKLOG_CONTRACT_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  FOUNDATION_HUB_FULL_PAYLOAD_REDUCE_CARD_ID,
  FOUNDATION_HUB_FULL_PAYLOAD_REDUCE_SCRIPT_PATH,
  LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  FOUNDATION_KNOWLEDGE_BASE_COMPILER_DESIGN_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  KNOWLEDGE_BASE_QUALITY_GATE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  FOUNDATION_KB_COMPILER_V1_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  ACTION_ROUTE_REVIEW_INBOX_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  ACTION_ROUTE_PROMOTION_WORKFLOW_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  ACTION_ROUTE_DEDUP_STALENESS_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  BUILD_LANE_FAILURE_TELEMETRY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  SHIP_GATE_WORKER_LIVE_JOB_PAUSE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  AIOS_RUNTIME_PORTABILITY_GATE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  AGENT_STATUS_FRESHNESS_GATE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  FOUNDATION_OPERATING_RELIABILITY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  FOUNDATION_PERFORMANCE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  FOUNDATION_READY_SAFE_HUB_LANE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  FOUNDATION_SHIP_GATE_SPEED_PAYLOAD_CLOSEOUT_KEY,
  FOUNDATION_SHIP_GATE_SPEED_PAYLOAD_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  FOUNDATION_SPRINT_REVIEW_CARD_ID,
  FOUNDATION_SPRINT_REVIEW_DOC_PATH,
  FOUNDATION_SPRINT_REVIEW_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  FOUNDATION_SPRINT_SYSTEM_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  FOUNDATION_SYSTEMS_SERVICE_GROUPING_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  FOUNDATION_VERIFICATION_CLEANUP_CLOSEOUT_KEY,
  FOUNDATION_VERIFICATION_CLEANUP_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  FOUNDATION_VERIFICATION_CLEANUP_SCRIPT_PATH,
  FOUNDATION_VERIFY_PROFILE_SCRIPT_PATH,
  FOUNDATION_VERIFY_TIMING_CARD_ID,
  GATE_RELIABILITY_DIRECT_VERIFIER_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  GATE_RELIABILITY_RECURRING_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  PLAN_CRITIC_ARCHITECTURAL_RULES_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  PROCESS_REPAIR_VERIFIER_SPRINT_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  RECURRING_DEEP_AUDIT_SCRIPT_PATH,
  RUNTIME_SAFETY_HARDENING_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  SALES_GLS_SCOREBOARD_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  SOURCE_CONTRACT_VALIDATION_LAYER_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  SOURCE_OUTAGE_BOUNDARY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
  SYSTEM_REGISTRATION_SWEEP_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
} from '../lib/foundation-verify-coverage-card-ids.js'
import {
  auditDirectModelHostUsage,
  buildFoundationVerifyRuntimeSupportDogfoodProof,
  buildFoundationVerifyTimingProfile,
  getCurrentRepoHead,
  getLaunchAgentStatus,
  line,
  parseFoundationVerifyArgs,
  printFoundationVerifyTimingProfile,
  readRepoFile,
  repoFileExists,
  repoRoot,
  runHealthScript,
  runHealthScriptSafe,
  runHealthScriptWithArgs,
  verifyPrivateMemorySyntheticProbe,
  verifyProcessFoundationShipRefusesMissingArgs,
} from '../lib/foundation-verify-runtime-support.js'
import { loadFoundationVerifyLiveApiSnapshot } from '../lib/foundation-verify-live-api-snapshot.js'

function ensure(checks, condition, check, detail) {
  if (!condition) {
    checks.push({ ok: false, check, detail })
    return
  }
  checks.push({ ok: true, check, detail })
}

function ensureIncludesAll(checks, text, patterns, check, detail) {
  const missing = patterns.filter(pattern => !String(text || '').includes(pattern))
  ensure(
    checks,
    missing.length === 0,
    check,
    missing.length ? `Missing expected text: ${missing.join(', ')}` : detail,
  )
}

function findSourceById(sources, sourceId) {
  return (sources || []).find(source => source.sourceId === sourceId || source.id === sourceId) || null
}

function includesAll(text, patterns) {
  return patterns.every(pattern => text.includes(pattern))
}

async function main() {
  const verifyStartedAt = Date.now()
  const args = parseFoundationVerifyArgs(process.argv.slice(2))
  const baseUrl = typeof args.baseUrl === 'string' ? args.baseUrl : 'http://localhost:3000'
  const profileEnabled = args.profile === true || args.profile === 'true' || process.env.FOUNDATION_VERIFY_PROFILE === '1'
  const failuresOnly = args['failures-only'] === true || args['failures-only'] === 'true' || args.failuresOnly === true || args.failuresOnly === 'true'
  const jsonSummary = args['json-summary'] === true || args['json-summary'] === 'true' || args.jsonSummary === true || args.jsonSummary === 'true'
  const checks = []

  line('Foundation verification')
  line('  Base URL', baseUrl)
  line('  Repo root', repoRoot)

  const currentRepoHead = await getCurrentRepoHead()
  const workerLaunchAgent = await getLaunchAgentStatus('ai.bcrew.foundation-worker')
  const sourceContracts = getSourceContracts()
  const sourceConnectors = getSourceConnectors()
  const connectorCredentialRegistry = buildConnectorCredentialRegistrySnapshot({
    sourceContracts,
    sourceConnectors,
  })
  const connectorCredentialSyntheticSafety = assertNoConnectorCredentialSecrets(
    buildConnectorCredentialRegistrySnapshot({
      env: {
        ...process.env,
        OPENAI_API_KEY: 'FOUNDATION_VERIFY_CONNECTOR_CREDENTIAL_SENTINEL_VALUE',
        CLICKUP_PERSONAL_TOKEN: 'FOUNDATION_VERIFY_CONNECTOR_CREDENTIAL_SENTINEL_VALUE',
        SLACK_BOT_TOKEN: 'FOUNDATION_VERIFY_CONNECTOR_CREDENTIAL_SENTINEL_VALUE',
      },
      now: new Date('2026-05-13T00:00:00.000Z'),
      sourceContracts,
      sourceConnectors,
    }),
    ['FOUNDATION_VERIFY_CONNECTOR_CREDENTIAL_SENTINEL_VALUE'],
  )
  const groupedSourceSystems = getGroupedSourceSystems()
  await assertFoundationDbReadyForReadOnlyGate('foundation:verify')
  const backlogSeedDrift = await getBacklogSeedDriftSnapshot({ limit: 10 })
  const strategyPreworkCoverageSnapshot = await getStrategyPreworkCoverageSnapshot()
  const strategyGoalTruthSnapshot = await getStrategyGoalTruthSnapshot()
  const strategyOperatingTruthSnapshot = await getStrategyOperatingTruthSnapshot()
  const intelligenceJobLedgerSnapshot = await getIntelligenceJobLedgerSnapshot({ limit: 20 })
  const intelligenceAtomSpineSnapshot = await getIntelligenceAtomSpineSnapshot({ limit: 20 })
  const intelligenceRetrievalSnapshot = await getIntelligenceRetrievalSnapshot({ limit: 20 })
  const synthesisFactsSnapshot = await getSynthesisFactsSnapshot({ limit: 20 })
  const synthesisEngineSnapshot = await getSynthesisEngineSnapshot({ limit: 20 })
  const actionRouterSnapshot = await getActionRouterSnapshot({ limit: 40 })
  const verifierSplitBacklogItems = await getBacklogItemsByIds([
    VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_CARD_ID,
    VERIFIER_CORE_GOVERNANCE_ORCHESTRATION_SPLIT_CARD_ID,
    VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_CARD_ID,
    VERIFIER_INTELLIGENCE_SPINE_ORCHESTRATION_SPLIT_CARD_ID,
    VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_CARD_ID,
    VERIFIER_EXTRACTION_RUNTIME_ORCHESTRATION_SPLIT_CARD_ID,
    VERIFIER_SURFACE_TRUST_SPLIT_MODULE_CARD_ID,
    VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_CARD_ID,
    VERIFIER_SOURCE_TRUST_SPLIT_MODULE_CARD_ID,
    VERIFIER_SOURCE_TRUST_ORCHESTRATION_SPLIT_CARD_ID,
    VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_CARD_ID,
    VERIFIER_HUB_SAFETY_SPLIT_MODULE_CARD_ID,
    VERIFIER_PROCESS_HARDENING_SPLIT_MODULE_CARD_ID,
    VERIFIER_PROCESS_TRUST_SPLIT_MODULE_CARD_ID,
    VERIFIER_CANVA_CLIENT_SPLIT_MODULE_CARD_ID,
    VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_CARD_ID,
    VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_CARD_ID,
  ])
  const verifierSplitBacklogItemById = new Map(verifierSplitBacklogItems.map(item => [item.id, item]))
  const dbConstraintAudit = await getFoundationDbConstraintAudit({
    sourceIds: sourceContracts.map(source => source.sourceId || source.id).filter(Boolean),
    limit: 10,
  })

  const sourceRegistry = await readRepoFile('docs/source-registry.md')
  const docsIndexSource = await readRepoFile('docs/INDEX.md')
  const archiveIndexSource = await readRepoFile('docs/_archive/INDEX.md')
  const docsReadmeSource = await readRepoFile('docs/README.md')
  const currentPlan = await readRepoFile('docs/rebuild/current-plan.md')
  const intelligencePipelineSource = await readRepoFile('docs/rebuild/intelligence-pipeline.md')
  const intelligenceSalvageSpecSource = await readRepoFile('docs/specs/2026-04-27-intelligence-spine-old-system-salvage.md')
  const strategyHubManifestSource = await readRepoFile('docs/specs/2026-04-27-strategy-hub-v2-source-to-gap-manifest.md')
  const strategicIntelSpecSource = await readRepoFile('docs/specs/2026-04-28-strategic-intelligence-loop.md')
  const foundationHardCheckpointSource = await readRepoFile('docs/handoffs/2026-04-28-foundation-hard-checkpoint.md')
  const currentState = await readRepoFile('docs/rebuild/current-state.md')
  const fubZahndMiddlewareSource = await readRepoFile('docs/source-notes/fub-zahnd-middleware.md')
  const fubKpiConnectionMapSource = await readRepoFile('docs/source-notes/fub-kpi-deal-connection-map.md')
  const kpiDashboardSource = await readRepoFile('docs/source-notes/kpi-dashboard.md')
  const systemStrategy = await readRepoFile('docs/system-strategy.md')
  const packageSource = await readRepoFile('package.json')
  const packageJson = JSON.parse(packageSource)
  const foundationVerifyRootSource = await readRepoFile('scripts/foundation-verify.mjs')
  const foundationVerifySource = `${foundationVerifyRootSource}\n${await readRepoFile('lib/foundation-verify-coverage-card-ids.js')}\n${await readRepoFile('lib/foundation-verify-runtime-support.js')}`
  const canvaClientSource = await readRepoFile('lib/canva-client.js')
  const canvaClientScriptSource = await readRepoFile(CANVA_CLIENT_SCRIPT_PATH)
  const canvaOauthBootstrapSource = await readRepoFile('scripts/canva-oauth-bootstrap.mjs')
  const canvaClientPlanSource = await readRepoFile(CANVA_CLIENT_PLAN_PATH)
  const foundationCanvaClientVerifierSource = await readRepoFile('lib/foundation-canva-client-verifier.js')
  const llmHubCapacitySource = await readRepoFile('lib/llm-hub-capacity.js')
  const llmCredentialRegistrySource = await readRepoFile('lib/llm-credential-registry.js')
  const verifierCanvaClientSplitScriptSource = await readRepoFile(VERIFIER_CANVA_CLIENT_SPLIT_MODULE_SCRIPT_PATH)
  const verifierCanvaClientSplitPlanSource = await readRepoFile(VERIFIER_CANVA_CLIENT_SPLIT_MODULE_PLAN_PATH)
  const processRepairVerifierSprintScriptSource = await readRepoFile('scripts/process-repair-verifier-sprint-check.mjs')
  const currentSprintDynamicTruthCheckSource = await readRepoFile(CURRENT_SPRINT_DYNAMIC_TRUTH_SCRIPT_PATH)
  const currentSprintDynamicTruthPlanSource = await readRepoFile(CURRENT_SPRINT_DYNAMIC_TRUTH_PLAN_PATH)
  const sprintStageGateCheckSource = await readRepoFile(SPRINT_STAGE_GATE_SCRIPT_PATH)
  const sprintStageGatePlanSource = await readRepoFile(SPRINT_STAGE_GATE_PLAN_PATH)
  const foundationPlanReconcileCheckSource = await readRepoFile(FOUNDATION_PLAN_RECONCILE_SCRIPT_PATH)
  const foundationPlanReconcilePlanSource = await readRepoFile(FOUNDATION_PLAN_RECONCILE_PLAN_PATH)
  const connectorCredentialRegistrySource = await readRepoFile('lib/connector-credential-registry.js')
  const connectorCredentialCheckSource = await readRepoFile(CONNECTOR_CREDENTIAL_SCRIPT_PATH)
  const connectorCredentialPlanSource = await readRepoFile(CONNECTOR_CREDENTIAL_PLAN_PATH)
  const llmAuthAuditProofSource = await readRepoFile('lib/llm-auth-audit-proof.js')
  const llmAuthAuditCheckSource = await readRepoFile(LLM_AUTH_AUDIT_SCRIPT_PATH)
  const llmAuthAuditPlanSource = await readRepoFile(LLM_AUTH_AUDIT_PLAN_PATH)
  const llmAuthBudgetLabelProofSource = await readRepoFile('lib/llm-auth-audit-budget-label-clarity.js')
  const llmAuthBudgetLabelCheckSource = await readRepoFile(LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_SCRIPT_PATH)
  const llmAuthBudgetLabelPlanSource = await readRepoFile(LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_PLAN_PATH)
  const llmAuthAuditVerifierModuleSource = await readRepoFile('lib/foundation-verify-llm-auth-audit.js')
  const llmAuthAuditVerifierCheckSource = await readRepoFile(FOUNDATION_VERIFY_LLM_AUTH_AUDIT_SCRIPT_PATH)
  const foundationShipPreflightSource = await readRepoFile('lib/foundation-ship-preflight.js')
  const foundationShipPreflightScriptSource = await readRepoFile(FOUNDATION_SHIP_PREFLIGHT_SCRIPT_PATH)
  const foundationVerifyProfileScriptSource = await readRepoFile(FOUNDATION_VERIFY_PROFILE_SCRIPT_PATH)
  const clickupSourceVerifierSource = await readRepoFile('lib/clickup-source-verifier.js')
  const clickupSourceVerifyScriptSource = await readRepoFile(CLICKUP_SOURCE_VERIFY_SCRIPT_PATH)
  const clickupVerifyHealthBoundaryScriptSource = await readRepoFile(CLICKUP_VERIFY_HEALTH_BOUNDARY_SCRIPT_PATH)
  const foundationVerifyProfileBudgetSource = await readRepoFile('lib/foundation-verify-profile-budget.js')
  const foundationHubFullPayloadReduceScriptSource = await readRepoFile(FOUNDATION_HUB_FULL_PAYLOAD_REDUCE_SCRIPT_PATH)
  const sourceExtractionGapFollowupSource = await readRepoFile('lib/source-extraction-gap-followup.js')
  const sourceExtractionGapFollowupCheckSource = await readRepoFile(SOURCE_EXTRACTION_GAP_FOLLOWUP_SCRIPT_PATH)
  const sourceExtractionGapFollowupPlanSource = await readRepoFile(SOURCE_EXTRACTION_GAP_FOLLOWUP_PLAN_PATH)
  const sourceExtractionGapFollowupReportSource = await readRepoFile(SOURCE_EXTRACTION_GAP_FOLLOWUP_REPORT_PATH)
  const verifierSprintProofModuleSource = await readRepoFile('lib/foundation-verifier-sprint-proof.js')
  const verifierModularSplitCheckSource = await readRepoFile('scripts/process-verifier-modular-split-check.mjs')
  const processRootVsPatchCheckSource = await readRepoFile('scripts/process-root-vs-patch-check.mjs')
  const processRepairVerifierSprintPlanSource = await readRepoFile('docs/process/process-repair-verifier-independence-2026-05-12-plan.md')
  const sprintProcessRepairPlanSource = await readRepoFile('docs/process/sprint-process-repair-001-plan.md')
  const connectorRoutingProcessRepairSource = await readRepoFile('docs/process/connector-routing-truth-process-repair.md')
  const source021WriterProofCheckSource = await readRepoFile('scripts/process-source-021-writer-proof-check.mjs')
  const securityAccessSource = await readRepoFile('lib/security-access.js')
  const security002ProofCheckSource = await readRepoFile('scripts/process-security-002-check.mjs')
  const security002PlanSource = await readRepoFile('docs/process/security-002-auth-tier-redaction-plan.md')
  const security002ApprovalSource = await readRepoFile('docs/process/approvals/SECURITY-002.json')
  const security002Approval = JSON.parse(security002ApprovalSource)
  const foundationDoneTestRegistrySource = await readRepoFile(FOUNDATION_DONE_TEST_REGISTRY_PATH)
  const foundationDoneTestScriptSource = await readRepoFile(FOUNDATION_DONE_TEST_SCRIPT_PATH)
  const foundationDoneTestPlanSource = await readRepoFile(FOUNDATION_DONE_TEST_PLAN_PATH)
  const foundationDoneTestDocSource = await readRepoFile(FOUNDATION_DONE_TEST_DOC_PATH)
  const foundationDoneTestApprovalSource = await readRepoFile(FOUNDATION_DONE_TEST_APPROVAL_PATH)
  const foundationDoneTestApproval = JSON.parse(foundationDoneTestApprovalSource)
  const system010RuntimeSource = await readRepoFile('lib/runtime-process-control.js')
  const system010ProcessScriptSource = await readRepoFile(SYSTEM_010_PROCESS_SCRIPT_PATH)
  const system010PlanSource = await readRepoFile(SYSTEM_010_PLAN_PATH)
  const system010DocSource = await readRepoFile(SYSTEM_010_DOC_PATH)
  const system010ApprovalSource = await readRepoFile(SYSTEM_010_APPROVAL_PATH)
  const system010Approval = JSON.parse(system010ApprovalSource)
  const sourceLifecycleCompletionRegistrySource = await readRepoFile('lib/source-lifecycle-completion.js')
  const sourceLifecycleCompletionScriptSource = await readRepoFile(SOURCE_LIFECYCLE_COMPLETION_SCRIPT_PATH)
  const sourceLifecycleCompletionPlanSource = await readRepoFile(SOURCE_LIFECYCLE_COMPLETION_PLAN_PATH)
  const sourceLifecycleCompletionDocSource = await readRepoFile(SOURCE_LIFECYCLE_COMPLETION_DOC_PATH)
  const sourceLifecycleCompletionApprovalSource = await readRepoFile(SOURCE_LIFECYCLE_COMPLETION_APPROVAL_PATH)
  const sourceLifecycleCompletionApproval = JSON.parse(sourceLifecycleCompletionApprovalSource)
  const gcalAtomScheduleProofSource = await readRepoFile('scripts/process-gcal-atom-schedule-check.mjs')
  const sourceLifecycleDynamicCountsSource = await readRepoFile('lib/source-lifecycle-dynamic-counts.js')
  const sourceLifecycleDynamicCountsScriptSource = await readRepoFile(SOURCE_LIFECYCLE_DYNAMIC_COUNTS_SCRIPT_PATH)
  const sourceLifecycleDynamicCountsPlanSource = await readRepoFile(SOURCE_LIFECYCLE_DYNAMIC_COUNTS_PLAN_PATH)
  const sourceLifecycleDynamicCountsApprovalSource = await readRepoFile(SOURCE_LIFECYCLE_DYNAMIC_COUNTS_APPROVAL_PATH)
  const sourceLifecycleDynamicCountsApproval = JSON.parse(sourceLifecycleDynamicCountsApprovalSource)
  const synthesisVerifyRegistrySource = await readRepoFile('lib/synthesis-claim-verification.js')
  const synthesisVerifyScriptSource = await readRepoFile(SYNTHESIS_VERIFY_SCRIPT_PATH)
  const synthesisVerifyPlanSource = await readRepoFile(SYNTHESIS_VERIFY_PLAN_PATH)
  const synthesisVerifyDocSource = await readRepoFile(SYNTHESIS_VERIFY_DOC_PATH)
  const synthesisVerifyApprovalSource = await readRepoFile(SYNTHESIS_VERIFY_APPROVAL_PATH)
  const synthesisVerifyApproval = JSON.parse(synthesisVerifyApprovalSource)
  const extractRunHardeningSource = await readRepoFile('lib/extraction-run-hardening.js')
  const extractRunHardeningScriptSource = await readRepoFile(EXTRACT_RUN_HARDENING_SCRIPT_PATH)
  const extractRunHardeningPlanSource = await readRepoFile(EXTRACT_RUN_HARDENING_PLAN_PATH)
  const extractRunHardeningDocSource = await readRepoFile(EXTRACT_RUN_HARDENING_DOC_PATH)
  const extractRunHardeningApprovalSource = await readRepoFile(EXTRACT_RUN_HARDENING_APPROVAL_PATH)
  const extractRunHardeningApproval = JSON.parse(extractRunHardeningApprovalSource)
  const driveAccessPreflightSource = await readRepoFile('lib/drive-access-preflight.js')
  const driveAccessRequestScriptSource = await readRepoFile(DRIVE_ACCESS_REQUEST_SCRIPT_PATH)
  const driveAccessRequestDocSource = await readRepoFile(DRIVE_ACCESS_REQUEST_DOC_PATH)
  const driveAccessRequestPlanSource = await readRepoFile(DRIVE_ACCESS_REQUEST_PLAN_PATH)
  const driveAccessRequestApprovalSource = await readRepoFile(DRIVE_ACCESS_REQUEST_APPROVAL_PATH)
  const driveAccessRequestApproval = JSON.parse(driveAccessRequestApprovalSource)
  const meetingVaultAclSource = await readRepoFile('lib/meeting-vault-acl.js')
  const meetingVaultAclScriptSource = await readRepoFile(MEETING_VAULT_ACL_SCRIPT_PATH)
  const meetingVaultAclDocSource = await readRepoFile(MEETING_VAULT_ACL_DOC_PATH)
  const meetingVaultAclPlanSource = await readRepoFile(MEETING_VAULT_ACL_PLAN_PATH)
  const meetingVaultAutoEnforcementSource = await readRepoFile('lib/meeting-vault-auto-enforcement.js')
  const meetingVaultAutoEnforcementScriptSource = await readRepoFile(MEETING_VAULT_AUTO_ENFORCEMENT_SCRIPT_PATH)
  const meetingVaultAutoEnforcementDocSource = await readRepoFile(MEETING_VAULT_AUTO_ENFORCEMENT_DOC_PATH)
  const meetingVaultAutoEnforcementPlanSource = await readRepoFile(MEETING_VAULT_AUTO_ENFORCEMENT_PLAN_PATH)
  const meetingVaultAutoEnforcementApprovalSource = await readRepoFile(MEETING_VAULT_AUTO_ENFORCEMENT_APPROVAL_PATH)
  const meetingVaultAutoEnforcementApproval = JSON.parse(meetingVaultAutoEnforcementApprovalSource)
  const syncMeetingNotesArchiveSource = await readRepoFile('scripts/sync-meeting-notes-archive.mjs')
  const mirrorMeetingArchiveToDriveSource = await readRepoFile('scripts/mirror-meeting-archive-to-drive.mjs')
  const foundationCurrentSprintSource = await readRepoFile('lib/foundation-current-sprint.js')
  const foundationSprintSystemScriptSource = await readRepoFile(FOUNDATION_SPRINT_SYSTEM_SCRIPT_PATH)
  const foundationSprintSystemPlanSource = await readRepoFile(FOUNDATION_SPRINT_SYSTEM_PLAN_PATH)
  const foundationSprintSystemDocSource = await readRepoFile(FOUNDATION_SPRINT_SYSTEM_DOC_PATH)
  const foundationSprintSystemApprovalSource = await readRepoFile(FOUNDATION_SPRINT_SYSTEM_APPROVAL_PATH)
  const foundationSprintSystemApproval = JSON.parse(foundationSprintSystemApprovalSource)
  const foundationSprintCadenceScriptSource = await readRepoFile(FOUNDATION_SPRINT_CADENCE_SCRIPT_PATH)
  const foundationSprintCadencePlanSource = await readRepoFile(FOUNDATION_SPRINT_CADENCE_PLAN_PATH)
  const foundationSprintCadenceDocSource = await readRepoFile(FOUNDATION_SPRINT_CADENCE_DOC_PATH)
  const foundationSprintCadenceApprovalSource = await readRepoFile(FOUNDATION_SPRINT_CADENCE_APPROVAL_PATH)
  const foundationSprintCadenceApproval = JSON.parse(foundationSprintCadenceApprovalSource)
  const rebuildPlanReconcileScriptSource = await readRepoFile(REBUILD_PLAN_RECONCILE_SCRIPT_PATH)
  const rebuildPlanReconcilePlanSource = await readRepoFile(REBUILD_PLAN_RECONCILE_PLAN_PATH)
  const rebuildPlanReconcileApprovalSource = await readRepoFile(REBUILD_PLAN_RECONCILE_APPROVAL_PATH)
  const rebuildPlanReconcileApproval = JSON.parse(rebuildPlanReconcileApprovalSource)
  const planCriticSource = await readRepoFile('lib/process-plan-critic.js')
  const planCriticScriptSource = await readRepoFile(PLAN_CRITIC_REPLACEMENT_SCRIPT_PATH)
  const planCriticArchitecturalRulesScriptSource = await readRepoFile(PLAN_CRITIC_ARCHITECTURAL_RULES_SCRIPT_PATH)
  const foundationHubPerformanceSource = await readRepoFile('lib/foundation-hub-performance.js')
  const foundationHubFullDiagnosticsSource = await readRepoFile('lib/foundation-hub-full-diagnostics.js')
  const foundationHubFullDiagnosticsScriptSource = await readRepoFile(FOUNDATION_FULL_DIAGNOSTICS_SCRIPT_PATH)
  const foundationHubPerformanceVerificationSource = await readRepoFile('lib/foundation-hub-performance-verification.js')
  const recurringDeepAuditSource = await readRepoFile('lib/recurring-deep-audit.js')
  const nightlyDeepAuditUpgradeSource = await readRepoFile('lib/nightly-deep-audit-upgrade.js')
  const nightlyDeepAuditScriptSource = await readRepoFile(NIGHTLY_DEEP_AUDIT_SCRIPT_PATH)
  const foundationSystemHealthSource = await readRepoFile('lib/foundation-system-health.js')
  const foundationPerformanceScriptSource = await readRepoFile(FOUNDATION_PERFORMANCE_SCRIPT_PATH)
  const recurringDeepAuditScriptSource = await readRepoFile(RECURRING_DEEP_AUDIT_SCRIPT_PATH)
  const foundationVerificationCleanupScriptSource = await readRepoFile(FOUNDATION_VERIFICATION_CLEANUP_SCRIPT_PATH)
  const foundationBuildLogBehaviorSource = await readRepoFile(FOUNDATION_BUILD_LOG_BEHAVIOR_PATH)
  const foundationBuildCloseoutRecordsSource = await readRepoFile(FOUNDATION_BUILD_CLOSEOUT_RECORDS_PATH)
  const foundationBuildCloseoutControlPlaneRecordsSource = await readRepoFile(FOUNDATION_BUILD_CLOSEOUT_CONTROL_PLANE_PATH)
  const foundationBuildCloseoutCleanupRecordsSource = await readRepoFile('lib/foundation-build-closeout-cleanup-records.js')
  const foundationBuildCloseoutOvernightRecordsSource = await readRepoFile('lib/foundation-build-closeout-overnight-records.js')
  const foundationBuildCloseoutTighteningRecordsSource = await readRepoFile('lib/foundation-build-closeout-tightening-records.js')
  const foundationBuildCloseoutRegistryRecordSources = await Promise.all([
    'lib/foundation-build-closeout-action-route-records.js',
    'lib/foundation-build-closeout-agent-feedback-records.js',
    'lib/foundation-build-closeout-build-lane-records.js',
    'lib/foundation-build-closeout-cleanup-records.js',
    'lib/foundation-build-closeout-control-plane-records.js',
    'lib/foundation-build-closeout-control-layer-records.js',
    'lib/foundation-build-closeout-db-process-records.js',
    'lib/foundation-build-closeout-doctrine-cleanup-records.js',
    'lib/foundation-build-closeout-foundation-surface-records.js',
    'lib/foundation-build-closeout-overnight-records.js',
    'lib/foundation-build-closeout-process-gate-records.js',
    'lib/foundation-build-closeout-records.js',
    'lib/foundation-build-closeout-route-frontend-records.js',
    'lib/foundation-build-closeout-size-records.js',
    'lib/foundation-build-closeout-source-once-over-records.js',
    'lib/foundation-build-closeout-source-records.js',
    'lib/foundation-build-closeout-tightening-records.js',
    'lib/foundation-build-closeout-verifier-runtime-records.js',
  ].map(relativePath => readRepoFile(relativePath)))
  const foundationEngineeringFitnessGatesSource = await readRepoFile('lib/foundation-engineering-fitness-gates.js')
  const foundationEngineeringFitnessGatesScriptSource = await readRepoFile('scripts/process-foundation-engineering-fitness-gates-check.mjs')
  const planCriticPlanSource = await readRepoFile(PLAN_CRITIC_REPLACEMENT_PLAN_PATH)
  const planCriticDecisionTreeSource = await readRepoFile(PLAN_CRITIC_DECISION_TREE_PATH)
  const planCriticApprovalSource = await readRepoFile(PLAN_CRITIC_REPLACEMENT_APPROVAL_PATH)
  const planCriticApproval = JSON.parse(planCriticApprovalSource)
  const securityBehaviorProofSource = await readRepoFile('lib/security-behavior-proof.js')
  const securityBehaviorProofScriptSource = await readRepoFile(SECURITY_BEHAVIOR_PROOF_SCRIPT_PATH)
  const securityBehaviorProofPlanSource = await readRepoFile(SECURITY_BEHAVIOR_PROOF_PLAN_PATH)
  const securityBehaviorProofApprovalSource = await readRepoFile(SECURITY_BEHAVIOR_PROOF_APPROVAL_PATH)
  const securityBehaviorProofApproval = JSON.parse(securityBehaviorProofApprovalSource)
  const verifierBehaviorSweepSource = await readRepoFile('lib/verifier-behavior-sweep.js')
  const verifierBehaviorSweepScriptSource = await readRepoFile(VERIFIER_BEHAVIOR_SWEEP_SCRIPT_PATH)
  const verifierBehaviorSweepPlanSource = await readRepoFile(VERIFIER_BEHAVIOR_SWEEP_PLAN_PATH)
  const verifierBehaviorSweepApprovalSource = await readRepoFile(VERIFIER_BEHAVIOR_SWEEP_APPROVAL_PATH)
  const verifierBehaviorSweepApproval = JSON.parse(verifierBehaviorSweepApprovalSource)
  const strategyHubMeetingReadySource = await readRepoFile('lib/strategy-hub-meeting-ready.js')
  const strategyHubMeetingReadyScriptSource = await readRepoFile(STRATEGY_HUB_MEETING_READY_SCRIPT_PATH)
  const strategyHubMeetingReadyPlanSource = await readRepoFile(STRATEGY_HUB_MEETING_READY_PLAN_PATH)
  const strategyHubMeetingReadyApprovalSource = await readRepoFile(STRATEGY_HUB_MEETING_READY_APPROVAL_PATH)
  const strategyHubMeetingReadyApproval = JSON.parse(strategyHubMeetingReadyApprovalSource)
  const avatarImportSource = await readRepoFile('lib/marketing-avatar-registry.js')
  const avatarImportScriptSource = await readRepoFile(AVATAR_IMPORT_SCRIPT_PATH)
  const avatarImportPlanSource = await readRepoFile(AVATAR_IMPORT_PLAN_PATH)
  const avatarImportApprovalSource = await readRepoFile(AVATAR_IMPORT_APPROVAL_PATH)
  const avatarImportApproval = JSON.parse(avatarImportApprovalSource)
  const avatarRegistryReadmeSource = await readRepoFile(MARKETING_AVATAR_REGISTRY_README_PATH)
  const avatarReferenceBriefSource = await readRepoFile(MARKETING_AVATAR_REFERENCE_BRIEF_PATH)
  const avatarRetainSource = await readRepoFile(MARKETING_AVATAR_RETAIN_SOURCE_PATH)
  const avatarAttractSource = await readRepoFile(MARKETING_AVATAR_ATTRACT_SOURCE_PATH)
  const avatarOldReadmeSource = await readRepoFile(MARKETING_AVATAR_OLD_README_PATH)
  const autoDeployRollbackSource = await readRepoFile('lib/auto-deploy-rollback.js')
  const autoDeployRollbackRunnerSource = await readRepoFile(AUTO_DEPLOY_ROLLBACK_RUNNER_PATH)
  const autoDeployRollbackScriptSource = await readRepoFile(AUTO_DEPLOY_ROLLBACK_SCRIPT_PATH)
  const autoDeployRollbackPlanSource = await readRepoFile(AUTO_DEPLOY_ROLLBACK_PLAN_PATH)
  const autoDeployRollbackApprovalSource = await readRepoFile(AUTO_DEPLOY_ROLLBACK_APPROVAL_PATH)
  const autoDeployRollbackApproval = JSON.parse(autoDeployRollbackApprovalSource)
  const sourceMaturityGridSource = await readRepoFile('lib/source-maturity-grid.js')
  const sourceMaturityGridScriptSource = await readRepoFile(SOURCE_MATURITY_GRID_SCRIPT_PATH)
  const sourceMaturityGridPlanSource = await readRepoFile(SOURCE_MATURITY_GRID_PLAN_PATH)
  const sourceMaturityGridApprovalSource = await readRepoFile(SOURCE_MATURITY_GRID_APPROVAL_PATH)
  const sourceMaturityGridApproval = JSON.parse(sourceMaturityGridApprovalSource)
  const atomFlowAutoDemotionSource = await readRepoFile('lib/atom-flow-auto-demotion.js')
  const atomFlowAutoDemotionScriptSource = await readRepoFile(ATOM_FLOW_AUTO_DEMOTION_SCRIPT_PATH)
  const atomFlowAutoDemotionPlanSource = await readRepoFile(ATOM_FLOW_AUTO_DEMOTION_PLAN_PATH)
  const extractRunHardeningExecutionSource = await readRepoFile('lib/extraction-run-hardening-execution.js')
  const extractionRetryFailedScriptSource = await readRepoFile(EXTRACTION_RETRY_FAILED_SCRIPT_PATH)
  const extractRunHardeningExecutionScriptSource = await readRepoFile(EXTRACT_RUN_HARDENING_EXECUTION_SCRIPT_PATH)
  const extractRunHardeningExecutionPlanSource = await readRepoFile(EXTRACT_RUN_HARDENING_EXECUTION_PLAN_PATH)
  const researchLanePurgeSource = await readRepoFile('lib/research-lane-purge.js')
  const researchLanePurgeScriptSource = await readRepoFile(RESEARCH_LANE_PURGE_SCRIPT_PATH)
  const researchLanePurgePlanSource = await readRepoFile(RESEARCH_LANE_PURGE_PLAN_PATH)
  const researchLanePurgeReportSource = await readRepoFile(RESEARCH_LANE_PURGE_REPORT_PATH).catch(() => '')
  const sourceExtractionCoverageSource = await readRepoFile('lib/source-extraction-coverage.js')
  const sourceExtractionCoverageScriptSource = await readRepoFile(SOURCE_EXTRACTION_COVERAGE_SCRIPT_PATH)
  const sourceExtractionCoveragePlanSource = await readRepoFile(SOURCE_EXTRACTION_COVERAGE_PLAN_PATH)
  const sourceExtractionCoverageApprovalSource = await readRepoFile(SOURCE_EXTRACTION_COVERAGE_APPROVAL_PATH)
  const sourceExtractionCoverageApproval = JSON.parse(sourceExtractionCoverageApprovalSource)
  const sourceCoverageCloseoutSource = await readRepoFile('lib/source-coverage-closeout.js')
  const sourceCoverageCloseoutScriptSource = await readRepoFile(SOURCE_COVERAGE_CLOSEOUT_SCRIPT_PATH)
  const sourceCoverageCloseoutPlanSource = await readRepoFile(SOURCE_COVERAGE_CLOSEOUT_PLAN_PATH)
  const sourceCoverageCloseoutApprovalSource = await readRepoFile(SOURCE_COVERAGE_CLOSEOUT_APPROVAL_PATH)
  const sourceCoverageCloseoutApproval = JSON.parse(sourceCoverageCloseoutApprovalSource)
  const sourceConnectorMatrixSource = await readRepoFile('lib/source-connector-matrix.js')
  const marketingSourceMapSource = await readRepoFile('lib/marketing-source-map.js')
  const marketingSourceMapScriptSource = await readRepoFile(MARKETING_SOURCE_MAP_SCRIPT_PATH)
  const marketingSourceMapPlanSource = await readRepoFile(MARKETING_SOURCE_MAP_PLAN_PATH)
  const marketingSourceMapApprovalSource = await readRepoFile(MARKETING_SOURCE_MAP_APPROVAL_PATH)
  const marketingSourceMapApproval = JSON.parse(marketingSourceMapApprovalSource)
  const marketingSourceMapNoteSource = await readRepoFile(MARKETING_SOURCE_MAP_NOTE_PATH)
  const brandStackSource = await readRepoFile('lib/brand-stack.js')
  const brandStackScriptSource = await readRepoFile(BRAND_STACK_SCRIPT_PATH)
  const brandStackPlanSource = await readRepoFile(BRAND_STACK_PLAN_PATH)
  const brandStackApprovalSource = await readRepoFile(BRAND_STACK_APPROVAL_PATH)
  const brandStackApproval = JSON.parse(brandStackApprovalSource)
  const tierBehavioralCompletionSource = await readRepoFile('lib/tier-behavioral-completion.js')
  const tierBehavioralCompletionScriptSource = await readRepoFile(TIER_BEHAVIORAL_COMPLETION_SCRIPT_PATH)
  const tierBehavioralCompletionPlanSource = await readRepoFile(TIER_BEHAVIORAL_COMPLETION_PLAN_PATH)
  const tierBehavioralCompletionApprovalSource = await readRepoFile(TIER_BEHAVIORAL_COMPLETION_APPROVAL_PATH)
  const tierBehavioralCompletionApproval = JSON.parse(tierBehavioralCompletionApprovalSource)
  const verificationRunsSource = await readRepoFile('lib/verification-runs.js')
  const verificationRunsScriptSource = await readRepoFile(VERIFICATION_RUNS_SCRIPT_PATH)
  const verificationRunsPlanSource = await readRepoFile(VERIFICATION_RUNS_PLAN_PATH)
  const verificationRunsApprovalSource = await readRepoFile(VERIFICATION_RUNS_APPROVAL_PATH)
  const verificationRunsApproval = JSON.parse(verificationRunsApprovalSource)
  const perUserChangelogSource = await readRepoFile('lib/per-user-changelog.js')
  const perUserChangelogScriptSource = await readRepoFile(PER_USER_CHANGELOG_SCRIPT_PATH)
  const perUserChangelogPlanSource = await readRepoFile(PER_USER_CHANGELOG_PLAN_PATH)
  const perUserChangelogApprovalSource = await readRepoFile(PER_USER_CHANGELOG_APPROVAL_PATH)
  const perUserChangelogApproval = JSON.parse(perUserChangelogApprovalSource)
  const decisionRestrictedQueueSource = await readRepoFile('lib/decision-restricted-queue.js')
  const decisionRestrictedQueueScriptSource = await readRepoFile(DECISION_RESTRICTED_QUEUE_SCRIPT_PATH)
  const decisionRestrictedQueuePlanSource = await readRepoFile(DECISION_RESTRICTED_QUEUE_PLAN_PATH)
  const decisionRestrictedQueueApprovalSource = await readRepoFile(DECISION_RESTRICTED_QUEUE_APPROVAL_PATH)
  const decisionRestrictedQueueApproval = JSON.parse(decisionRestrictedQueueApprovalSource)
  const foundationUiCompleteSource = await readRepoFile('lib/foundation-ui-complete.js')
  const foundationUiCompleteScriptSource = await readRepoFile(FOUNDATION_UI_COMPLETE_SCRIPT_PATH)
  const foundationUiCompletePlanSource = await readRepoFile(FOUNDATION_UI_COMPLETE_PLAN_PATH)
  const foundationUiCompleteApprovalSource = await readRepoFile(FOUNDATION_UI_COMPLETE_APPROVAL_PATH)
  const foundationUiCompleteApproval = JSON.parse(foundationUiCompleteApprovalSource)
  const marketmastersStrategySource = await readRepoFile('docs/strategy/marketmasters.md')
  const strategicExecutionHtmlSource = await readRepoFile('public/strategic-execution.html')
  const verifyGateTieringSource = await readRepoFile('lib/process-verify-gate-tiering.js')
  const verifyGateTieringScriptSource = await readRepoFile(VERIFY_GATE_TIERING_SCRIPT_PATH)
  const verifyGateTieringPlanSource = await readRepoFile(VERIFY_GATE_TIERING_PLAN_PATH)
  const foundationSprintReviewSource = await readRepoFile(FOUNDATION_SPRINT_REVIEW_DOC_PATH)
  const foundationSprintCaptureSource = await readRepoFile('docs/handoffs/2026-05-10-foundation-sprint-capture.md')
  const verifierExceptionSource = await readRepoFile('docs/process/verifier-exceptions.json')
  const verifierExceptionLedger = JSON.parse(verifierExceptionSource)
  const agentsSource = await readRepoFile('AGENTS.md')
  const usersDoc = await readRepoFile('docs/users/README.md')
  const steveDoc = await readRepoFile('docs/users/steve.md')
  const agentModelDoc = await readRepoFile('docs/agents/README.md')
  const harlanDoc = await readRepoFile('docs/agents/harlan.md')
  const crewbertDoc = await readRepoFile('docs/agents/crewbert.md')
  const personalAgentOnboardingDoc = await readRepoFile('docs/agents/personal-agent-onboarding.md')
  const foundationHtmlSource = await readRepoFile('public/foundation.html')
  const foundationUiSource = await readRepoFile('public/foundation.js')
  const foundationNavConfigSource = await readRepoFile('public/foundation-nav-config.js')
  const foundationDataSource = await readRepoFile('public/foundation-data.js')
  const foundationBacklogRenderersSource = await readRepoFile('public/foundation-backlog-renderers.js')
  const foundationSourceRegistryRenderersSource = await readRepoFile('public/foundation-source-registry-renderers.js')
  const foundationFubLeadSourceRenderersSource = await readRepoFile('public/foundation-fub-lead-source-renderers.js')
  const foundationSystemInventoryRenderersSource = await readRepoFile('public/foundation-system-inventory-renderers.js')
  const foundationCurrentStateRenderersSource = await readRepoFile('public/foundation-current-state-renderers.js')
  const foundationDecisionQuestionRenderersSource = await readRepoFile('public/foundation-decision-question-renderers.js')
  const foundationSourceLifecycleRenderersSource = await readRepoFile('public/foundation-source-lifecycle-renderers.js')
  const foundationRuntimeRenderersSource = await readRepoFile('public/foundation-runtime-renderers.js')
  const foundationOperationsRenderersSource = await readRepoFile('public/foundation-operations-renderers.js')
  const foundationRouterSource = await readRepoFile('public/foundation-router.js')
  const frontendMonolithSplitScriptSource = await readRepoFile(FRONTEND_MONOLITH_SPLIT_SCRIPT_PATH)
  const frontendMonolithSplitPlanSource = await readRepoFile(FRONTEND_MONOLITH_SPLIT_PLAN_PATH)
  const frontendOperationsRenderersSplitScriptSource = await readRepoFile(FRONTEND_OPERATIONS_RENDERERS_SPLIT_SCRIPT_PATH)
  const frontendOperationsRenderersSplitPlanSource = await readRepoFile(FRONTEND_OPERATIONS_RENDERERS_SPLIT_PLAN_PATH)
  const frontendRuntimeRenderersSplitScriptSource = await readRepoFile(FRONTEND_RUNTIME_RENDERERS_SPLIT_SCRIPT_PATH)
  const frontendRuntimeRenderersSplitPlanSource = await readRepoFile(FRONTEND_RUNTIME_RENDERERS_SPLIT_PLAN_PATH)
  const frontendSourceLifecycleRenderersSplitScriptSource = await readRepoFile(FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_SCRIPT_PATH)
  const frontendSourceLifecycleRenderersSplitPlanSource = await readRepoFile(FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_PLAN_PATH)
  const frontendSourceRegistryRenderersSplitScriptSource = await readRepoFile(FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_SCRIPT_PATH)
  const frontendSourceRegistryRenderersSplitPlanSource = await readRepoFile(FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_PLAN_PATH)
  const frontendFubLeadSourceRenderersSplitScriptSource = await readRepoFile(FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_SCRIPT_PATH)
  const frontendFubLeadSourceRenderersSplitPlanSource = await readRepoFile(FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_PLAN_PATH)
  const frontendSystemInventoryRenderersSplitScriptSource = await readRepoFile(FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_SCRIPT_PATH)
  const frontendSystemInventoryRenderersSplitPlanSource = await readRepoFile(FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_PLAN_PATH)
  const frontendCurrentStateRenderersSplitScriptSource = await readRepoFile(FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_SCRIPT_PATH)
  const frontendCurrentStateRenderersSplitPlanSource = await readRepoFile(FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_PLAN_PATH)
  const frontendDecisionQuestionRenderersSplitScriptSource = await readRepoFile(FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_SCRIPT_PATH)
  const frontendDecisionQuestionRenderersSplitPlanSource = await readRepoFile(FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_PLAN_PATH)
  const foundationFrontendSource = [
    foundationNavConfigSource,
    foundationDataSource, await readRepoFile('public/foundation-doc-markdown-renderers.js'),
    foundationUiSource,
    foundationSourceRegistryRenderersSource,
    foundationFubLeadSourceRenderersSource,
    foundationSystemInventoryRenderersSource,
    foundationCurrentStateRenderersSource,
    foundationDecisionQuestionRenderersSource,
    foundationSourceLifecycleRenderersSource,
    foundationRuntimeRenderersSource,
    await readRepoFile('public/foundation-action-route-review-inbox-renderers.js'),
    foundationOperationsRenderersSource, await readRepoFile('public/foundation-home-renderers.js'), await readRepoFile('public/foundation-strategy-renderers.js'),
    foundationRouterSource,
  ].join('\n')
  const foundationStylesRootSource = await readRepoFile('public/styles.css')
  const foundationStylesModuleSources = {}
  for (const modulePath of STYLESHEET_MODULE_PATHS) foundationStylesModuleSources[modulePath] = await readRepoFile(modulePath)
  const foundationStylesSource = combineImportedStylesheets(foundationStylesRootSource, foundationStylesModuleSources) || foundationStylesRootSource
  const foundationWorkflowStylesSource = foundationStylesModuleSources['public/styles-foundation-workflows.css'] || ''
  const salesHtmlSource = await readRepoFile('public/sales.html')
  const salesUiSource = await readRepoFile('public/sales.js')
  const salesHubCheckSource = await readRepoFile('scripts/process-sales-listings-hub-check.mjs')
  const opsHtmlSource = await readRepoFile('public/ops.html')
  const opsUiSource = await readRepoFile('public/ops.js')
  const loginHtmlSource = await readRepoFile('public/login.html')
  const loginUiSource = await readRepoFile('public/login.js')
  const agentFeedbackHtmlSource = await readRepoFile('public/agent-feedback.html')
  const agentFeedbackUiSource = await readRepoFile('public/agent-feedback.js')
  const docUiSource = await readRepoFile('public/doc.js')
  const strategicExecutionUiSource = await readRepoFile('public/strategic-execution.js')
  const strategyExportUiSource = await readRepoFile('public/strategy-export.js')
  const serverSource = await readRepoFile('server.js')
  const appAuthSource = await readRepoFile('lib/app-auth.js')
  const foundationJobsSource = await readRepoFile('lib/foundation-jobs.js')
  const agentFeedbackSource = await readRepoFile('lib/agent-feedback.js')
  const agentFeedbackEmailSource = await readRepoFile('lib/agent-feedback-email.js')
  const agentFeedbackClickUpSource = await readRepoFile('lib/agent-feedback-clickup.js')
  const agentFeedbackSendSource = await readRepoFile('lib/agent-feedback-send.js')
  const agentFeedbackAutoSendSource = await readRepoFile('lib/agent-feedback-auto-send.js')
  const agentFeedbackProductionAutoSendDryRunSource = await readRepoFile('lib/agent-feedback-production-autosend-dry-run.js')
  const agentFeedbackResponseNotifySource = await readRepoFile('lib/agent-feedback-response-notify.js')
  const agentFeedbackReminderSource = await readRepoFile('lib/agent-feedback-reminders.js')
  const agentFeedbackCompanyEmailPolicySource = await readRepoFile('lib/agent-feedback-company-email-policy.js')
  const agentFeedbackSteveFullLoopTestSource = await readRepoFile('lib/agent-feedback-steve-full-loop-test.js')
  const agentFeedbackRealUserSubmitRepairSource = await readRepoFile('lib/agent-feedback-real-user-submit-repair.js')
  const foundationVerifyHealthRepairSource = await readRepoFile('lib/foundation-verify-health-repair.js')
  const agentRosterReviewSource = await readRepoFile('lib/agent-roster-review.js')
  const clickupSource = await readRepoFile('lib/clickup.js')
  const sourceOutageBoundarySource = await readRepoFile('lib/source-outage-boundary.js')
  const sourceOutageBoundaryScriptSource = await readRepoFile(SOURCE_OUTAGE_BOUNDARY_SCRIPT_PATH)
  const sourceOutageBoundaryPlanSource = await readRepoFile(SOURCE_OUTAGE_BOUNDARY_PLAN_PATH)
  const connectorUptimeMonitorSource = await readRepoFile('lib/connector-uptime-monitor.js')
  const foundationOperatingReliabilityScriptSource = await readRepoFile(FOUNDATION_OPERATING_RELIABILITY_SCRIPT_PATH)
  const foundationOperatorRoutesSource = await readRepoFile('lib/foundation-operator-routes.js')
  const foundationBacklogDetailSource = await readRepoFile('lib/foundation-backlog-detail.js')
  const serverRouteSplitScriptSource = await readRepoFile('scripts/process-server-route-split-check.mjs')
  const serverRouteSplitPlanSource = await readRepoFile('docs/process/server-route-split-001-plan.md')
  const foundationSourceRoutesSource = await readRepoFile('lib/foundation-source-routes.js')
  const sourceRouteSplitScriptSource = await readRepoFile('scripts/process-source-route-split-check.mjs')
  const sourceRouteSplitPlanSource = await readRepoFile('docs/process/source-route-split-001-plan.md')
  const foundationBuildIntelRoutesSource = await readRepoFile('lib/foundation-build-intel-routes.js')
  const buildIntelRouteSplitScriptSource = await readRepoFile('scripts/process-build-intel-route-split-check.mjs')
  const buildIntelRouteSplitPlanSource = await readRepoFile('docs/process/build-intel-route-split-001-plan.md')
  const fubSourceRoutesSource = await readRepoFile('lib/fub-source-routes.js')
  const fubSourceRouteSplitScriptSource = await readRepoFile(FUB_SOURCE_ROUTE_SPLIT_SCRIPT_PATH)
  const fubSourceRouteSplitPlanSource = await readRepoFile(FUB_SOURCE_ROUTE_SPLIT_PLAN_PATH)
  const foundationRuntimeReadRoutesSource = await readRepoFile('lib/foundation-runtime-read-routes.js')
  const foundationRuntimeReadRoutesSplitScriptSource = await readRepoFile(FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_SCRIPT_PATH)
  const foundationRuntimeReadRoutesSplitPlanSource = await readRepoFile(FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_PLAN_PATH)
  const appPageRoutesSource = await readRepoFile('lib/app-page-routes.js')
  const appPageRoutesSplitScriptSource = await readRepoFile(APP_PAGE_ROUTES_SPLIT_SCRIPT_PATH)
  const appPageRoutesSplitPlanSource = await readRepoFile(APP_PAGE_ROUTES_SPLIT_PLAN_PATH)
  const authRoutesSource = await readRepoFile('lib/auth-routes.js')
  const authRoutesSplitScriptSource = await readRepoFile(AUTH_ROUTES_SPLIT_SCRIPT_PATH)
  const authRoutesSplitPlanSource = await readRepoFile(AUTH_ROUTES_SPLIT_PLAN_PATH)
  const hubReadRoutesSource = await readRepoFile('lib/hub-read-routes.js')
  const hubReadRoutesSplitScriptSource = await readRepoFile(HUB_READ_ROUTES_SPLIT_SCRIPT_PATH)
  const hubReadRoutesSplitPlanSource = await readRepoFile(HUB_READ_ROUTES_SPLIT_PLAN_PATH)
  const strategySharedCommsRoutesSource = await readRepoFile('lib/strategy-shared-comms-routes.js')
  const strategySharedCommsRoutesSplitScriptSource = await readRepoFile(STRATEGY_SHARED_COMMS_ROUTES_SPLIT_SCRIPT_PATH)
  const strategySharedCommsRoutesSplitPlanSource = await readRepoFile(STRATEGY_SHARED_COMMS_ROUTES_SPLIT_PLAN_PATH)
  const foundationWriteRoutesSource = await readRepoFile('lib/foundation-write-routes.js')
  const foundationWriteRoutesSplitScriptSource = await readRepoFile(FOUNDATION_WRITE_ROUTES_SPLIT_SCRIPT_PATH)
  const foundationWriteRoutesSplitPlanSource = await readRepoFile(FOUNDATION_WRITE_ROUTES_SPLIT_PLAN_PATH)
  const agentFeedbackRoutesSource = await readRepoFile('lib/agent-feedback-routes.js')
  const agentFeedbackRoutesSplitScriptSource = await readRepoFile(AGENT_FEEDBACK_ROUTES_SPLIT_SCRIPT_PATH)
  const agentFeedbackRoutesSplitPlanSource = await readRepoFile(AGENT_FEEDBACK_ROUTES_SPLIT_PLAN_PATH)
  const ownersGovernanceRoutesSource = await readRepoFile('lib/owners-governance-routes.js')
  const salesHubRoutesSource = await readRepoFile('lib/sales-hub-routes.js')
  const foundationServerRouteSplitVerifierSource = await readRepoFile('lib/foundation-server-route-split-verifier.js')
  const verifierServerRouteSplitModuleScriptSource = await readRepoFile(VERIFIER_SERVER_ROUTE_SPLIT_MODULE_SCRIPT_PATH)
  const verifierServerRouteSplitModulePlanSource = await readRepoFile(VERIFIER_SERVER_ROUTE_SPLIT_MODULE_PLAN_PATH)
  const foundationDbSplitVerifierSource = await readRepoFile('lib/foundation-db-split-verifier.js')
  const verifierFoundationDbSplitModuleScriptSource = await readRepoFile(VERIFIER_FOUNDATION_DB_SPLIT_MODULE_SCRIPT_PATH)
  const verifierFoundationDbSplitModulePlanSource = await readRepoFile(VERIFIER_FOUNDATION_DB_SPLIT_MODULE_PLAN_PATH)
  const serverRouteSource = [serverSource, hubReadRoutesSource, strategySharedCommsRoutesSource, foundationWriteRoutesSource, agentFeedbackRoutesSource, ownersGovernanceRoutesSource, salesHubRoutesSource].join('\n')
  const strategySharedCommsRouteSource = [serverSource, strategySharedCommsRoutesSource].join('\n')
  const foundationWriteRouteSource = [serverSource, foundationWriteRoutesSource].join('\n')
  const agentFeedbackRouteSource = [serverSource, agentFeedbackRoutesSource].join('\n')
  const foundationRouteSplitVerifierSource = await readRepoFile('lib/foundation-route-split-verifier.js')
  const verifierRouteSplitModuleScriptSource = await readRepoFile(VERIFIER_ROUTE_SPLIT_MODULE_SCRIPT_PATH)
  const verifierRouteSplitModulePlanSource = await readRepoFile(VERIFIER_ROUTE_SPLIT_MODULE_PLAN_PATH)
  const foundationRecentBuildsVerifierSource = await readRepoFile('lib/foundation-recent-builds-verifier.js')
  const foundationRuntimeReliabilityVerifierSource = await readRepoFile('lib/foundation-runtime-reliability-verifier.js')
  const verifierRuntimeReliabilitySplitScriptSource = await readRepoFile(VERIFIER_RUNTIME_RELIABILITY_SPLIT_SCRIPT_PATH)
  const verifierRuntimeReliabilitySplitPlanSource = await readRepoFile(VERIFIER_RUNTIME_RELIABILITY_SPLIT_PLAN_PATH)
  const foundationWorkerReliabilitySource = await readRepoFile('lib/foundation-worker-reliability.js')
  const runtimeFirstJobsSource = await readRepoFile('lib/runtime-first-jobs.js')
  const runtimeHealthSimplifySource = await readRepoFile('lib/runtime-health-simplify.js')
  const aiosRuntimePortabilityGateSource = await readRepoFile('lib/aios-runtime-portability-gate.js')
  const agentStatusFreshnessGateSource = await readRepoFile('lib/agent-status-freshness-gate.js')
  const runtimeWorkerVerifierCoverageCardId = 'RUNTIME-WORKER-001'
  const runtimeFirstJobsVerifierCoverageCardId = 'RUNTIME-FIRST-JOBS-001'
  const runtimeHealthSimplifyVerifierCoverageCardId = 'RUNTIME-HEALTH-SIMPLIFY-001'
  const aiosRuntimePortabilityVerifierCoverageCardId = 'AIOS-RUNTIME-PORTABILITY-GATE-001'
  const agentStatusFreshnessVerifierCoverageCardId = 'AGENT-STATUS-FRESHNESS-GATE-001'
  const foundationHealthScriptVerifierSource = await readRepoFile('lib/foundation-health-script-verifier.js')
  const foundationSourceContractVerifierSource = await readRepoFile('lib/foundation-source-contract-verifier.js')
  const verifierSourceContractModuleScriptSource = await readRepoFile(VERIFIER_SOURCE_CONTRACT_MODULE_SCRIPT_PATH)
  const verifierSourceContractModulePlanSource = await readRepoFile(VERIFIER_SOURCE_CONTRACT_MODULE_PLAN_PATH)
  const sourceContractRegistryTableSource = await readRepoFile('lib/source-contract-registry-table.js')
  const sourceIdScalarFkMigrationSource = await readRepoFile('lib/source-id-scalar-fk-migration.js')
  const sourceIdArrayProvenanceDesignSource = await readRepoFile('lib/source-id-array-provenance-design.js')
  const foundationSourceTrustVerifierSource = await readRepoFile('lib/foundation-source-trust-verifier.js')
  const verifierSourceTrustSplitModuleScriptSource = await readRepoFile(VERIFIER_SOURCE_TRUST_SPLIT_MODULE_SCRIPT_PATH)
  const verifierSourceTrustSplitModulePlanSource = await readRepoFile(VERIFIER_SOURCE_TRUST_SPLIT_MODULE_PLAN_PATH)
  const foundationCurrentSprintVerifierSource = await readRepoFile('lib/foundation-current-sprint-verifier.js')
  const verifierCurrentSprintSplitModuleScriptSource = await readRepoFile(VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_SCRIPT_PATH)
  const verifierCurrentSprintSplitModulePlanSource = await readRepoFile(VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_PLAN_PATH)
  const foundationIntelligenceAuditVerifierSource = await readRepoFile('lib/foundation-intelligence-audit-verifier.js')
  const verifierIntelligenceAuditSplitModuleScriptSource = await readRepoFile(VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_SCRIPT_PATH)
  const verifierIntelligenceAuditSplitModulePlanSource = await readRepoFile(VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_PLAN_PATH)
  const foundationCoreGovernanceVerifierSource = await readRepoFile('lib/foundation-core-governance-verifier.js')
  const verifierCoreGovernanceSplitModuleScriptSource = await readRepoFile(VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_SCRIPT_PATH)
  const verifierCoreGovernanceSplitModulePlanSource = await readRepoFile(VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_PLAN_PATH)
  const dbConstraintSource = await readRepoFile('lib/db-constraint-hardening.js')
  const sourceIdConstraintContractSource = await readRepoFile('lib/source-id-constraint-contract.js')
  const foundationIntelligenceSpineVerifierSource = await readRepoFile('lib/foundation-intelligence-spine-verifier.js')
  const verifierIntelligenceSpineSplitModuleScriptSource = await readRepoFile(VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_SCRIPT_PATH)
  const verifierIntelligenceSpineSplitModulePlanSource = await readRepoFile(VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_PLAN_PATH)
  const foundationExtractionRuntimeVerifierSource = await readRepoFile('lib/foundation-extraction-runtime-verifier.js')
  const extractionRuntimeReadinessSource = await readRepoFile('lib/extraction-runtime-readiness.js')
  const buildIntelWatchlistSource = await readRepoFile('lib/build-intel-watchlist.js')
  const extractionRuntimeReadinessCheckSource = await readRepoFile(EXTRACTION_RUNTIME_READINESS_SCRIPT_PATH, { optional: true })
  const extractionRuntimeReadinessPlanSource = await readRepoFile(EXTRACTION_RUNTIME_READINESS_PLAN_PATH, { optional: true })
  const extractionRuntimeReadinessCloseoutSource = await readRepoFile(EXTRACTION_RUNTIME_READINESS_CLOSEOUT_PATH, { optional: true })
  const karpathyKbVideoPackSource = await readRepoFile('lib/extractor-queue-karpathy-kb-video-pack.js', { optional: true })
  const karpathyKbVideoPackCheckSource = await readRepoFile(EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_SCRIPT_PATH, { optional: true })
  const karpathyKbVideoPackPlanSource = await readRepoFile(EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_PLAN_PATH, { optional: true })
  const karpathyKbVideoPackCloseoutSource = await readRepoFile(EXTRACTOR_QUEUE_KARPATHY_KB_VIDEO_PACK_CLOSEOUT_PATH, { optional: true })
  const verifierExtractionRuntimeSplitModuleScriptSource = await readRepoFile(VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_SCRIPT_PATH)
  const verifierExtractionRuntimeSplitModulePlanSource = await readRepoFile(VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_PLAN_PATH)
  const crawlRunLedgerSource = await readRepoFile('lib/crawl-run-ledger.js')
  const crawlRunLedgerScriptSource = await readRepoFile(CRAWL_RUN_LEDGER_SCRIPT_PATH)
  const extractRetireSource = await readRepoFile('lib/extract-retire.js')
  const extractRetireScriptSource = await readRepoFile(EXTRACT_RETIRE_SCRIPT_PATH)
  const extractRetirePlanSource = await readRepoFile(EXTRACT_RETIRE_PLAN_PATH)
  const extractRetrySource = await readRepoFile('lib/extract-retry.js')
  const extractRetryScriptSource = await readRepoFile(EXTRACT_RETRY_SCRIPT_PATH)
  const extractRetryPlanSource = await readRepoFile(EXTRACT_RETRY_PLAN_PATH)
  const foundationSurfaceTrustVerifierSource = await readRepoFile('lib/foundation-surface-trust-verifier.js')
  const verifierSurfaceTrustSplitModuleScriptSource = await readRepoFile(VERIFIER_SURFACE_TRUST_SPLIT_MODULE_SCRIPT_PATH)
  const verifierSurfaceTrustSplitModulePlanSource = await readRepoFile(VERIFIER_SURFACE_TRUST_SPLIT_MODULE_PLAN_PATH)
  const foundationVerifierPlanReviewsSource = await readRepoFile('lib/foundation-verifier-plan-reviews.js')
  const foundationVerifierProcessGovernanceSource = await readRepoFile('lib/foundation-verifier-process-governance.js')
  const foundationVerifierReadinessFollowupSource = await readRepoFile('lib/foundation-verifier-readiness-followup.js')
  const foundationVerifierGuardrailCloseoutsSource = await readRepoFile('lib/foundation-verifier-guardrail-closeouts.js')
  const foundationVerifierControlLoopSource = await readRepoFile('lib/foundation-verifier-control-loop.js')
  const foundationVerifierModuleAssuranceSource = await readRepoFile('lib/foundation-verifier-module-assurance.js')
  const foundationVerifierBackendSplitAssuranceSource = await readRepoFile('lib/foundation-verifier-backend-split-assurance.js')
  const foundationVerifierFrontendSplitAssuranceSource = await readRepoFile('lib/foundation-verifier-frontend-split-assurance.js')
  const foundationVerifierPhaseGOperatorCloseoutSource = await readRepoFile('lib/foundation-verifier-phase-g-operator-closeout.js')
  const foundationVerifierReadinessBlockerCloseoutSource = await readRepoFile('lib/foundation-verifier-readiness-blocker-closeout.js')
  const foundationVerifierSprintGateProgressionSource = await readRepoFile('lib/foundation-verifier-sprint-gate-progression.js')
  const foundationVerifierSourceOnceOverProgressionSource = await readRepoFile('lib/foundation-verifier-source-once-over-progression.js')
  const foundationVerifierProcessControlGovernanceSource = await readRepoFile('lib/foundation-verifier-process-control-governance.js')
  const foundationVerifierStructuralAssuranceCoreSource = await readRepoFile('lib/foundation-verifier-structural-assurance-core.js')
  const foundationVerifierFrontendStructuralAssuranceSource = await readRepoFile('lib/foundation-verifier-frontend-structural-assurance.js')
  const foundationVerifierHistoricalSplitCloseoutsSource = await readRepoFile('lib/foundation-verifier-historical-split-closeouts.js')
  const foundationVerifierBuildLogRegistryAssuranceSource = await readRepoFile('lib/foundation-verifier-build-log-registry-assurance.js')
  const foundationVerifierHealthLiveSummarySource = await readRepoFile('lib/foundation-verifier-health-live-summary.js')
  const foundationVerifierFollowupBacklogAssuranceSource = await readRepoFile('lib/foundation-verifier-followup-backlog-assurance.js')
  const foundationVerifierCleanupControlAssuranceSource = await readRepoFile('lib/foundation-verifier-cleanup-control-assurance.js')
  const foundationVerifierOperatorLiveSurfaceAssuranceSource = await readRepoFile('lib/foundation-verifier-operator-live-surface-assurance.js')
  const foundationProcessHardeningVerifierSource = await readRepoFile('lib/foundation-process-hardening-verifier.js')
  const foundationVerifyProcessHardeningRunnerSource = await readRepoFile('lib/foundation-verify-process-hardening-runner.js')
  const parallelBuilderWorktreeProtocolSource = await readRepoFile('lib/parallel-builder-worktree-protocol.js')
  const foundationProcessTrustVerifierSource = await readRepoFile('lib/foundation-process-trust-verifier.js')
  const foundationAgentFeedbackVerifierSource = await readRepoFile('lib/foundation-agent-feedback-verifier.js')
  const foundationVerifySourceWithProcessHardeningModule = `${foundationVerifySource}\n${foundationVerifierProcessGovernanceSource}\n${foundationVerifierReadinessFollowupSource}\n${foundationVerifierGuardrailCloseoutsSource}\n${foundationVerifierControlLoopSource}\n${foundationVerifierModuleAssuranceSource}\n${foundationVerifierBackendSplitAssuranceSource}\n${foundationVerifierFrontendSplitAssuranceSource}\n${foundationVerifierPhaseGOperatorCloseoutSource}\n${foundationVerifierReadinessBlockerCloseoutSource}\n${foundationVerifierSprintGateProgressionSource}\n${foundationProcessHardeningVerifierSource}`
  const foundationFrontendSplitVerifierSource = await readRepoFile('lib/foundation-frontend-split-verifier.js')
  const verifierFrontendSplitModuleScriptSource = await readRepoFile(VERIFIER_FRONTEND_SPLIT_MODULE_SCRIPT_PATH)
  const verifierFrontendSplitModulePlanSource = await readRepoFile(VERIFIER_FRONTEND_SPLIT_MODULE_PLAN_PATH)
  const foundationBacklogStoreSource = await readRepoFile('lib/foundation-backlog-store.js')
  const foundationBacklogStoreScriptSource = await readRepoFile(FOUNDATION_BACKLOG_STORE_SPLIT_SCRIPT_PATH)
  const foundationBacklogStorePlanSource = await readRepoFile(FOUNDATION_BACKLOG_STORE_SPLIT_PLAN_PATH)
  const foundationDecisionStoreSource = await readRepoFile('lib/foundation-decision-store.js')
  const foundationDecisionStoreScriptSource = await readRepoFile(FOUNDATION_DECISION_STORE_SPLIT_SCRIPT_PATH)
  const foundationDecisionStorePlanSource = await readRepoFile(FOUNDATION_DECISION_STORE_SPLIT_PLAN_PATH)
  const foundationCoreSeedSource = await readRepoFile('lib/foundation-core-seed.js')
  const foundationCoreSeedScriptSource = await readRepoFile(FOUNDATION_CORE_SEED_SPLIT_SCRIPT_PATH)
  const foundationCoreSeedPlanSource = await readRepoFile(FOUNDATION_CORE_SEED_SPLIT_PLAN_PATH)
  const foundationStrategySourceSnapshotSource = await readRepoFile('lib/foundation-strategy-source-snapshots.js')
  const foundationStrategySourceSnapshotScriptSource = await readRepoFile(FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_SCRIPT_PATH)
  const foundationStrategySourceSnapshotPlanSource = await readRepoFile(FOUNDATION_STRATEGY_SOURCE_SNAPSHOT_SPLIT_PLAN_PATH)
  const foundationStrategyOperatingTruthSource = await readRepoFile('lib/foundation-strategy-operating-truth.js')
  const foundationStrategyOperatingTruthScriptSource = await readRepoFile(FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_SCRIPT_PATH)
  const foundationStrategyOperatingTruthPlanSource = await readRepoFile(FOUNDATION_STRATEGY_OPERATING_TRUTH_SPLIT_PLAN_PATH)
  const foundationStrategyGoalTruthSource = await readRepoFile('lib/foundation-strategy-goal-truth.js')
  const foundationStrategyGoalTruthScriptSource = await readRepoFile(FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_SCRIPT_PATH)
  const foundationStrategyGoalTruthPlanSource = await readRepoFile(FOUNDATION_STRATEGY_GOAL_TRUTH_SPLIT_PLAN_PATH)
  const foundationFubLeadSourceStoreSource = await readRepoFile('lib/foundation-fub-lead-source-store.js')
  const foundationFubLeadSourceStoreScriptSource = await readRepoFile(FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_SCRIPT_PATH)
  const foundationFubLeadSourceStorePlanSource = await readRepoFile(FOUNDATION_FUB_LEAD_SOURCE_STORE_SPLIT_PLAN_PATH)
  const foundationSharedCommsCoverageSource = await readRepoFile('lib/foundation-shared-comms-coverage.js')
  const foundationSharedCommsCoverageScriptSource = await readRepoFile(FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_SCRIPT_PATH)
  const foundationSharedCommsCoveragePlanSource = await readRepoFile(FOUNDATION_SHARED_COMMS_COVERAGE_SPLIT_PLAN_PATH)
  const foundationSharedCommsStoreSource = await readRepoFile('lib/foundation-shared-comms-store.js')
  const foundationSharedCommsStoreScriptSource = await readRepoFile(FOUNDATION_SHARED_COMMS_STORE_SPLIT_SCRIPT_PATH)
  const foundationSharedCommsStorePlanSource = await readRepoFile(FOUNDATION_SHARED_COMMS_STORE_SPLIT_PLAN_PATH)
  const foundationLlmRuntimeStoreSource = await readRepoFile('lib/foundation-llm-runtime-store.js')
  const foundationLlmRuntimeStoreScriptSource = await readRepoFile(FOUNDATION_LLM_RUNTIME_STORE_SPLIT_SCRIPT_PATH)
  const foundationLlmRuntimeStorePlanSource = await readRepoFile(FOUNDATION_LLM_RUNTIME_STORE_SPLIT_PLAN_PATH)
  const foundationRuntimeJobStoreSource = await readRepoFile('lib/foundation-runtime-job-store.js')
  const foundationRuntimeJobStoreScriptSource = await readRepoFile(FOUNDATION_RUNTIME_JOB_STORE_SPLIT_SCRIPT_PATH)
  const foundationRuntimeJobStorePlanSource = await readRepoFile(FOUNDATION_RUNTIME_JOB_STORE_SPLIT_PLAN_PATH)
  const foundationSourceCrawlStoreSource = await readRepoFile('lib/foundation-source-crawl-store.js')
  const foundationSourceCrawlStoreScriptSource = await readRepoFile(FOUNDATION_SOURCE_CRAWL_STORE_SPLIT_SCRIPT_PATH)
  const foundationSourceCrawlStorePlanSource = await readRepoFile(FOUNDATION_SOURCE_CRAWL_STORE_SPLIT_PLAN_PATH)
  const foundationDriveMeetingVaultStoreSource = await readRepoFile('lib/foundation-drive-meeting-vault-store.js')
  const foundationDriveMeetingVaultStoreScriptSource = await readRepoFile(FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_SCRIPT_PATH)
  const foundationDriveMeetingVaultStorePlanSource = await readRepoFile(FOUNDATION_DRIVE_MEETING_VAULT_STORE_SPLIT_PLAN_PATH)
  const foundationAgentFeedbackStoreSource = await readRepoFile('lib/foundation-agent-feedback-store.js')
  const foundationAgentFeedbackStoreScriptSource = await readRepoFile(FOUNDATION_AGENT_FEEDBACK_STORE_SPLIT_SCRIPT_PATH)
  const foundationAgentFeedbackStorePlanSource = await readRepoFile(FOUNDATION_AGENT_FEEDBACK_STORE_SPLIT_PLAN_PATH)
  const foundationSalesListingStoreSource = await readRepoFile('lib/foundation-sales-listing-store.js')
  const foundationSalesListingStoreScriptSource = await readRepoFile(FOUNDATION_SALES_LISTING_STORE_SPLIT_SCRIPT_PATH)
  const foundationSalesListingStorePlanSource = await readRepoFile(FOUNDATION_SALES_LISTING_STORE_SPLIT_PLAN_PATH)
  const googleDelegatedSource = await readRepoFile('lib/google-delegated.js')
  const googleSheetsCacheSource = await readRepoFile('lib/google-sheets-cache.js')
  const llmRouterSource = await readRepoFile('lib/llm-router.js')
  const foundationWorkerSource = await readRepoFile('scripts/foundation-worker.mjs')
  const extractionControlSeedSource = await readRepoFile('scripts/seed-extraction-control.mjs')
  const extractionTargetSource = await readRepoFile('scripts/run-extraction-target.mjs')
  const syncSlackSource = await readRepoFile('scripts/sync-slack-archive.mjs')
  const syncMissiveSource = await readRepoFile('scripts/sync-missive-archive.mjs')
  const videoInventorySource = await readRepoFile('scripts/inventory-video-links.mjs')
  const driveContentExtractionSource = await readRepoFile('scripts/extract-drive-content.mjs')
  const driveLinkInventorySource = await readRepoFile('scripts/inventory-drive-linked-files.mjs')
  const extractionLaneItemShapeAudit = await readRepoFile('docs/audits/2026-04-28-extraction-lane-item-shape.md')
  const devProcessAuditSource = await readRepoFile('docs/audits/2026-04-28-dev-process-audit.md')
  const kpiHealthSource = await readRepoFile('lib/kpi-health.js')
  const kpiHealthScriptSource = await readRepoFile('scripts/kpi-supabase-health.mjs')
  const sourceOfTruthPayloadSource = await readRepoFile('lib/source-of-truth-payload.js')
  const foundationHubSummaryPayloadSource = await readRepoFile('lib/foundation-hub-summary-payload.js')
  const foundationRouteBudgetCleanupScriptSource = await readRepoFile('scripts/process-foundation-route-budget-cleanup-check.mjs')
  const codeQualityNightlyAuditSource = await readRepoFile('lib/code-quality-nightly-audit.js')
  const foundationEndpointBudgetsSource = await readRepoFile('lib/foundation-endpoint-budgets.js')
  const foundationEndpointBudgetsScriptSource = await readRepoFile(FOUNDATION_ENDPOINT_BUDGETS_SCRIPT_PATH)
  const foundationEndpointBudgetsPlanSource = await readRepoFile(FOUNDATION_ENDPOINT_BUDGETS_PLAN_PATH)
  const foundationFrontendAssetBudgetsSource = await readRepoFile('lib/foundation-frontend-asset-budgets.js')
  const foundationFrontendAssetBudgetsScriptSource = await readRepoFile(FOUNDATION_FRONTEND_ASSET_BUDGET_SCRIPT_PATH)
  const foundationFrontendAssetBudgetsPlanSource = await readRepoFile(FOUNDATION_FRONTEND_ASSET_BUDGET_PLAN_PATH)
  const foundationFrontendDomBudgetsSource = await readRepoFile('lib/foundation-frontend-dom-budgets.js')
  const foundationFrontendDomBudgetsScriptSource = await readRepoFile(FOUNDATION_FRONTEND_DOM_BUDGET_SCRIPT_PATH)
  const foundationFrontendDomBudgetsPlanSource = await readRepoFile(FOUNDATION_FRONTEND_DOM_BUDGET_PLAN_PATH)
  const foundationOperatorBudgetVerifierSource = await readRepoFile('lib/foundation-operator-budget-verifier.js')
  const foundationOperatorBudgetVerifierScriptSource = await readRepoFile(VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_SCRIPT_PATH)
  const foundationOperatorBudgetVerifierPlanSource = await readRepoFile(VERIFIER_OPERATOR_BUDGET_SPLIT_MODULE_PLAN_PATH)
  const foundationHubSafetyVerifierSource = await readRepoFile('lib/foundation-hub-safety-verifier.js')
  const foundationHubSafetyVerifierScriptSource = await readRepoFile(VERIFIER_HUB_SAFETY_SPLIT_MODULE_SCRIPT_PATH)
  const foundationHubSafetyVerifierPlanSource = await readRepoFile(VERIFIER_HUB_SAFETY_SPLIT_MODULE_PLAN_PATH)
  const foundationCurrentStateSummarySource = await readRepoFile('lib/foundation-current-state-summary.js')
  const foundationCurrentStateRendererSource = await readRepoFile('public/foundation-current-state-renderers.js')
  const kpiSourceNote = await readRepoFile('docs/source-notes/kpi-dashboard.md')
  const strategyEvidencePacketSource = await readRepoFile('scripts/generate-strategy-evidence-packet.mjs')
  const intelligenceJobProofSource = await readRepoFile('scripts/intelligence-job-ledger-proof.mjs')
  const intelligenceAtomProofSource = await readRepoFile('scripts/intelligence-atom-spine-proof.mjs')
  const intelligenceRetrievalSource = await readRepoFile('lib/intelligence-retrieval.js')
  const intelligenceRetrievalProofSource = await readRepoFile('scripts/intelligence-retrieval-proof.mjs')
  const intelligenceSemanticRetrievalProofSource = await readRepoFile('scripts/intelligence-semantic-retrieval-proof.mjs')
  const intelligenceHybridRetrievalProofSource = await readRepoFile('scripts/intelligence-hybrid-retrieval-proof.mjs')
  const intelligenceRetrievalEvalSource = await readRepoFile('scripts/intelligence-retrieval-eval.mjs')
  const intelligenceRetrievalEvalFixtureSource = await readRepoFile('docs/specs/2026-04-27-intelligence-retrieval-eval-baseline.json')
  const intelligenceRetrievalEvalFixture = JSON.parse(intelligenceRetrievalEvalFixtureSource)
  const intelligenceSynthesisFactsSource = await readRepoFile('lib/intelligence-synthesis-facts.js')
  const intelligenceSynthesisFactsProofSource = await readRepoFile('scripts/intelligence-synthesis-facts-proof.mjs')
  const intelligenceSynthesisSource = await readRepoFile('lib/intelligence-synthesis.js')
  const intelligenceSynthesisProofSource = await readRepoFile('scripts/intelligence-synthesis-engine-proof.mjs')
  const intelligenceActionRouterSource = await readRepoFile('lib/intelligence-action-router.js')
  const intelligenceActionRouterProofSource = await readRepoFile('scripts/intelligence-action-router-proof.mjs')
  const processShipCheckSource = await readRepoFile('scripts/process-ship-check.mjs')
  const processShipCheckDoc = await readRepoFile('docs/process/ship-check.md')
  const processFanoutCheckSource = await readRepoFile('scripts/process-fanout-check.mjs')
  const processFanoutCheckDoc = await readRepoFile('docs/process/ship-fanout.md')
  const foundationStabCaptureCheckSource = await readRepoFile('scripts/process-foundation-stab-capture-check.mjs')
  const foundationCleanupArcCloseoutCheckSource = await readRepoFile('scripts/process-foundation-cleanup-arc-closeout-check.mjs')
  const backlogHygieneScriptSource = await readRepoFile('scripts/backlog-hygiene.mjs')
  const postShipFanoutSource = await readRepoFile('lib/post-ship-fanout.js')
  const postShipFanoutScriptSource = await readRepoFile('scripts/process-post-ship-fanout.mjs')
  const postShipFanoutDoc = await readRepoFile('docs/process/post-ship-fanout.md')
  const processFoundationShipSource = await readRepoFile('scripts/process-foundation-ship.mjs')
  const processFoundationShipDoc = await readRepoFile('docs/process/foundation-ship-gate.md')
  const docCategorizationSource = await readRepoFile('lib/doc-categorization.js')
  const doctrinePropagationSource = await readRepoFile('lib/doctrine-propagation.js')
  const doctrinePropagationScriptSource = await readRepoFile('scripts/doctrine-propagation-check.mjs')
  const doctrinePropagationDoc = await readRepoFile('docs/process/doctrine-propagation.md')
  const decisionAutoEmitSource = await readRepoFile('lib/decision-auto-emit.js')
  const decisionAutoEmitScriptSource = await readRepoFile('scripts/decision-auto-emit.mjs')
  const decisionAutoEmitDoc = await readRepoFile('docs/process/decision-auto-emit.md')
  const gateReliabilitySource = await readRepoFile('lib/foundation-gate-reliability.js')
  const gateReliabilityScriptSource = await readRepoFile('scripts/process-gate-reliability-check.mjs')
  const personalWorkspaceBoundarySource = await readRepoFile('lib/foundation-personal-workspace-boundary.js')
  const personalWorkspaceBoundaryScriptSource = await readRepoFile('scripts/process-personal-workspace-boundary-check.mjs')
  const personalWorkspaceBoundaryDoc = await readRepoFile('docs/process/personal-workspace-boundary.md')
  const ceoDashboardPatternSource = await readRepoFile('lib/foundation-ceo-dashboard-pattern.js')
  const ceoDashboardPatternDoc = await readRepoFile('docs/process/ceo-dashboard-pattern.md')
  const sheetsQuotaHardeningDoc = await readRepoFile('docs/process/sheets-quota-hardening.md')
  const phaseDCleanupSource = await readRepoFile('scripts/phase-d-cleanup.mjs')
  const phaseDCleanupLibSource = await readRepoFile('lib/phase-d-cleanup.js')
  const docArchiveManifestSource = await readRepoFile('docs/process/doc-archive-manifest.json')
  const docArchiveManifest = JSON.parse(docArchiveManifestSource)
  const verifierExceptionCurationSource = await readRepoFile('docs/process/verifier-exception-curation.json')
  const verifierExceptionCuration = JSON.parse(verifierExceptionCurationSource)
  const hitListSnapshotSource = await readRepoFile('docs/process/hit-list-snapshot.json')
  const hitListSnapshot = JSON.parse(hitListSnapshotSource)
  const fullSystemReAuditSource = await readRepoFile('docs/audits/2026-04-29-full-system-re-audit.md')
  const localDocLinkDoc = await readRepoFile('docs/process/local-doc-link.md')
  const docOtherTriageSource = await readRepoFile('docs/process/doc-other-triage.md')
  const rebuildDocRetireManifestSource = await readRepoFile('docs/process/rebuild-doc-retire-manifest.json')
  const rebuildDocRetireManifest = JSON.parse(rebuildDocRetireManifestSource)
  const archiveRetireManifestSource = await readRepoFile('docs/process/archive-retire-manifest.json')
  const archiveRetireManifest = JSON.parse(archiveRetireManifestSource)
  const processHooksApprovalSource = await readRepoFile('docs/process/approvals/PROCESS-HOOKS-001.json')
  const processHooksApproval = JSON.parse(processHooksApprovalSource)
  const processFanoutApprovalSource = await readRepoFile('docs/process/approvals/PROCESS-FANOUT-001.json')
  const processFanoutApproval = JSON.parse(processFanoutApprovalSource)
  const postShipFanoutApprovalSource = await readRepoFile('docs/process/approvals/POST-SHIP-FAN-OUT-001.json')
  const postShipFanoutApproval = JSON.parse(postShipFanoutApprovalSource)
  const workerCodeTrustApprovalSource = await readRepoFile('docs/process/approvals/WORKER-CODE-TRUST-001.json')
  const workerCodeTrustApproval = JSON.parse(workerCodeTrustApprovalSource)
  const verifierDoneCoverageApprovalSource = await readRepoFile('docs/process/approvals/VERIFIER-DONE-COVERAGE-001.json')
  const verifierDoneCoverageApproval = JSON.parse(verifierDoneCoverageApprovalSource)
  const verifierArtifactExistsApprovalSource = await readRepoFile('docs/process/approvals/VERIFIER-ARTIFACT-EXISTS-001.json')
  const verifierArtifactExistsApproval = JSON.parse(verifierArtifactExistsApprovalSource)
  const sheetsQuotaHardeningApprovalSource = await readRepoFile('docs/process/approvals/SHEETS-QUOTA-HARDENING-001.json')
  const sheetsQuotaHardeningApproval = JSON.parse(sheetsQuotaHardeningApprovalSource)
  const doctrinePropagationApprovalSource = await readRepoFile('docs/process/approvals/DOCTRINE-PROPAGATION-001.json')
  const doctrinePropagationApproval = JSON.parse(doctrinePropagationApprovalSource)
  const decisionAutoEmitApprovalSource = await readRepoFile('docs/process/approvals/DECISION-AUTO-EMIT-001.json')
  const decisionAutoEmitApproval = JSON.parse(decisionAutoEmitApprovalSource)
  const docArchiveAutoApprovalSource = await readRepoFile('docs/process/approvals/DOC-ARCHIVE-AUTO-001.json')
  const docArchiveAutoApproval = JSON.parse(docArchiveAutoApprovalSource)
  const researchCurationApprovalSource = await readRepoFile('docs/process/approvals/RESEARCH-CURATION-001.json')
  const researchCurationApproval = JSON.parse(researchCurationApprovalSource)
  const rebuildDocsRetireApprovalSource = await readRepoFile('docs/process/approvals/REBUILD-DOCS-RETIRE-001.json')
  const rebuildDocsRetireApproval = JSON.parse(rebuildDocsRetireApprovalSource)
  const archiveRetireApprovalSource = await readRepoFile('docs/process/approvals/ARCHIVE-RETIRE-001.json')
  const archiveRetireApproval = JSON.parse(archiveRetireApprovalSource)
  const exceptionCurationApprovalSource = await readRepoFile('docs/process/approvals/EXCEPTION-CURATION-001.json')
  const exceptionCurationApproval = JSON.parse(exceptionCurationApprovalSource)
  const hitListReconcileApprovalSource = await readRepoFile('docs/process/approvals/HIT-LIST-RECONCILE-001.json')
  const hitListReconcileApproval = JSON.parse(hitListReconcileApprovalSource)
  const recentBuildsMultiCloseoutApprovalSource = await readRepoFile('docs/process/approvals/RECENT-BUILDS-MULTI-CLOSEOUT-001.json')
  const recentBuildsMultiCloseoutApproval = JSON.parse(recentBuildsMultiCloseoutApprovalSource)
  const fullSystemReAuditApprovalSource = await readRepoFile('docs/process/approvals/FULL-SYSTEM-RE-AUDIT-001.json')
  const fullSystemReAuditApproval = JSON.parse(fullSystemReAuditApprovalSource)
  const localDocLinkApprovalSource = await readRepoFile('docs/process/approvals/LOCAL-DOC-LINK-001.json')
  const localDocLinkApproval = JSON.parse(localDocLinkApprovalSource)
  const docAuthorityIndexRepairApprovalSource = await readRepoFile('docs/process/approvals/DOC-AUTHORITY-INDEX-REPAIR-001.json')
  const docAuthorityIndexRepairApproval = JSON.parse(docAuthorityIndexRepairApprovalSource)
  const docOtherTriageApprovalSource = await readRepoFile('docs/process/approvals/DOC-OTHER-TRIAGE-001.json')
  const docOtherTriageApproval = JSON.parse(docOtherTriageApprovalSource)
  const docCategorizationApprovalSource = await readRepoFile('docs/process/approvals/DOC-CATEGORIZATION-001.json')
  const docCategorizationApproval = JSON.parse(docCategorizationApprovalSource)
  const doctrinePropagationV2ApprovalSource = await readRepoFile('docs/process/approvals/DOCTRINE-PROPAGATION-002.json')
  const doctrinePropagationV2Approval = JSON.parse(doctrinePropagationV2ApprovalSource)
  const processHooksV2ApprovalSource = await readRepoFile('docs/process/approvals/PROCESS-HOOKS-002.json')
  const processHooksV2Approval = JSON.parse(processHooksV2ApprovalSource)
  const gatePerformanceApprovalSource = await readRepoFile('docs/process/approvals/GATE-PERFORMANCE-001.json')
  const gatePerformanceApproval = JSON.parse(gatePerformanceApprovalSource)
  const phase1ApprovalRefs = {
    'APPROVAL-FILE-INTEGRITY-001': 'docs/process/approvals/APPROVAL-FILE-INTEGRITY-001.json',
    'BUILD-LOG-BACKLOG-ID-FIX-001': 'docs/process/approvals/BUILD-LOG-BACKLOG-ID-FIX-001.json',
    'CLOSEOUT-BACKFILL-001': 'docs/process/approvals/CLOSEOUT-BACKFILL-001.json',
    'PRE-COMMIT-HOOK-INSTALL-001': 'docs/process/approvals/PRE-COMMIT-HOOK-INSTALL-001.json',
  }
  const foundationControlApprovalRefs = {
    'GATE-RELIABILITY-001': 'docs/process/approvals/GATE-RELIABILITY-001.json',
    'PERSONAL-WORKSPACE-BOUNDARY-001': 'docs/process/approvals/PERSONAL-WORKSPACE-BOUNDARY-001.json',
    'DOCTRINE-PROPAGATION-003': 'docs/process/approvals/DOCTRINE-PROPAGATION-003.json',
    'DECISION-AUTO-EMIT-002': 'docs/process/approvals/DECISION-AUTO-EMIT-002.json',
    'CEO-DASHBOARD-PATTERN-001': 'docs/process/approvals/CEO-DASHBOARD-PATTERN-001.json',
  }
  const foundation1100ReviewApprovalRefs = Object.fromEntries(
    FOUNDATION_REVIEW_SPRINT_CARD_IDS.map(cardId => [cardId, `docs/process/approvals/${cardId}.json`])
  )
  const plainEnglishSweepApprovalRef = 'docs/process/approvals/PLAIN-ENGLISH-SWEEP-001.json'
  const uiMenuLayoutPolishApprovalRef = UI_MENU_LAYOUT_POLISH_APPROVAL_PATH
  const recentBuildsUiApprovalRef = RECENT_BUILDS_UI_APPROVAL_PATH
  const changeLogComprehensiveApprovalRef = CHANGE_LOG_COMPREHENSIVE_APPROVAL_PATH
  const dailyExecSummaryApprovalRef = DAILY_EXEC_SUMMARY_APPROVAL_PATH
  const sourceLifecycleApprovalRef = SOURCE_LIFECYCLE_APPROVAL_PATH
  const sourceLifecycleCompletionApprovalRef = SOURCE_LIFECYCLE_COMPLETION_APPROVAL_PATH
  const synthesisVerifyApprovalRef = SYNTHESIS_VERIFY_APPROVAL_PATH
  const extractRunHardeningApprovalRef = EXTRACT_RUN_HARDENING_APPROVAL_PATH
  const driveAccessRequestApprovalRef = DRIVE_ACCESS_REQUEST_APPROVAL_PATH
  const foundationDoneTestApprovalRef = FOUNDATION_DONE_TEST_APPROVAL_PATH
  const system010ApprovalRef = SYSTEM_010_APPROVAL_PATH
  const foundationFollowupCardCaptureApprovalRef = FOUNDATION_FOLLOWUP_CARD_CAPTURE_APPROVAL_PATH
  const foundationSystemsServiceGroupingApprovalRef = FOUNDATION_SYSTEMS_SERVICE_GROUPING_APPROVAL_PATH
  const systemRegistrationSweepApprovalRef = SYSTEM_REGISTRATION_SWEEP_APPROVAL_PATH
  const gateReliabilityRecurringApprovalRef = 'docs/process/approvals/GATE-RELIABILITY-002.json'
  const gateReliabilityDirectVerifierApprovalRef = 'docs/process/approvals/GATE-RELIABILITY-003.json'
  const phase1ApprovalValidations = await Promise.all(Object.entries(phase1ApprovalRefs).map(async ([cardId, approvalRef]) =>
    validatePlanApprovalFile({ repoRoot, approvalRef, cardId })
  ))
  const foundationControlApprovalValidations = await Promise.all(Object.entries(foundationControlApprovalRefs).map(async ([cardId, approvalRef]) =>
    validatePlanApprovalFile({ repoRoot, approvalRef, cardId })
  ))
  const foundation1100ReviewApprovalValidations = await Promise.all(Object.entries(foundation1100ReviewApprovalRefs).map(async ([cardId, approvalRef]) =>
    validatePlanApprovalFile({ repoRoot, approvalRef, cardId })
  ))
  const plainEnglishSweepApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: plainEnglishSweepApprovalRef,
    cardId: PLAIN_ENGLISH_SWEEP_CARD_ID,
  })
  const uiMenuLayoutPolishApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: uiMenuLayoutPolishApprovalRef,
    cardId: UI_MENU_LAYOUT_POLISH_CARD_ID,
  })
  const recentBuildsUiApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: recentBuildsUiApprovalRef,
    cardId: RECENT_BUILDS_UI_CARD_ID,
  })
  const changeLogComprehensiveApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: changeLogComprehensiveApprovalRef,
    cardId: CHANGE_LOG_COMPREHENSIVE_CARD_ID,
  })
  const dailyExecSummaryApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: dailyExecSummaryApprovalRef,
    cardId: DAILY_EXEC_SUMMARY_CARD_ID,
  })
  const sourceLifecycleApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: sourceLifecycleApprovalRef,
    cardId: SOURCE_LIFECYCLE_CARD_ID,
  })
  const sourceLifecycleCompletionApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: sourceLifecycleCompletionApprovalRef,
    cardId: SOURCE_LIFECYCLE_COMPLETION_CARD_ID,
  })
  const sourceLifecycleDynamicCountsApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: SOURCE_LIFECYCLE_DYNAMIC_COUNTS_APPROVAL_PATH,
    cardId: SOURCE_LIFECYCLE_DYNAMIC_COUNTS_CARD_ID,
  })
  const synthesisVerifyApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: synthesisVerifyApprovalRef,
    cardId: SYNTHESIS_VERIFY_CARD_ID,
  })
  const extractRunHardeningApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: extractRunHardeningApprovalRef,
    cardId: EXTRACT_RUN_HARDENING_CARD_ID,
  })
  const driveAccessRequestApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: driveAccessRequestApprovalRef,
    cardId: DRIVE_ACCESS_REQUEST_CARD_ID,
  })
  const meetingVaultAutoEnforcementApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: MEETING_VAULT_AUTO_ENFORCEMENT_APPROVAL_PATH,
    cardId: MEETING_VAULT_AUTO_ENFORCEMENT_CARD_ID,
  })
  const foundationSprintSystemApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: FOUNDATION_SPRINT_SYSTEM_APPROVAL_PATH,
    cardId: FOUNDATION_SPRINT_SYSTEM_CARD_ID,
  })
  const foundationSprintCadenceApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: FOUNDATION_SPRINT_CADENCE_APPROVAL_PATH,
    cardId: FOUNDATION_SPRINT_CADENCE_CARD_ID,
  })
  const currentSprintDynamicTruthApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: CURRENT_SPRINT_DYNAMIC_TRUTH_APPROVAL_PATH,
    cardId: CURRENT_SPRINT_DYNAMIC_TRUTH_CARD_ID,
  })
  const sprintStageGateApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: SPRINT_STAGE_GATE_APPROVAL_PATH,
    cardId: SPRINT_STAGE_GATE_CARD_ID,
  })
  const foundationPlanReconcileApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: FOUNDATION_PLAN_RECONCILE_APPROVAL_PATH,
    cardId: FOUNDATION_PLAN_RECONCILE_CARD_ID,
  })
  const connectorCredentialApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: CONNECTOR_CREDENTIAL_APPROVAL_PATH,
    cardId: CONNECTOR_CREDENTIAL_CARD_ID,
  })
  const llmAuthAuditApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: LLM_AUTH_AUDIT_APPROVAL_PATH,
    cardId: LLM_AUTH_AUDIT_CARD_ID,
  })
  const llmAuthBudgetLabelApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_APPROVAL_PATH,
    cardId: LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID,
  })
  const llmAuthAuditJobDefinition = getFoundationJobDefinition('llm-auth-audit') || null
  const sourceExtractionGapFollowupApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: SOURCE_EXTRACTION_GAP_FOLLOWUP_APPROVAL_PATH,
    cardId: SOURCE_EXTRACTION_GAP_FOLLOWUP_CARD_ID,
  })
  const rebuildPlanReconcileApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: REBUILD_PLAN_RECONCILE_APPROVAL_PATH,
    cardId: REBUILD_PLAN_RECONCILE_CARD_ID,
  })
  const planCriticApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: PLAN_CRITIC_REPLACEMENT_APPROVAL_PATH,
    cardId: PLAN_CRITIC_REPLACEMENT_CARD_ID,
  })
  const securityBehaviorProofApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: SECURITY_BEHAVIOR_PROOF_APPROVAL_PATH,
    cardId: SECURITY_BEHAVIOR_PROOF_CARD_ID,
  })
  const verifierBehaviorSweepApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: VERIFIER_BEHAVIOR_SWEEP_APPROVAL_PATH,
    cardId: VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
  })
  const strategyHubMeetingReadyApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: STRATEGY_HUB_MEETING_READY_APPROVAL_PATH,
    cardId: STRATEGY_HUB_MEETING_READY_CARD_ID,
  })
  const avatarImportApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: AVATAR_IMPORT_APPROVAL_PATH,
    cardId: AVATAR_IMPORT_CARD_ID,
  })
  const autoDeployRollbackApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: AUTO_DEPLOY_ROLLBACK_APPROVAL_PATH,
    cardId: AUTO_DEPLOY_ROLLBACK_CARD_ID,
  })
  const sourceMaturityGridApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: SOURCE_MATURITY_GRID_APPROVAL_PATH,
    cardId: SOURCE_MATURITY_GRID_CARD_ID,
  })
  const atomFlowAutoDemotionApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: ATOM_FLOW_AUTO_DEMOTION_APPROVAL_PATH,
    cardId: ATOM_FLOW_AUTO_DEMOTION_CARD_ID,
  })
  const extractRunHardeningExecutionApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: EXTRACT_RUN_HARDENING_EXECUTION_APPROVAL_PATH,
    cardId: EXTRACT_RUN_HARDENING_EXECUTION_CARD_ID,
  })
  const researchLanePurgeApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: RESEARCH_LANE_PURGE_APPROVAL_PATH,
    cardId: RESEARCH_LANE_PURGE_CARD_ID,
  })
  const sourceExtractionCoverageApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: SOURCE_EXTRACTION_COVERAGE_APPROVAL_PATH,
    cardId: SOURCE_EXTRACTION_COVERAGE_CARD_ID,
  })
  const sourceCoverageCloseoutApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: SOURCE_COVERAGE_CLOSEOUT_APPROVAL_PATH,
    cardId: SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
  })
  const marketingSourceMapApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: MARKETING_SOURCE_MAP_APPROVAL_PATH,
    cardId: MARKETING_SOURCE_MAP_CARD_ID,
  })
  const brandStackApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: BRAND_STACK_APPROVAL_PATH,
    cardId: BRAND_STACK_CARD_ID,
  })
  const tierBehavioralCompletionApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: TIER_BEHAVIORAL_COMPLETION_APPROVAL_PATH,
    cardId: TIER_BEHAVIORAL_COMPLETION_CARD_ID,
  })
  const verificationRunsApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: VERIFICATION_RUNS_APPROVAL_PATH,
    cardId: VERIFICATION_RUNS_CARD_ID,
  })
  const perUserChangelogApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: PER_USER_CHANGELOG_APPROVAL_PATH,
    cardId: PER_USER_CHANGELOG_CARD_ID,
  })
  const decisionRestrictedQueueApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: DECISION_RESTRICTED_QUEUE_APPROVAL_PATH,
    cardId: DECISION_RESTRICTED_QUEUE_CARD_ID,
  })
  const foundationUiCompleteApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: FOUNDATION_UI_COMPLETE_APPROVAL_PATH,
    cardId: FOUNDATION_UI_COMPLETE_CARD_ID,
  })
  const foundationDoneTestApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: foundationDoneTestApprovalRef,
    cardId: FOUNDATION_DONE_TEST_CARD_ID,
  })
  const system010ApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: system010ApprovalRef,
    cardId: SYSTEM_010_CARD_ID,
  })
  const foundationFollowupCardCaptureApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: foundationFollowupCardCaptureApprovalRef,
    cardId: FOUNDATION_FOLLOWUP_CARD_CAPTURE_CARD_ID,
  })
  const foundationSystemsServiceGroupingApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: foundationSystemsServiceGroupingApprovalRef,
    cardId: FOUNDATION_SYSTEMS_SERVICE_GROUPING_CARD_ID,
  })
  const systemRegistrationSweepApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: systemRegistrationSweepApprovalRef,
    cardId: SYSTEM_REGISTRATION_SWEEP_CARD_ID,
  })
  const gateReliabilityRecurringApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: gateReliabilityRecurringApprovalRef,
    cardId: 'GATE-RELIABILITY-002',
  })
  const gateReliabilityDirectVerifierApprovalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: gateReliabilityDirectVerifierApprovalRef,
    cardId: 'GATE-RELIABILITY-003',
  })
  const approvalIntegritySynthetic = await buildSyntheticApprovalIntegrityStatus()
  const gitHookInstallStatus = await buildGitHookInstallStatus({ repoRoot })
  const gitHookScopeProof = buildSyntheticGitHookScopeProof()
  const buildLogOwnershipProof = buildSyntheticBuildLogOwnershipProof()
  const phase1ApprovedPlan = await readRepoFile(PHASE_1_ENFORCEMENT_PLAN_REF)
  const foundationControlApprovedPlan = await readRepoFile('docs/process/approved-plans/foundation-control-layer-v1.md')
  const foundation1100ReviewApprovedPlan = await readRepoFile('docs/process/approved-plans/foundation-1100-review-v1.md')
  const plainEnglishSweepApprovedPlan = await readRepoFile('docs/process/approved-plans/plain-english-sweep-v1.md')
  const uiMenuLayoutPolishApprovedPlan = await readRepoFile(UI_MENU_LAYOUT_POLISH_APPROVED_PLAN_PATH)
  const recentBuildsUiApprovedPlan = await readRepoFile(RECENT_BUILDS_UI_APPROVED_PLAN_PATH)
  const changeLogComprehensiveApprovedPlan = await readRepoFile(CHANGE_LOG_COMPREHENSIVE_APPROVED_PLAN_PATH)
  const dailyExecSummaryApprovedPlan = await readRepoFile(DAILY_EXEC_SUMMARY_APPROVED_PLAN_PATH)
  const sourceLifecycleApprovedPlan = await readRepoFile(SOURCE_LIFECYCLE_APPROVED_PLAN_PATH)
  const foundationFollowupCardCaptureApprovedPlan = await readRepoFile(FOUNDATION_FOLLOWUP_CARD_CAPTURE_APPROVED_PLAN_PATH)
  const foundationSystemsServiceGroupingApprovedPlan = await readRepoFile(FOUNDATION_SYSTEMS_SERVICE_GROUPING_APPROVED_PLAN_PATH)
  const systemRegistrationSweepApprovedPlan = await readRepoFile(SYSTEM_REGISTRATION_SWEEP_APPROVED_PLAN_PATH)
  const gateReliabilityRecurringApprovedPlan = await readRepoFile('docs/process/approved-plans/gate-reliability-recurring-transient-v1.md')
  const gateReliabilityDirectVerifierApprovedPlan = await readRepoFile('docs/process/approved-plans/gate-reliability-direct-verifier-deadlock-v1.md')
  const plainEnglishSweepArtifactSource = await readRepoFile(PLAIN_ENGLISH_SWEEP_ARTIFACT_PATH)
  const plainEnglishSweepManualReview = await readRepoFile(PLAIN_ENGLISH_SWEEP_MANUAL_REVIEW_PATH)
  const uiMenuLayoutPolishBaseline = await readRepoFile(UI_MENU_LAYOUT_POLISH_BASELINE_PATH)
  const uiMenuLayoutPolishManualReview = await readRepoFile(UI_MENU_LAYOUT_POLISH_MANUAL_REVIEW_PATH)
  const recentBuildsUiBaseline = await readRepoFile(RECENT_BUILDS_UI_BASELINE_PATH)
  const recentBuildsUiManualReview = await readRepoFile(RECENT_BUILDS_UI_MANUAL_REVIEW_PATH)
  const changeLogComprehensiveBaseline = await readRepoFile(CHANGE_LOG_COMPREHENSIVE_BASELINE_PATH)
  const changeLogComprehensiveManualReview = await readRepoFile(CHANGE_LOG_COMPREHENSIVE_MANUAL_REVIEW_PATH)
  const dailyExecSummaryBaseline = await readRepoFile(DAILY_EXEC_SUMMARY_BASELINE_PATH)
  const dailyExecSummaryManualReview = await readRepoFile(DAILY_EXEC_SUMMARY_MANUAL_REVIEW_PATH)
  const sourceLifecycleBaseline = await readRepoFile(SOURCE_LIFECYCLE_BASELINE_PATH)
  const sourceLifecycleManualReview = await readRepoFile(SOURCE_LIFECYCLE_MANUAL_REVIEW_PATH)
  const foundationFollowupCardCaptureAudit = await readRepoFile(FOUNDATION_FOLLOWUP_CARD_CAPTURE_AUDIT_PATH)
  const foundationSystemsServiceGroupingBaseline = await readRepoFile(FOUNDATION_SYSTEMS_SERVICE_GROUPING_BASELINE_PATH)
  const foundationSystemsServiceGroupingManualReview = await readRepoFile(FOUNDATION_SYSTEMS_SERVICE_GROUPING_MANUAL_REVIEW_PATH)
  const systemRegistrationSweepProof = await readRepoFile(SYSTEM_REGISTRATION_SWEEP_PROOF_PATH)
  const approvalIntegritySource = await readRepoFile('lib/approval-integrity.js')
  const processGitHooksSource = await readRepoFile('lib/process-git-hooks.js')
  const gitHooksDoc = await readRepoFile('docs/process/git-hooks.md')
  const approvalIntegrityDoc = await readRepoFile('docs/process/approval-integrity.md')
  const closeoutBackfillDoc = await readRepoFile('docs/process/closeout-backfill-phase-1.md')
  const approvalLegacyLedgerSource = await readRepoFile('docs/process/approval-legacy-exceptions.json')
  const approvalLegacyLedger = JSON.parse(approvalLegacyLedgerSource)
  const actionReviewApprovalSource = await readRepoFile('docs/process/approvals/ACTION-REVIEW-APPLY-001.json')
  const actionReviewApproval = JSON.parse(actionReviewApprovalSource)
  const ownersSourceNote = await readRepoFile('docs/source-notes/owners-dashboard.md')
  const foundationDbSource = await readRepoFile('lib/foundation-db.js')
  const foundationDbSchemaSeedStoreSource = await readRepoFile('lib/foundation-db-schema-seed-store.js')
  const foundationBacklogSeedSource = await readFoundationBacklogSeedSourceBundle({ readRepoFile })
  const currentSprintStoreSource = await readRepoFile('lib/foundation-current-sprint-store.js')
  const foundationBuildLogSource = await readRepoFile('lib/foundation-build-log.js')
  const foundationBuildLogRegistrySource = [
    foundationBuildLogSource,
    ...foundationBuildCloseoutRegistryRecordSources,
  ].join('\n')
  const sourceContractsSource = await readRepoFile('lib/source-contracts.js')
  const sourceContractCleanupDoc = await readRepoFile('docs/process/source-contract-cleanup.md')
  const verifierConsolidationDoc = await readRepoFile('docs/process/verifier-consolidation.md')
  const intelligenceAtomsSource = await readRepoFile('lib/intelligence-atoms.js')
  const sharedCandidateExtractionSource = await readRepoFile('lib/shared-candidate-extraction.js')
  const foundationVerifierSourceBundle = buildFoundationVerifierSourceBundle({
    foundationDbSource,
    foundationDbSchemaSeedStoreSource,
    foundationBacklogSeedSource,
    foundationBacklogStoreSource,
    foundationDecisionStoreSource,
    foundationCoreSeedSource,
    foundationStrategySourceSnapshotSource,
    foundationStrategyOperatingTruthSource,
    foundationStrategyGoalTruthSource,
    foundationFubLeadSourceStoreSource,
    foundationSharedCommsStoreSource,
    foundationSourceCrawlStoreSource,
    foundationDriveMeetingVaultStoreSource,
    foundationAgentFeedbackStoreSource,
    foundationRuntimeJobStoreSource,
    foundationLlmRuntimeStoreSource,
    foundationSalesListingStoreSource,
    intelligenceAtomsSource,
    intelligenceRetrievalSource,
    intelligenceSynthesisFactsSource,
    intelligenceSynthesisSource,
    intelligenceActionRouterSource,
  })
  const foundationDbVerifierSource = foundationVerifierSourceBundle.foundationDbVerifierSource
  const foundationDbWithBacklogSeedSource = foundationVerifierSourceBundle.foundationDbWithBacklogSeedSource
  const sourceCrawlStoreOwnershipSource = foundationVerifierSourceBundle.sourceCrawlStoreOwnershipSource
  const driveMeetingVaultStoreOwnershipSource = foundationVerifierSourceBundle.driveMeetingVaultStoreOwnershipSource
  const agentFeedbackStoreOwnershipSource = foundationVerifierSourceBundle.agentFeedbackStoreOwnershipSource
  const directModelHostOffenders = await auditDirectModelHostUsage()
  const foundationVerifyRuntimeSupportDogfood = buildFoundationVerifyRuntimeSupportDogfoodProof()
  ensure(
    checks,
    foundationVerifyRuntimeSupportDogfood.ok,
    'Foundation verify runtime support dogfood rejects unsafe direct model hosts',
    foundationVerifyRuntimeSupportDogfood.dogfoodInvariant,
  )
  const governedExtractionLedgerRuns = intelligenceJobLedgerSnapshot.recentRuns.filter(run =>
    run.provenance?.caller === 'scripts/run-extraction-target.mjs' &&
    run.sourceCrawlRunId &&
    run.sourceId &&
    run.nextRunState?.targetKey &&
    run.itemCounts &&
    Object.prototype.hasOwnProperty.call(run.itemCounts, 'inspected')
  )
  const atomImplementationPresent = [foundationDbVerifierSource, intelligenceAtomsSource].some(source =>
    /CREATE TABLE IF NOT EXISTS\s+(business_atoms|intelligence_atoms|atom_hits|intelligence_atom_hits)/.test(source)
  )
  const synthesisFactTypes = new Set((synthesisFactsSnapshot.factsByType || []).map(row => row.factType))
  const synthesisFactSources = new Set((synthesisFactsSnapshot.factsBySource || []).map(row => row.sourceId))
  const retrievalEvalCases = Array.isArray(intelligenceRetrievalEvalFixture.cases)
    ? intelligenceRetrievalEvalFixture.cases
    : []
  const retrievalEvalSources = new Set(retrievalEvalCases.map(item => item.sourceId).filter(Boolean))
  const latestRetrievalEvalMetadata = intelligenceRetrievalSnapshot.latestEvalRun?.metadata || {}

  const sourceContractOrchestrationVerifier = await evaluateFoundationSourceContractVerifierOrchestration({
    sourceContracts,
    sourceRegistry,
    currentState,
    foundationHub: { backlogItems: verifierSplitBacklogItems },
    foundationBuildCloseouts: getFoundationBuildCloseouts(),
    packageJson,
    parallelBuilderWorktreeProtocolSource,
    repoFileExists,
    foundationSourceContractVerifierSource,
    foundationVerifyRootSource,
  })
  checks.push(...sourceContractOrchestrationVerifier.checks)
  const sourceContractVerifierResult = sourceContractOrchestrationVerifier.sourceContractVerifier
  const dbConstraintDogfood = await buildDbConstraintDogfoodProof()
  const sourceIdConstraintContractDogfood = buildSourceIdConstraintContractDogfoodProof()
  const activeFoundationSprintForCoreGovernance = await getActiveFoundationCurrentSprint().catch(() => ({ sprint: null, items: [] }))
  const coreGovernanceOrchestrationVerifier = await evaluateFoundationCoreGovernanceVerifierOrchestration({
    activeFoundationSprint: activeFoundationSprintForCoreGovernance,
    foundationHub: { backlogItems: verifierSplitBacklogItems },
    foundationBuildCloseouts: getFoundationBuildCloseouts(),
    foundationCoreGovernanceVerifierSource,
    foundationVerifyRootSource,
    verifierCoreGovernanceSplitModuleScriptSource,
    verifierCoreGovernanceSplitModulePlanSource,
    packageJson,
    repoFileExists,
    systemStrategy,
    currentPlan,
    currentState,
    agentsSource,
    foundationHtmlSource,
    strategicIntelSpecSource,
    foundationHardCheckpointSource,
    usersDoc,
    steveDoc,
    agentModelDoc,
    harlanDoc,
    crewbertDoc,
    personalAgentOnboardingDoc,
    ownersSourceNote,
    docsIndexSource,
    archiveIndexSource,
    docsReadmeSource,
    directModelHostOffenders,
    backlogSeedDrift,
    foundationDbSource: foundationDbVerifierSource,
    foundationSharedCommsStoreSource,
    foundationDecisionStoreSource,
    foundationBacklogStoreSource,
    dbConstraintSource,
    dbConstraintDogfood,
    dbConstraintAudit,
    sourceIdConstraintContractSource,
    sourceIdConstraintContractDogfood,
    serverSource,
    hubReadRoutesSource,
    fubSourceRoutesSource,
    foundationOperatorRoutesSource,
    foundationSourceRoutesSource,
    foundationBuildIntelRoutesSource,
    ownersGovernanceRoutesSource,
    authRoutesSource,
    appPageRoutesSource,
    securityAccessSource,
    appAuthSource,
    loginHtmlSource,
    loginUiSource,
    foundationFrontendSource,
    strategyExportUiSource,
    llmRouterSource,
    sourceCrawlStoreOwnershipSource,
    extractionTargetSource,
  })
  checks.push(...coreGovernanceOrchestrationVerifier.checks)
  const activeFoundationSprintForIntelligenceSpine = await getActiveFoundationCurrentSprint().catch(() => ({ sprint: null, items: [] }))
  const intelligenceSpineOrchestrationVerifier = await evaluateFoundationIntelligenceSpineVerifierOrchestration({
    activeFoundationSprint: activeFoundationSprintForIntelligenceSpine,
    foundationHub: { backlogItems: verifierSplitBacklogItems },
    foundationBuildCloseouts: getFoundationBuildCloseouts(),
    foundationIntelligenceSpineVerifierSource,
    foundationVerifyRootSource,
    verifierIntelligenceSpineSplitModuleScriptSource,
    verifierIntelligenceSpineSplitModulePlanSource,
    packageJson,
    repoFileExists,
    foundationDbSource: foundationDbVerifierSource,
    foundationDbWithBacklogSeedSource,
    extractionTargetSource,
    intelligenceJobProofSource,
    intelligenceJobLedgerSnapshot,
    intelligenceSalvageSpecSource,
    strategyHubManifestSource,
    currentPlan,
    currentState,
    intelligencePipelineSource,
    intelligenceAtomsSource,
    packageSource,
    intelligenceAtomProofSource,
    intelligenceAtomSpineSnapshot,
    intelligenceRetrievalSource,
    intelligenceRetrievalProofSource,
    intelligenceRetrievalSnapshot,
    llmRouterSource,
    intelligenceSemanticRetrievalProofSource,
    intelligenceHybridRetrievalProofSource,
    serverSource,
    intelligenceRetrievalEvalSource,
    intelligenceRetrievalEvalFixture,
    intelligenceSynthesisFactsSource,
    intelligenceSynthesisFactsProofSource,
    synthesisFactsSnapshot,
    intelligenceSynthesisSource,
    intelligenceSynthesisProofSource,
    synthesisEngineSnapshot,
    intelligenceActionRouterSource,
    foundationJobsSource,
    intelligenceActionRouterProofSource,
    actionRouterSnapshot,
  })
  checks.push(...intelligenceSpineOrchestrationVerifier.checks)
  const processingProvenanceGaps = await getSharedCommunicationProcessingProvenanceGaps({
    since: '2026-04-24T17:14:00-04:00',
    limit: 10,
  })
  const staleLlmCalls = await getStaleLlmCalls({ olderThanSeconds: 240, graceSeconds: 60, limit: 10 })
  ensure(
    checks,
    [foundationFrontendSource, docUiSource].every(source =>
      source.includes('isSafeDirectHref') &&
      source.includes("return isSafeDirectHref(href) ? href.trim() : '#'") &&
      source.includes("rel = 'noopener noreferrer'")
    ),
    'markdown-rendered links sanitize unsafe schemes',
    'Foundation and doc views disable unsafe href schemes and isolate external links; Strategy Hub v2 source-to-gap view does not render markdown',
  )
  const staleSourceCrawlRuns = await getStaleSourceCrawlTargetRuns({ olderThanMinutes: 30, limit: 10 })

  const {
    sourceOfTruth, systemInventory, foundationHubSummary, foundationHubFull, foundationHub,
    foundationBacklogListApi, foundationBacklogDoneArchiveApi, foundationBacklogDetailEndpointApi, foundationCurrentSprintApi, actionReviewApi, actionRouteReviewInboxApi, foundationBuildLog, foundationChangeLog, foundationDailySummary, foundationDocUpdatesApi,
    foundationSourceLifecycle, foundationSourceMaturityGrid, foundationSourceExtractionCoverage, foundationSourceCoverageCloseout,
    foundationSourceConnectorMatrixApi, foundationConnectorCredentialPreflightApi, foundationSourceHubRoutingMatrixApi,
    foundationMarketingSourceMap, foundationBrandStack, foundationTierBehavioralCompletion, foundationVerificationRuns,
    foundationExtractionRuntimeReadinessApi, foundationPerUserChangelog, foundationRestrictedDecisionQueue, foundationBuildIntelWatchlist, foundationMultimodalExtractorContract,
    foundationResearchInboxContract, foundationControlCompressionApi, foundationImplementationIntelligenceApi, foundationBuildIntelExtractionApi,
    foundationGStackBuildIntelApi, foundationChangesApi, strategyPreworkCoverageApi, strategyGoalTruthApi, strategyOperatingTruthApi, strategyHubV2Api,
    opsHub, ownersLeadSourceGovernance, ownersReviewQueue, localDocSuccessResponse, localDocNonLocalResponse, localDocTraversalResponse,
    localDocNonAllowlistedResponse, extractionTargets, extractionCoverageTargets, extractionStaleActiveRuns, extractionRecentStaleReapedRuns,
    sourceTruthKpiHealth, foundationHubKpiHealth, backlogHygieneApi,
  } = await loadFoundationVerifyLiveApiSnapshot({ baseUrl })
  const activeFoundationSprintForExtractionRuntime = await getActiveFoundationCurrentSprint().catch(() => ({ sprint: null, items: [] }))
  const extractionRuntimeOrchestrationVerifier = await evaluateFoundationExtractionRuntimeVerifierOrchestration({
    activeFoundationSprint: activeFoundationSprintForExtractionRuntime,
    foundationHub,
    foundationBuildCloseouts: getFoundationBuildCloseouts(),
    foundationExtractionRuntimeVerifierSource,
    foundationVerifyRootSource,
    verifierExtractionRuntimeSplitModuleScriptSource,
    verifierExtractionRuntimeSplitModulePlanSource,
    packageJson,
    repoFileExists,
    foundationDbSource: foundationDbVerifierSource,
    sourceCrawlStoreSource: foundationSourceCrawlStoreSource,
    llmRuntimeStoreSource: foundationLlmRuntimeStoreSource,
    runtimeJobStoreSource: foundationRuntimeJobStoreSource,
    foundationWorkerSource,
    processFoundationShipSource,
    foundationJobsSource,
    extractionTargetSource,
    videoInventorySource,
    currentPlan,
    currentState,
    extractionControlSeedSource,
    googleDelegatedSource,
    driveContentExtractionSource,
    packageSource,
    crawlRunLedgerScriptSource,
    extractRetireModuleSource: extractRetireSource,
    extractRetireScriptSource,
    extractRetirePlanSource,
    extractRetryModuleSource: extractRetrySource,
    extractRetryScriptSource,
    extractRetryPlanSource,
    extractRunHardeningSource,
    extractRunHardeningExecutionSource,
    meetingNotesSyncSource: syncMeetingNotesArchiveSource,
    extractionRetryFailedScriptSource,
    extractionRuntimeVerifierSource: foundationExtractionRuntimeVerifierSource,
    extractionRuntimeReadinessSource,
    extractionRuntimeReadinessCheckSource,
    extractionRuntimeReadinessPlanSource,
    extractionRuntimeReadinessCloseoutSource,
    karpathyKbVideoPackSource,
    karpathyKbVideoPackCheckSource,
    karpathyKbVideoPackPlanSource,
    karpathyKbVideoPackCloseoutSource,
    buildIntelWatchlistSource,
    verifierCoverageSource: foundationVerifySource,
    extractionRuntimeReadinessApi: foundationExtractionRuntimeReadinessApi,
    extractionControlSnapshot: foundationHub.extractionControl || {},
    extractionTargets,
    researchInboxContract: foundationResearchInboxContract,
    multimodalContract: foundationMultimodalExtractorContract,
    runtimeReadRoutesSource: foundationRuntimeReadRoutesSource,
    securityAccessSource,
    driveLinkInventorySource,
    sharedCandidateExtractionSource,
    processingProvenanceGaps,
    staleLlmCalls,
  })
  checks.push(...extractionRuntimeOrchestrationVerifier.checks)
  const foundationBuildCloseouts = getFoundationBuildCloseouts()
  const foundationBuildCloseoutValidation = getFoundationBuildCloseoutValidation()
  const findBuildLogCloseoutEntry = (cardId, closeoutKey) => buildFoundationVerifierBuildLogCloseoutEntry({
    foundationBuildLog,
    foundationBuildCloseouts,
    cardId,
    closeoutKey,
  })
  const doneBacklogCards = (foundationHub.backlogItems || []).filter(item => item.lane === 'done')
  const doneBacklogCardIds = new Set(doneBacklogCards.map(item => item.id))
  const liveBacklogCardIds = new Set((foundationHub.backlogItems || []).map(item => item.id))
  const cardReferenceTrust = await buildCardReferenceTrustStatus({
    repoRoot,
    declaredCardIds: liveBacklogCardIds,
  })
  const syntheticCardReferenceTrust = buildSyntheticPhantomCardReferenceStatus()
  const sourceReferenceTrust = await buildSourceReferenceTrustStatus({ repoRoot })
  const docArchiveCleanupStatus = await buildDocArchiveCleanupStatus({ repoRoot })
  const foundation1100Artifact = await loadFoundationReviewSprintArtifact({ repoRoot })
  const foundation1100ReviewStatus = buildFoundationReviewSprintStatus({
    artifact: foundation1100Artifact,
    backlogItems: foundationHub.backlogItems || [],
    actionRouter: foundationHub.intelligenceActionRouter || {},
    hygiene: backlogHygieneApi,
  })
  const plainEnglishSweepStatus = await buildPlainEnglishSweepStatus({ repoRoot })
  const uiMenuLayoutPolishStatus = await buildUiMenuLayoutPolishStatus({
    repoRoot,
    systemInventory,
    foundationHub,
    foundationBuildLog,
  })
  const recentBuildsUiStatus = await buildRecentBuildsBillionDollarUiStatus({
    repoRoot,
    foundationBuildLog,
  })
  const changeLogComprehensiveStatus = await buildChangeLogComprehensiveStatus({
    repoRoot,
    changeLog: foundationChangeLog,
    changesApi: foundationChangesApi,
    buildLog: foundationBuildLog,
  })
  const dailyExecSummaryStatus = await buildDailyExecSummaryStatus({
    repoRoot,
    dailySummary: foundationDailySummary,
    buildLog: foundationBuildLog,
    changeLog: foundationChangeLog,
    changesApi: foundationChangesApi,
    foundationHub,
  })
  const sourceLifecycleStatus = await buildSourceLifecycleExpansionCheck({
    repoRoot,
    sourceLifecycle: foundationSourceLifecycle,
    sourceOfTruth,
    foundationHub,
  })
  const sourceLifecycleCompletionStatus = buildSourceLifecycleCompletionStatus({
    sourceLifecycle: foundationSourceLifecycle,
    sourceOfTruth,
    foundationHub,
    repoHead: currentRepoHead,
  })
  const latestDriveAccessPreflightRun = await getLatestDriveAccessPreflightRun({ cardId: DRIVE_ACCESS_REQUEST_CARD_ID }).catch(() => null)
  const latestMeetingVaultAclAudit = await getLatestMeetingVaultAclAudit({ cardId: MEETING_VAULT_ACL_CARD_ID }).catch(() => null)
  const latestMeetingVaultAutoEnforcementRun = await getLatestMeetingVaultAutoEnforcementRun({ cardId: MEETING_VAULT_AUTO_ENFORCEMENT_CARD_ID }).catch(() => null)
  const syntheticDriveAccessPreflight = buildSyntheticDriveAccessPreflightProof()
  const syntheticMeetingVaultAcl = buildSyntheticMeetingVaultAclProof()
  const syntheticMeetingVaultAutoEnforcement = buildSyntheticMeetingVaultAutoEnforcementProof()
  const meetingVaultNoDuplicateGoogleDocProof = buildMeetingVaultNoDuplicateGoogleDocProof({
    meetingVaultAclSource,
    meetingVaultAclScriptSource,
    syncMeetingNotesArchiveSource,
    mirrorMeetingArchiveToDriveSource,
  })
  const activeFoundationSprint = await getActiveFoundationCurrentSprint().catch(() => ({ sprint: null, items: [] }))
  const foundationCurrentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: activeFoundationSprint.sprint,
    items: activeFoundationSprint.items,
    backlogItems: foundationHub.backlogItems || [],
    closeouts: foundationBuildCloseouts,
    planCriticRuns: activeFoundationSprint.planCriticRuns || [],
  })
  const canvaClientOrchestrationVerifier = await evaluateFoundationCanvaClientVerifierOrchestration({
    activeSprint: activeFoundationSprint,
    backlogItems: foundationHub.backlogItems || [],
    closeouts: foundationBuildCloseouts,
    env: process.env,
    canvaClientSource,
    canvaClientScriptSource,
    canvaClientPlanSource,
    canvaOauthBootstrapSource,
    packageJson,
    currentPlan,
    currentState,
    foundationVerifySource,
    foundationVerifyRootSource,
    foundationCanvaClientVerifierSource,
    verifierCanvaClientSplitScriptSource,
    verifierCanvaClientSplitPlanSource,
    repoFileExists,
  })
  checks.push(...canvaClientOrchestrationVerifier.checks)
  const CONNECTOR_ROUTING_TRUTH_CARD_IDS = [
    'ATOM-PROMOTION-DIAGNOSE-001',
    'SPRINT-DB-RECONCILE-001',
    'VERIFY-GATE-TIERING-FIX-001',
    'PLAN-CRITIC-LOG-001',
    'SOURCE-CONNECTOR-MATRIX-001',
    'SOURCE-HUB-ROUTING-MATRIX-001',
  ]
  const currentSprintActiveBlockerCardId = foundationHub.currentSprint?.activeBlocker?.cardId || null
  const {
    historicalCardHasVerifiedCloseout,
    cardsHaveVerifiedCloseouts,
  } = buildSprintProofHelpers({
    backlogItems: foundationHub.backlogItems || [],
    closeouts: foundationBuildCloseouts,
  })
  const connectorRoutingTruthSprintDone = cardsHaveVerifiedCloseouts(CONNECTOR_ROUTING_TRUTH_CARD_IDS)
  const sourceOnceOverCardsHaveVerifiedCloseouts = cardsHaveVerifiedCloseouts([
    SOURCE_MATURITY_GRID_CARD_ID,
    SOURCE_EXTRACTION_COVERAGE_CARD_ID,
    SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
    MARKETING_SOURCE_MAP_CARD_ID,
    BRAND_STACK_CARD_ID,
    TIER_BEHAVIORAL_COMPLETION_CARD_ID,
    VERIFICATION_RUNS_CARD_ID,
    PER_USER_CHANGELOG_CARD_ID,
    DECISION_RESTRICTED_QUEUE_CARD_ID,
    FOUNDATION_UI_COMPLETE_CARD_ID,
  ])
  const activeSprintCompleteReview =
    foundationCurrentSprintStatus.summary?.itemCount > 0 &&
    foundationCurrentSprintStatus.summary?.doneThisSprintCount === foundationCurrentSprintStatus.summary.itemCount &&
    !currentSprintActiveBlockerCardId
  const knownLaterFoundationProgressionBlockers = [
    DB_SEED_CARD_ID,
    VERIFIER_RUNTIME_RELIABILITY_SPLIT_CARD_ID,
    VERIFIER_RUNTIME_RELIABILITY_ORCHESTRATION_SPLIT_CARD_ID,
    FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_CARD_ID,
    VERIFIER_HEALTH_SCRIPT_MODULE_CARD_ID,
    STYLESHEET_MONOLITH_SPLIT_CARD_ID,
    VERIFIER_SOURCE_TRUST_SPLIT_MODULE_CARD_ID,
    VERIFIER_CURRENT_SPRINT_SPLIT_MODULE_CARD_ID,
    VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_CARD_ID,
    VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_CARD_ID,
    VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_CARD_ID,
    VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_CARD_ID,
    VERIFIER_SURFACE_TRUST_SPLIT_MODULE_CARD_ID,
    VERIFIER_PROCESS_HARDENING_SPLIT_MODULE_CARD_ID,
    VERIFIER_AGENT_FEEDBACK_SPLIT_MODULE_CARD_ID,
    VERIFIER_HUB_SAFETY_SPLIT_MODULE_CARD_ID,
    'FOUNDATION-IDENTITY-001',
    'RUNTIME-SUPERVISOR-001',
    runtimeWorkerVerifierCoverageCardId,
    runtimeFirstJobsVerifierCoverageCardId,
    runtimeHealthSimplifyVerifierCoverageCardId,
    'NIGHTLY-AUDIT-SCHEDULER-DUE-FIX-001',
    'NIGHTLY-DEEP-AUDIT-BACKFILL-001',
    'NIGHTLY-AUDIT-RUN-PROOF-001',
    'SYSTEM-HEALTH-NIGHTLY-AUDIT-001',
    'SCHEDULED-JOB-STALENESS-DASHBOARD-001', 'SYSTEM-HEALTH-RED-ROW-REPAIR-001', 'VERIFICATION-RUNS-READONLY-SPLIT-001', 'CONNECTOR-BLOCKED-ROW-DIAGNOSIS-001', 'CONNECTOR-COMPLETION-SPRINT', 'SOURCE-CONTRACT-ID-RECONCILE-001',
    'CRITICAL-ROOTS-UNDER-3K-PHASE-2',
    'CRITICAL-ROOTS-UNDER-3K-PHASE-3',
    'CRITICAL-ROOTS-UNDER-3K-PHASE-4',
    'FOUNDATION-BACKLOG-SEED-CHUNK-SPLIT-001',
    'FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001',
    'AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001',
    'AGENT-CAPABILITY-REGISTRY-001',
    'AGENT-TEMPLATE-RUNTIME-CONTRACT-001', 'OLD-SYSTEM-AGENT-ONBOARDING-HARVEST-001', 'AGENT-010', 'ROLE-ASSISTANT-CONTRACTS-001', 'HARLAN-PROJECT-REGISTRY-001', 'HARLAN-OPERATOR-LOOP-V1-001', 'BUILD-INTEL-CREATOR-WATCHLIST-EXPANSION-001',
    'FOUNDATION-HUB-PAYLOAD-BUDGET-V2-001',
    'SOURCE-CONTRACT-VALIDATION-LAYER-001',
    'FOUNDATION-BACKLOG-DONE-ARCHIVE-LAZY-LOAD-001',
    'EXTRACTION-RUNTIME-READINESS-001',
    'EXTRACTOR-QUEUE-KARPATHY-KB-VIDEO-PACK-001',
  ]
  const activeSprintAtOrPast = expectedCardIds =>
    expectedCardIds.includes(currentSprintActiveBlockerCardId) ||
    expectedCardIds.some(cardId => historicalCardHasVerifiedCloseout(cardId)) ||
    knownLaterFoundationProgressionBlockers.includes(currentSprintActiveBlockerCardId) ||
    activeSprintCompleteReview
  const currentStateMentionsActiveBlockerOrLater = (...expectedSnippets) =>
    expectedSnippets.some(snippet =>
      typeof snippet === 'boolean' ? snippet : currentState.includes(snippet)
    ) || knownLaterFoundationProgressionBlockers.includes(currentSprintActiveBlockerCardId) ||
    activeSprintCompleteReview ||
    (
      currentState.includes('Historical closeout notes below preserve at-the-time "current sprint active blocker" wording') &&
      (
        currentState.includes(IMPLEMENTATION_INTELLIGENCE_CLOSEOUT_KEY) ||
        currentState.includes(BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CLOSEOUT_KEY) ||
        currentState.includes(CODE_QUALITY_NIGHTLY_AUDIT_CLOSEOUT_KEY)
      )
    )
  const connectorRoutingTruthCloseout = foundationBuildCloseouts.find(closeout => closeout.key === 'connector-routing-truth-v1') || null
  const connectorRoutingProcessRepairCloseout = foundationBuildCloseouts.find(closeout => closeout.key === 'connector-routing-process-repair-v1') || null
  const verifierSprintIndependenceCloseout = foundationBuildCloseouts.find(closeout => closeout.key === 'verifier-sprint-independence-v1') || null
  const verifierModularSplitCloseout = foundationBuildCloseouts.find(closeout => closeout.key === 'verifier-modular-split-v1') || null
  const processRootVsPatchCloseout = foundationBuildCloseouts.find(closeout => closeout.key === 'process-root-vs-patch-v1') || null
  const currentSprintDynamicTruthCloseout = foundationBuildCloseouts.find(closeout => closeout.key === CURRENT_SPRINT_DYNAMIC_TRUTH_CLOSEOUT_KEY) || null
  const sprintStageGateCloseout = foundationBuildCloseouts.find(closeout => closeout.key === SPRINT_STAGE_GATE_CLOSEOUT_KEY) || null
  const foundationPlanReconcileCloseout = foundationBuildCloseouts.find(closeout => closeout.key === FOUNDATION_PLAN_RECONCILE_CLOSEOUT_KEY) || null
  const connectorCredentialCloseout = foundationBuildCloseouts.find(closeout => closeout.key === CONNECTOR_CREDENTIAL_CLOSEOUT_KEY) || null
  const llmAuthAuditCloseout = foundationBuildCloseouts.find(closeout => closeout.key === LLM_AUTH_AUDIT_CLOSEOUT_KEY) || null
  const llmAuthBudgetLabelCloseout = foundationBuildCloseouts.find(closeout => closeout.key === LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CLOSEOUT_KEY) || null
  const sourceExtractionGapFollowupCloseout = foundationBuildCloseouts.find(closeout => closeout.key === SOURCE_EXTRACTION_GAP_FOLLOWUP_CLOSEOUT_KEY) || null
  const atomFlowAutoDemotionCloseout = foundationBuildCloseouts.find(closeout => closeout.key === ATOM_FLOW_AUTO_DEMOTION_CLOSEOUT_KEY) || null
  const extractRunHardeningExecutionCloseout = foundationBuildCloseouts.find(closeout => closeout.key === EXTRACT_RUN_HARDENING_EXECUTION_CLOSEOUT_KEY) || null
  const researchLanePurgeCloseout = foundationBuildCloseouts.find(closeout => closeout.key === RESEARCH_LANE_PURGE_CLOSEOUT_KEY) || null
  const implementationIntelligenceCloseout = foundationBuildCloseouts.find(closeout => closeout.key === IMPLEMENTATION_INTELLIGENCE_CLOSEOUT_KEY) || null
  const buildIntelExtractionCloseout = foundationBuildCloseouts.find(closeout => closeout.key === BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CLOSEOUT_KEY) || null
  const gstackBuildIntelCloseout = foundationBuildCloseouts.find(closeout => closeout.key === GSTACK_BUILD_INTEL_CLOSEOUT_KEY) || null
  const codeQualityNightlyAuditCloseout = foundationBuildCloseouts.find(closeout => closeout.key === CODE_QUALITY_NIGHTLY_AUDIT_CLOSEOUT_KEY) || null
  const hubWorkCoordinationCloseout = foundationBuildCloseouts.find(closeout => closeout.key === HUB_WORK_COORDINATION_CLOSEOUT_KEY) || null
  const sourceOutageBoundaryCloseout = foundationBuildCloseouts.find(closeout => closeout.key === SOURCE_OUTAGE_BOUNDARY_CLOSEOUT_KEY) || null
  const foundationReadySafeHubLaneCloseout = foundationBuildCloseouts.find(closeout => closeout.key === FOUNDATION_READY_SAFE_HUB_LANE_CLOSEOUT_KEY) || null
  const foundationHubBacklogContractCloseout = foundationBuildCloseouts.find(closeout => closeout.key === FOUNDATION_HUB_BACKLOG_CONTRACT_CLOSEOUT_KEY) || null
  const foundationBacklogDetailEndpointCloseout = foundationBuildCloseouts.find(closeout => closeout.key === FOUNDATION_BACKLOG_DETAIL_ENDPOINT_CLOSEOUT_KEY) || null
  const foundationOperatingReliabilityCloseout = foundationBuildCloseouts.find(closeout => closeout.key === FOUNDATION_OPERATING_RELIABILITY_CLOSEOUT_KEY) || null
  const planCriticArchitecturalRulesCloseout = foundationBuildCloseouts.find(closeout => closeout.key === PLAN_CRITIC_ARCHITECTURAL_RULES_CLOSEOUT_KEY) || null
  const foundationPerformanceCloseout = foundationBuildCloseouts.find(closeout => closeout.key === FOUNDATION_PERFORMANCE_CLOSEOUT_KEY) || null
  const foundationBuildCloseoutRegistrySplitCloseout = foundationBuildCloseouts.find(closeout => closeout.key === FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_CLOSEOUT_KEY) || null
  const foundationBuildLogMonolithSliceCloseout = foundationBuildCloseouts.find(closeout => closeout.key === FOUNDATION_BUILD_LOG_MONOLITH_SLICE_CLOSEOUT_KEY) || null
  const foundationVerificationCleanupCloseout = foundationBuildCloseouts.find(closeout => closeout.key === FOUNDATION_VERIFICATION_CLEANUP_CLOSEOUT_KEY) || null
  const foundationShipGateSpeedPayloadCloseout = foundationBuildCloseouts.find(closeout => closeout.key === FOUNDATION_SHIP_GATE_SPEED_PAYLOAD_CLOSEOUT_KEY) || null
  const foundationClickUpVerifyHealthBoundaryCloseout = foundationBuildCloseouts.find(closeout => closeout.key === FOUNDATION_CLICKUP_VERIFY_HEALTH_BOUNDARY_CLOSEOUT_KEY) || null
  const foundationEngineeringFitnessVerifier = await evaluateFoundationEngineeringFitnessVerifierCoverage({
    cards: foundationHub.backlogItems || [],
    closeouts: foundationBuildCloseouts,
    packageJson,
    foundationHubSummary,
    foundationHubFull,
    sources: {
      foundationVerifySource,
      verifierCoverageSource: foundationVerifySource,
      moduleSource: foundationEngineeringFitnessGatesSource,
      scriptSource: foundationEngineeringFitnessGatesScriptSource,
      publicDataSource: foundationDataSource,
      foundationSource: foundationUiSource,
      operationsRendererSource: foundationOperationsRenderersSource,
      operatorRoutesSource: foundationOperatorRoutesSource,
      backlogModuleSource: foundationBacklogDetailSource,
      routePayloads: {
        backlog: foundationBacklogListApi,
        doneArchive: foundationBacklogDoneArchiveApi,
        buildLog: foundationBuildLog,
        currentSprint: foundationCurrentSprintApi,
        sourceOfTruth,
      },
      backlogRendererSource: foundationBacklogRenderersSource,
      routerSource: foundationRouterSource,
      securityAccessSource,
    },
    repoFileExists,
  })
  checks.push(...foundationEngineeringFitnessVerifier.checks)
  const sourceConnectorMatrix = foundationSourceLifecycle.sourceConnectorMatrix || foundationHub.sourceConnectorMatrix || foundationHub.sourceLifecycle?.sourceConnectorMatrix || {}
  const sourceHubRoutingMatrix = foundationSourceLifecycle.sourceHubRoutingMatrix || foundationHub.sourceHubRoutingMatrix || foundationHub.sourceLifecycle?.sourceHubRoutingMatrix || {}
  const sourceExtractionGapFollowupSnapshot = buildSourceExtractionGapFollowupSnapshot({
    connectorMatrix: sourceConnectorMatrix,
    routingMatrix: sourceHubRoutingMatrix,
  })
  const sourceExtractionGapMissingIds = findMissingTriageSourceIds(sourceExtractionGapFollowupSnapshot, sourceConnectorMatrix)
  const sourceExtractionGapSyntheticMissingProof = buildSyntheticMissingGapProof(sourceExtractionGapFollowupSnapshot, sourceConnectorMatrix)
  const currentSprintItemsById = new Map(
    (foundationHub.currentSprint?.stages || [])
      .flatMap(stage => stage.items || [])
      .map(item => [item.cardId, item])
  )
  const foundationPlanReconcileCurrentItem = currentSprintItemsById.get(REBUILD_PLAN_RECONCILE_CARD_ID) ||
    currentSprintItemsById.get('FOUNDATION-PLAN-RECONCILE-001') ||
    null
  const connectorCredentialCurrentItem = currentSprintItemsById.get(CONNECTOR_CREDENTIAL_CARD_ID) || null
  const llmAuthAuditCurrentItem = currentSprintItemsById.get(LLM_AUTH_AUDIT_CARD_ID) || null
  const llmAuthBudgetLabelCurrentItem = currentSprintItemsById.get(LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID) || null
  const sourceExtractionGapFollowupCurrentItem = currentSprintItemsById.get(SOURCE_EXTRACTION_GAP_FOLLOWUP_CARD_ID) || null
  const atomFlowAutoDemotionCurrentItem = currentSprintItemsById.get(ATOM_FLOW_AUTO_DEMOTION_CARD_ID) || null
  const extractRunHardeningExecutionCurrentItem = currentSprintItemsById.get(EXTRACT_RUN_HARDENING_EXECUTION_CARD_ID) || null
  const researchLanePurgeCurrentItem = currentSprintItemsById.get(RESEARCH_LANE_PURGE_CARD_ID) || null
  const syntheticFoundationSprintProof = buildSyntheticFoundationCurrentSprintProof()
  const foundationDoneTestReadinessStatus = buildFoundationReadinessStatus({
    foundationHub,
    closeouts: foundationBuildCloseouts,
    repo: {
      packageJson,
      securityAccessHasRegistry: includesAll(securityAccessSource, [
        'SECURITY_ROUTE_POSTURES',
        'export function assertTier',
        'buildRedactedCollectionResponse',
      ]),
      securityScriptHasExternalDenials: includesAll(security002ProofCheckSource, [
        'John cannot read Foundation Hub',
        'John cannot read shared-comms archive',
        'does not read client maxTier',
      ]),
      scriptHasSummaryMarker: foundationDoneTestScriptSource.includes(FOUNDATION_DONE_TEST_SUMMARY_MARKER),
      scriptSupportsReportOnly: foundationDoneTestScriptSource.includes('report-only') &&
        foundationDoneTestScriptSource.includes('reportOnly'),
    },
  })
  const foundationFollowupCardCaptureStatus = await buildFoundationFollowupCardCaptureStatus({
    repoRoot,
    foundationHub,
    foundationBuildLog,
  })
  const foundationSystemsServiceGroupingStatus = await buildFoundationSystemsServiceGroupingStatus({
    repoRoot,
    sourceOfTruth,
    foundationHub,
    foundationBuildLog,
  })
  const systemRegistrationSweepStatus = await buildSystemRegistrationSweepStatus({
    repoRoot,
    sourceOfTruth,
    foundationHub,
    foundationBuildLog,
  })
  const verifyGateTieringSynthetic = buildSyntheticVerifyGateTieringProof()
  const planCriticSynthetic = buildSyntheticPlanCriticProof()
  const securityBehaviorProofSynthetic = buildSyntheticSecurityBehaviorProof()
  const verifierBehaviorSweepSynthetic = buildSyntheticVerifierBehaviorSweepProof()
  const strategyHubMeetingReadySynthetic = buildSyntheticStrategyHubMeetingReadyProof()
  const avatarImportSynthetic = buildSyntheticAvatarImportProof()
  const autoDeployRollbackSynthetic = buildSyntheticAutoDeployRollbackProof()
  const sourceMaturityGridSynthetic = buildSyntheticSourceMaturityGridProof()
  const atomFlowAutoDemotionSynthetic = buildSyntheticAtomFlowAutoDemotionProof()
  const extractRunHardeningExecutionSynthetic = buildSyntheticExtractionRetryExecutionProof()
  const researchLanePurgeSynthetic = buildSyntheticResearchLanePurgeProof()
  const sourceExtractionCoverageSynthetic = buildSyntheticSourceExtractionCoverageProof()
  const sourceCoverageCloseoutSynthetic = buildSyntheticSourceCoverageCloseoutProof()
  const marketingSourceMapSynthetic = buildSyntheticMarketingSourceMapProof()
  const brandStackSynthetic = buildSyntheticBrandStackProof()
  const tierBehavioralCompletionSynthetic = buildSyntheticTierBehavioralCompletionProof()
  const verificationRunsSynthetic = buildSyntheticVerificationRunsProof()
  const perUserChangelogSynthetic = buildSyntheticPerUserChangelogProof()
  const decisionRestrictedQueueSynthetic = buildSyntheticDecisionRestrictedQueueProof()
  const foundationUiCompleteSynthetic = buildSyntheticFoundationUiCompleteProof()
  const avatarImportSnapshot = buildMarketingAvatarImportSnapshot({
    referenceBriefText: avatarReferenceBriefSource,
    retainProfilesText: avatarRetainSource,
    attractProfilesText: avatarAttractSource,
    oldReadmeText: avatarOldReadmeSource,
  })
  const researchCurationStatus = buildResearchCurationStatus({
    backlogItems: foundationHub.backlogItems || [],
    foundationReviewSprint: foundation1100ReviewStatus,
  })
  const exceptionCurationStatus = await buildExceptionCurationStatus({ repoRoot })
  const hitListReconcileStatus = await buildHitListReconcileStatusFromFile({
    repoRoot,
    backlogItems: foundationHub.backlogItems || [],
  })
  const archiveRetireStatus = await buildArchiveRetireStatus({ repoRoot })
  const verifierCoverageSource = [
    foundationVerifySource,
    foundationRouteSplitVerifierSource,
    foundationSourceContractVerifierSource,
    sourceContractRegistryTableSource,
    sourceIdScalarFkMigrationSource,
    sourceIdArrayProvenanceDesignSource,
    foundationSourceTrustVerifierSource,
    foundationCurrentSprintVerifierSource,
    foundationIntelligenceAuditVerifierSource,
    foundationExtractionRuntimeVerifierSource,
    crawlRunLedgerSource,
    foundationCoreGovernanceVerifierSource,
    foundationSurfaceTrustVerifierSource,
    foundationRuntimeReliabilityVerifierSource,
    dbConstraintSource,
    sourceIdConstraintContractSource,
    foundationIntelligenceSpineVerifierSource,
    foundationServerRouteSplitVerifierSource,
    foundationDbSplitVerifierSource,
    foundationFrontendSplitVerifierSource,
    foundationProcessHardeningVerifierSource,
    foundationProcessTrustVerifierSource,
    foundationAgentFeedbackVerifierSource,
    foundationCanvaClientVerifierSource,
    foundationRecentBuildsVerifierSource,
    llmHubCapacitySource,
    llmCredentialRegistrySource,
    foundationOperatorBudgetVerifierSource,
    foundationHubSafetyVerifierSource,
    foundationCurrentStateSummarySource,
    kpiHealthSource,
    fubSourceRoutesSource,
    foundationRuntimeReadRoutesSource,
    appPageRoutesSource,
    authRoutesSource,
    hubReadRoutesSource,
    strategySharedCommsRoutesSource,
    foundationWriteRoutesSource,
    agentFeedbackRoutesSource,
    foundationStabCaptureCheckSource,
    foundationCleanupArcCloseoutCheckSource,
    gcalAtomScheduleProofSource,
    foundationVerifierPlanReviewsSource,
    foundationVerifierProcessGovernanceSource,
    foundationVerifierReadinessFollowupSource,
    foundationVerifierGuardrailCloseoutsSource,
    foundationVerifierControlLoopSource,
    foundationVerifierModuleAssuranceSource,
    foundationVerifierBackendSplitAssuranceSource,
    foundationVerifierFrontendSplitAssuranceSource,
    foundationVerifierPhaseGOperatorCloseoutSource,
    foundationVerifierReadinessBlockerCloseoutSource,
    foundationVerifierSprintGateProgressionSource,
    foundationVerifierSourceOnceOverProgressionSource,
    foundationVerifierProcessControlGovernanceSource,
    foundationVerifierStructuralAssuranceCoreSource,
    foundationVerifierFrontendStructuralAssuranceSource,
    foundationVerifierHistoricalSplitCloseoutsSource,
    foundationVerifierBuildLogRegistryAssuranceSource,
    foundationVerifierHealthLiveSummarySource,
    foundationVerifierFollowupBacklogAssuranceSource,
    foundationVerifierCleanupControlAssuranceSource,
    foundationVerifierOperatorLiveSurfaceAssuranceSource,
  ].filter(Boolean).join('\n')
  const runtimeWorkerCode = foundationHub.runtimeSupervisor?.workerCode || {}
  const workerRunningCommit = String(runtimeWorkerCode.runningCommit || '').trim().toLowerCase()
  const workerRunningShortCommit = String(runtimeWorkerCode.runningShortCommit || workerRunningCommit.slice(0, 7) || 'missing')
  const foundationSurfaceMap = getFoundationSurfaceMap()
  const surfaceTrustOrchestrationVerifier = await evaluateFoundationSurfaceTrustVerifierOrchestration({
    activeFoundationSprint: activeFoundationSprintForExtractionRuntime,
    repoRoot,
    foundationHub,
    currentRepoHead,
    workerLaunchAgent,
    serverSource,
    foundationWorkerSource,
    foundationFrontendSource,
    verifierExceptionLedger,
    verifierExceptionSource,
    doneBacklogCards,
    doneBacklogCardIds,
    verifierCoverageSource,
    foundationBuildCloseouts,
    packageScripts: packageJson.scripts || {},
    routeSources: [
      serverSource,
      foundationOperatorRoutesSource,
      foundationSourceRoutesSource,
      foundationBuildIntelRoutesSource,
      fubSourceRoutesSource,
      foundationRuntimeReadRoutesSource,
      appPageRoutesSource,
      hubReadRoutesSource,
      strategySharedCommsRoutesSource,
      foundationWriteRoutesSource,
      agentFeedbackRoutesSource,
      ownersGovernanceRoutesSource,
      salesHubRoutesSource,
    ],
    syntheticRouteSources: [
      serverSource,
      foundationOperatorRoutesSource,
      foundationSourceRoutesSource,
      foundationBuildIntelRoutesSource,
      fubSourceRoutesSource,
      foundationRuntimeReadRoutesSource,
      appPageRoutesSource,
      hubReadRoutesSource,
      ownersGovernanceRoutesSource,
    ],
    foundationSurfaceMap,
    foundationHtmlSource,
    sourceContractsLength: sourceContracts.length,
    currentPlan,
    currentState,
    foundationSurfaceTrustVerifierSource,
    foundationVerifyRootSource,
    verifierSurfaceTrustSplitModuleScriptSource,
    verifierSurfaceTrustSplitModulePlanSource,
    packageJson,
    repoFileExists,
  })
  checks.push(...surfaceTrustOrchestrationVerifier.checks)
  const verifierExceptionValidation = surfaceTrustOrchestrationVerifier.surfaceTrustVerifier.details.verifierExceptionValidation
  const missingArtifactClaims = surfaceTrustOrchestrationVerifier.surfaceTrustVerifier.details.missingArtifactClaims
  const inventoryPluginNames = (systemInventory.plugins || []).map(plugin => plugin.title)
  const requiredPluginNames = ['Browser Use', 'Canva', 'Documents', 'GitHub', 'Gmail', 'Google Calendar', 'Google Drive', 'Presentations', 'Spreadsheets']
  const sourceTrustOrchestrationVerifier = await evaluateFoundationSourceTrustVerifierOrchestration({
    activeFoundationSprint,
    sourceOfTruth,
    foundationHub,
    sourceContracts,
    sourceConnectors,
    groupedSourceSystems,
    sourceTruthKpiHealth,
    foundationHubKpiHealth,
    backlogHygieneApi,
    cardReferenceTrust,
    syntheticCardReferenceTrust,
    sourceReferenceTrust,
    systemInventory,
    sourceContractsSource,
    sourceContractCleanupDoc,
    verifierConsolidationDoc,
    kpiHealthSource,
    kpiHealthScriptSource,
    kpiSourceNote,
    packageSource,
    serverRouteSource,
    foundationFrontendSource,
    foundationHtmlSource,
    foundationUiSource,
    foundationDbWithBacklogSeedSource,
    foundationVerifySource,
    foundationVerifyRootSource,
    moduleSource: foundationSourceTrustVerifierSource,
    foundationSourceTrustVerifierSource,
    foundationBuildCloseouts,
    packageJson,
    repoFileExists,
    verifierSourceTrustSplitModuleScriptSource,
    verifierSourceTrustSplitModulePlanSource,
    currentPlan,
    currentState,
    driveCorpusNote: await readRepoFile('docs/source-notes/google-drive-corpus.md'),
  })
  checks.push(...sourceTrustOrchestrationVerifier.checks)
  const sourceTrustVerifier = sourceTrustOrchestrationVerifier.sourceTrustVerifier
  const {
    buildLogRecentMultiCloseoutBuild,
    buildLogFullSystemReAuditBuild,
    buildLogWaveCleanupABuild,
    buildLogWaveCleanupBBuild,
    buildLogGatePerformanceBuild,
    buildLogPlanReconcileBuild,
    buildLogPhase1EnforcementBuild,
    buildLogFoundationControlBuild,
    buildLogFoundation1100ReviewBuild,
    buildLogPlainEnglishSweepBuild,
    buildLogUiMenuLayoutPolishBuild,
    buildLogRecentBuildsUiBuild,
    buildLogChangeLogComprehensiveBuild,
    buildLogDailyExecSummaryBuild,
    buildLogSourceLifecycleBuild,
    buildLogSourceLifecycleCompletionBuild,
    buildLogSynthesisVerifyBuild,
    buildLogExtractRunHardeningBuild,
    buildLogDriveAccessRequestBuild,
    buildLogMeetingVaultAutoEnforcementBuild,
    buildLogFoundationSprintSystemBuild,
    buildLogFoundationSprintCadenceBuild,
    buildLogVerifyGateTieringBuild,
    buildLogRebuildPlanReconcileBuild,
    buildLogPlanCriticReplacementBuild,
    buildLogSecurityBehaviorProofBuild,
    buildLogVerifierBehaviorSweepBuild,
    buildLogStrategyHubMeetingReadyBuild,
    buildLogAvatarImportBuild,
    buildLogAutoDeployRollbackBuild,
    buildLogSourceMaturityGridBuild,
    buildLogSourceExtractionCoverageBuild,
    buildLogSourceCoverageCloseoutBuild,
    buildLogMarketingSourceMapBuild,
    buildLogBrandStackBuild,
    buildLogTierBehavioralCompletionBuild,
    buildLogVerificationRunsBuild,
    buildLogPerUserChangelogBuild,
    buildLogDecisionRestrictedQueueBuild,
    buildLogFoundationUiCompleteBuild,
    buildLogFoundationDoneTestBuild,
    buildLogSystem010GhostCloseoutBuild,
    buildLogFoundationFollowupCardCaptureBuild,
    buildLogFoundationSystemsServiceGroupingBuild,
    buildLogAgentOnboardingFeedbackSystemBuild,
    buildLogAgentFeedbackSendBuild,
    buildLogAgentFeedbackAutoSendBuild,
    buildLogAgentFeedbackResponseNotifyBuild,
    buildLogAgentFeedbackReminderBuild,
    buildLogAgentFeedbackLiveRemindersBuild,
    buildLogAgentFeedbackCompanyEmailPolicyBuild,
    buildLogAgentFeedbackSteveFullLoopTestBuild,
    buildLogAgentFeedbackRealUserSubmitRepairBuild,
    buildLogFoundationVerifyHealthRepairBuild,
    buildLogAgentFeedbackProductionAutoSendDryRunBuild,
    buildLogAgentFeedbackProductionAutoSendEnableBuild,
    buildLogSalesGlsScoreboardBuild,
    buildLogSystemRegistrationSweepBuild,
    buildLogGateReliabilityRecurringBuild,
    buildLogGateReliabilityDirectVerifierBuild,
  } = buildFoundationVerifierBuildLogCloseoutEntries({
    foundationBuildLog,
    foundationBuildCloseouts,
    foundationBuildLogRegistrySource,
    ids: {
      AGENT_FEEDBACK_AUTO_SEND_CARD_ID,
      AGENT_FEEDBACK_AUTO_SEND_CLOSEOUT_KEY,
      AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CARD_ID,
      AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CLOSEOUT_KEY,
      AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID,
      AGENT_FEEDBACK_LIVE_REMINDERS_CLOSEOUT_KEY,
      AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID,
      AGENT_FEEDBACK_PRODUCTION_AUTOSEND_DRY_RUN_CLOSEOUT_KEY,
      AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CLOSEOUT_KEY,
      AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID,
      AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CLOSEOUT_KEY,
      AGENT_FEEDBACK_REMINDER_CARD_ID,
      AGENT_FEEDBACK_REMINDER_CLOSEOUT_KEY,
      AGENT_FEEDBACK_RESPONSE_NOTIFY_CARD_ID,
      AGENT_FEEDBACK_RESPONSE_NOTIFY_CLOSEOUT_KEY,
      AGENT_FEEDBACK_SEND_CARD_ID,
      AGENT_FEEDBACK_SEND_CLOSEOUT_KEY,
      AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID,
      AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CLOSEOUT_KEY,
      AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID,
      AGENT_ONBOARDING_FEEDBACK_SYSTEM_CLOSEOUT_KEY,
      AUTO_DEPLOY_ROLLBACK_CARD_ID,
      AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY,
      AVATAR_IMPORT_CARD_ID,
      AVATAR_IMPORT_CLOSEOUT_KEY,
      BRAND_STACK_CARD_ID,
      BRAND_STACK_CLOSEOUT_KEY,
      CHANGE_LOG_COMPREHENSIVE_CARD_ID,
      CHANGE_LOG_COMPREHENSIVE_CLOSEOUT_KEY,
      DAILY_EXEC_SUMMARY_CARD_ID,
      DAILY_EXEC_SUMMARY_CLOSEOUT_KEY,
      DECISION_RESTRICTED_QUEUE_CARD_ID,
      DECISION_RESTRICTED_QUEUE_CLOSEOUT_KEY,
      DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID,
      DRIVE_ACCESS_REQUEST_CARD_ID,
      DRIVE_ACCESS_REQUEST_CLOSEOUT_KEY,
      EXTRACT_RUN_HARDENING_CARD_ID,
      EXTRACT_RUN_HARDENING_CLOSEOUT_KEY,
      FOUNDATION_DONE_TEST_CARD_ID,
      FOUNDATION_DONE_TEST_CLOSEOUT_KEY,
      FOUNDATION_FOLLOWUP_CARD_CAPTURE_LITERAL: 'FOUNDATION-FOLLOWUP-CARD-CAPTURE-001',
      FOUNDATION_FOLLOWUP_CARD_CAPTURE_CARD_ID,
      FOUNDATION_FOLLOWUP_CARD_CAPTURE_CLOSEOUT_KEY,
      FOUNDATION_REVIEW_SPRINT_CARD_IDS,
      FOUNDATION_REVIEW_SPRINT_CLOSEOUT_KEY,
      FOUNDATION_SPRINT_CADENCE_CARD_ID,
      FOUNDATION_SPRINT_CADENCE_CLOSEOUT_KEY,
      FOUNDATION_SPRINT_DONE_VELOCITY_FOLLOW_UP_CARD_ID,
      FOUNDATION_SPRINT_SURFACE_FOLLOW_UP_CARD_ID,
      FOUNDATION_SPRINT_SYSTEM_CARD_ID,
      FOUNDATION_SPRINT_SYSTEM_CLOSEOUT_KEY,
      FOUNDATION_SYSTEMS_SERVICE_GROUPING_CARD_ID,
      FOUNDATION_SYSTEMS_SERVICE_GROUPING_CLOSEOUT_KEY,
      FOUNDATION_UI_COMPLETE_CARD_ID,
      FOUNDATION_UI_COMPLETE_CLOSEOUT_KEY,
      FOUNDATION_VERIFY_HEALTH_REPAIR_CARD_ID,
      FOUNDATION_VERIFY_HEALTH_REPAIR_CLOSEOUT_KEY,
      MARKETING_SOURCE_MAP_CARD_ID,
      MARKETING_SOURCE_MAP_CLOSEOUT_KEY,
      MEETING_VAULT_ACL_CARD_ID,
      MEETING_VAULT_AUTO_ENFORCEMENT_CARD_ID,
      MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY,
      PER_USER_CHANGELOG_CARD_ID,
      PER_USER_CHANGELOG_CLOSEOUT_KEY,
      PER_USER_CHANGELOG_NEXT_CARD_ID,
      PLAIN_ENGLISH_SWEEP_CARD_ID,
      PLAIN_ENGLISH_SWEEP_CLOSEOUT_KEY,
      PLAN_CRITIC_REPLACEMENT_CARD_ID,
      PLAN_CRITIC_REPLACEMENT_CLOSEOUT_KEY,
      REBUILD_PLAN_RECONCILE_CARD_ID,
      REBUILD_PLAN_RECONCILE_CLOSEOUT_KEY,
      RECENT_BUILDS_UI_CARD_ID,
      RECENT_BUILDS_UI_CLOSEOUT_KEY,
      SECURITY_BEHAVIOR_PROOF_CARD_ID,
      SECURITY_BEHAVIOR_PROOF_CLOSEOUT_KEY,
      SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
      SOURCE_COVERAGE_CLOSEOUT_CLOSEOUT_KEY,
      SOURCE_EXTRACT_GAP_FOLLOWUP_CARD_ID,
      SOURCE_EXTRACTION_COVERAGE_CARD_ID,
      SOURCE_EXTRACTION_COVERAGE_CLOSEOUT_KEY,
      SOURCE_LIFECYCLE_CARD_ID,
      SOURCE_LIFECYCLE_CLOSEOUT_KEY,
      SOURCE_LIFECYCLE_COMPLETION_CARD_ID,
      SOURCE_LIFECYCLE_COMPLETION_CLOSEOUT_KEY,
      SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID,
      SOURCE_MATURITY_GRID_CARD_ID,
      SOURCE_MATURITY_GRID_CLOSEOUT_KEY,
      STRATEGY_HUB_MEETING_READY_CARD_ID,
      STRATEGY_HUB_MEETING_READY_CLOSEOUT_KEY,
      SYNTHESIS_VERIFY_CARD_ID,
      SYNTHESIS_VERIFY_CLOSEOUT_KEY,
      SYSTEM_010_CARD_ID,
      SYSTEM_010_CLOSEOUT_KEY,
      SYSTEM_REGISTRATION_SWEEP_CARD_ID,
      SYSTEM_REGISTRATION_SWEEP_CLOSEOUT_KEY,
      TIER_BEHAVIORAL_COMPLETION_CARD_ID,
      TIER_BEHAVIORAL_COMPLETION_CLOSEOUT_KEY,
      UI_MENU_LAYOUT_POLISH_CARD_ID,
      UI_MENU_LAYOUT_POLISH_CLOSEOUT_KEY,
      VERIFICATION_RUNS_CARD_ID,
      VERIFICATION_RUNS_CLOSEOUT_KEY,
      VERIFICATION_RUNS_NEXT_CARD_ID,
      VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
      VERIFIER_BEHAVIOR_SWEEP_CLOSEOUT_KEY,
      VERIFY_GATE_TIERING_CARD_ID,
      VERIFY_GATE_TIERING_CLOSEOUT_KEY,
    },
  })
  const recentBuildsCloseoutOrchestrationVerifier = await evaluateFoundationRecentBuildsVerifierOrchestration({
    foundationBuildCloseoutValidation, foundationBuildCloseouts, foundationBuildLog, foundationFrontendSource, foundationHub,
    foundationRecentBuildsVerifierSource, foundationVerifyRootSource, packageJson, repoFileExists,
  })
  checks.push(...recentBuildsCloseoutOrchestrationVerifier.checks)
  const operatorLiveSurfaceAssuranceVerifier = await evaluateFoundationVerifierOperatorLiveSurfaceAssurance({
    currentPlan,
    currentState,
    driveContentExtractionSource,
    extractionCoverageTargets,
    extractionLaneItemShapeAudit,
    extractionRecentStaleReapedRuns,
    extractionStaleActiveRuns,
    extractionTargets,
    foundationBacklogStoreSource,
    foundationBuildCloseouts,
    foundationDbSource: foundationDbVerifierSource,
    foundationDbWithBacklogSeedSource,
    foundationFrontendSource,
    foundationHtmlSource,
    foundationHub,
    foundationJobsSource,
    foundationStrategyGoalTruthSource,
    foundationStrategyOperatingTruthSource,
    foundationSurfaceMap,
    foundationUiSource,
    foundationVerifierOperatorLiveSurfaceAssuranceSource,
    foundationVerifySource,
    intelligenceActionRouterSource,
    opsHtmlSource,
    opsHub,
    opsUiSource,
    ownersLeadSourceGovernance,
    ownersReviewQueue,
    packageJson,
    packageSource,
    repoFileExists,
    serverSource,
    sourceCrawlStoreOwnershipSource,
    staleSourceCrawlRuns,
    strategyEvidencePacketSource,
    strategicExecutionUiSource,
    strategyGoalTruthApi,
    strategyGoalTruthSnapshot,
    strategyHubV2Api,
    strategyOperatingTruthApi,
    strategyOperatingTruthSnapshot,
    strategyPreworkCoverageApi,
    strategyPreworkCoverageSnapshot,
    strategySharedCommsRouteSource,
    syncMissiveSource,
    syncSlackSource,
  })
  checks.push(...operatorLiveSurfaceAssuranceVerifier.checks)
  const sheetsQuotaHardening = (foundationHub.backlogItems || []).find(item => item.id === 'SHEETS-QUOTA-HARDENING-001') || null
  const docArchiveAuto = (foundationHub.backlogItems || []).find(item => item.id === 'DOC-ARCHIVE-AUTO-001') || null
  const researchCuration = (foundationHub.backlogItems || []).find(item => item.id === 'RESEARCH-CURATION-001') || null
  const rebuildDocsRetire = (foundationHub.backlogItems || []).find(item => item.id === 'REBUILD-DOCS-RETIRE-001') || null
  const archiveRetire = (foundationHub.backlogItems || []).find(item => item.id === 'ARCHIVE-RETIRE-001') || null
  const exceptionCuration = (foundationHub.backlogItems || []).find(item => item.id === 'EXCEPTION-CURATION-001') || null
  const doctrinePropagation = (foundationHub.backlogItems || []).find(item => item.id === 'DOCTRINE-PROPAGATION-001') || null
  const decisionAutoEmit = (foundationHub.backlogItems || []).find(item => item.id === 'DECISION-AUTO-EMIT-001') || null
  const hitListReconcile = (foundationHub.backlogItems || []).find(item => item.id === 'HIT-LIST-RECONCILE-001') || null
  const recentBuildsMultiCloseout = (foundationHub.backlogItems || []).find(item => item.id === 'RECENT-BUILDS-MULTI-CLOSEOUT-001') || null
  const fullSystemReAudit = (foundationHub.backlogItems || []).find(item => item.id === 'FULL-SYSTEM-RE-AUDIT-001') || null
  const docAuthorityIndexRepair = (foundationHub.backlogItems || []).find(item => item.id === 'DOC-AUTHORITY-INDEX-REPAIR-001') || null
  const localDocLink = (foundationHub.backlogItems || []).find(item => item.id === 'LOCAL-DOC-LINK-001') || null
  const docOtherTriage = (foundationHub.backlogItems || []).find(item => item.id === 'DOC-OTHER-TRIAGE-001') || null
  const docCategorization = (foundationHub.backlogItems || []).find(item => item.id === 'DOC-CATEGORIZATION-001') || null
  const doctrinePropagationV2 = (foundationHub.backlogItems || []).find(item => item.id === 'DOCTRINE-PROPAGATION-002') || null
  const processHooksV2 = (foundationHub.backlogItems || []).find(item => item.id === 'PROCESS-HOOKS-002') || null
  const gatePerformance = (foundationHub.backlogItems || []).find(item => item.id === 'GATE-PERFORMANCE-001') || null
  const foundationPlanReconcile = (foundationHub.backlogItems || []).find(item => item.id === FOUNDATION_PLAN_RECONCILE_CARD_ID) || null
  const connectorCredential = (foundationHub.backlogItems || []).find(item => item.id === CONNECTOR_CREDENTIAL_CARD_ID) || null
  const llmAuthAudit = (foundationHub.backlogItems || []).find(item => item.id === LLM_AUTH_AUDIT_CARD_ID) || null
  const llmAuthBudgetLabelCard = (foundationHub.backlogItems || []).find(item => item.id === LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID) || null
  const sourceExtractionGapFollowupCard = (foundationHub.backlogItems || []).find(item => item.id === SOURCE_EXTRACTION_GAP_FOLLOWUP_CARD_ID) || null
  const approvalFileIntegrity = (foundationHub.backlogItems || []).find(item => item.id === 'APPROVAL-FILE-INTEGRITY-001') || null
  const buildLogBacklogIdFix = (foundationHub.backlogItems || []).find(item => item.id === 'BUILD-LOG-BACKLOG-ID-FIX-001') || null
  const closeoutBackfill = (foundationHub.backlogItems || []).find(item => item.id === 'CLOSEOUT-BACKFILL-001') || null
  const preCommitHookInstall = (foundationHub.backlogItems || []).find(item => item.id === 'PRE-COMMIT-HOOK-INSTALL-001') || null
  const gateReliability = (foundationHub.backlogItems || []).find(item => item.id === 'GATE-RELIABILITY-001') || null
  const gateReliabilityRecurring = (foundationHub.backlogItems || []).find(item => item.id === 'GATE-RELIABILITY-002') || null
  const gateReliabilityDirectVerifier = (foundationHub.backlogItems || []).find(item => item.id === 'GATE-RELIABILITY-003') || null
  const personalWorkspaceBoundary = (foundationHub.backlogItems || []).find(item => item.id === 'PERSONAL-WORKSPACE-BOUNDARY-001') || null
  const doctrinePropagationV3 = (foundationHub.backlogItems || []).find(item => item.id === 'DOCTRINE-PROPAGATION-003') || null
  const decisionAutoEmitV2 = (foundationHub.backlogItems || []).find(item => item.id === 'DECISION-AUTO-EMIT-002') || null
  const ceoDashboardPattern = (foundationHub.backlogItems || []).find(item => item.id === 'CEO-DASHBOARD-PATTERN-001') || null
  const foundation1100ReviewCards = FOUNDATION_REVIEW_SPRINT_CARD_IDS.map(id =>
    (foundationHub.backlogItems || []).find(item => item.id === id) || null
  )
  const plainEnglishSweep = (foundationHub.backlogItems || []).find(item => item.id === PLAIN_ENGLISH_SWEEP_CARD_ID) || null
  const uiMenuLayoutPolish = (foundationHub.backlogItems || []).find(item => item.id === UI_MENU_LAYOUT_POLISH_CARD_ID) || null
  const recentBuildsUi = (foundationHub.backlogItems || []).find(item => item.id === RECENT_BUILDS_UI_CARD_ID) || null
  const changeLogComprehensive = (foundationHub.backlogItems || []).find(item => item.id === CHANGE_LOG_COMPREHENSIVE_CARD_ID) || null
  const dailyExecSummary = (foundationHub.backlogItems || []).find(item => item.id === DAILY_EXEC_SUMMARY_CARD_ID) || null
  const sourceLifecycle = (foundationHub.backlogItems || []).find(item => item.id === SOURCE_LIFECYCLE_CARD_ID) || null
  const sourceLifecycleCompletion = (foundationHub.backlogItems || []).find(item => item.id === SOURCE_LIFECYCLE_COMPLETION_CARD_ID) || null
  const sourceLifecycleDynamicCounts = (foundationHub.backlogItems || []).find(item => item.id === SOURCE_LIFECYCLE_DYNAMIC_COUNTS_CARD_ID) || null
  const synthesisVerify = (foundationHub.backlogItems || []).find(item => item.id === SYNTHESIS_VERIFY_CARD_ID) || null
  const extractRunHardening = (foundationHub.backlogItems || []).find(item => item.id === EXTRACT_RUN_HARDENING_CARD_ID) || null
  const driveAccessRequest = (foundationHub.backlogItems || []).find(item => item.id === DRIVE_ACCESS_REQUEST_CARD_ID) || null
  const sprintProcessRepair = (foundationHub.backlogItems || []).find(item => item.id === 'SPRINT-PROCESS-REPAIR-001') || null
  const verifierSprintIndependence = (foundationHub.backlogItems || []).find(item => item.id === 'VERIFIER-SPRINT-INDEPENDENCE-001') || null
  const verifierModularSplit = (foundationHub.backlogItems || []).find(item => item.id === 'VERIFIER-MODULAR-SPLIT-001') || null
  const processRootVsPatch = (foundationHub.backlogItems || []).find(item => item.id === 'PROCESS-ROOT-VS-PATCH-001') || null
  const foundationSprintSystem = (foundationHub.backlogItems || []).find(item => item.id === FOUNDATION_SPRINT_SYSTEM_CARD_ID) || null
  const foundationSprintCadence = (foundationHub.backlogItems || []).find(item => item.id === FOUNDATION_SPRINT_CADENCE_CARD_ID) || null
  const currentSprintDynamicTruth = (foundationHub.backlogItems || []).find(item => item.id === CURRENT_SPRINT_DYNAMIC_TRUTH_CARD_ID) || null
  const sprintStageGate = (foundationHub.backlogItems || []).find(item => item.id === SPRINT_STAGE_GATE_CARD_ID) || null
  const foundationSprintReview = (foundationHub.backlogItems || []).find(item => item.id === FOUNDATION_SPRINT_REVIEW_CARD_ID) || null
  const verifyGateTiering = (foundationHub.backlogItems || []).find(item => item.id === VERIFY_GATE_TIERING_CARD_ID) || null
  const rebuildPlanReconcile = (foundationHub.backlogItems || []).find(item => item.id === REBUILD_PLAN_RECONCILE_CARD_ID) || null
  const planCriticReplacement = (foundationHub.backlogItems || []).find(item => item.id === PLAN_CRITIC_REPLACEMENT_CARD_ID) || null
  const securityBehaviorProof = (foundationHub.backlogItems || []).find(item => item.id === SECURITY_BEHAVIOR_PROOF_CARD_ID) || null
  const verifierBehaviorSweep = (foundationHub.backlogItems || []).find(item => item.id === VERIFIER_BEHAVIOR_SWEEP_CARD_ID) || null
  const strategyHubMeetingReady = (foundationHub.backlogItems || []).find(item => item.id === STRATEGY_HUB_MEETING_READY_CARD_ID) || null
  const avatarImport = (foundationHub.backlogItems || []).find(item => item.id === AVATAR_IMPORT_CARD_ID) || null
  const autoDeployRollback = (foundationHub.backlogItems || []).find(item => item.id === AUTO_DEPLOY_ROLLBACK_CARD_ID) || null
  const sourceMaturityGrid = (foundationHub.backlogItems || []).find(item => item.id === SOURCE_MATURITY_GRID_CARD_ID) || null
  const atomFlowAutoDemotion = (foundationHub.backlogItems || []).find(item => item.id === ATOM_FLOW_AUTO_DEMOTION_CARD_ID) || null
  const extractRunHardeningExecution = (foundationHub.backlogItems || []).find(item => item.id === EXTRACT_RUN_HARDENING_EXECUTION_CARD_ID) || null
  const researchLanePurge = (foundationHub.backlogItems || []).find(item => item.id === RESEARCH_LANE_PURGE_CARD_ID) || null
  const sourceExtractionCoverage = (foundationHub.backlogItems || []).find(item => item.id === SOURCE_EXTRACTION_COVERAGE_CARD_ID) || null
  const sourceCoverageCloseout = (foundationHub.backlogItems || []).find(item => item.id === SOURCE_COVERAGE_CLOSEOUT_CARD_ID) || null
  const sourceExtractionGapFollowup = (foundationHub.backlogItems || []).find(item => item.id === SOURCE_EXTRACT_GAP_FOLLOWUP_CARD_ID) || null
  const sourceMaturityGapFollowup = (foundationHub.backlogItems || []).find(item => item.id === SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID) || null
  const marketingSourceMap = (foundationHub.backlogItems || []).find(item => item.id === MARKETING_SOURCE_MAP_CARD_ID) || null
  const brandStack = (foundationHub.backlogItems || []).find(item => item.id === BRAND_STACK_CARD_ID) || null
  const tierBehavioralCompletion = (foundationHub.backlogItems || []).find(item => item.id === TIER_BEHAVIORAL_COMPLETION_CARD_ID) || null
  const verificationRuns = (foundationHub.backlogItems || []).find(item => item.id === VERIFICATION_RUNS_CARD_ID) || null
  const perUserChangelog = (foundationHub.backlogItems || []).find(item => item.id === PER_USER_CHANGELOG_CARD_ID) || null
  const decisionRestrictedQueue = (foundationHub.backlogItems || []).find(item => item.id === DECISION_RESTRICTED_QUEUE_CARD_ID) || null
  const foundationUiComplete = (foundationHub.backlogItems || []).find(item => item.id === FOUNDATION_UI_COMPLETE_CARD_ID) || null
  const foundationSprintSurfaceFollowUp = (foundationHub.backlogItems || []).find(item => item.id === FOUNDATION_SPRINT_SURFACE_FOLLOW_UP_CARD_ID) || null
  const foundationSprintDoneVelocity = (foundationHub.backlogItems || []).find(item => item.id === FOUNDATION_SPRINT_DONE_VELOCITY_FOLLOW_UP_CARD_ID) || null
  const meetingVaultAcl = (foundationHub.backlogItems || []).find(item => item.id === MEETING_VAULT_ACL_CARD_ID) || null
  const meetingVaultAutoEnforcement = (foundationHub.backlogItems || []).find(item => item.id === MEETING_VAULT_AUTO_ENFORCEMENT_CARD_ID) || null
  const planCriticSelfReview = evaluatePlanCriticPlan({
    planText: planCriticPlanSource,
    card: planCriticReplacement || { id: PLAN_CRITIC_REPLACEMENT_CARD_ID, priority: 'P0' },
    changedFiles: [
      'lib/process-plan-critic.js',
      PLAN_CRITIC_REPLACEMENT_SCRIPT_PATH,
      PLAN_CRITIC_REPLACEMENT_PLAN_PATH,
      PLAN_CRITIC_DECISION_TREE_PATH,
      'lib/foundation-current-sprint.js',
      'scripts/foundation-verify.mjs',
    ],
  })
  const {
    securityBehaviorPlanReview,
    strategyHubMeetingReadyPlanReview,
    avatarImportPlanReview,
    autoDeployRollbackPlanReview,
    sourceMaturityGridPlanReview,
    sourceExtractionCoveragePlanReview,
    sourceCoverageCloseoutPlanReview,
    marketingSourceMapPlanReview,
    brandStackPlanReview,
    tierBehavioralCompletionPlanReview,
    verificationRunsPlanReview,
    perUserChangelogPlanReview,
    decisionRestrictedQueuePlanReview,
    foundationUiCompletePlanReview,
  } = buildFoundationVerifierPlanReviews({
    cards: {
      securityBehaviorProof,
      strategyHubMeetingReady,
      avatarImport,
      autoDeployRollback,
      sourceMaturityGrid,
      sourceExtractionCoverage,
      sourceCoverageCloseout,
      marketingSourceMap,
      brandStack,
      tierBehavioralCompletion,
      verificationRuns,
      perUserChangelog,
      decisionRestrictedQueue,
      foundationUiComplete,
    },
    planSources: {
      securityBehaviorProofPlanSource,
      strategyHubMeetingReadyPlanSource,
      avatarImportPlanSource,
      autoDeployRollbackPlanSource,
      sourceMaturityGridPlanSource,
      sourceExtractionCoveragePlanSource,
      sourceCoverageCloseoutPlanSource,
      marketingSourceMapPlanSource,
      brandStackPlanSource,
      tierBehavioralCompletionPlanSource,
      verificationRunsPlanSource,
      perUserChangelogPlanSource,
      decisionRestrictedQueuePlanSource,
      foundationUiCompletePlanSource,
    },
  })
  const meetingVaultAutoEnforcementClosed = meetingVaultAutoEnforcement?.lane === 'done' &&
    meetingVaultAcl?.lane === 'done' &&
    String(meetingVaultAutoEnforcement?.statusNote || '').includes(MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY) &&
    String(meetingVaultAcl?.statusNote || '').includes(MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY) &&
    latestMeetingVaultAutoEnforcementRun?.status === 'ready' &&
    latestMeetingVaultAutoEnforcementRun?.canCloseMeetingVaultAcl === true &&
    buildLogMeetingVaultAutoEnforcementBuild?.operatorCloseout === true
  const foundationDoneTest = (foundationHub.backlogItems || []).find(item => item.id === FOUNDATION_DONE_TEST_CARD_ID) || null
  const system010GhostCloseout = (foundationHub.backlogItems || []).find(item => item.id === SYSTEM_010_CARD_ID) || null
  const foundationFollowupCardCapture = (foundationHub.backlogItems || []).find(item => item.id === FOUNDATION_FOLLOWUP_CARD_CAPTURE_CARD_ID) || null
  const foundationSystemsServiceGrouping = (foundationHub.backlogItems || []).find(item => item.id === FOUNDATION_SYSTEMS_SERVICE_GROUPING_CARD_ID) || null
  const salesGlsScoreboard = (foundationHub.backlogItems || []).find(item => item.id === 'SALES-GLS-SCOREBOARD-V1') || null
  const systemRegistrationSweep = (foundationHub.backlogItems || []).find(item => item.id === SYSTEM_REGISTRATION_SWEEP_CARD_ID) || null
  const agentFeedbackOrchestrationVerifier = await evaluateFoundationAgentFeedbackVerifierOrchestration({
    repoRoot,
    sourceOfTruth,
    foundationHub,
    foundationBuildLog,
    foundationBuildCloseouts,
    ownersReviewQueue,
    opsHub,
    currentPlan,
    currentState,
    dailyExecSummaryStatus,
    packageJson,
    packageSource,
    readRepoFile,
    repoFileExists,
    moduleSource: foundationAgentFeedbackVerifierSource,
    foundationVerifyRootSource,
    sources: {
      agentFeedbackAutoSendSource,
      agentFeedbackClickUpSource,
      agentFeedbackEmailSource,
      agentFeedbackHtmlSource,
      agentFeedbackProductionAutoSendDryRunSource,
      agentFeedbackRealUserSubmitRepairSource,
      agentFeedbackReminderSource,
      agentFeedbackResponseNotifySource,
      agentFeedbackRouteSource,
      agentFeedbackSendSource,
      agentFeedbackSource,
      agentFeedbackSteveFullLoopTestSource,
      agentFeedbackStoreOwnershipSource,
      agentFeedbackUiSource,
      agentRosterReviewSource,
      foundationDbSource: foundationDbVerifierSource,
      foundationFrontendSource,
      foundationJobsSource,
      foundationVerifyHealthRepairSource,
      googleDelegatedSource,
      opsUiSource,
      serverRouteSource,
    },
    buildLog: {
      buildLogAgentFeedbackAutoSendBuild,
      buildLogAgentFeedbackCompanyEmailPolicyBuild,
      buildLogAgentFeedbackLiveRemindersBuild,
      buildLogAgentFeedbackProductionAutoSendEnableBuild,
      buildLogAgentFeedbackRealUserSubmitRepairBuild,
      buildLogAgentFeedbackReminderBuild,
      buildLogAgentFeedbackResponseNotifyBuild,
      buildLogAgentFeedbackSendBuild,
      buildLogAgentFeedbackSteveFullLoopTestBuild,
      buildLogAgentOnboardingFeedbackSystemBuild,
      buildLogFoundationVerifyHealthRepairBuild,
    },
  })
  checks.push(...agentFeedbackOrchestrationVerifier.checks)
  const foundationFollowupCards = FOUNDATION_FOLLOWUP_BUILD_ORDER.map(id =>
    (foundationHub.backlogItems || []).find(item => item.id === id) || null
  )
  const sourceLifecycleDone = sourceLifecycle?.lane === 'done' &&
    /source-lifecycle-expansion-v1/.test(sourceLifecycle?.statusNote || '')
  const phaseGNextCard = foundationHub.foundation1100Review?.phaseGReadiness?.nextPlanCard || null
  const phaseGTrack2Complete = (sourceLifecycleDone && phaseGNextCard === null) || currentSprintActiveBlockerCardId === STYLESHEET_MONOLITH_SPLIT_CARD_ID
  const phaseGReadinessCompletedCards = Array.isArray(foundationHub.foundation1100Review?.phaseGReadiness?.completedCards)
    ? foundationHub.foundation1100Review.phaseGReadiness.completedCards
    : []
  const phaseGTrack2ReportedComplete = phaseGTrack2Complete ||
    (phaseGNextCard === null && phaseGReadinessCompletedCards.includes('SOURCE-LIFECYCLE-EXPANSION-001'))
  const hardCheckpointTier0Ids = [
    'PERSONAL-WORKSPACE-BOUNDARY-001',
    'CEO-DASHBOARD-PATTERN-001',
    'APPROVAL-FILE-INTEGRITY-001',
    'DOCTRINE-PROPAGATION-003',
    'DECISION-AUTO-EMIT-002',
    'BUILD-LOG-BACKLOG-ID-FIX-001',
    'PRE-COMMIT-HOOK-INSTALL-001',
    'CLOSEOUT-BACKFILL-001',
  ]
  const hardCheckpointTier0Cards = hardCheckpointTier0Ids.map(id =>
    (foundationHub.backlogItems || []).find(item => item.id === id) || null
  )
  const docAuthority = (foundationHub.backlogItems || []).find(item => item.id === 'DOC-AUTHORITY-001') || null
  const dataStructuredContracts = (foundationHub.backlogItems || []).find(item => item.id === 'DATA-004') || null
  const source021 = (foundationHub.backlogItems || []).find(item => item.id === 'SOURCE-021') || null
  const source021Proof = (foundationHub.backlogItems || []).find(item => item.id === 'SOURCE-021-PROOF-001') || null
  const security001 = (foundationHub.backlogItems || []).find(item => item.id === 'SECURITY-001') || null
  const security002 = (foundationHub.backlogItems || []).find(item => item.id === 'SECURITY-002') || null
  const security006 = (foundationHub.backlogItems || []).find(item => item.id === 'SECURITY-006') || null
  const doctrinePropagationText = [
    doctrinePropagation?.summary,
    doctrinePropagation?.whyItMatters,
    doctrinePropagation?.nextAction,
    doctrinePropagation?.statusNote,
  ].filter(Boolean).join('\n')
  const decisionAutoEmitText = [
    decisionAutoEmit?.summary,
    decisionAutoEmit?.whyItMatters,
    decisionAutoEmit?.nextAction,
    decisionAutoEmit?.statusNote,
  ].filter(Boolean).join('\n')
  const docArchiveAutoText = [
    docArchiveAuto?.summary,
    docArchiveAuto?.whyItMatters,
    docArchiveAuto?.nextAction,
    docArchiveAuto?.statusNote,
  ].filter(Boolean).join('\n')
  const researchCurationText = [
    researchCuration?.summary,
    researchCuration?.whyItMatters,
    researchCuration?.nextAction,
    researchCuration?.statusNote,
  ].filter(Boolean).join('\n')
  const rebuildDocsRetireText = [
    rebuildDocsRetire?.summary,
    rebuildDocsRetire?.whyItMatters,
    rebuildDocsRetire?.nextAction,
    rebuildDocsRetire?.statusNote,
  ].filter(Boolean).join('\n')
  const archiveRetireText = [
    archiveRetire?.summary,
    archiveRetire?.whyItMatters,
    archiveRetire?.nextAction,
    archiveRetire?.statusNote,
  ].filter(Boolean).join('\n')
  const exceptionCurationText = [
    exceptionCuration?.summary,
    exceptionCuration?.whyItMatters,
    exceptionCuration?.nextAction,
    exceptionCuration?.statusNote,
  ].filter(Boolean).join('\n')
  const hitListReconcileText = [
    hitListReconcile?.summary,
    hitListReconcile?.whyItMatters,
    hitListReconcile?.nextAction,
    hitListReconcile?.statusNote,
  ].filter(Boolean).join('\n')
  const recentBuildsMultiCloseoutText = [
    recentBuildsMultiCloseout?.summary,
    recentBuildsMultiCloseout?.whyItMatters,
    recentBuildsMultiCloseout?.nextAction,
    recentBuildsMultiCloseout?.statusNote,
  ].filter(Boolean).join('\n')
  const fullSystemReAuditText = [
    fullSystemReAudit?.summary,
    fullSystemReAudit?.whyItMatters,
    fullSystemReAudit?.nextAction,
    fullSystemReAudit?.statusNote,
  ].filter(Boolean).join('\n')
  const processTrustOrchestrationVerifier = await evaluateFoundationProcessTrustVerifierOrchestration({
    activeFoundationSprint: activeFoundationSprintForExtractionRuntime,
    currentPlan,
    currentState,
    devProcessAuditSource,
    foundationBuildCloseouts,
    foundationFrontendSource,
    foundationHub,
    foundationProcessTrustVerifierSource,
    foundationVerifySource,
    foundationWorkerSource,
    missingArtifactClaims,
    packageJson,
    packageSource,
    postShipFanoutApproval,
    postShipFanoutDoc,
    postShipFanoutScriptSource,
    postShipFanoutSource,
    processFanoutApproval,
    processFanoutCheckDoc,
    processFanoutCheckSource,
    processHooksApproval,
    processShipCheckDoc,
    processShipCheckSource,
    repoFileExists,
    serverRouteSource,
    serverSource,
    verifierArtifactExistsApproval,
    verifierDoneCoverageApproval,
    verifierExceptionValidation,
    workerCodeTrustApproval,
    workerRunningShortCommit,
  })
  checks.push(...processTrustOrchestrationVerifier.checks)
  const cleanupControlAssuranceVerifier = await evaluateFoundationVerifierCleanupControlAssurance({
    DOC_INVENTORY_CATEGORIES,
    DOCTRINE_PROPAGATION_SOURCES,
    GATE_RELIABILITY_DIRECT_VERIFIER_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    GATE_RELIABILITY_RECURRING_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    FOUNDATION_PLAN_RECONCILE_CARD_ID,
    FOUNDATION_PLAN_RECONCILE_CLOSEOUT_KEY,
    PHASE_1_ENFORCEMENT_CARD_IDS,
    PHASE_1_ENFORCEMENT_PLAN_REF,
    PHASE_1_ENFORCEMENT_PLAN_SHA256,
    PROTECTED_FOUNDATION_PATH_PATTERNS,
    approvalFileIntegrity,
    approvalIntegrityDoc,
    approvalIntegritySource,
    approvalIntegritySynthetic,
    approvalLegacyLedger,
    archiveIndexSource,
    archiveRetire,
    archiveRetireApproval,
    archiveRetireManifest,
    archiveRetireStatus,
    archiveRetireText,
    backlogHygieneApi,
    backlogHygieneScriptSource,
    buildCeoDashboardPatternStatus,
    buildDecisionAutoEmitSafetyProof,
    buildDoctrinePropagationStatus,
    buildLogBacklogIdFix,
    buildLogFoundationControlBuild,
    buildLogFullSystemReAuditBuild,
    buildLogGatePerformanceBuild,
    buildLogGateReliabilityDirectVerifierBuild,
    buildLogGateReliabilityRecurringBuild,
    buildLogOwnershipProof,
    buildLogPhase1EnforcementBuild,
    buildLogPlanReconcileBuild,
    buildLogRecentMultiCloseoutBuild,
    buildLogWaveCleanupABuild,
    buildLogWaveCleanupBBuild,
    buildPersonalWorkspaceBoundaryStatus,
    buildSyntheticGateReliabilityProof,
    ceoDashboardPattern,
    ceoDashboardPatternDoc,
    ceoDashboardPatternSource,
    closeoutBackfill,
    closeoutBackfillDoc,
    currentPlan,
    currentState,
    decisionAutoEmitDoc,
    decisionAutoEmitScriptSource,
    decisionAutoEmitSource,
    decisionAutoEmitV2,
    docArchiveAuto,
    docArchiveAutoApproval,
    docArchiveAutoText,
    docArchiveCleanupStatus,
    docArchiveManifest,
    docAuthorityIndexRepair,
    docAuthorityIndexRepairApproval,
    docCategorization,
    docCategorizationApproval,
    docCategorizationSource,
    docOtherTriage,
    docOtherTriageApproval,
    docOtherTriageSource,
    docsIndexSource,
    docsReadmeSource,
    doctrinePropagationDoc,
    doctrinePropagationScriptSource,
    doctrinePropagationSource,
    doctrinePropagationV2,
    doctrinePropagationV2Approval,
    doctrinePropagationV3,
    exceptionCuration,
    exceptionCurationApproval,
    exceptionCurationStatus,
    exceptionCurationText,
    foundationBuildCloseouts,
    foundationBuildLog,
    foundationBuildLogSource,
    foundationControlApprovalRefs,
    foundationControlApprovalValidations,
    foundationControlApprovedPlan,
    foundationCurrentStateRendererSource,
    foundationCurrentStateSummarySource,
    foundationFrontendSource,
    foundationHtmlSource,
    foundationHub,
    foundationPlanReconcile,
    foundationPlanReconcileCloseout,
    foundationPlanReconcileCurrentItem,
    foundationUiSource,
    foundationVerifierCleanupControlAssuranceSource,
    foundationVerifySource,
    fullSystemReAudit,
    fullSystemReAuditApproval,
    fullSystemReAuditSource,
    fullSystemReAuditText,
    gatePerformance,
    gatePerformanceApproval,
    gateReliability,
    gateReliabilityDirectVerifier,
    gateReliabilityDirectVerifierApprovalValidation,
    gateReliabilityDirectVerifierApprovedPlan,
    gateReliabilityRecurring,
    gateReliabilityRecurringApprovalValidation,
    gateReliabilityRecurringApprovedPlan,
    gateReliabilityScriptSource,
    gateReliabilitySource,
    getActionRouterSnapshot,
    getFoundationDbConstraintAudit,
    gitHookInstallStatus,
    gitHookScopeProof,
    gitHooksDoc,
    hardCheckpointTier0Cards,
    hardCheckpointTier0Ids,
    historicalCardHasVerifiedCloseout,
    hitListReconcile,
    hitListReconcileApproval,
    hitListReconcileStatus,
    hitListReconcileText,
    hitListSnapshot,
    localDocLink,
    localDocLinkApproval,
    localDocLinkDoc,
    localDocNonAllowlistedResponse,
    localDocNonLocalResponse,
    localDocSuccessResponse,
    localDocTraversalResponse,
    packageJson,
    packageSource,
    personalWorkspaceBoundary,
    personalWorkspaceBoundaryDoc,
    personalWorkspaceBoundaryScriptSource,
    personalWorkspaceBoundarySource,
    phase1ApprovalValidations,
    phase1ApprovedPlan,
    phaseDCleanupLibSource,
    phaseDCleanupSource,
    postShipFanoutScriptSource,
    preCommitHookInstall,
    processFanoutCheckSource,
    processFoundationShipDoc,
    processFoundationShipSource,
    processGitHooksSource,
    processHooksV2,
    processHooksV2Approval,
    processShipCheckSource,
    rebuildDocRetireManifest,
    rebuildDocsRetire,
    rebuildDocsRetireApproval,
    rebuildDocsRetireText,
    recentBuildsMultiCloseout,
    recentBuildsMultiCloseoutApproval,
    recentBuildsMultiCloseoutText,
    repoFileExists,
    repoRoot,
    researchCuration,
    researchCurationApproval,
    researchCurationStatus,
    researchCurationText,
    serverRouteSource,
    serverSource,
    systemInventory,
    verifierExceptionCuration,
    verifyPrivateMemorySyntheticProbe,
    verifyProcessFoundationShipRefusesMissingArgs,
  })
  checks.push(...cleanupControlAssuranceVerifier.checks)
  const phaseGOperatorCloseoutVerifier = evaluateFoundationVerifierPhaseGOperatorCloseout({
    buildLogChangeLogComprehensiveBuild,
    buildLogDailyExecSummaryBuild,
    buildLogFoundation1100ReviewBuild,
    buildLogPlainEnglishSweepBuild,
    buildLogRecentBuildsUiBuild,
    buildLogSourceLifecycleBuild,
    buildLogUiMenuLayoutPolishBuild,
    changeLogComprehensive,
    changeLogComprehensiveApprovalValidation,
    changeLogComprehensiveApprovedPlan,
    changeLogComprehensiveBaseline,
    changeLogComprehensiveManualReview,
    changeLogComprehensiveStatus,
    currentPlan,
    currentState,
    dailyExecSummary,
    dailyExecSummaryApprovalValidation,
    dailyExecSummaryApprovedPlan,
    dailyExecSummaryBaseline,
    dailyExecSummaryManualReview,
    dailyExecSummaryStatus,
    foundation1100Artifact,
    foundation1100ReviewApprovalValidations,
    foundation1100ReviewApprovedPlan,
    foundation1100ReviewCards,
    foundation1100ReviewStatus,
    foundationBuildLog,
    foundationChangeLog,
    foundationChangesApi,
    foundationDailySummary,
    foundationFrontendSource,
    foundationHtmlSource,
    foundationHub,
    foundationSourceLifecycle,
    foundationStylesSource,
    foundationVerifySource: verifierCoverageSource,
    packageSource,
    phaseGNextCard,
    phaseGTrack2Complete,
    phaseGTrack2ReportedComplete,
    plainEnglishSweep,
    plainEnglishSweepApprovalValidation,
    plainEnglishSweepApprovedPlan,
    plainEnglishSweepArtifactSource,
    plainEnglishSweepManualReview,
    plainEnglishSweepStatus,
    recentBuildsUi,
    recentBuildsUiApprovalValidation,
    recentBuildsUiApprovedPlan,
    recentBuildsUiBaseline,
    recentBuildsUiManualReview,
    recentBuildsUiStatus,
    sourceLifecycle,
    sourceLifecycleApprovalValidation,
    sourceLifecycleApprovedPlan,
    sourceLifecycleBaseline,
    sourceLifecycleManualReview,
    sourceLifecycleStatus,
    sourceOfTruth,
    uiMenuLayoutPolish,
    uiMenuLayoutPolishApprovalValidation,
    uiMenuLayoutPolishApprovedPlan,
    uiMenuLayoutPolishBaseline,
    uiMenuLayoutPolishManualReview,
    uiMenuLayoutPolishStatus,
  })
  checks.push(...phaseGOperatorCloseoutVerifier.checks)
  const readinessBlockerCloseoutVerifier = await evaluateFoundationVerifierReadinessBlockerCloseout({
    activeFoundationSprint,
    buildLogDriveAccessRequestBuild,
    buildLogExtractRunHardeningBuild,
    buildLogMeetingVaultAutoEnforcementBuild,
    buildLogSourceLifecycleCompletionBuild,
    buildLogSynthesisVerifyBuild,
    currentPlan,
    currentSprintItemsById,
    currentState,
    driveAccessPreflightSource,
    driveAccessRequest,
    driveAccessRequestApproval,
    driveAccessRequestApprovalValidation,
    driveAccessRequestDocSource,
    driveAccessRequestPlanSource,
    driveAccessRequestScriptSource,
    driveMeetingVaultStoreOwnershipSource,
    extractRunHardening,
    extractRunHardeningApproval,
    extractRunHardeningApprovalValidation,
    extractRunHardeningDocSource,
    extractRunHardeningPlanSource,
    extractRunHardeningScriptSource,
    extractRunHardeningSource,
    extractionTargetSource,
    foundationBuildCloseouts,
    foundationDoneTestReadinessStatus,
    foundationDoneTestRegistrySource,
    foundationFrontendSource,
    foundationHub,
    foundationVerifySource: verifierCoverageSource,
    foundationWorkerSource,
    intelligenceActionRouterSource,
    intelligenceSynthesisSource,
    latestDriveAccessPreflightRun,
    latestMeetingVaultAclAudit,
    latestMeetingVaultAutoEnforcementRun,
    meetingVaultAcl,
    meetingVaultAclDocSource,
    meetingVaultAclScriptSource,
    meetingVaultAclSource,
    meetingVaultAutoEnforcement,
    meetingVaultAutoEnforcementApproval,
    meetingVaultAutoEnforcementApprovalValidation,
    meetingVaultAutoEnforcementClosed,
    meetingVaultAutoEnforcementDocSource,
    meetingVaultAutoEnforcementPlanSource,
    meetingVaultAutoEnforcementScriptSource,
    meetingVaultAutoEnforcementSource,
    meetingVaultNoDuplicateGoogleDocProof,
    mirrorMeetingArchiveToDriveSource,
    packageJson,
    repoFileExists,
    serverRouteSource,
    sourceCrawlStoreOwnershipSource,
    sourceLifecycleCompletion,
    sourceLifecycleCompletionApproval,
    sourceLifecycleCompletionApprovalValidation,
    sourceLifecycleCompletionDocSource,
    sourceLifecycleCompletionPlanSource,
    sourceLifecycleCompletionRegistrySource,
    sourceLifecycleCompletionScriptSource,
    sourceLifecycleCompletionStatus,
    sourceLifecycleDynamicCounts,
    sourceLifecycleDynamicCountsApproval,
    sourceLifecycleDynamicCountsApprovalValidation,
    sourceLifecycleDynamicCountsPlanSource,
    sourceLifecycleDynamicCountsScriptSource,
    sourceLifecycleDynamicCountsSource,
    syncMeetingNotesArchiveSource,
    synthesisVerify,
    synthesisVerifyApproval,
    synthesisVerifyApprovalValidation,
    synthesisVerifyDocSource,
    synthesisVerifyPlanSource,
    synthesisVerifyRegistrySource,
    synthesisVerifyScriptSource,
    syntheticDriveAccessPreflight,
    syntheticMeetingVaultAcl,
    syntheticMeetingVaultAutoEnforcement,
  })
  checks.push(...readinessBlockerCloseoutVerifier.checks)
  const sprintGateProgressionVerifier = evaluateFoundationVerifierSprintGateProgression({
    activeSprintAtOrPast,
    activeSprintCompleteReview,
    buildLogFoundationSprintCadenceBuild,
    buildLogFoundationSprintSystemBuild,
    buildLogPlanCriticReplacementBuild,
    buildLogRebuildPlanReconcileBuild,
    buildLogSecurityBehaviorProofBuild,
    buildLogVerifierBehaviorSweepBuild,
    buildLogVerifyGateTieringBuild,
    currentPlan,
    currentState,
    currentStateMentionsActiveBlockerOrLater,
    foundationCurrentSprintSource,
    foundationCurrentSprintStatus,
    foundationCurrentSprintVerifierSource,
    foundationDbSource: foundationDbVerifierSource,
    foundationFrontendSource,
    foundationHub,
    foundationSprintCadence,
    foundationSprintCadenceApproval,
    foundationSprintCadenceApprovalValidation,
    foundationSprintCadenceDocSource,
    foundationSprintCadencePlanSource,
    foundationSprintCadenceScriptSource,
    foundationSprintCaptureSource,
    foundationSprintSystem,
    foundationSprintSystemApproval,
    foundationSprintSystemApprovalValidation,
    foundationSprintSystemDocSource,
    foundationSprintSystemPlanSource,
    foundationSprintSystemScriptSource,
    foundationSprintDoneVelocity,
    foundationSprintSurfaceFollowUp,
    foundationStylesSource,
    foundationVerifySource: verifierCoverageSource,
    meetingVaultAcl,
    meetingVaultAutoEnforcementClosed,
    packageJson,
    planCriticApproval,
    planCriticApprovalValidation,
    planCriticDecisionTreeSource,
    planCriticPlanSource,
    planCriticReplacement,
    planCriticScriptSource,
    planCriticSelfReview,
    planCriticSource,
    planCriticSynthetic,
    processGitHooksSource,
    rebuildPlanReconcile,
    rebuildPlanReconcileApproval,
    rebuildPlanReconcileApprovalValidation,
    rebuildPlanReconcilePlanSource,
    rebuildPlanReconcileScriptSource,
    securityBehaviorPlanReview,
    securityBehaviorProof,
    securityBehaviorProofApproval,
    securityBehaviorProofApprovalValidation,
    securityBehaviorProofPlanSource,
    securityBehaviorProofScriptSource,
    securityBehaviorProofSource,
    securityBehaviorProofSynthetic,
    serverRouteSource,
    syntheticFoundationSprintProof,
    verifierBehaviorSweep,
    verifierBehaviorSweepApproval,
    verifierBehaviorSweepApprovalValidation,
    verifierBehaviorSweepPlanSource,
    verifierBehaviorSweepScriptSource,
    verifierBehaviorSweepSource,
    verifierBehaviorSweepSynthetic,
    verifyGateTiering,
    verifyGateTieringPlanSource,
    verifyGateTieringScriptSource,
    verifyGateTieringSource,
    verifyGateTieringSynthetic,
    foundationSprintSystemSummaryMarker: FOUNDATION_SPRINT_SYSTEM_SUMMARY_MARKER,
    foundationSprintCadenceSummaryMarker: FOUNDATION_SPRINT_CADENCE_SUMMARY_MARKER,
  })
  const currentSprintVerifier = sprintGateProgressionVerifier.currentSprintVerifier
  checks.push(...sprintGateProgressionVerifier.checks)
  const sourceOnceOverProgressionVerifier = evaluateFoundationVerifierSourceOnceOverProgressionOrchestration({
    activeSprintAtOrPast,
    avatarRegistryReadmeSource,
    currentPlan,
    currentState,
    currentStateMentionsActiveBlockerOrLater,
    extractRunHardening,
    foundationBrandStack,
    foundationBuildCloseouts,
    foundationCurrentSprintSource,
    foundationCurrentSprintStatus,
    foundationDbWithBacklogSeedSource,
    foundationFrontendSource,
    foundationHub,
    foundationJobsSource,
    foundationMarketingSourceMap,
    foundationPerUserChangelog,
    foundationRestrictedDecisionQueue,
    foundationSourceCoverageCloseout,
    foundationSourceExtractionCoverage,
    foundationSourceLifecycle,
    foundationSourceMaturityGrid,
    foundationSourceRoutesSource,
    foundationStylesSource,
    foundationTierBehavioralCompletion,
    foundationUiComplete,
    foundationUiCompleteApproval,
    foundationUiCompleteApprovalValidation,
    foundationUiCompletePlanReview,
    foundationUiCompletePlanSource,
    foundationUiCompleteScriptSource,
    foundationUiCompleteSource,
    foundationUiCompleteSynthetic,
    foundationVerificationRuns,
    foundationVerifySource,
    marketmastersStrategySource,
    marketingSourceMapNoteSource,
    packageJson,
    securityAccessSource,
    serverRouteSource,
    sharedCandidateExtractionSource,
    sourceCrawlStoreOwnershipSource,
    sourceExtractionGapFollowup,
    sourceMaturityGapFollowup,
    sourceOnceOverCardsHaveVerifiedCloseouts,
    strategicExecutionHtmlSource,
    strategicExecutionUiSource,
    strategySharedCommsRouteSource,
    autoDeployRollbackBundle: { autoDeployRollback, autoDeployRollbackApproval, autoDeployRollbackApprovalValidation, autoDeployRollbackPlanReview, autoDeployRollbackPlanSource, autoDeployRollbackRunnerSource, autoDeployRollbackScriptSource, autoDeployRollbackSource, autoDeployRollbackSynthetic, buildLogAutoDeployRollbackBuild },
    avatarImportBundle: { avatarImport, avatarImportApproval, avatarImportApprovalValidation, avatarImportPlanReview, avatarImportPlanSource, avatarImportScriptSource, avatarImportSnapshot, avatarImportSource, avatarImportSynthetic, buildLogAvatarImportBuild },
    brandStackBundle: { brandStack, brandStackApproval, brandStackApprovalValidation, brandStackPlanReview, brandStackPlanSource, brandStackScriptSource, brandStackSource, brandStackSynthetic, buildLogBrandStackBuild },
    decisionRestrictedQueueBundle: { decisionRestrictedQueue, decisionRestrictedQueueApproval, decisionRestrictedQueueApprovalValidation, decisionRestrictedQueuePlanReview, decisionRestrictedQueuePlanSource, decisionRestrictedQueueScriptSource, decisionRestrictedQueueSource, decisionRestrictedQueueSynthetic, buildLogDecisionRestrictedQueueBuild },
    foundationUiCompleteBundle: { foundationUiComplete, foundationUiCompleteApproval, foundationUiCompleteApprovalValidation, foundationUiCompletePlanReview, foundationUiCompletePlanSource, foundationUiCompleteScriptSource, foundationUiCompleteSource, foundationUiCompleteSynthetic, buildLogFoundationUiCompleteBuild },
    marketingSourceMapBundle: { marketingSourceMap, marketingSourceMapApproval, marketingSourceMapApprovalValidation, marketingSourceMapPlanReview, marketingSourceMapPlanSource, marketingSourceMapScriptSource, marketingSourceMapSource, marketingSourceMapSynthetic, buildLogMarketingSourceMapBuild },
    perUserChangelogBundle: { perUserChangelog, perUserChangelogApproval, perUserChangelogApprovalValidation, perUserChangelogPlanReview, perUserChangelogPlanSource, perUserChangelogScriptSource, perUserChangelogSource, perUserChangelogSynthetic, buildLogPerUserChangelogBuild },
    sourceCoverageCloseoutBundle: { sourceCoverageCloseout, sourceCoverageCloseoutApproval, sourceCoverageCloseoutApprovalValidation, sourceCoverageCloseoutPlanReview, sourceCoverageCloseoutPlanSource, sourceCoverageCloseoutScriptSource, sourceCoverageCloseoutSource, sourceCoverageCloseoutSynthetic, buildLogSourceCoverageCloseoutBuild },
    sourceExtractionCoverageBundle: { sourceExtractionCoverage, sourceExtractionCoverageApproval, sourceExtractionCoverageApprovalValidation, sourceExtractionCoveragePlanReview, sourceExtractionCoveragePlanSource, sourceExtractionCoverageScriptSource, sourceExtractionCoverageSource, sourceExtractionCoverageSynthetic, buildLogSourceExtractionCoverageBuild },
    sourceMaturityGridBundle: { sourceMaturityGrid, sourceMaturityGridApproval, sourceMaturityGridApprovalValidation, sourceMaturityGridPlanReview, sourceMaturityGridPlanSource, sourceMaturityGridScriptSource, sourceMaturityGridSource, sourceMaturityGridSynthetic, buildLogSourceMaturityGridBuild },
    strategyHubMeetingReadyBundle: { strategyHubMeetingReady, strategyHubMeetingReadyApproval, strategyHubMeetingReadyApprovalValidation, strategyHubMeetingReadyPlanReview, strategyHubMeetingReadyPlanSource, strategyHubMeetingReadyScriptSource, strategyHubMeetingReadySource, strategyHubMeetingReadySynthetic, buildLogStrategyHubMeetingReadyBuild },
    tierBehavioralCompletionBundle: { tierBehavioralCompletion, tierBehavioralCompletionApproval, tierBehavioralCompletionApprovalValidation, tierBehavioralCompletionPlanReview, tierBehavioralCompletionPlanSource, tierBehavioralCompletionScriptSource, tierBehavioralCompletionSource, tierBehavioralCompletionSynthetic, buildLogTierBehavioralCompletionBuild },
    verificationRunsBundle: { verificationRuns, verificationRunsApproval, verificationRunsApprovalValidation, verificationRunsPlanReview, verificationRunsPlanSource, verificationRunsScriptSource, verificationRunsSource, verificationRunsSynthetic, buildLogVerificationRunsBuild },
  })
  checks.push(...sourceOnceOverProgressionVerifier.checks)
  const processControlGovernanceVerifier = await evaluateFoundationVerifierProcessControlGovernanceOrchestration({
    foundationVerifyRootSource,
    processGovernanceBundle: { ATOM_FLOW_AUTO_DEMOTION_CARD_ID, ATOM_FLOW_AUTO_DEMOTION_CLOSEOUT_KEY, ATOM_FLOW_AUTO_DEMOTION_PLAN_PATH, ATOM_FLOW_AUTO_DEMOTION_SCRIPT_PATH, CODE_QUALITY_NIGHTLY_AUDIT_CLOSEOUT_KEY, CONNECTOR_CREDENTIAL_CARD_ID, CONNECTOR_CREDENTIAL_CLOSEOUT_KEY, CONNECTOR_CREDENTIAL_PLAN_PATH, CONNECTOR_CREDENTIAL_REQUIRED_KEYS, CONNECTOR_CREDENTIAL_SCRIPT_PATH, CURRENT_SPRINT_DYNAMIC_TRUTH_CARD_ID, CURRENT_SPRINT_DYNAMIC_TRUTH_CLOSEOUT_KEY, CURRENT_SPRINT_DYNAMIC_TRUTH_PLAN_PATH, CURRENT_SPRINT_DYNAMIC_TRUTH_SCRIPT_PATH, EXTRACTION_RETRY_FAILED_JOB_KEY, EXTRACTION_RETRY_FAILED_SCRIPT_PATH, EXTRACT_RUN_HARDENING_EXECUTION_CARD_ID, EXTRACT_RUN_HARDENING_EXECUTION_CLOSEOUT_KEY, EXTRACT_RUN_HARDENING_EXECUTION_PLAN_PATH, EXTRACT_RUN_HARDENING_EXECUTION_SCRIPT_PATH, FOUNDATION_PLAN_RECONCILE_CARD_ID, FOUNDATION_PLAN_RECONCILE_CLOSEOUT_KEY, FOUNDATION_PLAN_RECONCILE_PLAN_PATH, FOUNDATION_PLAN_RECONCILE_SCRIPT_PATH, FOUNDATION_VERIFY_LLM_AUTH_AUDIT_SCRIPT_PATH, LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID, LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CLOSEOUT_KEY, LLM_AUTH_AUDIT_CARD_ID, LLM_AUTH_AUDIT_CLOSEOUT_KEY, PLAN_CRITIC_ROOT_VS_PATCH_FINDING_KEY, PROCESS_REPAIR_VERIFIER_SPRINT_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE, RESEARCH_LANE_PURGE_CARD_ID, RESEARCH_LANE_PURGE_CLOSEOUT_KEY, RESEARCH_LANE_PURGE_PLAN_PATH, RESEARCH_LANE_PURGE_SCRIPT_PATH, SOURCE_EXTRACTION_GAP_FOLLOWUP_CARD_ID, SOURCE_EXTRACTION_GAP_FOLLOWUP_CLOSEOUT_KEY, SOURCE_EXTRACTION_GAP_FOLLOWUP_PLAN_PATH, SOURCE_EXTRACTION_GAP_FOLLOWUP_SCRIPT_PATH, SPRINT_STAGE_GATE_CARD_ID, SPRINT_STAGE_GATE_CLOSEOUT_KEY, SPRINT_STAGE_GATE_PLAN_PATH, SPRINT_STAGE_GATE_SCRIPT_PATH, atomFlowAutoDemotion, atomFlowAutoDemotionApprovalValidation, atomFlowAutoDemotionCloseout, atomFlowAutoDemotionCurrentItem, atomFlowAutoDemotionPlanSource, atomFlowAutoDemotionScriptSource, atomFlowAutoDemotionSource, atomFlowAutoDemotionSynthetic, buildLlmAuthAuditStatus, buildLlmAuthAuditVerifierDogfoodProof, buildResearchLanePurgeSnapshot, connectorCredential, connectorCredentialApprovalValidation, connectorCredentialCheckSource, connectorCredentialCloseout, connectorCredentialCurrentItem, connectorCredentialPlanSource, connectorCredentialRegistry, connectorCredentialRegistrySource, connectorCredentialSyntheticSafety, connectorRoutingProcessRepairCloseout, connectorRoutingProcessRepairSource, currentPlan, currentSprintDynamicTruth, currentSprintDynamicTruthApprovalValidation, currentSprintDynamicTruthCheckSource, currentSprintDynamicTruthCloseout, currentSprintDynamicTruthPlanSource, currentSprintItemsById, currentSprintStoreSource, currentState, evaluateLlmAuthAuditVerifierCheck, extractRunHardeningExecution, extractRunHardeningExecutionApprovalValidation, extractRunHardeningExecutionCloseout, extractRunHardeningExecutionCurrentItem, extractRunHardeningExecutionPlanSource, extractRunHardeningExecutionScriptSource, extractRunHardeningExecutionSource, extractRunHardeningExecutionSynthetic, extractionRetryFailedScriptSource, foundationCurrentSprintSource, foundationCurrentSprintStatus, foundationDbSource: foundationDbVerifierSource, foundationHub, foundationJobsSource, foundationPlanReconcile, foundationPlanReconcileApprovalValidation, foundationPlanReconcileCheckSource, foundationPlanReconcileCloseout, foundationPlanReconcileCurrentItem, foundationPlanReconcilePlanSource, foundationRuntimeReadRoutesSource, foundationSourceLifecycle, foundationSourceRoutesSource, foundationVerifySource, historicalCardHasVerifiedCloseout, llmAuthAudit, llmAuthAuditApprovalValidation, llmAuthAuditCheckSource, llmAuthAuditCloseout, llmAuthAuditCurrentItem, llmAuthAuditJobDefinition, llmAuthAuditPlanSource, llmAuthAuditProofSource, llmAuthAuditVerifierCheckSource, llmAuthAuditVerifierModuleSource, llmAuthBudgetLabelApprovalValidation, llmAuthBudgetLabelCard, llmAuthBudgetLabelCheckSource, llmAuthBudgetLabelCloseout, llmAuthBudgetLabelCurrentItem, llmAuthBudgetLabelPlanSource, llmAuthBudgetLabelProofSource, packageJson, planCriticSource, planCriticSynthetic, processRepairVerifierSprintPlanSource, processRepairVerifierSprintScriptSource, processRootVsPatch, processRootVsPatchCheckSource, processRootVsPatchCloseout, researchLanePurge, researchLanePurgeApprovalValidation, researchLanePurgeCloseout, researchLanePurgeCurrentItem, researchLanePurgePlanSource, researchLanePurgeReportSource, researchLanePurgeScriptSource, researchLanePurgeSource, researchLanePurgeSynthetic, serverSource, sourceConnectorMatrix, sourceConnectorMatrixSource, sourceExtractionGapFollowupApprovalValidation, sourceExtractionGapFollowupCard, sourceExtractionGapFollowupCheckSource, sourceExtractionGapFollowupCloseout, sourceExtractionGapFollowupCurrentItem, sourceExtractionGapFollowupPlanSource, sourceExtractionGapFollowupReportSource, sourceExtractionGapFollowupSnapshot, sourceExtractionGapFollowupSource, sourceExtractionGapMissingIds, sourceExtractionGapSyntheticMissingProof, sourceMaturityGridSource, sprintProcessRepair, sprintProcessRepairPlanSource, sprintStageGate, sprintStageGateApprovalValidation, sprintStageGateCheckSource, sprintStageGateCloseout, sprintStageGatePlanSource, verifierModularSplit, verifierModularSplitCheckSource, verifierModularSplitCloseout, verifierSprintIndependence, verifierSprintIndependenceCloseout, verifierSprintProofModuleSource },
    readinessFollowupBundle: { AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID, AGENT_FEEDBACK_SEND_CARD_ID, AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID, FOUNDATION_FOLLOWUP_BUILD_ORDER, FOUNDATION_FOLLOWUP_CARD_CAPTURE_APPROVED_PLAN_PATH, FOUNDATION_FOLLOWUP_CARD_CAPTURE_CARD_ID, FOUNDATION_FOLLOWUP_CARD_CAPTURE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE, FOUNDATION_FOLLOWUP_NON_SCOPE_PHRASES, FOUNDATION_SPRINT_REVIEW_CARD_ID, FOUNDATION_SPRINT_REVIEW_DOC_PATH, FOUNDATION_SPRINT_REVIEW_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE, FOUNDATION_SYSTEMS_APPROVED_GROUPED_SYSTEM_COUNT, FOUNDATION_SYSTEMS_SERVICE_GROUPING_APPROVED_PLAN_PATH, FOUNDATION_SYSTEMS_SERVICE_GROUPING_CARD_ID, FOUNDATION_SYSTEMS_SERVICE_GROUPING_CLOSEOUT_KEY, FOUNDATION_SYSTEMS_SERVICE_GROUPING_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE, FOUNDATION_SYSTEMS_SERVICE_GROUPING_NON_SCOPE_PHRASES, FOUNDATION_SYSTEMS_SERVICE_GROUPS, MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY, PLAN_CRITIC_REPLACEMENT_CARD_ID, REBUILD_PLAN_RECONCILE_CARD_ID, SALES_GLS_SCOREBOARD_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE, SECURITY_BEHAVIOR_PROOF_CARD_ID, SYSTEM_REGISTRATION_AGENT_FEEDBACK_SYSTEM_ID, SYSTEM_REGISTRATION_GLS_SYSTEM_ID, SYSTEM_REGISTRATION_SHIPPED_SYSTEM_REQUIREMENTS, SYSTEM_REGISTRATION_SWEEP_APPROVED_PLAN_PATH, SYSTEM_REGISTRATION_SWEEP_CARD_ID, SYSTEM_REGISTRATION_SWEEP_CLOSEOUT_KEY, SYSTEM_REGISTRATION_SWEEP_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE, VERIFIER_BEHAVIOR_SWEEP_CARD_ID, buildLogFoundationFollowupCardCaptureBuild, buildLogFoundationSystemsServiceGroupingBuild, buildLogSalesGlsScoreboardBuild, buildLogSystemRegistrationSweepBuild, currentPlan, currentState, foundationDbWithBacklogSeedSource, foundationDoneTestReadinessStatus, foundationFollowupCardCapture, foundationFollowupCardCaptureApprovalValidation, foundationFollowupCardCaptureApprovedPlan, foundationFollowupCardCaptureAudit, foundationFollowupCardCaptureStatus, foundationFollowupCards, foundationFrontendSource, foundationSprintReview, foundationSprintReviewSource, foundationStylesSource, foundationSystemsServiceGrouping, foundationSystemsServiceGroupingApprovalValidation, foundationSystemsServiceGroupingApprovedPlan, foundationSystemsServiceGroupingBaseline, foundationSystemsServiceGroupingManualReview, foundationSystemsServiceGroupingStatus, packageSource, salesGlsScoreboard, salesHtmlSource, salesHubCheckSource, salesUiSource, readinessServerSource: `${serverSource}\n${salesHubRoutesSource}`, serverSource, sourceContractsSource, sourceOfTruth, sourceRegistry, systemRegistrationSweep, systemRegistrationSweepApprovalValidation, systemRegistrationSweepApprovedPlan, systemRegistrationSweepProof, systemRegistrationSweepStatus },
    guardrailCloseoutBundle: { CANONICAL_DECISION_CATEGORIES, DOCTRINE_PROPAGATION_SOURCES, buildDoctrinePropagationStatus, buildSyntheticStaleSkillSource, currentState, dataStructuredContracts, decisionAutoEmit, decisionAutoEmitApproval, decisionAutoEmitDoc, decisionAutoEmitScriptSource, decisionAutoEmitSource, decisionAutoEmitText, docAuthority, doctrinePropagation, doctrinePropagationApproval, doctrinePropagationDoc, doctrinePropagationScriptSource, doctrinePropagationSource, doctrinePropagationText, driveContentExtractionSource, evaluateDoctrineSkillSource, extractDecisionCandidatesFromText, foundationBuildLogRegistrySource, foundationFrontendSource, foundationHub, fubKpiConnectionMapSource, fubZahndMiddlewareSource, googleDelegatedSource, googleSheetsCacheSource, hitListReconcile, kpiDashboardSource, packageJson, packageSource, repoRoot, scanDecisionAutoEmitCandidates, security001, security002, security002Approval, security002PlanSource, security002ProofCheckSource, security006, securityAccessSource, serverRouteSource, serverSource, sheetsQuotaHardening, sheetsQuotaHardeningApproval, sheetsQuotaHardeningDoc, source021, source021Proof, source021WriterProofCheckSource },
    controlLoopBundle: { DRIVE_ACCESS_REQUEST_CARD_ID, EXTRACT_RUN_HARDENING_CARD_ID, FOUNDATION_DONE_TEST_CARD_ID, FOUNDATION_DONE_TEST_CLOSEOUT_KEY, FOUNDATION_DONE_TEST_PLAN_PATH, FOUNDATION_DONE_TEST_SUMMARY_MARKER, FOUNDATION_READINESS_GATE_CARD_IDS, FOUNDATION_READINESS_REQUIRED_LEG_KEYS, MEETING_VAULT_ACL_CARD_ID, SOURCE_LIFECYCLE_COMPLETION_CARD_ID, SYNTHESIS_VERIFY_CARD_ID, SYSTEM_010_CARD_ID, SYSTEM_010_CLOSEOUT_KEY, SYSTEM_010_PLAN_PATH, actionReviewApi, actionRouteReviewInboxApi, actionReviewApproval, actionRouterSnapshot, backlogHygieneApi, foundationBacklogListApi, buildLogFoundationDoneTestBuild, buildLogSystem010GhostCloseoutBuild, currentPlan, currentState, foundationBuildCloseouts, foundationBuildIntelRoutesSource, foundationDbSource: foundationDbVerifierSource, foundationDoneTest, foundationDoneTestApproval, foundationDoneTestApprovalValidation, foundationDoneTestDocSource, foundationDoneTestPlanSource, foundationDoneTestReadinessStatus, foundationDoneTestRegistrySource, foundationDoneTestScriptSource, foundationFrontendSource, foundationHub, foundationJobsSource, foundationRuntimeReadRoutesSource, meetingVaultAutoEnforcementClosed, packageJson, serverRouteSource, sourceRegistry, strategySharedCommsRouteSource, system010Approval, system010ApprovalValidation, system010DocSource, system010GhostCloseout, system010PlanSource, system010ProcessScriptSource, system010RuntimeSource },
    processControlSharedBundle: { CONNECTOR_ROUTING_TRUTH_CARD_IDS, VERIFIER_CONTROL_LOOP_SPLIT_APPROVAL_PATH, VERIFIER_CONTROL_LOOP_SPLIT_BEFORE_LINES, VERIFIER_CONTROL_LOOP_SPLIT_CARD_ID, VERIFIER_CONTROL_LOOP_SPLIT_CLOSEOUT_KEY, VERIFIER_CONTROL_LOOP_SPLIT_HANDOFF_PATH, VERIFIER_CONTROL_LOOP_SPLIT_PLAN_PATH, VERIFIER_CONTROL_LOOP_SPLIT_SCRIPT_PATH, VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_APPROVAL_PATH, VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_BEFORE_LINES, VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_CARD_ID, VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_CLOSEOUT_KEY, VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_HANDOFF_PATH, VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_PLAN_PATH, VERIFIER_GUARDRAIL_CLOSEOUT_SPLIT_SCRIPT_PATH, VERIFIER_PROCESS_GOVERNANCE_SPLIT_APPROVAL_PATH, VERIFIER_PROCESS_GOVERNANCE_SPLIT_BEFORE_LINES, VERIFIER_PROCESS_GOVERNANCE_SPLIT_CARD_ID, VERIFIER_PROCESS_GOVERNANCE_SPLIT_CLOSEOUT_KEY, VERIFIER_PROCESS_GOVERNANCE_SPLIT_HANDOFF_PATH, VERIFIER_PROCESS_GOVERNANCE_SPLIT_PLAN_PATH, VERIFIER_PROCESS_GOVERNANCE_SPLIT_SCRIPT_PATH, VERIFIER_READINESS_FOLLOWUP_SPLIT_APPROVAL_PATH, VERIFIER_READINESS_FOLLOWUP_SPLIT_BEFORE_LINES, VERIFIER_READINESS_FOLLOWUP_SPLIT_CARD_ID, VERIFIER_READINESS_FOLLOWUP_SPLIT_CLOSEOUT_KEY, VERIFIER_READINESS_FOLLOWUP_SPLIT_HANDOFF_PATH, VERIFIER_READINESS_FOLLOWUP_SPLIT_PLAN_PATH, VERIFIER_READINESS_FOLLOWUP_SPLIT_SCRIPT_PATH, buildFoundationVerifierControlLoopDogfoodProof, buildFoundationVerifierGuardrailCloseoutsDogfoodProof, buildFoundationVerifierProcessGovernanceDogfoodProof, buildFoundationVerifierReadinessFollowupDogfoodProof, connectorRoutingTruthCloseout, connectorRoutingTruthSprintDone, evaluateFoundationVerifierControlLoop, evaluateFoundationVerifierGuardrailCloseouts, evaluateFoundationVerifierProcessGovernance, evaluateFoundationVerifierReadinessFollowup, foundationVerifierControlLoopSource, foundationVerifierGuardrailCloseoutsSource, foundationVerifierProcessControlGovernanceSource, foundationVerifierProcessGovernanceSource, foundationVerifierReadinessFollowupSource, repoFileExists, sourceHubRoutingMatrix },
  })
  checks.push(...processControlGovernanceVerifier.checks)
  const structuralAssuranceCoreVerifier = await evaluateFoundationVerifierStructuralAssuranceCore({
    activeFoundationSprint,
    activeSprintAtOrPast,
    agentFeedbackRouteSource,
    agentFeedbackRoutesSource,
    agentFeedbackRoutesSplitPlanSource,
    agentFeedbackRoutesSplitScriptSource,
    appPageRoutesSource,
    appPageRoutesSplitPlanSource,
    appPageRoutesSplitScriptSource,
    authRoutesSource,
    authRoutesSplitPlanSource,
    authRoutesSplitScriptSource,
    buildIntelRouteSplitPlanSource,
    buildIntelRouteSplitScriptSource,
    closeoutRecordAsBuildLogEntry,
    codeQualityNightlyAuditSource,
    connectorUptimeMonitorSource,
    currentPlan,
    currentSprintVerifier,
    currentState,
    foundationAgentFeedbackStorePlanSource,
    foundationAgentFeedbackStoreScriptSource,
    foundationAgentFeedbackStoreSource,
    foundationBacklogDetailEndpointApi,
    foundationBacklogStorePlanSource,
    foundationBacklogStoreScriptSource,
    foundationBacklogStoreSource,
    foundationBrandStack,
    foundationBuildCloseouts,
    foundationBuildIntelExtractionApi,
    foundationBuildIntelRoutesSource,
    foundationBuildIntelWatchlist,
    foundationBuildLog,
    foundationChangeLog,
    foundationChangesApi,
    foundationConnectorCredentialPreflightApi,
    foundationControlCompressionApi,
    foundationCoreSeedPlanSource,
    foundationCoreSeedScriptSource,
    foundationCoreSeedSource,
    foundationCurrentSprintVerifierSource,
    foundationDailySummary,
    foundationDbSource,
    foundationDbSchemaSeedStoreSource,
    foundationDbSplitVerifierSource,
    foundationDecisionStorePlanSource,
    foundationDecisionStoreScriptSource,
    foundationDecisionStoreSource,
    foundationDocUpdatesApi,
    foundationDriveMeetingVaultStorePlanSource,
    foundationDriveMeetingVaultStoreScriptSource,
    foundationDriveMeetingVaultStoreSource,
    foundationEndpointBudgetsPlanSource,
    foundationEndpointBudgetsScriptSource,
    foundationEndpointBudgetsSource,
    foundationFrontendAssetBudgetsPlanSource,
    foundationFrontendAssetBudgetsScriptSource,
    foundationFrontendAssetBudgetsSource,
    foundationFrontendDomBudgetsPlanSource,
    foundationFrontendDomBudgetsScriptSource,
    foundationFrontendDomBudgetsSource,
    foundationFubLeadSourceStorePlanSource,
    foundationFubLeadSourceStoreScriptSource,
    foundationFubLeadSourceStoreSource,
    foundationGStackBuildIntelApi,
    foundationHub,
    foundationHubSafetyVerifierPlanSource,
    foundationHubSafetyVerifierScriptSource,
    foundationHubSafetyVerifierSource,
    foundationHubSummary,
    foundationHubSummaryPayloadSource,
    foundationImplementationIntelligenceApi,
    foundationIntelligenceAuditVerifierSource,
    foundationJobsSource,
    foundationLlmRuntimeStorePlanSource,
    foundationLlmRuntimeStoreScriptSource,
    foundationLlmRuntimeStoreSource,
    foundationMarketingSourceMap,
    foundationMultimodalExtractorContract,
    foundationOperatorBudgetVerifierPlanSource,
    foundationOperatorBudgetVerifierScriptSource,
    foundationOperatorBudgetVerifierSource,
    foundationOperatorRoutesSource,
    foundationPerUserChangelog,
    foundationResearchInboxContract,
    foundationRestrictedDecisionQueue,
    foundationRouteBudgetCleanupScriptSource,
    foundationRouteSplitVerifierSource,
    foundationRuntimeJobStorePlanSource,
    foundationRuntimeJobStoreScriptSource,
    foundationRuntimeJobStoreSource,
    foundationRuntimeReadRoutesSource,
    foundationRuntimeReadRoutesSplitPlanSource,
    foundationRuntimeReadRoutesSplitScriptSource,
    foundationSalesListingStorePlanSource,
    foundationSalesListingStoreScriptSource,
    foundationSalesListingStoreSource,
    foundationServerRouteSplitVerifierSource,
    foundationSharedCommsCoveragePlanSource,
    foundationSharedCommsCoverageScriptSource,
    foundationSharedCommsCoverageSource,
    foundationSharedCommsStorePlanSource,
    foundationSharedCommsStoreScriptSource,
    foundationSharedCommsStoreSource,
    foundationSourceConnectorMatrixApi,
    foundationSourceContractVerifierSource,
    foundationSourceCoverageCloseout,
    foundationSourceCrawlStorePlanSource,
    foundationSourceCrawlStoreScriptSource,
    foundationSourceCrawlStoreSource,
    foundationSourceExtractionCoverage,
    foundationSourceHubRoutingMatrixApi,
    foundationSourceLifecycle,
    foundationSourceMaturityGrid,
    foundationSourceRoutesSource,
    foundationSourceTrustVerifierSource,
    foundationStrategyGoalTruthPlanSource,
    foundationStrategyGoalTruthScriptSource,
    foundationStrategyGoalTruthSource,
    foundationStrategyOperatingTruthPlanSource,
    foundationStrategyOperatingTruthScriptSource,
    foundationStrategyOperatingTruthSource,
    foundationStrategySourceSnapshotPlanSource,
    foundationStrategySourceSnapshotScriptSource,
    foundationStrategySourceSnapshotSource,
    foundationTierBehavioralCompletion,
    foundationVerificationRuns,
    foundationVerifierBackendSplitAssuranceSource,
    foundationVerifierModuleAssuranceSource,
    foundationVerifierStructuralAssuranceCoreSource,
    foundationVerifyRootSource,
    foundationVerifySource,
    foundationWriteRouteSource,
    foundationWriteRoutesSource,
    foundationWriteRoutesSplitPlanSource,
    foundationWriteRoutesSplitScriptSource,
    fubSourceRouteSplitPlanSource,
    fubSourceRouteSplitScriptSource,
    fubSourceRoutesSource,
    hubReadRoutesSource,
    hubReadRoutesSplitPlanSource,
    hubReadRoutesSplitScriptSource,
    salesHubRoutesSource,
    kpiHealthSource,
    nightlyDeepAuditScriptSource,
    nightlyDeepAuditUpgradeSource,
    packageJson,
    repoFileExists,
    repoRoot,
    securityAccessSource,
    serverRouteSplitPlanSource,
    serverRouteSplitScriptSource,
    serverSource,
    sourceContractVerifierResult,
    sourceOfTruth,
    sourceOfTruthPayloadSource,
    sourceRegistry,
    sourceRouteSplitPlanSource,
    sourceRouteSplitScriptSource,
    sourceTrustVerifier,
    strategySharedCommsRoutesSource,
    strategySharedCommsRoutesSplitPlanSource,
    strategySharedCommsRoutesSplitScriptSource,
    verifierCurrentSprintSplitModulePlanSource,
    verifierCurrentSprintSplitModuleScriptSource,
    verifierFoundationDbSplitModulePlanSource,
    verifierFoundationDbSplitModuleScriptSource,
    verifierIntelligenceAuditSplitModulePlanSource,
    verifierIntelligenceAuditSplitModuleScriptSource,
    verifierRouteSplitModulePlanSource,
    verifierRouteSplitModuleScriptSource,
    verifierServerRouteSplitModulePlanSource,
    verifierServerRouteSplitModuleScriptSource,
    verifierSourceContractModulePlanSource,
    verifierSourceContractModuleScriptSource,
    verifierSourceTrustSplitModulePlanSource,
    verifierSourceTrustSplitModuleScriptSource,
  })
  checks.push(...structuralAssuranceCoreVerifier.checks)
  const nightlyDeepAuditP0TriageCard = (foundationHub.backlogItems || []).find(item => item.id === 'NIGHTLY-DEEP-AUDIT-P0-TRIAGE-001') || null
  const nightlyDeepAuditP0TriageCloseout = foundationBuildCloseouts.find(closeout => closeout.key === 'nightly-deep-audit-p0-triage-v1') || null
  ensure(
    checks,
      nightlyDeepAuditP0TriageCard?.lane === 'done' &&
      String(nightlyDeepAuditP0TriageCard.statusNote || '').includes('nightly-deep-audit-p0-triage-v1') &&
      nightlyDeepAuditP0TriageCloseout?.operatorCloseout === true &&
      (nightlyDeepAuditP0TriageCloseout.backlogIds || []).includes('NIGHTLY-DEEP-AUDIT-P0-TRIAGE-001') &&
      await repoFileExists('docs/handoffs/2026-05-15-nightly-deep-audit-p0-triage.md') &&
      await repoFileExists('docs/process/nightly-deep-audit-p0-triage-001-plan.md') &&
      await repoFileExists('docs/process/approvals/NIGHTLY-DEEP-AUDIT-P0-TRIAGE-001.json') &&
      currentPlan.includes('NIGHTLY-DEEP-AUDIT-P0-TRIAGE-001') &&
      currentState.includes('NIGHTLY-DEEP-AUDIT-P0-TRIAGE-001'),
    'NIGHTLY-DEEP-AUDIT-P0-TRIAGE-001 routes first nightly audit P0 baseline into backlog truth',
    nightlyDeepAuditP0TriageCard
      ? `lane=${nightlyDeepAuditP0TriageCard.lane} closeout=${nightlyDeepAuditP0TriageCloseout?.key || 'missing'}`
      : 'missing NIGHTLY-DEEP-AUDIT-P0-TRIAGE-001',
  )
  const frontendStructuralAssuranceVerifier = await evaluateFoundationVerifierFrontendStructuralAssurance({
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
  })
  checks.push(...frontendStructuralAssuranceVerifier.checks)
  const historicalSplitCloseoutsVerifier = await evaluateFoundationVerifierHistoricalSplitCloseouts({
    activeFoundationSprint,
    activeSprintAtOrPast,
    foundationBuildCloseouts,
    foundationHub,
    foundationRecentBuildsVerifierSource,
    foundationVerifierHistoricalSplitCloseoutsSource,
    foundationVerifierPhaseGOperatorCloseoutSource,
    foundationVerifierReadinessBlockerCloseoutSource,
    foundationVerifierSprintGateProgressionSource,
    foundationVerifySource,
    packageJson,
    phaseGOperatorCloseoutVerifier,
    readinessBlockerCloseoutVerifier,
    readRepoFile,
    repoFileExists,
    sprintGateProgressionVerifier,
  })
  checks.push(...historicalSplitCloseoutsVerifier.checks)
  const runtimeReliabilityOrchestrationVerifier = await evaluateFoundationRuntimeReliabilityVerifierOrchestration({
    activeFoundationSprint,
    activeSprintAtOrPast,
    foundationHub,
    foundationHubFull,
    foundationHubSummary,
    opsHub,
    foundationBuildCloseouts,
    packageJson,
    repoFileExists,
    foundationVerifySource,
    foundationVerifyRootSource,
    foundationRuntimeReliabilityVerifierSource,
    verifierRuntimeReliabilitySplitScriptSource,
    verifierRuntimeReliabilitySplitPlanSource,
    sources: {
      sourceOutageBoundarySource,
      sourceOutageBoundaryScriptSource,
      sourceOutageBoundaryPlanSource,
      clickupSource,
      agentRosterReviewSource,
      agentFeedbackAutoSendSource,
      agentFeedbackProductionAutoSendDryRunSource,
      agentFeedbackReminderSource,
      serverRouteSource,
      foundationJobsSource,
      connectorUptimeMonitorSource,
      foundationOperatingReliabilityScriptSource,
      planCriticSource,
      hubReadRoutesSource,
      runtimeProcessControlSource: system010RuntimeSource,
      foundationRuntimeRendererSource: foundationRuntimeRenderersSource,
      foundationOperationsRendererSource: foundationOperationsRenderersSource,
      foundationWorkflowStylesSource,
      foundationFrontendSource,
      foundationDbSource,
      foundationHubPerformanceSource,
      foundationPerformanceScriptSource,
      foundationBuildLogRegistrySource,
      foundationHubFullDiagnosticsSource,
      foundationHubFullDiagnosticsScriptSource,
      foundationBuildCloseoutCleanupRecordsSource,
      processFoundationShipSource,
      foundationShipPreflightSource,
      foundationShipPreflightScriptSource,
      foundationSystemHealthSource,
      foundationVerifyProfileScriptSource,
      llmAuthAuditVerifierModuleSource,
      llmAuthAuditVerifierCheckSource,
      foundationHubFullPayloadReduceScriptSource,
      clickupSourceVerifierSource,
      clickupSourceVerifyScriptSource,
      clickupVerifyHealthBoundaryScriptSource,
      foundationVerifyProfileBudgetSource,
      foundationVerifySource,
      foundationHealthScriptVerifierSource,
      foundationWorkerReliabilitySource,
      foundationWorkerSource,
      foundationRuntimeJobStoreSource,
      foundationHubSummaryPayloadSource,
      runtimeFirstJobsSource,
      runtimeHealthSimplifySource,
      aiosRuntimePortabilityGateSource,
      agentStatusFreshnessGateSource,
      foundationRuntimeReliabilityVerifierSource,
      foundationSourceCrawlStoreSource,
      runExtractionTargetSource: extractionTargetSource,
    },
  })
  checks.push(...runtimeReliabilityOrchestrationVerifier.checks)
  const runtimeReliabilityVerifier = runtimeReliabilityOrchestrationVerifier.runtimeReliabilityVerifier
  const planCriticArchitecturalRulesProof = runtimeReliabilityOrchestrationVerifier.planCriticArchitecturalRulesProof
  const buildLogRegistryAssuranceVerifier = await evaluateFoundationVerifierBuildLogRegistryAssurance({
    activeFoundationSprint,
    activeSprintAtOrPast,
    foundationBuildCloseoutControlPlaneRecordsSource,
    foundationBuildCloseoutRecordsSource,
    foundationBuildCloseoutRegistrySplitCloseout,
    foundationBuildCloseouts,
    foundationBuildLog,
    foundationBuildLogBehaviorSource,
    foundationBuildLogMonolithSliceCloseout,
    foundationBuildLogRegistrySource,
    foundationHub,
    foundationVerifierBuildLogRegistryAssuranceSource,
    foundationVerifySource,
    packageJson,
    readRepoFile,
    repoFileExists,
  })
  checks.push(...buildLogRegistryAssuranceVerifier.checks)
  const processHardeningOrchestrationVerifier = await runFoundationVerifyProcessHardeningVerifier({
    activeFoundationSprint: activeFoundationSprintForExtractionRuntime,
    baseUrl, buildLogRegistryAssuranceVerifier, currentPlan, currentState, currentSprintStoreSource,
    findBuildLogCloseoutEntry, foundationBacklogSeedSource, foundationBacklogStoreSource,
    foundationBuildCloseoutCleanupRecordsSource, foundationBuildCloseoutRecordsSource,
    foundationBuildCloseouts, foundationBuildLogRegistrySource, foundationDbSource, foundationDbSchemaSeedStoreSource, foundationHub,
    foundationHubKpiHealth, foundationHubPerformanceVerificationSource, foundationJobsSource,
    foundationProcessHardeningVerifierSource, foundationVerificationCleanupCloseout,
    foundationVerifyProcessHardeningRunnerSource,
    foundationVerificationCleanupScriptSource, foundationVerifyRootSource,
    foundationVerifySourceWithProcessHardeningModule, foundationWorkerSource,
    hubReadRoutesSource, kpiHealthSource, packageJson, parallelBuilderWorktreeProtocolSource,
    planCriticArchitecturalRulesProof, readRepoFile, recurringDeepAuditScriptSource,
    recurringDeepAuditSource, repoFileExists, repoRoot, sourceOfTruthPayloadSource, sourceTruthKpiHealth,
  })
  checks.push(...processHardeningOrchestrationVerifier.checks)
  const healthLiveSummaryVerifier = await evaluateFoundationVerifierHealthLiveSummary({
    activeFoundationSprint,
    activeSprintAtOrPast,
    codeQualityNightlyAuditSource,
    currentState,
    foundationBuildCloseouts,
    foundationCurrentStateRendererSource,
    foundationCurrentStateSummarySource,
    foundationHealthScriptVerifierSource,
    foundationHub,
    foundationHubFull,
    foundationHubKpiHealth,
    foundationOperationsRenderersSource,
    foundationRuntimeRenderersSource,
    foundationSystemHealthSource,
    foundationVerifierHealthLiveSummarySource,
    foundationVerifySource,
    hubReadRoutesSource,
    kpiHealthScriptSource,
    kpiHealthSource,
    packageJson,
    readRepoFile,
    repoFileExists,
    runHealthScript,
    runHealthScriptSafe,
    runHealthScriptWithArgs,
  })
  checks.push(...healthLiveSummaryVerifier.checks)
  const followupBacklogAssuranceVerifier = await evaluateFoundationVerifierFollowupBacklogAssurance({
    currentPlan,
    currentState,
    foundationBuildCloseouts,
    foundationFrontendSource,
    foundationHub,
    foundationVerifierFollowupBacklogAssuranceSource,
    foundationVerifySource,
    packageJson,
    repoFileExists,
    strategyHubMeetingReadyCloseoutKey: STRATEGY_HUB_MEETING_READY_CLOSEOUT_KEY,
  })
  checks.push(...followupBacklogAssuranceVerifier.checks)

  const failed = checks.filter(check => !check.ok)
  const timingProfile = profileEnabled ? buildFoundationVerifyTimingProfile(verifyStartedAt) : null

  if (jsonSummary) {
    console.log(JSON.stringify(buildFoundationVerifyJsonSummary(checks, { timingProfile }), null, 2))
  } else {
    console.log('')
    for (const outputLine of buildFoundationVerifyCheckOutput(checks, { failuresOnly })) {
      if (outputLine.stream === 'stderr') console.error(outputLine.text)
      else console.log(outputLine.text)
    }

    console.log('')
    line('Summary', `${checks.length - failed.length}/${checks.length} checks passed`)
    if (profileEnabled) printFoundationVerifyTimingProfile(timingProfile)
  }

  if (failed.length) {
    process.exitCode = 1
    return
  }

  if (!jsonSummary) console.log('Foundation verification passed.')
}

runWithFoundationGateRetry(
  'foundation:verify',
  () => main(),
  buildFoundationVerifyRetryOptions({
    retries: 1,
    onRetry: event => {
      console.error(formatFoundationGateRetryMessage('foundation:verify', event))
    },
  }),
)
  .catch(error => {
    console.error('Foundation verification failed.')
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
