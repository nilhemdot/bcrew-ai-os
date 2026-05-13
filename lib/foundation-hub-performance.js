export const FOUNDATION_PERFORMANCE_CARD_ID = 'FOUNDATION-PERFORMANCE-001'
export const FOUNDATION_PERFORMANCE_SPRINT_ID = 'foundation-performance-hardening-2026-05-13'
export const FOUNDATION_PERFORMANCE_CLOSEOUT_KEY = 'foundation-performance-v1'
export const FOUNDATION_PERFORMANCE_PLAN_PATH = 'docs/process/foundation-performance-001-plan.md'
export const FOUNDATION_PERFORMANCE_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-PERFORMANCE-001.json'
export const FOUNDATION_PERFORMANCE_SCRIPT_PATH = 'scripts/process-foundation-performance-check.mjs'

export const FOUNDATION_HUB_SUMMARY_BUDGET = {
  mode: 'summary',
  maxDurationMs: 2500,
  maxPayloadBytes: 1500000,
}

export const FOUNDATION_HUB_FULL_WARNING_BUDGET = {
  mode: 'full',
  maxDurationMs: 90000,
  maxPayloadBytes: 6000000,
}

export const FOUNDATION_HUB_BASELINE = {
  capturedAt: '2026-05-13T22:39:00.000Z',
  defaultDurationMs: 63541,
  defaultPayloadBytes: 4506418,
}

export function normalizeFoundationHubMode(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (['full', 'detail', 'diagnostic', 'diagnostics'].includes(normalized)) return 'full'
  return 'summary'
}

export function byteLengthJson(value) {
  return Buffer.byteLength(JSON.stringify(value), 'utf8')
}

export function evaluateFoundationHubBudget({ mode = 'summary', durationMs = 0, payloadBytes = 0 } = {}) {
  const normalizedMode = normalizeFoundationHubMode(mode)
  const budget = normalizedMode === 'full'
    ? FOUNDATION_HUB_FULL_WARNING_BUDGET
    : FOUNDATION_HUB_SUMMARY_BUDGET
  const findings = []
  if (Number(durationMs) > budget.maxDurationMs) {
    findings.push({
      type: 'duration_budget_exceeded',
      detail: `${Math.round(Number(durationMs))}ms exceeds ${budget.maxDurationMs}ms budget.`,
    })
  }
  if (Number(payloadBytes) > budget.maxPayloadBytes) {
    findings.push({
      type: 'payload_budget_exceeded',
      detail: `${Number(payloadBytes)}B exceeds ${budget.maxPayloadBytes}B budget.`,
    })
  }
  return {
    ok: findings.length === 0,
    status: findings.length ? 'risk' : 'healthy',
    mode: normalizedMode,
    budget,
    durationMs: Math.round(Number(durationMs) || 0),
    payloadBytes: Number(payloadBytes) || 0,
    findings,
  }
}

export function attachFoundationHubPerformanceMetadata(payload, {
  mode = 'summary',
  startedAtMs = Date.now(),
  generatedAt = new Date(),
} = {}) {
  const normalizedMode = normalizeFoundationHubMode(mode)
  const body = {
    ...payload,
    foundationHubPerformance: {
      mode: normalizedMode,
      generatedAt: generatedAt.toISOString(),
      fullDetailPath: '/api/foundation-hub?view=full',
      summaryPath: '/api/foundation-hub',
      baseline: FOUNDATION_HUB_BASELINE,
      durationMs: Math.max(0, Date.now() - Number(startedAtMs || Date.now())),
      payloadBytes: 0,
      budget: normalizedMode === 'full' ? FOUNDATION_HUB_FULL_WARNING_BUDGET : FOUNDATION_HUB_SUMMARY_BUDGET,
      budgetStatus: 'unknown',
      findings: [],
    },
  }

  let bytes = byteLengthJson(body)
  let evaluation = evaluateFoundationHubBudget({
    mode: normalizedMode,
    durationMs: body.foundationHubPerformance.durationMs,
    payloadBytes: bytes,
  })
  body.foundationHubPerformance.payloadBytes = bytes
  body.foundationHubPerformance.budgetStatus = evaluation.status
  body.foundationHubPerformance.findings = evaluation.findings

  bytes = byteLengthJson(body)
  evaluation = evaluateFoundationHubBudget({
    mode: normalizedMode,
    durationMs: body.foundationHubPerformance.durationMs,
    payloadBytes: bytes,
  })
  body.foundationHubPerformance.payloadBytes = bytes
  body.foundationHubPerformance.budgetStatus = evaluation.status
  body.foundationHubPerformance.findings = evaluation.findings

  return {
    payload: body,
    json: JSON.stringify(body),
    bytes,
    evaluation,
  }
}

export function buildFoundationHubSummaryInfo() {
  return {
    mode: 'summary',
    purpose: 'Fast command-surface payload for normal Foundation pages.',
    fullDetailPath: '/api/foundation-hub?view=full',
    preservedFullDiagnostics: [
      'sharedCommunicationSynthesis',
      'intelligenceActionRouter',
      'intelligenceAtomSpine',
      'intelligenceRetrieval',
      'intelligenceSynthesis',
      'llmRuntime',
      'extractionControl',
      'driveCorpusInventory',
      'sourceLifecycle',
      'agentFeedbackAutoSend',
      'agentFeedbackProductionAutoSendDryRun',
      'agentFeedbackReminders',
      'meetingVaultAutoEnforcement',
      'runtimeProcessControl',
    ],
  }
}

export function buildSyntheticFoundationHubBudgetProof() {
  const healthy = evaluateFoundationHubBudget({
    mode: 'summary',
    durationMs: 500,
    payloadBytes: 250000,
  })
  const oversized = evaluateFoundationHubBudget({
    mode: 'summary',
    durationMs: 500,
    payloadBytes: FOUNDATION_HUB_SUMMARY_BUDGET.maxPayloadBytes + 1,
  })
  const tooSlow = evaluateFoundationHubBudget({
    mode: 'summary',
    durationMs: FOUNDATION_HUB_SUMMARY_BUDGET.maxDurationMs + 1,
    payloadBytes: 250000,
  })
  return {
    ok: healthy.ok === true && oversized.ok === false && tooSlow.ok === false,
    healthy,
    oversized,
    tooSlow,
  }
}

