export const BUILD_INTEL_SOURCE_VALUE_GRADER_CARD_ID = 'BUILD-INTEL-SOURCE-VALUE-GRADER-001'
export const BUILD_INTEL_SOURCE_VALUE_GRADER_PLAN_PATH = 'docs/process/build-intel-source-value-grader-001-plan.md'
export const BUILD_INTEL_SOURCE_VALUE_GRADER_APPROVAL_PATH = 'docs/process/approvals/BUILD-INTEL-SOURCE-VALUE-GRADER-001.json'
export const BUILD_INTEL_SOURCE_VALUE_GRADER_SCRIPT_PATH = 'scripts/process-build-intel-source-value-grader-check.mjs'
export const BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID = 'grader:build-intel-source-value-grader-001:v1'
export const BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_PATH = 'docs/source-notes/build-intel-source-value-grader-2026-05-25.md'
export const BUILD_INTEL_SOURCE_VALUE_GRADER_SOURCE_ID = 'SRC-YOUTUBE-INTEL-001'

const LANE_DEFINITIONS = [
  {
    id: 'aios_dev_build',
    label: 'AIOS / Dev build',
    terms: ['aios', 'agent', 'agentic', 'claude code', 'codex', 'mcp', 'openclaw', 'browser', 'hook', 'pipeline', 'skill', 'state', 'visual', 'repo', 'api', 'tool', 'orchestrator', 'handoff', 'gemini', 'cursor'],
  },
  {
    id: 'ops_process',
    label: 'Ops / process',
    terms: ['process', 'workflow', 'automation', 'n8n', 'miro', 'app', 'productivity', 'docs', 'slack', 'email', 'drive', 'calendar', 'spreadsheet', 'tools', 'system', 'operations', 'sop', 'handoff'],
  },
  {
    id: 'sales_conversion',
    label: 'Sales / conversion',
    terms: ['sales', 'conversion', 'close', 'closer', 'objection', 'offer', 'appointment', 'booking', 'lead follow up', 'crm', 'pipeline', 'prospect', 'listing appointment', 'buyer consult', 'script', 'negotiation'],
  },
  {
    id: 'marketing_recruiting',
    label: 'Marketing / recruiting',
    terms: ['recruit', 'recruiting', 'agent attraction', 'downline', 'rev share', 'revenue share', 'team growth', 'real broker', 'join', 'hiring', 'career', 'agent onboarding', 'culture', 'community'],
  },
  {
    id: 'marketing_lead_gen',
    label: 'Marketing / lead gen',
    terms: ['lead gen', 'lead generation', 'lead magnet', 'funnel', 'seo', 'google business', 'ads', 'meta ads', 'content', 'landing page', 'campaign', 'social', 'email marketing', 'newsletter', 'nurture', 'retarget'],
  },
  {
    id: 'steve_ai_authority',
    label: 'Steve AI authority',
    terms: ['ai expert', 'authority', 'thought leadership', 'personal brand', 'educate realtors', 'realtor ai', 'ai for real estate', 'ai training', 'presentation', 'webinar', 'workshop', 'keynote', 'content strategy'],
  },
  {
    id: 'realtor_ai_training',
    label: 'Realtor AI training',
    terms: ['realtor', 'real estate', 'agent coaching', 'coaching', 'training', 'teach', 'learn', 'course', 'tutorial', 'productivity', 'ai assistant', 'team training', 'onboarding', 'life management', 'process map'],
  },
  {
    id: 'leadership_strategy',
    label: 'Leadership / strategy',
    terms: ['strategy', 'leadership', 'scale', 'business', 'decision', 'goals', 'team', 'operating', 'roi', 'leverage', 'management'],
  },
  {
    id: 'product_tool_evaluation',
    label: 'Product/tool evaluation',
    terms: ['tool', 'software', 'platform', 'product', 'pricing', 'purchase', 'subscription', 'trial', 'download', 'template', 'resource', 'stack', 'integration', 'browserbase', 'firecrawl', 'stagehand', 'repository'],
  },
]

const AIOS_DEV_FOUNDATION_SPECIFIC_TERMS = [
  'aios',
  'agent',
  'agentic',
  'claude',
  'claude code',
  'codex',
  'mcp',
  'openclaw',
  'browser',
  'computer use',
  'runtime',
  'extractor',
  'foundation',
  'backlog',
  'hook',
  'pipeline',
  'repo',
  'api',
  'orchestrator',
  'source packet',
  'scoper',
  'director',
  'workflow automation',
  'n8n',
  'rag',
  'vector',
  'gemini',
  'cursor',
  'playwright',
  'stagehand',
  'browserbase',
]

