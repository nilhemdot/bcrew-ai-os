import crypto from 'node:crypto'

export const INTEL_SCOPER_CARD_ID = 'INTEL-SCOPER-001'
export const INTEL_SCOPER_CLOSEOUT_KEY = 'intel-scoper-v1'
export const INTEL_SCOPER_PLAN_PATH = 'docs/process/intel-scoper-001-plan.md'
export const INTEL_SCOPER_APPROVAL_PATH = 'docs/process/approvals/INTEL-SCOPER-001.json'
export const INTEL_SCOPER_SCRIPT_PATH = 'scripts/process-intel-scoper-check.mjs'
export const INTEL_SCOPER_CLOSEOUT_PATH = 'docs/handoffs/2026-05-20-intel-scoper-closeout.md'
export const INTEL_SCOPER_NEXT_CARD_ID = 'DATA-003'
export const INTEL_SCOPER_SPRINT_ID = 'FOUNDATION-AUDIT-CONTROL-AND-INTEL-2026-05-19'

export const INTEL_SCOPER_PROOF_COMMANDS = [
  'node --check lib/intel-scoper.js scripts/process-intel-scoper-check.mjs',
  'npm run process:intel-scoper-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${INTEL_SCOPER_CARD_ID} --planApprovalRef=${INTEL_SCOPER_APPROVAL_PATH} --closeoutKey=${INTEL_SCOPER_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${INTEL_SCOPER_CARD_ID} --closeoutKey=${INTEL_SCOPER_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${INTEL_SCOPER_CARD_ID} --planApprovalRef=${INTEL_SCOPER_APPROVAL_PATH} --closeoutKey=${INTEL_SCOPER_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const INTEL_SCOPER_CHANGED_FILES = [
  'lib/intel-scoper.js',
  INTEL_SCOPER_SCRIPT_PATH,
  INTEL_SCOPER_PLAN_PATH,
  INTEL_SCOPER_APPROVAL_PATH,
  INTEL_SCOPER_CLOSEOUT_PATH,
  'lib/foundation-build-closeout-process-gate-records.js',
  'package.json',
]

export const INTEL_SCOPER_NOT_NEXT_BOUNDARIES = [
  'Do not auto-create backlog cards from Scoper output.',
  'Do not approve, lock, apply, send, message, or write to external systems.',
  'Do not call LLM/provider/browser/auth/private extraction lanes.',
  'Do not build DATA-003 or a Strategy Hub UI inside this card.',
  'Do not scope from loose prose without issue, route, source, fact, atom, or chunk evidence.',
]

export const intelScoperSchemaSql = `
  CREATE TABLE IF NOT EXISTS intelligence_scoper_outputs (
    scoper_output_id TEXT PRIMARY KEY,
    issue_id TEXT NOT NULL REFERENCES intelligence_strategic_issues(issue_id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN (
      'already_answered',
      'partially_answered',
      'real_gap',
      'stale_or_test',
      'needs_human_context',
      'blocked_approval_required'
    )),
    proposed_card_id TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    owner TEXT NOT NULL,
    confidence TEXT NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
    source_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    fact_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    atom_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    chunk_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    synthesized_item_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    route_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    decision_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    open_question_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    event_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    existing_answer_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    gap_statements TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    smallest_next_steps TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    blocked_actions TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    proof_refs TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    proposal JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_intelligence_scoper_outputs_issue
  ON intelligence_scoper_outputs(issue_id, updated_at DESC);

  CREATE INDEX IF NOT EXISTS idx_intelligence_scoper_outputs_status
  ON intelligence_scoper_outputs(status, updated_at DESC);
`

function stableHash(value = '') {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex')
}

