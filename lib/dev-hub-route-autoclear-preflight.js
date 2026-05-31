export const DEV_HUB_ROUTE_AUTOCLEAR_PREFLIGHT_CARD_ID = 'DEV-HUB-ROUTE-AUTOCLEAR-PREFLIGHT-001'
export const DEV_HUB_ROUTE_AUTOCLEAR_PREFLIGHT_CLOSEOUT_KEY = 'dev-hub-route-autoclear-preflight-v1'
export const DEV_HUB_ROUTE_AUTOCLEAR_PREFLIGHT_PLAN_PATH = 'docs/process/dev-hub-route-autoclear-preflight-001-plan.md'
export const DEV_HUB_ROUTE_AUTOCLEAR_PREFLIGHT_APPROVAL_PATH = 'docs/process/approvals/DEV-HUB-ROUTE-AUTOCLEAR-PREFLIGHT-001.json'
export const DEV_HUB_ROUTE_AUTOCLEAR_PREFLIGHT_SCRIPT_PATH = 'scripts/process-dev-hub-route-autoclear-preflight-check.mjs'
export const DEV_HUB_ROUTE_AUTOCLEAR_PREFLIGHT_CONTRACT_VERSION = 'dev-hub-route-autoclear-preflight.v1'
export const DEV_HUB_ROUTE_AUTOCLEAR_PREFLIGHT_VISIBLE_HOME = 'Dev Hub > Data Pool > Route Auto-Clear Preflight'

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

function truncate(value, maxChars = 180) {
  const normalized = text(value)
  if (normalized.length <= maxChars) return normalized
  return `${normalized.slice(0, Math.max(0, maxChars - 3)).trim()}...`
}

function buildBoundaries() {
  return {
    readOnly: true,
    preflightOnly: true,
    approvalRequired: true,
    noRouteApprove: true,
    noRouteApply: true,
    noRouteReject: true,
    noRouteSnooze: true,
    noRouteReroute: true,
    noRouteMutation: true,
    noDestinationMutation: true,
    noBacklogMutation: true,
    noScoperMutation: true,
    noPortfolioMutation: true,
    noCurrentSprintMutation: true,
    noApprovalMutation: true,
    noHarlanSend: true,
    noLiveExtraction: true,
    noConnectorProbe: true,
    noModelCalls: true,
    noExternalWrites: true,
    noAutoApply: true,
    noAutoClear: true,
    noAutoBuild: true,
    noAutoPromoteRecommendations: true,
  }
}

function hasSignal(item = {}, signal = '') {
  return list(item.reviewReasons).includes(signal) ||
    list(item.riskReasons).includes(signal) ||
    list(item.hardBlocks).includes(signal)
}

function isDuplicateOrStale(item = {}) {
  return count(item.duplicateClusterCount) > 0 ||
    ['red', 'yellow'].includes(text(item.stalenessSeverity)) ||
    hasSignal(item, 'duplicate_cluster_review_required') ||
    hasSignal(item, 'stale_red_review_required')
}

function uniqueRouteItems(items = []) {
  const seen = new Set()
  const output = []
  for (const item of list(items)) {
    const routeId = text(item.routeId || item.reviewItemId)
    if (!routeId || seen.has(routeId)) continue
    seen.add(routeId)
    output.push(item)
  }
  return output
}

function routeSourceProof(item = {}) {
  return {
    sourceRefCount: count(item.sourceRefCount),
    duplicateClusterCount: count(item.duplicateClusterCount),
    stalenessSeverity: text(item.stalenessSeverity || 'none'),
    reviewReasons: list(item.reviewReasons).slice(0, 5),
    riskReasons: list(item.riskReasons).slice(0, 5),
    hardBlocks: list(item.hardBlocks).slice(0, 5),
  }
}

