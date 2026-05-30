import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export const WEB_GODMODE_LIVE_OPERATOR_CARD_ID = 'WEB-GODMODE-LIVE-OPERATOR-002'
export const WEB_GODMODE_LIVE_OPERATOR_SPRINT_ID = 'FOUNDATION-GODMODE-LIVE-OPERATOR-2026-05-20'
export const WEB_GODMODE_LIVE_OPERATOR_CLOSEOUT_KEY = 'web-godmode-live-operator-v1'
export const WEB_GODMODE_LIVE_OPERATOR_PLAN_PATH = 'docs/process/web-godmode-live-operator-002-plan.md'
export const WEB_GODMODE_LIVE_OPERATOR_APPROVAL_PATH = 'docs/process/approvals/WEB-GODMODE-LIVE-OPERATOR-002.json'
export const WEB_GODMODE_LIVE_OPERATOR_SCRIPT_PATH = 'scripts/process-web-godmode-live-operator-check.mjs'
export const WEB_GODMODE_LIVE_OPERATOR_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-20-web-godmode-live-operator-closeout.md'
export const WEB_GODMODE_LIVE_OPERATOR_NEXT_CARD_ID = 'YOUTUBE-SCOUT-LATEST-VIDEO-VISION-002'

export const WEB_GODMODE_LIVE_OPERATOR_SOURCE_ID = 'SRC-YOUTUBE-INTEL-001'
export const WEB_GODMODE_LIVE_OPERATOR_VIDEO_SOURCE_ID = 'SRC-VIDEO-001'
export const WEB_GODMODE_LIVE_OPERATOR_VIDEO_ID = '5xrjO38WUYY'
export const WEB_GODMODE_LIVE_OPERATOR_SOURCE_URL = `https://www.youtube.com/watch?v=${WEB_GODMODE_LIVE_OPERATOR_VIDEO_ID}`
export const WEB_GODMODE_LIVE_OPERATOR_CHANNEL_URL = 'https://www.youtube.com/@Mark_Kashef/videos'
export const WEB_GODMODE_LIVE_OPERATOR_SOURCE_TITLE = 'How to Use /goal to Build a Self-Improving OS'
export const WEB_GODMODE_LIVE_OPERATOR_CHANNEL = 'Mark Kashef'
export const WEB_GODMODE_LIVE_OPERATOR_SOURCE_ARTIFACT_ID = `${WEB_GODMODE_LIVE_OPERATOR_SOURCE_ID}:video_transcript:${WEB_GODMODE_LIVE_OPERATOR_VIDEO_ID}`
export const WEB_GODMODE_LIVE_OPERATOR_REPORT_ARTIFACT_ID = `proof:${WEB_GODMODE_LIVE_OPERATOR_CARD_ID.toLowerCase()}:mark-kashef-5xrjo38wuyy`
export const WEB_GODMODE_LIVE_OPERATOR_INVENTORY_TARGET_KEY = 'video-link-inventory'
export const WEB_GODMODE_LIVE_OPERATOR_EXTRACTION_TARGET_KEY = 'video-content-extract-backfill'

export const WEB_GODMODE_LIVE_OPERATOR_NOT_NEXT = [
  'Do not run the last-20 YouTube batch until this one exact public video proof is green.',
  'Do not open or crawl Skool, Gumroad, Calendly, MyICOR, Loom, comments, member data, paid content, or private/auth-required content.',
  'Do not buy, download, opt in, book, submit forms, mutate credentials, mutate browser profiles, or perform external writes.',
  'Do not work MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.',
  'Do not run provider/vision/model interpretation in this card; record browser evidence and transcript/resource artifacts first.',
  'Do not store screenshot bytes in tracked repo docs; store local temp screenshot artifacts and persist hashes/paths/provenance in the report artifact.',
  'Stop on transcript failure, screenshot failure, broad-source drift, quota failure, credential mutation, or raw Foundation health degradation.',
]

export const WEB_GODMODE_LIVE_OPERATOR_CHANGED_FILES = [
  'lib/web-godmode-live-operator.js',
  WEB_GODMODE_LIVE_OPERATOR_SCRIPT_PATH,
  WEB_GODMODE_LIVE_OPERATOR_PLAN_PATH,
  WEB_GODMODE_LIVE_OPERATOR_APPROVAL_PATH,
  WEB_GODMODE_LIVE_OPERATOR_CLOSEOUT_PATH,
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'lib/foundation-build-closeout-intelligence-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'package.json',
]

export const WEB_GODMODE_LIVE_OPERATOR_COMMANDS = [
  'node --check lib/web-godmode-live-operator.js',
  'node --check scripts/process-web-godmode-live-operator-check.mjs',
  'npm run process:web-godmode-live-operator-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run process:current-sprint-active-card-gate-check -- --json',
  'npm run process:foundation-plan-reconcile-check -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:foundation-ship -- --card=WEB-GODMODE-LIVE-OPERATOR-002 --planApprovalRef=docs/process/approvals/WEB-GODMODE-LIVE-OPERATOR-002.json --closeoutKey=web-godmode-live-operator-v1 --commitRef=HEAD',
]

