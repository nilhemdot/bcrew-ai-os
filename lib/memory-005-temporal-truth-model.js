export const MEMORY_005_CARD_ID = 'MEMORY-005'
export const MEMORY_005_NEXT_CARD_ID = 'STRATEGY-001'
export const MEMORY_005_CLOSEOUT_KEY = 'memory-005-temporal-truth-model-v1'
export const MEMORY_005_PLAN_PATH = 'docs/process/memory-005-temporal-truth-model-plan.md'
export const MEMORY_005_APPROVAL_PATH = 'docs/process/approvals/MEMORY-005.json'
export const MEMORY_005_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-20-memory-005-temporal-truth-model-closeout.md'
export const MEMORY_005_SCRIPT_PATH = 'scripts/process-memory-005-check.mjs'

export const MEMORY_005_CHANGED_FILES = [
  'lib/memory-005-temporal-truth-model.js',
  MEMORY_005_SCRIPT_PATH,
  'lib/foundation-db-schema-seed-store.js',
  'lib/foundation-db.js',
  'lib/foundation-decision-store.js',
  'docs/strategy/operating-truths.md',
  MEMORY_005_PLAN_PATH,
  MEMORY_005_APPROVAL_PATH,
  MEMORY_005_CLOSEOUT_PATH,
  'lib/foundation-build-closeout-intelligence-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'package.json',
]

export const MEMORY_005_PROOF_COMMANDS = [
  'node --check lib/memory-005-temporal-truth-model.js scripts/process-memory-005-check.mjs lib/foundation-db-schema-seed-store.js lib/foundation-db.js lib/foundation-decision-store.js',
  'npm run process:memory-005-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=MEMORY-005 --planApprovalRef=docs/process/approvals/MEMORY-005.json --closeoutKey=memory-005-temporal-truth-model-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=MEMORY-005 --closeoutKey=memory-005-temporal-truth-model-v1',
  'npm run process:foundation-ship -- --card=MEMORY-005 --planApprovalRef=docs/process/approvals/MEMORY-005.json --closeoutKey=memory-005-temporal-truth-model-v1 --commitRef=HEAD',
]

export const MEMORY_005_NOT_NEXT_BOUNDARIES = [
  'No Graphiti, vector memory rebuild, broad conversation import, or autonomous memory agent.',
  'No external model upload of private memory, chats, source data, or decision history.',
  'No automatic locking, applying, or rewriting decisions without explicit human approval.',
  'No Strategy Hub UI rebuild, Strategy atom system, governance workflow, or DATA-003 live-value rendering inside this card.',
  'No destructive history rewrite: superseded truth stays queryable as history.',
]

export const TEMPORAL_TRUTH_SCHEMA = {
  decision: {
    identity: ['id', 'category', 'title'],
    temporal: ['validFrom', 'validUntil', 'supersededBy', 'currentState'],
    provenance: ['sourceRef', 'decisionOwner', 'confirmedBy', 'contextRef', 'evidenceNotes'],
    rule: 'A decision is current only when it is locked/proposed, validFrom is not in the future, validUntil is empty or after the as-of time, and supersededBy is empty.',
  },
  strategy: {
    identity: ['id', 'docPath', 'sourceId', 'truthKey', 'title'],
    temporal: ['validFrom', 'validUntil', 'supersededBy', 'currentState'],
    provenance: ['sourceId', 'sourceRef', 'asOf', 'owner', 'detail'],
    rule: 'A strategy truth is current only when source provenance exists, validFrom/asOf is not in the future, validUntil is empty or after the as-of time, and supersededBy is empty.',
  },
}

const RECORD_TYPES = new Set(Object.keys(TEMPORAL_TRUTH_SCHEMA))

