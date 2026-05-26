export const DECISION_007_CARD_ID = 'DECISION-007'
export const DECISION_007_CLOSEOUT_KEY = 'decision-007-reconciliation-v1'
export const DECISION_007_PLAN_PATH = 'docs/process/decision-007-plan.md'
export const DECISION_007_APPROVAL_PATH = 'docs/process/approvals/DECISION-007.json'
export const DECISION_007_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-26-hot-doc-refresh/2026-05-20-decision-007-closeout.md'
export const DECISION_007_SCRIPT_PATH = 'scripts/process-decision-007-check.mjs'
export const OLD_REBUILD_DECISIONS_PATH = 'docs/rebuild/plan-history/rebuild-decisions-2026-04-29-retired.md'
export const DECISION_007_ACTOR = 'codex-decision-007'
export const DECISION_007_NEXT_CARD_ID = 'REPLY-WATCHING-LOOP-001'

export const HISTORICAL_DECISION_IDS = Object.freeze([
  'DEC-001',
  'DEC-002',
  'DEC-003',
  'DEC-004',
  'DEC-005',
  'DEC-006',
  'DEC-007',
])

export const STALE_OPEN_QUESTION_IDS = Object.freeze([
  'Q-001',
  'Q-002',
  'Q-003',
  'Q-004',
  'Q-005',
])

export const DECISION_007_ARTIFACT_REFS = Object.freeze([
  OLD_REBUILD_DECISIONS_PATH,
  DECISION_007_PLAN_PATH,
  DECISION_007_HANDOFF_PATH,
])

export const DECISION_007_RECONCILIATION_ROWS = Object.freeze([
  {
    key: 'docs-plus-database-memory',
    oldSourceSnippet: 'Strategy docs + database work together',
    outcome: 'represented',
    targetIds: ['DEC-001', 'DEC-005'],
    note: 'Canonical docs keep meaning; DB keeps volatile decisions/events/proposals.',
  },
  {
    key: 'north-star-scope',
    oldSourceSnippet: '$2B team, 10K downline',
    outcome: 'represented',
    targetIds: ['DEC-002'],
    note: 'Team production and downline/community scale stay separate.',
  },
  {
    key: 'source-contracts',
    oldSourceSnippet: 'Source registry for business data inputs',
    outcome: 'represented',
    targetIds: ['DEC-003', 'DEC-006'],
    note: 'Mutable/live values route through source contracts, not markdown snapshots.',
  },
  {
    key: 'postgres-memory-layer',
    oldSourceSnippet: 'PostgreSQL + pgvector',
    outcome: 'represented',
    targetIds: ['DEC-004'],
    note: 'Postgres remains the operational memory layer; exact runtime details are governed by current runtime doctrine.',
  },
  {
    key: 'strategic-operator',
    oldSourceSnippet: 'Strategic intelligence layer',
    outcome: 'represented',
    targetIds: ['DEC-007'],
    note: 'Foundation should act as a live strategic operator, not a passive recorder.',
  },
  {
    key: 'old-runtime-and-model-claims',
    oldSourceSnippet: 'is the production runtime',
    outcome: 'superseded_by_current_doctrine',
    targetIds: ['MODEL-ROUTING-001', 'LLM-ROUTER-001'],
    note: 'Do not import stale exact provider/subscription/runtime claims as locked decisions; current runtime map and router own this truth.',
  },
  {
    key: 'old-agent-naming',
    oldSourceSnippet: 'Harlan',
    outcome: 'parked_until_agent_runtime',
    targetIds: ['HARLAN-PROJECT-REGISTRY-001', 'HARLAN-OPERATOR-LOOP-V1-001'],
    note: 'Names remain reference context; no broad agent runtime is reopened by this reconciliation.',
  },
  {
    key: 'old-build-checklists',
    oldSourceSnippet: "What's Not Done Yet",
    outcome: 'not_a_decision',
    targetIds: ['backlog_items'],
    note: 'Historical status/checklist content stays retired and does not become active decision truth.',
  },
])

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function normalize(value) {
  return String(value || '').trim()
}

function byId(rows = []) {
  return new Map(asArray(rows).map(row => [row.id, row]))
}

