#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  buildFoundationHubPayloadDogfoodProof,
  evaluateFoundationHubPayloadBudget,
} from '../lib/foundation-hub-summary-payload.js'
import {
  buildSourceOfTruthRouteDogfoodProof,
  evaluateSourceOfTruthRouteBudget,
} from '../lib/source-of-truth-payload.js'
import { refreshKpiHealthRouteCache } from '../lib/kpi-health.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const SPRINT_ID = 'foundation-route-budget-cleanup-2026-05-14'
const CARDS = [
  {
    cardId: 'SOURCE-OF-TRUTH-PERF-BUDGET-001',
    planRef: 'docs/process/source-of-truth-perf-budget-001-plan.md',
    approvalRef: 'docs/process/approvals/SOURCE-OF-TRUTH-PERF-BUDGET-001.json',
  },
  {
    cardId: 'FOUNDATION-HUB-PAYLOAD-EXTRACT-001',
    planRef: 'docs/process/foundation-hub-payload-extract-001-plan.md',
    approvalRef: 'docs/process/approvals/FOUNDATION-HUB-PAYLOAD-EXTRACT-001.json',
  },
]

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false, baseUrl: 'http://127.0.0.1:3000' }
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

async function measureJsonRoute(baseUrl, routePath) {
  const url = new URL(routePath, baseUrl)
  const started = performance.now()
  const response = await fetch(url)
  const text = await response.text()
  const durationMs = Math.round(performance.now() - started)
  let data = null
  try {
    data = JSON.parse(text)
  } catch {
    data = null
  }
  return {
    routePath,
    ok: response.ok,
    status: response.status,
    durationMs,
    bytes: Buffer.byteLength(text),
    data,
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const cardIds = CARDS.map(card => card.cardId)

  const [
    approvals,
    sprint,
    planCriticRuns,
    backlogCards,
    packageSource,
    serverSource,
    kpiHealthSource,
    sourceTruthSource,
    hubPayloadSource,
  ] = await Promise.all([
    Promise.all(CARDS.map(card => validatePlanApprovalFile({
      repoRoot,
      approvalRef: card.approvalRef,
      cardId: card.cardId,
    }))),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds(cardIds),
    getBacklogItemsByIds(cardIds),
    readRepoFile('package.json'),
    readRepoFile('server.js'),
    readRepoFile('lib/kpi-health.js'),
    readRepoFile('lib/source-of-truth-payload.js'),
    readRepoFile('lib/foundation-hub-summary-payload.js'),
  ])
  await closeFoundationDb()

  const packageJson = JSON.parse(packageSource)
  const sourceDogfood = buildSourceOfTruthRouteDogfoodProof()
  const hubDogfood = buildFoundationHubPayloadDogfoodProof()

  addCheck(
    checks,
    approvals.every(result => result.ok && Number(result.approval?.score) >= 9.8),
    'all route-budget approval files validate at 9.8+',
    approvals.filter(result => !result.ok).map(result => result.approvalRef).join(', ') || 'all valid',
  )
  addCheck(
    checks,
    cardIds.every(cardId => planCriticRuns.some(run => run.cardId === cardId && run.status === 'pass' && Number(run.score) >= 9.8)),
    'both durable Plan Critic rows pass',
    planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', '),
  )
  addCheck(
    checks,
    backlogCards.length === CARDS.length && backlogCards.every(card => ['scoped', 'done'].includes(card.lane)),
    'both backlog cards exist in scoped/done lanes',
    backlogCards.map(card => `${card.id}:${card.lane}`).join(', '),
  )
  addCheck(
    checks,
    sprint.sprint?.sprintId === SPRINT_ID &&
      cardIds.every(cardId => sprint.items.some(item => item.cardId === cardId && ['sprint_ready', 'building_now', 'done_this_sprint'].includes(item.stage))),
    'Current Sprint contains both cards with active stage truth',
    sprint.sprint ? `${sprint.sprint.sprintId} ${sprint.items.map(item => `${item.cardId}:${item.stage}`).join(', ')}` : 'missing sprint',
  )

  addCheck(
    checks,
    sourceDogfood.ok && sourceDogfood.failing.ok === false && sourceDogfood.passing.ok === true,
    'source-of-truth dogfood rejects old over-latency measurement',
    sourceDogfood.invariant,
  )
  addCheck(
    checks,
    hubDogfood.ok && hubDogfood.failing.ok === false && hubDogfood.passing.ok === true,
    'Foundation Hub dogfood rejects old over-budget payload',
    hubDogfood.invariant,
  )
  addCheck(
    checks,
    serverSource.includes('buildSourceOfTruthPayload') &&
      serverSource.includes('compactFoundationJobRunSnapshot') &&
      serverSource.includes('compactFoundationReviewSprintSnapshot') &&
      serverSource.includes('compactResearchCurationSnapshot') &&
      kpiHealthSource.includes('getCachedSafeKpiHealthSnapshot') &&
      kpiHealthSource.includes('KPI_HEALTH_ROUTE_CACHE_MAX_AGE_MS') &&
      sourceTruthSource.includes('buildSourceOfTruthPayload') &&
      hubPayloadSource.includes('compactFoundationJobRunSnapshot') &&
      hubPayloadSource.includes('compactResearchCurationSnapshot'),
    'route behavior is extracted and cached instead of growing server monolith hot paths',
    'source-of-truth payload module, KPI route cache, and Foundation Hub compact helper present',
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:foundation-route-budget-cleanup-check'] === 'node --env-file-if-exists=.env scripts/process-foundation-route-budget-cleanup-check.mjs',
    'focused proof script is registered',
    packageJson.scripts?.['process:foundation-route-budget-cleanup-check'] || 'missing',
  )

  const refreshedKpi = await refreshKpiHealthRouteCache()
  addCheck(
    checks,
    refreshedKpi?.summary?.probeSilent === false &&
      Number(refreshedKpi.contractVersion) === 1 &&
      refreshedKpi.routeCache?.cacheStatus === 'refreshed',
    'KPI route cache refresh preserves full health contract',
    `cache=${refreshedKpi?.routeCache?.cacheStatus || 'missing'} tables=${refreshedKpi?.tables?.length || 0} rpcs=${refreshedKpi?.rpcs?.length || 0}`,
  )

  const sourceMeasurement = await measureJsonRoute(args.baseUrl, '/api/source-of-truth')
  const sourceBudget = evaluateSourceOfTruthRouteBudget({
    durationMs: sourceMeasurement.durationMs,
    bytes: sourceMeasurement.bytes,
  })
  addCheck(
    checks,
    sourceMeasurement.ok &&
      sourceBudget.ok &&
      Array.isArray(sourceMeasurement.data?.sources) &&
      Array.isArray(sourceMeasurement.data?.connectors) &&
      Array.isArray(sourceMeasurement.data?.groupedSystems) &&
      sourceMeasurement.data?.kpiHealth?.summary?.probeSilent === false &&
      ['memory', 'persisted', 'refreshed'].includes(sourceMeasurement.data?.kpiHealth?.routeCache?.cacheStatus),
    '/api/source-of-truth stays contract-compatible and under route budget',
    `status=${sourceMeasurement.status} durationMs=${sourceMeasurement.durationMs} bytes=${sourceMeasurement.bytes} cache=${sourceMeasurement.data?.kpiHealth?.routeCache?.cacheStatus || 'missing'}`,
  )

  const foundationHubMeasurement = await measureJsonRoute(args.baseUrl, '/api/foundation-hub')
  const hubBudget = evaluateFoundationHubPayloadBudget({ bytes: foundationHubMeasurement.bytes })
  addCheck(
    checks,
    foundationHubMeasurement.ok &&
      hubBudget.ok &&
      foundationHubMeasurement.data?.foundationJobs?.fullPayloadCompacted === true &&
      foundationHubMeasurement.data?.foundation1100Review?.fullPayloadCompacted === true &&
      foundationHubMeasurement.data?.researchCuration?.fullPayloadCompacted === true &&
      Array.isArray(foundationHubMeasurement.data?.foundationJobs?.jobs) &&
      Array.isArray(foundationHubMeasurement.data?.researchCuration?.cards) &&
      foundationHubMeasurement.data.researchCuration.cards.length <= 12,
    '/api/foundation-hub default payload is compacted and under payload budget',
    `status=${foundationHubMeasurement.status} durationMs=${foundationHubMeasurement.durationMs} bytes=${foundationHubMeasurement.bytes} jobs=${foundationHubMeasurement.data?.foundationJobs?.jobs?.length || 0} researchCards=${foundationHubMeasurement.data?.researchCuration?.cards?.length || 0}`,
  )

  const summary = {
    ok: checks.every(check => check.ok),
    checks,
    measurements: {
      sourceOfTruth: {
        durationMs: sourceMeasurement.durationMs,
        bytes: sourceMeasurement.bytes,
        budget: sourceBudget,
      },
      foundationHub: {
        durationMs: foundationHubMeasurement.durationMs,
        bytes: foundationHubMeasurement.bytes,
        budget: hubBudget,
      },
    },
    dogfood: {
      sourceDogfood,
      hubDogfood,
    },
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} -> ${check.detail}`)
    }
    console.log(`SOURCE_OF_TRUTH ${sourceMeasurement.durationMs}ms ${sourceMeasurement.bytes} bytes`)
    console.log(`FOUNDATION_HUB ${foundationHubMeasurement.durationMs}ms ${foundationHubMeasurement.bytes} bytes`)
  }

  if (!summary.ok) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
})
