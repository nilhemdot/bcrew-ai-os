import {
  BUILD_PORTFOLIO_DECISIONS,
  BUILD_PORTFOLIO_STATUS,
  buildPortfolioReview,
} from './build-portfolio-scrum-master.js'
import {
  DEV_BUILD_SCOPER_STATUS,
} from './dev-build-opportunity-scoper.js'

export const DEV_HUB_BUILD_PORTFOLIO_READBACK_CARD_ID = 'DEV-HUB-BUILD-PORTFOLIO-READBACK-001'
export const DEV_HUB_BUILD_PORTFOLIO_READBACK_CLOSEOUT_KEY = 'dev-hub-build-portfolio-readback-v1'
export const DEV_HUB_BUILD_PORTFOLIO_READBACK_PLAN_PATH = 'docs/process/dev-hub-build-portfolio-readback-001-plan.md'
export const DEV_HUB_BUILD_PORTFOLIO_READBACK_APPROVAL_PATH = 'docs/process/approvals/DEV-HUB-BUILD-PORTFOLIO-READBACK-001.json'
export const DEV_HUB_BUILD_PORTFOLIO_READBACK_SCRIPT_PATH = 'scripts/process-dev-hub-build-portfolio-readback-check.mjs'
export const DEV_HUB_BUILD_PORTFOLIO_READBACK_CONTRACT_VERSION = 'dev-hub-build-portfolio-readback.v1'
export const DEV_HUB_BUILD_PORTFOLIO_READBACK_VISIBLE_HOME = 'Dev Hub > Data Pool > Build Portfolio Readback'

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

function truncate(value, maxChars = 180) {
  const normalized = text(value)
  if (normalized.length <= maxChars) return normalized
  return `${normalized.slice(0, Math.max(0, maxChars - 3)).trim()}...`
}

function buildBoundaries() {
  return {
    readOnly: true,
    proposalOnly: true,
    approvalRequired: true,
    noLiveExtraction: true,
    noConnectorProbe: true,
    noBrowserSession: true,
    noModelCalls: true,
    noExternalWrites: true,
    noHarlanSend: true,
    noRouteMutation: true,
    noDestinationMutation: true,
    noBacklogMutation: true,
    noScoperMutation: true,
    noPortfolioPersistence: true,
    noCurrentSprintMutation: true,
    noApprovalMutation: true,
    noAutoApply: true,
    noAutoBuild: true,
    noAutoBacklogPromotion: true,
    noAutoScoperPromotion: true,
    noAutoPortfolioPromotion: true,
    noAutoPromoteRecommendations: true,
  }
}

function readyScopedCandidate(candidate = {}) {
  return candidate.scoperStatus === DEV_BUILD_SCOPER_STATUS.readyForPortfolio &&
    candidate.sourceTraceStatus === 'source_trace_ready' &&
    Boolean(text(candidate.rawAtomId)) &&
    Boolean(text(candidate.rawHitId)) &&
    candidate.portfolioCandidate &&
    typeof candidate.portfolioCandidate === 'object'
}

function candidateId(candidate = {}) {
  return text(candidate.portfolioCandidate?.id || candidate.id || candidate.title)
}

function buildGroupCandidateIndex(groups = []) {
  const index = new Map()
  for (const group of list(groups)) {
    for (const id of list(group.candidateIds)) {
      index.set(text(id), group)
    }
  }
  return index
}

