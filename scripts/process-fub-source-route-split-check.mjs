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
  FUB_SOURCE_ROUTE_SPLIT_APPROVAL_PATH,
  FUB_SOURCE_ROUTE_SPLIT_BEFORE_SERVER_LINES,
  FUB_SOURCE_ROUTE_SPLIT_CARD_ID,
  FUB_SOURCE_ROUTE_SPLIT_CLOSEOUT_KEY,
  FUB_SOURCE_ROUTE_SPLIT_PLAN_PATH,
  FUB_SOURCE_ROUTE_SPLIT_SCRIPT_PATH,
  FUB_SOURCE_ROUTE_SPLIT_SPRINT_ID,
  buildFubSourceRouteSplitDogfoodProof,
} from '../lib/fub-source-routes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const MAX_ROUTE_MS = 1000
const MAX_ROUTE_BYTES = 25000

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

async function fetchMeasured(baseUrl, pathname, options = {}) {
  const startedAt = Date.now()
  const response = await fetch(new URL(pathname, baseUrl), options)
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
    method: options.method || 'GET',
    status: response.status,
    durationMs,
    bytes: Buffer.byteLength(text),
    json,
  }
}

function jsonBody(value) {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  }
}

function patchJsonBody(value) {
  return {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  }
}

function routeSummary(routes = []) {
  return routes.map(route => `${route.method} ${route.pathname}:${route.status}/${route.durationMs}ms/${route.bytes}B`).join(', ')
}

function serverNoLongerOwnsInlineFubRoutes(serverSource = '') {
  return [
    "app.get('/api/fub/health'",
    "app.get('/api/fub/person'",
    "app.get('/api/fub/lead-sources'",
    "app.post('/api/fub/lead-sources/refresh'",
    "app.patch('/api/fub/lead-sources'",
    "app.post('/api/fub/request'",
  ].every(marker => !String(serverSource || '').includes(marker))
}

