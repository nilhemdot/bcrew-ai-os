#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import process from 'node:process'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import {
  buildKeychainSecretRef,
  keychainItemExists,
  readKeychainPassword,
  storeKeychainPassword,
} from '../lib/credential-vault.js'
import {
  evaluateMyicorBrowserAuthSurface,
} from '../lib/source-session-auth-guards.js'
import {
  SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT,
  buildSourceSessionBrokerAuthNeededEvent,
} from '../lib/source-session-broker.js'

const MCP_URL = 'https://mcp.myicor.com/mcp'
const OLD_SSE_URL = 'https://mcp.myicor.com/sse'
const AUTH_METADATA_URL = 'https://app.myicor.com/.well-known/oauth-authorization-server'
const DEFAULT_CALLBACK = 'http://127.0.0.1:7777/callback'
const DEFAULT_ACCOUNT = 'myicor-authorized-member'
const KEYCHAIN_SOURCE = 'myicor-mcp-oauth'
const DEFAULT_GOOGLE_CREDENTIAL_SOURCE = 'myicor-google-sso'
const DEFAULT_SCOPE = 'mcp:read mcp:tools mcp:progress mcp:inner-circle'
const EXISTING_GOOGLE_SSO_ACCOUNT = 'steve.zahnd@bensoncrew.ca'
const WRONG_BRANCH_STOP_TEXT = 'If myICOR asks you to Start Free, create a profile, onboard, or sign up, stop. Use Log in / Sign in with Google for the existing paid account.'
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function myicorMcpAuthorizeAgentCommand(account = DEFAULT_ACCOUNT) {
  return `npm run myicor:mcp-authorize-agent -- --account=${account || DEFAULT_ACCOUNT}`
}

function myicorMcpAuthorizeManualCommand(account = DEFAULT_ACCOUNT) {
  return `npm run myicor:mcp-authorize -- --account=${account || DEFAULT_ACCOUNT}`
}

function sourceCredentialStatusCommand({
  source = DEFAULT_GOOGLE_CREDENTIAL_SOURCE,
  account = EXISTING_GOOGLE_SSO_ACCOUNT,
} = {}) {
  return `npm run credentials:vault -- source:status --source=${source} --account=${account}`
}

function parseArgs(argv = process.argv.slice(2)) {
  const [command = 'preflight', ...rest] = argv
  const flags = {
    command,
    json: rest.includes('--json'),
    open: !rest.includes('--no-open'),
    account: DEFAULT_ACCOUNT,
    callback: DEFAULT_CALLBACK,
    scope: DEFAULT_SCOPE,
    tool: '',
    paramsJson: '{}',
    timeoutMs: 10 * 60 * 1000,
    googleAccount: EXISTING_GOOGLE_SSO_ACCOUNT,
    googleCredentialSource: DEFAULT_GOOGLE_CREDENTIAL_SOURCE,
    profileDir: '',
    headless: rest.includes('--headless'),
  }
  for (const arg of rest) {
    if (arg.startsWith('--account=')) flags.account = arg.slice('--account='.length).trim()
    if (arg.startsWith('--callback=')) flags.callback = arg.slice('--callback='.length).trim()
    if (arg.startsWith('--scope=')) flags.scope = arg.slice('--scope='.length).trim()
    if (arg.startsWith('--tool=')) flags.tool = arg.slice('--tool='.length).trim()
    if (arg.startsWith('--paramsJson=')) flags.paramsJson = arg.slice('--paramsJson='.length).trim()
    if (arg.startsWith('--params=')) flags.paramsJson = arg.slice('--params='.length).trim()
    if (arg.startsWith('--timeoutMs=')) flags.timeoutMs = Number(arg.slice('--timeoutMs='.length))
    if (arg.startsWith('--googleAccount=')) flags.googleAccount = arg.slice('--googleAccount='.length).trim()
    if (arg.startsWith('--googleCredentialSource=')) flags.googleCredentialSource = arg.slice('--googleCredentialSource='.length).trim()
    if (arg.startsWith('--profileDir=')) flags.profileDir = arg.slice('--profileDir='.length).trim()
  }
  return flags
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2))
}

function b64url(buffer) {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function makePkce() {
  const verifier = b64url(crypto.randomBytes(48))
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest())
  return { verifier, challenge, method: 'S256' }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(options.timeoutMs || 15000),
  })
  const text = await response.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    // Keep json null; caller can still inspect status/text.
  }
  return {
    ok: response.ok,
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    json,
    text,
  }
}

async function callMcp(method, {
  token = '',
  id = 1,
  params = {},
} = {}) {
  return fetchJson(MCP_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  })
}

async function registerClient({ callback, scope }) {
  const response = await fetchJson('https://app.myicor.com/api/oauth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      redirect_uris: [callback],
      client_name: 'BCrew AIOS MyICOR Readonly Connector',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      scope,
      token_endpoint_auth_method: 'none',
    }),
  })
  if (!response.ok || !response.json?.client_id) {
    throw new Error(`myICOR OAuth client registration failed: ${response.status}`)
  }
  return response.json
}

function buildAuthUrl({
  authorizationEndpoint,
  clientId,
  callback,
  scope,
  challenge,
  state,
}) {
  const url = new URL(authorizationEndpoint)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', callback)
  url.searchParams.set('scope', scope)
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}

