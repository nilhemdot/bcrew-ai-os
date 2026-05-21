#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CONNECTOR_HEALTH_STATUSES,
  CONNECTOR_UPTIME_MONITOR_JOB_KEY,
  FOUNDATION_OPERATING_RELIABILITY_CARD_IDS,
  FOUNDATION_OPERATING_RELIABILITY_CLOSEOUT_KEY,
  FOUNDATION_OPERATING_RELIABILITY_SCRIPT_PATH,
  FOUNDATION_OPERATING_RELIABILITY_SPRINT_ID,
  OPERATING_RELIABILITY_CONNECTOR_GROUPS,
  buildConnectorUptimeSnapshot,
  buildFoundationOperatingReliabilityDogfoodProof,
  buildFoundationOperatingReliabilitySnapshot,
  buildMorningHealthSnapshot,
  buildRuntimeActivationSnapshot,
} from '../lib/connector-uptime-monitor.js'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getFoundationSnapshot,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
import { getFoundationJobDefinitions } from '../lib/foundation-jobs.js'
import { getSourceConnectors, getSourceContracts } from '../lib/source-contracts.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const PLAN_REFS = {
  'CONNECTOR-UPTIME-MONITOR-001': 'docs/process/connector-uptime-monitor-001-plan.md',
  'SOURCE-023': 'docs/process/source-023-connector-hardening-plan.md',
  'RUNTIME-ACTIVATION-001': 'docs/process/runtime-activation-001-operating-reliability-plan.md',
  'SYSTEM-HEALTH-AUDITOR-001': 'docs/process/system-health-auditor-001-operating-reliability-plan.md',
  'PLAN-STATE-RECONCILE-001': 'docs/process/plan-state-reconcile-001-plan.md',
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    noApi: false,
    connectorOnly: false,
    baseUrl: process.env.BCREW_FOUNDATION_BASE_URL || 'http://localhost:3000',
  }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg === '--no-api' || arg === '--noApi') args.noApi = true
    else if (arg === '--connector-only' || arg === '--connectorOnly') args.connectorOnly = true
    else if (arg.startsWith('--baseUrl=')) args.baseUrl = arg.slice('--baseUrl='.length)
  }
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function exists(relativePath) {
  try {
    await fs.stat(path.join(repoRoot, relativePath))
    return true
  } catch {
    return false
  }
}

