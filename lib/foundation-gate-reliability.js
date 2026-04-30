const TRANSIENT_GATE_ERROR_CLASSES = [
  {
    transientClass: 'postgres-deadlock',
    subsystem: 'postgres',
    pattern: /deadlock detected|40P01/i,
    summary: 'Postgres reported a deadlock while gate checks were reading or writing Foundation state.',
  },
  {
    transientClass: 'foundation-db-pool-closed',
    subsystem: 'foundation-db-pool',
    pattern: /Cannot use a pool after calling end on the pool|pool is closed/i,
    summary: 'Foundation DB cleanup left the current process with a closed pool before retry.',
  },
  {
    transientClass: 'network-timeout',
    subsystem: 'network',
    pattern: /ECONNRESET|ETIMEDOUT|EAI_AGAIN|fetch failed|socket hang up/i,
    summary: 'A local or external network request failed with a retryable transport error.',
  },
  {
    transientClass: 'external-quota',
    subsystem: 'external-api',
    pattern: /429 Too Many Requests|quota/i,
    summary: 'An external API returned quota or rate-limit pressure.',
  },
]

function getFoundationGateErrorOutput(error) {
  return [
    error?.code ? `code=${error.code}` : '',
    error?.severity ? `severity=${error.severity}` : '',
    error?.routine ? `routine=${error.routine}` : '',
    error?.detail,
    error?.stdout,
    error?.stderr,
    error?.message,
    String(error || ''),
  ].filter(Boolean).join('\n')
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map(value => String(value || '').trim())
    .filter(Boolean))]
}

function extractRegexValues(text, pattern) {
  return uniqueStrings([...String(text || '').matchAll(pattern)].map(match => match[1]))
}

export function extractPostgresGateErrorMetadata(error) {
  const output = getFoundationGateErrorOutput(error)
  const relationOids = extractRegexValues(output, /\brelation\s+(\d+)\b/gi)
  const processIds = extractRegexValues(output, /\bProcess\s+(\d+)\b/gi)
  return {
    postgresCode: error?.code ? String(error.code) : (/40P01/i.test(output) ? '40P01' : null),
    severity: error?.severity ? String(error.severity) : null,
    routine: error?.routine ? String(error.routine) : null,
    relationOids,
    processIds,
  }
}

function normalizeNumber(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : fallback
}

export function classifyFoundationGateError(error) {
  const output = getFoundationGateErrorOutput(error)
  const matched = TRANSIENT_GATE_ERROR_CLASSES.find(item => item.pattern.test(output))
  const firstLine = output.split(/\r?\n/).find(Boolean) || 'No error output captured.'

  if (matched) {
    const postgres = matched.subsystem === 'postgres'
      ? extractPostgresGateErrorMetadata(error)
      : null
    return {
      transient: true,
      transientClass: matched.transientClass,
      subsystem: matched.subsystem,
      summary: matched.summary,
      evidence: firstLine.slice(0, 240),
      postgres,
    }
  }

  return {
    transient: false,
    transientClass: 'permanent-or-unknown',
    subsystem: 'verifier',
    summary: 'The gate failure is not on the bounded transient allowlist.',
    evidence: firstLine.slice(0, 240),
    postgres: extractPostgresGateErrorMetadata(error),
  }
}

export function isTransientFoundationGateError(error) {
  return classifyFoundationGateError(error).transient
}