function openBrowser(url) {
  if (process.platform !== 'darwin') return false
  const child = spawn('open', [url], { stdio: 'ignore', detached: true })
  child.unref()
  return true
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function sanitizePathPart(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function defaultAgentProfileDir({ account = DEFAULT_ACCOUNT } = {}) {
  return path.join(REPO_ROOT, '.openclaw', 'myicor-mcp-oauth', 'profiles', sanitizePathPart(account || DEFAULT_ACCOUNT))
}

function defaultAgentRunDir() {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  return path.join(REPO_ROOT, '.openclaw', 'myicor-mcp-oauth', 'runs', `myicor-mcp-oauth-agent-${stamp}`)
}

async function inspectPageAuthState(page) {
  return page.evaluate(() => {
    const visibleText = element => {
      const style = window.getComputedStyle(element)
      if (style.visibility === 'hidden' || style.display === 'none') return ''
      return (element.innerText || element.textContent || '').trim()
    }
    const bodyText = (document.body?.innerText || '').replace(/\s+/g, ' ').trim()
    const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'))
      .map(visibleText)
      .filter(Boolean)
      .slice(0, 40)
    const inputs = Array.from(document.querySelectorAll('input')).map(input => ({
      type: input.getAttribute('type') || '',
      name: input.getAttribute('name') || '',
      autocomplete: input.getAttribute('autocomplete') || '',
      ariaLabel: input.getAttribute('aria-label') || '',
      placeholder: input.getAttribute('placeholder') || '',
      visible: Boolean(input.offsetParent || input.getClientRects().length),
    }))
    return {
      url: window.location.href,
      title: document.title || '',
      bodyTextPreview: bodyText.slice(0, 2000),
      loginButtons: buttons,
      hasEmailInput: inputs.some(input => input.visible && /email|text/.test(input.type || 'text') && /email|identifier|username|login/i.test(`${input.name} ${input.autocomplete} ${input.ariaLabel} ${input.placeholder}`)),
      hasPasswordInput: inputs.some(input => input.visible && input.type === 'password'),
      inputs: inputs.slice(0, 20),
    }
  }).catch(error => ({
    url: page.url(),
    title: '',
    bodyTextPreview: `inspect_failed:${error instanceof Error ? error.message : String(error)}`,
    loginButtons: [],
    hasEmailInput: false,
    hasPasswordInput: false,
    inputs: [],
  }))
}

async function clickFirstVisible(page, selectors = [], timeout = 1200) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first()
    if (await locator.isVisible({ timeout }).catch(() => false)) {
      await locator.click({ timeout, noWaitAfter: true })
      return selector
    }
  }
  return ''
}

async function fillFirstVisible(page, selectors = [], value = '', timeout = 1200) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first()
    if (await locator.isVisible({ timeout }).catch(() => false)) {
      await locator.fill(value, { timeout })
      return selector
    }
  }
  return ''
}

async function pressNext(page) {
  const clicked = await clickFirstVisible(page, [
    'button:has-text("Next")',
    'div[role="button"]:has-text("Next")',
    'button:has-text("Continue")',
    'div[role="button"]:has-text("Continue")',
    'button[type="submit"]',
    '[role="button"]:has-text("Next")',
  ], 1500)
  if (clicked) return clicked
  await page.keyboard.press('Enter').catch(() => {})
  return 'keyboard:Enter'
}

async function clickGoogleAccountChoice(page, googleAccount = '') {
  const account = String(googleAccount || '').trim().toLowerCase()
  if (!account) return ''
  const exactIdentifier = page.locator(`[data-identifier="${googleAccount}"]`).first()
  const exactBox = await exactIdentifier.boundingBox({ timeout: 1500 }).catch(() => null)
  if (exactBox && exactBox.width > 0 && exactBox.height > 0) {
    await page.mouse.click(exactBox.x + exactBox.width / 2, exactBox.y + exactBox.height / 2)
    return 'data-identifier-coordinate-click'
  }
  const box = await page.evaluate(accountValue => {
    const candidates = Array.from(document.querySelectorAll('[data-identifier], [role="link"], [role="button"], li, div, a, button'))
    const visible = element => {
      const rect = element.getBoundingClientRect()
      const style = window.getComputedStyle(element)
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
    }
    const score = element => {
      const text = (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
      const dataIdentifier = String(element.getAttribute('data-identifier') || '').toLowerCase()
      if (dataIdentifier === accountValue) return 100
      if (text.includes(accountValue) && /steve|zahnd|choose an account|sign in with google/.test(document.body.innerText || '')) return 80
      if (text.includes('steve zahnd') && text.includes(accountValue.split('@')[0])) return 70
      return 0
    }
    const row = candidates
      .filter(visible)
      .map(element => ({ element, score: score(element) }))
      .filter(item => item.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return a.element.getBoundingClientRect().width - b.element.getBoundingClientRect().width
      })[0]?.element
    if (!row) return ''
    const clickable = row.closest('[role="link"], [role="button"], a, button, li') || row
    clickable.scrollIntoView({ block: 'center', inline: 'center' })
    const rect = clickable.getBoundingClientRect()
    return {
      label: clickable.getAttribute('data-identifier') || clickable.getAttribute('role') || 'account-choice-coordinate-click',
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height,
    }
  }, account).catch(() => '')
  if (!box || !box.width || !box.height) return ''
  await page.mouse.click(box.x, box.y)
  return box.label || 'account-choice-coordinate-click'
}

async function readGooglePassword({ source = DEFAULT_GOOGLE_CREDENTIAL_SOURCE, account = EXISTING_GOOGLE_SSO_ACCOUNT } = {}) {
  const present = await keychainItemExists({ source, account }).catch(() => false)
  if (!present) return { ok: false, source, account, secretRef: buildKeychainSecretRef({ source, account }) }
  const secret = await readKeychainPassword({ source, account })
  return { ok: true, source, account, secretRef: buildKeychainSecretRef({ source, account }), secret }
}

