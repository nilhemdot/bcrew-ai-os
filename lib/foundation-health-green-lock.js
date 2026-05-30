export const FOUNDATION_HEALTH_GREEN_LOCK_CARD_ID = 'FOUNDATION-HEALTH-GREEN-LOCK-001'
export const FOUNDATION_HEALTH_GREEN_LOCK_CLOSEOUT_KEY = 'foundation-health-green-lock-v1'
export const FOUNDATION_HEALTH_GREEN_LOCK_PLAN_PATH = 'docs/process/foundation-health-green-lock-001-plan.md'
export const FOUNDATION_HEALTH_GREEN_LOCK_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-HEALTH-GREEN-LOCK-001.json'
export const FOUNDATION_HEALTH_GREEN_LOCK_SCRIPT_PATH = 'scripts/process-foundation-health-green-lock-check.mjs'
export const FOUNDATION_HEALTH_GREEN_LOCK_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-foundation-health-green-lock-closeout.md'

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeArray(value) {
  return (Array.isArray(value) ? value : [])
    .map(item => item && typeof item === 'object' ? item : null)
    .filter(Boolean)
}

function statusFromCounts(riskCount = 0, watchCount = 0) {
  if (Number(riskCount || 0) > 0) return 'risk'
  if (Number(watchCount || 0) > 0) return 'watch'
  return 'healthy'
}

function sprintMetadata(currentSprintStatus = {}) {
  return currentSprintStatus?.metadata ||
    currentSprintStatus?.sprint?.metadata ||
    currentSprintStatus?.summary?.metadata ||
    {}
}

export function getApprovedHealthGreenExceptions(currentSprintStatus = {}) {
  currentSprintStatus = currentSprintStatus || {}
  const metadata = sprintMetadata(currentSprintStatus)
  return [
    ...normalizeArray(currentSprintStatus.healthGreenExceptions),
    ...normalizeArray(currentSprintStatus.approvedHealthGreenExceptions),
    ...normalizeArray(currentSprintStatus.summary?.healthGreenExceptions),
    ...normalizeArray(metadata.healthGreenExceptions),
    ...normalizeArray(metadata.approvedHealthGreenExceptions),
  ]
}

function exceptionMatchesFinding(exception = {}, finding = {}) {
  const findingId = normalizeText(finding.id)
  const repairCardId = normalizeText(finding.classification?.repairCardId || finding.repairCardId)
  const exceptionFindingId = normalizeText(exception.findingId || exception.finding_id || exception.id)
  const exceptionRepairCardId = normalizeText(exception.repairCardId || exception.repair_card_id)
  return Boolean(
    (findingId && exceptionFindingId === findingId) ||
      (repairCardId && exceptionRepairCardId === repairCardId)
  )
}

export function validateHealthGreenException(exception = {}, { now = new Date() } = {}) {
  const expiresAt = exception.expiresAt || exception.expires_at || exception.reviewBy || exception.review_by
  const expiryDate = expiresAt ? new Date(expiresAt) : null
  const expired = expiryDate && !Number.isNaN(expiryDate.getTime()) && expiryDate.getTime() < now.getTime()
  const missing = []
  if (normalizeText(exception.approvedBy || exception.approved_by) !== 'Steve') missing.push('approvedBy=Steve')
  if (!normalizeText(exception.owner)) missing.push('owner')
  if (!normalizeText(exception.reason)) missing.push('reason')
  if (!normalizeText(exception.threshold)) missing.push('threshold')
  if (!normalizeText(exception.nextAction || exception.next_action)) missing.push('nextAction')
  if (!normalizeText(exception.repairCardId || exception.repair_card_id)) missing.push('repairCardId')
  if (!normalizeText(exception.approvalSource || exception.approval_source)) missing.push('approvalSource')
  if (!expiresAt) missing.push('expiresAt/reviewBy')
  if (expired) missing.push('unexpired')
  return {
    ok: missing.length === 0,
    missing,
    expired: Boolean(expired),
  }
}

