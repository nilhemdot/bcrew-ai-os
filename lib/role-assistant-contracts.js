export const ROLE_ASSISTANT_CONTRACTS_CARD_ID = 'ROLE-ASSISTANT-CONTRACTS-001'
export const ROLE_ASSISTANT_CONTRACTS_CLOSEOUT_KEY = 'role-assistant-contracts-v1'
export const ROLE_ASSISTANT_CONTRACTS_PLAN_PATH = 'docs/process/role-assistant-contracts-001-plan.md'
export const ROLE_ASSISTANT_CONTRACTS_APPROVAL_PATH = 'docs/process/approvals/ROLE-ASSISTANT-CONTRACTS-001.json'
export const ROLE_ASSISTANT_CONTRACTS_SCRIPT_PATH = 'scripts/process-role-assistant-contracts-check.mjs'
export const ROLE_ASSISTANT_CONTRACTS_DOC_PATH = 'docs/agents/role-assistant-contracts.md'
export const ROLE_ASSISTANT_CONTRACTS_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-role-assistant-contracts-closeout.md'
export const ROLE_ASSISTANT_CONTRACTS_SPRINT_ID = 'role-assistant-contracts-2026-05-18'
export const ROLE_ASSISTANT_CONTRACTS_NEXT_CARD_ID = 'HARLAN-PROJECT-REGISTRY-001'

export const ROLE_ASSISTANT_CONTRACTS_REQUIRED_ROLE_IDS = [
  'steve-harlan',
  'sales-leadership-assistant',
  'ops-assistant',
  'marketing-assistant',
  'agent-kpi-coach',
  'extraction-worker',
]

export const ROLE_ASSISTANT_CONTRACTS_CHANGED_FILES = [
  'lib/role-assistant-contracts.js',
  'scripts/process-role-assistant-contracts-check.mjs',
  'docs/agents/role-assistant-contracts.md',
  'docs/agents/README.md',
  'docs/rebuild/agent-architecture.md',
  'lib/foundation-runtime-reliability-verifier.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'scripts/foundation-verify.mjs',
  'lib/foundation-build-closeout-agent-runtime-records.js',
  'docs/process/role-assistant-contracts-001-plan.md',
  'docs/process/approvals/ROLE-ASSISTANT-CONTRACTS-001.json',
  'docs/handoffs/2026-05-18-role-assistant-contracts-closeout.md',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'package.json',
]

export const ROLE_ASSISTANT_CONTRACTS_PROOF_COMMANDS = [
  'node --check lib/role-assistant-contracts.js lib/foundation-runtime-reliability-verifier.js scripts/process-role-assistant-contracts-check.mjs scripts/foundation-verify.mjs',
  'npm run process:role-assistant-contracts-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=ROLE-ASSISTANT-CONTRACTS-001 --planApprovalRef=docs/process/approvals/ROLE-ASSISTANT-CONTRACTS-001.json --closeoutKey=role-assistant-contracts-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=ROLE-ASSISTANT-CONTRACTS-001 --closeoutKey=role-assistant-contracts-v1',
  'npm run process:foundation-ship -- --card=ROLE-ASSISTANT-CONTRACTS-001 --planApprovalRef=docs/process/approvals/ROLE-ASSISTANT-CONTRACTS-001.json --closeoutKey=role-assistant-contracts-v1 --commitRef=HEAD',
]

export const ROLE_ASSISTANT_CONTRACTS_NOT_NEXT_BOUNDARIES = [
  'Do not build Harlan UI or feature work.',
  'Do not launch live agent runtime work.',
  'Do not run live extraction.',
  'Do not call providers or models.',
  'Do not send Gmail, ClickUp, Drive, Slack, Telegram, or Agent Feedback mutations.',
  'Do not mutate Google Drive permissions.',
  'Do not work MEETING-VAULT-ACL-001 Phase B or historical Meeting Vault cleanup.',
  'Do not create private profile storage runtime.',
  'Do not send daily nuggets or team assistant messages.',
  'Do not grant new project reach or external-write authority.',
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
  'source_write',
  'profile_write',
])