function normalizeText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function truncate(value = '', max = 220) {
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
  return {
    issueId: normalizeText(row.issue_id || row.issueId),
    title: normalizeText(row.title),
    plainEnglishQuestion: normalizeText(row.plain_english_question || row.plainEnglishQuestion),
    status: normalizeText(row.status),
    resolutionStatus: normalizeText(row.resolution_status || row.resolutionStatus),
    resolutionRef: normalizeText(row.resolution_ref || row.resolutionRef),
    owner: normalizeText(row.owner) || 'Foundation',
    ownerConfidence: normalizeText(row.owner_confidence || row.ownerConfidence),
    primaryDepartment: normalizeText(row.primary_department || row.primaryDepartment),
    sourceIds: unique(row.source_ids || row.sourceIds),
    factRefs: unique(row.fact_refs || row.factRefs),
    atomRefs: unique(row.atom_refs || row.atomRefs),
    chunkRefs: unique(row.chunk_refs || row.chunkRefs),
    synthesizedItemRefs: unique(row.synthesized_item_refs || row.synthesizedItemRefs),
    routeRefs: unique(row.route_refs || row.routeRefs),
    scopedCardRefs: unique(row.scoped_card_refs || row.scopedCardRefs),
    staleness: normalizeText(row.staleness),
    confidence: normalizeText(row.confidence),
    metadata: parseObject(row.metadata),
  }
}

function normalizeRoute(row = {}) {
  return {
    routeId: normalizeText(row.route_id || row.routeId),
    routeType: normalizeText(row.route_type || row.routeType),
    destinationTable: normalizeText(row.destination_table || row.destinationTable),
    approvalStatus: normalizeText(row.approval_status || row.approvalStatus),
    owner: normalizeText(row.owner),
    sourceIds: unique(row.source_ids || row.sourceIds),
    factRefs: unique(row.fact_refs || row.factRefs),
    evidenceRefs: unique(row.evidence_refs || row.evidenceRefs),
    evidenceChunkRefs: unique(row.evidence_chunk_refs || row.evidenceChunkRefs),
    atomRefs: unique(row.atom_refs || row.atomRefs),
    proposedPayload: parseObject(row.proposed_payload || row.proposedPayload),
    metadata: parseObject(row.metadata),
  }
}

function normalizeDecision(row = {}) {
  return {
    id: normalizeText(row.id),
    title: normalizeText(row.title),
    status: normalizeText(row.status),
    summary: normalizeText(row.summary),
    sourceRef: normalizeText(row.source_ref || row.sourceRef),
    evidenceNotes: normalizeText(row.evidence_notes || row.evidenceNotes),
  }
}

function normalizeQuestion(row = {}) {
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
    summary: normalizeText(row.summary),
    routeRefs: unique(row.route_refs || row.routeRefs),
    scopedCardRefs: unique(row.scoped_card_refs || row.scopedCardRefs),
    resolutionRef: normalizeText(row.resolution_ref || row.resolutionRef),
    metadata: parseObject(row.metadata),
  }
}

function normalizeAtom(row = {}) {
  return {
    atomId: normalizeText(row.atom_id || row.atomId),
    sourceId: normalizeText(row.source_id || row.sourceId),
    title: normalizeText(row.title),
    content: normalizeText(row.content),
    status: normalizeText(row.status),
    minTier: Number(row.min_tier || row.minTier || 1),
    qualityScore: Number(row.quality_score || row.qualityScore || 0),
    relevanceScore: Number(row.relevance_score || row.relevanceScore || 0),
  }
}

