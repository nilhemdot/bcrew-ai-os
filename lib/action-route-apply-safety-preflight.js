import { createHash } from 'node:crypto'

import {
  ACTION_ROUTE_REVIEW_INBOX_API_PATH,
  ACTION_ROUTE_REVIEW_INBOX_VISIBLE_HOME,
  buildActionRouteReviewInboxSnapshot,
  validateActionRouteReviewInboxSnapshot,
} from './action-route-review-inbox.js'

export const ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_CARD_ID = 'ACTION-ROUTE-APPLY-SAFETY-PREFLIGHT-001'
export const ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_PARENT_CARD_ID = 'ACTION-ROUTE-APPLY-RESOLUTION-PROOF-002'
export const ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_CLOSEOUT_KEY = 'action-route-apply-safety-preflight-v1'
export const ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_PLAN_PATH = 'docs/process/action-route-apply-safety-preflight-001-plan.md'
export const ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_APPROVAL_PATH = 'docs/process/approvals/ACTION-ROUTE-APPLY-SAFETY-PREFLIGHT-001.json'
export const ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_SCRIPT_PATH = 'scripts/process-action-route-apply-safety-preflight-check.mjs'
export const ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_APPLY_CLI_PATH = 'scripts/intelligence-action-router-apply.mjs'
export const ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_CONTRACT_VERSION = 'action-route-apply-safety-preflight.v1'

export const ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_NOT_NEXT_BOUNDARIES = [
  'No live extraction.',
  'No transcript fetch, screenshot capture, crawl, summarization, or model call.',
  'No auth-required or paid run.',
  'No external write or Telegram send.',
  'No action-route approve, apply, reject, snooze, reroute, or backlog mutation.',
  'No auto-promotion of Director, Scoper, Portfolio, or route recommendations into backlog.',
  'No Google Drive permission mutation.',
  'No live Agent Feedback auto-send.',
  'No Harlan runtime, reply parsing, login, source-session resume, or external-action authority.',
]

const SUPPORTED_DESTINATIONS = new Set([
  'backlog_items',
  'decisions',
  'open_questions',
  'intelligence_synthesized_items',
])

const OPERATOR_DECISION_DESTINATIONS = new Set(['decisions', 'open_questions'])

const HIGH_RISK_PATTERNS = [
  ['external_send', /\b(send|email|slack|telegram|text|sms|call|post|comment|publish)\b/i],
  ['auth_or_access', /\b(login|mfa|password|credential|permission|access|admin|token|secret)\b/i],
  ['money_or_contract', /\b(payment|payroll|invoice|bank|commission|revenue|refund|contract|legal|tax)\b/i],
  ['customer_or_lead', /\b(client|customer|lead|agent|seller|buyer|google ads|follow up boss|fub)\b/i],
  ['people_or_hiring', /\b(employee|contractor|hire|hiring|job|offer|candidate|interview)\b/i],
  ['external_system', /\b(clickup|drive|gmail|missive|sheets|stripe|quickbooks|facebook|instagram|youtube)\b/i],
]

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function normalizeArray(value) {
  return Array.isArray(value)
    ? value.map(item => normalizeText(item)).filter(Boolean)
    : []
}

