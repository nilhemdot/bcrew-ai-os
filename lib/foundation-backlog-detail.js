import {
  ACTION_ROUTE_REVIEW_INBOX_API_PATH,
  filterBacklogItemsForDefaultQueue,
  getActionRouteBacklogItemIds,
} from './action-route-review-inbox.js'

export const FOUNDATION_BACKLOG_DETAIL_ENDPOINT_CARD_ID = 'FOUNDATION-BACKLOG-DETAIL-ENDPOINT-001'
export const FOUNDATION_BACKLOG_DETAIL_ENDPOINT_CLOSEOUT_KEY = 'foundation-backlog-detail-endpoint-v1'
export const FOUNDATION_BACKLOG_DETAIL_ENDPOINT_VERSION = 'foundation-backlog-detail.endpoint.v1'
export const FOUNDATION_BACKLOG_DETAIL_ENDPOINT_PLAN_PATH = 'docs/process/foundation-backlog-detail-endpoint-001-plan.md'
export const FOUNDATION_BACKLOG_DETAIL_ENDPOINT_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-BACKLOG-DETAIL-ENDPOINT-001.json'
export const FOUNDATION_BACKLOG_DETAIL_ENDPOINT_SCRIPT_PATH = 'scripts/process-foundation-backlog-detail-endpoint-check.mjs'
export const FOUNDATION_BACKLOG_DETAIL_ENDPOINT_SPRINT_ID = 'foundation-backlog-detail-endpoint-2026-05-15'
export const FOUNDATION_BACKLOG_DETAIL_ENDPOINT_PATH_TEMPLATE = '/api/foundation/backlog/:cardId'
export const FOUNDATION_BACKLOG_LIST_ENDPOINT_VERSION = 'foundation-backlog-list.endpoint.v1'
export const FOUNDATION_BACKLOG_LIST_ENDPOINT_PATH = '/api/foundation/backlog'
export const FOUNDATION_BACKLOG_DONE_ARCHIVE_ENDPOINT_VERSION = 'foundation-backlog-done-archive.endpoint.v1'
export const FOUNDATION_BACKLOG_DONE_ARCHIVE_ENDPOINT_PATH = '/api/foundation/backlog/done-archive'
export const FOUNDATION_BACKLOG_RECENT_DONE_WINDOW = 25
export const FOUNDATION_BACKLOG_DETAIL_ENDPOINT_BUDGET_BYTES = 50_000
export const FOUNDATION_BACKLOG_DETAIL_ENDPOINT_BUDGET_MS = 500
export const FOUNDATION_BACKLOG_LIST_ENDPOINT_BUDGET_BYTES = 700_000
export const FOUNDATION_BACKLOG_LIST_ENDPOINT_BUDGET_MS = 1_500
export const FOUNDATION_BACKLOG_DONE_ARCHIVE_ENDPOINT_BUDGET_BYTES = 900_000
export const FOUNDATION_BACKLOG_DONE_ARCHIVE_ENDPOINT_BUDGET_MS = 1_500

export const FOUNDATION_BACKLOG_CARD_ID_PATTERN = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d{3}$/

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeSearchText(value) {
  return normalizeText(value).toLowerCase().replace(/[_.:/]+/g, ' ')
}

function timestampMs(value) {
  const date = value ? new Date(value) : null
  const time = date && Number.isFinite(date.getTime()) ? date.getTime() : 0
  return time
}

function compareRecentBacklogItems(a = {}, b = {}) {
  const updatedDelta = timestampMs(b.updatedAt || b.updated_at || b.createdAt || b.created_at) -
    timestampMs(a.updatedAt || a.updated_at || a.createdAt || a.created_at)
  if (updatedDelta !== 0) return updatedDelta
  return String(a.id || '').localeCompare(String(b.id || ''))
}

export function normalizeFoundationBacklogCardId(value) {
  return normalizeText(value).toUpperCase()
}

