import { Pool } from 'pg'

function createFoundationPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

let pool = createFoundationPool()
let poolEndPromise = null

export const FOUNDATION_DB_READ_ONLY_GATE_TABLES = [
  'backlog_items',
  'decisions',
  'parking_lot_items',
  'open_questions',
  'memory_system_status',
  'source_contract_registry',
  'foundation_runtime_status',
  'pending_doc_updates',
  'change_events',
  'foundation_job_runs',
  'foundation_job_controls',
  'shared_communication_artifacts',
  'shared_communication_candidates',
  'source_crawl_targets',
  'source_crawl_target_runs',
  'source_crawl_items',
  'source_crawl_item_attempts',
  'drive_access_preflight_runs',
  'drive_access_preflight_items',
  'meeting_vault_acl_audits',
  'meeting_vault_enforcement_runs',
  'meeting_vault_enforcement_items',
  'meeting_vault_legacy_exceptions',
  'foundation_sprints',
  'foundation_sprint_items',
  'plan_critic_runs',
  'foundation_feedback_items',
  'foundation_acknowledged_states',
  'foundation_incremental_verifier_runs',
  'intelligence_job_runs',
  'intelligence_atoms',
  'business_atoms',
  'atom_hits',
  'intelligence_retrieval_runs',
  'intelligence_synthesis_fact_runs',
  'intelligence_synthesis_runs',
  'intelligence_action_routes',
  'agent_onboarding_feedback_responses',
  'agent_onboarding_feedback_send_attempts',
  'agent_onboarding_feedback_reminder_attempts',
  'agent_onboarding_feedback_response_notifications',
  'sales_listing_assignments',
]

export const foundationPoolHandle = {
  query(...args) {
    return pool.query(...args)
  },
  connect(...args) {
    return pool.connect(...args)
  },
}

export async function withFoundationTransaction(work) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const result = await work(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // Preserve the original failure; rollback errors are secondary.
    }
    throw error
  } finally {
    client.release()
  }
}

export async function insertChangeEvent(client, event) {
  await client.query(
    `
      INSERT INTO change_events (
        event_type, entity_table, entity_id, actor, summary, metadata
      )
      VALUES ($1,$2,$3,$4,$5,$6::jsonb)
    `,
    [
      event.eventType,
      event.entityTable,
      event.entityId,
      event.actor,
      event.summary,
      JSON.stringify(event.metadata || {}),
    ]
  )
}

export async function withFoundationAdvisoryLock(lockKey, work) {
  const normalizedLockKey = String(lockKey || '').trim()
  if (!normalizedLockKey) throw new Error('lockKey is required.')

  const client = await pool.connect()
  let lockHeld = false
  try {
    await client.query('SELECT pg_advisory_lock(hashtext($1))', [normalizedLockKey])
    lockHeld = true
    return await work()
  } finally {
    if (lockHeld) {
      try {
        await client.query('SELECT pg_advisory_unlock(hashtext($1))', [normalizedLockKey])
      } catch {
        // The lock is session scoped and the client is being released.
      }
    }
    client.release()
  }
}

export async function getFoundationDbReadOnlyGateReadiness(options = {}) {
  const requiredTables = Array.isArray(options.requiredTables) && options.requiredTables.length
    ? options.requiredTables.map(value => String(value || '').trim()).filter(Boolean)
    : FOUNDATION_DB_READ_ONLY_GATE_TABLES
  const result = await pool.query(
    `
      SELECT c.relname, c.oid::text AS oid, c.relkind::text AS relkind
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = ANY($1::text[])
        AND c.relkind IN ('r', 'p')
      ORDER BY c.relname ASC
    `,
    [requiredTables]
  )
  const foundByName = new Map(result.rows.map(row => [row.relname, row]))
  const missingTables = requiredTables.filter(name => !foundByName.has(name))

  return {
    ok: missingTables.length === 0,
    mode: 'read-only-metadata-check',
    checkedAt: new Date().toISOString(),
    requiredTables,
    presentTables: requiredTables
      .filter(name => foundByName.has(name))
      .map(name => ({
        name,
        oid: foundByName.get(name).oid,
        relkind: foundByName.get(name).relkind,
      })),
    missingTables,
    writeInitializationSkipped: true,
  }
}

export async function assertFoundationDbReadyForReadOnlyGate(label = 'Foundation read-only gate', options = {}) {
  const readiness = await getFoundationDbReadOnlyGateReadiness(options)
  if (!readiness.ok) {
    const missing = readiness.missingTables.join(', ') || 'unknown'
    throw new Error(`${label} requires an initialized Foundation DB before read-only gate checks. Missing tables: ${missing}. Start or restart the Foundation dashboard/worker, or run an explicit approved DB initialization path, then rerun the gate.`)
  }
  return readiness
}

export async function closeFoundationDb() {
  if (!poolEndPromise) {
    poolEndPromise = pool.end()
  }
  await poolEndPromise
}

export async function resetFoundationDb() {
  await closeFoundationDb()
  pool = createFoundationPool()
  poolEndPromise = null
}
