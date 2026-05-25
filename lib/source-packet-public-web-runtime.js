import crypto from 'node:crypto'

import {
  BUILD_INTEL_LINK_APPROVAL_SOURCE_PACKETS_CARD_ID,
  buildSourcePacketPreview,
  validateSourcePacketPreview,
} from './build-intel-link-approval-source-packets.js'

export const SOURCE_PACKET_PUBLIC_WEB_RUNTIME_CARD_ID = BUILD_INTEL_LINK_APPROVAL_SOURCE_PACKETS_CARD_ID
export const SOURCE_PACKET_PUBLIC_WEB_RUNTIME_SCRIPT_PATH = 'scripts/process-source-packet-public-web-runtime-check.mjs'

const ALLOWED_DECISIONS = new Set(['approve_public_free_read', 'approve_sales_page_review'])
const ALLOWED_FAMILIES = new Set(['public_web', 'github'])

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

function stripHtml(value = '') {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function attr(tag = '', name = '') {
  const match = String(tag || '').match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i'))
  return match?.[1] || ''
}

function metaContent(html = '', name = '') {
  const escaped = String(name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`<meta\\b[^>]*(?:name|property)\\s*=\\s*["']${escaped}["'][^>]*>`, 'i')
  const tag = String(html || '').match(pattern)?.[0] || ''
  return attr(tag, 'content')
}

function titleOf(html = '') {
  return stripHtml(String(html || '').match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '')
}

function headingsOf(html = '') {
  return [...String(html || '').matchAll(/<(h[1-3])\b[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map(match => ({
      level: Number(match[1].slice(1)),
      text: stripHtml(match[2]).slice(0, 180),
    }))
    .filter(row => row.text)
    .slice(0, 12)
}

function normalizeLink(rawHref = '', baseUrl = '') {
  const href = text(rawHref)
  if (!href) return ''
  try {
    return new URL(href, baseUrl).toString()
  } catch {
    return href
  }
}

function linkFamily(url = '') {
  const host = hostOf(url)
  if (!host) return 'unknown'
  if (host.includes('skool')) return 'community_or_course'
  if (host.includes('gumroad') || /checkout|purchase|payment/i.test(url)) return 'purchase_or_checkout'
  if (host.includes('github.com') || host.includes('gist.github.com')) return 'github'
  if (host.includes('calendly') || /form|optin|subscribe|book/i.test(url)) return 'form_or_booking'
  if (host.includes('discord') || host.includes('circle')) return 'community_or_course'
  return 'public_web'
}

function linksOf(html = '', baseUrl = '') {
  return [...String(html || '').matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
    .map(match => {
      const href = normalizeLink(attr(match[0], 'href'), baseUrl)
      return {
        url: href,
        host: hostOf(href),
        label: stripHtml(match[2]).slice(0, 160),
        family: linkFamily(href),
        followed: false,
        requiresSourcePacket: true,
      }
    })
    .filter(row => row.url && !/^javascript:/i.test(row.url))
    .slice(0, 40)
}

function sideEffects(overrides = {}) {
  return {
    liveBrowserLaunched: false,
    networkFetched: false,
    clicked: false,
    submittedForm: false,
    downloadedFile: false,
    loggedIn: false,
    externalWrites: false,
    writesBacklog: false,
    mutatesCredentials: false,
    mutatesBrowserProfile: false,
    followedLinks: false,
    ...overrides,
  }
}

function addFailure(failures, code, detail = '') {
  failures.push({ code, detail })
}

export function approvePacketForRuntime(packet = {}, approval = {}) {
  return {
    ...packet,
    approvedBy: text(approval.approvedBy || packet.approvedBy || 'Steve'),
    approvedAt: approval.approvedAt || packet.approvedAt || new Date().toISOString(),
  }
}

export function validateApprovedPublicWebSourcePacket(packet = {}) {
  const failures = []
  const packetValidation = validateSourcePacketPreview(packet)
  for (const failure of packetValidation.failures || []) addFailure(failures, failure, 'source packet validation')

  const exactUrl = parseUrl(packet.exactUrl)
  if (!exactUrl) addFailure(failures, 'missing_or_invalid_exact_url', packet.exactUrl || 'missing')
  if (exactUrl && !['http:', 'https:'].includes(exactUrl.protocol)) addFailure(failures, 'unsupported_url_protocol', exactUrl.protocol)
  if (!ALLOWED_DECISIONS.has(packet.proposedDecision)) addFailure(failures, 'decision_not_public_web_runtime_eligible', packet.proposedDecision || 'missing')
  if (!ALLOWED_FAMILIES.has(packet.sourceFamily)) addFailure(failures, 'source_family_not_public_web_runtime_eligible', packet.sourceFamily || 'missing')
  if (!text(packet.approvedBy)) addFailure(failures, 'missing_approved_by', 'source packet must be approved before runtime')
  if (!packet.approvedAt) addFailure(failures, 'missing_approved_at', 'source packet must be timestamped before runtime')
  if (packet.startsCrawler !== false) addFailure(failures, 'packet_starts_crawler', String(packet.startsCrawler))
  if (packet.externalWrites !== false) addFailure(failures, 'packet_external_writes', String(packet.externalWrites))
  if (packet.writesBacklog !== false) addFailure(failures, 'packet_writes_backlog', String(packet.writesBacklog))

  const runtime = packet.runtimePlan || {}
  if (runtime.adapter !== 'local_playwright_first') addFailure(failures, 'runtime_not_local_first', runtime.adapter || 'missing')
  if (runtime.runnableAfterPacket !== true) addFailure(failures, 'runtime_not_runnable_after_packet', runtime.stage || 'missing')
  if (runtime.startsImmediately !== false || runtime.startsFromApprovalAction !== false) addFailure(failures, 'runtime_starts_from_approval', runtime.stage || 'missing')
  if (runtime.externalWrites !== false || runtime.writesBacklog !== false) addFailure(failures, 'runtime_write_boundary_missing', runtime.runtimePlanId || 'missing')
  if (Number(runtime.maxPages || 0) !== 1) addFailure(failures, 'runtime_must_be_exact_one_page', String(runtime.maxPages))
  if (Number(runtime.maxClicks || 0) !== 0) addFailure(failures, 'runtime_must_not_click', String(runtime.maxClicks))

  return { ok: failures.length === 0, failures }
}

export function validatePublicWebRuntimeRequest(request = {}) {
  const failures = []
  const packetValidation = validateApprovedPublicWebSourcePacket(request.packet || {})
  for (const failure of packetValidation.failures) failures.push(failure)

  if (!['synthetic_fixture', 'live_playwright_exact_url'].includes(request.mode || 'synthetic_fixture')) addFailure(failures, 'unsupported_runtime_mode', request.mode || 'missing')
  if (request.mode === 'live_playwright_exact_url' && request.allowLive !== true) addFailure(failures, 'live_runtime_requires_explicit_allow_live', 'live browser disabled by default')
  if (request.followLinks === true) addFailure(failures, 'link_following_blocked', 'runtime can classify links but not follow them')
  if (request.submitForms === true) addFailure(failures, 'form_submit_blocked', 'forms are forbidden')
  if (request.downloadFiles === true) addFailure(failures, 'download_blocked', 'downloads are forbidden')
  if (request.authSessionUsed === true) addFailure(failures, 'auth_session_blocked', 'public web runtime is no-login')
  if (request.externalWrites === true) addFailure(failures, 'external_write_blocked', 'external writes are forbidden')
  if (request.writesBacklog === true) addFailure(failures, 'backlog_write_blocked', 'backlog writes are forbidden')
  if (Number(request.maxPages || 1) !== 1) addFailure(failures, 'max_pages_must_be_one', String(request.maxPages))
  return { ok: failures.length === 0, failures }
}

export function buildPublicWebRuntimeArtifact({ packet = {}, html = '', mode = 'synthetic_fixture', fetchedAt = new Date().toISOString() } = {}) {
  const bodyText = stripHtml(html)
  const links = linksOf(html, packet.exactUrl)
  return {
    artifactId: `public-web-runtime:${stableHash([packet.sourcePacketId, packet.exactUrl, bodyText.slice(0, 500)]).slice(0, 16)}`,
    sourcePacketId: packet.sourcePacketId,
    exactUrl: packet.exactUrl,
    host: hostOf(packet.exactUrl),
    mode,
    worker: packet.runtimePlan?.worker || 'public_web_read_worker',
    fetchedAt,
    title: titleOf(html),
    description: metaContent(html, 'description') || metaContent(html, 'og:description'),
    bodyTextPreview: bodyText.slice(0, 1200),
    textChars: bodyText.length,
    headings: headingsOf(html),
    discoveredLinks: links,
    followedLinkCount: links.filter(link => link.followed).length,
    nextSourcePacketCandidates: links.map(link => ({
      url: link.url,
      host: link.host,
      family: link.family,
      reason: 'Found on approved exact public page; needs its own source packet before any follow-up.',
    })),
    evidence: {
      pageHash: crypto.createHash('sha256').update(String(html || ''), 'utf8').digest('hex'),
      exactUrlOnly: true,
      screenshotStored: false,
      sourceBoundary: packet.accessBoundary,
    },
    outputDestination: packet.outputDestination,
    sideEffects: sideEffects({ networkFetched: mode === 'live_playwright_exact_url' }),
  }
}

async function fetchWithPlaywright(packet = {}) {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ javaScriptEnabled: true })
    page.on('download', download => download.cancel().catch(() => {}))
    const response = await page.goto(packet.exactUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    const html = await page.content()
    return {
      html,
      responseStatus: response?.status?.() || null,
      finalUrl: page.url(),
    }
  } finally {
    await browser.close()
  }
}

export async function runSourcePacketPublicWebRuntime(request = {}) {
  const mode = request.mode || 'synthetic_fixture'
  const validation = validatePublicWebRuntimeRequest({ ...request, mode })
  if (!validation.ok) {
    return {
      ok: false,
      status: 'blocked',
      validation,
      sideEffects: sideEffects(),
    }
  }

  let html = request.html || ''
  let liveFetch = null
  if (mode === 'live_playwright_exact_url') {
    liveFetch = await fetchWithPlaywright(request.packet)
    html = liveFetch.html
  }
  if (!text(html)) {
    const blocked = { ok: false, failures: [{ code: 'missing_html_or_live_fetch_result', detail: 'no page body available' }] }
    return { ok: false, status: 'blocked', validation: blocked, sideEffects: sideEffects({ networkFetched: mode === 'live_playwright_exact_url' }) }
  }

  const artifact = buildPublicWebRuntimeArtifact({
    packet: request.packet,
    html,
    mode,
    fetchedAt: request.fetchedAt || new Date().toISOString(),
  })
  return {
    ok: true,
    status: 'ready_for_foundation_ingestion_review',
    reportOnly: true,
    writesBacklog: false,
    externalWrites: false,
    validation,
    liveFetch,
    artifact,
    sideEffects: artifact.sideEffects,
  }
}

function approvedFixturePacket(rawLink = {}, options = {}) {
  return approvePacketForRuntime(buildSourcePacketPreview(rawLink, options), {
    approvedBy: 'Steve',
    approvedAt: '2026-05-25T20:00:00.000-04:00',
  })
}

export async function buildSourcePacketPublicWebRuntimeDogfoodProof() {
  const sampleHtml = `
    <html>
      <head>
        <title>Chase AI Offer</title>
        <meta name="description" content="AI automation offer page for teams.">
      </head>
      <body>
        <h1>AI systems for operators</h1>
        <p>We build agent workflows, automations, and content engines.</p>
        <a href="/pricing">Pricing</a>
        <a href="https://www.skool.com/chase-ai">Community</a>
        <a href="https://gumroad.com/l/agent-course">Course</a>
      </body>
    </html>
  `
  const approvedPublic = approvedFixturePacket({ url: 'https://chaseai.io', host: 'chaseai.io' })
  const approvedSales = approvedFixturePacket(
    { url: 'https://chaseai.io/offer', host: 'chaseai.io', operatorNote: 'sales page, review how he sells AI products' },
    { operatorNote: 'sales page, review how he sells AI products' },
  )
  const runPublic = await runSourcePacketPublicWebRuntime({ packet: approvedPublic, html: sampleHtml })
  const runSales = await runSourcePacketPublicWebRuntime({ packet: approvedSales, html: sampleHtml })
  const blockedCases = [
    {
      name: 'unapproved_packet_blocks',
      result: await runSourcePacketPublicWebRuntime({ packet: buildSourcePacketPreview({ url: 'https://chaseai.io', host: 'chaseai.io' }), html: sampleHtml }),
      expectedCode: 'missing_approved_by',
    },
    {
      name: 'skool_packet_blocks',
      result: await runSourcePacketPublicWebRuntime({ packet: approvedFixturePacket({ url: 'https://www.skool.com/chase-ai', host: 'skool.com' }), html: sampleHtml }),
      expectedCode: 'decision_not_public_web_runtime_eligible',
    },
    {
      name: 'follow_links_blocks',
      result: await runSourcePacketPublicWebRuntime({ packet: approvedPublic, html: sampleHtml, followLinks: true }),
      expectedCode: 'link_following_blocked',
    },
    {
      name: 'broad_page_limit_blocks',
      result: await runSourcePacketPublicWebRuntime({ packet: approvedPublic, html: sampleHtml, maxPages: 5 }),
      expectedCode: 'max_pages_must_be_one',
    },
    {
      name: 'external_write_blocks',
      result: await runSourcePacketPublicWebRuntime({ packet: approvedPublic, html: sampleHtml, externalWrites: true }),
      expectedCode: 'external_write_blocked',
    },
    {
      name: 'live_mode_requires_explicit_allow',
      result: await runSourcePacketPublicWebRuntime({ packet: approvedPublic, mode: 'live_playwright_exact_url', html: sampleHtml }),
      expectedCode: 'live_runtime_requires_explicit_allow_live',
    },
  ].map(testCase => ({
    name: testCase.name,
    ok: testCase.result.ok === false && list(testCase.result.validation?.failures).some(failure => failure.code === testCase.expectedCode),
    expectedCode: testCase.expectedCode,
    actualCodes: list(testCase.result.validation?.failures).map(failure => failure.code),
  }))

  return {
    ok: runPublic.ok === true &&
      runSales.ok === true &&
      runPublic.artifact.followedLinkCount === 0 &&
      runPublic.artifact.nextSourcePacketCandidates.length >= 2 &&
      runPublic.sideEffects.externalWrites === false &&
      runPublic.sideEffects.writesBacklog === false &&
      blockedCases.every(testCase => testCase.ok),
    runs: {
      publicPage: {
        ok: runPublic.ok,
        title: runPublic.artifact?.title || '',
        linksFound: runPublic.artifact?.discoveredLinks?.length || 0,
        followedLinkCount: runPublic.artifact?.followedLinkCount || 0,
        sideEffects: runPublic.sideEffects,
      },
      salesPage: {
        ok: runSales.ok,
        worker: runSales.artifact?.worker || '',
      },
    },
    blockedCases,
  }
}