const OFF_TOPIC_DEV_EXTRACTION_NOISE_TERMS = [
  'skate',
  'skating',
  'skateboard',
  'skateboarding',
  'bmx',
  'face plant',
  'faceplant',
  'stair set',
  'kickflip',
  'tre out',
  'tyre',
  'action sports',
  'sports',
  'trick classifier',
  'pose estimator',
  'physical fall',
  'impact detector',
  'first person friday',
]

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function asNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function gradeFromScore(score = 0) {
  if (score >= 85) return 'S'
  if (score >= 70) return 'A'
  if (score >= 50) return 'B'
  if (score >= 30) return 'C'
  return 'D'
}

function watchRecommendationForGrade(grade = 'D') {
  if (grade === 'S') return 'watch_heavily'
  if (grade === 'A') return 'watch_heavily'
  if (grade === 'B') return 'watch_selectively'
  if (grade === 'C') return 'sample_only'
  return 'pause_until_new_signal'
}

function sourceKey({ creatorId = '', creator = '' } = {}) {
  const normalizedCreator = text(creator).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return normalizedCreator || text(creatorId) || 'unknown-source'
}

function normalizeCreatorName(value = '') {
  return text(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
}

function evidenceText(parts = []) {
  return parts.map(text).filter(Boolean).join(' ').toLowerCase()
}

function countTermHits(haystack = '', terms = []) {
  const lower = text(haystack).toLowerCase()
  return terms.reduce((count, term) => count + (lower.includes(term) ? 1 : 0), 0)
}

function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function countBoundedTermHits(haystack = '', terms = []) {
  const lower = text(haystack).toLowerCase()
  return terms.reduce((count, term) => {
    const normalized = text(term).toLowerCase()
    if (!normalized) return count
    const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegex(normalized)}([^a-z0-9]|$)`, 'i')
    return count + (pattern.test(lower) ? 1 : 0)
  }, 0)
}

function normalizeActiveVideoIdsByCreator(activeVideoIdsByCreator = null) {
  if (activeVideoIdsByCreator instanceof Map) {
    return new Map([...activeVideoIdsByCreator.entries()].map(([creatorId, videoIds]) => [
      text(creatorId),
      new Set(list(videoIds instanceof Set ? [...videoIds] : videoIds).map(text).filter(Boolean)),
    ]))
  }
  if (activeVideoIdsByCreator && typeof activeVideoIdsByCreator === 'object') {
    return new Map(Object.entries(activeVideoIdsByCreator).map(([creatorId, videoIds]) => [
      text(creatorId),
      new Set(list(videoIds).map(text).filter(Boolean)),
    ]))
  }
  return new Map()
}

function normalizeActiveCreatorIdsByName(activeCreatorIdsByName = null) {
  if (activeCreatorIdsByName instanceof Map) {
    return new Map([...activeCreatorIdsByName.entries()]
      .map(([name, creatorId]) => [normalizeCreatorName(name), text(creatorId)])
      .filter(([name, creatorId]) => name && creatorId))
  }
  if (activeCreatorIdsByName && typeof activeCreatorIdsByName === 'object') {
    return new Map(Object.entries(activeCreatorIdsByName)
      .map(([name, creatorId]) => [normalizeCreatorName(name), text(creatorId)])
      .filter(([name, creatorId]) => name && creatorId))
  }
  return new Map()
}

function resolveActiveCreatorId({ creatorId = '', creator = '' } = {}, activeCreatorIdsByName = new Map()) {
  const normalizedCreatorId = text(creatorId)
  if (normalizedCreatorId) return normalizedCreatorId
  return activeCreatorIdsByName.get(normalizeCreatorName(creator)) || ''
}

function activeVideoAllowed(
  { creatorId = '', creator = '', videoId = '' } = {},
  activeVideoIdsByCreator = new Map(),
  activeCreatorIdsByName = new Map(),
) {
  const explicitCreatorId = text(creatorId)
  const creatorName = text(creator)
  const mappedCreatorId = activeCreatorIdsByName.get(normalizeCreatorName(creatorName)) || ''
  const normalizedCreatorId = resolveActiveCreatorId({ creatorId, creator }, activeCreatorIdsByName)
  const normalizedVideoId = text(videoId)
  if (explicitCreatorId && activeVideoIdsByCreator.size > 0 && !activeVideoIdsByCreator.has(explicitCreatorId)) {
    return false
  }
  if (!explicitCreatorId && creatorName && activeCreatorIdsByName.size > 0 && !mappedCreatorId) {
    return false
  }
  if (!normalizedCreatorId || !normalizedVideoId) return true
  const allowedVideoIds = activeVideoIdsByCreator.get(normalizedCreatorId)
  if (!allowedVideoIds || allowedVideoIds.size === 0) return true
  return allowedVideoIds.has(normalizedVideoId)
}

function directorRankBonus(rank = null) {
  const numeric = asNumber(rank, 9999)
  if (numeric === 1) return 35
  if (numeric === 2) return 32
  if (numeric === 3) return 28
  if (numeric <= 5) return 24
  if (numeric <= 15) return 16
  if (numeric <= 50) return 8
  return 0
}

function emptySource({ creatorId = '', creator = '' } = {}) {
  return {
    creatorId: text(creatorId),
    creator: text(creator) || text(creatorId),
    reportIds: new Set(),
    videos: new Map(),
    candidateKeys: new Set(),
    candidates: [],
    directorRanks: [],
    approvalRequiredLinkCount: 0,
    resolvedPublicResourceLinkCount: 0,
    visualEvidenceCount: 0,
  }
}

function updateSourceIdentity(source, data = {}) {
  if (!source.creatorId && text(data.creatorId)) source.creatorId = text(data.creatorId)
  if ((!source.creator || source.creator === source.creatorId) && text(data.creator)) source.creator = text(data.creator)
}

function addVideo(source, video = {}, reportId = '') {
  updateSourceIdentity(source, video)
  const videoId = text(video.videoId || video.sourceVideoId)
  if (!videoId) return
  if (!source.videos.has(videoId)) {
    source.videos.set(videoId, {
      videoId,
      title: text(video.title || video.sourceTitle),
      url: text(video.url || video.sourceUrl),
    })
  }
  if (reportId) source.reportIds.add(reportId)
  const packet = video.resourceLinkPacket || {}
  source.approvalRequiredLinkCount += list(packet.approvalRequiredResourceLinks).length
  source.resolvedPublicResourceLinkCount += list(packet.resolvedResourceRefs).length
}

function normalizeCandidate(candidate = {}, fallback = {}) {
  return {
    ...candidate,
    title: text(candidate.title),
    whyItMatters: text(candidate.whyItMatters || candidate.why),
    recommendedNextStep: text(candidate.recommendedNextStep || candidate.nextStep),
    confidence: text(candidate.confidence || fallback.confidence),
    sourceVideoId: text(candidate.sourceVideoId || candidate.videoId || fallback.videoId),
    sourceTitle: text(candidate.sourceTitle || fallback.title),
    sourceUrl: text(candidate.sourceUrl || fallback.url),
    creatorId: text(candidate.creatorId || fallback.creatorId),
    creator: text(candidate.creator || fallback.creator),
    evidenceTimestamps: list(candidate.evidenceTimestamps),
    resourceLinkDispositions: list(candidate.resourceLinkDispositions),
  }
}

function addCandidate(source, candidate = {}, reportId = '') {
  updateSourceIdentity(source, candidate)
  if (!candidate.title) return
  const candidateKey = [
    reportId,
    candidate.sourceVideoId,
    candidate.title.toLowerCase(),
  ].map(text).join('::')
  if (source.candidateKeys.has(candidateKey)) return
  source.candidateKeys.add(candidateKey)
  source.candidates.push({ ...candidate, reportId })
  if (reportId) source.reportIds.add(reportId)
  source.visualEvidenceCount += Math.max(1, list(candidate.evidenceTimestamps).length || 0)
}

function groupSourcesFromReports(reports = [], options = {}) {
  const sources = new Map()
  const videoToSource = new Map()
  const activeVideoIdsByCreator = normalizeActiveVideoIdsByCreator(options.activeVideoIdsByCreator)
  const activeCreatorIdsByName = normalizeActiveCreatorIdsByName(options.activeCreatorIdsByName)
  for (const report of list(reports)) {
    const reportId = text(report.report_artifact_id || report.reportArtifactId)
    const output = report.structured_output_json || report.structuredOutputJson || {}
    for (const video of list(output.videos)) {
      if (!activeVideoAllowed({
        creatorId: video.creatorId,
        creator: video.creator,
        videoId: video.videoId || video.sourceVideoId,
      }, activeVideoIdsByCreator, activeCreatorIdsByName)) continue
      const key = sourceKey(video)
      if (!sources.has(key)) sources.set(key, emptySource(video))
      const source = sources.get(key)
      addVideo(source, video, reportId)
      videoToSource.set(text(video.videoId), key)
      for (const candidate of list(video.buildCandidates)) {
        addCandidate(source, normalizeCandidate(candidate, video), reportId)
      }
    }
    for (const candidate of list(output.buildCandidates)) {
      if (!activeVideoAllowed({
        creatorId: candidate.creatorId,
        creator: candidate.creator,
        videoId: candidate.sourceVideoId || candidate.videoId,
      }, activeVideoIdsByCreator, activeCreatorIdsByName)) continue
      const key = videoToSource.get(text(candidate.sourceVideoId)) || sourceKey(candidate)
      if (!sources.has(key)) sources.set(key, emptySource(candidate))
      addCandidate(sources.get(key), normalizeCandidate(candidate), reportId)
      if (candidate.sourceVideoId) videoToSource.set(text(candidate.sourceVideoId), key)
    }
  }
  return { sources, videoToSource }
}

function attachDirectorRanks({
  sources,
  videoToSource,
  directorReport = null,
  activeVideoIdsByCreator = null,
  activeCreatorIdsByName = null,
} = {}) {
  const output = directorReport?.structured_output_json || directorReport?.structuredOutputJson || {}
  const activeVideoIds = normalizeActiveVideoIdsByCreator(activeVideoIdsByCreator)
  const activeCreatorIds = normalizeActiveCreatorIdsByName(activeCreatorIdsByName)
  for (const candidate of list(output.rankedCandidates)) {
    const inferredSource = inferSourceFromDirectorCandidate(candidate)
    if (!activeVideoAllowed({
      creatorId: candidate.creatorId || inferredSource.creatorId,
      creator: candidate.creator || inferredSource.creator,
      videoId: candidate.sourceVideoId || candidate.videoId,
    }, activeVideoIds, activeCreatorIds)) continue
    const key = videoToSource.get(text(candidate.sourceVideoId)) || inferredSource.key
    if (!key) continue
    if (!sources.has(key)) sources.set(key, emptySource(inferredSource))
    const source = sources.get(key)
    if (candidate.sourceVideoId) {
      addVideo(source, {
        videoId: candidate.sourceVideoId,
        title: candidate.sourceReportTitle || candidate.title,
        creatorId: inferredSource.creatorId,
        creator: inferredSource.creator,
      }, text(candidate.sourceReportArtifactId))
    }
    addCandidate(source, normalizeCandidate({
      title: candidate.title,
      whyItMatters: candidate.why,
      recommendedNextStep: candidate.recommendedNextStep,
      confidence: candidate.confidence,
      sourceVideoId: candidate.sourceVideoId,
      sourceTitle: candidate.sourceReportTitle,
      sourceUrl: candidate.sourceUrl,
      creatorId: inferredSource.creatorId,
      creator: inferredSource.creator,
    }), text(candidate.sourceReportArtifactId))
    sources.get(key).directorRanks.push({
      rank: asNumber(candidate.rank, 9999),
      title: text(candidate.title),
      missionScore: asNumber(candidate.missionScore?.total || candidate.missionScore, 0),
      sourceVideoId: text(candidate.sourceVideoId),
    })
  }
}

function inferSourceFromDirectorCandidate(candidate = {}) {
  const reportId = text(candidate.sourceReportArtifactId)
  const reportTitle = text(candidate.sourceReportTitle)
  if (/mark-kashef/i.test(reportId) || /mark kashef/i.test(reportTitle)) {
    return { key: 'mark-kashef', creatorId: 'mark-kashef', creator: 'Mark Kashef' }
  }
  const latest20Match = reportId.match(/batch:youtube-latest-20:api-full-watch-v1:([^:]+):/i)
  if (latest20Match) {
    const creatorId = latest20Match[1]
    const creator = creatorLabelForId(creatorId)
    return { key: sourceKey({ creator }), creatorId, creator }
  }
  return { key: '', creatorId: '', creator: '' }
}

function creatorLabelForId(creatorId = '') {
  const knownLabels = {
    'icor-tom-ai-productivity': 'ICOR with Tom | AI Productivity',
    'nate-herk': 'Nate Herk',
    'austin-marchese': 'Austin Marchese',
    'aaron-bitwise': 'Aaron Bitwise',
    'ambitious-ai': 'Ambitious AI',
    'chase-ai': 'Chase AI',
    'matt-pocock': 'Matt Pocock / Total TypeScript',
    'nick-saraev': 'Nick Saraev',
    'kia-ghasem': 'Kia Ghasem / AI Automations',
    'dream-labs-ai': 'Dream Labs AI',
    'dan-martell': 'Dan Martell',
    'itssssss-jack': 'Jack / Itssssss_Jack',
  }
  if (knownLabels[creatorId]) return knownLabels[creatorId]
  return text(creatorId)
    .split('-')
    .map(part => part ? part[0].toUpperCase() + part.slice(1) : part)
    .join(' ')
}

function scoreLane(source = {}, lane = {}) {
  const videos = Array.from(source.videos.values())
  const candidateText = evidenceText(source.candidates.flatMap(candidate => [
    candidate.title,
    candidate.whyItMatters,
    candidate.recommendedNextStep,
    candidate.sourceTitle,
  ]))
  const videoText = evidenceText(videos.map(video => video.title))
  const combinedText = `${candidateText} ${videoText}`
  const termHits = countTermHits(combinedText, lane.terms)
  const offTopicNoiseHits = countBoundedTermHits(combinedText, OFF_TOPIC_DEV_EXTRACTION_NOISE_TERMS)
  const foundationSpecificHits = countBoundedTermHits(combinedText, AIOS_DEV_FOUNDATION_SPECIFIC_TERMS)
  const evidenceScore = Math.min(28, videos.length * 4 + source.candidates.length * 1.2)
  const linkScore = Math.min(10, source.resolvedPublicResourceLinkCount * 3 + source.approvalRequiredLinkCount * 0.08)
  const termScore = Math.min(30, termHits * 4)
  const specialistScore = lane.id !== 'aios_dev_build' && termHits >= 10 && source.candidates.length >= 5
    ? 25
    : lane.id !== 'aios_dev_build' && termHits >= 7 && source.candidates.length >= 3
      ? 15
      : 0
  const bestDirector = source.directorRanks.length
    ? Math.min(...source.directorRanks.map(item => item.rank))
    : null
  const directorScore = lane.id === 'aios_dev_build'
    ? directorRankBonus(bestDirector)
    : Math.round(directorRankBonus(bestDirector) * 0.35)
  const confidenceScore = Math.min(8, source.candidates.filter(candidate => candidate.confidence === 'high').length)
  const rawScore = Math.max(0, Math.min(100, Math.round(evidenceScore + linkScore + termScore + directorScore + confidenceScore + specialistScore)))
  const offTopicDevCapApplies = lane.id === 'aios_dev_build' && offTopicNoiseHits > 0 && foundationSpecificHits < 3
  const score = offTopicDevCapApplies ? Math.min(rawScore, 24) : rawScore
  return {
    laneId: lane.id,
    label: lane.label,
    score,
    grade: gradeFromScore(score),
    watchRecommendation: watchRecommendationForGrade(gradeFromScore(score)),
    evidence: {
      videos: videos.length,
      buildCandidates: source.candidates.length,
      termHits,
      foundationSpecificHits,
      offTopicNoiseHits,
      offTopicDevCapApplies,
      specialistScore,
      bestDirectorRank: bestDirector,
      resolvedPublicResourceLinks: source.resolvedPublicResourceLinkCount,
      approvalRequiredLinks: source.approvalRequiredLinkCount,
    },
  }
}

function summarizeReason(source = {}, bestLane = {}) {
  const videos = source.videos.size
  const candidates = source.candidates.length
  const bestRank = source.directorRanks.length ? Math.min(...source.directorRanks.map(item => item.rank)) : null
  const rankText = bestRank ? `best Director rank ${bestRank}` : 'no top Director rank yet'
  return `${source.creator} has ${videos} represented video${videos === 1 ? '' : 's'}, ${candidates} build candidate${candidates === 1 ? '' : 's'}, ${rankText}, and strongest value in ${bestLane.label}.`
}

function buildSourceGrade(source = {}) {
  const laneScores = LANE_DEFINITIONS.map(lane => scoreLane(source, lane))
  const devLane = laneScores.find(lane => lane.laneId === 'aios_dev_build')
  const highestLane = [...laneScores].sort((left, right) => right.score - left.score)[0]
  const bestLane = devLane && ['A', 'S'].includes(devLane.grade) && highestLane.score - devLane.score <= 8
    ? devLane
    : highestLane
  const topCandidates = [...source.candidates]
    .slice(0, 5)
    .map(candidate => ({
      title: candidate.title,
      sourceVideoId: candidate.sourceVideoId,
      sourceTitle: candidate.sourceTitle,
      recommendedNextStep: candidate.recommendedNextStep,
    }))
  return {
    creatorId: source.creatorId,
    creator: source.creator,
    reportIds: Array.from(source.reportIds),
    watchedVideos: source.videos.size,
    buildCandidates: source.candidates.length,
    visualEvidenceCount: source.visualEvidenceCount,
    approvalRequiredLinkCount: source.approvalRequiredLinkCount,
    resolvedPublicResourceLinkCount: source.resolvedPublicResourceLinkCount,
    bestDirectorRank: source.directorRanks.length ? Math.min(...source.directorRanks.map(item => item.rank)) : null,
    primaryLane: bestLane.laneId,
    primaryUse: bestLane.label,
    overallGrade: bestLane.grade,
    devBuildGrade: devLane?.grade || 'D',
    watchRecommendation: bestLane.watchRecommendation,
    laneScores,
    topCandidates,
    reason: summarizeReason(source, bestLane),
  }
}

function laneGradeBuckets(sourceGrades = [], laneId = '') {
  return list(sourceGrades).reduce((acc, source) => {
    const lane = list(source.laneScores).find(item => item.laneId === laneId) || {}
    const grade = text(lane.grade || 'ungraded').toUpperCase()
    acc[grade || 'UNGRADED'] = (acc[grade || 'UNGRADED'] || 0) + 1
    return acc
  }, {})
}

function sourceIdentityKey(source = {}) {
  return text(source.creatorId) || sourceKey(source)
}

function mergeSourceRecords(sourceRecords = []) {
  const merged = new Map()
  for (const source of sourceRecords) {
    const key = sourceIdentityKey(source)
    if (!merged.has(key)) merged.set(key, emptySource(source))
    const target = merged.get(key)
    updateSourceIdentity(target, source)
    for (const reportId of source.reportIds || []) target.reportIds.add(reportId)
    for (const [videoId, video] of source.videos || []) target.videos.set(videoId, video)
    for (const candidate of source.candidates || []) addCandidate(target, candidate, candidate.reportId)
    for (const rank of source.directorRanks || []) target.directorRanks.push(rank)
    target.approvalRequiredLinkCount += source.approvalRequiredLinkCount || 0
    target.resolvedPublicResourceLinkCount += source.resolvedPublicResourceLinkCount || 0
    target.visualEvidenceCount += source.visualEvidenceCount || 0
  }
  return Array.from(merged.values())
}

export function buildBuildIntelSourceValueGraderSnapshot({
  generatedAt = new Date().toISOString(),
  reports = [],
  directorReport = null,
  activeVideoIdsByCreator = null,
  activeCreatorIdsByName = null,
} = {}) {
  const activeVideoIds = normalizeActiveVideoIdsByCreator(activeVideoIdsByCreator)
  const activeCreatorIds = normalizeActiveCreatorIdsByName(activeCreatorIdsByName)
  const { sources, videoToSource } = groupSourcesFromReports(reports, {
    activeVideoIdsByCreator: activeVideoIds,
    activeCreatorIdsByName: activeCreatorIds,
  })
  attachDirectorRanks({
    sources,
    videoToSource,
    directorReport,
    activeVideoIdsByCreator: activeVideoIds,
    activeCreatorIdsByName: activeCreatorIds,
  })
  const sourceGrades = mergeSourceRecords(Array.from(sources.values()))
    .map(buildSourceGrade)
    .sort((left, right) =>
      right.laneScores.find(lane => lane.laneId === 'aios_dev_build').score -
      left.laneScores.find(lane => lane.laneId === 'aios_dev_build').score ||
      right.buildCandidates - left.buildCandidates ||
      left.creator.localeCompare(right.creator)
    )
  const checks = [
    {
      ok: list(reports).length >= 3,
      check: 'reads multiple full-watch reports',
      detail: `${list(reports).length}`,
    },
    {
      ok: sourceGrades.length >= 3,
      check: 'grades multiple creator sources',
      detail: `${sourceGrades.length}`,
    },
    {
      ok: sourceGrades.every(source => source.laneScores.length === LANE_DEFINITIONS.length),
      check: 'every source has lane-specific grades',
      detail: `${LANE_DEFINITIONS.length} lanes`,
    },
    {
      ok: sourceGrades.some(source =>
        source.laneScores.some(lane => lane.laneId !== 'aios_dev_build' && lane.score > 0)
      ),
      check: 'non-Dev lane scores are preserved even when Dev is the current primary lane',
      detail: sourceGrades.map(source => {
        const nonDevBest = source.laneScores
          .filter(lane => lane.laneId !== 'aios_dev_build')
          .sort((left, right) => right.score - left.score)[0]
        return `${source.creator}:${nonDevBest?.laneId || 'none'}=${nonDevBest?.score || 0}`
      }).join(', '),
    },
    {
      ok: true,
      check: 'grader does not mutate watchlist, backlog, sprint, or external systems',
      detail: 'report-only',
    },
  ]
  const failures = checks.filter(check => !check.ok)
  return {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'ready_for_source_review',
    generatedAt,
    cardId: BUILD_INTEL_SOURCE_VALUE_GRADER_CARD_ID,
    reportArtifactId: BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID,
    sourceIds: [BUILD_INTEL_SOURCE_VALUE_GRADER_SOURCE_ID],
    inputReports: list(reports).map(report => text(report.report_artifact_id || report.reportArtifactId)).filter(Boolean),
    directorReportArtifactId: text(directorReport?.report_artifact_id || directorReport?.reportArtifactId),
    sourceGrades,
    displayTruth: {
      sourceGradeCount: sourceGrades.length,
      topDevBuildSourcePreviewCount: Math.min(8, sourceGrades.length),
      topDevBuildSourcesArePreview: sourceGrades.length > 8,
      laneCount: LANE_DEFINITIONS.length,
      lanePreviewLimit: 5,
      laneGradesAreIndependent: true,
      activeVideoIdFilterCreatorCount: activeVideoIds.size,
      activeCreatorNameFilterCount: activeCreatorIds.size,
    },
    topDevBuildSources: sourceGrades.slice(0, 8),
    topByLane: LANE_DEFINITIONS.map(lane => {
      const rankedSources = [...sourceGrades]
        .sort((left, right) =>
          right.laneScores.find(score => score.laneId === lane.id).score -
          left.laneScores.find(score => score.laneId === lane.id).score
        )
      const sources = rankedSources
        .slice(0, 5)
        .map(source => ({
          creatorId: source.creatorId,
          creator: source.creator,
          grade: source.laneScores.find(score => score.laneId === lane.id).grade,
          score: source.laneScores.find(score => score.laneId === lane.id).score,
          watchRecommendation: source.laneScores.find(score => score.laneId === lane.id).watchRecommendation,
        }))
      return {
        laneId: lane.id,
        label: lane.label,
        totalSourceCount: rankedSources.length,
        showingCount: sources.length,
        hasMore: rankedSources.length > sources.length,
        gradeBuckets: laneGradeBuckets(sourceGrades, lane.id),
        sources,
      }
    }),
    checks,
    failures,
    noAutoBacklogPromotion: true,
    externalWrites: false,
  }
}

export function buildBuildIntelSourceValueGraderWriteSet(snapshot = {}) {
  return {
    reportArtifact: {
      reportArtifactId: BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID,
      reportType: 'department_brief',
      scopeKey: 'build-intel-source-value',
      department: 'Dev Team',
      title: 'Build Intel Source Value Grader - Creator Grades By Lane',
      status: 'generated',
      sourceIds: snapshot.sourceIds || [BUILD_INTEL_SOURCE_VALUE_GRADER_SOURCE_ID],
      inputArtifactIds: snapshot.inputReports || [],
      sourceCoverage: snapshot.sourceGrades.map(source => ({
        sourceId: source.creatorId,
        label: source.creator,
        grade: source.overallGrade,
        devBuildGrade: source.devBuildGrade,
        watchedVideos: source.watchedVideos,
        buildCandidates: source.buildCandidates,
        watchRecommendation: source.watchRecommendation,
      })),
      topFindings: snapshot.topDevBuildSources.map((source, index) => ({
        rank: index + 1,
        creatorId: source.creatorId,
        creator: source.creator,
        devBuildGrade: source.devBuildGrade,
        overallGrade: source.overallGrade,
        primaryUse: source.primaryUse,
        reason: source.reason,
        watchRecommendation: source.watchRecommendation,
      })),
      outputPath: BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_PATH,
      structuredOutputJson: {
        sourceGrades: snapshot.sourceGrades,
        displayTruth: snapshot.displayTruth,
        topDevBuildSources: snapshot.topDevBuildSources,
        topByLane: snapshot.topByLane,
        noAutoBacklogPromotion: true,
        externalWrites: false,
      },
      metadata: {
        cardId: BUILD_INTEL_SOURCE_VALUE_GRADER_CARD_ID,
        directorReportArtifactId: snapshot.directorReportArtifactId,
        sourceCount: snapshot.sourceGrades.length,
        laneCount: LANE_DEFINITIONS.length,
      },
    },
  }
}

export function renderBuildIntelSourceValueGraderReport(snapshot = {}) {
  const lines = [
    '# Build Intel Source Value Grader',
    '',
    `Generated: ${snapshot.generatedAt}`,
    `Status: ${snapshot.status}`,
    `Sources graded: ${snapshot.sourceGrades.length}`,
    `Top Dev list: ${snapshot.topDevBuildSources.length} preview row${snapshot.topDevBuildSources.length === 1 ? '' : 's'} of ${snapshot.sourceGrades.length} graded source${snapshot.sourceGrades.length === 1 ? '' : 's'}`,
    '',
    '## Top Dev Build Sources',
    '',
    ...snapshot.topDevBuildSources.map((source, index) => [
      `### ${index + 1}. ${source.creator}`,
      '',
      `- Dev build grade: ${source.devBuildGrade}`,
      `- Overall best grade: ${source.overallGrade} (${source.primaryUse})`,
      `- Watch recommendation: ${source.watchRecommendation}`,
      `- Evidence: ${source.watchedVideos} represented video${source.watchedVideos === 1 ? '' : 's'}, ${source.buildCandidates} candidate${source.buildCandidates === 1 ? '' : 's'}, best Director rank ${source.bestDirectorRank || 'none'}`,
      `- Why: ${source.reason}`,
      '',
    ].join('\n')),
    '## Lane Leaders',
    '',
    ...snapshot.topByLane.map(lane => [
      `### ${lane.label}`,
      '',
      `Showing ${lane.showingCount || list(lane.sources).length} of ${lane.totalSourceCount || list(lane.sources).length} source${(lane.totalSourceCount || list(lane.sources).length) === 1 ? '' : 's'}.`,
      '',
      ...lane.sources.map(source => `- ${source.creator}: ${source.grade} (${source.score}) - ${source.watchRecommendation}`),
      '',
    ].join('\n')),
    '## Boundaries',
    '',
    '- Report-only: no backlog cards, sprint changes, source deletion, watchlist mutation, or external writes.',
    '- Grades are lane-specific. A source can be strong for realtor AI training and weaker for AIOS build work.',
    '- Do not globally pause a creator from the Dev build grade alone. Use the lane grade for the lane asking the question: AIOS build, realtor AI teaching, marketing/content, ops/process, or leadership strategy.',
  ]
  return lines.flat().join('\n').trimEnd() + '\n'
}

