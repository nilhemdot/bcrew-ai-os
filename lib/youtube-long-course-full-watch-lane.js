import {
  YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID,
  YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
} from './youtube-creator-daily-watch.js'
import {
  buildYoutubeLatest20IntelRunSnapshot,
} from './youtube-latest-20-intel-run.js'
import {
  YOUTUBE_LATEST_20_FULL_WATCH_MODEL,
  buildYoutubeLatest20FullWatchSnapshot,
  buildYoutubeLatest20FullWatchWriteSet,
  verifyYoutubeLatest20FullWatchPersistedProof,
} from './youtube-latest-20-full-watch-runner.js'

export const YOUTUBE_LONG_COURSE_FULL_WATCH_LANE_CARD_ID = 'YOUTUBE-LONG-COURSE-FULL-WATCH-LANE-001'
export const YOUTUBE_LONG_COURSE_FULL_WATCH_LANE_PLAN_PATH = 'docs/process/youtube-long-course-full-watch-lane-001-plan.md'
export const YOUTUBE_LONG_COURSE_FULL_WATCH_LANE_APPROVAL_PATH = 'docs/process/approvals/YOUTUBE-LONG-COURSE-FULL-WATCH-LANE-001.json'
export const YOUTUBE_LONG_COURSE_FULL_WATCH_LANE_SCRIPT_PATH = 'scripts/process-youtube-long-course-full-watch-lane-check.mjs'
export const YOUTUBE_LONG_COURSE_FULL_WATCH_REPORT_ARTIFACT_ID = 'batch:youtube-long-course:api-full-watch-v1'
export const YOUTUBE_LONG_COURSE_FULL_WATCH_REPORT_PREFIX = `${YOUTUBE_LONG_COURSE_FULL_WATCH_REPORT_ARTIFACT_ID}:`
export const YOUTUBE_LONG_COURSE_FULL_WATCH_MODEL = process.env.YOUTUBE_LONG_COURSE_FULL_WATCH_MODEL || YOUTUBE_LATEST_20_FULL_WATCH_MODEL
export const YOUTUBE_LONG_COURSE_SEGMENT_SECONDS = Number(process.env.YOUTUBE_LONG_COURSE_SEGMENT_SECONDS || 1800)
export const YOUTUBE_LONG_COURSE_SEGMENT_FPS = Number(process.env.YOUTUBE_LONG_COURSE_SEGMENT_FPS || 1)

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
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

export function parseYoutubeDurationSeconds(duration = '') {
  const parts = text(duration).split(':').map(part => Number(part))
  if (!parts.length || parts.some(part => !Number.isFinite(part))) return 0
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts.slice(-3)[0] * 3600 + parts.slice(-3)[1] * 60 + parts.slice(-3)[2]
}

export function buildLongCourseSegmentPlan(video = {}, {
  segmentSeconds = YOUTUBE_LONG_COURSE_SEGMENT_SECONDS,
  fps = YOUTUBE_LONG_COURSE_SEGMENT_FPS,
  maxSegments = 16,
} = {}) {
  const durationSeconds = parseYoutubeDurationSeconds(video.duration)
  const boundedSegmentSeconds = Math.max(600, Math.min(3600, Number(segmentSeconds) || 1800))
  const totalSeconds = durationSeconds || boundedSegmentSeconds
  const segments = []
  for (let start = 0; start < totalSeconds && segments.length < maxSegments; start += boundedSegmentSeconds) {
    const end = Math.min(totalSeconds, start + boundedSegmentSeconds)
    if (end <= start) break
    segments.push({
      index: segments.length + 1,
      label: `Segment ${segments.length + 1}`,
      startSeconds: start,
      endSeconds: end,
      fps,
      durationSeconds: end - start,
      sourceVideoDurationSeconds: durationSeconds || null,
    })
  }
  return segments
}

export function youtubeLongCourseFullWatchReportArtifactId({
  batchRunId = '',
  creatorIds = [],
} = {}) {
  const run = timestampSlug(batchRunId)
  if (!run) return YOUTUBE_LONG_COURSE_FULL_WATCH_REPORT_ARTIFACT_ID
  const creatorPart = list(creatorIds).map(slug).filter(Boolean).slice(0, 3).join('-')
  return `${YOUTUBE_LONG_COURSE_FULL_WATCH_REPORT_PREFIX}${creatorPart ? `${creatorPart}:` : ''}${run}`
}

export function youtubeLongCourseFullWatchReportPath({
  batchRunId = '',
  creatorIds = [],
} = {}) {
  const run = timestampSlug(batchRunId)
  if (!run) return 'docs/source-notes/youtube-long-course-full-watch.md'
  const creatorPart = list(creatorIds).map(slug).filter(Boolean).slice(0, 3).join('-') || 'coverage'
  return `docs/source-notes/youtube-long-course-full-watch-${creatorPart}-${run}.md`
}

