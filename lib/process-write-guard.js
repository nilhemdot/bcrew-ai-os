export class ProcessWriteGuardError extends Error {
  constructor(message, details = {}) {
    super(message)
    this.name = 'ProcessWriteGuardError'
    this.code = 'PROCESS_CHECK_WRITE_BLOCKED'
    this.details = details
  }
}

export const PROCESS_CHECK_WRITE_FLAGS = {
  apply: 'apply',
  closeCard: 'close-card',
  mutateSprint: 'mutate-sprint',
  writeReport: 'write-report',
}

const FLAG_ALIASES = new Map([
  ['apply', PROCESS_CHECK_WRITE_FLAGS.apply],
  ['close-card', PROCESS_CHECK_WRITE_FLAGS.closeCard],
  ['closeCard', PROCESS_CHECK_WRITE_FLAGS.closeCard],
  ['mutate-sprint', PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  ['mutateSprint', PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  ['write-report', PROCESS_CHECK_WRITE_FLAGS.writeReport],
  ['writeReport', PROCESS_CHECK_WRITE_FLAGS.writeReport],
])

function boolArg(value) {
  if (value === true) return true
  const normalized = String(value || '').trim().toLowerCase()
  return ['1', 'true', 'yes', 'y'].includes(normalized)
}

export function parseProcessWriteFlags(argv = []) {
  const enabled = new Set()
  for (const rawArg of argv || []) {
    const arg = String(rawArg || '')
    if (!arg.startsWith('--')) continue
    const [rawKey, ...rawValue] = arg.slice(2).split('=')
    const key = FLAG_ALIASES.get(rawKey)
    if (!key) continue
    const value = rawValue.length ? rawValue.join('=') : 'true'
    if (boolArg(value)) enabled.add(key)
  }
  return enabled
}

export function isProcessCheckPath(scriptPath = '') {
  const normalized = String(scriptPath || '').split('/').pop() || ''
  return /^process-.*-check\.mjs$/.test(normalized)
}

export function isProcessCheckWriteRequested(options = {}) {
  const enabled = parseProcessWriteFlags(options.argv || [])
  const allowedFlags = options.allowedFlags || Object.values(PROCESS_CHECK_WRITE_FLAGS)
  return allowedFlags.some(flag => enabled.has(FLAG_ALIASES.get(flag) || flag))
}

export function isProcessReportWriteRequested(argv = []) {
  return isProcessCheckWriteRequested({
    argv,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.writeReport],
  })
}

export function assertProcessCheckWriteAllowed(options = {}) {
  const {
    argv = [],
    scriptPath = '',
    operation = 'write live state',
    allowedFlags = [PROCESS_CHECK_WRITE_FLAGS.apply],
  } = options

  if (!isProcessCheckPath(scriptPath)) return true

  const enabled = parseProcessWriteFlags(argv)
  const normalizedAllowed = allowedFlags.map(flag => FLAG_ALIASES.get(flag) || flag)
  const allowed = enabled.has(PROCESS_CHECK_WRITE_FLAGS.apply) ||
    normalizedAllowed.some(flag => enabled.has(flag))

  if (allowed) return true

  const required = normalizedAllowed
    .map(flag => `--${flag}`)
    .filter((flag, index, list) => list.indexOf(flag) === index)
    .join(' or ')
  throw new ProcessWriteGuardError(
    `process check write blocked: ${operation} in ${scriptPath || 'unknown script'} requires explicit ${required || '--apply'}.`,
    {
      scriptPath,
      operation,
      allowedFlags: normalizedAllowed,
      enabledFlags: Array.from(enabled),
    },
  )
}

export function getCurrentProcessScriptPath(argv = process.argv) {
  return String((Array.isArray(argv) ? argv : process.argv)[1] || '')
}

export function assertCurrentProcessCheckWriteAllowed(options = {}) {
  return assertProcessCheckWriteAllowed({
    ...options,
    argv: options.argv || process.argv.slice(2),
    scriptPath: options.scriptPath || getCurrentProcessScriptPath(),
  })
}

async function capture(operation) {
  try {
    return { ok: true, value: await operation(), error: null }
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

async function syntheticProcessCheckWrite(argv, operation = 'synthetic live-state write') {
  assertProcessCheckWriteAllowed({
    argv,
    scriptPath: 'scripts/process-synthetic-check.mjs',
    operation,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  return 'write allowed'
}

async function syntheticReportWrite(argv) {
  assertProcessCheckWriteAllowed({
    argv,
    scriptPath: 'scripts/process-synthetic-check.mjs',
    operation: 'synthetic report write',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.writeReport],
  })
  return 'report write allowed'
}

export async function buildProcessCheckApplyBoundaryDogfoodProof() {
  const blockedNoFlag = await capture(() => syntheticProcessCheckWrite(['--json=true']))
  const allowedApply = await capture(() => syntheticProcessCheckWrite(['--json=true', '--apply=true']))
  const allowedCloseCard = await capture(() => syntheticProcessCheckWrite(['--json=true', '--close-card=true']))
  const blockedWrongFlag = await capture(() => syntheticProcessCheckWrite(['--json=true', '--write-report=true']))
  const reportAllowed = await capture(() => syntheticReportWrite(['--json=true', '--write-report=true']))
  const nonCheckAllowed = await capture(async () => {
    assertProcessCheckWriteAllowed({
      argv: [],
      scriptPath: 'scripts/run-foundation-job.mjs',
      operation: 'synthetic non-check write',
    })
    return 'non-check script not governed by check posture'
  })

  const blockedFailures = [blockedNoFlag, blockedWrongFlag]
  const allowedPasses = [allowedApply, allowedCloseCard, reportAllowed, nonCheckAllowed]
  const ok = blockedFailures.every(result =>
    result.ok === false &&
      result.code === 'PROCESS_CHECK_WRITE_BLOCKED' &&
      /requires explicit/.test(result.message || ''),
  ) &&
    allowedPasses.every(result => result.ok === true)

  return {
    ok,
    mode: 'process-check-write-posture-dogfood',
    blockedNoFlag: {
      ok: blockedNoFlag.ok === false,
      code: blockedNoFlag.code,
      message: blockedNoFlag.message,
    },
    allowedApply: {
      ok: allowedApply.ok,
      value: allowedApply.value,
    },
    allowedCloseCard: {
      ok: allowedCloseCard.ok,
      value: allowedCloseCard.value,
    },
    blockedWrongFlag: {
      ok: blockedWrongFlag.ok === false,
      code: blockedWrongFlag.code,
      message: blockedWrongFlag.message,
    },
    reportAllowed: {
      ok: reportAllowed.ok,
      value: reportAllowed.value,
    },
    nonCheckAllowed: {
      ok: nonCheckAllowed.ok,
      value: nonCheckAllowed.value,
    },
  }
}
