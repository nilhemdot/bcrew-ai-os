export const REPLY_WATCHING_LOOP_CARD_ID = 'REPLY-WATCHING-LOOP-001'
export const REPLY_WATCHING_LOOP_CLOSEOUT_KEY = 'reply-watching-loop-v1'
export const REPLY_WATCHING_LOOP_PLAN_PATH = 'docs/process/reply-watching-loop-001-plan.md'
export const REPLY_WATCHING_LOOP_APPROVAL_PATH = 'docs/process/approvals/REPLY-WATCHING-LOOP-001.json'
export const REPLY_WATCHING_LOOP_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-20-reply-watching-loop-closeout.md'
export const REPLY_WATCHING_LOOP_SCRIPT_PATH = 'scripts/process-reply-watching-loop-check.mjs'
export const REPLY_WATCHING_LOOP_ACTOR = 'codex-reply-watching-loop'
export const REPLY_WATCHING_LOOP_NEXT_CARD_ID = 'STRATEGY-QUARTER-001'

export const REPLY_WATCHING_LOOP_ALLOWED_LEDGERS = Object.freeze([
  'intelligence_action_routes',
  'decisions',
  'open_questions',
  'backlog_items',
  'intelligence_synthesized_items',
  'change_events',
])

export const REPLY_WATCHING_LOOP_FORBIDDEN_SECOND_QUEUE_TABLES = Object.freeze([
  'watching_items',
  'brief_replies',
  'reply_parser_items',
  'reply_watching_items',
])

export const OLD_REPLY_PARSER_PATTERNS_PROMOTED = Object.freeze([
  'resolution',
  'correction',
  'new_info',
  'question',
  'acknowledgment',
  'ambiguous',
])

