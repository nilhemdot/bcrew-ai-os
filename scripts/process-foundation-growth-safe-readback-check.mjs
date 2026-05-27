#!/usr/bin/env node

import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  FOUNDATION_GROWTH_SAFE_READBACK_APPROVAL_PATH,
  FOUNDATION_GROWTH_SAFE_READBACK_CARD_ID,
  FOUNDATION_GROWTH_SAFE_READBACK_PLAN_PATH,
  buildCreatorLeaderboard,
  buildFoundationGrowthSafeReadbackDogfoodProof,
  buildFoundationGrowthSafeReadbackSnapshot,
} from '../lib/foundation-growth-safe-readback.js'

const execFileAsync = promisify(execFile)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    skipLiveDevHub: argv.includes('--skip-live-dev-hub'),
  }
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

function parseJsonFromOutput(raw = '') {
  const text = String(raw || '').trim()
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first < 0 || last < first) throw new Error(`Could not parse JSON output: ${text.slice(0, 500)}`)
  return JSON.parse(text.slice(first, last + 1))
}

async function runDevHubProof() {
  const { stdout } = await execFileAsync(process.execPath, ['scripts/process-dev-team-hub-v0-check.mjs', '--json'], {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024 * 20,
  })
  return parseJsonFromOutput(stdout)
}

