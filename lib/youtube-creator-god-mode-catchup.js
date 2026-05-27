import {
  YOUTUBE_CREATOR_DAILY_WATCH_MARK_CREATOR_ID,
  YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID,
  YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
  buildYoutubeCreatorDailyWatchPlan,
} from './youtube-creator-daily-watch.js'
import {
  YOUTUBE_GOD_MODE_AUTONOMOUS_WATCH_SCHEDULER_CARD_ID,
} from './youtube-god-mode-autonomous-watch-scheduler.js'
import {
  buildSourcePacketPreview,
  validateSourcePacketPreview,
} from './build-intel-link-approval-source-packets.js'
import {
  classifyYoutubeResourceLink,
} from './youtube-resource-link-resolver.js'

export const YOUTUBE_CREATOR_GOD_MODE_CATCHUP_CARD_ID = 'YOUTUBE-CREATOR-GOD-MODE-CATCHUP-001'
export const YOUTUBE_CREATOR_GOD_MODE_CATCHUP_READBACK_CARD_ID = 'YOUTUBE-CREATOR-GOD-MODE-CATCHUP-READBACK-001'
export const YOUTUBE_CREATOR_GOD_MODE_CATCHUP_READBACK_CLOSEOUT_KEY = 'youtube-creator-god-mode-catchup-readback-v1'
export const YOUTUBE_CREATOR_GOD_MODE_CATCHUP_READBACK_PLAN_PATH = 'docs/process/youtube-creator-god-mode-catchup-readback-001-plan.md'
export const YOUTUBE_CREATOR_GOD_MODE_CATCHUP_READBACK_SCRIPT_PATH = 'scripts/process-youtube-creator-god-mode-catchup-check.mjs'

export const YOUTUBE_CREATOR_GOD_MODE_BASELINE_TARGET = 10
export const YOUTUBE_CREATOR_GOD_MODE_DEEP_TARGET = 50

const GRADE_RANK = { S: 5, A: 4, B: 3, C: 2, D: 1, F: 0 }
const YOUTUBE_FULL_WATCH_ROUTE = 'gemini_api_youtube_url_video_understanding'

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

function reportId(report = {}) {
  return text(report.reportArtifactId || report.report_artifact_id)
}

function reportStructured(report = {}) {
  return report.structuredOutputJson || report.structured_output_json || {}
}

function reportMetadata(report = {}) {
  return report.metadata || {}
}

function reportUpdatedAt(report = {}) {
  return text(report.updatedAt || report.updated_at || report.createdAt || report.created_at)
}

function hostFromUrl(value = '') {
  try {
    return new URL(text(value)).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return ''
  }
}

function videoIdsFromReport(report = {}) {
  const metadata = reportMetadata(report)
  return list(metadata.videoIds)
    .flatMap(value => String(value || '').split(','))
    .map(text)
    .filter(Boolean)
}

function videoIdFromWorkerRun(item = {}) {
  const metadata = item.metadata || {}
  return text(metadata.sourceVideoId || metadata.videoId || youtubeVideoIdFromUrl(metadata.sourceUrl || metadata.exactUrl))
}

function sourcePacketIdFromWorkerRun(item = {}) {
  const metadata = item.metadata || {}
  return text(metadata.sourcePacketId || metadata.source_packet_id)
}

function linkLooksLikeCommunity(link = {}) {
  const host = text(link.host || hostFromUrl(link.url)).toLowerCase()
  const haystack = `${host} ${link.url || ''} ${link.blocker || ''} ${link.allowedNextDecision || ''}`.toLowerCase()
  return host === 'skool.com' || host.endsWith('.skool.com') || /\bcommunity\b/.test(haystack)
}

function linkLooksLikePaidGate(link = {}) {
  const host = text(link.host || hostFromUrl(link.url)).toLowerCase()
  const haystack = `${host} ${link.url || ''} ${link.blocker || ''} ${link.allowedNextDecision || ''}`.toLowerCase()
  return /\b(paid|course|checkout|buy|purchase|member|membership|private|login|vip|masterclass|udemy|gumroad|skool)\b/.test(haystack)
}

function normalizeApprovalRequiredLinks(result = {}) {
  const packet = result.resourceLinkSnapshot?.scoperPacket || {}
  const actionLinks = list(result.actionRequiredItems)
    .filter(item => item.type === 'approval_required_resource_link')
  return [
    ...list(packet.approvalRequiredResourceLinks),
    ...actionLinks,
  ].map(link => ({
    ...link,
    url: text(link.url),
    host: text(link.host || hostFromUrl(link.url)),
  }))
    .filter(link => link.url)
    .filter(link => classifyYoutubeResourceLink(link).approvalRequired === true)
}

