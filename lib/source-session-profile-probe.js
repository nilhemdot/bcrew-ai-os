import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import {
  runLocalVirtualBrowserHandsProbe,
} from './local-virtual-browser-hands-runtime.js'
import {
  keychainItemExists,
} from './credential-vault.js'
import {
  SOURCE_SESSION_BROKER_CARD_ID,
  SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
  SOURCE_SESSION_BROKER_MYICOR_AUTH_METHOD,
  SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT,
  buildSourceSessionSecretRef,
  evaluateSourceSessionBrokerRequest,
  resolveSourceSessionCredentialSource,
} from './source-session-broker.js'
import {
  evaluateMyicorBrowserAuthSurface,
} from './source-session-auth-guards.js'
import {
  buildSourceSessionAuthResumePacket,
} from './source-session-auth-resume-packet.js'

export const SOURCE_SESSION_PROFILE_PROBE_VERSION = 'source-session-profile-probe-v1'
export const SOURCE_SESSION_PROFILE_PROBE_SCRIPT_PATH = 'scripts/process-source-session-profile-probe-check.mjs'
export const SOURCE_SESSION_PROFILE_PROBE_ROOT = '.openclaw/source-session-profile-probe'
export const SOURCE_SESSION_PROFILE_PROBE_CLOSEOUT_KEY = 'source-session-profile-probe-v1'

function text(value) {
  return String(value || '').trim()
}

