#!/usr/bin/env node

import process from 'node:process'
import {
  buildSyntheticApprovalIntegrityStatus,
  validatePlanApprovalFile,
} from '../lib/approval-integrity.js'

function parseArgs(argv) {
  const result = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    result[key] = value ?? true
  }
  return result
}

function boolArg(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (boolArg(args.synthetic)) {
    const status = await buildSyntheticApprovalIntegrityStatus()
    console.log('Approval integrity synthetic proof')
    console.log(`  Clean approval: ${status.clean.ok ? 'pass' : 'fail'}`)
    console.log(`  Tampered plan rejected: ${!status.tampered.ok ? 'yes' : 'no'}`)
    if (!status.ok) process.exitCode = 1
    return
  }

  const approvalRef = String(args.approvalRef || '').trim()
  const cardId = String(args.card || '').trim()
  if (!approvalRef || !cardId) {
    console.error('Usage: npm run process:approval-integrity-check -- --card=<CARD_ID> --approvalRef=<APPROVAL_JSON>')
    console.error('   or: npm run process:approval-integrity-check -- --synthetic=true')
    process.exitCode = 1
    return
  }
  const status = await validatePlanApprovalFile({
    repoRoot: process.cwd(),
    approvalRef,
    cardId,
  })
  console.log('Approval integrity check')
  console.log(`  Card: ${cardId}`)
  console.log(`  Approval: ${approvalRef}`)
  console.log(`  Mode: ${status.mode}`)
  for (const check of status.checks) {
    console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
  if (!status.ok) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
