import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import {
  GEMINI_VIDEO_PRIMARY_MODEL,
  findGeminiApiCredential,
} from './gemini-video-brain-route.js'
import { callGeminiApi } from './llm-router.js'

export const SKOOL_FREE_PUBLIC_READ_CARD_ID = 'SKOOL-FREE-COMMUNITY-PUBLIC-READ-PROOF-001'
export const SKOOL_FREE_PUBLIC_READ_TARGET_KEY = 'kia-ai-automations-skool-community-public-check'
export const SKOOL_FREE_PUBLIC_READ_DEFAULT_URL = 'https://www.skool.com/ai-automations-by-kia'
export const SKOOL_FREE_PUBLIC_READ_POST_URL = 'https://www.skool.com/ai-automations-by-kia/big-update-for-the-ai-agent-space?p=64e92338'
export const SKOOL_FREE_PUBLIC_READ_SCRIPT_PATH = 'scripts/run-skool-free-public-read-check.mjs'
export const SKOOL_FREE_PUBLIC_READ_ROOT = '.openclaw/skool-free-public-read'
export const SKOOL_FREE_COMMUNITY_LOOKBACK_DAYS = 20

const RISKY_LINK_PATTERN = /(?:^|[/?#&=._-])(login|signin|sign-in|signup|sign-up|join|checkout|payment|billing|subscription|purchase|buy|cart|logout|settings|profile|account|member|members|invite|create|compose|new-post|comment|dm|message|download)(?:[/?#&=._-]|$)/i
const FREE_SKOOL_ALLOWED_NAV_PATTERN = /(?:\/about|\/community|\/classroom|\/courses?|\/resources?|\/[a-z0-9-]+(?:\?p=[a-z0-9-]+)?$)/i
const BROWSER_SHELL_BLOCKER_PATTERN = /restore pages|chrome didn't shut down correctly|session restore|restore previous session|set up your browser|make .* default browser/i
const SOURCE_BROWSER_LAUNCH_ARGS = [
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-session-crashed-bubble',
  '--disable-restore-session-state',
  '--disable-features=Translate,ChromeWhatsNewUI',
]

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function slug(value = '') {
  return text(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'source'
}

function stableHash(value = '') {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex')
}

function nowStamp(date = new Date()) {
  return date.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
}

function parseUrl(value = '') {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

function normalizeUrl(value = '', base = '') {
  try {
    const url = new URL(value, base || undefined)
    url.hash = ''
    return url.toString()
  } catch {
    return text(value)
  }
}

function hostOf(value = '') {
  return parseUrl(value)?.hostname.toLowerCase() || ''
}

function pathOf(value = '') {
  return parseUrl(value)?.pathname || ''
}

function isAllowedSkoolUrl(value = '') {
  const url = parseUrl(value)
  if (!url) return false
  const host = url.hostname.toLowerCase()
  return host === 'skool.com' || host === 'www.skool.com'
}

function communityPrefix(value = '') {
  const pathname = pathOf(value)
  const firstSegment = pathname.split('/').filter(Boolean)[0] || ''
  return firstSegment ? `/${firstSegment}` : ''
}

function isSameCommunityUrl(value = '', sourceUrl = SKOOL_FREE_PUBLIC_READ_DEFAULT_URL) {
  const url = parseUrl(value)
  if (!url || !isAllowedSkoolUrl(value)) return false
  const prefix = communityPrefix(sourceUrl)
  return Boolean(prefix && url.pathname.startsWith(prefix))
}

function compactWhitespace(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

async function ensureDir(dirPath = '') {
  await fs.mkdir(dirPath, { recursive: true })
}

async function writeJson(filePath = '', value = {}) {
  await ensureDir(path.dirname(filePath))
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function writeText(filePath = '', value = '') {
  await ensureDir(path.dirname(filePath))
  await fs.writeFile(filePath, value, 'utf8')
}

function classifyLink(link = {}, sourceUrl = '') {
  const normalizedUrl = normalizeUrl(link.href || link.url || '', sourceUrl)
  const host = hostOf(normalizedUrl)
  const sameCommunity = isSameCommunityUrl(normalizedUrl, sourceUrl)
  let classification = 'safe_reference_only'
  if (!normalizedUrl || !host) classification = 'invalid'
  else if (!isAllowedSkoolUrl(normalizedUrl)) classification = 'external_reference_only'
  else if (RISKY_LINK_PATTERN.test(normalizedUrl)) classification = 'blocked_auth_or_write_surface'
  else if (sameCommunity) classification = 'same_public_community_reference_only'
  else classification = 'other_skool_reference_only'
  return {
    text: compactWhitespace(link.text || '').slice(0, 220),
    normalizedUrl,
    host,
    classification,
    shouldInspect: classification === 'same_public_community_reference_only' && FREE_SKOOL_ALLOWED_NAV_PATTERN.test(parseUrl(normalizedUrl)?.pathname || ''),
    clicked: false,
  }
}

function detectBrowserShellBlockers(snapshot = {}) {
  const surface = `${snapshot.title || ''} ${snapshot.bodyTextPreview || ''}`
  return {
    blocked: BROWSER_SHELL_BLOCKER_PATTERN.test(surface),
    reason: BROWSER_SHELL_BLOCKER_PATTERN.test(surface) ? 'browser_shell_restore_or_setup_surface_visible' : '',
  }
}

function classifyAuthState(snapshot = {}) {
  const surface = `${snapshot.url || ''} ${snapshot.title || ''} ${snapshot.bodyTextPreview || ''}`.toLowerCase()
  const hasCredentialInputs = snapshot.hasEmailInput || snapshot.hasPasswordInput
  const explicitAuthWall = /\/login|\/signin|\/sign-in|\/signup|\/sign-up|accounts\.google\.com/.test(surface) ||
    /log in to continue|sign in to continue|members only|private community|private group|you need to log in|join to view|request to join/i.test(surface)
  if (hasCredentialInputs || explicitAuthWall) {
    return {
      status: 'auth_required_or_private_wall',
      publicReadable: false,
      reason: hasCredentialInputs ? 'credential_input_visible' : 'explicit_auth_wall_text_or_url',
    }
  }
  if (snapshot.textChars > 500 || list(snapshot.headings).length > 0) {
    return {
      status: 'public_read_visible',
      publicReadable: true,
      reason: 'public_page_text_visible_without_login_inputs',
    }
  }
  return {
    status: 'unknown_or_empty',
    publicReadable: false,
    reason: 'page_loaded_but_public_content_not_proven',
  }
}

function pageReportFromSnapshot(snapshot = {}, {
  depth = 0,
  from = '',
  navigationMethod = 'goto',
  handsEventId = '',
} = {}) {
  return {
    url: snapshot.url,
    title: snapshot.title,
    depth,
    from,
    navigationMethod,
    handsEventId,
    textChars: snapshot.textChars,
    bodyTextPreview: snapshot.bodyTextPreview,
    headings: snapshot.headings,
    buttons: snapshot.buttons,
    forms: snapshot.forms,
    authState: snapshot.authState,
    browserShellBlocker: snapshot.browserShellBlocker,
    linkClassifications: snapshot.linkClassifications,
    artifacts: {
      screenshotPath: snapshot.screenshotPath,
      screenshotHash: snapshot.screenshotHash,
      textPath: snapshot.textPath,
      textHash: snapshot.textHash,
    },
  }
}

function firstInspectableLink(snapshot = {}) {
  return list(snapshot.linkClassifications)
    .find(link => link.shouldInspect && !RISKY_LINK_PATTERN.test(link.normalizedUrl || '')) || null
}

async function clickInspectableLink(page, link = {}, {
  timeoutMs = 20000,
  eventId = '',
} = {}) {
  const beforeUrl = normalizeUrl(page.url())
  const targetUrl = normalizeUrl(link.normalizedUrl)
  const hrefIndex = await page.locator('a[href]').evaluateAll((anchors, expectedHref) => {
    return anchors.findIndex(anchor => {
      try {
        const url = new URL(anchor.href, location.href)
        url.hash = ''
        return url.toString() === expectedHref
      } catch {
        return false
      }
    })
  }, targetUrl).catch(() => -1)
  if (hrefIndex < 0) {
    return {
      eventId,
      ok: false,
      method: 'locator_click',
      beforeUrl,
      targetUrl,
      afterUrl: beforeUrl,
      reason: 'anchor_not_found_after_snapshot',
    }
  }

  const locator = page.locator('a[href]').nth(hrefIndex)
  await locator.scrollIntoViewIfNeeded({ timeout: timeoutMs }).catch(() => {})
  const popupPromise = page.context().waitForEvent('page', { timeout: 1500 }).catch(() => null)
  const clickPromise = locator.click({
    timeout: timeoutMs,
    button: 'left',
    modifiers: [],
    noWaitAfter: false,
  })
  await clickPromise
  const popup = await popupPromise
  if (popup) {
    await popup.close().catch(() => {})
  }
  await page.waitForLoadState('domcontentloaded', { timeout: timeoutMs }).catch(() => {})
  await page.waitForTimeout(1200).catch(() => {})
  const afterUrl = normalizeUrl(page.url())
  return {
    eventId,
    ok: afterUrl !== beforeUrl || afterUrl === targetUrl,
    method: 'locator_click',
    beforeUrl,
    targetUrl,
    afterUrl,
    linkText: text(link.text).slice(0, 160),
    openedPopupClosed: Boolean(popup),
    reason: afterUrl === beforeUrl ? 'click_did_not_change_url' : 'clicked_and_navigated',
  }
}

function extractGeminiText(json = {}) {
  return list(json.candidates)
    .flatMap(candidate => list(candidate?.content?.parts))
    .map(part => part?.text || '')
    .join('\n')
    .trim()
}

function parseJsonObject(value = '') {
  const raw = text(value)
  if (!raw) return null
  const stripped = raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  try {
    return JSON.parse(stripped)
  } catch {
    const match = stripped.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      return JSON.parse(match[0])
    } catch {
      return null
    }
  }
}

async function runGeminiScreenshotEyes({
  screenshotPath = '',
  snapshot = {},
  model = GEMINI_VIDEO_PRIMARY_MODEL,
  timeoutMs = 90000,
  fetcher = globalThis.fetch,
} = {}) {
  const credential = findGeminiApiCredential()
  if (!credential.available) {
    return {
      ok: false,
      status: 'skipped_no_gemini_api_key',
      model,
      rawSecretPrinted: false,
    }
  }
  const image = await fs.readFile(screenshotPath)
  const prompt = [
    'You are the visual eyes layer for a free Skool community source-browser-agent run.',
    'Classify only what is visible. Do not invent hidden content.',
    'Return strict JSON with keys: pageState, visibleCommunityName, authWallVisible, signupOrJoinVisible, publicContentVisible, safeNextAction, evidenceNotes.',
    'Allowed next actions are: inspect_public_same_community_links, stop_auth_required, stop_private_or_member_wall, stop_empty_or_unclear.',
    'The system may read public same-community pages. It is forbidden to join, log in, submit forms, post/comment/message, download, buy, or mutate account/profile state.',
    '',
    `URL: ${snapshot.url || ''}`,
    `Title: ${snapshot.title || ''}`,
    `DOM status: ${snapshot.authState?.status || ''}`,
    `DOM text preview: ${(snapshot.bodyTextPreview || '').slice(0, 1200)}`,
  ].join('\n')
  const result = await callGeminiApi({
    method: 'POST',
    path: `models/${String(model || GEMINI_VIDEO_PRIMARY_MODEL).replace(/^models\//, '')}:generateContent`,
    apiKey: credential.key,
    fetcher,
    timeoutMs,
    body: {
      contents: [{
        role: 'user',
        parts: [
          {
            inline_data: {
              mime_type: 'image/png',
              data: image.toString('base64'),
            },
          },
          { text: prompt },
        ],
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1200,
        responseMimeType: 'application/json',
      },
    },
  })
  const outputText = extractGeminiText(result.json || {})
  const parsed = parseJsonObject(outputText)
  return {
    ok: Boolean(parsed),
    status: parsed ? 'vision_classified' : 'vision_unparseable',
    model,
    parsed,
    outputText: parsed ? '' : outputText.slice(0, 1200),
    usageMetadata: result.json?.usageMetadata || {},
    rawSecretPrinted: false,
  }
}

async function captureSnapshot(page, { sourceUrl = '', artifactDir = '', pageIndex = 1 } = {}) {
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(1800).catch(() => {})
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let steps = 0
      const timer = setInterval(() => {
        window.scrollBy(0, Math.max(350, Math.floor(window.innerHeight * 0.65)))
        steps += 1
        if (steps >= 5 || window.scrollY + window.innerHeight >= document.body.scrollHeight) {
          clearInterval(timer)
          resolve()
        }
      }, 220)
    })
    window.scrollTo(0, 0)
  }).catch(() => {})
  const snapshot = await page.evaluate(() => {
    const clean = value => String(value || '').replace(/\s+/g, ' ').trim()
    const attr = (element, name) => element.getAttribute(name) || ''
    const bodyText = clean(document.body?.innerText || document.body?.textContent || '')
    return {
      url: location.href,
      title: document.title || '',
      bodyText,
      textChars: bodyText.length,
      bodyTextPreview: bodyText.slice(0, 2000),
      headings: [...document.querySelectorAll('h1,h2,h3')].map(heading => ({
        level: Number(heading.tagName.slice(1)),
        text: clean(heading.innerText || heading.textContent).slice(0, 220),
      })).filter(row => row.text).slice(0, 80),
      anchors: [...document.querySelectorAll('a[href]')].map(anchor => ({
        href: anchor.href || attr(anchor, 'href'),
        text: clean(anchor.innerText || anchor.textContent).slice(0, 220),
      })).slice(0, 160),
      buttons: [...document.querySelectorAll('button,[role="button"],input[type="submit"],input[type="button"]')].map(button => ({
        text: clean(button.innerText || button.value || button.textContent || attr(button, 'aria-label')).slice(0, 160),
        type: attr(button, 'type'),
        role: attr(button, 'role'),
      })).filter(row => row.text).slice(0, 80),
      forms: [...document.querySelectorAll('form')].map(form => ({
        action: form.action || attr(form, 'action'),
        method: attr(form, 'method') || 'get',
        inputCount: form.querySelectorAll('input,textarea,select,button').length,
        text: clean(form.innerText || form.textContent).slice(0, 220),
      })).slice(0, 20),
      hasEmailInput: document.querySelectorAll('input[type="email"], input[name*="email" i], input[autocomplete="username"]').length > 0,
      hasPasswordInput: document.querySelectorAll('input[type="password"], input[autocomplete="current-password"]').length > 0,
    }
  })
  const authState = classifyAuthState(snapshot)
  const browserShellBlocker = detectBrowserShellBlockers(snapshot)
  const pageKey = `page-${String(pageIndex).padStart(2, '0')}-${slug(snapshot.title || pathOf(snapshot.url) || 'page')}`
  const screenshotPath = path.join(artifactDir, `${pageKey}.png`)
  const screenshot = await page.screenshot({ path: screenshotPath, type: 'png', fullPage: false }).catch(() => null)
  const textPath = path.join(artifactDir, `${pageKey}.txt`)
  await writeText(textPath, snapshot.bodyText.slice(0, 30000))
  const linkClassifications = list(snapshot.anchors).map(link => classifyLink(link, snapshot.url))
  return {
    ...snapshot,
    authState,
    browserShellBlocker,
    linkClassifications,
    screenshotPath: screenshot ? screenshotPath : '',
    screenshotHash: screenshot ? stableHash(screenshot) : '',
    textPath,
    textHash: stableHash(snapshot.bodyText),
  }
}

export async function runSkoolFreePublicReadCheck({
  url = SKOOL_FREE_PUBLIC_READ_DEFAULT_URL,
  rootDir = SKOOL_FREE_PUBLIC_READ_ROOT,
  liveGemini = false,
  headed = false,
  model = GEMINI_VIDEO_PRIMARY_MODEL,
  maxPages = 20,
  maxDepth = 2,
  maxClicks = 3,
  lookbackDays = SKOOL_FREE_COMMUNITY_LOOKBACK_DAYS,
  now = new Date().toISOString(),
  fetcher = globalThis.fetch,
} = {}) {
  const targetUrl = normalizeUrl(url)
  if (!isAllowedSkoolUrl(targetUrl)) {
    throw new Error(`Refusing non-Skool URL for free Skool public read check: ${targetUrl}`)
  }
  const sourceSlug = slug(hostOf(targetUrl) + '-' + parseUrl(targetUrl).pathname)
  const runId = `skool-free-public-read-${nowStamp(new Date(now))}-${stableHash(targetUrl).slice(0, 8)}`
  const runDir = path.resolve(rootDir, 'runs', runId)
  const artifactDir = path.join(runDir, 'artifacts')
  await ensureDir(artifactDir)

  const { chromium } = await import('playwright')
  const browser = await chromium.launch({
    headless: !headed,
    args: SOURCE_BROWSER_LAUNCH_ARGS,
  })
  const context = await browser.newContext({
    acceptDownloads: false,
    viewport: { width: 1440, height: 1000 },
    storageState: { cookies: [], origins: [] },
    ignoreHTTPSErrors: false,
  })
  const sideEffects = {
    systemRunner: true,
    manualClicks: false,
    liveBrowserLaunched: true,
    cleanBrowserContext: true,
    browserProfileMode: 'ephemeral_isolated_clean_context',
    restoreSessionBlockedByDesign: true,
    normalChromeProfileUsed: false,
    networkFetched: false,
    clicked: false,
    navigatedBeyondExactUrl: false,
    submittedForm: false,
    downloadedFile: false,
    joinedCommunity: false,
    loggedIn: false,
    postedOrMessaged: false,
    externalWrites: false,
    mutatedCredentials: false,
    mutatedBrowserProfile: false,
  }
  const handsEvents = []
  context.on('page', openedPage => {
    openedPage.on('download', download => download.cancel().catch(() => {}))
  })
  await context.route('**/*', route => {
    const request = route.request()
    const requestUrl = request.url()
    if (request.resourceType() === 'document' && requestUrl !== targetUrl && RISKY_LINK_PATTERN.test(requestUrl)) {
      return route.abort('blockedbyclient').catch(() => {})
    }
    return route.continue().catch(() => {})
  })

  const page = await context.newPage()
  page.on('download', download => download.cancel().catch(() => {}))
  const consoleErrors = []
  const pageErrors = []
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 500))
  })
  page.on('pageerror', error => {
    pageErrors.push(error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500))
  })

  let responseStatus = null
  try {
    const queue = [
      { url: targetUrl, depth: 0, from: 'start' },
      ...(targetUrl === SKOOL_FREE_PUBLIC_READ_POST_URL ? [] : [{ url: SKOOL_FREE_PUBLIC_READ_POST_URL, depth: 0, from: 'known_build_intel_post' }]),
    ]
    const visited = new Set()
    const pages = []
    const stopped = []
    const allVision = []
    const enqueueInspectableLinks = (snapshot = {}, depth = 1, from = '') => {
      for (const link of snapshot.linkClassifications || []) {
        if (!link.shouldInspect) continue
        const normalized = normalizeUrl(link.normalizedUrl)
        if (visited.has(normalized)) continue
        if (queue.some(row => normalizeUrl(row.url) === normalized)) continue
        queue.push({ url: normalized, depth, from })
      }
    }
    const classifyVision = async snapshot => {
      if (!liveGemini || !snapshot.screenshotPath) {
        return {
          ok: false,
          status: liveGemini ? 'skipped_no_screenshot' : 'skipped_not_requested',
          model,
          rawSecretPrinted: false,
        }
      }
      return runGeminiScreenshotEyes({ screenshotPath: snapshot.screenshotPath, snapshot, model, fetcher }).catch(error => ({
        ok: false,
        status: 'vision_failed',
        model,
        error: error instanceof Error ? error.message.slice(0, 900) : String(error).slice(0, 900),
        rawSecretPrinted: false,
      }))
    }
    while (queue.length && pages.length < Number(maxPages || 20)) {
      const next = queue.shift()
      const nextUrl = normalizeUrl(next.url)
      if (visited.has(nextUrl)) continue
      visited.add(nextUrl)
      if (!isSameCommunityUrl(nextUrl, targetUrl)) {
        stopped.push({ url: nextUrl, from: next.from, reason: 'outside_same_community_boundary' })
        continue
      }
      if (RISKY_LINK_PATTERN.test(nextUrl)) {
        stopped.push({ url: nextUrl, from: next.from, reason: 'blocked_auth_or_write_url' })
        continue
      }
      const response = await page.goto(nextUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(error => {
        stopped.push({ url: nextUrl, from: next.from, reason: `navigation_error:${error.message}` })
        return null
      })
      responseStatus = response?.status?.() || responseStatus
      sideEffects.networkFetched = true
      if (pages.length > 0) sideEffects.navigatedBeyondExactUrl = true
      if (!response) continue
      const snapshot = await captureSnapshot(page, { sourceUrl: targetUrl, artifactDir, pageIndex: pages.length + 1 })
      const vision = await classifyVision(snapshot)
      allVision.push({ url: snapshot.url, title: snapshot.title, status: vision.status, parsed: vision.parsed || null })
      pages.push(pageReportFromSnapshot(snapshot, {
        depth: next.depth,
        from: next.from,
        navigationMethod: 'goto',
      }))
      if (snapshot.browserShellBlocker?.blocked) {
        stopped.push({ url: snapshot.url, from: next.from, reason: snapshot.browserShellBlocker.reason })
        continue
      }
      if (!snapshot.authState.publicReadable) {
        stopped.push({ url: snapshot.url, from: next.from, reason: snapshot.authState.status })
        continue
      }
      if (next.depth >= Number(maxDepth || 2)) continue

      const clickCandidate = handsEvents.length < Number(maxClicks || 3)
        ? firstInspectableLink(snapshot)
        : null
      if (clickCandidate && !visited.has(normalizeUrl(clickCandidate.normalizedUrl))) {
        const eventId = `hands-click-${String(handsEvents.length + 1).padStart(2, '0')}`
        const clickResult = await clickInspectableLink(page, clickCandidate, { eventId })
        handsEvents.push(clickResult)
        sideEffects.clicked = sideEffects.clicked || clickResult.ok
        if (clickResult.ok) {
          sideEffects.navigatedBeyondExactUrl = true
          const clickedUrl = normalizeUrl(clickResult.afterUrl)
          if (!isSameCommunityUrl(clickedUrl, targetUrl)) {
            stopped.push({ url: clickedUrl, from: snapshot.url, reason: 'click_left_same_community_boundary' })
          } else if (RISKY_LINK_PATTERN.test(clickedUrl)) {
            stopped.push({ url: clickedUrl, from: snapshot.url, reason: 'click_reached_blocked_auth_or_write_url' })
          } else if (!visited.has(clickedUrl) && pages.length < Number(maxPages || 20)) {
            visited.add(clickedUrl)
            const clickedSnapshot = await captureSnapshot(page, { sourceUrl: targetUrl, artifactDir, pageIndex: pages.length + 1 })
            const clickedVision = await classifyVision(clickedSnapshot)
            allVision.push({ url: clickedSnapshot.url, title: clickedSnapshot.title, status: clickedVision.status, parsed: clickedVision.parsed || null })
            pages.push(pageReportFromSnapshot(clickedSnapshot, {
              depth: next.depth + 1,
              from: snapshot.url,
              navigationMethod: 'click',
              handsEventId: eventId,
            }))
            if (clickedSnapshot.browserShellBlocker?.blocked) {
              stopped.push({ url: clickedSnapshot.url, from: snapshot.url, reason: clickedSnapshot.browserShellBlocker.reason })
            } else if (!clickedSnapshot.authState.publicReadable) {
              stopped.push({ url: clickedSnapshot.url, from: snapshot.url, reason: clickedSnapshot.authState.status })
            } else if (next.depth + 1 < Number(maxDepth || 2)) {
              enqueueInspectableLinks(clickedSnapshot, next.depth + 2, clickedSnapshot.url)
            }
          }
        }
      }
      enqueueInspectableLinks(snapshot, next.depth + 1, snapshot.url)
    }

    const publicPages = pages.filter(row => row.authState?.publicReadable)
    const blockedPages = pages.filter(row => row.authState?.status === 'auth_required_or_private_wall')
    const browserShellBlockers = pages.filter(row => row.browserShellBlocker?.blocked)
    const finalStatus = publicPages.length
      ? blockedPages.length || browserShellBlockers.length
        ? 'free_skool_public_sop_partial_blockers_seen'
        : 'free_skool_public_sop_completed'
      : blockedPages.length
        ? 'stopped_auth_or_private_wall'
        : browserShellBlockers.length
          ? 'stopped_browser_shell_blocker'
        : 'stopped_public_read_not_proven'
    const report = {
      schemaVersion: 1,
      cardId: SKOOL_FREE_PUBLIC_READ_CARD_ID,
      targetKey: SKOOL_FREE_PUBLIC_READ_TARGET_KEY,
      runId,
      sourceId: 'SRC-SKOOL-001',
      sourceName: sourceSlug,
      targetUrl,
      finalUrl: pages.at(-1)?.url || targetUrl,
      responseStatus,
      status: finalStatus,
      ok: publicPages.length > 0,
      publicReadable: publicPages.length > 0,
      authState: pages.at(-1)?.authState || { status: 'not_loaded', publicReadable: false },
      capturedAt: now,
      sop: {
        name: 'free_skool_community_god_mode_sop_v1',
        targetBehavior: [
          'enter free/public community surface when visible',
          `inspect visible public community activity/comments for the last ${Number(lookbackDays || SKOOL_FREE_COMMUNITY_LOOKBACK_DAYS)} days when dates are available`,
          'inspect visible public classroom/course/resource surfaces when same-community links are available',
          'classify useful resource links for follow-up packets',
          'stop at login/private/member/paid/forms/downloads/post/comment/message boundaries',
        ],
        maxPages: Number(maxPages || 20),
        maxDepth: Number(maxDepth || 2),
        maxClicks: Number(maxClicks || 3),
        lookbackDays: Number(lookbackDays || SKOOL_FREE_COMMUNITY_LOOKBACK_DAYS),
      },
      runner: {
        name: 'source_browser_agent_runtime_v1',
        proofType: 'system_runner_not_manual_browser_control',
        runtimeScope: 'general_browser_source_agent',
        sourceSpecificSop: 'free_skool_community_first_proof',
        browserProfileMode: sideEffects.browserProfileMode,
        launchArgs: SOURCE_BROWSER_LAUNCH_ARGS,
        eyes: {
          dom: true,
          screenshot: pages.some(row => Boolean(row.artifacts?.screenshotPath)),
          geminiVision: liveGemini ? 'attempted_per_page' : 'skipped_not_requested',
        },
        hands: {
          sameCommunityNavigation: true,
          clicked: sideEffects.clicked,
          clickEvents: handsEvents,
          noJoinNoLoginNoForms: true,
        },
      },
      counts: {
        pagesVisited: pages.length,
        publicPages: publicPages.length,
        authWallPages: blockedPages.length,
        browserShellBlockerPages: browserShellBlockers.length,
        queuedRemaining: queue.length,
        stopped: stopped.length,
        handsEvents: handsEvents.length,
        successfulClicks: handsEvents.filter(event => event.ok).length,
        linksSeen: pages.reduce((sum, row) => sum + list(row.linkClassifications).length, 0),
        sameCommunityLinksSeen: pages.reduce((sum, row) => sum + list(row.linkClassifications).filter(link => link.classification === 'same_public_community_reference_only').length, 0),
        blockedAuthOrWriteLinksSeen: pages.reduce((sum, row) => sum + list(row.linkClassifications).filter(link => link.classification === 'blocked_auth_or_write_surface').length, 0),
      },
      pages,
      stopped,
      artifacts: {
        runDir,
        reportPath: path.join(runDir, 'report.json'),
        localOnly: true,
        trackedRepoContent: false,
      },
      vision: {
        status: liveGemini ? 'ran_or_attempted_per_page' : 'skipped_not_requested',
        pages: allVision,
      },
      consoleErrors: consoleErrors.slice(0, 12),
      pageErrors: pageErrors.slice(0, 12),
      sideEffects,
      next: publicPages.length
        ? 'Use this as the first source-specific proof for the general browser source agent, then expand the same runtime to community posts/resources with explicit stop rules.'
        : 'Do not continue extraction. Create an auth/session packet or choose a different free public source target.',
    }
    await writeJson(path.join(runDir, 'report.json'), report)
    await writeText(path.join(runDir, 'README.txt'), [
      `Run: ${runId}`,
      `Target: ${targetUrl}`,
      `Status: ${report.status}`,
      `Report: ${path.join(runDir, 'report.json')}`,
      '',
      'Local-only proof directory. Do not commit captured screenshots or page text.',
    ].join('\n'))
    return report
  } finally {
    await page.close().catch(() => {})
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }
}
