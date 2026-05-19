import { createHash, randomUUID } from 'node:crypto'
import { createFoundationSourceCrawlStore } from './foundation-source-crawl-store.js'

export const CRAWL_RUN_LEDGER_CARD_ID = 'CRAWL-RUN-LEDGER-001'
export const CRAWL_RUN_LEDGER_SPRINT_ID = 'crawl-run-ledger-reconcile-2026-05-16'
export const CRAWL_RUN_LEDGER_CLOSEOUT_KEY = 'crawl-run-ledger-reconcile-v1'
export const CRAWL_RUN_LEDGER_PLAN_PATH = 'docs/process/crawl-run-ledger-001-plan.md'
export const CRAWL_RUN_LEDGER_APPROVAL_PATH = 'docs/process/approvals/CRAWL-RUN-LEDGER-001.json'
export const CRAWL_RUN_LEDGER_SCRIPT_PATH = 'scripts/process-crawl-run-ledger-check.mjs'
export const CRAWL_RUN_LEDGER_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-16-crawl-run-ledger-reconcile-closeout.md'

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function includesAll(text = '', patterns = []) {
  return patterns.every(pattern => String(text || '').includes(pattern))
}

function summary(checks) {
  return {
    total: checks.length,
    passed: checks.filter(check => check.ok).length,
    failed: checks.filter(check => !check.ok).length,
  }
}

export function shortHash(value = '') {
  return createHash('sha256').update(String(value)).digest('hex').slice(0, 12)
}

export function evaluateCrawlRunLedgerSources({
  sourceCrawlStoreSource = '',
  extractionTargetSource = '',
  currentPlan = '',
  currentState = '',
  packageSource = '',
  proofScriptSource = '',
} = {}) {
  const checks = []
  addCheck(
    checks,
    includesAll(sourceCrawlStoreSource, [
      'source_crawl_target_runs',
      'makeSourceCrawlRunId',
      'INSERT INTO source_crawl_target_runs',
      'crawlRunId: runId',
      'finishSourceCrawlTargetRun',
      'requestedRunId',
      'idempotentFinish',
    ]),
    'source-crawl store owns target-run ledger lease and finish behavior',
    'run table insert, crawlRunId return, finish-by-run-id, and idempotent finish markers are present',
  )
  addCheck(
    checks,
    includesAll(extractionTargetSource, [
      'leasedTarget.crawlRunId',
      '--crawlRunId=${leasedTarget.crawlRunId}',
      'runId: leasedTarget.crawlRunId',
      'sourceCrawlRunId: leasedTarget.crawlRunId',
      'recordExtractionIntelligenceJob',
    ]),
    'target runner propagates crawlRunId into child scripts and intelligence ledger',
    'target runner passes crawlRunId to extraction scripts, target finish, and intelligence job record',
  )
  addCheck(
    checks,
    includesAll(currentPlan, ['crawlRunId', 'source_crawl_target_runs']) &&
      includesAll(currentState, ['crawlRunId', 'source_crawl_target_runs']),
    'current plan/state record source crawl run-ledger truth',
    'docs mention run table and crawlRunId propagation',
  )
  addCheck(
    checks,
    packageSource.includes(`"process:crawl-run-ledger-check": "node --env-file-if-exists=.env ${CRAWL_RUN_LEDGER_SCRIPT_PATH}"`) &&
      proofScriptSource.includes('buildCrawlRunLedgerDogfoodProof') &&
      proofScriptSource.includes('focused proof script is read-only'),
    'focused proof is package-wired and owns dogfood checks',
    CRAWL_RUN_LEDGER_SCRIPT_PATH,
  )
  return {
    ok: checks.every(check => check.ok),
    checks,
    summary: summary(checks),
  }
}

