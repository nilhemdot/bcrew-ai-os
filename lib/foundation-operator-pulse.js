export const FOUNDATION_OPERATOR_PULSE_CARD_ID = 'FOUNDATION-OPERATOR-PULSE-001'
export const FOUNDATION_OPERATOR_PULSE_CLOSEOUT_KEY = 'foundation-operator-pulse-v1'
export const FOUNDATION_OPERATOR_PULSE_PLAN_PATH = 'docs/process/foundation-operator-pulse-001-plan.md'
export const FOUNDATION_OPERATOR_PULSE_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-OPERATOR-PULSE-001.json'
export const FOUNDATION_OPERATOR_PULSE_SCRIPT_PATH = 'scripts/process-foundation-operator-pulse-check.mjs'
export const FOUNDATION_OPERATOR_PULSE_ROUTE_PATH = '/api/foundation/operator-pulse'

const PRIORITY_ORDER = { P0: 0, P1: 1, P2: 2, P3: 3 }
const LANE_ORDER = { executing: 0, scoped: 1, ranked: 2, research: 3, parked: 4, done: 5 }
const APPROVED_FOUNDATION_NEXT_ORDER = [
  'WEB-GODMODE-001',
  'LOOM-001',
  'MEETING-VIDEO-001',
  'SKOOL-WORKER-001',
  'MYICRO-TRAINING-001',
  'DRIVE-WORKER-001',
  'BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001',
  'SOURCE-019',
  'SOURCE-020',
  'DATA-002',
]

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function normalizeStatusForCard(status = '') {
  const normalized = normalizeText(status).toLowerCase()
  if (['risk', 'blocked', 'failed', 'critical'].includes(normalized)) return 'risk'
  if (['watch', 'pending', 'review', 'action_required'].includes(normalized)) return 'pending'
  if (['healthy', 'ok', 'passed', 'green', 'live', 'succeeded'].includes(normalized)) return 'live'
  return 'pending'
}

function compactBacklogCard(card = {}) {
  if (!card || typeof card !== 'object') return null
  return {
    id: card.id || null,
    title: card.title || null,
    lane: card.lane || null,
    priority: card.priority || null,
    rank: card.rank ?? null,
    owner: card.owner || null,
    statusNote: card.statusNote || card.status_note || '',
    nextAction: card.nextAction || card.next_action || '',
  }
}

function compareBacklogCards(left = {}, right = {}) {
  const priorityDelta = (PRIORITY_ORDER[left.priority] ?? 9) - (PRIORITY_ORDER[right.priority] ?? 9)
  if (priorityDelta) return priorityDelta
  const leftRank = Number.isFinite(Number(left.rank)) ? Number(left.rank) : 999999
  const rightRank = Number.isFinite(Number(right.rank)) ? Number(right.rank) : 999999
  if (leftRank !== rightRank) return leftRank - rightRank
  const laneDelta = (LANE_ORDER[left.lane] ?? 9) - (LANE_ORDER[right.lane] ?? 9)
  if (laneDelta) return laneDelta
  return normalizeText(left.id).localeCompare(normalizeText(right.id))
}

function isApprovalBoundOrExplicitlyDeferred(card = {}) {
  const text = [
    card.title,
    card.statusNote || card.status_note,
    card.nextAction || card.next_action,
    card.summary,
  ].filter(Boolean).join('\n').toLowerCase()
  return /approval-bound|provider-side|credential|key rotation|do not mutate|not active|non-active|not the active|keep scoped|wait for|explicit local-runtime approval|public\/external exposure/.test(text)
}

function nextFoundationWork(backlogItems = [], currentSprint = {}) {
  const activeBlockerId = currentSprint?.activeBlocker?.cardId || currentSprint?.sprint?.activeBlockerCardId || ''
  const activeBlocker = activeBlockerId
    ? (backlogItems || []).find(card => card.id === activeBlockerId)
    : null
  if (activeBlocker && activeBlocker.lane !== 'done') return compactBacklogCard(activeBlocker)

  const cardById = new Map((Array.isArray(backlogItems) ? backlogItems : []).map(card => [card?.id, card]).filter(([id]) => id))
  const approvedNext = APPROVED_FOUNDATION_NEXT_ORDER
    .map(id => cardById.get(id))
    .find(card => card && !['done', 'parked'].includes(card.lane))
  if (approvedNext) return compactBacklogCard(approvedNext)

  const candidates = (Array.isArray(backlogItems) ? backlogItems : [])
    .filter(card => card && card.team === 'foundation')
    .filter(card => !['done', 'parked'].includes(card.lane))
    .filter(card => !isApprovalBoundOrExplicitlyDeferred(card))
    .filter(card => card.priority === 'P0' || card.priority === 'P1')
    .sort(compareBacklogCards)
  return compactBacklogCard(candidates[0] || null)
}

