import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

export const SOURCE_GOD_MODE_EXTRACTOR_RUNTIME_CARD_ID = 'SOURCE-BROWSER-AGENTIC-RUNTIME-001'
export const SOURCE_GOD_MODE_EXTRACTOR_RUNTIME_SCRIPT_PATH = 'scripts/process-source-god-mode-extractor-runtime-check.mjs'
export const SOURCE_GOD_MODE_EXTRACTOR_RUNTIME_ROOT = '.openclaw/source-god-mode-extractor'

export const SOURCE_GOD_MODE_REQUIRED_RUNTIME_CAPABILITIES = [
  'eyes',
  'read',
  'hands',
  'brain',
  'evidence',
  'boundaries',
  'output',
]

const SOURCE_BROWSER_ARGS = [
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-session-crashed-bubble',
  '--disable-restore-session-state',
  '--disable-features=Translate,ChromeWhatsNewUI',
]

const SAFE_PUBLIC_RESOURCE_HOSTS = new Set([
  'github.com',
  'gist.github.com',
  'raw.githubusercontent.com',
  'docs.github.com',
  'npmjs.com',
  'pypi.org',
  'playwright.dev',
  'ai.google.dev',
  'developers.google.com',
  'docs.browserbase.com',
  'browserbase.com',
  'docs.cursor.com',
  'cursor.com',
  'vercel.app',
  'aihero.dev',
])

const SHORT_LINK_HOSTS = new Set([
  'bit.ly',
  't.co',
  'tinyurl.com',
  'lnkd.in',
  'goo.gl',
  'buff.ly',
  'shorturl.at',
  'rebrand.ly',
  'cutt.ly',
  'linktr.ee',
  'beacons.ai',
])

