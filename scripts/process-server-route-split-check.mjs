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

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const CARD_ID = 'SERVER-ROUTE-SPLIT-001'
const SPRINT_ID = 'server-route-split-2026-05-15'
const CLOSEOUT_KEY = 'server-route-split-v1'
const PLAN_REF = 'docs/process/server-route-split-001-plan.md'
const APPROVAL_REF = 'docs/process/approvals/SERVER-ROUTE-SPLIT-001.json'
const MODULE_PATH = 'lib/foundation-operator-routes.js'
const SCRIPT_PATH = 'scripts/process-server-route-split-check.mjs'
const MAX_ROUTE_MS = 2000
const MAX_BACKLOG_DETAIL_MS = 500
const MAX_BACKLOG_DETAIL_BYTES = 50000

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

async function fetchJsonMeasured(baseUrl, pathname) {
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
    pathname,
    status: response.status,
    durationMs,
    bytes: Buffer.byteLength(text),
    json,
  }
}

function routeOk(result) {
  return result.status >= 200 && result.status < 300
}

function routeUnderBudget(result) {
  return result.durationMs <= MAX_ROUTE_MS
}

function buildRouteSummary(routeResults) {
  return routeResults.map(result => `${result.pathname}:${result.status}/${result.durationMs}ms/${result.bytes}B`).join(', ')
}

function sourceOwnsRoutes(moduleSource) {
  const routes = [
    "/api/foundation/changes",
    "/api/foundation/change-log",
    "/api/foundation/daily-summary",
    "/api/foundation/build-log",
    "/api/foundation/backlog/:cardId",
    "/api/foundation/doc-updates",
  ]
  return routes.every(route => moduleSource.includes(route))
}

function serverNoLongerOwnsInlineRoutes(serverSource) {
  return [
    "app.get('/api/foundation/changes'",
    "app.get('/api/foundation/change-log'",
    "app.get('/api/foundation/daily-summary'",
    "app.get('/api/foundation/build-log'",
    "app.get('/api/foundation/backlog/:cardId'",
    "app.get('/api/foundation/doc-updates'",
  ].every(marker => !serverSource.includes(marker))
}