function bool(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function stableHash(value = '') {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex')
}

function nowStamp(date = new Date()) {
  return date.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
}

function hostOf(value = '') {
  try {
    return new URL(text(value)).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

function safeKey(value = '') {
  return text(value).toLowerCase().replace(/[^a-z0-9:_-]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'source'
}

async function ensureDir(dirPath = '') {
  await fs.mkdir(dirPath, { recursive: true })
}

async function writeJson(filePath = '', value = {}) {
  await ensureDir(path.dirname(filePath))
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function defaultActionForFamily(sourceFamily = '') {
  if (sourceFamily === 'skool_free_community') return 'read_allowed_free_posts'
  if (sourceFamily === 'skool_paid_or_private') return 'read_approved_paid_area_after_packet'
  if (sourceFamily === 'creator_newsletters') return 'free_newsletter_signup'
  if (sourceFamily === 'paid_course_training_platforms') return 'read_approved_course_area_after_packet'
  return 'read_public_page'
}

function defaultAccountFor({ sourceFamily = '', source = '', account = '' } = {}) {
  if (text(account)) return text(account)
  if (sourceFamily === 'paid_course_training_platforms' && /myicor/i.test(source)) return SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT
  return SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT
}

function loginButtonsFromSnapshot(snapshot = {}) {
  return [
    ...list(snapshot.buttons).map(button => button.text),
    ...list(snapshot.anchors).map(anchor => anchor.text),
  ].map(text).filter(value => /log ?in|sign ?in|continue with google|google|verify|passkey|number match/i.test(value)).slice(0, 20)
}

function authStateFromHandsReport(report = {}) {
  const snapshot = list(report.snapshots)[0] || {}
  const controls = list(snapshot.forms?.controls)
  return {
    url: snapshot.url || report.finalUrl || report.targetUrl,
    title: snapshot.title || '',
    bodyTextPreview: snapshot.bodyTextPreview || '',
    hasEmailInput: snapshot.forms?.hasEmailInput === true ||
      controls.some(control => /email|username/i.test(`${control.type} ${control.name} ${control.placeholder} ${control.ariaLabel}`)),
    hasPasswordInput: snapshot.forms?.hasPasswordInput === true ||
      controls.some(control => /password/i.test(`${control.type} ${control.name}`)),
    loginButtons: loginButtonsFromSnapshot(snapshot),
    browserHealth: snapshot.browserHealth || null,
    credentialInputVisible: snapshot.credentialInputVisible === true,
    blockerDetected: snapshot.blockerDetected === true,
  }
}

function evaluateGenericAuthSurface(authState = {}) {
  const surface = `${authState.url || ''} ${authState.title || ''} ${authState.bodyTextPreview || ''} ${list(authState.loginButtons).join(' ')}`.toLowerCase()
  if (authState.browserHealth?.ok === false) {
    return {
      ok: false,
      status: 'blocked',
      reason: 'browser_state_blocked',
      nextAction: 'Retry exact URL in a clean isolated source profile before any source extraction claim.',
    }
  }
  if (/\b(mfa|2fa|passkey|verify|number match|check your phone|authenticator|approve.*phone)\b/.test(surface)) {
    return {
      ok: false,
      status: 'auth_needed',
      reason: 'mfa_or_human_verification_required',
      nextAction: 'Emit auth_needed, wait for DONE, silently reverify, then resume or fail closed.',
    }
  }
  if (authState.hasEmailInput || authState.hasPasswordInput || /\/login|\/sign-in|\/signin|log ?in|sign ?in|continue with google|password/.test(surface)) {
    return {
      ok: false,
      status: 'auth_needed',
      reason: 'login_or_credential_wall_visible',
      nextAction: 'Use Source Session Broker credential/session path; do not submit forms from the probe.',
    }
  }
  if (authState.blockerDetected) {
    return {
      ok: false,
      status: 'auth_needed',
      reason: 'source_session_blocker_visible',
      nextAction: 'Create an auth-needed packet or source-specific recovery packet before extraction.',
    }
  }
  return {
    ok: true,
    status: 'session_content_visible',
    reason: 'source_content_visible_without_auth_wall',
    nextAction: 'Session profile can be treated as ready for the bounded source worker.',
  }
}

function evaluateProfileAuthSurface({ sourceFamily = '', source = '', account = '', authState = {} } = {}) {
  if (sourceFamily === 'paid_course_training_platforms' && /myicor/i.test(source)) {
    return evaluateMyicorBrowserAuthSurface({ account, authState })
  }
  return evaluateGenericAuthSurface(authState)
}

function buildBrokerRequestFromProbe({
  sourceFamily = '',
  source = '',
  account = '',
  action = '',
  sourceBoundaryApproved = false,
  keychainPresent = false,
  loginRecipePresent = false,
  authSurface = {},
} = {}) {
  const myicor = sourceFamily === 'paid_course_training_platforms' && /myicor/i.test(source)
  return {
    sourceFamily,
    source,
    account,
    action: text(action) || defaultActionForFamily(sourceFamily),
    sourceBoundaryApproved: bool(sourceBoundaryApproved),
    persistentProfilePresent: true,
    sessionHealthy: authSurface.ok === true,
    keychainPresent: bool(keychainPresent),
    loginRecipePresent: bool(loginRecipePresent),
    authMethod: myicor ? SOURCE_SESSION_BROKER_MYICOR_AUTH_METHOD : '',
    signupSurfaceDetected: authSurface.reason === 'myicor_wrong_signup_branch_existing_google_sso_required',
    mfaChallenge: /mfa|human_verification|number_match|passkey|verify/i.test(authSurface.reason || ''),
  }
}

function statusFromDecision({ authSurface = {}, brokerDecision = {}, handsReport = {} } = {}) {
  if (handsReport.status === 'local_virtual_browser_hands_blocked_browser_state' || authSurface.reason === 'browser_state_blocked') {
    return 'source_session_profile_blocked_browser_state'
  }
  if (authSurface.reason === 'myicor_wrong_signup_branch_existing_google_sso_required') {
    return 'source_session_profile_blocked_wrong_signup_branch'
  }
  if (brokerDecision?.ok === true && brokerDecision.status === 'session_ready') return 'source_session_profile_ready'
  if (brokerDecision?.ok === true && /login_recipe_ready/.test(brokerDecision.status || '')) return 'source_session_profile_login_recipe_ready_not_executed'
  if (brokerDecision?.status === 'auth_needed') return 'source_session_profile_auth_needed'
  if (brokerDecision?.status === 'blocked') return 'source_session_profile_blocked'
  return authSurface.ok === true ? 'source_session_profile_ready' : 'source_session_profile_auth_needed'
}

export async function runSourceSessionProfileProbe({
  url = '',
  sourceFamily = 'skool_free_community',
  source = '',
  account = '',
  action = '',
  sourceBoundaryApproved = true,
  keychainPresent,
  loginRecipePresent = false,
  profileMode = 'persistent_isolated',
  headed = false,
  rootDir = SOURCE_SESSION_PROFILE_PROBE_ROOT,
  now = new Date().toISOString(),
} = {}) {
  const targetUrl = text(url)
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) throw new Error(`A valid http(s) URL is required: ${url}`)
  const resolvedSource = text(source) || hostOf(targetUrl) || sourceFamily
  const resolvedAccount = defaultAccountFor({ sourceFamily, source: resolvedSource, account })
  const credentialSource = resolveSourceSessionCredentialSource({ sourceFamily, source: resolvedSource })
  const runId = `source-session-profile-probe-${nowStamp(new Date(now))}-${stableHash(`${targetUrl}:${resolvedSource}:${resolvedAccount}`).slice(0, 8)}`
  const runDir = path.resolve(rootDir, 'runs', runId)
  await ensureDir(runDir)
  let keychainMetadataPresent = keychainPresent
  if (keychainMetadataPresent === undefined) {
    keychainMetadataPresent = await keychainItemExists({ source: credentialSource, account: resolvedAccount }).catch(() => false)
  }

  const handsReport = await runLocalVirtualBrowserHandsProbe({
    url: targetUrl,
    sourceType: sourceFamily,
    sourceAccount: resolvedAccount,
    profileMode,
    headed,
    clickFirstSafeAction: false,
    rootDir: path.join(rootDir, 'local-hands'),
    now,
  })
  const authState = authStateFromHandsReport(handsReport)
  const authSurface = evaluateProfileAuthSurface({
    sourceFamily,
    source: resolvedSource,
    account: resolvedAccount,
    authState,
  })
  const brokerRequest = buildBrokerRequestFromProbe({
    sourceFamily,
    source: resolvedSource,
    account: resolvedAccount,
    action,
    sourceBoundaryApproved,
    keychainPresent: keychainMetadataPresent,
    loginRecipePresent,
    authSurface,
  })
  const brokerDecision = evaluateSourceSessionBrokerRequest(brokerRequest)
  const plan = {
    createdAt: now,
    sourcePacket: {
      sourceId: resolvedSource,
      url: targetUrl,
      sourceFamily,
      account: resolvedAccount,
    },
    toolRoute: { toolId: sourceFamily === 'skool_free_community' ? 'skool:free-god-mode' : 'source-session-broker' },
    brokerRequest,
    brokerDecision,
    stopReason: authSurface.reason || brokerDecision.reason,
  }
  const authResumePacket = buildSourceSessionAuthResumePacket({ plan, brokerDecision, now })
  const status = statusFromDecision({ authSurface, brokerDecision, handsReport })
  const report = {
    schemaVersion: 1,
    version: SOURCE_SESSION_PROFILE_PROBE_VERSION,
    cardId: SOURCE_SESSION_BROKER_CARD_ID,
    closeoutKey: SOURCE_SESSION_PROFILE_PROBE_CLOSEOUT_KEY,
    runId,
    status,
    ok: status === 'source_session_profile_ready',
    targetUrl,
    sourceFamily,
    source: resolvedSource,
    credentialSource,
    account: resolvedAccount,
    secretRef: buildSourceSessionSecretRef({ sourceFamily, source: resolvedSource, account: resolvedAccount }),
    keychainMetadataPresent: Boolean(keychainMetadataPresent),
    loginRecipePresent: Boolean(loginRecipePresent),
    authState,
    authSurface,
    brokerRequest,
    brokerDecision,
    authResumePacket,
    localHands: {
      status: handsReport.status,
      ok: handsReport.ok,
      finalUrl: handsReport.finalUrl,
      reportPath: handsReport.artifacts?.reportPath || '',
      snapshotCount: list(handsReport.snapshots).length,
      browserbaseUsed: handsReport.runtime?.browserbaseUsed === true,
      modelCalled: handsReport.runtime?.modelCalled === true,
      normalChromeProfileUsed: handsReport.runtime?.normalChromeProfileUsed === true,
    },
    sideEffects: {
      liveBrowserLaunched: handsReport.sideEffects?.liveBrowserLaunched === true,
      networkFetched: handsReport.sideEffects?.networkFetched === true,
      modelCalled: false,
      browserbaseUsed: false,
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
      rawSecretPrinted: false,
    },
    artifacts: {
      runDir,
      reportPath: path.join(runDir, 'report.json'),
      localOnly: true,
      trackedRepoContent: false,
    },
    next: brokerDecision.ok === true && brokerDecision.status === 'session_ready'
      ? 'Run the bounded source-specific worker using this isolated source profile.'
      : authResumePacket?.commands?.reverifyCommand || authSurface.nextAction || brokerDecision.nextAction,
  }
  await writeJson(report.artifacts.reportPath, report)
  return report
}

export function evaluateSourceSessionProfileProbeReport(report = {}) {
  const failures = []
  const add = (ok, check, detail = '') => {
    if (!ok) failures.push({ check, detail })
  }
  add(report.version === SOURCE_SESSION_PROFILE_PROBE_VERSION, 'version_matches', report.version || 'missing')
  add(report.cardId === SOURCE_SESSION_BROKER_CARD_ID, 'card_matches_source_session_broker', report.cardId || 'missing')
  add(report.localHands?.browserbaseUsed === false, 'browserbase_not_used', String(report.localHands?.browserbaseUsed))
  add(report.localHands?.modelCalled === false, 'model_not_called', String(report.localHands?.modelCalled))
  add(report.localHands?.normalChromeProfileUsed === false, 'normal_chrome_not_used', String(report.localHands?.normalChromeProfileUsed))
  add(report.sideEffects?.submittedForm === false && report.sideEffects?.loggedIn === false, 'probe_does_not_login_or_submit', JSON.stringify(report.sideEffects || {}))
  add(report.sideEffects?.rawSecretPrinted === false && !/password=|access_token=|refresh_token=|raw-secret/i.test(JSON.stringify(report)), 'no_raw_secret_output', 'secret-like values rejected')
  if (report.status === 'source_session_profile_ready') {
    add(report.brokerDecision?.status === 'session_ready', 'ready_requires_broker_session_ready', report.brokerDecision?.status || 'missing')
    add(report.authResumePacket?.status === 'resume_not_needed', 'ready_does_not_prepare_auth_escalation', report.authResumePacket?.status || 'missing')
  } else if (/auth_needed|wrong_signup|blocked/.test(report.status || '')) {
    add(report.authResumePacket?.status !== 'resume_not_needed', 'blocked_probe_has_resume_or_block_packet', report.authResumePacket?.status || 'missing')
    add(report.authResumePacket?.sideEffects?.externalNotificationSent === false, 'resume_packet_dry_run_only', JSON.stringify(report.authResumePacket?.sideEffects || {}))
  }
  return {
    ok: failures.length === 0,
    status: failures.length ? 'unhealthy' : 'healthy',
    failures,
  }
}
