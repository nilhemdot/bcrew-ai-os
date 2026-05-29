import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import {
  buildSourceBrowserSessionPolicy,
  evaluateSourceBrowserPageHealth,
} from './source-god-mode-extractor-runtime.js'

export const LOCAL_VIRTUAL_BROWSER_HANDS_CARD_ID = 'LOCAL-VIRTUAL-BROWSER-HANDS-RUNTIME-001'
export const LOCAL_VIRTUAL_BROWSER_HANDS_ROOT = '.openclaw/local-virtual-browser-hands'
export const LOCAL_VIRTUAL_BROWSER_HANDS_VERSION = 'local-virtual-browser-hands-v1'

const SOURCE_BROWSER_ARGS = [
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-session-crashed-bubble',
  '--disable-restore-session-state',
  '--disable-features=Translate,ChromeWhatsNewUI',
]

const RISKY_ACTION_RE = /\b(log ?in|sign ?in|sign ?up|join|subscribe|checkout|payment|billing|buy|purchase|cart|download|upload|post|comment|message|dm|send|submit|delete|settings|profile|account|password|credential|mfa|2fa|captcha)\b/i
const BLOCKER_RE = /\b(captcha|cloudflare|verify you are human|checking your browser|access denied|blocked|log in to continue|sign in to continue|members only|private community|join to view|request to join|restore pages|session restore|chrome didn't shut down correctly)\b/i
const DOWNLOAD_RE = /\.(zip|dmg|pkg|exe|msi|tar|gz|rar|7z|pdf)(\?|$)/i

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function bool(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
}

function stableHash(value = '') {
  const raw = Buffer.isBuffer(value) ? value : String(value || '')
  return crypto.createHash('sha256').update(raw).digest('hex')
}

function nowStamp(date = new Date()) {
  return date.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
}

function safeKey(value = '') {
  return text(value).toLowerCase().replace(/[^a-z0-9:_-]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '').slice(0, 110) || 'source'
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
  try {
    return new URL(value).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
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

function actionSafety(action = {}) {
  const href = normalizeUrl(action.href || '')
  const surface = `${action.kind || ''} ${action.text || ''} ${action.href || ''} ${action.type || ''} ${action.role || ''}`
  if (action.kind !== 'anchor') {
    return {
      safe: false,
      reason: 'non_anchor_action_blocked_v1',
      nextAction: 'Use a source-specific SOP before clicking buttons, forms, roles, or controls.',
    }
  }
  if (!/^https?:\/\//i.test(href)) {
    return {
      safe: false,
      reason: 'non_http_navigation_blocked',
      nextAction: 'Only http(s) navigation is allowed in local browser hands V1.',
    }
  }
  if (DOWNLOAD_RE.test(href)) {
    return {
      safe: false,
      reason: 'download_or_file_open_blocked',
      nextAction: 'Capture metadata and route to file-reader policy before opening or downloading.',
    }
  }
  if (RISKY_ACTION_RE.test(surface)) {
    return {
      safe: false,
      reason: 'risky_auth_write_purchase_download_or_mutation_action',
      nextAction: 'Route to Source Session Broker or approval/action policy before acting.',
    }
  }
  return {
    safe: true,
    reason: 'safe_public_navigation_anchor',
    nextAction: 'Safe to click as bounded public/free navigation.',
  }
}

function splitActions(snapshot = {}) {
  const rows = [
    ...list(snapshot.anchors).map(action => ({ ...action, kind: 'anchor' })),
    ...list(snapshot.buttons).map(action => ({ ...action, kind: 'button' })),
  ].map(action => ({
    ...action,
    safety: actionSafety(action),
  }))
  return {
    observedActions: rows,
    safeActions: rows.filter(action => action.safety.safe),
    blockedActions: rows.filter(action => !action.safety.safe),
  }
}

async function captureLocalHandsSnapshot(page, artifactDir = '', index = 1) {
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(250).catch(() => {})
  const snapshot = await page.evaluate(() => {
    const clean = value => String(value || '').replace(/\s+/g, ' ').trim()
    const bodyText = clean(document.body?.innerText || document.body?.textContent || '')
    const controls = [...document.querySelectorAll('input,button,textarea,select')].map(control => ({
      tag: control.tagName.toLowerCase(),
      type: control.getAttribute('type') || '',
      name: control.getAttribute('name') || '',
      placeholder: control.getAttribute('placeholder') || '',
      ariaLabel: control.getAttribute('aria-label') || '',
    })).slice(0, 80)
    return {
      url: location.href,
      title: document.title || '',
      bodyText,
      bodyTextPreview: bodyText.slice(0, 2400),
      textChars: bodyText.length,
      headings: [...document.querySelectorAll('h1,h2,h3')].map(heading => ({
        level: Number(heading.tagName.slice(1)),
        text: clean(heading.innerText || heading.textContent).slice(0, 220),
      })).filter(row => row.text).slice(0, 50),
      anchors: [...document.querySelectorAll('a[href]')].map(anchor => ({
        text: clean(anchor.innerText || anchor.textContent || anchor.getAttribute('aria-label')).slice(0, 180),
        href: anchor.href,
      })).filter(row => row.href).slice(0, 120),
      buttons: [...document.querySelectorAll('button,[role="button"],input[type="submit"],input[type="button"]')].map(button => ({
        text: clean(button.innerText || button.value || button.textContent || button.getAttribute('aria-label')).slice(0, 180),
        role: button.getAttribute('role') || '',
        type: button.getAttribute('type') || '',
      })).filter(row => row.text).slice(0, 80),
      forms: {
        formCount: document.querySelectorAll('form').length,
        controls,
        hasEmailInput: controls.some(control => /email/i.test(`${control.type} ${control.name} ${control.placeholder} ${control.ariaLabel}`)),
        hasPasswordInput: controls.some(control => /password/i.test(`${control.type} ${control.name}`)),
        hasSubmit: controls.some(control => /submit/i.test(`${control.type} ${control.tag}`)),
      },
    }
  }).catch(error => ({
    url: page.url(),
    title: '',
    bodyText: '',
    bodyTextPreview: '',
    textChars: 0,
    headings: [],
    anchors: [],
    buttons: [],
    forms: { formCount: 0, controls: [], hasEmailInput: false, hasPasswordInput: false, hasSubmit: false },
    error: error instanceof Error ? error.message : String(error),
  }))
  const key = `page-${String(index).padStart(2, '0')}-${safeKey(snapshot.title || hostOf(snapshot.url) || 'page')}`
  const screenshotPath = path.join(artifactDir, `${key}.png`)
  const screenshot = await page.screenshot({ path: screenshotPath, type: 'png', fullPage: false }).catch(() => null)
  const textPath = path.join(artifactDir, `${key}.txt`)
  await writeText(textPath, snapshot.bodyText || '')
  const browserHealth = evaluateSourceBrowserPageHealth(snapshot)
  const credentialInputVisible = Boolean(snapshot.forms?.hasEmailInput || snapshot.forms?.hasPasswordInput)
  return {
    ...snapshot,
    browserHealth,
    blockerDetected: BLOCKER_RE.test(`${snapshot.url || ''} ${snapshot.title || ''} ${snapshot.bodyTextPreview || ''}`) ||
      credentialInputVisible ||
      browserHealth.ok === false,
    credentialInputVisible,
    artifacts: {
      screenshotPath: screenshot ? screenshotPath : '',
      screenshotHash: screenshot ? stableHash(screenshot) : '',
      textPath,
      textHash: stableHash(snapshot.bodyText || ''),
    },
  }
}

async function clickAnchor(page, href = '') {
  const beforeUrl = page.url()
  const clicked = await page.evaluate(targetHref => {
    const target = [...document.querySelectorAll('a[href]')].find(anchor => anchor.href === targetHref)
    if (!target) return false
    target.click()
    return true
  }, href).catch(() => false)
  if (!clicked) return { ok: false, reason: 'anchor_not_found', beforeUrl, afterUrl: page.url() }
  await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {})
  if (normalizeUrl(page.url()) === normalizeUrl(beforeUrl)) {
    await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})
  }
  return {
    ok: true,
    reason: 'safe_anchor_clicked_or_navigated',
    beforeUrl,
    afterUrl: page.url(),
  }
}

