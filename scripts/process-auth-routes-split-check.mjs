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
  AUTH_ROUTES_SPLIT_APPROVAL_PATH,
  AUTH_ROUTES_SPLIT_BEFORE_SERVER_LINES,
  AUTH_ROUTES_SPLIT_CARD_ID,
  AUTH_ROUTES_SPLIT_CLOSEOUT_KEY,
  AUTH_ROUTES_SPLIT_PLAN_PATH,
  AUTH_ROUTES_SPLIT_ROUTE_BUDGET_BYTES,
  AUTH_ROUTES_SPLIT_ROUTE_BUDGET_MS,
  AUTH_ROUTES_SPLIT_SCRIPT_PATH,
  AUTH_ROUTES_SPLIT_SPRINT_ID,
  buildAuthRoutesSplitDogfoodProof,
} from '../lib/auth-routes.js'

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

async function fetchMeasured(baseUrl, pathname, options = {}) {
  const startedAt = Date.now()
  const response = await fetch(new URL(pathname, baseUrl), {
    redirect: 'manual',
    ...options,
    headers: {
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
    method: options.method || 'GET',
    pathname,
    status: response.status,
    ok: response.ok,
    durationMs,
    bytes: Buffer.byteLength(text),
    contentType: response.headers.get('content-type') || '',
    cacheControl: response.headers.get('cache-control') || '',
    location: response.headers.get('location') || '',
    setCookie: response.headers.get('set-cookie') || '',
    json,
  }
}

function routeSummary(routes = []) {
  return routes
    .map(route => `${route.method} ${route.pathname}:${route.status}/${route.durationMs}ms/${route.bytes}B/${route.contentType || 'unknown'}`)
    .join(', ')
}

function moduleOwnsAuthRoutes(moduleSource = '') {
  const source = String(moduleSource || '')
  return [
    'registerAuthRoutes',
    'app.use(setSecurityHeaders)',
    'app.use(logApiRequest)',
    'express.json',
    "app.get('/login'",
    "app.post('/api/auth/login'",
    "app.post('/api/auth/google'",
    "app.get('/api/auth/session'",
    "app.post('/api/auth/logout'",
    'express.static',
    'directHtmlRoutes',
  ].every(marker => source.includes(marker))
}

function serverNoLongerOwnsInlineAuthRoutes(serverSource = '') {
  const source = String(serverSource || '')
  return [
    "app.get('/login'",
    "app.post('/api/auth/login'",
    "app.post('/api/auth/google'",
    "app.get('/api/auth/session'",
    "app.post('/api/auth/logout'",
    'app.use(setSecurityHeaders)',
    'app.use(logApiRequest)',
    'express.static(path.join(__dirname,',
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

function authRouteShapesPass(routes = {}) {
  const loginPage = routes.loginPage
  const session = routes.session
  const logout = routes.logout
  const passwordLogin = routes.passwordLogin
  const googleLogin = routes.googleLogin
  const directHtml = routes.directHtml
  const staticAsset = routes.staticAsset
  return loginPage?.status === 200 &&
    loginPage.contentType.includes('text/html') &&
    loginPage.cacheControl.includes('no-store') &&
    session?.status === 200 &&
    session.json?.authenticated === true &&
    session.json?.user?.role === 'owner' &&
    logout?.status === 200 &&
    logout.json?.ok === true &&
    logout.setCookie.includes('aios_session=') &&
    [401, 503].includes(passwordLogin?.status) &&
    Boolean(passwordLogin?.json?.error?.code) &&
    [400, 503].includes(googleLogin?.status) &&
    Boolean(googleLogin?.json?.error?.code) &&
    directHtml?.status >= 300 &&
    directHtml.status < 400 &&
    directHtml.location === '/foundation' &&
    staticAsset?.status === 200 &&
    staticAsset.cacheControl.includes('no-store')
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
    validatePlanApprovalFile({ repoRoot, approvalRef: AUTH_ROUTES_SPLIT_APPROVAL_PATH, cardId: AUTH_ROUTES_SPLIT_CARD_ID }),
    getBacklogItemsByIds([AUTH_ROUTES_SPLIT_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([AUTH_ROUTES_SPLIT_CARD_ID]),
    readRepoFile('server.js'),
    readRepoFile('lib/auth-routes.js'),
    readRepoFile(AUTH_ROUTES_SPLIT_SCRIPT_PATH),
    readRepoFile(AUTH_ROUTES_SPLIT_PLAN_PATH),
  ])

  const card = cards[0] || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === AUTH_ROUTES_SPLIT_CARD_ID) || null
  const planCritic = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= 9.8) || null
  const dogfood = buildAuthRoutesSplitDogfoodProof({ serverSource, moduleSource, proofScriptSource: scriptSource })
  const serverLineCount = String(serverSource || '').split('\n').length

  ensure(checks, approvalValidation.ok, 'Plan approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || AUTH_ROUTES_SPLIT_APPROVAL_PATH)
  ensure(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  ensure(checks, activeSprint.sprint?.sprintId === AUTH_ROUTES_SPLIT_SPRINT_ID, 'Current Sprint is the server monolith closeout sprint', activeSprint.sprint?.sprintId || 'missing')
  ensure(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains the card in Building Now or Done', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  ensure(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  ensure(checks, moduleOwnsAuthRoutes(moduleSource), 'new module owns auth/session/static route strings', 'lib/auth-routes.js')
  ensure(checks, serverSource.includes('registerAuthRoutes(app'), 'server.js delegates through auth route registrar', 'registerAuthRoutes(app)')
  ensure(checks, serverNoLongerOwnsInlineAuthRoutes(serverSource), 'server.js no longer owns moved inline auth/static handlers', 'old inline auth markers absent')
  ensure(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only by default and has no apply mutation posture', 'no write/mutation tokens in proof script')
  ensure(checks, dogfood.ok, 'dogfood rejects old auth route split failures', dogfood.summary)
  ensure(checks, planSource.includes('Do not rewrite auth providers.'), 'plan blocks auth provider rewrite', AUTH_ROUTES_SPLIT_PLAN_PATH)
  ensure(checks, serverLineCount < AUTH_ROUTES_SPLIT_BEFORE_SERVER_LINES, 'server.js line count decreases', `${AUTH_ROUTES_SPLIT_BEFORE_SERVER_LINES} -> ${serverLineCount}`)

  const routeResults = {
    loginPage: await fetchMeasured(baseUrl, '/login'),
    session: await fetchMeasured(baseUrl, '/api/auth/session'),
    logout: await fetchMeasured(baseUrl, '/api/auth/logout', { method: 'POST' }),
    passwordLogin: await fetchMeasured(baseUrl, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'missing@example.com', password: 'wrong' }),
    }),
    googleLogin: await fetchMeasured(baseUrl, '/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }),
    directHtml: await fetchMeasured(baseUrl, '/foundation.html'),
    staticAsset: await fetchMeasured(baseUrl, '/foundation.js'),
  }
  const measuredRoutes = Object.values(routeResults)

  ensure(checks, authRouteShapesPass(routeResults), 'moved auth/session/static routes return expected behavior', routeSummary(measuredRoutes))
  ensure(checks, measuredRoutes.every(route => route.durationMs <= AUTH_ROUTES_SPLIT_ROUTE_BUDGET_MS), 'moved auth/session/static routes stay under latency budget', routeSummary(measuredRoutes))
  ensure(checks, measuredRoutes.every(route => route.bytes <= AUTH_ROUTES_SPLIT_ROUTE_BUDGET_BYTES), 'moved auth/session/static routes stay under payload budget', routeSummary(measuredRoutes))

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: AUTH_ROUTES_SPLIT_CARD_ID,
    closeoutKey: AUTH_ROUTES_SPLIT_CLOSEOUT_KEY,
    baseUrl,
    lineCounts: {
      serverBefore: AUTH_ROUTES_SPLIT_BEFORE_SERVER_LINES,
      serverAfter: serverLineCount,
      delta: serverLineCount - AUTH_ROUTES_SPLIT_BEFORE_SERVER_LINES,
    },
    routeBudget: {
      durationMs: AUTH_ROUTES_SPLIT_ROUTE_BUDGET_MS,
      bytes: AUTH_ROUTES_SPLIT_ROUTE_BUDGET_BYTES,
    },
    checks,
    routes: routeResults,
    dogfood,
  }

  if (jsonOutput) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Auth route split proof')
    checks.forEach(check => console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`))
    console.log(`Summary: ${checks.filter(check => check.ok).length}/${checks.length} checks passed`)
  }

  await closeFoundationDb()
  if (!ok) process.exit(1)
}

main().catch(async error => {
  console.error(error instanceof Error ? error.message : 'Auth route split proof failed.')
  await closeFoundationDb().catch(() => {})
  process.exit(1)
})
