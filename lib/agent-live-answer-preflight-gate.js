export const AGENT_LIVE_ANSWER_PREFLIGHT_GATE_CARD_ID = 'AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001'
export const AGENT_LIVE_ANSWER_PREFLIGHT_GATE_CLOSEOUT_KEY = 'agent-live-answer-preflight-gate-v1'
export const AGENT_LIVE_ANSWER_PREFLIGHT_GATE_PLAN_PATH = 'docs/process/agent-live-answer-preflight-gate-001-plan.md'
export const AGENT_LIVE_ANSWER_PREFLIGHT_GATE_APPROVAL_PATH = 'docs/process/approvals/AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001.json'
export const AGENT_LIVE_ANSWER_PREFLIGHT_GATE_SCRIPT_PATH = 'scripts/process-agent-live-answer-preflight-gate-check.mjs'
export const AGENT_LIVE_ANSWER_PREFLIGHT_GATE_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-18-agent-live-answer-preflight-gate-closeout.md'
export const AGENT_LIVE_ANSWER_PREFLIGHT_GATE_SPRINT_ID = 'agent-live-answer-preflight-gate-2026-05-18'

export const AGENT_LIVE_ANSWER_PREFLIGHT_GATE_CHANGED_FILES = [
  'lib/agent-live-answer-preflight-gate.js',
  'scripts/process-agent-live-answer-preflight-gate-check.mjs',
  'lib/foundation-runtime-reliability-verifier.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'scripts/foundation-verify.mjs',
  'lib/foundation-build-closeout-agent-runtime-records.js',
  'docs/process/agent-live-answer-preflight-gate-001-plan.md',
  'docs/process/approvals/AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001.json',
  'docs/_archive/handoffs/2026-05-18-agent-live-answer-preflight-gate-closeout.md',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'package.json',
]

export const AGENT_LIVE_ANSWER_PREFLIGHT_GATE_PROOF_COMMANDS = [
  'node --check lib/agent-live-answer-preflight-gate.js lib/foundation-runtime-reliability-verifier.js scripts/process-agent-live-answer-preflight-gate-check.mjs scripts/foundation-verify.mjs',
  'npm run process:agent-live-answer-preflight-gate-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001 --planApprovalRef=docs/process/approvals/AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001.json --closeoutKey=agent-live-answer-preflight-gate-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001 --closeoutKey=agent-live-answer-preflight-gate-v1',
  'npm run process:foundation-ship -- --card=AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001 --planApprovalRef=docs/process/approvals/AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001.json --closeoutKey=agent-live-answer-preflight-gate-v1 --commitRef=HEAD',
]

export const AGENT_LIVE_ANSWER_PREFLIGHT_NOT_NEXT_BOUNDARIES = [
  'Do not build Harlan UI or feature work.',
  'Do not launch live agent runtime work.',
  'Do not implement the capability registry in this card.',
  'Do not run live extraction.',
  'Do not call providers or models.',
  'Do not send Gmail, ClickUp, Drive, Slack, or Agent Feedback mutations.',
  'Do not mutate Google Drive permissions.',
  'Do not work MEETING-VAULT-ACL-001 Phase B or historical Meeting Vault cleanup from this sprint.',
  'Do not launch hidden subagents or parallel builders.',
]

export const AGENT_LIVE_ANSWER_CLAIM_CLASSES = Object.freeze([
  {
    claimClass: 'system_health_status',
    requiredLookup: 'Foundation Hub or System Health API',
    allowedSourceKinds: ['live_api'],
    allowedRoutes: ['/api/foundation-hub', '/api/foundation/system-health'],
  },
  {
    claimClass: 'builder_status',
    requiredLookup: 'Current Sprint and build-log truth',
    allowedSourceKinds: ['live_api', 'foundation_db'],
    allowedRoutes: ['/api/foundation/current-sprint', '/api/foundation/build-log'],
  },
  {
    claimClass: 'repo_status',
    requiredLookup: 'local git status command',
    allowedSourceKinds: ['local_command'],
    allowedCommands: ['git status --short --branch'],
  },
  {
    claimClass: 'source_freshness',
    requiredLookup: 'Source of Truth API',
    allowedSourceKinds: ['live_api'],
    allowedRoutes: ['/api/source-of-truth', '/api/foundation-hub'],
  },
  {
    claimClass: 'audit_run_status',
    requiredLookup: 'Foundation Hub audit/build log truth',
    allowedSourceKinds: ['live_api', 'foundation_db'],
    allowedRoutes: ['/api/foundation-hub', '/api/foundation/build-log'],
  },
])

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

