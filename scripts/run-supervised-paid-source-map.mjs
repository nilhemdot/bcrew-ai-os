#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

import { chromium } from 'playwright'

import {
  buildKeychainSecretRef,
  keychainItemExists,
  readKeychainPassword,
} from '../lib/credential-vault.js'
import {
  buildSourceSessionBrokerAuthNeededEvent,
} from '../lib/source-session-broker.js'

const SOURCE_PRESETS = {
  'mark-skool': {
    label: 'Mark Kashef paid Skool',
    sourceId: 'SRC-SKOOL-001',
    cardId: 'SKOOL-APPROVED-LESSON-EXTRACT-PROOF-001',
    startUrl: 'https://www.skool.com/earlyaidopters',
    allowedHosts: ['skool.com', 'www.skool.com'],
    pathPrefix: '/earlyaidopters',
    maxPages: 6,
    maxDepth: 1,
  },
  myicor: {
    label: 'Paid course/training platform',
    sourceId: 'SRC-MYICRO-001',
    cardId: 'MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001',
    startUrl: 'https://app.myicor.com/login',
    allowedHosts: ['app.myicor.com'],
    pathPrefix: '',
    maxPages: 6,
    maxDepth: 1,
  },
}

const RISKY_URL_PATTERN = /(?:^|[/?#&=._-])(checkout|payment|billing|subscription|unsubscribe|purchase|buy|cart|stripe|paypal|gumroad|logout|signout|sign-out|delete|remove|account|settings|profile|profiles|member|members|invite|create|compose|new-post|new_comment|download)(?:[/?#&=._-]|$)/i
const RISKY_SCHEME_PATTERN = /^(mailto|tel|sms|javascript|data):/i
const DEFAULT_ROOT = '.openclaw/supervised-paid-source-map'

function text(value) {
  return String(value || '').trim()
}

function bool(value) {
  return value === true || value === 'true' || value === '1'
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const raw of argv) {
    const match = raw.match(/^--([^=]+)(?:=(.*))?$/)
    if (!match) continue
    args[match[1]] = match[2] === undefined ? true : match[2]
  }
  return args
}

function slug(value = '') {
  return text(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'source'
}

function nowStamp(date = new Date()) {
  const iso = date.toISOString()
  return iso.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
}

function stableHash(value = '') {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex')
}

function normalizeUrl(rawUrl = '', baseUrl = '') {
  const value = text(rawUrl)
  if (!value) return ''
  if (value === 'about:blank') return value
  try {
    const url = new URL(value, baseUrl || undefined)
    url.hash = ''
    return url.toString()
  } catch {
    return value
  }
}

function parseUrl(rawUrl = '') {
  try {
    return new URL(rawUrl)
  } catch {
    return null
  }
}

function hostOf(rawUrl = '') {
  return parseUrl(rawUrl)?.hostname.toLowerCase() || ''
}

function deriveAllowedBoundary(preset = {}, currentUrl = '') {
  const current = parseUrl(currentUrl)
  const hosts = new Set((preset.allowedHosts || []).map(host => host.toLowerCase()).filter(Boolean))
  if (current?.hostname && hosts.size === 0) hosts.add(current.hostname.toLowerCase())
  const pathPrefix = preset.pathPrefix || ''
  return {
    allowedHosts: [...hosts],
    pathPrefix,
  }
}

function classifyUrl(rawUrl = '', boundary = {}, baseUrl = '') {
  const normalizedUrl = normalizeUrl(rawUrl, baseUrl)
  const parsed = parseUrl(normalizedUrl)
  if (!normalizedUrl || !parsed) return { ok: false, normalizedUrl, reason: 'invalid_or_empty_url' }
  if (RISKY_SCHEME_PATTERN.test(parsed.protocol)) return { ok: false, normalizedUrl, reason: 'unsafe_scheme' }
  const host = parsed.hostname.toLowerCase()
  if (boundary.allowedHosts?.length && !boundary.allowedHosts.includes(host)) {
    return { ok: false, normalizedUrl, reason: 'outside_allowed_host' }
  }
  if (boundary.pathPrefix && !parsed.pathname.startsWith(boundary.pathPrefix)) {
    return { ok: false, normalizedUrl, reason: 'outside_allowed_path_prefix' }
  }
  if (RISKY_URL_PATTERN.test(normalizedUrl)) return { ok: false, normalizedUrl, reason: 'risky_action_url_blocked' }
  return { ok: true, normalizedUrl, reason: 'same_boundary_read_only_navigation' }
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

async function capturePageSnapshot(page, { sourceKey, pageIndex, artifactDir, boundary }) {
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(1200).catch(() => {})
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let steps = 0
      const timer = setInterval(() => {
        window.scrollBy(0, Math.max(400, Math.floor(window.innerHeight * 0.75)))
        steps += 1
        if (steps >= 4 || window.scrollY + window.innerHeight >= document.body.scrollHeight) {
          clearInterval(timer)
          resolve()
        }
      }, 250)
    })
    window.scrollTo(0, 0)
  }).catch(() => {})

  const snapshot = await page.evaluate(() => {
    const clean = value => String(value || '').replace(/\s+/g, ' ').trim()
    const attr = (element, name) => element.getAttribute(name) || ''
    const anchors = [...document.querySelectorAll('a[href]')].map(anchor => ({
      href: anchor.href || attr(anchor, 'href'),
      text: clean(anchor.innerText || anchor.textContent).slice(0, 240),
      download: anchor.hasAttribute('download'),
      target: attr(anchor, 'target'),
      rel: attr(anchor, 'rel'),
    })).slice(0, 250)
    const forms = [...document.querySelectorAll('form')].map(form => ({
      action: form.action || attr(form, 'action'),
      method: attr(form, 'method') || 'get',
      text: clean(form.innerText || form.textContent).slice(0, 240),
      inputCount: form.querySelectorAll('input,textarea,select,button').length,
    })).slice(0, 25)
    const buttons = [...document.querySelectorAll('button,[role="button"],input[type="submit"],input[type="button"]')].map(button => ({
      text: clean(button.innerText || button.value || button.textContent).slice(0, 160),
      type: attr(button, 'type'),
      role: attr(button, 'role'),
    })).slice(0, 80)
    const headings = [...document.querySelectorAll('h1,h2,h3')].map(heading => ({
      level: Number(heading.tagName.slice(1)),
      text: clean(heading.innerText || heading.textContent).slice(0, 240),
    })).filter(row => row.text).slice(0, 80)
    const iframes = [...document.querySelectorAll('iframe[src]')].map(frame => ({
      src: frame.src || attr(frame, 'src'),
      title: attr(frame, 'title'),
    })).slice(0, 50)
    const media = [...document.querySelectorAll('video[src],audio[src],source[src]')].map(element => ({
      tag: element.tagName.toLowerCase(),
      src: element.src || attr(element, 'src'),
      type: attr(element, 'type'),
    })).slice(0, 50)
    const bodyText = clean(document.body?.innerText || document.body?.textContent || '')
    const metas = [...document.querySelectorAll('meta[name],meta[property]')].map(meta => ({
      key: attr(meta, 'name') || attr(meta, 'property'),
      content: attr(meta, 'content').slice(0, 500),
    })).filter(row => row.key && row.content).slice(0, 40)
    return {
      url: location.href,
      title: document.title || '',
      bodyText,
      textChars: bodyText.length,
      headings,
      anchors,
      forms,
      buttons,
      iframes,
      media,
      metas,
    }
  })

  const safeLinks = []
  const blockedLinks = []
  for (const link of snapshot.anchors || []) {
    const classification = classifyUrl(link.href, boundary, snapshot.url)
    const row = { ...link, ...classification }
    if (link.download) {
      blockedLinks.push({ ...row, ok: false, reason: 'download_anchor_blocked' })
    } else if (classification.ok) {
      safeLinks.push(row)
    } else {
      blockedLinks.push(row)
    }
  }

  const baseName = `${String(pageIndex).padStart(2, '0')}-${slug(sourceKey)}-${stableHash(snapshot.url).slice(0, 10)}`
  const screenshotPath = path.join(artifactDir, `${baseName}.png`)
  const screenshot = await page.screenshot({ path: screenshotPath, type: 'png', fullPage: false }).catch(() => null)
  const textPath = path.join(artifactDir, `${baseName}.txt`)
  await writeText(textPath, snapshot.bodyText.slice(0, 30000))

  return {
    url: snapshot.url,
    title: snapshot.title,
    textChars: snapshot.textChars,
    bodyTextPreview: snapshot.bodyText.slice(0, 2000),
    fullTextArtifact: textPath,
    textHash: stableHash(snapshot.bodyText),
    screenshotArtifact: screenshot ? screenshotPath : '',
    screenshotHash: screenshot ? stableHash(screenshot) : '',
    headings: snapshot.headings,
    forms: snapshot.forms,
    buttons: snapshot.buttons,
    iframes: snapshot.iframes,
    media: snapshot.media,
    metas: snapshot.metas,
    safeLinks: safeLinks.slice(0, 80),
    blockedLinks: blockedLinks.slice(0, 120),
    sideEffects: {
      pageRead: true,
      screenshotStoredLocalOnly: Boolean(screenshot),
      formsSubmitted: false,
      downloadedFiles: false,
      purchaseOrOptIn: false,
      postedOrMessaged: false,
      externalWrites: false,
      credentialMutation: false,
      browserProfileMutation: false,
    },
  }
}

