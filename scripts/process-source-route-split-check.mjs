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

const CARD_ID = 'SOURCE-ROUTE-SPLIT-001'
const SPRINT_ID = 'source-route-split-2026-05-15'
const CLOSEOUT_KEY = 'source-route-split-v1'
const APPROVAL_REF = 'docs/process/approvals/SOURCE-ROUTE-SPLIT-001.json'
const MODULE_PATH = 'lib/foundation-source-routes.js'
const SCRIPT_PATH = 'scripts/process-source-route-split-check.mjs'
const MAX_ROUTE_MS = 5000
const MAX_ROUTE_BYTES = 2_500_000

const ROUTE_MARKERS = [
  '/api/source-of-truth',
  '/api/foundation/source-lifecycle',
  '/api/foundation/marketing-source-map',
  '/api/foundation/brand-stack',
  '/api/foundation/tier-behavioral-completion',
  '/api/foundation/verification-runs',
  '/api/foundation/per-user-changelog',
  '/api/foundation/restricted-decision-queue',
  '/api/foundation/source-coverage-closeout',
  '/api/foundation/source-extraction-coverage',
  '/api/foundation/source-maturity-grid',
  '/api/foundation/source-connector-matrix',
  '/api/foundation/connector-credential-preflight',
  '/api/foundation/source-hub-routing-matrix',
]

const OLD_INLINE_MARKERS = [
  "app.get('/api/source-of-truth'",
  "app.get('/api/foundation/source-lifecycle'",
  "app.get('/api/foundation/marketing-source-map'",
  "app.get('/api/foundation/brand-stack'",
  "app.get('/api/foundation/tier-behavioral-completion'",
  "app.get('/api/foundation/verification-runs'",
  "app.get('/api/foundation/per-user-changelog'",
  "app.get('/api/foundation/restricted-decision-queue'",
  "app.get('/api/foundation/source-coverage-closeout'",
  "app.get('/api/foundation/source-extraction-coverage'",
  "app.get('/api/foundation/source-maturity-grid'",
  "app.get('/api/foundation/source-connector-matrix'",
  "app.get('/api/foundation/connector-credential-preflight'",
  "app.get('/api/foundation/source-hub-routing-matrix'",
]

const LIVE_ROUTES = [
  '/api/source-of-truth',
  '/api/foundation/source-lifecycle',
  '/api/foundation/marketing-source-map',
  '/api/foundation/brand-stack',
  '/api/foundation/tier-behavioral-completion',
  '/api/foundation/verification-runs',
  '/api/foundation/per-user-changelog?limit=1',
  '/api/foundation/restricted-decision-queue?limit=1',
  '/api/foundation/source-coverage-closeout',
  '/api/foundation/source-extraction-coverage',
  '/api/foundation/source-maturity-grid',
  '/api/foundation/source-connector-matrix',
  '/api/foundation/connector-credential-preflight',
  '/api/foundation/source-hub-routing-matrix',
]

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
  return result.durationMs <= MAX_ROUTE_MS && result.bytes <= MAX_ROUTE_BYTES
}

function buildRouteSummary(routeResults) {
  return routeResults.map(result => `${result.pathname}:${result.status}/${result.durationMs}ms/${result.bytes}B`).join(', ')
}

function sourceOwnsRoutes(moduleSource) {
  return moduleSource.includes('registerFoundationSourceRoutes') &&
    ROUTE_MARKERS.every(route => moduleSource.includes(route))
}

