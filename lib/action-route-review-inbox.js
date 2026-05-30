import {
  ACTION_ROUTE_PROMOTION_WORKFLOW_API_PATH,
  ACTION_ROUTE_PROMOTION_WORKFLOW_CARD_ID,
  ACTION_ROUTE_PROMOTION_WORKFLOW_METADATA_KEY,
  buildActionRoutePromotionWorkflowAvailableActions,
  getActionRoutePromotionWorkflowState,
} from './action-route-promotion-workflow.js'
import {
  ACTION_ROUTE_DEDUP_STALENESS_CARD_ID,
  attachActionRouteDedupStalenessGuard,
} from './action-route-dedup-staleness-guard.js'

export const ACTION_ROUTE_REVIEW_INBOX_CARD_ID = 'ACTION-ROUTE-REVIEW-INBOX-001'
export const ACTION_ROUTE_REVIEW_INBOX_CLOSEOUT_KEY = 'action-route-review-inbox-v1'
export const ACTION_ROUTE_REVIEW_INBOX_PLAN_PATH = 'docs/process/action-route-review-inbox-001-plan.md'
export const ACTION_ROUTE_REVIEW_INBOX_APPROVAL_PATH = 'docs/process/approvals/ACTION-ROUTE-REVIEW-INBOX-001.json'
export const ACTION_ROUTE_REVIEW_INBOX_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-18-action-route-review-inbox-closeout.md'
export const ACTION_ROUTE_REVIEW_INBOX_SCRIPT_PATH = 'scripts/process-action-route-review-inbox-check.mjs'
export const ACTION_ROUTE_REVIEW_INBOX_SPRINT_ID = 'action-route-review-inbox-2026-05-18'
export const ACTION_ROUTE_REVIEW_INBOX_API_PATH = '/api/foundation/action-route-review-inbox'
export const ACTION_ROUTE_REVIEW_INBOX_VISIBLE_HOME = 'Foundation > Review queues > Action Route Review Inbox'
export const ACTION_ROUTE_REVIEW_INBOX_UI_SECTION = 'action-route-review-inbox'

export const ACTION_ROUTE_REVIEW_INBOX_NOT_NEXT_BOUNDARIES = [
  'No live extraction.',
  'No transcript fetch, screenshot capture, crawl, summarization, or model call.',
  'No auth-required or paid run.',
  'No external write.',
  'No action-route apply/promote/reject/snooze mutation in this card.',
  'No Harlan/Fal/voice/Canva/OpenHuman feature work.',
  'No Google Drive permission mutation.',
  'No live Agent Feedback auto-send.',
]

export const ACTION_ROUTE_REVIEW_INBOX_PROOF_COMMANDS = [
  'node --check lib/action-route-review-inbox.js lib/strategy-shared-comms-routes.js scripts/process-action-route-review-inbox-check.mjs scripts/foundation-verify.mjs',
  'npm run process:action-route-review-inbox-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:foundation-ship -- --card=ACTION-ROUTE-REVIEW-INBOX-001 --planApprovalRef=docs/process/approvals/ACTION-ROUTE-REVIEW-INBOX-001.json --closeoutKey=action-route-review-inbox-v1 --commitRef=HEAD',
]

export const ACTION_ROUTE_REVIEW_INBOX_CHANGED_FILES = [
  'lib/action-route-review-inbox.js',
  'lib/strategy-shared-comms-routes.js',
  'lib/foundation-backlog-detail.js',
  'lib/foundation-verify-live-api-snapshot.js',
  'lib/foundation-verifier-control-loop.js',
  'lib/foundation-build-closeout-cleanup-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'lib/security-access.js',
  'lib/foundation-surface-map.js',
  'public/foundation.html',
  'public/foundation-nav-config.js',
  'public/foundation-data.js',
  'public/foundation-router.js',
  'public/foundation-action-route-review-inbox-renderers.js',
  'server.js',
  'scripts/foundation-verify.mjs',
  'scripts/process-action-route-review-inbox-check.mjs',
  'docs/process/action-route-review-inbox-001-plan.md',
  'docs/process/approvals/ACTION-ROUTE-REVIEW-INBOX-001.json',
  'docs/_archive/handoffs/2026-05-18-action-route-review-inbox-closeout.md',
]

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeArray(value) {
  return Array.isArray(value)
    ? value.map(item => normalizeText(item)).filter(Boolean)
    : []
}

