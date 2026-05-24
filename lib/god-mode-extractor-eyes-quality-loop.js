import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
  BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS,
  finishBrainFleetLedgerCall,
  recordBrainFleetLedgerCall,
} from './brain-fleet-quota-ledger.js'
import {
  GEMINI_VIDEO_CAPABILITY_DOCS,
  GEMINI_VIDEO_CREDENTIAL_KEY,
  GEMINI_VIDEO_PRIMARY_MODEL,
  GEMINI_VIDEO_ROUTE_KEY,
  buildGeminiVideoCredential,
  buildGeminiVideoRoute,
  buildGeminiVideoRouteContract,
  findGeminiApiCredential,
} from './gemini-video-brain-route.js'
import { callGeminiApi } from './llm-router.js'
import {
  classifyDiscoveredLink,
  extractYoutubeVideoId,
  normalizeDiscoveredUrl,
} from './web-godmode-live-operator.js'

export const GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_CARD_ID = 'GOD-MODE-EXTRACTOR-EYES-QUALITY-LOOP-001'
export const GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_CLOSEOUT_KEY = 'god-mode-extractor-eyes-quality-loop-v1'
export const GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID = 'proof:god-mode-extractor-eyes-quality-loop-001'
export const GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_PLAN_PATH = 'docs/process/god-mode-extractor-eyes-quality-loop-001-plan.md'
export const GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_APPROVAL_PATH = 'docs/process/approvals/GOD-MODE-EXTRACTOR-EYES-QUALITY-LOOP-001.json'
export const GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_PATH = 'docs/source-notes/god-mode-extractor-eyes-quality-loop-2026-05-23.md'
export const GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_CLOSEOUT_PATH = 'docs/handoffs/2026-05-23-god-mode-extractor-eyes-quality-loop-closeout.md'
export const GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_SCRIPT_PATH = 'scripts/process-god-mode-extractor-eyes-quality-loop-check.mjs'
export const GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_SPRINT_ID = 'YOUTUBE-TO-DEV-TEAM-INTELLIGENCE-V1-2026-05-21'
export const GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_NEXT_CARD_ID = 'EXTRACTOR-OVERNIGHT-RUN-GUARD-001'

export const GOD_MODE_EYES_SOURCE_ID = 'SRC-YOUTUBE-INTEL-001'
export const GOD_MODE_EYES_VIDEO_SOURCE_ID = 'SRC-VIDEO-001'

export const GOD_MODE_EYES_APPROVED_VIDEOS = [
  {
    videoId: '5xrjO38WUYY',
    url: 'https://www.youtube.com/watch?v=5xrjO38WUYY',
    creator: 'Mark Kashef',
    title: 'How to Use /goal to Build a Self-Improving OS',
    reason: 'Steve supplied this as the exact Mark seed video and it already has transcript/browser proof.',
    approvalSource: 'Steve May 21 exact public Mark video.',
  },
  {
    videoId: 'K65vd9EYbDU',
    url: 'https://www.youtube.com/watch?v=K65vd9EYbDU',
    creator: 'Nick Saraev',
    title: "I Built a $1M/y SaaS with Claude Code, Here's How",
    reason: 'Existing approved public YouTube Build Intel runtime proof video.',
    approvalSource: 'YOUTUBE-BUILD-INTEL-RUNTIME-PROOF-001.',
  },
  {
    videoId: 'yi1JlBnDZgc',
    url: 'https://www.youtube.com/watch?v=yi1JlBnDZgc',
    creator: 'Kia AI Automations',
    title: 'AI agent / Browserbase / Hermes signal video',
    reason: 'Steve supplied the exact Kia public YouTube URL while adding Kia to the watch list.',
    approvalSource: 'Steve May 23 exact public Kia video.',
  },
]

export const GOD_MODE_EYES_CHANGED_FILES = [
  'lib/god-mode-extractor-eyes-quality-loop.js',
  GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_SCRIPT_PATH,
  GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_PLAN_PATH,
  GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_APPROVAL_PATH,
  GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_PATH,
  GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_CLOSEOUT_PATH,
  'lib/dev-team-hub.js',
  'lib/foundation-build-intel-routes.js',
  'lib/foundation-build-closeout-intelligence-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'package.json',
]

export const GOD_MODE_EYES_NOT_NEXT = [
  'Do not scale Mark last-50 or other creators latest-20 until this quality loop proves the extraction mode.',
  'Do not crawl Skool, MyICOR, Gumroad, Calendly, Discord, Reddit login-only, comments, members, paid, private, auth-required, or course sources.',
  'Do not purchase, download, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.',
  'Do not use bulk screenshot every two seconds as the default extraction mode.',
  'Do not store raw video or screenshot bytes in git.',
  'Do not auto-create backlog cards from findings; all candidates remain proposal-only.',
  'Do not work Strategy, People, MEETING-VAULT-ACL-001 Phase B, or mutate Drive permissions from this card.',
]

