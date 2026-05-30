#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  FOUNDATION_ENDPOINT_BUDGETS_APPROVAL_PATH,
  FOUNDATION_ENDPOINT_BUDGETS_CARD_ID,
  FOUNDATION_ENDPOINT_BUDGETS_CLOSEOUT_KEY,
  FOUNDATION_ENDPOINT_BUDGETS_PLAN_PATH,
  FOUNDATION_ENDPOINT_BUDGETS_SCRIPT_PATH,
  FOUNDATION_ENDPOINT_BUDGETS_SPRINT_ID,
  FOUNDATION_ENDPOINT_BUDGET_ROUTES,
  buildFoundationEndpointBudgetsDogfoodProof,
  buildFoundationEndpointBudgetSnapshot,
  loadLatestFoundationEndpointBudgetSnapshot,
  measureFoundationEndpointBudgetSnapshot,
} from '../lib/foundation-endpoint-budgets.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    baseUrl: process.env.BCREW_FOUNDATION_BASE_URL || 'http://localhost:3000',
    timeoutMs: 8000,
  }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg.startsWith('--baseUrl=')) args.baseUrl = arg.slice('--baseUrl='.length)
    else if (arg.startsWith('--timeoutMs=')) args.timeoutMs = Number(arg.slice('--timeoutMs='.length))
  }
  return args
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readText(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function repoFileExists(relativePath) {
  try {
    const stat = await fs.stat(path.join(repoRoot, relativePath))
    return stat.isFile()
  } catch {
    return false
  }
}

function scriptIsReadOnly(source = '') {
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
  return forbiddenTokens.every(token => !String(source || '').includes(token))
}

function stageOk(stage = '') {
  return ['scoping', 'sprint_ready', 'building_now', 'done_this_sprint'].includes(stage)
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    approval,
    cards,
    activeSprint,
    planCriticRuns,
    packageSource,
    moduleSource,
    scriptSource,
    nightlyAuditLibSource,
    nightlyAuditScriptSource,
    connectorUptimeSource,
    hubReadRoutesSource,
    serverSource,
    foundationVerifySource,
    operatorBudgetVerifierSource,
    currentPlan,
    currentState,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: FOUNDATION_ENDPOINT_BUDGETS_APPROVAL_PATH,
      cardId: FOUNDATION_ENDPOINT_BUDGETS_CARD_ID,
    }),
    getBacklogItemsByIds([FOUNDATION_ENDPOINT_BUDGETS_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([FOUNDATION_ENDPOINT_BUDGETS_CARD_ID]),
    readText('package.json'),
    readText('lib/foundation-endpoint-budgets.js'),
    readText(FOUNDATION_ENDPOINT_BUDGETS_SCRIPT_PATH),
    readText('lib/nightly-deep-audit-upgrade.js'),
    readText('scripts/process-nightly-deep-audit-upgrade-check.mjs'),
    readText('lib/connector-uptime-monitor.js'),
    readText('lib/hub-read-routes.js'),
    readText('server.js'),
    readText('scripts/foundation-verify.mjs'),
    readText('lib/foundation-operator-budget-verifier.js'),
    readText('docs/rebuild/current-plan.md'),
    readText('docs/rebuild/current-state.md'),
  ])
  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === FOUNDATION_ENDPOINT_BUDGETS_CARD_ID) || null
  const activeItem = (activeSprint.items || []).find(item => item.cardId === FOUNDATION_ENDPOINT_BUDGETS_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(item => item.key === FOUNDATION_ENDPOINT_BUDGETS_CLOSEOUT_KEY) || null
  const dogfood = buildFoundationEndpointBudgetsDogfoodProof()
  const latestSnapshot = await loadLatestFoundationEndpointBudgetSnapshot({ repoRoot })
  const liveSnapshot = await measureFoundationEndpointBudgetSnapshot({
    baseUrl: args.baseUrl,
    timeoutMs: args.timeoutMs,
  })
  const syntheticHealthy = buildFoundationEndpointBudgetSnapshot({
    endpointMetrics: FOUNDATION_ENDPOINT_BUDGET_ROUTES.map(endpoint => ({
      endpoint,
      ok: true,
      status: 200,
      durationMs: 100,
      payloadBytes: 200_000,
    })),
    generatedAt: 'synthetic',
  })

  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog has endpoint budget card in executing or done', card ? `${card.lane} / ${card.priority}` : 'missing card')
  addCheck(checks, approval.ok === true && approval.mode === 'v2' && Number(approval.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approval.ok ? `${approval.mode} / ${approval.approval?.score}` : approval.failures?.map(item => item.detail).join('; '))
  addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8), 'Plan Critic pass row exists', `${planCriticRuns.length} run(s)`)
  addCheck(
    checks,
    activeSprint?.sprint?.sprintId === FOUNDATION_ENDPOINT_BUDGETS_SPRINT_ID || card?.lane === 'done',
    'Current Sprint points to endpoint budgets while active or card is historically done',
    activeSprint?.sprint?.sprintId || 'missing active sprint',
  )
  addCheck(
    checks,
    card?.lane === 'done' || (activeItem && stageOk(activeItem.stage)),
    'Current Sprint item has active stage truth before closeout',
    activeItem ? `${activeItem.cardId}:${activeItem.stage}` : `card lane=${card?.lane || 'missing'}`,
  )
  addCheck(
    checks,
    dogfood.ok === true &&
      dogfood.oldSlowRoute.status === 'risk' &&
      dogfood.bloatedHub.status === 'review' &&
      dogfood.healthy.status === 'healthy' &&
      dogfood.missingMetrics.summary.missingCount === FOUNDATION_ENDPOINT_BUDGET_ROUTES.length,
    'dogfood rejects old slow/bloated endpoint failures and accepts healthy routes',
    dogfood.invariant,
  )
  addCheck(
    checks,
    liveSnapshot.rows.length === FOUNDATION_ENDPOINT_BUDGET_ROUTES.length &&
      FOUNDATION_ENDPOINT_BUDGET_ROUTES.every(endpoint => liveSnapshot.rows.some(row => row.endpoint === endpoint)) &&
      liveSnapshot.summary.riskCount === 0,
    'live focused measurement covers required operator routes with no P0/P1 budget risks',
    liveSnapshot.rows.map(row => `${row.endpoint}:${row.status}:${Math.round(row.durationMs || 0)}ms:${row.payloadBytes || 0}B`).join(', '),
  )
  addCheck(
    checks,
    syntheticHealthy.reportOnly === true &&
      syntheticHealthy.readOnly === true &&
      syntheticHealthy.autoFixes === false &&
      syntheticHealthy.writesBacklog === false,
    'endpoint budget snapshot is report-only and read-only',
    JSON.stringify({
      reportOnly: syntheticHealthy.reportOnly,
      readOnly: syntheticHealthy.readOnly,
      autoFixes: syntheticHealthy.autoFixes,
      writesBacklog: syntheticHealthy.writesBacklog,
    }),
  )
  addCheck(
    checks,
    moduleSource.includes('loadLatestFoundationEndpointBudgetSnapshot') &&
      moduleSource.includes('measureFoundationEndpointBudgetSnapshot') &&
      moduleSource.includes('buildFoundationEndpointBudgetsDogfoodProof') &&
      moduleSource.includes('CODE_QUALITY_NIGHTLY_AUDIT_REQUIRED_ENDPOINTS'),
    'focused module owns route rows, live measurement, latest report loading, and dogfood proof',
    FOUNDATION_ENDPOINT_BUDGET_ROUTES.join(', '),
  )
  addCheck(
    checks,
    nightlyAuditLibSource.includes('serializeNightlyDeepAuditUpgradeJson') &&
      nightlyAuditLibSource.includes('endpointMetrics: audit.deterministicAudit?.endpointMetrics || []') &&
      nightlyAuditScriptSource.includes('serializeNightlyDeepAuditUpgradeJson(audit)'),
    'nightly deep audit JSON writer persists endpointMetrics for future morning health',
    latestSnapshot.sourcePath || latestSnapshot.source,
  )
  addCheck(
    checks,
    connectorUptimeSource.includes('endpointBudgets = null') &&
      connectorUptimeSource.includes('endpoint_budget_risk') &&
      connectorUptimeSource.includes('endpointBudgetMissingCount') &&
      connectorUptimeSource.includes('endpointBudgets,'),
    'Operating Reliability morning health consumes endpoint budget snapshot',
    'endpoint risk/review/missing counts are included report-only',
  )
  addCheck(
    checks,
    hubReadRoutesSource.includes('loadLatestFoundationEndpointBudgetSnapshot') &&
      hubReadRoutesSource.includes('endpointBudgets') &&
      serverSource.includes("from './lib/foundation-endpoint-budgets.js'") &&
      serverSource.includes('loadLatestFoundationEndpointBudgetSnapshot,'),
    'Foundation Hub full diagnostic route exposes latest endpoint budget snapshot without measuring default route',
    latestSnapshot.status,
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:foundation-endpoint-budgets-check'] === `node --env-file-if-exists=.env ${FOUNDATION_ENDPOINT_BUDGETS_SCRIPT_PATH}`,
    'package script is registered',
    packageJson.scripts?.['process:foundation-endpoint-budgets-check'] || 'missing',
  )
  addCheck(
    checks,
    scriptIsReadOnly(scriptSource),
    'focused proof script is read-only',
    'no DB write helpers, SQL mutation statements, or fs write calls',
  )
  addCheck(
    checks,
    await repoFileExists(FOUNDATION_ENDPOINT_BUDGETS_PLAN_PATH) &&
      await repoFileExists(FOUNDATION_ENDPOINT_BUDGETS_APPROVAL_PATH),
    'plan and approval files exist',
    `${FOUNDATION_ENDPOINT_BUDGETS_PLAN_PATH} / ${FOUNDATION_ENDPOINT_BUDGETS_APPROVAL_PATH}`,
  )
  const rootEndpointBudgetCoverage =
    foundationVerifySource.includes('FOUNDATION_ENDPOINT_BUDGETS_CARD_ID') &&
    foundationVerifySource.includes('buildFoundationEndpointBudgetsDogfoodProof') &&
    foundationVerifySource.includes('FOUNDATION-ENDPOINT-BUDGETS-001 surfaces operator endpoint latency and payload budgets')
  const delegatedEndpointBudgetCoverage =
    foundationVerifySource.includes('evaluateFoundationOperatorBudgetVerifier') &&
    operatorBudgetVerifierSource.includes('FOUNDATION_ENDPOINT_BUDGETS_CARD_ID') &&
    operatorBudgetVerifierSource.includes('buildFoundationEndpointBudgetsDogfoodProof') &&
    operatorBudgetVerifierSource.includes('FOUNDATION-ENDPOINT-BUDGETS-001 surfaces operator endpoint latency and payload budgets')
  addCheck(
    checks,
    rootEndpointBudgetCoverage || delegatedEndpointBudgetCoverage,
    'foundation verifier has ID-named endpoint budget coverage',
    delegatedEndpointBudgetCoverage
      ? 'root verifier delegates endpoint budget constants and dogfood through foundation-operator-budget-verifier'
      : 'root verifier references endpoint budget constants and dogfood',
  )
  if (closeout || card?.lane === 'done') {
    addCheck(
      checks,
      closeout?.operatorCloseout === true &&
        (closeout.backlogIds || []).includes(FOUNDATION_ENDPOINT_BUDGETS_CARD_ID) &&
        await repoFileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-16-foundation-endpoint-budgets-closeout.md') &&
        currentPlan.includes(FOUNDATION_ENDPOINT_BUDGETS_CLOSEOUT_KEY) &&
        currentState.includes(FOUNDATION_ENDPOINT_BUDGETS_CLOSEOUT_KEY),
      'closeout is registered when card is done',
      closeout ? closeout.key : 'missing closeout',
    )
  }

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    checks,
    summary: {
      total: checks.length,
      passed: checks.length - failures.length,
      failed: failures.length,
      liveEndpointStatus: liveSnapshot.status,
      latestEndpointStatus: latestSnapshot.status,
    },
    liveSnapshot,
    latestSnapshot,
    dogfood,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} - ${check.detail}`)
    }
  }

  await closeFoundationDb()
  if (failures.length) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error)
  process.exitCode = 1
})