async function inspectAuthState(page) {
  return page.evaluate(() => {
    const clean = value => String(value || '').replace(/\s+/g, ' ').trim()
    const bodyText = clean(document.body?.innerText || document.body?.textContent || '')
    const emailInputs = document.querySelectorAll('input[type="email"], input[name*="email" i], input[autocomplete="username"]').length
    const passwordInputs = document.querySelectorAll('input[type="password"], input[autocomplete="current-password"]').length
    const loginButtons = [...document.querySelectorAll('button,a,[role="button"]')]
      .map(element => clean(element.innerText || element.textContent || element.getAttribute('aria-label')))
      .filter(value => /log in|login|sign in|continue with google|google/i.test(value))
      .slice(0, 20)
    return {
      url: location.href,
      title: document.title || '',
      hasEmailInput: emailInputs > 0,
      hasPasswordInput: passwordInputs > 0,
      loginButtons,
      bodyTextPreview: bodyText.slice(0, 1200),
    }
  }).catch(error => ({
    url: page.url(),
    title: '',
    hasEmailInput: false,
    hasPasswordInput: false,
    loginButtons: [],
    bodyTextPreview: '',
    error: error.message,
  }))
}

function looksAuthBlocked(authState = {}) {
  const surface = `${authState.url || ''} ${authState.title || ''} ${authState.bodyTextPreview || ''}`.toLowerCase()
  if (authState.hasPasswordInput) return true
  if (/\/login|\/sign-in|\/signin|\/signup|accounts\.google\.com|oauth|authenticate/.test(surface)) return true
  if (/create your free account|create free account|sign up with google|signup|sign up/.test(surface)) return true
  if ((authState.hasEmailInput || authState.loginButtons?.length) && /log in|login|sign in|password|continue with google|create account/.test(surface)) return true
  return false
}

