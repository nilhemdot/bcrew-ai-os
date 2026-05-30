export const AGENT_CAPABILITY_REGISTRY_CARD_ID = 'AGENT-CAPABILITY-REGISTRY-001'
export const AGENT_CAPABILITY_REGISTRY_CLOSEOUT_KEY = 'agent-capability-registry-v1'
export const AGENT_CAPABILITY_REGISTRY_PLAN_PATH = 'docs/process/agent-capability-registry-001-plan.md'
export const AGENT_CAPABILITY_REGISTRY_APPROVAL_PATH = 'docs/process/approvals/AGENT-CAPABILITY-REGISTRY-001.json'
export const AGENT_CAPABILITY_REGISTRY_SCRIPT_PATH = 'scripts/process-agent-capability-registry-check.mjs'
export const AGENT_CAPABILITY_REGISTRY_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-18-agent-capability-registry-closeout.md'
export const AGENT_CAPABILITY_REGISTRY_SPRINT_ID = 'agent-capability-registry-2026-05-18'

export const AGENT_CAPABILITY_REGISTRY_CHANGED_FILES = [
  'lib/agent-capability-registry.js',
  'scripts/process-agent-capability-registry-check.mjs',
  'lib/foundation-runtime-reliability-verifier.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'scripts/foundation-verify.mjs',
  'lib/foundation-build-closeout-agent-runtime-records.js',
  'docs/process/agent-capability-registry-001-plan.md',
  'docs/process/approvals/AGENT-CAPABILITY-REGISTRY-001.json',
  'docs/_archive/handoffs/2026-05-18-agent-capability-registry-closeout.md',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'package.json',
]

export const AGENT_CAPABILITY_REGISTRY_PROOF_COMMANDS = [
  'node --check lib/agent-capability-registry.js lib/foundation-runtime-reliability-verifier.js scripts/process-agent-capability-registry-check.mjs scripts/foundation-verify.mjs',
  'npm run process:agent-capability-registry-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=AGENT-CAPABILITY-REGISTRY-001 --planApprovalRef=docs/process/approvals/AGENT-CAPABILITY-REGISTRY-001.json --closeoutKey=agent-capability-registry-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=AGENT-CAPABILITY-REGISTRY-001 --closeoutKey=agent-capability-registry-v1',
  'npm run process:foundation-ship -- --card=AGENT-CAPABILITY-REGISTRY-001 --planApprovalRef=docs/process/approvals/AGENT-CAPABILITY-REGISTRY-001.json --closeoutKey=agent-capability-registry-v1 --commitRef=HEAD',
]

export const AGENT_CAPABILITY_REGISTRY_NOT_NEXT_BOUNDARIES = [
  'Do not build Harlan UI or feature work.',
  'Do not launch live agent runtime work.',
  'Do not run live extraction.',
  'Do not call providers or models.',
  'Do not send Gmail, ClickUp, Drive, Slack, or Agent Feedback mutations.',
  'Do not mutate Google Drive permissions.',
  'Do not work MEETING-VAULT-ACL-001 Phase B or historical Meeting Vault cleanup from this sprint.',
  'Do not send request-access emails.',
  'Do not implement the reusable runtime template in this card.',
  'Do not launch hidden subagents or parallel builders.',
]

const MUTATING_ACTION_KINDS = new Set([
  'external_send',
  'external_write',
  'drive_mutation',
  'live_extraction',
  'paid_run',
  'provider_call',
  'model_call',
])

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function addViolation(violations, subject, ruleId, detail = '') {
  violations.push({ subject: subject || 'agent-capability-registry', ruleId, detail })
}

function isMutatingAction(action = {}) {
  return MUTATING_ACTION_KINDS.has(text(action.kind)) || action.externalWrite === true
}

function findAgent(registry, agentId) {
  return list(registry.agents).find(agent => agent.agentId === agentId) || null
}

function findCapability(registry, agentId, capabilityId) {
  return list(registry.capabilities).find(capability =>
    capability.agentId === agentId && capability.capabilityId === capabilityId
  ) || null
}

