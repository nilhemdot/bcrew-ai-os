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
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'
import { getFoundationJobRunSnapshot } from '../lib/foundation-runtime-jobs-db.js'
import { getFoundationSnapshot } from '../lib/foundation-strategy-docs-db.js'
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
import { buildDocArtifactBloatSnapshot } from '../lib/doc-artifact-bloat-guard.js'
import { runSerializedFoundationGateCheck } from '../lib/foundation-gate-check-serialization.js'
import {
  NIGHTLY_AUDIT_FLEET_JOB_KEY,
  NIGHTLY_AUDIT_FLEET_SCHEDULE_LOCAL_TIME,
} from '../lib/nightly-audit-fleet.js'

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

const ACTIVE_SELF_RUN_STATUSES = new Set(['queued', 'running'])

function normalizeSelfAuditRun(foundationJobs = {}) {
  const jobs = Array.isArray(foundationJobs.jobs) ? foundationJobs.jobs : []
  let normalized = false
  const normalizedJobs = jobs.map(job => {
    const latestRunStatus = String(job.latestRun?.status || '').trim()
    if (job.key !== SYSTEM_HEALTH_NIGHTLY_AUDIT_JOB_KEY || !ACTIVE_SELF_RUN_STATUSES.has(latestRunStatus)) return job
    normalized = true
    return {
      ...job,
      latestRun: {
        ...job.latestRun,
        status: 'succeeded',
        finishedAt: new Date().toISOString(),
        errorMessage: null,
        metadata: {
          ...(job.latestRun?.metadata || {}),
          systemHealthSelfAuditInProgress: true,
        },
      },
    }
  })
  return normalized ? { ...foundationJobs, jobs: normalizedJobs } : foundationJobs
}

function compactRows(rows = [], limit = 20, fields = []) {
  return (Array.isArray(rows) ? rows : []).slice(0, limit).map(row => {
    if (!fields.length) return row
    return fields.reduce((acc, field) => {
      if (row[field] !== undefined) acc[field] = row[field]
      return acc
    }, {})
  })
}

