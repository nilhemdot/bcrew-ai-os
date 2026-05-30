export const AGENT_TEMPLATE_RUNTIME_CONTRACT_CARD_ID = 'AGENT-TEMPLATE-RUNTIME-CONTRACT-001'
export const AGENT_TEMPLATE_RUNTIME_CONTRACT_CLOSEOUT_KEY = 'agent-template-runtime-contract-v1'
export const AGENT_TEMPLATE_RUNTIME_CONTRACT_PLAN_PATH = 'docs/process/agent-template-runtime-contract-001-plan.md'
export const AGENT_TEMPLATE_RUNTIME_CONTRACT_APPROVAL_PATH = 'docs/process/approvals/AGENT-TEMPLATE-RUNTIME-CONTRACT-001.json'
export const AGENT_TEMPLATE_RUNTIME_CONTRACT_SCRIPT_PATH = 'scripts/process-agent-template-runtime-contract-check.mjs'
export const AGENT_TEMPLATE_RUNTIME_CONTRACT_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-18-agent-template-runtime-contract-closeout.md'
export const AGENT_TEMPLATE_RUNTIME_CONTRACT_SPRINT_ID = 'agent-template-runtime-contract-2026-05-18'

export const AGENT_TEMPLATE_RUNTIME_CONTRACT_CHANGED_FILES = [
  'lib/agent-template-runtime-contract.js',
  'scripts/process-agent-template-runtime-contract-check.mjs',
  'lib/foundation-runtime-reliability-verifier.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'scripts/foundation-verify.mjs',
  'lib/foundation-build-closeout-agent-runtime-records.js',
  'docs/process/agent-template-runtime-contract-001-plan.md',
  'docs/process/approvals/AGENT-TEMPLATE-RUNTIME-CONTRACT-001.json',
  'docs/_archive/handoffs/2026-05-18-agent-template-runtime-contract-closeout.md',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'package.json',
]

export const AGENT_TEMPLATE_RUNTIME_CONTRACT_PROOF_COMMANDS = [
  'node --check lib/agent-template-runtime-contract.js lib/foundation-runtime-reliability-verifier.js scripts/process-agent-template-runtime-contract-check.mjs scripts/foundation-verify.mjs',
  'npm run process:agent-template-runtime-contract-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=AGENT-TEMPLATE-RUNTIME-CONTRACT-001 --planApprovalRef=docs/process/approvals/AGENT-TEMPLATE-RUNTIME-CONTRACT-001.json --closeoutKey=agent-template-runtime-contract-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=AGENT-TEMPLATE-RUNTIME-CONTRACT-001 --closeoutKey=agent-template-runtime-contract-v1',
  'npm run process:foundation-ship -- --card=AGENT-TEMPLATE-RUNTIME-CONTRACT-001 --planApprovalRef=docs/process/approvals/AGENT-TEMPLATE-RUNTIME-CONTRACT-001.json --closeoutKey=agent-template-runtime-contract-v1 --commitRef=HEAD',
]

export const AGENT_TEMPLATE_RUNTIME_CONTRACT_NOT_NEXT_BOUNDARIES = [
  'Do not build Harlan UI or feature work.',
  'Do not launch live agent runtime work.',
  'Do not run live extraction.',
  'Do not call providers or models.',
  'Do not send Gmail, ClickUp, Drive, Slack, or Agent Feedback mutations.',
  'Do not mutate Google Drive permissions.',
  'Do not work MEETING-VAULT-ACL-001 Phase B or historical Meeting Vault cleanup from this sprint.',
  'Do not send request-access emails.',
  'Do not harvest old-system BCrew-Buddy onboarding evidence in this card.',
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
  violations.push({ subject: subject || 'agent-template-runtime-contract', ruleId, detail })
}

function hasRef(value, expected) {
  return String(value || '').includes(expected)
}

function actionNeedsApproval(action = {}) {
  return MUTATING_ACTION_KINDS.has(text(action.kind)) || action.externalWrite === true || action.approvalRequired === true
}

