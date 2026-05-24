import crypto from 'node:crypto'

export const DEV_TEAM_INTELLIGENCE_DIRECTOR_CARD_ID = 'DEV-TEAM-INTELLIGENCE-DIRECTOR-001'
export const DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID = 'director:dev-team-intelligence-director-001:aios-mission-v0'
export const DEV_TEAM_INTELLIGENCE_DIRECTOR_SOURCE_ID = 'SRC-YOUTUBE-INTEL-001'
export const DEV_TEAM_INTELLIGENCE_DIRECTOR_PLAN_PATH = 'docs/process/dev-team-intelligence-director-001-plan.md'
export const DEV_TEAM_INTELLIGENCE_DIRECTOR_APPROVAL_PATH = 'docs/process/approvals/DEV-TEAM-INTELLIGENCE-DIRECTOR-001.json'
export const DEV_TEAM_INTELLIGENCE_DIRECTOR_SCRIPT_PATH = 'scripts/process-dev-team-intelligence-director-check.mjs'
export const DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_PATH = 'docs/source-notes/dev-team-intelligence-director-2026-05-24.md'

export const DEV_TEAM_INTELLIGENCE_DIRECTOR_INPUT_REPORT_IDS = [
  'proof:mark-kashef-last-50-baseline-001:god-mode-end-to-end:5xrjO38WUYY',
  'batch:mark-kashef-last-50:20260523221531',
  'proof:god-mode-extractor-eyes-quality-loop-001',
  'scout:youtube-scout-latest-video-vision-002:mark-kashef-latest-20',
  'research:god-mode-extractor-research-swarm-001',
  'extraction:marketing-ai-avatar:xUdKBqP81k8:gemini-workspace-eyes',
]

export const DEV_TEAM_INTELLIGENCE_DIRECTOR_CHANGED_FILES = [
  'lib/dev-team-intelligence-director.js',
  DEV_TEAM_INTELLIGENCE_DIRECTOR_SCRIPT_PATH,
  DEV_TEAM_INTELLIGENCE_DIRECTOR_PLAN_PATH,
  DEV_TEAM_INTELLIGENCE_DIRECTOR_APPROVAL_PATH,
  DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_PATH,
  'docs/system-strategy.md',
  'docs/rebuild/current-plan.md',
  'package.json',
]

const MISSION_LANES = [
  {
    id: 'foundation_shared_truth',
    label: 'Foundation / shared truth',
    weight: 24,
    terms: ['foundation', 'source', 'truth', 'provenance', 'contract', 'registry', 'source-backed', 'shared truth', 'data pool', 'pond'],
  },
  {
    id: 'god_mode_extractor',
    label: 'God Mode Extractor',
    weight: 22,
    terms: ['extractor', 'eyes', 'hands', 'brain', 'video', 'visual', 'audio', 'screenshot', 'browser', 'workflow', 'screen'],
  },
  {
    id: 'reliable_agents_execution',
    label: 'Reliable agents / execution systems',
    weight: 20,
    terms: ['agent', 'orchestrator', 'runtime', 'scheduler', 'skill', 'cli', 'automation', 'workflow', 'background', 'tool'],
  },
  {
    id: 'context_continuity',
    label: 'Context continuity',
    weight: 14,
    terms: ['context', 'memory', 'handoff', 'state', 'session', 'checkpoint', 'docs', 'knowledge', 'instructions'],
  },
  {
    id: 'agent_realtor_coaching',
    label: 'Agent/realtor coaching leverage',
    weight: 12,
    terms: ['coach', 'coaching', 'mentor', 'mentorship', 'kpi', 'onboarding', 'training', 'skool', 'realtor', 'agent goals', 'agent growth'],
  },
  {
    id: 'governed_promotion',
    label: 'Approval-gated build path',
    weight: 8,
    terms: ['approval', 'guard', 'boundary', 'provenance', 'safe', 'risk', 'no external', 'gate', 'proposal-only'],
  },
]

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value).sort().reduce((acc, key) => {
    if (value[key] !== undefined) acc[key] = stableValue(value[key])
    return acc
  }, {})
}

function stableHash(value = '') {
  return crypto.createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex')
}

function slug(value = '') {
  return text(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'candidate'
}

function candidateText(candidate = {}) {
  return [
    candidate.title,
    candidate.summary,
    candidate.content,
    candidate.why,
    candidate.whyItMatters,
    candidate.recommendedNextStep,
    candidate.recommendation,
    candidate.finding,
    candidate.evidenceExcerpt,
    candidate.visualObservation,
  ].map(text).filter(Boolean).join(' ').toLowerCase()
}

function confidenceValue(value = '') {
  const normalized = text(value).toLowerCase()
  if (normalized === 'high') return 8
  if (normalized === 'medium') return 5
  if (normalized === 'low') return 2
  return 4
}

function normalizeScore(value = 0) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  if (number <= 10) return number * 6
  return Math.min(20, number / 5)
}