export function buildFoundationHealthGreenLockStatus({
  rawRiskCount = 0,
  rawWatchCount = 0,
  classifiedFindings = {},
  currentSprintStatus = {},
  now = new Date(),
} = {}) {
  const rawRisk = Number(rawRiskCount || 0)
  const rawWatch = Number(rawWatchCount || 0)
  const rawStatus = statusFromCounts(rawRisk, rawWatch)
  const findings = Array.isArray(classifiedFindings.findings) ? classifiedFindings.findings : []
  const visibleNonGreenFindings = findings.filter(finding => ['risk', 'watch'].includes(finding.rollupLevel))
  const summary = classifiedFindings.summary || {}
  const hiddenRiskCount = Number(summary.hiddenRiskCount || 0)
  const hiddenWatchCount = Number(summary.hiddenWatchCount || 0)
  const approvedExceptions = getApprovedHealthGreenExceptions(currentSprintStatus)
  const exceptionByFindingId = new Map()
  const exceptionChecks = []
  const missingExceptionFindingIds = []
  for (const finding of visibleNonGreenFindings) {
    const exception = approvedExceptions.find(item => exceptionMatchesFinding(item, finding)) || null
    const validation = exception ? validateHealthGreenException(exception, { now }) : { ok: false, missing: ['approved exception'] }
    exceptionChecks.push({
      findingId: finding.id || null,
      repairCardId: finding.classification?.repairCardId || finding.repairCardId || null,
      ok: Boolean(exception && validation.ok),
      missing: validation.missing || [],
    })
    if (exception && validation.ok) {
      exceptionByFindingId.set(finding.id, exception)
    } else {
      missingExceptionFindingIds.push(finding.id || finding.title || 'unknown-finding')
    }
  }
  const hiddenNonGreenCount = hiddenRiskCount + hiddenWatchCount
  const hasRawNonGreen = rawRisk + rawWatch > 0
  const allVisibleFindingsExcepted = visibleNonGreenFindings.length > 0 &&
    missingExceptionFindingIds.length === 0 &&
    visibleNonGreenFindings.length === exceptionByFindingId.size
  const canReportGreen = !hasRawNonGreen ||
    (hiddenNonGreenCount === 0 && allVisibleFindingsExcepted)
  const status = canReportGreen ? 'healthy' : rawStatus
  return {
    status,
    rawStatus,
    blocksGreen: status !== 'healthy',
    rawRiskCount: rawRisk,
    rawWatchCount: rawWatch,
    visibleNonGreenCount: visibleNonGreenFindings.length,
    hiddenRiskCount,
    hiddenWatchCount,
    hiddenNonGreenCount,
    approvedExceptionCount: exceptionByFindingId.size,
    missingExceptionFindingIds,
    exceptionChecks,
    plainEnglish: status === 'healthy'
      ? (hasRawNonGreen
          ? 'Foundation has raw red/yellow rows, but every visible row has an explicit Steve-approved sprint exception with owner, threshold, repair card, and next action.'
          : 'Foundation raw health is green.')
      : 'Foundation has raw red/yellow rows without explicit Steve-approved sprint exceptions. Do not report green.',
  }
}

function normalizeEmbeddedHealthSummary(currentSprintStatus = {}) {
  currentSprintStatus = currentSprintStatus || {}
  const metadata = sprintMetadata(currentSprintStatus)
  return metadata.systemHealthSummary ||
    metadata.embeddedSystemHealth ||
    currentSprintStatus.embeddedSystemHealth ||
    currentSprintStatus.summary?.embeddedSystemHealth ||
    null
}

export function buildCurrentSprintHealthTruthLock({
  currentSprintStatus = {},
  systemHealthSummary = {},
} = {}) {
  currentSprintStatus = currentSprintStatus || {}
  const embedded = normalizeEmbeddedHealthSummary(currentSprintStatus)
  if (!embedded || typeof embedded !== 'object') {
    return {
      ok: true,
      status: 'healthy',
      mode: 'no-embedded-health-summary',
      plainEnglish: 'Current Sprint has no embedded health summary that can go stale.',
    }
  }
  const fields = ['status', 'rawRiskCount', 'rawWatchCount', 'riskCount', 'watchCount']
  const mismatches = fields.filter(field => {
    const left = embedded[field]
    const right = systemHealthSummary[field]
    if (left === undefined || right === undefined) return false
    return String(left) !== String(right)
  })
  return {
    ok: mismatches.length === 0,
    status: mismatches.length ? 'risk' : 'healthy',
    mode: 'embedded-health-summary-present',
    mismatches,
    embedded: Object.fromEntries(fields.map(field => [field, embedded[field]])),
    live: Object.fromEntries(fields.map(field => [field, systemHealthSummary[field]])),
    plainEnglish: mismatches.length
      ? 'Current Sprint has a stale embedded health summary; refresh or remove it before claiming green.'
      : 'Current Sprint embedded health summary matches live System Health.',
  }
}

