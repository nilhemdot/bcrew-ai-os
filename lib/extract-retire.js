export const EXTRACT_RETIRE_CARD_ID = 'EXTRACT-RETIRE-001'
export const EXTRACT_RETIRE_SPRINT_ID = 'extract-retire-2026-05-16'
export const EXTRACT_RETIRE_CLOSEOUT_KEY = 'extract-retire-v1'
export const EXTRACT_RETIRE_PLAN_PATH = 'docs/process/extract-retire-001-plan.md'
export const EXTRACT_RETIRE_APPROVAL_PATH = 'docs/process/approvals/EXTRACT-RETIRE-001.json'
export const EXTRACT_RETIRE_SCRIPT_PATH = 'scripts/process-extract-retire-check.mjs'
export const EXTRACT_RETIRE_HANDOFF_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-16-extract-retire-closeout.md'
export const EXTRACT_RETIRE_POLICY_VERSION = 'extract-retire-v1'
export const EXTRACT_RETIRE_DEFAULT_CLEAN_RUN_THRESHOLD = 2

const CURRENT_DAY_LANES = new Set(['current_day', 'current_day_sync'])
const RETIRE_ELIGIBLE_LANES = new Set(['backfill', 'history', 'historical', 'corpus_mining'])

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function summary(checks) {
  return {
    total: checks.length,
    passed: checks.filter(check => check.ok).length,
    failed: checks.filter(check => !check.ok).length,
  }
}

function asNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase()
}

function isCurrentDayTarget(target = {}) {
  const lane = normalizeKey(target.lane)
  const targetType = normalizeKey(target.targetType || target.target_type)
  const targetKey = normalizeKey(target.targetKey || target.target_key)
  return CURRENT_DAY_LANES.has(lane) ||
    targetType.includes('current') ||
    targetKey.includes('current-day') ||
    targetKey.includes('current_day')
}

function isRetirementEligibleTarget(target = {}) {
  if (isCurrentDayTarget(target)) return false
  const lane = normalizeKey(target.lane)
  const targetType = normalizeKey(target.targetType || target.target_type)
  return RETIRE_ELIGIBLE_LANES.has(lane) ||
    targetType.includes('backfill') ||
    targetType.includes('history') ||
    targetType.includes('historical') ||
    targetType.includes('corpus')
}

function getCleanRunThreshold(target = {}) {
  const budget = target.budget || {}
  const metadata = target.metadata || {}
  const policy = metadata.retirementPolicy || metadata.extractRetirePolicy || {}
  const candidates = [
    budget.retireAfterCleanRuns,
    budget.cleanRunRetireThreshold,
    policy.cleanRunThreshold,
    policy.retireAfterCleanRuns,
  ]
  for (const candidate of candidates) {
    const value = Number(candidate)
    if (Number.isFinite(value) && value > 0) return Math.max(1, Math.floor(value))
  }
  return EXTRACT_RETIRE_DEFAULT_CLEAN_RUN_THRESHOLD
}

function getPreviousCleanStreak(target = {}) {
  const state = target.metadata?.extractRetire || {}
  return Math.max(0, Math.floor(asNumber(state.cleanZeroWorkRunStreak, 0)))
}

