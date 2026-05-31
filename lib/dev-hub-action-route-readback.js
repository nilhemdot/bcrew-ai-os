import {
  ACTION_ROUTE_REVIEW_INBOX_API_PATH,
  ACTION_ROUTE_REVIEW_INBOX_VISIBLE_HOME,
  buildActionRouteReviewInboxSnapshot,
  validateActionRouteReviewInboxSnapshot,
} from './action-route-review-inbox.js'
import {
  ACTION_ROUTE_HARLAN_DIGEST_CONTRACT_VERSION,
  buildActionRouteHarlanDigestPacket,
  validateActionRouteHarlanDigestPacket,
} from './action-route-harlan-digest.js'
import {
  ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_CONTRACT_VERSION,
  buildActionRouteApplySafetyPreflight,
  validateActionRouteApplySafetyPreflight,
} from './action-route-apply-safety-preflight.js'

export const DEV_HUB_ACTION_ROUTE_READBACK_CARD_ID = 'DEV-HUB-ACTION-ROUTE-READBACK-001'
export const DEV_HUB_ACTION_ROUTE_READBACK_CLOSEOUT_KEY = 'dev-hub-action-route-readback-v1'
export const DEV_HUB_ACTION_ROUTE_READBACK_PLAN_PATH = 'docs/process/dev-hub-action-route-readback-001-plan.md'
export const DEV_HUB_ACTION_ROUTE_READBACK_APPROVAL_PATH = 'docs/process/approvals/DEV-HUB-ACTION-ROUTE-READBACK-001.json'
export const DEV_HUB_ACTION_ROUTE_READBACK_SCRIPT_PATH = 'scripts/process-dev-hub-action-route-readback-check.mjs'
export const DEV_HUB_ACTION_ROUTE_READBACK_CONTRACT_VERSION = 'dev-hub-action-route-readback.v1'
export const DEV_HUB_ACTION_ROUTE_READBACK_VISIBLE_HOME = 'Dev Hub > Data Pool > Action-route readback'

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

function truncate(value, maxChars = 220) {
  const normalized = text(value)
  if (normalized.length <= maxChars) return normalized
  return `${normalized.slice(0, Math.max(0, maxChars - 3)).trim()}...`
}