function doneSemanticsText(item = {}) {
  return [
    item.id,
    item.title,
    item.scope,
    item.team,
    item.lane,
    item.source,
    item.summary,
    item.whyItMatters,
    item.why_it_matters,
    item.nextAction,
    item.next_action,
    item.statusNote,
    item.status_note,
    item.owner,
  ].map(normalizeSearchText).filter(Boolean).join(' ')
}

function addSignal(signals, key, label, matched) {
  if (!matched) return
  if (signals.some(signal => signal.key === key)) return
  signals.push({ key, label })
}

function hasDoneSemanticsMatch(text, patterns = []) {
  return patterns.some(pattern => pattern.test(text))
}

export function classifyFoundationDormantCapability(item = {}) {
  const lane = normalizeSearchText(item.lane)
  if (lane !== 'done') {
    return {
      status: 'not_done',
      action: 'no_action',
      label: 'Not done',
      reviewRequired: false,
      plainEnglish: 'Dormant-capability review only applies to done rows.',
      matchedSignals: [],
    }
  }

  const text = doneSemanticsText(item)
  const signals = []
  const dormant = hasDoneSemanticsMatch(text, [
    /\bdormant\b/,
    /\bnot wired\b/,
    /\bnever wired\b/,
    /\bunwired\b/,
    /\bnot triggered\b/,
    /\bnot firing\b/,
    /\bnot active\b/,
    /\bnot live\b/,
    /\bnot connected\b/,
    /\bplaceholder\b/,
    /\bmanual only\b/,
    /\bmanual-only\b/,
    /\bsendsmessagenow=false\b/,
  ])
  const liveWired = hasDoneSemanticsMatch(text, [
    /\bwired end-to-end\b/,
    /\bfires end-to-end\b/,
    /\btriggered by\b/,
    /\blive event\b/,
    /\breal event\b/,
    /\bruntime hook\b/,
    /\bscheduled job\b/,
    /\bauto-send\b/,
    /\bauto send\b/,
    /\bautonomous\b/,
  ])
  const blocked = hasDoneSemanticsMatch(text, [
    /\bblocked\b/,
    /\bapproval\b/,
    /\bauth\b/,
    /\bcredential\b/,
    /\btoken missing\b/,
    /\bmissing token\b/,
    /\bexternal send not approved\b/,
    /\bnot authorized\b/,
  ])
  const parked = hasDoneSemanticsMatch(text, [
    /\bparked\b/,
    /\bdeferred\b/,
    /\boutside sprint\b/,
    /\bafter remap\b/,
    /\bfollow-up\b/,
    /\bfuture\b/,
  ])
  const retired = hasDoneSemanticsMatch(text, [
    /\bretired\b/,
    /\bsuperseded\b/,
    /\breplaced by\b/,
    /\bremoved from active use\b/,
    /\bdeprecated\b/,
  ])

  addSignal(signals, 'dormant', 'dormant/unwired language', dormant)
  addSignal(signals, 'live_wired', 'live end-to-end wiring language', liveWired)
  addSignal(signals, 'blocked', 'blocked/preflight language', blocked)
  addSignal(signals, 'parked', 'parked/deferred language', parked)
  addSignal(signals, 'retired', 'retired/superseded language', retired)

  if (!dormant) {
    return {
      status: 'wired_or_not_dormant',
      action: 'no_action',
      label: 'No dormant gap',
      reviewRequired: false,
      plainEnglish: 'No built-but-unwired signal was found, or the row also proves live wiring.',
      matchedSignals: signals.map(signal => signal.key),
    }
  }
  if (retired) {
    return {
      status: 'retired',
      action: 'retire',
      label: 'Retired dormant capability',
      reviewRequired: false,
      plainEnglish: 'The row names dormant capability but also marks it retired or superseded.',
      matchedSignals: signals.map(signal => signal.key),
    }
  }
  if (parked) {
    return {
      status: 'parked',
      action: 'park',
      label: 'Parked dormant capability',
      reviewRequired: false,
      plainEnglish: 'The row names dormant capability and explicitly parks or defers it.',
      matchedSignals: signals.map(signal => signal.key),
    }
  }
  if (blocked) {
    return {
      status: 'blocked_preflight',
      action: 'blocked_preflight',
      label: 'Blocked dormant capability',
      reviewRequired: false,
      plainEnglish: 'The row names dormant capability with an approval/auth/credential blocker.',
      matchedSignals: signals.map(signal => signal.key),
    }
  }
  if (liveWired) {
    return {
      status: 'wired_or_not_dormant',
      action: 'no_action',
      label: 'Dormant gap resolved',
      reviewRequired: false,
      plainEnglish: 'The row names dormant capability but also proves it now fires through live wiring.',
      matchedSignals: signals.map(signal => signal.key),
    }
  }

  return {
    status: 'wire_now',
    action: 'wire_now',
    label: 'Wire-now candidate',
    reviewRequired: true,
    plainEnglish: 'The row says a capability exists but is not wired or triggered; wire it now or explicitly block, park, or retire it.',
    matchedSignals: signals.map(signal => signal.key),
  }
}

