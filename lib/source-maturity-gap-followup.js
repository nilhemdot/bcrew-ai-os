export const SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID = 'SOURCE-MATURITY-GAP-FOLLOWUP-001'
export const SOURCE_MATURITY_GAP_FOLLOWUP_CLOSEOUT_KEY = 'source-maturity-gap-followup-v1'
export const SOURCE_MATURITY_GAP_FOLLOWUP_PLAN_PATH = 'docs/process/source-maturity-gap-followup-001-plan.md'
export const SOURCE_MATURITY_GAP_FOLLOWUP_APPROVAL_PATH = 'docs/process/approvals/SOURCE-MATURITY-GAP-FOLLOWUP-001.json'
export const SOURCE_MATURITY_GAP_FOLLOWUP_SCRIPT_PATH = 'scripts/process-source-maturity-gap-followup-check.mjs'
export const SOURCE_MATURITY_GAP_FOLLOWUP_REPORT_PATH = 'docs/handoffs/2026-05-18-source-maturity-gap-followup-triage.md'
export const SOURCE_MATURITY_GAP_FOLLOWUP_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-source-maturity-gap-followup-closeout.md'
export const SOURCE_MATURITY_GAP_FOLLOWUP_SPRINT_ID = 'source-maturity-gap-followup-2026-05-18'

export const SOURCE_MATURITY_GAP_FOLLOWUP_CHILD_CARDS = [
  {
    id: 'SOURCE-MATURITY-ATOM-FLOW-REPAIR-001',
    title: 'Repair source maturity atom-flow gaps',
    bucket: 'atom_flow_repair',
    priority: 'P1',
    summary: 'Scope source-backed atom-flow repair for extracted sources whose atomized stage is stale or missing, without live extraction.',
  },
  {
    id: 'SOURCE-MATURITY-CONTRACT-GAP-REPAIR-001',
    title: 'Repair source maturity contract gaps',
    bucket: 'source_contract_repair',
    priority: 'P1',
    summary: 'Fix source-contract identity gaps that block source maturity even when downstream evidence exists.',
  },
  {
    id: 'SOURCE-MATURITY-EVIDENCE-GAP-REPAIR-001',
    title: 'Repair source maturity evidence gaps',
    bucket: 'source_evidence_repair',
    priority: 'P1',
    summary: 'Attach existing source-backed evidence or source facts where maturity rows are missing extracted proof.',
  },
  {
    id: 'SOURCE-MATURITY-ROUTING-GAP-REPAIR-001',
    title: 'Repair source maturity routing gaps',
    bucket: 'routing_repair',
    priority: 'P1',
    summary: 'Route existing source-backed intelligence to decisions, backlog, questions, or owner actions without external writes.',
  },
]

export const SOURCE_MATURITY_GAP_FOLLOWUP_NOT_NEXT_BOUNDARIES = [
  'No live extraction, extraction target creation, transcript fetch, screenshot capture, crawl, or model summarization.',
  'No auth-required provider call, OAuth repair, paid-source run, or connector live call.',
  'No external write, Google Drive permission mutation, request-access email, ClickUp write, or Gmail send.',
  'Do not mutate Drive permissions.',
  'No live Agent Feedback auto-send.',
  'No Harlan, Fal, voice, Canva, OpenHuman, Marketing Hub production, or broad UI redesign.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'Do not mark source maturity rows complete from labels alone; every repair card needs source-backed evidence.',
]

export const SOURCE_MATURITY_GAP_FOLLOWUP_PROOF_COMMANDS = [
  'node --check lib/source-maturity-gap-followup.js scripts/process-source-maturity-gap-followup-check.mjs',
  'npm run process:source-maturity-gap-followup-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  `npm run process:foundation-ship -- --card=${SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID} --planApprovalRef=${SOURCE_MATURITY_GAP_FOLLOWUP_APPROVAL_PATH} --closeoutKey=${SOURCE_MATURITY_GAP_FOLLOWUP_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const SOURCE_MATURITY_GAP_FOLLOWUP_CHANGED_FILES = [
  'lib/source-maturity-gap-followup.js',
  'lib/foundation-verifier-source-once-over-progression.js',
  'lib/foundation-build-closeout-source-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'scripts/process-source-maturity-gap-followup-check.mjs',
  'package.json',
  SOURCE_MATURITY_GAP_FOLLOWUP_PLAN_PATH,
  SOURCE_MATURITY_GAP_FOLLOWUP_APPROVAL_PATH,
  SOURCE_MATURITY_GAP_FOLLOWUP_REPORT_PATH,
  SOURCE_MATURITY_GAP_FOLLOWUP_CLOSEOUT_PATH,
  'docs/rebuild/current-state.md',
  'docs/rebuild/current-plan.md',
]