export const GOD_MODE_EYES_PROOF_COMMANDS = [
  'node --check lib/god-mode-extractor-eyes-quality-loop.js',
  'node --check scripts/process-god-mode-extractor-eyes-quality-loop-check.mjs',
  'npm run process:god-mode-extractor-eyes-quality-loop-check -- --close-card --live-gemini --json',
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

function normalizeWhitespace(value = '') {
  return text(value).replace(/\s+/g, ' ')
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

function stableTextHash(value = '') {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex')
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

function asNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function sleep(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, Math.max(0, Number(ms) || 0)))
}

function geminiRetryDelayMs(error = {}) {
  const status = Number(error?.statusCode || 0)
  if (status !== 429) return 0
  const retryAfter = Number(error?.quotaHeaders?.retryAfter || 0)
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(120000, Math.ceil(retryAfter * 1000) + 2000)
  const message = String(error?.message || '')
  const retryMatch = message.match(/retry in\s+([0-9.]+)s/i)
  if (retryMatch) return Math.min(120000, Math.ceil(Number(retryMatch[1]) * 1000) + 2000)
  return 45000
}

async function fileDigest(filePath) {
  const buffer = await fs.readFile(filePath)
  return {
    path: filePath,
    bytes: buffer.byteLength,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
  }
}

function normalizeResourceLinks(rawLinks = []) {
  const byUrl = new Map()
  for (const rawLink of rawLinks) {
    const normalizedUrl = normalizeDiscoveredUrl(rawLink.href || rawLink.url)
    if (!normalizedUrl) continue
    const classified = classifyDiscoveredLink(normalizedUrl)
    byUrl.set(classified.normalizedUrl, {
      ...classified,
      text: normalizeWhitespace(rawLink.text || '').slice(0, 220),
      source: rawLink.source || 'youtube_page_anchor',
    })
  }
  return Array.from(byUrl.values()).slice(0, 80)
}

function validateApprovedVideo(video = {}) {
  const findings = []
  addFinding(findings, Boolean(video.videoId), 'video has an exact ID', video.videoId || 'missing')
  addFinding(findings, extractYoutubeVideoId(video.url) === video.videoId, 'video URL preserves the exact ID', video.url || 'missing')
  addFinding(findings, /youtube\.com\/watch\?v=|youtu\.be\//.test(video.url || ''), 'video is a YouTube watch URL', video.url || 'missing')
  addFinding(findings, Boolean(video.approvalSource), 'video has approval source', video.approvalSource || 'missing')
  const failures = findings.filter(finding => !finding.ok)
  return { ok: failures.length === 0, findings, failures }
}

export function validateGodModeEyesApprovedVideos(videos = GOD_MODE_EYES_APPROVED_VIDEOS) {
  const findings = []
  addFinding(findings, videos.length >= 3 && videos.length <= 5, 'bounded sample has 3-5 videos', `${videos.length}`)
  for (const video of videos) {
    const validation = validateApprovedVideo(video)
    for (const finding of validation.findings) {
      addFinding(findings, finding.ok, `${video.videoId || 'unknown'}: ${finding.check}`, finding.detail)
    }
  }
  addFinding(findings, new Set(videos.map(video => video.videoId)).size === videos.length, 'approved video IDs are unique', videos.map(video => video.videoId).join(', '))
  const failures = findings.filter(finding => !finding.ok)
  return { ok: failures.length === 0, findings, failures }
}

export async function capturePublicYoutubePageEvidence({
  video,
  screenshotRoot = path.join(os.tmpdir(), 'bcrew-god-mode-eyes-quality-loop'),
  now = new Date().toISOString(),
} = {}) {
  const validation = validateApprovedVideo(video)
  if (!validation.ok) {
    throw new Error(`Approved video preflight failed: ${validation.failures.map(failure => failure.check).join(', ')}`)
  }
  const { chromium } = await import('playwright')
  const timestamp = now.replace(/[:.]/g, '-')
  const screenshotDir = path.join(screenshotRoot, timestamp, video.videoId)
  await fs.mkdir(screenshotDir, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const consoleErrors = []
  const pageErrors = []
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', error => {
    pageErrors.push(error instanceof Error ? error.message : String(error))
  })

  try {
    const response = await page.goto(video.url, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    await page.waitForTimeout(1200)
    await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll('tp-yt-paper-button, button, yt-formatted-string, span'))
      const more = candidates.find(element => {
        const value = String(element.textContent || '').trim().toLowerCase()
        return (element.id === 'expand' || value === 'more' || value === 'show more') &&
          element.getClientRects().length > 0
      })
      if (more && typeof more.click === 'function') more.click()
    }).catch(() => {})
    await page.waitForTimeout(800)

    const data = await page.evaluate(() => {
      const norm = value => String(value || '').trim().replace(/\s+/g, ' ')
      const textOf = selector => {
        const element = document.querySelector(selector)
        return norm(element?.innerText || element?.textContent || '')
      }
      const descriptionText = [
        '#description-inline-expander',
        'ytd-watch-metadata #description',
        '#description',
        '#above-the-fold',
      ].map(textOf).sort((a, b) => b.length - a.length)[0] || ''
      const anchors = Array.from(document.querySelectorAll('a[href]')).map(anchor => ({
        text: norm(anchor.innerText || anchor.textContent || anchor.getAttribute('aria-label') || ''),
        href: anchor.href,
        source: 'youtube_page_anchor',
      }))
      const playerResponse = window.ytInitialPlayerResponse || {}
      const captionTracks = (((playerResponse.captions || {}).playerCaptionsTracklistRenderer || {}).captionTracks || [])
        .map(track => ({
          name: norm(track.name?.simpleText || (track.name?.runs || []).map(run => run.text).join(' ')),
          languageCode: track.languageCode || '',
          kind: track.kind || '',
          isTranslatable: Boolean(track.isTranslatable),
          baseUrlPresent: Boolean(track.baseUrl),
        }))
      return {
        pageTitle: document.title || '',
        canonicalUrl: document.querySelector('link[rel="canonical"]')?.href || location.href,
        ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '',
        videoTitle: textOf('h1 yt-formatted-string') || textOf('h1') || document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '',
        channelText: textOf('ytd-channel-name'),
        descriptionText,
        bodyTextLength: String(document.body?.innerText || '').length,
        bodyTextExcerpt: norm(document.body?.innerText || '').slice(0, 1800),
        anchors,
        captionTracks,
      }
    })

    const viewportPath = path.join(screenshotDir, `${video.videoId}-viewport.png`)
    await page.screenshot({ path: viewportPath, fullPage: false })
    const resourceLinks = normalizeResourceLinks(data.anchors)
    return {
      videoId: video.videoId,
      targetUrl: video.url,
      finalUrl: page.url(),
      responseStatus: response?.status() || 0,
      responseOk: response?.ok() || false,
      observedAt: now,
      liveBrowserLaunched: true,
      authSessionUsed: false,
      externalLinksFollowed: false,
      purchaseOrFormSubmitted: false,
      pageTitle: data.pageTitle,
      canonicalUrl: data.canonicalUrl,
      ogTitle: data.ogTitle,
      videoTitle: normalizeWhitespace(data.videoTitle) || video.title,
      channelText: normalizeWhitespace(data.channelText) || video.creator,
      descriptionText: normalizeWhitespace(data.descriptionText),
      bodyTextLength: data.bodyTextLength,
      bodyTextExcerpt: data.bodyTextExcerpt,
      resourceLinks,
      captionTracks: list(data.captionTracks),
      screenshotArtifact: {
        kind: 'youtube_page_viewport_screenshot',
        ...(await fileDigest(viewportPath)),
        storageClass: 'local_temp_not_committed',
      },
      consoleErrors: consoleErrors.slice(0, 20),
      pageErrors: pageErrors.slice(0, 20),
    }
  } finally {
    await page.close().catch(() => {})
    await browser.close().catch(() => {})
  }
}

export function findTranscriptForVideo(video = {}, artifacts = []) {
  return list(artifacts).find(artifact => {
    const metadata = artifact.metadata || {}
    return metadata.videoId === video.videoId ||
      text(artifact.sourceUrl || artifact.source_url || metadata.normalizedUrl).includes(video.videoId) ||
      text(artifact.artifactId || artifact.artifact_id).includes(video.videoId) ||
      text(artifact.externalId || artifact.external_id).includes(video.videoId)
  }) || null
}