function scoreMissionAlignment(candidate = {}) {
  const haystack = candidateText(candidate)
  const laneScores = MISSION_LANES.map(lane => {
    const matches = lane.terms.filter(term => haystack.includes(term))
    const score = matches.length ? Math.min(lane.weight, 6 + matches.length * 5) : 0
    return {
      id: lane.id,
      label: lane.label,
      score,
      maxScore: lane.weight,
      matchedTerms: matches,
    }
  })
  const laneTotal = laneScores.reduce((sum, lane) => sum + lane.score, 0)
  const evidenceScore = Math.min(14,
    list(candidate.evidenceRefs).length * 3 +
    list(candidate.evidenceTimestamps).length * 2 +
    (candidate.sourceReportArtifactId ? 3 : 0) +
    (candidate.sourceVideoId ? 2 : 0),
  )
  const qualityScore = Math.min(14, normalizeScore(candidate.qualityScore || candidate.relevanceScore || 0))
  const confidenceScore = confidenceValue(candidate.confidence)
  const total = Math.min(100, Math.round(laneTotal + evidenceScore + qualityScore + confidenceScore))
  return {
    total,
    laneScores,
    evidenceScore,
    qualityScore,
    confidenceScore,
  }
}

function normalizeCandidate(raw = {}, source = {}) {
  const title = text(raw.title || raw.finding || raw.theme || raw.atomId || raw.atom_id)
  if (!title) return null
  const why = text(raw.whyItMatters || raw.why || raw.content || raw.finding || raw.summary || raw.derivedClaim)
  const recommendedNextStep = text(raw.recommendedNextStep || raw.recommendation || raw.suggestedAction || raw.nextStep || raw.suggested_action)
  return {
    candidateKey: `candidate:${slug(title)}:${stableHash({ title, source }).slice(0, 10)}`,
    title,
    why,
    recommendedNextStep: recommendedNextStep || 'Review and decide whether this should become a scoped backlog card.',
    confidence: text(raw.confidence || raw.extractionConfidence || raw.extraction_confidence || 'medium').toLowerCase(),
    qualityScore: raw.qualityScore || raw.quality_score || raw.relevanceScore || raw.relevance_score || 0,
    evidenceRefs: list(raw.evidenceRefs || raw.evidence || raw.sourceRefs).map(item => typeof item === 'string' ? item : JSON.stringify(item)).slice(0, 8),
    evidenceTimestamps: list(raw.evidenceTimestamps).map(text).filter(Boolean).slice(0, 8),
    sourceVideoId: text(raw.sourceVideoId || raw.videoId || raw.video_id || raw.metadata?.sourceVideoId),
    sourceUrl: text(raw.sourceUrl || raw.source_url || raw.url || raw.metadata?.sourceUrl),
    sourceReportArtifactId: source.reportArtifactId,
    sourceReportTitle: source.reportTitle,
    sourceAtomId: text(raw.atomId || raw.atom_id),
    sourceKind: source.kind,
    raw: {
      type: raw.atomType || raw.atom_type || raw.type || source.kind,
      status: raw.status || null,
      rank: raw.rank || null,
    },
  }
}

function collectStructuredCandidates(structured = {}, source = {}) {
  const buckets = [
    structured.buildCandidates,
    structured.topBuildCandidates,
    structured.opportunities,
    structured.reviewRoutes,
    structured.snapshot?.topBuildCandidates,
    structured.snapshot?.modelComparison?.topBuildCandidates,
    structured.output?.buildCandidates,
    structured.videos?.flatMap?.(video => list(video.buildCandidates).map(candidate => ({ ...candidate, videoId: video.videoId, sourceUrl: video.url }))),
  ]
  return buckets.flatMap(bucket => list(bucket)).map(item => normalizeCandidate(item, source)).filter(Boolean)
}

