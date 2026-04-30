#!/usr/bin/env node

import process from 'node:process'
import {
  buildFoundationSystemsServiceGroupingStatus,
  FOUNDATION_SYSTEMS_SERVICE_GROUPING_CARD_ID,
  FOUNDATION_SYSTEMS_SERVICE_GROUPING_CLOSEOUT_KEY,
} from '../lib/foundation-systems-service-grouping.js'

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
  const [sourceOfTruth, foundationHub, foundationBuildLog] = await Promise.all([
    fetchJson(baseUrl, '/api/source-of-truth'),
    fetchJson(baseUrl, '/api/foundation-hub'),
    fetchJson(baseUrl, '/api/foundation/build-log?limit=5'),
  ])

  const status = await buildFoundationSystemsServiceGroupingStatus({
    repoRoot: process.cwd(),
    sourceOfTruth,
    foundationHub,
    foundationBuildLog,
  })

  console.log('Foundation Systems service grouping proof')
  console.log(`  Card: ${FOUNDATION_SYSTEMS_SERVICE_GROUPING_CARD_ID}`)
  console.log(`  Closeout: ${FOUNDATION_SYSTEMS_SERVICE_GROUPING_CLOSEOUT_KEY}`)
  console.log(`  Base URL: ${baseUrl}`)
  console.log(`  Status: ${status.status}`)
  console.log(`  Approved grouped systems: ${status.summary.groupedSystemCount}`)
  console.log(`  Approved service groups: ${status.summary.approvedServiceGroupCount}`)
  console.log(`  Primary assigned: ${status.summary.primaryAssignedCount}`)
  console.log(`  Invalid systems: ${status.summary.invalidSystemCount}`)
  console.log(`  Empty groups: ${status.summary.emptyServiceAreas.join(', ') || 'none'}`)
  console.log(`  Partial systems: ${status.summary.partialSystemCount}`)
  console.log(`  Planned systems: ${status.summary.plannedSystemCount}`)
  console.log(`  Closeout owns only grouping: ${status.summary.closeoutOwnsOnlyGrouping ? 'yes' : 'no'}`)
  for (const finding of status.findings) {
    console.log(`FAIL ${finding.check}${finding.detail ? ` -> ${finding.detail}` : ''}`)
  }
  console.log(`FOUNDATION_SYSTEMS_SERVICE_GROUPING ${JSON.stringify(status.summary)}`)
  if (status.status !== 'healthy') process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
