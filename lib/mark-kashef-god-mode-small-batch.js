import crypto from 'node:crypto'

import {
  buildCurrentModeBaseline,
  capturePublicYoutubePageEvidence,
  findTranscriptForVideo,
  runGeminiEyesForVideo,
  scoreEyesResult,
} from './god-mode-extractor-eyes-quality-loop.js'
import {
  followSafePublicResourceLinks,
  MARK_KASHEF_BASELINE_CREATOR_ID,
  MARK_KASHEF_BASELINE_SOURCE_ID,
  MARK_KASHEF_BASELINE_TARGET_KEY,
  MARK_KASHEF_BASELINE_TARGET_VIDEO_ID,
  MARK_KASHEF_LAST_50_BASELINE_CARD_ID,
  MARK_KASHEF_LAST_50_BASELINE_PLAN_PATH,
} from './god-mode-youtube-end-to-end-extractor.js'
import { GEMINI_VIDEO_CAPABILITY_DOCS, GEMINI_VIDEO_ROUTE_KEY } from './gemini-video-brain-route.js'

export const MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID = 'batch:mark-kashef-last-50:api-full-watch-small-batch-v1'
export const MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_PATH = 'docs/source-notes/mark-kashef-god-mode-small-batch-2026-05-24.md'
export const MARK_KASHEF_GOD_MODE_SMALL_BATCH_SCRIPT_PATH = 'scripts/process-mark-kashef-god-mode-small-batch-check.mjs'
export const MARK_KASHEF_GOD_MODE_SMALL_BATCH_MODEL = process.env.MARK_KASHEF_GOD_MODE_BATCH_MODEL || 'gemini-3.5-flash'
export const MARK_KASHEF_GOD_MODE_SMALL_BATCH_DEFAULT_SIZE = 3
export const MARK_KASHEF_GOD_MODE_SMALL_BATCH_MAX_SIZE = 5
export const MARK_KASHEF_GOD_MODE_SMALL_BATCH_GEMINI_TIMEOUT_MS = Number(process.env.MARK_KASHEF_GOD_MODE_BATCH_TIMEOUT_MS || 600000)

export const MARK_KASHEF_GOD_MODE_SMALL_BATCH_NOT_NEXT = [
  'Do not run the full Mark last-50 from this small batch.',
  'Do not use Gemini Workspace/subscription URL-scout output as full video watching.',
  'Do not crawl Skool, MyICOR, Gumroad, Calendly, comments, members, private, paid, auth-required, course, or community sources.',
  'Do not purchase, download, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.',
  'Do not work MEETING-VAULT-ACL-001 Phase B, mutate Drive permissions, or send request-access emails.',
  'Do not auto-create backlog cards from recommendations.',
  'Do not store raw video or screenshot bytes in git.',
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

function addFinding(findings, ok, check, detail = '') {
  findings.push({ ok: Boolean(ok), check, detail })
}

function usageTotalTokens(usage = {}) {
  return asNumber(usage.totalTokenCount, 0) ||
    asNumber(usage.promptTokenCount, 0) + asNumber(usage.candidatesTokenCount, 0)
}

function normalizePoolVideo(row = {}) {
  const metadata = row.metadata || {}
  const videoId = text(row.external_id || row.externalId || metadata.videoId)
  return {
    videoId,
    url: text(metadata.url) || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : ''),
    title: text(metadata.title) || videoId,
    creator: text(metadata.creator) || 'Mark Kashef',
    creatorId: text(metadata.creatorId),
    rank: Number(metadata.rank || 9999),
    publishVisibleDate: text(metadata.publishVisibleDate),
    visibleMetadata: text(metadata.visibleMetadata),
    sourceId: text(row.source_id || row.sourceId || metadata.sourceId) || MARK_KASHEF_BASELINE_SOURCE_ID,
    targetKey: text(row.target_key || row.targetKey) || MARK_KASHEF_BASELINE_TARGET_KEY,
    publicNoAuth: metadata.publicNoAuth !== false,
    privateOrPaidAccess: metadata.privateOrPaidAccess === true,
    approvalSource: 'SRC-YOUTUBE-INTEL-001 daily creator watch Mark queue.',
  }
}