const GAP_BUCKETS = [
  'atom_flow_repair',
  'source_contract_repair',
  'source_evidence_repair',
  'synthesis_repair',
  'routing_repair',
  'blocked_or_deferred',
]
const BUCKET_RANK = new Map(GAP_BUCKETS.map((bucket, index) => [bucket, index + 1]))
const GAP_RANK = new Map([
  ['connected', 1],
  ['trusted', 2],
  ['monitored', 3],
  ['extracted', 4],
  ['atomized', 5],
  ['synthesized', 6],
  ['routed', 7],
])

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function text(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function bySourceId(rows = []) {
  return new Map(list(rows).map(row => [row.sourceId || row.source_id, row]).filter(([sourceId]) => Boolean(sourceId)))
}

function countBy(rows = [], key) {
  return list(rows).reduce((acc, row) => {
    const value = row[key] || 'unknown'
    acc[value] = (acc[value] || 0) + 1
    return acc
  }, {})
}

function childCardForBucket(bucket) {
  return SOURCE_MATURITY_GAP_FOLLOWUP_CHILD_CARDS.find(card => card.bucket === bucket)?.id ||
    SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID
}

function bucketForGap(nextGap, row = {}) {
  if (row.deferred) return 'blocked_or_deferred'
  if (nextGap === 'connected' || nextGap === 'trusted' || nextGap === 'monitored') return 'source_contract_repair'
  if (nextGap === 'extracted') return 'source_evidence_repair'
  if (nextGap === 'atomized') return 'atom_flow_repair'
  if (nextGap === 'synthesized') return 'synthesis_repair'
  if (nextGap === 'routed') return 'routing_repair'
  return 'blocked_or_deferred'
}

function operatorActionFor(item) {
  if (item.bucket === 'atom_flow_repair') {
    return 'Use existing source-backed atoms, atom candidates, or KB compiler output to repair atom-flow truth; if no source-backed evidence exists, keep the source blocked instead of fabricating atoms.'
  }
  if (item.bucket === 'source_contract_repair') {
    return 'Repair the source contract or monitoring boundary from existing repo/DB truth; do not open a provider connection or OAuth flow.'
  }
  if (item.bucket === 'source_evidence_repair') {
    return 'Attach existing source-backed facts, archived artifacts, or documented manual evidence; do not start a live extraction run from this card.'
  }
  if (item.bucket === 'synthesis_repair') {
    return 'Route existing facts into the governed synthesis layer with citations and privacy tier intact.'
  }
  if (item.bucket === 'routing_repair') {
    return 'Route existing source-backed intelligence into the review/action layer without external writeback.'
  }
  return 'Keep blocked/deferred until a separate approved source or access decision changes the row.'
}

function notNextBoundaryFor(item) {
  if (item.bucket === 'blocked_or_deferred') return 'Do not repair this row until the blocker is removed by a separate approved card.'
  if (item.nextGap === 'extracted') return 'Do not start extraction; only attach existing source-backed evidence or scope a separate approved extraction card.'
  if (item.nextGap === 'atomized') return 'Do not create atoms without source evidence, citations, and the KB/source quality gates.'
  if (item.nextGap === 'routed') return 'Do not write to external systems; route only to internal review/backlog/decision surfaces.'
  return 'Do not call providers, repair auth, mutate Drive permissions, or run paid/auth-required work from this maturity follow-up.'
}

function maturityRowsNeedingFollowup(sourceCoverageCloseout = {}) {
  return list(sourceCoverageCloseout.rows).filter(row =>
    row.decision === 'advance_maturity_gap' &&
      row.nextCardId === SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID
  )
}

export function buildSourceMaturityGapFollowupSnapshot({
  sourceCoverageCloseout = {},
  sourceMaturityGrid = {},
  generatedAt = new Date().toISOString(),
} = {}) {
  const maturityMap = bySourceId(sourceMaturityGrid.rows)
  const closeoutRows = maturityRowsNeedingFollowup(sourceCoverageCloseout)

  const triageItems = closeoutRows.map(row => {
    const maturityRow = maturityMap.get(row.sourceId) || {}
    const nextGap = row.maturityNextGap || maturityRow.nextGap || 'unknown'
    const bucket = bucketForGap(nextGap, maturityRow)
    const item = {
      rank: 0,
      sourceId: row.sourceId,
      title: row.title || maturityRow.title || row.sourceId,
      unitName: row.unitName || maturityRow.unitName || '',
      nextGap,
      bucket,
      proposedNextCard: childCardForBucket(bucket),
      closeoutDecision: row.decision,
      extractionState: row.extractionState,
      reason: row.reason || maturityRow.stages?.[nextGap]?.detail || '',
      stageDetail: maturityRow.stages?.[nextGap]?.detail || row.reason || '',
      evidenceRefs: Array.from(new Set([
        ...list(row.evidenceRefs),
        ...list(maturityRow.stages?.[nextGap]?.evidenceRefs),
      ])),
      atomFlowStatus: maturityRow.atomFlow?.status || '',
      metrics: maturityRow.metrics || {},
    }
    item.operatorAction = operatorActionFor(item)
    item.notNextBoundary = notNextBoundaryFor(item)
    return item
  }).sort((a, b) => {
    const bucketDelta = (BUCKET_RANK.get(a.bucket) || 99) - (BUCKET_RANK.get(b.bucket) || 99)
    if (bucketDelta) return bucketDelta
    const gapDelta = (GAP_RANK.get(a.nextGap) || 99) - (GAP_RANK.get(b.nextGap) || 99)
    if (gapDelta) return gapDelta
    return a.sourceId.localeCompare(b.sourceId)
  }).map((item, index) => ({ ...item, rank: index + 1 }))

  const triageIds = new Set(triageItems.map(item => item.sourceId))
  const missingMaturitySourceIds = closeoutRows
    .map(row => row.sourceId)
    .filter(sourceId => !triageIds.has(sourceId))

  return {
    generatedAt,
    cardId: SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID,
    closeoutKey: SOURCE_MATURITY_GAP_FOLLOWUP_CLOSEOUT_KEY,
    reportPath: SOURCE_MATURITY_GAP_FOLLOWUP_REPORT_PATH,
    summary: {
      sourceCount: Number(sourceCoverageCloseout.summary?.sourceCount || list(sourceCoverageCloseout.rows).length || 0),
      maturityFollowupRows: closeoutRows.length,
      triageItemCount: triageItems.length,
      missingMaturitySourceIds,
      bucketCounts: countBy(triageItems, 'bucket'),
      nextGapCounts: countBy(triageItems, 'nextGap'),
      childCardCount: SOURCE_MATURITY_GAP_FOLLOWUP_CHILD_CARDS.length,
      noLiveExtractionStarted: true,
    },
    childCards: SOURCE_MATURITY_GAP_FOLLOWUP_CHILD_CARDS,
    triageItems,
    nonMaturityRows: list(sourceCoverageCloseout.rows)
      .filter(row => row.nextCardId !== SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID)
      .map(row => ({
        sourceId: row.sourceId,
        decision: row.decision,
        nextCardId: row.nextCardId,
        reason: row.reason,
      })),
  }
}

export function findMissingMaturityGapSourceIds(snapshot = {}, sourceCoverageCloseout = {}) {
  const actual = new Set(list(snapshot.triageItems).map(item => item.sourceId))
  return maturityRowsNeedingFollowup(sourceCoverageCloseout)
    .map(row => row.sourceId)
    .filter(sourceId => !actual.has(sourceId))
}

export function buildSyntheticSourceMaturityGapFollowupProof() {
  const sourceCoverageCloseout = {
    summary: { sourceCount: 5 },
    rows: [
      { sourceId: 'SRC-ATOM-001', title: 'Atom', maturityNextGap: 'atomized', extractionState: 'not_required', decision: 'advance_maturity_gap', nextCardId: SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID, reason: 'No atoms.' },
      { sourceId: 'SRC-CONTRACT-001', title: 'Contract', maturityNextGap: 'connected', extractionState: 'last_success', decision: 'advance_maturity_gap', nextCardId: SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID, reason: 'Gap contract.' },
      { sourceId: 'SRC-EVIDENCE-001', title: 'Evidence', maturityNextGap: 'extracted', extractionState: 'not_required', decision: 'advance_maturity_gap', nextCardId: SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID, reason: 'No facts.' },
      { sourceId: 'SRC-ROUTE-001', title: 'Route', maturityNextGap: 'routed', extractionState: 'last_success', decision: 'advance_maturity_gap', nextCardId: SOURCE_MATURITY_GAP_FOLLOWUP_CARD_ID, reason: 'No action route.' },
      { sourceId: 'SRC-OTHER-001', title: 'Other', maturityNextGap: 'complete', extractionState: 'last_success', decision: 'covered_for_v1', nextCardId: null, reason: 'Covered.' },
    ],
  }
  const sourceMaturityGrid = {
    rows: [
      { sourceId: 'SRC-ATOM-001', nextGap: 'atomized', stages: { atomized: { detail: 'No atoms.', evidenceRefs: ['synthetic-atoms'] } }, atomFlow: { status: 'stale' } },
      { sourceId: 'SRC-CONTRACT-001', nextGap: 'connected', stages: { connected: { detail: 'No usable source contract.' } } },
      { sourceId: 'SRC-EVIDENCE-001', nextGap: 'extracted', stages: { extracted: { detail: 'No extracted evidence.' } } },
      { sourceId: 'SRC-ROUTE-001', nextGap: 'routed', stages: { routed: { detail: 'No route.' } } },
    ],
  }
  const snapshot = buildSourceMaturityGapFollowupSnapshot({ sourceCoverageCloseout, sourceMaturityGrid })
  const removed = snapshot.triageItems[0]
  const missingMaturitySourceIds = findMissingMaturityGapSourceIds({
    ...snapshot,
    triageItems: snapshot.triageItems.filter(item => item.sourceId !== removed.sourceId),
  }, sourceCoverageCloseout)
  return {
    ok: snapshot.summary.triageItemCount === 4 &&
      snapshot.summary.maturityFollowupRows === 4 &&
      snapshot.summary.bucketCounts.atom_flow_repair === 1 &&
      snapshot.summary.bucketCounts.source_contract_repair === 1 &&
      snapshot.summary.bucketCounts.source_evidence_repair === 1 &&
      snapshot.summary.bucketCounts.routing_repair === 1 &&
      missingMaturitySourceIds.includes(removed.sourceId),
    snapshot,
    removedSourceId: removed.sourceId,
    missingMaturitySourceIds,
  }
}

export function renderSourceMaturityGapTriageReport(snapshot = {}) {
  const lines = []
  lines.push('# Source Maturity Gap Follow-Up Triage - 2026-05-18')
  lines.push('')
  lines.push('This report is triage and scoped follow-up only. It does not start live extraction, create extraction targets, call providers, repair OAuth, mutate Drive permissions, run paid/auth-required work, send Agent Feedback, or write to external systems.')
  lines.push('')
  lines.push('## Summary')
  lines.push('')
  lines.push(`- Source coverage rows: ${snapshot.summary?.sourceCount || 0}`)
  lines.push(`- Maturity follow-up rows: ${snapshot.summary?.maturityFollowupRows || 0}`)
  lines.push(`- Triage items: ${snapshot.summary?.triageItemCount || 0}`)
  lines.push(`- Missing maturity source IDs: ${list(snapshot.summary?.missingMaturitySourceIds).join(', ') || 'none'}`)
  lines.push(`- Buckets: ${Object.entries(snapshot.summary?.bucketCounts || {}).map(([key, value]) => `${key}=${value}`).join(', ') || 'none'}`)
  lines.push(`- Next gaps: ${Object.entries(snapshot.summary?.nextGapCounts || {}).map(([key, value]) => `${key}=${value}`).join(', ') || 'none'}`)
  lines.push('')
  lines.push('## Scoped Follow-Up Cards')
  lines.push('')
  for (const card of list(snapshot.childCards)) {
    lines.push(`- ${card.id} (${card.priority}) - ${card.summary}`)
  }
  lines.push('')
  lines.push('## Ranked Maturity Gaps')
  lines.push('')
  lines.push('| Rank | Bucket | Source | Next gap | Proposed next | Reason |')
  lines.push('| --- | --- | --- | --- | --- | --- |')
  for (const item of list(snapshot.triageItems)) {
    lines.push(`| ${item.rank} | ${item.bucket} | ${item.sourceId} | ${item.nextGap} | ${item.proposedNextCard} | ${text(item.reason).replaceAll('|', '/') || 'none'} |`)
  }
  lines.push('')
  lines.push('## Operator Actions')
  lines.push('')
  for (const item of list(snapshot.triageItems)) {
    lines.push(`- ${item.sourceId}: ${item.operatorAction}`)
  }
  lines.push('')
  lines.push('## Not-Next Boundaries')
  lines.push('')
  for (const item of list(snapshot.triageItems)) {
    lines.push(`- ${item.sourceId}: ${item.notNextBoundary}`)
  }
  lines.push('')
  return `${lines.join('\n')}\n`
}