function classifyClearance(item = {}) {
  const ownerBlocked = hasSignal(item, 'owner_resolution_required') || !text(item.owner)
  const sensitive = hasSignal(item, 'sensitive_content_review_required')
  const duplicateOrStale = isDuplicateOrStale(item)
  if (sensitive) {
    return {
      groupId: 'sensitive-review',
      groupLabel: 'Sensitive review',
      clearReadiness: 'blocked_sensitive',
      proposedDisposition: 'human_review_only',
      operatorNextAction: 'Keep pending until a human reviews people, money, auth, customer, or external-system risk.',
      clearRuleId: 'never_auto_clear_sensitive',
    }
  }
  if (ownerBlocked) {
    return {
      groupId: 'owner-required',
      groupLabel: 'Owner required',
      clearReadiness: 'blocked_owner',
      proposedDisposition: 'assign_owner_or_reject_as_unowned_after_approval',
      operatorNextAction: 'Assign an owner or explicitly reject this unowned route by exact route ID in a separate approved action.',
      clearRuleId: 'owner_required_before_clear',
    }
  }
  if (duplicateOrStale) {
    return {
      groupId: 'duplicate-or-stale',
      groupLabel: 'Duplicate or stale',
      clearReadiness: 'candidate_after_approval',
      proposedDisposition: 'candidate_reject_or_snooze_after_exact_approval',
      operatorNextAction: 'Review duplicate/stale proof, then separately approve an exact route-ID reject or snooze if it is truly superseded.',
      clearRuleId: 'duplicate_or_stale_exact_approval',
    }
  }
  if (item.wouldAllowConfirmedApply === true || text(item.groupId) === 'ready-for-confirmed-apply') {
    return {
      groupId: 'ready-for-confirmed-apply',
      groupLabel: 'Ready for confirmed apply',
      clearReadiness: 'not_clear_candidate',
      proposedDisposition: 'hold_for_confirmed_apply_approval',
      operatorNextAction: 'Do not auto-clear; apply only through the approved exact route-ID apply path.',
      clearRuleId: 'apply_path_not_clear_path',
    }
  }
  return {
    groupId: 'oldest-review',
    groupLabel: 'Oldest review',
    clearReadiness: 'operator_review_required',
    proposedDisposition: 'review_keep_reject_or_snooze_after_approval',
    operatorNextAction: 'Review age and source proof before choosing any exact route-ID action.',
    clearRuleId: 'oldest_review_requires_decision',
  }
}

function preflightItem(item = {}, index = 0) {
  const routeId = text(item.routeId)
  const classification = classifyClearance(item)
  return {
    preflightItemId: `route-autoclear-preflight:${routeId || index + 1}`,
    rank: index + 1,
    groupId: classification.groupId,
    groupLabel: classification.groupLabel,
    routeId,
    reviewItemId: text(item.reviewItemId),
    title: truncate(item.title || routeId || 'Route review item', 130),
    owner: text(item.owner),
    approvalStatus: text(item.approvalStatus),
    safetyState: text(item.safetyState || 'review'),
    destinationTable: text(item.destinationTable),
    type: text(item.type),
    ageDays: item.ageDays === null || item.ageDays === undefined ? null : count(item.ageDays),
    sourceProof: routeSourceProof(item),
    clearReadiness: classification.clearReadiness,
    clearRuleId: classification.clearRuleId,
    proposedDisposition: classification.proposedDisposition,
    operatorNextAction: classification.operatorNextAction,
    mutationBoundary: 'Preflight-only row. A separate approved route action with exact route ID is required before reject, snooze, approve, apply, or reroute.',
    exactRouteIdPresent: Boolean(routeId),
    approvalRequired: true,
    requiresSteveDecision: true,
    requiresExactRouteIdConfirmation: true,
    status: 'approval_required',
    safeToAutoClearNow: false,
    autoCleared: false,
    autoRejected: false,
    autoSnoozed: false,
    autoApplied: false,
    routeMutatedNow: false,
    destinationMutatedNow: false,
    backlogWrittenNow: false,
    harlanSentNow: false,
    externalWriteNow: false,
  }
}

function buildPreflightRows(routeReviewTriage = {}, routeReviewOperatorPacket = {}, maxRows = 16) {
  const queues = routeReviewTriage.queues || {}
  const operatorRows = list(routeReviewOperatorPacket.packetRows)
  return uniqueRouteItems([
    ...list(queues.duplicateOrStale),
    ...list(queues.oldest).filter(isDuplicateOrStale),
    ...operatorRows.filter(isDuplicateOrStale),
    ...list(queues.ownerRequired),
    ...list(queues.sensitiveReview),
    ...operatorRows,
    ...list(queues.readyForConfirmedApply),
    ...list(queues.oldest),
  ])
    .slice(0, maxRows)
    .map(preflightItem)
}

