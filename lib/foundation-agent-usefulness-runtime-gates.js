export const FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_CARD_ID = 'FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001'
export const FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_CLOSEOUT_KEY = 'foundation-agent-usefulness-runtime-gates-v1'
export const FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_PLAN_PATH = 'docs/process/foundation-agent-usefulness-runtime-gates-001-plan.md'
export const FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001.json'
export const FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_SCRIPT_PATH = 'scripts/process-foundation-agent-usefulness-runtime-gates-check.mjs'
export const FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-foundation-agent-usefulness-runtime-gates-closeout.md'
export const FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_SPRINT_ID = 'foundation-agent-usefulness-runtime-gates-2026-05-18'

export const FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_CHANGED_FILES = [
  'lib/foundation-agent-usefulness-runtime-gates.js',
  'scripts/process-foundation-agent-usefulness-runtime-gates-check.mjs',
  'lib/foundation-runtime-reliability-verifier.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'scripts/foundation-verify.mjs',
  'lib/foundation-build-closeout-agent-runtime-records.js',
  'lib/foundation-build-closeout-records.js',
  'docs/process/foundation-agent-usefulness-runtime-gates-001-plan.md',
  'docs/process/approvals/FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001.json',
  'docs/handoffs/2026-05-18-foundation-agent-usefulness-runtime-gates-closeout.md',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'package.json',
]

export const FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_PROOF_COMMANDS = [
  'node --check lib/foundation-agent-usefulness-runtime-gates.js lib/foundation-runtime-reliability-verifier.js scripts/process-foundation-agent-usefulness-runtime-gates-check.mjs scripts/foundation-verify.mjs',
  'npm run process:foundation-agent-usefulness-runtime-gates-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001 --planApprovalRef=docs/process/approvals/FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001.json --closeoutKey=foundation-agent-usefulness-runtime-gates-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001 --closeoutKey=foundation-agent-usefulness-runtime-gates-v1',
  'npm run process:foundation-ship -- --card=FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001 --planApprovalRef=docs/process/approvals/FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001.json --closeoutKey=foundation-agent-usefulness-runtime-gates-v1 --commitRef=HEAD',
]

export const FOUNDATION_AGENT_USEFULNESS_NOT_NEXT_BOUNDARIES = [
  'Do not build Harlan UI or feature work.',
  'Do not launch live agent runtime work.',
  'Do not run live extraction.',
  'Do not run auth-required or paid jobs.',
  'Do not call providers or models.',
  'Do not send Gmail, ClickUp, Drive, Slack, or Agent Feedback mutations.',
  'Do not mutate Google Drive permissions.',
  'Do not work MEETING-VAULT-ACL-001 Phase B or historical Meeting Vault cleanup from this sprint.',
  'Do not launch hidden subagents or parallel builders.',
]

export const FOUNDATION_AGENT_USEFULNESS_REQUIRED_COMPONENTS = Object.freeze([
  { componentId: 'live-answer-preflight', childCardId: 'AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001' },
  { componentId: 'capability-registry', childCardId: 'AGENT-CAPABILITY-REGISTRY-001' },
  { componentId: 'action-permission-contract', childCardId: 'AGENT-CAPABILITY-REGISTRY-001' },
  { componentId: 'stale-data-warning', childCardId: 'AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001' },
  { componentId: 'source-backed-status-claim-guard', childCardId: 'AGENT-STATUS-FRESHNESS-GATE-001' },
  { componentId: 'failure-visibility', childCardId: 'AGENT-TEMPLATE-RUNTIME-CONTRACT-001' },
  { componentId: 'prompt-only-rule-rejection', childCardId: 'AGENT-TEMPLATE-RUNTIME-CONTRACT-001' },
])

const CURRENT_CLAIM_TYPES = new Set(['current_status', 'operational_status', 'capability_status'])
const MUTATING_ACTIONS = new Set(['external_send', 'external_write', 'drive_mutation', 'live_extraction', 'paid_run', 'provider_call', 'model_call'])
const ACCEPTED_LIVE_ROUTES = new Set(['/api/foundation-hub', '/api/foundation/system-health', '/api/foundation/current-sprint', '/api/source-of-truth'])

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
}

function toDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function minutesBetween(later, earlier) {
  return Math.max(0, Math.round((later.getTime() - earlier.getTime()) / 60000))
}

function addViolation(violations, subject, ruleId, detail = '') {
  violations.push({ subject: subject || 'foundation-agent-usefulness-runtime-gates', ruleId, detail })
}

