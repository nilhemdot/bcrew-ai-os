export const AGENT_010_CARD_ID = 'AGENT-010'
export const AGENT_010_CLOSEOUT_KEY = 'personal-agent-onboarding-contract-v1'
export const AGENT_010_PLAN_PATH = 'docs/process/agent-010-personal-agent-onboarding-contract-plan.md'
export const AGENT_010_APPROVAL_PATH = 'docs/process/approvals/AGENT-010.json'
export const AGENT_010_SCRIPT_PATH = 'scripts/process-agent-010-check.mjs'
export const AGENT_010_DOC_PATH = 'docs/agents/personal-agent-onboarding.md'
export const AGENT_010_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-18-agent-010-personal-agent-onboarding-closeout.md'
export const AGENT_010_SPRINT_ID = 'agent-010-personal-agent-onboarding-2026-05-18'

export const AGENT_010_CHANGED_FILES = [
  'lib/personal-agent-onboarding-contract.js',
  'scripts/process-agent-010-check.mjs',
  'docs/agents/personal-agent-onboarding.md',
  'lib/foundation-core-governance-verifier.js',
  'lib/foundation-runtime-reliability-verifier.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'scripts/foundation-verify.mjs',
  'lib/foundation-build-closeout-agent-runtime-records.js',
  'docs/process/agent-010-personal-agent-onboarding-contract-plan.md',
  'docs/process/approvals/AGENT-010.json',
  'docs/_archive/handoffs/2026-05-18-agent-010-personal-agent-onboarding-closeout.md',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'package.json',
]

export const AGENT_010_PROOF_COMMANDS = [
  'node --check lib/personal-agent-onboarding-contract.js lib/foundation-core-governance-verifier.js lib/foundation-runtime-reliability-verifier.js scripts/process-agent-010-check.mjs scripts/foundation-verify.mjs',
  'npm run process:agent-010-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=AGENT-010 --planApprovalRef=docs/process/approvals/AGENT-010.json --closeoutKey=personal-agent-onboarding-contract-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=AGENT-010 --closeoutKey=personal-agent-onboarding-contract-v1',
  'npm run process:foundation-ship -- --card=AGENT-010 --planApprovalRef=docs/process/approvals/AGENT-010.json --closeoutKey=personal-agent-onboarding-contract-v1 --commitRef=HEAD',
]

export const AGENT_010_NOT_NEXT_BOUNDARIES = [
  'Do not build Harlan UI or feature work.',
  'Do not launch live agent runtime work.',
  'Do not run live extraction.',
  'Do not call providers or models.',
  'Do not send Gmail, ClickUp, Drive, Slack, Telegram, or Agent Feedback mutations.',
  'Do not mutate Google Drive permissions.',
  'Do not work MEETING-VAULT-ACL-001 Phase B or historical Meeting Vault cleanup from this sprint.',
  'Do not send request-access emails.',
  'Do not copy raw private profile values into repo truth.',
  'Do not roll this out to team agents.',
  'Do not launch hidden subagents or parallel builders.',
]

const PRIVATE_STORAGE = 'private_profile_store_not_repo_truth'
const MUTATING_ACTION_KINDS = new Set(['external_send', 'external_write', 'drive_mutation', 'live_extraction', 'provider_call', 'model_call', 'paid_run'])

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
  violations.push({ subject: subject || 'personal-agent-onboarding-contract', ruleId, detail })
}

function mutates(action = {}) {
  return MUTATING_ACTION_KINDS.has(text(action.kind)) || action.externalWrite === true || action.writeEnabled === true
}

