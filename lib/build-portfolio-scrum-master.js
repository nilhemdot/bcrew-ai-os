export const BUILD_PORTFOLIO_SCRUM_MASTER_CARD_ID = 'BUILD-PORTFOLIO-SCRUM-MASTER-001'
export const BUILD_PORTFOLIO_SCRUM_MASTER_PLAN_PATH = 'docs/process/build-portfolio-scrum-master-001-plan.md'
export const BUILD_PORTFOLIO_SCRUM_MASTER_APPROVAL_PATH = 'docs/process/approvals/BUILD-PORTFOLIO-SCRUM-MASTER-001.json'
export const BUILD_PORTFOLIO_SCRUM_MASTER_SCRIPT_PATH = 'scripts/process-build-portfolio-scrum-master-check.mjs'

export const BUILD_PORTFOLIO_DECISIONS = {
  mergedEnhanced: 'merged_enhanced_build_opportunity',
  standaloneCandidate: 'standalone_scoped_candidate',
  returnToScoper: 'return_to_scoper',
  parkBlocked: 'park_until_source_or_auth_ready',
  mergeIntoExisting: 'merge_into_existing_backlog_card',
}

export const BUILD_PORTFOLIO_STATUS = {
  proposalOnly: 'proposal_only_needs_steve_approval_after_portfolio_review',
}

export const BUILD_PORTFOLIO_MIN_SCOPED_TEXT_LENGTH = 220
export const BUILD_PORTFOLIO_DIRECTOR_HANDOFF_STAGE = 'raw_director_recommendation_needs_scoper'

export const OLD_DEV_SYSTEM_PORTFOLIO_EVIDENCE = [
  '/Users/bensoncrew/bcrew-buddy-reference/skills/bcrew-dev-director-intel/SKILL.md',
  '/Users/bensoncrew/bcrew-buddy-reference/skills/bcrew-implementation-scoper/SKILL.md',
  '/Users/bensoncrew/bcrew-buddy-reference/skills/bcrew-sprint-master/SKILL.md',
  '/Users/bensoncrew/bcrew-buddy-reference/skills/bcrew-backlog-monitor/SKILL.md',
  '/Users/bensoncrew/bcrew-buddy-reference/skills/knowledge/dev-planning.md',
  'docs/source-notes/old-system-dev-agent-harvest-2026-05-25.md',
  '/Users/bensoncrew/bcrew-ai-os/public/dev-reference/old-neural-map.html',
]

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'build',
  'by',
  'for',
  'from',
  'in',
  'into',
  'of',
  'on',
  'or',
  'our',
  'the',
  'to',
  'with',
])

const LANE_PATTERNS = [
  {
    lane: 'god-mode-extractor',
    patterns: [
      /\bextract(or|ion)?\b/i,
      /\bvideo\b/i,
      /\byoutube\b/i,
      /\bgemini\b/i,
      /\bvisual\b/i,
      /\btranscript\b/i,
      /\bcomments?\b/i,
      /\bskool\b/i,
      /\bmyicor\b/i,
    ],
  },
  {
    lane: 'intelligence-spine',
    patterns: [
      /\bsynthesis\b/i,
      /\brouter\b/i,
      /\bdedupe\b/i,
      /\batoms?\b/i,
      /\bevidence\b/i,
      /\bquality loop\b/i,
    ],
  },
  {
    lane: 'director-system',
    patterns: [
      /\bdirector\b/i,
      /\bportfolio\b/i,
      /\bsprint master\b/i,
      /\bscrum master\b/i,
      /\bscoper\b/i,
      /\bbacklog\b/i,
      /\brecommendations?\b/i,
    ],
  },
  {
    lane: 'agent-runtime',
    patterns: [
      /\bagent\b/i,
      /\bruntime\b/i,
      /\bhandoff\b/i,
      /\bstate\b/i,
      /\bmemory\b/i,
      /\bcontext\b/i,
      /\bskill\b/i,
    ],
  },
  {
    lane: 'source-registry',
    patterns: [
      /\bsource\b/i,
      /\bregistry\b/i,
      /\bauth\b/i,
      /\bcredential\b/i,
      /\bconnector\b/i,
      /\bgithub\b/i,
      /\bcommunity\b/i,
    ],
  },
  {
    lane: 'ui-workflow',
    patterns: [
      /\bui\b/i,
      /\bux\b/i,
      /\bpage\b/i,
      /\bhub\b/i,
      /\bdashboard\b/i,
      /\bfrontend\b/i,
      /\bdesign\b/i,
    ],
  },
]

function normalizeText(value) {
  return String(value || '').trim()
}

function compactWhitespace(value) {
  return normalizeText(value).replace(/\s+/g, ' ')
}