export function selectYoutubeLongCourseVideos({
  poolRows = [],
  alreadyFullWatchedVideoIds = [],
  creatorIds = [],
  maxVideos = 1,
} = {}) {
  const manifest = buildYoutubeLatest20IntelRunSnapshot({
    poolRows,
    alreadyFullWatchedVideoIds,
    creatorIds,
    maxCreators: list(creatorIds).length || 9,
    maxVideosPerCreator: Math.max(1, Number(maxVideos) || 1),
    maxRunVideos: Math.max(1, Number(maxVideos) || 1),
  })
  const selectedVideos = list(manifest.standardFullWatchRiskRoutedOut)
    .slice(0, Math.max(1, Number(maxVideos) || 1))
  return {
    ok: selectedVideos.length >= 1,
    status: selectedVideos.length ? 'ready_for_deep_course_watch' : 'no_long_courses_ready',
    manifest,
    selectedVideos,
  }
}

export function buildYoutubeLongCourseFullWatchSnapshot({
  generatedAt = new Date().toISOString(),
  batchRunId = generatedAt.replace(/[^0-9]/g, '').slice(0, 14),
  reportArtifactId = YOUTUBE_LONG_COURSE_FULL_WATCH_REPORT_ARTIFACT_ID,
  reportPath = youtubeLongCourseFullWatchReportPath({ batchRunId }),
  videos = [],
  videoResults = [],
  model = YOUTUBE_LONG_COURSE_FULL_WATCH_MODEL,
  liveGeminiApi = false,
  manifest = null,
} = {}) {
  const base = buildYoutubeLatest20FullWatchSnapshot({
    generatedAt,
    batchRunId,
    reportArtifactId,
    reportPath,
    videos,
    videoResults,
    model,
    liveGeminiApi,
    manifest,
  })
  const checks = [...list(base.checks)]
  addCheck(checks, list(videos).length >= 1 && list(videos).length <= 3, 'long-course lane stays bounded at 1-3 videos', `${list(videos).length}`)
  addCheck(checks, list(base.videoResults).every(result => list(result.eyes?.segments).length >= 1), 'each long-course output uses bounded video segments', list(base.videoResults).map(result => `${result.video?.videoId}:${list(result.eyes?.segments).length}`).join(', '))
  addCheck(checks, list(base.videoResults).every(result => list(result.eyes?.output?.courseMap).length >= 3), 'each long-course output includes a course map', list(base.videoResults).map(result => `${result.video?.videoId}:${list(result.eyes?.output?.courseMap).length}`).join(', '))
  addCheck(checks, list(base.videoResults).every(result => list(result.eyes?.output?.implementationPlan).length >= 2), 'each long-course output includes an implementation plan', list(base.videoResults).map(result => `${result.video?.videoId}:${list(result.eyes?.output?.implementationPlan).length}`).join(', '))
  const failures = checks.filter(check => !check.ok)
  return {
    ...base,
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'ready_for_director_resynthesis',
    cardId: YOUTUBE_LONG_COURSE_FULL_WATCH_LANE_CARD_ID,
    manifestCardId: YOUTUBE_LONG_COURSE_FULL_WATCH_LANE_CARD_ID,
    lane: 'youtube_long_course_deep_watch',
    promptProfile: 'long_course',
    sourceIds: [YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID],
    targetKey: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
    route: {
      ...base.route,
      promptProfile: 'long_course',
      mode: 'deep public YouTube course watch plus page/transcript/resource evidence',
    },
    summary: {
      ...base.summary,
      totalCourseMapItems: list(base.videoResults).reduce((sum, result) => sum + list(result.eyes?.output?.courseMap).length, 0),
      totalImplementationSteps: list(base.videoResults).reduce((sum, result) => sum + list(result.eyes?.output?.implementationPlan).length, 0),
      totalResourceNeeds: list(base.videoResults).reduce((sum, result) => sum + list(result.eyes?.output?.resourceNeeds).length, 0),
      totalSegments: list(base.videoResults).reduce((sum, result) => sum + list(result.eyes?.segments).length, 0),
    },
    actionRequiredItems: [
      ...list(base.actionRequiredItems),
      {
        type: 'next_director_resynthesis',
        item: 'Rerun Dev Intelligence Director after this long-course watch so course-level findings compete with short-video findings.',
        allowedDecisions: ['rerun_dev_director', 'run_next_long_course', 'pause_and_scope_top_candidates'],
        approvedInThisCard: false,
      },
    ],
    checks,
    failures,
    noAutoBacklogPromotion: true,
    externalWrites: false,
  }
}

