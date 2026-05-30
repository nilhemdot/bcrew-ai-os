import crypto from 'node:crypto'

import {
  GEMINI_VIDEO_CANDIDATE_MODEL,
  GEMINI_VIDEO_CAPABILITY_DOCS,
  GEMINI_VIDEO_PRIMARY_MODEL,
  GEMINI_VIDEO_ROUTE_KEY,
} from './gemini-video-brain-route.js'
import {
  buildCurrentModeBaseline,
  capturePublicYoutubePageEvidence,
  findTranscriptForVideo,
  runGeminiEyesForVideo,
  scoreEyesResult,
} from './god-mode-extractor-eyes-quality-loop.js'

export const MARK_KASHEF_LAST_50_BASELINE_CARD_ID = 'MARK-KASHEF-LAST-50-BASELINE-001'
export const MARK_KASHEF_LAST_50_BASELINE_PLAN_PATH = 'docs/process/mark-kashef-last-50-baseline-001-plan.md'
export const MARK_KASHEF_LAST_50_BASELINE_APPROVAL_PATH = 'docs/process/approvals/MARK-KASHEF-LAST-50-BASELINE-001.json'
export const MARK_KASHEF_LAST_50_BASELINE_SCRIPT_PATH = 'scripts/process-mark-kashef-last-50-baseline-check.mjs'
export const MARK_KASHEF_BASELINE_REPORT_ARTIFACT_ID = 'proof:mark-kashef-last-50-baseline-001:god-mode-end-to-end:5xrjO38WUYY'
export const MARK_KASHEF_BASELINE_REPORT_PATH = 'docs/source-notes/mark-kashef-god-mode-youtube-end-to-end-2026-05-23.md'
export const MARK_KASHEF_BASELINE_SPRINT_ID = 'YOUTUBE-TO-DEV-TEAM-INTELLIGENCE-V1-2026-05-21'
export const MARK_KASHEF_BASELINE_SOURCE_ID = 'SRC-YOUTUBE-INTEL-001'
export const MARK_KASHEF_BASELINE_TARGET_KEY = 'youtube-creator-daily-watch'
export const MARK_KASHEF_BASELINE_CREATOR_ID = 'mark-kashef'
export const MARK_KASHEF_BASELINE_TARGET_VIDEO_ID = '5xrjO38WUYY'
export const MARK_KASHEF_BASELINE_BASE_MODEL = process.env.GOD_MODE_YOUTUBE_BASE_MODEL || GEMINI_VIDEO_PRIMARY_MODEL
export const MARK_KASHEF_BASELINE_CANDIDATE_MODEL = process.env.GOD_MODE_YOUTUBE_CANDIDATE_MODEL || GEMINI_VIDEO_CANDIDATE_MODEL

export const MARK_KASHEF_BASELINE_CHANGED_FILES = [
  'lib/god-mode-extractor-eyes-quality-loop.js',
  'lib/god-mode-youtube-end-to-end-extractor.js',
  MARK_KASHEF_LAST_50_BASELINE_SCRIPT_PATH,
  MARK_KASHEF_LAST_50_BASELINE_PLAN_PATH,
  MARK_KASHEF_LAST_50_BASELINE_APPROVAL_PATH,
  MARK_KASHEF_BASELINE_REPORT_PATH,
  'docs/_archive/handoffs/2026-05-23-god-mode-extractor-checkpoint.md',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'package.json',
]

export const MARK_KASHEF_BASELINE_NOT_NEXT = [
  'Do not run Mark last-50 from this one-video proof.',
  'Do not treat Gemini Workspace/subscription URL-scout output as full video watching.',
  'Do not use transcript-only, metadata-only, or stale report output as God Mode full-watch proof.',
  'Do not crawl Skool, MyICOR, Gumroad, Calendly, comments, members, private, paid, auth-required, course, or community sources.',
  'Do not purchase, download, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.',
  'Do not auto-create backlog cards from recommendations.',
  'Do not store raw video or screenshot bytes in git.',
  'Do not work MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions from this extractor lane.',
]

