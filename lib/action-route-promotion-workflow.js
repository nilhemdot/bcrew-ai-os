export const ACTION_ROUTE_PROMOTION_WORKFLOW_CARD_ID = 'ACTION-ROUTE-PROMOTION-WORKFLOW-001'
export const ACTION_ROUTE_PROMOTION_WORKFLOW_CLOSEOUT_KEY = 'action-route-promotion-workflow-v1'
export const ACTION_ROUTE_PROMOTION_WORKFLOW_PLAN_PATH = 'docs/process/action-route-promotion-workflow-001-plan.md'
export const ACTION_ROUTE_PROMOTION_WORKFLOW_APPROVAL_PATH = 'docs/process/approvals/ACTION-ROUTE-PROMOTION-WORKFLOW-001.json'
export const ACTION_ROUTE_PROMOTION_WORKFLOW_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-action-route-promotion-workflow-closeout.md'
export const ACTION_ROUTE_PROMOTION_WORKFLOW_SCRIPT_PATH = 'scripts/process-action-route-promotion-workflow-check.mjs'
export const ACTION_ROUTE_PROMOTION_WORKFLOW_SPRINT_ID = 'action-route-promotion-workflow-2026-05-18'
export const ACTION_ROUTE_PROMOTION_WORKFLOW_API_PATH = '/api/foundation/action-route-review-inbox/:routeId/workflow'
export const ACTION_ROUTE_PROMOTION_WORKFLOW_METADATA_KEY = 'actionRoutePromotionWorkflow'

export const ACTION_ROUTE_PROMOTION_WORKFLOW_ACTIONS = [
  'confirm_decision',
  'answer_question',
  'assign_owner',
  'promote_to_backlog',
  'duplicate',
  'reject',
  'snooze',
  'link_existing_card',
]

export const ACTION_ROUTE_PROMOTION_WORKFLOW_NOT_NEXT_BOUNDARIES = [
  'No live extraction.',
  'No transcript fetch, screenshot capture, crawl, summarization, or model call.',
  'No auth-required or paid run.',
  'No external write.',
  'No Google Drive permission mutation.',
  'No live Agent Feedback auto-send.',
  'No Harlan/Fal/voice/Canva/OpenHuman feature work.',
  'No broad visual UI redesign.',
]

export const ACTION_ROUTE_PROMOTION_WORKFLOW_CHANGED_FILES = [
  'lib/action-route-promotion-workflow.js',
  'lib/action-route-review-inbox.js',
  'lib/strategy-shared-comms-routes.js',
  'lib/foundation-db.js',
  'lib/security-access.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'lib/foundation-build-closeout-cleanup-records.js',
  'public/foundation-data.js',
  'public/foundation-action-route-review-inbox-renderers.js',
  'server.js',
  'scripts/foundation-verify.mjs',
  'scripts/process-action-route-promotion-workflow-check.mjs',
  'docs/process/action-route-promotion-workflow-001-plan.md',
  'docs/process/approvals/ACTION-ROUTE-PROMOTION-WORKFLOW-001.json',
  'docs/handoffs/2026-05-18-action-route-promotion-workflow-closeout.md',
]

export const ACTION_ROUTE_PROMOTION_WORKFLOW_PROOF_COMMANDS = [
  'node --check lib/action-route-promotion-workflow.js lib/action-route-review-inbox.js lib/strategy-shared-comms-routes.js scripts/process-action-route-promotion-workflow-check.mjs scripts/foundation-verify.mjs',
  'npm run process:action-route-promotion-workflow-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:foundation-ship -- --card=ACTION-ROUTE-PROMOTION-WORKFLOW-001 --planApprovalRef=docs/process/approvals/ACTION-ROUTE-PROMOTION-WORKFLOW-001.json --closeoutKey=action-route-promotion-workflow-v1 --commitRef=HEAD',
]

const ACTION_SET = new Set(ACTION_ROUTE_PROMOTION_WORKFLOW_ACTIONS)
const INTERNAL_SIDE_EFFECT_ACTIONS = new Set(['confirm_decision', 'promote_to_backlog', 'reject', 'snooze', 'duplicate', 'link_existing_card'])

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeArray(value) {
  return Array.isArray(value)
    ? value.map(item => normalizeText(item)).filter(Boolean)
    : []
}

function normalizeAction(value) {
  const action = normalizeText(value)
  return ACTION_SET.has(action) ? action : ''
}

