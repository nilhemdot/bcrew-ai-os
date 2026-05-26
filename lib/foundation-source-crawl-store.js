import { randomUUID } from 'node:crypto'
import {
  EXTRACTION_RETRY_STATES,
  buildExtractionNextSafeCommand,
  buildExtractionRunHardeningStatus,
  classifyExtractionItemRetry,
  normalizeExtractionRetryPolicy,
} from './extraction-run-hardening.js'
import { buildExtractRetireRunUpdate } from './extract-retire.js'

export const FOUNDATION_SOURCE_CRAWL_STORE_SPLIT_CARD_ID = 'FOUNDATION-DB-MONOLITH-SPLIT-012'
export const FOUNDATION_SOURCE_CRAWL_STORE_SPLIT_SPRINT_ID = 'foundation-db-source-crawl-store-split-2026-05-16'
export const FOUNDATION_SOURCE_CRAWL_STORE_SPLIT_CLOSEOUT_KEY = 'foundation-source-crawl-store-split-v1'
export const FOUNDATION_SOURCE_CRAWL_STORE_SPLIT_PLAN_PATH = 'docs/process/foundation-db-source-crawl-store-split-012-plan.md'
export const FOUNDATION_SOURCE_CRAWL_STORE_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-012.json'
export const FOUNDATION_SOURCE_CRAWL_STORE_SPLIT_SCRIPT_PATH = 'scripts/process-foundation-source-crawl-store-split-check.mjs'
export const FOUNDATION_SOURCE_CRAWL_STORE_PRE_SPLIT_LINES = 8270

const SOURCE_CRAWL_STALE_RUN_MINUTES = 30