function sourcePacketActionPriority(action = {}) {
  const packet = action.sourcePacketPreview || {}
  const family = text(packet.sourceFamily)
  const decision = text(packet.proposedDecision)
  const runtime = packet.runtimePlan || {}
  if (!/^https?:\/\//i.test(text(packet.exactUrl || action.url))) return 95
  if (action.sourcePacketValidation?.ok === false) return 5
  if (family === 'system_noise' || decision === 'reject_noise') return 100
  if (runtime.runnableAfterPacket === true) return family === 'github' ? 10 : 15
  if (decision === 'approve_free_community_bounded_read' || family === 'skool') return 20
  if (decision === 'approve_sales_page_review') return 25
  if (decision === 'park_purchase_candidate') return 30
  if (decision === 'hold_paid_private' || decision === 'approve_paid_source_access') return 35
  if (family === 'community_or_course' || family === 'myicor') return 40
  if (family === 'short_link') return 50
  if (family === 'social') return 90
  return 60
}

function sourcePacketActionIsReviewable(action = {}) {
  const packet = action.sourcePacketPreview || {}
  const exactUrl = text(packet.exactUrl || action.url)
  if (!/^https?:\/\//i.test(exactUrl)) return false
  if (packet.currentResolverDisposition === 'blocked_invalid_url') return false
  if (packet.proposedDecision === 'reject_noise') return false
  if (packet.sourceFamily === 'system_noise') return false
  return true
}

function buildSourcePacketAction({ report = {}, result = {}, link = {} } = {}) {
  const metadata = reportMetadata(report)
  const video = result.video || {}
  const videoId = text(link.sourceVideoId || video.videoId || result.videoId)
  const url = text(link.url)
  const rawLink = {
    ...link,
    url,
    host: text(link.host || hostFromUrl(url)),
    sourceVideoId: videoId,
    sourceUrl: text(link.sourceUrl || video.url) || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : ''),
    reportArtifactId: reportId(report),
    sourceReportArtifactId: reportId(report),
    reportTitle: text(report.title || metadata.title),
    creatorId: text(link.creatorId || video.creatorId || metadata.creatorId),
    creator: text(link.creator || video.creator || metadata.creator),
    videoTitle: text(link.videoTitle || video.title || result.title),
    reason: text(link.reason || link.blocker || 'Needs source-packet review before the system reads this link.'),
  }
  const sourcePacketPreview = buildSourcePacketPreview(rawLink)
  const sourcePacketValidation = validateSourcePacketPreview(sourcePacketPreview)
  const action = {
    url: rawLink.url,
    host: rawLink.host || sourcePacketPreview.host,
    type: sourcePacketPreview.sourceType || sourcePacketPreview.sourceFamily || 'source_packet',
    sourceFamily: sourcePacketPreview.sourceFamily,
    proposedDecision: sourcePacketPreview.proposedDecision,
    sourcePacketId: sourcePacketPreview.sourcePacketId,
    sourceVideoId: rawLink.sourceVideoId,
    sourceUrl: rawLink.sourceUrl,
    creatorId: rawLink.creatorId,
    creator: rawLink.creator,
    videoTitle: rawLink.videoTitle,
    reason: rawLink.reason,
    decisionNeeded: text(link.allowedNextDecision || sourcePacketPreview.plainEnglish || 'Approve exact source follow-up or reject.'),
    reportArtifactId: rawLink.reportArtifactId,
    reportTitle: rawLink.reportTitle,
    sourcePacketPreview,
    sourcePacketValidation,
  }
  return {
    ...action,
    priority: sourcePacketActionPriority(action),
    reviewable: sourcePacketActionIsReviewable(action),
  }
}

function sourcePacketActionKey(action = {}) {
  const packet = action.sourcePacketPreview || {}
  const url = text(packet.exactUrl || action.url).toLowerCase().replace(/#.*$/, '')
  const decision = text(packet.proposedDecision || action.proposedDecision)
  return url ? `${url}|${decision}` : text(action.sourcePacketId)
}

function mergeSourcePacketActions(left = {}, right = {}) {
  const sourceVideoIds = Array.from(new Set([
    ...list(left.sourceVideoIds),
    left.sourceVideoId,
    ...list(right.sourceVideoIds),
    right.sourceVideoId,
  ].map(text).filter(Boolean))).slice(0, 20)
  const sourceUrls = Array.from(new Set([
    ...list(left.sourceUrls),
    left.sourceUrl,
    ...list(right.sourceUrls),
    right.sourceUrl,
  ].map(text).filter(Boolean))).slice(0, 20)
  const reportArtifactIds = Array.from(new Set([
    ...list(left.reportArtifactIds),
    left.reportArtifactId,
    ...list(right.reportArtifactIds),
    right.reportArtifactId,
  ].map(text).filter(Boolean))).slice(0, 20)
  const creators = Array.from(new Set([
    ...list(left.creators),
    left.creator,
    ...list(right.creators),
    right.creator,
  ].map(text).filter(Boolean))).slice(0, 12)
  return {
    ...left,
    evidenceCount: number(left.evidenceCount, 1) + number(right.evidenceCount, 1),
    sourceVideoIds,
    sourceUrls,
    reportArtifactIds,
    creators,
  }
}

function uniqueSourcePacketActions(actions = []) {
  const unique = new Map()
  for (const action of list(actions)) {
    const key = sourcePacketActionKey(action)
    if (!key) continue
    const enriched = {
      ...action,
      evidenceCount: number(action.evidenceCount, 1),
      sourceVideoIds: list(action.sourceVideoIds).length ? list(action.sourceVideoIds) : [action.sourceVideoId].filter(Boolean),
      sourceUrls: list(action.sourceUrls).length ? list(action.sourceUrls) : [action.sourceUrl].filter(Boolean),
      reportArtifactIds: list(action.reportArtifactIds).length ? list(action.reportArtifactIds) : [action.reportArtifactId].filter(Boolean),
      creators: list(action.creators).length ? list(action.creators) : [action.creator].filter(Boolean),
    }
    unique.set(key, unique.has(key) ? mergeSourcePacketActions(unique.get(key), enriched) : enriched)
  }
  return Array.from(unique.values())
    .sort((left, right) =>
      number(left.priority, 999) - number(right.priority, 999) ||
      text(left.host).localeCompare(text(right.host)) ||
      text(left.url).localeCompare(text(right.url))
    )
}

function summarizeSourcePacketActions(actions = []) {
  const unique = uniqueSourcePacketActions(actions)
  const reviewable = unique.filter(action => action.reviewable !== false)
  const invalid = unique.filter(action => !/^https?:\/\//i.test(text(action.sourcePacketPreview?.exactUrl || action.url)))
  const rejectedNoise = unique.filter(action =>
    action.sourcePacketPreview?.proposedDecision === 'reject_noise' ||
    action.sourcePacketPreview?.sourceFamily === 'system_noise'
  )
  const byDecision = decision => reviewable.filter(action => action.sourcePacketPreview?.proposedDecision === decision).length
  const byFamily = family => reviewable.filter(action => action.sourcePacketPreview?.sourceFamily === family).length
  return {
    sourcePacketActionCount: reviewable.length,
    sourcePacketValidationFailureCount: reviewable.filter(action => action.sourcePacketValidation?.ok === false).length,
    runnablePublicSourcePacketCount: reviewable.filter(action =>
      action.sourcePacketValidation?.ok === true &&
      action.sourcePacketPreview?.runtimePlan?.runnableAfterPacket === true
    ).length,
    publicWebPacketCount: byFamily('public_web') + byFamily('github'),
    freeCommunityPacketCount: byDecision('approve_free_community_bounded_read'),
    paidGatePacketCount: reviewable.filter(action =>
      ['hold_paid_private', 'approve_paid_source_access', 'approve_login_bounded_read'].includes(action.sourcePacketPreview?.proposedDecision) ||
      ['skool', 'myicor', 'community_or_course', 'purchase_or_checkout', 'form_or_booking'].includes(action.sourcePacketPreview?.sourceFamily)
    ).length,
    purchaseCandidatePacketCount: byDecision('park_purchase_candidate'),
    invalidSourcePacketLinkCount: invalid.length,
    rejectedNoisePacketCount: rejectedNoise.length,
  }
}

function buildSourcePacketReviewQueueFromEvidence(sourceSopEvidence = {}, limit = 24) {
  const byVideoId = sourceSopEvidence.byVideoId instanceof Map ? sourceSopEvidence.byVideoId : new Map()
  return uniqueSourcePacketActions(
    Array.from(byVideoId.values()).flatMap(item => list(item.sourcePacketActions))
  )
    .filter(action => action.reviewable !== false)
    .slice(0, Math.max(1, number(limit, 24)))
}

function buildVideoSopEvidenceFromResult({ report = {}, result = {}, workerRunsByVideoId = new Map() } = {}) {
  const metadata = reportMetadata(report)
  const video = result.video || {}
  const videoId = text(video.videoId || result.videoId)
  if (!videoId) return null
  const pageEvidence = result.pageEvidence || {}
  const resourceCounts = result.resourceLinkSnapshot?.counts || {}
  const approvalRequiredLinks = normalizeApprovalRequiredLinks(result)
  const sourcePacketActions = approvalRequiredLinks.map(link => buildSourcePacketAction({ report, result, link }))
  const workerRuns = workerRunsByVideoId.get(videoId) || []
  const fullWatchComplete = metadata.fullWatchRoute === YOUTUBE_FULL_WATCH_ROUTE || result.eyes?.ok === true
  const fullPageComplete = pageEvidence.responseOk === true
  const resourceDispositionComplete = Boolean(result.resourceLinkSnapshot?.status) &&
    Number(resourceCounts.remainingPublic || 0) === 0
  return {
    videoId,
    creatorId: text(video.creatorId),
    creator: text(video.creator),
    reportArtifactId: reportId(report),
    reportUpdatedAt: reportUpdatedAt(report),
    fullWatchComplete,
    fullPageComplete,
    resourceDispositionComplete,
    captionTrackCount: number(pageEvidence.captionTrackCount),
    descriptionLength: number(result.baseline?.descriptionLength),
    resourceLinkCount: number(pageEvidence.resourceLinkCount || result.baseline?.resourceLinkCount),
    approvalRequiredLinkCount: approvalRequiredLinks.length,
    blockedLinkCount: number(resourceCounts.blocked),
    resolvedPublicResourceLinkCount: number(resourceCounts.resolvedPublic),
    remainingPublicResourceLinkCount: number(resourceCounts.remainingPublic),
    attemptedPublicResourceLinkCount: number(resourceCounts.attemptedPublic),
    freeCommunityLinkCount: approvalRequiredLinks.filter(linkLooksLikeCommunity).length,
    paidGateLinkCount: approvalRequiredLinks.filter(linkLooksLikePaidGate).length,
    sourcePacketActions,
    sourcePacketWorkerRunCount: workerRuns.length,
    sourcePacketIds: workerRuns.map(sourcePacketIdFromWorkerRun).filter(Boolean),
    geminiCallId: text(result.eyes?.callId || result.eyes?.score?.callId),
  }
}

export function buildYoutubeCreatorSourceSopEvidence({
  youtubeFullWatchReports = [],
  sourcePacketWorkerRuns = [],
} = {}) {
  const workerRunsByVideoId = new Map()
  for (const item of list(sourcePacketWorkerRuns)) {
    const videoId = videoIdFromWorkerRun(item)
    if (!videoId) continue
    if (!workerRunsByVideoId.has(videoId)) workerRunsByVideoId.set(videoId, [])
    workerRunsByVideoId.get(videoId).push(item)
  }

  const byVideoId = new Map()
  const byCreatorId = new Map()
  for (const report of list(youtubeFullWatchReports)) {
    const structured = reportStructured(report)
    const snapshot = structured.snapshot || structured
    const results = list(snapshot.videoResults)
    if (!results.length) {
      for (const videoId of videoIdsFromReport(report)) {
        const evidence = {
          videoId,
          creatorId: '',
          creator: '',
          reportArtifactId: reportId(report),
          reportUpdatedAt: reportUpdatedAt(report),
          fullWatchComplete: reportMetadata(report).fullWatchRoute === YOUTUBE_FULL_WATCH_ROUTE,
          fullPageComplete: false,
          resourceDispositionComplete: false,
          captionTrackCount: 0,
          descriptionLength: 0,
          resourceLinkCount: 0,
          approvalRequiredLinkCount: 0,
          blockedLinkCount: 0,
          resolvedPublicResourceLinkCount: 0,
          remainingPublicResourceLinkCount: 0,
          attemptedPublicResourceLinkCount: 0,
          freeCommunityLinkCount: 0,
          paidGateLinkCount: 0,
          sourcePacketActions: [],
          sourcePacketWorkerRunCount: list(workerRunsByVideoId.get(videoId)).length,
          sourcePacketIds: list(workerRunsByVideoId.get(videoId)).map(sourcePacketIdFromWorkerRun).filter(Boolean),
          geminiCallId: '',
        }
        byVideoId.set(videoId, evidence)
      }
      continue
    }
    for (const result of results) {
      const evidence = buildVideoSopEvidenceFromResult({ report, result, workerRunsByVideoId })
      if (!evidence) continue
      byVideoId.set(evidence.videoId, evidence)
      if (!evidence.creatorId) continue
      if (!byCreatorId.has(evidence.creatorId)) byCreatorId.set(evidence.creatorId, [])
      byCreatorId.get(evidence.creatorId).push(evidence)
    }
  }

  const allEvidence = Array.from(byVideoId.values())
  const allSourcePacketActions = allEvidence.flatMap(item => list(item.sourcePacketActions))
  const sourcePacketReviewQueue = buildSourcePacketReviewQueueFromEvidence({ byVideoId })
  const actionSummary = summarizeSourcePacketActions(allSourcePacketActions)
  return {
    byVideoId,
    byCreatorId,
    sourcePacketReviewQueue,
    summary: {
      reportCount: list(youtubeFullWatchReports).length,
      videoEvidenceCount: byVideoId.size,
      sourcePacketWorkerRunCount: list(sourcePacketWorkerRuns).length,
      fullPageEvidenceCount: allEvidence.filter(item => item.fullPageComplete).length,
      resourceDispositionEvidenceCount: allEvidence.filter(item => item.resourceDispositionComplete).length,
      ...actionSummary,
    },
  }
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
  const title = text(metadata.title || item.title || videoId)
  const visibleMetadata = text(metadata.visibleMetadata || item.visibleMetadata)
  const accessGated = /\b(members?\s+only|member-only|members-only|private\s+video|join\s+this\s+channel|sign\s+in\s+to\s+confirm)\b/i.test(`${title} ${visibleMetadata}`)
  return {
    itemKey: text(item.itemKey || item.item_key),
    sourceId: text(item.sourceId || item.source_id || metadata.sourceId || YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID),
    targetKey: text(item.targetKey || item.target_key || metadata.targetKey || YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY),
    creatorId: text(metadata.creatorId || item.creatorId),
    creator: text(metadata.creator || item.creator),
    channelUrl: text(metadata.channelUrl || item.channelUrl),
    videoId,
    title,
    url: text(metadata.url || item.url) || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : ''),
    rank: number(metadata.rank || item.rank, 9999),
    duration: text(metadata.duration || item.duration),
    visibleMetadata,
    publicNoAuth: metadata.publicNoAuth !== false && item.publicNoAuth !== false && !accessGated,
    privateOrPaidAccess: metadata.privateOrPaidAccess === true || item.privateOrPaidAccess === true || accessGated,
    fullWatchBlocked: metadata.fullWatchBlocked === true || item.fullWatchBlocked === true,
    firstSeenAt: text(metadata.firstSeenAt || item.firstSeenAt || item.discoveredAt || item.discovered_at),
    lastSeenAt: text(metadata.lastSeenAt || item.lastSeenAt || item.updatedAt || item.updated_at),
  }
}

function parseDurationSeconds(value = '') {
  const input = text(value).toLowerCase()
  const colonMatch = input.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/)
  if (colonMatch) {
    const first = number(colonMatch[1])
    const second = number(colonMatch[2])
    const third = colonMatch[3] == null ? null : number(colonMatch[3])
    return third == null
      ? first * 60 + second
      : first * 3600 + second * 60 + third
  }

  const hourMatch = input.match(/\b(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/)
  const minuteMatch = input.match(/\b(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)\b/)
  const hours = hourMatch ? Number(hourMatch[1]) : 0
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0
  return Math.round(hours * 3600 + minutes * 60)
}

function standardFullWatchRisk(input = '') {
  const title = typeof input === 'object' && input !== null ? text(input.title) : text(input)
  const duration = typeof input === 'object' && input !== null ? text(input.duration || input.durationText) : ''
  const visibleMetadata = typeof input === 'object' && input !== null ? text(input.visibleMetadata) : ''
  const lower = `${title} ${duration} ${visibleMetadata}`.toLowerCase()
  const durationSeconds = Math.max(parseDurationSeconds(duration), parseDurationSeconds(visibleMetadata))
  const reasons = []
  if (/\bfull course\b/.test(lower) && !/\b(under|in)\s+\d+\s*(min|minute|minutes)\b/.test(lower) && !/\b(1|one)\s*hour\b/.test(lower)) {
    reasons.push('full_course_without_bounded_duration')
  }
  if (/\b(\d+\+?|two|three|four|five|six)\s*hour\s+course\b/.test(lower)) {
    reasons.push('multi_hour_course_needs_long_course_lane')
  }
  if (durationSeconds >= 7200) {
    reasons.push('multi_hour_duration_needs_long_course_lane')
  } else if (
    durationSeconds >= 3600 &&
    /\b(course|training|tutorial|workshop|masterclass|live|sales call|build with me)\b/.test(lower)
  ) {
    reasons.push('long_training_duration_needs_long_course_lane')
  }
  return {
    risk: reasons.length > 0,
    reasons: [...new Set(reasons)],
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

function completeOrPartialStatus({ completeCount = 0, expectedCount = 0, pending = '', partialPrefix = 'partial' } = {}) {
  const expected = Math.max(0, number(expectedCount))
  const complete = Math.max(0, number(completeCount))
  if (expected <= 0) return 'waiting_for_video_full_watch'
  if (complete >= expected) return 'complete'
  if (complete > 0) return `${partialPrefix}_${complete}_of_${expected}`
  return pending
}

function sourceSopCompleteStatus(status = '') {
  return [
    'complete',
    'operator_excluded',
    'not_applicable_no_approved_resource_packets',
    'no_free_public_resources_found',
    'no_free_community_link_found',
    'no_paid_gate_found',
  ].includes(text(status))
}

function summarizeCreatorSopEvidence({ creatorId = '', rows = [], watchedCount = 0, sourceSopEvidence = null } = {}) {
  const byVideoId = sourceSopEvidence?.byVideoId instanceof Map ? sourceSopEvidence.byVideoId : new Map()
  const byCreatorId = sourceSopEvidence?.byCreatorId instanceof Map ? sourceSopEvidence.byCreatorId : new Map()
  const poolVideoIds = new Set(list(rows).map(row => row.videoId).filter(Boolean))
  const evidenceRows = [
    ...list(byCreatorId.get(creatorId)),
    ...Array.from(poolVideoIds).map(videoId => byVideoId.get(videoId)).filter(Boolean),
  ]
  const uniqueEvidence = Array.from(new Map(evidenceRows.map(row => [row.videoId, row])).values())
  const expected = Math.max(0, number(watchedCount))
  const totals = uniqueEvidence.reduce((acc, item) => {
    acc.fullWatchComplete += item.fullWatchComplete ? 1 : 0
    acc.fullPageComplete += item.fullPageComplete ? 1 : 0
    acc.resourceDispositionComplete += item.resourceDispositionComplete ? 1 : 0
    acc.approvalRequiredLinkCount += number(item.approvalRequiredLinkCount)
    acc.blockedLinkCount += number(item.blockedLinkCount)
    acc.resolvedPublicResourceLinkCount += number(item.resolvedPublicResourceLinkCount)
    acc.remainingPublicResourceLinkCount += number(item.remainingPublicResourceLinkCount)
    acc.freeCommunityLinkCount += number(item.freeCommunityLinkCount)
    acc.paidGateLinkCount += number(item.paidGateLinkCount)
    acc.sourcePacketActions.push(...list(item.sourcePacketActions))
    acc.sourcePacketWorkerRunCount += number(item.sourcePacketWorkerRunCount)
    return acc
  }, {
    fullWatchComplete: 0,
    fullPageComplete: 0,
    resourceDispositionComplete: 0,
    approvalRequiredLinkCount: 0,
    blockedLinkCount: 0,
    resolvedPublicResourceLinkCount: 0,
    remainingPublicResourceLinkCount: 0,
    freeCommunityLinkCount: 0,
    paidGateLinkCount: 0,
    sourcePacketActions: [],
    sourcePacketWorkerRunCount: 0,
  })
  const actionSummary = summarizeSourcePacketActions(totals.sourcePacketActions)
  delete totals.sourcePacketActions
  return {
    expectedWatchedForSop: expected,
    evidenceVideoCount: uniqueEvidence.length,
    latestEvidenceAt: uniqueEvidence.map(item => item.reportUpdatedAt).filter(Boolean).sort().at(-1) || '',
    evidenceReportArtifactIds: Array.from(new Set(uniqueEvidence.map(item => item.reportArtifactId).filter(Boolean))).slice(0, 8),
    ...totals,
    ...actionSummary,
  }
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
    row.autopilotDispositionStatus,
  ]
  return statuses.every(sourceSopCompleteStatus)
    ? 'source_sop_complete'
    : 'video_baseline_met_source_sop_incomplete'
}

function buildCreatorRow({ creator = {}, poolRows = [], fullWatchedVideoIds = new Set(), grade = null, sourceSopEvidence = null } = {}) {
  const creatorId = text(creator.creatorId)
  const rows = poolRows
    .filter(item => item.creatorId === creatorId)
    .sort((left, right) => number(left.rank, 9999) - number(right.rank, 9999) || left.videoId.localeCompare(right.videoId))
  const uniqueVideoIds = new Set(rows.map(item => item.videoId).filter(Boolean))
  const evidenceByVideoId = sourceSopEvidence?.byVideoId instanceof Map ? sourceSopEvidence.byVideoId : new Map()
  const watchedByVideoId = rows.filter(item => fullWatchedVideoIds.has(item.videoId)).length
  const watchedByReportEvidence = rows.filter(item => {
    const evidence = evidenceByVideoId.get(item.videoId)
    return evidence?.fullWatchComplete || evidence?.fullPageComplete || evidence?.reportArtifactId
  }).length
  const watchedByGrade = number(grade?.watchedVideos)
  const watchedCount = Math.max(watchedByVideoId, watchedByReportEvidence, watchedByGrade)
  const longCourseRows = rows.filter(item => !fullWatchedVideoIds.has(item.videoId) && standardFullWatchRisk(item).risk)
  const rawPendingStandardRows = rows.filter(item =>
    item.videoId &&
    !fullWatchedVideoIds.has(item.videoId) &&
    item.publicNoAuth &&
    !item.privateOrPaidAccess &&
    !item.fullWatchBlocked &&
    !standardFullWatchRisk(item).risk
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
  const sopEvidence = summarizeCreatorSopEvidence({ creatorId, rows, watchedCount, sourceSopEvidence })
  const resourceWorkRequired = sopEvidence.approvalRequiredLinkCount > 0 || sopEvidence.resolvedPublicResourceLinkCount > 0
  const resourceDispositionDone = sopEvidence.resourceDispositionComplete >= watchedCount &&
    sopEvidence.remainingPublicResourceLinkCount === 0 &&
    sopEvidence.approvalRequiredLinkCount === 0
  const sourcePacketWorkerDone = resourceWorkRequired
    ? sopEvidence.sourcePacketWorkerRunCount >= (sopEvidence.approvalRequiredLinkCount + sopEvidence.resolvedPublicResourceLinkCount)
    : sopEvidence.resourceDispositionComplete > 0
  const freeResourceDone = sopEvidence.resolvedPublicResourceLinkCount > 0
    ? sopEvidence.sourcePacketWorkerRunCount >= sopEvidence.resolvedPublicResourceLinkCount
    : sopEvidence.resourceDispositionComplete > 0
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
    fullPageExtractionStatus: completeOrPartialStatus({
      completeCount: sopEvidence.fullPageComplete,
      expectedCount: watchedCount,
      pending: statusWaitingForWatch(watchedCount, 'needs_per_video_page_readback'),
      partialPrefix: 'partial_page_evidence',
    }),
    approvedResourceFollowStatus: watchedCount <= 0
      ? 'waiting_for_video_full_watch'
      : resourceDispositionDone
        ? 'complete'
        : sopEvidence.resourceDispositionComplete > 0
          ? 'resource_dispositions_partial_or_approval_required'
          : 'approval_required_before_following_resource_links',
    sourcePacketWorkerStatus: watchedCount <= 0
      ? 'waiting_for_extraction_evidence'
      : sourcePacketWorkerDone
        ? (resourceWorkRequired ? 'complete' : 'not_applicable_no_approved_resource_packets')
        : resourceWorkRequired
          ? 'runner_ready_approval_packet_required'
          : 'waiting_for_approved_resource_packets',
    browserHandsStatus: watchedCount <= 0
      ? 'waiting_for_source_packet'
      : sopEvidence.sourcePacketWorkerRunCount > 0
        ? 'complete'
        : resourceWorkRequired
          ? 'bounded_hands_ready_for_approved_public_source_packets'
          : 'not_applicable_no_approved_resource_packets',
    freeResourceCaptureStatus: watchedCount <= 0
      ? 'waiting_for_video_full_watch'
      : freeResourceDone
        ? (sopEvidence.resolvedPublicResourceLinkCount > 0 ? 'complete' : 'no_free_public_resources_found')
        : sopEvidence.resolvedPublicResourceLinkCount > 0
          ? 'free_public_resource_metadata_resolved_worker_capture_pending'
          : 'waiting_for_approved_resource_packets',
    freeCommunityPacketStatus: watchedCount <= 0
      ? 'waiting_for_video_full_watch'
      : sopEvidence.freeCommunityLinkCount > 0
        ? 'free_community_packet_required'
        : sopEvidence.resourceDispositionComplete > 0
          ? 'no_free_community_link_found'
          : 'create_packet_when_free_community_link_found',
    paidGateEvaluationStatus: watchedCount <= 0
      ? 'waiting_for_video_full_watch'
      : sopEvidence.paidGateLinkCount > 0
        ? 'paid_gate_evaluation_required'
        : sopEvidence.resourceDispositionComplete > 0
          ? 'no_paid_gate_found'
          : 'create_evaluation_packet_when_gate_found',
    autopilotDispositionStatus: 'manual_review_until_full_sop_proven',
    sourceSopEvidence: sopEvidence,
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
      duration: item.duration,
      reasons: standardFullWatchRisk(item).reasons,
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
  youtubeFullWatchReports = [],
  sourcePacketWorkerRuns = [],
} = {}) {
  const creators = list(watchPlan.creators || dailyWatch?.creators)
  const gradeMap = buildGradeMap({ sourceValueGrader, sourceGrades })
  const sourceSopEvidence = buildYoutubeCreatorSourceSopEvidence({
    youtubeFullWatchReports,
    sourcePacketWorkerRuns,
  })
  const normalizedPool = list(poolItems.length ? poolItems : dailyWatch?.researchPool)
    .map(normalizePoolItem)
    .filter(item => item.targetKey === YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY || !item.targetKey)
  const reportBackedWatchedVideoIds = Array.from(sourceSopEvidence.byVideoId.keys()).map(text).filter(Boolean)
  const watchedSet = new Set([
    ...list(fullWatchedVideoIds),
    ...reportBackedWatchedVideoIds,
  ].map(text).filter(Boolean))
  const rows = creators.map(creator => buildCreatorRow({
    creator,
    poolRows: normalizedPool,
    fullWatchedVideoIds: watchedSet,
    grade: gradeMap.get(text(creator.creatorId)) || null,
    sourceSopEvidence,
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
      fullWatchReportCount: sourceSopEvidence.summary.reportCount,
      sourceSopEvidenceVideoCount: sourceSopEvidence.summary.videoEvidenceCount,
      fullPageEvidenceCount: sourceSopEvidence.summary.fullPageEvidenceCount,
      resourceDispositionEvidenceCount: sourceSopEvidence.summary.resourceDispositionEvidenceCount,
      sourcePacketWorkerRunCount: sourceSopEvidence.summary.sourcePacketWorkerRunCount,
      sourcePacketActionCount: sourceSopEvidence.summary.sourcePacketActionCount,
      sourcePacketValidationFailureCount: sourceSopEvidence.summary.sourcePacketValidationFailureCount,
      runnablePublicSourcePacketCount: sourceSopEvidence.summary.runnablePublicSourcePacketCount,
      publicWebPacketCount: sourceSopEvidence.summary.publicWebPacketCount,
      freeCommunityPacketCount: sourceSopEvidence.summary.freeCommunityPacketCount,
      paidGatePacketCount: sourceSopEvidence.summary.paidGatePacketCount,
      purchaseCandidatePacketCount: sourceSopEvidence.summary.purchaseCandidatePacketCount,
      invalidSourcePacketLinkCount: sourceSopEvidence.summary.invalidSourcePacketLinkCount,
      rejectedNoisePacketCount: sourceSopEvidence.summary.rejectedNoisePacketCount,
    },
    sourcePacketReviewQueue: sourceSopEvidence.sourcePacketReviewQueue,
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
    { external_id: 's-member', target_key: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY, source_id: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID, metadata: { creatorId: 's-builder', creator: 'S Builder', videoId: 's-member', title: 'Private AIOS Notes Members only', rank: 4, publicNoAuth: true, privateOrPaidAccess: false } },
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
    { name: 'member_only_metadata_does_not_enter_public_standard_backlog', ok: !sBuilder?.nextWatchCandidates.some(video => video.videoId === 's-member') },
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
