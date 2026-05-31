import { CREATOR_WATCHLIST_SOURCE_ID } from './build-intel-watchlist.js'
import {
  YOUTUBE_CREATOR_DAILY_WATCH_JOB_KEY,
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
  MARK_KASHEF_BASELINE_REPORT_ARTIFACT_ID,
} from './god-mode-youtube-end-to-end-extractor.js'
import {
  DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID,
  DEV_TEAM_INTELLIGENCE_DIRECTOR_SOURCE_ID,
} from './dev-team-intelligence-director.js'
import {
  BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID,
  BUILD_INTEL_SOURCE_VALUE_GRADER_SOURCE_ID,
} from './build-intel-source-value-grader.js'
import {
  isYoutubeLatest20FullWatchReportId,
} from './youtube-latest-20-full-watch-runner.js'
import {
  buildDevIntelSourceCoverageSnapshot,
} from './dev-intel-source-coverage.js'
import {
  buildSourcePacketPreview,
  validateSourcePacketPreview,
} from './build-intel-link-approval-source-packets.js'
import {
  classifyYoutubeResourceLink,
  normalizeYoutubeResourceUrl,
} from './youtube-resource-link-resolver.js'
import {
  buildSynthesisRouterFreshnessSnapshot,
} from './synthesis-router-freshness-trigger.js'
import {
  buildGodModeExtractorParitySnapshot,
  evaluateGodModeExtractorParity,
} from './god-mode-extractor-parity-gate.js'
import {
  buildSourceFamilyGodModeMaturitySnapshot,
  evaluateSourceFamilyGodModeMaturity,
} from './source-family-god-mode-extractors.js'
import {
  buildYoutubeCreatorGodModeCatchupSnapshot,
} from './youtube-creator-god-mode-catchup.js'
import {
  YOUTUBE_GOD_MODE_AUTONOMOUS_WATCH_SCHEDULER_JOB_KEY,
  buildYoutubeGodModeAutonomousWatchPlan,
  buildYoutubeGodModeCandidateVideosFromCatchupSnapshot,
} from './youtube-god-mode-autonomous-watch-scheduler.js'
import {
  EXTRACTOR_HANDS_PRODUCTION_QUEUE_ROUTE,
  EXTRACTOR_HANDS_PRODUCTION_RUNNER_ROUTE,
} from './extractor-hands-production-runner.js'
import {
  GEMINI_API_PRICING_SOURCE_URL,
  GEMINI_STANDARD_PRICING_DEFAULT_MODEL,
  estimateGeminiStandardTokenCostUsd,
  geminiStandardPricingForModel,
} from './llm-provider-pricing.js'
import {
  buildCreatorLeaderboard,
  buildSourceGraderReadbackTruth,
  classifyPostRunLedgerStatus,
  gradeBucketCounts,
} from './foundation-growth-safe-readback.js'
import {
  SOURCE_GOD_MODE_YOUTUBE_HANDOFF_TARGET_KEY,
  buildSourceGodModeYoutubeHandoffQueue,
} from './source-god-mode-youtube-handoff.js'
import {
  buildSourceBrowserRunSummary,
} from './dev-source-run-readback.js'
import {
  buildDevOpportunityVisionLensReview,
} from './dev-opportunity-vision-lens.js'
import {
  buildDevPageSystemTruthSnapshot,
} from './dev-page-system-truth-cleanup.js'
import {
  buildDevHubActionRouteReadback,
} from './dev-hub-action-route-readback.js'
import {
  buildDevHubFoundationDoneBarFromInputs,
} from './dev-hub-foundation-done-bar.js'
import {
  buildDevHubScoperEvidenceTraceReadback,
} from './dev-hub-scoper-evidence-trace-readback.js'
import {
  buildDevHubBuildPortfolioReadback,
} from './dev-hub-build-portfolio-readback.js'
import {
  buildDevHubMorningProposedCardsReadback,
} from './dev-hub-morning-proposed-cards-readback.js'
import {
  buildDevHubProposedCardApprovalPreflight,
} from './dev-hub-proposed-card-approval-preflight.js'
import {
  buildDevHubProposedCardSourceProofReadback,
} from './dev-hub-proposed-card-source-proof-readback.js'
import {
  buildDevHubIntelligenceHygieneReadback,
} from './dev-hub-intelligence-hygiene-readback.js'
import {
  buildDevHubAuditorFlowReadback,
} from './dev-hub-auditor-flow-readback.js'
import {
  buildDevHubSynthesisScopeReadback,
} from './dev-hub-synthesis-scope-readback.js'
import {
  buildDevHubRouteReviewTriage,
} from './dev-hub-route-review-triage.js'
import {
  buildDevHubScoperRuntimeReadback,
} from './dev-hub-scoper-runtime-readback.js'
import {
  buildDevHubScoperScheduleBoundaryPreflight,
} from './dev-hub-scoper-schedule-boundary-preflight.js'
import {
  buildDevHubBusinessSourcePipelineTriage,
} from './dev-hub-business-source-pipeline-triage.js'
import {
  buildDevHubNextRepairQueue,
} from './dev-hub-next-repair-queue.js'
import {
  buildDevHubBusinessAtomFlowPreflight,
} from './dev-hub-business-atom-flow-preflight.js'
import {
  buildDevHubSheetsAtomFlowRepairBlueprint,
} from './dev-hub-sheets-atom-flow-repair-blueprint.js'
import {
  buildDevHubRouteReviewOperatorPacket,
} from './dev-hub-route-review-operator-packet.js'
import {
  buildDevHubRouteAutoClearPreflight,
} from './dev-hub-route-autoclear-preflight.js'
import {
  buildDevHubRouteBlockerPreflight,
} from './dev-hub-route-blocker-preflight.js'

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
  MARK_KASHEF_BASELINE_REPORT_ARTIFACT_ID,
  MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID,
  DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID,
  BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID,
]

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
}

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
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

function reportId(report = {}) {
  return report.reportArtifactId || report.report_artifact_id || ''
}

function reportIsYoutubeFullWatch(report = {}) {
  const id = reportId(report)
  return isYoutubeLatest20FullWatchReportId(id) ||
    id.startsWith('batch:youtube-long-course:api-full-watch-v1') ||
    report.metadata?.fullWatchRoute === 'gemini_api_youtube_url_video_understanding'
}

function reportIsYoutubeDeepVisualReview(report = {}) {
  const id = reportId(report)
  return id.startsWith('batch:youtube-deep-visual-review:v1') ||
    report.metadata?.proofMode === 'youtube_deep_visual_review_v1' ||
    report.metadata?.deepVisualLane === true ||
    reportStructuredOutput(report).snapshot?.promptProfile === 'deep_visual'
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
  const latestRun = job?.latestRun || null
  const latestRunAt = latestRun?.finishedAt || latestRun?.completedAt || latestRun?.startedAt || latestRun?.createdAt || null
  return {
    key: job?.key || '',
    title: job?.title || '',
    status: job?.status || 'Needs source',
    latestRunStatus: latestRun?.status || 'Needs source',
    latestRunAt,
    errorMessage: latestRun?.errorMessage || '',
  }
}

