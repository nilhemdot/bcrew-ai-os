import { randomUUID } from 'node:crypto'

import { createIntelligenceActionRouterStore } from './intelligence-action-router.js'
import {
  foundationPoolHandle,
  insertChangeEvent,
} from './foundation-db-core.js'
import {
  SYNTHESIS_VERIFICATION_METADATA_KEY,
  SYNTHESIS_VERIFICATION_VERSION,
} from './synthesis-claim-verification.js'

export const ACTION_ROUTE_APPLY_RESOLUTION_PROOF_CARD_ID = 'ACTION-ROUTE-APPLY-RESOLUTION-PROOF-002'
export const ACTION_ROUTE_APPLY_RESOLUTION_PROOF_CLOSEOUT_KEY = 'action-route-apply-resolution-proof-synthetic-v1'
export const ACTION_ROUTE_APPLY_RESOLUTION_PROOF_PLAN_PATH = 'docs/process/action-route-apply-resolution-proof-002-plan.md'
export const ACTION_ROUTE_APPLY_RESOLUTION_PROOF_APPROVAL_PATH = 'docs/process/approvals/ACTION-ROUTE-APPLY-RESOLUTION-PROOF-002.json'
export const ACTION_ROUTE_APPLY_RESOLUTION_PROOF_SCRIPT_PATH = 'scripts/process-action-route-apply-resolution-proof-check.mjs'

export const ACTION_ROUTE_APPLY_RESOLUTION_PROOF_NOT_NEXT_BOUNDARIES = [
  'No live route approval or apply.',
  'No live extraction, source sync, transcript fetch, crawl, summarization, or model call.',
  'No external write, Telegram send, email send, Slack send, Agent Feedback send, or public message.',
  'No backlog, decision, or question creation from live Director, Scoper, Portfolio, or route recommendations.',
  'No login, MFA, paid/private source work, Browserbase, source-session resume, or external-action authority.',
]

const SYNTHETIC_SCOPE_KEY = 'action-route-apply-resolution-proof'
const SYNTHETIC_SOURCE_ID = 'SRC-MEETINGS-001'
const SYNTHETIC_ACTOR = 'codex-action-route-apply-resolution-proof'

function nowCompact() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
}

function uniqueProofSuffix() {
  return `${nowCompact()}-${randomUUID().replace(/-/g, '').slice(0, 10)}`
}

function buildVerifiedSynthesisMetadata(proofId) {
  return {
    status: 'verified',
    supportLevel: 'verified',
    verificationVersion: SYNTHESIS_VERIFICATION_VERSION,
    verifiedAt: new Date().toISOString(),
    verifiedBy: ACTION_ROUTE_APPLY_RESOLUTION_PROOF_CARD_ID,
    proofId,
    reasons: [],
    warnings: [],
    freshness: {
      status: 'fresh',
      source: 'synthetic_transaction',
    },
  }
}

function buildSyntheticIds(suffix = uniqueProofSuffix()) {
  return {
    proofId: `action-route-apply-resolution-proof:${suffix}`,
    synthesisRunId: `action-route-apply-resolution-proof-synthesis:${suffix}`,
    synthesizedItemId: `action-route-apply-resolution-proof-item:${suffix}`,
    routerRunId: `action-route-apply-resolution-proof-router:${suffix}`,
    routeId: `action-route-apply-resolution-proof-route:${suffix}`,
    naturalKey: `action-route-apply-resolution-proof-natural:${suffix}`,
    factId: `action-route-apply-resolution-proof-fact:${suffix}`,
    atomId: `action-route-apply-resolution-proof-atom:${suffix}`,
    chunkId: `action-route-apply-resolution-proof-chunk:${suffix}`,
    artifactId: `action-route-apply-resolution-proof-artifact:${suffix}`,
  }
}

