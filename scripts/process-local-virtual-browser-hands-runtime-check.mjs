#!/usr/bin/env node

import fs from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  LOCAL_VIRTUAL_BROWSER_HANDS_CARD_ID,
  evaluateLocalVirtualBrowserHandsReport,
  runLocalVirtualBrowserHandsProbe,
} from '../lib/local-virtual-browser-hands-runtime.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: detail || '' })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function sourceContainsRawSecretLeak(source = '') {
  return [
    /console\.log\s*\([^)]*(password|secret|token|api[_-]?key)/i,
    /writeFile\s*\([^)]*(password|secret|token|api[_-]?key)/i,
  ].some(pattern => pattern.test(source))
}

async function withFixtureServer(callback) {
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url || '/', 'http://127.0.0.1').pathname
    const routes = {
      '/public': `
        <html>
          <head><title>Agent Source Fixture</title></head>
          <body>
            <main>
              <h1>Agent source workflow</h1>
              <p>Public/free source page with agent browser, source packets, repo, memory, and extraction workflow evidence.</p>
              <a href="/resource">Free resource guide</a>
              <a href="/login">Sign in to account</a>
              <a href="/download.zip">Download ZIP</a>
              <a href="/checkout">Buy training</a>
              <button type="submit">Submit form</button>
            </main>
          </body>
        </html>`,
      '/resource': `
        <html>
          <head><title>Free Resource Guide</title></head>
          <body>
            <main>
              <h1>Free agent templates</h1>
              <p>Templates for browser-agent queues, source evidence, and fail-closed recovery.</p>
            </main>
          </body>
        </html>`,
      '/login': `
        <html>
          <head><title>Sign in</title></head>
          <body>
            <main>
              <h1>Log in to continue</h1>
              <form><input type="email" name="email"><input type="password" name="password"><button type="submit">Sign in</button></form>
            </main>
          </body>
        </html>`,
      '/restore': `
        <html>
          <head><title>Restore pages</title></head>
          <body>
            <main>Chrome didn't shut down correctly. Restore previous session?</main>
          </body>
        </html>`,
    }
    const body = routes[pathname] || routes['/public']
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

