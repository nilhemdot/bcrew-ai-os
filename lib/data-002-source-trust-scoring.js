export const DATA_002_CARD_ID = 'DATA-002'
export const DATA_002_CLOSEOUT_KEY = 'data-002-source-trust-scoring-v1'
export const DATA_002_PLAN_PATH = 'docs/process/data-002-source-trust-scoring-plan.md'
export const DATA_002_APPROVAL_PATH = 'docs/process/approvals/DATA-002.json'
export const DATA_002_SCRIPT_PATH = 'scripts/process-data-002-check.mjs'
export const DATA_002_CLOSEOUT_PATH = 'docs/handoffs/2026-05-19-data-002-source-trust-scoring-closeout.md'

export const DATA_002_CHANGED_FILES = [
  'lib/data-002-source-trust-scoring.js',
  'lib/source-of-truth-payload.js',
  'public/foundation-source-registry-renderers.js',
  DATA_002_SCRIPT_PATH,
  'package.json',
  'lib/foundation-build-closeout-intelligence-records.js',
  DATA_002_PLAN_PATH,
  DATA_002_APPROVAL_PATH,
  DATA_002_CLOSEOUT_PATH,
]

export const DATA_002_PROOF_COMMANDS = [
  `node --check lib/data-002-source-trust-scoring.js lib/source-of-truth-payload.js public/foundation-source-registry-renderers.js ${DATA_002_SCRIPT_PATH}`,
  'npm run process:data-002-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${DATA_002_CARD_ID} --planApprovalRef=${DATA_002_APPROVAL_PATH} --closeoutKey=${DATA_002_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${DATA_002_CARD_ID} --closeoutKey=${DATA_002_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${DATA_002_CARD_ID} --planApprovalRef=${DATA_002_APPROVAL_PATH} --closeoutKey=${DATA_002_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const DATA_002_NOT_NEXT = [
  'Do not run extraction, source sync, browser sessions, model synthesis, or provider calls from this card.',
  'Do not mutate source data, Drive permissions, provider config, credentials, backlog action routes, atoms, vectors, or external systems.',
  'Do not treat connector access as source trust.',
  'Do not make low-scored sources decision-safe without signed-off/current-reality evidence.',
  'Do not start Value Builder split.',
]

const TRUST_SCORE_WEIGHTS = Object.freeze({
  sourceTrust: 30,
  connectorHealth: 20,
  freshness: 20,
  completeness: 15,
  schemaHealth: 15,
})

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
}

function lower(value) {
  return text(value).toLowerCase()
}

function clamp(value, max) {
  return Math.max(0, Math.min(Number(max), Number(value) || 0))
}

function toAgeDays(value, generatedAt) {
  if (!value) return null
  const date = new Date(value)
  const now = new Date(generatedAt)
  if (Number.isNaN(date.getTime()) || Number.isNaN(now.getTime())) return null
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86_400_000))
}

function scoreSourceTrust({ contract = {}, row = {} } = {}) {
  const trustStatus = row.trustStatus || ''
  const validation = lower(contract.validation)
  const status = lower(contract.status)
  if (trustStatus === 'trusted_signed_off' || validation === 'signed off') return 30
  if (trustStatus === 'trusted_current_reality' || validation.includes('current reality')) return 26
  if (validation.includes('verified for ops')) return 22
  if (trustStatus === 'readable_not_fully_signed_off' || validation.includes('readable only') || status.includes('verified readable')) return 18
  if (trustStatus === 'scoped_not_trusted' || status.includes('scoped')) return 8
  if (trustStatus === 'blocked' || status.includes('gap') || status.includes('blocked')) return 3
  return 10
}

function scoreConnectorHealth({ row = {} } = {}) {
  const connectorStatus = lower(row.connectorStatus)
  if (connectorStatus.includes('working')) return 20
  if (connectorStatus.includes('needs_validation')) return 12
  if (connectorStatus.includes('no_direct_connector_mapping')) return 8
  if (connectorStatus.includes('not_wired')) return 3
  return 6
}

