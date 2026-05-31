import {
  ACTION_ROUTE_REVIEW_INBOX_API_PATH,
  buildActionRouteReviewInboxSnapshot,
  validateActionRouteReviewInboxSnapshot,
} from './action-route-review-inbox.js'
import {
  buildActionRouteApplySafetyPreflight,
  validateActionRouteApplySafetyPreflight,
} from './action-route-apply-safety-preflight.js'

export const DEV_HUB_ROUTE_REVIEW_TRIAGE_CARD_ID = 'DEV-HUB-ROUTE-REVIEW-TRIAGE-001'
export const DEV_HUB_ROUTE_REVIEW_TRIAGE_CLOSEOUT_KEY = 'dev-hub-route-review-triage-v1'
export const DEV_HUB_ROUTE_REVIEW_TRIAGE_PLAN_PATH = 'docs/process/dev-hub-route-review-triage-001-plan.md'
export const DEV_HUB_ROUTE_REVIEW_TRIAGE_APPROVAL_PATH = 'docs/process/approvals/DEV-HUB-ROUTE-REVIEW-TRIAGE-001.json'
export const DEV_HUB_ROUTE_REVIEW_TRIAGE_SCRIPT_PATH = 'scripts/process-dev-hub-route-review-triage-check.mjs'
export const DEV_HUB_ROUTE_REVIEW_TRIAGE_CONTRACT_VERSION = 'dev-hub-route-review-triage.v1'
export const DEV_HUB_ROUTE_REVIEW_TRIAGE_VISIBLE_HOME = 'Dev Hub > Data Pool > Route Review Triage'

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function count(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function toIso(value) {
  if (value instanceof Date) return value.toISOString()
  const date = new Date(value || '')
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

function truncate(value, maxChars = 170) {
  const normalized = text(value)
  if (normalized.length <= maxChars) return normalized
  return `${normalized.slice(0, Math.max(0, maxChars - 3)).trim()}...`
}

function buildBoundaries() {
  return {
    readOnly: true,
    proposalOnly: true,
    noRouteApprove: true,
    noRouteApply: true,
    noRouteReject: true,
    noRouteSnooze: true,
    noRouteReroute: true,
    noDestinationMutation: true,
    noBacklogMutation: true,
    noScoperMutation: true,
    noPortfolioMutation: true,
    noHarlanSend: true,
    noLiveExtraction: true,
    noModelCalls: true,
    noExternalWrites: true,
    noAutoApply: true,
    noAutoClear: true,
    noAutoPromoteRecommendations: true,
  }
}

function hasReason(item = {}, reason = '') {
  return list(item.reviewReasons).includes(reason) ||
    list(item.riskReasons).includes(reason) ||
    list(item.hardBlocks).includes(reason)
}

function compactRouteItem(item = {}) {
  return {
    reviewItemId: text(item.reviewItemId),
    routeId: text(item.routeId),
    title: truncate(item.title || item.routeId || 'Route review item', 130),
    owner: text(item.owner),
    approvalStatus: text(item.approvalStatus),
    safetyState: text(item.safetyState || 'review'),
    destinationTable: text(item.destinationTable),
    type: text(item.type),
    ageDays: item.ageDays === null || item.ageDays === undefined ? null : count(item.ageDays),
    sourceRefCount: count(item.sourceRefCount),
    duplicateClusterCount: count(item.duplicateClusterCount),
    stalenessSeverity: text(item.stalenessSeverity || 'none'),
    reviewReasons: list(item.reviewReasons).slice(0, 4),
    riskReasons: list(item.riskReasons).slice(0, 4),
    hardBlocks: list(item.hardBlocks).slice(0, 4),
    wouldAllowConfirmedApply: item.wouldAllowConfirmedApply === true,
    applyAllowedNow: false,
  }
}

function topItems(items = [], filterFn = () => true, limit = 6) {
  return list(items)
    .filter(filterFn)
    .map(compactRouteItem)
    .slice(0, limit)
}

function oldestItems(items = [], limit = 6) {
  return [...list(items)]
    .filter(item => Number.isFinite(Number(item.ageDays)))
    .sort((left, right) => Number(right.ageDays) - Number(left.ageDays))
    .map(compactRouteItem)
    .slice(0, limit)
}

function buildTriageBuckets(summary = {}) {
  const buckets = []
  if (count(summary.readyForConfirmedApplyItems) > 0) {
    buckets.push({
      bucketId: 'ready-for-confirmed-apply',
      label: 'Ready for confirmed apply',
      count: count(summary.readyForConfirmedApplyItems),
      action: 'Only apply after a separate exact route-ID confirmation and approver.',
    })
  }
  if (count(summary.ownerRequiredItems) > 0) {
    buckets.push({
      bucketId: 'owner-required',
      label: 'Owner required',
      count: count(summary.ownerRequiredItems),
      action: 'Assign or reject owner before this can become useful work.',
    })
  }
  if (count(summary.sensitiveReviewItems) > 0) {
    buckets.push({
      bucketId: 'sensitive-review',
      label: 'Sensitive review',
      count: count(summary.sensitiveReviewItems),
      action: 'Keep human review; do not auto-clear people, customer, money, auth, or external-system routes.',
    })
  }
  if (count(summary.duplicateOrStaleReviewItems) > 0) {
    buckets.push({
      bucketId: 'duplicate-or-stale',
      label: 'Duplicate or stale',
      count: count(summary.duplicateOrStaleReviewItems),
      action: 'Review once, then separately duplicate/link/reject/snooze if approved.',
    })
  }
  if (count(summary.operatorReviewRequiredItems) > 0) {
    buckets.push({
      bucketId: 'operator-review',
      label: 'Operator review',
      count: count(summary.operatorReviewRequiredItems),
      action: 'Use this as the main queue; triage does not approve or apply.',
    })
  }
  return buckets.slice(0, 6)
}

function buildPlainEnglish(summary = {}) {
  return `${count(summary.needsReviewItems)} route review item(s) are waiting. Triage reduces the queue into ${count(summary.ownerRequiredItems)} owner gap(s), ${count(summary.sensitiveReviewItems)} sensitive route(s), ${count(summary.duplicateOrStaleReviewItems)} duplicate/stale route(s), and ${count(summary.readyForConfirmedApplyItems)} route(s) ready only for separate confirmed apply. No route is cleared or applied by this panel.`
}

export function buildDevHubRouteReviewTriage({
  generatedAt = new Date().toISOString(),
  actionRouter = {},
  backlogItems = [],
  maxItems = 500,
} = {}) {
  const generatedAtIso = toIso(generatedAt)
  const now = new Date(generatedAtIso)
  const reviewInbox = buildActionRouteReviewInboxSnapshot({
    actionRouter,
    backlogItems,
    generatedAt: generatedAtIso,
    now,
  })
  const reviewValidation = validateActionRouteReviewInboxSnapshot(reviewInbox)
  const applySafety = buildActionRouteApplySafetyPreflight(reviewInbox, {
    now,
    maxItems,
  })
  const safetyValidation = validateActionRouteApplySafetyPreflight(applySafety)
  const allItems = list(applySafety.items)
  const summary = {
    totalReviewItems: count(reviewInbox.summary?.totalReviewItems),
    routeItems: count(applySafety.summary?.routeItems),
    needsReviewItems: count(reviewInbox.summary?.needsReviewItems),
    pendingRoutes: count(applySafety.summary?.pendingRoutes),
    approvedRoutes: count(applySafety.summary?.approvedRoutes),
    appliedRoutes: count(applySafety.summary?.appliedRoutes),
    rejectedRoutes: count(applySafety.summary?.rejectedRoutes),
    blockedItems: count(applySafety.summary?.blockedItems),
    operatorReviewRequiredItems: count(applySafety.summary?.operatorReviewRequiredItems),
    readyForConfirmedApplyItems: count(applySafety.summary?.readyForConfirmedApplyItems),
    alreadyResolvedItems: count(applySafety.summary?.alreadyResolvedItems),
    ownerRequiredItems: count(applySafety.summary?.ownerRequiredItems),
    sensitiveReviewItems: count(applySafety.summary?.sensitiveReviewItems),
    duplicateOrStaleReviewItems: count(applySafety.summary?.duplicateOrStaleReviewItems),
    decisionOrQuestionItems: allItems.filter(item => ['decisions', 'open_questions'].includes(text(item.destinationTable))).length,
    backlogDestinationItems: allItems.filter(item => text(item.destinationTable) === 'backlog_items').length,
    autoApplyAllowedItems: count(applySafety.summary?.autoApplyAllowedItems),
    routesMutatedByReadback: 0,
    destinationsMutatedByReadback: 0,
    harlanSendsByReadback: 0,
    externalWritesByReadback: 0,
  }
  const failures = [
    ...reviewValidation.failures.map(item => `review:${item}`),
    ...safetyValidation.failures.map(item => `safety:${item}`),
  ]
  if (summary.autoApplyAllowedItems !== 0) failures.push('auto_apply_items_present')
  if (summary.routesMutatedByReadback !== 0) failures.push('readback_mutated_routes')
  if (summary.destinationsMutatedByReadback !== 0) failures.push('readback_mutated_destinations')
  if (summary.harlanSendsByReadback !== 0) failures.push('readback_sent_harlan')
  if (summary.externalWritesByReadback !== 0) failures.push('readback_external_write')

  return {
    ok: failures.length === 0,
    status: failures.length ? 'fail_closed' : summary.needsReviewItems ? 'needs_review' : 'healthy',
    contractVersion: DEV_HUB_ROUTE_REVIEW_TRIAGE_CONTRACT_VERSION,
    cardId: DEV_HUB_ROUTE_REVIEW_TRIAGE_CARD_ID,
    closeoutKey: DEV_HUB_ROUTE_REVIEW_TRIAGE_CLOSEOUT_KEY,
    generatedAt: generatedAtIso,
    visibleHome: DEV_HUB_ROUTE_REVIEW_TRIAGE_VISIBLE_HOME,
    source: {
      reviewInboxRoute: ACTION_ROUTE_REVIEW_INBOX_API_PATH,
      readModel: 'action-route review inbox + apply safety preflight',
      reusedTruthLayers: ['actionRouteReviewInbox', 'actionRouteApplySafetyPreflight'],
      noSecondTruthLayer: true,
    },
    summary,
    plainEnglish: buildPlainEnglish(summary),
    triageBuckets: buildTriageBuckets(summary),
    queues: {
      readyForConfirmedApply: topItems(allItems, item => item.wouldAllowConfirmedApply === true, 6),
      ownerRequired: topItems(allItems, item => hasReason(item, 'owner_resolution_required'), 6),
      sensitiveReview: topItems(allItems, item => hasReason(item, 'sensitive_content_review_required'), 6),
      duplicateOrStale: topItems(allItems, item => count(item.duplicateClusterCount) > 0 || ['red', 'yellow'].includes(text(item.stalenessSeverity)), 6),
      oldest: oldestItems(allItems, 6),
    },
    sourceReadbacks: {
      reviewInbox: {
        ok: reviewValidation.ok,
        summary: reviewInbox.summary,
      },
      applySafety: {
        ok: safetyValidation.ok,
        summary: applySafety.summary,
        safetyHash: applySafety.safetyHash || '',
      },
    },
    boundaries: buildBoundaries(),
    failures: Array.from(new Set(failures)),
  }
}

export function validateDevHubRouteReviewTriage(snapshot = {}) {
  const failures = []
  if (snapshot.ok !== true) failures.push(...list(snapshot.failures))
  if (!['needs_review', 'healthy'].includes(snapshot.status)) failures.push('status_not_operator_safe')
  if (snapshot.contractVersion !== DEV_HUB_ROUTE_REVIEW_TRIAGE_CONTRACT_VERSION) failures.push('contract_version_missing')
  if (snapshot.cardId !== DEV_HUB_ROUTE_REVIEW_TRIAGE_CARD_ID) failures.push('card_id_mismatch')
  if (snapshot.source?.reviewInboxRoute !== ACTION_ROUTE_REVIEW_INBOX_API_PATH) failures.push('review_inbox_route_missing')
  if (snapshot.source?.noSecondTruthLayer !== true) failures.push('second_truth_layer_risk')
  for (const layer of ['actionRouteReviewInbox', 'actionRouteApplySafetyPreflight']) {
    if (!list(snapshot.source?.reusedTruthLayers).includes(layer)) failures.push(`truth_layer_missing:${layer}`)
  }
  const boundaries = snapshot.boundaries || {}
  for (const key of ['readOnly', 'proposalOnly', 'noRouteApprove', 'noRouteApply', 'noRouteReject', 'noRouteSnooze', 'noRouteReroute', 'noDestinationMutation', 'noBacklogMutation', 'noExternalWrites', 'noAutoApply', 'noAutoClear']) {
    if (boundaries[key] !== true) failures.push(`boundary_missing:${key}`)
  }
  if (count(snapshot.summary?.autoApplyAllowedItems) !== 0) failures.push('auto_apply_items_present')
  if (count(snapshot.summary?.routesMutatedByReadback) !== 0) failures.push('readback_mutated_routes')
  if (count(snapshot.summary?.destinationsMutatedByReadback) !== 0) failures.push('readback_mutated_destinations')
  if (count(snapshot.summary?.harlanSendsByReadback) !== 0) failures.push('readback_sent_harlan')
  if (count(snapshot.summary?.externalWritesByReadback) !== 0) failures.push('readback_external_write')
  if (!text(snapshot.plainEnglish)) failures.push('plain_english_missing')
  if (list(snapshot.triageBuckets).length > 6 || !list(snapshot.triageBuckets).length) failures.push('triage_buckets_missing_or_unbounded')
  for (const queueName of ['readyForConfirmedApply', 'ownerRequired', 'sensitiveReview', 'duplicateOrStale', 'oldest']) {
    if (list(snapshot.queues?.[queueName]).length > 6) failures.push(`queue_unbounded:${queueName}`)
    for (const item of list(snapshot.queues?.[queueName])) {
      if (item.applyAllowedNow !== false) failures.push(`queue_item_allows_apply:${queueName}`)
    }
  }
  if (snapshot.sourceReadbacks?.reviewInbox?.ok !== true) failures.push('review_inbox_not_valid')
  if (snapshot.sourceReadbacks?.applySafety?.ok !== true) failures.push('apply_safety_not_valid')
  return {
    ok: failures.length === 0,
    failures: Array.from(new Set(failures)),
    summary: snapshot.summary || {},
  }
}

export function buildDevHubRouteReviewTriageDogfoodProof() {
  const now = '2026-05-31T06:00:00.000Z'
  const snapshot = buildDevHubRouteReviewTriage({
    generatedAt: now,
    actionRouter: {
      recentRoutes: [
        {
          routeId: 'action-route:ready',
          routeType: 'owner_action',
          approvalStatus: 'approved',
          destinationTable: 'backlog_items',
          owner: 'Foundation Process',
          sourceIds: ['SRC-MEETINGS-001'],
          factRefs: ['fact:ready'],
          evidenceRefs: ['atom:ready'],
          evidenceChunkRefs: ['chunk:ready'],
          routedAt: '2026-05-31T05:00:00.000Z',
          proposedPayload: { title: 'Internal proof task', summary: 'Internal source-backed work.' },
        },
        {
          routeId: 'action-route:owner',
          routeType: 'owner_action',
          approvalStatus: 'pending',
          destinationTable: 'backlog_items',
          owner: 'needs-owner-decision',
          sourceIds: ['SRC-MEETINGS-001'],
          factRefs: ['fact:owner'],
          evidenceRefs: ['atom:owner'],
          evidenceChunkRefs: ['chunk:owner'],
          routedAt: '2026-05-20T05:00:00.000Z',
          proposedPayload: { title: 'Owner gap task', summary: 'Needs an owner.' },
        },
        {
          routeId: 'action-route:sensitive',
          routeType: 'owner_action',
          approvalStatus: 'pending',
          destinationTable: 'decisions',
          owner: 'Steve',
          sourceIds: ['SRC-GMAIL-001'],
          factRefs: ['fact:sensitive'],
          evidenceRefs: ['atom:sensitive'],
          evidenceChunkRefs: ['chunk:sensitive'],
          routedAt: '2026-05-19T05:00:00.000Z',
          proposedPayload: { title: 'Client follow up decision', summary: 'Touches client and external follow up.' },
        },
      ],
    },
    backlogItems: [],
  })
  const validation = validateDevHubRouteReviewTriage(snapshot)
  const unsafe = {
    ...snapshot,
    summary: {
      ...snapshot.summary,
      autoApplyAllowedItems: 1,
      routesMutatedByReadback: 1,
    },
  }
  const unsafeValidation = validateDevHubRouteReviewTriage(unsafe)
  return {
    ok: validation.ok &&
      snapshot.summary.routeItems === 3 &&
      snapshot.summary.readyForConfirmedApplyItems === 1 &&
      snapshot.summary.ownerRequiredItems >= 1 &&
      snapshot.summary.sensitiveReviewItems >= 1 &&
      snapshot.summary.duplicateOrStaleReviewItems >= 1 &&
      list(snapshot.triageBuckets).length >= 4 &&
      list(snapshot.queues.readyForConfirmedApply).length === 1 &&
      unsafeValidation.ok === false &&
      unsafeValidation.failures.includes('auto_apply_items_present') &&
      unsafeValidation.failures.includes('readback_mutated_routes'),
    validation,
    unsafeValidation,
    snapshot,
    invariant: 'Route Review Triage groups waiting routes into bounded review buckets and rejects auto-apply or route mutation.',
  }
}