export function selectMarkGodModeSmallBatchVideos({
  poolRows = [],
  alreadyApiWatchedVideoIds = [],
  limit = MARK_KASHEF_GOD_MODE_SMALL_BATCH_DEFAULT_SIZE,
} = {}) {
  const watched = new Set(list(alreadyApiWatchedVideoIds).map(text).filter(Boolean))
  const boundedLimit = Math.min(
    MARK_KASHEF_GOD_MODE_SMALL_BATCH_MAX_SIZE,
    Math.max(1, Number(limit) || MARK_KASHEF_GOD_MODE_SMALL_BATCH_DEFAULT_SIZE),
  )
  return list(poolRows)
    .map(normalizePoolVideo)
    .filter(video => video.videoId)
    .filter(video => video.creatorId === MARK_KASHEF_BASELINE_CREATOR_ID)
    .filter(video => video.sourceId === MARK_KASHEF_BASELINE_SOURCE_ID)
    .filter(video => video.targetKey === MARK_KASHEF_BASELINE_TARGET_KEY)
    .filter(video => video.publicNoAuth === true && video.privateOrPaidAccess === false)
    .filter(video => !watched.has(video.videoId))
    .sort((left, right) => Number(left.rank || 9999) - Number(right.rank || 9999))
    .slice(0, boundedLimit)
}

