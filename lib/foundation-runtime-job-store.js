import { getFoundationJobDefinitions, getFoundationJobRuntime } from './foundation-jobs.js'
import { buildFoundationWorkerReliabilitySnapshot } from './foundation-worker-reliability.js'

export const FOUNDATION_RUNTIME_JOB_STORE_SPLIT_CARD_ID = 'FOUNDATION-DB-MONOLITH-SPLIT-011'
export const FOUNDATION_RUNTIME_JOB_STORE_SPLIT_SPRINT_ID = 'foundation-db-runtime-job-store-split-2026-05-16'
export const FOUNDATION_RUNTIME_JOB_STORE_SPLIT_CLOSEOUT_KEY = 'foundation-runtime-job-store-split-v1'
export const FOUNDATION_RUNTIME_JOB_STORE_SPLIT_PLAN_PATH = 'docs/process/foundation-db-runtime-job-store-split-011-plan.md'
export const FOUNDATION_RUNTIME_JOB_STORE_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-011.json'
export const FOUNDATION_RUNTIME_JOB_STORE_SPLIT_SCRIPT_PATH = 'scripts/process-foundation-runtime-job-store-split-check.mjs'
export const FOUNDATION_RUNTIME_JOB_STORE_PRE_SPLIT_LINES = 8892

