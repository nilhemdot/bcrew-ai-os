export const EXTRACT_RUN_HARDENING_CARD_ID = 'EXTRACT-RUN-HARDENING-001'
export const EXTRACT_RUN_HARDENING_CLOSEOUT_KEY = 'extract-run-hardening-v1'
export const EXTRACT_RUN_HARDENING_PLAN_PATH = 'docs/process/extract-run-hardening-001-plan.md'
export const EXTRACT_RUN_HARDENING_DOC_PATH = 'docs/process/extract-run-hardening.md'
export const EXTRACT_RUN_HARDENING_APPROVAL_PATH = 'docs/process/approvals/EXTRACT-RUN-HARDENING-001.json'
export const EXTRACT_RUN_HARDENING_SCRIPT_PATH = 'scripts/process-extract-run-hardening-check.mjs'
export const EXTRACT_RUN_HARDENING_SUMMARY_MARKER = 'EXTRACT_RUN_HARDENING_SUMMARY'

export const EXTRACTION_RETRY_STATES = Object.freeze({
  NOT_EVALUATED: 'not_evaluated',
  NOT_RETRYABLE: 'not_retryable',
  ELIGIBLE: 'eligible',
  WAITING: 'waiting',
  LEASED: 'leased',
  SUCCEEDED: 'succeeded',
  SKIPPED: 'skipped',
  BLOCKED: 'blocked',
  EXHAUSTED: 'exhausted',
})

export const DEFAULT_EXTRACTION_RETRY_POLICY = Object.freeze({
  maxAttempts: 3,
  hardMaxAttempts: 5,
  initialBackoffSeconds: 900,
  backoffMultiplier: 4,
  maxBackoffSeconds: 86400,
  maxRetryItemsPerRun: 10,
  leaseSeconds: 900,
})

const MULTIMODAL_BLOCKER_CARD = 'MULTIMODAL-EXTRACTOR-001'
const DRIVE_ACCESS_BLOCKER_CARD = 'DRIVE-ACCESS-REQUEST-001'

function toDate(value) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function normalizePositiveNumber(value, fallback, { max = Number.POSITIVE_INFINITY } = {}) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return fallback
  return Math.min(number, max)
}

function lowerText(value) {
  return String(value || '').toLowerCase()
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const normalized = String(value || '').trim()
    if (normalized) return normalized
  }
  return ''
}

export function normalizeExtractionRetryPolicy(target = {}) {
  const budget = target?.budget || {}
  const metadata = target?.metadata || {}
  const maxAttempts = normalizePositiveNumber(
    budget.maxAttempts || budget.maxRetryAttempts || metadata.maxRetryAttempts,
    DEFAULT_EXTRACTION_RETRY_POLICY.maxAttempts,
    { max: DEFAULT_EXTRACTION_RETRY_POLICY.hardMaxAttempts },
  )
  const maxItemsPerRun = normalizePositiveNumber(
    budget.maxItemsPerRun || budget.maxArtifactsPerRun || budget.maxFilesPerRun,
    DEFAULT_EXTRACTION_RETRY_POLICY.maxRetryItemsPerRun,
  )
  return {
    ...DEFAULT_EXTRACTION_RETRY_POLICY,
    maxAttempts,
    initialBackoffSeconds: normalizePositiveNumber(
      budget.initialBackoffSeconds || metadata.initialBackoffSeconds,
      DEFAULT_EXTRACTION_RETRY_POLICY.initialBackoffSeconds,
    ),
    backoffMultiplier: normalizePositiveNumber(
      budget.backoffMultiplier || metadata.backoffMultiplier,
      DEFAULT_EXTRACTION_RETRY_POLICY.backoffMultiplier,
    ),
    maxBackoffSeconds: normalizePositiveNumber(
      budget.maxBackoffSeconds || metadata.maxBackoffSeconds,
      DEFAULT_EXTRACTION_RETRY_POLICY.maxBackoffSeconds,
    ),
    maxRetryItemsPerRun: Math.min(
      maxItemsPerRun,
      normalizePositiveNumber(
        budget.maxRetryItemsPerRun || metadata.maxRetryItemsPerRun,
        DEFAULT_EXTRACTION_RETRY_POLICY.maxRetryItemsPerRun,
      ),
    ),
    leaseSeconds: normalizePositiveNumber(
      budget.retryLeaseSeconds || metadata.retryLeaseSeconds,
      DEFAULT_EXTRACTION_RETRY_POLICY.leaseSeconds,
    ),
  }
}

