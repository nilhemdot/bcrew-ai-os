export const SOURCE_EXTRACTION_COVERAGE_CARD_ID = 'SOURCE-EXTRACTION-COVERAGE-001'
export const SOURCE_EXTRACTION_COVERAGE_CLOSEOUT_KEY = 'source-extraction-coverage-v1'
export const SOURCE_EXTRACTION_COVERAGE_PLAN_PATH = 'docs/process/source-extraction-coverage-001-plan.md'
export const SOURCE_EXTRACTION_COVERAGE_APPROVAL_PATH = 'docs/process/approvals/SOURCE-EXTRACTION-COVERAGE-001.json'
export const SOURCE_EXTRACTION_COVERAGE_SCRIPT_PATH = 'scripts/process-source-extraction-coverage-check.mjs'
export const SOURCE_EXTRACTION_COVERAGE_SUMMARY_MARKER = 'SOURCE_EXTRACTION_COVERAGE_SUMMARY'

export const SOURCE_EXTRACTION_COVERAGE_STATES = [
  'last_success',
  'failure',
  'pending',
  'deferred',
  'not_required',
]

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase()
}

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function bySourceId(rows = []) {
  return new Map(normalizeList(rows).map(row => [row.sourceId || row.source_id, row]).filter(([sourceId]) => Boolean(sourceId)))
}

function sortIso(values = []) {
  return values
    .map(value => normalizeText(value))
    .filter(Boolean)
    .sort()
}

function latestIso(values = []) {
  return sortIso(values).pop() || null
}

function soonestIso(values = []) {
  return sortIso(values).shift() || null
}

function maxNumber(values = []) {
  return values.reduce((sum, value) => sum + Number(value || 0), 0)
}

function isTargetPausedOrBlocked(target = {}) {
  return ['paused', 'blocked'].includes(normalizeLower(target.status)) ||
    ['paused', 'blocked'].includes(normalizeLower(target.effectiveRuntimeMode || target.runtimeMode))
}

function targetHasRisk(target = {}) {
  const counts = target.counts || {}
  const retrySummary = target.retrySummary || {}
  const findings = normalizeList(target.healthFindings)
  return normalizeLower(target.hardeningStatus) === 'blocked' ||
    ['failed', 'partial'].includes(normalizeLower(target.lastStatus)) ||
    Number(counts.failedItems || 0) > 0 ||
    Number(retrySummary.retryBlockedItems || 0) > 0 ||
    Number(retrySummary.retryExhaustedItems || 0) > 0 ||
    findings.some(finding => normalizeLower(finding.severity) === 'risk')
}

function targetHasPendingWork(target = {}) {
  const counts = target.counts || {}
  const retrySummary = target.retrySummary || {}
  return Number(counts.pendingItems || 0) > 0 ||
    Number(counts.leasedItems || 0) > 0 ||
    Number(retrySummary.retryEligibleItems || 0) > 0 ||
    Number(retrySummary.retryWaitingItems || 0) > 0
}

function targetHasSuccess(target = {}) {
  return Boolean(target.lastSuccessAt) ||
    normalizeLower(target.lastStatus) === 'succeeded' ||
    Number(target.successfulRuns || 0) > 0 ||
    Number(target.counts?.succeededItems || 0) > 0 ||
    Number(target.counts?.extractedCount || 0) > 0 ||
    Number(target.counts?.archivedCount || 0) > 0
}

function hasManualCoverageBoundary(contract = {}) {
  return Boolean(
    normalizeText(contract.updateMethod) ||
      normalizeText(contract.refreshSchedule) ||
      normalizeText(contract.manualRefresh)
  )
}

function isContractGap(contract = {}) {
  const status = normalizeLower(contract.status)
  return status.includes('gap') || status.includes('scoped, not connected')
}

function deferredReason({ contract = {}, maturityRow = {}, lifecycleRow = {} } = {}) {
  if (maturityRow.deferred) return 'Source maturity grid marks this source deferred.'
  if (lifecycleRow.lifecycle?.parked === 'yes') return lifecycleRow.lifecycle?.reason || 'Source lifecycle parks this source for the current Foundation pass.'
  if (isContractGap(contract)) return contract.status || 'Source contract is a gap/not-connected placeholder.'
  return ''
}

function aggregateTargetReasons(targets = []) {
  const reasonMap = new Map()
  for (const target of targets) {
    for (const reason of normalizeList(target.topReasons)) {
      const key = `${reason.status || 'item'}:${reason.reason || 'unspecified'}`
      const existing = reasonMap.get(key) || {
        status: reason.status || 'item',
        reason: reason.reason || 'unspecified',
        count: 0,
        latestUpdatedAt: null,
      }
      existing.count += Number(reason.count || 0)
      existing.latestUpdatedAt = latestIso([existing.latestUpdatedAt, reason.latestUpdatedAt])
      reasonMap.set(key, existing)
    }
  }
  return Array.from(reasonMap.values())
    .sort((a, b) => Number(b.count || 0) - Number(a.count || 0))
    .slice(0, 8)
}