function normalizeEyesScore({ result = {}, baseline = {} } = {}) {
  if (!result?.ok) {
    return {
      ok: false,
      model: result.model || MARK_KASHEF_GOD_MODE_SMALL_BATCH_MODEL,
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

export async function runMarkGodModeSmallBatchExtraction({
  videos = [],
  transcriptArtifacts = [],
  model = MARK_KASHEF_GOD_MODE_SMALL_BATCH_MODEL,
  now = new Date().toISOString(),
  actor = 'mark-kashef-god-mode-small-batch',
  screenshotRoot = '/tmp/bcrew-mark-god-mode-small-batch',
  delayBetweenVideosMs = 15000,
  geminiTimeoutMs = MARK_KASHEF_GOD_MODE_SMALL_BATCH_GEMINI_TIMEOUT_MS,
} = {}) {
  const videoResults = []
  for (const [index, video] of list(videos).entries()) {
    const pageEvidence = await capturePublicYoutubePageEvidence({
      video,
      now,
      screenshotRoot,
    })
    const transcript = findTranscriptForVideo(video, transcriptArtifacts)
    const baseline = buildCurrentModeBaseline({ video, transcript, pageEvidence })
    const safeResourceFollowResults = await followSafePublicResourceLinks(pageEvidence.resourceLinks, { maxLinks: 2 })
    const eyes = await runGeminiEyesForVideo({
      video,
      baseline,
      pageEvidence,
      model,
      actor,
      runId: `${now}:${video.videoId}`,
      timeoutMs: geminiTimeoutMs,
      metadata: {
        parentCardId: MARK_KASHEF_LAST_50_BASELINE_CARD_ID,
        batchReportArtifactId: MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID,
        extractionMode: 'god_mode_youtube_api_small_batch',
      },
    })
    videoResults.push({ video, pageEvidence, transcript, baseline, safeResourceFollowResults, eyes })
    if (index < list(videos).length - 1) {
      await new Promise(resolve => setTimeout(resolve, Math.max(0, Number(delayBetweenVideosMs) || 0)))
    }
  }
  return videoResults
}

export function buildMarkGodModeSmallBatchSnapshot({
  generatedAt = new Date().toISOString(),
  batchRunId = generatedAt.replace(/[^0-9]/g, '').slice(0, 14),
  videos = [],
  videoResults = [],
  model = MARK_KASHEF_GOD_MODE_SMALL_BATCH_MODEL,
  liveGeminiApi = false,
  finalTailBatch = false,
} = {}) {
  const results = list(videoResults)
  const byVideoId = new Map(results.map(result => [result.video?.videoId, result]))
  const mergedResults = list(videos).map(video => byVideoId.get(video.videoId)).filter(Boolean)
  const scoreRows = mergedResults.map(result => normalizeEyesScore({ result: result.eyes, baseline: result.baseline }))
  const topBuildCandidates = mergedResults.flatMap(result => {
    return list(result.eyes?.output?.buildCandidates).map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
      sourceVideoId: result.video.videoId,
      sourceUrl: result.video.url,
      sourceTitle: result.video.title,
      creator: result.video.creator,
      model: result.eyes?.model || model,
      evidenceRefs: [
        result.baseline?.transcript?.artifactId,
        result.pageEvidence?.canonicalUrl || result.video.url,
      ].filter(Boolean),
    }))
  })
  const approvalRequiredLinks = mergedResults.flatMap(result => {
    return list(result.pageEvidence?.resourceLinks)
      .filter(link => link.approvalRequired)
      .map(link => ({
        type: 'approval_required_resource_link',
        sourceVideoId: result.video.videoId,
        sourceUrl: result.video.url,
        url: link.normalizedUrl,
        host: link.host,
        classification: link.classification,
        reason: link.reason,
        approvedInThisCard: false,
      }))
  })
  const safeResourceFollowResults = mergedResults.flatMap(result => list(result.safeResourceFollowResults))
  const checks = []
  const guardedRegularBatch = mergedResults.length >= 3 && mergedResults.length <= MARK_KASHEF_GOD_MODE_SMALL_BATCH_MAX_SIZE
  const guardedTailBatch = finalTailBatch === true && mergedResults.length >= 1 && mergedResults.length < 3
  addFinding(checks, guardedRegularBatch || guardedTailBatch, 'batch size is guarded at 3-5 videos or final tail', `${mergedResults.length}${finalTailBatch ? ' final-tail' : ''}`)
  addFinding(checks, mergedResults.every(result => result.video?.creatorId === MARK_KASHEF_BASELINE_CREATOR_ID), 'all videos come from the Mark Kashef Foundation pool', mergedResults.map(result => `${result.video?.videoId}:${result.video?.creatorId}`).join(', '))
  addFinding(checks, mergedResults.every(result => result.video?.videoId !== MARK_KASHEF_BASELINE_TARGET_VIDEO_ID), 'one-video seed is not reprocessed in the small batch', mergedResults.map(result => result.video?.videoId).join(', '))
  addFinding(checks, mergedResults.every(result => result.pageEvidence?.responseOk === true), 'public YouTube page evidence captured for every video', mergedResults.map(result => `${result.video?.videoId}:${result.pageEvidence?.responseOk}`).join(', '))
  addFinding(checks, scoreRows.every(score => score.ok === true), 'Gemini API full-watch result exists for every video', scoreRows.map(score => `${score.model}:${score.ok}`).join(', '))
  addFinding(checks, scoreRows.every(score => score.timestampedVisualEvidenceCount >= 3), 'every video has timestamped visual evidence', scoreRows.map(score => `${score.model}:${score.timestampedVisualEvidenceCount}`).join(', '))
  addFinding(checks, scoreRows.every(score => score.buildCandidateCount >= 2), 'every video has build candidates', scoreRows.map(score => `${score.model}:${score.buildCandidateCount}`).join(', '))
  addFinding(checks, topBuildCandidates.length >= mergedResults.length * 2, 'batch produced ranked build candidates', `${topBuildCandidates.length}`)
  addFinding(checks, safeResourceFollowResults.every(item => item.externalWrite === false && item.submittedForm !== true && item.downloadedFile !== true), 'safe resource follows are read-only metadata only', `${safeResourceFollowResults.length}`)
  const failures = checks.filter(check => !check.ok)
  return {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'ready_for_director_resynthesis',
    generatedAt,
    batchRunId,
    cardId: MARK_KASHEF_LAST_50_BASELINE_CARD_ID,
    planRef: MARK_KASHEF_LAST_50_BASELINE_PLAN_PATH,
    reportArtifactId: MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID,
    sourceIds: [MARK_KASHEF_BASELINE_SOURCE_ID],
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
      approvalRequiredLinkCount: approvalRequiredLinks.length,
      safeResourceFollowCount: safeResourceFollowResults.length,
      totalTokens: scoreRows.reduce((sum, score) => sum + asNumber(score.usageTotalTokens), 0),
    },
    finalTailBatch: finalTailBatch === true,
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
        approvalRequiredLinkCount: list(result.pageEvidence?.resourceLinks).filter(link => link.approvalRequired).length,
        captionTrackCount: list(result.pageEvidence?.captionTracks).length,
        screenshotArtifact: result.pageEvidence?.screenshotArtifact,
      },
      eyes: {
        ok: result.eyes?.ok,
        model: result.eyes?.model || model,
        callId: result.eyes?.callId || null,
        score: scoreRows[index],
        output: result.eyes?.output || null,
      },
      safeResourceFollowResults: list(result.safeResourceFollowResults),
    })),
    topBuildCandidates,
    actionRequiredItems: [
      ...approvalRequiredLinks,
      {
        type: 'next_batch_decision',
        item: 'Review this small API full-watch batch before increasing the Mark batch size.',
        allowedDecisions: ['run_next_3_mark_videos', 'run_next_5_mark_videos', 'rerun_prompt', 'pause_mark_batch_and_scope_director'],
        approvedInThisCard: false,
      },
    ],
    checks,
    failures,
    noAutoBacklogPromotion: true,
    externalWrites: false,
  }
}