const REQUIRED_APPROVAL_KINDS = [
  'external_send',
  'external_write',
  'drive_mutation',
  'live_extraction',
  'paid_run',
  'provider_call',
  'model_call',
  'private_profile_write',
]

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
  violations.push({ subject: subject || 'role-assistant-contracts', ruleId, detail })
}

function actionMutates(action = {}) {
  return MUTATING_ACTION_KINDS.has(text(action.kind)) || action.writeEnabled === true || action.externalWrite === true
}

function containsRawPrivateValue(value) {
  if (!value || typeof value !== 'object') return false
  if (Array.isArray(value)) return value.some(containsRawPrivateValue)
  return Object.entries(value).some(([key, item]) => {
    if (['value', 'rawValue', 'privateValue', 'samplePrivateValue'].includes(key) && text(item)) return true
    return containsRawPrivateValue(item)
  })
}

function commonRoleFields(overrides = {}) {
  return {
    assistantLayer: 'role_assistant',
    status: 'contract_ready',
    liveAnswerPreflightRef: 'agent-live-answer-preflight-gate-v1',
    capabilityRegistryRef: 'agent-capability-registry-v1',
    templateRuntimeRef: 'agent-template-runtime-contract-v1',
    onboardingContractRef: 'personal-agent-onboarding-contract-v1',
    trustPolicy: {
      currentClaimsRequireLiveEvidence: true,
      sourceBackedBusinessClaims: true,
      memoryOnlyCurrentClaimsAllowed: false,
      unresolvedConflictLabel: 'blocked_or_needs_owner_review',
    },
    approvalBoundaries: {
      defaultDecision: 'fail_closed',
      requiredFor: REQUIRED_APPROVAL_KINDS,
      unapprovedActionLabel: 'blocked_pending_approval',
    },
    executionBoundary: {
      liveRuntimeEnabled: false,
      externalWritesEnabled: false,
      hiddenSubagentsDefault: 'forbidden_without_explicit_approval',
      operatorVisible: true,
    },
    statusReportFormat: {
      requiredFields: ['status', 'sourceRefs', 'blockedBy', 'nextAction'],
      blockedLabel: 'blocked_pending_approval',
      wrapReportRequiredWhenDirty: true,
    },
    ...overrides,
  }
}

function readOnlyAction(actionId, purpose) {
  return { actionId, kind: 'read_only_answer', purpose, enabledByDefault: true, approvalRequired: false }
}

function draftAction(actionId, purpose) {
  return { actionId, kind: 'draft_only', purpose, enabledByDefault: true, approvalRequired: false }
}

function approvalAction(actionId, kind, purpose) {
  return { actionId, kind, purpose, enabledByDefault: false, approvalRequired: true, writeEnabled: false }
}