function aggregateRemainingIndicators(targets = []) {
  const indicatorMap = new Map()
  for (const target of targets) {
    for (const indicator of normalizeList(target.remainingBacklogIndicators)) {
      const label = indicator.label || 'Remaining extraction work'
      const existing = indicatorMap.get(label) || { label, count: 0, detail: indicator.detail || '' }
      existing.count += Number(indicator.count || 0)
      if (!existing.detail && indicator.detail) existing.detail = indicator.detail
      indicatorMap.set(label, existing)
    }
  }
  return Array.from(indicatorMap.values())
    .sort((a, b) => Number(b.count || 0) - Number(a.count || 0))
    .slice(0, 8)
}

function aggregateTargets(targets = []) {
  const counts = {
    inspectedCount: maxNumber(targets.map(target => target.counts?.inspectedCount)),
    archivedCount: maxNumber(targets.map(target => target.counts?.archivedCount)),
    extractedCount: maxNumber(targets.map(target => target.counts?.extractedCount)),
    totalItems: maxNumber(targets.map(target => target.counts?.totalItems)),
    succeededItems: maxNumber(targets.map(target => target.counts?.succeededItems)),
    skippedItems: maxNumber(targets.map(target => target.counts?.skippedItems)),
    failedItems: maxNumber(targets.map(target => target.counts?.failedItems)),
    pendingItems: maxNumber(targets.map(target => target.counts?.pendingItems)),
    leasedItems: maxNumber(targets.map(target => target.counts?.leasedItems)),
  }
  const retrySummary = {
    retryEligibleItems: maxNumber(targets.map(target => target.retrySummary?.retryEligibleItems)),
    retryWaitingItems: maxNumber(targets.map(target => target.retrySummary?.retryWaitingItems)),
    retryExhaustedItems: maxNumber(targets.map(target => target.retrySummary?.retryExhaustedItems)),
    retryBlockedItems: maxNumber(targets.map(target => target.retrySummary?.retryBlockedItems)),
    failedItemsWithoutRetryState: maxNumber(targets.map(target => target.retrySummary?.failedItemsWithoutRetryState)),
  }
  const last24h = {
    runs: maxNumber(targets.map(target => target.last24h?.runs)),
    successfulRuns: maxNumber(targets.map(target => target.last24h?.successfulRuns)),
    failedRuns: maxNumber(targets.map(target => target.last24h?.failedRuns)),
    items: maxNumber(targets.map(target => target.last24h?.items)),
    succeededItems: maxNumber(targets.map(target => target.last24h?.succeededItems)),
    skippedItems: maxNumber(targets.map(target => target.last24h?.skippedItems)),
    failedItems: maxNumber(targets.map(target => target.last24h?.failedItems)),
    pendingItems: maxNumber(targets.map(target => target.last24h?.pendingItems)),
    leasedItems: maxNumber(targets.map(target => target.last24h?.leasedItems)),
  }

  return {
    targetCount: targets.length,
    activeTargetCount: targets.filter(target => normalizeLower(target.status) === 'active').length,
    pausedOrBlockedTargetCount: targets.filter(isTargetPausedOrBlocked).length,
    runCount: maxNumber(targets.map(target => target.runCount)),
    successfulRuns: maxNumber(targets.map(target => target.successfulRuns)),
    failedRuns: maxNumber(targets.map(target => target.failedRuns)),
    latestSuccessAt: latestIso(targets.map(target => target.lastSuccessAt)),
    latestFailureAt: latestIso(targets.map(target => target.lastFailureAt)),
    nextBiteAt: soonestIso(targets.map(target => target.nextBiteAt)),
    crawlCheckpointNextRunAt: soonestIso(targets.map(target => target.crawlCheckpointNextRunAt)),
    counts,
    retrySummary,
    last24h,
    topReasons: aggregateTargetReasons(targets),
    remainingBacklogIndicators: aggregateRemainingIndicators(targets),
    nextSafeCommands: targets.map(target => target.nextSafeCommand).filter(Boolean).slice(0, 6),
    targetKeys: targets.map(target => target.targetKey).filter(Boolean),
  }
}