function scriptIsReadOnly(scriptSource) {
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
  return forbiddenTokens.every(token => !scriptSource.includes(token))
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const jsonOutput = args.json === true || String(args.json || '').toLowerCase() === 'true'
  const baseUrl = String(args.baseUrl || 'http://localhost:3000')
  const checks = []

  const [approvalValidation, cards, activeSprint, planCriticRuns, serverSource, moduleSource, scriptSource] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_REF, cardId: CARD_ID }),
    getBacklogItemsByIds([CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([CARD_ID]),
    readRepoFile('server.js'),
    readRepoFile(MODULE_PATH),
    readRepoFile(SCRIPT_PATH),
  ])

  const card = cards[0] || null
  const planCritic = (Array.isArray(planCriticRuns) ? planCriticRuns : (planCriticRuns[CARD_ID] || []))
    .find(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8) || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === CARD_ID) || null

  ensure(checks, approvalValidation.ok, 'Plan approval validates at 9.8+', approvalValidation.checks?.filter(check => !check.ok).map(check => check.check).join(', ') || APPROVAL_REF)
  ensure(checks, card && ['scoped', 'done'].includes(card.lane), 'live backlog card exists in scoped/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  ensure(checks, activeSprint.sprint?.sprintId === SPRINT_ID, 'Current Sprint is the server route split sprint', activeSprint.sprint?.sprintId || 'missing')
  ensure(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains the card in Building Now or Done', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  ensure(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  ensure(checks, sourceOwnsRoutes(moduleSource), 'new route module owns the operator route cluster', MODULE_PATH)
  ensure(checks, serverSource.includes('registerFoundationOperatorRoutes(app'), 'server.js delegates through route registrar', 'registerFoundationOperatorRoutes(app)')
  ensure(checks, serverNoLongerOwnsInlineRoutes(serverSource), 'server.js no longer owns moved inline route handlers', 'old inline app.get markers absent')
  ensure(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only', 'no write/mutation tokens in proof script')

  const routeResults = []
  routeResults.push(await fetchJsonMeasured(baseUrl, '/api/foundation/changes?limit=1'))
  routeResults.push(await fetchJsonMeasured(baseUrl, '/api/foundation/change-log?limit=1'))
  routeResults.push(await fetchJsonMeasured(baseUrl, '/api/foundation/daily-summary?days=1'))
  routeResults.push(await fetchJsonMeasured(baseUrl, '/api/foundation/build-log?limit=1'))
  routeResults.push(await fetchJsonMeasured(baseUrl, '/api/foundation/doc-updates'))
  const backlogDetail = await fetchJsonMeasured(baseUrl, '/api/foundation/backlog/FOUNDATION-HUB-BACKLOG-CONTRACT-001')
  const missingBacklog = await fetchJsonMeasured(baseUrl, '/api/foundation/backlog/FOUNDATION-DETAIL-NOT-REAL-999')
  const malformedBacklog = await fetchJsonMeasured(baseUrl, '/api/foundation/backlog/..%2F..%2Fbad')
  routeResults.push(backlogDetail)

  ensure(checks, routeResults.every(routeOk), 'all moved live routes return success', buildRouteSummary(routeResults))
  ensure(checks, routeResults.every(routeUnderBudget), 'all moved live routes stay under route latency budget', buildRouteSummary(routeResults))
  ensure(checks, Array.isArray(routeResults[0].json?.changes), 'changes route payload shape remains compatible', '/api/foundation/changes')
  ensure(checks, Array.isArray(routeResults[1].json?.entries) || Array.isArray(routeResults[1].json?.groups) || routeResults[1].json?.generatedAt, 'change-log route returns structured payload', '/api/foundation/change-log')
  ensure(checks, routeResults[2].json?.generatedAt || routeResults[2].json?.selectedDate || routeResults[2].json?.summary, 'daily-summary route returns structured payload', '/api/foundation/daily-summary')
  ensure(checks, Array.isArray(routeResults[3].json?.builds), 'build-log route payload shape remains compatible', '/api/foundation/build-log')
  ensure(checks, Array.isArray(routeResults[4].json?.docUpdates), 'doc-updates route payload shape remains compatible', '/api/foundation/doc-updates')
  ensure(
    checks,
    backlogDetail.status === 200 &&
      backlogDetail.durationMs <= MAX_BACKLOG_DETAIL_MS &&
      backlogDetail.bytes <= MAX_BACKLOG_DETAIL_BYTES &&
      backlogDetail.json?.cardId === 'FOUNDATION-HUB-BACKLOG-CONTRACT-001',
    'backlog detail route keeps single-card behavior and budget',
    `${backlogDetail.status}/${backlogDetail.durationMs}ms/${backlogDetail.bytes}B card=${backlogDetail.json?.cardId || 'missing'}`,
  )
  ensure(checks, missingBacklog.status === 404, 'missing valid backlog card still returns 404', String(missingBacklog.status))
  ensure(checks, malformedBacklog.status === 400, 'malformed backlog card ID still returns 400', String(malformedBacklog.status))

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    routeBudgetMs: MAX_ROUTE_MS,
    backlogDetailBudget: {
      durationMs: MAX_BACKLOG_DETAIL_MS,
      bytes: MAX_BACKLOG_DETAIL_BYTES,
    },
    checks,
    routes: {
      moved: routeResults.map(result => ({
        pathname: result.pathname,
        status: result.status,
        durationMs: result.durationMs,
        bytes: result.bytes,
      })),
      missingBacklog: {
        status: missingBacklog.status,
        durationMs: missingBacklog.durationMs,
      },
      malformedBacklog: {
        status: malformedBacklog.status,
        durationMs: malformedBacklog.durationMs,
      },
    },
    dogfood: {
      oldInlineRoutesRemoved: serverNoLongerOwnsInlineRoutes(serverSource),
      liveRoutesPassed: routeResults.every(routeOk),
      proofReadOnly: scriptIsReadOnly(scriptSource),
    },
  }

  if (jsonOutput) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Server route split proof')
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
