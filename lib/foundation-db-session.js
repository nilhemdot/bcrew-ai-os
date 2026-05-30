import { getSourceContracts } from './source-contracts.js'
import { createFoundationDbSchemaSeedStore } from './foundation-db-schema-seed-store.js'
import {
  FOUNDATION_DB_READ_ONLY_GATE_TABLES,
  assertFoundationDbReadyForReadOnlyGate,
  closeFoundationDb,
  foundationPoolHandle as pool,
  getFoundationDbReadOnlyGateReadiness,
  resetFoundationDb,
  withFoundationAdvisoryLock,
} from './foundation-db-core.js'

export {
  FOUNDATION_DB_READ_ONLY_GATE_TABLES,
  assertFoundationDbReadyForReadOnlyGate,
  closeFoundationDb,
  getFoundationDbReadOnlyGateReadiness,
  resetFoundationDb,
  withFoundationAdvisoryLock,
}

export const FOUNDATION_DB_INIT_SEED_SPLIT_CARD_ID = 'FOUNDATION-DB-INIT-SEED-SPLIT-001'

const canonicalDecisionCategories = ['strategy', 'system', 'execution', 'people']
const backlogScopeKeys = ['foundation', 'strategic_execution', 'marketing', 'sales', 'operations', 'retention']

const foundationDbSchemaSeedStore = createFoundationDbSchemaSeedStore({
  pool,
  backlogScopeKeys,
  canonicalDecisionCategories,
})

export const initFoundationDb = foundationDbSchemaSeedStore.initFoundationDb
export const bootstrapFoundationDb = foundationDbSchemaSeedStore.bootstrapFoundationDb

function getRegisteredSourceIds() {
  return getSourceContracts()
    .map(source => source.sourceId || source.id)
    .filter(Boolean)
    .sort()
}

function mapDbAuditCountRow(row) {
  return {
    relation: row.relation,
    value: row.value,
    count: Number(row.count || 0),
  }
}

export async function getFoundationDbConstraintAudit(options = {}) {
  const parsedLimit = Number(options.limit ?? 50)
  const limit = Number.isFinite(parsedLimit) && parsedLimit >= 0 ? Math.floor(parsedLimit) : 50
  const registeredSourceIds = Array.isArray(options.sourceIds) && options.sourceIds.length
    ? options.sourceIds
    : getRegisteredSourceIds()

  const [decisionCategoryResult, sourceReferenceResult, docUpdateStateResult] = await Promise.all([
    pool.query(
      `
        SELECT 'decisions.category' AS relation, category AS value, COUNT(*)::int AS count
        FROM decisions
        WHERE NOT (category = ANY($1::text[]))
        GROUP BY category
        ORDER BY category
        LIMIT $2
      `,
      [canonicalDecisionCategories, limit]
    ),
    pool.query(
      `
        WITH source_refs AS (
          SELECT 'doc_source_snapshots.source_id' AS relation, source_id AS value FROM doc_source_snapshots
          UNION ALL
          SELECT 'shared_communication_artifacts.source_id' AS relation, source_id AS value FROM shared_communication_artifacts
          UNION ALL
          SELECT 'shared_communication_candidates.source_id' AS relation, source_id AS value FROM shared_communication_candidates
          UNION ALL
          SELECT 'shared_communication_artifact_processing_runs.source_id' AS relation, source_id AS value FROM shared_communication_artifact_processing_runs
          UNION ALL
          SELECT 'source_crawl_targets.source_id' AS relation, source_id AS value FROM source_crawl_targets
          UNION ALL
          SELECT 'source_crawl_target_runs.source_id' AS relation, source_id AS value FROM source_crawl_target_runs
          UNION ALL
          SELECT 'source_crawl_items.source_id' AS relation, source_id AS value FROM source_crawl_items
          UNION ALL
          SELECT 'intelligence_report_artifacts.source_ids' AS relation, source_id AS value
          FROM intelligence_report_artifacts, unnest(source_ids) AS source_id
          UNION ALL
          SELECT 'intelligence_atoms.source_id' AS relation, source_id AS value FROM intelligence_atoms
          UNION ALL
          SELECT 'intelligence_atom_hits.source_id' AS relation, source_id AS value FROM intelligence_atom_hits
          UNION ALL
          SELECT 'business_atoms.source_id' AS relation, source_id AS value FROM business_atoms
          UNION ALL
          SELECT 'atom_hits.source_id' AS relation, source_id AS value FROM atom_hits
          UNION ALL
          SELECT 'intelligence_retrieval_chunks.source_id' AS relation, source_id AS value FROM intelligence_retrieval_chunks
          UNION ALL
          SELECT 'intelligence_retrieval_runs.source_ids' AS relation, source_id AS value
          FROM intelligence_retrieval_runs, unnest(source_ids) AS source_id
          UNION ALL
          SELECT 'shared_communication_synthesized_items.source_ids' AS relation, source_id AS value
          FROM shared_communication_synthesized_items, unnest(source_ids) AS source_id
        )
        SELECT relation, value, COUNT(*)::int AS count
        FROM source_refs
        WHERE value IS NOT NULL
          AND NOT (value = ANY($1::text[]))
        GROUP BY relation, value
        ORDER BY relation, value
        LIMIT $2
      `,
      [registeredSourceIds, limit]
    ),
    pool.query(
      `
        SELECT 'pending_doc_updates.status_state' AS relation,
               id || ':' || status AS value,
               1::int AS count
        FROM pending_doc_updates
        WHERE (status = 'applied' AND (applied_at IS NULL OR applied_commit IS NULL))
           OR (status IN ('approved', 'rejected', 'failed') AND reviewed_at IS NULL)
           OR (status = 'pending' AND reviewed_at IS NOT NULL)
        ORDER BY id
        LIMIT $1
      `,
      [limit]
    ),
  ])

  const invalidDecisionCategories = decisionCategoryResult.rows.map(mapDbAuditCountRow)
  const invalidSourceReferences = sourceReferenceResult.rows.map(mapDbAuditCountRow)
  const pendingDocUpdateStateIssues = docUpdateStateResult.rows.map(mapDbAuditCountRow)

  return {
    generatedAt: new Date().toISOString(),
    registeredSourceIds: registeredSourceIds.length,
    canonicalDecisionCategories: canonicalDecisionCategories.slice(),
    invalidDecisionCategoryCount: invalidDecisionCategories.reduce((total, item) => total + item.count, 0),
    invalidDecisionCategories,
    invalidSourceReferenceCount: invalidSourceReferences.reduce((total, item) => total + item.count, 0),
    invalidSourceReferences,
    pendingDocUpdateStateIssueCount: pendingDocUpdateStateIssues.reduce((total, item) => total + item.count, 0),
    pendingDocUpdateStateIssues,
  }
}