function groupCounts(items = []) {
  const counts = new Map()
  for (const item of list(items)) {
    counts.set(item.groupId, count(counts.get(item.groupId)) + 1)
  }
  return Array.from(counts.entries()).map(([groupId, itemCount]) => ({
    groupId,
    label: list(items).find(item => item.groupId === groupId)?.groupLabel || groupId,
    itemCount,
  }))
}

function buildPlainEnglish(summary = {}) {
  if (count(summary.preflightItemCount) <= 0) {
    return 'No route auto-clear preflight rows are visible from the current route review readbacks.'
  }
  return `${count(summary.preflightItemCount)} route auto-clear preflight row(s) are visible. ${count(summary.candidateAfterApprovalRows)} duplicate/stale row(s) can be considered later, but ${count(summary.safeToAutoClearNowRows)} row(s) are safe to auto-clear now and ${count(summary.routesMutatedByReadback)} route(s) were mutated by this readback.`
}

export function buildDevHubRouteAutoClearPreflight({
  generatedAt = new Date().toISOString(),
  routeReviewTriage = {},
  routeReviewOperatorPacket = {},
  actionRouteReadback = {},
  maxRows = 16,
} = {}) {
  const preflightRows = buildPreflightRows(routeReviewTriage, routeReviewOperatorPacket, maxRows)
  const groups = groupCounts(preflightRows)
  const summary = {
    preflightItemCount: preflightRows.length,
    groupCount: groups.length,
    exactRouteIdCount: preflightRows.filter(item => item.exactRouteIdPresent).length,
    missingRouteIdCount: preflightRows.filter(item => !item.exactRouteIdPresent).length,
    approvalRequiredRows: preflightRows.filter(item => item.approvalRequired === true).length,
    duplicateOrStaleRows: preflightRows.filter(item => item.groupId === 'duplicate-or-stale').length,
    candidateAfterApprovalRows: preflightRows.filter(item => item.clearReadiness === 'candidate_after_approval').length,
    blockedByOwnerRows: preflightRows.filter(item => item.clearReadiness === 'blocked_owner').length,
    blockedBySensitiveRows: preflightRows.filter(item => item.clearReadiness === 'blocked_sensitive').length,
    readyForConfirmedApplyRows: preflightRows.filter(item => item.groupId === 'ready-for-confirmed-apply').length,
    safeToAutoClearNowRows: preflightRows.filter(item => item.safeToAutoClearNow === true).length,
    duplicateOrStaleReviewItems: count(routeReviewTriage.summary?.duplicateOrStaleReviewItems || actionRouteReadback.summary?.duplicateOrStaleReviewItems),
    ownerRequiredItems: count(routeReviewTriage.summary?.ownerRequiredItems || actionRouteReadback.summary?.ownerRequiredItems),
    sensitiveReviewItems: count(routeReviewTriage.summary?.sensitiveReviewItems || actionRouteReadback.summary?.sensitiveReviewItems),
    pendingRoutes: count(routeReviewTriage.summary?.pendingRoutes || routeReviewOperatorPacket.summary?.pendingRoutes || actionRouteReadback.summary?.pendingRoutes),
    appliedRoutes: count(routeReviewTriage.summary?.appliedRoutes || routeReviewOperatorPacket.summary?.appliedRoutes || actionRouteReadback.summary?.appliedRoutes),
    totalWaitingReviewItems: count(routeReviewTriage.summary?.needsReviewItems || routeReviewOperatorPacket.summary?.totalWaitingReviewItems || actionRouteReadback.summary?.needsReviewItems),
    routesApprovedByReadback: 0,
    routesAppliedByReadback: 0,
    routesRejectedByReadback: 0,
    routesSnoozedByReadback: 0,
    routesReroutedByReadback: 0,
    routesMutatedByReadback: 0,
    destinationsMutatedByReadback: 0,
    backlogRecordsWrittenByReadback: 0,
    scoperRecordsWrittenByReadback: 0,
    portfolioRecordsWrittenByReadback: 0,
    currentSprintMutationsByReadback: 0,
    approvalRecordsWrittenByReadback: 0,
    harlanSendsByReadback: 0,
    extractionRunsStarted: 0,
    connectorProbesStarted: 0,
    modelCallsStarted: 0,
    externalWritesByReadback: 0,
  }

  const failures = []
  if (routeReviewTriage.ok !== true) failures.push('route_review_triage_not_healthy')
  if (routeReviewOperatorPacket.ok !== true) failures.push('route_review_operator_packet_not_healthy')
  if (actionRouteReadback.ok !== true) failures.push('action_route_readback_not_healthy')
  if (summary.preflightItemCount > 0 && summary.missingRouteIdCount > 0) failures.push('route_id_missing')
  if (summary.safeToAutoClearNowRows !== 0) failures.push('auto_clear_allowed_now')
  if (preflightRows.some(item => item.status !== 'approval_required' || item.approvalRequired !== true || item.safeToAutoClearNow !== false || item.routeMutatedNow || item.destinationMutatedNow || item.autoCleared || item.autoRejected || item.autoSnoozed || item.autoApplied)) failures.push('preflight_item_not_approval_required')
  if (summary.routesApprovedByReadback !== 0 || summary.routesAppliedByReadback !== 0 || summary.routesRejectedByReadback !== 0 || summary.routesSnoozedByReadback !== 0 || summary.routesReroutedByReadback !== 0 || summary.routesMutatedByReadback !== 0) failures.push('route_mutated_by_readback')
  if (summary.destinationsMutatedByReadback !== 0 || summary.backlogRecordsWrittenByReadback !== 0 || summary.scoperRecordsWrittenByReadback !== 0 || summary.portfolioRecordsWrittenByReadback !== 0 || summary.currentSprintMutationsByReadback !== 0 || summary.approvalRecordsWrittenByReadback !== 0) failures.push('destination_records_written_by_readback')
  if (summary.harlanSendsByReadback !== 0 || summary.externalWritesByReadback !== 0) failures.push('external_write_by_readback')
  if (summary.extractionRunsStarted !== 0 || summary.connectorProbesStarted !== 0 || summary.modelCallsStarted !== 0) failures.push('runtime_started_by_readback')

  return {
    ok: failures.length === 0,
    status: failures.length ? 'fail_closed' : preflightRows.length ? 'preflight_ready' : 'healthy',
    contractVersion: DEV_HUB_ROUTE_AUTOCLEAR_PREFLIGHT_CONTRACT_VERSION,
    cardId: DEV_HUB_ROUTE_AUTOCLEAR_PREFLIGHT_CARD_ID,
    closeoutKey: DEV_HUB_ROUTE_AUTOCLEAR_PREFLIGHT_CLOSEOUT_KEY,
    generatedAt: toIso(generatedAt),
    visibleHome: DEV_HUB_ROUTE_AUTOCLEAR_PREFLIGHT_VISIBLE_HOME,
    source: {
      reusedTruthLayers: [
        'routeReviewTriage',
        'routeReviewOperatorPacket',
        'actionRouteReadback',
      ],
      noSecondTruthLayer: true,
    },
    summary,
    plainEnglish: buildPlainEnglish(summary),
    groups,
    preflightRows,
    boundaries: buildBoundaries(),
    failures: Array.from(new Set(failures)),
  }
}

