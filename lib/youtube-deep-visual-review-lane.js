import crypto from 'node:crypto'

import {
  YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID,
  YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
} from './youtube-creator-daily-watch.js'
import {
  YOUTUBE_LATEST_20_FULL_WATCH_MODEL,
} from './youtube-latest-20-full-watch-runner.js'

export const YOUTUBE_DEEP_VISUAL_REVIEW_LANE_CARD_ID = 'YOUTUBE-DEEP-VISUAL-REVIEW-LANE-001'
export const YOUTUBE_DEEP_VISUAL_REVIEW_LANE_PLAN_PATH = 'docs/process/youtube-deep-visual-review-lane-001-plan.md'
export const YOUTUBE_DEEP_VISUAL_REVIEW_LANE_APPROVAL_PATH = 'docs/process/approvals/YOUTUBE-DEEP-VISUAL-REVIEW-LANE-001.json'
export const YOUTUBE_DEEP_VISUAL_REVIEW_LANE_SCRIPT_PATH = 'scripts/process-youtube-deep-visual-review-lane-check.mjs'
export const YOUTUBE_DEEP_VISUAL_REVIEW_REPORT_ARTIFACT_ID = 'batch:youtube-deep-visual-review:v1'
export const YOUTUBE_DEEP_VISUAL_REVIEW_REPORT_PREFIX = `${YOUTUBE_DEEP_VISUAL_REVIEW_REPORT_ARTIFACT_ID}:`
export const YOUTUBE_DEEP_VISUAL_REVIEW_MODEL = process.env.YOUTUBE_DEEP_VISUAL_REVIEW_MODEL || YOUTUBE_LATEST_20_FULL_WATCH_MODEL

const SCREEN_DETAIL_PATTERN = /\b(code|terminal|command|cli|bash|shell|npm|pnpm|node|python|script|function|class|const|let|var|import|export|json|yaml|schema|api|endpoint|webhook|database|sql|repo|github|gitlab|pull request|cursor|vscode|vs code|claude code|codex|playwright|stagehand|browser use|firecrawl|mcp|dashboard|kanban|table|board|crm|settings|config|form|workflow|diagram|architecture|copy this|look at|screen|ui|ux|button|sidebar|modal|page|route|component)\b/i

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

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value).sort().reduce((acc, key) => {
    if (value[key] !== undefined) acc[key] = stableValue(value[key])
    return acc
  }, {})
}

function stableHash(value = '') {
  return crypto.createHash('sha256').update(JSON.stringify(stableValue(value)), 'utf8').digest('hex')
}