const foundationDbInitSeedSplitSnapshotQueries = [
  {
    key: 'users',
    sql: `
      SELECT COUNT(*)::int AS row_count,
             COALESCE(md5(string_agg(row_to_json(t)::text, E'\n' ORDER BY t.email)), '') AS fingerprint
      FROM (
        SELECT email, name, tier, user_type, active, meeting_sync_enabled, metadata::text, updated_at::text
        FROM users
      ) t
    `,
  },
  {
    key: 'backlog_items',
    sql: `
      SELECT COUNT(*)::int AS row_count,
             COALESCE(md5(string_agg(row_to_json(t)::text, E'\n' ORDER BY t.id)), '') AS fingerprint
      FROM (
        SELECT id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note, updated_at::text
        FROM backlog_items
      ) t
    `,
  },
  {
    key: 'foundation_sprints',
    sql: `
      SELECT COUNT(*)::int AS row_count,
             COALESCE(md5(string_agg(row_to_json(t)::text, E'\n' ORDER BY t.sprint_id)), '') AS fingerprint
      FROM (
        SELECT sprint_id, status, goal, active_blocker_card_id, started_at::text, closed_at::text, metadata::text, updated_at::text
        FROM foundation_sprints
      ) t
    `,
  },
  {
    key: 'foundation_sprint_items',
    sql: `
      SELECT COUNT(*)::int AS row_count,
             COALESCE(md5(string_agg(row_to_json(t)::text, E'\n' ORDER BY t.sprint_id, t.backlog_id)), '') AS fingerprint
      FROM (
        SELECT sprint_id, backlog_id, sprint_order, stage, plan_ref, definition_of_done, proof_commands::text, readiness_blocker_cleared, not_next_boundaries::text, existing_work_check::text, returned_reason, metadata::text, updated_at::text
        FROM foundation_sprint_items
      ) t
    `,
  },
  {
    key: 'decisions',
    sql: `
      SELECT COUNT(*)::int AS row_count,
             COALESCE(md5(string_agg(row_to_json(t)::text, E'\n' ORDER BY t.id)), '') AS fingerprint
      FROM (
        SELECT id, category, title, status, summary, decision_owner, classified_at::text, updated_at::text
        FROM decisions
      ) t
    `,
  },
  {
    key: 'open_questions',
    sql: `
      SELECT COUNT(*)::int AS row_count,
             COALESCE(md5(string_agg(row_to_json(t)::text, E'\n' ORDER BY t.id)), '') AS fingerprint
      FROM (
        SELECT id, title, status, owner, resolved_at::text, resolved_by, resolution_note, updated_at::text
        FROM open_questions
      ) t
    `,
  },
  {
    key: 'parking_lot_items',
    sql: `
      SELECT COUNT(*)::int AS row_count,
             COALESCE(md5(string_agg(row_to_json(t)::text, E'\n' ORDER BY t.id)), '') AS fingerprint
      FROM (
        SELECT id, title, summary, owner, updated_at::text
        FROM parking_lot_items
      ) t
    `,
  },
  {
    key: 'memory_system_status',
    sql: `
      SELECT COUNT(*)::int AS row_count,
             COALESCE(md5(string_agg(row_to_json(t)::text, E'\n' ORDER BY t.component_key)), '') AS fingerprint
      FROM (
        SELECT component_key, label, status, detail, updated_at::text
        FROM memory_system_status
      ) t
    `,
  },
  {
    key: 'doc_source_snapshots',
    sql: `
      SELECT COUNT(*)::int AS row_count,
             COALESCE(md5(string_agg(row_to_json(t)::text, E'\n' ORDER BY t.id)), '') AS fingerprint
      FROM (
        SELECT id, doc_path, source_id, group_title, label, value, detail, as_of::text, sort_order, updated_at::text
        FROM doc_source_snapshots
      ) t
    `,
  },
  {
    key: 'shared_communication_artifact_processing_runs',
    sql: `
      SELECT COUNT(*)::int AS row_count,
             COALESCE(md5(string_agg(row_to_json(t)::text, E'\n' ORDER BY t.run_id)), '') AS fingerprint
      FROM (
        SELECT run_id, artifact_id, source_id, artifact_type, artifact_content_hash, processing_type, extraction_method, provider, auth_path, route_key, status, processed_at::text
        FROM shared_communication_artifact_processing_runs
      ) t
    `,
  },
]

