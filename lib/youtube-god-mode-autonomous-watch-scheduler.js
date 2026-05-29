import { scoreBuildIntelVideo } from './youtube-latest-20-intel-run.js'

export const YOUTUBE_GOD_MODE_AUTONOMOUS_WATCH_SCHEDULER_CARD_ID = 'YOUTUBE-GOD-MODE-AUTONOMOUS-WATCH-SCHEDULER-001'
export const YOUTUBE_GOD_MODE_AUTONOMOUS_WATCH_SCHEDULER_PLAN_PATH = 'docs/process/youtube-god-mode-autonomous-watch-scheduler-001-plan.md'
export const YOUTUBE_GOD_MODE_AUTONOMOUS_WATCH_SCHEDULER_SCRIPT_PATH = 'scripts/process-youtube-god-mode-autonomous-watch-scheduler-check.mjs'
export const YOUTUBE_GOD_MODE_AUTONOMOUS_WATCH_SCHEDULER_JOB_KEY = 'youtube-god-mode-autonomous-watch-scheduler'

export const YOUTUBE_GOD_MODE_SCHEDULER_DEFAULT_CONFIG = Object.freeze({
  mode: 'dry-run',
  maxVideosPerRun: 9,
  maxEstimatedUsdPerRun: 3,
  maxEstimatedUsdPerDay: 15,
  estimatedUsdPerVideo: 0.2,
  retryLimit: 2,
  allowBSourceSampling: true,
  maxBSourceVideosPerRun: 1,
  allowUngradedSourceSampling: true,
  maxUngradedSourceVideosPerRun: 2,
  finishPublicBacklog: false,
})

export const YOUTUBE_GOD_MODE_AUTOPILOT_SOP_STEPS = Object.freeze([
  { key: 'metadata_triage', label: 'Metadata triage' },
  { key: 'video_audio_visual_watch', label: 'Video/audio/visual watch' },
  { key: 'whole_page_extraction', label: 'Whole page extraction' },
  { key: 'resource_packet_followup', label: 'Resource packets' },
  { key: 'bounded_hands', label: 'Bounded Hands' },
  { key: 'free_value_capture', label: 'Free value capture' },
  { key: 'community_gate_packet', label: 'Community/gate packet' },
  { key: 'creator_grade_autopilot', label: 'Creator grade/autopilot' },
])

const DEV_BUILD_LANE = 'AIOS / Dev build'
const GRADE_RANK = { S: 5, A: 4, B: 3, C: 2, D: 1, F: 0 }
const RUNNABLE_WATCH_ACTIONS = new Set([
  'watch_next_standard_public_videos_with_scheduler',
  'deepen_s_a_source_when_live_budget_is_approved',
  'baseline_met_keep_daily_delta_current',
])
const SOURCE_SOP_CLAIM_BLOCK_ONLY_ACTION = 'complete_youtube_source_sop_before_god_mode_claim'

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function gradeRank(grade = '') {
  return GRADE_RANK[text(grade).toUpperCase()] ?? -1
}

function normalizeGradeRow(row = {}) {
  return {
    creatorId: text(row.creatorId),
    creator: text(row.creator),
    grade: text(row.devBuildGrade || row.grade || row.overallGrade || 'ungraded').toUpperCase(),
    overallGrade: text(row.overallGrade || row.grade || '').toUpperCase(),
    primaryUse: text(row.primaryUse || row.lane || DEV_BUILD_LANE),
    watchedVideos: number(row.watchedVideos),
    buildCandidates: number(row.buildCandidates),
    bestDirectorRank: number(row.bestDirectorRank, 9999),
    watchRecommendation: text(row.watchRecommendation || 'watch_selectively'),
  }
}

export function buildYoutubeGodModeSourceGradeMap({ sourceValueGrader = null, sourceGrades = [] } = {}) {
  const rows = list(sourceGrades).length
    ? sourceGrades
    : list(sourceValueGrader?.topDevBuildSources || sourceValueGrader?.sourceGrades)
  const map = new Map()
  for (const row of rows.map(normalizeGradeRow)) {
    if (row.creatorId) map.set(row.creatorId, row)
  }
  return map
}

