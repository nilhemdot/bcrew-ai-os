#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  FOUNDATION_FULL_DIAGNOSTICS_BUDGET,
  evaluateFoundationFullDiagnosticsMeasurement,
} from '../lib/foundation-hub-full-diagnostics.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const CARD_ID = 'FOUNDATION-HUB-FULL-PAYLOAD-REDUCE-001'
const BASELINE_BYTES = 4824662
const BASELINE_SECONDS = 8.113

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    baseUrl: process.env.BCREW_FOUNDATION_BASE_URL || 'http://localhost:3000',
  }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg.startsWith('--baseUrl=')) args.baseUrl = arg.slice('--baseUrl='.length)
  }
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function measureJsonRoute({ baseUrl, routePath, timeoutMs }) {
  const started = process.hrtime.bigint()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${baseUrl}${routePath}`, { signal: controller.signal })
    const text = await response.text()
    const seconds = Math.round((Number(process.hrtime.bigint() - started) / 1e9) * 1000000) / 1000000
    return {
      path: routePath,
      statusCode: response.status,
      seconds,
      bytes: Buffer.byteLength(text, 'utf8'),
      json: JSON.parse(text),
    }
  } finally {
    clearTimeout(timeout)
  }
}

function buildPayloadDogfoodProof() {
  const healthy = evaluateFoundationFullDiagnosticsMeasurement({
    statusCode: 200,
    seconds: 2,
    bytes: FOUNDATION_FULL_DIAGNOSTICS_BUDGET.maxBytes - 1,
  })
  const oversized = evaluateFoundationFullDiagnosticsMeasurement({
    statusCode: 200,
    seconds: 2,
    bytes: FOUNDATION_FULL_DIAGNOSTICS_BUDGET.maxBytes + 1,
  })
  return {
    ok: healthy.ok === true && oversized.ok === false,
    healthy,
    oversized,
    invariant: 'Payload budget proof accepts an under-budget route and rejects one byte over budget.',
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [serverSource, diagnosticsSource, performanceSource] = await Promise.all([
    readRepoFile('server.js'),
    readRepoFile('lib/foundation-hub-full-diagnostics.js'),
    readRepoFile('lib/foundation-hub-performance.js'),
  ])
  const dogfood = buildPayloadDogfoodProof()
  const measurement = await measureJsonRoute({
    baseUrl: args.baseUrl,
    routePath: '/api/foundation-hub?view=full',
    timeoutMs: (FOUNDATION_FULL_DIAGNOSTICS_BUDGET.maxSeconds + 5) * 1000,
  })
  const evaluation = evaluateFoundationFullDiagnosticsMeasurement(measurement)
  const payloadReductionBytes = BASELINE_BYTES - measurement.bytes
  const payloadReductionPercent = Math.round((payloadReductionBytes / BASELINE_BYTES) * 1000) / 10

  addCheck(checks, dogfood.ok, 'dogfood proof rejects oversized full payloads', dogfood.invariant)
  addCheck(checks, evaluation.ok, 'live full diagnostics route stays inside tightened budget', evaluation.findings.map(item => item.check).join(', ') || `${measurement.seconds}s / ${measurement.bytes}B`)
  addCheck(checks, payloadReductionBytes >= 500000, 'live full payload is materially smaller than measured baseline', `${measurement.bytes}B vs ${BASELINE_BYTES}B baseline (${payloadReductionPercent}% smaller)`)
  addCheck(checks, measurement.json?.foundationHubPerformance?.budgetStatus === 'healthy', 'payload self-reports healthy performance budget', measurement.json?.foundationHubPerformance?.budgetStatus || 'missing')
  addCheck(checks, measurement.json?.sourceLifecycle?.fullPayloadCompacted === true, 'sourceLifecycle nested duplicates are compacted in the full payload', 'sourceLifecycle.fullPayloadCompacted')
  addCheck(checks, measurement.json?.sharedCommunicationSynthesis?.fullPayloadCompacted === true, 'sharedCommunicationSynthesis heavy run rows are compacted in the full payload', 'sharedCommunicationSynthesis.fullPayloadCompacted')
  addCheck(
    checks,
    serverSource.includes('compactSharedCommunicationSynthesis') &&
      serverSource.includes('compactFoundationSourceLifecycle') &&
      diagnosticsSource.includes('maxBytes: 4200000') &&
      performanceSource.includes('maxPayloadBytes: 4500000'),
    'repo source owns compactors and tighter budgets',
    'server.js + budget modules',
  )

  const findings = checks.filter(check => !check.ok)
  const summary = {
    ok: findings.length === 0,
    status: findings.length ? 'blocked' : 'healthy',
    cardId: CARD_ID,
    baseline: {
      seconds: BASELINE_SECONDS,
      bytes: BASELINE_BYTES,
    },
    measurement: {
      seconds: measurement.seconds,
      bytes: measurement.bytes,
      payloadReductionBytes,
      payloadReductionPercent,
    },
    budget: FOUNDATION_FULL_DIAGNOSTICS_BUDGET,
    checks,
    findings,
  }
  if (args.json) console.log(JSON.stringify(summary, null, 2))
  else {
    console.log(`Foundation Hub full payload reduce check: ${summary.status}`)
    console.log(`  Baseline: ${BASELINE_SECONDS}s / ${BASELINE_BYTES}B`)
    console.log(`  Current: ${measurement.seconds}s / ${measurement.bytes}B`)
    for (const finding of findings) console.log(`  BLOCKED ${finding.check}: ${finding.detail}`)
  }
  if (!summary.ok) process.exitCode = 1
}

main().catch(error => {
  const args = parseArgs()
  if (args.json) {
    console.log(JSON.stringify({
      ok: false,
      status: 'error',
      cardId: CARD_ID,
      error: error instanceof Error ? error.message : String(error),
    }, null, 2))
  } else {
    console.error(error instanceof Error ? error.message : String(error))
  }
  process.exitCode = 1
})