async function writeAuthNeededReport({
  runDir,
  account = '',
  reason = '',
  authState = {},
  setupCommand = '',
  resumeCommand = '',
} = {}) {
  await fs.mkdir(runDir, { recursive: true })
  const artifactRef = path.join(runDir, 'auth-needed.json')
  const event = buildSourceSessionBrokerAuthNeededEvent({
    sourceSystem: 'myicor',
    accountLabel: account || EXISTING_GOOGLE_SSO_ACCOUNT,
    blocker: reason || 'myICOR OAuth needs human auth',
    jobId: 'myicor-mcp-oauth-agent',
    artifactRef,
  })
  const report = {
    ok: false,
    status: 'auth_needed',
    reason,
    account,
    authMethodRequired: 'google_oauth_sign_in',
    expectedGoogleAccount: EXISTING_GOOGLE_SSO_ACCOUNT,
    setupCommand,
    resumeCommand,
    authState: {
      url: authState.url || '',
      title: authState.title || '',
      bodyTextPreview: String(authState.bodyTextPreview || '').slice(0, 1000),
      loginButtons: Array.isArray(authState.loginButtons) ? authState.loginButtons.slice(0, 20) : [],
      hasEmailInput: Boolean(authState.hasEmailInput),
      hasPasswordInput: Boolean(authState.hasPasswordInput),
    },
    harlanEvent: event,
    rawSecretPrinted: false,
    sideEffects: {
      tokenStoredInKeychain: false,
      submittedExternalApproval: false,
      mutatedCredentials: false,
      normalChromeProfileUsed: false,
    },
  }
  await fs.writeFile(artifactRef, JSON.stringify(report, null, 2))
  return { report, artifactRef }
}

async function writeLiveStateReport({
  page,
  runDir,
  authState = {},
  actions = [],
  status = 'running',
} = {}) {
  await fs.mkdir(runDir, { recursive: true })
  const statePath = path.join(runDir, 'live-state.json')
  const screenshotPath = path.join(runDir, 'live-screenshot.png')
  await fs.writeFile(statePath, JSON.stringify({
    status,
    updatedAt: new Date().toISOString(),
    url: authState.url || page?.url?.() || '',
    title: authState.title || '',
    bodyTextPreview: String(authState.bodyTextPreview || '').slice(0, 1000),
    loginButtons: Array.isArray(authState.loginButtons) ? authState.loginButtons.slice(0, 20) : [],
    hasEmailInput: Boolean(authState.hasEmailInput),
    hasPasswordInput: Boolean(authState.hasPasswordInput),
    actionCount: actions.length,
    lastActions: actions.slice(-8),
    screenshotPath,
    rawSecretPrinted: false,
  }, null, 2))
  await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {})
  return { statePath, screenshotPath }
}

function codeFromCallbackResolved(codePromise) {
  return Promise.race([
    codePromise.then(code => ({ done: true, code })).catch(error => ({ done: true, error })),
    sleep(1).then(() => ({ done: false })),
  ])
}

