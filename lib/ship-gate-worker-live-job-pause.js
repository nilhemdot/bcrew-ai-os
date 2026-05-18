import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

export const SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CARD_ID = 'SHIP-GATE-WORKER-LIVE-JOB-PAUSE-001'
export const SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CLOSEOUT_KEY = 'ship-gate-worker-live-job-pause-v1'
export const SHIP_GATE_WORKER_LIVE_JOB_PAUSE_PLAN_PATH = 'docs/process/ship-gate-worker-live-job-pause-001-plan.md'
export const SHIP_GATE_WORKER_LIVE_JOB_PAUSE_APPROVAL_PATH = 'docs/process/approvals/SHIP-GATE-WORKER-LIVE-JOB-PAUSE-001.json'
export const SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-ship-gate-worker-live-job-pause-closeout.md'
export const SHIP_GATE_WORKER_LIVE_JOB_PAUSE_SCRIPT_PATH = 'scripts/process-ship-gate-worker-live-job-pause-check.mjs'
export const SHIP_GATE_WORKER_LIVE_JOB_PAUSE_SPRINT_ID = 'ship-gate-worker-live-job-pause-2026-05-18'
export const SHIP_GATE_WORKER_LIVE_JOB_PAUSE_PATH = '.git/foundation-worker-ship-pause.json'
export const SHIP_GATE_WORKER_LIVE_JOB_PAUSE_DEFAULT_TTL_MS = 10 * 60 * 1000

export const SHIP_GATE_WORKER_LIVE_JOB_PAUSE_NOT_NEXT_BOUNDARIES = [
  'No live extraction.',
  'No auth-required or paid run.',
  'No external write.',
  'No Google Drive permission mutation.',
  'Do not mutate Drive permissions.',
  'No live Agent Feedback auto-send.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'No Harlan/Fal/voice/Canva/OpenHuman feature work.',
  'Do not disable the worker permanently.',
  'Do not hide stale/running job failures.',
]

export const SHIP_GATE_WORKER_LIVE_JOB_PAUSE_PROOF_COMMANDS = [
  'node --check lib/ship-gate-worker-live-job-pause.js scripts/process-foundation-ship.mjs scripts/foundation-worker.mjs scripts/process-ship-gate-worker-live-job-pause-check.mjs',
  'npm run process:ship-gate-worker-live-job-pause-check -- --apply --stage=building_now --json',
  'npm run process:ship-gate-worker-live-job-pause-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  'npm run process:foundation-ship -- --card=SHIP-GATE-WORKER-LIVE-JOB-PAUSE-001 --planApprovalRef=docs/process/approvals/SHIP-GATE-WORKER-LIVE-JOB-PAUSE-001.json --closeoutKey=ship-gate-worker-live-job-pause-v1 --commitRef=HEAD',
]

export const SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CHANGED_FILES = [
  'lib/ship-gate-worker-live-job-pause.js',
  'scripts/process-foundation-ship.mjs',
  'scripts/foundation-worker.mjs',
  'lib/foundation-extraction-runtime-verifier.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'lib/foundation-build-closeout-cleanup-records.js',
  SHIP_GATE_WORKER_LIVE_JOB_PAUSE_SCRIPT_PATH,
  'package.json',
  'docs/process/foundation-ship-gate.md',
  SHIP_GATE_WORKER_LIVE_JOB_PAUSE_PLAN_PATH,
  SHIP_GATE_WORKER_LIVE_JOB_PAUSE_APPROVAL_PATH,
  SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CLOSEOUT_PATH,
  'docs/rebuild/current-state.md',
  'docs/rebuild/current-plan.md',
]

function normalizeText(value) {
  return String(value || '').trim()
}