export function buildBuildIntelSourceValueGraderDogfoodProof() {
  const reports = [
    {
      report_artifact_id: 'report:builder',
      structured_output_json: {
        videos: [{
          videoId: 'builder-1',
          title: 'Claude Code MCP agent workflow',
          creatorId: 'builder-source',
          creator: 'Builder Source',
          buildCandidates: [
            { title: 'MCP Agent Router', whyItMatters: 'AIOS tool registry and agentic workflow', recommendedNextStep: 'Build MCP routing', confidence: 'high', sourceVideoId: 'builder-1' },
            { title: 'Agent State Hooks', whyItMatters: 'Claude Code lifecycle hooks', recommendedNextStep: 'Add hook registry', confidence: 'high', sourceVideoId: 'builder-1' },
          ],
          resourceLinkPacket: { resolvedResourceRefs: ['https://github.com/example/repo'], approvalRequiredResourceLinks: [] },
        }],
      },
    },
    {
      report_artifact_id: 'report:coach',
      structured_output_json: {
        videos: Array.from({ length: 5 }, (_, index) => ({
          videoId: `coach-${index + 1}`,
          title: `Teach realtors AI assistant workflow ${index + 1}`,
          creatorId: 'coach-source',
          creator: 'Coach Source',
          buildCandidates: [
            {
              title: `Realtor AI Training Playbook ${index + 1}`,
              whyItMatters: 'Training and coaching real estate agents on AI assistant workflow, onboarding, productivity, and team process maps.',
              recommendedNextStep: 'Create a realtor coaching lesson from the tutorial.',
              confidence: 'high',
              sourceVideoId: `coach-${index + 1}`,
            },
          ],
          resourceLinkPacket: { resolvedResourceRefs: [], approvalRequiredResourceLinks: [] },
        })),
      },
    },
    {
      report_artifact_id: 'report:noisy',
      structured_output_json: {
        videos: [{
          videoId: 'noise-1',
          title: 'Random app news',
          creatorId: 'noisy-source',
          creator: 'Noisy Source',
          buildCandidates: [],
          resourceLinkPacket: { resolvedResourceRefs: [], approvalRequiredResourceLinks: [] },
        }],
      },
    },
    {
      report_artifact_id: 'report:action-sports-noise',
      structured_output_json: {
        videos: [{
          videoId: 'sports-1',
          title: 'FACE PLANT FRIDAY! Big stair set ledge',
          creatorId: 'action-sports-noise',
          creator: 'Action Sports Noise',
          buildCandidates: [
            {
              title: 'AI Skateboard Trick Analyzer',
              whyItMatters: 'Computer vision can classify skateboard tricks, physical fall events, and action sports moments.',
              recommendedNextStep: 'Prototype a sports clip classifier.',
              confidence: 'high',
              sourceVideoId: 'sports-1',
            },
            {
              title: 'Automated Fall and Impact Detection System',
              whyItMatters: 'Pose estimator output could identify impact detector moments in skating footage.',
              recommendedNextStep: 'Extract keyframes from action video clips.',
              confidence: 'high',
              sourceVideoId: 'sports-1',
            },
          ],
          resourceLinkPacket: { resolvedResourceRefs: [], approvalRequiredResourceLinks: [] },
        }],
      },
    },
  ]
  const directorReport = {
    report_artifact_id: 'director:test',
    structured_output_json: {
      rankedCandidates: [
        { rank: 1, title: 'MCP Agent Router', sourceVideoId: 'builder-1', missionScore: { total: 88 } },
        { rank: 2, title: 'AI Skateboard Trick Analyzer', sourceVideoId: 'sports-1', missionScore: { total: 82 } },
      ],
    },
  }
  const snapshot = buildBuildIntelSourceValueGraderSnapshot({ reports, directorReport })
  const builder = snapshot.sourceGrades.find(source => source.creatorId === 'builder-source')
  const coach = snapshot.sourceGrades.find(source => source.creatorId === 'coach-source')
  const noisy = snapshot.sourceGrades.find(source => source.creatorId === 'noisy-source')
  const actionSportsNoise = snapshot.sourceGrades.find(source => source.creatorId === 'action-sports-noise')
  const cases = [
    {
      name: 'high_ranked_builder_grades_above_noisy_source',
      ok: ['A', 'S'].includes(builder?.devBuildGrade) && ['C', 'D'].includes(noisy?.devBuildGrade),
    },
    {
      name: 'realtor_training_can_outgrade_dev_build_for_same_source',
      ok: ['A', 'S'].includes(coach?.laneScores.find(lane => lane.laneId === 'realtor_ai_training')?.grade) &&
        ['B', 'C', 'D'].includes(coach?.devBuildGrade),
    },
    {
      name: 'early_extraction_volume_alone_does_not_force_s_grade',
      ok: noisy?.overallGrade !== 'S',
    },
    {
      name: 'low_value_sources_are_throttled_not_deleted',
      ok: ['sample_only', 'pause_until_new_signal'].includes(noisy?.watchRecommendation),
    },
    {
      name: 'off_topic_action_sports_ai_artifacts_do_not_inflate_dev_grade',
      ok: actionSportsNoise?.devBuildGrade === 'D' &&
        actionSportsNoise?.laneScores.find(lane => lane.laneId === 'aios_dev_build')?.evidence?.offTopicDevCapApplies === true &&
        actionSportsNoise?.watchRecommendation !== 'watch_heavily',
    },
  ]
  return {
    ok: snapshot.ok && cases.every(item => item.ok),
    cases,
    snapshot,
  }
}