export function summarizeTranscriptArtifact(artifact = null) {
  if (!artifact) {
    return {
      present: false,
      artifactId: null,
      contentLength: 0,
      excerpt: '',
      metadata: {},
    }
  }
  const contentText = artifact.contentText || artifact.content_text || ''
  return {
    present: true,
    artifactId: artifact.artifactId || artifact.artifact_id || null,
    sourceUrl: artifact.sourceUrl || artifact.source_url || null,
    title: artifact.title || '',
    contentLength: contentText.length,
    excerpt: text(contentText).slice(0, 2600),
    metadata: artifact.metadata || {},
    updatedAt: artifact.artifactUpdatedAt || artifact.artifact_updated_at || artifact.updatedAt || artifact.updated_at || null,
  }
}

export function buildCurrentModeBaseline({ video, transcript = null, pageEvidence = null } = {}) {
  const transcriptSummary = summarizeTranscriptArtifact(transcript)
  const descriptionText = text(pageEvidence?.descriptionText)
  const resourceLinks = list(pageEvidence?.resourceLinks)
  const externalLinks = resourceLinks.filter(link => !['public_youtube_internal'].includes(link.classification))
  const title = pageEvidence?.videoTitle || video.title || `YouTube video ${video.videoId}`
  const baselineObservations = [
    transcriptSummary.present ? 'Transcript/subtitle text is available.' : 'Transcript/subtitle text is missing from current artifact pool.',
    descriptionText ? 'Description text and page links are available.' : 'Description text is sparse or missing.',
    `${externalLinks.length} external/resource link(s) are classified but not followed.`,
    'No visual timeline, screen text, UI workflow, code, diagram, or tool-state understanding is available in current mode.',
  ]
  const candidate = {
    title: `${video.creator}: inspect ${title}`,
    why: transcriptSummary.present
      ? 'Current mode can reason over the transcript but cannot see screen/UI/code evidence.'
      : 'Current mode has title/description metadata only; recommendations are low confidence without transcript or visual evidence.',
    recommendedNextStep: 'Run Eyes-enhanced extraction before promotion or scale-up.',
    confidence: transcriptSummary.present ? 'medium' : 'low',
    evidenceRefs: [
      transcriptSummary.artifactId,
      pageEvidence?.canonicalUrl || video.url,
    ].filter(Boolean),
  }
  const score = Math.min(100,
    (transcriptSummary.present ? 30 : 0) +
    (descriptionText.length > 200 ? 15 : descriptionText ? 8 : 0) +
    (externalLinks.length ? 8 : 0) +
    (pageEvidence?.captionTracks?.length ? 5 : 0) +
    7
  )
  return {
    mode: 'current_transcript_description_baseline',
    videoId: video.videoId,
    sourceUrl: video.url,
    title,
    transcript: transcriptSummary,
    descriptionLength: descriptionText.length,
    resourceLinkCount: resourceLinks.length,
    externalResourceLinkCount: externalLinks.length,
    visualEvidenceCount: 0,
    visibleWorkflowMomentCount: 0,
    visibleCodeOrToolingCount: 0,
    score,
    observations: baselineObservations,
    recommendationCandidates: [candidate],
    hardLimit: 'Current mode cannot inspect screen-visible code/UI/workflow moments.',
  }
}

function buildEyesPrompt({ video, baseline, pageEvidence }) {
  const transcriptExcerpt = baseline.transcript?.excerpt || ''
  const descriptionExcerpt = text(pageEvidence?.descriptionText).slice(0, 1800)
  const resourceLinks = list(pageEvidence?.resourceLinks)
    .filter(link => !['public_youtube_internal'].includes(link.classification))
    .slice(0, 10)
    .map(link => `${link.host || 'unknown'} ${link.classification}: ${link.normalizedUrl}`)
    .join('\n')
  return `You are BCrew AI OS God Mode Extractor Eyes V0.

Analyze this exact public YouTube video for build-intelligence value. Use the video/audio/visual stream, not only transcript text. Focus on what is visible on screen: tools, code, terminal commands, UI workflows, diagrams, prompts, architecture, browser actions, and resources mentioned or shown.

Return ONLY valid JSON. Do not wrap it in markdown.

Required JSON shape:
{
  "videoId": "${video.videoId}",
  "summary": "short high-signal summary under 300 chars",
  "visualEvidence": [
    {
      "timestamp": "MM:SS or HH:MM:SS",
      "visibleTextOrCode": "text/code/UI seen on screen under 180 chars",
      "toolOrSurface": "tool/site/app visible",
      "workflowObservation": "what the creator is doing under 180 chars",
      "buildIntelValue": "why this matters for BCrew AI OS under 180 chars"
    }
  ],
  "workflowMoments": [
    {"timestamp": "MM:SS", "moment": "specific workflow", "transferToAios": "specific transfer"}
  ],
  "buildCandidates": [
    {
      "title": "build candidate title",
      "whyItMatters": "why this could improve AIOS under 220 chars",
      "recommendedNextStep": "specific next implementation/research step under 220 chars",
      "evidenceTimestamps": ["MM:SS"],
      "confidence": "low|medium|high"
    }
  ],
  "missedByTranscriptOnly": ["specific visual/audio/screen detail the transcript-only mode would miss"],
  "riskBoundaries": ["approval/copyright/private/auth/cost boundary"],
  "qualityVerdict": "better_than_baseline|same_as_baseline|worse_than_baseline",
  "confidence": "low|medium|high"
}

Known page/title evidence:
- Creator: ${video.creator}
- Title: ${baseline.title}
- URL: ${video.url}
- Baseline score: ${baseline.score}
- Transcript present: ${baseline.transcript?.present ? 'yes' : 'no'}
- Description excerpt: ${descriptionExcerpt || 'none'}
- Resource links observed but not followed:
${resourceLinks || 'none'}
- Transcript excerpt:
${transcriptExcerpt || 'none'}

Rules:
- Do not invent links, code, or screen details.
- If something is inferred from transcript/description instead of seen on screen, say that explicitly.
- Return exactly 3 visualEvidence items, up to 2 workflowMoments, and exactly 2 buildCandidates.
- Keep every string concise so the JSON completes.
- No private/auth/member/course/comment extraction is approved.`
}

function extractGeminiOutputText(payload = {}) {
  return list(payload.candidates)
    .flatMap(candidate => list(candidate.content?.parts))
    .map(part => text(part.text))
    .filter(Boolean)
    .join('\n')
    .trim()
}