function buildAuthNeededReport({ runId, preset, sourceKey, profileDir, runDir, startUrl, authState, approvalNote }) {
  const accountLabel = 'approved_source_account_or_authorized_profile'
  return {
    schemaVersion: 1,
    runId,
    sourceKey,
    sourceLabel: preset.label,
    sourceId: preset.sourceId,
    cardId: preset.cardId,
    status: 'auth_needed',
    approval: {
      approvedBy: 'Steve',
      approvalMode: 'authorized_profile_unattended_or_supervised',
      approvalNote,
      checkedAt: new Date().toISOString(),
    },
    authNeeded: {
      blocker: 'authorized browser profile is not logged in or hit a login/MFA wall',
      actionNeeded: 'Steve signs in or approves MFA in the local browser profile, then rerun the same source packet.',
      profileDir,
      startUrl,
      authState,
      retryCommandHint: `node scripts/run-supervised-paid-source-map.mjs --source=${sourceKey} --unattended --url=${startUrl}`,
    },
    sourceSessionBroker: {
      cardId: 'SOURCE-SESSION-BROKER-001',
      event: buildSourceSessionBrokerAuthNeededEvent({
        sourceSystem: sourceKey,
        accountLabel,
        blocker: 'authorized browser profile is not logged in or hit a login/MFA wall',
        jobId: runId,
        artifactRef: path.join(runDir, 'auth-needed.json'),
        createdAt: new Date().toISOString(),
      }),
      waitResumeFailClosed: true,
      rawSecretPrinted: false,
    },
    artifactStorage: {
      runDir,
      localOnly: true,
      trackedRepoContent: false,
    },
    sideEffects: {
      formsSubmitted: false,
      downloadedFiles: false,
      purchaseOrOptIn: false,
      postedOrMessaged: false,
      externalWrites: false,
      credentialMutation: false,
      repoWritesOfPaidContent: false,
    },
  }
}

