export const HUB_PERF_VERIFICATION_CARD_ID = 'HUB-PERF-VERIFICATION-001'
export const HUB_PERF_VERIFICATION_REPORT_PATH = 'docs/handoffs/2026-05-14-foundation-hub-performance-baseline.md'

export const FOUNDATION_HUB_PRIOR_BASELINE = Object.freeze({
  measuredAt: '2026-05-13',
  summaryRouteSeconds: 70.244,
  summaryRouteBytes: 4630000,
  source: 'docs/handoffs/2026-05-13-deep-foundation-code-audit.md',
})

export const FOUNDATION_HUB_PERFORMANCE_BUDGETS = Object.freeze({
  summary: {
    maxSeconds: 5,
    maxBytes: 1000000,
  },
  fullDiagnostics: {
    maxCompletionSeconds: 90,
    warningSeconds: 30,
    warningBytes: 5000000,
  },
})

export const FOUNDATION_HUB_COMMITTED_BASELINE = Object.freeze({
  measuredAt: '2026-05-14T22:11:00-04:00',
  baseUrl: 'http://localhost:3000',
  summary: {
    path: '/api/foundation-hub',
    statusCode: 200,
    seconds: 0.073341,
    bytes: 891236,
  },
  fullDiagnostics: {
    path: '/api/foundation-hub?view=full',
    statusCode: 200,
    seconds: 62.386321,
    bytes: 4799862,
    warning: 'Full diagnostics is report-only and still needs a later performance/payload cleanup slice.',
  },
})

function asFiniteNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

export function evaluateFoundationHubPerformanceMeasurement(measurement = FOUNDATION_HUB_COMMITTED_BASELINE) {
  const checks = []
  const summarySeconds = asFiniteNumber(measurement.summary?.seconds)
  const summaryBytes = asFiniteNumber(measurement.summary?.bytes)
  const fullSeconds = asFiniteNumber(measurement.fullDiagnostics?.seconds)
  const fullBytes = asFiniteNumber(measurement.fullDiagnostics?.bytes)

  addCheck(
    checks,
    measurement.summary?.statusCode === 200 && summarySeconds !== null && summaryBytes !== null,
    'summary route measurement is present',
    JSON.stringify(measurement.summary || {}),
  )
  addCheck(
    checks,
    summarySeconds !== null && summarySeconds <= FOUNDATION_HUB_PERFORMANCE_BUDGETS.summary.maxSeconds,
    'summary route stays under latency budget',
    `${summarySeconds}s <= ${FOUNDATION_HUB_PERFORMANCE_BUDGETS.summary.maxSeconds}s`,
  )
  addCheck(
    checks,
    summaryBytes !== null && summaryBytes <= FOUNDATION_HUB_PERFORMANCE_BUDGETS.summary.maxBytes,
    'summary route stays under payload budget',
    `${summaryBytes} <= ${FOUNDATION_HUB_PERFORMANCE_BUDGETS.summary.maxBytes}`,
  )
  addCheck(
    checks,
    measurement.fullDiagnostics?.statusCode === 200 && fullSeconds !== null && fullBytes !== null,
    'full diagnostics measurement is present',
    JSON.stringify(measurement.fullDiagnostics || {}),
  )
  addCheck(
    checks,
    fullSeconds !== null && fullSeconds <= FOUNDATION_HUB_PERFORMANCE_BUDGETS.fullDiagnostics.maxCompletionSeconds,
    'full diagnostics completes within diagnostic ceiling',
    `${fullSeconds}s <= ${FOUNDATION_HUB_PERFORMANCE_BUDGETS.fullDiagnostics.maxCompletionSeconds}s`,
  )
  addCheck(
    checks,
    fullSeconds !== null && fullSeconds > FOUNDATION_HUB_PERFORMANCE_BUDGETS.fullDiagnostics.warningSeconds,
    'full diagnostics heavy warning remains visible',
    `${fullSeconds}s > ${FOUNDATION_HUB_PERFORMANCE_BUDGETS.fullDiagnostics.warningSeconds}s`,
  )
  addCheck(
    checks,
    summarySeconds !== null && summarySeconds < FOUNDATION_HUB_PRIOR_BASELINE.summaryRouteSeconds,
    'summary route improved from prior baseline',
    `${summarySeconds}s < ${FOUNDATION_HUB_PRIOR_BASELINE.summaryRouteSeconds}s`,
  )

  const findings = checks.filter(check => !check.ok)
  return {
    ok: findings.length === 0,
    status: findings.length ? 'blocked' : 'healthy',
    budgets: FOUNDATION_HUB_PERFORMANCE_BUDGETS,
    priorBaseline: FOUNDATION_HUB_PRIOR_BASELINE,
    measurement,
    checks,
    findings,
  }
}

export function buildSyntheticFoundationHubPerformanceDogfoodProof() {
  const slowDefault = evaluateFoundationHubPerformanceMeasurement({
    measuredAt: 'synthetic',
    summary: {
      path: '/api/foundation-hub',
      statusCode: 200,
      seconds: 70.244,
      bytes: 4630000,
    },
    fullDiagnostics: {
      path: '/api/foundation-hub?view=full',
      statusCode: 200,
      seconds: 62,
      bytes: 4799862,
    },
  })
  const current = evaluateFoundationHubPerformanceMeasurement(FOUNDATION_HUB_COMMITTED_BASELINE)
  return {
    ok: slowDefault.ok === false && current.ok === true &&
      slowDefault.findings.some(finding => finding.check === 'summary route stays under latency budget') &&
      slowDefault.findings.some(finding => finding.check === 'summary route stays under payload budget'),
    slowDefault,
    current,
    invariant: 'The old 70s/4.63MB default route fails; the current summary route passes while full diagnostics remains a visible heavy warning.',
  }
}

export async function measureFoundationHubRoute({ baseUrl = 'http://localhost:3000', path, timeoutMs = 90000 } = {}) {
  const started = process.hrtime.bigint()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${baseUrl}${path}`, { signal: controller.signal })
    const buffer = Buffer.from(await response.arrayBuffer())
    const elapsedSeconds = Number(process.hrtime.bigint() - started) / 1e9
    return {
      path,
      statusCode: response.status,
      seconds: Math.round(elapsedSeconds * 1000000) / 1000000,
      bytes: buffer.byteLength,
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function measureFoundationHubPerformance({ baseUrl = 'http://localhost:3000' } = {}) {
  const summary = await measureFoundationHubRoute({
    baseUrl,
    path: '/api/foundation-hub',
    timeoutMs: FOUNDATION_HUB_PERFORMANCE_BUDGETS.summary.maxSeconds * 1000,
  })
  const fullDiagnostics = await measureFoundationHubRoute({
    baseUrl,
    path: '/api/foundation-hub?view=full',
    timeoutMs: FOUNDATION_HUB_PERFORMANCE_BUDGETS.fullDiagnostics.maxCompletionSeconds * 1000,
  })
  return {
    measuredAt: new Date().toISOString(),
    baseUrl,
    summary,
    fullDiagnostics,
  }
}
