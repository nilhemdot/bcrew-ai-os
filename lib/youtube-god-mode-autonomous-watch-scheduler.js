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
})

const DEV_BUILD_LANE = 'AIOS / Dev build'
const GRADE_RANK = { S: 5, A: 4, B: 3, C: 2, D: 1, F: 0 }

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

function normalizeVideo(video = {}) {
  const creatorId = text(video.creatorId)
  return {
    videoId: text(video.videoId),
    title: text(video.title),
    creatorId,
    creator: text(video.creator),
    url: text(video.url) || (text(video.videoId) ? `https://www.youtube.com/watch?v=${text(video.videoId)}` : ''),
    rank: number(video.rank, 9999),
    relevanceScore: number(video.relevanceScore ?? video.buildIntelRelevance?.score),
    standardFullWatchRisk: Boolean(video.standardFullWatchRisk),
    standardFullWatchRiskReasons: list(video.standardFullWatchRiskReasons || video.reasons).map(text).filter(Boolean),
    publicNoAuth: video.publicNoAuth !== false,
    privateOrPaidAccess: video.privateOrPaidAccess === true,
  }
}

function sourceAllowed(gradeRow = {}, config = {}) {
  const rank = gradeRank(gradeRow.grade)
  if (rank >= gradeRank('A')) return true
  if (gradeRow.grade === 'B' && config.allowBSourceSampling) return true
  return false
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
    if (!sourceAllowed(gradeRow, mergedConfig)) {
      rejectedVideos.push(buildRejectedVideo(rawVideo, 'source_grade_throttled', gradeRow.grade || 'ungraded'))
      continue
    }
    if (gradeRow.grade === 'B') {
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
    { videoId: 'noise-1', creatorId: 'noisy-source', creator: 'Noisy Source', title: 'random clip', relevanceScore: 10, publicNoAuth: true },
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
    caseResult('throttles C sources and already-watched/private/long-course rows', base, plan =>
      plan.rejectedVideos.some(video => video.reason === 'source_grade_throttled') &&
      plan.rejectedVideos.some(video => video.reason === 'already_full_watched') &&
      plan.rejectedVideos.some(video => video.reason === 'not_public_no_auth') &&
      plan.rejectedVideos.some(video => video.reason === 'route_to_long_course_lane')
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
    retryBlocked,
  }
}
