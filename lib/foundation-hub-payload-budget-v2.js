export const FOUNDATION_HUB_PAYLOAD_BUDGET_V2_CARD_ID = 'FOUNDATION-HUB-PAYLOAD-BUDGET-V2-001'
export const FOUNDATION_HUB_PAYLOAD_BUDGET_V2_CLOSEOUT_KEY = 'foundation-hub-payload-budget-v2-v1'
export const FOUNDATION_HUB_PAYLOAD_BUDGET_V2_PLAN_PATH = 'docs/process/foundation-hub-payload-budget-v2-001-plan.md'
export const FOUNDATION_HUB_PAYLOAD_BUDGET_V2_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-HUB-PAYLOAD-BUDGET-V2-001.json'
export const FOUNDATION_HUB_PAYLOAD_BUDGET_V2_SCRIPT_PATH = 'scripts/process-foundation-hub-payload-budget-v2-check.mjs'
export const FOUNDATION_HUB_PAYLOAD_BUDGET_V2_SPRINT_ID = 'foundation-hub-payload-budget-v2-2026-05-17'

export const FOUNDATION_HUB_PAYLOAD_BUDGET_V2_VERSION = 'foundation-hub-payload-budget.v2'

export const FOUNDATION_HUB_PAYLOAD_BUDGET_V2_SUMMARY_BUDGET = Object.freeze({
  mode: 'summary',
  maxDurationMs: 2500,
  maxPayloadBytes: 650_000,
  minHeadroomBytes: 20_000,
  maxBacklogItemsBytes: 500_000,
  maxBacklogRowBytes: 1_600,
  maxRecentChanges: 20,
})

export const FOUNDATION_HUB_PAYLOAD_BUDGET_V2_FULL_ONLY_KEYS = Object.freeze([
  'sharedCommunicationSynthesis',
  'intelligenceActionRouter',
  'intelligenceAtomSpine',
  'intelligenceRetrieval',
  'intelligenceSynthesis',
  'llmRuntime',
  'extractionControl',
  'driveCorpusInventory',
  'sourceLifecycle',
  'sourceMaturityGrid',
  'sourceExtractionCoverage',
  'sourceCoverageCloseout',
  'sourceConnectorMatrix',
  'sourceHubRoutingMatrix',
  'agentFeedbackAutoSend',
  'agentFeedbackProductionAutoSendDryRun',
  'agentFeedbackReminders',
  'meetingVaultAutoEnforcement',
  'runtimeProcessControl',
])

function byteLengthJson(value) {
  return Buffer.byteLength(JSON.stringify(value), 'utf8')
}

function addFinding(findings, ok, code, detail = '', severity = 'risk') {
  if (ok) return
  findings.push({ code, detail, severity })
}

function getPath(input = {}, path = '') {
  return String(path || '').split('.').reduce((value, key) => {
    if (!value || typeof value !== 'object') return undefined
    return value[key]
  }, input)
}

function sectionBytes(payload = {}) {
  return Object.entries(payload || {})
    .map(([key, value]) => ({
      key,
      bytes: byteLengthJson(value ?? null),
      count: Array.isArray(value) ? value.length : null,
    }))
    .sort((a, b) => b.bytes - a.bytes)
}

export function summarizeFoundationHubPayloadBudgetV2Sections(payload = {}) {
  return sectionBytes(payload).slice(0, 8)
}

