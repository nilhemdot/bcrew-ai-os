#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_APPROVAL_PATH,
  FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_BEFORE_SERVER_LINES,
  FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_CARD_ID,
  FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_PLAN_PATH,
  FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_ROUTE_BUDGET_BYTES,
  FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_ROUTE_BUDGET_MS,
  FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_SCRIPT_PATH,
  FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_SPRINT_ID,
  buildFoundationRuntimeReadRoutesSplitDogfoodProof,
} from '../lib/foundation-runtime-read-routes.js'

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
  const response = await fetch(new URL(pathname, baseUrl))
  const text = await response.text()
  const durationMs = Date.now() - startedAt
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  return {
    method: 'GET',
    pathname,
    status: response.status,
    ok: response.ok,
    durationMs,
    bytes: Buffer.byteLength(text),
    json,
  }
}

function routeSummary(routes = []) {
  return routes.map(route => `${route.method} ${route.pathname}:${route.status}/${route.durationMs}ms/${route.bytes}B`).join(', ')
}

function serverNoLongerOwnsInlineRuntimeReadRoutes(serverSource = '') {
  return [
    "app.get('/api/foundation/jobs'",
    "app.get('/api/foundation/active-processes'",
    "app.get('/api/foundation/llm-runtime'",
    "app.get('/api/foundation/extraction-control'",
  ].every(marker => !String(serverSource || '').includes(marker))
}

function moduleOwnsRuntimeReadRoutes(moduleSource = '') {
  const source = String(moduleSource || '')
  return [
    "app.get('/api/foundation/jobs'",
    "app.get('/api/foundation/active-processes'",
    "app.get('/api/foundation/llm-runtime'",
    "app.get('/api/foundation/extraction-control'",
    'registerFoundationRuntimeReadRoutes',
  ].every(marker => source.includes(marker))
}

function moduleDoesNotOwnRuntimeMutationRoutes(moduleSource = '') {
  return [
    "app.post('/api/foundation/jobs/:jobKey/control'",
    "app.post('/api/foundation/job-runs/:runId/stop'",
    "app.post('/api/foundation/jobs/:jobKey/decommission'",
  ].every(marker => !String(moduleSource || '').includes(marker))
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

function routeShapesPass(routes = []) {
  const byPath = new Map(routes.map(route => [route.pathname, route]))
  return Array.isArray(byPath.get('/api/foundation/jobs?limit=1')?.json?.jobs) &&
    byPath.get('/api/foundation/active-processes')?.json?.summary &&
    byPath.get('/api/foundation/llm-runtime?limit=1')?.json?.summary &&
    byPath.get('/api/foundation/extraction-control?limit=1')?.json?.summary
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
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_APPROVAL_PATH,
      cardId: FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_CARD_ID,
    }),
    getBacklogItemsByIds([FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_CARD_ID]),
    readRepoFile('server.js'),
    readRepoFile('lib/foundation-runtime-read-routes.js'),
    readRepoFile(FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_SCRIPT_PATH),
    readRepoFile(FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_PLAN_PATH),
  ])

  const card = cards[0] || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_CARD_ID) || null
  const planCritic = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= 9.8) || null
  const dogfood = buildFoundationRuntimeReadRoutesSplitDogfoodProof({ serverSource, moduleSource, proofScriptSource: scriptSource })
  const serverLineCount = String(serverSource || '').split('\n').length

  ensure(checks, approvalValidation.ok, 'Plan approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_APPROVAL_PATH)
  ensure(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  ensure(checks, activeSprint.sprint?.sprintId === FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_SPRINT_ID, 'Current Sprint is the runtime read route split sprint', activeSprint.sprint?.sprintId || 'missing')
  ensure(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains the card in Building Now or Done', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  ensure(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  ensure(checks, moduleOwnsRuntimeReadRoutes(moduleSource), 'new module owns Foundation runtime read route strings', 'lib/foundation-runtime-read-routes.js')
  ensure(checks, moduleDoesNotOwnRuntimeMutationRoutes(moduleSource), 'new module does not own runtime mutation route strings', 'job-control mutations stay in server.js')
  ensure(checks, serverSource.includes('registerFoundationRuntimeReadRoutes(app'), 'server.js delegates through runtime read route registrar', 'registerFoundationRuntimeReadRoutes(app)')
  ensure(checks, serverNoLongerOwnsInlineRuntimeReadRoutes(serverSource), 'server.js no longer owns moved inline runtime read route handlers', 'old inline app markers absent')
  ensure(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only by default and has no apply mutation posture', 'no write/mutation tokens in proof script')
  ensure(checks, dogfood.ok, 'dogfood rejects old runtime read route split failures', dogfood.summary)
  ensure(checks, planSource.includes('without POSTing job-control mutations'), 'plan blocks mutating runtime-control proof', FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_PLAN_PATH)
  ensure(checks, serverLineCount < FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_BEFORE_SERVER_LINES, 'server.js line count decreases', `${FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_BEFORE_SERVER_LINES} -> ${serverLineCount}`)

  const routeResults = []
  routeResults.push(await fetchMeasured(baseUrl, '/api/foundation/jobs?limit=1'))
  routeResults.push(await fetchMeasured(baseUrl, '/api/foundation/active-processes'))
  routeResults.push(await fetchMeasured(baseUrl, '/api/foundation/llm-runtime?limit=1'))
  routeResults.push(await fetchMeasured(baseUrl, '/api/foundation/extraction-control?limit=1'))

  ensure(checks, routeResults.every(route => route.status === 200), 'moved read routes return HTTP 200', routeSummary(routeResults))
  ensure(checks, routeShapesPass(routeResults), 'moved read routes return expected runtime status payloads without POSTing job-control mutations', routeSummary(routeResults))
  ensure(checks, routeResults.every(route => route.durationMs <= FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_ROUTE_BUDGET_MS), 'moved read routes stay under latency budget', routeSummary(routeResults))
  ensure(checks, routeResults.every(route => route.bytes <= FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_ROUTE_BUDGET_BYTES), 'moved read routes stay under payload budget', routeSummary(routeResults))

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_CARD_ID,
    closeoutKey: FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_CLOSEOUT_KEY,
    baseUrl,
    lineCounts: {
      serverBefore: FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_BEFORE_SERVER_LINES,
      serverAfter: serverLineCount,
      delta: serverLineCount - FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_BEFORE_SERVER_LINES,
    },
    routeBudget: {
      durationMs: FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_ROUTE_BUDGET_MS,
      bytes: FOUNDATION_RUNTIME_READ_ROUTES_SPLIT_ROUTE_BUDGET_BYTES,
    },
    checks,
    routes: routeResults.map(route => ({
      method: route.method,
      pathname: route.pathname,
      status: route.status,
      durationMs: route.durationMs,
      bytes: route.bytes,
    })),
    dogfood,
  }

  if (jsonOutput) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Foundation runtime read route split proof')
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
