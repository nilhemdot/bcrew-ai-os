import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { sleep } from './foundation-gate-reliability.js'

export const FOUNDATION_GATE_CHECK_SERIALIZATION_CARD_ID = 'FOUNDATION-GATE-CHECK-SERIALIZATION-001'
export const FOUNDATION_GATE_CHECK_SERIALIZATION_NEXT_CARD_ID = 'BRAIN-FLEET-FOUNDATION-001'
export const FOUNDATION_GATE_CHECK_SERIALIZATION_CLOSEOUT_KEY = 'foundation-gate-check-serialization-v1'
export const FOUNDATION_GATE_CHECK_SERIALIZATION_PLAN_PATH = 'docs/process/foundation-gate-check-serialization-001-plan.md'
export const FOUNDATION_GATE_CHECK_SERIALIZATION_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-GATE-CHECK-SERIALIZATION-001.json'
export const FOUNDATION_GATE_CHECK_SERIALIZATION_SCRIPT_PATH = 'scripts/process-foundation-gate-check-serialization-check.mjs'
export const FOUNDATION_GATE_CHECK_SERIALIZATION_CLOSEOUT_PATH = 'docs/handoffs/2026-05-20-foundation-gate-check-serialization-closeout.md'
export const FOUNDATION_HEAVY_GATE_CHECK_LOCK_DISABLED_ENV = 'FOUNDATION_HEAVY_GATE_CHECK_LOCK_DISABLED'
export const FOUNDATION_HEAVY_GATE_CHECK_LOCK_OWNER_TOKEN_ENV = 'FOUNDATION_HEAVY_GATE_CHECK_LOCK_OWNER_TOKEN'

const lockOwnerTokenContext = new AsyncLocalStorage()

export const HEAVY_FOUNDATION_GATE_CHECKS = [
  {
    command: 'foundation:verify',
    scriptPath: 'scripts/foundation-verify.mjs',
    reason: 'full verifier reads broad Foundation DB and API truth and closes the shared Foundation DB pool',
  },
  {
    command: 'process:system-health-nightly-audit-check',
    scriptPath: 'scripts/process-system-health-nightly-audit-check.mjs',
    reason: 'system health aggregates live job, backlog, sprint, audit, endpoint, and DB-backed health truth',
  },
  {
    command: 'process:build-lane-repeated-failure-action-gate-check',
    scriptPath: 'scripts/process-build-lane-repeated-failure-action-gate-check.mjs',
    reason: 'repeated-failure gate reads build-lane telemetry plus live backlog and Current Sprint truth',
  },
  {
    command: 'backlog:hygiene',
    scriptPath: 'scripts/backlog-hygiene.mjs',
    reason: 'backlog hygiene scans live backlog and closeout truth and records red failure telemetry on failure',
  },
]

export const FOUNDATION_GATE_CHECK_SERIALIZATION_PROOF_COMMANDS = [
  'npm run process:foundation-gate-check-serialization-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:foundation-ship -- --card=FOUNDATION-GATE-CHECK-SERIALIZATION-001 --planApprovalRef=docs/process/approvals/FOUNDATION-GATE-CHECK-SERIALIZATION-001.json --closeoutKey=foundation-gate-check-serialization-v1 --commitRef=HEAD',
]

export const FOUNDATION_GATE_CHECK_SERIALIZATION_NOT_NEXT = [
  'Do not start Strategy or People work from this card.',
  'Do not run live provider probes, model calls, or extraction.',
  'Do not weaken or reclassify real DB/schema/verifier failures.',
  'Do not parallelize heavy Foundation DB proof checks until this serialization guard is in place and dogfooded.',
  'Do not mutate credentials, Drive permissions, external systems, or source artifacts.',
  'Do not work MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.',
]

export function getHeavyFoundationGateCheckCommands() {
  return HEAVY_FOUNDATION_GATE_CHECKS.map(check => check.command)
}

export function isHeavyFoundationGateCheck(label = '') {
  const normalized = String(label || '').trim()
  return HEAVY_FOUNDATION_GATE_CHECKS.some(check => check.command === normalized || check.scriptPath === normalized)
}

function lockDisabled() {
  return ['1', 'true', 'yes', 'y'].includes(String(process.env[FOUNDATION_HEAVY_GATE_CHECK_LOCK_DISABLED_ENV] || '').trim().toLowerCase())
}

function inheritedOwnerToken() {
  return String(process.env[FOUNDATION_HEAVY_GATE_CHECK_LOCK_OWNER_TOKEN_ENV] || '').trim()
}

function currentAsyncOwnerToken() {
  return String(lockOwnerTokenContext.getStore()?.ownerToken || '').trim()
}

function defaultLockDir(repoRoot = process.cwd()) {
  return path.join(repoRoot, '.git', 'foundation-heavy-gate-check.lock')
}

