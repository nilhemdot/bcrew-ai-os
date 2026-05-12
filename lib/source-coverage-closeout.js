export const SOURCE_COVERAGE_CLOSEOUT_CARD_ID = 'SOURCE-COVERAGE-CLOSEOUT-001'
export const SOURCE_COVERAGE_CLOSEOUT_CLOSEOUT_KEY = 'source-coverage-closeout-v1'
export const SOURCE_COVERAGE_CLOSEOUT_PLAN_PATH = 'docs/process/source-coverage-closeout-001-plan.md'
export const SOURCE_COVERAGE_CLOSEOUT_APPROVAL_PATH = 'docs/process/approvals/SOURCE-COVERAGE-CLOSEOUT-001.json'
export const SOURCE_COVERAGE_CLOSEOUT_SCRIPT_PATH = 'scripts/process-source-coverage-closeout-check.mjs'
export const SOURCE_COVERAGE_CLOSEOUT_SUMMARY_MARKER = 'SOURCE_COVERAGE_CLOSEOUT_SUMMARY'

export const SOURCE_EXTRACT_GAP_FOLLOWUP_CARD_ID = 'SOURCE-EXTRACTION-GAP-FOLLOWUP-001'
export const SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID = 'SOURCE-MATURITY-GAP-FOLLOWUP-001'

export const SOURCE_COVERAGE_CLOSEOUT_DECISIONS = [
  'covered_for_v1',
  'advance_extraction_gap',
  'advance_maturity_gap',
  'deferred_with_blocker',
  'not_required_for_v1',
]

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function bySourceId(rows = []) {
  return new Map(normalizeList(rows).map(row => [row.sourceId || row.source_id, row]).filter(([sourceId]) => Boolean(sourceId)))
}

function maturityGap(row = {}) {
  const nextGap = row.nextGap || 'unknown'
  return nextGap !== 'complete' && nextGap !== 'deferred' ? nextGap : null
}

function sourceTitle(source = {}, maturityRow = {}, extractionRow = {}) {
  return source.title || maturityRow.title || extractionRow.title || source.sourceId || extractionRow.sourceId
}

function buildDecision({ source = {}, maturityRow = {}, extractionRow = {} } = {}) {
  const sourceId = source.sourceId || maturityRow.sourceId || extractionRow.sourceId
  const nextMaturityGap = maturityGap(maturityRow)
  const extractionState = extractionRow.extractionState || 'unknown'
  const extractionReason = normalizeText(extractionRow.reason)

  if (maturityRow.deferred || extractionState === 'deferred') {
    return {
      decision: 'deferred_with_blocker',
      status: 'closed',
      nextCardId: null,
      reason: extractionReason || maturityRow.stages?.[maturityRow.nextGap]?.detail || 'Source is deferred for the current Foundation depth pass.',
      operatorAction: 'Leave deferred until the source contract or blocker card changes.',
    }
  }

  if (extractionState === 'failure' || extractionState === 'pending') {
    return {
      decision: 'advance_extraction_gap',
      status: 'routed',
      nextCardId: SOURCE_EXTRACT_GAP_FOLLOWUP_CARD_ID,
      reason: extractionReason || 'Extraction state is not covered for v1.',
      operatorAction: 'Handle in the extraction gap follow-up queue; do not start broad ingestion from this closeout card.',
    }
  }

  if (nextMaturityGap) {
    return {
      decision: 'advance_maturity_gap',
      status: 'routed',
      nextCardId: SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID,
      reason: `Next source maturity gap is ${nextMaturityGap}. ${maturityRow.stages?.[nextMaturityGap]?.detail || ''}`.trim(),
      operatorAction: 'Handle in the maturity gap follow-up queue; decide the smallest next stage before product work consumes this source.',
    }
  }

  if (extractionState === 'not_required') {
    return {
      decision: 'not_required_for_v1',
      status: 'closed',
      nextCardId: null,
      reason: extractionReason || 'No governed extraction target is required for the current Foundation pass.',
      operatorAction: 'Keep as not required unless the source contract changes.',
    }
  }

  return {
    decision: 'covered_for_v1',
    status: 'closed',
    nextCardId: null,
    reason: extractionRow.latestSuccessAt
      ? `Extraction is covered by last success at ${extractionRow.latestSuccessAt}.`
      : `Source ${sourceId} has no open maturity or extraction gap for v1.`,
    operatorAction: 'No source coverage action needed in this sprint.',
  }
}

