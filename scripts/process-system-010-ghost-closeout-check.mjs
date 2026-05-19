#!/usr/bin/env node

import { execFile as execFileCallback, spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import process from 'node:process'
import { promisify } from 'node:util'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  buildDecommissionDecision,
  buildRuntimeProcessControlSnapshot,
  buildStopDecision,
  getJobRunPermission,
  SYSTEM_010_APPROVAL_PATH,
  SYSTEM_010_CARD_ID,
  SYSTEM_010_CLOSEOUT_KEY,
  SYSTEM_010_PROCESS_SCRIPT_PATH,
  SYSTEM_010_SUMMARY_MARKER,
  terminateProcessTree,
} from '../lib/runtime-process-control.js'

const execFile = promisify(execFileCallback)
const repoRoot = process.cwd()
const checks = []

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [rawKey, ...rawValue] = arg.slice(2).split('=')
    args[rawKey] = rawValue.length ? rawValue.join('=') : 'true'
  }
  return args
}

function addCheck(ok, label, detail = '') {
  const check = { ok: Boolean(ok), label, detail }
  checks.push(check)
  console.log(`${check.ok ? 'PASS' : 'FAIL'} ${label}${detail ? ` -> ${detail}` : ''}`)
}

async function readText(pathname) {
  return fs.readFile(pathname, 'utf8')
}

async function readJson(pathname) {
  return JSON.parse(await readText(pathname))
}

async function currentHead() {
  const { stdout } = await execFile('git', ['rev-parse', 'HEAD'], {
    cwd: repoRoot,
    maxBuffer: 1024 * 64,
  })
  return stdout.trim()
}

async function fetchRaw(baseUrl, pathname, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 120000)
  try {
    const headers = {
      ...(options.headers || {}),
    }
    if (process.env.ADMIN_TOKEN) headers['X-Admin-Token'] = process.env.ADMIN_TOKEN
    const response = await fetch(new URL(pathname, baseUrl), {
      method: options.method || 'GET',
      headers,
      body: options.body,
      signal: controller.signal,
    })
    const text = await response.text()
    let payload = {}
    try {
      payload = text ? JSON.parse(text) : {}
    } catch {
      payload = { raw: text }
    }
    return { response, text, payload }
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchJson(baseUrl, pathname) {
  const { response, text, payload } = await fetchRaw(baseUrl, pathname)
  if (!response.ok) {
    throw new Error(`${pathname} returned ${response.status} ${response.statusText}: ${text.slice(0, 200)}`)
  }
  return payload
}

function isAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error?.code !== 'ESRCH'
  }
}

async function waitForExit(pid, timeoutMs = 5000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (!isAlive(pid)) return true
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  return !isAlive(pid)
}