async function countExactId(client, tableName, columnName, value) {
  const allowed = new Map([
    ['intelligence_synthesis_runs.run_id', ['intelligence_synthesis_runs', 'run_id']],
    ['intelligence_synthesized_items.synthesized_item_id', ['intelligence_synthesized_items', 'synthesized_item_id']],
    ['intelligence_action_router_runs.run_id', ['intelligence_action_router_runs', 'run_id']],
    ['intelligence_action_routes.route_id', ['intelligence_action_routes', 'route_id']],
    ['backlog_items.id', ['backlog_items', 'id']],
    ['change_events.entity_id', ['change_events', 'entity_id']],
  ])
  const key = `${tableName}.${columnName}`
  const pair = allowed.get(key)
  if (!pair) throw new Error(`Unsupported synthetic count target: ${key}`)
  const result = await client.query(
    `SELECT COUNT(*)::int AS total FROM ${pair[0]} WHERE ${pair[1]} = $1`,
    [value],
  )
  return Number(result.rows[0]?.total || 0)
}

async function countSyntheticRows(client, ids, destinationRecordId = '') {
  return {
    synthesisRuns: await countExactId(client, 'intelligence_synthesis_runs', 'run_id', ids.synthesisRunId),
    synthesizedItems: await countExactId(client, 'intelligence_synthesized_items', 'synthesized_item_id', ids.synthesizedItemId),
    routerRuns: await countExactId(client, 'intelligence_action_router_runs', 'run_id', ids.routerRunId),
    routes: await countExactId(client, 'intelligence_action_routes', 'route_id', ids.routeId),
    destinationBacklogItems: destinationRecordId
      ? await countExactId(client, 'backlog_items', 'id', destinationRecordId)
      : 0,
    routeChangeEvents: await countExactId(client, 'change_events', 'entity_id', ids.routeId),
  }
}