const APPROVED_OPERATIONS = new Set([
  'browser_navigation',
  'page_text',
  'dom_outline',
  'description_extract',
  'link_discovery',
  'caption_track_discovery',
  'viewport_screenshot',
  'video_player_screenshot',
  'transcript_artifact_lookup',
])

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

function stableTextHash(value = '') {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex')
}

function stableHash(value = '') {
  return crypto.createHash('sha256').update(JSON.stringify(stableValue(value)), 'utf8').digest('hex')
}

function addFinding(findings, ok, check, detail = '') {
  findings.push({ ok: Boolean(ok), check, detail })
}

function normalizeWhitespace(value = '') {
  return text(value).replace(/\s+/g, ' ')
}

export function extractYoutubeVideoId(rawUrl = '') {
  try {
    const url = new URL(rawUrl)
    if (url.hostname === 'youtu.be') return text(url.pathname.replace(/^\//, ''))
    if (/youtube\.com$/i.test(url.hostname) || /(^|\.)youtube\.com$/i.test(url.hostname)) {
      return text(url.searchParams.get('v'))
    }
  } catch {}
  return ''
}

export function normalizeDiscoveredUrl(rawUrl = '') {
  const value = text(rawUrl)
  if (!value) return ''
  try {
    const url = new URL(value)
    if (/youtube\.com$/i.test(url.hostname) && url.pathname === '/redirect') {
      const redirected = text(url.searchParams.get('q'))
      if (redirected) return normalizeDiscoveredUrl(redirected)
    }
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'feature']) {
      url.searchParams.delete(key)
    }
    url.hash = ''
    return url.toString()
  } catch {
    return value
  }
}

export function classifyDiscoveredLink(rawUrl = '') {
  const normalizedUrl = normalizeDiscoveredUrl(rawUrl)
  if (!normalizedUrl) {
    return {
      normalizedUrl,
      host: '',
      classification: 'empty',
      approvalRequired: true,
      canFollowAutomatically: false,
      reason: 'missing URL',
    }
  }

  try {
    const url = new URL(normalizedUrl)
    const host = url.hostname.replace(/^www\./, '').toLowerCase()
    if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be') {
      return {
        normalizedUrl,
        host,
        classification: 'public_youtube_internal',
        approvalRequired: false,
        canFollowAutomatically: false,
        reason: 'internal YouTube link is observed only in this proof',
      }
    }
    if (host === 'skool.com' || host.endsWith('.skool.com')) {
      return {
        normalizedUrl,
        host,
        classification: 'approval_required_skool_community',
        approvalRequired: true,
        canFollowAutomatically: false,
        reason: 'Skool community/course access may require auth, paid scope, or content-use approval',
      }
    }
    if (host === 'gumroad.com' || host.endsWith('.gumroad.com')) {
      return {
        normalizedUrl,
        host,
        classification: 'approval_required_download_or_purchase',
        approvalRequired: true,
        canFollowAutomatically: false,
        reason: 'Gumroad may require opt-in, download, purchase, or email submission',
      }
    }
    if (host === 'calendly.com' || host.endsWith('.calendly.com')) {
      return {
        normalizedUrl,
        host,
        classification: 'approval_required_external_booking',
        approvalRequired: true,
        canFollowAutomatically: false,
        reason: 'booking/external form action needs explicit approval',
      }
    }
    if (host === 'github.com' || host.endsWith('.github.com')) {
      return {
        normalizedUrl,
        host,
        classification: 'public_code_repository_candidate',
        approvalRequired: false,
        canFollowAutomatically: false,
        reason: 'public code links are candidates for a later approved resource-follow card',
      }
    }
    return {
      normalizedUrl,
      host,
      classification: 'approval_required_external_resource',
      approvalRequired: true,
      canFollowAutomatically: false,
      reason: 'external resource following is outside this one-page proof',
    }
  } catch {
    return {
      normalizedUrl,
      host: '',
      classification: 'unparseable',
      approvalRequired: true,
      canFollowAutomatically: false,
      reason: 'unparseable URL',
    }
  }
}

export function validateWebGodmodeLiveOperatorRequest(request = {}) {
  const findings = []
  const targetUrl = text(request.targetUrl)
  const operations = list(request.operations)
  const unknownOperations = operations.filter(operation => !APPROVED_OPERATIONS.has(operation))

  addFinding(findings, targetUrl === WEB_GODMODE_LIVE_OPERATOR_SOURCE_URL, 'target URL is the exact Steve-approved public video', targetUrl || 'missing')
  addFinding(findings, extractYoutubeVideoId(targetUrl) === WEB_GODMODE_LIVE_OPERATOR_VIDEO_ID, 'target URL preserves the exact YouTube video ID', extractYoutubeVideoId(targetUrl) || 'missing')
  addFinding(findings, request.accessClass === 'public_no_auth', 'access class is public/no-auth', request.accessClass || 'missing')
  addFinding(findings, request.authSessionUsed === false, 'no logged-in browser/auth session is used', String(request.authSessionUsed))
  addFinding(findings, request.externalLinkFollowAllowed === false, 'external link following is disabled', String(request.externalLinkFollowAllowed))
  addFinding(findings, request.purchaseOrFormAllowed === false, 'purchase/form actions are disabled', String(request.purchaseOrFormAllowed))
  addFinding(findings, operations.length >= 6 && unknownOperations.length === 0, 'operations are explicit and approved', unknownOperations.join(', ') || operations.join(', '))
  addFinding(findings, !/@Mark_Kashef\/videos/i.test(targetUrl), 'broad channel page is not the extraction target for this proof', targetUrl || 'missing')

  const failures = findings.filter(finding => !finding.ok)
  return { ok: failures.length === 0, findings, failures }
}

