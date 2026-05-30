export const BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_CARD_ID = 'BUILD-LANE-REPEATED-FAILURE-ACTION-GATE-001'
export const BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_CLOSEOUT_KEY = 'build-lane-repeated-failure-action-gate-v1'
export const BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_PLAN_PATH = 'docs/process/build-lane-repeated-failure-action-gate-001-plan.md'
export const BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_APPROVAL_PATH = 'docs/process/approvals/BUILD-LANE-REPEATED-FAILURE-ACTION-GATE-001.json'
export const BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_SCRIPT_PATH = 'scripts/process-build-lane-repeated-failure-action-gate-check.mjs'
export const BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-build-lane-repeated-failure-action-gate-closeout.md'
export const BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_SPRINT_ID = 'FOUNDATION-GREEN-MAIN-AUDIT-AND-SOURCE-ACTIVATION-2026-05-19'
export const BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_NEXT_CARD_ID = 'PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001'

export const BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_CHANGED_FILES = [
  'lib/build-lane-repeated-failure-action-gate.js',
  BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_SCRIPT_PATH,
  'lib/build-lane-failure-telemetry.js',
  'lib/process-git-hooks.js',
  'lib/foundation-verifier-health-live-summary.js',
  'lib/foundation-build-closeout-build-lane-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'package.json',
  BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_PLAN_PATH,
  BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_APPROVAL_PATH,
  BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_CLOSEOUT_PATH,
]

export const BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_PROOF_COMMANDS = [
  'node --check lib/build-lane-repeated-failure-action-gate.js scripts/process-build-lane-repeated-failure-action-gate-check.mjs lib/build-lane-failure-telemetry.js lib/process-git-hooks.js',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --apply --close-card --json',
  'npm run process:build-lane-failure-telemetry-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=BUILD-LANE-REPEATED-FAILURE-ACTION-GATE-001 --planApprovalRef=docs/process/approvals/BUILD-LANE-REPEATED-FAILURE-ACTION-GATE-001.json --closeoutKey=build-lane-repeated-failure-action-gate-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=BUILD-LANE-REPEATED-FAILURE-ACTION-GATE-001 --closeoutKey=build-lane-repeated-failure-action-gate-v1',
  'npm run process:post-ship-fanout -- --card=BUILD-LANE-REPEATED-FAILURE-ACTION-GATE-001 --closeoutKey=build-lane-repeated-failure-action-gate-v1 --commitRef=HEAD',
  'npm run process:foundation-ship -- --card=BUILD-LANE-REPEATED-FAILURE-ACTION-GATE-001 --planApprovalRef=docs/process/approvals/BUILD-LANE-REPEATED-FAILURE-ACTION-GATE-001.json --closeoutKey=build-lane-repeated-failure-action-gate-v1 --commitRef=HEAD',
]

export const BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_NOT_NEXT = [
  'No parallel builders until this P0 action gate is closed or routes a higher-priority repair card.',
  'Do not treat repeated failures as watch-only telemetry.',
  'Do not delete or rewrite historical local telemetry events.',
  'Do not weaken, skip, bypass, or demote real verifier, ship, fanout, or backlog hygiene failures.',
  'No live extraction.',
  'No auth-required or paid run.',
  'No provider/model probe.',
  'No external write.',
  'Do not mutate Drive permissions.',
  'No live Agent Feedback auto-send.',
  'No Harlan/Fal/voice/Canva/OpenHuman feature work.',
]

export const BUILD_LANE_FAILURE_CLASS_REPAIR_CARD_IDS = {
  served_code_fanout_sync: 'BUILD-LANE-SERVED-CODE-FANOUT-SYNC-REPAIR-001',
  verifier_snapshot_wiring: 'BUILD-LANE-VERIFIER-SNAPSHOT-WIRING-REPAIR-001',
  verifier_check_failure: 'FOUNDATION-VERIFY-HEALTH-REPAIR-001',
  plan_critic_or_approval: 'PLAN-CRITIC-REPLACEMENT-001',
  backlog_hygiene: 'FOUNDATION-HEALTH-WATCH-TO-GREEN-001',
  transient_infrastructure: BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_CARD_ID,
  unclassified_build_lane_failure: BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_CARD_ID,
}