function addViolation(violations, answerId, ruleId, detail = '') {
  violations.push({ answerId: answerId || 'agent-live-answer-preflight', ruleId, detail })
}

function findClaimClass(gate = {}, claimClass = '') {
  return list(gate.claimClasses).find(item => item.claimClass === claimClass) || null
}

function isAllowedSource(preflight = {}, claimClass = {}) {
  if (!claimClass) return false
  if (!list(claimClass.allowedSourceKinds).includes(preflight.sourceKind)) return false
  if (preflight.sourceKind === 'live_api') return list(claimClass.allowedRoutes).includes(preflight.route)
  if (preflight.sourceKind === 'local_command') return list(claimClass.allowedCommands).includes(preflight.command)
  if (preflight.sourceKind === 'foundation_db') return Boolean(text(preflight.sourceId))
  return false
}

function isFreshPreflight(preflight = {}, claimClass = {}, now, defaultMaxAgeMinutes) {
  const queriedAt = toDate(preflight.queriedAt)
  const maxAgeMinutes = Number(preflight.maxAgeMinutes || defaultMaxAgeMinutes || 10)
  return preflight.status === 'available' &&
    isAllowedSource(preflight, claimClass) &&
    text(preflight.sourceId) &&
    text(preflight.lookupRef) &&
    text(preflight.evidenceStamp) &&
    queriedAt &&
    minutesBetween(now, queriedAt) <= maxAgeMinutes
}

function isCurrentAnswer(answer = {}) {
  return answer.answerLabel === 'current' || answer.currentness === 'current'
}

function sourceIsBlocked(preflight = {}) {
  return ['unavailable', 'tool_missing', 'auth_blocked', 'blocked_by_approval'].includes(preflight.status)
}

export function buildAgentLiveAnswerPreflightGate(overrides = {}) {
  const now = '2026-05-18T19:15:00.000-04:00'
  return {
    cardId: AGENT_LIVE_ANSWER_PREFLIGHT_GATE_CARD_ID,
    closeoutKey: AGENT_LIVE_ANSWER_PREFLIGHT_GATE_CLOSEOUT_KEY,
    ownerLayer: 'Foundation',
    proposalOnly: true,
    implementationStarted: false,
    liveAgentRuntimeStarted: false,
    extractionStarted: false,
    modelCallsStarted: false,
    externalWritesStarted: false,
    policy: {
      now,
      maxPreflightAgeMinutes: 10,
      currentAnswerRequiresEvidenceStamp: true,
      unavailableSourceMustBeBlockedOrLastKnown: true,
    },
    claimClasses: AGENT_LIVE_ANSWER_CLAIM_CLASSES,
    answers: [
      {
        answerId: 'fresh-system-health-current',
        agentId: 'harlan-pilot',
        claimClass: 'system_health_status',
        answerLabel: 'current',
        statement: 'Foundation System Health is current from the latest Foundation Hub read.',
        asOf: now,
        preflight: {
          status: 'available',
          sourceKind: 'live_api',
          route: '/api/foundation-hub',
          sourceId: 'foundation-hub:foundationSystemHealth',
          lookupRef: 'GET /api/foundation-hub?view=full',
          queriedAt: '2026-05-18T19:14:30.000-04:00',
          evidenceStamp: 'foundation-hub:foundationSystemHealth:2026-05-18T19:14:30-04:00',
        },
        failureVisibility: {
          publicVisible: true,
          required: false,
        },
      },
      {
        answerId: 'source-unavailable-blocked',
        agentId: 'harlan-pilot',
        claimClass: 'source_freshness',
        answerLabel: 'blocked',
        statement: 'I cannot report current source freshness because the Source of Truth API is unavailable.',
        staleWarning: 'Source freshness is not current; last-known context only.',
        preflight: {
          status: 'unavailable',
          sourceKind: 'live_api',
          route: '/api/source-of-truth',
          sourceId: 'source-of-truth:contracts',
          lookupRef: 'GET /api/source-of-truth',
          queriedAt: '2026-05-18T19:14:00.000-04:00',
          evidenceStamp: 'source-of-truth:unavailable:2026-05-18T19:14:00-04:00',
        },
        failureVisibility: {
          publicVisible: true,
          required: true,
          nextAction: 'Retry the live source or report last-known only.',
        },
      },
    ],
    notNextBoundaries: AGENT_LIVE_ANSWER_PREFLIGHT_NOT_NEXT_BOUNDARIES,
    ...overrides,
  }
}