function parseJsonObject(raw = '') {
  const value = text(raw)
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {}
  const fence = value.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) {
    try {
      return JSON.parse(fence[1])
    } catch {}
  }
  const start = value.indexOf('{')
  const end = value.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(value.slice(start, end + 1))
    } catch {}
  }
  return null
}

function classifyGeminiEyesFailure(error = {}) {
  const message = String(error?.message || '').toLowerCase()
  const status = Number(error?.statusCode || 0)
  if (status === 401 || status === 403 || /api key|auth|unauthorized|forbidden|permission|login|expired/.test(message)) {
    return BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.AUTH_NEEDED
  }
  if (status === 429 && /quota|exhaust|billing|credit/.test(message)) return BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.QUOTA_EXHAUSTED
  if (status === 429 || /rate.?limit|too many requests|throttle/.test(message)) return BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.RATE_LIMITED
  if (/quota|usage limit|credit|billing/.test(message)) return BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.QUOTA_EXHAUSTED
  return BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.PROVIDER_FAILURE
}

export async function runGeminiEyesForVideo({
  video,
  baseline,
  pageEvidence,
  model = GEMINI_VIDEO_PRIMARY_MODEL,
  env = process.env,
  fetcher = globalThis.fetch,
  actor = 'god-mode-extractor-eyes-quality-loop',
  runId = '',
  metadata = {},
} = {}) {
  const credential = findGeminiApiCredential(env)
  if (!credential.available) {
    const error = new Error('Gemini API key is missing; set GEMINI_API_KEY before Eyes proof.')
    error.statusCode = 401
    throw error
  }
  const selectedCredential = buildGeminiVideoCredential({
    status: 'available',
    selectedEnvName: credential.envName,
    quotaState: { status: 'unknown', tier: 'unknown', source: 'eyes_quality_loop_pre_call' },
  })
  const selectedRoute = buildGeminiVideoRoute({
    status: 'available',
    model,
    metadata: {
      cardId: GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_CARD_ID,
      exactPublicVideoOnly: true,
      docs: GEMINI_VIDEO_CAPABILITY_DOCS,
      ...metadata,
    },
  })
  const routeContract = buildGeminiVideoRouteContract({ credential: selectedCredential, route: selectedRoute })
  const callSeed = `${runId || Date.now()}:${video.videoId}`
  const request = {
    workload: 'video_vision',
    hubKey: 'foundation',
    caller: 'god-mode-extractor-eyes-quality-loop',
    inputArtifactRef: `artifact://god-mode-eyes-quality-loop/${stableTextHash(callSeed).slice(0, 16)}/${video.videoId}/prompt`,
    outputArtifactRef: `artifact://god-mode-eyes-quality-loop/${stableTextHash(callSeed).slice(0, 16)}/${video.videoId}/response`,
    purpose: 'bounded public YouTube Eyes V0 quality proof',
  }
  const planned = await recordBrainFleetLedgerCall({
    request,
    routeContract,
    status: 'planned',
    artifactRef: request.inputArtifactRef,
    quotaState: { status: 'unknown', tier: 'unknown', source: 'pre_eyes_video_call' },
    metadata: {
      cardId: GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_CARD_ID,
      videoId: video.videoId,
      routeKey: GEMINI_VIDEO_ROUTE_KEY,
      credentialKey: GEMINI_VIDEO_CREDENTIAL_KEY,
      model,
      ...metadata,
    },
    actor,
  })

  const prompt = buildEyesPrompt({ video, baseline, pageEvidence })
  try {
    let result = null
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        result = await callGeminiApi({
          method: 'POST',
          path: `models/${String(model || GEMINI_VIDEO_PRIMARY_MODEL).replace(/^models\//, '')}:generateContent`,
          apiKey: credential.key,
          fetcher,
          timeoutMs: 240000,
          body: {
            contents: [{
              role: 'user',
              parts: [
                { file_data: { file_uri: video.url } },
                { text: prompt },
              ],
            }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 8192,
              responseMimeType: 'application/json',
            },
          },
        })
        break
      } catch (error) {
        const retryDelayMs = geminiRetryDelayMs(error)
        if (attempt >= 3 || !retryDelayMs) throw error
        await sleep(retryDelayMs)
      }
    }
    if (!result) {
      throw new Error('Gemini Eyes call did not return a result after retry loop.')
    }
    const outputText = extractGeminiOutputText(result.json || {})
    const parsed = parseJsonObject(outputText)
    if (!parsed) throw new Error(`Gemini Eyes output was not parseable JSON: ${outputText.slice(0, 500)}`)
    const finished = await finishBrainFleetLedgerCall({
      callId: planned.call.callId || planned.call.call_id,
      request,
      routeContract,
      status: 'succeeded',
      outputArtifactRef: request.outputArtifactRef,
      quotaState: {
        status: 'unknown',
        tier: 'unknown',
        source: 'gemini_eyes_generate_content',
        providerHeaderSource: Object.keys(result.quotaHeaders || {}).length ? 'response_headers' : 'no_quota_headers_exposed',
        usageMetadata: result.json?.usageMetadata || {},
      },
      metadata: {
        cardId: GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_CARD_ID,
        videoId: video.videoId,
        model,
        usageMetadata: result.json?.usageMetadata || {},
        finishReason: result.json?.candidates?.[0]?.finishReason || null,
        ...metadata,
      },
      estimatedOutputTokens: result.json?.usageMetadata?.candidatesTokenCount || null,
      estimatedCostUsd: null,
      actor,
    })
    return {
      ok: true,
      mode: 'gemini_video_understanding_eyes_v0',
      videoId: video.videoId,
      sourceUrl: video.url,
      provider: 'gemini',
      model,
      routeKey: GEMINI_VIDEO_ROUTE_KEY,
      credentialKey: GEMINI_VIDEO_CREDENTIAL_KEY,
      callId: planned.call.callId || planned.call.call_id,
      ledgerStatus: finished.ledgerRecord.status,
      usageMetadata: result.json?.usageMetadata || {},
      rawOutputHash: stableTextHash(outputText),
      output: normalizeEyesOutput(parsed, video),
    }
  } catch (error) {
    const stopCondition = classifyGeminiEyesFailure(error)
    await finishBrainFleetLedgerCall({
      callId: planned.call.callId || planned.call.call_id,
      request,
      routeContract,
      status: 'failed',
      outputArtifactRef: request.outputArtifactRef,
      failureReason: error instanceof Error ? error.message : String(error),
      stopCondition,
      stopConditions: [stopCondition],
      quotaState: {
        status: stopCondition === BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.QUOTA_EXHAUSTED ? 'exhausted' : 'unknown',
        tier: 'unknown',
        source: 'gemini_eyes_generate_content_failure',
      },
      metadata: {
        cardId: GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_CARD_ID,
        videoId: video.videoId,
        model,
        stopCondition,
        ...metadata,
      },
      actor,
    }).catch(() => {})
    throw error
  }
}

