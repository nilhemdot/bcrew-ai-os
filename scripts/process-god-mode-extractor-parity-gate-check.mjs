#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  GOD_MODE_EXTRACTOR_PARITY_GATE_CARD_ID,
  GOD_MODE_EXTRACTOR_PARITY_GATE_SCRIPT_PATH,
  GOD_MODE_REQUIRED_FAMILY_IDS,
  buildGodModeExtractorParityDogfoodProof,
  buildGodModeExtractorParitySnapshot,
  evaluateGodModeExtractorParity,
} from '../lib/god-mode-extractor-parity-gate.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
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
    devHubSource,
    devJsSource,
    parityPlanSource,
    sourceFamilyPlanSource,
    handsPlanSource,
    workerPlanSource,
    backlogSeedSource,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/god-mode-extractor-parity-gate.js'),
    readRepoFile(GOD_MODE_EXTRACTOR_PARITY_GATE_SCRIPT_PATH),
    readRepoFile('lib/dev-team-hub.js'),
    readRepoFile('public/dev.js'),
    readRepoFile('docs/process/god-mode-extractor-parity-gate-001-plan.md'),
    readRepoFile('docs/process/source-family-god-mode-extractors-001-plan.md'),
    readRepoFile('docs/process/extractor-hands-browser-runtime-001-plan.md'),
    readRepoFile('docs/process/source-packet-worker-runner-001-plan.md'),
    readRepoFile('lib/foundation-backlog-seed-chunks/chunk-005.js'),
  ])

  const snapshot = buildGodModeExtractorParitySnapshot({ generatedAt: '2026-05-25T00:00:00.000Z' })
  const evaluation = evaluateGodModeExtractorParity(snapshot)
  const dogfood = buildGodModeExtractorParityDogfoodProof()
  const familyIds = new Set(snapshot.families.map(item => item.familyId))
  const devVisibleBundle = `${devHubSource}\n${devJsSource}`

  addCheck(
    checks,
    packageJson.scripts?.['process:god-mode-extractor-parity-gate-check'] === `node --env-file-if-exists=.env ${GOD_MODE_EXTRACTOR_PARITY_GATE_SCRIPT_PATH}`,
    'package exposes focused God Mode extractor parity proof',
    packageJson.scripts?.['process:god-mode-extractor-parity-gate-check'] || 'missing'
  )
  addCheck(
    checks,
    includesAll(moduleSource, ['GOD_MODE_REQUIRED_FAMILY_IDS', 'GOD_MODE_REQUIRED_CAPABILITIES', 'evaluateGodModeExtractorParity', 'buildGodModeExtractorParityDogfoodProof']),
    'parity module defines source-family matrix and evaluator',
    'lib/god-mode-extractor-parity-gate.js'
  )
  addCheck(
    checks,
    GOD_MODE_REQUIRED_FAMILY_IDS.every(familyId => familyIds.has(familyId)),
    'matrix covers every required extractor family',
    GOD_MODE_REQUIRED_FAMILY_IDS.filter(familyId => !familyIds.has(familyId)).join(', ') || `${snapshot.families.length} families`
  )
  addCheck(
    checks,
    evaluation.ok === true,
    'current matrix does not falsely claim full God Mode',
    evaluation.violations.map(item => `${item.familyId}:${item.ruleId}`).join(', ') || 'ok'
  )
  addCheck(
    checks,
    dogfood.ok === true,
    'dogfood fails false God Mode claims for partial YouTube and paid Skool',
    JSON.stringify(dogfood.cases)
  )
  addCheck(
    checks,
    !devVisibleBundle.includes('youtube-god-mode-pipeline') &&
      !devVisibleBundle.includes('YouTube / God Mode Pipeline') &&
      !devVisibleBundle.includes("visibleValue: 'God Mode") &&
      devVisibleBundle.includes('youtube-video-intelligence-pipeline') &&
      devVisibleBundle.includes('not full God Mode until approved resource follow-up, source-packet worker execution, and browser hands are proven') &&
      devVisibleBundle.includes('YouTube comments are intentionally excluded'),
    'Dev read model uses truthful YouTube video intelligence wording',
    'no public Dev lane claims full God Mode'
  )
  addCheck(
    checks,
    includesAll(parityPlanSource, ['comments are intentionally excluded', 'browser navigation', 'Skool/paid courses', 'MyICOR/paid training', 'source packet']) &&
      parityPlanSource.includes('process:god-mode-extractor-parity-gate-check'),
    'God Mode parity plan names comment exclusion, hands, paid sources, and proof command',
    'docs/process/god-mode-extractor-parity-gate-001-plan.md'
  )
  addCheck(
    checks,
    includesAll(sourceFamilyPlanSource, ['YouTube public comments (operator-excluded)', 'Skool paid courses/classrooms', 'MyICOR paid training', 'model/brain route', 'process:god-mode-extractor-parity-gate-check']),
    'source-family plan routes maturity matrix through the parity proof',
    'docs/process/source-family-god-mode-extractors-001-plan.md'
  )
  addCheck(
    checks,
    backlogSeedSource.includes(GOD_MODE_EXTRACTOR_PARITY_GATE_CARD_ID) &&
      backlogSeedSource.includes('process:god-mode-extractor-parity-gate-check'),
    'backlog seed points the P0 card at the actual parity proof',
    'lib/foundation-backlog-seed-chunks/chunk-005.js'
  )
  addCheck(
    checks,
    includesAll(backlogSeedSource, [
      'EXTRACTOR-HANDS-BROWSER-RUNTIME-001',
      'SOURCE-PACKET-WORKER-RUNNER-001',
      'Raw Codex session 019e46b1',
      'Playwright-first',
    ]) &&
      includesAll(handsPlanSource, ['Local Playwright first', 'source-packet boundaries', 'Skool/MyICOR remain blocked']) &&
      includesAll(workerPlanSource, ['decision -> runner -> artifact -> freshness/status', 'lib/source-packet-public-web-runtime.js', 'Do not follow links automatically']),
    'raw God Mode Hands correction is promoted to backlog cards and process plans',
    'EXTRACTOR-HANDS-BROWSER-RUNTIME-001 + SOURCE-PACKET-WORKER-RUNNER-001'
  )

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'healthy',
    cardId: GOD_MODE_EXTRACTOR_PARITY_GATE_CARD_ID,
    familyCount: snapshot.families.length,
    summary: snapshot.summary,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`God Mode extractor parity gate: ${result.status}`)
    for (const check of checks) console.log(`  ${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` - ${check.detail}` : ''}`)
  }

  if (!result.ok) process.exit(1)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
