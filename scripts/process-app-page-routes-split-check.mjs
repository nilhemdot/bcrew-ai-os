#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'
import {
  APP_PAGE_ROUTES_SPLIT_APPROVAL_PATH,
  APP_PAGE_ROUTES_SPLIT_BEFORE_SERVER_LINES,
  APP_PAGE_ROUTES_SPLIT_CARD_ID,
  APP_PAGE_ROUTES_SPLIT_CLOSEOUT_KEY,
  APP_PAGE_ROUTES_SPLIT_PLAN_PATH,
  APP_PAGE_ROUTES_SPLIT_ROUTE_BUDGET_BYTES,
  APP_PAGE_ROUTES_SPLIT_ROUTE_BUDGET_MS,
  APP_PAGE_ROUTES_SPLIT_SCRIPT_PATH,
  APP_PAGE_ROUTES_SPLIT_SPRINT_ID,
  buildAppPageRoutesSplitDogfoodProof,
} from '../lib/app-page-routes.js'
import { evaluateSprintCheckHistoricalMode } from '../lib/sprint-check-historical-mode.js'

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
  return {
    method: 'GET',
    pathname,
    status: response.status,
    durationMs,
    bytes: Buffer.byteLength(text),
    contentType: response.headers.get('content-type') || '',
  }
}

function routeSummary(routes = []) {
  return routes
    .map(route => `${route.method} ${route.pathname}:${route.status}/${route.durationMs}ms/${route.bytes}B/${route.contentType || 'unknown'}`)
    .join(', ')
}

function moduleOwnsAppPageRoutes(moduleSource = '') {
  const source = String(moduleSource || '')
  return [
    "app.get('/doc'",
    "app.get('/foundation'",
    "app.get('/foundation/export/strategy'",
    "app.get('/strategic-execution'",
    "app.get('/sales'",
    "app.get('/ops'",
    "app.get('/agent-feedback'",
    "app.use('/api'",
    "app.get('/'",
    "app.get('*'",
    'registerAppPageRoutes',
  ].every(marker => source.includes(marker))
}

