import crypto from 'node:crypto'

import {
  BUILD_OPPORTUNITY_PROMOTION_GATE_CARD_ID,
  buildBuildOpportunityPromotionGateDogfoodProof,
} from './build-opportunity-promotion-gate.js'
import {
  BUILD_PORTFOLIO_DECISIONS,
  BUILD_PORTFOLIO_DIRECTOR_HANDOFF_STAGE,
  BUILD_PORTFOLIO_SCRUM_MASTER_CARD_ID,
  buildPortfolioReviewFromDirectorSnapshot,
} from './build-portfolio-scrum-master.js'
import {
  DEV_BUILD_OPPORTUNITY_SCOPER_CARD_ID,
  buildDevBuildOpportunityScoperDogfoodProof,
} from './dev-build-opportunity-scoper.js'
import {
  DEV_SOURCE_SLICE_ROUTER_REPORT_ARTIFACT_ID,
  buildDevSourceSliceDirectorInputBundle,
  buildDevSourceSliceRouterSnapshot,
} from './dev-source-slice-router.js'
import {
  DEV_TEAM_INTELLIGENCE_DIRECTOR_PROMOTION_STATUS,
  buildDevTeamIntelligenceDirectorSnapshot,
  renderDevTeamIntelligenceDirectorReport,
} from './dev-team-intelligence-director.js'

export const INTELLIGENCE_SPINE_QUALITY_EVAL_CARD_ID = 'INTELLIGENCE-SPINE-QUALITY-EVAL-001'
export const INTELLIGENCE_SPINE_QUALITY_EVAL_PLAN_PATH = 'docs/process/intelligence-spine-quality-eval-001-plan.md'
export const INTELLIGENCE_SPINE_QUALITY_EVAL_APPROVAL_PATH = 'docs/process/approvals/INTELLIGENCE-SPINE-QUALITY-EVAL-001.json'
export const INTELLIGENCE_SPINE_QUALITY_EVAL_SCRIPT_PATH = 'scripts/process-intelligence-spine-quality-eval-check.mjs'
export const INTELLIGENCE_SPINE_QUALITY_EVAL_REPORT_PATH = 'docs/source-notes/intelligence-spine-quality-eval-2026-05-26.md'
export const INTELLIGENCE_SPINE_QUALITY_EVAL_CLOSEOUT_KEY = 'intelligence-spine-quality-eval-v1'

export const INTELLIGENCE_SPINE_QUALITY_EVAL_MARK_REPORT_IDS = [
  'batch:mark-kashef-last-50:api-full-watch-small-batch-v1',
  'proof:mark-kashef-last-50-baseline-001:god-mode-end-to-end:5xrjO38WUYY',
]

export const INTELLIGENCE_SPINE_QUALITY_EVAL_CHANGED_FILES = [
  'lib/intelligence-spine-quality-eval.js',
  INTELLIGENCE_SPINE_QUALITY_EVAL_SCRIPT_PATH,
  INTELLIGENCE_SPINE_QUALITY_EVAL_PLAN_PATH,
  INTELLIGENCE_SPINE_QUALITY_EVAL_APPROVAL_PATH,
  INTELLIGENCE_SPINE_QUALITY_EVAL_REPORT_PATH,
  'lib/foundation-build-closeout-overnight-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'docs/handoffs/2026-05-26-intelligence-spine-quality-eval-closeout.md',
  'package.json',
]

const CURRENT_SCORE_PASS = 85
const IMPROVEMENT_PASS = 25

function text(value) {
  return String(value || '').trim()
}

function compact(value) {
  return text(value).replace(/\s+/g, ' ')
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value).sort().reduce((memo, key) => {
    if (value[key] !== undefined) memo[key] = stableValue(value[key])
    return memo
  }, {})
}

function stableHash(value = '') {
  return crypto.createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex')
}

