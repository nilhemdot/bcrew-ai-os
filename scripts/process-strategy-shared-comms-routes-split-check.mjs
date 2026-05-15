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
  STRATEGY_SHARED_COMMS_ROUTES_SPLIT_APPROVAL_PATH,
  STRATEGY_SHARED_COMMS_ROUTES_SPLIT_BEFORE_SERVER_LINES,
  STRATEGY_SHARED_COMMS_ROUTES_SPLIT_CARD_ID,
  STRATEGY_SHARED_COMMS_ROUTES_SPLIT_PLAN_PATH,
  STRATEGY_SHARED_COMMS_ROUTES_SPLIT_ROUTE_BUDGET_BYTES,
  STRATEGY_SHARED_COMMS_ROUTES_SPLIT_ROUTE_BUDGET_MS,
  STRATEGY_SHARED_COMMS_ROUTES_SPLIT_SCRIPT_PATH,
  STRATEGY_SHARED_COMMS_ROUTES_SPLIT_SPRINT_ID,
  buildStrategySharedCommsRoutesSplitDogfoodProof,
} from '../lib/strategy-shared-comms-routes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const MOVED_ROUTE_MARKERS = [
  "app.get('/api/shared-communications/archive'",
  "app.get('/api/shared-communications/coverage'",
  "app.get('/api/shared-communications/candidates'",
  "app.get('/api/shared-communications/synthesis'",
  "app.post('/api/shared-communications/candidates/:candidateKey/apply-to-backlog'",
  "app.post('/api/shared-communications/candidates/:candidateKey/apply-to-decision'",
  "app.post('/api/shared-communications/candidates/:candidateKey/apply-to-question'",
  "app.post('/api/shared-communications/candidates/:candidateKey/:action'",
  "app.get('/api/strategic-execution/prework-coverage'",
  "app.get('/api/strategic-execution/goal-truth'",
  "app.get('/api/strategic-execution/operating-truth'",
  "app.get('/api/strategic-execution/v2'",
  "app.get('/api/strategic-execution/action-routes'",
  "app.post('/api/strategic-execution/action-routes/:routeId/review'",
  "app.post('/api/strategic-execution/advisor'",
  "app.get('/api/foundation/action-review'",
  "app.post('/api/foundation/action-review/:routeId/review'",
]

const DIRECT_FOUNDATION_WRITE_MARKERS = [
  "app.post('/api/foundation/backlog'",
  "app.patch('/api/foundation/backlog/:id'",
  "app.post('/api/foundation/decisions'",
  "app.patch('/api/foundation/decisions/:id'",
  "app.post('/api/foundation/questions'",
  "app.patch('/api/foundation/questions/:id'",
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

async function fetchMeasured(baseUrl, pathname, options = {}) {
  const startedAt = Date.now()
  const response = await fetch(new URL(pathname, baseUrl), {
    redirect: 'manual',
    ...options,
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  })
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
    ok: response.ok,
    durationMs,
    bytes: Buffer.byteLength(text),
    contentType: response.headers.get('content-type') || '',
    cacheControl: response.headers.get('cache-control') || '',
    json,
  }
}

function moduleOwnsMovedRoutes(moduleSource = '') {
  const source = String(moduleSource || '')
  return MOVED_ROUTE_MARKERS.every(marker => source.includes(marker)) &&
    source.includes('registerStrategySharedCommsRoutes') &&
    source.includes('buildStrategyHubV2Payload') &&
    source.includes('buildFoundationActionReviewSnapshot')
}

function serverNoLongerOwnsMovedRoutes(serverSource = '') {
  const source = String(serverSource || '')
  return MOVED_ROUTE_MARKERS.every(marker => !source.includes(marker))
}

function directFoundationWritesRemainInServer(serverSource = '', moduleSource = '') {
  const server = String(serverSource || '')
  const module = String(moduleSource || '')
  return DIRECT_FOUNDATION_WRITE_MARKERS.every(marker => server.includes(marker)) &&
    DIRECT_FOUNDATION_WRITE_MARKERS.every(marker => !module.includes(marker))
}

function outOfScopeRoutesRemainInServer(serverSource = '', moduleSource = '') {
  const server = String(serverSource || '')
  const module = String(moduleSource || '')
  const markers = [
    "app.post('/api/intelligence/evidence'",
    "app.post('/api/sales-hub/listing-assignment'",
    "app.get('/api/agent-feedback/session'",
  ]
  return markers.every(marker => server.includes(marker)) &&
    markers.every(marker => !module.includes(marker))
}

function scriptIsReadOnly(scriptSource = '') {
  const forbiddenTokens = [
    'create' + 'BacklogItem',
    'update' + 'BacklogItem',
    'upsert' + 'FoundationCurrentSprintOverlay',
    'applySharedCommunication' + 'Candidate',
    'approve' + 'ActionRoute',
    'applyApproved' + 'ActionRoute',
    'reject' + 'ActionRoute',
    'reroute' + 'ActionRoute',
    'INSERT' + ' INTO',
    'UPDATE' + ' ',
    'DELETE' + ' FROM',
    'fs.' + 'writeFile',
    'write' + 'File(',
  ]
  return forbiddenTokens.every(token => !String(scriptSource || '').includes(token))
}