export function validateDevHubRouteAutoClearPreflight(snapshot = {}) {
  const failures = []
  if (snapshot.ok !== true) failures.push(...list(snapshot.failures))
  if (!['preflight_ready', 'healthy'].includes(snapshot.status)) failures.push('status_not_operator_safe')
  if (snapshot.contractVersion !== DEV_HUB_ROUTE_AUTOCLEAR_PREFLIGHT_CONTRACT_VERSION) failures.push('contract_version_missing')
  if (snapshot.cardId !== DEV_HUB_ROUTE_AUTOCLEAR_PREFLIGHT_CARD_ID) failures.push('card_id_mismatch')
  if (snapshot.source?.noSecondTruthLayer !== true) failures.push('second_truth_layer_risk')
  const layers = list(snapshot.source?.reusedTruthLayers)
  for (const layer of ['routeReviewTriage', 'routeReviewOperatorPacket', 'actionRouteReadback']) {
    if (!layers.includes(layer)) failures.push(`source_layer_missing:${layer}`)
  }
  const boundaries = snapshot.boundaries || {}
  for (const key of ['readOnly', 'preflightOnly', 'approvalRequired', 'noRouteApprove', 'noRouteApply', 'noRouteReject', 'noRouteSnooze', 'noRouteReroute', 'noRouteMutation', 'noDestinationMutation', 'noBacklogMutation', 'noScoperMutation', 'noHarlanSend', 'noExternalWrites', 'noAutoApply', 'noAutoClear', 'noAutoBuild', 'noAutoPromoteRecommendations']) {
    if (boundaries[key] !== true) failures.push(`boundary_missing:${key}`)
  }
  const rows = list(snapshot.preflightRows)
  if (rows.length > 16) failures.push('preflight_rows_unbounded')
  if (list(snapshot.groups).length > 5) failures.push('groups_unbounded')
  if (count(snapshot.summary?.preflightItemCount) !== rows.length) failures.push('preflight_count_mismatch')
  if (count(snapshot.summary?.missingRouteIdCount) !== 0) failures.push('route_id_missing')
  if (count(snapshot.summary?.safeToAutoClearNowRows) !== 0) failures.push('auto_clear_allowed_now')
  if (count(snapshot.summary?.approvalRequiredRows) !== rows.length) failures.push('approval_required_count_mismatch')
  for (const item of rows) {
    if (!text(item.routeId)) failures.push('route_id_missing')
    if (item.status !== 'approval_required' || item.approvalRequired !== true || item.requiresExactRouteIdConfirmation !== true) failures.push('preflight_item_not_approval_required')
    if (item.safeToAutoClearNow !== false || item.autoCleared !== false || item.autoRejected !== false || item.autoSnoozed !== false || item.autoApplied !== false) failures.push('preflight_item_not_approval_required')
    if (item.routeMutatedNow !== false || item.destinationMutatedNow !== false || item.backlogWrittenNow !== false || item.harlanSentNow !== false || item.externalWriteNow !== false) failures.push('preflight_item_not_approval_required')
    if (!text(item.proposedDisposition) || !text(item.operatorNextAction) || !text(item.mutationBoundary) || !text(item.clearRuleId)) failures.push('operator_context_missing')
    if (item.groupId === 'duplicate-or-stale' && item.clearReadiness !== 'candidate_after_approval') failures.push('duplicate_stale_not_approval_candidate')
  }
  if (count(snapshot.summary?.routesApprovedByReadback) !== 0 || count(snapshot.summary?.routesAppliedByReadback) !== 0 || count(snapshot.summary?.routesRejectedByReadback) !== 0 || count(snapshot.summary?.routesSnoozedByReadback) !== 0 || count(snapshot.summary?.routesReroutedByReadback) !== 0 || count(snapshot.summary?.routesMutatedByReadback) !== 0) failures.push('route_mutated_by_readback')
  if (count(snapshot.summary?.destinationsMutatedByReadback) !== 0 || count(snapshot.summary?.backlogRecordsWrittenByReadback) !== 0 || count(snapshot.summary?.scoperRecordsWrittenByReadback) !== 0 || count(snapshot.summary?.portfolioRecordsWrittenByReadback) !== 0 || count(snapshot.summary?.currentSprintMutationsByReadback) !== 0 || count(snapshot.summary?.approvalRecordsWrittenByReadback) !== 0) failures.push('destination_records_written_by_readback')
  if (count(snapshot.summary?.harlanSendsByReadback) !== 0 || count(snapshot.summary?.externalWritesByReadback) !== 0) failures.push('external_write_by_readback')
  if (count(snapshot.summary?.extractionRunsStarted) !== 0 || count(snapshot.summary?.connectorProbesStarted) !== 0 || count(snapshot.summary?.modelCallsStarted) !== 0) failures.push('runtime_started_by_readback')
  if (!text(snapshot.plainEnglish)) failures.push('plain_english_missing')
  return {
    ok: failures.length === 0,
    failures: Array.from(new Set(failures)),
    summary: snapshot.summary || {},
  }
}

