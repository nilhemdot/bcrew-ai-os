#!/usr/bin/env node

import process from 'node:process'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  buildRecentBuildsBillionDollarUiStatus,
  RECENT_BUILDS_UI_CARD_ID,
  RECENT_BUILDS_UI_CLOSEOUT_KEY,
} from '../lib/foundation-recent-builds-ui.js'

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
  const foundationBuildLog = await fetchJson(baseUrl, '/api/foundation/build-log?limit=500')
  const status = await buildRecentBuildsBillionDollarUiStatus({
    repoRoot: process.cwd(),
    foundationBuildLog,
    foundationBuildCloseouts: getFoundationBuildCloseouts(),
  })

  console.log('Recent Builds billion-dollar UI proof')
  console.log(`  Card: ${RECENT_BUILDS_UI_CARD_ID}`)
  console.log(`  Closeout: ${RECENT_BUILDS_UI_CLOSEOUT_KEY}`)
  console.log(`  Base URL: ${baseUrl}`)
  console.log(`  Status: ${status.status}`)
  console.log(`  Closeouts: ${status.summary.closeoutBuilds}`)
  console.log(`  Proof-linked builds: ${status.summary.proofLinkedBuilds}`)
  console.log(`  Review-next builds: ${status.summary.reviewNextBuilds}`)
  console.log(`  Same-commit groups: ${status.summary.sameCommitGroups}`)
  console.log(`  Manual route/state checks: ${status.summary.manualRouteChecks}`)
  console.log(`  New closeout present: ${status.summary.newCloseoutPresent ? 'yes' : 'no'}`)
  for (const finding of status.findings) {
    console.log(`FAIL ${finding.check}${finding.detail ? ` -> ${finding.detail}` : ''}`)
  }
  console.log(`RECENT_BUILDS_UI_SUMMARY ${JSON.stringify(status.summary)}`)
  if (status.status !== 'healthy') process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