export function buildPersonalAgentOnboardingContract(overrides = {}) {
  return {
    cardId: AGENT_010_CARD_ID,
    closeoutKey: AGENT_010_CLOSEOUT_KEY,
    ownerLayer: 'Foundation',
    contractVersion: 1,
    contractOnly: true,
    implementationStarted: false,
    liveAgentRuntimeStarted: false,
    extractionStarted: false,
    modelCallsStarted: false,
    externalWritesStarted: false,
    hiddenSubagentsSpawned: false,
    rawPrivateProfileValuesInRepo: false,
    prerequisites: [
      { cardId: 'FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001', closeoutKey: 'foundation-agent-usefulness-runtime-gates-v1' },
      { cardId: 'AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001', closeoutKey: 'agent-live-answer-preflight-gate-v1' },
      { cardId: 'AGENT-CAPABILITY-REGISTRY-001', closeoutKey: 'agent-capability-registry-v1' },
      { cardId: 'AGENT-TEMPLATE-RUNTIME-CONTRACT-001', closeoutKey: 'agent-template-runtime-contract-v1' },
      { cardId: 'OLD-SYSTEM-AGENT-ONBOARDING-HARVEST-001', closeoutKey: 'old-system-agent-onboarding-harvest-v1' },
    ],
    privacyTiers: [
      { tierId: 'repo_doctrine', storage: 'repo_truth', allowedContent: 'schema, policy, and examples without private values' },
      { tierId: 'private_profile', storage: PRIVATE_STORAGE, allowedContent: 'human-provided profile facts and preferences' },
      { tierId: 'source_backed_business', storage: 'source_contract_or_live_api', allowedContent: 'business facts with source IDs and freshness stamps' },
      { tierId: 'sensitive_personal', storage: PRIVATE_STORAGE, allowedContent: 'optional personal context only when explicitly shared' },
    ],
    profileFields: [
      { fieldId: 'core_responsibilities', privacyTier: 'private_profile', storage: PRIVATE_STORAGE, updateRule: 'explicit_answer_or_confirmed_edit', requiredForPilot: true },
      { fieldId: 'attract_grow_retain_connection', privacyTier: 'private_profile', storage: PRIVATE_STORAGE, updateRule: 'explicit_answer_or_confirmed_edit', requiredForPilot: true },
      { fieldId: 'trusted_systems_checked', privacyTier: 'private_profile', storage: PRIVATE_STORAGE, updateRule: 'explicit_answer_or_confirmed_edit', requiredForPilot: true },
      { fieldId: 'information_friction', privacyTier: 'private_profile', storage: PRIVATE_STORAGE, updateRule: 'explicit_answer_or_confirmed_edit', requiredForPilot: true },
      { fieldId: 'preferred_morning_value', privacyTier: 'private_profile', storage: PRIVATE_STORAGE, updateRule: 'explicit_answer_or_confirmed_edit', requiredForPilot: true },
      { fieldId: 'role_specific_challenge', privacyTier: 'private_profile', storage: PRIVATE_STORAGE, updateRule: 'explicit_answer_or_confirmed_edit', requiredForPilot: true },
      { fieldId: 'communication_preference', privacyTier: 'private_profile', storage: PRIVATE_STORAGE, updateRule: 'explicit_answer_or_confirmed_edit', requiredForPilot: true },
      { fieldId: 'privacy_and_memory_scope', privacyTier: 'private_profile', storage: PRIVATE_STORAGE, updateRule: 'explicit_answer_or_confirmed_edit', requiredForPilot: true },
      { fieldId: 'cadence_preference', privacyTier: 'private_profile', storage: PRIVATE_STORAGE, updateRule: 'explicit_answer_or_confirmed_edit', requiredForPilot: true },
      { fieldId: 'examples_of_useful_help', privacyTier: 'private_profile', storage: PRIVATE_STORAGE, updateRule: 'feedback_confirmed', requiredForPilot: false },
      { fieldId: 'examples_of_annoying_help', privacyTier: 'private_profile', storage: PRIVATE_STORAGE, updateRule: 'feedback_confirmed', requiredForPilot: false },
    ],
    calibrationFlow: [
      { stepId: 'first_useful_read', kind: 'source_backed_read', requiresPreflight: true, question: null },
      { stepId: 'responsibilities', kind: 'interview_question', question: 'What are your top 3-5 core responsibilities?' },
      { stepId: 'agr_connection', kind: 'interview_question', question: 'How does your work connect to Attract, Grow, and Retain?' },
      { stepId: 'systems_and_friction', kind: 'interview_question', question: 'What tools and systems do you check most, and what info do you burn time finding?' },
      { stepId: 'morning_value', kind: 'interview_question', question: 'What would be most useful to get every morning without asking?' },
      { stepId: 'role_challenge', kind: 'interview_question', question: 'What is your role-specific coaching or visibility challenge right now?' },
      { stepId: 'communication_preference', kind: 'interview_question', question: 'How do you prefer updates: short message, email summary, or voice note?' },
      { stepId: 'privacy_confirmation', kind: 'consent_boundary', question: 'What should this agent remember, avoid, or ask before using?' },
    ],
    firstUsefulRead: {
      requiredBeforeFeatureTour: true,
      requiresLiveAnswerPreflight: 'agent-live-answer-preflight-gate-v1',
      requiresCapabilityRegistry: 'agent-capability-registry-v1',
      allowedSourceLookups: [
        { sourceId: 'foundation-hub:current-sprint', kind: 'live_api', route: '/api/foundation/current-sprint', access: 'read', approvalRequired: false },
        { sourceId: 'foundation-hub:system-health', kind: 'live_api', route: '/api/foundation-hub', access: 'read', approvalRequired: false },
        { sourceId: 'source-of-truth:contracts', kind: 'live_api', route: '/api/source-of-truth', access: 'read', approvalRequired: false },
      ],
    },
    dailyNuggetPolicy: {
      maxPerDay: 1,
      sourceBackedWhenBusinessClaim: true,
      personalContextRequiresExplicitShare: true,
      muteOrRedirectRequired: true,
      externalSendEnabledByDefault: false,
      approvalRequiredForSend: true,
    },
    feedbackLoop: {
      feedbackRequiredAfterFirstUsefulInteractions: true,
      updateProfileFromFeedback: 'confirmed_private_profile_only',
      nonResponsePolicy: 'pause_and_surface_owner_visible_adoption_risk',
      repeatedNudgePolicy: 'forbidden',
      failureVisibility: 'owner_visible',
    },
    updateRules: [
      { actionId: 'propose_profile_update', kind: 'private_profile_update', writeEnabled: false, approvalRequired: true, destination: PRIVATE_STORAGE },
      { actionId: 'write_repo_doctrine', kind: 'repo_truth_schema_update', writeEnabled: true, approvalRequired: true, destination: 'repo_truth', privateValuesAllowed: false },
      { actionId: 'send_daily_nugget', kind: 'external_send', writeEnabled: false, approvalRequired: true, destination: 'approved_channel_only' },
    ],
    notNextBoundaries: AGENT_010_NOT_NEXT_BOUNDARIES,
    ...overrides,
  }
}