export function buildWebGodmodeLiveOperatorRequest() {
  return {
    targetUrl: WEB_GODMODE_LIVE_OPERATOR_SOURCE_URL,
    channelUrl: WEB_GODMODE_LIVE_OPERATOR_CHANNEL_URL,
    accessClass: 'public_no_auth',
    authSessionUsed: false,
    externalLinkFollowAllowed: false,
    purchaseOrFormAllowed: false,
    operations: Array.from(APPROVED_OPERATIONS),
    approvedBy: 'Steve',
    approvalSource: 'Steve supplied the public Mark Kashef YouTube channel and exact first video link in chat for this GOD-mode extractor proof.',
  }
}

async function fileDigest(filePath) {
  const buffer = await fs.readFile(filePath)
  return {
    path: filePath,
    bytes: buffer.byteLength,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
  }
}

async function captureLocatorScreenshot(page, selectors, outputPath) {
  for (const selector of selectors) {
    try {
      const locator = page.locator(selector).first()
      if (await locator.count()) {
        await locator.screenshot({ path: outputPath, timeout: 8000 })
        return { ok: true, selector }
      }
    } catch {}
  }
  return { ok: false, selector: null }
}

function normalizeResourceLinks(rawLinks = []) {
  const byUrl = new Map()
  for (const rawLink of rawLinks) {
    const normalizedUrl = normalizeDiscoveredUrl(rawLink.href || rawLink.url)
    if (!normalizedUrl) continue
    const classified = classifyDiscoveredLink(normalizedUrl)
    const previous = byUrl.get(classified.normalizedUrl) || {}
    byUrl.set(classified.normalizedUrl, {
      ...classified,
      text: normalizeWhitespace(previous.text || rawLink.text || '').slice(0, 240),
      source: previous.source || rawLink.source || 'page_anchor',
    })
  }
  return Array.from(byUrl.values())
}

