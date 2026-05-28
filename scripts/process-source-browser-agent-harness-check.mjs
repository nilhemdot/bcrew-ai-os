#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  SOURCE_BROWSER_AGENT_CARD_ID,
  SOURCE_BROWSER_AGENT_SCRIPT_PATH,
  buildSourceBrowserAgentCrawlItemInput,
  buildSourceBrowserAgentDogfoodProof,
  buildSourceBrowserAgentHarnessSnapshot,
  evaluateSourceBrowserAgentHarness,
} from '../lib/source-browser-agent-harness.js'
import {
  buildSourceBrowserRunSummary,
} from '../lib/dev-source-run-readback.js'

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
  const dogfoodReadbackItems = [
    dogfood.reports.publicPlan,
    dogfood.reports.repoPlan,
    dogfood.reports.newsletterPlan,
    dogfood.reports.skoolNeedsSession,
    dogfood.reports.skoolReady,
    dogfood.reports.myicorMfa,
    dogfood.reports.myicorWrongSignup,
    dogfood.reports.badBrowserState,
    dogfood.reports.browserChallengeState,
  ].map((plan, index) => buildSourceBrowserAgentCrawlItemInput(plan, {
    batchRunId: 'source-browser-agent-harness-dogfood',
    capturedAt: `2026-05-28T13:${String(index).padStart(2, '0')}:30.000Z`,
  }))
  const dogfoodReadback = buildSourceBrowserRunSummary(dogfoodReadbackItems)
  const agentReadback = dogfoodReadback.sourceBrowserAgentReadback || {}

  addCheck(
    checks,
    packageJson.scripts?.['process:source-browser-agent-harness-check'] === `node --env-file-if-exists=.env ${SOURCE_BROWSER_AGENT_SCRIPT_PATH}`,
    'package exposes focused Source Browser Agent harness proof',
    packageJson.scripts?.['process:source-browser-agent-harness-check'] || 'missing',
  )
  addCheck(
    checks,
    packageJson.scripts?.['source:browser-agent'] === 'node --env-file-if-exists=.env scripts/run-source-browser-agent.mjs' &&
      /planSourceBrowserAgentRun/.test(runnerSource) &&
      /buildSourceBrowserAgentCrawlItemInput/.test(runnerSource),
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
    dogfood.reports.browserChallengeState.terminalState === 'failed_closed' &&
      dogfood.reports.browserChallengeState.fallbackPlan?.status === 'browser_challenge_fallback_required' &&
      dogfood.reports.browserChallengeState.fallbackPlan?.route === 'source_specific_session_then_hosted_browser_fallback' &&
      dogfood.reports.browserChallengeState.fallbackPlan?.normalChromeProfileAllowed === false &&
      dogfood.reports.browserChallengeState.fallbackPlan?.recoveryPolicy?.mode === 'bounded_self_recovery_then_human_escalation' &&
      dogfood.reports.browserChallengeState.fallbackPlan?.recoveryPolicy?.humanEscalation?.channel === 'operator_ai_assistant_texting_lane' &&
      dogfood.reports.browserChallengeState.fallbackPlan?.recoveryPolicy?.humanEscalation?.sendsMessageNow === false,
    'browser challenge pages get a structured fallback plan instead of a generic stop',
    JSON.stringify(dogfood.reports.browserChallengeState.fallbackPlan || {}),
  )
  addCheck(
    checks,
    dogfoodReadback.status === 'ready' &&
      agentReadback.status === 'ready' &&
      Number(agentReadback.planCount || 0) === dogfoodReadbackItems.length &&
      Number(agentReadback.readyPlanCount || 0) >= 3 &&
      Number(agentReadback.authNeededCount || 0) >= 2 &&
      Number(agentReadback.failedClosedCount || 0) >= 2 &&
      Number(agentReadback.unsafeSideEffectRows || 0) === 0 &&
      agentReadback.routeCounts?.['source:god-mode'] >= 1 &&
      agentReadback.routeCounts?.['repo:deep-review'] >= 1 &&
      agentReadback.routeCounts?.['skool:free-god-mode'] >= 1,
    'agent plans serialize into source-run readback with route, auth-needed, failed-closed, and side-effect truth',
    JSON.stringify({
      plans: agentReadback.planCount,
      routes: agentReadback.routeCounts,
      states: agentReadback.terminalStateCounts,
      unsafe: agentReadback.unsafeSideEffectRows,
    }),
  )
  addCheck(
    checks,
    dogfoodReadback.bucketSummaries?.some(row => row.bucketId === 'public-code-repos') &&
      dogfoodReadback.bucketSummaries?.some(row => row.bucketId === 'free-communities') &&
      dogfoodReadback.bucketSummaries?.some(row => row.bucketId === 'creator-newsletters') &&
      dogfoodReadback.bucketSummaries?.some(row => row.bucketId === 'paid-auth-gates'),
    'agent crawl items land in the same source-browser buckets the Dev page already renders',
    dogfoodReadback.bucketSummaries?.map(row => `${row.bucketId}:${row.runs}`).join(', ') || 'missing buckets',
  )
  addCheck(
    checks,
    containsAll(harnessSource, [
      'source:god-mode',
      'repo:deep-review',
      'newsletter:intake',
      'skool:free-god-mode',
      'source-session-broker',
      'buildSourceBrowserAgentCrawlItemInput',
      'sourceBrowserAgentPlan',
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