export function buildRoleAssistantContracts(overrides = {}) {
  return {
    cardId: ROLE_ASSISTANT_CONTRACTS_CARD_ID,
    closeoutKey: ROLE_ASSISTANT_CONTRACTS_CLOSEOUT_KEY,
    ownerLayer: 'Foundation',
    contractVersion: 1,
    contractOnly: true,
    liveAgentRuntimeStarted: false,
    extractionStarted: false,
    modelCallsStarted: false,
    externalWritesStarted: false,
    hiddenSubagentsSpawned: false,
    grantsNewAuthority: false,
    prerequisites: [
      { cardId: 'FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001', closeoutKey: 'foundation-agent-usefulness-runtime-gates-v1' },
      { cardId: 'AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001', closeoutKey: 'agent-live-answer-preflight-gate-v1' },
      { cardId: 'AGENT-CAPABILITY-REGISTRY-001', closeoutKey: 'agent-capability-registry-v1' },
      { cardId: 'AGENT-TEMPLATE-RUNTIME-CONTRACT-001', closeoutKey: 'agent-template-runtime-contract-v1' },
      { cardId: 'OLD-SYSTEM-AGENT-ONBOARDING-HARVEST-001', closeoutKey: 'old-system-agent-onboarding-harvest-v1' },
      { cardId: 'AGENT-010', closeoutKey: 'personal-agent-onboarding-contract-v1' },
    ],
    roleContracts: [
      commonRoleFields({
        roleId: 'steve-harlan',
        displayName: 'Steve / Harlan',
        assistantName: 'Harlan',
        assistantLayer: 'personal_assistant',
        owner: 'Steve',
        humanOrWorkerRole: 'founder_operator',
        purpose: 'Help Steve see current Foundation, project, and owner-priority truth without becoming the whole OS.',
        sees: ['Steve private profile fields after explicit share', 'Foundation current sprint and system health', 'approved project registry entries'],
        does: ['answer from source-backed current truth', 'draft next actions and approvals', 'surface blockers and drift'],
        escalatesTo: ['Steve', 'Crewbert', 'Foundation builder'],
        trustedSources: [
          { sourceRef: 'private-profile:steve', access: 'read_after_explicit_share', trustUse: 'personal preferences and memory scope' },
          { sourceRef: 'foundation-hub:current-sprint', access: 'read', trustUse: 'current Foundation order' },
          { sourceRef: 'foundation-hub:system-health', access: 'read', trustUse: 'operator-visible health' },
          { sourceRef: 'harlan-project-registry', access: 'blocked_pending_card', trustUse: 'future cross-project reach' },
        ],
        allowedActions: [
          readOnlyAction('answer_current_foundation_status', 'answer current status with live preflight'),
          draftAction('draft_operator_next_action', 'draft next action for Steve approval'),
          approvalAction('request_harlan_send_approval', 'external_send', 'ask before any outbound send'),
        ],
        firstUsefulExamples: ['Tell Steve what Foundation is building now and what is blocked, with source refs.'],
        failureModes: ['blocked_source_unavailable', 'approval_required', 'project_not_registered'],
      }),
      commonRoleFields({
        roleId: 'sales-leadership-assistant',
        displayName: 'Sales Leadership Assistant',
        owner: 'Sales leadership',
        humanOrWorkerRole: 'sales_leadership',
        purpose: 'Help sales leaders inspect source-backed lead, pipeline, coaching, and follow-up signals without mutating CRM or messaging anyone.',
        sees: ['approved CRM/source summaries', 'sales KPI source contracts', 'leader-specific private profile after approval'],
        does: ['summarize source-backed sales risk', 'draft coaching prompts', 'escalate stale or missing source evidence'],
        escalatesTo: ['Sales leader', 'Ops', 'Steve'],
        trustedSources: [
          { sourceRef: 'SRC-FUB-001', access: 'read_or_blocked', trustUse: 'CRM source truth' },
          { sourceRef: 'SRC-OWNERS-001', access: 'read_or_blocked', trustUse: 'owner dashboard context' },
          { sourceRef: 'foundation-action-router', access: 'read', trustUse: 'routed owner decisions' },
        ],
        allowedActions: [
          readOnlyAction('answer_sales_status', 'answer from declared sales sources'),
          draftAction('draft_sales_coaching_note', 'draft coaching notes for owner review'),
          approvalAction('request_crm_or_message_write', 'external_write', 'ask before CRM or message writes'),
        ],
        firstUsefulExamples: ['Show the sales leader one source-backed stuck pipeline or follow-up risk.'],
        failureModes: ['crm_source_blocked', 'missing_freshness', 'approval_required'],
      }),
      commonRoleFields({
        roleId: 'ops-assistant',
        displayName: 'Ops Assistant',
        owner: 'Operations',
        humanOrWorkerRole: 'operations',
        purpose: 'Help Ops see process, calendar, source, and backlog bottlenecks while leaving writes and sends approval-bound.',
        sees: ['Foundation backlog/current sprint', 'operations source contracts', 'scheduled job and runtime health summaries'],
        does: ['triage operational blockers', 'draft owner assignments', 'surface stale process lanes'],
        escalatesTo: ['Ops owner', 'Crewbert', 'Steve'],
        trustedSources: [
          { sourceRef: 'foundation-backlog', access: 'read', trustUse: 'task truth' },
          { sourceRef: 'foundation-runtime-health', access: 'read', trustUse: 'scheduled job and process state' },
          { sourceRef: 'foundation-action-router', access: 'read', trustUse: 'owner-bound actions' },
        ],
        allowedActions: [
          readOnlyAction('answer_ops_bottlenecks', 'answer from backlog and runtime truth'),
          draftAction('draft_ops_assignment', 'draft owner assignment for review'),
          approvalAction('request_task_or_calendar_write', 'external_write', 'ask before task/calendar mutation'),
        ],
        firstUsefulExamples: ['List the highest-risk operational blocker and the owner-bound next action.'],
        failureModes: ['dirty_state_unknown', 'owner_missing', 'approval_required'],
      }),
      commonRoleFields({
        roleId: 'marketing-assistant',
        displayName: 'Marketing Assistant',
        owner: 'Marketing',
        humanOrWorkerRole: 'marketing',
        purpose: 'Help marketing inspect approved source-backed content, campaign, and creator intelligence without publishing or sending.',
        sees: ['marketing source contracts', 'approved intelligence atoms', 'campaign and creator watchlist evidence'],
        does: ['draft content angles from cited sources', 'flag stale or unauthorized source claims', 'route approval requests'],
        escalatesTo: ['Marketing owner', 'Steve', 'Foundation source owner'],
        trustedSources: [
          { sourceRef: 'SRC-GA4-001', access: 'blocked_pending_authorization', trustUse: 'future analytics truth' },
          { sourceRef: 'SRC-GSC-001', access: 'blocked_pending_authorization', trustUse: 'future search truth' },
          { sourceRef: 'foundation-intelligence-atoms', access: 'read', trustUse: 'source-backed build intelligence' },
        ],
        allowedActions: [
          readOnlyAction('answer_marketing_source_status', 'answer from approved marketing/source truth'),
          draftAction('draft_marketing_angle', 'draft source-backed content idea'),
          approvalAction('request_publish_or_send', 'external_send', 'ask before publish, send, or external write'),
        ],
        firstUsefulExamples: ['Draft one source-backed content angle and label which claims still need approval.'],
        failureModes: ['analytics_auth_blocked', 'source_claim_uncited', 'approval_required'],
      }),
      commonRoleFields({
        roleId: 'agent-kpi-coach',
        displayName: 'Agent KPI Coach',
        owner: 'Sales leadership / Agent Success',
        humanOrWorkerRole: 'agent_success',
        purpose: 'Coach agents from approved KPI/source evidence without inventing performance data or sending nudges by default.',
        sees: ['approved KPI source summaries', 'agent onboarding feedback status', 'leader-approved coaching context'],
        does: ['explain KPI gaps from source refs', 'draft coaching questions', 'surface when data is stale or missing'],
        escalatesTo: ['Sales leader', 'Agent Success owner', 'Steve'],
        trustedSources: [
          { sourceRef: 'agent-feedback-roster', access: 'read_or_blocked', trustUse: 'agent onboarding feedback state' },
          { sourceRef: 'SRC-OWNERS-LISTS-001', access: 'read_or_blocked', trustUse: 'owner/agent list context' },
          { sourceRef: 'foundation-kpi-source-contracts', access: 'read_or_blocked', trustUse: 'future KPI facts' },
        ],
        allowedActions: [
          readOnlyAction('answer_agent_kpi_status', 'answer KPI status only from source-backed evidence'),
          draftAction('draft_agent_coaching_question', 'draft a coaching question for leader review'),
          approvalAction('request_agent_nudge_send', 'external_send', 'ask before any nudge or outbound coaching send'),
        ],
        firstUsefulExamples: ['Show a leader one KPI coaching risk with source freshness and missing-data labels.'],
        failureModes: ['kpi_source_missing', 'stale_agent_status', 'approval_required'],
      }),
      commonRoleFields({
        roleId: 'extraction-worker',
        displayName: 'Extraction Worker',
        assistantLayer: 'specialist_worker',
        owner: 'Foundation Extraction Control',
        humanOrWorkerRole: 'source_extraction_worker',
        purpose: 'Prepare and run only approved extraction work from explicit targets, leases, and source contracts.',
        sees: ['approved extraction target', 'source contract boundary', 'job lease and cursor state'],
        does: ['dry-run preflight extraction target', 'report approval blockers', 'write artifacts only after approved process gates'],
        escalatesTo: ['Foundation extraction owner', 'Crewbert', 'Steve'],
        trustedSources: [
          { sourceRef: 'foundation-extraction-target-control', access: 'read', trustUse: 'target and approval truth' },
          { sourceRef: 'source-contract-registry', access: 'read', trustUse: 'source boundary' },
          { sourceRef: 'foundation-job-lease', access: 'read', trustUse: 'lease/cursor status' },
        ],
        allowedActions: [
          { actionId: 'dry_run_extraction_target', kind: 'dry_run_preflight', purpose: 'prove target loads without live side effects', enabledByDefault: true, approvalRequired: false },
          draftAction('draft_extraction_wrap_report', 'summarize preflight proof and blockers'),
          approvalAction('request_live_extraction', 'live_extraction', 'ask before live extraction or artifact writes'),
        ],
        firstUsefulExamples: ['Return a preflight report for one approved target without leasing or crawling live data.'],
        failureModes: ['target_not_approved', 'source_boundary_missing', 'lease_not_allowed'],
      }),
    ],
    notNextBoundaries: ROLE_ASSISTANT_CONTRACTS_NOT_NEXT_BOUNDARIES,
    ...overrides,
  }
}