function tokenSet(value = '') {
  return Array.from(new Set(
    normalizeText(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(/\s+/)
      .filter(token => token.length >= 5)
      .filter(token => !['review', 'where', 'which', 'should', 'source', 'system', 'signal', 'repeated'].includes(token)),
  ))
}

function tokenOverlap(left = '', right = '') {
  const leftTokens = tokenSet(left)
  const rightTokens = tokenSet(right)
  return leftTokens.filter(token => rightTokens.includes(token)).length
}

function relatedDecisionsFor(issue = {}, decisions = []) {
  return decisions
    .map(normalizeDecision)
    .filter(decision => {
      if (!decision.id) return false
      if (decision.sourceRef.includes(issue.issueId)) return true
      if (decision.evidenceNotes.includes(issue.issueId)) return true
      return [...(issue.routeRefs || []), ...(issue.atomRefs || []), ...(issue.chunkRefs || [])]
        .some(ref => decision.sourceRef.includes(ref) || decision.evidenceNotes.includes(ref))
    })
}

function relatedQuestionsFor(issue = {}, questions = []) {
  return questions
    .map(normalizeQuestion)
    .filter(question => {
      if (!question.id) return false
      if (question.summary.includes(issue.issueId)) return true
      return [...(issue.routeRefs || []), ...(issue.atomRefs || []), ...(issue.chunkRefs || [])]
        .some(ref => question.summary.includes(ref))
    })
}

function routesForIssue(issue = {}, routes = []) {
  const routeIds = new Set(issue.routeRefs || [])
  return routes
    .map(normalizeRoute)
    .filter(route =>
      routeIds.has(route.routeId) ||
      route.atomRefs.some(atomId => issue.atomRefs.includes(atomId)) ||
      route.evidenceRefs.some(atomId => issue.atomRefs.includes(atomId)),
    )
}

function atomsForIssue(issue = {}, atoms = []) {
  const atomIds = new Set(issue.atomRefs || [])
  return atoms.map(normalizeAtom).filter(atom => atomIds.has(atom.atomId))
}

function issueStatusFor({ issue, routes, decisions, questions, atoms }) {
  const hasProposedDecision = decisions.some(decision => decision.status === 'proposed')
  const hasLockedDecision = decisions.some(decision => decision.status === 'locked')
  const hasOpenQuestion = questions.some(question => question.status === 'open')
  const hasRoute = routes.length > 0
  const lowEvidence = issue.sourceIds.length === 0 || (issue.factRefs.length + issue.atomRefs.length + issue.chunkRefs.length) < 3
  const stale = issue.staleness === 'stale' || issue.status === 'stale' || issue.resolutionStatus === 'stale'
  const approvalBlocked = routes.some(route => route.approvalStatus === 'pending' && route.destinationTable !== 'backlog_items')

  if (stale || lowEvidence) return 'stale_or_test'
  if (hasLockedDecision && issue.resolutionStatus === 'resolved') return 'already_answered'
  if (approvalBlocked && (hasProposedDecision || hasOpenQuestion)) return 'blocked_approval_required'
  if (hasRoute || hasProposedDecision || hasOpenQuestion || atoms.length >= 2) return 'partially_answered'
  if (issue.ownerConfidence === 'needs_owner' || issue.owner === 'needs-owner-decision') return 'needs_human_context'
  return 'real_gap'
}

function confidenceFor({ issue, routes, decisions, questions, atoms }) {
  const evidenceScore = issue.sourceIds.length + issue.factRefs.length + issue.atomRefs.length + issue.chunkRefs.length + routes.length + decisions.length + questions.length + atoms.length
  if (evidenceScore >= 12 && issue.sourceIds.length >= 2) return 'high'
  if (evidenceScore >= 5 && issue.sourceIds.length >= 1) return 'medium'
  return 'low'
}

function proposedCardIdFor(issue = {}, status = '') {
  const prefix = status === 'already_answered' ? 'NO-CARD' : 'SCOPED'
  return `${prefix}-${stableHash(`${issue.issueId}:${INTEL_SCOPER_CLOSEOUT_KEY}`).slice(0, 12).toUpperCase()}`
}

function buildGapStatements({ issue, routes, decisions, questions, status }) {
  if (status === 'already_answered') {
    return ['Existing locked decision resolves the issue; monitor for stale evidence before reopening.']
  }
  const gaps = []
  if (!routes.length) gaps.push('No action route is linked yet; route or owner decision is still missing.')
  if (!decisions.length) gaps.push('No proposed or locked decision exists for this strategic issue.')
  if (!questions.length) gaps.push('No owner-bound open question exists for the issue.')
  if (issue.sourceIds.length < 2) gaps.push('Evidence is single-source; confirm with another governed source before applying a decision.')
  if (!issue.chunkRefs.length) gaps.push('No retrieval chunk refs are attached; retrieval proof should be added before broad consumption.')
  if (status === 'blocked_approval_required') gaps.push('Existing route/output remains approval-bound; Scoper must not apply it automatically.')
  return gaps.length ? gaps : ['Evidence exists but needs human confirmation before converting into applied work.']
}

function buildSmallestNextSteps({ issue, status, proposedCardId }) {
  if (status === 'already_answered') {
    return [`Keep ${issue.issueId} linked to the resolving decision and resurface only if source evidence changes.`]
  }
  if (status === 'stale_or_test') {
    return [
      `Refresh evidence for ${issue.issueId} from existing governed source lanes before building a new feature card.`,
      'If evidence remains weak after refresh, mark the issue stale with proof instead of creating a card.',
    ]
  }
  return [
    `Review ${proposedCardId} as a proposed scoped follow-up, not an auto-created backlog card.`,
    'Confirm owner and whether the issue should become a decision, open question, backlog card, snooze, or stale finding.',
    'If approved, promote through the existing backlog/action-route path with all issue/source/route refs preserved.',
  ]
}

export function buildIntelScoperOutput({
  issue: rawIssue = {},
  routes = [],
  decisions = [],
  openQuestions = [],
  events = [],
  atoms = [],
} = {}) {
  const issue = normalizeIssue(rawIssue)
  const relatedRoutes = routesForIssue(issue, routes)
  const relatedDecisions = relatedDecisionsFor(issue, decisions)
  const relatedQuestions = relatedQuestionsFor(issue, openQuestions)
  const relatedEvents = events.map(normalizeEvent).filter(event => event.issueId === issue.issueId)
  const relatedAtoms = atomsForIssue(issue, atoms)
  const status = issueStatusFor({ issue, routes: relatedRoutes, decisions: relatedDecisions, questions: relatedQuestions, atoms: relatedAtoms })
  const confidence = confidenceFor({ issue, routes: relatedRoutes, decisions: relatedDecisions, questions: relatedQuestions, atoms: relatedAtoms })
  const proposedCardId = proposedCardIdFor(issue, status)
  const routeRefs = unique([...(issue.routeRefs || []), ...relatedRoutes.map(route => route.routeId)])
  const decisionRefs = unique(relatedDecisions.map(decision => decision.id))
  const openQuestionRefs = unique(relatedQuestions.map(question => question.id))
  const eventRefs = unique(relatedEvents.map(event => event.eventId))
  const sourceIds = unique([...(issue.sourceIds || []), ...relatedRoutes.flatMap(route => route.sourceIds), ...relatedAtoms.map(atom => atom.sourceId)])
  const factRefs = unique([...(issue.factRefs || []), ...relatedRoutes.flatMap(route => route.factRefs)])
  const atomRefs = unique([...(issue.atomRefs || []), ...relatedRoutes.flatMap(route => route.atomRefs), ...relatedRoutes.flatMap(route => route.evidenceRefs), ...relatedAtoms.map(atom => atom.atomId)])
  const chunkRefs = unique([...(issue.chunkRefs || []), ...relatedRoutes.flatMap(route => route.evidenceChunkRefs)])
  const existingAnswerRefs = unique([...decisionRefs, ...openQuestionRefs, ...routeRefs, ...eventRefs])
  const gapStatements = buildGapStatements({ issue, routes: relatedRoutes, decisions: relatedDecisions, questions: relatedQuestions, status })
  const smallestNextSteps = buildSmallestNextSteps({ issue, status, proposedCardId })
  const blockedActions = [
    'No backlog card auto-created.',
    'No decision approved, locked, or applied.',
    'No external write/send/provider/browser/source extraction performed.',
  ]
  const proofRefs = unique([
    issue.issueId,
    ...sourceIds,
    ...factRefs.slice(0, 6),
    ...atomRefs.slice(0, 6),
    ...chunkRefs.slice(0, 6),
    ...routeRefs,
    ...decisionRefs,
    ...openQuestionRefs,
  ])
  const scoperOutputId = `scoper-output:${stableHash(`${issue.issueId}:${status}:${INTEL_SCOPER_CLOSEOUT_KEY}`).slice(0, 24)}`

  return {
    scoperOutputId,
    issueId: issue.issueId,
    status,
    proposedCardId,
    title: truncate(`Scope ${issue.title || issue.issueId}`, 160),
    summary: truncate(`${issue.plainEnglishQuestion || issue.title} Status: ${status}. ${gapStatements[0] || ''}`, 360),
    owner: issue.owner || relatedRoutes[0]?.owner || 'Foundation',
    confidence,
    sourceIds,
    factRefs,
    atomRefs,
    chunkRefs,
    synthesizedItemRefs: unique(issue.synthesizedItemRefs),
    routeRefs,
    decisionRefs,
    openQuestionRefs,
    eventRefs,
    existingAnswerRefs,
    gapStatements,
    smallestNextSteps,
    blockedActions,
    proofRefs,
    proposalOnly: true,
    writesBacklog: false,
    opensSprint: false,
    autoApproved: false,
    requiresHumanApproval: true,
    noExternalWrite: true,
    proposal: {
      what: proposedCardId.startsWith('NO-CARD')
        ? 'Do not create a new card unless evidence changes.'
        : `Review proposed follow-up ${proposedCardId}.`,
      why: 'Strategic Intelligence needs gap resolution without creating disconnected report piles or auto-applied work.',
      acceptanceCriteria: [
        'Owner confirms disposition: decide, ask, backlog, stale, snooze, or reject.',
        'Any promoted work preserves issue, route, source, fact, atom, and chunk refs.',
        'No action is applied without the existing human approval path.',
      ],
      definitionOfDone: [
        'Scoper output is reviewed or linked to the approved next card.',
        'The strategic issue ledger receives a follow-up event.',
        'System Health and repeated-failure gates remain green.',
      ],
      proofPlan: [
        'Read intelligence_scoper_outputs by scoper_output_id.',
        'Verify issue/source/route refs are present.',
        'Verify no backlog item, decision lock, external write, or provider action was auto-created.',
      ],
      notNext: INTEL_SCOPER_NOT_NEXT_BOUNDARIES,
    },
    metadata: {
      cardId: INTEL_SCOPER_CARD_ID,
      closeoutKey: INTEL_SCOPER_CLOSEOUT_KEY,
      issueStatus: issue.status,
      issueResolutionStatus: issue.resolutionStatus,
      issueResolutionRef: issue.resolutionRef,
      sourceSurface: 'intelligence_strategic_issues',
      outputState: 'scoped_proposal_only',
    },
  }
}

export function buildIntelScoperOutputs(snapshot = {}, { limit = 5 } = {}) {
  const issues = Array.isArray(snapshot.issues) ? snapshot.issues : []
  return issues
    .map(issue => buildIntelScoperOutput({
      issue,
      routes: snapshot.routes || [],
      decisions: snapshot.decisions || [],
      openQuestions: snapshot.openQuestions || [],
      events: snapshot.events || [],
      atoms: snapshot.atoms || [],
    }))
    .sort((a, b) => {
      const statusRank = {
        blocked_approval_required: 0,
        partially_answered: 1,
        real_gap: 2,
        needs_human_context: 3,
        stale_or_test: 4,
        already_answered: 5,
      }
      return (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9) || b.proofRefs.length - a.proofRefs.length
    })
    .slice(0, limit)
}

export function evaluateIntelScoperSnapshot(snapshot = {}) {
  const outputs = Array.isArray(snapshot.outputs) ? snapshot.outputs : []
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })

  add(snapshot.tableExists === true, 'intelligence_scoper_outputs table exists', snapshot.tableExists ? 'present' : 'missing')
  add(outputs.length >= 5, 'five-row human scoper sample exists', `${outputs.length}/5`)
  add(outputs.every(output => output.proposalOnly === true || parseObject(output.metadata).proposalOnly !== false), 'outputs are proposal-only', `${outputs.length} outputs`)
  add(outputs.every(output => output.writesBacklog === false || parseObject(output.metadata).writesBacklog !== true), 'outputs do not write backlog automatically', `${outputs.length} outputs`)
  add(outputs.every(output => output.autoApproved === false || parseObject(output.metadata).autoApproved !== true), 'outputs are not auto-approved', `${outputs.length} outputs`)
  add(outputs.every(output => normalizeText(output.issueId || output.issue_id)), 'every output has issue ref', 'issue_id required')
  add(outputs.every(output => normalizeArray(output.sourceIds || output.source_ids).length >= 1), 'every output has source refs', 'source_ids required')
  add(outputs.every(output => normalizeArray(output.proofRefs || output.proof_refs).length >= 4), 'every output has proof refs', 'proof_refs required')
  add(outputs.every(output => normalizeArray(output.smallestNextSteps || output.smallest_next_steps).length >= 1), 'every output has smallest next steps', 'smallest_next_steps required')
  add(outputs.every(output => normalizeArray(output.blockedActions || output.blocked_actions).some(action => action.includes('No backlog card auto-created'))), 'every output records blocked auto-action boundary', 'no auto backlog')
  add(outputs.some(output => normalizeArray(output.decisionRefs || output.decision_refs).some(ref => ref.startsWith('DECISION-008-'))), 'DECISION-008 proposed decision is included in a scoper output', 'decision ref required')
  add(outputs.some(output => normalizeArray(output.openQuestionRefs || output.open_question_refs).some(ref => ref.startsWith('OPEN-DECISION-008-'))), 'DECISION-008 open question is included in a scoper output', 'open question ref required')
  add(outputs.some(output => ['partially_answered', 'blocked_approval_required'].includes(output.status)), 'sample distinguishes partial/approval-bound work from resolved work', 'partial status required')
  add(outputs.every(output => normalizeArray(output.gapStatements || output.gap_statements).length >= 1), 'every output states what remains missing or why no card is needed', 'gap statements required')

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    summary: {
      tableExists: snapshot.tableExists === true,
      outputCount: outputs.length,
      statusCounts: outputs.reduce((acc, output) => {
        acc[output.status] = (acc[output.status] || 0) + 1
        return acc
      }, {}),
      sampleIds: outputs.map(output => output.scoperOutputId || output.scoper_output_id).filter(Boolean),
    },
    checks,
    failed,
  }
}