function isNeedsOwnerValue(value) {
  return /^(needs[-_ ]?owner|owner[-_ ]?needed|keep-current|unassigned)$/i.test(normalizeText(value))
}

function parseMetadata(route = {}) {
  const metadata = route.metadata
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {}
}

function sourceRefsForRoute(route = {}) {
  return [
    ...normalizeArray(route.sourceIds),
    ...normalizeArray(route.factRefs),
    ...normalizeArray(route.evidenceRefs),
    ...normalizeArray(route.evidenceChunkRefs),
    ...normalizeArray(route.atomRefs),
    ...normalizeArray(route.candidateKeys),
    ...normalizeArray(route.artifactIds),
  ]
}

function backlogItemMentionsRoute(item = {}, routeId = '') {
  const needle = normalizeText(routeId).toLowerCase()
  if (!needle) return false
  const text = [
    item.id,
    item.title,
    item.summary,
    item.whyItMatters,
    item.why_it_matters,
    item.nextAction,
    item.next_action,
    item.statusNote,
    item.status_note,
    item.source,
  ].map(normalizeText).join('\n').toLowerCase()
  return text.includes(needle)
}

export function normalizeActionRoutePromotionWorkflowInput(input = {}) {
  const action = normalizeAction(input.action)
  const note = normalizeText(input.note || input.reason || input.answer || input.reviewNote)
  const owner = normalizeText(input.owner || input.assignee || input.selectedOwner)
  const targetCardId = normalizeText(input.targetCardId || input.target_card_id || input.existingCardId || input.existing_card_id)
  const snoozeUntil = normalizeText(input.snoozeUntil || input.snooze_until)
  const snoozeDuration = normalizeText(input.snoozeDuration || input.snooze_duration)
  const reviewedBy = normalizeText(input.reviewedBy || input.approvedBy || input.actor || 'foundation-review')
  return {
    action,
    note,
    owner,
    targetCardId,
    snoozeUntil,
    snoozeDuration,
    reviewedBy,
    rawAction: normalizeText(input.action),
    unsafeFlags: {
      liveExtraction: Boolean(input.liveExtraction || input.live_extraction),
      paidRun: Boolean(input.paidRun || input.paid_run),
      authRequiredRun: Boolean(input.authRequiredRun || input.auth_required_run),
      externalWrite: Boolean(input.externalWrite || input.external_write),
      driveMutation: Boolean(input.driveMutation || input.drive_mutation),
      agentFeedbackAutoSend: Boolean(input.agentFeedbackAutoSend || input.agent_feedback_auto_send),
    },
  }
}

export function findExistingActionRouteBacklogItems(backlogItems = [], routeId = '') {
  return (Array.isArray(backlogItems) ? backlogItems : [])
    .filter(item => backlogItemMentionsRoute(item, routeId))
    .map(item => ({
      id: normalizeText(item.id),
      title: normalizeText(item.title),
      lane: normalizeText(item.lane || item.status),
    }))
    .filter(item => item.id)
}

export function getActionRoutePromotionWorkflowState(route = {}) {
  const workflow = parseMetadata(route)[ACTION_ROUTE_PROMOTION_WORKFLOW_METADATA_KEY]
  if (workflow && typeof workflow === 'object' && !Array.isArray(workflow)) {
    const state = normalizeText(workflow.state)
    if (state) return state
  }
  return ''
}

export function buildActionRoutePromotionWorkflowAvailableActions(route = {}) {
  const status = normalizeText(route.approvalStatus)
  if (!['pending', 'approved'].includes(status)) return []
  const destination = normalizeText(route.destinationTable)
  const routeType = normalizeText(route.routeType)
  const actions = ['assign_owner', 'reject', 'duplicate', 'link_existing_card']
  if (destination === 'decisions') actions.unshift('confirm_decision')
  if (destination === 'backlog_items') actions.unshift('promote_to_backlog')
  if (destination === 'open_questions' || ['open_question', 'contradiction', 'needs_owner_decision'].includes(routeType)) actions.unshift('answer_question')
  actions.push('snooze')
  return Array.from(new Set(actions))
}

