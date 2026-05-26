import crypto from 'node:crypto'

export const DECISION_005_CARD_ID = 'DECISION-005'
export const DECISION_005_CLOSEOUT_KEY = 'decision-005-provenance-participant-model-v1'
export const DECISION_005_PLAN_PATH = 'docs/process/decision-005-plan.md'
export const DECISION_005_APPROVAL_PATH = 'docs/process/approvals/DECISION-005.json'
export const DECISION_005_SCRIPT_PATH = 'scripts/process-decision-005-check.mjs'
export const DECISION_005_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-26-hot-doc-refresh/2026-05-20-decision-005-provenance-participant-model-closeout.md'
export const DECISION_005_NEXT_CARD_ID = 'FOUNDATION-SURFACE-UPDATES-001'
export const DECISION_005_SPRINT_ID = 'FOUNDATION-OPERATING-TRUTH-AND-DATA-HEALTH-2026-05-20'

export const DECISION_005_PROOF_COMMANDS = [
  'node --check lib/decision-005-provenance-model.js scripts/process-decision-005-check.mjs lib/foundation-decision-store.js lib/foundation-db-schema-seed-store.js',
  'npm run process:decision-005-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${DECISION_005_CARD_ID} --planApprovalRef=${DECISION_005_APPROVAL_PATH} --closeoutKey=${DECISION_005_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${DECISION_005_CARD_ID} --closeoutKey=${DECISION_005_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${DECISION_005_CARD_ID} --planApprovalRef=${DECISION_005_APPROVAL_PATH} --closeoutKey=${DECISION_005_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const DECISION_005_CHANGED_FILES = [
  'lib/decision-005-provenance-model.js',
  DECISION_005_SCRIPT_PATH,
  DECISION_005_PLAN_PATH,
  DECISION_005_APPROVAL_PATH,
  DECISION_005_CLOSEOUT_PATH,
  'lib/foundation-db-schema-seed-store.js',
  'lib/foundation-decision-store.js',
  'lib/foundation-write-routes.js',
  'lib/foundation-shared-comms-store.js',
  'lib/strategy-shared-comms-routes.js',
  'lib/foundation-build-closeout-intelligence-records.js',
  'package.json',
]

export const DECISION_005_NOT_NEXT_BOUNDARIES = [
  'Do not auto-lock, auto-apply, auto-reject, or send decisions.',
  'Do not mutate external systems, Drive permissions, credentials, provider config, source systems, or private extraction.',
  'Do not build DECISION-006 policy/SOP artifacts inside this card.',
  'Do not rebuild Action Router, atoms, retrieval, or the decisions table as a separate truth store.',
  'Do not treat backfilled provenance as direct meeting/session/thread evidence.',
]

export const DECISION_005_PROVENANCE_TYPES = ['direct', 'route_derived', 'backfilled', 'unknown']
export const DECISION_005_PROVENANCE_STATUSES = ['strong', 'needs_review', 'weak_backfill', 'missing']

function normalizeText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.map(item => normalizeText(item)).filter(Boolean)
  if (!value) return []
  if (typeof value === 'string') {
    return value
      .replace(/^{|}$/g, '')
      .split(',')
      .map(item => normalizeText(item))
      .filter(Boolean)
  }
  return []
}

function unique(values = []) {
  return Array.from(new Set(normalizeArray(values)))
}

function normalizeObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

function valueFor(item = {}, camelKey = '') {
  const snakeKey = camelKey.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
  return item[camelKey] ?? item[snakeKey]
}