function normalizePositiveNumber(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : fallback
}

async function readJsonFile(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'))
  } catch {
    return null
  }
}

function processIsAlive(pid) {
  const numericPid = Number(pid)
  if (!Number.isFinite(numericPid) || numericPid <= 0) return false
  try {
    process.kill(numericPid, 0)
    return true
  } catch (error) {
    return error?.code === 'EPERM'
  }
}

async function removeLockDirIfStale(lockDir, staleMs) {
  const ownerPath = path.join(lockDir, 'owner.json')
  const owner = await readJsonFile(ownerPath)
  const now = Date.now()
  const acquiredAt = owner?.acquiredAt ? new Date(owner.acquiredAt).getTime() : 0
  const lockAgeMs = Number.isFinite(acquiredAt) && acquiredAt > 0 ? now - acquiredAt : staleMs + 1
  const ownerAlive = processIsAlive(owner?.pid)
  if (ownerAlive && lockAgeMs <= staleMs) {
    return { removed: false, owner }
  }

  if (!ownerAlive || lockAgeMs > staleMs) {
    await fs.rm(lockDir, { recursive: true, force: true })
    return { removed: true, owner }
  }

  return { removed: false, owner }
}

export async function acquireFoundationHeavyGateCheckLock(options = {}) {
  const label = String(options.label || 'foundation-heavy-gate-check').trim()
  const repoRoot = options.repoRoot || process.cwd()
  const lockDir = options.lockDir || defaultLockDir(repoRoot)
  const timeoutMs = normalizePositiveNumber(options.timeoutMs, 10 * 60 * 1000)
  const pollMs = normalizePositiveNumber(options.pollMs, 100)
  const staleMs = normalizePositiveNumber(options.staleMs, 30 * 60 * 1000)
  const startedAt = Date.now()
  let staleRemovals = 0
  let waits = 0

  while (Date.now() - startedAt <= timeoutMs) {
    try {
      await fs.mkdir(lockDir, { recursive: false })
      const ownerToken = randomUUID()
      const owner = {
        label,
        pid: process.pid,
        ownerToken,
        acquiredAt: new Date().toISOString(),
        timeoutMs,
        staleMs,
      }
      await fs.writeFile(path.join(lockDir, 'owner.json'), `${JSON.stringify(owner, null, 2)}\n`, 'utf8')
      return {
        label,
        lockDir,
        ownerToken,
        acquiredAt: owner.acquiredAt,
        waitedMs: Date.now() - startedAt,
        staleRemovals,
        reentrant: false,
        release: async () => {
          await fs.rm(lockDir, { recursive: true, force: true })
        },
      }
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error
      const owner = await readJsonFile(path.join(lockDir, 'owner.json'))
      const token = inheritedOwnerToken()
      const asyncToken = currentAsyncOwnerToken()
      const sameProcessOwner = Number(owner?.pid) === process.pid
      const ownerTokenCanReenter = token && owner?.ownerToken === token && (!sameProcessOwner || asyncToken === token)
      if (ownerTokenCanReenter) {
        return {
          label,
          lockDir,
          ownerToken: token,
          acquiredAt: owner.acquiredAt || new Date().toISOString(),
          waitedMs: Date.now() - startedAt,
          staleRemovals,
          reentrant: true,
          release: async () => {},
        }
      }
      const stale = await removeLockDirIfStale(lockDir, staleMs)
      if (stale.removed) {
        staleRemovals += 1
        continue
      }
      waits += 1
      await sleep(pollMs)
    }
  }

  throw new Error(`Timed out waiting for serialized Foundation heavy gate check lock after ${timeoutMs}ms: ${label}`)
}

export async function runSerializedFoundationGateCheck(label, operation, options = {}) {
  if (typeof operation !== 'function') {
    throw new TypeError('runSerializedFoundationGateCheck requires an operation function.')
  }
  if (lockDisabled()) return operation({ locked: false, lock: null })

  const lock = await acquireFoundationHeavyGateCheckLock({ ...options, label })
  const previousOwnerToken = process.env[FOUNDATION_HEAVY_GATE_CHECK_LOCK_OWNER_TOKEN_ENV]
  process.env[FOUNDATION_HEAVY_GATE_CHECK_LOCK_OWNER_TOKEN_ENV] = lock.ownerToken
  try {
    return await lockOwnerTokenContext.run({ ownerToken: lock.ownerToken }, () => operation({ locked: true, lock }))
  } finally {
    if (previousOwnerToken === undefined) {
      delete process.env[FOUNDATION_HEAVY_GATE_CHECK_LOCK_OWNER_TOKEN_ENV]
    } else {
      process.env[FOUNDATION_HEAVY_GATE_CHECK_LOCK_OWNER_TOKEN_ENV] = previousOwnerToken
    }
    await lock.release()
  }
}

