#!/usr/bin/env node

import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  CREATOR_NEWSLETTER_LIVE_SIGNUP_REQUIRED_FLAGS,
  CREATOR_NEWSLETTER_CONFIRMATION_READBACK_SOURCE_ID,
  CREATOR_NEWSLETTER_CONFIRMATION_ARTIFACT_TYPE,
  CREATOR_NEWSLETTER_INTAKE_CARD_ID,
  CREATOR_NEWSLETTER_INTAKE_CLI_PATH,
  CREATOR_NEWSLETTER_ISSUE_EXTRACTION_CLI_PATH,
  CREATOR_NEWSLETTER_INTAKE_INBOX_LABEL,
  CREATOR_NEWSLETTER_INTAKE_SCRIPT_PATH,
  buildCreatorNewsletterConfirmationReadback,
  buildCreatorNewsletterIssueExtraction,
  evaluateCreatorNewsletterIntakeReport,
  evaluateCreatorNewsletterConfirmationReadback,
  evaluateCreatorNewsletterIssueExtraction,
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
  const [packageJson, runnerSource, cliSource, confirmationCliSource, issueCliSource, handoffSource] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/creator-newsletter-intake-runner.js'),
    readRepoFile(CREATOR_NEWSLETTER_INTAKE_CLI_PATH),
    readRepoFile('scripts/run-creator-newsletter-confirmation-readback.mjs'),
    readRepoFile(CREATOR_NEWSLETTER_ISSUE_EXTRACTION_CLI_PATH),
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
  const externalPolicyCalls = []
  const externalPolicyBlocked = await runCreatorNewsletterIntake({
    url: 'https://example.com/newsletter',
    apply: true,
    allowExternalSignup: true,
    fetchImpl: async (url, options = {}) => {
      externalPolicyCalls.push({ url: String(url), method: options.method || 'GET' })
      return new Response(page('External Newsletter', `
        <h1>External Newsletter</h1>
        <form action="https://example.com/newsletter/subscribe" method="post">
          <input type="email" name="email">
          <button type="submit">Subscribe</button>
        </form>
      `), { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } })
    },
    now: '2026-05-28T14:06:00.000Z',
  })
  const externalLiveCalls = []
  const externalLiveSubmitted = await runCreatorNewsletterIntake({
    url: 'https://example.com/newsletter',
    apply: true,
    allowExternalSignup: true,
    standingPolicyApproved: true,
    confirmationReadbackRequired: true,
    fetchImpl: async (url, options = {}) => {
      const method = options.method || 'GET'
      externalLiveCalls.push({
        url: String(url),
        method,
        body: String(options.body || ''),
      })
      if (method === 'POST') {
        return new Response(page('Check Your Inbox', '<h1>Confirm your email</h1>'), { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } })
      }
      return new Response(page('External Newsletter', `
        <h1>External Newsletter</h1>
        <form action="https://example.com/newsletter/subscribe" method="post">
          <input type="email" name="email">
          <button type="submit">Subscribe</button>
        </form>
      `), { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } })
    },
    now: '2026-05-28T14:07:00.000Z',
  })
  const confirmationActionRequired = buildCreatorNewsletterConfirmationReadback({
    url: 'https://example.com/newsletter',
    account: SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
    submittedAt: '2026-05-28T14:07:00.000Z',
    now: '2026-05-28T14:09:00.000Z',
    searchResults: [
      {
        artifactId: 'gmail:example-confirm-action',
        sourceId: CREATOR_NEWSLETTER_CONFIRMATION_READBACK_SOURCE_ID,
        artifactType: CREATOR_NEWSLETTER_CONFIRMATION_ARTIFACT_TYPE,
        title: 'Confirm your subscription to Example Newsletter',
        sourceAccount: SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
        sourceContainer: `Gmail / ${CREATOR_NEWSLETTER_INTAKE_INBOX_LABEL}`,
        excerpt: 'Please confirm your email for the example.com newsletter. Click to confirm your subscription.',
        artifactUpdatedAt: '2026-05-28T14:08:00.000Z',
        ingestedAt: '2026-05-28T14:08:30.000Z',
      },
    ],
  })
  const confirmationSubscribed = buildCreatorNewsletterConfirmationReadback({
    url: 'https://example.com/newsletter',
    account: SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
    submittedAt: '2026-05-28T14:07:00.000Z',
    now: '2026-05-28T14:10:00.000Z',
    searchResults: [
      {
        artifactId: 'gmail:example-welcome',
        sourceId: CREATOR_NEWSLETTER_CONFIRMATION_READBACK_SOURCE_ID,
        artifactType: CREATOR_NEWSLETTER_CONFIRMATION_ARTIFACT_TYPE,
        title: 'Welcome to Example Newsletter',
        sourceAccount: SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
        sourceContainer: `Gmail / ${CREATOR_NEWSLETTER_INTAKE_INBOX_LABEL}`,
        excerpt: "You're subscribed to the example.com newsletter. Welcome to the weekly implementation notes.",
        artifactUpdatedAt: '2026-05-28T14:09:00.000Z',
        ingestedAt: '2026-05-28T14:09:30.000Z',
      },
    ],
  })
  const confirmationNotFound = buildCreatorNewsletterConfirmationReadback({
    url: 'https://example.com/newsletter',
    account: SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
    submittedAt: '2026-05-28T14:07:00.000Z',
    now: '2026-05-28T14:11:00.000Z',
    searchResults: [
      {
        artifactId: 'gmail:wrong-account',
        sourceId: CREATOR_NEWSLETTER_CONFIRMATION_READBACK_SOURCE_ID,
        artifactType: CREATOR_NEWSLETTER_CONFIRMATION_ARTIFACT_TYPE,
        title: 'Random vendor digest',
        sourceAccount: 'someone@bensoncrew.ca',
        sourceContainer: 'Gmail / newer_than:2d',
        excerpt: 'This unrelated thread does not confirm a newsletter subscription.',
        artifactUpdatedAt: '2026-05-28T14:09:00.000Z',
        ingestedAt: '2026-05-28T14:09:30.000Z',
      },
    ],
  })
  const issueWaitingForConfirmation = buildCreatorNewsletterIssueExtraction({
    url: 'https://example.com/newsletter',
    account: SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
    now: '2026-05-28T14:12:00.000Z',
    searchResults: [
      {
        artifactId: 'gmail:example-issue',
        sourceId: CREATOR_NEWSLETTER_CONFIRMATION_READBACK_SOURCE_ID,
        artifactType: CREATOR_NEWSLETTER_CONFIRMATION_ARTIFACT_TYPE,
        title: 'Example weekly implementation notes',
        sourceAccount: SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
        sourceContainer: `Gmail / ${CREATOR_NEWSLETTER_INTAKE_INBOX_LABEL}`,
        excerpt: 'This newsletter issue explains how to build a browser agent workflow and links to https://github.com/browserbase/stagehand for implementation patterns.',
        contentText: 'This newsletter issue explains how to build a browser agent workflow and links to https://github.com/browserbase/stagehand for implementation patterns.',
        artifactUpdatedAt: '2026-05-28T14:12:00.000Z',
      },
    ],
  })
  const issueExtraction = buildCreatorNewsletterIssueExtraction({
    url: 'https://example.com/newsletter',
    account: SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
    confirmationReadback: confirmationSubscribed,
    now: '2026-05-28T14:13:00.000Z',
    searchResults: [
      {
        artifactId: 'gmail:example-issue',
        externalId: 'thread-example-issue',
        sourceId: CREATOR_NEWSLETTER_CONFIRMATION_READBACK_SOURCE_ID,
        artifactType: CREATOR_NEWSLETTER_CONFIRMATION_ARTIFACT_TYPE,
        title: 'Example weekly implementation notes',
        sourceAccount: SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
        sourceContainer: `Gmail / ${CREATOR_NEWSLETTER_INTAKE_INBOX_LABEL}`,
        excerpt: 'This newsletter issue explains how to build a browser agent workflow and links to https://github.com/browserbase/stagehand for implementation patterns.',
        contentText: [
          'This newsletter issue explains how to build a browser agent workflow that can observe a page, decide the safe next action, click only allowed controls, and record evidence.',
          'Use the repo at https://github.com/browserbase/stagehand as an implementation pattern for resilient browser actions.',
          'If a page asks for pricing or a paid course, route the link to approval instead of buying anything.',
          'Unsubscribe or manage preferences if the issue becomes sponsor-only noise.',
        ].join(' '),
        artifactUpdatedAt: '2026-05-28T14:12:00.000Z',
        ingestedAt: '2026-05-28T14:12:30.000Z',
      },
      {
        artifactId: 'gmail:example-confirm-action',
        sourceId: CREATOR_NEWSLETTER_CONFIRMATION_READBACK_SOURCE_ID,
        artifactType: CREATOR_NEWSLETTER_CONFIRMATION_ARTIFACT_TYPE,
        title: 'Confirm your subscription to Example Newsletter',
        sourceAccount: SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
        sourceContainer: `Gmail / ${CREATOR_NEWSLETTER_INTAKE_INBOX_LABEL}`,
        excerpt: 'Please confirm your email for the example.com newsletter. Click to confirm your subscription.',
        contentText: 'Please confirm your email for the example.com newsletter. Click to confirm your subscription.',
        artifactUpdatedAt: '2026-05-28T14:08:00.000Z',
      },
    ],
  })
  const issueWaitingEvaluation = evaluateCreatorNewsletterIssueExtraction(issueWaitingForConfirmation)
  const issueEvaluation = evaluateCreatorNewsletterIssueExtraction(issueExtraction)

  const evaluation = evaluateCreatorNewsletterIntakeReport(dryRun)
  const confirmationEvaluation = evaluateCreatorNewsletterConfirmationReadback(confirmationActionRequired)
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
      /runCreatorNewsletterIntake/.test(cliSource) &&
      cliSource.includes('--standing-policy-approved') &&
      cliSource.includes('--confirmation-readback-required'),
    'package exposes operator newsletter intake runner',
    packageJson.scripts?.['newsletter:intake'] || 'missing',
  )
  addCheck(
    checks,
    packageJson.scripts?.['newsletter:confirmation-readback'] === 'node --env-file-if-exists=.env scripts/run-creator-newsletter-confirmation-readback.mjs' &&
      confirmationCliSource.includes('searchSharedCommunicationArtifactsForContext') &&
      confirmationCliSource.includes('buildCreatorNewsletterConfirmationReadback'),
    'package exposes read-only newsletter confirmation readback runner',
    packageJson.scripts?.['newsletter:confirmation-readback'] || 'missing',
  )
  addCheck(
    checks,
    packageJson.scripts?.['newsletter:issue-extraction'] === `node --env-file-if-exists=.env ${CREATOR_NEWSLETTER_ISSUE_EXTRACTION_CLI_PATH}` &&
      issueCliSource.includes('searchSharedCommunicationArtifactsForContext') &&
      issueCliSource.includes('buildCreatorNewsletterIssueExtraction') &&
      issueCliSource.includes('--confirmed'),
    'package exposes read-only newsletter issue extraction runner',
    packageJson.scripts?.['newsletter:issue-extraction'] || 'missing',
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
    externalPolicyBlocked.status === 'blocked' &&
      externalPolicyBlocked.reason === 'standing_newsletter_policy_not_approved_for_run' &&
      externalPolicyBlocked.sideEffects?.externalSignupSubmitted === false &&
      externalPolicyCalls.length === 1 &&
      externalPolicyCalls.every(call => call.method === 'GET') &&
      externalPolicyBlocked.plainEnglish.includes(CREATOR_NEWSLETTER_LIVE_SIGNUP_REQUIRED_FLAGS.join(' ')),
    'external signup requires explicit policy and confirmation flags before submit',
    JSON.stringify({ status: externalPolicyBlocked.status, reason: externalPolicyBlocked.reason, calls: externalPolicyCalls, flags: CREATOR_NEWSLETTER_LIVE_SIGNUP_REQUIRED_FLAGS }),
  )
  addCheck(
    checks,
    externalLiveSubmitted.status === 'external_newsletter_signup_submitted_waiting_confirmation' &&
      externalLiveSubmitted.ok === true &&
      externalLiveSubmitted.submitAllowedNow === true &&
      externalLiveSubmitted.sideEffects?.externalSignupSubmitted === true &&
      externalLiveSubmitted.sideEffects?.submittedForm === true &&
      externalLiveSubmitted.sideEffects?.confirmationEmailRead === false &&
      externalLiveSubmitted.signupPacket?.subscribedStatus === 'pending_confirmation' &&
      externalLiveSubmitted.signupPacket?.confirmationReadback?.status === 'pending_confirmation_email' &&
      externalLiveCalls.length === 2 &&
      externalLiveCalls.some(call => call.method === 'POST' && /email=ai%40bensoncrew\.ca/.test(call.body)),
    'approved external signup path submits only in fixture fetch and stays pending confirmation readback',
    JSON.stringify({ status: externalLiveSubmitted.status, sideEffects: externalLiveSubmitted.sideEffects, calls: externalLiveCalls, confirmation: externalLiveSubmitted.signupPacket?.confirmationReadback }),
  )
  addCheck(
    checks,
    confirmationEvaluation.ok &&
      confirmationActionRequired.status === 'confirmation_email_found_action_may_be_required' &&
      confirmationActionRequired.confirmationEmailRead === true &&
      confirmationActionRequired.bestMatch?.actionRequired === true &&
      confirmationActionRequired.sideEffects?.submittedForm === false &&
      confirmationActionRequired.sideEffects?.externalSignupSubmitted === false &&
      confirmationActionRequired.sideEffects?.mailboxLabelMutated === false,
    'confirmation readback finds archived confirmation email without clicking or mutating mailbox',
    JSON.stringify({ status: confirmationActionRequired.status, best: confirmationActionRequired.bestMatch, failed: confirmationEvaluation.failed }),
  )
  addCheck(
    checks,
    confirmationSubscribed.status === 'subscribed_confirmation_read_back' &&
      confirmationSubscribed.subscribedStatus === 'confirmed' &&
      confirmationSubscribed.bestMatch?.actionRequired === false &&
      confirmationSubscribed.sideEffects?.confirmationEmailRead === true,
    'confirmation readback can distinguish confirmed welcome issue from action-required confirmation',
    JSON.stringify({ status: confirmationSubscribed.status, subscribedStatus: confirmationSubscribed.subscribedStatus, best: confirmationSubscribed.bestMatch }),
  )
  addCheck(
    checks,
    confirmationNotFound.status === 'confirmation_email_not_found_in_candidates' &&
      confirmationNotFound.confirmationEmailRead === false &&
      confirmationNotFound.sideEffects?.confirmationEmailRead === false,
    'confirmation readback keeps pending status when archive candidates do not match source account/source',
    JSON.stringify({ status: confirmationNotFound.status, best: confirmationNotFound.bestMatch }),
  )
  addCheck(
    checks,
    issueWaitingEvaluation.ok &&
      issueWaitingForConfirmation.status === 'waiting_for_confirmation_readback' &&
      issueWaitingForConfirmation.issueCount === 0 &&
      issueWaitingForConfirmation.sideEffects?.issueEmailsRead === false,
    'newsletter issue extraction waits for confirmed subscription evidence',
    JSON.stringify({ status: issueWaitingForConfirmation.status, failed: issueWaitingEvaluation.failed }),
  )
  addCheck(
    checks,
    issueEvaluation.ok &&
      issueExtraction.status === 'newsletter_issues_extracted_from_archive' &&
      issueExtraction.issueCount === 1 &&
      issueExtraction.implementationIdeaCount >= 1 &&
      issueExtraction.resourceLinks.some(link => link.type === 'public_code_repo' && /github\.com\/browserbase\/stagehand/.test(link.url)) &&
      issueExtraction.sideEffects?.issueEmailsRead === true &&
      issueExtraction.sideEffects?.submittedForm === false &&
      issueExtraction.sideEffects?.externalSignupSubmitted === false &&
      issueExtraction.sideEffects?.mailboxLabelMutated === false,
    'confirmed newsletter issue extraction reads ideas and links without clicking or mutating',
    JSON.stringify({
      status: issueExtraction.status,
      issueCount: issueExtraction.issueCount,
      ideas: issueExtraction.implementationIdeaCount,
      links: issueExtraction.resourceLinks,
      failed: issueEvaluation.failed,
    }),
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
      !sourceContainsForbiddenRuntimeAction(cliSource) &&
      !sourceContainsForbiddenRuntimeAction(confirmationCliSource) &&
      !sourceContainsForbiddenRuntimeAction(issueCliSource),
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
      externalPolicy: externalPolicyBlocked.reason,
      externalLive: externalLiveSubmitted.status,
      confirmationActionRequired: confirmationActionRequired.status,
      confirmationSubscribed: confirmationSubscribed.status,
      confirmationNotFound: confirmationNotFound.status,
      issueWaitingForConfirmation: issueWaitingForConfirmation.status,
      issueExtraction: issueExtraction.status,
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