export function classifyFoundationDoneSemantics(item = {}) {
  const lane = normalizeSearchText(item.lane)
  if (lane !== 'done') {
    return {
      status: 'not_done',
      label: 'Not done',
      featureComplete: false,
      featureCompleteClaimAllowed: false,
      explicitReviewCandidate: false,
      reasons: ['card is not in the done lane'],
      matchedSignals: [],
      plainEnglish: 'This card is not in done, so it is not a feature-complete claim.',
    }
  }

  const text = doneSemanticsText(item)
  const signals = []
  const blocked = hasDoneSemanticsMatch(text, [
    /\bblocked\b/,
    /\bblocker\b/,
    /\bblocking\b/,
    /\bparked\b/,
    /\bwaiting\b/,
    /\bpending approval\b/,
    /\bapproval required\b/,
    /\brequires approval\b/,
    /\bapproval bound\b/,
    /\bapproval-bound\b/,
    /\bmanual approval\b/,
    /\bhuman approval\b/,
    /\bnot authorized\b/,
    /\bauth required\b/,
    /\bauth-required\b/,
    /\blogin required\b/,
    /\bcredential missing\b/,
    /\bmissing credential\b/,
    /\bnot connected\b/,
    /\bsource unavailable\b/,
  ])
  const preflight = hasDoneSemanticsMatch(text, [
    /\bpreflight\b/,
    /\bdry run\b/,
    /\bdry-run\b/,
    /\bmetadata only\b/,
    /\bmetadata-only\b/,
    /\bread only\b/,
    /\bread-only\b/,
    /\breadiness\b/,
    /\bcontract only\b/,
    /\bcontract-only\b/,
    /\bapproval packet\b/,
    /\bpacket gated\b/,
    /\bpacket-gated\b/,
    /\bsource auth\b/,
    /\bsource\/auth\b/,
    /\bmap v1\b/,
    /\bsnapshot v1\b/,
  ])
  const boundedV1 = hasDoneSemanticsMatch(text, [
    /\bv1\b/,
    /\bversion 1\b/,
    /\bfirst slice\b/,
    /\bfirst pass\b/,
    /\bbounded\b/,
    /\bpilot\b/,
    /\bmvp\b/,
    /\bscoped only\b/,
    /\bminimum viable\b/,
  ])
  const explicitLimiter = hasDoneSemanticsMatch(text, [
    /\bnot full capability\b/,
    /\bnot feature complete\b/,
    /\bnot feature-complete\b/,
    /\bfeature complete is false\b/,
    /\bdoes not\b/,
    /\bno broad\b/,
    /\bno live\b/,
    /\bno extraction\b/,
    /\bno browser\b/,
    /\bno external write\b/,
    /\bblocked\b/,
    /\bpending\b/,
    /\bpreflight\b/,
    /\bmetadata-only\b/,
    /\bmetadata only\b/,
    /\bapproval\b/,
  ])
  const behaviorProof = hasDoneSemanticsMatch(text, [
    /\bbehavior proof\b/,
    /\bbehavior proven\b/,
    /\bproof\b/,
    /\bcloseout\b/,
    /\bfoundation verify\b/,
    /\bfoundation:verify\b/,
    /\bprocess:/,
    /\bpassed\b/,
    /\bgreen\b/,
    /\breal data\b/,
    /\breal outcome\b/,
  ])

  addSignal(signals, 'blocked', 'blocked/waiting language', blocked)
  addSignal(signals, 'preflight', 'preflight/contract/readiness language', preflight)
  addSignal(signals, 'v1', 'bounded V1 language', boundedV1)
  addSignal(signals, 'proof', 'proof/closeout language', behaviorProof)

  let status = 'done_unclear'
  let label = 'Done, needs review'
  let plainEnglish = 'Done row lacks limiting markers but also lacks behavior-proof language; review before calling it feature-complete.'
  if (blocked && preflight) {
    status = 'blocked_preflight'
    label = 'Blocked preflight'
    plainEnglish = 'Done row records a blocked or approval-bound preflight slice; do not read it as feature-complete.'
  } else if (blocked) {
    status = 'blocked_or_waiting'
    label = 'Blocked/waiting'
    plainEnglish = 'Done row still carries blocked, parked, waiting, auth, or approval language; do not read it as feature-complete.'
  } else if (preflight) {
    status = 'preflight_or_contract'
    label = 'Preflight/contract'
    plainEnglish = 'Done row proves a preflight, readiness, metadata, or contract slice; not the full capability.'
  } else if (boundedV1) {
    status = 'v1_contract'
    label = 'V1 contract'
    plainEnglish = 'Done row closes a bounded V1 contract; not a feature-complete claim.'
  } else if (behaviorProof) {
    status = 'behavior_proven'
    label = 'Behavior-proven done'
    plainEnglish = 'Done row has proof/closeout language and no V1, preflight, blocked, or approval limiter.'
  }

  const featureCompleteClaimAllowed = status === 'behavior_proven'
  return {
    status,
    label,
    featureComplete: featureCompleteClaimAllowed,
    featureCompleteClaimAllowed,
    explicitReviewCandidate: status !== 'behavior_proven' && (explicitLimiter || status === 'done_unclear'),
    reasons: signals.map(signal => signal.label),
    matchedSignals: signals.map(signal => signal.key),
    dormantCapability: classifyFoundationDormantCapability(item),
    plainEnglish,
  }
}