function scoreFreshness({ contract = {}, row = {}, generatedAt } = {}) {
  const freshnessStatus = row.freshnessStatus || ''
  const ageDays = row.freshnessAgeDays ?? toAgeDays(contract.lastVerified, generatedAt)
  if (freshnessStatus === 'monitored') return ageDays != null && ageDays > 45 ? 16 : 20
  if (freshnessStatus === 'dated_evidence') {
    if (ageDays == null) return 10
    if (ageDays <= 14) return 18
    if (ageDays <= 45) return 14
    if (ageDays <= 90) return 9
    return 5
  }
  if (freshnessStatus === 'manual_or_review_cadence') {
    if (ageDays == null) return 8
    if (ageDays <= 45) return 13
    if (ageDays <= 90) return 8
    return 4
  }
  if (freshnessStatus === 'stale_review_needed') return 3
  return 5
}

function scoreCompleteness({ contract = {}, row = {} } = {}) {
  const checks = [
    text(contract.sourceId),
    text(contract.title),
    text(contract.owner || row.owner),
    text(contract.accessMethod),
    text(contract.location),
    text(contract.scope || contract.owns),
    text(contract.validationScope || contract.doneMeans || contract.stillOpen),
    text(contract.lastVerified),
    asArray(row.dependentSystems).length > 0,
    asArray(row.directSourceLinks).length > 0 || asArray(contract.actions).length > 0 || asArray(contract.packetDocs).length > 0,
  ]
  const passed = checks.filter(Boolean).length
  return clamp(Math.round((passed / checks.length) * TRUST_SCORE_WEIGHTS.completeness), TRUST_SCORE_WEIGHTS.completeness)
}

function scoreSchemaHealth({ contract = {}, kpiHealth = {} } = {}) {
  const sourceId = contract.sourceId || ''
  if (sourceId === 'SRC-SUPABASE-001') {
    const summaryStatus = kpiHealth.summary?.status || kpiHealth.status
    const schemaStatus = kpiHealth.schemaDrift?.status || kpiHealth.summary?.schemaDriftStatus
    return summaryStatus === 'healthy' && schemaStatus === 'healthy' ? 15 : 6
  }
  if (asArray(contract.signedOffTabs).length) return 13
  if (asArray(contract.packetDocs).length) return 12
  if (text(contract.scope) && text(contract.validationScope)) return 11
  if (lower(contract.status).includes('verified readable')) return 9
  if (lower(contract.status).includes('scoped') || lower(contract.status).includes('gap')) return 4
  return 7
}

function decisionStateFor({ score, row = {}, componentScores = {} } = {}) {
  const trustStatus = row.trustStatus || ''
  const driftStatus = row.driftStatus || ''
  if (trustStatus === 'blocked' || trustStatus === 'scoped_not_trusted' || score < 45) {
    return 'not_decision_safe'
  }
  if (
    score >= 80 &&
    trustStatus.startsWith('trusted') &&
    driftStatus !== 'open_or_blocked' &&
    componentScores.freshness >= 10
  ) {
    return 'decision_safe'
  }
  if (score >= 65 && (trustStatus.startsWith('trusted') || trustStatus === 'readable_not_fully_signed_off')) {
    return 'usable_with_review'
  }
  return 'review_required'
}

function nextTriggerCodeFor({ decisionState, row = {}, componentScores = {} } = {}) {
  if (decisionState === 'decision_safe') return 'rescore_on_change'
  if (componentScores.sourceTrust < 20) return 'source_owner_signoff'
  if (componentScores.freshness < 10) return 'refresh_evidence'
  if (componentScores.connectorHealth < 10) return 'harden_connector'
  if (componentScores.completeness < 10) return 'fill_source_fields'
  if (row.driftStatus === 'open_or_blocked') return 'resolve_drift'
  return 'keep_review_gated'
}

function nextTriggerForCode(code = '') {
  return {
    rescore_on_change: 'Re-score when source contract, connector, freshness, or schema health changes.',
    source_owner_signoff: 'Source owner must sign off meaning or keep this source out of decision-grade surfaces.',
    refresh_evidence: 'Refresh or revalidate source evidence before consumers treat it as current.',
    harden_connector: 'Harden or map the connector before expanding automated consumption.',
    fill_source_fields: 'Fill owner, scope, evidence links, dependencies, and source boundary fields.',
    resolve_drift: 'Resolve blocked/open source drift or keep the source review-gated.',
    keep_review_gated: 'Keep review-gated until the next source contract closeout improves the score.',
  }[code] || 'Keep review-gated until the next source contract closeout improves the score.'
}

