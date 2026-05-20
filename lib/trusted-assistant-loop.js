export const TRUSTED_ASSISTANT_LOOP_CARD_ID = 'SLICE-001'
export const TRUSTED_ASSISTANT_LOOP_CLOSEOUT_KEY = 'trusted-assistant-loop-v1'
export const TRUSTED_ASSISTANT_LOOP_PLAN_PATH = 'docs/process/slice-001-trusted-assistant-loop-plan.md'
export const TRUSTED_ASSISTANT_LOOP_APPROVAL_PATH = 'docs/process/approvals/SLICE-001.json'
export const TRUSTED_ASSISTANT_LOOP_SCRIPT_PATH = 'scripts/process-slice-001-check.mjs'
export const TRUSTED_ASSISTANT_LOOP_DOC_PATH = 'docs/agents/trusted-assistant-loop.md'
export const TRUSTED_ASSISTANT_LOOP_CLOSEOUT_PATH = 'docs/handoffs/2026-05-20-slice-001-trusted-assistant-loop-closeout.md'
export const TRUSTED_ASSISTANT_LOOP_SPRINT_ID = 'FOUNDATION-TRUSTED-LOOP-AND-SAFE-SURFACES-2026-05-20'
export const TRUSTED_ASSISTANT_LOOP_NEXT_CARD_ID = 'MARKETING-VIDEO-LAB-LIVE-SAFETY-001'

export const TRUSTED_ASSISTANT_LOOP_CHANGED_FILES = [
  'lib/trusted-assistant-loop.js',
  'scripts/process-slice-001-check.mjs',
  'docs/agents/trusted-assistant-loop.md',
  'docs/agents/README.md',
  'docs/agents/harlan.md',
  'docs/rebuild/agent-architecture.md',
  'docs/rebuild/current-runtime-map.md',
  'lib/foundation-runtime-reliability-verifier.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'lib/foundation-build-closeout-agent-runtime-records.js',
  'docs/process/slice-001-trusted-assistant-loop-plan.md',
  'docs/process/approvals/SLICE-001.json',
  'docs/handoffs/2026-05-20-slice-001-trusted-assistant-loop-closeout.md',
  'package.json',
]

export const TRUSTED_ASSISTANT_LOOP_PROOF_COMMANDS = [
  'node --check lib/trusted-assistant-loop.js lib/foundation-runtime-reliability-verifier.js scripts/process-slice-001-check.mjs',
  'npm run process:slice-001-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:foundation-ship -- --card=SLICE-001 --planApprovalRef=docs/process/approvals/SLICE-001.json --closeoutKey=trusted-assistant-loop-v1 --commitRef=HEAD',
]

export const TRUSTED_ASSISTANT_LOOP_NOT_NEXT_BOUNDARIES = [
  'Do not launch a live Harlan runtime from this card.',
  'Do not build Harlan UI, voice, avatar, or outbound identity work.',
  'Do not run live extraction or broad private backfill.',
  'Do not call providers or models as proof for this card.',
  'Do not send Gmail, Slack, Telegram, ClickUp, Drive, Calendar, or Agent Feedback messages.',
  'Do not mutate Google Drive permissions.',
  'Do not mutate credentials, provider keys, auth scopes, or source access.',
  'Do not work MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.',
  'Do not store raw private profile or memory values in repo truth.',
  'Do not launch hidden subagents or parallel builders.',
]

const REQUIRED_SOURCE_IDS = [
  'SRC-STRATEGY-001',
  'SRC-GMAIL-001',
  'SRC-GCAL-001',
  'SRC-GDRIVE-001',
]

const REQUIRED_INPUT_IDS = [
  'foundation-current-sprint',
  'foundation-system-health',
  'source-contracts',
  'strategy-docs',
  'foundation-memory-index',
  'gmail-current-context',
  'calendar-current-context',
  'drive-approved-docs',
]

const REQUIRED_OUTPUT_SECTIONS = [
  'answer',
  'evidence',
  'blocked-actions',
  'next-action',
]