function countTextLines(source = '') {
  const text = String(source || '')
  if (!text) return 0
  const newlineCount = (text.match(/\n/g) || []).length
  return newlineCount + (text.endsWith('\n') ? 0 : 1)
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

export function evaluateFoundationSourceCrawlStoreSplit({
  foundationDbSource = '',
  moduleSource = '',
  scriptSource = '',
  planSource = '',
  afterLines = countTextLines(foundationDbSource),
  beforeLines = FOUNDATION_SOURCE_CRAWL_STORE_PRE_SPLIT_LINES,
} = {}) {
  const checks = []
  const normalizedPlanSource = String(planSource || '').toLowerCase()
  addCheck(
    checks,
    moduleSource.includes('export function createFoundationSourceCrawlStore') &&
      moduleSource.includes('async function getStaleSourceCrawlTargetRuns') &&
      moduleSource.includes('async function markStaleSourceCrawlTargetRuns') &&
      moduleSource.includes('async function upsertSourceCrawlTarget') &&
      moduleSource.includes('async function upsertSourceCrawlItem') &&
      moduleSource.includes('async function classifySourceCrawlItemRetries') &&
      moduleSource.includes('async function listDriveContentExtractionQueue') &&
      moduleSource.includes('async function getExtractionControlSnapshot') &&
      moduleSource.includes('async function getExtractionRunHardeningSnapshot'),
    'source-crawl store module owns the extracted public behavior',
    'factory and source-crawl/extraction-control functions present',
  )
  addCheck(
    checks,
    moduleSource.includes('function mapSourceCrawlTargetRow') &&
      moduleSource.includes('function mapSourceCrawlTargetRunRow') &&
      moduleSource.includes('function mapSourceCrawlItemRow') &&
      moduleSource.includes('function buildSourceCrawlTargetCoverage') &&
      moduleSource.includes('function buildSourceCrawlTargetHealthFindings'),
    'source-crawl store module owns row mappers and coverage helpers',
    'target/run/item mappers and coverage helpers present',
  )
  addCheck(
    checks,
    foundationDbSource.includes("./foundation-source-crawl-store.js") &&
      foundationDbSource.includes('createFoundationSourceCrawlStore({') &&
      foundationDbSource.includes('foundationSourceCrawlStore'),
    'foundation-db wires through the dedicated source-crawl store module',
    'store import and instance present',
  )
  addCheck(
    checks,
    foundationDbSource.includes('export const getStaleSourceCrawlTargetRuns = foundationSourceCrawlStore.getStaleSourceCrawlTargetRuns') &&
      foundationDbSource.includes('export const upsertSourceCrawlItem = foundationSourceCrawlStore.upsertSourceCrawlItem') &&
      foundationDbSource.includes('export const getExtractionControlSnapshot = foundationSourceCrawlStore.getExtractionControlSnapshot'),
    'foundation-db keeps stable public source-crawl delegates',
    'delegate exports present',
  )
  addCheck(
    checks,
    !/function\s+mapSourceCrawlTargetRow\s*\(/.test(foundationDbSource) &&
      !/function\s+mapSourceCrawlItemRow\s*\(/.test(foundationDbSource) &&
      !/function\s+buildSourceCrawlTargetHealthFindings\s*\(/.test(foundationDbSource) &&
      !/export\s+async\s+function\s+upsertSourceCrawlItem\s*\(/.test(foundationDbSource) &&
      !/export\s+async\s+function\s+getExtractionControlSnapshot\s*\(/.test(foundationDbSource),
    'foundation-db no longer defines extracted source-crawl behavior inline',
    'inline mapper/function definitions absent',
  )
  addCheck(
    checks,
    scriptSource.includes('dogfood rejects old inline source-crawl ownership') &&
      scriptSource.includes('buildSyntheticFoundationSourceCrawlStoreBehaviorProof') &&
      scriptSource.includes('getPlanCriticRunsByCardIds'),
    'focused proof has dogfood and Plan Critic checks',
    FOUNDATION_SOURCE_CRAWL_STORE_SPLIT_SCRIPT_PATH,
  )
  addCheck(
    checks,
    normalizedPlanSource.includes('split/extraction plan') &&
      normalizedPlanSource.includes('source extraction') &&
      (normalizedPlanSource.includes('stable public exports') || normalizedPlanSource.includes('existing public exports')),
    'plan documents split/extraction posture and no-source-extraction boundary',
    FOUNDATION_SOURCE_CRAWL_STORE_SPLIT_PLAN_PATH,
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

export function createFoundationSourceCrawlStore({
  pool,
  withFoundationTransaction,
  insertChangeEvent,
  getFoundationJobScheduleIndex,
} = {}) {
  if (!pool) throw new Error('Foundation source-crawl store requires a pool.')
  if (typeof withFoundationTransaction !== 'function') throw new Error('Foundation source-crawl store requires withFoundationTransaction.')
  if (typeof insertChangeEvent !== 'function') throw new Error('Foundation source-crawl store requires insertChangeEvent.')
  if (typeof getFoundationJobScheduleIndex !== 'function') throw new Error('Foundation source-crawl store requires getFoundationJobScheduleIndex.')

  function mapSourceCrawlTargetRow(row) {
    return {
      targetKey: row.target_key,
      sourceId: row.source_id,
      title: row.title,
      lane: row.lane,
      targetType: row.target_type,
      status: row.status,
      priority: row.priority,
      runtimeMode: row.runtime_mode,
      cursorState: row.cursor_state || {},
      budget: row.budget || {},
      dedupePolicy: row.dedupe_policy || {},
      leaseOwner: row.lease_owner || null,
      leaseExpiresAt: row.lease_expires_at?.toISOString?.() || row.lease_expires_at || null,
      lastRunAt: row.last_run_at?.toISOString?.() || row.last_run_at || null,
      nextRunAt: row.next_run_at?.toISOString?.() || row.next_run_at || null,
      lastStatus: row.last_status || null,
      lastError: row.last_error || null,
      inspectedCount: Number(row.inspected_count || 0),
      archivedCount: Number(row.archived_count || 0),
      extractedCount: Number(row.extracted_count || 0),
      metadata: row.metadata || {},
      notes: row.notes || '',
      updatedBy: row.updated_by || null,
      createdAt: row.created_at?.toISOString?.() || row.created_at || null,
      updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
    }
  }
  
  function mapSourceCrawlTargetRunRow(row) {
    return {
      runId: row.run_id,
      targetKey: row.target_key,
      sourceId: row.source_id,
      status: row.status,
      leaseOwner: row.lease_owner || null,
      leaseExpiresAt: row.lease_expires_at?.toISOString?.() || row.lease_expires_at || null,
      startedAt: row.started_at?.toISOString?.() || row.started_at || null,
      finishedAt: row.finished_at?.toISOString?.() || row.finished_at || null,
      nextRunAt: row.next_run_at?.toISOString?.() || row.next_run_at || null,
      lastError: row.last_error || null,
      inspectedDelta: Number(row.inspected_delta || 0),
      archivedDelta: Number(row.archived_delta || 0),
      extractedDelta: Number(row.extracted_delta || 0),
      metadata: row.metadata || {},
      createdAt: row.created_at?.toISOString?.() || row.created_at || null,
      updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
    }
  }
  
  function getSourceCrawlRunStaleState(run, thresholdMinutes = SOURCE_CRAWL_STALE_RUN_MINUTES) {
    if (!run || run.status !== 'running') {
      return {
        isStale: false,
        reason: null,
        ageMinutes: null,
        thresholdMinutes,
      }
    }
  
    const nowMs = Date.now()
    const startedMs = Date.parse(run.startedAt || run.createdAt || '')
    const leaseExpiresMs = Date.parse(run.leaseExpiresAt || '')
    const ageMinutes = Number.isFinite(startedMs)
      ? Math.floor((nowMs - startedMs) / 60000)
      : null
    const leaseExpired = Number.isFinite(leaseExpiresMs) && leaseExpiresMs < nowMs
    const olderThanThreshold = ageMinutes != null && ageMinutes >= thresholdMinutes
  
    return {
      isStale: leaseExpired || olderThanThreshold,
      reason: leaseExpired
        ? 'lease_expired'
        : olderThanThreshold
          ? 'running_past_threshold'
          : null,
      ageMinutes,
      thresholdMinutes,
    }
  }
  
  function attachSourceCrawlRunStaleState(run, thresholdMinutes = SOURCE_CRAWL_STALE_RUN_MINUTES) {
    return {
      ...run,
      staleState: getSourceCrawlRunStaleState(run, thresholdMinutes),
    }
  }
  
  function getTargetScheduleFallback(target) {
    const runtimeMode = target.runtimeMode || 'manual'
    const nextRunAt = target.nextRunAt || null
    let scheduleStatus = 'manual'
    let scheduleDetail = 'Manual-only crawl target.'
  
    if (runtimeMode === 'paused') {
      scheduleStatus = 'paused'
      scheduleDetail = 'Paused crawl target.'
    } else if (runtimeMode === 'scheduled') {
      scheduleStatus = nextRunAt ? 'scheduled' : 'scheduled_without_next_run'
      scheduleDetail = nextRunAt
        ? 'Target-level next run is recorded.'
        : 'Target marked scheduled, but no target-level next run is recorded.'
    }
  
    return {
      source: 'target',
      scheduleTruth: 'target',
      foundationJobKey: target.metadata?.foundationJobKey || null,
      jobTitle: null,
      runtimeMode,
      scheduleStatus,
      scheduleDetail,
      due: false,
      nextRunAt,
      crawlCheckpointNextRunAt: nextRunAt,
      latestRunStatus: target.lastStatus || null,
      latestRunAt: target.lastRunAt || null,
    }
  }
  
  function attachSourceCrawlTargetSchedule(target, foundationJobSchedules) {
    const foundationJobKey = target.metadata?.foundationJobKey || null
    // stopped target statuses use target stop-state scheduling even if a Foundation job exists
    const stoppedTarget = ['blocked', 'paused', 'complete'].includes(String(target.status || '').trim()) || target.runtimeMode === 'paused'
    const jobSchedule = foundationJobKey && !stoppedTarget ? foundationJobSchedules.get(foundationJobKey) : null
    const crawlCheckpointNextRunAt = target.nextRunAt || null
    const scheduler = jobSchedule
      ? {
          source: 'foundation_job',
          scheduleTruth: 'foundation_job',
          foundationJobKey,
          jobTitle: jobSchedule.title,
          runtimeMode: jobSchedule.runtimeMode,
          scheduleStatus: jobSchedule.scheduleStatus,
          scheduleDetail: jobSchedule.scheduleDetail,
          due: jobSchedule.due,
          nextRunAt: jobSchedule.nextRunAt,
          crawlCheckpointNextRunAt,
          latestRunStatus: jobSchedule.latestRunStatus,
          latestRunAt: jobSchedule.latestRunAt,
        }
      : getTargetScheduleFallback(target)
  
    return {
      ...target,
      nextRunAt: scheduler.nextRunAt,
      crawlCheckpointNextRunAt,
      foundationJobKey,
      scheduler,
      effectiveRuntimeMode: scheduler.runtimeMode,
      effectiveNextRunAt: scheduler.nextRunAt,
    }
  }
  
  function createEmptySourceCrawlItemSummary(targetKey) {
    return {
      targetKey,
      totalItems: 0,
      pendingItems: 0,
      leasedItems: 0,
      succeededItems: 0,
      failedItems: 0,
      skippedItems: 0,
      retryEligibleItems: 0,
      retryWaitingItems: 0,
      retryExhaustedItems: 0,
      retryBlockedItems: 0,
      staleLeasedItems: 0,
      failedItemsWithoutRetryState: 0,
      last24hItems: 0,
      last24hPendingItems: 0,
      last24hLeasedItems: 0,
      last24hSucceededItems: 0,
      last24hFailedItems: 0,
      last24hSkippedItems: 0,
      latestItemUpdatedAt: null,
      reasons: [],
      retryReasons: [],
    }
  }
  
  async function getSourceCrawlTargetItemSummaries(targetKeys = []) {
    const normalizedTargetKeys = Array.from(new Set(
      (targetKeys || []).map(targetKey => String(targetKey || '').trim()).filter(Boolean)
    ))
    const summaries = new Map(normalizedTargetKeys.map(targetKey => [
      targetKey,
      createEmptySourceCrawlItemSummary(targetKey),
    ]))
    if (!normalizedTargetKeys.length) return summaries
  
    const result = await pool.query(
      `
        SELECT target_key,
               status,
               retry_state,
               COALESCE(
                 NULLIF(metadata->>'reason', ''),
                 NULLIF(metadata->>'skipReason', ''),
                 NULLIF(metadata->>'contentExtractionStatus', ''),
                 NULLIF(metadata->>'extractionStatus', ''),
                 'unspecified'
               ) AS reason,
               COUNT(*)::integer AS item_count,
               COUNT(*) FILTER (WHERE updated_at >= NOW() - INTERVAL '24 hours')::integer AS item_count_24h,
               MAX(updated_at) AS latest_updated_at
        FROM source_crawl_items
        WHERE target_key = ANY($1::text[])
        GROUP BY target_key, status, retry_state, reason
        ORDER BY target_key ASC, item_count DESC
      `,
      [normalizedTargetKeys]
    )
  
    for (const row of result.rows) {
      const targetKey = row.target_key
      const summary = summaries.get(targetKey) || createEmptySourceCrawlItemSummary(targetKey)
      const count = Number(row.item_count || 0)
      const count24h = Number(row.item_count_24h || 0)
      summary.totalItems += count
      summary.last24hItems += count24h
      if (row.status === 'pending') summary.pendingItems += count
      if (row.status === 'leased') summary.leasedItems += count
      if (row.status === 'succeeded') summary.succeededItems += count
      if (row.status === 'failed') summary.failedItems += count
      if (row.status === 'skipped') summary.skippedItems += count
      if (row.status === 'pending') summary.last24hPendingItems += count24h
      if (row.status === 'leased') summary.last24hLeasedItems += count24h
      if (row.status === 'succeeded') summary.last24hSucceededItems += count24h
      if (row.status === 'failed') summary.last24hFailedItems += count24h
      if (row.status === 'skipped') summary.last24hSkippedItems += count24h
      if (row.retry_state === 'eligible') summary.retryEligibleItems += count
      if (row.retry_state === 'waiting') summary.retryWaitingItems += count
      if (row.retry_state === 'exhausted') summary.retryExhaustedItems += count
      if (row.retry_state === 'blocked') summary.retryBlockedItems += count
      if (row.status === 'leased' && row.retry_state === 'leased') summary.staleLeasedItems += 0
      if (row.status === 'failed' && (!row.retry_state || row.retry_state === 'not_evaluated' || row.retry_state === 'not_retryable')) {
        summary.failedItemsWithoutRetryState += count
      }
      const latest = row.latest_updated_at?.toISOString?.() || row.latest_updated_at || null
      if (!summary.latestItemUpdatedAt || (latest && Date.parse(latest) > Date.parse(summary.latestItemUpdatedAt))) {
        summary.latestItemUpdatedAt = latest
      }
      summary.reasons.push({
        status: row.status,
        reason: row.reason,
        count,
        latestUpdatedAt: latest,
      })
      if (['eligible', 'waiting', 'exhausted', 'blocked'].includes(row.retry_state)) {
        summary.retryReasons.push({
          retryState: row.retry_state,
          reason: row.reason,
          count,
          latestUpdatedAt: latest,
        })
      }
      summaries.set(targetKey, summary)
    }
  
    return summaries
  }
  
  async function getSourceCrawlTargetRunCoverage(targetKeys = []) {
    const normalizedTargetKeys = Array.from(new Set(
      (targetKeys || []).map(targetKey => String(targetKey || '').trim()).filter(Boolean)
    ))
    const coverage = new Map(normalizedTargetKeys.map(targetKey => [
      targetKey,
      {
        targetKey,
        runCount: 0,
        successfulRuns: 0,
        failedRuns: 0,
        runsLast24h: 0,
        successfulRunsLast24h: 0,
        failedRunsLast24h: 0,
        lastSuccessAt: null,
        lastFailureAt: null,
        latestFailureRunId: null,
        latestFailureStatus: null,
        latestFailureError: null,
      },
    ]))
    if (!normalizedTargetKeys.length) return coverage
  
    const [aggregateResult, latestFailureResult] = await Promise.all([
      pool.query(
        `
          SELECT target_key,
                 COUNT(*)::integer AS run_count,
                 COUNT(*) FILTER (WHERE status = 'succeeded')::integer AS successful_runs,
                 COUNT(*) FILTER (WHERE status IN ('failed', 'partial'))::integer AS failed_runs,
                 COUNT(*) FILTER (
                   WHERE COALESCE(finished_at, updated_at, started_at, created_at) >= NOW() - INTERVAL '24 hours'
                 )::integer AS runs_last_24h,
                 COUNT(*) FILTER (
                   WHERE status = 'succeeded'
                     AND COALESCE(finished_at, updated_at, started_at, created_at) >= NOW() - INTERVAL '24 hours'
                 )::integer AS successful_runs_last_24h,
                 COUNT(*) FILTER (
                   WHERE status IN ('failed', 'partial')
                     AND COALESCE(finished_at, updated_at, started_at, created_at) >= NOW() - INTERVAL '24 hours'
                 )::integer AS failed_runs_last_24h,
                 MAX(CASE WHEN status = 'succeeded'
                   THEN COALESCE(finished_at, updated_at, started_at, created_at)
                 END) AS last_success_at,
                 MAX(CASE WHEN status IN ('failed', 'partial')
                   THEN COALESCE(finished_at, updated_at, started_at, created_at)
                 END) AS last_failure_at
          FROM source_crawl_target_runs
          WHERE target_key = ANY($1::text[])
          GROUP BY target_key
        `,
        [normalizedTargetKeys]
      ),
      pool.query(
        `
          SELECT DISTINCT ON (target_key)
                 target_key, run_id, status, last_error,
                 COALESCE(finished_at, updated_at, started_at, created_at) AS occurred_at
          FROM source_crawl_target_runs
          WHERE target_key = ANY($1::text[])
            AND status IN ('failed', 'partial')
          ORDER BY target_key, COALESCE(finished_at, updated_at, started_at, created_at) DESC NULLS LAST
        `,
        [normalizedTargetKeys]
      ),
    ])
  
    for (const row of aggregateResult.rows) {
      const targetKey = row.target_key
      const existing = coverage.get(targetKey) || { targetKey }
      coverage.set(targetKey, {
        ...existing,
        runCount: Number(row.run_count || 0),
        successfulRuns: Number(row.successful_runs || 0),
        failedRuns: Number(row.failed_runs || 0),
        runsLast24h: Number(row.runs_last_24h || 0),
        successfulRunsLast24h: Number(row.successful_runs_last_24h || 0),
        failedRunsLast24h: Number(row.failed_runs_last_24h || 0),
        lastSuccessAt: row.last_success_at?.toISOString?.() || row.last_success_at || null,
        lastFailureAt: row.last_failure_at?.toISOString?.() || row.last_failure_at || null,
      })
    }
  
    for (const row of latestFailureResult.rows) {
      const targetKey = row.target_key
      const existing = coverage.get(targetKey) || { targetKey }
      coverage.set(targetKey, {
        ...existing,
        lastFailureAt: row.occurred_at?.toISOString?.() || row.occurred_at || existing.lastFailureAt || null,
        latestFailureRunId: row.run_id || null,
        latestFailureStatus: row.status || null,
        latestFailureError: row.last_error || null,
      })
    }
  
    return coverage
  }
  
  function buildSourceCrawlReasonCoverage(itemSummary = {}, statuses = ['failed', 'skipped'], limit = 5) {
    const statusOrder = new Map(statuses.map((status, index) => [status, index]))
    return (Array.isArray(itemSummary.reasons) ? itemSummary.reasons : [])
      .filter(reason => statusOrder.has(reason.status) && Number(reason.count || 0) > 0)
      .sort((a, b) => {
        const statusDelta = (statusOrder.get(a.status) ?? 99) - (statusOrder.get(b.status) ?? 99)
        if (statusDelta !== 0) return statusDelta
        return Number(b.count || 0) - Number(a.count || 0)
      })
      .slice(0, limit)
      .map(reason => ({
        status: reason.status,
        reason: reason.reason || 'unspecified',
        count: Number(reason.count || 0),
        latestUpdatedAt: reason.latestUpdatedAt || null,
      }))
  }
  
  function buildSourceCrawlRemainingIndicators(target) {
    const indicators = []
    const itemSummary = target.itemSummary || {}
    const cursorState = target.cursorState || {}
  
    if (Number(itemSummary.pendingItems || 0) > 0) {
      indicators.push({
        label: 'Pending crawl items',
        count: Number(itemSummary.pendingItems || 0),
        detail: 'Rows waiting in source_crawl_items.',
      })
    }
    if (Number(itemSummary.leasedItems || 0) > 0) {
      indicators.push({
        label: 'Leased crawl items',
        count: Number(itemSummary.leasedItems || 0),
        detail: 'Rows currently held by a worker lease.',
      })
    }
  
    const driveInventory = cursorState.driveInventory || {}
    if (Number(driveInventory.queuedFolderCount || 0) > 0) {
      indicators.push({
        label: 'Queued Drive folders',
        count: Number(driveInventory.queuedFolderCount || 0),
        detail: `${Number(driveInventory.inspectedFolderCount || 0)} inspected folders recorded.`,
      })
    }
  
    const pendingReasonIndicators = (Array.isArray(itemSummary.reasons) ? itemSummary.reasons : [])
      .filter(reason =>
        Number(reason.count || 0) > 0 &&
        /pending|queued_for_later|requires_|needs_|not_in_v1/i.test(reason.reason || '')
      )
      .slice(0, 4)
      .map(reason => ({
        label: reason.reason || 'pending work',
        count: Number(reason.count || 0),
        detail: `${reason.status || 'item'} ledger reason.`,
      }))
  
    return [...indicators, ...pendingReasonIndicators].slice(0, 6)
  }
  
  function buildSourceCrawlTargetCoverage(target, runCoverage = {}) {
    const itemSummary = target.itemSummary || createEmptySourceCrawlItemSummary(target.targetKey)
    const scheduler = target.scheduler || {}
    const lastFailureAt = runCoverage.lastFailureAt ||
      (target.lastStatus === 'failed' || target.lastStatus === 'partial' ? target.lastRunAt : null)
    const latestFailureStatus = runCoverage.latestFailureStatus ||
      (target.lastStatus === 'failed' || target.lastStatus === 'partial' ? target.lastStatus : null)
    const latestFailureError = runCoverage.latestFailureError ||
      (target.lastStatus === 'failed' || target.lastStatus === 'partial' ? target.lastError : null)
    const retrySummary = {
      targetKey: target.targetKey,
      retryEligibleItems: Number(itemSummary.retryEligibleItems || 0),
      retryWaitingItems: Number(itemSummary.retryWaitingItems || 0),
      retryExhaustedItems: Number(itemSummary.retryExhaustedItems || 0),
      retryBlockedItems: Number(itemSummary.retryBlockedItems || 0),
      failedItemsWithoutRetryState: Number(itemSummary.failedItemsWithoutRetryState || 0),
      retryReasons: Array.isArray(itemSummary.retryReasons) ? itemSummary.retryReasons.slice(0, 8) : [],
    }
    const nextSafeCommand = buildExtractionNextSafeCommand(target, retrySummary)
    const hardeningStatus =
      retrySummary.failedItemsWithoutRetryState > 0
        ? 'blocked'
        : retrySummary.retryBlockedItems > 0 || retrySummary.retryExhaustedItems > 0
          ? 'blocked'
          : retrySummary.retryEligibleItems > 0 || retrySummary.retryWaitingItems > 0
            ? 'retry_ready'
            : 'healthy'
  
    return {
      targetKey: target.targetKey,
      title: target.title,
      sourceId: target.sourceId,
      lane: target.lane,
      targetType: target.targetType,
      status: target.status,
      priority: target.priority,
      runtimeMode: target.runtimeMode,
      effectiveRuntimeMode: target.effectiveRuntimeMode,
      scheduleStatus: scheduler.scheduleStatus || null,
      scheduleTruth: scheduler.scheduleTruth || null,
      nextBiteAt: scheduler.nextRunAt || target.effectiveNextRunAt || target.nextRunAt || null,
      crawlCheckpointNextRunAt: scheduler.crawlCheckpointNextRunAt || target.crawlCheckpointNextRunAt || null,
      lastRunAt: target.lastRunAt,
      lastStatus: target.lastStatus,
      lastError: target.lastError,
      lastSuccessAt: runCoverage.lastSuccessAt || (target.lastStatus === 'succeeded' ? target.lastRunAt : null),
      lastFailureAt,
      latestFailureRunId: runCoverage.latestFailureRunId || null,
      latestFailureStatus,
      latestFailureError,
      runCount: Number(runCoverage.runCount || 0),
      successfulRuns: Number(runCoverage.successfulRuns || 0),
      failedRuns: Number(runCoverage.failedRuns || 0),
      last24h: {
        runs: Number(runCoverage.runsLast24h || 0),
        successfulRuns: Number(runCoverage.successfulRunsLast24h || 0),
        failedRuns: Number(runCoverage.failedRunsLast24h || 0),
        items: Number(itemSummary.last24hItems || 0),
        succeededItems: Number(itemSummary.last24hSucceededItems || 0),
        skippedItems: Number(itemSummary.last24hSkippedItems || 0),
        failedItems: Number(itemSummary.last24hFailedItems || 0),
        pendingItems: Number(itemSummary.last24hPendingItems || 0),
        leasedItems: Number(itemSummary.last24hLeasedItems || 0),
      },
      counts: {
        inspectedCount: Number(target.inspectedCount || 0),
        archivedCount: Number(target.archivedCount || 0),
        extractedCount: Number(target.extractedCount || 0),
        totalItems: Number(itemSummary.totalItems || 0),
        succeededItems: Number(itemSummary.succeededItems || 0),
        skippedItems: Number(itemSummary.skippedItems || 0),
        failedItems: Number(itemSummary.failedItems || 0),
        pendingItems: Number(itemSummary.pendingItems || 0),
        leasedItems: Number(itemSummary.leasedItems || 0),
      },
      retrySummary,
      nextSafeCommand,
      hardeningStatus,
      topReasons: buildSourceCrawlReasonCoverage(itemSummary),
      remainingBacklogIndicators: buildSourceCrawlRemainingIndicators(target),
      healthFindings: Array.isArray(target.healthFindings) ? target.healthFindings : [],
      budget: target.budget || {},
      notes: target.notes || '',
    }
  }
  
  function buildSourceCrawlTargetHealthFindings(target) {
    const findings = []
    const itemSummary = target.itemSummary || createEmptySourceCrawlItemSummary(target.targetKey)
  
    if (target.lastStatus === 'failed' || target.lastStatus === 'partial') {
      findings.push({
        severity: target.lastStatus === 'failed' ? 'risk' : 'warning',
        type: `latest_target_${target.lastStatus}`,
        detail: `Latest target state is ${target.lastStatus}${target.lastError ? `: ${target.lastError}` : '.'}`,
      })
    }
  
    if (itemSummary.failedItems > 0) {
      findings.push({
        severity: itemSummary.failedItemsWithoutRetryState > 0 ? 'risk' : 'warning',
        type: 'failed_crawl_items',
        detail: `${itemSummary.failedItems} crawl item${itemSummary.failedItems === 1 ? '' : 's'} failed; ${itemSummary.retryEligibleItems || 0} eligible, ${itemSummary.retryWaitingItems || 0} waiting, ${itemSummary.retryExhaustedItems || 0} exhausted, ${itemSummary.retryBlockedItems || 0} blocked.`,
      })
    }
  
    if (itemSummary.skippedItems > 0) {
      findings.push({
        severity: 'info',
        type: 'skipped_crawl_items',
        detail: `${itemSummary.skippedItems} crawl item${itemSummary.skippedItems === 1 ? '' : 's'} are explicitly skipped with reasons.`,
      })
    }
  
    if (target.targetKey === 'slack-current-day' && itemSummary.totalItems === 0) {
      findings.push({
        severity: 'warning',
        type: 'missing_slack_channel_item_proof',
        detail: 'Slack current-day has target runs but no channel-level source_crawl_items yet.',
      })
    }
  
    return findings
  }
  
  function mapSourceCrawlItemRow(row) {
    return {
      itemKey: row.item_key,
      targetKey: row.target_key,
      sourceId: row.source_id,
      externalId: row.external_id,
      itemType: row.item_type,
      status: row.status,
      fingerprint: row.fingerprint || null,
      leaseOwner: row.lease_owner || null,
      leaseExpiresAt: row.lease_expires_at?.toISOString?.() || row.lease_expires_at || null,
      attemptCount: Number(row.attempt_count || 0),
      retryState: row.retry_state || EXTRACTION_RETRY_STATES.NOT_EVALUATED,
      maxAttempts: Number(row.max_attempts || 3),
      nextRetryAt: row.next_retry_at?.toISOString?.() || row.next_retry_at || null,
      lastAttemptedAt: row.last_attempted_at?.toISOString?.() || row.last_attempted_at || null,
      lastSourceCrawlRunId: row.last_source_crawl_run_id || null,
      retryReason: row.retry_reason || null,
      retryBlockerCard: row.retry_blocker_card || null,
      lastError: row.last_error || null,
      artifactId: row.artifact_id || null,
      metadata: row.metadata || {},
      discoveredAt: row.discovered_at?.toISOString?.() || row.discovered_at || null,
      processedAt: row.processed_at?.toISOString?.() || row.processed_at || null,
      updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
    }
  }
  
  function mapSourceCrawlItemAttemptRow(row) {
    return {
      attemptId: row.attempt_id,
      itemKey: row.item_key,
      targetKey: row.target_key,
      sourceId: row.source_id,
      sourceCrawlRunId: row.source_crawl_run_id || null,
      attemptNumber: Number(row.attempt_number || 0),
      status: row.status,
      leaseOwner: row.lease_owner || null,
      startedAt: row.started_at?.toISOString?.() || row.started_at || null,
      finishedAt: row.finished_at?.toISOString?.() || row.finished_at || null,
      nextRetryAt: row.next_retry_at?.toISOString?.() || row.next_retry_at || null,
      errorClass: row.error_class || null,
      errorMessage: row.error_message || null,
      metadata: row.metadata || {},
      createdAt: row.created_at?.toISOString?.() || row.created_at || null,
      updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
    }
  }
  async function getStaleSourceCrawlTargetRuns({ olderThanMinutes = SOURCE_CRAWL_STALE_RUN_MINUTES, limit = 50 } = {}) {
    const normalizedMinutes = Math.max(5, Math.min(24 * 60, Number(olderThanMinutes) || SOURCE_CRAWL_STALE_RUN_MINUTES))
    const normalizedLimit = Math.min(1000, Math.max(1, Number(limit) || 50))
    const result = await pool.query(
      `
        SELECT run_id, target_key, source_id, status, lease_owner, lease_expires_at,
               started_at, finished_at, next_run_at, last_error, inspected_delta,
               archived_delta, extracted_delta, metadata, created_at, updated_at
        FROM source_crawl_target_runs
        WHERE status = 'running'
          AND (
            (lease_expires_at IS NOT NULL AND lease_expires_at < NOW())
            OR started_at < NOW() - ($1::int * INTERVAL '1 minute')
          )
        ORDER BY started_at ASC
        LIMIT $2
      `,
      [normalizedMinutes, normalizedLimit]
    )
  
    return result.rows
      .map(mapSourceCrawlTargetRunRow)
      .map(run => attachSourceCrawlRunStaleState(run, normalizedMinutes))
  }
  
  async function markStaleSourceCrawlTargetRuns({ olderThanMinutes = SOURCE_CRAWL_STALE_RUN_MINUTES, limit = 50 } = {}, actor = 'system') {
    const normalizedMinutes = Math.max(5, Math.min(24 * 60, Number(olderThanMinutes) || SOURCE_CRAWL_STALE_RUN_MINUTES))
    const normalizedLimit = Math.min(200, Math.max(1, Number(limit) || 50))
    return withFoundationTransaction(async client => {
      const result = await client.query(
        `
          WITH selected AS (
            SELECT run_id,
                   CASE
                     WHEN lease_expires_at IS NOT NULL AND lease_expires_at < NOW() THEN 'lease_expired'
                     ELSE 'running_past_threshold'
                   END AS stale_reason
            FROM source_crawl_target_runs
            WHERE status = 'running'
              AND (
                (lease_expires_at IS NOT NULL AND lease_expires_at < NOW())
                OR started_at < NOW() - ($1::int * INTERVAL '1 minute')
              )
            ORDER BY started_at ASC
            LIMIT $3
            FOR UPDATE
          )
          UPDATE source_crawl_target_runs runs
          SET status = 'failed',
              finished_at = NOW(),
              last_error = COALESCE(NULLIF(runs.last_error, ''), 'Marked failed by stale source-crawl run reaper.'),
              metadata = COALESCE(runs.metadata, '{}'::jsonb) || jsonb_build_object(
                'staleReapedBy', $2::text,
                'staleReapedAt', NOW(),
                'staleThresholdMinutes', $1::int,
                'staleReason', selected.stale_reason
              ),
              updated_at = NOW()
          FROM selected
          WHERE runs.run_id = selected.run_id
          RETURNING runs.run_id, runs.target_key, runs.source_id, runs.status, runs.lease_owner,
                    runs.lease_expires_at, runs.started_at, runs.finished_at, runs.next_run_at,
                    runs.last_error, runs.inspected_delta, runs.archived_delta, runs.extracted_delta,
                    runs.metadata, runs.created_at, runs.updated_at
        `,
        [normalizedMinutes, actor, normalizedLimit]
      )
  
      const rows = result.rows.map(row => mapSourceCrawlTargetRunRow(row))
      for (const row of rows) {
        await client.query(
          `
            UPDATE source_crawl_targets
            SET lease_owner = NULL,
                lease_expires_at = NULL,
                last_status = 'failed',
                last_error = COALESCE(NULLIF(last_error, ''), 'Marked failed by stale source-crawl run reaper.'),
                metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                  'staleRunId', $4::text,
                  'staleRunReapedBy', $2::text,
                  'staleRunReapedAt', NOW()
                ),
                updated_by = $2,
                updated_at = NOW()
            WHERE target_key = $1
              AND lease_owner = $3
              AND (
                lease_expires_at IS NULL
                OR lease_expires_at < NOW()
              )
          `,
          [row.targetKey, actor, row.leaseOwner, row.runId]
        )
  
        await insertChangeEvent(client, {
          eventType: 'source_crawl_target_updated',
          entityTable: 'source_crawl_target_runs',
          entityId: row.runId,
          actor,
          summary: `${row.targetKey} source-crawl run marked failed after stale active run`,
          metadata: {
            targetKey: row.targetKey,
            sourceId: row.sourceId,
            staleThresholdMinutes: normalizedMinutes,
            staleReason: row.metadata?.staleReason || 'unknown',
          },
        })
      }
  
      return rows.map(run => attachSourceCrawlRunStaleState(run, normalizedMinutes))
    })
  }
  
  async function upsertSourceCrawlTarget(input, actor = 'system') {
    const targetKey = String(input?.targetKey || '').trim()
    if (!targetKey) throw new Error('targetKey is required.')
  
    return withFoundationTransaction(async client => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`source_crawl_target:${targetKey}`])
  
      const result = await client.query(
        `
          INSERT INTO source_crawl_targets (
            target_key, source_id, title, lane, target_type, status, priority,
            runtime_mode, cursor_state, budget, dedupe_policy, lease_owner,
            lease_expires_at, last_run_at, next_run_at, last_status, last_error,
            inspected_count, archived_count, extracted_count, metadata, notes,
            updated_by, updated_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21::jsonb,$22,$23,NOW())
          ON CONFLICT (target_key) DO UPDATE SET
            source_id = EXCLUDED.source_id,
            title = EXCLUDED.title,
            lane = EXCLUDED.lane,
            target_type = EXCLUDED.target_type,
            status = EXCLUDED.status,
            priority = EXCLUDED.priority,
            runtime_mode = EXCLUDED.runtime_mode,
            cursor_state = COALESCE(source_crawl_targets.cursor_state, '{}'::jsonb) || EXCLUDED.cursor_state,
            budget = COALESCE(source_crawl_targets.budget, '{}'::jsonb) || EXCLUDED.budget,
            dedupe_policy = COALESCE(source_crawl_targets.dedupe_policy, '{}'::jsonb) || EXCLUDED.dedupe_policy,
            lease_owner = EXCLUDED.lease_owner,
            lease_expires_at = EXCLUDED.lease_expires_at,
            last_run_at = COALESCE(EXCLUDED.last_run_at, source_crawl_targets.last_run_at),
            next_run_at = COALESCE(EXCLUDED.next_run_at, source_crawl_targets.next_run_at),
            last_status = COALESCE(EXCLUDED.last_status, source_crawl_targets.last_status),
            last_error = EXCLUDED.last_error,
            inspected_count = GREATEST(source_crawl_targets.inspected_count, EXCLUDED.inspected_count),
            archived_count = GREATEST(source_crawl_targets.archived_count, EXCLUDED.archived_count),
            extracted_count = GREATEST(source_crawl_targets.extracted_count, EXCLUDED.extracted_count),
            metadata = COALESCE(source_crawl_targets.metadata, '{}'::jsonb) || EXCLUDED.metadata,
            notes = EXCLUDED.notes,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
          RETURNING target_key, source_id, title, lane, target_type, status,
                    priority, runtime_mode, cursor_state, budget, dedupe_policy,
                    lease_owner, lease_expires_at, last_run_at, next_run_at,
                    last_status, last_error, inspected_count, archived_count,
                    extracted_count, metadata, notes, updated_by, created_at,
                    updated_at
        `,
        [
          targetKey,
          String(input.sourceId || '').trim(),
          String(input.title || targetKey).trim(),
          String(input.lane || 'backfill').trim(),
          String(input.targetType || 'source').trim(),
          String(input.status || 'planned').trim(),
          String(input.priority || 'P1').trim(),
          String(input.runtimeMode || 'manual').trim(),
          JSON.stringify(input.cursorState || {}),
          JSON.stringify(input.budget || {}),
          JSON.stringify(input.dedupePolicy || {}),
          input.leaseOwner == null ? null : String(input.leaseOwner).trim(),
          input.leaseExpiresAt || null,
          input.lastRunAt || null,
          input.nextRunAt || null,
          input.lastStatus == null ? null : String(input.lastStatus).trim(),
          input.lastError == null ? null : String(input.lastError).trim(),
          Number(input.inspectedCount || 0),
          Number(input.archivedCount || 0),
          Number(input.extractedCount || 0),
          JSON.stringify(input.metadata || {}),
          input.notes == null ? null : String(input.notes).trim(),
          actor,
        ]
      )
  
      await insertChangeEvent(client, {
        eventType: 'source_crawl_target_updated',
        entityTable: 'source_crawl_targets',
        entityId: targetKey,
        actor,
        summary: `${targetKey} crawl target updated`,
        metadata: {
          sourceId: input.sourceId,
          lane: input.lane || 'backfill',
          status: input.status || 'planned',
          runtimeMode: input.runtimeMode || 'manual',
        },
      })
  
      return mapSourceCrawlTargetRow(result.rows[0])
    })
  }
  
  async function upsertSourceCrawlItem(input, actor = 'system') {
    const itemKey = String(input?.itemKey || '').trim()
    if (!itemKey) throw new Error('itemKey is required.')
    const targetKey = String(input.targetKey || '').trim()
    if (!targetKey) throw new Error('targetKey is required.')
    const externalId = String(input.externalId || '').trim()
    if (!externalId) throw new Error('externalId is required.')
    const requestedIncrementAttempt = Boolean(input?.incrementAttempt)
    const sourceCrawlRunId = String(input.sourceCrawlRunId || input.crawlRunId || process.env.EXTRACTION_CRAWL_RUN_ID || '').trim() || null
    const metadataDeleteKeys = Array.isArray(input?.metadataDeleteKeys)
      ? input.metadataDeleteKeys.map(key => String(key || '').trim()).filter(Boolean)
      : []
  
    return withFoundationTransaction(async client => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`source_crawl_item:${targetKey}:${externalId}`])
      const duplicateAttemptResult = sourceCrawlRunId && requestedIncrementAttempt
        ? await client.query(
            `
              SELECT 1
              FROM source_crawl_item_attempts
              WHERE source_crawl_run_id = $1
                AND (
                  item_key = $2
                  OR item_key IN (
                    SELECT item_key
                    FROM source_crawl_items
                    WHERE target_key = $3
                      AND external_id = $4
                  )
                )
              LIMIT 1
            `,
            [sourceCrawlRunId, itemKey, targetKey, externalId]
          )
        : { rowCount: 0 }
      const incrementAttempt = requestedIncrementAttempt && duplicateAttemptResult.rowCount === 0
  
      const result = await client.query(
        `
          INSERT INTO source_crawl_items (
            item_key, target_key, source_id, external_id, item_type, status,
            fingerprint, lease_owner, lease_expires_at, attempt_count,
            last_error, artifact_id, metadata, discovered_at, processed_at,
            updated_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,NOW())
          ON CONFLICT (target_key, external_id) DO UPDATE SET
            item_type = EXCLUDED.item_type,
            status = EXCLUDED.status,
            fingerprint = COALESCE(EXCLUDED.fingerprint, source_crawl_items.fingerprint),
            lease_owner = EXCLUDED.lease_owner,
            lease_expires_at = EXCLUDED.lease_expires_at,
            attempt_count = CASE
              WHEN $16 = TRUE THEN source_crawl_items.attempt_count + 1
              ELSE GREATEST(source_crawl_items.attempt_count, EXCLUDED.attempt_count)
            END,
            last_error = EXCLUDED.last_error,
            artifact_id = COALESCE(EXCLUDED.artifact_id, source_crawl_items.artifact_id),
            metadata = COALESCE((
              SELECT jsonb_object_agg(existing.key, existing.value)
              FROM jsonb_each(COALESCE(source_crawl_items.metadata, '{}'::jsonb)) AS existing
              WHERE NOT (existing.key = ANY($17::text[]))
            ), '{}'::jsonb) || EXCLUDED.metadata,
            processed_at = COALESCE(EXCLUDED.processed_at, source_crawl_items.processed_at),
            updated_at = NOW()
          RETURNING item_key, target_key, source_id, external_id, item_type,
                    status, fingerprint, lease_owner, lease_expires_at,
                    attempt_count, retry_state, max_attempts, next_retry_at,
                    last_attempted_at, last_source_crawl_run_id, retry_reason,
                    retry_blocker_card, last_error, artifact_id, metadata,
                    discovered_at, processed_at, updated_at
        `,
        [
          itemKey,
          targetKey,
          String(input.sourceId || '').trim(),
          externalId,
          String(input.itemType || 'artifact').trim(),
          String(input.status || 'pending').trim(),
          input.fingerprint == null ? null : String(input.fingerprint).trim(),
          input.leaseOwner == null ? null : String(input.leaseOwner).trim(),
          input.leaseExpiresAt || null,
          Number(input.attemptCount ?? (incrementAttempt ? 1 : 0)),
          input.lastError == null ? null : String(input.lastError).trim(),
          input.artifactId == null ? null : String(input.artifactId).trim(),
          JSON.stringify(input.metadata || {}),
          input.discoveredAt || new Date().toISOString(),
          input.processedAt || null,
          incrementAttempt,
          metadataDeleteKeys,
        ]
      )
  
      let item = mapSourceCrawlItemRow(result.rows[0])
      item = await applySourceCrawlItemHardening(client, item, {
        actor,
        sourceCrawlRunId,
        leaseOwner: input.leaseOwner == null ? null : String(input.leaseOwner).trim(),
        attemptWasIncremented: incrementAttempt,
      })
  
      await insertChangeEvent(client, {
        eventType: 'source_crawl_item_updated',
        entityTable: 'source_crawl_items',
        entityId: item.itemKey,
        actor,
        summary: `${item.itemKey} crawl item updated`,
        metadata: {
          targetKey: input.targetKey,
          sourceId: input.sourceId,
          status: input.status || 'pending',
        },
      })
  
      return item
    })
  }
  
  async function getSourceCrawlTargetForPolicy(client, targetKey) {
    const result = await client.query(
      `
        SELECT target_key, source_id, title, lane, target_type, status,
               priority, runtime_mode, cursor_state, budget, dedupe_policy,
               lease_owner, lease_expires_at, last_run_at, next_run_at,
               last_status, last_error, inspected_count, archived_count,
               extracted_count, metadata, notes, updated_by, created_at, updated_at
        FROM source_crawl_targets
        WHERE target_key = $1
        LIMIT 1
      `,
      [targetKey]
    )
    return result.rows[0] ? mapSourceCrawlTargetRow(result.rows[0]) : null
  }
  
  function normalizeAttemptStatus(item, classified) {
    if (classified?.retryState === EXTRACTION_RETRY_STATES.BLOCKED) return 'blocked'
    if (item.status === 'leased') return 'leased'
    if (item.status === 'succeeded') return 'succeeded'
    if (item.status === 'skipped') return 'skipped'
    return 'failed'
  }
  
  function buildAttemptId(itemKey, sourceCrawlRunId, attemptNumber) {
    return `attempt:${String(itemKey || '').slice(0, 160)}:${sourceCrawlRunId}:${attemptNumber}`
  }
  
  async function recordSourceCrawlItemAttemptWithClient(client, item, {
    sourceCrawlRunId,
    leaseOwner = null,
    attemptNumber = null,
    classified = null,
    metadata = {},
  } = {}) {
    if (!sourceCrawlRunId) return null
    if (!['leased', 'succeeded', 'failed', 'skipped'].includes(item.status)) return null
    const normalizedAttemptNumber = Math.max(1, Number(attemptNumber || item.attemptCount || 1) || 1)
    const status = normalizeAttemptStatus(item, classified)
    const nowSql = 'NOW()'
    const result = await client.query(
      `
        INSERT INTO source_crawl_item_attempts (
          attempt_id, item_key, target_key, source_id, source_crawl_run_id,
          attempt_number, status, lease_owner, started_at, finished_at,
          next_retry_at, error_class, error_message, metadata
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,
          ${nowSql},
          CASE WHEN $7 = 'leased' THEN NULL ELSE ${nowSql} END,
          $9,$10,$11,$12::jsonb
        )
        ON CONFLICT (item_key, source_crawl_run_id, attempt_number) DO UPDATE SET
          status = EXCLUDED.status,
          lease_owner = COALESCE(EXCLUDED.lease_owner, source_crawl_item_attempts.lease_owner),
          finished_at = COALESCE(EXCLUDED.finished_at, source_crawl_item_attempts.finished_at),
          next_retry_at = EXCLUDED.next_retry_at,
          error_class = COALESCE(EXCLUDED.error_class, source_crawl_item_attempts.error_class),
          error_message = COALESCE(EXCLUDED.error_message, source_crawl_item_attempts.error_message),
          metadata = COALESCE(source_crawl_item_attempts.metadata, '{}'::jsonb) || EXCLUDED.metadata,
          updated_at = NOW()
        RETURNING attempt_id, item_key, target_key, source_id, source_crawl_run_id,
                  attempt_number, status, lease_owner, started_at, finished_at,
                  next_retry_at, error_class, error_message, metadata, created_at, updated_at
      `,
      [
        buildAttemptId(item.itemKey, sourceCrawlRunId, normalizedAttemptNumber),
        item.itemKey,
        item.targetKey,
        item.sourceId,
        sourceCrawlRunId,
        normalizedAttemptNumber,
        status,
        leaseOwner,
        classified?.nextRetryAt || null,
        classified?.retryState || null,
        item.lastError || null,
        JSON.stringify({
          retryState: classified?.retryState || null,
          retryReason: classified?.retryReason || null,
          retryBlockerCard: classified?.retryBlockerCard || null,
          ...metadata,
        }),
      ]
    )
    return result.rows[0] ? mapSourceCrawlItemAttemptRow(result.rows[0]) : null
  }
  
  async function applySourceCrawlItemHardening(client, item, {
    actor = 'system',
    sourceCrawlRunId = null,
    leaseOwner = null,
    attemptWasIncremented = false,
  } = {}) {
    const target = await getSourceCrawlTargetForPolicy(client, item.targetKey)
    const policy = normalizeExtractionRetryPolicy(target || {})
    const classified = classifyExtractionItemRetry(item, target || {}, policy)
    const attemptedAt = sourceCrawlRunId && ['leased', 'succeeded', 'failed', 'skipped'].includes(item.status)
      ? new Date().toISOString()
      : null
    const updated = await client.query(
      `
        UPDATE source_crawl_items
        SET retry_state = $2,
            max_attempts = $3,
            next_retry_at = $4,
            last_attempted_at = COALESCE($5, last_attempted_at),
            last_source_crawl_run_id = COALESCE($6, last_source_crawl_run_id),
            retry_reason = $7,
            retry_blocker_card = $8,
            updated_at = NOW()
        WHERE item_key = $1
        RETURNING item_key, target_key, source_id, external_id, item_type, status,
                  fingerprint, lease_owner, lease_expires_at, attempt_count,
                  retry_state, max_attempts, next_retry_at, last_attempted_at,
                  last_source_crawl_run_id, retry_reason, retry_blocker_card,
                  last_error, artifact_id, metadata, discovered_at, processed_at,
                  updated_at
      `,
      [
        item.itemKey,
        classified.retryState,
        classified.maxAttempts || policy.maxAttempts,
        classified.nextRetryAt || null,
        attemptedAt,
        sourceCrawlRunId,
        classified.retryReason || null,
        classified.retryBlockerCard || null,
      ]
    )
    const hardened = updated.rows[0] ? mapSourceCrawlItemRow(updated.rows[0]) : item
    await recordSourceCrawlItemAttemptWithClient(client, hardened, {
      sourceCrawlRunId,
      leaseOwner,
      attemptNumber: attemptWasIncremented ? hardened.attemptCount : Math.max(1, hardened.attemptCount || 1),
      classified,
      metadata: { actor },
    })
    return hardened
  }
  
  function makeSourceCrawlRunId(targetKey) {
    const compactTarget = String(targetKey || 'target')
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'target'
    const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '')
    return `crawl-${compactTarget}-${stamp}-${randomUUID().slice(0, 8)}`
  }
  
  async function leaseSourceCrawlTarget(targetKey, { leaseOwner = 'system', leaseSeconds = 900, force = false } = {}) {
    const normalizedTargetKey = String(targetKey || '').trim()
    if (!normalizedTargetKey) throw new Error('targetKey is required.')
  
    return withFoundationTransaction(async client => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`source_crawl_target:${normalizedTargetKey}`])
      const result = await client.query(
        `
          UPDATE source_crawl_targets
          SET lease_owner = $2,
              lease_expires_at = NOW() + ($3::text || ' seconds')::interval,
              last_status = 'leased',
              last_error = NULL,
              updated_by = $2,
              updated_at = NOW()
          WHERE target_key = $1
            AND (
              $4 = TRUE
              OR (
                status NOT IN ('blocked', 'paused', 'complete')
                AND runtime_mode <> 'paused'
                AND (lease_expires_at IS NULL OR lease_expires_at < NOW())
              )
            )
          RETURNING target_key, source_id, title, lane, target_type, status,
                    priority, runtime_mode, cursor_state, budget, dedupe_policy,
                    lease_owner, lease_expires_at, last_run_at, next_run_at,
                    last_status, last_error, inspected_count, archived_count,
                    extracted_count, metadata, notes, updated_by, created_at,
                    updated_at
        `,
        [normalizedTargetKey, String(leaseOwner || 'system').trim(), Number(leaseSeconds || 900), Boolean(force)]
      )
  
      if (!result.rows[0]) {
        throw new Error(`Source crawl target is not leaseable or is already leased: ${normalizedTargetKey}`)
      }
  
      const target = mapSourceCrawlTargetRow(result.rows[0])
      const runId = makeSourceCrawlRunId(normalizedTargetKey)
      const runResult = await client.query(
        `
          INSERT INTO source_crawl_target_runs (
            run_id, target_key, source_id, status, lease_owner, lease_expires_at,
            metadata
          )
          VALUES ($1,$2,$3,'running',$4,$5,$6::jsonb)
          RETURNING run_id, target_key, source_id, status, lease_owner, lease_expires_at,
                    started_at, finished_at, next_run_at, last_error, inspected_delta,
                    archived_delta, extracted_delta, metadata, created_at, updated_at
        `,
        [
          runId,
          target.targetKey,
          target.sourceId,
          target.leaseOwner || String(leaseOwner || 'system').trim(),
          target.leaseExpiresAt,
          JSON.stringify({
            forced: Boolean(force),
            leaseSeconds: Number(leaseSeconds || 900),
          }),
        ]
      )
  
      return {
        ...target,
        crawlRunId: runId,
        crawlRun: mapSourceCrawlTargetRunRow(runResult.rows[0]),
      }
    })
  }
  
  async function finishSourceCrawlTargetRun(targetKey, input = {}, actor = 'system') {
    const normalizedTargetKey = String(targetKey || '').trim()
    if (!normalizedTargetKey) throw new Error('targetKey is required.')
    const leaseOwner = String(input.leaseOwner || actor || 'system').trim()
    const requestedRunId = String(input.runId || input.crawlRunId || '').trim()
  
    return withFoundationTransaction(async client => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`source_crawl_target:${normalizedTargetKey}`])
      const activeRunResult = await client.query(
        `
          SELECT run_id
          FROM source_crawl_target_runs
          WHERE target_key = $1
            AND lease_owner = $2
            AND status = 'running'
            AND ($3::text IS NULL OR run_id = $3)
          ORDER BY started_at DESC
          LIMIT 1
          FOR UPDATE
        `,
        [normalizedTargetKey, leaseOwner, requestedRunId || null]
      )
      const activeRunId = activeRunResult.rows[0]?.run_id || null
      if (requestedRunId && !activeRunId) {
        const finishedRunResult = await client.query(
          `
            SELECT run_id, target_key, source_id, status, lease_owner, lease_expires_at,
                   started_at, finished_at, next_run_at, last_error, inspected_delta,
                   archived_delta, extracted_delta, metadata, created_at, updated_at
            FROM source_crawl_target_runs
            WHERE run_id = $1
              AND target_key = $2
              AND lease_owner = $3
              AND status IN ('succeeded', 'partial', 'failed', 'skipped')
            LIMIT 1
          `,
          [requestedRunId, normalizedTargetKey, leaseOwner]
        )
        if (finishedRunResult.rows[0]) {
          const targetResult = await client.query(
            `
              SELECT target_key, source_id, title, lane, target_type, status,
                     priority, runtime_mode, cursor_state, budget, dedupe_policy,
                     lease_owner, lease_expires_at, last_run_at, next_run_at,
                     last_status, last_error, inspected_count, archived_count,
                     extracted_count, metadata, notes, updated_by, created_at, updated_at
              FROM source_crawl_targets
              WHERE target_key = $1
              LIMIT 1
            `,
            [normalizedTargetKey]
          )
          return {
            ...(targetResult.rows[0] ? mapSourceCrawlTargetRow(targetResult.rows[0]) : { targetKey: normalizedTargetKey }),
            crawlRunId: requestedRunId,
            crawlRun: mapSourceCrawlTargetRunRow(finishedRunResult.rows[0]),
            idempotentFinish: true,
          }
        }
        throw new Error(`Source crawl target run finish blocked because ${requestedRunId} is not running for ${normalizedTargetKey} under ${leaseOwner}.`)
      }
  
      const currentTargetResult = await client.query(
        `
          SELECT target_key, source_id, title, lane, target_type, status,
                 priority, runtime_mode, cursor_state, budget, dedupe_policy,
                 lease_owner, lease_expires_at, last_run_at, next_run_at,
                 last_status, last_error, inspected_count, archived_count,
                 extracted_count, metadata, notes, updated_by, created_at, updated_at
          FROM source_crawl_targets
          WHERE target_key = $1
          FOR UPDATE
        `,
        [normalizedTargetKey]
      )
      const currentTarget = currentTargetResult.rows[0]
        ? mapSourceCrawlTargetRow(currentTargetResult.rows[0])
        : { targetKey: normalizedTargetKey }
      const retirementUpdate = buildExtractRetireRunUpdate({
        target: currentTarget,
        runInput: input,
      })
      const finishMetadata = {
        ...(input.metadata || {}),
        ...retirementUpdate.metadata,
      }

      const result = await client.query(
        `
          UPDATE source_crawl_targets
          SET lease_owner = NULL,
              lease_expires_at = NULL,
              status = COALESCE($12, status),
              runtime_mode = COALESCE($13, runtime_mode),
              last_run_at = COALESCE($2, NOW()),
              next_run_at = $3,
              last_status = $4,
              last_error = $5,
              inspected_count = inspected_count + $6,
              archived_count = archived_count + $7,
              extracted_count = extracted_count + $8,
              cursor_state = COALESCE(cursor_state, '{}'::jsonb) || $9::jsonb,
              metadata = COALESCE(metadata, '{}'::jsonb) || $10::jsonb,
              updated_by = $11,
              updated_at = NOW()
          WHERE target_key = $1
            AND lease_owner = $14
          RETURNING target_key, source_id, title, lane, target_type, status,
                    priority, runtime_mode, cursor_state, budget, dedupe_policy,
                    lease_owner, lease_expires_at, last_run_at, next_run_at,
                    last_status, last_error, inspected_count, archived_count,
                    extracted_count, metadata, notes, updated_by, created_at,
                    updated_at
        `,
        [
          normalizedTargetKey,
          input.lastRunAt || null,
          retirementUpdate.nextRunAt,
          String(input.lastStatus || 'succeeded').trim(),
          input.lastError == null ? null : String(input.lastError).trim(),
          Number(input.inspectedDelta || 0),
          Number(input.archivedDelta || 0),
          Number(input.extractedDelta || 0),
          JSON.stringify(input.cursorState || {}),
          JSON.stringify(finishMetadata),
          actor,
          retirementUpdate.status,
          retirementUpdate.runtimeMode,
          leaseOwner,
        ]
      )
  
      if (!result.rows[0]) throw new Error(`Source crawl target finish blocked because ${normalizedTargetKey} is not leased by ${leaseOwner}.`)
      const target = mapSourceCrawlTargetRow(result.rows[0])
      let finishedRun = null
      if (activeRunId) {
        const runResult = await client.query(
          `
            UPDATE source_crawl_target_runs
            SET status = $2,
                finished_at = COALESCE($3, NOW()),
                next_run_at = $4,
                last_error = $5,
                inspected_delta = $6,
                archived_delta = $7,
                extracted_delta = $8,
                metadata = COALESCE(metadata, '{}'::jsonb) || $9::jsonb,
                updated_at = NOW()
            WHERE run_id = $1
            RETURNING run_id, target_key, source_id, status, lease_owner, lease_expires_at,
                      started_at, finished_at, next_run_at, last_error, inspected_delta,
                      archived_delta, extracted_delta, metadata, created_at, updated_at
          `,
          [
            activeRunId,
            String(input.lastStatus || 'succeeded').trim(),
            input.lastRunAt || null,
            retirementUpdate.nextRunAt,
            input.lastError == null ? null : String(input.lastError).trim(),
            Number(input.inspectedDelta || 0),
            Number(input.archivedDelta || 0),
            Number(input.extractedDelta || 0),
            JSON.stringify(finishMetadata),
          ]
        )
        finishedRun = runResult.rows[0] ? mapSourceCrawlTargetRunRow(runResult.rows[0]) : null
      }
  
      return {
        ...target,
        crawlRunId: activeRunId,
        crawlRun: finishedRun,
      }
    })
  }
  
  async function listSourceCrawlItems({ targetKey, status, limit = 50, order = 'asc' } = {}) {
    const normalizedTargetKey = String(targetKey || '').trim()
    const normalizedStatus = String(status || '').trim()
    const normalizedLimit = Math.min(200, Math.max(1, Number(limit) || 50))
    const normalizedOrder = String(order || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC'
    const whereClauses = []
    const values = []
  
    if (normalizedTargetKey) {
      values.push(normalizedTargetKey)
      whereClauses.push(`target_key = $${values.length}`)
    }
    if (normalizedStatus) {
      values.push(normalizedStatus)
      whereClauses.push(`status = $${values.length}`)
    }
  
    values.push(normalizedLimit)
    const limitParam = `$${values.length}`
    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''
  
    const result = await pool.query(
      `
        SELECT item_key, target_key, source_id, external_id, item_type, status,
               fingerprint, lease_owner, lease_expires_at, attempt_count,
               retry_state, max_attempts, next_retry_at, last_attempted_at,
               last_source_crawl_run_id, retry_reason, retry_blocker_card,
               last_error, artifact_id, metadata, discovered_at, processed_at,
               updated_at
        FROM source_crawl_items
        ${whereSql}
        ORDER BY updated_at ${normalizedOrder}
        LIMIT ${limitParam}
      `,
      values,
    )
  
    return result.rows.map(mapSourceCrawlItemRow)
  }
  
  async function classifySourceCrawlItemRetries({ targetKey = '', limit = 500 } = {}, actor = 'system') {
    const normalizedTargetKey = String(targetKey || '').trim()
    const normalizedLimit = Math.min(5000, Math.max(1, Number(limit) || 500))
  
    return withFoundationTransaction(async client => {
      const fixedStateWhere = normalizedTargetKey ? 'AND target_key = $1' : ''
      const fixedStateValues = normalizedTargetKey ? [normalizedTargetKey] : []
      await client.query(
        `
          UPDATE source_crawl_items
          SET retry_state = 'succeeded',
              next_retry_at = NULL,
              retry_reason = COALESCE(NULLIF(retry_reason, ''), 'succeeded'),
              retry_blocker_card = NULL,
              updated_at = NOW()
          WHERE status = 'succeeded'
            AND retry_state <> 'succeeded'
            ${fixedStateWhere}
        `,
        fixedStateValues,
      )
      await client.query(
        `
          UPDATE source_crawl_items
          SET retry_state = 'skipped',
              next_retry_at = NULL,
              retry_reason = COALESCE(
                NULLIF(retry_reason, ''),
                NULLIF(metadata->>'reason', ''),
                NULLIF(metadata->>'skipReason', ''),
                'skipped'
              ),
              retry_blocker_card = NULL,
              updated_at = NOW()
          WHERE status = 'skipped'
            AND retry_state <> 'skipped'
            ${fixedStateWhere}
        `,
        fixedStateValues,
      )
  
      const values = []
      const filters = ["items.status IN ('failed', 'leased')"]
      if (normalizedTargetKey) {
        values.push(normalizedTargetKey)
        filters.push(`items.target_key = $${values.length}`)
      }
      values.push(normalizedLimit)
      const result = await client.query(
        `
          SELECT items.item_key, items.target_key, items.source_id, items.external_id,
                 items.item_type, items.status, items.fingerprint, items.lease_owner,
                 items.lease_expires_at, items.attempt_count, items.retry_state,
                 items.max_attempts, items.next_retry_at, items.last_attempted_at,
                 items.last_source_crawl_run_id, items.retry_reason,
                 items.retry_blocker_card, items.last_error, items.artifact_id,
                 items.metadata, items.discovered_at, items.processed_at,
                 items.updated_at
          FROM source_crawl_items items
          WHERE ${filters.join(' AND ')}
          ORDER BY items.updated_at DESC
          LIMIT $${values.length}
          FOR UPDATE
        `,
        values,
      )
  
      const classified = []
      for (const row of result.rows) {
        const item = mapSourceCrawlItemRow(row)
        const hardened = await applySourceCrawlItemHardening(client, item, {
          actor,
          sourceCrawlRunId: item.lastSourceCrawlRunId,
          leaseOwner: item.leaseOwner,
        })
        classified.push(hardened)
      }
  
      return classified
    })
  }
  
  async function getRetryableSourceCrawlItems({ targetKey, limit = 10, now = new Date().toISOString() } = {}) {
    const normalizedTargetKey = String(targetKey || '').trim()
    if (!normalizedTargetKey) throw new Error('targetKey is required.')
    const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 10))
    const result = await pool.query(
      `
        SELECT item_key, target_key, source_id, external_id, item_type, status,
               fingerprint, lease_owner, lease_expires_at, attempt_count,
               retry_state, max_attempts, next_retry_at, last_attempted_at,
               last_source_crawl_run_id, retry_reason, retry_blocker_card,
               last_error, artifact_id, metadata, discovered_at, processed_at,
               updated_at
        FROM source_crawl_items
        WHERE target_key = $1
          AND retry_state IN ('eligible', 'waiting')
          AND (next_retry_at IS NULL OR next_retry_at <= $2::timestamptz)
        ORDER BY COALESCE(next_retry_at, updated_at) ASC
        LIMIT $3
      `,
      [normalizedTargetKey, now, normalizedLimit],
    )
    return result.rows.map(mapSourceCrawlItemRow)
  }
  
  async function leaseRetryableSourceCrawlItems({ targetKey, runId, leaseOwner = 'system', limit = 10, leaseSeconds = 900 } = {}, actor = 'system') {
    const normalizedTargetKey = String(targetKey || '').trim()
    const normalizedRunId = String(runId || '').trim()
    if (!normalizedTargetKey) throw new Error('targetKey is required.')
    if (!normalizedRunId) throw new Error('runId is required.')
    const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 10))
    const normalizedLeaseSeconds = Math.max(60, Math.min(24 * 60 * 60, Number(leaseSeconds) || 900))
  
    return withFoundationTransaction(async client => {
      const result = await client.query(
        `
          WITH selected AS (
            SELECT item_key
            FROM source_crawl_items
            WHERE target_key = $1
              AND retry_state IN ('eligible', 'waiting')
              AND (next_retry_at IS NULL OR next_retry_at <= NOW())
            ORDER BY COALESCE(next_retry_at, updated_at) ASC
            LIMIT $4
            FOR UPDATE SKIP LOCKED
          )
          UPDATE source_crawl_items items
          SET status = 'leased',
              retry_state = 'leased',
              lease_owner = $2,
              lease_expires_at = NOW() + ($3::text || ' seconds')::interval,
              last_source_crawl_run_id = $5,
              last_attempted_at = NOW(),
              updated_at = NOW()
          FROM selected
          WHERE items.item_key = selected.item_key
          RETURNING items.item_key, items.target_key, items.source_id, items.external_id,
                    items.item_type, items.status, items.fingerprint, items.lease_owner,
                    items.lease_expires_at, items.attempt_count, items.retry_state,
                    items.max_attempts, items.next_retry_at, items.last_attempted_at,
                    items.last_source_crawl_run_id, items.retry_reason,
                    items.retry_blocker_card, items.last_error, items.artifact_id,
                    items.metadata, items.discovered_at, items.processed_at,
                    items.updated_at
        `,
        [normalizedTargetKey, String(leaseOwner || actor || 'system').trim(), normalizedLeaseSeconds, normalizedLimit, normalizedRunId],
      )
      const items = []
      for (const row of result.rows) {
        const item = mapSourceCrawlItemRow(row)
        await recordSourceCrawlItemAttemptWithClient(client, item, {
          sourceCrawlRunId: normalizedRunId,
          leaseOwner: item.leaseOwner || leaseOwner || actor,
          attemptNumber: Math.max(1, item.attemptCount + 1),
          classified: { retryState: EXTRACTION_RETRY_STATES.LEASED, retryReason: 'leased_for_retry' },
          metadata: { actor, leasedForRetry: true },
        })
        items.push(item)
      }
      return items
    })
  }
  
  async function markSourceCrawlItemAttemptStarted(input = {}, actor = 'system') {
    const itemKey = String(input.itemKey || '').trim()
    const runId = String(input.sourceCrawlRunId || input.runId || input.crawlRunId || '').trim()
    if (!itemKey) throw new Error('itemKey is required.')
    if (!runId) throw new Error('sourceCrawlRunId is required.')
    return withFoundationTransaction(async client => {
      const result = await client.query(
        `
          SELECT item_key, target_key, source_id, external_id, item_type, status,
                 fingerprint, lease_owner, lease_expires_at, attempt_count,
                 retry_state, max_attempts, next_retry_at, last_attempted_at,
                 last_source_crawl_run_id, retry_reason, retry_blocker_card,
                 last_error, artifact_id, metadata, discovered_at, processed_at,
                 updated_at
          FROM source_crawl_items
          WHERE item_key = $1
          FOR UPDATE
        `,
        [itemKey],
      )
      if (!result.rows[0]) throw new Error(`source_crawl_items row not found: ${itemKey}`)
      const item = mapSourceCrawlItemRow(result.rows[0])
      return recordSourceCrawlItemAttemptWithClient(client, { ...item, status: 'leased' }, {
        sourceCrawlRunId: runId,
        leaseOwner: input.leaseOwner || actor,
        attemptNumber: input.attemptNumber || Math.max(1, item.attemptCount + 1),
        classified: { retryState: EXTRACTION_RETRY_STATES.LEASED, retryReason: 'attempt_started' },
        metadata: input.metadata || {},
      })
    })
  }
  
  async function markSourceCrawlItemAttemptFinished(input = {}, actor = 'system') {
    const itemKey = String(input.itemKey || '').trim()
    const runId = String(input.sourceCrawlRunId || input.runId || input.crawlRunId || '').trim()
    if (!itemKey) throw new Error('itemKey is required.')
    if (!runId) throw new Error('sourceCrawlRunId is required.')
    return withFoundationTransaction(async client => {
      const result = await client.query(
        `
          SELECT item_key, target_key, source_id, external_id, item_type, status,
                 fingerprint, lease_owner, lease_expires_at, attempt_count,
                 retry_state, max_attempts, next_retry_at, last_attempted_at,
                 last_source_crawl_run_id, retry_reason, retry_blocker_card,
                 last_error, artifact_id, metadata, discovered_at, processed_at,
                 updated_at
          FROM source_crawl_items
          WHERE item_key = $1
          FOR UPDATE
        `,
        [itemKey],
      )
      if (!result.rows[0]) throw new Error(`source_crawl_items row not found: ${itemKey}`)
      const item = mapSourceCrawlItemRow(result.rows[0])
      const status = String(input.status || item.status || 'failed').trim()
      const updatedItem = { ...item, status, lastError: input.errorMessage || item.lastError || null }
      const classified = classifyExtractionItemRetry(updatedItem, await getSourceCrawlTargetForPolicy(client, item.targetKey) || {})
      return recordSourceCrawlItemAttemptWithClient(client, updatedItem, {
        sourceCrawlRunId: runId,
        leaseOwner: input.leaseOwner || item.leaseOwner || actor,
        attemptNumber: input.attemptNumber || Math.max(1, item.attemptCount || 1),
        classified,
        metadata: input.metadata || {},
      })
    })
  }
  
  async function markStaleSourceCrawlItems({ olderThanMinutes = SOURCE_CRAWL_STALE_RUN_MINUTES, limit = 50 } = {}, actor = 'system') {
    const normalizedMinutes = Math.max(5, Math.min(24 * 60, Number(olderThanMinutes) || SOURCE_CRAWL_STALE_RUN_MINUTES))
    const normalizedLimit = Math.min(200, Math.max(1, Number(limit) || 50))
    return withFoundationTransaction(async client => {
      const result = await client.query(
        `
          WITH selected AS (
            SELECT item_key
            FROM source_crawl_items
            WHERE status = 'leased'
              AND (
                (lease_expires_at IS NOT NULL AND lease_expires_at < NOW())
                OR updated_at < NOW() - ($1::int * INTERVAL '1 minute')
              )
            ORDER BY COALESCE(lease_expires_at, updated_at) ASC
            LIMIT $2
            FOR UPDATE
          )
          UPDATE source_crawl_items items
          SET status = 'failed',
              lease_owner = NULL,
              lease_expires_at = NULL,
              attempt_count = GREATEST(attempt_count + 1, 1),
              last_error = COALESCE(NULLIF(last_error, ''), 'Marked failed by stale source-crawl item lease reaper.'),
              retry_reason = 'stale_item_lease',
              metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                'staleItemLeaseReapedBy', $3::text,
                'staleItemLeaseReapedAt', NOW(),
                'staleItemLeaseThresholdMinutes', $1::int
              ),
              updated_at = NOW()
          FROM selected
          WHERE items.item_key = selected.item_key
          RETURNING items.item_key, items.target_key, items.source_id, items.external_id,
                    items.item_type, items.status, items.fingerprint, items.lease_owner,
                    items.lease_expires_at, items.attempt_count, items.retry_state,
                    items.max_attempts, items.next_retry_at, items.last_attempted_at,
                    items.last_source_crawl_run_id, items.retry_reason,
                    items.retry_blocker_card, items.last_error, items.artifact_id,
                    items.metadata, items.discovered_at, items.processed_at,
                    items.updated_at
        `,
        [normalizedMinutes, normalizedLimit, actor],
      )
      const rows = []
      for (const row of result.rows) {
        const item = mapSourceCrawlItemRow(row)
        const hardened = await applySourceCrawlItemHardening(client, item, {
          actor,
          sourceCrawlRunId: item.lastSourceCrawlRunId,
          attemptWasIncremented: true,
        })
        await insertChangeEvent(client, {
          eventType: 'source_crawl_item_updated',
          entityTable: 'source_crawl_items',
          entityId: hardened.itemKey,
          actor,
          summary: `${hardened.itemKey} crawl item marked failed after stale lease`,
          metadata: {
            targetKey: hardened.targetKey,
            sourceId: hardened.sourceId,
            staleThresholdMinutes: normalizedMinutes,
            retryState: hardened.retryState,
          },
        })
        rows.push(hardened)
      }
      return rows
    })
  }
  
  async function getSourceCrawlItemsByExternalId({ targetKey, externalIds = [] } = {}) {
    const normalizedTargetKey = String(targetKey || '').trim()
    const normalizedExternalIds = [...new Set(
      (externalIds || [])
        .map(value => String(value || '').trim())
        .filter(Boolean)
    )]
  
    if (!normalizedTargetKey) throw new Error('targetKey is required.')
    if (!normalizedExternalIds.length) return new Map()
  
    const result = await pool.query(
      `
        SELECT item_key, target_key, source_id, external_id, item_type, status,
               fingerprint, lease_owner, lease_expires_at, attempt_count,
               retry_state, max_attempts, next_retry_at, last_attempted_at,
               last_source_crawl_run_id, retry_reason, retry_blocker_card,
               last_error, artifact_id, metadata, discovered_at, processed_at,
               updated_at
        FROM source_crawl_items
        WHERE target_key = $1
          AND external_id = ANY($2::text[])
      `,
      [normalizedTargetKey, normalizedExternalIds],
    )
  
    return new Map(result.rows.map(row => [row.external_id, mapSourceCrawlItemRow(row)]))
  }
  
  async function listDriveContentExtractionQueue({
    inventoryTargetKey = 'drive-corpus-backfill',
    extractionTargetKey = 'drive-content-extract-backfill',
    limit = 5,
    includeUnsupported = true,
    retrySkippedReasonPrefixes = [],
    parentPathIncludes = '',
    nameIncludes = '',
    fileIds = [],
    forceReprocess = false,
  } = {}) {
    const normalizedInventoryTargetKey = String(inventoryTargetKey || '').trim()
    const normalizedExtractionTargetKey = String(extractionTargetKey || '').trim()
    const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 5))
    const normalizedRetrySkippedReasonPrefixes = Array.isArray(retrySkippedReasonPrefixes)
      ? retrySkippedReasonPrefixes.map(prefix => String(prefix || '').trim()).filter(Boolean)
      : []
    const normalizedParentPathIncludes = String(parentPathIncludes || '').trim()
    const normalizedNameIncludes = String(nameIncludes || '').trim()
    const normalizedFileIds = Array.isArray(fileIds)
      ? fileIds.map(fileId => String(fileId || '').trim()).filter(Boolean)
      : []
    const shouldForceReprocess = Boolean(forceReprocess)
    if (!normalizedInventoryTargetKey) throw new Error('inventoryTargetKey is required.')
    if (!normalizedExtractionTargetKey) throw new Error('extractionTargetKey is required.')
  
    const supportedMimeTypes = [
      'application/vnd.google-apps.document',
      'application/vnd.google-apps.spreadsheet',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf',
      'text/plain',
      'text/markdown',
    ]
    const retrySkippedFilterEnabled = !shouldForceReprocess && normalizedRetrySkippedReasonPrefixes.length > 0
    const retrySkippedExpression = retrySkippedFilterEnabled
      ? `EXISTS (
          SELECT 1
          FROM unnest($3::text[]) AS retry_prefix
          WHERE COALESCE(processed.metadata->>'skipReason', '') LIKE retry_prefix || '%'
        )`
      : 'false'
  
    const filters = [
      'inventory.target_key = $1',
      "inventory.source_id = 'SRC-GDRIVE-001'",
      "inventory.item_type = 'drive_file'",
      "inventory.status = 'succeeded'",
    ]
    const values = [normalizedInventoryTargetKey, normalizedExtractionTargetKey]
  
    if (shouldForceReprocess) {
      filters.push('(processed.item_key IS NULL OR processed.item_key IS NOT NULL)')
    } else if (normalizedRetrySkippedReasonPrefixes.length) {
      values.push(normalizedRetrySkippedReasonPrefixes)
      filters.push(`(
        processed.item_key IS NULL
        OR (
          processed.status = 'skipped'
          AND EXISTS (
            SELECT 1
            FROM unnest($${values.length}::text[]) AS retry_prefix
            WHERE COALESCE(processed.metadata->>'skipReason', '') LIKE retry_prefix || '%'
          )
        )
      )`)
    } else {
      filters.push('processed.item_key IS NULL')
    }
  
    if (!includeUnsupported) {
      values.push(supportedMimeTypes)
      filters.push(`inventory.metadata->>'mimeType' = ANY($${values.length}::text[])`)
    }
  
    if (normalizedParentPathIncludes) {
      values.push(`%${normalizedParentPathIncludes}%`)
      filters.push(`COALESCE(inventory.metadata->>'parentPath', '') ILIKE $${values.length}`)
    }
  
    if (normalizedNameIncludes) {
      values.push(`%${normalizedNameIncludes}%`)
      filters.push(`COALESCE(inventory.metadata->>'name', '') ILIKE $${values.length}`)
    }
  
    if (normalizedFileIds.length) {
      values.push(normalizedFileIds)
      filters.push(`inventory.metadata->>'driveFileId' = ANY($${values.length}::text[])`)
    }
  
    values.push(normalizedLimit)
  
    const result = await pool.query(
      `
        SELECT inventory.item_key, inventory.target_key, inventory.source_id,
               inventory.external_id, inventory.item_type, inventory.status,
               inventory.fingerprint, inventory.lease_owner, inventory.lease_expires_at,
               inventory.attempt_count, inventory.retry_state, inventory.max_attempts,
               inventory.next_retry_at, inventory.last_attempted_at,
               inventory.last_source_crawl_run_id, inventory.retry_reason,
               inventory.retry_blocker_card, inventory.last_error, inventory.artifact_id,
               inventory.metadata, inventory.discovered_at, inventory.processed_at,
               inventory.updated_at
        FROM source_crawl_items inventory
        LEFT JOIN source_crawl_items processed
          ON processed.target_key = $2
         AND processed.external_id = inventory.external_id
         AND processed.status IN ('succeeded', 'skipped')
        WHERE ${filters.join(' AND ')}
        ORDER BY
          CASE
            WHEN processed.status = 'skipped' AND ${retrySkippedExpression} THEN 0
            WHEN processed.item_key IS NULL THEN 1
            ELSE 2
          END,
          CASE inventory.metadata->>'valueRoute'
            WHEN 'strategy_evidence' THEN 0
            ELSE 1
          END,
          CASE inventory.metadata->>'mimeType'
            WHEN 'application/vnd.google-apps.document' THEN 0
            WHEN 'application/vnd.google-apps.spreadsheet' THEN 1
            WHEN 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' THEN 2
            WHEN 'application/pdf' THEN 3
            WHEN 'text/plain' THEN 4
            ELSE 9
          END,
          inventory.updated_at ASC
        LIMIT $${values.length}
      `,
      values,
    )
  
    return result.rows.map(mapSourceCrawlItemRow)
  }
  
  async function listVideoContentExtractionQueue({
    inventoryTargetKey = 'video-link-inventory',
    extractionTargetKey = 'video-content-extract-backfill',
    externalId = '',
    limit = 5,
  } = {}) {
    const normalizedInventoryTargetKey = String(inventoryTargetKey || '').trim()
    const normalizedExtractionTargetKey = String(extractionTargetKey || '').trim()
    const normalizedExternalId = String(externalId || '').trim()
    const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 5))
    if (!normalizedInventoryTargetKey) throw new Error('inventoryTargetKey is required.')
    if (!normalizedExtractionTargetKey) throw new Error('extractionTargetKey is required.')
    const values = [normalizedInventoryTargetKey, normalizedExtractionTargetKey]
    const externalIdFilter = normalizedExternalId
      ? `AND inventory.external_id = $${values.push(normalizedExternalId)}`
      : ''
    values.push(normalizedLimit)
  
    const result = await pool.query(
      `
        SELECT inventory.item_key, inventory.target_key, inventory.source_id, inventory.external_id,
               inventory.item_type, inventory.status, inventory.fingerprint, inventory.lease_owner,
               inventory.lease_expires_at, inventory.attempt_count,
               inventory.retry_state, inventory.max_attempts, inventory.next_retry_at,
               inventory.last_attempted_at, inventory.last_source_crawl_run_id,
               inventory.retry_reason, inventory.retry_blocker_card, inventory.last_error,
               inventory.artifact_id, inventory.metadata, inventory.discovered_at,
               inventory.processed_at, inventory.updated_at
        FROM source_crawl_items inventory
        LEFT JOIN source_crawl_items extraction
          ON extraction.target_key = $2
         AND extraction.external_id = inventory.external_id
         AND extraction.status IN ('succeeded', 'skipped')
        WHERE inventory.target_key = $1
          AND inventory.source_id = 'SRC-VIDEO-001'
          AND inventory.item_type = 'video_link'
          AND inventory.status = 'succeeded'
          AND extraction.item_key IS NULL
          ${externalIdFilter}
        ORDER BY
          CASE
            WHEN inventory.metadata->>'sourceKind' IN ('steve_manual_priority', 'manual_steve_priority')
            THEN -1
            WHEN inventory.metadata->>'platform' = 'youtube'
              AND (
                inventory.external_id ILIKE '%youtu.be/%'
                OR inventory.external_id ILIKE '%youtube.com/watch%'
                OR inventory.external_id ILIKE '%youtube.com/shorts/%'
              )
            THEN 0
            WHEN inventory.metadata->>'platform' = 'youtube' THEN 1
            WHEN inventory.metadata->>'platform' = 'google_drive' THEN 2
            WHEN inventory.metadata->>'platform' = 'loom' THEN 3
            ELSE 4
          END,
          inventory.updated_at ASC
        LIMIT $${values.length}
      `,
      values,
    )
  
    return result.rows.map(mapSourceCrawlItemRow)
  }
  
  async function getExtractionControlSnapshot({ limit = 50 } = {}) {
    const normalizedLimit = Math.min(200, Math.max(1, Number(limit) || 50))
    const [targetsResult, itemsResult, runsResult, staleActiveRunsResult, recentStaleReapedRunsResult, staleLeasedItemsResult, retryStateSummaryResult, partialRunsResult] = await Promise.all([
      pool.query(`
        SELECT target_key, source_id, title, lane, target_type, status,
               priority, runtime_mode, cursor_state, budget, dedupe_policy,
               lease_owner, lease_expires_at, last_run_at, next_run_at,
               last_status, last_error, inspected_count, archived_count,
               extracted_count, metadata, notes, updated_by, created_at, updated_at
        FROM source_crawl_targets
        ORDER BY CASE priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 ELSE 3 END,
                 lane ASC,
                 target_key ASC
        LIMIT $1
      `, [normalizedLimit]),
      pool.query(`
        SELECT item_key, target_key, source_id, external_id, item_type, status,
               fingerprint, lease_owner, lease_expires_at, attempt_count,
               retry_state, max_attempts, next_retry_at, last_attempted_at,
               last_source_crawl_run_id, retry_reason, retry_blocker_card,
               last_error, artifact_id, metadata, discovered_at, processed_at,
               updated_at
        FROM source_crawl_items
        ORDER BY updated_at DESC
        LIMIT $1
      `, [normalizedLimit]),
      pool.query(`
        SELECT run_id, target_key, source_id, status, lease_owner, lease_expires_at,
               started_at, finished_at, next_run_at, last_error, inspected_delta,
               archived_delta, extracted_delta, metadata, created_at, updated_at
        FROM source_crawl_target_runs
        ORDER BY started_at DESC
        LIMIT $1
      `, [normalizedLimit]),
      pool.query(`
        SELECT run_id, target_key, source_id, status, lease_owner, lease_expires_at,
               started_at, finished_at, next_run_at, last_error, inspected_delta,
               archived_delta, extracted_delta, metadata, created_at, updated_at
        FROM source_crawl_target_runs
        WHERE status = 'running'
          AND (
            (lease_expires_at IS NOT NULL AND lease_expires_at < NOW())
            OR started_at < NOW() - ($1::int * INTERVAL '1 minute')
          )
        ORDER BY started_at ASC
        LIMIT $2
      `, [SOURCE_CRAWL_STALE_RUN_MINUTES, normalizedLimit]),
      pool.query(`
        SELECT run_id, target_key, source_id, status, lease_owner, lease_expires_at,
               started_at, finished_at, next_run_at, last_error, inspected_delta,
               archived_delta, extracted_delta, metadata, created_at, updated_at
        FROM source_crawl_target_runs
        WHERE status = 'failed'
          AND metadata ? 'staleReapedAt'
        ORDER BY updated_at DESC
        LIMIT $1
      `, [Math.min(20, normalizedLimit)]),
      pool.query(`
        SELECT item_key, target_key, source_id, external_id, item_type, status,
               fingerprint, lease_owner, lease_expires_at, attempt_count,
               retry_state, max_attempts, next_retry_at, last_attempted_at,
               last_source_crawl_run_id, retry_reason, retry_blocker_card,
               last_error, artifact_id, metadata, discovered_at, processed_at,
               updated_at
        FROM source_crawl_items
        WHERE status = 'leased'
          AND lease_expires_at IS NOT NULL
          AND lease_expires_at < NOW()
        ORDER BY lease_expires_at ASC
        LIMIT $1
      `, [Math.min(20, normalizedLimit)]),
      pool.query(`
        SELECT retry_state,
               COUNT(*)::integer AS item_count,
               COUNT(*) FILTER (WHERE status = 'failed')::integer AS failed_item_count
        FROM source_crawl_items
        GROUP BY retry_state
        ORDER BY retry_state ASC
      `),
      pool.query(`
        SELECT COUNT(*)::integer AS partial_runs
        FROM source_crawl_target_runs
        WHERE status = 'partial'
      `),
    ])
  
    const foundationJobSchedules = await getFoundationJobScheduleIndex()
    const scheduledTargets = targetsResult.rows
      .map(mapSourceCrawlTargetRow)
      .map(target => attachSourceCrawlTargetSchedule(target, foundationJobSchedules))
    const itemSummaries = await getSourceCrawlTargetItemSummaries(
      scheduledTargets.map(target => target.targetKey)
    )
    const targets = scheduledTargets.map(target => {
      const itemSummary = itemSummaries.get(target.targetKey) || createEmptySourceCrawlItemSummary(target.targetKey)
      const targetWithItems = {
        ...target,
        itemSummary,
      }
  
      return {
        ...targetWithItems,
        healthFindings: buildSourceCrawlTargetHealthFindings(targetWithItems),
      }
    })
    const runCoverage = await getSourceCrawlTargetRunCoverage(
      targets.map(target => target.targetKey)
    )
    const coverageByTarget = targets.map(target =>
      buildSourceCrawlTargetCoverage(target, runCoverage.get(target.targetKey))
    )
    const recentItems = itemsResult.rows.map(mapSourceCrawlItemRow)
    const recentRuns = runsResult.rows
      .map(mapSourceCrawlTargetRunRow)
      .map(run => attachSourceCrawlRunStaleState(run, SOURCE_CRAWL_STALE_RUN_MINUTES))
    const staleActiveRuns = staleActiveRunsResult.rows
      .map(mapSourceCrawlTargetRunRow)
      .map(run => attachSourceCrawlRunStaleState(run, SOURCE_CRAWL_STALE_RUN_MINUTES))
    const recentStaleReapedRuns = recentStaleReapedRunsResult.rows.map(mapSourceCrawlTargetRunRow)
    const staleLeasedItems = staleLeasedItemsResult.rows.map(mapSourceCrawlItemRow)
    const retryStateCounts = retryStateSummaryResult.rows.reduce((acc, row) => {
      const state = row.retry_state || EXTRACTION_RETRY_STATES.NOT_EVALUATED
      acc[state] = {
        itemCount: Number(row.item_count || 0),
        failedItemCount: Number(row.failed_item_count || 0),
      }
      return acc
    }, {})
    const retryEligibleItems = Number(retryStateCounts.eligible?.itemCount || 0)
    const retryWaitingItems = Number(retryStateCounts.waiting?.itemCount || 0)
    const retryExhaustedItems = Number(retryStateCounts.exhausted?.itemCount || 0)
    const retryBlockedItems = Number(retryStateCounts.blocked?.itemCount || 0)
    const failedItemsWithoutRetryState = Number(retryStateCounts.not_evaluated?.failedItemCount || 0) +
      Number(retryStateCounts.not_retryable?.failedItemCount || 0)
    const targetsMissingRetryPolicy = targets.filter(target => {
      if (target.status !== 'active') return false
      const policy = normalizeExtractionRetryPolicy(target)
      return !policy.maxAttempts || !policy.maxRetryItemsPerRun || !policy.maxBackoffSeconds
    }).length
    const summary = {
      targetCount: targets.length,
      activeTargets: targets.filter(item => item.status === 'active').length,
      pausedTargets: targets.filter(item => item.status === 'paused' || item.runtimeMode === 'paused').length,
      scheduledTargets: targets.filter(item => item.scheduler?.runtimeMode === 'scheduled').length,
      dueTargets: targets.filter(item => item.scheduler?.due).length,
      currentDayTargets: targets.filter(item => item.lane === 'current_day').length,
      backfillTargets: targets.filter(item => item.lane === 'backfill').length,
      corpusMiningTargets: targets.filter(item => item.lane === 'corpus_mining').length,
      recoveryTargets: targets.filter(item => item.lane === 'recovery').length,
      blockedTargets: targets.filter(item => item.status === 'blocked').length,
      recentItemFailures: recentItems.filter(item => item.status === 'failed').length,
      recentRuns: recentRuns.length,
      runningRuns: recentRuns.filter(item => item.status === 'running').length,
      staleActiveRuns: staleActiveRuns.length,
      recentStaleReapedRuns: recentStaleReapedRuns.length,
      staleRunThresholdMinutes: SOURCE_CRAWL_STALE_RUN_MINUTES,
      recentRunFailures: recentRuns.filter(item => item.status === 'failed' || item.status === 'partial').length,
      targetsWithFindings: targets.filter(item => item.healthFindings.length).length,
      targetRiskFindings: targets.reduce((sum, item) => (
        sum + item.healthFindings.filter(finding => finding.severity === 'risk').length
      ), 0),
      targetWarningFindings: targets.reduce((sum, item) => (
        sum + item.healthFindings.filter(finding => finding.severity === 'warning').length
      ), 0),
      targetsWithFailedItems: targets.filter(item => item.itemSummary.failedItems > 0).length,
      targetsWithSkippedItems: targets.filter(item => item.itemSummary.skippedItems > 0).length,
      coverageTargets: coverageByTarget.length,
      coverageTargetsWithLastSuccess: coverageByTarget.filter(item => item.lastSuccessAt).length,
      coverageTargetsWithLastFailure: coverageByTarget.filter(item => item.lastFailureAt).length,
      coverageTargetsWithRemainingBacklog: coverageByTarget.filter(item => item.remainingBacklogIndicators.length).length,
      retryEligibleItems,
      retryWaitingItems,
      retryExhaustedItems,
      retryBlockedItems,
      staleLeasedItems: staleLeasedItems.length,
      partialRuns: Number(partialRunsResult.rows[0]?.partial_runs || 0),
      targetsMissingRetryPolicy,
      failedItemsWithoutRetryState,
    }
    const hardeningStatus = buildExtractionRunHardeningStatus({
      targets,
      coverageByTarget,
      staleActiveRuns,
      staleLeasedItems,
      summary,
    })
  
    return {
      generatedAt: new Date().toISOString(),
      targets,
      coverageByTarget,
      recentItems,
      recentRuns,
      staleActiveRuns,
      recentStaleReapedRuns,
      staleLeasedItems,
      retryStateCounts,
      hardeningStatus,
      summary,
    }
  }
  
  async function getExtractionRunHardeningSnapshot({ limit = 50 } = {}) {
    const snapshot = await getExtractionControlSnapshot({ limit })
    return {
      generatedAt: snapshot.generatedAt,
      status: snapshot.hardeningStatus?.status || 'blocked',
      hardeningStatus: snapshot.hardeningStatus,
      summary: snapshot.summary,
      coverageByTarget: snapshot.coverageByTarget,
      staleActiveRuns: snapshot.staleActiveRuns,
      staleLeasedItems: snapshot.staleLeasedItems,
      retryStateCounts: snapshot.retryStateCounts,
    }
  }

  async function getDriveCorpusInventorySnapshot({ limit = 20, targetKey = 'drive-corpus-backfill' } = {}) {
    const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 20))
    const normalizedTargetKey = String(targetKey || 'drive-corpus-backfill').trim()
    const [targetResult, summaryResult, valueRouteResult, extractionStatusResult, recentResult] = await Promise.all([
      pool.query(`
        SELECT target_key, source_id, title, lane, target_type, status,
               priority, runtime_mode, cursor_state, budget, dedupe_policy,
               lease_owner, lease_expires_at, last_run_at, next_run_at,
               last_status, last_error, inspected_count, archived_count,
               extracted_count, metadata, notes, updated_by, created_at, updated_at
        FROM source_crawl_targets
        WHERE target_key = $1
        LIMIT 1
      `, [normalizedTargetKey]),
      pool.query(`
        SELECT
          COUNT(*)::integer AS total_items,
          COUNT(*) FILTER (WHERE item_type = 'drive_folder')::integer AS folders,
          COUNT(*) FILTER (WHERE item_type = 'drive_file')::integer AS files,
          COUNT(*) FILTER (WHERE status = 'failed')::integer AS failed_items,
          COUNT(*) FILTER (WHERE metadata->>'extractionStatus' LIKE 'pending%')::integer AS pending_extraction
        FROM source_crawl_items
        WHERE target_key = $1
      `, [normalizedTargetKey]),
      pool.query(`
        SELECT COALESCE(NULLIF(metadata->>'valueRoute', ''), 'unknown') AS value_route,
               COUNT(*)::integer AS item_count
        FROM source_crawl_items
        WHERE target_key = $1
        GROUP BY value_route
        ORDER BY item_count DESC, value_route ASC
        LIMIT 12
      `, [normalizedTargetKey]),
      pool.query(`
        SELECT COALESCE(NULLIF(metadata->>'extractionStatus', ''), 'unknown') AS extraction_status,
               COUNT(*)::integer AS item_count
        FROM source_crawl_items
        WHERE target_key = $1
        GROUP BY extraction_status
        ORDER BY item_count DESC, extraction_status ASC
        LIMIT 12
      `, [normalizedTargetKey]),
      pool.query(`
        SELECT item_key, target_key, source_id, external_id, item_type, status,
               fingerprint, lease_owner, lease_expires_at, attempt_count,
               retry_state, max_attempts, next_retry_at, last_attempted_at,
               last_source_crawl_run_id, retry_reason, retry_blocker_card,
               last_error, artifact_id, metadata, discovered_at, processed_at,
               updated_at
        FROM source_crawl_items
        WHERE target_key = $1
        ORDER BY updated_at DESC
        LIMIT $2
      `, [normalizedTargetKey, normalizedLimit]),
    ])
  
    const target = targetResult.rows[0] ? mapSourceCrawlTargetRow(targetResult.rows[0]) : null
    const summaryRow = summaryResult.rows[0] || {}
    return {
      generatedAt: new Date().toISOString(),
      target,
      summary: {
        targetKey: normalizedTargetKey,
        totalItems: Number(summaryRow.total_items || 0),
        folders: Number(summaryRow.folders || 0),
        files: Number(summaryRow.files || 0),
        failedItems: Number(summaryRow.failed_items || 0),
        pendingExtraction: Number(summaryRow.pending_extraction || 0),
        inspectedFolders: Number(target?.cursorState?.driveInventory?.inspectedFolderCount || 0),
        queuedFolders: Number(target?.cursorState?.driveInventory?.queuedFolderCount || 0),
      },
      valueRoutes: valueRouteResult.rows.map(row => ({
        valueRoute: row.value_route,
        itemCount: Number(row.item_count || 0),
      })),
      extractionStatuses: extractionStatusResult.rows.map(row => ({
        extractionStatus: row.extraction_status,
        itemCount: Number(row.item_count || 0),
      })),
      recentItems: recentResult.rows.map(mapSourceCrawlItemRow),
    }
  }

  function mapSourceCrawlItemRows(rows = []) {
    return (Array.isArray(rows) ? rows : []).map(mapSourceCrawlItemRow)
  }

  return {
    getStaleSourceCrawlTargetRuns,
    markStaleSourceCrawlTargetRuns,
    upsertSourceCrawlTarget,
    upsertSourceCrawlItem,
    leaseSourceCrawlTarget,
    finishSourceCrawlTargetRun,
    listSourceCrawlItems,
    classifySourceCrawlItemRetries,
    getRetryableSourceCrawlItems,
    leaseRetryableSourceCrawlItems,
    markSourceCrawlItemAttemptStarted,
    markSourceCrawlItemAttemptFinished,
    markStaleSourceCrawlItems,
    getSourceCrawlItemsByExternalId,
    listDriveContentExtractionQueue,
    listVideoContentExtractionQueue,
    getExtractionControlSnapshot,
    getExtractionRunHardeningSnapshot,
    getDriveCorpusInventorySnapshot,
    mapSourceCrawlItemRows,
  }
}