function isFreshPreflight(preflight = {}, now, defaultMaxAgeMinutes) {
  const queriedAt = toDate(preflight.queriedAt)
  const maxAgeMinutes = Number(preflight.maxAgeMinutes || defaultMaxAgeMinutes || 10)
  return preflight.sourceKind === 'live_api' &&
    ACCEPTED_LIVE_ROUTES.has(preflight.route) &&
    text(preflight.sourceId) &&
    text(preflight.evidenceStamp) &&
    preflight.status === 'available' &&
    queriedAt &&
    minutesBetween(now, queriedAt) <= maxAgeMinutes
}

function requiresCurrentTruth(answer = {}) {
  return CURRENT_CLAIM_TYPES.has(text(answer.claimType)) || answer.answerType === 'operational_answer'
}

function requiresApproval(action = {}) {
  return action.externalWrite === true || MUTATING_ACTIONS.has(text(action.kind)) || action.approvalRequired === true
}

export function buildFoundationAgentUsefulnessRuntimeGateBundle(overrides = {}) {
  const now = '2026-05-18T18:55:00.000-04:00'
  return {
    cardId: FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_CARD_ID,
    closeoutKey: FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_CLOSEOUT_KEY,
    ownerLayer: 'Foundation',
    proposalOnly: true,
    implementationStarted: false,
    liveAgentRuntimeStarted: false,
    extractionStarted: false,
    modelCallsStarted: false,
    externalWritesStarted: false,
    hiddenSubagentsSpawned: false,
    policy: {
      now,
      maxPreflightAgeMinutes: 10,
      hiddenSubagentsDefault: 'forbidden_without_explicit_approval',
      currentTruthOwner: 'Foundation/API',
      nextCards: ['AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001', 'AGENT-CAPABILITY-REGISTRY-001', 'AGENT-TEMPLATE-RUNTIME-CONTRACT-001'],
    },
    gateComponents: FOUNDATION_AGENT_USEFULNESS_REQUIRED_COMPONENTS.map(component => ({
      ...component,
      runtimeEnforced: true,
      enforcementMode: 'code_contract',
      runtimeHook: `agent-usefulness:${component.componentId}`,
      validator: `validate:${component.componentId}`,
      mustFailClosed: true,
      proofMode: 'synthetic_dogfood',
    })),
    agentAnswers: [
      {
        answerId: 'healthy-current-status',
        agentId: 'harlan-pilot',
        answerType: 'operational_answer',
        claimType: 'current_status',
        statement: 'Foundation verifier is green as of the latest live Foundation check.',
        responseLabel: 'current',
        livePreflight: {
          sourceKind: 'live_api',
          route: '/api/foundation-hub',
          sourceId: 'foundation-hub:verification',
          evidenceStamp: 'foundation-hub:verification:2026-05-18T18:54:30-04:00',
          queriedAt: '2026-05-18T18:54:30.000-04:00',
          status: 'available',
        },
        capabilityEvidence: {
          registryRef: 'agent-capability-registry:v1',
          agentId: 'harlan-pilot',
          capabilityId: 'foundation-status-read',
          status: 'declared',
          posture: 'read_only',
        },
        actionPermission: {
          kind: 'read_only',
          externalWrite: false,
          approvalRequired: false,
        },
        failureVisibility: {
          required: false,
          publicVisible: true,
        },
        sourceBackedStatusClaimGuard: {
          gateRef: 'agent-status-freshness-gate-v1',
          status: 'applied',
        },
        execution: {
          hiddenWorker: false,
        },
      },
    ],
    notNextBoundaries: FOUNDATION_AGENT_USEFULNESS_NOT_NEXT_BOUNDARIES,
    ...overrides,
  }
}