async function driveMyicorOauthAgent({
  page,
  codePromise,
  googleAccount,
  googleCredentialSource,
  runDir,
  authorizationUrl,
  timeoutMs,
} = {}) {
  const startedAt = Date.now()
  const actions = []
  let passwordAttempted = false
  let emailAttempted = false
  let accountChoiceAttempts = 0
  let lastAccountChoiceUrl = ''
  let mcpAuthorizeRetryAfterLoginAttempted = false
  let wrongBranchRecoveryAttempted = false
  let humanVerificationNotified = false
  let lastHumanVerificationState = null

  await page.goto(authorizationUrl, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(1500).catch(() => {})

  while (Date.now() - startedAt < timeoutMs) {
    const callback = await codeFromCallbackResolved(codePromise)
    if (callback.done) {
      if (callback.error) {
        const authState = await inspectPageAuthState(page)
        const reason = /Timed out waiting for myICOR OAuth callback/i.test(callback.error.message || '')
          ? 'myicor_oauth_callback_timeout'
          : 'myicor_oauth_callback_error'
        const { report, artifactRef } = await writeAuthNeededReport({
          runDir,
          account: googleAccount,
          reason,
          authState,
          resumeCommand: 'npm run myicor:mcp-authorize-agent -- --account=myicor-authorized-member',
        })
        return { ok: false, status: 'auth_needed', reason, authState, authNeededReport: report, artifactRef, actions, rawSecretPrinted: false }
      }
      return { ok: true, status: 'oauth_callback_received', code: callback.code, actions, rawSecretPrinted: false }
    }

    const authState = await inspectPageAuthState(page)
    await writeLiveStateReport({ page, runDir, authState, actions, status: 'running' }).catch(() => {})
    const guard = evaluateMyicorBrowserAuthSurface({ account: googleAccount, authState })
    if (guard.reason === 'myicor_wrong_signup_branch_existing_google_sso_required') {
      if (!wrongBranchRecoveryAttempted) {
        wrongBranchRecoveryAttempted = true
        const current = new URL(authState.url || authorizationUrl)
        const returnUrl = current.searchParams.get('returnUrl') || `${new URL(authorizationUrl).pathname}${new URL(authorizationUrl).search}`
        const loginUrl = new URL('https://app.myicor.com/login')
        if (returnUrl) loginUrl.searchParams.set('returnUrl', returnUrl)
        await page.context().clearCookies().catch(() => {})
        await page.goto(loginUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        actions.push({ action: 'wrong_signup_branch_recovered_to_login', url: loginUrl.toString() })
        await page.waitForTimeout(2000)
        continue
      }
      const { report, artifactRef } = await writeAuthNeededReport({
        runDir,
        account: googleAccount,
        reason: guard.reason,
        authState,
        resumeCommand: 'npm run myicor:mcp-authorize-agent -- --account=myicor-authorized-member',
      })
      return { ok: false, status: 'auth_needed', reason: guard.reason, authState, authNeededReport: report, artifactRef, actions, rawSecretPrinted: false }
    }
    if (guard.reason === 'myicor_google_sso_mfa_or_human_verification_required') {
      if (!humanVerificationNotified) {
        const { artifactRef } = await writeAuthNeededReport({
          runDir,
          account: googleAccount,
          reason: guard.reason,
          authState,
          resumeCommand: 'npm run myicor:mcp-authorize-agent -- --account=myicor-authorized-member',
        })
        actions.push({ action: 'wait_for_google_human_verification', artifactRef })
        humanVerificationNotified = true
        lastHumanVerificationState = authState
      }
      await page.waitForTimeout(2500)
      continue
    }

    const url = authState.url || page.url()
    const surface = `${url}\n${authState.title}\n${authState.bodyTextPreview}\n${(authState.loginButtons || []).join('\n')}`.toLowerCase()

    if (/^https:\/\/app\.myicor\.com\//i.test(url) &&
      !/\/mcp\/authorize/i.test(url) &&
      !mcpAuthorizeRetryAfterLoginAttempted &&
      (/steve zahnd|my icor journey|myicor|your icor journey/i.test(surface))) {
      mcpAuthorizeRetryAfterLoginAttempted = true
      actions.push({ action: 'revisit_mcp_authorize_after_app_login', url: authorizationUrl })
      await page.goto(authorizationUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
      await page.waitForTimeout(2500)
      continue
    }

    if (/accounts\.google\.com/.test(url)) {
      if (authState.hasPasswordInput || /enter your password|show password/.test(surface)) {
        if (passwordAttempted) {
          await page.waitForTimeout(1500)
          continue
        }
        const password = await readGooglePassword({ source: googleCredentialSource, account: googleAccount })
        if (!password.ok) {
          const setupCommand = `npm run credentials:vault -- source:add --source=${googleCredentialSource} --account=${googleAccount}`
          const { report, artifactRef } = await writeAuthNeededReport({
            runDir,
            account: googleAccount,
            reason: 'google_sso_password_missing_from_keychain',
            authState,
            setupCommand,
            resumeCommand: 'npm run myicor:mcp-authorize-agent -- --account=myicor-authorized-member',
          })
          return { ok: false, status: 'auth_needed', reason: 'google_sso_password_missing_from_keychain', authState, authNeededReport: report, artifactRef, actions, setupCommand, rawSecretPrinted: false }
        }
        const passwordFilled = await fillFirstVisible(page, [
          'input[type="password"]',
          'input[name="password"]',
          'input[autocomplete="current-password"]',
        ], password.secret, 1500).catch(() => '')
        password.secret = ''
        if (passwordFilled) {
          passwordAttempted = true
          actions.push({ action: 'fill_google_password_from_keychain', selector: passwordFilled, secretRef: password.secretRef })
          const next = await pressNext(page)
          actions.push({ action: 'press_next_after_password', selector: next })
          await page.waitForTimeout(3500)
          continue
        }
      }

      if (/signin\/oauth\/.*consent|requestpath=%2fsignin%2foauth%2fconsent/i.test(url) ||
        (/wants to access your google account|request for permission|by clicking allow/i.test(surface) && /\ballow\b/.test(surface))) {
        const consentClicked = await clickFirstVisible(page, [
          'button:has-text("Allow")',
          'div[role="button"]:has-text("Allow")',
          '[role="button"]:has-text("Allow")',
          'button:has-text("Continue")',
          '[role="button"]:has-text("Continue")',
        ], 1500).catch(() => '')
        if (consentClicked) {
          actions.push({ action: 'click_google_consent_allow', selector: consentClicked })
          await page.waitForTimeout(3000)
          continue
        }
      }

      if (/choose an account|to continue to|use another account|sign in with google/i.test(surface)) {
        const accountClicked = await clickFirstVisible(page, [
          `[data-identifier="${googleAccount}"]`,
          `[role="link"]:has-text("${googleAccount}")`,
          `[role="button"]:has-text("${googleAccount}")`,
        ], 1000).catch(() => '')
        if (accountClicked) {
          actions.push({ action: 'click_google_account', selector: accountClicked })
          await page.waitForTimeout(1800)
          continue
        }
        const accountDomClicked = await clickGoogleAccountChoice(page, googleAccount)
        if (accountDomClicked) {
          actions.push({ action: 'click_google_account_dom', selector: accountDomClicked })
          const sameChoiceUrl = lastAccountChoiceUrl === url
          accountChoiceAttempts = sameChoiceUrl ? accountChoiceAttempts + 1 : 1
          lastAccountChoiceUrl = url
          if (accountChoiceAttempts >= 3) {
            const { report, artifactRef } = await writeAuthNeededReport({
              runDir,
              account: googleAccount,
              reason: 'google_account_choice_click_not_advancing',
              authState,
              resumeCommand: 'npm run myicor:mcp-authorize-agent -- --account=myicor-authorized-member --headless',
            })
            return { ok: false, status: 'auth_needed', reason: 'google_account_choice_click_not_advancing', authState, authNeededReport: report, artifactRef, actions, rawSecretPrinted: false }
          }
          await page.waitForTimeout(2200)
          continue
        }
      }

      if (!emailAttempted && (/email|identifier|sign in/.test(surface) || authState.hasEmailInput)) {
        const emailFilled = await fillFirstVisible(page, [
          'input[type="email"]',
          'input[name="identifier"]',
          'input[autocomplete="username"]',
          'input[type="text"]',
        ], googleAccount, 1500).catch(() => '')
        if (emailFilled) {
          emailAttempted = true
          actions.push({ action: 'fill_google_email', selector: emailFilled, account: googleAccount })
          const next = await pressNext(page)
          actions.push({ action: 'press_next_after_email', selector: next })
          await page.waitForTimeout(2500)
          continue
        }
      }
    }

    const googleClicked = await clickFirstVisible(page, [
      'button:has-text("Log in with Google")',
      'a:has-text("Log in with Google")',
      'button:has-text("Sign in with Google")',
      'a:has-text("Sign in with Google")',
      'button:has-text("Continue with Google")',
      'a:has-text("Continue with Google")',
      'button:has-text("Google")',
      'a:has-text("Google")',
    ], 900).catch(() => '')
    if (googleClicked) {
      actions.push({ action: 'click_google_sso', selector: googleClicked })
      await page.waitForTimeout(2500)
      continue
    }

    const approveClicked = await clickFirstVisible(page, [
      'button:has-text("Authorize")',
      'button:has-text("Allow")',
      'button:has-text("Approve")',
      'button:has-text("Continue")',
      'button:has-text("Connect")',
      'a:has-text("Authorize")',
      'a:has-text("Allow")',
      'a:has-text("Approve")',
      'a:has-text("Continue")',
      'a:has-text("Connect")',
    ], 900).catch(() => '')
    if (approveClicked) {
      actions.push({ action: 'click_oauth_approval', selector: approveClicked })
      await page.waitForTimeout(2500)
      continue
    }

    await page.waitForTimeout(1000)
  }

  const authState = await inspectPageAuthState(page)
  const { report, artifactRef } = await writeAuthNeededReport({
    runDir,
    account: googleAccount,
    reason: humanVerificationNotified ? 'myicor_google_sso_mfa_or_human_verification_timeout' : 'myicor_oauth_agent_timeout',
    authState: humanVerificationNotified ? (lastHumanVerificationState || authState) : authState,
    resumeCommand: 'npm run myicor:mcp-authorize-agent -- --account=myicor-authorized-member',
  })
  return {
    ok: false,
    status: 'auth_needed',
    reason: humanVerificationNotified ? 'myicor_google_sso_mfa_or_human_verification_timeout' : 'myicor_oauth_agent_timeout',
    authState: humanVerificationNotified ? (lastHumanVerificationState || authState) : authState,
    authNeededReport: report,
    artifactRef,
    actions,
    rawSecretPrinted: false,
  }
}

function waitForCode({ callback, expectedState, timeoutMs, controller = null }) {
  const callbackUrl = new URL(callback)
  return new Promise((resolve, reject) => {
    let settled = false
    const server = http.createServer((req, res) => {
      try {
        const requestUrl = new URL(req.url || '/', callbackUrl.origin)
        if (requestUrl.pathname !== callbackUrl.pathname) {
          res.writeHead(404)
          res.end('Not found')
          return
        }
        const code = requestUrl.searchParams.get('code') || ''
        const state = requestUrl.searchParams.get('state') || ''
        const error = requestUrl.searchParams.get('error') || ''
        if (error) throw new Error(error)
        if (!code) throw new Error('OAuth callback did not include code.')
        if (state !== expectedState) throw new Error('OAuth callback state mismatch.')
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end('<html><body><h1>myICOR connected</h1><p>You can close this tab and return to Codex.</p></body></html>')
        server.close()
        settled = true
        resolve(code)
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end(error instanceof Error ? error.message : String(error))
        server.close()
        settled = true
        reject(error)
      }
    })
    if (controller) {
      controller.close = () => {
        if (settled) return
        settled = true
        server.close()
      }
    }
    server.on('error', reject)
    server.listen(Number(callbackUrl.port || 80), callbackUrl.hostname, () => {})
    setTimeout(() => {
      if (settled) return
      settled = true
      server.close()
      reject(new Error('Timed out waiting for myICOR OAuth callback.'))
    }, timeoutMs).unref()
  })
}

async function exchangeToken({
  tokenEndpoint,
  clientId,
  code,
  callback,
  verifier,
}) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    code,
    redirect_uri: callback,
    code_verifier: verifier,
  })
  const response = await fetchJson(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!response.ok || !response.json?.access_token) {
    throw new Error(`myICOR token exchange failed: ${response.status}`)
  }
  return response.json
}