function summarizePipelineJob(job = null) {
  const latestRun = job?.latestRun || null
  const latestRunAt = latestRun?.finishedAt || latestRun?.completedAt || latestRun?.startedAt || latestRun?.createdAt || null
  const latestRunStartedAt = latestRun?.startedAt || latestRun?.createdAt || null
  return {
    key: job?.key || '',
    title: job?.title || '',
    status: job?.status || 'Needs source',
    statusDetail: job?.statusDetail || job?.scheduleDetail || '',
    scheduleStatus: job?.scheduleStatus || '',
    scheduleDetail: job?.scheduleDetail || '',
    due: job?.due === true,
    enabled: job?.enabled !== false,
    runtimeMode: job?.runtimeMode || '',
    cadence: job?.cadence || '',
    nextRunAt: job?.nextRunAt || null,
    latestRunStatus: latestRun?.status || 'No live job run',
    latestRunAt,
    latestRunStartedAt,
    latestRunDurationMs: latestRun?.durationMs || null,
    latestRunId: latestRun?.runId || '',
    errorMessage: latestRun?.errorMessage || '',
    budget: job?.budget || '',
    mutationPosture: job?.mutationPosture || '',
    scheduleMutationGuardOk: job?.scheduleMutationGuard?.ok === true,
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

function failedJobs(jobs = []) {
  return list(jobs).filter(job =>
    String(job.status).toLowerCase().includes('risk') ||
    String(job.latestRunStatus).toLowerCase().includes('failed')
  )
}

function jobTitleList(jobs = []) {
  return list(jobs)
    .map(job => job.title || job.key)
    .filter(Boolean)
    .join(', ')
}

function buildEmailCommsLane({ emailSyncJobs = [], emailExtractJobs = [] } = {}) {
  const jobs = [...emailSyncJobs, ...emailExtractJobs]
  const failedExtractors = failedJobs(emailExtractJobs)
  const archiveLatestRunAt = latestRunAt(emailSyncJobs)
  const extractionLatestRunAt = latestRunAt(emailExtractJobs)
  const archiveSucceeded = emailSyncJobs.some(job => String(job.latestRunStatus).toLowerCase().includes('succeeded'))
  const summary = failedExtractors.length
    ? 'Archive sync is working, but candidate extraction is blocked. Fresh emails are saved, but they are not fully mined into Foundation intelligence yet.'
    : 'Foundation syncs email/comms and mines governed candidates. Dev reads the relevant slice after routing.'
  const detail = failedExtractors.length
    ? `${jobTitleList(failedExtractors)} needs repair before fresh email/Missive signals can feed synthesis.`
    : archiveSucceeded
      ? 'Archive sync and candidate extraction lanes are visible separately in Foundation job proof.'
      : 'Waiting for governed Gmail/Missive archive and candidate extraction proof.'

  return {
    laneId: 'email-missive-comms',
    label: failedExtractors.length ? 'Needs repair' : 'Internal signals',
    title: 'Gmail / Missive',
    status: failedExtractors.length ? 'risk' : groupStatus(jobs),
    summary,
    detail,
    capabilities: ['archives current comms', 'extracts governed candidates', 'keeps content-hash provenance'],
    sourceIds: ['SRC-GMAIL-001', 'SRC-MISSIVE-001'],
    sourceRoute: 'Foundation jobs: gmail/missive current sync + candidate extraction',
    latestRunAt: extractionLatestRunAt || archiveLatestRunAt,
    latestRunLabel: failedExtractors.length ? 'Last extract attempt' : 'Last extraction',
    freshness: {
      archiveLatestRunAt,
      extractionLatestRunAt,
      failedExtractorKeys: failedExtractors.map(job => job.key),
    },
    jobs,
  }
}

function buildSynthesisLane({ synthesisJobs = [], upstreamJobs = [], directorReport = null, freshnessSnapshot = null } = {}) {
  const latestSynthesisRunAt = latestRunAt(synthesisJobs)
  const latestUpstreamRunAt = latestRunAt(upstreamJobs)
  const upstreamFailures = failedJobs(upstreamJobs)
  const stale = Boolean(freshnessSnapshot?.stale || (latestSynthesisRunAt && latestUpstreamRunAt && latestUpstreamRunAt > latestSynthesisRunAt))
  const blockedByExtractor = Boolean(freshnessSnapshot?.blockedByExtractor || upstreamFailures.length)
  const waitingForExtractor = Boolean(freshnessSnapshot?.waitingForExtractor)
  const actionRouterDue = freshnessSnapshot?.status === 'action_router_due'
  const status = blockedByExtractor || waitingForExtractor || stale || actionRouterDue ? 'risk' : groupStatus(synthesisJobs)
  const summary = blockedByExtractor
    ? 'The brain layer is waiting on failed extraction work. It can still read older candidates, but fresh signals are blocked until those extractors are repaired.'
    : waitingForExtractor
      ? 'Fresh source data has been archived, but candidate extraction has not caught up yet. The system is not claiming those fresh source records were synthesized.'
    : stale
      ? 'The brain layer is behind the latest source runs. It needs a refresh before this page can claim the newest source signals are synthesized.'
      : actionRouterDue
        ? 'Synthesis is fresh and the Action Router proposal job should run so useful items can move to human review.'
      : 'This is the layer after extraction: it turns mined candidates into facts, synthesized items, and approval-required routes.'
  const detail = blockedByExtractor
    ? `Blocked by ${freshnessSnapshot?.failedExtractorJobKeys?.join(', ') || jobTitleList(upstreamFailures)}.`
    : waitingForExtractor
      ? `Waiting on ${freshnessSnapshot?.waitingFamilies?.join(', ') || 'extractor work'}.`
    : stale
      ? 'A source lane ran after the last synthesis refresh.'
      : actionRouterDue
        ? 'Action Router creates proposal-only routes; nothing lands in backlog, decisions, or tasks without approval.'
      : `${Number(list(directorReport?.recommendedBuildNow).length || 0)} Dev Director picks · no automatic backlog writes`

  return {
    laneId: 'synthesis-router',
    label: blockedByExtractor ? 'Blocked' : stale || waitingForExtractor || actionRouterDue ? 'Needs refresh' : 'Synthesis',
    title: 'Synthesis + Action Router',
    status,
    summary,
    detail,
    capabilities: ['dedupes evidence', 'creates synthesis facts', 'proposes action routes'],
    sourceIds: ['SRC-GMAIL-001', 'SRC-MISSIVE-001', 'SRC-MEETINGS-001', 'SRC-SLACK-001', DEV_TEAM_INTELLIGENCE_DIRECTOR_SOURCE_ID],
    sourceRoute: 'Foundation jobs: intelligence-synthesis-spine-refresh + intelligence-action-router-proposals',
    latestRunAt: latestSynthesisRunAt,
    latestRunLabel: stale || upstreamFailures.length ? 'Last synthesis' : 'Last run',
    freshness: {
      latestSynthesisRunAt,
      latestUpstreamRunAt,
      stale,
      blockedByExtractor,
      waitingForExtractor,
      actionRouterDue,
      failedUpstreamJobKeys: freshnessSnapshot?.failedExtractorJobKeys || upstreamFailures.map(job => job.key),
      sourceFamilyWatermarks: freshnessSnapshot?.sourceFamilyWatermarks || [],
    },
    jobs: synthesisJobs,
  }
}

function buildExtractionLanes({ foundationSnapshot = {}, dailyWatch = {}, counts = {}, markYoutube = {}, scoutReport = null, eyesQualityLoop = null, latestApiFullWatch = null, extractionEconomics = null, directorReport = null } = {}) {
  const meetingsJobs = summarizeJobGroup(foundationSnapshot, ['meeting-notes-sync-current', 'meeting-transcripts-extract-backlog'])
  const emailSyncJobs = summarizeJobGroup(foundationSnapshot, ['gmail-sync-current', 'missive-sync-current'])
  const emailExtractJobs = summarizeJobGroup(foundationSnapshot, ['gmail-extract-latest', 'missive-extract-latest'])
  const slackJobs = summarizeJobGroup(foundationSnapshot, ['slack-sync-current', 'slack-extract-latest'])
  const synthesisJobs = summarizeJobGroup(foundationSnapshot, ['intelligence-synthesis-spine-refresh', 'intelligence-action-router-proposals'])
  const freshnessSnapshot = buildSynthesisRouterFreshnessSnapshot({
    jobs: list(foundationSnapshot.runtime?.jobs || foundationSnapshot.foundationJobs?.jobs),
  })
  const emailLane = buildEmailCommsLane({ emailSyncJobs, emailExtractJobs })
  const upstreamJobs = [
    ...meetingsJobs,
    ...emailSyncJobs,
    ...emailExtractJobs,
    ...slackJobs,
  ]
  const synthesisLane = buildSynthesisLane({ synthesisJobs, upstreamJobs, directorReport, freshnessSnapshot })
  return [
    {
      laneId: 'youtube-video-intelligence-pipeline',
      label: 'Build Intel',
      title: 'YouTube Video Intelligence Pipeline',
      status: latestApiFullWatch?.status || eyesQualityLoop?.status || scoutReport?.status || dailyWatch.status || 'Needs source',
      summary: 'One pipeline with discovery, page/transcript/resource capture, video/audio/visual review, source-packet worker status, bounded public/free Hands V1, and proposal-only build candidates. It is not full source-family God Mode until production-safe approved resource follow-up and source-specific auth/community/course Hands are proven. YouTube comments are intentionally excluded.',
      detail: `${Number(markYoutube.markResearchPoolCount || 0)} Mark videos tracked · ${Number(counts.apiFullWatchVideos || 0)} API-watched · ${Number(counts.apiFullWatchBuildCandidates || 0)} build candidates`,
      capabilities: ['finds videos', 'reads transcript/page', 'classifies links', 'watches video/audio/visual via Gemini API'],
      sourceIds: [YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID, YOUTUBE_SCOUT_SOURCE_ID, GOD_MODE_EYES_SOURCE_ID],
      sourceRoute: '/api/foundation/build-intel/youtube-creator-daily-watch + report bundles',
      latestRunAt: extractionEconomics?.latestRunAt || latestApiFullWatch?.updatedAt || markYoutube.targetLastRunAt || null,
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
    emailLane,
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
    synthesisLane,
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
    .filter(item => resourceLinkNeedsOperatorReview(item))
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
    .filter(link => resourceLinkNeedsOperatorReview({ ...link, url: link.normalizedUrl || link.url || '' }))
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
    .filter(item => resourceLinkNeedsOperatorReview(item))
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
    .filter(link => resourceLinkNeedsOperatorReview({ ...link, url: link.url || link.normalizedUrl || '' }))
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

function normalizeEyesQualityLoopReport(report = null, atoms = [], hits = []) {
  if (!report) return null
  const structured = report.structuredOutputJson || report.structured_output_json || {}
  const snapshot = structured.snapshot || {}
  const videoResults = list(structured.videoResults).map(item => ({
    video: item.video || {},
    comparison: item.comparison || {},
    baseline: item.baseline || {},
    eyes: item.eyes || {},
    pageEvidence: item.pageEvidence || {},
  }))
  const watchedVideoIds = uniqueBy([
    ...videoResults.map(item => item.video?.videoId || item.videoId),
    ...list(report.metadata?.videoIds),
    ...list(snapshot.videoIds),
    ...list(atoms).map(videoIdFromAtomLike),
    ...list(hits).map(videoIdFromAtomLike),
  ], item => item).map(text).filter(Boolean)
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
    videoResults,
    apiWatchedVideoIds: watchedVideoIds,
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
  const currentReportArtifactId = report.reportArtifactId || report.report_artifact_id || MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID
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
    sourceRoute: `intelligence_report_artifacts.structured_output_json:${currentReportArtifactId}`,
  }))
  return {
    reportArtifactId: currentReportArtifactId,
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
    sourceRoute: `getIntelligenceReportBundle(${currentReportArtifactId})`,
  }
}

function mergeMarkAcceptedApiCoverage(primary = null, acceptedReports = []) {
  const normalizedReports = [primary, ...list(acceptedReports)].filter(Boolean)
  if (!primary || !normalizedReports.length) return primary
  const acceptedApiReportIds = uniqueBy(normalizedReports.map(item => item.reportArtifactId).filter(Boolean), item => item)
  const acceptedVideoIds = uniqueBy(
    normalizedReports.flatMap(item => list(item.apiWatchedVideoIds)).map(text).filter(Boolean),
    item => item,
  )
  return {
    ...primary,
    acceptedApiReportIds,
    apiWatchedVideoIds: acceptedVideoIds,
    sourceRoute: acceptedApiReportIds.map(id => `getIntelligenceReportBundle(${id})`).join(' + '),
  }
}

function normalizeDirectorCandidate(candidate = {}, index = 0) {
  const missionScore = candidate.missionScore && typeof candidate.missionScore === 'object'
    ? candidate.missionScore
    : {}
  return {
    rank: Number(candidate.rank || index + 1),
    candidateKey: candidate.candidateKey || '',
    title: candidate.title || '',
    why: candidate.why || candidate.whyItMatters || '',
    recommendedNextStep: candidate.recommendedNextStep || '',
    directorRecommendation: candidate.directorRecommendation || '',
    promotionStatus: candidate.promotionStatus || '',
    suggestedCardId: candidate.suggestedCardId || '',
    missionScore: Number(missionScore.total || candidate.missionScore || 0),
    missionScoreBreakdown: {
      laneScores: list(missionScore.laneScores),
      evidenceScore: Number(missionScore.evidenceScore || 0),
      qualityScore: Number(missionScore.qualityScore || 0),
      confidenceScore: Number(missionScore.confidenceScore || 0),
      sourceTrustScore: Number(missionScore.sourceTrustScore || candidate.sourceTrustScore || 0),
      sourceQualityScore: Number(missionScore.sourceQualityScore || candidate.sourceQualityScore || 0),
    },
    sourceDevBuildGrade: candidate.sourceDevBuildGrade || candidate.sourceValue?.devBuildGrade || '',
    sourceDevBuildScore: Number(candidate.sourceDevBuildScore || candidate.sourceValue?.devBuildScore || 0),
    sourceQualityScore: Number(candidate.sourceQualityScore || missionScore.sourceQualityScore || 0),
    scopeReadiness: candidate.scopeReadiness || null,
    confidence: candidate.confidence || '',
    sourceTrustLabel: candidate.sourceTrustLabel || '',
    sourceTrustScore: Number(candidate.sourceTrustScore || missionScore.sourceTrustScore || 0),
    sourceTrustEvidencePosture: candidate.sourceTrustEvidencePosture || candidate.scopeReadiness?.evidencePosture || '',
    sourceFullWatchRoute: candidate.sourceFullWatchRoute || '',
    evidenceRefs: list(candidate.evidenceRefs).slice(0, 8),
    evidenceTimestamps: list(candidate.evidenceTimestamps).map(text).filter(Boolean).slice(0, 8),
    qualityScore: Number(candidate.qualityScore || 0),
    rawType: candidate.raw?.type || '',
    rawStatus: candidate.raw?.status || '',
    sourceReportArtifactId: candidate.sourceReportArtifactId || '',
    sourceReportTitle: candidate.sourceReportTitle || '',
    sourceTitle: candidate.sourceTitle || '',
    sourceVideoTitle: candidate.sourceVideoTitle || '',
    sourceVideoId: candidate.sourceVideoId || '',
    sourceUrl: candidate.sourceUrl || '',
    creatorId: candidate.creatorId || '',
    creator: candidate.creator || '',
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

function compactDirectorCandidate(candidate = {}) {
  return {
    rank: candidate.rank,
    title: candidate.title,
    why: candidate.why,
    recommendedNextStep: candidate.recommendedNextStep,
    buildReadiness: candidate.buildReadiness,
    directorRecommendation: candidate.directorRecommendation,
    promotionStatus: candidate.promotionStatus,
    suggestedCardId: candidate.suggestedCardId,
    missionScore: candidate.missionScore,
    missionScoreBreakdown: candidate.missionScoreBreakdown,
    sourceDevBuildGrade: candidate.sourceDevBuildGrade,
    sourceDevBuildScore: candidate.sourceDevBuildScore,
    sourceQualityScore: candidate.sourceQualityScore,
    scopeReadiness: candidate.scopeReadiness,
    confidence: candidate.confidence,
    sourceTrustLabel: candidate.sourceTrustLabel,
    sourceTrustScore: candidate.sourceTrustScore,
    sourceTrustEvidencePosture: candidate.sourceTrustEvidencePosture,
    sourceFullWatchRoute: candidate.sourceFullWatchRoute,
    evidenceRefs: list(candidate.evidenceRefs).slice(0, 8),
    evidenceTimestamps: list(candidate.evidenceTimestamps).slice(0, 8),
    qualityScore: candidate.qualityScore,
    rawType: candidate.rawType,
    rawStatus: candidate.rawStatus,
    sourceReportArtifactId: candidate.sourceReportArtifactId,
    sourceReportTitle: candidate.sourceReportTitle,
    sourceTitle: candidate.sourceTitle,
    sourceVideoTitle: candidate.sourceVideoTitle,
    sourceVideoId: candidate.sourceVideoId,
    sourceUrl: candidate.sourceUrl,
    creatorId: candidate.creatorId,
    creator: candidate.creator,
    sourceRoute: candidate.sourceRoute,
    sourceId: candidate.sourceId,
  }
}

function compactDirectorPayload(directorReport = null, rankedLimit = 72) {
  if (!directorReport) {
    return {
      report: null,
      status: 'Needs source',
      recommendedBuildNow: [],
      rankedCandidates: [],
      rankedCandidateCount: 0,
      rankedCandidatesArePreview: false,
      strongNext: [],
      strongNextCount: 0,
      mission: {},
      sourceRoute: `getIntelligenceReportBundle(${DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID})`,
    }
  }
  const rankedCandidates = list(directorReport.rankedCandidates)
  const strongNext = list(directorReport.strongNext)
  return {
    report: {
      reportArtifactId: directorReport.reportArtifactId,
      title: directorReport.title,
      status: directorReport.status,
      updatedAt: directorReport.updatedAt,
      sourceIds: list(directorReport.sourceIds),
      inputArtifactCount: list(directorReport.inputArtifactIds).length,
      inputAtomCount: list(directorReport.inputAtomIds).length,
      actionRequiredCount: list(directorReport.actionRequiredItems).length,
    },
    status: directorReport.status,
    recommendedBuildNow: list(directorReport.recommendedBuildNow).map(compactDirectorCandidate),
    rankedCandidates: rankedCandidates.slice(0, rankedLimit).map(compactDirectorCandidate),
    rankedCandidateCount: rankedCandidates.length,
    rankedCandidatesArePreview: rankedCandidates.length > rankedLimit,
    strongNext: strongNext.slice(0, 24).map(compactDirectorCandidate),
    strongNextCount: strongNext.length,
    strongNextArePreview: strongNext.length > 24,
    mission: directorReport.mission,
    sourceRoute: directorReport.sourceRoute,
  }
}

function compactOpportunitySupport(support = {}) {
  return {
    ...support,
    creators: list(support.creators).slice(0, 12),
    videos: list(support.videos).slice(0, 12),
    reports: list(support.reports).slice(0, 16),
    links: list(support.links).slice(0, 12),
    counts: support.counts || {},
  }
}

function compactOperatorPlaybook(playbook = null) {
  if (!playbook) return null
  return {
    ...playbook,
    pillars: list(playbook.pillars).map(pillar => ({
      ...pillar,
      supportingSignals: list(pillar.supportingSignals).slice(0, 4),
    })),
    codexRules: list(playbook.codexRules).slice(0, 8),
  }
}

function compactVisionOpportunity(opportunity = {}) {
  return {
    ...opportunity,
    support: compactOpportunitySupport(opportunity.support || {}),
    importantSignals: list(opportunity.importantSignals).slice(0, 5),
    lensScores: list(opportunity.lensScores).slice(0, 12),
    operatorPlaybook: compactOperatorPlaybook(opportunity.operatorPlaybook || null),
    topCandidateRanks: list(opportunity.topCandidateRanks).slice(0, 8),
  }
}

function compactLensOpportunity(opportunity = {}) {
  return {
    opportunityId: opportunity.opportunityId,
    definitionId: opportunity.definitionId,
    title: opportunity.title,
    status: opportunity.status,
    priorityRank: opportunity.priorityRank,
    priorityScore: opportunity.priorityScore,
    priorityReason: opportunity.priorityReason,
    selectedPriorityLensLabel: opportunity.selectedPriorityLensLabel,
    strongestLens: opportunity.strongestLens,
    candidateCount: opportunity.candidateCount,
    supportSummary: opportunity.supportSummary,
    whyForAios: opportunity.whyForAios,
    plainEnglish: opportunity.plainEnglish,
    nextMove: opportunity.nextMove,
    scoperRecommendation: opportunity.scoperRecommendation,
    lensScores: list(opportunity.lensScores).slice(0, 5),
    importantSignals: list(opportunity.importantSignals).slice(0, 3),
    support: {
      counts: opportunity.support?.counts || {},
      creators: list(opportunity.support?.creators).slice(0, 3),
      videos: list(opportunity.support?.videos).slice(0, 2),
      links: list(opportunity.support?.links).slice(0, 2),
    },
    operatorPlaybook: opportunity.definitionId === 'vibe-coding-system-for-steve'
      ? compactOperatorPlaybook(opportunity.operatorPlaybook || null)
      : null,
  }
}

function compactDirectorScoperReview(review = {}) {
  return {
    ...review,
    candidates: list(review.candidates).slice(0, 3).map(compactVisionOpportunity),
    nearMisses: list(review.nearMisses).slice(0, 5),
  }
}

function compactPriorityLensRouter(router = {}, opportunityLimit = 8) {
  return {
    ...router,
    lenses: list(router.lenses).map(lens => {
      const opportunities = list(lens.opportunities)
      return {
        ...lens,
        opportunities: opportunities.slice(0, opportunityLimit).map(compactLensOpportunity),
        opportunitiesArePreview: opportunities.length > opportunityLimit,
      }
    }),
    directorTop3ScoperReview: compactDirectorScoperReview(router.directorTop3ScoperReview || {}),
  }
}

function compactDevOpportunityVisionLensReview(review = {}) {
  const opportunities = list(review.opportunities)
  return {
    ...review,
    opportunities: opportunities.slice(0, 16).map(compactVisionOpportunity),
    opportunitiesArePreview: opportunities.length > 16,
    priorityLensRouter: compactPriorityLensRouter(review.priorityLensRouter || {}, 4),
  }
}

function compactSourceGradeRow(row = {}) {
  return {
    reason: row.reason || '',
    creator: row.creator || '',
    creatorId: row.creatorId || '',
    reportIds: list(row.reportIds).slice(0, 5),
    reportIdCount: list(row.reportIds).length,
    reportIdsArePreview: list(row.reportIds).length > 5,
    laneScores: list(row.laneScores).map(lane => ({
      laneId: lane.laneId || lane.id || '',
      label: lane.label || '',
      grade: lane.grade || '',
      score: lane.score,
      watchRecommendation: lane.watchRecommendation || '',
    })),
    primaryUse: row.primaryUse || '',
    primaryLane: row.primaryLane || '',
    overallGrade: row.overallGrade || '',
    devBuildGrade: row.devBuildGrade || '',
    topCandidates: list(row.topCandidates).slice(0, 3).map(candidate => ({
      title: candidate.title || '',
      sourceVideoId: candidate.sourceVideoId || '',
      rank: candidate.rank,
    })),
    topCandidateCount: list(row.topCandidates).length,
    watchedVideos: row.watchedVideos,
    buildCandidates: row.buildCandidates,
    bestDirectorRank: row.bestDirectorRank,
    visualEvidenceCount: row.visualEvidenceCount,
    watchRecommendation: row.watchRecommendation || '',
    devWatchRecommendation: row.devWatchRecommendation || '',
    approvalRequiredLinkCount: row.approvalRequiredLinkCount,
    resolvedPublicResourceLinkCount: row.resolvedPublicResourceLinkCount,
  }
}

function compactSourceValueGraderPayload(sourceValueGrader = null) {
  if (!sourceValueGrader) {
    return {
      report: null,
      status: 'Needs source',
      sourceGrades: [],
      topDevBuildSources: [],
      topByLane: [],
      noAutoBacklogPromotion: true,
      externalWrites: false,
      updatedAt: null,
      sourceRoute: `getIntelligenceReportBundle(${BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID})`,
    }
  }
  return {
    report: {
      reportArtifactId: sourceValueGrader.reportArtifactId,
      title: sourceValueGrader.title,
      status: sourceValueGrader.status,
      updatedAt: sourceValueGrader.updatedAt,
      sourceIds: list(sourceValueGrader.sourceIds),
    },
    status: sourceValueGrader.status,
    sourceGrades: list(sourceValueGrader.sourceGrades).map(compactSourceGradeRow),
    topDevBuildSources: list(sourceValueGrader.topDevBuildSources).map(compactSourceGradeRow),
    topByLane: list(sourceValueGrader.topByLane).map(lane => ({
      label: lane.label || '',
      laneId: lane.laneId || '',
      hasMore: lane.hasMore === true,
      gradeBuckets: lane.gradeBuckets || {},
      showingCount: lane.showingCount,
      totalSourceCount: lane.totalSourceCount,
      sources: list(lane.sources).slice(0, 5).map(compactSourceGradeRow),
    })),
    noAutoBacklogPromotion: sourceValueGrader.noAutoBacklogPromotion,
    externalWrites: sourceValueGrader.externalWrites,
    updatedAt: sourceValueGrader.updatedAt,
    sourceRoute: sourceValueGrader.sourceRoute,
    compacted: true,
  }
}

function compactCatchupCreator(row = {}) {
  return {
    creatorId: row.creatorId,
    creator: row.creator || row.channelTitle || row.creatorName,
    channelTitle: row.channelTitle,
    devBuildGrade: row.devBuildGrade || row.grade,
    grade: row.grade,
    score: row.score,
    representationStatus: row.representationStatus,
    baselineTargetVideos: row.baselineTargetVideos,
    baselineGap: row.baselineGap,
    deepBaselineGap: row.deepBaselineGap,
    trackedMetadataCount: row.trackedMetadataCount,
    videoAudioVisualWatchedCount: row.videoAudioVisualWatchedCount,
    watchedVideos: row.watchedVideos,
    buildCandidates: row.buildCandidates,
    longCoursePendingCount: row.longCoursePendingCount,
    parkedStandardCandidateCount: row.parkedStandardCandidateCount || list(row.parkedStandardCandidates).length,
    pendingStandardCandidateCount: row.pendingStandardCandidateCount || list(row.nextWatchCandidates).length,
    nextWatchAction: row.nextWatchAction || '',
    youtubeSopStatus: row.youtubeSopStatus || '',
    freeResourceCaptureStatus: row.freeResourceCaptureStatus || '',
    approvedResourceFollowStatus: row.approvedResourceFollowStatus || '',
    paidGateEvaluationStatus: row.paidGateEvaluationStatus || '',
    sourceSopEvidence: row.sourceSopEvidence || {},
  }
}

function compactYoutubeCreatorGodModeCatchup(catchup = {}) {
  return {
    ...catchup,
    creators: list(catchup.creators).map(compactCatchupCreator),
    sourcePacketReviewQueue: [],
    sourcePacketReviewQueueCount: list(catchup.sourcePacketReviewQueue).length,
    compacted: true,
  }
}

function compactDailyResearchPool(rows = [], {
  maxRows = 180,
  preserveCreatorId = YOUTUBE_CREATOR_DAILY_WATCH_MARK_CREATOR_ID,
  preserveVideoIds = [],
} = {}) {
  const normalizedRows = normalizeResearchPool(rows)
  const preserveVideos = new Set(list(preserveVideoIds).map(text).filter(Boolean))
  const selected = []
  const seen = new Set()
  const addRow = row => {
    const key = row.itemKey || row.videoId || row.url
    if (!key || seen.has(key) || selected.length >= maxRows) return
    selected.push(row)
    seen.add(key)
  }
  for (const row of normalizedRows.filter(row => row.creatorId === preserveCreatorId).slice(0, 60)) addRow(row)
  for (const row of normalizedRows.filter(row => preserveVideos.has(row.videoId))) addRow(row)
  const latestByCreator = new Map()
  for (const row of normalizedRows) {
    const creatorId = text(row.creatorId)
    if (!creatorId) continue
    const current = latestByCreator.get(creatorId)
    if (!current || text(row.lastSeenAt || row.firstSeenAt).localeCompare(text(current.lastSeenAt || current.firstSeenAt)) > 0) {
      latestByCreator.set(creatorId, row)
    }
  }
  for (const row of latestByCreator.values()) addRow(row)
  for (const row of normalizedRows) addRow(row)
  return selected
}

function normalizeSourceValueGraderReport(report = null) {
  if (!report) return null
  const structured = report.structuredOutputJson || report.structured_output_json || {}
  return {
    reportArtifactId: report.reportArtifactId || report.report_artifact_id || BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID,
    title: report.title || '',
    status: report.status || 'Needs source',
    sourceIds: report.sourceIds || report.source_ids || [BUILD_INTEL_SOURCE_VALUE_GRADER_SOURCE_ID],
    inputArtifactIds: report.inputArtifactIds || report.input_artifact_ids || [],
    sourceGrades: list(structured.sourceGrades),
    topDevBuildSources: list(structured.topDevBuildSources),
    topByLane: list(structured.topByLane),
    noAutoBacklogPromotion: structured.noAutoBacklogPromotion === true,
    externalWrites: structured.externalWrites === true,
    updatedAt: report.updatedAt || report.updated_at || null,
    sourceRoute: `getIntelligenceReportBundle(${BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID})`,
  }
}

function buildRankingProcessExplainer({ directorReport = null, sourceValueGrader = null } = {}) {
  return {
    status: 'ready',
    title: 'How ranking works',
    plainEnglish: 'Rankings are deterministic readback from extracted evidence. Provenance is displayed for audit, but it must not silently decide grades, opportunity classes, or build priority.',
    sourceRoutes: [
      sourceValueGrader?.sourceRoute || `getIntelligenceReportBundle(${BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID})`,
      directorReport?.sourceRoute || `getIntelligenceReportBundle(${DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID})`,
      'public/dev.js renderRankingProcessVisualizer(snapshot.rankingProcess)',
    ],
    currentCounts: {
      gradedCreators: list(sourceValueGrader?.sourceGrades).length,
      rankedIdeas: list(directorReport?.rankedCandidates).length,
    },
    creatorRanking: {
      title: 'Creator ranking',
      goal: 'Rank each creator by Dev-lane value without globally deleting their source profile.',
      inputs: [
        'Current approved creator/video map from the YouTube daily-watch spine.',
        'Extracted build candidates: title, why it matters, recommended next step, confidence.',
        'Watched-video count for current active channel rows.',
        'Best Director-ranked idea from that creator.',
        'Resolved public resource counts and approval-required link counts.',
      ],
      scoring: [
        'Evidence score: represented watched videos, capped at 14.',
        'Candidate yield: more useful extracted candidates adds up to 20.',
        'Specificity: AIOS/Foundation/dev terms beat broad generic AI terms.',
        'Director score: stronger best-ranked idea adds more weight.',
        'Resource score: useful public/resource links add a small bump.',
        'Confidence score: high-confidence candidates add up to 6.',
      ],
      gradeThresholds: [
        { grade: 'S', rule: '85+' },
        { grade: 'A', rule: '70-84' },
        { grade: 'B', rule: '50-69' },
        { grade: 'C', rule: '25-49' },
        { grade: 'D', rule: '0-24' },
      ],
      guardrails: [
        'Off-topic noise with weak Foundation signal is capped before it can look good.',
        'Dev grade controls Dev follow-up priority only; other hubs can grade the same contributor differently.',
        'No watchlist deletion, backlog write, purchase, signup, or external action happens from ranking.',
      ],
    },
    ideaRanking: {
      title: 'Idea ranking',
      goal: 'Rank raw build ideas by mission fit, proof, usefulness, and source quality before any Scoper promotion.',
      inputs: [
        'Extracted candidate substance: title, summary/content, why, next step, implementation notes, workflow notes, visual notes, and timestamps.',
        'Mission lane term matches from the candidate substance.',
        'Evidence refs, timestamp refs, source report ID, and source video ID.',
        'Candidate quality/relevance and confidence.',
        'Source trust posture such as full-watch proof.',
        'Dev creator grade mapped as S +10, A +7, B +3, C -6, D -12.',
      ],
      scoring: [
        'Lane score: each matching mission lane contributes up to its lane max.',
        'Evidence score: refs, timestamps, report ID, and video ID add up to 14.',
        'Quality score: extracted relevance/quality adds up to 14.',
        'Confidence score: high-confidence candidates get more weight.',
        'Source trust score: stronger source proof can add, weak proof can subtract.',
        'Creator source score: Dev creator grade nudges idea rank but does not replace evidence.',
      ],
      sorting: [
        'Sort by total mission score.',
        'Break ties with creator source quality.',
        'Then sort by title for stable deterministic output.',
      ],
      guardrails: [
        'Top ideas stay proposal-only until Steve/Codex approve Scoper promotion.',
        'Opportunity clustering is the next layer: many creators supporting one idea should become one opportunity with many sources.',
        'A source title, creator name, or link label alone cannot force a class or a high rank.',
      ],
    },
    notScoredAsJudgment: [
      'sourceTitle and sourceVideoTitle',
      'creator display name by itself',
      'source URL, host, or link text by itself',
      'source-packet disposition by itself',
      'approval queue status by itself',
    ],
    proofPosture: {
      sourceTitleDogfood: 'Provenance-only Nick/vibe-coding clones match zero opportunities.',
      ambiguousReportDogfood: 'Director report-ID source-grade fallback applies only when exactly one source owns the report.',
      sourceGraderDogfood: 'A source-title-only fixture stays C/D and has zero Foundation-specific Dev hits.',
    },
    readOnly: true,
    externalWrites: false,
    noAutoBacklogPromotion: true,
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

function geminiUsageFromCall(call = {}) {
  const metadata = call.metadata || {}
  return metadata.usageMetadata ||
    metadata.quota?.state?.usageMetadata ||
    metadata.brainFleetLedger?.quota?.state?.usageMetadata ||
    {}
}

function isDevVideoReviewCall(call = {}) {
  if (call.provider !== 'gemini' || call.workload !== 'video_vision' || call.status !== 'succeeded') return false
  const metadata = call.metadata || {}
  const routeText = [
    metadata.extractionMode,
    metadata.batchReportArtifactId,
    metadata.parentCardId,
    metadata.cardId,
    metadata.requestedBy,
  ].map(text).join(' ').toLowerCase()
  return Boolean(metadata.videoId) && (
    routeText.includes('full_watch') ||
    routeText.includes('god_mode') ||
    routeText.includes('youtube-latest-20') ||
    routeText.includes('mark-kashef-last-50') ||
    routeText.includes('youtube_latest_20')
  )
}

function devVideoReviewCallEndedAt(call = {}) {
  return text(call.finishedAt || call.finished_at || call.updatedAt || call.updated_at || call.startedAt || call.started_at || call.createdAt || call.created_at)
}

function estimateDevVideoReviewCallCost(call = {}) {
  const metadata = call.metadata || {}
  const usage = geminiUsageFromCall(call)
  const model = text(call.model || metadata.model, GEMINI_STANDARD_PRICING_DEFAULT_MODEL)
  const input = number(usage.promptTokenCount ?? call.estimatedInputTokens ?? call.estimated_input_tokens)
  const thinking = number(usage.thoughtsTokenCount)
  const candidateOutput = number(usage.candidatesTokenCount ?? call.estimatedOutputTokens ?? call.estimated_output_tokens)
  return estimateGeminiStandardTokenCostUsd({ model, inputTokens: input, outputTokens: candidateOutput + thinking })
}

function torontoDateKey(value = '') {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function estimateTodayGeminiVideoSpendUsd(calls = [], generatedAt = '') {
  const targetDate = torontoDateKey(generatedAt)
  if (!targetDate) return 0
  return uniqueBy(list(calls).filter(isDevVideoReviewCall), call => call.callId)
    .filter(call => torontoDateKey(devVideoReviewCallEndedAt(call)) === targetDate)
    .reduce((sum, call) => sum + estimateDevVideoReviewCallCost(call), 0)
}

const DEV_HUB_YOUTUBE_CATCHUP_PLAN_CONFIG = Object.freeze({
  maxVideosPerRun: 9,
  maxEstimatedUsdPerRun: 5,
  maxEstimatedUsdPerDay: 150,
})

export function fullWatchedVideoIdsFromCalls(calls = []) {
  return uniqueBy(list(calls).filter(isDevVideoReviewCall), call => call.callId)
    .map(call => text(call.metadata?.videoId))
    .filter(Boolean)
}

function buildExtractionEconomics({
  geminiVideoReviewCalls = [],
  sourceValueGrader = null,
} = {}) {
  const calls = uniqueBy(list(geminiVideoReviewCalls).filter(isDevVideoReviewCall), call => call.callId)
  const sourceGrades = list(sourceValueGrader?.sourceGrades)
  const ideaCount = sourceGrades.reduce((sum, source) => sum + number(source.buildCandidates), 0)
  const batchIds = new Set()
  const videoIds = new Set()
  const modelBreakdown = new Map()
  let promptTokens = 0
  let outputTokens = 0
  let thinkingTokens = 0
  let totalTokens = 0
  let estimatedSpendUsd = 0
  let latestRunAt = ''

  for (const call of calls) {
    const metadata = call.metadata || {}
    const usage = geminiUsageFromCall(call)
    const model = text(call.model || metadata.model, GEMINI_STANDARD_PRICING_DEFAULT_MODEL)
    const input = number(usage.promptTokenCount ?? call.estimatedInputTokens)
    const thinking = number(usage.thoughtsTokenCount)
    const candidateOutput = number(usage.candidatesTokenCount ?? call.estimatedOutputTokens)
    const output = candidateOutput + thinking
    const total = number(usage.totalTokenCount, input + output)
    const cost = estimateDevVideoReviewCallCost(call)

    promptTokens += input
    outputTokens += output
    thinkingTokens += thinking
    totalTokens += total
    estimatedSpendUsd += cost
    if (metadata.videoId) videoIds.add(metadata.videoId)
    if (metadata.batchReportArtifactId) batchIds.add(metadata.batchReportArtifactId)
    const callEndedAt = devVideoReviewCallEndedAt(call)
    if (callEndedAt && callEndedAt > latestRunAt) latestRunAt = callEndedAt

    const current = modelBreakdown.get(model) || { model, calls: 0, promptTokens: 0, outputTokens: 0, totalTokens: 0, estimatedSpendUsd: 0 }
    current.calls += 1
    current.promptTokens += input
    current.outputTokens += output
    current.totalTokens += total
    current.estimatedSpendUsd += cost
    modelBreakdown.set(model, current)
  }

  const dominantModel = [...modelBreakdown.values()].sort((left, right) => right.calls - left.calls)[0]?.model || GEMINI_STANDARD_PRICING_DEFAULT_MODEL
  const dominantPricing = geminiStandardPricingForModel(dominantModel)

  return {
    status: calls.length ? 'ready' : 'Needs source',
    sourceRoute: 'llm_calls filtered to Gemini video review + sourceValueGrader sourceGrades',
    pricingSourceUrl: GEMINI_API_PRICING_SOURCE_URL,
    pricingLabel: dominantPricing.label,
    pricingAssumption: 'Standard paid-tier Gemini API token math; invoice may differ if Google applies credits, discounts, or rounding.',
    model: dominantModel,
    serviceTier: 'standard',
    callCount: calls.length,
    videoCount: videoIds.size,
    batchCount: batchIds.size,
    ideaCount,
    promptTokens,
    outputTokens,
    thinkingTokens,
    totalTokens,
    estimatedSpendUsd,
    costPerIdeaUsd: ideaCount ? estimatedSpendUsd / ideaCount : null,
    costPerVideoUsd: videoIds.size ? estimatedSpendUsd / videoIds.size : null,
    latestRunAt: latestRunAt || null,
    modelBreakdown: [...modelBreakdown.values()].map(item => ({
      ...item,
      estimatedSpendUsd: Number(item.estimatedSpendUsd.toFixed(6)),
    })),
  }
}

function buildYoutubeGodModeAutopilotPlan({
  generatedAt = new Date().toISOString(),
  catchupSnapshot = null,
  sourceValueGrader = null,
  geminiVideoReviewCalls = [],
} = {}) {
  const candidateVideos = buildYoutubeGodModeCandidateVideosFromCatchupSnapshot({
    catchupSnapshot,
    maxPerCreator: 3,
  })
  const plan = buildYoutubeGodModeAutonomousWatchPlan({
    generatedAt,
    mode: 'dry-run',
    candidateVideos,
    sourceGrades: list(sourceValueGrader?.sourceGrades),
    estimatedSpendTodayUsd: estimateTodayGeminiVideoSpendUsd(geminiVideoReviewCalls, generatedAt),
    config: DEV_HUB_YOUTUBE_CATCHUP_PLAN_CONFIG,
  })
  return {
    ...plan,
    sourceRoute: 'youtubeCreatorGodModeCatchup.nextWatchCandidates + sourceValueGrader.sourceGrades + llm_calls today',
    candidateVideoCount: candidateVideos.length,
    liveRunEnabled: false,
    startsProviderCall: false,
    runApprovalRequired: true,
    plainEnglish: plan.selectedVideos.length
      ? 'Dry-run only. These are exact public YouTube videos the morning autopilot would run after Steve approves a live-bounded budget.'
      : 'Dry-run only. The morning autopilot did not select a runnable public video under the current budget, grade, and source-SOP rules.',
  }
}

function buildHandoffBucket({
  bucketId = '',
  label = '',
  count = 0,
  status = '',
  description = '',
  route = '',
  evidenceCount = 0,
  sampleHosts = [],
  sourceDetail = '',
} = {}) {
  return {
    bucketId,
    label,
    count: Number(count || 0),
    status: status || (Number(count || 0) ? 'waiting' : 'empty'),
    description,
    route,
    evidenceCount: Number(evidenceCount || 0),
    sampleHosts: list(sampleHosts).map(text).filter(Boolean),
    sourceDetail,
  }
}

function approvalTriageBucketCount(approvalReviewTriage = null, bucketId = '') {
  const row = list(approvalReviewTriage?.rows).find(item => item.bucketId === bucketId)
  return Number(row?.count || 0)
}

function approvalQueueKeywordCount(approvalReviewQueue = [], keywords = []) {
  const patterns = list(keywords).map(keyword => text(keyword).toLowerCase()).filter(Boolean)
  if (!patterns.length) return 0
  return list(approvalReviewQueue).filter(item => {
    const haystack = [
      item.url,
      item.host,
      item.type,
      item.reason,
      item.decisionNeeded,
      item.sourcePacketPreview?.sourceFamily,
      item.sourcePacketPreview?.proposedDecision,
      item.sourcePacketPreview?.plainEnglish,
    ].map(value => text(value).toLowerCase()).join(' ')
    return patterns.some(pattern => haystack.includes(pattern))
  }).length
}

function hostFromUrl(value = '') {
  try {
    return new URL(value).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

function extractUrlsFromText(value = '') {
  const input = text(value)
  if (!input) return []
  return [...input.matchAll(/https?:\/\/[^\s"'<>]+/gi)]
    .map(match => match[0].replace(/[),.;\]}]+$/g, ''))
    .filter(Boolean)
}

function resourceRefUrls(ref = {}) {
  if (typeof ref === 'string') return extractUrlsFromText(ref)
  if (!ref || typeof ref !== 'object') return []
  const directValues = [
    ref.url,
    ref.normalizedUrl,
    ref.href,
    ref.sourceUrl,
    ref.exactUrl,
    ref.resolvedUrl,
  ].flatMap(value => extractUrlsFromText(value))
  return uniqueBy(directValues, value => value)
}

function isCodeResourceUrl(url = '') {
  const host = hostFromUrl(url)
  let pathname = ''
  try {
    pathname = new URL(url).pathname.toLowerCase()
  } catch {
    pathname = ''
  }
  return host === 'github.com' ||
    host === 'gist.github.com' ||
    host === 'raw.githubusercontent.com' ||
    host === 'gitlab.com' ||
    host === 'bitbucket.org' ||
    /\/(repo|repos|repository|source-code|code)\b/.test(pathname)
}

function isNewsletterUrl(url = '') {
  const host = hostFromUrl(url)
  const lower = `${host} ${url}`.toLowerCase()
  return /newsletter|substack|beehiiv|convertkit|mailerlite|kit\.com|ck\.page/.test(lower)
}

function isCommunityUrl(url = '') {
  const host = hostFromUrl(url)
  const lower = `${host} ${url}`.toLowerCase()
  return /skool|circle|discord|community|classroom|free-community|course-community/.test(lower)
}

function isProductApprovalUrl(url = '') {
  const host = hostFromUrl(url)
  const lower = `${host} ${url}`.toLowerCase()
  return /gumroad|lemonsqueezy|stripe|paypal|checkout|purchase|buy|cart|pricing|product|download|downloads|marketplace|appsumo/.test(lower)
}

function isPaidAuthGateUrl(url = '') {
  const host = hostFromUrl(url)
  const lower = `${host} ${url}`.toLowerCase()
  return /myicor|login|sign-in|signin|member|membership|paid|private|course|classroom|checkout|payment|calendar|calendly|booking|book-a-call|leadmagnet|form/.test(lower)
}

function reportStructuredOutput(report = {}) {
  return report.structuredOutputJson || report.structured_output_json || {}
}

function reportActionRequiredItems(report = {}) {
  return report.actionRequiredItems || report.action_required_items || []
}

function youtubeReportVideoResults(report = {}) {
  const structured = reportStructuredOutput(report)
  return uniqueBy([
    ...list(structured.snapshot?.videoResults),
    ...list(structured.videoResults),
    ...list(structured.videos),
  ], item => item.video?.videoId || item.videoId || item.video?.url || item.url || JSON.stringify(item).slice(0, 160))
}

function buildYoutubeDeepVisualReviewSummary(reports = []) {
  const rows = list(reports).filter(reportIsYoutubeDeepVisualReview)
  const videoIds = new Set()
  let buildCandidateCount = 0
  let timestampedVisualEvidenceCount = 0
  let visibleCodeOrToolingCount = 0
  let missedByStandardCount = 0
  let latestRunAt = ''

  for (const report of rows) {
    const structured = reportStructuredOutput(report)
    const snapshot = structured.snapshot || {}
    for (const videoId of list(report.metadata?.videoIds)) {
      if (text(videoId)) videoIds.add(text(videoId))
    }
    for (const result of list(snapshot.videoResults)) {
      const videoId = text(result.video?.videoId || result.videoId)
      if (videoId) videoIds.add(videoId)
    }
    for (const video of list(structured.videos)) {
      const videoId = text(video.videoId || video.video?.videoId)
      if (videoId) videoIds.add(videoId)
    }
    buildCandidateCount += list(structured.buildCandidates).length || Number(snapshot.summary?.totalBuildCandidates || 0)
    timestampedVisualEvidenceCount += Number(snapshot.summary?.totalTimestampedVisualEvidence || 0)
    visibleCodeOrToolingCount += Number(snapshot.summary?.totalVisibleCodeOrTooling || 0)
    missedByStandardCount += Number(snapshot.summary?.totalMissedByStandard || 0)
    const updatedAt = text(report.updatedAt || report.updated_at || report.createdAt || report.created_at)
    if (updatedAt && updatedAt > latestRunAt) latestRunAt = updatedAt
  }

  return {
    status: rows.length ? 'working' : 'planned',
    reportCount: rows.length,
    reviewedVideoCount: videoIds.size,
    buildCandidateCount,
    timestampedVisualEvidenceCount,
    visibleCodeOrToolingCount,
    missedByStandardCount,
    latestRunAt: latestRunAt || null,
  }
}

function collectYoutubeReportHandoffLinks(report = {}) {
  const structured = reportStructuredOutput(report)
  const snapshot = structured.snapshot || {}
  const reportArtifactId = reportId(report)
  const output = []

  const addRef = (ref, disposition = '', sourceVideoId = '', sourceMeta = {}) => {
    for (const url of resourceRefUrls(ref)) {
      output.push({
        url,
        disposition,
        linkType: text(ref?.type || ref?.kind || ref?.linkType),
        blocker: text(ref?.blocker || ref?.reason || ref?.evidence),
        allowedNextDecision: text(ref?.allowedNextDecision || ref?.nextDecision),
        sourceVideoId: sourceVideoId || text(ref?.sourceVideoId),
        sourceVideoIds: uniqueBy([sourceVideoId, ref?.sourceVideoId, ...list(ref?.sourceVideoIds)].map(text).filter(Boolean), item => item),
        creatorId: text(sourceMeta.creatorId || ref?.creatorId),
        creator: text(sourceMeta.creator || ref?.creator),
        sourceCreatorIds: uniqueBy([sourceMeta.creatorId, ref?.creatorId, ...list(ref?.sourceCreatorIds)].map(text).filter(Boolean), item => item),
        sourceCreators: uniqueBy([sourceMeta.creator, ref?.creator, ...list(ref?.sourceCreators)].map(text).filter(Boolean), item => item),
        videoTitle: text(sourceMeta.videoTitle || ref?.videoTitle || ref?.sourceTitle),
        reportArtifactId,
        reportArtifactIds: uniqueBy([reportArtifactId, ...list(ref?.reportArtifactIds)].map(text).filter(Boolean), item => item),
      })
    }
  }

  for (const result of youtubeReportVideoResults(report)) {
    const video = result.video || result
    const sourceVideoId = text(video.videoId || result.videoId)
    const sourceMeta = {
      creatorId: text(video.creatorId || result.creatorId),
      creator: text(video.creator || result.creator),
      videoTitle: text(video.title || result.title),
    }
    const packet = result.resourceLinkSnapshot?.scoperPacket || result.resourceLinkPacket || {}
    for (const ref of list(packet.resolvedResourceRefs)) addRef(ref, 'resolved_public_resource', sourceVideoId, sourceMeta)
    for (const ref of list(packet.unresolvedPublicResourceLinks)) addRef(ref, 'unresolved_public_resource', sourceVideoId, sourceMeta)
    for (const ref of list(packet.approvalRequiredResourceLinks)) addRef(ref, 'approval_required_resource', sourceVideoId, sourceMeta)
    for (const ref of list(packet.blockedResourceRefs)) addRef(ref, 'blocked_resource', sourceVideoId, sourceMeta)
    for (const ref of list(packet.resourceLinkDispositions)) addRef(ref, 'resource_disposition', sourceVideoId, sourceMeta)
    for (const ref of list(result.safeResourceFollowResults)) addRef(ref, 'safe_resource_follow_result', sourceVideoId, sourceMeta)
  }

  for (const ref of [
    ...list(structured.linkQueue),
    ...list(structured.approvalRequiredLinks),
    ...list(structured.safeReferences),
    ...list(snapshot.links),
    ...list(snapshot.approvalRequiredLinks),
    ...list(snapshot.safeReferences),
    ...list(snapshot.actionRequiredItems),
    ...list(reportActionRequiredItems(report)),
  ]) {
    addRef(ref, 'report_level_resource', text(ref?.sourceVideoId))
  }

  return output
}

function mergeYoutubeHandoffEvidence(existing = {}, link = {}) {
  existing.reportArtifactIds = uniqueBy([
    ...list(existing.reportArtifactIds),
    existing.reportArtifactId,
    link.reportArtifactId,
    ...list(link.reportArtifactIds),
  ].map(text).filter(Boolean), item => item)
  existing.sourceVideoIds = uniqueBy([
    ...list(existing.sourceVideoIds),
    existing.sourceVideoId,
    link.sourceVideoId,
    ...list(link.sourceVideoIds),
  ].map(text).filter(Boolean), item => item)
  existing.sourceCreatorIds = uniqueBy([
    ...list(existing.sourceCreatorIds),
    existing.creatorId,
    link.creatorId,
    ...list(link.sourceCreatorIds),
  ].map(text).filter(Boolean), item => item)
  existing.sourceCreators = uniqueBy([
    ...list(existing.sourceCreators),
    existing.creator,
    link.creator,
    ...list(link.sourceCreators),
  ].map(text).filter(Boolean), item => item)
  existing.reportArtifactId = existing.reportArtifactIds[0] || existing.reportArtifactId || ''
  existing.sourceVideoId = existing.sourceVideoIds[0] || existing.sourceVideoId || ''
  existing.creatorId = existing.sourceCreatorIds[0] || existing.creatorId || ''
  existing.creator = existing.sourceCreators[0] || existing.creator || ''
  existing.evidenceCount = Number(existing.evidenceCount || 1) + 1
  return existing
}

function addYoutubeHandoffEvidence(bucketMaps, bucketId, link = {}) {
  const normalizedUrl = normalizeYoutubeResourceUrl(link.url || '')
  if (!/^https?:\/\//i.test(normalizedUrl)) return
  const host = hostFromUrl(normalizedUrl)
  if (!host || approvalLinkIsSystemNoise({ host })) return
  const key = normalizedUrl.toLowerCase()
  if (bucketMaps[bucketId].has(key)) {
    mergeYoutubeHandoffEvidence(bucketMaps[bucketId].get(key), link)
    return
  }
  const item = {
    url: normalizedUrl,
    host,
    reportArtifactId: link.reportArtifactId || '',
    reportArtifactIds: uniqueBy([link.reportArtifactId, ...list(link.reportArtifactIds)].map(text).filter(Boolean), item => item),
    sourceVideoId: link.sourceVideoId || '',
    sourceVideoIds: uniqueBy([link.sourceVideoId, ...list(link.sourceVideoIds)].map(text).filter(Boolean), item => item),
    creatorId: link.creatorId || '',
    creator: link.creator || '',
    sourceCreatorIds: uniqueBy([link.creatorId, ...list(link.sourceCreatorIds)].map(text).filter(Boolean), item => item),
    sourceCreators: uniqueBy([link.creator, ...list(link.sourceCreators)].map(text).filter(Boolean), item => item),
    videoTitle: link.videoTitle || '',
    linkType: link.linkType || '',
    blocker: link.blocker || '',
    allowedNextDecision: link.allowedNextDecision || '',
    evidenceCount: 1,
    disposition: link.disposition || '',
  }
  bucketMaps[bucketId].set(key, item)
}

function handoffLinkNeedsApprovalBeforeCommunity(link = {}, classification = {}) {
  const lower = [
    link.disposition,
    link.linkType,
    link.blocker,
    link.allowedNextDecision,
    link.status,
  ].map(text).filter(Boolean).join(' ').toLowerCase()
  if (classification.approvalRequired !== true) return false
  return /approval_required|blocked_resource|blocked_private_or_course_source|source-packet|source packet|community, course, member, paid, or login|paid|private|member|membership|course|classroom|login|auth/.test(lower)
}

function routeYoutubeHandoffLink(bucketMaps, link = {}) {
  const normalizedUrl = normalizeYoutubeResourceUrl(link.url || '')
  if (!/^https?:\/\//i.test(normalizedUrl)) return
  const classification = classifyYoutubeResourceLink({ ...link, url: normalizedUrl })
  if (classification.disposition === 'observed_youtube_reference') return

  if (isCodeResourceUrl(normalizedUrl)) {
    addYoutubeHandoffEvidence(bucketMaps, 'public-code-repos', { ...link, url: normalizedUrl })
    return
  }
  if (isNewsletterUrl(normalizedUrl)) {
    addYoutubeHandoffEvidence(bucketMaps, 'creator-newsletters', { ...link, url: normalizedUrl })
    return
  }
  if (isProductApprovalUrl(normalizedUrl) || classification.disposition === 'blocked_purchase_or_checkout' || classification.disposition === 'blocked_download') {
    addYoutubeHandoffEvidence(bucketMaps, 'products-tools-to-approve', { ...link, url: normalizedUrl })
    return
  }
  if (handoffLinkNeedsApprovalBeforeCommunity(link, classification) || isPaidAuthGateUrl(normalizedUrl)) {
    addYoutubeHandoffEvidence(bucketMaps, 'paid-auth-gates', { ...link, url: normalizedUrl })
    return
  }
  if (isCommunityUrl(normalizedUrl)) {
    addYoutubeHandoffEvidence(bucketMaps, 'free-communities', { ...link, url: normalizedUrl })
    return
  }
  if (classification.canResolve === true && classification.approvalRequired !== true) {
    addYoutubeHandoffEvidence(bucketMaps, 'public-web-resources', { ...link, url: normalizedUrl })
    return
  }
  if (classification.approvalRequired === true) {
    addYoutubeHandoffEvidence(bucketMaps, 'paid-auth-gates', { ...link, url: normalizedUrl })
  }
}

function summarizeYoutubeHandoffEvidenceBucket(map = new Map()) {
  const rows = [...map.values()]
  const sampleHosts = uniqueBy(rows.map(item => item.host).filter(Boolean), item => item).slice(0, 6)
  return {
    count: rows.length,
    itemLimit: rows.length,
    hasMore: false,
    sampleHosts,
    samples: rows.slice(0, 6),
    items: rows,
  }
}

export function buildYoutubeHandoffEvidenceFromReports(reports = []) {
  const bucketMaps = {
    'public-web-resources': new Map(),
    'public-code-repos': new Map(),
    'free-communities': new Map(),
    'creator-newsletters': new Map(),
    'products-tools-to-approve': new Map(),
    'paid-auth-gates': new Map(),
  }
  const reportRows = list(reports).filter(reportIsYoutubeFullWatch)
  for (const report of reportRows) {
    for (const link of collectYoutubeReportHandoffLinks(report)) {
      routeYoutubeHandoffLink(bucketMaps, link)
    }
  }

  return {
    sourceRoute: 'intelligence_report_artifacts.structured_output_json.snapshot.videoResults[].resourceLinkSnapshot.scoperPacket',
    scannedReportCount: reportRows.length,
    buckets: Object.fromEntries(Object.entries(bucketMaps).map(([bucketId, map]) => [
      bucketId,
      summarizeYoutubeHandoffEvidenceBucket(map),
    ])),
  }
}

function creatorKeyParts(row = {}) {
  return uniqueBy([
    row.creatorId,
    row.creator,
    ...list(row.sourceCreatorIds),
    ...list(row.sourceCreators),
  ].map(value => text(value).toLowerCase()).filter(Boolean), item => item)
}

function rowMatchesCreator(row = {}, creator = {}) {
  const keys = new Set(creatorKeyParts(row))
  const creatorId = text(creator.creatorId).toLowerCase()
  const creatorName = text(creator.creator).toLowerCase()
  return Boolean((creatorId && keys.has(creatorId)) || (creatorName && keys.has(creatorName)))
}

function sourceSurfaceReadiness(rows = []) {
  const bucketRows = list(rows)
  const runnableRows = bucketRows.filter(row => row.runnable === true)
  const alreadyRunRows = bucketRows.filter(row => row.status === 'already_run_source_evidence_saved')
  const parkedRows = bucketRows.filter(row => row.runnable !== true && row.status !== 'already_run_source_evidence_saved')
  const hosts = uniqueBy(bucketRows.map(row => row.host).filter(Boolean), item => item).slice(0, 4)
  const evidenceRows = bucketRows.filter(row => row.existingRunEvidence)
  const latestProcessedAt = evidenceRows
    .map(row => text(row.existingRunEvidence?.processedAt))
    .filter(Boolean)
    .sort()
    .at(-1) || ''
  const bestEvidence = evidenceRows
    .map(row => row.existingRunEvidence)
    .sort((left, right) =>
      Number(right.valueScore?.score || 0) - Number(left.valueScore?.score || 0) ||
      Number(right.pagesRead || 0) - Number(left.pagesRead || 0) ||
      text(right.processedAt).localeCompare(text(left.processedAt))
    )[0] || null
  let status = 'not_found'
  if (runnableRows.length) status = 'ready'
  else if (alreadyRunRows.length && parkedRows.length) status = 'mixed_read_and_parked'
  else if (alreadyRunRows.length) status = 'read'
  else if (parkedRows.length) status = 'parked'
  return {
    status,
    count: bucketRows.length,
    ready: runnableRows.length,
    read: alreadyRunRows.length,
    parked: parkedRows.length,
    hosts,
    savedEvidenceCount: evidenceRows.length,
    latestProcessedAt,
    pagesRead: evidenceRows.reduce((total, row) => total + Number(row.existingRunEvidence?.pagesRead || 0), 0),
    freeResourceCaptures: evidenceRows.reduce((total, row) => total + Number(row.existingRunEvidence?.freeResourceCaptures || 0), 0),
    fileResourceCandidates: evidenceRows.reduce((total, row) => total + Number(row.existingRunEvidence?.fileResourceCandidates || 0), 0),
    blockers: evidenceRows.reduce((total, row) => total + Number(row.existingRunEvidence?.blockers || 0), 0),
    newsletterCandidates: evidenceRows.reduce((total, row) => total + Number(row.existingRunEvidence?.newsletterCandidates || 0), 0),
    paidGateEvaluations: evidenceRows.reduce((total, row) => total + Number(row.existingRunEvidence?.paidGateEvaluations || 0), 0),
    bestEvidence: bestEvidence ? {
      status: text(bestEvidence.status),
      runtimeStatus: text(bestEvidence.runtimeStatus),
      runner: text(bestEvidence.runner),
      grade: text(bestEvidence.valueScore?.grade || bestEvidence.sourceStackUpdate?.devBuildGrade || 'ungraded').toUpperCase(),
      score: Number(bestEvidence.valueScore?.score || bestEvidence.sourceStackUpdate?.devBuildScore || 0),
      surfaces: bestEvidence.sourceStackUpdate?.surfaces || {},
      nextAction: text(bestEvidence.sourceStackUpdate?.nextAction),
      processedAt: text(bestEvidence.processedAt),
    } : null,
    samples: bucketRows.slice(0, 3).map(row => ({
      url: row.url,
      host: row.host,
      status: row.status,
      runnable: row.runnable === true,
      runner: row.runner,
      evidenceStatus: text(row.existingRunEvidence?.status),
      evidenceRuntimeStatus: text(row.existingRunEvidence?.runtimeStatus),
      evidenceRunner: text(row.existingRunEvidence?.runner),
      plainEnglish: row.plainEnglish,
    })),
  }
}

function youtubeSurfaceReadiness(catchupByCreatorId = new Map(), creator = {}) {
  const catchup = catchupByCreatorId.get(text(creator.creatorId)) || {}
  const watched = Number(catchup.videoAudioVisualWatchedCount || creator.watchedVideos || 0)
  const tracked = Number(catchup.trackedMetadataCount || 0)
  const baselineGap = Number(catchup.baselineGap || 0)
  return {
    status: baselineGap > 0 ? 'needs_watch' : watched ? 'baseline_complete' : 'not_found',
    count: tracked,
    watched,
    tracked,
    parked: Number(catchup.parkedStandardCandidateCount || list(catchup.parkedStandardCandidates).length || 0),
    read: watched,
    ready: Number(catchup.pendingStandardCandidateCount || list(catchup.nextWatchCandidates).length || 0),
    hosts: ['youtube.com'],
    samples: [],
  }
}

function buildCreatorSourceStacks({
  creatorLeaderboard = [],
  sourceGodModeHandoffQueue = {},
  catchupCreators = [],
} = {}) {
  const rows = list(sourceGodModeHandoffQueue.rows)
  const catchupByCreatorId = new Map(list(catchupCreators).map(row => [text(row.creatorId), row]))
  const creatorsById = new Map()
  for (const creator of list(catchupCreators)) {
    const creatorId = text(creator.creatorId)
    if (!creatorId) continue
    creatorsById.set(creatorId, {
      creatorId,
      creator: text(creator.creator || creator.channelTitle || creator.creatorName || creatorId),
      grade: text(creator.devBuildGrade || creator.grade || 'ungraded'),
      score: Number(creator.score || 0),
      watchedVideos: Number(creator.videoAudioVisualWatchedCount || creator.watchedVideos || 0),
      buildCandidates: Number(creator.buildCandidates || creator.buildCandidateCount || 0),
    })
  }
  for (const creator of list(creatorLeaderboard)) {
    const creatorId = text(creator.creatorId)
    if (!creatorId) continue
    creatorsById.set(creatorId, {
      ...creatorsById.get(creatorId),
      ...creator,
      creatorId,
      creator: text(creator.creator || creatorsById.get(creatorId)?.creator || creatorId),
    })
  }
  const surfaceConfig = [
    ['youtube', 'YouTube', null],
    ['publicWeb', 'Public pages', 'public-web-resources'],
    ['githubRepos', 'GitHub/repos', 'public-code-repos'],
    ['newsletters', 'Newsletters', 'creator-newsletters'],
    ['freeCommunities', 'Free communities', 'free-communities'],
    ['paidAuthGates', 'Paid/auth gates', 'paid-auth-gates'],
    ['productsTools', 'Products/tools', 'products-tools-to-approve'],
  ]
  const orderedCreatorIds = new Set([
    ...list(creatorLeaderboard).map(creator => text(creator.creatorId)).filter(Boolean),
    ...list(catchupCreators).map(creator => text(creator.creatorId)).filter(Boolean),
  ])
  return [...orderedCreatorIds].map(creatorId => creatorsById.get(creatorId)).filter(Boolean).map(creator => {
    const byBucket = new Map()
    for (const [, , bucketId] of surfaceConfig) {
      if (!bucketId) continue
      byBucket.set(bucketId, rows.filter(row => row.bucketId === bucketId && rowMatchesCreator(row, creator)))
    }
    const surfaces = Object.fromEntries(surfaceConfig.map(([key, label, bucketId]) => [
      key,
      {
        label,
        ...(bucketId
          ? sourceSurfaceReadiness(byBucket.get(bucketId))
          : youtubeSurfaceReadiness(catchupByCreatorId, creator)),
      },
    ]))
    const discoveredSurfaceCount = Object.values(surfaces).filter(surface => Number(surface.count || 0) > 0 || Number(surface.watched || 0) > 0).length
    const readySurfaceCount = Object.values(surfaces).filter(surface => Number(surface.ready || 0) > 0).length
    const parkedSurfaceCount = Object.values(surfaces).filter(surface => Number(surface.parked || 0) > 0).length
    const readSurfaceCount = Object.values(surfaces).filter(surface => Number(surface.read || 0) > 0).length
    const savedEvidenceCount = Object.values(surfaces).reduce((total, surface) => total + Number(surface.savedEvidenceCount || 0), 0)
    const savedEvidenceSurfaceCount = Object.values(surfaces).filter(surface => Number(surface.savedEvidenceCount || 0) > 0).length
    return {
      creatorId: creator.creatorId,
      creator: creator.creator,
      grade: creator.devBuildGrade || creator.grade,
      score: creator.score,
      watchedVideos: creator.watchedVideos,
      buildCandidates: creator.buildCandidates,
      discoveredSurfaceCount,
      readySurfaceCount,
      readSurfaceCount,
      parkedSurfaceCount,
      savedEvidenceCount,
      savedEvidenceSurfaceCount,
      surfaces,
      sourceStackPersistence: {
        status: savedEvidenceCount ? 'saved_source_run_evidence_visible' : 'waiting_for_saved_source_runs',
        savedEvidenceCount,
        savedEvidenceSurfaceCount,
        noRawArtifactPaths: true,
      },
      plainEnglish: `${creator.creator || creator.creatorId} has ${discoveredSurfaceCount} discovered source surface(s) and ${savedEvidenceCount} saved source-run evidence row(s). YouTube is proven separately; public pages/repos/newsletters/free communities/paid gates are read from watched-video handoff evidence and persisted source-browser run metadata.`,
    }
  })
}

function previewSourceGodModeHandoffRows(rows = [], bucketCounts = {}, limit = 120) {
  const selected = []
  const seen = new Set()
  const addRow = row => {
    const key = text(row.rowId || row.url)
    if (!key || seen.has(key) || selected.length >= limit) return
    selected.push(row)
    seen.add(key)
  }
  const bucketIds = Object.keys(bucketCounts || {}).length
    ? Object.keys(bucketCounts || {})
    : uniqueBy(list(rows).map(row => row.bucketId).filter(Boolean), item => item)
  const selectors = [
    row => row.runnable === true,
    row => row.status === 'already_run_source_evidence_saved',
    row => row.requiresAuth === true,
    row => row.bucketId === 'free-communities',
    row => row.devLanePriority?.priorityBand === 'highest_signal',
    row => row.parked === true,
  ]
  for (const bucketId of bucketIds) {
    const bucketRows = list(rows).filter(row => row.bucketId === bucketId)
    for (const selector of selectors) {
      for (const row of bucketRows.filter(selector).slice(0, 4)) addRow(row)
    }
  }
  for (const row of list(rows)) addRow(row)
  return selected
}

function compactSourceGodModeHandoffQueue(queue = {}, limit = 120) {
  const rows = list(queue.rows)
  const previewRows = previewSourceGodModeHandoffRows(rows, queue.bucketCounts || {}, limit)
  return {
    ...queue,
    rows: previewRows,
    rowsArePreview: previewRows.length < rows.length,
    counts: {
      ...(queue.counts || {}),
      previewRows: previewRows.length,
    },
  }
}

function compactYoutubeHandoffEvidence(handoffEvidence = {}, sampleLimit = 12) {
  const buckets = Object.fromEntries(Object.entries(handoffEvidence.buckets || {}).map(([bucketId, bucket]) => {
    const items = list(bucket.items).length ? list(bucket.items) : list(bucket.samples)
    const previewItems = items.slice(0, sampleLimit)
    return [
      bucketId,
      {
        ...bucket,
        itemLimit: previewItems.length,
        itemsArePreview: previewItems.length < items.length,
        samples: list(bucket.samples).slice(0, Math.min(6, sampleLimit)),
        items: previewItems,
      },
    ]
  }))
  return {
    ...handoffEvidence,
    buckets,
  }
}

function compactYoutubeSourceIntelligenceSnapshot(snapshot = {}) {
  return {
    ...snapshot,
    handoffEvidence: compactYoutubeHandoffEvidence(snapshot.handoffEvidence || {}),
    sourceGodModeHandoffQueue: compactSourceGodModeHandoffQueue(snapshot.sourceGodModeHandoffQueue || {}),
  }
}

function youtubeHandoffEvidenceBucket(handoffEvidence = {}, bucketId = '') {
  return handoffEvidence?.buckets?.[bucketId] || { count: 0, sampleHosts: [], samples: [] }
}

function youtubeHandoffSourceDetail(bucket = {}) {
  const hosts = list(bucket.sampleHosts).slice(0, 3)
  if (!Number(bucket.count || 0)) return ''
  return hosts.length
    ? `${Number(bucket.count || 0)} captured from watched-video evidence, including ${hosts.join(', ')}`
    : `${Number(bucket.count || 0)} captured from watched-video evidence`
}

function buildYoutubeSourceIntelligenceSnapshot({
  foundationSnapshot = {},
  dailyWatch = {},
  catchupSnapshot = null,
  autopilotPlan = null,
  extractionEconomics = null,
  latestApiFullWatch = null,
  sourceValueGrader = null,
  directorReport = null,
  youtubeFullWatchReports = [],
  approvalReviewQueue = [],
  approvalReviewTriage = null,
  sourcePacketWorkerQueue = null,
  sourcePacketHandsQueue = null,
  sourceGodModeHandoffRunItems = [],
} = {}) {
  const discoveryJob = summarizePipelineJob(findFoundationJob(foundationSnapshot, YOUTUBE_CREATOR_DAILY_WATCH_JOB_KEY))
  const watchJob = summarizePipelineJob(findFoundationJob(foundationSnapshot, YOUTUBE_GOD_MODE_AUTONOMOUS_WATCH_SCHEDULER_JOB_KEY))
  const latestBatch = latestApiFullWatch ? {
    reportArtifactId: latestApiFullWatch.reportArtifactId || '',
    status: latestApiFullWatch.status || 'Needs source',
    updatedAt: latestApiFullWatch.updatedAt || null,
    model: latestApiFullWatch.model || '',
    videoCount: list(latestApiFullWatch.apiWatchedVideoIds).length,
    buildCandidateCount: list(latestApiFullWatch.buildCandidates).length,
    approvalRequiredLinkCount: Number(latestApiFullWatch.summary?.approvalRequiredLinkCount || list(latestApiFullWatch.actionRequiredItems).length || 0),
    resolvedPublicResourceLinkCount: Number(latestApiFullWatch.summary?.resolvedPublicResourceLinkCount || 0),
    timestampedVisualEvidenceCount: Number(latestApiFullWatch.summary?.totalTimestampedVisualEvidence || 0),
    inputArtifactIds: list(latestApiFullWatch.inputArtifactIds),
    sourceRoute: latestApiFullWatch.sourceRoute || '',
  } : null
  const postRunLedger = classifyPostRunLedgerStatus({ latestBatch, watchJob })
  const latestBatchPersistedAfterRun = postRunLedger.latestBatchPersistedAfterRun
  const watchRunNeedsLedgerRepair = postRunLedger.watchRunNeedsLedgerRepair
  const watchStageStatus = postRunLedger.status
  const catchupSummary = catchupSnapshot?.summary || {}
  const approvalSummary = approvalReviewTriage?.summary || {}
  const activeYoutubeCreatorIds = new Set(list(catchupSnapshot?.creators).map(row => text(row.creatorId)).filter(Boolean))
  const creatorLeaderboard = buildCreatorLeaderboard(sourceValueGrader)
    .filter(row => !activeYoutubeCreatorIds.size || activeYoutubeCreatorIds.has(text(row.creatorId)))
  const sourceGradeCount = list(sourceValueGrader?.sourceGrades).length
  const topCreators = creatorLeaderboard.slice(0, 12)
  const selectedVideos = list(autopilotPlan?.selectedVideos).slice(0, 12).map(video => ({
    videoId: video.videoId || '',
    title: video.title || '',
    creatorId: video.creatorId || '',
    creator: video.creator || video.creatorId || '',
    url: video.url || '',
    sourceGrade: video.sourceGrade || video.overallGrade || 'ungraded',
    nextWatchAction: video.nextWatchAction || '',
    sourceSopReadiness: list(video.sourceSopReadiness),
  }))
  const rejectedReasonCounts = list(autopilotPlan?.rejectedVideos).reduce((acc, video) => {
    const reason = text(video.reason || 'filtered')
    acc[reason] = (acc[reason] || 0) + 1
    return acc
  }, {})
  for (const video of list(catchupSnapshot?.creators).flatMap(row => list(row.parkedStandardCandidates))) {
    const reason = text(video.reason || 'parked_before_spend')
    rejectedReasonCounts[reason] = (rejectedReasonCounts[reason] || 0) + 1
  }
  const autopilotSelectedVideoCount = list(autopilotPlan?.selectedVideos).length
  const autopilotRejectedVideoCount = list(autopilotPlan?.rejectedVideos).length
  const pendingStandardVideoCount = Number(catchupSummary.pendingStandardVideoCount || 0)
  const parkedStandardVideoCount = Number(catchupSummary.parkedStandardVideoCount || 0)
  const providerBlockedVideoCount = Number(catchupSummary.providerBlockedVideoCount || 0)
  const deepVisualReview = buildYoutubeDeepVisualReviewSummary(youtubeFullWatchReports)
  const handoffEvidence = buildYoutubeHandoffEvidenceFromReports(youtubeFullWatchReports)
  const publicWebEvidence = youtubeHandoffEvidenceBucket(handoffEvidence, 'public-web-resources')
  const publicRepoEvidence = youtubeHandoffEvidenceBucket(handoffEvidence, 'public-code-repos')
  const freeCommunityEvidence = youtubeHandoffEvidenceBucket(handoffEvidence, 'free-communities')
  const newsletterEvidence = youtubeHandoffEvidenceBucket(handoffEvidence, 'creator-newsletters')
  const productEvidence = youtubeHandoffEvidenceBucket(handoffEvidence, 'products-tools-to-approve')
  const paidAuthEvidence = youtubeHandoffEvidenceBucket(handoffEvidence, 'paid-auth-gates')
  const publicWebCount = Math.max(approvalTriageBucketCount(approvalReviewTriage, 'public_web'), Number(publicWebEvidence.count || 0))
  const publicRepoCount = Math.max(approvalTriageBucketCount(approvalReviewTriage, 'public_repos'), Number(publicRepoEvidence.count || 0))
  const freeCommunityCount = Math.max(
    Number(catchupSummary.freeCommunityPacketCount || 0),
    approvalTriageBucketCount(approvalReviewTriage, 'free_or_community'),
    Number(freeCommunityEvidence.count || 0),
  )
  const purchaseCandidateCount = Math.max(
    approvalTriageBucketCount(approvalReviewTriage, 'purchase_candidate') +
      approvalQueueKeywordCount(approvalReviewQueue, ['product', 'purchase', 'checkout', 'buy', 'gumroad', 'software', 'tool']),
    Number(productEvidence.count || 0),
  )
  const paidAuthGateCount = Math.max(
    Number(catchupSummary.paidGatePacketCount || 0),
    approvalTriageBucketCount(approvalReviewTriage, 'paid_or_auth_gate') ||
    Number(approvalSummary.requiresAuthCount || 0),
    Number(paidAuthEvidence.count || 0),
  )
  const newsletterCount = Math.max(
    approvalQueueKeywordCount(approvalReviewQueue, ['newsletter', 'substack', 'beehiiv', 'mailerlite', 'convertkit']),
    Number(newsletterEvidence.count || 0),
  )
  const handoffBuckets = [
    buildHandoffBucket({
      bucketId: 'public-web-resources',
      label: 'Public pages/resources',
      count: publicWebCount,
      status: publicWebCount ? 'captured_from_video_evidence' : 'empty_or_auto_filtered',
      description: 'Public/free pages and resources found from YouTube that should hand off to the public resource worker instead of staying stuck in YouTube.',
      route: sourcePacketWorkerQueue?.route || '/api/foundation/dev-team-hub/source-packet-worker-queue',
      evidenceCount: publicWebEvidence.count,
      sampleHosts: publicWebEvidence.sampleHosts,
      sourceDetail: youtubeHandoffSourceDetail(publicWebEvidence),
    }),
    buildHandoffBucket({
      bucketId: 'public-code-repos',
      label: 'Public code repos',
      count: publicRepoCount,
      status: publicRepoCount ? 'ready_for_repo_read_lane' : 'none_found',
      description: 'GitHub/repos and code resources should hand off to the repo/source-code lane for read-only implementation pattern extraction.',
      route: 'github-public-repo-source-lane',
      evidenceCount: publicRepoEvidence.count,
      sampleHosts: publicRepoEvidence.sampleHosts,
      sourceDetail: youtubeHandoffSourceDetail(publicRepoEvidence),
    }),
    buildHandoffBucket({
      bucketId: 'free-communities',
      label: 'Free communities',
      count: freeCommunityCount,
      status: freeCommunityCount ? 'session_broker_required' : 'none_found',
      description: 'Free Skool/community links should hand off to the community SOP after the Source Session Broker/source identity exists: free areas only, last 20 days, resources/courses, no posting or paid/private access.',
      route: 'source-session-broker + skool-free-community-runner',
      evidenceCount: freeCommunityEvidence.count,
      sampleHosts: freeCommunityEvidence.sampleHosts,
      sourceDetail: youtubeHandoffSourceDetail(freeCommunityEvidence),
    }),
    buildHandoffBucket({
      bucketId: 'creator-newsletters',
      label: 'Creator newsletters',
      count: newsletterCount,
      status: newsletterCount ? 'needs_newsletter_intake' : 'planned',
      description: 'Newsletter signups should hand off to the newsletter source lane and source inbox, then feed the creator source stack.',
      route: 'AIOS Sources/Newsletters',
      evidenceCount: newsletterEvidence.count,
      sampleHosts: newsletterEvidence.sampleHosts,
      sourceDetail: youtubeHandoffSourceDetail(newsletterEvidence),
    }),
    buildHandoffBucket({
      bucketId: 'products-tools-to-approve',
      label: 'Products/tools to approve',
      count: purchaseCandidateCount,
      status: purchaseCandidateCount ? 'approval_required' : 'none_found',
      description: 'Products, tools, purchases, downloads, and checkout paths are scored for value and routed to approval with the why before any buy/form/download action.',
      route: 'approval-review',
      evidenceCount: productEvidence.count,
      sampleHosts: productEvidence.sampleHosts,
      sourceDetail: youtubeHandoffSourceDetail(productEvidence),
    }),
    buildHandoffBucket({
      bucketId: 'paid-auth-gates',
      label: 'Paid/auth gates',
      count: paidAuthGateCount,
      status: paidAuthGateCount ? 'approval_required' : 'none_found',
      description: 'Paid courses, login/auth, private communities, and gated training stop here until Steve approves the exact source packet and auth boundary.',
      route: 'approval-review',
      evidenceCount: paidAuthEvidence.count,
      sampleHosts: paidAuthEvidence.sampleHosts,
      sourceDetail: youtubeHandoffSourceDetail(paidAuthEvidence),
    }),
    buildHandoffBucket({
      bucketId: 'build-scoper',
      label: 'Build Scoper',
      count: list(directorReport?.recommendedBuildNow).length + list(directorReport?.strongNext).length,
      status: list(directorReport?.recommendedBuildNow).length ? 'ready_for_review' : 'waiting_for_synthesis',
      description: 'Synthesized build ideas remain proposal-only until Scoper turns them into approval-ready backlog cards.',
      route: directorReport?.sourceRoute || '',
    }),
  ]
  const sourceGodModeHandoffQueue = buildSourceGodModeYoutubeHandoffQueue({
    handoffEvidence,
    generatedAt: catchupSnapshot?.generatedAt || new Date().toISOString(),
    rowLimit: 0,
    sourceValueGrader,
    runItems: sourceGodModeHandoffRunItems,
  })
  const sourceRunSummary = buildSourceBrowserRunSummary(sourceGodModeHandoffRunItems)
  sourceGodModeHandoffQueue.sourceRunSummary = sourceRunSummary
  const repoReadback = sourceRunSummary.repoReadback || {}
  const savedRepoDeepReviewRuns = Number(repoReadback.repoReadbackReadyRuns || repoReadback.runCount || 0)
  const savedRepoImplementationSignals = Number(repoReadback.implementationSignalCount || 0)
  const creatorSourceStacks = buildCreatorSourceStacks({
    creatorLeaderboard,
    sourceGodModeHandoffQueue,
    catchupCreators: catchupSnapshot?.creators || [],
  })
  const sourceGodModeHandoffCounts = sourceGodModeHandoffQueue.counts || {}
  const readySourceHandoffRows = Number(sourceGodModeHandoffCounts.runnableRows || 0)
  const parkedSourceHandoffRows = Number(sourceGodModeHandoffCounts.parkedRows || 0)
  const baselineComplete = Number(catchupSummary.baselineIncompleteCount || 0) === 0
  const sourceFollowupRunCount = Number(catchupSummary.sourceFollowupRunCount || 0)
  const sourceFollowupRunMappedVideoCount = Number(catchupSummary.sourceFollowupRunMappedVideoCount || 0)
  const longCoursePendingCount = Number(catchupSummary.longCoursePendingCount || 0)
  const buildPromotionStatus = catchupSnapshot?.buildPromotionReadiness?.status || 'unknown'
  const stageCards = [
    {
      stageId: 'discover',
      label: 'Discover',
      status: dailyWatch.status || discoveryJob.status,
      title: 'Creator/video discovery',
      summary: `${Number(catchupSummary.creatorCount || 0)} creators · ${Number(catchupSummary.trackedMetadataCount || 0)} tracked videos`,
      latestRunAt: discoveryJob.latestRunAt || dailyWatch.latestJobRun?.finishedAt || dailyWatch.latestJobRun?.startedAt || null,
      detail: discoveryJob.statusDetail || discoveryJob.scheduleDetail || '',
    },
    {
      stageId: 'watch',
      label: 'Watch',
      status: watchStageStatus,
      title: 'Video/audio/visual extraction',
      summary: autopilotSelectedVideoCount
        ? `${Number(catchupSummary.videoAudioVisualWatchedCount || 0)} watched · ${autopilotSelectedVideoCount} eligible now · ${parkedStandardVideoCount} parked/no-spend · ${providerBlockedVideoCount} provider-blocked`
        : `${Number(catchupSummary.videoAudioVisualWatchedCount || 0)} watched · ${pendingStandardVideoCount} eligible standard videos · ${parkedStandardVideoCount} parked/no-spend · ${providerBlockedVideoCount} provider-blocked`,
      latestRunAt: latestBatch?.updatedAt || watchJob.latestRunAt || null,
      detail: latestBatch
        ? `${latestBatch.videoCount} videos and ${latestBatch.buildCandidateCount} ideas in latest batch${watchRunNeedsLedgerRepair ? '; scheduler ledger needs review' : ''}`
        : autopilotRejectedVideoCount
          ? `${autopilotRejectedVideoCount} current candidates filtered before spend`
          : watchJob.statusDetail,
    },
    {
      stageId: 'deep-visual',
      label: 'Deep',
      status: deepVisualReview.status,
      title: 'Deep visual screen/code review',
      summary: `${deepVisualReview.reviewedVideoCount} deep-reviewed · ${deepVisualReview.missedByStandardCount} missed-by-standard notes`,
      latestRunAt: deepVisualReview.latestRunAt,
      detail: deepVisualReview.reportCount
        ? `${deepVisualReview.visibleCodeOrToolingCount} screen/code/tooling details and ${deepVisualReview.buildCandidateCount} deep visual build ideas captured`
        : 'Hot videos from the standard watcher route here immediately; historical top-50 backfill runs in bounded batches.',
    },
    {
      stageId: 'page-resource',
      label: 'Read',
      status: Number(catchupSummary.fullPageEvidenceCount || 0) ? 'working' : 'waiting',
      title: 'Page, description, resources',
      summary: `${Number(catchupSummary.fullPageEvidenceCount || 0)} page proofs · ${Number(catchupSummary.sourcePacketActionCount || 0)} handoff actions`,
      latestRunAt: latestBatch?.updatedAt || null,
      detail: `${Number(catchupSummary.rejectedNoisePacketCount || 0)} noisy links filtered before review`,
    },
    {
      stageId: 'handoff',
      label: 'Handoff',
      status: readySourceHandoffRows ? 'working' : handoffBuckets.some(bucket => bucket.count > 0 && bucket.status !== 'empty_or_auto_filtered') ? 'waiting' : 'clear',
      title: 'Downstream source handoffs',
      summary: `${readySourceHandoffRows} public/free rows ready · ${parkedSourceHandoffRows} parked · ${sourceFollowupRunCount} source follow-up runs`,
      latestRunAt: latestBatch?.updatedAt || null,
      detail: `Public resources, repos, newsletters, and free communities now route to bounded source-browser workers; ${sourceFollowupRunMappedVideoCount} watched videos have mapped follow-up run evidence. Paid/auth/product and Scoper paths stay separated.`,
    },
    {
      stageId: 'grade',
      label: 'Grade',
      status: sourceValueGrader?.status || 'Needs source',
      title: 'Creator/source grading',
      summary: `${creatorLeaderboard.length} active graded creators${sourceGradeCount !== creatorLeaderboard.length ? ` · ${sourceGradeCount} historical grade rows` : ''} · ${Number(catchupSummary.ungradedCount || 0)} ungraded`,
      latestRunAt: sourceValueGrader?.updatedAt || null,
      detail: 'Grades decide whether to watch deeper, sample, throttle, or park the source.',
    },
    {
      stageId: 'synthesize',
      label: 'Synthesize',
      status: directorReport?.status || 'Needs source',
      title: 'Director synthesis',
      summary: `${list(directorReport?.rankedCandidates).length} ranked ideas · ${list(directorReport?.recommendedBuildNow).length} build-now`,
      latestRunAt: directorReport?.updatedAt || null,
      detail: 'Ideas stay proposal-only until Scoper creates a scoped backlog-ready card.',
    },
  ]
  const executiveSummary = {
    title: 'Current chain truth',
    currentState: [
      baselineComplete
        ? 'Working now: public YouTube discovery, exact-video full-watch baseline, page/description/resource evidence, safe public resource metadata, source-browser handoff queueing, creator grading, and Director synthesis. The approved-creator latest-10 baseline is complete for the currently tracked public rows.'
        : 'Working now: public YouTube discovery, exact-video full-watch batches, page/description/resource evidence, safe public resource metadata, source-browser handoff queueing, creator grading, and Director synthesis.',
      savedRepoDeepReviewRuns
        ? `Repo readback: ${savedRepoDeepReviewRuns} read-only repo deep-review run(s) are saved with ${savedRepoImplementationSignals} implementation signal(s). Remaining repo work is review/source-stack promotion and monitoring, not basic repo-read capability.`
        : 'Repo readback: no saved repo deep-review runs yet; public repo links still need the read-only repo lane before any implementation/import decision.',
      'Not yet automatic: scheduled downstream newsletter signup, scheduled free-community crawling, repo review/source-stack promotion, paid/auth course extraction, YouTube long-course/full-training extraction, and Director-to-Scoper promotion.',
      `Current blocker: ${buildPromotionStatus}. ${readySourceHandoffRows} runnable source handoff rows remain; ${sourceFollowupRunCount} source follow-up run(s) are saved; ${parkedSourceHandoffRows} rows are parked behind source-specific lanes, auth/session boundaries, social/profile policy, or approval.`,
    ],
    workingSteps: [
      {
        label: '1. Discover',
        detail: `${Number(catchupSummary.creatorCount || 0)} approved creators and ${Number(catchupSummary.trackedMetadataCount || 0)} public video rows are tracked from YouTube metadata.`,
      },
      {
        label: '2. New Creator Intake',
        detail: 'When Steve gives a new creator, add the channel to the watchlist, prioritize the exact seed video Steve sent, then watch enough of the latest public videos to build a latest-10 evidence baseline and source grade.',
      },
      {
        label: '3. Watch',
        detail: `The scheduler selects exact public/no-auth videos and the Gemini video route watches/listens for audio, screen, UI, workflow, and visual evidence. Latest batch: ${Number(latestBatch?.videoCount || 0)} videos, ${Number(latestBatch?.timestampedVisualEvidenceCount || 0)} timestamped visual notes, ${Number(latestBatch?.buildCandidateCount || 0)} build ideas.`,
      },
      {
        label: '4. Deep Visual',
        detail: `Screen/code/UI-heavy videos route immediately into the deep visual lane. Current proof: ${deepVisualReview.reviewedVideoCount} videos deep-reviewed, ${deepVisualReview.visibleCodeOrToolingCount} exact screen/code/tooling details, ${deepVisualReview.missedByStandardCount} notes that the standard pass may miss.`,
      },
      {
        label: '5. Read Page',
        detail: `The runner reads the public YouTube page evidence: title, description/resource links, caption availability, viewport screenshot evidence, and transcript artifacts when available. It is not transcript-only and it does not use comments.`,
      },
      {
        label: '6. Resolve Links',
        detail: `Safe public links are resolved as read-only metadata, then public/free pages, repos, newsletters, and free communities enter the bounded source-browser handoff queue. Paid/auth/product/login links stay parked. Latest batch found ${Number(latestBatch?.resolvedPublicResourceLinkCount || 0)} public resources and ${Number(latestBatch?.approvalRequiredLinkCount || 0)} approval-required links.`,
      },
      {
        label: '7. Grade And Promote',
        detail: 'Full-watch output refreshes the source grader and Dev Intelligence Director. Ideas stay proposal-only until Scoper turns them into approval-ready backlog cards.',
      },
      {
        label: '8. Route Courses',
        detail: longCoursePendingCount
          ? `${longCoursePendingCount} public long-course/full-training videos are routed out of the standard short-video lane. They need the bounded long-course extractor so multi-hour trainings produce course maps, implementation plans, resources, and build candidates.`
          : '0 public long-course/full-training videos are currently ready in the routed queue. The bounded long-course extractor remains the lane for future multi-hour trainings, course maps, implementation plans, resources, and build candidates.',
      },
    ],
    openGaps: [
      'Director does not yet hand build ideas to Scoper automatically.',
      'New creator intake should become a first-class workflow: seed video plus latest-10 baseline, grade, then S/A continue to latest-20 and daily monitoring.',
      'Deep visual review is now wired and proven, but the historical top-50 backfill still needs bounded batches beyond the first live proof.',
      longCoursePendingCount
        ? 'YouTube long-course/full-training videos are visible but not yet running as the regular autonomous course extractor lane.'
        : 'YouTube long-course/full-training has no ready routed videos right now, but the autonomous course extractor lane still needs scheduled hardening for future course-style videos.',
      readySourceHandoffRows
        ? 'YouTube-discovered public/free links have runnable source-browser handoff rows; production scheduling, persistence into source stacks, and downstream ingestion still need hardening.'
        : savedRepoDeepReviewRuns
          ? 'YouTube-discovered public/free link handoff is drained for currently runnable rows; repo evidence has saved read-only packets, while remaining source work is parked behind newsletter/community workers, source-stack promotion, session broker, social/profile policy, and approval boundaries.'
          : 'YouTube-discovered public/free link handoff is drained for currently runnable rows; remaining source work is parked behind source-specific lanes, source-stack ingestion, session broker, repo/newsletter/community workers, and approval boundaries.',
      `Source follow-up readback is visible now: ${sourceFollowupRunCount} saved source-browser run(s), ${sourceFollowupRunMappedVideoCount} mapped back to watched videos. This is progress evidence, not a full God Mode claim.`,
      'Newsletter signup is detected but not submitted until the source-identity signup lane is built; paid/auth/product rows remain parked.',
      'Auth, purchases, downloads, comments, posting, and paid/private content stay outside this YouTube lane until the source-specific worker is built and approved.',
    ],
    nextBuilds: [
      baselineComplete
        ? 'Keep daily YouTube autopilot current for new videos and new creators; the current approved-creator latest-10 public video/audio/visual baseline is complete.'
        : 'Keep autonomous YouTube catch-up running until every approved creator has the latest-10 public video/audio/visual baseline.',
      'Make new-creator intake explicit in the UI/API: seed video first, latest-10 baseline, S/A continue to 20, B sample cautiously, C/D park or throttle.',
      'Run the `YOUTUBE-DEEP-VISUAL-REVIEW-LANE-001` historical top-50 backfill in bounded batches while future standard watcher runs hand hot videos to deep visual immediately.',
      'Run and harden `YOUTUBE-LONG-COURSE-FULL-WATCH-LANE-001` as the bounded public YouTube course extractor for full trainings, long videos, and course-style builds.',
      'Harden the YouTube source-browser handoff runner as a scheduled production lane that records source-stack outputs and keeps paid/auth/product rows parked.',
      savedRepoDeepReviewRuns
        ? 'Build the remaining downstream workers: newsletter signup intake, repo packet review/source-stack promotion, paid/auth source-session runner, and safe file/download policy.'
        : 'Build the remaining downstream workers: newsletter signup intake, repo deep review ingestion, paid/auth source-session runner, and safe file/download policy.',
      'Wire Director-to-Scoper proposal handoff so the best synthesized build ideas become approval-ready cards without manual copy work.',
    ],
  }

  return {
    status: watchRunNeedsLedgerRepair
      ? 'post_run_review_needed'
      : watchJob.latestRunStatus === 'failed'
        ? 'watch_failed'
      : watchJob.due
        ? 'due'
        : watchJob.status || 'ready',
    title: 'YouTube Source Intelligence System',
    sourceRoute: 'Foundation jobs + YouTube catch-up readback + latest full-watch report + source grader + Director',
    liveJob: watchJob,
    discoveryJob,
    latestBatch,
    watchRunNeedsLedgerRepair,
    summary: {
      creatorCount: Number(catchupSummary.creatorCount || 0),
      trackedMetadataCount: Number(catchupSummary.trackedMetadataCount || 0),
      watchedVideoCount: Number(catchupSummary.videoAudioVisualWatchedCount || 0),
      pendingStandardVideoCount: Number(catchupSummary.pendingStandardVideoCount || 0),
      eligibleStandardVideoCount: autopilotSelectedVideoCount,
      parkedStandardVideoCount,
      providerBlockedVideoCount,
      filteredStandardCandidateCount: Math.max(parkedStandardVideoCount, autopilotRejectedVideoCount),
      baselineCompleteCount: Number(catchupSummary.baselineCompleteCount || 0),
      baselineIncompleteCount: Number(catchupSummary.baselineIncompleteCount || 0),
      fullWatchReportCount: Number(catchupSummary.fullWatchReportCount || 0),
      deepVisualReviewCount: deepVisualReview.reportCount,
      deepVisualReviewedVideoCount: deepVisualReview.reviewedVideoCount,
      deepVisualMissedByStandardCount: deepVisualReview.missedByStandardCount,
      buildIdeaCount: Number(extractionEconomics?.ideaCount || 0),
      estimatedSpendUsd: Number(extractionEconomics?.estimatedSpendUsd || 0),
      costPerIdeaUsd: extractionEconomics?.costPerIdeaUsd ?? null,
      approvalReviewCount: list(approvalReviewQueue).length,
      sourcePacketActionCount: Number(catchupSummary.sourcePacketActionCount || 0),
      sourceFollowupRunCount,
      sourceFollowupRunMappedVideoCount,
    },
    stages: stageCards,
    selectedVideos,
    rejectedReasonCounts,
    deepVisualReview,
    handoffBuckets,
    handoffEvidence,
    sourceGodModeHandoffQueue,
    creatorSourceStacks,
    creatorLeaderboard,
    topCreators,
    creatorGradeBuckets: gradeBucketCounts(creatorLeaderboard, { gradeAccessor: row => row.devBuildGrade || row.grade }),
    readbackTruth: {
      sourceGradeCount,
      creatorLeaderboardCount: creatorLeaderboard.length,
      topCreatorPreviewCount: topCreators.length,
      topCreatorsArePreview: topCreators.length > 0 && topCreators.length < creatorLeaderboard.length,
      sourceGraderReadback: buildSourceGraderReadbackTruth(sourceValueGrader),
      fullWatchReportReadbackCount: list(youtubeFullWatchReports).length,
      fullWatchReportReadbackRoute: 'listYoutubeFullWatchReportArtifacts({ limit: 500 })',
      geminiCallReadbackRoute: "listLlmCalls({ provider: 'gemini', workload: 'video_vision', status: 'succeeded', limit: 5000 })",
      postRunLedger,
    },
    economics: extractionEconomics || {},
    buildPromotionReadiness: catchupSnapshot?.buildPromotionReadiness || null,
    executiveSummary,
    generatedAt: catchupSnapshot?.generatedAt || null,
  }
}

function approvalLinkTone(item = {}) {
  const classification = text(item.classification || item.blocker || item.reason).toLowerCase()
  const host = text(item.host).toLowerCase()
  if (host.includes('skool') || classification.includes('course') || classification.includes('community') || classification.includes('paid') || classification.includes('auth')) return 'source packet'
  if (host.includes('gumroad') || classification.includes('download') || classification.includes('purchase')) return 'download/purchase'
  if (host.includes('bit.ly') || host.includes('tinyurl') || host.includes('t.co')) return 'short link'
  if (host.includes('linkedin') || host.includes('instagram') || host.includes('x.com') || host.includes('tiktok')) return 'social'
  return 'public web'
}

function approvalLinkIsSystemNoise(item = {}) {
  const host = text(item.host).toLowerCase()
  return host === 'accounts.google.com' || host === 'support.google.com'
}

function resourceLinkNeedsOperatorReview(item = {}) {
  const classification = classifyYoutubeResourceLink(item)
  return classification.approvalRequired === true
}

function sourcePacketPreviewNeedsOperatorReview(packet = {}) {
  return !(packet.currentResolverCanResolve === true && packet.currentResolverApprovalRequired === false)
}

function buildApprovalReviewQueue({
  latestApiFullWatch = null,
  markApiFullWatch = null,
  youtubeSourcePacketReviewQueue = [],
} = {}) {
  const evidenceRows = uniqueBy(list(youtubeSourcePacketReviewQueue)
    .filter(item => /^https?:\/\//i.test(text(item.url)) && !approvalLinkIsSystemNoise(item))
    .map(item => {
      const sourcePacketPreview = item.sourcePacketPreview || buildSourcePacketPreview(item)
      return {
        ...item,
        url: item.url || sourcePacketPreview.exactUrl || '',
        host: item.host || sourcePacketPreview.host || '',
        type: item.type || sourcePacketPreview.sourceType || sourcePacketPreview.sourceFamily || approvalLinkTone(item),
        reason: item.reason || sourcePacketPreview.reason || 'Needs source-packet review before the system reads this link.',
        decisionNeeded: item.decisionNeeded || sourcePacketPreview.plainEnglish || 'Approve exact source follow-up or reject.',
        sourcePacketId: item.sourcePacketId || sourcePacketPreview.sourcePacketId || '',
        sourcePacketPreview,
        sourcePacketValidation: item.sourcePacketValidation || validateSourcePacketPreview(sourcePacketPreview),
      }
    }), item => `${item.url}|${item.sourcePacketPreview?.proposedDecision || item.proposedDecision || ''}`)
    .filter(item => sourcePacketPreviewNeedsOperatorReview(item.sourcePacketPreview))
  const sourceReports = uniqueBy([latestApiFullWatch, markApiFullWatch].filter(Boolean), item => item.reportArtifactId)
  const legacyRows = sourceReports.flatMap(report => {
    return list(report.actionRequiredItems)
      .filter(item => item.type === 'approval_required_resource_link')
      .filter(item => !approvalLinkIsSystemNoise(item))
      .filter(item => resourceLinkNeedsOperatorReview(item))
      .map(item => {
        const row = {
          url: item.url || '',
          host: item.host || '',
          type: approvalLinkTone(item),
          sourceVideoId: item.sourceVideoId || '',
          sourceUrl: item.sourceUrl || '',
          reason: item.reason || item.blocker || 'Needs approval before the system reads this link.',
          decisionNeeded: item.allowedNextDecision || 'Approve exact source follow-up or reject.',
          reportArtifactId: report.reportArtifactId,
          reportTitle: report.title,
        }
        const sourcePacketPreview = buildSourcePacketPreview(row)
        return {
          ...row,
          sourcePacketId: sourcePacketPreview.sourcePacketId,
          sourcePacketPreview,
          sourcePacketValidation: validateSourcePacketPreview(sourcePacketPreview),
        }
      })
  })
  return uniqueBy(
    [...evidenceRows, ...legacyRows].filter(item => /^https?:\/\//i.test(text(item.url))),
    item => `${item.url}|${item.sourcePacketPreview?.proposedDecision || item.proposedDecision || ''}`,
  ).slice(0, 24)
}

const APPROVAL_REVIEW_TRIAGE_BUCKETS = [
  {
    bucketId: 'public_web',
    label: 'Public pages',
    plainEnglish: 'Exact public pages can run only after the packet is recorded; no forms, downloads, login, or adjacent crawl.',
    nextAction: 'Approve exact public read or reject.',
  },
  {
    bucketId: 'public_repos',
    label: 'GitHub / repos',
    plainEnglish: 'Public code/resource repos can become read-only metadata/code-review packets after approval.',
    nextAction: 'Approve repo read packet or hold for repo registry.',
  },
  {
    bucketId: 'free_or_community',
    label: 'Free communities',
    plainEnglish: 'Free/community areas need an exact source packet before any browser worker reads posts, courses, or resources.',
    nextAction: 'Define allowed free areas before run.',
  },
  {
    bucketId: 'paid_or_auth_gate',
    label: 'Paid / auth gates',
    plainEnglish: 'Paid, private, login, checkout, form, and training sources do not run until Steve approves credentials, scope, and stop rules.',
    nextAction: 'Hold or create source-specific packet.',
  },
  {
    bucketId: 'purchase_candidate',
    label: 'Buy later candidates',
    plainEnglish: 'No worker runs. These are scored for whether the source is worth buying.',
    nextAction: 'Park for purchase evaluation.',
  },
  {
    bucketId: 'manual_packet',
    label: 'Needs packet split',
    plainEnglish: 'The link is too broad or ambiguous; split it into an exact source packet before any worker can use it.',
    nextAction: 'Clarify exact allowed source scope.',
  },
  {
    bucketId: 'rejected_noise',
    label: 'Rejected noise',
    plainEnglish: 'No worker runs. Noise stays rejected so it does not keep resurfacing.',
    nextAction: 'No extraction work.',
  },
  {
    bucketId: 'invalid',
    label: 'Invalid / unsafe',
    plainEnglish: 'Invalid or failed packet previews cannot run.',
    nextAction: 'Repair or reject.',
  },
]

function approvalReviewTriageBucketId(item = {}) {
  const packet = item.sourcePacketPreview || {}
  const runtime = packet.runtimePlan || {}
  const url = text(packet.exactUrl || item.url)
  const family = text(packet.sourceFamily || item.sourceFamily)
  const decision = text(packet.proposedDecision || item.proposedDecision)
  if (!/^https?:\/\//i.test(url) || item.sourcePacketValidation?.ok === false) return 'invalid'
  if (family === 'system_noise' || decision === 'reject_noise') return 'rejected_noise'
  if (family === 'github') return 'public_repos'
  if (runtime.runnableAfterPacket === true || family === 'public_web' || ['approve_public_free_read', 'approve_sales_page_review'].includes(decision)) return 'public_web'
  if (decision === 'park_purchase_candidate') return 'purchase_candidate'
  if (
    runtime.requiresAuth === true ||
    ['hold_paid_private', 'approve_paid_source_access', 'approve_login_bounded_read'].includes(decision) ||
    ['myicor', 'purchase_or_checkout', 'form_or_booking'].includes(family)
  ) return 'paid_or_auth_gate'
  if (decision === 'approve_free_community_bounded_read' || ['skool', 'community_or_course'].includes(family)) return 'free_or_community'
  return 'manual_packet'
}

function buildApprovalReviewTriage(queue = []) {
  const buckets = new Map(APPROVAL_REVIEW_TRIAGE_BUCKETS.map(bucket => [bucket.bucketId, {
    ...bucket,
    count: 0,
    runnableAfterPacketCount: 0,
    sourceSpecificApprovalRequiredCount: 0,
    requiresAuthCount: 0,
    validationFailureCount: 0,
    startsImmediatelyCount: 0,
    startsFromApprovalActionCount: 0,
    externalWriteCount: 0,
    backlogWriteCount: 0,
    samples: [],
  }]))

  for (const item of list(queue)) {
    const packet = item.sourcePacketPreview || {}
    const runtime = packet.runtimePlan || {}
    const bucket = buckets.get(approvalReviewTriageBucketId(item)) || buckets.get('manual_packet')
    bucket.count += 1
    if (runtime.runnableAfterPacket === true && item.sourcePacketValidation?.ok !== false) bucket.runnableAfterPacketCount += 1
    if (runtime.sourceSpecificApprovalRequired === true) bucket.sourceSpecificApprovalRequiredCount += 1
    if (runtime.requiresAuth === true) bucket.requiresAuthCount += 1
    if (item.sourcePacketValidation?.ok === false) bucket.validationFailureCount += 1
    if (runtime.startsImmediately === true) bucket.startsImmediatelyCount += 1
    if (runtime.startsFromApprovalAction === true) bucket.startsFromApprovalActionCount += 1
    if (runtime.externalWrites === true || packet.externalWrites === true) bucket.externalWriteCount += 1
    if (runtime.writesBacklog === true || packet.writesBacklog === true) bucket.backlogWriteCount += 1
    if (bucket.samples.length < 3) {
      bucket.samples.push({
        host: text(packet.host || item.host),
        url: text(packet.exactUrl || item.url),
        sourceFamily: text(packet.sourceFamily || item.sourceFamily),
        proposedDecision: text(packet.proposedDecision || item.proposedDecision),
      })
    }
  }

  const rows = Array.from(buckets.values())
  const sum = key => rows.reduce((total, row) => total + number(row[key], 0), 0)
  return {
    totalReviewRows: list(queue).length,
    bucketCount: rows.filter(row => row.count > 0).length,
    rows,
    summary: {
      runnableAfterPacketCount: sum('runnableAfterPacketCount'),
      sourceSpecificApprovalRequiredCount: sum('sourceSpecificApprovalRequiredCount'),
      requiresAuthCount: sum('requiresAuthCount'),
      validationFailureCount: sum('validationFailureCount'),
      startsImmediatelyCount: sum('startsImmediatelyCount'),
      startsFromApprovalActionCount: sum('startsFromApprovalActionCount'),
      externalWriteCount: sum('externalWriteCount'),
      backlogWriteCount: sum('backlogWriteCount'),
      rejectedNoiseCount: number(buckets.get('rejected_noise')?.count, 0),
      invalidCount: number(buckets.get('invalid')?.count, 0),
    },
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
  youtubeCreatorGodModeCatchup = null,
  currentSprint = {},
} = {}) {
  const researchPool = normalizeResearchPool(dailyWatch.researchPool)
  const apiVideos = list(markApiFullWatch?.videoResults)
  const apiWatchedVideoIds = list(markApiFullWatch?.apiWatchedVideoIds)
  const markCatchupRow = list(youtubeCreatorGodModeCatchup?.creators)
    .find(row => row.creatorId === YOUTUBE_CREATOR_DAILY_WATCH_MARK_CREATOR_ID) || null
  const acceptedApiWatchedCount = apiWatchedVideoIds.length
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
  const acceptedApiVisualEvidenceFloor = acceptedApiWatchedCount ? acceptedApiWatchedCount * 3 : 0
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
    apiFullWatchVideos: acceptedApiWatchedCount || completedPoolCount || apiWatchedVideoIds.length || apiVideos.length,
    apiFullWatchBuildCandidates: Number(markApiFullWatch?.cumulativeBuildCandidateCount || 0) || list(markApiFullWatch?.buildCandidates).length,
    apiFullWatchTimestampedVisualEvidence: Math.max(latestApiVisualEvidence, acceptedApiVisualEvidenceFloor),
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
  markBaselineApiFullWatchBundle = {},
  latestApiFullWatchBundle = {},
  directorBundle = {},
  sourceValueGraderBundle = {},
  geminiVideoReviewCalls = [],
  youtubeFullWatchReports = null,
  sourcePacketWorkerQueue = null,
  sourcePacketWorkerRunItems = [],
  sourcePacketHandsQueue = null,
  sourceGodModeHandoffRunItems = [],
  actionRouter = {},
  currentSprint = {},
  extractionControl = {},
  devDirectorDailySourceReviewBundle = {},
  sourceExtractionLedgerBundle = {},
  myicorCatalogBundle = {},
  myicorApprovedLessonExtractBundle = {},
  skoolSourceSystemMapBundle = {},
  scoperEvidenceTraceResult = null,
} = {}) {
  const sourceContractSummaries = uniqueBy(DEV_TEAM_HUB_V0_SOURCE_IDS, sourceId => sourceId)
    .map(sourceId => summarizeSourceContract(sourceContractById(sourceContracts, sourceId)))
    .filter(Boolean)
  const scoutReport = normalizeScoutReport(scoutBundle.report)
  const linkResourceReport = normalizeLinkResourceReport(linkResourceBundle.report)
  const eyesQualityLoop = normalizeEyesQualityLoopReport(eyesBundle.report, eyesBundle.atoms, eyesBundle.hits)
  const markSmallBatchApiFullWatch = normalizeMarkApiFullWatchReport(markApiFullWatchBundle.report, markApiFullWatchBundle.atoms, markApiFullWatchBundle.hits)
  const markBaselineApiFullWatch = normalizeMarkApiFullWatchReport(markBaselineApiFullWatchBundle.report, markBaselineApiFullWatchBundle.atoms, markBaselineApiFullWatchBundle.hits)
  const markApiFullWatch = mergeMarkAcceptedApiCoverage(markSmallBatchApiFullWatch, [markBaselineApiFullWatch])
  const latestApiFullWatch = normalizeMarkApiFullWatchReport(latestApiFullWatchBundle.report, latestApiFullWatchBundle.atoms, latestApiFullWatchBundle.hits) || markApiFullWatch
  const directorReport = normalizeDirectorReport(directorBundle.report, directorBundle.atoms, directorBundle.hits)
  const sourceValueGrader = normalizeSourceValueGraderReport(sourceValueGraderBundle.report)
  const youtubeFullWatchReportRows = uniqueBy([
    ...list(youtubeFullWatchReports).filter(reportIsYoutubeFullWatch),
    ...list(foundationSnapshot.intelligenceAtomSpine?.recentReports).filter(reportIsYoutubeFullWatch),
    markApiFullWatchBundle.report,
    markBaselineApiFullWatchBundle.report,
    latestApiFullWatchBundle.report,
  ].filter(Boolean), reportId)
  const youtubeCreatorGodModeCatchup = buildYoutubeCreatorGodModeCatchupSnapshot({
    generatedAt,
    dailyWatch,
    fullWatchedVideoIds: uniqueBy([
      ...fullWatchedVideoIdsFromCalls(geminiVideoReviewCalls),
      ...list(eyesQualityLoop?.apiWatchedVideoIds),
    ], item => item),
    sourceValueGrader,
    youtubeFullWatchReports: youtubeFullWatchReportRows,
    sourcePacketWorkerRuns: sourcePacketWorkerRunItems,
    sourceFollowupRuns: sourceGodModeHandoffRunItems,
  })
  const sourceCoverage = buildDevIntelSourceCoverageSnapshot({ generatedAt })
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
    youtubeCreatorGodModeCatchup,
    currentSprint,
  })
  const extractionEconomics = buildExtractionEconomics({
    geminiVideoReviewCalls,
    sourceValueGrader,
  })
  const youtubeGodModeAutopilotPlan = buildYoutubeGodModeAutopilotPlan({
    generatedAt,
    catchupSnapshot: youtubeCreatorGodModeCatchup,
    sourceValueGrader,
    geminiVideoReviewCalls,
  })
  const approvalReviewQueue = buildApprovalReviewQueue({
    latestApiFullWatch,
    markApiFullWatch,
    youtubeSourcePacketReviewQueue: youtubeCreatorGodModeCatchup.sourcePacketReviewQueue,
  })
  const approvalReviewTriage = buildApprovalReviewTriage(approvalReviewQueue)
  const activeExtractionLanes = buildExtractionLanes({
    foundationSnapshot,
    dailyWatch,
    counts,
    markYoutube,
    scoutReport,
    eyesQualityLoop,
    latestApiFullWatch,
    extractionEconomics,
    directorReport,
  })
  const youtubeSourceIntelligenceFull = buildYoutubeSourceIntelligenceSnapshot({
    foundationSnapshot,
    dailyWatch,
    catchupSnapshot: youtubeCreatorGodModeCatchup,
    autopilotPlan: youtubeGodModeAutopilotPlan,
    extractionEconomics,
    latestApiFullWatch,
    sourceValueGrader,
    directorReport,
    youtubeFullWatchReports: youtubeFullWatchReportRows,
    approvalReviewQueue,
    approvalReviewTriage,
    sourcePacketWorkerQueue,
    sourcePacketHandsQueue,
    sourceGodModeHandoffRunItems,
  })
  const youtubeSourceIntelligence = compactYoutubeSourceIntelligenceSnapshot(youtubeSourceIntelligenceFull)
  const godModeExtractorParity = buildGodModeExtractorParitySnapshot({ activeExtractionLanes, generatedAt })
  const godModeExtractorParityEvaluation = evaluateGodModeExtractorParity(godModeExtractorParity)
  const synthesisLane = activeExtractionLanes.find(lane => lane.laneId === 'synthesis-router') || {}
  const sourceFamilyGodModeMaturity = buildSourceFamilyGodModeMaturitySnapshot({
    paritySnapshot: godModeExtractorParity,
    freshnessSnapshot: synthesisLane.freshness || {},
    generatedAt,
  })
  const sourceFamilyGodModeMaturityEvaluation = evaluateSourceFamilyGodModeMaturity(sourceFamilyGodModeMaturity)
  const systemTruth = buildDevPageSystemTruthSnapshot({
    generatedAt,
    currentSprint,
    activeExtractionLanes,
    directorReport,
    devDirectorDailySourceReviewReport: devDirectorDailySourceReviewBundle.report,
    sourceExtractionLedgerReport: sourceExtractionLedgerBundle.report,
    myicorCatalogReport: myicorCatalogBundle.report,
    myicorApprovedLessonExtractReport: myicorApprovedLessonExtractBundle.report,
    skoolSourceSystemMapReport: skoolSourceSystemMapBundle.report,
    youtubeCreatorGodModeCatchup,
    sourceFamilyGodModeMaturity,
    godModeExtractorParity,
    extractionEconomics,
  })
  const actionRouteReadback = buildDevHubActionRouteReadback({
    generatedAt,
    actionRouter,
    backlogItems: foundationSnapshot.backlogItems || [],
  })
  const routeReviewTriage = buildDevHubRouteReviewTriage({
    generatedAt,
    actionRouter,
    backlogItems: foundationSnapshot.backlogItems || [],
  })
  const foundationDoneBar = buildDevHubFoundationDoneBarFromInputs({
    generatedAt,
    foundationSnapshot,
    sourceContracts,
    extractionControl,
  })
  const businessSourcePipelineTriage = buildDevHubBusinessSourcePipelineTriage({
    generatedAt,
    foundationDoneBar,
  })
  const synthesisScopeReadback = buildDevHubSynthesisScopeReadback({
    generatedAt,
    foundationJobs: foundationSnapshot.foundationJobs || {},
  })
  const scoperEvidenceTraceReadback = scoperEvidenceTraceResult
    ? buildDevHubScoperEvidenceTraceReadback({
        generatedAt,
        traceResult: scoperEvidenceTraceResult,
        candidateLimit: 5,
      })
    : null
  const buildPortfolioReadback = scoperEvidenceTraceResult
    ? buildDevHubBuildPortfolioReadback({
        generatedAt,
        traceResult: scoperEvidenceTraceResult,
      })
    : null
  const morningProposedCardsReadback = buildDevHubMorningProposedCardsReadback({
    generatedAt,
    buildPortfolioReadback: buildPortfolioReadback || {},
  })
  const proposedCardApprovalPreflight = buildDevHubProposedCardApprovalPreflight({
    generatedAt,
    morningProposedCardsReadback,
  })
  const proposedCardSourceProofReadback = buildDevHubProposedCardSourceProofReadback({
    generatedAt,
    buildPortfolioReadback: buildPortfolioReadback || {},
    morningProposedCardsReadback,
    proposedCardApprovalPreflight,
  })
  const scoperRuntimeReadback = buildDevHubScoperRuntimeReadback({
    generatedAt,
    foundationJobs: foundationSnapshot.foundationJobs || {},
    scoperEvidenceTraceReadback: scoperEvidenceTraceReadback || {},
  })
  const intelligenceHygieneReadback = buildDevHubIntelligenceHygieneReadback({
    generatedAt,
    foundationDoneBar,
    actionRouteReadback,
    scoperEvidenceTraceReadback: scoperEvidenceTraceReadback || {},
    sourceFamilyGodModeMaturity: {
      ...sourceFamilyGodModeMaturity,
      evaluation: sourceFamilyGodModeMaturityEvaluation,
    },
  })
  const auditorFlowReadback = buildDevHubAuditorFlowReadback({
    generatedAt,
    foundationJobs: foundationSnapshot.foundationJobs || {},
    actionRouteReadback,
    intelligenceHygieneReadback,
  })
  const nextRepairQueue = buildDevHubNextRepairQueue({
    generatedAt,
    foundationDoneBar,
    businessSourcePipelineTriage,
    routeReviewTriage,
    scoperRuntimeReadback,
    synthesisScopeReadback,
    auditorFlowReadback,
    intelligenceHygieneReadback,
  })
  const scoperScheduleBoundaryPreflight = buildDevHubScoperScheduleBoundaryPreflight({
    generatedAt,
    scoperRuntimeReadback,
    nextRepairQueue,
  })
  const businessAtomFlowPreflight = buildDevHubBusinessAtomFlowPreflight({
    generatedAt,
    businessSourcePipelineTriage,
    nextRepairQueue,
  })
  const sheetsAtomFlowRepairBlueprint = buildDevHubSheetsAtomFlowRepairBlueprint({
    generatedAt,
    businessAtomFlowPreflight,
    sourceContracts,
  })
  const routeReviewOperatorPacket = buildDevHubRouteReviewOperatorPacket({
    generatedAt,
    routeReviewTriage,
    actionRouteReadback,
  })
  const routeAutoClearPreflight = buildDevHubRouteAutoClearPreflight({
    generatedAt,
    routeReviewTriage,
    routeReviewOperatorPacket,
    actionRouteReadback,
  })
  const routeBlockerPreflight = buildDevHubRouteBlockerPreflight({
    generatedAt,
    routeAutoClearPreflight,
    routeReviewTriage,
  })
  const activeCard = activeSprintCard(currentSprint)
  const devOpportunityVisionLensFull = buildDevOpportunityVisionLensReview({
    generatedAt,
    rankedCandidates: directorReport?.rankedCandidates || [],
    sourceRows: youtubeSourceIntelligenceFull?.sourceGodModeHandoffQueue?.rows || [],
    actionRequiredItems: directorReport?.actionRequiredItems || [],
    activeSprint: currentSprint,
    youtubeSourceIntelligence: youtubeSourceIntelligenceFull,
    youtubeCreatorGodModeCatchup,
    godModeExtractorParity,
    sourceFamilyGodModeMaturity,
  })
  const devOpportunityVisionLens = compactDevOpportunityVisionLensReview(devOpportunityVisionLensFull)
  const rankingProcess = buildRankingProcessExplainer({ directorReport, sourceValueGrader })
  const preservedResearchVideoIds = uniqueBy([
    ...list(directorReport?.recommendedBuildNow),
    ...list(directorReport?.strongNext),
    ...list(directorReport?.rankedCandidates).slice(0, 72),
    ...list(markApiFullWatch?.apiWatchedVideoIds).map(videoId => ({ sourceVideoId: videoId })),
  ].map(item => item.sourceVideoId || item.videoId).filter(Boolean), item => item)
  const dailyResearchPool = normalizeResearchPool(dailyWatch.researchPool)
  const dailyResearchPoolPreview = compactDailyResearchPool(dailyResearchPool, {
    preserveVideoIds: preservedResearchVideoIds,
  })
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
    approvalReviewQueue,
    approvalReviewTriage,
    sourcePacketWorkerQueue: sourcePacketWorkerQueue || {
      status: 'not_loaded',
      route: '/api/foundation/dev-team-hub/source-packet-worker-queue',
      rows: [],
      counts: { total: 0, ready: 0, alreadyRun: 0, blocked: 0 },
    },
    sourcePacketHandsQueue: sourcePacketHandsQueue || {
      status: 'not_loaded',
      route: EXTRACTOR_HANDS_PRODUCTION_QUEUE_ROUTE,
      runRoute: EXTRACTOR_HANDS_PRODUCTION_RUNNER_ROUTE,
      rows: [],
      counts: { total: 0, ready: 0, alreadyRun: 0, blocked: 0, needsPolicy: 0 },
    },
    extractionEconomics,
    youtubeGodModeAutopilotPlan,
    youtubeSourceIntelligence,
    systemTruth,
    foundationDoneBar,
    businessSourcePipelineTriage,
    businessAtomFlowPreflight,
    sheetsAtomFlowRepairBlueprint,
    synthesisScopeReadback,
    scoperEvidenceTraceReadback,
    buildPortfolioReadback,
    morningProposedCardsReadback,
    proposedCardApprovalPreflight,
    proposedCardSourceProofReadback,
    scoperRuntimeReadback,
    scoperScheduleBoundaryPreflight,
    intelligenceHygieneReadback,
    auditorFlowReadback,
    nextRepairQueue,
    actionRouteReadback,
    routeReviewTriage,
    routeReviewOperatorPacket,
    routeAutoClearPreflight,
    routeBlockerPreflight,
    devOpportunityVisionLens,
    rankingProcess,
    youtubeCreatorGodModeCatchup: compactYoutubeCreatorGodModeCatchup(youtubeCreatorGodModeCatchup),
    sourceCoverage,
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
      researchPool: dailyResearchPoolPreview,
      researchPoolCount: dailyResearchPool.length,
      researchPoolArePreview: dailyResearchPool.length > dailyResearchPoolPreview.length,
      creators: list(dailyWatch.creators)
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
      sourceRoute: markApiFullWatch?.sourceRoute || `getIntelligenceReportBundle(${MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID})`,
    },
    director: compactDirectorPayload(directorReport),
    sourceValueGrader: compactSourceValueGraderPayload(sourceValueGrader),
    activeExtractionLanes,
    godModeExtractorParity: {
      ...godModeExtractorParity,
      evaluation: godModeExtractorParityEvaluation,
      sourceRoute: 'buildGodModeExtractorParitySnapshot(activeExtractionLanes) + evaluateGodModeExtractorParity()',
    },
    sourceFamilyGodModeMaturity: {
      ...sourceFamilyGodModeMaturity,
      evaluation: sourceFamilyGodModeMaturityEvaluation,
      sourceRoute: 'buildSourceFamilyGodModeMaturitySnapshot(godModeExtractorParity, synthesisLane.freshness) + evaluateSourceFamilyGodModeMaturity()',
    },
    sourceRoutes: [
      { visibleValue: 'Creator watchlist source status', route: '/api/foundation/build-intel-watchlist', sourceId: CREATOR_WATCHLIST_SOURCE_ID },
      { visibleValue: 'Daily creator watch research pool', route: '/api/foundation/build-intel/youtube-creator-daily-watch', sourceId: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID },
      { visibleValue: 'Scout report and ranked opportunities', route: `getIntelligenceReportBundle(${YOUTUBE_SCOUT_REPORT_ARTIFACT_ID})`, sourceId: YOUTUBE_SCOUT_SOURCE_ID },
      { visibleValue: 'Link/resource approval queue', route: `getIntelligenceReportBundle(${YOUTUBE_BUILD_INTEL_LINK_RESOURCE_REPORT_ARTIFACT_ID})`, sourceId: YOUTUBE_SCOUT_SOURCE_ID },
      { visibleValue: 'Video/audio/visual quality loop', route: `getIntelligenceReportBundle(${GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID})`, sourceId: GOD_MODE_EYES_SOURCE_ID },
      { visibleValue: 'API full-watch report bundle', route: `getIntelligenceReportBundle(${MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID})`, sourceId: GOD_MODE_EYES_SOURCE_ID },
      { visibleValue: 'Dev Intelligence Director recommendations', route: `getIntelligenceReportBundle(${DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID})`, sourceId: DEV_TEAM_INTELLIGENCE_DIRECTOR_SOURCE_ID },
      { visibleValue: 'Creator/source value grades by lane', route: `getIntelligenceReportBundle(${BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID})`, sourceId: BUILD_INTEL_SOURCE_VALUE_GRADER_SOURCE_ID },
      { visibleValue: 'YouTube creator God Mode catch-up baseline', route: 'buildYoutubeCreatorGodModeCatchupSnapshot(dailyWatch + sourceValueGrader)', sourceId: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID },
      { visibleValue: 'YouTube morning autopilot dry-run plan', route: 'buildYoutubeGodModeAutonomousWatchPlan(catch-up candidates + source grades + today llm_calls)', sourceId: YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID },
      { visibleValue: 'API spend and cost per idea', route: 'llm_calls.provider:gemini + llm_calls.workload:video_vision', sourceId: GOD_MODE_EYES_SOURCE_ID },
      { visibleValue: 'Dev source-family coverage matrix', route: 'buildDevIntelSourceCoverageSnapshot()', sourceId: BUILD_INTEL_SOURCE_VALUE_GRADER_SOURCE_ID },
      { visibleValue: 'Dev action-route readback', route: 'buildDevHubActionRouteReadback(getActionRouterSnapshot + backlogItems)', sourceId: 'ACTION-ROUTER-001' },
      { visibleValue: 'Extractor God Mode parity matrix', route: 'buildGodModeExtractorParitySnapshot(activeExtractionLanes)', sourceId: GOD_MODE_EYES_SOURCE_ID },
      { visibleValue: 'Source-family God Mode maturity matrix', route: 'buildSourceFamilyGodModeMaturitySnapshot(godModeExtractorParity, synthesisLane.freshness)', sourceId: GOD_MODE_EYES_SOURCE_ID },
      { visibleValue: 'Source-packet worker queue', route: '/api/foundation/dev-team-hub/source-packet-worker-queue', sourceId: YOUTUBE_SCOUT_SOURCE_ID },
      { visibleValue: 'Bounded browser Hands queue', route: EXTRACTOR_HANDS_PRODUCTION_QUEUE_ROUTE, sourceId: GOD_MODE_EYES_SOURCE_ID },
      { visibleValue: 'Bounded browser Hands run route', route: EXTRACTOR_HANDS_PRODUCTION_RUNNER_ROUTE, sourceId: GOD_MODE_EYES_SOURCE_ID },
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
    sourceValueGraderBundle: {
      report: {
        reportArtifactId: BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID,
        title: 'Synthetic source grader',
        status: 'generated',
        sourceIds: [BUILD_INTEL_SOURCE_VALUE_GRADER_SOURCE_ID],
        structuredOutputJson: {
          sourceGrades: [{
            creatorId: YOUTUBE_CREATOR_DAILY_WATCH_MARK_CREATOR_ID,
            creator: YOUTUBE_SCOUT_CHANNEL,
            watchedVideos: 1,
            buildCandidates: 1,
            devBuildGrade: 'S',
            overallGrade: 'S',
            primaryUse: 'AIOS / Dev build',
            bestDirectorRank: 1,
            laneScores: [{ laneId: 'aios_dev_build', label: 'AIOS / Dev build', grade: 'S', score: 90 }],
          }],
          topDevBuildSources: [{
            creatorId: YOUTUBE_CREATOR_DAILY_WATCH_MARK_CREATOR_ID,
            creator: YOUTUBE_SCOUT_CHANNEL,
            watchedVideos: 1,
            buildCandidates: 1,
            devBuildGrade: 'S',
            overallGrade: 'S',
            primaryUse: 'AIOS / Dev build',
            bestDirectorRank: 1,
            laneScores: [{ laneId: 'aios_dev_build', label: 'AIOS / Dev build', grade: 'S', score: 90 }],
          }],
          topByLane: [],
          noAutoBacklogPromotion: true,
          externalWrites: false,
        },
      },
    },
    latestApiFullWatchBundle: {
      report: {
        reportArtifactId: 'batch:synthetic:api-full-watch',
        title: 'Synthetic API full-watch',
        status: 'generated',
        sourceIds: [GOD_MODE_EYES_SOURCE_ID, GOD_MODE_EYES_VIDEO_SOURCE_ID],
        actionRequiredItems: [{
          type: 'approval_required_resource_link',
          url: 'https://gumroad.com/l/public-agent-kit',
          host: 'gumroad.com',
          sourceVideoId: 'video-one',
          sourceUrl: 'https://www.youtube.com/watch?v=videoone',
          reason: 'Synthetic paid resource gate.',
        }],
      },
    },
    geminiVideoReviewCalls: [{
      callId: 'llm-call-synthetic-video-1',
      provider: 'gemini',
      workload: 'video_vision',
      status: 'succeeded',
      model: GEMINI_STANDARD_PRICING_DEFAULT_MODEL,
      metadata: {
        videoId: 'video-one',
        batchReportArtifactId: 'batch:synthetic',
        extractionMode: 'youtube_latest_20_god_mode_api_full_watch',
        usageMetadata: {
          promptTokenCount: 100000,
          candidatesTokenCount: 1000,
          thoughtsTokenCount: 1000,
          totalTokenCount: 102000,
        },
      },
    }],
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
      snapshot.approvalReviewQueue.length >= 1 &&
      snapshot.extractionEconomics.callCount === 1 &&
      snapshot.extractionEconomics.costPerIdeaUsd > 0 &&
      snapshot.youtubeCreatorGodModeCatchup?.summary?.creatorCount >= 1 &&
      snapshot.youtubeCreatorGodModeCatchup?.buildPromotionReadiness?.visibleToScoper === true &&
      snapshot.youtubeGodModeAutopilotPlan?.reportOnly === true &&
      snapshot.youtubeGodModeAutopilotPlan?.startsProviderCall === false &&
      snapshot.youtubeGodModeAutopilotPlan?.runApprovalRequired === true &&
      snapshot.approvalReviewTriage?.totalReviewRows === snapshot.approvalReviewQueue.length &&
      snapshot.approvalReviewTriage?.summary?.startsImmediatelyCount === 0 &&
      snapshot.approvalReviewTriage?.summary?.startsFromApprovalActionCount === 0 &&
      snapshot.sourceCoverage.counts.families >= 8 &&
      snapshot.sourceFamilyGodModeMaturity?.summary?.familyCount >= 13 &&
      snapshot.sourceFamilyGodModeMaturity?.evaluation?.ok === true &&
      snapshot.scout.reviewRoutes.every(route => route.proposalOnly && !route.writesBacklog && !route.externalWrites) &&
      missingSourceSnapshot.status === 'needs_source',
    cases: [
      { name: 'source_backed_counts_derive_from_inputs', ok: snapshot.counts.researchPool === 1 && snapshot.counts.atoms === 1 && snapshot.counts.evidenceHits === 1 },
      { name: 'api_economics_derive_from_llm_call_usage', ok: snapshot.extractionEconomics.callCount === 1 && snapshot.extractionEconomics.estimatedSpendUsd > 0 },
      { name: 'youtube_creator_catchup_readback_is_visible', ok: snapshot.youtubeCreatorGodModeCatchup?.summary?.creatorCount >= 1 && snapshot.youtubeCreatorGodModeCatchup?.buildPromotionReadiness?.visibleToScoper === true },
      { name: 'youtube_autopilot_plan_is_dry_run_and_approval_gated', ok: snapshot.youtubeGodModeAutopilotPlan?.reportOnly === true && snapshot.youtubeGodModeAutopilotPlan?.startsProviderCall === false && snapshot.youtubeGodModeAutopilotPlan?.runApprovalRequired === true },
      { name: 'approval_packet_triage_groups_safe_runtime_boundaries', ok: snapshot.approvalReviewTriage?.totalReviewRows === snapshot.approvalReviewQueue.length && snapshot.approvalReviewTriage?.summary?.startsImmediatelyCount === 0 && snapshot.approvalReviewTriage?.summary?.startsFromApprovalActionCount === 0 },
      { name: 'paid_gate_stays_in_approval_queue_after_public_links_auto_read', ok: snapshot.approvalReviewQueue.some(item => item.sourcePacketPreview?.currentResolverApprovalRequired === true) },
      { name: 'dev_source_coverage_matrix_is_visible', ok: snapshot.sourceCoverage.counts.families >= 8 },
      { name: 'source_family_god_mode_maturity_is_visible', ok: snapshot.sourceFamilyGodModeMaturity?.summary?.familyCount >= 13 && snapshot.sourceFamilyGodModeMaturity?.evaluation?.ok === true },
      { name: 'review_routes_are_read_only_proposals', ok: snapshot.scout.reviewRoutes.every(route => route.proposalOnly && !route.writesBacklog && !route.externalWrites) },
      { name: 'missing_values_stay_visible_as_source_needs', ok: missingSourceSnapshot.status === 'needs_source' && missingSourceSnapshot.sourceNeeds.length >= 1 },
    ],
  }
}