function moduleOwnsFubRoutes(moduleSource = '') {
  const source = String(moduleSource || '')
  return [
    '/api/fub/health',
    '/api/fub/person',
    '/api/fub/lead-sources',
    '/api/fub/lead-sources/refresh',
    '/api/fub/request',
  ].every(route => source.includes(route)) &&
    source.includes('registerFubSourceRoutes')
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
    validatePlanApprovalFile({ repoRoot, approvalRef: FUB_SOURCE_ROUTE_SPLIT_APPROVAL_PATH, cardId: FUB_SOURCE_ROUTE_SPLIT_CARD_ID }),
    getBacklogItemsByIds([FUB_SOURCE_ROUTE_SPLIT_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([FUB_SOURCE_ROUTE_SPLIT_CARD_ID]),
    readRepoFile('server.js'),
    readRepoFile('lib/fub-source-routes.js'),
    readRepoFile(FUB_SOURCE_ROUTE_SPLIT_SCRIPT_PATH),
    readRepoFile(FUB_SOURCE_ROUTE_SPLIT_PLAN_PATH),
  ])

  const card = cards[0] || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === FUB_SOURCE_ROUTE_SPLIT_CARD_ID) || null
  const planCritic = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= 9.8) || null
  const dogfood = buildFubSourceRouteSplitDogfoodProof({ serverSource, moduleSource, proofScriptSource: scriptSource })
  const serverLineCount = String(serverSource || '').split('\n').length

  ensure(checks, approvalValidation.ok, 'Plan approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || FUB_SOURCE_ROUTE_SPLIT_APPROVAL_PATH)
  ensure(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  ensure(checks, activeSprint.sprint?.sprintId === FUB_SOURCE_ROUTE_SPLIT_SPRINT_ID, 'Current Sprint is the FUB source route split sprint', activeSprint.sprint?.sprintId || 'missing')
  ensure(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains the card in Building Now or Done', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  ensure(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  ensure(checks, moduleOwnsFubRoutes(moduleSource), 'new module owns FUB route strings', 'lib/fub-source-routes.js')
  ensure(checks, serverSource.includes('registerFubSourceRoutes(app'), 'server.js delegates through FUB route registrar', 'registerFubSourceRoutes(app)')
  ensure(checks, serverNoLongerOwnsInlineFubRoutes(serverSource), 'server.js no longer owns moved inline FUB route handlers', 'old inline app markers absent')
  ensure(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only', 'no write/mutation tokens in proof script')
  ensure(checks, dogfood.ok, 'dogfood rejects old FUB route split failures', dogfood.summary)
  ensure(checks, planSource.includes('no success-path FUB refresh/lead-source sync is called by the proof'), 'plan blocks mutating success-path proof', FUB_SOURCE_ROUTE_SPLIT_PLAN_PATH)
  ensure(checks, serverLineCount < FUB_SOURCE_ROUTE_SPLIT_BEFORE_SERVER_LINES, 'server.js line count decreases', `${FUB_SOURCE_ROUTE_SPLIT_BEFORE_SERVER_LINES} -> ${serverLineCount}`)

  const routeResults = []
  routeResults.push(await fetchMeasured(baseUrl, '/api/fub/health?context=not-a-context'))
  routeResults.push(await fetchMeasured(baseUrl, '/api/fub/person'))
  routeResults.push(await fetchMeasured(baseUrl, '/api/fub/lead-sources/refresh', jsonBody({ unexpected: true })))
  routeResults.push(await fetchMeasured(baseUrl, '/api/fub/lead-sources', patchJsonBody({ unexpected: true })))
  routeResults.push(await fetchMeasured(baseUrl, '/api/fub/request', jsonBody({ method: 'POST', endpoint: '/people' })))

  ensure(checks, routeResults.every(route => route.status === 400), 'moved validation routes still reject invalid requests without success-path writes', routeSummary(routeResults))
  ensure(checks, routeResults.every(route => route.durationMs <= MAX_ROUTE_MS), 'moved validation routes stay under latency budget', routeSummary(routeResults))
  ensure(checks, routeResults.every(route => route.bytes <= MAX_ROUTE_BYTES), 'moved validation routes stay under payload budget', routeSummary(routeResults))
  ensure(checks, routeResults[0].json?.error?.code === 'invalid_fub_context', 'health validation keeps error code', routeResults[0].json?.error?.code || 'missing')
  ensure(checks, routeResults[1].json?.error?.code === 'missing_fub_person', 'person validation keeps error code', routeResults[1].json?.error?.code || 'missing')
  ensure(checks, routeResults[2].json?.error?.code === 'invalid_fub_lead_source_refresh_body', 'lead-source refresh validation keeps error code', routeResults[2].json?.error?.code || 'missing')
  ensure(checks, routeResults[3].json?.error?.code === 'invalid_fub_lead_source_body', 'lead-source update validation keeps error code', routeResults[3].json?.error?.code || 'missing')
  ensure(checks, routeResults[4].json?.error?.code === 'invalid_fub_request_body', 'generic FUB proxy mutation remains disabled', routeResults[4].json?.error?.code || 'missing')

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: FUB_SOURCE_ROUTE_SPLIT_CARD_ID,
    closeoutKey: FUB_SOURCE_ROUTE_SPLIT_CLOSEOUT_KEY,
    baseUrl,
    lineCounts: {
      serverBefore: FUB_SOURCE_ROUTE_SPLIT_BEFORE_SERVER_LINES,
      serverAfter: serverLineCount,
      delta: serverLineCount - FUB_SOURCE_ROUTE_SPLIT_BEFORE_SERVER_LINES,
    },
    routeBudget: {
      durationMs: MAX_ROUTE_MS,
      bytes: MAX_ROUTE_BYTES,
    },
    checks,
    routes: routeResults.map(route => ({
      method: route.method,
      pathname: route.pathname,
      status: route.status,
      durationMs: route.durationMs,
      bytes: route.bytes,
      code: route.json?.error?.code || null,
    })),
    dogfood,
  }

  if (jsonOutput) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('FUB source route split proof')
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