export function buildDecision007DogfoodProof() {
  const healthy = evaluateDecision007Fixture({
    oldDocFound: true,
    historicalDecisionsPresent: true,
    historicalDecisionsSourceLinked: true,
    staleQuestionsResolved: true,
    currentRouteQuestionPreserved: true,
    supersededRuntimeNotImported: true,
  })
  const rejected = {
    missingOldDoc: evaluateDecision007Fixture({
      oldDocFound: false,
      historicalDecisionsPresent: true,
      historicalDecisionsSourceLinked: true,
      staleQuestionsResolved: true,
      currentRouteQuestionPreserved: true,
      supersededRuntimeNotImported: true,
    }),
    weakDecisionProvenance: evaluateDecision007Fixture({
      oldDocFound: true,
      historicalDecisionsPresent: true,
      historicalDecisionsSourceLinked: false,
      staleQuestionsResolved: true,
      currentRouteQuestionPreserved: true,
      supersededRuntimeNotImported: true,
    }),
    staleOpenQuestions: evaluateDecision007Fixture({
      oldDocFound: true,
      historicalDecisionsPresent: true,
      historicalDecisionsSourceLinked: true,
      staleQuestionsResolved: false,
      currentRouteQuestionPreserved: true,
      supersededRuntimeNotImported: true,
    }),
    erasedCurrentRouteQuestion: evaluateDecision007Fixture({
      oldDocFound: true,
      historicalDecisionsPresent: true,
      historicalDecisionsSourceLinked: true,
      staleQuestionsResolved: true,
      currentRouteQuestionPreserved: false,
      supersededRuntimeNotImported: true,
    }),
    staleRuntimeImport: evaluateDecision007Fixture({
      oldDocFound: true,
      historicalDecisionsPresent: true,
      historicalDecisionsSourceLinked: true,
      staleQuestionsResolved: true,
      currentRouteQuestionPreserved: true,
      supersededRuntimeNotImported: false,
    }),
  }
  const ok = healthy.ok && Object.values(rejected).every(result => result.ok === false)
  return {
    ok,
    healthy,
    rejected,
    dogfoodInvariant: ok
      ? 'Decision reconciliation requires old-source evidence, source-linked historical decisions, stale-question cleanup, current route-question preservation, and stale runtime claims excluded from locked truth.'
      : 'Decision reconciliation dogfood failed to reject a known bad fixture.',
  }
}

export function evaluateDecision007Fixture(fixture = {}) {
  const findings = []
  if (fixture.oldDocFound !== true) findings.push('old_decision_source_missing')
  if (fixture.historicalDecisionsPresent !== true) findings.push('historical_decisions_missing')
  if (fixture.historicalDecisionsSourceLinked !== true) findings.push('historical_decisions_missing_source_links')
  if (fixture.staleQuestionsResolved !== true) findings.push('stale_questions_unresolved')
  if (fixture.currentRouteQuestionPreserved !== true) findings.push('current_route_question_not_preserved')
  if (fixture.supersededRuntimeNotImported !== true) findings.push('stale_runtime_claim_imported')
  return { ok: findings.length === 0, findings }
}