function compactCandidate(candidate = {}, index = 0, groupByCandidateId = new Map()) {
  const id = candidateId(candidate)
  const group = groupByCandidateId.get(id)
  return {
    rank: count(candidate.rank) || index + 1,
    candidateId: id,
    title: truncate(candidate.title || id || 'Untitled scoped candidate', 150),
    sourceTrustLabel: text(candidate.sourceTrustLabel || 'standard_report'),
    sourceReportArtifactId: text(candidate.sourceReportArtifactId),
    sourceVideoId: text(candidate.sourceVideoId),
    rawReportArtifactId: text(candidate.rawReportArtifactId),
    rawAtomId: text(candidate.rawAtomId),
    rawHitId: text(candidate.rawHitId),
    directorAtomId: text(candidate.directorAtomId),
    directorHitId: text(candidate.directorHitId),
    sourceTraceStatus: text(candidate.sourceTraceStatus || 'raw_source_evidence_missing'),
    scoperStatus: text(candidate.scoperStatus || DEV_BUILD_SCOPER_STATUS.needsResearch),
    readyForPortfolio: readyScopedCandidate(candidate),
    portfolioGroupId: text(group?.groupId),
    portfolioDecision: text(group?.decision || candidate.portfolioDecision),
    portfolioRank: count(group?.portfolioRank),
    portfolioScore: count(group?.portfolioScore),
    status: readyScopedCandidate(candidate) ? 'portfolio_input_ready' : 'parked_for_scoper',
  }
}

function compactGroup(group = {}) {
  return {
    portfolioRank: count(group.portfolioRank),
    portfolioScore: count(group.portfolioScore),
    groupId: text(group.groupId),
    decision: text(group.decision),
    status: text(group.status),
    lane: text(group.lane || 'general-aios'),
    title: truncate(group.title || group.groupId || 'Portfolio group', 150),
    candidateCount: list(group.candidateIds).length,
    candidateIds: list(group.candidateIds).map(item => text(item)).filter(Boolean).slice(0, 6),
    sourceLineageCount: list(group.sourceLineage).length,
    sourceLineagePreview: list(group.sourceLineage).map(item => text(item)).filter(Boolean).slice(0, 8),
    reason: truncate(group.reason || '', 260),
    proposalOnly: text(group.status) === BUILD_PORTFOLIO_STATUS.proposalOnly,
    approvalRequired: true,
    promotionBoundary: 'Proposal-only portfolio readback. Steve must approve an exact build card before backlog, sprint, Scoper, Portfolio, route, Harlan, or build actions.',
  }
}

function buildSummary({
  traceResult = {},
  readyCandidates = [],
  allScopedCandidates = [],
  portfolioReview = {},
  groups = [],
} = {}) {
  const sourceLineage = new Set(groups.flatMap(group => list(group.sourceLineage)))
  const decisions = groups.reduce((memo, group) => {
    const decision = text(group.decision || 'unknown')
    memo[decision] = count(memo[decision]) + 1
    return memo
  }, {})
  const proposalOnlyGroups = groups.filter(group => text(group.status) === BUILD_PORTFOLIO_STATUS.proposalOnly)
  return {
    reviewedDirectorCandidates: count(traceResult.reviewedCount) || allScopedCandidates.length,
    scopedCandidateCount: allScopedCandidates.length,
    readyScopedCandidateCount: readyCandidates.length,
    parkedForScoperCount: Math.max(0, allScopedCandidates.length - readyCandidates.length),
    portfolioGroupCount: groups.length,
    mergedGroupCount: count(decisions[BUILD_PORTFOLIO_DECISIONS.mergedEnhanced]),
    standaloneGroupCount: count(decisions[BUILD_PORTFOLIO_DECISIONS.standaloneCandidate]),
    returnToScoperGroupCount: count(decisions[BUILD_PORTFOLIO_DECISIONS.returnToScoper]),
    blockedGroupCount: count(decisions[BUILD_PORTFOLIO_DECISIONS.parkBlocked]),
    proposalOnlyGroupCount: proposalOnlyGroups.length,
    autoPromotedGroupCount: groups.length - proposalOnlyGroups.length,
    sourceLineageRefCount: sourceLineage.size,
    promotionPolicyOk: portfolioReview.promotionPolicy === 'no_auto_promotion_without_steve_after_portfolio_review',
    portfolioRowsComputedByReadback: groups.length,
    backlogRecordsWrittenByReadback: 0,
    scoperRecordsWrittenByReadback: 0,
    portfolioRecordsPersistedByReadback: 0,
    currentSprintMutationsByReadback: 0,
    approvalRecordsWrittenByReadback: 0,
    routeRecordsMutatedByReadback: 0,
    destinationRecordsMutatedByReadback: 0,
    harlanSendsByReadback: 0,
    extractionRunsStarted: 0,
    connectorProbesStarted: 0,
    browserSessionsStarted: 0,
    modelCallsStarted: 0,
    externalWritesByReadback: 0,
  }
}

