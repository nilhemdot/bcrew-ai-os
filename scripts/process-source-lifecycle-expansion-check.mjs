#!/usr/bin/env node

import process from 'node:process'
import {
  buildSourceLifecycleExpansionCheck,
  SOURCE_LIFECYCLE_CARD_ID,
  SOURCE_LIFECYCLE_CLOSEOUT_KEY,
} from '../lib/source-lifecycle.js'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [rawKey, ...rawValue] = arg.slice(2).split('=')
    args[rawKey] = rawValue.length ? rawValue.join('=') : 'true'
  }
  return args
}

async function fetchJson(baseUrl, pathname) {
  const response = await fetch(new URL(pathname, baseUrl))
  if (!response.ok) throw new Error(`${pathname} returned ${response.status} ${response.statusText}`)
  return response.json()
}

async function main() {
  const args = parseArgs()
  const baseUrl = String(args.baseUrl || process.env.FOUNDATION_BASE_URL || 'http://localhost:3000')
  const [sourceLifecycle, sourceOfTruth, foundationHub] = await Promise.all([
    fetchJson(baseUrl, '/api/foundation/source-lifecycle'),
    fetchJson(baseUrl, '/api/source-of-truth'),
    fetchJson(baseUrl, '/api/foundation-hub'),
  ])

  const status = await buildSourceLifecycleExpansionCheck({
    repoRoot: process.cwd(),
    sourceLifecycle,
    sourceOfTruth,
    foundationHub,
  })

  console.log('Foundation source lifecycle expansion proof')
  console.log(`  Card: ${SOURCE_LIFECYCLE_CARD_ID}`)
  console.log(`  Closeout: ${SOURCE_LIFECYCLE_CLOSEOUT_KEY}`)
  console.log(`  Base URL: ${baseUrl}`)
  console.log(`  Status: ${status.status}`)
  console.log(`  Source contracts: ${status.summary.sourceContractCount || 0}`)
  console.log(`  Extraction targets: ${status.summary.extractionTargetCount || 0}`)
  console.log(`  Included missing: ${status.summary.includedSourceMissingCount || 0}`)
  console.log(`  Lane completeness failures: ${status.summary.laneCompletenessFailures || 0}`)
  console.log(`  Target baseline changes: ${status.summary.targetBaselineChanges || 0}`)
  console.log(`  Extra targets: ${status.summary.targetBaselineExtraTargets || 0}`)
  console.log(`  Parked/planned activated: ${status.summary.blockedPausedPlannedActivated || 0}`)
  console.log(`  Private evidence leaks: ${status.summary.privateEvidenceLeaks || 0}`)
  console.log(`  Raw content fields: ${status.summary.rawContentKeyFindings || 0}`)
  for (const finding of status.findings) {
    console.log(`FAIL ${finding.check}${finding.detail ? ` -> ${finding.detail}` : ''}`)
  }
  console.log(`SOURCE_LIFECYCLE ${JSON.stringify(status.summary)}`)
  if (status.status !== 'healthy') process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
