import { createHash } from 'node:crypto'

import {
  ACTION_ROUTE_REVIEW_INBOX_API_PATH,
  ACTION_ROUTE_REVIEW_INBOX_VISIBLE_HOME,
  buildActionRouteReviewInboxSnapshot,
  validateActionRouteReviewInboxSnapshot,
} from './action-route-review-inbox.js'

export const ACTION_ROUTE_HARLAN_DIGEST_CARD_ID = 'ACTION-ROUTE-HARLAN-DIGEST-001'
export const ACTION_ROUTE_HARLAN_DIGEST_PARENT_CARD_ID = 'ACTION-ROUTE-APPLY-RESOLUTION-PROOF-002'
export const ACTION_ROUTE_HARLAN_DIGEST_CLOSEOUT_KEY = 'action-route-harlan-digest-dry-run-v1'
export const ACTION_ROUTE_HARLAN_DIGEST_PLAN_PATH = 'docs/process/action-route-harlan-digest-001-plan.md'
export const ACTION_ROUTE_HARLAN_DIGEST_APPROVAL_PATH = 'docs/process/approvals/ACTION-ROUTE-HARLAN-DIGEST-001.json'
export const ACTION_ROUTE_HARLAN_DIGEST_SCRIPT_PATH = 'scripts/process-action-route-harlan-digest-check.mjs'
export const ACTION_ROUTE_HARLAN_DIGEST_CONTRACT_VERSION = 'action-route-harlan-digest.v1'
export const ACTION_ROUTE_HARLAN_DIGEST_MESSAGE_MAX_CHARS = 1200
export const ACTION_ROUTE_HARLAN_DIGEST_ITEM_TITLE_MAX_CHARS = 96

export const ACTION_ROUTE_HARLAN_DIGEST_NOT_NEXT_BOUNDARIES = [
  'No live extraction.',
  'No transcript fetch, screenshot capture, crawl, summarization, or model call.',
  'No auth-required or paid run.',
  'No external write or Telegram send.',
  'No action-route approve, apply, reject, snooze, or backlog mutation.',
  'No Google Drive permission mutation.',
  'No live Agent Feedback auto-send.',
  'No Harlan runtime, reply parsing, login, source-session resume, or external-action authority.',
]

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function normalizeArray(value) {
  return Array.isArray(value)
    ? value.map(item => normalizeText(item)).filter(Boolean)
    : []
}

function stableHash(value) {
  return createHash('sha256').update(String(value || ''), 'utf8').digest('hex')
}

function truncateText(value, maxChars = ACTION_ROUTE_HARLAN_DIGEST_ITEM_TITLE_MAX_CHARS) {
  const normalized = normalizeText(value)
  if (normalized.length <= maxChars) return normalized
  return `${normalized.slice(0, Math.max(0, maxChars - 3)).trim()}...`
}

function truncateMessageText(value, maxChars = ACTION_ROUTE_HARLAN_DIGEST_MESSAGE_MAX_CHARS) {
  const normalized = String(value || '').replace(/[ \t]+/g, ' ').trim()
  if (normalized.length <= maxChars) return normalized
  return `${normalized.slice(0, Math.max(0, maxChars - 3)).trim()}...`
}