async function runOwnedStopFixture() {
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    detached: true,
    stdio: 'ignore',
  })
  child.unref()
  try {
    await new Promise(resolve => setTimeout(resolve, 150))
    const decision = buildStopDecision({
      run: {
        runId: 'system-010-fixture-run',
        jobKey: 'system-010-fixture',
        status: 'running',
        metadata: {
          childPid: child.pid,
          processOwner: 'foundation-job-runner',
          processStartedByRunId: 'system-010-fixture-run',
        },
      },
      servedCode: {
        status: 'live',
        runningCommit: '0'.repeat(40),
      },
      currentRepoHead: '0'.repeat(40),
      signal: 'SIGTERM',
    })
    if (!decision.ok) {
      return { ok: false, detail: `fixture stop decision blocked: ${decision.reasons.join(' ')}` }
    }
    const termination = await terminateProcessTree(child.pid, { signal: 'SIGTERM' })
    const exited = await waitForExit(child.pid, 5000)
    if (!exited && isAlive(child.pid)) {
      await terminateProcessTree(child.pid, { signal: 'SIGKILL' }).catch(() => {})
      await waitForExit(child.pid, 2000)
    }
    return {
      ok: exited || !isAlive(child.pid),
      detail: `${termination.method} pid=${child.pid}`,
    }
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

async function main() {
  const args = parseArgs()
  const baseUrl = String(args.baseUrl || process.env.FOUNDATION_BASE_URL || 'http://localhost:3000')
  const head = await currentHead()
  const [
    packageJson,
    serverSource,
    dbSource,
    jobsSource,
    runnerSource,
    workerSource,
    publicSource,
    runtimeSource,
    readinessSource,
    verifySource,
    buildLogSource,
    processScriptSource,
  ] = await Promise.all([
    readJson('package.json'),
    readText('server.js'),
    readText('lib/foundation-db.js'),
    readText('lib/foundation-jobs.js'),
    readText('scripts/run-foundation-job.mjs'),
    readText('scripts/foundation-worker.mjs'),
    readText('public/foundation.js'),
    readText('lib/runtime-process-control.js'),
    readText('lib/foundation-readiness-gates.js'),
    readText('scripts/foundation-verify.mjs'),
    readText('lib/foundation-build-log.js'),
    readText(SYSTEM_010_PROCESS_SCRIPT_PATH),
  ])
  const routeSource = `${serverSource}\n${await readText('lib/foundation-runtime-read-routes.js')}\n${await readText('lib/foundation-write-routes.js')}`
  const dbRuntimeSource = `${dbSource}\n${await readText('lib/foundation-db-schema-seed-store.js')}\n${await readText('lib/foundation-runtime-job-store.js')}`
  const publicRuntimeSource = `${publicSource}\n${await readText('public/foundation-runtime-renderers.js')}\n${await readText('public/foundation-data.js')}`
  const verifierRuntimeSource = `${verifySource}\n${await readText('lib/foundation-verifier-control-loop.js')}\n${await readText('lib/foundation-verifier-process-control-governance.js')}`
  const buildLogRuntimeSource = `${buildLogSource}\n${await readText('lib/foundation-build-closeout-foundation-surface-records.js')}\n${await readText('lib/foundation-build-closeout-process-gate-records.js')}`

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: SYSTEM_010_APPROVAL_PATH,
    cardId: SYSTEM_010_CARD_ID,
  })
  addCheck(approval.ok, 'approval artifact validates against approved plan', approval.failures?.map(item => item.check).join(', ') || approval.mode)

  addCheck(
    packageJson.scripts?.['process:system-010-ghost-closeout-check'] ===
      'node --env-file-if-exists=.env scripts/process-system-010-ghost-closeout-check.mjs',
    'package registers process:system-010-ghost-closeout-check',
  )
  addCheck(
    runtimeSource.includes('SYSTEM_010_RUNTIME_MODES') &&
      runtimeSource.includes('decommissioned') &&
      runtimeSource.includes('buildRuntimeProcessControlSnapshot') &&
      runtimeSource.includes('buildStopDecision') &&
      runtimeSource.includes('terminateProcessTree'),
    'central runtime process-control layer owns SYSTEM-010 policy',
  )
  addCheck(
    routeSource.includes("app.get('/api/foundation/active-processes'") &&
      routeSource.includes("app.post('/api/foundation/job-runs/:runId/stop'") &&
      routeSource.includes("app.post('/api/foundation/jobs/:jobKey/decommission'") &&
      routeSource.includes('use_decommission_route'),
    'server exposes active-process, stop, and confirmation-gated decommission routes',
  )
  addCheck(
    dbRuntimeSource.includes("'scheduled', 'manual', 'paused', 'decommissioned'") &&
      dbRuntimeSource.includes('getFoundationJobControl') &&
      dbRuntimeSource.includes('updateFoundationJobRunMetadata') &&
      dbRuntimeSource.includes('markFoundationJobRunStopped'),
    'database schema and helpers support decommissioned mode and process metadata',
  )
  addCheck(
    jobsSource.includes("runtimeMode === 'decommissioned'") &&
      runnerSource.includes('getJobRunPermission') &&
      runnerSource.includes('processOwner') &&
      runnerSource.includes('foundation-job-runner') &&
      workerSource.includes("job.runtimeMode === 'scheduled'"),
    'runner and worker fail closed for decommissioned jobs and record owned process metadata',
  )
  addCheck(
    publicRuntimeSource.includes('renderRuntimeProcessControlPanel') &&
      publicRuntimeSource.includes('stopFoundationJobRun') &&
      publicRuntimeSource.includes('decommissionFoundationJob') &&
      publicRuntimeSource.includes('DECOMMISSION '),
    'Runtime Health exposes active-process stop/decommission controls',
  )
  addCheck(
    readinessSource.includes("closeoutKey: 'system-010-ghost-closeout-v1'") &&
      readinessSource.includes("proofCommands: ['npm run process:system-010-ghost-closeout-check']"),
    'readiness gate requires SYSTEM-010 closeout key and proof command',
  )
  addCheck(
    verifierRuntimeSource.includes('process:system-010-ghost-closeout-check') &&
      verifierRuntimeSource.includes('SYSTEM_010_CLOSEOUT_KEY'),
    'foundation:verify has SYSTEM-010 process-control coverage hooks',
  )
  addCheck(
    buildLogRuntimeSource.includes('system-010-ghost-closeout-v1') &&
      buildLogRuntimeSource.includes('SYSTEM-010-GHOST-CLOSEOUT-001'),
    'build log has SYSTEM-010 closeout registration',
  )
  addCheck(
    processScriptSource.includes('SYSTEM_010_SUMMARY_MARKER') &&
      processScriptSource.includes('runOwnedStopFixture') &&
      processScriptSource.includes('use_decommission_route'),
    'focused proof script checks stop fixture and decommission guardrails',
  )

  const decommissionedPermission = getJobRunPermission({
    key: 'synthetic',
    runtimeMode: 'decommissioned',
    enabled: false,
  }, { force: true })
  addCheck(!decommissionedPermission.ok, 'decommissioned job cannot run even with force', decommissionedPermission.reason)

  const unsafeStop = buildStopDecision({
    run: {
      runId: 'unsafe',
      jobKey: 'unsafe',
      status: 'running',
      metadata: {
        childPid: process.pid,
        processOwner: 'unknown',
      },
    },
    servedCode: {
      status: 'live',
      runningCommit: head,
    },
    currentRepoHead: head,
  })
  addCheck(!unsafeStop.ok && unsafeStop.failClosed, 'unowned PID stop decision fails closed', unsafeStop.reasons.join(' '))

  const decommissionConfirm = buildDecommissionDecision({
    job: { key: 'synthetic-job', latestRun: null },
    confirmation: 'DECOMMISSION synthetic-job',
  })
  const decommissionBlocked = buildDecommissionDecision({
    job: {
      key: 'active-job',
      latestRun: { status: 'running' },
    },
    confirmation: 'DECOMMISSION active-job',
  })
  addCheck(decommissionConfirm.ok && decommissionConfirm.control?.runtimeMode === 'decommissioned', 'exact decommission confirmation returns durable control payload')
  addCheck(!decommissionBlocked.ok && decommissionBlocked.failClosed, 'decommission blocks jobs with active runs', decommissionBlocked.reasons.join(' '))

  const syntheticSnapshot = buildRuntimeProcessControlSnapshot({
    foundationJobs: {
      jobs: [{
        key: 'synthetic-job',
        title: 'Synthetic Job',
        enabled: true,
        runtimeMode: 'scheduled',
        maxRuntimeSeconds: 1,
        budget: 'connector',
      }],
      latestRuns: [{
        runId: 'synthetic-run',
        jobKey: 'synthetic-job',
        status: 'running',
        startedAt: new Date(Date.now() - 180000).toISOString(),
        metadata: {
          childPid: 999999,
          processOwner: 'foundation-job-runner',
          processStartedByRunId: 'synthetic-run',
        },
      }],
    },
    llmRuntime: {
      recentCalls: [{
        callId: 'synthetic-call',
        status: 'started',
        estimatedCostUsd: 0.01,
      }],
    },
    extractionControl: {
      recentRuns: [{
        runId: 'synthetic-crawl',
        status: 'running',
        staleState: { isStale: true, reason: 'lease_expired' },
      }],
      recentItems: [{
        itemKey: 'synthetic-item',
        status: 'pending',
        leaseExpiresAt: new Date(Date.now() + 60000).toISOString(),
      }],
    },
    runtimeSupervisor: {
      servedCode: { status: 'live', runningCommit: head, restartCommand: 'restart-dashboard' },
      workerCode: { status: 'live', runningCommit: head, restartCommand: 'restart-worker' },
    },
    currentRepoHead: head,
  })
  addCheck(
    syntheticSnapshot.summary.staleRiskCount === 2 &&
      syntheticSnapshot.summary.activeFoundationJobRuns === 1 &&
      syntheticSnapshot.summary.activeLlmCalls === 1 &&
      syntheticSnapshot.costRisk.status === 'watch',
    'active-process snapshot rolls up stale liveness and cost/process risk',
    JSON.stringify(syntheticSnapshot.summary),
  )

  const stopFixture = await runOwnedStopFixture()
  addCheck(stopFixture.ok, 'owned fixture process can be stopped through SYSTEM-010 terminator', stopFixture.detail)

  const [hubResult, activeResult] = await Promise.all([
    fetchJson(baseUrl, '/api/foundation-hub').then(data => ({ ok: true, data }), error => ({ ok: false, error })),
    fetchJson(baseUrl, '/api/foundation/active-processes').then(data => ({ ok: true, data }), error => ({ ok: false, error })),
  ])
  addCheck(
    (hubResult.ok && hubResult.data?.runtimeProcessControl?.summary) ||
      (activeResult.ok && activeResult.data?.summary),
    'Foundation runtime process-control summary is exposed by Hub or active-process route',
    hubResult.ok && hubResult.data?.runtimeProcessControl?.summary
      ? JSON.stringify(hubResult.data.runtimeProcessControl.summary)
      : activeResult.ok ? JSON.stringify(activeResult.data.summary) : String(hubResult.error || activeResult.error),
  )
  addCheck(activeResult.ok && activeResult.data?.summary && activeResult.data?.activeProcessView, 'active-process route returns stable snapshot shape', activeResult.ok ? JSON.stringify(activeResult.data.summary) : String(activeResult.error))
  if (activeResult.ok) {
    const serialized = JSON.stringify(activeResult.data)
    addCheck(
      !/SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|sk-[A-Za-z0-9_-]{12,}/.test(serialized),
      'active-process route does not expose obvious secret material',
    )
  }

  if (hubResult.ok) {
    const job = (hubResult.data.foundationJobs?.jobs || []).find(item => item.key) || null
    if (job) {
      const controlReject = await fetchRaw(baseUrl, `/api/foundation/jobs/${encodeURIComponent(job.key)}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runtimeMode: 'decommissioned',
          enabled: false,
        }),
      })
      addCheck(
        controlReject.response.status === 400 && JSON.stringify(controlReject.payload).includes('use_decommission_route'),
        'generic job-control route refuses decommission without dedicated confirmation route',
        `status=${controlReject.response.status}`,
      )

      const badConfirm = await fetchRaw(baseUrl, `/api/foundation/jobs/${encodeURIComponent(job.key)}/decommission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'wrong' }),
      })
      addCheck(
        badConfirm.response.status === 409,
        'decommission route rejects missing exact confirmation without mutating job',
        `status=${badConfirm.response.status}`,
      )
    } else {
      addCheck(false, 'live Foundation Hub exposes at least one Foundation job for decommission guard proof')
    }
  }

  const closeout = getFoundationBuildCloseouts().find(item => item.key === SYSTEM_010_CLOSEOUT_KEY)
  addCheck(Boolean(closeout), 'SYSTEM-010 closeout exists in build log registry', closeout?.subject || '')

  const failed = checks.filter(check => !check.ok)
  const summary = {
    status: failed.length ? 'failed' : 'passed',
    cardId: SYSTEM_010_CARD_ID,
    closeoutKey: SYSTEM_010_CLOSEOUT_KEY,
    repoHead: head,
    generatedAt: new Date().toISOString(),
    totalChecks: checks.length,
    failedChecks: failed.map(check => check.label),
  }
  console.log(`\n${SYSTEM_010_SUMMARY_MARKER} ${JSON.stringify(summary)}`)
  if (failed.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
