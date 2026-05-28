#!/usr/bin/env node

import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  PUBLIC_REPO_DEEP_REVIEW_CARD_ID,
  PUBLIC_REPO_DEEP_REVIEW_CLI_PATH,
  PUBLIC_REPO_DEEP_REVIEW_SCRIPT_PATH,
  buildPublicRepoDeepReviewPacket,
  evaluatePublicRepoDeepReviewReport,
  runPublicRepoDeepReview,
} from '../lib/public-repo-deep-review-runner.js'

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
    if (url.pathname === '/demo/agent-runtime') {
      body = page('README - Demo Agent Runtime', `
        <nav>
          <p>GitHub Spark Build and deploy intelligent apps. GitHub Copilot Write better code with AI. Actions Automate any workflow.</p>
          <p>Resetting focus You signed in with another tab or window.</p>
          <a href="/demo/agent-runtime/pulls">Pull requests</a>
          <a href="/demo/agent-runtime/projects">Projects</a>
          <a href="/demo/agent-runtime/actions">Actions</a>
        </nav>
        <article class="markdown-body">
          <h1>Demo Agent Runtime</h1>
          <p>Agentic browser runtime for Playwright Hands, source session broker auth, MCP tools, memory, evidence citations, and fail-closed verifier checks.</p>
          <p>Setup docs mention npm install only as source text; the reviewer must not execute it.</p>
          <a href="/demo/agent-runtime/blob/main/docs/architecture.md">Architecture docs</a>
          <a href="/demo/agent-runtime/tree/main/examples">Examples</a>
          <a href="/demo/agent-runtime/blob/main/LICENSE">License</a>
          <a href="/demo/agent-runtime/archive/refs/heads/main.zip">Download ZIP</a>
          <a href="https://raw.githubusercontent.com/demo/agent-runtime/main/src/index.js">Raw file</a>
          <a href="/login">Sign in</a>
          <a href="https://github.com/pricing">GitHub pricing chrome</a>
        </article>
      `)
    } else if (url.pathname === '/demo/agent-runtime/blob/main/docs/architecture.md') {
      body = page('Architecture - Demo Agent Runtime', `
        <h1>Architecture</h1>
        <p>The worker uses a queue, scheduler, resume checkpoint, and artifact readback so extraction can run without babysitting.</p>
        <p>Every source read creates provenance, evidence trace, citation records, and audit checkpoints before synthesis.</p>
        <p>Auth routes use a source session identity broker, Keychain credential refs, MFA auth_needed events, and fail-closed policy gates.</p>
      `)
    } else if (url.pathname === '/demo/agent-runtime/tree/main/examples') {
      body = page('Examples - Demo Agent Runtime', `
        <h1>Examples</h1>
        <p>Examples include Playwright browser navigation, dashboard screenshot inspection, API adapters, skills, plugins, MCP server tools, tests, and guardrails.</p>
        <a href="/demo/agent-runtime/blob/main/examples/browser-agent.md">Browser agent example</a>
        <a href="/demo/agent-runtime/releases/download/v1/toolkit.zip">Release zip</a>
      `)
    } else if (url.pathname === '/demo/agent-runtime/blob/main/examples/browser-agent.md') {
      body = page('Browser Agent Example', `
        <h1>Browser Agent Example</h1>
        <p>The browser agent clicks safe links, captures DOM evidence, records screenshots, runs eval checks, and stops at payment or account mutation.</p>
      `)
    } else if (url.pathname === '/demo/agent-runtime/blob/main/LICENSE') {
      body = page('MIT License', `
        <h1>MIT License</h1>
        <p>MIT license provenance for public read-only review.</p>
      `)
    } else if (url.pathname === '/login') {
      body = page('Login', '<h1>Login</h1><input type="password">')
    } else if (/archive|releases\/download/.test(url.pathname)) {
      body = page('Download', '<h1>Download should not be opened</h1>')
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

function unsafeSideEffectViolations(sideEffects = {}) {
  return Object.entries(sideEffects || {})
    .filter(([, value]) => value === true || (typeof value === 'number' && value > 0))
    .map(([key, value]) => `${key}=${value}`)
}

function sourceContainsForbiddenRuntimeAction(source = '') {
  return /child_process|execFile|spawn\(|createBacklogItem|updateBacklogItem|upsertFoundationCurrentSprintOverlay|INSERT\s+INTO|UPDATE\s+backlog_items|writeFile\s*\(/i.test(String(source || ''))
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [packageJson, runnerSource, cliSource] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/public-repo-deep-review-runner.js'),
    readRepoFile(PUBLIC_REPO_DEEP_REVIEW_CLI_PATH),
  ])

  const fixture = await startFixtureServer()
  let report = null
  try {
    report = await runPublicRepoDeepReview({
      url: `${fixture.baseUrl}/demo/agent-runtime`,
      allowLocalFixture: true,
      maxPages: 8,
      maxDepth: 3,
      now: '2026-05-28T12:00:00.000Z',
    })
  } finally {
    await fixture.close()
  }

  const evaluation = evaluatePublicRepoDeepReviewReport(report)
  const packet = buildPublicRepoDeepReviewPacket(report)
  const implementationEvidenceText = JSON.stringify(report.implementationPatterns || [])
  const blockedUnsupported = await runPublicRepoDeepReview({
    url: 'https://example.com/not-a-supported-repo',
    maxPages: 1,
    now: '2026-05-28T12:00:00.000Z',
  })
  const blockedUnsafeStart = await runPublicRepoDeepReview({
    url: `${fixture.baseUrl}/demo/agent-runtime/archive/refs/heads/main.zip`,
    allowLocalFixture: true,
    maxPages: 1,
    now: '2026-05-28T12:00:00.000Z',
  })
  const blockedDecisions = (report.blockedLinks || []).map(link => link.decision)
  const openedPaths = Object.fromEntries(fixture.hits.entries())

  addCheck(
    checks,
    packageJson.scripts?.['process:public-repo-deep-review-runner-check'] === `node --env-file-if-exists=.env ${PUBLIC_REPO_DEEP_REVIEW_SCRIPT_PATH}`,
    'package exposes focused public repo deep-review runner proof',
    packageJson.scripts?.['process:public-repo-deep-review-runner-check'] || 'missing',
  )
  addCheck(
    checks,
    packageJson.scripts?.['repo:deep-review'] === `node --env-file-if-exists=.env ${PUBLIC_REPO_DEEP_REVIEW_CLI_PATH}` &&
      /runPublicRepoDeepReview/.test(cliSource),
    'package exposes operator repo deep-review runner',
    packageJson.scripts?.['repo:deep-review'] || 'missing',
  )
  addCheck(
    checks,
    report.status === 'public_repo_deep_review_completed' &&
      report.pagesRead >= 5 &&
      report.sourceCoverage?.docsSeen === true &&
      report.sourceCoverage?.examplesSeen === true &&
      report.sourceCoverage?.licenseSeen === true,
    'fixture repo review reads overview, docs, examples, and license/provenance',
    JSON.stringify({ status: report.status, pagesRead: report.pagesRead, sourceCoverage: report.sourceCoverage }),
  )
  addCheck(
    checks,
    evaluation.ok,
    'public repo deep-review report satisfies evaluator',
    evaluation.failed.map(item => item.check).join(', ') || 'ok',
  )
  addCheck(
    checks,
    packet.implementationPatternCount >= 3 &&
      packet.implementationPatterns.every(pattern => pattern.sourceUrl && pattern.evidenceSnippet && pattern.aiosUse),
    'packet includes cited implementation patterns for AIOS review',
    `${packet.implementationPatternCount} patterns`,
  )
  addCheck(
    checks,
    blockedDecisions.includes('blocked_raw_or_archive_download') &&
      blockedDecisions.includes('blocked_auth_download_archive_or_write_path') &&
      blockedDecisions.includes('blocked_repo_chrome_path') &&
      blockedDecisions.some(decision => /external|chrome/.test(decision)),
    'repo runner blocks raw/archive/download/auth/external/chrome links',
    blockedDecisions.join(', '),
  )
  addCheck(
    checks,
    !openedPaths['/login'] &&
      !openedPaths['/demo/agent-runtime/pulls'] &&
      !openedPaths['/demo/agent-runtime/projects'] &&
      !openedPaths['/demo/agent-runtime/actions'] &&
      !openedPaths['/demo/agent-runtime/archive/refs/heads/main.zip'] &&
      !openedPaths['/demo/agent-runtime/releases/download/v1/toolkit.zip'],
    'blocked auth/download/archive paths were not opened',
    JSON.stringify(openedPaths),
  )
  addCheck(
    checks,
    report.pages?.some(page => page.primaryContentUsed === true && page.chromeTextFiltered === true) &&
      !/GitHub Spark|GitHub Copilot|Resetting focus|signed in with another tab/i.test(implementationEvidenceText),
    'repo implementation evidence uses primary repo content instead of GitHub chrome text',
    implementationEvidenceText.slice(0, 240),
  )
  addCheck(
    checks,
    unsafeSideEffectViolations(report.sideEffects).length === 0 &&
      report.sideEffects.cloneStarted === false &&
      report.sideEffects.installStarted === false &&
      report.sideEffects.codeImported === false &&
      report.sideEffects.backlogWritten === false,
    'runner records no clone/install/import/download/backlog/provider/auth side effects',
    unsafeSideEffectViolations(report.sideEffects).join(', ') || 'none',
  )
  addCheck(
    checks,
    blockedUnsupported.status === 'blocked' &&
      blockedUnsupported.reason === 'unsupported_public_repo_host',
    'unsupported hosts fail before network fetch',
    JSON.stringify({ status: blockedUnsupported.status, reason: blockedUnsupported.reason }),
  )
  addCheck(
    checks,
    blockedUnsafeStart.status === 'blocked' &&
      blockedUnsafeStart.reason === 'unsafe_starting_repo_path',
    'archive/download starting URLs fail closed',
    JSON.stringify({ status: blockedUnsafeStart.status, reason: blockedUnsafeStart.reason }),
  )
  addCheck(
    checks,
    !sourceContainsForbiddenRuntimeAction(runnerSource) &&
      !sourceContainsForbiddenRuntimeAction(cliSource),
    'runner and CLI do not spawn clone/install commands, write backlog, or write files',
    'static source scan',
  )

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    status: failures.length ? 'unhealthy' : 'healthy',
    cardId: PUBLIC_REPO_DEEP_REVIEW_CARD_ID,
    reportOnly: true,
    report: {
      status: report.status,
      pagesRead: report.pagesRead,
      implementationPatternCount: report.implementationPatterns?.length || 0,
      sourceCoverage: report.sourceCoverage,
      blockedLinkCount: report.blockedLinks?.length || 0,
    },
    packet: {
      packetId: packet.packetId,
      implementationPatternCount: packet.implementationPatternCount,
      nextAction: packet.nextAction,
    },
    checks,
    failures,
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log(`Public repo deep-review runner check: ${output.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` - ${check.detail}` : ''}`)
  }

  if (failures.length) process.exitCode = 1
}

main().catch(error => {
  console.error('Public repo deep-review runner check failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