function plainEnglishFor({ score, decisionState, row = {} } = {}) {
  if (decisionState === 'decision_safe') return `Decision-safe source truth (${score}/100) with signed-off/current-reality trust and adequate freshness.`
  if (decisionState === 'usable_with_review') return `Usable with review (${score}/100); do not treat as fully autonomous decision truth.`
  if (decisionState === 'review_required') return `Review required (${score}/100); source has useful evidence but needs trust/freshness/completeness hardening.`
  return `Not decision-safe (${score}/100); ${row.trustStatus || 'source trust'} remains blocked, scoped, stale, or incomplete.`
}

export function buildSourceTrustScoringSnapshot({
  sourceContracts = [],
  sourceLayerStatus = {},
  kpiHealth = {},
  generatedAt = new Date().toISOString(),
} = {}) {
  const rowsBySourceId = new Map(asArray(sourceLayerStatus.sourceRows).map(row => [row.sourceId, row]))
  const scoreRows = asArray(sourceContracts).map(contract => {
    const row = rowsBySourceId.get(contract.sourceId) || {}
    const componentScores = {
      sourceTrust: scoreSourceTrust({ contract, row }),
      connectorHealth: scoreConnectorHealth({ contract, row }),
      freshness: scoreFreshness({ contract, row, generatedAt }),
      completeness: scoreCompleteness({ contract, row }),
      schemaHealth: scoreSchemaHealth({ contract, kpiHealth }),
    }
    const score = Object.values(componentScores).reduce((sum, value) => sum + value, 0)
    const decisionState = decisionStateFor({ score, row, componentScores })
    const nextTriggerCode = nextTriggerCodeFor({ decisionState, row, componentScores })
    return {
      sourceId: contract.sourceId,
      title: contract.title,
      unitName: contract.unitName || '',
      score,
      maxScore: 100,
      scoreLabel: `${score}/100`,
      decisionState,
      componentScores,
      weights: TRUST_SCORE_WEIGHTS,
      trustStatus: row.trustStatus || 'unknown',
      sourceStatus: row.sourceStatus || 'unknown',
      connectorStatus: row.connectorStatus || 'unknown',
      freshnessStatus: row.freshnessStatus || 'unknown',
      freshnessAgeDays: row.freshnessAgeDays ?? toAgeDays(contract.lastVerified, generatedAt),
      driftStatus: row.driftStatus || 'unknown',
      owner: contract.owner || row.owner || 'System',
      nextTriggerCode,
      nextTrigger: nextTriggerForCode(nextTriggerCode),
      plainEnglish: plainEnglishFor({ score, decisionState, row }),
    }
  })
  const scoreRowsBySourceId = Object.fromEntries(scoreRows.map(row => [row.sourceId, row]))
  const decisionStateCounts = scoreRows.reduce((counts, row) => {
    counts[row.decisionState] = (counts[row.decisionState] || 0) + 1
    return counts
  }, {})
  const scoreBuckets = scoreRows.reduce((counts, row) => {
    const bucket = row.score >= 80 ? '80_100' : row.score >= 65 ? '65_79' : row.score >= 45 ? '45_64' : '0_44'
    counts[bucket] = (counts[bucket] || 0) + 1
    return counts
  }, {})
  const missingScoreRows = asArray(sourceContracts).filter(contract => !scoreRowsBySourceId[contract.sourceId])
  const decisionSafeCount = decisionStateCounts.decision_safe || 0
  return {
    cardId: DATA_002_CARD_ID,
    closeoutKey: DATA_002_CLOSEOUT_KEY,
    generatedAt,
    status: missingScoreRows.length ? 'risk' : 'healthy',
    summary: {
      sourceCount: asArray(sourceContracts).length,
      scoredSourceCount: scoreRows.length,
      decisionSafeCount,
      reviewRequiredCount: decisionStateCounts.review_required || 0,
      usableWithReviewCount: decisionStateCounts.usable_with_review || 0,
      notDecisionSafeCount: decisionStateCounts.not_decision_safe || 0,
      decisionStateCounts,
      scoreBuckets,
      averageScore: scoreRows.length
        ? Math.round(scoreRows.reduce((sum, row) => sum + row.score, 0) / scoreRows.length)
        : 0,
      missingScoreRows: missingScoreRows.length,
    },
    weights: TRUST_SCORE_WEIGHTS,
    scoreRows,
    scoreRowsBySourceId,
    invariants: [
      'A connector score can improve technical confidence, but it cannot make an unsigned source decision-safe by itself.',
      'Decision-safe requires high total score plus trusted source status and non-blocking drift posture.',
      'Every source contract must have a score, component scores, next trigger, and decision state.',
    ],
  }
}