export function normalizeDecision005Decision(row = {}) {
  return {
    id: normalizeText(valueFor(row, 'id')),
    category: normalizeText(valueFor(row, 'category')),
    title: normalizeText(valueFor(row, 'title')),
    status: normalizeText(valueFor(row, 'status')),
    sourceRef: normalizeText(valueFor(row, 'sourceRef')),
    decisionOwner: normalizeText(valueFor(row, 'decisionOwner')),
    confirmedBy: normalizeText(valueFor(row, 'confirmedBy')),
    participantNames: unique(valueFor(row, 'participantNames')),
    contextRef: normalizeText(valueFor(row, 'contextRef')),
    evidenceNotes: normalizeText(valueFor(row, 'evidenceNotes')),
    provenanceType: normalizeText(valueFor(row, 'provenanceType')) || 'unknown',
    provenanceStatus: normalizeText(valueFor(row, 'provenanceStatus')) || 'missing',
    provenanceNotes: normalizeText(valueFor(row, 'provenanceNotes')),
    sourceIds: unique(valueFor(row, 'sourceIds')),
    routeRefs: unique(valueFor(row, 'routeRefs')),
    artifactRefs: unique(valueFor(row, 'artifactRefs')),
    meetingRef: normalizeText(valueFor(row, 'meetingRef')),
    sessionRef: normalizeText(valueFor(row, 'sessionRef')),
    threadRef: normalizeText(valueFor(row, 'threadRef')),
    participantRoles: normalizeObject(valueFor(row, 'participantRoles')),
    createdAt: valueFor(row, 'createdAt') || null,
    updatedAt: valueFor(row, 'updatedAt') || null,
  }
}

function mergeDecision(existingDecision = {}, input = {}) {
  const existing = normalizeDecision005Decision(existingDecision)
  const update = normalizeObject(input)
  const has = key => Object.prototype.hasOwnProperty.call(update, key)
  return {
    ...existing,
    status: normalizeText(update.status ?? existing.status),
    sourceRef: normalizeText(update.sourceRef ?? existing.sourceRef),
    decisionOwner: normalizeText(update.decisionOwner ?? existing.decisionOwner),
    confirmedBy: normalizeText(update.confirmedBy ?? existing.confirmedBy),
    participantNames: has('participantNames') ? unique(update.participantNames) : existing.participantNames,
    contextRef: normalizeText(update.contextRef ?? existing.contextRef),
    evidenceNotes: normalizeText(update.evidenceNotes ?? existing.evidenceNotes),
    provenanceType: normalizeText(update.provenanceType ?? existing.provenanceType) || 'unknown',
    provenanceStatus: normalizeText(update.provenanceStatus ?? existing.provenanceStatus) || 'missing',
    provenanceNotes: normalizeText(update.provenanceNotes ?? existing.provenanceNotes),
    sourceIds: has('sourceIds') ? unique(update.sourceIds) : existing.sourceIds,
    routeRefs: has('routeRefs') ? unique(update.routeRefs) : existing.routeRefs,
    artifactRefs: has('artifactRefs') ? unique(update.artifactRefs) : existing.artifactRefs,
    meetingRef: normalizeText(update.meetingRef ?? existing.meetingRef),
    sessionRef: normalizeText(update.sessionRef ?? existing.sessionRef),
    threadRef: normalizeText(update.threadRef ?? existing.threadRef),
    participantRoles: has('participantRoles') ? normalizeObject(update.participantRoles) : existing.participantRoles,
  }
}

function directRefs(decision = {}) {
  return unique([
    decision.meetingRef,
    decision.sessionRef,
    decision.threadRef,
    ...(decision.artifactRefs || []),
  ])
}