export const FOUNDATION_JOB_REPEATED_FAILURE_REPAIR_CARD_IDS = {
  'connector-uptime-monitor': 'CONNECTOR-UPTIME-MONITOR-001',
  'foundation-verify': 'FOUNDATION-VERIFY-HEALTH-REPAIR-001',
  'gmail-sync-current': 'EXTRACT-CURRENT-001',
  'meeting-notes-sync-current': 'EXTRACT-CURRENT-001',
  'meeting-transcripts-extract-backlog': 'EXTRACT-BACKFILL-001',
  'verification-runs': 'VERIFICATION-RUNS-001',
}

const REPEATED_JOB_FAILURE_THRESHOLD_24H = 3
const ACTIVE_REPAIR_LANES = new Set(['scoped', 'executing', 'sprint_ready'])

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function toDate(value) {
  const date = value instanceof Date ? value : new Date(value || '')
  return Number.isNaN(date.getTime()) ? null : date
}

function isoDate(value) {
  const date = toDate(value)
  return date ? date.toISOString() : null
}

function latestDate(values = []) {
  return list(values)
    .map(toDate)
    .filter(Boolean)
    .sort((left, right) => right.getTime() - left.getTime())[0] || null
}

function latestRunDate(run = {}) {
  return toDate(run.finishedAt || run.startedAt || run.createdAt)
}

function latestAffectedCardId(row = {}) {
  const cardIds = list(row.cardIds).filter(Boolean)
  return cardIds[cardIds.length - 1] || row.cardId || ''
}

function cardMap(cards = []) {
  return new Map(list(cards).filter(card => card?.id).map(card => [card.id, card]))
}

function repairCardDecision({ repairCard, red = false, resolved = false } = {}) {
  if (resolved) return 'resolved_with_proof'
  if (!red) return 'watch_only_threshold'
  if (!repairCard) return 'block_current_sprint_missing_repair_card'
  if (ACTIVE_REPAIR_LANES.has(repairCard.lane)) return 'repair_card_attached'
  if (repairCard.lane === 'done') return 'repair_shipped_but_repeated_after_proof'
  return 'block_current_sprint_repair_card_not_ready'
}

function itemBlocksCurrentSprint(item = {}) {
  if (item.resolved) return false
  if (item.severity !== 'red') return false
  return !['repair_card_attached'].includes(item.decision)
}

function actionSatisfied(item = {}) {
  if (item.resolved || item.severity !== 'red') return true
  return item.decision === 'repair_card_attached'
}

function buildTelemetryActionItems({ telemetrySnapshot = {}, repairCards = [] } = {}) {
  const repairs = cardMap(repairCards)
  return list(telemetrySnapshot.fingerprints)
    .filter(row => ['risk', 'watch'].includes(row.status) || row.resolved === true)
    .map(row => {
      const failureClass = text(row.failureClass) || 'unclassified_build_lane_failure'
      const red = row.status === 'risk'
      const repairCardId = BUILD_LANE_FAILURE_CLASS_REPAIR_CARD_IDS[failureClass] || BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_CARD_ID
      const repairCard = repairs.get(repairCardId) || null
      const resolved = row.resolved === true || row.status === 'resolved'
      const item = {
        source: 'build_lane_failure_telemetry',
        fingerprint: row.fingerprint,
        failureClass,
        command: row.command || '',
        checkName: row.checkName || '',
        severity: red ? 'red' : row.status === 'watch' ? 'yellow' : 'resolved',
        status: row.status,
        repeatCount24h: Number(row.count24h || 0),
        repeatCount7d: Number(row.count7d || 0),
        latestSeenAt: row.lastSeenAt || null,
        latestAffectedCardId: latestAffectedCardId(row),
        owner: 'Foundation Process',
        repairCardId,
        repairCardLane: repairCard?.lane || 'missing',
        repairCardPriority: repairCard?.priority || '',
        resolved,
        resolutionReason: row.resolutionReason || '',
        latestDetail: row.latestDetail || '',
        nextAction: resolved
          ? 'Resolved by later ship proof; reopen only if this fingerprint repeats after that proof.'
          : red
            ? `Stop current sprint progression until ${repairCardId} is live and active, or the fingerprint is retired by proof.`
            : row.nextAction || 'Watch threshold; one more repeat can become repair work.',
      }
      return {
        ...item,
        decision: repairCardDecision({ repairCard, red, resolved }),
      }
    })
}

function groupJobRuns(jobRuns = [], now = new Date()) {
  const current = toDate(now) || new Date()
  const cutoff = current.getTime() - (24 * 60 * 60 * 1000)
  const groups = new Map()
  for (const run of list(jobRuns)) {
    const jobKey = text(run.jobKey || run.job_key)
    const status = text(run.status)
    const runDate = latestRunDate(run)
    if (!jobKey || !runDate || runDate.getTime() < cutoff) continue
    if (!groups.has(jobKey)) {
      groups.set(jobKey, {
        jobKey,
        title: run.title || jobKey,
        runs: [],
      })
    }
    groups.get(jobKey).runs.push({ ...run, runDate })
  }
  return Array.from(groups.values())
}

