export const AGENT_STATUS_FRESHNESS_GATE_CARD_ID = 'AGENT-STATUS-FRESHNESS-GATE-001'
export const AGENT_STATUS_FRESHNESS_GATE_CLOSEOUT_KEY = 'agent-status-freshness-gate-v1'
export const AGENT_STATUS_FRESHNESS_GATE_PLAN_PATH = 'docs/process/agent-status-freshness-gate-001-plan.md'
export const AGENT_STATUS_FRESHNESS_GATE_APPROVAL_PATH = 'docs/process/approvals/AGENT-STATUS-FRESHNESS-GATE-001.json'
export const AGENT_STATUS_FRESHNESS_GATE_SCRIPT_PATH = 'scripts/process-agent-status-freshness-gate-check.mjs'
export const AGENT_STATUS_FRESHNESS_GATE_CLOSEOUT_PATH = 'docs/handoffs/2026-05-17-agent-status-freshness-gate-closeout.md'
export const AGENT_STATUS_FRESHNESS_GATE_SPRINT_ID = 'agent-status-freshness-gate-2026-05-17'

export const AGENT_STATUS_FRESHNESS_GATE_CHANGED_FILES = [
  'lib/agent-status-freshness-gate.js',
  'scripts/process-agent-status-freshness-gate-check.mjs',
  'lib/foundation-runtime-reliability-verifier.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'lib/foundation-build-closeout-cleanup-records.js',
  'docs/process/agent-status-freshness-gate-001-plan.md',
  'docs/process/approvals/AGENT-STATUS-FRESHNESS-GATE-001.json',
  'docs/handoffs/2026-05-17-agent-status-freshness-gate-closeout.md',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'package.json',
]

export const AGENT_STATUS_FRESHNESS_GATE_PROOF_COMMANDS = [
  'node --check lib/agent-status-freshness-gate.js lib/foundation-runtime-reliability-verifier.js scripts/process-agent-status-freshness-gate-check.mjs scripts/foundation-verify.mjs',
  'npm run process:agent-status-freshness-gate-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:ship-check -- --card=AGENT-STATUS-FRESHNESS-GATE-001 --planApprovalRef=docs/process/approvals/AGENT-STATUS-FRESHNESS-GATE-001.json --closeoutKey=agent-status-freshness-gate-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=AGENT-STATUS-FRESHNESS-GATE-001 --closeoutKey=agent-status-freshness-gate-v1',
  'npm run process:foundation-ship -- --card=AGENT-STATUS-FRESHNESS-GATE-001 --planApprovalRef=docs/process/approvals/AGENT-STATUS-FRESHNESS-GATE-001.json --closeoutKey=agent-status-freshness-gate-v1 --commitRef=HEAD',
]

export const AGENT_STATUS_FRESHNESS_NOT_NEXT_BOUNDARIES = [
  'No live extraction.',
  'No auth-required or paid run.',
  'No provider/model probe.',
  'No connector/OAuth repair.',
  'No runtime adapter install.',
  'No Harlan/Fal/voice/Canva/OpenHuman feature work.',
  'Do not work MEETING-VAULT-ACL-001 Phase B from this sprint.',
  'Do not mutate Google Drive permissions.',
  'No live Agent Feedback auto-send.',
]

