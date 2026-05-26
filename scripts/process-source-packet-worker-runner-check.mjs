#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  SOURCE_PACKET_WORKER_RUNNER_CARD_ID,
  SOURCE_PACKET_WORKER_RUNNER_SCRIPT_PATH,
  buildSourcePacketWorkerRunnerDogfoodProof,
} from '../lib/source-packet-worker-runner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

function includesAll(source = '', markers = []) {
  return markers.every(marker => String(source || '').includes(marker))
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    packageJson,
    moduleSource,
    scriptSource,
    workerPlanSource,
    handsPlanSource,
    backlogSeedSource,
    dogfood,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/source-packet-worker-runner.js'),
    readRepoFile(SOURCE_PACKET_WORKER_RUNNER_SCRIPT_PATH),
    readRepoFile('docs/process/source-packet-worker-runner-001-plan.md'),
    readRepoFile('docs/process/extractor-hands-browser-runtime-001-plan.md'),
    readRepoFile('lib/foundation-backlog-seed-chunks/chunk-005.js'),
    buildSourcePacketWorkerRunnerDogfoodProof(),
  ])

  addCheck(
    checks,
    packageJson.scripts?.['process:source-packet-worker-runner-check'] === `node --env-file-if-exists=.env ${SOURCE_PACKET_WORKER_RUNNER_SCRIPT_PATH}`,
    'package exposes source-packet worker runner proof',
    packageJson.scripts?.['process:source-packet-worker-runner-check'] || 'missing',
  )
  addCheck(
    checks,
    includesAll(moduleSource, [
      'validateSourcePacketWorkerRequest',
      'runSourcePacketWorker',
      'buildSourcePacketWorkerArtifactRecord',
      'runSourcePacketPublicWebRuntime',
      'freshnessSignal',
      'flag_only_no_auto_destination_write',
    ]),
    'worker runner module validates decisions, delegates exact public runtime, and emits freshness signal',
    'lib/source-packet-worker-runner.js',
  )
  addCheck(
    checks,
    !/fetch\(/.test(scriptSource) && !/chromium\.launch/.test(scriptSource),
    'focused proof does not browse or fetch live public web',
    SOURCE_PACKET_WORKER_RUNNER_SCRIPT_PATH,
  )
  addCheck(
    checks,
    includesAll(workerPlanSource, [
      'decision -> runner -> artifact -> freshness/status',
      'lib/source-packet-public-web-runtime.js',
      'Do not follow links automatically',
    ]),
    'worker plan names exact decision-to-artifact loop and no-link-following boundary',
    'docs/process/source-packet-worker-runner-001-plan.md',
  )
  addCheck(
    checks,
    includesAll(handsPlanSource, [
      'Local Playwright first',
      'source-packet boundaries',
      'Skool/MyICOR remain blocked',
    ]),
    'Hands plan keeps browser runtime local-first and source-packet bounded',
    'docs/process/extractor-hands-browser-runtime-001-plan.md',
  )
  addCheck(
    checks,
    includesAll(backlogSeedSource, [
      SOURCE_PACKET_WORKER_RUNNER_CARD_ID,
      'EXTRACTOR-HANDS-BROWSER-RUNTIME-001',
      'decision -> runner -> artifact -> freshness/status loop',
      'no link following',
    ]),
    'backlog seed captures runner and Hands as P0 scoped cards',
    'lib/foundation-backlog-seed-chunks/chunk-005.js',
  )
  addCheck(
    checks,
    dogfood.ok === true,
    'dogfood proves approved packet run plus held/rejected/skool/follow/live blocks',
    JSON.stringify(dogfood.blockedCases),
  )
  addCheck(
    checks,
    dogfood.run?.freshnessSignal?.synthesisNeedsRefresh === true &&
      dogfood.run?.freshnessSignal?.writesDestinationLedgers === false,
    'worker output flags freshness without destination writes',
    JSON.stringify(dogfood.run?.freshnessSignal || {}),
  )
  addCheck(
    checks,
    dogfood.run?.sideEffects?.externalWrites === false &&
      dogfood.run?.sideEffects?.writesBacklog === false &&
      dogfood.run?.sideEffects?.followsLinks === false,
    'worker proof has no external writes, backlog writes, or link following',
    JSON.stringify(dogfood.run?.sideEffects || {}),
  )

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    cardId: SOURCE_PACKET_WORKER_RUNNER_CARD_ID,
    reportOnly: true,
    liveNetworkFetched: false,
    externalWrites: false,
    writesBacklog: false,
    followsLinks: false,
    dogfood,
    checks,
    failures,
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log(`Source-packet worker runner check: ${output.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }

  if (failures.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