function countTextLines(source = '') {
  const text = String(source || '')
  if (!text) return 0
  const newlineCount = (text.match(/\n/g) || []).length
  return newlineCount + (text.endsWith('\n') ? 0 : 1)
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

export function evaluateFoundationRuntimeJobStoreSplit({
  foundationDbSource = '',
  moduleSource = '',
  scriptSource = '',
  planSource = '',
  afterLines = countTextLines(foundationDbSource),
  beforeLines = FOUNDATION_RUNTIME_JOB_STORE_PRE_SPLIT_LINES,
} = {}) {
  const checks = []
  const normalizedPlanSource = String(planSource || '').toLowerCase()
  addCheck(
    checks,
    moduleSource.includes('export function createFoundationRuntimeJobStore') &&
      moduleSource.includes('async function getFoundationJobScheduleIndex') &&
      moduleSource.includes('async function getFoundationJobControl') &&
      moduleSource.includes('async function recordFoundationRuntimeStatus') &&
      moduleSource.includes('async function getFoundationRuntimeStatus') &&
      moduleSource.includes('async function getFoundationJobRunSnapshot') &&
      moduleSource.includes('async function getFoundationJobRunById') &&
      moduleSource.includes('async function updateFoundationJobControl') &&
      moduleSource.includes('async function updateFoundationJobRunMetadata') &&
      moduleSource.includes('async function createFoundationJobRun') &&
      moduleSource.includes('async function finishFoundationJobRun') &&
      moduleSource.includes('async function markStaleFoundationJobRuns'),
    'runtime/job store module owns the extracted public behavior',
    'factory and runtime/job functions present',
  )
  addCheck(
    checks,
    moduleSource.includes('function mapFoundationJobRunRow') &&
      moduleSource.includes('function mapFoundationJobControlRow') &&
      moduleSource.includes('function mapFoundationRuntimeStatusRow') &&
      moduleSource.includes('function getFoundationJobHealth') &&
      moduleSource.includes('function applyFoundationJobControl'),
    'runtime/job store module owns row mappers and health helpers',
    'job run/control/runtime mappers present',
  )
  addCheck(
    checks,
    foundationDbSource.includes("./foundation-runtime-job-store.js") &&
      foundationDbSource.includes('createFoundationRuntimeJobStore({') &&
      foundationDbSource.includes('foundationRuntimeJobStore'),
    'foundation-db wires through the dedicated runtime/job store module',
    'store import and instance present',
  )
  addCheck(
    checks,
    foundationDbSource.includes('export const getFoundationJobScheduleIndex = foundationRuntimeJobStore.getFoundationJobScheduleIndex') &&
      foundationDbSource.includes('export const getFoundationJobRunSnapshot = foundationRuntimeJobStore.getFoundationJobRunSnapshot') &&
      foundationDbSource.includes('export const markStaleFoundationJobRuns = foundationRuntimeJobStore.markStaleFoundationJobRuns'),
    'foundation-db keeps stable public runtime/job delegates',
    'delegate exports present',
  )
  addCheck(
    checks,
    !/function\s+mapFoundationJobRunRow\s*\(/.test(foundationDbSource) &&
      !/function\s+mapFoundationJobControlRow\s*\(/.test(foundationDbSource) &&
      !/function\s+mapFoundationRuntimeStatusRow\s*\(/.test(foundationDbSource) &&
      !/function\s+getFoundationJobHealth\s*\(/.test(foundationDbSource) &&
      !/export\s+async\s+function\s+getFoundationJobRunSnapshot\s*\(/.test(foundationDbSource) &&
      !/export\s+async\s+function\s+createFoundationJobRun\s*\(/.test(foundationDbSource) &&
      !/export\s+async\s+function\s+markStaleFoundationJobRuns\s*\(/.test(foundationDbSource),
    'foundation-db no longer defines extracted runtime/job behavior inline',
    'inline mapper/function definitions absent',
  )
  addCheck(
    checks,
    scriptSource.includes('dogfood rejects old inline runtime/job ownership') &&
      scriptSource.includes('buildSyntheticFoundationRuntimeJobStoreBehaviorProof') &&
      scriptSource.includes('getPlanCriticRunsByCardIds'),
    'focused proof has dogfood and Plan Critic checks',
    FOUNDATION_RUNTIME_JOB_STORE_SPLIT_SCRIPT_PATH,
  )
  addCheck(
    checks,
    normalizedPlanSource.includes('split/extraction plan') &&
      normalizedPlanSource.includes('scheduled jobs') &&
      (normalizedPlanSource.includes('stable public exports') || normalizedPlanSource.includes('existing public exports')),
    'plan documents split/extraction posture and no-live-job boundary',
    FOUNDATION_RUNTIME_JOB_STORE_SPLIT_PLAN_PATH,
  )
  addCheck(
    checks,
    beforeLines > 0 && afterLines > 0 && afterLines < beforeLines,
    'foundation-db.js line count decreases after the split',
    String(beforeLines) + '->' + String(afterLines),
  )

  return {
    ok: checks.every(check => check.ok),
    checks,
    failed: checks.filter(check => !check.ok),
    beforeLines,
    afterLines,
  }
}

function makeFakePool() {
  const rows = {
    control: {
      job_key: 'code-quality-nightly-audit',
      runtime_mode: 'scheduled',
      enabled: true,
      schedule_every_minutes: 1440,
      pause_reason: null,
      updated_by: 'synthetic-proof',
      updated_at: '2026-05-16T05:00:00.000Z',
    },
    runtimeStatus: {
      service_key: 'dashboard',
      service_label: 'Foundation Dashboard',
      status: 'live',
      started_at: '2026-05-16T05:00:00.000Z',
      process_id: 1234,
      running_commit: 'synthetic-commit',
      running_short_commit: 'synthetic',
      captured_at: '2026-05-16T05:01:00.000Z',
      check_name: 'served-code-equals-HEAD',
      restart_command: 'npm run dashboard:restart',
      plain_english: 'Synthetic dashboard status is healthy.',
      metadata: { synthetic: true },
      updated_at: '2026-05-16T05:01:00.000Z',
    },
    run: {
      run_id: 'job-run-synthetic-1',
      job_key: 'code-quality-nightly-audit',
      title: 'Code Quality Nightly Audit',
      job_type: 'report',
      status: 'running',
      command: { script: 'npm run audit' },
      requested_by: 'synthetic-proof',
      started_at: '2026-05-16T05:00:00.000Z',
      finished_at: null,
      duration_ms: null,
      exit_code: null,
      signal: null,
      output_tail: 'synthetic output',
      error_message: null,
      metadata: { synthetic: true },
      created_at: '2026-05-16T05:00:00.000Z',
      updated_at: '2026-05-16T05:00:00.000Z',
    },
  }
  const calls = []
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql: String(sql), params })
      if (/FROM foundation_job_controls/.test(sql) && /WHERE job_key =/.test(sql)) return { rows: [rows.control] }
      if (/FROM foundation_job_controls/.test(sql)) return { rows: [rows.control] }
      if (/INSERT INTO foundation_job_controls/.test(sql)) {
        return {
          rows: [{
            ...rows.control,
            job_key: params[0],
            runtime_mode: params[1],
            enabled: params[2],
            schedule_every_minutes: params[3],
            pause_reason: params[4],
            updated_by: params[5],
          }],
        }
      }
      if (/INSERT INTO foundation_runtime_status/.test(sql)) {
        return {
          rows: [{
            ...rows.runtimeStatus,
            service_key: params[0],
            service_label: params[1],
            status: params[2],
            process_id: params[4],
            running_commit: params[5],
            running_short_commit: params[6],
            check_name: params[7],
            restart_command: params[8],
            plain_english: params[9],
            metadata: JSON.parse(params[10] || '{}'),
          }],
        }
      }
      if (/FROM foundation_runtime_status/.test(sql)) return { rows: [rows.runtimeStatus] }
      if (/SELECT DISTINCT ON \(job_key\)/.test(sql)) return { rows: [rows.run] }
      if (/FROM foundation_job_runs/.test(sql) && /ORDER BY created_at DESC\s+LIMIT/.test(sql)) return { rows: [rows.run] }
      if (/FROM foundation_job_runs/.test(sql) && /WHERE run_id =/.test(sql)) return { rows: [rows.run] }
      if (/INSERT INTO foundation_job_runs/.test(sql)) {
        return {
          rows: [{
            ...rows.run,
            run_id: params[0],
            job_key: params[1],
            title: params[2],
            job_type: params[3],
            status: params[4],
            command: JSON.parse(params[5] || '{}'),
            requested_by: params[6],
            started_at: params[7],
            metadata: JSON.parse(params[8] || '{}'),
          }],
        }
      }
      if (/UPDATE foundation_job_runs/.test(sql) && /SET status = \$2/.test(sql)) {
        return {
          rows: [{
            ...rows.run,
            run_id: params[0],
            status: params[1],
            finished_at: params[2],
            duration_ms: params[3],
            exit_code: params[4],
            signal: params[5],
            output_tail: params[6],
            error_message: params[7],
            metadata: JSON.parse(params[8] || '{}'),
          }],
        }
      }
      if (/UPDATE foundation_job_runs/.test(sql) && /status = 'failed'/.test(sql)) {
        return { rows: [{ ...rows.run, status: 'failed', error_message: 'Marked failed by stale active-run reaper.' }] }
      }
      if (/UPDATE foundation_job_runs/.test(sql) && /metadata = COALESCE/.test(sql) && !/WITH selected/.test(sql)) {
        return { rows: [{ ...rows.run, run_id: params[0], metadata: { ...rows.run.metadata, patched: true } }] }
      }
      if (/SELECT pg_advisory_xact_lock/.test(sql)) return { rows: [] }
      if (/INSERT INTO change_events/.test(sql)) return { rows: [] }
      return { rows: [] }
    },
  }
}

export async function buildSyntheticFoundationRuntimeJobStoreBehaviorProof() {
  const fakePool = makeFakePool()
  const fakeClient = { query: (...args) => fakePool.query(...args) }
  const store = createFoundationRuntimeJobStore({
    pool: fakePool,
    withFoundationTransaction: async work => work(fakeClient),
    insertChangeEvent: async () => null,
  })

  const status = await store.recordFoundationRuntimeStatus({
    serviceKey: 'dashboard',
    serviceLabel: 'Foundation Dashboard',
    status: 'live',
    startedAt: '2026-05-16T05:00:00.000Z',
    processId: 1234,
    runningCommit: 'synthetic-commit',
    runningShortCommit: 'synthetic',
    restartCommand: 'npm run dashboard:restart',
    plainEnglish: 'Synthetic dashboard status is healthy.',
    metadata: { synthetic: true },
  }, 'synthetic-proof')
  const lookedUpStatus = await store.getFoundationRuntimeStatus('dashboard')
  const control = await store.updateFoundationJobControl('code-quality-nightly-audit', {
    runtimeMode: 'scheduled',
    enabled: true,
    scheduleEveryMinutes: 1440,
  }, 'synthetic-proof')
  const scheduleIndex = await store.getFoundationJobScheduleIndex()
  const snapshot = await store.getFoundationJobRunSnapshot({ limit: 5, includeOutput: true })
  const created = await store.createFoundationJobRun({
    runId: 'job-run-synthetic-2',
    jobKey: 'code-quality-nightly-audit',
    title: 'Code Quality Nightly Audit',
    jobType: 'report',
    command: { script: 'npm run audit' },
    startedAt: '2026-05-16T05:10:00.000Z',
    metadata: { synthetic: true },
  }, 'synthetic-proof')
  const finished = await store.finishFoundationJobRun('job-run-synthetic-2', {
    status: 'succeeded',
    finishedAt: '2026-05-16T05:11:00.000Z',
    durationMs: 60000,
    exitCode: 0,
    outputTail: 'done',
  }, 'synthetic-proof')
  const reaped = await store.markStaleFoundationJobRuns({ olderThanMinutes: 30 }, 'synthetic-proof')

  const checks = []
  addCheck(checks, status.serviceKey === 'dashboard' && status.status === 'live', 'runtime status write mapping is preserved', JSON.stringify(status))
  addCheck(checks, lookedUpStatus.serviceKey === 'dashboard', 'runtime status lookup mapping is preserved', JSON.stringify(lookedUpStatus))
  addCheck(checks, control.jobKey === 'code-quality-nightly-audit' && control.runtimeMode === 'scheduled', 'job control write mapping is preserved', JSON.stringify(control))
  addCheck(checks, scheduleIndex instanceof Map && scheduleIndex.size >= 1, 'job schedule index returns a keyed Map', `size=${scheduleIndex.size}`)
  addCheck(checks, snapshot.latestRuns[0]?.runId === 'job-run-synthetic-1' && snapshot.latestRuns[0]?.outputTail === 'synthetic output', 'job run snapshot mapping is preserved', JSON.stringify(snapshot.latestRuns[0]))
  addCheck(checks, created.runId === 'job-run-synthetic-2' && created.status === 'running', 'createFoundationJobRun mapping is preserved', JSON.stringify(created))
  addCheck(checks, finished.runId === 'job-run-synthetic-2' && finished.status === 'succeeded', 'finishFoundationJobRun mapping is preserved', JSON.stringify(finished))
  addCheck(checks, reaped[0]?.status === 'failed' && /stale active-run reaper/.test(reaped[0]?.errorMessage || ''), 'stale Foundation job reaper mapping is preserved', JSON.stringify(reaped[0]))

  return {
    ok: checks.every(check => check.ok),
    checks,
    failed: checks.filter(check => !check.ok),
    queryCount: fakePool.calls.length,
  }
}

export async function buildFoundationRuntimeJobStoreSplitDogfoodProof(input = {}) {
  const healthy = evaluateFoundationRuntimeJobStoreSplit(input)
  const oldInline = evaluateFoundationRuntimeJobStoreSplit({
    foundationDbSource: 'function mapFoundationJobRunRow(row) {} function mapFoundationJobControlRow(row) {} export async function getFoundationJobRunSnapshot() {} export async function createFoundationJobRun() {} export async function markStaleFoundationJobRuns() {}',
    moduleSource: '',
    scriptSource: '',
    planSource: '',
    beforeLines: 8892,
    afterLines: 8892,
  })
  const missingDelegate = evaluateFoundationRuntimeJobStoreSplit({
    foundationDbSource: "import { createFoundationRuntimeJobStore } from './foundation-runtime-job-store.js'\nconst foundationRuntimeJobStore = createFoundationRuntimeJobStore({})",
    moduleSource: input.moduleSource || '',
    scriptSource: input.scriptSource || '',
    planSource: input.planSource || '',
    beforeLines: 8892,
    afterLines: 8000,
  })
  const weakPlan = evaluateFoundationRuntimeJobStoreSplit({
    foundationDbSource: input.foundationDbSource || '',
    moduleSource: input.moduleSource || '',
    scriptSource: input.scriptSource || '',
    planSource: 'Move some code quickly.',
    beforeLines: 8892,
    afterLines: 8000,
  })
  const syntheticBehavior = await buildSyntheticFoundationRuntimeJobStoreBehaviorProof()

  return {
    ok: healthy.ok === true && oldInline.ok === false && missingDelegate.ok === false && weakPlan.ok === false && syntheticBehavior.ok === true,
    healthy,
    rejected: {
      oldInline: oldInline.ok === false,
      missingDelegate: missingDelegate.ok === false,
      weakPlan: weakPlan.ok === false,
    },
    syntheticBehavior,
    invariant: 'The runtime/job store split accepts delegated ownership and rejects old inline runtime/job ownership, missing delegates, and weak split plans.',
  }
}

function assertFunction(value, name) {
  if (typeof value !== 'function') throw new Error('Foundation runtime/job store requires ' + name + '.')
}

export function createFoundationRuntimeJobStore({
  pool,
  withFoundationTransaction,
  insertChangeEvent,
} = {}) {
  if (!pool) throw new Error('Foundation runtime/job store requires a pool.')
  assertFunction(withFoundationTransaction, 'withFoundationTransaction')
  assertFunction(insertChangeEvent, 'insertChangeEvent')

function mapFoundationJobRunRow(row, { includeOutput = false } = {}) {
  return {
    runId: row.run_id,
    jobKey: row.job_key,
    title: row.title,
    jobType: row.job_type,
    status: row.status,
    command: row.command || {},
    requestedBy: row.requested_by,
    startedAt: row.started_at?.toISOString?.() || row.started_at || null,
    finishedAt: row.finished_at?.toISOString?.() || row.finished_at || null,
    durationMs: row.duration_ms == null ? null : Number(row.duration_ms),
    exitCode: row.exit_code == null ? null : Number(row.exit_code),
    signal: row.signal || null,
    outputTail: includeOutput ? row.output_tail || '' : undefined,
    errorMessage: row.error_message || null,
    metadata: row.metadata || {},
    createdAt: row.created_at?.toISOString?.() || row.created_at || null,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
  }
}

function getFoundationJobHealth(job, latestRun) {
  if (!job.enabled) {
    return {
      status: 'planned',
      detail: 'Registered but not enabled for the runner yet.',
    }
  }

  if (latestRun?.status === 'running' || latestRun?.status === 'queued') {
    return {
      status: 'pending',
      detail: `Currently ${latestRun.status}.`,
    }
  }

  const runtime = getFoundationJobRuntime(job, latestRun)
  if (runtime.scheduleStatus === 'blocked') {
    return {
      status: 'risk',
      detail: runtime.scheduleDetail,
    }
  }

  if (runtime.scheduleStatus === 'paused') {
    return {
      status: 'planned',
      detail: runtime.scheduleDetail,
    }
  }

  if (runtime.scheduleStatus === 'manual' && !latestRun) {
    return {
      status: 'planned',
      detail: runtime.scheduleDetail,
    }
  }

  if (runtime.due && latestRun?.status !== 'failed') {
    return {
      status: 'pending',
      detail: runtime.scheduleDetail,
    }
  }

  if (!latestRun) {
    return {
      status: 'pending',
      detail: 'Registered, but no run has been recorded yet.',
    }
  }

  if (latestRun.status === 'succeeded') {
    return {
      status: 'live',
      detail: runtime.scheduleDetail || (latestRun.finishedAt ? `Last succeeded ${latestRun.finishedAt}.` : 'Last run succeeded.'),
    }
  }

  return {
    status: 'risk',
    detail: latestRun.errorMessage || `Last run ${latestRun.status}.`,
  }
}

function mapFoundationJobControlRow(row) {
  return {
    jobKey: row.job_key,
    runtimeMode: row.runtime_mode || null,
    enabled: row.enabled,
    scheduleEveryMinutes: row.schedule_every_minutes == null ? null : Number(row.schedule_every_minutes),
    pauseReason: row.pause_reason || null,
    updatedBy: row.updated_by || null,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
  }
}

function applyFoundationJobControl(job, control) {
  if (!control) return job
  return {
    ...job,
    enabled: typeof control.enabled === 'boolean' ? control.enabled : job.enabled,
    runtimeMode: control.runtimeMode || job.runtimeMode,
    scheduleEveryMinutes: control.scheduleEveryMinutes ?? job.scheduleEveryMinutes,
    pauseReason: control.pauseReason,
    controlUpdatedBy: control.updatedBy,
    controlUpdatedAt: control.updatedAt,
  }
}

function mapFoundationRuntimeStatusRow(row) {
  if (!row) return null
  return {
    serviceKey: row.service_key,
    serviceLabel: row.service_label,
    status: row.status,
    startedAt: row.started_at,
    processId: row.process_id,
    runningCommit: row.running_commit,
    runningShortCommit: row.running_short_commit,
    capturedAt: row.captured_at,
    checkName: row.check_name,
    restartCommand: row.restart_command,
    plainEnglish: row.plain_english,
    metadata: row.metadata || {},
    updatedAt: row.updated_at,
  }
}

async function getFoundationJobScheduleIndex() {
  const controls = await getFoundationJobControls()
  const latestResult = await pool.query(
    `
      SELECT DISTINCT ON (job_key)
             run_id, job_key, title, job_type, status, command, requested_by,
             started_at, finished_at, duration_ms, exit_code, signal,
             output_tail, error_message, metadata, created_at, updated_at
      FROM foundation_job_runs
      ORDER BY job_key, created_at DESC
    `
  )

  const latestByJob = new Map()
  for (const row of latestResult.rows) {
    const run = mapFoundationJobRunRow(row)
    latestByJob.set(run.jobKey, run)
  }

  const now = new Date()
  return new Map(getFoundationJobDefinitions().map(baseJob => {
    const job = applyFoundationJobControl(baseJob, controls.get(baseJob.key))
    const latestRun = latestByJob.get(job.key) || null
    const runtime = getFoundationJobRuntime(job, latestRun, now)
    const latestRunAt = latestRun?.finishedAt || latestRun?.startedAt || latestRun?.createdAt || null
    return [
      job.key,
      {
        jobKey: job.key,
        title: job.title,
        enabled: job.enabled,
        runtimeMode: runtime.runtimeMode,
        scheduleEveryMinutes: job.scheduleEveryMinutes ?? null,
        scheduleStatus: runtime.scheduleStatus,
        scheduleDetail: runtime.scheduleDetail,
        mutationPosture: job.mutationPosture,
        scheduleMutationGuard: runtime.scheduleMutationGuard || job.scheduleMutationGuard || null,
        due: runtime.due,
        nextRunAt: runtime.nextRunAt,
        latestRunStatus: latestRun?.status || null,
        latestRunAt,
      },
    ]
  }))
}

async function getFoundationJobControls() {
  const result = await pool.query(
    `
      SELECT job_key, runtime_mode, enabled, schedule_every_minutes,
             pause_reason, updated_by, updated_at
      FROM foundation_job_controls
      ORDER BY job_key ASC
    `
  )
  return new Map(result.rows.map(row => [row.job_key, mapFoundationJobControlRow(row)]))
}

async function getFoundationJobControl(jobKey) {
  const normalizedJobKey = String(jobKey || '').trim()
  if (!normalizedJobKey) throw new Error('jobKey is required.')
  const result = await pool.query(
    `
      SELECT job_key, runtime_mode, enabled, schedule_every_minutes,
             pause_reason, updated_by, updated_at
      FROM foundation_job_controls
      WHERE job_key = $1
      LIMIT 1
    `,
    [normalizedJobKey]
  )
  return result.rows[0] ? mapFoundationJobControlRow(result.rows[0]) : null
}

async function recordFoundationRuntimeStatus(input = {}) {
  const serviceKey = String(input.serviceKey || '').trim()
  if (!serviceKey) throw new Error('serviceKey is required.')
  const serviceLabel = String(input.serviceLabel || serviceKey).trim()
  const status = String(input.status || 'unknown').trim()
  const checkName = String(input.checkName || 'served-code-equals-HEAD').trim()
  const restartCommand = String(input.restartCommand || '').trim()
  const plainEnglish = String(input.plainEnglish || '').trim()
  if (!plainEnglish) throw new Error('plainEnglish is required.')
  if (!restartCommand) throw new Error('restartCommand is required.')
  const result = await pool.query(
    `
      INSERT INTO foundation_runtime_status (
        service_key, service_label, status, started_at, process_id,
        running_commit, running_short_commit, captured_at, check_name,
        restart_command, plain_english, metadata, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8,$9,$10,$11,NOW())
      ON CONFLICT (service_key) DO UPDATE
      SET service_label = EXCLUDED.service_label,
          status = EXCLUDED.status,
          started_at = EXCLUDED.started_at,
          process_id = EXCLUDED.process_id,
          running_commit = EXCLUDED.running_commit,
          running_short_commit = EXCLUDED.running_short_commit,
          captured_at = EXCLUDED.captured_at,
          check_name = EXCLUDED.check_name,
          restart_command = EXCLUDED.restart_command,
          plain_english = EXCLUDED.plain_english,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      RETURNING *
    `,
    [
      serviceKey,
      serviceLabel,
      status,
      input.startedAt || null,
      Number.isFinite(Number(input.processId)) ? Number(input.processId) : null,
      input.runningCommit || null,
      input.runningShortCommit || null,
      checkName,
      restartCommand,
      plainEnglish,
      JSON.stringify(input.metadata || {}),
    ]
  )
  return mapFoundationRuntimeStatusRow(result.rows[0])
}

async function getFoundationRuntimeStatus(serviceKey) {
  const result = await pool.query(
    `
      SELECT *
      FROM foundation_runtime_status
      WHERE service_key = $1
    `,
    [serviceKey]
  )
  return mapFoundationRuntimeStatusRow(result.rows[0])
}

async function getFoundationJobRunSnapshot({ limit = 30, includeOutput = false } = {}) {
  const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 30))
  const generatedAt = new Date().toISOString()
  const controls = await getFoundationJobControls()
  const recentResult = await pool.query(
    `
      SELECT run_id, job_key, title, job_type, status, command, requested_by,
             started_at, finished_at, duration_ms, exit_code, signal,
             output_tail, error_message, metadata, created_at, updated_at
      FROM foundation_job_runs
      ORDER BY created_at DESC
      LIMIT $1
    `,
    [normalizedLimit]
  )
  const latestResult = await pool.query(
    `
      SELECT DISTINCT ON (job_key)
             run_id, job_key, title, job_type, status, command, requested_by,
             started_at, finished_at, duration_ms, exit_code, signal,
             output_tail, error_message, metadata, created_at, updated_at
      FROM foundation_job_runs
      ORDER BY job_key, created_at DESC
    `
  )

  const latestRuns = recentResult.rows.map(row => mapFoundationJobRunRow(row, { includeOutput }))
  const latestByJob = new Map()
  for (const row of latestResult.rows) {
    const run = mapFoundationJobRunRow(row, { includeOutput })
    latestByJob.set(run.jobKey, run)
  }

  const now = new Date()
  const jobs = getFoundationJobDefinitions().map(baseJob => {
    const job = applyFoundationJobControl(baseJob, controls.get(baseJob.key))
    const latestRun = latestByJob.get(job.key) || null
    const health = getFoundationJobHealth(job, latestRun)
    const runtime = getFoundationJobRuntime(job, latestRun, now)
    return {
      ...job,
      status: health.status,
      statusDetail: health.detail,
      runtimeMode: runtime.runtimeMode,
      scheduleStatus: runtime.scheduleStatus,
      scheduleDetail: runtime.scheduleDetail,
      mutationPosture: job.mutationPosture,
      scheduleMutationGuard: runtime.scheduleMutationGuard || job.scheduleMutationGuard || null,
      due: runtime.due,
      nextRunAt: runtime.nextRunAt,
      latestRun,
    }
  })

  return {
    generatedAt,
    totalJobs: jobs.length,
    enabledJobs: jobs.filter(job => job.enabled).length,
    scheduledJobs: jobs.filter(job => job.runtimeMode === 'scheduled').length,
    dueJobs: jobs.filter(job => job.due).length,
    manualJobs: jobs.filter(job => job.runtimeMode === 'manual').length,
    workerReliability: buildFoundationWorkerReliabilitySnapshot({
      jobs,
      latestRuns,
      generatedAt,
    }),
    jobs,
    latestRuns,
  }
}

async function getFoundationJobRunById(runId, { includeOutput = false } = {}) {
  const normalizedRunId = String(runId || '').trim()
  if (!normalizedRunId) throw new Error('runId is required.')
  const result = await pool.query(
    `
      SELECT run_id, job_key, title, job_type, status, command, requested_by,
             started_at, finished_at, duration_ms, exit_code, signal,
             output_tail, error_message, metadata, created_at, updated_at
      FROM foundation_job_runs
      WHERE run_id = $1
      LIMIT 1
    `,
    [normalizedRunId]
  )
  return result.rows[0] ? mapFoundationJobRunRow(result.rows[0], { includeOutput }) : null
}

async function updateFoundationJobControl(jobKey, input = {}, actor = 'system') {
  const normalizedJobKey = String(jobKey || '').trim()
  if (!normalizedJobKey) throw new Error('jobKey is required.')

  const allowedModes = new Set(['scheduled', 'manual', 'paused', 'decommissioned'])
  const runtimeMode = input.runtimeMode == null || input.runtimeMode === ''
    ? null
    : String(input.runtimeMode)
  if (runtimeMode && !allowedModes.has(runtimeMode)) {
    throw new Error(`Invalid runtime mode: ${runtimeMode}`)
  }

  const enabled = typeof input.enabled === 'boolean' ? input.enabled : null
  const scheduleEveryMinutes = input.scheduleEveryMinutes == null || input.scheduleEveryMinutes === ''
    ? null
    : Number(input.scheduleEveryMinutes)
  if (scheduleEveryMinutes != null && (!Number.isFinite(scheduleEveryMinutes) || scheduleEveryMinutes <= 0)) {
    throw new Error('scheduleEveryMinutes must be a positive number when provided.')
  }
  const pauseReason = input.pauseReason == null ? null : String(input.pauseReason).trim()

  return withFoundationTransaction(async client => {
    const result = await client.query(
      `
        INSERT INTO foundation_job_controls (
          job_key, runtime_mode, enabled, schedule_every_minutes,
          pause_reason, updated_by, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,NOW())
        ON CONFLICT (job_key) DO UPDATE SET
          runtime_mode = EXCLUDED.runtime_mode,
          enabled = EXCLUDED.enabled,
          schedule_every_minutes = EXCLUDED.schedule_every_minutes,
          pause_reason = EXCLUDED.pause_reason,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
        RETURNING job_key, runtime_mode, enabled, schedule_every_minutes,
                  pause_reason, updated_by, updated_at
      `,
      [
        normalizedJobKey,
        runtimeMode,
        enabled,
        scheduleEveryMinutes,
        pauseReason,
        actor,
      ]
    )

    await insertChangeEvent(client, {
      eventType: 'foundation_job_control_updated',
      entityTable: 'foundation_job_controls',
      entityId: normalizedJobKey,
      actor,
      summary: `${normalizedJobKey} control updated`,
      metadata: {
        jobKey: normalizedJobKey,
        runtimeMode,
        enabled,
        scheduleEveryMinutes,
        pauseReason,
      },
    })

    return mapFoundationJobControlRow(result.rows[0])
  })
}

async function updateFoundationJobRunMetadata(runId, metadataPatch = {}, actor = 'system') {
  const normalizedRunId = String(runId || '').trim()
  if (!normalizedRunId) throw new Error('runId is required.')
  const result = await withFoundationTransaction(async client => {
    const updateResult = await client.query(
      `
        UPDATE foundation_job_runs
        SET metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
            updated_at = NOW()
        WHERE run_id = $1
        RETURNING run_id, job_key, title, job_type, status, command, requested_by,
                  started_at, finished_at, duration_ms, exit_code, signal,
                  output_tail, error_message, metadata, created_at, updated_at
      `,
      [normalizedRunId, JSON.stringify(metadataPatch || {})]
    )
    if (!updateResult.rows[0]) {
      throw new Error(`Foundation job run not found: ${normalizedRunId}`)
    }

    await insertChangeEvent(client, {
      eventType: 'job_run_process_metadata_updated',
      entityTable: 'foundation_job_runs',
      entityId: normalizedRunId,
      actor,
      summary: `${normalizedRunId} process metadata updated`,
      metadata: {
        runId: normalizedRunId,
        metadataKeys: Object.keys(metadataPatch || {}),
      },
    })

    return mapFoundationJobRunRow(updateResult.rows[0], { includeOutput: true })
  })

  return result
}

async function createFoundationJobRun(input, actor = 'system') {
  if (!input.runId || !input.jobKey || !input.title || !input.jobType || !input.command) {
    throw new Error('runId/jobKey/title/jobType/command are required for Foundation job runs.')
  }

  return withFoundationTransaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [input.jobKey])

    let result
    try {
      result = await client.query(
        `
          INSERT INTO foundation_job_runs (
            run_id, job_key, title, job_type, status, command, requested_by,
            started_at, metadata
          )
          VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9::jsonb)
          RETURNING run_id, job_key, title, job_type, status, command, requested_by,
                    started_at, finished_at, duration_ms, exit_code, signal,
                    output_tail, error_message, metadata, created_at, updated_at
        `,
        [
          input.runId,
          input.jobKey,
          input.title,
          input.jobType,
          input.status || 'running',
          JSON.stringify(input.command || {}),
          actor,
          input.startedAt || new Date().toISOString(),
          JSON.stringify(input.metadata || {}),
        ]
      )
    } catch (error) {
      if (error?.code === '23505' && String(error.constraint || '').includes('foundation_job_runs_active')) {
        throw new Error(`Foundation job already has an active run: ${input.jobKey}`)
      }
      throw error
    }

    await insertChangeEvent(client, {
      eventType: 'job_run_started',
      entityTable: 'foundation_job_runs',
      entityId: input.runId,
      actor,
      summary: `${input.title} started`,
      metadata: {
        jobKey: input.jobKey,
        jobType: input.jobType,
      },
    })

    return mapFoundationJobRunRow(result.rows[0], { includeOutput: true })
  })
}

