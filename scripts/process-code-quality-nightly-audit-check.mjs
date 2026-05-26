#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CODE_QUALITY_NIGHTLY_AUDIT_CARD_IDS,
  CODE_QUALITY_NIGHTLY_AUDIT_CLOSEOUT_KEY,
  CODE_QUALITY_NIGHTLY_AUDIT_JOB_KEY,
  CODE_QUALITY_NIGHTLY_AUDIT_MIN_FINDING_COUNT,
  CODE_QUALITY_NIGHTLY_AUDIT_REPORT_PATH,
  CODE_QUALITY_NIGHTLY_AUDIT_REQUIRED_ENDPOINTS,
  CODE_QUALITY_NIGHTLY_AUDIT_SCRIPT_PATH,
  CODE_QUALITY_NIGHTLY_AUDIT_SPRINT_ID,
  buildCodeQualityNightlyAudit,
  renderCodeQualityNightlyAuditReport,
} from '../lib/code-quality-nightly-audit.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getFoundationSnapshot,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'
import { getFoundationJobDefinitions } from '../lib/foundation-jobs.js'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  APPROVAL_MIN_APPROVED_PLAN_SCORE_LABEL,
  meetsApprovalThreshold,
} from '../lib/approval-threshold-registry.js'
import {
  isProcessReportWriteRequested,
} from '../lib/process-write-guard.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    noWrite: false,
    skipEndpointFetch: false,
    baseUrl: process.env.FOUNDATION_BASE_URL || 'http://localhost:3000',
    timeoutMs: 5000,
    reportPath: CODE_QUALITY_NIGHTLY_AUDIT_REPORT_PATH,
  }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg === '--no-write') args.noWrite = true
    else if (arg === '--skipEndpointFetch' || arg === '--skip-endpoint-fetch') args.skipEndpointFetch = true
    else if (arg.startsWith('--baseUrl=')) args.baseUrl = arg.slice('--baseUrl='.length)
    else if (arg.startsWith('--timeoutMs=')) args.timeoutMs = Number(arg.slice('--timeoutMs='.length))
    else if (arg.startsWith('--endpointTimeoutMs=')) args.timeoutMs = Number(arg.slice('--endpointTimeoutMs='.length))
    else if (arg.startsWith('--reportPath=')) args.reportPath = arg.slice('--reportPath='.length)
  }
  args.writeReport = isProcessReportWriteRequested(argv) && !args.noWrite
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function laneCounts(backlogItems = []) {
  return backlogItems.reduce((acc, item) => {
    const lane = item.lane || 'unknown'
    acc[lane] = (acc[lane] || 0) + 1
    return acc
  }, {})
}

function sameCounts(left = {}, right = {}) {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)])
  for (const key of keys) {
    if ((left[key] || 0) !== (right[key] || 0)) return false
  }
  return true
}