export function evaluateFoundationHubPayloadBudgetV2({
  payload = {},
  mode = payload?.foundationHubPerformance?.mode || 'summary',
  durationMs = payload?.foundationHubPerformance?.durationMs ?? 0,
  payloadBytes = byteLengthJson(payload),
  budget = FOUNDATION_HUB_PAYLOAD_BUDGET_V2_SUMMARY_BUDGET,
} = {}) {
  const normalizedMode = String(mode || 'summary').trim().toLowerCase()
  const findings = []
  const backlogItems = Array.isArray(payload.backlogItems) ? payload.backlogItems : []
  const backlogContract = payload.backlogContract || {}
  const backlogItemsBytes = byteLengthJson(backlogItems)
  const maxBacklogRowBytes = backlogItems.reduce((max, row) => Math.max(max, byteLengthJson(row)), 0)
  const fullOnlyPresent = FOUNDATION_HUB_PAYLOAD_BUDGET_V2_FULL_ONLY_KEYS.filter(key =>
    Object.prototype.hasOwnProperty.call(payload, key)
  )

  addFinding(
    findings,
    normalizedMode === 'summary',
    'not_summary_mode',
    `V2 payload budget applies to summary mode; got ${normalizedMode || 'missing'}.`,
  )
  addFinding(
    findings,
    Number(payloadBytes) <= budget.maxPayloadBytes,
    'summary_payload_over_budget',
    `${Number(payloadBytes)}B exceeds ${budget.maxPayloadBytes}B.`,
  )
  addFinding(
    findings,
    Number(durationMs) <= budget.maxDurationMs,
    'summary_duration_over_budget',
    `${Math.round(Number(durationMs) || 0)}ms exceeds ${budget.maxDurationMs}ms.`,
  )
  addFinding(
    findings,
    fullOnlyPresent.length === 0,
    'full_only_keys_in_summary',
    fullOnlyPresent.join(', '),
  )
  addFinding(
    findings,
    backlogContract.contractVersion === 'foundation-hub-backlog.contract.v1' &&
      backlogContract.fullPayloadCompacted === true,
    'backlog_contract_missing_or_uncompacted',
    backlogContract.contractVersion || 'missing',
  )
  addFinding(
    findings,
    Number(backlogContract.totalItems || 0) === backlogItems.length &&
      Number(backlogContract.defaultItemCount || 0) === backlogItems.length,
    'backlog_rows_hidden_or_mismatched',
    `rows=${backlogItems.length} total=${backlogContract.totalItems ?? 'missing'} default=${backlogContract.defaultItemCount ?? 'missing'}`,
  )
  addFinding(
    findings,
    backlogItemsBytes <= budget.maxBacklogItemsBytes,
    'backlog_section_over_budget',
    `${backlogItemsBytes}B exceeds ${budget.maxBacklogItemsBytes}B.`,
  )
  addFinding(
    findings,
    maxBacklogRowBytes <= budget.maxBacklogRowBytes,
    'backlog_row_over_budget',
    `${maxBacklogRowBytes}B exceeds ${budget.maxBacklogRowBytes}B.`,
  )
  addFinding(
    findings,
    !Array.isArray(payload.recentChanges) || payload.recentChanges.length <= budget.maxRecentChanges,
    'recent_changes_unbounded',
    `${payload.recentChanges?.length || 0} rows exceeds ${budget.maxRecentChanges}.`,
  )
  for (const path of [
    'foundationJobs.fullPayloadCompacted',
    'foundation1100Review.fullPayloadCompacted',
    'researchCuration.fullPayloadCompacted',
    'backlogContract.fullPayloadCompacted',
  ]) {
    addFinding(
      findings,
      getPath(payload, path) === true,
      'required_compaction_marker_missing',
      path,
    )
  }

  const riskFindings = findings.filter(finding => finding.severity === 'risk')
  const headroomBytes = budget.maxPayloadBytes - Number(payloadBytes || 0)
  const status = riskFindings.length
    ? 'risk'
    : headroomBytes < budget.minHeadroomBytes
      ? 'review'
      : 'healthy'

  return {
    ok: status !== 'risk',
    status,
    budgetVersion: FOUNDATION_HUB_PAYLOAD_BUDGET_V2_VERSION,
    cardId: FOUNDATION_HUB_PAYLOAD_BUDGET_V2_CARD_ID,
    closeoutKey: FOUNDATION_HUB_PAYLOAD_BUDGET_V2_CLOSEOUT_KEY,
    mode: normalizedMode,
    budget,
    measured: {
      durationMs: Math.round(Number(durationMs) || 0),
      payloadBytes: Number(payloadBytes) || 0,
      headroomBytes,
      backlogItemsBytes,
      maxBacklogRowBytes,
      backlogRowCount: backlogItems.length,
    },
    topSections: summarizeFoundationHubPayloadBudgetV2Sections(payload),
    findings,
    plainEnglish: riskFindings.length
      ? 'Default Foundation Hub payload is over budget or leaking detail-mode data.'
      : status === 'review'
        ? 'Default Foundation Hub payload is under budget but has thin headroom.'
        : 'Default Foundation Hub payload is compact, summary-only, and under the canonical V2 budget.',
  }
}