async function seedSyntheticActionRoute(client, ids) {
  const verification = buildVerifiedSynthesisMetadata(ids.proofId)
  const routeMetadata = {
    proposedBy: SYNTHETIC_ACTOR,
    routeScope: 'operational',
    reviewSurface: 'foundation',
    syntheticTransactionalProof: true,
    [SYNTHESIS_VERIFICATION_METADATA_KEY]: verification,
  }
  const itemMetadata = {
    routeScope: 'operational',
    syntheticTransactionalProof: true,
    [SYNTHESIS_VERIFICATION_METADATA_KEY]: verification,
  }
  const itemAttributes = {
    synthesisQuality: 'clustered',
    routeScope: 'operational',
    syntheticTransactionalProof: true,
  }
  const proposedPayload = {
    idPrefix: 'ACTIONPROOF',
    title: 'Synthetic action-route apply resolution proof',
    scope: 'foundation',
    lane: 'scoped',
    priority: 'P2',
    source: ACTION_ROUTE_APPLY_RESOLUTION_PROOF_CARD_ID,
    summary: 'Synthetic rollback-only proof that Action Router approval and apply create an internal destination record.',
    whyItMatters: 'Action routes must prove they can resolve into internal work without silently applying live recommendations.',
    nextAction: 'No operator action; this row exists only inside a rolled-back transaction.',
    statusNote: `Synthetic route ${ids.routeId}; transaction is rolled back by ${ACTION_ROUTE_APPLY_RESOLUTION_PROOF_CARD_ID}.`,
    owner: 'Foundation Action Router',
  }

  await client.query(
    `
      INSERT INTO intelligence_synthesis_runs (
        run_id, run_type, status, requested_by, source_ids, fact_count,
        evidence_count, item_count, max_tier, metadata, started_at, finished_at
      )
      VALUES ($1,'governed_synthesis_proof','succeeded',$2,$3::text[],1,1,1,1,$4::jsonb,NOW(),NOW())
    `,
    [
      ids.synthesisRunId,
      SYNTHETIC_ACTOR,
      [SYNTHETIC_SOURCE_ID],
      JSON.stringify({ proofId: ids.proofId, syntheticTransactionalProof: true }),
    ],
  )

  await client.query(
    `
      INSERT INTO intelligence_synthesized_items (
        synthesized_item_id, natural_key, synthesis_scope_key, run_id, item_type,
        status, review_order, title, summary, suggested_owner, owner_confidence,
        owner_resolution_reason, owner_action, source_ids, fact_refs, evidence_refs,
        evidence_chunk_refs, atom_refs, candidate_keys, artifact_ids, sensitivity,
        min_tier, attributes, routing_status, metadata
      )
      VALUES (
        $1,$2,$3,$4,'action_candidate',
        'ready_for_action_router',1,$5,$6,'Foundation Action Router','high',
        'Synthetic proof owner is explicit.',$7,$8::text[],$9::text[],$10::text[],
        $11::text[],$12::text[],$13::text[],$14::text[],'neutral',
        1,$15::jsonb,'unrouted',$16::jsonb
      )
    `,
    [
      ids.synthesizedItemId,
      ids.naturalKey,
      SYNTHETIC_SCOPE_KEY,
      ids.synthesisRunId,
      'Synthetic action-route apply resolution proof',
      'Rollback-only synthetic item used to prove pending to approved to applied route behavior.',
      'Prove the Action Router internal apply path without touching live recommendations.',
      [SYNTHETIC_SOURCE_ID],
      [ids.factId],
      [ids.atomId],
      [ids.chunkId],
      [ids.atomId],
      [],
      [ids.artifactId],
      JSON.stringify(itemAttributes),
      JSON.stringify(itemMetadata),
    ],
  )

  await client.query(
    `
      INSERT INTO intelligence_action_router_runs (
        run_id, run_type, status, requested_by, synthesized_item_count,
        route_count, approved_count, applied_count, max_tier, source_ids,
        metadata, started_at, finished_at
      )
      VALUES ($1,'route_proposal','succeeded',$2,1,1,0,0,1,$3::text[],$4::jsonb,NOW(),NOW())
    `,
    [
      ids.routerRunId,
      SYNTHETIC_ACTOR,
      [SYNTHETIC_SOURCE_ID],
      JSON.stringify({ proofId: ids.proofId, syntheticTransactionalProof: true }),
    ],
  )

  await client.query(
    `
      INSERT INTO intelligence_action_routes (
        route_id, run_id, synthesized_item_id, synthesized_item_natural_key,
        route_type, destination_table, destination_record_id, approval_status,
        approval_required, owner, owner_confidence, routing_reason, source_ids,
        fact_refs, evidence_refs, evidence_chunk_refs, atom_refs, candidate_keys,
        artifact_ids, sensitivity, min_tier, proposed_payload, applied_payload,
        metadata, routed_at, updated_at
      )
      VALUES (
        $1,$2,$3,$4,
        'owner_action','backlog_items',NULL,'pending',
        TRUE,'Foundation Action Router','high',$5,$6::text[],
        $7::text[],$8::text[],$9::text[],$10::text[],$11::text[],
        $12::text[],'neutral',1,$13::jsonb,'{}'::jsonb,
        $14::jsonb,NOW(),NOW()
      )
    `,
    [
      ids.routeId,
      ids.routerRunId,
      ids.synthesizedItemId,
      ids.naturalKey,
      'Synthetic route proves approval and apply can create an internal backlog destination under rollback.',
      [SYNTHETIC_SOURCE_ID],
      [ids.factId],
      [ids.atomId],
      [ids.chunkId],
      [ids.atomId],
      [],
      [ids.artifactId],
      JSON.stringify(proposedPayload),
      JSON.stringify(routeMetadata),
    ],
  )
}

function buildCheck(ok, check, detail = '') {
  return { ok: Boolean(ok), check, detail }
}

function allCountsZero(counts = {}) {
  return Object.values(counts).every(value => Number(value || 0) === 0)
}

