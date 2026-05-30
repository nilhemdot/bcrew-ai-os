#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { createAgentFeedbackToken } from '../lib/agent-feedback.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  AGENT_FEEDBACK_PUBLIC_ROUTE_MARKERS,
  AGENT_FEEDBACK_ROUTES_SPLIT_APPROVAL_PATH,
  AGENT_FEEDBACK_ROUTES_SPLIT_BEFORE_SERVER_LINES,
  AGENT_FEEDBACK_ROUTES_SPLIT_CARD_ID,
  AGENT_FEEDBACK_ROUTES_SPLIT_CLOSEOUT_KEY,
  AGENT_FEEDBACK_ROUTES_SPLIT_PLAN_PATH,
  AGENT_FEEDBACK_ROUTES_SPLIT_ROUTE_BUDGET_BYTES,
  AGENT_FEEDBACK_ROUTES_SPLIT_ROUTE_BUDGET_MS,
  AGENT_FEEDBACK_ROUTES_SPLIT_SCRIPT_PATH,
  AGENT_FEEDBACK_ROUTES_SPLIT_SPRINT_ID,
  buildAgentFeedbackRoutesSplitDogfoodProof,
} from '../lib/agent-feedback-routes.js'
import { evaluateSprintCheckHistoricalMode } from '../lib/sprint-check-historical-mode.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const OUT_OF_SCOPE_ROUTE_MARKERS = [
  "app.get('/api/foundation/agent-feedback-production-dry-run'",
  "app.get('/api/ops/agent-feedback-production-dry-run'",
  "app.post('/api/sales-hub/listing-assignment'",
  "app.post('/api/intelligence/evidence'",
]

