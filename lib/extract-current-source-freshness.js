export const EXTRACT_CURRENT_CARD_ID = 'EXTRACT-CURRENT-001'
export const EXTRACT_CURRENT_NEXT_CARD_ID = 'EXTRACT-BACKFILL-001'
export const EXTRACT_CURRENT_CLOSEOUT_KEY = 'extract-current-source-freshness-v1'
export const EXTRACT_CURRENT_PLAN_PATH = 'docs/process/extract-current-001-plan.md'
export const EXTRACT_CURRENT_APPROVAL_PATH = 'docs/process/approvals/EXTRACT-CURRENT-001.json'
export const EXTRACT_CURRENT_SCRIPT_PATH = 'scripts/process-extract-current-check.mjs'
export const EXTRACT_CURRENT_CLOSEOUT_PATH = 'docs/handoffs/2026-05-19-extract-current-source-freshness-closeout.md'

export const EXTRACT_CURRENT_TARGETS = Object.freeze([
  {
    targetKey: 'gmail-current-day',
    sourceId: 'SRC-GMAIL-001',
    jobKey: 'gmail-sync-current',
    owner: 'Foundation Extract',
    maxFreshHours: 6,
  },
  {
    targetKey: 'missive-current-day',
    sourceId: 'SRC-MISSIVE-001',
    jobKey: 'missive-sync-current',
    owner: 'Foundation Extract',
    maxFreshHours: 6,
  },
  {
    targetKey: 'meetings-current-day',
    sourceId: 'SRC-MEETINGS-001',
    jobKey: 'meeting-notes-sync-current',
    owner: 'Foundation Extract',
    maxFreshHours: 30,
  },
  {
    targetKey: 'calendar-current-day',
    sourceId: 'SRC-GCAL-001',
    jobKey: 'calendar-sync-current',
    owner: 'Foundation Extract',
    maxFreshHours: 30,
  },
  {
    targetKey: 'slack-current-day',
    sourceId: 'SRC-SLACK-001',
    jobKey: 'slack-sync-current',
    owner: 'Foundation Extract',
    maxFreshHours: 30,
  },
])

export const EXTRACT_CURRENT_CHANGED_FILES = [
  'lib/extract-current-source-freshness.js',
  EXTRACT_CURRENT_SCRIPT_PATH,
  'package.json',
  'lib/foundation-build-closeout-process-gate-records.js',
  EXTRACT_CURRENT_PLAN_PATH,
  EXTRACT_CURRENT_APPROVAL_PATH,
  EXTRACT_CURRENT_CLOSEOUT_PATH,
]

export const EXTRACT_CURRENT_PROOF_COMMANDS = [
  `node --check lib/extract-current-source-freshness.js ${EXTRACT_CURRENT_SCRIPT_PATH}`,
  'npm run process:extract-current-check -- --apply --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${EXTRACT_CURRENT_CARD_ID} --planApprovalRef=${EXTRACT_CURRENT_APPROVAL_PATH} --closeoutKey=${EXTRACT_CURRENT_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${EXTRACT_CURRENT_CARD_ID} --closeoutKey=${EXTRACT_CURRENT_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${EXTRACT_CURRENT_CARD_ID} --planApprovalRef=${EXTRACT_CURRENT_APPROVAL_PATH} --closeoutKey=${EXTRACT_CURRENT_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const EXTRACT_CURRENT_NOT_NEXT = [
  'Do not run broad historical extraction from this card.',
  'Do not send messages or perform external writes.',
  'Do not mutate Google Drive permissions.',
  'Do not mutate credentials, provider config, or keys.',
  'Do not add new source access or paid/browser-auth work.',
  'Do not start Value Builder split.',
]

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
}

function lower(value) {
  return text(value).toLowerCase()
}