function serverNoLongerOwnsInlineAppPageRoutes(serverSource = '') {
  const source = String(serverSource || '')
  return [
    "app.get('/doc'",
    "app.get('/foundation', requirePageAccess('owner')",
    "app.get('/foundation/export/strategy', requirePageAccess('owner')",
    "app.get('/strategic-execution'",
    "app.get('/sales'",
    "app.get('/ops'",
    "app.get('/agent-feedback'",
    "app.use('/api'",
    "app.get('/', requirePageAccess('home')",
    "app.get('*', requirePageAccess('owner')",
  ].every(marker => !source.includes(marker))
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

function appPageRouteShapesPass(routes = []) {
  const htmlRoutes = routes.filter(route => !route.pathname.startsWith('/api/'))
  const apiRoute = routes.find(route => route.pathname.startsWith('/api/'))
  return htmlRoutes.every(route => route.status === 200 && route.contentType.includes('text/html')) &&
    apiRoute?.status === 404 &&
    apiRoute.contentType.includes('application/json')
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
    validatePlanApprovalFile({ repoRoot, approvalRef: APP_PAGE_ROUTES_SPLIT_APPROVAL_PATH, cardId: APP_PAGE_ROUTES_SPLIT_CARD_ID }),
    getBacklogItemsByIds([APP_PAGE_ROUTES_SPLIT_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([APP_PAGE_ROUTES_SPLIT_CARD_ID]),
    readRepoFile('server.js'),
    readRepoFile('lib/app-page-routes.js'),
    readRepoFile(APP_PAGE_ROUTES_SPLIT_SCRIPT_PATH),
    readRepoFile(APP_PAGE_ROUTES_SPLIT_PLAN_PATH),
  ])

  const card = cards[0] || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === APP_PAGE_ROUTES_SPLIT_CARD_ID) || null
  const planCritic = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= 9.8) || null
  const dogfood = buildAppPageRoutesSplitDogfoodProof({ serverSource, moduleSource, proofScriptSource: scriptSource })
  const serverLineCount = String(serverSource || '').split('\n').length
  const sprintMode = evaluateSprintCheckHistoricalMode({
    activeSprint,
    card,
    closeouts: getFoundationBuildCloseouts(),
    cardId: APP_PAGE_ROUTES_SPLIT_CARD_ID,
    expectedSprintId: APP_PAGE_ROUTES_SPLIT_SPRINT_ID,
    closeoutKey: APP_PAGE_ROUTES_SPLIT_CLOSEOUT_KEY,
  })

  ensure(checks, approvalValidation.ok, 'Plan approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || APP_PAGE_ROUTES_SPLIT_APPROVAL_PATH)
  ensure(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  ensure(checks, sprintMode.ok, 'Current Sprint or verified closeout owns app page route split proof', `${sprintMode.mode}: ${sprintMode.reason}`)
  ensure(checks, sprintMode.mode === 'historical_closeout' || (sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage)), 'Current Sprint contains active card or verified historical closeout exists', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : sprintMode.mode)
  ensure(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  ensure(checks, moduleOwnsAppPageRoutes(moduleSource), 'new module owns app page and fallback route strings', 'lib/app-page-routes.js')
  ensure(checks, !moduleSource.includes("app.get('/foundation/export/strategy.pdf'"), 'new module does not own Strategy PDF export route', 'Strategy PDF export stays in server.js')
  ensure(checks, serverSource.includes('registerAppPageRoutes(app'), 'server.js delegates through app page route registrar', 'registerAppPageRoutes(app)')
  ensure(checks, serverSource.includes("app.get('/foundation/export/strategy.pdf'"), 'server.js still owns Strategy PDF export route', 'GET /foundation/export/strategy.pdf')
  ensure(checks, serverNoLongerOwnsInlineAppPageRoutes(serverSource), 'server.js no longer owns moved inline app page/fallback handlers', 'old inline app markers absent')
  ensure(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only by default and has no apply mutation posture', 'no write/mutation tokens in proof script')
  ensure(checks, dogfood.ok, 'dogfood rejects old app page route split failures', dogfood.summary)
  ensure(checks, planSource.includes('Strategy PDF export route stays in `server.js`'), 'plan keeps Strategy PDF export in server.js', APP_PAGE_ROUTES_SPLIT_PLAN_PATH)
  ensure(checks, serverLineCount < APP_PAGE_ROUTES_SPLIT_BEFORE_SERVER_LINES, 'server.js line count decreases', `${APP_PAGE_ROUTES_SPLIT_BEFORE_SERVER_LINES} -> ${serverLineCount}`)

  const routeResults = []
  routeResults.push(await fetchMeasured(baseUrl, '/doc'))
  routeResults.push(await fetchMeasured(baseUrl, '/foundation'))
  routeResults.push(await fetchMeasured(baseUrl, '/foundation/export/strategy'))
  routeResults.push(await fetchMeasured(baseUrl, '/strategic-execution'))
  routeResults.push(await fetchMeasured(baseUrl, '/sales'))
  routeResults.push(await fetchMeasured(baseUrl, '/ops'))
  routeResults.push(await fetchMeasured(baseUrl, '/agent-feedback'))
  routeResults.push(await fetchMeasured(baseUrl, '/'))
  routeResults.push(await fetchMeasured(baseUrl, '/definitely-missing-app-page-route'))
  routeResults.push(await fetchMeasured(baseUrl, '/api/definitely-missing-app-page-route'))

  ensure(checks, appPageRouteShapesPass(routeResults), 'moved page and fallback routes return expected HTML/API fallback payloads', routeSummary(routeResults))
  ensure(checks, routeResults.every(route => route.durationMs <= APP_PAGE_ROUTES_SPLIT_ROUTE_BUDGET_MS), 'moved page and fallback routes stay under latency budget', routeSummary(routeResults))
  ensure(checks, routeResults.every(route => route.bytes <= APP_PAGE_ROUTES_SPLIT_ROUTE_BUDGET_BYTES), 'moved page and fallback routes stay under payload budget', routeSummary(routeResults))

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: APP_PAGE_ROUTES_SPLIT_CARD_ID,
    closeoutKey: APP_PAGE_ROUTES_SPLIT_CLOSEOUT_KEY,
    baseUrl,
    lineCounts: {
      serverBefore: APP_PAGE_ROUTES_SPLIT_BEFORE_SERVER_LINES,
      serverAfter: serverLineCount,
      delta: serverLineCount - APP_PAGE_ROUTES_SPLIT_BEFORE_SERVER_LINES,
    },
    routeBudget: {
      durationMs: APP_PAGE_ROUTES_SPLIT_ROUTE_BUDGET_MS,
      bytes: APP_PAGE_ROUTES_SPLIT_ROUTE_BUDGET_BYTES,
    },
    checks,
    routes: routeResults,
    dogfood,
  }

  if (jsonOutput) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('App page route split proof')
    checks.forEach(check => console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`))
    console.log(`Summary: ${checks.filter(check => check.ok).length}/${checks.length} checks passed`)
  }

  await closeFoundationDb()
  if (!ok) process.exit(1)
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error)
  process.exit(1)
})
