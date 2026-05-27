export const FOUNDATION_UP_CAPABILITY_REGISTRY_CARD_ID = 'FOUNDATION-UP-CAPABILITY-REGISTRY-001'
export const FOUNDATION_UP_CAPABILITY_REGISTRY_CLOSEOUT_KEY = 'foundation-up-capability-registry-v1'
export const FOUNDATION_UP_CAPABILITY_REGISTRY_PLAN_PATH = 'docs/process/foundation-up-capability-registry-001-plan.md'
export const FOUNDATION_UP_CAPABILITY_REGISTRY_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-UP-CAPABILITY-REGISTRY-001.json'
export const FOUNDATION_UP_CAPABILITY_REGISTRY_SCRIPT_PATH = 'scripts/process-foundation-up-capability-registry-check.mjs'
export const FOUNDATION_UP_CAPABILITY_REGISTRY_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-27-hot-doc-cleanup/2026-05-18-foundation-up-capability-registry-closeout.md'
export const FOUNDATION_UP_CAPABILITY_REGISTRY_SPRINT_ID = 'foundation-up-capability-registry-2026-05-18'
export const FOUNDATION_UP_CAPABILITY_REGISTRY_NEXT_CARD_ID = 'MEMORY-002'

export const FOUNDATION_UP_CAPABILITY_REGISTRY_CHANGED_FILES = [
  'lib/foundation-up-capability-registry.js',
  'scripts/process-foundation-up-capability-registry-check.mjs',
  'scripts/foundation-verify.mjs',
  'lib/foundation-runtime-reliability-verifier.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'lib/foundation-build-closeout-agent-runtime-records.js',
  FOUNDATION_UP_CAPABILITY_REGISTRY_PLAN_PATH,
  FOUNDATION_UP_CAPABILITY_REGISTRY_APPROVAL_PATH,
  FOUNDATION_UP_CAPABILITY_REGISTRY_CLOSEOUT_PATH,
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'package.json',
]

export const FOUNDATION_UP_CAPABILITY_REGISTRY_PROOF_COMMANDS = [
  'node --check lib/foundation-up-capability-registry.js lib/foundation-runtime-reliability-verifier.js scripts/process-foundation-up-capability-registry-check.mjs scripts/foundation-verify.mjs',
  'npm run process:foundation-up-capability-registry-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=FOUNDATION-UP-CAPABILITY-REGISTRY-001 --planApprovalRef=docs/process/approvals/FOUNDATION-UP-CAPABILITY-REGISTRY-001.json --closeoutKey=foundation-up-capability-registry-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=FOUNDATION-UP-CAPABILITY-REGISTRY-001 --closeoutKey=foundation-up-capability-registry-v1',
  'npm run process:foundation-ship -- --card=FOUNDATION-UP-CAPABILITY-REGISTRY-001 --planApprovalRef=docs/process/approvals/FOUNDATION-UP-CAPABILITY-REGISTRY-001.json --closeoutKey=foundation-up-capability-registry-v1 --commitRef=HEAD',
]

export const FOUNDATION_UP_CAPABILITY_REGISTRY_NOT_NEXT_BOUNDARIES = [
  'Do not call Fal, ElevenLabs, Canva write/export/upload/design APIs, OpenAI, Anthropic, Gemini, or other providers.',
  'Do not spend provider credits or run paid/model/media generation.',
  'Do not launch terminal workers, hidden subagents, invisible workers, or parallel builders.',
  'Do not grant Harlan, Crewbert, role assistants, or extraction workers new runtime authority.',
  'Do not mutate Drive/Gmail/ClickUp/Slack/Agent Feedback/Canva/external systems.',
  'Do not run MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.',
  'Do not run live extraction, source crawls, transcript fetches, screenshots/keyframes, downloads, summarization, vision, or model calls.',
  'Do not store or print secret values.',
]

const REQUIRED_FIELDS = [
  'capabilityId',
  'provider',
  'toolKind',
  'owner',
  'permissionClass',
  'costPolicy',
  'auditLog',
  'callablePath',
  'proofCommand',
  'approvalBoundary',
]