function findAction(capability, actionId) {
  return list(capability.allowedActions).find(action => action.actionId === actionId) || null
}

export function buildAgentCapabilityRegistry(overrides = {}) {
  return {
    cardId: AGENT_CAPABILITY_REGISTRY_CARD_ID,
    closeoutKey: AGENT_CAPABILITY_REGISTRY_CLOSEOUT_KEY,
    ownerLayer: 'Foundation',
    registryVersion: 1,
    readOnlyRegistry: true,
    liveAgentRuntimeStarted: false,
    extractionStarted: false,
    modelCallsStarted: false,
    externalWritesStarted: false,
    hiddenSubagentsSpawned: false,
    policy: {
      defaultDecision: 'fail_closed',
      missingCapabilityDecision: 'blocked',
      writePosture: 'approval_required_and_disabled_by_default',
      modelRoutePolicy: 'adapter_only_no_live_call_in_this_card',
      requiredEvidence: ['agent', 'capability', 'tools', 'sourceRefs', 'modelRoute', 'logging', 'approvalBoundary'],
    },
    agents: [
      {
        agentId: 'harlan-pilot',
        displayName: 'Harlan',
        role: 'personal-operator-assistant',
        owner: 'Steve / Foundation',
        purpose: 'Answer operator questions only when the needed source and capability proof is declared.',
        status: 'planned_guarded',
        permissionTier: 'read_only_preflight',
        liveAnswerPreflightRef: 'agent-live-answer-preflight-gate-v1',
        statusFreshnessRef: 'agent-status-freshness-gate-v1',
        runtimeTemplateRef: 'AGENT-TEMPLATE-RUNTIME-CONTRACT-001:pending',
      },
      {
        agentId: 'crewbert-foundation',
        displayName: 'Crewbert',
        role: 'foundation-system-orchestrator',
        owner: 'Foundation',
        purpose: 'Coordinate Foundation work from live backlog truth after the runtime template exists.',
        status: 'planned_guarded',
        permissionTier: 'read_only_preflight',
        liveAnswerPreflightRef: 'agent-live-answer-preflight-gate-v1',
        statusFreshnessRef: 'agent-status-freshness-gate-v1',
        runtimeTemplateRef: 'AGENT-TEMPLATE-RUNTIME-CONTRACT-001:pending',
      },
    ],
    capabilities: [
      {
        agentId: 'harlan-pilot',
        capabilityId: 'foundation-status-read',
        title: 'Read current Foundation system status',
        status: 'declared',
        posture: 'read_only',
        claimOnly: false,
        tools: [
          { toolId: 'foundation-hub-api', kind: 'live_api', route: '/api/foundation-hub', access: 'read', approvalRequired: false },
          { toolId: 'system-health-api', kind: 'live_api', route: '/api/foundation/system-health', access: 'read', approvalRequired: false },
        ],
        sourceRefs: [
          { kind: 'system', ref: 'SYS-AGENTS-001', role: 'agent-system-boundary' },
          { kind: 'route', ref: '/api/foundation-hub', role: 'system-health-truth' },
        ],
        modelRoute: {
          routeId: 'foundation-agent-answer:adapter-owned',
          providerPolicy: 'adapter_only',
          modelCallsEnabled: false,
        },
        logging: {
          eventLog: 'foundation_agent_capability_events',
          transcriptPolicy: 'operator_visible',
          proofRequired: true,
        },
        approvalBoundary: {
          defaultDecision: 'allow_read_only',
          externalWrites: 'blocked_without_explicit_approval',
          approvalRequiredFor: ['external_send', 'external_write', 'drive_mutation', 'live_extraction', 'paid_run', 'provider_call', 'model_call'],
        },
        allowedActions: [
          { actionId: 'read_foundation_hub', kind: 'read_live_api', enabled: true, readOnly: true, approvalRequired: false },
          { actionId: 'read_system_health', kind: 'read_live_api', enabled: true, readOnly: true, approvalRequired: false },
          { actionId: 'send_agent_feedback', kind: 'external_send', enabled: false, readOnly: false, approvalRequired: true },
        ],
        fallbackBehavior: 'Say blocked or last-known when source/tool proof is missing.',
      },
      {
        agentId: 'crewbert-foundation',
        capabilityId: 'repo-status-read',
        title: 'Read local repo status before builder claims',
        status: 'declared',
        posture: 'read_only',
        claimOnly: false,
        tools: [
          { toolId: 'git-status', kind: 'local_command', command: 'git status --short --branch', access: 'read', approvalRequired: false },
        ],
        sourceRefs: [
          { kind: 'local_command', ref: 'git status --short --branch', role: 'repo-truth' },
          { kind: 'system', ref: 'SYS-AGENTS-001', role: 'agent-system-boundary' },
        ],
        modelRoute: {
          routeId: 'foundation-agent-answer:adapter-owned',
          providerPolicy: 'adapter_only',
          modelCallsEnabled: false,
        },
        logging: {
          eventLog: 'foundation_agent_capability_events',
          transcriptPolicy: 'operator_visible',
          proofRequired: true,
        },
        approvalBoundary: {
          defaultDecision: 'allow_read_only',
          externalWrites: 'blocked_without_explicit_approval',
          approvalRequiredFor: ['external_write', 'provider_call', 'model_call'],
        },
        allowedActions: [
          { actionId: 'read_git_status', kind: 'read_local_command', enabled: true, readOnly: true, approvalRequired: false },
        ],
        fallbackBehavior: 'Report unable to verify repo status when local command proof is missing.',
      },
    ],
    claims: [
      {
        claimId: 'harlan-can-read-foundation-status',
        agentId: 'harlan-pilot',
        capabilityId: 'foundation-status-read',
        actionId: 'read_foundation_hub',
        claimLabel: 'can_execute',
      },
      {
        claimId: 'crewbert-can-read-repo-status',
        agentId: 'crewbert-foundation',
        capabilityId: 'repo-status-read',
        actionId: 'read_git_status',
        claimLabel: 'can_execute',
      },
      {
        claimId: 'harlan-agent-feedback-send-blocked',
        agentId: 'harlan-pilot',
        capabilityId: 'foundation-status-read',
        actionId: 'send_agent_feedback',
        claimLabel: 'blocked',
        blockedReason: 'External sends require explicit approval and are disabled in V1.',
      },
    ],
    notNextBoundaries: AGENT_CAPABILITY_REGISTRY_NOT_NEXT_BOUNDARIES,
    ...overrides,
  }
}