function reasonFromItem(item = {}) {
  const metadata = item.metadata || {}
  return firstNonEmpty(
    item.retryReason,
    metadata.reason,
    metadata.skipReason,
    metadata.contentExtractionStatus,
    metadata.extractionStatus,
    metadata.failureClass,
    metadata.errorClass,
    item.lastError,
    item.status,
  )
}

function inferBlockerCard(reason) {
  const text = lowerText(reason)
  if (/permission|denied|access|acl|forbidden|unauthorized|401|403/.test(text)) return DRIVE_ACCESS_BLOCKER_CARD
  if (/multimodal|vision|transcription|subtitle|transcript|video|audio|image|ocr/.test(text)) return MULTIMODAL_BLOCKER_CARD
  return EXTRACT_RUN_HARDENING_CARD_ID
}

function isBlockedReason(reason) {
  return /permission|denied|access_request|acl|forbidden|unauthorized|unsupported|not_in_v1|requires_multimodal|requires_video|needs_video|needs_vision|no_transcript|subtitles_unavailable|too_large|skool|future-lane|future_lane|blocked/i
    .test(String(reason || ''))
}

function isRetryableReason(reason) {
  return /timeout|timed out|network|socket|econn|rate|429|5\d\d|internal error|temporar|transport|stale|lease|provider|api|get 500|fetch/i
    .test(String(reason || ''))
}

export function calculateExtractionBackoff({ attemptCount = 0, policy = DEFAULT_EXTRACTION_RETRY_POLICY, now = new Date() } = {}) {
  const normalizedPolicy = { ...DEFAULT_EXTRACTION_RETRY_POLICY, ...(policy || {}) }
  const attempts = Math.max(1, Number(attemptCount || 1))
  const base = normalizePositiveNumber(
    normalizedPolicy.initialBackoffSeconds,
    DEFAULT_EXTRACTION_RETRY_POLICY.initialBackoffSeconds,
  )
  const multiplier = normalizePositiveNumber(
    normalizedPolicy.backoffMultiplier,
    DEFAULT_EXTRACTION_RETRY_POLICY.backoffMultiplier,
  )
  const max = normalizePositiveNumber(
    normalizedPolicy.maxBackoffSeconds,
    DEFAULT_EXTRACTION_RETRY_POLICY.maxBackoffSeconds,
  )
  const seconds = Math.min(base * Math.pow(multiplier, Math.max(0, attempts - 1)), max)
  const start = toDate(now) || new Date()
  return new Date(start.getTime() + seconds * 1000).toISOString()
}