export function compactSourceTrustScore(row = {}) {
  if (!row) return null
  return {
    score: row.score,
    decisionState: row.decisionState,
    trigger: shortTriggerCode(row.nextTriggerCode),
  }
}

function shortTriggerCode(code = '') {
  return {
    rescore_on_change: 'change',
    source_owner_signoff: 'signoff',
    refresh_evidence: 'fresh',
    harden_connector: 'conn',
    fill_source_fields: 'fields',
    resolve_drift: 'drift',
    keep_review_gated: 'review',
  }[code] || 'review'
}

function compactSourceTrustSummary(summary = {}) {
  return {
    sourceCount: summary.sourceCount || 0,
    scoredSourceCount: summary.scoredSourceCount || 0,
    decisionSafeCount: summary.decisionSafeCount || 0,
    reviewRequiredCount: summary.reviewRequiredCount || 0,
    usableWithReviewCount: summary.usableWithReviewCount || 0,
    notDecisionSafeCount: summary.notDecisionSafeCount || 0,
    averageScore: summary.averageScore || 0,
    missingScoreRows: summary.missingScoreRows || 0,
  }
}

export function compactSourceTrustScoringSnapshot(scoring = {}) {
  return {
    status: scoring.status,
    summary: compactSourceTrustSummary(scoring.summary || {}),
  }
}

export function attachSourceTrustScoresToContracts(sourceContracts = [], scoring = {}) {
  const scores = scoring.scoreRowsBySourceId || {}
  return asArray(sourceContracts).map(contract => ({
    ...contract,
    trustScore: compactSourceTrustScore(scores[contract.sourceId]) || null,
  }))
}

export function attachSourceTrustScoresToLayerStatus(sourceLayerStatus = {}, scoring = {}) {
  return {
    ...sourceLayerStatus,
    summary: {
      ...(sourceLayerStatus.summary || {}),
      sourceTrustScoreSummary: compactSourceTrustSummary(scoring.summary || {}),
    },
    sourceRows: asArray(sourceLayerStatus.sourceRows),
  }
}

export function evaluateSourceTrustScoringSnapshot(snapshot = {}, {
  minSourceRows = 40,
} = {}) {
  const scoreRows = asArray(snapshot.scoreRows)
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  add(snapshot.status === 'healthy', 'source trust scoring snapshot is healthy', snapshot.status || 'missing')
  add(scoreRows.length >= minSourceRows, 'all expected source rows are scored', `${scoreRows.length}/${minSourceRows}`)
  add(scoreRows.every(row => row.sourceId && Number.isFinite(row.score) && row.score >= 0 && row.score <= 100), 'each row has a bounded 0-100 score', String(scoreRows.length))
  add(scoreRows.every(row => row.componentScores && Object.keys(TRUST_SCORE_WEIGHTS).every(key => Number.isFinite(row.componentScores[key]))), 'each row has component scores', String(scoreRows.length))
  add(scoreRows.every(row => row.decisionState && row.nextTrigger && row.plainEnglish), 'each row has decision state, next trigger, and plain-English meaning', String(scoreRows.length))
  add(scoreRows.some(row => row.decisionState === 'decision_safe'), 'decision-safe rows are represented', JSON.stringify(snapshot.summary?.decisionStateCounts || {}))
  add(scoreRows.some(row => row.decisionState === 'not_decision_safe'), 'not-decision-safe rows are represented', JSON.stringify(snapshot.summary?.decisionStateCounts || {}))
  const unsafeUnsigned = scoreRows.filter(row =>
    row.decisionState === 'decision_safe' &&
    !['trusted_signed_off', 'trusted_current_reality'].includes(row.trustStatus)
  )
  add(unsafeUnsigned.length === 0, 'unsigned/readable-only sources cannot become decision-safe by connector score alone', unsafeUnsigned.map(row => row.sourceId).join(', ') || 'none')
  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    checks,
    failed,
  }
}