export async function runWebGodmodeLiveBrowserObservation({
  targetUrl = WEB_GODMODE_LIVE_OPERATOR_SOURCE_URL,
  screenshotRoot = path.join(os.tmpdir(), 'bcrew-web-godmode-live-operator'),
  now = new Date().toISOString(),
} = {}) {
  const request = buildWebGodmodeLiveOperatorRequest()
  const requestValidation = validateWebGodmodeLiveOperatorRequest({ ...request, targetUrl })
  if (!requestValidation.ok) {
    throw new Error(`Live operator request failed preflight: ${requestValidation.failures.map(failure => failure.check).join(', ')}`)
  }

  const { chromium } = await import('playwright')
  const timestamp = now.replace(/[:.]/g, '-')
  const screenshotDir = path.join(screenshotRoot, timestamp)
  await fs.mkdir(screenshotDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  })
  const consoleErrors = []
  const pageErrors = []
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', error => {
    pageErrors.push(error instanceof Error ? error.message : String(error))
  })

  try {
    const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    await page.waitForTimeout(1200)
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('tp-yt-paper-button, button, yt-formatted-string, span'))
      const expanded = elements.find(element => {
        const textContent = String(element.textContent || '').trim().toLowerCase()
        return (element.id === 'expand' || textContent === 'more' || textContent === 'show more') &&
          element.getClientRects().length > 0
      })
      if (expanded && typeof expanded.click === 'function') expanded.click()
    }).catch(() => {})
    await page.waitForTimeout(1200)

    const data = await page.evaluate(() => {
      const normalize = value => String(value || '').trim().replace(/\s+/g, ' ')
      const textOf = selector => {
        const element = document.querySelector(selector)
        return normalize(element?.innerText || element?.textContent || '')
      }
      const selectors = [
        '#description-inline-expander',
        'ytd-watch-metadata #description',
        '#description',
        '#above-the-fold',
      ]
      const descriptionText = selectors
        .map(selector => textOf(selector))
        .sort((a, b) => b.length - a.length)[0] || ''
      const anchors = Array.from(document.querySelectorAll('a[href]')).map(anchor => ({
        text: normalize(anchor.innerText || anchor.textContent || anchor.getAttribute('aria-label') || ''),
        href: anchor.href,
        source: 'page_anchor',
      }))
      const playerResponse = window.ytInitialPlayerResponse || {}
      const captionTracks = (((playerResponse.captions || {}).playerCaptionsTracklistRenderer || {}).captionTracks || [])
        .map(track => ({
          name: normalize(track.name?.simpleText || (track.name?.runs || []).map(run => run.text).join(' ')),
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
        channelText: textOf('ytd-channel-name') || document.body.innerText.match(/Mark Kashef/)?.[0] || '',
        bodyText: document.body.innerText || '',
        descriptionText,
        anchors,
        captionTracks,
      }
    })

    const viewportScreenshotPath = path.join(screenshotDir, `mark-kashef-${WEB_GODMODE_LIVE_OPERATOR_VIDEO_ID}-viewport.png`)
    const videoScreenshotPath = path.join(screenshotDir, `mark-kashef-${WEB_GODMODE_LIVE_OPERATOR_VIDEO_ID}-video-player.png`)
    await page.screenshot({ path: viewportScreenshotPath, fullPage: false })
    const playerCapture = await captureLocatorScreenshot(page, [
      '#movie_player',
      'ytd-player',
      '#player-container',
      '#player',
    ], videoScreenshotPath)

    const screenshotArtifacts = [
      {
        kind: 'viewport_screenshot',
        ...(await fileDigest(viewportScreenshotPath)),
        storageClass: 'local_temp_not_committed',
      },
    ]
    if (playerCapture.ok) {
      screenshotArtifacts.push({
        kind: 'video_player_screenshot',
        selector: playerCapture.selector,
        ...(await fileDigest(videoScreenshotPath)),
        storageClass: 'local_temp_not_committed',
      })
    }

    const resourceLinks = normalizeResourceLinks(data.anchors)
      .filter(link => !['public_youtube_internal'].includes(link.classification) || /Mark_Kashef|watch|shorts/i.test(link.normalizedUrl))
      .slice(0, 80)

    return {
      request,
      requestValidation,
      targetUrl,
      finalUrl: page.url(),
      responseStatus: response?.status() || 0,
      responseOk: response?.ok() || false,
      observedAt: now,
      liveBrowserLaunched: true,
      networkFetched: true,
      authSessionUsed: false,
      externalLinksFollowed: false,
      purchaseOrFormSubmitted: false,
      pageTitle: data.pageTitle,
      canonicalUrl: data.canonicalUrl,
      ogTitle: data.ogTitle,
      videoTitle: normalizeWhitespace(data.videoTitle),
      channelText: normalizeWhitespace(data.channelText),
      bodyTextLength: String(data.bodyText || '').length,
      bodyTextExcerpt: normalizeWhitespace(data.bodyText).slice(0, 2500),
      descriptionText: normalizeWhitespace(data.descriptionText),
      resourceLinks,
      captionTracks: list(data.captionTracks),
      screenshotDir,
      screenshotArtifacts,
      consoleErrors: consoleErrors.slice(0, 20),
      pageErrors: pageErrors.slice(0, 20),
    }
  } finally {
    await page.close().catch(() => {})
    await browser.close().catch(() => {})
  }
}

export function buildWebGodmodeLiveInventoryItem({ discoveredAt = new Date().toISOString() } = {}) {
  return {
    itemKey: `video-link:youtube:${stableTextHash(WEB_GODMODE_LIVE_OPERATOR_SOURCE_URL).slice(0, 24)}`,
    targetKey: WEB_GODMODE_LIVE_OPERATOR_INVENTORY_TARGET_KEY,
    sourceId: WEB_GODMODE_LIVE_OPERATOR_VIDEO_SOURCE_ID,
    externalId: WEB_GODMODE_LIVE_OPERATOR_SOURCE_URL,
    itemType: 'video_link',
    status: 'succeeded',
    fingerprint: stableTextHash(WEB_GODMODE_LIVE_OPERATOR_SOURCE_URL),
    discoveredAt,
    processedAt: discoveredAt,
    metadata: {
      platform: 'youtube',
      externalVideoId: WEB_GODMODE_LIVE_OPERATOR_VIDEO_ID,
      normalizedUrl: WEB_GODMODE_LIVE_OPERATOR_SOURCE_URL,
      channelUrl: WEB_GODMODE_LIVE_OPERATOR_CHANNEL_URL,
      title: WEB_GODMODE_LIVE_OPERATOR_SOURCE_TITLE,
      channelName: WEB_GODMODE_LIVE_OPERATOR_CHANNEL,
      sourceKind: 'steve_approved_public_godmode_operator',
      valueRoute: 'godmode_build_intel_public_proof',
      ownershipClass: 'public_youtube',
      approvalCardId: WEB_GODMODE_LIVE_OPERATOR_CARD_ID,
      runtimeProofBoundary: 'one_exact_public_mark_kashef_video_only',
      broadBatchApproved: false,
      privateOrPaidContentAllowed: false,
      externalLinkFollowAllowed: false,
    },
  }
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
    excerpt: text(contentText).slice(0, 1800),
    metadata: artifact?.metadata || {},
  }
}

export function extractionRunContext(item = {}) {
  return item
    ? {
        itemKey: item.itemKey || item.item_key || null,
        targetKey: item.targetKey || item.target_key || null,
        sourceId: item.sourceId || item.source_id || null,
        externalId: item.externalId || item.external_id || null,
        status: item.status || null,
        artifactId: item.artifactId || item.artifact_id || null,
        metadata: item.metadata || {},
      }
    : null
}

