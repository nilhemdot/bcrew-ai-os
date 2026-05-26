import {
  YOUTUBE_CREATOR_DAILY_WATCH_MARK_CREATOR_ID,
  YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID,
  YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
  buildYoutubeCreatorDailyWatchPlan,
} from './youtube-creator-daily-watch.js'
import {
  YOUTUBE_GOD_MODE_AUTONOMOUS_WATCH_SCHEDULER_CARD_ID,
} from './youtube-god-mode-autonomous-watch-scheduler.js'

export const YOUTUBE_CREATOR_GOD_MODE_CATCHUP_CARD_ID = 'YOUTUBE-CREATOR-GOD-MODE-CATCHUP-001'
export const YOUTUBE_CREATOR_GOD_MODE_CATCHUP_READBACK_CARD_ID = 'YOUTUBE-CREATOR-GOD-MODE-CATCHUP-READBACK-001'
export const YOUTUBE_CREATOR_GOD_MODE_CATCHUP_READBACK_CLOSEOUT_KEY = 'youtube-creator-god-mode-catchup-readback-v1'
export const YOUTUBE_CREATOR_GOD_MODE_CATCHUP_READBACK_PLAN_PATH = 'docs/process/youtube-creator-god-mode-catchup-readback-001-plan.md'
export const YOUTUBE_CREATOR_GOD_MODE_CATCHUP_READBACK_SCRIPT_PATH = 'scripts/process-youtube-creator-god-mode-catchup-check.mjs'

export const YOUTUBE_CREATOR_GOD_MODE_BASELINE_TARGET = 10
export const YOUTUBE_CREATOR_GOD_MODE_DEEP_TARGET = 50

const GRADE_RANK = { S: 5, A: 4, B: 3, C: 2, D: 1, F: 0 }

function text(value, fallback = '') {
  const normalized = String(value ?? '').trim()
  return normalized || fallback
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

function youtubeVideoIdFromUrl(value = '') {
  const input = text(value)
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{6,})/,
    /youtu\.be\/([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/,
  ]
  for (const pattern of patterns) {
    const match = input.match(pattern)
    if (match?.[1]) return match[1]
  }
  return ''
}

function sourceGradeRows(sourceValueGrader = null, sourceGrades = []) {
  return list(sourceGrades).length
    ? list(sourceGrades)
    : list(sourceValueGrader?.sourceGrades || sourceValueGrader?.topDevBuildSources)
}

function buildGradeMap({ sourceValueGrader = null, sourceGrades = [] } = {}) {
  const map = new Map()
  for (const row of sourceGradeRows(sourceValueGrader, sourceGrades)) {
    const creatorId = text(row.creatorId)
    if (!creatorId) continue
    map.set(creatorId, {
      creatorId,
      creator: text(row.creator || row.displayName || creatorId),
      devBuildGrade: text(row.devBuildGrade || row.grade || row.overallGrade || 'ungraded').toUpperCase(),
      overallGrade: text(row.overallGrade || row.grade || '').toUpperCase(),
      primaryUse: text(row.primaryUse || 'AIOS / Dev build'),
      watchRecommendation: text(row.watchRecommendation || 'watch_selectively'),
      watchedVideos: number(row.watchedVideos),
      buildCandidates: number(row.buildCandidates),
      bestDirectorRank: number(row.bestDirectorRank, 9999),
      laneScores: list(row.laneScores),
    })
  }
  return map
}

function normalizePoolItem(item = {}) {
  const metadata = item.metadata || {}
  const videoId = text(metadata.videoId || item.videoId || item.externalId || item.external_id || youtubeVideoIdFromUrl(metadata.url || item.url))
  return {
    itemKey: text(item.itemKey || item.item_key),
    sourceId: text(item.sourceId || item.source_id || metadata.sourceId || YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID),
    targetKey: text(item.targetKey || item.target_key || metadata.targetKey || YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY),
    creatorId: text(metadata.creatorId || item.creatorId),
    creator: text(metadata.creator || item.creator),
    channelUrl: text(metadata.channelUrl || item.channelUrl),
    videoId,
    title: text(metadata.title || item.title || videoId),
    url: text(metadata.url || item.url) || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : ''),
    rank: number(metadata.rank || item.rank, 9999),
    publicNoAuth: metadata.publicNoAuth !== false && item.publicNoAuth !== false,
    privateOrPaidAccess: metadata.privateOrPaidAccess === true || item.privateOrPaidAccess === true,
    fullWatchBlocked: metadata.fullWatchBlocked === true || item.fullWatchBlocked === true,
    firstSeenAt: text(metadata.firstSeenAt || item.firstSeenAt || item.discoveredAt || item.discovered_at),
    lastSeenAt: text(metadata.lastSeenAt || item.lastSeenAt || item.updatedAt || item.updated_at),
  }
}

