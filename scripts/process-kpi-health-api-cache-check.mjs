#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { closeFoundationDb } from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  KPI_HEALTH_API_CACHE_APPROVAL_PATH,
  KPI_HEALTH_API_CACHE_CARD_ID,
  KPI_HEALTH_API_CACHE_CLOSEOUT_KEY,
  KPI_HEALTH_API_CACHE_PLAN_PATH,
  KPI_HEALTH_API_CACHE_SCRIPT_PATH,
  KPI_HEALTH_API_CACHE_SPRINT_ID,
  KPI_HEALTH_FETCH_TIMEOUT_MS,
  buildKpiHealthApiCacheDogfoodProof,
  getCachedSafeKpiHealthSnapshot,
} from '../lib/kpi-health.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    baseUrl: process.env.FOUNDATION_BASE_URL || 'http://localhost:3000',
  }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg.startsWith('--base-url=')) args.baseUrl = arg.slice('--base-url='.length)
  }
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readText(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function fetchMeasured(baseUrl, route) {
  const startedAt = Date.now()
  const headers = {}
  if (process.env.ADMIN_TOKEN) headers['X-Admin-Token'] = process.env.ADMIN_TOKEN
  const response = await fetch(`${String(baseUrl).replace(/\/$/, '')}${route}`, {
    headers,
    redirect: 'manual',
  })
  const text = await response.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  return {
    route,
    status: response.status,
    ok: response.ok,
    durationMs: Date.now() - startedAt,
    bytes: Buffer.byteLength(text),
    contentType: response.headers.get('content-type') || '',
    json,
  }
}

function scriptIsReadOnly(scriptSource = '') {
  const source = String(scriptSource || '')
  const forbiddenTokens = [
    'create' + 'BacklogItem',
    'update' + 'BacklogItem',
    'upsert' + 'FoundationCurrentSprintOverlay',
    'INSERT' + ' INTO',
    'UPDATE' + ' ',
    'DELETE' + ' FROM',
    'fs.' + 'writeFile',
    'write' + 'File(',
  ]
  return forbiddenTokens.every(token => !source.includes(token))
}

function cacheStatusIsKnown(status) {
  return ['memory', 'persisted', 'refreshed'].includes(String(status || ''))
}

function summarizeRoute(route = {}) {
  return `${route.route}:${route.status}/${route.durationMs}ms/${route.bytes}B`
}

async function main() {
  const args = parseArgs()
  const checks = []

  const [
    approval,
    cards,
    activeSprint,
    planCriticRuns,
    packageSource,
    kpiHealthSource,
    sourceTruthPayloadSource,
    hubReadRoutesSource,
    verifierSource,
    scriptSource,
    planSource,
    dogfood,
    cachedSnapshot,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: KPI_HEALTH_API_CACHE_APPROVAL_PATH,
      cardId: KPI_HEALTH_API_CACHE_CARD_ID,
    }),
    getBacklogItemsByIds([KPI_HEALTH_API_CACHE_CARD_ID]),
    getActiveFoundationCurrentSprint().catch(() => ({ sprint: null, items: [], planCriticRuns: [] })),
    getPlanCriticRunsByCardIds([KPI_HEALTH_API_CACHE_CARD_ID]),
    readText('package.json'),
    readText('lib/kpi-health.js'),
    readText('lib/source-of-truth-payload.js'),
    readText('lib/hub-read-routes.js'),
    readText('scripts/foundation-verify.mjs'),
    readText(KPI_HEALTH_API_CACHE_SCRIPT_PATH),
    readText(KPI_HEALTH_API_CACHE_PLAN_PATH),
    buildKpiHealthApiCacheDogfoodProof(),
    getCachedSafeKpiHealthSnapshot(),
  ])

  const card = cards[0] || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === KPI_HEALTH_API_CACHE_CARD_ID) || null
  const planCritic = planCriticRuns.find(run => run.cardId === KPI_HEALTH_API_CACHE_CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8) || null

  addCheck(checks, approval.ok, 'Plan approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || KPI_HEALTH_API_CACHE_APPROVAL_PATH)
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, activeSprint.sprint?.sprintId === KPI_HEALTH_API_CACHE_SPRINT_ID, 'Current Sprint is the KPI health API cache sprint', activeSprint.sprint?.sprintId || 'missing')
  addCheck(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains the card in Building Now or Done', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  addCheck(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  addCheck(checks, dogfood.ok, 'dogfood slow KPI fetch times out instead of hanging', dogfood.timeout?.errorMessage || 'missing dogfood timeout')
  addCheck(checks, dogfood.timeout?.abortObserved === true, 'dogfood observes AbortSignal on slow KPI fetch', JSON.stringify(dogfood.timeout || {}))
  addCheck(checks, Number.isFinite(Number(KPI_HEALTH_FETCH_TIMEOUT_MS)) && KPI_HEALTH_FETCH_TIMEOUT_MS >= 1000, 'KPI health fetch timeout has bounded default', `${KPI_HEALTH_FETCH_TIMEOUT_MS}ms`)
  addCheck(checks, scriptIsReadOnly(scriptSource), 'focused KPI health proof script is read-only by default', 'no live backlog/sprint/write tokens')
  addCheck(checks, packageSource.includes('"process:kpi-health-api-cache-check"'), 'package exposes KPI health API cache process check', 'package.json')
  addCheck(checks, kpiHealthSource.includes('AbortController') && kpiHealthSource.includes('KPI_HEALTH_FETCH_TIMEOUT_MS'), 'KPI health fetch path uses AbortController timeout', 'lib/kpi-health.js')
  addCheck(checks, kpiHealthSource.includes('buildKpiHealthApiCacheDogfoodProof') && kpiHealthSource.includes('timed out after'), 'KPI health module owns dogfood timeout proof', 'lib/kpi-health.js')
  addCheck(checks, sourceTruthPayloadSource.includes('getCachedSafeKpiHealthSnapshot'), '/api/source-of-truth uses cached safe KPI health', 'lib/source-of-truth-payload.js')
  addCheck(checks, hubReadRoutesSource.includes('getCachedSafeKpiHealthSnapshot'), 'Foundation hub full route uses cached safe KPI health', 'lib/hub-read-routes.js')
  addCheck(checks, verifierSource.includes('buildKpiHealthApiCacheDogfoodProof') && verifierSource.includes('KPI_HEALTH_API_CACHE_CLOSEOUT_KEY'), 'foundation verifier delegates KPI health API cache dogfood proof', 'scripts/foundation-verify.mjs')
  addCheck(checks, planSource.includes('Operator value and useful operator behavior'), 'plan explains operator value instead of only technical mechanics', KPI_HEALTH_API_CACHE_PLAN_PATH)

  const cachedStatus = cachedSnapshot?.routeCache?.cacheStatus || null
  addCheck(checks, cacheStatusIsKnown(cachedStatus), 'direct cached KPI health snapshot exposes cache metadata', cachedStatus || 'missing')

  const routeResults = [
    await fetchMeasured(args.baseUrl, '/api/source-of-truth'),
    await fetchMeasured(args.baseUrl, '/api/foundation-hub?view=full'),
  ]
  const sourceTruth = routeResults[0].json || {}
  const foundationHub = routeResults[1].json || {}
  const sourceCacheStatus = sourceTruth.kpiHealth?.routeCache?.cacheStatus || null
  const hubCacheStatus = foundationHub.kpiHealth?.routeCache?.cacheStatus || null

  addCheck(checks, routeResults.every(route => route.ok), 'source truth and Foundation Hub KPI routes return 2xx', routeResults.map(summarizeRoute).join(', '))
  addCheck(checks, cacheStatusIsKnown(sourceCacheStatus), '/api/source-of-truth exposes KPI cache metadata', sourceCacheStatus || 'missing')
  addCheck(checks, cacheStatusIsKnown(hubCacheStatus), '/api/foundation-hub?view=full exposes KPI cache metadata', hubCacheStatus || 'missing')
  addCheck(checks, routeResults[0].durationMs <= 2000, '/api/source-of-truth stays inside latency budget', summarizeRoute(routeResults[0]))
  addCheck(checks, routeResults[1].durationMs <= 15000, '/api/foundation-hub?view=full stays inside safety budget', summarizeRoute(routeResults[1]))

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'unhealthy' : 'healthy',
    cardId: KPI_HEALTH_API_CACHE_CARD_ID,
    closeoutKey: KPI_HEALTH_API_CACHE_CLOSEOUT_KEY,
    timeoutMs: KPI_HEALTH_FETCH_TIMEOUT_MS,
    dogfood,
    cache: {
      direct: cachedSnapshot?.routeCache || null,
      sourceOfTruth: sourceTruth.kpiHealth?.routeCache || null,
      foundationHub: foundationHub.kpiHealth?.routeCache || null,
    },
    routeResults: routeResults.map(route => ({
      route: route.route,
      status: route.status,
      durationMs: route.durationMs,
      bytes: route.bytes,
      contentType: route.contentType,
    })),
    checks,
    failures,
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  } else {
    process.stdout.write(`${result.status}: ${checks.length - failures.length}/${checks.length} checks passed\n`)
    for (const failure of failures) {
      process.stdout.write(`- ${failure.check}: ${failure.detail}\n`)
    }
  }

  if (failures.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb()
  })
