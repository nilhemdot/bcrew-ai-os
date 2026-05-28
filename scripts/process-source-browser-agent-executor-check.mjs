#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  SOURCE_BROWSER_AGENT_EXECUTOR_SCRIPT_PATH,
  SOURCE_BROWSER_AGENT_EXECUTOR_VERSION,
  buildSourceBrowserAgentExecutionTargetInput,
  executeSourceBrowserAgentRun,
  persistSourceBrowserAgentExecution,
} from '../lib/source-browser-agent-executor.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
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

function fixtureResponse(html = '', { status = 200, contentType = 'text/html; charset=utf-8' } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name = '') {
        return String(name || '').toLowerCase() === 'content-type' ? contentType : ''
      },
    },
    async text() {
      return html
    },
  }
}

function fixtureFetch(routes = {}) {
  return async url => {
    const target = String(url || '').replace(/#.*$/, '')
    const html = routes[target] || routes.default || '<html><title>Fixture</title><main>fixture</main></html>'
    return fixtureResponse(html)
  }
}

function hasUnsafeSideEffect(execution = {}) {
  const sideEffects = execution.crawlItem?.metadata?.sideEffects || execution.sideEffects || {}
  return sideEffects.externalWrites === true ||
    sideEffects.writesBacklog === true ||
    sideEffects.submittedForm === true ||
    sideEffects.downloadedFile === true ||
    sideEffects.purchased === true ||
    sideEffects.postedOrMessaged === true ||
    sideEffects.mutatesCredentials === true ||
    sideEffects.normalChromeProfileUsed === true
}

async function buildExecutions() {
  const now = '2026-05-28T15:30:00.000Z'
  const publicUrl = 'https://example.com/source-browser-agent-guide'
  const publicExecution = await executeSourceBrowserAgentRun({
    packet: {
      sourceId: 'fixture-public-execute',
      url: publicUrl,
      sourceType: 'public_or_free_source',
      title: 'Source Browser Agent Guide',
      preview: 'Agent browser source extraction guide with resources and implementation notes.',
    },
    mode: 'synthetic_fixture',
    htmlByUrl: {
      [publicUrl]: `
        <html>
          <title>Source Browser Agent Guide</title>
          <main>
            <h1>Agent browser extraction workflow</h1>
            <p>Use source packets, session broker, evidence artifacts, and verifier loops for reliable agent browsing.</p>
            <a href="https://example.com/source-browser-agent-guide/resources">Free resource pack</a>
            <a href="https://checkout.example.com/buy">Buy course</a>
          </main>
        </html>
      `,
      '/source-browser-agent-guide/resources': `
        <html>
          <title>Free resource pack</title>
          <main><h1>Free agent templates</h1><p>Templates for queues, memory, and extractor SOPs.</p></main>
        </html>
      `,
    },
    maxPages: 3,
    maxDepth: 1,
    now,
  })

  const repoHtml = `
    <html>
      <title>acme/agent-memory: README</title>
      <article class="markdown-body">
        <h1>Agent Memory Runtime</h1>
        <p>Browser agent, source session identity, evidence provenance, queue scheduler, MCP tools, memory, retrieval, eval, and fail-closed guardrails.</p>
        <p>Usage includes npm install as source evidence only; do not execute it.</p>
        <a href="/acme/agent-memory/blob/main/docs/architecture.md">Architecture docs</a>
        <a href="/acme/agent-memory/tree/main/examples">Examples</a>
        <a href="/acme/agent-memory/blob/main/LICENSE">License</a>
        <a href="/acme/agent-memory/archive/refs/heads/main.zip">Download zip</a>
        <a href="/login">Login</a>
      </article>
    </html>
  `
  const repoExecution = await executeSourceBrowserAgentRun({
    packet: {
      sourceId: 'fixture-repo-execute',
      url: 'https://github.com/acme/agent-memory',
      sourceType: 'github_docs_public_resources',
      title: 'Agent memory repo',
      preview: 'README and docs for agent memory and source browser runtime.',
    },
    fetchImpl: fixtureFetch({ default: repoHtml }),
    maxPages: 4,
    maxDepth: 2,
    now: '2026-05-28T15:31:00.000Z',
  })

  const newsletterExecution = await executeSourceBrowserAgentRun({
    packet: {
      sourceId: 'fixture-newsletter-execute',
      url: 'https://newsletter.example.com/agent-updates',
      sourceType: 'creator_newsletter',
      action: 'read_newsletter_page',
      account: 'ai@bensoncrew.ca',
      title: 'Agent Updates newsletter',
      preview: 'Newsletter page for agent automation updates.',
    },
    fetchImpl: fixtureFetch({
      default: `
        <html>
          <title>Agent Updates Newsletter</title>
          <main>
            <h1>Get weekly agent automation updates</h1>
            <form action="/subscribe" method="get">
              <input type="email" name="email" placeholder="Email" required>
              <button type="submit">Subscribe</button>
            </form>
          </main>
        </html>
      `,
    }),
    now: '2026-05-28T15:32:00.000Z',
  })

  const skoolBlocked = await executeSourceBrowserAgentRun({
    packet: {
      sourceId: 'fixture-free-skool-blocked',
      url: 'https://www.skool.com/chase-ai-community/about',
      sourceType: 'skool_free_community',
      title: 'Chase AI community',
      preview: 'Free Skool community, but no isolated source session is proven.',
    },
    now: '2026-05-28T15:33:00.000Z',
  })

  const myicorWrongSignup = await executeSourceBrowserAgentRun({
    packet: {
      sourceId: 'myicor',
      url: 'https://app.myicor.com/login',
      sourceType: 'paid_course_training_platforms',
      sourceBoundaryApproved: true,
      account: 'steve.zahnd@bensoncrew.ca',
      authMethod: 'google_oauth_sign_in',
      keychainPresent: true,
      loginRecipePresent: true,
      signupSurfaceDetected: true,
      title: 'Start Free',
      preview: 'Create your profile.',
    },
    now: '2026-05-28T15:34:00.000Z',
  })

  return { publicExecution, repoExecution, newsletterExecution, skoolBlocked, myicorWrongSignup }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    packageJson,
    executorSource,
    runnerSource,
    sourceNote,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/source-browser-agent-executor.js'),
    readRepoFile('scripts/run-source-browser-agent.mjs'),
    readRepoFile('docs/source-notes/source-browser-agent-protocol-scope-2026-05-28.md'),
  ])

  const executions = await buildExecutions()
  const capturedWrites = []
  const persistence = await persistSourceBrowserAgentExecution(executions.repoExecution, {
    actor: 'source-browser-agent-executor-proof',
    upsertSourceCrawlTarget: async (input, actor) => {
      capturedWrites.push({ kind: 'target', input, actor })
      return input
    },
    upsertSourceCrawlItem: async (input, actor) => {
      capturedWrites.push({ kind: 'item', input, actor })
      return input
    },
  })
  const targetInput = buildSourceBrowserAgentExecutionTargetInput({
    execution: executions.publicExecution,
    now: '2026-05-28T15:35:00.000Z',
  })

  addCheck(
    checks,
    packageJson.scripts?.['process:source-browser-agent-executor-check'] === `node --env-file-if-exists=.env ${SOURCE_BROWSER_AGENT_EXECUTOR_SCRIPT_PATH}`,
    'package exposes focused Source Browser Agent executor proof',
    packageJson.scripts?.['process:source-browser-agent-executor-check'] || 'missing',
  )
  addCheck(
    checks,
    runnerSource.includes('--execute') &&
      runnerSource.includes('--persist') &&
      runnerSource.includes('executeSourceBrowserAgentRun') &&
      runnerSource.includes('persistSourceBrowserAgentExecution'),
    'source:browser-agent CLI can execute and optionally persist exact source packets',
    'scripts/run-source-browser-agent.mjs',
  )
  addCheck(
    checks,
    executorSource.includes('runSourceGodModeExtractor') &&
      executorSource.includes('runPublicRepoDeepReview') &&
      executorSource.includes('runCreatorNewsletterIntake') &&
      executorSource.includes('buildSourceBrowserAgentExecutionCrawlItemInput'),
    'executor wraps existing source runners instead of inventing parallel tools',
    'lib/source-browser-agent-executor.js',
  )
  addCheck(
    checks,
    executions.publicExecution.status === 'source_browser_agent_execution_completed' &&
      executions.publicExecution.runner === 'source:god-mode' &&
      Number(executions.publicExecution.crawlItem?.metadata?.pagesRead || 0) >= 1 &&
      executions.publicExecution.crawlItem?.metadata?.sourceBrowserAgentExecutionVersion === SOURCE_BROWSER_AGENT_EXECUTOR_VERSION &&
      hasUnsafeSideEffect(executions.publicExecution) === false,
    'public source packet executes through source:god-mode and ledgers pages without unsafe side effects',
    JSON.stringify({
      status: executions.publicExecution.status,
      pagesRead: executions.publicExecution.crawlItem?.metadata?.pagesRead,
      unsafe: hasUnsafeSideEffect(executions.publicExecution),
    }),
  )
  addCheck(
    checks,
    executions.repoExecution.status === 'source_browser_agent_execution_completed' &&
      executions.repoExecution.runner === 'repo:deep-review' &&
      Number(executions.repoExecution.crawlItem?.metadata?.pagesRead || 0) >= 1 &&
      list(executions.repoExecution.crawlItem?.metadata?.implementationPatterns).length >= 1 &&
      hasUnsafeSideEffect(executions.repoExecution) === false,
    'public repo packet executes through repo:deep-review with implementation patterns and no clone/install/download/import',
    JSON.stringify({
      pagesRead: executions.repoExecution.crawlItem?.metadata?.pagesRead,
      patterns: list(executions.repoExecution.crawlItem?.metadata?.implementationPatterns).length,
      unsafe: hasUnsafeSideEffect(executions.repoExecution),
    }),
  )
  addCheck(
    checks,
    executions.newsletterExecution.status === 'source_browser_agent_execution_completed' &&
      executions.newsletterExecution.runner === 'newsletter:intake' &&
      executions.newsletterExecution.crawlItem?.metadata?.newsletterCandidates === 1 &&
      executions.newsletterExecution.crawlItem?.metadata?.newsletterIntakePacket?.inboxLabel === 'AIOS Sources/Newsletters' &&
      executions.newsletterExecution.crawlItem?.metadata?.sideEffects?.submittedForm === false &&
      hasUnsafeSideEffect(executions.newsletterExecution) === false,
    'newsletter page executes as no-submit intake and builds source-inbox packet',
    JSON.stringify({
      status: executions.newsletterExecution.crawlItem?.metadata?.status,
      submittedForm: executions.newsletterExecution.crawlItem?.metadata?.sideEffects?.submittedForm,
      inbox: executions.newsletterExecution.crawlItem?.metadata?.newsletterIntakePacket?.inboxLabel,
    }),
  )
  addCheck(
    checks,
    executions.skoolBlocked.status === 'source_browser_agent_blocked_before_runner' &&
      executions.skoolBlocked.plan?.terminalState === 'waiting_auth' &&
      executions.skoolBlocked.plan?.operatorEscalation?.notification?.primaryChannel === 'telegram' &&
      executions.skoolBlocked.crawlItem?.metadata?.sideEffects?.externalRunStarted === false &&
      hasUnsafeSideEffect(executions.skoolBlocked) === false,
    'free Skool without proven source session stops before runner and prepares Harlan auth-needed dry run',
    JSON.stringify({
      terminalState: executions.skoolBlocked.plan?.terminalState,
      channel: executions.skoolBlocked.plan?.operatorEscalation?.notification?.primaryChannel,
      externalRunStarted: executions.skoolBlocked.crawlItem?.metadata?.sideEffects?.externalRunStarted,
    }),
  )
  addCheck(
    checks,
    executions.myicorWrongSignup.status === 'source_browser_agent_blocked_before_runner' &&
      executions.myicorWrongSignup.plan?.terminalState === 'failed_closed' &&
      executions.myicorWrongSignup.plan?.stopReason === 'myicor_wrong_signup_branch_existing_google_sso_required' &&
      executions.myicorWrongSignup.crawlItem?.metadata?.sideEffects?.externalRunStarted === false,
    'myICOR wrong signup branch fails closed before runner execution',
    executions.myicorWrongSignup.plan?.stopReason || 'missing',
  )
  addCheck(
    checks,
    persistence.status === 'source_browser_agent_execution_persisted' &&
      capturedWrites.some(write => write.kind === 'target' && write.input.targetKey === 'source-browser-agent-runs') &&
      capturedWrites.some(write => write.kind === 'item' && write.input.metadata?.sourceBrowserAgentExecutionVersion === SOURCE_BROWSER_AGENT_EXECUTOR_VERSION) &&
      capturedWrites.every(write => !/(synthetic-password|rawPassword|password"\s*:|"access_token"\s*:|"refresh_token"\s*:|"token"\s*:)/i.test(JSON.stringify(write))),
    'executor can persist target/item ledger inputs without raw secrets',
    capturedWrites.map(write => `${write.kind}:${write.input.targetKey || write.input.itemKey}`).join(', '),
  )
  addCheck(
    checks,
    targetInput.budget?.broadCrawl === false &&
      targetInput.budget?.formSubmits === false &&
      targetInput.budget?.downloads === false &&
      targetInput.budget?.purchases === false &&
      targetInput.metadata?.noScoperPromotion === true,
    'execution target locks exact-source/no-side-effect/no-Scoper budget',
    JSON.stringify(targetInput.budget),
  )
  addCheck(
    checks,
    sourceNote.includes('execute-and-ledger wrapper') &&
      sourceNote.includes('source:browser-agent -- --execute') &&
      sourceNote.includes('no external signup, paid/auth, download, purchase, post, message, or Scoper promotion'),
    'source note documents executor boundary and next live blocker',
    'docs/source-notes/source-browser-agent-protocol-scope-2026-05-28.md',
  )

  const failed = checks.filter(check => !check.ok)
  const report = {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'healthy',
    scriptPath: SOURCE_BROWSER_AGENT_EXECUTOR_SCRIPT_PATH,
    checks,
    failed,
    executionReadback: {
      public: {
        status: executions.publicExecution.status,
        runner: executions.publicExecution.runner,
        pagesRead: executions.publicExecution.crawlItem?.metadata?.pagesRead,
      },
      repo: {
        status: executions.repoExecution.status,
        runner: executions.repoExecution.runner,
        pagesRead: executions.repoExecution.crawlItem?.metadata?.pagesRead,
        patterns: list(executions.repoExecution.crawlItem?.metadata?.implementationPatterns).length,
      },
      newsletter: {
        status: executions.newsletterExecution.status,
        runner: executions.newsletterExecution.runner,
        newsletterCandidates: executions.newsletterExecution.crawlItem?.metadata?.newsletterCandidates,
      },
      blocked: {
        skool: executions.skoolBlocked.plan?.terminalState,
        myicor: executions.myicorWrongSignup.plan?.terminalState,
      },
    },
  }

  if (args.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log(`Source Browser Agent executor proof: ${report.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }
  if (!report.ok) process.exitCode = 1
}

main().catch(error => {
  console.error('Source Browser Agent executor proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
