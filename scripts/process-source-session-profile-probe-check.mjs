#!/usr/bin/env node

import fs from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  SOURCE_SESSION_PROFILE_PROBE_SCRIPT_PATH,
  evaluateSourceSessionProfileProbeReport,
  runSourceSessionProfileProbe,
} from '../lib/source-session-profile-probe.js'
import {
  SOURCE_SESSION_BROKER_MYICOR_GOOGLE_SSO_SOURCE,
} from '../lib/source-session-broker.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

async function withFixtureServer(callback) {
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url || '/', 'http://127.0.0.1').pathname
    const routes = {
      '/ready': `
        <html>
          <head><title>Free Community Ready</title></head>
          <body>
            <main>
              <h1>Free community classroom</h1>
              <p>Visible source content: posts, classroom lessons, pinned resources, and implementation notes.</p>
              <a href="/resource">Pinned resource</a>
            </main>
          </body>
        </html>`,
      '/login': `
        <html>
          <head><title>Log in</title></head>
          <body>
            <main>
              <h1>Log in to continue</h1>
              <form><input type="email" name="email"><input type="password" name="password"><button type="submit">Log in</button></form>
            </main>
          </body>
        </html>`,
      '/myicor-signup': `
        <html>
          <head><title>Start Free</title></head>
          <body>
            <main>
              <h1>Start Free</h1>
              <p>Create your free account and complete your profile.</p>
              <button>Create profile</button>
            </main>
          </body>
        </html>`,
      '/myicor-mfa': `
        <html>
          <head><title>Verify it is you</title></head>
          <body>
            <main>
              <h1>Verify it is you</h1>
              <p>Check your phone and tap Yes. Number match 82. Passkey or authenticator required.</p>
            </main>
          </body>
        </html>`,
    }
    const body = routes[pathname] || routes['/ready']
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(body)
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  const baseUrl = `http://127.0.0.1:${address.port}`
  try {
    return await callback(baseUrl)
  } finally {
    await new Promise(resolve => server.close(resolve))
  }
}