async function readText(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function fetchJson(baseUrl, route) {
  const headers = {}
  if (process.env.ADMIN_TOKEN) headers['X-Admin-Token'] = process.env.ADMIN_TOKEN
  const response = await fetch(`${String(baseUrl).replace(/\/$/, '')}${route}`, { headers })
  const text = await response.text()
  if (!response.ok) throw new Error(`${route} returned ${response.status}: ${text.slice(0, 400)}`)
  return text ? JSON.parse(text) : null
}

function stageOk(stage) {
  return ['sprint_ready', 'building_now', 'done_this_sprint'].includes(stage)
}

function doctrineOk(item = {}) {
  return Boolean(
    item.planRef &&
    item.definitionOfDone &&
    Array.isArray(item.proofCommands) &&
    item.proofCommands.length &&
    Array.isArray(item.notNextBoundaries) &&
    item.notNextBoundaries.length &&
    item.existingWorkCheck &&
    Object.keys(item.existingWorkCheck).length
  )
}

const CONNECTOR_PASS_STATUSES = new Set([
  CONNECTOR_HEALTH_STATUSES.healthy,
  CONNECTOR_HEALTH_STATUSES.stale,
])

function connectorUptimeFailureRows(connectorUptime = {}) {
  return (Array.isArray(connectorUptime.rows) ? connectorUptime.rows : [])
    .filter(row => !CONNECTOR_PASS_STATUSES.has(row.status))
}

function buildOperatingReliabilityFailureGate({ morningHealth = {} } = {}) {
  const failedJobCount = Number(morningHealth.summary?.failedJobCount || 0)
  const connectorDownCount = Number(morningHealth.summary?.connectorDownCount || 0)
  if (failedJobCount === 0 && connectorDownCount === 0) {
    return { ok: true, detail: 'failedJobs=0 connectorDown=0' }
  }

  return {
    ok: false,
    detail: `failedJobs=${failedJobCount} connectorDown=${connectorDownCount}`,
  }
}

async function runConnectorOnlyCheck(args) {
  const checks = []
  const snapshot = await getFoundationSnapshot()
  const sourceContracts = getSourceContracts()
  const sourceConnectors = getSourceConnectors()
  const connectorUptime = buildConnectorUptimeSnapshot({
    sourceContracts,
    sourceConnectors,
    foundationJobs: snapshot.foundationJobs,
  })
  const failingRows = connectorUptimeFailureRows(connectorUptime)
  const uptimeJob = getFoundationJobDefinitions().find(job => job.key === CONNECTOR_UPTIME_MONITOR_JOB_KEY)

  addCheck(
    checks,
    connectorUptime.rows.length === OPERATING_RELIABILITY_CONNECTOR_GROUPS.length &&
      OPERATING_RELIABILITY_CONNECTOR_GROUPS.every(group => connectorUptime.rows.some(row => row.key === group.key)),
    'connector uptime covers ClickUp, FUB, Google, Slack, Missive, and KPI/Supabase',
    connectorUptime.rows.map(row => `${row.key}:${row.status}`).join(', '),
  )
  addCheck(
    checks,
    connectorUptime.reportOnly === true && connectorUptime.readOnly === true && connectorUptime.autoFixes === false && connectorUptime.writesBacklog === false,
    'connector uptime is read-only and report-only',
    JSON.stringify({
      reportOnly: connectorUptime.reportOnly,
      readOnly: connectorUptime.readOnly,
      autoFixes: connectorUptime.autoFixes,
      writesBacklog: connectorUptime.writesBacklog,
    }),
  )
  addCheck(
    checks,
    failingRows.length === 0,
    'connector-only scheduled proof depends only on connector health',
    failingRows.map(row => `${row.key}:${row.status}`).join(', ') || connectorUptime.rows.map(row => `${row.key}:${row.status}`).join(', '),
  )
  addCheck(
    checks,
    uptimeJob?.runtimeMode === 'scheduled' &&
      uptimeJob?.mutationPosture === 'read_only' &&
      uptimeJob?.scheduleMutationGuard?.ok === true &&
      (uptimeJob?.args || []).includes('--connector-only'),
    'connector uptime monitor job is scheduled read-only and connector-only',
    uptimeJob ? `${uptimeJob.runtimeMode}/${uptimeJob.mutationPosture}/${uptimeJob.scheduleMutationGuard?.ok}/${(uptimeJob.args || []).join(' ')}` : 'missing job',
  )

  await closeFoundationDb()

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'unhealthy' : 'healthy',
    scope: 'connector_uptime_only',
    cards: ['CONNECTOR-UPTIME-MONITOR-001'],
    summary: connectorUptime.summary,
    findings: failures,
    checks,
    connectorUptime,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Connector Uptime Monitor check: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }
  if (failures.length) process.exitCode = 1
}

