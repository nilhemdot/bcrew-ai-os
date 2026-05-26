import crypto from 'node:crypto'

import {
  buildCurrentModeBaseline,
  capturePublicYoutubePageEvidence,
  findTranscriptForVideo,
  runGeminiEyesForVideo,
  scoreEyesResult,
} from './god-mode-extractor-eyes-quality-loop.js'
import {
  GEMINI_VIDEO_CAPABILITY_DOCS,
  GEMINI_VIDEO_FULL_WATCH_MODEL,
  GEMINI_VIDEO_ROUTE_KEY,
} from './gemini-video-brain-route.js'
import {
  YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID,
  YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
} from './youtube-creator-daily-watch.js'
import {
  YOUTUBE_LATEST_20_INTEL_RUN_CARD_ID,
  YOUTUBE_LATEST_20_MAX_RUN_VIDEOS,
} from './youtube-latest-20-intel-run.js'
import {
  YOUTUBE_RESOURCE_LINK_RESOLVER_CARD_ID,
  buildYoutubeResourceLinkResolverSnapshot,
} from './youtube-resource-link-resolver.js'

export const YOUTUBE_LATEST_20_FULL_WATCH_RUNNER_CARD_ID = 'YOUTUBE-LATEST-20-FULL-WATCH-RUNNER-001'
export const YOUTUBE_LATEST_20_FULL_WATCH_RUNNER_PLAN_PATH = 'docs/process/youtube-latest-20-full-watch-runner-001-plan.md'
export const YOUTUBE_LATEST_20_FULL_WATCH_RUNNER_APPROVAL_PATH = 'docs/process/approvals/YOUTUBE-LATEST-20-FULL-WATCH-RUNNER-001.json'
export const YOUTUBE_LATEST_20_FULL_WATCH_RUNNER_SCRIPT_PATH = 'scripts/process-youtube-latest-20-full-watch-runner-check.mjs'
export const YOUTUBE_LATEST_20_FULL_WATCH_REPORT_ARTIFACT_ID = 'batch:youtube-latest-20:api-full-watch-v1'
export const YOUTUBE_LATEST_20_FULL_WATCH_REPORT_PATH = 'docs/source-notes/youtube-latest-20-full-watch-2026-05-25.md'
export const YOUTUBE_LATEST_20_FULL_WATCH_REPORT_PREFIX = `${YOUTUBE_LATEST_20_FULL_WATCH_REPORT_ARTIFACT_ID}:`
export const YOUTUBE_LATEST_20_FULL_WATCH_MODEL = process.env.YOUTUBE_LATEST_20_FULL_WATCH_MODEL || GEMINI_VIDEO_FULL_WATCH_MODEL
export const YOUTUBE_LATEST_20_FULL_WATCH_TIMEOUT_MS = Number(process.env.YOUTUBE_LATEST_20_FULL_WATCH_TIMEOUT_MS || 600000)

