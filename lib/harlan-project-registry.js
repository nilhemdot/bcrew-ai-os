export const HARLAN_PROJECT_REGISTRY_CARD_ID = 'HARLAN-PROJECT-REGISTRY-001'
export const HARLAN_PROJECT_REGISTRY_SYSTEM_CARD_ID = 'SYSTEM-011'
export const HARLAN_PROJECT_REGISTRY_CLOSEOUT_KEY = 'harlan-project-registry-v1'
export const HARLAN_PROJECT_REGISTRY_PLAN_PATH = 'docs/process/harlan-project-registry-001-plan.md'
export const HARLAN_PROJECT_REGISTRY_APPROVAL_PATH = 'docs/process/approvals/HARLAN-PROJECT-REGISTRY-001.json'
export const HARLAN_PROJECT_REGISTRY_SCRIPT_PATH = 'scripts/process-harlan-project-registry-check.mjs'
export const HARLAN_PROJECT_REGISTRY_DOC_PATH = 'docs/agents/harlan-project-registry.md'
export const HARLAN_PROJECT_REGISTRY_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-harlan-project-registry-closeout.md'
export const HARLAN_PROJECT_REGISTRY_SPRINT_ID = 'harlan-project-registry-2026-05-18'
export const HARLAN_PROJECT_REGISTRY_NEXT_CARD_ID = 'HARLAN-OPERATOR-LOOP-V1-001'

export const HARLAN_PROJECT_REGISTRY_REQUIRED_SYSTEM_KEYS = [
  'bcrew-ai-os',
  'foundation-dashboard-api',
  'old-bcrew-buddy-reference',
  'google-workspace-delegated',
  'future-harlan-home',
]

export const HARLAN_PROJECT_REGISTRY_CHANGED_FILES = [
  'lib/harlan-project-registry.js',
  'scripts/process-harlan-project-registry-check.mjs',
  'docs/agents/harlan-project-registry.md',
  'docs/agents/harlan.md',
  'docs/rebuild/agent-architecture.md',
  'lib/foundation-runtime-reliability-verifier.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'scripts/foundation-verify.mjs',
  'lib/foundation-build-closeout-agent-runtime-records.js',
  'docs/process/harlan-project-registry-001-plan.md',
  'docs/process/approvals/HARLAN-PROJECT-REGISTRY-001.json',
  'docs/handoffs/2026-05-18-harlan-project-registry-closeout.md',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'package.json',
]

export const HARLAN_PROJECT_REGISTRY_PROOF_COMMANDS = [
  'node --check lib/harlan-project-registry.js lib/foundation-runtime-reliability-verifier.js scripts/process-harlan-project-registry-check.mjs scripts/foundation-verify.mjs',
  'npm run process:harlan-project-registry-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=HARLAN-PROJECT-REGISTRY-001 --planApprovalRef=docs/process/approvals/HARLAN-PROJECT-REGISTRY-001.json --closeoutKey=harlan-project-registry-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=HARLAN-PROJECT-REGISTRY-001 --closeoutKey=harlan-project-registry-v1',
  'npm run process:foundation-ship -- --card=HARLAN-PROJECT-REGISTRY-001 --planApprovalRef=docs/process/approvals/HARLAN-PROJECT-REGISTRY-001.json --closeoutKey=harlan-project-registry-v1 --commitRef=HEAD',
]

export const HARLAN_PROJECT_REGISTRY_NOT_NEXT_BOUNDARIES = [
  'Do not build Harlan UI or feature work.',
  'Do not launch live agent runtime work.',
  'Do not run live extraction.',
  'Do not call providers or models.',
  'Do not send Gmail, ClickUp, Drive, Slack, Telegram, or Agent Feedback mutations.',
  'Do not mutate Google Drive permissions.',
  'Do not work MEETING-VAULT-ACL-001 Phase B or historical Meeting Vault cleanup.',
  'Do not create or move the external Harlan home in this card.',
  'Do not grant new project reach or external-write authority.',
  'Do not copy secrets, tokens, or raw private profile values into repo truth.',
  'Do not launch hidden subagents or parallel builders.',
]