export function evaluateFoundationAgentUsefulnessRuntimeGateBundle(bundle = buildFoundationAgentUsefulnessRuntimeGateBundle()) {
  const violations = []
  const policy = bundle.policy || {}
  const now = toDate(policy.now) || new Date('2026-05-18T18:55:00.000-04:00')
  const maxAgeMinutes = Number(policy.maxPreflightAgeMinutes || 10)
  const components = list(bundle.gateComponents)

  if (bundle.ownerLayer !== 'Foundation') addViolation(violations, bundle.cardId, 'foundation_owner_required', bundle.ownerLayer || 'missing')
  if (bundle.proposalOnly !== true) addViolation(violations, bundle.cardId, 'proposal_only_required', String(bundle.proposalOnly))
  if (bundle.implementationStarted === true || bundle.liveAgentRuntimeStarted === true) addViolation(violations, bundle.cardId, 'runtime_implementation_started', 'this card scopes gates only')
  if (bundle.extractionStarted === true) addViolation(violations, bundle.cardId, 'live_extraction_started', 'live extraction is not approved')
  if (bundle.modelCallsStarted === true) addViolation(violations, bundle.cardId, 'model_call_started', 'model/provider calls are not approved')
  if (bundle.externalWritesStarted === true) addViolation(violations, bundle.cardId, 'external_write_started', 'external writes are not approved')
  if (bundle.hiddenSubagentsSpawned === true) addViolation(violations, bundle.cardId, 'hidden_subagent_started', 'hidden workers require explicit approval')

  for (const required of FOUNDATION_AGENT_USEFULNESS_REQUIRED_COMPONENTS) {
    const component = components.find(item => item.componentId === required.componentId)
    if (!component) {
      addViolation(violations, required.componentId, 'required_gate_component_missing', required.childCardId)
      continue
    }
    if (component.childCardId !== required.childCardId) addViolation(violations, required.componentId, 'child_card_mapping_required', component.childCardId || 'missing')
    if (component.runtimeEnforced !== true) addViolation(violations, required.componentId, 'runtime_enforcement_required', 'prompt text alone is not accepted')
    if (component.enforcementMode === 'prompt_only') addViolation(violations, required.componentId, 'prompt_only_rule_blocked', component.enforcementMode)
    if (!text(component.runtimeHook) || !text(component.validator)) addViolation(violations, required.componentId, 'runtime_hook_and_validator_required', 'missing hook or validator')
    if (component.mustFailClosed !== true) addViolation(violations, required.componentId, 'fail_closed_required', 'component must fail closed')
  }

  const answers = list(bundle.agentAnswers)
  if (!answers.length) addViolation(violations, bundle.cardId, 'dogfood_answer_fixture_required', 'at least one agent answer fixture is required')

  for (const answer of answers) {
    const answerId = text(answer.answerId)
    const preflightFresh = isFreshPreflight(answer.livePreflight, now, maxAgeMinutes)
    const sourceUnavailable = answer.livePreflight?.status && answer.livePreflight.status !== 'available'
    const sourceStale = answer.livePreflight?.queriedAt && !preflightFresh
    const capability = answer.capabilityEvidence || {}
    const action = answer.actionPermission || {}
    const failure = answer.failureVisibility || {}

    if (requiresCurrentTruth(answer) && !preflightFresh) addViolation(violations, answerId, 'fresh_live_preflight_required', 'current operational answers need a fresh evidence stamp')
    if (requiresCurrentTruth(answer) && answer.responseLabel !== 'current' && preflightFresh) addViolation(violations, answerId, 'fresh_answer_label_required', answer.responseLabel || 'missing')
    if ((sourceUnavailable || sourceStale) && !text(answer.staleWarning)) addViolation(violations, answerId, 'stale_data_warning_required', 'stale or unavailable sources need visible wording')
    if ((sourceUnavailable || sourceStale) && answer.responseLabel === 'current') addViolation(violations, answerId, 'stale_source_cannot_sound_current', 'stale data must be blocked or last-known')
    if (!text(capability.registryRef) || capability.status !== 'declared' || capability.claimOnly === true) addViolation(violations, answerId, 'capability_registry_evidence_required', capability.registryRef || 'missing')
    if (requiresApproval(action) && (action.approvalStatus !== 'approved' || !text(action.approvalRef))) addViolation(violations, answerId, 'approval_required_for_side_effect', action.kind || 'unknown action')
    if (answer.execution?.hiddenWorker === true && (answer.execution.explicitHiddenWorkerApproval !== true || !text(answer.execution.approvalRef))) addViolation(violations, answerId, 'hidden_worker_approval_required', 'hidden workers are not default builder mode')
    if (failure.required === true && failure.publicVisible !== true) addViolation(violations, answerId, 'failure_visibility_required', failure.reason || 'missing visible failure')
    if (requiresCurrentTruth(answer) && answer.sourceBackedStatusClaimGuard?.status !== 'applied') addViolation(violations, answerId, 'status_claim_guard_required', 'AGENT-STATUS-FRESHNESS-GATE-001 must be applied')
    if (answer.promptOnlyPolicy === true) addViolation(violations, answerId, 'prompt_only_policy_rejected', 'runtime gate proof cannot be prompt-only')
  }

  return {
    ok: violations.length === 0,
    status: violations.length ? 'blocked' : 'ready',
    cardId: bundle.cardId,
    closeoutKey: bundle.closeoutKey,
    violations,
    summary: {
      componentCount: components.length,
      answerFixtureCount: answers.length,
      violationCount: violations.length,
      nextCardCount: list(policy.nextCards).length,
    },
  }
}

