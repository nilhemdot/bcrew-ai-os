export const DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_CARD_ID = 'DEV-HUB-ROUTE-BLOCKER-PREFLIGHT-001'
export const DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_CLOSEOUT_KEY = 'dev-hub-route-blocker-preflight-v1'
export const DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_PLAN_PATH = 'docs/process/dev-hub-route-blocker-preflight-001-plan.md'
export const DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_APPROVAL_PATH = 'docs/process/approvals/DEV-HUB-ROUTE-BLOCKER-PREFLIGHT-001.json'
export const DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_SCRIPT_PATH = 'scripts/process-dev-hub-route-blocker-preflight-check.mjs'
export const DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_CONTRACT_VERSION = 'dev-hub-route-blocker-preflight.v1'
export const DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_VISIBLE_HOME = 'Dev Hub > Data Pool > Route Blocker Preflight'

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
    noOwnerAssignment: true,
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

function uniqueRows(rows = []) {
  const seen = new Set()
  const output = []
  for (const row of list(rows)) {
    const routeId = text(row.routeId)
    if (!routeId || seen.has(routeId)) continue
    seen.add(routeId)
    output.push(row)
  }
  return output
}

function suggestedLane(row = {}) {
  if (row.clearReadiness === 'blocked_sensitive') return 'Steve sensitive review'
  const destination = text(row.destinationTable)
  if (['decisions', 'open_questions'].includes(destination)) return 'Steve owner decision'
  if (destination === 'backlog_items') return 'Dev Hub / Foundation Process owner decision'
  return 'Operator owner decision'
}

function decisionType(row = {}) {
  if (row.clearReadiness === 'blocked_sensitive') return 'sensitive_review_required'
  if (row.clearReadiness === 'blocked_owner') return 'owner_resolution_required'
  return 'operator_blocker_review'
}

function blockerRow(row = {}, index = 0) {
  const routeId = text(row.routeId)
  const type = decisionType(row)
  const ownerLane = suggestedLane(row)
  const sourceProof = row.sourceProof || {}
  return {
    blockerItemId: `route-blocker-preflight:${routeId || index + 1}`,
    rank: index + 1,
    routeId,
    reviewItemId: text(row.reviewItemId),
    title: truncate(row.title || routeId || 'Route blocker item', 130),
    groupId: type,
    groupLabel: type === 'sensitive_review_required' ? 'Sensitive review' : type === 'owner_resolution_required' ? 'Owner required' : 'Operator review',
    decisionType: type,
    owner: text(row.owner),
    suggestedDecisionLane: ownerLane,
    suggestedOwner: type === 'owner_resolution_required' ? ownerLane : '',
    approvalStatus: text(row.approvalStatus),
    destinationTable: text(row.destinationTable),
    type: text(row.type),
    ageDays: row.ageDays === null || row.ageDays === undefined ? null : count(row.ageDays),
    sourceProof: {
      sourceRefCount: count(sourceProof.sourceRefCount),
      duplicateClusterCount: count(sourceProof.duplicateClusterCount),
      stalenessSeverity: text(sourceProof.stalenessSeverity || 'none'),
      reviewReasons: list(sourceProof.reviewReasons).slice(0, 5),
      riskReasons: list(sourceProof.riskReasons).slice(0, 5),
      hardBlocks: list(sourceProof.hardBlocks).slice(0, 5),
    },
    operatorNextAction: type === 'sensitive_review_required'
      ? 'Review sensitive risk before any clear, reject, snooze, apply, or reroute decision.'
      : 'Choose an owner or explicitly reject this unowned route by exact route ID in a separate approved action.',
    mutationBoundary: 'Blocker preflight only. A separate approved route action with exact route ID is required before owner assignment, reject, snooze, approve, apply, or reroute.',
    exactRouteIdPresent: Boolean(routeId),
    approvalRequired: true,
    requiresSteveDecision: true,
    requiresExactRouteIdConfirmation: true,
    status: 'approval_required',
    ownerAssignedNow: false,
    sensitiveReviewedNow: false,
    routeMutatedNow: false,
    destinationMutatedNow: false,
    backlogWrittenNow: false,
    harlanSentNow: false,
    externalWriteNow: false,
  }
}