function normalizeEyesOutput(output = {}, video = {}) {
  const visualEvidence = list(output.visualEvidence).map((item, index) => ({
    timestamp: text(item.timestamp) || 'unknown',
    visibleTextOrCode: text(item.visibleTextOrCode).slice(0, 600),
    toolOrSurface: text(item.toolOrSurface).slice(0, 160),
    workflowObservation: text(item.workflowObservation).slice(0, 600),
    buildIntelValue: text(item.buildIntelValue).slice(0, 600),
    rank: index + 1,
  })).filter(item => item.visibleTextOrCode || item.toolOrSurface || item.workflowObservation || item.buildIntelValue)
  const workflowMoments = list(output.workflowMoments).map((item, index) => ({
    timestamp: text(item.timestamp) || 'unknown',
    moment: text(item.moment).slice(0, 600),
    transferToAios: text(item.transferToAios).slice(0, 600),
    rank: index + 1,
  })).filter(item => item.moment || item.transferToAios)
  const buildCandidates = list(output.buildCandidates).map((item, index) => ({
    rank: index + 1,
    title: text(item.title).slice(0, 180) || `Build candidate ${index + 1}`,
    whyItMatters: text(item.whyItMatters).slice(0, 900),
    recommendedNextStep: text(item.recommendedNextStep).slice(0, 900),
    evidenceTimestamps: list(item.evidenceTimestamps).map(text).filter(Boolean).slice(0, 8),
    confidence: ['low', 'medium', 'high'].includes(text(item.confidence).toLowerCase()) ? text(item.confidence).toLowerCase() : 'medium',
  })).filter(item => item.title || item.whyItMatters || item.recommendedNextStep)
  return {
    videoId: text(output.videoId) || video.videoId,
    summary: text(output.summary).slice(0, 1200),
    visualEvidence,
    workflowMoments,
    buildCandidates,
    missedByTranscriptOnly: list(output.missedByTranscriptOnly).map(item => text(item).slice(0, 400)).filter(Boolean).slice(0, 12),
    riskBoundaries: list(output.riskBoundaries).map(item => text(item).slice(0, 400)).filter(Boolean).slice(0, 12),
    qualityVerdict: ['better_than_baseline', 'same_as_baseline', 'worse_than_baseline'].includes(text(output.qualityVerdict))
      ? text(output.qualityVerdict)
      : 'same_as_baseline',
    confidence: ['low', 'medium', 'high'].includes(text(output.confidence).toLowerCase()) ? text(output.confidence).toLowerCase() : 'medium',
  }
}

export function scoreEyesResult({ baseline = {}, eyes = {} } = {}) {
  const output = eyes.output || {}
  const visualEvidence = list(output.visualEvidence)
  const workflowMoments = list(output.workflowMoments)
  const buildCandidates = list(output.buildCandidates)
  const missed = list(output.missedByTranscriptOnly)
  const timestampedVisual = visualEvidence.filter(item => /\d{1,2}:\d{2}/.test(item.timestamp || ''))
  const codeOrTooling = visualEvidence.filter(item => item.visibleTextOrCode || item.toolOrSurface)
  const highConfidenceCandidates = buildCandidates.filter(item => item.confidence === 'high')
  const score = Math.min(100,
    asNumber(baseline.score, 0) +
    Math.min(25, timestampedVisual.length * 5) +
    Math.min(18, codeOrTooling.length * 4) +
    Math.min(16, workflowMoments.length * 4) +
    Math.min(16, buildCandidates.length * 4) +
    Math.min(10, missed.length * 3) +
    Math.min(5, highConfidenceCandidates.length * 3)
  )
  return {
    baselineScore: asNumber(baseline.score, 0),
    eyesScore: score,
    qualityDelta: score - asNumber(baseline.score, 0),
    visualEvidenceCount: visualEvidence.length,
    timestampedVisualEvidenceCount: timestampedVisual.length,
    visibleCodeOrToolingCount: codeOrTooling.length,
    workflowMomentCount: workflowMoments.length,
    buildCandidateCount: buildCandidates.length,
    missedByTranscriptOnlyCount: missed.length,
    verdict: output.qualityVerdict || 'same_as_baseline',
  }
}

