import { randomUUID } from 'node:crypto'
import { buildLlmCredentialRegistryPolicySnapshot } from './llm-credential-registry.js'
import { buildLlmHubCapacitySnapshot } from './llm-hub-capacity.js'

export const FOUNDATION_LLM_RUNTIME_STORE_SPLIT_CARD_ID = 'FOUNDATION-DB-MONOLITH-SPLIT-010'
export const FOUNDATION_LLM_RUNTIME_STORE_SPLIT_SPRINT_ID = 'foundation-db-llm-runtime-store-split-2026-05-16'
export const FOUNDATION_LLM_RUNTIME_STORE_SPLIT_CLOSEOUT_KEY = 'foundation-llm-runtime-store-split-v1'
export const FOUNDATION_LLM_RUNTIME_STORE_SPLIT_PLAN_PATH = 'docs/process/foundation-db-llm-runtime-store-split-010-plan.md'
export const FOUNDATION_LLM_RUNTIME_STORE_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-010.json'
export const FOUNDATION_LLM_RUNTIME_STORE_SPLIT_SCRIPT_PATH = 'scripts/process-foundation-llm-runtime-store-split-check.mjs'
export const FOUNDATION_LLM_RUNTIME_STORE_PRE_SPLIT_LINES = 9409

function countTextLines(source = '') {
  const text = String(source || '')
  if (!text) return 0
  const newlineCount = (text.match(/\n/g) || []).length
  return newlineCount + (text.endsWith('\n') ? 0 : 1)
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

export function evaluateFoundationLlmRuntimeStoreSplit({
  foundationDbSource = '',
  moduleSource = '',
  scriptSource = '',
  planSource = '',
  afterLines = countTextLines(foundationDbSource),
  beforeLines = FOUNDATION_LLM_RUNTIME_STORE_PRE_SPLIT_LINES,
} = {}) {
  const checks = []
  const normalizedPlanSource = String(planSource || '').toLowerCase()
  addCheck(
    checks,
    moduleSource.includes('export function createFoundationLlmRuntimeStore') &&
      moduleSource.includes('async function upsertLlmCredential') &&
      moduleSource.includes('async function upsertLlmRoute') &&
      moduleSource.includes('async function recordLlmRouteProbe') &&
      moduleSource.includes('async function createLlmCall') &&
      moduleSource.includes('async function finishLlmCall') &&
      moduleSource.includes('async function getLlmRuntimeSnapshot') &&
      moduleSource.includes('async function getStaleLlmCalls') &&
      moduleSource.includes('async function markStaleLlmCalls'),
    'LLM runtime store module owns the extracted public behavior',
    'factory and LLM runtime functions present',
  )
  addCheck(
    checks,
    moduleSource.includes('mapLlmCredentialRow') &&
      moduleSource.includes('mapLlmRouteRow') &&
      moduleSource.includes('mapLlmRouteProbeRow') &&
      moduleSource.includes('mapLlmCallRow'),
    'LLM runtime store module owns row mappers',
    'credential/route/probe/call mappers present',
  )
  addCheck(
    checks,
    foundationDbSource.includes("./foundation-llm-runtime-store.js") &&
      foundationDbSource.includes('createFoundationLlmRuntimeStore({') &&
      foundationDbSource.includes('foundationLlmRuntimeStore'),
    'foundation-db wires through the dedicated LLM runtime store module',
    'store import and instance present',
  )
  addCheck(
    checks,
    foundationDbSource.includes('export const upsertLlmCredential = foundationLlmRuntimeStore.upsertLlmCredential') &&
      foundationDbSource.includes('export const getLlmRuntimeSnapshot = foundationLlmRuntimeStore.getLlmRuntimeSnapshot') &&
      foundationDbSource.includes('export const markStaleLlmCalls = foundationLlmRuntimeStore.markStaleLlmCalls'),
    'foundation-db keeps stable public LLM runtime delegates',
    'delegate exports present',
  )
  addCheck(
    checks,
    !/function\s+mapLlmCredentialRow\s*\(/.test(foundationDbSource) &&
      !/function\s+mapLlmRouteRow\s*\(/.test(foundationDbSource) &&
      !/function\s+mapLlmRouteProbeRow\s*\(/.test(foundationDbSource) &&
      !/function\s+mapLlmCallRow\s*\(/.test(foundationDbSource) &&
      !/export\s+async\s+function\s+upsertLlmCredential\s*\(/.test(foundationDbSource) &&
      !/export\s+async\s+function\s+getLlmRuntimeSnapshot\s*\(/.test(foundationDbSource) &&
      !/export\s+async\s+function\s+markStaleLlmCalls\s*\(/.test(foundationDbSource),
    'foundation-db no longer defines extracted LLM runtime behavior inline',
    'inline mapper/function definitions absent',
  )
  addCheck(
    checks,
    scriptSource.includes('dogfood rejects old inline LLM runtime ownership') &&
      scriptSource.includes('buildSyntheticFoundationLlmRuntimeStoreBehaviorProof') &&
      scriptSource.includes('getPlanCriticRunsByCardIds'),
    'focused proof has dogfood and Plan Critic checks',
    FOUNDATION_LLM_RUNTIME_STORE_SPLIT_SCRIPT_PATH,
  )
  addCheck(
    checks,
    normalizedPlanSource.includes('split/extraction plan') &&
      normalizedPlanSource.includes('live llm calls') &&
      (normalizedPlanSource.includes('stable public exports') || normalizedPlanSource.includes('existing public exports')),
    'plan documents split/extraction posture and no-live-LLM boundary',
    FOUNDATION_LLM_RUNTIME_STORE_SPLIT_PLAN_PATH,
  )
  addCheck(
    checks,
    beforeLines > 0 && afterLines > 0 && afterLines < beforeLines,
    'foundation-db.js line count decreases after the split',
    String(beforeLines) + '->' + String(afterLines),
  )

  return {
    ok: checks.every(check => check.ok),
    checks,
    failed: checks.filter(check => !check.ok),
    beforeLines,
    afterLines,
  }
}

function makeFakePool() {
  const rows = {
    credential: {
      credential_key: 'openai-api-primary',
      provider: 'openai',
      auth_path: 'api_key',
      display_name: 'OpenAI API Primary',
      account_label: 'admin',
      hub_key: 'foundation',
      workload_lane: 'synthesis',
      secret_ref: 'OPENAI_API_KEY',
      status: 'available',
      policy_classification: 'approved',
      allowed_workloads: ['foundation'],
      notes: 'synthetic',
      quota_state: { remaining: 'unknown' },
      metadata: { synthetic: true },
      updated_by: 'synthetic-proof',
      created_at: '2026-05-16T04:00:00.000Z',
      updated_at: '2026-05-16T04:00:00.000Z',
    },
    route: {
      route_key: 'foundation-synthesis-openai',
      workload: 'foundation-synthesis',
      hub_key: 'foundation',
      priority: 1,
      provider: 'openai',
      model: 'gpt-5.2',
      auth_path: 'api_key',
      credential_key: 'openai-api-primary',
      fallback_route_key: null,
      status: 'available',
      policy_classification: 'approved',
      cost_cap_usd: 1.25,
      risk_class: 'low',
      notes: 'synthetic route',
      metadata: { synthetic: true },
      updated_by: 'synthetic-proof',
      created_at: '2026-05-16T04:00:00.000Z',
      updated_at: '2026-05-16T04:00:00.000Z',
    },
    probe: {
      probe_id: 'probe-1',
      credential_key: 'openai-api-primary',
      provider: 'openai',
      auth_path: 'api_key',
      probe_type: 'dry_run',
      status: 'succeeded',
      detail: 'synthetic probe',
      capability: { text: true },
      metadata: { synthetic: true },
      probed_at: '2026-05-16T04:01:00.000Z',
      probed_by: 'synthetic-proof',
    },
    call: {
      call_id: 'llm-call-synthetic-1',
      workload: 'foundation-synthesis',
      hub_key: 'foundation',
      provider: 'openai',
      model: 'gpt-5.2',
      auth_path: 'api_key',
      credential_key: 'openai-api-primary',
      route_key: 'foundation-synthesis-openai',
      status: 'started',
      estimated_input_tokens: 100,
      estimated_output_tokens: 20,
      estimated_cost_usd: 0.01,
      error_message: null,
      metadata: { timeoutMs: 1000, synthetic: true },
      started_at: '2026-05-16T04:02:00.000Z',
      finished_at: null,
      created_at: '2026-05-16T04:02:00.000Z',
      updated_at: '2026-05-16T04:02:00.000Z',
    },
  }
  const calls = []
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql: String(sql), params })
      if (/FROM llm_credentials/.test(sql)) return { rows: [rows.credential] }
      if (/FROM llm_routes/.test(sql)) return { rows: [rows.route] }
      if (/FROM llm_route_probes/.test(sql)) return { rows: [rows.probe] }
      if (/FROM llm_calls/.test(sql) && /ORDER BY created_at DESC/.test(sql)) return { rows: [rows.call] }
      if (/INSERT INTO llm_calls/.test(sql)) return { rows: [{ ...rows.call, call_id: params[0], status: params[8] || 'started' }] }
      if (/UPDATE llm_calls/.test(sql) && /WHERE call_id =/.test(sql) && !/WITH stale_calls/.test(sql)) return { rows: [{ ...rows.call, call_id: params[0], status: params[1] || 'succeeded', finished_at: '2026-05-16T04:03:00.000Z' }] }
      if (/WITH active_calls/.test(sql)) return { rows: [{ ...rows.call, timeout_seconds: 1, grace_seconds: 0, age_seconds: 500 }] }
      if (/WITH stale_calls/.test(sql)) return { rows: [{ ...rows.call, status: 'failed', error_message: 'Marked failed by stale LLM call reaper.' }] }
      if (/INSERT INTO change_events/.test(sql)) return { rows: [] }
      if (/INSERT INTO llm_credentials/.test(sql)) return { rows: [rows.credential] }
      if (/INSERT INTO llm_routes/.test(sql)) return { rows: [rows.route] }
      if (/INSERT INTO llm_route_probes/.test(sql)) return { rows: [rows.probe] }
      return { rows: [] }
    },
  }
}

export async function buildSyntheticFoundationLlmRuntimeStoreBehaviorProof() {
  const fakePool = makeFakePool()
  const fakeClient = { query: (...args) => fakePool.query(...args) }
  const store = createFoundationLlmRuntimeStore({
    pool: fakePool,
    withFoundationTransaction: async work => work(fakeClient),
    insertChangeEvent: async () => null,
  })

  const snapshot = await store.getLlmRuntimeSnapshot({ limit: 5 })
  const created = await store.createLlmCall({
    callId: 'llm-call-synthetic-2',
    workload: 'foundation-synthesis',
    provider: 'openai',
    model: 'gpt-5.2',
    authPath: 'api_key',
    status: 'started',
  }, 'synthetic-proof')
  const finished = await store.finishLlmCall('llm-call-synthetic-2', { status: 'succeeded' })
  const stale = await store.getStaleLlmCalls({ olderThanSeconds: 1, graceSeconds: 0, limit: 5 })
  const reaped = await store.markStaleLlmCalls({ olderThanSeconds: 1, graceSeconds: 0, limit: 5 }, 'synthetic-proof')

  const checks = []
  addCheck(checks, snapshot.summary.credentialCount === 1 && snapshot.summary.routeCount === 1, 'runtime snapshot counts credentials and routes', JSON.stringify(snapshot.summary))
  addCheck(checks, snapshot.credentials[0]?.credentialKey === 'openai-api-primary', 'credential row mapping is preserved', JSON.stringify(snapshot.credentials[0]))
  addCheck(checks, snapshot.routes[0]?.routeKey === 'foundation-synthesis-openai', 'route row mapping is preserved', JSON.stringify(snapshot.routes[0]))
  addCheck(checks, snapshot.recentProbes[0]?.probeId === 'probe-1', 'probe row mapping is preserved', JSON.stringify(snapshot.recentProbes[0]))
  addCheck(checks, created.callId === 'llm-call-synthetic-2' && created.status === 'started', 'createLlmCall mapping is preserved', JSON.stringify(created))
  addCheck(checks, finished.callId === 'llm-call-synthetic-2' && finished.status === 'succeeded', 'finishLlmCall mapping is preserved', JSON.stringify(finished))
  addCheck(checks, stale[0]?.callId === 'llm-call-synthetic-1' && stale[0]?.timeoutSeconds === 1, 'stale LLM call read shape is preserved', JSON.stringify(stale[0]))
  addCheck(checks, reaped[0]?.status === 'failed' && /stale LLM call reaper/.test(reaped[0]?.errorMessage || ''), 'stale LLM call reaper mapping is preserved', JSON.stringify(reaped[0]))

  return {
    ok: checks.every(check => check.ok),
    checks,
    failed: checks.filter(check => !check.ok),
    queryCount: fakePool.calls.length,
  }
}

export async function buildFoundationLlmRuntimeStoreSplitDogfoodProof(input = {}) {
  const healthy = evaluateFoundationLlmRuntimeStoreSplit(input)
  const oldInline = evaluateFoundationLlmRuntimeStoreSplit({
    foundationDbSource: 'function mapLlmCredentialRow(row) {} export async function upsertLlmCredential() {} export async function getLlmRuntimeSnapshot() {} export async function markStaleLlmCalls() {}',
    moduleSource: '',
    scriptSource: '',
    planSource: '',
    beforeLines: 9409,
    afterLines: 9409,
  })
  const missingDelegate = evaluateFoundationLlmRuntimeStoreSplit({
    foundationDbSource: "import { createFoundationLlmRuntimeStore } from './foundation-llm-runtime-store.js'\nconst foundationLlmRuntimeStore = createFoundationLlmRuntimeStore({})",
    moduleSource: input.moduleSource || '',
    scriptSource: input.scriptSource || '',
    planSource: input.planSource || '',
    beforeLines: 9409,
    afterLines: 8000,
  })
  const weakPlan = evaluateFoundationLlmRuntimeStoreSplit({
    foundationDbSource: input.foundationDbSource || '',
    moduleSource: input.moduleSource || '',
    scriptSource: input.scriptSource || '',
    planSource: 'Move some code quickly.',
    beforeLines: 9409,
    afterLines: 8000,
  })
  const syntheticBehavior = await buildSyntheticFoundationLlmRuntimeStoreBehaviorProof()

  return {
    ok: healthy.ok === true && oldInline.ok === false && missingDelegate.ok === false && weakPlan.ok === false && syntheticBehavior.ok === true,
    healthy,
    rejected: {
      oldInline: oldInline.ok === false,
      missingDelegate: missingDelegate.ok === false,
      weakPlan: weakPlan.ok === false,
    },
    syntheticBehavior,
    invariant: 'The LLM runtime store split accepts delegated ownership and rejects old inline runtime ownership, missing delegates, and weak split plans.',
  }
}

function assertFunction(value, name) {
  if (typeof value !== 'function') throw new Error('LLM runtime store requires ' + name + '.')
}

export function createFoundationLlmRuntimeStore({
  pool,
  withFoundationTransaction,
  insertChangeEvent,
} = {}) {
  if (!pool) throw new Error('LLM runtime store requires a pool.')
  assertFunction(withFoundationTransaction, 'withFoundationTransaction')
  assertFunction(insertChangeEvent, 'insertChangeEvent')


function mapLlmCredentialRow(row) {
  return {
    credentialKey: row.credential_key,
    provider: row.provider,
    authPath: row.auth_path,
    displayName: row.display_name,
    accountLabel: row.account_label || null,
    hubKey: row.hub_key,
    workloadLane: row.workload_lane,
    secretRef: row.secret_ref || null,
    status: row.status,
    policyClassification: row.policy_classification,
    allowedWorkloads: Array.isArray(row.allowed_workloads) ? row.allowed_workloads : [],
    notes: row.notes || '',
    quotaState: row.quota_state || {},
    metadata: row.metadata || {},
    updatedBy: row.updated_by || null,
    createdAt: row.created_at?.toISOString?.() || row.created_at || null,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
  }
}

function mapLlmRouteRow(row) {
  return {
    routeKey: row.route_key,
    workload: row.workload,
    hubKey: row.hub_key,
    priority: Number(row.priority || 1),
    provider: row.provider,
    model: row.model,
    authPath: row.auth_path,
    credentialKey: row.credential_key || null,
    fallbackRouteKey: row.fallback_route_key || null,
    status: row.status,
    policyClassification: row.policy_classification,
    costCapUsd: row.cost_cap_usd == null ? null : Number(row.cost_cap_usd),
    riskClass: row.risk_class,
    notes: row.notes || '',
    metadata: row.metadata || {},
    updatedBy: row.updated_by || null,
    createdAt: row.created_at?.toISOString?.() || row.created_at || null,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
  }
}

function mapLlmRouteProbeRow(row) {
  return {
    probeId: row.probe_id,
    credentialKey: row.credential_key || null,
    provider: row.provider,
    authPath: row.auth_path,
    probeType: row.probe_type,
    status: row.status,
    detail: row.detail || '',
    capability: row.capability || {},
    metadata: row.metadata || {},
    probedAt: row.probed_at?.toISOString?.() || row.probed_at || null,
    probedBy: row.probed_by || null,
  }
}

function mapLlmCallRow(row) {
  return {
    callId: row.call_id,
    workload: row.workload,
    hubKey: row.hub_key,
    provider: row.provider,
    model: row.model,
    authPath: row.auth_path,
    credentialKey: row.credential_key || null,
    routeKey: row.route_key || null,
    status: row.status,
    estimatedInputTokens: row.estimated_input_tokens == null ? null : Number(row.estimated_input_tokens),
    estimatedOutputTokens: row.estimated_output_tokens == null ? null : Number(row.estimated_output_tokens),
    estimatedCostUsd: row.estimated_cost_usd == null ? null : Number(row.estimated_cost_usd),
    errorMessage: row.error_message || null,
    metadata: row.metadata || {},
    startedAt: row.started_at?.toISOString?.() || row.started_at || null,
    finishedAt: row.finished_at?.toISOString?.() || row.finished_at || null,
    createdAt: row.created_at?.toISOString?.() || row.created_at || null,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
  }
}

async function upsertLlmCredential(input, actor = 'system') {
  const credentialKey = String(input?.credentialKey || '').trim()
  if (!credentialKey) throw new Error('credentialKey is required.')

  return withFoundationTransaction(async client => {
    const result = await client.query(
      `
        INSERT INTO llm_credentials (
          credential_key, provider, auth_path, display_name, account_label,
          hub_key, workload_lane, secret_ref, status, policy_classification,
          allowed_workloads, notes, quota_state, metadata, updated_by, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::text[],$12,$13::jsonb,$14::jsonb,$15,NOW())
        ON CONFLICT (credential_key) DO UPDATE SET
          provider = EXCLUDED.provider,
          auth_path = EXCLUDED.auth_path,
          display_name = EXCLUDED.display_name,
          account_label = EXCLUDED.account_label,
          hub_key = EXCLUDED.hub_key,
          workload_lane = EXCLUDED.workload_lane,
          secret_ref = EXCLUDED.secret_ref,
          status = EXCLUDED.status,
          policy_classification = EXCLUDED.policy_classification,
          allowed_workloads = EXCLUDED.allowed_workloads,
          notes = EXCLUDED.notes,
          quota_state = EXCLUDED.quota_state,
          metadata = COALESCE(llm_credentials.metadata, '{}'::jsonb) || EXCLUDED.metadata,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
        RETURNING credential_key, provider, auth_path, display_name, account_label,
                  hub_key, workload_lane, secret_ref, status, policy_classification,
                  allowed_workloads, notes, quota_state, metadata, updated_by,
                  created_at, updated_at
      `,
      [
        credentialKey,
        String(input.provider || '').trim(),
        String(input.authPath || '').trim(),
        String(input.displayName || credentialKey).trim(),
        input.accountLabel == null ? null : String(input.accountLabel).trim(),
        String(input.hubKey || 'foundation').trim(),
        String(input.workloadLane || 'foundation').trim(),
        input.secretRef == null ? null : String(input.secretRef).trim(),
        String(input.status || 'unknown').trim(),
        String(input.policyClassification || 'untested').trim(),
        Array.isArray(input.allowedWorkloads) ? input.allowedWorkloads.map(value => String(value).trim()).filter(Boolean) : [],
        input.notes == null ? null : String(input.notes).trim(),
        JSON.stringify(input.quotaState || {}),
        JSON.stringify(input.metadata || {}),
        actor,
      ]
    )

    await insertChangeEvent(client, {
      eventType: 'llm_credential_updated',
      entityTable: 'llm_credentials',
      entityId: credentialKey,
      actor,
      summary: `${credentialKey} LLM credential updated`,
      metadata: {
        provider: input.provider,
        authPath: input.authPath,
        status: input.status || 'unknown',
        policyClassification: input.policyClassification || 'untested',
      },
    })

    return mapLlmCredentialRow(result.rows[0])
  })
}

async function upsertLlmRoute(input, actor = 'system') {
  const routeKey = String(input?.routeKey || '').trim()
  if (!routeKey) throw new Error('routeKey is required.')

  return withFoundationTransaction(async client => {
    const result = await client.query(
      `
        INSERT INTO llm_routes (
          route_key, workload, hub_key, priority, provider, model, auth_path,
          credential_key, fallback_route_key, status, policy_classification,
          cost_cap_usd, risk_class, notes, metadata, updated_by, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,NOW())
        ON CONFLICT (route_key) DO UPDATE SET
          workload = EXCLUDED.workload,
          hub_key = EXCLUDED.hub_key,
          priority = EXCLUDED.priority,
          provider = EXCLUDED.provider,
          model = EXCLUDED.model,
          auth_path = EXCLUDED.auth_path,
          credential_key = EXCLUDED.credential_key,
          fallback_route_key = EXCLUDED.fallback_route_key,
          status = EXCLUDED.status,
          policy_classification = EXCLUDED.policy_classification,
          cost_cap_usd = EXCLUDED.cost_cap_usd,
          risk_class = EXCLUDED.risk_class,
          notes = EXCLUDED.notes,
          metadata = COALESCE(llm_routes.metadata, '{}'::jsonb) || EXCLUDED.metadata,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
        RETURNING route_key, workload, hub_key, priority, provider, model,
                  auth_path, credential_key, fallback_route_key, status,
                  policy_classification, cost_cap_usd, risk_class, notes,
                  metadata, updated_by, created_at, updated_at
      `,
      [
        routeKey,
        String(input.workload || '').trim(),
        String(input.hubKey || 'foundation').trim(),
        Number(input.priority || 1),
        String(input.provider || '').trim(),
        String(input.model || '').trim(),
        String(input.authPath || '').trim(),
        input.credentialKey == null ? null : String(input.credentialKey).trim(),
        input.fallbackRouteKey == null ? null : String(input.fallbackRouteKey).trim(),
        String(input.status || 'planned').trim(),
        String(input.policyClassification || 'untested').trim(),
        input.costCapUsd == null ? null : Number(input.costCapUsd),
        String(input.riskClass || 'untested').trim(),
        input.notes == null ? null : String(input.notes).trim(),
        JSON.stringify(input.metadata || {}),
        actor,
      ]
    )

    await insertChangeEvent(client, {
      eventType: 'llm_route_updated',
      entityTable: 'llm_routes',
      entityId: routeKey,
      actor,
      summary: `${routeKey} LLM route updated`,
      metadata: {
        workload: input.workload,
        hubKey: input.hubKey || 'foundation',
        provider: input.provider,
        authPath: input.authPath,
        status: input.status || 'planned',
      },
    })

    return mapLlmRouteRow(result.rows[0])
  })
}

async function recordLlmRouteProbe(input, actor = 'system') {
  const probeId = String(input?.probeId || `llm-probe-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${randomUUID().slice(0, 8)}`).trim()

  const result = await pool.query(
    `
      INSERT INTO llm_route_probes (
        probe_id, credential_key, provider, auth_path, probe_type, status,
        detail, capability, metadata, probed_at, probed_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11)
      RETURNING probe_id, credential_key, provider, auth_path, probe_type,
                status, detail, capability, metadata, probed_at, probed_by
    `,
    [
      probeId,
      input.credentialKey == null ? null : String(input.credentialKey).trim(),
      String(input.provider || '').trim(),
      String(input.authPath || '').trim(),
      String(input.probeType || '').trim(),
      String(input.status || 'skipped').trim(),
      String(input.detail || '').trim(),
      JSON.stringify(input.capability || {}),
      JSON.stringify(input.metadata || {}),
      input.probedAt || new Date().toISOString(),
      actor,
    ]
  )

  await pool.query(
    `
      INSERT INTO change_events (
        event_type, entity_table, entity_id, actor, summary, metadata
      )
      VALUES ($1,$2,$3,$4,$5,$6::jsonb)
    `,
    [
      'llm_route_probe_recorded',
      'llm_route_probes',
      probeId,
      actor,
      `${input.provider || 'unknown'} ${input.authPath || 'unknown'} probe ${input.status || 'skipped'}`,
      JSON.stringify({
        provider: input.provider,
        authPath: input.authPath,
        credentialKey: input.credentialKey || null,
        probeType: input.probeType,
        status: input.status || 'skipped',
      }),
    ]
  )

  return mapLlmRouteProbeRow(result.rows[0])
}

async function createLlmCall(input, actor = 'system') {
  const callId = String(input?.callId || `llm-call-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${randomUUID().slice(0, 8)}`).trim()
  const startedAt = input.startedAt || new Date().toISOString()
  const result = await pool.query(
    `
      INSERT INTO llm_calls (
        call_id, workload, hub_key, provider, model, auth_path, credential_key,
        route_key, status, estimated_input_tokens, estimated_output_tokens,
        estimated_cost_usd, error_message, metadata, started_at, finished_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16)
      RETURNING call_id, workload, hub_key, provider, model, auth_path,
                credential_key, route_key, status, estimated_input_tokens,
                estimated_output_tokens, estimated_cost_usd, error_message,
                metadata, started_at, finished_at, created_at, updated_at
    `,
    [
      callId,
      String(input.workload || '').trim(),
      String(input.hubKey || 'foundation').trim(),
      String(input.provider || '').trim(),
      String(input.model || '').trim(),
      String(input.authPath || '').trim(),
      input.credentialKey == null ? null : String(input.credentialKey).trim(),
      input.routeKey == null ? null : String(input.routeKey).trim(),
      String(input.status || 'started').trim(),
      input.estimatedInputTokens == null ? null : Number(input.estimatedInputTokens),
      input.estimatedOutputTokens == null ? null : Number(input.estimatedOutputTokens),
      input.estimatedCostUsd == null ? null : Number(input.estimatedCostUsd),
      input.errorMessage == null ? null : String(input.errorMessage).trim(),
      JSON.stringify({ ...(input.metadata || {}), requestedBy: actor }),
      startedAt,
      input.finishedAt || null,
    ]
  )

  return mapLlmCallRow(result.rows[0])
}

async function finishLlmCall(callId, input = {}) {
  const normalizedCallId = String(callId || '').trim()
  if (!normalizedCallId) throw new Error('callId is required.')

  const result = await pool.query(
    `
      UPDATE llm_calls
      SET status = $2,
          estimated_output_tokens = COALESCE($3, estimated_output_tokens),
          estimated_cost_usd = COALESCE($4, estimated_cost_usd),
          error_message = $5,
          metadata = COALESCE(metadata, '{}'::jsonb) || $6::jsonb,
          finished_at = COALESCE($7, NOW()),
          updated_at = NOW()
      WHERE call_id = $1
      RETURNING call_id, workload, hub_key, provider, model, auth_path,
                credential_key, route_key, status, estimated_input_tokens,
                estimated_output_tokens, estimated_cost_usd, error_message,
                metadata, started_at, finished_at, created_at, updated_at
    `,
    [
      normalizedCallId,
      String(input.status || 'succeeded').trim(),
      input.estimatedOutputTokens == null ? null : Number(input.estimatedOutputTokens),
      input.estimatedCostUsd == null ? null : Number(input.estimatedCostUsd),
      input.errorMessage == null ? null : String(input.errorMessage).trim(),
      JSON.stringify(input.metadata || {}),
      input.finishedAt || null,
    ]
  )

  if (!result.rows[0]) throw new Error(`LLM call not found: ${normalizedCallId}`)
  return mapLlmCallRow(result.rows[0])
}

async function listLlmCalls({
  limit = 200,
  provider = '',
  workload = '',
  status = '',
  routeKey = '',
  hubKey = '',
} = {}) {
  const normalizedLimit = Math.min(500, Math.max(1, Number(limit) || 200))
  const clauses = []
  const params = []

  if (provider) {
    params.push(String(provider).trim())
    clauses.push(`provider = $${params.length}`)
  }
  if (workload) {
    params.push(String(workload).trim())
    clauses.push(`workload = $${params.length}`)
  }
  if (status) {
    params.push(String(status).trim())
    clauses.push(`status = $${params.length}`)
  }
  if (routeKey) {
    params.push(String(routeKey).trim())
    clauses.push(`route_key = $${params.length}`)
  }
  if (hubKey) {
    params.push(String(hubKey).trim())
    clauses.push(`hub_key = $${params.length}`)
  }

  params.push(normalizedLimit)
  const result = await pool.query(
    `
      SELECT call_id, workload, hub_key, provider, model, auth_path,
             credential_key, route_key, status, estimated_input_tokens,
             estimated_output_tokens, estimated_cost_usd, error_message,
             metadata, started_at, finished_at, created_at, updated_at
      FROM llm_calls
      ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
      ORDER BY created_at DESC
      LIMIT $${params.length}
    `,
    params
  )

  return result.rows.map(mapLlmCallRow)
}

async function getLlmRuntimeSnapshot({ limit = 20 } = {}) {
  const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 20))
  const [credentialsResult, routesResult, probesResult, callsResult, routeSelectionProofResult] = await Promise.all([
    pool.query(`
      SELECT credential_key, provider, auth_path, display_name, account_label,
             hub_key, workload_lane, secret_ref, status, policy_classification,
             allowed_workloads, notes, quota_state, metadata, updated_by,
             created_at, updated_at
      FROM llm_credentials
      ORDER BY hub_key ASC, workload_lane ASC, provider ASC, credential_key ASC
    `),
    pool.query(`
      SELECT route_key, workload, hub_key, priority, provider, model,
             auth_path, credential_key, fallback_route_key, status,
             policy_classification, cost_cap_usd, risk_class, notes,
             metadata, updated_by, created_at, updated_at
      FROM llm_routes
      ORDER BY hub_key ASC, workload ASC, priority ASC, route_key ASC
    `),
    pool.query(`
      SELECT probe_id, credential_key, provider, auth_path, probe_type,
             status, detail, capability, metadata, probed_at, probed_by
      FROM llm_route_probes
      ORDER BY probed_at DESC
      LIMIT $1
    `, [normalizedLimit]),
    pool.query(`
      SELECT call_id, workload, hub_key, provider, model, auth_path,
             credential_key, route_key, status, estimated_input_tokens,
             estimated_output_tokens, estimated_cost_usd, error_message,
             metadata, started_at, finished_at, created_at, updated_at
      FROM llm_calls
      ORDER BY created_at DESC
      LIMIT $1
    `, [normalizedLimit]),
    pool.query(`
      SELECT call_id, workload, hub_key, provider, model, auth_path,
             credential_key, route_key, status, estimated_input_tokens,
             estimated_output_tokens, estimated_cost_usd, error_message,
             metadata, started_at, finished_at, created_at, updated_at
      FROM llm_calls
      WHERE metadata->>'proof' = 'llm-auth-audit-route-selection'
      ORDER BY created_at DESC
      LIMIT 1
    `),
  ])

  const credentials = credentialsResult.rows.map(mapLlmCredentialRow)
  const routes = routesResult.rows.map(mapLlmRouteRow)
  const recentProbes = probesResult.rows.map(mapLlmRouteProbeRow)
  const recentCalls = callsResult.rows.map(mapLlmCallRow)
  const routeSelectionProofCall = routeSelectionProofResult.rows[0]
    ? mapLlmCallRow(routeSelectionProofResult.rows[0])
    : null
  if (routeSelectionProofCall && !recentCalls.some(call => call.callId === routeSelectionProofCall.callId)) {
    recentCalls.push(routeSelectionProofCall)
  }
  const capacity = buildLlmHubCapacitySnapshot({
    credentials,
    routes,
    recentProbes,
    recentCalls,
  })
  const credentialRegistry = buildLlmCredentialRegistryPolicySnapshot({
    credentials,
    routes,
    recentProbes,
  })
  const latestProbeByRoute = new Map()
  for (const probe of recentProbes) {
    const key = [
      probe.credentialKey || '',
      probe.provider,
      probe.authPath,
      probe.probeType,
    ].join('|')
    if (!latestProbeByRoute.has(key)) {
      latestProbeByRoute.set(key, probe)
    }
  }
  const latestProbes = [...latestProbeByRoute.values()]

  return {
    generatedAt: new Date().toISOString(),
    credentials,
    routes,
    recentProbes,
    recentCalls,
    capacity,
    credentialRegistry,
    summary: {
      credentialCount: credentials.length,
      availableCredentials: credentials.filter(item => item.status === 'available').length,
      routeCount: routes.length,
      availableRoutes: routes.filter(item => item.status === 'available').length,
      capacityLaneCount: capacity.summary.laneCount,
      capacityGreenLanes: capacity.summary.greenLanes,
      capacityYellowLanes: capacity.summary.yellowLanes,
      capacityRedLanes: capacity.summary.redLanes,
      credentialRegistryCredentialPolicies: credentialRegistry.summary.credentialPoliciesComplete,
      credentialRegistryCredentialPolicyRows: credentialRegistry.summary.credentialPolicyRows,
      credentialRegistryRoutePolicies: credentialRegistry.summary.routePoliciesComplete,
      credentialRegistryRoutePolicyRows: credentialRegistry.summary.routePolicyRows,
      credentialRegistryFindings: credentialRegistry.summary.findings,
      latestProbeFailures: latestProbes.filter(item => item.status === 'failed').length,
      recentProbeFailures: latestProbes.filter(item => item.status === 'failed').length,
      recentCallFailures: recentCalls.filter(item => item.status === 'failed').length,
    },
  }
}

async function getStaleLlmCalls({ olderThanSeconds = 240, graceSeconds = 60, limit = 20 } = {}) {
  const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 20))
  const fallbackTimeoutSeconds = Math.max(1, Number(olderThanSeconds) || 240)
  const normalizedGraceSeconds = Math.max(0, Number(graceSeconds) || 0)
  const result = await pool.query(
    `
      WITH active_calls AS (
        SELECT call_id, workload, hub_key, provider, model, auth_path,
               credential_key, route_key, status, metadata, created_at, finished_at,
               error_message,
               CASE
                 WHEN COALESCE(metadata->>'timeoutMs', '') ~ '^[0-9]+$'
                 THEN CEIL((metadata->>'timeoutMs')::numeric / 1000.0)::integer
                 ELSE $1::integer
               END AS timeout_seconds
        FROM llm_calls
        WHERE status IN ('planned', 'started')
      )
      SELECT call_id, workload, hub_key, provider, model, auth_path,
             credential_key, route_key, status, metadata, created_at, finished_at,
             error_message, timeout_seconds,
             $2::integer AS grace_seconds,
             FLOOR(EXTRACT(EPOCH FROM (NOW() - created_at)))::integer AS age_seconds
      FROM active_calls
      WHERE created_at < NOW() - ((timeout_seconds + $2::integer)::text || ' seconds')::interval
      ORDER BY created_at ASC
      LIMIT $3
    `,
    [fallbackTimeoutSeconds, normalizedGraceSeconds, normalizedLimit]
  )

  return result.rows.map(row => ({
    callId: row.call_id,
    workload: row.workload,
    hubKey: row.hub_key,
    provider: row.provider,
    model: row.model,
    authPath: row.auth_path,
    credentialKey: row.credential_key,
    routeKey: row.route_key,
    status: row.status,
    metadata: row.metadata || {},
    timeoutSeconds: Number(row.timeout_seconds || fallbackTimeoutSeconds),
    graceSeconds: Number(row.grace_seconds || normalizedGraceSeconds),
    ageSeconds: Number(row.age_seconds || 0),
    createdAt: row.created_at,
    finishedAt: row.finished_at,
    errorMessage: row.error_message || '',
  }))
}

async function markStaleLlmCalls({ olderThanSeconds = 240, graceSeconds = 60, limit = 50 } = {}, actor = 'system') {
  const normalizedLimit = Math.min(200, Math.max(1, Number(limit) || 50))
  const fallbackTimeoutSeconds = Math.max(1, Number(olderThanSeconds) || 240)
  const normalizedGraceSeconds = Math.max(0, Number(graceSeconds) || 0)

  const result = await pool.query(
    `
      WITH stale_calls AS (
        SELECT call_id
        FROM (
          SELECT call_id,
                 CASE
                   WHEN COALESCE(metadata->>'timeoutMs', '') ~ '^[0-9]+$'
                   THEN CEIL((metadata->>'timeoutMs')::numeric / 1000.0)::integer
                   ELSE $1::integer
                 END AS timeout_seconds,
                 created_at
          FROM llm_calls
          WHERE status IN ('planned', 'started')
        ) active_calls
        WHERE created_at < NOW() - ((timeout_seconds + $2::integer)::text || ' seconds')::interval
        ORDER BY created_at ASC
        LIMIT $3
      )
      UPDATE llm_calls
      SET status = 'failed',
          error_message = COALESCE(NULLIF(error_message, ''), 'Marked failed by stale LLM call reaper.'),
          metadata = COALESCE(metadata, '{}'::jsonb) || $4::jsonb,
          finished_at = COALESCE(finished_at, NOW()),
          updated_at = NOW()
      WHERE call_id IN (SELECT call_id FROM stale_calls)
      RETURNING call_id, workload, hub_key, provider, model, auth_path,
                credential_key, route_key, status, estimated_input_tokens,
                estimated_output_tokens, estimated_cost_usd, error_message,
                metadata, started_at, finished_at, created_at, updated_at
    `,
    [
      fallbackTimeoutSeconds,
      normalizedGraceSeconds,
      normalizedLimit,
      JSON.stringify({
        staleLlmCallReapedBy: actor,
        staleLlmCallReapedAt: new Date().toISOString(),
        staleLlmCallFallbackTimeoutSeconds: fallbackTimeoutSeconds,
        staleLlmCallGraceSeconds: normalizedGraceSeconds,
      }),
    ]
  )

  return result.rows.map(mapLlmCallRow)
}



  return {
    upsertLlmCredential,
    upsertLlmRoute,
    recordLlmRouteProbe,
    createLlmCall,
    finishLlmCall,
    listLlmCalls,
    getLlmRuntimeSnapshot,
    getStaleLlmCalls,
    markStaleLlmCalls,
  }
}
