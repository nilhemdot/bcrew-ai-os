import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import {
  SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
  buildSourceSessionBrokerAuthNeededEvent,
} from './source-session-broker.js'

export const SKOOL_FREE_COMMUNITY_GOD_MODE_CARD_ID = 'FREE-SKOOL-COMMUNITY-GOD-MODE-RUNNER-001'
export const SKOOL_FREE_COMMUNITY_GOD_MODE_SCRIPT_PATH = 'scripts/process-skool-free-community-god-mode-runner-check.mjs'
export const SKOOL_FREE_COMMUNITY_GOD_MODE_ROOT = '.openclaw/skool-free-community-god-mode'
export const SKOOL_FREE_COMMUNITY_LOOKBACK_DAYS = 20
export const SKOOL_FREE_COMMUNITY_DEFAULT_PROFILE_ROOT = '.openclaw/source-session-broker/profiles'

const SOURCE_BROWSER_ARGS = [
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-session-crashed-bubble',
  '--disable-restore-session-state',
  '--disable-features=Translate,ChromeWhatsNewUI',
]

const RISKY_URL_RE = /(?:^|[/?#&=._-])(checkout|payment|billing|subscription|purchase|buy|cart|stripe|paypal|gumroad|logout|signout|sign-out|delete|remove|account|settings|profile|profiles|invite|create|compose|new-post|new_comment|upload|download)(?:[/?#&=._-]|$)/i
const AUTH_URL_RE = /(?:^|[/?#&=._-])(login|signin|sign-in|signup|sign-up|auth|oauth|mfa|2fa|captcha)(?:[/?#&=._-]|$)/i
const DOWNLOAD_URL_RE = /\.(zip|dmg|pkg|exe|msi|tar|gz|rar|7z)(\?|$)/i
const AUTH_RE = /\b(log in|login|sign in|sign up|continue with google|password|mfa|2fa|captcha|verify you are human|private community|members only|join to view|request to join)\b/i
const COMMUNITY_NAV_RE = /\b(community|classroom|course|courses|lesson|lessons|resource|resources|about|home)\b/i
const POST_COMMENT_RE = /\b(post|posts|comment|comments|reply|replies|discussion|activity|chat)\b/i
const COURSE_RESOURCE_RE = /\b(classroom|course|courses|lesson|lessons|module|modules|resource|resources|pinned|template|templates|doc|docs|link|links)\b/i

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function bool(value) {
  return value === true || value === 'true' || value === '1'
}

function slug(value = '') {
  return text(value).toLowerCase().replace(/[^a-z0-9@._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'source'
}

function stableHash(value = '') {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex')
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
    const url = new URL(text(value), base || undefined)
    url.hash = ''
    return url.toString()
  } catch {
    return text(value)
  }
}

function hostOf(value = '') {
  return parseUrl(value)?.hostname.toLowerCase() || ''
}

function firstPathSegment(value = '') {
  return parseUrl(value)?.pathname.split('/').filter(Boolean)[0] || ''
}

function isSkoolUrl(value = '') {
  return /(^|\.)skool\.com$/i.test(hostOf(value))
}

function isLocalFixtureUrl(value = '') {
  const host = hostOf(value)
  return host === '127.0.0.1' || host === 'localhost'
}

function isAllowedTargetUrl(value = '', allowLocalFixture = false) {
  return isSkoolUrl(value) || (allowLocalFixture && isLocalFixtureUrl(value))
}

function isSameCommunityUrl(value = '', sourceUrl = '') {
  const target = parseUrl(value)
  const source = parseUrl(sourceUrl)
  if (!target || !source) return false
  if (target.origin !== source.origin) return false
  const targetCommunity = firstPathSegment(value)
  const sourceCommunity = firstPathSegment(sourceUrl)
  return Boolean(targetCommunity && sourceCommunity && targetCommunity === sourceCommunity)
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

function daysBetween(now = new Date(), dateValue = '') {
  const parsed = new Date(dateValue)
  if (!Number.isFinite(parsed.getTime())) return null
  return Math.floor((now.getTime() - parsed.getTime()) / 86400000)
}

function classifyLink(link = {}, sourceUrl = '') {
  const url = normalizeUrl(link.href || link.url || '', sourceUrl)
  const label = text(link.text || link.label)
  if (!url || !parseUrl(url)) {
    return { url, label, decision: 'blocked_invalid_url', shouldVisit: false, blocker: 'invalid_url' }
  }
  if (!/^https?:$/i.test(parseUrl(url).protocol)) {
    return { url, label, decision: 'blocked_non_http_url', shouldVisit: false, blocker: 'non_http_url' }
  }
  if (RISKY_URL_RE.test(url) || AUTH_URL_RE.test(url) || DOWNLOAD_URL_RE.test(url)) {
    return { url, label, decision: 'blocked_auth_write_purchase_download_or_account_surface', shouldVisit: false, blocker: 'risky_url' }
  }
  if (isSameCommunityUrl(url, sourceUrl) && COMMUNITY_NAV_RE.test(`${label} ${url}`)) {
    return { url, label, decision: 'same_community_sop_navigation', shouldVisit: true, blocker: '' }
  }
  if (isSameCommunityUrl(url, sourceUrl)) {
    return { url, label, decision: 'same_community_reference', shouldVisit: false, blocker: '' }
  }
  return { url, label, decision: 'safe_external_resource_candidate', shouldVisit: false, blocker: '' }
}

function authStateFromSnapshot(snapshot = {}) {
  const surface = `${snapshot.url || ''} ${snapshot.title || ''} ${snapshot.bodyTextPreview || ''} ${list(snapshot.buttons).map(row => row.text).join(' ')}`.toLowerCase()
  const authNeeded = Boolean(snapshot.hasEmailInput || snapshot.hasPasswordInput || AUTH_RE.test(surface))
  return {
    status: authNeeded ? 'auth_needed' : 'session_or_public_content_visible',
    authNeeded,
    reason: authNeeded
      ? snapshot.hasPasswordInput
        ? 'password_input_visible'
        : 'login_join_or_verification_surface_visible'
      : 'content_visible_without_auth_wall',
  }
}

async function captureSkoolSnapshot(page, { artifactDir = '', sourceUrl = '', index = 1, now = new Date() } = {}) {
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(900).catch(() => {})
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let steps = 0
      const timer = setInterval(() => {
        window.scrollBy(0, Math.max(400, Math.floor(window.innerHeight * 0.65)))
        steps += 1
        if (steps >= 5 || window.scrollY + window.innerHeight >= document.body.scrollHeight) {
          clearInterval(timer)
          resolve()
        }
      }, 180)
    })
    window.scrollTo(0, 0)
  }).catch(() => {})

  const snapshot = await page.evaluate(() => {
    const clean = value => String(value || '').replace(/\s+/g, ' ').trim()
    const attr = (element, name) => element.getAttribute(name) || ''
    const activitySelectors = [
      '[data-activity-date]',
      '[data-post-date]',
      '[data-comment-date]',
      '[data-kind="post"]',
      '[data-kind="comment"]',
      'article',
      '[role="article"]',
    ].join(',')
    const bodyText = clean(document.body?.innerText || document.body?.textContent || '')
    return {
      url: location.href,
      title: document.title || '',
      bodyText,
      bodyTextPreview: bodyText.slice(0, 2400),
      textChars: bodyText.length,
      headings: [...document.querySelectorAll('h1,h2,h3')].map(heading => ({
        level: Number(heading.tagName.slice(1)),
        text: clean(heading.innerText || heading.textContent).slice(0, 220),
      })).filter(row => row.text).slice(0, 80),
      anchors: [...document.querySelectorAll('a[href]')].map(anchor => ({
        href: anchor.href || attr(anchor, 'href'),
        text: clean(anchor.innerText || anchor.textContent).slice(0, 220),
      })).slice(0, 180),
      buttons: [...document.querySelectorAll('button,[role="button"],input[type="submit"],input[type="button"],a')].map(element => ({
        text: clean(element.innerText || element.value || element.textContent || attr(element, 'aria-label')).slice(0, 180),
        href: element.href || attr(element, 'href'),
        type: attr(element, 'type'),
        role: attr(element, 'role'),
      })).filter(row => row.text).slice(0, 100),
      forms: [...document.querySelectorAll('form')].map(form => ({
        action: form.action || attr(form, 'action'),
        method: attr(form, 'method') || 'get',
        inputCount: form.querySelectorAll('input,textarea,select,button').length,
        text: clean(form.innerText || form.textContent).slice(0, 220),
      })).slice(0, 20),
      hasEmailInput: document.querySelectorAll('input[type="email"], input[name*="email" i], input[autocomplete="username"]').length > 0,
      hasPasswordInput: document.querySelectorAll('input[type="password"], input[autocomplete="current-password"]').length > 0,
      activityItems: [...document.querySelectorAll(activitySelectors)].map(element => ({
        kind: attr(element, 'data-kind') || (element.matches('[data-comment-date]') ? 'comment' : element.matches('[data-post-date]') ? 'post' : 'activity'),
        date: attr(element, 'data-activity-date') || attr(element, 'data-post-date') || attr(element, 'data-comment-date') || attr(element, 'datetime'),
        text: clean(element.innerText || element.textContent).slice(0, 800),
      })).filter(row => row.text).slice(0, 80),
    }
  })

  const key = `page-${String(index).padStart(2, '0')}-${slug(snapshot.title || firstPathSegment(snapshot.url) || 'skool')}`
  const screenshotPath = path.join(artifactDir, `${key}.png`)
  const screenshot = await page.screenshot({ path: screenshotPath, type: 'png', fullPage: false }).catch(() => null)
  const textPath = path.join(artifactDir, `${key}.txt`)
  await writeText(textPath, snapshot.bodyText.slice(0, 50000))

  const linkClassifications = list(snapshot.anchors).map(link => classifyLink(link, sourceUrl || snapshot.url))
  const activityItems = list(snapshot.activityItems).map(item => ({
    ...item,
    daysAgo: daysBetween(now, item.date),
    withinLookback: daysBetween(now, item.date) != null && daysBetween(now, item.date) <= SKOOL_FREE_COMMUNITY_LOOKBACK_DAYS,
  }))

  return {
    ...snapshot,
    authState: authStateFromSnapshot(snapshot),
    linkClassifications,
    activityItems,
    textPath,
    textHash: stableHash(snapshot.bodyText),
    screenshotPath: screenshot ? screenshotPath : '',
    screenshotHash: screenshot ? stableHash(screenshot) : '',
  }
}

async function clickFirstJoin(page) {
  const locators = [
    'button:has-text("JOIN GROUP")',
    'a:has-text("JOIN GROUP")',
    'button:has-text("Join Group")',
    'a:has-text("Join Group")',
    'button:has-text("Join")',
    'a:has-text("Join")',
  ]
  const beforeUrl = normalizeUrl(page.url())
  for (const selector of locators) {
    const locator = page.locator(selector).first()
    if (!(await locator.isVisible({ timeout: 1000 }).catch(() => false))) continue
    await locator.click({ timeout: 5000, noWaitAfter: false }).catch(error => {
      throw new Error(`join click failed for ${selector}: ${error.message}`)
    })
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(1500).catch(() => {})
    return {
      attempted: true,
      selector,
      beforeUrl,
      afterUrl: normalizeUrl(page.url()),
      changedUrl: normalizeUrl(page.url()) !== beforeUrl,
    }
  }
  return { attempted: false, selector: '', beforeUrl, afterUrl: beforeUrl, changedUrl: false }
}

function buildAuthNeededReport({
  runId = '',
  targetUrl = '',
  runDir = '',
  profileDir = '',
  account = SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
  snapshot = {},
  reason = '',
} = {}) {
  const event = buildSourceSessionBrokerAuthNeededEvent({
    sourceSystem: 'skool-free-community',
    accountLabel: account,
    blocker: reason || snapshot.authState?.reason || 'Skool login, join, MFA, or verification is required before free community extraction can continue.',
    jobId: runId,
    artifactRef: path.join(runDir, 'auth-needed.json'),
    createdAt: new Date().toISOString(),
  })
  return {
    status: 'auth_needed',
    authNeeded: {
      event,
      targetUrl,
      profileDir,
      account,
      reason: reason || snapshot.authState?.reason || 'auth_required',
      actionNeeded: 'Complete Skool login/MFA once in the isolated source profile, then rerun the same command. The runner will silently reverify and resume.',
    },
  }
}

function summarizeCompletion({ pages = [], sideEffects = {}, authNeeded = false } = {}) {
  const surface = pages.map(page => `${page.url || ''} ${page.title || ''} ${page.bodyTextPreview || ''}`).join(' ')
  const activityItems = pages.flatMap(page => list(page.activityItems))
  const recentActivityItems = activityItems.filter(item => item.withinLookback)
  const communityActivityRead = recentActivityItems.length > 0 || (POST_COMMENT_RE.test(surface) && !/\/about(?:\?|$)/i.test(pages.at(-1)?.url || ''))
  const courseOrResourcePages = pages.filter(page => COURSE_RESOURCE_RE.test(`${page.url || ''} ${page.title || ''} ${page.bodyTextPreview || ''}`))
  const safeResourceCandidates = pages.flatMap(page => list(page.linkClassifications)).filter(link => link.decision === 'safe_external_resource_candidate')
  const sessionReady = Boolean(sideEffects.joinedCommunity || sideEffects.authorizedSessionUsed || sideEffects.joinAttempted)
  const checks = [
    { check: 'free_join_or_authorized_session_attempted', ok: sessionReady },
    { check: 'community_posts_comments_last_20_days_read', ok: communityActivityRead, count: recentActivityItems.length },
    { check: 'course_classroom_or_resource_surface_read', ok: courseOrResourcePages.length > 0, count: courseOrResourcePages.length },
    { check: 'safe_resource_links_classified', ok: safeResourceCandidates.length > 0, count: safeResourceCandidates.length },
    { check: 'no_purchase_post_comment_message_download_or_profile_mutation', ok: sideEffects.purchased === false && sideEffects.postedOrMessaged === false && sideEffects.downloadedFile === false && sideEffects.mutatedProfileOrCredentials === false },
  ]
  const complete = checks.every(check => check.ok) && !authNeeded
  return {
    complete,
    status: authNeeded ? 'auth_needed' : complete ? 'free_skool_community_god_mode_completed' : 'free_skool_community_sop_incomplete',
    lookbackDays: SKOOL_FREE_COMMUNITY_LOOKBACK_DAYS,
    checks,
    counts: {
      pagesRead: pages.length,
      activityItems: activityItems.length,
      recentActivityItems: recentActivityItems.length,
      courseOrResourcePages: courseOrResourcePages.length,
      safeResourceCandidates: safeResourceCandidates.length,
    },
  }
}

export async function runSkoolFreeCommunityGodMode({
  url = '',
  account = SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
  profileDir = '',
  rootDir = SKOOL_FREE_COMMUNITY_GOD_MODE_ROOT,
  allowLocalFixture = false,
  allowFreeJoin = true,
  headed = false,
  maxPages = 12,
  maxDepth = 2,
  now = new Date().toISOString(),
} = {}) {
  const targetUrl = normalizeUrl(url)
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) throw new Error(`A valid http(s) URL is required: ${url}`)
  if (!isAllowedTargetUrl(targetUrl, allowLocalFixture)) throw new Error(`Refusing non-Skool URL without fixture mode: ${targetUrl}`)

  const runId = `skool-free-god-mode-${nowStamp(new Date(now))}-${stableHash(targetUrl).slice(0, 8)}`
  const runDir = path.resolve(rootDir, 'runs', runId)
  const artifactDir = path.join(runDir, 'artifacts')
  const resolvedProfileDir = path.resolve(profileDir || path.join(SKOOL_FREE_COMMUNITY_DEFAULT_PROFILE_ROOT, `skool-free-${slug(account)}`))
  await ensureDir(artifactDir)
  await ensureDir(resolvedProfileDir)

  const { chromium } = await import('playwright')
  const context = await chromium.launchPersistentContext(resolvedProfileDir, {
    headless: !headed,
    acceptDownloads: false,
    viewport: { width: 1440, height: 1000 },
    args: SOURCE_BROWSER_ARGS,
  })
  const page = context.pages()[0] || await context.newPage()
  page.on('download', download => download.cancel().catch(() => {}))

  const sideEffects = {
    liveBrowserLaunched: true,
    persistentIsolatedProfileUsed: true,
    profileDir: resolvedProfileDir,
    normalChromeProfileUsed: false,
    networkFetched: false,
    joinAttempted: false,
    joinedCommunity: false,
    authorizedSessionUsed: false,
    submittedForm: false,
    downloadedFile: false,
    purchased: false,
    postedOrMessaged: false,
    mutatedProfileOrCredentials: false,
    unapprovedExternalWrite: false,
  }
  const handsEvents = []
  const stopped = []
  const pages = []
  let authNeeded = null

  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 })
    sideEffects.networkFetched = true
    let firstSnapshot = await captureSkoolSnapshot(page, {
      artifactDir,
      sourceUrl: targetUrl,
      index: pages.length + 1,
      now: new Date(now),
    })
    pages.push({
      ...firstSnapshot,
      depth: 0,
      from: 'start',
      navigationMethod: 'open_start_url',
    })

    if (firstSnapshot.authState.authNeeded && !list(firstSnapshot.buttons).some(button => /join group|join/i.test(button.text || ''))) {
      authNeeded = buildAuthNeededReport({ runId, targetUrl, runDir, profileDir: resolvedProfileDir, account, snapshot: firstSnapshot })
    }

    if (!authNeeded && allowFreeJoin) {
      const joinResult = await clickFirstJoin(page)
      if (joinResult.attempted) {
        sideEffects.joinAttempted = true
        handsEvents.push({
          eventId: 'free-skool-hands-join-001',
          method: 'click_free_join_when_allowed',
          ok: true,
          ...joinResult,
        })
        const afterJoin = await captureSkoolSnapshot(page, {
          artifactDir,
          sourceUrl: targetUrl,
          index: pages.length + 1,
          now: new Date(now),
        })
        pages.push({
          ...afterJoin,
          depth: 0,
          from: firstSnapshot.url,
          navigationMethod: 'free_join_click',
          handsEventId: 'free-skool-hands-join-001',
        })
        if (afterJoin.authState.authNeeded) {
          authNeeded = buildAuthNeededReport({
            runId,
            targetUrl,
            runDir,
            profileDir: resolvedProfileDir,
            account,
            snapshot: afterJoin,
            reason: 'free_join_reached_login_or_mfa_wall',
          })
        } else {
          sideEffects.joinedCommunity = true
          sideEffects.authorizedSessionUsed = true
          firstSnapshot = afterJoin
        }
      } else if (!firstSnapshot.authState.authNeeded) {
        sideEffects.authorizedSessionUsed = true
      }
    }

    const queue = authNeeded ? [] : []
    const visited = new Set(pages.map(item => normalizeUrl(item.url)))
    const seedPages = [...pages]
    for (const snapshot of seedPages) {
      for (const link of list(snapshot.linkClassifications)) {
        if (!link.shouldVisit || visited.has(normalizeUrl(link.url))) continue
        queue.push({ url: link.url, depth: 1, from: snapshot.url })
      }
    }

    while (queue.length && pages.length < Number(maxPages || 12)) {
      const next = queue.shift()
      const nextUrl = normalizeUrl(next.url)
      if (visited.has(nextUrl)) continue
      visited.add(nextUrl)
      if (!isSameCommunityUrl(nextUrl, targetUrl)) {
        stopped.push({ url: nextUrl, from: next.from, reason: 'outside_same_community_boundary' })
        continue
      }
      if (RISKY_URL_RE.test(nextUrl)) {
        stopped.push({ url: nextUrl, from: next.from, reason: 'risky_auth_write_purchase_download_or_account_surface' })
        continue
      }
      await page.goto(nextUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(error => {
        stopped.push({ url: nextUrl, from: next.from, reason: `navigation_error:${error.message}` })
      })
      const snapshot = await captureSkoolSnapshot(page, {
        artifactDir,
        sourceUrl: targetUrl,
        index: pages.length + 1,
        now: new Date(now),
      })
      pages.push({
        ...snapshot,
        depth: next.depth,
        from: next.from,
        navigationMethod: 'same_community_sop_navigation',
      })
      if (snapshot.authState.authNeeded) {
        authNeeded = buildAuthNeededReport({ runId, targetUrl, runDir, profileDir: resolvedProfileDir, account, snapshot })
        break
      }
      if (next.depth >= Number(maxDepth || 2)) continue
      for (const link of list(snapshot.linkClassifications)) {
        if (!link.shouldVisit || visited.has(normalizeUrl(link.url))) continue
        queue.push({ url: link.url, depth: next.depth + 1, from: snapshot.url })
      }
    }

    const sopCompletion = summarizeCompletion({ pages, sideEffects, authNeeded: Boolean(authNeeded) })
    const report = {
      schemaVersion: 1,
      cardId: SKOOL_FREE_COMMUNITY_GOD_MODE_CARD_ID,
      runId,
      status: sopCompletion.status,
      ok: sopCompletion.complete,
      targetUrl,
      account,
      capturedAt: now,
      runner: {
        adapter: 'playwright_persistent_isolated_profile_with_source_session_broker',
        profileDir: resolvedProfileDir,
        allowFreeJoin: Boolean(allowFreeJoin),
        lookbackDays: SKOOL_FREE_COMMUNITY_LOOKBACK_DAYS,
        maxPages: Number(maxPages || 12),
        maxDepth: Number(maxDepth || 2),
      },
      sop: {
        sourceType: 'skool_free_community',
        expects: [
          'use approved source identity/session',
          'free join when allowed',
          'read community posts/comments/activity for the last 20 days where visible',
          'read free courses/classrooms/resources where visible',
          'classify safe resource links',
          'stop at login/MFA/private/paid/post/comment/message/download/profile boundaries',
        ],
      },
      authNeeded: authNeeded?.authNeeded || null,
      sopCompletion,
      counts: {
        ...sopCompletion.counts,
        stopped: stopped.length,
        handsEvents: handsEvents.length,
      },
      pages: pages.map(item => ({
        url: item.url,
        title: item.title,
        depth: item.depth,
        from: item.from,
        navigationMethod: item.navigationMethod,
        textChars: item.textChars,
        bodyTextPreview: item.bodyTextPreview,
        headings: item.headings,
        buttons: item.buttons,
        forms: item.forms,
        authState: item.authState,
        activityItems: item.activityItems,
        linkClassifications: item.linkClassifications,
        artifacts: {
          screenshotPath: item.screenshotPath,
          screenshotHash: item.screenshotHash,
          textPath: item.textPath,
          textHash: item.textHash,
        },
      })),
      handsEvents,
      stopped,
      sideEffects,
      artifacts: {
        runDir,
        reportPath: path.join(runDir, 'report.json'),
        localOnly: true,
        trackedRepoContent: false,
      },
      next: authNeeded
        ? 'Complete the isolated Skool source profile login/MFA once, then rerun unattended. The runner will reverify and continue.'
        : sopCompletion.complete
          ? 'Feed the source-backed Skool community/course/resource evidence into creator source-stack grading and Scoper.'
          : 'Do not claim God Mode. Improve navigation/session coverage until every SOP check passes.',
    }
    await writeJson(report.artifacts.reportPath, report)
    if (authNeeded) await writeJson(path.join(runDir, 'auth-needed.json'), authNeeded)
    await writeText(path.join(runDir, 'README.txt'), [
      `Run: ${runId}`,
      `Target: ${targetUrl}`,
      `Status: ${report.status}`,
      `Report: ${report.artifacts.reportPath}`,
      '',
      'Local-only Skool source artifacts. Do not commit screenshots/page text.',
    ].join('\n'))
    return report
  } finally {
    await context.close().catch(() => {})
  }
}