async function main() {
  const args = parseArgs()
  const checks = []
  const [packageJson, runtimeSource, runnerSource] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/local-virtual-browser-hands-runtime.js'),
    readRepoFile('scripts/run-local-virtual-browser-hands.mjs'),
  ])

  const reports = await withFixtureServer(async baseUrl => {
    const rootDir = path.join(repoRoot, '.openclaw', 'local-virtual-browser-hands-proof')
    const publicRun = await runLocalVirtualBrowserHandsProbe({
      url: `${baseUrl}/public`,
      profileMode: 'persistent_isolated',
      clickFirstSafeAction: true,
      maxActions: 1,
      rootDir,
      now: '2026-05-28T23:20:00.000Z',
    })
    const loginRun = await runLocalVirtualBrowserHandsProbe({
      url: `${baseUrl}/login`,
      profileMode: 'ephemeral_isolated',
      rootDir,
      now: '2026-05-28T23:21:00.000Z',
    })
    const restoreRun = await runLocalVirtualBrowserHandsProbe({
      url: `${baseUrl}/restore`,
      profileMode: 'ephemeral_isolated',
      rootDir,
      now: '2026-05-28T23:22:00.000Z',
    })
    return { publicRun, loginRun, restoreRun }
  })
  const publicEvaluation = evaluateLocalVirtualBrowserHandsReport(reports.publicRun)

  addCheck(
    checks,
    packageJson.scripts?.['process:local-virtual-browser-hands-runtime-check'] === 'node --env-file-if-exists=.env scripts/process-local-virtual-browser-hands-runtime-check.mjs',
    'package exposes focused local virtual browser hands runtime proof',
    packageJson.scripts?.['process:local-virtual-browser-hands-runtime-check'] || 'missing',
  )
  addCheck(
    checks,
    packageJson.scripts?.['source:local-browser-hands'] === 'node --env-file-if-exists=.env scripts/run-local-virtual-browser-hands.mjs' &&
      runnerSource.includes('--clickFirstSafeAction') &&
      runnerSource.includes('runLocalVirtualBrowserHandsProbe'),
    'source:local-browser-hands CLI runs the local hands runtime',
    packageJson.scripts?.['source:local-browser-hands'] || 'missing',
  )
  addCheck(
    checks,
    runtimeSource.includes('launchPersistentContext') &&
      runtimeSource.includes('normalChromeProfileUsed: false') &&
      runtimeSource.includes('browserbaseUsed: false') &&
      runtimeSource.includes('modelCalled: false'),
    'runtime uses isolated Playwright profiles and does not use Browserbase/model calls/normal Chrome',
    'lib/local-virtual-browser-hands-runtime.js',
  )
  addCheck(
    checks,
    reports.publicRun.status === 'local_virtual_browser_hands_completed' &&
      reports.publicRun.sideEffects.clicked === true &&
      /\/resource$/i.test(new URL(reports.publicRun.finalUrl).pathname) &&
      reports.publicRun.runtime?.browserbaseUsed === false &&
      reports.publicRun.runtime?.modelCalled === false &&
      reports.publicRun.runtime?.normalChromeProfileUsed === false &&
      reports.publicRun.runtime?.sourceBrowserSession?.profileMode === 'persistent_isolated' &&
      reports.publicRun.runtime?.sourceBrowserSession?.defaultChromeProfileForbidden === true &&
      list(reports.publicRun.snapshots).length === 2,
    'public/free fixture can read and make one bounded safe navigation click from an isolated profile',
    JSON.stringify({
      status: reports.publicRun.status,
      finalUrl: reports.publicRun.finalUrl,
      snapshots: reports.publicRun.snapshots?.length,
      clicked: reports.publicRun.sideEffects?.clicked,
    }),
  )
  addCheck(
    checks,
    reports.publicRun.blockedActions?.some(action => action.safety?.reason === 'download_or_file_open_blocked') &&
      reports.publicRun.blockedActions?.some(action => action.safety?.reason === 'risky_auth_write_purchase_download_or_mutation_action') &&
      reports.publicRun.blockedActions?.some(action => action.safety?.reason === 'non_anchor_action_blocked_v1'),
    'download/auth/purchase/form style actions are blocked before click',
    reports.publicRun.blockedActions?.map(action => `${action.text || action.href}:${action.safety?.reason}`).join(' | ') || 'missing blocked actions',
  )
  addCheck(
    checks,
    reports.loginRun.status === 'local_virtual_browser_hands_completed_with_blocker' &&
      reports.loginRun.snapshots?.[0]?.credentialInputVisible === true &&
      reports.loginRun.sideEffects?.submittedForm === false &&
      reports.loginRun.sideEffects?.loggedIn === false,
    'login/password pages are observed as blockers without submitting or logging in',
    JSON.stringify({
      status: reports.loginRun.status,
      credentialInputVisible: reports.loginRun.snapshots?.[0]?.credentialInputVisible,
      submittedForm: reports.loginRun.sideEffects?.submittedForm,
    }),
  )
  addCheck(
    checks,
    reports.restoreRun.status === 'local_virtual_browser_hands_blocked_browser_state' &&
      reports.restoreRun.ok === false &&
      reports.restoreRun.snapshots?.[0]?.browserHealth?.ok === false,
    'restore/blank browser-control state fails closed instead of pretending source extraction worked',
    JSON.stringify({
      status: reports.restoreRun.status,
      browserHealth: reports.restoreRun.snapshots?.[0]?.browserHealth?.status,
    }),
  )
  addCheck(
    checks,
    publicEvaluation.ok === true,
    'report evaluator confirms no unsafe local hands side effects',
    publicEvaluation.findings.map(finding => `${finding.check}:${finding.detail}`).join(', ') || 'ok',
  )
  addCheck(
    checks,
    sourceContainsRawSecretLeak(runtimeSource) === false &&
      sourceContainsRawSecretLeak(runnerSource) === false,
    'local browser hands runtime and CLI do not print raw secrets',
    'metadata-only proof',
  )

  const failed = checks.filter(check => !check.ok)
  const report = {
    ok: failed.length === 0,
    cardId: LOCAL_VIRTUAL_BROWSER_HANDS_CARD_ID,
    status: failed.length ? 'blocked' : 'healthy',
    checks,
    failedChecks: failed,
    proofReadback: {
      publicRun: {
        status: reports.publicRun.status,
        finalUrl: reports.publicRun.finalUrl,
        safeActions: reports.publicRun.safeActions?.length || 0,
        blockedActions: reports.publicRun.blockedActions?.length || 0,
      },
      loginRun: {
        status: reports.loginRun.status,
        credentialInputVisible: reports.loginRun.snapshots?.[0]?.credentialInputVisible === true,
      },
      restoreRun: {
        status: reports.restoreRun.status,
        browserHealth: text(reports.restoreRun.snapshots?.[0]?.browserHealth?.status),
      },
    },
  }
  if (args.json) {
    console.log(JSON.stringify(report, null, 2))
    process.exitCode = report.ok ? 0 : 1
    return
  }
  if (!report.ok) {
    console.error(`Local virtual browser hands runtime check failed: ${failed.length}`)
    for (const check of failed) console.error(`- ${check.check}: ${check.detail}`)
    process.exitCode = 1
    return
  }
  console.log('Local virtual browser hands runtime check passed.')
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