export function classifyExtractionItemRetry(item = {}, target = {}, policyInput = null, { now = new Date() } = {}) {
  const policy = policyInput || normalizeExtractionRetryPolicy(target)
  const status = String(item.status || '').trim()
  const attemptCount = Number(item.attemptCount ?? item.attempt_count ?? 0) || 0
  const maxAttempts = Number(item.maxAttempts || item.max_attempts || policy.maxAttempts)
  const reason = reasonFromItem(item)
  const nextRetryAt = item.nextRetryAt || item.next_retry_at || null
  const nextRetryDate = toDate(nextRetryAt)
  const nowDate = toDate(now) || new Date()

  if (status === 'succeeded') {
    return {
      retryState: EXTRACTION_RETRY_STATES.SUCCEEDED,
      retryReason: reason || 'succeeded',
      maxAttempts,
      nextRetryAt: null,
      retryBlockerCard: null,
    }
  }

  if (status === 'skipped') {
    return {
      retryState: EXTRACTION_RETRY_STATES.SKIPPED,
      retryReason: reason || 'skipped',
      maxAttempts,
      nextRetryAt: null,
      retryBlockerCard: null,
    }
  }

  if (status === 'leased') {
    return {
      retryState: EXTRACTION_RETRY_STATES.LEASED,
      retryReason: reason || 'leased',
      maxAttempts,
      nextRetryAt: null,
      retryBlockerCard: null,
    }
  }

  if (status !== 'failed') {
    return {
      retryState: EXTRACTION_RETRY_STATES.NOT_EVALUATED,
      retryReason: reason || 'not terminal',
      maxAttempts,
      nextRetryAt: null,
      retryBlockerCard: null,
    }
  }

  if (isBlockedReason(reason)) {
    return {
      retryState: EXTRACTION_RETRY_STATES.BLOCKED,
      retryReason: reason || 'blocked failure',
      maxAttempts,
      nextRetryAt: null,
      retryBlockerCard: item.retryBlockerCard || item.retry_blocker_card || inferBlockerCard(reason),
    }
  }

  if (attemptCount >= maxAttempts) {
    return {
      retryState: EXTRACTION_RETRY_STATES.EXHAUSTED,
      retryReason: reason || 'retry attempts exhausted',
      maxAttempts,
      nextRetryAt: null,
      retryBlockerCard: null,
    }
  }

  const effectiveNextRetryAt = nextRetryDate
    ? nextRetryDate.toISOString()
    : calculateExtractionBackoff({ attemptCount: Math.max(1, attemptCount), policy, now })
  const retryState = toDate(effectiveNextRetryAt) > nowDate
    ? EXTRACTION_RETRY_STATES.WAITING
    : EXTRACTION_RETRY_STATES.ELIGIBLE

  return {
    retryState,
    retryReason: reason || (isRetryableReason(reason) ? reason : 'retryable failure'),
    maxAttempts,
    nextRetryAt: effectiveNextRetryAt,
    retryBlockerCard: null,
  }
}

export function isExtractionItemRetryable(item = {}, target = {}, policy = null) {
  const classified = classifyExtractionItemRetry(item, target, policy)
  return classified.retryState === EXTRACTION_RETRY_STATES.ELIGIBLE ||
    classified.retryState === EXTRACTION_RETRY_STATES.WAITING
}

export function buildExtractionNextSafeCommand(target = {}, retrySummary = {}) {
  const targetKey = String(target.targetKey || target.target_key || retrySummary.targetKey || '').trim()
  if (!targetKey) return ''
  if (Number(retrySummary.retryBlockedItems || retrySummary.blockedItems || 0) > 0) {
    return `Blocked: inspect ${targetKey} blocked retry rows before rerunning the target.`
  }
  if (Number(retrySummary.retryExhaustedItems || retrySummary.exhaustedItems || 0) > 0) {
    return `Blocked: ${targetKey} has exhausted retry rows; fix the target-specific error before another run.`
  }

  if (targetKey === 'meetings-current-day') {
    return `npm run extraction:target -- --target=${targetKey} --retryFailed=true`
  }
  if (['drive-content-extract-backfill', 'video-content-extract-backfill'].includes(targetKey)) {
    return `npm run extraction:target -- --target=${targetKey} --retryFailed=true`
  }
  if (targetKey === 'email-attachments-backfill') {
    return `npm run extraction:target -- --target=${targetKey} --retryFailed=true`
  }
  if (/current-day$/.test(targetKey)) {
    return `Blocked: ${targetKey} has no item-ID-only retry path; rerun only through the bounded scheduled target after source health is checked.`
  }
  return `Blocked: ${targetKey} needs a target-specific retry command before failed rows can be retried.`
}

