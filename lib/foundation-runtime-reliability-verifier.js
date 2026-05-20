import {
  SOURCE_OUTAGE_BOUNDARY_APPROVAL_PATH,
  SOURCE_OUTAGE_BOUNDARY_CARD_ID,
  SOURCE_OUTAGE_BOUNDARY_CLOSEOUT_KEY,
  SOURCE_OUTAGE_BOUNDARY_PLAN_PATH,
  SOURCE_OUTAGE_BOUNDARY_SCRIPT_PATH,
  buildSourceOutageBoundaryDogfoodProof,
} from './source-outage-boundary.js'
import {
  CONNECTOR_UPTIME_MONITOR_JOB_KEY,
  FOUNDATION_OPERATING_RELIABILITY_CARD_IDS,
  FOUNDATION_OPERATING_RELIABILITY_CLOSEOUT_KEY,
  FOUNDATION_OPERATING_RELIABILITY_SCRIPT_PATH,
  buildFoundationOperatingReliabilityDogfoodProof,
} from './connector-uptime-monitor.js'
import {
  PLAN_CRITIC_ARCHITECTURAL_RULES_CARD_ID,
  PLAN_CRITIC_ARCHITECTURAL_RULES_CLOSEOUT_KEY,
  PLAN_CRITIC_ARCHITECTURAL_RULES_SCRIPT_PATH,
  buildSyntheticPlanCriticArchitecturalRulesProof,
} from './process-plan-critic.js'
import {
  FOUNDATION_HUB_SUMMARY_BUDGET,
  FOUNDATION_PERFORMANCE_CARD_ID,
  FOUNDATION_PERFORMANCE_CLOSEOUT_KEY,
  FOUNDATION_PERFORMANCE_SCRIPT_PATH,
  buildSyntheticFoundationHubBudgetProof,
} from './foundation-hub-performance.js'
import {
  FOUNDATION_FULL_DIAGNOSTICS_BUDGET,
  FOUNDATION_FULL_DIAGNOSTICS_CLOSEOUT_KEY,
  FOUNDATION_FULL_DIAGNOSTICS_PERF_CARD_ID,
  FOUNDATION_FULL_DIAGNOSTICS_SCRIPT_PATH,
  FOUNDATION_HUB_FULL_ROUTE_SPLIT_CARD_ID,
  buildSyntheticFoundationFullDiagnosticsDogfoodProof,
} from './foundation-hub-full-diagnostics.js'
import {
  FOUNDATION_SHIP_PREFLIGHT_SCRIPT_PATH,
  buildFoundationShipPreflightDogfoodProof,
} from './foundation-ship-preflight.js'
import {
  FILE_SIZE_ENGINEERING_STANDARD_APPROVAL_PATH,
  FILE_SIZE_ENGINEERING_STANDARD_CARD_ID,
  FILE_SIZE_ENGINEERING_STANDARD_CLOSEOUT_KEY,
  FILE_SIZE_ENGINEERING_STANDARD_PLAN_PATH,
  FILE_SIZE_ENGINEERING_STANDARD_SCRIPT_PATH,
  buildFoundationFileSizeStandardDogfoodProof,
} from './foundation-file-size-standard.js'
import {
  FOUNDATION_VERIFY_LLM_AUTH_AUDIT_SCRIPT_PATH,
} from './foundation-verify-llm-auth-audit.js'
import {
  buildClickUpSourceVerifierDogfoodProof,
} from './clickup-source-verifier.js'
import {
  buildFoundationVerifySlowBudgetDogfoodProof,
} from './foundation-verify-profile-budget.js'
import {
  RUNTIME_SUPERVISOR_CARD_ID,
  RUNTIME_SUPERVISOR_CLOSEOUT_KEY,
  RUNTIME_SUPERVISOR_PLAN_PATH,
  RUNTIME_SUPERVISOR_APPROVAL_PATH,
  RUNTIME_SUPERVISOR_SCRIPT_PATH,
  buildRuntimeSupervisorDogfoodProof,
} from './runtime-process-control.js'
import {
  RUNTIME_WORKER_APPROVAL_PATH,
  RUNTIME_WORKER_CARD_ID,
  RUNTIME_WORKER_CLOSEOUT_KEY,
  RUNTIME_WORKER_PLAN_PATH,
  RUNTIME_WORKER_SCRIPT_PATH,
  buildFoundationWorkerReliabilityDogfoodProof,
} from './foundation-worker-reliability.js'
import {
  RUNTIME_FIRST_JOBS_APPROVAL_PATH,
  RUNTIME_FIRST_JOBS_CARD_ID,
  RUNTIME_FIRST_JOBS_CLOSEOUT_KEY,
  RUNTIME_FIRST_JOBS_PLAN_PATH,
  RUNTIME_FIRST_JOBS_SCRIPT_PATH,
  RUNTIME_FIRST_SAFE_JOB_KEYS,
  RUNTIME_FIRST_SAFE_TARGET_KEYS,
  buildRuntimeFirstJobsDogfoodProof,
} from './runtime-first-jobs.js'
import {
  RUNTIME_HEALTH_SIMPLIFY_APPROVAL_PATH,
  RUNTIME_HEALTH_SIMPLIFY_CARD_ID,
  RUNTIME_HEALTH_SIMPLIFY_CLOSEOUT_KEY,
  RUNTIME_HEALTH_SIMPLIFY_PLAN_PATH,
  RUNTIME_HEALTH_SIMPLIFY_SCRIPT_PATH,
  buildRuntimeHealthSimplifyDogfoodProof,
  evaluateRuntimeHealthSimplifySource,
} from './runtime-health-simplify.js'
import {
  AIOS_RUNTIME_PORTABILITY_GATE_APPROVAL_PATH,
  AIOS_RUNTIME_PORTABILITY_GATE_CARD_ID,
  AIOS_RUNTIME_PORTABILITY_GATE_CLOSEOUT_KEY,
  AIOS_RUNTIME_PORTABILITY_GATE_CLOSEOUT_PATH,
  AIOS_RUNTIME_PORTABILITY_GATE_PLAN_PATH,
  AIOS_RUNTIME_PORTABILITY_GATE_SCRIPT_PATH,
  buildAiosRuntimePortabilityGate,
  buildAiosRuntimePortabilityGateDogfoodProof,
  evaluateAiosRuntimePortabilityGate,
} from './aios-runtime-portability-gate.js'
import {
  AGENT_STATUS_FRESHNESS_GATE_APPROVAL_PATH,
  AGENT_STATUS_FRESHNESS_GATE_CARD_ID,
  AGENT_STATUS_FRESHNESS_GATE_CLOSEOUT_KEY,
  AGENT_STATUS_FRESHNESS_GATE_CLOSEOUT_PATH,
  AGENT_STATUS_FRESHNESS_GATE_PLAN_PATH,
  AGENT_STATUS_FRESHNESS_GATE_SCRIPT_PATH,
  buildAgentStatusFreshnessGate,
  buildAgentStatusFreshnessGateDogfoodProof,
  evaluateAgentStatusFreshnessGate,
} from './agent-status-freshness-gate.js'
import {
  FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_APPROVAL_PATH,
  FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_CARD_ID,
  FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_CLOSEOUT_KEY,
  FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_CLOSEOUT_PATH,
  FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_PLAN_PATH,
  FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_SCRIPT_PATH,
  buildFoundationAgentUsefulnessRuntimeGateBundle,
  buildFoundationAgentUsefulnessRuntimeGateDogfoodProof,
  evaluateFoundationAgentUsefulnessRuntimeGateBundle,
} from './foundation-agent-usefulness-runtime-gates.js'
import {
  AGENT_LIVE_ANSWER_PREFLIGHT_GATE_APPROVAL_PATH,
  AGENT_LIVE_ANSWER_PREFLIGHT_GATE_CARD_ID,
  AGENT_LIVE_ANSWER_PREFLIGHT_GATE_CLOSEOUT_KEY,
  AGENT_LIVE_ANSWER_PREFLIGHT_GATE_CLOSEOUT_PATH,
  AGENT_LIVE_ANSWER_PREFLIGHT_GATE_PLAN_PATH,
  AGENT_LIVE_ANSWER_PREFLIGHT_GATE_SCRIPT_PATH,
  buildAgentLiveAnswerPreflightGate,
  buildAgentLiveAnswerPreflightGateDogfoodProof,
  evaluateAgentLiveAnswerPreflightGate,
} from './agent-live-answer-preflight-gate.js'
import {
  AGENT_CAPABILITY_REGISTRY_APPROVAL_PATH,
  AGENT_CAPABILITY_REGISTRY_CARD_ID,
  AGENT_CAPABILITY_REGISTRY_CLOSEOUT_KEY,
  AGENT_CAPABILITY_REGISTRY_CLOSEOUT_PATH,
  AGENT_CAPABILITY_REGISTRY_PLAN_PATH,
  AGENT_CAPABILITY_REGISTRY_SCRIPT_PATH,
  buildAgentCapabilityRegistry,
  buildAgentCapabilityRegistryDogfoodProof,
  evaluateAgentCapabilityRegistry,
} from './agent-capability-registry.js'
import {
  FOUNDATION_UP_CAPABILITY_REGISTRY_APPROVAL_PATH,
  FOUNDATION_UP_CAPABILITY_REGISTRY_CARD_ID,
  FOUNDATION_UP_CAPABILITY_REGISTRY_CLOSEOUT_KEY,
  FOUNDATION_UP_CAPABILITY_REGISTRY_CLOSEOUT_PATH,
  FOUNDATION_UP_CAPABILITY_REGISTRY_PLAN_PATH,
  FOUNDATION_UP_CAPABILITY_REGISTRY_SCRIPT_PATH,
  buildFoundationUpCapabilityRegistry,
  buildFoundationUpCapabilityRegistryDogfoodProof,
  evaluateFoundationUpCapabilityRegistry,
} from './foundation-up-capability-registry.js'
import {
  AGENT_TEMPLATE_RUNTIME_CONTRACT_APPROVAL_PATH,
  AGENT_TEMPLATE_RUNTIME_CONTRACT_CARD_ID,
  AGENT_TEMPLATE_RUNTIME_CONTRACT_CLOSEOUT_KEY,
  AGENT_TEMPLATE_RUNTIME_CONTRACT_CLOSEOUT_PATH,
  AGENT_TEMPLATE_RUNTIME_CONTRACT_PLAN_PATH,
  AGENT_TEMPLATE_RUNTIME_CONTRACT_SCRIPT_PATH,
  buildAgentTemplateRuntimeContract,
  buildAgentTemplateRuntimeContractDogfoodProof,
  evaluateAgentTemplateRuntimeContract,
} from './agent-template-runtime-contract.js'
import {
  OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_APPROVAL_PATH,
  OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_CARD_ID,
  OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_CLOSEOUT_KEY,
  OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_CLOSEOUT_PATH,
  OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_DOC_PATH,
  OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_PLAN_PATH,
  OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_SCRIPT_PATH,
  buildOldSystemAgentOnboardingHarvest,
  buildOldSystemAgentOnboardingHarvestDogfoodProof,
  evaluateOldSystemAgentOnboardingHarvest,
} from './old-system-agent-onboarding-harvest.js'
import {
  AGENT_010_APPROVAL_PATH,
  AGENT_010_CARD_ID,
  AGENT_010_CLOSEOUT_KEY,
  AGENT_010_CLOSEOUT_PATH,
  AGENT_010_DOC_PATH,
  AGENT_010_PLAN_PATH,
  AGENT_010_SCRIPT_PATH,
  buildPersonalAgentOnboardingContract,
  buildPersonalAgentOnboardingContractDogfoodProof,
  evaluatePersonalAgentOnboardingContract,
} from './personal-agent-onboarding-contract.js'
import {
  ROLE_ASSISTANT_CONTRACTS_APPROVAL_PATH,
  ROLE_ASSISTANT_CONTRACTS_CARD_ID,
  ROLE_ASSISTANT_CONTRACTS_CLOSEOUT_KEY,
  ROLE_ASSISTANT_CONTRACTS_CLOSEOUT_PATH,
  ROLE_ASSISTANT_CONTRACTS_DOC_PATH,
  ROLE_ASSISTANT_CONTRACTS_PLAN_PATH,
  ROLE_ASSISTANT_CONTRACTS_SCRIPT_PATH,
  buildRoleAssistantContracts,
  buildRoleAssistantContractsDogfoodProof,
  evaluateRoleAssistantContracts,
} from './role-assistant-contracts.js'
import {
  HARLAN_PROJECT_REGISTRY_APPROVAL_PATH,
  HARLAN_PROJECT_REGISTRY_CARD_ID,
  HARLAN_PROJECT_REGISTRY_CLOSEOUT_KEY,
  HARLAN_PROJECT_REGISTRY_CLOSEOUT_PATH,
  HARLAN_PROJECT_REGISTRY_DOC_PATH,
  HARLAN_PROJECT_REGISTRY_PLAN_PATH,
  HARLAN_PROJECT_REGISTRY_SCRIPT_PATH,
  HARLAN_PROJECT_REGISTRY_SYSTEM_CARD_ID,
  buildHarlanProjectRegistry,
  buildHarlanProjectRegistryDogfoodProof,
  evaluateHarlanProjectRegistry,
} from './harlan-project-registry.js'
import {
  HARLAN_OPERATOR_LOOP_APPROVAL_PATH,
  HARLAN_OPERATOR_LOOP_CARD_ID,
  HARLAN_OPERATOR_LOOP_CLOSEOUT_KEY,
  HARLAN_OPERATOR_LOOP_CLOSEOUT_PATH,
  HARLAN_OPERATOR_LOOP_DOC_PATH,
  HARLAN_OPERATOR_LOOP_PLAN_PATH,
  HARLAN_OPERATOR_LOOP_SCRIPT_PATH,
  buildHarlanOperatorLoop,
  buildHarlanOperatorLoopDogfoodProof,
  evaluateHarlanOperatorLoop,
} from './harlan-operator-loop.js'
import {
  HARLAN_AUTH_ESCALATION_LOOP_APPROVAL_PATH,
  HARLAN_AUTH_ESCALATION_LOOP_CARD_ID,
  HARLAN_AUTH_ESCALATION_LOOP_CLOSEOUT_KEY,
  HARLAN_AUTH_ESCALATION_LOOP_CLOSEOUT_PATH,
  HARLAN_AUTH_ESCALATION_LOOP_DOC_PATH,
  HARLAN_AUTH_ESCALATION_LOOP_PLAN_PATH,
  HARLAN_AUTH_ESCALATION_LOOP_SCRIPT_PATH,
  buildHarlanAuthEscalationLoop,
  buildHarlanAuthEscalationLoopDogfoodProof,
  evaluateHarlanAuthEscalationLoop,
} from './harlan-auth-escalation-loop.js'
import {
  TRUSTED_ASSISTANT_LOOP_APPROVAL_PATH,
  TRUSTED_ASSISTANT_LOOP_CARD_ID,
  TRUSTED_ASSISTANT_LOOP_CLOSEOUT_KEY,
  TRUSTED_ASSISTANT_LOOP_CLOSEOUT_PATH,
  TRUSTED_ASSISTANT_LOOP_DOC_PATH,
  TRUSTED_ASSISTANT_LOOP_PLAN_PATH,
  TRUSTED_ASSISTANT_LOOP_SCRIPT_PATH,
  buildTrustedAssistantLoopContract,
  buildTrustedAssistantLoopDogfoodProof,
  evaluateTrustedAssistantLoopContract,
} from './trusted-assistant-loop.js'

export const VERIFIER_RUNTIME_RELIABILITY_SPLIT_CARD_ID = 'VERIFIER-RUNTIME-RELIABILITY-SPLIT-001'
export const VERIFIER_RUNTIME_RELIABILITY_SPLIT_CLOSEOUT_KEY = 'verifier-runtime-reliability-split-v1'
export const VERIFIER_RUNTIME_RELIABILITY_SPLIT_PLAN_PATH = 'docs/process/verifier-runtime-reliability-split-001-plan.md'
export const VERIFIER_RUNTIME_RELIABILITY_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-RUNTIME-RELIABILITY-SPLIT-001.json'
export const VERIFIER_RUNTIME_RELIABILITY_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-runtime-reliability-split-check.mjs'
export const VERIFIER_RUNTIME_RELIABILITY_SPLIT_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-15-verifier-runtime-reliability-split-closeout.md'
export const VERIFIER_RUNTIME_RELIABILITY_SPLIT_SPRINT_ID = 'verifier-runtime-reliability-split-2026-05-15'
export const VERIFIER_RUNTIME_RELIABILITY_SPLIT_BEFORE_LINES = 15623
export const VERIFIER_RUNTIME_RELIABILITY_ORCHESTRATION_SPLIT_CARD_ID = 'VERIFIER-RUNTIME-RELIABILITY-ORCHESTRATION-SPLIT-001'
export const VERIFIER_RUNTIME_RELIABILITY_ORCHESTRATION_SPLIT_CLOSEOUT_KEY = 'verifier-runtime-reliability-orchestration-split-v1'
export const VERIFIER_RUNTIME_RELIABILITY_ORCHESTRATION_SPLIT_PLAN_PATH = 'docs/process/verifier-runtime-reliability-orchestration-split-001-plan.md'
export const VERIFIER_RUNTIME_RELIABILITY_ORCHESTRATION_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-RUNTIME-RELIABILITY-ORCHESTRATION-SPLIT-001.json'
export const VERIFIER_RUNTIME_RELIABILITY_ORCHESTRATION_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-runtime-reliability-orchestration-split-check.mjs'
export const VERIFIER_RUNTIME_RELIABILITY_ORCHESTRATION_SPLIT_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-verifier-runtime-reliability-orchestration-split-closeout.md'
export const VERIFIER_RUNTIME_RELIABILITY_ORCHESTRATION_SPLIT_BEFORE_LINES = 6388

export const FOUNDATION_SHIP_GATE_SPEED_PAYLOAD_CLOSEOUT_KEY = 'foundation-ship-gate-speed-payload-cleanup-v1'
export const FOUNDATION_VERIFY_TIMING_CARD_ID = 'FOUNDATION-VERIFY-TIMING-001'
export const FOUNDATION_HUB_FULL_PAYLOAD_REDUCE_CARD_ID = 'FOUNDATION-HUB-FULL-PAYLOAD-REDUCE-001'
export const FOUNDATION_VERIFY_PROFILE_SCRIPT_PATH = 'scripts/process-foundation-verify-profile-check.mjs'
export const FOUNDATION_HUB_FULL_PAYLOAD_REDUCE_SCRIPT_PATH = 'scripts/process-foundation-hub-full-payload-reduce-check.mjs'
export const FOUNDATION_CLICKUP_VERIFY_HEALTH_BOUNDARY_CLOSEOUT_KEY = 'foundation-clickup-verify-health-boundary-v1'
export const CLICKUP_SOURCE_VERIFY_SCRIPT_PATH = 'scripts/clickup-source-verify.mjs'
export const CLICKUP_VERIFY_HEALTH_BOUNDARY_SCRIPT_PATH = 'scripts/process-clickup-verify-health-boundary-check.mjs'

export const RUNTIME_RELIABILITY_VERIFIER_CHECK_DEFINITIONS = Object.freeze([
  SOURCE_OUTAGE_BOUNDARY_CARD_ID,
  ...FOUNDATION_OPERATING_RELIABILITY_CARD_IDS,
  PLAN_CRITIC_ARCHITECTURAL_RULES_CARD_ID,
  FOUNDATION_PERFORMANCE_CARD_ID,
  FOUNDATION_FULL_DIAGNOSTICS_PERF_CARD_ID,
  FOUNDATION_HUB_FULL_ROUTE_SPLIT_CARD_ID,
  'SHIP-GATE-FAST-PREFLIGHT-001',
  FOUNDATION_VERIFY_TIMING_CARD_ID,
  'FOUNDATION-VERIFY-MODULE-SPLIT-002',
  FOUNDATION_HUB_FULL_PAYLOAD_REDUCE_CARD_ID,
  'SHIP-GATE-FRESHNESS-OWNERSHIP-001',
  'CLICKUP-VERIFY-FAST-PATH-001',
  'CLICKUP-VERIFY-PAYLOAD-CACHE-001',
  'CLICKUP-DEGRADED-HEALTH-DOGFOOD-001',
  'FOUNDATION-VERIFY-SLOW-BUDGET-001',
  RUNTIME_SUPERVISOR_CARD_ID,
  RUNTIME_WORKER_CARD_ID,
  RUNTIME_FIRST_JOBS_CARD_ID,
  RUNTIME_HEALTH_SIMPLIFY_CARD_ID,
  FILE_SIZE_ENGINEERING_STANDARD_CARD_ID,
  AIOS_RUNTIME_PORTABILITY_GATE_CARD_ID,
  AGENT_STATUS_FRESHNESS_GATE_CARD_ID,
  FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_CARD_ID,
  AGENT_LIVE_ANSWER_PREFLIGHT_GATE_CARD_ID,
  AGENT_CAPABILITY_REGISTRY_CARD_ID,
  FOUNDATION_UP_CAPABILITY_REGISTRY_CARD_ID,
  AGENT_TEMPLATE_RUNTIME_CONTRACT_CARD_ID,
  OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_CARD_ID,
  AGENT_010_CARD_ID,
  ROLE_ASSISTANT_CONTRACTS_CARD_ID,
  HARLAN_PROJECT_REGISTRY_CARD_ID,
  HARLAN_PROJECT_REGISTRY_SYSTEM_CARD_ID,
  HARLAN_OPERATOR_LOOP_CARD_ID,
  HARLAN_AUTH_ESCALATION_LOOP_CARD_ID,
  TRUSTED_ASSISTANT_LOOP_CARD_ID,
])

