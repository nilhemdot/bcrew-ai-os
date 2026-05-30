#!/usr/bin/env node

import process from 'node:process'

import {
  LLM_AUTH_AUDIT_REPAIR_COMMAND,
  buildFoundationShipPreflight,
  buildFoundationShipPreflightDogfoodProof,
} from '../lib/foundation-ship-preflight.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getFoundationJobRunSnapshot,
  getLlmRuntimeSnapshot,
} from '../lib/foundation-runtime-jobs-db.js'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, ...rawValue] = arg.slice(2).split('=')
    args[key] = rawValue.length ? rawValue.join('=') : 'true'
  }
  return args
}

function boolArg(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
}

function printHuman(summary) {
  console.log('Foundation ship preflight')
  console.log(`  Status: ${summary.status}`)
  console.log(`  Max age: ${summary.maxAgeHours}h`)
  for (const row of summary.freshnessOwnership || []) {
    console.log(`  ${row.key}: ${row.status} / ${row.posture} / owner=${row.owner}`)
    if (row.ageHours !== null && row.ageHours !== undefined) console.log(`    age: ${row.ageHours}h`)
    if (row.status !== 'healthy') console.log(`    repair: ${row.repairCommand}`)
  }
  if (summary.fileSizeStandard) {
    const counts = summary.fileSizeStandard.summary || {}
    console.log(`  file-size-standard: ${summary.fileSizeStandard.status} / risk=${counts.riskCount || 0} / watch=${counts.watchCount || 0}`)
  }
  for (const finding of summary.findings || []) {
    console.log(`  BLOCKED ${finding.check}: ${finding.detail}`)
    if (finding.repairCommand) console.log(`    repair: ${finding.repairCommand}`)
  }
}

async function main() {
  const args = parseArgs()
  const jsonMode = boolArg(args.json)
  const dogfood = boolArg(args.dogfood)
  const maxAgeHours = Number(args.maxAgeHours || args['max-age-hours'] || 24)
  const now = args.now ? new Date(args.now) : new Date()
  if (Number.isNaN(now.getTime())) throw new Error(`Invalid --now value: ${args.now}`)

  if (dogfood) {
    const proof = buildFoundationShipPreflightDogfoodProof({ now })
    const summary = {
      ok: proof.ok,
      status: proof.ok ? 'healthy' : 'blocked',
      proof,
      repairCommand: LLM_AUTH_AUDIT_REPAIR_COMMAND,
    }
    if (jsonMode) console.log(JSON.stringify(summary, null, 2))
    else {
      console.log('Foundation ship preflight dogfood')
      console.log(`  Status: ${summary.status}`)
      console.log(`  Repair command present: ${JSON.stringify(summary).includes(LLM_AUTH_AUDIT_REPAIR_COMMAND)}`)
    }
    if (!proof.ok) process.exitCode = 1
    return
  }

  try {
    const [llmRuntime, foundationJobs] = await Promise.all([
      getLlmRuntimeSnapshot({ limit: 50 }),
      getFoundationJobRunSnapshot({ limit: 50 }),
    ])
    const summary = buildFoundationShipPreflight({
      llmRuntime,
      foundationJobs,
      now,
      maxAgeHours,
    })
    if (jsonMode) console.log(JSON.stringify(summary, null, 2))
    else printHuman(summary)
    if (!summary.ok) process.exitCode = 1
  } finally {
    await closeFoundationDb()
  }
}

main().catch(async error => {
  try { await closeFoundationDb() } catch {}
  const args = parseArgs()
  if (boolArg(args.json)) {
    console.log(JSON.stringify({
      ok: false,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    }, null, 2))
  } else {
    console.error(error instanceof Error ? error.message : String(error))
  }
  process.exitCode = 1
})