export function buildDevTeamIntelligenceDirectorSnapshot({
  generatedAt = new Date().toISOString(),
  reportBundles = [],
  currentSprint = null,
  systemStrategyText = '',
  businessStrategyText = '',
  currentPlanText = '',
} = {}) {
  const candidates = []
  const actionRequiredItems = []
  const inputAtomIds = []
  const inputArtifactIds = []
  const sourceCoverage = []

  for (const bundle of reportBundles) {
    const report = bundle.report || {}
    const reportArtifactId = report.reportArtifactId || report.report_artifact_id
    if (!reportArtifactId) continue
    inputArtifactIds.push(reportArtifactId)
    const source = {
      kind: 'report',
      reportArtifactId,
      reportTitle: report.title || reportArtifactId,
    }
    sourceCoverage.push({
      reportArtifactId,
      title: report.title || reportArtifactId,
      reportType: report.reportType || report.report_type,
      status: report.status,
      atoms: list(bundle.atoms).length,
      hits: list(bundle.hits).length,
      actionRequired: list(report.actionRequiredItems || report.action_required_items).length,
    })
    actionRequiredItems.push(...list(report.actionRequiredItems || report.action_required_items).map(item => ({
      ...item,
      sourceReportArtifactId: reportArtifactId,
    })))
    candidates.push(...list(report.topFindings || report.top_findings).map(item => normalizeCandidate(item, source)).filter(Boolean))
    candidates.push(...collectStructuredCandidates(report.structuredOutputJson || report.structured_output_json || {}, source))
    for (const atom of list(bundle.atoms)) {
      inputAtomIds.push(atom.atomId || atom.atom_id)
      candidates.push(normalizeCandidate(atom, {
        kind: 'atom',
        reportArtifactId,
        reportTitle: report.title || reportArtifactId,
      }))
    }
  }

  const deduped = new Map()
  for (const candidate of candidates.filter(Boolean)) {
    const key = slug(candidate.title)
    const scored = {
      ...candidate,
      missionScore: scoreMissionAlignment(candidate),
    }
    const existing = deduped.get(key)
    if (!existing || scored.missionScore.total > existing.missionScore.total) {
      deduped.set(key, scored)
    }
  }

  const rankedCandidates = Array.from(deduped.values())
    .sort((left, right) => right.missionScore.total - left.missionScore.total || left.title.localeCompare(right.title))
    .map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
      suggestedCardId: `BUILD-INTEL-${slug(candidate.title).toUpperCase().replace(/-/g, '-')}-001`.slice(0, 90),
      directorRecommendation: index < 5 ? 'recommended_build_candidate' : 'watch_or_merge',
      promotionStatus: 'proposal_only_needs_steve_approval',
    }))

  const recommendedBuildNow = rankedCandidates.slice(0, 5)
  const strongNext = rankedCandidates.slice(5, 15)
  const activeCard = currentSprint?.sprint?.activeBlockerCardId || null
  const checks = [
    {
      ok: systemStrategyText.includes('AIOS Mission') && systemStrategyText.includes('agent/realtor'),
      check: 'System Strategy contains AIOS mission and agent/realtor coaching lens',
      detail: 'docs/system-strategy.md',
    },
    {
      ok: currentPlanText.includes('Director scoring must use') && currentPlanText.includes('agent/realtor coaching leverage'),
      check: 'current sprint plan tells Director to use System Strategy as ranking lens',
      detail: 'docs/rebuild/current-plan.md',
    },
    {
      ok: reportBundles.filter(bundle => bundle.report).length >= 3,
      check: 'Director has multiple intelligence reports to synthesize',
      detail: `${reportBundles.filter(bundle => bundle.report).length} reports`,
    },
    {
      ok: rankedCandidates.length >= 5,
      check: 'Director has enough source-backed build candidates',
      detail: `${rankedCandidates.length} candidates`,
    },
    {
      ok: recommendedBuildNow.length >= 3 && recommendedBuildNow.every(candidate => candidate.missionScore.total > 0),
      check: 'Director top candidates are mission-scored',
      detail: recommendedBuildNow.map(candidate => `${candidate.rank}:${candidate.missionScore.total}`).join(', '),
    },
    {
      ok: actionRequiredItems.length >= 1,
      check: 'Director preserves approval-required items',
      detail: `${actionRequiredItems.length} approval items`,
    },
  ]
  const failures = checks.filter(check => !check.ok)

  return {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'ready_for_steve_review',
    generatedAt,
    cardId: DEV_TEAM_INTELLIGENCE_DIRECTOR_CARD_ID,
    reportArtifactId: DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID,
    sourceIds: [DEV_TEAM_INTELLIGENCE_DIRECTOR_SOURCE_ID],
    activeSprintId: currentSprint?.sprint?.sprintId || null,
    activeCard,
    mission: {
      source: 'docs/system-strategy.md#AIOS Mission',
      summary: 'Rank build intelligence by whether it advances source-backed AIOS execution for Steve, leadership, staff, and agent/realtor coaching at scale.',
      lanes: MISSION_LANES.map(lane => ({ id: lane.id, label: lane.label, weight: lane.weight })),
    },
    sourceCoverage,
    inputArtifactIds,
    inputAtomIds: inputAtomIds.filter(Boolean),
    candidateCount: rankedCandidates.length,
    approvalRequiredCount: actionRequiredItems.length,
    recommendedBuildNow,
    strongNext,
    rankedCandidates,
    actionRequiredItems,
    openQuestions: [
      {
        question: 'Which recommended build candidate should become the next scoped implementation card after the active extraction slice?',
        owner: 'Steve',
        requiredBefore: 'automatic backlog promotion',
      },
      {
        question: 'Should the Director remain deterministic scoring first, or add a routed LLM synthesis pass after source-backed candidate scoring?',
        owner: 'Steve / Dev Team',
        requiredBefore: 'Director V1',
      },
    ],
    checks,
    failures,
    noAutoBacklogPromotion: true,
    externalWrites: false,
    strategyDigest: stableHash({
      systemStrategyText: systemStrategyText.slice(0, 8000),
      businessStrategyText: businessStrategyText.slice(0, 6000),
    }),
  }
}

