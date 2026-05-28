#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  SOURCE_BROWSER_AGENT_CARD_ID,
  SOURCE_BROWSER_AGENT_SCRIPT_PATH,
  buildSourceBrowserAgentDogfoodProof,
  buildSourceBrowserAgentHarnessSnapshot,
  evaluateSourceBrowserAgentHarness,
} from '../lib/source-browser-agent-harness.js'

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

function containsAll(source = '', markers = []) {
  return markers.every(marker => String(source || '').includes(marker))
}

function sourceContainsRawSecretLeak(source = '') {
  return [
    /console\.log\s*\([^)]*(password|secret|token|api[_-]?key)/i,
    /process\.env\.[A-Z0-9_]*(PASSWORD|SECRET|TOKEN|API_KEY)[^|&?\n]*/i,
    /writeFile\s*\([^)]*(password|secret|token|api[_-]?key)/i,
    /localStorage\.setItem\s*\([^)]*(password|secret|token|api[_-]?key)/i,
  ].some(pattern => pattern.test(source))
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    packageJson,
    harnessSource,
    runnerSource,
    sourceNote,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/source-browser-agent-harness.js'),
    readRepoFile('scripts/run-source-browser-agent.mjs'),
    readRepoFile('docs/source-notes/source-browser-agent-protocol-scope-2026-05-28.md'),
  ])

  const snapshot = buildSourceBrowserAgentHarnessSnapshot()
  const evaluation = evaluateSourceBrowserAgentHarness(snapshot)
  const dogfood = buildSourceBrowserAgentDogfoodProof()

  addCheck(
    checks,
    packageJson.scripts?.['process:source-browser-agent-harness-check'] === `node --env-file-if-exists=.env ${SOURCE_BROWSER_AGENT_SCRIPT_PATH}`,
    'package exposes focused Source Browser Agent harness proof',
    packageJson.scripts?.['process:source-browser-agent-harness-check'] || 'missing',
  )
  addCheck(
    checks,
    packageJson.scripts?.['source:browser-agent'] === 'node --env-file-if-exists=.env scripts/run-source-browser-agent.mjs' &&
      /planSourceBrowserAgentRun/.test(runnerSource),
    'source:browser-agent entrypoint uses the agent harness',
    packageJson.scripts?.['source:browser-agent'] || 'missing',
  )
  addCheck(
    checks,
    evaluation.ok,
    'harness declares protocol refs, state machine, source tools, session broker, and fail-closed boundaries',
    evaluation.findings.map(item => `${item.check}:${item.detail}`).join(', ') || 'ok',
  )
  addCheck(
    checks,
    snapshot.registryOverlayEvaluation?.ok === true,
    'Source Browser Agent validates as an overlay under the existing agent capability registry',
    snapshot.registryOverlayEvaluation?.violations?.map(item => item.ruleId).join(', ') || 'ok',
  )
  addCheck(
    checks,
    dogfood.ok,
    'dogfood routes public, repo, newsletter, free Skool, MyICOR, browser-state, and dangerous-action cases correctly',
    dogfood.cases.filter(testCase => !testCase.ok).map(testCase => `${testCase.name}:${testCase.status}`).join(', ') || 'all dogfood cases passed',
  )
  addCheck(
    checks,
    dogfood.reports.publicPlan.runnerCommand?.packageScript === 'source:god-mode' &&
      dogfood.reports.repoPlan.runnerCommand?.packageScript === 'repo:deep-review' &&
      dogfood.reports.skoolReady.runnerCommand?.packageScript === 'skool:free-god-mode',
    'harness selects the existing source runners instead of inventing parallel tools',
    [
      dogfood.reports.publicPlan.runnerCommand?.packageScript,
      dogfood.reports.repoPlan.runnerCommand?.packageScript,
      dogfood.reports.skoolReady.runnerCommand?.packageScript,
    ].filter(Boolean).join(', '),
  )
  addCheck(
    checks,
    dogfood.reports.newsletterPlan.terminalState === 'parked' &&
      dogfood.reports.newsletterPlan.sideEffects.submittedForm === false,
    'newsletter signup defaults to no-submit intake until source identity flow explicitly enables signup',
    `${dogfood.reports.newsletterPlan.status}:${dogfood.reports.newsletterPlan.terminalState}`,
  )
  addCheck(
    checks,
    dogfood.reports.myicorMfa.terminalState === 'waiting_auth' &&
      dogfood.reports.myicorMfa.authEvent?.eventType === 'auth_needed' &&
      dogfood.reports.myicorWrongSignup.terminalState === 'failed_closed',
    'MyICOR routes through Google SSO auth-needed and fails closed on wrong signup branch',
    `${dogfood.reports.myicorMfa.status}; ${dogfood.reports.myicorWrongSignup.status}`,
  )
  addCheck(
    checks,
    dogfood.reports.badBrowserState.terminalState === 'failed_closed' &&
      dogfood.reports.badBrowserState.stopReason === 'browser_state_blocked',
    'blank or browser-control pages cannot produce false green source extraction',
    dogfood.reports.badBrowserState.status,
  )
  addCheck(
    checks,
    containsAll(harnessSource, [
      'source:god-mode',
      'repo:deep-review',
      'newsletter:intake',
      'skool:free-god-mode',
      'source-session-broker',
      'evaluateSourceBrowserPageHealth',
      'evaluateSourceSessionBrokerRequest',
    ]),
    'harness source uses existing runners, page-health guard, and source-session broker',
    'lib/source-browser-agent-harness.js',
  )
  addCheck(
    checks,
    sourceContainsRawSecretLeak(harnessSource) === false && sourceContainsRawSecretLeak(runnerSource) === false,
    'harness and CLI do not print or persist raw secrets',
    'metadata-only secret posture',
  )
  addCheck(
    checks,
    containsAll(sourceNote, [
      'Source Browser Agent harness',
      'queued, preparing_session, observing, planning, acting, extracting, evaluating, recording, waiting_auth, blocked, completed, failed_closed, parked',
      'source:god-mode',
      'repo:deep-review',
      'skool:free-god-mode',
      'Newsletter intake',
      'Source Session Broker',
    ]),
    'source note documents the same harness and build order Steve approved',
    'docs/source-notes/source-browser-agent-protocol-scope-2026-05-28.md',
  )

  const failed = checks.filter(check => !check.ok)
  const report = {
    ok: failed.length === 0,
    cardId: SOURCE_BROWSER_AGENT_CARD_ID,
    scriptPath: SOURCE_BROWSER_AGENT_SCRIPT_PATH,
    checks,
    failedChecks: failed,
    dogfoodCases: dogfood.cases,
  }

  if (args.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log(`Source Browser Agent harness proof: ${report.ok ? 'PASS' : 'FAIL'}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` - ${check.detail}` : ''}`)
    }
  }

  if (!report.ok) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
