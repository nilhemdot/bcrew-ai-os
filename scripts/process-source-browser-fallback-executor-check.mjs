#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  SOURCE_BROWSER_FALLBACK_EXECUTOR_SCRIPT_PATH,
  SOURCE_BROWSER_FALLBACK_EXECUTOR_VERSION,
  buildSourceBrowserFallbackRetryPacket,
  runSourceBrowserFallbackRetry,
} from '../lib/source-browser-fallback-executor.js'

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

function hasUnsafeSideEffect(result = {}) {
  const effects = result.execution?.crawlItem?.metadata?.sideEffects || result.execution?.sideEffects || result.sideEffects || {}
  return effects.externalWrites === true ||
    effects.writesBacklog === true ||
    effects.submittedForm === true ||
    effects.downloadedFile === true ||
    effects.purchased === true ||
    effects.postedOrMessaged === true ||
    effects.mutatesCredentials === true ||
    effects.normalChromeProfileUsed === true ||
    effects.rawSecretPrinted === true
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    packageJson,
    runnerSource,
    batchRunnerSource,
    fallbackSource,
    handoffSource,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('scripts/run-source-browser-fallback.mjs'),
    readRepoFile('scripts/run-source-browser-fallback-batch.mjs'),
    readRepoFile('lib/source-browser-fallback-executor.js'),
    readRepoFile('lib/source-god-mode-youtube-handoff.js'),
  ])

  const publicRow = {
    rowId: 'fallback-public-guide',
    url: 'https://example.com/agent-browser-guide',
    bucketId: 'public-web-resources',
    sourceType: 'public_or_free_source',
    host: 'example.com',
    label: 'Agent browser guide',
    reason: 'Saved run saw a browser challenge instead of source content.',
    fallbackPlan: {
      status: 'browser_challenge_fallback_required',
      route: 'clean_isolated_retry_then_hosted_browser_fallback',
      sourceSessionRequired: false,
      normalChromeProfileAllowed: false,
    },
  }
  const publicPacket = buildSourceBrowserFallbackRetryPacket({
    row: publicRow,
    mode: 'synthetic_fixture',
    persist: true,
  })
  const publicCommunityBridgePacket = buildSourceBrowserFallbackRetryPacket({
    row: {
      rowId: 'fallback-public-community-bridge',
      url: 'https://community.example.com/',
      bucketId: 'free-communities',
      sourceType: 'public_community_bridge',
      host: 'community.example.com',
      label: 'Public community bridge',
      reason: 'Public bridge hit an interstitial and should retry clean before any source-session path.',
      fallbackPlan: {
        status: 'browser_challenge_fallback_required',
        route: 'clean_isolated_retry_then_hosted_browser_fallback',
        sourceSessionRequired: false,
        normalChromeProfileAllowed: false,
      },
    },
    mode: 'synthetic_fixture',
    persist: true,
  })
  const cleanRetry = await runSourceBrowserFallbackRetry({
    row: publicRow,
    apply: true,
    mode: 'synthetic_fixture',
    persist: false,
    htmlByUrl: {
      [publicRow.url]: `
        <html>
          <title>Agent Browser Guide</title>
          <main>
            <h1>Reliable source browser agents</h1>
            <p>Use clean isolated browser retries, source sessions, artifacts, queue cursors, and fail-closed verifier proof.</p>
            <a href="https://example.com/agent-browser-guide/resources">Free implementation resource</a>
          </main>
        </html>
      `,
    },
    now: '2026-05-28T20:30:00.000Z',
  })
  const challengeAgain = await runSourceBrowserFallbackRetry({
    row: publicRow,
    apply: true,
    mode: 'synthetic_fixture',
    persist: false,
    htmlByUrl: {
      [publicRow.url]: `
        <html>
          <title>Just a moment...</title>
          <body>Cloudflare browser challenge. Checking your browser before accessing the source.</body>
        </html>
      `,
    },
    now: '2026-05-28T20:31:00.000Z',
  })
  const skoolRow = {
    rowId: 'fallback-skool',
    url: 'https://www.skool.com/chase-ai-community/about',
    bucketId: 'free-communities',
    sourceType: 'skool_free_community',
    host: 'skool.com',
    label: 'Chase AI community',
    reason: 'Skool free community needs isolated source-session proof.',
    fallbackPlan: {
      status: 'browser_challenge_fallback_required',
      route: 'source_specific_session_then_hosted_browser_fallback',
      sourceSessionRequired: true,
      normalChromeProfileAllowed: false,
    },
  }
  const skoolPacket = buildSourceBrowserFallbackRetryPacket({ row: skoolRow })
  const skoolBlocked = await runSourceBrowserFallbackRetry({
    row: skoolRow,
    apply: true,
    mode: 'synthetic_fixture',
    allowSourceSessionRun: false,
    now: '2026-05-28T20:32:00.000Z',
  })
  const dryRun = await runSourceBrowserFallbackRetry({
    row: publicRow,
    apply: false,
    now: '2026-05-28T20:33:00.000Z',
  })

  addCheck(
    checks,
    packageJson.scripts?.['process:source-browser-fallback-executor-check'] === `node --env-file-if-exists=.env ${SOURCE_BROWSER_FALLBACK_EXECUTOR_SCRIPT_PATH}` &&
      packageJson.scripts?.['source:browser-fallback'] === 'node --env-file-if-exists=.env scripts/run-source-browser-fallback.mjs' &&
      packageJson.scripts?.['source:browser-fallback-batch'] === 'node --env-file-if-exists=.env scripts/run-source-browser-fallback-batch.mjs',
    'package exposes Source Browser fallback executor scripts',
    `${packageJson.scripts?.['source:browser-fallback'] || 'missing'} / ${packageJson.scripts?.['source:browser-fallback-batch'] || 'missing'} / ${packageJson.scripts?.['process:source-browser-fallback-executor-check'] || 'missing'}`,
  )
  addCheck(
    checks,
    runnerSource.includes('--apply') &&
      runnerSource.includes('--persist') &&
      runnerSource.includes('runSourceBrowserFallbackRetry'),
    'fallback CLI can dry-run, execute, and optionally persist exact retry packets',
    'scripts/run-source-browser-fallback.mjs',
  )
  addCheck(
    checks,
    batchRunnerSource.includes('loadFallbackBatch') &&
      batchRunnerSource.includes('retryBatch.selectedRows') &&
      batchRunnerSource.includes('Dry run first') &&
      batchRunnerSource.includes('runSourceBrowserFallbackRetry') &&
      batchRunnerSource.includes('completed_with_safe_parked_rows') &&
      batchRunnerSource.includes('unsafeRows'),
    'fallback batch CLI selects bounded clean retries, defaults to dry-run readback, and treats safe parked rows as terminal',
    'scripts/run-source-browser-fallback-batch.mjs',
  )
  addCheck(
    checks,
    fallbackSource.includes('executeSourceBrowserAgentRun') &&
      fallbackSource.includes('source_browser_fallback_hosted_fallback_required') &&
      fallbackSource.includes('normalChromeProfileAllowed: false'),
    'fallback executor reuses Source Browser Agent and fails to hosted fallback when clean retry still hits challenge',
    'lib/source-browser-fallback-executor.js',
  )
  addCheck(
    checks,
    publicPacket.status === 'ready_for_clean_isolated_retry' &&
      publicPacket.cleanRetry.allowedNow === true &&
      publicPacket.cleanRetry.command.includes('source:browser-agent') &&
      publicPacket.cleanRetry.normalChromeProfileAllowed === false &&
      publicPacket.hostedFallback.status === 'pending_approval',
    'public challenge row becomes exact clean-isolated retry packet',
    JSON.stringify({
      status: publicPacket.status,
      commandReady: Boolean(publicPacket.cleanRetry.command),
      hostedFallback: publicPacket.hostedFallback.status,
    }),
  )
  addCheck(
    checks,
    publicCommunityBridgePacket.status === 'ready_for_clean_isolated_retry' &&
      publicCommunityBridgePacket.sourcePacket.sourceFamily === 'public_free_resources' &&
      publicCommunityBridgePacket.afterSourceSession.required === false,
    'public community bridge rows retry as public/free source rows before source-session fallback',
    JSON.stringify({
      status: publicCommunityBridgePacket.status,
      sourceFamily: publicCommunityBridgePacket.sourcePacket.sourceFamily,
      afterSourceSessionRequired: publicCommunityBridgePacket.afterSourceSession.required,
    }),
  )
  addCheck(
    checks,
    cleanRetry.status === 'source_browser_fallback_clean_retry_completed' &&
      cleanRetry.execution?.runner === 'source:god-mode' &&
      Number(cleanRetry.execution?.crawlItem?.metadata?.pagesRead || 0) >= 1 &&
      hasUnsafeSideEffect(cleanRetry) === false,
    'clean isolated retry can recover a challenged public row when real source content is available',
    JSON.stringify({
      status: cleanRetry.status,
      pagesRead: cleanRetry.execution?.crawlItem?.metadata?.pagesRead,
      unsafe: hasUnsafeSideEffect(cleanRetry),
    }),
  )
  addCheck(
    checks,
    challengeAgain.status === 'source_browser_fallback_hosted_fallback_required' &&
      challengeAgain.hostedFallbackRequired === true &&
      challengeAgain.ok === false &&
      hasUnsafeSideEffect(challengeAgain) === false,
    'clean retry that still sees a browser challenge does not count as extraction',
    JSON.stringify({
      status: challengeAgain.status,
      hostedFallbackRequired: challengeAgain.hostedFallbackRequired,
      unsafe: hasUnsafeSideEffect(challengeAgain),
    }),
  )
  addCheck(
    checks,
    skoolPacket.status === 'waiting_for_source_session' &&
      skoolPacket.afterSourceSession.required === true &&
      skoolPacket.afterSourceSession.command.includes('--allowSourceSessionRun') &&
      skoolPacket.cleanRetry.allowedNow === false,
    'source-session fallback rows wait for session proof and expose after-session command',
    JSON.stringify({
      status: skoolPacket.status,
      afterSessionCommandReady: Boolean(skoolPacket.afterSourceSession.command),
    }),
  )
  addCheck(
    checks,
    skoolBlocked.status === 'source_browser_fallback_retry_blocked_before_run' &&
      skoolBlocked.execution === null &&
      hasUnsafeSideEffect(skoolBlocked) === false,
    'session-bound fallback cannot run without explicit source-session proof',
    JSON.stringify({
      status: skoolBlocked.status,
      externalRunStarted: skoolBlocked.sideEffects?.externalRunStarted,
    }),
  )
  addCheck(
    checks,
    dryRun.status === 'source_browser_fallback_retry_dry_run' &&
      dryRun.execution === null &&
      dryRun.sideEffects?.externalRunStarted === false,
    'default fallback command is dry-run/no external action',
    dryRun.plainEnglish,
  )
  addCheck(
    checks,
    handoffSource.includes('buildSourceBrowserFallbackRetryPacket') &&
      handoffSource.includes('fallbackRetryPacket'),
    'YouTube handoff fallback review rows carry retry packets for the Dev page',
    'lib/source-god-mode-youtube-handoff.js',
  )

  const serialized = JSON.stringify({ publicPacket, cleanRetry, challengeAgain, skoolPacket, skoolBlocked, dryRun })
  addCheck(
    checks,
    !/(rawPassword|password"\s*:|"access_token"\s*:|"refresh_token"\s*:|"token"\s*:)/i.test(serialized),
    'fallback proof output contains no raw secret-like values',
    'raw secret scan clean',
  )

  const failed = checks.filter(check => !check.ok)
  const report = {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'healthy',
    scriptPath: SOURCE_BROWSER_FALLBACK_EXECUTOR_SCRIPT_PATH,
    version: SOURCE_BROWSER_FALLBACK_EXECUTOR_VERSION,
    checks,
    failed,
    readback: {
      publicPacketStatus: publicPacket.status,
      cleanRetryStatus: cleanRetry.status,
      challengeAgainStatus: challengeAgain.status,
      skoolPacketStatus: skoolPacket.status,
      dryRunStatus: dryRun.status,
    },
  }

  if (args.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log(`Source Browser fallback executor proof: ${report.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }
  if (!report.ok) process.exitCode = 1
}

main().catch(error => {
  console.error('Source Browser fallback executor proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