function outputContainsRawSecret(value = {}) {
  return /password=|raw-secret|access_token=|refresh_token=|api[_-]?key=|"password"\s*:/i.test(JSON.stringify(value))
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    packageJson,
    probeSource,
    runnerSource,
    brokerSource,
    resumeSource,
    localHandsSource,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/source-session-profile-probe.js'),
    readRepoFile('scripts/run-source-session-profile-probe.mjs'),
    readRepoFile('lib/source-session-broker.js'),
    readRepoFile('lib/source-session-auth-resume-packet.js'),
    readRepoFile('lib/local-virtual-browser-hands-runtime.js'),
  ])

  const reports = await withFixtureServer(async baseUrl => {
    const rootDir = path.join(repoRoot, '.openclaw', 'source-session-profile-probe-proof')
    const ready = await runSourceSessionProfileProbe({
      url: `${baseUrl}/ready`,
      sourceFamily: 'skool_free_community',
      source: 'skool',
      account: 'ai@bensoncrew.ca',
      keychainPresent: true,
      loginRecipePresent: true,
      rootDir,
      now: '2026-05-29T03:55:00.000Z',
    })
    const login = await runSourceSessionProfileProbe({
      url: `${baseUrl}/login`,
      sourceFamily: 'skool_free_community',
      source: 'skool',
      account: 'ai@bensoncrew.ca',
      keychainPresent: false,
      loginRecipePresent: true,
      rootDir,
      now: '2026-05-29T03:56:00.000Z',
    })
    const myicorSignup = await runSourceSessionProfileProbe({
      url: `${baseUrl}/myicor-signup`,
      sourceFamily: 'paid_course_training_platforms',
      source: 'myicor',
      account: 'steve.zahnd@bensoncrew.ca',
      keychainPresent: true,
      loginRecipePresent: true,
      rootDir,
      now: '2026-05-29T03:57:00.000Z',
    })
    const myicorMfa = await runSourceSessionProfileProbe({
      url: `${baseUrl}/myicor-mfa`,
      sourceFamily: 'paid_course_training_platforms',
      source: 'myicor',
      account: 'steve.zahnd@bensoncrew.ca',
      keychainPresent: true,
      loginRecipePresent: true,
      rootDir,
      now: '2026-05-29T03:58:00.000Z',
    })
    return { ready, login, myicorSignup, myicorMfa }
  })

  const evaluations = Object.fromEntries(Object.entries(reports).map(([key, report]) => [key, evaluateSourceSessionProfileProbeReport(report)]))

  addCheck(
    checks,
    packageJson.scripts?.['process:source-session-profile-probe-check'] === `node --env-file-if-exists=.env ${SOURCE_SESSION_PROFILE_PROBE_SCRIPT_PATH}`,
    'package exposes focused source-session profile probe proof',
    packageJson.scripts?.['process:source-session-profile-probe-check'] || 'missing',
  )
  addCheck(
    checks,
    packageJson.scripts?.['source:session-probe'] === 'node --env-file-if-exists=.env scripts/run-source-session-profile-probe.mjs' &&
      runnerSource.includes('runSourceSessionProfileProbe'),
    'package exposes source:session-probe CLI',
    packageJson.scripts?.['source:session-probe'] || 'missing',
  )
  addCheck(
    checks,
    probeSource.includes('runLocalVirtualBrowserHandsProbe') &&
      localHandsSource.includes('browserbaseUsed: false') &&
      localHandsSource.includes('modelCalled: false'),
    'profile probe uses local hands runtime instead of Browserbase/model routes',
    'lib/source-session-profile-probe.js',
  )
  addCheck(
    checks,
    reports.ready.status === 'source_session_profile_ready' &&
      reports.ready.brokerDecision?.status === 'session_ready' &&
      reports.ready.authResumePacket?.status === 'resume_not_needed' &&
      evaluations.ready.ok,
    'ready fixture proves existing isolated source session can run without auth escalation',
    JSON.stringify({ status: reports.ready.status, broker: reports.ready.brokerDecision?.status, packet: reports.ready.authResumePacket?.status }),
  )
  addCheck(
    checks,
    reports.login.status === 'source_session_profile_auth_needed' &&
      reports.login.authResumePacket?.status === 'waiting_for_human_auth' &&
      reports.login.authResumePacket?.harlanTelegram?.externalSent === false &&
      evaluations.login.ok,
    'login wall fixture produces auth-needed resume packet without sending Harlan live',
    JSON.stringify({ status: reports.login.status, packet: reports.login.authResumePacket?.status, harlan: reports.login.authResumePacket?.harlanTelegram?.status }),
  )
  addCheck(
    checks,
    reports.myicorSignup.status === 'source_session_profile_blocked_wrong_signup_branch' &&
      reports.myicorSignup.brokerDecision?.reason === 'myicor_wrong_signup_branch_existing_google_sso_required' &&
      evaluations.myicorSignup.ok,
    'myICOR signup/profile branch fails closed instead of creating a new account',
    reports.myicorSignup.brokerDecision?.reason || 'missing',
  )
  addCheck(
    checks,
    reports.myicorSignup.credentialSource === SOURCE_SESSION_BROKER_MYICOR_GOOGLE_SSO_SOURCE &&
      reports.myicorSignup.secretRef?.includes(`/${SOURCE_SESSION_BROKER_MYICOR_GOOGLE_SSO_SOURCE}/`) &&
      reports.myicorSignup.brokerDecision?.secretRef?.includes(`/${SOURCE_SESSION_BROKER_MYICOR_GOOGLE_SSO_SOURCE}/`),
    'myICOR profile probe uses the Google SSO credential source instead of the logical source id',
    JSON.stringify({
      credentialSource: reports.myicorSignup.credentialSource,
      secretRef: reports.myicorSignup.secretRef,
      brokerSecretRef: reports.myicorSignup.brokerDecision?.secretRef,
    }),
  )
  addCheck(
    checks,
    reports.myicorMfa.status === 'source_session_profile_auth_needed' &&
      reports.myicorMfa.brokerDecision?.reason === 'myicor_google_sso_mfa_or_human_verification_required' &&
      reports.myicorMfa.authResumePacket?.requiredAuthMethod === 'google_oauth_sign_in' &&
      evaluations.myicorMfa.ok,
    'myICOR Google SSO MFA produces auth-needed packet with Google OAuth method',
    JSON.stringify({ status: reports.myicorMfa.status, reason: reports.myicorMfa.brokerDecision?.reason, method: reports.myicorMfa.authResumePacket?.requiredAuthMethod }),
  )
  addCheck(
    checks,
    Object.values(reports).every(report =>
      report.sideEffects?.submittedForm === false &&
      report.sideEffects?.loggedIn === false &&
      report.sideEffects?.browserbaseUsed === false &&
      report.sideEffects?.modelCalled === false &&
      report.sideEffects?.normalChromeProfileUsed === false &&
      report.sideEffects?.rawSecretPrinted === false
    ),
    'all probe paths avoid login submit, model calls, Browserbase, normal Chrome, and raw secrets',
    'side-effect flags clean',
  )
  addCheck(
    checks,
    !outputContainsRawSecret(reports) &&
      brokerSource.includes('evaluateSourceSessionBrokerRequest') &&
      resumeSource.includes('buildSourceSessionAuthResumePacket') &&
      probeSource.includes('evaluateMyicorBrowserAuthSurface'),
    'proof output has no raw secret-shaped values and reuses broker/resume/MyICOR guards',
    'secret scan clean',
  )

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'healthy',
    scriptPath: SOURCE_SESSION_PROFILE_PROBE_SCRIPT_PATH,
    reports: {
      ready: { status: reports.ready.status, brokerStatus: reports.ready.brokerDecision?.status, packetStatus: reports.ready.authResumePacket?.status },
      login: { status: reports.login.status, brokerStatus: reports.login.brokerDecision?.status, packetStatus: reports.login.authResumePacket?.status },
      myicorSignup: { status: reports.myicorSignup.status, reason: reports.myicorSignup.brokerDecision?.reason },
      myicorMfa: { status: reports.myicorMfa.status, reason: reports.myicorMfa.brokerDecision?.reason },
    },
    externalNotificationSent: false,
    rawSecretPrinted: false,
    checks,
    failed,
  }
  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Source session profile probe proof: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
  process.exitCode = failed.length ? 1 : 0
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