function readRouteShapesPass(routes = {}) {
  return routes.archive?.status === 200 &&
    routes.archive.json && typeof routes.archive.json === 'object' &&
    routes.coverage?.status === 200 &&
    routes.coverage.json && typeof routes.coverage.json === 'object' &&
    routes.candidates?.status === 200 &&
    routes.candidates.json && typeof routes.candidates.json === 'object' &&
    routes.synthesis?.status === 200 &&
    routes.synthesis.json && typeof routes.synthesis.json === 'object' &&
    routes.prework?.status === 200 &&
    routes.goalTruth?.status === 200 &&
    routes.operatingTruth?.status === 200 &&
    routes.strategyV2?.status === 200 &&
    routes.strategyV2.json?.mode === 'source_to_gap_route_review' &&
    routes.strategyV2.json?.meetingReady &&
    routes.actionRoutes?.status === 200 &&
    Array.isArray(routes.actionRoutes.json?.recentRoutes) &&
    routes.foundationActionReview?.status === 200 &&
    routes.foundationActionReview.json?.summary
}

function routeBudgetsPass(routes = []) {
  return routes.every(route =>
    route.status < 500 &&
    route.durationMs <= STRATEGY_SHARED_COMMS_ROUTES_SPLIT_ROUTE_BUDGET_MS &&
    route.bytes <= STRATEGY_SHARED_COMMS_ROUTES_SPLIT_ROUTE_BUDGET_BYTES
  )
}

function safePostFailuresPass(posts = {}) {
  return posts.strategyMissingReview?.status === 404 &&
    posts.foundationMissingReview?.status === 404 &&
    posts.decisionInvalidBody?.status === 400 &&
    posts.questionInvalidBody?.status === 400 &&
    posts.candidateInvalidAction?.status === 400 &&
    posts.strategyAdvisorOffline?.status === 423
}

