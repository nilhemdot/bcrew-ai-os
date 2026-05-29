#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  BROWSERBASE_ONE_MONTH_BAKEOFF_CARD_ID,
  BROWSERBASE_ONE_MONTH_BAKEOFF_PLAN_PATH,
  BROWSERBASE_ONE_MONTH_BAKEOFF_SCRIPT_PATH,
  buildBrowserbaseOneMonthBakeoffDogfoodProof,
  buildBrowserbaseOneMonthBakeoffSnapshot,
} from '../lib/browserbase-one-month-bakeoff.js'

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

function list(value) {
  return Array.isArray(value) ? value : []
}

function sourceContainsRawSecretLeak(source = '') {
  return [
    /console\.log\s*\([^)]*(password|secret|token|api[_-]?key)/i,
    /writeFile\s*\([^)]*(password|secret|token|api[_-]?key)/i,
    /process\.env\.BROWSERBASE_API_KEY[^?]/,
    /process\.env\.BROWSERBASE_PROJECT_ID[^?]/,
  ].some(pattern => pattern.test(source))
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    packageJson,
    planSource,
    moduleSource,
    scriptSource,
    runtimeSource,
    routePolicySource,
    checkpointSource,
    sourceNote,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile(BROWSERBASE_ONE_MONTH_BAKEOFF_PLAN_PATH),
    readRepoFile('lib/browserbase-one-month-bakeoff.js'),
    readRepoFile(BROWSERBASE_ONE_MONTH_BAKEOFF_SCRIPT_PATH),
    readRepoFile('lib/source-agentic-browser-runtime.js'),
    readRepoFile('lib/source-browser-brain-route-policy.js'),
    readRepoFile('docs/handoffs/2026-05-28-source-browser-cost-virtual-desktop-checkpoint.md'),
    readRepoFile('docs/source-notes/source-browser-agent-protocol-scope-2026-05-28.md'),
  ])
  const lowerPlanSource = planSource.toLowerCase()
  const lowerCheckpointSource = checkpointSource.toLowerCase()
  const lowerSourceNote = sourceNote.toLowerCase()

  const liveSnapshot = buildBrowserbaseOneMonthBakeoffSnapshot()
  const dogfood = buildBrowserbaseOneMonthBakeoffDogfoodProof()
  const readyDogfood = dogfood.snapshots.readyTiny

  addCheck(
    checks,
    packageJson.scripts?.['process:browserbase-one-month-bakeoff-check'] === `node --env-file-if-exists=.env ${BROWSERBASE_ONE_MONTH_BAKEOFF_SCRIPT_PATH}`,
    'package exposes focused Browserbase one-month bakeoff proof',
    packageJson.scripts?.['process:browserbase-one-month-bakeoff-check'] || 'missing',
  )
  addCheck(
    checks,
    lowerPlanSource.includes('browserbase stays bakeoff-only') &&
      lowerPlanSource.includes('do not renew') &&
      lowerPlanSource.includes('no live browserbase run'),
    'plan documents bakeoff-only posture and renewal boundary',
    BROWSERBASE_ONE_MONTH_BAKEOFF_PLAN_PATH,
  )
  addCheck(
    checks,
    moduleSource.includes('buildSourceAgenticBrowserCostPolicy') &&
      moduleSource.includes('browserbaseDefault: false') &&
      moduleSource.includes('liveRunStarted: false') &&
      moduleSource.includes('BROWSERBASE_ONE_MONTH_BAKEOFF_MAX_BROWSER_MINUTES_PER_TASK'),
    'module builds measured Browserbase bakeoff readback without starting a browser run',
    'lib/browserbase-one-month-bakeoff.js',
  )
  addCheck(
    checks,
    dogfood.ok === true,
    'dogfood proves no-approval block, missing-credential block, tiny approved ready state, broad block, and task catalog',
    dogfood.cases.filter(testCase => !testCase.ok).map(testCase => testCase.name).join(', ') || 'all dogfood cases passed',
  )
  addCheck(
    checks,
    liveSnapshot.reportOnly === true &&
      liveSnapshot.liveRunStarted === false &&
      liveSnapshot.browserbaseDefault === false &&
      liveSnapshot.broadRunAllowed === false,
    'live readback is report-only and cannot turn Browserbase on from env alone',
    liveSnapshot.status,
  )
  addCheck(
    checks,
    readyDogfood.status === 'ready_for_tiny_browserbase_bakeoff' &&
      readyDogfood.summary.maxBrowserMinutesTotal <= 12 &&
      readyDogfood.summary.maxModelCallsTotal <= 48 &&
      readyDogfood.tasks.every(task => task.runCommand.includes('--allowBrowserbase') && task.runCommand.includes('--browserbaseBakeoffApproved')),
    'approved bakeoff is capped to tiny one-task-at-a-time comparison commands',
    JSON.stringify(readyDogfood.summary),
  )
  addCheck(
    checks,
    ['public_page', 'public_repo', 'newsletter_page', 'free_community_public_bridge', 'myicor_auth_needed', 'browser_challenge']
      .every(taskId => readyDogfood.tasks.some(task => task.taskId === taskId)),
    'task catalog covers public page, repo, newsletter, free community, MyICOR auth-needed, and browser challenge surfaces',
    list(readyDogfood.tasks).map(task => task.taskId).join(', '),
  )
  addCheck(
    checks,
    runtimeSource.includes("process.env.SOURCE_AGENTIC_BROWSER_ENV || 'LOCAL'") &&
      routePolicySource.includes('browserbaseBakeoffApproved') &&
      lowerCheckpointSource.includes('browserbase') &&
      lowerCheckpointSource.includes('measured') &&
      (lowerCheckpointSource.includes('proof-only') || lowerCheckpointSource.includes('bakeoff')) &&
      lowerSourceNote.includes('browserbase') &&
      (lowerSourceNote.includes('bakeoff only') || lowerSourceNote.includes('bakeoff-only')) &&
      lowerSourceNote.includes('explicitly approved'),
    'bakeoff proof is aligned with existing runtime cost guardrails and brain route policy',
    'runtime + route policy + checkpoint + source note',
  )
  addCheck(
    checks,
    sourceContainsRawSecretLeak(`${moduleSource}\n${scriptSource}`) === false &&
      liveSnapshot.credentials.secretValuesReturned === false &&
      liveSnapshot.credentials.rawSecretPrinted === false,
    'bakeoff proof never prints Browserbase API key or project id values',
    liveSnapshot.credentials.status,
  )
  addCheck(
    checks,
    list(readyDogfood.notAllowed).some(item => item.includes('no broad Browserbase extraction')) &&
      list(readyDogfood.tasks).every(task =>
        task.externalActionsAllowed === false &&
        task.normalChromeProfileAllowed === false &&
        task.rawSecretsVisible === false &&
        task.autoScoperPromotion === false
      ),
    'task contracts forbid broad extraction, normal Chrome, external actions, raw secrets, and Scoper promotion',
    `${readyDogfood.tasks.length} tasks`,
  )

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'healthy',
    cardId: BROWSERBASE_ONE_MONTH_BAKEOFF_CARD_ID,
    checks,
    failed,
    liveSnapshot,
    dogfoodCases: dogfood.cases,
  }
  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Browserbase One-Month Bakeoff: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  }
  process.exitCode = failed.length ? 1 : 0
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