function buildJobRunActionItems({ jobRuns = [], repairCards = [], now = new Date() } = {}) {
  const repairs = cardMap(repairCards)
  return groupJobRuns(jobRuns, now)
    .map(group => {
      const failedRuns = group.runs.filter(run => ['failed', 'cancelled'].includes(text(run.status)))
      const latestFailure = latestDate(failedRuns.map(run => run.runDate))
      const latestSuccess = latestDate(group.runs.filter(run => run.status === 'succeeded').map(run => run.runDate))
      const resolved = Boolean(latestFailure && latestSuccess && latestSuccess.getTime() > latestFailure.getTime())
      const red = failedRuns.length >= REPEATED_JOB_FAILURE_THRESHOLD_24H && !resolved
      const watch = failedRuns.length >= REPEATED_JOB_FAILURE_THRESHOLD_24H && resolved
      if (!red && !watch) return null
      const repairCardId = FOUNDATION_JOB_REPEATED_FAILURE_REPAIR_CARD_IDS[group.jobKey] || BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_CARD_ID
      const repairCard = repairs.get(repairCardId) || null
      const latestFailedRun = failedRuns
        .sort((left, right) => right.runDate.getTime() - left.runDate.getTime())[0] || null
      const item = {
        source: 'foundation_job_runs',
        jobKey: group.jobKey,
        title: group.title,
        severity: red ? 'red' : 'resolved',
        status: resolved ? 'resolved' : 'risk',
        repeatCount24h: failedRuns.length,
        latestSeenAt: isoDate(latestFailure),
        latestSuccessAt: isoDate(latestSuccess),
        latestAffectedCardId: latestFailedRun?.metadata?.cardId || latestFailedRun?.metadata?.closeoutCardId || '',
        owner: group.jobKey === 'connector-uptime-monitor' ? 'Foundation Runtime' : 'Foundation Process',
        repairCardId,
        repairCardLane: repairCard?.lane || 'missing',
        repairCardPriority: repairCard?.priority || '',
        resolved,
        resolutionReason: resolved ? 'later_successful_job_run' : '',
        latestDetail: latestFailedRun?.errorMessage || latestFailedRun?.outputTail || `${failedRuns.length} failed/cancelled runs`,
        nextAction: resolved
          ? 'Latest run succeeded after the repeated failures; keep the count visible and reopen only if failures repeat after the success.'
          : `Route this job-run repeat to ${repairCardId} before allowing the sprint to continue.`,
      }
      return {
        ...item,
        decision: repairCardDecision({ repairCard, red, resolved }),
      }
    })
    .filter(Boolean)
}

export function buildBuildLaneRepeatedFailureActionGateStatus({
  telemetrySnapshot = {},
  jobRuns = [],
  repairCards = [],
  now = new Date(),
} = {}) {
  const telemetryItems = buildTelemetryActionItems({ telemetrySnapshot, repairCards })
  const jobItems = buildJobRunActionItems({ jobRuns, repairCards, now })
  const actionItems = [...telemetryItems, ...jobItems]
  const redItems = actionItems.filter(item => item.severity === 'red')
  const unsatisfiedRedItems = redItems.filter(item => !actionSatisfied(item))
  const blockingItems = actionItems.filter(itemBlocksCurrentSprint)
  const attachedRepairItems = redItems.filter(item => item.decision === 'repair_card_attached')
  const resolvedItems = actionItems.filter(item => item.resolved)
  const status = unsatisfiedRedItems.length
    ? 'blocked'
    : attachedRepairItems.length
      ? 'action_required'
      : 'healthy'

  return {
    cardId: BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_CARD_ID,
    closeoutKey: BUILD_LANE_REPEATED_FAILURE_ACTION_GATE_CLOSEOUT_KEY,
    generatedAt: isoDate(now),
    status,
    blocksCurrentSprint: blockingItems.length > 0,
    summary: {
      actionItemCount: actionItems.length,
      telemetryActionItemCount: telemetryItems.length,
      jobRunActionItemCount: jobItems.length,
      redActionItemCount: redItems.length,
      unsatisfiedRedCount: unsatisfiedRedItems.length,
      attachedRepairCardCount: attachedRepairItems.length,
      blockingItemCount: blockingItems.length,
      resolvedHistoricalFailureCount: resolvedItems.length,
      latestShipProofAt: telemetrySnapshot.summary?.latestResolutionProofAt || null,
    },
    actionItems,
    blockingItems,
    unsatisfiedRedItems,
    attachedRepairItems,
    resolvedItems,
    plainEnglish: unsatisfiedRedItems.length
      ? `${unsatisfiedRedItems.length} repeated red failure group(s) still lack a live active repair route. Do not proceed.`
      : attachedRepairItems.length
        ? `${attachedRepairItems.length} repeated red failure group(s) are attached to live repair cards; route the sprint to those repairs before normal work.`
        : 'No unresolved repeated red build-lane or Foundation job failures are blocking sprint progression.',
  }
}

