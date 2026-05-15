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

const CARD_ID = 'BUILD-INTEL-ROUTE-SPLIT-001'
const SPRINT_ID = 'build-intel-route-split-2026-05-15'
const CLOSEOUT_KEY = 'build-intel-route-split-v1'
const APPROVAL_REF = 'docs/process/approvals/BUILD-INTEL-ROUTE-SPLIT-001.json'
const MODULE_PATH = 'lib/foundation-build-intel-routes.js'
const SCRIPT_PATH = 'scripts/process-build-intel-route-split-check.mjs'
const MAX_ROUTE_MS = 5000
const MAX_ROUTE_BYTES = 2_500_000

const ROUTE_MARKERS = [
  '/api/foundation/build-intel-watchlist',
  '/api/foundation/multimodal-extractor-contract',
  '/api/foundation/research-inbox-contract',
  '/api/foundation/control-compression',
  '/api/foundation/implementation-intelligence',
  '/api/foundation/build-intel-extraction',
  '/api/foundation/gstack-build-intel',
]

const OLD_INLINE_MARKERS = [
  "app.get('/api/foundation/build-intel-watchlist'",
  "app.get('/api/foundation/multimodal-extractor-contract'",
  "app.get('/api/foundation/research-inbox-contract'",
  "app.get('/api/foundation/control-compression'",
  "app.get('/api/foundation/implementation-intelligence'",
  "app.get('/api/foundation/build-intel-extraction'",
  "app.get('/api/foundation/gstack-build-intel'",
]

const LIVE_ROUTES = [
  '/api/foundation/build-intel-watchlist',
  '/api/foundation/multimodal-extractor-contract',
  '/api/foundation/research-inbox-contract',
  '/api/foundation/control-compression',
  '/api/foundation/implementation-intelligence',
  '/api/foundation/build-intel-extraction',
  '/api/foundation/gstack-build-intel',
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

function buildIntelModuleOwnsRoutes(moduleSource) {
  return moduleSource.includes('registerFoundationBuildIntelRoutes') &&
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

function watchlistShape(result) {
  return hasObjectPayload(result) &&
    result.json.cardId === 'CREATOR-WATCHLIST-001' &&
    Array.isArray(result.json.entries) &&
    result.json.summary
}

function multimodalShape(result) {
  return hasObjectPayload(result) &&
    result.json.cardId === 'MULTIMODAL-EXTRACTOR-001' &&
    result.json.contractOnly === true
}

function researchInboxShape(result) {
  return hasObjectPayload(result) &&
    result.json.cardId === 'RESEARCH-INBOX-001' &&
    result.json.proposalOnly === true
}

function controlCompressionShape(result) {
  return hasObjectPayload(result) &&
    result.json.closeoutKey === 'foundation-control-backlog-compression-v1' &&
    result.json.status === 'ready'
}

function implementationIntelligenceShape(result) {
  return hasObjectPayload(result) &&
    result.json.closeoutKey === 'implementation-intelligence-v1' &&
    result.json.status === 'ready'
}

function buildIntelExtractionShape(result) {
  return hasObjectPayload(result) &&
    result.json.closeoutKey === 'build-intel-extraction-implementation-v1' &&
    result.json.status === 'ready' &&
    result.json.brief
}

function gstackShape(result) {
  return hasObjectPayload(result) &&
    result.json.sourceId === 'SRC-GITHUB-BUILD-INTEL-001' &&
    result.json.closeoutKey === 'gstack-build-intel-extraction-v1' &&
    result.json.status === 'ready'
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
  ensure(checks, activeSprint.sprint?.sprintId === SPRINT_ID, 'Current Sprint is the Build Intel route split sprint', activeSprint.sprint?.sprintId || 'missing')
  ensure(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains the card in Building Now or Done', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  ensure(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  ensure(checks, buildIntelModuleOwnsRoutes(moduleSource), 'new route module owns the Build Intel route cluster', MODULE_PATH)
  ensure(checks, serverSource.includes('registerFoundationBuildIntelRoutes(app'), 'server.js delegates through Build Intel route registrar', 'registerFoundationBuildIntelRoutes(app)')
  ensure(checks, serverNoLongerOwnsInlineRoutes(serverSource), 'server.js no longer owns moved inline Build Intel route handlers', 'old inline app.get markers absent')
  ensure(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only', 'no write/mutation tokens in proof script')

  const routeResults = []
  for (const route of LIVE_ROUTES) {
    routeResults.push(await fetchJsonMeasured(baseUrl, route))
  }
  const routesByPath = Object.fromEntries(routeResults.map(result => [result.pathname, result]))

  ensure(checks, routeResults.every(routeOk), 'all moved Build Intel live routes return success', buildRouteSummary(routeResults))
  ensure(checks, routeResults.every(routeUnderBudget), 'all moved Build Intel live routes stay under latency and payload budgets', buildRouteSummary(routeResults))
  ensure(checks, watchlistShape(routesByPath['/api/foundation/build-intel-watchlist']), 'Build Intel watchlist payload shape remains compatible', '/api/foundation/build-intel-watchlist')
  ensure(checks, multimodalShape(routesByPath['/api/foundation/multimodal-extractor-contract']), 'multimodal extractor contract payload shape remains compatible', '/api/foundation/multimodal-extractor-contract')
  ensure(checks, researchInboxShape(routesByPath['/api/foundation/research-inbox-contract']), 'Research Inbox contract payload shape remains compatible', '/api/foundation/research-inbox-contract')
  ensure(checks, controlCompressionShape(routesByPath['/api/foundation/control-compression']), 'control compression route returns structured payload', '/api/foundation/control-compression')
  ensure(checks, implementationIntelligenceShape(routesByPath['/api/foundation/implementation-intelligence']), 'implementation intelligence route returns structured payload', '/api/foundation/implementation-intelligence')
  ensure(checks, buildIntelExtractionShape(routesByPath['/api/foundation/build-intel-extraction']), 'Build Intel extraction route returns structured payload', '/api/foundation/build-intel-extraction')
  ensure(checks, gstackShape(routesByPath['/api/foundation/gstack-build-intel']), 'GStack Build Intel route returns structured payload', '/api/foundation/gstack-build-intel')

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
    console.log('Build Intel route split proof')
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