async function captureError(operation) {
  try {
    const value = await operation()
    return { ok: true, value, error: null, message: '' }
  } catch (error) {
    return {
      ok: false,
      value: null,
      error,
      name: error?.name || null,
      code: error?.code || null,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

function intervalsOverlap(a, b) {
  return Number(a.startedAtMs) < Number(b.endedAtMs) && Number(b.startedAtMs) < Number(a.endedAtMs)
}

export async function buildFoundationGateCheckSerializationDogfood(options = {}) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'foundation-heavy-gate-lock-'))
  const lockDir = path.join(tempRoot, 'heavy-gate.lock')
  const intervals = []
  const events = []

  const first = runSerializedFoundationGateCheck(
    'synthetic-heavy-gate-a',
    async ({ lock }) => {
      const startedAtMs = Date.now()
      events.push({ label: 'a', event: 'start', waitedMs: lock.waitedMs })
      await sleep(90)
      const endedAtMs = Date.now()
      intervals.push({ label: 'a', startedAtMs, endedAtMs, waitedMs: lock.waitedMs })
      events.push({ label: 'a', event: 'end' })
      return 'a-done'
    },
    { lockDir, timeoutMs: 5000, pollMs: 10, staleMs: 60000 },
  )

  await sleep(10)
  const second = runSerializedFoundationGateCheck(
    'synthetic-heavy-gate-b',
    async ({ lock }) => {
      const startedAtMs = Date.now()
      events.push({ label: 'b', event: 'start', waitedMs: lock.waitedMs })
      await sleep(5)
      const endedAtMs = Date.now()
      intervals.push({ label: 'b', startedAtMs, endedAtMs, waitedMs: lock.waitedMs })
      events.push({ label: 'b', event: 'end' })
      return 'b-done'
    },
    { lockDir, timeoutMs: 5000, pollMs: 10, staleMs: 60000 },
  )

  const concurrent = await Promise.all([first, second])
  const ordered = intervals.slice().sort((a, b) => a.startedAtMs - b.startedAtMs)
  const nonOverlapping = ordered.length === 2 && !intervalsOverlap(ordered[0], ordered[1])
  const secondWaited = ordered[1]?.waitedMs >= 50 || ordered[1]?.startedAtMs >= ordered[0]?.endedAtMs

  const permanentFailure = await captureError(() => runSerializedFoundationGateCheck(
    'synthetic-heavy-gate-permanent-failure',
    async () => {
      throw new Error('synthetic permanent DB verifier failure must fail closed')
    },
    { lockDir, timeoutMs: 5000, pollMs: 10, staleMs: 60000 },
  ))

  const ownerReentry = await runSerializedFoundationGateCheck(
    'synthetic-heavy-gate-parent',
    async ({ lock: parentLock }) => runSerializedFoundationGateCheck(
      'synthetic-heavy-gate-child',
      async ({ lock: childLock }) => ({
        parentOwnerToken: parentLock.ownerToken,
        childOwnerToken: childLock.ownerToken,
        childReentrant: childLock.reentrant === true,
        childWaitedMs: childLock.waitedMs,
      }),
      { lockDir, timeoutMs: 1000, pollMs: 10, staleMs: 60000 },
    ),
    { lockDir, timeoutMs: 5000, pollMs: 10, staleMs: 60000 },
  )

  await fs.rm(tempRoot, { recursive: true, force: true })

  const ok = concurrent[0] === 'a-done' &&
    concurrent[1] === 'b-done' &&
    nonOverlapping &&
    secondWaited &&
    ownerReentry.childReentrant === true &&
    ownerReentry.childOwnerToken === ownerReentry.parentOwnerToken &&
    ownerReentry.childWaitedMs < 50 &&
    permanentFailure.ok === false &&
    /synthetic permanent DB verifier failure/.test(permanentFailure.message)

  return {
    ok,
    mode: 'local-heavy-gate-serialization-dogfood',
    lockType: 'local-atomic-directory-lock',
    heavyChecks: HEAVY_FOUNDATION_GATE_CHECKS,
    concurrent,
    intervals: ordered,
    events,
    nonOverlapping,
    secondWaited,
    ownerReentry,
    permanentFailure: {
      failedClosed: permanentFailure.ok === false,
      message: permanentFailure.message,
    },
  }
}