export function buildDecision005ProvenanceReadiness(existingDecision = {}, input = {}) {
  const decision = mergeDecision(existingDecision, input)
  const blockers = []
  if (!DECISION_005_PROVENANCE_TYPES.includes(decision.provenanceType) || decision.provenanceType === 'unknown') {
    blockers.push('provenanceType_required')
  }
  if (!DECISION_005_PROVENANCE_STATUSES.includes(decision.provenanceStatus) || decision.provenanceStatus === 'missing') {
    blockers.push('provenanceStatus_required')
  }
  if (!decision.participantNames.length) blockers.push('participantNames_required')

  if (decision.provenanceType === 'direct') {
    if (!directRefs(decision).length) blockers.push('direct_ref_required')
    if (!decision.sourceRef && !decision.sourceIds.length) blockers.push('direct_source_required')
    if (!['strong', 'needs_review'].includes(decision.provenanceStatus)) blockers.push('direct_status_must_be_strong_or_review')
  }

  if (decision.provenanceType === 'route_derived') {
    if (!decision.routeRefs.length) blockers.push('route_refs_required')
    if (!decision.sourceIds.length && !decision.sourceRef) blockers.push('route_source_required')
    if (!['needs_review', 'strong'].includes(decision.provenanceStatus)) blockers.push('route_status_must_be_review_or_strong')
  }

  if (decision.provenanceType === 'backfilled') {
    if (decision.provenanceStatus === 'strong') blockers.push('backfilled_cannot_be_strong')
    if (!decision.provenanceNotes && !decision.evidenceNotes) blockers.push('backfilled_notes_required')
    if (!decision.contextRef && !decision.sourceRef) blockers.push('backfilled_context_required')
  }

  return {
    ok: blockers.length === 0,
    status: blockers.length ? 'blocked' : 'ready',
    decision,
    directRefCount: directRefs(decision).length,
    blockers,
  }
}

export function validateDecision005LockInput({
  existingDecision = {},
  input = {},
  actor = '',
} = {}) {
  const nextStatus = normalizeText(input.status ?? existingDecision.status)
  if (nextStatus !== 'locked') {
    return {
      ok: true,
      status: 'not_locking',
      blockers: [],
      actor: normalizeText(actor),
    }
  }
  const readiness = buildDecision005ProvenanceReadiness(existingDecision, input)
  return {
    ok: readiness.ok,
    status: readiness.status,
    blockers: readiness.blockers,
    actor: normalizeText(actor),
    decisionId: normalizeText(existingDecision.id),
    provenanceType: readiness.decision.provenanceType,
    provenanceStatus: readiness.decision.provenanceStatus,
    directRefCount: readiness.directRefCount,
  }
}

export function buildDecision005ProvenanceSnapshot({
  decisions = [],
  generatedAt = new Date().toISOString(),
} = {}) {
  const rows = (Array.isArray(decisions) ? decisions : []).map(row => {
    const decision = normalizeDecision005Decision(row)
    const readiness = buildDecision005ProvenanceReadiness(decision, {})
    return {
      decisionId: decision.id,
      title: decision.title,
      status: decision.status,
      provenanceType: decision.provenanceType,
      provenanceStatus: decision.provenanceStatus,
      readinessStatus: readiness.status,
      blockers: readiness.blockers,
      participantCount: decision.participantNames.length,
      sourceIdCount: decision.sourceIds.length + (decision.sourceRef ? 1 : 0),
      routeRefCount: decision.routeRefs.length,
      directRefCount: readiness.directRefCount,
      hasParticipantRoles: Object.keys(decision.participantRoles || {}).length > 0,
    }
  })
  const lockedRows = rows.filter(row => row.status === 'locked')
  const lockedBlocked = lockedRows.filter(row => row.readinessStatus !== 'ready')
  return {
    status: lockedBlocked.length ? 'risk' : 'healthy',
    generatedAt,
    summary: {
      decisionCount: rows.length,
      lockedCount: lockedRows.length,
      proposedCount: rows.filter(row => row.status === 'proposed').length,
      directCount: rows.filter(row => row.provenanceType === 'direct').length,
      routeDerivedCount: rows.filter(row => row.provenanceType === 'route_derived').length,
      backfilledCount: rows.filter(row => row.provenanceType === 'backfilled').length,
      unknownCount: rows.filter(row => row.provenanceType === 'unknown').length,
      strongCount: rows.filter(row => row.provenanceStatus === 'strong').length,
      weakBackfillCount: rows.filter(row => row.provenanceStatus === 'weak_backfill').length,
      lockedBlockedCount: lockedBlocked.length,
    },
    rows,
    lockedBlocked,
  }
}