function makeLedgerFakePool({ disableRunInsert = false, disableFinishLookup = false } = {}) {
  const state = {
    target: {
      target_key: 'synthetic-target',
      source_id: 'SRC-SYNTHETIC-001',
      title: 'Synthetic source crawl target',
      lane: 'current_day_sync',
      target_type: 'synthetic',
      status: 'active',
      priority: 'P1',
      runtime_mode: 'scheduled',
      cursor_state: {},
      budget: { maxItemsPerRun: 2 },
      dedupe_policy: {},
      lease_owner: null,
      lease_expires_at: null,
      last_run_at: null,
      next_run_at: null,
      last_status: null,
      last_error: null,
      inspected_count: 0,
      archived_count: 0,
      extracted_count: 0,
      metadata: { foundationJobKey: 'synthetic-job' },
      notes: 'synthetic',
      updated_by: 'synthetic',
      created_at: '2026-05-16T08:00:00.000Z',
      updated_at: '2026-05-16T08:00:00.000Z',
    },
    run: null,
  }
  const calls = []
  return {
    calls,
    state,
    async query(sql, params = []) {
      const text = String(sql)
      calls.push({ sql: text, params })
      if (/SELECT pg_advisory_xact_lock/.test(text)) return { rows: [] }
      if (/INSERT INTO change_events/.test(text)) return { rows: [] }
      if (/UPDATE source_crawl_targets/.test(text) && /last_status = 'leased'/.test(text)) {
        state.target = {
          ...state.target,
          lease_owner: params[1],
          lease_expires_at: '2026-05-16T08:15:00.000Z',
          last_status: 'leased',
          last_error: null,
          updated_by: params[1],
        }
        return { rows: [state.target] }
      }
      if (/INSERT INTO source_crawl_target_runs/.test(text)) {
        if (disableRunInsert) return { rows: [] }
        state.run = {
          run_id: params[0],
          target_key: params[1],
          source_id: params[2],
          status: 'running',
          lease_owner: params[3],
          lease_expires_at: params[4],
          started_at: '2026-05-16T08:00:00.000Z',
          finished_at: null,
          next_run_at: null,
          last_error: null,
          inspected_delta: 0,
          archived_delta: 0,
          extracted_delta: 0,
          metadata: JSON.parse(params[5] || '{}'),
          created_at: '2026-05-16T08:00:00.000Z',
          updated_at: '2026-05-16T08:00:00.000Z',
        }
        return { rows: [state.run] }
      }
      if (/SELECT run_id\s+FROM source_crawl_target_runs/.test(text)) {
        const requestedRunId = params[2]
        if (
          state.run &&
          state.run.status === 'running' &&
          state.run.target_key === params[0] &&
          state.run.lease_owner === params[1] &&
          (!requestedRunId || state.run.run_id === requestedRunId)
        ) {
          return { rows: [{ run_id: state.run.run_id }] }
        }
        return { rows: [] }
      }
      if (/FROM source_crawl_target_runs/.test(text) && /status IN/.test(text)) {
        if (
          !disableFinishLookup &&
          state.run &&
          ['succeeded', 'partial', 'failed', 'skipped'].includes(state.run.status) &&
          state.run.run_id === params[0] &&
          state.run.target_key === params[1] &&
          state.run.lease_owner === params[2]
        ) {
          return { rows: [state.run] }
        }
        return { rows: [] }
      }
      if (/UPDATE source_crawl_targets/.test(text) && /lease_owner = NULL/.test(text)) {
        if (state.target.target_key !== params[0] || state.target.lease_owner !== params[13]) return { rows: [] }
        state.target = {
          ...state.target,
          lease_owner: null,
          lease_expires_at: null,
          status: params[11] || state.target.status,
          runtime_mode: params[12] || state.target.runtime_mode,
          last_run_at: params[1],
          next_run_at: params[2],
          last_status: params[3],
          last_error: params[4],
          inspected_count: Number(state.target.inspected_count || 0) + Number(params[5] || 0),
          archived_count: Number(state.target.archived_count || 0) + Number(params[6] || 0),
          extracted_count: Number(state.target.extracted_count || 0) + Number(params[7] || 0),
          cursor_state: { ...state.target.cursor_state, ...JSON.parse(params[8] || '{}') },
          metadata: { ...state.target.metadata, ...JSON.parse(params[9] || '{}') },
          updated_by: params[10],
        }
        return { rows: [state.target] }
      }
      if (/UPDATE source_crawl_target_runs/.test(text) && /SET status = \$2/.test(text)) {
        if (!state.run || state.run.run_id !== params[0]) return { rows: [] }
        state.run = {
          ...state.run,
          status: params[1],
          finished_at: params[2],
          next_run_at: params[3],
          last_error: params[4],
          inspected_delta: Number(params[5] || 0),
          archived_delta: Number(params[6] || 0),
          extracted_delta: Number(params[7] || 0),
          metadata: { ...state.run.metadata, ...JSON.parse(params[8] || '{}') },
          updated_at: '2026-05-16T08:01:00.000Z',
        }
        return { rows: [state.run] }
      }
      if (/FROM source_crawl_targets/.test(text)) return { rows: [state.target] }
      return { rows: [] }
    },
  }
}