async function refreshToken({
  tokenEndpoint,
  clientId,
  refreshToken,
}) {
  if (!refreshToken) throw new Error('No myICOR refresh token is stored.')
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    refresh_token: refreshToken,
  })
  const response = await fetchJson(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!response.ok || !response.json?.access_token) {
    throw new Error(`myICOR token refresh failed: ${response.status}`)
  }
  return response.json
}

async function storeOAuthToken({
  account,
  token,
  clientId,
  scope,
}) {
  return storeKeychainPassword({
    source: KEYCHAIN_SOURCE,
    account,
    secret: JSON.stringify({
      token_type: token.token_type || 'Bearer',
      access_token: token.access_token,
      refresh_token: token.refresh_token || '',
      expires_in: token.expires_in || null,
      scope: token.scope || scope,
      client_id: clientId,
      mcp_url: MCP_URL,
      updated_at: new Date().toISOString(),
    }),
    label: 'BCrew AI OS myICOR MCP OAuth token',
    comment: 'Read-only myICOR MCP OAuth token for the local source session broker.',
  })
}

function summarizeMcpResponse(response) {
  const result = response.json?.result || null
  const error = response.json?.error || null
  return {
    ok: response.ok && !error,
    status: response.status,
    result,
    error,
    authenticate: response.headers?.['www-authenticate'] || '',
  }
}

