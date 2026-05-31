import {
  DEV_BUILD_OPPORTUNITY_SCOPER_CARD_ID,
  DEV_BUILD_SCOPER_STATUS,
} from './dev-build-opportunity-scoper.js'
import {
  DEV_BUILD_EVIDENCE_TRACE_DEFAULT_CANDIDATE_LIMIT,
} from './dev-build-opportunity-evidence-trace.js'
import {
  DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID,
} from './dev-team-intelligence-director.js'

export const DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_CARD_ID = 'DEV-HUB-SCOPER-EVIDENCE-TRACE-READBACK-001'
export const DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_CLOSEOUT_KEY = 'dev-hub-scoper-evidence-trace-readback-v1'
export const DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_PLAN_PATH = 'docs/process/dev-hub-scoper-evidence-trace-readback-001-plan.md'
export const DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_APPROVAL_PATH = 'docs/process/approvals/DEV-HUB-SCOPER-EVIDENCE-TRACE-READBACK-001.json'
export const DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_SCRIPT_PATH = 'scripts/process-dev-hub-scoper-evidence-trace-readback-check.mjs'
export const DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_CONTRACT_VERSION = 'dev-hub-scoper-evidence-trace-readback.v1'
export const DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_VISIBLE_HOME = 'Dev Hub > Data Pool > Scoper evidence trace'

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
    noLiveExtraction: true,
    noModelCalls: true,
    noExternalWrites: true,
    noHarlanSend: true,
    noRouteMutation: true,
    noDestinationMutation: true,
    noBacklogMutation: true,
    noApprovalMutation: true,
    noAutoApply: true,
    noAutoScoperPromotion: true,
    noAutoBacklogPromotion: true,
    noAutoPromoteRecommendations: true,
    proposalOnly: true,
  }
}

function sourceTraceReady(candidate = {}) {
  return candidate.sourceTraceStatus === 'source_trace_ready' &&
    Boolean(text(candidate.rawAtomId)) &&
    Boolean(text(candidate.rawHitId))
}

function readyForPortfolio(candidate = {}) {
  return candidate.scoperStatus === DEV_BUILD_SCOPER_STATUS.readyForPortfolio &&
    sourceTraceReady(candidate)
}

function parkedReason(candidate = {}) {
  if (readyForPortfolio(candidate)) return ''
  if (!text(candidate.rawAtomId) && !text(candidate.rawHitId)) return 'Raw atom and raw hit missing.'
  if (!text(candidate.rawAtomId)) return 'Raw atom missing.'
  if (!text(candidate.rawHitId)) return 'Raw hit missing.'
  if (candidate.scoperStatus === DEV_BUILD_SCOPER_STATUS.blockedSourceOrAuth) return 'Source or auth boundary.'
  if (candidate.scoperStatus === DEV_BUILD_SCOPER_STATUS.needsResearch) return 'Needs deeper research before Scoper can call it ready.'
  return 'Not ready for Portfolio review.'
}

function compactCandidate(candidate = {}) {
  const sourceReady = sourceTraceReady(candidate)
  const portfolioReady = readyForPortfolio(candidate)
  return {
    rank: count(candidate.rank),
    title: truncate(candidate.title || 'Untitled build recommendation', 160),
    sourceTrustLabel: text(candidate.sourceTrustLabel || 'standard_report'),
    sourceReportArtifactId: text(candidate.sourceReportArtifactId),
    sourceVideoId: text(candidate.sourceVideoId),
    directorAtomId: text(candidate.directorAtomId),
    directorHitId: text(candidate.directorHitId),
    rawReportArtifactId: text(candidate.rawReportArtifactId),
    rawAtomId: text(candidate.rawAtomId),
    rawHitId: text(candidate.rawHitId),
    evidenceTimestamps: list(candidate.evidenceTimestamps).map(item => text(item)).filter(Boolean).slice(0, 6),
    sourceTraceStatus: text(candidate.sourceTraceStatus || 'raw_source_evidence_missing'),
    scoperStatus: text(candidate.scoperStatus || DEV_BUILD_SCOPER_STATUS.needsResearch),
    portfolioDecision: text(candidate.portfolioDecision),
    promotionStatus: text(candidate.promotionStatus || 'proposal_only_needs_scoper_before_steve_approval'),
    directorTraceReady: Boolean(text(candidate.directorAtomId) && text(candidate.directorHitId)),
    rawTraceReady: sourceReady,
    readyForPortfolio: portfolioReady,
    parkedReason: parkedReason(candidate),
  }
}