function count(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function isDigestCandidate(item = {}) {
  return ['needs_review', 'backlog_candidate_review', 'ready_to_apply'].includes(normalizeText(item.reviewState))
}

function compareDigestItems(left = {}, right = {}) {
  const leftStale = left.staleness?.severity === 'red' ? 0 : left.staleness?.severity === 'yellow' ? 1 : 2
  const rightStale = right.staleness?.severity === 'red' ? 0 : right.staleness?.severity === 'yellow' ? 1 : 2
  if (leftStale !== rightStale) return leftStale - rightStale
  const ageDelta = count(right.ageDays) - count(left.ageDays)
  if (ageDelta) return ageDelta
  return normalizeText(left.reviewItemId).localeCompare(normalizeText(right.reviewItemId))
}

function buildDigestItem(item = {}, index = 0) {
  const sourceRefs = normalizeArray(item.sourceRefs)
  const evidence = item.evidence && typeof item.evidence === 'object' ? item.evidence : {}
  const evidenceRefs = [
    ...normalizeArray(evidence.factRefs),
    ...normalizeArray(evidence.evidenceRefs),
    ...normalizeArray(evidence.evidenceChunkRefs),
    ...normalizeArray(evidence.atomRefs),
    ...normalizeArray(evidence.candidateKeys),
    ...normalizeArray(evidence.artifactIds),
  ]
  return {
    order: index + 1,
    reviewItemId: normalizeText(item.reviewItemId),
    routeId: normalizeText(item.routeId),
    type: normalizeText(item.type),
    owner: normalizeText(item.owner) || 'needs-owner-decision',
    reviewState: normalizeText(item.reviewState),
    approvalStatus: normalizeText(item.approvalStatus),
    destinationLabel: normalizeText(item.destinationLabel),
    title: truncateText(item.title || item.summary || item.reviewItemId),
    ageDays: Number.isFinite(Number(item.ageDays)) ? Number(item.ageDays) : null,
    sourceRefCount: sourceRefs.length,
    evidenceRefCount: evidenceRefs.length || sourceRefs.length,
    dedupeKey: normalizeText(item.dedupeKey),
    duplicateClusterCount: normalizeArray(item.duplicateClusterIds).length,
    stalenessStatus: normalizeText(item.staleness?.status || 'current'),
    stalenessSeverity: normalizeText(item.staleness?.severity || 'none'),
  }
}

function buildDigestMessage({ summary = {}, items = [] } = {}) {
  const lines = [
    `Harlan route review: ${count(summary.needsReviewItems)} item(s) waiting`,
    `Total ${count(summary.totalReviewItems)} | aged ${count(summary.agedNeedsReviewItems)} | pending routes ${count(summary.pendingRoutes)} | applied ${count(summary.appliedRoutes)}`,
  ]
  if (count(summary.duplicateClusters) || count(summary.staleRiskItems) || count(summary.staleWatchItems)) {
    lines.push(`Noise guard: duplicates ${count(summary.duplicateClusters)} | stale red ${count(summary.staleRiskItems)} | stale yellow ${count(summary.staleWatchItems)}`)
  }
  if (items.length) {
    lines.push('Top review items:')
    for (const item of items) {
      const age = item.ageDays === null ? 'age unknown' : `${item.ageDays}d old`
      lines.push(`${item.order}. ${item.owner} | ${item.type || item.destinationLabel || 'route'} | ${age}`)
      lines.push(`   ${item.title}`)
    }
  }
  lines.push(`Open: /foundation#action-route-review-inbox`)
  lines.push('Boundary: dry-run packet only. No send, no mutation, no approval, no apply.')
  return truncateMessageText(lines.join('\n'), ACTION_ROUTE_HARLAN_DIGEST_MESSAGE_MAX_CHARS)
}

export function buildActionRouteHarlanDigestPacket(snapshot = {}, {
  now = new Date(),
  maxItems = 5,
} = {}) {
  const snapshotValidation = validateActionRouteReviewInboxSnapshot(snapshot)
  const unsafeReasons = []
  if (!snapshotValidation.ok) unsafeReasons.push(...snapshotValidation.failures)
  if (snapshot.boundaries?.readOnly !== true) unsafeReasons.push('snapshot_not_read_only')
  if (snapshot.boundaries?.noExternalWrites !== true) unsafeReasons.push('snapshot_allows_external_writes')
  if (snapshot.source?.route !== ACTION_ROUTE_REVIEW_INBOX_API_PATH) unsafeReasons.push('wrong_review_inbox_source')
  if (unsafeReasons.length) {
    return {
      ok: false,
      status: 'fail_closed',
      contractVersion: ACTION_ROUTE_HARLAN_DIGEST_CONTRACT_VERSION,
      cardId: ACTION_ROUTE_HARLAN_DIGEST_CARD_ID,
      parentCardId: ACTION_ROUTE_HARLAN_DIGEST_PARENT_CARD_ID,
      closeoutKey: ACTION_ROUTE_HARLAN_DIGEST_CLOSEOUT_KEY,
      generatedAt: now instanceof Date ? now.toISOString() : new Date(now).toISOString(),
      failures: Array.from(new Set(unsafeReasons)),
      sendsMessageNow: false,
      externalSent: false,
      mutatedRoutes: false,
      messageText: '',
      textHash: '',
      source: {
        reviewInboxRoute: ACTION_ROUTE_REVIEW_INBOX_API_PATH,
        visibleHome: ACTION_ROUTE_REVIEW_INBOX_VISIBLE_HOME,
      },
      boundaries: buildDigestBoundaries(),
    }
  }

  const reviewItems = Array.isArray(snapshot.reviewItems) ? snapshot.reviewItems : []
  const items = reviewItems
    .filter(isDigestCandidate)
    .sort(compareDigestItems)
    .slice(0, Math.max(1, Number(maxItems) || 5))
    .map(buildDigestItem)
  const summary = {
    totalReviewItems: count(snapshot.summary?.totalReviewItems),
    needsReviewItems: count(snapshot.summary?.needsReviewItems),
    agedNeedsReviewItems: count(snapshot.summary?.agedNeedsReviewItems),
    pendingRoutes: count(snapshot.summary?.pendingRoutes),
    approvedRoutes: count(snapshot.summary?.approvedRoutes),
    appliedRoutes: count(snapshot.summary?.appliedRoutes),
    rejectedRoutes: count(snapshot.summary?.rejectedRoutes),
    duplicateClusters: count(snapshot.summary?.duplicateClusters),
    staleWatchItems: count(snapshot.summary?.staleWatchItems),
    staleRiskItems: count(snapshot.summary?.staleRiskItems),
    digestItemCount: items.length,
  }
  const messageText = buildDigestMessage({ summary, items })
  return {
    ok: true,
    status: items.length ? 'ready' : 'no_items',
    contractVersion: ACTION_ROUTE_HARLAN_DIGEST_CONTRACT_VERSION,
    cardId: ACTION_ROUTE_HARLAN_DIGEST_CARD_ID,
    parentCardId: ACTION_ROUTE_HARLAN_DIGEST_PARENT_CARD_ID,
    closeoutKey: ACTION_ROUTE_HARLAN_DIGEST_CLOSEOUT_KEY,
    generatedAt: now instanceof Date ? now.toISOString() : new Date(now).toISOString(),
    source: {
      reviewInboxRoute: ACTION_ROUTE_REVIEW_INBOX_API_PATH,
      reviewInboxContractVersion: snapshot.contractVersion || '',
      visibleHome: ACTION_ROUTE_REVIEW_INBOX_VISIBLE_HOME,
      sourceGeneratedAt: snapshot.generatedAt || '',
    },
    summary,
    items,
    messageText,
    textHash: stableHash(messageText),
    sendsMessageNow: false,
    externalSent: false,
    mutatedRoutes: false,
    boundaries: buildDigestBoundaries(),
  }
}

function buildDigestBoundaries() {
  return {
    readOnly: true,
    proposalOnly: true,
    noLiveExtraction: true,
    noModelCalls: true,
    noExternalWrites: true,
    sendsMessageNow: false,
    externalSent: false,
    routeMutation: false,
    backlogMutation: false,
    approvalMutation: false,
    harlanRuntimeStarted: false,
    replyParsingEnabled: false,
  }
}

export function validateActionRouteHarlanDigestPacket(packet = {}) {
  const failures = []
  const items = Array.isArray(packet.items) ? packet.items : []
  if (packet.ok !== true) failures.push(...normalizeArray(packet.failures))
  if (packet.contractVersion !== ACTION_ROUTE_HARLAN_DIGEST_CONTRACT_VERSION) failures.push('contract_version_missing')
  if (packet.cardId !== ACTION_ROUTE_HARLAN_DIGEST_CARD_ID) failures.push('card_id_mismatch')
  if (!['ready', 'no_items'].includes(packet.status)) failures.push('status_not_sendable_packet')
  if (packet.source?.reviewInboxRoute !== ACTION_ROUTE_REVIEW_INBOX_API_PATH) failures.push('review_inbox_source_missing')
  if (packet.boundaries?.readOnly !== true || packet.boundaries?.noExternalWrites !== true) failures.push('unsafe_boundaries')
  if (packet.sendsMessageNow !== false || packet.externalSent !== false) failures.push('packet_attempted_external_send')
  if (packet.mutatedRoutes !== false || packet.boundaries?.routeMutation !== false) failures.push('packet_attempted_route_mutation')
  if (packet.boundaries?.backlogMutation !== false || packet.boundaries?.approvalMutation !== false) failures.push('packet_attempted_internal_mutation')
  if (packet.boundaries?.harlanRuntimeStarted !== false || packet.boundaries?.replyParsingEnabled !== false) failures.push('packet_started_harlan_runtime')
  if (normalizeText(packet.messageText).length > ACTION_ROUTE_HARLAN_DIGEST_MESSAGE_MAX_CHARS) failures.push('message_text_over_budget')
  if (packet.status === 'ready' && !items.length) failures.push('ready_packet_missing_items')
  if (items.length !== count(packet.summary?.digestItemCount)) failures.push('digest_item_count_mismatch')
  for (const item of items) {
    if (!item.reviewItemId) failures.push('item_missing_review_item_id')
    if (!item.owner) failures.push(`item_missing_owner:${item.reviewItemId || 'unknown'}`)
    if (!item.title) failures.push(`item_missing_title:${item.reviewItemId || 'unknown'}`)
    if (normalizeText(item.title).length > ACTION_ROUTE_HARLAN_DIGEST_ITEM_TITLE_MAX_CHARS) failures.push(`item_title_over_budget:${item.reviewItemId || 'unknown'}`)
    if (count(item.sourceRefCount) < 1) failures.push(`item_missing_source_ref_count:${item.reviewItemId || 'unknown'}`)
    if (count(item.evidenceRefCount) < 1) failures.push(`item_missing_evidence_ref_count:${item.reviewItemId || 'unknown'}`)
  }
  return {
    ok: failures.length === 0,
    failures: Array.from(new Set(failures)),
    status: packet.status || 'missing',
    digestItemCount: items.length,
  }
}

export function buildActionRouteHarlanDigestDogfoodProof() {
  const now = new Date('2026-05-31T03:00:00.000Z')
  const longTitle = 'This is a deliberately long route title that must be bounded before any Harlan preview can become operator-facing because packet text cannot become another wall of route prose.'
  const snapshot = buildActionRouteReviewInboxSnapshot({
    now,
    generatedAt: now.toISOString(),
    actionRouter: {
      pendingRoutes: 2,
      approvedRoutes: 0,
      appliedRoutes: 1,
      rejectedRoutes: 0,
      recentRoutes: [
        {
          routeId: 'action-route:synthetic-digest-one',
          routeType: 'owner_action',
          approvalStatus: 'pending',
          destinationTable: 'backlog_items',
          owner: 'Foundation Action Router',
          sourceIds: ['SRC-YOUTUBE-001'],
          factRefs: ['fact:one'],
          evidenceRefs: ['atom:one'],
          evidenceChunkRefs: ['chunk:one'],
          routedAt: '2026-05-23T03:00:00.000Z',
          proposedPayload: { title: longTitle, summary: 'Synthetic route needs review.' },
        },
        {
          routeId: 'action-route:synthetic-digest-two',
          routeType: 'open_question',
          approvalStatus: 'pending',
          destinationTable: 'open_questions',
          owner: 'Foundation Process',
          sourceIds: ['SRC-MEETINGS-001'],
          factRefs: ['fact:two'],
          evidenceRefs: ['atom:two'],
          evidenceChunkRefs: ['chunk:two'],
          routedAt: '2026-05-31T02:00:00.000Z',
          proposedPayload: { title: 'Fresh route review item', summary: 'Synthetic fresh route.' },
        },
      ],
    },
    backlogItems: [],
  })
  const packet = buildActionRouteHarlanDigestPacket(snapshot, { now, maxItems: 3 })
  const validation = validateActionRouteHarlanDigestPacket(packet)
  const emptySnapshot = buildActionRouteReviewInboxSnapshot({
    now,
    generatedAt: now.toISOString(),
    actionRouter: { pendingRoutes: 0, approvedRoutes: 0, appliedRoutes: 0, rejectedRoutes: 0, recentRoutes: [] },
    backlogItems: [],
  })
  const emptyPacket = buildActionRouteHarlanDigestPacket(emptySnapshot, { now })
  const unsafeSnapshot = {
    ...snapshot,
    boundaries: {
      ...snapshot.boundaries,
      noExternalWrites: false,
    },
  }
  const unsafePacket = buildActionRouteHarlanDigestPacket(unsafeSnapshot, { now })
  return {
    ok: validation.ok &&
      packet.status === 'ready' &&
      packet.sendsMessageNow === false &&
      packet.externalSent === false &&
      packet.mutatedRoutes === false &&
      packet.items[0]?.ageDays >= packet.items[1]?.ageDays &&
      packet.items[0]?.title.length <= ACTION_ROUTE_HARLAN_DIGEST_ITEM_TITLE_MAX_CHARS &&
      emptyPacket.status === 'no_items' &&
      unsafePacket.status === 'fail_closed',
    packet,
    validation,
    emptyPacket,
    unsafePacket,
  }
}
