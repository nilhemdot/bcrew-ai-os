import { runWithFoundationGateRetry } from './foundation-gate-reliability.js'

export const RUNTIME_SAFETY_HARDENING_SPRINT_ID = 'foundation-runtime-safety-hardening-2026-05-13'
export const RUNTIME_SAFETY_HARDENING_CLOSEOUT_KEY = 'foundation-runtime-safety-hardening-v1'
export const RUNTIME_SAFETY_HARDENING_SCRIPT_PATH = 'scripts/process-runtime-safety-hardening-check.mjs'

export const VERIFY_READONLY_GATE_CARD_ID = 'VERIFY-READONLY-GATE-001'

function normalizeNumber(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : fallback
}

export function buildFoundationVerifyRetryOptions(options = {}) {
  if (typeof options.beforeRetry === 'function' || typeof options.onCleanup === 'function' || typeof options.onRepairCleanup === 'function') {
    throw new Error('foundation:verify is read-only; repair or cleanup hooks must not be attached to the verifier retry path.')
  }

  return {
    retries: normalizeNumber(options.retries, 1),
    delayMs: normalizeNumber(options.delayMs, 1500),
    ...(typeof options.onRetry === 'function' ? { onRetry: options.onRetry } : {}),
  }
}

async function captureRun(operation) {
  try {
    return { ok: true, result: await operation(), error: null }
  } catch (error) {
    return {
      ok: false,
      result: null,
      error,
      message: error instanceof Error ? error.message : String(error),
      reliability: error?.foundationGateReliability || null,
    }
  }
}

function buildSyntheticTransientFailure() {
  return Object.assign(
    new Error('deadlock detected: synthetic broken live verifier state fixture'),
    {
      code: '40P01',
      severity: 'ERROR',
      routine: 'DeadLockReport',
      detail: 'Process 101 waits for ShareLock on relation 202; blocked by process 303.',
    },
  )
}

export async function buildVerifyReadOnlyGateDogfoodProof(options = {}) {
  const retries = normalizeNumber(options.retries, 1)
  const delayMs = normalizeNumber(options.delayMs, 0)

  const legacyState = { broken: true, repairCalls: 0 }
  const legacyRepairThenPass = await captureRun(() => runWithFoundationGateRetry(
    'legacy foundation:verify repair-then-pass fixture',
    async ({ attempt }) => {
      if (legacyState.broken) {
        if (attempt === 1) throw buildSyntheticTransientFailure()
        throw new Error('schema verifier failed: legacy state should have been repaired before this attempt')
      }
      return 'legacy verifier went green after repair'
    },
    {
      retries,
      delayMs,
      beforeRetry: async () => {
        legacyState.repairCalls += 1
        legacyState.broken = false
      },
    },
  ))

  const retryEvents = []
  const readOnlyState = { broken: true, repairCalls: 0 }
  const readOnlyFailClosed = await captureRun(() => runWithFoundationGateRetry(
    'foundation:verify read-only dogfood fixture',
    async ({ attempt }) => {
      if (readOnlyState.broken) {
        if (attempt === 1) throw buildSyntheticTransientFailure()
        throw new Error('schema verifier failed: synthetic broken live state remained broken')
      }
      return 'unexpected green'
    },
    buildFoundationVerifyRetryOptions({
      retries,
      delayMs,
      onRetry: event => {
        retryEvents.push({
          label: event.label,
          attempt: event.attempt,
          nextAttempt: event.nextAttempt,
          maxAttempts: event.maxAttempts,
          transientClass: event.diagnostic?.transientClass || null,
          subsystem: event.diagnostic?.subsystem || null,
        })
      },
    }),
  ))

  const repairHookRejected = await captureRun(async () => {
    buildFoundationVerifyRetryOptions({
      beforeRetry: async () => {},
    })
    return 'unexpected repair hook accepted'
  })

  const ok = legacyRepairThenPass.ok === true &&
    legacyState.repairCalls === 1 &&
    legacyRepairThenPass.result?.value === 'legacy verifier went green after repair' &&
    readOnlyFailClosed.ok === false &&
    readOnlyFailClosed.reliability?.attempts === 2 &&
    readOnlyFailClosed.reliability?.transient === false &&
    readOnlyState.repairCalls === 0 &&
    retryEvents.length === 1 &&
    retryEvents[0]?.transientClass === 'postgres-deadlock' &&
    repairHookRejected.ok === false &&
    /read-only/.test(repairHookRejected.message || '')

  return {
    ok,
    mode: 'dogfood-repair-then-pass-blocked',
    legacyRepairThenPass: {
      ok: legacyRepairThenPass.ok,
      attempts: legacyRepairThenPass.result?.attempts || null,
      repairCalls: legacyState.repairCalls,
      wentGreenAfterRepair: legacyRepairThenPass.result?.value === 'legacy verifier went green after repair',
    },
    readOnlyFailClosed: {
      ok: readOnlyFailClosed.ok,
      attempts: readOnlyFailClosed.reliability?.attempts || null,
      transientAfterFinalAttempt: readOnlyFailClosed.reliability?.transient ?? null,
      repairCalls: readOnlyState.repairCalls,
      failedClosed: readOnlyFailClosed.ok === false,
      message: readOnlyFailClosed.message,
    },
    retryEvents,
    repairHookRejected: {
      ok: repairHookRejected.ok === false,
      message: repairHookRejected.message,
    },
  }
}
