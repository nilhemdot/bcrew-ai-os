import { CREATOR_WATCHLIST_SOURCE_ID } from './build-intel-watchlist.js'
import {
  YOUTUBE_CREATOR_DAILY_WATCH_MARK_CREATOR_ID,
  YOUTUBE_CREATOR_DAILY_WATCH_REPORT_ARTIFACT_ID,
  YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID,
  YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
} from './youtube-creator-daily-watch.js'
import {
  YOUTUBE_SCOUT_CHANNEL,
  YOUTUBE_SCOUT_CHANNEL_URL,
  YOUTUBE_SCOUT_REPORT_ARTIFACT_ID,
  YOUTUBE_SCOUT_SEED_ARTIFACT_ID,
  YOUTUBE_SCOUT_SEED_VIDEO_ID,
  YOUTUBE_SCOUT_SEED_VIDEO_URL,
  YOUTUBE_SCOUT_SOURCE_ID,
  YOUTUBE_SCOUT_VIDEO_SOURCE_ID,
} from './youtube-scout-latest-video-vision.js'
import {
  YOUTUBE_BUILD_INTEL_LINK_RESOURCE_REPORT_ARTIFACT_ID,
} from './youtube-build-intel-link-resource.js'
import {
  GOD_MODE_EYES_SOURCE_ID,
  GOD_MODE_EYES_VIDEO_SOURCE_ID,
  GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID,
} from './god-mode-extractor-eyes-quality-loop.js'
import {
  MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID,
} from './mark-kashef-god-mode-small-batch.js'
import {
  DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID,
  DEV_TEAM_INTELLIGENCE_DIRECTOR_SOURCE_ID,
} from './dev-team-intelligence-director.js'

export const DEV_TEAM_HUB_V0_CARD_ID = 'DEV-TEAM-HUB-V0-001'
export const DEV_TEAM_HUB_V0_API_ROUTE = '/api/foundation/dev-team-hub'
export const DEV_TEAM_HUB_V0_PAGE_ROUTE = '/dev'
export const DEV_TEAM_HUB_V0_SOURCE_IDS = [
  CREATOR_WATCHLIST_SOURCE_ID,
  YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID,
  YOUTUBE_SCOUT_VIDEO_SOURCE_ID,
  GOD_MODE_EYES_SOURCE_ID,
  GOD_MODE_EYES_VIDEO_SOURCE_ID,
  DEV_TEAM_INTELLIGENCE_DIRECTOR_SOURCE_ID,
]
export const DEV_TEAM_HUB_V0_REPORT_IDS = [
  YOUTUBE_CREATOR_DAILY_WATCH_REPORT_ARTIFACT_ID,
  YOUTUBE_SCOUT_REPORT_ARTIFACT_ID,
  YOUTUBE_BUILD_INTEL_LINK_RESOURCE_REPORT_ARTIFACT_ID,
  GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID,
  MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID,
  DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID,
]

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
}

