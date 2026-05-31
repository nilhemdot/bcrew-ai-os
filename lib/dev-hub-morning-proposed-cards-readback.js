export const DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_CARD_ID = 'DEV-HUB-MORNING-PROPOSED-CARDS-READBACK-001'
export const DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_CLOSEOUT_KEY = 'dev-hub-morning-proposed-cards-readback-v1'
export const DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_PLAN_PATH = 'docs/process/dev-hub-morning-proposed-cards-readback-001-plan.md'
export const DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_APPROVAL_PATH = 'docs/process/approvals/DEV-HUB-MORNING-PROPOSED-CARDS-READBACK-001.json'
export const DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_SCRIPT_PATH = 'scripts/process-dev-hub-morning-proposed-cards-readback-check.mjs'
export const DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_CONTRACT_VERSION = 'dev-hub-morning-proposed-cards-readback.v1'
export const DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_VISIBLE_HOME = 'Dev Hub > Data Pool > Morning Proposed Cards'

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

function slug(value = '') {
  return text(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'DEV-BUILD-PROPOSAL'
}

function truncate(value, maxChars = 220) {
  const normalized = text(value)
  if (normalized.length <= maxChars) return normalized
  return `${normalized.slice(0, Math.max(0, maxChars - 3)).trim()}...`
}

function buildBoundaries() {
  return {
    readOnly: true,
    draftOnly: true,
    proposalOnly: true,
    approvalRequired: true,
    noBacklogMutation: true,
    noCardCreation: true,
    noScoperMutation: true,
    noPortfolioPersistence: true,
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

function priorityForScore(score) {
  const numeric = count(score)
  if (numeric >= 90) return 'P1'
  if (numeric >= 70) return 'P2'
  return 'P3'
}

function laneOwner(lane = '') {
  const normalized = text(lane)
  if (normalized === 'god-mode-extractor') return 'Dev Hub / Extractor'
  if (normalized === 'agent-runtime') return 'Dev Hub / Agent Runtime'
  if (normalized === 'intelligence-spine') return 'Dev Hub / Intelligence Spine'
  if (normalized === 'source-registry') return 'Foundation Source Registry'
  if (normalized === 'ui-workflow') return 'Dev Hub UI'
  return 'Dev Hub'
}

function buildProposedCard(group = {}) {
  const title = text(group.title || 'Dev build proposal')
  const proposedCardId = `DRAFT-${slug(title)}-${String(count(group.portfolioRank) || 1).padStart(3, '0')}`
  const sourceLineagePreview = list(group.sourceLineagePreview).slice(0, 8)
  const candidateCount = count(group.candidateCount)
  return {
    proposedCardId,
    sourcePortfolioGroupId: text(group.groupId),
    portfolioRank: count(group.portfolioRank),
    portfolioScore: count(group.portfolioScore),
    portfolioDecision: text(group.decision),
    title,
    proposedLane: text(group.lane || 'general-aios'),
    proposedOwner: laneOwner(group.lane),
    proposedPriority: priorityForScore(group.portfolioScore),
    candidateCount,
    sourceLineageCount: count(group.sourceLineageCount),
    sourceLineagePreview,
    summary: truncate(`Build a scoped ${title} from ${candidateCount || 1} source-backed Portfolio candidate(s).`),
    whyItMatters: truncate(group.reason || 'The Portfolio layer ranked this as a source-backed Dev build opportunity.'),
    acceptanceCriteria: [
      'The build card cites the Portfolio group ID and raw source lineage before implementation starts.',
      'The first implementation step inspects the named existing AIOS modules instead of starting from scratch.',
      'The proof plan can run without live source extraction, external writes, model calls, or Harlan sends.',
      'Any source/auth/resource uncertainty remains visible as a blocker before build approval.',
    ],
    definitionOfDone: [
      'Steve approves or edits the exact build card before it enters backlog execution.',
      'The approved card has owner, reason, source lineage, acceptance criteria, proof, risks, and not-next boundaries.',
      'The build remains scoped to one reusable Dev Hub or Foundation mechanism.',
    ],
    proofPlan: [
      'Run the focused proof for the approved build card.',
      'Run npm run process:dev-team-hub-v0-check -- --json after any Dev Hub surface change.',
      'Run npm run foundation:verify -- --json-summary before ship.',
    ],
    risks: [
      'A draft packet can be mistaken for build approval if the approval boundary is hidden.',
      'Merged Portfolio groups can hide source nuance unless source lineage remains visible.',
    ],
    notNext: [
      'Do not create this backlog card automatically.',
      'Do not open Current Sprint from this packet.',
      'Do not start implementation until Steve approves an exact card.',
      'Do not run extraction, browser sessions, model calls, Harlan sends, or external writes from this packet.',
    ],
    approvalStatus: 'draft_requires_steve_approval',
    status: 'draft_only',
    createdNow: false,
    promotedNow: false,
    sprintOpenedNow: false,
    harlanSentNow: false,
    buildAuthorizedNow: false,
    externalWriteNow: false,
  }
}

function buildSummary(proposedCards = [], buildPortfolioReadback = {}) {
  return {
    proposedCardCount: proposedCards.length,
    sourcePortfolioGroupCount: list(buildPortfolioReadback.groups).length,
    readyForSteveReviewCount: proposedCards.filter(card => card.approvalStatus === 'draft_requires_steve_approval').length,
    createdCardsByReadback: proposedCards.filter(card => card.createdNow).length,
    promotedCardsByReadback: proposedCards.filter(card => card.promotedNow).length,
    currentSprintOpenedByReadback: proposedCards.filter(card => card.sprintOpenedNow).length,
    harlanSendsByReadback: proposedCards.filter(card => card.harlanSentNow).length,
    buildAuthorizationsByReadback: proposedCards.filter(card => card.buildAuthorizedNow).length,
    externalWritesByReadback: proposedCards.filter(card => card.externalWriteNow).length,
    backlogRecordsWrittenByReadback: 0,
    scoperRecordsWrittenByReadback: 0,
    portfolioRecordsPersistedByReadback: 0,
    approvalRecordsWrittenByReadback: 0,
    routeRecordsMutatedByReadback: 0,
    destinationRecordsMutatedByReadback: 0,
    extractionRunsStarted: 0,
    connectorProbesStarted: 0,
    browserSessionsStarted: 0,
    modelCallsStarted: 0,
  }
}

function buildPlainEnglish(summary = {}) {
  if (count(summary.proposedCardCount) <= 0) {
    return 'No proposal-only Portfolio groups are available for morning card review.'
  }
  return `${count(summary.proposedCardCount)} draft proposed card(s) are ready for Steve review. This readback created ${count(summary.createdCardsByReadback)} backlog card(s), opened ${count(summary.currentSprintOpenedByReadback)} sprint item(s), and authorized ${count(summary.buildAuthorizationsByReadback)} build(s).`
}

export function buildDevHubMorningProposedCardsReadback({
  generatedAt = new Date().toISOString(),
  buildPortfolioReadback = {},
  maxCards = 6,
} = {}) {
  const groups = list(buildPortfolioReadback.groups)
    .filter(group => group.proposalOnly === true && group.approvalRequired === true)
    .slice(0, maxCards)
  const proposedCards = groups.map(buildProposedCard)
  const summary = buildSummary(proposedCards, buildPortfolioReadback)
  const failures = []
  if (buildPortfolioReadback.ok !== true) failures.push('build_portfolio_readback_not_healthy')
  if (!proposedCards.length) failures.push('no_proposed_cards')
  if (proposedCards.length > maxCards) failures.push('proposed_cards_unbounded')
  if (summary.createdCardsByReadback !== 0 || summary.promotedCardsByReadback !== 0 || summary.currentSprintOpenedByReadback !== 0 || summary.buildAuthorizationsByReadback !== 0) failures.push('proposal_mutated_or_authorized')
  if (summary.backlogRecordsWrittenByReadback !== 0 || summary.scoperRecordsWrittenByReadback !== 0 || summary.portfolioRecordsPersistedByReadback !== 0 || summary.approvalRecordsWrittenByReadback !== 0) failures.push('foundation_records_written_by_readback')
  if (summary.routeRecordsMutatedByReadback !== 0 || summary.destinationRecordsMutatedByReadback !== 0) failures.push('route_or_destination_mutated_by_readback')
  if (summary.harlanSendsByReadback !== 0 || summary.externalWritesByReadback !== 0) failures.push('external_write_by_readback')
  if (summary.extractionRunsStarted !== 0 || summary.connectorProbesStarted !== 0 || summary.browserSessionsStarted !== 0 || summary.modelCallsStarted !== 0) failures.push('runtime_started_by_readback')
  if (proposedCards.some(card => card.approvalStatus !== 'draft_requires_steve_approval' || card.status !== 'draft_only')) failures.push('approval_boundary_missing')
  if (proposedCards.some(card => !text(card.sourcePortfolioGroupId) || !text(card.proposedCardId) || count(card.sourceLineageCount) < 1)) failures.push('source_lineage_missing')

  return {
    ok: failures.length === 0,
    status: failures.length ? 'fail_closed' : 'drafts_ready',
    contractVersion: DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_CONTRACT_VERSION,
    cardId: DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_CARD_ID,
    closeoutKey: DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_CLOSEOUT_KEY,
    generatedAt: toIso(generatedAt),
    visibleHome: DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_VISIBLE_HOME,
    source: {
      reusedTruthLayer: 'buildPortfolioReadback',
      noSecondTruthLayer: true,
    },
    summary,
    plainEnglish: buildPlainEnglish(summary),
    proposedCards,
    boundaries: buildBoundaries(),
    failures: Array.from(new Set(failures)),
  }
}

export function validateDevHubMorningProposedCardsReadback(snapshot = {}) {
  const failures = []
  if (snapshot.ok !== true) failures.push(...list(snapshot.failures))
  if (snapshot.status !== 'drafts_ready') failures.push('status_not_drafts_ready')
  if (snapshot.contractVersion !== DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_CONTRACT_VERSION) failures.push('contract_version_missing')
  if (snapshot.cardId !== DEV_HUB_MORNING_PROPOSED_CARDS_READBACK_CARD_ID) failures.push('card_id_mismatch')
  if (snapshot.source?.reusedTruthLayer !== 'buildPortfolioReadback' || snapshot.source?.noSecondTruthLayer !== true) failures.push('source_layer_mismatch')
  const boundaries = snapshot.boundaries || {}
  for (const key of ['readOnly', 'draftOnly', 'proposalOnly', 'approvalRequired', 'noBacklogMutation', 'noCardCreation', 'noScoperMutation', 'noPortfolioPersistence', 'noCurrentSprintMutation', 'noApprovalMutation', 'noRouteMutation', 'noDestinationMutation', 'noHarlanSend', 'noLiveExtraction', 'noConnectorProbe', 'noBrowserSession', 'noModelCalls', 'noExternalWrites', 'noAutoBuild', 'noAutoBacklogPromotion', 'noAutoPromoteRecommendations']) {
    if (boundaries[key] !== true) failures.push(`boundary_missing:${key}`)
  }
  const proposedCards = list(snapshot.proposedCards)
  if (!proposedCards.length) failures.push('no_proposed_cards')
  if (proposedCards.length > 6) failures.push('proposed_cards_unbounded')
  if (count(snapshot.summary?.proposedCardCount) !== proposedCards.length) failures.push('proposed_count_mismatch')
  if (count(snapshot.summary?.readyForSteveReviewCount) !== proposedCards.length) failures.push('review_ready_count_mismatch')
  for (const card of proposedCards) {
    if (card.approvalStatus !== 'draft_requires_steve_approval' || card.status !== 'draft_only') failures.push('approval_boundary_missing')
    if (!text(card.proposedCardId) || !text(card.sourcePortfolioGroupId) || !text(card.title) || !text(card.summary) || !text(card.whyItMatters)) failures.push('card_context_missing')
    if (count(card.sourceLineageCount) < 1 || !list(card.sourceLineagePreview).length) failures.push('source_lineage_missing')
    if (!list(card.acceptanceCriteria).length || !list(card.definitionOfDone).length || !list(card.proofPlan).length || !list(card.risks).length || !list(card.notNext).length) failures.push('proposal_fields_missing')
    if (card.createdNow || card.promotedNow || card.sprintOpenedNow || card.harlanSentNow || card.buildAuthorizedNow || card.externalWriteNow) failures.push('proposal_mutated_or_authorized')
  }
  if (count(snapshot.summary?.createdCardsByReadback) !== 0 || count(snapshot.summary?.promotedCardsByReadback) !== 0 || count(snapshot.summary?.currentSprintOpenedByReadback) !== 0 || count(snapshot.summary?.buildAuthorizationsByReadback) !== 0) failures.push('proposal_mutated_or_authorized')
  if (count(snapshot.summary?.backlogRecordsWrittenByReadback) !== 0 || count(snapshot.summary?.scoperRecordsWrittenByReadback) !== 0 || count(snapshot.summary?.portfolioRecordsPersistedByReadback) !== 0 || count(snapshot.summary?.approvalRecordsWrittenByReadback) !== 0) failures.push('foundation_records_written_by_readback')
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

export function buildDevHubMorningProposedCardsReadbackDogfoodProof() {
  const buildPortfolioReadback = {
    ok: true,
    groups: [
      {
        portfolioRank: 1,
        portfolioScore: 100,
        groupId: 'portfolio:agent-runtime:one+two',
        decision: 'merged_enhanced_build_opportunity',
        status: 'proposal_only_needs_steve_approval_after_portfolio_review',
        lane: 'agent-runtime',
        title: 'Merged Agent Runtime Upgrade',
        candidateCount: 2,
        sourceLineageCount: 4,
        sourceLineagePreview: ['atom:one', 'hit:one', 'atom:two', 'hit:two'],
        reason: '2 scoped candidates overlap in agent-runtime; merge them into one stronger build concept with shared source lineage.',
        proposalOnly: true,
        approvalRequired: true,
      },
      {
        portfolioRank: 2,
        portfolioScore: 96,
        groupId: 'portfolio:god-mode-extractor:three+four',
        decision: 'merged_enhanced_build_opportunity',
        status: 'proposal_only_needs_steve_approval_after_portfolio_review',
        lane: 'god-mode-extractor',
        title: 'Merged God Mode Extractor Upgrade',
        candidateCount: 2,
        sourceLineageCount: 4,
        sourceLineagePreview: ['atom:three', 'hit:three', 'atom:four', 'hit:four'],
        reason: '2 scoped candidates overlap in god-mode-extractor; merge them into one stronger build concept with shared source lineage.',
        proposalOnly: true,
        approvalRequired: true,
      },
    ],
  }
  const healthy = buildDevHubMorningProposedCardsReadback({ buildPortfolioReadback })
  const validation = validateDevHubMorningProposedCardsReadback(healthy)
  const unsafe = {
    ...healthy,
    proposedCards: healthy.proposedCards.map((card, index) => index === 0
      ? { ...card, createdNow: true, approvalStatus: 'created' }
      : card),
    summary: {
      ...healthy.summary,
      createdCardsByReadback: 1,
      readyForSteveReviewCount: Math.max(0, count(healthy.summary.readyForSteveReviewCount) - 1),
    },
  }
  const unsafeValidation = validateDevHubMorningProposedCardsReadback(unsafe)
  return {
    ok: validation.ok === true &&
      unsafeValidation.ok === false &&
      count(healthy.summary.proposedCardCount) === 2 &&
      count(healthy.summary.createdCardsByReadback) === 0 &&
      count(healthy.summary.buildAuthorizationsByReadback) === 0,
    healthy,
    validation,
    unsafeValidation,
    invariant: `proposed=${healthy.summary.proposedCardCount}; created=${healthy.summary.createdCardsByReadback}; sprint=${healthy.summary.currentSprintOpenedByReadback}; builds=${healthy.summary.buildAuthorizationsByReadback}; external=${healthy.summary.externalWritesByReadback}`,
  }
}