export function buildYoutubeGodModeCandidateVideosFromCatchupSnapshot({
  catchupSnapshot = null,
  maxPerCreator = 3,
} = {}) {
  return list(catchupSnapshot?.creators)
    .flatMap(row => list(row.nextWatchCandidates)
      .slice(0, Math.max(1, number(maxPerCreator, 3)))
      .map(video => ({
        videoId: text(video.videoId),
        title: text(video.title),
        creatorId: text(row.creatorId),
        creator: text(row.creator),
        url: text(video.url),
        rank: number(video.rank, 9999),
        relevanceScore: Math.max(0, 100 - number(video.rank, 9999)) +
          Math.min(25, number(row.baselineGap) * 2) +
          Math.min(15, number(row.deepBaselineGap) / 5),
        publicNoAuth: true,
        privateOrPaidAccess: false,
        standardFullWatchRisk: false,
        sourceGrade: text(row.devBuildGrade || 'ungraded').toUpperCase(),
        sourceSopStatus: text(row.youtubeSopStatus),
        nextWatchAction: text(row.nextWatchAction),
        trackedMetadataCount: number(row.trackedMetadataCount),
        videoAudioVisualWatchedCount: number(row.videoAudioVisualWatchedCount),
        baselineTargetVideos: number(row.baselineTargetVideos),
        baselineGap: number(row.baselineGap),
        deepBaselineGap: number(row.deepBaselineGap),
        pendingStandardVideoCount: number(row.pendingStandardVideoCount),
        longCoursePendingCount: number(row.longCoursePendingCount),
        fullPageExtractionStatus: text(row.fullPageExtractionStatus),
        approvedResourceFollowStatus: text(row.approvedResourceFollowStatus),
        sourcePacketWorkerStatus: text(row.sourcePacketWorkerStatus),
        browserHandsStatus: text(row.browserHandsStatus),
        freeResourceCaptureStatus: text(row.freeResourceCaptureStatus),
        freeCommunityPacketStatus: text(row.freeCommunityPacketStatus),
        paidGateEvaluationStatus: text(row.paidGateEvaluationStatus),
        autopilotDispositionStatus: text(row.autopilotDispositionStatus),
      })))
    .filter(video => video.videoId && video.creatorId)
}

function normalizeVideo(video = {}) {
  const creatorId = text(video.creatorId)
  const videoId = text(video.videoId)
  const title = text(video.title)
  const buildIntelRelevance = video.buildIntelRelevance || scoreBuildIntelVideo({
    videoId,
    title,
    creatorId,
    visibleMetadata: text(video.visibleMetadata),
  })
  return {
    videoId,
    title,
    creatorId,
    creator: text(video.creator),
    url: text(video.url) || (text(video.videoId) ? `https://www.youtube.com/watch?v=${text(video.videoId)}` : ''),
    rank: number(video.rank, 9999),
    relevanceScore: number(video.relevanceScore ?? video.buildIntelRelevance?.score),
    standardFullWatchRisk: Boolean(video.standardFullWatchRisk),
    standardFullWatchRiskReasons: list(video.standardFullWatchRiskReasons || video.reasons).map(text).filter(Boolean),
    publicNoAuth: video.publicNoAuth !== false,
    privateOrPaidAccess: video.privateOrPaidAccess === true,
    sourceSopStatus: text(video.sourceSopStatus),
    nextWatchAction: text(video.nextWatchAction),
    trackedMetadataCount: number(video.trackedMetadataCount),
    videoAudioVisualWatchedCount: number(video.videoAudioVisualWatchedCount),
    baselineTargetVideos: number(video.baselineTargetVideos),
    baselineGap: number(video.baselineGap),
    deepBaselineGap: number(video.deepBaselineGap),
    pendingStandardVideoCount: number(video.pendingStandardVideoCount),
    longCoursePendingCount: number(video.longCoursePendingCount),
    fullPageExtractionStatus: text(video.fullPageExtractionStatus),
    approvedResourceFollowStatus: text(video.approvedResourceFollowStatus),
    sourcePacketWorkerStatus: text(video.sourcePacketWorkerStatus),
    browserHandsStatus: text(video.browserHandsStatus),
    freeResourceCaptureStatus: text(video.freeResourceCaptureStatus),
    freeCommunityPacketStatus: text(video.freeCommunityPacketStatus),
    paidGateEvaluationStatus: text(video.paidGateEvaluationStatus),
    autopilotDispositionStatus: text(video.autopilotDispositionStatus),
    buildIntelRelevance,
  }
}