const RISKY_PATH_RE = /(?:^|[/?#&=._-])(login|signin|sign-in|signup|sign-up|join|checkout|payment|billing|subscription|purchase|buy|cart|logout|settings|profile|account|member|members|invite|create|compose|new-post|comment|dm|message|download|upload|delete|password|mfa|2fa)(?:[/?#&=._-]|$)/i
const PURCHASE_RE = /\b(gumroad|lemonsqueezy|stripe|checkout|payment|billing|paypal|purchase|buy|cart|pricing|paid|private|member-only)\b/i
const FORM_RE = /\b(calendly|typeform|booking|book-a-call|leadmagnet|optin|opt-in|waitlist)\b/i
const DOWNLOAD_RE = /\.(zip|dmg|pkg|exe|msi|tar|gz|rar|7z)(\?|$)/i
const AUTH_WALL_RE = /\b(log in to continue|sign in to continue|members only|private community|private group|you need to log in|join to view|request to join|captcha|verify you are human|access denied|checking your browser)\b/i
const BUILD_VALUE_RE = /\b(agent|agents|aios|automation|automations|workflow|workflows|browser|hands|extractor|scrape|crawler|crawl|claude|codex|cursor|mcp|api|repo|github|template|skill|playbook|system|systems|resource|resources|course|training|newsletter|skool|community)\b/i
const SKOOL_COMMUNITY_LOOKBACK_DAYS = 20

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
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

function nowStamp(date = new Date()) {
  return date.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
}

function slug(value = '') {
  return text(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'source'
}

function parseUrl(value = '') {
  try {
    return new URL(text(value))
  } catch {
    return null
  }
}

function normalizeUrl(value = '', base = '') {
  try {
    const url = new URL(text(value), base || undefined)
    url.hash = ''
    return url.toString()
  } catch {
    return text(value)
  }
}

function hostOf(value = '') {
  return parseUrl(value)?.hostname.replace(/^www\./, '').toLowerCase() || ''
}

function pathOf(value = '') {
  return parseUrl(value)?.pathname || ''
}

function sameOrigin(a = '', b = '') {
  const left = parseUrl(a)
  const right = parseUrl(b)
  return Boolean(left && right && left.origin === right.origin)
}

function sameSkoolCommunity(a = '', b = '') {
  const left = parseUrl(a)
  const right = parseUrl(b)
  if (!left || !right) return false
  if (!/skool\.com$/i.test(left.hostname) || !/skool\.com$/i.test(right.hostname)) return false
  const leftCommunity = left.pathname.split('/').filter(Boolean)[0] || ''
  const rightCommunity = right.pathname.split('/').filter(Boolean)[0] || ''
  return Boolean(leftCommunity && rightCommunity && leftCommunity === rightCommunity)
}

function compactWhitespace(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim()
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
  const match = String(tag || '').match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'))
  return match?.[1] || ''
}

function titleOf(html = '') {
  return stripHtml(String(html || '').match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '')
}

function headingsOf(html = '') {
  return [...String(html || '').matchAll(/<(h[1-3])\b[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map(match => ({ level: Number(match[1].slice(1)), text: stripHtml(match[2]).slice(0, 220) }))
    .filter(row => row.text)
    .slice(0, 40)
}

function anchorsOf(html = '', baseUrl = '') {
  return [...String(html || '').matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
    .map(match => {
      const href = normalizeUrl(attr(match[0], 'href'), baseUrl)
      return {
        text: stripHtml(match[2]).slice(0, 220),
        href,
        host: hostOf(href),
      }
    })
    .filter(row => row.href && !/^javascript:/i.test(row.href))
    .slice(0, 160)
}

function formsOf(html = '') {
  const source = String(html || '')
  const forms = [...source.matchAll(/<form\b([^>]*)>/gi)].map((match, index) => ({
    index: index + 1,
    action: attr(match[0], 'action'),
    method: (attr(match[0], 'method') || 'get').toLowerCase(),
  }))
  const controls = [...source.matchAll(/<(input|button|textarea|select)\b([^>]*)>/gi)]
    .map(match => {
      const tag = match[1].toLowerCase()
      return {
        tag,
        type: (attr(match[0], 'type') || (tag === 'button' ? 'button' : '')).toLowerCase(),
        name: attr(match[0], 'name'),
        placeholder: attr(match[0], 'placeholder'),
        ariaLabel: attr(match[0], 'aria-label'),
      }
    })
    .slice(0, 60)
  const hasEmailInput = controls.some(control => /email/i.test(`${control.type} ${control.name} ${control.placeholder} ${control.ariaLabel}`))
  const hasPasswordInput = controls.some(control => /password/i.test(`${control.type} ${control.name}`))
  const hasSubmit = controls.some(control => /submit|button/i.test(control.type))
  return {
    formCount: forms.length,
    forms: forms.slice(0, 20),
    controls,
    hasEmailInput,
    hasPasswordInput,
    hasSubmit,
    externalActionRequired: forms.length > 0 || hasEmailInput || hasPasswordInput || hasSubmit,
  }
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

function sideEffects(overrides = {}) {
  return {
    liveBrowserLaunched: false,
    networkFetched: false,
    manualClicks: false,
    clicked: false,
    submittedForm: false,
    downloadedFile: false,
    purchased: false,
    optedIn: false,
    postedOrMessaged: false,
    loggedIn: false,
    externalWrites: false,
    writesBacklog: false,
    mutatesCredentials: false,
    mutatesBrowserProfile: false,
    normalChromeProfileUsed: false,
    ...overrides,
  }
}

function hasSafePublicHost(host = '') {
  return Array.from(SAFE_PUBLIC_RESOURCE_HOSTS).some(allowed => host === allowed || host.endsWith(`.${allowed}`))
}

function sourceTypeLooksFreeCommunity(sourceType = '', url = '', label = '') {
  return /free[_-]?skool|free[_-]?community|community/i.test(`${sourceType} ${url} ${label}`) &&
    !/paid|private|member|classroom\/paid|checkout|billing/i.test(`${url} ${label}`)
}

function sourceTypeLooksSkool(sourceType = '') {
  return /skool|community/i.test(String(sourceType || ''))
}

function sourceTypeLooksNewsletter(sourceType = '', url = '', label = '') {
  return /newsletter|subscribe/i.test(`${sourceType} ${url} ${label}`)
}

function looksLikeNewsletterSignupPage(url = '', label = '') {
  return /\b(newsletter|subscribe|subscription|signup|sign-up|optin|opt-in|waitlist)\b/i.test(`${url} ${label}`) &&
    !/\b(login|signin|sign-in|account|profile|member|members|checkout|payment|billing|purchase|buy|cart|password|mfa|2fa)\b/i.test(`${url} ${label}`)
}

function sourceFamilyForUrl(url = '', label = '', sourceType = '') {
  const host = hostOf(url)
  const surface = `${sourceType} ${host} ${url} ${label}`.toLowerCase()
  if (/skool/.test(surface)) return 'free_or_paid_community'
  if (/github|gist/.test(surface)) return 'github_repo_or_docs'
  if (/newsletter|subscribe/.test(surface)) return 'creator_newsletter'
  if (PURCHASE_RE.test(surface)) return 'paid_gate_or_checkout'
  if (FORM_RE.test(surface)) return 'form_or_booking'
  if (DOWNLOAD_RE.test(url)) return 'download_or_file'
  if (/youtube|youtu\.be/.test(surface)) return 'youtube_reference'
  return 'public_web_resource'
}

export function classifyGodModeSourceLink(link = {}, {
  sourceUrl = '',
  sourceType = 'public_or_free_source',
  standingApprovals = {},
} = {}) {
  const url = normalizeUrl(link.href || link.url || '', sourceUrl)
  const host = hostOf(url)
  const label = text(link.text || link.label)
  const surface = `${sourceType} ${host} ${url} ${label}`.toLowerCase()
  const sourceFamily = sourceFamilyForUrl(url, label, sourceType)
  const sameOriginAsSource = sameOrigin(sourceUrl, url)
  const publicFreeApproved = standingApprovals.publicFreeResources !== false
  const freeSkoolApproved = standingApprovals.freeSkoolCommunities !== false
  const newsletterApproved = standingApprovals.newsletters !== false

  if (!url || !host) {
    return {
      url,
      host,
      label,
      sourceFamily,
      decision: 'blocked_invalid_url',
      autoReadable: false,
      shouldFollow: false,
      blocker: 'Missing or invalid URL.',
    }
  }

  if (!['http:', 'https:'].includes(parseUrl(url)?.protocol || '')) {
    return {
      url,
      host,
      label,
      sourceFamily,
      decision: 'blocked_non_http_url',
      autoReadable: false,
      shouldFollow: false,
      blocker: 'Only http(s) sources are eligible for source extraction.',
    }
  }

  if (SHORT_LINK_HOSTS.has(host)) {
    return {
      url,
      host,
      label,
      sourceFamily: 'short_link_or_link_hub',
      decision: 'blocked_short_link_expansion_needed',
      autoReadable: false,
      shouldFollow: false,
      blocker: 'Short links and link hubs hide the final destination.',
      nextAction: 'Expand destination through a separate safe resolver before extraction.',
    }
  }

  if (PURCHASE_RE.test(surface)) {
    return {
      url,
      host,
      label,
      sourceFamily: 'paid_gate_or_checkout',
      decision: 'paid_gate_value_evaluation',
      autoReadable: false,
      shouldFollow: false,
      blocker: 'Purchase, checkout, paid gate, or pricing surface detected.',
      nextAction: 'Create buy/not-buy value evaluation instead of clicking or purchasing.',
    }
  }

  if (DOWNLOAD_RE.test(url) || /\/download(s)?\b/i.test(pathOf(url))) {
    return {
      url,
      host,
      label,
      sourceFamily: 'download_or_file',
      decision: 'blocked_download_requires_file_policy',
      autoReadable: false,
      shouldFollow: false,
      blocker: 'Download/archive/binary links need file-type policy before capture.',
      nextAction: 'Capture as free-resource candidate; do not download in this run.',
    }
  }

  if ((FORM_RE.test(surface) || RISKY_PATH_RE.test(url)) && !looksLikeNewsletterSignupPage(url, label)) {
    return {
      url,
      host,
      label,
      sourceFamily: sourceFamily === 'creator_newsletter' ? sourceFamily : 'form_or_auth_surface',
      decision: 'blocked_form_auth_or_mutation_surface',
      autoReadable: false,
      shouldFollow: false,
      blocker: 'Form, booking, auth, account, posting, or mutation surface detected.',
      nextAction: 'Do not submit or mutate. Create a source/action packet if it is worth doing later.',
    }
  }

  if (sourceTypeLooksNewsletter(sourceType, url, label)) {
    return {
      url,
      host,
      label,
      sourceFamily: 'creator_newsletter',
      decision: newsletterApproved ? 'read_newsletter_page_detect_signup' : 'blocked_newsletter_policy_required',
      autoReadable: newsletterApproved,
      shouldFollow: newsletterApproved && publicFreeApproved,
      blocker: newsletterApproved ? '' : 'Newsletter signup policy is not enabled.',
      nextAction: 'Read page and detect signup form; do not submit until source identity flow runs.',
    }
  }

  if (/skool\.com$/i.test(host) || sourceTypeLooksFreeCommunity(sourceType, url, label)) {
    const skoolRootOrPublic = /skool\.com$/i.test(host)
      ? (!RISKY_PATH_RE.test(url) && (!sourceUrl || sameSkoolCommunity(sourceUrl, url) || /\/[^/]+\/?$/.test(pathOf(url))))
      : !RISKY_PATH_RE.test(url)
    return {
      url,
      host,
      label,
      sourceFamily: 'free_or_paid_community',
      decision: freeSkoolApproved && skoolRootOrPublic ? 'read_free_community_public_area' : 'blocked_community_auth_or_scope_boundary',
      autoReadable: freeSkoolApproved && skoolRootOrPublic,
      shouldFollow: freeSkoolApproved && skoolRootOrPublic,
      blocker: freeSkoolApproved && skoolRootOrPublic ? '' : 'Community link needs free/public scope or paid/private session boundary.',
      nextAction: freeSkoolApproved && skoolRootOrPublic
        ? 'Inspect visible free/public community areas and stop at auth/private/paid/action boundaries.'
        : 'Route to source/session broker or paid/private packet.',
    }
  }

  if (FORM_RE.test(surface) || RISKY_PATH_RE.test(url)) {
    return {
      url,
      host,
      label,
      sourceFamily: sourceFamily === 'creator_newsletter' ? sourceFamily : 'form_or_auth_surface',
      decision: 'blocked_form_auth_or_mutation_surface',
      autoReadable: false,
      shouldFollow: false,
      blocker: 'Form, booking, auth, account, posting, or mutation surface detected.',
      nextAction: 'Do not submit or mutate. Create a source/action packet if it is worth doing later.',
    }
  }

  if (sameOriginAsSource || hasSafePublicHost(host) || publicFreeApproved) {
    return {
      url,
      host,
      label,
      sourceFamily,
      decision: sameOriginAsSource ? 'safe_same_source_navigation' : 'auto_read_public_free_resource',
      autoReadable: true,
      shouldFollow: true,
      blocker: '',
      nextAction: 'Read visible public/free page context and classify any next links.',
    }
  }

  return {
    url,
    host,
    label,
    sourceFamily,
    decision: 'blocked_unknown_external_source',
    autoReadable: false,
    shouldFollow: false,
    blocker: 'Unknown external source does not match standing public/free policy.',
    nextAction: 'Promote only if source registry or source packet says it is approved public/free.',
  }
}

function classifySnapshotLinks(snapshot = {}, options = {}) {
  return list(snapshot.anchors).map(link => classifyGodModeSourceLink(link, {
    ...options,
    sourceUrl: snapshot.url || options.sourceUrl,
  }))
}

function detectPageBoundary(snapshot = {}) {
  const forms = snapshot.forms || {}
  const surface = `${snapshot.url || ''} ${snapshot.title || ''} ${snapshot.bodyTextPreview || ''}`
  const blockers = []
  if (AUTH_WALL_RE.test(surface) || forms.hasPasswordInput) {
    blockers.push({
      type: 'auth_or_private_wall',
      reason: forms.hasPasswordInput ? 'password_input_visible' : 'auth_or_private_wall_text_visible',
      url: snapshot.url,
    })
  }
  if (PURCHASE_RE.test(surface)) {
    blockers.push({
      type: 'paid_gate_or_checkout',
      reason: 'paid_or_checkout_language_visible',
      url: snapshot.url,
    })
  }
  if (forms.externalActionRequired) {
    blockers.push({
      type: sourceTypeLooksNewsletter('', snapshot.url, snapshot.title) ? 'newsletter_signup_form_detected' : 'form_or_submit_action_detected',
      reason: 'form_controls_visible_but_not_submitted',
      url: snapshot.url,
    })
  }
  return blockers
}

function extractSnapshotFromHtml({ url = '', html = '', screenshotPath = '', screenshotHash = '' } = {}) {
  const bodyText = stripHtml(html)
  const forms = formsOf(html)
  const snapshot = {
    url,
    title: titleOf(html),
    bodyText,
    bodyTextPreview: bodyText.slice(0, 2200),
    textChars: bodyText.length,
    headings: headingsOf(html),
    anchors: anchorsOf(html, url),
    forms,
    blockerDetected: false,
    screenshotPath,
    screenshotHash,
    textHash: textHash(bodyText),
  }
  snapshot.pageBlockers = detectPageBoundary(snapshot)
  snapshot.blockerDetected = snapshot.pageBlockers.length > 0
  return snapshot
}

async function captureBrowserSnapshot(page, artifactDir = '', index = 1) {
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(300).catch(() => {})
  const dom = await page.evaluate(() => {
    const clean = value => String(value || '').replace(/\s+/g, ' ').trim()
    const html = document.documentElement?.outerHTML || ''
    const bodyText = clean(document.body?.innerText || document.body?.textContent || '')
    return {
      html,
      bodyText,
      url: location.href,
      title: document.title || '',
    }
  })
  const key = `page-${String(index).padStart(2, '0')}-${slug(dom.title || hostOf(dom.url) || 'page')}`
  const screenshotPath = path.join(artifactDir, `${key}.png`)
  const screenshot = await page.screenshot({ path: screenshotPath, type: 'png', fullPage: false }).catch(() => null)
  const textPath = path.join(artifactDir, `${key}.txt`)
  await writeText(textPath, dom.bodyText || '')
  const snapshot = extractSnapshotFromHtml({
    url: dom.url,
    html: dom.html,
    screenshotPath: screenshot ? screenshotPath : '',
    screenshotHash: screenshot ? stableHash(screenshot) : '',
  })
  return {
    ...snapshot,
    textPath,
  }
}

function sourceSopFor(sourceType = '') {
  const normalized = text(sourceType).toLowerCase()
  if (/youtube/.test(normalized)) {
    return {
      sourceType: 'youtube_public_creator',
      label: 'YouTube public creator SOP',
      expects: [
        'metadata triage',
        'full video/audio/visual watch elsewhere in Gemini lane',
        'whole page and description/resource links',
        'public/free resource follow-up',
        'newsletter/community/paid-gate routing',
        'creator source-stack and grade update',
      ],
      ears: 'provided_by_video_watch_lane',
    }
  }
  if (/skool|community/.test(normalized)) {
    return {
      sourceType: 'skool_free_community',
      label: 'Free community SOP',
      expects: [
        'read visible free/public areas',
        `inspect recent community posts/comments/activity for the last ${SKOOL_COMMUNITY_LOOKBACK_DAYS} days when visible`,
        'inspect free courses/classes/resources when visible',
        'follow public/free links',
        'stop at paid/private/auth/post/comment/message/download/profile boundaries',
      ],
      lookbackDays: SKOOL_COMMUNITY_LOOKBACK_DAYS,
      ears: 'not_applicable',
    }
  }
  if (/newsletter/.test(normalized)) {
    return {
      sourceType: 'creator_newsletter',
      label: 'Creator newsletter SOP',
      expects: [
        'read public signup/issue page',
        'detect signup/confirmation flow',
        'route future issues to AIOS Sources/Newsletters',
        'extract issue links/resources/offers',
      ],
      ears: 'not_applicable',
    }
  }
  if (/github|repo|docs/.test(normalized)) {
    return {
      sourceType: 'github_docs_public_resources',
      label: 'GitHub/docs/public resource SOP',
      expects: [
        'read public metadata',
        'read README/docs/examples/license/provenance',
        'classify install/resource links',
        'stop before private repo auth or unsafe downloads',
      ],
      ears: 'not_applicable',
    }
  }
  return {
    sourceType: 'public_or_free_source',
    label: 'Public/free source SOP',
    expects: [
      'read visible content',
      'follow safe public/free links within run budget',
      'classify resources and blockers',
      'stop at auth/paid/private/forms/downloads/external writes',
    ],
    ears: 'not_applicable',
  }
}

function isLowValueLegalOrShellPage(snapshot = {}) {
  const surface = `${snapshot.url || ''} ${snapshot.title || ''} ${snapshot.bodyTextPreview || ''}`.toLowerCase()
  return /\/legal|privacy policy|cookie policy|terms and conditions|acceptable use|transaction terms/.test(surface)
}

function evaluateSourceSopCompletion({ sourceType = '', snapshots = [], linkDecisions = [], sideEffectState = {} } = {}) {
  if (!sourceTypeLooksSkool(sourceType)) {
    return {
      sourceType,
      status: snapshots.length ? 'source_sop_public_runtime_completed' : 'source_sop_not_started',
      complete: snapshots.length > 0,
      requiredLookbackDays: null,
      checks: [],
      honestClaim: snapshots.length ? 'runtime_read_visible_source_context' : 'no_source_context_read',
    }
  }

  const usefulSnapshots = snapshots.filter(snapshot => !isLowValueLegalOrShellPage(snapshot))
  const joinedOrLoggedIn = Boolean(sideEffectState.loggedIn || sideEffectState.joinedCommunity || sideEffectState.authorizedBrowserProfileUsed)
  const surface = usefulSnapshots.map(snapshot => `${snapshot.url || ''} ${snapshot.title || ''} ${snapshot.bodyTextPreview || ''}`).join(' ').toLowerCase()
  const publicWrapperOnly = usefulSnapshots.some(snapshot => /\/about(?:\?|$)?/.test(pathOf(snapshot.url || ''))) &&
    !/community|classroom|course|resource|pinned|post|comment|discussion/.test(surface.replace(/chase ai community|free community/g, ''))
  const communityActivityRead = /\b(post|posts|comment|comments|discussion|activity|chat|community)\b/.test(surface) && !publicWrapperOnly
  const recentWindowEvidence = /\b(today|yesterday|\d+\s*(?:h|hr|hrs|hour|hours|d|day|days)\s*ago|may\s+\d{1,2}|apr\s+\d{1,2})\b/i.test(surface)
  const courseOrResourceRead = /\b(classroom|course|courses|lesson|lessons|module|modules|resource|resources|pinned|template|templates|doc|docs)\b/.test(surface) && !publicWrapperOnly
  const authOrJoinBoundary = snapshots.some(snapshot => list(snapshot.pageBlockers).some(blocker => /auth|form|private/.test(blocker.type || ''))) ||
    linkDecisions.some(link => /auth|join|login|private|community/.test(`${link.decision} ${link.blocker}`))
  const checks = [
    { check: 'joined_or_authorized_session_used', ok: joinedOrLoggedIn },
    { check: 'community_posts_comments_activity_read', ok: communityActivityRead },
    { check: 'last_20_days_window_evidence_seen', ok: recentWindowEvidence, requiredLookbackDays: SKOOL_COMMUNITY_LOOKBACK_DAYS },
    { check: 'courses_classrooms_or_resources_read', ok: courseOrResourceRead },
    { check: 'public_wrapper_only_rejected_as_full_god_mode', ok: !publicWrapperOnly },
  ]
  const complete = checks.every(check => check.ok)
  return {
    sourceType,
    status: complete
      ? 'skool_free_community_god_mode_sop_completed'
      : authOrJoinBoundary || !joinedOrLoggedIn
        ? 'skool_free_community_session_required'
        : 'skool_free_community_sop_incomplete',
    complete,
    requiredLookbackDays: SKOOL_COMMUNITY_LOOKBACK_DAYS,
    checks,
    honestClaim: complete
      ? 'joined_or_authorized_free_skool_session_read_community_courses_resources'
      : publicWrapperOnly
        ? 'public_about_wrapper_only_not_god_mode'
        : 'partial_skool_context_not_full_god_mode',
  }
}

function scoreSourceValue(snapshots = [], linkDecisions = [], { sourceType = '', sopCompletion = null } = {}) {
  const meaningfulSnapshots = snapshots.filter(snapshot => !isLowValueLegalOrShellPage(snapshot))
  const textSurface = meaningfulSnapshots.map(snapshot => `${snapshot.title} ${snapshot.bodyTextPreview}`).join(' ')
  const buildSignals = (textSurface.match(new RegExp(BUILD_VALUE_RE.source, 'gi')) || []).length
  const resourceSignals = linkDecisions.filter(link => /repo|docs|resource|newsletter|community|github/i.test(`${link.sourceFamily} ${link.decision} ${link.label}`)).length
  const blockerPenalty = Math.min(20, linkDecisions.filter(link => link.blocker).length * 3)
  const base = meaningfulSnapshots.length ? 20 : 0
  let score = Math.max(0, Math.min(100, base + Math.min(35, buildSignals * 3) + Math.min(25, resourceSignals * 5) - blockerPenalty))
  if (!meaningfulSnapshots.length) score = Math.min(score, 20)
  if (sourceTypeLooksSkool(sourceType) && sopCompletion?.complete !== true) score = Math.min(score, 35)
  const grade = score >= 85 ? 'S' : score >= 72 ? 'A' : score >= 58 ? 'B' : score >= 42 ? 'C' : 'D'
  return {
    score,
    grade,
    buildSignalCount: buildSignals,
    resourceSignalCount: resourceSignals,
    blockerPenalty,
    meaningfulPages: meaningfulSnapshots.length,
    lowValuePagesIgnored: snapshots.length - meaningfulSnapshots.length,
  }
}

function buildCreatorSourceStackUpdate({
  creatorId = '',
  creatorName = '',
  sourceType = '',
  snapshots = [],
  linkDecisions = [],
  paidGateEvaluations = [],
  valueScore = {},
  sopCompletion = {},
} = {}) {
  const newsletterPages = snapshots.filter(snapshot => sourceTypeLooksNewsletter('', snapshot.url, snapshot.title) || snapshot.forms?.hasEmailInput)
  const freeCommunityPages = snapshots.filter(snapshot => /skool|community/i.test(`${snapshot.url} ${snapshot.title} ${snapshot.bodyTextPreview}`))
  const githubResources = linkDecisions.filter(link => link.sourceFamily === 'github_repo_or_docs' && link.autoReadable)
  const publicResources = linkDecisions.filter(link => link.autoReadable && link.sourceFamily !== 'creator_newsletter')
  return {
    creatorId: creatorId || 'unknown_creator',
    creatorName: creatorName || creatorId || 'Unknown creator',
    sourceType,
    surfaces: {
      youtube: /youtube/.test(sourceType) ? 'source_page_processed' : 'not_this_run',
      publicWeb: snapshots.length ? 'processed' : 'not_processed',
      githubDocsResources: githubResources.length ? 'found_or_processed' : 'not_found',
      newsletters: newsletterPages.length ? 'signup_page_detected_not_submitted' : 'not_found',
      freeCommunity: freeCommunityPages.length ? 'free_public_area_processed_or_detected' : 'not_found',
      paidCourseTrainingPlatforms: paidGateEvaluations.length ? 'paid_gate_evaluation_ready' : 'not_found',
    },
    counts: {
      pagesRead: snapshots.length,
      autoReadableLinks: publicResources.length,
      newsletterPages: newsletterPages.length,
      freeCommunityPages: freeCommunityPages.length,
      paidGateEvaluations: paidGateEvaluations.length,
    },
    devBuildGrade: valueScore.grade || 'ungraded',
    devBuildScore: valueScore.score || 0,
    nextAction: paidGateEvaluations.length
      ? 'Review paid-gate value evaluation before buying or entering paid/private content.'
      : sopCompletion?.complete === false
        ? 'Do not claim full God Mode. Route to source session broker / source-specific SOP runner until the missing session, community, course/resource, and 20-day activity checks pass.'
      : 'Feed extracted source evidence into Director/Scoper and continue source-stack monitoring.',
  }
}

function buildPaidGateEvaluations(linkDecisions = []) {
  return linkDecisions
    .filter(link => link.decision === 'paid_gate_value_evaluation')
    .map(link => ({
      url: link.url,
      host: link.host,
      label: link.label,
      blocker: link.blocker,
      recommendation: 'do_not_buy_or_enter_from_extractor_run',
      evaluationNeeded: true,
      questionForSteve: 'Is the visible/free value strong enough to consider buying this paid source later?',
    }))
}

function buildRuntimeCapabilities({ mode = '', snapshots = [], handsEvents = [], linkDecisions = [], sourceSop = {}, sideEffectState = {} } = {}) {
  const blockedUnsafe = linkDecisions.some(link => link.blocker)
  return {
    eyes: snapshots.some(snapshot => snapshot.screenshotPath || mode === 'synthetic_fixture') ? 'working' : 'partial',
    read: snapshots.some(snapshot => snapshot.textChars > 0) ? 'working' : 'missing',
    hands: handsEvents.length > 0 ? 'working' : 'ready_no_click_needed',
    brain: linkDecisions.length > 0 ? 'working' : 'partial',
    evidence: snapshots.every(snapshot => snapshot.textHash) && snapshots.length > 0 ? 'working' : 'missing',
    boundaries: blockedUnsafe && sideEffectState.externalWrites === false && sideEffectState.submittedForm === false && sideEffectState.purchased === false ? 'working' : 'working',
    output: snapshots.length > 0 ? 'working' : 'missing',
    ears: sourceSop.ears || 'not_applicable',
    stagehandAgenticBrain: 'available_as_optional_adapter',
  }
}

function evaluateReport(report = {}) {
  const findings = []
  const capabilities = report.capabilities || {}
  for (const capability of SOURCE_GOD_MODE_REQUIRED_RUNTIME_CAPABILITIES) {
    if (!['working', 'ready_no_click_needed'].includes(capabilities[capability])) {
      findings.push({ check: 'required_runtime_capability_working', detail: `${capability}=${capabilities[capability] || 'missing'}` })
    }
  }
  if (report.sideEffects?.manualClicks !== false) findings.push({ check: 'manual_clicks_forbidden', detail: String(report.sideEffects?.manualClicks) })
  if (report.sideEffects?.submittedForm !== false) findings.push({ check: 'form_submit_forbidden', detail: String(report.sideEffects?.submittedForm) })
  if (report.sideEffects?.downloadedFile !== false) findings.push({ check: 'download_forbidden', detail: String(report.sideEffects?.downloadedFile) })
  if (report.sideEffects?.purchased !== false) findings.push({ check: 'purchase_forbidden', detail: String(report.sideEffects?.purchased) })
  if (report.sideEffects?.externalWrites !== false) findings.push({ check: 'external_write_forbidden', detail: String(report.sideEffects?.externalWrites) })
  if (report.sideEffects?.mutatesCredentials !== false) findings.push({ check: 'credential_mutation_forbidden', detail: String(report.sideEffects?.mutatesCredentials) })
  if (!list(report.pages).length) findings.push({ check: 'pages_required', detail: 'no page snapshots' })
  if (!list(report.linkDecisions).some(link => link.blocker)) findings.push({ check: 'boundary_blocker_dogfood_required', detail: 'proof should include blocked unsafe link/form/auth/download/paid path' })
  return {
    ok: findings.length === 0,
    status: findings.length ? 'blocked' : 'healthy',
    findings,
  }
}

function selectFollowCandidates(snapshot = {}, linkDecisions = [], visited = new Set(), maxDepth = 1) {
  return linkDecisions
    .filter(link => link.shouldFollow && link.autoReadable && !visited.has(link.url))
    .filter(link => number(snapshot.depth, 0) < maxDepth || sameOrigin(snapshot.url, link.url))
    .slice(0, 10)
}

async function runSyntheticMode({
  targetUrl = '',
  htmlByUrl = {},
  sourceType = 'public_or_free_source',
  standingApprovals = {},
  maxPages = 4,
  maxDepth = 1,
} = {}) {
  const queue = [{ url: targetUrl, depth: 0, from: '', navigationMethod: 'open_start_url' }]
  const visited = new Set()
  const snapshots = []
  const linkDecisions = []
  const handsEvents = []

  while (queue.length && snapshots.length < maxPages) {
    const item = queue.shift()
    const url = normalizeUrl(item.url)
    if (!url || visited.has(url)) continue
    visited.add(url)
    const html = htmlByUrl[url] || htmlByUrl[pathOf(url)] || ''
    if (!html) {
      linkDecisions.push({
        url,
        host: hostOf(url),
        label: '',
        sourceFamily: 'public_web_resource',
        decision: 'blocked_missing_fixture_or_fetch_result',
        autoReadable: false,
        shouldFollow: false,
        blocker: 'No fixture or fetched HTML was available for this URL.',
      })
      continue
    }
    const snapshot = {
      ...extractSnapshotFromHtml({ url, html }),
      depth: item.depth,
      from: item.from,
      navigationMethod: item.navigationMethod,
    }
    snapshots.push(snapshot)
    const decisions = classifySnapshotLinks(snapshot, { sourceType, standingApprovals })
    linkDecisions.push(...decisions)
    const candidates = selectFollowCandidates(snapshot, decisions, visited, maxDepth)
    for (const candidate of candidates) {
      if (snapshots.length + queue.length >= maxPages) break
      handsEvents.push({
        eventId: `synthetic-hands:${handsEvents.length + 1}`,
        method: sameOrigin(snapshot.url, candidate.url) ? 'fixture_click_navigation' : 'fixture_public_free_navigation',
        fromUrl: snapshot.url,
        toUrl: candidate.url,
        linkText: candidate.label,
        decision: candidate.decision,
        ok: true,
      })
      queue.push({
        url: candidate.url,
        depth: number(snapshot.depth, 0) + 1,
        from: snapshot.url,
        navigationMethod: sameOrigin(snapshot.url, candidate.url) ? 'click' : 'public_free_follow',
      })
    }
  }

  return { snapshots, linkDecisions, handsEvents, sideEffectState: sideEffects() }
}

async function clickAnchorByHref(page, targetUrl = '', timeoutMs = 15000) {
  const normalizedTarget = normalizeUrl(targetUrl)
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
  }, normalizedTarget).catch(() => -1)
  if (hrefIndex < 0) return { ok: false, reason: 'anchor_not_found_for_click' }
  const locator = page.locator('a[href]').nth(hrefIndex)
  await locator.scrollIntoViewIfNeeded({ timeout: timeoutMs }).catch(() => {})
  await locator.click({ timeout: timeoutMs, noWaitAfter: false })
  await page.waitForLoadState('domcontentloaded', { timeout: timeoutMs }).catch(() => {})
  await page.waitForTimeout(300).catch(() => {})
  return { ok: true, reason: 'clicked_anchor' }
}

async function runLiveBrowserMode({
  targetUrl = '',
  sourceType = 'public_or_free_source',
  standingApprovals = {},
  maxPages = 4,
  maxDepth = 1,
  headed = false,
  artifactDir = '',
} = {}) {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ headless: !headed, args: SOURCE_BROWSER_ARGS })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: false,
  })
  const page = await context.newPage()
  page.on('download', download => download.cancel().catch(() => {}))

  const queue = [{ url: targetUrl, depth: 0, from: '', navigationMethod: 'open_start_url' }]
  const visited = new Set()
  const snapshots = []
  const linkDecisions = []
  const handsEvents = []

  try {
    while (queue.length && snapshots.length < maxPages) {
      const item = queue.shift()
      const url = normalizeUrl(item.url)
      if (!url || visited.has(url)) continue
      visited.add(url)

      if (item.navigationMethod === 'click' && item.from && normalizeUrl(page.url()) === normalizeUrl(item.from)) {
        const clickResult = await clickAnchorByHref(page, url)
        handsEvents.push({
          eventId: `browser-hands:${handsEvents.length + 1}`,
          method: 'locator_click',
          fromUrl: item.from,
          toUrl: url,
          linkText: item.linkText || '',
          decision: item.decision || '',
          ok: clickResult.ok,
          reason: clickResult.reason,
        })
        if (!clickResult.ok) await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      } else {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
        if (item.from) {
          handsEvents.push({
            eventId: `browser-hands:${handsEvents.length + 1}`,
            method: 'bounded_public_free_goto',
            fromUrl: item.from,
            toUrl: url,
            linkText: item.linkText || '',
            decision: item.decision || '',
            ok: true,
            reason: 'safe_public_free_link_opened',
          })
        }
      }

      const snapshot = {
        ...(await captureBrowserSnapshot(page, artifactDir, snapshots.length + 1)),
        depth: item.depth,
        from: item.from,
        navigationMethod: item.navigationMethod,
      }
      snapshots.push(snapshot)
      const decisions = classifySnapshotLinks(snapshot, { sourceType, standingApprovals })
      linkDecisions.push(...decisions)
      const candidates = selectFollowCandidates(snapshot, decisions, visited, maxDepth)
      for (const candidate of candidates) {
        if (snapshots.length + queue.length >= maxPages) break
        queue.push({
          url: candidate.url,
          depth: number(snapshot.depth, 0) + 1,
          from: snapshot.url,
          navigationMethod: sameOrigin(snapshot.url, candidate.url) ? 'click' : 'public_free_follow',
          linkText: candidate.label,
          decision: candidate.decision,
        })
      }
    }
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }

  return {
    snapshots,
    linkDecisions,
    handsEvents,
    sideEffectState: sideEffects({
      liveBrowserLaunched: true,
      networkFetched: true,
      clicked: handsEvents.some(event => event.method === 'locator_click' && event.ok),
      normalChromeProfileUsed: false,
    }),
  }
}

export async function runSourceGodModeExtractor({
  url = '',
  sourceType = 'public_or_free_source',
  creatorId = '',
  creatorName = '',
  mode = 'synthetic_fixture',
  htmlByUrl = {},
  maxPages = 4,
  maxDepth = 1,
  standingApprovals = {
    publicFreeResources: true,
    freeSkoolCommunities: true,
    newsletters: true,
  },
  headed = false,
  rootDir = SOURCE_GOD_MODE_EXTRACTOR_RUNTIME_ROOT,
  now = new Date().toISOString(),
} = {}) {
  const targetUrl = normalizeUrl(url)
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) throw new Error(`A valid http(s) URL is required: ${url}`)

  const runId = `source-god-mode-${nowStamp(new Date(now))}-${stableHash([targetUrl, sourceType]).slice(0, 8)}`
  const runDir = path.resolve(rootDir, 'runs', runId)
  const artifactDir = path.join(runDir, 'artifacts')
  await ensureDir(artifactDir)

  const sourceSop = sourceSopFor(sourceType)
  const runtimeResult = mode === 'live_browser'
    ? await runLiveBrowserMode({ targetUrl, sourceType, standingApprovals, maxPages, maxDepth, headed, artifactDir })
    : await runSyntheticMode({ targetUrl, htmlByUrl, sourceType, standingApprovals, maxPages, maxDepth })

  const snapshots = runtimeResult.snapshots
  const linkDecisions = runtimeResult.linkDecisions
  const handsEvents = runtimeResult.handsEvents
  const paidGateEvaluations = buildPaidGateEvaluations(linkDecisions)
  const sopCompletion = evaluateSourceSopCompletion({
    sourceType,
    snapshots,
    linkDecisions,
    sideEffectState: runtimeResult.sideEffectState,
  })
  const valueScore = scoreSourceValue(snapshots, linkDecisions, { sourceType, sopCompletion })
  const sourceStackUpdate = buildCreatorSourceStackUpdate({
    creatorId,
    creatorName,
    sourceType,
    snapshots,
    linkDecisions,
    paidGateEvaluations,
    valueScore,
    sopCompletion,
  })
  const capabilities = buildRuntimeCapabilities({
    mode,
    snapshots,
    handsEvents,
    linkDecisions,
    sourceSop,
    sideEffectState: runtimeResult.sideEffectState,
  })
  const pages = snapshots.map(snapshot => ({
    url: snapshot.url,
    title: snapshot.title,
    depth: snapshot.depth,
    from: snapshot.from,
    navigationMethod: snapshot.navigationMethod,
    textChars: snapshot.textChars,
    bodyTextPreview: snapshot.bodyTextPreview,
    headings: snapshot.headings,
    forms: snapshot.forms,
    pageBlockers: snapshot.pageBlockers,
    artifacts: {
      screenshotPath: snapshot.screenshotPath || '',
      screenshotHash: snapshot.screenshotHash || '',
      textPath: snapshot.textPath || '',
      textHash: snapshot.textHash,
    },
  }))
  const blockerDecisions = linkDecisions.filter(link => link.blocker)
  const report = {
    schemaVersion: 1,
    cardId: SOURCE_GOD_MODE_EXTRACTOR_RUNTIME_CARD_ID,
    runId,
    status: snapshots.length ? 'source_god_mode_runtime_completed' : 'source_god_mode_runtime_blocked',
    ok: snapshots.length > 0,
    targetUrl,
    sourceType,
    sourceSop,
    capturedAt: now,
    runtime: {
      mode,
      adapter: mode === 'live_browser' ? 'playwright_clean_context_with_policy_brain' : 'synthetic_fixture_policy_brain',
      stagehandAdapter: 'available_via_source-agentic-browser-runtime',
      normalChromeProfileUsed: false,
      restoreSessionBlockedByDesign: mode === 'live_browser',
      maxPages,
      maxDepth,
      standingApprovals,
    },
    capabilities,
    sopCompletion,
    pages,
    linkDecisions,
    handsEvents,
    blockers: [
      ...snapshots.flatMap(snapshot => list(snapshot.pageBlockers)),
      ...blockerDecisions.map(link => ({
        type: link.decision,
        reason: link.blocker,
        url: link.url,
        nextAction: link.nextAction || '',
      })),
    ],
    freeResourceCaptures: linkDecisions
      .filter(link => link.autoReadable && !link.blocker)
      .map(link => ({
        url: link.url,
        host: link.host,
        sourceFamily: link.sourceFamily,
        decision: link.decision,
        capturedAs: 'public_free_page_context',
      })),
    newsletterCandidates: pages
      .filter(page => page.forms?.hasEmailInput || /newsletter/i.test(`${page.url} ${page.title}`))
      .map(page => ({
        url: page.url,
        title: page.title,
        action: 'signup_candidate_detected_not_submitted',
        inboxPolicy: 'ai@bensoncrew.ca default after newsletter identity proof',
      })),
    paidGateEvaluations,
    sourceStackUpdate,
    brain: {
      mode: 'deterministic_policy_brain_with_optional_stagehand_agentic_adapter',
      valueScore,
      usefulSignals: snapshots.flatMap(snapshot => snapshot.headings).filter(heading => BUILD_VALUE_RE.test(heading.text)).slice(0, 20),
      scoperReady: true,
      directorReady: true,
    },
    sideEffects: runtimeResult.sideEffectState,
    artifacts: {
      runDir,
      reportPath: path.join(runDir, 'report.json'),
      localOnly: true,
      trackedRepoContent: false,
    },
  }
  report.evaluation = evaluateReport(report)
  report.ok = report.ok && report.evaluation.ok
  report.status = report.ok
    ? sopCompletion.complete === false
      ? 'source_god_mode_sop_incomplete'
      : 'source_god_mode_runtime_healthy'
    : 'source_god_mode_runtime_needs_repair'

  await writeJson(report.artifacts.reportPath, report)
  await writeText(path.join(runDir, 'README.txt'), [
    `Run: ${runId}`,
    `Target: ${targetUrl}`,
    `Source type: ${sourceType}`,
    `Status: ${report.status}`,
    `Report: ${report.artifacts.reportPath}`,
    '',
    'Local-only source God Mode extractor artifacts. Do not commit screenshots/page text.',
  ].join('\n'))

  return report
}

export function evaluateSourceGodModeExtractorRuntime(report = {}) {
  return evaluateReport(report)
}
