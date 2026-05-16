#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getFoundationJobRunSnapshot,
  getFoundationSnapshot,
  getPlanCriticRunsByCardIds,
  initFoundationDb,
} from '../lib/foundation-db.js'
import { loadLatestFoundationEndpointBudgetSnapshot } from '../lib/foundation-endpoint-budgets.js'
import { getFoundationJobDefinition } from '../lib/foundation-jobs.js'
import {
  buildFoundationSystemHealthDogfoodProof,
  buildFoundationSystemHealthReportMarkdown,
  buildFoundationSystemHealthReportPaths,
  buildFoundationSystemHealthSnapshot,
  buildScheduledJobStalenessSnapshot,
  SCHEDULED_JOB_STALENESS_DASHBOARD_APPROVAL_PATH,
  SCHEDULED_JOB_STALENESS_DASHBOARD_CARD_ID,
  SCHEDULED_JOB_STALENESS_DASHBOARD_CLOSEOUT_KEY,
  SCHEDULED_JOB_STALENESS_DASHBOARD_PLAN_PATH,
  SYSTEM_HEALTH_NIGHTLY_AUDIT_APPROVAL_PATH,
  SYSTEM_HEALTH_NIGHTLY_AUDIT_CARD_ID,
  SYSTEM_HEALTH_NIGHTLY_AUDIT_CLOSEOUT_KEY,
  SYSTEM_HEALTH_NIGHTLY_AUDIT_JOB_KEY,
  SYSTEM_HEALTH_NIGHTLY_AUDIT_PLAN_PATH,
  SYSTEM_HEALTH_NIGHTLY_AUDIT_SCRIPT_PATH,
} from '../lib/foundation-system-health.js'
import { buildFoundationOperatingReliabilitySnapshot } from '../lib/connector-uptime-monitor.js'
import { getSourceConnectors, getSourceContracts } from '../lib/source-contracts.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertCurrentProcessCheckWriteAllowed,
} from '../lib/process-write-guard.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const SPRINT_ID = 'foundation-system-health-visibility-2026-05-16'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    writeReport: argv.includes('--write-report') || argv.includes('--write-report=true'),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readText(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function writeReportFiles(snapshot) {
  assertCurrentProcessCheckWriteAllowed({
    operation: 'write system health report artifacts',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.writeReport],
  })
  const paths = buildFoundationSystemHealthReportPaths(snapshot.generatedAt)
  const markdown = buildFoundationSystemHealthReportMarkdown(snapshot)
  await fs.writeFile(path.join(repoRoot, paths.markdownPath), markdown)
  await fs.writeFile(path.join(repoRoot, paths.jsonPath), JSON.stringify(snapshot, null, 2) + '\n')
  return {
    ...paths,
    markdownBytes: Buffer.byteLength(markdown),
    jsonBytes: Buffer.byteLength(JSON.stringify(snapshot)),
  }
}

function findSprintItem(activeSprint = {}, cardId) {
  return (activeSprint.items || []).find(item => (item.cardId || item.backlogId) === cardId) || null
}

