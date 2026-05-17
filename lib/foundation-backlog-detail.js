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
  const visibleItems = items.filter(item =>
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
      recentDoneWindow: limit,
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
    source: {
      route: FOUNDATION_BACKLOG_LIST_ENDPOINT_PATH,
      readModel: 'backlog list',
      detailRoute: FOUNDATION_BACKLOG_DETAIL_ENDPOINT_PATH_TEMPLATE,
      doneArchiveRoute: FOUNDATION_BACKLOG_DONE_ARCHIVE_ENDPOINT_PATH,
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
    .map(buildFoundationBacklogDetailCard)
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
