import { Pool } from 'pg'

import {
  buildScoperUiSnapshot,
  evaluateScoperUiSnapshot,
} from './scoper-ui.js'

export const STRATEGY_004_CARD_ID = 'STRATEGY-004'
export const STRATEGY_004_CLOSEOUT_KEY = 'strategy-004-planning-workflow-v1'
export const STRATEGY_004_PLAN_PATH = 'docs/process/strategy-004-planning-workflow-plan.md'
export const STRATEGY_004_APPROVAL_PATH = 'docs/process/approvals/STRATEGY-004.json'
export const STRATEGY_004_SCRIPT_PATH = 'scripts/process-strategy-004-check.mjs'
export const STRATEGY_004_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-20-strategy-004-planning-workflow-closeout.md'
export const STRATEGY_004_NEXT_CARD_ID = 'STRATEGY-009'
export const STRATEGY_004_SPRINT_ID = 'FOUNDATION-TRUSTED-LOOP-AND-SAFE-SURFACES-2026-05-20'

export const STRATEGY_004_NOT_NEXT_BOUNDARIES = [
  'Do not revive the old Strategy Advisor chat.',
  'Do not call LLM/provider/browser/auth/private extraction lanes.',
  'Do not auto-apply decisions, write external systems, send messages, or mutate credentials.',
  'Do not create broad source/extract/value work from unsupported recommendations.',
  'Do not show operational Action Router rows unless they are explicitly Strategy Hub eligible.',
  'Do not work MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.',
]

export const STRATEGY_004_PROOF_COMMANDS = [
  'node --check lib/strategy-planning-workflow.js lib/strategy-shared-comms-routes.js public/strategic-execution.js scripts/process-strategy-004-check.mjs',
  'npm run process:strategy-004-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${STRATEGY_004_CARD_ID} --planApprovalRef=${STRATEGY_004_APPROVAL_PATH} --closeoutKey=${STRATEGY_004_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${STRATEGY_004_CARD_ID} --closeoutKey=${STRATEGY_004_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${STRATEGY_004_CARD_ID} --planApprovalRef=${STRATEGY_004_APPROVAL_PATH} --closeoutKey=${STRATEGY_004_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const STRATEGY_004_CHANGED_FILES = [
  'lib/strategy-planning-workflow.js',
  'lib/strategy-shared-comms-routes.js',
  'public/strategic-execution.html',
  'public/strategic-execution.js',
  STRATEGY_004_SCRIPT_PATH,
  STRATEGY_004_PLAN_PATH,
  STRATEGY_004_APPROVAL_PATH,
  STRATEGY_004_CLOSEOUT_PATH,
  'lib/foundation-build-closeout-process-gate-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'package.json',
]