export function evaluateAgentLiveAnswerPreflightGate(gate = buildAgentLiveAnswerPreflightGate()) {
  const violations = []
  const policy = gate.policy || {}
  const now = toDate(policy.now) || new Date('2026-05-18T19:15:00.000-04:00')
  const maxAgeMinutes = Number(policy.maxPreflightAgeMinutes || 10)
  const claimClasses = list(gate.claimClasses)
  const answers = list(gate.answers)

  if (gate.ownerLayer !== 'Foundation') addViolation(violations, gate.cardId, 'foundation_owner_required', gate.ownerLayer || 'missing')
  if (gate.proposalOnly !== true) addViolation(violations, gate.cardId, 'proposal_only_required', String(gate.proposalOnly))
  if (gate.implementationStarted === true || gate.liveAgentRuntimeStarted === true) addViolation(violations, gate.cardId, 'runtime_implementation_started', 'this card proves the contract only')
  if (gate.extractionStarted === true) addViolation(violations, gate.cardId, 'live_extraction_started', 'live extraction is not approved')
  if (gate.modelCallsStarted === true) addViolation(violations, gate.cardId, 'model_call_started', 'model/provider calls are not approved')
  if (gate.externalWritesStarted === true) addViolation(violations, gate.cardId, 'external_write_started', 'external writes are not approved')

  for (const expected of AGENT_LIVE_ANSWER_CLAIM_CLASSES) {
    const claimClass = findClaimClass(gate, expected.claimClass)
    if (!claimClass) {
      addViolation(violations, expected.claimClass, 'claim_class_missing', expected.requiredLookup)
      continue
    }
    if (!text(claimClass.requiredLookup)) addViolation(violations, expected.claimClass, 'required_lookup_missing', 'claim class needs a lookup rule')
    if (!list(claimClass.allowedSourceKinds).length) addViolation(violations, expected.claimClass, 'allowed_source_kind_missing', 'claim class needs source kinds')
  }

  if (!answers.length) addViolation(violations, gate.cardId, 'answer_fixture_required', 'at least one answer fixture is required')

  for (const answer of answers) {
    const answerId = text(answer.answerId)
    const claimClass = findClaimClass(gate, answer.claimClass)
    const preflight = answer.preflight || {}
    const hasPreflight = Object.keys(preflight).length > 0
    const fresh = isFreshPreflight(preflight, claimClass, now, maxAgeMinutes)
    const blocked = sourceIsBlocked(preflight)
    const stale = hasPreflight && preflight.queriedAt && !fresh && !blocked

    if (!answerId || !text(answer.agentId) || !text(answer.claimClass)) addViolation(violations, answerId, 'answer_identity_required', 'answerId, agentId, and claimClass are required')
    if (!claimClass) addViolation(violations, answerId, 'known_claim_class_required', answer.claimClass || 'missing')
    if (isCurrentAnswer(answer) && !fresh) addViolation(violations, answerId, 'fresh_preflight_required_for_current_answer', 'current operational answers need fresh live/local proof')
    if (isCurrentAnswer(answer) && !toDate(answer.asOf)) addViolation(violations, answerId, 'as_of_required_for_current_answer', 'current answers need as-of timestamp')
    if (hasPreflight && !isAllowedSource(preflight, claimClass)) addViolation(violations, answerId, 'claim_class_source_lookup_mismatch', `${preflight.sourceKind || 'missing'} ${preflight.route || preflight.command || ''}`.trim())
    if (isCurrentAnswer(answer) && preflight.sourceKind === 'memory') addViolation(violations, answerId, 'memory_only_current_answer_blocked', 'memory is last-known only')
    if (isCurrentAnswer(answer) && !text(preflight.evidenceStamp)) addViolation(violations, answerId, 'evidence_stamp_required', 'fresh current answers need evidence stamp')
    if ((blocked || stale) && !['blocked', 'last_known'].includes(answer.answerLabel)) addViolation(violations, answerId, 'unavailable_or_stale_source_cannot_sound_current', answer.answerLabel || 'missing')
    if ((blocked || stale) && !text(answer.staleWarning)) addViolation(violations, answerId, 'stale_or_unavailable_wording_required', 'blocked/stale reads need wording')
    if (preflight.status === 'tool_missing' && !text(answer.missingToolWording)) addViolation(violations, answerId, 'missing_tool_wording_required', 'missing tool answers need explicit wording')
    if ((blocked || stale) && answer.failureVisibility?.publicVisible !== true) addViolation(violations, answerId, 'failure_visibility_required', 'blocked/stale reads need visible failure state')
  }

  return {
    ok: violations.length === 0,
    status: violations.length ? 'blocked' : 'ready',
    cardId: gate.cardId,
    closeoutKey: gate.closeoutKey,
    violations,
    summary: {
      claimClassCount: claimClasses.length,
      answerFixtureCount: answers.length,
      currentAnswerCount: answers.filter(isCurrentAnswer).length,
      violationCount: violations.length,
    },
  }
}