export function buildFoundationDormantCapabilityAuditSummary(items = {}) {
  const cards = Array.isArray(items) ? items : []
  const doneCards = cards.filter(item => item?.lane === 'done')
  const countsByStatus = {}
  const actionCounts = {}
  const reviewCandidateIds = []
  for (const item of doneCards) {
    const dormantCapability = item.doneSemantics?.dormantCapability || classifyFoundationDormantCapability(item)
    countsByStatus[dormantCapability.status] = (countsByStatus[dormantCapability.status] || 0) + 1
    actionCounts[dormantCapability.action] = (actionCounts[dormantCapability.action] || 0) + 1
    if (dormantCapability.reviewRequired) reviewCandidateIds.push(item.id)
  }
  return {
    doneItems: doneCards.length,
    countsByStatus,
    actionCounts,
    reviewCandidateItems: reviewCandidateIds.length,
    reviewCandidateIds,
    rule: 'Built-but-unwired done rows must resolve to wire-now, blocked-preflight, parked, or retired.',
  }
}

export function buildFoundationDoneSemanticsSummary(items = {}) {
  const cards = Array.isArray(items) ? items : []
  const doneCards = cards.filter(item => item?.lane === 'done')
  const countsByStatus = {}
  const reviewCandidateIds = []
  for (const item of doneCards) {
    const semantics = item.doneSemantics || classifyFoundationDoneSemantics(item)
    countsByStatus[semantics.status] = (countsByStatus[semantics.status] || 0) + 1
    if (semantics.explicitReviewCandidate) reviewCandidateIds.push(item.id)
  }
  return {
    doneItems: doneCards.length,
    countsByStatus,
    featureCompleteClaimAllowedItems: doneCards.filter(item =>
      (item.doneSemantics || classifyFoundationDoneSemantics(item)).featureCompleteClaimAllowed === true
    ).length,
    nonFeatureCompleteDoneItems: doneCards.filter(item =>
      (item.doneSemantics || classifyFoundationDoneSemantics(item)).featureCompleteClaimAllowed !== true
    ).length,
    explicitReviewCandidateItems: reviewCandidateIds.length,
    reviewCandidateIds,
    dormantCapabilityAudit: buildFoundationDormantCapabilityAuditSummary(cards),
    rule: 'V1, preflight, blocked, approval-bound, or unclear done rows must not read as feature-complete.',
  }
}

