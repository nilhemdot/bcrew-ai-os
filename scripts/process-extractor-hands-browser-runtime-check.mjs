#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  EXTRACTOR_HANDS_BROWSER_RUNTIME_CARD_ID,
  EXTRACTOR_HANDS_BROWSER_RUNTIME_SCRIPT_PATH,
  buildExtractorHandsBrowserRuntimeDogfoodProof,
} from '../lib/extractor-hands-browser-runtime.js'

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
    handsPlanSource,
    paritySource,
    parityScriptSource,
    backlogSeedSource,
    dogfood,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/extractor-hands-browser-runtime.js'),
    readRepoFile(EXTRACTOR_HANDS_BROWSER_RUNTIME_SCRIPT_PATH),
    readRepoFile('docs/process/extractor-hands-browser-runtime-001-plan.md'),
    readRepoFile('lib/god-mode-extractor-parity-gate.js'),
    readRepoFile('scripts/process-god-mode-extractor-parity-gate-check.mjs'),
    readRepoFile('lib/foundation-backlog-seed-chunks/chunk-005.js'),
    buildExtractorHandsBrowserRuntimeDogfoodProof(),
  ])

  addCheck(
    checks,
    packageJson.scripts?.['process:extractor-hands-browser-runtime-check'] === `node --env-file-if-exists=.env ${EXTRACTOR_HANDS_BROWSER_RUNTIME_SCRIPT_PATH}`,
    'package exposes governed browser Hands proof',
    packageJson.scripts?.['process:extractor-hands-browser-runtime-check'] || 'missing',
  )
  addCheck(
    checks,
    includesAll(moduleSource, [
      'buildExtractorHandsPolicy',
      'attachExtractorHandsPolicy',
      'classifyExtractorHandsPacketStatus',
      'validateExtractorHandsRequest',
      'runExtractorHandsBrowserRuntime',
      'live_playwright_hands',
      'click_navigation_ready',
      'exact_public_read_ready',
      'auth_session_required',
      'paid_or_private_blocked',
      'purchase_or_form_blocked',
      'unsupported_until_source_specific_runner',
    ]),
    'Hands runtime module defines policy, status map, validator, synthetic proof, and local Playwright live mode',
    'lib/extractor-hands-browser-runtime.js',
  )
  addCheck(
    checks,
    !/chromium\.launch/.test(scriptSource) && !/fetch\(/.test(scriptSource),
    'focused proof script does not browse or fetch live public web',
    EXTRACTOR_HANDS_BROWSER_RUNTIME_SCRIPT_PATH,
  )
  addCheck(
    checks,
    dogfood.ok === true,
    'dogfood proves one bounded click/navigation action and fail-closed unsafe variants',
    JSON.stringify(dogfood.blockedCases),
  )
  addCheck(
    checks,
    dogfood.clickRun?.sideEffects?.clicked === true &&
      dogfood.clickRun?.sideEffects?.navigated === true &&
      dogfood.clickRun?.sideEffects?.externalWrites === false &&
      dogfood.clickRun?.sideEffects?.writesBacklog === false,
    'dogfood captures click/navigation evidence with no external or backlog writes',
    JSON.stringify(dogfood.clickRun?.sideEffects || {}),
  )
  addCheck(
    checks,
    includesAll(dogfood.statusMatrix || [], [
      'exact_public_read_ready',
      'click_navigation_ready',
      'auth_session_required',
    ]),
    'dogfood status matrix distinguishes exact read, bounded click readiness, and auth/source-specific blockers',
    JSON.stringify(dogfood.statusMatrix || []),
  )
  addCheck(
    checks,
    includesAll(handsPlanSource, [
      'process:extractor-hands-browser-runtime-check',
      'click_navigation_ready',
      'exact_public_read_ready',
      'Skool/MyICOR remain blocked',
      'selector/action',
      'allowed next URL pattern',
    ]),
    'Hands plan names executable proof, status map, and packet-detail requirements',
    'docs/process/extractor-hands-browser-runtime-001-plan.md',
  )
  addCheck(
    checks,
    includesAll(paritySource, [
      'EXTRACTOR_HANDS_BROWSER_RUNTIME_CARD_ID',
      'click_navigation_ready',
    ]) &&
      parityScriptSource.includes('process:extractor-hands-browser-runtime-check'),
    'God Mode parity consumes browser Hands proof/status without claiming full God Mode',
    'lib/god-mode-extractor-parity-gate.js + process parity check',
  )
  addCheck(
    checks,
    includesAll(backlogSeedSource, [
      EXTRACTOR_HANDS_BROWSER_RUNTIME_CARD_ID,
      'bounded click policy',
      'click_navigation_ready',
    ]),
    'backlog seed records the public/free Hands V1 proof posture',
    'lib/foundation-backlog-seed-chunks/chunk-005.js',
  )

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    cardId: EXTRACTOR_HANDS_BROWSER_RUNTIME_CARD_ID,
    reportOnly: true,
    liveBrowserLaunched: false,
    externalWrites: false,
    writesBacklog: false,
    dogfood,
    checks,
    failures,
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log(`Extractor Hands browser runtime check: ${output.status}`)
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
