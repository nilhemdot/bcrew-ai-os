export const EXTRACT_BACKFILL_CARD_ID = 'EXTRACT-BACKFILL-001'
export const EXTRACT_BACKFILL_NEXT_CARD_ID = 'DRIVE-CONTENT-001'
export const EXTRACT_BACKFILL_CLOSEOUT_KEY = 'extract-backfill-cursor-contract-v1'
export const EXTRACT_BACKFILL_PLAN_PATH = 'docs/process/extract-backfill-001-plan.md'
export const EXTRACT_BACKFILL_APPROVAL_PATH = 'docs/process/approvals/EXTRACT-BACKFILL-001.json'
export const EXTRACT_BACKFILL_SCRIPT_PATH = 'scripts/process-extract-backfill-check.mjs'
export const EXTRACT_BACKFILL_CLOSEOUT_PATH = 'docs/handoffs/2026-05-19-extract-backfill-cursor-contract-closeout.md'

export const EXTRACT_BACKFILL_ACTIVE_TARGETS = Object.freeze([
  {
    targetKey: 'drive-corpus-backfill',
    sourceId: 'SRC-GDRIVE-001',
    lane: 'backfill',
    targetType: 'drive_folder_bites',
    jobKey: 'drive-corpus-inventory-bite',
    maxFreshHours: 36,
    maxItemCap: 100,
    maxFolderCap: 1,
    owner: 'Foundation Extract',
  },
  {
    targetKey: 'drive-content-extract-backfill',
    sourceId: 'SRC-GDRIVE-001',
    lane: 'backfill',
    targetType: 'drive_file_content_text',
    jobKey: 'drive-content-extract-bite',
    maxFreshHours: 36,
    maxItemCap: 5,
    requiresFiledOutput: true,
    owner: 'Foundation Extract',
  },
  {
    targetKey: 'email-attachments-backfill',
    sourceId: 'SRC-GMAIL-001',
    lane: 'backfill',
    targetType: 'gmail_attachment_text',
    jobKey: 'email-attachment-extract-bite',
    maxFreshHours: 36,
    maxItemCap: 5,
    requiresFiledOutput: true,
    owner: 'Foundation Extract',
  },
  {
    targetKey: 'video-content-extract-backfill',
    sourceId: 'SRC-VIDEO-001',
    lane: 'corpus_mining',
    targetType: 'video_transcript_text',
    jobKey: 'video-content-extract-bite',
    maxFreshHours: 36,
    maxItemCap: 5,
    requiresFiledOutput: true,
    owner: 'Foundation Extract',
  },
])

export const EXTRACT_BACKFILL_PARKED_TARGETS = Object.freeze([
  {
    targetKey: 'skool-corpus-backfill',
    sourceId: 'SRC-SKOOL-001',
    allowedStatus: 'blocked',
    allowedRuntimeMode: 'paused',
    requiredBlocker: 'approved export/API/admin path and content-use boundary',
    owner: 'Steve approval / Foundation Extract',
  },
  {
    targetKey: 'zoom-audio-recovery-backfill',
    sourceId: 'SRC-MEETINGS-001',
    allowedStatus: 'paused',
    allowedRuntimeMode: 'paused',
    requiredBlocker: 'strategy/content value justifies transcription cost',
    owner: 'Steve approval / Foundation Extract',
  },
  {
    targetKey: 'old-system-report-mining',
    sourceId: 'SRC-GDRIVE-001',
    allowedStatus: 'planned',
    allowedRuntimeMode: 'manual',
    requiredBlocker: 'manual quota mission after higher-priority extraction cards',
    owner: 'Foundation Extract',
  },
  {
    targetKey: 'video-link-inventory',
    sourceId: 'SRC-VIDEO-001',
    allowedStatus: 'planned',
    allowedRuntimeMode: 'manual',
    requiredBlocker: 'safe local link inventory only; platform extraction needs explicit lanes',
    owner: 'Foundation Extract',
  },
])

export const EXTRACT_BACKFILL_JOB_ONLY_LANES = Object.freeze([
  {
    jobKey: 'meeting-transcripts-extract-backlog',
    sourceId: 'SRC-MEETINGS-001',
    maxFreshHours: 36,
    maxItemsPerRun: 3,
    owner: 'Foundation Extract',
  },
])

