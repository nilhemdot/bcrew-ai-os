import crypto from 'node:crypto'

export const DECISION_008_CARD_ID = 'DECISION-008'
export const DECISION_008_CLOSEOUT_KEY = 'decision-008-accountability-doctrine-v1'
export const DECISION_008_PLAN_PATH = 'docs/process/decision-008-plan.md'
export const DECISION_008_APPROVAL_PATH = 'docs/process/approvals/DECISION-008.json'
export const DECISION_008_SCRIPT_PATH = 'scripts/process-decision-008-check.mjs'
export const DECISION_008_CLOSEOUT_PATH = 'docs/handoffs/2026-05-19-decision-008-accountability-doctrine-closeout.md'
export const DECISION_008_NEXT_CARD_ID = 'INTEL-SCOPER-001'
export const DECISION_008_SPRINT_ID = 'FOUNDATION-AUDIT-CONTROL-AND-INTEL-2026-05-19'

export const DECISION_008_PROOF_COMMANDS = [
  'node --check lib/decision-008-accountability-doctrine.js scripts/process-decision-008-check.mjs',
  'npm run process:decision-008-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${DECISION_008_CARD_ID} --planApprovalRef=${DECISION_008_APPROVAL_PATH} --closeoutKey=${DECISION_008_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${DECISION_008_CARD_ID} --closeoutKey=${DECISION_008_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${DECISION_008_CARD_ID} --planApprovalRef=${DECISION_008_APPROVAL_PATH} --closeoutKey=${DECISION_008_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const DECISION_008_CHANGED_FILES = [
  'lib/decision-008-accountability-doctrine.js',
  DECISION_008_SCRIPT_PATH,
  DECISION_008_PLAN_PATH,
  DECISION_008_APPROVAL_PATH,
  DECISION_008_CLOSEOUT_PATH,
  'lib/foundation-build-closeout-process-gate-records.js',
  'package.json',
]

export const DECISION_008_NOT_NEXT_BOUNDARIES = [
  'Do not lock or apply decisions without explicit human approval.',
  'Do not create external tasks, sends, messages, Drive permission changes, provider calls, credential mutations, or browser/source extraction.',
  'Do not build INTEL-SCOPER-001 inside this card.',
  'Do not build a new Strategy Hub UI surface inside this card.',
  'Do not bypass intelligence_strategic_issues, route refs, source refs, or resolution feedback.',
  'Do not treat an open proposed decision as resolved doctrine.',
]

function stableHash(value = '') {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex')
}

function normalizeText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function truncate(value = '', max = 160) {
  const text = normalizeText(value)
  if (text.length <= max) return text
  return `${text.slice(0, Math.max(0, max - 3))}...`
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.map(item => normalizeText(item)).filter(Boolean)
  if (!value) return []
  if (typeof value === 'string') {
    return value
      .replace(/^{|}$/g, '')
      .split(',')
      .map(item => normalizeText(item))
      .filter(Boolean)
  }
  return []
}

