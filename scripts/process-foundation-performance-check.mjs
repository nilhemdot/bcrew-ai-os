#!/usr/bin/env node

import process from 'node:process'
import {
  FOUNDATION_HUB_SUMMARY_BUDGET,
  FOUNDATION_PERFORMANCE_APPROVAL_PATH,
  FOUNDATION_PERFORMANCE_CARD_ID,
  FOUNDATION_PERFORMANCE_CLOSEOUT_KEY,
  FOUNDATION_PERFORMANCE_PLAN_PATH,
  FOUNDATION_PERFORMANCE_SCRIPT_PATH,
  FOUNDATION_PERFORMANCE_SPRINT_ID,
  buildSyntheticFoundationHubBudgetProof,
  evaluateFoundationHubBudget,
} from '../lib/foundation-hub-performance.js'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false, baseUrl: process.env.BCREW_FOUNDATION_BASE_URL || 'http://localhost:3000' }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg.startsWith('--baseUrl=')) args.baseUrl = arg.slice('--baseUrl='.length)
  }
  return args
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function measureJson(baseUrl, path) {
  const startedAt = Date.now()
  const response = await fetch(`${baseUrl}${path}`)
  const text = await response.text()
  const durationMs = Date.now() - startedAt
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  return {
    path,
    status: response.status,
    ok: response.ok,
    durationMs,
    payloadBytes: Buffer.byteLength(text, 'utf8'),
    json,
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [approval, cards, planCriticRuns, sprint, summaryRoute, fullRoute, currentSprintRoute] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot: process.cwd(),
      approvalRef: FOUNDATION_PERFORMANCE_APPROVAL_PATH,
      cardId: FOUNDATION_PERFORMANCE_CARD_ID,
    }),
    getBacklogItemsByIds([FOUNDATION_PERFORMANCE_CARD_ID]),
    getPlanCriticRunsByCardIds([FOUNDATION_PERFORMANCE_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    measureJson(args.baseUrl, '/api/foundation-hub'),
    measureJson(args.baseUrl, '/api/foundation-hub?view=full'),
    measureJson(args.baseUrl, '/api/foundation/current-sprint'),
  ])
  await closeFoundationDb()

  const card = cards.find(item => item.id === FOUNDATION_PERFORMANCE_CARD_ID) || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === FOUNDATION_PERFORMANCE_CARD_ID) || null
  const synthetic = buildSyntheticFoundationHubBudgetProof()
  const summaryBudget = evaluateFoundationHubBudget({
    mode: 'summary',
    durationMs: summaryRoute.durationMs,
    payloadBytes: summaryRoute.payloadBytes,
  })

  addCheck(
    checks,
    approval.ok && Number(approval.approval?.score) >= 9.8,
    'approval file is valid at 9.8+',
    approval.failures?.map(item => item.check).join(', ') || `score=${approval.approval?.score}`,
  )
  addCheck(
    checks,
    planCriticRuns.some(run => run.cardId === FOUNDATION_PERFORMANCE_CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8),
    'durable Plan Critic pass row exists before build',
    planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing',
  )
  addCheck(
    checks,
    card && ['scoped', 'done'].includes(card.lane),
    'live backlog card exists',
    card ? `${card.lane} / ${card.priority}` : 'missing',
  )
  addCheck(
    checks,
    sprint.sprint?.sprintId === FOUNDATION_PERFORMANCE_SPRINT_ID &&
      ['building_now', 'done_this_sprint'].includes(sprintItem?.stage),
    'card is in active performance sprint',
    sprint.sprint ? `${sprint.sprint.sprintId} / ${sprintItem?.stage || 'missing stage'}` : 'missing sprint',
  )
  addCheck(
    checks,
    summaryRoute.ok && summaryRoute.json?.foundationHubPerformance?.mode === 'summary',
    'default Foundation Hub route returns summary mode',
    `${summaryRoute.status} / ${summaryRoute.json?.foundationHubPerformance?.mode || 'missing mode'}`,
  )
  addCheck(
    checks,
    summaryBudget.ok,
    'default Foundation Hub route stays under latency and payload budget',
    `${summaryRoute.durationMs}ms / ${summaryRoute.payloadBytes}B / budget ${FOUNDATION_HUB_SUMMARY_BUDGET.maxDurationMs}ms ${FOUNDATION_HUB_SUMMARY_BUDGET.maxPayloadBytes}B`,
  )
  addCheck(
    checks,
    fullRoute.ok && fullRoute.json?.foundationHubPerformance?.mode === 'full',
    'explicit full Foundation Hub route remains available',
    `${fullRoute.status} / ${fullRoute.json?.foundationHubPerformance?.mode || 'missing mode'}`,
  )
  addCheck(
    checks,
    fullRoute.payloadBytes > summaryRoute.payloadBytes,
    'summary payload is smaller than full diagnostic payload',
    `summary=${summaryRoute.payloadBytes}B full=${fullRoute.payloadBytes}B`,
  )
  addCheck(
    checks,
    fullRoute.json?.sharedCommunicationSynthesis &&
      fullRoute.json?.extractionControl &&
      fullRoute.json?.llmRuntime &&
      fullRoute.json?.driveCorpusInventory,
    'full route keeps Runtime Health diagnostic keys',
    ['sharedCommunicationSynthesis', 'extractionControl', 'llmRuntime', 'driveCorpusInventory']
      .map(key => `${key}=${fullRoute.json?.[key] ? 'yes' : 'no'}`)
      .join(' '),
  )
  addCheck(
    checks,
    summaryRoute.json?.currentSprint &&
      Array.isArray(summaryRoute.json?.backlogItems) &&
      Array.isArray(summaryRoute.json?.decisions) &&
      summaryRoute.json?.runtimeSupervisor,
    'summary route keeps command-surface keys',
    `backlog=${summaryRoute.json?.backlogItems?.length ?? 'missing'} decisions=${summaryRoute.json?.decisions?.length ?? 'missing'}`,
  )
  addCheck(
    checks,
    currentSprintRoute.ok && currentSprintRoute.payloadBytes < 100000,
    'Current Sprint route remains small and responsive',
    `${currentSprintRoute.durationMs}ms / ${currentSprintRoute.payloadBytes}B`,
  )
  addCheck(
    checks,
    synthetic.ok,
    'dogfood budget proof fails closed on oversized and too-slow synthetic payloads',
    `healthy=${synthetic.healthy.status} oversized=${synthetic.oversized.status} tooSlow=${synthetic.tooSlow.status}`,
  )

  const findings = checks.filter(check => !check.ok)
  const summary = {
    ok: findings.length === 0,
    status: findings.length ? 'blocked' : 'healthy',
    cardId: FOUNDATION_PERFORMANCE_CARD_ID,
    closeoutKey: FOUNDATION_PERFORMANCE_CLOSEOUT_KEY,
    planPath: FOUNDATION_PERFORMANCE_PLAN_PATH,
    scriptPath: FOUNDATION_PERFORMANCE_SCRIPT_PATH,
    routes: {
      summary: {
        path: summaryRoute.path,
        status: summaryRoute.status,
        durationMs: summaryRoute.durationMs,
        payloadBytes: summaryRoute.payloadBytes,
        budgetStatus: summaryBudget.status,
      },
      full: {
        path: fullRoute.path,
        status: fullRoute.status,
        durationMs: fullRoute.durationMs,
        payloadBytes: fullRoute.payloadBytes,
        mode: fullRoute.json?.foundationHubPerformance?.mode || null,
      },
      currentSprint: {
        path: currentSprintRoute.path,
        status: currentSprintRoute.status,
        durationMs: currentSprintRoute.durationMs,
        payloadBytes: currentSprintRoute.payloadBytes,
      },
    },
    synthetic,
    checks,
    findings,
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Foundation performance proof')
    console.log(`  Card: ${FOUNDATION_PERFORMANCE_CARD_ID}`)
    console.log(`  Status: ${summary.status}`)
    console.log(`  Default hub: ${summary.routes.summary.durationMs}ms / ${summary.routes.summary.payloadBytes}B`)
    console.log(`  Full hub: ${summary.routes.full.durationMs}ms / ${summary.routes.full.payloadBytes}B`)
    for (const finding of findings) console.log(`  BLOCKED ${finding.check}: ${finding.detail}`)
  }
  if (findings.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
})