export function evaluateRoleAssistantContracts(contract = buildRoleAssistantContracts()) {
  const violations = []
  const roles = list(contract.roleContracts)
  const roleIds = roles.map(role => role.roleId)

  if (contract.ownerLayer !== 'Foundation') addViolation(violations, contract.cardId, 'foundation_owner_required', contract.ownerLayer || 'missing')
  if (contract.contractOnly !== true) addViolation(violations, contract.cardId, 'contract_only_required', String(contract.contractOnly))
  if (contract.liveAgentRuntimeStarted === true) addViolation(violations, contract.cardId, 'runtime_launch_blocked', 'role contract card cannot launch agent runtime')
  if (contract.extractionStarted === true) addViolation(violations, contract.cardId, 'live_extraction_blocked', 'live extraction is not approved')
  if (contract.modelCallsStarted === true) addViolation(violations, contract.cardId, 'model_call_blocked', 'model/provider calls are not approved')
  if (contract.externalWritesStarted === true) addViolation(violations, contract.cardId, 'external_write_blocked', 'external writes are not approved')
  if (contract.hiddenSubagentsSpawned === true) addViolation(violations, contract.cardId, 'hidden_subagent_blocked', 'hidden workers require explicit approval')
  if (contract.grantsNewAuthority === true) addViolation(violations, contract.cardId, 'new_authority_blocked', 'role contracts do not grant new authority')
  if (list(contract.prerequisites).length < 6) addViolation(violations, contract.cardId, 'prerequisites_required', 'agent gates, template, harvest, and AGENT-010 are required')

  for (const requiredRoleId of ROLE_ASSISTANT_CONTRACTS_REQUIRED_ROLE_IDS) {
    if (!roleIds.includes(requiredRoleId)) addViolation(violations, requiredRoleId, 'required_role_contract_missing', 'role contract example is required')
  }
  if (new Set(roleIds).size !== roleIds.length) addViolation(violations, contract.cardId, 'duplicate_role_ids_blocked', roleIds.join(', '))

  for (const role of roles) {
    const subject = role.roleId || 'missing-role-id'
    for (const field of ['roleId', 'displayName', 'assistantLayer', 'owner', 'humanOrWorkerRole', 'purpose', 'status']) {
      if (!text(role[field])) addViolation(violations, subject, 'role_field_required', field)
    }
    for (const field of ['liveAnswerPreflightRef', 'capabilityRegistryRef', 'templateRuntimeRef', 'onboardingContractRef']) {
      if (!text(role[field])) addViolation(violations, subject, 'runtime_gate_ref_required', field)
    }
    if (!String(role.liveAnswerPreflightRef || '').includes('agent-live-answer-preflight-gate-v1')) addViolation(violations, subject, 'live_answer_preflight_ref_required', role.liveAnswerPreflightRef || 'missing')
    if (!String(role.capabilityRegistryRef || '').includes('agent-capability-registry-v1')) addViolation(violations, subject, 'capability_registry_ref_required', role.capabilityRegistryRef || 'missing')
    if (!String(role.templateRuntimeRef || '').includes('agent-template-runtime-contract-v1')) addViolation(violations, subject, 'template_runtime_ref_required', role.templateRuntimeRef || 'missing')
    if (!String(role.onboardingContractRef || '').includes('personal-agent-onboarding-contract-v1')) addViolation(violations, subject, 'onboarding_contract_ref_required', role.onboardingContractRef || 'missing')
    if (list(role.sees).length < 3) addViolation(violations, subject, 'sees_scope_required', 'role needs explicit visibility scope')
    if (list(role.does).length < 3) addViolation(violations, subject, 'does_scope_required', 'role needs explicit work scope')
    if (list(role.escalatesTo).length < 1) addViolation(violations, subject, 'escalation_required', 'role needs escalation owner')
    if (list(role.trustedSources).length < 3) addViolation(violations, subject, 'trusted_sources_required', 'role needs trusted source refs')
    if (list(role.allowedActions).length < 3) addViolation(violations, subject, 'allowed_actions_required', 'role needs action examples')
    if (list(role.firstUsefulExamples).length < 1) addViolation(violations, subject, 'first_useful_example_required', 'role needs first useful output example')
    if (list(role.failureModes).length < 2) addViolation(violations, subject, 'failure_modes_required', 'role needs visible failure modes')
    if (role.trustPolicy?.currentClaimsRequireLiveEvidence !== true || role.trustPolicy?.sourceBackedBusinessClaims !== true) addViolation(violations, subject, 'source_backed_trust_policy_required', 'current and business claims need source-backed truth')
    if (role.trustPolicy?.memoryOnlyCurrentClaimsAllowed !== false) addViolation(violations, subject, 'memory_only_current_claims_blocked', 'current claims cannot come from memory only')
    if (role.approvalBoundaries?.defaultDecision !== 'fail_closed') addViolation(violations, subject, 'fail_closed_approval_required', role.approvalBoundaries?.defaultDecision || 'missing')
    for (const requiredKind of REQUIRED_APPROVAL_KINDS) {
      if (!list(role.approvalBoundaries?.requiredFor).includes(requiredKind)) addViolation(violations, subject, 'approval_kind_required', requiredKind)
    }
    if (role.executionBoundary?.liveRuntimeEnabled === true || role.executionBoundary?.externalWritesEnabled === true) addViolation(violations, subject, 'runtime_or_write_enablement_blocked', 'role contract cannot enable runtime or writes')
    if (role.executionBoundary?.hiddenSubagentsDefault !== 'forbidden_without_explicit_approval') addViolation(violations, subject, 'hidden_subagent_policy_required', role.executionBoundary?.hiddenSubagentsDefault || 'missing')
    if (role.executionBoundary?.operatorVisible !== true) addViolation(violations, subject, 'operator_visible_required', 'role work must stay visible')
    if (!list(role.statusReportFormat?.requiredFields).includes('sourceRefs') || role.statusReportFormat?.wrapReportRequiredWhenDirty !== true) addViolation(violations, subject, 'status_report_contract_required', 'status report needs source refs and dirty-state wrap')
    if (containsRawPrivateValue(role)) addViolation(violations, subject, 'raw_private_value_blocked', 'contract may include schema/examples only, not raw private values')

    for (const source of list(role.trustedSources)) {
      if (!text(source.sourceRef) || !text(source.access) || !text(source.trustUse)) addViolation(violations, subject, 'trusted_source_fields_required', source.sourceRef || 'missing source')
    }
    for (const action of list(role.allowedActions)) {
      if (!text(action.actionId) || !text(action.kind) || !text(action.purpose)) addViolation(violations, subject, 'action_fields_required', action.actionId || 'missing action')
      if (actionMutates(action) && (action.approvalRequired !== true || action.enabledByDefault !== false)) addViolation(violations, subject, 'mutating_action_approval_required', action.kind)
    }
  }

  return {
    ok: violations.length === 0,
    status: violations.length ? 'blocked' : 'ready',
    cardId: contract.cardId,
    closeoutKey: contract.closeoutKey,
    violations,
    summary: {
      roleCount: roles.length,
      requiredRoleCount: ROLE_ASSISTANT_CONTRACTS_REQUIRED_ROLE_IDS.length,
      violationCount: violations.length,
      approvalKindCount: REQUIRED_APPROVAL_KINDS.length,
    },
  }
}