export function buildSnapshotFromMarkGodModeSmallBatchReport(report = null) {
  const structured = report?.structuredOutputJson || report?.structured_output_json || {}
  const snapshot = structured.snapshot || {}
  return {
    ...snapshot,
    ok: Boolean(snapshot.ok),
    status: snapshot.status || (snapshot.ok ? 'ready_for_director_resynthesis' : 'blocked'),
    persistedReportArtifactId: report?.reportArtifactId || report?.report_artifact_id || null,
  }
}

export function buildMarkGodModeSmallBatchWriteSet(snapshot = {}) {
  const candidates = list(snapshot.topBuildCandidates)
  const reportArtifact = {
    reportArtifactId: MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID,
    reportType: 'director_brief',
    scopeKey: 'dev-team-build-intel',
    department: 'foundation',
    title: 'Mark Kashef God Mode API Full-Watch Small Batch',
    status: 'generated',
    sourceIds: [MARK_KASHEF_BASELINE_SOURCE_ID],
    inputArtifactIds: list(snapshot.videoResults).flatMap(result => [
      result.baseline?.transcriptArtifactId,
      `youtube:${result.video?.videoId}`,
    ]).filter(Boolean),
    topFindings: candidates.slice(0, 12).map(candidate => ({
      title: candidate.title,
      whyItMatters: candidate.whyItMatters,
      recommendedNextStep: candidate.recommendedNextStep,
      confidence: candidate.confidence,
      videoId: candidate.sourceVideoId,
      videoTitle: candidate.sourceTitle,
      evidenceTimestamps: candidate.evidenceTimestamps,
    })),
    actionRequiredItems: snapshot.actionRequiredItems || [],
    openQuestions: [
      {
        question: 'Which small-batch candidates should the Dev Intelligence Director promote into a scoped build card?',
        owner: 'Steve',
        status: 'approval_required',
      },
    ],
    structuredOutputJson: {
      snapshot,
      buildCandidates: candidates,
      videos: list(snapshot.videoResults).map(result => ({
        videoId: result.video?.videoId,
        url: result.video?.url,
        title: result.video?.title,
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
      cardId: MARK_KASHEF_LAST_50_BASELINE_CARD_ID,
      batchRunId: snapshot.batchRunId,
      proofMode: 'god_mode_youtube_api_small_batch',
      fullWatchRoute: 'gemini_api_youtube_url_video_understanding',
      subscriptionWorkspaceFullWatch: false,
      model: snapshot.model,
      videoIds: list(snapshot.videoResults).map(result => result.video?.videoId).filter(Boolean),
      createsBacklogCardsAutomatically: false,
      externalWrites: false,
      privateOrPaidAccess: false,
      finalTailBatch: snapshot.finalTailBatch === true,
    },
  }

  const atomInputs = candidates.slice(0, 12).map((candidate, index) => {
    const atomId = `atom:${MARK_KASHEF_LAST_50_BASELINE_CARD_ID.toLowerCase()}:api-batch:${slug(candidate.sourceVideoId)}:${slug(candidate.title)}`
    return {
      atomId,
      title: candidate.title,
      content: candidate.whyItMatters || candidate.recommendedNextStep || candidate.title,
      atomType: 'action_candidate',
      sourceId: MARK_KASHEF_BASELINE_SOURCE_ID,
      reportArtifactId: MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID,
      modality: 'video',
      anchorType: 'youtube_video',
      anchorValue: candidate.sourceUrl,
      evidenceExcerpt: list(candidate.evidenceTimestamps).join(', ') || candidate.sourceVideoId,
      visualObservation: candidate.whyItMatters,
      derivedClaim: candidate.recommendedNextStep,
      topicRefs: ['god-mode-extractor', 'mark-kashef', 'youtube-full-watch', 'build-intel'],
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
      tags: ['god-mode-youtube', 'api-full-watch-small-batch', 'proposal-only', 'mark-kashef'],
      metadata: {
        sourceVideoId: candidate.sourceVideoId,
        sourceUrl: candidate.sourceUrl,
        sourceTitle: candidate.sourceTitle,
        model: candidate.model,
        proposalOnly: true,
        writesBacklog: false,
      },
      dedupHash: stableHash({
        reportArtifactId: MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID,
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
      sourceId: MARK_KASHEF_BASELINE_SOURCE_ID,
      reportArtifactId: MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID,
      hitType: 'supporting_evidence',
      evidenceExcerpt: `${candidate.creator || 'Mark Kashef'} ${candidate.sourceVideoId || ''}: ${list(candidate.evidenceTimestamps).join(', ') || 'Gemini API full-watch evidence'}`.slice(0, 900),
      anchorType: 'youtube_video',
      anchorValue: candidate.sourceUrl || '',
      confidence: atom.extractionConfidence,
      metadata: {
        cardId: MARK_KASHEF_LAST_50_BASELINE_CARD_ID,
        model: candidate.model,
        evidenceTimestamps: candidate.evidenceTimestamps || [],
        sourceVideoId: candidate.sourceVideoId,
      },
    }
  })
  return { reportArtifact, atomInputs, hitInputs }
}

export function verifyMarkGodModeSmallBatchPersistedProof({ snapshot = {}, report = null, atoms = [], hits = [] } = {}) {
  const checks = []
  const reportVideoCount = list(report?.metadata?.videoIds).length
  const guardedRegularBatch = reportVideoCount >= 3 && reportVideoCount <= MARK_KASHEF_GOD_MODE_SMALL_BATCH_MAX_SIZE
  const guardedTailBatch = snapshot.finalTailBatch === true && reportVideoCount >= 1 && reportVideoCount < 3
  addFinding(checks, report?.reportArtifactId === MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID, 'small-batch report artifact reads back', report?.reportArtifactId || 'missing')
  addFinding(checks, report?.metadata?.fullWatchRoute === 'gemini_api_youtube_url_video_understanding', 'report records Gemini API full-watch route', report?.metadata?.fullWatchRoute || 'missing')
  addFinding(checks, report?.metadata?.subscriptionWorkspaceFullWatch === false, 'report rejects subscription route as full-watch', String(report?.metadata?.subscriptionWorkspaceFullWatch))
  addFinding(checks, guardedRegularBatch || guardedTailBatch, 'report records guarded video count', `${reportVideoCount}${snapshot.finalTailBatch ? ' final-tail' : ''}`)
  addFinding(checks, report?.structuredOutputJson?.snapshot?.status === snapshot.status, 'persisted snapshot status matches', report?.structuredOutputJson?.snapshot?.status || 'missing')
  addFinding(checks, list(atoms).length >= Math.min(6, list(snapshot.topBuildCandidates).length), 'proposal atoms read back', `${list(atoms).length}`)
  addFinding(checks, list(hits).length >= Math.min(6, list(atoms).length), 'evidence hits read back', `${list(hits).length}/${list(atoms).length}`)
  const failures = checks.filter(check => !check.ok)
  return { ok: failures.length === 0, checks, failures }
}

export function renderMarkGodModeSmallBatchReport(snapshot = {}) {
  const lines = []
  lines.push('# Mark Kashef God Mode API Full-Watch Small Batch')
  lines.push('')
  lines.push(`Generated: ${snapshot.generatedAt || ''}`)
  lines.push(`Card: \`${MARK_KASHEF_LAST_50_BASELINE_CARD_ID}\``)
  lines.push(`Report artifact: \`${MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID}\``)
  lines.push(`Status: \`${snapshot.status || 'unknown'}\``)
  lines.push(`Model: \`${snapshot.model || MARK_KASHEF_GOD_MODE_SMALL_BATCH_MODEL}\``)
  lines.push('')
  lines.push('## Plain-English Summary')
  lines.push('')
  lines.push(`The system watched ${snapshot.summary?.videoCount || 0} public Mark Kashef videos through the Gemini API video/audio/visual route, read the YouTube page evidence, classified resource links, and kept every recommendation proposal-only.`)
  lines.push('')
  lines.push('## Videos')
  lines.push('')
  for (const result of list(snapshot.videoResults)) {
    lines.push(`- ${result.video?.title || result.video?.videoId} (${result.video?.videoId})`)
    lines.push(`  - URL: ${result.video?.url || ''}`)
    lines.push(`  - Visual evidence: ${result.eyes?.score?.timestampedVisualEvidenceCount || 0}; build candidates: ${result.eyes?.score?.buildCandidateCount || 0}; tokens: ${result.eyes?.score?.usageTotalTokens || 0}`)
  }
  lines.push('')
  lines.push('## Top Build Candidates')
  lines.push('')
  for (const candidate of list(snapshot.topBuildCandidates).slice(0, 12)) {
    lines.push(`- ${candidate.title}`)
    lines.push(`  - Source video: ${candidate.sourceTitle || candidate.sourceVideoId}`)
    lines.push(`  - Why: ${candidate.whyItMatters || ''}`)
    lines.push(`  - Next: ${candidate.recommendedNextStep || ''}`)
    lines.push(`  - Evidence: ${list(candidate.evidenceTimestamps).join(', ') || 'full-watch output'}`)
  }
  lines.push('')
  lines.push('## Boundaries')
  lines.push('')
  for (const boundary of MARK_KASHEF_GOD_MODE_SMALL_BATCH_NOT_NEXT) lines.push(`- ${boundary}`)
  lines.push('')
  lines.push('## Checks')
  lines.push('')
  for (const check of list(snapshot.checks)) lines.push(`- ${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` - ${check.detail}` : ''}`)
  lines.push('')
  return `${lines.join('\n')}\n`
}