function makeFakePool() {
  const target = {
    target_key: 'drive-content-extract-backfill',
    source_id: 'SRC-GDRIVE-001',
    title: 'Drive content extraction',
    lane: 'corpus_mining',
    target_type: 'drive_content',
    status: 'active',
    priority: 'P1',
    runtime_mode: 'scheduled',
    cursor_state: {},
    budget: { maxItems: 5 },
    dedupe_policy: {},
    lease_owner: null,
    lease_expires_at: null,
    last_run_at: '2026-05-16T05:00:00.000Z',
    next_run_at: '2026-05-17T05:00:00.000Z',
    last_status: 'succeeded',
    last_error: null,
    inspected_count: 3,
    archived_count: 2,
    extracted_count: 1,
    metadata: { foundationJobKey: 'drive-content-extract-bite' },
    notes: 'synthetic',
    updated_by: 'synthetic-proof',
    created_at: '2026-05-16T05:00:00.000Z',
    updated_at: '2026-05-16T05:00:00.000Z',
  }
  const run = {
    run_id: 'crawl-drive-content-20260516050000-synthetic',
    target_key: target.target_key,
    source_id: target.source_id,
    status: 'running',
    lease_owner: 'synthetic-worker',
    lease_expires_at: '2026-05-16T04:00:00.000Z',
    started_at: '2026-05-16T03:30:00.000Z',
    finished_at: null,
    next_run_at: target.next_run_at,
    last_error: null,
    inspected_delta: 1,
    archived_delta: 1,
    extracted_delta: 0,
    metadata: {},
    created_at: '2026-05-16T03:30:00.000Z',
    updated_at: '2026-05-16T03:30:00.000Z',
  }
  const item = {
    item_key: 'drive-content-extract-backfill:doc-1',
    target_key: target.target_key,
    source_id: target.source_id,
    external_id: 'doc-1',
    item_type: 'drive_document',
    status: 'failed',
    fingerprint: 'fp-1',
    lease_owner: null,
    lease_expires_at: null,
    attempt_count: 1,
    retry_state: 'eligible',
    max_attempts: 3,
    next_retry_at: null,
    last_attempted_at: '2026-05-16T05:00:00.000Z',
    last_source_crawl_run_id: run.run_id,
    retry_reason: 'temporary_error',
    retry_blocker_card: null,
    last_error: 'synthetic transient error',
    artifact_id: 'artifact-1',
    metadata: { mimeType: 'application/vnd.google-apps.document', name: 'Doc 1', parentPath: '/Team' },
    discovered_at: '2026-05-16T05:00:00.000Z',
    processed_at: null,
    updated_at: '2026-05-16T05:00:00.000Z',
  }
  const calls = []
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql: String(sql), params })
      const text = String(sql)
      if (/INSERT INTO change_events/.test(text)) return { rows: [] }
      if (/INSERT INTO source_crawl_targets/.test(text)) return { rows: [{ ...target, target_key: params[0], source_id: params[1], title: params[2] }] }
      if (/WITH selected AS/.test(text) && /UPDATE source_crawl_target_runs/.test(text)) return { rows: [{ ...run, status: 'failed', last_error: 'Marked failed by stale source-crawl run reaper.', metadata: { staleReapedAt: 'synthetic' } }] }
      if (/WITH selected AS/.test(text) && /UPDATE source_crawl_items/.test(text)) return { rows: [{ ...item, status: 'failed', last_error: 'Marked failed by stale source-crawl item lease reaper.' }] }
      if (/INSERT INTO source_crawl_items/.test(text)) return { rows: [{ ...item, item_key: params[0], target_key: params[1], source_id: params[2], external_id: params[3], status: params[5] || item.status }] }
      if (/INSERT INTO source_crawl_item_attempts/.test(text)) return { rows: [{ attempt_id: params[0], item_key: params[1], source_crawl_run_id: params[2], attempt_number: params[3], status: params[4], lease_owner: params[5], retry_state: params[6], retry_reason: params[7], error_message: params[8], metadata: JSON.parse(params[9] || '{}'), attempted_at: '2026-05-16T05:00:00.000Z', created_at: '2026-05-16T05:00:00.000Z' }] }
      if (/FROM source_crawl_targets/.test(text) && /FOR UPDATE/.test(text)) return { rows: [target] }
      if (/FROM source_crawl_targets/.test(text)) return { rows: [target] }
      if (/FROM source_crawl_target_runs/.test(text) && /COUNT/.test(text)) return { rows: [{ target_key: target.target_key, run_count: 1, successful_runs: 0, failed_runs: 1, runs_last_24h: 1, successful_runs_last_24h: 0, failed_runs_last_24h: 1, last_success_at: null, last_failure_at: '2026-05-16T04:00:00.000Z' }] }
      if (/FROM source_crawl_target_runs/.test(text) && /DISTINCT ON/.test(text)) return { rows: [{ ...run, status: 'failed', occurred_at: '2026-05-16T04:00:00.000Z' }] }
      if (/FROM source_crawl_target_runs/.test(text)) return { rows: [run] }
      if (/GROUP BY target_key, status, retry_state, reason/.test(text)) return { rows: [{ target_key: target.target_key, status: item.status, retry_state: item.retry_state, reason: item.retry_reason, item_count: 1, item_count_24h: 1, latest_updated_at: item.updated_at }] }
      if (/GROUP BY retry_state/.test(text)) return { rows: [{ retry_state: item.retry_state, item_count: 1, failed_item_count: 1 }] }
      if (/COUNT\(\*\)::integer AS partial_runs/.test(text)) return { rows: [{ partial_runs: 0 }] }
      if (/FROM source_crawl_items/.test(text)) return { rows: [item] }
      return { rows: [] }
    },
  }
}