function recentBuildRows(builds = []) {
  return (Array.isArray(builds) ? builds : [])
    .slice(0, 5)
    .map(build => ({
      commit: build.commit || build.hash || build.shortHash || null,
      subject: build.subject || build.message || '',
      cardIds: Array.isArray(build.cardIds) ? build.cardIds : [],
      closeoutKey: build.closeoutKey || build.closeout?.key || null,
      acceptanceState: build.acceptanceState || build.closeout?.acceptanceState || null,
      committedAt: build.committedAt || build.date || null,
    }))
}

function approvalItems({
  pendingDocUpdates = [],
  backlogItems = [],
} = {}) {
  const pendingDocs = (Array.isArray(pendingDocUpdates) ? pendingDocUpdates : [])
    .filter(item => ['pending', 'approved', 'failed'].includes(item.status))
    .slice(0, 5)
    .map(item => ({
      id: item.id || item.updateId || null,
      title: item.title || item.targetDocPath || 'Pending doc update',
      status: item.status,
      nextAction: item.nextAction || 'Review this pending doc update before applying.',
    }))
  const approvalBacklog = (Array.isArray(backlogItems) ? backlogItems : [])
    .filter(card => card && card.lane !== 'done' && /approval|required|approve/i.test([
      card.title,
      card.statusNote || card.status_note,
      card.nextAction || card.next_action,
      card.summary,
    ].filter(Boolean).join('\n')))
    .slice(0, 5)
    .map(compactBacklogCard)
  return [...pendingDocs, ...approvalBacklog].filter(Boolean).slice(0, 8)
}

function buildPulseCards({
  systemHealth = {},
  repeatedFailureGate = {},
  currentSprint = {},
  backlogHygiene = {},
  nextCard = null,
  approvals = [],
} = {}) {
  const healthSummary = systemHealth.summary || {}
  const repeatedSummary = repeatedFailureGate.summary || repeatedFailureGate.actionGate?.summary || {}
  const sprintSummary = currentSprint.summary || {}
  const healthCardStatus = normalizeStatusForCard(systemHealth.status || healthSummary.status)
  const repeatedStatus = normalizeStatusForCard(repeatedFailureGate.status || repeatedFailureGate.actionGate?.status)
  const sprintStatus = normalizeStatusForCard(currentSprint.status)
  const backlogStatus = normalizeStatusForCard(backlogHygiene.status || 'healthy')

  return [
    {
      label: 'System Health',
      status: healthCardStatus,
      detail: `Raw red ${normalizeNumber(healthSummary.rawRiskCount)}, raw yellow ${normalizeNumber(healthSummary.rawWatchCount)}. ${systemHealth.plainEnglish || ''}`.trim(),
      href: '/foundation#system-health',
    },
    {
      label: 'Repeated Failures',
      status: repeatedStatus,
      detail: `${normalizeNumber(repeatedSummary.unsatisfiedRedCount)} unresolved red, ${normalizeNumber(repeatedSummary.blockingItemCount)} blocking. ${repeatedFailureGate.plainEnglish || ''}`.trim(),
      href: '/foundation#system-health',
    },
    {
      label: 'Current Sprint',
      status: sprintStatus,
      detail: `Status ${currentSprint.status || 'unknown'}; next ${(currentSprint.cadence?.nextCard?.cardId || sprintSummary.nextCardId || nextCard?.id || 'missing')}.`,
      href: '/foundation#recent-builds',
    },
    {
      label: 'Backlog Hygiene',
      status: backlogStatus,
      detail: `${normalizeNumber(backlogHygiene.findingCount)} findings across ${normalizeNumber(backlogHygiene.cardCount)} cards.`,
      href: '/foundation#backlog',
    },
    {
      label: 'Approvals',
      status: approvals.length ? 'pending' : 'live',
      detail: approvals.length ? `${approvals.length} approval/review item(s) need operator attention.` : 'No approval queue item is blocking the local operator pulse.',
      href: '/foundation#decisions',
    },
  ]
}

