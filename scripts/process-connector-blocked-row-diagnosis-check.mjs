#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  buildConnectorCredentialRegistrySnapshot,
} from '../lib/connector-credential-registry.js'
import {
  CONNECTOR_HEALTH_STATUSES,
  buildConnectorUptimeSnapshot,
} from '../lib/connector-uptime-monitor.js'
import {
  buildFoundationSystemHealthSnapshot,
} from '../lib/foundation-system-health.js'
import { closeFoundationDb } from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'
import { getSourceConnectors, getSourceContracts } from '../lib/source-contracts.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const CARD_ID = 'CONNECTOR-BLOCKED-ROW-DIAGNOSIS-001'
const PLAN_PATH = 'docs/process/connector-blocked-row-diagnosis-001-plan.md'
const APPROVAL_PATH = 'docs/process/approvals/CONNECTOR-BLOCKED-ROW-DIAGNOSIS-001.json'
const SPRINT_ID = 'connector-blocked-row-diagnosis-2026-05-16'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

function makeSyntheticGoogleRegistry({ calendarStatus = 'blocked', calendarReason = 'Calendar OAuth expired.' } = {}) {
  const googleRows = [
    ['google-delegated-drive', 'CONN-GDRIVE-001', ['SRC-GDRIVE-001', 'SRC-GDOCS-001', 'SRC-GSLIDES-001', 'SRC-MEETINGS-001']],
    ['google-delegated-gmail', 'CONN-GMAIL-001', ['SRC-GMAIL-001']],
    ['google-delegated-sheets', 'CONN-GSHEETS-001', ['SRC-GSHEETS-001', 'SRC-OWNERS-001', 'SRC-FINANCE-001']],
    ['google-delegated-calendar', 'CONN-GCAL-001', ['SRC-GCAL-001']],
  ]
  return {
    generatedAt: '2026-05-16T22:10:00.000Z',
    rows: googleRows.map(([key, connectorId, sourceIds]) => ({
      key,
      connectorId,
      sourceIds,
      provider: 'google_workspace',
      status: key === 'google-delegated-calendar' ? calendarStatus : 'available',
      sourceUnlocked: key !== 'google-delegated-calendar' || calendarStatus === 'available',
      blocksConnectorHealth: key === 'google-delegated-calendar' && calendarStatus === 'blocked',
      readinessNote: '',
      blockerReason: key === 'google-delegated-calendar' ? calendarReason : '',
      lastProbeStatus: key === 'google-delegated-calendar' ? calendarStatus : 'passed',
    })),
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const sourceContracts = getSourceContracts()
  const sourceConnectors = getSourceConnectors()
  const [
    approval,
    activeSprint,
    planCriticRuns,
    credentialRegistrySource,
    connectorUptimeSource,
    systemHealthSource,
    packageSource,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([CARD_ID]),
    readRepoFile('lib/connector-credential-registry.js'),
    readRepoFile('lib/connector-uptime-monitor.js'),
    readRepoFile('lib/foundation-system-health.js'),
    readRepoFile('package.json'),
  ])
  await closeFoundationDb()

  const registry = buildConnectorCredentialRegistrySnapshot({
    sourceContracts,
    sourceConnectors,
    now: new Date('2026-05-16T22:10:00.000Z'),
  })
  const calendarCredential = registry.rows.find(row => row.key === 'google-delegated-calendar') || null
  const currentUptime = buildConnectorUptimeSnapshot({
    now: new Date('2026-05-16T22:10:00.000Z'),
    sourceContracts,
    sourceConnectors,
    credentialRegistry: registry,
    foundationJobs: { jobs: [] },
  })
  const googleWorkspace = currentUptime.rows.find(row => row.key === 'google-workspace') || null
  const syntheticBlockedUptime = buildConnectorUptimeSnapshot({
    now: new Date('2026-05-16T22:10:00.000Z'),
    sourceContracts,
    sourceConnectors,
    credentialRegistry: makeSyntheticGoogleRegistry(),
    foundationJobs: { jobs: [] },
  })
  const syntheticBlockedGoogle = syntheticBlockedUptime.rows.find(row => row.key === 'google-workspace') || null
  const syntheticHealth = buildFoundationSystemHealthSnapshot({
    now: new Date('2026-05-16T22:10:00.000Z'),
    foundationJobs: { jobs: [] },
    foundationOperatingReliability: {
      connectorUptime: {
        summary: {
          connectorGroupCount: 1,
          healthyCount: 0,
          degradedCount: 0,
          downCount: 0,
          staleCount: 0,
          manualCount: 0,
          blockedCount: 1,
          unknownCount: 0,
        },
        rows: [syntheticBlockedGoogle],
      },
    },
  })
  const syntheticConnectorFinding = syntheticHealth.findings.find(finding => finding.id === 'connector_blocked') || null
  const packageJson = JSON.parse(packageSource)
  const activeItem = (activeSprint.items || []).find(item => item.cardId === CARD_ID) || null

  addCheck(
    checks,
    approval.ok && Number(approval.approval?.score) >= 9.8,
    'approval validates at 9.8+',
    approval.failures?.map(item => item.check).join(', ') || APPROVAL_PATH,
  )
  addCheck(
    checks,
    activeSprint.sprint?.sprintId === SPRINT_ID && ['building_now', 'done_this_sprint'].includes(activeItem?.stage),
    'Current Sprint has this card at Building Now or Done This Sprint',
    `${activeSprint.sprint?.sprintId || 'missing'} / ${activeItem?.stage || 'missing'}`,
  )
  addCheck(
    checks,
    planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8),
    'durable Plan Critic pass row exists',
    planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing',
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:connector-blocked-row-diagnosis-check'] === 'node --env-file-if-exists=.env scripts/process-connector-blocked-row-diagnosis-check.mjs',
    'package exposes focused connector blocked-row proof',
    packageJson.scripts?.['process:connector-blocked-row-diagnosis-check'] || 'missing',
  )
  addCheck(
    checks,
    calendarCredential?.status === 'available' &&
      calendarCredential?.blocksConnectorHealth === false &&
      Boolean(calendarCredential?.readinessNote),
    'Google Calendar readiness note is non-blocking metadata',
    JSON.stringify({
      status: calendarCredential?.status,
      blocksConnectorHealth: calendarCredential?.blocksConnectorHealth,
      readinessNote: calendarCredential?.readinessNote,
    }),
  )
  addCheck(
    checks,
    googleWorkspace?.status !== CONNECTOR_HEALTH_STATUSES.blocked &&
      googleWorkspace?.credentialBlockedCount === 0 &&
      googleWorkspace?.credentialReadinessNotes?.some(note => note.includes('not scheduled as an atom-producing source')),
    'Google Workspace is not blocked by the non-blocking Calendar readiness note',
    googleWorkspace ? `${googleWorkspace.status}: ${googleWorkspace.reason}` : 'missing google-workspace row',
  )
  addCheck(
    checks,
    syntheticBlockedGoogle?.status === CONNECTOR_HEALTH_STATUSES.blocked &&
      syntheticBlockedGoogle?.credentialBlockedCount === 1,
    'synthetic true credential blocker still makes Google Workspace blocked',
    syntheticBlockedGoogle ? `${syntheticBlockedGoogle.status}: ${syntheticBlockedGoogle.reason}` : 'missing synthetic google row',
  )
  addCheck(
    checks,
    syntheticConnectorFinding?.detail?.includes('Google Workspace') &&
      syntheticConnectorFinding?.detail?.includes('Calendar OAuth expired') &&
      Array.isArray(syntheticConnectorFinding?.connectorKeys) &&
      syntheticConnectorFinding.connectorKeys.includes('google-workspace'),
    'system-health blocked connector finding names connector and reason',
    syntheticConnectorFinding?.detail || 'missing connector_blocked finding',
  )
  addCheck(
    checks,
    credentialRegistrySource.includes('blocksConnectorHealth: false') &&
      credentialRegistrySource.includes('readinessNote') &&
      connectorUptimeSource.includes('credentialReadinessNotes') &&
      systemHealthSource.includes('blockedConnectorDetail'),
    'implementation keeps non-blocking notes visible and names future blocked rows',
    'connector credential registry + uptime + system health',
  )

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    cardId: CARD_ID,
    planPath: PLAN_PATH,
    approvalPath: APPROVAL_PATH,
    googleWorkspace: googleWorkspace ? {
      status: googleWorkspace.status,
      reason: googleWorkspace.reason,
      credentialBlockedCount: googleWorkspace.credentialBlockedCount,
      credentialReadinessNotes: googleWorkspace.credentialReadinessNotes,
    } : null,
    syntheticBlockedGoogle: syntheticBlockedGoogle ? {
      status: syntheticBlockedGoogle.status,
      reason: syntheticBlockedGoogle.reason,
      credentialBlockedCount: syntheticBlockedGoogle.credentialBlockedCount,
    } : null,
    syntheticConnectorFinding,
    checks,
    findings: failures,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Connector blocked-row diagnosis check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  if (failures.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
