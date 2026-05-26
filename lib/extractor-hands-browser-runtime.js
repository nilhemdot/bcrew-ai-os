import crypto from 'node:crypto'

import {
  buildSourcePacketPreview,
} from './build-intel-link-approval-source-packets.js'
import {
  approvePacketForRuntime,
} from './source-packet-public-web-runtime.js'

export const EXTRACTOR_HANDS_BROWSER_RUNTIME_CARD_ID = 'EXTRACTOR-HANDS-BROWSER-RUNTIME-001'
export const EXTRACTOR_HANDS_BROWSER_RUNTIME_SCRIPT_PATH = 'scripts/process-extractor-hands-browser-runtime-check.mjs'

const PUBLIC_HANDS_DECISIONS = new Set(['approve_public_free_read', 'approve_sales_page_review'])
const PUBLIC_HANDS_FAMILIES = new Set(['public_web', 'github'])

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

function textHash(value = '') {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex')
}

function parseUrl(value = '') {
  try {
    return new URL(text(value))
  } catch {
    return null
  }
}

function hostOf(value = '') {
  return parseUrl(value)?.hostname.replace(/^www\./, '').toLowerCase() || ''
}

function normalizeUrl(rawUrl = '', baseUrl = '') {
  try {
    const url = new URL(text(rawUrl), baseUrl || undefined)
    url.hash = ''
    return url.toString()
  } catch {
    return text(rawUrl)
  }
}