export function validateFoundationBacklogCardId(value) {
  const cardId = normalizeFoundationBacklogCardId(value)
  return {
    ok: FOUNDATION_BACKLOG_CARD_ID_PATTERN.test(cardId),
    cardId,
    error: cardId ? 'invalid_card_id' : 'missing_card_id',
  }
}

export function buildFoundationBacklogDetailCard(item = {}) {
  if (!item || typeof item !== 'object' || !item.id) return null
  return {
    id: item.id,
    title: item.title || '',
    scope: item.scope || item.team || '',
    team: item.team || item.scope || '',
    lane: item.lane || '',
    priority: item.priority || '',
    rank: item.rank ?? null,
    source: item.source || '',
    summary: item.summary || '',
    whyItMatters: item.whyItMatters || '',
    nextAction: item.nextAction || '',
    statusNote: item.statusNote || '',
    owner: item.owner || '',
    createdAt: item.createdAt || item.created_at || null,
    updatedAt: item.updatedAt || item.updated_at || null,
    doneSemantics: classifyFoundationDoneSemantics(item),
  }
}

function buildFoundationBacklogArchiveCard(item = {}) {
  const card = buildFoundationBacklogDetailCard(item)
  if (!card) return null
  const doneSemantics = card.doneSemantics || {}
  return {
    ...card,
    doneSemantics: {
      status: doneSemantics.status || '',
      label: doneSemantics.label || '',
      featureComplete: doneSemantics.featureComplete === true,
      featureCompleteClaimAllowed: doneSemantics.featureCompleteClaimAllowed === true,
      explicitReviewCandidate: doneSemantics.explicitReviewCandidate === true,
      plainEnglish: doneSemantics.plainEnglish || '',
    },
  }
}

export function buildFoundationBacklogDetailPayload({
  cardId,
  backlogItems = [],
  generatedAt = new Date().toISOString(),
} = {}) {
  const validation = validateFoundationBacklogCardId(cardId)
  if (!validation.ok) {
    return {
      ok: false,
      status: 'invalid_card_id',
      httpStatus: 400,
      cardId: validation.cardId,
      error: validation.error,
      generatedAt,
    }
  }

  const item = (Array.isArray(backlogItems) ? backlogItems : []).find(row => row?.id === validation.cardId) || null
  if (!item) {
    return {
      ok: false,
      status: 'not_found',
      httpStatus: 404,
      cardId: validation.cardId,
      error: 'backlog_card_not_found',
      generatedAt,
    }
  }

  return {
    ok: true,
    status: 'healthy',
    httpStatus: 200,
    contractVersion: FOUNDATION_BACKLOG_DETAIL_ENDPOINT_VERSION,
    cardId: validation.cardId,
    generatedAt,
    card: buildFoundationBacklogDetailCard(item),
    source: {
      route: FOUNDATION_BACKLOG_DETAIL_ENDPOINT_PATH_TEMPLATE,
      readModel: 'single-card backlog detail',
      defaultListRoute: FOUNDATION_BACKLOG_LIST_ENDPOINT_PATH,
      fullDiagnosticsRoute: '/api/foundation-hub?view=full',
    },
  }
}