function standardFullWatchRisk(title = '') {
  const lower = text(title).toLowerCase()
  const reasons = []
  if (/\bfull course\b/.test(lower) && !/\b(under|in)\s+\d+\s*(min|minute|minutes)\b/.test(lower) && !/\b(1|one)\s*hour\b/.test(lower)) {
    reasons.push('full_course_without_bounded_duration')
  }
  if (/\b(\d+\+?|two|three|four|five|six)\s*hour\s+course\b/.test(lower)) {
    reasons.push('multi_hour_course_needs_long_course_lane')
  }
  return {
    risk: reasons.length > 0,
    reasons,
  }
}

function baselineTargetForCreator() {
  return YOUTUBE_CREATOR_GOD_MODE_BASELINE_TARGET
}

function deepTargetForCreator({ creatorId = '', grade = '' } = {}) {
  const normalizedGrade = text(grade).toUpperCase()
  if (creatorId === YOUTUBE_CREATOR_DAILY_WATCH_MARK_CREATOR_ID) return YOUTUBE_CREATOR_GOD_MODE_DEEP_TARGET
  if (gradeRank(normalizedGrade) >= gradeRank('A')) return YOUTUBE_CREATOR_GOD_MODE_DEEP_TARGET
  return YOUTUBE_CREATOR_GOD_MODE_BASELINE_TARGET
}

function nextWatchActionForRow(row = {}) {
  if (row.representationStatus === 'blocked_lookup_required') return 'lookup_public_channel_url_before_watch'
  if (row.trackedMetadataCount === 0) return 'run_daily_watch_metadata_before_full_watch'
  if (row.youtubeSopStatus === 'video_baseline_met_source_sop_incomplete') return 'complete_youtube_source_sop_before_god_mode_claim'
  if (row.baselineGap > 0 && row.pendingStandardVideoCount > 0) return 'watch_next_standard_public_videos_with_scheduler'
  if (row.baselineGap > 0 && row.longCoursePendingCount > 0) return 'route_long_course_lane_or_continue_next_creator'
  if (row.baselineGap > 0) return 'no_standard_lane_rows_remaining_under_current_guard'
  if (['C', 'D', 'F'].includes(row.devBuildGrade)) return 'baseline_met_throttle_deep_watch_unless_lane_override'
  if (gradeRank(row.devBuildGrade) >= gradeRank('A') && row.deepBaselineGap > 0 && row.pendingStandardVideoCount > 0) return 'deepen_s_a_source_when_live_budget_is_approved'
  return 'baseline_met_keep_daily_delta_current'
}

function rowStatus(row = {}) {
  if (row.representationStatus === 'blocked_lookup_required') return 'blocked'
  if (row.baselineGap > 0) return 'needs_watch'
  if (row.youtubeSopStatus === 'video_baseline_met_source_sop_incomplete') return 'sop_incomplete'
  if (row.deepBaselineGap > 0 && gradeRank(row.devBuildGrade) >= gradeRank('A')) return 'baseline_met_deepen_when_budget_allows'
  return 'baseline_met'
}

function statusWaitingForWatch(watchedCount = 0, pendingStatus = '') {
  return watchedCount > 0 ? pendingStatus : 'waiting_for_video_full_watch'
}

function youtubeSopStatusFor(row = {}) {
  if (row.representationStatus === 'blocked_lookup_required') return 'blocked_lookup_required'
  if (row.baselineGap > 0) return 'baseline_incomplete'
  const statuses = [
    row.fullPageExtractionStatus,
    row.approvedResourceFollowStatus,
    row.sourcePacketWorkerStatus,
    row.browserHandsStatus,
    row.freeResourceCaptureStatus,
    row.freeCommunityPacketStatus,
    row.paidGateEvaluationStatus,
  ]
  return statuses.every(status => status === 'complete' || status === 'operator_excluded')
    ? 'source_sop_complete'
    : 'video_baseline_met_source_sop_incomplete'
}