function buildExtractionState({ contract, maturityRow, lifecycleRow, targets, aggregate }) {
  const reason = deferredReason({ contract, maturityRow, lifecycleRow })
  if (reason) {
    return {
      state: 'deferred',
      tone: 'pending',
      label: 'Deferred',
      reason,
    }
  }

  if (!targets.length) {
    const maturityExtracted = Boolean(maturityRow?.stages?.extracted?.ok)
    if (hasManualCoverageBoundary(contract) || maturityExtracted) {
      return {
        state: 'not_required',
        tone: 'neutral',
        label: 'No target required',
        reason: hasManualCoverageBoundary(contract)
          ? 'Manual refresh/source contract boundary covers this source for the current Foundation pass.'
          : 'Existing source facts provide extraction proof without a governed crawl target.',
      }
    }
    return {
      state: 'failure',
      tone: 'missing',
      label: 'Missing extraction target',
      reason: 'No governed extraction target, manual refresh boundary, or source-fact extraction proof is visible.',
    }
  }

  const pausedTargets = targets.filter(isTargetPausedOrBlocked)
  if (pausedTargets.length === targets.length) {
    return {
      state: 'deferred',
      tone: 'pending',
      label: 'Paused or blocked',
      reason: pausedTargets.map(target => `${target.targetKey}: ${target.status || target.effectiveRuntimeMode || 'paused'}`).join('; '),
    }
  }

  const riskyTargets = targets.filter(targetHasRisk)
  if (riskyTargets.length) {
    const failureReason = riskyTargets
      .map(target => target.latestFailureError || target.lastError || target.healthFindings?.[0]?.detail || target.topReasons?.[0]?.reason || target.nextSafeCommand)
      .filter(Boolean)
      .join('; ')
    return {
      state: 'failure',
      tone: 'missing',
      label: 'Failure or retry blocker',
      reason: failureReason || 'One or more extraction targets has failed items, failed/partial runs, or blocked/exhausted retry state.',
    }
  }

  if (aggregate.latestSuccessAt || targets.some(targetHasSuccess)) {
    return {
      state: 'last_success',
      tone: 'connected',
      label: 'Last success',
      reason: aggregate.latestSuccessAt
        ? `Last successful extraction at ${aggregate.latestSuccessAt}.`
        : 'Successful extracted/archived item signals exist.',
    }
  }

  if (targets.some(targetHasPendingWork) || aggregate.nextBiteAt) {
    return {
      state: 'pending',
      tone: 'pending',
      label: 'Pending first success',
      reason: aggregate.nextBiteAt
        ? `Extraction is scheduled or waiting for the next bite at ${aggregate.nextBiteAt}.`
        : 'Extraction target has pending/leased/retry-ready work but no success yet.',
    }
  }

  return {
    state: 'pending',
    tone: 'pending',
    label: 'Target visible, no run proof',
    reason: 'A governed target exists, but no success, failure, or scheduled next bite is visible yet.',
  }
}

export function buildSourceExtractionCoverageSnapshot({
  sources = [],
  extractionControl = {},
  sourceMaturityGrid = {},
  lifecycle = {},
} = {}) {
  const targetRows = normalizeList(extractionControl.coverageByTarget || extractionControl.targets)
  const targetsBySource = targetRows.reduce((acc, target) => {
    const sourceId = target.sourceId || target.source_id
    if (!sourceId) return acc
    if (!acc.has(sourceId)) acc.set(sourceId, [])
    acc.get(sourceId).push(target)
    return acc
  }, new Map())
  const maturityMap = bySourceId(sourceMaturityGrid.rows)
  const lifecycleMap = bySourceId(lifecycle.sources)

  const rows = normalizeList(sources).map(contract => {
    const sourceId = contract.sourceId
    const targets = targetsBySource.get(sourceId) || []
    const maturityRow = maturityMap.get(sourceId) || {}
    const lifecycleRow = lifecycleMap.get(sourceId) || {}
    const aggregate = aggregateTargets(targets)
    const extractionState = buildExtractionState({
      contract,
      maturityRow,
      lifecycleRow,
      targets,
      aggregate,
    })

    return {
      sourceId,
      title: contract.title,
      unitName: contract.unitName,
      owner: contract.owner,
      group: contract.group,
      targetCount: targets.length,
      targetKeys: aggregate.targetKeys,
      extractionState: extractionState.state,
      label: extractionState.label,
      tone: extractionState.tone,
      reason: extractionState.reason,
      latestSuccessAt: aggregate.latestSuccessAt,
      latestFailureAt: aggregate.latestFailureAt,
      nextBiteAt: aggregate.nextBiteAt,
      crawlCheckpointNextRunAt: aggregate.crawlCheckpointNextRunAt,
      counts: aggregate.counts,
      retrySummary: aggregate.retrySummary,
      last24h: aggregate.last24h,
      runCount: aggregate.runCount,
      successfulRuns: aggregate.successfulRuns,
      failedRuns: aggregate.failedRuns,
      topReasons: aggregate.topReasons,
      remainingBacklogIndicators: aggregate.remainingBacklogIndicators,
      nextSafeCommands: aggregate.nextSafeCommands,
      evidenceRefs: targets.length
        ? aggregate.targetKeys.map(targetKey => `source_crawl_targets:${targetKey}`)
        : maturityRow?.stages?.extracted?.ok
          ? ['source maturity extracted stage']
          : [],
    }
  })

  const stateCounts = SOURCE_EXTRACTION_COVERAGE_STATES.reduce((acc, state) => {
    acc[state] = rows.filter(row => row.extractionState === state).length
    return acc
  }, {})
  const coveredRows = rows.filter(row => row.extractionState === 'last_success')
  const failureRows = rows.filter(row => row.extractionState === 'failure')
  const attentionRows = rows.filter(row => ['failure', 'pending'].includes(row.extractionState))

  return {
    generatedAt: new Date().toISOString(),
    cardId: SOURCE_EXTRACTION_COVERAGE_CARD_ID,
    closeoutKey: SOURCE_EXTRACTION_COVERAGE_CLOSEOUT_KEY,
    rows,
    summary: {
      sourceCount: rows.length,
      targetCount: targetRows.length,
      sourcesWithTarget: rows.filter(row => row.targetCount > 0).length,
      sourcesWithLastSuccess: coveredRows.length,
      sourcesWithFailure: failureRows.length,
      sourcesDeferred: stateCounts.deferred,
      sourcesNotRequired: stateCounts.not_required,
      sourcesPending: stateCounts.pending,
      stateCounts,
      last24hRuns: maxNumber(rows.map(row => row.last24h?.runs)),
      last24hItems: maxNumber(rows.map(row => row.last24h?.items)),
      retryEligibleItems: maxNumber(rows.map(row => row.retrySummary?.retryEligibleItems)),
      retryWaitingItems: maxNumber(rows.map(row => row.retrySummary?.retryWaitingItems)),
      retryBlockedItems: maxNumber(rows.map(row => row.retrySummary?.retryBlockedItems)),
      retryExhaustedItems: maxNumber(rows.map(row => row.retrySummary?.retryExhaustedItems)),
    },
    topAttention: attentionRows.slice(0, 12).map(row => ({
      sourceId: row.sourceId,
      title: row.title,
      extractionState: row.extractionState,
      reason: row.reason,
      targetKeys: row.targetKeys,
      nextSafeCommands: row.nextSafeCommands,
    })),
  }
}