const METERED_PERMISSION_CLASSES = new Set([
  'paid_provider_metered',
  'provider_model_or_media_generation',
  'external_write_or_export',
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

function violation(violations, subject, ruleId, detail = '') {
  violations.push({ subject: subject || 'foundation-up-capability-registry', ruleId, detail })
}

function hasSecretValue(value) {
  return /sk-|key-|secret|token-|[A-Za-z0-9+/]{32,}={0,2}/.test(String(value || '')) &&
    !String(value || '').startsWith('env:')
}

function buildCapability(overrides = {}) {
  return {
    status: 'registered_blocked',
    runtimeUseApprovedByThisCard: false,
    agentUseApprovedByThisCard: false,
    hiddenWorkerAllowed: false,
    externalMutationApproved: false,
    secretValuesStored: false,
    ...overrides,
  }
}

export function buildFoundationUpCapabilityRegistry(overrides = {}) {
  return {
    cardId: FOUNDATION_UP_CAPABILITY_REGISTRY_CARD_ID,
    closeoutKey: FOUNDATION_UP_CAPABILITY_REGISTRY_CLOSEOUT_KEY,
    ownerLayer: 'Foundation',
    registryVersion: 1,
    defaultDecision: 'fail_closed_until_registered_and_approved',
    agentUseDefault: 'blocked_until_agent_capability_binding',
    liveProviderCallsStarted: false,
    paidSpendStarted: false,
    externalWritesStarted: false,
    terminalWorkersLaunched: false,
    hiddenSubagentsSpawned: false,
    secretValuesPrintedOrStored: false,
    capabilities: [
      buildCapability({
        capabilityId: 'fal-image-generation',
        provider: 'Fal',
        toolKind: 'media_generation_provider',
        owner: 'Foundation / Steve approval required',
        permissionClass: 'paid_provider_metered',
        envRefs: ['env:FAL_KEY'],
        costPolicy: { mode: 'metered_blocked_until_approval', maxCostUsdPerRun: 0, budgetOwner: 'Steve' },
        auditLog: { eventTable: 'foundation_capability_events', transcriptRequired: true, costLogged: true },
        callablePath: 'future:scripts/fal-image-iteration.mjs',
        proofCommand: 'future mock/live-separated proof; no provider call in this card',
        approvalBoundary: {
          requiredBeforeUse: ['explicit card approval', 'budget cap', 'input/output artifact path', 'operator review', 'rollback/delete path'],
          approvedNow: false,
        },
        allowedCallModes: ['mock_only_until_approved'],
      }),
      buildCapability({
        capabilityId: 'elevenlabs-voice',
        provider: 'ElevenLabs',
        toolKind: 'voice_generation_provider',
        owner: 'Foundation / Steve approval required',
        permissionClass: 'paid_provider_metered',
        envRefs: ['env:ELEVENLABS_API_KEY'],
        costPolicy: { mode: 'metered_blocked_until_approval', maxCostUsdPerRun: 0, budgetOwner: 'Steve' },
        auditLog: { eventTable: 'foundation_capability_events', transcriptRequired: true, costLogged: true },
        callablePath: 'future:scripts/voice-storytime.mjs',
        proofCommand: 'future mock/live-separated proof; no provider call in this card',
        approvalBoundary: {
          requiredBeforeUse: ['explicit card approval', 'voice/clone rights', 'budget cap', 'output path', 'operator review'],
          approvedNow: false,
        },
        allowedCallModes: ['mock_only_until_approved'],
      }),
      buildCapability({
        capabilityId: 'canva-read-metadata',
        provider: 'Canva',
        toolKind: 'design_platform_api',
        owner: 'Foundation / Marketing source owner',
        permissionClass: 'read_only_connector',
        envRefs: ['env:CANVA_CLIENT_ID', 'env:CANVA_CLIENT_SECRET', 'env:CANVA_REFRESH_TOKEN'],
        costPolicy: { mode: 'no_metered_generation', maxCostUsdPerRun: 0, budgetOwner: 'Foundation' },
        auditLog: { eventTable: 'foundation_capability_events', transcriptRequired: true, costLogged: false },
        callablePath: 'lib/canva-client.js',
        proofCommand: 'npm run process:canva-client-check -- --json',
        approvalBoundary: {
          requiredBeforeUse: ['agent binding approval', 'read scope confirmation', 'rotation-safe token handling'],
          approvedNow: false,
          readPrimitiveExists: 'canva-client-v1',
        },
        allowedCallModes: ['registered_read_only_after_agent_binding'],
      }),
      buildCapability({
        capabilityId: 'terminal-worker-local',
        provider: 'Local terminal',
        toolKind: 'local_shell_worker',
        owner: 'Foundation builder/orchestrator',
        permissionClass: 'local_execution_guarded',
        envRefs: [],
        localOnly: true,
        costPolicy: { mode: 'local_machine_time', maxCostUsdPerRun: 0, budgetOwner: 'Foundation' },
        auditLog: { eventTable: 'foundation_capability_events', transcriptRequired: true, commandLogRequired: true },
        callablePath: 'future:scripts/foundation-terminal-worker.mjs',
        proofCommand: 'future dry-run proof; no worker launch in this card',
        approvalBoundary: {
          requiredBeforeUse: ['visible chat/worktree/branch owner', 'allowed command list', 'denied destructive command list', 'wrap report'],
          approvedNow: false,
        },
        allowedCommands: ['git status --short --branch', 'rg <pattern>', 'node --check <file>'],
        deniedCommands: ['rm -rf', 'git reset --hard', 'git checkout --', 'curl | sh'],
        allowedCallModes: ['dry_run_only_until_approved'],
      }),
    ],
    agentBindings: [
      { agentId: 'harlan-pilot', capabilityId: 'fal-image-generation', status: 'blocked_pending_foundation_up_approval' },
      { agentId: 'harlan-pilot', capabilityId: 'elevenlabs-voice', status: 'blocked_pending_foundation_up_approval' },
      { agentId: 'crewbert-foundation', capabilityId: 'terminal-worker-local', status: 'blocked_pending_visible_worker_approval' },
      { agentId: 'marketing-assistant-future', capabilityId: 'canva-read-metadata', status: 'blocked_pending_agent_binding_approval' },
    ],
    notNextBoundaries: FOUNDATION_UP_CAPABILITY_REGISTRY_NOT_NEXT_BOUNDARIES,
    ...overrides,
  }
}

function evaluateCapability(capability, violations) {
  const subject = capability.capabilityId || 'missing-capability'
  for (const field of REQUIRED_FIELDS) {
    if (field === 'costPolicy' || field === 'auditLog' || field === 'approvalBoundary') {
      if (!capability[field] || typeof capability[field] !== 'object') violation(violations, subject, `${field}_required`, field)
    } else if (!text(capability[field])) {
      violation(violations, subject, `${field}_required`, field)
    }
  }
  if (!list(capability.envRefs).length && capability.localOnly !== true) violation(violations, subject, 'env_ref_required', 'provider capabilities must name env refs without values')
  for (const envRef of list(capability.envRefs)) {
    if (!String(envRef).startsWith('env:')) violation(violations, subject, 'env_ref_must_be_named_reference', envRef)
    if (hasSecretValue(envRef)) violation(violations, subject, 'secret_value_forbidden', 'env refs must not contain secret values')
  }
  if (hasSecretValue(capability.callablePath) || hasSecretValue(capability.proofCommand)) violation(violations, subject, 'secret_value_forbidden', 'callable/proof fields must not contain secrets')
  if (!text(capability.costPolicy?.mode)) violation(violations, subject, 'cost_policy_mode_required', 'missing cost mode')
  if (capability.costPolicy?.maxCostUsdPerRun === undefined) violation(violations, subject, 'cost_cap_required', 'missing maxCostUsdPerRun')
  if (!text(capability.auditLog?.eventTable)) violation(violations, subject, 'audit_event_table_required', 'missing event table')
  if (capability.auditLog?.transcriptRequired !== true) violation(violations, subject, 'audit_transcript_required', 'transcript/log proof is required')
  if (capability.approvalBoundary?.approvedNow === true || capability.runtimeUseApprovedByThisCard === true || capability.agentUseApprovedByThisCard === true) violation(violations, subject, 'runtime_use_not_approved_by_registry', 'registry records capability but does not approve use')
  if (capability.hiddenWorkerAllowed === true) violation(violations, subject, 'hidden_worker_forbidden', 'hidden workers are not a Foundation-up default')
  if (capability.externalMutationApproved === true) violation(violations, subject, 'external_mutation_forbidden', 'external mutation needs a separate approval')
  if (capability.secretValuesStored === true) violation(violations, subject, 'secret_storage_forbidden', 'registry stores references only')
  if (METERED_PERMISSION_CLASSES.has(capability.permissionClass) && Number(capability.costPolicy?.maxCostUsdPerRun || 0) > 0 && capability.runtimeUseApprovedByThisCard !== true) {
    violation(violations, subject, 'metered_budget_requires_runtime_approval', String(capability.costPolicy.maxCostUsdPerRun))
  }
  if (capability.capabilityId === 'terminal-worker-local') {
    const denied = list(capability.deniedCommands).join('\n')
    for (const required of ['rm -rf', 'git reset --hard', 'git checkout --']) {
      if (!denied.includes(required)) violation(violations, subject, 'terminal_denied_command_required', required)
    }
    if (list(capability.allowedCommands).some(command => /rm -rf|git reset --hard|git checkout --|curl \| sh/.test(command))) {
      violation(violations, subject, 'destructive_command_allowed', 'terminal worker allowlist includes destructive command')
    }
  }
}

export function evaluateFoundationUpCapabilityRegistry(registry = buildFoundationUpCapabilityRegistry()) {
  const violations = []
  if (registry.ownerLayer !== 'Foundation') violation(violations, registry.cardId, 'foundation_owner_required', registry.ownerLayer || 'missing')
  if (registry.defaultDecision !== 'fail_closed_until_registered_and_approved') violation(violations, registry.cardId, 'fail_closed_default_required', registry.defaultDecision || 'missing')
  if (registry.liveProviderCallsStarted === true) violation(violations, registry.cardId, 'live_provider_call_blocked', 'provider calls are not approved')
  if (registry.paidSpendStarted === true) violation(violations, registry.cardId, 'paid_spend_blocked', 'paid spend is not approved')
  if (registry.externalWritesStarted === true) violation(violations, registry.cardId, 'external_write_blocked', 'external writes are not approved')
  if (registry.terminalWorkersLaunched === true) violation(violations, registry.cardId, 'terminal_worker_launch_blocked', 'worker launch is not approved')
  if (registry.hiddenSubagentsSpawned === true) violation(violations, registry.cardId, 'hidden_subagent_blocked', 'hidden workers are forbidden by default')
  if (registry.secretValuesPrintedOrStored === true) violation(violations, registry.cardId, 'secret_exposure_blocked', 'secret values cannot be printed or stored')
  const capabilities = list(registry.capabilities)
  if (capabilities.length < 4) violation(violations, registry.cardId, 'required_capability_count', `${capabilities.length}/4`)
  for (const capabilityId of ['fal-image-generation', 'elevenlabs-voice', 'canva-read-metadata', 'terminal-worker-local']) {
    if (!capabilities.some(capability => capability.capabilityId === capabilityId)) violation(violations, registry.cardId, 'required_capability_missing', capabilityId)
  }
  for (const capability of capabilities) evaluateCapability(capability, violations)
  for (const binding of list(registry.agentBindings)) {
    if (!capabilities.some(capability => capability.capabilityId === binding.capabilityId)) violation(violations, binding.agentId, 'binding_capability_registered_required', binding.capabilityId || 'missing')
    if (!String(binding.status || '').startsWith('blocked_')) violation(violations, binding.agentId, 'agent_binding_blocked_required', binding.status || 'missing')
  }
  return {
    ok: violations.length === 0,
    status: violations.length === 0 ? 'ready' : 'blocked',
    violations,
    summary: {
      capabilityCount: capabilities.length,
      providerCount: new Set(capabilities.map(capability => capability.provider)).size,
      meteredCapabilityCount: capabilities.filter(capability => METERED_PERMISSION_CLASSES.has(capability.permissionClass)).length,
      blockedBindingCount: list(registry.agentBindings).filter(binding => String(binding.status || '').startsWith('blocked_')).length,
      hiddenWorkerCount: capabilities.filter(capability => capability.hiddenWorkerAllowed === true).length + (registry.hiddenSubagentsSpawned === true ? 1 : 0),
      liveSideEffectCount: [
        registry.liveProviderCallsStarted,
        registry.paidSpendStarted,
        registry.externalWritesStarted,
        registry.terminalWorkersLaunched,
        registry.hiddenSubagentsSpawned,
        registry.secretValuesPrintedOrStored,
      ].filter(Boolean).length,
    },
  }
}

export function buildFoundationUpCapabilityRegistryDogfoodProof() {
  const healthy = buildFoundationUpCapabilityRegistry()
  const missingEnv = buildFoundationUpCapabilityRegistry({
    capabilities: clone(healthy.capabilities).map(capability =>
      capability.capabilityId === 'fal-image-generation' ? { ...capability, envRefs: [] } : capability
    ),
  })
  const missingAudit = buildFoundationUpCapabilityRegistry({
    capabilities: clone(healthy.capabilities).map(capability =>
      capability.capabilityId === 'elevenlabs-voice' ? { ...capability, auditLog: null } : capability
    ),
  })
  const providerApprovedTooEarly = buildFoundationUpCapabilityRegistry({
    capabilities: clone(healthy.capabilities).map(capability =>
      capability.capabilityId === 'fal-image-generation' ? { ...capability, runtimeUseApprovedByThisCard: true } : capability
    ),
  })
  const hiddenWorker = buildFoundationUpCapabilityRegistry({
    hiddenSubagentsSpawned: true,
    capabilities: clone(healthy.capabilities).map(capability =>
      capability.capabilityId === 'terminal-worker-local' ? { ...capability, hiddenWorkerAllowed: true } : capability
    ),
  })
  const destructiveTerminal = buildFoundationUpCapabilityRegistry({
    capabilities: clone(healthy.capabilities).map(capability =>
      capability.capabilityId === 'terminal-worker-local' ? { ...capability, allowedCommands: ['rm -rf /tmp/build'] } : capability
    ),
  })
  const sideEffects = buildFoundationUpCapabilityRegistry({
    liveProviderCallsStarted: true,
    paidSpendStarted: true,
    externalWritesStarted: true,
  })
  const secretLeak = buildFoundationUpCapabilityRegistry({
    capabilities: clone(healthy.capabilities).map(capability =>
      capability.capabilityId === 'canva-read-metadata' ? { ...capability, envRefs: ['sk-live-secret-value-not-allowed'] } : capability
    ),
  })
  const cases = {
    healthy: evaluateFoundationUpCapabilityRegistry(healthy).ok === true,
    missingEnvRejected: evaluateFoundationUpCapabilityRegistry(missingEnv).ok === false,
    missingAuditRejected: evaluateFoundationUpCapabilityRegistry(missingAudit).ok === false,
    providerApprovedTooEarlyRejected: evaluateFoundationUpCapabilityRegistry(providerApprovedTooEarly).ok === false,
    hiddenWorkerRejected: evaluateFoundationUpCapabilityRegistry(hiddenWorker).ok === false,
    destructiveTerminalRejected: evaluateFoundationUpCapabilityRegistry(destructiveTerminal).ok === false,
    sideEffectsRejected: evaluateFoundationUpCapabilityRegistry(sideEffects).ok === false,
    secretLeakRejected: evaluateFoundationUpCapabilityRegistry(secretLeak).ok === false,
  }
  return {
    ok: Object.values(cases).every(Boolean),
    cases,
    invariant: 'Provider/tool capability rows are Foundation-up registration only; provider calls, paid spend, terminal workers, hidden workers, external writes, and secret values fail closed.',
  }
}

export function renderFoundationUpCapabilityRegistryReport(registry = buildFoundationUpCapabilityRegistry()) {
  const status = evaluateFoundationUpCapabilityRegistry(registry)
  const lines = []
  lines.push(`# ${FOUNDATION_UP_CAPABILITY_REGISTRY_CARD_ID}`)
  lines.push('')
  lines.push(`Status: ${status.status}`)
  lines.push(`Capabilities: ${status.summary.capabilityCount}`)
  lines.push(`Providers/tools: ${status.summary.providerCount}`)
  lines.push(`Metered capabilities: ${status.summary.meteredCapabilityCount}`)
  lines.push(`Blocked agent bindings: ${status.summary.blockedBindingCount}`)
  lines.push('')
  lines.push('Registered: Fal image generation, ElevenLabs voice, Canva read metadata, terminal worker local.')
  lines.push('Not approved: provider calls, paid spend, external writes, terminal worker launch, hidden subagents, agent use, or secret storage.')
  return lines.join('\n')
}
