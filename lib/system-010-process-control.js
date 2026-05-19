import {
  buildDecommissionDecision,
  buildRuntimeProcessControlSnapshot,
  buildStopDecision,
  getJobRunPermission,
  SYSTEM_010_CARD_ID as SYSTEM_010_GHOST_CARD_ID,
  SYSTEM_010_CLOSEOUT_KEY as SYSTEM_010_GHOST_CLOSEOUT_KEY,
} from './runtime-process-control.js'

export const SYSTEM_010_CARD_ID = 'SYSTEM-010'
export const SYSTEM_010_CLOSEOUT_KEY = 'system-010-process-control-v1'
export const SYSTEM_010_PLAN_PATH = 'docs/process/system-010-process-control-001-plan.md'
export const SYSTEM_010_APPROVAL_PATH = 'docs/process/approvals/SYSTEM-010.json'
export const SYSTEM_010_SCRIPT_PATH = 'scripts/process-system-010-check.mjs'
export const SYSTEM_010_CLOSEOUT_PATH = 'docs/handoffs/2026-05-19-system-010-process-control-closeout.md'
export const SYSTEM_010_NEXT_CARD_ID = 'SOURCE-012'

export const SYSTEM_010_CHANGED_FILES = [
  'lib/system-010-process-control.js',
  SYSTEM_010_SCRIPT_PATH,
  'package.json',
  'lib/source-contracts.js',
  'lib/foundation-recent-builds-verifier.js',
  'lib/foundation-verifier-followup-backlog-assurance.js',
  'scripts/process-foundation-backlog-p0-reality-cleanup-check.mjs',
  'lib/foundation-build-closeout-process-gate-records.js',
  SYSTEM_010_PLAN_PATH,
  SYSTEM_010_APPROVAL_PATH,
  SYSTEM_010_CLOSEOUT_PATH,
]

export const SYSTEM_010_PROOF_COMMANDS = [
  `node --check lib/system-010-process-control.js ${SYSTEM_010_SCRIPT_PATH}`,
  'npm run process:system-010-check -- --apply --close-card --json',
  'npm run process:system-010-ghost-closeout-check -- --json',
  'npm run process:foundation-backlog-p0-reality-cleanup-check -- --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${SYSTEM_010_CARD_ID} --planApprovalRef=${SYSTEM_010_APPROVAL_PATH} --closeoutKey=${SYSTEM_010_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${SYSTEM_010_CARD_ID} --closeoutKey=${SYSTEM_010_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${SYSTEM_010_CARD_ID} --planApprovalRef=${SYSTEM_010_APPROVAL_PATH} --closeoutKey=${SYSTEM_010_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const SYSTEM_010_NOT_NEXT = [
  'Do not start Value Builder split.',
  'Do not start agent/value feature work from this card.',
  'Do not mutate credentials, Drive permissions, public edge exposure, external systems, or sends.',
  'Do not run paid/provider/browser-auth work or broad private extraction from this card.',
  'Do not rebuild the runtime control surface that SYSTEM-010-GHOST-CLOSEOUT-001 already shipped.',
]

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
}

function closeoutByKey(closeouts = [], key = '') {
  return asArray(closeouts).find(record => record?.key === key) || null
}

function cardById(cards = [], id = '') {
  return asArray(cards).find(card => card?.id === id) || null
}

function sprintItemByCardId(activeSprint = {}, cardId = '') {
  return asArray(activeSprint.items).find(item => item?.cardId === cardId || item?.backlogId === cardId) || null
}

