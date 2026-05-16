import {
  DEFAULT_EXTRACTION_RETRY_POLICY,
  EXTRACTION_RETRY_FAILED_TARGETS,
  EXTRACTION_RETRY_STATES,
  calculateExtractionBackoff,
  classifyExtractionItemRetry,
  normalizeExtractionRetryPolicy,
} from './extraction-run-hardening.js'

export const EXTRACT_RUN_HARDENING_EXECUTION_CARD_ID = 'EXTRACT-RUN-HARDENING-EXECUTION-001'
export const EXTRACT_RUN_HARDENING_EXECUTION_CLOSEOUT_KEY = 'extract-run-hardening-execution-v1'
export const EXTRACT_RUN_HARDENING_EXECUTION_PLAN_PATH = 'docs/process/extract-run-hardening-execution-001-plan.md'
export const EXTRACT_RUN_HARDENING_EXECUTION_APPROVAL_PATH = 'docs/process/approvals/EXTRACT-RUN-HARDENING-EXECUTION-001.json'
export const EXTRACT_RUN_HARDENING_EXECUTION_SCRIPT_PATH = 'scripts/process-extract-run-hardening-execution-check.mjs'
export const EXTRACTION_RETRY_FAILED_SCRIPT_PATH = 'scripts/retry-extraction-failed-items.mjs'
export const EXTRACTION_RETRY_FAILED_JOB_KEY = 'extraction-retry-failed'
export { EXTRACTION_RETRY_FAILED_TARGETS }

function toDate(value) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function normalizeLimit(value, fallback = DEFAULT_EXTRACTION_RETRY_POLICY.maxRetryItemsPerRun) {
  const limit = Number(value)
  if (!Number.isFinite(limit) || limit <= 0) return fallback
  return Math.min(100, Math.max(1, Math.floor(limit)))
}

export function targetSupportsRetryExecution(targetKey) {
  return EXTRACTION_RETRY_FAILED_TARGETS.includes(String(targetKey || '').trim())
}

export function buildExtractionRetryFailedCommand({ targetKey, actor = 'extraction-retry-failed', force = true } = {}) {
  const normalizedTargetKey = String(targetKey || '').trim()
  if (!targetSupportsRetryExecution(normalizedTargetKey)) {
    return {
      ok: false,
      blockedReason: `${normalizedTargetKey || 'missing target'} has no target-specific failed-item retry runner yet.`,
      command: null,
      args: [],
    }
  }
  return {
    ok: true,
    blockedReason: '',
    command: 'npm',
    args: [
      'run',
      'extraction:target',
      '--',
      `--target=${normalizedTargetKey}`,
      '--retryFailed=true',
      ...(force ? ['--force=true'] : []),
      `--actor=${String(actor || 'extraction-retry-failed').trim()}`,
    ],
  }
}

export function selectEligibleExtractionRetryItems(items = [], target = {}, policyInput = null, { now = new Date(), limit } = {}) {
  const nowDate = toDate(now) || new Date()
  const policy = policyInput || normalizeExtractionRetryPolicy(target)
  const normalizedLimit = normalizeLimit(limit, policy.maxRetryItemsPerRun)
  return (Array.isArray(items) ? items : [])
    .map(item => ({
      item,
      classified: classifyExtractionItemRetry(item, target, policy, { now: nowDate }),
    }))
    .filter(record => {
      if (String(record.item.status || '') !== 'failed') return false
      if (![EXTRACTION_RETRY_STATES.ELIGIBLE, EXTRACTION_RETRY_STATES.WAITING].includes(record.classified.retryState)) return false
      const nextRetryAt = toDate(record.classified.nextRetryAt)
      return !nextRetryAt || nextRetryAt <= nowDate
    })
    .sort((left, right) => {
      const leftTime = toDate(left.classified.nextRetryAt || left.item.updatedAt || left.item.discoveredAt)?.getTime() || 0
      const rightTime = toDate(right.classified.nextRetryAt || right.item.updatedAt || right.item.discoveredAt)?.getTime() || 0
      return leftTime - rightTime
    })
    .slice(0, normalizedLimit)
}