function buildSummary(candidates = [], traceResult = {}) {
  const readyCandidates = candidates.filter(readyForPortfolio)
  const sourceReadyCandidates = candidates.filter(sourceTraceReady)
  const blockedCandidates = candidates.filter(candidate => candidate.scoperStatus === DEV_BUILD_SCOPER_STATUS.blockedSourceOrAuth)
  const needsResearchCandidates = candidates.filter(candidate => candidate.scoperStatus === DEV_BUILD_SCOPER_STATUS.needsResearch)
  const proposalOnlyCandidates = candidates.filter(candidate => text(candidate.promotionStatus).includes('proposal_only'))
  return {
    reviewedCount: candidates.length,
    requestedCandidateLimit: count(traceResult.candidateLimit) || DEV_BUILD_EVIDENCE_TRACE_DEFAULT_CANDIDATE_LIMIT,
    readyForPortfolioCount: readyCandidates.length,
    parkedCount: candidates.length - readyCandidates.length,
    sourceTraceReadyCount: sourceReadyCandidates.length,
    needsResearchCount: needsResearchCandidates.length,
    blockedSourceOrAuthCount: blockedCandidates.length,
    portfolioDecisionCount: candidates.filter(candidate => text(candidate.portfolioDecision)).length,
    proposalOnlyCount: proposalOnlyCandidates.length,
    autoPromotedCount: candidates.length - proposalOnlyCandidates.length,
    directorTraceReadyCount: candidates.filter(candidate => candidate.directorTraceReady === true).length,
  }
}

function buildPlainEnglish(summary = {}) {
  const ready = count(summary.readyForPortfolioCount)
  const parked = count(summary.parkedCount)
  const reviewed = count(summary.reviewedCount)
  if (!reviewed) return 'No Director candidates are available for Scoper evidence trace readback.'
  return `${ready} of ${reviewed} Director recommendation(s) have raw atom and hit proof and can be reviewed by Scoper/Portfolio; ${parked} stay parked. Promotion remains proposal-only until Steve approves an exact build card.`
}

export function buildDevHubScoperEvidenceTraceReadback({
  generatedAt = new Date().toISOString(),
  traceResult = {},
  candidateLimit = DEV_BUILD_EVIDENCE_TRACE_DEFAULT_CANDIDATE_LIMIT,
} = {}) {
  const generatedAtIso = toIso(generatedAt)
  const maxCandidates = Math.min(10, Math.max(1, count(candidateLimit) || DEV_BUILD_EVIDENCE_TRACE_DEFAULT_CANDIDATE_LIMIT))
  const candidates = list(traceResult.reviewedCandidates || traceResult.scopedCandidates)
    .map(compactCandidate)
    .sort((left, right) => count(left.rank) - count(right.rank))
    .slice(0, maxCandidates)
  const summary = buildSummary(candidates, {
    ...traceResult,
    candidateLimit: count(traceResult.candidateLimit) || maxCandidates,
  })
  const failures = []
  if (traceResult.ok !== true) failures.push('trace_result_not_ok')
  if (!candidates.length) failures.push('no_candidates_reviewed')
  if (candidates.some(candidate => candidate.readyForPortfolio && !candidate.rawTraceReady)) {
    failures.push('candidate_ready_without_raw_trace')
  }
  if (candidates.some(candidate => candidate.scoperStatus === DEV_BUILD_SCOPER_STATUS.readyForPortfolio && candidate.sourceTraceStatus !== 'source_trace_ready')) {
    failures.push('portfolio_ready_without_source_trace_status')
  }
  if (candidates.some(candidate => !candidate.promotionStatus.includes('proposal_only'))) {
    failures.push('candidate_not_proposal_only')
  }
  if (summary.autoPromotedCount > 0) failures.push('auto_promoted_candidates_present')
  if (candidates.length > maxCandidates) failures.push('candidate_payload_unbounded')

  return {
    ok: failures.length === 0,
    status: failures.length ? 'fail_closed' : 'healthy',
    contractVersion: DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_CONTRACT_VERSION,
    cardId: DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_CARD_ID,
    closeoutKey: DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_CLOSEOUT_KEY,
    generatedAt: generatedAtIso,
    visibleHome: DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_VISIBLE_HOME,
    source: {
      scoperCardId: DEV_BUILD_OPPORTUNITY_SCOPER_CARD_ID,
      directorReportArtifactId: traceResult.directorReportArtifactId || DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID,
      reusedTruthLayer: 'buildDevBuildOpportunityEvidenceTrace',
      proofCommand: 'npm run process:dev-build-scoper-evidence-trace-check -- --json --limit=5',
    },
    summary,
    plainEnglish: buildPlainEnglish(summary),
    candidates,
    boundaries: buildBoundaries(),
    failures: Array.from(new Set(failures)),
  }
}