async function main() {
  const args = parseArgs()
  if (args.connectorOnly) {
    await runConnectorOnlyCheck(args)
    return
  }
  const checks = []
  const requiredFiles = [
    ...Object.values(PLAN_REFS),
    ...FOUNDATION_OPERATING_RELIABILITY_CARD_IDS.map(cardId => `docs/process/approvals/${cardId}.json`),
    'lib/connector-uptime-monitor.js',
    FOUNDATION_OPERATING_RELIABILITY_SCRIPT_PATH,
  ]

  const [
    snapshot,
    activeSprint,
    planCriticRuns,
    cards,
    packageSource,
    serverSource,
    foundationJobsSource,
    hubReadRoutesSource,
  ] = await Promise.all([
    getFoundationSnapshot(),
    getActiveFoundationCurrentSprint().catch(() => ({ sprint: null, items: [], planCriticRuns: [] })),
    getPlanCriticRunsByCardIds(FOUNDATION_OPERATING_RELIABILITY_CARD_IDS),
    getBacklogItemsByIds(FOUNDATION_OPERATING_RELIABILITY_CARD_IDS.concat(['RECURRING-DEEP-AUDIT-001'])),
    readText('package.json'),
    readText('server.js'),
    readText('lib/foundation-jobs.js'),
    readText('lib/hub-read-routes.js'),
  ])
  const routeSource = `${serverSource}\n${hubReadRoutesSource}`

  for (const file of requiredFiles) {
    addCheck(checks, await exists(file), 'required Operating Reliability artifact exists', file)
  }

  for (const cardId of FOUNDATION_OPERATING_RELIABILITY_CARD_IDS) {
    const approval = await validatePlanApprovalFile({
      repoRoot,
      approvalRef: `docs/process/approvals/${cardId}.json`,
      cardId,
    })
    addCheck(
      checks,
      approval.ok && Number(approval.approval?.score) >= 9.8,
      `${cardId} approval file is valid at 9.8+`,
      approval.failures?.map(item => item.check).join(', ') || approval.approval?.approvedPlanRef || 'ok',
    )
    addCheck(
      checks,
      planCriticRuns.some(run => run.cardId === cardId && run.status === 'pass' && Number(run.score) >= 9.8),
      `${cardId} has durable Plan Critic pass row`,
      planCriticRuns.filter(run => run.cardId === cardId).map(run => `${run.status}/${run.score}`).join(', ') || 'missing',
    )
  }

  const cardMap = new Map(cards.map(card => [card.id, card]))
  const operatingReliabilityCloseoutRecorded = getFoundationBuildCloseouts()
    .some(closeout => closeout.key === FOUNDATION_OPERATING_RELIABILITY_CLOSEOUT_KEY)
  const operatingReliabilityCardsDone = FOUNDATION_OPERATING_RELIABILITY_CARD_IDS
    .every(cardId => cardMap.get(cardId)?.lane === 'done')
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: activeSprint.sprint,
    items: activeSprint.items || [],
    backlogItems: snapshot.backlogItems || [],
    closeouts: getFoundationBuildCloseouts(),
    planCriticRuns: activeSprint.planCriticRuns || [],
  })
  const sprintItems = activeSprint.items || []
  addCheck(
    checks,
    activeSprint.sprint?.sprintId === FOUNDATION_OPERATING_RELIABILITY_SPRINT_ID ||
      (operatingReliabilityCloseoutRecorded && operatingReliabilityCardsDone),
    'Operating Reliability sprint is active or closed with done cards',
    activeSprint.sprint?.sprintId || 'missing',
  )
  addCheck(
    checks,
    activeSprint.sprint?.sprintId === FOUNDATION_OPERATING_RELIABILITY_SPRINT_ID
      ? FOUNDATION_OPERATING_RELIABILITY_CARD_IDS.every(cardId => sprintItems.some(item => item.cardId === cardId && stageOk(item.stage)))
      : operatingReliabilityCardsDone,
    'all Operating Reliability cards are at Sprint Ready or later, or closed done',
    activeSprint.sprint?.sprintId === FOUNDATION_OPERATING_RELIABILITY_SPRINT_ID
      ? sprintItems.map(item => `${item.cardId}:${item.stage}`).join(', ')
      : FOUNDATION_OPERATING_RELIABILITY_CARD_IDS.map(cardId => `${cardId}:${cardMap.get(cardId)?.lane || 'missing'}`).join(', '),
  )
  addCheck(
    checks,
    activeSprint.sprint?.sprintId === FOUNDATION_OPERATING_RELIABILITY_SPRINT_ID
      ? FOUNDATION_OPERATING_RELIABILITY_CARD_IDS.every(cardId => doctrineOk(sprintItems.find(item => item.cardId === cardId)))
      : operatingReliabilityCloseoutRecorded,
    'all Operating Reliability sprint items have populated doctrine or committed closeout',
    activeSprint.sprint?.sprintId === FOUNDATION_OPERATING_RELIABILITY_SPRINT_ID
      ? sprintItems.filter(item => !doctrineOk(item)).map(item => item.cardId).join(', ') || 'ok'
      : `closeout=${operatingReliabilityCloseoutRecorded}`,
  )
  addCheck(
    checks,
    currentSprintStatus.status === 'healthy',
    'Current Sprint command view stays healthy after Operating Reliability closeout',
    (currentSprintStatus.findings || []).map(finding => `${finding.check}: ${finding.detail}`).join(' | ') || 'healthy',
  )

  const sourceContracts = getSourceContracts()
  const sourceConnectors = getSourceConnectors()
  const connectorUptime = buildConnectorUptimeSnapshot({
    sourceContracts,
    sourceConnectors,
    foundationJobs: snapshot.foundationJobs,
  })
  const runtimeActivation = buildRuntimeActivationSnapshot({
    foundationJobs: snapshot.foundationJobs,
    connectorUptime,
  })
  const morningHealth = buildMorningHealthSnapshot({
    connectorUptime,
    runtimeActivation,
    currentSprintStatus,
    backlogItems: snapshot.backlogItems || [],
    closeouts: getFoundationBuildCloseouts(),
  })
  const operatingReliability = buildFoundationOperatingReliabilitySnapshot({
    sourceContracts,
    sourceConnectors,
    foundationJobs: snapshot.foundationJobs,
    currentSprintStatus,
    backlogItems: snapshot.backlogItems || [],
    closeouts: getFoundationBuildCloseouts(),
  })
  const dogfood = buildFoundationOperatingReliabilityDogfoodProof()
  const operatingReliabilityFailureGate = buildOperatingReliabilityFailureGate({
    morningHealth,
  })

  addCheck(
    checks,
    dogfood.ok === true,
    'dogfood recreates connector failures, runtime states, and audit confusion',
    dogfood.checks.filter(check => !check.ok).map(check => check.check).join(', ') || `${dogfood.checks.length} checks`,
  )
  addCheck(
    checks,
    connectorUptime.rows.length === OPERATING_RELIABILITY_CONNECTOR_GROUPS.length &&
      OPERATING_RELIABILITY_CONNECTOR_GROUPS.every(group => connectorUptime.rows.some(row => row.key === group.key)),
    'connector uptime covers ClickUp, FUB, Google, Slack, Missive, and KPI/Supabase',
    connectorUptime.rows.map(row => `${row.key}:${row.status}`).join(', '),
  )
  addCheck(
    checks,
    connectorUptime.reportOnly === true && connectorUptime.readOnly === true && connectorUptime.autoFixes === false && connectorUptime.writesBacklog === false,
    'connector uptime is read-only and report-only',
    JSON.stringify({
      reportOnly: connectorUptime.reportOnly,
      readOnly: connectorUptime.readOnly,
      autoFixes: connectorUptime.autoFixes,
      writesBacklog: connectorUptime.writesBacklog,
    }),
  )
  addCheck(
    checks,
    runtimeActivation.jobs.length >= getFoundationJobDefinitions().length &&
      runtimeActivation.jobs.some(job => job.key === 'verification-runs' && ['scheduled', 'due', 'running'].includes(job.state)) &&
      runtimeActivation.jobs.some(job => job.key === 'nightly-deep-audit' && ['scheduled', 'due', 'running'].includes(job.state)),
    'runtime activation accepts read-only scheduled checks and the scheduled nightly deep audit job',
    runtimeActivation.jobs.slice(0, 12).map(job => `${job.key}:${job.state}`).join(', '),
  )
  addCheck(
    checks,
    morningHealth.reportOnly === true &&
      morningHealth.autoFixes === false &&
      morningHealth.writesBacklog === false &&
      morningHealth.autonomousDev === false &&
      morningHealth.nightlyDeepAudit?.scheduled === true &&
      !morningHealth.findings.some(item => item.id === 'nightly_deep_audit_not_scheduled'),
    'morning health is report-only and recognizes the scheduled nightly deep audit',
    `scheduled=${morningHealth.nightlyDeepAudit?.scheduled} findings=${morningHealth.findings.map(item => item.id).join(', ')}`,
  )
  addCheck(
    checks,
    operatingReliabilityFailureGate.ok,
    'operating reliability proof does not exit green with failed jobs or down connectors',
    operatingReliabilityFailureGate.detail,
  )
  addCheck(
    checks,
    operatingReliability.connectorUptime?.rows?.length === OPERATING_RELIABILITY_CONNECTOR_GROUPS.length &&
      operatingReliability.runtimeActivation?.jobs?.length >= getFoundationJobDefinitions().length &&
      operatingReliability.morningHealth?.plainEnglish,
    'combined Operating Reliability snapshot is populated',
    `${operatingReliability.connectorUptime?.rows?.length || 0} connectors / ${operatingReliability.runtimeActivation?.jobs?.length || 0} jobs`,
  )

  const uptimeJob = getFoundationJobDefinitions().find(job => job.key === CONNECTOR_UPTIME_MONITOR_JOB_KEY)
  addCheck(
    checks,
    uptimeJob?.runtimeMode === 'scheduled' &&
      uptimeJob?.mutationPosture === 'read_only' &&
      uptimeJob?.scheduleMutationGuard?.ok === true &&
      (uptimeJob?.args || []).includes('--connector-only'),
    'connector uptime monitor job is scheduled read-only, connector-only, and accepted by mutation guard',
    uptimeJob ? `${uptimeJob.runtimeMode}/${uptimeJob.mutationPosture}/${uptimeJob.scheduleMutationGuard?.ok}/${(uptimeJob.args || []).join(' ')}` : 'missing job',
  )
  addCheck(
    checks,
    packageSource.includes('"process:foundation-operating-reliability-check"') &&
      foundationJobsSource.includes(CONNECTOR_UPTIME_MONITOR_JOB_KEY) &&
      foundationJobsSource.includes("mutationPosture: 'read_only'") &&
      routeSource.includes('foundationOperatingReliability') &&
      routeSource.includes('buildFoundationOperatingReliabilitySnapshot'),
    'package, job registry, and Foundation Hub expose Operating Reliability',
    FOUNDATION_OPERATING_RELIABILITY_SCRIPT_PATH,
  )
  addCheck(
    checks,
    FOUNDATION_OPERATING_RELIABILITY_CARD_IDS.every(cardId => ['scoped', 'executing', 'done'].includes(cardMap.get(cardId)?.lane)),
    'all Operating Reliability cards exist in live backlog',
    FOUNDATION_OPERATING_RELIABILITY_CARD_IDS.map(cardId => `${cardId}:${cardMap.get(cardId)?.lane || 'missing'}`).join(', '),
  )

  if (!args.noApi) {
    try {
      const hub = await fetchJson(args.baseUrl, '/api/foundation-hub?view=full')
      addCheck(
        checks,
        hub?.foundationOperatingReliability?.connectorUptime?.rows?.length === OPERATING_RELIABILITY_CONNECTOR_GROUPS.length &&
          hub?.foundationOperatingReliability?.morningHealth?.reportOnly === true,
        'live Foundation Hub full route exposes Operating Reliability payload',
        `${hub?.foundationOperatingReliability?.connectorUptime?.rows?.length || 0} connectors`,
      )
    } catch (error) {
      addCheck(checks, false, 'live Foundation Hub full route exposes Operating Reliability payload', error instanceof Error ? error.message : String(error))
    }
  }

  const closeoutExists = await exists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-14-foundation-operating-reliability-closeout.md')
  const allDone = FOUNDATION_OPERATING_RELIABILITY_CARD_IDS.every(cardId => sprintItems.find(item => item.cardId === cardId)?.stage === 'done_this_sprint')
  if (allDone) {
    addCheck(checks, closeoutExists, 'closeout exists once all sprint cards are done', 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-14-foundation-operating-reliability-closeout.md')
  }

  await closeFoundationDb()

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'unhealthy' : 'healthy',
    sprintId: FOUNDATION_OPERATING_RELIABILITY_SPRINT_ID,
    closeoutKey: FOUNDATION_OPERATING_RELIABILITY_CLOSEOUT_KEY,
    cards: FOUNDATION_OPERATING_RELIABILITY_CARD_IDS,
    summary: {
      connectorStatusCounts: connectorUptime.summary,
      runtimeActivation: runtimeActivation.summary,
      morningHealth: morningHealth.summary,
    },
    findings: failures,
    checks,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Foundation Operating Reliability check: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }
  if (failures.length) process.exitCode = 1
}

main().catch(async error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  await closeFoundationDb().catch(() => {})
  process.exitCode = 1
})