export function finishExtractionRetryItem({ item, target = {}, outcome = {}, policyInput = null, now = new Date() } = {}) {
  const policy = policyInput || normalizeExtractionRetryPolicy(target)
  const attemptNumber = Math.max(1, Number(item?.attemptCount || item?.attempt_count || 0) + 1)
  const status = String(outcome.status || '').trim()
  if (!['succeeded', 'failed', 'skipped'].includes(status)) {
    throw new Error(`Invalid retry outcome status: ${status || 'missing'}`)
  }
  const updatedItem = {
    ...item,
    status,
    attemptCount: attemptNumber,
    attempt_count: attemptNumber,
    lastError: outcome.errorMessage || outcome.lastError || (status === 'failed' ? 'retry_failed' : null),
    retryReason: outcome.retryReason || outcome.errorClass || outcome.errorMessage || status,
    nextRetryAt: outcome.nextRetryAt || null,
    leaseOwner: null,
    leaseExpiresAt: null,
    lastAttemptedAt: toDate(now)?.toISOString?.() || new Date().toISOString(),
  }
  const classified = classifyExtractionItemRetry(updatedItem, target, policy, { now })
  const retryState = status === 'failed' && attemptNumber >= Number(classified.maxAttempts || policy.maxAttempts)
    ? EXTRACTION_RETRY_STATES.EXHAUSTED
    : classified.retryState
  const nextRetryAt = status === 'failed' && retryState !== EXTRACTION_RETRY_STATES.EXHAUSTED
    ? calculateExtractionBackoff({ attemptCount: attemptNumber, policy, now })
    : null
  return {
    ...updatedItem,
    retryState,
    maxAttempts: classified.maxAttempts || policy.maxAttempts,
    nextRetryAt,
    retryBlockerCard: classified.retryBlockerCard || null,
    attemptRecord: {
      table: 'source_crawl_item_attempts',
      itemKey: item.itemKey,
      sourceCrawlRunId: outcome.sourceCrawlRunId || item.lastSourceCrawlRunId || 'synthetic-retry-run',
      attemptNumber,
      status,
      nextRetryAt,
      errorClass: retryState,
      errorMessage: updatedItem.lastError,
    },
  }
}

export function buildSyntheticExtractionRetryExecutionProof() {
  const now = new Date('2026-05-13T03:00:00.000Z')
  const target = {
    targetKey: 'meetings-current-day',
    lane: 'archive',
    status: 'active',
    budget: {
      maxRetryAttempts: 2,
      maxRetryItemsPerRun: 2,
      initialBackoffSeconds: 60,
      backoffMultiplier: 2,
      maxBackoffSeconds: 3600,
    },
  }
  const policy = normalizeExtractionRetryPolicy(target)
  const items = [
    {
      itemKey: 'retry-success',
      targetKey: target.targetKey,
      sourceId: 'SRC-MEETINGS-001',
      externalId: 'retry-success',
      status: 'failed',
      attemptCount: 1,
      retryReason: 'timeout while downloading transcript',
      nextRetryAt: '2026-05-13T02:00:00.000Z',
    },
    {
      itemKey: 'retry-exhaust',
      targetKey: target.targetKey,
      sourceId: 'SRC-MEETINGS-001',
      externalId: 'retry-exhaust',
      status: 'failed',
      attemptCount: 1,
      retryReason: 'temporary 500 from provider',
      nextRetryAt: '2026-05-13T02:05:00.000Z',
    },
    {
      itemKey: 'retry-waiting',
      targetKey: target.targetKey,
      sourceId: 'SRC-MEETINGS-001',
      externalId: 'retry-waiting',
      status: 'failed',
      attemptCount: 1,
      retryReason: 'timeout waiting for Drive',
      nextRetryAt: '2026-05-13T04:00:00.000Z',
    },
    {
      itemKey: 'retry-blocked',
      targetKey: target.targetKey,
      sourceId: 'SRC-MEETINGS-001',
      externalId: 'retry-blocked',
      status: 'failed',
      attemptCount: 1,
      retryReason: 'permission denied',
      nextRetryAt: '2026-05-13T02:00:00.000Z',
    },
  ]
  const selected = selectEligibleExtractionRetryItems(items, target, policy, { now, limit: 2 })
  const outcomes = new Map([
    ['retry-success', { status: 'succeeded', sourceCrawlRunId: 'synthetic-retry-run' }],
    ['retry-exhaust', { status: 'failed', errorMessage: 'provider still returned 500', sourceCrawlRunId: 'synthetic-retry-run' }],
  ])
  const finished = selected.map(record => finishExtractionRetryItem({
    item: record.item,
    target,
    policyInput: policy,
    now,
    outcome: outcomes.get(record.item.itemKey),
  }))
  const success = finished.find(item => item.itemKey === 'retry-success')
  const exhausted = finished.find(item => item.itemKey === 'retry-exhaust')
  const selectedKeys = selected.map(record => record.item.itemKey)
  const command = buildExtractionRetryFailedCommand({ targetKey: target.targetKey, actor: 'synthetic-proof' })
  return {
    ok: selectedKeys.join(',') === 'retry-success,retry-exhaust' &&
      success?.retryState === EXTRACTION_RETRY_STATES.SUCCEEDED &&
      exhausted?.retryState === EXTRACTION_RETRY_STATES.EXHAUSTED &&
      finished.every(item => item.attemptRecord?.table === 'source_crawl_item_attempts') &&
      !selectedKeys.includes('retry-waiting') &&
      !selectedKeys.includes('retry-blocked') &&
      command.ok === true &&
      command.args.includes('--retryFailed=true'),
    selectedKeys,
    success,
    exhausted,
    waitingUntouched: !selectedKeys.includes('retry-waiting'),
    blockedUntouched: !selectedKeys.includes('retry-blocked'),
    command,
  }
}