export function buildDecision005DogfoodProof() {
  const direct = buildDecision005ProvenanceReadiness({
    id: 'DOG-DIRECT',
    status: 'locked',
    sourceRef: 'SRC-MEETINGS-001',
    participantNames: ['Steve', 'Nick'],
    provenanceType: 'direct',
    provenanceStatus: 'strong',
    sourceIds: ['SRC-MEETINGS-001'],
    meetingRef: 'meeting:2026-05-20-leadership',
    participantRoles: { Steve: 'decision_owner', Nick: 'participant' },
  })
  const routeDerived = buildDecision005ProvenanceReadiness({
    id: 'DOG-ROUTE',
    status: 'locked',
    sourceRef: 'action-route:abc',
    participantNames: ['Steve'],
    provenanceType: 'route_derived',
    provenanceStatus: 'needs_review',
    sourceIds: ['SRC-GMAIL-001'],
    routeRefs: ['action-route:abc'],
    evidenceNotes: 'Route-backed proposed decision.',
  })
  const backfilled = buildDecision005ProvenanceReadiness({
    id: 'DOG-BACKFILLED',
    status: 'locked',
    sourceRef: 'historical rebuild decision',
    participantNames: ['Steve', 'Codex'],
    contextRef: 'historical session',
    evidenceNotes: 'Backfilled from old seed.',
    provenanceType: 'backfilled',
    provenanceStatus: 'weak_backfill',
    provenanceNotes: 'Historical backfill; not direct evidence.',
  })
  const rejected = {
    directMissingRef: buildDecision005ProvenanceReadiness({
      status: 'locked',
      sourceRef: 'SRC-MEETINGS-001',
      participantNames: ['Steve'],
      provenanceType: 'direct',
      provenanceStatus: 'strong',
    }),
    backfilledStrong: buildDecision005ProvenanceReadiness({
      status: 'locked',
      sourceRef: 'historical',
      participantNames: ['Steve'],
      contextRef: 'historical',
      provenanceType: 'backfilled',
      provenanceStatus: 'strong',
      provenanceNotes: 'Should not pass.',
    }),
    routeMissingRoute: buildDecision005ProvenanceReadiness({
      status: 'locked',
      sourceRef: 'SRC-GMAIL-001',
      participantNames: ['Steve'],
      provenanceType: 'route_derived',
      provenanceStatus: 'needs_review',
      sourceIds: ['SRC-GMAIL-001'],
    }),
    missingProvenance: buildDecision005ProvenanceReadiness({
      status: 'locked',
      sourceRef: 'SRC-GMAIL-001',
      participantNames: ['Steve'],
    }),
  }
  const ok = direct.ok &&
    routeDerived.ok &&
    backfilled.ok &&
    Object.values(rejected).every(result => result.ok === false)
  return {
    ok,
    direct,
    routeDerived,
    backfilled,
    rejected,
    invariant: ok
      ? 'direct, route-derived, and honest backfilled provenance pass; missing direct refs, strong backfill, route-without-route, and missing provenance fail closed'
      : 'DECISION-005 dogfood did not enforce provenance model boundaries',
  }
}

