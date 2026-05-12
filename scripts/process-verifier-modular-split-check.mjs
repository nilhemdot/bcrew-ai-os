#!/usr/bin/env node

import fs from 'node:fs/promises'
import process from 'node:process'
import { buildSyntheticSprintProofModuleStatus } from '../lib/foundation-verifier-sprint-proof.js'

const args = new Set(process.argv.slice(2))
const jsonMode = args.has('--json') || args.has('--json=true')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function readFile(path) {
  return fs.readFile(path, 'utf8')
}

async function main() {
  const startedAt = Date.now()
  const [
    packageSource,
    verifierSource,
    moduleSource,
    planSource,
  ] = await Promise.all([
    readFile('package.json'),
    readFile('scripts/foundation-verify.mjs'),
    readFile('lib/foundation-verifier-sprint-proof.js'),
    readFile('docs/process/verifier-modular-split-001-plan.md'),
  ])
  const packageJson = JSON.parse(packageSource)
  const synthetic = buildSyntheticSprintProofModuleStatus()

  const checks = [
    {
      check: 'synthetic sprint proof module behavior passes',
      ok: synthetic.ok,
      detail: synthetic.cases.map(testCase => `${testCase.ok ? 'pass' : 'fail'}:${testCase.name}`).join(', '),
    },
    {
      check: 'package exposes focused verifier modular split proof',
      ok: packageJson.scripts?.['process:verifier-modular-split-check'] === 'node --env-file-if-exists=.env scripts/process-verifier-modular-split-check.mjs',
      detail: packageJson.scripts?.['process:verifier-modular-split-check'] || 'missing',
    },
    {
      check: 'foundation verifier imports the sprint proof module',
      ok: verifierSource.includes("from '../lib/foundation-verifier-sprint-proof.js'") &&
        verifierSource.includes('buildSprintProofHelpers({'),
      detail: 'buildSprintProofHelpers import/use',
    },
    {
      check: 'old inline closeout index loop is removed from foundation verifier',
      ok: !verifierSource.includes('const closeoutsByBacklogIdForSprintProof = new Map()'),
      detail: 'closeout index helper lives in lib/foundation-verifier-sprint-proof.js',
    },
    {
      check: 'module exports concrete helper APIs',
      ok: [
        'export function indexCloseoutsByBacklogId',
        'export function cardHasVerifiedCloseout',
        'export function buildSprintProofHelpers',
        'export function buildSyntheticSprintProofModuleStatus',
      ].every(snippet => moduleSource.includes(snippet)),
      detail: 'module API surface present',
    },
    {
      check: 'plan keeps split bounded to first module',
      ok: planSource.includes('No broad refactor starts') &&
        planSource.includes('full verify aggregates modules'),
      detail: 'bounded module plan language present',
    },
  ]
  const failures = checks.filter(check => !check.ok)
  const report = {
    ok: failures.length === 0,
    durationMs: Date.now() - startedAt,
    checks,
    failures,
  }
  if (jsonMode) console.log(JSON.stringify(report, null, 2))
  else {
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} -> ${check.detail}`)
    }
    console.log(`Summary: ${checks.length - failures.length}/${checks.length} checks passed`)
  }
  if (failures.length) process.exitCode = 1
}

main().catch(error => {
  const report = { ok: false, error: error instanceof Error ? error.message : String(error) }
  if (jsonMode) console.log(JSON.stringify(report, null, 2))
  else console.error(error)
  process.exitCode = 1
})