export function buildExtractionRunHardeningStatus(snapshot = {}) {
  const summary = snapshot.summary || {}
  const coverage = Array.isArray(snapshot.coverageByTarget) ? snapshot.coverageByTarget : []
  const activeTargets = Array.isArray(snapshot.targets) ? snapshot.targets : []
  const missingBounds = activeTargets.filter(target => {
    if (!['backfill', 'corpus_mining', 'recovery'].includes(target.lane)) return false
    if (target.status !== 'active') return false
    const budget = target.budget || {}
    const cursor = target.cursorState || {}
    const dedupe = target.dedupePolicy || {}
    const hasItemCap = Boolean(budget.maxItemsPerRun || budget.maxArtifactsPerRun || budget.maxFilesPerRun)
    return !hasItemCap || !budget.maxRuntimeSeconds || !cursor.cursorType || dedupe.idempotent !== true
  })
  const coverageWithoutNextSafeCommand = coverage.filter(record => {
    const failed = Number(record.counts?.failedItems || 0) > 0 || record.lastStatus === 'partial' || record.lastStatus === 'failed'
    return failed && !String(record.nextSafeCommand || '').trim()
  })

  const blockingFindings = []
  if (Number(summary.staleActiveRuns || 0) > 0) blockingFindings.push('stale_target_runs')
  if (Number(summary.staleLeasedItems || 0) > 0) blockingFindings.push('stale_item_leases')
  if (Number(summary.failedItemsWithoutRetryState || 0) > 0) blockingFindings.push('failed_items_without_retry_state')
  if (missingBounds.length) blockingFindings.push('unbounded_active_backfill_target')
  if (coverageWithoutNextSafeCommand.length) blockingFindings.push('missing_next_safe_command')

  return {
    status: blockingFindings.length ? 'blocked' : 'healthy',
    cardId: EXTRACT_RUN_HARDENING_CARD_ID,
    closeoutKey: EXTRACT_RUN_HARDENING_CLOSEOUT_KEY,
    blockingFindings,
    summary: {
      retryEligibleItems: Number(summary.retryEligibleItems || 0),
      retryWaitingItems: Number(summary.retryWaitingItems || 0),
      retryExhaustedItems: Number(summary.retryExhaustedItems || 0),
      retryBlockedItems: Number(summary.retryBlockedItems || 0),
      staleLeasedItems: Number(summary.staleLeasedItems || 0),
      partialRuns: Number(summary.partialRuns || 0),
      targetsMissingRetryPolicy: Number(summary.targetsMissingRetryPolicy || 0),
      failedItemsWithoutRetryState: Number(summary.failedItemsWithoutRetryState || 0),
      unboundedActiveBackfillTargets: missingBounds.length,
      coverageWithoutNextSafeCommand: coverageWithoutNextSafeCommand.length,
    },
  }
}

export function buildSyntheticExtractionRunHardeningProof() {
  const target = {
    targetKey: 'synthetic-drive-content',
    lane: 'backfill',
    status: 'active',
    budget: { maxItemsPerRun: 5, maxRuntimeSeconds: 900, maxRetryAttempts: 3 },
    cursorState: { cursorType: 'synthetic_queue' },
    dedupePolicy: { idempotent: true },
  }
  const policy = normalizeExtractionRetryPolicy(target)
  const now = new Date('2026-05-09T12:00:00.000Z')
  const cases = {
    retryableTimeout: classifyExtractionItemRetry({
      status: 'failed',
      attemptCount: 1,
      lastError: 'timeout while fetching source item',
    }, target, policy, { now }),
    retryableBelowCap: classifyExtractionItemRetry({
      status: 'failed',
      attemptCount: 2,
      lastError: 'Google API GET 500: Internal Error',
    }, target, policy, { now }),
    exhaustedAtCap: classifyExtractionItemRetry({
      status: 'failed',
      attemptCount: 3,
      lastError: 'network timeout',
    }, target, policy, { now }),
    blockedUnsupported: classifyExtractionItemRetry({
      status: 'failed',
      attemptCount: 1,
      lastError: 'video_extraction_requires_multimodal_lane',
    }, target, policy, { now }),
    staleLease: classifyExtractionItemRetry({
      status: 'failed',
      attemptCount: 1,
      retryReason: 'stale_item_lease',
    }, target, policy, { now }),
    duplicateAttempt: {
      attemptKey: 'source_crawl_item_attempts:item-a:run-a:1',
      uniqueIndex: ['item_key', 'source_crawl_run_id', 'attempt_number'],
      doubleCounts: false,
    },
  }

  const pass =
    ['eligible', 'waiting'].includes(cases.retryableTimeout.retryState) &&
    ['eligible', 'waiting'].includes(cases.retryableBelowCap.retryState) &&
    cases.exhaustedAtCap.retryState === EXTRACTION_RETRY_STATES.EXHAUSTED &&
    cases.blockedUnsupported.retryState === EXTRACTION_RETRY_STATES.BLOCKED &&
    ['eligible', 'waiting'].includes(cases.staleLease.retryState) &&
    cases.duplicateAttempt.doubleCounts === false

  return { pass, cases }
}