export const MARK_KASHEF_BASELINE_PROOF_COMMANDS = [
  'node --check lib/god-mode-extractor-eyes-quality-loop.js',
  'node --check lib/god-mode-youtube-end-to-end-extractor.js',
  'node --check scripts/process-mark-kashef-last-50-baseline-check.mjs',
  'npm run process:mark-kashef-last-50-baseline-check -- --apply --live-gemini-api --json',
  'npm run process:current-sprint-active-card-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run process:foundation-plan-reconcile-check -- --json',
  'npm run foundation:verify -- --json-summary',
]

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
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
    .slice(0, 80) || 'item'
}

function addFinding(findings, ok, check, detail = '') {
  findings.push({ ok: Boolean(ok), check, detail })
}

function asNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function usageTotalTokens(usage = {}) {
  return asNumber(usage.totalTokenCount, 0) ||
    asNumber(usage.promptTokenCount, 0) + asNumber(usage.candidatesTokenCount, 0)
}

function normalizeVideo(video = {}) {
  return {
    videoId: text(video.videoId || video.externalId || video.external_id) || MARK_KASHEF_BASELINE_TARGET_VIDEO_ID,
    url: text(video.url || video.sourceUrl || video.source_url) || `https://www.youtube.com/watch?v=${MARK_KASHEF_BASELINE_TARGET_VIDEO_ID}`,
    title: text(video.title) || 'How to Use /goal to Build a Self-Improving OS',
    creator: text(video.creator || video.sourceAccount || video.source_account) || 'Mark Kashef',
    rank: Number(video.rank || 9999),
    approvalSource: text(video.approvalSource) || 'Steve May 21 approved exact public Mark Kashef YouTube seed video.',
  }
}

function isSafePublicResourceLink(link = {}) {
  const host = text(link.host).toLowerCase()
  if (!host) return false
  if (link.approvalRequired === true) return false
  if (link.classification === 'public_youtube_internal') return false
  return [
    'github.com',
    'gist.github.com',
    'docs.github.com',
    'npmjs.com',
    'pypi.org',
    'playwright.dev',
    'ai.google.dev',
    'developers.google.com',
    'docs.browserbase.com',
    'browserbase.com',
    'vercel.app',
  ].some(allowed => host === allowed || host.endsWith(`.${allowed}`))
}

async function fetchWithTimeout(url, { timeoutMs = 15000 } = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'BCrew-AI-OS-God-Mode-Extractor/1.0 read-only-source-proof',
        accept: 'text/html,text/plain,application/json;q=0.8,*/*;q=0.5',
      },
    })
  } finally {
    clearTimeout(timeout)
  }
}

export async function followSafePublicResourceLinks(resourceLinks = [], { maxLinks = 3 } = {}) {
  const safeLinks = list(resourceLinks).filter(isSafePublicResourceLink).slice(0, maxLinks)
  const results = []
  for (const link of safeLinks) {
    try {
      const response = await fetchWithTimeout(link.normalizedUrl)
      const contentType = response.headers.get('content-type') || ''
      const body = await response.text()
      const excerpt = body.replace(/\s+/g, ' ').slice(0, 1200)
      const title = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() || ''
      results.push({
        ok: response.ok,
        url: link.normalizedUrl,
        host: link.host,
        classification: link.classification,
        status: response.status,
        contentType,
        title,
        excerpt,
        followedAs: 'safe_public_read_only_metadata',
        externalWrite: false,
        downloadedFile: false,
        submittedForm: false,
      })
    } catch (error) {
      results.push({
        ok: false,
        url: link.normalizedUrl,
        host: link.host,
        classification: link.classification,
        error: error instanceof Error ? error.message : String(error),
        followedAs: 'safe_public_read_only_metadata',
        externalWrite: false,
      })
    }
  }
  return results
}