export function evaluateAgentCapabilityRegistry(registry = buildAgentCapabilityRegistry()) {
  const violations = []
  const capabilities = list(registry.capabilities)

  if (registry.ownerLayer !== 'Foundation') addViolation(violations, registry.cardId, 'foundation_owner_required', registry.ownerLayer || 'missing')
  if (registry.readOnlyRegistry !== true) addViolation(violations, registry.cardId, 'read_only_registry_required', String(registry.readOnlyRegistry))
  if (registry.liveAgentRuntimeStarted === true) addViolation(violations, registry.cardId, 'runtime_launch_blocked', 'registry card cannot launch agent runtime')
  if (registry.extractionStarted === true) addViolation(violations, registry.cardId, 'live_extraction_blocked', 'live extraction is not approved')
  if (registry.modelCallsStarted === true) addViolation(violations, registry.cardId, 'model_call_blocked', 'model/provider calls are not approved')
  if (registry.externalWritesStarted === true) addViolation(violations, registry.cardId, 'external_write_blocked', 'external writes are not approved')
  if (registry.hiddenSubagentsSpawned === true) addViolation(violations, registry.cardId, 'hidden_subagent_blocked', 'hidden workers require explicit approval')
  if (!list(registry.agents).length) addViolation(violations, registry.cardId, 'agent_rows_required', 'at least one agent row is required')
  if (!capabilities.length) addViolation(violations, registry.cardId, 'capability_rows_required', 'at least one capability row is required')

  for (const agent of list(registry.agents)) {
    for (const field of ['agentId', 'displayName', 'role', 'owner', 'purpose', 'status', 'permissionTier', 'liveAnswerPreflightRef', 'statusFreshnessRef']) {
      if (!text(agent[field])) addViolation(violations, agent.agentId, 'agent_field_required', field)
    }
  }

  for (const capability of capabilities) {
    const subject = `${capability.agentId || 'missing-agent'}:${capability.capabilityId || 'missing-capability'}`
    if (!findAgent(registry, capability.agentId)) addViolation(violations, subject, 'known_agent_required', capability.agentId || 'missing')
    for (const field of ['agentId', 'capabilityId', 'title', 'status', 'posture', 'fallbackBehavior']) {
      if (!text(capability[field])) addViolation(violations, subject, 'capability_field_required', field)
    }
    if (capability.status !== 'declared') addViolation(violations, subject, 'declared_status_required', capability.status || 'missing')
    if (capability.claimOnly === true) addViolation(violations, subject, 'claim_only_capability_rejected', 'registry proof must declare executable boundaries')
    if (!list(capability.tools).length) addViolation(violations, subject, 'tool_declaration_required', 'capability needs tool rows')
    if (!list(capability.sourceRefs).length) addViolation(violations, subject, 'source_ref_required', 'capability needs source/system refs')
    if (!text(capability.modelRoute?.routeId) || !text(capability.modelRoute?.providerPolicy)) addViolation(violations, subject, 'model_route_required', 'capability needs model route policy')
    if (capability.modelRoute?.modelCallsEnabled === true) addViolation(violations, subject, 'model_call_enablement_blocked', 'registry card cannot enable live model calls')
    if (!text(capability.logging?.eventLog) || !text(capability.logging?.transcriptPolicy) || capability.logging?.proofRequired !== true) addViolation(violations, subject, 'logging_policy_required', 'capability needs visible logging policy')
    if (!text(capability.approvalBoundary?.defaultDecision) || !list(capability.approvalBoundary?.approvalRequiredFor).length) addViolation(violations, subject, 'approval_boundary_required', 'capability needs approval boundary')

    for (const tool of list(capability.tools)) {
      if (!text(tool.toolId) || !text(tool.kind) || !text(tool.access)) addViolation(violations, subject, 'tool_fields_required', tool.toolId || 'missing tool')
      if (tool.access !== 'read' && tool.approvalRequired !== true) addViolation(violations, subject, 'tool_write_requires_approval', tool.toolId || 'missing tool')
    }
    for (const action of list(capability.allowedActions)) {
      if (!text(action.actionId) || !text(action.kind)) addViolation(violations, subject, 'action_fields_required', action.actionId || 'missing action')
      if (isMutatingAction(action) && (action.enabled !== false || action.approvalRequired !== true)) addViolation(violations, subject, 'mutating_action_disabled_by_default_required', action.actionId || action.kind)
    }
  }

  for (const claim of list(registry.claims)) {
    const capability = findCapability(registry, claim.agentId, claim.capabilityId)
    const action = capability ? findAction(capability, claim.actionId) : null
    if (!text(claim.claimId) || !text(claim.agentId) || !text(claim.capabilityId) || !text(claim.actionId)) addViolation(violations, claim.claimId, 'claim_fields_required', 'claim needs agent, capability, and action')
    if (!capability) addViolation(violations, claim.claimId, 'declared_capability_required_for_claim', `${claim.agentId || 'missing'}:${claim.capabilityId || 'missing'}`)
    if (capability && !action) addViolation(violations, claim.claimId, 'declared_action_required_for_claim', claim.actionId || 'missing')
    if (capability?.status !== 'declared' || capability?.claimOnly === true) addViolation(violations, claim.claimId, 'claim_requires_declared_capability', claim.capabilityId || 'missing')
    if (action && action.enabled === false && claim.claimLabel !== 'blocked') addViolation(violations, claim.claimId, 'disabled_action_claim_must_be_blocked', claim.actionId)
    if (action && isMutatingAction(action) && claim.claimLabel === 'can_execute') addViolation(violations, claim.claimId, 'side_effect_claim_requires_approval', claim.actionId)
    if (claim.claimLabel === 'blocked' && !text(claim.blockedReason)) addViolation(violations, claim.claimId, 'blocked_claim_reason_required', claim.actionId || 'missing')
  }

  return {
    ok: violations.length === 0,
    status: violations.length ? 'blocked' : 'ready',
    cardId: registry.cardId,
    closeoutKey: registry.closeoutKey,
    violations,
    summary: {
      agentCount: list(registry.agents).length,
      capabilityCount: capabilities.length,
      claimCount: list(registry.claims).length,
      violationCount: violations.length,
    },
  }
}