async function runLedgerStoreRoundTrip(options = {}) {
  const fakePool = makeLedgerFakePool(options)
  const fakeClient = { query: (...args) => fakePool.query(...args) }
  const store = createFoundationSourceCrawlStore({
    pool: fakePool,
    withFoundationTransaction: async work => work(fakeClient),
    insertChangeEvent: async () => null,
    getFoundationJobScheduleIndex: async () => new Map(),
  })
  const leaseOwner = `synthetic-worker-${randomUUID().slice(0, 6)}`
  const leased = await store.leaseSourceCrawlTarget('synthetic-target', {
    leaseOwner,
    leaseSeconds: 120,
    force: true,
  })
  const finished = await store.finishSourceCrawlTargetRun('synthetic-target', {
    runId: leased.crawlRunId,
    leaseOwner,
    lastRunAt: '2026-05-16T08:01:00.000Z',
    nextRunAt: '2026-05-16T09:01:00.000Z',
    lastStatus: 'succeeded',
    inspectedDelta: 3,
    archivedDelta: 2,
    extractedDelta: 1,
    cursorState: { pageToken: 'next-page' },
    metadata: { proof: 'crawl-run-ledger' },
  }, leaseOwner)
  const repeatedFinish = await store.finishSourceCrawlTargetRun('synthetic-target', {
    runId: leased.crawlRunId,
    leaseOwner,
    lastStatus: 'succeeded',
  }, leaseOwner)
  return {
    ok: typeof leased.crawlRunId === 'string' &&
      leased.crawlRunId.startsWith('crawl-synthetic-target-') &&
      leased.crawlRun?.status === 'running' &&
      finished.crawlRunId === leased.crawlRunId &&
      finished.crawlRun?.status === 'succeeded' &&
      Number(finished.crawlRun?.inspectedDelta) === 3 &&
      Number(finished.crawlRun?.archivedDelta) === 2 &&
      Number(finished.crawlRun?.extractedDelta) === 1 &&
      repeatedFinish.idempotentFinish === true &&
      repeatedFinish.crawlRunId === leased.crawlRunId,
    leasedRunId: leased.crawlRunId || null,
    finishedStatus: finished.crawlRun?.status || null,
    idempotentFinish: repeatedFinish.idempotentFinish === true,
    callHash: shortHash(JSON.stringify(fakePool.calls.map(call => call.sql.replace(/\s+/g, ' ').trim()))),
  }
}

export async function buildCrawlRunLedgerDogfoodProof() {
  const healthy = await runLedgerStoreRoundTrip()
  const missingRunInsert = await runLedgerStoreRoundTrip({ disableRunInsert: true }).catch(error => ({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }))
  const missingIdempotentFinish = await runLedgerStoreRoundTrip({ disableFinishLookup: true }).catch(error => ({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }))
  return {
    ok: healthy.ok === true &&
      missingRunInsert.ok === false &&
      missingIdempotentFinish.ok === false,
    healthy,
    rejected: {
      missingRunInsert,
      missingIdempotentFinish,
    },
    dogfoodInvariant: 'Healthy source-crawl target lease/finish/idempotent finish passes; missing target-run insert or missing idempotent finish lookup fails closed.',
  }
}
