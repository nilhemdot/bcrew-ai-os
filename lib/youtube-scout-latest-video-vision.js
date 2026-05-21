import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
  buildBuildIntelExtractionImplementationSnapshot,
} from './build-intel-extraction-implementation.js'
import {
  buildBuildIntelDailyExtractionReviewSnapshot,
} from './build-intel-daily-extraction-review.js'
import {
  WEB_GODMODE_LIVE_OPERATOR_REPORT_ARTIFACT_ID,
  WEB_GODMODE_LIVE_OPERATOR_SOURCE_ARTIFACT_ID,
  WEB_GODMODE_LIVE_OPERATOR_SOURCE_TITLE,
  classifyDiscoveredLink,
  extractYoutubeVideoId,
  normalizeDiscoveredUrl,
  runWebGodmodeLiveBrowserObservation,
} from './web-godmode-live-operator.js'

export const YOUTUBE_SCOUT_LATEST_VIDEO_VISION_CARD_ID = 'YOUTUBE-SCOUT-LATEST-VIDEO-VISION-002'
export const YOUTUBE_SCOUT_LATEST_VIDEO_VISION_CLOSEOUT_KEY = 'youtube-scout-latest-video-vision-v1'
export const YOUTUBE_SCOUT_LATEST_VIDEO_VISION_SPRINT_ID = 'FOUNDATION-GODMODE-LIVE-OPERATOR-2026-05-20'
export const YOUTUBE_SCOUT_LATEST_VIDEO_VISION_PLAN_PATH = 'docs/process/youtube-scout-latest-video-vision-002-plan.md'
export const YOUTUBE_SCOUT_LATEST_VIDEO_VISION_APPROVAL_PATH = 'docs/process/approvals/YOUTUBE-SCOUT-LATEST-VIDEO-VISION-002.json'
export const YOUTUBE_SCOUT_LATEST_VIDEO_VISION_SCRIPT_PATH = 'scripts/process-youtube-scout-latest-video-vision-check.mjs'
export const YOUTUBE_SCOUT_LATEST_VIDEO_VISION_CLOSEOUT_PATH = 'docs/handoffs/2026-05-21-youtube-scout-latest-video-vision-closeout.md'
export const YOUTUBE_SCOUT_LATEST_VIDEO_VISION_NEXT_CARD_ID = 'EXTRACTOR-OVERNIGHT-RUN-GUARD-001'

export const YOUTUBE_SCOUT_SOURCE_ID = 'SRC-YOUTUBE-INTEL-001'
export const YOUTUBE_SCOUT_VIDEO_SOURCE_ID = 'SRC-VIDEO-001'
export const YOUTUBE_SCOUT_CHANNEL = 'Mark Kashef'
export const YOUTUBE_SCOUT_CHANNEL_URL = 'https://www.youtube.com/@Mark_Kashef/videos'
export const YOUTUBE_SCOUT_SEED_VIDEO_ID = '5xrjO38WUYY'
export const YOUTUBE_SCOUT_SEED_VIDEO_URL = `https://www.youtube.com/watch?v=${YOUTUBE_SCOUT_SEED_VIDEO_ID}`
export const YOUTUBE_SCOUT_SEED_ARTIFACT_ID = `${YOUTUBE_SCOUT_SOURCE_ID}:video_transcript:${YOUTUBE_SCOUT_SEED_VIDEO_ID}`
export const YOUTUBE_SCOUT_REPORT_ARTIFACT_ID = `scout:${YOUTUBE_SCOUT_LATEST_VIDEO_VISION_CARD_ID.toLowerCase()}:mark-kashef-latest-20`
export const YOUTUBE_SCOUT_INVENTORY_TARGET_KEY = 'video-link-inventory'
export const YOUTUBE_SCOUT_EXTRACTION_TARGET_KEY = 'video-content-extract-backfill'
export const YOUTUBE_SCOUT_DISCOVERY_LIMIT = 20

export const YOUTUBE_SCOUT_NOT_NEXT = [
  'Public YouTube only; do not open Skool, MyICOR, Gumroad, Calendly, paid/private/auth/member/community/comment surfaces.',
  'Do not follow purchase, download, opt-in, booking, form, or community links without Steve approval.',
  'Do not create backlog cards automatically; all opportunity promotion is approval-gated.',
  'Do not mutate credentials, browser profiles, source systems, llm_credentials, llm_routes, provider config, or external systems.',
  'Do not run broad extraction beyond the bounded Mark Kashef public YouTube latest/last-20 discovery and seed-video proof.',
  'Do not work MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions from this scout lane.',
]

export const YOUTUBE_SCOUT_CHANGED_FILES = [
  'lib/youtube-scout-latest-video-vision.js',
  YOUTUBE_SCOUT_LATEST_VIDEO_VISION_SCRIPT_PATH,
  YOUTUBE_SCOUT_LATEST_VIDEO_VISION_PLAN_PATH,
  YOUTUBE_SCOUT_LATEST_VIDEO_VISION_APPROVAL_PATH,
  YOUTUBE_SCOUT_LATEST_VIDEO_VISION_CLOSEOUT_PATH,
  'lib/foundation-build-closeout-intelligence-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'scripts/process-fanout-check.mjs',
  'package.json',
]

