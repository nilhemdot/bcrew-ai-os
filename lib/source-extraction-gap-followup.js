export const SOURCE_EXTRACTION_GAP_FOLLOWUP_CARD_ID = 'SOURCE-EXTRACTION-GAP-FOLLOWUP-001'
export const SOURCE_EXTRACTION_GAP_FOLLOWUP_CLOSEOUT_KEY = 'source-extraction-gap-followup-v1'
export const SOURCE_EXTRACTION_GAP_FOLLOWUP_PLAN_PATH = 'docs/process/source-extraction-gap-followup-001-plan.md'
export const SOURCE_EXTRACTION_GAP_FOLLOWUP_APPROVAL_PATH = 'docs/process/approvals/SOURCE-EXTRACTION-GAP-FOLLOWUP-001.json'
export const SOURCE_EXTRACTION_GAP_FOLLOWUP_SCRIPT_PATH = 'scripts/process-source-extraction-gap-followup-check.mjs'
export const SOURCE_EXTRACTION_GAP_FOLLOWUP_REPORT_PATH = 'docs/handoffs/2026-05-13-source-extraction-gap-triage.md'

export const SOURCE_EXTRACTION_GAP_NEXT_SPRINT_CANDIDATES = [
  {
    cardId: 'ATOM-FLOW-AUTO-DEMOTION-001',
    priority: 'P0',
    reason: 'Atom-gap rows prove maturity labels need automatic demotion before product loops trust source state.',
  },
  {
    cardId: 'EXTRACT-RUN-HARDENING-EXECUTION-001',
    priority: 'P0',
    reason: 'Extraction retry/backoff execution should run before new source lanes expand the failure surface.',
  },
  {
    cardId: 'RESEARCH-LANE-PURGE-001',
    priority: 'P1',
    reason: 'The parked research lane should be reviewed before more proposed source cards accumulate.',
  },
]

const TRIAGE_BUCKETS = ['safe_next', 'sprint_2_candidate', 'needs_steve_access', 'blocked', 'not_required']
const BUCKET_RANK = new Map(TRIAGE_BUCKETS.map((bucket, index) => [bucket, index + 1]))
const DECISION_RANK = new Map([
  ['atom_gap', 1],
  ['missing_extraction', 2],
  ['routing_gap', 3],
  ['missing_contract', 4],
  ['blocked', 5],
  ['missing_connector', 6],
  ['synthesis_gap', 7],
  ['connected', 99],
])

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function normalizeText(value) {
  return String(value || '').trim()
}

function lower(value) {
  return normalizeText(value).toLowerCase()
}

function needsSteve(row) {
  const text = lower(`${row.blockedReason || ''} ${row.credentialBlockerReason || ''} ${row.label || ''}`)
  return [
    'access',
    'auth',
    'oauth',
    'paid',
    'policy',
    'owner',
    'user',
    'never connected',
    'logged-in',
    'reauth',
  ].some(fragment => text.includes(fragment))
}

function proposedCardFor(row) {
  if (row.decision === 'atom_gap') return 'ATOM-FLOW-AUTO-DEMOTION-001'
  if (row.decision === 'routing_gap') return 'SOURCE-HUB-ROUTING-GAP-REPAIR-001'
  if (row.decision === 'missing_contract') return 'SRC-CONTRACT-EXPANSION-001'
  if (row.decision === 'missing_extraction') return 'SOURCE-EXTRACTION-TARGET-SEED-001'
  if (row.decision === 'synthesis_gap') return 'SOURCE-SYNTHESIS-GAP-REPAIR-001'
  if (row.decision === 'missing_connector') return 'SOURCE-CONNECTOR-REGISTRY-GAP-001'
  if (row.key === 'google-ads') return 'SRC-GADS-OAUTH-REPAIR-001'
  if (row.key === 'socialpilot') return 'SRC-PUBLISH-AUTH-CONTEXT-001'
  if (row.key === 'real') return 'SRC-REAL-CONNECTION-001'
  if (row.key === 'skool-earlyaidopters') return 'SKOOL-ACCESS-MATRIX-001'
  if (row.key === 'loom') return 'SRC-LOOM-EXTRACTION-PATH-DECISION-001'
  if (row.key === 'mycro') return 'SRC-MYICRO-ACCESS-DECISION-001'
  return 'SOURCE-BLOCKER-DECISION-001'
}

