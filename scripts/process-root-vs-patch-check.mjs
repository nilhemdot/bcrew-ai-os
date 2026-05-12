#!/usr/bin/env node

import process from 'node:process'
import {
  buildPlanCriticResultSummary,
  buildSyntheticPlanCriticProof,
  PLAN_CRITIC_ROOT_VS_PATCH_FINDING_KEY,
} from '../lib/process-plan-critic.js'

const commandName = 'process:root-vs-patch-check'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, ...value] = arg.slice(2).split('=')
    args[key] = value.length ? value.join('=') : 'true'
  }
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function main() {
  const args = parseArgs()
  const jsonOnly = args.json === true || args.json === 'true'
  const proof = buildSyntheticPlanCriticProof()
  const checks = []

  addCheck(
    checks,
    proof.symptomPatch?.status === 'revise',
    'symptom patch plan is rejected',
    proof.symptomPatch ? buildPlanCriticResultSummary(proof.symptomPatch) : 'missing symptom patch proof',
  )
  addCheck(
    checks,
    proof.symptomPatch?.findings?.some(finding => finding.key === PLAN_CRITIC_ROOT_VS_PATCH_FINDING_KEY),
    'symptom patch rejection names root-vs-patch invariant',
    proof.symptomPatch ? JSON.stringify(proof.symptomPatch.findings) : 'missing symptom patch findings',
  )
  addCheck(
    checks,
    proof.rootInvariant?.status === 'pass',
    'root invariant verifier plan passes',
    proof.rootInvariant ? buildPlanCriticResultSummary(proof.rootInvariant) : 'missing root invariant proof',
  )
  addCheck(
    checks,
    !proof.rootInvariant?.findings?.some(finding => finding.key === PLAN_CRITIC_ROOT_VS_PATCH_FINDING_KEY),
    'root invariant verifier plan does not trip the escape-condition rule',
    proof.rootInvariant ? JSON.stringify(proof.rootInvariant.findings) : 'missing root invariant findings',
  )
  addCheck(
    checks,
    proof.ok,
    'full synthetic Plan Critic proof remains healthy',
    proof.ok ? 'strong, weak, broad, symptom-patch, and root-invariant cases passed' : JSON.stringify(proof, null, 2).slice(0, 1000),
  )

  const failed = checks.filter(check => !check.ok)
  const summary = {
    status: failed.length ? 'blocked' : 'healthy',
    cardId: 'PROCESS-ROOT-VS-PATCH-001',
    findingKey: PLAN_CRITIC_ROOT_VS_PATCH_FINDING_KEY,
    checks,
  }

  if (jsonOnly) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Root-vs-patch Plan Critic proof')
    console.log(`  Command: ${commandName}`)
    console.log(`  Status: ${summary.status}`)
    for (const check of checks) {
      const prefix = check.ok ? 'PASS' : 'FAIL'
      console.log(`${prefix} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }

  if (failed.length) process.exitCode = 1
}

main()
