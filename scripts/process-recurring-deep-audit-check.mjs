#!/usr/bin/env node

import process from 'node:process'

import { getFoundationJobDefinitions } from '../lib/foundation-jobs.js'
import {
  RECURRING_DEEP_AUDIT_CARD_ID,
  RECURRING_DEEP_AUDIT_JOB_KEY,
  buildRecurringDeepAuditContract,
  buildRecurringDeepAuditDogfoodProof,
  evaluateRecurringDeepAuditJob,
} from '../lib/recurring-deep-audit.js'

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
  }
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function main() {
  const args = parseArgs()
  const jobs = getFoundationJobDefinitions()
  const job = jobs.find(item => item.key === RECURRING_DEEP_AUDIT_JOB_KEY)
  const contract = buildRecurringDeepAuditContract()
  const jobEvaluation = evaluateRecurringDeepAuditJob(job || {}, contract)
  const dogfood = buildRecurringDeepAuditDogfoodProof(job || {})
  const checks = []

  addCheck(checks, Boolean(job), 'recurring deep audit job is registered', RECURRING_DEEP_AUDIT_JOB_KEY)
  addCheck(checks, jobEvaluation.ok, 'recurring deep audit job matches manual report-only contract', jobEvaluation.findings.map(item => item.check).join(', ') || 'healthy')
  addCheck(checks, dogfood.ok, 'dogfood rejects scanner-only and autonomous/mutating reviewer shapes', dogfood.invariant)
  addCheck(checks, contract.outputPattern === 'docs/handoffs/deep-audit-{date}.md', 'output path pattern is fixed', contract.outputPattern)
  addCheck(checks, contract.findingFields.includes('severity') && contract.findingFields.includes('fixNowOrBacklog'), 'finding schema includes severity and fix-now/backlog route', contract.findingFields.join(', '))
  addCheck(checks, contract.manualApprovalRequired === true && contract.autoMutatesBacklog === false && contract.autoMutatesCode === false, 'contract is manual/proposal-only and non-mutating', JSON.stringify(contract))

  const findings = checks.filter(check => !check.ok)
  const summary = {
    ok: findings.length === 0,
    status: findings.length ? 'blocked' : 'healthy',
    cardId: RECURRING_DEEP_AUDIT_CARD_ID,
    jobKey: RECURRING_DEEP_AUDIT_JOB_KEY,
    contract,
    jobEvaluation,
    dogfood: {
      ok: dogfood.ok,
      scannerOnlyStatus: dogfood.scannerOnly.status,
      autonomousStatus: dogfood.autonomous.status,
      validManualStatus: dogfood.validManual.status,
    },
    checks,
    findings,
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Recurring deep audit proof')
    console.log(`  Status: ${summary.status}`)
    for (const finding of findings) console.log(`  BLOCKED ${finding.check}: ${finding.detail}`)
  }
  if (findings.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
