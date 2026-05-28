#!/usr/bin/env node

import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  SOURCE_GOD_MODE_EXTRACTOR_RUNTIME_CARD_ID,
  SOURCE_GOD_MODE_EXTRACTOR_RUNTIME_SCRIPT_PATH,
  SOURCE_GOD_MODE_REQUIRED_RUNTIME_CAPABILITIES,
  buildSourceBrowserSessionPolicy,
  evaluateSourceGodModeExtractorRuntime,
  evaluateSourceBrowserPageHealth,
  runSourceGodModeExtractor,
} from '../lib/source-god-mode-extractor-runtime.js'

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
        <meta name="description" content="${title} fixture">
      </head>
      <body>${body}</body>
    </html>`
}

async function startFixtureServer() {
  const hits = new Map()
  const pages = {
    '/youtube-page': page('Agentic Browser God Mode YouTube Page', `
      <h1>Build agentic browser systems with source extraction</h1>
      <p>This public page simulates a YouTube description with code, resources, newsletter, free community, and paid gate links.</p>
      <a href="/resource">Public repo/docs resource</a>
      <a href="/newsletter">AI Hero newsletter</a>
      <a href="/free-skool">Free Skool community</a>
      <a href="/checkout">Paid course checkout</a>
      <a href="/login">Login area</a>
      <a href="/guide.pdf">Public PDF guide</a>
      <a href="/template.zip">Template download</a>
    `),
    '/resource': page('Public Repo Resource', `
      <h1>Public GitHub style resource</h1>
      <p>README for an AIOS browser automation skill with examples, API notes, and implementation steps.</p>
      <a href="/resource/examples">Examples</a>
    `),
    '/resource/examples': page('Resource Examples', `
      <h1>Automation examples</h1>
      <p>Examples for extractor hands, browser verification, and source-backed agents.</p>
    `),
    '/newsletter': page('AI Hero Newsletter', `
      <h1>AI Hero Newsletter</h1>
      <p>Weekly source intelligence about agent workflows and code resources.</p>
      <form action="/newsletter/submit" method="post">
        <input type="email" name="email" placeholder="Email">
        <button type="submit">Subscribe</button>
      </form>
    `),
    '/form-only-resource': page('Public Lead Magnet', `
      <h1>Public strategy call guide</h1>
      <p>A simple public page with a visible opt-in form and no implementation links.</p>
      <form action="/form-only-submit" method="post">
        <input type="email" name="email" placeholder="Email">
        <button type="submit">Get the guide</button>
      </form>
    `),
    '/free-skool': page('Free Skool Community', `
      <h1>Free Skool community</h1>
      <p>Visible free community notes from the last 20 days: agent browser tutorial, prompt examples, and resource links.</p>
      <a href="/free-classroom">Free classroom resource</a>
      <a href="/paid-classroom">Paid classroom</a>
      <a href="/login">Log in to comment</a>
    `),
    '/free-classroom': page('Free Classroom Resource', `
      <h1>Free classroom resource</h1>
      <p>Free course notes about browser agents, source maps, and extraction SOPs.</p>
    `),
    '/checkout': page('Paid Checkout Should Not Be Read', '<h1>Checkout</h1><p>Payment required.</p>'),
    '/login': page('Login Should Not Be Read', '<h1>Login</h1><input type="password" name="password">'),
    '/paid-classroom': page('Paid Classroom Should Not Be Read', '<h1>Paid private classroom</h1><p>Members only.</p>'),
    '/guide.pdf': 'pdf fixture should not be requested',
    '/template.zip': 'zip fixture should not be requested',
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

async function main() {
  const args = parseArgs()
  const checks = []
  const [packageJson, moduleSource, runnerSource, stagehandSource] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/source-god-mode-extractor-runtime.js'),
    readRepoFile('scripts/run-source-god-mode-extractor.mjs'),
    readRepoFile('lib/source-agentic-browser-runtime.js'),
  ])

  const fixture = await startFixtureServer()
  let liveRun = null
  let formOnlyRun = null
  let repoRun = null
  try {
    liveRun = await runSourceGodModeExtractor({
      url: `${fixture.baseUrl}/youtube-page`,
      sourceType: 'youtube_public_creator',
      creatorId: 'fixture-agentic-browser-creator',
      creatorName: 'Fixture Agentic Browser Creator',
      mode: 'live_browser',
      maxPages: 6,
      maxDepth: 2,
      headed: args.headed,
      now: '2026-05-26T20:00:00.000Z',
    })
    formOnlyRun = await runSourceGodModeExtractor({
      url: `${fixture.baseUrl}/form-only-resource`,
      sourceType: 'public_or_free_source',
      creatorId: 'fixture-form-only-source',
      creatorName: 'Fixture Form Only Source',
      mode: 'live_browser',
      maxPages: 2,
      maxDepth: 1,
      headed: args.headed,
      now: '2026-05-26T20:01:00.000Z',
    })
    repoRun = await runSourceGodModeExtractor({
      url: 'https://github.com/acme/agent-memory',
      sourceType: 'github_docs_public_resources',
      creatorId: 'fixture-repo-source',
      creatorName: 'Fixture Repo Source',
      mode: 'synthetic_fixture',
      maxPages: 4,
      maxDepth: 1,
      now: '2026-05-26T20:02:00.000Z',
      htmlByUrl: {
        'https://github.com/acme/agent-memory': page('GitHub - acme/agent-memory: Agent memory system', `
          <h1>acme/agent-memory</h1>
          <p>Agent memory system with MCP server, browser automation examples, and Codex/Claude setup.</p>
          <a href="/">GitHub home</a>
          <a href="/features/copilot">Copilot marketing</a>
          <a href="/pricing">Pricing</a>
          <a href="/login">Sign in</a>
          <a href="/acme/agent-memory/blob/main/README.md">README</a>
          <a href="/acme/agent-memory/tree/main/docs">docs</a>
          <a href="/acme/agent-memory/tree/main/examples">examples</a>
        `),
        'https://github.com/acme/agent-memory/blob/main/README.md': page('README.md at main · acme/agent-memory', `
          <h1>README</h1>
          <h2>Quickstart</h2>
          <p>Install notes, usage, architecture, and memory retrieval workflow for agents.</p>
        `),
        'https://github.com/acme/agent-memory/tree/main/docs': page('docs · acme/agent-memory', `
          <h1>docs</h1>
          <h2>Architecture</h2>
          <p>Docs explain the source-backed memory architecture, API, and evidence provenance.</p>
        `),
        'https://github.com/acme/agent-memory/tree/main/examples': page('examples · acme/agent-memory', `
          <h1>examples</h1>
          <h2>MCP workflow</h2>
          <p>Examples show Claude, Codex, and browser agent integration patterns.</p>
        `),
      },
    })
  } finally {
    await fixture.close()
  }

  const evaluation = evaluateSourceGodModeExtractorRuntime(liveRun)
  const formOnlyEvaluation = evaluateSourceGodModeExtractorRuntime(formOnlyRun)
  const blockedPaths = ['/checkout', '/login', '/paid-classroom', '/guide.pdf', '/template.zip']
  const blockedPathHits = blockedPaths.map(blockedPath => ({
    path: blockedPath,
    hits: fixture.hits.get(blockedPath) || 0,
  }))
  const pageUrls = new Set((liveRun.pages || []).map(item => item.url))
  const repoPageUrls = new Set((repoRun.pages || []).map(item => item.url))
  const decisions = liveRun.linkDecisions || []
  const capabilities = liveRun.capabilities || {}
  const sourceBrowserSessionPolicy = buildSourceBrowserSessionPolicy({
    targetUrl: `${fixture.baseUrl}/youtube-page`,
    sourceType: 'youtube_public_creator',
    profileMode: 'persistent_isolated',
    profileRoot: path.join(repoRoot, '.openclaw/source-browser-profile-fixture'),
  })
  const aboutBlankHealth = evaluateSourceBrowserPageHealth({
    url: 'about:blank',
    title: '',
    bodyTextPreview: '',
    textChars: 0,
  })
  const restorePromptHealth = evaluateSourceBrowserPageHealth({
    url: 'chrome://newtab/',
    title: 'Restore pages?',
    bodyTextPreview: "Chrome didn't shut down correctly. Restore pages.",
    textChars: 52,
  })

  addCheck(
    checks,
    packageJson.scripts?.['process:source-god-mode-extractor-runtime-check'] === `node --env-file-if-exists=.env ${SOURCE_GOD_MODE_EXTRACTOR_RUNTIME_SCRIPT_PATH}`,
    'package exposes focused source God Mode runtime proof',
    packageJson.scripts?.['process:source-god-mode-extractor-runtime-check'] || 'missing',
  )
  addCheck(
    checks,
    packageJson.scripts?.['source:god-mode'] === 'node --env-file-if-exists=.env scripts/run-source-god-mode-extractor.mjs' &&
      /runSourceGodModeExtractor/.test(runnerSource) &&
      /--sourceType=/.test(runnerSource),
    'package exposes usable source:god-mode runtime entrypoint',
    packageJson.scripts?.['source:god-mode'] || 'missing',
  )
  addCheck(
    checks,
    SOURCE_GOD_MODE_REQUIRED_RUNTIME_CAPABILITIES.every(capability => ['working', 'ready_no_click_needed'].includes(capabilities[capability])),
    'runtime proves Eyes/Read/Hands/Brain/Evidence/Boundaries/Output',
    JSON.stringify(capabilities),
  )
  addCheck(
    checks,
    /classifyGodModeSourceLink/.test(moduleSource) &&
      /runSourceGodModeExtractor/.test(moduleSource) &&
      /stagehandAdapter/.test(moduleSource) &&
      /evaluateSourceBrowserPageHealth/.test(moduleSource) &&
      /buildSourceBrowserSessionPolicy/.test(moduleSource),
    'runtime owns source policy, runner, source-browser session policy, health checks, and optional agentic browser adapter bridge',
    'lib/source-god-mode-extractor-runtime.js',
  )
  addCheck(
    checks,
    sourceBrowserSessionPolicy.profileMode === 'persistent_isolated' &&
      sourceBrowserSessionPolicy.usesNormalChromeProfile === false &&
      sourceBrowserSessionPolicy.defaultChromeProfileForbidden === true &&
      /source-browser-profile-fixture/.test(sourceBrowserSessionPolicy.userDataDir),
    'source-browser profile policy forbids normal Chrome and supports isolated persistent source profiles',
    JSON.stringify(sourceBrowserSessionPolicy),
  )
  addCheck(
    checks,
    aboutBlankHealth.ok === false &&
      aboutBlankHealth.findings.some(item => item.check === 'browser_page_not_blank') &&
      restorePromptHealth.ok === false &&
      restorePromptHealth.findings.some(item => item.check === 'browser_control_surface_not_source_content') &&
      /browser_state_must_not_false_green/.test(moduleSource),
    'browser agent cannot false-green about:blank, restore-session, or empty browser-control states',
    JSON.stringify({ aboutBlankHealth, restorePromptHealth }),
  )
  addCheck(
    checks,
    /Stagehand/.test(stagehandSource) &&
      /agentic source browser/i.test(stagehandSource) &&
      /evaluateSourceBrowserPageHealth/.test(stagehandSource) &&
      /agentic_browser_blocked_browser_state/.test(stagehandSource) &&
      /sourceBrowserSession/.test(stagehandSource),
    'Stagehand agentic browser adapter remains available and cannot reason from blank browser state',
    'lib/source-agentic-browser-runtime.js',
  )
  addCheck(
    checks,
    liveRun.ok === true && evaluation.ok === true,
    'live local browser run is healthy',
    evaluation.findings?.map(item => `${item.check}:${item.detail}`).join(', ') || liveRun.status,
  )
  addCheck(
    checks,
    liveRun.runtime?.sourceBrowserSession?.profileMode === 'ephemeral_isolated' &&
      liveRun.runtime?.sourceBrowserSession?.usesNormalChromeProfile === false &&
      liveRun.runtime?.sourceBrowserSession?.restorePreviousSessionDisabled === true &&
      Array.isArray(liveRun.browserRecoveryEvents),
    'live browser run records session policy and recovery ledger',
    JSON.stringify({
      sourceBrowserSession: liveRun.runtime?.sourceBrowserSession,
      browserRecoveryEvents: liveRun.browserRecoveryEvents || [],
    }),
  )
  addCheck(
    checks,
    formOnlyRun.ok === true &&
      formOnlyEvaluation.ok === true &&
      formOnlyRun.pages?.length === 1 &&
      formOnlyRun.capabilities?.brain === 'working' &&
      formOnlyRun.capabilities?.hands === 'ready_no_click_needed' &&
      formOnlyRun.blockers?.some(item => item.type === 'form_or_submit_action_detected') &&
      formOnlyRun.sideEffects.submittedForm === false &&
      (fixture.hits.get('/form-only-submit') || 0) === 0,
    'form-only public pages are successful read evidence with action blockers, not failed extraction',
    JSON.stringify({
      status: formOnlyRun.status,
      ok: formOnlyRun.ok,
      capabilities: formOnlyRun.capabilities,
      blockers: formOnlyRun.blockers,
      submitHits: fixture.hits.get('/form-only-submit') || 0,
      findings: formOnlyEvaluation.findings || [],
    }),
  )
  addCheck(
    checks,
    (liveRun.handsEvents || []).some(event => event.method === 'locator_click' && event.ok === true),
    'real browser Hands clicked a safe link',
    JSON.stringify(liveRun.handsEvents || []),
  )
  addCheck(
    checks,
    [...pageUrls].some(url => url.endsWith('/resource')) &&
      [...pageUrls].some(url => url.endsWith('/newsletter')) &&
      [...pageUrls].some(url => url.endsWith('/free-skool')) &&
      [...pageUrls].some(url => url.endsWith('/free-classroom')),
    'runtime followed safe public/free resource, newsletter, and free community pages',
    [...pageUrls].join(', '),
  )
  addCheck(
    checks,
    repoRun.ok === true &&
      repoRun.repoReview?.status === 'repo_readback_ready' &&
      repoRun.repoReview?.globalChromePagesOpened === 0 &&
      repoRun.repoReview?.localRepoPagesRead >= 3 &&
      repoRun.repoReview?.hardBlockerCount === 0 &&
      ['A', 'S'].includes(repoRun.brain?.valueScore?.grade) &&
      [...repoPageUrls].some(url => url.endsWith('/acme/agent-memory/blob/main/README.md')) &&
      [...repoPageUrls].some(url => url.endsWith('/acme/agent-memory/tree/main/docs')) &&
      [...repoPageUrls].some(url => url.endsWith('/acme/agent-memory/tree/main/examples')) &&
      ![...repoPageUrls].some(url => /\/(?:features\/copilot|pricing|login)$/.test(new URL(url).pathname)) &&
      repoRun.sideEffects.downloadedFile === false &&
      repoRun.sideEffects.externalWrites === false,
    'repo source runtime follows repo-local README/docs/examples and skips GitHub chrome',
    JSON.stringify({
      pages: [...repoPageUrls],
      repoReview: repoRun.repoReview,
      valueScore: repoRun.brain?.valueScore,
      handsEvents: repoRun.handsEvents,
    }),
  )
  addCheck(
    checks,
    (liveRun.newsletterCandidates || []).length >= 1 &&
      liveRun.sideEffects.submittedForm === false &&
      liveRun.sideEffects.optedIn === false,
    'newsletter page is detected but not submitted',
    JSON.stringify(liveRun.newsletterCandidates || []),
  )
  addCheck(
    checks,
    decisions.some(item => item.decision === 'paid_gate_value_evaluation') &&
      decisions.some(item => item.decision === 'blocked_form_auth_or_mutation_surface') &&
      decisions.some(item => item.decision === 'blocked_download_requires_file_policy'),
    'paid/auth/form/download boundaries are detected',
    decisions.filter(item => item.blocker).map(item => `${item.decision}:${item.url}`).join(', '),
  )
  addCheck(
    checks,
    (liveRun.fileResourceCandidates || []).some(item => item.url.endsWith('/guide.pdf') && item.resourceKind === 'document' && item.metadataOnly === true && item.downloadAllowed === false) &&
      (liveRun.fileResourceCandidates || []).some(item => item.url.endsWith('/template.zip') && item.resourceKind === 'archive' && item.metadataOnly === true && item.downloadAllowed === false) &&
      decisions.some(item => item.url.endsWith('/guide.pdf') && item.filePolicy?.capturePolicy === 'capture_url_host_label_extension_and_context_only') &&
      /source-free-resource-file-policy/.test(moduleSource),
    'file/download resources become metadata-only candidates without being opened',
    JSON.stringify(liveRun.fileResourceCandidates || []),
  )
  addCheck(
    checks,
    blockedPathHits.every(item => item.hits === 0),
    'blocked paid/auth/download paths were not opened',
    JSON.stringify(blockedPathHits),
  )
  addCheck(
    checks,
    liveRun.sourceStackUpdate?.surfaces?.newsletters === 'signup_page_detected_not_submitted' &&
      liveRun.sourceStackUpdate?.surfaces?.freeCommunity === 'free_public_area_processed_or_detected' &&
      liveRun.sourceStackUpdate?.surfaces?.paidCourseTrainingPlatforms === 'paid_gate_evaluation_ready',
    'creator source-stack output records newsletter, free community, and paid-gate status',
    JSON.stringify(liveRun.sourceStackUpdate || {}),
  )
  addCheck(
    checks,
    liveRun.sideEffects.externalWrites === false &&
      liveRun.sideEffects.writesBacklog === false &&
      liveRun.sideEffects.mutatesCredentials === false &&
      liveRun.sideEffects.normalChromeProfileUsed === false,
    'runtime has no external/backlog/credential/profile side effects',
    JSON.stringify(liveRun.sideEffects),
  )
  addCheck(
    checks,
    !/manualClicks:\s*true/.test(moduleSource) && !/downloadFiles:\s*true/.test(moduleSource),
    'runtime does not fake manual clicks or allow downloads',
    SOURCE_GOD_MODE_EXTRACTOR_RUNTIME_SCRIPT_PATH,
  )

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    status: failures.length ? 'unhealthy' : 'healthy',
    cardId: SOURCE_GOD_MODE_EXTRACTOR_RUNTIME_CARD_ID,
    reportOnly: true,
    liveBrowserLaunched: true,
    externalWrites: false,
    writesBacklog: false,
    checkedAt: new Date().toISOString(),
    liveRun: {
      status: liveRun.status,
      ok: liveRun.ok,
      targetUrl: liveRun.targetUrl,
      runtime: liveRun.runtime,
      pagesRead: liveRun.pages?.length || 0,
      handsEvents: liveRun.handsEvents || [],
      browserRecoveryEvents: liveRun.browserRecoveryEvents || [],
      capabilities: liveRun.capabilities,
      blockers: liveRun.blockers,
      fileResourceCandidates: liveRun.fileResourceCandidates,
      newsletterCandidates: liveRun.newsletterCandidates,
      paidGateEvaluations: liveRun.paidGateEvaluations,
      repoReview: liveRun.repoReview,
      sourceStackUpdate: liveRun.sourceStackUpdate,
      sideEffects: liveRun.sideEffects,
      artifactReportPath: liveRun.artifacts?.reportPath || '',
    },
    formOnlyRun: {
      status: formOnlyRun.status,
      ok: formOnlyRun.ok,
      pagesRead: formOnlyRun.pages?.length || 0,
      capabilities: formOnlyRun.capabilities,
      blockers: formOnlyRun.blockers,
      sideEffects: formOnlyRun.sideEffects,
      artifactReportPath: formOnlyRun.artifacts?.reportPath || '',
    },
    repoRun: {
      status: repoRun.status,
      ok: repoRun.ok,
      pagesRead: repoRun.pages?.length || 0,
      capabilities: repoRun.capabilities,
      repoReview: repoRun.repoReview,
      valueScore: repoRun.brain?.valueScore,
      sideEffects: repoRun.sideEffects,
      artifactReportPath: repoRun.artifacts?.reportPath || '',
    },
    blockedPathHits,
    checks,
    failures,
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log(`Source God Mode Extractor Runtime check: ${output.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    console.log(`Report: ${liveRun.artifacts?.reportPath || 'missing'}`)
  }

  if (failures.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