export function getBuildPortfolioCandidateText(candidate = {}) {
  return [
    candidate.id,
    candidate.title,
    candidate.summary,
    candidate.problem,
    candidate.recommendedNextStep,
    candidate.scope?.what,
    candidate.scope?.why,
    candidate.scope?.details,
    ...(candidate.tags || []),
  ].filter(Boolean).join('\n')
}

export function getBuildPortfolioLane(candidate = {}) {
  const text = getBuildPortfolioCandidateText(candidate)
  const scored = LANE_PATTERNS.map(lane => ({
    lane: lane.lane,
    score: lane.patterns.reduce((total, pattern) => total + (pattern.test(text) ? 1 : 0), 0),
  })).sort((a, b) => b.score - a.score)

  return scored[0]?.score > 0 ? scored[0].lane : 'general-aios'
}

export function tokenizeBuildPortfolioText(value = '') {
  const tokens = compactWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map(token => token.replace(/^-+|-+$/g, ''))
    .filter(token => token.length >= 3 && !STOP_WORDS.has(token))
  return [...new Set(tokens)]
}

function jaccardScore(aTokens = [], bTokens = []) {
  const a = new Set(aTokens)
  const b = new Set(bTokens)
  const union = new Set([...a, ...b])
  if (!union.size) return 0
  let overlap = 0
  for (const token of a) {
    if (b.has(token)) overlap += 1
  }
  return overlap / union.size
}

function hasMeaningfulList(value) {
  return Array.isArray(value) && value.filter(item => normalizeText(item)).length > 0
}

function firstMeaningfulList(...values) {
  return values.some(hasMeaningfulList)
}

function candidateHasHumanBlocker(candidate = {}) {
  const blockerText = [
    candidate.status,
    candidate.statusNote,
    candidate.blockedOn,
    candidate.blocker,
    ...(candidate.blockers || []),
  ].filter(Boolean).join(' ')
  return /\b(blocked|auth|credential|permission|source packet|paid|private|login|approval required)\b/i.test(blockerText)
}

export function getBuildPortfolioCompleteness(candidate = {}) {
  const textLength = getBuildPortfolioCandidateText(candidate).length
  const hasWhy = Boolean(normalizeText(candidate.scope?.why || candidate.whyItMatters || candidate.summary))
  const hasAcceptanceCriteria = firstMeaningfulList(
    candidate.scope?.acceptanceCriteria,
    candidate.acceptanceCriteria
  )
  const hasDefinitionOfDone = firstMeaningfulList(
    candidate.scope?.definitionOfDone,
    candidate.definitionOfDone
  )
  const hasTests = firstMeaningfulList(
    candidate.scope?.tests,
    candidate.scope?.proofPlan,
    candidate.testCommands,
    candidate.tests,
    candidate.proofPlan
  )
  const hasRisks = firstMeaningfulList(
    candidate.scope?.risks,
    candidate.risks
  )
  const hasNotNext = firstMeaningfulList(
    candidate.scope?.notNext,
    candidate.scope?.outOfScope,
    candidate.notNext,
    candidate.outOfScope
  )
  const hasExistingWork = firstMeaningfulList(
    candidate.scope?.existingWork,
    candidate.scope?.existingWorkToReuse,
    candidate.existingWork,
    candidate.existingWorkToReuse
  )
  const hasSourceLineage = firstMeaningfulList(
    candidate.sourceRefs,
    candidate.evidenceRefs,
    candidate.sourceIds
  )

  const missing = []
  if (!hasWhy) missing.push('why')
  if (!hasAcceptanceCriteria) missing.push('acceptance_criteria')
  if (!hasDefinitionOfDone) missing.push('definition_of_done')
  if (!hasTests) missing.push('proof_plan_or_tests')
  if (!hasRisks) missing.push('risks')
  if (!hasNotNext) missing.push('not_next')
  if (!hasExistingWork) missing.push('existing_work_to_reuse')
  if (!hasSourceLineage) missing.push('source_lineage')
  if (textLength < BUILD_PORTFOLIO_MIN_SCOPED_TEXT_LENGTH) missing.push('enough_scope_text')

  return {
    ok: missing.length === 0,
    missing,
    textLength,
  }
}

function normalizeCandidate(candidate = {}) {
  const text = getBuildPortfolioCandidateText(candidate)
  const tokens = tokenizeBuildPortfolioText(text)
  const lane = candidate.lane || getBuildPortfolioLane(candidate)
  const completeness = getBuildPortfolioCompleteness(candidate)
  const blocked = candidateHasHumanBlocker(candidate)
  return {
    ...candidate,
    id: candidate.id || candidate.cardId || candidate.title,
    title: compactWhitespace(candidate.title || candidate.id || 'Untitled candidate'),
    lane,
    portfolioGroupKey: candidate.portfolioGroupKey || null,
    tokens,
    completeness,
    blocked,
    sourceLineage: [
      ...(candidate.sourceRefs || []),
      ...(candidate.sourceIds || []),
      ...(candidate.evidenceRefs || []),
    ].filter(Boolean),
  }
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function number(value, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(number(value))))
}