function normalizeModelScore({ modelResult = {}, baseline = {} } = {}) {
  if (!modelResult?.ok) {
    return {
      model: modelResult.model,
      ok: false,
      error: modelResult.error || 'missing model result',
      baselineScore: asNumber(baseline.score, 0),
      eyesScore: 0,
      qualityDelta: -asNumber(baseline.score, 0),
      visualEvidenceCount: 0,
      timestampedVisualEvidenceCount: 0,
      buildCandidateCount: 0,
      usageTotalTokens: 0,
      qualityPer1kTokens: 0,
    }
  }
  const scored = scoreEyesResult({ baseline, eyes: modelResult })
  const totalTokens = usageTotalTokens(modelResult.usageMetadata || {})
  return {
    model: modelResult.model,
    ok: true,
    ...scored,
    usageMetadata: modelResult.usageMetadata || {},
    usageTotalTokens: totalTokens,
    qualityPer1kTokens: totalTokens ? Number(((scored.eyesScore / totalTokens) * 1000).toFixed(3)) : 0,
    output: modelResult.output,
    callId: modelResult.callId || null,
  }
}

function selectRecommendedModel(modelScores = []) {
  const successful = list(modelScores).filter(score => score.ok)
  if (!successful.length) return null
  const byQuality = [...successful].sort((a, b) =>
    asNumber(b.eyesScore) - asNumber(a.eyesScore) ||
    asNumber(b.qualityPer1kTokens) - asNumber(a.qualityPer1kTokens),
  )
  const bestQuality = byQuality[0]
  const bestValue = [...successful].sort((a, b) =>
    asNumber(b.qualityPer1kTokens) - asNumber(a.qualityPer1kTokens) ||
    asNumber(b.eyesScore) - asNumber(a.eyesScore),
  )[0]
  const qualityGap = asNumber(bestQuality.eyesScore) - asNumber(bestValue.eyesScore)
  const recommended = qualityGap <= 4 ? bestValue : bestQuality
  return {
    recommendedModel: recommended.model,
    reason: qualityGap <= 4
      ? 'Quality was close, so the better quality-per-token model wins.'
      : 'Quality gap was meaningful, so the higher-quality model wins.',
    bestQualityModel: bestQuality.model,
    bestValueModel: bestValue.model,
    qualityGap,
  }
}

export async function runGodModeYoutubeModelComparison({
  video,
  baseline,
  pageEvidence,
  models = [MARK_KASHEF_BASELINE_BASE_MODEL, MARK_KASHEF_BASELINE_CANDIDATE_MODEL],
  actor = 'mark-kashef-last-50-baseline',
  runId = new Date().toISOString(),
} = {}) {
  const uniqueModels = Array.from(new Set(models.map(text).filter(Boolean)))
  const results = []
  for (const [index, model] of uniqueModels.entries()) {
    try {
      const result = await runGeminiEyesForVideo({
        video,
        baseline,
        pageEvidence,
        model,
        actor,
        runId: `${runId}:${model}`,
        metadata: {
          parentCardId: MARK_KASHEF_LAST_50_BASELINE_CARD_ID,
          comparisonRole: model === MARK_KASHEF_BASELINE_BASE_MODEL ? 'current_system_model' : 'candidate_model',
        },
      })
      results.push(result)
    } catch (error) {
      results.push({
        ok: false,
        mode: 'gemini_video_understanding_eyes_v0',
        videoId: video.videoId,
        sourceUrl: video.url,
        provider: 'gemini',
        model,
        routeKey: GEMINI_VIDEO_ROUTE_KEY,
        error: error instanceof Error ? error.message : String(error),
      })
    }
    if (index < uniqueModels.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 15000))
    }
  }
  return results
}