export function buildAgentLiveAnswerPreflightGateDogfoodProof() {
  const healthy = evaluateAgentLiveAnswerPreflightGate(buildAgentLiveAnswerPreflightGate())
  const memoryCurrent = evaluateAgentLiveAnswerPreflightGate(buildAgentLiveAnswerPreflightGate({
    answers: [{
      ...buildAgentLiveAnswerPreflightGate().answers[0],
      answerId: 'memory-current',
      preflight: { status: 'available', sourceKind: 'memory', sourceId: 'memory/2026-05-17.md', lookupRef: 'memory', evidenceStamp: 'memory', queriedAt: '2026-05-18T19:14:30.000-04:00' },
    }],
  }))
  const missingPreflight = evaluateAgentLiveAnswerPreflightGate(buildAgentLiveAnswerPreflightGate({
    answers: [{ ...buildAgentLiveAnswerPreflightGate().answers[0], answerId: 'missing-preflight', preflight: {} }],
  }))
  const staleCurrent = evaluateAgentLiveAnswerPreflightGate(buildAgentLiveAnswerPreflightGate({
    answers: [{
      ...buildAgentLiveAnswerPreflightGate().answers[0],
      answerId: 'stale-current',
      preflight: { ...buildAgentLiveAnswerPreflightGate().answers[0].preflight, queriedAt: '2026-05-18T18:00:00.000-04:00' },
    }],
  }))
  const missingToolCurrent = evaluateAgentLiveAnswerPreflightGate(buildAgentLiveAnswerPreflightGate({
    answers: [{
      ...buildAgentLiveAnswerPreflightGate().answers[0],
      answerId: 'missing-tool-current',
      preflight: { status: 'tool_missing', sourceKind: 'local_command', command: 'git status --short --branch', sourceId: 'git-status', lookupRef: 'git status', evidenceStamp: 'tool-missing', queriedAt: '2026-05-18T19:14:30.000-04:00' },
    }],
  }))
  const unavailableNoWording = evaluateAgentLiveAnswerPreflightGate(buildAgentLiveAnswerPreflightGate({
    answers: [{ ...buildAgentLiveAnswerPreflightGate().answers[1], answerId: 'unavailable-no-wording', staleWarning: '', failureVisibility: { required: true, publicVisible: false } }],
  }))
  const missingEvidenceStamp = evaluateAgentLiveAnswerPreflightGate(buildAgentLiveAnswerPreflightGate({
    answers: [{ ...buildAgentLiveAnswerPreflightGate().answers[0], answerId: 'missing-evidence-stamp', preflight: { ...buildAgentLiveAnswerPreflightGate().answers[0].preflight, evidenceStamp: '' } }],
  }))
  const liveRunAttempt = evaluateAgentLiveAnswerPreflightGate(buildAgentLiveAnswerPreflightGate({
    liveAgentRuntimeStarted: true,
    extractionStarted: true,
    modelCallsStarted: true,
    externalWritesStarted: true,
  }))

  return {
    ok: healthy.ok === true &&
      memoryCurrent.ok === false &&
      missingPreflight.ok === false &&
      staleCurrent.ok === false &&
      missingToolCurrent.ok === false &&
      unavailableNoWording.ok === false &&
      missingEvidenceStamp.ok === false &&
      liveRunAttempt.ok === false,
    invariant: 'Fresh live/local preflight can support current operational answers; memory-only, missing preflight, stale reads, missing tools that sound current, unavailable sources without wording, missing evidence stamps, and live side effects fail closed.',
    healthy,
    memoryCurrentRejected: memoryCurrent.ok === false,
    missingPreflightRejected: missingPreflight.ok === false,
    staleCurrentRejected: staleCurrent.ok === false,
    missingToolCurrentRejected: missingToolCurrent.ok === false,
    unavailableNoWordingRejected: unavailableNoWording.ok === false,
    missingEvidenceStampRejected: missingEvidenceStamp.ok === false,
    liveRunAttemptRejected: liveRunAttempt.ok === false,
  }
}
