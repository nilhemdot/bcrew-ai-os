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
  FOUNDATION_VERIFY_LLM_AUTH_AUDIT_SCRIPT_PATH,
} from './foundation-verify-llm-auth-audit.js'
import {
  buildClickUpSourceVerifierDogfoodProof,
} from './clickup-source-verifier.js'
import {
  buildFoundationVerifySlowBudgetDogfoodProof,
} from './foundation-verify-profile-budget.js'

export const VERIFIER_RUNTIME_RELIABILITY_SPLIT_CARD_ID = 'VERIFIER-RUNTIME-RELIABILITY-SPLIT-001'
export const VERIFIER_RUNTIME_RELIABILITY_SPLIT_CLOSEOUT_KEY = 'verifier-runtime-reliability-split-v1'
export const VERIFIER_RUNTIME_RELIABILITY_SPLIT_PLAN_PATH = 'docs/process/verifier-runtime-reliability-split-001-plan.md'
export const VERIFIER_RUNTIME_RELIABILITY_SPLIT_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-RUNTIME-RELIABILITY-SPLIT-001.json'
export const VERIFIER_RUNTIME_RELIABILITY_SPLIT_SCRIPT_PATH = 'scripts/process-verifier-runtime-reliability-split-check.mjs'
export const VERIFIER_RUNTIME_RELIABILITY_SPLIT_HANDOFF_PATH = 'docs/handoffs/2026-05-15-verifier-runtime-reliability-split-closeout.md'
export const VERIFIER_RUNTIME_RELIABILITY_SPLIT_SPRINT_ID = 'verifier-runtime-reliability-split-2026-05-15'
export const VERIFIER_RUNTIME_RELIABILITY_SPLIT_BEFORE_LINES = 15623

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
      await repoFileExists('docs/handoffs/2026-05-14-source-outage-boundary-closeout.md') &&
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
      await repoFileExists('docs/handoffs/2026-05-14-foundation-full-diagnostics-perf-closeout.md') &&
      sources.foundationHubFullDiagnosticsSource?.includes('withDiagnosticDeadline') &&
      sources.foundationHubFullDiagnosticsSource?.includes('Promise.race') &&
      sources.foundationHubFullDiagnosticsSource?.includes('runtime_diagnostic_timeout') &&
      sources.foundationHubFullDiagnosticsSource?.includes('buildSyntheticFoundationFullDiagnosticsDogfoodProof') &&
      sources.foundationHubFullDiagnosticsScriptSource?.includes('dogfood proof converts slow optional Agent Feedback panels into degraded source health') &&
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
      await repoFileExists('docs/handoffs/2026-05-14-foundation-ship-gate-speed-payload-cleanup-closeout.md') &&
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
      sources.foundationVerifySource?.includes('CLICKUP_SOURCE_VERIFY_SUMMARY') &&
      sources.clickupSource?.includes('sanitizeClickUpErrorMessage') &&
      sources.clickupSource?.includes('[redacted]') &&
      sources.foundationBuildCloseoutCleanupRecordsSource?.includes(FOUNDATION_CLICKUP_VERIFY_HEALTH_BOUNDARY_CLOSEOUT_KEY) &&
      await repoFileExists('docs/handoffs/2026-05-14-foundation-clickup-verify-health-boundary-closeout.md') &&
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
  }
}