export const REPLY_WATCHING_LOOP_PROOF_COMMANDS = Object.freeze([
  'node --check lib/reply-watching-loop.js scripts/process-reply-watching-loop-check.mjs',
  'npm run process:reply-watching-loop-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=REPLY-WATCHING-LOOP-001 --planApprovalRef=docs/process/approvals/REPLY-WATCHING-LOOP-001.json --closeoutKey=reply-watching-loop-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=REPLY-WATCHING-LOOP-001 --closeoutKey=reply-watching-loop-v1',
  'npm run process:foundation-ship -- --card=REPLY-WATCHING-LOOP-001 --planApprovalRef=docs/process/approvals/REPLY-WATCHING-LOOP-001.json --closeoutKey=reply-watching-loop-v1 --commitRef=HEAD',
])

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function normalizeArray(value) {
  return Array.isArray(value)
    ? value.map(item => normalizeText(item)).filter(Boolean)
    : []
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function firstMatchIntent(text = '') {
  const normalized = normalizeText(text).toLowerCase()
  if (!normalized) return { intent: 'ambiguous', confidence: 0, reason: 'empty_reply' }
  if (/\b(done|completed|finished|handled|taken care of|resolved|fixed)\b/.test(normalized)) {
    return { intent: 'resolution', confidence: 0.9, reason: 'resolution_pattern' }
  }
  if (/\b(actually|wrong|incorrect|not true|real number|correction|that is false)\b/.test(normalized)) {
    return { intent: 'correction', confidence: 0.85, reason: 'correction_pattern' }
  }
  if (/\b(also|fyi|heads up|you should know|update:|new info)\b/.test(normalized)) {
    return { intent: 'new_info', confidence: 0.75, reason: 'new_info_pattern' }
  }
  if (normalized.includes('?') || /\b(what do you mean|where did you get|can you explain|why)\b/.test(normalized)) {
    return { intent: 'question', confidence: 0.9, reason: 'question_pattern' }
  }
  if (/^(thanks|got it|will do|on it|looking into it|ok|okay|acknowledged)\b/.test(normalized)) {
    return { intent: 'acknowledgment', confidence: 0.7, reason: 'acknowledgment_pattern' }
  }
  return { intent: 'ambiguous', confidence: 0.4, reason: 'no_high_confidence_pattern' }
}

export function classifyReplyWatchingLoopReply({ text = '', contextType = '', targetId = '' } = {}) {
  const match = firstMatchIntent(text)
  return {
    ...match,
    contextType: normalizeText(contextType) || 'unknown',
    targetId: normalizeText(targetId),
    requiresHumanReview: match.intent === 'ambiguous' || match.confidence < 0.7,
    canAutoClose: match.intent === 'resolution' && match.confidence >= 0.7 && Boolean(normalizeText(targetId)),
  }
}

function itemStateFromReviewState(reviewState = '') {
  const state = normalizeText(reviewState)
  if (state === 'applied' || state === 'handled') return 'handled'
  if (state === 'rejected') return 'rejected'
  if (state === 'snoozed') return 'snoozed'
  if (state === 'needs_clarification') return 'needs_clarification'
  return 'open'
}

function itemEvidenceRefs(item = {}) {
  const evidence = asObject(item.evidence)
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

function buildLoopItemFromReviewItem(item = {}) {
  const reviewState = normalizeText(item.reviewState)
  const sourceRefs = itemEvidenceRefs(item)
  return {
    loopItemId: normalizeText(item.reviewItemId) || normalizeText(item.routeId),
    sourceKind: normalizeText(item.sourceKind) || 'action_route_review_item',
    sourceLedger: normalizeText(item.destinationTable) || 'intelligence_action_routes',
    sourceRecordId: normalizeText(item.routeId || item.destinationRecordId || item.backlogCardId),
    title: normalizeText(item.title),
    owner: normalizeText(item.owner) || 'needs-owner-decision',
    state: itemStateFromReviewState(reviewState),
    reviewState,
    sourceRefs,
    staleStatus: normalizeText(item.staleness?.status || 'current'),
    nextAction: normalizeText(item.staleness?.nextAction) ||
      normalizeText(item.nextAction) ||
      'Review, promote, answer, reject, duplicate, link, or snooze this item through the governed action-route workflow.',
  }
}

function buildLoopItemFromQuestion(question = {}) {
  const status = normalizeText(question.status)
  return {
    loopItemId: normalizeText(question.id),
    sourceKind: 'open_question',
    sourceLedger: 'open_questions',
    sourceRecordId: normalizeText(question.id),
    title: normalizeText(question.title),
    owner: normalizeText(question.owner) || 'needs-owner-decision',
    state: status === 'resolved' ? 'handled' : 'open',
    reviewState: status || 'open',
    sourceRefs: [normalizeText(question.id)].filter(Boolean),
    staleStatus: 'current',
    nextAction: status === 'resolved'
      ? 'No action required; question is resolved.'
      : 'Answer, assign owner, link evidence, or keep open with an explicit next action.',
  }
}

export function validateReplyWatchingLoopTransition({
  item = {},
  reply = {},
  unsafeFlags = {},
} = {}) {
  const classification = reply.intent ? reply : classifyReplyWatchingLoopReply(reply)
  const failures = []
  const itemId = normalizeText(item.loopItemId || item.reviewItemId || item.id)
  const hasTarget = Boolean(itemId || normalizeText(classification.targetId))
  const hasEvidence = itemEvidenceRefs(item).length > 0 || normalizeArray(item.sourceRefs).length > 0

  if (Object.values(asObject(unsafeFlags)).some(Boolean)) failures.push('external_or_runtime_side_effect_forbidden')
  if (!hasTarget) failures.push('target_item_required')
  if (!hasEvidence) failures.push('owner_evidence_required')
  if (classification.intent === 'ambiguous') failures.push('ambiguous_reply_requires_human_review')
  if (classification.intent === 'resolution' && Number(classification.confidence || 0) < 0.7) failures.push('low_confidence_resolution_requires_review')

  const nextState = failures.length
    ? 'needs_clarification'
    : classification.intent === 'resolution'
      ? 'handled'
      : classification.intent === 'correction'
        ? 'open'
        : classification.intent === 'question'
          ? 'needs_clarification'
          : classification.intent === 'acknowledgment'
            ? 'open'
            : 'open'

  return {
    ok: failures.length === 0,
    failures: Array.from(new Set(failures)),
    classification,
    proposedTransition: {
      itemId,
      nextState,
      writesExternalSystem: false,
      writesSecondQueue: false,
      destinationLedger: 'existing_foundation_ledger',
    },
  }
}

export function buildReplyWatchingLoopSnapshot({
  actionRouteReviewInbox = {},
  openQuestions = [],
  tableNames = [],
  generatedAt = new Date().toISOString(),
} = {}) {
  const reviewItems = Array.isArray(actionRouteReviewInbox.reviewItems) ? actionRouteReviewInbox.reviewItems : []
  const loopItems = [
    ...reviewItems.map(buildLoopItemFromReviewItem),
    ...(Array.isArray(openQuestions) ? openQuestions : []).map(buildLoopItemFromQuestion),
  ].filter(item => item.loopItemId)
  const forbiddenTablesPresent = REPLY_WATCHING_LOOP_FORBIDDEN_SECOND_QUEUE_TABLES
    .filter(table => normalizeArray(tableNames).includes(table))
  const unresolved = loopItems.filter(item => ['open', 'needs_clarification'].includes(item.state))
  const handled = loopItems.filter(item => item.state === 'handled')
  const snoozed = loopItems.filter(item => item.state === 'snoozed')
  const rejected = loopItems.filter(item => item.state === 'rejected')
  const missingOwnerOrEvidence = loopItems.filter(item =>
    !normalizeText(item.owner) ||
    normalizeText(item.owner) === 'needs-owner-decision' && item.sourceRefs.length < 1 ||
    item.sourceRefs.length < 1
  )
  const findings = []
  if (forbiddenTablesPresent.length) findings.push({
    key: 'second_private_queue_present',
    detail: forbiddenTablesPresent.join(', '),
  })
  if (!actionRouteReviewInbox?.source?.readModel) findings.push({
    key: 'action_route_review_inbox_required',
    detail: 'Reply/watching loop must reuse Action Route Review Inbox instead of creating a second queue.',
  })
  if (missingOwnerOrEvidence.length) findings.push({
    key: 'loop_items_need_owner_evidence',
    detail: `${missingOwnerOrEvidence.length} item(s) lack owner/evidence.`,
  })
  return {
    ok: findings.length === 0,
    status: findings.length ? 'risk' : 'healthy',
    contractVersion: 'reply-watching-loop.v1',
    cardId: REPLY_WATCHING_LOOP_CARD_ID,
    generatedAt,
    source: {
      oldSystemPattern: 'Reply Parser + watching_items',
      replacementPattern: 'existing Action Route Review Inbox + decisions/open_questions/backlog_items + promotion workflow',
      allowedLedgers: REPLY_WATCHING_LOOP_ALLOWED_LEDGERS,
      forbiddenSecondQueueTables: REPLY_WATCHING_LOOP_FORBIDDEN_SECOND_QUEUE_TABLES,
      oldReplyParserPatternsPromoted: OLD_REPLY_PARSER_PATTERNS_PROMOTED,
    },
    summary: {
      totalLoopItems: loopItems.length,
      reviewInboxItems: reviewItems.length,
      openQuestionItems: Array.isArray(openQuestions) ? openQuestions.length : 0,
      unresolvedCount: unresolved.length,
      handledCount: handled.length,
      snoozedCount: snoozed.length,
      rejectedCount: rejected.length,
      forbiddenSecondQueueCount: forbiddenTablesPresent.length,
      missingOwnerOrEvidenceCount: missingOwnerOrEvidence.length,
    },
    states: {
      open: unresolved.filter(item => item.state === 'open').length,
      needsClarification: unresolved.filter(item => item.state === 'needs_clarification').length,
      handled: handled.length,
      snoozed: snoozed.length,
      rejected: rejected.length,
    },
    boundaries: {
      noExternalWrites: true,
      noSecondQueue: forbiddenTablesPresent.length === 0,
      noAutoCloseAmbiguous: true,
      existingLedgersOnly: true,
      readOnlySnapshot: true,
    },
    loopItems,
    findings,
  }
}

export function buildReplyWatchingLoopDogfoodProof() {
  const goodReviewItem = {
    reviewItemId: 'route:action-route:good',
    sourceKind: 'intelligence_action_route',
    routeId: 'action-route:good',
    destinationTable: 'backlog_items',
    title: 'Good item',
    owner: 'Foundation Builder',
    reviewState: 'needs_review',
    sourceRefs: ['SRC-GMAIL-001'],
    evidence: { factRefs: ['fact:1'] },
  }
  const healthy = buildReplyWatchingLoopSnapshot({
    actionRouteReviewInbox: {
      source: { readModel: 'proposal-only action-route review inbox' },
      reviewItems: [goodReviewItem],
    },
    openQuestions: [{ id: 'Q-GOOD', title: 'Good question', status: 'open', owner: 'Steve' }],
    tableNames: ['intelligence_action_routes', 'open_questions', 'backlog_items'],
  })
  const secondQueue = buildReplyWatchingLoopSnapshot({
    actionRouteReviewInbox: {
      source: { readModel: 'proposal-only action-route review inbox' },
      reviewItems: [goodReviewItem],
    },
    tableNames: ['watching_items'],
  })
  const missingEvidence = buildReplyWatchingLoopSnapshot({
    actionRouteReviewInbox: {
      source: { readModel: 'proposal-only action-route review inbox' },
      reviewItems: [{ reviewItemId: 'route:bad', owner: '', title: 'Bad', reviewState: 'needs_review' }],
    },
    tableNames: [],
  })
  const ambiguousTransition = validateReplyWatchingLoopTransition({
    item: goodReviewItem,
    reply: { text: 'maybe check this later', targetId: 'route:action-route:good' },
  })
  const lowConfidenceResolution = validateReplyWatchingLoopTransition({
    item: goodReviewItem,
    reply: { intent: 'resolution', confidence: 0.4, targetId: 'route:action-route:good' },
  })
  const unsafeTransition = validateReplyWatchingLoopTransition({
    item: goodReviewItem,
    reply: { text: 'done', targetId: 'route:action-route:good' },
    unsafeFlags: { externalWrite: true },
  })
  const ok =
    healthy.ok === true &&
    secondQueue.ok === false &&
    missingEvidence.ok === false &&
    ambiguousTransition.ok === false &&
    lowConfidenceResolution.ok === false &&
    unsafeTransition.ok === false
  return {
    ok,
    healthy,
    rejected: {
      secondQueue,
      missingEvidence,
      ambiguousTransition,
      lowConfidenceResolution,
      unsafeTransition,
    },
    dogfoodInvariant: ok
      ? 'Reply/watching loop reuses governed ledgers, rejects second private queues, requires owner/evidence, blocks ambiguous or low-confidence auto-close, and forbids external/runtime side effects.'
      : 'Reply/watching loop dogfood failed to reject an old-system failure mode.',
  }
}