export function evaluatePersonalAgentOnboardingContract(contract = buildPersonalAgentOnboardingContract()) {
  const violations = []
  if (contract.ownerLayer !== 'Foundation') addViolation(violations, contract.cardId, 'foundation_owner_required', contract.ownerLayer || 'missing')
  if (contract.contractOnly !== true) addViolation(violations, contract.cardId, 'contract_only_required', String(contract.contractOnly))
  if (contract.implementationStarted === true || contract.liveAgentRuntimeStarted === true) addViolation(violations, contract.cardId, 'runtime_implementation_blocked', 'AGENT-010 is contract/proof only')
  if (contract.extractionStarted === true) addViolation(violations, contract.cardId, 'live_extraction_blocked', 'live extraction is not approved')
  if (contract.modelCallsStarted === true) addViolation(violations, contract.cardId, 'model_call_blocked', 'model/provider calls are not approved')
  if (contract.externalWritesStarted === true) addViolation(violations, contract.cardId, 'external_write_blocked', 'external writes are not approved')
  if (contract.hiddenSubagentsSpawned === true) addViolation(violations, contract.cardId, 'hidden_subagent_blocked', 'hidden workers require explicit approval')
  if (contract.rawPrivateProfileValuesInRepo === true) addViolation(violations, contract.cardId, 'raw_private_profile_repo_blocked', 'profile values cannot be repo truth')

  if (list(contract.prerequisites).length < 5) addViolation(violations, contract.cardId, 'prerequisites_required', 'runtime gates, template, and old-system harvest required')
  if (!list(contract.prerequisites).some(item => item.cardId === 'OLD-SYSTEM-AGENT-ONBOARDING-HARVEST-001')) addViolation(violations, contract.cardId, 'old_system_harvest_required', 'AGENT-010 must consume harvest output')
  if (list(contract.privacyTiers).length < 4) addViolation(violations, contract.cardId, 'privacy_tiers_required', 'repo/private/source/sensitive tiers required')
  if (list(contract.profileFields).length < 10) addViolation(violations, contract.cardId, 'profile_fields_required', 'profile schema too thin')
  if (list(contract.calibrationFlow).length < 8) addViolation(violations, contract.cardId, 'calibration_flow_required', 'calibration flow too thin')

  for (const field of list(contract.profileFields)) {
    if (!text(field.fieldId) || !text(field.privacyTier) || !text(field.storage) || !text(field.updateRule)) addViolation(violations, field.fieldId, 'profile_field_contract_required', 'field id, tier, storage, update rule required')
    if (field.storage === 'repo_truth') addViolation(violations, field.fieldId, 'private_profile_repo_storage_blocked', 'private profile fields must not store values in repo truth')
    if (field.value || field.sampleValue || field.rawValue) addViolation(violations, field.fieldId, 'raw_profile_value_blocked', 'profile schema may not include private values')
  }
  for (const step of list(contract.calibrationFlow)) {
    if (!text(step.stepId) || !text(step.kind)) addViolation(violations, step.stepId, 'calibration_step_contract_required', 'step id and kind required')
    if (step.kind === 'interview_question' && !text(step.question)) addViolation(violations, step.stepId, 'calibration_question_required', 'interview steps need question text')
  }
  if (!list(contract.calibrationFlow).some(step => step.stepId === 'first_useful_read' && step.requiresPreflight === true)) addViolation(violations, contract.cardId, 'first_useful_read_required', 'onboarding must show value before setup')
  if (!text(contract.firstUsefulRead?.requiresLiveAnswerPreflight) || !text(contract.firstUsefulRead?.requiresCapabilityRegistry)) addViolation(violations, contract.cardId, 'first_useful_read_preflight_required', 'first read needs preflight and capability registry')
  for (const lookup of list(contract.firstUsefulRead?.allowedSourceLookups)) {
    if (!text(lookup.sourceId) || lookup.access !== 'read' || lookup.approvalRequired !== false) addViolation(violations, lookup.sourceId, 'source_lookup_readonly_required', 'allowed source lookups must be read-only and approval-free')
  }
  if (Number(contract.dailyNuggetPolicy?.maxPerDay) !== 1) addViolation(violations, contract.cardId, 'daily_nugget_limit_required', 'daily nugget must be capped at one')
  if (contract.dailyNuggetPolicy?.sourceBackedWhenBusinessClaim !== true || contract.dailyNuggetPolicy?.muteOrRedirectRequired !== true) addViolation(violations, contract.cardId, 'daily_nugget_safety_required', 'nugget needs source backing and mute/redirect')
  if (contract.dailyNuggetPolicy?.externalSendEnabledByDefault !== false || contract.dailyNuggetPolicy?.approvalRequiredForSend !== true) addViolation(violations, contract.cardId, 'daily_nugget_send_approval_required', 'send is not enabled by default')
  if (contract.feedbackLoop?.feedbackRequiredAfterFirstUsefulInteractions !== true || contract.feedbackLoop?.repeatedNudgePolicy !== 'forbidden') addViolation(violations, contract.cardId, 'feedback_loop_required', 'feedback loop must block repeated nudges')
  if (contract.feedbackLoop?.nonResponsePolicy !== 'pause_and_surface_owner_visible_adoption_risk') addViolation(violations, contract.cardId, 'nonresponse_fail_closed_required', contract.feedbackLoop?.nonResponsePolicy || 'missing')

  for (const action of list(contract.updateRules)) {
    if (!text(action.actionId) || !text(action.kind) || !text(action.destination)) addViolation(violations, action.actionId, 'update_rule_contract_required', 'action id, kind, destination required')
    if (mutates(action) && action.approvalRequired !== true) addViolation(violations, action.actionId, 'mutating_action_approval_required', action.kind)
    if (action.destination === 'repo_truth' && action.privateValuesAllowed !== false) addViolation(violations, action.actionId, 'repo_truth_private_values_blocked', 'repo truth can contain schema only')
  }

  return {
    ok: violations.length === 0,
    status: violations.length ? 'blocked' : 'ready',
    cardId: contract.cardId,
    closeoutKey: contract.closeoutKey,
    violations,
    summary: {
      profileFieldCount: list(contract.profileFields).length,
      calibrationStepCount: list(contract.calibrationFlow).length,
      allowedSourceLookupCount: list(contract.firstUsefulRead?.allowedSourceLookups).length,
      violationCount: violations.length,
    },
  }
}