function syntheticSources(overrides = {}) {
  const foundationVerifySource = [
    ...RUNTIME_RELIABILITY_VERIFIER_CHECK_DEFINITIONS,
    'buildSyntheticPlanCriticArchitecturalRulesProof',
    'recordFoundationVerifyTiming',
    'FOUNDATION_VERIFY_PROFILE',
    'overBudgetSections',
    'CLICKUP_SOURCE_VERIFY_SUMMARY',
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
    serverRouteSource: 'sourceOutageBoundary foundationOperatingReliability buildFoundationHubAgentFeedbackDiagnostics foundationHubFullDiagnostics compactSharedCommunicationSynthesis compactFoundationSourceLifecycle',
    foundationJobsSource: `${CONNECTOR_UPTIME_MONITOR_JOB_KEY} mutationPosture: 'read_only'`,
    connectorUptimeMonitorSource: 'buildConnectorUptimeSnapshot buildRuntimeActivationSnapshot buildMorningHealthSnapshot assertNoConnectorUptimeSecretLeak',
    foundationOperatingReliabilityScriptSource: 'dogfood recreates connector failures, runtime states, and audit confusion',
    planCriticSource: 'architectural_rot_rules buildSyntheticPlanCriticArchitecturalRulesProof',
    hubReadRoutesSource: "getFoundationCoreSnapshot app.get('/api/foundation-hub' normalizeFoundationHubMode",
    foundationFrontendSource: 'fetchFoundationHubFull /api/foundation-hub?view=full',
    foundationDbSource: 'getFoundationCoreSnapshot',
    foundationHubPerformanceSource: '/api/foundation-hub?view=full buildSyntheticFoundationHubBudgetProof maxPayloadBytes: 4500000',
    foundationPerformanceScriptSource: 'default Foundation Hub route stays under latency and payload budget',
    foundationBuildLogRegistrySource: FOUNDATION_PERFORMANCE_CLOSEOUT_KEY,
    foundationHubFullDiagnosticsSource: 'withDiagnosticDeadline Promise.race runtime_diagnostic_timeout buildSyntheticFoundationFullDiagnosticsDogfoodProof maxBytes: 4200000',
    foundationHubFullDiagnosticsScriptSource: 'dogfood proof converts slow optional Agent Feedback panels into degraded source health',
    foundationBuildCloseoutCleanupRecordsSource: [
      FOUNDATION_FULL_DIAGNOSTICS_CLOSEOUT_KEY,
      FOUNDATION_SHIP_GATE_SPEED_PAYLOAD_CLOSEOUT_KEY,
      FOUNDATION_CLICKUP_VERIFY_HEALTH_BOUNDARY_CLOSEOUT_KEY,
      FOUNDATION_OPERATING_RELIABILITY_CLOSEOUT_KEY,
    ].join(' '),
    processFoundationShipSource: 'process:foundation-ship-preflight skipPreflightReason',
    foundationShipPreflightSource: 'buildFoundationShipPreflightDogfoodProof LLM_AUTH_AUDIT_REPAIR_COMMAND',
    foundationShipPreflightScriptSource: 'getLlmRuntimeSnapshot getFoundationJobRunSnapshot',
    foundationVerifyProfileScriptSource: 'profile command runs the real verifier and does not skip checks',
    llmAuthAuditVerifierModuleSource: 'evaluateLlmAuthAuditVerifierCheck buildLlmAuthAuditVerifierDogfoodProof',
    llmAuthAuditVerifierCheckSource: 'buildLlmAuthAuditVerifierDogfoodProof',
    foundationHubFullPayloadReduceScriptSource: 'live full payload is materially smaller than measured baseline',
    clickupSourceVerifierSource: 'CLICKUP_SOURCE_VERIFY_DEFAULT_TIMEOUT_MS createClickUpSnapshotCache Promise.all CLICKUP_SOURCE_VERIFY_SUMMARY sourceHealth',
    clickupSourceVerifyScriptSource: '--timeoutMs= --maxTaskPages= formatClickUpSourceVerificationReport',
    clickupVerifyHealthBoundaryScriptSource: 'bounded live clickup:verify emits structured summary within 30s dogfood proves bounded ClickUp reads dogfood proves verifier slow-section budget',
    foundationVerifyProfileBudgetSource: 'DEFAULT_FOUNDATION_VERIFY_SLOW_SECTION_BUDGET_MS resolveFoundationVerifySectionOwner buildFoundationVerifySlowBudgetDogfoodProof',
    foundationVerifySource,
    ...overrides,
  }
}

function syntheticApis() {
  return {
    foundationHub: {
      backlogItems: syntheticCards(),
      sourceOutageBoundary: { status: 'healthy' },
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

  return {
    ok: healthy.ok === true &&
      missingSourceOutage.ok === false &&
      missingOperatingReliability.ok === false &&
      missingPlanCriticDogfood.ok === false &&
      oversizedHubPayload.ok === false &&
      missingShipPreflight.ok === false &&
      missingClickUpSlowBudget.ok === false,
    healthy,
    missingSourceOutageRejected: missingSourceOutage.ok === false,
    missingOperatingReliabilityRejected: missingOperatingReliability.ok === false,
    missingPlanCriticDogfoodRejected: missingPlanCriticDogfood.ok === false,
    oversizedHubPayloadRejected: oversizedHubPayload.ok === false,
    missingShipPreflightRejected: missingShipPreflight.ok === false,
    missingClickUpSlowBudgetRejected: missingClickUpSlowBudget.ok === false,
    dogfoodInvariant: 'The focused runtime reliability verifier accepts healthy synthetic reliability proof and rejects missing outage boundaries, missing operating status, missing Plan Critic dogfood, oversized hub payloads, missing ship preflight wiring, and missing ClickUp slow-budget proof.',
  }
}