export async function runLocalVirtualBrowserHandsProbe({
  url = '',
  sourceType = 'public_or_free_source',
  sourceAccount = '',
  profileMode = 'persistent_isolated',
  headed = false,
  clickFirstSafeAction = false,
  maxActions = 1,
  viewport = { width: 1440, height: 1000 },
  rootDir = LOCAL_VIRTUAL_BROWSER_HANDS_ROOT,
  now = new Date().toISOString(),
} = {}) {
  const targetUrl = normalizeUrl(url)
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) throw new Error(`A valid http(s) URL is required: ${url}`)
  const runId = `local-virtual-browser-hands-${nowStamp(new Date(now))}-${stableHash(targetUrl).slice(0, 8)}`
  const runDir = path.resolve(rootDir, 'runs', runId)
  const artifactDir = path.join(runDir, 'artifacts')
  const profileRoot = path.resolve(rootDir, 'profiles')
  await ensureDir(artifactDir)
  const sessionPolicy = buildSourceBrowserSessionPolicy({
    targetUrl,
    sourceType,
    sourceAccount,
    profileMode,
    profileRoot,
  })

  const { chromium } = await import('playwright')
  let browser = null
  let context = null
  let page = null
  const snapshots = []
  const actionsRun = []
  let status = 'local_virtual_browser_hands_started'
  let failure = null
  try {
    if (sessionPolicy.profileMode === 'persistent_isolated') {
      await ensureDir(sessionPolicy.userDataDir)
      context = await chromium.launchPersistentContext(sessionPolicy.userDataDir, {
        headless: !headed,
        viewport,
        acceptDownloads: false,
        args: SOURCE_BROWSER_ARGS,
      })
      page = context.pages()[0] || await context.newPage()
    } else {
      browser = await chromium.launch({ headless: !headed, args: SOURCE_BROWSER_ARGS })
      context = await browser.newContext({ viewport, acceptDownloads: false })
      page = await context.newPage()
    }
    page.on('download', download => download.cancel().catch(() => {}))
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    snapshots.push(await captureLocalHandsSnapshot(page, artifactDir, snapshots.length + 1))
    const first = snapshots[0]
    if (first.browserHealth?.ok === false) {
      status = 'local_virtual_browser_hands_blocked_browser_state'
    } else if (clickFirstSafeAction && Number(maxActions || 0) > 0 && !first.blockerDetected) {
      const { safeActions } = splitActions(first)
      const action = safeActions[0] || null
      if (action) {
        const result = await clickAnchor(page, normalizeUrl(action.href))
        actionsRun.push({ action, result })
        snapshots.push(await captureLocalHandsSnapshot(page, artifactDir, snapshots.length + 1))
      }
      status = snapshots.some(snapshot => snapshot.blockerDetected || snapshot.credentialInputVisible)
        ? 'local_virtual_browser_hands_completed_with_blocker'
        : 'local_virtual_browser_hands_completed'
    } else {
      status = first.blockerDetected || first.credentialInputVisible
        ? 'local_virtual_browser_hands_completed_with_blocker'
        : 'local_virtual_browser_hands_completed'
    }
  } catch (error) {
    status = 'local_virtual_browser_hands_failed_closed'
    failure = error instanceof Error ? error.stack || error.message : String(error)
  } finally {
    await context?.close?.().catch(() => {})
    await browser?.close?.().catch(() => {})
  }

  const actionBuckets = snapshots.length ? splitActions(snapshots[0]) : { observedActions: [], safeActions: [], blockedActions: [] }
  const report = {
    schemaVersion: 1,
    version: LOCAL_VIRTUAL_BROWSER_HANDS_VERSION,
    cardId: LOCAL_VIRTUAL_BROWSER_HANDS_CARD_ID,
    runId,
    status,
    ok: !/_failed_closed$/.test(status) && status !== 'local_virtual_browser_hands_blocked_browser_state',
    targetUrl,
    finalUrl: snapshots.at(-1)?.url || targetUrl,
    sourceType,
    capturedAt: now,
    runtime: {
      adapter: 'playwright_local_virtual_browser_hands',
      browserbaseUsed: false,
      modelCalled: false,
      headed: Boolean(headed),
      normalChromeProfileUsed: false,
      sourceBrowserSession: sessionPolicy,
      localBrowserLaunchArgs: SOURCE_BROWSER_ARGS,
    },
    observedActions: actionBuckets.observedActions,
    safeActions: actionBuckets.safeActions,
    blockedActions: actionBuckets.blockedActions,
    actionsRun,
    snapshots: snapshots.map(snapshot => ({
      url: snapshot.url,
      title: snapshot.title,
      textChars: snapshot.textChars,
      bodyTextPreview: snapshot.bodyTextPreview,
      headings: snapshot.headings,
      anchors: snapshot.anchors,
      buttons: snapshot.buttons,
      forms: snapshot.forms,
      blockerDetected: snapshot.blockerDetected,
      credentialInputVisible: snapshot.credentialInputVisible,
      browserHealth: snapshot.browserHealth,
      artifacts: snapshot.artifacts,
    })),
    failure,
    sideEffects: {
      liveBrowserLaunched: true,
      networkFetched: true,
      modelCalled: false,
      browserbaseUsed: false,
      manualClicks: false,
      clicked: actionsRun.length > 0,
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
      isolatedBrowserProfileUsed: true,
      rawSecretPrinted: false,
    },
    artifacts: {
      runDir,
      reportPath: path.join(runDir, 'report.json'),
      localOnly: true,
      trackedRepoContent: false,
    },
    next: status === 'local_virtual_browser_hands_blocked_browser_state'
      ? 'Relaunch a clean isolated source profile, then retry exact URL; route repeated browser challenges to fallback approval.'
      : status === 'local_virtual_browser_hands_completed_with_blocker'
        ? 'Route auth/form/join/paywall blockers to Source Session Broker or source-specific SOP before acting.'
        : 'Wire this local hands runtime under source-browser agent execution for public/free proof paths.',
  }
  await writeJson(report.artifacts.reportPath, report)
  await writeText(path.join(runDir, 'README.txt'), [
    `Run: ${runId}`,
    `Target: ${targetUrl}`,
    `Status: ${status}`,
    `Adapter: ${report.runtime.adapter}`,
    `Report: ${report.artifacts.reportPath}`,
    '',
    'Local-only browser hands artifacts. Do not commit screenshots/page text.',
  ].join('\n'))
  return report
}

export function evaluateLocalVirtualBrowserHandsReport(report = {}) {
  const findings = []
  if (report.runtime?.browserbaseUsed !== false) findings.push({ check: 'browserbase_not_used', detail: String(report.runtime?.browserbaseUsed) })
  if (report.runtime?.modelCalled !== false) findings.push({ check: 'model_not_called', detail: String(report.runtime?.modelCalled) })
  if (report.runtime?.normalChromeProfileUsed !== false) findings.push({ check: 'normal_chrome_profile_not_used', detail: String(report.runtime?.normalChromeProfileUsed) })
  if (report.sideEffects?.submittedForm === true) findings.push({ check: 'form_not_submitted', detail: 'submittedForm=true' })
  if (report.sideEffects?.downloadedFile === true) findings.push({ check: 'download_not_allowed', detail: 'downloadedFile=true' })
  if (report.sideEffects?.rawSecretPrinted === true) findings.push({ check: 'raw_secret_not_printed', detail: 'rawSecretPrinted=true' })
  if (!list(report.snapshots).length) findings.push({ check: 'snapshot_captured', detail: 'no snapshots' })
  return {
    ok: findings.length === 0,
    status: findings.length ? 'blocked' : 'healthy',
    findings,
  }
}