function buildCreatorRow({ creator = {}, poolRows = [], fullWatchedVideoIds = new Set(), grade = null } = {}) {
  const creatorId = text(creator.creatorId)
  const rows = poolRows
    .filter(item => item.creatorId === creatorId)
    .sort((left, right) => number(left.rank, 9999) - number(right.rank, 9999) || left.videoId.localeCompare(right.videoId))
  const uniqueVideoIds = new Set(rows.map(item => item.videoId).filter(Boolean))
  const watchedByVideoId = rows.filter(item => fullWatchedVideoIds.has(item.videoId)).length
  const watchedByGrade = number(grade?.watchedVideos)
  const watchedCount = Math.max(watchedByVideoId, watchedByGrade)
  const longCourseRows = rows.filter(item => !fullWatchedVideoIds.has(item.videoId) && standardFullWatchRisk(item.title).risk)
  const rawPendingStandardRows = rows.filter(item =>
    item.videoId &&
    !fullWatchedVideoIds.has(item.videoId) &&
    item.publicNoAuth &&
    !item.privateOrPaidAccess &&
    !item.fullWatchBlocked &&
    !standardFullWatchRisk(item.title).risk
  )
  const pendingOffsetFromGrade = Math.max(0, watchedCount - watchedByVideoId)
  const pendingStandardRows = rawPendingStandardRows.slice(Math.min(rawPendingStandardRows.length, pendingOffsetFromGrade))
  const devBuildGrade = text(grade?.devBuildGrade || 'ungraded').toUpperCase()
  const baselineTarget = baselineTargetForCreator({ creatorId, grade: devBuildGrade })
  const deepTarget = deepTargetForCreator({ creatorId, grade: devBuildGrade })
  const baselineGap = Math.max(0, baselineTarget - watchedCount)
  const deepBaselineGap = Math.max(0, deepTarget - watchedCount)
  const representationStatus = creator.channelUrl
    ? rows.length ? 'represented' : 'metadata_missing'
    : 'blocked_lookup_required'
  const baseRow = {
    creatorId,
    creator: text(creator.displayName || creator.creator || grade?.creator || creatorId),
    channelUrl: text(creator.channelUrl),
    channelVideosUrl: text(creator.channelVideosUrl),
    priority: text(creator.priority),
    trackedMetadataCount: rows.length,
    uniqueTrackedVideoCount: uniqueVideoIds.size,
    videoAudioVisualWatchedCount: watchedCount,
    baselineTargetVideos: baselineTarget,
    deepTargetVideos: deepTarget,
    baselineGap,
    deepBaselineGap,
    commentStatus: 'operator_excluded',
    fullPageExtractionStatus: statusWaitingForWatch(watchedCount, 'needs_per_video_page_readback'),
    approvedResourceFollowStatus: watchedCount > 0 ? 'approval_required_before_following_resource_links' : 'waiting_for_video_full_watch',
    sourcePacketWorkerStatus: watchedCount > 0 ? 'runner_ready_approval_packet_required' : 'waiting_for_extraction_evidence',
    browserHandsStatus: rows.length ? 'bounded_hands_ready_for_approved_public_source_packets' : 'waiting_for_source_packet',
    freeResourceCaptureStatus: statusWaitingForWatch(watchedCount, 'waiting_for_approved_resource_packets'),
    freeCommunityPacketStatus: statusWaitingForWatch(watchedCount, 'create_packet_when_free_community_link_found'),
    paidGateEvaluationStatus: statusWaitingForWatch(watchedCount, 'create_evaluation_packet_when_gate_found'),
    autopilotDispositionStatus: 'manual_review_until_full_sop_proven',
    longCoursePendingCount: longCourseRows.length,
    pendingStandardVideoCount: pendingStandardRows.length,
    devBuildGrade,
    overallGrade: text(grade?.overallGrade || devBuildGrade).toUpperCase(),
    primaryUse: text(grade?.primaryUse || 'ungraded'),
    watchRecommendation: text(grade?.watchRecommendation || 'needs_baseline'),
    bestDirectorRank: number(grade?.bestDirectorRank, 9999),
    buildCandidates: number(grade?.buildCandidates),
    laneScores: list(grade?.laneScores),
    representationStatus,
    blockedReason: representationStatus === 'blocked_lookup_required'
      ? 'public_channel_url_lookup_required_before_daily_watch'
      : representationStatus === 'metadata_missing'
        ? 'daily_watch_metadata_missing_for_public_channel'
        : '',
    latestTrackedVideo: rows[0] ? {
      videoId: rows[0].videoId,
      title: rows[0].title,
      url: rows[0].url,
      lastSeenAt: rows[0].lastSeenAt,
    } : null,
    nextWatchCandidates: pendingStandardRows.slice(0, 3).map(item => ({
      videoId: item.videoId,
      title: item.title,
      url: item.url,
      rank: item.rank,
    })),
    longCourseCandidates: longCourseRows.slice(0, 3).map(item => ({
      videoId: item.videoId,
      title: item.title,
      url: item.url,
      reasons: standardFullWatchRisk(item.title).reasons,
    })),
  }
  const row = {
    ...baseRow,
    youtubeSopStatus: youtubeSopStatusFor(baseRow),
  }
  return {
    ...row,
    status: rowStatus(row),
    nextWatchAction: nextWatchActionForRow(row),
  }
}