export function buildDevTeamIntelligenceDirectorWriteSet(snapshot = {}) {
  const topCandidates = list(snapshot.recommendedBuildNow)
  const reportArtifact = {
    reportArtifactId: DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID,
    reportType: 'director_brief',
    scopeKey: 'dev-team-intelligence',
    department: 'Dev Team',
    title: 'Dev Team Intelligence Director - AIOS Mission Ranked Build Candidates',
    status: 'generated',
    sourceIds: snapshot.sourceIds || [DEV_TEAM_INTELLIGENCE_DIRECTOR_SOURCE_ID],
    inputArtifactIds: snapshot.inputArtifactIds || [],
    inputAtomIds: [],
    sourceCoverage: snapshot.sourceCoverage || [],
    topFindings: topCandidates.map(candidate => ({
      rank: candidate.rank,
      title: candidate.title,
      missionScore: candidate.missionScore.total,
      why: candidate.why,
      recommendedNextStep: candidate.recommendedNextStep,
      sourceReportArtifactId: candidate.sourceReportArtifactId,
      sourceVideoId: candidate.sourceVideoId,
      promotionStatus: candidate.promotionStatus,
    })),
    actionRequiredItems: snapshot.actionRequiredItems || [],
    openQuestions: snapshot.openQuestions || [],
    outputPath: DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_PATH,
    structuredOutputJson: {
      mission: snapshot.mission,
      recommendedBuildNow: snapshot.recommendedBuildNow,
      strongNext: snapshot.strongNext,
      rankedCandidates: snapshot.rankedCandidates,
      noAutoBacklogPromotion: true,
      externalWrites: false,
    },
    metadata: {
      cardId: DEV_TEAM_INTELLIGENCE_DIRECTOR_CARD_ID,
      activeSprintId: snapshot.activeSprintId,
      activeCard: snapshot.activeCard,
      strategyDigest: snapshot.strategyDigest,
      candidateCount: snapshot.candidateCount,
      approvalRequiredCount: snapshot.approvalRequiredCount,
      inputSourceAtomIds: snapshot.inputAtomIds || [],
    },
  }

  const atomInputs = topCandidates.map(candidate => ({
    atomId: `atom:dev-team-intelligence-director-001:${slug(candidate.title)}:${candidate.rank}`,
    title: candidate.title,
    content: candidate.why || candidate.recommendedNextStep || candidate.title,
    atomType: 'action_candidate',
    sourceId: DEV_TEAM_INTELLIGENCE_DIRECTOR_SOURCE_ID,
    reportArtifactId: DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID,
    modality: 'mixed',
    anchorType: candidate.sourceVideoId ? 'youtube_video_id' : 'report_artifact_id',
    anchorValue: candidate.sourceVideoId || candidate.sourceReportArtifactId,
    evidenceExcerpt: candidate.recommendedNextStep || candidate.why || '',
    derivedClaim: `Mission score ${candidate.missionScore.total}: ${candidate.directorRecommendation}`,
    topicRefs: candidate.missionScore.laneScores.filter(lane => lane.score > 0).map(lane => lane.id),
    department: 'Dev Team',
    pillar: 'Systems',
    valueRoute: 'aios_mission_build_candidate',
    qualityScore: candidate.missionScore.total,
    relevanceScore: candidate.missionScore.total,
    sourceConfidence: 0.82,
    extractionConfidence: 0.78,
    sensitivity: 'neutral',
    minTier: 1,
    freshness: 'trending',
    status: 'detected',
    suggestedOwner: 'Dev Team Intelligence Director',
    suggestedAction: candidate.recommendedNextStep,
    tags: ['dev-team-intelligence-director', 'aios-mission', 'proposal-only'],
    metadata: {
      candidateKey: candidate.candidateKey,
      rank: candidate.rank,
      suggestedCardId: candidate.suggestedCardId,
      sourceReportArtifactId: candidate.sourceReportArtifactId,
      sourceAtomId: candidate.sourceAtomId,
      sourceVideoId: candidate.sourceVideoId,
      promotionStatus: candidate.promotionStatus,
      noAutoBacklogPromotion: true,
    },
  }))

  const hitInputs = atomInputs.map((atom, index) => {
    const candidate = topCandidates[index] || {}
    return {
      hitId: `hit:dev-team-intelligence-director-001:${slug(candidate.title)}:${candidate.rank}`,
      atomId: atom.atomId,
      sourceId: atom.sourceId,
      reportArtifactId: DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID,
      hitType: 'supporting_evidence',
      evidenceExcerpt: candidate.why || candidate.recommendedNextStep || candidate.title,
      anchorType: atom.anchorType,
      anchorValue: atom.anchorValue,
      confidence: 0.82,
      metadata: {
        sourceReportArtifactId: candidate.sourceReportArtifactId,
        sourceVideoId: candidate.sourceVideoId,
        missionScore: candidate.missionScore?.total,
      },
    }
  })

  return { reportArtifact, atomInputs, hitInputs }
}