function average(values = []) {
  const valid = values.map(value => number(value, NaN)).filter(value => Number.isFinite(value))
  if (!valid.length) return 0
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

function candidateImpactScore(candidate = {}) {
  const score = number(
    candidate.portfolioScore ??
      candidate.impactScore ??
      candidate.director?.missionScore ??
      candidate.missionScore?.total ??
      candidate.missionScore ??
      candidate.score ??
      candidate.qualityScore ??
      candidate.relevanceScore,
    0
  )
  if (score <= 0) return 55
  return score <= 20 ? clampScore(score * 5) : clampScore(score)
}

function decisionScoreAdjustment(decision) {
  if (decision === BUILD_PORTFOLIO_DECISIONS.mergedEnhanced) return 7
  if (decision === BUILD_PORTFOLIO_DECISIONS.standaloneCandidate) return 3
  if (decision === BUILD_PORTFOLIO_DECISIONS.mergeIntoExisting) return 1
  if (decision === BUILD_PORTFOLIO_DECISIONS.returnToScoper) return -28
  if (decision === BUILD_PORTFOLIO_DECISIONS.parkBlocked) return -35
  return 0
}

function buildPortfolioGroupScore(groupCandidates = [], decision) {
  const candidateScores = groupCandidates.map(candidateImpactScore)
  const baseImpact = candidateScores.length
    ? Math.round(Math.max(...candidateScores) * 0.65 + average(candidateScores) * 0.35)
    : 55
  const sourceLineageCount = new Set(groupCandidates.flatMap(candidate => candidate.sourceLineage || [])).size
  const evidenceBonus = Math.min(8, sourceLineageCount * 1.5)
  const mergeBonus = decision === BUILD_PORTFOLIO_DECISIONS.mergedEnhanced
    ? Math.min(8, 3 + groupCandidates.length)
    : 0
  const completenessBonus = groupCandidates.every(candidate => candidate.completeness?.ok) ? 5 : -12
  const score = clampScore(baseImpact + evidenceBonus + mergeBonus + completenessBonus + decisionScoreAdjustment(decision))
  return {
    portfolioScore: score,
    scoreBreakdown: {
      baseImpact,
      evidenceBonus: Number(evidenceBonus.toFixed(1)),
      mergeBonus,
      completenessBonus,
      decisionAdjustment: decisionScoreAdjustment(decision),
      candidateCount: groupCandidates.length,
      sourceLineageCount,
    },
  }
}

function decisionSortBucket(decision) {
  if (decision === BUILD_PORTFOLIO_DECISIONS.mergedEnhanced) return 0
  if (decision === BUILD_PORTFOLIO_DECISIONS.standaloneCandidate) return 0
  if (decision === BUILD_PORTFOLIO_DECISIONS.mergeIntoExisting) return 1
  if (decision === BUILD_PORTFOLIO_DECISIONS.returnToScoper) return 2
  if (decision === BUILD_PORTFOLIO_DECISIONS.parkBlocked) return 3
  return 4
}

function getDirectorRankedCandidates(snapshot = {}) {
  const rankedByKey = new Map()
  for (const candidate of [
    ...list(snapshot.recommendedBuildNow),
    ...list(snapshot.strongNext),
    ...list(snapshot.rankedCandidates),
  ]) {
    const key = candidate.candidateKey || candidate.suggestedCardId || candidate.title
    if (!key || rankedByKey.has(key)) continue
    rankedByKey.set(key, candidate)
  }
  return Array.from(rankedByKey.values())
    .sort((left, right) => number(left.rank, 9999) - number(right.rank, 9999))
}

function mapDirectorLaneToPortfolioLane(candidate = {}) {
  const topLane = list(candidate.missionScore?.laneScores)
    .filter(lane => number(lane.score) > 0)
    .sort((left, right) => number(right.score) - number(left.score))[0]?.id
  const laneMap = {
    foundation_shared_truth: 'source-registry',
    god_mode_extractor: 'god-mode-extractor',
    reliable_agents_execution: 'agent-runtime',
    context_continuity: 'agent-runtime',
    agent_realtor_coaching: 'general-aios',
    governed_promotion: 'director-system',
  }
  return laneMap[topLane] || getBuildPortfolioLane(candidate)
}

function sourceLineageFromDirectorCandidate(candidate = {}) {
  return [...new Set([
    candidate.sourceReportArtifactId,
    candidate.sourceVideoId ? `youtube:${candidate.sourceVideoId}` : '',
    candidate.sourceAtomId,
    ...(list(candidate.evidenceRefs)),
    ...(list(candidate.evidenceTimestamps).map(item => `timestamp:${item}`)),
  ].filter(Boolean))]
}

export function buildPortfolioCandidatesFromDirectorSnapshot(snapshot = {}, {
  candidateLimit = 20,
} = {}) {
  return getDirectorRankedCandidates(snapshot)
    .slice(0, candidateLimit)
    .map(candidate => {
      const missionScore = number(candidate.missionScore?.total)
      const readinessLabel = candidate.scopeReadiness?.label || candidate.buildReadiness || 'Needs Scoper'
      return {
        id: candidate.suggestedCardId || candidate.candidateKey || `DIRECTOR-RANK-${candidate.rank || 'X'}`,
        inputStage: BUILD_PORTFOLIO_DIRECTOR_HANDOFF_STAGE,
        title: candidate.title,
        summary: candidate.why || candidate.summary || candidate.recommendedNextStep,
        recommendedNextStep: candidate.recommendedNextStep,
        lane: mapDirectorLaneToPortfolioLane(candidate),
        status: BUILD_PORTFOLIO_DIRECTOR_HANDOFF_STAGE,
        statusNote: `Raw Director recommendation only: ${readinessLabel}. Scoper must add build plan, definition of done, risks, and tests before portfolio review can promote it.`,
        scope: {
          why: candidate.why || '',
          details: candidate.recommendedNextStep || '',
          definitionOfDone: [],
          tests: [],
        },
        sourceRefs: sourceLineageFromDirectorCandidate(candidate),
        sourceIds: list(snapshot.sourceIds),
        director: {
          rank: candidate.rank,
          missionScore,
          buildReadiness: candidate.buildReadiness || candidate.scopeReadiness?.status || '',
          sourceTrustLabel: candidate.sourceTrustLabel || '',
          sourceReportArtifactId: candidate.sourceReportArtifactId || '',
          sourceVideoId: candidate.sourceVideoId || '',
        },
        tags: ['director-recommendation', 'needs-scoper'],
      }
    })
}

export function buildPortfolioReviewFromDirectorSnapshot(snapshot = {}, options = {}) {
  const candidates = buildPortfolioCandidatesFromDirectorSnapshot(snapshot, options)
  return {
    ...buildPortfolioReview({
      candidates,
      existingCards: options.existingCards || [],
    }),
    inputStage: BUILD_PORTFOLIO_DIRECTOR_HANDOFF_STAGE,
    scoperRequired: true,
  }
}

function findExistingBacklogMatch(candidate, existingCards = []) {
  if (candidate.existingCardId && existingCards.some(card => card.id === candidate.existingCardId)) {
    const card = existingCards.find(item => item.id === candidate.existingCardId)
    return {
      cardId: card.id,
      title: card.title,
      score: 1,
    }
  }

  let best = null
  for (const card of existingCards) {
    const cardText = [
      card.id,
      card.title,
      card.summary,
      card.whyItMatters,
      card.nextAction,
      ...(card.tags || []),
    ].filter(Boolean).join('\n')
    const cardTokens = tokenizeBuildPortfolioText(cardText)
    const score = jaccardScore(candidate.tokens, cardTokens)
    if (score >= 0.28 && (!best || score > best.score)) {
      best = {
        cardId: card.id,
        title: card.title,
        score: Number(score.toFixed(3)),
      }
    }
  }
  return best
}

function shouldClusterTogether(left, right) {
  if (left.lane !== right.lane) return false
  if (left.portfolioGroupKey && left.portfolioGroupKey === right.portfolioGroupKey) return true
  const overlap = jaccardScore(left.tokens, right.tokens)
  return overlap >= 0.18
}

function createGroup(groupCandidates = [], decision, extra = {}) {
  const sourceLineage = [...new Set(groupCandidates.flatMap(candidate => candidate.sourceLineage || []))]
  const primary = groupCandidates[0] || {}
  const title = decision === BUILD_PORTFOLIO_DECISIONS.mergedEnhanced
    ? createMergedTitle(groupCandidates)
    : primary.title
  const score = buildPortfolioGroupScore(groupCandidates, decision)

  return {
    groupId: `portfolio:${primary.lane}:${groupCandidates.map(candidate => candidate.id).join('+')}`,
    decision,
    status: BUILD_PORTFOLIO_STATUS.proposalOnly,
    lane: primary.lane || 'general-aios',
    title,
    ...score,
    candidateIds: groupCandidates.map(candidate => candidate.id),
    sourceLineage,
    reason: buildDecisionReason(groupCandidates, decision, extra),
    ...extra,
  }
}

function createMergedTitle(candidates = []) {
  const lane = candidates[0]?.lane || 'general-aios'
  const titleByLane = {
    'god-mode-extractor': 'Merged God Mode Extractor Upgrade',
    'intelligence-spine': 'Merged Intelligence Spine Upgrade',
    'director-system': 'Merged Director / Sprint Master Upgrade',
    'agent-runtime': 'Merged Agent Runtime Upgrade',
    'source-registry': 'Merged Source Registry Upgrade',
    'ui-workflow': 'Merged Hub Workflow Upgrade',
    'general-aios': 'Merged AIOS Build Opportunity',
  }
  return titleByLane[lane] || titleByLane['general-aios']
}

function buildDecisionReason(candidates = [], decision, extra = {}) {
  if (decision === BUILD_PORTFOLIO_DECISIONS.returnToScoper) {
    return `Needs Scoper repair: missing ${candidates[0]?.completeness?.missing?.join(', ') || 'scope detail'}.`
  }
  if (decision === BUILD_PORTFOLIO_DECISIONS.parkBlocked) {
    return 'Blocked by source/auth/approval prerequisite; do not promote until that boundary is cleared.'
  }
  if (decision === BUILD_PORTFOLIO_DECISIONS.mergeIntoExisting) {
    return `Overlaps existing backlog card ${extra.existingCard?.cardId}; reuse/enhance instead of duplicating.`
  }
  if (decision === BUILD_PORTFOLIO_DECISIONS.mergedEnhanced) {
    return `${candidates.length} scoped candidates overlap in ${candidates[0]?.lane}; merge them into one stronger build concept with shared source lineage.`
  }
  return 'Scoped candidate is complete and distinct enough to keep as its own proposal.'
}

export function buildPortfolioReview({ candidates = [], existingCards = [] } = {}) {
  const normalized = candidates.map(normalizeCandidate)
  const immediateGroups = []
  const mergePool = []

  for (const candidate of normalized) {
    if (candidate.blocked) {
      immediateGroups.push(createGroup([candidate], BUILD_PORTFOLIO_DECISIONS.parkBlocked))
      continue
    }
    if (!candidate.completeness.ok) {
      immediateGroups.push(createGroup([candidate], BUILD_PORTFOLIO_DECISIONS.returnToScoper))
      continue
    }
    const existingCard = findExistingBacklogMatch(candidate, existingCards)
    if (existingCard) {
      immediateGroups.push(createGroup([candidate], BUILD_PORTFOLIO_DECISIONS.mergeIntoExisting, { existingCard }))
      continue
    }
    mergePool.push(candidate)
  }

  const used = new Set()
  const mergedGroups = []
  for (const candidate of mergePool) {
    if (used.has(candidate.id)) continue
    const cluster = [candidate]
    used.add(candidate.id)
    for (const other of mergePool) {
      if (used.has(other.id)) continue
      if (shouldClusterTogether(candidate, other)) {
        cluster.push(other)
        used.add(other.id)
      }
    }
    mergedGroups.push(createGroup(
      cluster,
      cluster.length > 1
        ? BUILD_PORTFOLIO_DECISIONS.mergedEnhanced
        : BUILD_PORTFOLIO_DECISIONS.standaloneCandidate
    ))
  }

  const groups = [...mergedGroups, ...immediateGroups]
    .sort((left, right) =>
      decisionSortBucket(left.decision) - decisionSortBucket(right.decision) ||
      number(right.portfolioScore) - number(left.portfolioScore) ||
      left.title.localeCompare(right.title)
    )
    .map((group, index) => ({
      ...group,
      portfolioRank: index + 1,
    }))
  const counts = groups.reduce((memo, group) => {
    memo.total += 1
    memo.byDecision[group.decision] = (memo.byDecision[group.decision] || 0) + 1
    return memo
  }, { total: 0, byDecision: {} })

  return {
    ok: true,
    groups,
    counts,
    candidateCount: normalized.length,
    promotionPolicy: 'no_auto_promotion_without_steve_after_portfolio_review',
  }
}

export function buildPortfolioDogfoodProof() {
  const candidates = [
    {
      id: 'SCOPED-VIDEO-EYES-001',
      portfolioGroupKey: 'extractor-visual-comments',
      title: 'Add Gemini visual timestamp review to the YouTube extractor',
      director: { missionScore: 87 },
      summary: 'Use Gemini video/audio/visual review to capture what a creator is showing, not just transcript text.',
      scope: {
        what: 'Add timestamped visual observation packets to approved public video extraction so transcript, audio, screen state, and visual demo evidence land together.',
        why: 'Visual evidence helps AIOS learn UI patterns and workflows that transcripts miss.',
        details: 'Start with approved YouTube source packages only. Persist visual observations with timestamp, source artifact, transcript window, confidence, and reviewer-safe excerpt.',
        acceptanceCriteria: ['approved public videos produce visual observation packets', 'visual packets include transcript window and source artifact id', 'non-approved/private source links remain blocked'],
        definitionOfDone: ['timestamped visual observations are persisted', 'source lineage links back to the video'],
        tests: ['fixture proves visual evidence survives routing'],
        risks: ['visual observations can become noisy without timestamp/provenance rules'],
        notNext: ['do not crawl paid/private videos', 'do not auto-promote extraction findings to backlog'],
        existingWorkToReuse: ['lib/intelligence-spine-god-mode.js', 'lib/dev-team-intelligence-director.js'],
      },
      sourceRefs: ['mark-video:visual-extractor'],
    },
    {
      id: 'SCOPED-VIDEO-COMMENTS-002',
      portfolioGroupKey: 'extractor-visual-comments',
      title: 'Capture YouTube comments and visual demo evidence during extractor runs',
      director: { missionScore: 76 },
      summary: 'The same extractor lane should collect comment signal and visible demo evidence when allowed.',
      scope: {
        what: 'Extend the approved public video source package so comment signal and demo evidence are captured as one extraction packet when source rules allow it.',
        why: 'Comments often validate whether the demonstrated workflow matters to builders.',
        details: 'Keep comments public/no-auth only. Store source URL, comment sample hash, topic tags, visual timestamp references, and approval boundaries.',
        acceptanceCriteria: ['public comments are captured only when the source route allows it', 'comment samples keep source URL/hash metadata', 'comment signal can merge with visual demo evidence'],
        definitionOfDone: ['comments are source-linked', 'visual demo evidence is deduped by timestamp'],
        tests: ['fixture proves comments and visual evidence merge into the same extractor opportunity'],
        risks: ['comment capture can drift into noisy social scraping if source boundaries are not explicit'],
        notNext: ['do not log into Skool or private communities from this card', 'do not treat comments as verified facts without evidence review'],
        existingWorkToReuse: ['docs/source-notes/god-mode-extractor-research-swarm-2026-05-23.md', 'scripts/process-extractor-overnight-run-guard-check.mjs'],
      },
      sourceRefs: ['kia-video:comments', 'mark-video:visual-extractor'],
    },
    {
      id: 'SCOPED-SYNTHESIS-QUALITY-001',
      portfolioGroupKey: 'synthesis-router-quality',
      title: 'Add quality scoring to synthesis router output',
      director: { missionScore: 93 },
      summary: 'Score whether synthesized items are useful, source-backed, deduped, and tied to AIOS mission lanes.',
      scope: {
        what: 'Add a synthesis quality evaluator that grades usefulness, proof, duplication, and mission fit before recommendations reach the Director.',
        why: 'The intelligence spine needs to improve output quality before broad extraction scale.',
        details: 'Compare old and new synthesis outputs against fixtures, source lineage, duplicate clusters, missing proof, and plain-English usefulness.',
        acceptanceCriteria: ['synthesis output receives usefulness/proof/duplicate/mission-fit grades', 'low-proof recommendations are flagged before Director review', 'quality results are visible in proof output'],
        definitionOfDone: ['quality score exists', 'noise is flagged'],
        tests: ['fixture proves duplicate/noisy synthesis is rejected'],
        risks: ['quality scoring can hide useful edge cases if confidence and missing-proof reasons are not shown'],
        notNext: ['do not use this as Steve approval', 'do not mutate backlog from quality scoring'],
        existingWorkToReuse: ['lib/intelligence-spine-god-mode.js', 'lib/intelligence-synthesis.js'],
      },
      sourceRefs: ['director-report:intelligence-spine'],
    },
    {
      id: 'SCOPED-ROUTER-DEDUPE-002',
      portfolioGroupKey: 'synthesis-router-quality',
      title: 'Deduplicate router candidates before they become build recommendations',
      director: { missionScore: 90 },
      summary: 'The router should merge repeated atoms and overlapping evidence before the Director reads them.',
      scope: {
        what: 'Cluster repeated atoms, evidence hits, and candidate reports before Director ranking so recurring signal becomes one stronger recommendation.',
        why: 'Seven matching atoms should become one stronger signal, not seven noisy build cards.',
        details: 'Preserve every source artifact and atom id in the merged record. Keep conflicts visible instead of blending them into false certainty.',
        acceptanceCriteria: ['overlapping atoms and evidence hits cluster before Director ranking', 'merged clusters preserve every source artifact id', 'conflicting source claims remain visible'],
        definitionOfDone: ['overlap is clustered', 'source lineage is preserved'],
        tests: ['fixture proves seven overlapping candidates collapse into one'],
        risks: ['aggressive dedupe can merge different ideas that only share words'],
        notNext: ['do not delete original evidence', 'do not hide conflicts inside a merged score'],
        existingWorkToReuse: ['lib/dev-team-intelligence-director.js', 'lib/intelligence-synthesis.js'],
      },
      sourceRefs: ['meeting-signal:dedupe', 'mark-video:state-registry'],
    },
    {
      id: 'SCOPED-MARKETING-VIDEO-001',
      lane: 'ui-workflow',
      title: 'Create marketing video lab for Steve avatar experiments',
      director: { missionScore: 55 },
      summary: 'Test avatar video ideas from the public video intel lane without mixing them into core Dev runtime.',
      scope: {
        what: 'Create a separate marketing video lab concept for avatar experiments so marketing output can be tested without changing the intelligence spine.',
        why: 'This may help marketing, but it is a separate lane from the intelligence spine.',
        details: 'Keep it out of core extractor/router work. Require source clip approval, asset boundaries, and a small test surface before production use.',
        acceptanceCriteria: ['marketing video lab stays in a marketing lane', 'source clip approval is explicit', 'avatar experiments do not change the intelligence spine'],
        definitionOfDone: ['video lab card exists', 'marketing lane boundary is explicit'],
        tests: ['fixture proves marketing video card does not merge into router work'],
        risks: ['marketing experiments could distract from Dev intelligence spine work'],
        notNext: ['do not build production avatar workflows from this portfolio pass', 'do not mix marketing content output into core Dev runtime'],
        existingWorkToReuse: ['docs/source-notes/dev-team-intelligence-director-2026-05-24.md'],
      },
      sourceRefs: ['marketing-video:xUdKBqP81k8'],
    },
    {
      id: 'SCOPED-THIN-001',
      title: 'Make agents better',
      summary: 'Improve agents.',
      scope: {
        why: '',
        definitionOfDone: [],
        tests: [],
      },
      sourceRefs: [],
    },
    {
      id: 'SCOPED-SKOOL-001',
      title: 'Crawl paid Skool courses',
      summary: 'Read paid Skool course lessons and community discussions.',
      status: 'blocked by paid source packet and login approval required',
      scope: {
        why: 'Paid course intel is valuable but needs source/auth boundaries first.',
        definitionOfDone: ['source packet approved'],
        tests: ['auth boundary test passes'],
      },
      sourceRefs: ['skool:mark-paid'],
    },
    {
      id: 'SCOPED-SOURCE-REGISTRY-001',
      lane: 'source-registry',
      existingCardId: 'SOURCE-REGISTRY-DEV-SLICE-001',
      title: 'Show Dev source registry with active and pending source families',
      summary: 'Expose YouTube, Skool, MyICOR, GitHub, communities, email, meetings, and Drive training as Dev source families.',
      scope: {
        what: 'Normalize Dev source families into one source registry slice so the Dev page can show active, pending, blocked, and planned source families.',
        why: 'Steve needs to see which sources feed the Dev slice and which are still pending.',
        details: 'Use Foundation source truth only. Do not make a Dev-owned crawler list or mark pending sources live.',
        acceptanceCriteria: ['Dev source families show active/pending/blocked/planned state', 'pending auth sources are not labeled live', 'source data comes from Foundation truth'],
        definitionOfDone: ['source families render', 'pending auth is visible'],
        tests: ['UI fixture proves pending sources are not labeled live'],
        risks: ['source registry UI can imply crawlers are active before approval'],
        notNext: ['do not create a Dev-owned data silo', 'do not activate paid source crawling'],
        existingWorkToReuse: ['lib/dev-team-hub.js', 'docs/specs/dev-research-targets-page-concept.md'],
      },
      sourceRefs: ['dev-data-pool:source-inputs'],
    },
  ]

  const existingCards = [
    {
      id: 'SOURCE-REGISTRY-DEV-SLICE-001',
      title: 'Normalize Dev source families in the source registry',
      summary: 'Track YouTube, Skool, MyICOR, GitHub/repos, communities, email/comms, meetings, and Drive/training as Dev source families.',
    },
  ]

  const review = buildPortfolioReview({ candidates, existingCards })
  const rawDirectorReview = buildPortfolioReviewFromDirectorSnapshot({
    sourceIds: ['SRC-YOUTUBE-INTEL-001'],
    recommendedBuildNow: [
      {
        rank: 1,
        title: 'Video-to-SOP Agentic Pipeline',
        why: 'Allows users to generate structured system instructions and agent skills simply by recording their screen, capturing tacit knowledge.',
        recommendedNextStep: 'Implement a local CLI tool that accepts screen recordings, calls Gemini video review, and outputs structured markdown SOPs.',
        suggestedCardId: 'BUILD-INTEL-VIDEO-TO-SOP-AGENTIC-PIPELINE-001',
        sourceReportArtifactId: 'batch:mark-kashef-last-50:api-full-watch-small-batch-v1',
        sourceVideoId: 'hTWxGSsGDZU',
        sourceTrustLabel: 'api_full_watch',
        buildReadiness: 'ready_for_scoper',
        scopeReadiness: {
          label: 'Ready for Scoper',
          status: 'ready_for_scoper',
          missing: [],
        },
        missionScore: {
          total: 87,
          laneScores: [{ id: 'god_mode_extractor', score: 16 }],
        },
      },
      {
        rank: 2,
        title: 'Context-Forking Orchestrator Skill',
        why: 'Enables complex multi-step workflows to run in isolated context windows, preventing token pollution and improving accuracy.',
        recommendedNextStep: 'Create a parser for SKILL.md files that supports isolated sub-workflows.',
        suggestedCardId: 'BUILD-INTEL-CONTEXT-FORKING-ORCHESTRATOR-SKILL-001',
        sourceReportArtifactId: 'batch:mark-kashef-last-50:api-full-watch-small-batch-v1',
        sourceVideoId: 'KsYCtXeAGBg',
        sourceTrustLabel: 'api_full_watch',
        buildReadiness: 'ready_for_scoper',
        scopeReadiness: {
          label: 'Ready for Scoper',
          status: 'ready_for_scoper',
          missing: [],
        },
        missionScore: {
          total: 79,
          laneScores: [{ id: 'reliable_agents_execution', score: 20 }],
        },
      },
    ],
    strongNext: [],
    rankedCandidates: [],
  })
  const mergedGroups = review.groups.filter(group => group.decision === BUILD_PORTFOLIO_DECISIONS.mergedEnhanced)
  const decisions = new Map(review.groups.flatMap(group => group.candidateIds.map(id => [id, group.decision])))
  const sourceRegistryGroup = review.groups.find(group => group.candidateIds.includes('SCOPED-SOURCE-REGISTRY-001'))
  const extractorGroup = review.groups.find(group => group.candidateIds.includes('SCOPED-VIDEO-EYES-001'))
  const routerGroup = review.groups.find(group => group.candidateIds.includes('SCOPED-SYNTHESIS-QUALITY-001'))
  const marketingGroup = review.groups.find(group => group.candidateIds.includes('SCOPED-MARKETING-VIDEO-001'))

  const checks = [
    {
      ok: extractorGroup?.decision === BUILD_PORTFOLIO_DECISIONS.mergedEnhanced &&
        extractorGroup.candidateIds.includes('SCOPED-VIDEO-COMMENTS-002'),
      check: 'overlapping extractor candidates merge into one stronger opportunity',
      detail: extractorGroup?.candidateIds?.join(', ') || 'missing',
    },
    {
      ok: routerGroup?.decision === BUILD_PORTFOLIO_DECISIONS.mergedEnhanced &&
        routerGroup.candidateIds.includes('SCOPED-ROUTER-DEDUPE-002'),
      check: 'overlapping synthesis/router candidates merge into one stronger opportunity',
      detail: routerGroup?.candidateIds?.join(', ') || 'missing',
    },
    {
      ok: marketingGroup?.decision === BUILD_PORTFOLIO_DECISIONS.standaloneCandidate,
      check: 'unrelated scoped candidate stays separate',
      detail: marketingGroup?.decision || 'missing',
    },
    {
      ok: decisions.get('SCOPED-THIN-001') === BUILD_PORTFOLIO_DECISIONS.returnToScoper,
      check: 'thin candidate returns to Scoper instead of entering queue',
      detail: decisions.get('SCOPED-THIN-001') || 'missing',
    },
    {
      ok: decisions.get('SCOPED-SKOOL-001') === BUILD_PORTFOLIO_DECISIONS.parkBlocked,
      check: 'source/auth blocked candidate parks instead of entering queue',
      detail: decisions.get('SCOPED-SKOOL-001') || 'missing',
    },
    {
      ok: sourceRegistryGroup?.decision === BUILD_PORTFOLIO_DECISIONS.mergeIntoExisting &&
        sourceRegistryGroup.existingCard?.cardId === 'SOURCE-REGISTRY-DEV-SLICE-001',
      check: 'existing backlog card is reused instead of duplicated',
      detail: sourceRegistryGroup?.existingCard?.cardId || 'missing',
    },
    {
      ok: review.groups.every(group => group.status === BUILD_PORTFOLIO_STATUS.proposalOnly),
      check: 'portfolio output stays proposal-only until Steve approves after review',
      detail: review.groups.map(group => group.status).join(', '),
    },
    {
      ok: mergedGroups.every(group => group.sourceLineage.length >= group.candidateIds.length),
      check: 'merged opportunities preserve source lineage from contributing candidates',
      detail: mergedGroups.map(group => `${group.groupId}:${group.sourceLineage.length}`).join(', '),
    },
    {
      ok: rawDirectorReview.groups.length === 2 &&
        rawDirectorReview.groups.every(group => group.decision === BUILD_PORTFOLIO_DECISIONS.returnToScoper) &&
        rawDirectorReview.groups.every(group => group.sourceLineage.length >= 2),
      check: 'raw Director recommendations cannot skip Scoper before portfolio review',
      detail: rawDirectorReview.groups.map(group => `${group.candidateIds.join('+')}:${group.decision}`).join(', '),
    },
  ]

  return {
    ok: checks.every(check => check.ok),
    checks,
    review,
    rawDirectorReview,
  }
}