export function buildDecision007ReconciliationSnapshot({
  oldDecisionSource = '',
  decisions = [],
  openQuestions = [],
} = {}) {
  const decisionMap = byId(decisions)
  const questionMap = byId(openQuestions)
  const oldSourceFound = DECISION_007_RECONCILIATION_ROWS
    .every(row => oldDecisionSource.includes(row.oldSourceSnippet))
  const historicalDecisionRows = HISTORICAL_DECISION_IDS.map(id => {
    const decision = decisionMap.get(id)
    const sourceIds = asArray(decision?.sourceIds || decision?.source_ids)
    const artifactRefs = asArray(decision?.artifactRefs || decision?.artifact_refs)
    return {
      id,
      exists: Boolean(decision),
      status: decision?.status || null,
      provenanceType: decision?.provenanceType || decision?.provenance_type || null,
      provenanceStatus: decision?.provenanceStatus || decision?.provenance_status || null,
      sourceLinked: sourceIds.includes('SRC-STRATEGY-001'),
      artifactLinked: DECISION_007_ARTIFACT_REFS.every(ref => artifactRefs.includes(ref)),
    }
  })
  const staleQuestionRows = STALE_OPEN_QUESTION_IDS.map(id => {
    const question = questionMap.get(id)
    return {
      id,
      exists: Boolean(question),
      status: question?.status || null,
      resolved: question?.status === 'resolved',
      resolutionNote: normalize(question?.resolutionNote || question?.resolution_note),
    }
  })
  const currentRouteQuestions = asArray(openQuestions).filter(question =>
    question.status === 'open' &&
    (String(question.id || '').startsWith('OPEN-DECISION-008') ||
      String(question.summary || '').includes('DECISION-008'))
  )
  const routeDerivedDecision = asArray(decisions).find(decision =>
    String(decision.id || '').startsWith('DECISION-008') &&
    decision.status === 'proposed' &&
    (decision.provenanceType || decision.provenance_type) === 'route_derived'
  )
  const staleRuntimeImportedAsLocked = asArray(decisions).some(decision =>
    decision.status === 'locked' &&
    /OpenClaw is the production runtime|GPT-5\.4 via ChatGPT Pro|Anthropic banned/i.test(`${decision.title || ''}\n${decision.summary || ''}`)
  )
  const summary = {
    oldSourceFound,
    reconciliationRowCount: DECISION_007_RECONCILIATION_ROWS.length,
    representedRowCount: DECISION_007_RECONCILIATION_ROWS.filter(row => row.outcome === 'represented').length,
    supersededRowCount: DECISION_007_RECONCILIATION_ROWS.filter(row => row.outcome === 'superseded_by_current_doctrine').length,
    notDecisionRowCount: DECISION_007_RECONCILIATION_ROWS.filter(row => row.outcome === 'not_a_decision').length,
    historicalDecisionCount: historicalDecisionRows.length,
    historicalDecisionSourceLinkedCount: historicalDecisionRows.filter(row => row.sourceLinked && row.artifactLinked).length,
    staleQuestionCount: staleQuestionRows.length,
    staleQuestionResolvedCount: staleQuestionRows.filter(row => row.resolved).length,
    currentRouteOpenQuestionCount: currentRouteQuestions.length,
    routeDerivedDecisionPresent: Boolean(routeDerivedDecision),
    staleRuntimeImportedAsLocked,
  }
  return {
    ok:
      oldSourceFound &&
      historicalDecisionRows.every(row => row.exists && row.status === 'locked' && row.sourceLinked && row.artifactLinked) &&
      staleQuestionRows.every(row => row.exists && row.resolved) &&
      currentRouteQuestions.length >= 1 &&
      Boolean(routeDerivedDecision) &&
      staleRuntimeImportedAsLocked === false,
    summary,
    rows: DECISION_007_RECONCILIATION_ROWS,
    historicalDecisionRows,
    staleQuestionRows,
    currentRouteQuestions: currentRouteQuestions.map(question => ({
      id: question.id,
      title: question.title,
      owner: question.owner,
      status: question.status,
    })),
    routeDerivedDecision: routeDerivedDecision
      ? {
          id: routeDerivedDecision.id,
          title: routeDerivedDecision.title,
          status: routeDerivedDecision.status,
          provenanceType: routeDerivedDecision.provenanceType || routeDerivedDecision.provenance_type,
        }
      : null,
  }
}

export async function applyDecision007Reconciliation({
  decisions = [],
  openQuestions = [],
  updateDecision,
  updateOpenQuestion,
  actor = DECISION_007_ACTOR,
} = {}) {
  if (typeof updateDecision !== 'function') {
    throw new Error('updateDecision function is required')
  }
  if (typeof updateOpenQuestion !== 'function') {
    throw new Error('updateOpenQuestion function is required')
  }
  const decisionMap = byId(decisions)
  const questionMap = byId(openQuestions)
  const updatedDecisions = []
  const resolvedQuestions = []
  for (const id of HISTORICAL_DECISION_IDS) {
    const existing = decisionMap.get(id)
    if (!existing) continue
    const decision = await updateDecision(id, {
      sourceIds: Array.from(new Set([...asArray(existing.sourceIds || existing.source_ids), 'SRC-STRATEGY-001'])),
      artifactRefs: Array.from(new Set([...asArray(existing.artifactRefs || existing.artifact_refs), ...DECISION_007_ARTIFACT_REFS])),
      provenanceNotes: `Reconciled by ${DECISION_007_CARD_ID}: historical rebuild decision remains honestly backfilled while now linked back to the retired old-decision artifact; stale exact runtime/provider claims remain governed by current runtime/model doctrine instead of this row.`,
      evidenceNotes: `DECISION-007 compared ${OLD_REBUILD_DECISIONS_PATH}, live decisions, and open questions. This row remains locked because it is durable doctrine, not a stale checklist item.`,
    }, actor)
    updatedDecisions.push(decision.id)
  }
  for (const id of STALE_OPEN_QUESTION_IDS) {
    const existing = questionMap.get(id)
    if (!existing || existing.status === 'resolved') continue
    const question = await updateOpenQuestion(id, {
      status: 'resolved',
      resolutionNote: `Resolved by ${DECISION_007_CARD_ID}: historical carry-forward question is no longer the live queue; durable follow-up is already represented by decisions, source contracts, or specific backlog cards.`,
    }, actor)
    resolvedQuestions.push(question.id)
  }
  return { updatedDecisions, resolvedQuestions }
}