async function getFoundationDbInitSeedSplitMutationSnapshot() {
  const tables = {}
  for (const query of foundationDbInitSeedSplitSnapshotQueries) {
    const result = await pool.query(query.sql)
    const row = result.rows[0] || {}
    tables[query.key] = {
      rowCount: Number(row.row_count || 0),
      fingerprint: row.fingerprint || '',
    }
  }
  return {
    capturedAt: new Date().toISOString(),
    tables,
  }
}

function compareFoundationDbInitSeedSplitSnapshots(before, after) {
  return Object.keys(before.tables || {}).map(table => {
    const beforeTable = before.tables[table] || {}
    const afterTable = after.tables?.[table] || {}
    return {
      table,
      beforeRowCount: beforeTable.rowCount ?? null,
      afterRowCount: afterTable.rowCount ?? null,
      beforeFingerprint: beforeTable.fingerprint || '',
      afterFingerprint: afterTable.fingerprint || '',
      unchanged:
        beforeTable.rowCount === afterTable.rowCount &&
        beforeTable.fingerprint === afterTable.fingerprint,
    }
  })
}

export async function buildFoundationDbInitSeedSplitDogfoodProof() {
  const before = await getFoundationDbInitSeedSplitMutationSnapshot()
  await initFoundationDb()
  const after = await getFoundationDbInitSeedSplitMutationSnapshot()
  const tableComparisons = compareFoundationDbInitSeedSplitSnapshots(before, after)
  const changedTables = tableComparisons.filter(table => !table.unchanged)

  return {
    ok: changedTables.length === 0,
    cardId: FOUNDATION_DB_INIT_SEED_SPLIT_CARD_ID,
    mode: 'schema-init-black-box-before-after',
    schemaInitFunction: 'initFoundationDb',
    explicitBootstrapFunction: 'bootstrapFoundationDb',
    watchedTables: tableComparisons.map(table => table.table),
    tableComparisons,
    changedTables,
    dogfoodInvariant: 'Calling initFoundationDb() must not seed, repair, close cards, or rewrite backlog/source/sprint truth.',
  }
}