export function buildSystem010DogfoodProof() {
  const currentRepoHead = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  const decommissioned = getJobRunPermission({
    key: 'decommissioned-fixture',
    runtimeMode: 'decommissioned',
    enabled: false,
  }, { force: true })
  const pausedWithoutForce = getJobRunPermission({
    key: 'paused-fixture',
    runtimeMode: 'paused',
    enabled: false,
  }, { force: false })
  const pausedWithForce = getJobRunPermission({
    key: 'paused-fixture',
    runtimeMode: 'paused',
    enabled: false,
  }, { force: true })
  const unsafeStop = buildStopDecision({
    run: {
      runId: 'unsafe-run',
      jobKey: 'unsafe-job',
      status: 'running',
      metadata: {
        childPid: process.pid,
        processOwner: 'unknown',
        processStartedByRunId: 'unsafe-run',
      },
    },
    servedCode: { status: 'live', runningCommit: currentRepoHead },
    currentRepoHead,
  })
  const staleServedCodeStop = buildStopDecision({
    run: {
      runId: 'stale-code-run',
      jobKey: 'stale-code-job',
      status: 'running',
      metadata: {
        childPid: 999999,
        processOwner: 'foundation-job-runner',
        processStartedByRunId: 'stale-code-run',
      },
    },
    servedCode: { status: 'live', runningCommit: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
    currentRepoHead,
  })
  const decommissionOk = buildDecommissionDecision({
    job: { key: 'system-010-fixture', latestRun: { status: 'succeeded' } },
    confirmation: 'DECOMMISSION system-010-fixture',
  })
  const decommissionBadConfirmation = buildDecommissionDecision({
    job: { key: 'system-010-fixture', latestRun: { status: 'succeeded' } },
    confirmation: 'wrong',
  })
  const decommissionActiveRun = buildDecommissionDecision({
    job: { key: 'system-010-fixture', latestRun: { status: 'running' } },
    confirmation: 'DECOMMISSION system-010-fixture',
  })
  const snapshot = buildRuntimeProcessControlSnapshot({
    foundationJobs: {
      jobs: [{
        key: 'system-010-fixture',
        runtimeMode: 'scheduled',
        enabled: true,
        maxRuntimeSeconds: 1,
        budget: 'connector',
      }],
      latestRuns: [{
        runId: 'system-010-fixture-run',
        jobKey: 'system-010-fixture',
        status: 'running',
        startedAt: '2026-05-19T12:00:00.000Z',
        metadata: {
          childPid: 999999,
          processOwner: 'foundation-job-runner',
          processStartedByRunId: 'system-010-fixture-run',
        },
      }],
    },
    llmRuntime: {
      recentCalls: [{
        callId: 'system-010-llm-fixture',
        status: 'started',
        estimatedCostUsd: 0.02,
      }],
    },
    extractionControl: {
      recentRuns: [{
        runId: 'system-010-crawl-fixture',
        status: 'running',
        staleState: { isStale: true, reason: 'lease_expired' },
      }],
      recentItems: [],
    },
    runtimeSupervisor: {
      servedCode: { status: 'live', runningCommit: currentRepoHead },
      workerCode: { status: 'live', runningCommit: currentRepoHead },
    },
    currentRepoHead,
    generatedAt: '2026-05-19T13:00:00.000Z',
  })

  const checks = [
    {
      ok: decommissioned.ok === false,
      check: 'decommissioned jobs fail closed even with force',
      detail: decommissioned.reason,
    },
    {
      ok: pausedWithoutForce.ok === false && pausedWithForce.ok === true,
      check: 'paused jobs require explicit force recovery',
      detail: `${pausedWithoutForce.reason} / ${pausedWithForce.reason}`,
    },
    {
      ok: unsafeStop.ok === false && unsafeStop.failClosed === true,
      check: 'unowned PID stop fails closed',
      detail: unsafeStop.reasons.join(' '),
    },
    {
      ok: staleServedCodeStop.ok === false && staleServedCodeStop.failClosed === true,
      check: 'stop fails closed when served code is stale',
      detail: staleServedCodeStop.reasons.join(' '),
    },
    {
      ok: decommissionOk.ok === true && decommissionOk.control?.runtimeMode === 'decommissioned',
      check: 'exact decommission confirmation returns durable control payload',
      detail: decommissionOk.expectedConfirmation,
    },
    {
      ok: decommissionBadConfirmation.ok === false && decommissionActiveRun.ok === false,
      check: 'decommission rejects bad confirmation and active runs',
      detail: [...decommissionBadConfirmation.reasons, ...decommissionActiveRun.reasons].join(' '),
    },
    {
      ok: Number(snapshot.summary?.activeFoundationJobRuns) === 1 &&
        Number(snapshot.summary?.activeLlmCalls) === 1 &&
        Number(snapshot.summary?.staleRiskCount) >= 2 &&
        snapshot.costRisk?.status === 'watch',
      check: 'active-process snapshot rolls up active jobs, stale risk, and cost risk',
      detail: JSON.stringify(snapshot.summary || {}),
    },
  ]

  return {
    ok: checks.every(check => check.ok),
    ghostCardId: SYSTEM_010_GHOST_CARD_ID,
    ghostCloseoutKey: SYSTEM_010_GHOST_CLOSEOUT_KEY,
    checks,
  }
}

export function evaluateSystem010ProcessControl({
  activeSprint = {},
  cards = [],
  closeouts = [],
  packageJson = {},
  sourceContractsText = '',
  expectedActiveBlockerCardId = SYSTEM_010_CARD_ID,
} = {}) {
  const system010 = cardById(cards, SYSTEM_010_CARD_ID)
  const source012 = cardById(cards, SYSTEM_010_NEXT_CARD_ID)
  const ghost = cardById(cards, SYSTEM_010_GHOST_CARD_ID)
  const system010SprintItem = sprintItemByCardId(activeSprint, SYSTEM_010_CARD_ID)
  const source012SprintItem = sprintItemByCardId(activeSprint, SYSTEM_010_NEXT_CARD_ID)
  const activeBlockerCardId = activeSprint.sprint?.activeBlockerCardId || activeSprint.sprint?.active_blocker_card_id || ''
  const ghostCloseout = closeoutByKey(closeouts, SYSTEM_010_GHOST_CLOSEOUT_KEY)
  const topLevelCloseout = closeoutByKey(closeouts, SYSTEM_010_CLOSEOUT_KEY)
  const dogfood = buildSystem010DogfoodProof()
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })

  add(Boolean(ghostCloseout?.operatorCloseout || ghostCloseout), 'shipped ghost closeout exists for runtime controls', ghostCloseout?.key || 'missing')
  add(ghost?.lane === 'done' || Boolean(ghostCloseout), 'ghost runtime-control card is done or has durable closeout', ghost ? `${ghost.lane}/${ghost.priority}` : 'closeout-only')
  add(dogfood.ok, 'runtime-control dogfood still blocks unsafe stop/decommission/run cases', dogfood.checks.filter(check => !check.ok).map(check => check.check).join(', ') || 'pass')
  add(system010?.priority === 'P0', 'SYSTEM-010 is live P0 work', system010 ? `${system010.lane}/${system010.priority}` : 'missing')
  add(source012?.id === SYSTEM_010_NEXT_CARD_ID, 'SOURCE-012 exists for next source-layer card', source012 ? `${source012.lane}/${source012.priority}` : 'missing')
  add(system010SprintItem?.planRef === SYSTEM_010_PLAN_PATH, 'Current Sprint uses SYSTEM-010 process-control plan', system010SprintItem?.planRef || 'missing')
  add(source012SprintItem?.cardId === SYSTEM_010_NEXT_CARD_ID, 'Current Sprint contains SOURCE-012 next item', source012SprintItem?.stage || 'missing')
  add(activeBlockerCardId === expectedActiveBlockerCardId, 'Current Sprint active blocker matches expected card', activeBlockerCardId || 'missing')
  add(packageJson.scripts?.['process:system-010-check'] === `node --env-file-if-exists=.env ${SYSTEM_010_SCRIPT_PATH}`, 'package exposes top-level SYSTEM-010 proof script', packageJson.scripts?.['process:system-010-check'] || 'missing')
  add(!/kill\/decommission controls still need SYSTEM-010 closeout/i.test(sourceContractsText), 'runtime source contract no longer says SYSTEM-010 controls still need closeout', 'SYS-RUNTIME-CONTROL-001')
  add(!expectedActiveBlockerCardId || expectedActiveBlockerCardId !== SYSTEM_010_NEXT_CARD_ID || Boolean(topLevelCloseout?.operatorCloseout || topLevelCloseout), 'top-level SYSTEM-010 closeout exists when advancing to SOURCE-012', topLevelCloseout?.key || 'pending')

  const failed = checks.filter(check => !check.ok)
  return {
    status: failed.length ? 'risk' : 'healthy',
    ok: failed.length === 0,
    activeBlockerCardId,
    expectedActiveBlockerCardId,
    dogfood,
    checks,
    failed,
  }
}