function validTemplateBase(agentId, overrides = {}) {
  return {
    agentId,
    templateVersion: 1,
    status: 'template_ready',
    identity: {
      displayName: agentId === 'harlan-pilot' ? 'Harlan' : agentId === 'crewbert-foundation' ? 'Crewbert' : 'Extraction Worker',
      owner: agentId === 'harlan-pilot' ? 'Steve / Foundation' : 'Foundation',
      role: agentId === 'extraction-worker-template' ? 'bounded-source-worker' : 'operator-assistant',
      purpose: 'Operate only inside declared Foundation capability, source, permission, and approval boundaries.',
    },
    permissionTier: agentId === 'extraction-worker-template' ? 'approval_bound_worker' : 'read_only_preflight',
    sourceAccess: [
      { sourceRef: 'SYS-AGENTS-001', access: 'read', reason: 'agent-system-boundary' },
      { sourceRef: 'AGENT-CAPABILITY-REGISTRY-001', access: 'read', reason: 'capability-truth' },
    ],
    memoryScope: {
      allowed: ['session_context', 'approved_profile_summary', 'source_backed_facts'],
      privateProfilePolicy: 'local_or_private_store_only',
      repoTruthBoundary: 'do_not_commit_private_profile',
    },
    toolPermissions: [
      { toolId: 'foundation-hub-api', kind: 'live_api', access: 'read', approvalRequired: false },
      { toolId: 'agent-capability-registry', kind: 'foundation_registry', access: 'read', approvalRequired: false },
    ],
    modelRoute: {
      routeId: 'foundation-agent-answer:adapter-owned',
      providerPolicy: 'adapter_only',
      modelCallsEnabled: false,
      costPolicy: 'no_paid_or_live_provider_call_in_template_card',
    },
    approvalBoundary: {
      defaultDecision: 'fail_closed',
      approvalRequiredFor: ['external_send', 'external_write', 'drive_mutation', 'live_extraction', 'paid_run', 'provider_call', 'model_call'],
      unapprovedActionLabel: 'blocked',
    },
    liveAnswerPreflightRef: 'agent-live-answer-preflight-gate-v1',
    capabilityRegistryRef: 'agent-capability-registry-v1',
    actionRouting: {
      routeOwner: 'Foundation Action Router',
      allowedModes: ['read_only_answer', 'approval_request'],
      directApplyEnabled: false,
    },
    logging: {
      eventLog: 'foundation_agent_runtime_events',
      transcriptPolicy: 'operator_visible',
      proofRequired: true,
    },
    failureVisibility: {
      publicVisible: true,
      missingCapabilityLabel: 'not_declared',
      sourceUnavailableLabel: 'blocked_or_last_known',
    },
    onboardingProfileContract: {
      requiredBeforePersonalization: true,
      profileStorage: 'private_store_not_repo_truth',
      harvestCardId: 'OLD-SYSTEM-AGENT-ONBOARDING-HARVEST-001',
    },
    decommissionPath: {
      owner: 'Foundation',
      trigger: 'stale, unsafe, unowned, or unused capability',
      archiveRequired: true,
    },
    execution: {
      promptOnlyPolicy: false,
      hiddenSubagentsDefault: 'forbidden_without_explicit_approval',
      liveRuntimeEnabled: false,
      externalWritesEnabled: false,
    },
    actionExamples: [
      { actionId: 'answer_from_live_preflight', kind: 'read_only_answer', enabled: true, approvalRequired: false },
      { actionId: 'request_external_send_approval', kind: 'external_send', enabled: false, approvalRequired: true },
    ],
    ...overrides,
  }
}