async function readStoredToken({ account }) {
  const present = await keychainItemExists({ source: KEYCHAIN_SOURCE, account })
  if (!present) return { ok: false, present: false, token: null }
  const raw = await readKeychainPassword({ source: KEYCHAIN_SOURCE, account })
  return { ok: true, present: true, token: JSON.parse(raw) }
}

async function callWithStoredToken({
  account,
  method,
  params,
  id = 10,
}) {
  const stored = await readStoredToken({ account })
  if (!stored.present) {
    return {
      ok: false,
      missingToken: true,
      response: null,
      tokenRefreshed: false,
    }
  }
  let activeToken = stored.token
  let response = await callMcp(method, { token: activeToken.access_token, id, params })
  let tokenRefreshed = false
  if (response.status === 401 && activeToken.refresh_token && activeToken.client_id) {
    const metadata = await fetchJson(AUTH_METADATA_URL)
    const nextToken = await refreshToken({
      tokenEndpoint: metadata.json.token_endpoint,
      clientId: activeToken.client_id,
      refreshToken: activeToken.refresh_token,
    })
    await storeOAuthToken({
      account,
      token: {
        ...nextToken,
        refresh_token: nextToken.refresh_token || activeToken.refresh_token,
      },
      clientId: activeToken.client_id,
      scope: nextToken.scope || activeToken.scope || DEFAULT_SCOPE,
    })
    activeToken = {
      ...activeToken,
      ...nextToken,
      refresh_token: nextToken.refresh_token || activeToken.refresh_token,
    }
    tokenRefreshed = true
    response = await callMcp(method, { token: activeToken.access_token, id: id + 1, params })
  }
  return {
    ok: response.ok && !response.json?.error,
    missingToken: false,
    response,
    tokenRefreshed,
  }
}

async function preflight({ json = false } = {}) {
  const [metadata, initialize, oldSse, toolsList] = await Promise.all([
    fetchJson(AUTH_METADATA_URL),
    callMcp('initialize', {
      id: 1,
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'bcrew-ai-os-preflight', version: '0.1.0' },
      },
    }),
    fetchJson(OLD_SSE_URL, { method: 'GET', headers: { Accept: 'text/event-stream' } }),
    callMcp('tools/list', { id: 2 }),
  ])
  const result = {
    ok: Boolean(
      metadata.ok &&
      metadata.json?.authorization_endpoint &&
      metadata.json?.token_endpoint &&
      initialize.ok &&
      initialize.json?.result?.serverInfo?.name === 'myicor-mcp' &&
      toolsList.status === 401
    ),
    endpoints: {
      mcp: MCP_URL,
      oldSse: OLD_SSE_URL,
      authorizationMetadata: AUTH_METADATA_URL,
      authorizationEndpoint: metadata.json?.authorization_endpoint || '',
      tokenEndpoint: metadata.json?.token_endpoint || '',
      registrationEndpoint: metadata.json?.registration_endpoint || '',
    },
    scopesSupported: metadata.json?.scopes_supported || [],
    mcpServer: initialize.json?.result?.serverInfo || null,
    protocolVersion: initialize.json?.result?.protocolVersion || '',
    toolCapabilityAdvertised: Boolean(initialize.json?.result?.capabilities?.tools),
    unauthenticatedToolsList: summarizeMcpResponse(toolsList),
    oldSseStatus: oldSse.status,
    conclusion: toolsList.status === 401
      ? 'OAuth token required before tools/list or extraction.'
      : 'Unexpected unauthenticated tools/list behavior; inspect before extraction.',
    rawSecretPrinted: false,
  }
  if (json) printJson(result)
  else {
    console.log(`myICOR MCP preflight: ${result.ok ? 'ready_for_oauth' : 'blocked'}`)
    console.log(`mcp: ${MCP_URL}`)
    console.log(`server: ${result.mcpServer?.name || 'unknown'} ${result.mcpServer?.version || ''}`.trim())
    console.log(`tools/list without token: HTTP ${result.unauthenticatedToolsList.status}`)
    console.log(`old /sse endpoint: HTTP ${result.oldSseStatus}`)
    console.log('raw secret: never printed')
  }
  return result
}

async function authorize({
  account,
  callback,
  scope,
  timeoutMs,
  open,
  json = false,
} = {}) {
  const metadata = await fetchJson(AUTH_METADATA_URL)
  if (!metadata.ok) throw new Error(`OAuth metadata fetch failed: ${metadata.status}`)
  const pkce = makePkce()
  const state = b64url(crypto.randomBytes(24))
  const client = await registerClient({ callback, scope })
  const authorizationUrl = buildAuthUrl({
    authorizationEndpoint: metadata.json.authorization_endpoint,
    clientId: client.client_id,
    callback,
    scope,
    challenge: pkce.challenge,
    state,
  })
  const browserOpened = open ? openBrowser(authorizationUrl) : false
  if (!json) {
    console.log('myICOR account rule:')
    console.log(`- Existing paid access uses Google SSO: ${EXISTING_GOOGLE_SSO_ACCOUNT}`)
    console.log(`- ${WRONG_BRANCH_STOP_TEXT}`)
    console.log('- If Google asks for 2FA/passkey/number match, complete that human verification, then return here.')
    console.log('')
    console.log('Open this myICOR authorization URL and approve read-only access:')
    console.log(authorizationUrl)
    console.log('')
    console.log('Waiting for the local callback...')
  }
  const code = await waitForCode({ callback, expectedState: state, timeoutMs })
  const token = await exchangeToken({
    tokenEndpoint: metadata.json.token_endpoint,
    clientId: client.client_id,
    code,
    callback,
    verifier: pkce.verifier,
  })
  const stored = await storeOAuthToken({
    account,
    token,
    clientId: client.client_id,
    scope,
  })
  const toolsList = await callMcp('tools/list', { token: token.access_token, id: 3 })
  const tools = toolsList.json?.result?.tools || []
  const result = {
    ok: Boolean(stored.secretRef && toolsList.ok && !toolsList.json?.error),
    account,
    secretRef: stored.secretRef,
    mcpUrl: MCP_URL,
    browserOpened,
    clientId: client.client_id,
    scope: token.scope || scope,
    existingGoogleSsoAccount: EXISTING_GOOGLE_SSO_ACCOUNT,
    signupOrProfileCreationAllowed: false,
    wrongBranchStopCondition: WRONG_BRANCH_STOP_TEXT,
    tokenStoredInKeychain: true,
    rawSecretPrinted: false,
    toolsListStatus: toolsList.status,
    toolCount: tools.length,
    toolNames: tools.map(tool => tool.name).slice(0, 50),
  }
  if (json) printJson(result)
  else {
    console.log(`myICOR MCP authorization: ${result.ok ? 'stored_and_verified' : 'stored_but_unverified'}`)
    console.log(`secretRef: ${result.secretRef}`)
    console.log(`tools: ${result.toolCount}`)
    console.log('raw secret: never printed')
  }
  return result
}