function slug(value = '') {
  return compact(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'candidate'
}

function unique(values = []) {
  return [...new Set(values.map(text).filter(Boolean))]
}

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function scoreFromCandidate(candidate = {}) {
  const direct = number(candidate.qualityScore ?? candidate.quality_score ?? candidate.relevanceScore ?? candidate.relevance_score, NaN)
  if (Number.isFinite(direct) && direct > 0) return direct <= 10 ? direct * 10 : Math.min(100, direct)
  const confidence = text(candidate.confidence || candidate.extractionConfidence || candidate.extraction_confidence).toLowerCase()
  if (confidence === 'high') return 82
  if (confidence === 'medium') return 62
  if (confidence === 'low') return 35
  return 50
}

function reportId(report = {}) {
  return text(report.reportArtifactId || report.report_artifact_id)
}

function sourceIdsFromReport(report = {}) {
  return unique(report.sourceIds || report.source_ids)
}

function sourceRefsFromCandidate(candidate = {}, source = {}) {
  return unique([
    source.reportArtifactId,
    ...(source.sourceIds || []),
    ...(list(candidate.evidenceRefs || candidate.evidence || candidate.sourceRefs).map(item => typeof item === 'string' ? item : JSON.stringify(item))),
    candidate.sourceVideoId ? `youtube:${candidate.sourceVideoId}` : '',
    candidate.videoId ? `youtube:${candidate.videoId}` : '',
    candidate.sourceUrl,
    candidate.source_url,
    candidate.anchorValue,
    candidate.anchor_value,
    candidate.atomId,
    candidate.atom_id,
    candidate.hitId,
    candidate.hit_id,
    ...(list(candidate.evidenceTimestamps).map(item => `timestamp:${item}`)),
  ])
}

function normalizeCandidate(raw = {}, source = {}) {
  const title = compact(raw.title || raw.finding || raw.theme || raw.atomId || raw.atom_id)
  if (!title) return null
  const why = compact(raw.whyItMatters || raw.why || raw.content || raw.finding || raw.summary || raw.derivedClaim)
  const recommendedNextStep = compact(raw.recommendedNextStep || raw.recommendation || raw.suggestedAction || raw.suggested_action || raw.nextStep)
  const sourceVideoId = text(raw.sourceVideoId || raw.videoId || raw.video_id || raw.metadata?.sourceVideoId)
  const sourceRefs = sourceRefsFromCandidate({ ...raw, sourceVideoId }, source)
  return {
    candidateKey: `quality-eval:${slug(title)}:${stableHash({ title, sourceRefs }).slice(0, 10)}`,
    title,
    titleSlug: slug(title),
    why,
    recommendedNextStep,
    sourceReportArtifactId: source.reportArtifactId,
    sourceReportTitle: source.reportTitle,
    sourceIds: source.sourceIds || [],
    sourceVideoId,
    sourceRefs,
    evidenceTimestamps: list(raw.evidenceTimestamps).map(text).filter(Boolean),
    confidence: text(raw.confidence || raw.extractionConfidence || raw.extraction_confidence),
    qualityScore: scoreFromCandidate(raw),
    rawKind: source.kind || 'report',
  }
}

function collectStructuredCandidates(structured = {}, source = {}) {
  const videoCandidates = list(structured.videos).flatMap(video =>
    list(video.buildCandidates).map(candidate => ({
      ...candidate,
      videoId: candidate.videoId || video.videoId,
      sourceVideoId: candidate.sourceVideoId || video.videoId,
      sourceUrl: candidate.sourceUrl || video.url,
    }))
  )
  const buckets = [
    structured.buildCandidates,
    structured.topBuildCandidates,
    structured.opportunities,
    structured.reviewRoutes,
    structured.snapshot?.topBuildCandidates,
    structured.snapshot?.modelComparison?.topBuildCandidates,
    structured.output?.buildCandidates,
    videoCandidates,
  ]
  return buckets.flatMap(bucket => list(bucket)).map(item => normalizeCandidate(item, source)).filter(Boolean)
}

export function collectQualityEvalCandidatesFromBundle(bundle = {}) {
  const report = bundle.report || {}
  const id = reportId(report)
  if (!id) return []
  const source = {
    kind: 'report',
    reportArtifactId: id,
    reportTitle: report.title || id,
    sourceIds: sourceIdsFromReport(report),
  }
  const rows = [
    ...list(report.topFindings || report.top_findings).map(item => normalizeCandidate(item, source)).filter(Boolean),
    ...collectStructuredCandidates(report.structuredOutputJson || report.structured_output_json || {}, source),
  ]
  for (const atom of list(bundle.atoms)) {
    rows.push(normalizeCandidate(atom, { ...source, kind: 'atom' }))
  }
  return rows.filter(Boolean)
}

export function buildLegacyFlatCandidateBaseline({ reportBundles = [] } = {}) {
  const rawCandidates = reportBundles.flatMap(bundle => collectQualityEvalCandidatesFromBundle(bundle))
  const duplicateGroups = Array.from(rawCandidates.reduce((groups, candidate) => {
    if (!groups.has(candidate.titleSlug)) groups.set(candidate.titleSlug, [])
    groups.get(candidate.titleSlug).push(candidate)
    return groups
  }, new Map()).values()).filter(group => group.length > 1)
  const topRawCandidates = [...rawCandidates]
    .sort((left, right) => number(right.qualityScore) - number(left.qualityScore) || left.title.localeCompare(right.title))
    .slice(0, 10)
  const topWithPlainEnglish = topRawCandidates.filter(candidate =>
    candidate.title && candidate.why.length >= 24 && candidate.recommendedNextStep.length >= 18
  ).length
  const topWithSourceAnchor = topRawCandidates.filter(candidate =>
    candidate.sourceReportArtifactId || candidate.sourceVideoId || candidate.sourceRefs.length
  ).length
  const topWithEvidencePointers = topRawCandidates.filter(candidate =>
    candidate.evidenceTimestamps.length || candidate.sourceVideoId || candidate.sourceRefs.some(ref => /^(atom|hit|timestamp|youtube:)/i.test(ref))
  ).length
  const topFromFullWatch = topRawCandidates.filter(candidate =>
    /api-full-watch|god-mode|youtube-latest-20|mark-kashef/i.test(candidate.sourceReportArtifactId)
  ).length

  const denominator = Math.max(1, topRawCandidates.length)
  const scoreBreakdown = {
    plainEnglish: Math.round((topWithPlainEnglish / denominator) * 20),
    evidence: Math.round(((topWithSourceAnchor + topWithEvidencePointers) / (denominator * 2)) * 15),
    dedupe: duplicateGroups.length ? 0 : 8,
    routing: 0,
    ranking: Math.min(10, topFromFullWatch * 2),
    safety: 4,
  }
  const score = Object.values(scoreBreakdown).reduce((sum, value) => sum + value, 0)

  return {
    mode: 'legacy_flat_candidate_baseline',
    score,
    scoreBreakdown,
    rawCandidateCount: rawCandidates.length,
    uniqueCandidateCount: new Set(rawCandidates.map(candidate => candidate.titleSlug)).size,
    duplicateClusterCount: duplicateGroups.length,
    duplicateClusters: duplicateGroups.slice(0, 8).map(group => ({
      title: group[0]?.title || 'Untitled',
      count: group.length,
      sourceReports: unique(group.map(candidate => candidate.sourceReportArtifactId)),
    })),
    topRawCandidates: topRawCandidates.map(candidate => ({
      title: candidate.title,
      sourceReportArtifactId: candidate.sourceReportArtifactId,
      sourceVideoId: candidate.sourceVideoId,
      qualityScore: candidate.qualityScore,
      hasWhy: candidate.why.length >= 24,
      hasNextStep: candidate.recommendedNextStep.length >= 18,
      sourceRefCount: candidate.sourceRefs.length,
      evidenceTimestampCount: candidate.evidenceTimestamps.length,
    })),
    knownGaps: [
      'No source-slice router, so internal operating follow-up can pollute Dev build ranking.',
      'No Scoper/Portfolio boundary, so raw recommendations can look build-ready.',
      'No promotion gate, so approval, duplicate, stale, unsafe, and no-write checks are not enforced.',
      'No report-level quality score for Steve to compare before broad extraction scale-up.',
    ],
  }
}

function evaluateCurrentSpineQuality({
  baseline,
  directorSnapshot,
  devSourceSlice,
  portfolioReview,
  scoperDogfood,
  promotionDogfood,
  directorReport,
} = {}) {
  const topCandidates = list(directorSnapshot.recommendedBuildNow)
  const denominator = Math.max(1, topCandidates.length)
  const topWithPlainEnglish = topCandidates.filter(candidate =>
    candidate.title &&
      text(candidate.why).length >= 24 &&
      text(candidate.recommendedNextStep).length >= 24 &&
      text(candidate.scopeReadiness?.scoperQuestion).length >= 24
  ).length
  const topWithSourceAnchor = topCandidates.filter(candidate =>
    candidate.sourceReportArtifactId || candidate.sourceVideoId || list(candidate.evidenceRefs).length
  ).length
  const topWithReadiness = topCandidates.filter(candidate =>
    candidate.promotionStatus === DEV_TEAM_INTELLIGENCE_DIRECTOR_PROMOTION_STATUS &&
      candidate.scopeReadiness?.status &&
      Array.isArray(candidate.scopeReadiness?.missing)
  ).length
  const sortedByScore = topCandidates.every((candidate, index, rows) =>
    index === 0 || number(rows[index - 1].missionScore?.total) >= number(candidate.missionScore?.total)
  )
  const topIncludesFullWatch = topCandidates.some(candidate => candidate.sourceTrustLabel === 'api_full_watch')
  const portfolioReturnsRawDirector = list(portfolioReview.groups).length >= 1 &&
    list(portfolioReview.groups).every(group => group.decision === BUILD_PORTFOLIO_DECISIONS.returnToScoper)
  const sourceSliceRoutes = devSourceSlice?.ok === true &&
    number(devSourceSlice.counts?.inputReports) >= 1 &&
    (number(devSourceSlice.counts?.devCandidates) + number(devSourceSlice.counts?.parkedOperational)) >= 1
  const dedupeImprovement = number(baseline.rawCandidateCount) > number(directorSnapshot.candidateCount)
    ? 15
    : number(baseline.duplicateClusterCount) > 0
      ? 12
      : 8

  const scoreBreakdown = {
    plainEnglish: Math.round((topWithPlainEnglish / denominator) * 20),
    evidence: Math.round((topWithSourceAnchor / denominator) * 18),
    readiness: Math.round((topWithReadiness / denominator) * 12),
    dedupe: dedupeImprovement,
    routing: [
      sourceSliceRoutes,
      portfolioReturnsRawDirector,
      scoperDogfood?.ok === true,
      promotionDogfood?.ok === true,
    ].filter(Boolean).length * 6,
    ranking: (sortedByScore ? 8 : 0) + (topIncludesFullWatch ? 7 : 0),
    safety: directorSnapshot.noAutoBacklogPromotion === true && directorSnapshot.externalWrites === false ? 10 : 0,
  }
  const score = Math.min(100, Object.values(scoreBreakdown).reduce((sum, value) => sum + value, 0))

  return {
    mode: 'current_director_source_slice_scoper_portfolio_promotion_spine',
    score,
    passThreshold: CURRENT_SCORE_PASS,
    scoreBreakdown,
    improvementOverBaseline: score - number(baseline.score),
    improvementThreshold: IMPROVEMENT_PASS,
    director: {
      ok: directorSnapshot.ok === true,
      status: directorSnapshot.status,
      candidateCount: directorSnapshot.candidateCount,
      approvalRequiredCount: directorSnapshot.approvalRequiredCount,
      sourceCoverageCount: list(directorSnapshot.sourceCoverage).length,
      topCandidates: topCandidates.map(candidate => ({
        rank: candidate.rank,
        title: candidate.title,
        missionScore: candidate.missionScore?.total,
        sourceTrustLabel: candidate.sourceTrustLabel,
        sourceReportArtifactId: candidate.sourceReportArtifactId,
        sourceVideoId: candidate.sourceVideoId,
        buildReadiness: candidate.buildReadiness,
        promotionStatus: candidate.promotionStatus,
      })),
    },
    sourceSlice: devSourceSlice ? {
      ok: devSourceSlice.ok === true,
      reportArtifactId: DEV_SOURCE_SLICE_ROUTER_REPORT_ARTIFACT_ID,
      inputReports: devSourceSlice.counts?.inputReports || 0,
      devCandidates: devSourceSlice.counts?.devCandidates || 0,
      parkedOperational: devSourceSlice.counts?.parkedOperational || 0,
    } : null,
    portfolio: {
      inputStage: portfolioReview.inputStage,
      scoperRequired: portfolioReview.scoperRequired === true,
      groupCount: list(portfolioReview.groups).length,
      returnToScoperCount: list(portfolioReview.groups)
        .filter(group => group.decision === BUILD_PORTFOLIO_DECISIONS.returnToScoper).length,
    },
    renderedReportHasPlainEnglishSections: /Build readiness:/i.test(directorReport || '') &&
      /Scoper question:/i.test(directorReport || '') &&
      /Source Coverage/i.test(directorReport || ''),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

export function buildIntelligenceSpineQualityEvalSnapshot({
  generatedAt = new Date().toISOString(),
  videoReportBundles = [],
  sharedReportBundles = [],
  currentSprint = null,
  systemStrategyText = '',
  businessStrategyText = '',
  currentPlanText = '',
} = {}) {
  const baseline = buildLegacyFlatCandidateBaseline({
    reportBundles: [...videoReportBundles, ...sharedReportBundles],
  })
  const devSourceSlice = buildDevSourceSliceRouterSnapshot({
    reportBundles: sharedReportBundles,
    generatedAt,
  })
  const directorInputBundles = [
    ...videoReportBundles,
    ...(devSourceSlice.ok && list(devSourceSlice.devCandidates).length
      ? [buildDevSourceSliceDirectorInputBundle(devSourceSlice)]
      : []),
  ]
  const directorSnapshot = buildDevTeamIntelligenceDirectorSnapshot({
    generatedAt,
    reportBundles: directorInputBundles,
    currentSprint,
    systemStrategyText,
    businessStrategyText,
    currentPlanText,
  })
  const portfolioReview = buildPortfolioReviewFromDirectorSnapshot(directorSnapshot, { candidateLimit: 5 })
  const scoperDogfood = buildDevBuildOpportunityScoperDogfoodProof()
  const promotionDogfood = buildBuildOpportunityPromotionGateDogfoodProof()
  const directorReport = renderDevTeamIntelligenceDirectorReport(directorSnapshot)
  const current = evaluateCurrentSpineQuality({
    baseline,
    directorSnapshot,
    devSourceSlice,
    portfolioReview,
    scoperDogfood,
    promotionDogfood,
    directorReport,
  })
  const selectedReports = {
    markVideoReportIds: videoReportBundles.map(bundle => reportId(bundle.report)).filter(id => /mark-kashef|5xrjO38WUYY/i.test(id)),
    sharedInternalReportIds: sharedReportBundles.map(bundle => reportId(bundle.report)).filter(Boolean),
    directorInputReportIds: directorInputBundles.map(bundle => reportId(bundle.report)).filter(Boolean),
  }

  const checks = []
  addCheck(
    checks,
    selectedReports.markVideoReportIds.length >= 1,
    'same-input sample includes Mark full-watch video reports',
    selectedReports.markVideoReportIds.join(', ') || 'missing'
  )
  addCheck(
    checks,
    selectedReports.sharedInternalReportIds.length >= 1,
    'same-input sample includes meeting/comms synthesis reports',
    `${selectedReports.sharedInternalReportIds.length}`
  )
  addCheck(
    checks,
    baseline.rawCandidateCount >= 6,
    'legacy baseline sees enough raw candidates to compare',
    `${baseline.rawCandidateCount} raw candidates`
  )
  addCheck(
    checks,
    baseline.duplicateClusterCount >= 1,
    'legacy baseline exposes duplicate candidate noise on the same inputs',
    `${baseline.duplicateClusterCount} duplicate clusters`
  )
  addCheck(
    checks,
    devSourceSlice.ok === true &&
      (number(devSourceSlice.counts?.devCandidates) + number(devSourceSlice.counts?.parkedOperational)) >= 1,
    'source-slice router evaluates internal reports before Director',
    `dev=${devSourceSlice.counts?.devCandidates || 0}; parked=${devSourceSlice.counts?.parkedOperational || 0}`
  )
  addCheck(
    checks,
    directorSnapshot.ok === true,
    'Director snapshot is healthy on quality-eval inputs',
    directorSnapshot.failures?.map(failure => failure.check).join(', ') || directorSnapshot.status
  )
  addCheck(
    checks,
    current.director.topCandidates.length >= 3 &&
      current.director.topCandidates.every(candidate => candidate.promotionStatus === DEV_TEAM_INTELLIGENCE_DIRECTOR_PROMOTION_STATUS),
    'Director emits plain-English proposal-only top candidates',
    `${current.director.topCandidates.length} top candidates`
  )
  addCheck(
    checks,
    current.director.topCandidates.every(candidate => candidate.sourceReportArtifactId),
    'Director top candidates keep source report anchors',
    current.director.topCandidates.map(candidate => candidate.sourceReportArtifactId).join(', ')
  )
  addCheck(
    checks,
    current.renderedReportHasPlainEnglishSections,
    'Director report contains build readiness, Scoper question, and source coverage sections',
    'plain-English sections present'
  )
  addCheck(
    checks,
    current.portfolio.scoperRequired === true &&
      current.portfolio.inputStage === BUILD_PORTFOLIO_DIRECTOR_HANDOFF_STAGE &&
      current.portfolio.groupCount >= 1 &&
      current.portfolio.groupCount === current.portfolio.returnToScoperCount,
    'Portfolio returns raw Director output to Scoper instead of promotion',
    `groups=${current.portfolio.groupCount}; returned=${current.portfolio.returnToScoperCount}`
  )
  addCheck(
    checks,
    scoperDogfood.ok === true,
    'Scoper dogfood still requires raw evidence, link disposition, proof, risks, and not-next boundaries',
    scoperDogfood.checks?.filter(check => !check.ok).map(check => check.check).join(', ') || DEV_BUILD_OPPORTUNITY_SCOPER_CARD_ID
  )
  addCheck(
    checks,
    promotionDogfood.ok === true,
    'Promotion gate dogfood still blocks weak, duplicate, stale, unsafe, and unapproved candidates',
    promotionDogfood.checks?.filter(check => !check.ok).map(check => check.check).join(', ') || BUILD_OPPORTUNITY_PROMOTION_GATE_CARD_ID
  )
  addCheck(
    checks,
    current.score >= CURRENT_SCORE_PASS,
    'current intelligence spine quality score clears pass threshold',
    `${current.score}/${CURRENT_SCORE_PASS}`
  )
  addCheck(
    checks,
    current.improvementOverBaseline >= IMPROVEMENT_PASS,
    'current spine improves materially over legacy flat baseline',
    `+${current.improvementOverBaseline} points over ${baseline.score}`
  )
  addCheck(
    checks,
    directorSnapshot.noAutoBacklogPromotion === true &&
      directorSnapshot.externalWrites === false,
    'quality eval path stays no-backlog and no-external-write',
    'proposal-only'
  )

  const failures = checks.filter(check => !check.ok)

  return {
    ok: failures.length === 0,
    status: failures.length ? 'risk' : 'healthy',
    generatedAt,
    cardId: INTELLIGENCE_SPINE_QUALITY_EVAL_CARD_ID,
    reportPath: INTELLIGENCE_SPINE_QUALITY_EVAL_REPORT_PATH,
    selectedReports,
    upstreamCards: [
      DEV_BUILD_OPPORTUNITY_SCOPER_CARD_ID,
      BUILD_PORTFOLIO_SCRUM_MASTER_CARD_ID,
      BUILD_OPPORTUNITY_PROMOTION_GATE_CARD_ID,
    ],
    baseline,
    current,
    checks,
    failures,
    noProviderCalls: true,
    noLiveExtraction: true,
    externalWrites: false,
    writesBacklog: false,
  }
}

export function buildIntelligenceSpineQualityEvalDogfoodProof() {
  const fullWatchReport = {
    report: {
      reportArtifactId: 'batch:mark-kashef-last-50:api-full-watch-small-batch-v1',
      title: 'Dogfood Mark full-watch report',
      reportType: 'director_brief',
      status: 'generated',
      sourceIds: ['SRC-YOUTUBE-INTEL-001'],
      metadata: { fullWatchRoute: 'api_full_watch' },
      structuredOutputJson: {
        buildCandidates: [
          {
            title: 'Video-to-SOP Agentic Pipeline',
            whyItMatters: 'Turns approved video walkthroughs into source-backed SOP packets.',
            recommendedNextStep: 'Scope a bounded SOP packet generator over existing approved video artifacts.',
            confidence: 'high',
            qualityScore: 9,
            sourceVideoId: 'dogfood-video',
            evidenceTimestamps: ['01:00', '02:00'],
          },
          {
            title: 'Video-to-SOP Agentic Pipeline',
            whyItMatters: 'Duplicate version of the same idea from the same watched source.',
            recommendedNextStep: 'Merge this duplicate instead of creating another build card.',
            confidence: 'high',
            qualityScore: 8,
            sourceVideoId: 'dogfood-video',
            evidenceTimestamps: ['03:00'],
          },
          {
            title: 'Director Scoper Readiness Gate',
            whyItMatters: 'Raw recommendations need readiness labels before Steve approval.',
            recommendedNextStep: 'Keep Director output proposal-only and send incomplete items to Scoper.',
            confidence: 'high',
            qualityScore: 8,
            sourceVideoId: 'dogfood-video',
            evidenceTimestamps: ['04:00'],
          },
        ],
      },
      actionRequiredItems: [{ label: 'source approval', reason: 'dogfood' }],
    },
    atoms: [],
    hits: [],
  }
  const sharedReport = {
    report: {
      reportArtifactId: 'report-artifact:synthesis-engine-fresh-candidate-promotion-dogfood',
      title: 'Dogfood internal shared comms report',
      reportType: 'department_brief',
      status: 'reviewed',
      sourceIds: ['SRC-MEETINGS-001', 'SRC-SLACK-001'],
      structuredOutputJson: {},
      topFindings: [],
    },
    atoms: [
      {
        atomId: 'atom:shared:dev-router',
        title: 'Repair synthesis router freshness',
        content: 'The system needs synthesis router freshness and dashboard source status repair after extractors succeed.',
        suggestedAction: 'Route this as a Dev Director candidate because it mentions system source freshness and synthesis router behavior.',
        sourceId: 'SRC-MEETINGS-001',
        qualityScore: 7,
      },
      {
        atomId: 'atom:shared:ops-only',
        title: 'Commission file follow-up',
        content: 'Commission and transaction paperwork needs a file update.',
        suggestedAction: 'Park this operational follow-up outside Dev build intelligence.',
        sourceId: 'SRC-SLACK-001',
        qualityScore: 5,
      },
    ],
    hits: [],
  }
  const secondFullWatchReport = {
    report: {
      reportArtifactId: 'proof:mark-kashef-last-50-baseline-001:god-mode-end-to-end:5xrjO38WUYY',
      title: 'Dogfood Mark second full-watch report',
      reportType: 'director_brief',
      status: 'generated',
      sourceIds: ['SRC-YOUTUBE-INTEL-001'],
      metadata: { fullWatchRoute: 'api_full_watch' },
      structuredOutputJson: {
        buildCandidates: [
          {
            title: 'Checkpointed Agent Handoff Layer',
            whyItMatters: 'Long-running AIOS work needs reliable handoffs, checkpoints, and source-backed context continuity.',
            recommendedNextStep: 'Scope a reusable checkpoint contract for long-running agents and builder workflows.',
            confidence: 'high',
            qualityScore: 8,
            sourceVideoId: 'dogfood-video-2',
            evidenceTimestamps: ['05:00'],
          },
          {
            title: 'Evidence Packet Promotion Review',
            whyItMatters: 'Build candidates need compact evidence packets before Steve approves backlog promotion.',
            recommendedNextStep: 'Keep candidate promotion approval-bound and preserve source refs, risks, proof, and not-next boundaries.',
            confidence: 'high',
            qualityScore: 8,
            sourceVideoId: 'dogfood-video-2',
            evidenceTimestamps: ['06:00'],
          },
        ],
      },
      actionRequiredItems: [{ label: 'resource link approval', reason: 'dogfood' }],
    },
    atoms: [],
    hits: [],
  }
  const snapshot = buildIntelligenceSpineQualityEvalSnapshot({
    generatedAt: '2026-05-26T06:30:00.000-04:00',
    videoReportBundles: [fullWatchReport, secondFullWatchReport],
    sharedReportBundles: [sharedReport],
    currentSprint: {
      sprint: {
        sprintId: 'dogfood-sprint',
        activeBlockerCardId: 'INTELLIGENCE-SPINE-QUALITY-EVAL-001',
      },
    },
    systemStrategyText: 'AIOS Mission: source-backed AIOS execution for Steve, leadership, staff, and agent/realtor coaching at scale.',
    businessStrategyText: 'Business strategy supports agent/realtor coaching and scalable execution.',
    currentPlanText: 'Director scoring must use Foundation/shared truth, God Mode Extractor, reliable agents/execution systems, context continuity, agent/realtor coaching leverage, and approval-gated build path.',
  })
  const checks = [
    {
      ok: snapshot.ok === true,
      check: 'synthetic same-input quality eval passes',
      detail: snapshot.failures.map(failure => failure.check).join(', ') || snapshot.status,
    },
    {
      ok: snapshot.baseline.duplicateClusterCount >= 1,
      check: 'dogfood baseline recreates duplicate raw-candidate noise',
      detail: `${snapshot.baseline.duplicateClusterCount}`,
    },
    {
      ok: snapshot.current.sourceSlice.devCandidates >= 1 && snapshot.current.sourceSlice.parkedOperational >= 1,
      check: 'dogfood source-slice router separates Dev signal from ops follow-up',
      detail: `dev=${snapshot.current.sourceSlice.devCandidates}; parked=${snapshot.current.sourceSlice.parkedOperational}`,
    },
    {
      ok: snapshot.current.portfolio.groupCount === snapshot.current.portfolio.returnToScoperCount,
      check: 'dogfood portfolio blocks raw Director output from promotion',
      detail: `${snapshot.current.portfolio.returnToScoperCount}/${snapshot.current.portfolio.groupCount}`,
    },
    {
      ok: snapshot.current.improvementOverBaseline >= IMPROVEMENT_PASS,
      check: 'dogfood current spine improves over flat baseline',
      detail: `+${snapshot.current.improvementOverBaseline}`,
    },
  ]
  return {
    ok: checks.every(check => check.ok),
    checks,
    snapshot,
  }
}

export function renderIntelligenceSpineQualityEvalReport(snapshot = {}) {
  const lines = []
  lines.push('# Intelligence Spine Quality Eval - 2026-05-26')
  lines.push('')
  lines.push(`Generated: ${snapshot.generatedAt || ''}`)
  lines.push(`Card: \`${snapshot.cardId || INTELLIGENCE_SPINE_QUALITY_EVAL_CARD_ID}\``)
  lines.push(`Status: \`${snapshot.status || 'unknown'}\``)
  lines.push('')
  lines.push('## Scope')
  lines.push('')
  lines.push('This report evaluates the existing stored intelligence spine only. It does not run extraction, call providers, browse, click, log in, submit forms, download files, create backlog cards, mutate sprint state, or write externally.')
  lines.push('')
  lines.push('## Same-Input Sample')
  lines.push('')
  lines.push(`- Mark video reports: ${list(snapshot.selectedReports?.markVideoReportIds).map(id => `\`${id}\``).join(', ') || 'none'}`)
  lines.push(`- Shared meeting/comms reports: ${list(snapshot.selectedReports?.sharedInternalReportIds).length}`)
  lines.push(`- Director input reports after source-slice filtering: ${list(snapshot.selectedReports?.directorInputReportIds).length}`)
  lines.push('')
  lines.push('## Scorecard')
  lines.push('')
  lines.push(`- Legacy flat baseline: ${snapshot.baseline?.score ?? 0}`)
  lines.push(`- Current spine: ${snapshot.current?.score ?? 0}`)
  lines.push(`- Improvement: +${snapshot.current?.improvementOverBaseline ?? 0}`)
  lines.push('')
  lines.push('## What Improved')
  lines.push('')
  lines.push(`- Raw candidates inspected: ${snapshot.baseline?.rawCandidateCount ?? 0}`)
  lines.push(`- Duplicate raw clusters found: ${snapshot.baseline?.duplicateClusterCount ?? 0}`)
  lines.push(`- Director ranked candidates: ${snapshot.current?.director?.candidateCount ?? 0}`)
  lines.push(`- Source-slice routing: ${snapshot.current?.sourceSlice?.devCandidates ?? 0} Dev candidates, ${snapshot.current?.sourceSlice?.parkedOperational ?? 0} parked operational items`)
  lines.push(`- Portfolio raw-Director boundary: ${snapshot.current?.portfolio?.returnToScoperCount ?? 0}/${snapshot.current?.portfolio?.groupCount ?? 0} groups returned to Scoper`)
  lines.push('')
  lines.push('## Current Top Build Signals')
  lines.push('')
  for (const candidate of list(snapshot.current?.director?.topCandidates).slice(0, 5)) {
    lines.push(`- ${candidate.rank}. ${candidate.title} - score ${candidate.missionScore}; source \`${candidate.sourceReportArtifactId || 'unknown'}\`; readiness \`${candidate.buildReadiness || 'unknown'}\``)
  }
  lines.push('')
  lines.push('## Gates Checked')
  lines.push('')
  lines.push(`- Director promotion status stays \`${DEV_TEAM_INTELLIGENCE_DIRECTOR_PROMOTION_STATUS}\`.`)
  lines.push(`- Scoper card: \`${DEV_BUILD_OPPORTUNITY_SCOPER_CARD_ID}\``)
  lines.push(`- Portfolio card: \`${BUILD_PORTFOLIO_SCRUM_MASTER_CARD_ID}\``)
  lines.push(`- Promotion gate card: \`${BUILD_OPPORTUNITY_PROMOTION_GATE_CARD_ID}\``)
  lines.push('')
  lines.push('## Checks')
  lines.push('')
  for (const check of list(snapshot.checks)) {
    lines.push(`- ${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` - ${check.detail}` : ''}`)
  }
  lines.push('')
  lines.push('## Next')
  lines.push('')
  lines.push('Use this eval before broad extraction scale-up. If the score regresses, repair synthesis/router/Director quality before spending more watch budget.')
  lines.push('')
  return `${lines.join('\n')}\n`
}
