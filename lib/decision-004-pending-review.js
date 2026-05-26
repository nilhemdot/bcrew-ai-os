import crypto from 'node:crypto'

export const DECISION_004_CARD_ID = 'DECISION-004'
export const DECISION_004_CLOSEOUT_KEY = 'decision-004-pending-decision-review-v1'
export const DECISION_004_PLAN_PATH = 'docs/process/decision-004-plan.md'
export const DECISION_004_APPROVAL_PATH = 'docs/process/approvals/DECISION-004.json'
export const DECISION_004_SCRIPT_PATH = 'scripts/process-decision-004-check.mjs'
export const DECISION_004_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-26-hot-doc-refresh/2026-05-20-decision-004-pending-decision-review-closeout.md'
export const DECISION_004_NEXT_CARD_ID = 'DECISION-005'
export const DECISION_004_SPRINT_ID = 'FOUNDATION-OPERATING-TRUTH-AND-DATA-HEALTH-2026-05-20'

export const DECISION_004_PROOF_COMMANDS = [
  'node --check lib/decision-004-pending-review.js scripts/process-decision-004-check.mjs lib/foundation-decision-store.js',
  'npm run process:decision-004-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${DECISION_004_CARD_ID} --planApprovalRef=${DECISION_004_APPROVAL_PATH} --closeoutKey=${DECISION_004_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${DECISION_004_CARD_ID} --closeoutKey=${DECISION_004_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${DECISION_004_CARD_ID} --planApprovalRef=${DECISION_004_APPROVAL_PATH} --closeoutKey=${DECISION_004_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const DECISION_004_CHANGED_FILES = [
  'lib/decision-004-pending-review.js',
  DECISION_004_SCRIPT_PATH,
  DECISION_004_PLAN_PATH,
  DECISION_004_APPROVAL_PATH,
  DECISION_004_CLOSEOUT_PATH,
  'lib/foundation-decision-store.js',
  'scripts/process-foundation-lessons-learned-loop-check.mjs',
  'lib/foundation-build-closeout-intelligence-records.js',
  'package.json',
]

export const DECISION_004_NOT_NEXT_BOUNDARIES = [
  'Do not auto-lock, auto-apply, or auto-reject decisions.',
  'Do not send messages, emails, public posts, or external writes.',
  'Do not mutate Drive permissions, credentials, provider config, or source systems.',
  'Do not run browser-auth, paid/provider access, or broad private extraction.',
  'Do not build DECISION-005 provenance deepening inside this card.',
  'Do not turn governance/action-route signals into locked doctrine without human confirmation and source evidence.',
]

const REQUIRED_LOCK_FIELDS = [
  ['sourceRef', 'source reference'],
  ['decisionOwner', 'decision owner'],
  ['confirmedBy', 'confirmed by'],
  ['contextRef', 'context reference'],
  ['evidenceNotes', 'evidence notes'],
]

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

function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function valueFor(item = {}, camelKey = '') {
  const snakeKey = camelKey.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
  return item[camelKey] ?? item[snakeKey]
}

function normalizeDecision(row = {}) {
  return {
    id: normalizeText(valueFor(row, 'id')),
    category: normalizeText(valueFor(row, 'category')),
    title: normalizeText(valueFor(row, 'title')),
    status: normalizeText(valueFor(row, 'status')),
    summary: normalizeText(valueFor(row, 'summary')),
    rationale: normalizeText(valueFor(row, 'rationale')),
    sourceRef: normalizeText(valueFor(row, 'sourceRef')),
    decisionOwner: normalizeText(valueFor(row, 'decisionOwner')),
    confirmedBy: normalizeText(valueFor(row, 'confirmedBy')),
    participantNames: normalizeArray(valueFor(row, 'participantNames')),
    contextRef: normalizeText(valueFor(row, 'contextRef')),
    evidenceNotes: normalizeText(valueFor(row, 'evidenceNotes')),
    supersedesIds: normalizeArray(valueFor(row, 'supersedesIds')),
    createdAt: valueFor(row, 'createdAt') || null,
    updatedAt: valueFor(row, 'updatedAt') || null,
  }
}