export function buildWebGodmodeLiveOperatorSnapshot({
  browserObservation = null,
  transcriptArtifact = null,
  extractionRun = null,
  persistedReport = null,
} = {}) {
  const transcript = transcriptContextFromArtifact(transcriptArtifact)
  const extraction = extractionRunContext(extractionRun)
  const resourceLinks = list(browserObservation?.resourceLinks)
  const actionRequiredItems = resourceLinks
    .filter(link => link.approvalRequired)
    .map(link => ({
      type: 'resource_follow_approval_required',
      url: link.normalizedUrl,
      classification: link.classification,
      reason: link.reason,
      approvedInThisCard: false,
    }))

  const topFindings = [
    {
      finding: 'Exact public Mark Kashef YouTube video opened through a real headless browser.',
      sourceUrl: browserObservation?.finalUrl || WEB_GODMODE_LIVE_OPERATOR_SOURCE_URL,
      evidence: browserObservation?.videoTitle || browserObservation?.pageTitle || WEB_GODMODE_LIVE_OPERATOR_SOURCE_TITLE,
    },
    {
      finding: 'Description/resource links were discovered but not followed.',
      sourceUrl: WEB_GODMODE_LIVE_OPERATOR_SOURCE_URL,
      evidence: resourceLinks
        .filter(link => link.host && !link.host.includes('youtube'))
        .slice(0, 8)
        .map(link => `${link.host}:${link.classification}`),
    },
    {
      finding: 'Viewport and video-player screenshots were captured as local temp artifacts with hashes.',
      sourceUrl: WEB_GODMODE_LIVE_OPERATOR_SOURCE_URL,
      evidence: list(browserObservation?.screenshotArtifacts).map(item => ({
        kind: item.kind,
        bytes: item.bytes,
        sha256: item.sha256,
        storageClass: item.storageClass,
      })),
    },
    {
      finding: 'Caption track metadata was detected from the live YouTube player.',
      sourceUrl: WEB_GODMODE_LIVE_OPERATOR_SOURCE_URL,
      evidence: list(browserObservation?.captionTracks).map(track => ({
        languageCode: track.languageCode,
        kind: track.kind || 'manual_or_unspecified',
        baseUrlPresent: track.baseUrlPresent,
      })),
    },
    {
      finding: 'Transcript artifact was captured through the governed exact YouTube extraction target.',
      sourceUrl: WEB_GODMODE_LIVE_OPERATOR_SOURCE_URL,
      evidence: {
        artifactId: transcript.artifactId,
        contentLength: transcript.contentLength,
        extractionStatus: extraction?.status || 'missing',
      },
    },
  ]

  const snapshot = {
    cardId: WEB_GODMODE_LIVE_OPERATOR_CARD_ID,
    closeoutKey: WEB_GODMODE_LIVE_OPERATOR_CLOSEOUT_KEY,
    source: {
      sourceId: WEB_GODMODE_LIVE_OPERATOR_SOURCE_ID,
      videoSourceId: WEB_GODMODE_LIVE_OPERATOR_VIDEO_SOURCE_ID,
      artifactId: WEB_GODMODE_LIVE_OPERATOR_SOURCE_ARTIFACT_ID,
      reportArtifactId: WEB_GODMODE_LIVE_OPERATOR_REPORT_ARTIFACT_ID,
      videoId: WEB_GODMODE_LIVE_OPERATOR_VIDEO_ID,
      title: WEB_GODMODE_LIVE_OPERATOR_SOURCE_TITLE,
      channel: WEB_GODMODE_LIVE_OPERATOR_CHANNEL,
      sourceUrl: WEB_GODMODE_LIVE_OPERATOR_SOURCE_URL,
      channelUrl: WEB_GODMODE_LIVE_OPERATOR_CHANNEL_URL,
    },
    browserObservation,
    transcript,
    extraction,
    resourceLinks,
    topFindings,
    actionRequiredItems,
    openQuestions: [
      'Run the Mark Kashef last-20 public YouTube batch only after this one-video proof and raw gates are green.',
      'Ask Steve before following Skool, Gumroad, Calendly, purchase, opt-in, or community/course links.',
      'Add provider/vision interpretation only after the browser artifact/provenance path is proven.',
    ],
    persistedReport,
    notNext: WEB_GODMODE_LIVE_OPERATOR_NOT_NEXT,
  }
  const validation = validateWebGodmodeLiveOperatorSnapshot(snapshot)
  return {
    ...snapshot,
    ok: validation.ok,
    status: validation.ok ? 'healthy' : 'blocked',
    findings: validation.findings,
    failures: validation.failures,
  }
}