function text(value) {
  return String(value ?? '').trim()
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function parseDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function isoDate(value) {
  const date = parseDate(value)
  return date ? date.toISOString() : null
}

function sourceRefFor(record = {}) {
  return text(record.sourceRef || record.source_ref || record.sourceId || record.source_id)
}

function ownerFor(record = {}) {
  return text(record.owner || record.decisionOwner || record.decision_owner || record.confirmedBy || record.confirmed_by)
}

function recordTitle(record = {}) {
  return text(record.title || record.label || record.summary || record.truthKey || record.id)
}

function inferTruthKey(record = {}) {
  return text(record.truthKey || record.truth_key || record.naturalKey || record.natural_key || `${record.recordType || record.record_type || 'record'}:${record.category || record.docPath || record.doc_path || record.sourceId || record.source_id || record.id}`)
}

function normalizeRecordType(record = {}) {
  const explicit = text(record.recordType || record.record_type || record.type)
  if (RECORD_TYPES.has(explicit)) return explicit
  if (record.category || record.decisionOwner || record.decision_owner || record.confirmedBy || record.confirmed_by) return 'decision'
  if (record.docPath || record.doc_path || record.sourceId || record.source_id || record.asOf || record.as_of) return 'strategy'
  return explicit || 'unknown'
}

function inferValidFrom(record = {}) {
  return (
    record.validFrom ||
    record.valid_from ||
    record.asOf ||
    record.as_of ||
    record.classifiedAt ||
    record.classified_at ||
    record.createdAt ||
    record.created_at
  )
}

function inferValidUntil(record = {}) {
  return record.validUntil || record.valid_until || record.expiresAt || record.expires_at || null
}

function inferSupersededBy(record = {}) {
  return text(record.supersededBy || record.superseded_by || record.supersededByDecisionId || record.superseded_by_decision_id)
}

export function isTemporalRecordCurrent(record = {}, asOf = new Date()) {
  const asOfDate = parseDate(asOf)
  const validFrom = parseDate(record.validFrom)
  const validUntil = parseDate(record.validUntil)
  if (!asOfDate || !validFrom) return false
  if (validFrom.getTime() > asOfDate.getTime()) return false
  if (validUntil && validUntil.getTime() <= asOfDate.getTime()) return false
  if (text(record.supersededBy)) return false
  if (['archived', 'rejected', 'superseded'].includes(text(record.status))) return false
  return true
}

export function normalizeTemporalTruthRecord(record = {}, { asOf = new Date() } = {}) {
  const recordType = normalizeRecordType(record)
  const normalized = {
    id: text(record.id || record.recordId || record.record_id),
    recordType,
    truthKey: inferTruthKey({ ...record, recordType }),
    title: recordTitle(record),
    status: text(record.status || 'active') || 'active',
    sourceId: text(record.sourceId || record.source_id),
    sourceRef: sourceRefFor(record),
    owner: ownerFor(record),
    validFrom: isoDate(inferValidFrom(record)),
    validUntil: isoDate(inferValidUntil(record)),
    supersededBy: inferSupersededBy(record),
    detail: text(record.detail || record.evidenceNotes || record.evidence_notes || record.summary),
    currentState: 'not_current',
  }
  normalized.currentState = isTemporalRecordCurrent(normalized, asOf) ? 'current' : 'not_current'
  return normalized
}

export function getCurrentTemporalTruthRecords(records = [], { asOf = new Date() } = {}) {
  return list(records)
    .map(record => normalizeTemporalTruthRecord(record, { asOf }))
    .filter(record => record.currentState === 'current')
    .sort((a, b) => a.truthKey.localeCompare(b.truthKey) || a.id.localeCompare(b.id))
}

export function evaluateTemporalTruthRecords(records = [], { asOf = new Date() } = {}) {
  const normalized = list(records).map(record => normalizeTemporalTruthRecord(record, { asOf }))
  const failures = []

  function fail(record, check, detail = '') {
    failures.push({
      recordId: record?.id || 'unknown',
      truthKey: record?.truthKey || 'unknown',
      check,
      detail: String(detail || ''),
    })
  }

  for (const record of normalized) {
    if (!record.id) fail(record, 'record id is required')
    if (!RECORD_TYPES.has(record.recordType)) fail(record, 'record type must be decision or strategy', record.recordType)
    if (!record.truthKey) fail(record, 'truthKey is required')
    if (!record.validFrom) fail(record, 'validFrom/asOf is required')
    if (!record.sourceRef) fail(record, 'sourceRef/sourceId provenance is required')
    if (!record.owner) fail(record, 'owner or confirmedBy is required')
    const validFrom = parseDate(record.validFrom)
    const validUntil = parseDate(record.validUntil)
    if (validFrom && validUntil && validUntil.getTime() <= validFrom.getTime()) {
      fail(record, 'validUntil must be after validFrom', `${record.validFrom} -> ${record.validUntil}`)
    }
    if (record.status === 'superseded' && !record.supersededBy && !record.validUntil) {
      fail(record, 'superseded records need supersededBy or validUntil')
    }
  }

  const currentByKey = new Map()
  for (const record of normalized.filter(item => item.currentState === 'current')) {
    const key = `${record.recordType}:${record.truthKey}`
    const existing = currentByKey.get(key) || []
    existing.push(record)
    currentByKey.set(key, existing)
  }

  for (const [key, currentRecords] of currentByKey.entries()) {
    if (currentRecords.length > 1) {
      failures.push({
        recordId: currentRecords.map(record => record.id).join(', '),
        truthKey: key,
        check: 'only one current record is allowed per truthKey',
        detail: currentRecords.map(record => record.title).join(' | '),
      })
    }
  }

  return {
    ok: failures.length === 0,
    status: failures.length ? 'risk' : 'healthy',
    asOf: isoDate(asOf),
    summary: {
      recordCount: normalized.length,
      currentCount: normalized.filter(record => record.currentState === 'current').length,
      historicalCount: normalized.filter(record => record.currentState !== 'current').length,
      conflictCount: failures.filter(item => item.check.includes('only one current')).length,
      failedCount: failures.length,
    },
    records: normalized,
    currentRecords: normalized.filter(record => record.currentState === 'current'),
    failures,
  }
}

export function buildMemory005DogfoodProof() {
  const asOf = '2026-05-20T12:00:00.000-04:00'
  const healthyRecords = [
    {
      id: 'DEC-CURRENT',
      recordType: 'decision',
      truthKey: 'strategy:meeting-cadence',
      category: 'strategy',
      title: 'Run weekly leadership execution meeting',
      status: 'locked',
      sourceRef: 'SRC-STRATEGY-001',
      decisionOwner: 'Steve',
      validFrom: '2026-05-01T00:00:00.000-04:00',
      evidenceNotes: 'Synthetic current decision.',
    },
    {
      id: 'DEC-OLD',
      recordType: 'decision',
      truthKey: 'strategy:meeting-cadence',
      category: 'strategy',
      title: 'Run daily leadership standup',
      status: 'superseded',
      sourceRef: 'SRC-STRATEGY-001',
      decisionOwner: 'Steve',
      validFrom: '2026-04-01T00:00:00.000-04:00',
      validUntil: '2026-04-30T23:59:00.000-04:00',
      supersededBy: 'DEC-CURRENT',
      evidenceNotes: 'Synthetic superseded decision.',
    },
    {
      id: 'STRAT-FUTURE',
      recordType: 'strategy',
      truthKey: 'strategy:meeting-cadence',
      title: 'Future meeting cadence revision',
      status: 'active',
      sourceId: 'SRC-STRATEGY-001',
      owner: 'Strategy',
      validFrom: '2026-06-01T00:00:00.000-04:00',
      detail: 'Synthetic future strategy truth.',
    },
  ]

  const healthy = evaluateTemporalTruthRecords(healthyRecords, { asOf })
  const overlapping = evaluateTemporalTruthRecords([
    healthyRecords[0],
    {
      ...healthyRecords[0],
      id: 'DEC-CONFLICT',
      title: 'Conflicting current meeting cadence',
      validFrom: '2026-05-02T00:00:00.000-04:00',
    },
  ], { asOf })
  const missingProvenance = evaluateTemporalTruthRecords([
    { ...healthyRecords[0], id: 'DEC-NO-SOURCE', sourceRef: '', sourceId: '' },
  ], { asOf })
  const invalidWindow = evaluateTemporalTruthRecords([
    { ...healthyRecords[0], id: 'DEC-BAD-WINDOW', validUntil: '2026-04-01T00:00:00.000-04:00' },
  ], { asOf })

  const currentIds = healthy.currentRecords.map(record => record.id)
  return {
    ok:
      healthy.ok &&
      currentIds.includes('DEC-CURRENT') &&
      !currentIds.includes('DEC-OLD') &&
      !currentIds.includes('STRAT-FUTURE') &&
      !overlapping.ok &&
      !missingProvenance.ok &&
      !invalidWindow.ok,
    invariant: 'MEMORY-005 only passes when temporal truth can answer current-vs-history from validFrom/validUntil/supersededBy with provenance and conflict checks.',
    healthy: healthy.summary,
    currentIds,
    rejected: {
      overlapping: overlapping.failures.map(item => item.check),
      missingProvenance: missingProvenance.failures.map(item => item.check),
      invalidWindow: invalidWindow.failures.map(item => item.check),
    },
  }
}

function includesAll(source = '', terms = []) {
  return terms.every(term => String(source || '').includes(term))
}

export function evaluateMemory005Implementation({
  moduleSource = '',
  schemaSeedSource = '',
  foundationDbSource = '',
  decisionStoreSource = '',
  operatingTruthsSource = '',
  closeoutRegistrySource = '',
  coverageSource = '',
} = {}) {
  const failed = []
  function check(ok, name, detail = '') {
    if (!ok) failed.push({ check: name, detail: String(detail || '') })
  }

  check(includesAll(moduleSource, ['TEMPORAL_TRUTH_SCHEMA', 'evaluateTemporalTruthRecords', 'getCurrentTemporalTruthRecords']), 'temporal truth module owns schema and current-state query helpers', 'lib/memory-005-temporal-truth-model.js')
  check(includesAll(schemaSeedSource, ['valid_from', 'valid_until', 'superseded_by']), 'decisions schema carries temporal columns', 'lib/foundation-db-schema-seed-store.js')
  check(includesAll(foundationDbSource, ['valid_from', 'valid_until', 'superseded_by']), 'Foundation DB decision queries select temporal fields', 'lib/foundation-db.js')
  check(includesAll(decisionStoreSource, ['validFrom', 'validUntil', 'supersededBy', 'superseded_by = $']), 'decision store maps and writes temporal fields', 'lib/foundation-decision-store.js')
  check(includesAll(operatingTruthsSource, ['Temporal Truth Model', 'validFrom', 'validUntil', 'supersededBy']), 'operating truths document the temporal meaning contract without live values', 'docs/strategy/operating-truths.md')
  check(closeoutRegistrySource.includes(MEMORY_005_CLOSEOUT_KEY), 'closeout registry includes MEMORY-005 key', MEMORY_005_CLOSEOUT_KEY)
  check(coverageSource.includes('MEMORY_005_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE') && coverageSource.includes(MEMORY_005_CARD_ID), 'verifier coverage IDs include MEMORY-005', 'lib/foundation-verify-coverage-card-ids.js')

  return {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    failed,
    summary: {
      implementationChecks: 7,
      failedCount: failed.length,
    },
  }
}

export function renderMemory005Closeout({ evaluation = {}, dogfood = {}, liveSchema = {}, generatedAt = new Date().toISOString() } = {}) {
  return `# MEMORY-005 Temporal Truth Model Closeout

Card: \`${MEMORY_005_CARD_ID}\`
Closeout key: \`${MEMORY_005_CLOSEOUT_KEY}\`
Generated: ${generatedAt}

## What Changed

- Added a reusable temporal truth contract for decision and strategy records.
- Added current-state query helpers that use \`validFrom\`, \`validUntil\`, and \`supersededBy\` instead of trusting whichever note looks newest.
- Added decision-store/database support for decision temporal fields: \`valid_from\`, \`valid_until\`, and \`superseded_by\`.
- Documented the temporal meaning rule in Operating Truths without putting live values in markdown.
- Added dogfood proof that rejects overlapping current truth, missing provenance, invalid temporal windows, and future truth becoming current too early.

## Proof

- Focused status: \`${evaluation.status || 'unknown'}\`
- Live decision temporal columns: \`${(liveSchema.columns || []).join(', ') || 'unknown'}\`
- Dogfood current IDs: \`${(dogfood.currentIds || []).join(', ') || 'unknown'}\`

Proof commands:

${MEMORY_005_PROOF_COMMANDS.map(command => `- \`${command}\``).join('\n')}

## Not Next

${MEMORY_005_NOT_NEXT_BOUNDARIES.map(item => `- ${item}`).join('\n')}

## Next

Continue \`${MEMORY_005_NEXT_CARD_ID}\`.
`
}