function summarizeRoute(route = {}) {
  return {
    method: route.method,
    pathname: route.pathname,
    status: route.status,
    ok: route.ok,
    durationMs: route.durationMs,
    bytes: route.bytes,
    contentType: route.contentType,
    cacheControl: route.cacheControl,
    jsonKeys: route.json && typeof route.json === 'object' ? Object.keys(route.json).slice(0, 16) : [],
    code: route.json?.error?.code || route.json?.code || null,
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
    validatePlanApprovalFile({ repoRoot, approvalRef: STRATEGY_SHARED_COMMS_ROUTES_SPLIT_APPROVAL_PATH, cardId: STRATEGY_SHARED_COMMS_ROUTES_SPLIT_CARD_ID }),
    getBacklogItemsByIds([STRATEGY_SHARED_COMMS_ROUTES_SPLIT_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([STRATEGY_SHARED_COMMS_ROUTES_SPLIT_CARD_ID]),
    readRepoFile('server.js'),
    readRepoFile('lib/strategy-shared-comms-routes.js'),
    readRepoFile(STRATEGY_SHARED_COMMS_ROUTES_SPLIT_SCRIPT_PATH),
    readRepoFile(STRATEGY_SHARED_COMMS_ROUTES_SPLIT_PLAN_PATH),
  ])

  const card = cards[0] || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === STRATEGY_SHARED_COMMS_ROUTES_SPLIT_CARD_ID) || null
  const planCritic = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= 9.8) || null
  const dogfood = buildStrategySharedCommsRoutesSplitDogfoodProof({ serverSource, moduleSource, proofScriptSource: scriptSource })
  const serverLineCount = String(serverSource || '').split('\n').length

  ensure(checks, approvalValidation.ok, 'Plan approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || STRATEGY_SHARED_COMMS_ROUTES_SPLIT_APPROVAL_PATH)
  ensure(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  ensure(checks, activeSprint.sprint?.sprintId === STRATEGY_SHARED_COMMS_ROUTES_SPLIT_SPRINT_ID, 'Current Sprint is the server monolith closeout sprint', activeSprint.sprint?.sprintId || 'missing')
  ensure(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains the card in Building Now or Done', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  ensure(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  ensure(checks, moduleOwnsMovedRoutes(moduleSource), 'new module owns Strategy/shared-comms route strings', 'lib/strategy-shared-comms-routes.js')
  ensure(checks, serverSource.includes('registerStrategySharedCommsRoutes(app'), 'server.js delegates through Strategy/shared-comms registrar', 'registerStrategySharedCommsRoutes(app)')
  ensure(checks, serverNoLongerOwnsMovedRoutes(serverSource), 'server.js no longer owns moved Strategy/shared-comms handlers', 'old inline moved route markers absent')
  ensure(checks, directFoundationWritesRemainInServer(serverSource, moduleSource), 'direct Foundation write routes remain in server.js', 'backlog/decision/question direct write routes still server-owned')
  ensure(checks, outOfScopeRoutesRemainInServer(serverSource, moduleSource), 'out-of-scope Intelligence/Sales/Agent Feedback routes remain in server.js', 'no opportunistic route movement')
  ensure(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only by default and uses only safe invalid POST probes', 'no DB mutation/helper mutation tokens in proof script')
  ensure(checks, dogfood.ok, 'dogfood rejects old Strategy/shared-comms route split failures', dogfood.summary)
  ensure(checks, planSource.includes('No direct Foundation write route extraction.'), 'plan blocks direct Foundation write route movement', STRATEGY_SHARED_COMMS_ROUTES_SPLIT_PLAN_PATH)
  ensure(checks, planSource.includes('No Sales route movement.'), 'plan blocks Sales route movement', STRATEGY_SHARED_COMMS_ROUTES_SPLIT_PLAN_PATH)
  ensure(checks, serverLineCount < STRATEGY_SHARED_COMMS_ROUTES_SPLIT_BEFORE_SERVER_LINES, 'server.js line count decreases', `${STRATEGY_SHARED_COMMS_ROUTES_SPLIT_BEFORE_SERVER_LINES} -> ${serverLineCount}`)

  const readRoutes = {
    archive: await fetchMeasured(baseUrl, '/api/shared-communications/archive?limit=1'),
    coverage: await fetchMeasured(baseUrl, '/api/shared-communications/coverage'),
    candidates: await fetchMeasured(baseUrl, '/api/shared-communications/candidates?limit=1'),
    synthesis: await fetchMeasured(baseUrl, '/api/shared-communications/synthesis?limit=1&itemLimit=1'),
    prework: await fetchMeasured(baseUrl, '/api/strategic-execution/prework-coverage'),
    goalTruth: await fetchMeasured(baseUrl, '/api/strategic-execution/goal-truth'),
    operatingTruth: await fetchMeasured(baseUrl, '/api/strategic-execution/operating-truth'),
    strategyV2: await fetchMeasured(baseUrl, '/api/strategic-execution/v2'),
    actionRoutes: await fetchMeasured(baseUrl, '/api/strategic-execution/action-routes'),
    foundationActionReview: await fetchMeasured(baseUrl, '/api/foundation/action-review'),
  }
  const safePosts = {
    strategyMissingReview: await fetchMeasured(baseUrl, '/api/strategic-execution/action-routes/__missing__/review', {
      method: 'POST',
      body: JSON.stringify({ action: 'reject', note: 'route split invalid fixture' }),
    }),
    foundationMissingReview: await fetchMeasured(baseUrl, '/api/foundation/action-review/__missing__/review', {
      method: 'POST',
      body: JSON.stringify({ action: 'approve' }),
    }),
    decisionInvalidBody: await fetchMeasured(baseUrl, '/api/shared-communications/candidates/__missing__/apply-to-decision', {
      method: 'POST',
      body: JSON.stringify({ unsupported: true }),
    }),
    questionInvalidBody: await fetchMeasured(baseUrl, '/api/shared-communications/candidates/__missing__/apply-to-question', {
      method: 'POST',
      body: JSON.stringify({ unsupported: true }),
    }),
    candidateInvalidAction: await fetchMeasured(baseUrl, '/api/shared-communications/candidates/__missing__/unsupported-action', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
    strategyAdvisorOffline: await fetchMeasured(baseUrl, '/api/strategic-execution/advisor', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  }

  const measuredReads = Object.values(readRoutes)
  const measuredPosts = Object.values(safePosts)
  ensure(checks, readRouteShapesPass(readRoutes), 'moved read routes return expected payload shapes', measuredReads.map(route => `${route.pathname}:${route.status}`).join(', '))
  ensure(checks, routeBudgetsPass(measuredReads), 'moved read routes stay under route budgets', measuredReads.map(route => `${route.pathname}:${route.durationMs}ms/${route.bytes}B`).join(', '))
  ensure(checks, safePostFailuresPass(safePosts), 'safe invalid POST probes fail before mutation', measuredPosts.map(route => `${route.pathname}:${route.status}`).join(', '))

  const failures = checks.filter(check => !check.ok)
  const summary = {
    ok: failures.length === 0,
    cardId: STRATEGY_SHARED_COMMS_ROUTES_SPLIT_CARD_ID,
    sprintId: activeSprint.sprint?.sprintId || null,
    serverLineCount,
    beforeServerLines: STRATEGY_SHARED_COMMS_ROUTES_SPLIT_BEFORE_SERVER_LINES,
    dogfood,
    readRoutes: Object.fromEntries(Object.entries(readRoutes).map(([key, value]) => [key, summarizeRoute(value)])),
    safePosts: Object.fromEntries(Object.entries(safePosts).map(([key, value]) => [key, summarizeRoute(value)])),
    checks,
    failures,
  }

  if (jsonOutput) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Strategy/shared-comms route split proof')
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` - ${check.detail}` : ''}`)
    }
  }

  await closeFoundationDb()
  if (failures.length) process.exit(1)
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error)
  process.exit(1)
})