async function finishFoundationJobRun(runId, input, actor = 'system') {
  const normalizedRunId = String(runId || '').trim()
  if (!normalizedRunId) throw new Error('runId is required to finish a Foundation job run.')

  const status = input.status === 'succeeded' ? 'succeeded' : input.status === 'cancelled' ? 'cancelled' : 'failed'
  const finishedAt = input.finishedAt || new Date().toISOString()
  const result = await withFoundationTransaction(async client => {
    const updateResult = await client.query(
      `
        UPDATE foundation_job_runs
        SET status = $2,
            finished_at = $3,
            duration_ms = $4,
            exit_code = $5,
            signal = $6,
            output_tail = $7,
            error_message = $8,
            metadata = COALESCE(metadata, '{}'::jsonb) || $9::jsonb,
            updated_at = NOW()
        WHERE run_id = $1
        RETURNING run_id, job_key, title, job_type, status, command, requested_by,
                  started_at, finished_at, duration_ms, exit_code, signal,
                  output_tail, error_message, metadata, created_at, updated_at
      `,
      [
        normalizedRunId,
        status,
        finishedAt,
        input.durationMs ?? null,
        input.exitCode ?? null,
        input.signal ?? null,
        input.outputTail || '',
        input.errorMessage || null,
        JSON.stringify(input.metadata || {}),
      ]
    )

    if (!updateResult.rows[0]) {
      throw new Error(`Foundation job run not found: ${normalizedRunId}`)
    }

    const row = updateResult.rows[0]
    await insertChangeEvent(client, {
      eventType: status === 'succeeded' ? 'job_run_succeeded' : 'job_run_failed',
      entityTable: 'foundation_job_runs',
      entityId: normalizedRunId,
      actor,
      summary: `${row.title} ${status}`,
      metadata: {
        jobKey: row.job_key,
        jobType: row.job_type,
        durationMs: row.duration_ms,
        exitCode: row.exit_code,
        signal: row.signal,
      },
    })

    return mapFoundationJobRunRow(row, { includeOutput: true })
  })

  return result
}

