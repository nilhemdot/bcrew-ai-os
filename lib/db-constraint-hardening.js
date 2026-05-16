import { createFoundationDecisionStore } from './foundation-decision-store.js'

export const DB_CONSTRAINT_CARD_ID = 'DB-CONSTRAINT-001'
export const DB_CONSTRAINT_SPRINT_ID = 'db-constraint-doc-update-supersedes-2026-05-16'
export const DB_CONSTRAINT_CLOSEOUT_KEY = 'db-constraint-doc-update-supersedes-v1'
export const DB_CONSTRAINT_PLAN_PATH = 'docs/process/db-constraint-001-plan.md'
export const DB_CONSTRAINT_APPROVAL_PATH = 'docs/process/approvals/DB-CONSTRAINT-001.json'
export const DB_CONSTRAINT_SCRIPT_PATH = 'scripts/process-db-constraint-check.mjs'
export const DB_CONSTRAINT_CLOSEOUT_PATH = 'docs/handoffs/2026-05-16-db-constraint-closeout.md'

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function createFakeDecisionApplyClient() {
  const decisions = new Map([
    ['DEC-NEW', { id: 'DEC-NEW', status: 'proposed', supersedes_ids: ['DEC-OLD', 'DEC-OLD', 'DEC-NEW', 'DEC-MISSING'] }],
    ['DEC-OLD', { id: 'DEC-OLD', status: 'locked', supersedes_ids: [] }],
    ['DEC-OTHER', { id: 'DEC-OTHER', status: 'locked', supersedes_ids: [] }],
  ])
  const pending = {
    id: 'DU-NEW',
    decision_id: 'DEC-NEW',
    target_doc_path: 'docs/example.md',
    target_section: 'Current Truth',
    summary: 'Apply replacement decision',
    status: 'approved',
    metadata: { errorDetail: 'old-error', partialWrite: true },
  }
  const events = []
  const queries = []

  const client = {
    async query(sql, params = []) {
      const text = String(sql || '')
      queries.push({ text, params })

      if (/SELECT\s+\*\s+FROM\s+pending_doc_updates/i.test(text)) {
        return { rows: params[0] === pending.id ? [{ ...pending }] : [] }
      }
      if (/UPDATE\s+pending_doc_updates/i.test(text)) {
        pending.status = 'applied'
        pending.reviewed_by = params[1]
        pending.applied_commit = params[2]
        pending.metadata = {}
        return { rows: [{ ...pending }] }
      }
      if (/SELECT\s+id,\s*status,\s*supersedes_ids\s+FROM\s+decisions/i.test(text)) {
        const decision = decisions.get(params[0])
        return { rows: decision ? [{ ...decision }] : [] }
      }
      if (/SELECT\s+id,\s*status\s+FROM\s+decisions/i.test(text) && /ANY\(\$1::text\[\]\)/i.test(text)) {
        const ids = Array.isArray(params[0]) ? params[0] : []
        return {
          rows: ids
            .map(id => decisions.get(id))
            .filter(Boolean)
            .map(decision => ({ id: decision.id, status: decision.status })),
        }
      }
      if (/UPDATE\s+decisions/i.test(text) && /status\s*=\s*CASE\s+WHEN\s+status\s*=\s*'proposed'/i.test(text)) {
        const decision = decisions.get(params[0])
        if (decision && decision.status === 'proposed') decision.status = 'locked'
        return { rows: decision ? [{ ...decision }] : [] }
      }
      if (/UPDATE\s+decisions/i.test(text) && /SET\s+status\s*=\s*'superseded'/i.test(text)) {
        const decision = decisions.get(params[0])
        if (decision) decision.status = 'superseded'
        return { rows: decision ? [{ ...decision }] : [] }
      }

      throw new Error(`Unexpected fake query: ${text.replace(/\s+/g, ' ').trim().slice(0, 180)}`)
    },
  }

  const store = createFoundationDecisionStore({
    pool: { query: client.query },
    withFoundationTransaction: async callback => callback(client),
    insertChangeEvent: async (_client, event) => {
      events.push(event)
      return event
    },
    getNextPrefixedId: async () => 'UNUSED',
  })

  return {
    store,
    decisions,
    pending,
    events,
    queries,
  }
}