export function buildExtractRetireDecision({
  target = {},
  runInput = {},
  now = new Date().toISOString(),
} = {}) {
  const status = String(runInput.lastStatus || 'succeeded').trim()
  const inspectedDelta = asNumber(runInput.inspectedDelta, 0)
  const archivedDelta = asNumber(runInput.archivedDelta, 0)
  const extractedDelta = asNumber(runInput.extractedDelta, 0)
  const zeroWork = status === 'succeeded' && inspectedDelta === 0 && archivedDelta === 0 && extractedDelta === 0
  const previousStreak = getPreviousCleanStreak(target)
  const cleanZeroWorkRunStreak = zeroWork ? previousStreak + 1 : 0
  const cleanRunThreshold = getCleanRunThreshold(target)
  const currentDay = isCurrentDayTarget(target)
  const eligible = isRetirementEligibleTarget(target)
  const alreadyTerminal = ['blocked', 'paused', 'complete'].includes(String(target.status || '').trim())
  const shouldRetire = eligible && !alreadyTerminal && zeroWork && cleanZeroWorkRunStreak >= cleanRunThreshold
  const reason = currentDay
    ? 'current_day_targets_remain_scheduled'
    : !eligible
      ? 'target_lane_not_retirement_eligible'
      : alreadyTerminal
        ? 'target_already_terminal'
        : !zeroWork
          ? 'latest_run_not_clean_zero_work'
          : cleanZeroWorkRunStreak < cleanRunThreshold
            ? 'clean_zero_work_threshold_not_met'
            : 'clean_zero_work_threshold_met'

  return {
    policyVersion: EXTRACT_RETIRE_POLICY_VERSION,
    evaluatedAt: now,
    targetKey: target.targetKey || target.target_key || null,
    lane: target.lane || null,
    targetType: target.targetType || target.target_type || null,
    currentDay,
    eligible,
    alreadyTerminal,
    lastRunStatus: status,
    zeroWork,
    previousCleanZeroWorkRunStreak: previousStreak,
    cleanZeroWorkRunStreak,
    cleanRunThreshold,
    inspectedDelta,
    archivedDelta,
    extractedDelta,
    shouldRetire,
    action: shouldRetire ? 'complete_and_pause_target' : 'keep_target_scheduled',
    reason,
    retiredAt: shouldRetire ? now : null,
  }
}

export function buildExtractRetireRunUpdate({
  target = {},
  runInput = {},
  now = new Date().toISOString(),
} = {}) {
  const decision = buildExtractRetireDecision({ target, runInput, now })
  return {
    decision,
    status: decision.shouldRetire ? 'complete' : null,
    runtimeMode: decision.shouldRetire ? 'paused' : null,
    nextRunAt: decision.shouldRetire ? null : (runInput.nextRunAt || null),
    metadata: {
      extractRetire: decision,
    },
  }
}

export function evaluateExtractRetireSources({
  moduleSource = '',
  sourceCrawlStoreSource = '',
  extractionRuntimeVerifierSource = '',
  packageSource = '',
  proofScriptSource = '',
  planSource = '',
  currentPlan = '',
  currentState = '',
} = {}) {
  const checks = []
  addCheck(
    checks,
    moduleSource.includes('export function buildExtractRetireDecision') &&
      moduleSource.includes('export function buildExtractRetireRunUpdate') &&
      moduleSource.includes('current_day_targets_remain_scheduled') &&
      moduleSource.includes('clean_zero_work_threshold_met'),
    'extract-retire helper owns bounded retirement decisions',
    'pure helper includes current-day exclusion and clean zero-work threshold',
  )
  addCheck(
    checks,
    sourceCrawlStoreSource.includes("from './extract-retire.js'") &&
      sourceCrawlStoreSource.includes('buildExtractRetireRunUpdate') &&
      sourceCrawlStoreSource.includes('status = COALESCE($12, status)') &&
      sourceCrawlStoreSource.includes('runtime_mode = COALESCE($13, runtime_mode)') &&
      sourceCrawlStoreSource.includes('stopped target statuses use target stop-state scheduling'),
    'source-crawl finish path applies retirement without a new schema',
    'finishSourceCrawlTargetRun sets complete/paused/null next run when helper says to retire',
  )
  addCheck(
    checks,
    extractionRuntimeVerifierSource.includes(EXTRACT_RETIRE_CARD_ID) &&
      extractionRuntimeVerifierSource.includes('evaluateExtractRetireSources'),
    'extraction runtime verifier has thin EXTRACT-RETIRE coverage',
    'card ID and source evaluator are wired',
  )
  addCheck(
    checks,
    packageSource.includes(`"process:extract-retire-check": "node --env-file-if-exists=.env ${EXTRACT_RETIRE_SCRIPT_PATH}"`) &&
      proofScriptSource.includes('buildSourceCrawlStoreRetirementDogfoodProof') &&
      proofScriptSource.includes('focused proof script is read-only'),
    'focused proof is package-wired and read-only',
    EXTRACT_RETIRE_SCRIPT_PATH,
  )
  addCheck(
    checks,
    planSource.includes('Current-day targets never retire') &&
      planSource.includes('No live extraction') &&
      currentPlan.includes(EXTRACT_RETIRE_CLOSEOUT_KEY) &&
      currentState.includes(EXTRACT_RETIRE_CLOSEOUT_KEY),
    'plan and rebuild docs record the retirement boundary',
    EXTRACT_RETIRE_PLAN_PATH,
  )
  return {
    ok: checks.every(check => check.ok),
    checks,
    summary: summary(checks),
  }
}