async function validateApprovals(checks) {
  for (const cardId of CODE_QUALITY_NIGHTLY_AUDIT_CARD_IDS) {
    const approvalRef = `docs/process/approvals/${cardId}.json`
    const validation = await validatePlanApprovalFile({ repoRoot, approvalRef, cardId })
    addCheck(
      checks,
      validation.ok && meetsApprovalThreshold(validation.approval?.score),
      `${cardId} approval file is valid at ${APPROVAL_MIN_APPROVED_PLAN_SCORE_LABEL}`,
      validation.failures?.map(item => item.check).join(', ') || approvalRef,
    )
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const before = await getFoundationSnapshot()
  const beforeCounts = laneCounts(before.backlogItems || [])
  const activeSprint = await getActiveFoundationCurrentSprint().catch(() => ({ sprint: null, items: [], planCriticRuns: [] }))
  const planCriticRuns = await getPlanCriticRunsByCardIds(CODE_QUALITY_NIGHTLY_AUDIT_CARD_IDS)

  await validateApprovals(checks)

  const audit = await buildCodeQualityNightlyAudit({
    repoRoot,
    baseUrl: args.baseUrl,
    timeoutMs: Number.isFinite(args.timeoutMs) && args.timeoutMs > 0 ? args.timeoutMs : 5000,
    skipEndpointFetch: args.skipEndpointFetch,
  })
  const report = renderCodeQualityNightlyAuditReport(audit)
  if (args.writeReport) {
    const reportPath = path.join(repoRoot, args.reportPath)
    await fs.mkdir(path.dirname(reportPath), { recursive: true })
    await fs.writeFile(reportPath, report, 'utf8')
  }

  const after = await getFoundationSnapshot()
  const afterCounts = laneCounts(after.backlogItems || [])
  const job = getFoundationJobDefinitions().find(definition => definition.key === CODE_QUALITY_NIGHTLY_AUDIT_JOB_KEY)
  const endpointSet = new Set((audit.endpointMetrics || []).map(metric => metric.endpoint))

  addCheck(checks, audit.reportOnly === true && audit.writesBacklog === false && audit.autoFixes === false, 'audit is report-only with no auto-fixes or backlog writes', `reportOnly=${audit.reportOnly} writesBacklog=${audit.writesBacklog} autoFixes=${audit.autoFixes}`)
  addCheck(checks, audit.autonomousDev === false && audit.llmDetectionUsed === false, 'audit does not enable autonomous dev or LLM detection', `autonomousDev=${audit.autonomousDev} llmDetectionUsed=${audit.llmDetectionUsed}`)
  addCheck(checks, audit.syntheticProof?.ok === true, 'synthetic detector proof passes', JSON.stringify(audit.syntheticProof || {}))
  addCheck(checks, CODE_QUALITY_NIGHTLY_AUDIT_REQUIRED_ENDPOINTS.every(endpoint => endpointSet.has(endpoint)), 'endpoint coverage includes all required Foundation routes', Array.from(endpointSet).join(', '))
  const reconciliationSummary = audit.findingReconciliation?.summary || {}
  addCheck(checks, Number(reconciliationSummary.rawFindingCount || 0) >= CODE_QUALITY_NIGHTLY_AUDIT_MIN_FINDING_COUNT, 'deterministic audit still records raw detector signals before reconciliation', String(reconciliationSummary.rawFindingCount || 0))
  addCheck(
    checks,
    Number(reconciliationSummary.activeFindingCount || 0) + Number(reconciliationSummary.reconciledClosedFindingCount || 0) === Number(reconciliationSummary.rawFindingCount || 0),
    'audit reconciles closed detector signals before active proposed-card output',
    JSON.stringify(reconciliationSummary),
  )
  addCheck(
    checks,
    (audit.proposedCards || []).length === Number(audit.summary?.proposedCardCount || 0),
    'audit proposed cards reflect active findings only',
    `${(audit.proposedCards || []).length}/${audit.summary?.proposedCardCount || 0}`,
  )
  addCheck(checks, sameCounts(beforeCounts, afterCounts), 'backlog lane counts unchanged by audit command', `before=${JSON.stringify(beforeCounts)} after=${JSON.stringify(afterCounts)}`)
  const activeSprintId = activeSprint.sprint?.sprintId || ''
  addCheck(checks, [CODE_QUALITY_NIGHTLY_AUDIT_SPRINT_ID].includes(activeSprintId) || CODE_QUALITY_NIGHTLY_AUDIT_CARD_IDS.every(cardId => (before.backlogItems || []).some(item => item.id === cardId)), 'sprint cards exist in live backlog/current sprint context', activeSprintId || 'no active sprint')
  addCheck(checks, CODE_QUALITY_NIGHTLY_AUDIT_CARD_IDS.every(cardId => planCriticRuns.some(run => run.cardId === cardId && run.status === 'pass' && meetsApprovalThreshold(run.score, run.passThreshold))), 'all sprint cards have durable Plan Critic pass rows', String(planCriticRuns.length))
  addCheck(checks, report.includes(CODE_QUALITY_NIGHTLY_AUDIT_CLOSEOUT_KEY), 'report includes closeout key', CODE_QUALITY_NIGHTLY_AUDIT_CLOSEOUT_KEY)
  addCheck(checks, report.includes('no auto-fixes') && report.includes('no auto backlog mutation'), 'report states no-auto boundaries', 'no auto-fixes / no auto backlog mutation')
  addCheck(checks, job?.runtimeMode === 'manual' && job?.scheduleEveryMinutes == null && job?.enabled === true, 'job registry entry is manual and unscheduled', job ? `${job.runtimeMode}/${job.scheduleEveryMinutes}` : 'missing job')
  addCheck(checks, job?.command === 'npm' && (job.args || []).includes('process:code-quality-nightly-audit-check') && (job.args || []).includes('--json'), 'job registry points to focused audit command', job?.args?.join(' ') || 'missing job')

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'unhealthy' : 'healthy',
    closeoutKey: CODE_QUALITY_NIGHTLY_AUDIT_CLOSEOUT_KEY,
    scriptPath: CODE_QUALITY_NIGHTLY_AUDIT_SCRIPT_PATH,
    reportPath: args.writeReport ? args.reportPath : null,
    summary: audit.summary,
    findingReconciliation: audit.findingReconciliation ? {
      status: audit.findingReconciliation.status,
      summary: audit.findingReconciliation.summary,
      reconciledFindingIds: (audit.findingReconciliation.reconciledFindings || []).map(finding => finding.id),
      activeFindingIds: (audit.findingReconciliation.activeFindings || []).map(finding => finding.id),
    } : null,
    endpointMetrics: audit.endpointMetrics,
    proposedCards: audit.proposedCards,
    findings: failures,
    checks,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Code Quality Nightly Audit check: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }

  await closeFoundationDb()
  if (failures.length) process.exitCode = 1
}

main().catch(async error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  await closeFoundationDb().catch(() => {})
  process.exitCode = 1
})