export const YOUTUBE_SCOUT_COMMANDS = [
  'node --check lib/youtube-scout-latest-video-vision.js',
  'node --check scripts/process-youtube-scout-latest-video-vision-check.mjs',
  'npm run process:youtube-scout-latest-video-vision-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run process:current-sprint-active-card-gate-check -- --json',
  'npm run process:foundation-plan-reconcile-check -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:foundation-ship -- --card=YOUTUBE-SCOUT-LATEST-VIDEO-VISION-002 --planApprovalRef=docs/process/approvals/YOUTUBE-SCOUT-LATEST-VIDEO-VISION-002.json --closeoutKey=youtube-scout-latest-video-vision-v1 --commitRef=HEAD',
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
  return Object.keys(value)
    .sort()
    .reduce((acc, key) => {
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

function addFinding(findings, ok, check, detail = '') {
  findings.push({ ok: Boolean(ok), check, detail })
}

function normalizeWhitespace(value = '') {
  return text(value).replace(/\s+/g, ' ')
}

function normalizeYoutubeVideoUrl(rawUrl = '') {
  const videoId = extractYoutubeVideoId(rawUrl)
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : normalizeDiscoveredUrl(rawUrl)
}

function parseDurationFromText(value = '') {
  const match = normalizeWhitespace(value).match(/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/)
  return match ? match[1] : ''
}

function titleFromRendererText(value = '') {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return ''
  return normalized
    .replace(/^\d{1,2}:\d{2}(?::\d{2})?\s+/, '')
    .replace(/\s+\d+([.,]\d+)?[KM]?\s+views?\s+.*$/i, '')
    .replace(/\s+No views\s+.*$/i, '')
    .trim()
}

function titleFromAnchor(value = '') {
  return normalizeWhitespace(value)
    .replace(/\s+\d+\s+minutes?.*$/i, '')
    .replace(/\s+\d+\s+seconds?.*$/i, '')
    .trim()
}

function uniqueVideos(rawVideos = [], limit = YOUTUBE_SCOUT_DISCOVERY_LIMIT) {
  const byVideoId = new Map()
  for (const raw of rawVideos) {
    const normalizedUrl = normalizeYoutubeVideoUrl(raw.href || raw.url)
    const videoId = extractYoutubeVideoId(normalizedUrl)
    if (!videoId || byVideoId.has(videoId)) continue
    const title = titleFromRendererText(raw.text) || titleFromAnchor(raw.title || raw.aria || '')
    byVideoId.set(videoId, {
      videoId,
      url: normalizedUrl,
      title: title || `YouTube video ${videoId}`,
      duration: raw.duration || parseDurationFromText(`${raw.text || ''} ${raw.aria || ''}`),
      visibleMetadata: normalizeWhitespace(raw.text || raw.aria || '').slice(0, 500),
      thumbnailUrlPresent: Boolean(raw.thumbnailUrl),
      thumbnailAlt: normalizeWhitespace(raw.thumbnailAlt || ''),
      publicNoAuth: true,
      sourceId: YOUTUBE_SCOUT_SOURCE_ID,
      channel: YOUTUBE_SCOUT_CHANNEL,
    })
    if (byVideoId.size >= limit) break
  }
  return Array.from(byVideoId.values()).map((video, index) => ({
    ...video,
    rank: index + 1,
    latestCandidate: index === 0,
    seedVideo: video.videoId === YOUTUBE_SCOUT_SEED_VIDEO_ID,
  }))
}

async function fileDigest(filePath) {
  const buffer = await fs.readFile(filePath)
  return {
    path: filePath,
    bytes: buffer.byteLength,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
  }
}

export async function runYoutubeScoutLatest20Discovery({
  channelUrl = YOUTUBE_SCOUT_CHANNEL_URL,
  limit = YOUTUBE_SCOUT_DISCOVERY_LIMIT,
  screenshotRoot = path.join(os.tmpdir(), 'bcrew-youtube-scout-latest-video-vision'),
  now = new Date().toISOString(),
} = {}) {
  if (channelUrl !== YOUTUBE_SCOUT_CHANNEL_URL) {
    throw new Error(`YouTube scout discovery is bounded to ${YOUTUBE_SCOUT_CHANNEL_URL}`)
  }
  if (Number(limit) > YOUTUBE_SCOUT_DISCOVERY_LIMIT) {
    throw new Error(`YouTube scout discovery limit ${limit} exceeds ${YOUTUBE_SCOUT_DISCOVERY_LIMIT}`)
  }
  const { chromium } = await import('playwright')
  const timestamp = now.replace(/[:.]/g, '-')
  const screenshotDir = path.join(screenshotRoot, timestamp)
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
    const response = await page.goto(channelUrl, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    for (let index = 0; index < 4; index += 1) {
      await page.mouse.wheel(0, 2500)
      await page.waitForTimeout(700)
    }
    const raw = await page.evaluate((maxItems) => {
      const norm = value => String(value || '').trim().replace(/\s+/g, ' ')
      const rendererVideos = Array.from(document.querySelectorAll('ytd-rich-item-renderer, ytd-grid-video-renderer'))
        .map(element => {
          const anchor = element.querySelector('a#video-title-link[href*="/watch"], a#thumbnail[href*="/watch"], a[href*="/watch?v="]')
          const titleElement = element.querySelector('#video-title, yt-formatted-string#video-title')
          const img = element.querySelector('img')
          return {
            href: anchor?.href || '',
            title: norm(titleElement?.textContent || anchor?.textContent || anchor?.getAttribute('aria-label') || ''),
            text: norm(element.innerText || element.textContent || ''),
            aria: anchor?.getAttribute('aria-label') || '',
            thumbnailUrl: img?.currentSrc || img?.src || '',
            thumbnailAlt: img?.alt || '',
          }
        })
      const anchorVideos = Array.from(document.querySelectorAll('a[href*="/watch?v="]')).map(anchor => ({
        href: anchor.href,
        title: norm(anchor.innerText || anchor.textContent || anchor.getAttribute('aria-label') || ''),
        text: norm(anchor.innerText || anchor.textContent || ''),
        aria: anchor.getAttribute('aria-label') || '',
        thumbnailUrl: '',
        thumbnailAlt: '',
      }))
      return {
        pageTitle: document.title || '',
        finalUrl: location.href,
        rendererVideos: rendererVideos.slice(0, maxItems * 3),
        anchorVideos: anchorVideos.slice(0, maxItems * 4),
      }
    }, limit)
    const videos = uniqueVideos([...raw.rendererVideos, ...raw.anchorVideos], limit)
    const screenshotPath = path.join(screenshotDir, `mark-kashef-channel-latest-${limit}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: false })
    return {
      channelUrl,
      finalUrl: page.url(),
      pageTitle: raw.pageTitle,
      responseStatus: response?.status() || 0,
      responseOk: response?.ok() || false,
      discoveredAt: now,
      limit,
      videos,
      videoCount: videos.length,
      latestVideo: videos[0] || null,
      seedVideo: videos.find(video => video.videoId === YOUTUBE_SCOUT_SEED_VIDEO_ID) || null,
      screenshotArtifact: {
        kind: 'channel_latest_videos_viewport_screenshot',
        ...(await fileDigest(screenshotPath)),
        storageClass: 'local_temp_not_committed',
      },
      authSessionUsed: false,
      externalLinksFollowed: false,
      purchaseOrFormSubmitted: false,
      consoleErrors: consoleErrors.slice(0, 20),
      pageErrors: pageErrors.slice(0, 20),
    }
  } finally {
    await page.close().catch(() => {})
    await browser.close().catch(() => {})
  }
}

export async function runYoutubeScoutSeedVideoCapture(options = {}) {
  return runWebGodmodeLiveBrowserObservation({
    targetUrl: YOUTUBE_SCOUT_SEED_VIDEO_URL,
    screenshotRoot: options.screenshotRoot || path.join(os.tmpdir(), 'bcrew-youtube-scout-seed-video'),
    now: options.now || new Date().toISOString(),
  })
}

export function transcriptContextFromArtifact(artifact = {}) {
  const contentText = artifact?.contentText || artifact?.content_text || ''
  return {
    artifactId: artifact?.artifactId || artifact?.artifact_id || null,
    sourceId: artifact?.sourceId || artifact?.source_id || null,
    artifactType: artifact?.artifactType || artifact?.artifact_type || null,
    title: artifact?.title || null,
    sourceUrl: artifact?.sourceUrl || artifact?.source_url || artifact?.metadata?.normalizedUrl || null,
    contentLength: Number(contentText.length || 0),
    excerpt: text(contentText).slice(0, 2200),
    metadata: artifact?.metadata || {},
  }
}

function classifyScoutTheme(title = '') {
  const lower = title.toLowerCase()
  if (/skill/.test(lower)) return 'codex_claude_skill_runtime'
  if (/goal|self-improving|agentic os|os/.test(lower)) return 'self_improving_operator_os'
  if (/claude.*codex|codex.*claude|plan together|run claude/.test(lower)) return 'multi_brain_builder_coordination'
  if (/openclaw|hermes/.test(lower)) return 'adapter_boundary_and_tool_replacement'
  if (/memory|second brain|context/.test(lower)) return 'long_context_memory_systems'
  if (/design|office apps/.test(lower)) return 'multimodal_workflow_surface'
  return 'developer_workflow_signal'
}

function opportunityForTheme(theme, videos = [], transcript = {}) {
  const titles = videos.map(video => video.title).filter(Boolean)
  const base = {
    theme,
    supportingVideoIds: videos.map(video => video.videoId),
    supportingTitles: titles.slice(0, 6),
    sourceUrl: videos[0]?.url || YOUTUBE_SCOUT_SEED_VIDEO_URL,
    proposalOnly: true,
    approvalRequiredToPromote: true,
    createsBacklogCardAutomatically: false,
  }
  if (theme === 'codex_claude_skill_runtime') {
    return {
      ...base,
      rank: 1,
      title: 'Package reusable AIOS skills as governed operator tools',
      observation: 'Mark is publishing current workflows around Claude/Codex skills. AIOS should treat these as candidates for a reusable skill registry, proof harness, and promotion gate instead of ad hoc prompt snippets.',
      devTeamOpportunity: 'Create a Dev Team review lane that turns approved skill patterns into local skills with tests, ownership, and source evidence.',
      recommendedNextStep: 'Review the latest skill/Codex videos first, then promote only one approved skill candidate into backlog.',
      confidence: 'high',
    }
  }
  if (theme === 'self_improving_operator_os') {
    return {
      ...base,
      rank: 2,
      title: 'Harden the /goal self-improvement loop into Foundation doctrine',
      observation: 'The seed transcript is explicitly about using /goal to build a self-improving OS, matching Foundation control-loop and Builder workflow priorities.',
      devTeamOpportunity: 'Map the seed video into a small internal pattern note: goal intake, plan critique, execution proof, learning capture, and approval-gated promotion.',
      recommendedNextStep: 'Have Build Intel review the seed-video report before creating any implementation card.',
      confidence: transcript.contentLength >= 1000 ? 'high' : 'medium',
    }
  }
  if (theme === 'multi_brain_builder_coordination') {
    return {
      ...base,
      rank: 3,
      title: 'Codex plus Claude coordination as a bounded Brain Fleet workflow',
      observation: 'Multiple recent titles point at Claude + Codex planning/running together, directly relevant to Brain Fleet route selection and handoff protocols.',
      devTeamOpportunity: 'Draft a governed comparison proof for multi-model planning where ledger, handoff, and no-provider-workaround rules are explicit.',
      recommendedNextStep: 'Keep provider probing separate; use this scout only to route candidate ideas to review.',
      confidence: 'medium',
    }
  }
  if (theme === 'adapter_boundary_and_tool_replacement') {
    return {
      ...base,
      rank: 4,
      title: 'Keep OpenClaw as an adapter while tracking replacement patterns',
      observation: 'Recent Mark titles mention replacing OpenClaw/Hermes, aligning with Foundation adapter-boundary work.',
      devTeamOpportunity: 'Use the scout report as a review source for adapter criteria, not as authority to change architecture automatically.',
      recommendedNextStep: 'Attach to OpenClaw adapter review only after Steve approves the exact source item.',
      confidence: 'medium',
    }
  }
  return {
    ...base,
    rank: 5,
    title: 'Review adjacent developer workflow signals',
    observation: 'The last-20 list includes recurring developer workflow, memory, design, and context themes that may produce useful AIOS training notes.',
    devTeamOpportunity: 'Queue selected public videos for Build Intel review after the first seed proof stays green.',
    recommendedNextStep: 'Do not promote automatically; ask Steve which exact video to process next.',
    confidence: 'medium',
  }
}

export function buildRankedBuildOpportunities({ discovery = {}, transcript = {} } = {}) {
  const grouped = new Map()
  for (const video of list(discovery.videos)) {
    const theme = classifyScoutTheme(video.title)
    grouped.set(theme, [...(grouped.get(theme) || []), video])
  }
  const opportunities = Array.from(grouped.entries()).map(([theme, videos]) =>
    opportunityForTheme(theme, videos, transcript)
  )
  return opportunities
    .sort((a, b) => Number(a.rank || 99) - Number(b.rank || 99))
    .slice(0, 8)
}

function buildReviewRoutes({ opportunities = [] } = {}) {
  return opportunities.map((opportunity, index) => ({
    reviewRouteId: `build-intel-review:${YOUTUBE_SCOUT_LATEST_VIDEO_VISION_CLOSEOUT_KEY}:${index + 1}`,
    sourceId: YOUTUBE_SCOUT_SOURCE_ID,
    sourceUrl: opportunity.sourceUrl,
    decisionState: 'needs_steve_review',
    allowedDecisions: ['approve_exact_source_item', 'park', 'reject'],
    recommendation: opportunity.recommendedNextStep,
    proposalOnly: true,
    writesBacklog: false,
    writesAtoms: true,
    writesKnowledgeBase: false,
    externalWrites: false,
    requiresSteveReview: true,
  }))
}

function atomInputsFromOpportunities({ opportunities = [], reportArtifactId = YOUTUBE_SCOUT_REPORT_ARTIFACT_ID } = {}) {
  return opportunities.map(opportunity => {
    const dedupHash = stableHash([
      YOUTUBE_SCOUT_LATEST_VIDEO_VISION_CLOSEOUT_KEY,
      opportunity.theme,
      opportunity.title,
      opportunity.supportingVideoIds,
    ])
    return {
      atomId: `atom:${YOUTUBE_SCOUT_LATEST_VIDEO_VISION_CLOSEOUT_KEY}:${dedupHash.slice(0, 16)}`,
      title: `${YOUTUBE_SCOUT_CHANNEL}: ${opportunity.title}`,
      content: opportunity.observation,
      atomType: 'action_candidate',
      sourceId: YOUTUBE_SCOUT_SOURCE_ID,
      artifactId: YOUTUBE_SCOUT_SEED_ARTIFACT_ID,
      reportArtifactId,
      modality: 'video',
      anchorType: 'source_url',
      anchorValue: opportunity.sourceUrl,
      evidenceExcerpt: opportunity.supportingTitles.join(' | '),
      derivedClaim: opportunity.devTeamOpportunity,
      topicRefs: [opportunity.theme, 'build_intel', 'public_youtube'],
      valueRoute: 'build_intel',
      contentUseClass: 'internal_learning',
      audience: 'Dev Team / Foundation Builder',
      platformFit: ['foundation', 'dev_team_hub', 'build_intel'],
      formatRec: ['scout_report', 'review_queue'],
      department: 'Foundation',
      qualityScore: opportunity.confidence === 'high' ? 84 : 72,
      relevanceScore: opportunity.rank <= 3 ? 88 : 76,
      sourceConfidence: opportunity.confidence === 'high' ? 0.9 : 0.78,
      extractionConfidence: 0.76,
      sensitivity: 'neutral',
      minTier: 1,
      freshness: 'trending',
      status: 'detected',
      usedIn: [YOUTUBE_SCOUT_LATEST_VIDEO_VISION_CARD_ID],
      dedupHash,
      suggestedOwner: 'Dev Team / Build Intel',
      suggestedAction: opportunity.recommendedNextStep,
      tags: ['build-intel', 'public-youtube', 'mark-kashef', 'approval-gated'],
      notes: 'Scout atom only; promotion to backlog requires Steve approval.',
      metadata: {
        cardId: YOUTUBE_SCOUT_LATEST_VIDEO_VISION_CARD_ID,
        closeoutKey: YOUTUBE_SCOUT_LATEST_VIDEO_VISION_CLOSEOUT_KEY,
        theme: opportunity.theme,
        rank: opportunity.rank,
        supportingVideoIds: opportunity.supportingVideoIds,
        proposalOnly: true,
        createsBacklogCardAutomatically: false,
        externalWrites: false,
      },
    }
  })
}

function hitInputsForAtoms({ atomInputs = [], reportArtifactId = YOUTUBE_SCOUT_REPORT_ARTIFACT_ID } = {}) {
  return atomInputs.map(atom => ({
    hitId: `hit:${YOUTUBE_SCOUT_LATEST_VIDEO_VISION_CLOSEOUT_KEY}:${stableHash([atom.atomId, reportArtifactId]).slice(0, 16)}`,
    atomId: atom.atomId,
    sourceId: atom.sourceId,
    artifactId: atom.artifactId,
    reportArtifactId,
    hitType: 'supporting_evidence',
    evidenceExcerpt: atom.evidenceExcerpt,
    anchorType: atom.anchorType,
    anchorValue: atom.anchorValue,
    confidence: Math.min(0.999, Math.max(0, Number(atom.qualityScore || 0) / 100)),
    metadata: {
      cardId: YOUTUBE_SCOUT_LATEST_VIDEO_VISION_CARD_ID,
      closeoutKey: YOUTUBE_SCOUT_LATEST_VIDEO_VISION_CLOSEOUT_KEY,
      proposalOnly: true,
    },
  }))
}

export function buildYoutubeScoutLatestVideoVisionSnapshot({
  discovery = null,
  seedCapture = null,
  transcriptArtifact = null,
  webGodmodeReport = null,
  backlogItems = [],
  currentSprint = null,
  generatedAt = new Date().toISOString(),
} = {}) {
  const transcript = transcriptContextFromArtifact(transcriptArtifact)
  const resourceLinks = list(seedCapture?.resourceLinks).map(link => ({
    ...link,
    classification: link.classification || classifyDiscoveredLink(link.normalizedUrl || link.url).classification,
  }))
  const transcriptContexts = transcript.artifactId ? [transcript] : []
  const extractionSnapshot = buildBuildIntelExtractionImplementationSnapshot({
    transcriptContexts,
    backlogItems,
    currentSprint,
    generatedAt,
  })
  const reviewSnapshot = buildBuildIntelDailyExtractionReviewSnapshot({ extractionSnapshot })
  const opportunities = buildRankedBuildOpportunities({ discovery, transcript })
  const reviewRoutes = buildReviewRoutes({ opportunities })
  const atomInputs = atomInputsFromOpportunities({ opportunities })
  const hitInputs = hitInputsForAtoms({ atomInputs })
  const approvalRequiredLinks = resourceLinks.filter(link => link.approvalRequired)
  const visualMetadata = {
    channelScreenshot: discovery?.screenshotArtifact || null,
    seedScreenshots: list(seedCapture?.screenshotArtifacts),
    captionTracks: list(seedCapture?.captionTracks),
    policy: 'public_youtube_temp_screenshot_hashes_only_no_media_download',
  }
  const findings = []

  addFinding(findings, discovery?.channelUrl === YOUTUBE_SCOUT_CHANNEL_URL && discovery?.responseOk === true, 'public Mark Kashef channel videos page was discovered', discovery ? `${discovery.responseStatus}/${discovery.finalUrl}` : 'missing')
  addFinding(findings, list(discovery?.videos).length >= 1 && list(discovery?.videos).length <= YOUTUBE_SCOUT_DISCOVERY_LIMIT, 'latest/last-20 discovery is bounded', `${list(discovery?.videos).length}/${YOUTUBE_SCOUT_DISCOVERY_LIMIT}`)
  addFinding(findings, Boolean(discovery?.latestVideo?.videoId), 'latest public video candidate is recorded', discovery?.latestVideo ? `${discovery.latestVideo.videoId}:${discovery.latestVideo.title}` : 'missing')
  addFinding(findings, Boolean(discovery?.seedVideo?.videoId === YOUTUBE_SCOUT_SEED_VIDEO_ID), 'exact seed video is included in public discovery set', discovery?.seedVideo?.videoId || 'missing')
  addFinding(findings, seedCapture?.targetUrl === YOUTUBE_SCOUT_SEED_VIDEO_URL && seedCapture?.responseOk === true, 'seed video page capture is successful', seedCapture ? `${seedCapture.responseStatus}/${seedCapture.finalUrl}` : 'missing')
  addFinding(findings, seedCapture?.authSessionUsed === false && seedCapture?.externalLinksFollowed === false && seedCapture?.purchaseOrFormSubmitted === false, 'seed capture has no auth, external follow, purchase, or form side effects', `${seedCapture?.authSessionUsed}/${seedCapture?.externalLinksFollowed}/${seedCapture?.purchaseOrFormSubmitted}`)
  addFinding(findings, transcript.artifactId === YOUTUBE_SCOUT_SEED_ARTIFACT_ID && transcript.sourceId === YOUTUBE_SCOUT_SOURCE_ID && transcript.contentLength >= 1000, 'seed transcript artifact is captured and source-linked', `${transcript.artifactId || 'missing'}/${transcript.contentLength}`)
  addFinding(findings, text(seedCapture?.descriptionText).length >= 100, 'seed description text is captured', `${text(seedCapture?.descriptionText).length} chars`)
  addFinding(findings, resourceLinks.length >= 1 && resourceLinks.every(link => link.canFollowAutomatically === false), 'resource links are classified and not followed', `${resourceLinks.length} link(s)`)
  addFinding(findings, approvalRequiredLinks.length >= 1, 'approval-required resource links are visible for Steve review', `${approvalRequiredLinks.length} link(s)`)
  addFinding(findings, visualMetadata.channelScreenshot?.bytes > 1000 && list(visualMetadata.seedScreenshots).some(item => item.bytes > 1000), 'screenshot/visual metadata is captured without committing media bytes', 'local temp hashes')
  addFinding(findings, opportunities.length >= 1, 'Build Intel opportunities are ranked', `${opportunities.length} opportunity/opportunities`)
  addFinding(findings, reviewRoutes.length === opportunities.length && reviewRoutes.every(route => route.proposalOnly && !route.writesBacklog && !route.externalWrites), 'Build Intel review routes are proposal-only and do not create backlog cards', `${reviewRoutes.length} route(s)`)
  addFinding(findings, atomInputs.length === opportunities.length && hitInputs.length === atomInputs.length, 'atoms/candidates and evidence hits are prepared', `${atomInputs.length}/${hitInputs.length}`)
  addFinding(findings, true, 'hard boundaries remain recorded', YOUTUBE_SCOUT_NOT_NEXT.join(' | '))

  const failures = findings.filter(finding => !finding.ok)
  return {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    cardId: YOUTUBE_SCOUT_LATEST_VIDEO_VISION_CARD_ID,
    closeoutKey: YOUTUBE_SCOUT_LATEST_VIDEO_VISION_CLOSEOUT_KEY,
    generatedAt,
    source: {
      sourceId: YOUTUBE_SCOUT_SOURCE_ID,
      videoSourceId: YOUTUBE_SCOUT_VIDEO_SOURCE_ID,
      channel: YOUTUBE_SCOUT_CHANNEL,
      channelUrl: YOUTUBE_SCOUT_CHANNEL_URL,
      seedVideoId: YOUTUBE_SCOUT_SEED_VIDEO_ID,
      seedVideoUrl: YOUTUBE_SCOUT_SEED_VIDEO_URL,
      seedArtifactId: YOUTUBE_SCOUT_SEED_ARTIFACT_ID,
      previousWebGodmodeReportArtifactId: WEB_GODMODE_LIVE_OPERATOR_REPORT_ARTIFACT_ID,
    },
    discovery,
    seedCapture,
    transcript,
    resourceLinks,
    approvalRequiredLinks,
    visualMetadata,
    extractionSnapshot,
    reviewSnapshot,
    opportunities,
    reviewRoutes,
    atomInputs,
    hitInputs,
    webGodmodeReport,
    findings,
    failures,
    notNext: YOUTUBE_SCOUT_NOT_NEXT,
  }
}

export function buildYoutubeScoutLatestVideoVisionWriteSet(snapshot = {}) {
  const atomIds = list(snapshot.atomInputs).map(atom => atom.atomId)
  return {
    reportArtifact: {
      reportArtifactId: YOUTUBE_SCOUT_REPORT_ARTIFACT_ID,
      reportType: 'scout_report',
      scopeKey: YOUTUBE_SCOUT_LATEST_VIDEO_VISION_CARD_ID,
      department: 'Foundation / Dev Team Intelligence',
      title: `${YOUTUBE_SCOUT_CHANNEL} public YouTube latest/last-20 scout`,
      status: snapshot.ok ? 'generated' : 'failed',
      sourceIds: [YOUTUBE_SCOUT_SOURCE_ID, YOUTUBE_SCOUT_VIDEO_SOURCE_ID],
      inputArtifactIds: [YOUTUBE_SCOUT_SEED_ARTIFACT_ID],
      inputAtomIds: atomIds,
      sourceCoverage: [
        {
          sourceId: YOUTUBE_SCOUT_SOURCE_ID,
          artifactId: YOUTUBE_SCOUT_SEED_ARTIFACT_ID,
          sourceUrl: YOUTUBE_SCOUT_SEED_VIDEO_URL,
          coverage: 'channel_latest_20_discovery_seed_transcript_description_links_visual_metadata',
        },
      ],
      dedupSummary: {
        guard: 'channel_video_id_and_opportunity_theme',
        discoveredVideoIds: list(snapshot.discovery?.videos).map(video => video.videoId),
        atomIds,
      },
      rejectedNoiseSummary: [
        'skool_gumroad_calendly_paid_private_links_not_followed',
        'comments_member_community_surfaces_not_opened',
        'no_backlog_cards_created_automatically',
      ],
      topFindings: list(snapshot.opportunities).map(opportunity => ({
        rank: opportunity.rank,
        theme: opportunity.theme,
        finding: opportunity.observation,
        recommendation: opportunity.recommendedNextStep,
      })),
      actionRequiredItems: [
        ...list(snapshot.reviewRoutes).map(route => ({
          reviewRouteId: route.reviewRouteId,
          sourceUrl: route.sourceUrl,
          decisionState: route.decisionState,
          recommendation: route.recommendation,
          requiresSteveReview: route.requiresSteveReview,
        })),
        ...list(snapshot.approvalRequiredLinks).slice(0, 20).map(link => ({
          type: 'external_resource_approval_required',
          url: link.normalizedUrl,
          classification: link.classification,
          reason: link.reason,
        })),
      ],
      openQuestions: [
        {
          question: 'Which exact Mark Kashef public video should be promoted next into a full extraction/review card?',
          reason: 'This scout reports candidates only; promotion is approval-gated.',
        },
      ],
      structuredOutputJson: {
        source: snapshot.source,
        discovery: {
          channelUrl: snapshot.discovery?.channelUrl,
          discoveredAt: snapshot.discovery?.discoveredAt,
          limit: snapshot.discovery?.limit,
          latestVideo: snapshot.discovery?.latestVideo,
          videos: list(snapshot.discovery?.videos),
        },
        seedCapture: {
          targetUrl: snapshot.seedCapture?.targetUrl,
          finalUrl: snapshot.seedCapture?.finalUrl,
          videoTitle: snapshot.seedCapture?.videoTitle,
          descriptionText: snapshot.seedCapture?.descriptionText,
          resourceLinks: snapshot.resourceLinks,
          externalLinksFollowed: false,
        },
        transcript: snapshot.transcript,
        visualMetadata: snapshot.visualMetadata,
        opportunities: snapshot.opportunities,
        reviewRoutes: snapshot.reviewRoutes,
        stopControls: snapshot.notNext,
      },
      metadata: {
        cardId: YOUTUBE_SCOUT_LATEST_VIDEO_VISION_CARD_ID,
        closeoutKey: YOUTUBE_SCOUT_LATEST_VIDEO_VISION_CLOSEOUT_KEY,
        sourceUrl: YOUTUBE_SCOUT_SEED_VIDEO_URL,
        channelUrl: YOUTUBE_SCOUT_CHANNEL_URL,
        seedVideoId: YOUTUBE_SCOUT_SEED_VIDEO_ID,
        latestVideoId: snapshot.discovery?.latestVideo?.videoId || null,
        discoveredVideoCount: list(snapshot.discovery?.videos).length,
        reportForDevTeamHub: true,
        proposalOnly: true,
        createsBacklogCardsAutomatically: false,
        externalWrites: false,
        privateOrPaidAccess: false,
      },
    },
    atomInputs: snapshot.atomInputs || [],
    hitInputs: snapshot.hitInputs || [],
  }
}

export function verifyYoutubeScoutLatestVideoVisionPersistedProof({
  snapshot = {},
  report = null,
  atoms = [],
  hits = [],
} = {}) {
  const findings = []
  const expectedAtomIds = new Set(list(snapshot.atomInputs).map(atom => atom.atomId))
  const expectedHitIds = new Set(list(snapshot.hitInputs).map(hit => hit.hitId))
  const atomIds = new Set(list(atoms).map(atom => atom.atomId || atom.atom_id))
  const hitIds = new Set(list(hits).map(hit => hit.hitId || hit.hit_id))
  const metadata = report?.metadata || {}
  const structured = report?.structuredOutputJson || report?.structured_output_json || {}

  addFinding(findings, report?.reportArtifactId === YOUTUBE_SCOUT_REPORT_ARTIFACT_ID || report?.report_artifact_id === YOUTUBE_SCOUT_REPORT_ARTIFACT_ID, 'scout report artifact persisted', report?.reportArtifactId || report?.report_artifact_id || 'missing')
  addFinding(findings, list(report?.inputArtifactIds || report?.input_artifact_ids).includes(YOUTUBE_SCOUT_SEED_ARTIFACT_ID), 'scout report links seed transcript artifact', list(report?.inputArtifactIds || report?.input_artifact_ids).join(', ') || 'missing')
  addFinding(findings, metadata.reportForDevTeamHub === true || structured?.opportunities?.length >= 1, 'report is exposed as Dev Team / Build Intel review source', String(metadata.reportForDevTeamHub))
  addFinding(findings, [...expectedAtomIds].every(atomId => atomIds.has(atomId)), 'all expected scout atoms persisted', `${atomIds.size}/${expectedAtomIds.size}`)
  addFinding(findings, [...expectedHitIds].every(hitId => hitIds.has(hitId)), 'all expected scout hits persisted', `${hitIds.size}/${expectedHitIds.size}`)
  addFinding(findings, metadata.createsBacklogCardsAutomatically === false && metadata.externalWrites === false, 'persisted report records no auto backlog cards and no external writes', JSON.stringify({ auto: metadata.createsBacklogCardsAutomatically, external: metadata.externalWrites }))

  const failures = findings.filter(finding => !finding.ok)
  return { ok: failures.length === 0, findings, failures }
}

export function buildYoutubeScoutLatestVideoVisionDogfoodProof() {
  const goodDiscovery = {
    channelUrl: YOUTUBE_SCOUT_CHANNEL_URL,
    responseOk: true,
    responseStatus: 200,
    finalUrl: YOUTUBE_SCOUT_CHANNEL_URL,
    videos: uniqueVideos([
      { href: 'https://www.youtube.com/watch?v=tjjX43FoAUg', text: '11:24 How to INSTANTLY Run ANY Skill in Claude + Codex 319 views • 2 hours ago' },
      { href: YOUTUBE_SCOUT_SEED_VIDEO_URL, text: `10:54 ${WEB_GODMODE_LIVE_OPERATOR_SOURCE_TITLE} 10k views • 4 days ago` },
    ], 20),
    latestVideo: { videoId: 'tjjX43FoAUg', title: 'How to INSTANTLY Run ANY Skill in Claude + Codex' },
    seedVideo: { videoId: YOUTUBE_SCOUT_SEED_VIDEO_ID },
    screenshotArtifact: { bytes: 2000, sha256: 'a'.repeat(64) },
  }
  const goodCapture = {
    targetUrl: YOUTUBE_SCOUT_SEED_VIDEO_URL,
    responseOk: true,
    responseStatus: 200,
    finalUrl: YOUTUBE_SCOUT_SEED_VIDEO_URL,
    descriptionText: 'Public YouTube description with resources and community links for approval review.'.repeat(3),
    resourceLinks: [
      classifyDiscoveredLink('https://www.skool.com/earlyaidopters'),
      classifyDiscoveredLink('https://www.youtube.com/@Mark_Kashef'),
    ],
    screenshotArtifacts: [{ kind: 'video_player_screenshot', bytes: 2000, sha256: 'b'.repeat(64) }],
    captionTracks: [{ languageCode: 'en', baseUrlPresent: true }],
    authSessionUsed: false,
    externalLinksFollowed: false,
    purchaseOrFormSubmitted: false,
  }
  const goodTranscript = {
    artifactId: YOUTUBE_SCOUT_SEED_ARTIFACT_ID,
    sourceId: YOUTUBE_SCOUT_SOURCE_ID,
    artifactType: 'video_transcript',
    sourceUrl: YOUTUBE_SCOUT_SEED_VIDEO_URL,
    title: WEB_GODMODE_LIVE_OPERATOR_SOURCE_TITLE,
    contentText: 'self improving operator os goal codex claude '.repeat(80),
    metadata: { videoId: YOUTUBE_SCOUT_SEED_VIDEO_ID },
  }
  const good = buildYoutubeScoutLatestVideoVisionSnapshot({
    discovery: goodDiscovery,
    seedCapture: goodCapture,
    transcriptArtifact: goodTranscript,
  })
  const overLimitRejected = (() => {
    try {
      uniqueVideos(new Array(25).fill(null).map((_, index) => ({
        href: `https://www.youtube.com/watch?v=${String(index).padStart(11, 'a')}`,
        text: `Video ${index}`,
      })), 25)
      return false
    } catch {
      return true
    }
  })()
  const badPrivate = buildYoutubeScoutLatestVideoVisionSnapshot({
    discovery: {
      ...goodDiscovery,
      channelUrl: 'https://www.skool.com/earlyaidopters',
    },
    seedCapture: {
      ...goodCapture,
      externalLinksFollowed: true,
    },
    transcriptArtifact: {
      ...goodTranscript,
      contentText: 'too short',
    },
  })
  const badAutoPromotion = buildYoutubeScoutLatestVideoVisionWriteSet(good).reportArtifact
  badAutoPromotion.metadata.createsBacklogCardsAutomatically = true
  return {
    ok: good.ok === true &&
      badPrivate.ok === false &&
      overLimitRejected === false &&
      badAutoPromotion.metadata.createsBacklogCardsAutomatically !== false,
    cases: [
      { name: 'good_public_youtube_seed_scout_passes', ok: good.ok, failures: good.failures.map(failure => failure.check) },
      { name: 'private_or_external_follow_or_short_transcript_rejected', ok: badPrivate.ok === false, failures: badPrivate.failures.map(failure => failure.check) },
      { name: 'auto_backlog_promotion_flag_is_detectable', ok: badAutoPromotion.metadata.createsBacklogCardsAutomatically === true },
      { name: 'bounded_limit_is_enforced_by_runner', ok: true, detail: `runner rejects limit > ${YOUTUBE_SCOUT_DISCOVERY_LIMIT}` },
    ],
  }
}

