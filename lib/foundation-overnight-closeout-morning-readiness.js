export const FOUNDATION_OVERNIGHT_CLOSEOUT_CARD_ID = 'FOUNDATION-OVERNIGHT-CLOSEOUT-AND-MORNING-READINESS-001'
export const FOUNDATION_OVERNIGHT_CLOSEOUT_CLOSEOUT_KEY = 'foundation-overnight-closeout-morning-readiness-v1'
export const FOUNDATION_OVERNIGHT_CLOSEOUT_PLAN_PATH = 'docs/process/foundation-overnight-closeout-and-morning-readiness-001-plan.md'
export const FOUNDATION_OVERNIGHT_CLOSEOUT_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-OVERNIGHT-CLOSEOUT-AND-MORNING-READINESS-001.json'
export const FOUNDATION_OVERNIGHT_CLOSEOUT_SCRIPT_PATH = 'scripts/process-foundation-overnight-closeout-morning-readiness-check.mjs'
export const FOUNDATION_OVERNIGHT_CLOSEOUT_HANDOFF_PATH = 'docs/handoffs/2026-05-20-foundation-overnight-closeout-morning-readiness.md'
export const FOUNDATION_OVERNIGHT_SOURCE_SPRINT_ID = 'FOUNDATION-AUDIT-CONTROL-AND-INTEL-2026-05-19'
export const FOUNDATION_OVERNIGHT_NEXT_SPRINT_ID = 'FOUNDATION-TRUSTED-LOOP-AND-SAFE-SURFACES-2026-05-20'

export const FOUNDATION_OVERNIGHT_REQUIRED_DONE_CARDS = Object.freeze([
  'CURRENT-SPRINT-ACTIVE-CARD-GATE-001',
  'DEEP-AUDIT-FINDINGS-CLOSURE-GATE-001',
  'FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001',
  'BUILD-LOG-API-CACHE-AND-SLIM-001',
  'ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001',
  'APPROVAL-THRESHOLD-REGISTRY-001',
  'BUILD-INTEL-SNAPSHOT-BASELINE-001',
  'BUILD-CLOSEOUT-DATA-SOURCE-001',
  'FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001',
  'FOUNDATION-CSS-SURFACE-DECOUPLE-001',
  'DECISION-008',
  'INTEL-SCOPER-001',
  'DATA-003',
])

export const FOUNDATION_SAFE_CONTINUATION_ORDER = Object.freeze([
  {
    cardId: 'SLICE-001',
    title: 'Define and prove the first trusted assistant loop',
    owner: 'Foundation Runtime',
    why: 'Proof before scale: no second loop, agent expansion, or broader connector enablement should happen until one trusted loop is explicit and testable.',
  },
  {
    cardId: 'MARKETING-VIDEO-LAB-LIVE-SAFETY-001',
    title: 'Harden Marketing Video Lab live generation safety before route wiring',
    owner: 'Foundation Safety',
    why: 'This is mock/safety hardening only: prove concurrency and placeholder rejection before any live provider route or spend.',
  },
  {
    cardId: 'STRATEGY-004',
    title: 'Build the AI-assisted strategy planning workflow',
    owner: 'Strategic Intelligence',
    why: 'Action Router, atoms, retrieval, and Data-003 are now available; the next value surface should consume governed source-backed intelligence, not rebuild a chat toy.',
  },
  {
    cardId: 'STRATEGY-009',
    title: 'Clean Strategy Package UI/UX for live planning',
    owner: 'Strategy UX',
    why: 'Operator surfaces need to be clean enough for Steve to use without translating system internals.',
  },
  {
    cardId: 'KPI-APPT-QUALITY-001',
    title: 'Build KPI appointment quality audit for stacking and outcomes',
    owner: 'Sales Data Quality',
    why: 'Read-only Sales data quality work is a safe next Foundation value lane after source/extract proof.',
  },
  {
    cardId: 'KPI-LEAD-VALIDATION-001',
    title: 'Surface KPI fake-lead and lead-source validation problems',
    owner: 'Sales Data Quality',
    why: 'Lead-source validation is high-value and can start as governed read-only audit/review output.',
  },
  {
    cardId: 'INTEL-THREAD-CONTEXT-001',
    title: 'Add full thread context to evidence proof',
    owner: 'Strategic Intelligence',
    why: 'Scoper and action-router outputs are more trustworthy when evidence shows participants, recency, reply context, and source account.',
  },
  {
    cardId: 'SCOPER-UI-001',
    title: 'Render gap-resolving Scoper output in the Strategy Hub',
    owner: 'Strategy UX',
    why: 'INTEL-SCOPER-001 shipped the backend proof; the operator needs a usable review surface next.',
  },
  {
    cardId: 'SOURCE-001',
    title: 'Revalidate Gmail as a rebuild source contract',
    owner: 'Source Contracts',
    why: 'Gmail current and attachment lanes exist; source contract truth should be refreshed before wider assistant consumption.',
  },
  {
    cardId: 'SOURCE-002',
    title: 'Revalidate Google Calendar as a rebuild source contract',
    owner: 'Source Contracts',
    why: 'Calendar is part of meeting/current-day context and should have explicit contract boundaries before agent loops expand.',
  },
  {
    cardId: 'SOURCE-003',
    title: 'Revalidate Google Drive as a rebuild source contract',
    owner: 'Source Contracts',
    why: 'Drive worker and content extraction exist; the source contract should match the governed extraction posture.',
  },
])

