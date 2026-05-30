#!/usr/bin/env node

import process from 'node:process'

import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getSourceContractRegistrySnapshot,
  syncSourceContractRegistryTable,
} from '../lib/foundation-source-crawl-db.js'
import { buildSourceContractRegistryRows } from '../lib/source-contract-registry-table.js'

function parseArgs(argv = process.argv.slice(2)) {
  const args = { apply: false, actor: 'source-contract-registry-sync', json: false }
  for (const arg of argv) {
    if (arg === '--apply' || arg === '--apply=true') args.apply = true
    if (arg === '--json' || arg === '--json=true') args.json = true
    if (arg.startsWith('--actor=')) args.actor = arg.slice('--actor='.length).trim() || args.actor
  }
  return args
}

function printHuman(result) {
  console.log('Source contract registry sync')
  console.log(`  Mode: ${result.applied ? 'apply' : 'dry-run'}`)
  console.log(`  Expected source contracts: ${result.expectedCount}`)
  console.log(`  Active registry rows: ${result.activeCount}`)
  console.log(`  Status: ${result.status}`)
  if (result.applied) {
    console.log(`  Upserted: ${result.upsertedCount}`)
    console.log(`  Deactivated: ${result.deactivatedSourceIds.length}`)
  } else {
    console.log('  Apply: pass --apply to write the registry table.')
  }
}

async function main() {
  const args = parseArgs()
  await initFoundationDb()
  const expectedRows = buildSourceContractRegistryRows()
  let result = {
    applied: false,
    expectedCount: expectedRows.length,
    activeCount: 0,
    status: 'dry_run',
    upsertedCount: 0,
    deactivatedSourceIds: [],
    snapshot: null,
  }

  if (args.apply) {
    const sync = await syncSourceContractRegistryTable({ actor: args.actor })
    result = {
      applied: true,
      expectedCount: expectedRows.length,
      activeCount: sync.snapshot.evaluation.summary.activeCount,
      status: sync.snapshot.evaluation.ok ? 'healthy' : 'review',
      upsertedCount: sync.upsertedCount,
      deactivatedSourceIds: sync.deactivatedSourceIds,
      snapshot: sync.snapshot,
    }
  } else {
    const snapshot = await getSourceContractRegistrySnapshot()
    result = {
      ...result,
      activeCount: snapshot.evaluation.summary.activeCount,
      status: snapshot.evaluation.ok ? 'healthy' : 'review',
      snapshot,
    }
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    printHuman(result)
  }

  if (result.applied && result.snapshot?.evaluation?.ok !== true) {
    process.exitCode = 1
  }
}

main()
  .catch(error => {
    console.error('Source contract registry sync failed.')
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb()
  })