function stripHtml(value = '') {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function titleOf(html = '') {
  return stripHtml(String(html || '').match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '')
}

function headingsOf(html = '') {
  return [...String(html || '').matchAll(/<(h[1-3])\b[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map(match => ({ level: Number(match[1].slice(1)), text: stripHtml(match[2]).slice(0, 180) }))
    .filter(row => row.text)
    .slice(0, 12)
}

function parseAttrs(rawAttrs = '') {
  const attrs = {}
  for (const match of String(rawAttrs || '').matchAll(/([:@a-zA-Z0-9_-]+)(?:\s*=\s*["']([^"']*)["'])?/g)) {
    attrs[match[1].toLowerCase()] = match[2] ?? ''
  }
  return attrs
}

function selectorMatches(selector = '', attrs = {}) {
  const normalized = text(selector)
  if (!normalized) return false
  if (normalized.startsWith('#')) return attrs.id === normalized.slice(1)
  if (normalized.startsWith('.')) return text(attrs.class).split(/\s+/).includes(normalized.slice(1))

  const bracketSelector = normalized.replace(/^a(?=\[)/i, '')
  const attrMatch = bracketSelector.match(/^\[([^=\]]+)=["']([^"']+)["']\]$/)
  if (attrMatch) return attrs[attrMatch[1].toLowerCase()] === attrMatch[2]

  const hrefMatch = normalized.match(/^a\[href=["']([^"']+)["']\]$/i)
  if (hrefMatch) return attrs.href === hrefMatch[1]

  return false
}

function classifyUrlRisk(url = '') {
  const host = hostOf(url)
  const value = text(url).toLowerCase()
  if (!host) return 'invalid'
  if (/download|attachment|\.zip$|\.dmg$|\.pkg$|\.exe$|\.pdf$/i.test(value)) return 'download'
  if (/checkout|purchase|payment|gumroad|stripe|paypal/i.test(`${host} ${value}`)) return 'purchase_or_checkout'
  if (/calendly|typeform/i.test(host) || /(^|[/?#&=._-])(form|forms|optin|opt-in|subscribe|subscription|waitlist|book|booking|book-a-call)([/?#&=._-]|$)/i.test(value)) return 'form_or_booking'
  if (/skool|myicor|circle|discord/i.test(host)) return 'auth_or_community'
  return 'public_navigation'
}

function addFailure(failures, code, detail = '') {
  failures.push({ code, detail })
}

function sideEffects(overrides = {}) {
  return {
    liveBrowserLaunched: false,
    networkFetched: false,
    clicked: false,
    navigated: false,
    submittedForm: false,
    downloadedFile: false,
    purchasedOrOptedIn: false,
    loggedIn: false,
    externalWrites: false,
    writesBacklog: false,
    mutatesCredentials: false,
    mutatesBrowserProfile: false,
    followedUnapprovedLinks: false,
    ...overrides,
  }
}

function escapeRegex(value = '') {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function patternLooksBounded(pattern = '', expectedHost = '') {
  const value = text(pattern)
  if (!value) return false
  if (value === '*' || value === '.*' || /^https?:\/\/\.\*/i.test(value)) return false
  return !expectedHost || value.includes(expectedHost) || value.includes(escapeRegex(expectedHost))
}

function urlMatchesPolicy(url = '', policy = {}) {
  const normalized = normalizeUrl(url)
  const exact = normalizeUrl(policy.allowedNextUrl || '')
  if (exact && normalized === exact) return true
  const pattern = text(policy.allowedNextUrlPattern)
  if (!patternLooksBounded(pattern, hostOf(policy.allowedNextUrl || normalized))) return false
  try {
    return new RegExp(pattern).test(normalized)
  } catch {
    return false
  }
}

function findSyntheticAnchor(html = '', selector = '', baseUrl = '') {
  for (const match of String(html || '').matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const attrs = parseAttrs(match[1])
    if (!selectorMatches(selector, attrs)) continue
    const href = normalizeUrl(attrs.href || '', baseUrl)
    return {
      tagName: 'a',
      href,
      download: Object.prototype.hasOwnProperty.call(attrs, 'download'),
      text: stripHtml(match[2]).slice(0, 200),
      attrs,
    }
  }
  return null
}

export function buildExtractorHandsPolicy(input = {}) {
  const allowedNextUrl = normalizeUrl(input.allowedNextUrl || '')
  const allowedHost = hostOf(allowedNextUrl)
  return {
    schemaVersion: 1,
    actionId: text(input.actionId || 'click-approved-link'),
    actionType: 'click',
    selector: text(input.selector),
    allowedNextUrl,
    allowedNextUrlPattern: text(input.allowedNextUrlPattern || (allowedNextUrl ? `^${escapeRegex(allowedNextUrl)}$` : '')),
    allowedHost,
    maxClicks: Number(input.maxClicks || 1),
    maxPages: Number(input.maxPages || 2),
    stopCondition: text(input.stopCondition || 'capture_after_navigation_visible_text'),
    evidenceTarget: text(input.evidenceTarget || 'post_click_page'),
    allowedOperations: [
      'open exact approved URL',
      'click exactly the approved selector once',
      'navigate only to the approved next URL/pattern',
      'capture before/after title, text, headings, hashes, final URL, and stop reason',
    ],
    forbiddenOperations: [
      'broad crawl',
      'unapproved link following',
      'auth/login/session use',
      'forms, opt-ins, booking, purchase, checkout, or external messages',
      'downloads or file saves',
      'credential or browser-profile mutation',
      'external writes or backlog writes',
    ],
  }
}

export function attachExtractorHandsPolicy(packet = {}, policy = {}) {
  const handsPolicy = buildExtractorHandsPolicy(policy)
  return {
    ...packet,
    accessBoundary: 'exact_public_click_navigation_read_only_no_forms',
    runtimePlan: {
      ...(packet.runtimePlan || {}),
      maxPages: handsPolicy.maxPages,
      maxClicks: handsPolicy.maxClicks,
      allowedOperations: handsPolicy.allowedOperations,
      forbiddenOperations: handsPolicy.forbiddenOperations,
      externalWrites: false,
      writesBacklog: false,
      mutatesCredentials: false,
      mutatesBrowserProfile: false,
    },
    handsPolicy,
  }
}

export function classifyExtractorHandsPacketStatus(packet = {}) {
  const exactUrl = parseUrl(packet.exactUrl)
  const sourceFamily = text(packet.sourceFamily)
  const accessBoundary = text(packet.accessBoundary).toLowerCase()
  const proposedDecision = text(packet.proposedDecision)
  const packetSurface = `${sourceFamily} ${hostOf(packet.exactUrl)}`.toLowerCase()
  const formBoundary = accessBoundary.replace(/no[-_]?forms?/g, '')
  const purchaseOrFormSurface = `${sourceFamily} ${formBoundary} ${packet.exactUrl || ''}`.toLowerCase()

  if (/skool|myicor|community/.test(packetSurface)) {
    return { status: 'auth_session_required', ready: false, plainEnglish: 'This source family requires a source-specific authorized-session runner, not public Hands V1.' }
  }
  if (/paid|private|member|course/.test(accessBoundary)) {
    return { status: 'paid_or_private_blocked', ready: false, plainEnglish: 'Paid/private/member content is blocked until Steve approves a source-specific packet and session/content boundary.' }
  }
  if (/purchase|checkout|gumroad|payment|form|booking|calendly/.test(purchaseOrFormSurface)) {
    return { status: 'purchase_or_form_blocked', ready: false, plainEnglish: 'This source looks like a form, booking, checkout, purchase, or opt-in surface. Hands will not click it without a different explicit source packet.' }
  }
  if (!exactUrl || !PUBLIC_HANDS_FAMILIES.has(sourceFamily) || !PUBLIC_HANDS_DECISIONS.has(proposedDecision)) {
    return { status: 'unsupported_until_source_specific_runner', ready: false, plainEnglish: 'This packet is not eligible for the public/free Hands V1 runner.' }
  }
  if (!text(packet.approvedBy) || !packet.approvedAt) {
    return { status: 'exact_public_read_ready', ready: false, plainEnglish: 'The packet shape is public, but it is not approved for Hands until approval metadata is present.' }
  }

  const policy = packet.handsPolicy || null
  if (!policy) {
    return { status: 'exact_public_read_ready', ready: false, canReadExactUrl: true, plainEnglish: 'Exact public read is ready. Click/navigation requires packet detail: selector, allowed next URL pattern, stop condition, and evidence target.' }
  }

  const policyFailures = validateExtractorHandsPolicy(packet).failures
  if (policyFailures.length) {
    return { status: 'click_navigation_requires_packet_detail', ready: false, canReadExactUrl: true, failures: policyFailures, plainEnglish: 'Click/navigation is not ready because the source packet lacks bounded Hands details.' }
  }
  return { status: 'click_navigation_ready', ready: true, canReadExactUrl: true, plainEnglish: 'Approved public Hands packet is ready for one bounded click/navigation action.' }
}

export function validateExtractorHandsPolicy(packet = {}) {
  const failures = []
  const policy = packet.handsPolicy || {}
  const sourceHost = hostOf(packet.exactUrl)
  const nextUrl = normalizeUrl(policy.allowedNextUrl || '')

  if (!text(policy.actionId)) addFailure(failures, 'missing_action_id')
  if (policy.actionType !== 'click') addFailure(failures, 'only_click_action_supported', policy.actionType || 'missing')
  if (!text(policy.selector)) addFailure(failures, 'missing_click_selector')
  if (!nextUrl) addFailure(failures, 'missing_allowed_next_url')
  if (!text(policy.allowedNextUrlPattern)) addFailure(failures, 'missing_allowed_next_url_pattern')
  if (Number(policy.maxClicks || 0) !== 1) addFailure(failures, 'max_clicks_must_be_one', String(policy.maxClicks))
  if (Number(policy.maxPages || 0) !== 2) addFailure(failures, 'max_pages_must_be_two', String(policy.maxPages))
  if (!text(policy.stopCondition)) addFailure(failures, 'missing_stop_condition')
  if (!text(policy.evidenceTarget)) addFailure(failures, 'missing_evidence_target')
  if (nextUrl && hostOf(nextUrl) !== sourceHost) addFailure(failures, 'allowed_next_url_must_stay_on_source_host', `${hostOf(nextUrl)} != ${sourceHost}`)
  if (!patternLooksBounded(policy.allowedNextUrlPattern, sourceHost)) addFailure(failures, 'allowed_next_url_pattern_too_broad', policy.allowedNextUrlPattern || 'missing')
  if (nextUrl && !urlMatchesPolicy(nextUrl, policy)) addFailure(failures, 'allowed_next_url_does_not_match_pattern', nextUrl)
  if (/form|input|submit|button/i.test(policy.selector)) addFailure(failures, 'form_or_submit_selector_blocked', policy.selector)

  return { ok: failures.length === 0, failures }
}

export function validateExtractorHandsRequest(request = {}) {
  const failures = []
  const packet = request.packet || {}
  const status = classifyExtractorHandsPacketStatus(packet)
  if (status.status !== 'click_navigation_ready') {
    addFailure(failures, status.status, status.plainEnglish)
    for (const failure of status.failures || []) failures.push(failure)
  }

  if (!['synthetic_fixture', 'live_playwright_hands'].includes(request.mode || 'synthetic_fixture')) addFailure(failures, 'unsupported_hands_mode', request.mode || 'missing')
  if (request.mode === 'live_playwright_hands' && request.allowLive !== true) addFailure(failures, 'live_hands_requires_explicit_allow_live', 'live browser disabled by default')
  if (request.authSessionUsed === true) addFailure(failures, 'auth_session_blocked', 'public Hands V1 is no-login')
  if (request.submitForms === true) addFailure(failures, 'form_submit_blocked', 'forms are forbidden')
  if (request.downloadFiles === true) addFailure(failures, 'download_blocked', 'downloads are forbidden')
  if (request.purchaseOrOptIn === true) addFailure(failures, 'purchase_or_opt_in_blocked', 'purchase/opt-in actions are forbidden')
  if (request.externalWrites === true) addFailure(failures, 'external_write_blocked', 'external writes are forbidden')
  if (request.writesBacklog === true) addFailure(failures, 'backlog_write_blocked', 'backlog writes are forbidden')
  if (request.followLinks === true) addFailure(failures, 'unbounded_follow_links_blocked', 'only the explicit Hands selector may be clicked')

  return { ok: failures.length === 0, failures, status }
}

export function buildExtractorHandsArtifact({ packet = {}, beforeHtml = '', afterHtml = '', matchedElement = {}, finalUrl = '', mode = 'synthetic_fixture', capturedAt = new Date().toISOString(), screenshotHash = '' } = {}) {
  const policy = packet.handsPolicy || {}
  const beforeTitle = titleOf(beforeHtml)
  const afterTitle = titleOf(afterHtml)
  const afterText = stripHtml(afterHtml)
  return {
    artifactId: `hands-runtime:${stableHash([packet.sourcePacketId, packet.exactUrl, policy.actionId, finalUrl, afterText.slice(0, 500)]).slice(0, 16)}`,
    sourcePacketId: packet.sourcePacketId,
    exactUrl: packet.exactUrl,
    finalUrl,
    host: hostOf(packet.exactUrl),
    mode,
    worker: 'extractor_hands_browser_runtime_v1',
    capturedAt,
    status: 'completed_bounded_click_navigation',
    before: {
      url: packet.exactUrl,
      title: beforeTitle,
      pageHash: textHash(beforeHtml),
    },
    actionTrace: [{
      actionId: policy.actionId,
      actionType: 'click',
      selector: policy.selector,
      matchedText: matchedElement.text || '',
      href: matchedElement.href || '',
      allowedNextUrl: policy.allowedNextUrl,
      stopCondition: policy.stopCondition,
      evidenceTarget: policy.evidenceTarget,
    }],
    after: {
      url: finalUrl,
      title: afterTitle,
      textChars: afterText.length,
      bodyTextPreview: afterText.slice(0, 1200),
      headings: headingsOf(afterHtml),
      pageHash: textHash(afterHtml),
    },
    evidence: {
      beforePageHash: textHash(beforeHtml),
      afterPageHash: textHash(afterHtml),
      screenshotHash: screenshotHash || textHash(afterHtml),
      screenshotStored: false,
      exactActionOnly: true,
      sourceBoundary: packet.accessBoundary,
      stopReason: 'approved_click_navigation_complete',
    },
    sideEffects: sideEffects({
      clicked: true,
      navigated: true,
      liveBrowserLaunched: mode === 'live_playwright_hands',
      networkFetched: mode === 'live_playwright_hands',
    }),
  }
}

async function runSyntheticHands(request = {}) {
  const packet = request.packet || {}
  const policy = packet.handsPolicy || {}
  const beforeHtml = request.html || ''
  const matched = findSyntheticAnchor(beforeHtml, policy.selector, packet.exactUrl)
  if (!matched) {
    return {
      ok: false,
      status: 'blocked',
      validation: { ok: false, failures: [{ code: 'selector_not_found_or_not_anchor', detail: policy.selector || 'missing' }] },
      sideEffects: sideEffects(),
    }
  }
  if (matched.download) {
    return {
      ok: false,
      status: 'blocked',
      validation: { ok: false, failures: [{ code: 'download_link_blocked', detail: matched.href }] },
      sideEffects: sideEffects(),
    }
  }
  const risk = classifyUrlRisk(matched.href)
  if (risk !== 'public_navigation') {
    return {
      ok: false,
      status: 'blocked',
      validation: { ok: false, failures: [{ code: `${risk}_blocked`, detail: matched.href }] },
      sideEffects: sideEffects(),
    }
  }
  if (!urlMatchesPolicy(matched.href, policy)) {
    return {
      ok: false,
      status: 'blocked',
      validation: { ok: false, failures: [{ code: 'clicked_url_outside_allowed_pattern', detail: matched.href }] },
      sideEffects: sideEffects(),
    }
  }
  const finalUrl = normalizeUrl(matched.href)
  const afterHtml = request.fixturePages?.[finalUrl] || request.afterHtml || ''
  if (!text(afterHtml)) {
    return {
      ok: false,
      status: 'blocked',
      validation: { ok: false, failures: [{ code: 'missing_after_click_fixture', detail: finalUrl }] },
      sideEffects: sideEffects(),
    }
  }
  const artifact = buildExtractorHandsArtifact({
    packet,
    beforeHtml,
    afterHtml,
    matchedElement: matched,
    finalUrl,
    mode: 'synthetic_fixture',
    capturedAt: request.capturedAt || new Date().toISOString(),
  })
  return {
    ok: true,
    status: 'completed_bounded_click_navigation',
    reportOnly: true,
    validation: { ok: true, failures: [] },
    artifact,
    sideEffects: artifact.sideEffects,
  }
}

async function runLivePlaywrightHands(request = {}) {
  const { chromium } = await import('playwright')
  const packet = request.packet || {}
  const policy = packet.handsPolicy || {}
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ acceptDownloads: false, javaScriptEnabled: true })
  page.on('download', download => download.cancel().catch(() => {}))
  try {
    await page.goto(packet.exactUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    const beforeHtml = await page.content()
    const locator = page.locator(policy.selector)
    const count = await locator.count().catch(() => 0)
    let matched = null
    let matchedLocator = null
    for (let index = 0; index < count; index += 1) {
      const candidate = locator.nth(index)
      if (await candidate.isVisible().catch(() => false) !== true) continue
      matched = await candidate.evaluate(element => ({
        tagName: String(element.tagName || '').toLowerCase(),
        href: element instanceof HTMLAnchorElement ? element.href : '',
        download: element instanceof HTMLAnchorElement ? element.hasAttribute('download') : false,
        text: String(element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200),
        type: element.getAttribute('type') || '',
        role: element.getAttribute('role') || '',
      })).catch(() => null)
      if (matched) {
        matchedLocator = candidate
        break
      }
    }
    if (!matched || matched.tagName !== 'a' || !matched.href) {
      return { ok: false, status: 'blocked', validation: { ok: false, failures: [{ code: 'live_selector_not_safe_anchor', detail: policy.selector }] }, sideEffects: sideEffects({ liveBrowserLaunched: true, networkFetched: true }) }
    }
    if (matched.download) {
      return { ok: false, status: 'blocked', validation: { ok: false, failures: [{ code: 'download_link_blocked', detail: matched.href }] }, sideEffects: sideEffects({ liveBrowserLaunched: true, networkFetched: true }) }
    }
    const risk = classifyUrlRisk(matched.href)
    if (risk !== 'public_navigation' || !urlMatchesPolicy(matched.href, policy)) {
      return { ok: false, status: 'blocked', validation: { ok: false, failures: [{ code: 'live_clicked_url_not_allowed', detail: matched.href }] }, sideEffects: sideEffects({ liveBrowserLaunched: true, networkFetched: true }) }
    }
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
      matchedLocator.click({ timeout: 15000 }),
    ])
    const finalUrl = normalizeUrl(page.url())
    if (!urlMatchesPolicy(finalUrl, policy)) {
      return { ok: false, status: 'blocked', validation: { ok: false, failures: [{ code: 'final_url_outside_allowed_pattern_after_click', detail: finalUrl }] }, sideEffects: sideEffects({ liveBrowserLaunched: true, networkFetched: true, clicked: true, navigated: true }) }
    }
    const afterHtml = await page.content()
    const screenshot = await page.screenshot({ type: 'png', fullPage: false }).catch(() => null)
    const artifact = buildExtractorHandsArtifact({
      packet,
      beforeHtml,
      afterHtml,
      matchedElement: matched,
      finalUrl,
      mode: 'live_playwright_hands',
      capturedAt: request.capturedAt || new Date().toISOString(),
      screenshotHash: screenshot ? textHash(screenshot) : '',
    })
    return { ok: true, status: 'completed_bounded_click_navigation', reportOnly: true, validation: { ok: true, failures: [] }, artifact, sideEffects: artifact.sideEffects }
  } finally {
    await page.close().catch(() => {})
    await browser.close().catch(() => {})
  }
}

export async function runExtractorHandsBrowserRuntime(request = {}) {
  const mode = request.mode || 'synthetic_fixture'
  const validation = validateExtractorHandsRequest({ ...request, mode })
  if (!validation.ok) {
    return {
      ok: false,
      status: 'blocked',
      validation,
      sideEffects: sideEffects(),
    }
  }
  if (mode === 'live_playwright_hands') return runLivePlaywrightHands({ ...request, mode })
  return runSyntheticHands({ ...request, mode })
}

function approvedFixturePacket(options = {}) {
  const packet = approvePacketForRuntime(buildSourcePacketPreview({
    url: options.url || 'https://example.com/start',
    host: hostOf(options.url || 'https://example.com/start'),
    operatorNote: options.operatorNote || 'approve exact public click to pricing page',
  }, { operatorNote: options.operatorNote || 'approve exact public click to pricing page' }), {
    approvedBy: 'Steve',
    approvedAt: '2026-05-26T02:45:00.000-04:00',
  })
  return attachExtractorHandsPolicy(packet, {
    actionId: 'open-pricing',
    selector: '[data-hands-action="pricing"]',
    allowedNextUrl: 'https://example.com/pricing',
    stopCondition: 'capture_pricing_page_visible_text',
    evidenceTarget: 'pricing_page',
    ...options.policy,
  })
}

export async function buildExtractorHandsBrowserRuntimeDogfoodProof() {
  const beforeHtml = `
    <html>
      <head><title>Example AI Systems</title></head>
      <body>
        <h1>AI systems for operators</h1>
        <a data-hands-action="pricing" href="/pricing">Pricing</a>
        <a data-hands-action="skool" href="https://www.skool.com/example">Community</a>
      </body>
    </html>
  `
  const afterHtml = `
    <html>
      <head><title>Pricing - Example AI Systems</title></head>
      <body>
        <h1>Pricing</h1>
        <p>Implementation packages start with a discovery call, no form submitted by this proof.</p>
      </body>
    </html>
  `
  const approvedClickPacket = approvedFixturePacket()
  const exactReadOnlyPacket = approvePacketForRuntime(buildSourcePacketPreview({ url: 'https://example.com/start', host: 'example.com' }), {
    approvedBy: 'Steve',
    approvedAt: '2026-05-26T02:45:00.000-04:00',
  })
  const clickRun = await runExtractorHandsBrowserRuntime({
    packet: approvedClickPacket,
    html: beforeHtml,
    fixturePages: { 'https://example.com/pricing': afterHtml },
    capturedAt: '2026-05-26T02:45:02.000-04:00',
  })

  const blockedFixtures = [
    {
      name: 'missing_policy_requires_packet_detail',
      result: await runExtractorHandsBrowserRuntime({ packet: exactReadOnlyPacket, html: beforeHtml }),
      expectedCode: 'exact_public_read_ready',
    },
    {
      name: 'broad_pattern_blocks',
      result: await runExtractorHandsBrowserRuntime({ packet: approvedFixturePacket({ policy: { allowedNextUrlPattern: '.*' } }), html: beforeHtml, fixturePages: { 'https://example.com/pricing': afterHtml } }),
      expectedCode: 'click_navigation_requires_packet_detail',
    },
    {
      name: 'auth_session_blocks',
      result: await runExtractorHandsBrowserRuntime({ packet: approvedClickPacket, html: beforeHtml, authSessionUsed: true }),
      expectedCode: 'auth_session_blocked',
    },
    {
      name: 'form_selector_blocks',
      result: await runExtractorHandsBrowserRuntime({ packet: approvedFixturePacket({ policy: { selector: 'button[type="submit"]' } }), html: beforeHtml }),
      expectedCode: 'click_navigation_requires_packet_detail',
    },
    {
      name: 'download_link_blocks',
      result: await runExtractorHandsBrowserRuntime({
        packet: approvedFixturePacket({ policy: { selector: '[data-hands-action="download"]', allowedNextUrl: 'https://example.com/file.zip', allowedNextUrlPattern: '^https://example\\.com/file\\.zip$' } }),
        html: '<a data-hands-action="download" href="/file.zip" download>Download</a>',
      }),
      expectedCode: 'download_link_blocked',
    },
    {
      name: 'purchase_host_blocks',
      result: await runExtractorHandsBrowserRuntime({
        packet: approvedFixturePacket({ policy: { selector: '[data-hands-action="buy"]', allowedNextUrl: 'https://example.com/checkout', allowedNextUrlPattern: '^https://example\\.com/checkout$' } }),
        html: '<a data-hands-action="buy" href="/checkout">Buy</a>',
      }),
      expectedCode: 'purchase_or_checkout_blocked',
    },
    {
      name: 'skool_packet_blocks',
      result: await runExtractorHandsBrowserRuntime({
        packet: approvedFixturePacket({ url: 'https://www.skool.com/example', policy: { allowedNextUrl: 'https://www.skool.com/example/about', allowedNextUrlPattern: '^https://www\\.skool\\.com/example/about$' } }),
        html: beforeHtml,
      }),
      expectedCode: 'auth_session_required',
    },
    {
      name: 'external_write_blocks',
      result: await runExtractorHandsBrowserRuntime({ packet: approvedClickPacket, html: beforeHtml, externalWrites: true }),
      expectedCode: 'external_write_blocked',
    },
    {
      name: 'backlog_write_blocks',
      result: await runExtractorHandsBrowserRuntime({ packet: approvedClickPacket, html: beforeHtml, writesBacklog: true }),
      expectedCode: 'backlog_write_blocked',
    },
  ].map(testCase => ({
    name: testCase.name,
    ok: testCase.result.ok === false && list(testCase.result.validation?.failures).some(failure => failure.code === testCase.expectedCode),
    expectedCode: testCase.expectedCode,
    actualCodes: list(testCase.result.validation?.failures).map(failure => failure.code),
  }))

  const statusMatrix = [
    classifyExtractorHandsPacketStatus(exactReadOnlyPacket).status,
    classifyExtractorHandsPacketStatus(approvedClickPacket).status,
    classifyExtractorHandsPacketStatus(approvedFixturePacket({ url: 'https://www.skool.com/example', policy: { allowedNextUrl: 'https://www.skool.com/example/about', allowedNextUrlPattern: '^https://www\\.skool\\.com/example/about$' } })).status,
  ]

  return {
    ok: clickRun.ok === true &&
      clickRun.artifact?.actionTrace?.[0]?.selector === '[data-hands-action="pricing"]' &&
      clickRun.artifact?.finalUrl === 'https://example.com/pricing' &&
      clickRun.artifact?.sideEffects?.clicked === true &&
      clickRun.artifact?.sideEffects?.externalWrites === false &&
      blockedFixtures.every(testCase => testCase.ok) &&
      statusMatrix.includes('exact_public_read_ready') &&
      statusMatrix.includes('click_navigation_ready') &&
      statusMatrix.includes('auth_session_required'),
    clickRun: {
      ok: clickRun.ok,
      status: clickRun.status,
      artifactId: clickRun.artifact?.artifactId || '',
      finalUrl: clickRun.artifact?.finalUrl || '',
      sideEffects: clickRun.sideEffects,
    },
    statusMatrix,
    blockedCases: blockedFixtures,
  }
}
