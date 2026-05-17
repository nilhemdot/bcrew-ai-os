#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  FOUNDATION_FULL_DIAGNOSTICS_BUDGET,
  FOUNDATION_FULL_DIAGNOSTICS_CLOSEOUT_KEY,
  FOUNDATION_FULL_DIAGNOSTICS_PERF_CARD_ID,
  FOUNDATION_FULL_DIAGNOSTICS_SCRIPT_PATH,
  FOUNDATION_FULL_DIAGNOSTICS_SPRINT_ID,
  FOUNDATION_HUB_FULL_ROUTE_SPLIT_CARD_ID,
  buildSyntheticFoundationFullDiagnosticsDogfoodProof,
  evaluateFoundationFullDiagnosticsMeasurement,
} from '../lib/foundation-hub-full-diagnostics.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const CARDS = [
  {
    cardId: FOUNDATION_FULL_DIAGNOSTICS_PERF_CARD_ID,
    priority: 'P0',
    planRef: 'docs/process/foundation-full-diagnostics-perf-001-plan.md',
    approvalRef: 'docs/process/approvals/FOUNDATION-FULL-DIAGNOSTICS-PERF-001.json',
  },
  {
    cardId: FOUNDATION_HUB_FULL_ROUTE_SPLIT_CARD_ID,
    priority: 'P1',
    planRef: 'docs/process/foundation-hub-full-route-split-001-plan.md',
    approvalRef: 'docs/process/approvals/FOUNDATION-HUB-FULL-ROUTE-SPLIT-001.json',
  },
]

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    noApi: false,
    baseUrl: process.env.BCREW_FOUNDATION_BASE_URL || 'http://localhost:3000',
  }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg === '--no-api' || arg === '--no-api=true') args.noApi = true
    else if (arg.startsWith('--baseUrl=')) args.baseUrl = arg.slice('--baseUrl='.length)
  }
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function measureJsonRoute({ baseUrl, routePath, timeoutMs }) {
  const started = process.hrtime.bigint()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${baseUrl}${routePath}`, { signal: controller.signal })
    const text = await response.text()
    const elapsedSeconds = Number(process.hrtime.bigint() - started) / 1e9
    let json = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = null
    }
    return {
      path: routePath,
      statusCode: response.status,
      seconds: Math.round(elapsedSeconds * 1000000) / 1000000,
      bytes: Buffer.byteLength(text, 'utf8'),
      json,
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    serverSource,
    hubReadRoutesSource,
    moduleSource,
    clickupSource,
    autoSendSource,
    remindersSource,
    packageSource,
    approvals,
    sprint,
    backlogCards,
    planCriticRuns,
  ] = await Promise.all([
    readRepoFile('server.js'),
    readRepoFile('lib/hub-read-routes.js'),
    readRepoFile('lib/foundation-hub-full-diagnostics.js'),
    readRepoFile('lib/clickup.js'),
    readRepoFile('lib/agent-feedback-auto-send.js'),
    readRepoFile('lib/agent-feedback-reminders.js'),
    readRepoFile('package.json'),
    Promise.all(CARDS.map(card => validatePlanApprovalFile({
      repoRoot,
      approvalRef: card.approvalRef,
      cardId: card.cardId,
    }))),
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds(CARDS.map(card => card.cardId)),
    getPlanCriticRunsByCardIds(CARDS.map(card => card.cardId)),
  ])
  await closeFoundationDb()

  const packageJson = JSON.parse(packageSource)
  const routeSource = `${serverSource}\n${hubReadRoutesSource}`
  const dogfood = await buildSyntheticFoundationFullDiagnosticsDogfoodProof()

  addCheck(
    checks,
    approvals.every(result => result.ok && Number(result.approval?.score) >= 9.8),
    'both approval files validate at 9.8+',
    approvals.filter(result => !result.ok).map(result => result.approvalRef).join(', ') || 'all valid',
  )
  addCheck(
    checks,
    CARDS.every(card => planCriticRuns.some(run => run.cardId === card.cardId && run.status === 'pass' && Number(run.score) >= 9.8)),
    'both durable Plan Critic rows pass',
    planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || 'missing',
  )
  addCheck(
    checks,
    backlogCards.length === CARDS.length && backlogCards.every(card => ['scoped', 'done'].includes(card.lane)),
    'both backlog cards exist in scoped/done lanes',
    backlogCards.map(card => `${card.id}:${card.lane}`).join(', ') || 'missing',
  )
  addCheck(
    checks,
    (
      sprint.sprint?.sprintId === FOUNDATION_FULL_DIAGNOSTICS_SPRINT_ID &&
      CARDS.every(card => sprint.items.some(item => item.cardId === card.cardId && ['sprint_ready', 'building_now', 'done_this_sprint'].includes(item.stage)))
    ) || (
      backlogCards.length === CARDS.length &&
      backlogCards.every(card => card.lane === 'done' && String(card.statusNote || '').includes(FOUNDATION_FULL_DIAGNOSTICS_CLOSEOUT_KEY))
    ),
    'Foundation full diagnostics cards are active in Current Sprint or already shipped with closeout truth',
    sprint.sprint ? `${sprint.sprint.sprintId} ${sprint.items.map(item => `${item.cardId}:${item.stage}`).join(', ')}` : 'missing sprint',
  )
  addCheck(
    checks,
    dogfood.ok === true &&
      dogfood.boundary?.status === 'degraded' &&
      dogfood.rateLimitBoundary?.status === 'degraded' &&
      dogfood.elapsedMs < 100,
    'dogfood proof converts slow or rate-limited Agent Feedback panels into degraded source health',
    dogfood.invariant,
  )
  addCheck(
    checks,
    routeSource.includes('buildFoundationHubAgentFeedbackDiagnostics') &&
      routeSource.includes('buildFoundationHubSourceOutageBoundary') &&
      routeSource.includes('foundationHubFullDiagnostics') &&
      !serverSource.includes('const agentFeedbackAutoSend = await buildAgentFeedbackAutoSendReadiness({\n      repoRoot: __dirname'),
    'Foundation Hub full diagnostics route delegates bounded Agent Feedback diagnostics out of the monolith',
    'server.js + lib/hub-read-routes.js',
  )
  addCheck(
    checks,
    moduleSource.includes('withDiagnosticDeadline') &&
      moduleSource.includes('Promise.race') &&
      moduleSource.includes('runtime_diagnostic_timeout') &&
      moduleSource.includes('external_api_error') &&
      moduleSource.includes('fullDiagnosticsBounded'),
    'full diagnostics module owns fail-soft timeout and external API error behavior',
    'lib/foundation-hub-full-diagnostics.js',
  )
  addCheck(
    checks,
    clickupSource.includes('AbortController') &&
      clickupSource.includes('CLICKUP_REQUEST_TIMEOUT_MS') &&
      clickupSource.includes('maxPages'),
    'ClickUp read boundary supports bounded request timeouts and page caps',
    'lib/clickup.js',
  )
  addCheck(
    checks,
    autoSendSource.includes('getRosterSnapshot = getClickUpListSnapshotSafe') &&
      remindersSource.includes('getRosterSnapshot = getClickUpListSnapshotSafe'),
    'Agent Feedback readiness builders accept an injected roster snapshot getter',
    'agent feedback modules',
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:foundation-full-diagnostics-perf-check'] === `node --env-file-if-exists=.env ${FOUNDATION_FULL_DIAGNOSTICS_SCRIPT_PATH}`,
    'package exposes focused proof script',
    packageJson.scripts?.['process:foundation-full-diagnostics-perf-check'] || 'missing',
  )

  let liveMeasurement = null
  let liveEvaluation = null
  if (!args.noApi) {
    liveMeasurement = await measureJsonRoute({
      baseUrl: args.baseUrl,
      routePath: '/api/foundation-hub?view=full',
      timeoutMs: (FOUNDATION_FULL_DIAGNOSTICS_BUDGET.maxSeconds + 5) * 1000,
    })
    liveEvaluation = evaluateFoundationFullDiagnosticsMeasurement(liveMeasurement)
    addCheck(
      checks,
      liveEvaluation.ok === true,
      'live full diagnostics route stays inside the new budget',
      liveEvaluation.findings.map(finding => finding.check).join(', ') || `${liveMeasurement.seconds}s / ${liveMeasurement.bytes}B`,
    )
    addCheck(
      checks,
      liveMeasurement.json?.foundationHubFullDiagnostics?.boundedSourceHealth === true &&
        liveMeasurement.json?.sourceOutageBoundary?.summary?.fullDiagnosticsBounded === true,
      'live full diagnostics payload exposes bounded source-health metadata',
      JSON.stringify(liveMeasurement.json?.foundationHubFullDiagnostics || {}),
    )
  }
  const liveMeasurementSummary = liveMeasurement
    ? {
        path: liveMeasurement.path,
        statusCode: liveMeasurement.statusCode,
        seconds: liveMeasurement.seconds,
        bytes: liveMeasurement.bytes,
        mode: liveMeasurement.json?.foundationHubPerformance?.mode || null,
        boundedSourceHealth: liveMeasurement.json?.foundationHubFullDiagnostics?.boundedSourceHealth === true,
        sourceOutageStatus: liveMeasurement.json?.sourceOutageBoundary?.status || null,
      }
    : null
  const liveEvaluationSummary = liveEvaluation
    ? {
        ok: liveEvaluation.ok,
        status: liveEvaluation.status,
        budget: liveEvaluation.budget,
        checks: liveEvaluation.checks,
        findings: liveEvaluation.findings,
      }
    : null

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    sprintId: FOUNDATION_FULL_DIAGNOSTICS_SPRINT_ID,
    closeoutKey: FOUNDATION_FULL_DIAGNOSTICS_CLOSEOUT_KEY,
    cards: CARDS.map(card => card.cardId),
    dogfood: {
      ok: dogfood.ok,
      elapsedMs: dogfood.elapsedMs,
      boundaryStatus: dogfood.boundary?.status,
    },
    performance: {
      budget: FOUNDATION_FULL_DIAGNOSTICS_BUDGET,
      liveMeasurement: liveMeasurementSummary,
      liveEvaluation: liveEvaluationSummary,
    },
    checks,
    findings: failures,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log('Foundation full diagnostics performance proof')
    console.log(`  Status: ${result.status}`)
    for (const failure of failures) console.log(`  BLOCKED ${failure.check}: ${failure.detail}`)
  }
  if (failures.length) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error)
  process.exitCode = 1
})
