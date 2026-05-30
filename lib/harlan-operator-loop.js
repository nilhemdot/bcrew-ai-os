export const HARLAN_OPERATOR_LOOP_CARD_ID = 'HARLAN-OPERATOR-LOOP-V1-001'
export const HARLAN_OPERATOR_LOOP_CLOSEOUT_KEY = 'harlan-operator-loop-v1'
export const HARLAN_OPERATOR_LOOP_PLAN_PATH = 'docs/process/harlan-operator-loop-v1-001-plan.md'
export const HARLAN_OPERATOR_LOOP_APPROVAL_PATH = 'docs/process/approvals/HARLAN-OPERATOR-LOOP-V1-001.json'
export const HARLAN_OPERATOR_LOOP_SCRIPT_PATH = 'scripts/process-harlan-operator-loop-check.mjs'
export const HARLAN_OPERATOR_LOOP_DOC_PATH = 'docs/agents/harlan-operator-loop.md'
export const HARLAN_OPERATOR_LOOP_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-18-harlan-operator-loop-closeout.md'
export const HARLAN_OPERATOR_LOOP_SPRINT_ID = 'harlan-operator-loop-2026-05-18'
export const HARLAN_OPERATOR_LOOP_NEXT_CARD_ID = 'BUILD-INTEL-CREATOR-WATCHLIST-EXPANSION-001'

export const HARLAN_OPERATOR_LOOP_REQUIRED_INPUTS = [
  'current-sprint',
  'build-log',
  'system-health',
  'nightly-audit',
  'build-lane-telemetry',
  'backlog',
  'source-action-routes',
]

export const HARLAN_OPERATOR_LOOP_REQUIRED_SECTIONS = [
  'true-now',
  'changed',
  'broken',
  'blocked',
  'owners',
  'next',
]

export const HARLAN_OPERATOR_LOOP_CHANGED_FILES = [
  'lib/harlan-operator-loop.js',
  'scripts/process-harlan-operator-loop-check.mjs',
  'docs/agents/harlan-operator-loop.md',
  'docs/agents/harlan.md',
  'lib/foundation-runtime-reliability-verifier.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'scripts/foundation-verify.mjs',
  'lib/foundation-build-closeout-agent-runtime-records.js',
  'docs/process/harlan-operator-loop-v1-001-plan.md',
  'docs/process/approvals/HARLAN-OPERATOR-LOOP-V1-001.json',
  'docs/_archive/handoffs/2026-05-18-harlan-operator-loop-closeout.md',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'package.json',
]

export const HARLAN_OPERATOR_LOOP_PROOF_COMMANDS = [
  'node --check lib/harlan-operator-loop.js lib/foundation-runtime-reliability-verifier.js scripts/process-harlan-operator-loop-check.mjs scripts/foundation-verify.mjs',
  'npm run process:harlan-operator-loop-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=HARLAN-OPERATOR-LOOP-V1-001 --planApprovalRef=docs/process/approvals/HARLAN-OPERATOR-LOOP-V1-001.json --closeoutKey=harlan-operator-loop-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=HARLAN-OPERATOR-LOOP-V1-001 --closeoutKey=harlan-operator-loop-v1',
  'npm run process:foundation-ship -- --card=HARLAN-OPERATOR-LOOP-V1-001 --planApprovalRef=docs/process/approvals/HARLAN-OPERATOR-LOOP-V1-001.json --closeoutKey=harlan-operator-loop-v1 --commitRef=HEAD',
]

