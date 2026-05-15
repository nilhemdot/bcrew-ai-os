#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'
import {
  FOUNDATION_WRITE_ROUTE_MARKERS,
  FOUNDATION_WRITE_ROUTES_SPLIT_APPROVAL_PATH,
  FOUNDATION_WRITE_ROUTES_SPLIT_BEFORE_SERVER_LINES,
  FOUNDATION_WRITE_ROUTES_SPLIT_CARD_ID,
  FOUNDATION_WRITE_ROUTES_SPLIT_PLAN_PATH,
  FOUNDATION_WRITE_ROUTES_SPLIT_ROUTE_BUDGET_BYTES,
  FOUNDATION_WRITE_ROUTES_SPLIT_ROUTE_BUDGET_MS,
  FOUNDATION_WRITE_ROUTES_SPLIT_SCRIPT_PATH,
  FOUNDATION_WRITE_ROUTES_SPLIT_SPRINT_ID,
  buildFoundationWriteRoutesSplitDogfoodProof,
} from '../lib/foundation-write-routes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const OUT_OF_SCOPE_ROUTE_MARKERS = [
  "app.post('/api/sales-hub/listing-assignment'",
  "app.get('/api/agent-feedback/session'",
  "app.post('/api/agent-feedback/submit'",
  "app.post('/api/intelligence/evidence'",
]

const SAFE_INVALID_WRITE_PROBES = [
  {
    label: 'invalid backlog create',
    method: 'POST',
    pathname: '/api/foundation/backlog',
    body: {},
    expectedStatus: 400,
    expectedCode: 'invalid_backlog_body',
  },
  {
    label: 'invalid backlog update',
    method: 'PATCH',
    pathname: '/api/foundation/backlog/__missing__',
    body: { lane: 'not-a-lane' },
    expectedStatus: 400,
    expectedCode: 'invalid_backlog_body',
  },
  {
    label: 'invalid decision create',
    method: 'POST',
    pathname: '/api/foundation/decisions',
    body: {},
    expectedStatus: 400,
    expectedCode: 'invalid_decision_body',
  },
  {
    label: 'invalid decision update',
    method: 'PATCH',
    pathname: '/api/foundation/decisions/__missing__',
    body: { status: 'not-a-status' },
    expectedStatus: 400,
    expectedCode: 'invalid_decision_body',
  },
  {
    label: 'invalid question create',
    method: 'POST',
    pathname: '/api/foundation/questions',
    body: {},
    expectedStatus: 400,
    expectedCode: 'invalid_question_body',
  },
  {
    label: 'invalid question update',
    method: 'PATCH',
    pathname: '/api/foundation/questions/__missing__',
    body: { status: 'not-a-status' },
    expectedStatus: 400,
    expectedCode: 'invalid_question_body',
  },
  {
    label: 'invalid doc update create',
    method: 'POST',
    pathname: '/api/foundation/doc-updates',
    body: {},
    expectedStatus: 400,
    expectedCode: 'invalid_doc_update_body',
  },
  {
    label: 'missing doc update approve',
    method: 'POST',
    pathname: '/api/foundation/doc-updates/__missing__/approve',
    body: {},
    expectedStatus: 404,
    expectedCode: 'doc_update_not_found',
  },
  {
    label: 'missing doc update reject',
    method: 'POST',
    pathname: '/api/foundation/doc-updates/__missing__/reject',
    body: {},
    expectedStatus: 404,
    expectedCode: 'doc_update_not_found',
  },
  {
    label: 'missing doc update apply',
    method: 'POST',
    pathname: '/api/foundation/doc-updates/__missing__/apply',
    body: {},
    expectedStatus: 404,
    expectedCode: 'doc_update_not_found',
  },
  {
    label: 'job control decommission misuse',
    method: 'POST',
    pathname: '/api/foundation/jobs/recurring-deep-audit/control',
    body: { runtimeMode: 'decommissioned' },
    expectedStatus: 400,
    expectedCode: 'use_decommission_route',
  },
  {
    label: 'missing job run stop',
    method: 'POST',
    pathname: '/api/foundation/job-runs/__missing__/stop',
    body: {},
    expectedStatus: 404,
    expectedCode: 'foundation_job_run_not_found',
  },
  {
    label: 'missing job decommission',
    method: 'POST',
    pathname: '/api/foundation/jobs/__missing__/decommission',
    body: { confirmation: '__missing__' },
    expectedStatus: 404,
    expectedCode: 'foundation_job_not_found',
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
    'create' + 'BacklogItem',
    'update' + 'BacklogItem',
    'create' + 'Decision',
    'update' + 'Decision',
    'create' + 'OpenQuestion',
    'update' + 'OpenQuestion',
    'create' + 'PendingDocUpdate',
    'approve' + 'PendingDocUpdate',
    'reject' + 'PendingDocUpdate',
    'mark' + 'PendingDocUpdateApplied',
    'update' + 'FoundationJobControl',
    'mark' + 'FoundationJobRunStopped',
    'upsert' + 'FoundationCurrentSprintOverlay',
    'INSERT' + ' INTO',
    'UPDATE' + ' ',
    'DELETE' + ' FROM',
    'fs.' + 'writeFile',
    'write' + 'File(',
  ]
  return forbiddenTokens.every(token => !String(scriptSource || '').includes(token))
}