export function validateWebGodmodeLiveOperatorSnapshot(snapshot = {}) {
  const findings = []
  const observation = snapshot.browserObservation || {}
  const transcript = snapshot.transcript || {}
  const extraction = snapshot.extraction || {}
  const links = list(snapshot.resourceLinks)
  const screenshotArtifacts = list(observation.screenshotArtifacts)
  const videoScreenshot = screenshotArtifacts.find(item => item.kind === 'video_player_screenshot')
  const viewportScreenshot = screenshotArtifacts.find(item => item.kind === 'viewport_screenshot')
  const hosts = new Set(links.map(link => link.host))

  addFinding(findings, observation.requestValidation?.ok === true, 'browser request preflight passed', observation.requestValidation?.failures?.map(failure => failure.check).join(', ') || 'ok')
  addFinding(findings, observation.liveBrowserLaunched === true && observation.networkFetched === true, 'real browser launched and fetched the live page', `${observation.liveBrowserLaunched}/${observation.networkFetched}`)
  addFinding(findings, observation.responseStatus >= 200 && observation.responseStatus < 400, 'YouTube page returned a successful response', String(observation.responseStatus || 'missing'))
  addFinding(findings, extractYoutubeVideoId(observation.finalUrl || observation.targetUrl) === WEB_GODMODE_LIVE_OPERATOR_VIDEO_ID, 'final browser URL preserves exact video ID', observation.finalUrl || 'missing')
  const titleEvidence = [
    observation.videoTitle,
    observation.pageTitle,
    observation.ogTitle,
    observation.bodyTextExcerpt,
    observation.descriptionText,
  ].join(' ')
  addFinding(findings, /Self-Improving OS|Agentic OS|\bgoal\b|Mark Kashef/i.test(titleEvidence), 'target video/source identity was read from the page', observation.videoTitle || observation.pageTitle || observation.ogTitle || 'body/description evidence')
  addFinding(findings, /Mark Kashef/i.test(`${observation.channelText} ${observation.bodyTextExcerpt}`), 'channel/person evidence was read from the page', observation.channelText || 'missing')
  addFinding(findings, Number(observation.bodyTextLength || 0) >= 500, 'page body text was captured', `${observation.bodyTextLength || 0} chars`)
  addFinding(findings, text(observation.descriptionText).length >= 100, 'description text was expanded/read', `${text(observation.descriptionText).length} chars`)
  addFinding(findings, links.length >= 2, 'description/page links were discovered', `${links.length} links`)
  addFinding(findings, hosts.has('skool.com') || hosts.has('markkashef.gumroad.com') || hosts.has('gumroad.com'), 'resource/download/community links were classified', Array.from(hosts).join(', ') || 'missing')
  addFinding(findings, links.every(link => link.canFollowAutomatically === false), 'external links were not followed by this proof', 'observed only')
  addFinding(findings, list(observation.captionTracks).length >= 1, 'caption track metadata was detected', `${list(observation.captionTracks).length} tracks`)
  addFinding(findings, viewportScreenshot?.bytes > 1000 && /^[0-9a-f]{64}$/i.test(viewportScreenshot?.sha256 || ''), 'viewport screenshot artifact hash exists', viewportScreenshot ? `${viewportScreenshot.bytes}/${viewportScreenshot.sha256}` : 'missing')
  addFinding(findings, videoScreenshot?.bytes > 1000 && /^[0-9a-f]{64}$/i.test(videoScreenshot?.sha256 || ''), 'video-player screenshot artifact hash exists', videoScreenshot ? `${videoScreenshot.bytes}/${videoScreenshot.sha256}` : 'missing')
  addFinding(findings, observation.authSessionUsed === false && observation.externalLinksFollowed === false && observation.purchaseOrFormSubmitted === false, 'no auth, external follow, purchase, or form side effect occurred', `${observation.authSessionUsed}/${observation.externalLinksFollowed}/${observation.purchaseOrFormSubmitted}`)
  addFinding(findings, transcript.artifactId === WEB_GODMODE_LIVE_OPERATOR_SOURCE_ARTIFACT_ID, 'exact transcript artifact exists', transcript.artifactId || 'missing')
  addFinding(findings, transcript.sourceId === WEB_GODMODE_LIVE_OPERATOR_SOURCE_ID, 'transcript source ID is the YouTube intel source', transcript.sourceId || 'missing')
  addFinding(findings, transcript.sourceUrl === WEB_GODMODE_LIVE_OPERATOR_SOURCE_URL, 'transcript preserves exact source URL', transcript.sourceUrl || 'missing')
  addFinding(findings, Number(transcript.contentLength || 0) >= 1000, 'transcript text was captured', `${transcript.contentLength || 0} chars`)
  addFinding(findings, extraction?.externalId === WEB_GODMODE_LIVE_OPERATOR_SOURCE_URL && extraction?.status === 'succeeded', 'extraction run is exact and succeeded', extraction ? `${extraction.status}/${extraction.externalId}` : 'missing')
  addFinding(findings, extraction?.artifactId === WEB_GODMODE_LIVE_OPERATOR_SOURCE_ARTIFACT_ID, 'extraction run points to exact transcript artifact', extraction?.artifactId || 'missing')

  const failures = findings.filter(finding => !finding.ok)
  return { ok: failures.length === 0, findings, failures }
}