export function buildAgentTemplateRuntimeContract(overrides = {}) {
  return {
    cardId: AGENT_TEMPLATE_RUNTIME_CONTRACT_CARD_ID,
    closeoutKey: AGENT_TEMPLATE_RUNTIME_CONTRACT_CLOSEOUT_KEY,
    ownerLayer: 'Foundation',
    contractVersion: 1,
    contractOnly: true,
    liveAgentRuntimeStarted: false,
    extractionStarted: false,
    modelCallsStarted: false,
    externalWritesStarted: false,
    hiddenSubagentsSpawned: false,
    templates: [
      validTemplateBase('harlan-pilot'),
      validTemplateBase('crewbert-foundation', {
        identity: {
          displayName: 'Crewbert',
          owner: 'Foundation',
          role: 'foundation-orchestrator',
          purpose: 'Coordinate Foundation work from live backlog truth only after capability and approval proof exists.',
        },
      }),
      validTemplateBase('extraction-worker-template', {
        permissionTier: 'approval_bound_worker',
        toolPermissions: [
          { toolId: 'extraction-target-control', kind: 'foundation_job', access: 'blocked_pending_approval', approvalRequired: true },
          { toolId: 'foundation-hub-api', kind: 'live_api', access: 'read', approvalRequired: false },
        ],
        actionRouting: {
          routeOwner: 'Foundation Extraction Control',
          allowedModes: ['dry_run_preflight', 'approval_request'],
          directApplyEnabled: false,
        },
      }),
    ],
    notNextBoundaries: AGENT_TEMPLATE_RUNTIME_CONTRACT_NOT_NEXT_BOUNDARIES,
    ...overrides,
  }
}