export function buildSourceTrustScoringDogfoodProof() {
  const sourceLayerStatus = {
    sourceRows: [
      {
        sourceId: 'SRC-DOGFOOD-SIGNED-001',
        sourceStatus: 'signed_off',
        trustStatus: 'trusted_signed_off',
        freshnessStatus: 'monitored',
        freshnessAgeDays: 1,
        driftStatus: 'clear',
        owner: 'Ops',
        connectorStatus: 'working',
        dependentSystems: [{ systemId: 'SYS-DOGFOOD-001' }],
        directSourceLinks: [{ label: 'Open', href: 'https://example.test' }],
      },
      {
        sourceId: 'SRC-DOGFOOD-READABLE-001',
        sourceStatus: 'readable_only',
        trustStatus: 'readable_not_fully_signed_off',
        freshnessStatus: 'monitored',
        freshnessAgeDays: 1,
        driftStatus: 'clear',
        owner: 'Ops',
        connectorStatus: 'working',
        dependentSystems: [{ systemId: 'SYS-DOGFOOD-001' }],
        directSourceLinks: [{ label: 'Open', href: 'https://example.test' }],
      },
      {
        sourceId: 'SRC-DOGFOOD-GAP-001',
        sourceStatus: 'blocked',
        trustStatus: 'blocked',
        freshnessStatus: 'unknown',
        driftStatus: 'open_or_blocked',
        owner: 'Steve',
        connectorStatus: 'not_wired',
        dependentSystems: [],
        directSourceLinks: [],
      },
    ],
  }
  const snapshot = buildSourceTrustScoringSnapshot({
    sourceContracts: [
      {
        sourceId: 'SRC-DOGFOOD-SIGNED-001',
        title: 'Signed source',
        validation: 'Signed Off',
        status: 'Signed Off',
        owner: 'Ops',
        accessMethod: 'Google Sheets',
        location: 'https://example.test',
        scope: 'A:Z',
        owns: 'Dogfood truth',
        validationScope: 'Signed off for dogfood',
        lastVerified: '2026-05-19',
        signedOffTabs: ['Dogfood'],
      },
      {
        sourceId: 'SRC-DOGFOOD-READABLE-001',
        title: 'Readable source',
        validation: 'Readable Only',
        status: 'Verified Readable',
        owner: 'Ops',
        accessMethod: 'API',
        location: 'https://example.test',
        scope: 'Read-only',
        owns: 'Readable evidence',
        validationScope: 'Readable only',
        lastVerified: '2026-05-19',
      },
      {
        sourceId: 'SRC-DOGFOOD-GAP-001',
        title: 'Blocked source',
        validation: 'Not Signed Off',
        status: 'Gap',
        owner: 'Steve',
        accessMethod: 'Planned',
        location: 'Future',
        stillOpen: 'Approval required.',
      },
    ],
    sourceLayerStatus,
    generatedAt: '2026-05-19T12:00:00.000Z',
  })
  const signed = snapshot.scoreRowsBySourceId['SRC-DOGFOOD-SIGNED-001']
  const readable = snapshot.scoreRowsBySourceId['SRC-DOGFOOD-READABLE-001']
  const gap = snapshot.scoreRowsBySourceId['SRC-DOGFOOD-GAP-001']
  const evaluation = evaluateSourceTrustScoringSnapshot(snapshot, { minSourceRows: 3 })
  return {
    ok: evaluation.ok &&
      signed?.decisionState === 'decision_safe' &&
      readable?.decisionState !== 'decision_safe' &&
      gap?.decisionState === 'not_decision_safe',
    evaluation,
    signed,
    readable,
    gap,
    invariant: 'Connector health can improve score, but only signed/current-reality sources become decision-safe.',
  }
}