export function buildWebGodmodeLiveOperatorReportArtifact(snapshot = {}) {
  return {
    reportArtifactId: WEB_GODMODE_LIVE_OPERATOR_REPORT_ARTIFACT_ID,
    reportType: 'proof',
    status: 'reviewed',
    scopeKey: WEB_GODMODE_LIVE_OPERATOR_CARD_ID,
    department: 'Foundation Extraction',
    title: `WEB GODMODE live operator proof - ${WEB_GODMODE_LIVE_OPERATOR_CHANNEL}`,
    sourceIds: [
      WEB_GODMODE_LIVE_OPERATOR_SOURCE_ID,
      WEB_GODMODE_LIVE_OPERATOR_VIDEO_SOURCE_ID,
    ],
    inputArtifactIds: snapshot.transcript?.artifactId ? [snapshot.transcript.artifactId] : [],
    sourceCoverage: [
      {
        sourceId: WEB_GODMODE_LIVE_OPERATOR_SOURCE_ID,
        artifactId: WEB_GODMODE_LIVE_OPERATOR_SOURCE_ARTIFACT_ID,
        sourceUrl: WEB_GODMODE_LIVE_OPERATOR_SOURCE_URL,
        coverage: 'browser_page_description_links_screenshot_caption_track_and_transcript',
      },
    ],
    topFindings: snapshot.topFindings || [],
    actionRequiredItems: snapshot.actionRequiredItems || [],
    openQuestions: snapshot.openQuestions || [],
    structuredOutputJson: {
      source: snapshot.source,
      browserObservation: {
        ...snapshot.browserObservation,
        bodyTextExcerpt: snapshot.browserObservation?.bodyTextExcerpt,
      },
      transcript: snapshot.transcript,
      extraction: snapshot.extraction,
      resourceLinks: snapshot.resourceLinks,
      screenshotArtifacts: snapshot.browserObservation?.screenshotArtifacts || [],
      notNext: WEB_GODMODE_LIVE_OPERATOR_NOT_NEXT,
    },
    metadata: {
      cardId: WEB_GODMODE_LIVE_OPERATOR_CARD_ID,
      closeoutKey: WEB_GODMODE_LIVE_OPERATOR_CLOSEOUT_KEY,
      sourceUrl: WEB_GODMODE_LIVE_OPERATOR_SOURCE_URL,
      channelUrl: WEB_GODMODE_LIVE_OPERATOR_CHANNEL_URL,
      videoId: WEB_GODMODE_LIVE_OPERATOR_VIDEO_ID,
      exactPublicNoAuthProof: true,
      screenshotsStoredAsLocalTempHashes: true,
      externalLinksFollowed: false,
      privateOrPaidAccess: false,
      broadBatchApproved: false,
      nextCardId: WEB_GODMODE_LIVE_OPERATOR_NEXT_CARD_ID,
    },
  }
}

export function verifyWebGodmodeLiveOperatorPersistedReport({ snapshot = {}, report = null } = {}) {
  const findings = []
  addFinding(findings, report?.reportArtifactId === WEB_GODMODE_LIVE_OPERATOR_REPORT_ARTIFACT_ID || report?.report_artifact_id === WEB_GODMODE_LIVE_OPERATOR_REPORT_ARTIFACT_ID, 'proof report artifact persisted', report?.reportArtifactId || report?.report_artifact_id || 'missing')
  addFinding(findings, list(report?.sourceIds || report?.source_ids).includes(WEB_GODMODE_LIVE_OPERATOR_SOURCE_ID), 'proof report links YouTube intel source ID', list(report?.sourceIds || report?.source_ids).join(', ') || 'missing')
  addFinding(findings, list(report?.inputArtifactIds || report?.input_artifact_ids).includes(WEB_GODMODE_LIVE_OPERATOR_SOURCE_ARTIFACT_ID), 'proof report links exact transcript artifact', list(report?.inputArtifactIds || report?.input_artifact_ids).join(', ') || 'missing')
  const structured = report?.structuredOutputJson || report?.structured_output_json || {}
  addFinding(findings, list(structured?.screenshotArtifacts).some(item => item.kind === 'video_player_screenshot'), 'proof report stores video-player screenshot metadata', JSON.stringify(list(structured?.screenshotArtifacts).map(item => item.kind)))
  addFinding(findings, list(structured?.resourceLinks).some(item => /gumroad|skool/i.test(item.host || item.normalizedUrl || '')), 'proof report stores resource link classifications', JSON.stringify(list(structured?.resourceLinks).map(item => item.host).slice(0, 10)))
  addFinding(findings, snapshot.ok === true, 'snapshot was healthy when persisted', snapshot.status || 'missing')
  const failures = findings.filter(finding => !finding.ok)
  return { ok: failures.length === 0, findings, failures }
}