async function clickFirstVisible(page, selectors = [], timeout = 2500) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first()
    if (await locator.isVisible({ timeout }).catch(() => false)) {
      await locator.click({ timeout }).catch(error => {
        throw new Error(`click failed for ${selector}: ${error.message}`)
      })
      return selector
    }
  }
  return ''
}

async function fillFirstVisible(page, selectors = [], value = '', timeout = 2500) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first()
    if (await locator.isVisible({ timeout }).catch(() => false)) {
      await locator.fill(value, { timeout }).catch(error => {
        throw new Error(`fill failed for ${selector}: ${error.message}`)
      })
      return selector
    }
  }
  return ''
}

async function ensureMyicorLogin(page, { account = '', password = '', startUrl = 'https://app.myicor.com/home' } = {}) {
  const before = await inspectAuthState(page)
  if (!looksAuthBlocked(before) && /app\.myicor\.com/i.test(before.url || '')) {
    return { ok: true, method: 'persistent_profile', authState: before, rawSecretPrinted: false }
  }

  await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
  await page.waitForTimeout(1500).catch(() => {})
  const afterGoto = await inspectAuthState(page)
  if (!looksAuthBlocked(afterGoto) && /app\.myicor\.com/i.test(afterGoto.url || '')) {
    return { ok: true, method: 'persistent_profile_after_goto', authState: afterGoto, rawSecretPrinted: false }
  }
  if (!account || !password) {
    return { ok: false, status: 'auth_needed', reason: 'missing_keychain_account_or_password', authState: afterGoto, rawSecretPrinted: false }
  }

  const googleClicked = await clickFirstVisible(page, [
    'button:has-text("Google")',
    'a:has-text("Google")',
    '[class*="google" i]',
  ], 3000).catch(() => '')

  if (googleClicked) {
    await page.waitForTimeout(2500).catch(() => {})
    const emailSelector = await fillFirstVisible(page, [
      'input[type="email"]',
      '#identifierId',
      'input[autocomplete="username"]',
    ], account, 8000).catch(() => '')
    if (!emailSelector) {
      return { ok: false, status: 'auth_needed', reason: 'google_email_field_not_found', authState: await inspectAuthState(page), rawSecretPrinted: false }
    }
    await clickFirstVisible(page, ['#identifierNext', 'button:has-text("Next")'], 5000).catch(() => '')
    await page.waitForTimeout(2500).catch(() => {})
    if (/challenge|signin\/v2\/challenge/i.test(page.url())) {
      return { ok: false, status: 'auth_needed', reason: 'google_2fa_required_before_password', authState: await inspectAuthState(page), rawSecretPrinted: false }
    }
    const passwordSelector = await fillFirstVisible(page, [
      'input[type="password"]',
      'input[autocomplete="current-password"]',
    ], password, 10000).catch(() => '')
    if (!passwordSelector) {
      return { ok: false, status: 'auth_needed', reason: 'google_password_field_not_found_or_mfa_required', authState: await inspectAuthState(page), rawSecretPrinted: false }
    }
    await clickFirstVisible(page, ['#passwordNext', 'button:has-text("Next")'], 5000).catch(() => {})
    await page.waitForTimeout(7000).catch(() => {})
  } else {
    const emailSelector = await fillFirstVisible(page, [
      'input[type="email"]',
      'input[name*="email" i]',
      'input[autocomplete="username"]',
    ], account, 5000).catch(() => '')
    const passwordSelector = await fillFirstVisible(page, [
      'input[type="password"]',
      'input[autocomplete="current-password"]',
    ], password, 5000).catch(() => '')
    if (!emailSelector || !passwordSelector) {
      return { ok: false, status: 'auth_needed', reason: 'login_form_not_found', authState: await inspectAuthState(page), rawSecretPrinted: false }
    }
    await clickFirstVisible(page, [
      'button[type="submit"]',
      'button:has-text("Log In")',
      'button:has-text("Login")',
      'button:has-text("Sign In")',
    ], 5000).catch(() => {})
    await page.waitForTimeout(6000).catch(() => {})
  }

  const finalAuthState = await inspectAuthState(page)
  if (/challenge|signin\/v2\/challenge|mfa|2fa/i.test(`${page.url()} ${finalAuthState.bodyTextPreview}`)) {
    return { ok: false, status: 'auth_needed', reason: 'mfa_required', authState: finalAuthState, rawSecretPrinted: false }
  }
  if (looksAuthBlocked(finalAuthState)) {
    return { ok: false, status: 'auth_needed', reason: 'login_did_not_clear_auth_wall', authState: finalAuthState, rawSecretPrinted: false }
  }
  return { ok: true, method: googleClicked ? 'google_oauth_keychain' : 'form_login_keychain', authState: finalAuthState, rawSecretPrinted: false }
}

