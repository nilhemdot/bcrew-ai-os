#!/usr/bin/env node

import process from 'node:process'
import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getBacklogSeedDriftSnapshot,
} from '../lib/foundation-backlog-sprint-db.js'

function parseArgs(argv) {
  const result = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    result[key] = value ?? true
  }
  return result
}

function summarizeValue(value) {
  if (value === null || value === undefined || value === '') return '<blank>'
  const text = String(value).replace(/\s+/g, ' ').trim()
  return text.length > 140 ? `${text.slice(0, 137)}...` : text
}

function printMismatchList(label, mismatches) {
  if (!mismatches.length) return
  console.log(`  ${label}:`)
  for (const mismatch of mismatches) {
    console.log(`    - ${mismatch.field}: seed="${summarizeValue(mismatch.seedValue)}" live="${summarizeValue(mismatch.liveValue)}"`)
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const limit = args.limit === undefined ? 20 : Number(args.limit)
  await initFoundationDb()
  const snapshot = await getBacklogSeedDriftSnapshot({ limit })

  if (args.json) {
    console.log(JSON.stringify(snapshot, null, 2))
    return
  }

  console.log('Backlog seed/live drift')
  console.log(`Generated: ${snapshot.generatedAt}`)
  console.log(`Policy: ${snapshot.policy}`)
  console.log(`Seed rows: ${snapshot.seedRows}`)
  console.log(`Live seed rows: ${snapshot.liveSeedRows}`)
  console.log(`Drift rows: ${snapshot.driftItemCount}`)
  console.log(`Stable mismatches: ${snapshot.stableMismatchCount} across ${snapshot.rowsWithStableDrift} rows`)
  console.log(`Mutable mismatches: ${snapshot.mutableMismatchCount} across ${snapshot.rowsWithMutableDrift} rows`)
  if (snapshot.missingLiveIds.length) {
    console.log(`Missing live IDs: ${snapshot.missingLiveIds.join(', ')}`)
  }
  if (!snapshot.items.length) return

  console.log('')
  console.log(`Top ${snapshot.items.length} drift items:`)
  for (const item of snapshot.items) {
    console.log(`- ${item.id}: ${item.title} (${item.status})`)
    printMismatchList('stable', item.stableMismatches || [])
    printMismatchList('mutable', item.mutableMismatches || [])
  }
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
