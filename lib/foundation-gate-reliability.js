const TRANSIENT_GATE_ERROR_PATTERN = /deadlock detected|ECONNRESET|ETIMEDOUT|429 Too Many Requests|quota/i

function normalizeNumber(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : fallback
}

export function isTransientFoundationGateError(error) {
  const output = [
    error?.stdout,
    error?.stderr,
    error?.message,
    String(error || ''),
  ].filter(Boolean).join('\n')
  return TRANSIENT_GATE_ERROR_PATTERN.test(output)
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
      const transient = isTransientFoundationGateError(error)
      if (!transient || attempt > retries) {
        error.foundationGateReliability = {
          label,
          attempts: attempt,
          transient,
          retried: attempt > 1,
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
        })
      }
      if (typeof options.beforeRetry === 'function') {
        await options.beforeRetry({
          label,
          attempt,
          nextAttempt: attempt + 1,
          maxAttempts: retries + 1,
          error,
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

  const ok = transient.ok &&
    transient.attempts === 2 &&
    retryEvents.length === 1 &&
    permanent.ok === false &&
    permanent.attempts === 1 &&
    permanent.error?.foundationGateReliability?.transient === false &&
    transientAfterCleanup.ok === true

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
  }
}