export async function buildSyntheticFoundationSourceCrawlStoreBehaviorProof() {
  const fakePool = makeFakePool()
  const fakeClient = { query: (...args) => fakePool.query(...args) }
  const store = createFoundationSourceCrawlStore({
    pool: fakePool,
    withFoundationTransaction: async work => work(fakeClient),
    insertChangeEvent: async () => null,
    getFoundationJobScheduleIndex: async () => new Map([['drive-content-extract-bite', { title: 'Drive content extract bite', runtimeMode: 'scheduled', scheduleStatus: 'scheduled', scheduleDetail: 'synthetic', due: false, nextRunAt: '2026-05-17T05:00:00.000Z', latestRunStatus: 'succeeded', latestRunAt: '2026-05-16T05:00:00.000Z' }]]),
  })
  const staleRuns = await store.getStaleSourceCrawlTargetRuns({ olderThanMinutes: 5, limit: 5 })
  const reapedRuns = await store.markStaleSourceCrawlTargetRuns({ olderThanMinutes: 5, limit: 5 }, 'synthetic-proof')
  const target = await store.upsertSourceCrawlTarget({ targetKey: 'drive-content-extract-backfill', sourceId: 'SRC-GDRIVE-001', title: 'Drive content extraction' }, 'synthetic-proof')
  const itemMap = await store.getSourceCrawlItemsByExternalId({ targetKey: 'drive-content-extract-backfill', externalIds: ['doc-1'] })
  const videoQueue = await store.listVideoContentExtractionQueue({ limit: 1 })
  const snapshot = await store.getExtractionControlSnapshot({ limit: 5 })
  const hardening = await store.getExtractionRunHardeningSnapshot({ limit: 5 })

  const ok = staleRuns[0]?.staleState?.isStale === true &&
    String(reapedRuns[0]?.lastError || '').includes('stale source-crawl run reaper') &&
    target.targetKey === 'drive-content-extract-backfill' &&
    itemMap.get('doc-1')?.itemKey === 'drive-content-extract-backfill:doc-1' &&
    Array.isArray(videoQueue) &&
    snapshot.summary?.targetCount >= 1 &&
    hardening.summary?.targetCount >= 1

  return {
    ok,
    staleRuns: staleRuns.length,
    reapedRuns: reapedRuns.length,
    targetKey: target.targetKey,
    itemMapSize: itemMap.size,
    videoQueueLength: videoQueue.length,
    snapshotTargetCount: snapshot.summary?.targetCount || 0,
    hardeningStatus: hardening.status || null,
    queryCount: fakePool.calls.length,
  }
}