export function buildFoundationHubPayloadBudgetV2Status(input = {}) {
  const evaluation = evaluateFoundationHubPayloadBudgetV2(input)
  return {
    budgetVersion: evaluation.budgetVersion,
    cardId: evaluation.cardId,
    closeoutKey: evaluation.closeoutKey,
    status: evaluation.status,
    mode: evaluation.mode,
    budget: evaluation.budget,
    measured: evaluation.measured,
    topSections: evaluation.topSections,
    findings: evaluation.findings,
    plainEnglish: evaluation.plainEnglish,
  }
}

function buildHealthySyntheticPayload() {
  const backlogItems = [
    {
      id: 'SYNTHETIC-PAYLOAD-001',
      title: 'Synthetic compact card',
      scope: 'foundation',
      team: 'foundation',
      lane: 'scoped',
      priority: 'P1',
      rank: 1,
      summary: 'Small summary row.',
    },
    {
      id: 'SYNTHETIC-PAYLOAD-002',
      title: 'Synthetic done card',
      scope: 'foundation',
      team: 'foundation',
      lane: 'done',
      priority: 'P2',
      rank: 2,
      summary: 'Small done row.',
    },
  ]
  return {
    backlogItems,
    backlogContract: {
      contractVersion: 'foundation-hub-backlog.contract.v1',
      totalItems: backlogItems.length,
      defaultItemCount: backlogItems.length,
      fullPayloadCompacted: true,
    },
    foundationJobs: { fullPayloadCompacted: true, jobs: [] },
    foundation1100Review: { fullPayloadCompacted: true },
    researchCuration: { fullPayloadCompacted: true, cards: [] },
    recentChanges: [],
    foundationHubPerformance: {
      mode: 'summary',
      durationMs: 100,
      payloadBytes: 0,
    },
  }
}

export function buildFoundationHubPayloadBudgetV2DogfoodProof() {
  const healthyPayload = buildHealthySyntheticPayload()
  const healthy = evaluateFoundationHubPayloadBudgetV2({
    payload: healthyPayload,
    payloadBytes: byteLengthJson(healthyPayload),
    durationMs: 100,
  })
  const oversized = evaluateFoundationHubPayloadBudgetV2({
    payload: healthyPayload,
    payloadBytes: FOUNDATION_HUB_PAYLOAD_BUDGET_V2_SUMMARY_BUDGET.maxPayloadBytes + 1,
    durationMs: 100,
  })
  const fullLeak = evaluateFoundationHubPayloadBudgetV2({
    payload: {
      ...healthyPayload,
      sharedCommunicationSynthesis: { runs: Array.from({ length: 500 }, (_, index) => ({ index, text: 'detail' })) },
    },
    durationMs: 100,
  })
  const hiddenRows = evaluateFoundationHubPayloadBudgetV2({
    payload: {
      ...healthyPayload,
      backlogItems: healthyPayload.backlogItems.slice(0, 1),
    },
    durationMs: 100,
  })
  const missingCompaction = evaluateFoundationHubPayloadBudgetV2({
    payload: {
      ...healthyPayload,
      foundationJobs: { jobs: [{ runId: 'unbounded' }] },
    },
    durationMs: 100,
  })
  const arbitraryLineCountWin = evaluateFoundationHubPayloadBudgetV2({
    payload: {
      ...healthyPayload,
      backlogItems: [],
      backlogContract: {
        contractVersion: 'foundation-hub-backlog.contract.v1',
        totalItems: 2,
        defaultItemCount: 0,
        fullPayloadCompacted: true,
      },
    },
    durationMs: 100,
  })

  return {
    ok: healthy.ok === true &&
      oversized.ok === false &&
      fullLeak.ok === false &&
      hiddenRows.ok === false &&
      missingCompaction.ok === false &&
      arbitraryLineCountWin.ok === false,
    healthy,
    oversized,
    fullLeak,
    hiddenRows,
    missingCompaction,
    arbitraryLineCountWin,
    invariant: 'V2 accepts a compact summary payload and rejects oversized payloads, full-diagnostic leaks, hidden backlog rows, missing compaction markers, and arbitrary row dropping.',
  }
}