export function buildAgentCapabilityRegistryDogfoodProof() {
  const healthyRegistry = buildAgentCapabilityRegistry()
  const healthy = evaluateAgentCapabilityRegistry(healthyRegistry)

  const missingTools = clone(healthyRegistry)
  missingTools.capabilities[0].tools = []

  const missingSourceRefs = clone(healthyRegistry)
  missingSourceRefs.capabilities[0].sourceRefs = []

  const missingModelRoute = clone(healthyRegistry)
  missingModelRoute.capabilities[0].modelRoute = {}

  const missingLogging = clone(healthyRegistry)
  missingLogging.capabilities[0].logging = {}

  const claimOnlyCapability = clone(healthyRegistry)
  claimOnlyCapability.capabilities[0].claimOnly = true

  const undeclaredCapabilityClaim = clone(healthyRegistry)
  undeclaredCapabilityClaim.claims.push({
    claimId: 'unknown-capability-claim',
    agentId: 'harlan-pilot',
    capabilityId: 'send-gmail-live',
    actionId: 'send_gmail',
    claimLabel: 'can_execute',
  })

  const unapprovedWriteClaim = clone(healthyRegistry)
  unapprovedWriteClaim.claims[2] = {
    ...unapprovedWriteClaim.claims[2],
    claimId: 'write-claim-without-approval',
    claimLabel: 'can_execute',
  }

  const liveSideEffectAttempt = evaluateAgentCapabilityRegistry(buildAgentCapabilityRegistry({
    liveAgentRuntimeStarted: true,
    extractionStarted: true,
    modelCallsStarted: true,
    externalWritesStarted: true,
    hiddenSubagentsSpawned: true,
  }))

  const results = {
    missingTools: evaluateAgentCapabilityRegistry(missingTools),
    missingSourceRefs: evaluateAgentCapabilityRegistry(missingSourceRefs),
    missingModelRoute: evaluateAgentCapabilityRegistry(missingModelRoute),
    missingLogging: evaluateAgentCapabilityRegistry(missingLogging),
    claimOnlyCapability: evaluateAgentCapabilityRegistry(claimOnlyCapability),
    undeclaredCapabilityClaim: evaluateAgentCapabilityRegistry(undeclaredCapabilityClaim),
    unapprovedWriteClaim: evaluateAgentCapabilityRegistry(unapprovedWriteClaim),
    liveSideEffectAttempt,
  }

  return {
    ok: healthy.ok === true &&
      Object.values(results).every(result => result.ok === false),
    invariant: 'Declared read-only capabilities pass; missing tools, source refs, model route, logging, claim-only capabilities, unknown capability claims, unapproved side-effect claims, and runtime side effects fail closed.',
    healthy,
    missingToolsRejected: results.missingTools.ok === false,
    missingSourceRefsRejected: results.missingSourceRefs.ok === false,
    missingModelRouteRejected: results.missingModelRoute.ok === false,
    missingLoggingRejected: results.missingLogging.ok === false,
    claimOnlyCapabilityRejected: results.claimOnlyCapability.ok === false,
    undeclaredCapabilityClaimRejected: results.undeclaredCapabilityClaim.ok === false,
    unapprovedWriteClaimRejected: results.unapprovedWriteClaim.ok === false,
    liveSideEffectAttemptRejected: liveSideEffectAttempt.ok === false,
  }
}