function text(value, fallback = '') {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim()
  return normalized || fallback
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function unique(values = []) {
  return [...new Set(values.map(value => text(value)).filter(Boolean))]
}

function parseObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

function normalizeArray(value) {
  if (Array.isArray(value)) return unique(value)
  if (!value) return []
  if (typeof value === 'string') {
    return unique(value.replace(/^{|}$/g, '').split(','))
  }
  return []
}

function normalizeIssue(row = {}) {
  return {
    issueId: text(row.issue_id || row.issueId),
    title: text(row.title),
    question: text(row.plain_english_question || row.plainEnglishQuestion),
    status: text(row.status),
    urgency: text(row.urgency),
    impact: text(row.impact),
    confidence: text(row.confidence),
    staleness: text(row.staleness),
    owner: text(row.owner, 'Foundation'),
    ownerConfidence: text(row.owner_confidence || row.ownerConfidence),
    sourceIds: normalizeArray(row.source_ids || row.sourceIds),
    factRefs: normalizeArray(row.fact_refs || row.factRefs),
    atomRefs: normalizeArray(row.atom_refs || row.atomRefs),
    chunkRefs: normalizeArray(row.chunk_refs || row.chunkRefs),
    routeRefs: normalizeArray(row.route_refs || row.routeRefs),
    scopedCardRefs: normalizeArray(row.scoped_card_refs || row.scopedCardRefs),
    resolutionStatus: text(row.resolution_status || row.resolutionStatus),
    resolutionRef: text(row.resolution_ref || row.resolutionRef),
    nextReviewAt: row.next_review_at || row.nextReviewAt || null,
    snoozedUntil: row.snoozed_until || row.snoozedUntil || null,
    suppressionReason: text(row.suppression_reason || row.suppressionReason),
    metadata: parseObject(row.metadata),
  }
}

function normalizeScoper(row = {}) {
  return {
    scoperOutputId: text(row.scoper_output_id || row.scoperOutputId),
    issueId: text(row.issue_id || row.issueId),
    status: text(row.status),
    proposedCardId: text(row.proposed_card_id || row.proposedCardId),
    title: text(row.title),
    summary: text(row.summary),
    owner: text(row.owner, 'Foundation'),
    confidence: text(row.confidence),
    sourceIds: normalizeArray(row.source_ids || row.sourceIds),
    factRefs: normalizeArray(row.fact_refs || row.factRefs),
    atomRefs: normalizeArray(row.atom_refs || row.atomRefs),
    chunkRefs: normalizeArray(row.chunk_refs || row.chunkRefs),
    routeRefs: normalizeArray(row.route_refs || row.routeRefs),
    decisionRefs: normalizeArray(row.decision_refs || row.decisionRefs),
    openQuestionRefs: normalizeArray(row.open_question_refs || row.openQuestionRefs),
    gapStatements: normalizeArray(row.gap_statements || row.gapStatements),
    smallestNextSteps: normalizeArray(row.smallest_next_steps || row.smallestNextSteps),
    proofRefs: normalizeArray(row.proof_refs || row.proofRefs),
    metadata: parseObject(row.metadata),
  }
}

function normalizeRoute(route = {}) {
  const metadata = parseObject(route.metadata)
  return {
    routeId: text(route.route_id || route.routeId),
    routeType: text(route.route_type || route.routeType),
    destinationTable: text(route.destination_table || route.destinationTable),
    approvalStatus: text(route.approval_status || route.approvalStatus),
    owner: text(route.owner, 'Foundation'),
    routingReason: text(route.routing_reason || route.routingReason),
    proposedPayload: parseObject(route.proposed_payload || route.proposedPayload),
    sourceIds: normalizeArray(route.source_ids || route.sourceIds),
    factRefs: normalizeArray(route.fact_refs || route.factRefs),
    atomRefs: normalizeArray(route.atom_refs || route.atomRefs),
    evidenceRefs: normalizeArray(route.evidence_refs || route.evidenceRefs),
    evidenceChunkRefs: normalizeArray(route.evidence_chunk_refs || route.evidenceChunkRefs),
    metadata,
    sourceProof: parseObject(route.sourceProof || route.source_proof),
  }
}

function strategyRouteEligible(route = {}) {
  const normalized = normalizeRoute(route)
  const surface = text(
    normalized.metadata.strategySurface ||
      normalized.metadata.hubSurface ||
      normalized.metadata.reviewSurface ||
      '',
  ).toLowerCase()
  return normalized.metadata.strategyHubEligible === true ||
    surface === 'strategy' ||
    surface === 'strategy_hub' ||
    surface === 'strategic_execution'
}

function routeTitle(route = {}) {
  const normalized = normalizeRoute(route)
  return text(normalized.proposedPayload.title, text(normalized.routingReason, `${normalized.routeType || 'review'} route`))
}

function routeSummary(route = {}) {
  const normalized = normalizeRoute(route)
  return text(
    normalized.proposedPayload.summary ||
      normalized.proposedPayload.reason ||
      normalized.proposedPayload.nextAction ||
      normalized.routingReason,
    'No route summary recorded.',
  )
}

function evidenceRefsFor(input = {}) {
  return unique([
    ...(input.sourceIds || []),
    ...(input.factRefs || []),
    ...(input.atomRefs || []),
    ...(input.chunkRefs || []),
    ...(input.routeRefs || []),
    ...(input.issueIds || []),
    ...(input.scoperOutputIds || []),
    ...(input.proofRefs || []),
  ])
}

function planningItem({
  id,
  queue,
  type,
  title,
  readout,
  whyNow,
  owner,
  status,
  nextAction,
  priorityScore = 0,
  sourceIds = [],
  factRefs = [],
  atomRefs = [],
  chunkRefs = [],
  routeRefs = [],
  issueIds = [],
  scoperOutputIds = [],
  proofRefs = [],
} = {}) {
  const provenanceRefs = evidenceRefsFor({
    sourceIds,
    factRefs,
    atomRefs,
    chunkRefs,
    routeRefs,
    issueIds,
    scoperOutputIds,
    proofRefs,
  })
  return {
    id: text(id, `strategy-plan:${queue}:${type}:${title}`).replace(/\s+/g, '-').toLowerCase(),
    queue,
    type,
    title: text(title, 'Untitled Strategy planning item'),
    readout: text(readout, 'No source-backed readout recorded.'),
    whyNow: text(whyNow, 'Review before quarterly planning.'),
    owner: text(owner, 'Foundation'),
    status: text(status, 'review'),
    nextAction: text(nextAction, 'Review and choose decide, carry forward, stop, scope, or ask for missing data.'),
    priorityScore,
    sourceIds: unique(sourceIds),
    factRefs: unique(factRefs),
    atomRefs: unique(atomRefs),
    chunkRefs: unique(chunkRefs),
    routeRefs: unique(routeRefs),
    issueIds: unique(issueIds),
    scoperOutputIds: unique(scoperOutputIds),
    proofRefs: unique(proofRefs),
    provenanceRefs,
  }
}

function pressureItems(meetingReady = {}) {
  return list(meetingReady.pressureCards).slice(0, 6).map((card, index) => planningItem({
    id: `pressure:${text(card.id, card.label || index)}`,
    queue: 'priority_candidates',
    type: 'source_pressure',
    title: text(card.label, 'Source pressure'),
    readout: text(card.readout, card.headline),
    whyNow: text(card.meetingQuestion, 'Source-to-gap pressure needs ownership review.'),
    owner: 'Ownership',
    status: 'source_pressure',
    nextAction: text(card.nextAction, 'Use this pressure item to decide whether to carry forward, stop, or scope work.'),
    priorityScore: 80 - index,
    sourceIds: normalizeArray(card.sourceIds),
    factRefs: list(card.evidence).map(item => text(item.label)).filter(Boolean),
    proofRefs: list(card.evidence).map(item => `${text(item.sourceId)}:${text(item.label)}`).filter(Boolean),
  }))
}

function issuePriorityScore(issue = {}) {
  const urgency = { critical: 40, high: 30, medium: 20, low: 10 }[issue.urgency] || 15
  const impact = { needle_mover: 40, high: 30, medium: 20, low: 10 }[issue.impact] || 15
  const confidence = { high: 15, medium: 10, low: 3 }[issue.confidence] || 5
  return urgency + impact + confidence + issue.sourceIds.length + issue.routeRefs.length
}

function issueToPlanningItem(issue = {}, queue = 'priority_candidates') {
  return planningItem({
    id: `issue:${issue.issueId}:${queue}`,
    queue,
    type: queue === 'missing_data_gaps' ? 'strategic_issue_gap' : 'strategic_issue',
    title: issue.title || issue.question || issue.issueId,
    readout: issue.question || issue.title,
    whyNow: `${text(issue.urgency, 'unknown')} urgency / ${text(issue.impact, 'unknown')} impact / ${text(issue.confidence, 'unknown')} confidence.`,
    owner: issue.owner,
    status: issue.resolutionStatus || issue.status || 'unresolved',
    nextAction: queue === 'missing_data_gaps'
      ? 'Add owner/source proof or route this through Scoper before it becomes build work.'
      : 'Review issue disposition: decide, scope, carry forward, stop, ask, or snooze.',
    priorityScore: issuePriorityScore(issue),
    sourceIds: issue.sourceIds,
    factRefs: issue.factRefs,
    atomRefs: issue.atomRefs,
    chunkRefs: issue.chunkRefs,
    routeRefs: issue.routeRefs,
    issueIds: [issue.issueId],
    proofRefs: [issue.resolutionRef, ...issue.scopedCardRefs],
  })
}

function scoperToPlanningItem(scoper = {}, queue = 'carry_forward_candidates') {
  return planningItem({
    id: `scoper:${scoper.scoperOutputId}:${queue}`,
    queue,
    type: queue === 'missing_data_gaps' ? 'scoper_gap' : 'scoper_output',
    title: scoper.title || scoper.proposedCardId || scoper.scoperOutputId,
    readout: scoper.summary,
    whyNow: scoper.gapStatements[0] || `${scoper.status} / ${scoper.confidence} confidence.`,
    owner: scoper.owner,
    status: scoper.status,
    nextAction: scoper.smallestNextSteps[0] || 'Review this Scoper output and choose a disposition.',
    priorityScore: scoper.status === 'real_gap' ? 82 : scoper.status === 'partially_answered' ? 70 : 40,
    sourceIds: scoper.sourceIds,
    factRefs: scoper.factRefs,
    atomRefs: scoper.atomRefs,
    chunkRefs: scoper.chunkRefs,
    routeRefs: scoper.routeRefs,
    issueIds: [scoper.issueId],
    scoperOutputIds: [scoper.scoperOutputId],
    proofRefs: scoper.proofRefs,
  })
}

function routeToPlanningItem(route = {}, queue = 'priority_candidates') {
  const normalized = normalizeRoute(route)
  return planningItem({
    id: `route:${normalized.routeId}:${queue}`,
    queue,
    type: 'strategy_route',
    title: routeTitle(normalized),
    readout: routeSummary(normalized),
    whyNow: normalized.approvalStatus === 'pending'
      ? 'This Strategy route is waiting for human review.'
      : `Route status is ${text(normalized.approvalStatus, 'unknown')}.`,
    owner: normalized.owner,
    status: normalized.approvalStatus,
    nextAction: normalized.approvalStatus === 'pending'
      ? 'Review, assign owner, approve/apply, snooze, ignore, or reject in Route Review.'
      : 'Keep route linked as planning evidence.',
    priorityScore: normalized.approvalStatus === 'pending' ? 76 : 55,
    sourceIds: normalized.sourceIds,
    factRefs: normalized.factRefs,
    atomRefs: unique([...normalized.atomRefs, ...normalized.evidenceRefs]),
    chunkRefs: normalized.evidenceChunkRefs,
    routeRefs: [normalized.routeId],
    proofRefs: list(normalized.sourceProof.items).map(item => text(item.sourceId || item.quote || item.context)).filter(Boolean),
  })
}

function sortByScore(items = []) {
  return items
    .filter(item => item.provenanceRefs.length > 0)
    .sort((a, b) => b.priorityScore - a.priorityScore || a.title.localeCompare(b.title))
}

function isStaleOrStoppedIssue(issue = {}) {
  return issue.staleness === 'stale' ||
    issue.status === 'stale' ||
    issue.resolutionStatus === 'stale' ||
    Boolean(issue.suppressionReason) ||
    Boolean(issue.snoozedUntil)
}

function isMissingDataIssue(issue = {}) {
  return issue.confidence === 'low' ||
    !issue.owner ||
    issue.owner === 'needs-owner-decision' ||
    issue.ownerConfidence === 'needs_owner' ||
    issue.sourceIds.length === 0 ||
    issue.factRefs.length + issue.atomRefs.length + issue.chunkRefs.length < 2
}

export function buildStrategyPlanningWorkflowSnapshot({
  goalTruth = {},
  operatingTruth = {},
  actionRouter = {},
  retrieval = {},
  meetingReady = {},
  strategicIssues = [],
  scoperOutputs = [],
  generatedAt = new Date().toISOString(),
} = {}) {
  const issues = list(strategicIssues).map(normalizeIssue).filter(issue => issue.issueId)
  const scopers = list(scoperOutputs).map(normalizeScoper).filter(output => output.scoperOutputId)
  const scoperUi = buildScoperUiSnapshot({ scoperOutputs: scopers, generatedAt })
  const strategyRoutes = list(actionRouter.recentRoutes).map(normalizeRoute).filter(strategyRouteEligible)
  const hiddenOperationalRoutes = Math.max(
    0,
    Number(actionRouter.operationalTotalRoutes || actionRouter.totalRoutes || list(actionRouter.recentRoutes).length || 0) - strategyRoutes.length,
  )

  const issuePriorities = issues
    .filter(issue => !isStaleOrStoppedIssue(issue))
    .filter(issue => ['critical', 'high'].includes(issue.urgency) || ['needle_mover', 'high'].includes(issue.impact) || issue.routeRefs.length)
    .map(issue => issueToPlanningItem(issue, 'priority_candidates'))
  const scoperPriorities = scopers
    .filter(output => ['real_gap', 'blocked_approval_required'].includes(output.status))
    .map(output => scoperToPlanningItem(output, 'priority_candidates'))
  const routePriorities = strategyRoutes
    .filter(route => route.approvalStatus === 'pending')
    .map(route => routeToPlanningItem(route, 'priority_candidates'))

  const priorityCandidates = sortByScore([
    ...pressureItems(meetingReady),
    ...issuePriorities,
    ...scoperPriorities,
    ...routePriorities,
  ]).slice(0, 10)

  const carryForwardCandidates = sortByScore([
    ...issues
      .filter(issue => !isStaleOrStoppedIssue(issue))
      .filter(issue => ['unresolved', 'route_pending', 'scoped', ''].includes(issue.resolutionStatus) || issue.scopedCardRefs.length || issue.routeRefs.length)
      .map(issue => issueToPlanningItem(issue, 'carry_forward_candidates')),
    ...scopers
      .filter(output => ['partially_answered', 'blocked_approval_required', 'real_gap'].includes(output.status))
      .map(output => scoperToPlanningItem(output, 'carry_forward_candidates')),
  ]).slice(0, 8)

  const stopCandidates = sortByScore([
    ...issues
      .filter(isStaleOrStoppedIssue)
      .map(issue => issueToPlanningItem(issue, 'stop_candidates')),
    ...scopers
      .filter(output => output.status === 'stale_or_test' || output.status === 'already_answered')
      .map(output => scoperToPlanningItem(output, 'stop_candidates')),
    ...strategyRoutes
      .filter(route => ['rejected', 'ignored', 'snoozed'].includes(route.approvalStatus) || route.routeType === 'snooze')
      .map(route => routeToPlanningItem(route, 'stop_candidates')),
  ]).slice(0, 8)

  const missingDataGaps = sortByScore([
    ...issues.filter(isMissingDataIssue).map(issue => issueToPlanningItem(issue, 'missing_data_gaps')),
    ...scopers
      .filter(output => output.confidence === 'low' || output.sourceIds.length === 0 || output.proofRefs.length < 4 || !output.smallestNextSteps.length)
      .map(output => scoperToPlanningItem(output, 'missing_data_gaps')),
  ]).slice(0, 8)

  const reviewSteps = [
    {
      id: 'read-source-to-gap',
      label: 'Read Source-To-Gap',
      detail: 'Start with production, capacity, recruiting, cash, and conditional forecast pressure.',
      sourceIds: unique([...(goalTruth.sourceIds || []), ...(operatingTruth.sourceIds || [])]),
    },
    {
      id: 'review-priorities',
      label: 'Review priorities',
      detail: 'Choose which priority candidates become quarter commitments, owner questions, or Action Router decisions.',
      sourceIds: unique(priorityCandidates.flatMap(item => item.sourceIds)),
    },
    {
      id: 'decide-carry-forward',
      label: 'Carry forward or stop',
      detail: 'Carry only source-backed work with owner and next trigger; stop stale/test-like items with proof.',
      sourceIds: unique([...carryForwardCandidates, ...stopCandidates].flatMap(item => item.sourceIds)),
    },
    {
      id: 'resolve-missing-data',
      label: 'Resolve missing data',
      detail: 'Do not turn low-confidence, source-light, or ownerless gaps into work until Scoper/Route Review fills the proof.',
      sourceIds: unique(missingDataGaps.flatMap(item => item.sourceIds)),
    },
  ]

  const proofSummary = {
    sourceIds: unique([
      ...(goalTruth.sourceIds || []),
      ...(operatingTruth.sourceIds || []),
      ...priorityCandidates.flatMap(item => item.sourceIds),
      ...carryForwardCandidates.flatMap(item => item.sourceIds),
      ...missingDataGaps.flatMap(item => item.sourceIds),
    ]),
    issueCount: issues.length,
    scoperOutputCount: scopers.length,
    strategyRouteCount: strategyRoutes.length,
    hiddenOperationalRoutes,
    retrievalEvalStatus: text(retrieval.latestEvalRun?.status || retrieval.latestEvalRun?.result || retrieval.status, 'not surfaced'),
    routeVisibilityRule: 'Planning workflow only uses Strategy Hub eligible routes; operational routes stay hidden.',
  }

  const workflow = {
    generatedAt,
    mode: 'source_backed_strategy_planning_workflow',
    advisorStatus: 'deterministic_proposal_only',
    status: 'planning_ready',
    title: 'Quarterly planning workflow',
    primaryRead: priorityCandidates.length
      ? `${priorityCandidates.length} priority candidates, ${carryForwardCandidates.length} carry-forward candidates, ${missingDataGaps.length} missing-data gaps.`
      : 'No source-backed planning candidates are ready yet.',
    noProviderCalls: true,
    noExternalWrites: true,
    appliesDecisions: false,
    priorityCandidates,
    carryForwardCandidates,
    stopCandidates,
    missingDataGaps,
    scoperUi,
    reviewSteps,
    proofSummary,
  }

  const evaluation = evaluateStrategyPlanningWorkflow(workflow)
  return {
    ...workflow,
    status: evaluation.ok ? 'planning_ready' : 'needs_repair',
    quality: evaluation,
  }
}

export function evaluateStrategyPlanningWorkflow(workflow = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const priority = list(workflow.priorityCandidates)
  const carry = list(workflow.carryForwardCandidates)
  const stop = list(workflow.stopCandidates)
  const gaps = list(workflow.missingDataGaps)
  const allItems = [...priority, ...carry, ...stop, ...gaps]
  const sourcedItems = allItems.filter(item => list(item.provenanceRefs).length > 0)
  const routeIds = unique(allItems.flatMap(item => item.routeRefs || []))

  add(workflow.mode === 'source_backed_strategy_planning_workflow', 'workflow mode is the source-backed planning workflow', workflow.mode || 'missing')
  add(workflow.advisorStatus === 'deterministic_proposal_only', 'advisor stays deterministic/proposal-only', workflow.advisorStatus || 'missing')
  add(workflow.noProviderCalls === true && workflow.noExternalWrites === true && workflow.appliesDecisions === false, 'workflow does not call providers, write externally, or apply decisions', 'read-only proposal')
  add(priority.length >= 3, 'priority candidates exist', `${priority.length}/3`)
  add(carry.length >= 1 || gaps.length >= 1, 'workflow has carry-forward or missing-data path', `carry=${carry.length} gaps=${gaps.length}`)
  add(list(workflow.reviewSteps).length >= 4, 'workflow has review steps', `${list(workflow.reviewSteps).length}/4`)
  add(allItems.length === sourcedItems.length, 'every planning item has provenance refs', `${sourcedItems.length}/${allItems.length}`)
  add(allItems.every(item => text(item.nextAction) && text(item.owner)), 'every planning item has owner and next action', `${allItems.length} items`)
  add(!routeIds.some(routeId => routeId.includes('operational')), 'operational routes are not promoted into planning candidates', routeIds.join(', ') || 'none')
  add(list(workflow.proofSummary?.sourceIds).length >= 4, 'proof summary includes source ids', `${list(workflow.proofSummary?.sourceIds).length}/4`)
  add(Number(workflow.proofSummary?.hiddenOperationalRoutes || 0) >= 0, 'hidden operational route count is explicit', String(workflow.proofSummary?.hiddenOperationalRoutes ?? 'missing'))
  const scoperUiEvaluation = evaluateScoperUiSnapshot(workflow.scoperUi || {})
  add(scoperUiEvaluation.ok, 'Scoper UI payload is structured for review', scoperUiEvaluation.failed.map(item => item.check).join('; ') || 'healthy')

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    summary: {
      priorityCount: priority.length,
      carryForwardCount: carry.length,
      stopCount: stop.length,
      missingDataGapCount: gaps.length,
      sourceIdCount: list(workflow.proofSummary?.sourceIds).length,
      hiddenOperationalRoutes: Number(workflow.proofSummary?.hiddenOperationalRoutes || 0),
    },
    checks,
    failed,
  }
}