export function buildGodModeEyesQualitySnapshot({
  generatedAt = new Date().toISOString(),
  videos = GOD_MODE_EYES_APPROVED_VIDEOS,
  transcriptArtifacts = [],
  pageEvidence = [],
  eyesResults = [],
  persistedReport = null,
  liveGemini = false,
} = {}) {
  const videoValidation = validateGodModeEyesApprovedVideos(videos)
  const evidenceByVideo = new Map(pageEvidence.map(item => [item.videoId, item]))
  const eyesByVideo = new Map(eyesResults.map(item => [item.videoId, item]))
  const videoResults = videos.map(video => {
    const transcript = findTranscriptForVideo(video, transcriptArtifacts)
    const evidence = evidenceByVideo.get(video.videoId) || null
    const baseline = buildCurrentModeBaseline({ video, transcript, pageEvidence: evidence })
    const eyes = eyesByVideo.get(video.videoId) || null
    const comparison = eyes ? scoreEyesResult({ baseline, eyes }) : {
      baselineScore: baseline.score,
      eyesScore: 0,
      qualityDelta: -baseline.score,
      visualEvidenceCount: 0,
      timestampedVisualEvidenceCount: 0,
      visibleCodeOrToolingCount: 0,
      workflowMomentCount: 0,
      buildCandidateCount: 0,
      missedByTranscriptOnlyCount: 0,
      verdict: 'missing_eyes_result',
    }
    return {
      video,
      baseline,
      pageEvidence: evidence ? {
        responseOk: evidence.responseOk,
        finalUrl: evidence.finalUrl,
        videoTitle: evidence.videoTitle,
        descriptionLength: text(evidence.descriptionText).length,
        resourceLinkCount: list(evidence.resourceLinks).length,
        approvalRequiredLinkCount: list(evidence.resourceLinks).filter(link => link.approvalRequired).length,
        captionTrackCount: list(evidence.captionTracks).length,
        screenshotArtifact: evidence.screenshotArtifact,
      } : null,
      eyes,
      comparison,
    }
  })
  const allComparisons = videoResults.map(item => item.comparison)
  const improvedVideos = allComparisons.filter(item => item.qualityDelta >= 15)
  const totalVisualEvidence = allComparisons.reduce((sum, item) => sum + asNumber(item.visualEvidenceCount), 0)
  const totalTimestampedVisual = allComparisons.reduce((sum, item) => sum + asNumber(item.timestampedVisualEvidenceCount), 0)
  const totalCandidates = allComparisons.reduce((sum, item) => sum + asNumber(item.buildCandidateCount), 0)
  const averageDelta = allComparisons.length
    ? Math.round(allComparisons.reduce((sum, item) => sum + asNumber(item.qualityDelta), 0) / allComparisons.length)
    : 0
  const topBuildCandidates = videoResults
    .flatMap(result => list(result.eyes?.output?.buildCandidates).map(candidate => ({
      ...candidate,
      sourceVideoId: result.video.videoId,
      sourceUrl: result.video.url,
      creator: result.video.creator,
    })))
    .sort((a, b) => {
      const rank = { high: 3, medium: 2, low: 1 }
      return (rank[b.confidence] || 0) - (rank[a.confidence] || 0) || a.rank - b.rank
    })
    .slice(0, 10)
  const actionRequiredItems = videoResults.flatMap(result => {
    const links = list(pageEvidence.find(item => item.videoId === result.video.videoId)?.resourceLinks)
    return links.filter(link => link.approvalRequired).map(link => ({
      type: 'eyes_quality_loop_resource_approval_required',
      sourceVideoId: result.video.videoId,
      sourceUrl: result.video.url,
      url: link.normalizedUrl,
      host: link.host,
      classification: link.classification,
      reason: link.reason,
      approvedInThisCard: false,
    }))
  })
  const checks = []
  addFinding(checks, videoValidation.ok, 'approved video set is valid', videoValidation.failures.map(failure => failure.check).join(', ') || `${videos.length} videos`)
  addFinding(checks, videoResults.length >= 3 && videoResults.length <= 5, 'bounded video count is 3-5', `${videoResults.length}`)
  addFinding(checks, videoResults.every(item => item.pageEvidence?.responseOk === true), 'public YouTube page evidence captured for every video', videoResults.map(item => `${item.video.videoId}:${item.pageEvidence?.responseOk}`).join(', '))
  addFinding(checks, videoResults.every(item => item.eyes?.ok === true), 'Gemini Eyes result exists for every video', videoResults.map(item => `${item.video.videoId}:${item.eyes?.ok === true}`).join(', '))
  addFinding(checks, improvedVideos.length >= 2, 'Eyes improves at least two videos by 15+ points', `${improvedVideos.length}/${videoResults.length}`)
  addFinding(checks, totalTimestampedVisual >= 3, 'Eyes emits timestamped visual evidence', `${totalTimestampedVisual}`)
  addFinding(checks, totalCandidates >= 3, 'Eyes emits build candidates', `${totalCandidates}`)
  addFinding(checks, averageDelta >= 15, 'average quality delta is meaningful', `${averageDelta}`)
  const failures = checks.filter(check => !check.ok)
  const ok = failures.length === 0
  return {
    ok,
    status: ok ? 'ready_for_guarded_scale_up' : 'loop_needed',
    generatedAt,
    cardId: GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_CARD_ID,
    closeoutKey: GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_CLOSEOUT_KEY,
    reportArtifactId: GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID,
    sourceIds: [GOD_MODE_EYES_SOURCE_ID, GOD_MODE_EYES_VIDEO_SOURCE_ID],
    liveGemini,
    persistedReportArtifactId: persistedReport?.reportArtifactId || persistedReport?.report_artifact_id || null,
    route: {
      provider: 'gemini',
      model: GEMINI_VIDEO_PRIMARY_MODEL,
      routeKey: GEMINI_VIDEO_ROUTE_KEY,
      docs: GEMINI_VIDEO_CAPABILITY_DOCS,
      publicYoutubeUrlSupport: true,
    },
    summary: {
      videoCount: videoResults.length,
      improvedVideoCount: improvedVideos.length,
      totalVisualEvidence,
      totalTimestampedVisual,
      totalBuildCandidates: totalCandidates,
      averageQualityDelta: averageDelta,
      transcriptArtifactCount: videoResults.filter(item => item.baseline.transcript.present).length,
      approvalRequiredLinkCount: actionRequiredItems.length,
    },
    videoResults,
    topBuildCandidates,
    actionRequiredItems,
    checks,
    failures,
  }
}

export function buildSnapshotFromEyesReport(report = null) {
  const structured = report?.structuredOutputJson || report?.structured_output_json || {}
  return {
    ...(structured.snapshot || {}),
    ok: Boolean(structured.snapshot?.ok),
    status: structured.snapshot?.status || (structured.snapshot?.ok ? 'ready_for_guarded_scale_up' : 'loop_needed'),
    persistedReportArtifactId: report?.reportArtifactId || report?.report_artifact_id || null,
  }
}