function buildPlainEnglish(summary = {}) {
  if (count(summary.readyScopedCandidateCount) <= 0) {
    return 'No source-traced Scoper-ready build candidates are available for Portfolio review.'
  }
  return `${count(summary.readyScopedCandidateCount)} Scoper-ready candidate(s) merge into ${count(summary.portfolioGroupCount)} proposal-only portfolio group(s). ${count(summary.mergedGroupCount)} group(s) are merged opportunities. ${count(summary.parkedForScoperCount)} recommendation(s) stay parked for Scoper repair or raw proof.`
}

function groupPreservesCandidateLineage(group = {}, sourceRefsByCandidateId = new Map()) {
  const groupRefs = new Set(list(group.sourceLineage).map(item => text(item)))
  return list(group.candidateIds).every(id =>
    list(sourceRefsByCandidateId.get(text(id))).every(ref => groupRefs.has(text(ref)))
  )
}

export function buildDevHubBuildPortfolioReadback({
  generatedAt = new Date().toISOString(),
  traceResult = {},
  maxGroups = 8,
  maxCandidates = 10,
} = {}) {
  const allScopedCandidates = list(traceResult.scopedCandidates)
  const readyCandidates = allScopedCandidates.filter(readyScopedCandidate).slice(0, maxCandidates)
  const portfolioCandidates = readyCandidates.map(candidate => candidate.portfolioCandidate)
  const portfolioReview = buildPortfolioReview({ candidates: portfolioCandidates })
  const groups = list(portfolioReview.groups).slice(0, maxGroups)
  const groupByCandidateId = buildGroupCandidateIndex(groups)
  const candidateRows = readyCandidates.map((candidate, index) => compactCandidate(candidate, index, groupByCandidateId))
  const parkedCandidates = allScopedCandidates
    .filter(candidate => !readyScopedCandidate(candidate))
    .slice(0, Math.max(0, maxCandidates - candidateRows.length))
    .map((candidate, index) => compactCandidate(candidate, index + candidateRows.length, groupByCandidateId))
  const groupRows = groups.map(compactGroup)
  const sourceRefsByCandidateId = new Map(portfolioCandidates.map(candidate => [
    text(candidate.id),
    [
      ...list(candidate.sourceRefs),
      ...list(candidate.sourceIds),
      ...list(candidate.evidenceRefs),
    ].map(item => text(item)).filter(Boolean),
  ]))
  const summary = buildSummary({
    traceResult,
    readyCandidates,
    allScopedCandidates,
    portfolioReview,
    groups,
  })
  const failures = []
  if (traceResult.ok !== true) failures.push('trace_result_not_ok')
  if (!allScopedCandidates.length) failures.push('no_scoped_candidates')
  if (!readyCandidates.length) failures.push('no_ready_scoped_candidates')
  if (groups.length > maxGroups || candidateRows.length + parkedCandidates.length > maxCandidates) failures.push('payload_unbounded')
  if (portfolioReview.promotionPolicy !== 'no_auto_promotion_without_steve_after_portfolio_review') failures.push('promotion_policy_changed')
  if (summary.autoPromotedGroupCount !== 0) failures.push('auto_promoted_groups_present')
  if (groupRows.some(group => group.proposalOnly !== true || group.approvalRequired !== true)) failures.push('group_not_proposal_only')
  if (candidateRows.some(candidate => !candidate.rawAtomId || !candidate.rawHitId || candidate.readyForPortfolio !== true)) failures.push('candidate_missing_raw_trace')
  if (groups.some(group => !groupPreservesCandidateLineage(group, sourceRefsByCandidateId))) failures.push('group_source_lineage_missing')
  if (summary.backlogRecordsWrittenByReadback !== 0 || summary.scoperRecordsWrittenByReadback !== 0 || summary.portfolioRecordsPersistedByReadback !== 0 || summary.currentSprintMutationsByReadback !== 0 || summary.approvalRecordsWrittenByReadback !== 0) failures.push('foundation_records_written_by_readback')
  if (summary.routeRecordsMutatedByReadback !== 0 || summary.destinationRecordsMutatedByReadback !== 0) failures.push('route_or_destination_mutated_by_readback')
  if (summary.harlanSendsByReadback !== 0 || summary.externalWritesByReadback !== 0) failures.push('external_write_by_readback')
  if (summary.extractionRunsStarted !== 0 || summary.connectorProbesStarted !== 0 || summary.browserSessionsStarted !== 0 || summary.modelCallsStarted !== 0) failures.push('runtime_started_by_readback')

  return {
    ok: failures.length === 0,
    status: failures.length ? 'fail_closed' : 'portfolio_ready',
    contractVersion: DEV_HUB_BUILD_PORTFOLIO_READBACK_CONTRACT_VERSION,
    cardId: DEV_HUB_BUILD_PORTFOLIO_READBACK_CARD_ID,
    closeoutKey: DEV_HUB_BUILD_PORTFOLIO_READBACK_CLOSEOUT_KEY,
    generatedAt: toIso(generatedAt),
    visibleHome: DEV_HUB_BUILD_PORTFOLIO_READBACK_VISIBLE_HOME,
    source: {
      reusedTruthLayers: [
        'scoperEvidenceTraceResult',
        'buildPortfolioReview',
      ],
      noSecondTruthLayer: true,
      promotionPolicy: portfolioReview.promotionPolicy || '',
    },
    summary,
    plainEnglish: buildPlainEnglish(summary),
    groups: groupRows,
    candidateRows,
    parkedCandidates,
    boundaries: buildBoundaries(),
    failures: Array.from(new Set(failures)),
  }
}