const MUTATING_ACTION_KINDS = new Set([
  'repo_write',
  'external_send',
  'external_write',
  'drive_mutation',
  'live_extraction',
  'provider_call',
  'model_call',
  'credential_change',
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
  violations.push({ subject: subject || 'harlan-project-registry', ruleId, detail })
}

function mutates(action = {}) {
  return MUTATING_ACTION_KINDS.has(text(action.kind)) || action.writeEnabled === true || action.externalWrite === true
}

function registryEntry(overrides = {}) {
  return {
    status: 'read_only_registered',
    authMode: 'local_or_existing_session',
    allowedReads: [],
    allowedWrites: [],
    approvalBoundaries: ['external_send', 'external_write', 'drive_mutation', 'live_extraction', 'provider_call', 'model_call', 'credential_change'],
    escalationOwner: 'Foundation',
    sourceContracts: [],
    unknownSystemPolicy: 'blocked_until_registered',
    ...overrides,
  }
}

export function buildHarlanProjectRegistry(overrides = {}) {
  return {
    cardId: HARLAN_PROJECT_REGISTRY_CARD_ID,
    systemCardId: HARLAN_PROJECT_REGISTRY_SYSTEM_CARD_ID,
    closeoutKey: HARLAN_PROJECT_REGISTRY_CLOSEOUT_KEY,
    ownerLayer: 'Foundation',
    registryVersion: 1,
    registryOnly: true,
    liveAgentRuntimeStarted: false,
    extractionStarted: false,
    modelCallsStarted: false,
    externalWritesStarted: false,
    hiddenSubagentsSpawned: false,
    grantsNewAuthority: false,
    prerequisites: [
      { cardId: 'ROLE-ASSISTANT-CONTRACTS-001', closeoutKey: 'role-assistant-contracts-v1' },
      { cardId: 'AGENT-010', closeoutKey: 'personal-agent-onboarding-contract-v1' },
      { cardId: 'AGENT-CAPABILITY-REGISTRY-001', closeoutKey: 'agent-capability-registry-v1' },
      { cardId: 'AGENT-TEMPLATE-RUNTIME-CONTRACT-001', closeoutKey: 'agent-template-runtime-contract-v1' },
    ],
    systems: [
      registryEntry({
        systemKey: 'bcrew-ai-os',
        label: 'BCrew AI OS repo',
        systemType: 'repo',
        owner: 'Foundation',
        localPath: '/Users/bensoncrew/bcrew-ai-os',
        repoUrl: 'https://github.com/BensonCrewAI/bcrew-ai-os',
        allowedReads: [
          { actionId: 'read_foundation_docs', kind: 'repo_read', approvalRequired: false },
          { actionId: 'read_current_sprint_from_repo_context', kind: 'repo_read', approvalRequired: false },
        ],
        allowedWrites: [
          { actionId: 'propose_repo_change', kind: 'repo_write', approvalRequired: true, writeEnabled: false },
        ],
        sourceContracts: ['foundation-backlog', 'foundation-current-sprint', 'foundation-build-log'],
        escalationOwner: 'Foundation builder',
        capabilityStatus: 'read_only_now_write_requires_builder_card',
      }),
      registryEntry({
        systemKey: 'foundation-dashboard-api',
        label: 'Foundation dashboard/API',
        systemType: 'local_api',
        owner: 'Foundation',
        apiBase: 'http://localhost:3000',
        allowedReads: [
          { actionId: 'read_foundation_hub', kind: 'api_read', route: '/api/foundation-hub', approvalRequired: false },
          { actionId: 'read_current_sprint', kind: 'api_read', route: '/api/foundation/current-sprint', approvalRequired: false },
          { actionId: 'read_build_log', kind: 'api_read', route: '/api/foundation/build-log', approvalRequired: false },
        ],
        allowedWrites: [],
        sourceContracts: ['foundation-hub', 'foundation-current-sprint', 'foundation-build-log'],
        escalationOwner: 'Foundation operator',
        capabilityStatus: 'read_only_local',
      }),
      registryEntry({
        systemKey: 'old-bcrew-buddy-reference',
        label: 'Old BCrew-Buddy reference',
        systemType: 'local_reference',
        owner: 'Foundation',
        localPath: '~/bcrew-buddy-reference',
        authMode: 'local_filesystem_read_only',
        allowedReads: [
          { actionId: 'read_old_system_evidence_metadata', kind: 'local_file_read', approvalRequired: false },
        ],
        allowedWrites: [],
        sourceContracts: ['old-system-agent-onboarding-harvest-v1'],
        escalationOwner: 'Foundation builder',
        capabilityStatus: 'evidence_only_not_active_truth',
      }),
      registryEntry({
        systemKey: 'google-workspace-delegated',
        label: 'Google Workspace delegated paths',
        systemType: 'connector_family',
        owner: 'Steve / Foundation',
        apiBase: 'google-workspace://delegated',
        authMode: 'delegated_connector_approval_required',
        status: 'blocked_pending_approval',
        allowedReads: [
          { actionId: 'read_approved_source_contracts_only', kind: 'connector_read', approvalRequired: true },
        ],
        allowedWrites: [
          { actionId: 'request_drive_mutation_approval', kind: 'drive_mutation', approvalRequired: true, writeEnabled: false },
        ],
        sourceContracts: ['SRC-GDOCS-001', 'SRC-GSHEETS-001', 'MEETING-VAULT-ACL-001'],
        escalationOwner: 'Steve / Foundation source owner',
        capabilityStatus: 'blocked_until_source_or_user_approval',
      }),
      registryEntry({
        systemKey: 'future-harlan-home',
        label: 'Future external Harlan home',
        systemType: 'planned_agent_home',
        owner: 'Steve / Foundation',
        localPath: '~/.agents/harlan',
        authMode: 'not_created',
        status: 'planned_blocked',
        allowedReads: [],
        allowedWrites: [
          { actionId: 'create_or_move_harlan_home', kind: 'repo_write', approvalRequired: true, writeEnabled: false },
        ],
        sourceContracts: ['agent-architecture', 'personal-agent-onboarding-contract-v1', 'role-assistant-contracts-v1'],
        escalationOwner: 'Steve',
        capabilityStatus: 'planned_no_runtime',
      }),
    ],
    unknownSystemPolicy: {
      defaultDecision: 'blocked',
      requiredFieldsBeforeUse: ['systemKey', 'owner', 'authMode', 'allowedReads', 'allowedWrites', 'approvalBoundaries', 'escalationOwner', 'capabilityStatus'],
      unregisteredClaimLabel: 'not_registered',
    },
    notNextBoundaries: HARLAN_PROJECT_REGISTRY_NOT_NEXT_BOUNDARIES,
    ...overrides,
  }
}

export function evaluateHarlanProjectRegistry(registry = buildHarlanProjectRegistry()) {
  const violations = []
  const systems = list(registry.systems)
  const systemKeys = systems.map(system => system.systemKey)

  if (registry.ownerLayer !== 'Foundation') addViolation(violations, registry.cardId, 'foundation_owner_required', registry.ownerLayer || 'missing')
  if (registry.registryOnly !== true) addViolation(violations, registry.cardId, 'registry_only_required', String(registry.registryOnly))
  if (registry.liveAgentRuntimeStarted === true) addViolation(violations, registry.cardId, 'runtime_launch_blocked', 'registry card cannot launch Harlan runtime')
  if (registry.extractionStarted === true) addViolation(violations, registry.cardId, 'live_extraction_blocked', 'live extraction is not approved')
  if (registry.modelCallsStarted === true) addViolation(violations, registry.cardId, 'model_call_blocked', 'model/provider calls are not approved')
  if (registry.externalWritesStarted === true) addViolation(violations, registry.cardId, 'external_write_blocked', 'external writes are not approved')
  if (registry.hiddenSubagentsSpawned === true) addViolation(violations, registry.cardId, 'hidden_subagent_blocked', 'hidden workers require explicit approval')
  if (registry.grantsNewAuthority === true) addViolation(violations, registry.cardId, 'new_authority_blocked', 'registry definitions do not grant new authority')
  if (list(registry.prerequisites).length < 4) addViolation(violations, registry.cardId, 'prerequisites_required', 'role contracts, onboarding, capability registry, and template are required')
  if (registry.unknownSystemPolicy?.defaultDecision !== 'blocked') addViolation(violations, registry.cardId, 'unknown_systems_blocked_required', registry.unknownSystemPolicy?.defaultDecision || 'missing')

  for (const requiredKey of HARLAN_PROJECT_REGISTRY_REQUIRED_SYSTEM_KEYS) {
    if (!systemKeys.includes(requiredKey)) addViolation(violations, requiredKey, 'required_system_missing', 'initial Harlan registry example is required')
  }
  if (new Set(systemKeys).size !== systemKeys.length) addViolation(violations, registry.cardId, 'duplicate_system_keys_blocked', systemKeys.join(', '))

  for (const system of systems) {
    const subject = system.systemKey || 'missing-system-key'
    for (const field of ['systemKey', 'label', 'systemType', 'owner', 'authMode', 'status', 'escalationOwner', 'capabilityStatus']) {
      if (!text(system[field])) addViolation(violations, subject, 'system_field_required', field)
    }
    if (!text(system.localPath) && !text(system.repoUrl) && !text(system.apiBase)) addViolation(violations, subject, 'location_or_api_required', 'system needs localPath, repoUrl, or apiBase')
    if (!list(system.approvalBoundaries).length) addViolation(violations, subject, 'approval_boundaries_required', 'approval boundaries are required')
    if (!list(system.sourceContracts).length) addViolation(violations, subject, 'source_contract_refs_required', 'source contracts or closeout refs are required')
    if (system.unknownSystemPolicy !== 'blocked_until_registered') addViolation(violations, subject, 'entry_unknown_policy_required', system.unknownSystemPolicy || 'missing')
    if (!list(system.allowedReads).length && system.status === 'read_only_registered') addViolation(violations, subject, 'read_scope_required', 'readable registered systems need read scope')

    for (const action of [...list(system.allowedReads), ...list(system.allowedWrites)]) {
      if (!text(action.actionId) || !text(action.kind)) addViolation(violations, subject, 'action_fields_required', action.actionId || 'missing action')
      if (mutates(action) && (action.approvalRequired !== true || action.writeEnabled !== false)) addViolation(violations, subject, 'mutating_action_approval_required', action.kind)
    }
    if (list(system.allowedWrites).some(action => action.writeEnabled === true)) addViolation(violations, subject, 'write_enabled_blocked', 'writes cannot be enabled by registry card')
    if (system.status === 'read_only_registered' && list(system.allowedWrites).some(action => action.approvalRequired !== true)) addViolation(violations, subject, 'write_requires_approval', 'all writes require approval')
  }

  return {
    ok: violations.length === 0,
    status: violations.length ? 'blocked' : 'ready',
    cardId: registry.cardId,
    systemCardId: registry.systemCardId,
    closeoutKey: registry.closeoutKey,
    violations,
    summary: {
      systemCount: systems.length,
      requiredSystemCount: HARLAN_PROJECT_REGISTRY_REQUIRED_SYSTEM_KEYS.length,
      violationCount: violations.length,
    },
  }
}

export function buildHarlanProjectRegistryDogfoodProof() {
  const healthyRegistry = buildHarlanProjectRegistry()
  const healthy = evaluateHarlanProjectRegistry(healthyRegistry)
  const missingSystem = clone(healthyRegistry)
  missingSystem.systems = missingSystem.systems.filter(system => system.systemKey !== 'future-harlan-home')
  const missingAuth = clone(healthyRegistry)
  missingAuth.systems[0].authMode = ''
  const unapprovedWrite = clone(healthyRegistry)
  unapprovedWrite.systems[1].allowedWrites.push({ actionId: 'write_dashboard', kind: 'external_write', approvalRequired: false, writeEnabled: true })
  const unknownAllowed = clone(healthyRegistry)
  unknownAllowed.unknownSystemPolicy.defaultDecision = 'allow'
  const missingEscalation = clone(healthyRegistry)
  missingEscalation.systems[2].escalationOwner = ''
  const missingSourceContracts = clone(healthyRegistry)
  missingSourceContracts.systems[3].sourceContracts = []
  const runtimeAttempt = buildHarlanProjectRegistry({
    liveAgentRuntimeStarted: true,
    extractionStarted: true,
    modelCallsStarted: true,
    externalWritesStarted: true,
    hiddenSubagentsSpawned: true,
    grantsNewAuthority: true,
  })
  const results = {
    missingSystem: evaluateHarlanProjectRegistry(missingSystem),
    missingAuth: evaluateHarlanProjectRegistry(missingAuth),
    unapprovedWrite: evaluateHarlanProjectRegistry(unapprovedWrite),
    unknownAllowed: evaluateHarlanProjectRegistry(unknownAllowed),
    missingEscalation: evaluateHarlanProjectRegistry(missingEscalation),
    missingSourceContracts: evaluateHarlanProjectRegistry(missingSourceContracts),
    runtimeAttempt: evaluateHarlanProjectRegistry(runtimeAttempt),
  }
  return {
    ok: healthy.ok === true && Object.values(results).every(result => result.ok === false),
    invariant: 'Harlan project registry passes with required systems and rejects missing systems, missing auth, unapproved writes, allowed unknown systems, missing escalation, missing source contracts, runtime side effects, new authority, and hidden subagents.',
    healthy,
    missingSystemRejected: results.missingSystem.ok === false,
    missingAuthRejected: results.missingAuth.ok === false,
    unapprovedWriteRejected: results.unapprovedWrite.ok === false,
    unknownAllowedRejected: results.unknownAllowed.ok === false,
    missingEscalationRejected: results.missingEscalation.ok === false,
    missingSourceContractsRejected: results.missingSourceContracts.ok === false,
    runtimeAttemptRejected: results.runtimeAttempt.ok === false,
    brokenFixtures: results,
  }
}