export const EXTRACT_BACKFILL_CHANGED_FILES = [
  'lib/extract-backfill-cursor-contract.js',
  EXTRACT_BACKFILL_SCRIPT_PATH,
  'package.json',
  'lib/foundation-build-closeout-process-gate-records.js',
  EXTRACT_BACKFILL_PLAN_PATH,
  EXTRACT_BACKFILL_APPROVAL_PATH,
  EXTRACT_BACKFILL_CLOSEOUT_PATH,
]

export const EXTRACT_BACKFILL_PROOF_COMMANDS = [
  `node --check lib/extract-backfill-cursor-contract.js ${EXTRACT_BACKFILL_SCRIPT_PATH}`,
  'npm run process:extract-backfill-check -- --apply --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${EXTRACT_BACKFILL_CARD_ID} --planApprovalRef=${EXTRACT_BACKFILL_APPROVAL_PATH} --closeoutKey=${EXTRACT_BACKFILL_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${EXTRACT_BACKFILL_CARD_ID} --closeoutKey=${EXTRACT_BACKFILL_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${EXTRACT_BACKFILL_CARD_ID} --planApprovalRef=${EXTRACT_BACKFILL_APPROVAL_PATH} --closeoutKey=${EXTRACT_BACKFILL_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const EXTRACT_BACKFILL_NOT_NEXT = [
  'Do not run broad historical extraction from this card.',
  'Do not send messages or perform external writes.',
  'Do not mutate Google Drive permissions.',
  'Do not mutate credentials, provider config, or keys.',
  'Do not add new source access, paid/provider access, or browser-auth work.',
  'Do not treat skipped unsupported file/source classes as failures when they have explicit skip reasons and follow-on lanes.',
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

function findByKey(items, keyName, keyValue) {
  return asArray(items).find(item => (item?.[keyName] || item?.[keyName.replace(/[A-Z]/g, match => `_${match.toLowerCase()}`)]) === keyValue) || null
}

function findTarget(targets, targetKey) {
  return findByKey(targets, 'targetKey', targetKey)
}

function findCoverage(coverageByTarget, targetKey) {
  return findByKey(coverageByTarget, 'targetKey', targetKey)
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

function hasItemCap(budget = {}) {
  return Boolean(budget.maxItemsPerRun || budget.maxArtifactsPerRun || budget.maxFilesPerRun || budget.maxFoldersPerRun)
}

function itemCapValue(budget = {}) {
  return number(budget.maxItemsPerRun || budget.maxArtifactsPerRun || budget.maxFilesPerRun || budget.maxFoldersPerRun)
}

function blockerText(target = {}) {
  return [
    target.metadata?.blockedBy,
    target.metadata?.promotionGate,
    target.notes,
  ].map(text).join(' ')
}

function skippedReasons(summary = {}) {
  return asArray(summary.reasons).filter(reason => reason.status === 'skipped' && text(reason.reason))
}

function hasCheckpoint(cursorState = {}) {
  return Boolean(
    cursorState.lastRunnerAt ||
    cursorState.driveInventory ||
    cursorState.driveContentExtraction ||
    cursorState.emailAttachmentExtraction ||
    cursorState.videoContentExtraction ||
    cursorState.lastScannedAt ||
    cursorState.recoveredThrough ||
    cursorState.inspectedReports !== undefined,
  )
}

function commandIncludesTarget(definition, targetKey) {
  return asArray(definition?.args).some(arg => text(arg).includes(targetKey))
}

export function evaluateExtractBackfillFixture(fixture = {}) {
  const checks = []
  const active = asArray(fixture.activeTargets)
  const parked = asArray(fixture.parkedTargets)
  add(checks, active.length >= 4, 'fixture has expected active historical lanes')
  add(checks, active.every(target => target.active === true && target.scheduled === true), 'active historical lanes are active scheduled')
  add(checks, active.every(target => target.cursor === true && target.checkpoint === true), 'active historical lanes have durable cursor/checkpoint state')
  add(checks, active.every(target => target.bounded === true && target.idempotent === true), 'active historical lanes are bounded and idempotent')
  add(checks, active.every(target => target.latestSucceeded === true), 'active historical lanes have latest success')
  add(checks, active.every(target => target.failedItems === 0 && target.hiddenFailures === 0), 'active historical lanes have no hidden failed items')
  add(checks, active.every(target => target.skippedItems === 0 || target.skipReasons === true), 'skipped items have explicit skip reasons')
  add(checks, parked.every(target => target.parked === true && target.reason === true && target.owner === true), 'paused/blocked lanes have owner and reason')
  add(checks, fixture.unsafeBroadExtractionRequested !== true, 'broad unsafe extraction is not required')
  const failed = checks.filter(check => !check.ok)
  return { ok: failed.length === 0, status: failed.length ? 'risk' : 'healthy', checks, failed }
}

export function buildExtractBackfillDogfoodProof() {
  const activeTargets = EXTRACT_BACKFILL_ACTIVE_TARGETS.map(target => ({
    targetKey: target.targetKey,
    active: true,
    scheduled: true,
    cursor: true,
    checkpoint: true,
    bounded: true,
    idempotent: true,
    latestSucceeded: true,
    failedItems: 0,
    hiddenFailures: 0,
    skippedItems: target.targetKey === 'drive-content-extract-backfill' ? 1 : 0,
    skipReasons: true,
  }))
  const parkedTargets = EXTRACT_BACKFILL_PARKED_TARGETS.map(target => ({
    targetKey: target.targetKey,
    parked: true,
    reason: true,
    owner: true,
  }))
  const healthy = evaluateExtractBackfillFixture({
    activeTargets,
    parkedTargets,
    unsafeBroadExtractionRequested: false,
  })
  const rejected = {
    unboundedActiveLane: evaluateExtractBackfillFixture({
      activeTargets: activeTargets.map((target, index) => index === 0 ? { ...target, bounded: false } : target),
      parkedTargets,
    }),
    missingCursor: evaluateExtractBackfillFixture({
      activeTargets: activeTargets.map((target, index) => index === 1 ? { ...target, cursor: false } : target),
      parkedTargets,
    }),
    hiddenPartialFailure: evaluateExtractBackfillFixture({
      activeTargets: activeTargets.map((target, index) => index === 2 ? { ...target, hiddenFailures: 1 } : target),
      parkedTargets,
    }),
    skippedWithoutReason: evaluateExtractBackfillFixture({
      activeTargets: activeTargets.map((target, index) => index === 3 ? { ...target, skippedItems: 2, skipReasons: false } : target),
      parkedTargets,
    }),
    parkedWithoutOwner: evaluateExtractBackfillFixture({
      activeTargets,
      parkedTargets: parkedTargets.map((target, index) => index === 0 ? { ...target, owner: false } : target),
    }),
    unsafeBroadExtraction: evaluateExtractBackfillFixture({
      activeTargets,
      parkedTargets,
      unsafeBroadExtractionRequested: true,
    }),
  }
  return {
    ok: healthy.ok && Object.values(rejected).every(result => result.ok === false),
    healthy,
    rejected,
    invariant: 'Backfill lanes must be bounded, cursored, idempotent, latest-success, skip/retry visible, and approval-bound work must be parked with owner/reason instead of making the whole sprint stop.',
  }
}

export function buildExtractBackfillCursorContractStatus({
  targets = [],
  coverageByTarget = [],
  latestJobs = {},
  jobDefinitions = [],
  now = new Date(),
} = {}) {
  const checks = []
  const activeLaneStatuses = []
  const parkedLaneStatuses = []
  const jobOnlyStatuses = []
  const jobDefs = asArray(jobDefinitions)

  for (const expected of EXTRACT_BACKFILL_ACTIVE_TARGETS) {
    const target = findTarget(targets, expected.targetKey)
    const coverage = findCoverage(coverageByTarget, expected.targetKey)
    const definition = jobDefs.find(item => item.key === expected.jobKey) || null
    const job = findJob(latestJobs, expected.jobKey)
    const summary = itemSummary(target)
    const budget = target?.budget || {}
    const cursorState = target?.cursorState || {}
    const dedupePolicy = target?.dedupePolicy || {}
    const lastRunAt = targetField(target, 'lastRunAt', 'last_run_at')
    const nextRunAt = targetField(target, 'nextRunAt', 'next_run_at')
    const lastRunAgeHours = hoursSince(lastRunAt, now)
    const jobFinishedAt = jobField(job, 'finishedAt', 'finished_at')
    const jobAgeHours = hoursSince(jobFinishedAt, now)
    const failedItems = number(summary.failedItems)
    const hiddenFailures = number(summary.failedItemsWithoutRetryState)
    const skippedItems = number(summary.skippedItems)
    const retryItems = number(summary.retryEligibleItems) + number(summary.retryWaitingItems) + number(summary.retryExhaustedItems) + number(summary.retryBlockedItems)
    const capValue = itemCapValue(budget)
    const capHealthy = hasItemCap(budget) && (!expected.maxItemCap || capValue <= expected.maxItemCap)
    const folderCapHealthy = !expected.maxFolderCap || number(budget.maxFoldersPerRun) <= expected.maxFolderCap
    const status = {
      targetKey: expected.targetKey,
      sourceId: targetField(target, 'sourceId', 'source_id'),
      lane: targetField(target, 'lane'),
      status: targetField(target, 'status'),
      runtimeMode: targetField(target, 'runtimeMode', 'runtime_mode'),
      targetType: targetField(target, 'targetType', 'target_type'),
      jobKey: expected.jobKey,
      latestJobStatus: jobField(job, 'status'),
      lastStatus: targetField(target, 'lastStatus', 'last_status'),
      lastRunAt,
      nextRunAt,
      lastRunAgeHours: Number.isFinite(lastRunAgeHours) ? Number(lastRunAgeHours.toFixed(2)) : null,
      latestJobAgeHours: Number.isFinite(jobAgeHours) ? Number(jobAgeHours.toFixed(2)) : null,
      cursorType: cursorState.cursorType || null,
      hasCheckpoint: hasCheckpoint(cursorState),
      missionMode: budget.missionMode || null,
      missionUnit: budget.missionUnit || null,
      capValue,
      maxRuntimeSeconds: number(budget.maxRuntimeSeconds),
      requiresFiledOutput: Boolean(budget.requiresFiledOutput),
      idempotent: dedupePolicy.idempotent === true,
      totalItems: number(summary.totalItems),
      succeededItems: number(summary.succeededItems),
      skippedItems,
      failedItems,
      retryItems,
      hiddenFailures,
      skipReasons: skippedReasons(summary).map(reason => ({ reason: reason.reason, count: number(reason.count) })),
      hardeningStatus: coverage?.hardeningStatus,
      nextSafeCommand: coverage?.nextSafeCommand || null,
    }
    activeLaneStatuses.push(status)

    add(checks, Boolean(target), `${expected.targetKey} target exists`, target ? expected.targetKey : 'missing')
    add(checks, status.sourceId === expected.sourceId, `${expected.targetKey} source id matches contract`, status.sourceId || 'missing')
    add(checks, status.lane === expected.lane, `${expected.targetKey} lane matches contract`, status.lane || 'missing')
    add(checks, status.targetType === expected.targetType, `${expected.targetKey} target type matches contract`, status.targetType || 'missing')
    add(checks, status.status === 'active' && status.runtimeMode === 'scheduled', `${expected.targetKey} is active scheduled`, `${status.status || 'missing'}/${status.runtimeMode || 'missing'}`)
    add(checks, status.lastStatus === 'succeeded', `${expected.targetKey} latest target state succeeded`, status.lastStatus || 'missing')
    add(checks, lastRunAgeHours <= expected.maxFreshHours, `${expected.targetKey} latest backfill bite is fresh`, lastRunAt ? `${lastRunAt} age=${status.lastRunAgeHours}h max=${expected.maxFreshHours}h` : 'missing')
    add(checks, Boolean(nextRunAt), `${expected.targetKey} exposes next scheduled bite`, nextRunAt || 'missing')
    add(checks, Boolean(status.cursorType), `${expected.targetKey} has durable cursor type`, status.cursorType || 'missing')
    add(checks, status.hasCheckpoint, `${expected.targetKey} has checkpoint/progress state`, JSON.stringify(cursorState).slice(0, 180))
    add(checks, budget.missionMode === 'daily_quota' && Boolean(budget.missionUnit), `${expected.targetKey} is a daily quota mission`, `${budget.missionMode || 'missing'}/${budget.missionUnit || 'missing'}`)
    add(checks, capHealthy && folderCapHealthy, `${expected.targetKey} has bounded bite cap`, `cap=${capValue} max=${expected.maxItemCap || expected.maxFolderCap || 'any'}`)
    add(checks, number(budget.maxRuntimeSeconds) > 0, `${expected.targetKey} has runtime cap`, `maxRuntimeSeconds=${number(budget.maxRuntimeSeconds)}`)
    add(checks, !expected.requiresFiledOutput || budget.requiresFiledOutput === true, `${expected.targetKey} filed-output requirement is explicit`, `requiresFiledOutput=${Boolean(budget.requiresFiledOutput)}`)
    add(checks, dedupePolicy.idempotent === true && Boolean(text(dedupePolicy.key)), `${expected.targetKey} dedupe is idempotent`, text(dedupePolicy.key) || 'missing')
    add(checks, definition?.runtimeMode === 'scheduled' && commandIncludesTarget(definition, expected.targetKey), `${expected.jobKey} is governed scheduled target job`, definition ? `${definition.runtimeMode}/${asArray(definition.args).join(' ')}` : 'missing')
    add(checks, jobField(job, 'status') === 'succeeded', `${expected.jobKey} latest governed job succeeded`, job ? `${jobField(job, 'status')} ${jobFinishedAt || ''}` : 'missing')
    add(checks, jobAgeHours <= expected.maxFreshHours, `${expected.jobKey} latest governed job is fresh`, jobFinishedAt ? `${jobFinishedAt} age=${status.latestJobAgeHours}h max=${expected.maxFreshHours}h` : 'missing')
    add(checks, number(summary.totalItems) > 0, `${expected.targetKey} has item-level backfill proof`, `totalItems=${number(summary.totalItems)}`)
    add(checks, failedItems === 0, `${expected.targetKey} has zero failed items`, `failedItems=${failedItems}`)
    add(checks, hiddenFailures === 0, `${expected.targetKey} has no hidden failed items without retry state`, `hiddenFailures=${hiddenFailures}`)
    add(checks, retryItems === 0, `${expected.targetKey} has no unresolved retry queue`, `retryItems=${retryItems}`)
    add(checks, skippedItems === 0 || skippedReasons(summary).length > 0, `${expected.targetKey} skipped items have explicit reasons`, `skipped=${skippedItems} reasons=${skippedReasons(summary).length}`)
    add(checks, coverage?.hardeningStatus === 'healthy', `${expected.targetKey} coverage hardening is healthy`, coverage?.hardeningStatus || 'missing')
  }

  for (const expected of EXTRACT_BACKFILL_PARKED_TARGETS) {
    const target = findTarget(targets, expected.targetKey)
    const budget = target?.budget || {}
    const cursorState = target?.cursorState || {}
    const dedupePolicy = target?.dedupePolicy || {}
    const reasonText = lower(blockerText(target))
    const status = {
      targetKey: expected.targetKey,
      sourceId: targetField(target, 'sourceId', 'source_id'),
      status: targetField(target, 'status'),
      runtimeMode: targetField(target, 'runtimeMode', 'runtime_mode'),
      cursorType: cursorState.cursorType || null,
      missionMode: budget.missionMode || null,
      missionUnit: budget.missionUnit || null,
      capValue: itemCapValue(budget),
      maxRuntimeSeconds: number(budget.maxRuntimeSeconds),
      idempotent: dedupePolicy.idempotent === true,
      owner: expected.owner,
      blocker: blockerText(target),
    }
    parkedLaneStatuses.push(status)
    add(checks, Boolean(target), `${expected.targetKey} parked target exists`, target ? expected.targetKey : 'missing')
    add(checks, status.sourceId === expected.sourceId, `${expected.targetKey} parked source id matches contract`, status.sourceId || 'missing')
    add(checks, status.status === expected.allowedStatus && status.runtimeMode === expected.allowedRuntimeMode, `${expected.targetKey} is intentionally parked`, `${status.status || 'missing'}/${status.runtimeMode || 'missing'}`)
    add(checks, Boolean(status.cursorType), `${expected.targetKey} parked lane still has cursor type`, status.cursorType || 'missing')
    add(checks, hasItemCap(budget) && number(budget.maxRuntimeSeconds) > 0, `${expected.targetKey} parked lane has bounded resume budget`, `cap=${status.capValue} runtime=${status.maxRuntimeSeconds}`)
    add(checks, dedupePolicy.idempotent === true && Boolean(text(dedupePolicy.key)), `${expected.targetKey} parked lane dedupe is idempotent`, text(dedupePolicy.key) || 'missing')
    const requiredTokens = lower(expected.requiredBlocker).split(/\s+/).filter(token => token.length > 3)
    add(checks, requiredTokens.some(token => reasonText.includes(token)), `${expected.targetKey} parked lane has reason/next trigger`, status.blocker || 'missing')
    add(checks, Boolean(expected.owner), `${expected.targetKey} parked lane has owner`, expected.owner)
  }

  for (const expected of EXTRACT_BACKFILL_JOB_ONLY_LANES) {
    const definition = jobDefs.find(item => item.key === expected.jobKey) || null
    const job = findJob(latestJobs, expected.jobKey)
    const finishedAt = jobField(job, 'finishedAt', 'finished_at')
    const ageHours = hoursSince(finishedAt, now)
    const args = asArray(definition?.args)
    const status = {
      jobKey: expected.jobKey,
      latestJobStatus: jobField(job, 'status'),
      finishedAt,
      ageHours: Number.isFinite(ageHours) ? Number(ageHours.toFixed(2)) : null,
      sourceIds: asArray(definition?.sourceIds),
      args,
      owner: expected.owner,
    }
    jobOnlyStatuses.push(status)
    add(checks, definition?.runtimeMode === 'scheduled' && asArray(definition?.sourceIds).includes(expected.sourceId), `${expected.jobKey} is governed scheduled job-only backfill`, definition ? `${definition.runtimeMode}/${asArray(definition.sourceIds).join(',')}` : 'missing')
    add(checks, args.some(arg => text(arg).includes(`--limit=${expected.maxItemsPerRun}`)), `${expected.jobKey} has bounded bite size`, args.join(' '))
    add(checks, jobField(job, 'status') === 'succeeded', `${expected.jobKey} latest governed job succeeded`, job ? `${jobField(job, 'status')} ${finishedAt || ''}` : 'missing')
    add(checks, ageHours <= expected.maxFreshHours, `${expected.jobKey} latest governed job is fresh`, finishedAt ? `${finishedAt} age=${status.ageHours}h max=${expected.maxFreshHours}h` : 'missing')
  }

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    cardId: EXTRACT_BACKFILL_CARD_ID,
    closeoutKey: EXTRACT_BACKFILL_CLOSEOUT_KEY,
    activeLaneStatuses,
    parkedLaneStatuses,
    jobOnlyStatuses,
    summary: {
      activeLaneCount: activeLaneStatuses.length,
      parkedLaneCount: parkedLaneStatuses.length,
      jobOnlyLaneCount: jobOnlyStatuses.length,
      failedItems: activeLaneStatuses.reduce((sum, lane) => sum + lane.failedItems, 0),
      hiddenFailures: activeLaneStatuses.reduce((sum, lane) => sum + lane.hiddenFailures, 0),
      unresolvedRetryItems: activeLaneStatuses.reduce((sum, lane) => sum + lane.retryItems, 0),
      skippedItemsWithReasons: activeLaneStatuses.reduce((sum, lane) => sum + (lane.skippedItems > 0 && lane.skipReasons.length > 0 ? lane.skippedItems : 0), 0),
    },
    checks,
    failed,
  }
}
