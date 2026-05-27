#!/usr/bin/env node

import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  SOURCE_GOD_MODE_YOUTUBE_HANDOFF_CARD_ID,
  SOURCE_GOD_MODE_YOUTUBE_HANDOFF_SCRIPT_PATH,
  buildSourceGodModeYoutubeHandoffQueue,
  runSourceGodModeYoutubeHandoffBatch,
} from '../lib/source-god-mode-youtube-handoff.js'
import {
  validatePlanApprovalFile,
} from '../lib/approval-integrity.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const APPROVAL_REF = 'docs/process/approvals/SOURCE-BROWSER-AGENTIC-RUNTIME-001.json'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    headed: argv.includes('--headed') || argv.includes('--headed=true'),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
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
        <meta name="description" content="${title} source handoff fixture">
      </head>
      <body>${body}</body>
    </html>`
}

async function startFixtureServer() {
  const hits = new Map()
  const pages = {
    '/resource': page('Public Resource', `
      <h1>Agentic source runtime resource</h1>
      <p>Public implementation notes for AIOS source extraction, browser hands, evidence capture, and daily source-stack monitoring.</p>
      <a href="/resource/details">Details</a>
      <a href="/checkout">Paid checkout</a>
    `),
    '/resource/details': page('Public Resource Details', `
      <h1>Resource details</h1>
      <p>Concrete workflow steps, API notes, and implementation details for agent browser verification.</p>
      <a href="/checkout">Paid implementation pack</a>
    `),
    '/repo': page('Public Repo README', `
      <h1>course-video-manager README</h1>
      <p>Public GitHub-style repo with setup notes, code examples, and source provenance for a video course manager.</p>
      <a href="/repo/examples">Examples</a>
      <a href="/repo/archive.zip">Download archive</a>
    `),
    '/repo/examples': page('Repo Examples', `
      <h1>Examples</h1>
      <p>Code examples for parsing video metadata and extracting build candidates.</p>
    `),
    '/newsletter': page('Creator Newsletter', `
      <h1>AI Hero Newsletter</h1>
      <p>Free weekly newsletter with AI agent workflows, code resources, and creator notes.</p>
      <form action="/newsletter/submit" method="post">
        <input type="email" name="email" placeholder="Email">
        <button type="submit">Subscribe</button>
      </form>
      <a href="/login">Member issue archive</a>
    `),
    '/chase-ai-community/about': page('Chase AI Community', `
      <h1>Chase AI Community</h1>
      <p>Free community for Claude Code, n8n AI agent templates, and AI systems.</p>
      <a href="/chase-ai-community/community">JOIN GROUP</a>
    `),
    '/chase-ai-community/community': page('Chase AI Community - Community', `
      <h1>Community</h1>
      <nav>
        <a href="/chase-ai-community/classroom">Classroom</a>
        <a href="/chase-ai-community/resources">Resources</a>
      </nav>
      <article data-kind="post" data-post-date="2026-05-24">
        <h2>Claude Code browser agent workflow</h2>
        <p>Post: use persistent source sessions, source-browser skills, and auth-needed escalation.</p>
        <div data-kind="comment" data-comment-date="2026-05-25">Comment: save selectors and rerun daily for source updates.</div>
      </article>
      <article data-kind="post" data-post-date="2026-05-10">
        <h2>n8n AI agent template pack</h2>
        <p>Post: free workflow template links and resource notes.</p>
      </article>
      <a href="https://github.com/example/free-agent-template">Free GitHub template</a>
      <a href="/chase-ai-community/new-post">Create post</a>
      <a href="/checkout">Upgrade to paid</a>
    `),
    '/chase-ai-community/classroom': page('Chase AI Community - Classroom', `
      <h1>Classroom</h1>
      <p>Free course notes about browser agents, source maps, and extraction SOPs.</p>
      <a href="/chase-ai-community/resources">Resources</a>
    `),
    '/chase-ai-community/resources': page('Chase AI Community - Resources', `
      <h1>Resources</h1>
      <p>Pinned resources: free Claude Code SOP, browser skill checklist, and source-stack template.</p>
      <a href="https://docs.browserbase.com/integrations/skills/introduction">Browserbase skills docs</a>
      <a href="/chase-ai-community/template.zip">Download zip</a>
    `),
    '/checkout': page('Checkout', '<h1>Checkout</h1><p>Payment required.</p>'),
    '/login': page('Login', '<h1>Login</h1><input type="password" name="password">'),
  }

  const server = http.createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1')
    hits.set(url.pathname, (hits.get(url.pathname) || 0) + 1)
    const body = pages[url.pathname] || page('Not Found', '<h1>Not found</h1>')
    response.writeHead(pages[url.pathname] ? 200 : 404, {
      'content-type': url.pathname.endsWith('.zip') ? 'application/zip' : 'text/html; charset=utf-8',
    })
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

function buildFixtureHandoffEvidence(baseUrl = '') {
  const item = (pathName, bucketId, sourceVideoId = 'fixture-video-1') => ({
    url: `${baseUrl}${pathName}`,
    host: '127.0.0.1',
    reportArtifactId: `report:${bucketId}`,
    sourceVideoId,
    disposition: 'fixture_youtube_handoff',
  })
  const buckets = {
    'public-web-resources': {
      count: 2,
      itemLimit: 250,
      hasMore: false,
      sampleHosts: ['127.0.0.1'],
      samples: [item('/resource', 'public-web-resources')],
      items: [item('/resource', 'public-web-resources'), item('/resource/details', 'public-web-resources')],
    },
    'public-code-repos': {
      count: 1,
      itemLimit: 250,
      hasMore: false,
      sampleHosts: ['127.0.0.1'],
      samples: [item('/repo', 'public-code-repos')],
      items: [item('/repo', 'public-code-repos')],
    },
    'creator-newsletters': {
      count: 1,
      itemLimit: 250,
      hasMore: false,
      sampleHosts: ['127.0.0.1'],
      samples: [item('/newsletter', 'creator-newsletters')],
      items: [item('/newsletter', 'creator-newsletters')],
    },
    'free-communities': {
      count: 1,
      itemLimit: 250,
      hasMore: false,
      sampleHosts: ['127.0.0.1'],
      samples: [item('/chase-ai-community/about', 'free-communities')],
      items: [item('/chase-ai-community/about', 'free-communities')],
    },
    'products-tools-to-approve': {
      count: 1,
      itemLimit: 250,
      hasMore: false,
      sampleHosts: ['127.0.0.1'],
      samples: [item('/checkout', 'products-tools-to-approve')],
      items: [item('/checkout', 'products-tools-to-approve')],
    },
    'paid-auth-gates': {
      count: 1,
      itemLimit: 250,
      hasMore: false,
      sampleHosts: ['127.0.0.1'],
      samples: [item('/login', 'paid-auth-gates')],
      items: [item('/login', 'paid-auth-gates')],
    },
  }
  return {
    sourceRoute: 'fixture.youtube.fullWatchReports.resourceLinkSnapshot.scoperPacket',
    scannedReportCount: 42,
    buckets,
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    packageJson,
    moduleSource,
    devHubSource,
    approvalValidation,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/source-god-mode-youtube-handoff.js'),
    readRepoFile('lib/dev-team-hub.js'),
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: APPROVAL_REF,
      cardId: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_CARD_ID,
    }),
  ])

  const fixture = await startFixtureServer()
  let queue = null
  let batch = null
  try {
    queue = buildSourceGodModeYoutubeHandoffQueue({
      handoffEvidence: buildFixtureHandoffEvidence(fixture.baseUrl),
      generatedAt: '2026-05-27T11:00:00.000-04:00',
    })
    batch = await runSourceGodModeYoutubeHandoffBatch({
      queue,
      maxRuns: 5,
      headed: args.headed,
      allowLocalFixture: true,
      rootDir: '.openclaw/test-source-god-mode-youtube-handoff',
      now: '2026-05-27T11:00:00.000-04:00',
    })
  } finally {
    await fixture.close()
  }

  const rows = list(queue.rows)
  const results = list(batch.results)
  const byBucket = Object.fromEntries(results.map(result => [result.bucketId, result]))
  const skipped = list(batch.skippedRows)
  const parkedSkipped = skipped.filter(row => ['products-tools-to-approve', 'paid-auth-gates'].includes(row.bucketId))

  addCheck(
    checks,
    packageJson.scripts?.['process:source-god-mode-youtube-handoff-check'] === `node --env-file-if-exists=.env ${SOURCE_GOD_MODE_YOUTUBE_HANDOFF_SCRIPT_PATH}`,
    'package exposes focused YouTube source handoff proof',
    packageJson.scripts?.['process:source-god-mode-youtube-handoff-check'] || 'missing',
  )
  addCheck(
    checks,
    approvalValidation.ok === true,
    'source-browser handoff plan approval validates',
    APPROVAL_REF,
  )
  addCheck(
    checks,
    moduleSource.includes('buildSourceGodModeYoutubeHandoffQueue') &&
      moduleSource.includes('runSourceGodModeYoutubeHandoffBatch') &&
      moduleSource.includes('runSourceGodModeExtractor') &&
      moduleSource.includes('runSkoolFreeCommunityGodMode'),
    'handoff module owns queue building and source-specific runners',
    'lib/source-god-mode-youtube-handoff.js',
  )
  addCheck(
    checks,
    devHubSource.includes('buildSourceGodModeYoutubeHandoffQueue') &&
      devHubSource.includes('sourceGodModeHandoffQueue') &&
      devHubSource.includes('items: rows.slice(0, itemLimit)'),
    'Dev Hub read model exposes runnable source handoff queue from full evidence buckets',
    'lib/dev-team-hub.js',
  )
  addCheck(
    checks,
    queue.status === 'ready' &&
      queue.scannedReportCount === 42 &&
      queue.counts.totalRows === 7 &&
      queue.counts.runnableRows === 5 &&
      queue.counts.parkedRows === 2 &&
      queue.bucketCounts['public-web-resources'].queuedRows === 2 &&
      queue.bucketCounts['public-web-resources'].hasMore === false,
    'queue converts YouTube handoff evidence into runnable and parked rows with disclosed limits',
    JSON.stringify(queue.counts),
  )
  addCheck(
    checks,
    rows.some(row => row.bucketId === 'public-web-resources' && row.runner === 'source:god-mode') &&
      rows.some(row => row.bucketId === 'public-code-repos' && row.sourceType === 'github_docs_public_resources') &&
      rows.some(row => row.bucketId === 'creator-newsletters' && row.sourceType === 'creator_newsletter') &&
      rows.some(row => row.bucketId === 'free-communities' && row.runner === 'skool:free-god-mode') &&
      rows.filter(row => row.runnable).every(row => text(row.runCommand)),
    'public/free/resource/newsletter/community rows get concrete runner commands',
    rows.map(row => `${row.bucketId}:${row.runner}:${row.runnable}`).join(', '),
  )
  addCheck(
    checks,
    rows.filter(row => ['products-tools-to-approve', 'paid-auth-gates'].includes(row.bucketId))
      .every(row => row.runnable === false && row.parked === true && !row.runCommand),
    'paid/auth/product rows are parked and not runnable',
    rows.filter(row => !row.runnable).map(row => `${row.bucketId}:${row.status}`).join(', '),
  )
  addCheck(
    checks,
    batch.status === 'completed' &&
      batch.ok === true &&
      results.length === 5 &&
      parkedSkipped.length === 2,
    'batch runs only runnable public/free rows and skips parked approval-bound rows',
    `results=${results.length}; skipped=${skipped.length}; status=${batch.status}`,
  )
  addCheck(
    checks,
    byBucket['creator-newsletters']?.newsletterCandidates >= 1 &&
      byBucket['creator-newsletters']?.sideEffects?.submittedForm === false,
    'newsletter handoff detects signup without submitting',
    JSON.stringify(byBucket['creator-newsletters'] || {}),
  )
  addCheck(
    checks,
    byBucket['free-communities']?.status === 'free_skool_community_god_mode_completed' &&
      byBucket['free-communities']?.sopCompletion?.lookbackDays === 20 &&
      byBucket['free-communities']?.sopCompletion?.counts?.recentActivityItems >= 2,
    'free community handoff runs the 20-day community/course/resource SOP',
    JSON.stringify(byBucket['free-communities']?.sopCompletion || {}),
  )
  addCheck(
    checks,
    results.filter(result => result.runner === 'source:god-mode').every(result =>
      result.ok === true &&
      result.pagesRead >= 1 &&
      result.sideEffects?.externalWrites === false &&
      result.sideEffects?.writesBacklog === false &&
      result.sideEffects?.normalChromeProfileUsed === false
    ),
    'source:god-mode handoff runs produce local evidence without external/backlog/profile side effects',
    results.map(result => `${result.bucketId}:${result.status}:${result.pagesRead}`).join(', '),
  )
  addCheck(
    checks,
    batch.sideEffects?.externalWrites === false &&
      batch.sideEffects?.writesBacklog === false &&
      batch.sideEffects?.startsScoperPromotion === false &&
      batch.sideEffects?.submittedForm === false &&
      batch.sideEffects?.downloadedFile === false &&
      batch.sideEffects?.purchased === false &&
      batch.sideEffects?.postedOrMessaged === false &&
      batch.sideEffects?.mutatesCredentials === false &&
      batch.sideEffects?.normalChromeProfileUsed === false,
    'handoff batch has no Scoper/backlog/external/action side effects',
    JSON.stringify(batch.sideEffects || {}),
  )

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    status: failures.length ? 'unhealthy' : 'healthy',
    cardId: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_CARD_ID,
    reportOnly: true,
    queue: {
      status: queue.status,
      counts: queue.counts,
      bucketCounts: queue.bucketCounts,
    },
    batch: {
      status: batch.status,
      ok: batch.ok,
      selectedRows: batch.selectedRows,
      skippedRows: batch.skippedRows,
      resultSummary: results.map(result => ({
        bucketId: result.bucketId,
        runner: result.runner,
        status: result.status,
        ok: result.ok,
        pagesRead: result.pagesRead,
      })),
      sideEffects: batch.sideEffects,
    },
    checks,
    failures,
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log(`${output.status}: ${SOURCE_GOD_MODE_YOUTUBE_HANDOFF_CARD_ID}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` - ${check.detail}` : ''}`)
  }

  if (failures.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
