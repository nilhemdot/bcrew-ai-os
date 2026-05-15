#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'
import {
  HUB_READ_ROUTES_SPLIT_APPROVAL_PATH,
  HUB_READ_ROUTES_SPLIT_BEFORE_SERVER_LINES,
  HUB_READ_ROUTES_SPLIT_CARD_ID,
  HUB_READ_ROUTES_SPLIT_CLOSEOUT_KEY,
  HUB_READ_ROUTES_SPLIT_PLAN_PATH,
  HUB_READ_ROUTES_SPLIT_ROUTE_BUDGET_BYTES,
  HUB_READ_ROUTES_SPLIT_ROUTE_BUDGET_MS,
  HUB_READ_ROUTES_SPLIT_SCRIPT_PATH,
  HUB_READ_ROUTES_SPLIT_SPRINT_ID,
  buildHubReadRoutesSplitDogfoodProof,
} from '../lib/hub-read-routes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    args[key] = value ?? true
  }
  return args
}

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function fetchMeasured(baseUrl, pathname) {
  const startedAt = Date.now()
  const response = await fetch(new URL(pathname, baseUrl), { redirect: 'manual' })
  const text = await response.text()
  const durationMs = Date.now() - startedAt
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  return {
    pathname,
    status: response.status,
    ok: response.ok,
    durationMs,
    bytes: Buffer.byteLength(text),
    contentType: response.headers.get('content-type') || '',
    cacheControl: response.headers.get('cache-control') || '',
    json,
  }
}

function routeSummary(routes = []) {
  return routes
    .map(route => `${route.pathname}:${route.status}/${route.durationMs}ms/${route.bytes}B/${route.contentType || 'unknown'}`)
    .join(', ')
}

function moduleOwnsHubReadRoutes(moduleSource = '') {
  const source = String(moduleSource || '')
  return [
    'registerHubReadRoutes',
    "app.get('/api/foundation-hub'",
    "app.get('/api/foundation/current-sprint'",
    "app.get('/api/ops-hub'",
    "app.get('/api/sales-hub'",
    'buildFoundationHubSummaryPayload',
    'sendFoundationHubPayload',
  ].every(marker => source.includes(marker))
}

function serverNoLongerOwnsHubReadRoutes(serverSource = '') {
  const source = String(serverSource || '')
  return [
    "app.get('/api/foundation-hub'",
    "app.get('/api/foundation/current-sprint'",
    "app.get('/api/ops-hub'",
    "app.get('/api/sales-hub'",
  ].every(marker => !source.includes(marker))
}

function salesWriteRoutesRemainInServer(serverSource = '', moduleSource = '') {
  const writeMarkers = [
    "app.post('/api/sales-hub/listing-assignment'",
    "app.post('/api/sales-hub/group-assignment'",
    "app.post('/api/sales-hub/project-case'",
    "app.post('/api/sales-hub/listing-case'",
    "app.post('/api/sales-hub/sync-cases'",
  ]
  return writeMarkers.every(marker => String(serverSource || '').includes(marker)) &&
    writeMarkers.every(marker => !String(moduleSource || '').includes(marker))
}

function scriptIsReadOnly(scriptSource = '') {
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
  return forbiddenTokens.every(token => !String(scriptSource || '').includes(token))
}

function hubReadRouteShapesPass(routes = {}) {
  const foundationHub = routes.foundationHub
  const currentSprint = routes.currentSprint
  const opsHub = routes.opsHub
  const salesHub = routes.salesHub
  return foundationHub?.status === 200 &&
    foundationHub.json?.foundationHubPerformance?.mode === 'summary' &&
    Array.isArray(foundationHub.json?.backlogItems) &&
    currentSprint?.status === 200 &&
    currentSprint.json?.currentSprint?.status === 'healthy' &&
    opsHub?.status === 200 &&
    opsHub.json?.meta?.surface === 'ops' &&
    opsHub.json?.sourceOutageBoundary &&
    salesHub?.status === 200 &&
    salesHub.json?.hub === 'sales' &&
    salesHub.json?.listingInventory
}

