#!/usr/bin/env node

import process from 'node:process'
import {
  buildPlainEnglishSweepStatus,
  PLAIN_ENGLISH_SWEEP_ARTIFACT_PATH,
  PLAIN_ENGLISH_SWEEP_CARD_ID,
  PLAIN_ENGLISH_SWEEP_CLOSEOUT_KEY,
} from '../lib/foundation-plain-english.js'

async function main() {
  const status = await buildPlainEnglishSweepStatus({ repoRoot: process.cwd() })
  console.log('Plain-English sweep proof')
  console.log(`  Card: ${PLAIN_ENGLISH_SWEEP_CARD_ID}`)
  console.log(`  Closeout: ${PLAIN_ENGLISH_SWEEP_CLOSEOUT_KEY}`)
  console.log(`  Artifact: ${PLAIN_ENGLISH_SWEEP_ARTIFACT_PATH}`)
  console.log(`  Status: ${status.status}`)
  console.log(`  Audit entries: ${status.summary.totalEntries}`)
  console.log(`  Changed entries: ${status.summary.changedEntries}`)
  console.log(`  Manual route checks: ${status.summary.manualRouteChecks}`)
  Object.entries(status.summary.categoryCounts || {}).forEach(([category, count]) => {
    console.log(`  ${category}: ${count}`)
  })
  for (const finding of status.findings) {
    console.log(`FAIL ${finding.check}${finding.detail ? ` -> ${finding.detail}` : ''}`)
  }
  console.log(`PLAIN_ENGLISH_SWEEP_SUMMARY ${JSON.stringify(status.summary)}`)
  if (status.status !== 'healthy') process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
