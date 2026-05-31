export const DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_CARD_ID = 'DEV-HUB-ROUTE-REVIEW-OPERATOR-PACKET-001'
export const DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_CLOSEOUT_KEY = 'dev-hub-route-review-operator-packet-v1'
export const DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_PLAN_PATH = 'docs/process/dev-hub-route-review-operator-packet-001-plan.md'
export const DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_APPROVAL_PATH = 'docs/process/approvals/DEV-HUB-ROUTE-REVIEW-OPERATOR-PACKET-001.json'
export const DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_SCRIPT_PATH = 'scripts/process-dev-hub-route-review-operator-packet-check.mjs'
export const DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_CONTRACT_VERSION = 'dev-hub-route-review-operator-packet.v1'
export const DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_VISIBLE_HOME = 'Dev Hub > Data Pool > Route Review Operator Packet'

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

function truncate(value, maxChars = 190) {
  const normalized = text(value)
  if (normalized.length <= maxChars) return normalized
  return `${normalized.slice(0, Math.max(0, maxChars - 3)).trim()}...`
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

function itemHasSignal(item = {}, signal = '') {
  return list(item.reviewReasons).includes(signal) ||
    list(item.riskReasons).includes(signal) ||
    list(item.hardBlocks).includes(signal)
}

function buildBoundaries() {
  return {
    readOnly: true,
    reviewOnly: true,
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

function routeCategory(item = {}) {
  if (item.wouldAllowConfirmedApply === true) {
    return {
      groupId: 'ready-for-confirmed-apply',
      label: 'Ready for confirmed apply',
      suggestedDecision: 'Hold for explicit route-ID apply approval.',
      operatorPrompt: 'Confirm the exact route ID and destination before any apply path runs.',
    }
  }
  if (itemHasSignal(item, 'owner_resolution_required') || !text(item.owner)) {
    return {
      groupId: 'owner-required',
      label: 'Owner required',
      suggestedDecision: 'Assign owner or reject as unowned.',
      operatorPrompt: 'Decide who owns this route before it can become useful work.',
    }
  }
  if (itemHasSignal(item, 'sensitive_content_review_required')) {
    return {
      groupId: 'sensitive-review',
      label: 'Sensitive review',
      suggestedDecision: 'Human review required; keep pending unless Steve confirms a route action.',
      operatorPrompt: 'Review people, money, auth, customer, or external-system impact before any route change.',
    }
  }
  if (count(item.duplicateClusterCount) > 0 || ['red', 'yellow'].includes(text(item.stalenessSeverity))) {
    return {
      groupId: 'duplicate-or-stale',
      label: 'Duplicate or stale',
      suggestedDecision: 'Reject, snooze, or keep pending only with explicit route-ID confirmation.',
      operatorPrompt: 'Check whether this is duplicate, superseded, or stale before clearing the route.',
    }
  }
  return {
    groupId: 'oldest-review',
    label: 'Oldest review',
    suggestedDecision: 'Review oldest pending item first.',
    operatorPrompt: 'Use age and source refs to decide whether this route is still useful.',
  }
}

function packetItem(item = {}, index = 0) {
  const routeId = text(item.routeId)
  const category = routeCategory(item)
  return {
    packetItemId: `route-review-packet:${routeId || index + 1}`,
    rank: index + 1,
    groupId: category.groupId,
    groupLabel: category.label,
    routeId,
    reviewItemId: text(item.reviewItemId),
    title: truncate(item.title || routeId || 'Route review item', 130),
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
    suggestedDecision: category.suggestedDecision,
    operatorPrompt: category.operatorPrompt,
    mutationBoundary: 'Review-only row. A separate approved route action with exact route ID is required before approve, apply, reject, snooze, or reroute.',
    exactRouteIdPresent: Boolean(routeId),
    requiresSteveDecision: true,
    status: 'review_only',
    autoCleared: false,
    autoApplied: false,
    appliedNow: false,
    routeMutatedNow: false,
    destinationMutatedNow: false,
    backlogWrittenNow: false,
    harlanSentNow: false,
    externalWriteNow: false,
  }
}

function buildPacketRows(routeReviewTriage = {}, maxRows = 12) {
  const queues = routeReviewTriage.queues || {}
  return uniqueRouteItems([
    ...list(queues.readyForConfirmedApply),
    ...list(queues.ownerRequired),
    ...list(queues.sensitiveReview),
    ...list(queues.duplicateOrStale),
    ...list(queues.oldest),
  ])
    .slice(0, maxRows)
    .map(packetItem)
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
  if (count(summary.packetItemCount) <= 0) {
    return 'No route-review packet rows are visible from the current route triage readback.'
  }
  return `${count(summary.packetItemCount)} exact route-ID review row(s) are ready for operator review. This packet mutated ${count(summary.routesMutatedByReadback)} route(s), wrote ${count(summary.destinationsMutatedByReadback)} destination record(s), and sent ${count(summary.harlanSendsByReadback)} Harlan message(s).`
}

export function buildDevHubRouteReviewOperatorPacket({
  generatedAt = new Date().toISOString(),
  routeReviewTriage = {},
  actionRouteReadback = {},
  maxRows = 12,
} = {}) {
  const packetRows = buildPacketRows(routeReviewTriage, maxRows)
  const groups = groupCounts(packetRows)
  const summary = {
    packetItemCount: packetRows.length,
    groupCount: groups.length,
    exactRouteIdCount: packetRows.filter(item => item.exactRouteIdPresent).length,
    missingRouteIdCount: packetRows.filter(item => !item.exactRouteIdPresent).length,
    readyForConfirmedApplyItems: packetRows.filter(item => item.groupId === 'ready-for-confirmed-apply').length,
    ownerRequiredItems: packetRows.filter(item => item.groupId === 'owner-required').length,
    sensitiveReviewItems: packetRows.filter(item => item.groupId === 'sensitive-review').length,
    duplicateOrStaleItems: packetRows.filter(item => item.groupId === 'duplicate-or-stale').length,
    oldestReviewItems: packetRows.filter(item => item.groupId === 'oldest-review').length,
    pendingRoutes: count(routeReviewTriage.summary?.pendingRoutes || actionRouteReadback.summary?.pendingRoutes),
    appliedRoutes: count(routeReviewTriage.summary?.appliedRoutes || actionRouteReadback.summary?.appliedRoutes),
    totalWaitingReviewItems: count(routeReviewTriage.summary?.needsReviewItems || actionRouteReadback.summary?.needsReviewItems),
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
  if (actionRouteReadback.ok !== true) failures.push('action_route_readback_not_healthy')
  if (summary.packetItemCount > 0 && summary.missingRouteIdCount > 0) failures.push('route_id_missing')
  if (packetRows.some(item => item.status !== 'review_only' || item.routeMutatedNow || item.destinationMutatedNow || item.appliedNow || item.autoCleared || item.autoApplied)) failures.push('packet_item_not_review_only')
  if (summary.routesApprovedByReadback !== 0 || summary.routesAppliedByReadback !== 0 || summary.routesRejectedByReadback !== 0 || summary.routesSnoozedByReadback !== 0 || summary.routesReroutedByReadback !== 0 || summary.routesMutatedByReadback !== 0) failures.push('route_mutated_by_readback')
  if (summary.destinationsMutatedByReadback !== 0 || summary.backlogRecordsWrittenByReadback !== 0 || summary.scoperRecordsWrittenByReadback !== 0 || summary.portfolioRecordsWrittenByReadback !== 0 || summary.currentSprintMutationsByReadback !== 0 || summary.approvalRecordsWrittenByReadback !== 0) failures.push('destination_records_written_by_readback')
  if (summary.harlanSendsByReadback !== 0 || summary.externalWritesByReadback !== 0) failures.push('external_write_by_readback')
  if (summary.extractionRunsStarted !== 0 || summary.connectorProbesStarted !== 0 || summary.modelCallsStarted !== 0) failures.push('runtime_started_by_readback')

  return {
    ok: failures.length === 0,
    status: failures.length ? 'fail_closed' : packetRows.length ? 'packet_ready' : 'healthy',
    contractVersion: DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_CONTRACT_VERSION,
    cardId: DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_CARD_ID,
    closeoutKey: DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_CLOSEOUT_KEY,
    generatedAt: toIso(generatedAt),
    visibleHome: DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_VISIBLE_HOME,
    source: {
      reusedTruthLayers: [
        'routeReviewTriage',
        'actionRouteReadback',
      ],
      noSecondTruthLayer: true,
    },
    summary,
    plainEnglish: buildPlainEnglish(summary),
    groups,
    packetRows,
    boundaries: buildBoundaries(),
    failures: Array.from(new Set(failures)),
  }
}

export function validateDevHubRouteReviewOperatorPacket(snapshot = {}) {
  const failures = []
  if (snapshot.ok !== true) failures.push(...list(snapshot.failures))
  if (!['packet_ready', 'healthy'].includes(snapshot.status)) failures.push('status_not_operator_safe')
  if (snapshot.contractVersion !== DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_CONTRACT_VERSION) failures.push('contract_version_missing')
  if (snapshot.cardId !== DEV_HUB_ROUTE_REVIEW_OPERATOR_PACKET_CARD_ID) failures.push('card_id_mismatch')
  if (snapshot.source?.noSecondTruthLayer !== true) failures.push('second_truth_layer_risk')
  const layers = list(snapshot.source?.reusedTruthLayers)
  for (const layer of ['routeReviewTriage', 'actionRouteReadback']) {
    if (!layers.includes(layer)) failures.push(`source_layer_missing:${layer}`)
  }
  const boundaries = snapshot.boundaries || {}
  for (const key of ['readOnly', 'reviewOnly', 'noRouteApprove', 'noRouteApply', 'noRouteReject', 'noRouteSnooze', 'noRouteReroute', 'noRouteMutation', 'noDestinationMutation', 'noBacklogMutation', 'noScoperMutation', 'noHarlanSend', 'noExternalWrites', 'noAutoApply', 'noAutoClear', 'noAutoBuild', 'noAutoPromoteRecommendations']) {
    if (boundaries[key] !== true) failures.push(`boundary_missing:${key}`)
  }
  const rows = list(snapshot.packetRows)
  if (rows.length > 12) failures.push('packet_rows_unbounded')
  if (list(snapshot.groups).length > 5) failures.push('groups_unbounded')
  if (count(snapshot.summary?.packetItemCount) !== rows.length) failures.push('packet_count_mismatch')
  if (count(snapshot.summary?.missingRouteIdCount) !== 0) failures.push('route_id_missing')
  for (const item of rows) {
    if (!text(item.routeId)) failures.push('route_id_missing')
    if (item.status !== 'review_only') failures.push('packet_item_not_review_only')
    if (item.routeMutatedNow !== false || item.destinationMutatedNow !== false || item.appliedNow !== false || item.autoCleared !== false || item.autoApplied !== false) failures.push('packet_item_not_review_only')
    if (item.backlogWrittenNow !== false || item.harlanSentNow !== false || item.externalWriteNow !== false) failures.push('packet_item_not_review_only')
    if (!text(item.suggestedDecision) || !text(item.operatorPrompt) || !text(item.mutationBoundary)) failures.push('operator_context_missing')
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

export function buildDevHubRouteReviewOperatorPacketDogfoodProof() {
  const routeReviewTriage = {
    ok: true,
    summary: {
      pendingRoutes: 4,
      appliedRoutes: 1,
      needsReviewItems: 4,
    },
    queues: {
      ownerRequired: [
        {
          reviewItemId: 'review:route-001',
          routeId: 'route-001',
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
          reviewItemId: 'review:route-002',
          routeId: 'route-002',
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
          riskReasons: [],
          hardBlocks: [],
          wouldAllowConfirmedApply: false,
        },
      ],
      duplicateOrStale: [
        {
          reviewItemId: 'review:route-003',
          routeId: 'route-003',
          title: 'Stale duplicate route',
          owner: 'Codex',
          approvalStatus: 'pending',
          destinationTable: 'open_questions',
          type: 'question',
          ageDays: 12,
          sourceRefCount: 1,
          duplicateClusterCount: 2,
          stalenessSeverity: 'red',
          reviewReasons: [],
          riskReasons: [],
          hardBlocks: [],
          wouldAllowConfirmedApply: false,
        },
      ],
      oldest: [],
      readyForConfirmedApply: [],
    },
  }
  const actionRouteReadback = {
    ok: true,
    summary: {
      pendingRoutes: 4,
      appliedRoutes: 1,
      needsReviewItems: 4,
    },
  }
  const snapshot = buildDevHubRouteReviewOperatorPacket({
    generatedAt: '2026-05-31T07:14:06.000Z',
    routeReviewTriage,
    actionRouteReadback,
  })
  const validation = validateDevHubRouteReviewOperatorPacket(snapshot)
  const unsafe = {
    ...snapshot,
    summary: {
      ...snapshot.summary,
      routesAppliedByReadback: 1,
      routesMutatedByReadback: 1,
      harlanSendsByReadback: 1,
    },
    packetRows: snapshot.packetRows.map((item, index) => index === 0
      ? { ...item, status: 'applied', appliedNow: true, routeMutatedNow: true }
      : item),
  }
  const unsafeMissingRoute = {
    ...snapshot,
    summary: {
      ...snapshot.summary,
      missingRouteIdCount: 1,
    },
    packetRows: snapshot.packetRows.map((item, index) => index === 0
      ? { ...item, routeId: '', exactRouteIdPresent: false }
      : item),
  }
  const unsafeValidation = validateDevHubRouteReviewOperatorPacket(unsafe)
  const missingRouteValidation = validateDevHubRouteReviewOperatorPacket(unsafeMissingRoute)
  return {
    ok: validation.ok &&
      snapshot.status === 'packet_ready' &&
      snapshot.summary.packetItemCount === 3 &&
      snapshot.summary.ownerRequiredItems === 1 &&
      snapshot.summary.sensitiveReviewItems === 1 &&
      snapshot.summary.duplicateOrStaleItems === 1 &&
      snapshot.packetRows.every(item => item.status === 'review_only' && item.routeMutatedNow === false) &&
      unsafeValidation.ok === false &&
      unsafeValidation.failures.includes('packet_item_not_review_only') &&
      unsafeValidation.failures.includes('route_mutated_by_readback') &&
      unsafeValidation.failures.includes('external_write_by_readback') &&
      missingRouteValidation.ok === false &&
      missingRouteValidation.failures.includes('route_id_missing'),
    validation,
    unsafeValidation,
    missingRouteValidation,
    snapshot,
    invariant: 'Route review operator packet keeps exact route-ID rows review-only and rejects mutation, sends, or missing route IDs.',
  }
}
