#!/usr/bin/env node

import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  CREATOR_NEWSLETTER_INTAKE_CARD_ID,
  CREATOR_NEWSLETTER_INTAKE_CLI_PATH,
  CREATOR_NEWSLETTER_INTAKE_INBOX_LABEL,
  CREATOR_NEWSLETTER_INTAKE_SCRIPT_PATH,
  evaluateCreatorNewsletterIntakeReport,
  runCreatorNewsletterIntake,
} from '../lib/creator-newsletter-intake-runner.js'
import {
  SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
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

function list(value) {
  return Array.isArray(value) ? value : []
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

function page(title = '', body = '') {
  return `<!doctype html>
    <html>
      <head>
        <title>${title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body>${body}</body>
    </html>`
}

async function collectRequestBody(request) {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

async function startFixtureServer() {
  const hits = new Map()
  const submissions = []
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1')
    hits.set(`${request.method || 'GET'} ${url.pathname}`, (hits.get(`${request.method || 'GET'} ${url.pathname}`) || 0) + 1)

    if (request.method === 'POST' && url.pathname === '/newsletter/subscribe') {
      const body = await collectRequestBody(request)
      submissions.push({ path: url.pathname, body })
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      response.end(page('Subscribed', '<h1>Check your inbox</h1><p>Confirmation required.</p>'))
      return
    }

    let body = ''
    if (url.pathname === '/newsletter') {
      body = page('AI Hero Newsletter', `
        <h1>AI Hero Newsletter</h1>
        <p>Free weekly creator newsletter with agent workflows, public code resources, and implementation notes.</p>
        <form action="/newsletter/subscribe" method="post">
          <input type="email" name="email" placeholder="Email address" required>
          <input type="hidden" name="source" value="fixture">
          <button type="submit">Subscribe</button>
        </form>
      `)
    } else if (url.pathname === '/newsletter-no-form') {
      body = page('Creator Newsletter Archive', `
        <h1>Creator Newsletter Archive</h1>
        <p>Free newsletter issue archive with agent ideas but no signup form on this page.</p>
      `)
    } else if (url.pathname === '/paid-newsletter') {
      body = page('Paid Newsletter', `
        <h1>Paid Newsletter</h1>
        <p>Subscribe to the premium upgrade. Price and billing details required.</p>
        <form action="/checkout" method="post">
          <input type="email" name="email">
          <input type="tel" name="phone">
          <input type="text" name="credit_card">
          <button type="submit">Pay and subscribe</button>
        </form>
      `)
    } else if (url.pathname === '/profile-newsletter') {
      body = page('Profile Newsletter', `
        <h1>Profile Newsletter</h1>
        <p>Account profile signup.</p>
        <form action="/profile" method="post">
          <input type="email" name="email">
          <input type="password" name="password">
          <input type="text" name="linkedin_profile">
          <button type="submit">Create profile</button>
        </form>
      `)
    } else if (url.pathname === '/checkout' || url.pathname === '/profile') {
      body = page('Blocked', '<h1>Blocked path should not receive a newsletter intake submit.</h1>')
    } else {
      body = page('Not Found', '<h1>Not found</h1>')
    }

    response.writeHead(body.includes('Not Found') ? 404 : 200, { 'content-type': 'text/html; charset=utf-8' })
    response.end(body)
  })

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    hits,
    submissions,
    close: () => new Promise(resolve => server.close(resolve)),
  }
}

function unsafeSideEffectViolations(sideEffects = {}, { allowLocalFixtureSubmit = false } = {}) {
  return Object.entries(sideEffects || {})
    .filter(([key, value]) => {
      if (allowLocalFixtureSubmit && ['submittedForm', 'localFixtureFormSubmitted'].includes(key)) return false
      return value === true || (typeof value === 'number' && value > 0)
    })
    .map(([key, value]) => `${key}=${value}`)
}