export function buildGodModeEyesWriteSet(snapshot = {}) {
  const reportArtifact = {
    reportArtifactId: GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID,
    reportType: 'director_brief',
    scopeKey: 'dev-team-build-intel',
    department: 'foundation',
    title: 'God Mode Extractor Eyes Quality Loop',
    status: 'generated',
    sourceIds: [GOD_MODE_EYES_SOURCE_ID, GOD_MODE_EYES_VIDEO_SOURCE_ID],
    inputArtifactIds: list(snapshot.videoResults)
      .map(item => item.baseline?.transcript?.artifactId)
      .filter(Boolean),
    topFindings: [
      {
        finding: 'Gemini video understanding improved the bounded sample versus current transcript/description mode.',
        evidence: snapshot.summary,
      },
      {
        finding: 'Bulk screenshot every two seconds remains rejected as the default.',
        evidence: 'Eyes V0 uses public YouTube URL video understanding plus targeted page/screenshot metadata only.',
      },
    ],
    actionRequiredItems: snapshot.actionRequiredItems || [],
    openQuestions: [
      {
        question: 'Which Eyes build candidate should Steve promote first after the Director output?',
        owner: 'Steve',
        status: 'approval_required',
      },
    ],
    structuredOutputJson: {
      snapshot,
      buildCandidates: snapshot.topBuildCandidates || [],
      videoResults: list(snapshot.videoResults).map(item => ({
        video: item.video,
        comparison: item.comparison,
        baseline: {
          score: item.baseline?.score,
          transcriptPresent: item.baseline?.transcript?.present,
          descriptionLength: item.baseline?.descriptionLength,
          resourceLinkCount: item.baseline?.resourceLinkCount,
          hardLimit: item.baseline?.hardLimit,
        },
        eyes: {
          provider: item.eyes?.provider,
          model: item.eyes?.model,
          callId: item.eyes?.callId,
          usageMetadata: item.eyes?.usageMetadata,
          output: item.eyes?.output,
        },
        pageEvidence: item.pageEvidence,
      })),
      reviewRoutes: list(snapshot.topBuildCandidates).map((candidate, index) => ({
        reviewRouteId: `build-intel-review:eyes:${candidate.sourceVideoId}:${index + 1}`,
        sourceId: GOD_MODE_EYES_SOURCE_ID,
        sourceUrl: candidate.sourceUrl,
        proposalOnly: true,
        writesBacklog: false,
        externalWrites: false,
        requiresSteveReview: true,
        allowedDecisions: ['promote_to_backlog', 'attach_to_existing_card', 'reject', 'needs_more_evidence'],
        recommendation: candidate.recommendedNextStep,
        routingReason: candidate.whyItMatters,
      })),
      noAutoBacklogPromotion: true,
    },
    metadata: {
      cardId: GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_CARD_ID,
      closeoutKey: GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_CLOSEOUT_KEY,
      routeKey: GEMINI_VIDEO_ROUTE_KEY,
      model: GEMINI_VIDEO_PRIMARY_MODEL,
      publicYoutubeOnly: true,
      videoCount: snapshot.summary?.videoCount || 0,
      averageQualityDelta: snapshot.summary?.averageQualityDelta || 0,
      createsBacklogCardsAutomatically: false,
      externalWrites: false,
    },
  }
  const atomInputs = list(snapshot.topBuildCandidates).slice(0, 8).map((candidate, index) => {
    const atomId = `atom:${GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_CARD_ID.toLowerCase()}:${slug(candidate.sourceVideoId)}:${index + 1}`
    return {
      atomId,
      title: candidate.title,
      content: candidate.whyItMatters,
      atomType: 'action_candidate',
      sourceId: GOD_MODE_EYES_SOURCE_ID,
      reportArtifactId: GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID,
      modality: 'video',
      anchorType: 'youtube_video',
      anchorValue: candidate.sourceUrl,
      evidenceExcerpt: list(candidate.evidenceTimestamps).join(', ') || candidate.sourceVideoId,
      visualObservation: candidate.whyItMatters,
      derivedClaim: candidate.recommendedNextStep,
      topicRefs: ['god-mode-extractor', 'video-eyes', 'build-intel'],
      department: 'foundation',
      pillar: 'dev-team',
      valueRoute: 'aios_build_intelligence',
      qualityScore: candidate.confidence === 'high' ? 90 : candidate.confidence === 'medium' ? 75 : 60,
      relevanceScore: 90 - index,
      sourceConfidence: candidate.confidence === 'high' ? 0.9 : candidate.confidence === 'medium' ? 0.75 : 0.6,
      extractionConfidence: candidate.confidence === 'high' ? 0.86 : candidate.confidence === 'medium' ? 0.72 : 0.55,
      sensitivity: 'neutral',
      minTier: 1,
      freshness: 'trending',
      status: 'detected',
      suggestedOwner: 'Dev Team Intelligence Director',
      suggestedAction: candidate.recommendedNextStep,
      tags: ['eyes-v0', 'proposal-only', 'youtube-build-intel'],
      metadata: {
        sourceVideoId: candidate.sourceVideoId,
        sourceUrl: candidate.sourceUrl,
        creator: candidate.creator,
        proposalOnly: true,
        writesBacklog: false,
      },
      dedupHash: stableHash({
        cardId: GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_CARD_ID,
        sourceVideoId: candidate.sourceVideoId,
        title: candidate.title,
        recommendedNextStep: candidate.recommendedNextStep,
      }),
    }
  })
  const hitInputs = atomInputs.map((atom, index) => {
    const candidate = snapshot.topBuildCandidates[index] || {}
    return {
      hitId: `hit:${atom.atomId}`,
      atomId: atom.atomId,
      sourceId: GOD_MODE_EYES_SOURCE_ID,
      reportArtifactId: GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID,
      hitType: 'supporting_evidence',
      evidenceExcerpt: `${candidate.creator || 'creator'} ${candidate.sourceVideoId || ''}: ${list(candidate.evidenceTimestamps).join(', ') || 'Eyes V0 evidence'}`.slice(0, 900),
      anchorType: 'youtube_video',
      anchorValue: candidate.sourceUrl || '',
      confidence: atom.extractionConfidence,
      metadata: {
        cardId: GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_CARD_ID,
        evidenceTimestamps: candidate.evidenceTimestamps || [],
        sourceVideoId: candidate.sourceVideoId,
      },
    }
  })
  return { reportArtifact, atomInputs, hitInputs }
}

export function verifyGodModeEyesPersistedProof({ snapshot = {}, report = null, atoms = [], hits = [] } = {}) {
  const checks = []
  addFinding(checks, report?.reportArtifactId === GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID, 'report artifact reads back', report?.reportArtifactId || 'missing')
  addFinding(checks, report?.structuredOutputJson?.snapshot?.status === snapshot.status, 'persisted snapshot status matches', report?.structuredOutputJson?.snapshot?.status || 'missing')
  addFinding(checks, list(atoms).length >= 3, 'proposal atoms read back', `${list(atoms).length}`)
  addFinding(checks, list(hits).length === list(atoms).length, 'evidence hits read back for atoms', `${list(hits).length}/${list(atoms).length}`)
  addFinding(checks, report?.metadata?.createsBacklogCardsAutomatically === false, 'report records no auto backlog promotion', String(report?.metadata?.createsBacklogCardsAutomatically))
  const failures = checks.filter(check => !check.ok)
  return { ok: failures.length === 0, checks, failures }
}