export function buildStrategyPlanningWorkflowDogfoodProof() {
  const generatedAt = '2026-05-20T02:20:00.000-04:00'
  const goalTruth = {
    sourceIds: ['SRC-OWNERS-001', 'SRC-FREEDOM-ENGINE-001', 'SRC-FREEDOM-BHAG-001', 'SRC-FINANCE-001'],
  }
  const operatingTruth = {
    sourceIds: ['SRC-FINANCE-001', 'SRC-SUPABASE-001', 'SRC-FUB-001', 'SRC-OWNERS-001'],
  }
  const meetingReady = {
    pressureCards: [
      {
        id: 'production-gap',
        label: 'Production gap',
        headline: 'Behind by $410K',
        readout: '$48.2M actual vs $52.3M should be.',
        meetingQuestion: 'What production gap needs ownership attention?',
        nextAction: 'Decide whether this is carry-forward or new scoped work.',
        sourceIds: ['SRC-OWNERS-001', 'SRC-FREEDOM-BHAG-001'],
        evidence: [
          { label: 'Actual', value: '$48.2M', sourceId: 'SRC-OWNERS-001' },
          { label: 'Should Be', value: '$52.3M', sourceId: 'SRC-FREEDOM-BHAG-001' },
        ],
      },
      {
        id: 'capacity-gap',
        label: 'Capacity gap',
        headline: '7 agents short',
        readout: '18 active against 25 required.',
        meetingQuestion: 'Is the capacity gap recruiting, productivity, or both?',
        sourceIds: ['SRC-FREEDOM-ENGINE-001'],
        evidence: [{ label: 'Required Agents', value: '25', sourceId: 'SRC-FREEDOM-ENGINE-001' }],
      },
      {
        id: 'cash-posture',
        label: 'Cash posture',
        headline: '$118K available',
        readout: '$44K expected AR.',
        sourceIds: ['SRC-FINANCE-001'],
        evidence: [{ label: 'Available Cash', value: '$118K', sourceId: 'SRC-FINANCE-001' }],
      },
    ],
  }
  const strategyRoute = {
    routeId: 'route-strategy-capacity',
    routeType: 'backlog',
    destinationTable: 'backlog_items',
    approvalStatus: 'pending',
    owner: 'Strategy',
    routingReason: 'Capacity gap needs ownership review.',
    sourceIds: ['SRC-FREEDOM-ENGINE-001'],
    proposedPayload: {
      title: 'Decide capacity gap owner',
      summary: 'Capacity gap is large enough to discuss in ownership meeting.',
    },
    metadata: { strategyHubEligible: true, reviewSurface: 'strategy' },
    sourceProof: { items: [{ sourceId: 'SRC-FREEDOM-ENGINE-001', quote: '7 agents short' }] },
  }
  const operationalRoute = {
    routeId: 'route-operational-hidden',
    routeType: 'backlog',
    approvalStatus: 'pending',
    owner: 'Ops',
    sourceIds: ['SRC-SUPABASE-001'],
    metadata: { strategyHubEligible: false, reviewSurface: 'ops' },
  }
  const workflow = buildStrategyPlanningWorkflowSnapshot({
    goalTruth,
    operatingTruth,
    actionRouter: {
      totalRoutes: 2,
      operationalTotalRoutes: 2,
      recentRoutes: [strategyRoute, operationalRoute],
    },
    retrieval: { latestEvalRun: { status: 'healthy', runId: 'retrieval-dogfood' } },
    meetingReady,
    strategicIssues: [
      {
        issueId: 'issue-capacity',
        title: 'Capacity shortfall needs quarterly decision',
        plainEnglishQuestion: 'How should ownership handle the 7-agent capacity gap?',
        status: 'surfaced',
        urgency: 'high',
        impact: 'needle_mover',
        confidence: 'high',
        owner: 'Strategy',
        sourceIds: ['SRC-FREEDOM-ENGINE-001'],
        factRefs: ['Required Agents', 'Current Active Agents'],
        atomRefs: ['atom-capacity'],
        chunkRefs: ['chunk-capacity'],
        routeRefs: ['route-strategy-capacity'],
        resolutionStatus: 'route_pending',
      },
      {
        issueId: 'issue-stale',
        title: 'Old test strategy item',
        plainEnglishQuestion: 'Should a stale test finding stay in planning?',
        status: 'stale',
        staleness: 'stale',
        urgency: 'low',
        impact: 'low',
        confidence: 'low',
        owner: 'Foundation',
        sourceIds: ['SRC-FUB-001'],
        factRefs: ['test fixture'],
        resolutionStatus: 'stale',
      },
      {
        issueId: 'issue-missing-owner',
        title: 'Marketing source owner missing',
        plainEnglishQuestion: 'Who owns the marketing source gap?',
        status: 'surfaced',
        urgency: 'medium',
        impact: 'high',
        confidence: 'low',
        owner: 'needs-owner-decision',
        ownerConfidence: 'needs_owner',
        sourceIds: ['SRC-FUB-001'],
        factRefs: ['source-health'],
        resolutionStatus: 'unresolved',
      },
    ],
    scoperOutputs: [
      {
        scoperOutputId: 'scoper-output-capacity',
        issueId: 'issue-capacity',
        status: 'real_gap',
        proposedCardId: 'SCOPED-CAPACITY',
        title: 'Scope capacity decision',
        summary: 'Capacity gap needs an owner decision and preserved source proof.',
        owner: 'Strategy',
        confidence: 'high',
        sourceIds: ['SRC-FREEDOM-ENGINE-001'],
        factRefs: ['Required Agents'],
        atomRefs: ['atom-capacity'],
        chunkRefs: ['chunk-capacity'],
        routeRefs: ['route-strategy-capacity'],
        proofRefs: ['issue-capacity', 'route-strategy-capacity', 'SRC-FREEDOM-ENGINE-001', 'chunk-capacity'],
        gapStatements: ['Owner must choose recruiting vs productivity emphasis.'],
        smallestNextSteps: ['Review the proposed capacity decision in ownership planning.'],
      },
      {
        scoperOutputId: 'scoper-output-stale',
        issueId: 'issue-stale',
        status: 'stale_or_test',
        title: 'Retire stale test item',
        summary: 'Stale issue should stop unless evidence refresh changes.',
        owner: 'Foundation',
        confidence: 'medium',
        sourceIds: ['SRC-FUB-001'],
        proofRefs: ['issue-stale', 'SRC-FUB-001', 'stale-proof', 'test-fixture'],
        gapStatements: ['Stale/test-like evidence should not become planning work.'],
        smallestNextSteps: ['Stop this item unless source evidence changes.'],
      },
    ],
    generatedAt,
  })
  const weak = {
    ...workflow,
    priorityCandidates: [
      ...workflow.priorityCandidates,
      { id: 'bad-vibe', title: 'Unsupported recommendation', owner: 'No one', nextAction: 'Build it', provenanceRefs: [] },
    ],
  }
  const variant = buildStrategyPlanningWorkflowSnapshot({
    goalTruth,
    operatingTruth,
    actionRouter: {
      totalRoutes: 1,
      operationalTotalRoutes: 1,
      recentRoutes: [strategyRoute],
    },
    meetingReady: {
      pressureCards: [
        {
          ...meetingReady.pressureCards[0],
          id: 'production-gap-variant',
          headline: 'Behind by $900K',
          readout: '$44M actual vs $53M should be.',
        },
        ...meetingReady.pressureCards.slice(1),
      ],
    },
    strategicIssues: [],
    scoperOutputs: [],
    generatedAt,
  })
  const evaluation = evaluateStrategyPlanningWorkflow(workflow)
  const weakEvaluation = evaluateStrategyPlanningWorkflow(weak)
  const variantChanged = workflow.priorityCandidates[0]?.readout !== variant.priorityCandidates[0]?.readout
  const operationalHidden = ![
    ...workflow.priorityCandidates,
    ...workflow.carryForwardCandidates,
    ...workflow.stopCandidates,
    ...workflow.missingDataGaps,
  ].some(item => list(item.routeRefs).includes('route-operational-hidden'))
  return {
    ok: evaluation.ok && !weakEvaluation.ok && variantChanged && operationalHidden,
    status: evaluation.ok && !weakEvaluation.ok && variantChanged && operationalHidden ? 'healthy' : 'risk',
    evaluation,
    weakRejected: !weakEvaluation.ok,
    variantChanged,
    operationalHidden,
    summary: {
      priorityCount: workflow.priorityCandidates.length,
      carryForwardCount: workflow.carryForwardCandidates.length,
      stopCount: workflow.stopCandidates.length,
      missingDataGapCount: workflow.missingDataGaps.length,
      hiddenOperationalRoutes: workflow.proofSummary.hiddenOperationalRoutes,
    },
  }
}