export function buildPersonalAgentOnboardingContractDogfoodProof() {
  const healthyContract = buildPersonalAgentOnboardingContract()
  const healthy = evaluatePersonalAgentOnboardingContract(healthyContract)
  const missingProfile = clone(healthyContract)
  missingProfile.profileFields = []
  const repoStoredProfile = clone(healthyContract)
  repoStoredProfile.profileFields[0].storage = 'repo_truth'
  const rawPrivateValue = clone(healthyContract)
  rawPrivateValue.profileFields[1].value = 'private profile value'
  const thinCalibration = clone(healthyContract)
  thinCalibration.calibrationFlow = [{ stepId: 'setup', kind: 'interview_question', question: 'Name?' }]
  const spammyNugget = clone(healthyContract)
  spammyNugget.dailyNuggetPolicy.maxPerDay = 5
  spammyNugget.dailyNuggetPolicy.externalSendEnabledByDefault = true
  const noisyFeedback = clone(healthyContract)
  noisyFeedback.feedbackLoop.repeatedNudgePolicy = 'repeat_until_answered'
  const unsafeLookup = clone(healthyContract)
  unsafeLookup.firstUsefulRead.allowedSourceLookups[0].access = 'write'
  const runtimeAttempt = buildPersonalAgentOnboardingContract({
    implementationStarted: true,
    liveAgentRuntimeStarted: true,
    extractionStarted: true,
    modelCallsStarted: true,
    externalWritesStarted: true,
    hiddenSubagentsSpawned: true,
  })
  const results = {
    missingProfile: evaluatePersonalAgentOnboardingContract(missingProfile),
    repoStoredProfile: evaluatePersonalAgentOnboardingContract(repoStoredProfile),
    rawPrivateValue: evaluatePersonalAgentOnboardingContract(rawPrivateValue),
    thinCalibration: evaluatePersonalAgentOnboardingContract(thinCalibration),
    spammyNugget: evaluatePersonalAgentOnboardingContract(spammyNugget),
    noisyFeedback: evaluatePersonalAgentOnboardingContract(noisyFeedback),
    unsafeLookup: evaluatePersonalAgentOnboardingContract(unsafeLookup),
    runtimeAttempt: evaluatePersonalAgentOnboardingContract(runtimeAttempt),
  }
  return {
    ok: healthy.ok === true && Object.values(results).every(result => result.ok === false),
    invariant: 'Personal-agent onboarding contract passes with private profile schema, calibration, daily nugget, feedback, source lookup, and update rules; missing/thin/private-leaking/spammy/runtime fixtures fail closed.',
    healthy,
    missingProfileRejected: results.missingProfile.ok === false,
    repoStoredProfileRejected: results.repoStoredProfile.ok === false,
    rawPrivateValueRejected: results.rawPrivateValue.ok === false,
    thinCalibrationRejected: results.thinCalibration.ok === false,
    spammyNuggetRejected: results.spammyNugget.ok === false,
    noisyFeedbackRejected: results.noisyFeedback.ok === false,
    unsafeLookupRejected: results.unsafeLookup.ok === false,
    runtimeAttemptRejected: results.runtimeAttempt.ok === false,
  }
}
