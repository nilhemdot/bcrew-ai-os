export const DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_CARD_ID = 'DEV-HUB-PROPOSED-CARD-SOURCE-PROOF-READBACK-001'
export const DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_CLOSEOUT_KEY = 'dev-hub-proposed-card-source-proof-readback-v1'
export const DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_PLAN_PATH = 'docs/process/dev-hub-proposed-card-source-proof-readback-001-plan.md'
export const DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_APPROVAL_PATH = 'docs/process/approvals/DEV-HUB-PROPOSED-CARD-SOURCE-PROOF-READBACK-001.json'
export const DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_SCRIPT_PATH = 'scripts/process-dev-hub-proposed-card-source-proof-readback-check.mjs'
export const DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_CONTRACT_VERSION = 'dev-hub-proposed-card-source-proof-readback.v1'
export const DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_VISIBLE_HOME = 'Dev Hub > Data Pool > Proposed Card Source Proof'

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function count(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function toIso(value) {
  if (value instanceof Date) return value.toISOString()
  const date = new Date(value || '')
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

function truncate(value, maxChars = 200) {
  const normalized = text(value)
  if (normalized.length <= maxChars) return normalized
  return `${normalized.slice(0, Math.max(0, maxChars - 3)).trim()}...`
}

function buildBoundaries() {
  return {
    readOnly: true,
    sourceProofOnly: true,
    approvalRequired: true,
    noCardCreate: true,
    noBacklogMutation: true,
    noScoperMutation: true,
    noPortfolioMutation: true,
    noCurrentSprintMutation: true,
    noApprovalMutation: true,
    noRouteMutation: true,
    noDestinationMutation: true,
    noHarlanSend: true,
    noLiveExtraction: true,
    noConnectorProbe: true,
    noBrowserSession: true,
    noModelCalls: true,
    noExternalWrites: true,
    noAutoBuild: true,
    noAutoBacklogPromotion: true,
    noAutoPromoteRecommendations: true,
  }
}

function byTextKey(rows = [], keyFn = item => item) {
  const index = new Map()
  for (const row of list(rows)) {
    const key = text(keyFn(row))
    if (key && !index.has(key)) index.set(key, row)
  }
  return index
}

function proofCandidate(candidate = {}) {
  return {
    candidateId: text(candidate.candidateId),
    title: truncate(candidate.title || candidate.candidateId || 'Scoped candidate', 150),
    sourceTrustLabel: text(candidate.sourceTrustLabel || 'standard_report'),
    sourceReportArtifactId: text(candidate.sourceReportArtifactId),
    sourceVideoId: text(candidate.sourceVideoId),
    rawReportArtifactId: text(candidate.rawReportArtifactId),
    rawAtomId: text(candidate.rawAtomId),
    rawHitId: text(candidate.rawHitId),
    directorAtomId: text(candidate.directorAtomId),
    directorHitId: text(candidate.directorHitId),
    sourceTraceStatus: text(candidate.sourceTraceStatus || 'missing'),
    scoperStatus: text(candidate.scoperStatus || 'missing'),
    readyForPortfolio: candidate.readyForPortfolio === true,
  }
}

function proofRow({
  approvalRow = {},
  proposedCard = {},
  portfolioGroup = {},
  candidateRows = [],
  index = 0,
} = {}) {
  const candidateProofs = list(candidateRows)
    .filter(candidate => text(candidate.portfolioGroupId) === text(approvalRow.sourcePortfolioGroupId))
    .map(proofCandidate)
  const lineage = [
    ...list(portfolioGroup.sourceLineagePreview),
    ...list(proposedCard.sourceLineagePreview),
    ...list(approvalRow.sourceLineagePreview),
  ].map(item => text(item)).filter(Boolean)
  return {
    proofItemId: `proposed-card-source-proof:${text(approvalRow.proposedCardId) || index + 1}`,
    rank: index + 1,
    proposedCardId: text(approvalRow.proposedCardId),
    approvalItemId: text(approvalRow.approvalItemId),
    title: truncate(approvalRow.title || proposedCard.title || 'Proposed card source proof', 150),
    sourcePortfolioGroupId: text(approvalRow.sourcePortfolioGroupId),
    portfolioRank: count(portfolioGroup.portfolioRank || approvalRow.portfolioRank),
    portfolioScore: count(portfolioGroup.portfolioScore || approvalRow.portfolioScore),
    portfolioDecision: text(portfolioGroup.decision),
    portfolioLane: text(portfolioGroup.lane || proposedCard.proposedLane),
    groupCandidateCount: count(portfolioGroup.candidateCount),
    candidateProofCount: candidateProofs.length,
    sourceLineageCount: count(portfolioGroup.sourceLineageCount || approvalRow.sourceLineageCount || proposedCard.sourceLineageCount),
    sourceLineagePreview: Array.from(new Set(lineage)).slice(0, 10),
    candidateProofs,
    approvalGateState: text(approvalRow.approvalGateState || 'awaiting_steve_exact_approval'),
    approvalPhrase: text(approvalRow.approvalPhrase),
    proofStatus: candidateProofs.length && lineage.length ? 'source_proof_ready' : 'source_proof_missing',
    status: 'read_only_source_proof',
    cardCreatedNow: false,
    backlogWrittenNow: false,
    scoperWrittenNow: false,
    portfolioWrittenNow: false,
    sprintOpenedNow: false,
    buildAuthorizedNow: false,
    routeMutatedNow: false,
    destinationMutatedNow: false,
    harlanSentNow: false,
    externalWriteNow: false,
  }
}

function buildSummary(rows = []) {
  const lineageRefs = new Set(rows.flatMap(row => list(row.sourceLineagePreview)))
  return {
    proofItemCount: rows.length,
    sourceProofReadyCount: rows.filter(row => row.proofStatus === 'source_proof_ready').length,
    missingProofCount: rows.filter(row => row.proofStatus !== 'source_proof_ready').length,
    candidateProofRowCount: rows.reduce((total, row) => total + list(row.candidateProofs).length, 0),
    sourceLineageRefCount: lineageRefs.size,
    cardsCreatedByReadback: 0,
    backlogRecordsWrittenByReadback: 0,
    scoperRecordsWrittenByReadback: 0,
    portfolioRecordsWrittenByReadback: 0,
    currentSprintOpenedByReadback: 0,
    approvalRecordsWrittenByReadback: 0,
    routeRecordsMutatedByReadback: 0,
    destinationRecordsMutatedByReadback: 0,
    harlanSendsByReadback: 0,
    buildAuthorizationsByReadback: 0,
    extractionRunsStarted: 0,
    connectorProbesStarted: 0,
    browserSessionsStarted: 0,
    modelCallsStarted: 0,
    externalWritesByReadback: 0,
  }
}

function buildPlainEnglish(summary = {}) {
  if (count(summary.proofItemCount) <= 0) return 'No proposed-card source proof rows are visible.'
  return `${count(summary.proofItemCount)} proposed-card proof row(s) are visible with ${count(summary.candidateProofRowCount)} raw candidate proof row(s) and ${count(summary.sourceLineageRefCount)} source-lineage ref(s). This readback created ${count(summary.cardsCreatedByReadback)} card(s) and authorized ${count(summary.buildAuthorizationsByReadback)} build(s).`
}

export function buildDevHubProposedCardSourceProofReadback({
  generatedAt = new Date().toISOString(),
  buildPortfolioReadback = {},
  morningProposedCardsReadback = {},
  proposedCardApprovalPreflight = {},
  maxRows = 6,
} = {}) {
  const groupsById = byTextKey(buildPortfolioReadback.groups, group => group.groupId)
  const cardsById = byTextKey(morningProposedCardsReadback.proposedCards, card => card.proposedCardId)
  const candidateRows = list(buildPortfolioReadback.candidateRows)
  const rows = list(proposedCardApprovalPreflight.approvalRows)
    .slice(0, maxRows)
    .map((approvalRow, index) => proofRow({
      approvalRow,
      proposedCard: cardsById.get(text(approvalRow.proposedCardId)) || {},
      portfolioGroup: groupsById.get(text(approvalRow.sourcePortfolioGroupId)) || {},
      candidateRows,
      index,
    }))
  const summary = buildSummary(rows)
  const failures = []
  if (buildPortfolioReadback.ok !== true) failures.push('build_portfolio_readback_not_healthy')
  if (morningProposedCardsReadback.ok !== true) failures.push('morning_proposed_cards_not_healthy')
  if (proposedCardApprovalPreflight.ok !== true) failures.push('approval_preflight_not_healthy')
  if (!rows.length) failures.push('no_source_proof_rows')
  if (rows.length > maxRows) failures.push('source_proof_rows_unbounded')
  if (summary.missingProofCount !== 0) failures.push('source_proof_missing')
  if (summary.candidateProofRowCount < rows.length) failures.push('candidate_proof_missing')
  if (summary.sourceLineageRefCount < rows.length) failures.push('source_lineage_missing')
  if (rows.some(row => !text(row.proposedCardId) || !text(row.sourcePortfolioGroupId) || !text(row.approvalPhrase))) failures.push('proof_context_missing')
  if (rows.some(row => list(row.candidateProofs).some(candidate => !text(candidate.rawAtomId) || !text(candidate.rawHitId) || candidate.readyForPortfolio !== true))) failures.push('candidate_raw_trace_missing')
  if (rows.some(row => row.cardCreatedNow || row.backlogWrittenNow || row.scoperWrittenNow || row.portfolioWrittenNow || row.sprintOpenedNow || row.buildAuthorizedNow)) failures.push('card_or_build_mutated_by_readback')
  if (rows.some(row => row.routeMutatedNow || row.destinationMutatedNow || row.harlanSentNow || row.externalWriteNow)) failures.push('route_or_external_mutated_by_readback')
  if (summary.cardsCreatedByReadback !== 0 || summary.backlogRecordsWrittenByReadback !== 0 || summary.currentSprintOpenedByReadback !== 0 || summary.buildAuthorizationsByReadback !== 0) failures.push('card_or_build_mutated_by_readback')
  if (summary.scoperRecordsWrittenByReadback !== 0 || summary.portfolioRecordsWrittenByReadback !== 0 || summary.approvalRecordsWrittenByReadback !== 0) failures.push('foundation_records_written_by_readback')
  if (summary.routeRecordsMutatedByReadback !== 0 || summary.destinationRecordsMutatedByReadback !== 0) failures.push('route_or_destination_mutated_by_readback')
  if (summary.harlanSendsByReadback !== 0 || summary.externalWritesByReadback !== 0) failures.push('external_write_by_readback')
  if (summary.extractionRunsStarted !== 0 || summary.connectorProbesStarted !== 0 || summary.browserSessionsStarted !== 0 || summary.modelCallsStarted !== 0) failures.push('runtime_started_by_readback')

  return {
    ok: failures.length === 0,
    status: failures.length ? 'fail_closed' : 'source_proof_ready',
    contractVersion: DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_CONTRACT_VERSION,
    cardId: DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_CARD_ID,
    closeoutKey: DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_CLOSEOUT_KEY,
    generatedAt: toIso(generatedAt),
    visibleHome: DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_VISIBLE_HOME,
    source: {
      reusedTruthLayers: [
        'buildPortfolioReadback',
        'morningProposedCardsReadback',
        'proposedCardApprovalPreflight',
      ],
      noSecondTruthLayer: true,
    },
    summary,
    plainEnglish: buildPlainEnglish(summary),
    proofRows: rows,
    boundaries: buildBoundaries(),
    failures: Array.from(new Set(failures)),
  }
}

export function validateDevHubProposedCardSourceProofReadback(snapshot = {}) {
  const failures = []
  if (snapshot.ok !== true) failures.push(...list(snapshot.failures))
  if (snapshot.status !== 'source_proof_ready') failures.push('status_not_source_proof_ready')
  if (snapshot.contractVersion !== DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_CONTRACT_VERSION) failures.push('contract_version_missing')
  if (snapshot.cardId !== DEV_HUB_PROPOSED_CARD_SOURCE_PROOF_READBACK_CARD_ID) failures.push('card_id_mismatch')
  if (snapshot.source?.noSecondTruthLayer !== true) failures.push('source_layer_mismatch')
  for (const layer of ['buildPortfolioReadback', 'morningProposedCardsReadback', 'proposedCardApprovalPreflight']) {
    if (!list(snapshot.source?.reusedTruthLayers).includes(layer)) failures.push(`source_layer_missing:${layer}`)
  }
  const boundaries = snapshot.boundaries || {}
  for (const key of ['readOnly', 'sourceProofOnly', 'approvalRequired', 'noCardCreate', 'noBacklogMutation', 'noScoperMutation', 'noPortfolioMutation', 'noCurrentSprintMutation', 'noApprovalMutation', 'noRouteMutation', 'noDestinationMutation', 'noHarlanSend', 'noLiveExtraction', 'noConnectorProbe', 'noBrowserSession', 'noModelCalls', 'noExternalWrites', 'noAutoBuild', 'noAutoBacklogPromotion', 'noAutoPromoteRecommendations']) {
    if (boundaries[key] !== true) failures.push(`boundary_missing:${key}`)
  }
  const rows = list(snapshot.proofRows)
  if (!rows.length) failures.push('no_source_proof_rows')
  if (rows.length > 6) failures.push('source_proof_rows_unbounded')
  if (count(snapshot.summary?.proofItemCount) !== rows.length) failures.push('proof_count_mismatch')
  if (count(snapshot.summary?.sourceProofReadyCount) !== rows.length || count(snapshot.summary?.missingProofCount) !== 0) failures.push('source_proof_missing')
  if (count(snapshot.summary?.candidateProofRowCount) < rows.length) failures.push('candidate_proof_missing')
  if (count(snapshot.summary?.sourceLineageRefCount) < rows.length) failures.push('source_lineage_missing')
  for (const row of rows) {
    if (row.status !== 'read_only_source_proof' || row.proofStatus !== 'source_proof_ready') failures.push('source_proof_missing')
    if (!text(row.proposedCardId) || !text(row.sourcePortfolioGroupId) || !text(row.approvalPhrase)) failures.push('proof_context_missing')
    if (count(row.sourceLineageCount) < 1 || !list(row.sourceLineagePreview).length) failures.push('source_lineage_missing')
    const candidates = list(row.candidateProofs)
    if (!candidates.length) failures.push('candidate_proof_missing')
    for (const candidate of candidates) {
      if (!text(candidate.rawAtomId) || !text(candidate.rawHitId) || candidate.readyForPortfolio !== true) failures.push('candidate_raw_trace_missing')
    }
    if (row.cardCreatedNow || row.backlogWrittenNow || row.scoperWrittenNow || row.portfolioWrittenNow || row.sprintOpenedNow || row.buildAuthorizedNow) failures.push('card_or_build_mutated_by_readback')
    if (row.routeMutatedNow || row.destinationMutatedNow || row.harlanSentNow || row.externalWriteNow) failures.push('route_or_external_mutated_by_readback')
  }
  if (count(snapshot.summary?.cardsCreatedByReadback) !== 0 || count(snapshot.summary?.backlogRecordsWrittenByReadback) !== 0 || count(snapshot.summary?.currentSprintOpenedByReadback) !== 0 || count(snapshot.summary?.buildAuthorizationsByReadback) !== 0) failures.push('card_or_build_mutated_by_readback')
  if (count(snapshot.summary?.scoperRecordsWrittenByReadback) !== 0 || count(snapshot.summary?.portfolioRecordsWrittenByReadback) !== 0 || count(snapshot.summary?.approvalRecordsWrittenByReadback) !== 0) failures.push('foundation_records_written_by_readback')
  if (count(snapshot.summary?.routeRecordsMutatedByReadback) !== 0 || count(snapshot.summary?.destinationRecordsMutatedByReadback) !== 0) failures.push('route_or_destination_mutated_by_readback')
  if (count(snapshot.summary?.harlanSendsByReadback) !== 0 || count(snapshot.summary?.externalWritesByReadback) !== 0) failures.push('external_write_by_readback')
  if (count(snapshot.summary?.extractionRunsStarted) !== 0 || count(snapshot.summary?.connectorProbesStarted) !== 0 || count(snapshot.summary?.browserSessionsStarted) !== 0 || count(snapshot.summary?.modelCallsStarted) !== 0) failures.push('runtime_started_by_readback')
  if (!text(snapshot.plainEnglish)) failures.push('plain_english_missing')
  return {
    ok: failures.length === 0,
    failures: Array.from(new Set(failures)),
    summary: snapshot.summary || {},
  }
}

export function buildDevHubProposedCardSourceProofReadbackDogfoodProof() {
  const buildPortfolioReadback = {
    ok: true,
    groups: [
      {
        groupId: 'portfolio:agent-runtime:one+two',
        portfolioRank: 1,
        portfolioScore: 100,
        decision: 'merged_enhanced_build_opportunity',
        lane: 'agent-runtime',
        candidateCount: 1,
        sourceLineageCount: 2,
        sourceLineagePreview: ['atom:one', 'hit:two'],
      },
    ],
    candidateRows: [
      {
        candidateId: 'SCOPED-ONE',
        title: 'Signal Framework Automation Engine',
        portfolioGroupId: 'portfolio:agent-runtime:one+two',
        rawAtomId: 'atom:one',
        rawHitId: 'hit:two',
        sourceTraceStatus: 'source_trace_ready',
        scoperStatus: 'ready_for_portfolio',
        readyForPortfolio: true,
      },
    ],
  }
  const morningProposedCardsReadback = {
    ok: true,
    proposedCards: [
      {
        proposedCardId: 'DRAFT-MERGED-AGENT-RUNTIME-UPGRADE-001',
        sourcePortfolioGroupId: 'portfolio:agent-runtime:one+two',
        title: 'Merged Agent Runtime Upgrade',
        sourceLineageCount: 2,
        sourceLineagePreview: ['atom:one', 'hit:two'],
      },
    ],
  }
  const proposedCardApprovalPreflight = {
    ok: true,
    approvalRows: [
      {
        approvalItemId: 'proposed-card-approval:DRAFT-MERGED-AGENT-RUNTIME-UPGRADE-001',
        proposedCardId: 'DRAFT-MERGED-AGENT-RUNTIME-UPGRADE-001',
        sourcePortfolioGroupId: 'portfolio:agent-runtime:one+two',
        title: 'Merged Agent Runtime Upgrade',
        portfolioRank: 1,
        portfolioScore: 100,
        sourceLineageCount: 2,
        sourceLineagePreview: ['atom:one', 'hit:two'],
        approvalPhrase: 'Approve DRAFT-MERGED-AGENT-RUNTIME-UPGRADE-001 for backlog-card creation only; do not authorize implementation.',
      },
    ],
  }
  const snapshot = buildDevHubProposedCardSourceProofReadback({
    generatedAt: '2026-05-31T09:15:00.000Z',
    buildPortfolioReadback,
    morningProposedCardsReadback,
    proposedCardApprovalPreflight,
  })
  const validation = validateDevHubProposedCardSourceProofReadback(snapshot)
  const unsafeMissingTrace = {
    ...snapshot,
    proofRows: snapshot.proofRows.map(row => ({
      ...row,
      candidateProofs: row.candidateProofs.map(candidate => ({
        ...candidate,
        rawAtomId: '',
      })),
    })),
  }
  const unsafeValidation = validateDevHubProposedCardSourceProofReadback(unsafeMissingTrace)
  return {
    ok: validation.ok === true && unsafeValidation.ok === false &&
      unsafeValidation.failures.includes('candidate_raw_trace_missing'),
    snapshot,
    validation,
    unsafeValidation,
    invariant: 'source proof must fail if candidate raw atom/hit trace disappears',
  }
}
