#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  EXTRACTOR_HANDS_PRODUCTION_RUNNER_CARD_ID,
  EXTRACTOR_HANDS_PRODUCTION_RUNNER_ROUTE,
  EXTRACTOR_HANDS_PRODUCTION_RUNNER_SCRIPT_PATH,
  EXTRACTOR_HANDS_PRODUCTION_RUNNER_TARGET_KEY,
  EXTRACTOR_HANDS_PRODUCTION_QUEUE_ROUTE,
  buildExtractorHandsProductionRunnerDogfoodProof,
} from '../lib/extractor-hands-production-runner.js'

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
    routeSource,
    devHubSource,
    devUiSource,
    serverSource,
    planSource,
    backlogSeedSource,
    paritySource,
    dogfood,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/extractor-hands-production-runner.js'),
    readRepoFile(EXTRACTOR_HANDS_PRODUCTION_RUNNER_SCRIPT_PATH),
    readRepoFile('lib/foundation-build-intel-routes.js'),
    readRepoFile('lib/dev-team-hub.js'),
    readRepoFile('public/dev.js'),
    readRepoFile('server.js'),
    readRepoFile('docs/process/extractor-hands-production-runner-001-plan.md'),
    readRepoFile('lib/foundation-backlog-seed-chunks/chunk-005.js'),
    readRepoFile('lib/god-mode-extractor-parity-gate.js'),
    buildExtractorHandsProductionRunnerDogfoodProof(),
  ])

  addCheck(
    checks,
    packageJson.scripts?.['process:extractor-hands-production-runner-check'] === `node --env-file-if-exists=.env ${EXTRACTOR_HANDS_PRODUCTION_RUNNER_SCRIPT_PATH}`,
    'package exposes production Hands runner proof',
    packageJson.scripts?.['process:extractor-hands-production-runner-check'] || 'missing',
  )
  addCheck(
    checks,
    includesAll(moduleSource, [
      'validateExtractorHandsProductionRequest',
      'runExtractorHandsProductionRunner',
      'persistExtractorHandsProductionRun',
      'buildExtractorHandsProductionQueue',
      'runExtractorHandsBrowserRuntime',
      'attachExtractorHandsPolicy',
      'completed_bounded_hands_evidence_ready',
      EXTRACTOR_HANDS_PRODUCTION_RUNNER_TARGET_KEY,
      EXTRACTOR_HANDS_PRODUCTION_RUNNER_ROUTE,
      EXTRACTOR_HANDS_PRODUCTION_QUEUE_ROUTE,
    ]),
    'production runner module validates approved decisions, delegates bounded Hands, persists artifacts, and exposes queue status',
    'lib/extractor-hands-production-runner.js',
  )
  addCheck(
    checks,
    !/fetch\(/.test(scriptSource) && !/chromium\.launch/.test(scriptSource),
    'focused proof script does not browse or fetch live public web',
    EXTRACTOR_HANDS_PRODUCTION_RUNNER_SCRIPT_PATH,
  )
  addCheck(
    checks,
    includesAll(routeSource, [
      'EXTRACTOR_HANDS_PRODUCTION_RUNNER_ROUTE',
      'EXTRACTOR_HANDS_PRODUCTION_QUEUE_ROUTE',
      'runExtractorHandsProductionRunner',
      'persistExtractorHandsProductionRun',
      'buildExtractorHandsProductionQueue',
      'completed_bounded_hands_evidence_persisted',
    ]),
    'Build Intel routes expose guarded Hands run endpoint and queue with persistence',
    'lib/foundation-build-intel-routes.js',
  )
  addCheck(
    checks,
    includesAll(devHubSource, [
      'sourcePacketHandsQueue',
      'sourcePacketWorkerQueue',
      'EXTRACTOR_HANDS_PRODUCTION_QUEUE_ROUTE',
      'EXTRACTOR_HANDS_PRODUCTION_RUNNER_ROUTE',
    ]),
    'Dev Team Hub API carries source-packet worker and Hands queue read models',
    'lib/dev-team-hub.js',
  )
  addCheck(
    checks,
    includesAll(devUiSource, [
      'renderHandsQueue',
      'Hands runner status',
      'approved selector',
      EXTRACTOR_HANDS_PRODUCTION_QUEUE_ROUTE,
    ]),
    'Dev UI shows Hands queue/status without starting a run from approval',
    'public/dev.js',
  )
  addCheck(
    checks,
    includesAll(serverSource, [
      'upsertIntelligenceReportArtifact',
      'registerFoundationBuildIntelRoutes(app',
    ]),
    'server keeps report-artifact persistence available to Build Intel routes',
    'server.js',
  )
  addCheck(
    checks,
    includesAll(planSource, [
      'process:extractor-hands-production-runner-check',
      'decision -> Hands runner -> artifact -> status',
      'source_crawl_items',
      'intelligence_report_artifacts',
      'Do not log in',
    ]),
    'plan names exact production runner flow, proof, persistence, and not-next boundaries',
    'docs/process/extractor-hands-production-runner-001-plan.md',
  )
  addCheck(
    checks,
    includesAll(backlogSeedSource, [
      EXTRACTOR_HANDS_PRODUCTION_RUNNER_CARD_ID,
      'completed_bounded_hands_evidence_ready',
      'source-packet Hands queue',
      'no broad crawl, login, forms, downloads, purchases, external writes, or auto backlog writes',
    ]),
    'backlog seed records production Hands closeout posture',
    'lib/foundation-backlog-seed-chunks/chunk-005.js',
  )
  addCheck(
    checks,
    includesAll(paritySource, [
      'production_safe_hands_queue_ready',
      'SOURCE-FAMILY-GOD-MODE-EXTRACTORS-001',
    ]),
    'God Mode parity sees production Hands runner as partial public/resource-link progress without claiming full God Mode',
    'lib/god-mode-extractor-parity-gate.js',
  )
  addCheck(
    checks,
    dogfood.ok === true,
    'dogfood proves approved packet Hands run plus policy/held/rejected/skool/follow/live/write blocks',
    JSON.stringify(dogfood.blockedCases),
  )
  addCheck(
    checks,
    dogfood.run?.sideEffects?.clicked === true &&
      dogfood.run?.sideEffects?.navigated === true &&
      dogfood.run?.sideEffects?.externalWrites === false &&
      dogfood.run?.sideEffects?.writesBacklog === false &&
      dogfood.run?.sideEffects?.followedUnapprovedLinks === false,
    'dogfood captures bounded click/navigation evidence with no unapproved side effects',
    JSON.stringify(dogfood.run?.sideEffects || {}),
  )
  addCheck(
    checks,
    dogfood.persistence?.ok === true &&
      dogfood.persistence?.sourceCrawlItemStatus === 'succeeded' &&
      dogfood.persistence?.reportArtifactId,
    'dogfood persists source-crawl item and report artifact through injected stores',
    JSON.stringify(dogfood.persistence || {}),
  )
  addCheck(
    checks,
    dogfood.persistence?.sideEffects?.externalWrites === false &&
      dogfood.persistence?.sideEffects?.writesBacklog === false &&
      dogfood.persistence?.sideEffects?.writesSourceCrawlItems === true,
    'persistence proof writes governed Foundation stores only',
    JSON.stringify(dogfood.persistence?.sideEffects || {}),
  )
  addCheck(
    checks,
    dogfood.queue?.beforeRun?.ready === 1 &&
      dogfood.queue?.beforeRun?.blocked === 3 &&
      dogfood.queue?.afterRun?.alreadyRun === 1,
    'dogfood builds Hands queue from decision ledger rows and marks completed runs',
    JSON.stringify(dogfood.queue || {}),
  )

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    cardId: EXTRACTOR_HANDS_PRODUCTION_RUNNER_CARD_ID,
    reportOnly: true,
    liveBrowserLaunched: false,
    externalWrites: false,
    writesBacklog: false,
    followsLinks: false,
    persistsSourceCrawlItems: dogfood.persistence?.sideEffects?.writesSourceCrawlItems === true,
    persistsIntelligenceReportArtifact: dogfood.persistence?.sideEffects?.writesIntelligenceReportArtifact === true,
    dogfood,
    checks,
    failures,
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log(`Extractor Hands production runner check: ${output.status}`)
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