const MUTATING_ACTION_KINDS = new Set([
  'external_send',
  'external_write',
  'source_write',
  'drive_permission_mutation',
  'calendar_write',
  'credential_mutation',
  'provider_config',
  'live_extraction',
  'broad_backfill',
  'model_call',
  'paid_provider_run',
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
  violations.push({ subject: subject || 'trusted-assistant-loop', ruleId, detail })
}

function actionMutates(action = {}) {
  return MUTATING_ACTION_KINDS.has(text(action.kind)) || action.externalWrite === true || action.writeEnabled === true
}

function findInput(loop = {}, inputId = '') {
  return list(loop.inputs).find(input => input.inputId === inputId) || null
}

function hasRequiredOutputSection(loop = {}, sectionId = '') {
  return list(loop.outputContract?.requiredSections).includes(sectionId)
}

export function buildTrustedAssistantLoopContract(overrides = {}) {
  return {
    cardId: TRUSTED_ASSISTANT_LOOP_CARD_ID,
    closeoutKey: TRUSTED_ASSISTANT_LOOP_CLOSEOUT_KEY,
    loopId: 'harlan-first-trusted-assistant-loop-v1',
    ownerLayer: 'Foundation',
    status: 'contract_ready',
    contractOnly: true,
    liveRuntimeStarted: false,
    modelCallsStarted: false,
    extractionStarted: false,
    externalWritesStarted: false,
    hiddenSubagentsSpawned: false,
    grantsNewAuthority: false,
    humanOwner: 'Steve',
    assistantId: 'harlan',
    orchestratorId: 'crewbert',
    purpose: 'Answer one Steve-facing assistant loop from declared, source-backed, read-only inputs before wider connector or agent expansion.',
    prerequisites: [
      { cardId: 'AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001', closeoutKey: 'agent-live-answer-preflight-gate-v1' },
      { cardId: 'AGENT-CAPABILITY-REGISTRY-001', closeoutKey: 'agent-capability-registry-v1' },
      { cardId: 'AGENT-TEMPLATE-RUNTIME-CONTRACT-001', closeoutKey: 'agent-template-runtime-contract-v1' },
      { cardId: 'AGENT-010', closeoutKey: 'personal-agent-onboarding-contract-v1' },
      { cardId: 'ROLE-ASSISTANT-CONTRACTS-001', closeoutKey: 'role-assistant-contracts-v1' },
      { cardId: 'HARLAN-PROJECT-REGISTRY-001', closeoutKey: 'harlan-project-registry-v1' },
      { cardId: 'HARLAN-OPERATOR-LOOP-V1-001', closeoutKey: 'harlan-operator-loop-v1' },
    ],
    sourcePrerequisites: [
      { sourceId: 'SRC-STRATEGY-001', statusRequired: 'verified_or_better', access: 'read', purpose: 'strategy and rebuild doctrine' },
      { sourceId: 'SRC-GMAIL-001', statusRequired: 'verified_readable_or_better', access: 'read_current_or_archived', purpose: 'approved Gmail context' },
      { sourceId: 'SRC-GCAL-001', statusRequired: 'verified_readable_or_better', access: 'read_current_or_archived', purpose: 'calendar and meeting context' },
      { sourceId: 'SRC-GDRIVE-001', statusRequired: 'verified_or_pending_revalidation_with_skip_reasons', access: 'approved_read_only', purpose: 'approved Drive docs and files' },
    ],
    inputs: [
      { inputId: 'foundation-current-sprint', kind: 'live_api', sourceId: 'foundation-current-sprint', access: 'read', requiresFreshness: true, approvalRequired: false },
      { inputId: 'foundation-system-health', kind: 'live_api', sourceId: 'foundation-system-health', access: 'read', requiresFreshness: true, approvalRequired: false },
      { inputId: 'source-contracts', kind: 'live_api', sourceId: 'source-of-truth', access: 'read', requiresFreshness: true, approvalRequired: false },
      { inputId: 'strategy-docs', kind: 'repo_docs', sourceId: 'SRC-STRATEGY-001', access: 'read', requiresFreshness: false, approvalRequired: false },
      { inputId: 'foundation-memory-index', kind: 'private_local_memory_index', sourceId: 'MEMORY-002', access: 'metadata_or_main_session_private_read', requiresFreshness: false, approvalRequired: false, repoValuesAllowed: false },
      { inputId: 'gmail-current-context', kind: 'approved_archive_or_connector_read', sourceId: 'SRC-GMAIL-001', access: 'read', requiresFreshness: true, approvalRequired: false, noBroadBackfill: true },
      { inputId: 'calendar-current-context', kind: 'approved_archive_or_connector_read', sourceId: 'SRC-GCAL-001', access: 'read', requiresFreshness: true, approvalRequired: false, noCalendarWrite: true },
      { inputId: 'drive-approved-docs', kind: 'approved_drive_read', sourceId: 'SRC-GDRIVE-001', access: 'read', requiresFreshness: false, approvalRequired: false, noPermissionMutation: true },
    ],
    allowedActions: [
      { actionId: 'answer_with_sources', kind: 'read_only_answer', enabledByDefault: true, approvalRequired: false },
      { actionId: 'draft_next_action', kind: 'draft_only', enabledByDefault: true, approvalRequired: false },
      { actionId: 'propose_action_route', kind: 'local_proposal', enabledByDefault: true, approvalRequired: false, destination: 'action_router_pending_review' },
      { actionId: 'request_send_approval', kind: 'external_send', enabledByDefault: false, approvalRequired: true },
      { actionId: 'request_drive_permission_change', kind: 'drive_permission_mutation', enabledByDefault: false, approvalRequired: true },
      { actionId: 'request_calendar_change', kind: 'calendar_write', enabledByDefault: false, approvalRequired: true },
    ],
    blockedActions: [
      'external_send_without_approval',
      'drive_permission_mutation_without_approval',
      'credential_or_provider_mutation',
      'new_source_access',
      'broad_private_backfill',
      'paid_provider_run',
      'hidden_subagents',
    ],
    outputContract: {
      requiredSections: REQUIRED_OUTPUT_SECTIONS,
      everyCurrentClaimNeedsEvidence: true,
      memoryOnlyCurrentClaimsAllowed: false,
      evidenceFields: ['sourceId', 'lookupRef', 'freshness', 'confidence', 'privacyBoundary'],
      blockedActionFormat: ['blockedAction', 'reason', 'requiredApproval', 'safeNextAction'],
      answerStatusValues: ['ready', 'degraded', 'blocked_pending_approval'],
    },
    failurePolicy: {
      missingSource: 'answer_degraded_or_blocked',
      staleCurrentClaim: 'blocked_pending_fresh_read',
      approvalBoundAction: 'park_action_continue_safe_work',
      repeatedFailure: 'repair_or_route_p0_before_normal_progression',
      privateMemoryUnavailable: 'use_last_known_metadata_only',
    },
    notNextBoundaries: TRUSTED_ASSISTANT_LOOP_NOT_NEXT_BOUNDARIES,
    ...overrides,
  }
}

export function evaluateTrustedAssistantLoopContract(loop = buildTrustedAssistantLoopContract()) {
  const violations = []
  if (loop.cardId !== TRUSTED_ASSISTANT_LOOP_CARD_ID) addViolation(violations, loop.cardId, 'card_id_required', loop.cardId || 'missing')
  if (loop.ownerLayer !== 'Foundation') addViolation(violations, loop.cardId, 'foundation_owner_required', loop.ownerLayer || 'missing')
  if (loop.contractOnly !== true) addViolation(violations, loop.cardId, 'contract_only_required', String(loop.contractOnly))
  if (loop.liveRuntimeStarted === true) addViolation(violations, loop.cardId, 'live_runtime_blocked', 'SLICE-001 proves the loop contract only')
  if (loop.modelCallsStarted === true) addViolation(violations, loop.cardId, 'model_call_blocked', 'no provider/model call is required for this proof')
  if (loop.extractionStarted === true) addViolation(violations, loop.cardId, 'live_extraction_blocked', 'no live extraction or broad backfill in this card')
  if (loop.externalWritesStarted === true) addViolation(violations, loop.cardId, 'external_write_blocked', 'external writes remain approval-bound')
  if (loop.hiddenSubagentsSpawned === true) addViolation(violations, loop.cardId, 'hidden_subagent_blocked', 'hidden subagents are not part of the first loop proof')
  if (loop.grantsNewAuthority === true) addViolation(violations, loop.cardId, 'new_authority_blocked', 'this contract consumes existing authority only')

  if (list(loop.prerequisites).length < 7) addViolation(violations, loop.cardId, 'prerequisites_required', 'agent gates, AGENT-010, role contracts, registry, and operator loop are required')
  for (const sourceId of REQUIRED_SOURCE_IDS) {
    const source = list(loop.sourcePrerequisites).find(item => item.sourceId === sourceId)
    if (!source) addViolation(violations, sourceId, 'source_prerequisite_required', 'missing source prerequisite')
    if (source && source.access !== 'read' && !String(source.access || '').includes('read')) addViolation(violations, sourceId, 'source_read_boundary_required', source.access || 'missing')
  }
  for (const inputId of REQUIRED_INPUT_IDS) {
    const input = findInput(loop, inputId)
    if (!input) {
      addViolation(violations, inputId, 'input_required', 'missing loop input')
      continue
    }
    if (!text(input.sourceId) || !text(input.kind) || !text(input.access)) addViolation(violations, inputId, 'input_contract_required', 'input needs sourceId, kind, and access')
    if (!String(input.access).includes('read') && input.access !== 'metadata_or_main_session_private_read') addViolation(violations, inputId, 'input_readonly_required', input.access)
    if (input.repoValuesAllowed === true) addViolation(violations, inputId, 'private_memory_repo_values_blocked', 'private memory values cannot become repo truth')
    if (input.noBroadBackfill === false || input.noPermissionMutation === false || input.noCalendarWrite === false) addViolation(violations, inputId, 'unsafe_source_expansion_blocked', inputId)
  }
  for (const action of list(loop.allowedActions)) {
    if (!text(action.actionId) || !text(action.kind)) addViolation(violations, action.actionId, 'action_contract_required', 'action id and kind required')
    if (MUTATING_ACTION_KINDS.has(text(action.kind)) && action.approvalRequired !== true) addViolation(violations, action.actionId, 'mutating_action_approval_required', action.kind)
    if (actionMutates(action) && (action.approvalRequired !== true || action.enabledByDefault === true)) addViolation(violations, action.actionId, 'unsafe_default_action_blocked', action.kind)
  }
  for (const sectionId of REQUIRED_OUTPUT_SECTIONS) {
    if (!hasRequiredOutputSection(loop, sectionId)) addViolation(violations, sectionId, 'output_section_required', 'missing required output section')
  }
  if (loop.outputContract?.everyCurrentClaimNeedsEvidence !== true) addViolation(violations, loop.cardId, 'current_claim_evidence_required', 'current claims need evidence')
  if (loop.outputContract?.memoryOnlyCurrentClaimsAllowed !== false) addViolation(violations, loop.cardId, 'memory_only_current_claims_blocked', 'memory cannot prove current claims')
  if (list(loop.outputContract?.evidenceFields).length < 5) addViolation(violations, loop.cardId, 'evidence_fields_required', 'sourceId, lookupRef, freshness, confidence, privacy boundary required')
  if (loop.failurePolicy?.approvalBoundAction !== 'park_action_continue_safe_work') addViolation(violations, loop.cardId, 'blockers_block_actions_required', loop.failurePolicy?.approvalBoundAction || 'missing')
  if (loop.failurePolicy?.repeatedFailure !== 'repair_or_route_p0_before_normal_progression') addViolation(violations, loop.cardId, 'repeated_failure_repair_required', loop.failurePolicy?.repeatedFailure || 'missing')
  if (!list(loop.notNextBoundaries).some(item => String(item).includes('Do not work MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.'))) addViolation(violations, loop.cardId, 'meeting_vault_phase_b_boundary_required', 'exact Drive permissions boundary required')

  return {
    ok: violations.length === 0,
    status: violations.length ? 'blocked' : 'ready',
    cardId: loop.cardId,
    closeoutKey: loop.closeoutKey,
    violations,
    summary: {
      sourcePrerequisiteCount: list(loop.sourcePrerequisites).length,
      inputCount: list(loop.inputs).length,
      allowedActionCount: list(loop.allowedActions).length,
      blockedActionCount: list(loop.blockedActions).length,
      violationCount: violations.length,
    },
  }
}

export function buildTrustedAssistantLoopDogfoodProof() {
  const healthyLoop = buildTrustedAssistantLoopContract()
  const healthy = evaluateTrustedAssistantLoopContract(healthyLoop)
  const missingSource = clone(healthyLoop)
  missingSource.sourcePrerequisites = missingSource.sourcePrerequisites.filter(item => item.sourceId !== 'SRC-GMAIL-001')
  const missingInput = clone(healthyLoop)
  missingInput.inputs = missingInput.inputs.filter(input => input.inputId !== 'drive-approved-docs')
  const memoryOnlyClaim = clone(healthyLoop)
  memoryOnlyClaim.outputContract.memoryOnlyCurrentClaimsAllowed = true
  const repoMemoryLeak = clone(healthyLoop)
  findInput(repoMemoryLeak, 'foundation-memory-index').repoValuesAllowed = true
  const unsafeDefaultWrite = clone(healthyLoop)
  unsafeDefaultWrite.allowedActions.push({ actionId: 'send_without_approval', kind: 'external_send', enabledByDefault: true, approvalRequired: false })
  const liveRuntime = buildTrustedAssistantLoopContract({
    contractOnly: false,
    liveRuntimeStarted: true,
    modelCallsStarted: true,
    extractionStarted: true,
    externalWritesStarted: true,
    hiddenSubagentsSpawned: true,
    grantsNewAuthority: true,
  })
  const broadExtraction = clone(healthyLoop)
  findInput(broadExtraction, 'gmail-current-context').noBroadBackfill = false
  const stopsWholeSprint = clone(healthyLoop)
  stopsWholeSprint.failurePolicy.approvalBoundAction = 'stop_whole_sprint'
  const missingOutput = clone(healthyLoop)
  missingOutput.outputContract.requiredSections = ['answer']

  const results = {
    missingSource: evaluateTrustedAssistantLoopContract(missingSource),
    missingInput: evaluateTrustedAssistantLoopContract(missingInput),
    memoryOnlyClaim: evaluateTrustedAssistantLoopContract(memoryOnlyClaim),
    repoMemoryLeak: evaluateTrustedAssistantLoopContract(repoMemoryLeak),
    unsafeDefaultWrite: evaluateTrustedAssistantLoopContract(unsafeDefaultWrite),
    liveRuntime: evaluateTrustedAssistantLoopContract(liveRuntime),
    broadExtraction: evaluateTrustedAssistantLoopContract(broadExtraction),
    stopsWholeSprint: evaluateTrustedAssistantLoopContract(stopsWholeSprint),
    missingOutput: evaluateTrustedAssistantLoopContract(missingOutput),
  }

  return {
    ok: healthy.ok === true && Object.values(results).every(result => result.ok === false),
    invariant: 'The trusted assistant loop passes only when required sources, read-only inputs, evidence output, approval-bound writes, and blockers-block-actions behavior are present; missing/unsafe/runtime fixtures fail closed.',
    healthy,
    missingSourceRejected: results.missingSource.ok === false,
    missingInputRejected: results.missingInput.ok === false,
    memoryOnlyClaimRejected: results.memoryOnlyClaim.ok === false,
    repoMemoryLeakRejected: results.repoMemoryLeak.ok === false,
    unsafeDefaultWriteRejected: results.unsafeDefaultWrite.ok === false,
    liveRuntimeRejected: results.liveRuntime.ok === false,
    broadExtractionRejected: results.broadExtraction.ok === false,
    stopsWholeSprintRejected: results.stopsWholeSprint.ok === false,
    missingOutputRejected: results.missingOutput.ok === false,
    failures: Object.entries(results).filter(([, result]) => result.ok !== false).map(([name, result]) => ({ name, result })),
  }
}
