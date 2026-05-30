#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { buildFoundationJobMutationAllowlistReport } from '../lib/foundation-job-mutation-allowlist.js'
import { getFoundationJobDefinitions } from '../lib/foundation-jobs.js'
import { closeFoundationDb } from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'
import { getExtractionControlSnapshot } from '../lib/foundation-source-crawl-db.js'
import { getFoundationCoreSnapshot } from '../lib/foundation-strategy-docs-db.js'
import { buildSourceLifecycleStatus } from '../lib/source-lifecycle.js'
import { buildSourceLifecycleCompletionStatus } from '../lib/source-lifecycle-completion.js'
import { getSourceConnectors, getSourceContracts } from '../lib/source-contracts.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const CARD_ID = 'GCAL-ATOM-SCHEDULE-001'
const SPRINT_ID = 'gcal-atom-schedule-2026-05-16'
const PLAN_PATH = 'docs/process/gcal-atom-schedule-001-plan.md'
const APPROVAL_PATH = 'docs/process/approvals/GCAL-ATOM-SCHEDULE-001.json'
const SOURCE_ID = 'SRC-GCAL-001'
const CONNECTOR_ID = 'CONN-GCAL-001'
const TARGET_KEY = 'calendar-current-day'
const JOB_KEY = 'calendar-sync-current'

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

function runCommand(command, args, { timeout = 90000 } = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: process.env,
    encoding: 'utf8',
    timeout,
  })
  return {
    ok: result.status === 0,
    status: result.status,
    signal: result.signal,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    output: `${result.stdout || ''}${result.stderr || ''}`,
    error: result.error?.message || '',
  }
}