export function buildDevHubRouteAutoClearPreflightDogfoodProof() {
  const routeReviewTriage = {
    ok: true,
    summary: {
      pendingRoutes: 5,
      appliedRoutes: 1,
      needsReviewItems: 5,
      duplicateOrStaleReviewItems: 2,
      ownerRequiredItems: 1,
      sensitiveReviewItems: 1,
    },
    queues: {
      duplicateOrStale: [
        {
          reviewItemId: 'review:route-duplicate',
          routeId: 'route-duplicate',
          title: 'Duplicate stale route',
          owner: 'Dev Hub',
          approvalStatus: 'pending',
          destinationTable: 'backlog_items',
          type: 'backlog',
          ageDays: 12,
          sourceRefCount: 3,
          duplicateClusterCount: 2,
          stalenessSeverity: 'red',
          reviewReasons: ['duplicate_cluster_review_required', 'stale_red_review_required'],
          riskReasons: [],
          hardBlocks: [],
          wouldAllowConfirmedApply: false,
        },
      ],
      ownerRequired: [
        {
          reviewItemId: 'review:route-owner',
          routeId: 'route-owner',
          title: 'Owner missing route',
          owner: '',
          approvalStatus: 'pending',
          destinationTable: 'backlog_items',
          type: 'backlog',
          ageDays: 6,
          sourceRefCount: 2,
          duplicateClusterCount: 0,
          stalenessSeverity: 'none',
          reviewReasons: ['owner_resolution_required'],
          riskReasons: [],
          hardBlocks: [],
          wouldAllowConfirmedApply: false,
        },
      ],
      sensitiveReview: [
        {
          reviewItemId: 'review:route-sensitive',
          routeId: 'route-sensitive',
          title: 'Sensitive customer route',
          owner: 'Steve',
          approvalStatus: 'pending',
          destinationTable: 'decisions',
          type: 'decision',
          ageDays: 4,
          sourceRefCount: 3,
          duplicateClusterCount: 0,
          stalenessSeverity: 'none',
          reviewReasons: ['sensitive_content_review_required'],
          riskReasons: ['customer_or_lead'],
          hardBlocks: [],
          wouldAllowConfirmedApply: false,
        },
      ],
      oldest: [],
      readyForConfirmedApply: [],
    },
  }
  const routeReviewOperatorPacket = {
    ok: true,
    summary: {
      pendingRoutes: 5,
      appliedRoutes: 1,
      totalWaitingReviewItems: 5,
    },
    packetRows: [],
  }
  const actionRouteReadback = {
    ok: true,
    summary: {
      pendingRoutes: 5,
      appliedRoutes: 1,
      needsReviewItems: 5,
    },
  }
  const snapshot = buildDevHubRouteAutoClearPreflight({
    generatedAt: '2026-05-31T08:04:06.000Z',
    routeReviewTriage,
    routeReviewOperatorPacket,
    actionRouteReadback,
  })
  const validation = validateDevHubRouteAutoClearPreflight(snapshot)
  const unsafe = {
    ...snapshot,
    summary: {
      ...snapshot.summary,
      routesRejectedByReadback: 1,
      routesMutatedByReadback: 1,
      harlanSendsByReadback: 1,
      safeToAutoClearNowRows: 1,
    },
    preflightRows: snapshot.preflightRows.map((item, index) => index === 0
      ? { ...item, status: 'auto_cleared', safeToAutoClearNow: true, autoCleared: true, autoRejected: true, routeMutatedNow: true }
      : item),
  }
  const unsafeMissingRoute = {
    ...snapshot,
    summary: {
      ...snapshot.summary,
      missingRouteIdCount: 1,
    },
    preflightRows: snapshot.preflightRows.map((item, index) => index === 0
      ? { ...item, routeId: '', exactRouteIdPresent: false }
      : item),
  }
  const unsafeValidation = validateDevHubRouteAutoClearPreflight(unsafe)
  const missingRouteValidation = validateDevHubRouteAutoClearPreflight(unsafeMissingRoute)
  return {
    ok: validation.ok &&
      snapshot.status === 'preflight_ready' &&
      snapshot.summary.preflightItemCount === 3 &&
      snapshot.summary.candidateAfterApprovalRows === 1 &&
      snapshot.summary.blockedByOwnerRows === 1 &&
      snapshot.summary.blockedBySensitiveRows === 1 &&
      snapshot.summary.safeToAutoClearNowRows === 0 &&
      snapshot.preflightRows.every(item => item.status === 'approval_required' && item.safeToAutoClearNow === false && item.routeMutatedNow === false) &&
      unsafeValidation.ok === false &&
      unsafeValidation.failures.includes('preflight_item_not_approval_required') &&
      unsafeValidation.failures.includes('route_mutated_by_readback') &&
      unsafeValidation.failures.includes('external_write_by_readback') &&
      unsafeValidation.failures.includes('auto_clear_allowed_now') &&
      missingRouteValidation.ok === false &&
      missingRouteValidation.failures.includes('route_id_missing'),
    validation,
    unsafeValidation,
    missingRouteValidation,
    snapshot,
    invariant: 'Route Auto-Clear Preflight can name duplicate/stale clear candidates while keeping every row approval-bound and failing on mutation, auto-clear, send, or missing route ID.',
  }
}