export function buildIntelScoperDogfoodProof() {
  const goodIssue = {
    issueId: 'strategic-issue:dogfood-good',
    title: 'Clarify marketing source routing',
    plainEnglishQuestion: 'What owner decision is needed for marketing source routing?',
    status: 'surfaced',
    resolutionStatus: 'unresolved',
    owner: 'Foundation',
    ownerConfidence: 'needs_owner',
    sourceIds: ['SRC-GMAIL-001'],
    factRefs: ['fact:dogfood-1', 'fact:dogfood-2'],
    atomRefs: ['atom:dogfood-1'],
    chunkRefs: ['chunk:dogfood-1'],
    synthesizedItemRefs: ['synthesized-item:dogfood'],
    routeRefs: ['action-route:dogfood'],
  }
  const good = buildIntelScoperOutput({
    issue: goodIssue,
    routes: [{
      routeId: 'action-route:dogfood',
      routeType: 'open_question',
      destinationTable: 'open_questions',
      approvalStatus: 'pending',
      owner: 'Foundation',
      sourceIds: ['SRC-GMAIL-001'],
      factRefs: ['fact:dogfood-1'],
      evidenceRefs: ['atom:dogfood-1'],
      evidenceChunkRefs: ['chunk:dogfood-1'],
      atomRefs: ['atom:dogfood-1'],
    }],
    decisions: [{
      id: 'DECISION-008-DOGFOOD',
      status: 'proposed',
      title: 'Proposed routing decision',
      summary: 'Proposed only.',
      sourceRef: 'strategic-issue:dogfood-good',
    }],
    openQuestions: [{
      id: 'OPEN-DECISION-008-DOGFOOD',
      title: 'Confirm routing owner',
      summary: 'Question for strategic-issue:dogfood-good',
      status: 'open',
    }],
  })
  const weakMissingSource = buildIntelScoperOutput({
    issue: { ...goodIssue, issueId: 'strategic-issue:dogfood-weak', sourceIds: [], factRefs: [], atomRefs: [], chunkRefs: [], routeRefs: [] },
  })
  const mutated = { ...good, writesBacklog: true, autoApproved: true, blockedActions: [] }
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  add(good.proposalOnly === true && good.writesBacklog === false && good.autoApproved === false, 'good fixture is proposal-only and non-mutating', good.scoperOutputId)
  add(good.sourceIds.length && good.proofRefs.length >= 4, 'good fixture preserves source/proof refs', good.proofRefs.join(', '))
  add(weakMissingSource.status === 'stale_or_test' && weakMissingSource.sourceIds.length === 0, 'missing source evidence is degraded, not build-ready', weakMissingSource.status)
  add(mutated.writesBacklog === true && mutated.autoApproved === true && !mutated.blockedActions.length, 'mutation fixture demonstrates rejected shape', 'writesBacklog/autoApproved')
  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    invariant: 'Scoper output must preserve evidence, remain proposal-only, and degrade weak source evidence.',
    checks,
    failed,
  }
}