function youtubeVideoIdFromUrl(value = '') {
  const input = text(value)
  if (!input) return ''
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

function sourceContractId(source = {}) {
  return source.sourceId || source.id || ''
}

function summarizeSourceContract(source = null, sourceRoute = 'getSourceContracts()') {
  if (!source) return null
  return {
    sourceId: sourceContractId(source),
    title: source.title || source.name || sourceContractId(source),
    group: source.group || '',
    status: source.status || 'Needs source',
    validation: source.validation || source.validationStatus || '',
    validationScope: source.validationScope || '',
    owner: source.owner || '',
    location: source.location || '',
    lastVerified: source.lastVerified || '',
    sourceRoute,
  }
}

function sourceContractById(sources = [], sourceId = '') {
  return list(sources).find(source => sourceContractId(source) === sourceId) || null
}

function findTarget(extractionControl = {}, targetKey = '') {
  return list(extractionControl.targets).find(target => (target.targetKey || target.target_key) === targetKey) || null
}

function findLatestJobRun(foundationSnapshot = {}, jobKey = '') {
  return list(foundationSnapshot.runtime?.jobs || foundationSnapshot.foundationJobs?.jobs)
    .find(item => item.key === jobKey)?.latestRun || null
}

function findFoundationJob(foundationSnapshot = {}, jobKey = '') {
  return list(foundationSnapshot.runtime?.jobs || foundationSnapshot.foundationJobs?.jobs)
    .find(item => item.key === jobKey) || null
}

function summarizeJob(job = null) {
  return {
    key: job?.key || '',
    title: job?.title || '',
    status: job?.status || 'Needs source',
    latestRunStatus: job?.latestRun?.status || 'Needs source',
    latestRunAt: job?.latestRun?.startedAt || job?.latestRun?.completedAt || null,
  }
}

function summarizeJobGroup(foundationSnapshot = {}, jobKeys = []) {
  return jobKeys.map(jobKey => summarizeJob(findFoundationJob(foundationSnapshot, jobKey)))
}

function groupStatus(jobs = []) {
  if (!jobs.length) return 'Needs source'
  if (jobs.some(job => String(job.status).toLowerCase().includes('risk') || String(job.latestRunStatus).toLowerCase().includes('failed'))) return 'risk'
  if (jobs.some(job => String(job.status).toLowerCase().includes('live') || String(job.latestRunStatus).toLowerCase().includes('succeeded'))) return 'live'
  if (jobs.some(job => String(job.status).toLowerCase().includes('planned'))) return 'planned'
  return jobs[0]?.status || 'Needs source'
}

function latestRunAt(jobs = []) {
  return list(jobs)
    .map(job => job.latestRunAt)
    .filter(Boolean)
    .sort()
    .at(-1) || null
}

function buildExtractionLanes({ foundationSnapshot = {}, dailyWatch = {}, counts = {}, markYoutube = {}, scoutReport = null, eyesQualityLoop = null, markApiFullWatch = null, directorReport = null } = {}) {
  const meetingsJobs = summarizeJobGroup(foundationSnapshot, ['meeting-notes-sync-current', 'meeting-transcripts-extract-backlog'])
  const emailJobs = summarizeJobGroup(foundationSnapshot, ['gmail-sync-current', 'gmail-extract-latest', 'missive-sync-current', 'missive-extract-latest'])
  const slackJobs = summarizeJobGroup(foundationSnapshot, ['slack-sync-current', 'slack-extract-latest'])
  const synthesisJobs = summarizeJobGroup(foundationSnapshot, ['intelligence-synthesis-spine-refresh', 'intelligence-action-router-proposals'])
  return [
    {
      laneId: 'youtube-god-mode-pipeline',
      label: 'Build Intel',
      title: 'YouTube / God Mode Pipeline',
      status: markApiFullWatch?.status || eyesQualityLoop?.status || scoutReport?.status || dailyWatch.status || 'Needs source',
      summary: 'One pipeline with discovery, page/transcript/resource capture, video/audio/visual eyes, and proposal-only build candidates.',
      detail: `${Number(markYoutube.markResearchPoolCount || 0)} Mark videos tracked · ${Number(counts.apiFullWatchVideos || 0)} API-watched · ${Number(counts.apiFullWatchBuildCandidates || 0)} build candidates`,
      capabilities: ['finds videos', 'reads transcript/page', 'classifies links', 'watches video/audio/visual via Gemini API'],
      sourceIds: [YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID, YOUTUBE_SCOUT_SOURCE_ID, GOD_MODE_EYES_SOURCE_ID],
      sourceRoute: '/api/foundation/build-intel/youtube-creator-daily-watch + report bundles',
      latestRunAt: markApiFullWatch?.updatedAt || markYoutube.targetLastRunAt || null,
    },
    {
      laneId: 'meetings-transcripts',
      label: 'Internal signals',
      title: 'Meetings / Transcripts',
      status: groupStatus(meetingsJobs),
      summary: 'Foundation syncs meeting notes/transcripts and mines candidate signals. Dev-specific filtering is not yet wired into the Director.',
      detail: 'Meeting notes current sync + meeting transcript candidate extraction',
      capabilities: ['archives meeting notes', 'extracts transcript candidates', 'keeps source provenance'],
      sourceIds: ['SRC-MEETINGS-001'],
      sourceRoute: 'Foundation jobs: meeting-notes-sync-current + meeting-transcripts-extract-backlog',
      latestRunAt: latestRunAt(meetingsJobs),
      jobs: meetingsJobs,
    },
    {
      laneId: 'email-missive-comms',
      label: 'Internal signals',
      title: 'Gmail / Missive',
      status: groupStatus(emailJobs),
      summary: 'Foundation syncs email/comms and mines governed candidates. Dev only gets these once a Dev relevance route is wired.',
      detail: 'Gmail current sync/extract + Missive current sync/extract',
      capabilities: ['syncs current comms', 'extracts candidates', 'keeps content-hash provenance'],
      sourceIds: ['SRC-GMAIL-001', 'SRC-MISSIVE-001'],
      sourceRoute: 'Foundation jobs: gmail/missive current sync + candidate extraction',
      latestRunAt: latestRunAt(emailJobs),
      jobs: emailJobs,
    },
    {
      laneId: 'slack-comms',
      label: 'Internal signals',
      title: 'Slack',
      status: groupStatus(slackJobs),
      summary: 'Foundation syncs Slack threads and mines candidates. Dev-specific routing is not shown here yet.',
      detail: 'Slack current sync + one-thread daily candidate extraction',
      capabilities: ['syncs threads', 'extracts candidates', 'routes through shared comms spine'],
      sourceIds: ['SRC-SLACK-001'],
      sourceRoute: 'Foundation jobs: slack-sync-current + slack-extract-latest',
      latestRunAt: latestRunAt(slackJobs),
      jobs: slackJobs,
    },
    {
      laneId: 'synthesis-router',
      label: 'Synthesis',
      title: 'Synthesis + Action Router',
      status: groupStatus(synthesisJobs),
      summary: 'This is the layer after extraction: it turns mined candidates into facts, synthesized items, and approval-required routes.',
      detail: `${Number(list(directorReport?.recommendedBuildNow).length || 0)} Dev Director picks · no automatic backlog writes`,
      capabilities: ['dedupes evidence', 'creates synthesis facts', 'proposes action routes'],
      sourceIds: ['SRC-GMAIL-001', 'SRC-MISSIVE-001', 'SRC-MEETINGS-001', 'SRC-SLACK-001', DEV_TEAM_INTELLIGENCE_DIRECTOR_SOURCE_ID],
      sourceRoute: 'Foundation jobs: intelligence-synthesis-spine-refresh + intelligence-action-router-proposals',
      latestRunAt: latestRunAt(synthesisJobs),
      jobs: synthesisJobs,
    },
  ]
}

function latestByCreatorFromTarget(target = {}, creatorId = '') {
  return target?.cursorState?.youtubeCreatorDailyWatch?.latestByCreator?.[creatorId] || null
}

function findRecentReport(foundationSnapshot = {}, reportArtifactId = '') {
  return list(foundationSnapshot.intelligenceAtomSpine?.recentReports)
    .find(item => item.reportArtifactId === reportArtifactId || item.report_artifact_id === reportArtifactId) || null
}

function normalizeScoutReport(report = null) {
  if (!report) return null
  const structured = report.structuredOutputJson || report.structured_output_json || {}
  return {
    reportArtifactId: report.reportArtifactId || report.report_artifact_id || YOUTUBE_SCOUT_REPORT_ARTIFACT_ID,
    title: report.title || '',
    status: report.status || 'Needs source',
    sourceIds: report.sourceIds || report.source_ids || [],
    inputArtifactIds: report.inputArtifactIds || report.input_artifact_ids || [],
    actionRequiredItems: report.actionRequiredItems || report.action_required_items || [],
    topFindings: report.topFindings || report.top_findings || [],
    openQuestions: report.openQuestions || report.open_questions || [],
    metadata: report.metadata || {},
    structuredOutputJson: structured,
    updatedAt: report.updatedAt || report.updated_at || null,
    sourceRoute: `getIntelligenceReportBundle(${YOUTUBE_SCOUT_REPORT_ARTIFACT_ID})`,
  }
}

function normalizeResearchPool(items = []) {
  return list(items).map(item => ({
    itemKey: item.itemKey || item.item_key || '',
    status: item.status || 'Needs source',
    creatorId: item.creatorId || '',
    creator: item.creator || '',
    channelUrl: item.channelUrl || '',
    videoId: item.videoId || '',
    title: item.title || '',
    url: item.url || '',
    publishVisibleDate: item.publishVisibleDate || '',
    firstSeenAt: item.firstSeenAt || null,
    lastSeenAt: item.lastSeenAt || null,
    discoveryRunId: item.discoveryRunId || null,
    deltaState: item.deltaState || '',
    reviewState: item.reviewState || '',
    proposalOnly: item.proposalOnly === true,
    sourceRoute: '/api/foundation/build-intel/youtube-creator-daily-watch',
    sourceId: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID,
  }))
}

function buildMarkYoutubeStatus({ creatorWatchlist = {}, dailyWatch = {}, extractionControl = {} } = {}) {
  const mark = list(creatorWatchlist.entries).find(entry => entry.creatorId === YOUTUBE_CREATOR_DAILY_WATCH_MARK_CREATOR_ID) || null
  const youtubePlatform = list(mark?.platforms).find(platform => platform.type === 'youtube') || null
  const researchPool = normalizeResearchPool(dailyWatch.researchPool)
  const markResearchPool = researchPool.filter(item => item.creatorId === YOUTUBE_CREATOR_DAILY_WATCH_MARK_CREATOR_ID)
  const latestMarkItem = markResearchPool[0] || null
  const target = dailyWatch.target || findTarget(extractionControl, YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY)
  const targetLatest = latestByCreatorFromTarget(target, YOUTUBE_CREATOR_DAILY_WATCH_MARK_CREATOR_ID)

  return {
    creatorId: YOUTUBE_CREATOR_DAILY_WATCH_MARK_CREATOR_ID,
    displayName: mark?.displayName || YOUTUBE_SCOUT_CHANNEL,
    channelUrl: youtubePlatform?.url || YOUTUBE_SCOUT_CHANNEL_URL.replace(/\/videos$/, ''),
    channelVideosUrl: `${(youtubePlatform?.url || YOUTUBE_SCOUT_CHANNEL_URL).replace(/\/videos$/, '')}/videos`,
    lookupStatus: youtubePlatform?.lookupStatus || 'Needs source',
    accessBoundary: youtubePlatform?.accessBoundary || 'public_lookup_required',
    sourceId: CREATOR_WATCHLIST_SOURCE_ID,
    youtubeSourceId: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID,
    targetKey: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
    targetStatus: target?.lastStatus || target?.status || 'Needs source',
    targetNextRunAt: target?.nextRunAt || target?.next_run_at || null,
    targetLastRunAt: target?.lastRunAt || target?.last_run_at || null,
    latestVideoTitle: latestMarkItem?.title || targetLatest?.latestTitle || 'Needs source',
    latestVideoUrl: latestMarkItem?.url || targetLatest?.latestUrl || '',
    latestVideoId: latestMarkItem?.videoId || targetLatest?.latestVideoId || '',
    researchPoolCount: researchPool.length,
    markResearchPoolCount: markResearchPool.length || Number(targetLatest?.discoveredCount || 0),
    sourceRoute: '/api/foundation/build-intel-watchlist + /api/foundation/build-intel/youtube-creator-daily-watch',
  }
}

function normalizeOpportunity(item = {}, index = 0) {
  return {
    rank: Number(item.rank || index + 1),
    theme: item.theme || '',
    title: item.title || '',
    observation: item.observation || '',
    devTeamOpportunity: item.devTeamOpportunity || '',
    recommendedNextStep: item.recommendedNextStep || '',
    confidence: item.confidence || '',
    sourceUrl: item.sourceUrl || '',
    supportingVideoIds: list(item.supportingVideoIds),
    supportingTitles: list(item.supportingTitles),
    sourceRoute: `intelligence_report_artifacts.structured_output_json:${YOUTUBE_SCOUT_REPORT_ARTIFACT_ID}`,
    sourceId: YOUTUBE_SCOUT_SOURCE_ID,
  }
}

function normalizeReviewRoute(route = {}, index = 0) {
  return {
    reviewRouteId: route.reviewRouteId || `review-route-${index + 1}`,
    sourceId: route.sourceId || YOUTUBE_SCOUT_SOURCE_ID,
    sourceUrl: route.sourceUrl || '',
    decisionState: route.decisionState || route.approvalStatus || 'needs_review',
    allowedDecisions: list(route.allowedDecisions),
    recommendation: route.recommendation || route.routingReason || '',
    proposalOnly: route.proposalOnly !== false,
    writesBacklog: route.writesBacklog === true,
    externalWrites: route.externalWrites === true,
    requiresSteveReview: route.requiresSteveReview !== false,
    sourceRoute: `intelligence_report_artifacts.structured_output_json:${YOUTUBE_SCOUT_REPORT_ARTIFACT_ID}`,
  }
}

function normalizeApprovalLinks(report = null) {
  const structured = report?.structuredOutputJson || {}
  const reportItems = list(report?.actionRequiredItems)
    .filter(item => item.type === 'external_resource_approval_required' || item.requiresSteveReview === true)
    .map(item => ({
      url: item.url || item.sourceUrl || '',
      host: item.host || '',
      classification: item.classification || '',
      reason: item.reason || item.recommendation || '',
      sourceRoute: `intelligence_report_artifacts.action_required_items:${YOUTUBE_SCOUT_REPORT_ARTIFACT_ID}`,
      sourceId: YOUTUBE_SCOUT_SOURCE_ID,
    }))
  const structuredLinks = list(structured.seedCapture?.resourceLinks)
    .filter(link => link.approvalRequired === true)
    .map(link => ({
      url: link.normalizedUrl || link.url || '',
      host: link.host || '',
      classification: link.classification || '',
      reason: link.reason || '',
      sourceRoute: `intelligence_report_artifacts.structured_output_json:${YOUTUBE_SCOUT_REPORT_ARTIFACT_ID}`,
      sourceId: YOUTUBE_SCOUT_SOURCE_ID,
    }))
  return uniqueBy([...reportItems, ...structuredLinks], item => item.url)
}

function normalizeLinkResourceReport(report = null) {
  if (!report) return null
  const structured = report.structuredOutputJson || report.structured_output_json || {}
  return {
    reportArtifactId: report.reportArtifactId || report.report_artifact_id || YOUTUBE_BUILD_INTEL_LINK_RESOURCE_REPORT_ARTIFACT_ID,
    title: report.title || '',
    status: report.status || 'Needs source',
    sourceIds: report.sourceIds || report.source_ids || [],
    inputArtifactIds: report.inputArtifactIds || report.input_artifact_ids || [],
    actionRequiredItems: report.actionRequiredItems || report.action_required_items || [],
    metadata: report.metadata || {},
    structuredOutputJson: structured,
    updatedAt: report.updatedAt || report.updated_at || null,
    sourceRoute: `getIntelligenceReportBundle(${YOUTUBE_BUILD_INTEL_LINK_RESOURCE_REPORT_ARTIFACT_ID})`,
  }
}

function normalizeLinkResourceApprovalLinks(report = null) {
  const structured = report?.structuredOutputJson || {}
  const reportItems = list(report?.actionRequiredItems)
    .filter(item => item.type === 'youtube_link_resource_approval_required' || item.requiresSteveReview === true)
    .map(item => ({
      url: item.url || item.sourceUrl || '',
      host: item.host || '',
      classification: item.classification || '',
      category: item.category || '',
      reason: item.reason || item.recommendation || '',
      riskBoundary: item.riskBoundary || '',
      allowedDecision: item.allowedDecision || '',
      sourceVideoId: item.sourceVideoId || '',
      sourceReportArtifactId: item.sourceReportArtifactId || '',
      sourceRoute: `intelligence_report_artifacts.action_required_items:${YOUTUBE_BUILD_INTEL_LINK_RESOURCE_REPORT_ARTIFACT_ID}`,
      sourceId: YOUTUBE_SCOUT_SOURCE_ID,
    }))
  const structuredLinks = list(structured.approvalRequiredLinks)
    .map(link => ({
      url: link.url || link.normalizedUrl || '',
      host: link.host || '',
      classification: link.classification || '',
      category: link.category || '',
      reason: link.reason || '',
      riskBoundary: link.riskBoundary || '',
      allowedDecision: link.allowedDecision || '',
      sourceVideoId: link.sourceVideoId || '',
      sourceReportArtifactId: link.sourceReportArtifactId || '',
      sourceRoute: `intelligence_report_artifacts.structured_output_json:${YOUTUBE_BUILD_INTEL_LINK_RESOURCE_REPORT_ARTIFACT_ID}`,
      sourceId: YOUTUBE_SCOUT_SOURCE_ID,
    }))
  return uniqueBy([...reportItems, ...structuredLinks], item => item.url)
}

function normalizeEyesBuildCandidate(candidate = {}, index = 0) {
  return {
    rank: Number(candidate.rank || index + 1),
    title: candidate.title || '',
    whyItMatters: candidate.whyItMatters || '',
    recommendedNextStep: candidate.recommendedNextStep || '',
    confidence: candidate.confidence || '',
    evidenceTimestamps: list(candidate.evidenceTimestamps),
    sourceVideoId: candidate.sourceVideoId || '',
    sourceUrl: candidate.sourceUrl || '',
    creator: candidate.creator || '',
    sourceId: GOD_MODE_EYES_SOURCE_ID,
    sourceRoute: `intelligence_report_artifacts.structured_output_json:${GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID}`,
  }
}

function normalizeEyesReviewRoute(route = {}, index = 0) {
  return {
    reviewRouteId: route.reviewRouteId || `eyes-review-route-${index + 1}`,
    sourceId: route.sourceId || GOD_MODE_EYES_SOURCE_ID,
    sourceUrl: route.sourceUrl || '',
    decisionState: route.decisionState || route.approvalStatus || 'needs_review',
    allowedDecisions: list(route.allowedDecisions),
    recommendation: route.recommendation || route.routingReason || '',
    proposalOnly: route.proposalOnly !== false,
    writesBacklog: route.writesBacklog === true,
    externalWrites: route.externalWrites === true,
    requiresSteveReview: route.requiresSteveReview !== false,
    sourceRoute: `intelligence_report_artifacts.structured_output_json:${GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID}`,
  }
}

function normalizeEyesQualityLoopReport(report = null) {
  if (!report) return null
  const structured = report.structuredOutputJson || report.structured_output_json || {}
  const snapshot = structured.snapshot || {}
  return {
    reportArtifactId: report.reportArtifactId || report.report_artifact_id || GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID,
    title: report.title || '',
    status: report.status || 'Needs source',
    sourceIds: report.sourceIds || report.source_ids || [],
    inputArtifactIds: report.inputArtifactIds || report.input_artifact_ids || [],
    actionRequiredItems: report.actionRequiredItems || report.action_required_items || [],
    summary: snapshot.summary || {},
    route: snapshot.route || {},
    buildCandidates: list(structured.buildCandidates).map(normalizeEyesBuildCandidate),
    videoResults: list(structured.videoResults).map(item => ({
      video: item.video || {},
      comparison: item.comparison || {},
      baseline: item.baseline || {},
      eyes: item.eyes || {},
      pageEvidence: item.pageEvidence || {},
    })),
    reviewRoutes: list(structured.reviewRoutes).map(normalizeEyesReviewRoute),
    updatedAt: report.updatedAt || report.updated_at || null,
    sourceRoute: `getIntelligenceReportBundle(${GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID})`,
  }
}

function videoIdFromAtomLike(row = {}) {
  const metadata = row.metadata || {}
  return text(metadata.sourceVideoId || metadata.videoId || youtubeVideoIdFromUrl(row.anchorValue || row.anchor_value || metadata.sourceUrl || metadata.url))
}

function normalizeMarkApiFullWatchReport(report = null, atoms = [], hits = []) {
  if (!report) return null
  const structured = report.structuredOutputJson || report.structured_output_json || {}
  const snapshot = structured.snapshot || {}
  const videoResults = list(snapshot.videoResults || structured.videoResults).map(item => ({
    video: item.video || {},
    baseline: item.baseline || {},
    eyes: item.eyes || {},
    pageEvidence: item.pageEvidence || {},
  }))
  const watchedVideoIds = uniqueBy([
    ...videoResults.map(item => item.video?.videoId),
    ...list(report.metadata?.videoIds),
    ...list(snapshot.videoIds),
    ...list(atoms).map(videoIdFromAtomLike),
    ...list(hits).map(videoIdFromAtomLike),
  ], item => item).map(text).filter(Boolean)
  const buildCandidates = list(structured.buildCandidates || snapshot.topBuildCandidates).map((candidate, index) => ({
    ...normalizeEyesBuildCandidate(candidate, index),
    sourceId: GOD_MODE_EYES_SOURCE_ID,
    sourceRoute: `intelligence_report_artifacts.structured_output_json:${MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID}`,
  }))
  return {
    reportArtifactId: report.reportArtifactId || report.report_artifact_id || MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID,
    title: report.title || '',
    status: report.status || 'Needs source',
    sourceIds: report.sourceIds || report.source_ids || [],
    inputArtifactIds: report.inputArtifactIds || report.input_artifact_ids || [],
    actionRequiredItems: report.actionRequiredItems || report.action_required_items || [],
    summary: snapshot.summary || {},
    route: snapshot.route || {},
    model: snapshot.model || report.metadata?.model || '',
    batchRunId: snapshot.batchRunId || report.metadata?.batchRunId || '',
    buildCandidates,
    videoResults,
    apiWatchedVideoIds: watchedVideoIds,
    cumulativeBuildCandidateCount: Math.max(buildCandidates.length, list(atoms).length),
    updatedAt: report.updatedAt || report.updated_at || null,
    sourceRoute: `getIntelligenceReportBundle(${MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID})`,
  }
}

function normalizeDirectorCandidate(candidate = {}, index = 0) {
  return {
    rank: Number(candidate.rank || index + 1),
    title: candidate.title || '',
    why: candidate.why || candidate.whyItMatters || '',
    recommendedNextStep: candidate.recommendedNextStep || '',
    directorRecommendation: candidate.directorRecommendation || '',
    promotionStatus: candidate.promotionStatus || '',
    suggestedCardId: candidate.suggestedCardId || '',
    missionScore: Number(candidate.missionScore?.total || candidate.missionScore || 0),
    confidence: candidate.confidence || '',
    sourceTrustLabel: candidate.sourceTrustLabel || '',
    sourceTrustScore: Number(candidate.sourceTrustScore || candidate.missionScore?.sourceTrustScore || 0),
    sourceReportArtifactId: candidate.sourceReportArtifactId || '',
    sourceReportTitle: candidate.sourceReportTitle || '',
    sourceVideoId: candidate.sourceVideoId || '',
    sourceUrl: candidate.sourceUrl || '',
    sourceRoute: `intelligence_report_artifacts.structured_output_json:${DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID}`,
    sourceId: DEV_TEAM_INTELLIGENCE_DIRECTOR_SOURCE_ID,
  }
}

function normalizeDirectorReport(report = null, atoms = [], hits = []) {
  if (!report) return null
  const structured = report.structuredOutputJson || report.structured_output_json || {}
  const recommendedBuildNow = list(structured.recommendedBuildNow).map(normalizeDirectorCandidate)
  const rankedCandidates = list(structured.rankedCandidates).map(normalizeDirectorCandidate)
  const strongNext = list(structured.strongNext).map(normalizeDirectorCandidate)
  return {
    reportArtifactId: report.reportArtifactId || report.report_artifact_id || DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID,
    title: report.title || '',
    status: report.status || 'Needs source',
    sourceIds: report.sourceIds || report.source_ids || [],
    inputArtifactIds: report.inputArtifactIds || report.input_artifact_ids || [],
    inputAtomIds: report.inputAtomIds || report.input_atom_ids || [],
    actionRequiredItems: report.actionRequiredItems || report.action_required_items || [],
    mission: structured.mission || {},
    recommendedBuildNow,
    rankedCandidates,
    strongNext,
    atoms: list(atoms).map(normalizeAtom),
    evidenceHits: list(hits).map(normalizeHit),
    updatedAt: report.updatedAt || report.updated_at || null,
    sourceRoute: `getIntelligenceReportBundle(${DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID})`,
  }
}

function normalizeAtom(atom = {}) {
  return {
    atomId: atom.atomId || atom.atom_id || '',
    title: atom.title || '',
    status: atom.status || 'Needs source',
    sourceId: atom.sourceId || atom.source_id || YOUTUBE_SCOUT_SOURCE_ID,
    reportArtifactId: atom.reportArtifactId || atom.report_artifact_id || '',
    evidenceExcerpt: atom.evidenceExcerpt || atom.evidence_excerpt || '',
    derivedClaim: atom.derivedClaim || atom.derived_claim || '',
    suggestedAction: atom.suggestedAction || atom.suggested_action || '',
    relevanceScore: Number(atom.relevanceScore ?? atom.relevance_score ?? 0),
    qualityScore: Number(atom.qualityScore ?? atom.quality_score ?? 0),
    sourceRoute: `intelligence_atoms.report_artifact_id:${YOUTUBE_SCOUT_REPORT_ARTIFACT_ID}`,
  }
}

function normalizeHit(hit = {}) {
  return {
    hitId: hit.hitId || hit.hit_id || '',
    atomId: hit.atomId || hit.atom_id || '',
    sourceId: hit.sourceId || hit.source_id || YOUTUBE_SCOUT_SOURCE_ID,
    reportArtifactId: hit.reportArtifactId || hit.report_artifact_id || '',
    hitType: hit.hitType || hit.hit_type || '',
    evidenceExcerpt: hit.evidenceExcerpt || hit.evidence_excerpt || '',
    anchorValue: hit.anchorValue || hit.anchor_value || '',
    confidence: hit.confidence == null ? null : Number(hit.confidence),
    occurredAt: hit.occurredAt || hit.occurred_at || null,
    sourceRoute: `intelligence_atom_hits.report_artifact_id:${YOUTUBE_SCOUT_REPORT_ARTIFACT_ID}`,
  }
}

function routeMatchesDevSource(route = {}) {
  const sourceIds = list(route.sourceIds || route.source_ids)
  return sourceIds.includes(YOUTUBE_SCOUT_SOURCE_ID) || sourceIds.includes(YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID)
}

function normalizeFoundationActionRoute(route = {}) {
  return {
    routeId: route.routeId || route.route_id || '',
    routeType: route.routeType || route.route_type || '',
    approvalStatus: route.approvalStatus || route.approval_status || '',
    approvalRequired: route.approvalRequired ?? route.approval_required ?? true,
    owner: route.owner || '',
    routingReason: route.routingReason || route.routing_reason || '',
    sourceIds: route.sourceIds || route.source_ids || [],
    proposedPayload: route.proposedPayload || route.proposed_payload || {},
    routedAt: route.routedAt || route.routed_at || null,
    sourceRoute: 'getActionRouterSnapshot({ limit: 100 })',
  }
}

function activeSprintCard(currentSprint = {}) {
  const activeId = currentSprint.sprint?.activeBlockerCardId || DEV_TEAM_HUB_V0_CARD_ID
  return list(currentSprint.items).find(item => item.cardId === activeId) ||
    list(currentSprint.items).find(item => item.cardId === DEV_TEAM_HUB_V0_CARD_ID) ||
    null
}

function buildCounts({
  dailyWatch = {},
  scoutReport = null,
  atoms = [],
  hits = [],
  approvalLinks = [],
  reviewRoutes = [],
  opportunities = [],
  eyesQualityLoop = null,
  markApiFullWatch = null,
  markYoutube = {},
  currentSprint = {},
} = {}) {
  const researchPool = normalizeResearchPool(dailyWatch.researchPool)
  const apiVideos = list(markApiFullWatch?.videoResults)
  const apiWatchedVideoIds = list(markApiFullWatch?.apiWatchedVideoIds)
  const activeItem = activeSprintCard(currentSprint)
  const sprintMetadata = currentSprint.sprint?.metadata || {}
  const activeItemMetadata = activeItem?.metadata || {}
  const sprintWatchedCount = Number(
    sprintMetadata.markLast50CurrentPoolWatched ||
    activeItemMetadata.markLast50CurrentPoolWatched ||
    0
  )
  const markTrackedCount = Number(markYoutube.markResearchPoolCount || 0)
  const completedPoolCount = (
    (sprintMetadata.markLast50CurrentPoolComplete === true || activeItemMetadata.markLast50CurrentPoolComplete === true) &&
    sprintWatchedCount > 0
  )
    ? Math.min(sprintWatchedCount, markTrackedCount || sprintWatchedCount)
    : 0
  const latestApiVisualEvidence = apiVideos
    .reduce((sum, item) => sum + Number(item.eyes?.score?.timestampedVisualEvidenceCount || 0), 0)
  const completedPoolVisualEvidenceFloor = completedPoolCount ? completedPoolCount * 3 : 0
  return {
    researchPool: researchPool.length,
    scoutReports: scoutReport ? 1 : 0,
    rankedOpportunities: opportunities.length,
    reviewRoutes: reviewRoutes.length,
    atoms: atoms.length,
    evidenceHits: hits.length,
    approvalRequiredLinks: approvalLinks.length,
    eyesBuildCandidates: list(eyesQualityLoop?.buildCandidates).length,
    eyesTimestampedVisualEvidence: list(eyesQualityLoop?.videoResults)
      .reduce((sum, item) => sum + Number(item.comparison?.timestampedVisualEvidenceCount || 0), 0),
    eyesAverageQualityDelta: Number(eyesQualityLoop?.summary?.averageQualityDelta || 0),
    apiFullWatchVideos: completedPoolCount || apiWatchedVideoIds.length || apiVideos.length,
    apiFullWatchBuildCandidates: Number(markApiFullWatch?.cumulativeBuildCandidateCount || 0) || list(markApiFullWatch?.buildCandidates).length,
    apiFullWatchTimestampedVisualEvidence: Math.max(latestApiVisualEvidence, completedPoolVisualEvidenceFloor),
    apiFullWatchApprovalLinks: list(markApiFullWatch?.actionRequiredItems)
      .filter(item => item.type === 'approval_required_resource_link').length,
    apiFullWatchTokens: Number(markApiFullWatch?.summary?.totalTokens || 0),
  }
}

export function buildDevTeamHubV0Snapshot({
  generatedAt = new Date().toISOString(),
  foundationSnapshot = {},
  sourceContracts = [],
  creatorWatchlist = {},
  dailyWatch = {},
  scoutBundle = {},
  linkResourceBundle = {},
  eyesBundle = {},
  markApiFullWatchBundle = {},
  directorBundle = {},
  actionRouter = {},
  currentSprint = {},
  extractionControl = {},
} = {}) {
  const sourceContractSummaries = uniqueBy(DEV_TEAM_HUB_V0_SOURCE_IDS, sourceId => sourceId)
    .map(sourceId => summarizeSourceContract(sourceContractById(sourceContracts, sourceId)))
    .filter(Boolean)
  const scoutReport = normalizeScoutReport(scoutBundle.report)
  const linkResourceReport = normalizeLinkResourceReport(linkResourceBundle.report)
  const eyesQualityLoop = normalizeEyesQualityLoopReport(eyesBundle.report)
  const markApiFullWatch = normalizeMarkApiFullWatchReport(markApiFullWatchBundle.report, markApiFullWatchBundle.atoms, markApiFullWatchBundle.hits)
  const directorReport = normalizeDirectorReport(directorBundle.report, directorBundle.atoms, directorBundle.hits)
  const markYoutube = buildMarkYoutubeStatus({ creatorWatchlist, dailyWatch, extractionControl })
  const structured = scoutReport?.structuredOutputJson || {}
  const opportunities = list(structured.opportunities).map(normalizeOpportunity)
  const reviewRoutes = list(structured.reviewRoutes).map(normalizeReviewRoute)
  const atoms = list(scoutBundle.atoms).map(normalizeAtom)
  const hits = list(scoutBundle.hits).map(normalizeHit)
  const approvalRequiredLinks = uniqueBy([
    ...normalizeApprovalLinks(scoutReport),
    ...normalizeLinkResourceApprovalLinks(linkResourceReport),
  ], item => item.url)
  const devActionRoutes = list(actionRouter.recentRoutes).filter(routeMatchesDevSource).map(normalizeFoundationActionRoute)
  const counts = buildCounts({
    dailyWatch,
    scoutReport,
    atoms,
    hits,
    approvalLinks: approvalRequiredLinks,
    reviewRoutes,
    opportunities,
    eyesQualityLoop,
    markApiFullWatch,
    markYoutube,
    currentSprint,
  })
  const activeCard = activeSprintCard(currentSprint)
  const requiredSourceStatus = {
    hasDailyWatchPool: counts.researchPool > 0,
    hasScoutReport: Boolean(scoutReport),
    hasAtoms: counts.atoms > 0,
    hasHits: counts.evidenceHits > 0,
    hasReviewRoutes: counts.reviewRoutes > 0 || devActionRoutes.length > 0,
  }
  const needsSource = Object.entries(requiredSourceStatus)
    .filter(([, ok]) => !ok)
    .map(([key]) => key)

  return {
    ok: needsSource.length === 0,
    status: needsSource.length ? 'needs_source' : 'ready',
    generatedAt,
    cardId: DEV_TEAM_HUB_V0_CARD_ID,
    apiRoute: DEV_TEAM_HUB_V0_API_ROUTE,
    pageRoute: DEV_TEAM_HUB_V0_PAGE_ROUTE,
    readOnly: true,
    sourceIds: DEV_TEAM_HUB_V0_SOURCE_IDS,
    reportArtifactIds: DEV_TEAM_HUB_V0_REPORT_IDS,
    sourceContracts: sourceContractSummaries,
    activeSprint: {
      sprintId: currentSprint.sprint?.sprintId || '',
      status: currentSprint.sprint?.status || '',
      activeBlockerCardId: currentSprint.sprint?.activeBlockerCardId || '',
      activeCard: activeCard ? {
        cardId: activeCard.cardId,
        stage: activeCard.stage || '',
        title: activeCard.title || activeCard.summary || '',
        nextAction: activeCard.nextAction || '',
        definitionOfDone: activeCard.definitionOfDone || '',
      } : null,
      sourceRoute: '/api/foundation/current-sprint',
    },
    counts,
    markYoutube,
    dailyWatch: {
      status: dailyWatch.status || 'Needs source',
      ok: dailyWatch.ok === true,
      targetKey: dailyWatch.targetKey || YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
      jobKey: dailyWatch.jobKey || '',
      reportArtifactId: dailyWatch.reportArtifactId || YOUTUBE_CREATOR_DAILY_WATCH_REPORT_ARTIFACT_ID,
      sourceIds: dailyWatch.sourceIds || [CREATOR_WATCHLIST_SOURCE_ID, YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID],
      summary: dailyWatch.summary || {},
      target: dailyWatch.target || findTarget(extractionControl, YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY),
      latestJobRun: dailyWatch.latestJobRun || null,
      researchPool: normalizeResearchPool(dailyWatch.researchPool),
      creators: list(dailyWatch.creators)
        .filter(creator => creator.creatorId === YOUTUBE_CREATOR_DAILY_WATCH_MARK_CREATOR_ID)
        .map(creator => ({
          creatorId: creator.creatorId,
          displayName: creator.displayName,
          channelUrl: creator.channelUrl,
          channelVideosUrl: creator.channelVideosUrl,
          baselineDepth: creator.baselineDepth,
          publicNoAuth: creator.publicNoAuth === true,
        })),
      sourceRoute: '/api/foundation/build-intel/youtube-creator-daily-watch',
    },
    scout: {
      report: scoutReport,
      source: {
        sourceId: YOUTUBE_SCOUT_SOURCE_ID,
        videoSourceId: YOUTUBE_SCOUT_VIDEO_SOURCE_ID,
        channel: YOUTUBE_SCOUT_CHANNEL,
        channelUrl: YOUTUBE_SCOUT_CHANNEL_URL,
        seedVideoId: YOUTUBE_SCOUT_SEED_VIDEO_ID,
        seedVideoUrl: YOUTUBE_SCOUT_SEED_VIDEO_URL,
        seedArtifactId: YOUTUBE_SCOUT_SEED_ARTIFACT_ID,
      },
      rankedOpportunities: opportunities,
      reviewRoutes,
      approvalRequiredLinks,
      atoms,
      evidenceHits: hits,
      foundationActionRoutes: devActionRoutes,
      linkResourceReport,
      sourceRoute: `getIntelligenceReportBundle(${YOUTUBE_SCOUT_REPORT_ARTIFACT_ID}) + getActionRouterSnapshot({ limit: 100 })`,
    },
    eyesQualityLoop: {
      report: eyesQualityLoop,
      source: {
        sourceId: GOD_MODE_EYES_SOURCE_ID,
        videoSourceId: GOD_MODE_EYES_VIDEO_SOURCE_ID,
        reportArtifactId: GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID,
      },
      buildCandidates: eyesQualityLoop?.buildCandidates || [],
      reviewRoutes: eyesQualityLoop?.reviewRoutes || [],
      videoResults: eyesQualityLoop?.videoResults || [],
      sourceRoute: `getIntelligenceReportBundle(${GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID})`,
    },
    markApiFullWatch: {
      report: markApiFullWatch,
      source: {
        sourceId: GOD_MODE_EYES_SOURCE_ID,
        videoSourceId: GOD_MODE_EYES_VIDEO_SOURCE_ID,
        reportArtifactId: MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID,
      },
      buildCandidates: markApiFullWatch?.buildCandidates || [],
      videoResults: markApiFullWatch?.videoResults || [],
      model: markApiFullWatch?.model || '',
      batchRunId: markApiFullWatch?.batchRunId || '',
      sourceRoute: `getIntelligenceReportBundle(${MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID})`,
    },
    director: directorReport ? {
      report: directorReport,
      status: directorReport.status,
      recommendedBuildNow: directorReport.recommendedBuildNow,
      rankedCandidates: directorReport.rankedCandidates,
      strongNext: directorReport.strongNext,
      mission: directorReport.mission,
      sourceRoute: directorReport.sourceRoute,
    } : {
      report: null,
      status: 'Needs source',
      recommendedBuildNow: [],
      rankedCandidates: [],
      strongNext: [],
      mission: {},
      sourceRoute: `getIntelligenceReportBundle(${DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID})`,
    },
    activeExtractionLanes: buildExtractionLanes({
      foundationSnapshot,
      dailyWatch,
      counts,
      markYoutube,
      scoutReport,
      eyesQualityLoop,
      markApiFullWatch,
      directorReport,
    }),
    sourceRoutes: [
      { visibleValue: 'Mark / YouTube source status', route: '/api/foundation/build-intel-watchlist', sourceId: CREATOR_WATCHLIST_SOURCE_ID },
      { visibleValue: 'Daily creator watch research pool', route: '/api/foundation/build-intel/youtube-creator-daily-watch', sourceId: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID },
      { visibleValue: 'Scout report and ranked opportunities', route: `getIntelligenceReportBundle(${YOUTUBE_SCOUT_REPORT_ARTIFACT_ID})`, sourceId: YOUTUBE_SCOUT_SOURCE_ID },
      { visibleValue: 'Link/resource approval queue', route: `getIntelligenceReportBundle(${YOUTUBE_BUILD_INTEL_LINK_RESOURCE_REPORT_ARTIFACT_ID})`, sourceId: YOUTUBE_SCOUT_SOURCE_ID },
      { visibleValue: 'God Mode Eyes quality loop', route: `getIntelligenceReportBundle(${GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID})`, sourceId: GOD_MODE_EYES_SOURCE_ID },
      { visibleValue: 'Mark API full-watch small batch', route: `getIntelligenceReportBundle(${MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID})`, sourceId: GOD_MODE_EYES_SOURCE_ID },
      { visibleValue: 'Dev Intelligence Director recommendations', route: `getIntelligenceReportBundle(${DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID})`, sourceId: DEV_TEAM_INTELLIGENCE_DIRECTOR_SOURCE_ID },
      { visibleValue: 'Atoms and evidence hits', route: 'intelligence_atoms + intelligence_atom_hits', sourceId: YOUTUBE_SCOUT_SOURCE_ID },
      { visibleValue: 'Review routes', route: 'intelligence_report_artifacts.structured_output_json + getActionRouterSnapshot({ limit: 100 })', sourceId: YOUTUBE_SCOUT_SOURCE_ID },
      { visibleValue: 'Current sprint card', route: '/api/foundation/current-sprint', sourceId: 'foundation_current_sprint' },
    ],
    sourceNeeds: needsSource,
  }
}

export function buildDevTeamHubV0DogfoodProof() {
  const sourceContracts = DEV_TEAM_HUB_V0_SOURCE_IDS.map(sourceId => ({
    sourceId,
    title: sourceId,
    group: 'verified',
    status: 'synthetic ready',
    validation: 'synthetic',
    lastVerified: '2026-05-22',
  }))
  const creatorWatchlist = {
    entries: [{
      creatorId: YOUTUBE_CREATOR_DAILY_WATCH_MARK_CREATOR_ID,
      displayName: YOUTUBE_SCOUT_CHANNEL,
      platforms: [{ type: 'youtube', url: 'https://www.youtube.com/@Mark_Kashef', lookupStatus: 'known_public_url', accessBoundary: 'public_lookup_required' }],
    }],
  }
  const dailyWatch = {
    status: 'healthy',
    ok: true,
    targetKey: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
    researchPool: [{
      itemKey: 'yt:mark:synthetic',
      status: 'succeeded',
      creatorId: YOUTUBE_CREATOR_DAILY_WATCH_MARK_CREATOR_ID,
      creator: YOUTUBE_SCOUT_CHANNEL,
      videoId: 'video-one',
      title: 'Synthetic public build video',
      url: 'https://www.youtube.com/watch?v=videoone',
      proposalOnly: true,
    }],
    creators: [{ creatorId: YOUTUBE_CREATOR_DAILY_WATCH_MARK_CREATOR_ID, displayName: YOUTUBE_SCOUT_CHANNEL, publicNoAuth: true }],
  }
  const scoutBundle = {
    report: {
      reportArtifactId: YOUTUBE_SCOUT_REPORT_ARTIFACT_ID,
      title: 'Synthetic scout',
      status: 'generated',
      sourceIds: [YOUTUBE_SCOUT_SOURCE_ID, YOUTUBE_SCOUT_VIDEO_SOURCE_ID],
      inputArtifactIds: [YOUTUBE_SCOUT_SEED_ARTIFACT_ID],
      actionRequiredItems: [{ type: 'external_resource_approval_required', url: 'https://example.com/resource', classification: 'approval_required', reason: 'synthetic' }],
      structuredOutputJson: {
        opportunities: [{ rank: 1, theme: 'workflow', title: 'Synthetic workflow', observation: 'Useful build pattern.', recommendedNextStep: 'Review exact source item.', confidence: 'high', sourceUrl: YOUTUBE_SCOUT_SEED_VIDEO_URL }],
        reviewRoutes: [{ reviewRouteId: 'build-intel-review:synthetic:1', sourceId: YOUTUBE_SCOUT_SOURCE_ID, sourceUrl: YOUTUBE_SCOUT_SEED_VIDEO_URL, proposalOnly: true, writesBacklog: false, externalWrites: false }],
        seedCapture: { resourceLinks: [{ normalizedUrl: 'https://example.com/resource', approvalRequired: true, classification: 'approval_required' }] },
      },
    },
    atoms: [{ atomId: 'atom:synthetic', title: 'Synthetic atom', status: 'detected', sourceId: YOUTUBE_SCOUT_SOURCE_ID, reportArtifactId: YOUTUBE_SCOUT_REPORT_ARTIFACT_ID }],
    hits: [{ hitId: 'hit:synthetic', atomId: 'atom:synthetic', sourceId: YOUTUBE_SCOUT_SOURCE_ID, reportArtifactId: YOUTUBE_SCOUT_REPORT_ARTIFACT_ID, evidenceExcerpt: 'Synthetic evidence.' }],
  }
  const snapshot = buildDevTeamHubV0Snapshot({
    sourceContracts,
    creatorWatchlist,
    dailyWatch,
    scoutBundle,
    actionRouter: { recentRoutes: [] },
    currentSprint: { sprint: { sprintId: 'synthetic', activeBlockerCardId: DEV_TEAM_HUB_V0_CARD_ID }, items: [{ cardId: DEV_TEAM_HUB_V0_CARD_ID, stage: 'building_now' }] },
  })
  const missingSourceSnapshot = buildDevTeamHubV0Snapshot({
    sourceContracts,
    creatorWatchlist,
    dailyWatch: { ...dailyWatch, researchPool: [] },
    scoutBundle: { report: null, atoms: [], hits: [] },
    actionRouter: { recentRoutes: [] },
  })

  return {
    ok: snapshot.status === 'ready' &&
      snapshot.counts.researchPool === 1 &&
      snapshot.counts.rankedOpportunities === 1 &&
      snapshot.counts.atoms === 1 &&
      snapshot.counts.evidenceHits === 1 &&
      snapshot.counts.approvalRequiredLinks === 1 &&
      snapshot.scout.reviewRoutes.every(route => route.proposalOnly && !route.writesBacklog && !route.externalWrites) &&
      missingSourceSnapshot.status === 'needs_source',
    cases: [
      { name: 'source_backed_counts_derive_from_inputs', ok: snapshot.counts.researchPool === 1 && snapshot.counts.atoms === 1 && snapshot.counts.evidenceHits === 1 },
      { name: 'review_routes_are_read_only_proposals', ok: snapshot.scout.reviewRoutes.every(route => route.proposalOnly && !route.writesBacklog && !route.externalWrites) },
      { name: 'missing_values_stay_visible_as_source_needs', ok: missingSourceSnapshot.status === 'needs_source' && missingSourceSnapshot.sourceNeeds.length >= 1 },
    ],
  }
}