function toIso(value) {
  if (value instanceof Date) return value.toISOString()
  const date = new Date(value || '')
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

function buildBoundaries() {
  return {
    readOnly: true,
    noLiveExtraction: true,
    noModelCalls: true,
    noExternalWrites: true,
    noHarlanSend: true,
    noRouteMutation: true,
    noDestinationMutation: true,
    noBacklogMutation: true,
    noApprovalMutation: true,
    noAutoApply: true,
    noAutoPromoteRecommendations: true,
  }
}

function compactDigest(packet = {}) {
  return {
    status: packet.status || 'missing',
    contractVersion: packet.contractVersion || '',
    summary: packet.summary || {},
    items: list(packet.items).slice(0, 5).map(item => ({
      order: item.order,
      reviewItemId: item.reviewItemId,
      routeId: item.routeId,
      type: item.type,
      owner: item.owner,
      reviewState: item.reviewState,
      approvalStatus: item.approvalStatus,
      destinationLabel: item.destinationLabel,
      title: item.title,
      ageDays: item.ageDays,
      sourceRefCount: count(item.sourceRefCount),
      evidenceRefCount: count(item.evidenceRefCount),
      duplicateClusterCount: count(item.duplicateClusterCount),
      stalenessSeverity: item.stalenessSeverity || 'none',
    })),
    messageText: truncate(packet.messageText, 1200),
    textHash: packet.textHash || '',
    sendsMessageNow: packet.sendsMessageNow === true,
    externalSent: packet.externalSent === true,
    mutatedRoutes: packet.mutatedRoutes === true,
    boundaries: {
      readOnly: packet.boundaries?.readOnly === true,
      noExternalWrites: packet.boundaries?.noExternalWrites === true,
      routeMutation: packet.boundaries?.routeMutation === true,
      backlogMutation: packet.boundaries?.backlogMutation === true,
      harlanRuntimeStarted: packet.boundaries?.harlanRuntimeStarted === true,
      replyParsingEnabled: packet.boundaries?.replyParsingEnabled === true,
    },
  }
}

function compactSafety(preflight = {}) {
  return {
    status: preflight.status || 'missing',
    contractVersion: preflight.contractVersion || '',
    summary: preflight.summary || {},
    items: list(preflight.items).slice(0, 8).map(item => ({
      reviewItemId: item.reviewItemId,
      routeId: item.routeId,
      title: truncate(item.title, 140),
      owner: item.owner,
      approvalStatus: item.approvalStatus,
      reviewState: item.reviewState,
      destinationTable: item.destinationTable,
      type: item.type,
      ageDays: item.ageDays,
      sourceRefCount: count(item.sourceRefCount),
      duplicateClusterCount: count(item.duplicateClusterCount),
      stalenessSeverity: item.stalenessSeverity || 'none',
      riskReasons: list(item.riskReasons).slice(0, 4),
      reviewReasons: list(item.reviewReasons).slice(0, 5),
      hardBlocks: list(item.hardBlocks).slice(0, 5),
      safetyState: item.safetyState || 'blocked',
      wouldAllowConfirmedApply: item.wouldAllowConfirmedApply === true,
      applyAllowedNow: item.applyAllowedNow === true,
    })),
    autoApplyAllowed: preflight.autoApplyAllowed === true,
    routeMutationAttempted: preflight.routeMutationAttempted === true,
    destinationMutationAttempted: preflight.destinationMutationAttempted === true,
    externalWriteAttempted: preflight.externalWriteAttempted === true,
    nextHumanAction: preflight.nextHumanAction || '',
    safetyHash: preflight.safetyHash || '',
    boundaries: {
      readOnly: preflight.boundaries?.readOnly === true,
      noExternalWrites: preflight.boundaries?.noExternalWrites === true,
      noRouteMutation: preflight.boundaries?.noRouteMutation === true,
      noDestinationMutation: preflight.boundaries?.noDestinationMutation === true,
      noBacklogMutation: preflight.boundaries?.noBacklogMutation === true,
      noApprovalMutation: preflight.boundaries?.noApprovalMutation === true,
      noAutoApply: preflight.boundaries?.noAutoApply === true,
      noAutoPromoteRecommendations: preflight.boundaries?.noAutoPromoteRecommendations === true,
      applyRequiresRouteIdEcho: preflight.boundaries?.applyRequiresRouteIdEcho === true,
      applyRequiresHumanApprover: preflight.boundaries?.applyRequiresHumanApprover === true,
    },
  }
}

function buildPlainEnglishSummary(summary = {}, safetySummary = {}) {
  const waiting = count(summary.needsReviewItems)
  const pending = count(summary.pendingRoutes)
  const approved = count(summary.approvedRoutes)
  const ready = count(safetySummary.readyForConfirmedApplyItems)
  const applied = count(summary.appliedRoutes)
  if (waiting || pending) {
    return `${waiting || pending} route review item(s) are waiting; ${ready} approved internal route(s) are ready only for a separate confirmed apply; ${applied} route(s) are already applied.`
  }
  if (approved || ready) {
    return `${ready || approved} route(s) are approved but still require explicit route-ID confirmation before any internal apply.`
  }
  return 'No action-route review pressure is currently visible from the review inbox.'
}

export function buildDevHubActionRouteReadback({
  actionRouter = {},
  backlogItems = [],
  generatedAt = new Date().toISOString(),
  now = new Date(generatedAt),
  maxDigestItems = 5,
  maxSafetyItems = 8,
} = {}) {
  const generatedAtIso = toIso(generatedAt)
  const nowDate = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date(generatedAtIso)
  const reviewInbox = buildActionRouteReviewInboxSnapshot({
    actionRouter,
    backlogItems,
    generatedAt: generatedAtIso,
    now: nowDate,
  })
  const reviewValidation = validateActionRouteReviewInboxSnapshot(reviewInbox)
  const digest = buildActionRouteHarlanDigestPacket(reviewInbox, { now: nowDate, maxItems: maxDigestItems })
  const digestValidation = validateActionRouteHarlanDigestPacket(digest)
  const safety = buildActionRouteApplySafetyPreflight(reviewInbox, { now: nowDate, maxItems: maxSafetyItems })
  const safetyValidation = validateActionRouteApplySafetyPreflight(safety)
  const summary = {
    totalReviewItems: count(reviewInbox.summary?.totalReviewItems),
    routeItems: count(reviewInbox.summary?.routeItems),
    backlogCandidateItems: count(reviewInbox.summary?.backlogCandidateItems),
    needsReviewItems: count(reviewInbox.summary?.needsReviewItems),
    agedNeedsReviewItems: count(reviewInbox.summary?.agedNeedsReviewItems),
    pendingRoutes: count(reviewInbox.summary?.pendingRoutes),
    approvedRoutes: count(reviewInbox.summary?.approvedRoutes),
    appliedRoutes: count(reviewInbox.summary?.appliedRoutes),
    rejectedRoutes: count(reviewInbox.summary?.rejectedRoutes),
    digestItemCount: count(digest.summary?.digestItemCount),
    blockedItems: count(safety.summary?.blockedItems),
    operatorReviewRequiredItems: count(safety.summary?.operatorReviewRequiredItems),
    readyForConfirmedApplyItems: count(safety.summary?.readyForConfirmedApplyItems),
    alreadyResolvedItems: count(safety.summary?.alreadyResolvedItems),
    ownerRequiredItems: count(safety.summary?.ownerRequiredItems),
    sensitiveReviewItems: count(safety.summary?.sensitiveReviewItems),
    duplicateOrStaleReviewItems: count(safety.summary?.duplicateOrStaleReviewItems),
    autoApplyAllowedItems: count(safety.summary?.autoApplyAllowedItems),
  }
  const failures = [
    ...reviewValidation.failures.map(item => `review:${item}`),
    ...digestValidation.failures.map(item => `digest:${item}`),
    ...safetyValidation.failures.map(item => `safety:${item}`),
  ]
  const ok = reviewValidation.ok && digestValidation.ok && safetyValidation.ok &&
    digest.sendsMessageNow === false &&
    digest.externalSent === false &&
    digest.mutatedRoutes === false &&
    safety.autoApplyAllowed === false &&
    safety.routeMutationAttempted === false &&
    safety.destinationMutationAttempted === false &&
    safety.externalWriteAttempted === false &&
    summary.autoApplyAllowedItems === 0

  return {
    ok,
    status: ok ? 'healthy' : 'fail_closed',
    contractVersion: DEV_HUB_ACTION_ROUTE_READBACK_CONTRACT_VERSION,
    cardId: DEV_HUB_ACTION_ROUTE_READBACK_CARD_ID,
    closeoutKey: DEV_HUB_ACTION_ROUTE_READBACK_CLOSEOUT_KEY,
    generatedAt: generatedAtIso,
    visibleHome: DEV_HUB_ACTION_ROUTE_READBACK_VISIBLE_HOME,
    source: {
      reviewInboxRoute: ACTION_ROUTE_REVIEW_INBOX_API_PATH,
      reviewInboxVisibleHome: ACTION_ROUTE_REVIEW_INBOX_VISIBLE_HOME,
      harlanDigestContractVersion: ACTION_ROUTE_HARLAN_DIGEST_CONTRACT_VERSION,
      applySafetyContractVersion: ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_CONTRACT_VERSION,
      actionRouterRoute: 'getActionRouterSnapshot({ limit: 500 })',
      backlogRoute: 'getFoundationSnapshot().backlogItems',
    },
    summary,
    plainEnglish: buildPlainEnglishSummary(summary, safety.summary || {}),
    reviewInbox: {
      status: reviewInbox.status || 'missing',
      contractVersion: reviewInbox.contractVersion || '',
      visibleHome: reviewInbox.visibleHome || '',
      source: reviewInbox.source || {},
      dedupStaleness: reviewInbox.dedupStaleness ? {
        status: reviewInbox.dedupStaleness.status,
        summary: reviewInbox.dedupStaleness.summary,
      } : null,
      validation: reviewValidation,
    },
    harlanDigest: compactDigest(digest),
    applySafety: compactSafety(safety),
    sourceRoutes: [
      { label: 'Review inbox', route: ACTION_ROUTE_REVIEW_INBOX_API_PATH },
      { label: 'Harlan digest dry-run', route: 'buildActionRouteHarlanDigestPacket(reviewInbox)' },
      { label: 'Apply safety preflight', route: 'buildActionRouteApplySafetyPreflight(reviewInbox)' },
      { label: 'Action Router snapshot', route: 'getActionRouterSnapshot({ limit: 500 })' },
    ],
    boundaries: buildBoundaries(),
    failures: Array.from(new Set(failures)),
  }
}

export function validateDevHubActionRouteReadback(snapshot = {}) {
  const failures = []
  if (snapshot.ok !== true) failures.push(...list(snapshot.failures))
  if (snapshot.status !== 'healthy') failures.push('status_not_healthy')
  if (snapshot.contractVersion !== DEV_HUB_ACTION_ROUTE_READBACK_CONTRACT_VERSION) failures.push('contract_version_missing')
  if (snapshot.cardId !== DEV_HUB_ACTION_ROUTE_READBACK_CARD_ID) failures.push('card_id_mismatch')
  if (snapshot.source?.reviewInboxRoute !== ACTION_ROUTE_REVIEW_INBOX_API_PATH) failures.push('review_inbox_route_missing')
  if (snapshot.boundaries?.readOnly !== true || snapshot.boundaries?.noExternalWrites !== true) failures.push('unsafe_boundary')
  if (snapshot.boundaries?.noRouteMutation !== true || snapshot.boundaries?.noDestinationMutation !== true) failures.push('mutation_boundary_missing')
  if (snapshot.boundaries?.noAutoApply !== true || snapshot.boundaries?.noAutoPromoteRecommendations !== true) failures.push('auto_boundary_missing')
  if (snapshot.harlanDigest?.sendsMessageNow !== false || snapshot.harlanDigest?.externalSent !== false) failures.push('digest_would_send')
  if (snapshot.harlanDigest?.mutatedRoutes !== false) failures.push('digest_would_mutate_routes')
  if (snapshot.applySafety?.autoApplyAllowed !== false) failures.push('auto_apply_enabled')
  if (snapshot.applySafety?.routeMutationAttempted !== false || snapshot.applySafety?.destinationMutationAttempted !== false) failures.push('apply_safety_mutation_attempted')
  if (snapshot.applySafety?.externalWriteAttempted !== false) failures.push('apply_safety_external_write_attempted')
  if (count(snapshot.summary?.autoApplyAllowedItems) !== 0) failures.push('auto_apply_items_present')
  if (list(snapshot.harlanDigest?.items).length > 5) failures.push('digest_items_unbounded')
  if (list(snapshot.applySafety?.items).length > 8) failures.push('apply_safety_items_unbounded')
  if (!text(snapshot.plainEnglish)) failures.push('plain_english_missing')
  return {
    ok: failures.length === 0,
    failures: Array.from(new Set(failures)),
    summary: snapshot.summary || {},
  }
}

export function buildDevHubActionRouteReadbackDogfoodProof() {
  const now = new Date('2026-05-31T05:00:00.000Z')
  const snapshot = buildDevHubActionRouteReadback({
    generatedAt: now.toISOString(),
    now,
    actionRouter: {
      pendingRoutes: 2,
      approvedRoutes: 1,
      appliedRoutes: 1,
      rejectedRoutes: 0,
      recentRoutes: [
        {
          routeId: 'action-route:devhubapproved',
          routeType: 'owner_action',
          approvalStatus: 'approved',
          destinationTable: 'backlog_items',
          owner: 'Foundation Process',
          ownerConfidence: 'high',
          sourceIds: ['SRC-MEETINGS-001'],
          factRefs: ['fact:devhubapproved'],
          evidenceRefs: ['atom:devhubapproved'],
          evidenceChunkRefs: ['chunk:devhubapproved'],
          routedAt: '2026-05-31T04:00:00.000Z',
          proposedPayload: {
            title: 'Create internal Foundation readback note',
            summary: 'Internal source-backed proof task.',
          },
        },
        {
          routeId: 'action-route:devhubpending',
          routeType: 'owner_action',
          approvalStatus: 'pending',
          destinationTable: 'backlog_items',
          owner: 'Dev Hub',
          ownerConfidence: 'high',
          sourceIds: ['SRC-YOUTUBE-001'],
          factRefs: ['fact:devhubpending'],
          evidenceRefs: ['atom:devhubpending'],
          evidenceChunkRefs: ['chunk:devhubpending'],
          routedAt: '2026-05-25T04:00:00.000Z',
          proposedPayload: {
            title: 'Review source-backed build candidate',
            summary: 'Pending route needs Steve review.',
          },
        },
        {
          routeId: 'action-route:devhubapplied',
          routeType: 'owner_action',
          approvalStatus: 'applied',
          destinationTable: 'backlog_items',
          destinationRecordId: 'ACTIONPROOF-001',
          owner: 'Foundation Process',
          sourceIds: ['SRC-MEETINGS-001'],
          factRefs: ['fact:devhubapplied'],
          evidenceRefs: ['atom:devhubapplied'],
          evidenceChunkRefs: ['chunk:devhubapplied'],
          routedAt: '2026-05-30T04:00:00.000Z',
        },
      ],
    },
    backlogItems: [],
  })
  const validation = validateDevHubActionRouteReadback(snapshot)
  const unsafe = {
    ...snapshot,
    harlanDigest: { ...snapshot.harlanDigest, sendsMessageNow: true },
  }
  const unsafeValidation = validateDevHubActionRouteReadback(unsafe)
  return {
    ok: validation.ok &&
      snapshot.summary.pendingRoutes === 2 &&
      snapshot.summary.readyForConfirmedApplyItems === 1 &&
      snapshot.summary.appliedRoutes === 1 &&
      snapshot.harlanDigest.status === 'ready' &&
      snapshot.harlanDigest.sendsMessageNow === false &&
      snapshot.applySafety.autoApplyAllowed === false &&
      list(snapshot.applySafety.items).some(item => item.safetyState === 'ready_for_confirmed_internal_apply') &&
      unsafeValidation.ok === false &&
      unsafeValidation.failures.includes('digest_would_send'),
    validation,
    unsafeValidation,
    snapshot,
    invariant: 'Dev Hub action-route readback can show waiting, ready-for-confirmed-apply, and applied states while staying read-only and never sending Harlan or applying routes.',
  }
}
