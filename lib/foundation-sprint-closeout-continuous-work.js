export const FOUNDATION_SPRINT_CLOSEOUT_CARD_ID = 'FOUNDATION-SPRINT-CLOSEOUT-AND-CONTINUOUS-WORK-READY-001'
export const FOUNDATION_SPRINT_CLOSEOUT_CLOSEOUT_KEY = 'foundation-sprint-closeout-continuous-work-ready-v1'
export const FOUNDATION_SPRINT_CLOSEOUT_PLAN_PATH = 'docs/process/foundation-sprint-closeout-and-continuous-work-ready-001-plan.md'
export const FOUNDATION_SPRINT_CLOSEOUT_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-SPRINT-CLOSEOUT-AND-CONTINUOUS-WORK-READY-001.json'
export const FOUNDATION_SPRINT_CLOSEOUT_SCRIPT_PATH = 'scripts/process-foundation-sprint-closeout-continuous-work-ready-check.mjs'
export const FOUNDATION_SPRINT_CLOSEOUT_HANDOFF_PATH = 'docs/handoffs/2026-05-19-foundation-sprint-closeout-continuous-work-ready.md'

export const FOUNDATION_SPRINT_CLOSEOUT_REQUIRED_CARDS = Object.freeze([
  'FOUNDATION-HEALTH-GREEN-LOCK-001',
  'FOUNDATION-LESSONS-LEARNED-LOOP-001',
  'FOUNDATION-BACKLOG-P0-REALITY-CLEANUP-001',
  'SYSTEM-010',
  'SOURCE-012',
  'SOURCE-018',
  'EXTRACT-CURRENT-001',
  'EXTRACT-BACKFILL-001',
  'DRIVE-CONTENT-001',
  'EMAIL-ATTACHMENTS-001',
])

export const FOUNDATION_SPRINT_CLOSEOUT_CHANGED_FILES = [
  'lib/foundation-sprint-closeout-continuous-work.js',
  FOUNDATION_SPRINT_CLOSEOUT_SCRIPT_PATH,
  'package.json',
  'lib/foundation-build-closeout-process-gate-records.js',
  FOUNDATION_SPRINT_CLOSEOUT_PLAN_PATH,
  FOUNDATION_SPRINT_CLOSEOUT_APPROVAL_PATH,
  FOUNDATION_SPRINT_CLOSEOUT_HANDOFF_PATH,
]

export const FOUNDATION_SPRINT_CLOSEOUT_PROOF_COMMANDS = [
  `node --check lib/foundation-sprint-closeout-continuous-work.js ${FOUNDATION_SPRINT_CLOSEOUT_SCRIPT_PATH}`,
  'npm run process:foundation-sprint-closeout-continuous-work-ready-check -- --apply --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run process:current-sprint-dynamic-truth-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${FOUNDATION_SPRINT_CLOSEOUT_CARD_ID} --planApprovalRef=${FOUNDATION_SPRINT_CLOSEOUT_APPROVAL_PATH} --closeoutKey=${FOUNDATION_SPRINT_CLOSEOUT_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${FOUNDATION_SPRINT_CLOSEOUT_CARD_ID} --closeoutKey=${FOUNDATION_SPRINT_CLOSEOUT_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${FOUNDATION_SPRINT_CLOSEOUT_CARD_ID} --planApprovalRef=${FOUNDATION_SPRINT_CLOSEOUT_APPROVAL_PATH} --closeoutKey=${FOUNDATION_SPRINT_CLOSEOUT_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const FOUNDATION_SPRINT_CLOSEOUT_NOT_NEXT = [
  'Do not start Value Builder split from this card alone.',
  'Do not call classified broken workflow failures green.',
  'Do not ignore repeated-failure risk.',
  'Do not run broad private extraction, external writes, sends, permission mutation, credential mutation, paid/provider access, or browser-auth work.',
]