async function authorizeAgent({
  account,
  callback,
  scope,
  timeoutMs,
  googleAccount = EXISTING_GOOGLE_SSO_ACCOUNT,
  googleCredentialSource = DEFAULT_GOOGLE_CREDENTIAL_SOURCE,
  profileDir = '',
  headless = false,
  json = false,
} = {}) {
  if (googleAccount !== SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT) {
    throw new Error(`myICOR MCP OAuth must use existing Google SSO account ${SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT}.`)
  }
  const metadata = await fetchJson(AUTH_METADATA_URL)
  if (!metadata.ok) throw new Error(`OAuth metadata fetch failed: ${metadata.status}`)
  const pkce = makePkce()
  const state = b64url(crypto.randomBytes(24))
  const client = await registerClient({ callback, scope })
  const authorizationUrl = buildAuthUrl({
    authorizationEndpoint: metadata.json.authorization_endpoint,
    clientId: client.client_id,
    callback,
    scope,
    challenge: pkce.challenge,
    state,
  })
  const resolvedProfileDir = path.resolve(profileDir || defaultAgentProfileDir({ account }))
  const runDir = defaultAgentRunDir()
  await fs.mkdir(runDir, { recursive: true })

  const codeController = {}
  const codePromise = waitForCode({
    callback,
    expectedState: state,
    timeoutMs,
    controller: codeController,
  })

  const { chromium } = await import('playwright')
  const context = await chromium.launchPersistentContext(resolvedProfileDir, {
    headless,
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: false,
    args: [
      '--disable-session-crashed-bubble',
      '--disable-features=Translate,AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
    ],
  })
  let page = context.pages()[0] || await context.newPage()
  try {
    const agent = await driveMyicorOauthAgent({
      page,
      codePromise,
      googleAccount,
      googleCredentialSource,
      runDir,
      authorizationUrl,
      timeoutMs,
    })
    if (!agent.ok) {
      codeController.close?.()
      const result = {
        ok: false,
        status: agent.status,
        reason: agent.reason,
        account,
        profileDir: resolvedProfileDir,
        runDir,
        expectedGoogleAccount: googleAccount,
        googleCredentialSource,
        setupCommand: agent.setupCommand || '',
        authNeededReportPath: agent.artifactRef || '',
        actions: agent.actions || [],
        rawSecretPrinted: false,
      }
      if (json) printJson(result)
      else {
        console.log(`myICOR MCP agent authorization: ${agent.status}`)
        console.log(`reason: ${agent.reason}`)
        if (agent.setupCommand) console.log(`setup: ${agent.setupCommand}`)
        if (agent.artifactRef) console.log(`auth-needed: ${agent.artifactRef}`)
        console.log('raw secret: never printed')
      }
      return result
    }

    const token = await exchangeToken({
      tokenEndpoint: metadata.json.token_endpoint,
      clientId: client.client_id,
      code: agent.code,
      callback,
      verifier: pkce.verifier,
    })
    const stored = await storeOAuthToken({
      account,
      token,
      clientId: client.client_id,
      scope,
    })
    const toolsList = await callMcp('tools/list', { token: token.access_token, id: 30 })
    const tools = toolsList.json?.result?.tools || []
    const result = {
      ok: Boolean(stored.secretRef && toolsList.ok && !toolsList.json?.error),
      status: toolsList.ok && !toolsList.json?.error ? 'stored_and_verified' : 'stored_but_unverified',
      account,
      secretRef: stored.secretRef,
      mcpUrl: MCP_URL,
      profileDir: resolvedProfileDir,
      runDir,
      drivenByAgent: true,
      existingGoogleSsoAccount: googleAccount,
      googleCredentialSource,
      signupOrProfileCreationAllowed: false,
      wrongBranchStopCondition: WRONG_BRANCH_STOP_TEXT,
      tokenStoredInKeychain: true,
      rawSecretPrinted: false,
      toolsListStatus: toolsList.status,
      toolCount: tools.length,
      toolNames: tools.map(tool => tool.name).slice(0, 50),
      actions: agent.actions || [],
    }
    if (json) printJson(result)
    else {
      console.log(`myICOR MCP agent authorization: ${result.status}`)
      console.log(`secretRef: ${result.secretRef}`)
      console.log(`tools: ${result.toolCount}`)
      console.log('raw secret: never printed')
    }
    return result
  } finally {
    codeController.close?.()
    await context.close().catch(() => {})
  }
}