function bucketFor(row) {
  if (row.decision === 'connected') return 'not_required'
  if (row.decision === 'atom_gap') return 'sprint_2_candidate'
  if (row.decision === 'missing_contract') return 'sprint_2_candidate'
  if (row.decision === 'routing_gap') return 'safe_next'
  if (row.decision === 'missing_extraction') {
    return row.credentialStatus === 'available' ? 'safe_next' : 'blocked'
  }
  if (row.decision === 'blocked') return needsSteve(row) ? 'needs_steve_access' : 'blocked'
  if (row.decision === 'missing_connector') return 'sprint_2_candidate'
  return 'blocked'
}

function notNextBoundaryFor(row, bucket) {
  if (bucket === 'safe_next') {
    return 'Next work may scope the smallest proof slice only; do not start broad ingestion or new external crawling from this triage card.'
  }
  if (bucket === 'sprint_2_candidate') {
    return 'Keep as next-sprint planning input; do not silently promote into the current sprint.'
  }
  if (bucket === 'needs_steve_access') {
    return 'Needs Steve/access/rights decision before any authenticated extraction, credential repair, or paid-community crawling.'
  }
  if (bucket === 'not_required') {
    return 'No current extraction-gap action required from this card.'
  }
  return 'Do not implement connector/auth/extraction repair until a separate approved card removes the blocker.'
}

function routingSummaryFor(routingMatrix = {}, sourceKey) {
  const row = normalizeList(routingMatrix.rows).find(item => item.sourceKey === sourceKey)
  if (!row) return { primaryRoutes: [], candidates: [], blocked: [] }
  return {
    primaryRoutes: normalizeList(row.primaryRoutes),
    candidates: normalizeList(row.candidates),
    blocked: normalizeList(row.blocked),
  }
}

function sourceNeedsTriage(row) {
  return row.decision !== 'connected' ||
    Boolean(row.blockedReason) ||
    row.credentialStatus === 'blocked' ||
    row.connectorState === 'missing'
}

export function buildSourceExtractionGapFollowupSnapshot({
  connectorMatrix = {},
  routingMatrix = {},
  generatedAt = new Date().toISOString(),
} = {}) {
  const matrixRows = normalizeList(connectorMatrix.rows)
  const rowsNeedingTriage = matrixRows.filter(sourceNeedsTriage)
  const triageItems = rowsNeedingTriage.map(row => {
    const bucket = bucketFor(row)
    const routes = routingSummaryFor(routingMatrix, row.key)
    return {
      rank: 0,
      bucket,
      sourceId: row.sourceId,
      connectorKey: row.key,
      connectorId: row.connectorId,
      label: row.label,
      currentMatrixState: row.decision,
      credentialStatus: row.credentialStatus,
      hasContract: row.hasContract,
      hasConnector: row.hasConnector,
      hasExtractionTarget: row.hasExtractionTarget,
      hasArtifacts: row.hasArtifacts,
      hasPromotedAtoms: row.hasPromotedAtoms,
      hasSynthesis: row.hasSynthesis,
      hasRouting: row.hasRouting,
      blockedReason: row.blockedReason || row.credentialBlockerReason || '',
      proposedNextCard: proposedCardFor(row),
      notNextBoundary: notNextBoundaryFor(row, bucket),
      primaryRoutes: routes.primaryRoutes,
      routingCandidates: routes.candidates,
      blockedHubs: routes.blocked,
    }
  }).sort((a, b) => {
    const bucketDelta = (BUCKET_RANK.get(a.bucket) || 99) - (BUCKET_RANK.get(b.bucket) || 99)
    if (bucketDelta) return bucketDelta
    const decisionDelta = (DECISION_RANK.get(a.currentMatrixState) || 99) - (DECISION_RANK.get(b.currentMatrixState) || 99)
    if (decisionDelta) return decisionDelta
    return a.sourceId.localeCompare(b.sourceId)
  }).map((item, index) => ({ ...item, rank: index + 1 }))

  const triageIds = new Set(triageItems.map(item => item.sourceId))
  const missingTriageSourceIds = rowsNeedingTriage
    .map(row => row.sourceId)
    .filter(sourceId => !triageIds.has(sourceId))
  const bucketCounts = triageItems.reduce((acc, item) => {
    acc[item.bucket] = (acc[item.bucket] || 0) + 1
    return acc
  }, {})
  const decisionCounts = triageItems.reduce((acc, item) => {
    acc[item.currentMatrixState] = (acc[item.currentMatrixState] || 0) + 1
    return acc
  }, {})

  return {
    generatedAt,
    cardId: SOURCE_EXTRACTION_GAP_FOLLOWUP_CARD_ID,
    closeoutKey: SOURCE_EXTRACTION_GAP_FOLLOWUP_CLOSEOUT_KEY,
    reportPath: SOURCE_EXTRACTION_GAP_FOLLOWUP_REPORT_PATH,
    summary: {
      connectorMatrixRows: matrixRows.length,
      rowsNeedingTriage: rowsNeedingTriage.length,
      triageItemCount: triageItems.length,
      missingTriageSourceIds,
      bucketCounts,
      decisionCounts,
      queuedNextSprintCandidateCount: SOURCE_EXTRACTION_GAP_NEXT_SPRINT_CANDIDATES.length,
      noExtractionStarted: true,
    },
    queuedNextSprintCandidates: SOURCE_EXTRACTION_GAP_NEXT_SPRINT_CANDIDATES,
    triageItems,
    connectedOrNoActionRows: matrixRows
      .filter(row => !sourceNeedsTriage(row))
      .map(row => ({
        sourceId: row.sourceId,
        connectorKey: row.key,
        label: row.label,
        currentMatrixState: row.decision,
        reason: 'Matrix currently has enough contract/connector/atom/synthesis/routing truth for this control-plane pass.',
      })),
  }
}

