#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  closeFoundationDb,
  getBacklogItemsByIds,
  initFoundationDb,
} from '../lib/foundation-db.js'
import {
  SOURCE_BROWSER_BRAIN_ROUTE_POLICY_CARD_ID,
  SOURCE_BROWSER_BRAIN_ROUTE_POLICY_VERSION,
  buildSourceBrowserBrainRoutePolicyDogfood,
  buildSourceBrowserBrainRoutePolicySnapshot,
  evaluateSourceBrowserBrainRoutePolicy,
} from '../lib/source-browser-brain-route-policy.js'
import {
  buildSourceBrowserAgentCrawlItemInput,
  planSourceBrowserAgentRun,
} from '../lib/source-browser-agent-harness.js'
import {
  buildSourceBrowserRunSummary,
} from '../lib/dev-source-run-readback.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const SCRIPT_PATH = 'scripts/process-source-browser-brain-route-policy-check.mjs'
const PLAN_PATH = 'docs/process/source-browser-brain-route-policy-001-plan.md'

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

function includesAll(source = '', markers = []) {
  return markers.every(marker => String(source || '').includes(marker))
}

function sourceContainsRawSecretLeak(source = '') {
  return [
    /console\.log\s*\([^)]*(password|secret|token|api[_-]?key)/i,
    /process\.env\.[A-Z0-9_]*(PASSWORD|SECRET|TOKEN|API_KEY)[^|&?\n]*/i,
    /writeFile\s*\([^)]*(password|secret|token|api[_-]?key)/i,
  ].some(pattern => pattern.test(source))
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    packageJson,
    policySource,
    harnessSource,
    readbackSource,
    devPageSource,
    sourceNote,
    planSource,
    seedSource,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/source-browser-brain-route-policy.js'),
    readRepoFile('lib/source-browser-agent-harness.js'),
    readRepoFile('lib/dev-source-run-readback.js'),
    readRepoFile('public/dev.js'),
    readRepoFile('docs/source-notes/source-browser-agent-protocol-scope-2026-05-28.md'),
    readRepoFile(PLAN_PATH),
    readRepoFile('lib/foundation-backlog-seed-chunks/chunk-005.js'),
  ])

  await initFoundationDb()
  let liveCard = null
  try {
    const [row] = await getBacklogItemsByIds([SOURCE_BROWSER_BRAIN_ROUTE_POLICY_CARD_ID])
    liveCard = row || null
  } finally {
    await closeFoundationDb().catch(() => {})
  }

  const snapshot = buildSourceBrowserBrainRoutePolicySnapshot()
  const evaluation = evaluateSourceBrowserBrainRoutePolicy(snapshot)
  const dogfood = buildSourceBrowserBrainRoutePolicyDogfood()
  const challengePlan = planSourceBrowserAgentRun({
    packet: {
      sourceId: 'fixture-challenge',
      url: 'https://challenge.example.com',
      sourceType: 'public_or_free_source',
      title: 'Challenge page',
    },
    observation: {
      url: 'https://challenge.example.com',
      title: 'Just a moment...',
      bodyTextPreview: 'Checking your browser before accessing this source.',
      textChars: 52,
    },
    now: '2026-05-29T04:00:00.000Z',
  })
  const readback = buildSourceBrowserRunSummary([
    buildSourceBrowserAgentCrawlItemInput(challengePlan, {
      batchRunId: 'source-browser-brain-route-policy-dogfood',
      capturedAt: '2026-05-29T04:00:00.000Z',
    }),
  ])
  const agentReadback = readback.sourceBrowserAgentReadback || {}

  addCheck(
    checks,
    packageJson.scripts?.['process:source-browser-brain-route-policy-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`,
    'package exposes focused source-browser brain route policy proof',
    packageJson.scripts?.['process:source-browser-brain-route-policy-check'] || 'missing',
  )
  addCheck(
    checks,
    evaluation.ok,
    'route policy declares required route order and fail-closed guardrails',
    evaluation.findings.map(item => `${item.check}:${item.detail}`).join(', ') || 'ok',
  )
  addCheck(
    checks,
    dogfood.ok,
    'dogfood proves deterministic, local hands, source-session, API model, hosted-browser block, and blocked action routing',
    dogfood.cases.filter(testCase => !testCase.ok).map(testCase => `${testCase.name}:${testCase.routeId}/${testCase.status}`).join(', ') || 'all dogfood cases passed',
  )
  addCheck(
    checks,
    dogfood.cases.some(testCase => testCase.name === 'subscription_label_blocks_before_stagehand' && testCase.ok) &&
      dogfood.cases.some(testCase => testCase.name === 'hosted_browser_blocks_even_when_requested' && testCase.ok) &&
      dogfood.cases.some(testCase => testCase.name === 'stale_browserbase_bakeoff_flag_still_blocks' && testCase.ok),
    'policy blocks subscription-label Stagehand routes and blocks hosted Browserbase even if stale flags exist',
    dogfood.cases.map(testCase => `${testCase.name}:${testCase.routeId}`).join(', '),
  )
  addCheck(
    checks,
    challengePlan.brainRoute?.routeId === 'local_self_recovery_then_harlan' &&
      challengePlan.brainRoute?.normalChromeProfileAllowed === false &&
      challengePlan.brainRoute?.sendsHarlanNow === false,
    'Source Browser Agent plans include brain route before browser challenge recovery',
    JSON.stringify(challengePlan.brainRoute || {}),
  )
  addCheck(
    checks,
    agentReadback.brainRouteCounts?.local_self_recovery_then_harlan === 1 &&
      agentReadback.topPlans?.[0]?.brainRoute === 'local_self_recovery_then_harlan',
    'source-run readback exposes brain route counts and top-plan route',
    JSON.stringify({ brainRouteCounts: agentReadback.brainRouteCounts, topPlan: agentReadback.topPlans?.[0] || null }),
  )
  addCheck(
    checks,
    Boolean(liveCard) &&
      liveCard.priority === 'P0' &&
      liveCard.lane !== 'done' &&
      includesAll(`${liveCard.nextAction || ''} ${liveCard.statusNote || ''} ${liveCard.summary || ''}`, [
        'deterministic',
        'Hosted',
        'Harlan',
      ]),
    'live backlog card exists and keeps brain route policy open as P0 scoped work',
    liveCard ? `${liveCard.id}/${liveCard.lane}/${liveCard.priority}` : 'missing',
  )
  addCheck(
    checks,
    seedSource.includes(SOURCE_BROWSER_BRAIN_ROUTE_POLICY_CARD_ID) &&
      seedSource.includes('browser brain route policy'),
    'seed backlog contains durable brain route policy card truth',
    'lib/foundation-backlog-seed-chunks/chunk-005.js',
  )
  addCheck(
    checks,
    includesAll(policySource, [
      'deterministic_public_source_worker',
      'local_hands_source_specific_runner',
      'source_session_broker_harlan_auth',
      'stagehand_local_api_brain',
      'blocked_hosted_browser_not_approved_for_sprint',
      'blocked_unsupported_model_route',
      'browserbase_parked_outside_human_web_agent_v1',
    ]),
    'policy source covers all approved source-browser brain routes',
    'lib/source-browser-brain-route-policy.js',
  )
  addCheck(
    checks,
    harnessSource.includes('selectSourceBrowserBrainRoute') &&
      harnessSource.includes('brainRoutePolicy') &&
      harnessSource.includes('SOURCE_BROWSER_BRAIN_ROUTE_POLICY_CARD_ID'),
    'Source Browser Agent harness records selected brain route before runner execution',
    'lib/source-browser-agent-harness.js',
  )
  addCheck(
    checks,
    readbackSource.includes('brainRouteCounts') &&
      readbackSource.includes('selectedBrain'),
    'Dev source-run readback can summarize brain routes',
    'lib/dev-source-run-readback.js',
  )
  addCheck(
    checks,
    devPageSource.includes('brainRouteSummary') &&
      devPageSource.includes('Brain routes:') &&
      devPageSource.includes('plan.selectedBrain'),
    'Dev page can render brain-route summary and selected brain on source-browser rows',
    'public/dev.js',
  )
  addCheck(
    checks,
    includesAll(planSource, [
      SOURCE_BROWSER_BRAIN_ROUTE_POLICY_CARD_ID,
      'deterministic worker first',
      'local virtual browser hands',
      'Source Session Broker',
      'Browserbase parked',
      'unsupported subscription-style',
    ]),
    'plan documents route order, cost posture, and subscription/API boundary',
    PLAN_PATH,
  )
  addCheck(
    checks,
    sourceNote.includes('brain route policy') &&
      sourceNote.includes('deterministic worker first') &&
      sourceNote.includes('Browserbase is parked'),
    'source note documents the route policy in the source-browser protocol',
    'docs/source-notes/source-browser-agent-protocol-scope-2026-05-28.md',
  )
  addCheck(
    checks,
    sourceContainsRawSecretLeak(`${policySource}\n${harnessSource}\n${readbackSource}\n${devPageSource}`) === false,
    'policy, harness, and readback do not print or persist raw secrets',
    'metadata-only route decisions',
  )

  const failed = checks.filter(check => !check.ok)
  const report = {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'healthy',
    cardId: SOURCE_BROWSER_BRAIN_ROUTE_POLICY_CARD_ID,
    version: SOURCE_BROWSER_BRAIN_ROUTE_POLICY_VERSION,
    dogfoodCases: dogfood.cases,
    readback: agentReadback,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log(`Source browser brain route policy proof: ${report.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }
  process.exitCode = report.ok ? 0 : 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error('Source browser brain route policy proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