const SOURCE_OUTAGE_BOUNDARY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  SOURCE_OUTAGE_BOUNDARY_CARD_ID,
]

const PLAN_CRITIC_ARCHITECTURAL_RULES_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  PLAN_CRITIC_ARCHITECTURAL_RULES_CARD_ID,
]

const FOUNDATION_PERFORMANCE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  FOUNDATION_PERFORMANCE_CARD_ID,
]

const FOUNDATION_FULL_DIAGNOSTICS_PERF_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  FOUNDATION_FULL_DIAGNOSTICS_PERF_CARD_ID,
  FOUNDATION_HUB_FULL_ROUTE_SPLIT_CARD_ID,
]

const FOUNDATION_SHIP_GATE_SPEED_PAYLOAD_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'SHIP-GATE-FAST-PREFLIGHT-001',
  FOUNDATION_VERIFY_TIMING_CARD_ID,
  'FOUNDATION-VERIFY-MODULE-SPLIT-002',
  FOUNDATION_HUB_FULL_PAYLOAD_REDUCE_CARD_ID,
  'SHIP-GATE-FRESHNESS-OWNERSHIP-001',
]

const FOUNDATION_CLICKUP_VERIFY_HEALTH_BOUNDARY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'CLICKUP-VERIFY-FAST-PATH-001',
  'CLICKUP-VERIFY-PAYLOAD-CACHE-001',
  'CLICKUP-DEGRADED-HEALTH-DOGFOOD-001',
  'FOUNDATION-VERIFY-SLOW-BUDGET-001',
]

const RUNTIME_SUPERVISOR_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  RUNTIME_SUPERVISOR_CARD_ID,
]

const RUNTIME_WORKER_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  RUNTIME_WORKER_CARD_ID,
]

const RUNTIME_FIRST_JOBS_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  RUNTIME_FIRST_JOBS_CARD_ID,
]

const RUNTIME_HEALTH_SIMPLIFY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  RUNTIME_HEALTH_SIMPLIFY_CARD_ID,
]

const AIOS_RUNTIME_PORTABILITY_GATE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  AIOS_RUNTIME_PORTABILITY_GATE_CARD_ID,
]

const AGENT_STATUS_FRESHNESS_GATE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  AGENT_STATUS_FRESHNESS_GATE_CARD_ID,
]

const FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_CARD_ID,
]

const AGENT_LIVE_ANSWER_PREFLIGHT_GATE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  AGENT_LIVE_ANSWER_PREFLIGHT_GATE_CARD_ID,
]

const AGENT_CAPABILITY_REGISTRY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  AGENT_CAPABILITY_REGISTRY_CARD_ID,
]

const FOUNDATION_UP_CAPABILITY_REGISTRY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  FOUNDATION_UP_CAPABILITY_REGISTRY_CARD_ID,
]

const AGENT_TEMPLATE_RUNTIME_CONTRACT_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  AGENT_TEMPLATE_RUNTIME_CONTRACT_CARD_ID,
]

const OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_CARD_ID,
]

const AGENT_010_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  AGENT_010_CARD_ID,
]

const ROLE_ASSISTANT_CONTRACTS_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  ROLE_ASSISTANT_CONTRACTS_CARD_ID,
]

const HARLAN_PROJECT_REGISTRY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  HARLAN_PROJECT_REGISTRY_CARD_ID,
  HARLAN_PROJECT_REGISTRY_SYSTEM_CARD_ID,
]

const HARLAN_OPERATOR_LOOP_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  HARLAN_OPERATOR_LOOP_CARD_ID,
]

const HARLAN_AUTH_ESCALATION_LOOP_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  HARLAN_AUTH_ESCALATION_LOOP_CARD_ID,
]

const TRUSTED_ASSISTANT_LOOP_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  TRUSTED_ASSISTANT_LOOP_CARD_ID,
]

const FILE_SIZE_ENGINEERING_STANDARD_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  FILE_SIZE_ENGINEERING_STANDARD_CARD_ID,
  'BUILD-CLOSEOUT-REGISTRY-EXTRACT-001',
]

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function findCard(cards = [], cardId) {
  return (cards || []).find(item => item.id === cardId) || null
}

function findCloseout(closeouts = [], closeoutKey) {
  return (closeouts || []).find(closeout => closeout.key === closeoutKey || closeout.closeoutKey === closeoutKey) || null
}

function includesAll(text = '', patterns = []) {
  return patterns.every(pattern => String(text || '').includes(pattern))
}

async function fallbackRepoFileExists() {
  return false
}

function asPackageScripts(input = {}) {
  return input.packageScripts || input.packageJson?.scripts || {}
}

async function resolveReliabilityProofs(input = {}) {
  const proofOverrides = input.proofs || {}
  return {
    sourceOutageBoundaryDogfood: proofOverrides.sourceOutageBoundaryDogfood || await buildSourceOutageBoundaryDogfoodProof(),
    foundationOperatingReliabilityDogfood: proofOverrides.foundationOperatingReliabilityDogfood || buildFoundationOperatingReliabilityDogfoodProof(),
    planCriticArchitecturalRulesProof: proofOverrides.planCriticArchitecturalRulesProof || buildSyntheticPlanCriticArchitecturalRulesProof(),
    foundationPerformanceProof: proofOverrides.foundationPerformanceProof || buildSyntheticFoundationHubBudgetProof(),
    foundationFullDiagnosticsDogfood: proofOverrides.foundationFullDiagnosticsDogfood || await buildSyntheticFoundationFullDiagnosticsDogfoodProof(),
    foundationShipPreflightDogfood: proofOverrides.foundationShipPreflightDogfood || buildFoundationShipPreflightDogfoodProof(),
    clickUpSourceVerifierDogfood: proofOverrides.clickUpSourceVerifierDogfood || await buildClickUpSourceVerifierDogfoodProof(),
    foundationVerifySlowBudgetDogfood: proofOverrides.foundationVerifySlowBudgetDogfood || buildFoundationVerifySlowBudgetDogfoodProof(),
    runtimeSupervisorDogfood: proofOverrides.runtimeSupervisorDogfood || buildRuntimeSupervisorDogfoodProof(),
    runtimeWorkerDogfood: proofOverrides.runtimeWorkerDogfood || buildFoundationWorkerReliabilityDogfoodProof(),
    runtimeFirstJobsDogfood: proofOverrides.runtimeFirstJobsDogfood || buildRuntimeFirstJobsDogfoodProof({
      foundationDbSource: input.sources?.foundationDbSource,
      foundationSourceCrawlStoreSource: input.sources?.foundationSourceCrawlStoreSource,
      runExtractionTargetSource: input.sources?.runExtractionTargetSource,
      foundationJobsSource: input.sources?.foundationJobsSource,
    }),
    runtimeHealthSimplifyDogfood: proofOverrides.runtimeHealthSimplifyDogfood || buildRuntimeHealthSimplifyDogfoodProof(),
    aiosRuntimePortabilityDogfood: proofOverrides.aiosRuntimePortabilityDogfood || buildAiosRuntimePortabilityGateDogfoodProof(),
    agentStatusFreshnessDogfood: proofOverrides.agentStatusFreshnessDogfood || buildAgentStatusFreshnessGateDogfoodProof(),
    agentUsefulnessRuntimeGatesDogfood: proofOverrides.agentUsefulnessRuntimeGatesDogfood || buildFoundationAgentUsefulnessRuntimeGateDogfoodProof(),
    agentLiveAnswerPreflightDogfood: proofOverrides.agentLiveAnswerPreflightDogfood || buildAgentLiveAnswerPreflightGateDogfoodProof(),
    agentCapabilityRegistryDogfood: proofOverrides.agentCapabilityRegistryDogfood || buildAgentCapabilityRegistryDogfoodProof(),
    foundationUpCapabilityRegistryDogfood: proofOverrides.foundationUpCapabilityRegistryDogfood || buildFoundationUpCapabilityRegistryDogfoodProof(),
    agentTemplateRuntimeContractDogfood: proofOverrides.agentTemplateRuntimeContractDogfood || buildAgentTemplateRuntimeContractDogfoodProof(),
    oldSystemAgentOnboardingHarvestDogfood: proofOverrides.oldSystemAgentOnboardingHarvestDogfood || buildOldSystemAgentOnboardingHarvestDogfoodProof(),
    personalAgentOnboardingContractDogfood: proofOverrides.personalAgentOnboardingContractDogfood || buildPersonalAgentOnboardingContractDogfoodProof(),
    roleAssistantContractsDogfood: proofOverrides.roleAssistantContractsDogfood || buildRoleAssistantContractsDogfoodProof(),
    harlanProjectRegistryDogfood: proofOverrides.harlanProjectRegistryDogfood || buildHarlanProjectRegistryDogfoodProof(),
    harlanOperatorLoopDogfood: proofOverrides.harlanOperatorLoopDogfood || buildHarlanOperatorLoopDogfoodProof(),
    harlanAuthEscalationLoopDogfood: proofOverrides.harlanAuthEscalationLoopDogfood || buildHarlanAuthEscalationLoopDogfoodProof(),
    trustedAssistantLoopDogfood: proofOverrides.trustedAssistantLoopDogfood || buildTrustedAssistantLoopDogfoodProof(),
    fileSizeStandardDogfood: proofOverrides.fileSizeStandardDogfood || buildFoundationFileSizeStandardDogfoodProof(),
  }
}