async function markFoundationJobRunStopped(runId, input = {}, actor = 'system') {
  const normalizedRunId = String(runId || '').trim()
  if (!normalizedRunId) throw new Error('runId is required to stop a Foundation job run.')

  return finishFoundationJobRun(
    normalizedRunId,
    {
      status: 'cancelled',
      finishedAt: input.finishedAt || new Date().toISOString(),
      durationMs: input.durationMs ?? null,
      exitCode: input.exitCode ?? null,
      signal: input.signal || 'SIGTERM',
      outputTail: input.outputTail || '',
      errorMessage: input.errorMessage || 'Stopped by runtime process-control guard.',
      metadata: {
        stoppedBy: actor,
        stoppedAt: input.finishedAt || new Date().toISOString(),
        stopReason: input.reason || '',
        stopDecision: input.stopDecision || {},
      },
    },
    actor,
  )
}

async function markStaleFoundationJobRuns({ olderThanMinutes = 180 } = {}, actor = 'system') {
  const normalizedMinutes = Math.max(30, Math.min(24 * 60, Number(olderThanMinutes) || 180))
  return withFoundationTransaction(async client => {
    const result = await client.query(
      `
        UPDATE foundation_job_runs
        SET status = 'failed',
            finished_at = NOW(),
            duration_ms = GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NOW() - COALESCE(started_at, created_at))) * 1000))::integer,
            error_message = COALESCE(NULLIF(error_message, ''), 'Marked failed by stale active-run reaper.'),
            metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
              'staleReapedBy', $2::text,
              'staleReapedAt', NOW(),
              'staleThresholdMinutes', $1::int
            ),
            updated_at = NOW()
        WHERE status IN ('queued', 'running')
          AND COALESCE(started_at, created_at) < NOW() - ($1::int * INTERVAL '1 minute')
        RETURNING run_id, job_key, title, job_type, status, command, requested_by,
                  started_at, finished_at, duration_ms, exit_code, signal,
                  output_tail, error_message, metadata, created_at, updated_at
      `,
      [normalizedMinutes, actor]
    )

    for (const row of result.rows) {
      await insertChangeEvent(client, {
        eventType: 'job_run_failed',
        entityTable: 'foundation_job_runs',
        entityId: row.run_id,
        actor,
        summary: `${row.title} marked failed after stale active run`,
        metadata: {
          jobKey: row.job_key,
          staleThresholdMinutes: normalizedMinutes,
        },
      })
    }

    return result.rows.map(row => mapFoundationJobRunRow(row, { includeOutput: true }))
  })
}

  return {
    getFoundationJobScheduleIndex,
    getFoundationJobControl,
    recordFoundationRuntimeStatus,
    getFoundationRuntimeStatus,
    getFoundationJobRunSnapshot,
    getFoundationJobRunById,
    updateFoundationJobControl,
    updateFoundationJobRunMetadata,
    createFoundationJobRun,
    finishFoundationJobRun,
    markFoundationJobRunStopped,
    markStaleFoundationJobRuns,
  }
}