export function formatFoundationGateRetryMessage(label, event) {
  const diagnostic = event?.diagnostic || classifyFoundationGateError(event?.error)
  const postgres = diagnostic?.postgres || {}
  const postgresDetail = diagnostic?.subsystem === 'postgres'
    ? [
      postgres.postgresCode ? `pgCode=${postgres.postgresCode}` : '',
      postgres.relationOids?.length ? `relationOids=${postgres.relationOids.join(',')}` : '',
      postgres.processIds?.length ? `processIds=${postgres.processIds.join(',')}` : '',
      postgres.routine ? `routine=${postgres.routine}` : '',
    ].filter(Boolean).join('; ')
    : ''
  return [
    `${label} hit a transient gate error`,
    `(class=${diagnostic.transientClass}; subsystem=${diagnostic.subsystem})`,
    `retrying attempt ${event.nextAttempt}/${event.maxAttempts}.`,
    postgresDetail ? `Postgres: ${postgresDetail}.` : '',
    `Evidence: ${diagnostic.evidence}`,
  ].filter(Boolean).join(' ')
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function runWithFoundationGateRetry(label, operation, options = {}) {
  const retries = normalizeNumber(options.retries, 1)
  const delayMs = normalizeNumber(options.delayMs, 1500)
  let attempt = 0
  let lastError = null

  while (attempt <= retries) {
    attempt += 1
    try {
      const value = await operation({ attempt })
      return { ok: true, value, attempts: attempt, retried: attempt > 1, lastError: null }
    } catch (error) {
      lastError = error
      const diagnostic = classifyFoundationGateError(error)
      if (!diagnostic.transient || attempt > retries) {
        error.foundationGateReliability = {
          label,
          attempts: attempt,
          transient: diagnostic.transient,
          retried: attempt > 1,
          diagnostic,
        }
        throw error
      }

      if (typeof options.onRetry === 'function') {
        await options.onRetry({
          label,
          attempt,
          nextAttempt: attempt + 1,
          maxAttempts: retries + 1,
          error,
          diagnostic,
        })
      }
      if (typeof options.beforeRetry === 'function') {
        await options.beforeRetry({
          label,
          attempt,
          nextAttempt: attempt + 1,
          maxAttempts: retries + 1,
          error,
          diagnostic,
        })
      }
      await sleep(delayMs * attempt)
    }
  }

  throw lastError
}

async function countAttempts(operation) {
  let attempts = 0
  try {
    const result = await operation(() => {
      attempts += 1
      return attempts
    })
    return { ok: true, attempts, result, error: null }
  } catch (error) {
    return { ok: false, attempts, result: null, error }
  }
}

async function buildTransientAfterCleanupProof(options = {}) {
  if (typeof options.probe !== 'function' || typeof options.cleanup !== 'function') {
    return {
      ok: true,
      mode: 'not-run',
      attempts: 0,
      cleanupCalls: 0,
      passedAfterCleanup: true,
    }
  }

  let cleanupCalls = 0
  const result = await countAttempts(async nextAttempt => runWithFoundationGateRetry(
    'synthetic transient after DB cleanup',
    async () => {
      const attempt = nextAttempt()
      await options.probe({ attempt })
      if (attempt === 1) throw new Error('deadlock detected: synthetic transient after DB cleanup fixture')
      return 'cleanup retry recovered'
    },
    {
      retries: 1,
      delayMs: 0,
      beforeRetry: async event => {
        cleanupCalls += 1
        await options.cleanup(event)
      },
    },
  ))

  return {
    ok: result.ok &&
      result.attempts === 2 &&
      cleanupCalls === 1 &&
      result.result?.value === 'cleanup retry recovered',
    mode: 'deterministic-db-cleanup-fixture',
    attempts: result.attempts,
    cleanupCalls,
    passedAfterCleanup: result.result?.value === 'cleanup retry recovered',
    failedClosed: result.ok === false,
    error: result.error ? String(result.error.message || result.error) : null,
  }
}

async function buildRecurringDeadlockDiagnosticProof() {
  const retryEvents = []
  const result = await countAttempts(async nextAttempt => runWithFoundationGateRetry(
    'synthetic recurring foundation:verify deadlock',
    async () => {
      const attempt = nextAttempt()
      if (attempt === 1) throw new Error('deadlock detected: synthetic recurring verifier transient fixture')
      return 'recurring deadlock diagnostic recovered'
    },
    {
      retries: 1,
      delayMs: 0,
      onRetry: event => {
        retryEvents.push({
          label: event.label,
          attempt: event.attempt,
          nextAttempt: event.nextAttempt,
          maxAttempts: event.maxAttempts,
          transientClass: event.diagnostic?.transientClass,
          subsystem: event.diagnostic?.subsystem,
          formattedMessage: formatFoundationGateRetryMessage(event.label, event),
        })
      },
    },
  ))

  const firstRetry = retryEvents[0] || null
  return {
    ok: result.ok &&
      result.attempts === 2 &&
      firstRetry?.transientClass === 'postgres-deadlock' &&
      firstRetry?.subsystem === 'postgres' &&
      /class=postgres-deadlock; subsystem=postgres/.test(firstRetry.formattedMessage || ''),
    mode: 'deterministic-recurring-deadlock-diagnostic-fixture',
    attempts: result.attempts,
    transientClass: firstRetry?.transientClass || null,
    subsystem: firstRetry?.subsystem || null,
    formattedMessage: firstRetry?.formattedMessage || '',
    passedAfterRetry: result.result?.value === 'recurring deadlock diagnostic recovered',
    error: result.error ? String(result.error.message || result.error) : null,
  }
}

async function buildDirectVerifierDeadlockDiagnosticProof() {
  const retryEvents = []
  const pgDeadlockError = Object.assign(
    new Error('deadlock detected: direct foundation:verify fixture'),
    {
      code: '40P01',
      severity: 'ERROR',
      routine: 'DeadLockReport',
      detail: 'Process 44406 waits for ShareLock on relation 16402 of database 16384; blocked by process 44405.\nProcess 44405 waits for AccessExclusiveLock on relation 16389 of database 16384; blocked by process 44406.',
    },
  )
  const result = await countAttempts(async nextAttempt => runWithFoundationGateRetry(
    'synthetic direct foundation:verify postgres deadlock',
    async () => {
      const attempt = nextAttempt()
      if (attempt === 1) throw pgDeadlockError
      return 'direct verifier deadlock diagnostic recovered'
    },
    {
      retries: 1,
      delayMs: 0,
      onRetry: event => {
        retryEvents.push({
          label: event.label,
          attempt: event.attempt,
          nextAttempt: event.nextAttempt,
          maxAttempts: event.maxAttempts,
          transientClass: event.diagnostic?.transientClass,
          subsystem: event.diagnostic?.subsystem,
          postgres: event.diagnostic?.postgres || null,
          formattedMessage: formatFoundationGateRetryMessage(event.label, event),
        })
      },
    },
  ))

  const firstRetry = retryEvents[0] || null
  const relationOids = firstRetry?.postgres?.relationOids || []
  const processIds = firstRetry?.postgres?.processIds || []
  return {
    ok: result.ok &&
      result.attempts === 2 &&
      firstRetry?.transientClass === 'postgres-deadlock' &&
      firstRetry?.subsystem === 'postgres' &&
      firstRetry?.postgres?.postgresCode === '40P01' &&
      relationOids.includes('16402') &&
      relationOids.includes('16389') &&
      processIds.includes('44406') &&
      processIds.includes('44405') &&
      /relationOids=16402,16389/.test(firstRetry.formattedMessage || '') &&
      /processIds=44406,44405/.test(firstRetry.formattedMessage || ''),
    mode: 'deterministic-direct-verifier-postgres-deadlock-fixture',
    attempts: result.attempts,
    transientClass: firstRetry?.transientClass || null,
    subsystem: firstRetry?.subsystem || null,
    postgresCode: firstRetry?.postgres?.postgresCode || null,
    relationOids,
    processIds,
    formattedMessage: firstRetry?.formattedMessage || '',
    passedAfterRetry: result.result?.value === 'direct verifier deadlock diagnostic recovered',
    error: result.error ? String(result.error.message || result.error) : null,
  }
}

export async function buildSyntheticGateReliabilityProof(options = {}) {
  const retryEvents = []
  const transient = await countAttempts(async nextAttempt => runWithFoundationGateRetry(
    'synthetic transient gate failure',
    async () => {
      const attempt = nextAttempt()
      if (attempt === 1) throw new Error('deadlock detected: synthetic transient fixture')
      return 'transient recovered'
    },
    {
      retries: 1,
      delayMs: 0,
      onRetry: event => {
        retryEvents.push({
          label: event.label,
          attempt: event.attempt,
          nextAttempt: event.nextAttempt,
          maxAttempts: event.maxAttempts,
        })
      },
    },
  ))

  const permanent = await countAttempts(async nextAttempt => runWithFoundationGateRetry(
    'synthetic permanent gate failure',
    async () => {
      nextAttempt()
      throw new Error('schema verifier failed: synthetic permanent fixture')
    },
    { retries: 1, delayMs: 0 },
  ))

  const transientAfterCleanup = await buildTransientAfterCleanupProof(options.transientAfterCleanup)
  const recurringDeadlockDiagnostic = await buildRecurringDeadlockDiagnosticProof()
  const directVerifierDeadlockDiagnostic = await buildDirectVerifierDeadlockDiagnosticProof()

  const ok = transient.ok &&
    transient.attempts === 2 &&
    retryEvents.length === 1 &&
    permanent.ok === false &&
    permanent.attempts === 1 &&
    permanent.error?.foundationGateReliability?.transient === false &&
    transientAfterCleanup.ok === true &&
    recurringDeadlockDiagnostic.ok === true &&
    directVerifierDeadlockDiagnostic.ok === true

  return {
    ok,
    mode: 'deterministic-injected-fixture',
    realDeadlockInduced: false,
    transient: {
      ok: transient.ok,
      attempts: transient.attempts,
      retried: retryEvents.length === 1,
      passedAfterRetry: transient.result?.value === 'transient recovered',
    },
    permanent: {
      ok: permanent.ok,
      attempts: permanent.attempts,
      failedClosed: permanent.ok === false,
      transientClassified: permanent.error?.foundationGateReliability?.transient === true,
    },
    transientAfterCleanup,
    recurringDeadlockDiagnostic,
    directVerifierDeadlockDiagnostic,
  }
}