function completeish(status = '') {
  const normalized = text(status)
  return normalized === 'complete' ||
    normalized === 'source_sop_complete' ||
    normalized === 'not_applicable_no_approved_resource_packets' ||
    normalized === 'no_free_public_resources_found' ||
    normalized === 'no_free_community_link_found' ||
    normalized === 'no_paid_gate_found'
}

function pendingOrBlocked(status = '') {
  const normalized = text(status)
  if (!normalized) return 'pending'
  if (completeish(normalized)) return 'complete'
  if (normalized.includes('blocked') || normalized.includes('approval_required') || normalized.includes('required')) return 'blocked'
  return 'pending'
}

function stepStatus({ key = '', rawStatus = '', selectedForWatch = false, video = {} } = {}) {
  if (key === 'metadata_triage') return video.publicNoAuth && !video.privateOrPaidAccess ? 'complete' : 'blocked'
  if (key === 'video_audio_visual_watch') return selectedForWatch ? 'selected' : pendingOrBlocked(rawStatus)
  return pendingOrBlocked(rawStatus)
}

function buildSopStep({ key = '', label = '', rawStatus = '', detail = '', selectedForWatch = false, video = {} } = {}) {
  return {
    key,
    label,
    status: stepStatus({ key, rawStatus, selectedForWatch, video }),
    rawStatus: text(rawStatus),
    detail: text(detail),
  }
}

function buildSourceSopReadiness(video = {}) {
  const selectedForWatch = RUNNABLE_WATCH_ACTIONS.has(text(video.nextWatchAction)) ||
    (text(video.nextWatchAction) === SOURCE_SOP_CLAIM_BLOCK_ONLY_ACTION && number(video.pendingStandardVideoCount) > 0)
  return [
    buildSopStep({
      ...YOUTUBE_GOD_MODE_AUTOPILOT_SOP_STEPS[0],
      rawStatus: video.publicNoAuth && !video.privateOrPaidAccess ? 'public_no_auth' : 'not_public_no_auth',
      detail: `${number(video.trackedMetadataCount)} tracked rows`,
      video,
    }),
    buildSopStep({
      ...YOUTUBE_GOD_MODE_AUTOPILOT_SOP_STEPS[1],
      rawStatus: selectedForWatch ? 'selected_for_next_full_watch' : text(video.nextWatchAction),
      selectedForWatch,
      detail: `${number(video.videoAudioVisualWatchedCount)}/${number(video.baselineTargetVideos)} watched baseline; gap ${number(video.baselineGap)}`,
      video,
    }),
    buildSopStep({
      ...YOUTUBE_GOD_MODE_AUTOPILOT_SOP_STEPS[2],
      rawStatus: video.fullPageExtractionStatus,
      detail: video.fullPageExtractionStatus,
      video,
    }),
    buildSopStep({
      ...YOUTUBE_GOD_MODE_AUTOPILOT_SOP_STEPS[3],
      rawStatus: video.approvedResourceFollowStatus,
      detail: video.approvedResourceFollowStatus,
      video,
    }),
    buildSopStep({
      ...YOUTUBE_GOD_MODE_AUTOPILOT_SOP_STEPS[4],
      rawStatus: video.browserHandsStatus || video.sourcePacketWorkerStatus,
      detail: video.browserHandsStatus || video.sourcePacketWorkerStatus,
      video,
    }),
    buildSopStep({
      ...YOUTUBE_GOD_MODE_AUTOPILOT_SOP_STEPS[5],
      rawStatus: video.freeResourceCaptureStatus,
      detail: video.freeResourceCaptureStatus,
      video,
    }),
    buildSopStep({
      ...YOUTUBE_GOD_MODE_AUTOPILOT_SOP_STEPS[6],
      rawStatus: video.freeCommunityPacketStatus || video.paidGateEvaluationStatus,
      detail: [video.freeCommunityPacketStatus, video.paidGateEvaluationStatus].map(text).filter(Boolean).join(' · '),
      video,
    }),
    buildSopStep({
      ...YOUTUBE_GOD_MODE_AUTOPILOT_SOP_STEPS[7],
      rawStatus: video.autopilotDispositionStatus || video.sourceSopStatus,
      detail: video.autopilotDispositionStatus || video.sourceSopStatus,
      video,
    }),
  ]
}