function count(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function stableHash(value) {
  return createHash('sha256').update(String(value || ''), 'utf8').digest('hex')
}

function collectSourceRefs(item = {}) {
  const evidence = item.evidence && typeof item.evidence === 'object' ? item.evidence : {}
  return [
    ...normalizeArray(item.sourceRefs),
    ...normalizeArray(item.sourceIds),
    ...normalizeArray(evidence.factRefs),
    ...normalizeArray(evidence.evidenceRefs),
    ...normalizeArray(evidence.evidenceChunkRefs),
    ...normalizeArray(evidence.atomRefs),
    ...normalizeArray(evidence.candidateKeys),
    ...normalizeArray(evidence.artifactIds),
  ]
}

function itemSearchText(item = {}) {
  return [
    item.title,
    item.summary,
    item.owner,
    item.type,
    item.destinationTable,
    ...normalizeArray(item.sourceIds),
  ].map(normalizeText).join(' ')
}

function riskReasonsForItem(item = {}) {
  const text = itemSearchText(item)
  const reasons = []
  for (const [reason, pattern] of HIGH_RISK_PATTERNS) {
    if (pattern.test(text)) reasons.push(reason)
  }
  return reasons
}

function needsOwner(item = {}) {
  const owner = normalizeText(item.owner)
  return !owner || /^(needs[-_ ]?owner|needs[-_ ]?owner[-_ ]?decision|owner[-_ ]?needed|unassigned)$/i.test(owner)
}

function stalenessSeverity(item = {}) {
  return normalizeText(item.staleness?.severity || 'none')
}

function duplicateCount(item = {}) {
  return normalizeArray(item.duplicateClusterIds).length
}

export function classifyActionRouteApplySafetyItem(item = {}) {
  const routeId = normalizeText(item.routeId)
  const approvalStatus = normalizeText(item.approvalStatus)
  const destinationTable = normalizeText(item.destinationTable)
  const sourceRefs = collectSourceRefs(item)
  const hardBlocks = []
  const reviewReasons = []
  const riskReasons = riskReasonsForItem(item)

  if (!routeId) hardBlocks.push('route_id_required')
  if (!SUPPORTED_DESTINATIONS.has(destinationTable)) hardBlocks.push(`unsupported_destination:${destinationTable || 'missing'}`)
  if (!['pending', 'approved', 'applied', 'rejected'].includes(approvalStatus)) hardBlocks.push(`unsupported_status:${approvalStatus || 'missing'}`)
  if (sourceRefs.length < 1) hardBlocks.push('source_evidence_required')
  if (needsOwner(item)) reviewReasons.push('owner_resolution_required')
  if (approvalStatus === 'pending') reviewReasons.push('human_route_approval_required')
  if (OPERATOR_DECISION_DESTINATIONS.has(destinationTable)) reviewReasons.push('operator_decision_required')
  if (duplicateCount(item) > 0) reviewReasons.push('duplicate_cluster_review_required')
  if (stalenessSeverity(item) === 'red') reviewReasons.push('stale_red_review_required')
  if (riskReasons.length) reviewReasons.push('sensitive_content_review_required')

  let safetyState = 'blocked'
  let wouldAllowConfirmedApply = false
  if (approvalStatus === 'applied') {
    safetyState = 'already_applied'
  } else if (approvalStatus === 'rejected') {
    safetyState = 'already_rejected'
  } else if (hardBlocks.length > 0) {
    safetyState = 'blocked'
  } else if (approvalStatus === 'approved' && reviewReasons.length === 0) {
    safetyState = 'ready_for_confirmed_internal_apply'
    wouldAllowConfirmedApply = true
  } else {
    safetyState = 'operator_review_required'
  }

  return {
    reviewItemId: normalizeText(item.reviewItemId),
    routeId,
    title: normalizeText(item.title || item.summary || routeId),
    owner: normalizeText(item.owner) || 'needs-owner-decision',
    approvalStatus,
    reviewState: normalizeText(item.reviewState),
    destinationTable,
    type: normalizeText(item.type),
    ageDays: Number.isFinite(Number(item.ageDays)) ? Number(item.ageDays) : null,
    sourceRefCount: sourceRefs.length,
    duplicateClusterCount: duplicateCount(item),
    stalenessSeverity: stalenessSeverity(item),
    riskReasons,
    reviewReasons: Array.from(new Set(reviewReasons)),
    hardBlocks: Array.from(new Set(hardBlocks)),
    safetyState,
    wouldAllowConfirmedApply,
    applyAllowedNow: false,
    requiresExplicitRouteIdConfirmation: true,
    requiresExplicitHumanApprover: true,
    mutatesInternalDestination: true,
    noExternalWrite: true,
  }
}

function compareSafetyItems(left = {}, right = {}) {
  const order = {
    blocked: 0,
    operator_review_required: 1,
    ready_for_confirmed_internal_apply: 2,
    already_applied: 3,
    already_rejected: 4,
  }
  const stateDelta = (order[left.safetyState] ?? 9) - (order[right.safetyState] ?? 9)
  if (stateDelta) return stateDelta
  const leftAge = left.ageDays === null ? -1 : left.ageDays
  const rightAge = right.ageDays === null ? -1 : right.ageDays
  if (rightAge !== leftAge) return rightAge - leftAge
  return normalizeText(left.routeId).localeCompare(normalizeText(right.routeId))
}

function failClosedPreflight(failures = [], now = new Date()) {
  return {
    ok: false,
    status: 'fail_closed',
    contractVersion: ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_CONTRACT_VERSION,
    cardId: ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_CARD_ID,
    parentCardId: ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_PARENT_CARD_ID,
    closeoutKey: ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_CLOSEOUT_KEY,
    generatedAt: now instanceof Date ? now.toISOString() : new Date(now).toISOString(),
    failures: Array.from(new Set(failures)),
    source: {
      reviewInboxRoute: ACTION_ROUTE_REVIEW_INBOX_API_PATH,
      visibleHome: ACTION_ROUTE_REVIEW_INBOX_VISIBLE_HOME,
    },
    summary: buildEmptySummary(),
    items: [],
    autoApplyAllowed: false,
    routeMutationAttempted: false,
    destinationMutationAttempted: false,
    externalWriteAttempted: false,
    boundaries: buildApplySafetyBoundaries(),
    safetyHash: '',
  }
}

function buildEmptySummary() {
  return {
    totalReviewItems: 0,
    routeItems: 0,
    pendingRoutes: 0,
    approvedRoutes: 0,
    appliedRoutes: 0,
    rejectedRoutes: 0,
    blockedItems: 0,
    operatorReviewRequiredItems: 0,
    readyForConfirmedApplyItems: 0,
    alreadyResolvedItems: 0,
    ownerRequiredItems: 0,
    sensitiveReviewItems: 0,
    duplicateOrStaleReviewItems: 0,
    autoApplyAllowedItems: 0,
  }
}

function buildApplySafetyBoundaries() {
  return {
    readOnly: true,
    proposalOnly: true,
    noLiveExtraction: true,
    noModelCalls: true,
    noExternalWrites: true,
    noRouteMutation: true,
    noDestinationMutation: true,
    noBacklogMutation: true,
    noApprovalMutation: true,
    noAutoPromoteRecommendations: true,
    noAutoApply: true,
    applyRequiresRouteIdEcho: true,
    applyRequiresHumanApprover: true,
    applyCliOnlyAfterSeparateApproval: true,
  }
}

export function buildActionRouteApplySafetyPreflight(snapshot = {}, {
  now = new Date(),
  maxItems = 20,
} = {}) {
  const snapshotValidation = validateActionRouteReviewInboxSnapshot(snapshot)
  const unsafeReasons = []
  if (!snapshotValidation.ok) unsafeReasons.push(...snapshotValidation.failures)
  if (snapshot.boundaries?.readOnly !== true) unsafeReasons.push('snapshot_not_read_only')
  if (snapshot.boundaries?.noExternalWrites !== true) unsafeReasons.push('snapshot_allows_external_writes')
  if (snapshot.source?.route !== ACTION_ROUTE_REVIEW_INBOX_API_PATH) unsafeReasons.push('wrong_review_inbox_source')
  if (unsafeReasons.length) return failClosedPreflight(unsafeReasons, now)

  const allItems = (Array.isArray(snapshot.reviewItems) ? snapshot.reviewItems : [])
    .filter(item => normalizeText(item.sourceKind) === 'intelligence_action_route')
    .map(classifyActionRouteApplySafetyItem)
  const items = [...allItems].sort(compareSafetyItems).slice(0, Math.max(1, Number(maxItems) || 20))
  const ready = allItems.filter(item => item.safetyState === 'ready_for_confirmed_internal_apply')
  const operatorReview = allItems.filter(item => item.safetyState === 'operator_review_required')
  const blocked = allItems.filter(item => item.safetyState === 'blocked')
  const alreadyResolved = allItems.filter(item => ['already_applied', 'already_rejected'].includes(item.safetyState))
  const ownerRequired = allItems.filter(item => item.reviewReasons.includes('owner_resolution_required'))
  const sensitive = allItems.filter(item => item.reviewReasons.includes('sensitive_content_review_required'))
  const duplicateOrStale = allItems.filter(item =>
    item.reviewReasons.includes('duplicate_cluster_review_required') ||
    item.reviewReasons.includes('stale_red_review_required')
  )
  const summary = {
    ...buildEmptySummary(),
    totalReviewItems: count(snapshot.summary?.totalReviewItems),
    routeItems: allItems.length,
    pendingRoutes: count(snapshot.summary?.pendingRoutes),
    approvedRoutes: count(snapshot.summary?.approvedRoutes),
    appliedRoutes: count(snapshot.summary?.appliedRoutes),
    rejectedRoutes: count(snapshot.summary?.rejectedRoutes),
    blockedItems: blocked.length,
    operatorReviewRequiredItems: operatorReview.length,
    readyForConfirmedApplyItems: ready.length,
    alreadyResolvedItems: alreadyResolved.length,
    ownerRequiredItems: ownerRequired.length,
    sensitiveReviewItems: sensitive.length,
    duplicateOrStaleReviewItems: duplicateOrStale.length,
    autoApplyAllowedItems: allItems.filter(item => item.applyAllowedNow).length,
  }
  const safetyHash = stableHash(JSON.stringify({
    generatedFrom: snapshot.generatedAt || '',
    summary,
    routeIds: allItems.map(item => `${item.routeId}:${item.safetyState}`).sort(),
  }))
  return {
    ok: true,
    status: 'healthy',
    contractVersion: ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_CONTRACT_VERSION,
    cardId: ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_CARD_ID,
    parentCardId: ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_PARENT_CARD_ID,
    closeoutKey: ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_CLOSEOUT_KEY,
    generatedAt: now instanceof Date ? now.toISOString() : new Date(now).toISOString(),
    source: {
      reviewInboxRoute: ACTION_ROUTE_REVIEW_INBOX_API_PATH,
      reviewInboxContractVersion: snapshot.contractVersion || '',
      visibleHome: ACTION_ROUTE_REVIEW_INBOX_VISIBLE_HOME,
      sourceGeneratedAt: snapshot.generatedAt || '',
    },
    summary,
    items,
    autoApplyAllowed: false,
    routeMutationAttempted: false,
    destinationMutationAttempted: false,
    externalWriteAttempted: false,
    boundaries: buildApplySafetyBoundaries(),
    nextHumanAction: ready.length
      ? 'Separate operator approval can choose one ready route, then run the apply CLI with --routeId echoed in --confirmApprovedRouteApply and an explicit --approvedBy.'
      : 'No route is ready for confirmed apply without additional operator review; keep live apply parked.',
    safetyHash,
  }
}

export function validateActionRouteApplySafetyPreflight(preflight = {}) {
  const failures = []
  const items = Array.isArray(preflight.items) ? preflight.items : []
  if (preflight.ok !== true) failures.push(...normalizeArray(preflight.failures))
  if (preflight.contractVersion !== ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_CONTRACT_VERSION) failures.push('contract_version_missing')
  if (preflight.cardId !== ACTION_ROUTE_APPLY_SAFETY_PREFLIGHT_CARD_ID) failures.push('card_id_mismatch')
  if (!['healthy'].includes(preflight.status)) failures.push('status_not_healthy')
  if (preflight.source?.reviewInboxRoute !== ACTION_ROUTE_REVIEW_INBOX_API_PATH) failures.push('review_inbox_source_missing')
  if (preflight.boundaries?.readOnly !== true || preflight.boundaries?.noExternalWrites !== true) failures.push('unsafe_boundaries')
  if (preflight.boundaries?.noRouteMutation !== true || preflight.boundaries?.noDestinationMutation !== true) failures.push('mutation_boundary_missing')
  if (preflight.boundaries?.noAutoPromoteRecommendations !== true || preflight.boundaries?.noAutoApply !== true) failures.push('auto_apply_boundary_missing')
  if (preflight.autoApplyAllowed !== false) failures.push('auto_apply_enabled')
  if (preflight.routeMutationAttempted !== false || preflight.destinationMutationAttempted !== false) failures.push('mutation_attempted')
  if (preflight.externalWriteAttempted !== false) failures.push('external_write_attempted')
  if (count(preflight.summary?.autoApplyAllowedItems) !== 0) failures.push('auto_apply_items_present')
  if (count(preflight.summary?.routeItems) < items.length) failures.push('item_count_exceeds_route_count')
  for (const item of items) {
    if (!item.routeId) failures.push('item_missing_route_id')
    if (item.applyAllowedNow !== false) failures.push(`item_allows_apply_now:${item.routeId || 'unknown'}`)
    if (item.wouldAllowConfirmedApply && item.approvalStatus !== 'approved') failures.push(`ready_item_not_approved:${item.routeId}`)
    if (item.wouldAllowConfirmedApply && item.sourceRefCount < 1) failures.push(`ready_item_missing_evidence:${item.routeId}`)
    if (item.safetyState === 'blocked' && !item.hardBlocks.length) failures.push(`blocked_item_missing_reason:${item.routeId}`)
    if (item.safetyState === 'operator_review_required' && !item.reviewReasons.length) failures.push(`review_item_missing_reason:${item.routeId}`)
  }
  return {
    ok: failures.length === 0,
    failures: Array.from(new Set(failures)),
    routeItems: count(preflight.summary?.routeItems),
    readyForConfirmedApplyItems: count(preflight.summary?.readyForConfirmedApplyItems),
  }
}

export function verifyActionRouterApplyCliGuard(source = '') {
  const text = String(source || '')
  const checks = [
    ['route_id_echo_guard', text.includes('confirmApprovedRouteApply')],
    ['explicit_approver_guard', text.includes('approvedBy')],
    ['confirmation_error_code', text.includes('action_route_apply_confirmation_required')],
    ['approver_error_code', text.includes('action_route_apply_approver_required')],
    ['dry_run_branch', text.includes('dryRun')],
    ['apply_call_guarded_by_cli', text.includes(['applyApproved', 'ActionRoute'].join(''))],
  ]
  const failures = checks.filter(([, ok]) => !ok).map(([check]) => check)
  return {
    ok: failures.length === 0,
    failures,
    checks: Object.fromEntries(checks),
  }
}

export function buildActionRouteApplySafetyPreflightDogfoodProof() {
  const now = new Date('2026-05-31T04:00:00.000Z')
  const snapshot = buildActionRouteReviewInboxSnapshot({
    now,
    generatedAt: now.toISOString(),
    actionRouter: {
      pendingRoutes: 3,
      approvedRoutes: 1,
      appliedRoutes: 1,
      rejectedRoutes: 0,
      recentRoutes: [
        {
          routeId: 'action-route:approvedsafe',
          routeType: 'owner_action',
          approvalStatus: 'approved',
          destinationTable: 'backlog_items',
          owner: 'Foundation Process',
          ownerConfidence: 'high',
          sourceIds: ['SRC-MEETINGS-001'],
          factRefs: ['fact:approvedsafe'],
          evidenceRefs: ['atom:approvedsafe'],
          evidenceChunkRefs: ['chunk:approvedsafe'],
          routedAt: '2026-05-31T03:00:00.000Z',
          proposedPayload: {
            title: 'Create internal Foundation proof note',
            summary: 'Internal source-backed proof task.',
          },
        },
        {
          routeId: 'action-route:pending',
          routeType: 'owner_action',
          approvalStatus: 'pending',
          destinationTable: 'backlog_items',
          owner: 'Foundation Process',
          ownerConfidence: 'high',
          sourceIds: ['SRC-MEETINGS-001'],
          factRefs: ['fact:pending'],
          evidenceRefs: ['atom:pending'],
          evidenceChunkRefs: ['chunk:pending'],
          routedAt: '2026-05-25T04:00:00.000Z',
          proposedPayload: {
            title: 'Create internal pending task',
            summary: 'Pending route needs human approval first.',
          },
        },
        {
          routeId: 'action-route:needsowner',
          routeType: 'needs_owner_decision',
          approvalStatus: 'pending',
          destinationTable: 'open_questions',
          owner: 'needs-owner-decision',
          ownerConfidence: 'needs_owner',
          sourceIds: ['SRC-MEETINGS-001'],
          factRefs: ['fact:needsowner'],
          evidenceRefs: ['atom:needsowner'],
          evidenceChunkRefs: ['chunk:needsowner'],
          routedAt: '2026-05-24T04:00:00.000Z',
          proposedPayload: {
            title: 'Assign owner for internal question',
            summary: 'Needs an owner before apply.',
          },
        },
        {
          routeId: 'action-route:sensitive',
          routeType: 'owner_action',
          approvalStatus: 'approved',
          destinationTable: 'backlog_items',
          owner: 'Sales Leadership',
          ownerConfidence: 'high',
          sourceIds: ['SRC-MISSIVE-001'],
          factRefs: ['fact:sensitive'],
          evidenceRefs: ['atom:sensitive'],
          evidenceChunkRefs: ['chunk:sensitive'],
          routedAt: '2026-05-31T03:30:00.000Z',
          proposedPayload: {
            title: 'Investigate client lead payment routing',
            summary: 'Sensitive business route requires operator review.',
          },
        },
        {
          routeId: 'action-route:applied',
          routeType: 'owner_action',
          approvalStatus: 'applied',
          destinationTable: 'backlog_items',
          destinationRecordId: 'ACTION-999',
          owner: 'Foundation Process',
          sourceIds: ['SRC-MEETINGS-001'],
          factRefs: ['fact:applied'],
          evidenceRefs: ['atom:applied'],
          evidenceChunkRefs: ['chunk:applied'],
          routedAt: '2026-05-31T02:00:00.000Z',
        },
      ],
    },
  })
  const preflight = buildActionRouteApplySafetyPreflight(snapshot, { now, maxItems: 10 })
  const validation = validateActionRouteApplySafetyPreflight(preflight)
  const unsafeSnapshot = {
    ...snapshot,
    boundaries: { ...snapshot.boundaries, readOnly: false },
  }
  const unsafePreflight = buildActionRouteApplySafetyPreflight(unsafeSnapshot, { now })
  const ready = preflight.items.find(item => item.routeId === 'action-route:approvedsafe')
  const pending = preflight.items.find(item => item.routeId === 'action-route:pending')
  const sensitive = preflight.items.find(item => item.routeId === 'action-route:sensitive')
  const needsOwnerItem = preflight.items.find(item => item.routeId === 'action-route:needsowner')
  return {
    ok: validation.ok &&
      ready?.safetyState === 'ready_for_confirmed_internal_apply' &&
      ready.applyAllowedNow === false &&
      pending?.reviewReasons.includes('human_route_approval_required') &&
      sensitive?.reviewReasons.includes('sensitive_content_review_required') &&
      needsOwnerItem?.reviewReasons.includes('owner_resolution_required') &&
      preflight.summary.autoApplyAllowedItems === 0 &&
      unsafePreflight.status === 'fail_closed' &&
      unsafePreflight.autoApplyAllowed === false,
    validation,
    preflight,
    unsafePreflight,
    invariant: 'Apply safety preflight can identify an approved internal route as ready for separate confirmed apply, but the preflight itself never approves, applies, mutates, or auto-promotes route recommendations.',
  }
}