export async function buildDbConstraintDogfoodProof() {
  const fake = createFakeDecisionApplyClient()
  const result = await fake.store.markPendingDocUpdateApplied('DU-NEW', 'abc123', 'dogfood')
  const decisionLocked = fake.decisions.get('DEC-NEW')?.status === 'locked'
  const oldSuperseded = fake.decisions.get('DEC-OLD')?.status === 'superseded'
  const unrelatedPreserved = fake.decisions.get('DEC-OTHER')?.status === 'locked'
  const lockedEvent = fake.events.find(event =>
    event.eventType === 'decision_locked' &&
      event.entityId === 'DEC-NEW'
  )
  const supersededEvent = fake.events.find(event =>
    event.eventType === 'decision_superseded' &&
      event.entityId === 'DEC-OLD' &&
      event.metadata?.supersededBy === 'DEC-NEW'
  )
  const docAppliedEvent = fake.events.find(event =>
    event.eventType === 'doc_update_applied' &&
      event.entityId === 'DU-NEW'
  )
  const appliedSupersedesIds = lockedEvent?.metadata?.appliedSupersedesIds || []
  const ok = decisionLocked &&
    oldSuperseded &&
    unrelatedPreserved &&
    Array.isArray(appliedSupersedesIds) &&
    appliedSupersedesIds.includes('DEC-OLD') &&
    lockedEvent?.metadata?.docUpdateId === 'DU-NEW' &&
    supersededEvent &&
    docAppliedEvent?.metadata?.appliedSupersedesIds?.includes('DEC-OLD') &&
    result.status === 'applied'

  return {
    ok,
    invariant: 'Applying a pending doc update linked to a superseding decision must lock the linked decision and supersede the older decision in the same decision-store path.',
    decisionLocked,
    oldSuperseded,
    unrelatedPreserved,
    appliedSupersedesIds,
    eventTypes: fake.events.map(event => event.eventType),
    queryCount: fake.queries.length,
  }
}

export function evaluateDbConstraintSources({
  decisionStoreSource = '',
  coreGovernanceVerifierSource = '',
  proofScriptSource = '',
  packageSource = '',
  currentPlan = '',
  currentState = '',
} = {}) {
  const checks = []
  addCheck(
    checks,
    decisionStoreSource.includes('async function lockDecisionFromDocUpdate') &&
      decisionStoreSource.includes('markSupersededDecisions(client, supersedesIds, decisionId, actor)') &&
      decisionStoreSource.includes('appliedSupersedesIds') &&
      decisionStoreSource.includes('decisionSupersedesIds'),
    'decision store applies doc-update decision supersedes semantics',
    'lockDecisionFromDocUpdate reuses markSupersededDecisions and records applied supersession metadata',
  )
  addCheck(
    checks,
    coreGovernanceVerifierSource.includes('DB_CONSTRAINT_CARD_ID') &&
      coreGovernanceVerifierSource.includes('dbConstraintDogfood') &&
      coreGovernanceVerifierSource.includes('applies doc-update decision supersession semantics'),
    'core-governance verifier covers DB-CONSTRAINT-001',
    'thin verifier coverage lives in the focused governance verifier module',
  )
  addCheck(
    checks,
    proofScriptSource.includes('buildDbConstraintDogfoodProof') &&
      proofScriptSource.includes('validatePlanApprovalFile') &&
      proofScriptSource.includes('getPlanCriticRunsByCardIds') &&
      !/updateBacklogItem\s*\(|createBacklogItem\s*\(|upsertFoundationCurrentSprintOverlay\s*\(|INSERT\s+INTO\s+plan_critic_runs|UPDATE\s+foundation_sprints|UPDATE\s+foundation_sprint_items|DELETE\s+FROM\s+foundation_sprint_items|fs\.writeFile|writeFile\s*\(/i.test(proofScriptSource),
    'focused proof script is read-only',
    'script validates live truth and fake-client dogfood without live DB mutation helpers',
  )
  addCheck(
    checks,
    packageSource.includes('"process:db-constraint-check"') &&
      packageSource.includes(DB_CONSTRAINT_SCRIPT_PATH),
    'package script is registered',
    DB_CONSTRAINT_SCRIPT_PATH,
  )
  addCheck(
    checks,
    currentPlan.includes(DB_CONSTRAINT_CLOSEOUT_KEY) &&
      currentState.includes(DB_CONSTRAINT_CLOSEOUT_KEY),
    'rebuild docs record DB-CONSTRAINT closeout truth',
    DB_CONSTRAINT_CLOSEOUT_KEY,
  )

  return {
    ok: checks.every(check => check.ok),
    checks,
    summary: {
      total: checks.length,
      passed: checks.filter(check => check.ok).length,
      failed: checks.filter(check => !check.ok).length,
    },
  }
}
