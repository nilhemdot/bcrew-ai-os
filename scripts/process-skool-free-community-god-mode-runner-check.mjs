#!/usr/bin/env node

import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  SKOOL_FREE_COMMUNITY_GOD_MODE_CARD_ID,
  SKOOL_FREE_COMMUNITY_GOD_MODE_SCRIPT_PATH,
  SKOOL_FREE_COMMUNITY_LOOKBACK_DAYS,
  evaluateSkoolFreeCommunityGodModeReport,
  runSkoolFreeCommunityGodMode,
} from '../lib/skool-free-community-god-mode-runner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    headed: argv.includes('--headed') || argv.includes('--headed=true'),
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

async function startFixtureServer() {
  const hits = new Map()
  const server = http.createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1')
    hits.set(url.pathname, (hits.get(url.pathname) || 0) + 1)
    let body = ''
    if (url.pathname === '/chase-ai-community/about') {
      const session = url.searchParams.get('session') === '1'
      body = page('Chase AI Community', `
        <h1>Chase AI Community</h1>
        <p>Free Skool community about Claude Code, n8n AI agent templates, and practical AI systems.</p>
        ${session
          ? '<a href="/chase-ai-community/community?joined=1">JOIN GROUP</a>'
          : '<a href="/login">JOIN GROUP</a>'}
      `)
    } else if (url.pathname === '/login') {
      body = page('Log In', `
        <h1>Log In</h1>
        <p>Continue with Google to join this Skool community.</p>
        <input type="email" autocomplete="username">
        <input type="password" autocomplete="current-password">
      `)
    } else if (url.pathname === '/chase-ai-community/community') {
      body = page('Chase AI Community - Community', `
        <h1>Community</h1>
        <nav>
          <a href="/chase-ai-community/classroom">Classroom</a>
          <a href="/chase-ai-community/resources">Resources</a>
          <a href="/chase-ai-community/about">About</a>
        </nav>
        <article data-kind="post" data-post-date="2026-05-24">
          <h2>Claude Code browser agent workflow</h2>
          <p>Post: use persistent source sessions, Stagehand/Browse-style skills, and auth-needed escalation.</p>
          <div data-kind="comment" data-comment-date="2026-05-25">Comment: save selectors and rerun daily for source updates.</div>
        </article>
        <article data-kind="post" data-post-date="2026-05-10">
          <h2>n8n AI agent template pack</h2>
          <p>Post: free workflow template links and resource notes.</p>
        </article>
        <article data-kind="post" data-post-date="2026-04-20">
          <h2>Older idea outside the 20-day window</h2>
          <p>Should be captured as old context but not counted as last-20-days proof.</p>
        </article>
        <a href="https://github.com/example/free-agent-template">Free GitHub template</a>
        <a href="/chase-ai-community/new-post">Create post</a>
        <a href="/checkout">Upgrade to paid</a>
      `)
    } else if (url.pathname === '/chase-ai-community/classroom') {
      body = page('Chase AI Community - Classroom', `
        <h1>Classroom</h1>
        <section>
          <h2>Free course: browser agent basics</h2>
          <p>Lesson resources for Playwright, Stagehand, source session broker, and evidence capture.</p>
          <a href="/chase-ai-community/resources">Resources</a>
        </section>
      `)
    } else if (url.pathname === '/chase-ai-community/resources') {
      body = page('Chase AI Community - Resources', `
        <h1>Resources</h1>
        <p>Pinned resources: free Claude Code SOP, browser skill checklist, and source-stack template.</p>
        <a href="https://docs.browserbase.com/integrations/skills/introduction">Browserbase skills docs</a>
        <a href="/chase-ai-community/settings">Settings</a>
        <a href="/chase-ai-community/template.zip">Download zip</a>
      `)
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
    close: () => new Promise(resolve => server.close(resolve)),
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [packageJson, runnerSource, cliSource, runtimeSource, seedSource] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/skool-free-community-god-mode-runner.js'),
    readRepoFile('scripts/run-skool-free-community-god-mode.mjs'),
    readRepoFile('lib/source-god-mode-extractor-runtime.js'),
    readRepoFile('lib/foundation-backlog-seed-chunks/chunk-005.js'),
  ])

  const fixture = await startFixtureServer()
  let authRun = null
  let fullRun = null
  try {
    authRun = await runSkoolFreeCommunityGodMode({
      url: `${fixture.baseUrl}/chase-ai-community/about`,
      allowLocalFixture: true,
      headed: args.headed,
      rootDir: '.openclaw/test-skool-free-community-god-mode',
      profileDir: '.openclaw/test-skool-free-community-god-mode/profiles/auth-needed',
      now: '2026-05-26T20:30:00.000Z',
    })
    fullRun = await runSkoolFreeCommunityGodMode({
      url: `${fixture.baseUrl}/chase-ai-community/about?session=1`,
      allowLocalFixture: true,
      headed: args.headed,
      rootDir: '.openclaw/test-skool-free-community-god-mode',
      profileDir: '.openclaw/test-skool-free-community-god-mode/profiles/full-run',
      now: '2026-05-26T20:30:00.000Z',
      maxPages: 8,
      maxDepth: 2,
    })
  } finally {
    await fixture.close()
  }

  const authEval = evaluateSkoolFreeCommunityGodModeReport(authRun)
  const fullEval = evaluateSkoolFreeCommunityGodModeReport(fullRun)
  const fullRunLinks = fullRun.pages?.flatMap(page => page.linkClassifications || []) || []

  addCheck(
    checks,
    packageJson.scripts?.['process:skool-free-community-god-mode-runner-check'] === `node --env-file-if-exists=.env ${SKOOL_FREE_COMMUNITY_GOD_MODE_SCRIPT_PATH}`,
    'package exposes focused free Skool God Mode proof',
    packageJson.scripts?.['process:skool-free-community-god-mode-runner-check'] || 'missing',
  )
  addCheck(
    checks,
    packageJson.scripts?.['skool:free-god-mode'] === 'node --env-file-if-exists=.env scripts/run-skool-free-community-god-mode.mjs' &&
      /runSkoolFreeCommunityGodMode/.test(cliSource),
    'package exposes operator free Skool God Mode runner',
    packageJson.scripts?.['skool:free-god-mode'] || 'missing',
  )
  addCheck(
    checks,
    /SKOOL_FREE_COMMUNITY_LOOKBACK_DAYS = 20/.test(runnerSource) &&
      /last 20 days/.test(runnerSource) &&
      /SKOOL_COMMUNITY_LOOKBACK_DAYS = 20/.test(runtimeSource) &&
      /last 20 days/.test(seedSource),
    'Skool SOP is corrected to 20 days across runner/runtime/backlog',
    String(SKOOL_FREE_COMMUNITY_LOOKBACK_DAYS),
  )
  addCheck(
    checks,
    authRun.status === 'auth_needed' &&
      authRun.ok === false &&
      authRun.authNeeded?.event?.eventType === 'auth_needed' &&
      authRun.sideEffects.joinAttempted === true,
    'runner emits auth_needed when free join hits login/MFA instead of claiming God Mode',
    JSON.stringify({ status: authRun.status, authNeeded: authRun.authNeeded?.event?.eventType, sideEffects: authRun.sideEffects }),
  )
  addCheck(
    checks,
    authEval.ok,
    'auth-needed report still satisfies safety evaluator',
    authEval.failed.map(item => item.check).join(', ') || 'ok',
  )
  addCheck(
    checks,
    fullRun.status === 'free_skool_community_god_mode_completed' &&
      fullRun.ok === true &&
      fullRun.sopCompletion?.lookbackDays === 20,
    'joined/session fixture completes the free Skool God Mode SOP',
    JSON.stringify(fullRun.sopCompletion || {}),
  )
  addCheck(
    checks,
    fullRun.sideEffects.joinAttempted === true &&
      fullRun.sideEffects.joinedCommunity === true &&
      fullRun.sideEffects.purchased === false &&
      fullRun.sideEffects.postedOrMessaged === false &&
      fullRun.sideEffects.downloadedFile === false,
    'runner can click free join while still blocking dangerous actions',
    JSON.stringify(fullRun.sideEffects || {}),
  )
  addCheck(
    checks,
    fullRun.sopCompletion?.counts?.recentActivityItems >= 2 &&
      fullRun.sopCompletion?.counts?.courseOrResourcePages >= 2 &&
      fullRun.sopCompletion?.counts?.safeResourceCandidates >= 1,
    'runner reads last-20-day posts/comments plus classroom/resources and classifies resource links',
    JSON.stringify(fullRun.sopCompletion?.counts || {}),
  )
  addCheck(
    checks,
    fullRunLinks.some(link => link.decision === 'blocked_auth_write_purchase_download_or_account_surface' && /checkout|settings|template\.zip|new-post|\/login/.test(link.url)) &&
      fullRunLinks.some(link => link.decision === 'safe_external_resource_candidate' && /github|browserbase/.test(link.url)),
    'runner classifies paid/write/download/profile blockers and safe external resource candidates',
    fullRunLinks.map(link => `${link.decision}:${link.url}`).join(', '),
  )
  addCheck(
    checks,
    fullEval.ok,
    'full report satisfies free Skool evaluator',
    fullEval.failed.map(item => item.check).join(', ') || 'ok',
  )

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    status: failures.length ? 'unhealthy' : 'healthy',
    cardId: SKOOL_FREE_COMMUNITY_GOD_MODE_CARD_ID,
    reportOnly: true,
    lookbackDays: SKOOL_FREE_COMMUNITY_LOOKBACK_DAYS,
    authRun: {
      status: authRun.status,
      reportPath: authRun.artifacts?.reportPath,
      authNeeded: Boolean(authRun.authNeeded),
    },
    fullRun: {
      status: fullRun.status,
      reportPath: fullRun.artifacts?.reportPath,
      counts: fullRun.sopCompletion?.counts,
    },
    checks,
    failures,
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log(`${output.status}: ${SKOOL_FREE_COMMUNITY_GOD_MODE_CARD_ID}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` - ${check.detail}` : ''}`)
  }

  if (failures.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