export function buildYoutubeLongCourseFullWatchWriteSet(snapshot = {}) {
  const writeSet = buildYoutubeLatest20FullWatchWriteSet(snapshot)
  writeSet.reportArtifact = {
    ...writeSet.reportArtifact,
    title: 'YouTube Long-Course God Mode API Deep-Watch Batch',
    metadata: {
      ...writeSet.reportArtifact.metadata,
      cardId: YOUTUBE_LONG_COURSE_FULL_WATCH_LANE_CARD_ID,
      manifestCardId: YOUTUBE_LONG_COURSE_FULL_WATCH_LANE_CARD_ID,
      proofMode: 'youtube_long_course_god_mode_api_full_watch',
      promptProfile: 'long_course',
      longCourseLane: true,
    },
    structuredOutputJson: {
      ...writeSet.reportArtifact.structuredOutputJson,
      lane: 'youtube_long_course_deep_watch',
      promptProfile: 'long_course',
      noAutoBacklogPromotion: true,
      externalWrites: false,
    },
  }
  writeSet.atomInputs = writeSet.atomInputs.map(atom => ({
    ...atom,
    topicRefs: [...new Set([...list(atom.topicRefs), 'youtube-long-course'])],
    tags: [...new Set([...list(atom.tags), 'api-full-watch-long-course'])],
    metadata: {
      ...atom.metadata,
      cardId: YOUTUBE_LONG_COURSE_FULL_WATCH_LANE_CARD_ID,
      promptProfile: 'long_course',
      longCourseLane: true,
    },
  }))
  writeSet.hitInputs = writeSet.hitInputs.map(hit => ({
    ...hit,
    metadata: {
      ...hit.metadata,
      cardId: YOUTUBE_LONG_COURSE_FULL_WATCH_LANE_CARD_ID,
      promptProfile: 'long_course',
      longCourseLane: true,
    },
  }))
  return writeSet
}

export function verifyYoutubeLongCourseFullWatchPersistedProof({ snapshot = {}, report = null, atoms = [], hits = [] } = {}) {
  const base = verifyYoutubeLatest20FullWatchPersistedProof({ snapshot, report, atoms, hits })
  const checks = [...list(base.checks)]
  addCheck(checks, report?.metadata?.proofMode === 'youtube_long_course_god_mode_api_full_watch', 'report records long-course proof mode', report?.metadata?.proofMode || 'missing')
  addCheck(checks, report?.metadata?.promptProfile === 'long_course', 'report records long-course prompt profile', report?.metadata?.promptProfile || 'missing')
  const failures = checks.filter(check => !check.ok)
  return { ok: failures.length === 0, checks, failures }
}

export function renderYoutubeLongCourseFullWatchReport(snapshot = {}) {
  const lines = []
  lines.push('# YouTube Long-Course God Mode Full-Watch')
  lines.push('')
  lines.push(`Generated: ${snapshot.generatedAt || 'unknown'}`)
  lines.push(`Report artifact: \`${snapshot.reportArtifactId || YOUTUBE_LONG_COURSE_FULL_WATCH_REPORT_ARTIFACT_ID}\``)
  lines.push(`Model: ${snapshot.model || YOUTUBE_LONG_COURSE_FULL_WATCH_MODEL}`)
  lines.push('')
  lines.push('## Summary')
  lines.push('')
  lines.push(`- Videos watched: ${snapshot.summary?.videoCount || 0}`)
  lines.push(`- Bounded segments watched: ${snapshot.summary?.totalSegments || 0}`)
  lines.push(`- Course map items: ${snapshot.summary?.totalCourseMapItems || 0}`)
  lines.push(`- Build candidates: ${snapshot.summary?.totalBuildCandidates || 0}`)
  lines.push(`- Implementation steps: ${snapshot.summary?.totalImplementationSteps || 0}`)
  lines.push(`- Resource needs: ${snapshot.summary?.totalResourceNeeds || 0}`)
  lines.push(`- Approval-required links: ${snapshot.summary?.approvalRequiredLinkCount || 0}`)
  lines.push('')
  lines.push('## Videos')
  for (const result of list(snapshot.videoResults)) {
    lines.push('')
    lines.push(`### ${result.video?.creator || 'Creator'} - ${result.video?.title || result.video?.videoId}`)
    lines.push('')
    lines.push(`- URL: ${result.video?.url || ''}`)
    lines.push(`- Duration: ${result.video?.duration || 'unknown'}`)
    lines.push(`- Segments: ${list(result.eyes?.segments).length}`)
    lines.push(`- Course map items: ${list(result.eyes?.output?.courseMap).length}`)
    lines.push(`- Visual evidence items: ${list(result.eyes?.output?.visualEvidence).length}`)
    lines.push(`- Build candidates: ${list(result.eyes?.output?.buildCandidates).length}`)
    lines.push(`- Resource needs: ${list(result.eyes?.output?.resourceNeeds).length}`)
  }
  lines.push('')
  lines.push('## Guardrails')
  lines.push('')
  lines.push('- Proposal only. No automatic backlog cards.')
  lines.push('- Public YouTube only. No private, paid, logged-in, community, comment, purchase, or download actions.')
  return `${lines.join('\n')}\n`
}