export function buildFoundationBacklogListPayload({
  backlogItems = [],
  meta = {},
  researchCuration = null,
  requestedCardIds = [],
  recentDoneLimit = FOUNDATION_BACKLOG_RECENT_DONE_WINDOW,
  generatedAt = new Date().toISOString(),
} = {}) {
  const items = (Array.isArray(backlogItems) ? backlogItems : [])
    .map(buildFoundationBacklogDetailCard)
    .filter(Boolean)
  const requestSet = new Set((Array.isArray(requestedCardIds) ? requestedCardIds : [])
    .map(normalizeFoundationBacklogCardId)
    .filter(Boolean))
  const limit = Math.max(0, Math.min(100, Number(recentDoneLimit) || FOUNDATION_BACKLOG_RECENT_DONE_WINDOW))
  const doneItems = items.filter(item => item.lane === 'done').sort(compareRecentBacklogItems)
  const recentDoneItems = doneItems.slice(0, limit)
  const recentDoneIds = new Set(recentDoneItems.map(item => item.id))
  const archivedDoneItems = doneItems.filter(item => !recentDoneIds.has(item.id))
  const actionRouteBacklogIds = getActionRouteBacklogItemIds(items)
  const separatedActionRouteRows = items.filter(item => actionRouteBacklogIds.has(item.id))
  const queueEligibleItems = filterBacklogItemsForDefaultQueue(items, { requestedCardIds })
  const visibleItems = queueEligibleItems.filter(item =>
    item.lane !== 'done' ||
      recentDoneIds.has(item.id) ||
      requestSet.has(item.id)
  )
  const requestedArchivedDoneItems = visibleItems.filter(item =>
    item.lane === 'done' &&
      requestSet.has(item.id) &&
      !recentDoneIds.has(item.id)
  )
  return {
    ok: true,
    status: 'healthy',
    httpStatus: 200,
    contractVersion: FOUNDATION_BACKLOG_LIST_ENDPOINT_VERSION,
    generatedAt,
    summary: {
      totalItems: items.length,
      visibleItems: visibleItems.length,
      doneItems: doneItems.length,
      activeItems: items.filter(item => item.lane !== 'done').length,
      recentDoneItems: recentDoneItems.length,
      archivedDoneItems: archivedDoneItems.length,
      requestedArchivedDoneItems: requestedArchivedDoneItems.length,
      reviewInboxItems: separatedActionRouteRows.length,
      defaultHiddenReviewItems: separatedActionRouteRows.filter(item => !requestSet.has(item.id)).length,
      recentDoneWindow: limit,
      doneSemantics: buildFoundationDoneSemanticsSummary(items),
    },
    meta: {
      backlogIdPrefixes: Array.isArray(meta.backlogIdPrefixes) ? meta.backlogIdPrefixes : [],
      backlogScopes: Array.isArray(meta.backlogScopes) ? meta.backlogScopes : [],
    },
    researchCuration,
    backlogItems: visibleItems,
    doneArchive: {
      route: FOUNDATION_BACKLOG_DONE_ARCHIVE_ENDPOINT_PATH,
      available: archivedDoneItems.length > 0,
      archivedDoneItems: archivedDoneItems.length,
      recentDoneWindow: limit,
      historyPreserved: true,
    },
    reviewInbox: {
      route: ACTION_ROUTE_REVIEW_INBOX_API_PATH,
      available: separatedActionRouteRows.length > 0,
      separatedItems: separatedActionRouteRows.length,
      separatedItemIds: separatedActionRouteRows.map(item => item.id),
      defaultQueueSeparated: true,
      focusedCardStillLoads: true,
    },
    source: {
      route: FOUNDATION_BACKLOG_LIST_ENDPOINT_PATH,
      readModel: 'backlog list',
      detailRoute: FOUNDATION_BACKLOG_DETAIL_ENDPOINT_PATH_TEMPLATE,
      doneArchiveRoute: FOUNDATION_BACKLOG_DONE_ARCHIVE_ENDPOINT_PATH,
      reviewInboxRoute: ACTION_ROUTE_REVIEW_INBOX_API_PATH,
      defaultHubRoute: '/api/foundation-hub',
      fullDiagnosticsRoute: '/api/foundation-hub?view=full',
    },
  }
}