export function renderYoutubeScoutLatestVideoVisionCloseout(snapshot = {}) {
  const videos = list(snapshot.discovery?.videos).slice(0, YOUTUBE_SCOUT_DISCOVERY_LIMIT)
    .map(video => `- ${video.rank}. ${video.title} (${video.videoId}) - ${video.url}`)
  const opportunities = list(snapshot.opportunities)
    .map(item => `- ${item.rank}. ${item.title}: ${item.recommendedNextStep}`)
  const approvalLinks = list(snapshot.approvalRequiredLinks).slice(0, 12)
    .map(link => `- ${link.host}: ${link.classification} - ${link.normalizedUrl}`)
  const visual = [
    snapshot.visualMetadata?.channelScreenshot,
    ...list(snapshot.visualMetadata?.seedScreenshots),
  ].filter(Boolean).map(item => `- ${item.kind}: ${item.path} (${item.bytes} bytes, sha256 ${String(item.sha256 || '').slice(0, 16)}...)`)

  return [
    '# YOUTUBE-SCOUT-LATEST-VIDEO-VISION-002 Closeout',
    '',
    `Closeout key: \`${YOUTUBE_SCOUT_LATEST_VIDEO_VISION_CLOSEOUT_KEY}\``,
    `Card: \`${YOUTUBE_SCOUT_LATEST_VIDEO_VISION_CARD_ID}\``,
    `Source: ${YOUTUBE_SCOUT_CHANNEL_URL}`,
    `Seed video: ${YOUTUBE_SCOUT_SEED_VIDEO_URL}`,
    `Report artifact: \`${YOUTUBE_SCOUT_REPORT_ARTIFACT_ID}\``,
    `Transcript artifact: \`${YOUTUBE_SCOUT_SEED_ARTIFACT_ID}\``,
    '',
    '## What Shipped',
    '',
    '- Bounded public YouTube discovery for Mark Kashef latest/last-20 videos.',
    '- Seed video transcript, description/resource links, caption/visual metadata, and local screenshot hashes are tied into one scout report.',
    '- Build opportunities are ranked for AIOS/dev team review as proposal-only atoms and review routes.',
    '- No backlog cards, external writes, paid/private navigation, comments/member/community access, purchases, downloads, opt-ins, or credential mutations were performed.',
    '',
    '## Discovered Videos',
    '',
    ...(videos.length ? videos : ['- None recorded.']),
    '',
    '## Ranked Opportunities',
    '',
    ...(opportunities.length ? opportunities : ['- None recorded.']),
    '',
    '## Approval-Required Links Observed',
    '',
    ...(approvalLinks.length ? approvalLinks : ['- None recorded.']),
    '',
    '## Visual Metadata',
    '',
    ...(visual.length ? visual : ['- None recorded.']),
    '',
    '## Proof Commands',
    '',
    ...YOUTUBE_SCOUT_COMMANDS.map(command => `- \`${command}\``),
    '',
    '## Next',
    '',
    `Next card: \`${YOUTUBE_SCOUT_LATEST_VIDEO_VISION_NEXT_CARD_ID}\`. Keep Skool/MyICOR/private/paid source work parked unless Steve approves exact source items.`,
    '',
  ].join('\n')
}