export async function buildFoundationSourceCrawlStoreSplitDogfoodProof(input = {}) {
  const oldInline = evaluateFoundationSourceCrawlStoreSplit({
    ...input,
    foundationDbSource: 'function mapSourceCrawlTargetRow() {} function mapSourceCrawlItemRow() {} function buildSourceCrawlTargetHealthFindings() {} export async function upsertSourceCrawlItem() {} export async function getExtractionControlSnapshot() {}',
    moduleSource: '',
  })
  const missingDelegate = evaluateFoundationSourceCrawlStoreSplit({
    ...input,
    foundationDbSource: "import { createFoundationSourceCrawlStore } from './foundation-source-crawl-store.js'\nconst foundationSourceCrawlStore = createFoundationSourceCrawlStore({})",
  })
  const weakPlan = evaluateFoundationSourceCrawlStoreSplit({
    ...input,
    planSource: 'move some code later',
  })
  const healthy = evaluateFoundationSourceCrawlStoreSplit(input)
  return {
    ok: oldInline.ok === false && missingDelegate.ok === false && weakPlan.ok === false && healthy.ok === true,
    oldInlineRejected: oldInline.ok === false,
    missingDelegateRejected: missingDelegate.ok === false,
    weakPlanRejected: weakPlan.ok === false,
    healthy,
    dogfoodInvariant: 'The old inline source-crawl shape fails; the split shape only passes when the module owns behavior, foundation-db delegates stable exports, and the plan names the source-extraction boundary.',
  }
}