function parseExtractionSummary(output) {
  const match = String(output || '').match(/^EXTRACTION_TARGET_SUMMARY\s+(\{.+\})$/m)
  if (!match) return null
  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

function hasCalendarMutationToken(source = '') {
  return [
    /googleJsonFetch\s*\(/,
    /method:\s*['"](?:POST|PATCH|PUT|DELETE)['"]/i,
    /calendar\/v3[^\n`'"]*\/events[^\n`'"]*(?:insert|update|delete|move|quickAdd)/i,
    /events\.(?:insert|update|delete|patch|move|quickAdd)\b/i,
    /\b(sendUpdates|attendeesOmitted|anyoneCanAddSelf)\b/,
  ].some(pattern => pattern.test(source))
}

function targetByKey(snapshot, targetKey) {
  return (snapshot.targets || []).find(target => target.targetKey === targetKey) || null
}

function buildLifecycleCompletion({ extractionControl, backlogItems }) {
  const sourceContracts = getSourceContracts()
  const sourceConnectors = getSourceConnectors()
  const sourceLifecycle = buildSourceLifecycleStatus({
    sources: sourceContracts,
    connectors: sourceConnectors,
    extractionControl,
    foundationJobs: getFoundationJobDefinitions(),
    groupedSystems: [],
  })
  return buildSourceLifecycleCompletionStatus({
    sourceLifecycle,
    sourceOfTruth: {
      sources: sourceContracts,
      connectors: sourceConnectors,
    },
    foundationHub: {
      backlogItems,
    },
    generatedAt: new Date('2026-05-16T22:30:00.000Z').toISOString(),
  })
}

async function main() {
  const args = parseArgs()
  const checks = []

  const [
    approval,
    activeSprint,
    planCriticRuns,
    extractionControl,
    foundationCore,
    packageSource,
    syncScriptSource,
    runnerSource,
    seedSource,
    jobsSource,
    allowlistSource,
    connectorRegistrySource,
    sourceLifecycleSource,
    sourceLifecycleCompletionSource,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([CARD_ID]),
    getExtractionControlSnapshot({ limit: 100 }),
    getFoundationCoreSnapshot({ mode: 'core' }),
    readRepoFile('package.json'),
    readRepoFile('scripts/sync-calendar-events.mjs'),
    readRepoFile('scripts/run-extraction-target.mjs'),
    readRepoFile('scripts/seed-extraction-control.mjs'),
    readRepoFile('lib/foundation-jobs.js'),
    readRepoFile('lib/foundation-job-mutation-allowlist.js'),
    readRepoFile('lib/connector-credential-registry.js'),
    readRepoFile('lib/source-lifecycle.js'),
    readRepoFile('lib/source-lifecycle-completion.js'),
  ])

  const packageJson = JSON.parse(packageSource)
  const activeItem = (activeSprint.items || []).find(item => item.cardId === CARD_ID) || null
  const target = targetByKey(extractionControl, TARGET_KEY)
  const jobs = getFoundationJobDefinitions()
  const job = jobs.find(row => row.key === JOB_KEY) || null
  const allowlistReport = buildFoundationJobMutationAllowlistReport({ jobs })
  const allowlistRow = allowlistReport.rows.find(row => row.key === JOB_KEY) || null
  const calendarSyncDryRun = runCommand('npm', ['run', 'calendar:sync-events', '--', '--dryRun=true', '--json', '--limit=1'], { timeout: 90000 })
  const calendarSummary = parseExtractionSummary(calendarSyncDryRun.output)
  const runnerDryRun = runCommand('npm', ['run', 'extraction:target', '--', '--target=calendar-current-day', '--dry-run=true'], { timeout: 60000 })
  const realLifecycleCompletion = buildLifecycleCompletion({
    extractionControl,
    backlogItems: foundationCore.backlogItems || [],
  })
  const syntheticMissingTargetControl = {
    ...extractionControl,
    targets: (extractionControl.targets || []).filter(row => row.targetKey !== TARGET_KEY),
  }
  const syntheticLifecycleCompletion = buildLifecycleCompletion({
    extractionControl: syntheticMissingTargetControl,
    backlogItems: foundationCore.backlogItems || [],
  })

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
    packageJson.scripts?.['calendar:sync-events'] === 'node --env-file-if-exists=.env scripts/sync-calendar-events.mjs' &&
      packageJson.scripts?.['process:gcal-atom-schedule-check'] === 'node --env-file-if-exists=.env scripts/process-gcal-atom-schedule-check.mjs',
    'package exposes Calendar sync and focused proof scripts',
    packageJson.scripts?.['calendar:sync-events'] || 'missing',
  )
  addCheck(
    checks,
    Boolean(target) &&
      target.sourceId === SOURCE_ID &&
      target.status === 'active' &&
      target.runtimeMode === 'scheduled' &&
      Number(target.budget?.maxItemsPerRun || 0) === 50 &&
      Number(target.budget?.maxRuntimeSeconds || 0) === 600,
    'live extraction target is registered and bounded',
    target ? `${target.targetKey}:${target.sourceId}:${target.status}/${target.runtimeMode}` : 'missing target',
  )
  addCheck(
    checks,
    Boolean(job) &&
      job.runtimeMode === 'scheduled' &&
      job.scheduleEveryMinutes === 1440 &&
      job.args.includes('--target=calendar-current-day') &&
      job.sourceIds.includes(SOURCE_ID),
    'scheduled Foundation job routes to the Calendar extraction target',
    job ? `${job.key}:${job.runtimeMode}:${job.args.join(' ')}` : 'missing job',
  )
  addCheck(
    checks,
    allowlistRow?.allowlistOk === true &&
      allowlistRow.mutationPosture === 'operational_write' &&
      allowlistRow.sourceIds.includes(SOURCE_ID),
    'Calendar scheduled job is allowlisted as internal operational writes only',
    allowlistRow ? `${allowlistRow.allowlistStatus}:${allowlistRow.mutationPosture}` : 'missing allowlist row',
  )
  addCheck(
    checks,
    runnerSource.includes("target.targetKey === 'calendar-current-day'") &&
      runnerSource.includes("'calendar:sync-events'") &&
      runnerSource.includes('EXTRACTION_TARGET_SUMMARY'),
    'extraction target runner knows the Calendar target',
    'scripts/run-extraction-target.mjs',
  )
  addCheck(
    checks,
    seedSource.includes("targetKey: 'calendar-current-day'") &&
      seedSource.includes("sourceId: 'SRC-GCAL-001'") &&
      seedSource.includes('no descriptions/raw notes'),
    'extraction target seed owns Calendar target shape and privacy boundary',
    'scripts/seed-extraction-control.mjs',
  )
  addCheck(
    checks,
    jobsSource.includes("key: 'calendar-sync-current'") &&
      allowlistSource.includes("'calendar-sync-current'") &&
      connectorRegistrySource.includes('scheduled through the read-only calendar-current-day source lane'),
    'runtime job, allowlist, and connector registry all name the Calendar schedule',
    'job + allowlist + connector registry',
  )
  addCheck(
    checks,
    sourceLifecycleSource.includes('SOURCE_LIFECYCLE_REQUIRED_TARGET_COUNT = 13') &&
      sourceLifecycleSource.includes("'calendar-current-day'") &&
      sourceLifecycleCompletionSource.includes("'SRC-GCAL-001'") &&
      sourceLifecycleCompletionSource.includes("'calendar-current-day'"),
    'source lifecycle and completion rules include Calendar target coverage',
    'required target count 13',
  )
  addCheck(
    checks,
    !hasCalendarMutationToken(syncScriptSource) &&
      syncScriptSource.includes('listCalendarEvents') &&
      syncScriptSource.includes('privacyBoundary'),
    'Calendar sync script is read-only toward Google Calendar and records privacy boundary',
    hasCalendarMutationToken(syncScriptSource) ? 'calendar mutation token found' : 'no Calendar mutation tokens',
  )
  addCheck(
    checks,
    calendarSyncDryRun.ok &&
      calendarSummary?.sourceId === SOURCE_ID &&
      calendarSummary?.targetKey === TARGET_KEY &&
      calendarSummary?.dryRun === true &&
      Number(calendarSummary.itemFailures || 0) === 0,
    'Calendar provider dry-run reads and produces target summary without internal writes',
    calendarSyncDryRun.ok ? `inspected=${calendarSummary?.inspected ?? 'missing'}` : (calendarSyncDryRun.stderr || calendarSyncDryRun.error || 'failed'),
  )
  addCheck(
    checks,
    runnerDryRun.ok &&
      runnerDryRun.output.includes('"targetKey": "calendar-current-day"') &&
      runnerDryRun.output.includes('"calendar:sync-events"') &&
      runnerDryRun.output.includes('"runtimeMode": "scheduled"'),
    'extraction runner dry-run resolves Calendar command without leasing or writing',
    runnerDryRun.ok ? 'runner dry-run ok' : (runnerDryRun.stderr || runnerDryRun.error || 'failed'),
  )
  addCheck(
    checks,
    syntheticLifecycleCompletion.status === 'risk' &&
      syntheticLifecycleCompletion.findings.some(finding => String(finding.detail || '').includes(TARGET_KEY) || String(finding.check || '').includes('approved target baseline keys')),
    'dogfood rejects old readable-but-unscheduled Calendar failure',
    syntheticLifecycleCompletion.findings.map(finding => `${finding.check}:${finding.detail}`).slice(0, 4).join('; ') || 'missing synthetic failure',
  )
  addCheck(
    checks,
    realLifecycleCompletion.status === 'healthy' &&
      realLifecycleCompletion.summary?.extractionTargetCount === 13,
    'real lifecycle completion status accepts scheduled Calendar target',
    `${realLifecycleCompletion.status} targets=${realLifecycleCompletion.summary?.extractionTargetCount || 'missing'}`,
  )

  await closeFoundationDb()

  const failures = checks.filter(check => !check.ok)
  const summary = {
    cardId: CARD_ID,
    sprintId: SPRINT_ID,
    status: failures.length ? 'failed' : 'passed',
    checkedAt: new Date().toISOString(),
    checks,
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Google Calendar atom schedule proof')
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` — ${check.detail}` : ''}`)
    }
  }

  if (failures.length) process.exitCode = 1
}

main()
  .catch(async error => {
    await closeFoundationDb()
    console.error('Google Calendar atom schedule proof failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