export const YOUTUBE_LATEST_20_FULL_WATCH_NOT_NEXT = [
  'Do not run all creators from this card.',
  'Do not use metadata-only, transcript-only, or subscription scout output as full-watch proof.',
  'Do not use Skool, MyICOR, Gumroad, Calendly, comments, members, private, paid, auth-required, course, or community sources.',
  'Do not download videos, purchase, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.',
  'Do not auto-create backlog cards from recommendations.',
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

export function isYoutubeLatest20FullWatchReportId(value = '') {
  const id = text(value)
  return id === YOUTUBE_LATEST_20_FULL_WATCH_REPORT_ARTIFACT_ID ||
    id.startsWith(YOUTUBE_LATEST_20_FULL_WATCH_REPORT_PREFIX)
}

export function youtubeLatest20FullWatchReportArtifactId({
  batchRunId = '',
  creatorIds = [],
} = {}) {
  const run = timestampSlug(batchRunId)
  if (!run) return YOUTUBE_LATEST_20_FULL_WATCH_REPORT_ARTIFACT_ID
  const creatorPart = list(creatorIds).map(slug).filter(Boolean).slice(0, 3).join('-')
  return `${YOUTUBE_LATEST_20_FULL_WATCH_REPORT_PREFIX}${creatorPart ? `${creatorPart}:` : ''}${run}`
}

export function youtubeLatest20FullWatchReportPath({
  batchRunId = '',
  creatorIds = [],
} = {}) {
  const run = timestampSlug(batchRunId)
  if (!run) return YOUTUBE_LATEST_20_FULL_WATCH_REPORT_PATH
  const creatorPart = list(creatorIds).map(slug).filter(Boolean).slice(0, 3).join('-') || 'coverage'
  return `docs/source-notes/youtube-latest-20-full-watch-${creatorPart}-${run}.md`
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function usageTotalTokens(usage = {}) {
  return asNumber(usage.totalTokenCount, 0) ||
    asNumber(usage.promptTokenCount, 0) + asNumber(usage.candidatesTokenCount, 0)
}

function sumUsageMetadata(items = []) {
  const keys = [
    'promptTokenCount',
    'candidatesTokenCount',
    'totalTokenCount',
    'cachedContentTokenCount',
    'thoughtsTokenCount',
  ]
  return keys.reduce((acc, key) => {
    const total = list(items).reduce((sum, item) => sum + asNumber(item?.[key], 0), 0)
    if (total) acc[key] = total
    return acc
  }, {})
}

function normalizeSegmentsForVideo(segmentPlansByVideoId = {}, videoId = '') {
  const source = segmentPlansByVideoId instanceof Map
    ? segmentPlansByVideoId.get(videoId)
    : segmentPlansByVideoId?.[videoId]
  return list(source).filter(segment => Number.isFinite(Number(segment.startSeconds)) && Number.isFinite(Number(segment.endSeconds)))
}

function aggregateSegmentEyesResult({ video = {}, model = YOUTUBE_LATEST_20_FULL_WATCH_MODEL, promptProfile = 'long_course', segmentResults = [] } = {}) {
  const successful = list(segmentResults).filter(item => item.eyes?.ok === true)
  if (!successful.length || successful.length !== list(segmentResults).length) {
    return {
      ok: false,
      model,
      promptProfile,
      error: 'one_or_more_video_segments_failed',
      segments: list(segmentResults).map(item => ({
        segment: item.segment,
        ok: item.eyes?.ok === true,
        error: item.eyes?.error || null,
      })),
    }
  }
  const outputs = successful.map(item => item.eyes.output || {})
  const merge = key => outputs.flatMap(output => list(output[key]))
  const usageMetadata = sumUsageMetadata(successful.map(item => item.eyes.usageMetadata || {}))
  return {
    ok: true,
    mode: 'gemini_video_understanding_eyes_segmented_v1',
    videoId: video.videoId,
    sourceUrl: video.url,
    provider: 'gemini',
    model,
    promptProfile,
    segmentedVideo: true,
    callId: successful.map(item => item.eyes.callId).filter(Boolean).join(','),
    callIds: successful.map(item => item.eyes.callId).filter(Boolean),
    ledgerStatus: successful.every(item => item.eyes.ledgerStatus === 'succeeded') ? 'succeeded' : 'partial',
    usageMetadata,
    rawOutputHash: stableHash(successful.map(item => item.eyes.rawOutputHash || '')),
    segments: successful.map(item => ({
      ...item.segment,
      callId: item.eyes.callId || null,
      usageMetadata: item.eyes.usageMetadata || {},
      summary: item.eyes.output?.summary || '',
    })),
    output: {
      videoId: video.videoId,
      summary: outputs.map((output, index) => `Segment ${index + 1}: ${text(output.summary)}`).filter(Boolean).join(' ').slice(0, 1200),
      courseMap: merge('courseMap').map((item, index) => ({ ...item, rank: index + 1 })),
      visualEvidence: merge('visualEvidence').map((item, index) => ({ ...item, rank: index + 1 })),
      workflowMoments: merge('workflowMoments').map((item, index) => ({ ...item, rank: index + 1 })),
      resourceNeeds: merge('resourceNeeds').map((item, index) => ({ ...item, rank: index + 1 })),
      buildCandidates: merge('buildCandidates').map((item, index) => ({ ...item, rank: index + 1 })),
      implementationPlan: merge('implementationPlan').map((item, index) => ({ ...item, rank: index + 1 })),
      scopingQuestions: [...new Set(merge('scopingQuestions'))].slice(0, 16),
      missedByTranscriptOnly: [...new Set(merge('missedByTranscriptOnly'))].slice(0, 16),
      riskBoundaries: [...new Set(merge('riskBoundaries'))].slice(0, 16),
      qualityVerdict: outputs.some(output => output.qualityVerdict === 'better_than_baseline') ? 'better_than_baseline' : 'same_as_baseline',
      confidence: outputs.some(output => output.confidence === 'high') ? 'high' : 'medium',
    },
  }
}

function normalizeEyesScore({ result = {}, baseline = {} } = {}) {
  if (!result?.ok) {
    return {
      ok: false,
      model: result.model || YOUTUBE_LATEST_20_FULL_WATCH_MODEL,
      error: result.error || 'missing Gemini Eyes result',
      eyesScore: 0,
      qualityDelta: -asNumber(baseline.score, 0),
      usageTotalTokens: 0,
      timestampedVisualEvidenceCount: 0,
      buildCandidateCount: 0,
    }
  }
  const scored = scoreEyesResult({ baseline, eyes: result })
  const totalTokens = usageTotalTokens(result.usageMetadata || {})
  return {
    ok: true,
    model: result.model,
    ...scored,
    usageMetadata: result.usageMetadata || {},
    usageTotalTokens: totalTokens,
    qualityPer1kTokens: totalTokens ? Number(((scored.eyesScore / totalTokens) * 1000).toFixed(3)) : 0,
    callId: result.callId || null,
  }
}

function resourceLinksForResolver(pageEvidence = {}, video = {}, reportArtifactId = YOUTUBE_LATEST_20_FULL_WATCH_REPORT_ARTIFACT_ID) {
  return list(pageEvidence.resourceLinks).map(link => ({
    ...link,
    url: link.normalizedUrl || link.url,
    sourceVideoId: video.videoId,
    sourceUrl: video.url,
    sourceReportArtifactId: reportArtifactId,
    evidence: `Observed in public YouTube description/page evidence for ${video.videoId}.`,
  }))
}

function withApprovalSource(video = {}) {
  return {
    ...video,
    approvalSource: video.approvalSource ||
      `${YOUTUBE_LATEST_20_INTEL_RUN_CARD_ID} selected this public/no-auth non-Mark YouTube video from ${YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID}.`,
  }
}

export async function runYoutubeLatest20FullWatchExtraction({
  videos = [],
  transcriptArtifacts = [],
  model = YOUTUBE_LATEST_20_FULL_WATCH_MODEL,
  now = new Date().toISOString(),
  actor = 'youtube-latest-20-full-watch-runner',
  screenshotRoot = '/tmp/bcrew-youtube-latest-20-full-watch',
  delayBetweenVideosMs = 15000,
  geminiTimeoutMs = YOUTUBE_LATEST_20_FULL_WATCH_TIMEOUT_MS,
  reportArtifactId = YOUTUBE_LATEST_20_FULL_WATCH_REPORT_ARTIFACT_ID,
  promptProfile = 'standard',
  segmentPlansByVideoId = {},
} = {}) {
  const videoResults = []
  const approvedVideos = list(videos).map(withApprovalSource)
  for (const [index, video] of approvedVideos.entries()) {
    const pageEvidence = await capturePublicYoutubePageEvidence({ video, now, screenshotRoot })
    const transcript = findTranscriptForVideo(video, transcriptArtifacts)
    const baseline = buildCurrentModeBaseline({ video, transcript, pageEvidence })
    const resourceLinkSnapshot = await buildYoutubeResourceLinkResolverSnapshot({
      rawLinks: resourceLinksForResolver(pageEvidence, video, reportArtifactId),
      sourceLabel: `${video.creator || video.creatorId || 'creator'} ${video.videoId} YouTube resource links`,
      resolve: true,
      maxResolve: 12,
      generatedAt: now,
    })
    const segmentPlan = normalizeSegmentsForVideo(segmentPlansByVideoId, video.videoId)
    let eyes
    if (segmentPlan.length) {
      const segmentResults = []
      for (const [segmentIndex, segment] of segmentPlan.entries()) {
        const segmentEyes = await runGeminiEyesForVideo({
          video,
          baseline,
          pageEvidence,
          model,
          promptProfile,
          actor,
          runId: `${now}:${video.videoId}:segment-${segment.index || segmentIndex + 1}`,
          timeoutMs: geminiTimeoutMs,
          videoMetadata: {
            start_offset: `${Math.max(0, Number(segment.startSeconds) || 0)}s`,
            end_offset: `${Math.max(0, Number(segment.endSeconds) || 0)}s`,
            ...(Number(segment.fps) > 0 ? { fps: Number(segment.fps) } : {}),
          },
          videoSegment: segment,
          metadata: {
            parentCardId: YOUTUBE_LATEST_20_FULL_WATCH_RUNNER_CARD_ID,
            batchReportArtifactId: reportArtifactId,
            manifestCardId: YOUTUBE_LATEST_20_INTEL_RUN_CARD_ID,
            extractionMode: 'youtube_latest_20_god_mode_api_full_watch',
            segmentedVideo: true,
            segmentIndex: segment.index || segmentIndex + 1,
            segmentStartSeconds: segment.startSeconds,
            segmentEndSeconds: segment.endSeconds,
          },
        })
        segmentResults.push({ segment, eyes: segmentEyes })
      }
      eyes = aggregateSegmentEyesResult({ video, model, promptProfile, segmentResults })
    } else {
      eyes = await runGeminiEyesForVideo({
        video,
        baseline,
        pageEvidence,
        model,
        promptProfile,
        actor,
        runId: `${now}:${video.videoId}`,
        timeoutMs: geminiTimeoutMs,
        metadata: {
          parentCardId: YOUTUBE_LATEST_20_FULL_WATCH_RUNNER_CARD_ID,
          batchReportArtifactId: reportArtifactId,
          manifestCardId: YOUTUBE_LATEST_20_INTEL_RUN_CARD_ID,
          extractionMode: 'youtube_latest_20_god_mode_api_full_watch',
        },
      })
    }
    videoResults.push({ video, pageEvidence, transcript, baseline, resourceLinkSnapshot, eyes })
    if (index < approvedVideos.length - 1) {
      await new Promise(resolve => setTimeout(resolve, Math.max(0, Number(delayBetweenVideosMs) || 0)))
    }
  }
  return videoResults
}

export function buildYoutubeLatest20FullWatchSnapshot({
  generatedAt = new Date().toISOString(),
  batchRunId = generatedAt.replace(/[^0-9]/g, '').slice(0, 14),
  reportArtifactId = YOUTUBE_LATEST_20_FULL_WATCH_REPORT_ARTIFACT_ID,
  reportPath = YOUTUBE_LATEST_20_FULL_WATCH_REPORT_PATH,
  videos = [],
  videoResults = [],
  model = YOUTUBE_LATEST_20_FULL_WATCH_MODEL,
  liveGeminiApi = false,
  manifest = null,
} = {}) {
  const byVideoId = new Map(list(videoResults).map(result => [result.video?.videoId, result]))
  const mergedResults = list(videos).map(video => byVideoId.get(video.videoId)).filter(Boolean)
  const scoreRows = mergedResults.map(result => normalizeEyesScore({ result: result.eyes, baseline: result.baseline }))
  const topBuildCandidates = mergedResults.flatMap(result => {
    return list(result.eyes?.output?.buildCandidates).map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
      sourceVideoId: result.video.videoId,
      sourceUrl: result.video.url,
      sourceTitle: result.video.title,
      creator: result.video.creator || result.video.creatorId,
      creatorId: result.video.creatorId,
      model: result.eyes?.model || model,
      resourceLinkDispositions: result.resourceLinkSnapshot?.scoperPacket?.resourceLinkDispositions || [],
      evidenceRefs: [
        result.baseline?.transcript?.artifactId,
        result.pageEvidence?.canonicalUrl || result.video.url,
      ].filter(Boolean),
    }))
  })
  const actionRequiredItems = mergedResults.flatMap(result => {
    return list(result.resourceLinkSnapshot?.blockedLinks).map(link => ({
      type: 'approval_required_resource_link',
      sourceVideoId: result.video.videoId,
      sourceUrl: result.video.url,
      url: link.url,
      host: link.host,
      blocker: link.blocker,
      allowedNextDecision: link.allowedNextDecision,
      approvedInThisCard: false,
    }))
  })
  const checks = []
  addCheck(checks, mergedResults.length >= 1 && mergedResults.length <= YOUTUBE_LATEST_20_MAX_RUN_VIDEOS, 'batch size is guarded at 1-9 selected videos', `${mergedResults.length}/${YOUTUBE_LATEST_20_MAX_RUN_VIDEOS}`)
  addCheck(checks, mergedResults.every(result => result.video?.creatorId && result.video.creatorId !== 'mark-kashef'), 'all videos are non-Mark public creator selections', mergedResults.map(result => `${result.video?.videoId}:${result.video?.creatorId}`).join(', '))
  addCheck(checks, mergedResults.every(result => result.pageEvidence?.responseOk === true), 'public YouTube page evidence captured for every video', mergedResults.map(result => `${result.video?.videoId}:${result.pageEvidence?.responseOk}`).join(', '))
  addCheck(checks, scoreRows.every(score => score.ok === true), 'Gemini API full-watch result exists for every video', scoreRows.map(score => `${score.model}:${score.ok}`).join(', '))
  addCheck(checks, scoreRows.every(score => score.timestampedVisualEvidenceCount >= 3), 'every video has timestamped visual evidence', scoreRows.map(score => `${score.model}:${score.timestampedVisualEvidenceCount}`).join(', '))
  addCheck(checks, scoreRows.every(score => score.buildCandidateCount >= 2), 'every video has build candidates', scoreRows.map(score => `${score.model}:${score.buildCandidateCount}`).join(', '))
  addCheck(checks, mergedResults.every(result => result.resourceLinkSnapshot?.ok === true), 'resource links are classified and resolver packets exist for every video', mergedResults.map(result => `${result.video?.videoId}:${result.resourceLinkSnapshot?.status || 'missing'}`).join(', '))
  addCheck(checks, mergedResults.every(result => asNumber(result.resourceLinkSnapshot?.counts?.remainingPublic, 0) === 0), 'safe public resource links are resolved or explicitly blocked before scoping', mergedResults.map(result => `${result.video?.videoId}:${result.resourceLinkSnapshot?.counts?.remainingPublic || 0}`).join(', '))
  addCheck(checks, topBuildCandidates.length >= mergedResults.length * 2, 'batch produced ranked build candidates', `${topBuildCandidates.length}`)
  const failures = checks.filter(check => !check.ok)
  return {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'ready_for_director_resynthesis',
    generatedAt,
    batchRunId,
    cardId: YOUTUBE_LATEST_20_FULL_WATCH_RUNNER_CARD_ID,
    manifestCardId: YOUTUBE_LATEST_20_INTEL_RUN_CARD_ID,
    reportArtifactId,
    reportPath,
    sourceIds: [YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID],
    targetKey: YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
    model,
    liveGeminiApi,
    route: {
      provider: 'gemini',
      model,
      routeKey: GEMINI_VIDEO_ROUTE_KEY,
      fullVideoWatchRoute: 'gemini_api_youtube_url_video_understanding',
      subscriptionWorkspaceFullWatch: false,
      docs: GEMINI_VIDEO_CAPABILITY_DOCS,
    },
    summary: {
      videoCount: mergedResults.length,
      totalTimestampedVisualEvidence: scoreRows.reduce((sum, score) => sum + asNumber(score.timestampedVisualEvidenceCount), 0),
      totalBuildCandidates: topBuildCandidates.length,
      approvalRequiredLinkCount: actionRequiredItems.length,
      resolvedPublicResourceLinkCount: mergedResults.reduce((sum, result) => sum + asNumber(result.resourceLinkSnapshot?.counts?.resolvedPublic, 0), 0),
      totalTokens: scoreRows.reduce((sum, score) => sum + asNumber(score.usageTotalTokens), 0),
    },
    manifest: manifest ? {
      runManifestId: manifest.runManifestId,
      selectedByCreator: manifest.selectedByCreator,
      counts: manifest.counts,
    } : null,
    videoResults: mergedResults.map((result, index) => ({
      video: result.video,
      baseline: {
        score: result.baseline?.score,
        transcriptPresent: result.baseline?.transcript?.present,
        transcriptArtifactId: result.baseline?.transcript?.artifactId,
        descriptionLength: result.baseline?.descriptionLength,
        resourceLinkCount: result.baseline?.resourceLinkCount,
        hardLimit: result.baseline?.hardLimit,
      },
      pageEvidence: {
        responseOk: result.pageEvidence?.responseOk,
        finalUrl: result.pageEvidence?.finalUrl,
        videoTitle: result.pageEvidence?.videoTitle,
        resourceLinkCount: list(result.pageEvidence?.resourceLinks).length,
        captionTrackCount: list(result.pageEvidence?.captionTracks).length,
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
    })),
    topBuildCandidates,
    actionRequiredItems: [
      ...actionRequiredItems,
      {
        type: 'next_director_resynthesis',
        item: 'Rerun Dev Intelligence Director after this full-watch batch so non-Mark evidence competes with Mark evidence.',
        allowedDecisions: ['rerun_dev_director', 'run_next_bounded_creator_batch', 'pause_and_scope_top_candidates'],
        approvedInThisCard: false,
      },
    ],
    checks,
    failures,
    noAutoBacklogPromotion: true,
    externalWrites: false,
  }
}