export function buildYoutubeLongCourseFullWatchDogfoodProof() {
  const video = {
    videoId: 'course-dogfood-1',
    url: 'https://www.youtube.com/watch?v=course-dogfood-1',
    title: 'Build an Agentic OS: Full Course',
    creator: 'Course Creator',
    creatorId: 'course-creator',
  }
  const snapshot = buildYoutubeLongCourseFullWatchSnapshot({
    generatedAt: '2026-05-25T17:30:00.000Z',
    batchRunId: '20260525173000',
    videos: [video],
    liveGeminiApi: true,
    videoResults: [{
      video,
      pageEvidence: { responseOk: true, resourceLinks: [], captionTracks: [], screenshotArtifact: { storageClass: 'local_temp_not_committed' } },
      baseline: { score: 40, transcript: { present: true, artifactId: 'artifact:transcript' }, descriptionLength: 100, resourceLinkCount: 0, hardLimit: 'baseline' },
      resourceLinkSnapshot: { ok: true, status: 'ready_for_scoper', counts: { remainingPublic: 0, resolvedPublic: 0 }, scoperPacket: {} },
      eyes: {
        ok: true,
        model: YOUTUBE_LONG_COURSE_FULL_WATCH_MODEL,
        segmentedVideo: true,
        segments: [
          { index: 1, label: 'Segment 1', startSeconds: 0, endSeconds: 1800, fps: 1 },
        ],
        usageMetadata: { totalTokenCount: 1000 },
        output: {
          courseMap: [
            { module: 'Setup', whatIsTaught: 'Set up tools', implementationValue: 'standard starter' },
            { module: 'Memory', whatIsTaught: 'Create memory layer', implementationValue: 'AIOS memory' },
            { module: 'Runtime', whatIsTaught: 'Run agents', implementationValue: 'agent runtime' },
          ],
          visualEvidence: [
            { timestamp: '00:10', visibleTextOrCode: 'config', toolOrSurface: 'editor', workflowObservation: 'edits config', buildIntelValue: 'config proof' },
            { timestamp: '10:10', visibleTextOrCode: 'memory', toolOrSurface: 'terminal', workflowObservation: 'runs memory', buildIntelValue: 'memory proof' },
            { timestamp: '20:10', visibleTextOrCode: 'runner', toolOrSurface: 'terminal', workflowObservation: 'runs agent', buildIntelValue: 'runtime proof' },
          ],
          workflowMoments: [],
          resourceNeeds: [{ resource: 'public repo', whereSeen: 'description', approvalNeeded: true, whyItMatters: 'source packet' }],
          implementationPlan: [
            { step: 'Create course map', owner: 'Extractor', dependency: 'video watch' },
            { step: 'Scope reusable runtime card', owner: 'Scoper', dependency: 'course map' },
          ],
          buildCandidates: [
            { title: 'Course Map Extractor', whyItMatters: 'Long trainings need module maps.', recommendedNextStep: 'Build course lane.', evidenceTimestamps: ['00:10'], confidence: 'high' },
            { title: 'Runtime Starter Kit', whyItMatters: 'Course shows reusable runtime.', recommendedNextStep: 'Scope starter kit.', evidenceTimestamps: ['20:10'], confidence: 'medium' },
          ],
          missedByTranscriptOnly: ['visible config'],
          riskBoundaries: ['public only'],
          qualityVerdict: 'better_than_baseline',
          confidence: 'high',
        },
      },
    }],
  })
  const writeSet = buildYoutubeLongCourseFullWatchWriteSet(snapshot)
  return {
    ok: snapshot.ok === true &&
      snapshot.promptProfile === 'long_course' &&
      writeSet.reportArtifact.metadata.proofMode === 'youtube_long_course_god_mode_api_full_watch' &&
      writeSet.reportArtifact.metadata.longCourseLane === true &&
      writeSet.atomInputs.every(atom => atom.metadata.longCourseLane === true),
    snapshot,
    writeSet,
  }
}