export function evaluateDecision005Implementation({
  schemaSource = '',
  decisionStoreSource = '',
  writeRoutesSource = '',
  sharedCommsRoutesSource = '',
  moduleSource = '',
  scriptSource = '',
  registrySource = '',
  packageJson = {},
  snapshot = {},
} = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail: String(detail || '') })
  const requiredColumns = [
    'provenance_type',
    'provenance_status',
    'provenance_notes',
    'source_ids',
    'route_refs',
    'artifact_refs',
    'meeting_ref',
    'session_ref',
    'thread_ref',
    'participant_roles',
  ]
  add(requiredColumns.every(column => String(schemaSource).includes(column)), 'decisions schema carries DECISION-005 provenance columns', requiredColumns.join(', '))
  add(String(decisionStoreSource).includes('validateDecision005LockInput') && String(decisionStoreSource).includes('provenance_type'), 'decision store validates and persists provenance fields', 'store hook present')
  add(String(writeRoutesSource).includes('provenanceType') && String(writeRoutesSource).includes('participantRoles'), 'Foundation decision write route accepts provenance fields', 'Foundation write route present')
  add(String(sharedCommsRoutesSource).includes('provenanceType') && String(sharedCommsRoutesSource).includes('artifactRefs'), 'shared communications decision apply accepts provenance fields', 'shared comms route present')
  add(String(moduleSource).includes('backfilled_cannot_be_strong') && String(moduleSource).includes('direct_ref_required'), 'module rejects false-direct and false-strong provenance', 'dogfood blockers present')
  add(String(scriptSource).includes('backfillDecision005Rows') && String(scriptSource).includes('--close-card'), 'process check owns DB backfill and close-card proof', 'script applies model under write guard')
  add(packageJson.scripts?.['process:decision-005-check'] === `node --env-file-if-exists=.env ${DECISION_005_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:decision-005-check'] || 'missing')
  add(String(registrySource).includes(DECISION_005_CLOSEOUT_KEY), 'closeout registry exposes DECISION-005', DECISION_005_CLOSEOUT_KEY)
  add(snapshot.status === 'healthy' && snapshot.summary?.lockedBlockedCount === 0, 'live provenance snapshot has no blocked locked decisions', JSON.stringify(snapshot.summary || {}))
  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    checks,
    failed,
    summary: {
      checkCount: checks.length,
      failedCount: failed.length,
      ...snapshot.summary,
    },
  }
}

export function renderDecision005Closeout({
  evaluation = {},
  snapshot = {},
  dogfood = {},
  generatedAt = new Date().toISOString(),
} = {}) {
  return `# DECISION-005 Closeout - Decision Provenance And Participant Model

Generated: ${generatedAt}
Closeout: ${DECISION_005_CLOSEOUT_KEY}

## What Changed

- Added explicit decision provenance fields for direct, route-derived, backfilled, and unknown provenance.
- Added direct meeting/session/thread/artifact refs, source/route/artifact ref arrays, participant roles, and provenance notes.
- Wired the decision store so locked decisions must have an honest provenance posture.
- Backfilled existing locked seed decisions as \`backfilled / weak_backfill\` instead of pretending they are direct meeting evidence.
- Kept decision outputs proposed/human-controlled; no decision was auto-applied.

## Proof Summary

- Decisions reviewed: ${snapshot.summary?.decisionCount ?? 0}
- Locked decisions: ${snapshot.summary?.lockedCount ?? 0}
- Direct provenance rows: ${snapshot.summary?.directCount ?? 0}
- Route-derived rows: ${snapshot.summary?.routeDerivedCount ?? 0}
- Backfilled rows: ${snapshot.summary?.backfilledCount ?? 0}
- Blocked locked rows: ${snapshot.summary?.lockedBlockedCount ?? 0}
- Dogfood: ${dogfood.ok ? 'pass' : 'risk'}
- Implementation: ${evaluation.ok ? 'healthy' : 'risk'}

## Where It Lives

- \`lib/decision-005-provenance-model.js\`
- \`lib/foundation-db-schema-seed-store.js\`
- \`lib/foundation-decision-store.js\`
- \`lib/foundation-write-routes.js\`
- \`lib/strategy-shared-comms-routes.js\`
- \`scripts/process-decision-005-check.mjs\`
- \`docs/process/decision-005-plan.md\`
- \`docs/process/approvals/DECISION-005.json\`

## Proof Commands

${DECISION_005_PROOF_COMMANDS.map(command => `- \`${command}\``).join('\n')}

## Known Limits

- Backfilled historical seed decisions remain honest weak backfills until exact session/thread links are found.
- This does not create policy/SOP artifacts; DECISION-006 owns that layer.
- This does not run new private extraction or browser-auth work to discover missing historical links.
- This does not lock/apply proposed decisions without explicit human approval.

## Next

Continue ${DECISION_005_NEXT_CARD_ID}. Decision provenance now distinguishes direct, route-derived, and backfilled truth; the next card can safely handle the current sprint surface update work without treating historical backfills as direct evidence.
`
}

export function stableDecision005RunId(seed = '') {
  return crypto.createHash('sha1').update(String(seed || DECISION_005_CARD_ID)).digest('hex').slice(0, 12)
}