function normalizeRoute(row = {}) {
  const payload = normalizeObject(row.proposed_payload || row.proposedPayload)
  return {
    routeId: normalizeText(row.route_id || row.routeId),
    routeType: normalizeText(row.route_type || row.routeType),
    destinationTable: normalizeText(row.destination_table || row.destinationTable),
    approvalStatus: normalizeText(row.approval_status || row.approvalStatus),
    owner: normalizeText(row.owner),
    sourceIds: normalizeArray(row.source_ids || row.sourceIds),
    factRefs: normalizeArray(row.fact_refs || row.factRefs),
    evidenceRefs: normalizeArray(row.evidence_refs || row.evidenceRefs),
    evidenceChunkRefs: normalizeArray(row.evidence_chunk_refs || row.evidenceChunkRefs),
    atomRefs: normalizeArray(row.atom_refs || row.atomRefs),
    proposedPayload: payload,
  }
}

function mergeDecisionForReview(existingDecision = {}, input = {}) {
  const existing = normalizeDecision(existingDecision)
  const update = normalizeObject(input)
  const participantNames = Object.prototype.hasOwnProperty.call(update, 'participantNames')
    ? normalizeArray(update.participantNames)
    : existing.participantNames
  return {
    ...existing,
    category: normalizeText(update.category ?? existing.category),
    status: normalizeText(update.status ?? existing.status),
    rationale: normalizeText(update.rationale ?? existing.rationale),
    sourceRef: normalizeText(update.sourceRef ?? existing.sourceRef),
    decisionOwner: normalizeText(update.decisionOwner ?? existing.decisionOwner),
    confirmedBy: normalizeText(update.confirmedBy ?? existing.confirmedBy),
    participantNames,
    contextRef: normalizeText(update.contextRef ?? existing.contextRef),
    evidenceNotes: normalizeText(update.evidenceNotes ?? existing.evidenceNotes),
    supersedesIds: Object.prototype.hasOwnProperty.call(update, 'supersedesIds')
      ? normalizeArray(update.supersedesIds)
      : existing.supersedesIds,
  }
}

export function buildDecision004LockReadiness(decision = {}, input = {}) {
  const merged = mergeDecisionForReview(decision, input)
  const blockers = []
  for (const [key, label] of REQUIRED_LOCK_FIELDS) {
    if (!normalizeText(merged[key])) blockers.push(`${key}_required:${label}`)
  }
  if (!merged.participantNames.length) blockers.push('participantNames_required:participants')
  if (normalizeText(merged.status) === 'superseded') blockers.push('superseded_decision_cannot_lock')
  if (!['proposed', 'locked'].includes(normalizeText(decision.status || merged.status))) {
    blockers.push(`unsupported_existing_status:${normalizeText(decision.status || merged.status) || 'missing'}`)
  }
  return {
    ok: blockers.length === 0,
    status: blockers.length ? 'blocked' : 'ready_to_lock',
    decision: merged,
    blockers,
    requiredFields: REQUIRED_LOCK_FIELDS.map(([, label]) => label).concat(['participants']),
  }
}