export function buildFoundationAgentUsefulnessRuntimeGateDogfoodProof() {
  const healthy = evaluateFoundationAgentUsefulnessRuntimeGateBundle(buildFoundationAgentUsefulnessRuntimeGateBundle())
  const promptOnlyBundle = evaluateFoundationAgentUsefulnessRuntimeGateBundle(buildFoundationAgentUsefulnessRuntimeGateBundle({
    gateComponents: FOUNDATION_AGENT_USEFULNESS_REQUIRED_COMPONENTS.map(component => ({
      ...component,
      runtimeEnforced: component.componentId !== 'live-answer-preflight',
      enforcementMode: component.componentId === 'live-answer-preflight' ? 'prompt_only' : 'code_contract',
      runtimeHook: component.componentId === 'live-answer-preflight' ? '' : `agent-usefulness:${component.componentId}`,
      validator: component.componentId === 'live-answer-preflight' ? '' : `validate:${component.componentId}`,
      mustFailClosed: true,
      proofMode: 'synthetic_dogfood',
    })),
  }))
  const staleMemoryAnswer = evaluateFoundationAgentUsefulnessRuntimeGateBundle(buildFoundationAgentUsefulnessRuntimeGateBundle({
    agentAnswers: [{
      ...buildFoundationAgentUsefulnessRuntimeGateBundle().agentAnswers[0],
      answerId: 'stale-memory-current-answer',
      responseLabel: 'current',
      livePreflight: { sourceKind: 'memory', sourceId: 'memory/2026-05-17.md', status: 'available' },
    }],
  }))
  const undeclaredCapability = evaluateFoundationAgentUsefulnessRuntimeGateBundle(buildFoundationAgentUsefulnessRuntimeGateBundle({
    agentAnswers: [{
      ...buildFoundationAgentUsefulnessRuntimeGateBundle().agentAnswers[0],
      answerId: 'undeclared-capability',
      capabilityEvidence: { registryRef: '', status: 'missing', claimOnly: true },
    }],
  }))
  const unapprovedWrite = evaluateFoundationAgentUsefulnessRuntimeGateBundle(buildFoundationAgentUsefulnessRuntimeGateBundle({
    agentAnswers: [{
      ...buildFoundationAgentUsefulnessRuntimeGateBundle().agentAnswers[0],
      answerId: 'unapproved-external-write',
      actionPermission: { kind: 'external_send', externalWrite: true, approvalRequired: true, approvalStatus: 'missing' },
    }],
  }))
  const staleNoWarning = evaluateFoundationAgentUsefulnessRuntimeGateBundle(buildFoundationAgentUsefulnessRuntimeGateBundle({
    agentAnswers: [{
      ...buildFoundationAgentUsefulnessRuntimeGateBundle().agentAnswers[0],
      answerId: 'stale-no-warning',
      responseLabel: 'current',
      livePreflight: {
        sourceKind: 'live_api',
        route: '/api/foundation-hub',
        sourceId: 'foundation-hub:verification',
        evidenceStamp: 'old',
        queriedAt: '2026-05-18T17:00:00.000-04:00',
        status: 'available',
      },
    }],
  }))
  const hiddenWorker = evaluateFoundationAgentUsefulnessRuntimeGateBundle(buildFoundationAgentUsefulnessRuntimeGateBundle({
    agentAnswers: [{
      ...buildFoundationAgentUsefulnessRuntimeGateBundle().agentAnswers[0],
      answerId: 'hidden-worker-no-approval',
      execution: { hiddenWorker: true, explicitHiddenWorkerApproval: false },
    }],
  }))
  const hiddenFailure = evaluateFoundationAgentUsefulnessRuntimeGateBundle(buildFoundationAgentUsefulnessRuntimeGateBundle({
    agentAnswers: [{
      ...buildFoundationAgentUsefulnessRuntimeGateBundle().agentAnswers[0],
      answerId: 'hidden-failure',
      failureVisibility: { required: true, publicVisible: false, reason: 'source unavailable' },
    }],
  }))

  return {
    ok: healthy.ok === true &&
      promptOnlyBundle.ok === false &&
      staleMemoryAnswer.ok === false &&
      undeclaredCapability.ok === false &&
      unapprovedWrite.ok === false &&
      staleNoWarning.ok === false &&
      hiddenWorker.ok === false &&
      hiddenFailure.ok === false,
    invariant: 'Agent usefulness requires runtime-enforced gates; prompt-only rules, stale current answers, undeclared capability claims, unapproved side effects, stale data without warnings, hidden workers, and hidden failures fail closed.',
    healthy,
    promptOnlyBundleRejected: promptOnlyBundle.ok === false,
    staleMemoryAnswerRejected: staleMemoryAnswer.ok === false,
    undeclaredCapabilityRejected: undeclaredCapability.ok === false,
    unapprovedWriteRejected: unapprovedWrite.ok === false,
    staleNoWarningRejected: staleNoWarning.ok === false,
    hiddenWorkerRejected: hiddenWorker.ok === false,
    hiddenFailureRejected: hiddenFailure.ok === false,
  }
}
