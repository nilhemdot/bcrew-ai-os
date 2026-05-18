import { Pool } from 'pg'

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

export function mapSourceMaturityRoutingRouteRow(row = {}) {
  return {
    routeId: row.route_id,
    runId: row.run_id,
    synthesizedItemId: row.synthesized_item_id,
    synthesizedItemNaturalKey: row.synthesized_item_natural_key,
    routeType: row.route_type,
    destinationTable: row.destination_table,
    destinationRecordId: row.destination_record_id,
    approvalStatus: row.approval_status,
    approvalRequired: row.approval_required,
    owner: row.owner,
    ownerConfidence: row.owner_confidence,
    routingReason: row.routing_reason,
    sourceIds: row.source_ids || [],
    factRefs: row.fact_refs || [],
    evidenceRefs: row.evidence_refs || [],
    evidenceChunkRefs: row.evidence_chunk_refs || [],
    atomRefs: row.atom_refs || [],
    candidateKeys: row.candidate_keys || [],
    artifactIds: row.artifact_ids || [],
    sensitivity: row.sensitivity,
    minTier: Number(row.min_tier || 1),
    proposedPayload: row.proposed_payload || {},
    metadata: row.metadata || {},
    routedAt: row.routed_at,
    updatedAt: row.updated_at,
  }
}