export function buildFoundationGateCheckSerializationBacklogRow({ closeCard = false } = {}) {
  return {
    id: FOUNDATION_GATE_CHECK_SERIALIZATION_CARD_ID,
    title: 'Serialize DB-heavy Foundation gate checks',
    team: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 0,
    source: 'Steve May 20 fresh run order',
    summary: 'Prevent concurrent DB-heavy Foundation proof checks from creating misleading raw health failures while preserving fail-closed behavior for real DB/schema/verifier failures.',
    whyItMatters: 'Brain Fleet and extractor work can only start if Foundation health is raw green and trustworthy. A false red from concurrent proof contention would waste the run; hiding real failures would be worse.',
    nextAction: closeCard
      ? `${FOUNDATION_GATE_CHECK_SERIALIZATION_NEXT_CARD_ID} is the next active blocker in scoped state. Build Brain Fleet contract only after its Plan Critic/proof posture is opened; no live provider probes yet.`
      : 'Wrap heavy Foundation DB proof checks in the shared serialization guard, dogfood concurrent attempts, then close and advance to Brain Fleet.',
    statusNote: closeCard
      ? `Closed under ${FOUNDATION_GATE_CHECK_SERIALIZATION_CLOSEOUT_KEY}; heavy DB Foundation gates serialize locally and permanent failures still fail closed.`
      : 'Building now. Heavy Foundation DB checks must run sequentially until the close-card proof passes.',
    owner: 'Foundation Builder',
  }
}

export function buildFoundationGateCheckSerializationSprintItem(item = {}, { closeCard = false } = {}) {
  return {
    ...item,
    cardId: FOUNDATION_GATE_CHECK_SERIALIZATION_CARD_ID,
    backlogId: FOUNDATION_GATE_CHECK_SERIALIZATION_CARD_ID,
    order: Number(item.order || item.sprintOrder || 0) || 1,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: FOUNDATION_GATE_CHECK_SERIALIZATION_PLAN_PATH,
    definitionOfDone: 'DB-heavy Foundation proof checks are classified, serialized by the shared guard, dogfooded against concurrent false-red attempts, documented as sequential, and proven not to weaken real DB failures.',
    proofCommands: FOUNDATION_GATE_CHECK_SERIALIZATION_PROOF_COMMANDS,
    readinessBlockerCleared: closeCard
      ? 'Concurrent heavy-gate proof attempts serialize; raw health failures still reflect real failures.'
      : 'Awaiting focused serialization proof and full Foundation gates.',
    notNextBoundaries: FOUNDATION_GATE_CHECK_SERIALIZATION_NOT_NEXT,
    existingWorkCheck: {
      existingCode: [
        'lib/foundation-gate-reliability.js',
        'scripts/foundation-verify.mjs',
        'scripts/process-system-health-nightly-audit-check.mjs',
        'scripts/process-build-lane-repeated-failure-action-gate-check.mjs',
        'scripts/backlog-hygiene.mjs',
        'scripts/process-foundation-ship.mjs',
      ],
      existingDocs: [
        FOUNDATION_GATE_CHECK_SERIALIZATION_PLAN_PATH,
        'docs/process/foundation-ship-gate.md',
        'docs/rebuild/current-plan.md',
        'docs/rebuild/current-state.md',
        'docs/handoffs/2026-05-20-orchestrator-builder-run-checkpoint.md',
      ],
      existingScripts: [
        FOUNDATION_GATE_CHECK_SERIALIZATION_SCRIPT_PATH,
        'scripts/process-gate-reliability-check.mjs',
        'scripts/process-system-health-nightly-audit-check.mjs',
        'scripts/process-build-lane-repeated-failure-action-gate-check.mjs',
        'scripts/backlog-hygiene.mjs',
        'scripts/foundation-verify.mjs',
      ],
      existingPolicy: [
        'Green means raw green; do not hide failures by classification.',
        'Repeated failures stop sprint/value progression until repaired or attached.',
        'Build one lane only.',
        'Current Sprint active blocker controls the run order.',
      ],
      reused: [
        'Existing Foundation gate retry classifier remains responsible for transient retry diagnosis.',
        'Existing Foundation DB readiness checks remain in place.',
        'Existing process:foundation-ship wrapper remains the canonical ship gate.',
        'Existing Current Sprint overlay tables remain live command truth.',
      ],
      notRebuilt: [
        'No new verifier framework.',
        'No new DB client registry.',
        'No provider route probing.',
        'No extractor runtime work.',
        'No Strategy or People work.',
      ],
      exactGap: 'A concurrent proof bundle produced a Postgres deadlock while the same System Health proof passed sequentially. Heavy DB proof checks need a shared serialization guard before long Brain Fleet/extractor readiness work.',
      overBroadRisk: 'This could drift into verifier rewrite, provider work, or hiding red health by classification. The fix is only a local serialization wrapper and dogfood proof.',
      readyBy: 'Steve May 20 fresh run order',
      readyAt: '2026-05-20T00:00:00-04:00',
    },
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: FOUNDATION_GATE_CHECK_SERIALIZATION_CLOSEOUT_KEY,
      heavyGateSerialization: true,
      heavyGateLockType: 'local-atomic-directory-lock',
      rawGreenRequired: true,
    },
  }
}
