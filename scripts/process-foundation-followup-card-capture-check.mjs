#!/usr/bin/env node

import process from 'node:process'
import {
  buildFoundationFollowupCardCaptureStatus,
  FOUNDATION_FOLLOWUP_CARD_CAPTURE_CARD_ID,
  FOUNDATION_FOLLOWUP_CARD_CAPTURE_CLOSEOUT_KEY,
} from '../lib/foundation-followup-card-capture.js'

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
  const [foundationHub, foundationBuildLog] = await Promise.all([
    fetchJson(baseUrl, '/api/foundation-hub'),
    fetchJson(baseUrl, '/api/foundation/build-log?limit=5'),
  ])

  const status = await buildFoundationFollowupCardCaptureStatus({
    repoRoot: process.cwd(),
    foundationHub,
    foundationBuildLog,
  })

  console.log('Foundation follow-up card capture proof')
  console.log(`  Card: ${FOUNDATION_FOLLOWUP_CARD_CAPTURE_CARD_ID}`)
  console.log(`  Closeout: ${FOUNDATION_FOLLOWUP_CARD_CAPTURE_CLOSEOUT_KEY}`)
  console.log(`  Base URL: ${baseUrl}`)
  console.log(`  Status: ${status.status}`)
  console.log(`  Scoped cards: ${status.summary.scopedCardCount || 0}`)
  console.log(`  Required service groups: ${status.summary.requiredGroups || 0}`)
  console.log(`  Closeout owns only capture: ${status.summary.closeoutOwnsOnlyCapture ? 'yes' : 'no'}`)
  for (const finding of status.findings) {
    console.log(`FAIL ${finding.check}${finding.detail ? ` -> ${finding.detail}` : ''}`)
  }
  console.log(`FOUNDATION_FOLLOWUP_CARD_CAPTURE ${JSON.stringify(status.summary)}`)
  if (status.status !== 'healthy') process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