async function tools({ account, json = false } = {}) {
  const present = await keychainItemExists({ source: KEYCHAIN_SOURCE, account })
  if (!present) {
    const agentAuthorizeCommand = myicorMcpAuthorizeAgentCommand(account)
    const result = {
      ok: false,
      account,
      secretRef: buildKeychainSecretRef({ source: KEYCHAIN_SOURCE, account }),
      keychainPresent: false,
      next: `Run ${agentAuthorizeCommand}`,
      agentAuthorizeCommand,
      manualAuthorizeCommand: myicorMcpAuthorizeManualCommand(account),
      googleCredentialSource: DEFAULT_GOOGLE_CREDENTIAL_SOURCE,
      expectedGoogleAccount: EXISTING_GOOGLE_SSO_ACCOUNT,
      googleCredentialStatusCommand: sourceCredentialStatusCommand(),
      wrongBranchStopCondition: WRONG_BRANCH_STOP_TEXT,
      rawSecretPrinted: false,
    }
    if (json) printJson(result)
    else {
      console.log('myICOR MCP token missing.')
      console.log(`secretRef: ${result.secretRef}`)
      console.log(result.next)
    }
    process.exitCode = 1
    return result
  }
  const call = await callWithStoredToken({ account, method: 'tools/list', params: {}, id: 4 })
  const toolsList = call.response
  const toolRows = toolsList.json?.result?.tools || []
  const result = {
    ok: toolsList.ok && !toolsList.json?.error,
    account,
    secretRef: buildKeychainSecretRef({ source: KEYCHAIN_SOURCE, account }),
    keychainPresent: true,
    mcpUrl: MCP_URL,
    tokenRefreshed: call.tokenRefreshed,
    toolsListStatus: toolsList.status,
    toolCount: toolRows.length,
    tools: toolRows.map(tool => ({
      name: tool.name,
      description: tool.description || '',
      inputSchemaKeys: Object.keys(tool.inputSchema?.properties || {}),
    })),
    rawSecretPrinted: false,
  }
  if (json) printJson(result)
  else {
    console.log(`myICOR MCP tools: ${result.ok ? result.toolCount : 'blocked'}`)
    for (const tool of result.tools) console.log(`- ${tool.name}: ${tool.description}`)
    console.log('raw secret: never printed')
  }
  return result
}

async function callTool({ account, tool, paramsJson = '{}', json = false } = {}) {
  if (!tool) throw new Error('--tool is required.')
  let parsedParams = {}
  try {
    parsedParams = paramsJson ? JSON.parse(paramsJson) : {}
  } catch (error) {
    throw new Error(`--paramsJson must be valid JSON: ${error instanceof Error ? error.message : String(error)}`)
  }
  const present = await keychainItemExists({ source: KEYCHAIN_SOURCE, account })
  if (!present) {
    const agentAuthorizeCommand = myicorMcpAuthorizeAgentCommand(account)
    const result = {
      ok: false,
      account,
      secretRef: buildKeychainSecretRef({ source: KEYCHAIN_SOURCE, account }),
      keychainPresent: false,
      next: `Run ${agentAuthorizeCommand}`,
      agentAuthorizeCommand,
      manualAuthorizeCommand: myicorMcpAuthorizeManualCommand(account),
      googleCredentialSource: DEFAULT_GOOGLE_CREDENTIAL_SOURCE,
      expectedGoogleAccount: EXISTING_GOOGLE_SSO_ACCOUNT,
      googleCredentialStatusCommand: sourceCredentialStatusCommand(),
      wrongBranchStopCondition: WRONG_BRANCH_STOP_TEXT,
      rawSecretPrinted: false,
    }
    if (json) printJson(result)
    else {
      console.log('myICOR MCP token missing.')
      console.log(`secretRef: ${result.secretRef}`)
      console.log(result.next)
    }
    process.exitCode = 1
    return result
  }
  const call = await callWithStoredToken({
    account,
    method: 'tools/call',
    params: { name: tool, arguments: parsedParams },
    id: 20,
  })
  const result = {
    ok: call.ok,
    account,
    secretRef: buildKeychainSecretRef({ source: KEYCHAIN_SOURCE, account }),
    keychainPresent: true,
    mcpUrl: MCP_URL,
    tokenRefreshed: call.tokenRefreshed,
    tool,
    status: call.response?.status || 0,
    response: call.response?.json || null,
    rawSecretPrinted: false,
  }
  if (json) printJson(result)
  else {
    console.log(`myICOR MCP call ${tool}: ${result.ok ? 'ok' : 'blocked'}`)
    console.log(JSON.stringify(result.response, null, 2))
    console.log('raw secret: never printed')
  }
  process.exitCode = result.ok ? 0 : 1
  return result
}

async function main() {
  const args = parseArgs()
  if (args.command === 'preflight') {
    const result = await preflight(args)
    process.exitCode = result.ok ? 0 : 1
    return
  }
  if (args.command === 'authorize') {
    const result = await authorize(args)
    process.exitCode = result.ok ? 0 : 1
    return
  }
  if (args.command === 'authorize-agent') {
    const result = await authorizeAgent(args)
    process.exitCode = result.ok ? 0 : 1
    return
  }
  if (args.command === 'tools') {
    const result = await tools(args)
    process.exitCode = result.ok ? 0 : 1
    return
  }
  if (args.command === 'call') {
    await callTool(args)
    return
  }
  console.error('Usage: node scripts/myicor-mcp-oauth.mjs <preflight|authorize|authorize-agent|tools|call> [--account=myicor-authorized-member] [--tool=name] [--paramsJson={}] [--json]')
  process.exitCode = 2
}

main().catch(error => {
  console.error('myICOR MCP OAuth command failed.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