function parseDate(value) {
  const date = new Date(value || '')
  return Number.isNaN(date.getTime()) ? null : date
}

function getAgeDaysFromTimestamp(value, now = new Date()) {
  const date = parseDate(value)
  if (!date) return null
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)))
}

export function isActionRouteBacklogItem(item = {}) {
  const source = normalizeText(item.source)
  const joined = [
    item.id,
    item.title,
    item.summary,
    item.whyItMatters,
    item.nextAction,
    item.statusNote,
    item.owner,
  ].map(normalizeText).join('\n')
  return source === 'ACTION-ROUTER-001' ||
    /Action route:\s*action-route:/i.test(joined) ||
    /sourceRef["']?\s*:\s*["']?ACTION-ROUTER-001/i.test(joined)
}

export function getActionRouteBacklogItemIds(backlogItems = []) {
  return new Set((Array.isArray(backlogItems) ? backlogItems : [])
    .filter(isActionRouteBacklogItem)
    .map(item => normalizeText(item.id))
    .filter(Boolean))
}

export function filterBacklogItemsForDefaultQueue(backlogItems = [], { requestedCardIds = [] } = {}) {
  const requested = new Set(normalizeArray(requestedCardIds))
  return (Array.isArray(backlogItems) ? backlogItems : []).filter(item => {
    const id = normalizeText(item.id)
    return requested.has(id) || !isActionRouteBacklogItem(item)
  })
}

function destinationLabel(route = {}) {
  const table = normalizeText(route.destinationTable)
  if (table === 'backlog_items') return 'Backlog candidate'
  if (table === 'decisions') return 'Decision candidate'
  if (table === 'open_questions') return 'Open question candidate'
  if (table === 'intelligence_synthesized_items') return route.routeType === 'snooze' ? 'Snoozed finding' : 'Ignored finding'
  return table || 'Review candidate'
}

function routeReviewState(route = {}) {
  const workflowState = getActionRoutePromotionWorkflowState(route)
  if (workflowState) return workflowState
  const status = normalizeText(route.approvalStatus)
  if (status === 'pending') return 'needs_review'
  if (status === 'approved') return 'ready_to_apply'
  if (status === 'applied') return 'applied'
  if (status === 'rejected') return 'rejected'
  return status || 'unknown'
}

function sourceRefsForRoute(route = {}) {
  return [
    ...normalizeArray(route.sourceIds),
    ...normalizeArray(route.factRefs),
    ...normalizeArray(route.evidenceRefs),
    ...normalizeArray(route.evidenceChunkRefs),
  ]
}

function buildRouteReviewItem(route = {}, now = new Date()) {
  const routeId = normalizeText(route.routeId)
  const sourceRefs = sourceRefsForRoute(route)
  const metadata = route.metadata && typeof route.metadata === 'object' && !Array.isArray(route.metadata)
    ? route.metadata
    : {}
  const workflow = metadata[ACTION_ROUTE_PROMOTION_WORKFLOW_METADATA_KEY] || null
  return {
    reviewItemId: routeId ? `route:${routeId}` : '',
    sourceKind: 'intelligence_action_route',
    routeId,
    synthesizedItemId: normalizeText(route.synthesizedItemId),
    type: normalizeText(route.routeType),
    owner: normalizeText(route.owner) || 'needs-owner-decision',
    ownerConfidence: normalizeText(route.ownerConfidence),
    ageDays: getAgeDaysFromTimestamp(route.routedAt || route.createdAt || route.updatedAt, now),
    reviewState: routeReviewState(route),
    approvalStatus: normalizeText(route.approvalStatus),
    workflow,
    availableActions: buildActionRoutePromotionWorkflowAvailableActions(route),
    workflowRoute: routeId ? `/api/foundation/action-route-review-inbox/${encodeURIComponent(routeId)}/workflow` : '',
    destinationTable: normalizeText(route.destinationTable),
    destinationLabel: destinationLabel(route),
    destinationRecordId: normalizeText(route.destinationRecordId),
    sourceIds: normalizeArray(route.sourceIds),
    sourceRefs,
    evidence: {
      factRefs: normalizeArray(route.factRefs),
      evidenceRefs: normalizeArray(route.evidenceRefs),
      evidenceChunkRefs: normalizeArray(route.evidenceChunkRefs),
      atomRefs: normalizeArray(route.atomRefs),
      candidateKeys: normalizeArray(route.candidateKeys),
      artifactIds: normalizeArray(route.artifactIds),
    },
    title: normalizeText(route.proposedPayload?.title) || normalizeText(route.routingReason) || routeId,
    summary: normalizeText(route.proposedPayload?.summary) || normalizeText(route.routingReason),
    trustedBacklogCard: false,
  }
}

function extractActionRouteId(text = '') {
  const match = String(text || '').match(/action-route:[a-z0-9]+/i)
  return match ? match[0] : ''
}

function buildBacklogCandidateReviewItem(item = {}, now = new Date()) {
  const statusText = [item.statusNote, item.nextAction, item.summary].map(normalizeText).join('\n')
  const routeId = extractActionRouteId(statusText)
  return {
    reviewItemId: `backlog:${normalizeText(item.id)}`,
    sourceKind: 'backlog_action_route_candidate',
    routeId,
    backlogCardId: normalizeText(item.id),
    type: 'backlog_candidate',
    owner: normalizeText(item.owner) || 'Review Inbox',
    ownerConfidence: 'backlog_row',
    ageDays: getAgeDaysFromTimestamp(item.updatedAt || item.updated_at || item.createdAt || item.created_at, now),
    reviewState: 'backlog_candidate_review',
    approvalStatus: normalizeText(item.lane),
    destinationTable: 'backlog_items',
    destinationLabel: 'Backlog candidate already created from action route',
    destinationRecordId: normalizeText(item.id),
    sourceIds: [],
    sourceRefs: [normalizeText(item.source), routeId].filter(Boolean),
    evidence: {
      factRefs: normalizeArray(statusText.match(/fact:[a-z0-9]+/gi) || []),
      evidenceRefs: normalizeArray(statusText.match(/atom:[a-z0-9:-]+/gi) || []),
      evidenceChunkRefs: normalizeArray(statusText.match(/chunk:[a-z0-9:-]+/gi) || []),
      atomRefs: normalizeArray(statusText.match(/atom:[a-z0-9:-]+/gi) || []),
      candidateKeys: [],
      artifactIds: [],
    },
    title: normalizeText(item.title),
    summary: normalizeText(item.summary),
    trustedBacklogCard: false,
  }
}

export function buildActionRouteReviewInboxSnapshot({
  actionRouter = {},
  backlogItems = [],
  generatedAt = new Date().toISOString(),
  now = new Date(),
} = {}) {
  const routeItems = (Array.isArray(actionRouter.recentRoutes) ? actionRouter.recentRoutes : [])
    .map(route => buildRouteReviewItem(route, now))
  const actionRouteBacklogItems = (Array.isArray(backlogItems) ? backlogItems : [])
    .filter(isActionRouteBacklogItem)
  const backlogItemsAsReview = actionRouteBacklogItems.map(item => buildBacklogCandidateReviewItem(item, now))
  const reviewItems = [...routeItems, ...backlogItemsAsReview]
  const needsReview = reviewItems.filter(item => item.reviewState === 'needs_review' || item.reviewState === 'backlog_candidate_review')
  const aged = reviewItems.filter(item => item.ageDays !== null && item.ageDays >= 3 && ['needs_review', 'backlog_candidate_review'].includes(item.reviewState))
  const sourceCompleteItems = reviewItems.filter(item => item.type && item.owner && item.reviewState && item.sourceRefs.length > 0)
  return attachActionRouteDedupStalenessGuard({
    ok: true,
    status: 'healthy',
    contractVersion: 'action-route-review-inbox.v1',
    cardId: ACTION_ROUTE_REVIEW_INBOX_CARD_ID,
    generatedAt,
    visibleHome: ACTION_ROUTE_REVIEW_INBOX_VISIBLE_HOME,
    source: {
      route: ACTION_ROUTE_REVIEW_INBOX_API_PATH,
      readModel: 'proposal-only action-route review inbox',
      actionReviewRoute: '/api/foundation/action-review',
      promotionWorkflowRoute: ACTION_ROUTE_PROMOTION_WORKFLOW_API_PATH,
      dedupStalenessOwner: ACTION_ROUTE_DEDUP_STALENESS_CARD_ID,
      backlogRoute: '/api/foundation/backlog',
      mutationRoutesOwnedByFollowups: false,
      mutationRoutesOwnedBy: ACTION_ROUTE_PROMOTION_WORKFLOW_CARD_ID,
    },
    summary: {
      totalReviewItems: reviewItems.length,
      routeItems: routeItems.length,
      backlogCandidateItems: backlogItemsAsReview.length,
      needsReviewItems: needsReview.length,
      agedNeedsReviewItems: aged.length,
      sourceCompleteItems: sourceCompleteItems.length,
      pendingRoutes: Number(actionRouter.pendingRoutes || 0),
      approvedRoutes: Number(actionRouter.approvedRoutes || 0),
      appliedRoutes: Number(actionRouter.appliedRoutes || 0),
      rejectedRoutes: Number(actionRouter.rejectedRoutes || 0),
      workflowEnabledItems: reviewItems.filter(item => Array.isArray(item.availableActions) && item.availableActions.length > 0).length,
    },
    backlogSeparation: {
      separatedBacklogItemIds: actionRouteBacklogItems.map(item => normalizeText(item.id)).filter(Boolean),
      separatedBacklogItems: actionRouteBacklogItems.length,
      defaultBacklogRoute: '/api/foundation/backlog',
      focusedBacklogDetailStillAvailable: true,
    },
    boundaries: {
      readOnly: true,
      proposalOnly: true,
      noLiveExtraction: true,
      noModelCalls: true,
      noExternalWrites: true,
      noRouteMutation: false,
      routeMutationInternalOnly: true,
      mutationRouteOwner: ACTION_ROUTE_PROMOTION_WORKFLOW_CARD_ID,
    },
    reviewItems,
  })
}

export function validateActionRouteReviewInboxSnapshot(snapshot = {}) {
  const failures = []
  const reviewItems = Array.isArray(snapshot.reviewItems) ? snapshot.reviewItems : []
  if (snapshot.ok !== true) failures.push('snapshot_not_ok')
  if (snapshot.status !== 'healthy') failures.push('snapshot_not_healthy')
  if (snapshot.contractVersion !== 'action-route-review-inbox.v1') failures.push('contract_version_missing')
  if (snapshot.visibleHome !== ACTION_ROUTE_REVIEW_INBOX_VISIBLE_HOME) failures.push('visible_home_missing')
  if (snapshot.source?.route !== ACTION_ROUTE_REVIEW_INBOX_API_PATH) failures.push('route_missing')
  if (snapshot.boundaries?.readOnly !== true || snapshot.boundaries?.noExternalWrites !== true) failures.push('unsafe_boundaries')
  if (Number(snapshot.summary?.totalReviewItems) !== reviewItems.length) failures.push('summary_count_mismatch')
  if (snapshot.source?.dedupStalenessOwner !== ACTION_ROUTE_DEDUP_STALENESS_CARD_ID) failures.push('dedup_staleness_owner_missing')
  if (snapshot.dedupStaleness?.contractVersion !== 'action-route-dedup-staleness-guard.v1') failures.push('dedup_staleness_contract_missing')
  for (const item of reviewItems) {
    if (!item.reviewItemId) failures.push('item_missing_id')
    if (!item.type) failures.push(`item_missing_type:${item.reviewItemId || 'unknown'}`)
    if (!item.owner) failures.push(`item_missing_owner:${item.reviewItemId || 'unknown'}`)
    if (!item.reviewState) failures.push(`item_missing_review_state:${item.reviewItemId || 'unknown'}`)
    if (!Array.isArray(item.sourceRefs) || item.sourceRefs.length < 1) failures.push(`item_missing_source_refs:${item.reviewItemId || 'unknown'}`)
    if (!item.dedupeKey) failures.push(`item_missing_dedupe_key:${item.reviewItemId || 'unknown'}`)
    if (!item.staleness?.status) failures.push(`item_missing_staleness:${item.reviewItemId || 'unknown'}`)
  }
  return {
    ok: failures.length === 0,
    failures: Array.from(new Set(failures)),
    reviewItemCount: reviewItems.length,
  }
}

export function buildActionRouteReviewInboxDogfoodProof() {
  const now = new Date('2026-05-18T02:00:00.000Z')
  const actionRouter = {
    pendingRoutes: 1,
    approvedRoutes: 0,
    appliedRoutes: 1,
    recentRoutes: [
      {
        routeId: 'action-route:synthetic1',
        routeType: 'open_question',
        approvalStatus: 'pending',
        destinationTable: 'open_questions',
        owner: 'Foundation Process',
        ownerConfidence: 'high',
        sourceIds: ['SRC-MEETINGS-001'],
        factRefs: ['fact:one'],
        evidenceRefs: ['atom:one'],
        evidenceChunkRefs: ['chunk:one'],
        routedAt: '2026-05-14T02:00:00.000Z',
        proposedPayload: { title: 'Synthetic pending route', summary: 'Needs review.' },
      },
      {
        routeId: 'action-route:synthetic2',
        routeType: 'owner_action',
        approvalStatus: 'applied',
        destinationTable: 'backlog_items',
        destinationRecordId: 'ACTION-999',
        owner: 'Ops',
        sourceIds: ['SRC-MEETINGS-001'],
        factRefs: ['fact:two'],
        evidenceRefs: ['atom:two'],
        evidenceChunkRefs: ['chunk:two'],
        routedAt: '2026-05-18T01:00:00.000Z',
      },
    ],
  }
  const backlogItems = [
    {
      id: 'ACTION-999',
      title: 'Synthetic route-derived backlog row',
      lane: 'scoped',
      source: 'ACTION-ROUTER-001',
      summary: 'Route-derived proposed work.',
      statusNote: 'Action route: action-route:synthetic2\nFacts: fact:two\nEvidence atoms: atom:two\nEvidence chunks: chunk:two',
      updatedAt: '2026-05-18T01:00:00.000Z',
    },
    {
      id: 'NORMAL-001',
      title: 'Normal backlog row',
      lane: 'scoped',
      source: 'manual',
      summary: 'Should remain in backlog.',
    },
  ]
  const snapshot = buildActionRouteReviewInboxSnapshot({ actionRouter, backlogItems, now })
  const validation = validateActionRouteReviewInboxSnapshot(snapshot)
  const defaultBacklog = filterBacklogItemsForDefaultQueue(backlogItems)
  const focusedBacklog = filterBacklogItemsForDefaultQueue(backlogItems, { requestedCardIds: ['ACTION-999'] })
  const broken = buildActionRouteReviewInboxSnapshot({
    actionRouter: {
      recentRoutes: [{
        routeId: 'action-route:broken',
        routeType: '',
        approvalStatus: 'pending',
        owner: '',
        sourceIds: [],
      }],
    },
    backlogItems: [],
    now,
  })
  const brokenValidation = validateActionRouteReviewInboxSnapshot(broken)
  return {
    ok: validation.ok &&
      snapshot.summary.totalReviewItems === 3 &&
      snapshot.summary.backlogCandidateItems === 1 &&
      snapshot.summary.agedNeedsReviewItems === 1 &&
      defaultBacklog.length === 1 &&
      defaultBacklog[0].id === 'NORMAL-001' &&
      focusedBacklog.some(item => item.id === 'ACTION-999') &&
      brokenValidation.ok === false,
    validation,
    brokenValidation,
    defaultBacklogIds: defaultBacklog.map(item => item.id),
    focusedBacklogIds: focusedBacklog.map(item => item.id),
    invariant: 'Action-route findings show as review inbox items with type, owner, age, source refs, and review state; route-derived backlog rows are hidden from default backlog but remain accessible by explicit card focus.',
  }
}