function sourceAllowed(gradeRow = {}, config = {}) {
  if (config.finishPublicBacklog) return true
  const rank = gradeRank(gradeRow.grade)
  if (rank >= gradeRank('A')) return true
  if (gradeRow.grade === 'B' && config.allowBSourceSampling) return true
  if (gradeRow.grade === 'UNGRADED' && config.allowUngradedSourceSampling) return true
  return false
}

function videoActionAllowsWatch(video = {}, config = {}) {
  const action = text(video.nextWatchAction)
  if (!action || RUNNABLE_WATCH_ACTIONS.has(action)) return true
  if (action === SOURCE_SOP_CLAIM_BLOCK_ONLY_ACTION && number(video.pendingStandardVideoCount) > 0) return true
  if (!config.finishPublicBacklog) return false
  return number(video.pendingStandardVideoCount) > 0 && [
    SOURCE_SOP_CLAIM_BLOCK_ONLY_ACTION,
    'baseline_met_throttle_deep_watch_unless_lane_override',
  ].includes(action)
}

function videoBuildIntelAllowsRunner(video = {}) {
  return number(video.buildIntelRelevance?.score) >= 16 &&
    list(video.buildIntelRelevance?.negativeTerms).length === 0
}

function sortSchedulerVideos(left, right) {
  const gradeDelta = gradeRank(right.sourceGrade) - gradeRank(left.sourceGrade)
  if (gradeDelta) return gradeDelta
  const directorDelta = number(left.bestDirectorRank, 9999) - number(right.bestDirectorRank, 9999)
  if (directorDelta) return directorDelta
  const relevanceDelta = number(right.relevanceScore) - number(left.relevanceScore)
  if (relevanceDelta) return relevanceDelta
  return number(left.rank, 9999) - number(right.rank, 9999) || left.videoId.localeCompare(right.videoId)
}

function buildRejectedVideo(video, reason, detail = '') {
  return {
    videoId: video.videoId,
    title: video.title,
    creatorId: video.creatorId,
    creator: video.creator,
    reason,
    detail,
  }
}