export function evaluateAgentTemplateRuntimeContract(contract = buildAgentTemplateRuntimeContract()) {
  const violations = []
  const templates = list(contract.templates)

  if (contract.ownerLayer !== 'Foundation') addViolation(violations, contract.cardId, 'foundation_owner_required', contract.ownerLayer || 'missing')
  if (contract.contractOnly !== true) addViolation(violations, contract.cardId, 'contract_only_required', String(contract.contractOnly))
  if (contract.liveAgentRuntimeStarted === true) addViolation(violations, contract.cardId, 'runtime_launch_blocked', 'template card cannot launch agent runtime')
  if (contract.extractionStarted === true) addViolation(violations, contract.cardId, 'live_extraction_blocked', 'live extraction is not approved')
  if (contract.modelCallsStarted === true) addViolation(violations, contract.cardId, 'model_call_blocked', 'model/provider calls are not approved')
  if (contract.externalWritesStarted === true) addViolation(violations, contract.cardId, 'external_write_blocked', 'external writes are not approved')
  if (contract.hiddenSubagentsSpawned === true) addViolation(violations, contract.cardId, 'hidden_subagent_blocked', 'hidden workers require explicit approval')
  if (!templates.length) addViolation(violations, contract.cardId, 'template_rows_required', 'at least one agent template is required')

  for (const template of templates) {
    const subject = template.agentId || 'missing-agent-template'
    for (const field of ['agentId', 'templateVersion', 'status', 'permissionTier', 'liveAnswerPreflightRef', 'capabilityRegistryRef']) {
      if (!text(template[field])) addViolation(violations, subject, 'template_field_required', field)
    }
    for (const field of ['displayName', 'owner', 'role', 'purpose']) {
      if (!text(template.identity?.[field])) addViolation(violations, subject, 'identity_field_required', field)
    }
    if (!list(template.sourceAccess).length) addViolation(violations, subject, 'source_access_required', 'template needs source access rows')
    if (!list(template.toolPermissions).length) addViolation(violations, subject, 'tool_permissions_required', 'template needs tool permissions')
    if (!list(template.memoryScope?.allowed).length || !text(template.memoryScope?.privateProfilePolicy) || !text(template.memoryScope?.repoTruthBoundary)) addViolation(violations, subject, 'memory_scope_required', 'template needs memory and private profile boundaries')
    if (!text(template.modelRoute?.routeId) || !text(template.modelRoute?.providerPolicy) || !text(template.modelRoute?.costPolicy)) addViolation(violations, subject, 'model_route_required', 'template needs model route and cost policy')
    if (template.modelRoute?.modelCallsEnabled === true) addViolation(violations, subject, 'model_calls_disabled_by_default_required', 'template card cannot enable live model calls')
    if (!text(template.approvalBoundary?.defaultDecision) || !list(template.approvalBoundary?.approvalRequiredFor).length || !text(template.approvalBoundary?.unapprovedActionLabel)) addViolation(violations, subject, 'approval_boundary_required', 'template needs approval posture')
    if (!hasRef(template.liveAnswerPreflightRef, 'agent-live-answer-preflight-gate-v1')) addViolation(violations, subject, 'live_answer_preflight_ref_required', template.liveAnswerPreflightRef || 'missing')
    if (!hasRef(template.capabilityRegistryRef, 'agent-capability-registry-v1')) addViolation(violations, subject, 'capability_registry_ref_required', template.capabilityRegistryRef || 'missing')
    if (!text(template.actionRouting?.routeOwner) || !list(template.actionRouting?.allowedModes).length || template.actionRouting?.directApplyEnabled !== false) addViolation(violations, subject, 'action_routing_required', 'template needs routed action policy and no direct apply')
    if (!text(template.logging?.eventLog) || !text(template.logging?.transcriptPolicy) || template.logging?.proofRequired !== true) addViolation(violations, subject, 'logging_policy_required', 'template needs logging proof')
    if (template.failureVisibility?.publicVisible !== true || !text(template.failureVisibility?.missingCapabilityLabel) || !text(template.failureVisibility?.sourceUnavailableLabel)) addViolation(violations, subject, 'failure_visibility_required', 'template needs visible failure labels')
    if (template.onboardingProfileContract?.requiredBeforePersonalization !== true || !text(template.onboardingProfileContract?.profileStorage) || !text(template.onboardingProfileContract?.harvestCardId)) addViolation(violations, subject, 'onboarding_profile_contract_required', 'template needs onboarding/profile boundary')
    if (!text(template.decommissionPath?.owner) || !text(template.decommissionPath?.trigger) || template.decommissionPath?.archiveRequired !== true) addViolation(violations, subject, 'decommission_path_required', 'template needs decommission path')
    if (template.execution?.promptOnlyPolicy === true) addViolation(violations, subject, 'prompt_only_template_rejected', 'prompt-only agent template is not enough')
    if (template.execution?.hiddenSubagentsDefault !== 'forbidden_without_explicit_approval') addViolation(violations, subject, 'hidden_subagent_policy_required', 'hidden workers are not default mode')
    if (template.execution?.liveRuntimeEnabled === true || template.execution?.externalWritesEnabled === true) addViolation(violations, subject, 'runtime_or_write_enablement_blocked', 'template card cannot enable runtime/writes')

    for (const source of list(template.sourceAccess)) {
      if (!text(source.sourceRef) || !text(source.access) || !text(source.reason)) addViolation(violations, subject, 'source_access_fields_required', source.sourceRef || 'missing source')
    }
    for (const tool of list(template.toolPermissions)) {
      if (!text(tool.toolId) || !text(tool.kind) || !text(tool.access)) addViolation(violations, subject, 'tool_permission_fields_required', tool.toolId || 'missing tool')
      if (tool.access !== 'read' && tool.approvalRequired !== true) addViolation(violations, subject, 'non_read_tool_requires_approval', tool.toolId || 'missing tool')
    }
    for (const action of list(template.actionExamples)) {
      if (!text(action.actionId) || !text(action.kind)) addViolation(violations, subject, 'action_example_fields_required', action.actionId || 'missing action')
      if (actionNeedsApproval(action) && (action.enabled !== false || action.approvalRequired !== true)) addViolation(violations, subject, 'approval_action_disabled_by_default_required', action.actionId || action.kind)
    }
  }

  return {
    ok: violations.length === 0,
    status: violations.length ? 'blocked' : 'ready',
    cardId: contract.cardId,
    closeoutKey: contract.closeoutKey,
    violations,
    summary: {
      templateCount: templates.length,
      violationCount: violations.length,
    },
  }
}