export function buildRoleAssistantContractsDogfoodProof() {
  const healthyContract = buildRoleAssistantContracts()
  const healthy = evaluateRoleAssistantContracts(healthyContract)
  const missingRole = clone(healthyContract)
  missingRole.roleContracts = missingRole.roleContracts.filter(role => role.roleId !== 'marketing-assistant')
  const missingSources = clone(healthyContract)
  missingSources.roleContracts[0].trustedSources = []
  const unapprovedWrite = clone(healthyContract)
  unapprovedWrite.roleContracts[1].allowedActions.push({
    actionId: 'write_crm_directly',
    kind: 'external_write',
    purpose: 'bad write fixture',
    enabledByDefault: true,
    approvalRequired: false,
    writeEnabled: true,
  })
  const hiddenSubagent = clone(healthyContract)
  hiddenSubagent.roleContracts[2].executionBoundary.hiddenSubagentsDefault = 'allowed_by_default'
  const memoryOnlyTrust = clone(healthyContract)
  memoryOnlyTrust.roleContracts[3].trustPolicy.memoryOnlyCurrentClaimsAllowed = true
  const missingEscalation = clone(healthyContract)
  missingEscalation.roleContracts[4].escalatesTo = []
  const missingRefs = clone(healthyContract)
  missingRefs.roleContracts[5].liveAnswerPreflightRef = ''
  const rawPrivateValue = clone(healthyContract)
  rawPrivateValue.roleContracts[0].trustedSources[0].privateValue = 'private profile value'
  const runtimeAttempt = buildRoleAssistantContracts({
    liveAgentRuntimeStarted: true,
    extractionStarted: true,
    modelCallsStarted: true,
    externalWritesStarted: true,
    hiddenSubagentsSpawned: true,
    grantsNewAuthority: true,
  })
  const results = {
    missingRole: evaluateRoleAssistantContracts(missingRole),
    missingSources: evaluateRoleAssistantContracts(missingSources),
    unapprovedWrite: evaluateRoleAssistantContracts(unapprovedWrite),
    hiddenSubagent: evaluateRoleAssistantContracts(hiddenSubagent),
    memoryOnlyTrust: evaluateRoleAssistantContracts(memoryOnlyTrust),
    missingEscalation: evaluateRoleAssistantContracts(missingEscalation),
    missingRefs: evaluateRoleAssistantContracts(missingRefs),
    rawPrivateValue: evaluateRoleAssistantContracts(rawPrivateValue),
    runtimeAttempt: evaluateRoleAssistantContracts(runtimeAttempt),
  }
  return {
    ok: healthy.ok === true && Object.values(results).every(result => result.ok === false),
    invariant: 'Role assistant contracts pass with six visible role examples and reject missing role/source/ref/escalation, memory-only current claims, unapproved writes, raw private values, runtime side effects, new authority, and hidden subagents.',
    healthy,
    missingRoleRejected: results.missingRole.ok === false,
    missingSourcesRejected: results.missingSources.ok === false,
    unapprovedWriteRejected: results.unapprovedWrite.ok === false,
    hiddenSubagentRejected: results.hiddenSubagent.ok === false,
    memoryOnlyTrustRejected: results.memoryOnlyTrust.ok === false,
    missingEscalationRejected: results.missingEscalation.ok === false,
    missingRefsRejected: results.missingRefs.ok === false,
    rawPrivateValueRejected: results.rawPrivateValue.ok === false,
    runtimeAttemptRejected: results.runtimeAttempt.ok === false,
    brokenFixtures: results,
  }
}