function slug(value = '') {
  return text(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'item'
}

function timestampSlug(value = '') {
  return text(value).replace(/[^0-9]/g, '').slice(0, 14)
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function reportId(report = {}) {
  return report.reportArtifactId || report.report_artifact_id || ''
}

function reportStructured(report = {}) {
  return report.structuredOutputJson || report.structured_output_json || {}
}

function isFullWatchReport(report = {}) {
  const metadata = report.metadata || {}
  const id = reportId(report)
  return metadata.fullWatchRoute === 'gemini_api_youtube_url_video_understanding' ||
    metadata.proofMode === 'youtube_latest_20_god_mode_api_full_watch' ||
    metadata.proofMode === 'youtube_long_course_god_mode_api_full_watch' ||
    id.startsWith('batch:youtube-latest-20:api-full-watch-v1') ||
    id.startsWith('batch:mark-kashef-last-50:api-full-watch') ||
    id.startsWith('batch:youtube-long-course:api-full-watch-v1') ||
    id.startsWith('proof:mark-kashef-last-50-baseline')
}

function isDeepVisualReviewReport(report = {}) {
  const metadata = report.metadata || {}
  const id = reportId(report)
  return metadata.proofMode === 'youtube_deep_visual_review_v1' ||
    metadata.deepVisualLane === true ||
    id.startsWith(YOUTUBE_DEEP_VISUAL_REVIEW_REPORT_PREFIX)
}

function reportVideoResults(report = {}) {
  const structured = reportStructured(report)
  return [
    ...list(structured.snapshot?.videoResults),
    ...list(structured.videoResults),
    ...list(structured.videos),
  ]
}

function videoFromResult(result = {}) {
  const source = result.video || result
  return {
    videoId: text(source.videoId || result.videoId),
    url: text(source.url || source.sourceUrl || result.url || result.sourceUrl),
    title: text(source.title || source.sourceTitle || result.title || result.sourceTitle),
    creator: text(source.creator || result.creator || source.creatorId || result.creatorId),
    creatorId: text(source.creatorId || result.creatorId || source.creator || result.creator),
    duration: text(source.duration || result.duration || ''),
    rank: asNumber(source.rank || result.rank, 9999),
    publicNoAuth: source.publicNoAuth !== false,
    privateOrPaidAccess: source.privateOrPaidAccess === true,
  }
}

function normalizedEyesOutput(result = {}) {
  return result.eyes?.output || result.output || {}
}

function normalizedResourcePacket(result = {}) {
  return result.resourceLinkSnapshot?.scoperPacket || result.resourceLinkPacket || {}
}

function containsScreenDetail(value = '') {
  return SCREEN_DETAIL_PATTERN.test(text(value))
}

function evidenceText(item = {}) {
  return [
    item.timestamp,
    item.visibleTextOrCode,
    item.toolOrSurface,
    item.workflowObservation,
    item.buildIntelValue,
    item.moment,
    item.transferToAios,
    item.title,
    item.whyItMatters,
    item.recommendedNextStep,
  ].map(text).join(' ')
}

function timestampToSeconds(value = '') {
  const raw = text(value)
  const match = raw.match(/\b(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\b/)
  if (!match) return null
  const hours = match[1] == null ? 0 : Number(match[1])
  const minutes = Number(match[2])
  const seconds = Number(match[3])
  if (![hours, minutes, seconds].every(Number.isFinite)) return null
  return hours * 3600 + minutes * 60 + seconds
}

function segmentLabel(seconds = 0) {
  const s = Math.max(0, Number(seconds) || 0)
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const secs = Math.floor(s % 60)
  return hours
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function uniqueBy(items = [], keyFn = item => item) {
  const seen = new Set()
  const output = []
  for (const item of list(items)) {
    const key = text(keyFn(item))
    if (!key || seen.has(key)) continue
    seen.add(key)
    output.push(item)
  }
  return output
}

function collectTimestampsFromResult(result = {}) {
  const output = normalizedEyesOutput(result)
  return uniqueBy([
    ...list(output.visualEvidence).map(item => item.timestamp),
    ...list(output.workflowMoments).map(item => item.timestamp),
    ...list(output.buildCandidates).flatMap(item => list(item.evidenceTimestamps)),
  ].map(text).filter(Boolean), item => item).slice(0, 8)
}

function directorRankByVideoId(directorReport = null) {
  const structured = reportStructured(directorReport || {})
  const rows = [
    ...list(structured.recommendedBuildNow),
    ...list(structured.strongNext),
    ...list(structured.rankedCandidates),
  ]
  const rankByVideo = new Map()
  for (const [index, row] of rows.entries()) {
    const videoId = text(row.sourceVideoId)
    if (!videoId) continue
    const current = rankByVideo.get(videoId)
    const rank = asNumber(row.rank, index + 1)
    if (!current || rank < current.rank) {
      rankByVideo.set(videoId, {
        rank,
        title: text(row.title),
        missionScore: asNumber(row.missionScore?.total || row.missionScore, 0),
      })
    }
  }
  return rankByVideo
}

function deepReviewedVideoIdsFromReports(reports = []) {
  const ids = new Set()
  for (const report of list(reports).filter(isDeepVisualReviewReport)) {
    for (const result of reportVideoResults(report)) {
      const video = videoFromResult(result)
      if (video.videoId) ids.add(video.videoId)
    }
    for (const id of list(report.metadata?.videoIds)) {
      if (text(id)) ids.add(text(id))
    }
  }
  return ids
}

function candidateFromResult({ report = {}, result = {}, directorRanks = new Map(), deepReviewedVideoIds = new Set() } = {}) {
  const video = videoFromResult(result)
  if (!video.videoId || !video.url) return null
  const output = normalizedEyesOutput(result)
  const visualEvidence = list(output.visualEvidence)
  const workflowMoments = list(output.workflowMoments)
  const buildCandidates = list(output.buildCandidates)
  const missedByTranscriptOnly = list(output.missedByTranscriptOnly)
  const resourcePacket = normalizedResourcePacket(result)
  const resourceRefs = [
    ...list(resourcePacket.resolvedResourceRefs),
    ...list(resourcePacket.blockedResourceRefs),
    ...list(resourcePacket.approvalRequiredResourceLinks),
  ]
  const signalRows = [
    ...visualEvidence,
    ...workflowMoments,
    ...buildCandidates,
    { title: video.title },
  ]
  const screenDetailSignals = signalRows.filter(item => containsScreenDetail(evidenceText(item)))
  const timestamps = collectTimestampsFromResult(result)
  const director = directorRanks.get(video.videoId) || null
  const titleSignal = containsScreenDetail(video.title)
  const score = Math.round(
    Math.min(120, director ? Math.max(0, 75 - director.rank) : 0) +
    Math.min(55, screenDetailSignals.length * 9) +
    Math.min(35, visualEvidence.length * 4) +
    Math.min(30, workflowMoments.length * 5) +
    Math.min(35, buildCandidates.length * 7) +
    Math.min(24, missedByTranscriptOnly.length * 6) +
    Math.min(18, resourceRefs.length * 2) +
    (titleSignal ? 18 : 0)
  )
  const reasons = []
  if (director) reasons.push(`Director rank ${director.rank}`)
  if (screenDetailSignals.length) reasons.push(`${screenDetailSignals.length} screen/code/UI signals`)
  if (visualEvidence.length) reasons.push(`${visualEvidence.length} visual evidence items`)
  if (workflowMoments.length) reasons.push(`${workflowMoments.length} workflow moments`)
  if (buildCandidates.length) reasons.push(`${buildCandidates.length} build candidates`)
  if (missedByTranscriptOnly.length) reasons.push(`${missedByTranscriptOnly.length} missed-by-transcript notes`)
  if (titleSignal) reasons.push('title indicates screen/code/UI detail')
  return {
    ...video,
    score,
    reasons,
    directorRank: director?.rank || null,
    directorTitle: director?.title || '',
    directorMissionScore: director?.missionScore || 0,
    standardReportArtifactId: reportId(report),
    standardReportUpdatedAt: report.updatedAt || report.updated_at || null,
    visualEvidenceCount: visualEvidence.length,
    screenDetailSignalCount: screenDetailSignals.length,
    workflowMomentCount: workflowMoments.length,
    buildCandidateCount: buildCandidates.length,
    missedByTranscriptOnlyCount: missedByTranscriptOnly.length,
    resourceRefCount: resourceRefs.length,
    timestamps,
    alreadyDeepReviewed: deepReviewedVideoIds.has(video.videoId),
  }
}

export function buildDeepVisualSegmentPlan(candidate = {}, {
  clipPaddingBeforeSeconds = 45,
  clipPaddingAfterSeconds = 105,
  maxSegments = 4,
  fps = 1,
} = {}) {
  const seconds = uniqueBy(list(candidate.timestamps)
    .map(timestampToSeconds)
    .filter(value => Number.isFinite(value)), value => String(value))
  if (!seconds.length) {
    return [{
      index: 1,
      label: 'Full-video deep visual review',
      startSeconds: 0,
      endSeconds: 0,
      fps,
      fullVideo: true,
    }]
  }
  const sorted = seconds.sort((a, b) => a - b).slice(0, maxSegments)
  return sorted.map((timestampSeconds, index) => {
    const startSeconds = Math.max(0, timestampSeconds - clipPaddingBeforeSeconds)
    const endSeconds = Math.max(startSeconds + 45, timestampSeconds + clipPaddingAfterSeconds)
    return {
      index: index + 1,
      label: `Deep visual clip ${index + 1} around ${segmentLabel(timestampSeconds)}`,
      startSeconds,
      endSeconds,
      fps,
      focusTimestamp: segmentLabel(timestampSeconds),
      durationSeconds: endSeconds - startSeconds,
    }
  })
}

export function buildYoutubeDeepVisualReviewQueueSnapshot({
  generatedAt = new Date().toISOString(),
  reports = [],
  directorReport = null,
  targetCount = 50,
  includeReviewed = false,
} = {}) {
  const reportRows = list(reports).filter(report => isFullWatchReport(report) && !isDeepVisualReviewReport(report))
  const deepReviewedVideoIds = deepReviewedVideoIdsFromReports(reports)
  const directorRanks = directorRankByVideoId(directorReport)
  const byVideo = new Map()
  for (const report of reportRows) {
    for (const result of reportVideoResults(report)) {
      const candidate = candidateFromResult({ report, result, directorRanks, deepReviewedVideoIds })
      if (!candidate) continue
      const current = byVideo.get(candidate.videoId)
      if (!current || candidate.score > current.score || String(candidate.standardReportUpdatedAt || '') > String(current.standardReportUpdatedAt || '')) {
        byVideo.set(candidate.videoId, candidate)
      }
    }
  }
  const allCandidates = [...byVideo.values()]
    .filter(candidate => includeReviewed || !candidate.alreadyDeepReviewed)
    .sort((a, b) => b.score - a.score || (a.directorRank || 9999) - (b.directorRank || 9999) || a.rank - b.rank)
  const topCandidates = allCandidates.slice(0, Math.max(1, Number(targetCount) || 50)).map((candidate, index) => ({
    ...candidate,
    deepVisualRank: index + 1,
    segmentPlan: buildDeepVisualSegmentPlan(candidate),
  }))
  const checks = []
  addCheck(checks, reportRows.length >= 1, 'full-watch reports are available for deep visual review selection', `${reportRows.length}`)
  addCheck(checks, byVideo.size >= 1, 'watched videos can be scored for screen/code/UI risk', `${byVideo.size}`)
  addCheck(checks, topCandidates.length >= Math.min(10, Math.max(1, Number(targetCount) || 50)), 'top deep-review queue is populated', `${topCandidates.length}`)
  addCheck(checks, topCandidates.some(candidate => candidate.screenDetailSignalCount > 0 || candidate.directorRank), 'queue prioritizes videos with Director or screen-detail signal', topCandidates.slice(0, 5).map(candidate => `${candidate.videoId}:${candidate.score}`).join(', '))
  const failures = checks.filter(check => !check.ok)
  return {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'ready_for_deep_visual_review',
    generatedAt,
    cardId: YOUTUBE_DEEP_VISUAL_REVIEW_LANE_CARD_ID,
    sourceRoute: 'intelligence_report_artifacts full-watch reports + Dev Director ranks',
    targetCount: Math.max(1, Number(targetCount) || 50),
    summary: {
      scannedReportCount: reportRows.length,
      scoredVideoCount: byVideo.size,
      alreadyDeepReviewedCount: deepReviewedVideoIds.size,
      queuedCount: topCandidates.length,
      top50ReadyCount: Math.min(50, topCandidates.length),
    },
    topCandidates,
    checks,
    failures,
  }
}

export function youtubeDeepVisualReviewReportArtifactId({
  batchRunId = '',
} = {}) {
  const run = timestampSlug(batchRunId)
  return run ? `${YOUTUBE_DEEP_VISUAL_REVIEW_REPORT_PREFIX}${run}` : YOUTUBE_DEEP_VISUAL_REVIEW_REPORT_ARTIFACT_ID
}

export function youtubeDeepVisualReviewReportPath({
  batchRunId = '',
} = {}) {
  const run = timestampSlug(batchRunId)
  return run
    ? `docs/source-notes/youtube-deep-visual-review-${run}.md`
    : 'docs/source-notes/youtube-deep-visual-review.md'
}

function scoreRowsFromResults(videoResults = []) {
  return list(videoResults).map(result => result.eyes?.score || {
    ok: result.eyes?.ok === true,
    visualEvidenceCount: list(result.eyes?.output?.visualEvidence).length,
    timestampedVisualEvidenceCount: list(result.eyes?.output?.visualEvidence).filter(item => /\d{1,2}:\d{2}/.test(item.timestamp || '')).length,
    visibleCodeOrToolingCount: list(result.eyes?.output?.visualEvidence).filter(item => item.visibleTextOrCode || item.toolOrSurface).length,
    workflowMomentCount: list(result.eyes?.output?.workflowMoments).length,
    buildCandidateCount: list(result.eyes?.output?.buildCandidates).length,
    missedByTranscriptOnlyCount: list(result.eyes?.output?.missedByTranscriptOnly).length,
  })
}

export function buildYoutubeDeepVisualReviewSnapshot({
  generatedAt = new Date().toISOString(),
  batchRunId = generatedAt.replace(/[^0-9]/g, '').slice(0, 14),
  reportArtifactId = YOUTUBE_DEEP_VISUAL_REVIEW_REPORT_ARTIFACT_ID,
  reportPath = youtubeDeepVisualReviewReportPath({ batchRunId }),
  candidates = [],
  videoResults = [],
  model = YOUTUBE_DEEP_VISUAL_REVIEW_MODEL,
  liveGeminiApi = false,
  queueSnapshot = null,
} = {}) {
  const candidateByVideoId = new Map(list(candidates).map(candidate => [candidate.videoId, candidate]))
  const mergedResults = list(videoResults).filter(result => candidateByVideoId.has(result.video?.videoId))
  const scoreRows = scoreRowsFromResults(mergedResults)
  const topBuildCandidates = mergedResults.flatMap(result => {
    const candidate = candidateByVideoId.get(result.video?.videoId) || {}
    return list(result.eyes?.output?.buildCandidates).map((build, index) => ({
      ...build,
      rank: index + 1,
      sourceVideoId: result.video.videoId,
      sourceUrl: result.video.url,
      sourceTitle: result.video.title,
      creator: result.video.creator || result.video.creatorId,
      creatorId: result.video.creatorId,
      model: result.eyes?.model || model,
      deepVisualRank: candidate.deepVisualRank || null,
      deepVisualScore: candidate.score || 0,
      evidenceTimestamps: list(build.evidenceTimestamps),
    }))
  })
  const checks = []
  addCheck(checks, mergedResults.length >= 1 && mergedResults.length <= 10, 'deep visual review batch stays bounded at 1-10 videos', `${mergedResults.length}`)
  addCheck(checks, mergedResults.every(result => result.pageEvidence?.responseOk === true), 'public YouTube page evidence captured for every deep-review video', mergedResults.map(result => `${result.video?.videoId}:${result.pageEvidence?.responseOk}`).join(', '))
  addCheck(checks, mergedResults.every(result => result.eyes?.ok === true), 'Gemini deep visual result exists for every selected video', mergedResults.map(result => `${result.video?.videoId}:${result.eyes?.ok === true}`).join(', '))
  addCheck(checks, scoreRows.every(score => asNumber(score.timestampedVisualEvidenceCount) >= 3), 'deep review returns timestamped visual evidence', scoreRows.map(score => `${score.timestampedVisualEvidenceCount || 0}`).join(', '))
  addCheck(checks, scoreRows.every(score => asNumber(score.visibleCodeOrToolingCount) >= 2), 'deep review returns screen/code/tooling detail', scoreRows.map(score => `${score.visibleCodeOrToolingCount || 0}`).join(', '))
  addCheck(checks, topBuildCandidates.length >= mergedResults.length * 2, 'deep review produces proposal-only build candidates', `${topBuildCandidates.length}`)
  const failures = checks.filter(check => !check.ok)
  return {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'ready_for_director_resynthesis',
    generatedAt,
    batchRunId,
    cardId: YOUTUBE_DEEP_VISUAL_REVIEW_LANE_CARD_ID,
    reportArtifactId,
    reportPath,
    sourceIds: [YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID],
    targetKey: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
    model,
    liveGeminiApi,
    lane: 'youtube_deep_visual_review',
    promptProfile: 'deep_visual',
    route: {
      provider: 'gemini',
      model,
      fullVideoWatchRoute: 'gemini_api_youtube_url_video_understanding',
      promptProfile: 'deep_visual',
      mode: 'deep visual re-review of public YouTube screen/code/UI moments',
    },
    summary: {
      videoCount: mergedResults.length,
      totalTimestampedVisualEvidence: scoreRows.reduce((sum, score) => sum + asNumber(score.timestampedVisualEvidenceCount), 0),
      totalVisibleCodeOrTooling: scoreRows.reduce((sum, score) => sum + asNumber(score.visibleCodeOrToolingCount), 0),
      totalWorkflowMoments: scoreRows.reduce((sum, score) => sum + asNumber(score.workflowMomentCount), 0),
      totalBuildCandidates: topBuildCandidates.length,
      totalMissedByStandard: scoreRows.reduce((sum, score) => sum + asNumber(score.missedByTranscriptOnlyCount), 0),
      queueTargetCount: queueSnapshot?.targetCount || 50,
      queueRankedCount: list(queueSnapshot?.topCandidates).length,
    },
    queueSnapshot: queueSnapshot ? {
      status: queueSnapshot.status,
      summary: queueSnapshot.summary,
      targetCount: queueSnapshot.targetCount,
    } : null,
    videoResults: mergedResults.map((result, index) => {
      const candidate = candidateByVideoId.get(result.video?.videoId) || {}
      return {
        video: result.video,
        deepVisualCandidate: {
          rank: candidate.deepVisualRank || null,
          score: candidate.score || 0,
          reasons: list(candidate.reasons),
          standardReportArtifactId: candidate.standardReportArtifactId || '',
          segmentPlan: list(candidate.segmentPlan),
        },
        pageEvidence: {
          responseOk: result.pageEvidence?.responseOk,
          finalUrl: result.pageEvidence?.finalUrl,
          videoTitle: result.pageEvidence?.videoTitle,
          resourceLinkCount: list(result.pageEvidence?.resourceLinks).length,
          screenshotArtifact: result.pageEvidence?.screenshotArtifact,
        },
        resourceLinkSnapshot: {
          status: result.resourceLinkSnapshot?.status,
          counts: result.resourceLinkSnapshot?.counts || {},
          scoperPacket: result.resourceLinkSnapshot?.scoperPacket || {},
        },
        eyes: {
          ok: result.eyes?.ok,
          model: result.eyes?.model || model,
          callId: result.eyes?.callId || null,
          segmentedVideo: result.eyes?.segmentedVideo === true,
          segments: list(result.eyes?.segments),
          score: scoreRows[index],
          output: result.eyes?.output || null,
        },
      }
    }),
    topBuildCandidates,
    actionRequiredItems: [
      {
        type: 'next_director_resynthesis',
        item: 'Rerun Dev Intelligence Director after this deep visual review so exact screen/code/UI findings compete with standard-watch ideas.',
        allowedDecisions: ['rerun_dev_director', 'run_next_deep_visual_batch', 'pause_and_scope_top_candidates'],
        approvedInThisCard: false,
      },
    ],
    checks,
    failures,
    noAutoBacklogPromotion: true,
    externalWrites: false,
  }
}

export function buildYoutubeDeepVisualReviewWriteSet(snapshot = {}) {
  const reportArtifactId = text(snapshot.reportArtifactId) || YOUTUBE_DEEP_VISUAL_REVIEW_REPORT_ARTIFACT_ID
  const candidates = list(snapshot.topBuildCandidates)
  const reportArtifact = {
    reportArtifactId,
    reportType: 'director_brief',
    scopeKey: 'dev-team-build-intel',
    department: 'foundation',
    title: 'YouTube Deep Visual Review Batch',
    status: 'generated',
    sourceIds: [YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID],
    inputArtifactIds: list(snapshot.videoResults).flatMap(result => [
      result.deepVisualCandidate?.standardReportArtifactId,
      `youtube:${result.video?.videoId}`,
    ]).filter(Boolean),
    topFindings: candidates.slice(0, 18).map(candidate => ({
      title: candidate.title,
      whyItMatters: candidate.whyItMatters,
      recommendedNextStep: candidate.recommendedNextStep,
      confidence: candidate.confidence,
      videoId: candidate.sourceVideoId,
      videoTitle: candidate.sourceTitle,
      creator: candidate.creator,
      evidenceTimestamps: candidate.evidenceTimestamps,
    })),
    actionRequiredItems: snapshot.actionRequiredItems || [],
    openQuestions: [
      {
        question: 'Which deep visual findings should Scoper turn into build-ready cards?',
        owner: 'Steve',
        status: 'review_after_director_resynthesis',
      },
    ],
    structuredOutputJson: {
      snapshot,
      buildCandidates: candidates,
      videos: list(snapshot.videoResults).map(result => ({
        videoId: result.video?.videoId,
        url: result.video?.url,
        title: result.video?.title,
        creator: result.video?.creator,
        deepVisualCandidate: result.deepVisualCandidate,
        resourceLinkPacket: result.resourceLinkSnapshot?.scoperPacket || {},
        visualEvidence: list(result.eyes?.output?.visualEvidence),
        workflowMoments: list(result.eyes?.output?.workflowMoments),
        buildCandidates: list(result.eyes?.output?.buildCandidates).map(candidate => ({
          ...candidate,
          videoId: result.video?.videoId,
          sourceVideoId: result.video?.videoId,
          sourceUrl: result.video?.url,
          sourceTitle: result.video?.title,
        })),
      })),
      noAutoBacklogPromotion: true,
      externalWrites: false,
    },
    metadata: {
      cardId: YOUTUBE_DEEP_VISUAL_REVIEW_LANE_CARD_ID,
      batchRunId: snapshot.batchRunId,
      proofMode: 'youtube_deep_visual_review_v1',
      fullWatchRoute: 'gemini_api_youtube_url_video_understanding',
      promptProfile: 'deep_visual',
      deepVisualLane: true,
      model: snapshot.model,
      videoIds: list(snapshot.videoResults).map(result => result.video?.videoId).filter(Boolean),
      createsBacklogCardsAutomatically: false,
      externalWrites: false,
      privateOrPaidAccess: false,
    },
  }
  const atomInputs = candidates.slice(0, 18).map((candidate, index) => {
    const atomId = `atom:${YOUTUBE_DEEP_VISUAL_REVIEW_LANE_CARD_ID.toLowerCase()}:deep-visual:${slug(reportArtifactId)}:${slug(candidate.sourceVideoId)}:${slug(candidate.title)}`
    return {
      atomId,
      title: candidate.title,
      content: candidate.whyItMatters || candidate.recommendedNextStep || candidate.title,
      atomType: 'action_candidate',
      sourceId: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID,
      reportArtifactId,
      modality: 'video',
      anchorType: 'youtube_video',
      anchorValue: candidate.sourceUrl,
      evidenceExcerpt: list(candidate.evidenceTimestamps).join(', ') || candidate.sourceVideoId,
      visualObservation: candidate.whyItMatters,
      derivedClaim: candidate.recommendedNextStep,
      topicRefs: ['god-mode-extractor', 'youtube-deep-visual-review', 'screen-code-ui-review', 'build-intel'],
      department: 'foundation',
      pillar: 'dev-team',
      valueRoute: 'aios_build_intelligence',
      qualityScore: candidate.confidence === 'high' ? 94 : candidate.confidence === 'medium' ? 82 : 68,
      relevanceScore: 96 - index,
      sourceConfidence: candidate.confidence === 'high' ? 0.94 : candidate.confidence === 'medium' ? 0.82 : 0.68,
      extractionConfidence: candidate.confidence === 'high' ? 0.9 : candidate.confidence === 'medium' ? 0.78 : 0.64,
      sensitivity: 'neutral',
      minTier: 1,
      freshness: 'trending',
      status: 'detected',
      suggestedOwner: 'Dev Team Intelligence Director',
      suggestedAction: candidate.recommendedNextStep,
      tags: ['god-mode-youtube', 'deep-visual-review', 'proposal-only', candidate.creatorId].filter(Boolean),
      metadata: {
        sourceVideoId: candidate.sourceVideoId,
        sourceUrl: candidate.sourceUrl,
        sourceTitle: candidate.sourceTitle,
        creator: candidate.creator,
        creatorId: candidate.creatorId,
        model: candidate.model,
        promptProfile: 'deep_visual',
        proposalOnly: true,
        writesBacklog: false,
      },
      dedupHash: stableHash({
        reportArtifactId,
        sourceVideoId: candidate.sourceVideoId,
        title: candidate.title,
        model: candidate.model,
        promptProfile: 'deep_visual',
      }),
    }
  })
  const hitInputs = atomInputs.map((atom, index) => {
    const candidate = candidates[index] || {}
    return {
      hitId: `hit:${atom.atomId}`,
      atomId: atom.atomId,
      sourceId: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID,
      reportArtifactId,
      hitType: 'supporting_evidence',
      evidenceExcerpt: `${candidate.creator || 'Creator'} ${candidate.sourceVideoId || ''}: ${list(candidate.evidenceTimestamps).join(', ') || 'Gemini deep visual evidence'}`.slice(0, 900),
      anchorType: 'youtube_video',
      anchorValue: candidate.sourceUrl || '',
      confidence: atom.extractionConfidence,
      metadata: {
        cardId: YOUTUBE_DEEP_VISUAL_REVIEW_LANE_CARD_ID,
        model: candidate.model,
        promptProfile: 'deep_visual',
        evidenceTimestamps: candidate.evidenceTimestamps || [],
        sourceVideoId: candidate.sourceVideoId,
        creator: candidate.creator,
        creatorId: candidate.creatorId,
      },
    }
  })
  return { reportArtifact, atomInputs, hitInputs }
}

export function verifyYoutubeDeepVisualReviewPersistedProof({ snapshot = {}, report = null, atoms = [], hits = [] } = {}) {
  const checks = []
  const expectedReportArtifactId = text(snapshot.reportArtifactId) || YOUTUBE_DEEP_VISUAL_REVIEW_REPORT_ARTIFACT_ID
  addCheck(checks, report?.reportArtifactId === expectedReportArtifactId, 'deep visual report artifact reads back', report?.reportArtifactId || 'missing')
  addCheck(checks, report?.metadata?.proofMode === 'youtube_deep_visual_review_v1', 'report records deep visual proof mode', report?.metadata?.proofMode || 'missing')
  addCheck(checks, report?.metadata?.promptProfile === 'deep_visual', 'report records deep visual prompt profile', report?.metadata?.promptProfile || 'missing')
  addCheck(checks, list(report?.metadata?.videoIds).length >= 1 && list(report?.metadata?.videoIds).length <= 10, 'report records bounded video count', `${list(report?.metadata?.videoIds).length}`)
  addCheck(checks, report?.structuredOutputJson?.snapshot?.status === snapshot.status, 'persisted snapshot status matches', report?.structuredOutputJson?.snapshot?.status || 'missing')
  addCheck(checks, list(atoms).length >= Math.min(2, list(snapshot.topBuildCandidates).length), 'proposal atoms read back', `${list(atoms).length}`)
  addCheck(checks, list(hits).length >= Math.min(2, list(atoms).length), 'evidence hits read back', `${list(hits).length}/${list(atoms).length}`)
  const failures = checks.filter(check => !check.ok)
  return { ok: failures.length === 0, checks, failures }
}

export function buildYoutubeDeepVisualReviewDogfoodProof() {
  const report = {
    reportArtifactId: 'batch:youtube-latest-20:api-full-watch-v1:dogfood',
    metadata: { fullWatchRoute: 'gemini_api_youtube_url_video_understanding' },
    structuredOutputJson: {
      snapshot: {
        videoResults: [{
          video: {
            videoId: 'dogfood-deep-1',
            url: 'https://www.youtube.com/watch?v=dogfood-deep-1',
            title: 'Build a dashboard with Claude Code',
            creator: 'Dogfood Creator',
            creatorId: 'dogfood-creator',
          },
          resourceLinkSnapshot: { scoperPacket: { resolvedResourceRefs: ['https://github.com/example/dashboard'] } },
          eyes: {
            output: {
              visualEvidence: [
                { timestamp: '01:00', visibleTextOrCode: 'npm run dev', toolOrSurface: 'terminal', workflowObservation: 'runs proof', buildIntelValue: 'repeatable verifier' },
                { timestamp: '02:10', visibleTextOrCode: 'dashboard table', toolOrSurface: 'browser dashboard', workflowObservation: 'checks UI', buildIntelValue: 'Dev page layout' },
              ],
              workflowMoments: [{ timestamp: '02:10', moment: 'opens dashboard', transferToAios: 'visual verification loop' }],
              buildCandidates: [{ title: 'Dashboard Verification Loop', whyItMatters: 'screen proof catches UI bugs', recommendedNextStep: 'scope deep visual lane', evidenceTimestamps: ['01:00'], confidence: 'high' }],
              missedByTranscriptOnly: ['terminal command on screen'],
            },
          },
        }],
      },
    },
  }
  const directorReport = {
    structuredOutputJson: {
      rankedCandidates: [{ rank: 1, sourceVideoId: 'dogfood-deep-1', title: 'Dashboard Verification Loop', missionScore: 90 }],
    },
  }
  const queue = buildYoutubeDeepVisualReviewQueueSnapshot({ reports: [report], directorReport, targetCount: 1 })
  const segmentPlan = buildDeepVisualSegmentPlan(queue.topCandidates[0] || {})
  const applied = buildYoutubeDeepVisualReviewSnapshot({
    generatedAt: '2026-05-26T22:00:00.000Z',
    candidates: queue.topCandidates,
    queueSnapshot: queue,
    liveGeminiApi: true,
    videoResults: [{
      video: queue.topCandidates[0],
      pageEvidence: { responseOk: true, resourceLinks: [] },
      resourceLinkSnapshot: { ok: true, status: 'ready_for_scoper', counts: { remainingPublic: 0 }, scoperPacket: {} },
      eyes: {
        ok: true,
        model: YOUTUBE_DEEP_VISUAL_REVIEW_MODEL,
        segmentedVideo: true,
        segments: segmentPlan,
        output: {
          visualEvidence: [
            { timestamp: '01:00', visibleTextOrCode: 'npm run dev', toolOrSurface: 'terminal', workflowObservation: 'runs proof', buildIntelValue: 'verifier loop' },
            { timestamp: '02:10', visibleTextOrCode: 'dashboard table', toolOrSurface: 'browser dashboard', workflowObservation: 'checks UI', buildIntelValue: 'dashboard proof' },
            { timestamp: '02:30', visibleTextOrCode: 'route status', toolOrSurface: 'Dev page', workflowObservation: 'reads runtime', buildIntelValue: 'operator visibility' },
          ],
          workflowMoments: [{ timestamp: '02:10', moment: 'opens dashboard', transferToAios: 'visual verification loop' }],
          buildCandidates: [
            { title: 'Dashboard Verification Loop', whyItMatters: 'screen proof catches UI bugs', recommendedNextStep: 'scope deep visual lane', evidenceTimestamps: ['01:00'], confidence: 'high' },
            { title: 'Runtime Screenshot Evidence', whyItMatters: 'captures exact UI state', recommendedNextStep: 'attach screenshots to evidence spine', evidenceTimestamps: ['02:10'], confidence: 'medium' },
          ],
          missedByTranscriptOnly: ['terminal command on screen'],
        },
      },
    }],
  })
  const checks = [
    { ok: queue.ok === true && queue.topCandidates[0]?.videoId === 'dogfood-deep-1', check: 'queue selects high-screen-detail watched video', detail: queue.status },
    { ok: segmentPlan.length >= 1 && segmentPlan[0].startSeconds < segmentPlan[0].endSeconds, check: 'segment plan targets previous visual timestamps', detail: `${segmentPlan[0]?.startSeconds}-${segmentPlan[0]?.endSeconds}` },
    { ok: applied.ok === true && applied.promptProfile === 'deep_visual', check: 'applied snapshot records deep visual prompt profile', detail: applied.status },
    { ok: applied.noAutoBacklogPromotion === true && applied.externalWrites === false, check: 'deep visual lane stays proposal-only and no external writes', detail: `${applied.noAutoBacklogPromotion}/${applied.externalWrites}` },
  ]
  return {
    ok: checks.every(check => check.ok),
    checks,
    queue,
    applied,
  }
}

export function renderYoutubeDeepVisualReviewReport(snapshot = {}) {
  const lines = []
  lines.push('# YouTube Deep Visual Review')
  lines.push('')
  lines.push(`Generated: ${snapshot.generatedAt || 'unknown'}`)
  lines.push(`Report artifact: \`${snapshot.reportArtifactId || YOUTUBE_DEEP_VISUAL_REVIEW_REPORT_ARTIFACT_ID}\``)
  lines.push(`Model: \`${snapshot.model || YOUTUBE_DEEP_VISUAL_REVIEW_MODEL}\``)
  lines.push('')
  lines.push('## Summary')
  lines.push('')
  lines.push(`- Videos reviewed: ${snapshot.summary?.videoCount || 0}`)
  lines.push(`- Timestamped visual evidence: ${snapshot.summary?.totalTimestampedVisualEvidence || 0}`)
  lines.push(`- Screen/code/tooling details: ${snapshot.summary?.totalVisibleCodeOrTooling || 0}`)
  lines.push(`- Build candidates: ${snapshot.summary?.totalBuildCandidates || 0}`)
  lines.push(`- Missed-by-standard notes: ${snapshot.summary?.totalMissedByStandard || 0}`)
  lines.push('')
  lines.push('## Videos')
  lines.push('')
  for (const result of list(snapshot.videoResults)) {
    lines.push(`- ${result.video?.creator || result.video?.creatorId}: ${result.video?.title || result.video?.videoId} (${result.video?.videoId})`)
    lines.push(`  - URL: ${result.video?.url || ''}`)
    lines.push(`  - Deep rank: ${result.deepVisualCandidate?.rank || 'n/a'}; score: ${result.deepVisualCandidate?.score || 0}`)
    lines.push(`  - Reasons: ${list(result.deepVisualCandidate?.reasons).join('; ') || 'n/a'}`)
    lines.push(`  - Visual evidence: ${result.eyes?.score?.timestampedVisualEvidenceCount || 0}; screen/code/tooling: ${result.eyes?.score?.visibleCodeOrToolingCount || 0}`)
  }
  lines.push('')
  lines.push('## Top Build Candidates')
  lines.push('')
  for (const candidate of list(snapshot.topBuildCandidates).slice(0, 18)) {
    lines.push(`- ${candidate.title}`)
    lines.push(`  - Source: ${candidate.creator || ''} - ${candidate.sourceTitle || candidate.sourceVideoId}`)
    lines.push(`  - Why: ${candidate.whyItMatters || ''}`)
    lines.push(`  - Next: ${candidate.recommendedNextStep || ''}`)
    lines.push(`  - Evidence: ${list(candidate.evidenceTimestamps).join(', ') || 'deep visual output'}`)
  }
  lines.push('')
  return `${lines.join('\n')}\n`
}