export function findMissingTriageSourceIds(snapshot = {}, connectorMatrix = {}) {
  const actual = new Set(normalizeList(snapshot.triageItems).map(item => item.sourceId))
  return normalizeList(connectorMatrix.rows)
    .filter(sourceNeedsTriage)
    .map(row => row.sourceId)
    .filter(sourceId => !actual.has(sourceId))
}

export function buildSyntheticMissingGapProof(snapshot = {}, connectorMatrix = {}) {
  const first = normalizeList(snapshot.triageItems)[0]
  if (!first) return { ok: false, missingSourceIds: [], removedSourceId: null }
  const synthetic = {
    ...snapshot,
    triageItems: normalizeList(snapshot.triageItems).filter(item => item.sourceId !== first.sourceId),
  }
  const missingSourceIds = findMissingTriageSourceIds(synthetic, connectorMatrix)
  return {
    ok: missingSourceIds.includes(first.sourceId),
    missingSourceIds,
    removedSourceId: first.sourceId,
  }
}

export function renderSourceExtractionGapTriageReport(snapshot = {}) {
  const lines = []
  lines.push('# Source Extraction Gap Triage - 2026-05-13')
  lines.push('')
  lines.push('This report is triage only. It does not start extraction jobs, repair credentials, crawl paid systems, mutate Drive permissions, or promote new source work into the current sprint.')
  lines.push('')
  lines.push('## Summary')
  lines.push('')
  lines.push(`- Connector matrix rows: ${snapshot.summary?.connectorMatrixRows || 0}`)
  lines.push(`- Rows needing triage: ${snapshot.summary?.rowsNeedingTriage || 0}`)
  lines.push(`- Triage items: ${snapshot.summary?.triageItemCount || 0}`)
  lines.push(`- Missing triage source IDs: ${normalizeList(snapshot.summary?.missingTriageSourceIds).join(', ') || 'none'}`)
  lines.push(`- Buckets: ${Object.entries(snapshot.summary?.bucketCounts || {}).map(([key, value]) => `${key}=${value}`).join(', ') || 'none'}`)
  lines.push('')
  lines.push('## Queued Next-Sprint Candidates')
  lines.push('')
  for (const candidate of normalizeList(snapshot.queuedNextSprintCandidates)) {
    lines.push(`- ${candidate.cardId} (${candidate.priority}) - ${candidate.reason}`)
  }
  lines.push('')
  lines.push('## Ranked Triage')
  lines.push('')
  lines.push('| Rank | Bucket | Source | State | Credential | Proposed next | Blocker |')
  lines.push('| --- | --- | --- | --- | --- | --- | --- |')
  for (const item of normalizeList(snapshot.triageItems)) {
    lines.push(`| ${item.rank} | ${item.bucket} | ${item.sourceId} / ${item.connectorKey} | ${item.currentMatrixState} | ${item.credentialStatus} | ${item.proposedNextCard} | ${normalizeText(item.blockedReason).replaceAll('|', '/') || 'none'} |`)
  }
  lines.push('')
  lines.push('## Not Next Boundaries')
  lines.push('')
  for (const item of normalizeList(snapshot.triageItems)) {
    lines.push(`- ${item.sourceId}: ${item.notNextBoundary}`)
  }
  lines.push('')
  return lines.join('\n')
}