export function buildSourceCoverageCloseoutSnapshot({
  sources = [],
  sourceMaturityGrid = {},
  sourceExtractionCoverage = {},
} = {}) {
  const sourceRows = normalizeList(sources)
  const maturityMap = bySourceId(sourceMaturityGrid.rows)
  const extractionMap = bySourceId(sourceExtractionCoverage.rows)

  const rows = sourceRows.map(source => {
    const sourceId = source.sourceId
    const maturityRow = maturityMap.get(sourceId) || {}
    const extractionRow = extractionMap.get(sourceId) || {}
    const decision = buildDecision({ source, maturityRow, extractionRow })
    return {
      sourceId,
      title: sourceTitle(source, maturityRow, extractionRow),
      unitName: source.unitName || maturityRow.unitName || extractionRow.unitName || '',
      maturityNextGap: maturityRow.nextGap || 'unknown',
      extractionState: extractionRow.extractionState || 'unknown',
      targetKeys: normalizeList(extractionRow.targetKeys),
      decision: decision.decision,
      status: decision.status,
      nextCardId: decision.nextCardId,
      reason: decision.reason,
      operatorAction: decision.operatorAction,
      evidenceRefs: [
        ...(maturityRow.sourceId ? ['source-maturity-grid-v1'] : []),
        ...(extractionRow.sourceId ? ['source-extraction-coverage-v1'] : []),
      ],
    }
  })

  const decisionCounts = SOURCE_COVERAGE_CLOSEOUT_DECISIONS.reduce((acc, decision) => {
    acc[decision] = rows.filter(row => row.decision === decision).length
    return acc
  }, {})
  const routedRows = rows.filter(row => row.status === 'routed')
  const nonGreenRows = rows.filter(row =>
    row.maturityNextGap !== 'complete' ||
      !['last_success', 'not_required', 'deferred'].includes(row.extractionState)
  )

  return {
    generatedAt: new Date().toISOString(),
    cardId: SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
    closeoutKey: SOURCE_COVERAGE_CLOSEOUT_CLOSEOUT_KEY,
    rows,
    summary: {
      sourceCount: rows.length,
      nonGreenSourceCount: nonGreenRows.length,
      closedDecisionCount: rows.filter(row => row.status === 'closed').length,
      routedDecisionCount: routedRows.length,
      unresolvedDecisionCount: rows.filter(row => !SOURCE_COVERAGE_CLOSEOUT_DECISIONS.includes(row.decision)).length,
      decisionCounts,
      extractionGapFollowupCount: rows.filter(row => row.nextCardId === SOURCE_EXTRACT_GAP_FOLLOWUP_CARD_ID).length,
      maturityGapFollowupCount: rows.filter(row => row.nextCardId === SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID).length,
    },
    routedRows: routedRows.slice(0, 18).map(row => ({
      sourceId: row.sourceId,
      decision: row.decision,
      nextCardId: row.nextCardId,
      reason: row.reason,
    })),
  }
}

export function buildSyntheticSourceCoverageCloseoutProof() {
  const sources = [
    { sourceId: 'SRC-COVERED-001', title: 'Covered' },
    { sourceId: 'SRC-FAILURE-001', title: 'Failure' },
    { sourceId: 'SRC-MATURITY-001', title: 'Maturity' },
    { sourceId: 'SRC-DEFERRED-001', title: 'Deferred' },
  ]
  const snapshot = buildSourceCoverageCloseoutSnapshot({
    sources,
    sourceMaturityGrid: {
      rows: [
        { sourceId: 'SRC-COVERED-001', nextGap: 'complete', stages: {} },
        { sourceId: 'SRC-FAILURE-001', nextGap: 'monitored', stages: { monitored: { detail: 'No target.' } } },
        { sourceId: 'SRC-MATURITY-001', nextGap: 'atomized', stages: { atomized: { detail: 'No atoms.' } } },
        { sourceId: 'SRC-DEFERRED-001', nextGap: 'deferred', deferred: true, stages: {} },
      ],
    },
    sourceExtractionCoverage: {
      rows: [
        { sourceId: 'SRC-COVERED-001', extractionState: 'last_success', latestSuccessAt: '2026-05-12T12:00:00.000Z', reason: 'Last success.' },
        { sourceId: 'SRC-FAILURE-001', extractionState: 'failure', reason: 'No governed extraction target.' },
        { sourceId: 'SRC-MATURITY-001', extractionState: 'not_required', reason: 'Manual boundary.' },
        { sourceId: 'SRC-DEFERRED-001', extractionState: 'deferred', reason: 'Blocked.' },
      ],
    },
  })
  const decisionBySource = new Map(snapshot.rows.map(row => [row.sourceId, row.decision]))

  return {
    ok: snapshot.rows.length === 4 &&
      decisionBySource.get('SRC-COVERED-001') === 'covered_for_v1' &&
      decisionBySource.get('SRC-FAILURE-001') === 'advance_extraction_gap' &&
      decisionBySource.get('SRC-MATURITY-001') === 'advance_maturity_gap' &&
      decisionBySource.get('SRC-DEFERRED-001') === 'deferred_with_blocker' &&
      snapshot.summary.unresolvedDecisionCount === 0 &&
      snapshot.summary.routedDecisionCount === 2,
    summary: snapshot.summary,
    rows: snapshot.rows,
  }
}