async function main() {
  const args = parseArgs()
  const checks = []

  await initFoundationDb()
  const [
    systemApproval,
    dashboardApproval,
    cards,
    activeSprint,
    foundationJobs,
    foundationSnapshot,
    endpointBudgets,
    packageJsonSource,
    moduleSource,
    scriptSource,
    hubReadRoutesSource,
    runtimeRendererSource,
    operationsRendererSource,
    planCriticRuns,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: SYSTEM_HEALTH_NIGHTLY_AUDIT_APPROVAL_PATH, cardId: SYSTEM_HEALTH_NIGHTLY_AUDIT_CARD_ID }),
    validatePlanApprovalFile({ repoRoot, approvalRef: SCHEDULED_JOB_STALENESS_DASHBOARD_APPROVAL_PATH, cardId: SCHEDULED_JOB_STALENESS_DASHBOARD_CARD_ID }),
    getBacklogItemsByIds([SYSTEM_HEALTH_NIGHTLY_AUDIT_CARD_ID, SCHEDULED_JOB_STALENESS_DASHBOARD_CARD_ID]),
    getActiveFoundationCurrentSprint().catch(() => ({ sprint: null, items: [] })),
    getFoundationJobRunSnapshot({ limit: 100, includeOutput: false }),
    getFoundationSnapshot(),
    loadLatestFoundationEndpointBudgetSnapshot({ repoRoot }),
    readText('package.json'),
    readText('lib/foundation-system-health.js'),
    readText(SYSTEM_HEALTH_NIGHTLY_AUDIT_SCRIPT_PATH),
    readText('lib/hub-read-routes.js'),
    readText('public/foundation-runtime-renderers.js'),
    readText('public/foundation-operations-renderers.js'),
    getPlanCriticRunsByCardIds([SYSTEM_HEALTH_NIGHTLY_AUDIT_CARD_ID, SCHEDULED_JOB_STALENESS_DASHBOARD_CARD_ID]),
  ])

  const packageJson = JSON.parse(packageJsonSource)
  const closeouts = getFoundationBuildCloseouts()
  const activeSprintPlanCriticRuns = (activeSprint.items || []).length
    ? await getPlanCriticRunsByCardIds((activeSprint.items || []).map(item => item.cardId).filter(Boolean))
    : []
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: activeSprint.sprint,
    items: activeSprint.items || [],
    backlogItems: foundationSnapshot.backlogItems || [],
    closeouts,
    planCriticRuns: [...planCriticRuns, ...activeSprintPlanCriticRuns],
  })
  const operatingReliability = buildFoundationOperatingReliabilitySnapshot({
    sourceContracts: getSourceContracts(),
    sourceConnectors: getSourceConnectors(),
    foundationJobs,
    endpointBudgets,
    currentSprintStatus,
    backlogItems: foundationSnapshot.backlogItems || [],
    closeouts,
  })
  const systemHealth = buildFoundationSystemHealthSnapshot({
    foundationJobs,
    foundationOperatingReliability: operatingReliability,
    endpointBudgets,
    currentSprintStatus,
    sourceContracts: getSourceContracts(),
  })
  const dogfood = buildFoundationSystemHealthDogfoodProof()
  const scheduledJobs = buildScheduledJobStalenessSnapshot({ foundationJobs })
  const jobDefinition = getFoundationJobDefinition(SYSTEM_HEALTH_NIGHTLY_AUDIT_JOB_KEY)
  const systemCard = cards.find(card => card.id === SYSTEM_HEALTH_NIGHTLY_AUDIT_CARD_ID)
  const dashboardCard = cards.find(card => card.id === SCHEDULED_JOB_STALENESS_DASHBOARD_CARD_ID)
  const systemSprintItem = findSprintItem(activeSprint, SYSTEM_HEALTH_NIGHTLY_AUDIT_CARD_ID)
  const dashboardSprintItem = findSprintItem(activeSprint, SCHEDULED_JOB_STALENESS_DASHBOARD_CARD_ID)
  const systemCloseout = closeouts.find(closeout => closeout.key === SYSTEM_HEALTH_NIGHTLY_AUDIT_CLOSEOUT_KEY) || null
  const dashboardCloseout = closeouts.find(closeout => closeout.key === SCHEDULED_JOB_STALENESS_DASHBOARD_CLOSEOUT_KEY) || null
  const systemClosedProof = systemCard?.lane === 'done' &&
    String(systemCard.statusNote || '').includes(SYSTEM_HEALTH_NIGHTLY_AUDIT_CLOSEOUT_KEY) &&
    systemCloseout?.operatorCloseout === true &&
    (systemCloseout.backlogIds || []).includes(SYSTEM_HEALTH_NIGHTLY_AUDIT_CARD_ID)
  const dashboardClosedProof = dashboardCard?.lane === 'done' &&
    String(dashboardCard.statusNote || '').includes(SCHEDULED_JOB_STALENESS_DASHBOARD_CLOSEOUT_KEY) &&
    dashboardCloseout?.operatorCloseout === true &&
    (dashboardCloseout.backlogIds || []).includes(SCHEDULED_JOB_STALENESS_DASHBOARD_CARD_ID)
  const reportWrite = args.writeReport ? await writeReportFiles(systemHealth) : null
  const mutationTokens = /updateBacklogItem\s*\(|createBacklogItem\s*\(|upsertFoundationCurrentSprintOverlay\s*\(|INSERT\s+INTO\s+backlog_items|UPDATE\s+backlog_items|DELETE\s+FROM\s+backlog_items|INSERT\s+INTO\s+foundation_sprints|UPDATE\s+foundation_sprints|DELETE\s+FROM\s+foundation_sprint_items/i

  addCheck(checks, systemApproval.ok && Number(systemApproval.approval?.score) >= 9.8, 'system-health approval validates at 9.8+', systemApproval.failures?.map(item => item.check).join(', ') || SYSTEM_HEALTH_NIGHTLY_AUDIT_APPROVAL_PATH)
  addCheck(checks, dashboardApproval.ok && Number(dashboardApproval.approval?.score) >= 9.8, 'staleness-dashboard approval validates at 9.8+', dashboardApproval.failures?.map(item => item.check).join(', ') || SCHEDULED_JOB_STALENESS_DASHBOARD_APPROVAL_PATH)
  addCheck(checks, systemCard && ['executing', 'done'].includes(systemCard.lane), 'system-health card exists in executing/done lane', systemCard ? `${systemCard.id}:${systemCard.lane}` : 'missing')
  addCheck(checks, dashboardCard && ['scoped', 'executing', 'done'].includes(dashboardCard.lane), 'staleness-dashboard card exists in scoped/executing/done lane', dashboardCard ? `${dashboardCard.id}:${dashboardCard.lane}` : 'missing')
  addCheck(checks, (activeSprint.sprint?.sprintId === SPRINT_ID && systemSprintItem && ['building_now', 'done_this_sprint'].includes(systemSprintItem.stage)) || systemClosedProof, 'Current Sprint contains system-health card as active/done work or closeout proof', activeSprint.sprint ? `${activeSprint.sprint.sprintId}:${systemSprintItem?.stage || 'missing'}` : `closed=${systemClosedProof ? 'yes' : 'no'}`)
  addCheck(checks, (activeSprint.sprint?.sprintId === SPRINT_ID && dashboardSprintItem && ['sprint_ready', 'building_now', 'done_this_sprint'].includes(dashboardSprintItem.stage)) || dashboardClosedProof, 'Current Sprint contains staleness-dashboard card as ready/done work or closeout proof', activeSprint.sprint ? `${activeSprint.sprint.sprintId}:${dashboardSprintItem?.stage || 'missing'}` : `closed=${dashboardClosedProof ? 'yes' : 'no'}`)
  addCheck(checks, planCriticRuns.some(run => run.cardId === SYSTEM_HEALTH_NIGHTLY_AUDIT_CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8), 'system-health durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, planCriticRuns.some(run => run.cardId === SCHEDULED_JOB_STALENESS_DASHBOARD_CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8), 'staleness-dashboard durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, packageJson.scripts?.['process:system-health-nightly-audit-check'] === `node --env-file-if-exists=.env ${SYSTEM_HEALTH_NIGHTLY_AUDIT_SCRIPT_PATH}`, 'package script points to focused system-health proof', packageJson.scripts?.['process:system-health-nightly-audit-check'] || 'missing')
  addCheck(checks, jobDefinition?.key === SYSTEM_HEALTH_NIGHTLY_AUDIT_JOB_KEY && jobDefinition.runtimeMode === 'scheduled' && jobDefinition.mutationPosture === 'report_only' && jobDefinition.scheduleLocalTime === '05:15', 'system-health nightly job is scheduled report-only after nightly audit window', jobDefinition ? `${jobDefinition.runtimeMode}/${jobDefinition.scheduleLocalTime}/${jobDefinition.mutationPosture}` : 'missing job')
  addCheck(checks, dogfood.ok === true, 'dogfood makes missed scheduled jobs red and fresh jobs green', dogfood.checks.filter(check => !check.ok).map(check => check.check).join(', ') || 'all dogfood checks passed')
  addCheck(checks, systemHealth.reportOnly === true && systemHealth.autoFixes === false && systemHealth.writesBacklog === false && systemHealth.writesSourceSystems === false, 'system-health snapshot is report-only and non-mutating', `status=${systemHealth.status}`)
  addCheck(checks, scheduledJobs.rows.some(row => row.key === 'foundation-verify') && scheduledJobs.rows.some(row => row.key === 'nightly-deep-audit'), 'scheduled-job snapshot includes verifier and nightly auditor rows', scheduledJobs.rows.slice(0, 8).map(row => row.key).join(', '))
  addCheck(checks, moduleSource.includes('buildFoundationSystemHealthSnapshot') && moduleSource.includes('buildScheduledJobStalenessSnapshot') && moduleSource.includes('buildFoundationSystemHealthReportMarkdown'), 'system-health module owns snapshot, staleness, and report behavior', 'lib/foundation-system-health.js')
  addCheck(checks, hubReadRoutesSource.includes('foundationSystemHealth'), 'Foundation full hub payload includes foundationSystemHealth', 'lib/hub-read-routes.js')
  addCheck(checks, runtimeRendererSource.includes('renderFoundationSystemHealthPanel') && runtimeRendererSource.includes('foundationSystemHealth'), 'Runtime renderer includes system-health panel behavior', 'public/foundation-runtime-renderers.js')
  addCheck(checks, operationsRendererSource.includes('renderFoundationSystemHealthPanel') && operationsRendererSource.includes('runtime-diagnostic-system-health-rollup'), 'Operations renderer places system-health rollup in Runtime Health diagnostics', 'public/foundation-operations-renderers.js')
  addCheck(checks, !mutationTokens.test(scriptSource), 'focused proof has no backlog/sprint/source live mutation path', SYSTEM_HEALTH_NIGHTLY_AUDIT_SCRIPT_PATH)
  if (args.writeReport) {
    addCheck(checks, reportWrite?.markdownBytes > 300 && reportWrite?.jsonBytes > 1000, 'write-report flag writes markdown and json artifacts', reportWrite ? `${reportWrite.markdownPath} ${reportWrite.markdownBytes}b / ${reportWrite.jsonPath} ${reportWrite.jsonBytes}b` : 'missing report')
  }

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    sprintId: SPRINT_ID,
    cardIds: [SYSTEM_HEALTH_NIGHTLY_AUDIT_CARD_ID, SCHEDULED_JOB_STALENESS_DASHBOARD_CARD_ID],
    closeoutKeys: [SYSTEM_HEALTH_NIGHTLY_AUDIT_CLOSEOUT_KEY, SCHEDULED_JOB_STALENESS_DASHBOARD_CLOSEOUT_KEY],
    systemHealth,
    dogfood,
    reportWrite,
    checks,
    findings: failures,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`System health nightly audit check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failures.length) process.exitCode = 1
}

main().catch(async error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  await closeFoundationDb().catch(() => {})
  process.exitCode = 1
})