export function buildExtractRetirePureDogfoodProof() {
  const now = '2026-05-16T15:30:00.000Z'
  const retiringHistory = buildExtractRetireRunUpdate({
    now,
    target: {
      targetKey: 'drive-content-extract-backfill',
      lane: 'corpus_mining',
      targetType: 'drive_content_backfill',
      status: 'active',
      runtimeMode: 'scheduled',
      metadata: { extractRetire: { cleanZeroWorkRunStreak: 1 } },
      budget: { retireAfterCleanRuns: 2 },
    },
    runInput: { lastStatus: 'succeeded', inspectedDelta: 0, archivedDelta: 0, extractedDelta: 0, nextRunAt: '2026-05-17T05:00:00.000Z' },
  })
  const currentDay = buildExtractRetireRunUpdate({
    now,
    target: {
      targetKey: 'gmail-current-day',
      lane: 'current_day',
      targetType: 'gmail_current',
      status: 'active',
      runtimeMode: 'scheduled',
      metadata: { extractRetire: { cleanZeroWorkRunStreak: 9 } },
      budget: { retireAfterCleanRuns: 2 },
    },
    runInput: { lastStatus: 'succeeded', inspectedDelta: 0, archivedDelta: 0, extractedDelta: 0, nextRunAt: '2026-05-17T05:00:00.000Z' },
  })
  const positiveWork = buildExtractRetireRunUpdate({
    now,
    target: {
      targetKey: 'video-content-extract-backfill',
      lane: 'backfill',
      targetType: 'video_backfill',
      status: 'active',
      runtimeMode: 'scheduled',
      metadata: { extractRetire: { cleanZeroWorkRunStreak: 1 } },
      budget: { retireAfterCleanRuns: 2 },
    },
    runInput: { lastStatus: 'succeeded', inspectedDelta: 2, archivedDelta: 1, extractedDelta: 1, nextRunAt: '2026-05-17T05:00:00.000Z' },
  })
  const failedRun = buildExtractRetireRunUpdate({
    now,
    target: {
      targetKey: 'slack-extract-latest',
      lane: 'history',
      targetType: 'slack_history',
      status: 'active',
      runtimeMode: 'scheduled',
      metadata: { extractRetire: { cleanZeroWorkRunStreak: 1 } },
      budget: { retireAfterCleanRuns: 2 },
    },
    runInput: { lastStatus: 'failed', inspectedDelta: 0, archivedDelta: 0, extractedDelta: 0, nextRunAt: '2026-05-17T05:00:00.000Z' },
  })
  return {
    ok: retiringHistory.decision.shouldRetire === true &&
      retiringHistory.status === 'complete' &&
      retiringHistory.runtimeMode === 'paused' &&
      retiringHistory.nextRunAt === null &&
      currentDay.decision.shouldRetire === false &&
      currentDay.nextRunAt === '2026-05-17T05:00:00.000Z' &&
      positiveWork.decision.cleanZeroWorkRunStreak === 0 &&
      positiveWork.decision.shouldRetire === false &&
      failedRun.decision.cleanZeroWorkRunStreak === 0 &&
      failedRun.decision.shouldRetire === false,
    retiringHistory,
    currentDay,
    positiveWork,
    failedRun,
    dogfoodInvariant: 'History/corpus targets retire only after the configured clean zero-work threshold; current-day, failed, and positive-work runs do not retire.',
  }
}