const SAFE_ROUTE_PROBES = [
  {
    label: 'invalid session token',
    method: 'GET',
    pathname: '/api/agent-feedback/session?token=invalid',
    expectedStatus: 400,
    expectedCode: 'invalid_agent_feedback_token',
  },
  {
    label: 'invalid submit token',
    method: 'POST',
    pathname: '/api/agent-feedback/submit',
    body: { token: 'invalid', score: 10 },
    expectedStatus: 400,
    expectedCode: 'agent_feedback_submit_failed',
  },
  {
    label: 'synthetic valid token invalid score',
    method: 'POST',
    pathname: '/api/agent-feedback/submit',
    body: () => ({
      token: createAgentFeedbackToken({
        taskId: `route-split-dogfood-${Date.now()}`,
        agentName: 'Synthetic Route Split',
        milestoneDay: 30,
      }),
      score: 11,
    }),
    expectedStatus: 400,
    expectedCode: 'invalid_agent_feedback_score',
  },
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

function includesAll(source = '', markers = []) {
  const text = String(source || '')
  return markers.every(marker => text.includes(marker))
}

function excludesAll(source = '', markers = []) {
  const text = String(source || '')
  return markers.every(marker => !text.includes(marker))
}

function scriptIsReadOnly(scriptSource = '') {
  const forbiddenTokens = [
    'upsert' + 'AgentOnboardingFeedbackResponse',
    'write' + 'AgentFeedbackToClickUp',
    'send' + 'AgentFeedbackResponseNotification',
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

function noRawPrivateMaterial(value) {
  const text = JSON.stringify(value)
  return !/agent-feedback\?token=|tokenHash|token_hash|improvementFeedback|feedback text|@/i.test(text)
}

async function readMutationFingerprints() {
  const pool = new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
  try {
    const result = await pool.query(`
      SELECT 'agent_onboarding_feedback_responses' AS table_name, COUNT(*)::int AS row_count FROM agent_onboarding_feedback_responses
      UNION ALL SELECT 'agent_onboarding_feedback_response_notifications', COUNT(*)::int FROM agent_onboarding_feedback_response_notifications
      ORDER BY table_name
    `)
    return Object.fromEntries(result.rows.map(row => [row.table_name, row.row_count]))
  } finally {
    await pool.end()
  }
}

async function fetchMeasured(baseUrl, probe) {
  const body = typeof probe.body === 'function' ? probe.body() : probe.body
  const startedAt = Date.now()
  const response = await fetch(new URL(probe.pathname, baseUrl), {
    method: probe.method,
    redirect: 'manual',
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  return {
    label: probe.label,
    pathname: probe.pathname.replace(/token=[^&]+/g, 'token=redacted'),
    method: probe.method,
    expectedStatus: probe.expectedStatus,
    expectedCode: probe.expectedCode,
    status: response.status,
    ok: response.ok,
    durationMs: Date.now() - startedAt,
    bytes: Buffer.byteLength(text),
    contentType: response.headers.get('content-type') || '',
    cacheControl: response.headers.get('cache-control') || '',
    code: json?.error?.code || json?.code || null,
  }
}

function routeProbesPass(results = []) {
  return results.length === SAFE_ROUTE_PROBES.length &&
    results.every(result =>
      result.status === result.expectedStatus &&
      result.code === result.expectedCode &&
      result.status < 500 &&
      result.durationMs <= AGENT_FEEDBACK_ROUTES_SPLIT_ROUTE_BUDGET_MS &&
      result.bytes <= AGENT_FEEDBACK_ROUTES_SPLIT_ROUTE_BUDGET_BYTES
    )
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
    validatePlanApprovalFile({ repoRoot, approvalRef: AGENT_FEEDBACK_ROUTES_SPLIT_APPROVAL_PATH, cardId: AGENT_FEEDBACK_ROUTES_SPLIT_CARD_ID }),
    getBacklogItemsByIds([AGENT_FEEDBACK_ROUTES_SPLIT_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([AGENT_FEEDBACK_ROUTES_SPLIT_CARD_ID]),
    readRepoFile('server.js'),
    readRepoFile('lib/agent-feedback-routes.js'),
    readRepoFile(AGENT_FEEDBACK_ROUTES_SPLIT_SCRIPT_PATH),
    readRepoFile(AGENT_FEEDBACK_ROUTES_SPLIT_PLAN_PATH),
  ])

  const card = cards[0] || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === AGENT_FEEDBACK_ROUTES_SPLIT_CARD_ID) || null
  const planCritic = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= 9.8) || null
  const dogfood = buildAgentFeedbackRoutesSplitDogfoodProof({ serverSource, moduleSource, proofScriptSource: scriptSource })
  const serverLineCount = String(serverSource || '').split('\n').length
  const sprintMode = evaluateSprintCheckHistoricalMode({
    activeSprint,
    card,
    closeouts: getFoundationBuildCloseouts(),
    cardId: AGENT_FEEDBACK_ROUTES_SPLIT_CARD_ID,
    expectedSprintId: AGENT_FEEDBACK_ROUTES_SPLIT_SPRINT_ID,
    closeoutKey: AGENT_FEEDBACK_ROUTES_SPLIT_CLOSEOUT_KEY,
  })

  ensure(checks, approvalValidation.ok, 'Plan approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || AGENT_FEEDBACK_ROUTES_SPLIT_APPROVAL_PATH)
  ensure(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  ensure(checks, sprintMode.ok, 'Current Sprint or verified closeout owns Agent Feedback routes split proof', `${sprintMode.mode}: ${sprintMode.reason}`)
  ensure(checks, sprintMode.mode === 'historical_closeout' || (sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage)), 'Current Sprint contains active card or verified historical closeout exists', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : sprintMode.mode)
  ensure(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  ensure(checks, includesAll(moduleSource, AGENT_FEEDBACK_PUBLIC_ROUTE_MARKERS), 'new module owns public Agent Feedback route strings', 'lib/agent-feedback-routes.js')
  ensure(checks, moduleSource.includes('registerAgentFeedbackRoutes'), 'new module exports Agent Feedback route registrar', 'registerAgentFeedbackRoutes')
  ensure(checks, serverSource.includes('registerAgentFeedbackRoutes(app'), 'server.js delegates through Agent Feedback registrar', 'registerAgentFeedbackRoutes(app)')
  ensure(checks, excludesAll(serverSource, AGENT_FEEDBACK_PUBLIC_ROUTE_MARKERS), 'server.js no longer owns moved public Agent Feedback routes', 'old inline public route markers absent')
  ensure(checks, excludesAll(moduleSource, OUT_OF_SCOPE_ROUTE_MARKERS), 'out-of-scope routes remain outside Agent Feedback route module', 'out-of-scope markers absent from lib/agent-feedback-routes.js')
  ensure(checks, excludesAll(moduleSource, OUT_OF_SCOPE_ROUTE_MARKERS), 'new module does not own admin dry-run, Sales, Foundation write, or Intelligence routes', 'out-of-scope markers absent')
  ensure(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only by default', 'no DB writes, backlog writes, ClickUp writes, Gmail/notification sends, or file writes')
  ensure(checks, dogfood.ok, 'dogfood rejects old Agent Feedback route split failures', dogfood.summary)
  ensure(checks, planSource.includes('Do not submit real feedback.'), 'plan blocks real feedback submit from proof', AGENT_FEEDBACK_ROUTES_SPLIT_PLAN_PATH)
  ensure(checks, planSource.includes('metadata-only'), 'plan requires metadata-only privacy proof', AGENT_FEEDBACK_ROUTES_SPLIT_PLAN_PATH)
  ensure(checks, serverLineCount < AGENT_FEEDBACK_ROUTES_SPLIT_BEFORE_SERVER_LINES && serverLineCount < 5000, 'server.js line count stays below architecture-risk threshold', `${AGENT_FEEDBACK_ROUTES_SPLIT_BEFORE_SERVER_LINES} -> ${serverLineCount}`)

  const beforeCounts = await readMutationFingerprints()
  const routeResults = []
  for (const probe of SAFE_ROUTE_PROBES) {
    routeResults.push(await fetchMeasured(baseUrl, probe))
  }
  const afterCounts = await readMutationFingerprints()

  ensure(checks, routeProbesPass(routeResults), 'moved public Agent Feedback routes return expected safe invalid behavior', routeResults.map(result => `${result.label}:${result.status}/${result.code}/${result.durationMs}ms/${result.bytes}B`).join(', '))
  ensure(checks, JSON.stringify(beforeCounts) === JSON.stringify(afterCounts), 'row-count fingerprints stay unchanged after safe invalid route probes', `${JSON.stringify(beforeCounts)} -> ${JSON.stringify(afterCounts)}`)
  ensure(checks, noRawPrivateMaterial(routeResults), 'metadata-only privacy proof excludes raw token/hash/email/feedback text', 'route result summary is redacted')

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: AGENT_FEEDBACK_ROUTES_SPLIT_CARD_ID,
    closeoutKey: AGENT_FEEDBACK_ROUTES_SPLIT_CLOSEOUT_KEY,
    baseUrl,
    lineCounts: {
      serverBefore: AGENT_FEEDBACK_ROUTES_SPLIT_BEFORE_SERVER_LINES,
      serverAfter: serverLineCount,
      delta: serverLineCount - AGENT_FEEDBACK_ROUTES_SPLIT_BEFORE_SERVER_LINES,
    },
    routeBudget: {
      durationMs: AGENT_FEEDBACK_ROUTES_SPLIT_ROUTE_BUDGET_MS,
      bytes: AGENT_FEEDBACK_ROUTES_SPLIT_ROUTE_BUDGET_BYTES,
    },
    checks,
    routeResults,
    mutationFingerprints: {
      before: beforeCounts,
      after: afterCounts,
    },
    dogfood,
  }

  if (jsonOutput) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Agent Feedback route split proof')
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