export function buildGodModeYoutubeEndToEndSnapshot({
  generatedAt = new Date().toISOString(),
  video = {},
  transcriptArtifacts = [],
  pageEvidence = null,
  safeResourceFollowResults = [],
  modelResults = [],
  liveGeminiApi = false,
} = {}) {
  const normalizedVideo = normalizeVideo(video)
  const transcript = findTranscriptForVideo(normalizedVideo, transcriptArtifacts)
  const baseline = buildCurrentModeBaseline({ video: normalizedVideo, transcript, pageEvidence })
  const modelScores = list(modelResults).map(result => normalizeModelScore({ modelResult: result, baseline }))
  const recommended = selectRecommendedModel(modelScores)
  const bestResult = list(modelResults).find(result => result.model === recommended?.recommendedModel && result.ok) ||
    list(modelResults).find(result => result.ok) || null
  const resourceLinks = list(pageEvidence?.resourceLinks)
  const approvalRequiredLinks = resourceLinks.filter(link => link.approvalRequired)
  const safeLinks = resourceLinks.filter(isSafePublicResourceLink)
  const topBuildCandidates = list(bestResult?.output?.buildCandidates).map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
    sourceVideoId: normalizedVideo.videoId,
    sourceUrl: normalizedVideo.url,
    sourceTitle: normalizedVideo.title,
    creator: normalizedVideo.creator,
    model: bestResult?.model,
  }))
  const checks = []
  addFinding(checks, normalizedVideo.videoId === MARK_KASHEF_BASELINE_TARGET_VIDEO_ID, 'exact approved Mark video is selected', normalizedVideo.videoId)
  addFinding(checks, pageEvidence?.responseOk === true, 'public YouTube page evidence captured', pageEvidence?.finalUrl || 'missing')
  addFinding(checks, baseline.transcript?.present === true, 'transcript artifact is included when available', baseline.transcript?.artifactId || 'missing')
  addFinding(checks, baseline.descriptionLength > 100, 'description/page text is included', `${baseline.descriptionLength}`)
  addFinding(checks, resourceLinks.length >= 1, 'resource links are classified', `${resourceLinks.length}`)
  addFinding(checks, list(modelResults).length >= 2, 'two Gemini models were tested', list(modelResults).map(result => `${result.model}:${result.ok}`).join(', '))
  addFinding(checks, modelScores.filter(score => score.ok).length >= 2, 'both model calls succeeded for quality/value comparison', modelScores.map(score => `${score.model}:${score.ok}`).join(', '))
  addFinding(checks, modelScores.some(score => score.timestampedVisualEvidenceCount >= 3), 'full-watch result includes timestamped visual evidence', modelScores.map(score => `${score.model}:${score.timestampedVisualEvidenceCount}`).join(', '))
  addFinding(checks, modelScores.some(score => score.buildCandidateCount >= 2), 'full-watch result includes build candidates', modelScores.map(score => `${score.model}:${score.buildCandidateCount}`).join(', '))
  addFinding(checks, Boolean(recommended?.recommendedModel), 'recommended model is selected from evidence', recommended?.recommendedModel || 'missing')
  addFinding(checks, list(safeResourceFollowResults).every(item => item.externalWrite === false && item.submittedForm !== true && item.downloadedFile !== true), 'safe resource follows are read-only metadata only', `${list(safeResourceFollowResults).length}`)
  const failures = checks.filter(check => !check.ok)
  const ok = failures.length === 0
  return {
    ok,
    status: ok ? 'ready_for_next_mark_batch_decision' : 'blocked',
    generatedAt,
    cardId: MARK_KASHEF_LAST_50_BASELINE_CARD_ID,
    reportArtifactId: MARK_KASHEF_BASELINE_REPORT_ARTIFACT_ID,
    sourceIds: [MARK_KASHEF_BASELINE_SOURCE_ID],
    liveGeminiApi,
    video: normalizedVideo,
    route: {
      provider: 'gemini',
      routeKey: GEMINI_VIDEO_ROUTE_KEY,
      fullVideoWatchRoute: 'gemini_api_youtube_url_video_understanding',
      subscriptionWorkspaceFullWatch: false,
      docs: GEMINI_VIDEO_CAPABILITY_DOCS,
    },
    sourcePackage: {
      transcript: baseline.transcript,
      baseline,
      pageEvidence: pageEvidence ? {
        responseOk: pageEvidence.responseOk,
        finalUrl: pageEvidence.finalUrl,
        videoTitle: pageEvidence.videoTitle,
        descriptionLength: baseline.descriptionLength,
        resourceLinkCount: resourceLinks.length,
        approvalRequiredLinkCount: approvalRequiredLinks.length,
        safePublicResourceLinkCount: safeLinks.length,
        captionTrackCount: list(pageEvidence.captionTracks).length,
        screenshotArtifact: pageEvidence.screenshotArtifact,
      } : null,
      resourceLinks,
      safeResourceFollowResults,
      approvalRequiredLinks: approvalRequiredLinks.map(link => ({
        type: 'approval_required_resource_link',
        url: link.normalizedUrl,
        host: link.host,
        classification: link.classification,
        reason: link.reason,
        approvedInThisCard: false,
      })),
    },
    modelComparison: {
      baseModel: MARK_KASHEF_BASELINE_BASE_MODEL,
      candidateModel: MARK_KASHEF_BASELINE_CANDIDATE_MODEL,
      modelScores,
      recommendation: recommended,
    },
    topBuildCandidates,
    checks,
    failures,
  }
}