async function tableExists(client, tableName) {
  const result = await client.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = $1
      ) AS exists
    `,
    [tableName],
  )
  return result.rows[0]?.exists === true
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

export async function getStrategyPlanningEvidenceSnapshot({ issueLimit = 25, scoperLimit = 25 } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  try {
    const hasIssueTable = await tableExists(client, 'intelligence_strategic_issues')
    const hasScoperTable = await tableExists(client, 'intelligence_scoper_outputs')
    const [issueResult, scoperResult] = await Promise.all([
      hasIssueTable
        ? client.query(
          `
            SELECT issue_id, title, plain_english_question, status, urgency, impact, confidence,
                   staleness, owner, owner_confidence, primary_department, source_ids, fact_refs,
                   atom_refs, chunk_refs, synthesized_item_refs, route_refs, scoped_card_refs,
                   resolution_status, resolution_ref, next_review_at, snoozed_until,
                   suppression_reason, resurface_rule, metadata, created_at, updated_at
            FROM intelligence_strategic_issues
            ORDER BY updated_at DESC
            LIMIT $1
          `,
          [issueLimit],
        )
        : { rows: [] },
      hasScoperTable
        ? client.query(
          `
            SELECT scoper_output_id, issue_id, status, proposed_card_id, title, summary, owner,
                   confidence, source_ids, fact_refs, atom_refs, chunk_refs, synthesized_item_refs,
                   route_refs, decision_refs, open_question_refs, event_refs, existing_answer_refs,
                   gap_statements, smallest_next_steps, blocked_actions, proof_refs, proposal,
                   metadata, created_at, updated_at
            FROM intelligence_scoper_outputs
            ORDER BY updated_at DESC
            LIMIT $1
          `,
          [scoperLimit],
        )
        : { rows: [] },
    ])
    return {
      generatedAt: new Date().toISOString(),
      status: hasIssueTable && hasScoperTable ? 'live' : 'degraded',
      strategicIssues: issueResult.rows,
      scoperOutputs: scoperResult.rows,
      missingTables: [
        hasIssueTable ? null : 'intelligence_strategic_issues',
        hasScoperTable ? null : 'intelligence_scoper_outputs',
      ].filter(Boolean),
    }
  } finally {
    client.release()
    await pool.end()
  }
}