function unique(values = []) {
  return Array.from(new Set(normalizeArray(values)))
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

function normalizeIssue(row = {}) {
  const metadata = parseObject(row.metadata)
  return {
    issueId: normalizeText(row.issue_id || row.issueId),
    title: normalizeText(row.title),
    plainEnglishQuestion: normalizeText(row.plain_english_question || row.plainEnglishQuestion),
    status: normalizeText(row.status),
    resolutionStatus: normalizeText(row.resolution_status || row.resolutionStatus),
    resolutionRef: normalizeText(row.resolution_ref || row.resolutionRef),
    owner: normalizeText(row.owner),
    ownerConfidence: normalizeText(row.owner_confidence || row.ownerConfidence),
    primaryDepartment: normalizeText(row.primary_department || row.primaryDepartment),
    sourceIds: unique(row.source_ids || row.sourceIds),
    factRefs: unique(row.fact_refs || row.factRefs),
    atomRefs: unique(row.atom_refs || row.atomRefs),
    chunkRefs: unique(row.chunk_refs || row.chunkRefs),
    synthesizedItemRefs: unique(row.synthesized_item_refs || row.synthesizedItemRefs),
    routeRefs: unique(row.route_refs || row.routeRefs),
    scopedCardRefs: unique(row.scoped_card_refs || row.scopedCardRefs),
    metadata,
  }
}

function normalizeRoute(row = {}) {
  const metadata = parseObject(row.metadata)
  return {
    routeId: normalizeText(row.route_id || row.routeId),
    synthesizedItemId: normalizeText(row.synthesized_item_id || row.synthesizedItemId),
    routeType: normalizeText(row.route_type || row.routeType),
    destinationTable: normalizeText(row.destination_table || row.destinationTable),
    approvalStatus: normalizeText(row.approval_status || row.approvalStatus),
    owner: normalizeText(row.owner),
    ownerConfidence: normalizeText(row.owner_confidence || row.ownerConfidence),
    sourceIds: unique(row.source_ids || row.sourceIds),
    factRefs: unique(row.fact_refs || row.factRefs),
    evidenceRefs: unique(row.evidence_refs || row.evidenceRefs),
    evidenceChunkRefs: unique(row.evidence_chunk_refs || row.evidenceChunkRefs),
    atomRefs: unique(row.atom_refs || row.atomRefs),
    proposedPayload: parseObject(row.proposed_payload || row.proposedPayload),
    metadata,
  }
}

function normalizeDecision(row = {}) {
  return {
    id: normalizeText(row.id),
    category: normalizeText(row.category),
    title: normalizeText(row.title),
    status: normalizeText(row.status),
    summary: normalizeText(row.summary),
    sourceRef: normalizeText(row.source_ref || row.sourceRef),
    evidenceNotes: normalizeText(row.evidence_notes || row.evidenceNotes),
  }
}

function normalizeOpenQuestion(row = {}) {
  return {
    id: normalizeText(row.id),
    title: normalizeText(row.title),
    summary: normalizeText(row.summary),
    owner: normalizeText(row.owner),
    status: normalizeText(row.status),
  }
}

function normalizeEvent(row = {}) {
  return {
    eventId: normalizeText(row.event_id || row.eventId),
    issueId: normalizeText(row.issue_id || row.issueId),
    eventType: normalizeText(row.event_type || row.eventType),
    resolutionRef: normalizeText(row.resolution_ref || row.resolutionRef),
    routeRefs: unique(row.route_refs || row.routeRefs),
    metadata: parseObject(row.metadata),
  }
}

export function stableDecision008Id(prefix = 'item', seed = '') {
  return `${prefix}:${stableHash(seed).slice(0, 24)}`
}

export function classifyDecision008Domain(issue = {}) {
  const normalized = `${issue.title || ''} ${issue.plainEnglishQuestion || ''} ${(issue.sourceIds || []).join(' ')}`.toLowerCase()
  if (/cash|invoice|balance|finance|revenue|payroll|margin|expense/.test(normalized)) return 'finance_cash_protection'
  if (/lead|source map|marketing|marketmasters|benson crew|steve zahnd|ad|campaign|brand lane/.test(normalized)) return 'marketing_lane_separation'
  if (/complaint|lead quality|sales|fub|follow[- ]?up|appointment|agent/.test(normalized)) return 'sales_lead_complaint_diagnostic'
  if (/harlan|operator|accountability|doctrine|decision/.test(normalized)) return 'harlan_operator_accountability'
  if (/database|access|server|system|foundation|agent/.test(normalized)) return 'system_accountability'
  return 'general_accountability'
}

function categoryForDomain(domain = '') {
  if (domain === 'finance_cash_protection' || domain === 'marketing_lane_separation') return 'strategy'
  if (domain === 'sales_lead_complaint_diagnostic') return 'execution'
  if (domain === 'harlan_operator_accountability') return 'people'
  return 'system'
}

function evidenceRefsFor(issue = {}, route = {}) {
  return {
    sourceIds: unique([...(issue.sourceIds || []), ...(route.sourceIds || [])]),
    factRefs: unique([...(issue.factRefs || []), ...(route.factRefs || [])]),
    atomRefs: unique([...(issue.atomRefs || []), ...(route.atomRefs || []), ...(route.evidenceRefs || [])]),
    chunkRefs: unique([...(issue.chunkRefs || []), ...(route.evidenceChunkRefs || [])]),
    synthesizedItemRefs: unique([...(issue.synthesizedItemRefs || []), route.synthesizedItemId]),
  }
}

function tokenSet(value = '') {
  return Array.from(new Set(
    normalizeText(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(/\s+/)
      .filter(token => token.length >= 5)
      .filter(token => !['where', 'which', 'should', 'system', 'decision', 'review', 'source'].includes(token)),
  ))
}

function conflictStatusFor(issue = {}, decisions = []) {
  const issueTokens = tokenSet(issue.title)
  const matches = decisions
    .map(normalizeDecision)
    .filter(decision => {
      const decisionTokens = tokenSet(`${decision.title} ${decision.summary}`)
      const overlap = issueTokens.filter(token => decisionTokens.includes(token))
      return overlap.length >= 2
    })
    .map(decision => ({ id: decision.id, title: decision.title, status: decision.status }))
  return {
    status: matches.length ? 'related_existing_decision_review_required' : 'no_direct_conflict_found',
    matches,
  }
}

export function buildDecision008Candidate({
  issue: rawIssue = {},
  routes = [],
  decisions = [],
  openQuestions = [],
  events = [],
} = {}) {
  const issue = normalizeIssue(rawIssue)
  const normalizedRoutes = routes.map(normalizeRoute)
  const route = normalizedRoutes.find(item => issue.routeRefs.includes(item.routeId)) || normalizedRoutes[0] || {}
  const domain = classifyDecision008Domain(issue)
  const category = categoryForDomain(domain)
  const evidence = evidenceRefsFor(issue, route)
  const seed = `${issue.issueId}:${route.routeId || 'no-route'}:${DECISION_008_CLOSEOUT_KEY}`
  const shortId = stableHash(seed).slice(0, 10).toUpperCase()
  const proposedDecisionId = `DECISION-008-${shortId}`
  const openQuestionId = `OPEN-DECISION-008-${shortId}`
  const feedbackEventId = `strategic-event:${issue.issueId}:decision-008-v1`
  const normalizedDecisions = decisions.map(normalizeDecision)
  const normalizedQuestions = openQuestions.map(normalizeOpenQuestion)
  const normalizedEvents = events.map(normalizeEvent)
  const conflict = conflictStatusFor(issue, normalizedDecisions)
  const proposedDecision = normalizedDecisions.find(decision => decision.id === proposedDecisionId) || null
  const openQuestion = normalizedQuestions.find(question => question.id === openQuestionId) || null
  const feedbackEvent = normalizedEvents.find(event =>
    event.issueId === issue.issueId &&
      event.eventType === 'resolution_feedback' &&
      event.resolutionRef === DECISION_008_CLOSEOUT_KEY
  ) || null

  return {
    issueId: issue.issueId,
    issueTitle: issue.title,
    issueStatus: issue.status,
    issueResolutionStatus: issue.resolutionStatus,
    issueResolutionRef: issue.resolutionRef,
    routeId: route.routeId || '',
    routeType: route.routeType || '',
    routeDestinationTable: route.destinationTable || '',
    routeApprovalStatus: route.approvalStatus || '',
    owner: issue.owner || route.owner || 'Foundation',
    ownerConfidence: issue.ownerConfidence || route.ownerConfidence || 'needs_owner',
    domain,
    category,
    proposedDecisionId,
    openQuestionId,
    feedbackEventId,
    sourceIds: evidence.sourceIds,
    factRefs: evidence.factRefs,
    atomRefs: evidence.atomRefs,
    chunkRefs: evidence.chunkRefs,
    synthesizedItemRefs: evidence.synthesizedItemRefs,
    conflictStatus: conflict.status,
    conflictMatches: conflict.matches,
    proposedDecisionStatus: proposedDecision?.status || '',
    openQuestionStatus: openQuestion?.status || '',
    resolutionFeedbackEventExists: Boolean(feedbackEvent),
    routeLinked: Boolean(route.routeId && issue.routeRefs.includes(route.routeId)),
    proposedPayloadTitle: normalizeText(route.proposedPayload?.title || issue.title),
  }
}

export function buildDecision008CandidateRows(snapshot = {}) {
  const issues = (snapshot.issues || []).map(normalizeIssue)
  const routes = (snapshot.routes || []).map(normalizeRoute)
  const decisions = (snapshot.decisions || []).map(normalizeDecision)
  const openQuestions = (snapshot.openQuestions || []).map(normalizeOpenQuestion)
  const events = (snapshot.events || []).map(normalizeEvent)
  return issues
    .filter(issue => issue.issueId)
    .map(issue => buildDecision008Candidate({
      issue,
      routes: routes.filter(route =>
        issue.routeRefs.includes(route.routeId) ||
          issue.synthesizedItemRefs.includes(route.synthesizedItemId)
      ),
      decisions,
      openQuestions,
      events,
    }))
}

export function buildDecision008ProposedDecision(candidate = {}) {
  return {
    id: candidate.proposedDecisionId,
    category: candidate.category || 'system',
    title: truncate(`Accountability doctrine candidate: ${candidate.issueTitle}`, 140),
    status: 'proposed',
    summary: truncate(`Issue ${candidate.issueId} is source-backed and route-linked. Owner ${candidate.owner} must resolve the question/action before doctrine, backlog, or operating truth can be applied.`, 700),
    rationale: truncate(`DECISION-008 creates proposed accountability only. It preserves the strategic issue, route, source, atom, chunk, and synthesized-item refs and waits for explicit human approval before locking or applying doctrine. Domain: ${candidate.domain}. Conflict status: ${candidate.conflictStatus}.`, 1000),
    sourceRef: `DECISION-008 ${candidate.issueId} ${candidate.routeId}`,
    decisionOwner: candidate.owner || 'Foundation',
    confirmedBy: null,
    contextRef: `intelligence_strategic_issues:${candidate.issueId}`,
    evidenceNotes: [
      `Issue: ${candidate.issueId}`,
      `Route: ${candidate.routeId}`,
      `Sources: ${(candidate.sourceIds || []).join(', ')}`,
      `Facts: ${(candidate.factRefs || []).slice(0, 8).join(', ')}`,
      `Atoms: ${(candidate.atomRefs || []).slice(0, 8).join(', ')}`,
      `Chunks: ${(candidate.chunkRefs || []).slice(0, 8).join(', ')}`,
      `Synthesized items: ${(candidate.synthesizedItemRefs || []).join(', ')}`,
    ].join('\n'),
  }
}

export function buildDecision008OpenQuestion(candidate = {}) {
  return {
    id: candidate.openQuestionId,
    title: truncate(candidate.proposedPayloadTitle || candidate.issueTitle || `Resolve ${candidate.issueId}`, 180),
    summary: truncate(`Owner ${candidate.owner} needs to answer or route this source-backed strategic issue. DECISION-008 links it to ${candidate.routeId}, proposed decision ${candidate.proposedDecisionId}, and feedback event ${candidate.feedbackEventId}.`, 900),
    owner: candidate.owner || 'Foundation',
    status: 'open',
  }
}

export function evaluateDecision008Snapshot(snapshot = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const candidates = Array.isArray(snapshot.candidates) ? snapshot.candidates : buildDecision008CandidateRows(snapshot)
  const primary = candidates.find(candidate => candidate.routeLinked) || candidates[0] || null

  add(Number(snapshot.issueCount || candidates.length || 0) >= 1, 'strategic issue input exists', `${snapshot.issueCount || candidates.length || 0}`)
  add(candidates.length >= 1, 'at least one accountability candidate is built', `${candidates.length}`)
  add(Boolean(primary?.issueId), 'candidate preserves issue id', primary?.issueId || 'missing')
  add(Boolean(primary?.routeId), 'candidate preserves route id', primary?.routeId || 'missing')
  add(primary?.routeLinked, 'candidate route is linked by strategic issue route_refs', primary?.routeId || 'missing route link')
  add(Boolean(primary?.owner) && !/needs[-_ ]?owner/i.test(primary.owner), 'candidate has concrete owner', primary?.owner || 'missing')
  add((primary?.sourceIds || []).length >= 1, 'candidate preserves source ids', (primary?.sourceIds || []).join(', ') || 'missing')
  add((primary?.factRefs || []).length >= 1, 'candidate preserves fact refs', (primary?.factRefs || []).length || 0)
  add((primary?.atomRefs || []).length >= 1, 'candidate preserves atom refs', (primary?.atomRefs || []).length || 0)
  add((primary?.chunkRefs || []).length >= 1, 'candidate preserves chunk refs', (primary?.chunkRefs || []).length || 0)
  add((primary?.synthesizedItemRefs || []).length >= 1, 'candidate preserves synthesized item refs', (primary?.synthesizedItemRefs || []).join(', ') || 'missing')
  add(Boolean(primary?.domain) && primary.domain !== 'general_accountability', 'candidate has evidence-derived accountability domain', primary?.domain || 'missing')
  add(['pending', 'approved'].includes(primary?.routeApprovalStatus), 'route remains review-controlled, not auto-applied', primary?.routeApprovalStatus || 'missing')
  add(primary?.openQuestionStatus === 'open', 'owner question exists and remains open', `${primary?.openQuestionId || 'missing'}:${primary?.openQuestionStatus || 'missing'}`)
  add(primary?.proposedDecisionStatus === 'proposed', 'decision output exists as proposed only', `${primary?.proposedDecisionId || 'missing'}:${primary?.proposedDecisionStatus || 'missing'}`)
  add(primary?.resolutionFeedbackEventExists, 'resolution feedback event is written back to strategic issue ledger', primary?.feedbackEventId || 'missing')
  add(primary?.issueResolutionStatus === 'route_pending', 'strategic issue remains route_pending until human approval', primary?.issueResolutionStatus || 'missing')
  add(primary?.issueResolutionRef === DECISION_008_CLOSEOUT_KEY, 'strategic issue points to DECISION-008 resolution feedback', primary?.issueResolutionRef || 'missing')
  add(candidates.every(candidate => candidate.proposedDecisionStatus !== 'locked'), 'DECISION-008 does not lock decisions', 'proposed-only boundary')

  return {
    ok: checks.every(check => check.ok),
    checks,
    failed: checks.filter(check => !check.ok),
    summary: {
      candidateCount: candidates.length,
      primaryIssueId: primary?.issueId || null,
      primaryRouteId: primary?.routeId || null,
      primaryDomain: primary?.domain || null,
      proposedDecisionId: primary?.proposedDecisionId || null,
      openQuestionId: primary?.openQuestionId || null,
      feedbackEventId: primary?.feedbackEventId || null,
    },
  }
}

export function buildDecision008DogfoodProof() {
  const healthy = {
    issueCount: 1,
    candidates: [{
      issueId: 'strategic-issue:dogfood',
      issueTitle: 'Clarify where leads come from across Benson Crew / Steve Zahnd / MarketMasters',
      issueStatus: 'triage',
      issueResolutionStatus: 'route_pending',
      issueResolutionRef: DECISION_008_CLOSEOUT_KEY,
      routeId: 'action-route:dogfood',
      routeType: 'open_question',
      routeDestinationTable: 'open_questions',
      routeApprovalStatus: 'pending',
      owner: 'Foundation',
      ownerConfidence: 'high',
      domain: 'marketing_lane_separation',
      category: 'strategy',
      proposedDecisionId: 'DECISION-008-DOGFOOD',
      openQuestionId: 'OPEN-DECISION-008-DOGFOOD',
      feedbackEventId: 'strategic-event:dogfood:decision-008-v1',
      sourceIds: ['SRC-GMAIL-001'],
      factRefs: ['fact:1'],
      atomRefs: ['atom:1'],
      chunkRefs: ['chunk:1'],
      synthesizedItemRefs: ['synth:1'],
      routeLinked: true,
      proposedDecisionStatus: 'proposed',
      openQuestionStatus: 'open',
      resolutionFeedbackEventExists: true,
      conflictStatus: 'no_direct_conflict_found',
    }],
  }
  const missingRoute = evaluateDecision008Snapshot({
    ...healthy,
    candidates: healthy.candidates.map(candidate => ({ ...candidate, routeId: '', routeLinked: false })),
  })
  const lockedDecision = evaluateDecision008Snapshot({
    ...healthy,
    candidates: healthy.candidates.map(candidate => ({ ...candidate, proposedDecisionStatus: 'locked' })),
  })
  const missingFeedback = evaluateDecision008Snapshot({
    ...healthy,
    candidates: healthy.candidates.map(candidate => ({ ...candidate, resolutionFeedbackEventExists: false })),
  })
  const missingEvidence = evaluateDecision008Snapshot({
    ...healthy,
    candidates: healthy.candidates.map(candidate => ({ ...candidate, sourceIds: [], factRefs: [], atomRefs: [], chunkRefs: [] })),
  })
  const healthyResult = evaluateDecision008Snapshot(healthy)
  const ok = healthyResult.ok &&
    !missingRoute.ok &&
    !lockedDecision.ok &&
    !missingFeedback.ok &&
    !missingEvidence.ok
  return {
    ok,
    invariant: 'DECISION-008 requires issue/route/source evidence, proposed-only output, open owner question, and resolution feedback.',
    healthy: { ok: healthyResult.ok, failed: healthyResult.failed },
    missingRoute: { ok: missingRoute.ok, failed: missingRoute.failed.map(item => item.check) },
    lockedDecision: { ok: lockedDecision.ok, failed: lockedDecision.failed.map(item => item.check) },
    missingFeedback: { ok: missingFeedback.ok, failed: missingFeedback.failed.map(item => item.check) },
    missingEvidence: { ok: missingEvidence.ok, failed: missingEvidence.failed.map(item => item.check) },
  }
}