export function buildYoutubeGodModeAutonomousWatchPlan({
  generatedAt = new Date().toISOString(),
  mode = YOUTUBE_GOD_MODE_SCHEDULER_DEFAULT_CONFIG.mode,
  config = {},
  candidateVideos = [],
  alreadyFullWatchedVideoIds = [],
  sourceValueGrader = null,
  sourceGrades = [],
  estimatedSpendTodayUsd = 0,
  liveApproval = null,
  providerFailures = [],
} = {}) {
  const mergedConfig = { ...YOUTUBE_GOD_MODE_SCHEDULER_DEFAULT_CONFIG, ...config }
  const gradeMap = buildYoutubeGodModeSourceGradeMap({ sourceValueGrader, sourceGrades })
  const alreadyWatched = new Set(list(alreadyFullWatchedVideoIds).map(text).filter(Boolean))
  const rejectedVideos = []
  const bSourceSelections = new Map()
  let ungradedSelections = 0
  const eligibleVideos = []

  for (const rawVideo of list(candidateVideos).map(normalizeVideo)) {
    const gradeRow = gradeMap.get(rawVideo.creatorId) || normalizeGradeRow({ creatorId: rawVideo.creatorId, creator: rawVideo.creator, grade: 'ungraded' })
    if (!rawVideo.videoId) {
      rejectedVideos.push(buildRejectedVideo(rawVideo, 'missing_video_id'))
      continue
    }
    if (alreadyWatched.has(rawVideo.videoId)) {
      rejectedVideos.push(buildRejectedVideo(rawVideo, 'already_full_watched'))
      continue
    }
    if (rawVideo.privateOrPaidAccess || !rawVideo.publicNoAuth) {
      rejectedVideos.push(buildRejectedVideo(rawVideo, 'not_public_no_auth'))
      continue
    }
    if (rawVideo.standardFullWatchRisk) {
      rejectedVideos.push(buildRejectedVideo(rawVideo, 'route_to_long_course_lane', rawVideo.standardFullWatchRiskReasons.join(', ')))
      continue
    }
    if (!videoBuildIntelAllowsRunner(rawVideo)) {
      rejectedVideos.push(buildRejectedVideo(
        rawVideo,
        'not_build_intel_relevant_for_runner',
        `${number(rawVideo.buildIntelRelevance?.score)}:${list(rawVideo.buildIntelRelevance?.negativeTerms).join('|')}`,
      ))
      continue
    }
    if (!videoActionAllowsWatch(rawVideo, mergedConfig)) {
      rejectedVideos.push(buildRejectedVideo(rawVideo, 'source_sop_next_action_blocks_video_watch', rawVideo.nextWatchAction))
      continue
    }
    if (!sourceAllowed(gradeRow, mergedConfig)) {
      rejectedVideos.push(buildRejectedVideo(rawVideo, 'source_grade_throttled', gradeRow.grade || 'ungraded'))
      continue
    }
    if (!mergedConfig.finishPublicBacklog && gradeRow.grade === 'UNGRADED') {
      if (ungradedSelections >= mergedConfig.maxUngradedSourceVideosPerRun) {
        rejectedVideos.push(buildRejectedVideo(rawVideo, 'ungraded_source_sample_cap', `${ungradedSelections}/${mergedConfig.maxUngradedSourceVideosPerRun}`))
        continue
      }
      ungradedSelections += 1
    }
    if (!mergedConfig.finishPublicBacklog && gradeRow.grade === 'B') {
      const count = bSourceSelections.get(rawVideo.creatorId) || 0
      if (count >= mergedConfig.maxBSourceVideosPerRun) {
        rejectedVideos.push(buildRejectedVideo(rawVideo, 'b_source_sample_cap', `${count}/${mergedConfig.maxBSourceVideosPerRun}`))
        continue
      }
      bSourceSelections.set(rawVideo.creatorId, count + 1)
    }
    eligibleVideos.push({
      ...rawVideo,
      sourceGrade: gradeRow.grade || 'ungraded',
      overallGrade: gradeRow.overallGrade,
      primaryUse: gradeRow.primaryUse,
      bestDirectorRank: gradeRow.bestDirectorRank,
      watchRecommendation: gradeRow.watchRecommendation,
      sourceSopReadiness: buildSourceSopReadiness(rawVideo),
    })
  }

  const retryLimit = Math.max(0, number(mergedConfig.retryLimit, 2))
  const recentFailures = list(providerFailures).filter(item => item && item.ok === false)
  const retryBlocked = recentFailures.length > retryLimit
  const dailyBudgetRemaining = Math.max(0, number(mergedConfig.maxEstimatedUsdPerDay) - number(estimatedSpendTodayUsd))
  const runBudget = Math.min(number(mergedConfig.maxEstimatedUsdPerRun), dailyBudgetRemaining)
  const estimatedUsdPerVideo = Math.max(0.01, number(mergedConfig.estimatedUsdPerVideo, 0.2))
  const budgetVideoCap = Math.floor(runBudget / estimatedUsdPerVideo)
  const maxRunVideos = Math.max(0, Math.min(
    number(mergedConfig.maxVideosPerRun, 9),
    budgetVideoCap,
  ))
  const selectedVideos = retryBlocked
    ? []
    : eligibleVideos.sort(sortSchedulerVideos).slice(0, maxRunVideos)
  const estimatedRunSpendUsd = Number((selectedVideos.length * estimatedUsdPerVideo).toFixed(4))

  const liveMode = mode === 'live-bounded' || mode === 'catch-up' || mode === 'steady-state'
  const liveApproved = liveApproval?.approved === true &&
    liveApproval?.liveBoundedRunApproved === true &&
    number(liveApproval?.maxEstimatedUsdPerRun) >= estimatedRunSpendUsd &&
    number(liveApproval?.maxEstimatedUsdPerDay) >= number(estimatedSpendTodayUsd) + estimatedRunSpendUsd

  const blockers = []
  if (retryBlocked) blockers.push('provider_retry_cap_reached')
  if (number(mergedConfig.maxEstimatedUsdPerDay) <= number(estimatedSpendTodayUsd)) blockers.push('daily_budget_exhausted')
  if (budgetVideoCap <= 0) blockers.push('run_budget_too_low_for_one_video')
  if (!selectedVideos.length && !retryBlocked) blockers.push('no_eligible_videos_selected')
  if (liveMode && !liveApproved) blockers.push('live_mode_requires_explicit_budget_approval')

  const status = blockers.length
    ? 'blocked'
    : liveMode
      ? 'ready_for_live_bounded_run'
      : 'ready_for_dry_run_report'

  return {
    ok: blockers.length === 0,
    status,
    generatedAt,
    cardId: YOUTUBE_GOD_MODE_AUTONOMOUS_WATCH_SCHEDULER_CARD_ID,
    mode,
    selectedVideos,
    rejectedVideos,
    blockers,
    budget: {
      estimatedUsdPerVideo,
      estimatedSpendTodayUsd: number(estimatedSpendTodayUsd),
      maxEstimatedUsdPerRun: number(mergedConfig.maxEstimatedUsdPerRun),
      maxEstimatedUsdPerDay: number(mergedConfig.maxEstimatedUsdPerDay),
      dailyBudgetRemaining: Number(dailyBudgetRemaining.toFixed(4)),
      runBudget: Number(runBudget.toFixed(4)),
      estimatedRunSpendUsd,
      budgetVideoCap,
    },
    runnerCommand: selectedVideos.length ? [
      'npm',
      'run',
      'process:youtube-latest-20-full-watch-runner-check',
      '--',
      '--apply',
      '--live-gemini-api',
      '--json',
      `--batch-size=${selectedVideos.length}`,
      `--video-id=${selectedVideos.map(video => video.videoId).join(',')}`,
    ] : [],
    postRunRefreshCommands: [
      'npm run process:dev-team-intelligence-director-check -- --apply --json',
      'npm run process:build-intel-source-value-grader-check -- --apply --json',
      'npm run process:dev-team-hub-v0-check -- --json',
    ],
    morningReport: {
      videosPlanned: selectedVideos.length,
      sourcesCovered: Array.from(new Set(selectedVideos.map(video => video.creator))).filter(Boolean),
      rejectedCount: rejectedVideos.length,
      blockers,
      nextAction: blockers.length
        ? 'Stop and report blockers. Do not call Gemini until the blocker is cleared.'
        : liveMode
          ? 'Run one guarded full-watch batch, then refresh Director and source rankings.'
          : 'Dry-run only. Review the plan or enable live-bounded mode with approved budget config.',
    },
    reportOnly: mode === 'dry-run',
    writesBacklog: false,
    writesExternalSystems: false,
    autoApprovesLinks: false,
  }
}