function summarizeRouteResult(route = {}) {
  return {
    pathname: route.pathname,
    status: route.status,
    ok: route.ok,
    durationMs: route.durationMs,
    bytes: route.bytes,
    contentType: route.contentType,
    cacheControl: route.cacheControl,
    jsonShape: route.json && typeof route.json === 'object'
      ? {
        keys: Object.keys(route.json).slice(0, 20),
        foundationHubMode: route.json.foundationHubPerformance?.mode || null,
        currentSprintStatus: route.json.currentSprint?.status || null,
        surface: route.json.meta?.surface || null,
        hub: route.json.hub || null,
      }
      : null,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const jsonOutput = args.json === true || String(args.json || '').toLowerCase() === 'true'
  const baseUrl = String(args.baseUrl || 'http://localhost:3000')
  const checks = []

  const [
    approvalValidation,
    cards,
    activeSprint,
    planCriticRuns,
    serverSource,
    moduleSource,
    scriptSource,
    planSource,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: HUB_READ_ROUTES_SPLIT_APPROVAL_PATH, cardId: HUB_READ_ROUTES_SPLIT_CARD_ID }),
    getBacklogItemsByIds([HUB_READ_ROUTES_SPLIT_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([HUB_READ_ROUTES_SPLIT_CARD_ID]),
    readRepoFile('server.js'),
    readRepoFile('lib/hub-read-routes.js'),
    readRepoFile(HUB_READ_ROUTES_SPLIT_SCRIPT_PATH),
    readRepoFile(HUB_READ_ROUTES_SPLIT_PLAN_PATH),
  ])

  const card = cards[0] || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === HUB_READ_ROUTES_SPLIT_CARD_ID) || null
  const planCritic = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= 9.8) || null
  const dogfood = buildHubReadRoutesSplitDogfoodProof({ serverSource, moduleSource, proofScriptSource: scriptSource })
  const serverLineCount = String(serverSource || '').split('\n').length

  ensure(checks, approvalValidation.ok, 'Plan approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || HUB_READ_ROUTES_SPLIT_APPROVAL_PATH)
  ensure(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  ensure(checks, activeSprint.sprint?.sprintId === HUB_READ_ROUTES_SPLIT_SPRINT_ID, 'Current Sprint is the server monolith closeout sprint', activeSprint.sprint?.sprintId || 'missing')
  ensure(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains the card in Building Now or Done', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  ensure(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  ensure(checks, moduleOwnsHubReadRoutes(moduleSource), 'new module owns hub read route strings', 'lib/hub-read-routes.js')
  ensure(checks, serverSource.includes('registerHubReadRoutes(app'), 'server.js delegates through hub read route registrar', 'registerHubReadRoutes(app)')
  ensure(checks, serverNoLongerOwnsHubReadRoutes(serverSource), 'server.js no longer owns moved hub read handlers', 'old inline hub read markers absent')
  ensure(checks, salesWriteRoutesRemainInServer(serverSource, moduleSource), 'Sales write routes remain in server.js', 'POST /api/sales-hub/* still server-owned')
  ensure(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only by default and has no apply mutation posture', 'no write/mutation tokens in proof script')
  ensure(checks, dogfood.ok, 'dogfood rejects old hub read route split failures', dogfood.summary)
  ensure(checks, planSource.includes('No Sales write route moves.'), 'plan blocks Sales write route movement', HUB_READ_ROUTES_SPLIT_PLAN_PATH)
  ensure(checks, planSource.includes('No payload expansion.'), 'plan blocks payload expansion', HUB_READ_ROUTES_SPLIT_PLAN_PATH)
  ensure(checks, serverLineCount < HUB_READ_ROUTES_SPLIT_BEFORE_SERVER_LINES, 'server.js line count decreases', `${HUB_READ_ROUTES_SPLIT_BEFORE_SERVER_LINES} -> ${serverLineCount}`)

  const routeResults = {
    foundationHub: await fetchMeasured(baseUrl, '/api/foundation-hub'),
    currentSprint: await fetchMeasured(baseUrl, '/api/foundation/current-sprint'),
    opsHub: await fetchMeasured(baseUrl, '/api/ops-hub'),
    salesHub: await fetchMeasured(baseUrl, '/api/sales-hub'),
  }
  const measuredRoutes = Object.values(routeResults)

  ensure(checks, hubReadRouteShapesPass(routeResults), 'moved hub read routes return expected behavior', routeSummary(measuredRoutes))
  ensure(checks, measuredRoutes.every(route => route.durationMs <= HUB_READ_ROUTES_SPLIT_ROUTE_BUDGET_MS), 'moved hub read routes stay under latency budget', routeSummary(measuredRoutes))
  ensure(checks, measuredRoutes.every(route => route.bytes <= HUB_READ_ROUTES_SPLIT_ROUTE_BUDGET_BYTES), 'moved hub read routes stay under payload budget', routeSummary(measuredRoutes))

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: HUB_READ_ROUTES_SPLIT_CARD_ID,
    closeoutKey: HUB_READ_ROUTES_SPLIT_CLOSEOUT_KEY,
    baseUrl,
    lineCounts: {
      serverBefore: HUB_READ_ROUTES_SPLIT_BEFORE_SERVER_LINES,
      serverAfter: serverLineCount,
      delta: serverLineCount - HUB_READ_ROUTES_SPLIT_BEFORE_SERVER_LINES,
    },
    routeBudget: {
      durationMs: HUB_READ_ROUTES_SPLIT_ROUTE_BUDGET_MS,
      bytes: HUB_READ_ROUTES_SPLIT_ROUTE_BUDGET_BYTES,
    },
    checks,
    routes: Object.fromEntries(
      Object.entries(routeResults).map(([key, route]) => [key, summarizeRouteResult(route)])
    ),
    dogfood,
  }

  if (jsonOutput) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Hub read route split proof')
    checks.forEach(check => console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`))
    console.log(`Summary: ${checks.filter(check => check.ok).length}/${checks.length} checks passed`)
  }

  await closeFoundationDb()
  if (!ok) process.exit(1)
}

main().catch(async error => {
  console.error(error instanceof Error ? error.message : 'Hub read route split proof failed.')
  await closeFoundationDb().catch(() => {})
  process.exit(1)
})