function buildSystemHealthReportJson(snapshot = {}) {
  return {
    generatedAt: snapshot.generatedAt || null,
    status: snapshot.status || 'unknown',
    plainEnglish: snapshot.plainEnglish || '',
    summary: snapshot.summary || {},
    greenLock: snapshot.greenLock || null,
    currentSprintHealthTruthLock: snapshot.currentSprintHealthTruthLock || null,
    scheduledJobs: snapshot.scheduledJobs ? {
      status: snapshot.scheduledJobs.status,
      summary: snapshot.scheduledJobs.summary,
      topFindings: snapshot.scheduledJobs.topFindings || [],
      rows: compactRows(snapshot.scheduledJobs.rows, 20, [
        'key',
        'title',
        'priority',
        'status',
        'latestRunStatus',
        'latestRunAt',
        'latestSuccessAt',
        'plainEnglish',
        'nextAction',
      ]),
    } : null,
    auditFleet: snapshot.auditFleet ? {
      status: snapshot.auditFleet.status,
      jobKey: snapshot.auditFleet.jobKey,
      scheduleLocalTime: snapshot.auditFleet.scheduleLocalTime,
      scheduleTimezone: snapshot.auditFleet.scheduleTimezone,
      laneCount: snapshot.auditFleet.laneCount,
      laneIds: snapshot.auditFleet.laneIds,
      hardcodedTruthLanePresent: snapshot.auditFleet.hardcodedTruthLanePresent,
      reportOnly: snapshot.auditFleet.reportOnly,
      latestRunStatus: snapshot.auditFleet.latestRunStatus,
      latestRunAt: snapshot.auditFleet.latestRunAt,
      scheduledJobStatus: snapshot.auditFleet.scheduledJobStatus,
      failures: snapshot.auditFleet.failures || [],
    } : null,
    operatingReliability: snapshot.operatingReliability ? {
      status: snapshot.operatingReliability.status,
      summary: snapshot.operatingReliability.summary,
      topFindings: snapshot.operatingReliability.topFindings || [],
    } : null,
    endpointBudgets: snapshot.endpointBudgets ? {
      status: snapshot.endpointBudgets.status,
      summary: snapshot.endpointBudgets.summary,
      topFindings: snapshot.endpointBudgets.topFindings || [],
    } : null,
    docArtifactBloat: snapshot.docArtifactBloat ? {
      status: snapshot.docArtifactBloat.status,
      summary: snapshot.docArtifactBloat.summary,
      topFindings: snapshot.docArtifactBloat.topFindings || [],
    } : null,
    fileSizeStandard: snapshot.fileSizeStandard ? {
      status: snapshot.fileSizeStandard.status,
      summary: snapshot.fileSizeStandard.summary,
      topFindings: snapshot.fileSizeStandard.topFindings || [],
      managedFindings: snapshot.fileSizeStandard.managedFindings || [],
    } : null,
    buildLaneFailureTelemetry: snapshot.buildLaneFailureTelemetry ? {
      status: snapshot.buildLaneFailureTelemetry.status,
      summary: snapshot.buildLaneFailureTelemetry.summary,
      topFindings: snapshot.buildLaneFailureTelemetry.topFindings || [],
    } : null,
    currentSprint: snapshot.currentSprint || null,
    sourceHealth: snapshot.sourceHealth || null,
    findings: snapshot.findings || [],
  }
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
  const reportJson = buildSystemHealthReportJson(snapshot)
  await fs.writeFile(path.join(repoRoot, paths.markdownPath), markdown)
  await fs.writeFile(path.join(repoRoot, paths.jsonPath), JSON.stringify(reportJson, null, 2) + '\n')
  return {
    ...paths,
    markdownBytes: Buffer.byteLength(markdown),
    jsonBytes: Buffer.byteLength(JSON.stringify(reportJson)),
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
    docArtifactBloat,
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
    buildDocArtifactBloatSnapshot({ repoRoot }),
  ])

  const normalizedFoundationJobs = normalizeSelfAuditRun(foundationJobs)
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
    foundationJobs: normalizedFoundationJobs,
    endpointBudgets,
    currentSprintStatus,
    backlogItems: foundationSnapshot.backlogItems || [],
    closeouts,
  })
  const systemHealth = buildFoundationSystemHealthSnapshot({
    foundationJobs: normalizedFoundationJobs,
    foundationOperatingReliability: operatingReliability,
    endpointBudgets,
    currentSprintStatus,
    sourceContracts: getSourceContracts(),
    docArtifactBloat,
  })
  const dogfood = buildFoundationSystemHealthDogfoodProof()
  const scheduledJobs = buildScheduledJobStalenessSnapshot({ foundationJobs: normalizedFoundationJobs })
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
  addCheck(
    checks,
    systemHealth.status === 'healthy',
    'system-health proof does not exit green while embedded health is red/yellow',
    `status=${systemHealth.status} raw=${systemHealth.summary?.rawRiskCount || 0}/${systemHealth.summary?.rawWatchCount || 0} blocking=${systemHealth.summary?.riskCount || 0}/${systemHealth.summary?.watchCount || 0}`,
  )
  addCheck(checks, systemHealth.docArtifactBloat?.summary?.artifactCount > 0 && Number.isFinite(systemHealth.summary?.docArtifactRiskCount), 'system-health snapshot includes doc/report bloat rollup', `artifacts=${systemHealth.docArtifactBloat?.summary?.artifactCount || 0} risk=${systemHealth.summary?.docArtifactRiskCount || 0}`)
  addCheck(checks, systemHealth.fileSizeStandard?.summary?.fileCount > 0 && Number.isFinite(systemHealth.summary?.fileSizeWatchCount), 'system-health snapshot includes file-size standard rollup', `files=${systemHealth.fileSizeStandard?.summary?.fileCount || 0} watch=${systemHealth.summary?.fileSizeWatchCount || 0}`)
  addCheck(
    checks,
    scheduledJobs.rows.some(row => row.key === 'foundation-verify') &&
      scheduledJobs.rows.some(row => row.key === 'nightly-deep-audit') &&
      scheduledJobs.rows.some(row => row.key === NIGHTLY_AUDIT_FLEET_JOB_KEY),
    'scheduled-job snapshot includes verifier, nightly auditor, and audit-fleet rows',
    scheduledJobs.rows.slice(0, 12).map(row => row.key).join(', '),
  )
  addCheck(
    checks,
    systemHealth.auditFleet?.jobKey === NIGHTLY_AUDIT_FLEET_JOB_KEY &&
      systemHealth.auditFleet?.scheduleLocalTime === NIGHTLY_AUDIT_FLEET_SCHEDULE_LOCAL_TIME &&
      systemHealth.auditFleet?.laneCount >= 8 &&
      systemHealth.auditFleet?.hardcodedTruthLanePresent === true &&
      systemHealth.auditFleet?.reportOnly === true,
    'system-health snapshot rolls up the specialist audit fleet and hardcoded-truth lane',
    systemHealth.auditFleet ? `${systemHealth.auditFleet.status}/${systemHealth.auditFleet.laneCount}/${systemHealth.auditFleet.scheduledJobStatus || 'no scheduled row'}` : 'missing auditFleet',
  )
  addCheck(checks, moduleSource.includes('buildFoundationSystemHealthSnapshot') && moduleSource.includes('buildScheduledJobStalenessSnapshot') && moduleSource.includes('buildFoundationSystemHealthReportMarkdown') && moduleSource.includes('buildNightlyAuditFleetRollupStatus'), 'system-health module owns snapshot, staleness, audit-fleet, and report behavior', 'lib/foundation-system-health.js')
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

runSerializedFoundationGateCheck('process:system-health-nightly-audit-check', () => main())
  .catch(async error => {
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    await closeFoundationDb().catch(() => {})
    process.exitCode = 1
  })