export function buildFoundationHealthGreenLockDogfoodProof() {
  const classifiedFindings = {
    findings: [
      {
        id: 'synthetic_watch',
        rollupLevel: 'watch',
        classification: {
          repairCardId: 'SYNTHETIC-REPAIR-001',
        },
      },
    ],
    summary: {
      hiddenRiskCount: 0,
      hiddenWatchCount: 0,
    },
  }
  const rawGreen = buildFoundationHealthGreenLockStatus({
    rawRiskCount: 0,
    rawWatchCount: 0,
    classifiedFindings: { findings: [], summary: {} },
  })
  const unapprovedWatch = buildFoundationHealthGreenLockStatus({
    rawRiskCount: 0,
    rawWatchCount: 1,
    classifiedFindings,
  })
  const approvedException = buildFoundationHealthGreenLockStatus({
    rawRiskCount: 0,
    rawWatchCount: 1,
    classifiedFindings,
    currentSprintStatus: {
      metadata: {
        healthGreenExceptions: [
          {
            findingId: 'synthetic_watch',
            approvedBy: 'Steve',
            owner: 'Foundation Process',
            reason: 'Synthetic approved exception for dogfood only.',
            threshold: 'Expires if the row changes or persists past review date.',
            nextAction: 'Repair the synthetic row.',
            repairCardId: 'SYNTHETIC-REPAIR-001',
            approvalSource: 'Synthetic sprint truth',
            expiresAt: '2026-06-01T00:00:00.000Z',
          },
        ],
      },
    },
    now: new Date('2026-05-19T12:00:00.000Z'),
  })
  const thresholdlessException = buildFoundationHealthGreenLockStatus({
    rawRiskCount: 0,
    rawWatchCount: 1,
    classifiedFindings,
    currentSprintStatus: {
      metadata: {
        healthGreenExceptions: [
          {
            findingId: 'synthetic_watch',
            approvedBy: 'Steve',
            owner: 'Foundation Process',
            reason: 'Missing threshold should fail.',
            nextAction: 'Repair the synthetic row.',
            repairCardId: 'SYNTHETIC-REPAIR-001',
            approvalSource: 'Synthetic sprint truth',
            expiresAt: '2026-06-01T00:00:00.000Z',
          },
        ],
      },
    },
    now: new Date('2026-05-19T12:00:00.000Z'),
  })
  const hiddenRawWatch = buildFoundationHealthGreenLockStatus({
    rawRiskCount: 0,
    rawWatchCount: 1,
    classifiedFindings: {
      findings: [],
      summary: { hiddenRiskCount: 0, hiddenWatchCount: 1 },
    },
  })
  const staleSprintHealth = buildCurrentSprintHealthTruthLock({
    currentSprintStatus: {
      metadata: {
        systemHealthSummary: {
          status: 'risk',
          rawRiskCount: 1,
          rawWatchCount: 2,
        },
      },
    },
    systemHealthSummary: {
      status: 'healthy',
      rawRiskCount: 0,
      rawWatchCount: 0,
    },
  })
  const checks = [
    { ok: rawGreen.status === 'healthy' && rawGreen.blocksGreen === false, check: 'raw green passes' },
    { ok: unapprovedWatch.status === 'watch' && unapprovedWatch.blocksGreen === true, check: 'classified raw watch without Steve exception blocks green' },
    { ok: approvedException.status === 'healthy' && approvedException.approvedExceptionCount === 1, check: 'explicit Steve-approved exception can report green while remaining visible' },
    { ok: thresholdlessException.status === 'watch' && thresholdlessException.blocksGreen === true, check: 'thresholdless exception fails' },
    { ok: hiddenRawWatch.status === 'watch' && hiddenRawWatch.blocksGreen === true, check: 'hidden raw count fails closed' },
    { ok: staleSprintHealth.ok === false && staleSprintHealth.status === 'risk', check: 'stale embedded sprint health fails' },
  ]
  return {
    ok: checks.every(check => check.ok),
    checks,
    rawGreen,
    unapprovedWatch,
    approvedException,
    thresholdlessException,
    hiddenRawWatch,
    staleSprintHealth,
  }
}