export function buildYoutubeCreatorGodModeCatchupSnapshot({
  generatedAt = new Date().toISOString(),
  watchPlan = buildYoutubeCreatorDailyWatchPlan(),
  poolItems = [],
  dailyWatch = null,
  fullWatchedVideoIds = [],
  sourceValueGrader = null,
  sourceGrades = [],
} = {}) {
  const creators = list(watchPlan.creators || dailyWatch?.creators)
  const gradeMap = buildGradeMap({ sourceValueGrader, sourceGrades })
  const normalizedPool = list(poolItems.length ? poolItems : dailyWatch?.researchPool)
    .map(normalizePoolItem)
    .filter(item => item.targetKey === YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY || !item.targetKey)
  const watchedSet = new Set(list(fullWatchedVideoIds).map(text).filter(Boolean))
  const rows = creators.map(creator => buildCreatorRow({
    creator,
    poolRows: normalizedPool,
    fullWatchedVideoIds: watchedSet,
    grade: gradeMap.get(text(creator.creatorId)) || null,
  }))

  const representedOrBlocked = rows.filter(row => row.representationStatus === 'represented' || row.blockedReason)
  const baselineIncomplete = rows.filter(row => row.baselineGap > 0)
  const deepIncomplete = rows.filter(row => row.deepBaselineGap > 0 && gradeRank(row.devBuildGrade) >= gradeRank('A'))
  const sourceSopIncomplete = rows.filter(row => row.youtubeSopStatus !== 'source_sop_complete')
  const blocked = rows.filter(row => row.status === 'blocked')
  const ungraded = rows.filter(row => row.devBuildGrade === 'UNGRADED')
  const commentsOperatorExcluded = rows.every(row => row.commentStatus === 'operator_excluded')
  const majorBuildPromotionAllowed = baselineIncomplete.length === 0 && sourceSopIncomplete.length === 0
  const checks = [
    {
      ok: rows.length >= 1,
      check: 'approved public creator list is loaded',
      detail: `${rows.length} creator(s)`,
    },
    {
      ok: representedOrBlocked.length === rows.length,
      check: 'every approved public creator is represented or blocked with a reason',
      detail: `${representedOrBlocked.length}/${rows.length}`,
    },
    {
      ok: commentsOperatorExcluded,
      check: 'YouTube comments are operator-excluded for every creator',
      detail: 'operator_excluded',
    },
    {
      ok: rows.every(row =>
        row.fullPageExtractionStatus &&
        row.approvedResourceFollowStatus &&
        row.sourcePacketWorkerStatus &&
        row.browserHandsStatus &&
        row.freeResourceCaptureStatus &&
        row.freeCommunityPacketStatus &&
        row.paidGateEvaluationStatus &&
        row.autopilotDispositionStatus &&
        row.youtubeSopStatus
      ),
      check: 'full YouTube source SOP statuses are explicit',
      detail: 'all creator rows carry statuses',
    },
    {
      ok: baselineIncomplete.length >= 1 || rows.length >= 1,
      check: 'baseline completion state is visible',
      detail: `${baselineIncomplete.length} incomplete`,
    },
    {
      ok: !majorBuildPromotionAllowed || (baselineIncomplete.length === 0 && sourceSopIncomplete.length === 0),
      check: 'major build promotion gate follows source baseline and full SOP completion',
      detail: majorBuildPromotionAllowed ? 'ready' : 'blocked_source_sop_incomplete',
    },
  ]
  const failed = checks.filter(check => !check.ok)

  return {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : baselineIncomplete.length ? 'baseline_incomplete' : 'baseline_complete',
    generatedAt,
    cardId: YOUTUBE_CREATOR_GOD_MODE_CATCHUP_READBACK_CARD_ID,
    parentCardId: YOUTUBE_CREATOR_GOD_MODE_CATCHUP_CARD_ID,
    sourceIds: [YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID],
    sourceRoute: 'buildYoutubeCreatorGodModeCatchupSnapshot(dailyWatch + sourceValueGrader + full-watch video IDs)',
    reportOnly: true,
    writesBacklog: false,
    writesExternalSystems: false,
    liveExtractionStarted: false,
    schedulerCardId: YOUTUBE_GOD_MODE_AUTONOMOUS_WATCH_SCHEDULER_CARD_ID,
    summary: {
      creatorCount: rows.length,
      representedOrBlockedCount: representedOrBlocked.length,
      representedCount: rows.filter(row => row.representationStatus === 'represented').length,
      blockedCount: blocked.length,
      metadataMissingCount: rows.filter(row => row.representationStatus === 'metadata_missing').length,
      baselineTargetVideos: YOUTUBE_CREATOR_GOD_MODE_BASELINE_TARGET,
      deepTargetVideos: YOUTUBE_CREATOR_GOD_MODE_DEEP_TARGET,
      baselineCompleteCount: rows.filter(row => row.baselineGap === 0).length,
      baselineIncompleteCount: baselineIncomplete.length,
      sourceSopCompleteCount: rows.filter(row => row.youtubeSopStatus === 'source_sop_complete').length,
      sourceSopIncompleteCount: sourceSopIncomplete.length,
      deepIncompleteCount: deepIncomplete.length,
      ungradedCount: ungraded.length,
      longCoursePendingCount: rows.reduce((sum, row) => sum + row.longCoursePendingCount, 0),
      pendingStandardVideoCount: rows.reduce((sum, row) => sum + row.pendingStandardVideoCount, 0),
      videoAudioVisualWatchedCount: rows.reduce((sum, row) => sum + row.videoAudioVisualWatchedCount, 0),
      trackedMetadataCount: rows.reduce((sum, row) => sum + row.trackedMetadataCount, 0),
      commentsStatus: 'operator_excluded',
    },
    buildPromotionReadiness: {
      majorBuildPromotionAllowed,
      status: majorBuildPromotionAllowed
        ? 'ready_for_scoper_comparison'
        : baselineIncomplete.length ? 'blocked_source_baseline_incomplete' : 'blocked_source_sop_incomplete',
      blockerCardId: majorBuildPromotionAllowed ? '' : YOUTUBE_CREATOR_GOD_MODE_CATCHUP_CARD_ID,
      reason: majorBuildPromotionAllowed
        ? 'All approved public creators meet the V1 latest-10 source SOP baseline.'
        : baselineIncomplete.length
          ? 'At least one approved public creator has not met the V1 latest-10 video/audio/visual baseline.'
          : 'Video baseline is met, but full YouTube source SOP status is still incomplete.',
      visibleToScoper: true,
    },
    creators: rows,
    checks,
    failed,
    notNext: [
      'Do not call Gemini from the readback proof.',
      'Do not treat source baseline as complete while baselineIncompleteCount is non-zero.',
      'Do not use this as approval for Skool, MyICOR, paid/private, community, course, comment, download, purchase, form, or login sources.',
      'Do not auto-promote Director recommendations into build cards while the source baseline gate is blocked.',
    ],
  }
}