export function buildWebGodmodeLiveOperatorDogfoodProof() {
  const cases = []
  const privateSkool = validateWebGodmodeLiveOperatorRequest({
    ...buildWebGodmodeLiveOperatorRequest(),
    targetUrl: 'https://www.skool.com/earlyaidopters/classroom',
    accessClass: 'private_auth_required',
    authSessionUsed: true,
  })
  cases.push({
    name: 'private_skool_rejected',
    ok: !privateSkool.ok,
    failures: privateSkool.failures.map(failure => failure.check),
  })

  const broadChannel = validateWebGodmodeLiveOperatorRequest({
    ...buildWebGodmodeLiveOperatorRequest(),
    targetUrl: WEB_GODMODE_LIVE_OPERATOR_CHANNEL_URL,
  })
  cases.push({
    name: 'broad_channel_rejected',
    ok: !broadChannel.ok,
    failures: broadChannel.failures.map(failure => failure.check),
  })

  const externalFollow = validateWebGodmodeLiveOperatorRequest({
    ...buildWebGodmodeLiveOperatorRequest(),
    externalLinkFollowAllowed: true,
    purchaseOrFormAllowed: true,
  })
  cases.push({
    name: 'external_follow_and_purchase_rejected',
    ok: !externalFollow.ok,
    failures: externalFollow.failures.map(failure => failure.check),
  })

  const weakSnapshot = buildWebGodmodeLiveOperatorSnapshot({
    browserObservation: {
      ...buildWebGodmodeLiveOperatorRequest(),
      requestValidation: { ok: true, failures: [] },
      liveBrowserLaunched: true,
      networkFetched: true,
      responseStatus: 200,
      finalUrl: WEB_GODMODE_LIVE_OPERATOR_SOURCE_URL,
      videoTitle: WEB_GODMODE_LIVE_OPERATOR_SOURCE_TITLE,
      channelText: WEB_GODMODE_LIVE_OPERATOR_CHANNEL,
      bodyTextLength: 700,
      descriptionText: 'short missing resources',
      resourceLinks: [],
      captionTracks: [],
      screenshotArtifacts: [],
      authSessionUsed: false,
      externalLinksFollowed: false,
      purchaseOrFormSubmitted: false,
    },
    transcriptArtifact: null,
    extractionRun: null,
  })
  cases.push({
    name: 'missing_screenshots_caption_links_and_transcript_rejected',
    ok: !weakSnapshot.ok,
    failures: weakSnapshot.failures.map(failure => failure.check),
  })

  return {
    ok: cases.every(item => item.ok),
    cases,
  }
}

export function renderWebGodmodeLiveOperatorCloseout(snapshot = {}) {
  const links = list(snapshot.resourceLinks)
    .filter(link => !/youtube/i.test(link.host || ''))
    .slice(0, 12)
    .map(link => `- ${link.host}: ${link.classification} - ${link.normalizedUrl}`)
  const screenshots = list(snapshot.browserObservation?.screenshotArtifacts)
    .map(item => `- ${item.kind}: ${item.path} (${item.bytes} bytes, sha256 ${String(item.sha256 || '').slice(0, 16)}...)`)

  return [
    '# WEB-GODMODE-LIVE-OPERATOR-002 Closeout',
    '',
    `Closeout key: \`${WEB_GODMODE_LIVE_OPERATOR_CLOSEOUT_KEY}\``,
    `Card: \`${WEB_GODMODE_LIVE_OPERATOR_CARD_ID}\``,
    `Source: ${WEB_GODMODE_LIVE_OPERATOR_SOURCE_URL}`,
    `Report artifact: \`${WEB_GODMODE_LIVE_OPERATOR_REPORT_ARTIFACT_ID}\``,
    `Transcript artifact: \`${WEB_GODMODE_LIVE_OPERATOR_SOURCE_ARTIFACT_ID}\``,
    '',
    '## What Shipped',
    '',
    '- A real Playwright browser opens the exact public Mark Kashef YouTube video with no auth session.',
    '- The proof reads page/body/description text, discovers and classifies outbound resource links, and detects YouTube caption tracks.',
    '- The proof captures viewport and video-player screenshots as local temp artifacts, records byte counts and SHA-256 hashes, and does not commit screenshot bytes.',
    '- The proof seeds/runs the existing exact YouTube transcript extraction target for this URL only and stores the governed transcript artifact.',
    '- A reviewed intelligence proof report stores browser observation, transcript, screenshot metadata, resource link classifications, and approval-required next actions.',
    '',
    '## Resource Links Observed',
    '',
    ...(links.length ? links : ['- None recorded.']),
    '',
    '## Screenshot Artifacts',
    '',
    ...(screenshots.length ? screenshots : ['- None recorded.']),
    '',
    '## Not Next',
    '',
    ...WEB_GODMODE_LIVE_OPERATOR_NOT_NEXT.map(item => `- ${item}`),
    '',
    '## Proof Commands',
    '',
    ...WEB_GODMODE_LIVE_OPERATOR_COMMANDS.map(command => `- \`${command}\``),
    '',
    '## Next',
    '',
    `Continue \`${WEB_GODMODE_LIVE_OPERATOR_NEXT_CARD_ID}\`: use this one-video operator proof to build the bounded Mark Kashef latest/last-20 public YouTube scout. Keep Skool/Gumroad/Calendly following approval-bound.`,
    '',
  ].join('\n')
}
