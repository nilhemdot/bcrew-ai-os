#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  AIOS_PARALLEL_BUILDER_LANES_CARD_ID,
  AIOS_PARALLEL_BUILDER_LANES_PLAN_PATH,
  AIOS_PARALLEL_BUILDER_LANES_PROOF_COMMANDS,
  AIOS_PARALLEL_BUILDER_LANES_SCRIPT_PATH,
  buildParallelBuilderLanesDogfoodProof,
  buildParallelBuilderLanesSnapshot,
  evaluateParallelBuilderLanes,
} from '../lib/parallel-builder-lanes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false }
  for (const rawArg of argv) {
    const arg = String(rawArg || '')
    if (arg === '--json' || arg === '--json=true') args.json = true
  }
  return args
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [packageJson, moduleSource, scriptSource, planSource] = await Promise.all([
    readRepoFile('package.json').then(JSON.parse),
    readRepoFile('lib/parallel-builder-lanes.js'),
    readRepoFile(AIOS_PARALLEL_BUILDER_LANES_SCRIPT_PATH),
    readRepoFile(AIOS_PARALLEL_BUILDER_LANES_PLAN_PATH),
  ])

  const snapshot = buildParallelBuilderLanesSnapshot()
  const evaluation = evaluateParallelBuilderLanes(snapshot)
  const dogfood = buildParallelBuilderLanesDogfoodProof()
  const sourceBundle = `${moduleSource}\n${scriptSource}`
  const forbiddenRuntimePatterns = [
    { label: 'node:child_process import', pattern: /from\s+['"]node:child_process['"]/ },
    { label: 'child_process import', pattern: /from\s+['"]child_process['"]/ },
    { label: 'spawn call', pattern: /(?<!['"`])\bspawn\s*\(/ },
    { label: 'exec call', pattern: /(?<!['"`])\bexec\s*\(/ },
    { label: 'provider sdk import', pattern: /from\s+['"](?:openai|@anthropic-ai\/sdk|@google\/genai)['"]/ },
    { label: 'foundation job command', pattern: /npm\s+run\s+foundation:job/ },
    { label: 'commit CLI command', pattern: /git\s+commit\s+/ },
    { label: 'push CLI command', pattern: /git\s+push\s+/ },
  ]
  const foundForbiddenNeedles = forbiddenRuntimePatterns
    .filter(item => item.pattern.test(sourceBundle))
    .map(item => item.label)

  addCheck(checks, evaluation.ok, 'healthy lane snapshot passes', evaluation.violations.map(item => item.ruleId).join(', ') || evaluation.status)
  addCheck(checks, evaluation.summary.laneCount >= 4, 'snapshot exposes orchestrator plus builder lanes', String(evaluation.summary.laneCount))
  addCheck(checks, evaluation.summary.blockedLaneCount >= 1, 'blocked lane state is visible', String(evaluation.summary.blockedLaneCount))
  addCheck(checks, evaluation.summary.readyForReviewLaneCount >= 1, 'ready-for-review lane state is visible', String(evaluation.summary.readyForReviewLaneCount))
  addCheck(checks, evaluation.summary.integrationOwner === 'orchestrator', 'parent/orchestrator remains integration owner', evaluation.summary.integrationOwner)
  addCheck(checks, dogfood.ok, 'dogfood rejects unsafe lane shapes', dogfood.invariant)
  addCheck(checks, dogfood.overlappingOwnershipRejected, 'dogfood rejects overlapping active write ownership', 'fail-closed')
  addCheck(checks, dogfood.missingProofRejected, 'dogfood rejects lanes without proof commands', 'fail-closed')
  addCheck(checks, dogfood.blockedInvisibleRejected, 'dogfood rejects blocked lanes without blocker detail', 'fail-closed')
  addCheck(checks, dogfood.sideEffectsRejected, 'dogfood rejects auto-commit/push/external/runtime side effects', 'fail-closed')
  addCheck(checks, dogfood.wrongIntegrationOwnerRejected, 'dogfood rejects non-orchestrator integration owner', 'fail-closed')
  addCheck(
    checks,
    packageJson.scripts?.['process:parallel-builder-lanes-check'] === `node --env-file-if-exists=.env ${AIOS_PARALLEL_BUILDER_LANES_SCRIPT_PATH}`,
    'package exposes focused proof',
    packageJson.scripts?.['process:parallel-builder-lanes-check'] || 'missing',
  )
  addCheck(checks, planSource.includes(AIOS_PARALLEL_BUILDER_LANES_CARD_ID), 'plan doc names the card', AIOS_PARALLEL_BUILDER_LANES_PLAN_PATH)
  addCheck(checks, planSource.includes('does not launch real agents') && planSource.includes('report-only'), 'plan doc preserves no-launch report-only boundary', AIOS_PARALLEL_BUILDER_LANES_PLAN_PATH)
  addCheck(checks, AIOS_PARALLEL_BUILDER_LANES_PROOF_COMMANDS.includes('npm run process:parallel-builder-lanes-check -- --json'), 'proof command list includes focused proof', AIOS_PARALLEL_BUILDER_LANES_PROOF_COMMANDS.join('; '))
  addCheck(checks, foundForbiddenNeedles.length === 0, 'module and focused proof do not launch shells, providers, jobs, commits, or pushes', foundForbiddenNeedles.join(', ') || 'clean')

  const failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'fail' : 'pass',
    cardId: AIOS_PARALLEL_BUILDER_LANES_CARD_ID,
    checkCount: checks.length,
    failedCount: failed.length,
    summary: evaluation.summary,
    checks,
    failed,
  }

  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`Parallel builder lanes check: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }

  if (failed.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