export async function evaluateFoundationRuntimeReliabilityVerifier(input = {}) {
  const checks = []
  const cards = input.foundationHub?.backlogItems || input.cards || []
  const closeouts = input.foundationBuildCloseouts || input.closeouts || []
  const packageScripts = asPackageScripts(input)
  const repoFileExists = input.repoFileExists || fallbackRepoFileExists
  const sources = input.sources || {}
  const apis = input.apis || {}
  const foundationHub = input.foundationHub || apis.foundationHub || {}
  const foundationHubFull = input.foundationHubFull || apis.foundationHubFull || {}
  const foundationHubSummary = input.foundationHubSummary || apis.foundationHubSummary || {}
  const opsHub = input.opsHub || apis.opsHub || {}
  const foundationVerifySource = input.foundationVerifySource || sources.foundationVerifySource || ''
  const proofs = await resolveReliabilityProofs(input)
  const runtimeProcessControl =
    foundationHubFull.runtimeProcessControl ||
    foundationHub.runtimeProcessControl ||
    {}

  const sourceOutageBoundaryCard = findCard(cards, SOURCE_OUTAGE_BOUNDARY_CARD_ID)
  const sourceOutageBoundaryCloseout = findCloseout(closeouts, SOURCE_OUTAGE_BOUNDARY_CLOSEOUT_KEY)
  addCheck(
    checks,
    sourceOutageBoundaryCard &&
      sourceOutageBoundaryCard.lane === 'done' &&
      String(sourceOutageBoundaryCard.statusNote || '').includes(SOURCE_OUTAGE_BOUNDARY_CLOSEOUT_KEY) &&
      sourceOutageBoundaryCloseout?.operatorCloseout === true &&
      (sourceOutageBoundaryCloseout.backlogIds || []).includes(SOURCE_OUTAGE_BOUNDARY_CARD_ID) &&
      proofs.sourceOutageBoundaryDogfood.ok === true &&
      proofs.sourceOutageBoundaryDogfood.checks?.length >= 5 &&
      packageScripts['process:source-outage-boundary-check'] === `node --env-file-if-exists=.env ${SOURCE_OUTAGE_BOUNDARY_SCRIPT_PATH}` &&
      await repoFileExists(SOURCE_OUTAGE_BOUNDARY_PLAN_PATH) &&
      await repoFileExists(SOURCE_OUTAGE_BOUNDARY_APPROVAL_PATH) &&
      await repoFileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-14-source-outage-boundary-closeout.md') &&
      sources.sourceOutageBoundarySource?.includes('buildSourceOutageBoundaryDogfoodProof') &&
      sources.sourceOutageBoundaryScriptSource?.includes('dogfood proof recreates ClickUp 500 and proves fail-soft behavior') &&
      sources.sourceOutageBoundaryPlanSource?.includes('ClickUp `500 DB_003`') &&
      sources.clickupSource?.includes('getClickUpListSnapshotSafe') &&
      sources.clickupSource?.includes('buildUnavailableClickUpListSnapshot') &&
      sources.agentRosterReviewSource?.includes('agent-roster-source-degraded') &&
      sources.agentFeedbackAutoSendSource?.includes('sourceUnavailable') &&
      sources.agentFeedbackProductionAutoSendDryRunSource?.includes('sourceUnavailable') &&
      sources.agentFeedbackReminderSource?.includes('sourceUnavailable') &&
      sources.serverRouteSource?.includes('sourceOutageBoundary') &&
      foundationHub.sourceOutageBoundary?.status &&
      opsHub.sourceOutageBoundary?.status &&
      includesAll(foundationVerifySource, SOURCE_OUTAGE_BOUNDARY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'SOURCE-OUTAGE-BOUNDARY-001 keeps Foundation/Ops serving during ClickUp read outages',
    sourceOutageBoundaryCard
      ? `lane=${sourceOutageBoundaryCard.lane} dogfood=${proofs.sourceOutageBoundaryDogfood.ok ? 'pass' : 'blocked'} foundation=${foundationHub.sourceOutageBoundary?.status || 'missing'} ops=${opsHub.sourceOutageBoundary?.status || 'missing'}`
      : `missing ${SOURCE_OUTAGE_BOUNDARY_CARD_ID}`,
  )

  const foundationOperatingReliabilityCards = FOUNDATION_OPERATING_RELIABILITY_CARD_IDS.map(id => findCard(cards, id))
  const foundationOperatingReliabilityCloseout = findCloseout(closeouts, FOUNDATION_OPERATING_RELIABILITY_CLOSEOUT_KEY)
  addCheck(
    checks,
    foundationOperatingReliabilityCards.every(card =>
      card &&
      card.lane === 'done' &&
      String(card.statusNote || '').includes(FOUNDATION_OPERATING_RELIABILITY_CLOSEOUT_KEY)
    ) &&
      foundationOperatingReliabilityCloseout?.operatorCloseout === true &&
      FOUNDATION_OPERATING_RELIABILITY_CARD_IDS.every(id => (foundationOperatingReliabilityCloseout.backlogIds || []).includes(id)) &&
      proofs.foundationOperatingReliabilityDogfood.ok === true &&
      proofs.foundationOperatingReliabilityDogfood.checks?.length >= 8 &&
      packageScripts['process:foundation-operating-reliability-check'] === `node --env-file-if-exists=.env ${FOUNDATION_OPERATING_RELIABILITY_SCRIPT_PATH}` &&
      sources.foundationJobsSource?.includes(CONNECTOR_UPTIME_MONITOR_JOB_KEY) &&
      sources.foundationJobsSource?.includes("mutationPosture: 'read_only'") &&
      sources.connectorUptimeMonitorSource?.includes('buildConnectorUptimeSnapshot') &&
      sources.connectorUptimeMonitorSource?.includes('buildRuntimeActivationSnapshot') &&
      sources.connectorUptimeMonitorSource?.includes('buildMorningHealthSnapshot') &&
      sources.connectorUptimeMonitorSource?.includes('assertNoConnectorUptimeSecretLeak') &&
      sources.foundationOperatingReliabilityScriptSource?.includes('dogfood recreates connector failures, runtime states, and audit confusion') &&
      sources.serverRouteSource?.includes('foundationOperatingReliability') &&
      foundationHubFull.foundationOperatingReliability?.connectorUptime?.rows?.length >= 6 &&
      foundationHubFull.foundationOperatingReliability?.runtimeActivation?.jobs?.length >= 1 &&
      foundationHubFull.foundationOperatingReliability?.morningHealth?.reportOnly === true &&
      includesAll(foundationVerifySource, FOUNDATION_OPERATING_RELIABILITY_CARD_IDS),
    'Foundation Operating Reliability exposes connector uptime, runtime activation, and report-only morning health',
    `cards=${foundationOperatingReliabilityCards.filter(card => card?.lane === 'done').length}/${FOUNDATION_OPERATING_RELIABILITY_CARD_IDS.length} dogfood=${proofs.foundationOperatingReliabilityDogfood.ok ? 'pass' : 'blocked'} connectors=${foundationHubFull.foundationOperatingReliability?.connectorUptime?.rows?.length || 0}`,
  )

  const runtimeSupervisorCard = findCard(cards, RUNTIME_SUPERVISOR_CARD_ID)
  const runtimeSupervisorCloseout = findCloseout(closeouts, RUNTIME_SUPERVISOR_CLOSEOUT_KEY)
  const runtimeSupervisorClosed = runtimeSupervisorCard?.lane === 'done'
  addCheck(
    checks,
    runtimeSupervisorCard &&
      ['scoped', 'executing', 'done'].includes(runtimeSupervisorCard.lane) &&
      (!runtimeSupervisorClosed || (
        String(runtimeSupervisorCard.statusNote || '').includes(RUNTIME_SUPERVISOR_CLOSEOUT_KEY) &&
        runtimeSupervisorCloseout?.operatorCloseout === true &&
        (runtimeSupervisorCloseout.backlogIds || []).includes(RUNTIME_SUPERVISOR_CARD_ID)
      )) &&
      proofs.runtimeSupervisorDogfood.ok === true &&
      proofs.runtimeSupervisorDogfood.missingLaunchAgentRejected === true &&
      proofs.runtimeSupervisorDogfood.pidMismatchRejected === true &&
      proofs.runtimeSupervisorDogfood.staleCommitRejected === true &&
      proofs.runtimeSupervisorDogfood.staleHeartbeatRejected === true &&
      packageScripts['process:runtime-supervisor-check'] === `node --env-file-if-exists=.env ${RUNTIME_SUPERVISOR_SCRIPT_PATH}` &&
      await repoFileExists(RUNTIME_SUPERVISOR_PLAN_PATH) &&
      await repoFileExists(RUNTIME_SUPERVISOR_APPROVAL_PATH) &&
      sources.runtimeProcessControlSource?.includes('buildRuntimeServiceSupervisorSnapshot') &&
      sources.runtimeProcessControlSource?.includes('buildRuntimeSupervisorDogfoodProof') &&
      sources.serverRouteSource?.includes('getLaunchAgentStatus') &&
      sources.serverRouteSource?.includes('launchAgents:') &&
      sources.foundationRuntimeRendererSource?.includes('Supervised services') &&
      runtimeProcessControl.serviceSupervisor?.summary?.serviceCount === 2 &&
      runtimeProcessControl.serviceSupervisor?.status === 'healthy' &&
      includesAll(foundationVerifySource, RUNTIME_SUPERVISOR_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'RUNTIME-SUPERVISOR-001 exposes dashboard/worker service supervision without claiming auto-restart',
    runtimeSupervisorCard
      ? `lane=${runtimeSupervisorCard.lane} dogfood=${proofs.runtimeSupervisorDogfood.ok ? 'pass' : 'blocked'} serviceStatus=${runtimeProcessControl.serviceSupervisor?.status || 'missing'} services=${runtimeProcessControl.serviceSupervisor?.summary?.serviceCount || 0}`
      : `missing ${RUNTIME_SUPERVISOR_CARD_ID}`,
  )

  const runtimeWorkerCard = findCard(cards, RUNTIME_WORKER_CARD_ID)
  const runtimeWorkerCloseout = findCloseout(closeouts, RUNTIME_WORKER_CLOSEOUT_KEY)
  const runtimeWorkerClosed = runtimeWorkerCard?.lane === 'done'
  const workerReliability =
    foundationHubFull.foundationJobs?.workerReliability ||
    foundationHub.foundationJobs?.workerReliability ||
    {}
  addCheck(
    checks,
    runtimeWorkerCard &&
      ['scoped', 'executing', 'done'].includes(runtimeWorkerCard.lane) &&
      (!runtimeWorkerClosed || (
        String(runtimeWorkerCard.statusNote || '').includes(RUNTIME_WORKER_CLOSEOUT_KEY) &&
        runtimeWorkerCloseout?.operatorCloseout === true &&
        (runtimeWorkerCloseout.backlogIds || []).includes(RUNTIME_WORKER_CARD_ID)
      )) &&
      proofs.runtimeWorkerDogfood.ok === true &&
      proofs.runtimeWorkerDogfood.dryRunAliasAccepted === true &&
      proofs.runtimeWorkerDogfood.retryCandidateSurfaced === true &&
      proofs.runtimeWorkerDogfood.blockedScheduledSurfaced === true &&
      proofs.runtimeWorkerDogfood.staleActiveSurfaced === true &&
      packageScripts['process:runtime-worker-check'] === `node --env-file-if-exists=.env ${RUNTIME_WORKER_SCRIPT_PATH}` &&
      await repoFileExists(RUNTIME_WORKER_PLAN_PATH) &&
      await repoFileExists(RUNTIME_WORKER_APPROVAL_PATH) &&
      sources.foundationWorkerReliabilitySource?.includes('parseFoundationWorkerArgs') &&
      sources.foundationWorkerReliabilitySource?.includes('buildFoundationWorkerReliabilitySnapshot') &&
      sources.foundationWorkerReliabilitySource?.includes('buildFoundationWorkerReliabilityDogfoodProof') &&
      sources.foundationWorkerSource?.includes('parseFoundationWorkerArgs') &&
      sources.foundationRuntimeJobStoreSource?.includes('workerReliability: buildFoundationWorkerReliabilitySnapshot') &&
      sources.foundationHubSummaryPayloadSource?.includes('workerReliability') &&
      sources.foundationRuntimeRendererSource?.includes('Worker reliability') &&
      workerReliability.cardId === RUNTIME_WORKER_CARD_ID &&
      ['healthy', 'pending', 'risk'].includes(workerReliability.status) &&
      includesAll(foundationVerifySource, RUNTIME_WORKER_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'RUNTIME-WORKER-001 exposes dry-run-safe worker retry/failure visibility',
    runtimeWorkerCard
      ? `lane=${runtimeWorkerCard.lane} dogfood=${proofs.runtimeWorkerDogfood.ok ? 'pass' : 'blocked'} workerStatus=${workerReliability.status || 'missing'}`
      : `missing ${RUNTIME_WORKER_CARD_ID}`,
  )

  const runtimeFirstJobsCard = findCard(cards, RUNTIME_FIRST_JOBS_CARD_ID)
  const runtimeFirstJobsCloseout = findCloseout(closeouts, RUNTIME_FIRST_JOBS_CLOSEOUT_KEY)
  const runtimeFirstJobsClosed = runtimeFirstJobsCard?.lane === 'done'
  const runtimeFirstJobKeysRegistered = RUNTIME_FIRST_SAFE_JOB_KEYS.every(jobKey =>
    sources.foundationJobsSource?.includes(`key: '${jobKey}'`)
  )
  const runtimeFirstTargetKeysRegistered = RUNTIME_FIRST_SAFE_TARGET_KEYS.every(targetKey =>
    sources.foundationJobsSource?.includes(`--target=${targetKey}`)
  )
  addCheck(
    checks,
    runtimeFirstJobsCard &&
      ['scoped', 'executing', 'done'].includes(runtimeFirstJobsCard.lane) &&
      (!runtimeFirstJobsClosed || (
        String(runtimeFirstJobsCard.statusNote || '').includes(RUNTIME_FIRST_JOBS_CLOSEOUT_KEY) &&
        runtimeFirstJobsCloseout?.operatorCloseout === true &&
        (runtimeFirstJobsCloseout.backlogIds || []).includes(RUNTIME_FIRST_JOBS_CARD_ID)
      )) &&
      proofs.runtimeFirstJobsDogfood.ok === true &&
      proofs.runtimeFirstJobsDogfood.oldMissingDbExportRejected === true &&
      proofs.runtimeFirstJobsDogfood.oldDryRunParserRejected === true &&
      packageScripts['process:runtime-first-jobs-check'] === `node --env-file-if-exists=.env ${RUNTIME_FIRST_JOBS_SCRIPT_PATH}` &&
      await repoFileExists(RUNTIME_FIRST_JOBS_PLAN_PATH) &&
      await repoFileExists(RUNTIME_FIRST_JOBS_APPROVAL_PATH) &&
      sources.foundationSourceCrawlStoreSource?.includes('leaseSourceCrawlTarget,') &&
      sources.foundationSourceCrawlStoreSource?.includes('finishSourceCrawlTargetRun,') &&
      sources.foundationDbSource?.includes('export const leaseSourceCrawlTarget = foundationSourceCrawlStore.leaseSourceCrawlTarget') &&
      sources.foundationDbSource?.includes('export const finishSourceCrawlTargetRun = foundationSourceCrawlStore.finishSourceCrawlTargetRun') &&
      sources.runExtractionTargetSource?.includes('const normalizedKey') &&
      sources.runExtractionTargetSource?.includes('if (dryRun)') &&
      runtimeFirstJobKeysRegistered &&
      runtimeFirstTargetKeysRegistered &&
      includesAll(foundationVerifySource, RUNTIME_FIRST_JOBS_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'RUNTIME-FIRST-JOBS-001 proves first scheduled current-sync jobs load dry-run before any live lease',
    runtimeFirstJobsCard
      ? `lane=${runtimeFirstJobsCard.lane} dogfood=${proofs.runtimeFirstJobsDogfood.ok ? 'pass' : 'blocked'} jobs=${runtimeFirstJobKeysRegistered ? 'registered' : 'missing'} targets=${runtimeFirstTargetKeysRegistered ? 'registered' : 'missing'}`
      : `missing ${RUNTIME_FIRST_JOBS_CARD_ID}`,
  )

  const runtimeHealthSimplifyCard = findCard(cards, RUNTIME_HEALTH_SIMPLIFY_CARD_ID)
  const runtimeHealthSimplifyCloseout = findCloseout(closeouts, RUNTIME_HEALTH_SIMPLIFY_CLOSEOUT_KEY)
  const runtimeHealthSimplifyClosed = runtimeHealthSimplifyCard?.lane === 'done'
  const runtimeHealthSimplifySourceEvaluation = evaluateRuntimeHealthSimplifySource({
    runtimeRendererSource: sources.foundationRuntimeRendererSource,
    operationsRendererSource: sources.foundationOperationsRendererSource,
    stylesSource: sources.foundationWorkflowStylesSource,
    packageScripts,
    foundationVerifySource,
    runtimeReliabilityVerifierSource: sources.foundationRuntimeReliabilityVerifierSource,
  })
  addCheck(
    checks,
    runtimeHealthSimplifyCard &&
      ['scoped', 'executing', 'done'].includes(runtimeHealthSimplifyCard.lane) &&
      (!runtimeHealthSimplifyClosed || (
        String(runtimeHealthSimplifyCard.statusNote || '').includes(RUNTIME_HEALTH_SIMPLIFY_CLOSEOUT_KEY) &&
        runtimeHealthSimplifyCloseout?.operatorCloseout === true &&
        (runtimeHealthSimplifyCloseout.backlogIds || []).includes(RUNTIME_HEALTH_SIMPLIFY_CARD_ID)
      )) &&
      proofs.runtimeHealthSimplifyDogfood.ok === true &&
      proofs.runtimeHealthSimplifyDogfood.oldNoCommandPanelRejected === true &&
      proofs.runtimeHealthSimplifyDogfood.oldDirectAppendDiagnosticsRejected === true &&
      proofs.runtimeHealthSimplifyDogfood.oldNoJumpActionsRejected === true &&
      proofs.runtimeHealthSimplifyDogfood.missingCollapsedDetailsRejected === true &&
      runtimeHealthSimplifySourceEvaluation.ok === true &&
      packageScripts['process:runtime-health-simplify-check'] === `node --env-file-if-exists=.env ${RUNTIME_HEALTH_SIMPLIFY_SCRIPT_PATH}` &&
      await repoFileExists(RUNTIME_HEALTH_SIMPLIFY_PLAN_PATH) &&
      await repoFileExists(RUNTIME_HEALTH_SIMPLIFY_APPROVAL_PATH) &&
      sources.runtimeHealthSimplifySource?.includes('buildRuntimeHealthSimplifyDogfoodProof') &&
      sources.runtimeHealthSimplifySource?.includes('oldDirectAppendDiagnosticsRejected') &&
      includesAll(foundationVerifySource, RUNTIME_HEALTH_SIMPLIFY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'RUNTIME-HEALTH-SIMPLIFY-001 gives Runtime Health a command read without deleting diagnostics',
    runtimeHealthSimplifyCard
      ? `lane=${runtimeHealthSimplifyCard.lane} dogfood=${proofs.runtimeHealthSimplifyDogfood.ok ? 'pass' : 'blocked'} source=${runtimeHealthSimplifySourceEvaluation.ok ? 'pass' : 'blocked'}`
      : `missing ${RUNTIME_HEALTH_SIMPLIFY_CARD_ID}`,
  )

  const aiosRuntimePortabilityCard = findCard(cards, AIOS_RUNTIME_PORTABILITY_GATE_CARD_ID)
  const aiosRuntimePortabilityCloseout = findCloseout(closeouts, AIOS_RUNTIME_PORTABILITY_GATE_CLOSEOUT_KEY)
  const aiosRuntimePortabilityGate = input.aiosRuntimePortabilityGate || buildAiosRuntimePortabilityGate()
  const aiosRuntimePortabilityStatus = evaluateAiosRuntimePortabilityGate(aiosRuntimePortabilityGate)
  addCheck(
    checks,
    aiosRuntimePortabilityCard &&
      ['scoped', 'executing', 'done'].includes(aiosRuntimePortabilityCard.lane) &&
      aiosRuntimePortabilityCard.lane === 'done' &&
      String(aiosRuntimePortabilityCard.statusNote || '').includes(AIOS_RUNTIME_PORTABILITY_GATE_CLOSEOUT_KEY) &&
      aiosRuntimePortabilityCloseout?.operatorCloseout === true &&
      (aiosRuntimePortabilityCloseout.backlogIds || []).includes(AIOS_RUNTIME_PORTABILITY_GATE_CARD_ID) &&
      aiosRuntimePortabilityStatus.ok === true &&
      proofs.aiosRuntimePortabilityDogfood.ok === true &&
      proofs.aiosRuntimePortabilityDogfood.runtimeOwnedTruthRejected === true &&
      proofs.aiosRuntimePortabilityDogfood.directProviderRouteRejected === true &&
      proofs.aiosRuntimePortabilityDogfood.livePaidAuthRunRejected === true &&
      packageScripts['process:aios-runtime-portability-gate-check'] === `node --env-file-if-exists=.env ${AIOS_RUNTIME_PORTABILITY_GATE_SCRIPT_PATH}` &&
      await repoFileExists(AIOS_RUNTIME_PORTABILITY_GATE_PLAN_PATH) &&
      await repoFileExists(AIOS_RUNTIME_PORTABILITY_GATE_APPROVAL_PATH) &&
      await repoFileExists(AIOS_RUNTIME_PORTABILITY_GATE_CLOSEOUT_PATH) &&
      sources.aiosRuntimePortabilityGateSource?.includes('buildAiosRuntimePortabilityGateDogfoodProof') &&
      sources.aiosRuntimePortabilityGateSource?.includes('directProviderRouteRejected') &&
      sources.aiosRuntimePortabilityGateSource?.includes('runtimeOwnedTruthRejected') &&
      sources.aiosRuntimePortabilityGateSource?.includes('livePaidAuthRunRejected') &&
      includesAll(foundationVerifySource, AIOS_RUNTIME_PORTABILITY_GATE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'AIOS-RUNTIME-PORTABILITY-GATE-001 keeps runtime brains as Foundation-owned adapters',
    aiosRuntimePortabilityCard
      ? `lane=${aiosRuntimePortabilityCard.lane} status=${aiosRuntimePortabilityStatus.status} adapters=${aiosRuntimePortabilityStatus.summary.adapterFamilyCount} dogfood=${proofs.aiosRuntimePortabilityDogfood.ok ? 'pass' : 'blocked'}`
      : `missing ${AIOS_RUNTIME_PORTABILITY_GATE_CARD_ID}`,
  )

  const agentStatusFreshnessCard = findCard(cards, AGENT_STATUS_FRESHNESS_GATE_CARD_ID)
  const agentStatusFreshnessCloseout = findCloseout(closeouts, AGENT_STATUS_FRESHNESS_GATE_CLOSEOUT_KEY)
  const agentStatusFreshnessGate = input.agentStatusFreshnessGate || buildAgentStatusFreshnessGate()
  const agentStatusFreshnessStatus = evaluateAgentStatusFreshnessGate(agentStatusFreshnessGate)
  addCheck(
    checks,
    agentStatusFreshnessCard &&
      ['scoped', 'executing', 'done'].includes(agentStatusFreshnessCard.lane) &&
      agentStatusFreshnessCard.lane === 'done' &&
      String(agentStatusFreshnessCard.statusNote || '').includes(AGENT_STATUS_FRESHNESS_GATE_CLOSEOUT_KEY) &&
      agentStatusFreshnessCloseout?.operatorCloseout === true &&
      (agentStatusFreshnessCloseout.backlogIds || []).includes(AGENT_STATUS_FRESHNESS_GATE_CARD_ID) &&
      agentStatusFreshnessStatus.ok === true &&
      proofs.agentStatusFreshnessDogfood.ok === true &&
      proofs.agentStatusFreshnessDogfood.memoryOnlyCurrentRejected === true &&
      proofs.agentStatusFreshnessDogfood.staleLiveReadRejected === true &&
      proofs.agentStatusFreshnessDogfood.staleHarlanClaimRejected === true &&
      packageScripts['process:agent-status-freshness-gate-check'] === `node --env-file-if-exists=.env ${AGENT_STATUS_FRESHNESS_GATE_SCRIPT_PATH}` &&
      await repoFileExists(AGENT_STATUS_FRESHNESS_GATE_PLAN_PATH) &&
      await repoFileExists(AGENT_STATUS_FRESHNESS_GATE_APPROVAL_PATH) &&
      await repoFileExists(AGENT_STATUS_FRESHNESS_GATE_CLOSEOUT_PATH) &&
      sources.agentStatusFreshnessGateSource?.includes('buildAgentStatusFreshnessGateDogfoodProof') &&
      sources.agentStatusFreshnessGateSource?.includes('memoryOnlyCurrentRejected') &&
      sources.agentStatusFreshnessGateSource?.includes('staleLiveReadRejected') &&
      sources.agentStatusFreshnessGateSource?.includes('staleHarlanClaimRejected') &&
      includesAll(foundationVerifySource, AGENT_STATUS_FRESHNESS_GATE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'AGENT-STATUS-FRESHNESS-GATE-001 requires live Foundation/API truth for current status claims',
    agentStatusFreshnessCard
      ? `lane=${agentStatusFreshnessCard.lane} status=${agentStatusFreshnessStatus.status} dogfood=${proofs.agentStatusFreshnessDogfood.ok ? 'pass' : 'blocked'}`
      : `missing ${AGENT_STATUS_FRESHNESS_GATE_CARD_ID}`,
  )

  const agentUsefulnessRuntimeGatesCard = findCard(cards, FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_CARD_ID)
  const agentUsefulnessRuntimeGatesCloseout = findCloseout(closeouts, FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_CLOSEOUT_KEY)
  const agentUsefulnessRuntimeGatesBundle = input.agentUsefulnessRuntimeGatesBundle || buildFoundationAgentUsefulnessRuntimeGateBundle()
  const agentUsefulnessRuntimeGatesStatus = evaluateFoundationAgentUsefulnessRuntimeGateBundle(agentUsefulnessRuntimeGatesBundle)
  addCheck(
    checks,
    agentUsefulnessRuntimeGatesCard &&
      ['scoped', 'executing', 'done'].includes(agentUsefulnessRuntimeGatesCard.lane) &&
      agentUsefulnessRuntimeGatesCard.lane === 'done' &&
      String(agentUsefulnessRuntimeGatesCard.statusNote || '').includes(FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_CLOSEOUT_KEY) &&
      agentUsefulnessRuntimeGatesCloseout?.operatorCloseout === true &&
      (agentUsefulnessRuntimeGatesCloseout.backlogIds || []).includes(FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_CARD_ID) &&
      agentUsefulnessRuntimeGatesStatus.ok === true &&
      proofs.agentUsefulnessRuntimeGatesDogfood.ok === true &&
      proofs.agentUsefulnessRuntimeGatesDogfood.promptOnlyBundleRejected === true &&
      proofs.agentUsefulnessRuntimeGatesDogfood.staleMemoryAnswerRejected === true &&
      proofs.agentUsefulnessRuntimeGatesDogfood.undeclaredCapabilityRejected === true &&
      proofs.agentUsefulnessRuntimeGatesDogfood.unapprovedWriteRejected === true &&
      proofs.agentUsefulnessRuntimeGatesDogfood.hiddenWorkerRejected === true &&
      proofs.agentUsefulnessRuntimeGatesDogfood.hiddenFailureRejected === true &&
      packageScripts['process:foundation-agent-usefulness-runtime-gates-check'] === `node --env-file-if-exists=.env ${FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_SCRIPT_PATH}` &&
      await repoFileExists(FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_PLAN_PATH) &&
      await repoFileExists(FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_APPROVAL_PATH) &&
      await repoFileExists(FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_CLOSEOUT_PATH) &&
      sources.foundationRuntimeReliabilityVerifierSource?.includes('buildFoundationAgentUsefulnessRuntimeGateDogfoodProof') &&
      includesAll(foundationVerifySource, FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001 makes agent usefulness code-enforced',
    agentUsefulnessRuntimeGatesCard
      ? `lane=${agentUsefulnessRuntimeGatesCard.lane} status=${agentUsefulnessRuntimeGatesStatus.status} dogfood=${proofs.agentUsefulnessRuntimeGatesDogfood.ok ? 'pass' : 'blocked'}`
      : `missing ${FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_CARD_ID}`,
  )

  const agentLiveAnswerPreflightCard = findCard(cards, AGENT_LIVE_ANSWER_PREFLIGHT_GATE_CARD_ID)
  const agentLiveAnswerPreflightCloseout = findCloseout(closeouts, AGENT_LIVE_ANSWER_PREFLIGHT_GATE_CLOSEOUT_KEY)
  const agentLiveAnswerPreflightGate = input.agentLiveAnswerPreflightGate || buildAgentLiveAnswerPreflightGate()
  const agentLiveAnswerPreflightStatus = evaluateAgentLiveAnswerPreflightGate(agentLiveAnswerPreflightGate)
  addCheck(
    checks,
    agentLiveAnswerPreflightCard &&
      ['scoped', 'executing', 'done'].includes(agentLiveAnswerPreflightCard.lane) &&
      agentLiveAnswerPreflightCard.lane === 'done' &&
      String(agentLiveAnswerPreflightCard.statusNote || '').includes(AGENT_LIVE_ANSWER_PREFLIGHT_GATE_CLOSEOUT_KEY) &&
      agentLiveAnswerPreflightCloseout?.operatorCloseout === true &&
      (agentLiveAnswerPreflightCloseout.backlogIds || []).includes(AGENT_LIVE_ANSWER_PREFLIGHT_GATE_CARD_ID) &&
      agentLiveAnswerPreflightStatus.ok === true &&
      proofs.agentLiveAnswerPreflightDogfood.ok === true &&
      proofs.agentLiveAnswerPreflightDogfood.memoryCurrentRejected === true &&
      proofs.agentLiveAnswerPreflightDogfood.missingPreflightRejected === true &&
      proofs.agentLiveAnswerPreflightDogfood.staleCurrentRejected === true &&
      proofs.agentLiveAnswerPreflightDogfood.missingToolCurrentRejected === true &&
      proofs.agentLiveAnswerPreflightDogfood.unavailableNoWordingRejected === true &&
      proofs.agentLiveAnswerPreflightDogfood.missingEvidenceStampRejected === true &&
      packageScripts['process:agent-live-answer-preflight-gate-check'] === `node --env-file-if-exists=.env ${AGENT_LIVE_ANSWER_PREFLIGHT_GATE_SCRIPT_PATH}` &&
      await repoFileExists(AGENT_LIVE_ANSWER_PREFLIGHT_GATE_PLAN_PATH) &&
      await repoFileExists(AGENT_LIVE_ANSWER_PREFLIGHT_GATE_APPROVAL_PATH) &&
      await repoFileExists(AGENT_LIVE_ANSWER_PREFLIGHT_GATE_CLOSEOUT_PATH) &&
      sources.foundationRuntimeReliabilityVerifierSource?.includes('buildAgentLiveAnswerPreflightGateDogfoodProof') &&
      includesAll(foundationVerifySource, AGENT_LIVE_ANSWER_PREFLIGHT_GATE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001 requires fresh evidence stamps for current operational answers',
    agentLiveAnswerPreflightCard
      ? `lane=${agentLiveAnswerPreflightCard.lane} status=${agentLiveAnswerPreflightStatus.status} dogfood=${proofs.agentLiveAnswerPreflightDogfood.ok ? 'pass' : 'blocked'}`
      : `missing ${AGENT_LIVE_ANSWER_PREFLIGHT_GATE_CARD_ID}`,
  )

  const agentCapabilityRegistryCard = findCard(cards, AGENT_CAPABILITY_REGISTRY_CARD_ID)
  const agentCapabilityRegistryCloseout = findCloseout(closeouts, AGENT_CAPABILITY_REGISTRY_CLOSEOUT_KEY)
  const agentCapabilityRegistryStatus = evaluateAgentCapabilityRegistry(input.agentCapabilityRegistry || buildAgentCapabilityRegistry())
  addCheck(
    checks,
    agentCapabilityRegistryCard &&
      ['scoped', 'executing', 'done'].includes(agentCapabilityRegistryCard.lane) &&
      agentCapabilityRegistryCard.lane === 'done' &&
      String(agentCapabilityRegistryCard.statusNote || '').includes(AGENT_CAPABILITY_REGISTRY_CLOSEOUT_KEY) &&
      agentCapabilityRegistryCloseout?.operatorCloseout === true &&
      (agentCapabilityRegistryCloseout.backlogIds || []).includes(AGENT_CAPABILITY_REGISTRY_CARD_ID) &&
      agentCapabilityRegistryStatus.ok === true &&
      proofs.agentCapabilityRegistryDogfood.ok === true &&
      proofs.agentCapabilityRegistryDogfood.missingToolsRejected === true &&
      proofs.agentCapabilityRegistryDogfood.undeclaredCapabilityClaimRejected === true &&
      proofs.agentCapabilityRegistryDogfood.unapprovedWriteClaimRejected === true &&
      proofs.agentCapabilityRegistryDogfood.liveSideEffectAttemptRejected === true &&
      packageScripts['process:agent-capability-registry-check'] === `node --env-file-if-exists=.env ${AGENT_CAPABILITY_REGISTRY_SCRIPT_PATH}` &&
      await repoFileExists(AGENT_CAPABILITY_REGISTRY_PLAN_PATH) &&
      await repoFileExists(AGENT_CAPABILITY_REGISTRY_APPROVAL_PATH) &&
      await repoFileExists(AGENT_CAPABILITY_REGISTRY_CLOSEOUT_PATH) &&
      sources.foundationRuntimeReliabilityVerifierSource?.includes('buildAgentCapabilityRegistryDogfoodProof') &&
      includesAll(foundationVerifySource, AGENT_CAPABILITY_REGISTRY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'AGENT-CAPABILITY-REGISTRY-001 declares read-only agent capabilities before capability claims',
    agentCapabilityRegistryCard
      ? `lane=${agentCapabilityRegistryCard.lane} status=${agentCapabilityRegistryStatus.status} dogfood=${proofs.agentCapabilityRegistryDogfood.ok ? 'pass' : 'blocked'}`
      : `missing ${AGENT_CAPABILITY_REGISTRY_CARD_ID}`,
  )

  const foundationUpCapabilityRegistryCard = findCard(cards, FOUNDATION_UP_CAPABILITY_REGISTRY_CARD_ID)
  const foundationUpCapabilityRegistryCloseout = findCloseout(closeouts, FOUNDATION_UP_CAPABILITY_REGISTRY_CLOSEOUT_KEY)
  const foundationUpCapabilityRegistryStatus = evaluateFoundationUpCapabilityRegistry(input.foundationUpCapabilityRegistry || buildFoundationUpCapabilityRegistry())
  addCheck(
    checks,
    foundationUpCapabilityRegistryCard &&
      ['scoped', 'executing', 'done'].includes(foundationUpCapabilityRegistryCard.lane) &&
      foundationUpCapabilityRegistryCard.lane === 'done' &&
      String(foundationUpCapabilityRegistryCard.statusNote || '').includes(FOUNDATION_UP_CAPABILITY_REGISTRY_CLOSEOUT_KEY) &&
      foundationUpCapabilityRegistryCloseout?.operatorCloseout === true &&
      (foundationUpCapabilityRegistryCloseout.backlogIds || []).includes(FOUNDATION_UP_CAPABILITY_REGISTRY_CARD_ID) &&
      foundationUpCapabilityRegistryStatus.ok === true &&
      proofs.foundationUpCapabilityRegistryDogfood.ok === true &&
      proofs.foundationUpCapabilityRegistryDogfood.cases?.missingEnvRejected === true &&
      proofs.foundationUpCapabilityRegistryDogfood.cases?.missingAuditRejected === true &&
      proofs.foundationUpCapabilityRegistryDogfood.cases?.providerApprovedTooEarlyRejected === true &&
      proofs.foundationUpCapabilityRegistryDogfood.cases?.hiddenWorkerRejected === true &&
      proofs.foundationUpCapabilityRegistryDogfood.cases?.destructiveTerminalRejected === true &&
      proofs.foundationUpCapabilityRegistryDogfood.cases?.sideEffectsRejected === true &&
      proofs.foundationUpCapabilityRegistryDogfood.cases?.secretLeakRejected === true &&
      packageScripts['process:foundation-up-capability-registry-check'] === `node --env-file-if-exists=.env ${FOUNDATION_UP_CAPABILITY_REGISTRY_SCRIPT_PATH}` &&
      await repoFileExists(FOUNDATION_UP_CAPABILITY_REGISTRY_PLAN_PATH) &&
      await repoFileExists(FOUNDATION_UP_CAPABILITY_REGISTRY_APPROVAL_PATH) &&
      await repoFileExists(FOUNDATION_UP_CAPABILITY_REGISTRY_CLOSEOUT_PATH) &&
      sources.foundationRuntimeReliabilityVerifierSource?.includes('buildFoundationUpCapabilityRegistryDogfoodProof') &&
      includesAll(foundationVerifySource, FOUNDATION_UP_CAPABILITY_REGISTRY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'FOUNDATION-UP-CAPABILITY-REGISTRY-001 registers provider/tool capabilities before agent use',
    foundationUpCapabilityRegistryCard
      ? `lane=${foundationUpCapabilityRegistryCard.lane} status=${foundationUpCapabilityRegistryStatus.status} capabilities=${foundationUpCapabilityRegistryStatus.summary.capabilityCount} dogfood=${proofs.foundationUpCapabilityRegistryDogfood.ok ? 'pass' : 'blocked'}`
      : `missing ${FOUNDATION_UP_CAPABILITY_REGISTRY_CARD_ID}`,
  )

  const agentTemplateRuntimeContractCard = findCard(cards, AGENT_TEMPLATE_RUNTIME_CONTRACT_CARD_ID)
  const agentTemplateRuntimeContractCloseout = findCloseout(closeouts, AGENT_TEMPLATE_RUNTIME_CONTRACT_CLOSEOUT_KEY)
  const agentTemplateRuntimeContractStatus = evaluateAgentTemplateRuntimeContract(input.agentTemplateRuntimeContract || buildAgentTemplateRuntimeContract())
  addCheck(
    checks,
    agentTemplateRuntimeContractCard &&
      ['scoped', 'executing', 'done'].includes(agentTemplateRuntimeContractCard.lane) &&
      agentTemplateRuntimeContractCard.lane === 'done' &&
      String(agentTemplateRuntimeContractCard.statusNote || '').includes(AGENT_TEMPLATE_RUNTIME_CONTRACT_CLOSEOUT_KEY) &&
      agentTemplateRuntimeContractCloseout?.operatorCloseout === true &&
      (agentTemplateRuntimeContractCloseout.backlogIds || []).includes(AGENT_TEMPLATE_RUNTIME_CONTRACT_CARD_ID) &&
      agentTemplateRuntimeContractStatus.ok === true &&
      proofs.agentTemplateRuntimeContractDogfood.ok === true &&
      proofs.agentTemplateRuntimeContractDogfood.validExamplesPass === true &&
      proofs.agentTemplateRuntimeContractDogfood.missingIdentityRejected === true &&
      proofs.agentTemplateRuntimeContractDogfood.missingPreflightRejected === true &&
      proofs.agentTemplateRuntimeContractDogfood.promptOnlyRejected === true &&
      proofs.agentTemplateRuntimeContractDogfood.runtimeSideEffectAttemptRejected === true &&
      packageScripts['process:agent-template-runtime-contract-check'] === `node --env-file-if-exists=.env ${AGENT_TEMPLATE_RUNTIME_CONTRACT_SCRIPT_PATH}` &&
      await repoFileExists(AGENT_TEMPLATE_RUNTIME_CONTRACT_PLAN_PATH) &&
      await repoFileExists(AGENT_TEMPLATE_RUNTIME_CONTRACT_APPROVAL_PATH) &&
      await repoFileExists(AGENT_TEMPLATE_RUNTIME_CONTRACT_CLOSEOUT_PATH) &&
      sources.foundationRuntimeReliabilityVerifierSource?.includes('buildAgentTemplateRuntimeContractDogfoodProof') &&
      includesAll(foundationVerifySource, AGENT_TEMPLATE_RUNTIME_CONTRACT_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'AGENT-TEMPLATE-RUNTIME-CONTRACT-001 defines reusable agent templates before runtime expansion',
    agentTemplateRuntimeContractCard
      ? `lane=${agentTemplateRuntimeContractCard.lane} status=${agentTemplateRuntimeContractStatus.status} dogfood=${proofs.agentTemplateRuntimeContractDogfood.ok ? 'pass' : 'blocked'}`
      : `missing ${AGENT_TEMPLATE_RUNTIME_CONTRACT_CARD_ID}`,
  )

  const oldSystemAgentOnboardingHarvestCard = findCard(cards, OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_CARD_ID)
  const oldSystemAgentOnboardingHarvestCloseout = findCloseout(closeouts, OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_CLOSEOUT_KEY)
  const oldSystemAgentOnboardingHarvestStatus = evaluateOldSystemAgentOnboardingHarvest(
    input.oldSystemAgentOnboardingHarvest || buildOldSystemAgentOnboardingHarvest(),
  )
  addCheck(
    checks,
    oldSystemAgentOnboardingHarvestCard &&
      ['scoped', 'executing', 'done'].includes(oldSystemAgentOnboardingHarvestCard.lane) &&
      oldSystemAgentOnboardingHarvestCard.lane === 'done' &&
      String(oldSystemAgentOnboardingHarvestCard.statusNote || '').includes(OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_CLOSEOUT_KEY) &&
      oldSystemAgentOnboardingHarvestCloseout?.operatorCloseout === true &&
      (oldSystemAgentOnboardingHarvestCloseout.backlogIds || []).includes(OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_CARD_ID) &&
      oldSystemAgentOnboardingHarvestStatus.ok === true &&
      proofs.oldSystemAgentOnboardingHarvestDogfood.ok === true &&
      proofs.oldSystemAgentOnboardingHarvestDogfood.missingEvidenceRejected === true &&
      proofs.oldSystemAgentOnboardingHarvestDogfood.missingRetireRejected === true &&
      proofs.oldSystemAgentOnboardingHarvestDogfood.rawPrivatePromotionRejected === true &&
      proofs.oldSystemAgentOnboardingHarvestDogfood.runtimeAttemptRejected === true &&
      packageScripts['process:old-system-agent-onboarding-harvest-check'] === `node --env-file-if-exists=.env ${OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_SCRIPT_PATH}` &&
      await repoFileExists(OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_PLAN_PATH) &&
      await repoFileExists(OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_APPROVAL_PATH) &&
      await repoFileExists(OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_CLOSEOUT_PATH) &&
      await repoFileExists(OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_DOC_PATH) &&
      sources.foundationRuntimeReliabilityVerifierSource?.includes('buildOldSystemAgentOnboardingHarvestDogfoodProof') &&
      includesAll(foundationVerifySource, OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'OLD-SYSTEM-AGENT-ONBOARDING-HARVEST-001 promotes old-system onboarding lessons without runtime side effects',
    oldSystemAgentOnboardingHarvestCard
      ? `lane=${oldSystemAgentOnboardingHarvestCard.lane} status=${oldSystemAgentOnboardingHarvestStatus.status} dogfood=${proofs.oldSystemAgentOnboardingHarvestDogfood.ok ? 'pass' : 'blocked'}`
      : `missing ${OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_CARD_ID}`,
  )

  const personalAgentOnboardingCard = findCard(cards, AGENT_010_CARD_ID)
  const personalAgentOnboardingCloseout = findCloseout(closeouts, AGENT_010_CLOSEOUT_KEY)
  const personalAgentOnboardingStatus = evaluatePersonalAgentOnboardingContract(
    input.personalAgentOnboardingContract || buildPersonalAgentOnboardingContract(),
  )
  addCheck(
    checks,
    personalAgentOnboardingCard &&
      ['scoped', 'executing', 'done'].includes(personalAgentOnboardingCard.lane) &&
      personalAgentOnboardingCard.lane === 'done' &&
      String(personalAgentOnboardingCard.statusNote || '').includes(AGENT_010_CLOSEOUT_KEY) &&
      personalAgentOnboardingCloseout?.operatorCloseout === true &&
      (personalAgentOnboardingCloseout.backlogIds || []).includes(AGENT_010_CARD_ID) &&
      personalAgentOnboardingStatus.ok === true &&
      proofs.personalAgentOnboardingContractDogfood.ok === true &&
      proofs.personalAgentOnboardingContractDogfood.missingProfileRejected === true &&
      proofs.personalAgentOnboardingContractDogfood.repoStoredProfileRejected === true &&
      proofs.personalAgentOnboardingContractDogfood.rawPrivateValueRejected === true &&
      proofs.personalAgentOnboardingContractDogfood.runtimeAttemptRejected === true &&
      packageScripts['process:agent-010-check'] === `node --env-file-if-exists=.env ${AGENT_010_SCRIPT_PATH}` &&
      await repoFileExists(AGENT_010_PLAN_PATH) &&
      await repoFileExists(AGENT_010_APPROVAL_PATH) &&
      await repoFileExists(AGENT_010_CLOSEOUT_PATH) &&
      await repoFileExists(AGENT_010_DOC_PATH) &&
      sources.foundationRuntimeReliabilityVerifierSource?.includes('buildPersonalAgentOnboardingContractDogfoodProof') &&
      includesAll(foundationVerifySource, AGENT_010_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'AGENT-010 defines personal-agent onboarding and private profile contract before runtime launch',
    personalAgentOnboardingCard
      ? `lane=${personalAgentOnboardingCard.lane} status=${personalAgentOnboardingStatus.status} dogfood=${proofs.personalAgentOnboardingContractDogfood.ok ? 'pass' : 'blocked'}`
      : `missing ${AGENT_010_CARD_ID}`,
  )

  const roleAssistantContractsCard = findCard(cards, ROLE_ASSISTANT_CONTRACTS_CARD_ID)
  const roleAssistantContractsCloseout = findCloseout(closeouts, ROLE_ASSISTANT_CONTRACTS_CLOSEOUT_KEY)
  const roleAssistantContractsStatus = evaluateRoleAssistantContracts(
    input.roleAssistantContracts || buildRoleAssistantContracts(),
  )
  addCheck(
    checks,
    roleAssistantContractsCard &&
      ['scoped', 'executing', 'done'].includes(roleAssistantContractsCard.lane) &&
      roleAssistantContractsCard.lane === 'done' &&
      String(roleAssistantContractsCard.statusNote || '').includes(ROLE_ASSISTANT_CONTRACTS_CLOSEOUT_KEY) &&
      roleAssistantContractsCloseout?.operatorCloseout === true &&
      (roleAssistantContractsCloseout.backlogIds || []).includes(ROLE_ASSISTANT_CONTRACTS_CARD_ID) &&
      roleAssistantContractsStatus.ok === true &&
      proofs.roleAssistantContractsDogfood.ok === true &&
      proofs.roleAssistantContractsDogfood.missingRoleRejected === true &&
      proofs.roleAssistantContractsDogfood.missingSourcesRejected === true &&
      proofs.roleAssistantContractsDogfood.missingRefsRejected === true &&
      proofs.roleAssistantContractsDogfood.unapprovedWriteRejected === true &&
      proofs.roleAssistantContractsDogfood.hiddenSubagentRejected === true &&
      proofs.roleAssistantContractsDogfood.memoryOnlyTrustRejected === true &&
      proofs.roleAssistantContractsDogfood.rawPrivateValueRejected === true &&
      proofs.roleAssistantContractsDogfood.runtimeAttemptRejected === true &&
      packageScripts['process:role-assistant-contracts-check'] === `node --env-file-if-exists=.env ${ROLE_ASSISTANT_CONTRACTS_SCRIPT_PATH}` &&
      await repoFileExists(ROLE_ASSISTANT_CONTRACTS_PLAN_PATH) &&
      await repoFileExists(ROLE_ASSISTANT_CONTRACTS_APPROVAL_PATH) &&
      await repoFileExists(ROLE_ASSISTANT_CONTRACTS_CLOSEOUT_PATH) &&
      await repoFileExists(ROLE_ASSISTANT_CONTRACTS_DOC_PATH) &&
      sources.foundationRuntimeReliabilityVerifierSource?.includes('buildRoleAssistantContractsDogfoodProof') &&
      includesAll(foundationVerifySource, ROLE_ASSISTANT_CONTRACTS_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'ROLE-ASSISTANT-CONTRACTS-001 defines role-specific assistant contracts before runtime expansion',
    roleAssistantContractsCard
      ? `lane=${roleAssistantContractsCard.lane} status=${roleAssistantContractsStatus.status} dogfood=${proofs.roleAssistantContractsDogfood.ok ? 'pass' : 'blocked'}`
      : `missing ${ROLE_ASSISTANT_CONTRACTS_CARD_ID}`,
  )

  const harlanProjectRegistryCard = findCard(cards, HARLAN_PROJECT_REGISTRY_CARD_ID)
  const harlanProjectRegistrySystemCard = findCard(cards, HARLAN_PROJECT_REGISTRY_SYSTEM_CARD_ID)
  const harlanProjectRegistryCloseout = findCloseout(closeouts, HARLAN_PROJECT_REGISTRY_CLOSEOUT_KEY)
  const harlanProjectRegistryStatus = evaluateHarlanProjectRegistry(
    input.harlanProjectRegistry || buildHarlanProjectRegistry(),
  )
  addCheck(
    checks,
    harlanProjectRegistryCard &&
      harlanProjectRegistryCard.lane === 'done' &&
      String(harlanProjectRegistryCard.statusNote || '').includes(HARLAN_PROJECT_REGISTRY_CLOSEOUT_KEY) &&
      harlanProjectRegistrySystemCard &&
      harlanProjectRegistrySystemCard.lane === 'done' &&
      String(harlanProjectRegistrySystemCard.statusNote || '').includes(HARLAN_PROJECT_REGISTRY_CLOSEOUT_KEY) &&
      harlanProjectRegistryCloseout?.operatorCloseout === true &&
      (harlanProjectRegistryCloseout.backlogIds || []).includes(HARLAN_PROJECT_REGISTRY_CARD_ID) &&
      (harlanProjectRegistryCloseout.backlogIds || []).includes(HARLAN_PROJECT_REGISTRY_SYSTEM_CARD_ID) &&
      harlanProjectRegistryStatus.ok === true &&
      proofs.harlanProjectRegistryDogfood.ok === true &&
      proofs.harlanProjectRegistryDogfood.missingSystemRejected === true &&
      proofs.harlanProjectRegistryDogfood.missingAuthRejected === true &&
      proofs.harlanProjectRegistryDogfood.unapprovedWriteRejected === true &&
      proofs.harlanProjectRegistryDogfood.unknownAllowedRejected === true &&
      proofs.harlanProjectRegistryDogfood.missingEscalationRejected === true &&
      proofs.harlanProjectRegistryDogfood.missingSourceContractsRejected === true &&
      proofs.harlanProjectRegistryDogfood.runtimeAttemptRejected === true &&
      packageScripts['process:harlan-project-registry-check'] === `node --env-file-if-exists=.env ${HARLAN_PROJECT_REGISTRY_SCRIPT_PATH}` &&
      await repoFileExists(HARLAN_PROJECT_REGISTRY_PLAN_PATH) &&
      await repoFileExists(HARLAN_PROJECT_REGISTRY_APPROVAL_PATH) &&
      await repoFileExists(HARLAN_PROJECT_REGISTRY_CLOSEOUT_PATH) &&
      await repoFileExists(HARLAN_PROJECT_REGISTRY_DOC_PATH) &&
      sources.foundationRuntimeReliabilityVerifierSource?.includes('buildHarlanProjectRegistryDogfoodProof') &&
      includesAll(foundationVerifySource, HARLAN_PROJECT_REGISTRY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'HARLAN-PROJECT-REGISTRY-001 defines Harlan project reach before operator-loop runtime work',
    harlanProjectRegistryCard
      ? `lane=${harlanProjectRegistryCard.lane} system=${harlanProjectRegistrySystemCard?.lane || 'missing'} status=${harlanProjectRegistryStatus.status} dogfood=${proofs.harlanProjectRegistryDogfood.ok ? 'pass' : 'blocked'}`
      : `missing ${HARLAN_PROJECT_REGISTRY_CARD_ID}`,
  )

  const harlanOperatorLoopCard = findCard(cards, HARLAN_OPERATOR_LOOP_CARD_ID)
  const harlanOperatorLoopCloseout = findCloseout(closeouts, HARLAN_OPERATOR_LOOP_CLOSEOUT_KEY)
  const harlanOperatorLoopStatus = evaluateHarlanOperatorLoop(
    input.harlanOperatorLoop || buildHarlanOperatorLoop(),
  )
  addCheck(
    checks,
    harlanOperatorLoopCard &&
      harlanOperatorLoopCard.lane === 'done' &&
      String(harlanOperatorLoopCard.statusNote || '').includes(HARLAN_OPERATOR_LOOP_CLOSEOUT_KEY) &&
      harlanOperatorLoopCloseout?.operatorCloseout === true &&
      (harlanOperatorLoopCloseout.backlogIds || []).includes(HARLAN_OPERATOR_LOOP_CARD_ID) &&
      harlanOperatorLoopStatus.ok === true &&
      proofs.harlanOperatorLoopDogfood.ok === true &&
      proofs.harlanOperatorLoopDogfood.missingInputRejected === true &&
      proofs.harlanOperatorLoopDogfood.memoryOnlyRejected === true &&
      proofs.harlanOperatorLoopDogfood.staleInputRejected === true &&
      proofs.harlanOperatorLoopDogfood.missingSectionRefsRejected === true &&
      proofs.harlanOperatorLoopDogfood.unapprovedWriteRejected === true &&
      proofs.harlanOperatorLoopDogfood.runtimeAttemptRejected === true &&
      proofs.harlanOperatorLoopDogfood.missingNextRejected === true &&
      proofs.harlanOperatorLoopDogfood.unavailableCurrentRejected === true &&
      packageScripts['process:harlan-operator-loop-check'] === `node --env-file-if-exists=.env ${HARLAN_OPERATOR_LOOP_SCRIPT_PATH}` &&
      await repoFileExists(HARLAN_OPERATOR_LOOP_PLAN_PATH) &&
      await repoFileExists(HARLAN_OPERATOR_LOOP_APPROVAL_PATH) &&
      await repoFileExists(HARLAN_OPERATOR_LOOP_CLOSEOUT_PATH) &&
      await repoFileExists(HARLAN_OPERATOR_LOOP_DOC_PATH) &&
      sources.foundationRuntimeReliabilityVerifierSource?.includes('buildHarlanOperatorLoopDogfoodProof') &&
      includesAll(foundationVerifySource, HARLAN_OPERATOR_LOOP_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'HARLAN-OPERATOR-LOOP-V1-001 gives Harlan a read-only source-backed operator answer',
    harlanOperatorLoopCard
      ? `lane=${harlanOperatorLoopCard.lane} status=${harlanOperatorLoopStatus.status} dogfood=${proofs.harlanOperatorLoopDogfood.ok ? 'pass' : 'blocked'}`
      : `missing ${HARLAN_OPERATOR_LOOP_CARD_ID}`,
  )

  const harlanAuthEscalationLoopCard = findCard(cards, HARLAN_AUTH_ESCALATION_LOOP_CARD_ID)
  const harlanAuthEscalationLoopCloseout = findCloseout(closeouts, HARLAN_AUTH_ESCALATION_LOOP_CLOSEOUT_KEY)
  const harlanAuthEscalationLoopStatus = evaluateHarlanAuthEscalationLoop(
    input.harlanAuthEscalationLoop || buildHarlanAuthEscalationLoop(),
  )
  addCheck(
    checks,
    harlanAuthEscalationLoopCard &&
      harlanAuthEscalationLoopCard.lane === 'done' &&
      String(harlanAuthEscalationLoopCard.statusNote || '').includes(HARLAN_AUTH_ESCALATION_LOOP_CLOSEOUT_KEY) &&
      harlanAuthEscalationLoopCloseout?.operatorCloseout === true &&
      (harlanAuthEscalationLoopCloseout.backlogIds || []).includes(HARLAN_AUTH_ESCALATION_LOOP_CARD_ID) &&
      harlanAuthEscalationLoopStatus.ok === true &&
      proofs.harlanAuthEscalationLoopDogfood.ok === true &&
      proofs.harlanAuthEscalationLoopDogfood.authNeededBlocked === true &&
      proofs.harlanAuthEscalationLoopDogfood.dedupNoSpam === true &&
      proofs.harlanAuthEscalationLoopDogfood.timeoutFailClosed === true &&
      proofs.harlanAuthEscalationLoopDogfood.doneRetryResume === true &&
      proofs.harlanAuthEscalationLoopDogfood.noCredentialMutation === true &&
      proofs.harlanAuthEscalationLoopDogfood.unsafeExternalSendRejected === true &&
      packageScripts['process:harlan-auth-escalation-loop-check'] === `node --env-file-if-exists=.env ${HARLAN_AUTH_ESCALATION_LOOP_SCRIPT_PATH}` &&
      await repoFileExists(HARLAN_AUTH_ESCALATION_LOOP_PLAN_PATH) &&
      await repoFileExists(HARLAN_AUTH_ESCALATION_LOOP_APPROVAL_PATH) &&
      await repoFileExists(HARLAN_AUTH_ESCALATION_LOOP_CLOSEOUT_PATH) &&
      await repoFileExists(HARLAN_AUTH_ESCALATION_LOOP_DOC_PATH) &&
      sources.foundationRuntimeReliabilityVerifierSource?.includes('buildHarlanAuthEscalationLoopDogfoodProof') &&
      includesAll(foundationVerifySource, HARLAN_AUTH_ESCALATION_LOOP_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'HARLAN-AUTH-ESCALATION-LOOP-001 gives Harlan and extractors a governed auth-needed loop',
    harlanAuthEscalationLoopCard
      ? `lane=${harlanAuthEscalationLoopCard.lane} status=${harlanAuthEscalationLoopStatus.status} dogfood=${proofs.harlanAuthEscalationLoopDogfood.ok ? 'pass' : 'blocked'}`
      : `missing ${HARLAN_AUTH_ESCALATION_LOOP_CARD_ID}`,
  )

  const trustedAssistantLoopCard = findCard(cards, TRUSTED_ASSISTANT_LOOP_CARD_ID)
  const trustedAssistantLoopCloseout = findCloseout(closeouts, TRUSTED_ASSISTANT_LOOP_CLOSEOUT_KEY)
  const trustedAssistantLoopStatus = evaluateTrustedAssistantLoopContract(
    input.trustedAssistantLoop || buildTrustedAssistantLoopContract(),
  )
  addCheck(
    checks,
    trustedAssistantLoopCard &&
      trustedAssistantLoopCard.lane === 'done' &&
      String(trustedAssistantLoopCard.statusNote || '').includes(TRUSTED_ASSISTANT_LOOP_CLOSEOUT_KEY) &&
      trustedAssistantLoopCloseout?.operatorCloseout === true &&
      (trustedAssistantLoopCloseout.backlogIds || []).includes(TRUSTED_ASSISTANT_LOOP_CARD_ID) &&
      trustedAssistantLoopStatus.ok === true &&
      proofs.trustedAssistantLoopDogfood.ok === true &&
      proofs.trustedAssistantLoopDogfood.missingSourceRejected === true &&
      proofs.trustedAssistantLoopDogfood.missingInputRejected === true &&
      proofs.trustedAssistantLoopDogfood.memoryOnlyClaimRejected === true &&
      proofs.trustedAssistantLoopDogfood.repoMemoryLeakRejected === true &&
      proofs.trustedAssistantLoopDogfood.unsafeDefaultWriteRejected === true &&
      proofs.trustedAssistantLoopDogfood.liveRuntimeRejected === true &&
      proofs.trustedAssistantLoopDogfood.broadExtractionRejected === true &&
      proofs.trustedAssistantLoopDogfood.stopsWholeSprintRejected === true &&
      proofs.trustedAssistantLoopDogfood.missingOutputRejected === true &&
      packageScripts['process:slice-001-check'] === `node --env-file-if-exists=.env ${TRUSTED_ASSISTANT_LOOP_SCRIPT_PATH}` &&
      await repoFileExists(TRUSTED_ASSISTANT_LOOP_PLAN_PATH) &&
      await repoFileExists(TRUSTED_ASSISTANT_LOOP_APPROVAL_PATH) &&
      await repoFileExists(TRUSTED_ASSISTANT_LOOP_CLOSEOUT_PATH) &&
      await repoFileExists(TRUSTED_ASSISTANT_LOOP_DOC_PATH) &&
      sources.foundationRuntimeReliabilityVerifierSource?.includes('buildTrustedAssistantLoopDogfoodProof') &&
      includesAll(foundationVerifySource, TRUSTED_ASSISTANT_LOOP_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'SLICE-001 defines and proves the first trusted assistant loop',
    trustedAssistantLoopCard
      ? `lane=${trustedAssistantLoopCard.lane} status=${trustedAssistantLoopStatus.status} dogfood=${proofs.trustedAssistantLoopDogfood.ok ? 'pass' : 'blocked'}`
      : `missing ${TRUSTED_ASSISTANT_LOOP_CARD_ID}`,
  )

  const planCriticArchitecturalRulesCard = findCard(cards, PLAN_CRITIC_ARCHITECTURAL_RULES_CARD_ID)
  const planCriticArchitecturalRulesCloseout = findCloseout(closeouts, PLAN_CRITIC_ARCHITECTURAL_RULES_CLOSEOUT_KEY)
  addCheck(
    checks,
    planCriticArchitecturalRulesCard &&
      ['scoped', 'done'].includes(planCriticArchitecturalRulesCard.lane) &&
      planCriticArchitecturalRulesCloseout?.operatorCloseout === true &&
      (planCriticArchitecturalRulesCloseout.backlogIds || []).includes(PLAN_CRITIC_ARCHITECTURAL_RULES_CARD_ID) &&
      proofs.planCriticArchitecturalRulesProof.ok === true &&
      proofs.planCriticArchitecturalRulesProof.largeFileNoSplit?.status === 'revise' &&
      proofs.planCriticArchitecturalRulesProof.checkWriteNoApply?.status === 'revise' &&
      proofs.planCriticArchitecturalRulesProof.verifierLiveState?.status === 'revise' &&
      proofs.planCriticArchitecturalRulesProof.auditFixNoDogfood?.status === 'revise' &&
      proofs.planCriticArchitecturalRulesProof.noFocusedProof?.status === 'revise' &&
      proofs.planCriticArchitecturalRulesProof.compliant?.status === 'pass' &&
      packageScripts['process:plan-critic-architectural-rules-check'] === `node --env-file-if-exists=.env ${PLAN_CRITIC_ARCHITECTURAL_RULES_SCRIPT_PATH}` &&
      sources.planCriticSource?.includes('architectural_rot_rules') &&
      sources.planCriticSource?.includes('buildSyntheticPlanCriticArchitecturalRulesProof') &&
      foundationVerifySource.includes('buildSyntheticPlanCriticArchitecturalRulesProof') &&
      includesAll(foundationVerifySource, PLAN_CRITIC_ARCHITECTURAL_RULES_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'PLAN-CRITIC-ARCHITECTURAL-RULES-001 rejects architecture rot plans before build',
    planCriticArchitecturalRulesCard
      ? `lane=${planCriticArchitecturalRulesCard.lane} dogfood=${proofs.planCriticArchitecturalRulesProof.ok ? 'pass' : 'blocked'} closeout=${planCriticArchitecturalRulesCloseout?.key || 'missing'}`
      : `missing ${PLAN_CRITIC_ARCHITECTURAL_RULES_CARD_ID}`,
  )

  const fileSizeEngineeringStandardCard = findCard(cards, FILE_SIZE_ENGINEERING_STANDARD_CARD_ID)
  const fileSizeEngineeringStandardCloseout = findCloseout(closeouts, FILE_SIZE_ENGINEERING_STANDARD_CLOSEOUT_KEY)
  addCheck(
    checks,
    fileSizeEngineeringStandardCard &&
      ['scoped', 'done'].includes(fileSizeEngineeringStandardCard.lane) &&
      fileSizeEngineeringStandardCloseout?.operatorCloseout === true &&
      (fileSizeEngineeringStandardCloseout.backlogIds || []).includes(FILE_SIZE_ENGINEERING_STANDARD_CARD_ID) &&
      proofs.fileSizeStandardDogfood.ok === true &&
      proofs.fileSizeStandardDogfood.overBudgetNoSplit?.ok === false &&
      proofs.fileSizeStandardDogfood.reportArtifactNoBudget?.ok === false &&
      proofs.fileSizeStandardDogfood.systemHealthRisk?.status === 'risk' &&
      proofs.fileSizeStandardDogfood.shipGateDanger?.ok === false &&
      packageScripts['process:file-size-engineering-standard-check'] === `node --env-file-if-exists=.env ${FILE_SIZE_ENGINEERING_STANDARD_SCRIPT_PATH}` &&
      await repoFileExists(FILE_SIZE_ENGINEERING_STANDARD_PLAN_PATH) &&
      await repoFileExists(FILE_SIZE_ENGINEERING_STANDARD_APPROVAL_PATH) &&
      sources.planCriticSource?.includes('fileSizeOverBudgetSplitPlan') &&
      sources.foundationShipPreflightSource?.includes('buildFoundationFileSizeShipGateStatus') &&
      sources.foundationSystemHealthSource?.includes('fileSizeStandard') &&
      includesAll(foundationVerifySource, FILE_SIZE_ENGINEERING_STANDARD_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'FILE-SIZE-ENGINEERING-STANDARD-001 gates module budgets through Plan Critic, System Health, and ship preflight',
    fileSizeEngineeringStandardCard
      ? `lane=${fileSizeEngineeringStandardCard.lane} dogfood=${proofs.fileSizeStandardDogfood.ok ? 'pass' : 'blocked'} closeout=${fileSizeEngineeringStandardCloseout?.key || 'missing'}`
      : `missing ${FILE_SIZE_ENGINEERING_STANDARD_CARD_ID}`,
  )

  const foundationPerformanceCard = findCard(cards, FOUNDATION_PERFORMANCE_CARD_ID)
  const foundationPerformanceCloseout = findCloseout(closeouts, FOUNDATION_PERFORMANCE_CLOSEOUT_KEY)
  addCheck(
    checks,
    foundationPerformanceCard &&
      ['scoped', 'done'].includes(foundationPerformanceCard.lane) &&
      foundationPerformanceCloseout?.operatorCloseout === true &&
      (foundationPerformanceCloseout.backlogIds || []).includes(FOUNDATION_PERFORMANCE_CARD_ID) &&
      proofs.foundationPerformanceProof.ok === true &&
      proofs.foundationPerformanceProof.oversized?.ok === false &&
      proofs.foundationPerformanceProof.tooSlow?.ok === false &&
      foundationHubSummary.foundationHubPerformance?.mode === 'summary' &&
      Number(foundationHubSummary.foundationHubPerformance?.budget?.maxDurationMs || 0) === FOUNDATION_HUB_SUMMARY_BUDGET.maxDurationMs &&
      Number(foundationHubSummary.foundationHubPerformance?.payloadBytes || 0) <= FOUNDATION_HUB_SUMMARY_BUDGET.maxPayloadBytes &&
      foundationHubFull.foundationHubPerformance?.mode === 'full' &&
      foundationHubFull.sharedCommunicationSynthesis &&
      foundationHubFull.extractionControl &&
      foundationHubFull.llmRuntime &&
      foundationHubFull.driveCorpusInventory &&
      packageScripts['process:foundation-performance-check'] === `node --env-file-if-exists=.env ${FOUNDATION_PERFORMANCE_SCRIPT_PATH}` &&
      sources.hubReadRoutesSource?.includes('getFoundationCoreSnapshot') &&
      sources.hubReadRoutesSource?.includes("app.get('/api/foundation-hub'") &&
      sources.hubReadRoutesSource?.includes('normalizeFoundationHubMode') &&
      sources.foundationFrontendSource?.includes('fetchFoundationHubFull') &&
      sources.foundationFrontendSource?.includes('/api/foundation-hub?view=full') &&
      sources.foundationDbSource?.includes('getFoundationCoreSnapshot') &&
      sources.foundationHubPerformanceSource?.includes('/api/foundation-hub?view=full') &&
      sources.foundationHubPerformanceSource?.includes('buildSyntheticFoundationHubBudgetProof') &&
      sources.foundationPerformanceScriptSource?.includes('default Foundation Hub route stays under latency and payload budget') &&
      sources.foundationBuildLogRegistrySource?.includes(FOUNDATION_PERFORMANCE_CLOSEOUT_KEY) &&
      includesAll(foundationVerifySource, FOUNDATION_PERFORMANCE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'FOUNDATION-PERFORMANCE-001 makes default Foundation Hub fast while preserving full diagnostics',
    foundationPerformanceCard
      ? `lane=${foundationPerformanceCard.lane} dogfood=${proofs.foundationPerformanceProof.ok ? 'pass' : 'blocked'} summary=${foundationHubSummary.foundationHubPerformance?.payloadBytes || 'missing'}B closeout=${foundationPerformanceCloseout?.key || 'missing'}`
      : `missing ${FOUNDATION_PERFORMANCE_CARD_ID}`,
  )

  const foundationFullDiagnosticsPerfCards = FOUNDATION_FULL_DIAGNOSTICS_PERF_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE.map(id => findCard(cards, id))
  const foundationFullDiagnosticsPerfCloseout = findCloseout(closeouts, FOUNDATION_FULL_DIAGNOSTICS_CLOSEOUT_KEY)
  addCheck(
    checks,
    foundationFullDiagnosticsPerfCards.every(card =>
      card &&
      card.lane === 'done' &&
      String(card.statusNote || '').includes(FOUNDATION_FULL_DIAGNOSTICS_CLOSEOUT_KEY)
    ) &&
      foundationFullDiagnosticsPerfCloseout?.operatorCloseout === true &&
      FOUNDATION_FULL_DIAGNOSTICS_PERF_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE.every(id =>
        (foundationFullDiagnosticsPerfCloseout.backlogIds || []).includes(id)
      ) &&
      proofs.foundationFullDiagnosticsDogfood.ok === true &&
      proofs.foundationFullDiagnosticsDogfood.boundary?.status === 'degraded' &&
      packageScripts['process:foundation-full-diagnostics-perf-check'] === `node --env-file-if-exists=.env ${FOUNDATION_FULL_DIAGNOSTICS_SCRIPT_PATH}` &&
      await repoFileExists('docs/process/foundation-full-diagnostics-perf-001-plan.md') &&
      await repoFileExists('docs/process/foundation-hub-full-route-split-001-plan.md') &&
      await repoFileExists('docs/process/approvals/FOUNDATION-FULL-DIAGNOSTICS-PERF-001.json') &&
      await repoFileExists('docs/process/approvals/FOUNDATION-HUB-FULL-ROUTE-SPLIT-001.json') &&
      await repoFileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-14-foundation-full-diagnostics-perf-closeout.md') &&
      sources.foundationHubFullDiagnosticsSource?.includes('withDiagnosticDeadline') &&
      sources.foundationHubFullDiagnosticsSource?.includes('Promise.race') &&
      sources.foundationHubFullDiagnosticsSource?.includes('runtime_diagnostic_timeout') &&
      sources.foundationHubFullDiagnosticsSource?.includes('external_api_error') &&
      sources.foundationHubFullDiagnosticsSource?.includes('buildSyntheticFoundationFullDiagnosticsDogfoodProof') &&
      (sources.foundationHubFullDiagnosticsScriptSource?.includes('dogfood proof converts slow optional Agent Feedback panels into degraded source health') ||
        sources.foundationHubFullDiagnosticsScriptSource?.includes('dogfood proof converts slow or rate-limited Agent Feedback panels into degraded source health')) &&
      sources.clickupSource?.includes('AbortController') &&
      sources.clickupSource?.includes('CLICKUP_REQUEST_TIMEOUT_MS') &&
      sources.clickupSource?.includes('maxPages') &&
      sources.agentFeedbackAutoSendSource?.includes('mapWithConcurrency') &&
      sources.agentFeedbackAutoSendSource?.includes('getRosterSnapshot = getClickUpListSnapshotSafe') &&
      sources.agentFeedbackReminderSource?.includes('getRosterSnapshot = getClickUpListSnapshotSafe') &&
      sources.serverRouteSource?.includes('buildFoundationHubAgentFeedbackDiagnostics') &&
      sources.serverRouteSource?.includes('foundationHubFullDiagnostics') &&
      foundationHubFull.foundationHubFullDiagnostics?.boundedSourceHealth === true &&
      foundationHubFull.sourceOutageBoundary?.summary?.fullDiagnosticsBounded === true &&
      Number(foundationHubFull.foundationHubPerformance?.durationMs || 0) <= FOUNDATION_FULL_DIAGNOSTICS_BUDGET.maxSeconds * 1000 &&
      Number(foundationHubFull.foundationHubPerformance?.payloadBytes || 0) <= FOUNDATION_FULL_DIAGNOSTICS_BUDGET.maxBytes &&
      sources.foundationBuildCloseoutCleanupRecordsSource?.includes(FOUNDATION_FULL_DIAGNOSTICS_CLOSEOUT_KEY) &&
      includesAll(foundationVerifySource, FOUNDATION_FULL_DIAGNOSTICS_PERF_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'Foundation full diagnostics route bounds slow Agent Feedback panels and keeps the route modular',
    `cards=${foundationFullDiagnosticsPerfCards.filter(card => card?.lane === 'done').length}/${FOUNDATION_FULL_DIAGNOSTICS_PERF_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE.length} route=${foundationHubFull.foundationHubPerformance?.durationMs || 'missing'}ms/${foundationHubFull.foundationHubPerformance?.payloadBytes || 'missing'}B dogfood=${proofs.foundationFullDiagnosticsDogfood.ok ? 'pass' : 'blocked'}`,
  )

  const foundationShipGateSpeedPayloadCards = FOUNDATION_SHIP_GATE_SPEED_PAYLOAD_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE.map(id => findCard(cards, id))
  const foundationShipGateSpeedPayloadCloseout = findCloseout(closeouts, FOUNDATION_SHIP_GATE_SPEED_PAYLOAD_CLOSEOUT_KEY)
  addCheck(
    checks,
    foundationShipGateSpeedPayloadCards.every(card =>
      card &&
      card.lane === 'done' &&
      String(card.statusNote || '').includes(FOUNDATION_SHIP_GATE_SPEED_PAYLOAD_CLOSEOUT_KEY)
    ) &&
      foundationShipGateSpeedPayloadCloseout?.operatorCloseout === true &&
      FOUNDATION_SHIP_GATE_SPEED_PAYLOAD_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE.every(id =>
        (foundationShipGateSpeedPayloadCloseout.backlogIds || []).includes(id)
      ) &&
      proofs.foundationShipPreflightDogfood.ok === true &&
      proofs.foundationShipPreflightDogfood.blockedCases?.length >= 3 &&
      packageScripts['process:foundation-ship-preflight'] === `node --env-file-if-exists=.env ${FOUNDATION_SHIP_PREFLIGHT_SCRIPT_PATH}` &&
      packageScripts['process:foundation-verify-profile-check'] === `node --env-file-if-exists=.env ${FOUNDATION_VERIFY_PROFILE_SCRIPT_PATH}` &&
      packageScripts['process:foundation-verify-llm-auth-audit-check'] === `node --env-file-if-exists=.env ${FOUNDATION_VERIFY_LLM_AUTH_AUDIT_SCRIPT_PATH}` &&
      packageScripts['process:foundation-hub-full-payload-reduce-check'] === `node --env-file-if-exists=.env ${FOUNDATION_HUB_FULL_PAYLOAD_REDUCE_SCRIPT_PATH}` &&
      sources.processFoundationShipSource?.includes('process:foundation-ship-preflight') &&
      sources.processFoundationShipSource?.includes('skipPreflightReason') &&
      sources.foundationShipPreflightSource?.includes('buildFoundationShipPreflightDogfoodProof') &&
      sources.foundationShipPreflightSource?.includes('LLM_AUTH_AUDIT_REPAIR_COMMAND') &&
      sources.foundationShipPreflightScriptSource?.includes('getLlmRuntimeSnapshot') &&
      sources.foundationShipPreflightScriptSource?.includes('getFoundationJobRunSnapshot') &&
      sources.foundationVerifySource?.includes('recordFoundationVerifyTiming') &&
      sources.foundationVerifySource?.includes('FOUNDATION_VERIFY_PROFILE') &&
      sources.foundationVerifyProfileScriptSource?.includes('profile command runs the real verifier and does not skip checks') &&
      sources.llmAuthAuditVerifierModuleSource?.includes('evaluateLlmAuthAuditVerifierCheck') &&
      sources.llmAuthAuditVerifierModuleSource?.includes('buildLlmAuthAuditVerifierDogfoodProof') &&
      sources.llmAuthAuditVerifierCheckSource?.includes('buildLlmAuthAuditVerifierDogfoodProof') &&
      sources.foundationHubFullPayloadReduceScriptSource?.includes('live full payload is materially smaller than measured baseline') &&
      sources.serverRouteSource?.includes('compactSharedCommunicationSynthesis') &&
      sources.serverRouteSource?.includes('compactFoundationSourceLifecycle') &&
      sources.foundationHubFullDiagnosticsSource?.includes('maxBytes: 4200000') &&
      sources.foundationHubPerformanceSource?.includes('maxPayloadBytes: 4500000') &&
      foundationHubFull.sourceLifecycle?.fullPayloadCompacted === true &&
      foundationHubFull.sharedCommunicationSynthesis?.fullPayloadCompacted === true &&
      foundationHubFull.foundationHubPerformance?.budgetStatus === 'healthy' &&
      Number(foundationHubFull.foundationHubPerformance?.payloadBytes || 0) <= FOUNDATION_FULL_DIAGNOSTICS_BUDGET.maxBytes &&
      sources.foundationBuildCloseoutCleanupRecordsSource?.includes(FOUNDATION_SHIP_GATE_SPEED_PAYLOAD_CLOSEOUT_KEY) &&
      await repoFileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-14-foundation-ship-gate-speed-payload-cleanup-closeout.md') &&
      includesAll(foundationVerifySource, FOUNDATION_SHIP_GATE_SPEED_PAYLOAD_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'Foundation ship gate speed sprint adds early freshness preflight, verifier profile, verifier module split, and smaller full payload',
    `cards=${foundationShipGateSpeedPayloadCards.filter(card => card?.lane === 'done').length}/${FOUNDATION_SHIP_GATE_SPEED_PAYLOAD_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE.length} preflight=${proofs.foundationShipPreflightDogfood.ok ? 'pass' : 'blocked'} payload=${foundationHubFull.foundationHubPerformance?.payloadBytes || 'missing'}B`,
  )

  const foundationClickUpVerifyHealthBoundaryCards = FOUNDATION_CLICKUP_VERIFY_HEALTH_BOUNDARY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE.map(id => findCard(cards, id))
  const foundationClickUpVerifyHealthBoundaryCloseout = findCloseout(closeouts, FOUNDATION_CLICKUP_VERIFY_HEALTH_BOUNDARY_CLOSEOUT_KEY)
  addCheck(
    checks,
    foundationClickUpVerifyHealthBoundaryCards.every(card =>
      card &&
      card.lane === 'done' &&
      String(card.statusNote || '').includes(FOUNDATION_CLICKUP_VERIFY_HEALTH_BOUNDARY_CLOSEOUT_KEY)
    ) &&
      foundationClickUpVerifyHealthBoundaryCloseout?.operatorCloseout === true &&
      FOUNDATION_CLICKUP_VERIFY_HEALTH_BOUNDARY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE.every(id =>
        (foundationClickUpVerifyHealthBoundaryCloseout.backlogIds || []).includes(id)
      ) &&
      packageScripts['clickup:verify'] === `node --env-file-if-exists=.env ${CLICKUP_SOURCE_VERIFY_SCRIPT_PATH}` &&
      packageScripts['process:clickup-verify-health-boundary-check'] === `node --env-file-if-exists=.env ${CLICKUP_VERIFY_HEALTH_BOUNDARY_SCRIPT_PATH}` &&
      packageScripts['process:foundation-verify-profile-check'] === `node --env-file-if-exists=.env ${FOUNDATION_VERIFY_PROFILE_SCRIPT_PATH}` &&
      proofs.clickUpSourceVerifierDogfood.ok === true &&
      (proofs.clickUpSourceVerifierDogfood.checks || []).some(check => check.ok && check.check.includes('reuses one cached snapshot')) &&
      (proofs.clickUpSourceVerifierDogfood.checks || []).some(check => check.ok && check.check.includes('report degraded source health')) &&
      (proofs.clickUpSourceVerifierDogfood.checks || []).some(check => check.ok && check.check.includes('redact token-like values')) &&
      (proofs.clickUpSourceVerifierDogfood.checks || []).some(check => check.ok && check.check.includes('bounded timeout')) &&
      proofs.foundationVerifySlowBudgetDogfood.ok === true &&
      includesAll(sources.clickupSourceVerifierSource, [
        'CLICKUP_SOURCE_VERIFY_DEFAULT_TIMEOUT_MS',
        'createClickUpSnapshotCache',
        'Promise.all',
        'CLICKUP_SOURCE_VERIFY_SUMMARY',
        'sourceHealth',
      ]) &&
      includesAll(sources.clickupSourceVerifyScriptSource, [
        '--timeoutMs=',
        '--maxTaskPages=',
        'formatClickUpSourceVerificationReport',
      ]) &&
      includesAll(sources.clickupVerifyHealthBoundaryScriptSource, [
        'bounded live clickup:verify emits structured summary within 30s',
        'dogfood proves bounded ClickUp reads',
        'dogfood proves verifier slow-section budget',
      ]) &&
      includesAll(sources.foundationVerifyProfileBudgetSource, [
        'DEFAULT_FOUNDATION_VERIFY_SLOW_SECTION_BUDGET_MS',
        'resolveFoundationVerifySectionOwner',
        'buildFoundationVerifySlowBudgetDogfoodProof',
      ]) &&
      sources.foundationVerifySource?.includes('overBudgetSections') &&
      (
        sources.foundationVerifySource?.includes('CLICKUP_SOURCE_VERIFY_SUMMARY') ||
        sources.foundationHealthScriptVerifierSource?.includes('CLICKUP_SOURCE_VERIFY_SUMMARY')
      ) &&
      sources.clickupSource?.includes('sanitizeClickUpErrorMessage') &&
      sources.clickupSource?.includes('[redacted]') &&
      sources.foundationBuildCloseoutCleanupRecordsSource?.includes(FOUNDATION_CLICKUP_VERIFY_HEALTH_BOUNDARY_CLOSEOUT_KEY) &&
      await repoFileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-14-foundation-clickup-verify-health-boundary-closeout.md') &&
      includesAll(foundationVerifySource, FOUNDATION_CLICKUP_VERIFY_HEALTH_BOUNDARY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'Foundation ClickUp verifier health boundary keeps ClickUp verification fast, bounded, cached, degraded, and profiled',
    `cards=${foundationClickUpVerifyHealthBoundaryCards.filter(card => card?.lane === 'done').length}/${FOUNDATION_CLICKUP_VERIFY_HEALTH_BOUNDARY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE.length} dogfood=${proofs.clickUpSourceVerifierDogfood.ok ? 'pass' : 'blocked'} slowBudget=${proofs.foundationVerifySlowBudgetDogfood.ok ? 'pass' : 'blocked'}`,
  )

  return {
    ok: checks.every(check => check.ok),
    checks,
    summary: {
      total: checks.length,
      passed: checks.filter(check => check.ok).length,
    },
    artifacts: proofs,
  }
}

function syntheticCards() {
  return RUNTIME_RELIABILITY_VERIFIER_CHECK_DEFINITIONS.map((id, index) => ({
    id,
    lane: 'done',
    priority: index < 5 ? 'P0' : 'P1',
    statusNote: [
      SOURCE_OUTAGE_BOUNDARY_CLOSEOUT_KEY,
      FOUNDATION_OPERATING_RELIABILITY_CLOSEOUT_KEY,
      PLAN_CRITIC_ARCHITECTURAL_RULES_CLOSEOUT_KEY,
      FOUNDATION_PERFORMANCE_CLOSEOUT_KEY,
      FOUNDATION_FULL_DIAGNOSTICS_CLOSEOUT_KEY,
      FOUNDATION_SHIP_GATE_SPEED_PAYLOAD_CLOSEOUT_KEY,
      FOUNDATION_CLICKUP_VERIFY_HEALTH_BOUNDARY_CLOSEOUT_KEY,
      RUNTIME_SUPERVISOR_CLOSEOUT_KEY,
      RUNTIME_WORKER_CLOSEOUT_KEY,
      RUNTIME_FIRST_JOBS_CLOSEOUT_KEY,
      RUNTIME_HEALTH_SIMPLIFY_CLOSEOUT_KEY,
      AIOS_RUNTIME_PORTABILITY_GATE_CLOSEOUT_KEY,
      AGENT_STATUS_FRESHNESS_GATE_CLOSEOUT_KEY,
      FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_CLOSEOUT_KEY,
      AGENT_LIVE_ANSWER_PREFLIGHT_GATE_CLOSEOUT_KEY,
      AGENT_CAPABILITY_REGISTRY_CLOSEOUT_KEY,
      FOUNDATION_UP_CAPABILITY_REGISTRY_CLOSEOUT_KEY,
      AGENT_TEMPLATE_RUNTIME_CONTRACT_CLOSEOUT_KEY,
      OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_CLOSEOUT_KEY,
      AGENT_010_CLOSEOUT_KEY,
      ROLE_ASSISTANT_CONTRACTS_CLOSEOUT_KEY,
      HARLAN_PROJECT_REGISTRY_CLOSEOUT_KEY,
      HARLAN_OPERATOR_LOOP_CLOSEOUT_KEY,
      HARLAN_AUTH_ESCALATION_LOOP_CLOSEOUT_KEY,
      TRUSTED_ASSISTANT_LOOP_CLOSEOUT_KEY,
      FILE_SIZE_ENGINEERING_STANDARD_CLOSEOUT_KEY,
    ].join(' '),
  }))
}

function syntheticCloseouts() {
  return [
    { key: SOURCE_OUTAGE_BOUNDARY_CLOSEOUT_KEY, backlogIds: SOURCE_OUTAGE_BOUNDARY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE },
    { key: FOUNDATION_OPERATING_RELIABILITY_CLOSEOUT_KEY, backlogIds: FOUNDATION_OPERATING_RELIABILITY_CARD_IDS },
    { key: PLAN_CRITIC_ARCHITECTURAL_RULES_CLOSEOUT_KEY, backlogIds: PLAN_CRITIC_ARCHITECTURAL_RULES_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE },
    { key: FOUNDATION_PERFORMANCE_CLOSEOUT_KEY, backlogIds: FOUNDATION_PERFORMANCE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE },
    { key: FOUNDATION_FULL_DIAGNOSTICS_CLOSEOUT_KEY, backlogIds: FOUNDATION_FULL_DIAGNOSTICS_PERF_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE },
    { key: FOUNDATION_SHIP_GATE_SPEED_PAYLOAD_CLOSEOUT_KEY, backlogIds: FOUNDATION_SHIP_GATE_SPEED_PAYLOAD_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE },
    { key: FOUNDATION_CLICKUP_VERIFY_HEALTH_BOUNDARY_CLOSEOUT_KEY, backlogIds: FOUNDATION_CLICKUP_VERIFY_HEALTH_BOUNDARY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE },
    { key: RUNTIME_SUPERVISOR_CLOSEOUT_KEY, backlogIds: RUNTIME_SUPERVISOR_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE },
    { key: RUNTIME_WORKER_CLOSEOUT_KEY, backlogIds: RUNTIME_WORKER_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE },
    { key: RUNTIME_FIRST_JOBS_CLOSEOUT_KEY, backlogIds: RUNTIME_FIRST_JOBS_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE },
    { key: RUNTIME_HEALTH_SIMPLIFY_CLOSEOUT_KEY, backlogIds: RUNTIME_HEALTH_SIMPLIFY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE },
    { key: AIOS_RUNTIME_PORTABILITY_GATE_CLOSEOUT_KEY, backlogIds: AIOS_RUNTIME_PORTABILITY_GATE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE },
    { key: AGENT_STATUS_FRESHNESS_GATE_CLOSEOUT_KEY, backlogIds: AGENT_STATUS_FRESHNESS_GATE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE },
    { key: FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_CLOSEOUT_KEY, backlogIds: FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE },
    { key: AGENT_LIVE_ANSWER_PREFLIGHT_GATE_CLOSEOUT_KEY, backlogIds: AGENT_LIVE_ANSWER_PREFLIGHT_GATE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE },
    { key: AGENT_CAPABILITY_REGISTRY_CLOSEOUT_KEY, backlogIds: AGENT_CAPABILITY_REGISTRY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE },
    { key: FOUNDATION_UP_CAPABILITY_REGISTRY_CLOSEOUT_KEY, backlogIds: FOUNDATION_UP_CAPABILITY_REGISTRY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE },
    { key: AGENT_TEMPLATE_RUNTIME_CONTRACT_CLOSEOUT_KEY, backlogIds: AGENT_TEMPLATE_RUNTIME_CONTRACT_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE },
    { key: OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_CLOSEOUT_KEY, backlogIds: OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE },
    { key: AGENT_010_CLOSEOUT_KEY, backlogIds: AGENT_010_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE },
    { key: ROLE_ASSISTANT_CONTRACTS_CLOSEOUT_KEY, backlogIds: ROLE_ASSISTANT_CONTRACTS_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE },
    { key: HARLAN_PROJECT_REGISTRY_CLOSEOUT_KEY, backlogIds: HARLAN_PROJECT_REGISTRY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE },
    { key: HARLAN_OPERATOR_LOOP_CLOSEOUT_KEY, backlogIds: HARLAN_OPERATOR_LOOP_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE },
    { key: HARLAN_AUTH_ESCALATION_LOOP_CLOSEOUT_KEY, backlogIds: HARLAN_AUTH_ESCALATION_LOOP_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE },
    { key: TRUSTED_ASSISTANT_LOOP_CLOSEOUT_KEY, backlogIds: TRUSTED_ASSISTANT_LOOP_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE },
    { key: FILE_SIZE_ENGINEERING_STANDARD_CLOSEOUT_KEY, backlogIds: FILE_SIZE_ENGINEERING_STANDARD_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE },
  ].map(closeout => ({ ...closeout, operatorCloseout: true }))
}

function syntheticProofs() {
  return {
    sourceOutageBoundaryDogfood: { ok: true, checks: Array.from({ length: 5 }, (_, index) => ({ ok: true, check: `source outage ${index}` })) },
    foundationOperatingReliabilityDogfood: { ok: true, checks: Array.from({ length: 8 }, (_, index) => ({ ok: true, check: `operating reliability ${index}` })) },
    planCriticArchitecturalRulesProof: {
      ok: true,
      largeFileNoSplit: { status: 'revise' },
      checkWriteNoApply: { status: 'revise' },
      verifierLiveState: { status: 'revise' },
      auditFixNoDogfood: { status: 'revise' },
      noFocusedProof: { status: 'revise' },
      hotRouteNoBudget: { status: 'revise', findings: [{ key: 'architecture_hot_route_performance_budget' }] },
      compliant: { status: 'pass' },
    },
    foundationPerformanceProof: { ok: true, oversized: { ok: false }, tooSlow: { ok: false } },
    foundationFullDiagnosticsDogfood: { ok: true, boundary: { status: 'degraded' } },
    foundationShipPreflightDogfood: { ok: true, blockedCases: [{}, {}, {}] },
    clickUpSourceVerifierDogfood: {
      ok: true,
      checks: [
        { ok: true, check: 'reuses one cached snapshot' },
        { ok: true, check: 'report degraded source health' },
        { ok: true, check: 'redact token-like values' },
        { ok: true, check: 'bounded timeout' },
      ],
    },
    foundationVerifySlowBudgetDogfood: { ok: true },
    runtimeSupervisorDogfood: {
      ok: true,
      missingLaunchAgentRejected: true,
      pidMismatchRejected: true,
      staleCommitRejected: true,
      staleHeartbeatRejected: true,
    },
    runtimeWorkerDogfood: {
      ok: true,
      dryRunAliasAccepted: true,
      retryCandidateSurfaced: true,
      blockedScheduledSurfaced: true,
      staleActiveSurfaced: true,
    },
    runtimeFirstJobsDogfood: {
      ok: true,
      oldMissingDbExportRejected: true,
      oldDryRunParserRejected: true,
    },
    runtimeHealthSimplifyDogfood: {
      ok: true,
      oldNoCommandPanelRejected: true,
      oldDirectAppendDiagnosticsRejected: true,
      oldNoJumpActionsRejected: true,
      missingCollapsedDetailsRejected: true,
    },
    aiosRuntimePortabilityDogfood: {
      ok: true,
      runtimeOwnedTruthRejected: true,
      directProviderRouteRejected: true,
      livePaidAuthRunRejected: true,
    },
    agentStatusFreshnessDogfood: {
      ok: true,
      memoryOnlyCurrentRejected: true,
      staleLiveReadRejected: true,
      staleHarlanClaimRejected: true,
    },
    agentUsefulnessRuntimeGatesDogfood: {
      ok: true,
      promptOnlyBundleRejected: true,
      staleMemoryAnswerRejected: true,
      undeclaredCapabilityRejected: true,
      unapprovedWriteRejected: true,
      hiddenWorkerRejected: true,
      hiddenFailureRejected: true,
    },
    agentLiveAnswerPreflightDogfood: {
      ok: true,
      memoryCurrentRejected: true,
      missingPreflightRejected: true,
      staleCurrentRejected: true,
      missingToolCurrentRejected: true,
      unavailableNoWordingRejected: true,
      missingEvidenceStampRejected: true,
    },
    agentCapabilityRegistryDogfood: {
      ok: true,
      missingToolsRejected: true,
      missingSourceRefsRejected: true,
      missingModelRouteRejected: true,
      missingLoggingRejected: true,
      claimOnlyCapabilityRejected: true,
      undeclaredCapabilityClaimRejected: true,
      unapprovedWriteClaimRejected: true,
      liveSideEffectAttemptRejected: true,
    },
    foundationUpCapabilityRegistryDogfood: buildFoundationUpCapabilityRegistryDogfoodProof(),
    agentTemplateRuntimeContractDogfood: {
      ok: true,
      validExamplesPass: true,
      missingIdentityRejected: true,
      missingSourceAccessRejected: true,
      missingMemoryScopeRejected: true,
      missingToolsRejected: true,
      missingApprovalRejected: true,
      missingPreflightRejected: true,
      missingCapabilityRejected: true,
      missingFailureVisibilityRejected: true,
      missingDecommissionRejected: true,
      promptOnlyRejected: true,
      runtimeSideEffectAttemptRejected: true,
    },
    oldSystemAgentOnboardingHarvestDogfood: {
      ok: true,
      missingEvidenceRejected: true,
      missingRetireRejected: true,
      thinProfileRejected: true,
      thinQuestionsRejected: true,
      rawPrivatePromotionRejected: true,
      runtimeAttemptRejected: true,
    },
    personalAgentOnboardingContractDogfood: {
      ok: true,
      missingProfileRejected: true,
      repoStoredProfileRejected: true,
      rawPrivateValueRejected: true,
      thinCalibrationRejected: true,
      spammyNuggetRejected: true,
      noisyFeedbackRejected: true,
      unsafeLookupRejected: true,
      runtimeAttemptRejected: true,
    },
    roleAssistantContractsDogfood: {
      ok: true,
      missingRoleRejected: true,
      missingSourcesRejected: true,
      unapprovedWriteRejected: true,
      hiddenSubagentRejected: true,
      memoryOnlyTrustRejected: true,
      missingEscalationRejected: true,
      missingRefsRejected: true,
      rawPrivateValueRejected: true,
      runtimeAttemptRejected: true,
    },
    harlanProjectRegistryDogfood: {
      ok: true,
      missingSystemRejected: true,
      missingAuthRejected: true,
      unapprovedWriteRejected: true,
      unknownAllowedRejected: true,
      missingEscalationRejected: true,
      missingSourceContractsRejected: true,
      runtimeAttemptRejected: true,
    },
    harlanOperatorLoopDogfood: {
      ok: true,
      missingInputRejected: true,
      memoryOnlyRejected: true,
      staleInputRejected: true,
      missingSectionRefsRejected: true,
      unapprovedWriteRejected: true,
      runtimeAttemptRejected: true,
      missingNextRejected: true,
      unavailableCurrentRejected: true,
    },
    harlanAuthEscalationLoopDogfood: {
      ok: true,
      authNeededBlocked: true,
      dedupNoSpam: true,
      timeoutFailClosed: true,
      doneRetryResume: true,
      noCredentialMutation: true,
      unsafeExternalSendRejected: true,
      missingOldSourceRejected: true,
      missingDoneTokenRejected: true,
      noReverifyRejected: true,
    },
    trustedAssistantLoopDogfood: {
      ok: true,
      missingSourceRejected: true,
      missingInputRejected: true,
      memoryOnlyClaimRejected: true,
      repoMemoryLeakRejected: true,
      unsafeDefaultWriteRejected: true,
      liveRuntimeRejected: true,
      broadExtractionRejected: true,
      stopsWholeSprintRejected: true,
      missingOutputRejected: true,
    },
    fileSizeStandardDogfood: {
      ok: true,
      overBudgetNoSplit: { ok: false },
      reportArtifactNoBudget: { ok: false },
      systemHealthRisk: { status: 'risk' },
      shipGateDanger: { ok: false },
    },
  }
}

function syntheticPackageScripts() {
  return {
    'process:source-outage-boundary-check': `node --env-file-if-exists=.env ${SOURCE_OUTAGE_BOUNDARY_SCRIPT_PATH}`,
    'process:foundation-operating-reliability-check': `node --env-file-if-exists=.env ${FOUNDATION_OPERATING_RELIABILITY_SCRIPT_PATH}`,
    'process:plan-critic-architectural-rules-check': `node --env-file-if-exists=.env ${PLAN_CRITIC_ARCHITECTURAL_RULES_SCRIPT_PATH}`,
    'process:foundation-performance-check': `node --env-file-if-exists=.env ${FOUNDATION_PERFORMANCE_SCRIPT_PATH}`,
    'process:foundation-full-diagnostics-perf-check': `node --env-file-if-exists=.env ${FOUNDATION_FULL_DIAGNOSTICS_SCRIPT_PATH}`,
    'process:foundation-ship-preflight': `node --env-file-if-exists=.env ${FOUNDATION_SHIP_PREFLIGHT_SCRIPT_PATH}`,
    'process:foundation-verify-profile-check': `node --env-file-if-exists=.env ${FOUNDATION_VERIFY_PROFILE_SCRIPT_PATH}`,
    'process:foundation-verify-llm-auth-audit-check': `node --env-file-if-exists=.env ${FOUNDATION_VERIFY_LLM_AUTH_AUDIT_SCRIPT_PATH}`,
    'process:foundation-hub-full-payload-reduce-check': `node --env-file-if-exists=.env ${FOUNDATION_HUB_FULL_PAYLOAD_REDUCE_SCRIPT_PATH}`,
    'clickup:verify': `node --env-file-if-exists=.env ${CLICKUP_SOURCE_VERIFY_SCRIPT_PATH}`,
    'process:clickup-verify-health-boundary-check': `node --env-file-if-exists=.env ${CLICKUP_VERIFY_HEALTH_BOUNDARY_SCRIPT_PATH}`,
    'process:runtime-supervisor-check': `node --env-file-if-exists=.env ${RUNTIME_SUPERVISOR_SCRIPT_PATH}`,
    'process:runtime-worker-check': `node --env-file-if-exists=.env ${RUNTIME_WORKER_SCRIPT_PATH}`,
    'process:runtime-first-jobs-check': `node --env-file-if-exists=.env ${RUNTIME_FIRST_JOBS_SCRIPT_PATH}`,
    'process:runtime-health-simplify-check': `node --env-file-if-exists=.env ${RUNTIME_HEALTH_SIMPLIFY_SCRIPT_PATH}`,
    'process:aios-runtime-portability-gate-check': `node --env-file-if-exists=.env ${AIOS_RUNTIME_PORTABILITY_GATE_SCRIPT_PATH}`,
    'process:agent-status-freshness-gate-check': `node --env-file-if-exists=.env ${AGENT_STATUS_FRESHNESS_GATE_SCRIPT_PATH}`,
    'process:foundation-agent-usefulness-runtime-gates-check': `node --env-file-if-exists=.env ${FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_SCRIPT_PATH}`,
    'process:agent-live-answer-preflight-gate-check': `node --env-file-if-exists=.env ${AGENT_LIVE_ANSWER_PREFLIGHT_GATE_SCRIPT_PATH}`,
    'process:agent-capability-registry-check': `node --env-file-if-exists=.env ${AGENT_CAPABILITY_REGISTRY_SCRIPT_PATH}`,
    'process:foundation-up-capability-registry-check': `node --env-file-if-exists=.env ${FOUNDATION_UP_CAPABILITY_REGISTRY_SCRIPT_PATH}`,
    'process:agent-template-runtime-contract-check': `node --env-file-if-exists=.env ${AGENT_TEMPLATE_RUNTIME_CONTRACT_SCRIPT_PATH}`,
    'process:old-system-agent-onboarding-harvest-check': `node --env-file-if-exists=.env ${OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_SCRIPT_PATH}`,
    'process:agent-010-check': `node --env-file-if-exists=.env ${AGENT_010_SCRIPT_PATH}`,
    'process:role-assistant-contracts-check': `node --env-file-if-exists=.env ${ROLE_ASSISTANT_CONTRACTS_SCRIPT_PATH}`,
    'process:harlan-project-registry-check': `node --env-file-if-exists=.env ${HARLAN_PROJECT_REGISTRY_SCRIPT_PATH}`,
    'process:harlan-operator-loop-check': `node --env-file-if-exists=.env ${HARLAN_OPERATOR_LOOP_SCRIPT_PATH}`,
    'process:harlan-auth-escalation-loop-check': `node --env-file-if-exists=.env ${HARLAN_AUTH_ESCALATION_LOOP_SCRIPT_PATH}`,
    'process:slice-001-check': `node --env-file-if-exists=.env ${TRUSTED_ASSISTANT_LOOP_SCRIPT_PATH}`,
    'process:file-size-engineering-standard-check': `node --env-file-if-exists=.env ${FILE_SIZE_ENGINEERING_STANDARD_SCRIPT_PATH}`,
  }
}

function syntheticSources(overrides = {}) {
  const foundationVerifySource = [
    ...RUNTIME_RELIABILITY_VERIFIER_CHECK_DEFINITIONS,
    ...FILE_SIZE_ENGINEERING_STANDARD_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE,
    'buildSyntheticPlanCriticArchitecturalRulesProof',
    'recordFoundationVerifyTiming',
    'FOUNDATION_VERIFY_PROFILE',
    'overBudgetSections',
    'CLICKUP_SOURCE_VERIFY_SUMMARY',
    RUNTIME_SUPERVISOR_CARD_ID,
    RUNTIME_WORKER_CARD_ID,
    RUNTIME_FIRST_JOBS_CARD_ID,
    RUNTIME_HEALTH_SIMPLIFY_CARD_ID,
    AIOS_RUNTIME_PORTABILITY_GATE_CARD_ID,
    AGENT_STATUS_FRESHNESS_GATE_CARD_ID,
    FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_CARD_ID,
    AGENT_LIVE_ANSWER_PREFLIGHT_GATE_CARD_ID,
    AGENT_CAPABILITY_REGISTRY_CARD_ID,
    FOUNDATION_UP_CAPABILITY_REGISTRY_CARD_ID,
    AGENT_TEMPLATE_RUNTIME_CONTRACT_CARD_ID,
    OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_CARD_ID,
    AGENT_010_CARD_ID,
    ROLE_ASSISTANT_CONTRACTS_CARD_ID,
    HARLAN_PROJECT_REGISTRY_CARD_ID,
    HARLAN_PROJECT_REGISTRY_SYSTEM_CARD_ID,
    HARLAN_OPERATOR_LOOP_CARD_ID,
    HARLAN_AUTH_ESCALATION_LOOP_CARD_ID,
    TRUSTED_ASSISTANT_LOOP_CARD_ID,
    'AIOS_RUNTIME_PORTABILITY_GATE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE',
    'AGENT_STATUS_FRESHNESS_GATE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE',
    'FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE',
    'AGENT_LIVE_ANSWER_PREFLIGHT_GATE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE',
    'AGENT_CAPABILITY_REGISTRY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE',
    'FOUNDATION_UP_CAPABILITY_REGISTRY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE',
    'AGENT_TEMPLATE_RUNTIME_CONTRACT_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE',
    'OLD_SYSTEM_AGENT_ONBOARDING_HARVEST_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE',
    'AGENT_010_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE',
    'ROLE_ASSISTANT_CONTRACTS_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE',
    'HARLAN_PROJECT_REGISTRY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE',
    'HARLAN_OPERATOR_LOOP_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE',
    'HARLAN_AUTH_ESCALATION_LOOP_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE',
    'TRUSTED_ASSISTANT_LOOP_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE',
    'runtimeHealthSimplifySource',
    'aiosRuntimePortabilityGateSource',
    'agentStatusFreshnessGateSource',
    'buildFoundationAgentUsefulnessRuntimeGateDogfoodProof',
    'buildAgentLiveAnswerPreflightGateDogfoodProof',
    'buildAgentCapabilityRegistryDogfoodProof',
    'buildFoundationUpCapabilityRegistryDogfoodProof',
    'buildAgentTemplateRuntimeContractDogfoodProof',
    'buildOldSystemAgentOnboardingHarvestDogfoodProof',
    'buildPersonalAgentOnboardingContractDogfoodProof',
    'buildRoleAssistantContractsDogfoodProof',
    'buildHarlanProjectRegistryDogfoodProof',
    'buildHarlanOperatorLoopDogfoodProof',
    'buildHarlanAuthEscalationLoopDogfoodProof',
    'buildTrustedAssistantLoopDogfoodProof',
    'foundationOperationsRendererSource',
    'foundationWorkflowStylesSource',
    'evaluateFoundationRuntimeReliabilityVerifier({',
  ].join('\n')
  return {
    sourceOutageBoundarySource: 'buildSourceOutageBoundaryDogfoodProof',
    sourceOutageBoundaryScriptSource: 'dogfood proof recreates ClickUp 500 and proves fail-soft behavior',
    sourceOutageBoundaryPlanSource: 'ClickUp `500 DB_003`',
    clickupSource: 'getClickUpListSnapshotSafe buildUnavailableClickUpListSnapshot AbortController CLICKUP_REQUEST_TIMEOUT_MS maxPages sanitizeClickUpErrorMessage [redacted]',
    agentRosterReviewSource: 'agent-roster-source-degraded',
    agentFeedbackAutoSendSource: 'sourceUnavailable mapWithConcurrency getRosterSnapshot = getClickUpListSnapshotSafe',
    agentFeedbackProductionAutoSendDryRunSource: 'sourceUnavailable',
    agentFeedbackReminderSource: 'sourceUnavailable getRosterSnapshot = getClickUpListSnapshotSafe',
    serverRouteSource: 'sourceOutageBoundary foundationOperatingReliability buildFoundationHubAgentFeedbackDiagnostics foundationHubFullDiagnostics compactSharedCommunicationSynthesis compactFoundationSourceLifecycle getLaunchAgentStatus launchAgents:',
    foundationJobsSource: `${CONNECTOR_UPTIME_MONITOR_JOB_KEY} mutationPosture: 'read_only' key: 'gmail-sync-current' --target=gmail-current-day key: 'missive-sync-current' --target=missive-current-day`,
    connectorUptimeMonitorSource: 'buildConnectorUptimeSnapshot buildRuntimeActivationSnapshot buildMorningHealthSnapshot assertNoConnectorUptimeSecretLeak',
    foundationOperatingReliabilityScriptSource: 'dogfood recreates connector failures, runtime states, and audit confusion',
    planCriticSource: 'architectural_rot_rules buildSyntheticPlanCriticArchitecturalRulesProof fileSizeOverBudgetSplitPlan',
    hubReadRoutesSource: "getFoundationCoreSnapshot app.get('/api/foundation-hub' normalizeFoundationHubMode",
    foundationFrontendSource: 'fetchFoundationHubFull /api/foundation-hub?view=full',
    foundationDbSource: 'getFoundationCoreSnapshot export const leaseSourceCrawlTarget = foundationSourceCrawlStore.leaseSourceCrawlTarget export const finishSourceCrawlTargetRun = foundationSourceCrawlStore.finishSourceCrawlTargetRun',
    foundationHubPerformanceSource: '/api/foundation-hub?view=full buildSyntheticFoundationHubBudgetProof maxPayloadBytes: 4500000',
    foundationPerformanceScriptSource: 'default Foundation Hub route stays under latency and payload budget',
    foundationBuildLogRegistrySource: FOUNDATION_PERFORMANCE_CLOSEOUT_KEY,
    foundationHubFullDiagnosticsSource: 'withDiagnosticDeadline Promise.race runtime_diagnostic_timeout external_api_error buildSyntheticFoundationFullDiagnosticsDogfoodProof maxBytes: 4200000',
    foundationHubFullDiagnosticsScriptSource: 'dogfood proof converts slow or rate-limited Agent Feedback panels into degraded source health',
    foundationBuildCloseoutCleanupRecordsSource: [
      FOUNDATION_FULL_DIAGNOSTICS_CLOSEOUT_KEY,
      FOUNDATION_SHIP_GATE_SPEED_PAYLOAD_CLOSEOUT_KEY,
      FOUNDATION_CLICKUP_VERIFY_HEALTH_BOUNDARY_CLOSEOUT_KEY,
      FOUNDATION_OPERATING_RELIABILITY_CLOSEOUT_KEY,
    ].join(' '),
    processFoundationShipSource: 'process:foundation-ship-preflight skipPreflightReason',
    foundationShipPreflightSource: 'buildFoundationShipPreflightDogfoodProof LLM_AUTH_AUDIT_REPAIR_COMMAND buildFoundationFileSizeShipGateStatus',
    foundationShipPreflightScriptSource: 'getLlmRuntimeSnapshot getFoundationJobRunSnapshot',
    foundationSystemHealthSource: 'fileSizeStandard buildFoundationSystemHealthSnapshot',
    foundationVerifyProfileScriptSource: 'profile command runs the real verifier and does not skip checks',
    llmAuthAuditVerifierModuleSource: 'evaluateLlmAuthAuditVerifierCheck buildLlmAuthAuditVerifierDogfoodProof',
    llmAuthAuditVerifierCheckSource: 'buildLlmAuthAuditVerifierDogfoodProof',
    foundationHubFullPayloadReduceScriptSource: 'live full payload is materially smaller than measured baseline',
    clickupSourceVerifierSource: 'CLICKUP_SOURCE_VERIFY_DEFAULT_TIMEOUT_MS createClickUpSnapshotCache Promise.all CLICKUP_SOURCE_VERIFY_SUMMARY sourceHealth',
    clickupSourceVerifyScriptSource: '--timeoutMs= --maxTaskPages= formatClickUpSourceVerificationReport',
    clickupVerifyHealthBoundaryScriptSource: 'bounded live clickup:verify emits structured summary within 30s dogfood proves bounded ClickUp reads dogfood proves verifier slow-section budget',
    foundationVerifyProfileBudgetSource: 'DEFAULT_FOUNDATION_VERIFY_SLOW_SECTION_BUDGET_MS resolveFoundationVerifySectionOwner buildFoundationVerifySlowBudgetDogfoodProof',
    foundationHealthScriptVerifierSource: 'CLICKUP_SOURCE_VERIFY_SUMMARY',
    runtimeProcessControlSource: 'buildRuntimeServiceSupervisorSnapshot buildRuntimeSupervisorDogfoodProof',
    foundationWorkerReliabilitySource: 'parseFoundationWorkerArgs buildFoundationWorkerReliabilitySnapshot buildFoundationWorkerReliabilityDogfoodProof',
    foundationWorkerSource: 'parseFoundationWorkerArgs',
    foundationRuntimeJobStoreSource: 'workerReliability: buildFoundationWorkerReliabilitySnapshot',
    foundationHubSummaryPayloadSource: 'workerReliability',
    foundationRuntimeRendererSource: [
      'Supervised services',
      'Worker reliability',
      'function renderRuntimeHealthCommandPanel Runtime Command What Needs Attention Now runtime-health-command-panel',
      'function buildRuntimeHealthAttentionItems runtime-health-attention Attention-only summary No immediate runtime attention',
      'function buildRuntimeHealthJumpAction function scrollToRuntimeDiagnosticSection scrollIntoView',
      "function appendRuntimeDiagnosticPanel document.createElement('details') document.createElement('summary') runtime-health-diagnostic-section runtime-health-diagnostic-summary",
    ].join(' '),
    foundationOperationsRendererSource: [
      'renderRuntimeHealthCommandPanel(hub)',
      'appendRuntimeDiagnosticPanel(container, jobsPanel, { id: \'runtime-diagnostic-foundation-jobs\' })',
      'appendRuntimeDiagnosticPanel(container, runtimeProcessControlPanel, { id: \'runtime-diagnostic-process-control\' })',
      'runtime-diagnostic-post-ship-fanout',
      'runtime-diagnostic-source-reference-trust',
    ].join(' '),
    foundationWorkflowStylesSource: '.runtime-health-command-panel .runtime-health-attention-grid .runtime-health-diagnostic-section .runtime-health-diagnostic-summary',
    runtimeFirstJobsSource: 'buildRuntimeFirstJobsDogfoodProof oldMissingDbExportRejected oldDryRunParserRejected',
    runtimeHealthSimplifySource: 'buildRuntimeHealthSimplifyDogfoodProof oldDirectAppendDiagnosticsRejected',
    aiosRuntimePortabilityGateSource: 'buildAiosRuntimePortabilityGateDogfoodProof directProviderRouteRejected runtimeOwnedTruthRejected livePaidAuthRunRejected',
    agentStatusFreshnessGateSource: 'buildAgentStatusFreshnessGateDogfoodProof memoryOnlyCurrentRejected staleLiveReadRejected staleHarlanClaimRejected',
    foundationSourceCrawlStoreSource: 'leaseSourceCrawlTarget, finishSourceCrawlTargetRun,',
    runExtractionTargetSource: 'const normalizedKey replace(/-([a-z0-9])/g if (dryRun) leaseSourceCrawlTarget',
    foundationRuntimeReliabilityVerifierSource: `${RUNTIME_HEALTH_SIMPLIFY_CARD_ID} buildRuntimeHealthSimplifyDogfoodProof evaluateRuntimeHealthSimplifySource buildFoundationAgentUsefulnessRuntimeGateDogfoodProof buildAgentLiveAnswerPreflightGateDogfoodProof buildAgentCapabilityRegistryDogfoodProof buildFoundationUpCapabilityRegistryDogfoodProof buildAgentTemplateRuntimeContractDogfoodProof buildOldSystemAgentOnboardingHarvestDogfoodProof buildPersonalAgentOnboardingContractDogfoodProof buildRoleAssistantContractsDogfoodProof buildHarlanProjectRegistryDogfoodProof buildHarlanOperatorLoopDogfoodProof buildHarlanAuthEscalationLoopDogfoodProof buildTrustedAssistantLoopDogfoodProof`,
    foundationVerifySource,
    ...overrides,
  }
}

function syntheticApis() {
  return {
    foundationHub: {
      backlogItems: syntheticCards(),
      sourceOutageBoundary: { status: 'healthy' },
      runtimeProcessControl: {
        serviceSupervisor: {
          status: 'healthy',
          summary: { serviceCount: 2 },
        },
      },
    },
    foundationHubSummary: {
      foundationHubPerformance: {
        mode: 'summary',
        budget: { maxDurationMs: FOUNDATION_HUB_SUMMARY_BUDGET.maxDurationMs },
        payloadBytes: 501082,
      },
    },
    foundationHubFull: {
      foundationOperatingReliability: {
        connectorUptime: { rows: Array.from({ length: 6 }, () => ({})) },
        runtimeActivation: { jobs: [{}] },
        morningHealth: { reportOnly: true },
      },
      foundationHubPerformance: {
        mode: 'full',
        durationMs: 5077,
        payloadBytes: 3718719,
        budgetStatus: 'healthy',
      },
      sharedCommunicationSynthesis: { fullPayloadCompacted: true },
      extractionControl: {},
      llmRuntime: {},
      driveCorpusInventory: {},
      sourceLifecycle: { fullPayloadCompacted: true },
      foundationHubFullDiagnostics: { boundedSourceHealth: true },
      sourceOutageBoundary: { summary: { fullDiagnosticsBounded: true } },
      foundationJobs: {
        workerReliability: {
          cardId: RUNTIME_WORKER_CARD_ID,
          status: 'healthy',
        },
      },
    },
    opsHub: {
      sourceOutageBoundary: { status: 'healthy' },
    },
  }
}

async function evaluateSynthetic(overrides = {}) {
  return evaluateFoundationRuntimeReliabilityVerifier({
    cards: overrides.cards || syntheticCards(),
    closeouts: overrides.closeouts || syntheticCloseouts(),
    packageScripts: overrides.packageScripts || syntheticPackageScripts(),
    repoFileExists: overrides.repoFileExists || (async () => true),
    sources: syntheticSources(overrides.sources),
    apis: { ...syntheticApis(), ...(overrides.apis || {}) },
    proofs: { ...syntheticProofs(), ...(overrides.proofs || {}) },
  })
}

export async function buildFoundationRuntimeReliabilityVerifierDogfoodProof() {
  const healthy = await evaluateSynthetic()
  const missingSourceOutage = await evaluateSynthetic({
    sources: { clickupSource: 'sanitizeClickUpErrorMessage [redacted]' },
  })
  const missingOperatingReliability = await evaluateSynthetic({
    apis: {
      foundationHubFull: {
        ...syntheticApis().foundationHubFull,
        foundationOperatingReliability: { connectorUptime: { rows: [] }, runtimeActivation: { jobs: [] }, morningHealth: { reportOnly: false } },
      },
    },
  })
  const missingPlanCriticDogfood = await evaluateSynthetic({
    proofs: { planCriticArchitecturalRulesProof: { ok: false } },
  })
  const oversizedHubPayload = await evaluateSynthetic({
    apis: {
      foundationHubSummary: {
        foundationHubPerformance: {
          mode: 'summary',
          budget: { maxDurationMs: FOUNDATION_HUB_SUMMARY_BUDGET.maxDurationMs },
          payloadBytes: FOUNDATION_HUB_SUMMARY_BUDGET.maxPayloadBytes + 1,
        },
      },
    },
  })
  const missingShipPreflight = await evaluateSynthetic({
    sources: { processFoundationShipSource: 'skipPreflightReason' },
  })
  const missingClickUpSlowBudget = await evaluateSynthetic({
    proofs: { foundationVerifySlowBudgetDogfood: { ok: false } },
  })
  const missingRuntimeSupervisor = await evaluateSynthetic({
    apis: {
      foundationHub: {
        ...syntheticApis().foundationHub,
        runtimeProcessControl: { serviceSupervisor: { status: 'risk', summary: { serviceCount: 1 } } },
      },
    },
  })
  const missingRuntimeHealthCommand = await evaluateSynthetic({
    sources: {
      foundationRuntimeRendererSource: 'Supervised services Worker reliability',
    },
  })
  const missingFileSizeStandard = await evaluateSynthetic({
    proofs: { fileSizeStandardDogfood: { ok: false } },
  })
  const missingAgentStatusFreshness = await evaluateSynthetic({
    proofs: { agentStatusFreshnessDogfood: { ok: false } },
  })
  const missingAgentUsefulnessRuntimeGates = await evaluateSynthetic({
    proofs: { agentUsefulnessRuntimeGatesDogfood: { ok: false } },
  })
  const missingAgentLiveAnswerPreflight = await evaluateSynthetic({
    proofs: { agentLiveAnswerPreflightDogfood: { ok: false } },
  })
  const missingAgentCapabilityRegistry = await evaluateSynthetic({
    proofs: { agentCapabilityRegistryDogfood: { ok: false } },
  })
  const missingFoundationUpCapabilityRegistry = await evaluateSynthetic({
    proofs: { foundationUpCapabilityRegistryDogfood: { ok: false } },
  })
  const missingAgentTemplateRuntimeContract = await evaluateSynthetic({
    proofs: { agentTemplateRuntimeContractDogfood: { ok: false } },
  })
  const missingOldSystemAgentOnboardingHarvest = await evaluateSynthetic({
    proofs: { oldSystemAgentOnboardingHarvestDogfood: { ok: false } },
  })
  const missingPersonalAgentOnboardingContract = await evaluateSynthetic({
    proofs: { personalAgentOnboardingContractDogfood: { ok: false } },
  })
  const missingRoleAssistantContracts = await evaluateSynthetic({
    proofs: { roleAssistantContractsDogfood: { ok: false } },
  })
  const missingHarlanProjectRegistry = await evaluateSynthetic({
    proofs: { harlanProjectRegistryDogfood: { ok: false } },
  })
  const missingHarlanOperatorLoop = await evaluateSynthetic({
    proofs: { harlanOperatorLoopDogfood: { ok: false } },
  })
  const missingHarlanAuthEscalationLoop = await evaluateSynthetic({
    proofs: { harlanAuthEscalationLoopDogfood: { ok: false } },
  })

  return {
    ok: healthy.ok === true &&
      missingSourceOutage.ok === false &&
      missingOperatingReliability.ok === false &&
      missingPlanCriticDogfood.ok === false &&
      oversizedHubPayload.ok === false &&
      missingShipPreflight.ok === false &&
      missingClickUpSlowBudget.ok === false &&
      missingRuntimeSupervisor.ok === false &&
      missingRuntimeHealthCommand.ok === false &&
      missingFileSizeStandard.ok === false &&
      missingAgentStatusFreshness.ok === false &&
      missingAgentUsefulnessRuntimeGates.ok === false &&
      missingAgentLiveAnswerPreflight.ok === false &&
      missingAgentCapabilityRegistry.ok === false &&
      missingFoundationUpCapabilityRegistry.ok === false &&
      missingAgentTemplateRuntimeContract.ok === false &&
      missingOldSystemAgentOnboardingHarvest.ok === false &&
      missingPersonalAgentOnboardingContract.ok === false &&
      missingRoleAssistantContracts.ok === false &&
      missingHarlanProjectRegistry.ok === false &&
      missingHarlanOperatorLoop.ok === false &&
      missingHarlanAuthEscalationLoop.ok === false,
    healthy,
    missingSourceOutageRejected: missingSourceOutage.ok === false,
    missingOperatingReliabilityRejected: missingOperatingReliability.ok === false,
    missingPlanCriticDogfoodRejected: missingPlanCriticDogfood.ok === false,
    oversizedHubPayloadRejected: oversizedHubPayload.ok === false,
    missingShipPreflightRejected: missingShipPreflight.ok === false,
    missingClickUpSlowBudgetRejected: missingClickUpSlowBudget.ok === false,
    missingRuntimeSupervisorRejected: missingRuntimeSupervisor.ok === false,
    missingRuntimeHealthCommandRejected: missingRuntimeHealthCommand.ok === false,
    missingFileSizeStandardRejected: missingFileSizeStandard.ok === false,
    missingAgentStatusFreshnessRejected: missingAgentStatusFreshness.ok === false,
    missingAgentUsefulnessRuntimeGatesRejected: missingAgentUsefulnessRuntimeGates.ok === false,
    missingAgentLiveAnswerPreflightRejected: missingAgentLiveAnswerPreflight.ok === false,
    missingAgentCapabilityRegistryRejected: missingAgentCapabilityRegistry.ok === false,
    missingFoundationUpCapabilityRegistryRejected: missingFoundationUpCapabilityRegistry.ok === false,
    missingAgentTemplateRuntimeContractRejected: missingAgentTemplateRuntimeContract.ok === false,
    missingOldSystemAgentOnboardingHarvestRejected: missingOldSystemAgentOnboardingHarvest.ok === false,
    missingPersonalAgentOnboardingContractRejected: missingPersonalAgentOnboardingContract.ok === false,
    missingRoleAssistantContractsRejected: missingRoleAssistantContracts.ok === false,
    missingHarlanProjectRegistryRejected: missingHarlanProjectRegistry.ok === false,
    missingHarlanOperatorLoopRejected: missingHarlanOperatorLoop.ok === false,
    missingHarlanAuthEscalationLoopRejected: missingHarlanAuthEscalationLoop.ok === false,
    dogfoodInvariant: 'The focused runtime reliability verifier accepts healthy synthetic reliability proof and rejects missing outage boundaries, missing operating status, missing Runtime Supervisor service proof, missing Runtime Health command read, missing Plan Critic dogfood, missing file-size standard dogfood, missing agent status freshness dogfood, missing agent usefulness runtime gates dogfood, missing live-answer preflight dogfood, missing capability registry dogfood, missing agent template dogfood, missing old-system onboarding harvest dogfood, missing personal-agent onboarding contract dogfood, missing role assistant contract dogfood, missing Harlan project registry dogfood, missing Harlan operator loop dogfood, missing Harlan auth escalation dogfood, oversized hub payloads, missing ship preflight wiring, and missing ClickUp slow-budget proof.',
  }
}

export async function evaluateFoundationRuntimeReliabilityVerifierOrchestration(input = {}) {
  const {
    activeFoundationSprint = { sprint: null, items: [] },
    activeSprintAtOrPast = () => false,
    foundationBuildCloseouts = [],
    foundationRuntimeReliabilityVerifierSource = '',
    foundationVerifyRootSource = input.foundationVerifySource || '',
    packageJson = {},
    repoFileExists = fallbackRepoFileExists,
    verifierRuntimeReliabilitySplitScriptSource = '',
    verifierRuntimeReliabilitySplitPlanSource = '',
  } = input
  const runtimeReliabilityVerifier = await evaluateFoundationRuntimeReliabilityVerifier({
    ...input,
    foundationVerifySource: input.foundationVerifySource || foundationVerifyRootSource,
    sources: {
      ...(input.sources || {}),
      foundationVerifySource: input.foundationVerifySource || foundationVerifyRootSource,
      foundationRuntimeReliabilityVerifierSource,
    },
  })
  const checks = [...runtimeReliabilityVerifier.checks]
  const runtimeReliabilityDogfood = await buildFoundationRuntimeReliabilityVerifierDogfoodProof()
  const backlogItems = input.foundationHub?.backlogItems || []
  const packageScripts = asPackageScripts({ packageJson })
  const foundationVerifyLineCount = String(foundationVerifyRootSource || '').split('\n').length
  const runtimeReliabilityOldRootPatterns = [
    'const runtimeReliabilityVerifier = await evaluateFoundationRuntimeReliabilityVerifier({',
    'const verifierRuntimeReliabilitySplitDogfood = await buildFoundationRuntimeReliabilityVerifierDogfoodProof()',
    'const verifierRuntimeReliabilitySplitCard =',
  ]
  const verifierRuntimeReliabilitySplitCard = findCard(backlogItems, VERIFIER_RUNTIME_RELIABILITY_SPLIT_CARD_ID)
  const verifierRuntimeReliabilitySplitCloseout = findCloseout(foundationBuildCloseouts, VERIFIER_RUNTIME_RELIABILITY_SPLIT_CLOSEOUT_KEY)
  const verifierRuntimeReliabilitySplitClosed = verifierRuntimeReliabilitySplitCard?.lane === 'done'

  addCheck(
    checks,
    verifierRuntimeReliabilitySplitCard &&
      ['executing', 'done'].includes(verifierRuntimeReliabilitySplitCard.lane) &&
      String(verifierRuntimeReliabilitySplitCard.statusNote || '').includes(VERIFIER_RUNTIME_RELIABILITY_SPLIT_CLOSEOUT_KEY) &&
      verifierRuntimeReliabilitySplitCloseout?.operatorCloseout === true &&
      (verifierRuntimeReliabilitySplitCloseout.backlogIds || []).includes(VERIFIER_RUNTIME_RELIABILITY_SPLIT_CARD_ID) &&
      runtimeReliabilityDogfood.ok === true &&
      runtimeReliabilityVerifier.summary.passed === runtimeReliabilityVerifier.summary.total &&
      packageScripts['process:verifier-runtime-reliability-split-check'] === `node --env-file-if-exists=.env ${VERIFIER_RUNTIME_RELIABILITY_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(VERIFIER_RUNTIME_RELIABILITY_SPLIT_PLAN_PATH) &&
      await repoFileExists(VERIFIER_RUNTIME_RELIABILITY_SPLIT_APPROVAL_PATH) &&
      await repoFileExists(VERIFIER_RUNTIME_RELIABILITY_SPLIT_HANDOFF_PATH) &&
      foundationRuntimeReliabilityVerifierSource.includes('evaluateFoundationRuntimeReliabilityVerifier') &&
      foundationRuntimeReliabilityVerifierSource.includes('RUNTIME_RELIABILITY_VERIFIER_CHECK_DEFINITIONS') &&
      verifierRuntimeReliabilitySplitScriptSource.includes('dogfood rejects old runtime reliability verifier failures') &&
      verifierRuntimeReliabilitySplitPlanSource.includes('Substring-only proof is rejected') &&
      foundationVerifyRootSource.includes('evaluateFoundationRuntimeReliabilityVerifierOrchestration({') &&
      foundationVerifyRootSource.includes('runtimeReliabilityOrchestrationVerifier.checks') &&
      !foundationVerifyRootSource.includes('SOURCE-OUTAGE-BOUNDARY-001 keeps Foundation/Ops ' + 'serving during ClickUp read outages') &&
      foundationVerifyLineCount < VERIFIER_RUNTIME_RELIABILITY_SPLIT_BEFORE_LINES &&
      (activeFoundationSprint.sprint?.sprintId === VERIFIER_RUNTIME_RELIABILITY_SPLIT_SPRINT_ID ||
        verifierRuntimeReliabilitySplitClosed ||
        activeSprintAtOrPast([VERIFIER_RUNTIME_RELIABILITY_SPLIT_CARD_ID])) &&
      foundationRuntimeReliabilityVerifierSource.includes(VERIFIER_RUNTIME_RELIABILITY_SPLIT_CARD_ID),
    'VERIFIER-RUNTIME-RELIABILITY-SPLIT-001 extracts runtime reliability verifier checks into a focused module',
    verifierRuntimeReliabilitySplitCard
      ? `lane=${verifierRuntimeReliabilitySplitCard.lane} dogfood=${runtimeReliabilityDogfood.ok ? 'pass' : 'blocked'} reliabilityChecks=${runtimeReliabilityVerifier.summary.passed}/${runtimeReliabilityVerifier.summary.total} lines=${VERIFIER_RUNTIME_RELIABILITY_SPLIT_BEFORE_LINES}->${foundationVerifyLineCount}`
      : `missing ${VERIFIER_RUNTIME_RELIABILITY_SPLIT_CARD_ID}`,
  )

  const verifierRuntimeReliabilityOrchestrationCard = findCard(backlogItems, VERIFIER_RUNTIME_RELIABILITY_ORCHESTRATION_SPLIT_CARD_ID)
  const verifierRuntimeReliabilityOrchestrationCloseout = findCloseout(foundationBuildCloseouts, VERIFIER_RUNTIME_RELIABILITY_ORCHESTRATION_SPLIT_CLOSEOUT_KEY)
  addCheck(
    checks,
    verifierRuntimeReliabilityOrchestrationCard &&
      ['executing', 'done'].includes(verifierRuntimeReliabilityOrchestrationCard.lane) &&
      String(verifierRuntimeReliabilityOrchestrationCard.statusNote || '').includes(VERIFIER_RUNTIME_RELIABILITY_ORCHESTRATION_SPLIT_CLOSEOUT_KEY) &&
      verifierRuntimeReliabilityOrchestrationCloseout?.operatorCloseout === true &&
      (verifierRuntimeReliabilityOrchestrationCloseout.backlogIds || []).includes(VERIFIER_RUNTIME_RELIABILITY_ORCHESTRATION_SPLIT_CARD_ID) &&
      runtimeReliabilityDogfood.ok === true &&
      runtimeReliabilityVerifier.summary.passed === runtimeReliabilityVerifier.summary.total &&
      packageScripts['process:verifier-runtime-reliability-orchestration-split-check'] === `node --env-file-if-exists=.env ${VERIFIER_RUNTIME_RELIABILITY_ORCHESTRATION_SPLIT_SCRIPT_PATH}` &&
      await repoFileExists(VERIFIER_RUNTIME_RELIABILITY_ORCHESTRATION_SPLIT_PLAN_PATH) &&
      await repoFileExists(VERIFIER_RUNTIME_RELIABILITY_ORCHESTRATION_SPLIT_APPROVAL_PATH) &&
      await repoFileExists(VERIFIER_RUNTIME_RELIABILITY_ORCHESTRATION_SPLIT_HANDOFF_PATH) &&
      foundationRuntimeReliabilityVerifierSource.includes('evaluateFoundationRuntimeReliabilityVerifierOrchestration') &&
      foundationVerifyRootSource.includes('evaluateFoundationRuntimeReliabilityVerifierOrchestration({') &&
      foundationVerifyRootSource.includes('runtimeReliabilityOrchestrationVerifier.checks') &&
      runtimeReliabilityOldRootPatterns.every(pattern => !foundationVerifyRootSource.includes(pattern)) &&
      foundationVerifyLineCount < VERIFIER_RUNTIME_RELIABILITY_ORCHESTRATION_SPLIT_BEFORE_LINES,
    'VERIFIER-RUNTIME-RELIABILITY-ORCHESTRATION-SPLIT-001 moves runtime reliability orchestration into the focused module',
    verifierRuntimeReliabilityOrchestrationCard
      ? `lane=${verifierRuntimeReliabilityOrchestrationCard.lane} dogfood=${runtimeReliabilityDogfood.ok ? 'pass' : 'blocked'} reliabilityChecks=${runtimeReliabilityVerifier.summary.passed}/${runtimeReliabilityVerifier.summary.total} lines=${VERIFIER_RUNTIME_RELIABILITY_ORCHESTRATION_SPLIT_BEFORE_LINES}->${foundationVerifyLineCount}`
      : `missing ${VERIFIER_RUNTIME_RELIABILITY_ORCHESTRATION_SPLIT_CARD_ID}`,
  )

  return {
    checks,
    runtimeReliabilityVerifier,
    dogfood: runtimeReliabilityDogfood,
    planCriticArchitecturalRulesProof: runtimeReliabilityVerifier.artifacts.planCriticArchitecturalRulesProof,
  }
}