function caseResult(name, plan, predicate) {
  return {
    name,
    ok: Boolean(predicate(plan)),
    status: plan.status,
    selected: plan.selectedVideos.map(video => `${video.creatorId}:${video.videoId}:${video.sourceGrade}`),
    blockers: plan.blockers,
  }
}

export function buildYoutubeGodModeAutonomousWatchSchedulerDogfoodProof() {
  const sourceGrades = [
    { creatorId: 'mark-kashef', creator: 'Mark Kashef', grade: 'S', bestDirectorRank: 1 },
    { creatorId: 'nick-saraev', creator: 'Nick Saraev', grade: 'S', bestDirectorRank: 2 },
    { creatorId: 'matt-pocock-total-typescript', creator: 'Matt Pocock / Total TypeScript', grade: 'A', bestDirectorRank: 24 },
    { creatorId: 'kia-ghasem-ai-automations', creator: 'Kia Ghasem / AI Automations', grade: 'B', bestDirectorRank: 50 },
    { creatorId: 'noisy-source', creator: 'Noisy Source', grade: 'C', bestDirectorRank: 999 },
  ]
  const candidateVideos = [
    { videoId: 'nick-1', creatorId: 'nick-saraev', creator: 'Nick Saraev', title: 'Claude Computer Use', relevanceScore: 80, publicNoAuth: true },
    { videoId: 'matt-1', creatorId: 'matt-pocock-total-typescript', creator: 'Matt Pocock', title: 'Never Trust An LLM', relevanceScore: 60, publicNoAuth: true },
    { videoId: 'kia-1', creatorId: 'kia-ghasem-ai-automations', creator: 'Kia Ghasem', title: 'n8n workflow', relevanceScore: 52, publicNoAuth: true },
    { videoId: 'kia-2', creatorId: 'kia-ghasem-ai-automations', creator: 'Kia Ghasem', title: 'n8n webhook', relevanceScore: 48, publicNoAuth: true },
    { videoId: 'new-1', creatorId: 'ungraded-dev-source', creator: 'Ungraded Dev Source', title: 'Claude Code CRM operator', relevanceScore: 70, publicNoAuth: true },
    { videoId: 'new-2', creatorId: 'ungraded-ops-source', creator: 'Ungraded Ops Source', title: 'Codex workflow router', relevanceScore: 68, publicNoAuth: true },
    { videoId: 'new-4', creatorId: 'ungraded-extra-source', creator: 'Ungraded Extra Source', title: 'Claude Code workflow system', relevanceScore: 66, publicNoAuth: true },
    { videoId: 'new-3', creatorId: 'ungraded-extra-source', creator: 'Ungraded Extra Source', title: 'Hermes agent notes', relevanceScore: 65, publicNoAuth: true },
    { videoId: 'robot-1', creatorId: 'ai-news-strategy-daily', creator: 'AI News Strategy Daily', title: 'LEAKED Interview With SEDUCTIVE Female Robots', relevanceScore: 100, publicNoAuth: true },
    { videoId: 'sop-delta-1', creatorId: 'mark-kashef', creator: 'Mark Kashef', title: 'SOP pending with new public video', relevanceScore: 100, publicNoAuth: true, pendingStandardVideoCount: 1, nextWatchAction: SOURCE_SOP_CLAIM_BLOCK_ONLY_ACTION },
    { videoId: 'sop-claim-only-1', creatorId: 'mark-kashef', creator: 'Mark Kashef', title: 'SOP pending without new public video', relevanceScore: 100, publicNoAuth: true, pendingStandardVideoCount: 0, nextWatchAction: SOURCE_SOP_CLAIM_BLOCK_ONLY_ACTION },
    { videoId: 'noise-1', creatorId: 'noisy-source', creator: 'Noisy Source', title: 'Claude automation dashboard', relevanceScore: 10, publicNoAuth: true },
    { videoId: 'old-1', creatorId: 'mark-kashef', creator: 'Mark Kashef', title: 'Already watched', relevanceScore: 90, publicNoAuth: true },
    { videoId: 'course-1', creatorId: 'nick-saraev', creator: 'Nick Saraev', title: 'Full Course', relevanceScore: 90, publicNoAuth: true, standardFullWatchRisk: true, standardFullWatchRiskReasons: ['full_course_without_bounded_duration'] },
    { videoId: 'private-1', creatorId: 'mark-kashef', creator: 'Mark Kashef', title: 'Private training', relevanceScore: 90, publicNoAuth: false, privateOrPaidAccess: true },
  ]
  const base = buildYoutubeGodModeAutonomousWatchPlan({
    candidateVideos,
    sourceGrades,
    alreadyFullWatchedVideoIds: ['old-1'],
    config: { maxVideosPerRun: 9, maxEstimatedUsdPerRun: 3, maxEstimatedUsdPerDay: 10 },
  })
  const budgetBlocked = buildYoutubeGodModeAutonomousWatchPlan({
    candidateVideos,
    sourceGrades,
    estimatedSpendTodayUsd: 10,
    config: { maxVideosPerRun: 9, maxEstimatedUsdPerRun: 3, maxEstimatedUsdPerDay: 10 },
  })
  const liveBlocked = buildYoutubeGodModeAutonomousWatchPlan({
    mode: 'live-bounded',
    candidateVideos,
    sourceGrades,
    config: { maxVideosPerRun: 2, maxEstimatedUsdPerRun: 3, maxEstimatedUsdPerDay: 10 },
  })
  const liveApproved = buildYoutubeGodModeAutonomousWatchPlan({
    mode: 'live-bounded',
    candidateVideos,
    sourceGrades,
    config: { maxVideosPerRun: 2, maxEstimatedUsdPerRun: 3, maxEstimatedUsdPerDay: 10 },
    liveApproval: { approved: true, liveBoundedRunApproved: true, maxEstimatedUsdPerRun: 3, maxEstimatedUsdPerDay: 10 },
  })
  const publicBacklogCatchup = buildYoutubeGodModeAutonomousWatchPlan({
    mode: 'catch-up',
    candidateVideos,
    sourceGrades,
    config: { maxVideosPerRun: 12, maxEstimatedUsdPerRun: 3, maxEstimatedUsdPerDay: 10, finishPublicBacklog: true },
    liveApproval: { approved: true, liveBoundedRunApproved: true, maxEstimatedUsdPerRun: 3, maxEstimatedUsdPerDay: 10 },
  })
  const retryBlocked = buildYoutubeGodModeAutonomousWatchPlan({
    candidateVideos,
    sourceGrades,
    providerFailures: [{ ok: false }, { ok: false }, { ok: false }],
    config: { retryLimit: 2 },
  })
  const cases = [
    caseResult('prioritizes S/A sources and allows one B sample', base, plan =>
      plan.status === 'ready_for_dry_run_report' &&
      plan.selectedVideos.some(video => video.creatorId === 'nick-saraev') &&
      plan.selectedVideos.some(video => video.creatorId === 'matt-pocock-total-typescript') &&
      plan.selectedVideos.filter(video => video.creatorId === 'kia-ghasem-ai-automations').length === 1
    ),
    caseResult('selected videos carry the full YouTube SOP readiness checklist', base, plan =>
      plan.selectedVideos.length > 0 &&
      plan.selectedVideos.every(video =>
        list(video.sourceSopReadiness).length === YOUTUBE_GOD_MODE_AUTOPILOT_SOP_STEPS.length &&
        list(video.sourceSopReadiness).every(step => step.key && step.label && step.status)
      )
    ),
    caseResult('samples ungraded public creators for exploratory baseline', base, plan =>
      plan.selectedVideos.filter(video => video.sourceGrade === 'UNGRADED').length === 2 &&
      plan.rejectedVideos.some(video => video.reason === 'ungraded_source_sample_cap')
    ),
    caseResult('throttles C sources and already-watched/private/long-course rows', base, plan =>
      plan.rejectedVideos.some(video => video.reason === 'source_grade_throttled') &&
      plan.rejectedVideos.some(video => video.reason === 'already_full_watched') &&
      plan.rejectedVideos.some(video => video.reason === 'not_public_no_auth') &&
      plan.rejectedVideos.some(video => video.reason === 'route_to_long_course_lane')
    ),
    caseResult('source SOP follow-up blocks God Mode claims but not safe public delta watches', base, plan =>
      plan.selectedVideos.some(video => video.videoId === 'sop-delta-1') &&
      plan.rejectedVideos.some(video =>
        video.videoId === 'sop-claim-only-1' &&
        video.reason === 'source_sop_next_action_blocks_video_watch'
      )
    ),
    caseResult('catch-up mode can finish safe public standard backlog after baseline without changing paid/private/long-course stops', publicBacklogCatchup, plan =>
      plan.status === 'ready_for_live_bounded_run' &&
      plan.selectedVideos.some(video => video.videoId === 'sop-delta-1') &&
      plan.selectedVideos.some(video => video.creatorId === 'noisy-source') &&
      !plan.rejectedVideos.some(video => video.reason === 'source_grade_throttled') &&
      !plan.rejectedVideos.some(video => video.reason === 'ungraded_source_sample_cap') &&
      plan.rejectedVideos.some(video => video.reason === 'not_public_no_auth') &&
      plan.rejectedVideos.some(video => video.reason === 'route_to_long_course_lane')
    ),
    caseResult('keeps scheduler selections compatible with full-watch runner relevance guard', base, plan =>
      plan.rejectedVideos.some(video =>
        video.videoId === 'robot-1' &&
        video.reason === 'not_build_intel_relevant_for_runner'
      ) &&
      !plan.selectedVideos.some(video => video.videoId === 'robot-1')
    ),
    caseResult('blocks when daily budget is exhausted', budgetBlocked, plan =>
      plan.status === 'blocked' && plan.blockers.includes('daily_budget_exhausted')
    ),
    caseResult('live mode requires explicit budget approval', liveBlocked, plan =>
      plan.status === 'blocked' && plan.blockers.includes('live_mode_requires_explicit_budget_approval')
    ),
    caseResult('approved live-bounded mode uses guarded runner command', liveApproved, plan =>
      plan.status === 'ready_for_live_bounded_run' &&
      plan.runnerCommand.join(' ').includes('process:youtube-latest-20-full-watch-runner-check') &&
      plan.runnerCommand.join(' ').includes('--live-gemini-api')
    ),
    caseResult('provider retry cap stops loop', retryBlocked, plan =>
      plan.status === 'blocked' && plan.blockers.includes('provider_retry_cap_reached')
    ),
  ]
  return {
    ok: cases.every(item => item.ok),
    cases,
    base,
    budgetBlocked,
    liveBlocked,
    liveApproved,
    publicBacklogCatchup,
    retryBlocked,
  }
}
