#!/usr/bin/env node

import process from 'node:process'
import {
  buildDailyExecSummaryStatus,
  DAILY_EXEC_SUMMARY_CARD_ID,
  DAILY_EXEC_SUMMARY_CLOSEOUT_KEY,
} from '../lib/foundation-daily-exec-summary.js'

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
  const date = String(args.date || '2026-04-30')
  const [dailySummary, buildLog, changeLog, changesApi, foundationHub] = await Promise.all([
    fetchJson(baseUrl, `/api/foundation/daily-summary?date=${encodeURIComponent(date)}&days=7`),
    fetchJson(baseUrl, '/api/foundation/build-log?limit=500'),
    fetchJson(baseUrl, '/api/foundation/change-log?limit=100'),
    fetchJson(baseUrl, '/api/foundation/changes?limit=20'),
    fetchJson(baseUrl, '/api/foundation-hub'),
  ])

  const status = await buildDailyExecSummaryStatus({
    repoRoot: process.cwd(),
    dailySummary,
    buildLog,
    changeLog,
    changesApi,
    foundationHub,
  })

  console.log('Foundation daily executive summary proof')
  console.log(`  Card: ${DAILY_EXEC_SUMMARY_CARD_ID}`)
  console.log(`  Closeout: ${DAILY_EXEC_SUMMARY_CLOSEOUT_KEY}`)
  console.log(`  Base URL: ${baseUrl}`)
  console.log(`  Date: ${date}`)
  console.log(`  Status: ${status.status}`)
  console.log(`  Evidence days: ${status.summary.evidenceDayCount || 0}/${status.summary.dayCount || 0}`)
  console.log(`  Shipped today: ${status.summary.shippedTodayCount || 0}`)
  console.log(`  Still open: ${status.summary.stillOpenCount || 0}`)
  console.log(`  Needs review: ${status.summary.needsReviewCount || 0}`)
  console.log(`  Next build signals: ${status.summary.nextBuildCount || 0}`)
  console.log(`  Latest Recent Builds represented: ${status.summary.latestRecentBuildsRepresented || 0}/5`)
  console.log(`  Latest closeout represented: ${status.summary.latestDailyCloseoutRepresented ? 'yes' : 'no'}`)
  console.log(`  Ownership/context smearing: ${status.summary.ownershipContextSmearing || 0}`)
  console.log(`  Private evidence leaks: ${status.summary.privateEvidenceLeaks || 0}`)
  for (const finding of status.findings) {
    console.log(`FAIL ${finding.check}${finding.detail ? ` -> ${finding.detail}` : ''}`)
  }
  console.log(`DAILY_EXEC_SUMMARY ${JSON.stringify(status.summary)}`)
  if (status.status !== 'healthy') process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