export function buildFoundationOperatorPulse({
  systemHealth = {},
  repeatedFailureGate = {},
  currentSprint = {},
  backlogItems = [],
  backlogHygiene = {},
  pendingDocUpdates = [],
  recentBuilds = [],
  recentChanges = [],
  now = new Date(),
} = {}) {
  const nextCard = nextFoundationWork(backlogItems, currentSprint)
  const approvals = approvalItems({ pendingDocUpdates, backlogItems })
  const cards = buildPulseCards({
    systemHealth,
    repeatedFailureGate,
    currentSprint,
    backlogHygiene,
    nextCard,
    approvals,
  })
  const riskCount = cards.filter(card => card.status === 'risk').length
  const pendingCount = cards.filter(card => card.status === 'pending').length
  const status = riskCount ? 'risk' : pendingCount ? 'watch' : 'healthy'
  const nextLabel = nextCard ? `${nextCard.id}: ${nextCard.title}` : 'No next Foundation card resolved.'
  const actionItems = []
  if (cards[0]?.status === 'risk') actionItems.push('Repair System Health before normal sprint progression.')
  if (cards[1]?.status === 'risk') actionItems.push('Repair repeated build/job failures before normal sprint progression.')
  if (approvals.length) actionItems.push('Review approval-bound items; park unsafe actions and keep safe work moving.')
  if (nextCard) actionItems.push(`Next execution recommendation: ${nextLabel}.`)

  return {
    generatedAt: now instanceof Date ? now.toISOString() : new Date(now).toISOString(),
    cardId: FOUNDATION_OPERATOR_PULSE_CARD_ID,
    closeoutKey: FOUNDATION_OPERATOR_PULSE_CLOSEOUT_KEY,
    routePath: FOUNDATION_OPERATOR_PULSE_ROUTE_PATH,
    status,
    plainEnglish: status === 'healthy'
      ? `Foundation is green. Next: ${nextLabel}`
      : status === 'watch'
        ? `Foundation is usable but needs operator review. Next: ${nextLabel}`
        : 'Foundation needs repair before normal sprint progression.',
    nextCard,
    cards,
    actionItems,
    approvals,
    recentBuilds: recentBuildRows(recentBuilds),
    recentChanges: (Array.isArray(recentChanges) ? recentChanges : []).slice(0, 5),
    evidenceLinks: [
      { label: 'System Health', href: '/foundation#system-health' },
      { label: 'Repeated Failure Gate', href: '/foundation#system-health' },
      { label: 'Current Sprint', href: '/foundation#recent-builds' },
      { label: 'Backlog', href: '/foundation#backlog' },
      { label: 'Build Log API', href: '/api/foundation/build-log?limit=20' },
    ],
    boundaries: {
      localOperatorSurface: true,
      externalSends: false,
      autoFixes: false,
      writesSourceSystems: false,
      credentialMutation: false,
      drivePermissionMutation: false,
    },
  }
}

export function buildFoundationOperatorPulseDogfoodProof() {
  const healthy = buildFoundationOperatorPulse({
    systemHealth: { status: 'healthy', plainEnglish: 'green', summary: { rawRiskCount: 0, rawWatchCount: 0 } },
    repeatedFailureGate: { status: 'healthy', plainEnglish: 'none', summary: { unsatisfiedRedCount: 0, blockingItemCount: 0 } },
    currentSprint: { status: 'healthy', summary: { nextCardId: 'WEB-GODMODE-001' } },
    backlogHygiene: { status: 'healthy', findingCount: 0, cardCount: 10 },
    backlogItems: [{ id: 'WEB-GODMODE-001', title: 'Build governed website GOD-mode extraction worker', team: 'foundation', lane: 'scoped', priority: 'P0', rank: 47 }],
  })
  const redHealth = buildFoundationOperatorPulse({
    systemHealth: { status: 'risk', plainEnglish: 'raw red', summary: { rawRiskCount: 1, rawWatchCount: 0 } },
    repeatedFailureGate: { status: 'healthy', summary: { unsatisfiedRedCount: 0, blockingItemCount: 0 } },
  })
  const repeatedBlocked = buildFoundationOperatorPulse({
    systemHealth: { status: 'healthy', summary: { rawRiskCount: 0, rawWatchCount: 0 } },
    repeatedFailureGate: { status: 'risk', plainEnglish: 'blocked', summary: { unsatisfiedRedCount: 1, blockingItemCount: 1 } },
  })
  const approvalWatch = buildFoundationOperatorPulse({
    systemHealth: { status: 'healthy', summary: { rawRiskCount: 0, rawWatchCount: 0 } },
    repeatedFailureGate: { status: 'healthy', summary: { unsatisfiedRedCount: 0, blockingItemCount: 0 } },
    pendingDocUpdates: [{ id: 'doc-1', title: 'Pending doc', status: 'pending' }],
  })
  return {
    ok: healthy.status === 'healthy' &&
      redHealth.status === 'risk' &&
      repeatedBlocked.status === 'risk' &&
      approvalWatch.status === 'watch' &&
      healthy.boundaries.externalSends === false &&
      healthy.boundaries.autoFixes === false,
    healthy,
    redHealth,
    repeatedBlocked,
    approvalWatch,
  }
}