export function validateDecisionLockInput({
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
  const readiness = buildDecision004LockReadiness(existingDecision, input)
  return {
    ok: readiness.ok,
    status: readiness.status,
    blockers: readiness.blockers,
    actor: normalizeText(actor),
    decisionId: normalizeText(existingDecision.id),
    requiredFields: readiness.requiredFields,
  }
}

export function buildDecision004PendingReviewSnapshot({
  decisions = [],
  routes = [],
  generatedAt = new Date().toISOString(),
} = {}) {
  const decisionRows = (Array.isArray(decisions) ? decisions : []).map(normalizeDecision)
  const routeRows = (Array.isArray(routes) ? routes : []).map(normalizeRoute)
  const proposedDecisions = decisionRows
    .filter(decision => decision.status === 'proposed')
    .map(decision => {
      const readiness = buildDecision004LockReadiness(decision, { status: 'locked' })
      return {
        decisionId: decision.id,
        title: decision.title,
        category: decision.category,
        status: decision.status,
        lockStatus: readiness.status,
        blockers: readiness.blockers,
        sourceRef: decision.sourceRef,
        decisionOwner: decision.decisionOwner,
        confirmedBy: decision.confirmedBy,
        participantCount: decision.participantNames.length,
        contextRef: decision.contextRef,
      }
    })
  const decisionRoutes = routeRows
    .filter(route => route.destinationTable === 'decisions' || route.routeType === 'decision')
    .map(route => ({
      routeId: route.routeId,
      routeType: route.routeType,
      approvalStatus: route.approvalStatus,
      owner: route.owner || 'needs-owner-decision',
      sourceRefCount: route.sourceIds.length + route.factRefs.length + route.evidenceRefs.length + route.evidenceChunkRefs.length + route.atomRefs.length,
      title: normalizeText(route.proposedPayload.title),
      summary: normalizeText(route.proposedPayload.summary),
      reviewState: route.approvalStatus === 'applied' ? 'proposed_decision_created' : 'needs_human_review',
    }))
  return {
    status: proposedDecisions.length || decisionRoutes.length ? 'review_required' : 'clear',
    generatedAt,
    summary: {
      proposedDecisionCount: proposedDecisions.length,
      lockReadyCount: proposedDecisions.filter(item => item.lockStatus === 'ready_to_lock').length,
      lockBlockedCount: proposedDecisions.filter(item => item.lockStatus === 'blocked').length,
      decisionRouteCount: decisionRoutes.length,
      sourceBackedRouteCount: decisionRoutes.filter(item => item.sourceRefCount > 0).length,
    },
    proposedDecisions,
    decisionRoutes,
    guardrails: {
      proposedOnlyUntilHumanLock: true,
      lockRequiresSourceAndProvenance: true,
      externalWritesBlocked: true,
      noAutoApply: true,
    },
  }
}

export function buildDecision004DogfoodProof() {
  const weakDecision = {
    id: 'DEC-DOGFOOD-WEAK',
    status: 'proposed',
    title: 'Weak proposed decision',
    summary: 'A decision-like item without source proof.',
    category: 'system',
  }
  const strongInput = {
    status: 'locked',
    sourceRef: 'SRC-MEETINGS-001:meeting:dogfood',
    decisionOwner: 'Steve',
    confirmedBy: 'Steve',
    participantNames: ['Steve', 'Codex'],
    contextRef: 'meeting:dogfood',
    evidenceNotes: 'Confirmed from source-backed meeting notes.',
  }
  const weakLock = validateDecisionLockInput({ existingDecision: weakDecision, input: { status: 'locked' }, actor: 'dogfood' })
  const strongLock = validateDecisionLockInput({ existingDecision: weakDecision, input: strongInput, actor: 'dogfood' })
  const nonLockUpdate = validateDecisionLockInput({ existingDecision: weakDecision, input: { status: 'proposed' }, actor: 'dogfood' })
  const supersededLock = validateDecisionLockInput({
    existingDecision: { ...weakDecision, status: 'superseded', sourceRef: 'SRC', decisionOwner: 'Steve', confirmedBy: 'Steve', participantNames: ['Steve'], contextRef: 'ctx', evidenceNotes: 'proof' },
    input: { status: 'locked' },
    actor: 'dogfood',
  })
  const snapshot = buildDecision004PendingReviewSnapshot({
    decisions: [
      weakDecision,
      { ...weakDecision, id: 'DEC-DOGFOOD-READY', ...strongInput, status: 'proposed' },
    ],
    routes: [{
      route_id: 'action-route:decision-dogfood',
      route_type: 'decision',
      destination_table: 'decisions',
      approval_status: 'pending',
      owner: 'Foundation Decisions',
      source_ids: ['SRC-MEETINGS-001'],
      fact_refs: ['fact:dogfood'],
      proposed_payload: { title: 'Dogfood decision route', summary: 'Route-backed decision signal.' },
    }],
  })
  return {
    ok: weakLock.ok === false &&
      weakLock.blockers.includes('sourceRef_required:source reference') &&
      strongLock.ok === true &&
      nonLockUpdate.ok === true &&
      supersededLock.ok === false &&
      snapshot.summary.proposedDecisionCount === 2 &&
      snapshot.summary.lockReadyCount === 1 &&
      snapshot.summary.lockBlockedCount === 1 &&
      snapshot.summary.decisionRouteCount === 1 &&
      snapshot.guardrails.noAutoApply === true,
    weakLock,
    strongLock,
    nonLockUpdate,
    supersededLock,
    snapshotSummary: snapshot.summary,
    invariant: 'Pending decisions can be reviewed without becoming locked; lock-in requires source proof, owner, confirmer, participants, context, and evidence notes.',
  }
}

export function evaluateDecision004Implementation({
  moduleSource = '',
  decisionStoreSource = '',
  scriptSource = '',
  registrySource = '',
  packageJson = {},
  snapshot = {},
} = {}) {
  const checks = [
    {
      check: 'module exports lock validation',
      ok: moduleSource.includes('validateDecisionLockInput') && moduleSource.includes('buildDecision004PendingReviewSnapshot'),
    },
    {
      check: 'decision store blocks weak lock-ins',
      ok: decisionStoreSource.includes('validateDecisionLockInput') && decisionStoreSource.includes('Decision lock-in blocked'),
    },
    {
      check: 'focused proof uses real dogfood',
      ok: scriptSource.includes('buildDecision004DogfoodProof') && scriptSource.includes('buildDecision004PendingReviewSnapshot'),
    },
    {
      check: 'closeout registry includes DECISION-004',
      ok: registrySource.includes(DECISION_004_CLOSEOUT_KEY) && registrySource.includes(DECISION_004_CARD_ID),
    },
    {
      check: 'package script registered',
      ok: packageJson.scripts?.['process:decision-004-check'] === `node --env-file-if-exists=.env ${DECISION_004_SCRIPT_PATH}`,
    },
    {
      check: 'live snapshot has guardrails',
      ok: snapshot.guardrails?.lockRequiresSourceAndProvenance === true && snapshot.guardrails?.noAutoApply === true,
    },
  ]
  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    checks,
    failed,
    summary: {
      checks: checks.length,
      failed: failed.length,
      proposedDecisionCount: snapshot.summary?.proposedDecisionCount || 0,
      decisionRouteCount: snapshot.summary?.decisionRouteCount || 0,
    },
  }
}