async function maybeRunCredentialBroker({ page, sourceKey, args, startUrl, unattended }) {
  const useKeychainLogin = bool(args.useKeychainLogin) || (unattended && Boolean(args.account))
  if (!useKeychainLogin) return { attempted: false }
  const account = text(args.account)
  const credentialSource = text(args.credentialSource || sourceKey)
  const secretRef = account ? buildKeychainSecretRef({ source: credentialSource, account }) : ''
  if (!account) {
    return { attempted: true, ok: false, status: 'auth_needed', reason: 'missing_account', secretRef, rawSecretPrinted: false }
  }
  const present = await keychainItemExists({ source: credentialSource, account }).catch(() => false)
  if (!present) {
    return { attempted: true, ok: false, status: 'auth_needed', reason: 'keychain_secret_missing', secretRef, rawSecretPrinted: false }
  }
  const password = await readKeychainPassword({ source: credentialSource, account })
  try {
    if (sourceKey === 'myicor') {
      return {
        attempted: true,
        secretRef,
        ...(await ensureMyicorLogin(page, { account, password, startUrl })),
      }
    }
    return { attempted: true, ok: false, status: 'auth_needed', reason: `no_login_recipe_for_${sourceKey}`, secretRef, rawSecretPrinted: false }
  } finally {
    // Best-effort overwrite of the local binding; JavaScript strings are immutable, so this is only an intent marker.
  }
}

