#!/usr/bin/env node

import process from 'node:process'
import {
  buildUiMenuLayoutPolishStatus,
  UI_MENU_LAYOUT_POLISH_CARD_ID,
  UI_MENU_LAYOUT_POLISH_CLOSEOUT_KEY,
} from '../lib/foundation-ui-menu-layout-polish.js'

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
  const [systemInventory, foundationHub, foundationBuildLog] = await Promise.all([
    fetchJson(baseUrl, '/api/system-inventory'),
    fetchJson(baseUrl, '/api/foundation-hub'),
    fetchJson(baseUrl, '/api/foundation/build-log?limit=500'),
  ])
  const status = await buildUiMenuLayoutPolishStatus({
    repoRoot: process.cwd(),
    systemInventory,
    foundationHub,
    foundationBuildLog,
  })

  console.log('UI menu layout polish proof')
  console.log(`  Card: ${UI_MENU_LAYOUT_POLISH_CARD_ID}`)
  console.log(`  Closeout: ${UI_MENU_LAYOUT_POLISH_CLOSEOUT_KEY}`)
  console.log(`  Base URL: ${baseUrl}`)
  console.log(`  Status: ${status.status}`)
  console.log(`  Required routes: ${status.summary.requiredRoutes}`)
  console.log(`  Route/viewport checks: ${status.summary.routeViewportChecks}`)
  console.log(`  Current docs: ${status.summary.currentDocCount}`)
  console.log(`  Archive/history docs: ${status.summary.archiveHistoryDocCount}`)
  console.log(`  Private local metadata rows: ${status.summary.privateLocalDocCount}`)
  console.log(`  Current/archive leaks: ${status.summary.currentArchiveLeakCount}`)
  console.log(`  Next card: ${status.summary.nextPlanCard || 'missing'}`)
  for (const finding of status.findings) {
    console.log(`FAIL ${finding.check}${finding.detail ? ` -> ${finding.detail}` : ''}`)
  }
  console.log(`UI_MENU_LAYOUT_POLISH_SUMMARY ${JSON.stringify(status.summary)}`)
  if (status.status !== 'healthy') process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
