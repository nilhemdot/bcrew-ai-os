export const DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_CARD_ID = 'DEV-HUB-PROPOSED-CARD-APPROVAL-PREFLIGHT-001'
export const DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_CLOSEOUT_KEY = 'dev-hub-proposed-card-approval-preflight-v1'
export const DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_PLAN_PATH = 'docs/process/dev-hub-proposed-card-approval-preflight-001-plan.md'
export const DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_APPROVAL_PATH = 'docs/process/approvals/DEV-HUB-PROPOSED-CARD-APPROVAL-PREFLIGHT-001.json'
export const DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_SCRIPT_PATH = 'scripts/process-dev-hub-proposed-card-approval-preflight-check.mjs'
export const DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_CONTRACT_VERSION = 'dev-hub-proposed-card-approval-preflight.v1'
export const DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_VISIBLE_HOME = 'Dev Hub > Data Pool > Proposed Card Approval Preflight'

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

function truncate(value, maxChars = 220) {
  const normalized = text(value)
  if (normalized.length <= maxChars) return normalized
  return `${normalized.slice(0, Math.max(0, maxChars - 3)).trim()}...`
}

function buildBoundaries() {
  return {
    readOnly: true,
    preflightOnly: true,
    draftOnly: true,
    approvalRequired: true,
    exactApprovalRequired: true,
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

function approvalPhrase(card = {}) {
  const proposedCardId = text(card.proposedCardId || 'draft')
  return `Approve ${proposedCardId} for backlog-card creation only; do not authorize implementation.`
}

function preflightRow(card = {}, index = 0) {
  const proposedCardId = text(card.proposedCardId)
  return {
    approvalItemId: `proposed-card-approval:${proposedCardId || index + 1}`,
    rank: index + 1,
    proposedCardId,
    sourcePortfolioGroupId: text(card.sourcePortfolioGroupId),
    portfolioRank: count(card.portfolioRank),
    portfolioScore: count(card.portfolioScore),
    title: truncate(card.title || proposedCardId || 'Draft proposed card', 140),
    proposedPriority: text(card.proposedPriority || 'P2'),
    proposedOwner: text(card.proposedOwner || 'Dev Hub'),
    proposedLane: text(card.proposedLane || 'dev-hub'),
    summary: truncate(card.summary || 'Draft card proposal.', 240),
    whyItMatters: truncate(card.whyItMatters || card.summary || 'Source-backed Dev Hub proposal.', 260),
    sourceLineageCount: count(card.sourceLineageCount),
    sourceLineagePreview: list(card.sourceLineagePreview).map(item => text(item)).filter(Boolean).slice(0, 6),
    requiredFields: [
      'title',
      'owner',
      'priority',
      'sourcePortfolioGroupId',
      'sourceLineagePreview',
      'acceptanceCriteria',
      'proofPlan',
      'notNext',
    ],
    proofPlan: list(card.proofPlan).slice(0, 4),
    acceptanceCriteria: list(card.acceptanceCriteria).slice(0, 4),
    notNext: list(card.notNext).slice(0, 4),
    approvalPhrase: approvalPhrase(card),
    proposedMutationAfterApproval: 'create_backlog_card_only_after_exact_steve_approval',
    approvalGateState: 'awaiting_steve_exact_approval',
    status: 'approval_required',
    exactApprovalRequired: true,
    requiresSteveDecision: true,
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

function buildPlainEnglish(summary = {}) {
  if (count(summary.approvalItemCount) <= 0) {
    return 'No draft proposed cards are ready for exact approval preflight.'
  }
  return `${count(summary.approvalItemCount)} exact approval preflight row(s) are ready. This packet created ${count(summary.cardsCreatedByReadback)} card(s), opened ${count(summary.currentSprintOpenedByReadback)} sprint item(s), and authorized ${count(summary.buildAuthorizationsByReadback)} build(s).`
}

function buildSummary(rows = [], morningProposedCardsReadback = {}) {
  return {
    approvalItemCount: rows.length,
    sourceProposedCardCount: count(morningProposedCardsReadback.summary?.proposedCardCount),
    exactApprovalRequiredCount: rows.filter(row => row.exactApprovalRequired).length,
    readyForSteveDecisionCount: rows.filter(row => row.status === 'approval_required').length,
    sourceLineageReadyCount: rows.filter(row => row.sourceLineageCount > 0 && row.sourceLineagePreview.length > 0).length,
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

export function buildDevHubProposedCardApprovalPreflight({
  generatedAt = new Date().toISOString(),
  morningProposedCardsReadback = {},
  maxRows = 6,
} = {}) {
  const rows = list(morningProposedCardsReadback.proposedCards)
    .filter(card => card.approvalStatus === 'draft_requires_steve_approval' && card.status === 'draft_only')
    .slice(0, maxRows)
    .map(preflightRow)
  const summary = buildSummary(rows, morningProposedCardsReadback)
  const failures = []
  if (morningProposedCardsReadback.ok !== true) failures.push('morning_proposed_cards_not_healthy')
  if (!rows.length) failures.push('no_approval_rows')
  if (rows.length > maxRows) failures.push('approval_rows_unbounded')
  if (summary.sourceProposedCardCount !== rows.length) failures.push('source_proposed_card_count_mismatch')
  if (summary.exactApprovalRequiredCount !== rows.length || summary.readyForSteveDecisionCount !== rows.length) failures.push('approval_gate_missing')
  if (summary.sourceLineageReadyCount !== rows.length) failures.push('source_lineage_missing')
  if (rows.some(row => !text(row.proposedCardId) || !text(row.sourcePortfolioGroupId) || !text(row.title) || !text(row.approvalPhrase))) failures.push('approval_context_missing')
  if (rows.some(row => row.cardCreatedNow || row.backlogWrittenNow || row.scoperWrittenNow || row.portfolioWrittenNow || row.sprintOpenedNow || row.buildAuthorizedNow)) failures.push('card_or_build_mutated_by_readback')
  if (rows.some(row => row.routeMutatedNow || row.destinationMutatedNow || row.harlanSentNow || row.externalWriteNow)) failures.push('route_or_external_mutated_by_readback')
  if (summary.cardsCreatedByReadback !== 0 || summary.backlogRecordsWrittenByReadback !== 0 || summary.currentSprintOpenedByReadback !== 0 || summary.buildAuthorizationsByReadback !== 0) failures.push('card_or_build_mutated_by_readback')
  if (summary.scoperRecordsWrittenByReadback !== 0 || summary.portfolioRecordsWrittenByReadback !== 0 || summary.approvalRecordsWrittenByReadback !== 0) failures.push('foundation_records_written_by_readback')
  if (summary.routeRecordsMutatedByReadback !== 0 || summary.destinationRecordsMutatedByReadback !== 0) failures.push('route_or_destination_mutated_by_readback')
  if (summary.harlanSendsByReadback !== 0 || summary.externalWritesByReadback !== 0) failures.push('external_write_by_readback')
  if (summary.extractionRunsStarted !== 0 || summary.connectorProbesStarted !== 0 || summary.browserSessionsStarted !== 0 || summary.modelCallsStarted !== 0) failures.push('runtime_started_by_readback')

  return {
    ok: failures.length === 0,
    status: failures.length ? 'fail_closed' : 'approval_preflight_ready',
    contractVersion: DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_CONTRACT_VERSION,
    cardId: DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_CARD_ID,
    closeoutKey: DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_CLOSEOUT_KEY,
    generatedAt: toIso(generatedAt),
    visibleHome: DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_VISIBLE_HOME,
    source: {
      reusedTruthLayer: 'morningProposedCardsReadback',
      noSecondTruthLayer: true,
    },
    summary,
    plainEnglish: buildPlainEnglish(summary),
    approvalRows: rows,
    boundaries: buildBoundaries(),
    failures: Array.from(new Set(failures)),
  }
}

export function validateDevHubProposedCardApprovalPreflight(snapshot = {}) {
  const failures = []
  if (snapshot.ok !== true) failures.push(...list(snapshot.failures))
  if (snapshot.status !== 'approval_preflight_ready') failures.push('status_not_approval_preflight_ready')
  if (snapshot.contractVersion !== DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_CONTRACT_VERSION) failures.push('contract_version_missing')
  if (snapshot.cardId !== DEV_HUB_PROPOSED_CARD_APPROVAL_PREFLIGHT_CARD_ID) failures.push('card_id_mismatch')
  if (snapshot.source?.reusedTruthLayer !== 'morningProposedCardsReadback' || snapshot.source?.noSecondTruthLayer !== true) failures.push('source_layer_mismatch')
  const boundaries = snapshot.boundaries || {}
  for (const key of ['readOnly', 'preflightOnly', 'draftOnly', 'approvalRequired', 'exactApprovalRequired', 'noCardCreate', 'noBacklogMutation', 'noScoperMutation', 'noPortfolioMutation', 'noCurrentSprintMutation', 'noApprovalMutation', 'noRouteMutation', 'noDestinationMutation', 'noHarlanSend', 'noLiveExtraction', 'noConnectorProbe', 'noBrowserSession', 'noModelCalls', 'noExternalWrites', 'noAutoBuild', 'noAutoBacklogPromotion', 'noAutoPromoteRecommendations']) {
    if (boundaries[key] !== true) failures.push(`boundary_missing:${key}`)
  }
  const rows = list(snapshot.approvalRows)
  if (!rows.length) failures.push('no_approval_rows')
  if (rows.length > 6) failures.push('approval_rows_unbounded')
  if (count(snapshot.summary?.approvalItemCount) !== rows.length) failures.push('approval_count_mismatch')
  if (count(snapshot.summary?.exactApprovalRequiredCount) !== rows.length) failures.push('approval_gate_missing')
  if (count(snapshot.summary?.readyForSteveDecisionCount) !== rows.length) failures.push('approval_gate_missing')
  if (count(snapshot.summary?.sourceLineageReadyCount) !== rows.length) failures.push('source_lineage_missing')
  for (const row of rows) {
    if (row.status !== 'approval_required' || row.exactApprovalRequired !== true || row.requiresSteveDecision !== true) failures.push('approval_gate_missing')
    if (!text(row.proposedCardId) || !text(row.sourcePortfolioGroupId) || !text(row.title) || !text(row.approvalPhrase) || !text(row.proposedMutationAfterApproval)) failures.push('approval_context_missing')
    if (count(row.sourceLineageCount) < 1 || !list(row.sourceLineagePreview).length) failures.push('source_lineage_missing')
    if (!list(row.requiredFields).length || !list(row.proofPlan).length || !list(row.acceptanceCriteria).length || !list(row.notNext).length) failures.push('approval_fields_missing')
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

export function buildDevHubProposedCardApprovalPreflightDogfoodProof() {
  const morningProposedCardsReadback = {
    ok: true,
    summary: {
      proposedCardCount: 1,
    },
    proposedCards: [
      {
        proposedCardId: 'DRAFT-MERGED-AGENT-RUNTIME-UPGRADE-001',
        sourcePortfolioGroupId: 'portfolio:agent-runtime:one+two',
        portfolioRank: 1,
        portfolioScore: 100,
        title: 'Merged Agent Runtime Upgrade',
        proposedPriority: 'P1',
        proposedOwner: 'Dev Hub / Agent Runtime',
        proposedLane: 'agent-runtime',
        summary: 'Build a scoped Merged Agent Runtime Upgrade from source-backed Portfolio candidates.',
        whyItMatters: 'The Portfolio layer ranked this as a source-backed Dev build opportunity.',
        sourceLineageCount: 2,
        sourceLineagePreview: ['atom:one', 'hit:two'],
        proofPlan: ['Run focused proof.'],
        acceptanceCriteria: ['Cite source lineage.'],
        notNext: ['Do not auto-build.'],
        approvalStatus: 'draft_requires_steve_approval',
        status: 'draft_only',
        createdNow: false,
        promotedNow: false,
        sprintOpenedNow: false,
        buildAuthorizedNow: false,
      },
    ],
  }
  const snapshot = buildDevHubProposedCardApprovalPreflight({
    generatedAt: '2026-05-31T07:15:00.000Z',
    morningProposedCardsReadback,
  })
  const validation = validateDevHubProposedCardApprovalPreflight(snapshot)
  const unsafeCreated = {
    ...snapshot,
    summary: {
      ...snapshot.summary,
      cardsCreatedByReadback: 1,
      buildAuthorizationsByReadback: 1,
    },
    approvalRows: snapshot.approvalRows.map(row => ({
      ...row,
      cardCreatedNow: true,
      buildAuthorizedNow: true,
    })),
  }
  const unsafeValidation = validateDevHubProposedCardApprovalPreflight(unsafeCreated)
  return {
    ok: validation.ok === true && unsafeValidation.ok === false &&
      unsafeValidation.failures.includes('card_or_build_mutated_by_readback'),
    snapshot,
    validation,
    unsafeValidation,
    invariant: 'approval preflight must fail if it creates a card or authorizes a build',
  }
}