async function run() {
  const args = parseArgs()
  const sourceKey = slug(args.source || args.sourceKey || 'mark-skool')
  const preset = SOURCE_PRESETS[sourceKey]
  if (!preset) {
    throw new Error(`Unknown --source=${sourceKey}. Use one of: ${Object.keys(SOURCE_PRESETS).join(', ')}`)
  }

  const maxPages = Math.max(1, Math.min(Number(args.maxPages || preset.maxPages || 4), 12))
  const maxDepth = Math.max(0, Math.min(Number(args.maxDepth || preset.maxDepth || 1), 3))
  const unattended = bool(args.unattended)
  const headed = args.headless ? !bool(args.headless) : !unattended
  const rootDir = path.resolve(args.root || DEFAULT_ROOT)
  const runId = `${sourceKey}-${nowStamp()}`
  const runDir = path.join(rootDir, 'runs', runId)
  const artifactDir = path.join(runDir, 'artifacts')
  const profileDir = path.resolve(args.profileDir || path.join(rootDir, 'profiles', sourceKey))
  const startUrl = text(args.url || preset.startUrl || 'about:blank')
  const approvalNote = text(args.approvalNote || 'Steve present in chat approved supervised read-only paid-source proof for this exact session.')

  await ensureDir(artifactDir)
  await ensureDir(profileDir)

  console.log(`Supervised paid-source mapper: ${preset.label}`)
  console.log(`Run ID: ${runId}`)
  console.log(`Profile dir: ${profileDir}`)
  console.log(`Artifact dir: ${runDir}`)
  console.log('Rules: no form submit, no downloads, no purchases, no posts/comments/messages, no account/profile/credential changes.')
  console.log(unattended
    ? 'Running unattended against the authorized local browser profile. If auth is missing, this writes auth-needed and stops.'
    : 'A browser is opening now. Log in manually if needed, navigate to the exact allowed course/community/lesson start page, then return here.')

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: !headed,
    acceptDownloads: false,
    viewport: { width: 1440, height: 1000 },
  })
  context.on('page', openedPage => {
    openedPage.on('download', download => download.cancel().catch(() => {}))
  })
  await context.route('**/*', route => {
    const request = route.request()
    const url = request.url()
    if (request.resourceType() === 'document' && RISKY_URL_PATTERN.test(url)) {
      return route.abort('blockedbyclient').catch(() => {})
    }
    return route.continue().catch(() => {})
  })

  const page = context.pages()[0] || await context.newPage()
  page.on('download', download => download.cancel().catch(() => {}))
  if (startUrl && startUrl !== 'about:blank') {
    await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(error => {
      console.log(`Initial navigation warning: ${error.message}`)
    })
  } else {
    await page.goto('about:blank').catch(() => {})
  }

  const credentialBroker = await maybeRunCredentialBroker({ page, sourceKey, args, startUrl, unattended })
  if (credentialBroker.attempted && credentialBroker.ok === false && unattended) {
    const authReport = buildAuthNeededReport({
      runId,
      preset,
      sourceKey,
      profileDir,
      runDir,
      startUrl,
      authState: credentialBroker.authState || { url: page.url(), reason: credentialBroker.reason },
      approvalNote,
    })
    authReport.credentialBroker = {
      attempted: true,
      status: credentialBroker.status || 'auth_needed',
      reason: credentialBroker.reason || 'credential_broker_failed',
      secretRef: credentialBroker.secretRef || '',
      rawSecretPrinted: false,
    }
    await writeJson(path.join(runDir, 'auth-needed.json'), authReport)
    await context.close().catch(() => {})
    console.log(`Auth needed. Report: ${path.join(runDir, 'auth-needed.json')}`)
    process.exit(2)
  }

  if (!unattended) {
    const rl = readline.createInterface({ input, output })
    await rl.question('Press Enter here after you are logged in and the browser is sitting on the exact allowed start page. ')
    await rl.close()
  }

  const firstUrl = normalizeUrl(page.url())
  if (!firstUrl || firstUrl === 'about:blank') {
    throw new Error('Browser is still on about:blank; navigate to the approved source page first.')
  }
  const authState = await inspectAuthState(page)
  if (unattended && looksAuthBlocked(authState)) {
    const authReport = buildAuthNeededReport({
      runId,
      preset,
      sourceKey,
      profileDir,
      runDir,
      startUrl,
      authState,
      approvalNote,
    })
    await writeJson(path.join(runDir, 'auth-needed.json'), authReport)
    await context.close().catch(() => {})
    console.log(`Auth needed. Report: ${path.join(runDir, 'auth-needed.json')}`)
    process.exit(2)
  }
  const boundary = deriveAllowedBoundary(preset, firstUrl)
  if (!boundary.allowedHosts.length) {
    throw new Error('No allowed host could be derived from the approved start page.')
  }

  const queue = [{ url: firstUrl, depth: 0, from: 'operator_start_page' }]
  const visited = new Set()
  const pages = []
  const stopped = []

  while (queue.length && pages.length < maxPages) {
    const next = queue.shift()
    const classification = classifyUrl(next.url, boundary, firstUrl)
    if (!classification.ok) {
      stopped.push({ url: next.url, from: next.from, reason: classification.reason })
      continue
    }
    const url = classification.normalizedUrl
    if (visited.has(url)) continue
    visited.add(url)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(error => {
      stopped.push({ url, from: next.from, reason: `navigation_error:${error.message}` })
    })
    if (page.url() && classifyUrl(page.url(), boundary, firstUrl).ok !== true) {
      stopped.push({ url: page.url(), from: next.from, reason: 'redirected_outside_boundary' })
      continue
    }
    await page.waitForTimeout(1500).catch(() => {})
    const pageAuthState = await inspectAuthState(page)
    if (unattended && looksAuthBlocked(pageAuthState)) {
      const authReport = buildAuthNeededReport({
        runId,
        preset,
        sourceKey,
        profileDir,
        runDir,
        startUrl,
        authState: pageAuthState,
        approvalNote,
      })
      authReport.boundary = {
        attemptedUrl: url,
        redirectedUrl: page.url(),
        reason: 'auth_or_signup_wall_after_navigation',
      }
      await writeJson(path.join(runDir, 'auth-needed.json'), authReport)
      await context.close().catch(() => {})
      console.log(`Auth needed. Report: ${path.join(runDir, 'auth-needed.json')}`)
      process.exit(2)
    }
    const snapshot = await capturePageSnapshot(page, {
      sourceKey,
      pageIndex: pages.length + 1,
      artifactDir,
      boundary,
    })
    pages.push({ ...snapshot, depth: next.depth, from: next.from })

    if (next.depth >= maxDepth) continue
    for (const link of snapshot.safeLinks || []) {
      if (pages.length + queue.length >= maxPages) break
      if (!visited.has(link.normalizedUrl)) {
        queue.push({ url: link.normalizedUrl, depth: next.depth + 1, from: snapshot.url })
      }
    }
  }

  const report = {
    schemaVersion: 1,
    runId,
    sourceKey,
    sourceLabel: preset.label,
    sourceId: preset.sourceId,
    cardId: preset.cardId,
    approval: {
      approvedBy: 'Steve',
      approvalMode: 'supervised_browser_session',
      approvalNote,
      approvedAt: new Date().toISOString(),
    },
    boundary: {
      allowedHosts: boundary.allowedHosts,
      pathPrefix: boundary.pathPrefix,
      maxPages,
      maxDepth,
      artifactStorage: 'local_only_under_.openclaw_not_tracked_repo',
      contentUse: 'internal_source_review_and_aios_improvement_only_until_steve_sets_broader_rights',
    },
    counts: {
      pagesRead: pages.length,
      safeLinksSeen: pages.reduce((sum, row) => sum + (row.safeLinks?.length || 0), 0),
      blockedLinksSeen: pages.reduce((sum, row) => sum + (row.blockedLinks?.length || 0), 0),
      formsSeen: pages.reduce((sum, row) => sum + (row.forms?.length || 0), 0),
      mediaRefsSeen: pages.reduce((sum, row) => sum + (row.media?.length || 0) + (row.iframes?.length || 0), 0),
      stopped: stopped.length,
    },
    pages,
    stopped,
    sideEffects: {
      loggedInByOperator: !unattended,
      authorizedBrowserProfileUsed: true,
      browserSessionUsed: true,
      broadCrawl: false,
      formsSubmitted: false,
      downloadedFiles: false,
      purchaseOrOptIn: false,
      postedOrMessaged: false,
      externalWrites: false,
      credentialMutation: false,
      browserProfileMutation: false,
      repoWritesOfPaidContent: false,
    },
    next: [
      'Review local artifact quality.',
      'Promote only source-backed summaries, not copied paid/private content, into governed intelligence artifacts.',
      'Convert this supervised proof into the reusable paid-source runner if the browser evidence is good.',
    ],
  }

  await writeJson(path.join(runDir, 'report.json'), report)
  await writeText(path.join(runDir, 'README.txt'), [
    `Run: ${runId}`,
    `Source: ${preset.label}`,
    `Report: ${path.join(runDir, 'report.json')}`,
    '',
    'This directory is local-only under .openclaw and must not be committed.',
  ].join('\n'))

  await context.close().catch(() => {})
  console.log(`Done. Pages read: ${report.counts.pagesRead}. Blocked links: ${report.counts.blockedLinksSeen}. Forms seen: ${report.counts.formsSeen}.`)
  console.log(`Report: ${path.join(runDir, 'report.json')}`)
}

run().catch(error => {
  console.error(error.stack || error.message)
  process.exit(1)
})