function sourceContainsForbiddenRuntimeAction(source = '') {
  return /child_process|execFile|spawn\(|createBacklogItem|updateBacklogItem|upsertFoundationCurrentSprintOverlay|INSERT\s+INTO|UPDATE\s+backlog_items|writeFile\s*\(/i.test(String(source || ''))
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [packageJson, runnerSource, cliSource, handoffSource] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/creator-newsletter-intake-runner.js'),
    readRepoFile(CREATOR_NEWSLETTER_INTAKE_CLI_PATH),
    readRepoFile('lib/source-god-mode-youtube-handoff.js'),
  ])

  const fixture = await startFixtureServer()
  let dryRun = null
  let localApply = null
  let noForm = null
  let paidBlocked = null
  let profileBlocked = null
  try {
    dryRun = await runCreatorNewsletterIntake({
      url: `${fixture.baseUrl}/newsletter`,
      allowLocalFixture: true,
      now: '2026-05-28T14:00:00.000Z',
    })
    localApply = await runCreatorNewsletterIntake({
      url: `${fixture.baseUrl}/newsletter`,
      apply: true,
      allowLocalFixture: true,
      now: '2026-05-28T14:01:00.000Z',
    })
    noForm = await runCreatorNewsletterIntake({
      url: `${fixture.baseUrl}/newsletter-no-form`,
      allowLocalFixture: true,
      now: '2026-05-28T14:02:00.000Z',
    })
    paidBlocked = await runCreatorNewsletterIntake({
      url: `${fixture.baseUrl}/paid-newsletter`,
      apply: true,
      allowLocalFixture: true,
      now: '2026-05-28T14:03:00.000Z',
    })
    profileBlocked = await runCreatorNewsletterIntake({
      url: `${fixture.baseUrl}/profile-newsletter`,
      apply: true,
      allowLocalFixture: true,
      now: '2026-05-28T14:04:00.000Z',
    })
  } finally {
    await fixture.close()
  }

  const externalFetchCalls = []
  const externalApplyBlocked = await runCreatorNewsletterIntake({
    url: 'https://example.com/newsletter',
    apply: true,
    fetchImpl: async (url, options = {}) => {
      externalFetchCalls.push({ url: String(url), method: options.method || 'GET' })
      return new Response(page('External Newsletter', `
        <h1>External Newsletter</h1>
        <form action="https://example.com/subscribe" method="post">
          <input type="email" name="email">
          <button type="submit">Subscribe</button>
        </form>
      `), { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } })
    },
    now: '2026-05-28T14:05:00.000Z',
  })

  const evaluation = evaluateCreatorNewsletterIntakeReport(dryRun)
  const fixtureHits = Object.fromEntries(fixture.hits.entries())

  addCheck(
    checks,
    packageJson.scripts?.['process:creator-newsletter-intake-runner-check'] === `node --env-file-if-exists=.env ${CREATOR_NEWSLETTER_INTAKE_SCRIPT_PATH}`,
    'package exposes focused creator newsletter intake proof',
    packageJson.scripts?.['process:creator-newsletter-intake-runner-check'] || 'missing',
  )
  addCheck(
    checks,
    packageJson.scripts?.['newsletter:intake'] === `node --env-file-if-exists=.env ${CREATOR_NEWSLETTER_INTAKE_CLI_PATH}` &&
      /runCreatorNewsletterIntake/.test(cliSource),
    'package exposes operator newsletter intake runner',
    packageJson.scripts?.['newsletter:intake'] || 'missing',
  )
  addCheck(
    checks,
    evaluation.ok,
    'dry-run newsletter intake report satisfies evaluator',
    evaluation.failed.map(item => item.check).join(', ') || 'ok',
  )
  addCheck(
    checks,
    dryRun.status === 'newsletter_intake_ready_dry_run' &&
      dryRun.submitAllowedNow === false &&
      dryRun.sideEffects?.submittedForm === false &&
      dryRun.sourceIdentity?.account === SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT &&
      dryRun.sourceIdentity?.inboxLabel === CREATOR_NEWSLETTER_INTAKE_INBOX_LABEL,
    'safe newsletter page is detected without submitting',
    JSON.stringify({ status: dryRun.status, submitAllowedNow: dryRun.submitAllowedNow, sourceIdentity: dryRun.sourceIdentity }),
  )
  addCheck(
    checks,
    localApply.status === 'local_fixture_newsletter_signup_submitted' &&
      localApply.sideEffects?.localFixtureFormSubmitted === true &&
      localApply.sideEffects?.externalSignupSubmitted === false &&
      fixture.submissions.length === 1 &&
      /email=ai%40bensoncrew\.ca/.test(fixture.submissions[0]?.body || ''),
    'local fixture apply proves form mechanics without external signup',
    JSON.stringify({ status: localApply.status, sideEffects: localApply.sideEffects, submissions: fixture.submissions }),
  )
  addCheck(
    checks,
    noForm.status === 'newsletter_page_read_no_signup_form' &&
      noForm.sideEffects?.submittedForm === false,
    'newsletter-like public page without form is read but not claimed subscribed',
    JSON.stringify({ status: noForm.status, reason: noForm.reason }),
  )
  addCheck(
    checks,
    paidBlocked.status === 'blocked' &&
      /payment|phone/i.test(`${paidBlocked.reason} ${paidBlocked.blockers?.map(blocker => blocker.type).join(' ')}`) &&
      unsafeSideEffectViolations(paidBlocked.sideEffects).length === 0 &&
      !fixtureHits['POST /checkout'],
    'paid or phone-required newsletter forms fail closed before submit',
    JSON.stringify({ status: paidBlocked.status, reason: paidBlocked.reason, blockers: paidBlocked.blockers, hits: fixtureHits }),
  )
  addCheck(
    checks,
    profileBlocked.status === 'blocked' &&
      /credential|profile/i.test(`${profileBlocked.reason} ${profileBlocked.blockers?.map(blocker => blocker.type).join(' ')}`) &&
      unsafeSideEffectViolations(profileBlocked.sideEffects).length === 0 &&
      !fixtureHits['POST /profile'],
    'profile/password newsletter forms fail closed before submit',
    JSON.stringify({ status: profileBlocked.status, reason: profileBlocked.reason, blockers: profileBlocked.blockers, hits: fixtureHits }),
  )
  addCheck(
    checks,
    externalApplyBlocked.status === 'blocked' &&
      externalApplyBlocked.reason === 'external_newsletter_signup_disabled' &&
      externalApplyBlocked.sideEffects?.externalSignupSubmitted === false &&
      externalFetchCalls.length === 1 &&
      externalFetchCalls.every(call => call.method === 'GET'),
    'external apply stays disabled and does not submit without live signup lane',
    JSON.stringify({ status: externalApplyBlocked.status, reason: externalApplyBlocked.reason, calls: externalFetchCalls, sideEffects: externalApplyBlocked.sideEffects }),
  )
  addCheck(
    checks,
    handoffSource.includes("runner: 'newsletter:intake'") &&
      handoffSource.includes('npm run newsletter:intake'),
    'YouTube handoff prep points newsletter rows at the dry-run intake command',
    'sourceSessionPrepPhase newsletter command',
  )
  addCheck(
    checks,
    !sourceContainsForbiddenRuntimeAction(runnerSource) &&
      !sourceContainsForbiddenRuntimeAction(cliSource),
    'runner and CLI do not spawn commands, write backlog, write files, or touch DB',
    'static source scan',
  )

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    status: failures.length ? 'unhealthy' : 'healthy',
    cardId: CREATOR_NEWSLETTER_INTAKE_CARD_ID,
    reportOnly: true,
    dryRun: {
      status: dryRun.status,
      formCount: dryRun.formCount,
      sourceIdentity: dryRun.sourceIdentity,
      submitAllowedNow: dryRun.submitAllowedNow,
    },
    localFixtureApply: {
      status: localApply.status,
      sideEffects: localApply.sideEffects,
      submissionCount: fixture.submissions.length,
    },
    blockedProofs: {
      noForm: noForm.status,
      paid: paidBlocked.reason,
      profile: profileBlocked.reason,
      externalApply: externalApplyBlocked.reason,
    },
    checks,
    failures,
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else if (failures.length) {
    console.error(`Creator newsletter intake runner check failed (${failures.length})`)
    for (const failure of failures) console.error(`- ${failure.check}: ${failure.detail}`)
  } else {
    console.log('Creator newsletter intake runner check passed')
  }

  if (failures.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