export async function applySourceMaturityRoutingRepairRecords(records, {
  actor = 'codex-source-maturity-routing-gap-repair',
  changeSummary,
} = {}) {
  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `
        INSERT INTO intelligence_synthesis_runs (
          run_id, run_type, status, requested_by, source_ids, fact_count,
          evidence_count, item_count, max_tier, metadata, started_at, finished_at
        )
        VALUES ($1,$2,$3,$4,$5::text[],$6,$7,$8,$9,$10::jsonb,NOW(),NOW())
        ON CONFLICT (run_id) DO UPDATE SET
          run_type = EXCLUDED.run_type,
          status = EXCLUDED.status,
          requested_by = EXCLUDED.requested_by,
          source_ids = EXCLUDED.source_ids,
          fact_count = EXCLUDED.fact_count,
          evidence_count = EXCLUDED.evidence_count,
          item_count = EXCLUDED.item_count,
          max_tier = EXCLUDED.max_tier,
          metadata = EXCLUDED.metadata,
          finished_at = NOW()
      `,
      [
        records.synthesisRun.runId,
        records.synthesisRun.runType,
        records.synthesisRun.status,
        actor,
        records.synthesisRun.sourceIds,
        records.synthesisRun.factCount,
        records.synthesisRun.evidenceCount,
        records.synthesisRun.itemCount,
        records.synthesisRun.maxTier,
        JSON.stringify(records.synthesisRun.metadata),
      ],
    )
    await client.query(
      `
        INSERT INTO intelligence_synthesized_items (
          synthesized_item_id, natural_key, synthesis_scope_key, run_id, item_type,
          status, review_order, title, summary, suggested_owner, owner_confidence,
          owner_resolution_reason, owner_action, source_ids, fact_refs, evidence_refs,
          evidence_chunk_refs, atom_refs, candidate_keys, artifact_ids, sensitivity,
          min_tier, attributes, routing_status, metadata, updated_at
        )
        VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9,$10,$11,
          $12,$13,$14::text[],$15::text[],$16::text[],
          $17::text[],$18::text[],$19::text[],$20::text[],$21,
          $22,$23::jsonb,$24,$25::jsonb,NOW()
        )
        ON CONFLICT (synthesized_item_id) DO UPDATE SET
          natural_key = EXCLUDED.natural_key,
          synthesis_scope_key = EXCLUDED.synthesis_scope_key,
          run_id = EXCLUDED.run_id,
          item_type = EXCLUDED.item_type,
          status = EXCLUDED.status,
          review_order = EXCLUDED.review_order,
          title = EXCLUDED.title,
          summary = EXCLUDED.summary,
          suggested_owner = EXCLUDED.suggested_owner,
          owner_confidence = EXCLUDED.owner_confidence,
          owner_resolution_reason = EXCLUDED.owner_resolution_reason,
          owner_action = EXCLUDED.owner_action,
          source_ids = EXCLUDED.source_ids,
          fact_refs = EXCLUDED.fact_refs,
          evidence_refs = EXCLUDED.evidence_refs,
          evidence_chunk_refs = EXCLUDED.evidence_chunk_refs,
          atom_refs = EXCLUDED.atom_refs,
          candidate_keys = EXCLUDED.candidate_keys,
          artifact_ids = EXCLUDED.artifact_ids,
          sensitivity = EXCLUDED.sensitivity,
          min_tier = EXCLUDED.min_tier,
          attributes = EXCLUDED.attributes,
          routing_status = EXCLUDED.routing_status,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      `,
      [
        records.item.synthesizedItemId,
        records.item.naturalKey,
        records.item.synthesisScopeKey,
        records.item.runId,
        records.item.itemType,
        records.item.status,
        records.item.reviewOrder,
        records.item.title,
        records.item.summary,
        records.item.suggestedOwner,
        records.item.ownerConfidence,
        records.item.ownerResolutionReason,
        records.item.ownerAction,
        records.item.sourceIds,
        records.item.factRefs,
        records.item.evidenceRefs,
        records.item.evidenceChunkRefs,
        records.item.atomRefs,
        records.item.candidateKeys,
        records.item.artifactIds,
        records.item.sensitivity,
        records.item.minTier,
        JSON.stringify(records.item.attributes),
        records.item.routingStatus,
        JSON.stringify(records.item.metadata),
      ],
    )
    await client.query(
      `
        INSERT INTO intelligence_action_router_runs (
          run_id, run_type, status, requested_by, synthesized_item_count,
          route_count, approved_count, applied_count, max_tier, source_ids,
          metadata, started_at, finished_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,0,0,$7,$8::text[],$9::jsonb,NOW(),NOW())
        ON CONFLICT (run_id) DO UPDATE SET
          run_type = EXCLUDED.run_type,
          status = EXCLUDED.status,
          requested_by = EXCLUDED.requested_by,
          synthesized_item_count = EXCLUDED.synthesized_item_count,
          route_count = EXCLUDED.route_count,
          max_tier = EXCLUDED.max_tier,
          source_ids = EXCLUDED.source_ids,
          metadata = EXCLUDED.metadata,
          finished_at = NOW()
      `,
      [
        records.routeRun.runId,
        records.routeRun.runType,
        records.routeRun.status,
        actor,
        records.routeRun.synthesizedItemCount,
        records.routeRun.routeCount,
        records.routeRun.maxTier,
        records.routeRun.sourceIds,
        JSON.stringify(records.routeRun.metadata),
      ],
    )
    const routeResult = await client.query(
      `
        INSERT INTO intelligence_action_routes (
          route_id, run_id, synthesized_item_id, synthesized_item_natural_key,
          route_type, destination_table, approval_status, approval_required,
          owner, owner_confidence, routing_reason, source_ids, fact_refs,
          evidence_refs, evidence_chunk_refs, atom_refs, candidate_keys,
          artifact_ids, sensitivity, min_tier, proposed_payload, metadata,
          routed_at, updated_at
        )
        VALUES (
          $1,$2,$3,$4,
          $5,$6,$7,$8,
          $9,$10,$11,$12::text[],$13::text[],
          $14::text[],$15::text[],$16::text[],$17::text[],
          $18::text[],$19,$20,$21::jsonb,$22::jsonb,
          NOW(),NOW()
        )
        ON CONFLICT (route_id) DO UPDATE SET
          run_id = CASE
            WHEN intelligence_action_routes.approval_status = 'pending' THEN EXCLUDED.run_id
            ELSE intelligence_action_routes.run_id
          END,
          proposed_payload = CASE
            WHEN intelligence_action_routes.approval_status = 'pending' THEN EXCLUDED.proposed_payload
            ELSE intelligence_action_routes.proposed_payload
          END,
          metadata = intelligence_action_routes.metadata || EXCLUDED.metadata,
          updated_at = NOW()
        RETURNING *
      `,
      [
        records.route.routeId,
        records.route.runId,
        records.route.synthesizedItemId,
        records.route.synthesizedItemNaturalKey,
        records.route.routeType,
        records.route.destinationTable,
        records.route.approvalStatus,
        records.route.approvalRequired,
        records.route.owner,
        records.route.ownerConfidence,
        records.route.routingReason,
        records.route.sourceIds,
        records.route.factRefs,
        records.route.evidenceRefs,
        records.route.evidenceChunkRefs,
        records.route.atomRefs,
        records.route.candidateKeys,
        records.route.artifactIds,
        records.route.sensitivity,
        records.route.minTier,
        JSON.stringify(records.route.proposedPayload),
        JSON.stringify(records.route.metadata),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ('intelligence_action_route_proposed','intelligence_action_routes',$1,$2,$3,$4::jsonb)
      `,
      [
        records.route.routeId,
        actor,
        changeSummary || `Proposed source maturity routing repair route for ${records.sourceId}.`,
        JSON.stringify({
          cardId: records.route.metadata?.cardId || records.synthesisRun.metadata?.cardId || null,
          closeoutKey: records.route.metadata?.closeoutKey || records.synthesisRun.metadata?.closeoutKey || null,
          sourceId: records.sourceId,
          noExternalWrite: true,
        }),
      ],
    )
    await client.query('COMMIT')
    return mapSourceMaturityRoutingRouteRow(routeResult.rows[0])
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}