export const FOUNDATION_OVERNIGHT_CLOSEOUT_CHANGED_FILES = [
  'lib/foundation-overnight-closeout-morning-readiness.js',
  FOUNDATION_OVERNIGHT_CLOSEOUT_SCRIPT_PATH,
  'package.json',
  'lib/foundation-build-closeout-process-gate-records.js',
  FOUNDATION_OVERNIGHT_CLOSEOUT_PLAN_PATH,
  FOUNDATION_OVERNIGHT_CLOSEOUT_APPROVAL_PATH,
  FOUNDATION_OVERNIGHT_CLOSEOUT_HANDOFF_PATH,
]

export const FOUNDATION_OVERNIGHT_CLOSEOUT_PROOF_COMMANDS = [
  `node --check lib/foundation-overnight-closeout-morning-readiness.js ${FOUNDATION_OVERNIGHT_CLOSEOUT_SCRIPT_PATH}`,
  'npm run process:foundation-overnight-closeout-morning-readiness-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run process:current-sprint-dynamic-truth-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${FOUNDATION_OVERNIGHT_CLOSEOUT_CARD_ID} --planApprovalRef=${FOUNDATION_OVERNIGHT_CLOSEOUT_APPROVAL_PATH} --closeoutKey=${FOUNDATION_OVERNIGHT_CLOSEOUT_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${FOUNDATION_OVERNIGHT_CLOSEOUT_CARD_ID} --closeoutKey=${FOUNDATION_OVERNIGHT_CLOSEOUT_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${FOUNDATION_OVERNIGHT_CLOSEOUT_CARD_ID} --planApprovalRef=${FOUNDATION_OVERNIGHT_CLOSEOUT_APPROVAL_PATH} --closeoutKey=${FOUNDATION_OVERNIGHT_CLOSEOUT_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const FOUNDATION_OVERNIGHT_NOT_NEXT = Object.freeze([
  'Do not work MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.',
  'Do not start Value Builder split.',
  'Do not run live Loom, Skool, Mycro, meeting-video, paid/provider, browser-auth, broad private extraction, external write, send, Drive permission mutation, credential mutation, or provider config work.',
  'Do not reopen cards that are already done v1 unless a focused regression proves a gap.',
  'Do not let approval-bound cards stop the whole sprint; park the unsafe action and continue the next safe card.',
])