export function evaluateSkoolFreeCommunityGodModeReport(report = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  add(report.cardId === SKOOL_FREE_COMMUNITY_GOD_MODE_CARD_ID, 'card_id_matches_runner', report.cardId || 'missing')
  add(report.runner?.lookbackDays === SKOOL_FREE_COMMUNITY_LOOKBACK_DAYS, 'lookback_is_20_days', String(report.runner?.lookbackDays || 'missing'))
  add(report.sideEffects?.normalChromeProfileUsed === false, 'normal_chrome_profile_not_used', JSON.stringify(report.sideEffects || {}))
  add(report.sideEffects?.purchased === false && report.sideEffects?.postedOrMessaged === false && report.sideEffects?.downloadedFile === false, 'dangerous_actions_not_taken', JSON.stringify(report.sideEffects || {}))
  if (report.status === 'auth_needed') {
    add(Boolean(report.authNeeded?.event?.eventType === 'auth_needed'), 'auth_needed_event_emitted', JSON.stringify(report.authNeeded || {}))
  } else {
    add(report.sopCompletion?.complete === true, 'full_sop_completed_or_auth_needed', report.sopCompletion?.status || report.status)
  }
  return {
    ok: checks.every(check => check.ok),
    checks,
    failed: checks.filter(check => !check.ok),
  }
}