const CURRENT_CLAIM_TYPES = new Set(['current_status', 'operational_status', 'capability_status'])
const ACCEPTED_LIVE_ROUTES = new Set([
  '/api/foundation-hub',
  '/api/foundation/current-sprint',
  '/api/foundation/build-log',
  '/api/source-of-truth',
  '/api/foundation/system-health',
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

function addViolation(violations, claimId, ruleId, detail = '') {
  violations.push({ claimId: claimId || 'missing-claim-id', ruleId, detail })
}

function minutesBetween(later, earlier) {
  return Math.max(0, Math.round((later.getTime() - earlier.getTime()) / 60000))
}

function isFreshLiveSource(source = {}, now = new Date(), maxAgeMinutes = 10) {
  const queriedAt = toDate(source.queriedAt)
  return source.sourceKind === 'live_api' &&
    ACCEPTED_LIVE_ROUTES.has(source.route) &&
    text(source.sourceId) &&
    queriedAt &&
    minutesBetween(now, queriedAt) <= maxAgeMinutes &&
    source.status === 'available'
}

function liveSourcesForClaim(claim = {}, now, maxAgeMinutes) {
  return list(claim.sources).filter(source => isFreshLiveSource(source, now, maxAgeMinutes))
}

function hasMemoryOnlySources(claim = {}) {
  const sources = list(claim.sources)
  return sources.length > 0 && sources.every(source => source.sourceKind !== 'live_api')
}

function liveStatusForSubject(claim = {}) {
  const subject = text(claim.subject)
  return list(claim.liveTruth?.subjects).find(item => text(item.subject) === subject) || null
}

export function buildAgentStatusFreshnessGate(overrides = {}) {
  const now = '2026-05-17T23:55:00.000-04:00'
  return {
    cardId: AGENT_STATUS_FRESHNESS_GATE_CARD_ID,
    closeoutKey: AGENT_STATUS_FRESHNESS_GATE_CLOSEOUT_KEY,
    ownerLayer: 'Foundation',
    proposalOnly: true,
    implementationStarted: false,
    extractionStarted: false,
    modelCallsStarted: false,
    externalWritesStarted: false,
    policy: {
      now,
      maxLiveSourceAgeMinutes: 10,
      requireAsOfForCurrentClaims: true,
      memoryEvidenceLabel: 'last_known',
      currentTruthOwner: 'Foundation/API',
    },
    claims: [
      {
        claimId: 'status-current-sprint-live',
        agentId: 'codex-foundation-builder',
        subject: 'AIOS-RUNTIME-PORTABILITY-GATE-001',
        claimType: 'current_status',
        statement: 'AIOS-RUNTIME-PORTABILITY-GATE-001 is done under a verified Foundation closeout.',
        assertedStatus: 'done',
        asOf: now,
        evidenceLabel: 'current',
        sources: [
          {
            sourceKind: 'live_api',
            route: '/api/foundation-hub',
            sourceId: 'foundation-hub:backlogItems',
            queriedAt: '2026-05-17T23:54:30.000-04:00',
            status: 'available',
          },
          {
            sourceKind: 'live_api',
            route: '/api/foundation/build-log',
            sourceId: 'foundation-build-log:aios-runtime-portability-gate-v1',
            queriedAt: '2026-05-17T23:54:35.000-04:00',
            status: 'available',
          },
        ],
        liveTruth: {
          subjects: [
            {
              subject: 'AIOS-RUNTIME-PORTABILITY-GATE-001',
              status: 'done',
              closeoutKey: 'aios-runtime-portability-gate-v1',
            },
          ],
        },
        memorySources: [
          {
            sourceKind: 'memory',
            label: 'last_known',
            path: 'memory/2026-05-17.md',
          },
        ],
      },
    ],
    notNextBoundaries: AGENT_STATUS_FRESHNESS_NOT_NEXT_BOUNDARIES,
    ...overrides,
  }
}

export function evaluateAgentStatusFreshnessGate(gate = buildAgentStatusFreshnessGate()) {
  const violations = []
  const claims = list(gate.claims)
  const policy = gate.policy || {}
  const now = toDate(policy.now) || new Date('2026-05-17T23:55:00.000-04:00')
  const maxAgeMinutes = Number(policy.maxLiveSourceAgeMinutes || 10)

  if (gate.ownerLayer !== 'Foundation') addViolation(violations, gate.cardId, 'foundation_owner_required', gate.ownerLayer || 'missing')
  if (gate.proposalOnly !== true) addViolation(violations, gate.cardId, 'proposal_only_required', String(gate.proposalOnly))
  if (gate.implementationStarted === true) addViolation(violations, gate.cardId, 'implementation_started', 'agent implementation is not approved')
  if (gate.extractionStarted === true) addViolation(violations, gate.cardId, 'extraction_started', 'live extraction is not approved')
  if (gate.modelCallsStarted === true) addViolation(violations, gate.cardId, 'model_call_started', 'model calls are not approved')
  if (gate.externalWritesStarted === true) addViolation(violations, gate.cardId, 'external_write_started', 'external writes are not approved')
  if (!claims.length) addViolation(violations, gate.cardId, 'status_claim_fixture_required', 'at least one synthetic status claim is required')

  for (const claim of claims) {
    const claimId = text(claim.claimId)
    const claimType = text(claim.claimType)
    const isCurrentClaim = CURRENT_CLAIM_TYPES.has(claimType)
    const asOf = toDate(claim.asOf)
    const liveSources = liveSourcesForClaim(claim, now, maxAgeMinutes)
    const liveTruth = liveStatusForSubject(claim)

    if (!claimId || !text(claim.agentId) || !text(claim.subject) || !claimType) {
      addViolation(violations, claimId, 'claim_identity_required', 'claimId, agentId, subject, and claimType are required')
    }

    if (isCurrentClaim) {
      if (!asOf) addViolation(violations, claimId, 'as_of_required_for_current_status', 'current claims need an as-of timestamp')
      if (!liveSources.length) addViolation(violations, claimId, 'fresh_live_truth_required', 'current claims need a fresh live API source')
      if (hasMemoryOnlySources(claim)) addViolation(violations, claimId, 'memory_only_current_status_blocked', 'memory-only evidence cannot support current status')
      if (claim.evidenceLabel !== 'current') addViolation(violations, claimId, 'current_claim_label_required', claim.evidenceLabel || 'missing')
      if (!liveTruth) addViolation(violations, claimId, 'live_truth_subject_required', claim.subject || 'missing subject')
      if (liveTruth && text(claim.assertedStatus) !== text(liveTruth.status)) {
        addViolation(violations, claimId, 'live_status_conflict', `asserted=${claim.assertedStatus || 'missing'} live=${liveTruth.status || 'missing'}`)
      }
    } else if (claim.evidenceLabel !== 'last_known') {
      addViolation(violations, claimId, 'non_current_claim_must_be_last_known', claim.evidenceLabel || 'missing')
    }

    for (const source of list(claim.memorySources)) {
      if (source.sourceKind === 'memory' && source.label !== 'last_known') {
        addViolation(violations, claimId, 'memory_must_be_last_known', source.label || 'missing')
      }
    }

    if (/harlan|openhuman|fal|voice|canva/i.test(`${claim.subject} ${claim.statement}`) &&
      isCurrentClaim &&
      (!liveSources.length || text(claim.assertedStatus) === 'live' && liveTruth && text(liveTruth.status) !== 'live')) {
      addViolation(violations, claimId, 'stale_capability_claim_blocked', claim.statement || 'missing statement')
    }
  }

  return {
    ok: violations.length === 0,
    status: violations.length ? 'blocked' : 'ready',
    cardId: gate.cardId,
    closeoutKey: gate.closeoutKey,
    violations,
    summary: {
      claimCount: claims.length,
      currentClaimCount: claims.filter(claim => CURRENT_CLAIM_TYPES.has(text(claim.claimType))).length,
      violationCount: violations.length,
      maxLiveSourceAgeMinutes: maxAgeMinutes,
    },
  }
}

export function buildAgentStatusFreshnessGateDogfoodProof() {
  const healthy = evaluateAgentStatusFreshnessGate(buildAgentStatusFreshnessGate())
  const memoryOnlyCurrent = evaluateAgentStatusFreshnessGate(buildAgentStatusFreshnessGate({
    claims: [
      {
        claimId: 'memory-only-current',
        agentId: 'harlan-preview',
        subject: 'Harlan terminal',
        claimType: 'current_status',
        assertedStatus: 'live',
        statement: 'Harlan terminal is live and wired.',
        asOf: '2026-05-17T23:55:00.000-04:00',
        evidenceLabel: 'current',
        sources: [{ sourceKind: 'memory', label: 'last_known', path: 'memory/2026-05-16.md' }],
        liveTruth: { subjects: [{ subject: 'Harlan terminal', status: 'scoped' }] },
      },
    ],
  }))
  const staleLiveRead = evaluateAgentStatusFreshnessGate(buildAgentStatusFreshnessGate({
    claims: [
      {
        ...buildAgentStatusFreshnessGate().claims[0],
        claimId: 'stale-live-read',
        sources: [
          {
            sourceKind: 'live_api',
            route: '/api/foundation-hub',
            sourceId: 'foundation-hub:backlogItems',
            queriedAt: '2026-05-17T22:30:00.000-04:00',
            status: 'available',
          },
        ],
      },
    ],
  }))
  const missingAsOf = evaluateAgentStatusFreshnessGate(buildAgentStatusFreshnessGate({
    claims: [{ ...buildAgentStatusFreshnessGate().claims[0], claimId: 'missing-as-of', asOf: '' }],
  }))
  const statusConflict = evaluateAgentStatusFreshnessGate(buildAgentStatusFreshnessGate({
    claims: [
      {
        ...buildAgentStatusFreshnessGate().claims[0],
        claimId: 'status-conflict',
        assertedStatus: 'live',
        subject: 'AGENT-STATUS-FRESHNESS-GATE-001',
        liveTruth: { subjects: [{ subject: 'AGENT-STATUS-FRESHNESS-GATE-001', status: 'scoped' }] },
      },
    ],
  }))
  const staleHarlanClaim = evaluateAgentStatusFreshnessGate(buildAgentStatusFreshnessGate({
    claims: [
      {
        ...buildAgentStatusFreshnessGate().claims[0],
        claimId: 'stale-harlan-capability',
        subject: 'Harlan voice wiring',
        statement: 'Harlan voice wiring is live.',
        assertedStatus: 'live',
        liveTruth: { subjects: [{ subject: 'Harlan voice wiring', status: 'not_started' }] },
      },
    ],
  }))
  const liveRunAttempt = evaluateAgentStatusFreshnessGate(buildAgentStatusFreshnessGate({
    extractionStarted: true,
    modelCallsStarted: true,
    externalWritesStarted: true,
  }))

  return {
    ok: healthy.ok === true &&
      memoryOnlyCurrent.ok === false &&
      staleLiveRead.ok === false &&
      missingAsOf.ok === false &&
      statusConflict.ok === false &&
      staleHarlanClaim.ok === false &&
      liveRunAttempt.ok === false,
    invariant: 'Fresh live Foundation/API status passes; memory-only current claims, stale reads, missing as-of timestamps, live conflicts, stale Harlan-style capability claims, and live/model/external side effects fail closed.',
    healthy,
    memoryOnlyCurrentRejected: memoryOnlyCurrent.ok === false,
    staleLiveReadRejected: staleLiveRead.ok === false,
    missingAsOfRejected: missingAsOf.ok === false,
    statusConflictRejected: statusConflict.ok === false,
    staleHarlanClaimRejected: staleHarlanClaim.ok === false,
    liveRunAttemptRejected: liveRunAttempt.ok === false,
  }
}