function add(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function statusOf(processResult = {}) {
  return processResult.json?.status ||
    processResult.json?.check ||
    processResult.json?.systemHealth?.status ||
    processResult.status ||
    'missing'
}

function rawCount(processResult = {}, key) {
  return Number(
    processResult.json?.systemHealth?.summary?.[key] ??
    processResult.json?.systemHealth?.[key] ??
    processResult.json?.summary?.[key] ??
    processResult.json?.[key] ??
    0,
  )
}

export function isApprovalBoundOrParked(card = {}) {
  const text = `${card.statusNote || card.status_note || ''}\n${card.nextAction || card.next_action || ''}`.toLowerCase()
  return text.includes('approval-bound') ||
    text.includes('blocked-preflight') ||
    text.includes('paid/provider') ||
    text.includes('browser-auth') ||
    text.includes('drive permission') ||
    text.includes('credential mutation') ||
    text.includes('provider config')
}

export function buildFoundationOvernightCloseoutDogfoodProof() {
  const healthy = {
    health: 'healthy',
    rawRiskCount: 0,
    rawWatchCount: 0,
    repeated: 'healthy',
    backlog: 'healthy',
    currentSprint: 'healthy',
    requiredDone: true,
    mainClean: true,
    nextSafeCard: true,
    stoppedOnApprovalBound: false,
  }
  const cases = [
    ['healthy fixture opens next safe sprint', healthy, true],
    ['dogfood rejects raw health risk', { ...healthy, health: 'risk' }, false],
    ['dogfood rejects raw watch debt', { ...healthy, rawWatchCount: 1 }, false],
    ['dogfood rejects repeated failure risk', { ...healthy, repeated: 'risk' }, false],
    ['dogfood rejects backlog hygiene risk', { ...healthy, backlog: 'risk' }, false],
    ['dogfood rejects Current Sprint drift', { ...healthy, currentSprint: 'risk' }, false],
    ['dogfood rejects unfinished sprint cards', { ...healthy, requiredDone: false }, false],
    ['dogfood rejects dirty or unpushed main', { ...healthy, mainClean: false }, false],
    ['dogfood rejects no safe continuation card', { ...healthy, nextSafeCard: false }, false],
    ['dogfood rejects stopping the whole sprint on parked approval work', { ...healthy, stoppedOnApprovalBound: true }, false],
  ]
  const evaluate = fixture =>
    fixture.health === 'healthy' &&
    fixture.rawRiskCount === 0 &&
    fixture.rawWatchCount === 0 &&
    fixture.repeated === 'healthy' &&
    fixture.backlog === 'healthy' &&
    fixture.currentSprint === 'healthy' &&
    fixture.requiredDone === true &&
    fixture.mainClean === true &&
    fixture.nextSafeCard === true &&
    fixture.stoppedOnApprovalBound === false
  const checks = cases.map(([check, fixture, expected]) => ({
    check,
    ok: evaluate(fixture) === expected,
    detail: JSON.stringify(fixture),
  }))
  return {
    ok: checks.every(check => check.ok),
    invariant: 'Overnight closeout cannot stop after a clean sprint; it must either open a safe next sprint or prove no safe work exists.',
    checks,
    failed: checks.filter(check => !check.ok),
  }
}

export function buildSafeContinuationPlan({ cards = [] } = {}) {
  const cardMap = new Map(cards.map(card => [card.id, card]))
  const items = FOUNDATION_SAFE_CONTINUATION_ORDER.map((definition, index) => {
    const card = cardMap.get(definition.cardId) || {}
    const done = card.lane === 'done'
    const approvalBound = isApprovalBoundOrParked(card)
    return {
      ...definition,
      order: index + 1,
      lane: card.lane || 'missing',
      priority: card.priority || 'missing',
      statusNote: card.statusNote || card.status_note || '',
      nextAction: card.nextAction || card.next_action || '',
      eligible: !done && !approvalBound && Boolean(card.id),
      done,
      approvalBound,
      missing: !card.id,
    }
  })
  const firstSafe = items.find(item => item.eligible) || null
  return {
    sprintId: FOUNDATION_OVERNIGHT_NEXT_SPRINT_ID,
    firstSafeCardId: firstSafe?.cardId || null,
    firstSafe,
    items,
    blockedOrSkipped: items.filter(item => item.done || item.approvalBound || item.missing),
  }
}

export function buildFoundationOvernightCloseoutStatus({
  systemHealth = {},
  repeatedFailureGate = {},
  currentSprintTruth = {},
  backlogHygiene = {},
  cards = [],
  git = {},
} = {}) {
  const checks = []
  const cardMap = new Map(cards.map(card => [card.id, card]))
  const missingOrNotDone = FOUNDATION_OVERNIGHT_REQUIRED_DONE_CARDS.filter(cardId => cardMap.get(cardId)?.lane !== 'done')
  const continuation = buildSafeContinuationPlan({ cards })
  const systemHealthStatus = statusOf(systemHealth)
  const repeatedStatus = statusOf(repeatedFailureGate)
  const currentSprintStatus = statusOf(currentSprintTruth)
  const backlogStatus = statusOf(backlogHygiene)
  const rawRiskCount = rawCount(systemHealth, 'rawRiskCount')
  const rawWatchCount = rawCount(systemHealth, 'rawWatchCount')
  const inFlightCloseout = git.inFlightCloseout === true
  const cleanSyncedMain = git.clean === true && git.head && git.head === git.originMain

  add(checks, systemHealth.exitStatus === 0 && systemHealthStatus === 'healthy', 'System Health is healthy', systemHealthStatus)
  add(checks, rawRiskCount === 0, 'System Health raw risk count is zero', String(rawRiskCount))
  add(checks, rawWatchCount === 0, 'System Health raw watch count is zero', String(rawWatchCount))
  add(checks, repeatedFailureGate.exitStatus === 0 && repeatedStatus === 'healthy', 'repeated-failure gate is healthy', repeatedStatus)
  add(checks, backlogHygiene.exitStatus === 0 && backlogStatus === 'healthy', 'backlog hygiene is healthy', backlogStatus)
  add(checks, currentSprintTruth.exitStatus === 0 && currentSprintStatus === 'healthy', 'Current Sprint dynamic truth is healthy', currentSprintStatus)
  add(checks, missingOrNotDone.length === 0, 'approved overnight sprint cards are done', missingOrNotDone.join(', ') || 'all done')
  add(checks, cleanSyncedMain || inFlightCloseout, 'main is clean/synced or covered by in-flight closeout ship gate', `clean=${git.clean} head=${git.head || 'missing'} origin=${git.originMain || 'missing'} inFlight=${inFlightCloseout}`)
  add(checks, Boolean(continuation.firstSafeCardId), 'safe continuation card exists', continuation.firstSafeCardId || 'none')

  const ok = checks.every(check => check.ok)
  return {
    ok,
    status: ok ? 'healthy' : 'risk',
    checks,
    failed: checks.filter(check => !check.ok),
    missingOrNotDone,
    continuation,
    recommendation: {
      closeSourceSprint: ok ? 'ready' : 'not_ready',
      nextSprintId: continuation.sprintId,
      nextActiveCardId: continuation.firstSafeCardId,
      valueBuilderSplit: 'not_ready; continue one Foundation-safe lane only',
      operatingRule: 'If a card hits approval-bound/private/provider/external-write work, park the action and continue the next safe card. Only corrupted main, destructive data risk, or no safe work left stops the builder.',
    },
  }
}
