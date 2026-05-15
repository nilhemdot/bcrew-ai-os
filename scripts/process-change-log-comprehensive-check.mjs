#!/usr/bin/env node

import process from 'node:process'
import {
  buildChangeLogComprehensiveStatus,
  CHANGE_LOG_COMPREHENSIVE_CARD_ID,
  CHANGE_LOG_COMPREHENSIVE_CLOSEOUT_KEY,
} from '../lib/foundation-change-log.js'

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
  const [changeLog, changesApi, buildLog] = await Promise.all([
    fetchJson(baseUrl, '/api/foundation/change-log?limit=100'),
    fetchJson(baseUrl, '/api/foundation/changes?limit=20'),
    fetchJson(baseUrl, '/api/foundation/build-log?limit=500'),
  ])

  const status = await buildChangeLogComprehensiveStatus({
    repoRoot: process.cwd(),
    changeLog,
    changesApi,
    buildLog,
  })

  console.log('Foundation comprehensive changelog proof')
  console.log(`  Card: ${CHANGE_LOG_COMPREHENSIVE_CARD_ID}`)
  console.log(`  Closeout: ${CHANGE_LOG_COMPREHENSIVE_CLOSEOUT_KEY}`)
  console.log(`  Base URL: ${baseUrl}`)
  console.log(`  Status: ${status.status}`)
  console.log(`  Entries: ${status.summary.totalEntries || 0}`)
  console.log(`  Verified closeout-backed entries: ${status.summary.verifiedCloseoutBackedEntries || 0}`)
  console.log(`  Change types represented: ${status.summary.representedChangeTypes || 0}/${status.summary.evidenceAvailableChangeTypes || 0}`)
  console.log(`  Latest Recent Builds represented: ${status.summary.latestRecentBuildsRepresented || 0}/5`)
  console.log(`  Latest closeout represented: ${status.summary.latestChangeLogCloseoutRepresented ? 'yes' : 'no'}`)
  console.log(`  Ownership/context smearing: ${status.summary.ownershipContextSmearing || 0}`)
  console.log(`  Private evidence leaks: ${status.summary.privateEvidenceLeaks || 0}`)
  for (const finding of status.findings) {
    console.log(`FAIL ${finding.check}${finding.detail ? ` -> ${finding.detail}` : ''}`)
  }
  console.log(`CHANGE_LOG_COMPREHENSIVE_SUMMARY ${JSON.stringify(status.summary)}`)
  if (status.status !== 'healthy') process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