async function fetchMeasured(baseUrl, probe) {
  const startedAt = Date.now()
  const response = await fetch(new URL(probe.pathname, baseUrl), {
    method: probe.method,
    redirect: 'manual',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(probe.body || {}),
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
    pathname: probe.pathname,
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
    jsonKeys: json && typeof json === 'object' ? Object.keys(json).slice(0, 12) : [],
  }
}

function safeInvalidWriteProbesPass(results = []) {
  return results.length === SAFE_INVALID_WRITE_PROBES.length &&
    results.every(result =>
      result.status === result.expectedStatus &&
      result.code === result.expectedCode &&
      result.status < 500 &&
      result.durationMs <= FOUNDATION_WRITE_ROUTES_SPLIT_ROUTE_BUDGET_MS &&
      result.bytes <= FOUNDATION_WRITE_ROUTES_SPLIT_ROUTE_BUDGET_BYTES
    )
}

async function readMutationFingerprints() {
  const pool = new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
  try {
    const result = await pool.query(`
      SELECT 'backlog_items' AS table_name, COUNT(*)::int AS row_count FROM backlog_items
      UNION ALL SELECT 'decisions', COUNT(*)::int FROM decisions
      UNION ALL SELECT 'open_questions', COUNT(*)::int FROM open_questions
      UNION ALL SELECT 'pending_doc_updates', COUNT(*)::int FROM pending_doc_updates
      UNION ALL SELECT 'foundation_job_controls', COUNT(*)::int FROM foundation_job_controls
      ORDER BY table_name
    `)
    return Object.fromEntries(result.rows.map(row => [row.table_name, row.row_count]))
  } finally {
    await pool.end()
  }
}

function fingerprintsMatch(before = {}, after = {}) {
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort()
  return keys.every(key => before[key] === after[key])
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
    validatePlanApprovalFile({ repoRoot, approvalRef: FOUNDATION_WRITE_ROUTES_SPLIT_APPROVAL_PATH, cardId: FOUNDATION_WRITE_ROUTES_SPLIT_CARD_ID }),
    getBacklogItemsByIds([FOUNDATION_WRITE_ROUTES_SPLIT_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([FOUNDATION_WRITE_ROUTES_SPLIT_CARD_ID]),
    readRepoFile('server.js'),
    readRepoFile('lib/foundation-write-routes.js'),
    readRepoFile(FOUNDATION_WRITE_ROUTES_SPLIT_SCRIPT_PATH),
    readRepoFile(FOUNDATION_WRITE_ROUTES_SPLIT_PLAN_PATH),
  ])

  const card = cards[0] || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === FOUNDATION_WRITE_ROUTES_SPLIT_CARD_ID) || null
  const planCritic = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= 9.8) || null
  const dogfood = buildFoundationWriteRoutesSplitDogfoodProof({ serverSource, moduleSource, proofScriptSource: scriptSource })
  const serverLineCount = String(serverSource || '').split('\n').length

  const beforeFingerprint = await readMutationFingerprints()
  const probes = []
  for (const probe of SAFE_INVALID_WRITE_PROBES) {
    probes.push(await fetchMeasured(baseUrl, probe))
  }
  const afterFingerprint = await readMutationFingerprints()

  ensure(checks, approvalValidation.ok, 'Plan approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || FOUNDATION_WRITE_ROUTES_SPLIT_APPROVAL_PATH)
  ensure(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  ensure(checks, activeSprint.sprint?.sprintId === FOUNDATION_WRITE_ROUTES_SPLIT_SPRINT_ID, 'Current Sprint is the server monolith closeout sprint', activeSprint.sprint?.sprintId || 'missing')
  ensure(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains the card in Building Now or Done', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  ensure(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  ensure(checks, includesAll(moduleSource, FOUNDATION_WRITE_ROUTE_MARKERS), 'new module owns Foundation write route strings', 'lib/foundation-write-routes.js')
  ensure(checks, serverSource.includes('registerFoundationWriteRoutes(app'), 'server.js delegates through Foundation write registrar', 'registerFoundationWriteRoutes(app)')
  ensure(checks, excludesAll(serverSource, FOUNDATION_WRITE_ROUTE_MARKERS), 'server.js no longer owns moved Foundation write handlers', 'old inline write route markers absent')
  ensure(checks, includesAll(serverSource, OUT_OF_SCOPE_ROUTE_MARKERS) && excludesAll(moduleSource, OUT_OF_SCOPE_ROUTE_MARKERS), 'out-of-scope Sales/Agent Feedback/Intelligence routes remain in server.js', 'no opportunistic route movement')
  ensure(checks, scriptIsReadOnly(scriptSource), 'focused proof script has no live-state mutation helpers', 'safe invalid HTTP probes only')
  ensure(checks, dogfood.ok, 'dogfood rejects old Foundation write route split failures', dogfood.summary)
  ensure(checks, planSource.includes('No Sales route movement.') && planSource.includes('No Agent Feedback route movement.'), 'plan blocks hub/product route movement', FOUNDATION_WRITE_ROUTES_SPLIT_PLAN_PATH)
  ensure(checks, serverLineCount < FOUNDATION_WRITE_ROUTES_SPLIT_BEFORE_SERVER_LINES, 'server.js line count decreases', `${FOUNDATION_WRITE_ROUTES_SPLIT_BEFORE_SERVER_LINES} -> ${serverLineCount}`)
  ensure(checks, serverLineCount < 5000, 'server.js is below the 5K architecture-risk line', `${serverLineCount} lines`)
  ensure(checks, safeInvalidWriteProbesPass(probes), 'safe invalid write probes fail before mutation and stay under budget', probes.map(probe => `${probe.label}:${probe.status}/${probe.code}/${probe.durationMs}ms/${probe.bytes}B`).join(', '))
  ensure(checks, fingerprintsMatch(beforeFingerprint, afterFingerprint), 'safe invalid write probes do not change live truth row counts', `before=${JSON.stringify(beforeFingerprint)} after=${JSON.stringify(afterFingerprint)}`)

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    cardId: FOUNDATION_WRITE_ROUTES_SPLIT_CARD_ID,
    sprintId: FOUNDATION_WRITE_ROUTES_SPLIT_SPRINT_ID,
    serverLineCount,
    beforeServerLines: FOUNDATION_WRITE_ROUTES_SPLIT_BEFORE_SERVER_LINES,
    dogfood,
    mutationFingerprints: {
      before: beforeFingerprint,
      after: afterFingerprint,
    },
    probes,
    checks,
    failures,
  }

  await closeFoundationDb()

  if (jsonOutput) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log('Foundation write routes split proof')
    checks.forEach(check => console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} -> ${check.detail}`))
    console.log(`Summary: ${checks.length - failures.length}/${checks.length} checks passed`)
  }

  if (failures.length) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error)
  process.exit(1)
})