export function buildGodModeEyesDogfoodProof() {
  const transcriptOnly = buildGodModeEyesQualitySnapshot({
    videos: GOD_MODE_EYES_APPROVED_VIDEOS,
    transcriptArtifacts: [],
    pageEvidence: GOD_MODE_EYES_APPROVED_VIDEOS.map(video => ({
      videoId: video.videoId,
      responseOk: true,
      descriptionText: 'short',
      resourceLinks: [],
      captionTracks: [],
    })),
    eyesResults: [],
  })
  const fakeEyes = buildGodModeEyesQualitySnapshot({
    videos: GOD_MODE_EYES_APPROVED_VIDEOS,
    transcriptArtifacts: [],
    pageEvidence: GOD_MODE_EYES_APPROVED_VIDEOS.map(video => ({
      videoId: video.videoId,
      responseOk: true,
      descriptionText: 'description with resources',
      resourceLinks: [],
      captionTracks: [],
    })),
    eyesResults: GOD_MODE_EYES_APPROVED_VIDEOS.map(video => ({
      ok: true,
      videoId: video.videoId,
      output: {
        visualEvidence: [
          { timestamp: '01:00', visibleTextOrCode: 'terminal command', toolOrSurface: 'Claude Code', workflowObservation: 'runs /goal', buildIntelValue: 'goal runner evidence' },
          { timestamp: '02:00', visibleTextOrCode: 'browser UI', toolOrSurface: 'Browserbase', workflowObservation: 'skill run', buildIntelValue: 'HANDS skill evidence' },
        ],
        workflowMoments: [{ timestamp: '01:00', moment: 'goal loop', transferToAios: 'quality loop' }],
        buildCandidates: [{ title: 'Synthetic candidate', whyItMatters: 'visual proof', recommendedNextStep: 'build bounded card', evidenceTimestamps: ['01:00'], confidence: 'high' }],
        missedByTranscriptOnly: ['screen-visible command'],
        qualityVerdict: 'better_than_baseline',
        confidence: 'high',
      },
    })),
  })
  return {
    ok: transcriptOnly.ok === false &&
      fakeEyes.ok === true &&
      fakeEyes.summary.improvedVideoCount >= 2 &&
      fakeEyes.summary.totalTimestampedVisual >= 3,
    cases: [
      { name: 'transcript_only_scale_up_fails', ok: transcriptOnly.ok === false, status: transcriptOnly.status },
      { name: 'bounded_eyes_visual_evidence_passes', ok: fakeEyes.ok === true, status: fakeEyes.status },
      { name: 'bulk_screenshot_not_default', ok: GOD_MODE_EYES_NOT_NEXT.some(item => /bulk screenshot/i.test(item)) },
    ],
  }
}

export function renderGodModeEyesQualityReport(snapshot = {}) {
  const lines = []
  lines.push('# God Mode Extractor Eyes Quality Loop')
  lines.push('')
  lines.push(`Generated: ${snapshot.generatedAt || ''}`)
  lines.push(`Report artifact: \`${GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID}\``)
  lines.push(`Status: \`${snapshot.status}\``)
  lines.push('')
  lines.push('## Decision')
  lines.push('')
  lines.push(snapshot.ok
    ? 'Eyes V0 adds meaningful value over current transcript/description mode on the bounded sample. Continue to the overnight run guard before any broader Mark last-50 or creator latest-20 scale-up.'
    : 'Eyes V0 did not prove enough value yet. Loop on prompt/source/video selection before scaling extraction.')
  lines.push('')
  lines.push('## Summary')
  lines.push('')
  lines.push(`- Videos tested: ${snapshot.summary?.videoCount || 0}`)
  lines.push(`- Improved videos: ${snapshot.summary?.improvedVideoCount || 0}`)
  lines.push(`- Average quality delta: ${snapshot.summary?.averageQualityDelta || 0}`)
  lines.push(`- Timestamped visual evidence: ${snapshot.summary?.totalTimestampedVisual || 0}`)
  lines.push(`- Build candidates: ${snapshot.summary?.totalBuildCandidates || 0}`)
  lines.push(`- Approval-required links: ${snapshot.summary?.approvalRequiredLinkCount || 0}`)
  lines.push('')
  lines.push('## Videos')
  lines.push('')
  for (const result of list(snapshot.videoResults)) {
    lines.push(`### ${result.video.creator} - ${result.video.videoId}`)
    lines.push(`- URL: ${result.video.url}`)
    lines.push(`- Baseline score: ${result.comparison.baselineScore}`)
    lines.push(`- Eyes score: ${result.comparison.eyesScore}`)
    lines.push(`- Delta: ${result.comparison.qualityDelta}`)
    lines.push(`- Visual evidence: ${result.comparison.visualEvidenceCount}`)
    lines.push(`- Build candidates: ${result.comparison.buildCandidateCount}`)
    lines.push('')
  }
  lines.push('## Top Build Candidates')
  lines.push('')
  for (const candidate of list(snapshot.topBuildCandidates).slice(0, 8)) {
    lines.push(`- ${candidate.title} (${candidate.creator}, ${candidate.sourceVideoId})`)
    lines.push(`  - Why: ${candidate.whyItMatters}`)
    lines.push(`  - Next: ${candidate.recommendedNextStep}`)
    lines.push(`  - Evidence: ${list(candidate.evidenceTimestamps).join(', ') || 'Eyes V0 output'}`)
  }
  lines.push('')
  lines.push('## Boundaries')
  lines.push('')
  for (const item of GOD_MODE_EYES_NOT_NEXT) lines.push(`- ${item}`)
  lines.push('')
  return `${lines.join('\n')}\n`
}

export function renderGodModeEyesCloseout(snapshot = {}) {
  return `# God Mode Extractor Eyes Quality Loop Closeout

Closeout key: \`${GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_CLOSEOUT_KEY}\`
Card: \`${GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_CARD_ID}\`
Report artifact: \`${GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID}\`

## What Shipped

- Bounded Eyes V0 quality loop over ${snapshot.summary?.videoCount || 0} approved public YouTube videos.
- Current transcript/description baseline compared against Gemini video understanding.
- Timestamped visual evidence, visible workflow moments, and build candidates persisted into Foundation truth.
- Proposal-only atoms and evidence hits created; no automatic backlog cards.
- Dev Team Hub can read the Eyes report as Foundation Build Intel truth.

## Result

- Status: \`${snapshot.status}\`
- Improved videos: ${snapshot.summary?.improvedVideoCount || 0}
- Average quality delta: ${snapshot.summary?.averageQualityDelta || 0}
- Timestamped visual evidence: ${snapshot.summary?.totalTimestampedVisual || 0}
- Build candidates: ${snapshot.summary?.totalBuildCandidates || 0}

## Next

Continue \`${GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_NEXT_CARD_ID}\` before Mark last-50 or broader latest-20 scale-up.

## Not Next

${GOD_MODE_EYES_NOT_NEXT.map(item => `- ${item}`).join('\n')}

## Proof Commands

${GOD_MODE_EYES_PROOF_COMMANDS.map(command => `- \`${command}\``).join('\n')}
`
}