export async function runActionRouteApplyResolutionSyntheticProof() {
  const ids = buildSyntheticIds()
  const client = await foundationPoolHandle.connect()
  let rolledBack = false
  try {
    await client.query('BEGIN')
    await seedSyntheticActionRoute(client, ids)

    const store = createIntelligenceActionRouterStore({
      pool: {
        query: (...args) => client.query(...args),
      },
      withFoundationTransaction: async work => work(client),
      insertChangeEvent,
    })

    const pending = await store.getActionRoute(ids.routeId)
    const approved = await store.approveActionRoute(ids.routeId, {
      approvedBy: 'Steve overnight-approved synthetic proof',
      approvalNote: 'Synthetic transaction proof; rollback required before closeout.',
    }, SYNTHETIC_ACTOR)
    const applyRoute = store.applyApprovedActionRoute
    const applied = await applyRoute(ids.routeId, {
      applyNote: 'Synthetic transaction proof; rollback required before closeout.',
    }, SYNTHETIC_ACTOR)

    const destinationResult = await client.query(
      `SELECT id, title, source, status_note FROM backlog_items WHERE id = $1`,
      [applied.destinationRecordId],
    )
    const inTransactionCounts = await countSyntheticRows(client, ids, applied.destinationRecordId)
    await client.query('ROLLBACK')
    rolledBack = true
    const rollbackCounts = await countSyntheticRows(client, ids, applied.destinationRecordId)

    const checks = [
      buildCheck(pending?.approvalStatus === 'pending', 'synthetic route starts pending', pending?.approvalStatus || 'missing'),
      buildCheck(approved?.approvalStatus === 'approved' && approved.approvedBy, 'real approve path marks route approved with explicit approver', `${approved?.approvalStatus || 'missing'}:${approved?.approvedBy || 'missing approver'}`),
      buildCheck(applied?.approvalStatus === 'applied' && applied.destinationRecordId, 'real apply path marks route applied with destination record', `${applied?.approvalStatus || 'missing'}:${applied?.destinationRecordId || 'missing destination'}`),
      buildCheck(destinationResult.rows.length === 1, 'internal destination record exists inside transaction', applied.destinationRecordId || 'missing destination'),
      buildCheck(inTransactionCounts.routes === 1 && inTransactionCounts.destinationBacklogItems === 1, 'synthetic route and destination are visible before rollback', JSON.stringify(inTransactionCounts)),
      buildCheck(allCountsZero(rollbackCounts), 'rollback removes synthetic route, destination, runs, item, and change events', JSON.stringify(rollbackCounts)),
      buildCheck(applied?.sourceIds?.includes(SYNTHETIC_SOURCE_ID), 'applied route keeps source provenance', (applied?.sourceIds || []).join(', ')),
      buildCheck(applied?.metadata?.[SYNTHESIS_VERIFICATION_METADATA_KEY]?.status === 'verified', 'applied route keeps verified synthesis metadata', applied?.metadata?.[SYNTHESIS_VERIFICATION_METADATA_KEY]?.status || 'missing'),
    ]
    const failed = checks.filter(check => !check.ok)

    return {
      ok: failed.length === 0,
      cardId: ACTION_ROUTE_APPLY_RESOLUTION_PROOF_CARD_ID,
      closeoutKey: ACTION_ROUTE_APPLY_RESOLUTION_PROOF_CLOSEOUT_KEY,
      proofMode: 'synthetic_transaction_rollback',
      routeId: ids.routeId,
      destinationRecordId: applied.destinationRecordId || null,
      checks,
      failed,
      pending: pending ? {
        routeId: pending.routeId,
        approvalStatus: pending.approvalStatus,
        destinationTable: pending.destinationTable,
      } : null,
      approved: approved ? {
        routeId: approved.routeId,
        approvalStatus: approved.approvalStatus,
        approvedBy: approved.approvedBy,
      } : null,
      applied: applied ? {
        routeId: applied.routeId,
        approvalStatus: applied.approvalStatus,
        destinationRecordId: applied.destinationRecordId,
        appliedBy: applied.appliedBy,
      } : null,
      rollbackCounts,
      boundaries: {
        liveRouteApplied: false,
        liveRecommendationPromoted: false,
        externalWrite: false,
        transactionRolledBack: true,
      },
    }
  } catch (error) {
    if (!rolledBack) {
      await client.query('ROLLBACK').catch(() => {})
      rolledBack = true
    }
    return {
      ok: false,
      cardId: ACTION_ROUTE_APPLY_RESOLUTION_PROOF_CARD_ID,
      closeoutKey: ACTION_ROUTE_APPLY_RESOLUTION_PROOF_CLOSEOUT_KEY,
      proofMode: 'synthetic_transaction_rollback',
      routeId: ids.routeId,
      checks: [buildCheck(false, 'synthetic route apply resolution proof completed', error instanceof Error ? error.message : String(error))],
      failed: [buildCheck(false, 'synthetic route apply resolution proof completed', error instanceof Error ? error.message : String(error))],
      error: {
        message: error instanceof Error ? error.message : String(error),
        code: error?.code || null,
      },
      boundaries: {
        liveRouteApplied: false,
        liveRecommendationPromoted: false,
        externalWrite: false,
        transactionRolledBack: rolledBack,
      },
    }
  } finally {
    client.release()
  }
}