function buildSyntheticSnapshot({ routeSource = '', devPageSource = '', devHubCheckSource = '' } = {}) {
  const sourceValueGrader = {
    sourceGrades: [
      { creatorId: 'agentic-browser', creator: 'Agentic Browser Source', devBuildGrade: 'S', overallGrade: 'S', buildCandidates: 12, watchedVideos: 10, laneScores: [{ laneId: 'aios_dev_build', grade: 'S', score: 94 }] },
      { creatorId: 'marketing-creator', creator: 'Marketing Creator', devBuildGrade: 'C', overallGrade: 'A', buildCandidates: 9, watchedVideos: 10, laneScores: [{ laneId: 'aios_dev_build', grade: 'C', score: 38 }, { laneId: 'marketing_lead_gen', grade: 'A', score: 80 }] },
      { creatorId: 'ops-creator', creator: 'Ops Creator', devBuildGrade: 'A', overallGrade: 'A', buildCandidates: 8, watchedVideos: 10, laneScores: [{ laneId: 'aios_dev_build', grade: 'A', score: 78 }] },
    ],
    topDevBuildSources: [
      { creatorId: 'agentic-browser', creator: 'Agentic Browser Source', devBuildGrade: 'S', overallGrade: 'S', buildCandidates: 12, watchedVideos: 10, laneScores: [{ laneId: 'aios_dev_build', grade: 'S', score: 94 }] },
    ],
    topByLane: [
      {
        laneId: 'aios_dev_build',
        label: 'AIOS / Dev build',
        totalSourceCount: 3,
        showingCount: 1,
        hasMore: true,
        gradeBuckets: { S: 1, A: 1, C: 1 },
        sources: [{ creatorId: 'agentic-browser', creator: 'Agentic Browser Source', grade: 'S', score: 94 }],
      },
    ],
  }
  const creatorLeaderboard = buildCreatorLeaderboard(sourceValueGrader)
  return buildFoundationGrowthSafeReadbackSnapshot({
    devHubSnapshot: {
      sourceValueGrader,
      youtubeCreatorGodModeCatchup: {
        summary: { creatorCount: 3, trackedMetadataCount: 30, videoAudioVisualWatchedCount: 20 },
        creators: [
          { creatorId: 'agentic-browser' },
          { creatorId: 'marketing-creator' },
          { creatorId: 'ops-creator' },
        ],
      },
      youtubeSourceIntelligence: {
        creatorLeaderboard,
        topCreators: creatorLeaderboard.slice(0, 1),
        readbackTruth: {
          creatorLeaderboardCount: creatorLeaderboard.length,
          fullWatchReportReadbackRoute: 'getIntelligenceAtomSpineSnapshot({ limit: 500 })',
          geminiCallReadbackRoute: "listLlmCalls({ provider: 'gemini', workload: 'video_vision', status: 'succeeded', limit: 5000 })",
        },
      },
    },
    routeSource,
    devPageSource,
    devHubCheckSource,
  })
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    planSource,
    approvalValidation,
    backlogSeedSource,
    routeSource,
    devHubSource,
    sourceGraderSource,
    devPageSource,
    devHubCheckSource,
    packageSource,
  ] = await Promise.all([
    readRepoFile(FOUNDATION_GROWTH_SAFE_READBACK_PLAN_PATH),
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: FOUNDATION_GROWTH_SAFE_READBACK_APPROVAL_PATH,
      cardId: FOUNDATION_GROWTH_SAFE_READBACK_CARD_ID,
    }),
    readRepoFile('lib/foundation-backlog-seed-chunks/chunk-005.js'),
    readRepoFile('lib/foundation-build-intel-routes.js'),
    readRepoFile('lib/dev-team-hub.js'),
    readRepoFile('lib/build-intel-source-value-grader.js'),
    readRepoFile('public/dev.js'),
    readRepoFile('scripts/process-dev-team-hub-v0-check.mjs'),
    readRepoFile('package.json'),
  ])

  const dogfood = buildFoundationGrowthSafeReadbackDogfoodProof()
  const syntheticSnapshot = buildSyntheticSnapshot({ routeSource, devPageSource, devHubCheckSource })
  let devHubProof = null
  if (!args.skipLiveDevHub) {
    devHubProof = await runDevHubProof()
  }

  addCheck(checks, approvalValidation.ok && Number(approvalValidation.approval?.score) >= 9.8, 'approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || FOUNDATION_GROWTH_SAFE_READBACK_APPROVAL_PATH)
  addCheck(checks, backlogSeedSource.includes(FOUNDATION_GROWTH_SAFE_READBACK_CARD_ID), 'backlog seed contains the active readback card', FOUNDATION_GROWTH_SAFE_READBACK_CARD_ID)
  addCheck(checks, packageSource.includes('process:foundation-growth-safe-readback-check'), 'package script is registered', 'process:foundation-growth-safe-readback-check')
  addCheck(checks, planSource.includes('artificial ceilings') && planSource.includes('hidden top-N') && planSource.includes('shared lane grading'), 'plan captures the actual operator problem', FOUNDATION_GROWTH_SAFE_READBACK_PLAN_PATH)
  addCheck(checks, dogfood.ok === true, 'dogfood catches hidden preview caps and failed-ledger/successful-artifact drift', JSON.stringify({ creatorRows: list(dogfood.creatorLeaderboard).length, postRunLedger: dogfood.postRunLedger?.status }))
  addCheck(checks, syntheticSnapshot.ok === true, 'synthetic readback contract passes', syntheticSnapshot.failures.map(item => item.check).join(', ') || 'healthy')
  addCheck(
    checks,
    [
      'sales_conversion',
      'marketing_recruiting',
      'marketing_lead_gen',
      'steve_ai_authority',
      'product_tool_evaluation',
    ].every(laneId => sourceGraderSource.includes(laneId)),
    'source grader includes Steve-required shared business lanes',
    'sales/recruiting/lead-gen/authority/product-tool lanes',
  )
  addCheck(checks, devHubSource.includes('buildCreatorLeaderboard') && devHubSource.includes('creatorLeaderboard') && devHubSource.includes('readbackTruth'), 'Dev Hub payload separates full creator leaderboard from preview rows', 'lib/dev-team-hub.js')
  addCheck(checks, devPageSource.includes('system.creatorLeaderboard') && !devPageSource.includes('SOURCE_LEADERBOARD_LIMIT'), 'Dev page renders the full creator ranking without a hidden top-N constant', 'public/dev.js')
  addCheck(checks, devHubCheckSource.includes('full creator ranking plus preview rows'), 'Dev Hub proof protects full creator readback', 'scripts/process-dev-team-hub-v0-check.mjs')
  if (devHubProof) {
    const liveYoutube = devHubProof.snapshot?.youtubeSourceIntelligence || {}
    addCheck(checks, devHubProof.ok === true, 'live Dev Hub proof remains green', devHubProof.status || 'unknown')
    addCheck(
      checks,
      Number(liveYoutube.creatorLeaderboard || 0) >= Number(liveYoutube.topCreators || 0) &&
        Number(liveYoutube.creatorLeaderboard || 0) >= 3,
      'live Dev Hub summary exposes full creator leaderboard count',
      `full=${liveYoutube.creatorLeaderboard || 0}; preview=${liveYoutube.topCreators || 0}`,
    )
    addCheck(
      checks,
      liveYoutube.readbackTruth?.sourceGraderReadback?.laneTotalsProven === true &&
        Number(liveYoutube.readbackTruth?.sourceGraderReadback?.lanePreviewCount || 0) >= 1,
      'live source-grader readback proves lane totals and preview counts',
      JSON.stringify(liveYoutube.readbackTruth?.sourceGraderReadback || {}),
    )
  }

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'healthy',
    cardId: FOUNDATION_GROWTH_SAFE_READBACK_CARD_ID,
    readOnly: true,
    reportOnly: true,
    syntheticSnapshot,
    devHubProof: devHubProof ? {
      status: devHubProof.status,
      youtubeSourceIntelligence: devHubProof.snapshot?.youtubeSourceIntelligence,
    } : null,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Foundation growth-safe readback proof: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }
  process.exitCode = failed.length ? 1 : 0
}

main().catch(error => {
  console.error('Foundation growth-safe readback proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