export function buildSnapshotFromYoutubeLatest20FullWatchReport(report = null) {
  const structured = report?.structuredOutputJson || report?.structured_output_json || {}
  const snapshot = structured.snapshot || {}
  return {
    ...snapshot,
    ok: Boolean(snapshot.ok),
    status: snapshot.status || (snapshot.ok ? 'ready_for_director_resynthesis' : 'blocked'),
    persistedReportArtifactId: report?.reportArtifactId || report?.report_artifact_id || null,
  }
}

export function buildYoutubeLatest20FullWatchWriteSet(snapshot = {}) {
  const candidates = list(snapshot.topBuildCandidates)
  const reportArtifactId = text(snapshot.reportArtifactId) || YOUTUBE_LATEST_20_FULL_WATCH_REPORT_ARTIFACT_ID
  const reportArtifact = {
    reportArtifactId,
    reportType: 'director_brief',
    scopeKey: 'dev-team-build-intel',
    department: 'foundation',
    title: 'YouTube Latest-20 God Mode API Full-Watch Batch',
    status: 'generated',
    sourceIds: [YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID],
    inputArtifactIds: list(snapshot.videoResults).flatMap(result => [
      result.baseline?.transcriptArtifactId,
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
        question: 'Which non-Mark creator candidates should the Dev Intelligence Director promote into scoped build opportunities?',
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
        resourceLinkPacket: result.resourceLinkSnapshot?.scoperPacket || {},
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
      cardId: YOUTUBE_LATEST_20_FULL_WATCH_RUNNER_CARD_ID,
      manifestCardId: YOUTUBE_LATEST_20_INTEL_RUN_CARD_ID,
      batchRunId: snapshot.batchRunId,
      proofMode: 'youtube_latest_20_god_mode_api_full_watch',
      fullWatchRoute: 'gemini_api_youtube_url_video_understanding',
      subscriptionWorkspaceFullWatch: false,
      model: snapshot.model,
      videoIds: list(snapshot.videoResults).map(result => result.video?.videoId).filter(Boolean),
      createsBacklogCardsAutomatically: false,
      externalWrites: false,
      privateOrPaidAccess: false,
    },
  }

  const atomInputs = candidates.slice(0, 18).map((candidate, index) => {
    const atomId = `atom:${YOUTUBE_LATEST_20_FULL_WATCH_RUNNER_CARD_ID.toLowerCase()}:api-batch:${slug(reportArtifactId)}:${slug(candidate.sourceVideoId)}:${slug(candidate.title)}`
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
      topicRefs: ['god-mode-extractor', 'youtube-latest-20', 'youtube-full-watch', 'build-intel'],
      department: 'foundation',
      pillar: 'dev-team',
      valueRoute: 'aios_build_intelligence',
      qualityScore: candidate.confidence === 'high' ? 92 : candidate.confidence === 'medium' ? 78 : 62,
      relevanceScore: 94 - index,
      sourceConfidence: candidate.confidence === 'high' ? 0.92 : candidate.confidence === 'medium' ? 0.78 : 0.62,
      extractionConfidence: candidate.confidence === 'high' ? 0.88 : candidate.confidence === 'medium' ? 0.75 : 0.6,
      sensitivity: 'neutral',
      minTier: 1,
      freshness: 'trending',
      status: 'detected',
      suggestedOwner: 'Dev Team Intelligence Director',
      suggestedAction: candidate.recommendedNextStep,
      tags: ['god-mode-youtube', 'api-full-watch-latest-20', 'proposal-only', candidate.creatorId].filter(Boolean),
      metadata: {
        sourceVideoId: candidate.sourceVideoId,
        sourceUrl: candidate.sourceUrl,
        sourceTitle: candidate.sourceTitle,
        creator: candidate.creator,
        creatorId: candidate.creatorId,
        resourceLinkDispositions: candidate.resourceLinkDispositions || [],
        model: candidate.model,
        proposalOnly: true,
        writesBacklog: false,
      },
      dedupHash: stableHash({
        reportArtifactId,
        sourceVideoId: candidate.sourceVideoId,
        title: candidate.title,
        model: candidate.model,
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
      evidenceExcerpt: `${candidate.creator || 'Creator'} ${candidate.sourceVideoId || ''}: ${list(candidate.evidenceTimestamps).join(', ') || 'Gemini API full-watch evidence'}`.slice(0, 900),
      anchorType: 'youtube_video',
      anchorValue: candidate.sourceUrl || '',
      confidence: atom.extractionConfidence,
      metadata: {
        cardId: YOUTUBE_LATEST_20_FULL_WATCH_RUNNER_CARD_ID,
        model: candidate.model,
        evidenceTimestamps: candidate.evidenceTimestamps || [],
        sourceVideoId: candidate.sourceVideoId,
        creator: candidate.creator,
        creatorId: candidate.creatorId,
      },
    }
  })
  return { reportArtifact, atomInputs, hitInputs }
}

export function verifyYoutubeLatest20FullWatchPersistedProof({ snapshot = {}, report = null, atoms = [], hits = [] } = {}) {
  const checks = []
  const expectedReportArtifactId = text(snapshot.reportArtifactId) || YOUTUBE_LATEST_20_FULL_WATCH_REPORT_ARTIFACT_ID
  const reportVideoCount = list(report?.metadata?.videoIds).length
  addCheck(checks, report?.reportArtifactId === expectedReportArtifactId, 'latest-20 full-watch report artifact reads back', report?.reportArtifactId || 'missing')
  addCheck(checks, report?.metadata?.fullWatchRoute === 'gemini_api_youtube_url_video_understanding', 'report records Gemini API full-watch route', report?.metadata?.fullWatchRoute || 'missing')
  addCheck(checks, report?.metadata?.subscriptionWorkspaceFullWatch === false, 'report rejects subscription route as full-watch', String(report?.metadata?.subscriptionWorkspaceFullWatch))
  addCheck(checks, reportVideoCount >= 1 && reportVideoCount <= YOUTUBE_LATEST_20_MAX_RUN_VIDEOS, 'report records guarded video count', `${reportVideoCount}`)
  addCheck(checks, report?.structuredOutputJson?.snapshot?.status === snapshot.status, 'persisted snapshot status matches', report?.structuredOutputJson?.snapshot?.status || 'missing')
  addCheck(checks, list(atoms).length >= Math.min(6, list(snapshot.topBuildCandidates).length), 'proposal atoms read back', `${list(atoms).length}`)
  addCheck(checks, list(hits).length >= Math.min(6, list(atoms).length), 'evidence hits read back', `${list(hits).length}/${list(atoms).length}`)
  const failures = checks.filter(check => !check.ok)
  return { ok: failures.length === 0, checks, failures }
}

export function buildYoutubeLatest20FullWatchDogfoodProof() {
  const video = {
    videoId: 'dogfood-1',
    url: 'https://www.youtube.com/watch?v=dogfood-1',
    title: 'Build AI Agent Skills',
    creator: 'Dogfood Creator',
    creatorId: 'dogfood-creator',
  }
  const pageEvidence = {
    responseOk: true,
    canonicalUrl: video.url,
    videoTitle: video.title,
    descriptionText: 'Public video description with resources.',
    resourceLinks: [{ normalizedUrl: 'https://github.com/example/skill', host: 'github.com', classification: 'public_code_repository_candidate' }],
    captionTracks: [{ languageCode: 'en' }],
    screenshotArtifact: { storageClass: 'local_temp_not_committed' },
  }
  const baseline = buildCurrentModeBaseline({ video, transcript: null, pageEvidence })
  const resourceLinkSnapshot = {
    ok: true,
    status: 'ready_for_scoper',
    counts: { resolvedPublic: 1, remainingPublic: 0, blocked: 0 },
    scoperPacket: {
      resourceLinkDispositions: ['Resolved public metadata: github.com - Example Skill Repo'],
      unresolvedPublicResourceLinks: [],
      approvalRequiredResourceLinks: [],
    },
  }
  const eyes = {
    ok: true,
    model: YOUTUBE_LATEST_20_FULL_WATCH_MODEL,
    usageMetadata: { totalTokenCount: 1000 },
    output: {
      visualEvidence: [
        { timestamp: '00:10', visibleTextOrCode: 'skill command', toolOrSurface: 'terminal', workflowObservation: 'creates skill', buildIntelValue: 'reusable skill registry' },
        { timestamp: '01:10', visibleTextOrCode: 'config file', toolOrSurface: 'editor', workflowObservation: 'edits config', buildIntelValue: 'governed config pattern' },
        { timestamp: '02:10', visibleTextOrCode: 'run proof', toolOrSurface: 'terminal', workflowObservation: 'runs proof', buildIntelValue: 'proof harness pattern' },
      ],
      buildCandidates: [
        { title: 'Reusable Skill Registry', whyItMatters: 'Package reusable skills with proof.', recommendedNextStep: 'Scope registry proof.', evidenceTimestamps: ['00:10'], confidence: 'high' },
        { title: 'Skill Proof Harness', whyItMatters: 'Verify skills before use.', recommendedNextStep: 'Scope proof harness.', evidenceTimestamps: ['02:10'], confidence: 'medium' },
      ],
      workflowMoments: [],
      missedByTranscriptOnly: ['visible terminal command'],
      riskBoundaries: ['proposal-only'],
      qualityVerdict: 'better_than_baseline',
      confidence: 'high',
    },
  }
  const healthy = buildYoutubeLatest20FullWatchSnapshot({
    generatedAt: '2026-05-25T14:45:00.000Z',
    videos: [video],
    videoResults: [{ video, pageEvidence, transcript: null, baseline, resourceLinkSnapshot, eyes }],
    liveGeminiApi: true,
  })
  const unresolved = buildYoutubeLatest20FullWatchSnapshot({
    generatedAt: '2026-05-25T14:45:00.000Z',
    videos: [video],
    videoResults: [{
      video,
      pageEvidence,
      transcript: null,
      baseline,
      eyes,
      resourceLinkSnapshot: {
        ...resourceLinkSnapshot,
        counts: { resolvedPublic: 0, remainingPublic: 1, blocked: 0 },
        scoperPacket: { resourceLinkDispositions: ['Public metadata still queued for resolver: github.com - https://github.com/example/skill'] },
      },
    }],
    liveGeminiApi: true,
  })
  const checks = [
    {
      ok: healthy.ok === true,
      check: 'healthy full-watch snapshot can proceed to Director resynthesis',
      detail: healthy.status,
    },
    {
      ok: unresolved.ok === false && unresolved.failures.some(failure => failure.check === 'safe public resource links are resolved or explicitly blocked before scoping'),
      check: 'snapshot blocks unresolved public resource links before Scoper',
      detail: unresolved.failures.map(failure => failure.check).join(', '),
    },
    {
      ok: healthy.noAutoBacklogPromotion === true && healthy.externalWrites === false,
      check: 'runner stays proposal-only with no backlog or external writes',
      detail: `${healthy.noAutoBacklogPromotion}/${healthy.externalWrites}`,
    },
  ]
  return {
    ok: checks.every(check => check.ok),
    checks,
    healthy,
    unresolved,
  }
}

export function renderYoutubeLatest20FullWatchReport(snapshot = {}) {
  const lines = []
  lines.push('# YouTube Latest-20 God Mode API Full-Watch Batch')
  lines.push('')
  lines.push(`Generated: ${snapshot.generatedAt || ''}`)
  lines.push(`Card: \`${YOUTUBE_LATEST_20_FULL_WATCH_RUNNER_CARD_ID}\``)
  lines.push(`Report artifact: \`${snapshot.reportArtifactId || YOUTUBE_LATEST_20_FULL_WATCH_REPORT_ARTIFACT_ID}\``)
  lines.push(`Status: \`${snapshot.status || 'unknown'}\``)
  lines.push(`Model: \`${snapshot.model || YOUTUBE_LATEST_20_FULL_WATCH_MODEL}\``)
  lines.push('')
  lines.push('## Plain-English Summary')
  lines.push('')
  lines.push(`The system watched ${snapshot.summary?.videoCount || 0} public non-Mark creator videos through the Gemini API video/audio/visual route, read YouTube page evidence, resolved safe public resource links, blocked unsafe links, and kept every recommendation proposal-only.`)
  lines.push('')
  lines.push('## Videos')
  lines.push('')
  for (const result of list(snapshot.videoResults)) {
    lines.push(`- ${result.video?.creator || result.video?.creatorId}: ${result.video?.title || result.video?.videoId} (${result.video?.videoId})`)
    lines.push(`  - URL: ${result.video?.url || ''}`)
    lines.push(`  - Visual evidence: ${result.eyes?.score?.timestampedVisualEvidenceCount || 0}; build candidates: ${result.eyes?.score?.buildCandidateCount || 0}; tokens: ${result.eyes?.score?.usageTotalTokens || 0}`)
    lines.push(`  - Resource links: ${result.resourceLinkSnapshot?.counts?.resolvedPublic || 0} resolved public; ${result.resourceLinkSnapshot?.counts?.blocked || 0} blocked; ${result.resourceLinkSnapshot?.counts?.remainingPublic || 0} still queued`)
  }
  lines.push('')
  lines.push('## Top Build Candidates')
  lines.push('')
  for (const candidate of list(snapshot.topBuildCandidates).slice(0, 18)) {
    lines.push(`- ${candidate.title}`)
    lines.push(`  - Source: ${candidate.creator || ''} - ${candidate.sourceTitle || candidate.sourceVideoId}`)
    lines.push(`  - Why: ${candidate.whyItMatters || ''}`)
    lines.push(`  - Next: ${candidate.recommendedNextStep || ''}`)
    lines.push(`  - Evidence: ${list(candidate.evidenceTimestamps).join(', ') || 'full-watch output'}`)
  }
  lines.push('')
  lines.push('## Boundaries')
  lines.push('')
  for (const boundary of YOUTUBE_LATEST_20_FULL_WATCH_NOT_NEXT) lines.push(`- ${boundary}`)
  lines.push('')
  lines.push('## Checks')
  lines.push('')
  for (const check of list(snapshot.checks)) lines.push(`- ${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` - ${check.detail}` : ''}`)
  lines.push('')
  return `${lines.join('\n')}\n`
}
