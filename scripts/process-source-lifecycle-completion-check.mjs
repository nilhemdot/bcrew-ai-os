#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import process from 'node:process'
import { promisify } from 'node:util'

import {
  SOURCE_LIFECYCLE_COMPLETION_CARD_ID,
  SOURCE_LIFECYCLE_COMPLETION_CLOSEOUT_KEY,
  SOURCE_LIFECYCLE_COMPLETION_SUMMARY_MARKER,
  buildSourceLifecycleCompletionCheck,
} from '../lib/source-lifecycle-completion.js'

const execFile = promisify(execFileCallback)

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [rawKey, ...rawValue] = arg.slice(2).split('=')
    args[rawKey] = rawValue.length ? rawValue.join('=') : 'true'
  }
  return args
}

async function currentHead() {
  try {
    const { stdout } = await execFile('git', ['rev-parse', 'HEAD'])
    return stdout.trim()
  } catch {
    return null
  }
}

async function fetchJson(baseUrl, pathname) {
  const response = await fetch(new URL(pathname, baseUrl))
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`${pathname} returned ${response.status} ${response.statusText}: ${text.slice(0, 240)}`)
  }
  return text ? JSON.parse(text) : {}
}

function printSourceRows(rows = []) {
  for (const source of rows) {
    const prefix = source.completionState === 'accepted_blocked' ? 'BLOCKED' : 'PASS'
    const blockers = source.blockerCards?.length ? source.blockerCards.join(',') : 'none'
    console.log(
      `${prefix} ${source.sourceId} state=${source.completionState} freshness=${source.freshnessStatus} coverage=${source.coverageStatus} tier=${source.sensitivityTier} blockers=${blockers}`
    )
  }
}

async function main() {
  const args = parseArgs()
  const baseUrl = String(args.baseUrl || process.env.FOUNDATION_BASE_URL || 'http://localhost:3000')
  const repoHead = await currentHead()
  const [sourceLifecycle, sourceOfTruth, foundationHub] = await Promise.all([
    fetchJson(baseUrl, '/api/foundation/source-lifecycle'),
    fetchJson(baseUrl, '/api/source-of-truth'),
    fetchJson(baseUrl, '/api/foundation-hub'),
  ])

  const status = await buildSourceLifecycleCompletionCheck({
    repoRoot: process.cwd(),
    sourceLifecycle,
    sourceOfTruth,
    foundationHub,
    repoHead,
  })

  console.log('Foundation source lifecycle completion proof')
  console.log(`  Card: ${SOURCE_LIFECYCLE_COMPLETION_CARD_ID}`)
  console.log(`  Closeout: ${SOURCE_LIFECYCLE_COMPLETION_CLOSEOUT_KEY}`)
  console.log(`  Base URL: ${baseUrl}`)
  console.log(`  Repo: ${repoHead ? repoHead.slice(0, 7) : 'unknown'}`)
  console.log(`  Status: ${status.status}`)
  console.log(`  Source contracts: ${status.summary.sourceContractCount}/${status.summary.expectedSourceCount}`)
  console.log(`  Terminal sources: ${status.summary.terminalSourceCount}`)
  console.log(`  Load-bearing terminal sources: ${status.summary.loadBearingSourceCount}`)
  console.log(`  Accepted blocked sources: ${status.summary.acceptedBlockedSourceCount}`)
  console.log(`  Extraction targets: ${status.summary.extractionTargetCount}/${status.summary.expectedExtractionTargetCount}`)
  console.log(`  Private/raw leak findings: ${status.summary.privateOrRawLeakFindings}`)
  console.log(`  Readiness still names card: ${status.summary.readinessStillNamesSourceLifecycleCompletion ? 'yes' : 'no'}`)
  console.log('')
  printSourceRows(status.completion.sources)
  console.log('')
  for (const finding of status.findings) {
    console.log(`FAIL ${finding.sourceId || 'global'} ${finding.check}${finding.detail ? ` -> ${finding.detail}` : ''}`)
    if (finding.blockerCards?.length) console.log(`  Blocker: ${finding.blockerCards.join(', ')}`)
    if (finding.nextAction) console.log(`  Next action: ${finding.nextAction}`)
  }
  console.log(`${SOURCE_LIFECYCLE_COMPLETION_SUMMARY_MARKER} ${JSON.stringify(status.summary)}`)
  if (status.status !== 'healthy') process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