export const HARLAN_OPERATOR_LOOP_NOT_NEXT_BOUNDARIES = [
  'Do not build Harlan UI or voice/avatar work.',
  'Do not launch a live Harlan runtime.',
  'Do not run live extraction.',
  'Do not call providers or models.',
  'Do not send Gmail, ClickUp, Drive, Slack, Telegram, or Agent Feedback mutations.',
  'Do not mutate Google Drive permissions.',
  'Do not work MEETING-VAULT-ACL-001 Phase B or historical Meeting Vault cleanup.',
  'Do not create or move the external Harlan home.',
  'Do not grant new project reach or external-write authority.',
  'Do not copy secrets, tokens, raw private profile values, or private transcripts into repo truth.',
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

function toDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function minutesBetween(later, earlier) {
  return Math.max(0, Math.round((later.getTime() - earlier.getTime()) / 60000))
}

function addViolation(violations, subject, ruleId, detail = '') {
  violations.push({ subject: subject || 'harlan-operator-loop', ruleId, detail })
}

function findInput(loop = {}, inputId = '') {
  return list(loop.inputs).find(input => input.inputId === inputId) || null
}

function findSection(loop = {}, sectionId = '') {
  return list(loop.operatorSummary?.sections).find(section => section.sectionId === sectionId) || null
}

function mutates(action = {}) {
  return MUTATING_ACTION_KINDS.has(text(action.kind)) || action.externalWrite === true || action.writeEnabled === true
}

function isFreshInput(input = {}, now, maxAgeMinutes) {
  if (!input) return false
  const queriedAt = toDate(input.queriedAt)
  return input.status === 'available' &&
    input.sourceKind !== 'memory' &&
    text(input.sourceId) &&
    text(input.lookupRef) &&
    text(input.evidenceStamp) &&
    queriedAt &&
    minutesBetween(now, queriedAt) <= maxAgeMinutes
}

function sourceRefsAreDeclared(loop = {}, refs = []) {
  return list(refs).every(ref => Boolean(findInput(loop, ref)))
}

export function buildHarlanOperatorLoop(overrides = {}) {
  const now = '2026-05-18T20:30:00.000-04:00'
  return {
    cardId: HARLAN_OPERATOR_LOOP_CARD_ID,
    closeoutKey: HARLAN_OPERATOR_LOOP_CLOSEOUT_KEY,
    ownerLayer: 'Foundation',
    loopVersion: 1,
    readOnly: true,
    sourceBacked: true,
    actionRouted: true,
    liveAgentRuntimeStarted: false,
    extractionStarted: false,
    modelCallsStarted: false,
    externalWritesStarted: false,
    hiddenSubagentsSpawned: false,
    grantsNewAuthority: false,
    policy: {
      now,
      maxInputAgeMinutes: 15,
      currentClaimsRequireFreshInputs: true,
      memoryIsLastKnownOnly: true,
      missingSourceDecision: 'blocked_or_last_known',
      nextCardId: HARLAN_OPERATOR_LOOP_NEXT_CARD_ID,
    },
    prerequisites: [
      { cardId: 'HARLAN-PROJECT-REGISTRY-001', closeoutKey: 'harlan-project-registry-v1' },
      { cardId: 'AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001', closeoutKey: 'agent-live-answer-preflight-gate-v1' },
      { cardId: 'AGENT-CAPABILITY-REGISTRY-001', closeoutKey: 'agent-capability-registry-v1' },
      { cardId: 'AGENT-TEMPLATE-RUNTIME-CONTRACT-001', closeoutKey: 'agent-template-runtime-contract-v1' },
      { cardId: 'ROLE-ASSISTANT-CONTRACTS-001', closeoutKey: 'role-assistant-contracts-v1' },
    ],
    inputs: [
      {
        inputId: 'current-sprint',
        sourceKind: 'live_api',
        route: '/api/foundation/current-sprint',
        sourceId: 'foundation-current-sprint',
        lookupRef: 'GET /api/foundation/current-sprint',
        queriedAt: '2026-05-18T20:29:20.000-04:00',
        asOf: '2026-05-18T20:29:20.000-04:00',
        evidenceStamp: 'foundation-current-sprint:harlan-operator-loop-2026-05-18',
        status: 'available',
        purpose: 'active blocker, sprint stage, not-next boundaries, and next card',
      },
      {
        inputId: 'build-log',
        sourceKind: 'live_api',
        route: '/api/foundation/build-log',
        sourceId: 'foundation-build-log',
        lookupRef: 'GET /api/foundation/build-log',
        queriedAt: '2026-05-18T20:29:21.000-04:00',
        asOf: '2026-05-18T20:29:21.000-04:00',
        evidenceStamp: 'foundation-build-log:harlan-project-registry-v1',
        status: 'available',
        purpose: 'what shipped and where the proof lives',
      },
      {
        inputId: 'system-health',
        sourceKind: 'live_api',
        route: '/api/foundation-hub',
        sourceId: 'foundation-hub:foundationSystemHealth',
        lookupRef: 'GET /api/foundation-hub?view=full',
        queriedAt: '2026-05-18T20:29:22.000-04:00',
        asOf: '2026-05-18T20:29:22.000-04:00',
        evidenceStamp: 'foundation-system-health:healthy',
        status: 'available',
        purpose: 'what is broken or healthy now',
      },
      {
        inputId: 'nightly-audit',
        sourceKind: 'live_api',
        route: '/api/foundation-hub',
        sourceId: 'foundation-hub:nightlyDeepAudit',
        lookupRef: 'GET /api/foundation-hub?view=full',
        queriedAt: '2026-05-18T20:29:23.000-04:00',
        asOf: '2026-05-18T20:29:23.000-04:00',
        evidenceStamp: 'nightly-audit:2026-05-18',
        status: 'available',
        purpose: 'audit priorities and stale review signals',
      },
      {
        inputId: 'build-lane-telemetry',
        sourceKind: 'live_api',
        route: '/api/foundation-hub',
        sourceId: 'foundation-hub:buildLaneTelemetry',
        lookupRef: 'GET /api/foundation-hub?view=full',
        queriedAt: '2026-05-18T20:29:24.000-04:00',
        asOf: '2026-05-18T20:29:24.000-04:00',
        evidenceStamp: 'build-lane-telemetry:0-red-fingerprints',
        status: 'available',
        purpose: 'red build-lane fingerprints and repeated verifier failures',
      },
      {
        inputId: 'backlog',
        sourceKind: 'live_api',
        route: '/api/foundation-hub',
        sourceId: 'foundation-hub:backlogItems',
        lookupRef: 'GET /api/foundation-hub',
        queriedAt: '2026-05-18T20:29:25.000-04:00',
        asOf: '2026-05-18T20:29:25.000-04:00',
        evidenceStamp: 'backlog:harlan-operator-loop-v1',
        status: 'available',
        purpose: 'card truth, owners, lane, priority, and next action',
      },
      {
        inputId: 'source-action-routes',
        sourceKind: 'live_api',
        route: '/api/foundation-hub',
        sourceId: 'foundation-hub:actionRoutes',
        lookupRef: 'GET /api/foundation-hub?view=full',
        queriedAt: '2026-05-18T20:29:26.000-04:00',
        asOf: '2026-05-18T20:29:26.000-04:00',
        evidenceStamp: 'action-routes:pending-owner-decisions',
        status: 'available',
        purpose: 'owner-bound routes, blocked decisions, and proposal-only actions',
      },
    ],
    operatorSummary: {
      answerId: 'harlan-foundation-operator-read-v1',
      agentId: 'harlan-pilot',
      answerMode: 'source_backed_operator_summary',
      asOf: now,
      stance: 'current',
      sections: [
        {
          sectionId: 'true-now',
          title: 'What is true right now',
          plainEnglish: 'Foundation is serving current repo code and the active blocker is the Harlan operator loop.',
          sourceRefs: ['current-sprint', 'system-health'],
          status: 'current',
        },
        {
          sectionId: 'changed',
          title: 'What changed',
          plainEnglish: 'The Harlan project registry shipped and closed SYSTEM-011 as the first project-registry pattern.',
          sourceRefs: ['build-log', 'backlog'],
          status: 'current',
        },
        {
          sectionId: 'broken',
          title: 'What is broken',
          plainEnglish: 'No current verifier/system-health break is reported in the healthy fixture; any red fingerprint must be named from telemetry before acting.',
          sourceRefs: ['system-health', 'build-lane-telemetry'],
          status: 'current',
        },
        {
          sectionId: 'blocked',
          title: 'What is blocked',
          plainEnglish: 'External writes, live extraction, model calls, Google Workspace mutation, and hidden workers remain blocked without approval.',
          sourceRefs: ['current-sprint', 'source-action-routes'],
          status: 'current',
        },
        {
          sectionId: 'owners',
          title: 'Who owns it',
          plainEnglish: 'Foundation owns the current builder lane; Steve owns approval boundaries for external/private side effects.',
          sourceRefs: ['backlog', 'source-action-routes'],
          status: 'current',
        },
        {
          sectionId: 'next',
          title: 'What happens next',
          plainEnglish: 'Finish this read-only operator loop, then continue the Build Intel creator watchlist expansion unless live repo truth surfaces a higher P0 repair.',
          sourceRefs: ['current-sprint', 'backlog'],
          status: 'current',
        },
      ],
      nextActions: [
        {
          actionId: 'continue-next-card',
          kind: 'internal_next_card',
          cardId: HARLAN_OPERATOR_LOOP_NEXT_CARD_ID,
          approvalRequired: false,
          writeEnabled: false,
        },
      ],
    },
    notNextBoundaries: HARLAN_OPERATOR_LOOP_NOT_NEXT_BOUNDARIES,
    ...overrides,
  }
}

export function evaluateHarlanOperatorLoop(loop = buildHarlanOperatorLoop()) {
  const violations = []
  const policy = loop.policy || {}
  const now = toDate(policy.now) || new Date('2026-05-18T20:30:00.000-04:00')
  const maxAgeMinutes = Number(policy.maxInputAgeMinutes || 15)
  const inputs = list(loop.inputs)
  const sections = list(loop.operatorSummary?.sections)

  if (loop.ownerLayer !== 'Foundation') addViolation(violations, loop.cardId, 'foundation_owner_required', loop.ownerLayer || 'missing')
  if (loop.readOnly !== true) addViolation(violations, loop.cardId, 'read_only_required', String(loop.readOnly))
  if (loop.sourceBacked !== true) addViolation(violations, loop.cardId, 'source_backed_required', String(loop.sourceBacked))
  if (loop.actionRouted !== true) addViolation(violations, loop.cardId, 'action_routed_required', String(loop.actionRouted))
  if (loop.liveAgentRuntimeStarted === true) addViolation(violations, loop.cardId, 'runtime_launch_blocked', 'this card cannot launch Harlan runtime')
  if (loop.extractionStarted === true) addViolation(violations, loop.cardId, 'live_extraction_blocked', 'live extraction is not approved')
  if (loop.modelCallsStarted === true) addViolation(violations, loop.cardId, 'model_call_blocked', 'model/provider calls are not approved')
  if (loop.externalWritesStarted === true) addViolation(violations, loop.cardId, 'external_write_blocked', 'external writes are not approved')
  if (loop.hiddenSubagentsSpawned === true) addViolation(violations, loop.cardId, 'hidden_subagent_blocked', 'hidden workers require explicit approval')
  if (loop.grantsNewAuthority === true) addViolation(violations, loop.cardId, 'new_authority_blocked', 'operator loop does not grant reach')
  if (list(loop.prerequisites).length < 5) addViolation(violations, loop.cardId, 'prerequisites_required', 'registry, live preflight, capability, template, and role contracts are required')
  if (loop.operatorSummary?.answerMode !== 'source_backed_operator_summary') addViolation(violations, loop.cardId, 'operator_summary_mode_required', loop.operatorSummary?.answerMode || 'missing')

  for (const inputId of HARLAN_OPERATOR_LOOP_REQUIRED_INPUTS) {
    const input = findInput(loop, inputId)
    if (!input) {
      addViolation(violations, inputId, 'required_input_missing', 'operator answer needs this source')
      continue
    }
    for (const field of ['sourceKind', 'sourceId', 'lookupRef', 'queriedAt', 'asOf', 'evidenceStamp', 'status', 'purpose']) {
      if (!text(input[field])) addViolation(violations, inputId, 'input_field_required', field)
    }
    if (input.sourceKind === 'memory') addViolation(violations, inputId, 'memory_only_current_input_blocked', 'current operator answers need live/local source truth')
    if (input.sourceKind === 'live_api' && !text(input.route)) addViolation(violations, inputId, 'live_api_route_required', 'live API inputs need route')
    if (!isFreshInput(input, now, maxAgeMinutes) && input.status === 'available') addViolation(violations, inputId, 'fresh_input_required', input.queriedAt || 'missing queriedAt')
  }

  for (const sectionId of HARLAN_OPERATOR_LOOP_REQUIRED_SECTIONS) {
    const section = findSection(loop, sectionId)
    if (!section) {
      addViolation(violations, sectionId, 'required_section_missing', 'operator summary needs this section')
      continue
    }
    if (!text(section.plainEnglish)) addViolation(violations, sectionId, 'plain_english_required', 'section needs operator-readable text')
    if (!list(section.sourceRefs).length) addViolation(violations, sectionId, 'section_source_refs_required', 'section needs source refs')
    if (!sourceRefsAreDeclared(loop, section.sourceRefs)) addViolation(violations, sectionId, 'section_source_refs_must_be_declared', list(section.sourceRefs).join(', '))
    if (section.status === 'current' && list(section.sourceRefs).some(ref => !isFreshInput(findInput(loop, ref), now, maxAgeMinutes))) addViolation(violations, sectionId, 'current_section_requires_fresh_sources', list(section.sourceRefs).join(', '))
  }

  for (const action of list(loop.operatorSummary?.nextActions)) {
    if (!text(action.actionId) || !text(action.kind)) addViolation(violations, action.actionId, 'next_action_fields_required', action.kind || 'missing')
    if (mutates(action) && (action.approvalRequired !== true || action.writeEnabled !== false)) addViolation(violations, action.actionId, 'mutating_next_action_approval_required', action.kind)
  }
  if (!list(loop.operatorSummary?.nextActions).some(action => action.cardId === HARLAN_OPERATOR_LOOP_NEXT_CARD_ID)) addViolation(violations, loop.cardId, 'next_card_action_required', HARLAN_OPERATOR_LOOP_NEXT_CARD_ID)

  const unavailableInputs = inputs.filter(input => input.status && input.status !== 'available')
  if (unavailableInputs.length && loop.operatorSummary?.stance === 'current') addViolation(violations, loop.cardId, 'unavailable_source_cannot_sound_current', unavailableInputs.map(input => input.inputId).join(', '))

  return {
    ok: violations.length === 0,
    status: violations.length ? 'blocked' : 'ready',
    cardId: loop.cardId,
    closeoutKey: loop.closeoutKey,
    violations,
    summary: {
      inputCount: inputs.length,
      sectionCount: sections.length,
      nextActionCount: list(loop.operatorSummary?.nextActions).length,
      violationCount: violations.length,
    },
  }
}

export function buildHarlanOperatorLoopText(loop = buildHarlanOperatorLoop()) {
  const sections = list(loop.operatorSummary?.sections)
  return [
    `As of ${loop.operatorSummary?.asOf || 'unknown'}:`,
    ...sections.map(section => `- ${section.title}: ${section.plainEnglish}`),
  ].join('\n')
}

export function buildHarlanOperatorLoopDogfoodProof() {
  const healthyLoop = buildHarlanOperatorLoop()
  const healthy = evaluateHarlanOperatorLoop(healthyLoop)
  const missingInput = clone(healthyLoop)
  missingInput.inputs = missingInput.inputs.filter(input => input.inputId !== 'system-health')
  const memoryOnly = clone(healthyLoop)
  memoryOnly.inputs[0].sourceKind = 'memory'
  memoryOnly.inputs[0].sourceId = 'memory/2026-05-18.md'
  const staleInput = clone(healthyLoop)
  staleInput.inputs[1].queriedAt = '2026-05-18T19:00:00.000-04:00'
  const missingSectionRefs = clone(healthyLoop)
  missingSectionRefs.operatorSummary.sections[0].sourceRefs = []
  const unapprovedWrite = clone(healthyLoop)
  unapprovedWrite.operatorSummary.nextActions.push({ actionId: 'send-summary', kind: 'external_send', approvalRequired: false, writeEnabled: true, externalWrite: true })
  const runtimeAttempt = buildHarlanOperatorLoop({
    liveAgentRuntimeStarted: true,
    extractionStarted: true,
    modelCallsStarted: true,
    externalWritesStarted: true,
    hiddenSubagentsSpawned: true,
    grantsNewAuthority: true,
  })
  const missingNext = clone(healthyLoop)
  missingNext.operatorSummary.nextActions = []
  const unavailableCurrent = clone(healthyLoop)
  unavailableCurrent.inputs[2].status = 'blocked_by_approval'

  const results = {
    missingInput: evaluateHarlanOperatorLoop(missingInput),
    memoryOnly: evaluateHarlanOperatorLoop(memoryOnly),
    staleInput: evaluateHarlanOperatorLoop(staleInput),
    missingSectionRefs: evaluateHarlanOperatorLoop(missingSectionRefs),
    unapprovedWrite: evaluateHarlanOperatorLoop(unapprovedWrite),
    runtimeAttempt: evaluateHarlanOperatorLoop(runtimeAttempt),
    missingNext: evaluateHarlanOperatorLoop(missingNext),
    unavailableCurrent: evaluateHarlanOperatorLoop(unavailableCurrent),
  }

  return {
    ok: healthy.ok === true && Object.values(results).every(result => result.ok === false),
    invariant: 'Harlan operator loop passes with fresh declared sources and rejects missing inputs, memory-only current proof, stale inputs, unsourced sections, unapproved writes, runtime side effects, hidden workers, missing next action, and unavailable sources that still sound current.',
    healthy,
    exampleText: buildHarlanOperatorLoopText(healthyLoop),
    missingInputRejected: results.missingInput.ok === false,
    memoryOnlyRejected: results.memoryOnly.ok === false,
    staleInputRejected: results.staleInput.ok === false,
    missingSectionRefsRejected: results.missingSectionRefs.ok === false,
    unapprovedWriteRejected: results.unapprovedWrite.ok === false,
    runtimeAttemptRejected: results.runtimeAttempt.ok === false,
    missingNextRejected: results.missingNext.ok === false,
    unavailableCurrentRejected: results.unavailableCurrent.ok === false,
    brokenFixtures: results,
  }
}