export function validateDevHubScoperEvidenceTraceReadback(snapshot = {}) {
  const failures = []
  const candidates = list(snapshot.candidates)
  if (snapshot.ok !== true) failures.push(...list(snapshot.failures))
  if (snapshot.status !== 'healthy') failures.push('status_not_healthy')
  if (snapshot.contractVersion !== DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_CONTRACT_VERSION) failures.push('contract_version_missing')
  if (snapshot.cardId !== DEV_HUB_SCOPER_EVIDENCE_TRACE_READBACK_CARD_ID) failures.push('card_id_mismatch')
  if (snapshot.source?.reusedTruthLayer !== 'buildDevBuildOpportunityEvidenceTrace') failures.push('truth_layer_not_reused')
  if (snapshot.boundaries?.readOnly !== true || snapshot.boundaries?.noExternalWrites !== true) failures.push('unsafe_boundary')
  if (snapshot.boundaries?.noBacklogMutation !== true || snapshot.boundaries?.noAutoScoperPromotion !== true) failures.push('promotion_boundary_missing')
  if (snapshot.boundaries?.noRouteMutation !== true || snapshot.boundaries?.noAutoApply !== true) failures.push('route_boundary_missing')
  if (!text(snapshot.plainEnglish)) failures.push('plain_english_missing')
  if (!candidates.length) failures.push('candidates_missing')
  if (candidates.length > 10) failures.push('candidate_payload_unbounded')
  if (candidates.some(candidate => candidate.readyForPortfolio === true && candidate.rawTraceReady !== true)) {
    failures.push('candidate_ready_without_raw_trace')
  }
  if (candidates.some(candidate => candidate.scoperStatus === DEV_BUILD_SCOPER_STATUS.readyForPortfolio && candidate.sourceTraceStatus !== 'source_trace_ready')) {
    failures.push('portfolio_ready_without_source_trace_status')
  }
  if (candidates.some(candidate => !text(candidate.promotionStatus).includes('proposal_only'))) {
    failures.push('candidate_not_proposal_only')
  }
  if (count(snapshot.summary?.readyForPortfolioCount) > count(snapshot.summary?.sourceTraceReadyCount)) {
    failures.push('ready_exceeds_source_trace_ready')
  }
  if (count(snapshot.summary?.autoPromotedCount) !== 0) failures.push('auto_promoted_candidates_present')
  if (count(snapshot.summary?.proposalOnlyCount) !== candidates.length) failures.push('proposal_only_count_mismatch')
  return {
    ok: failures.length === 0,
    failures: Array.from(new Set(failures)),
    summary: snapshot.summary || {},
  }
}