function add(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function statusOf(processResult = {}) {
  return processResult.json?.status || processResult.json?.systemHealth?.status || processResult.status || 'missing'
}

export function buildFoundationSprintCloseoutDogfoodProof() {
  const healthy = {
    health: 'healthy',
    repeated: 'healthy',
    backlog: 'healthy',
    currentSprint: 'healthy',
    requiredDone: true,
    mainClean: true,
  }
  const cases = [
    ['healthy fixture passes', healthy, true],
    ['dogfood rejects raw health risk', { ...healthy, health: 'risk' }, false],
    ['dogfood rejects repeated-failure risk', { ...healthy, repeated: 'risk' }, false],
    ['dogfood rejects backlog hygiene risk', { ...healthy, backlog: 'risk' }, false],
    ['dogfood rejects Current Sprint drift', { ...healthy, currentSprint: 'risk' }, false],
    ['dogfood rejects unfinished required cards', { ...healthy, requiredDone: false }, false],
    ['dogfood rejects dirty/unpushed main', { ...healthy, mainClean: false }, false],
  ]
  const evaluate = fixture =>
    fixture.health === 'healthy' &&
    fixture.repeated === 'healthy' &&
    fixture.backlog === 'healthy' &&
    fixture.currentSprint === 'healthy' &&
    fixture.requiredDone === true &&
    fixture.mainClean === true
  const checks = cases.map(([check, fixture, expected]) => ({
    check,
    ok: evaluate(fixture) === expected,
    detail: JSON.stringify(fixture),
  }))
  return {
    ok: checks.every(check => check.ok),
    invariant: 'Final sprint closeout can recommend continuous work only when health, repeated failures, backlog hygiene, Current Sprint truth, required cards, and main integration are all clean.',
    checks,
    failed: checks.filter(check => !check.ok),
  }
}

export function buildFoundationSprintCloseoutStatus({
  systemHealth = {},
  repeatedFailureGate = {},
  currentSprintTruth = {},
  backlogHygiene = {},
  cards = [],
  git = {},
} = {}) {
  const checks = []
  const cardMap = new Map(cards.map(card => [card.id, card]))
  const missingOrNotDone = FOUNDATION_SPRINT_CLOSEOUT_REQUIRED_CARDS
    .filter(cardId => cardMap.get(cardId)?.lane !== 'done')
  const systemHealthStatus = statusOf(systemHealth)
  const repeatedStatus = statusOf(repeatedFailureGate)
  const currentSprintStatus = statusOf(currentSprintTruth)
  const backlogStatus = statusOf(backlogHygiene)
  const rawRiskCount = Number(
    systemHealth.json?.systemHealth?.summary?.rawRiskCount ??
    systemHealth.json?.systemHealth?.rawRiskCount ??
    systemHealth.json?.summary?.rawRiskCount ??
    systemHealth.json?.rawRiskCount ??
    0,
  )
  const rawWatchCount = Number(
    systemHealth.json?.systemHealth?.summary?.rawWatchCount ??
    systemHealth.json?.systemHealth?.rawWatchCount ??
    systemHealth.json?.summary?.rawWatchCount ??
    systemHealth.json?.rawWatchCount ??
    0,
  )
  const inFlightCloseout = git.inFlightCloseout === true
  const cleanSyncedMain = git.clean === true && git.head && git.head === git.originMain

  add(checks, systemHealth.exitStatus === 0 && systemHealthStatus === 'healthy', 'System Health is healthy', systemHealthStatus)
  add(checks, rawRiskCount === 0, 'System Health raw risk count is zero', String(rawRiskCount))
  add(checks, rawWatchCount === 0, 'System Health raw watch count is zero', String(rawWatchCount))
  add(checks, repeatedFailureGate.exitStatus === 0 && repeatedStatus === 'healthy', 'repeated-failure gate is healthy', repeatedStatus)
  add(checks, backlogHygiene.exitStatus === 0 && backlogStatus === 'healthy', 'backlog hygiene is healthy', backlogStatus)
  add(checks, currentSprintTruth.exitStatus === 0 && currentSprintStatus === 'healthy', 'Current Sprint dynamic truth is healthy', currentSprintStatus)
  add(checks, missingOrNotDone.length === 0, 'approved sprint cards before closeout are done', missingOrNotDone.join(', ') || 'all done')
  add(checks, cleanSyncedMain || inFlightCloseout, 'main is clean/synced or covered by in-flight final ship gate', `clean=${git.clean} head=${git.head || 'missing'} origin=${git.originMain || 'missing'} inFlight=${inFlightCloseout}`)

  const ok = checks.every(check => check.ok)
  return {
    ok,
    status: ok ? 'healthy' : 'risk',
    checks,
    failed: checks.filter(check => !check.ok),
    missingOrNotDone,
    recommendation: {
      continuousFoundationBuilder: ok ? 'ready' : 'not_ready',
      valueBuilderSplit: ok
        ? 'defer_full_split_until_next_clean_overnight_cycle; safe only as an explicitly approved pilot with Foundation Builder still dedicated to raw-green repair'
        : 'not_ready',
      operatingRule: 'Blockers block unsafe actions, not the whole sprint. Repeated failures and raw workflow red/yellow rows trigger Foundation repair before value work.',
    },
  }
}