export function validateActionRoutePromotionWorkflowRequest({
  route = {},
  input = {},
  backlogItems = [],
} = {}) {
  const normalized = normalizeActionRoutePromotionWorkflowInput(input)
  const failures = []
  const routeId = normalizeText(route.routeId || input.routeId)
  const status = normalizeText(route.approvalStatus)
  const destination = normalizeText(route.destinationTable)
  const routeType = normalizeText(route.routeType)
  const sourceRefs = sourceRefsForRoute(route)
  const duplicateBacklogItems = findExistingActionRouteBacklogItems(backlogItems, routeId)

  if (!routeId) failures.push('route_id_required')
  if (!normalized.action) failures.push(`unsupported_action:${normalized.rawAction || 'missing'}`)
  if (!['pending', 'approved', 'applied', 'rejected'].includes(status)) failures.push(`unsupported_route_status:${status || 'missing'}`)
  if (sourceRefs.length < 1) failures.push('source_evidence_required')
  if (Object.values(normalized.unsafeFlags).some(Boolean)) failures.push('external_or_runtime_side_effect_forbidden')

  if (normalized.action === 'confirm_decision') {
    if (destination !== 'decisions') failures.push('confirm_decision_requires_decision_destination')
    if (!['pending', 'approved', 'applied'].includes(status)) failures.push('confirm_decision_requires_pending_or_approved_route')
  }

  if (normalized.action === 'answer_question') {
    if (destination !== 'open_questions' && !['open_question', 'contradiction', 'needs_owner_decision'].includes(routeType)) {
      failures.push('answer_question_requires_question_route')
    }
    if (!normalized.note) failures.push('answer_question_requires_answer')
    if (!['pending', 'approved'].includes(status)) failures.push('answer_question_requires_pending_or_approved_route')
  }

  if (normalized.action === 'assign_owner') {
    if (!normalized.owner || isNeedsOwnerValue(normalized.owner)) failures.push('assign_owner_requires_concrete_owner')
    if (status !== 'pending') failures.push('assign_owner_requires_pending_route')
  }

  if (normalized.action === 'promote_to_backlog') {
    if (destination !== 'backlog_items') failures.push('promote_to_backlog_requires_backlog_destination')
    if (!['pending', 'approved', 'applied'].includes(status)) failures.push('promote_to_backlog_requires_pending_or_approved_route')
    if (status !== 'applied' && duplicateBacklogItems.length > 0) failures.push('promote_to_backlog_would_duplicate_existing_card')
  }

  if (normalized.action === 'duplicate') {
    if (!normalized.targetCardId) failures.push('duplicate_requires_existing_card_link')
    if (!normalized.note) failures.push('duplicate_requires_reason')
    if (!['pending', 'approved'].includes(status)) failures.push('duplicate_requires_pending_or_approved_route')
  }

  if (normalized.action === 'reject') {
    if (!normalized.note) failures.push('reject_requires_reason')
    if (!['pending', 'approved'].includes(status)) failures.push('reject_requires_pending_or_approved_route')
  }

  if (normalized.action === 'snooze') {
    if (!normalized.snoozeDuration && !normalized.snoozeUntil && !normalized.note) failures.push('snooze_requires_duration_or_reason')
    if (status !== 'pending') failures.push('snooze_requires_pending_route')
  }

  if (normalized.action === 'link_existing_card') {
    if (!normalized.targetCardId) failures.push('link_existing_card_requires_target_card')
    if (!['pending', 'approved'].includes(status)) failures.push('link_existing_card_requires_pending_or_approved_route')
  }

  return {
    ok: failures.length === 0,
    failures: Array.from(new Set(failures)),
    normalized,
    routeId,
    duplicateBacklogItems,
    sourceRefs,
    internalSideEffect: INTERNAL_SIDE_EFFECT_ACTIONS.has(normalized.action),
  }
}

export function buildActionRoutePromotionWorkflowMetadata({
  route = {},
  validation = {},
  result = {},
  actor = 'foundation-review',
} = {}) {
  const normalized = validation.normalized || normalizeActionRoutePromotionWorkflowInput({})
  const now = new Date().toISOString()
  const destinationRecordId = normalizeText(result.destinationRecordId || result.route?.destinationRecordId || route.destinationRecordId)
  return {
    version: 'action-route-promotion-workflow.v1',
    state: normalized.action,
    action: normalized.action,
    reviewedBy: normalizeText(normalized.reviewedBy || actor),
    reviewedAt: now,
    note: normalized.note,
    owner: normalized.owner,
    targetCardId: normalized.targetCardId,
    snoozeUntil: normalized.snoozeUntil,
    snoozeDuration: normalized.snoozeDuration,
    routeId: validation.routeId || route.routeId || '',
    destinationTable: route.destinationTable || '',
    destinationRecordId,
    duplicateBacklogItemIds: (validation.duplicateBacklogItems || []).map(item => item.id),
    sourceRefs: validation.sourceRefs || sourceRefsForRoute(route),
    internalSideEffect: Boolean(validation.internalSideEffect),
    noExternalWrite: true,
    noLiveExtraction: true,
  }
}