export function buildDevHubScoperEvidenceTraceReadbackDogfoodProof() {
  const traceResult = {
    ok: true,
    directorReportArtifactId: DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID,
    candidateLimit: 3,
    reviewedCandidates: [
      {
        rank: 1,
        title: 'Ready traced candidate',
        sourceTrustLabel: 'api_full_watch',
        sourceReportArtifactId: 'batch:ready',
        sourceVideoId: 'ready-video',
        directorAtomId: 'atom:director:ready',
        directorHitId: 'hit:director:ready',
        rawReportArtifactId: 'batch:raw-ready',
        rawAtomId: 'atom:raw:ready',
        rawHitId: 'hit:raw:ready',
        evidenceTimestamps: ['01:02'],
        sourceTraceStatus: 'source_trace_ready',
        scoperStatus: DEV_BUILD_SCOPER_STATUS.readyForPortfolio,
        portfolioDecision: 'standalone_scoped_candidate',
        promotionStatus: 'proposal_only_needs_scoper_before_steve_approval',
      },
      {
        rank: 2,
        title: 'Parked missing raw hit',
        sourceTrustLabel: 'api_full_watch',
        sourceReportArtifactId: 'batch:missing-hit',
        sourceVideoId: 'missing-hit-video',
        directorAtomId: 'atom:director:missing-hit',
        directorHitId: 'hit:director:missing-hit',
        rawReportArtifactId: 'batch:raw-missing-hit',
        rawAtomId: 'atom:raw:missing-hit',
        rawHitId: '',
        evidenceTimestamps: ['02:03'],
        sourceTraceStatus: 'source_atom_found_hit_missing',
        scoperStatus: DEV_BUILD_SCOPER_STATUS.needsResearch,
        portfolioDecision: '',
        promotionStatus: 'proposal_only_needs_scoper_before_steve_approval',
      },
      {
        rank: 3,
        title: 'Blocked auth candidate',
        sourceTrustLabel: 'private_source',
        sourceReportArtifactId: 'batch:blocked',
        sourceVideoId: 'blocked-video',
        directorAtomId: 'atom:director:blocked',
        directorHitId: 'hit:director:blocked',
        rawReportArtifactId: '',
        rawAtomId: '',
        rawHitId: '',
        evidenceTimestamps: [],
        sourceTraceStatus: 'raw_source_evidence_missing',
        scoperStatus: DEV_BUILD_SCOPER_STATUS.blockedSourceOrAuth,
        portfolioDecision: '',
        promotionStatus: 'proposal_only_needs_scoper_before_steve_approval',
      },
    ],
  }
  const snapshot = buildDevHubScoperEvidenceTraceReadback({ traceResult, candidateLimit: 3 })
  const validation = validateDevHubScoperEvidenceTraceReadback(snapshot)
  const unsafeReady = {
    ...snapshot,
    ok: true,
    status: 'healthy',
    failures: [],
    candidates: snapshot.candidates.map(candidate => candidate.rank === 2
      ? {
          ...candidate,
          scoperStatus: DEV_BUILD_SCOPER_STATUS.readyForPortfolio,
          readyForPortfolio: true,
          rawTraceReady: false,
        }
      : candidate),
    summary: {
      ...snapshot.summary,
      readyForPortfolioCount: snapshot.summary.readyForPortfolioCount + 1,
    },
  }
  const unsafePromotion = {
    ...snapshot,
    ok: true,
    status: 'healthy',
    failures: [],
    candidates: snapshot.candidates.map(candidate => candidate.rank === 1
      ? {
          ...candidate,
          promotionStatus: 'auto_promoted_to_backlog',
        }
      : candidate),
    summary: {
      ...snapshot.summary,
      autoPromotedCount: 1,
      proposalOnlyCount: snapshot.summary.proposalOnlyCount - 1,
    },
  }
  const unsafeReadyValidation = validateDevHubScoperEvidenceTraceReadback(unsafeReady)
  const unsafePromotionValidation = validateDevHubScoperEvidenceTraceReadback(unsafePromotion)
  return {
    ok: validation.ok &&
      snapshot.summary.reviewedCount === 3 &&
      snapshot.summary.readyForPortfolioCount === 1 &&
      snapshot.summary.parkedCount === 2 &&
      snapshot.summary.blockedSourceOrAuthCount === 1 &&
      snapshot.summary.autoPromotedCount === 0 &&
      unsafeReadyValidation.ok === false &&
      unsafeReadyValidation.failures.includes('candidate_ready_without_raw_trace') &&
      unsafePromotionValidation.ok === false &&
      unsafePromotionValidation.failures.includes('auto_promoted_candidates_present'),
    validation,
    unsafeReadyValidation,
    unsafePromotionValidation,
    snapshot,
    invariant: 'Scoper readback only marks raw atom+hit traced candidates as ready, parks missing evidence/auth candidates, and rejects auto-promotion.',
  }
}