export function renderDevTeamIntelligenceDirectorReport(snapshot = {}) {
  const lines = []
  lines.push('# Dev Team Intelligence Director - AIOS Mission V0')
  lines.push('')
  lines.push(`Generated: ${snapshot.generatedAt || ''}`)
  lines.push(`Report artifact: \`${snapshot.reportArtifactId || DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID}\``)
  lines.push(`Status: \`${snapshot.status || 'unknown'}\``)
  lines.push('')
  lines.push('## Mission Lens')
  lines.push('')
  lines.push(snapshot.mission?.summary || 'Rank build intelligence against the AIOS mission.')
  lines.push('')
  lines.push('## Recommended Build Now')
  lines.push('')
  for (const candidate of list(snapshot.recommendedBuildNow)) {
    lines.push(`### ${candidate.rank}. ${candidate.title}`)
    lines.push('')
    lines.push(`- Mission score: ${candidate.missionScore?.total ?? 0}`)
    lines.push(`- Source report: \`${candidate.sourceReportArtifactId || 'unknown'}\``)
    if (candidate.sourceVideoId) lines.push(`- Source video: \`${candidate.sourceVideoId}\``)
    lines.push(`- Why: ${candidate.why || 'No why captured.'}`)
    lines.push(`- Next step: ${candidate.recommendedNextStep || 'Review for scoped card.'}`)
    lines.push(`- Promotion: ${candidate.promotionStatus || 'proposal_only_needs_steve_approval'}`)
    const lanes = list(candidate.missionScore?.laneScores).filter(lane => lane.score > 0)
    if (lanes.length) lines.push(`- Mission lanes: ${lanes.map(lane => `${lane.label} ${lane.score}/${lane.maxScore}`).join('; ')}`)
    lines.push('')
  }
  lines.push('## Strong Next / Merge Candidates')
  lines.push('')
  for (const candidate of list(snapshot.strongNext).slice(0, 10)) {
    lines.push(`- ${candidate.rank}. ${candidate.title} - score ${candidate.missionScore?.total ?? 0} (${candidate.sourceReportArtifactId || 'unknown'})`)
  }
  lines.push('')
  lines.push('## Source Coverage')
  lines.push('')
  for (const source of list(snapshot.sourceCoverage)) {
    lines.push(`- \`${source.reportArtifactId}\` - ${source.title}; atoms ${source.atoms}; hits ${source.hits}; approvals ${source.actionRequired}`)
  }
  lines.push('')
  lines.push('## Approval Boundary')
  lines.push('')
  lines.push('- No backlog cards were created automatically.')
  lines.push('- No external writes were performed.')
  lines.push('- Approval-required links remain queued for Steve review.')
  lines.push('')
  lines.push('## Checks')
  lines.push('')
  for (const check of list(snapshot.checks)) {
    lines.push(`- ${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` - ${check.detail}` : ''}`)
  }
  lines.push('')
  return `${lines.join('\n')}\n`
}