export function buildFoundationBacklogDoneArchivePayload({
  backlogItems = [],
  limit = 500,
  offset = 0,
  query = '',
  recentDoneLimit = FOUNDATION_BACKLOG_RECENT_DONE_WINDOW,
  generatedAt = new Date().toISOString(),
} = {}) {
  const items = (Array.isArray(backlogItems) ? backlogItems : [])
    .map(buildFoundationBacklogArchiveCard)
    .filter(Boolean)
  const doneItems = items.filter(item => item.lane === 'done').sort(compareRecentBacklogItems)
  const recentDoneIds = new Set(doneItems
    .slice(0, Math.max(0, Math.min(100, Number(recentDoneLimit) || FOUNDATION_BACKLOG_RECENT_DONE_WINDOW)))
    .map(item => item.id))
  const archiveItems = doneItems.filter(item => !recentDoneIds.has(item.id))
  const needle = normalizeText(query).toLowerCase()
  const filteredItems = needle
    ? archiveItems.filter(item => [
      item.id,
      item.title,
      item.scope,
      item.priority,
      item.summary,
      item.whyItMatters,
      item.nextAction,
      item.statusNote,
      item.owner,
      item.source,
    ].filter(Boolean).join(' ').toLowerCase().includes(needle))
    : archiveItems
  const pageLimit = Math.max(1, Math.min(1000, Number(limit) || 500))
  const pageOffset = Math.max(0, Number(offset) || 0)
  const pageItems = filteredItems.slice(pageOffset, pageOffset + pageLimit)
  return {
    ok: true,
    status: 'healthy',
    httpStatus: 200,
    contractVersion: FOUNDATION_BACKLOG_DONE_ARCHIVE_ENDPOINT_VERSION,
    generatedAt,
    summary: {
      totalItems: items.length,
      doneItems: doneItems.length,
      activeItems: items.filter(item => item.lane !== 'done').length,
      archivedDoneItems: archiveItems.length,
      filteredDoneItems: filteredItems.length,
      returnedItems: pageItems.length,
      recentDoneWindow: Math.max(0, Math.min(100, Number(recentDoneLimit) || FOUNDATION_BACKLOG_RECENT_DONE_WINDOW)),
      limit: pageLimit,
      offset: pageOffset,
      hasMore: pageOffset + pageItems.length < filteredItems.length,
      doneSemantics: buildFoundationDoneSemanticsSummary(doneItems),
    },
    backlogItems: pageItems,
    source: {
      route: FOUNDATION_BACKLOG_DONE_ARCHIVE_ENDPOINT_PATH,
      readModel: 'older done-card archive',
      defaultListRoute: FOUNDATION_BACKLOG_LIST_ENDPOINT_PATH,
      detailRoute: FOUNDATION_BACKLOG_DETAIL_ENDPOINT_PATH_TEMPLATE,
      fullDiagnosticsRoute: '/api/foundation-hub?view=full',
    },
  }
}

export function validateFoundationBacklogListPayload(payload = {}) {
  const failures = []
  if (payload?.ok !== true) failures.push('payload is not ok')
  if (payload?.status !== 'healthy') failures.push('payload status is not healthy')
  if (payload?.contractVersion !== FOUNDATION_BACKLOG_LIST_ENDPOINT_VERSION) failures.push('contract version mismatch')
  if (!Array.isArray(payload?.backlogItems)) failures.push('backlogItems is not an array')
  if (Number(payload?.summary?.visibleItems) !== (payload?.backlogItems || []).length) failures.push('summary visible total does not match backlog rows')
  if (Number(payload?.summary?.totalItems) < (payload?.backlogItems || []).length) failures.push('summary total is below visible rows')
  if (!payload?.doneArchive?.route) failures.push('done archive route missing')
  if (!payload?.reviewInbox?.route) failures.push('review inbox route missing')
  if (!Array.isArray(payload?.meta?.backlogScopes)) failures.push('backlog scopes metadata missing')
  return {
    ok: failures.length === 0,
    failures,
    totalItems: Number(payload?.summary?.totalItems) || 0,
    visibleItems: payload?.backlogItems?.length || 0,
    archivedDoneItems: Number(payload?.summary?.archivedDoneItems) || 0,
  }
}