export function buildAgentTemplateRuntimeContractDogfoodProof() {
  const healthyContract = buildAgentTemplateRuntimeContract()
  const healthy = evaluateAgentTemplateRuntimeContract(healthyContract)

  const missingIdentity = clone(healthyContract)
  missingIdentity.templates[0].identity.owner = ''

  const missingSourceAccess = clone(healthyContract)
  missingSourceAccess.templates[0].sourceAccess = []

  const missingMemoryScope = clone(healthyContract)
  missingMemoryScope.templates[0].memoryScope = {}

  const missingTools = clone(healthyContract)
  missingTools.templates[0].toolPermissions = []

  const missingApproval = clone(healthyContract)
  missingApproval.templates[0].approvalBoundary = {}

  const missingPreflight = clone(healthyContract)
  missingPreflight.templates[0].liveAnswerPreflightRef = ''

  const missingCapability = clone(healthyContract)
  missingCapability.templates[0].capabilityRegistryRef = ''

  const missingFailureVisibility = clone(healthyContract)
  missingFailureVisibility.templates[0].failureVisibility = {}

  const missingDecommission = clone(healthyContract)
  missingDecommission.templates[0].decommissionPath = {}

  const promptOnly = clone(healthyContract)
  promptOnly.templates[0].execution.promptOnlyPolicy = true

  const runtimeSideEffectAttempt = evaluateAgentTemplateRuntimeContract(buildAgentTemplateRuntimeContract({
    liveAgentRuntimeStarted: true,
    extractionStarted: true,
    modelCallsStarted: true,
    externalWritesStarted: true,
    hiddenSubagentsSpawned: true,
  }))

  const results = {
    missingIdentity: evaluateAgentTemplateRuntimeContract(missingIdentity),
    missingSourceAccess: evaluateAgentTemplateRuntimeContract(missingSourceAccess),
    missingMemoryScope: evaluateAgentTemplateRuntimeContract(missingMemoryScope),
    missingTools: evaluateAgentTemplateRuntimeContract(missingTools),
    missingApproval: evaluateAgentTemplateRuntimeContract(missingApproval),
    missingPreflight: evaluateAgentTemplateRuntimeContract(missingPreflight),
    missingCapability: evaluateAgentTemplateRuntimeContract(missingCapability),
    missingFailureVisibility: evaluateAgentTemplateRuntimeContract(missingFailureVisibility),
    missingDecommission: evaluateAgentTemplateRuntimeContract(missingDecommission),
    promptOnly: evaluateAgentTemplateRuntimeContract(promptOnly),
    runtimeSideEffectAttempt,
  }

  return {
    ok: healthy.ok === true && Object.values(results).every(result => result.ok === false),
    invariant: 'Valid Harlan, Crewbert, and extraction-worker templates pass; missing identity/source/memory/tools/approval/preflight/capability/failure/decommission fields, prompt-only templates, and runtime side effects fail closed.',
    healthy,
    validExamplesPass: healthy.ok === true && healthy.summary.templateCount >= 3,
    missingIdentityRejected: results.missingIdentity.ok === false,
    missingSourceAccessRejected: results.missingSourceAccess.ok === false,
    missingMemoryScopeRejected: results.missingMemoryScope.ok === false,
    missingToolsRejected: results.missingTools.ok === false,
    missingApprovalRejected: results.missingApproval.ok === false,
    missingPreflightRejected: results.missingPreflight.ok === false,
    missingCapabilityRejected: results.missingCapability.ok === false,
    missingFailureVisibilityRejected: results.missingFailureVisibility.ok === false,
    missingDecommissionRejected: results.missingDecommission.ok === false,
    promptOnlyRejected: results.promptOnly.ok === false,
    runtimeSideEffectAttemptRejected: runtimeSideEffectAttempt.ok === false,
  }
}