function serverNoLongerOwnsInlineRoutes(serverSource) {
  return OLD_INLINE_MARKERS.every(marker => !serverSource.includes(marker))
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

function hasObjectPayload(result) {
  return result.json && typeof result.json === 'object' && !Array.isArray(result.json)
}

function sourceOfTruthShape(result) {
  return Array.isArray(result.json?.sources) &&
    Array.isArray(result.json?.connectors) &&
    Array.isArray(result.json?.groupedSystems)
}

function sourceLifecycleShape(result) {
  return hasObjectPayload(result) &&
    Array.isArray(result.json.sources) &&
    result.json.sourceMaturityGrid &&
    result.json.sourceConnectorMatrix &&
    result.json.sourceHubRoutingMatrix
}

function marketingSourceMapShape(result) {
  return hasObjectPayload(result) &&
    Array.isArray(result.json.lanes) &&
    Array.isArray(result.json.sourceIds) &&
    result.json.summary &&
    result.json.cardId === 'MARKETING-SOURCE-MAP-001'
}

function connectorMatrixShape(result) {
  return hasObjectPayload(result) &&
    (Array.isArray(result.json.rows) || Array.isArray(result.json.sources) || Array.isArray(result.json.connectors))
}

function hubRoutingShape(result) {
  return hasObjectPayload(result) &&
    (Array.isArray(result.json.rows) || Array.isArray(result.json.hubs) || Array.isArray(result.json.sources))
}

function genericStructuredShape(result) {
  return hasObjectPayload(result) && Object.keys(result.json).length > 0
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
  ensure(checks, activeSprint.sprint?.sprintId === SPRINT_ID, 'Current Sprint is the source route split sprint', activeSprint.sprint?.sprintId || 'missing')
  ensure(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains the card in Building Now or Done', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  ensure(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  ensure(checks, sourceOwnsRoutes(moduleSource), 'new route module owns the source/control route cluster', MODULE_PATH)
  ensure(checks, serverSource.includes('registerFoundationSourceRoutes(app'), 'server.js delegates through source route registrar', 'registerFoundationSourceRoutes(app)')
  ensure(checks, serverNoLongerOwnsInlineRoutes(serverSource), 'server.js no longer owns moved inline source/control route handlers', 'old inline app.get markers absent')
  ensure(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only', 'no write/mutation tokens in proof script')

  const routeResults = []
  for (const route of LIVE_ROUTES) {
    routeResults.push(await fetchJsonMeasured(baseUrl, route))
  }
  const routesByPath = Object.fromEntries(routeResults.map(result => [result.pathname, result]))

  ensure(checks, routeResults.every(routeOk), 'all moved source/control live routes return success', buildRouteSummary(routeResults))
  ensure(checks, routeResults.every(routeUnderBudget), 'all moved source/control live routes stay under latency and payload budgets', buildRouteSummary(routeResults))
  ensure(checks, sourceOfTruthShape(routesByPath['/api/source-of-truth']), 'source-of-truth route payload shape remains compatible', '/api/source-of-truth')
  ensure(checks, sourceLifecycleShape(routesByPath['/api/foundation/source-lifecycle']), 'source lifecycle route returns composite source status', '/api/foundation/source-lifecycle')
  ensure(checks, marketingSourceMapShape(routesByPath['/api/foundation/marketing-source-map']), 'marketing source map route returns structured payload', '/api/foundation/marketing-source-map')
  ensure(checks, genericStructuredShape(routesByPath['/api/foundation/brand-stack']), 'brand stack route returns structured payload', '/api/foundation/brand-stack')
  ensure(checks, genericStructuredShape(routesByPath['/api/foundation/tier-behavioral-completion']), 'tier behavioral completion route returns structured payload', '/api/foundation/tier-behavioral-completion')
  ensure(checks, genericStructuredShape(routesByPath['/api/foundation/verification-runs']), 'verification runs route returns structured payload', '/api/foundation/verification-runs')
  ensure(checks, genericStructuredShape(routesByPath['/api/foundation/per-user-changelog?limit=1']), 'per-user changelog route returns structured payload', '/api/foundation/per-user-changelog')
  ensure(checks, genericStructuredShape(routesByPath['/api/foundation/restricted-decision-queue?limit=1']), 'restricted decision queue route returns structured payload', '/api/foundation/restricted-decision-queue')
  ensure(checks, genericStructuredShape(routesByPath['/api/foundation/source-coverage-closeout']), 'source coverage closeout route returns structured payload', '/api/foundation/source-coverage-closeout')
  ensure(checks, genericStructuredShape(routesByPath['/api/foundation/source-extraction-coverage']), 'source extraction coverage route returns structured payload', '/api/foundation/source-extraction-coverage')
  ensure(checks, genericStructuredShape(routesByPath['/api/foundation/source-maturity-grid']), 'source maturity grid route returns structured payload', '/api/foundation/source-maturity-grid')
  ensure(checks, connectorMatrixShape(routesByPath['/api/foundation/source-connector-matrix']), 'source connector matrix route returns matrix-shaped payload', '/api/foundation/source-connector-matrix')
  ensure(checks, genericStructuredShape(routesByPath['/api/foundation/connector-credential-preflight']), 'connector credential preflight route returns structured payload', '/api/foundation/connector-credential-preflight')
  ensure(checks, hubRoutingShape(routesByPath['/api/foundation/source-hub-routing-matrix']), 'source hub routing matrix route returns matrix-shaped payload', '/api/foundation/source-hub-routing-matrix')

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    routeBudget: {
      durationMs: MAX_ROUTE_MS,
      bytes: MAX_ROUTE_BYTES,
    },
    checks,
    routes: routeResults.map(result => ({
      pathname: result.pathname,
      status: result.status,
      durationMs: result.durationMs,
      bytes: result.bytes,
    })),
    dogfood: {
      oldInlineRoutesRemoved: serverNoLongerOwnsInlineRoutes(serverSource),
      liveRoutesPassed: routeResults.every(routeOk),
      proofReadOnly: scriptIsReadOnly(scriptSource),
    },
  }

  if (jsonOutput) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Source route split proof')
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