function buildRows(routeAutoClearPreflight = {}, maxRows = 16) {
  return uniqueRows(list(routeAutoClearPreflight.preflightRows)
    .filter(row => ['blocked_owner', 'blocked_sensitive'].includes(text(row.clearReadiness))))
    .slice(0, maxRows)
    .map(blockerRow)
}

function groupCounts(rows = []) {
  const counts = new Map()
  for (const row of list(rows)) {
    counts.set(row.groupId, count(counts.get(row.groupId)) + 1)
  }
  return Array.from(counts.entries()).map(([groupId, itemCount]) => ({
    groupId,
    label: list(rows).find(row => row.groupId === groupId)?.groupLabel || groupId,
    itemCount,
  }))
}

function buildPlainEnglish(summary = {}) {
  if (count(summary.blockerItemCount) <= 0) {
    return 'No route blocker rows are visible from the current auto-clear preflight.'
  }
  return `${count(summary.blockerItemCount)} route blocker row(s) need human review before cleanup. ${count(summary.ownerResolutionRows)} need owner resolution and ${count(summary.sensitiveReviewRows)} need sensitive review. This readback assigned ${count(summary.ownersAssignedByReadback)} owner(s) and mutated ${count(summary.routesMutatedByReadback)} route(s).`
}

export function buildDevHubRouteBlockerPreflight({
  generatedAt = new Date().toISOString(),
  routeAutoClearPreflight = {},
  routeReviewTriage = {},
  maxRows = 16,
} = {}) {
  const blockerRows = buildRows(routeAutoClearPreflight, maxRows)
  const groups = groupCounts(blockerRows)
  const summary = {
    blockerItemCount: blockerRows.length,
    groupCount: groups.length,
    exactRouteIdCount: blockerRows.filter(row => row.exactRouteIdPresent).length,
    missingRouteIdCount: blockerRows.filter(row => !row.exactRouteIdPresent).length,
    approvalRequiredRows: blockerRows.filter(row => row.approvalRequired === true).length,
    ownerResolutionRows: blockerRows.filter(row => row.decisionType === 'owner_resolution_required').length,
    sensitiveReviewRows: blockerRows.filter(row => row.decisionType === 'sensitive_review_required').length,
    ownerRequiredItems: count(routeReviewTriage.summary?.ownerRequiredItems || routeAutoClearPreflight.summary?.ownerRequiredItems),
    sensitiveReviewItems: count(routeReviewTriage.summary?.sensitiveReviewItems || routeAutoClearPreflight.summary?.sensitiveReviewItems),
    duplicateOrStaleReviewItems: count(routeReviewTriage.summary?.duplicateOrStaleReviewItems || routeAutoClearPreflight.summary?.duplicateOrStaleReviewItems),
    pendingRoutes: count(routeReviewTriage.summary?.pendingRoutes || routeAutoClearPreflight.summary?.pendingRoutes),
    totalWaitingReviewItems: count(routeReviewTriage.summary?.needsReviewItems || routeAutoClearPreflight.summary?.totalWaitingReviewItems),
    ownersAssignedByReadback: 0,
    sensitiveReviewsCompletedByReadback: 0,
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
  if (routeAutoClearPreflight.ok !== true) failures.push('route_autoclear_preflight_not_healthy')
  if (routeReviewTriage.ok !== true) failures.push('route_review_triage_not_healthy')
  if (summary.blockerItemCount > 0 && summary.missingRouteIdCount > 0) failures.push('route_id_missing')
  if (blockerRows.some(row => row.status !== 'approval_required' || row.approvalRequired !== true || row.ownerAssignedNow || row.sensitiveReviewedNow || row.routeMutatedNow || row.destinationMutatedNow)) failures.push('blocker_item_not_approval_required')
  if (summary.ownersAssignedByReadback !== 0 || summary.sensitiveReviewsCompletedByReadback !== 0) failures.push('blocker_decision_mutated_by_readback')
  if (summary.routesApprovedByReadback !== 0 || summary.routesAppliedByReadback !== 0 || summary.routesRejectedByReadback !== 0 || summary.routesSnoozedByReadback !== 0 || summary.routesReroutedByReadback !== 0 || summary.routesMutatedByReadback !== 0) failures.push('route_mutated_by_readback')
  if (summary.destinationsMutatedByReadback !== 0 || summary.backlogRecordsWrittenByReadback !== 0 || summary.scoperRecordsWrittenByReadback !== 0 || summary.portfolioRecordsWrittenByReadback !== 0 || summary.currentSprintMutationsByReadback !== 0 || summary.approvalRecordsWrittenByReadback !== 0) failures.push('destination_records_written_by_readback')
  if (summary.harlanSendsByReadback !== 0 || summary.externalWritesByReadback !== 0) failures.push('external_write_by_readback')
  if (summary.extractionRunsStarted !== 0 || summary.connectorProbesStarted !== 0 || summary.modelCallsStarted !== 0) failures.push('runtime_started_by_readback')

  return {
    ok: failures.length === 0,
    status: failures.length ? 'fail_closed' : blockerRows.length ? 'blockers_ready' : 'healthy',
    contractVersion: DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_CONTRACT_VERSION,
    cardId: DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_CARD_ID,
    closeoutKey: DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_CLOSEOUT_KEY,
    generatedAt: toIso(generatedAt),
    visibleHome: DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_VISIBLE_HOME,
    source: {
      reusedTruthLayers: [
        'routeAutoClearPreflight',
        'routeReviewTriage',
      ],
      noSecondTruthLayer: true,
    },
    summary,
    plainEnglish: buildPlainEnglish(summary),
    groups,
    blockerRows,
    boundaries: buildBoundaries(),
    failures: Array.from(new Set(failures)),
  }
}

export function validateDevHubRouteBlockerPreflight(snapshot = {}) {
  const failures = []
  if (snapshot.ok !== true) failures.push(...list(snapshot.failures))
  if (!['blockers_ready', 'healthy'].includes(snapshot.status)) failures.push('status_not_operator_safe')
  if (snapshot.contractVersion !== DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_CONTRACT_VERSION) failures.push('contract_version_missing')
  if (snapshot.cardId !== DEV_HUB_ROUTE_BLOCKER_PREFLIGHT_CARD_ID) failures.push('card_id_mismatch')
  if (snapshot.source?.noSecondTruthLayer !== true) failures.push('second_truth_layer_risk')
  for (const layer of ['routeAutoClearPreflight', 'routeReviewTriage']) {
    if (!list(snapshot.source?.reusedTruthLayers).includes(layer)) failures.push(`source_layer_missing:${layer}`)
  }
  const boundaries = snapshot.boundaries || {}
  for (const key of ['readOnly', 'preflightOnly', 'approvalRequired', 'noOwnerAssignment', 'noRouteApprove', 'noRouteApply', 'noRouteReject', 'noRouteSnooze', 'noRouteReroute', 'noRouteMutation', 'noDestinationMutation', 'noBacklogMutation', 'noScoperMutation', 'noHarlanSend', 'noExternalWrites', 'noAutoApply', 'noAutoClear', 'noAutoBuild', 'noAutoPromoteRecommendations']) {
    if (boundaries[key] !== true) failures.push(`boundary_missing:${key}`)
  }
  const rows = list(snapshot.blockerRows)
  if (rows.length > 16) failures.push('blocker_rows_unbounded')
  if (list(snapshot.groups).length > 4) failures.push('groups_unbounded')
  if (count(snapshot.summary?.blockerItemCount) !== rows.length) failures.push('blocker_count_mismatch')
  if (count(snapshot.summary?.missingRouteIdCount) !== 0) failures.push('route_id_missing')
  if (count(snapshot.summary?.approvalRequiredRows) !== rows.length) failures.push('approval_required_count_mismatch')
  for (const row of rows) {
    if (!text(row.routeId)) failures.push('route_id_missing')
    if (row.status !== 'approval_required' || row.approvalRequired !== true || row.requiresExactRouteIdConfirmation !== true) failures.push('blocker_item_not_approval_required')
    if (row.ownerAssignedNow !== false || row.sensitiveReviewedNow !== false || row.routeMutatedNow !== false || row.destinationMutatedNow !== false || row.backlogWrittenNow !== false || row.harlanSentNow !== false || row.externalWriteNow !== false) failures.push('blocker_item_not_approval_required')
    if (!text(row.suggestedDecisionLane) || !text(row.operatorNextAction) || !text(row.mutationBoundary)) failures.push('operator_context_missing')
    if (!['owner_resolution_required', 'sensitive_review_required', 'operator_blocker_review'].includes(row.decisionType)) failures.push('unsupported_decision_type')
  }
  if (count(snapshot.summary?.ownersAssignedByReadback) !== 0 || count(snapshot.summary?.sensitiveReviewsCompletedByReadback) !== 0) failures.push('blocker_decision_mutated_by_readback')
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

export function buildDevHubRouteBlockerPreflightDogfoodProof() {
  const routeAutoClearPreflight = {
    ok: true,
    summary: {
      pendingRoutes: 3,
      totalWaitingReviewItems: 3,
      ownerRequiredItems: 1,
      sensitiveReviewItems: 1,
      duplicateOrStaleReviewItems: 2,
    },
    preflightRows: [
      {
        routeId: 'route-owner',
        reviewItemId: 'review:route-owner',
        title: 'Owner missing route',
        owner: '',
        approvalStatus: 'pending',
        destinationTable: 'backlog_items',
        type: 'backlog',
        ageDays: 6,
        clearReadiness: 'blocked_owner',
        sourceProof: { sourceRefCount: 2, duplicateClusterCount: 1, stalenessSeverity: 'red', reviewReasons: ['owner_resolution_required'], riskReasons: [], hardBlocks: [] },
      },
      {
        routeId: 'route-sensitive',
        reviewItemId: 'review:route-sensitive',
        title: 'Sensitive customer route',
        owner: 'Steve',
        approvalStatus: 'pending',
        destinationTable: 'decisions',
        type: 'decision',
        ageDays: 4,
        clearReadiness: 'blocked_sensitive',
        sourceProof: { sourceRefCount: 3, duplicateClusterCount: 0, stalenessSeverity: 'none', reviewReasons: ['sensitive_content_review_required'], riskReasons: ['customer_or_lead'], hardBlocks: [] },
      },
    ],
  }
  const routeReviewTriage = {
    ok: true,
    summary: {
      pendingRoutes: 3,
      needsReviewItems: 3,
      ownerRequiredItems: 1,
      sensitiveReviewItems: 1,
      duplicateOrStaleReviewItems: 2,
    },
  }
  const snapshot = buildDevHubRouteBlockerPreflight({
    generatedAt: '2026-05-31T09:05:00.000Z',
    routeAutoClearPreflight,
    routeReviewTriage,
  })
  const validation = validateDevHubRouteBlockerPreflight(snapshot)
  const unsafe = {
    ...snapshot,
    summary: {
      ...snapshot.summary,
      ownersAssignedByReadback: 1,
      routesMutatedByReadback: 1,
      harlanSendsByReadback: 1,
    },
    blockerRows: snapshot.blockerRows.map((row, index) => index === 0
      ? { ...row, status: 'assigned', ownerAssignedNow: true, routeMutatedNow: true }
      : row),
  }
  const unsafeMissingRoute = {
    ...snapshot,
    summary: {
      ...snapshot.summary,
      missingRouteIdCount: 1,
    },
    blockerRows: snapshot.blockerRows.map((row, index) => index === 0
      ? { ...row, routeId: '', exactRouteIdPresent: false }
      : row),
  }
  const unsafeValidation = validateDevHubRouteBlockerPreflight(unsafe)
  const missingRouteValidation = validateDevHubRouteBlockerPreflight(unsafeMissingRoute)
  return {
    ok: validation.ok &&
      snapshot.status === 'blockers_ready' &&
      snapshot.summary.blockerItemCount === 2 &&
      snapshot.summary.ownerResolutionRows === 1 &&
      snapshot.summary.sensitiveReviewRows === 1 &&
      snapshot.summary.ownersAssignedByReadback === 0 &&
      snapshot.blockerRows.every(row => row.status === 'approval_required' && row.ownerAssignedNow === false && row.routeMutatedNow === false) &&
      unsafeValidation.ok === false &&
      unsafeValidation.failures.includes('blocker_item_not_approval_required') &&
      unsafeValidation.failures.includes('blocker_decision_mutated_by_readback') &&
      unsafeValidation.failures.includes('route_mutated_by_readback') &&
      unsafeValidation.failures.includes('external_write_by_readback') &&
      missingRouteValidation.ok === false &&
      missingRouteValidation.failures.includes('route_id_missing'),
    validation,
    unsafeValidation,
    missingRouteValidation,
    snapshot,
    invariant: 'Route Blocker Preflight names exact owner/sensitive blockers while rejecting owner assignment, sensitive-review completion, route mutation, Harlan send, and missing route IDs.',
  }
}