export function validateDevHubBuildPortfolioReadback(snapshot = {}) {
  const failures = []
  if (snapshot.ok !== true) failures.push(...list(snapshot.failures))
  if (snapshot.status !== 'portfolio_ready') failures.push('status_not_portfolio_ready')
  if (snapshot.contractVersion !== DEV_HUB_BUILD_PORTFOLIO_READBACK_CONTRACT_VERSION) failures.push('contract_version_missing')
  if (snapshot.cardId !== DEV_HUB_BUILD_PORTFOLIO_READBACK_CARD_ID) failures.push('card_id_mismatch')
  if (snapshot.source?.noSecondTruthLayer !== true) failures.push('second_truth_layer_risk')
  for (const layer of ['scoperEvidenceTraceResult', 'buildPortfolioReview']) {
    if (!list(snapshot.source?.reusedTruthLayers).includes(layer)) failures.push(`source_layer_missing:${layer}`)
  }
  if (snapshot.source?.promotionPolicy !== 'no_auto_promotion_without_steve_after_portfolio_review') failures.push('promotion_policy_changed')
  const boundaries = snapshot.boundaries || {}
  for (const key of ['readOnly', 'proposalOnly', 'approvalRequired', 'noLiveExtraction', 'noConnectorProbe', 'noBrowserSession', 'noModelCalls', 'noExternalWrites', 'noHarlanSend', 'noRouteMutation', 'noDestinationMutation', 'noBacklogMutation', 'noScoperMutation', 'noPortfolioPersistence', 'noCurrentSprintMutation', 'noApprovalMutation', 'noAutoApply', 'noAutoBuild', 'noAutoBacklogPromotion', 'noAutoScoperPromotion', 'noAutoPortfolioPromotion', 'noAutoPromoteRecommendations']) {
    if (boundaries[key] !== true) failures.push(`boundary_missing:${key}`)
  }
  const groups = list(snapshot.groups)
  const candidateRows = list(snapshot.candidateRows)
  if (groups.length > 8 || candidateRows.length + list(snapshot.parkedCandidates).length > 10) failures.push('payload_unbounded')
  if (count(snapshot.summary?.readyScopedCandidateCount) <= 0) failures.push('no_ready_scoped_candidates')
  if (count(snapshot.summary?.portfolioGroupCount) !== groups.length) failures.push('group_count_mismatch')
  if (count(snapshot.summary?.autoPromotedGroupCount) !== 0) failures.push('auto_promoted_groups_present')
  if (count(snapshot.summary?.proposalOnlyGroupCount) !== groups.length) failures.push('proposal_only_count_mismatch')
  if (count(snapshot.summary?.sourceLineageRefCount) <= 0) failures.push('source_lineage_missing')
  for (const group of groups) {
    if (group.proposalOnly !== true || group.approvalRequired !== true || group.status !== BUILD_PORTFOLIO_STATUS.proposalOnly) failures.push('group_not_proposal_only')
    if (!text(group.groupId) || !text(group.decision) || !text(group.title) || !text(group.reason) || !text(group.promotionBoundary)) failures.push('group_operator_context_missing')
    if (count(group.portfolioRank) < 1 || count(group.portfolioScore) < 1) failures.push('group_rank_or_score_missing')
    if (count(group.candidateCount) < 1 || count(group.sourceLineageCount) < 1) failures.push('group_source_lineage_missing')
  }
  for (const candidate of candidateRows) {
    if (candidate.readyForPortfolio !== true || candidate.status !== 'portfolio_input_ready') failures.push('candidate_not_portfolio_ready')
    if (!text(candidate.rawAtomId) || !text(candidate.rawHitId)) failures.push('candidate_missing_raw_trace')
    if (!text(candidate.portfolioGroupId) || count(candidate.portfolioRank) < 1) failures.push('candidate_group_missing')
  }
  if (count(snapshot.summary?.backlogRecordsWrittenByReadback) !== 0 || count(snapshot.summary?.scoperRecordsWrittenByReadback) !== 0 || count(snapshot.summary?.portfolioRecordsPersistedByReadback) !== 0 || count(snapshot.summary?.currentSprintMutationsByReadback) !== 0 || count(snapshot.summary?.approvalRecordsWrittenByReadback) !== 0) failures.push('foundation_records_written_by_readback')
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

function scopedFixture({
  rank,
  title,
  lane,
  portfolioGroupKey,
  rawSuffix,
  score = 88,
} = {}) {
  const id = `SCOPED-${title.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')}-${rawSuffix}`
  return {
    rank,
    title,
    sourceTrustLabel: 'api_full_watch',
    sourceReportArtifactId: `batch:${rawSuffix}`,
    sourceVideoId: `video-${rawSuffix}`,
    directorAtomId: `atom:director:${rawSuffix}`,
    directorHitId: `hit:director:${rawSuffix}`,
    rawReportArtifactId: `batch:raw:${rawSuffix}`,
    rawAtomId: `atom:raw:${rawSuffix}`,
    rawHitId: `hit:raw:${rawSuffix}`,
    sourceTraceStatus: 'source_trace_ready',
    scoperStatus: DEV_BUILD_SCOPER_STATUS.readyForPortfolio,
    portfolioCandidate: {
      id,
      portfolioGroupKey,
      title,
      lane,
      summary: `${title} gives Steve a stronger source-backed build path.`,
      director: { missionScore: score },
      scope: {
        what: `Build ${title} as a proposal-only scoped Dev Hub opportunity.`,
        why: `${title} is source-backed and connected to the AIOS build loop.`,
        details: `Reuse the existing Scoper and Portfolio contract for ${title}.`,
        acceptanceCriteria: ['raw atom and hit proof are visible', 'portfolio output stays proposal-only'],
        definitionOfDone: ['ranked portfolio group is visible', 'no backlog or sprint mutation happens'],
        tests: ['fixture proves proposal-only portfolio readback'],
        risks: ['portfolio readiness can be mistaken for approval'],
        notNext: ['do not auto-build', 'do not create backlog cards'],
        existingWorkToReuse: ['lib/dev-build-opportunity-evidence-trace.js', 'lib/build-portfolio-scrum-master.js'],
      },
      sourceRefs: [`atom:raw:${rawSuffix}`, `hit:raw:${rawSuffix}`],
      sourceIds: ['SRC-YOUTUBE-INTEL-001'],
    },
  }
}

export function buildDevHubBuildPortfolioReadbackDogfoodProof() {
  const traceResult = {
    ok: true,
    reviewedCount: 4,
    scopedCandidates: [
      scopedFixture({
        rank: 1,
        title: 'Agent Workflow Recorder',
        lane: 'agent-runtime',
        portfolioGroupKey: 'agent-runtime-workflow',
        rawSuffix: 'agent-1',
        score: 92,
      }),
      scopedFixture({
        rank: 2,
        title: 'Signal Automation Runner',
        lane: 'agent-runtime',
        portfolioGroupKey: 'agent-runtime-workflow',
        rawSuffix: 'agent-2',
        score: 89,
      }),
      scopedFixture({
        rank: 3,
        title: 'Visual Debugger',
        lane: 'god-mode-extractor',
        portfolioGroupKey: 'visual-extractor',
        rawSuffix: 'visual-1',
        score: 91,
      }),
      {
        rank: 4,
        title: 'Parked Missing Raw Hit',
        sourceTraceStatus: 'source_atom_found_hit_missing',
        scoperStatus: DEV_BUILD_SCOPER_STATUS.needsResearch,
        rawAtomId: 'atom:raw:parked',
        rawHitId: '',
      },
    ],
  }
  const healthy = buildDevHubBuildPortfolioReadback({ traceResult })
  const validation = validateDevHubBuildPortfolioReadback(healthy)
  const unsafe = {
    ...healthy,
    groups: healthy.groups.map((group, index) => index === 0
      ? { ...group, status: 'auto_promoted_to_backlog', proposalOnly: false }
      : group),
    summary: {
      ...healthy.summary,
      proposalOnlyGroupCount: Math.max(0, count(healthy.summary.proposalOnlyGroupCount) - 1),
      autoPromotedGroupCount: 1,
    },
  }
  const unsafeValidation = validateDevHubBuildPortfolioReadback(unsafe)
  return {
    ok: validation.ok === true &&
      unsafeValidation.ok === false &&
      count(healthy.summary.mergedGroupCount) >= 1 &&
      count(healthy.summary.readyScopedCandidateCount) === 3 &&
      count(healthy.summary.parkedForScoperCount) === 1 &&
      count(healthy.summary.backlogRecordsWrittenByReadback) === 0 &&
      count(healthy.summary.portfolioRecordsPersistedByReadback) === 0,
    healthy,
    validation,
    unsafeValidation,
    invariant: `groups=${healthy.summary.portfolioGroupCount}; merged=${healthy.summary.mergedGroupCount}; ready=${healthy.summary.readyScopedCandidateCount}; parked=${healthy.summary.parkedForScoperCount}; autoPromoted=${healthy.summary.autoPromotedGroupCount}; writes=${healthy.summary.backlogRecordsWrittenByReadback}/${healthy.summary.portfolioRecordsPersistedByReadback}`,
  }
}