export function buildYoutubeCreatorGodModeCatchupDogfoodProof() {
  const watchPlan = {
    creators: [
      {
        creatorId: 's-builder',
        displayName: 'S Builder',
        channelUrl: 'https://www.youtube.com/@s-builder',
        channelVideosUrl: 'https://www.youtube.com/@s-builder/videos',
        priority: 'P0',
      },
      {
        creatorId: 'c-noise',
        displayName: 'C Noise',
        channelUrl: 'https://www.youtube.com/@c-noise',
        channelVideosUrl: 'https://www.youtube.com/@c-noise/videos',
        priority: 'P2',
      },
      {
        creatorId: 'lookup-needed',
        displayName: 'Lookup Needed',
        channelUrl: '',
        channelVideosUrl: '',
        priority: 'P1',
      },
    ],
  }
  const poolItems = [
    { external_id: 's-1', target_key: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, source_id: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID, metadata: { creatorId: 's-builder', creator: 'S Builder', videoId: 's-1', title: 'Claude Code agent workflow', rank: 1, publicNoAuth: true, privateOrPaidAccess: false } },
    { external_id: 's-2', target_key: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, source_id: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID, metadata: { creatorId: 's-builder', creator: 'S Builder', videoId: 's-2', title: 'Build AIOS browser hands', rank: 2, publicNoAuth: true, privateOrPaidAccess: false } },
    { external_id: 's-course', target_key: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, source_id: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID, metadata: { creatorId: 's-builder', creator: 'S Builder', videoId: 's-course', title: 'Claude Code Full Course 2026', rank: 3, publicNoAuth: true, privateOrPaidAccess: false } },
    { external_id: 'c-1', target_key: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, source_id: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID, metadata: { creatorId: 'c-noise', creator: 'C Noise', videoId: 'c-1', title: 'Simple automation tool', rank: 1, publicNoAuth: true, privateOrPaidAccess: false } },
  ]
  const snapshot = buildYoutubeCreatorGodModeCatchupSnapshot({
    generatedAt: '2026-05-26T06:30:00.000Z',
    watchPlan,
    poolItems,
    fullWatchedVideoIds: ['c-1'],
    sourceGrades: [
      { creatorId: 's-builder', creator: 'S Builder', devBuildGrade: 'S', overallGrade: 'S', watchedVideos: 2, buildCandidates: 4, bestDirectorRank: 1, watchRecommendation: 'watch_deeply' },
      { creatorId: 'c-noise', creator: 'C Noise', devBuildGrade: 'C', overallGrade: 'C', watchedVideos: 10, buildCandidates: 1, bestDirectorRank: 50, watchRecommendation: 'throttle_after_baseline' },
    ],
  })
  const sBuilder = snapshot.creators.find(row => row.creatorId === 's-builder')
  const cNoise = snapshot.creators.find(row => row.creatorId === 'c-noise')
  const lookup = snapshot.creators.find(row => row.creatorId === 'lookup-needed')
  const cases = [
    { name: 'comments_are_operator_excluded', ok: snapshot.creators.every(row => row.commentStatus === 'operator_excluded') },
    { name: 'blocked_creator_has_clear_reason', ok: lookup?.representationStatus === 'blocked_lookup_required' && Boolean(lookup.blockedReason) },
    { name: 's_a_source_gets_deep_target', ok: sBuilder?.deepTargetVideos === YOUTUBE_CREATOR_GOD_MODE_DEEP_TARGET && sBuilder.deepBaselineGap > 0 },
    { name: 'long_course_visible_not_standard_watch', ok: sBuilder?.longCoursePendingCount === 1 },
    { name: 'c_source_finishes_sop_before_deep_watch_throttle', ok: cNoise?.nextWatchAction === 'complete_youtube_source_sop_before_god_mode_claim' },
    { name: 'video_baseline_does_not_equal_source_sop_complete', ok: cNoise?.youtubeSopStatus !== 'source_sop_complete' && snapshot.summary?.sourceSopIncompleteCount >= 1 },
    { name: 'major_build_promotion_blocks_when_baseline_incomplete', ok: snapshot.buildPromotionReadiness.majorBuildPromotionAllowed === false },
    { name: 'proof_is_report_only', ok: snapshot.reportOnly && !snapshot.liveExtractionStarted && !snapshot.writesBacklog && !snapshot.writesExternalSystems },
  ]
  return {
    ok: snapshot.ok && cases.every(item => item.ok),
    cases,
    snapshot,
  }
}
