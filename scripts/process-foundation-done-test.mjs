#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import process from 'node:process'
import { promisify } from 'node:util'

import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  FOUNDATION_DONE_TEST_SCRIPT_PATH,
  FOUNDATION_DONE_TEST_SUMMARY_MARKER,
  buildFoundationReadinessStatus,
} from '../lib/foundation-readiness-gates.js'

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

function boolArg(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
}

async function readText(path) {
  return fs.readFile(path, 'utf8')
}

async function readJson(path) {
  return JSON.parse(await readText(path))
}

async function currentHead() {
  try {
    const { stdout } = await execFile('git', ['rev-parse', 'HEAD'])
    return stdout.trim()
  } catch {
    return null
  }
}

async function fetchJson(baseUrl, pathname, timeoutMs = 120000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(new URL(pathname, baseUrl), { signal: controller.signal })
    const text = await response.text()
    if (!response.ok) {
      throw new Error(`${pathname} returned ${response.status} ${response.statusText}: ${text.slice(0, 200)}`)
    }
    return text ? JSON.parse(text) : {}
  } finally {
    clearTimeout(timeout)
  }
}

async function buildRepoInputs() {
  const [
    packageJson,
    securityAccessSource,
    security002ScriptSource,
    doneTestScriptSource,
  ] = await Promise.all([
    readJson('package.json'),
    readText('lib/security-access.js'),
    readText('scripts/process-security-002-check.mjs'),
    readText(FOUNDATION_DONE_TEST_SCRIPT_PATH),
  ])

  return {
    packageJson,
    securityAccessHasRegistry: securityAccessSource.includes('SECURITY_ROUTE_POSTURES') &&
      securityAccessSource.includes('assertTier') &&
      securityAccessSource.includes('buildRedactedCollectionResponse'),
    securityScriptHasExternalDenials: security002ScriptSource.includes('John cannot read Foundation Hub') &&
      security002ScriptSource.includes('John cannot read shared-comms archive') &&
      security002ScriptSource.includes('does not read client maxTier'),
    scriptHasSummaryMarker: doneTestScriptSource.includes(FOUNDATION_DONE_TEST_SUMMARY_MARKER),
    scriptSupportsReportOnly: doneTestScriptSource.includes('report-only') &&
      doneTestScriptSource.includes('reportOnly'),
  }
}

function printHuman(status, options = {}) {
  const statusLabel = status.status === 'ready' ? 'READY' : 'NOT READY'
  console.log('Foundation readiness exit test')
  console.log(`  Status: ${statusLabel}`)
  console.log(`  Repo: ${status.repoHead ? status.repoHead.slice(0, 7) : 'unknown'}`)
  console.log(`  Ready for Strategy: ${status.readyForStrategy ? 'yes' : 'no'}`)
  if (options.inputWarning) console.log(`  Input warning: ${options.inputWarning}`)
  console.log('')

  for (const leg of status.legs) {
    const prefix = leg.status === 'pass' ? 'PASS' : 'FAIL'
    console.log(`${prefix} ${leg.label}`)
    if (leg.blockerCards?.length) console.log(`  Blocker: ${leg.blockerCards.join(', ')}`)
    if (leg.why) console.log(`  Why: ${leg.why}`)
    if (leg.proofCommand) console.log(`  Next proof: ${leg.proofCommand}`)
    if (leg.nextAction) console.log(`  Next action: ${leg.nextAction}`)
    console.log('')
  }

  if (status.conditionalCards?.length) {
    console.log('Conditional gates')
    for (const card of status.conditionalCards) {
      console.log(`  - ${card.cardId}: ${card.lane}; ${card.condition}`)
    }
    console.log('')
  }

  console.log(`${FOUNDATION_DONE_TEST_SUMMARY_MARKER} ${JSON.stringify({
    status: status.status,
    readyForStrategy: status.readyForStrategy,
    failedLegs: status.failedLegs.map(leg => ({
      key: leg.key,
      blockerCard: leg.blockerCard,
      blockerCards: leg.blockerCards,
      proofCommand: leg.proofCommand,
    })),
    blockingCards: status.blockingCards,
    summary: status.summary,
  })}`)
}

async function main() {
  const args = parseArgs()
  const baseUrl = String(args.baseUrl || process.env.FOUNDATION_BASE_URL || 'http://localhost:3000')
  const reportOnly = boolArg(args.reportOnly) || boolArg(args['report-only'])
  const jsonOnly = boolArg(args.json)
  const repoHead = await currentHead()
  let inputWarning = ''

  const [repo, foundationHubResult] = await Promise.all([
    buildRepoInputs(),
    fetchJson(baseUrl, '/api/foundation-hub').then(
      data => ({ ok: true, data }),
      error => ({ ok: false, error }),
    ),
  ])

  const foundationHub = foundationHubResult.ok ? foundationHubResult.data : {
    backlogItems: [],
  }
  if (!foundationHubResult.ok) {
    inputWarning = foundationHubResult.error instanceof Error
      ? foundationHubResult.error.message
      : String(foundationHubResult.error || 'Foundation Hub could not be read')
  }

  const status = buildFoundationReadinessStatus({
    foundationHub,
    closeouts: getFoundationBuildCloseouts(),
    repo,
    repoHead,
  })

  if (inputWarning) {
    status.status = 'not_ready'
    status.readyForStrategy = false
    status.failedLegs = status.failedLegs.length ? status.failedLegs : status.legs.filter(leg => leg.status !== 'pass')
    if (!status.blockingCards.includes('FOUNDATION-DONE-TEST-001')) {
      status.blockingCards.push('FOUNDATION-DONE-TEST-001')
    }
  }

  if (jsonOnly) {
    console.log(JSON.stringify(status, null, 2))
  } else {
    printHuman(status, { inputWarning })
  }

  if (status.status === 'ready') return
  process.exitCode = reportOnly ? 0 : 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 2
})