export function renderDecision004Closeout({
  evaluation,
  snapshot,
  dogfood,
  generatedAt = new Date().toISOString(),
} = {}) {
  return `# DECISION-004 Closeout - Pending Decision Review

Generated: ${generatedAt}
Closeout key: ${DECISION_004_CLOSEOUT_KEY}

## What Shipped

- Added a pending decision review snapshot for proposed decisions and decision-destination Action Router routes.
- Added backend lock-in validation so decisions cannot be marked locked without source reference, owner, confirmer, participants, context, and evidence notes.
- Kept the workflow internal and human-controlled: no auto-lock, no auto-apply, no external writes, no source expansion.
- Repaired the read-only lessons-loop scheduled proof so its own failed run can prove recovery when it is the only repeated-failure blocker, instead of deadlocking the health gate.
- Advanced Current Sprint to ${DECISION_004_NEXT_CARD_ID} only after focused proof and full Foundation gates.

## Proof

- Focused DECISION-004 proof status: ${evaluation?.ok ? 'healthy' : 'risk'}
- Proposed decisions reviewed: ${snapshot?.summary?.proposedDecisionCount || 0}
- Lock-ready decisions: ${snapshot?.summary?.lockReadyCount || 0}
- Blocked lock-ins: ${snapshot?.summary?.lockBlockedCount || 0}
- Decision routes reviewed: ${snapshot?.summary?.decisionRouteCount || 0}
- Dogfood: ${dogfood?.ok ? 'pass' : 'fail'}

## Where It Lives

- \`lib/decision-004-pending-review.js\`
- \`lib/foundation-decision-store.js\`
- \`scripts/process-foundation-lessons-learned-loop-check.mjs\`
- \`scripts/process-decision-004-check.mjs\`
- \`docs/process/decision-004-plan.md\`
- \`docs/process/approvals/DECISION-004.json\`
- Foundation > Decisions / existing decision update route

## Known Limits

- This does not approve, reject, or lock a real business decision by itself.
- This does not build DECISION-005's deeper meeting/thread/session provenance model.
- This does not create external tasks, send messages, mutate Drive permissions, or run extraction.

## Review Next

Continue ${DECISION_004_NEXT_CARD_ID}. Lock-in now fails closed without basic provenance; the next slice can deepen direct-versus-backfilled provenance and meeting/session/thread linkage.
`
}

export function stableDecision004RunId(seed = '') {
  return crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 12)
}