export function buildSyntheticSourceExtractionCoverageProof() {
  const sources = [
    { sourceId: 'SRC-COVERED-001', title: 'Covered', status: 'Verified', validation: 'Signed Off' },
    { sourceId: 'SRC-MISSING-001', title: 'Missing', status: 'Verified', validation: 'Signed Off' },
    { sourceId: 'SRC-DEFERRED-001', title: 'Deferred', status: 'Gap', validation: 'Not Signed Off' },
    { sourceId: 'SRC-MANUAL-001', title: 'Manual', status: 'Verified', validation: 'Signed Off', updateMethod: 'Manual monthly review' },
  ]
  const snapshot = buildSourceExtractionCoverageSnapshot({
    sources,
    extractionControl: {
      coverageByTarget: [
        {
          targetKey: 'covered-target',
          sourceId: 'SRC-COVERED-001',
          status: 'active',
          lastStatus: 'succeeded',
          lastSuccessAt: '2026-05-12T12:00:00.000Z',
          successfulRuns: 2,
          counts: { totalItems: 4, succeededItems: 4, archivedCount: 4, extractedCount: 4 },
          last24h: { runs: 1, successfulRuns: 1, items: 4, succeededItems: 4 },
          retrySummary: { retryEligibleItems: 0, retryWaitingItems: 0, retryBlockedItems: 0, retryExhaustedItems: 0 },
          remainingBacklogIndicators: [],
        },
      ],
    },
    sourceMaturityGrid: {
      rows: [
        { sourceId: 'SRC-DEFERRED-001', deferred: true, stages: { extracted: { ok: false } } },
      ],
    },
    lifecycle: {
      sources: [
        { sourceId: 'SRC-DEFERRED-001', lifecycle: { parked: 'yes', reason: 'Not connected yet.' } },
      ],
    },
  })

  const stateBySource = new Map(snapshot.rows.map(row => [row.sourceId, row.extractionState]))
  return {
    ok: snapshot.rows.length === 4 &&
      stateBySource.get('SRC-COVERED-001') === 'last_success' &&
      stateBySource.get('SRC-MISSING-001') === 'failure' &&
      stateBySource.get('SRC-DEFERRED-001') === 'deferred' &&
      stateBySource.get('SRC-MANUAL-001') === 'not_required' &&
      snapshot.summary.sourcesWithLastSuccess === 1 &&
      snapshot.summary.sourcesWithFailure === 1 &&
      snapshot.summary.sourcesDeferred === 1 &&
      snapshot.summary.sourcesNotRequired === 1,
    summary: snapshot.summary,
    rows: snapshot.rows,
  }
}