export function buildBuildLaneRepeatedFailureActionGateDogfoodProof() {
  const now = new Date('2026-05-19T13:00:00.000Z')
  const redTelemetry = {
    summary: { redFingerprintCount: 1, latestResolutionProofAt: null },
    fingerprints: [{
      fingerprint: 'synthetic-red-fp',
      status: 'risk',
      failureClass: 'served_code_fanout_sync',
      command: 'process:fanout-check',
      checkName: 'Recent Builds exposes this closeout',
      count24h: 8,
      count7d: 8,
      cardIds: ['CARD-A-001', 'CARD-B-001'],
      lastSeenAt: '2026-05-19T12:55:00.000Z',
      latestDetail: 'missing build log entry',
      resolved: false,
    }],
  }
  const routed = buildBuildLaneRepeatedFailureActionGateStatus({
    telemetrySnapshot: redTelemetry,
    repairCards: [{
      id: 'BUILD-LANE-SERVED-CODE-FANOUT-SYNC-REPAIR-001',
      lane: 'executing',
      priority: 'P0',
    }],
    now,
  })
  const unrouted = buildBuildLaneRepeatedFailureActionGateStatus({
    telemetrySnapshot: redTelemetry,
    repairCards: [],
    now,
  })
  const resolvedJobRuns = buildBuildLaneRepeatedFailureActionGateStatus({
    telemetrySnapshot: { summary: {}, fingerprints: [] },
    jobRuns: [
      ...Array.from({ length: 30 }, (_, index) => ({
        jobKey: 'connector-uptime-monitor',
        title: 'Connector Uptime Monitor',
        status: 'failed',
        startedAt: new Date(now.getTime() - (index + 2) * 20 * 60 * 1000).toISOString(),
        finishedAt: new Date(now.getTime() - (index + 2) * 20 * 60 * 1000 + 1000).toISOString(),
        errorMessage: 'Exited with code 1',
      })),
      {
        jobKey: 'connector-uptime-monitor',
        title: 'Connector Uptime Monitor',
        status: 'succeeded',
        startedAt: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
        finishedAt: new Date(now.getTime() - 4 * 60 * 1000).toISOString(),
      },
    ],
    repairCards: [{
      id: 'CONNECTOR-UPTIME-MONITOR-001',
      lane: 'done',
      priority: 'P0',
    }],
    now,
  })
  const unresolvedJobRuns = buildBuildLaneRepeatedFailureActionGateStatus({
    telemetrySnapshot: { summary: {}, fingerprints: [] },
    jobRuns: Array.from({ length: 4 }, (_, index) => ({
      jobKey: 'foundation-verify',
      title: 'Foundation Verifier',
      status: 'failed',
      startedAt: new Date(now.getTime() - (index + 1) * 10 * 60 * 1000).toISOString(),
      finishedAt: new Date(now.getTime() - (index + 1) * 10 * 60 * 1000 + 1000).toISOString(),
      errorMessage: 'FAIL synthetic verifier repeat',
    })),
    repairCards: [],
    now,
  })

  return {
    ok: routed.status === 'action_required' &&
      routed.attachedRepairItems.length === 1 &&
      unrouted.status === 'blocked' &&
      unrouted.unsatisfiedRedItems.length === 1 &&
      resolvedJobRuns.status === 'healthy' &&
      resolvedJobRuns.summary.resolvedHistoricalFailureCount === 1 &&
      unresolvedJobRuns.status === 'blocked' &&
      unresolvedJobRuns.summary.unsatisfiedRedCount === 1,
    invariant: 'Repeated red fingerprints require a live repair route or block the sprint; repeated job failures resolve only when a later success exists and repeat again if failures continue after the success.',
    routed,
    unrouted,
    resolvedJobRuns,
    unresolvedJobRuns,
  }
}