function isoDate(value) {
  const date = value instanceof Date ? value : new Date(value || '')
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

function resolvePausePath(repoRoot = process.cwd()) {
  return path.join(repoRoot, SHIP_GATE_WORKER_LIVE_JOB_PAUSE_PATH)
}

function sha1(value) {
  return crypto.createHash('sha1').update(String(value || ''), 'utf8').digest('hex')
}

export function buildFoundationWorkerShipPause({
  cardId = '',
  closeoutKey = '',
  ttlMs = SHIP_GATE_WORKER_LIVE_JOB_PAUSE_DEFAULT_TTL_MS,
  now = new Date(),
  reason = 'process:foundation-ship-runtime-restart',
} = {}) {
  const startedAt = isoDate(now)
  const expiresAt = new Date(new Date(startedAt).getTime() + Math.max(60_000, Number(ttlMs) || SHIP_GATE_WORKER_LIVE_JOB_PAUSE_DEFAULT_TTL_MS)).toISOString()
  const seed = `${cardId}|${closeoutKey}|${startedAt}|${reason}`
  return {
    schemaVersion: 1,
    pauseId: `ship-worker-pause:${sha1(seed).slice(0, 16)}`,
    cardId: normalizeText(cardId),
    closeoutKey: normalizeText(closeoutKey),
    reason: normalizeText(reason) || 'process:foundation-ship-runtime-restart',
    startedAt,
    expiresAt,
    blocksScheduledJobs: true,
    allowsRuntimeStatusCapture: true,
    externalWritePerformed: false,
  }
}

export function evaluateFoundationWorkerShipPause(pause = {}, {
  now = new Date(),
  dryRun = false,
  jobKey = '',
} = {}) {
  const exists = pause && typeof pause === 'object' && Object.keys(pause).length > 0
  if (!exists) {
    return { paused: false, status: 'absent', reason: 'no ship-gate worker pause marker' }
  }

  const expiresAt = new Date(pause.expiresAt || '')
  const nowDate = now instanceof Date ? now : new Date(now || '')
  if (Number.isNaN(expiresAt.getTime()) || Number.isNaN(nowDate.getTime())) {
    return {
      paused: true,
      status: 'invalid_marker',
      reason: 'invalid ship-gate worker pause marker fails closed',
      pause,
      dryRun: Boolean(dryRun),
      jobKey: normalizeText(jobKey),
    }
  }
  if (expiresAt <= nowDate) {
    return {
      paused: false,
      status: 'expired',
      reason: 'ship-gate worker pause marker expired',
      pauseId: pause.pauseId || '',
      expiresAt: pause.expiresAt || '',
    }
  }

  return {
    paused: true,
    status: 'active',
    reason: 'ship-gate worker pause blocks scheduled job selection during served-code proof',
    pauseId: pause.pauseId || '',
    expiresAt: pause.expiresAt || '',
    cardId: pause.cardId || '',
    closeoutKey: pause.closeoutKey || '',
    dryRun: Boolean(dryRun),
    jobKey: normalizeText(jobKey),
  }
}

export async function writeFoundationWorkerShipPause({
  repoRoot = process.cwd(),
  cardId = '',
  closeoutKey = '',
  ttlMs = SHIP_GATE_WORKER_LIVE_JOB_PAUSE_DEFAULT_TTL_MS,
  reason = 'process:foundation-ship-runtime-restart',
} = {}) {
  const pause = buildFoundationWorkerShipPause({ cardId, closeoutKey, ttlMs, reason })
  const pausePath = resolvePausePath(repoRoot)
  await fs.mkdir(path.dirname(pausePath), { recursive: true })
  await fs.writeFile(pausePath, `${JSON.stringify(pause, null, 2)}\n`, 'utf8')
  return { pause, pausePath }
}

export async function readFoundationWorkerShipPause({ repoRoot = process.cwd() } = {}) {
  const pausePath = resolvePausePath(repoRoot)
  try {
    return JSON.parse(await fs.readFile(pausePath, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    return {
      schemaVersion: 1,
      pauseId: 'ship-worker-pause:invalid-marker',
      reason: 'invalid ship-gate worker pause marker fails closed',
      expiresAt: '',
      parseError: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function clearFoundationWorkerShipPause({
  repoRoot = process.cwd(),
  pauseId = '',
} = {}) {
  const pausePath = resolvePausePath(repoRoot)
  try {
    const existing = JSON.parse(await fs.readFile(pausePath, 'utf8'))
    if (pauseId && existing.pauseId && existing.pauseId !== pauseId) {
      return { cleared: false, pausePath, reason: 'pause marker belongs to a different ship gate' }
    }
  } catch (error) {
    if (error?.code === 'ENOENT') return { cleared: false, pausePath, reason: 'pause marker already absent' }
  }
  await fs.rm(pausePath, { force: true })
  return { cleared: true, pausePath, reason: 'pause marker cleared' }
}

export function buildShipGateWorkerLiveJobPauseDogfoodProof({
  processFoundationShipSource = '',
  foundationWorkerSource = '',
} = {}) {
  const activePause = buildFoundationWorkerShipPause({
    cardId: SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CARD_ID,
    closeoutKey: SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CLOSEOUT_KEY,
    now: new Date('2026-05-18T08:20:00.000Z'),
    ttlMs: 10 * 60 * 1000,
  })
  const activeDecision = evaluateFoundationWorkerShipPause(activePause, {
    now: new Date('2026-05-18T08:21:00.000Z'),
  })
  const expiredDecision = evaluateFoundationWorkerShipPause(activePause, {
    now: new Date('2026-05-18T08:31:00.000Z'),
  })
  const invalidDecision = evaluateFoundationWorkerShipPause({ expiresAt: 'not-a-date' }, {
    now: new Date('2026-05-18T08:21:00.000Z'),
  })
  const processWiring = [
    'writeFoundationWorkerShipPause',
    'clearFoundationWorkerShipPause',
    'skipWorkerScheduledPause',
    'workerScheduledPauseMs',
  ].every(token => String(processFoundationShipSource || '').includes(token))
  const workerWiring = [
    'readFoundationWorkerShipPause',
    'evaluateFoundationWorkerShipPause',
    'ship gate scheduled-job pause active',
    'return { ran: 0, failed: 0, paused: true',
  ].every(token => String(foundationWorkerSource || '').includes(token))
  return {
    ok: activeDecision.paused === true &&
      expiredDecision.paused === false &&
      invalidDecision.paused === true &&
      processWiring &&
      workerWiring,
    activeDecision,
    expiredDecision,
    invalidDecision,
    processWiring,
    workerWiring,
  }
}

export function renderShipGateWorkerLiveJobPauseCloseout(snapshot = {}) {
  const lines = []
  lines.push('# Ship Gate Worker Live Job Pause Closeout')
  lines.push('')
  lines.push(`Card: \`${SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CARD_ID}\``)
  lines.push(`Closeout key: \`${SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CLOSEOUT_KEY}\``)
  lines.push('')
  lines.push('## What Changed')
  lines.push('')
  lines.push('- `process:foundation-ship` now writes a short-lived Foundation worker pause marker before restarting the worker LaunchAgent.')
  lines.push('- `scripts/foundation-worker.mjs` records startup runtime metadata, then skips due scheduled job selection while that marker is active.')
  lines.push('- The marker is cleared in a `finally` path and also expires automatically if the ship gate is interrupted.')
  lines.push('')
  lines.push('## Proof')
  lines.push('')
  lines.push(`- Focused proof status: ${snapshot.ok ? 'healthy' : 'risk'}.`)
  lines.push('- Dogfood proves active pause blocks scheduled job selection, expired pause resumes normal selection, invalid marker fails closed, and process/worker wiring exists.')
  lines.push('- No live extraction, auth-required run, paid run, external write, Drive permission mutation, or Agent Feedback auto-send is introduced.')
  lines.push('')
  lines.push('## Next')
  lines.push('')
  lines.push('Continue safe Foundation source/connector work from live truth. If a due scheduled job must run during a ship gate, it requires explicit operator approval outside this card.')
  lines.push('')
  return `${lines.join('\n')}\n`
}
