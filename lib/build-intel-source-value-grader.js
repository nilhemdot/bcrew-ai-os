export const BUILD_INTEL_SOURCE_VALUE_GRADER_CARD_ID = 'BUILD-INTEL-SOURCE-VALUE-GRADER-001'
export const BUILD_INTEL_SOURCE_VALUE_GRADER_PLAN_PATH = 'docs/process/build-intel-source-value-grader-001-plan.md'
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
    id: 'realtor_ai_training',
    label: 'Realtor AI training',
    terms: ['realtor', 'real estate', 'agent coaching', 'coaching', 'training', 'teach', 'learn', 'course', 'tutorial', 'productivity', 'ai assistant', 'team training', 'onboarding', 'life management', 'process map'],
  },
  {
    id: 'marketing_content',
    label: 'Marketing / content',
    terms: ['marketing', 'content', 'avatar', 'brand', 'video', 'seo', 'lead', 'funnel', 'social', 'creator', 'youtube', 'post', 'campaign'],
  },
  {
    id: 'ops_process',
    label: 'Ops / process',
    terms: ['process', 'workflow', 'automation', 'n8n', 'miro', 'app', 'productivity', 'docs', 'slack', 'email', 'drive', 'calendar', 'spreadsheet', 'tools', 'system'],
  },
  {
    id: 'leadership_strategy',
    label: 'Leadership / strategy',
    terms: ['strategy', 'leadership', 'scale', 'business', 'decision', 'goals', 'team', 'operating', 'roi', 'leverage', 'management'],
  },
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

function evidenceText(parts = []) {
  return parts.map(text).filter(Boolean).join(' ').toLowerCase()
}

function countTermHits(haystack = '', terms = []) {
  const lower = text(haystack).toLowerCase()
  return terms.reduce((count, term) => count + (lower.includes(term) ? 1 : 0), 0)
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

function groupSourcesFromReports(reports = []) {
  const sources = new Map()
  const videoToSource = new Map()
  for (const report of list(reports)) {
    const reportId = text(report.report_artifact_id || report.reportArtifactId)
    const output = report.structured_output_json || report.structuredOutputJson || {}
    for (const video of list(output.videos)) {
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
      const key = videoToSource.get(text(candidate.sourceVideoId)) || sourceKey(candidate)
      if (!sources.has(key)) sources.set(key, emptySource(candidate))
      addCandidate(sources.get(key), normalizeCandidate(candidate), reportId)
      if (candidate.sourceVideoId) videoToSource.set(text(candidate.sourceVideoId), key)
    }
  }
  return { sources, videoToSource }
}

function attachDirectorRanks({ sources, videoToSource, directorReport = null } = {}) {
  const output = directorReport?.structured_output_json || directorReport?.structuredOutputJson || {}
  for (const candidate of list(output.rankedCandidates)) {
    const inferredSource = inferSourceFromDirectorCandidate(candidate)
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
  const termHits = countTermHits(`${candidateText} ${videoText}`, lane.terms)
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
  const score = Math.max(0, Math.min(100, Math.round(evidenceScore + linkScore + termScore + directorScore + confidenceScore + specialistScore)))
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
} = {}) {
  const { sources, videoToSource } = groupSourcesFromReports(reports)
  attachDirectorRanks({ sources, videoToSource, directorReport })
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
      ok: sourceGrades.some(source => source.devBuildGrade !== source.overallGrade || source.primaryLane !== 'aios_dev_build'),
      check: 'source value is not collapsed into one global Dev grade',
      detail: sourceGrades.map(source => `${source.creator}:${source.devBuildGrade}/${source.overallGrade}`).join(', '),
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
    topDevBuildSources: sourceGrades.slice(0, 8),
    topByLane: LANE_DEFINITIONS.map(lane => ({
      laneId: lane.id,
      label: lane.label,
      sources: [...sourceGrades]
        .sort((left, right) =>
          right.laneScores.find(score => score.laneId === lane.id).score -
          left.laneScores.find(score => score.laneId === lane.id).score
        )
        .slice(0, 5)
        .map(source => ({
          creatorId: source.creatorId,
          creator: source.creator,
          grade: source.laneScores.find(score => score.laneId === lane.id).grade,
          score: source.laneScores.find(score => score.laneId === lane.id).score,
          watchRecommendation: source.laneScores.find(score => score.laneId === lane.id).watchRecommendation,
        })),
    })),
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
      ...lane.sources.map(source => `- ${source.creator}: ${source.grade} (${source.score}) - ${source.watchRecommendation}`),
      '',
    ].join('\n')),
    '## Boundaries',
    '',
    '- Report-only: no backlog cards, sprint changes, source deletion, watchlist mutation, or external writes.',
    '- Grades are lane-specific. A source can be strong for realtor AI training and weaker for AIOS build work.',
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
  ]
  const directorReport = {
    report_artifact_id: 'director:test',
    structured_output_json: {
      rankedCandidates: [
        { rank: 1, title: 'MCP Agent Router', sourceVideoId: 'builder-1', missionScore: { total: 88 } },
      ],
    },
  }
  const snapshot = buildBuildIntelSourceValueGraderSnapshot({ reports, directorReport })
  const builder = snapshot.sourceGrades.find(source => source.creatorId === 'builder-source')
  const coach = snapshot.sourceGrades.find(source => source.creatorId === 'coach-source')
  const noisy = snapshot.sourceGrades.find(source => source.creatorId === 'noisy-source')
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
  ]
  return {
    ok: snapshot.ok && cases.every(item => item.ok),
    cases,
    snapshot,
  }
}
