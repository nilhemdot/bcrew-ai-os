#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  SOURCE_AGENTIC_BROWSER_CARD_ID,
  SOURCE_AGENTIC_BROWSER_STAGEHAND_PROOF_MODEL,
  SOURCE_AGENTIC_BROWSER_STAGEHAND_PROOF_ROUTE_KEY,
  SOURCE_AGENTIC_BROWSER_UNSUPPORTED_SUBSCRIPTION_ROUTE_MODEL,
  buildSourceAgenticBrowserCostGuardrailDogfood,
  buildSourceAgenticBrowserCostPolicy,
} from '../lib/source-agentic-browser-runtime.js'
import {
  buildRuntimeModelLiteralPolicyFindingInput,
} from '../lib/llm-runtime-model-literal-policy.js'
import {
  DEFAULT_LLM_ROUTES,
} from '../lib/llm-router.js'

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

function sourceContainsRawSecretLeak(source = '') {
  return [
    /console\.log\s*\([^)]*(password|secret|token|api[_-]?key)/i,
    /writeFile\s*\([^)]*(password|secret|token|api[_-]?key)/i,
  ].some(pattern => pattern.test(source))
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [packageJson, runtimeSource, runnerSource, checkpointSource, llmRouterSource] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/source-agentic-browser-runtime.js'),
    readRepoFile('scripts/run-source-agentic-browser.mjs'),
    readRepoFile('docs/handoffs/2026-05-28-source-browser-cost-virtual-desktop-checkpoint.md'),
    readRepoFile('lib/llm-router.js'),
  ])
  const dogfood = buildSourceAgenticBrowserCostGuardrailDogfood()
  const stagehandProofRoute = DEFAULT_LLM_ROUTES.find(route => route.routeKey === SOURCE_AGENTIC_BROWSER_STAGEHAND_PROOF_ROUTE_KEY)
  const defaultPolicy = buildSourceAgenticBrowserCostPolicy({
    model: SOURCE_AGENTIC_BROWSER_STAGEHAND_PROOF_MODEL,
    maxSteps: 1,
    runAgent: false,
  })
  const browserbasePolicy = buildSourceAgenticBrowserCostPolicy({
    env: 'BROWSERBASE',
    model: SOURCE_AGENTIC_BROWSER_STAGEHAND_PROOF_MODEL,
    maxSteps: 1,
    runAgent: false,
  })
  const codexPolicy = buildSourceAgenticBrowserCostPolicy({
    env: 'LOCAL',
    model: SOURCE_AGENTIC_BROWSER_UNSUPPORTED_SUBSCRIPTION_ROUTE_MODEL,
    maxSteps: 1,
    runAgent: false,
  })

  addCheck(
    checks,
    packageJson.scripts?.['process:source-browser-runtime-cost-guardrails-check'] === 'node --env-file-if-exists=.env scripts/process-source-browser-runtime-cost-guardrails-check.mjs',
    'package exposes focused source-browser runtime cost guardrail proof',
    packageJson.scripts?.['process:source-browser-runtime-cost-guardrails-check'] || 'missing',
  )
  addCheck(
    checks,
    packageJson.scripts?.['source:agentic-browser'] === 'node --env-file-if-exists=.env scripts/run-source-agentic-browser.mjs' &&
      runnerSource.includes('--allowBrowserbase') &&
      runnerSource.includes('--budgetApproved') &&
      runnerSource.includes('--maxEstimatedModelCalls='),
    'source:agentic-browser CLI exposes explicit Browserbase and model-call budget flags',
    packageJson.scripts?.['source:agentic-browser'] || 'missing',
  )
  addCheck(
    checks,
    runtimeSource.includes("process.env.SOURCE_AGENTIC_BROWSER_ENV || 'LOCAL'") &&
      !runtimeSource.includes("process.env.BROWSERBASE_API_KEY && process.env.BROWSERBASE_PROJECT_ID ? 'BROWSERBASE' : 'LOCAL'"),
    'Stagehand runtime defaults to LOCAL instead of Browserbase when keys exist',
    'lib/source-agentic-browser-runtime.js',
  )
  addCheck(
    checks,
    dogfood.ok,
    'dogfood proves Browserbase opt-in, unsupported model block, proof caps, and tiny bakeoff allowance',
    dogfood.cases.filter(testCase => !testCase.ok).map(testCase => `${testCase.name}:${testCase.status}`).join(', ') || 'all guardrail cases passed',
  )
  addCheck(
    checks,
    SOURCE_AGENTIC_BROWSER_STAGEHAND_PROOF_MODEL &&
      stagehandProofRoute?.provider &&
      stagehandProofRoute?.model &&
      `${stagehandProofRoute.provider}/${stagehandProofRoute.model}` === SOURCE_AGENTIC_BROWSER_STAGEHAND_PROOF_MODEL &&
      runtimeSource.includes(SOURCE_AGENTIC_BROWSER_STAGEHAND_PROOF_ROUTE_KEY) &&
      llmRouterSource.includes('DEFAULT_SOURCE_AGENTIC_BROWSER_STAGEHAND_MODEL'),
    'Stagehand proof model is read from the LLM router-owned route key',
    `${SOURCE_AGENTIC_BROWSER_STAGEHAND_PROOF_ROUTE_KEY} -> ${SOURCE_AGENTIC_BROWSER_STAGEHAND_PROOF_MODEL}`,
  )
  addCheck(
    checks,
    buildRuntimeModelLiteralPolicyFindingInput({
      relativePath: 'scripts/process-source-browser-runtime-cost-guardrails-check.mjs',
      text: await readRepoFile('scripts/process-source-browser-runtime-cost-guardrails-check.mjs'),
    }).risk === false,
    'cost guardrail proof script does not own exact runtime model literals',
    'model route imported from source-agentic browser runtime/LLM router',
  )
  addCheck(
    checks,
    defaultPolicy.ok === true &&
      defaultPolicy.env === 'LOCAL' &&
      defaultPolicy.browserHoursMetered === false &&
      defaultPolicy.modelCallsMetered === true,
    'default proof policy uses local browser mode and still accounts for model calls',
    JSON.stringify({
      env: defaultPolicy.env,
      browserHoursMetered: defaultPolicy.browserHoursMetered,
      modelCallsMetered: defaultPolicy.modelCallsMetered,
    }),
  )
  addCheck(
    checks,
    browserbasePolicy.ok === false &&
      browserbasePolicy.findings.some(finding => finding.check === 'browserbase_requires_explicit_allow_flag'),
    'Browserbase cannot run from env keys alone',
    JSON.stringify(browserbasePolicy.findings),
  )
  addCheck(
    checks,
    codexPolicy.ok === false &&
      codexPolicy.findings.some(finding => finding.status === 'blocked_unsupported_stagehand_model_route'),
    'Stagehand blocks subscription-style codex/claude routes before provider spend starts',
    JSON.stringify(codexPolicy.findings),
  )
  addCheck(
    checks,
    checkpointSource.includes('Browserbase browser hours and model/API token spend are separate') &&
      checkpointSource.includes('Browserbase Startup stays proof-only'),
    'checkpoint documents browser-hour spend and model/API token spend as separate risks',
    'docs/handoffs/2026-05-28-source-browser-cost-virtual-desktop-checkpoint.md',
  )
  addCheck(
    checks,
    sourceContainsRawSecretLeak(runtimeSource) === false &&
      sourceContainsRawSecretLeak(runnerSource) === false,
    'guardrail runtime and CLI do not print raw secrets',
    'metadata-only env presence checks',
  )

  const failed = checks.filter(check => !check.ok)
  const report = {
    ok: failed.length === 0,
    cardId: SOURCE_AGENTIC_BROWSER_CARD_ID,
    status: failed.length ? 'blocked' : 'healthy',
    checks,
    failedChecks: failed,
    dogfoodCases: dogfood.cases,
  }
  if (args.json) {
    console.log(JSON.stringify(report, null, 2))
    process.exitCode = report.ok ? 0 : 1
    return
  }
  if (!report.ok) {
    console.error(`Source browser runtime cost guardrail check failed: ${failed.length}`)
    for (const check of failed) console.error(`- ${check.check}: ${check.detail}`)
    process.exitCode = 1
    return
  }
  console.log('Source browser runtime cost guardrail check passed.')
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