function number(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function hoursSince(value, now = new Date()) {
  const date = toDate(value)
  const nowDate = toDate(now) || new Date()
  if (!date) return Number.POSITIVE_INFINITY
  return (nowDate.getTime() - date.getTime()) / (60 * 60 * 1000)
}

function add(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function findTarget(targets, targetKey) {
  return asArray(targets).find(target => (target.targetKey || target.target_key) === targetKey) || null
}

function findJob(latestJobs, jobKey) {
  if (!latestJobs) return null
  if (Array.isArray(latestJobs)) return latestJobs.find(job => (job.jobKey || job.job_key) === jobKey) || null
  return latestJobs[jobKey] || null
}

function targetField(target, camelKey, snakeKey = camelKey) {
  return target?.[camelKey] ?? target?.[snakeKey]
}

function jobField(job, camelKey, snakeKey = camelKey) {
  return job?.[camelKey] ?? job?.[snakeKey]
}

function itemSummary(target = {}) {
  return target.itemSummary || target.item_summary || {}
}

export function evaluateExtractCurrentFixture(fixture = {}) {
  const checks = []
  const lanes = asArray(fixture.lanes)
  add(checks, lanes.length >= 5 && lanes.every(lane => lane.fresh === true), 'all current-day lanes are fresh')
  add(checks, lanes.every(lane => lane.latestJobSucceeded === true), 'latest governed current jobs succeeded')
  add(checks, fixture.partialFailuresVisible === true, 'partial failures are visible in item summaries')
  add(checks, fixture.retryDryRunHealthy === true, 'governed recovery dry-run is healthy')
  add(checks, fixture.failedItemsWithoutRetryState === 0, 'failed items cannot lack retry state')
  add(checks, fixture.unsafeActionRequested !== true, 'unsafe operation is not required for current freshness proof')
  const failed = checks.filter(check => !check.ok)
  return { ok: failed.length === 0, status: failed.length ? 'risk' : 'healthy', checks, failed }
}

export function buildExtractCurrentDogfoodProof() {
  const healthy = evaluateExtractCurrentFixture({
    lanes: EXTRACT_CURRENT_TARGETS.map(target => ({
      targetKey: target.targetKey,
      fresh: true,
      latestJobSucceeded: true,
    })),
    partialFailuresVisible: true,
    retryDryRunHealthy: true,
    failedItemsWithoutRetryState: 0,
    unsafeActionRequested: false,
  })
  const rejected = {
    staleLane: evaluateExtractCurrentFixture({
      lanes: EXTRACT_CURRENT_TARGETS.map((target, index) => ({
        targetKey: target.targetKey,
        fresh: index !== 0,
        latestJobSucceeded: true,
      })),
      partialFailuresVisible: true,
      retryDryRunHealthy: true,
      failedItemsWithoutRetryState: 0,
    }),
    hiddenPartialFailure: evaluateExtractCurrentFixture({
      lanes: EXTRACT_CURRENT_TARGETS.map(target => ({
        targetKey: target.targetKey,
        fresh: true,
        latestJobSucceeded: true,
      })),
      partialFailuresVisible: false,
      retryDryRunHealthy: true,
      failedItemsWithoutRetryState: 1,
    }),
    unsafeOperation: evaluateExtractCurrentFixture({
      lanes: EXTRACT_CURRENT_TARGETS.map(target => ({
        targetKey: target.targetKey,
        fresh: true,
        latestJobSucceeded: true,
      })),
      partialFailuresVisible: true,
      retryDryRunHealthy: true,
      failedItemsWithoutRetryState: 0,
      unsafeActionRequested: true,
    }),
  }
  return {
    ok: healthy.ok && Object.values(rejected).every(result => result.ok === false),
    healthy,
    rejected,
    invariant: 'Current-day freshness requires fresh governed lanes, latest job success, visible partial failures, retry state, and no unsafe approval-bound operation.',
  }
}

export function buildExtractCurrentSourceFreshnessStatus({
  targets = [],
  latestJobs = {},
  jobDefinitions = [],
  retryDryRun = null,
  now = new Date(),
} = {}) {
  const checks = []
  const laneStatuses = []
  const jobDefs = asArray(jobDefinitions)

  for (const expected of EXTRACT_CURRENT_TARGETS) {
    const target = findTarget(targets, expected.targetKey)
    const job = findJob(latestJobs, expected.jobKey)
    const definition = jobDefs.find(item => item.key === expected.jobKey) || null
    const summary = itemSummary(target)
    const lastRunAt = targetField(target, 'lastRunAt', 'last_run_at')
    const nextRunAt = targetField(target, 'nextRunAt', 'next_run_at')
    const finishedAt = jobField(job, 'finishedAt', 'finished_at')
    const lastRunAgeHours = hoursSince(lastRunAt, now)
    const jobAgeHours = hoursSince(finishedAt, now)
    const scheduleFresh = lastRunAgeHours <= expected.maxFreshHours
    const nextRunHealthy = !nextRunAt || hoursSince(nextRunAt, now) <= 1
    const targetStatus = targetField(target, 'status')
    const runtimeMode = targetField(target, 'runtimeMode', 'runtime_mode')
    const lastStatus = targetField(target, 'lastStatus', 'last_status')
    const sourceId = targetField(target, 'sourceId', 'source_id')
    const failedItems = number(summary.failedItems)
    const retryItems = number(summary.retryEligibleItems) + number(summary.retryWaitingItems) + number(summary.retryBlockedItems) + number(summary.retryExhaustedItems)
    const hiddenFailures = number(summary.failedItemsWithoutRetryState)

    const lane = {
      targetKey: expected.targetKey,
      sourceId,
      jobKey: expected.jobKey,
      targetStatus,
      runtimeMode,
      lastStatus,
      lastRunAt,
      nextRunAt,
      latestJobStatus: jobField(job, 'status'),
      latestJobFinishedAt: finishedAt,
      lastRunAgeHours: Number.isFinite(lastRunAgeHours) ? Number(lastRunAgeHours.toFixed(2)) : null,
      latestJobAgeHours: Number.isFinite(jobAgeHours) ? Number(jobAgeHours.toFixed(2)) : null,
      totalItems: number(summary.totalItems),
      last24hItems: number(summary.last24hItems),
      failedItems,
      retryItems,
      failedItemsWithoutRetryState: hiddenFailures,
      fresh: Boolean(target && job && scheduleFresh && nextRunHealthy && lastStatus === 'succeeded' && jobField(job, 'status') === 'succeeded'),
    }
    laneStatuses.push(lane)

    add(checks, Boolean(target), `${expected.targetKey} target exists`, target ? expected.targetKey : 'missing')
    add(checks, sourceId === expected.sourceId, `${expected.targetKey} source id matches contract`, sourceId || 'missing')
    add(checks, targetStatus === 'active' && runtimeMode === 'scheduled', `${expected.targetKey} is active scheduled current-day lane`, `${targetStatus || 'missing'}/${runtimeMode || 'missing'}`)
    add(checks, lastStatus === 'succeeded', `${expected.targetKey} latest target state succeeded`, lastStatus || 'missing')
    add(checks, scheduleFresh, `${expected.targetKey} last run is fresh`, lastRunAt ? `${lastRunAt} age=${lane.lastRunAgeHours}h max=${expected.maxFreshHours}h` : 'missing')
    add(checks, nextRunHealthy, `${expected.targetKey} is not overdue`, nextRunAt || 'no next run')
    add(checks, definition?.runtimeMode === 'scheduled' && asArray(definition?.sourceIds).includes(expected.sourceId), `${expected.jobKey} is governed scheduled job for source`, definition ? `${definition.runtimeMode}/${asArray(definition.sourceIds).join(',')}` : 'missing')
    add(checks, jobField(job, 'status') === 'succeeded', `${expected.jobKey} latest governed job succeeded`, job ? `${jobField(job, 'status')} ${finishedAt || ''}` : 'missing')
    add(checks, number(summary.totalItems) > 0, `${expected.targetKey} has item-level crawl proof`, `totalItems=${number(summary.totalItems)}`)
    add(checks, hiddenFailures === 0, `${expected.targetKey} has no hidden failed items without retry state`, `failedItemsWithoutRetryState=${hiddenFailures}`)
    add(checks, failedItems === 0 || retryItems >= failedItems, `${expected.targetKey} partial failures are visible and retry-classified`, `failedItems=${failedItems} retryItems=${retryItems}`)
  }

  const currentDayFailedItems = laneStatuses.reduce((sum, lane) => sum + lane.failedItems, 0)
  const hiddenFailedItems = laneStatuses.reduce((sum, lane) => sum + lane.failedItemsWithoutRetryState, 0)
  const recoveryJob = jobDefs.find(item => item.key === 'extraction-retry-failed') || null
  add(checks, laneStatuses.length === EXTRACT_CURRENT_TARGETS.length, 'all expected current-day lanes are evaluated', String(laneStatuses.length))
  add(checks, currentDayFailedItems === 0, 'current-day failed items are repaired to fresh slate', `failedItems=${currentDayFailedItems}`)
  add(checks, hiddenFailedItems === 0, 'current-day failed-item ledger has no hidden retry gaps', `hiddenFailedItems=${hiddenFailedItems}`)
  add(checks, recoveryJob?.runtimeMode === 'manual' && lower(recoveryJob?.nextAction).includes('dry-run first'), 'governed recovery job stays manual and dry-run-first', recoveryJob ? `${recoveryJob.runtimeMode}/${recoveryJob.key}` : 'missing')
  add(checks, retryDryRun?.status === 'healthy' && retryDryRun?.supported === true && Number(retryDryRun?.eligibleItemCount || 0) === 0, 'governed recovery dry-run is healthy with no remaining eligible current failures', retryDryRun ? `${retryDryRun.status} eligible=${retryDryRun.eligibleItemCount}` : 'missing')
  add(checks, !text(retryDryRun?.blockedReason), 'governed recovery dry-run is not blocked', retryDryRun?.blockedReason || 'not blocked')

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    cardId: EXTRACT_CURRENT_CARD_ID,
    closeoutKey: EXTRACT_CURRENT_CLOSEOUT_KEY,
    laneStatuses,
    retryDryRun,
    summary: {
      expectedTargetCount: EXTRACT_CURRENT_TARGETS.length,
      evaluatedTargetCount: laneStatuses.length,
      freshLaneCount: laneStatuses.filter(lane => lane.fresh).length,
      failedItems: currentDayFailedItems,
      hiddenFailedItems,
    },
    checks,
    failed,
  }
}