export function validateFoundationBacklogDoneArchivePayload(payload = {}) {
  const failures = []
  if (payload?.ok !== true) failures.push('payload is not ok')
  if (payload?.status !== 'healthy') failures.push('payload status is not healthy')
  if (payload?.contractVersion !== FOUNDATION_BACKLOG_DONE_ARCHIVE_ENDPOINT_VERSION) failures.push('contract version mismatch')
  if (!Array.isArray(payload?.backlogItems)) failures.push('backlogItems is not an array')
  if ((payload?.backlogItems || []).some(item => item.lane !== 'done')) failures.push('archive contains non-done rows')
  if (Number(payload?.summary?.returnedItems) !== (payload?.backlogItems || []).length) failures.push('returned item count mismatch')
  if (!payload?.source?.defaultListRoute) failures.push('default list route missing')
  return {
    ok: failures.length === 0,
    failures,
    returnedItems: payload?.backlogItems?.length || 0,
    archivedDoneItems: Number(payload?.summary?.archivedDoneItems) || 0,
  }
}

export function validateFoundationBacklogDetailPayload(payload = {}) {
  const failures = []
  if (payload?.ok !== true) failures.push('payload is not ok')
  if (payload?.status !== 'healthy') failures.push('payload status is not healthy')
  if (payload?.contractVersion !== FOUNDATION_BACKLOG_DETAIL_ENDPOINT_VERSION) failures.push('contract version mismatch')
  if (!FOUNDATION_BACKLOG_CARD_ID_PATTERN.test(String(payload?.cardId || ''))) failures.push('card id is invalid')
  if (!payload?.card || payload.card.id !== payload.cardId) failures.push('card payload is missing or mismatched')
  for (const field of ['title', 'summary', 'whyItMatters', 'nextAction', 'statusNote']) {
    if (typeof payload?.card?.[field] !== 'string') failures.push(`card ${field} is not string`)
  }
  return {
    ok: failures.length === 0,
    failures,
    cardId: payload?.cardId || null,
  }
}

export function buildFoundationBacklogDetailEndpointDogfoodProof() {
  const fixture = [{
    id: 'FOUNDATION-DETAIL-DOGFOOD-001',
    title: 'Synthetic detail card',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 1,
    source: 'synthetic dogfood',
    summary: 'Short summary',
    whyItMatters: 'Full why text should stay available on the detail endpoint.',
    nextAction: 'Read one card by ID instead of full diagnostics.',
    statusNote: 'Synthetic status note',
    owner: 'Foundation Process',
    createdAt: '2026-05-15T00:00:00.000Z',
    updatedAt: '2026-05-15T00:00:00.000Z',
  }]
  const found = buildFoundationBacklogDetailPayload({ cardId: fixture[0].id, backlogItems: fixture })
  const missing = buildFoundationBacklogDetailPayload({ cardId: 'FOUNDATION-DETAIL-DOGFOOD-999', backlogItems: fixture })
  const malformed = buildFoundationBacklogDetailPayload({ cardId: '../../etc/passwd', backlogItems: fixture })
  const validation = validateFoundationBacklogDetailPayload(found)
  return {
    ok: validation.ok === true &&
      found.httpStatus === 200 &&
      missing.httpStatus === 404 &&
      malformed.httpStatus === 400 &&
      found.card.whyItMatters.includes('Full why text'),
    found,
    missing,
    malformed,
    validation,
    invariant: 'Single-card detail returns full card text for a valid card, 404 for a missing valid card, and 400 for malformed IDs.',
  }
}
