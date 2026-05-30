#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  GOD_MODE_REQUIRED_FAMILY_IDS,
  buildGodModeExtractorParitySnapshot,
} from '../lib/god-mode-extractor-parity-gate.js'
import {
  buildSourceFamilyGodModeMaturityDogfoodProof,
  buildSourceFamilyGodModeMaturitySnapshot,
  evaluateSourceFamilyGodModeMaturity,
  SOURCE_FAMILY_GOD_MODE_EXTRACTORS_CARD_ID,
  SOURCE_FAMILY_GOD_MODE_EXTRACTORS_CLOSEOUT_KEY,
  SOURCE_FAMILY_GOD_MODE_EXTRACTORS_SCRIPT_PATH,
} from '../lib/source-family-god-mode-extractors.js'
import {
  buildSynthesisRouterFreshnessSnapshot,
} from '../lib/synthesis-router-freshness-trigger.js'
import {
  buildDevTeamHubV0DogfoodProof,
  buildDevTeamHubV0Snapshot,
} from '../lib/dev-team-hub.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const DEV_CSS_PATHS = [
  'public/dev.css',
  'public/dev-youtube-source.css',
  'public/dev-source-approval.css',
]

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

async function readDevCssBundle() {
  const sources = await Promise.all(DEV_CSS_PATHS.map(readRepoFile))
  return sources.join('\n')
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function includesAll(source = '', markers = []) {
  return markers.every(marker => String(source || '').includes(marker))
}

function buildSyntheticFreshnessSnapshot() {
  return buildSynthesisRouterFreshnessSnapshot({
    now: '2026-05-26T03:00:00.000Z',
    jobs: [
      {
        key: 'intelligence-synthesis-spine-refresh',
        latestRun: {
          runId: 'synthesis-2026-05-26T01:00:00.000Z',
          jobKey: 'intelligence-synthesis-spine-refresh',
          status: 'succeeded',
          finishedAt: '2026-05-26T01:00:00.000Z',
        },
      },
      {
        key: 'gmail-sync-current',
        latestRun: {
          runId: 'gmail-sync-2026-05-26T02:00:00.000Z',
          jobKey: 'gmail-sync-current',
          status: 'succeeded',
          finishedAt: '2026-05-26T02:00:00.000Z',
        },
      },
      {
        key: 'youtube-god-mode-autonomous-watch-scheduler',
        latestRun: {
          runId: 'youtube-watch-2026-05-26T02:10:00.000Z',
          jobKey: 'youtube-god-mode-autonomous-watch-scheduler',
          status: 'succeeded',
          finishedAt: '2026-05-26T02:10:00.000Z',
        },
      },
    ],
  })
}

function buildSyntheticMaturitySnapshot() {
  const paritySnapshot = buildGodModeExtractorParitySnapshot({
    generatedAt: '2026-05-26T03:00:00.000Z',
    activeExtractionLanes: [
      {
        laneId: 'youtube-video-intelligence-pipeline',
        latestRunAt: '2026-05-26T02:10:00.000Z',
      },
      {
        laneId: 'synthesis-router',
        latestRunAt: '2026-05-26T01:00:00.000Z',
      },
    ],
  })
  return buildSourceFamilyGodModeMaturitySnapshot({
    paritySnapshot,
    freshnessSnapshot: buildSyntheticFreshnessSnapshot(),
    generatedAt: '2026-05-26T03:00:00.000Z',
  })
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
    devCssSource,
    planSource,
    backlogSeedSource,
    coverageSource,
    closeoutRegistrySource,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/source-family-god-mode-extractors.js'),
    readRepoFile(SOURCE_FAMILY_GOD_MODE_EXTRACTORS_SCRIPT_PATH),
    readRepoFile('lib/dev-team-hub.js'),
    readRepoFile('public/dev.js'),
    readDevCssBundle(),
    readRepoFile('docs/process/source-family-god-mode-extractors-001-plan.md'),
    readRepoFile('lib/foundation-backlog-seed-chunks/chunk-005.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-source-records.js'),
  ])

  const snapshot = buildSyntheticMaturitySnapshot()
  const evaluation = evaluateSourceFamilyGodModeMaturity(snapshot)
  const dogfood = buildSourceFamilyGodModeMaturityDogfoodProof()
  const devDogfood = buildDevTeamHubV0DogfoodProof()
  const devSnapshot = buildDevTeamHubV0Snapshot({
    dailyWatch: {
      status: 'healthy',
      ok: true,
      researchPool: [{ itemKey: 'yt:synthetic', creatorId: 'synthetic', creator: 'Synthetic', videoId: 'v1', title: 'Synthetic', proposalOnly: true }],
      creators: [{ creatorId: 'synthetic', displayName: 'Synthetic', publicNoAuth: true }],
    },
    scoutBundle: {
      report: {
        reportArtifactId: 'synthetic-scout',
        structuredOutputJson: {
          opportunities: [{ title: 'Synthetic build', observation: 'Synthetic', recommendedNextStep: 'Review', confidence: 'high' }],
          reviewRoutes: [{ proposalOnly: true, writesBacklog: false, externalWrites: false }],
        },
      },
      atoms: [{ atomId: 'atom-1' }],
      hits: [{ hitId: 'hit-1' }],
    },
    actionRouter: { recentRoutes: [] },
  })
  const familyIds = new Set(snapshot.families.map(family => family.familyId))
  const youtubeFamily = snapshot.families.find(family => family.familyId === 'youtube-public-videos')
  const gmailMissiveFamily = snapshot.families.find(family => family.familyId === 'gmail-missive')
  const commentsFamily = snapshot.families.find(family => family.familyId === 'youtube-public-comments')

  addCheck(
    checks,
    packageJson.scripts?.['process:source-family-god-mode-extractors-check'] === `node --env-file-if-exists=.env ${SOURCE_FAMILY_GOD_MODE_EXTRACTORS_SCRIPT_PATH}`,
    'package exposes focused source-family God Mode maturity proof',
    packageJson.scripts?.['process:source-family-god-mode-extractors-check'] || 'missing'
  )
  addCheck(
    checks,
    includesAll(moduleSource, [
      'buildSourceFamilyGodModeMaturitySnapshot',
      'evaluateSourceFamilyGodModeMaturity',
      'buildSourceFamilyGodModeMaturityDogfoodProof',
      'SOURCE_FAMILY_GOD_MODE_REQUIRED_FIELDS',
    ]),
    'source-family maturity module owns snapshot, evaluator, and dogfood',
    'lib/source-family-god-mode-extractors.js'
  )
  addCheck(
    checks,
    GOD_MODE_REQUIRED_FAMILY_IDS.every(familyId => familyIds.has(familyId)) && snapshot.families.length >= GOD_MODE_REQUIRED_FAMILY_IDS.length,
    'maturity snapshot covers every required source family',
    `${snapshot.families.length} families`
  )
  addCheck(
    checks,
    evaluation.ok === true,
    'current maturity snapshot has no false God Mode readiness',
    evaluation.findings.map(item => `${item.familyId}:${item.ruleId}`).join(', ') || 'ok'
  )
  addCheck(
    checks,
    dogfood.ok === true,
    'dogfood rejects partial YouTube, paid/private, comments, and missing-field false readiness',
    JSON.stringify(dogfood.cases)
  )
  addCheck(
    checks,
    youtubeFamily?.latestSuccessfulRunAt === '2026-05-26T02:10:00.000Z' &&
      gmailMissiveFamily?.freshnessStatus === 'waiting_for_extractor',
    'freshness overlay reaches source-family maturity rows',
    `youtube=${youtubeFamily?.latestSuccessfulRunAt || 'missing'} gmailMissive=${gmailMissiveFamily?.freshnessStatus || 'missing'}`
  )
  addCheck(
    checks,
    commentsFamily?.maturityState === 'operator_excluded' &&
      commentsFamily?.nextBestAction?.includes('No active extractor work'),
    'YouTube comments remain operator-excluded in maturity layer',
    commentsFamily?.maturityState || 'missing'
  )
  addCheck(
    checks,
    devDogfood.ok === true &&
      devSnapshot.sourceFamilyGodModeMaturity?.summary?.familyCount >= 13 &&
      devSnapshot.sourceFamilyGodModeMaturity?.evaluation?.ok === true,
    'Dev Hub exposes source-family God Mode maturity payload',
    `dogfood=${devDogfood.ok} families=${devSnapshot.sourceFamilyGodModeMaturity?.summary?.familyCount || 0}`
  )
  addCheck(
    checks,
    includesAll(devHubSource, ['sourceFamilyGodModeMaturity', 'buildSourceFamilyGodModeMaturitySnapshot', 'evaluateSourceFamilyGodModeMaturity']) &&
      includesAll(devJsSource, ['sourceFamilyGodModeMaturity', 'freshnessStatus', 'latestSuccessfulRunAt', 'nextBestAction']) &&
      includesAll(devCssSource, ['.parity-meta', '.parity-next p']),
    'Dev UI renders maturity readback fields inside the parity matrix',
    'lib/dev-team-hub.js + public/dev.js + public/dev.css'
  )
  addCheck(
    checks,
    includesAll(planSource, [
      'process:source-family-god-mode-extractors-check',
      'no-spend',
      'No paid/private/auth navigation',
      'latest successful run',
      'freshness state',
    ]),
    'source-family plan names the focused proof and live maturity fields',
    'docs/process/source-family-god-mode-extractors-001-plan.md'
  )
  addCheck(
    checks,
    backlogSeedSource.includes(SOURCE_FAMILY_GOD_MODE_EXTRACTORS_CARD_ID) &&
      backlogSeedSource.includes('source-family-god-mode-extractors-v1') &&
      backlogSeedSource.includes('process:source-family-god-mode-extractors-check'),
    'backlog seed records the source-family maturity closeout path',
    'lib/foundation-backlog-seed-chunks/chunk-005.js'
  )
  addCheck(
    checks,
    coverageSource.includes(SOURCE_FAMILY_GOD_MODE_EXTRACTORS_CARD_ID) &&
      closeoutRegistrySource.includes(SOURCE_FAMILY_GOD_MODE_EXTRACTORS_CLOSEOUT_KEY),
    'verifier coverage and closeout registry include this maturity closeout',
    SOURCE_FAMILY_GOD_MODE_EXTRACTORS_CLOSEOUT_KEY
  )
  addCheck(
    checks,
    !/updateBacklogItem|createBacklogItem|insertDecision|writeFile|appendFile|fetch\(/.test(moduleSource),
    'maturity proof is read-only and no-spend',
    'no destination writes or network calls in source-family proof'
  )

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'healthy',
    cardId: SOURCE_FAMILY_GOD_MODE_EXTRACTORS_CARD_ID,
    closeoutKey: SOURCE_FAMILY_GOD_MODE_EXTRACTORS_CLOSEOUT_KEY,
    summary: snapshot.summary,
    checks,
    failed,
  }

  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`Source-family God Mode maturity proof: ${result.status}`)
    for (const check of checks) console.log(`  ${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` - ${check.detail}` : ''}`)
  }

  if (!result.ok) process.exit(1)
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exit(1)
})