export function buildActionRoutePromotionWorkflowDogfoodProof() {
  const sourceRoute = {
    routeId: 'action-route:workflow1',
    approvalStatus: 'pending',
    routeType: 'owner_action',
    destinationTable: 'backlog_items',
    owner: 'Foundation Process',
    sourceIds: ['SRC-MEETINGS-001'],
    factRefs: ['fact:workflow'],
    evidenceRefs: ['atom:workflow'],
    evidenceChunkRefs: ['chunk:workflow'],
  }
  const questionRoute = {
    ...sourceRoute,
    routeId: 'action-route:question1',
    routeType: 'open_question',
    destinationTable: 'open_questions',
  }
  const decisionRoute = {
    ...sourceRoute,
    routeId: 'action-route:decision1',
    routeType: 'decision',
    destinationTable: 'decisions',
  }
  const duplicateBacklogItems = [{
    id: 'ACTION-101',
    title: 'Existing promoted action',
    statusNote: 'Action route: action-route:workflow1',
  }]
  const validPromote = validateActionRoutePromotionWorkflowRequest({
    route: sourceRoute,
    input: { action: 'promote_to_backlog', note: 'Promote to tracked Foundation backlog.' },
    backlogItems: [],
  })
  const duplicatePromote = validateActionRoutePromotionWorkflowRequest({
    route: sourceRoute,
    input: { action: 'promote_to_backlog', note: 'Promote to tracked Foundation backlog.' },
    backlogItems: duplicateBacklogItems,
  })
  const missingOwner = validateActionRoutePromotionWorkflowRequest({
    route: sourceRoute,
    input: { action: 'assign_owner', owner: 'needs-owner' },
  })
  const answerQuestion = validateActionRoutePromotionWorkflowRequest({
    route: questionRoute,
    input: { action: 'answer_question', answer: 'Use Foundation as source of truth.' },
  })
  const answerMissing = validateActionRoutePromotionWorkflowRequest({
    route: questionRoute,
    input: { action: 'answer_question' },
  })
  const confirmDecision = validateActionRoutePromotionWorkflowRequest({
    route: decisionRoute,
    input: { action: 'confirm_decision', note: 'Decision confirmed.' },
  })
  const rejectMissing = validateActionRoutePromotionWorkflowRequest({
    route: sourceRoute,
    input: { action: 'reject' },
  })
  const duplicateMissingLink = validateActionRoutePromotionWorkflowRequest({
    route: sourceRoute,
    input: { action: 'duplicate', note: 'Already covered.' },
  })
  const snooze = validateActionRoutePromotionWorkflowRequest({
    route: sourceRoute,
    input: { action: 'snooze', snoozeDuration: '1w' },
  })
  const externalWrite = validateActionRoutePromotionWorkflowRequest({
    route: sourceRoute,
    input: { action: 'promote_to_backlog', externalWrite: true },
  })
  const metadata = buildActionRoutePromotionWorkflowMetadata({
    route: sourceRoute,
    validation: validPromote,
    result: { destinationRecordId: 'ACTION-102' },
    actor: 'dogfood',
  })
  return {
    ok: validPromote.ok &&
      duplicatePromote.ok === false &&
      duplicatePromote.failures.includes('promote_to_backlog_would_duplicate_existing_card') &&
      missingOwner.ok === false &&
      answerQuestion.ok &&
      answerMissing.ok === false &&
      confirmDecision.ok &&
      rejectMissing.ok === false &&
      duplicateMissingLink.ok === false &&
      snooze.ok &&
      externalWrite.ok === false &&
      metadata.sourceRefs.length >= 4 &&
      metadata.noExternalWrite === true &&
      metadata.state === 'promote_to_backlog',
    cases: {
      validPromote,
      duplicatePromote,
      missingOwner,
      answerQuestion,
      answerMissing,
      confirmDecision,
      rejectMissing,
      duplicateMissingLink,
      snooze,
      externalWrite,
    },
    invariant: 'Promotion workflow preserves source evidence, blocks duplicate backlog creation, requires reasons/owners/answers, and refuses extraction/auth/paid/external side effects.',
  }
}