export function buildSnapshotFromMarkGodModeReport(report = null) {
  const structured = report?.structuredOutputJson || report?.structured_output_json || {}
  const snapshot = structured.snapshot || {}
  return {
    ...snapshot,
    ok: Boolean(snapshot.ok),
    status: snapshot.status || (snapshot.ok ? 'ready_for_next_mark_batch_decision' : 'blocked'),
    persistedReportArtifactId: report?.reportArtifactId || report?.report_artifact_id || null,
  }
}

export function buildMarkGodModeWriteSet(snapshot = {}) {
  const candidates = list(snapshot.topBuildCandidates)
  const reportArtifact = {
    reportArtifactId: MARK_KASHEF_BASELINE_REPORT_ARTIFACT_ID,
    reportType: 'director_brief',
    scopeKey: 'dev-team-build-intel',
    department: 'foundation',
    title: 'Mark Kashef God Mode YouTube End-to-End Extraction',
    status: 'generated',
    sourceIds: [MARK_KASHEF_BASELINE_SOURCE_ID],
    inputArtifactIds: [snapshot.sourcePackage?.transcript?.artifactId, `youtube:${snapshot.video?.videoId}`].filter(Boolean),
    topFindings: [
      {
        finding: 'One exact Mark video was processed through Gemini API full video/audio/visual understanding plus transcript/page/resource evidence.',
        evidence: {
          videoId: snapshot.video?.videoId,
          recommendedModel: snapshot.modelComparison?.recommendation?.recommendedModel,
          modelScores: snapshot.modelComparison?.modelScores?.map(score => ({
            model: score.model,
            eyesScore: score.eyesScore,
            qualityDelta: score.qualityDelta,
            totalTokens: score.usageTotalTokens,
            qualityPer1kTokens: score.qualityPer1kTokens,
          })),
        },
      },
      {
        finding: 'Gemini Workspace/subscription web route remains scout/reasoning only for YouTube URLs until it proves real full-watch parity.',
        evidence: 'This report uses gemini_api_youtube_url_video_understanding as the full-watch route.',
      },
    ],
    actionRequiredItems: [
      ...(snapshot.sourcePackage?.approvalRequiredLinks || []),
      {
        type: 'next_batch_decision',
        item: 'Approve next Mark batch size only after reviewing this one-video end-to-end proof.',
        allowedDecisions: ['run_next_3_mark_videos', 'rerun_prompt', 'change_model', 'park_mark_and_fix_extractor'],
        approvedInThisCard: false,
      },
    ],
    openQuestions: [
      {
        question: 'Should the next Mark batch use the recommended model from this comparison as default?',
        owner: 'Steve',
        status: 'approval_required',
      },
    ],
    structuredOutputJson: {
      snapshot,
      reviewRoutes: candidates.map((candidate, index) => ({
        reviewRouteId: `build-intel-review:mark-god-mode:${snapshot.video?.videoId}:${index + 1}`,
        sourceId: MARK_KASHEF_BASELINE_SOURCE_ID,
        sourceUrl: candidate.sourceUrl,
        proposalOnly: true,
        writesBacklog: false,
        externalWrites: false,
        requiresSteveReview: true,
        recommendation: candidate.recommendedNextStep,
        routingReason: candidate.whyItMatters,
        model: candidate.model,
      })),
      noAutoBacklogPromotion: true,
    },
    metadata: {
      cardId: MARK_KASHEF_LAST_50_BASELINE_CARD_ID,
      proofMode: 'god_mode_youtube_end_to_end_one_video',
      fullWatchRoute: 'gemini_api_youtube_url_video_understanding',
      recommendedModel: snapshot.modelComparison?.recommendation?.recommendedModel || null,
      comparedModels: snapshot.modelComparison?.modelScores?.map(score => score.model) || [],
      sourceVideoId: snapshot.video?.videoId,
      createsBacklogCardsAutomatically: false,
      externalWrites: false,
      privateOrPaidAccess: false,
    },
  }
  const atomInputs = candidates.slice(0, 6).map((candidate, index) => {
    const atomId = `atom:${MARK_KASHEF_LAST_50_BASELINE_CARD_ID.toLowerCase()}:god-mode:${slug(candidate.sourceVideoId)}:${index + 1}`
    return {
      atomId,
      title: candidate.title,
      content: candidate.whyItMatters,
      atomType: 'action_candidate',
      sourceId: MARK_KASHEF_BASELINE_SOURCE_ID,
      reportArtifactId: MARK_KASHEF_BASELINE_REPORT_ARTIFACT_ID,
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
      relevanceScore: 95 - index,
      sourceConfidence: candidate.confidence === 'high' ? 0.92 : candidate.confidence === 'medium' ? 0.78 : 0.62,
      extractionConfidence: candidate.confidence === 'high' ? 0.88 : candidate.confidence === 'medium' ? 0.75 : 0.6,
      sensitivity: 'neutral',
      minTier: 1,
      freshness: 'trending',
      status: 'detected',
      suggestedOwner: 'Dev Team Intelligence Director',
      suggestedAction: candidate.recommendedNextStep,
      tags: ['god-mode-youtube', 'proposal-only', 'mark-kashef'],
      metadata: {
        sourceVideoId: candidate.sourceVideoId,
        sourceUrl: candidate.sourceUrl,
        model: candidate.model,
        proposalOnly: true,
        writesBacklog: false,
      },
      dedupHash: stableHash({
        cardId: MARK_KASHEF_LAST_50_BASELINE_CARD_ID,
        reportArtifactId: MARK_KASHEF_BASELINE_REPORT_ARTIFACT_ID,
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
      reportArtifactId: MARK_KASHEF_BASELINE_REPORT_ARTIFACT_ID,
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

export function verifyMarkGodModePersistedProof({ snapshot = {}, report = null, atoms = [], hits = [] } = {}) {
  const checks = []
  addFinding(checks, report?.reportArtifactId === MARK_KASHEF_BASELINE_REPORT_ARTIFACT_ID, 'report artifact reads back', report?.reportArtifactId || 'missing')
  addFinding(checks, report?.structuredOutputJson?.snapshot?.status === snapshot.status, 'persisted snapshot status matches', report?.structuredOutputJson?.snapshot?.status || 'missing')
  addFinding(checks, report?.metadata?.fullWatchRoute === 'gemini_api_youtube_url_video_understanding', 'report records full-watch API route', report?.metadata?.fullWatchRoute || 'missing')
  addFinding(checks, report?.metadata?.createsBacklogCardsAutomatically === false, 'report records no auto backlog promotion', String(report?.metadata?.createsBacklogCardsAutomatically))
  addFinding(checks, list(atoms).length >= 2, 'proposal atoms read back', `${list(atoms).length}`)
  addFinding(checks, list(hits).length === list(atoms).length, 'evidence hits read back for atoms', `${list(hits).length}/${list(atoms).length}`)
  const failures = checks.filter(check => !check.ok)
  return { ok: failures.length === 0, checks, failures }
}

export function buildMarkGodModeDogfoodProof() {
  const transcriptOnly = buildGodModeYoutubeEndToEndSnapshot({
    video: { videoId: MARK_KASHEF_BASELINE_TARGET_VIDEO_ID, url: `https://www.youtube.com/watch?v=${MARK_KASHEF_BASELINE_TARGET_VIDEO_ID}` },
    transcriptArtifacts: [],
    pageEvidence: {
      videoId: MARK_KASHEF_BASELINE_TARGET_VIDEO_ID,
      responseOk: true,
      descriptionText: 'short',
      resourceLinks: [],
      captionTracks: [],
    },
    modelResults: [],
  })
  const fakeFullWatch = buildGodModeYoutubeEndToEndSnapshot({
    video: { videoId: MARK_KASHEF_BASELINE_TARGET_VIDEO_ID, url: `https://www.youtube.com/watch?v=${MARK_KASHEF_BASELINE_TARGET_VIDEO_ID}` },
    transcriptArtifacts: [{
      artifactId: `${MARK_KASHEF_BASELINE_SOURCE_ID}:video_transcript:${MARK_KASHEF_BASELINE_TARGET_VIDEO_ID}`,
      contentText: 'synthetic transcript proof '.repeat(80),
      metadata: { videoId: MARK_KASHEF_BASELINE_TARGET_VIDEO_ID },
    }],
    pageEvidence: {
      videoId: MARK_KASHEF_BASELINE_TARGET_VIDEO_ID,
      responseOk: true,
      finalUrl: `https://www.youtube.com/watch?v=${MARK_KASHEF_BASELINE_TARGET_VIDEO_ID}`,
      descriptionText: 'description with a public resource link and source context '.repeat(8),
      resourceLinks: [{ normalizedUrl: 'https://github.com/example/repo', host: 'github.com', classification: 'public_code_repository_candidate', approvalRequired: false }],
      captionTracks: [{ languageCode: 'en' }],
    },
    modelResults: [MARK_KASHEF_BASELINE_BASE_MODEL, MARK_KASHEF_BASELINE_CANDIDATE_MODEL].map(model => ({
      ok: true,
      model,
      usageMetadata: { totalTokenCount: model === MARK_KASHEF_BASELINE_CANDIDATE_MODEL ? 900 : 1000 },
      output: {
        visualEvidence: [
          { timestamp: '01:00', visibleTextOrCode: 'terminal command', toolOrSurface: 'Claude Code', workflowObservation: 'runs /goal', buildIntelValue: 'goal loop evidence' },
          { timestamp: '02:00', visibleTextOrCode: 'browser UI', toolOrSurface: 'Gemini', workflowObservation: 'compares output', buildIntelValue: 'model compare evidence' },
          { timestamp: '03:00', visibleTextOrCode: 'handoff doc', toolOrSurface: 'repo', workflowObservation: 'captures next step', buildIntelValue: 'handoff pattern' },
        ],
        workflowMoments: [{ timestamp: '01:00', moment: 'goal loop', transferToAios: 'quality loop' }],
        buildCandidates: [
          { title: 'Build extractor quality compare', whyItMatters: 'model quality proof', recommendedNextStep: 'ship focused proof', evidenceTimestamps: ['01:00'], confidence: 'high' },
          { title: 'Build source package runner', whyItMatters: 'source evidence proof', recommendedNextStep: 'ship source package', evidenceTimestamps: ['02:00'], confidence: 'medium' },
        ],
        missedByTranscriptOnly: ['screen-visible command'],
        qualityVerdict: 'better_than_baseline',
        confidence: 'high',
      },
    })),
  })
  return {
    ok: Boolean(transcriptOnly.ok === false &&
      fakeFullWatch.ok === true &&
      fakeFullWatch.modelComparison.recommendation?.recommendedModel),
    cases: [
      { name: 'transcript_or_subscription_scout_only_fails', ok: transcriptOnly.ok === false, status: transcriptOnly.status },
      { name: 'full_watch_two_model_source_package_passes', ok: fakeFullWatch.ok === true, status: fakeFullWatch.status },
      { name: 'subscription_web_not_labeled_full_watch', ok: fakeFullWatch.route.subscriptionWorkspaceFullWatch === false },
    ],
  }
}

export function renderMarkGodModeReport(snapshot = {}) {
  const lines = []
  lines.push('# Mark Kashef God Mode YouTube End-to-End Extraction')
  lines.push('')
  lines.push(`Generated: ${snapshot.generatedAt || ''}`)
  lines.push(`Card: \`${MARK_KASHEF_LAST_50_BASELINE_CARD_ID}\``)
  lines.push(`Report artifact: \`${MARK_KASHEF_BASELINE_REPORT_ARTIFACT_ID}\``)
  lines.push(`Status: \`${snapshot.status}\``)
  lines.push('')
  lines.push('## Decision')
  lines.push('')
  lines.push(snapshot.ok
    ? `Use \`${snapshot.modelComparison?.recommendation?.recommendedModel || 'the recommended model'}\` for the next guarded Mark batch unless Steve overrides after review.`
    : 'Do not run the next Mark batch. Fix this one-video proof first.')
  lines.push('')
  lines.push('## Source Package')
  lines.push('')
  lines.push(`- Video: ${snapshot.video?.title || ''} (${snapshot.video?.videoId || ''})`)
  lines.push(`- URL: ${snapshot.video?.url || ''}`)
  lines.push(`- Transcript artifact: ${snapshot.sourcePackage?.transcript?.artifactId || 'missing'}`)
  lines.push(`- Description length: ${snapshot.sourcePackage?.baseline?.descriptionLength || 0}`)
  lines.push(`- Resource links classified: ${list(snapshot.sourcePackage?.resourceLinks).length}`)
  lines.push(`- Approval-required links: ${list(snapshot.sourcePackage?.approvalRequiredLinks).length}`)
  lines.push(`- Safe public links followed as metadata: ${list(snapshot.sourcePackage?.safeResourceFollowResults).length}`)
  lines.push('')
  lines.push('## Model Comparison')
  lines.push('')
  for (const score of list(snapshot.modelComparison?.modelScores)) {
    lines.push(`- ${score.model}: ok=${score.ok}, score=${score.eyesScore}, delta=${score.qualityDelta}, timestamped=${score.timestampedVisualEvidenceCount}, candidates=${score.buildCandidateCount}, tokens=${score.usageTotalTokens}, qualityPer1k=${score.qualityPer1kTokens}`)
    if (score.error) lines.push(`  - Error: ${score.error}`)
  }
  lines.push('')
  lines.push(`Recommendation: ${snapshot.modelComparison?.recommendation?.recommendedModel || 'missing'} - ${snapshot.modelComparison?.recommendation?.reason || ''}`)
  lines.push('')
  lines.push('## Top Build Candidates')
  lines.push('')
  for (const candidate of list(snapshot.topBuildCandidates)) {
    lines.push(`- ${candidate.title}`)
    lines.push(`  - Why: ${candidate.whyItMatters}`)
    lines.push(`  - Next: ${candidate.recommendedNextStep}`)
    lines.push(`  - Evidence: ${list(candidate.evidenceTimestamps).join(', ') || 'full-watch output'}`)
    lines.push(`  - Model: ${candidate.model}`)
  }
  lines.push('')
  lines.push('## Boundaries')
  lines.push('')
  for (const item of MARK_KASHEF_BASELINE_NOT_NEXT) lines.push(`- ${item}`)
  lines.push('')
  return `${lines.join('\n')}\n`
}
