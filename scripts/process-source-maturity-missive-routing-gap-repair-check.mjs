#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  getFoundationSnapshot,
} from '../lib/foundation-strategy-docs-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { getSourceContracts } from '../lib/source-contracts.js'
import { buildSourceMaturityGridSnapshot } from '../lib/source-maturity-grid.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import {
  SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_APPROVAL_PATH,
  SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CARD_ID,
  SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CHANGED_FILES,
  SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY,
  SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CLOSEOUT_PATH,
  SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_NOT_NEXT_BOUNDARIES,
  SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_PLAN_PATH,
  SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_PROOF_COMMANDS,
  SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_SCRIPT_PATH,
  SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_SPRINT_ID,
  SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_TARGET_ATOM_ID,
  SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_TARGET_CHUNK_ID,
  SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID,
  buildMissiveRoutingRepairRecords,
  buildSyntheticMissiveRoutingGapRepairProof,
  renderMissiveRoutingGapRepairCloseout,
} from '../lib/source-maturity-missive-routing-gap-repair.js'
import {
  evaluateSourceMaturityRoutingGapRepair,
  selectSourceMaturityRoutingRepairCandidate,
} from '../lib/source-maturity-routing-gap-repair.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false, apply: false, closeCard: false, stage: 'building_now' }
  for (const rawArg of argv) {
    const arg = String(rawArg || '')
    if (arg === '--json' || arg === '--json=true') args.json = true
    if (arg === '--apply' || arg === '--apply=true') args.apply = true
    if (arg === '--close-card' || arg === '--close-card=true') args.closeCard = true
    if (arg.startsWith('--stage=')) args.stage = arg.slice('--stage='.length)
  }
  return args
}

function normalizeStage(stage = 'building_now') {
  return ['scoping', 'sprint_ready', 'building_now'].includes(stage) ? stage : 'building_now'
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function text(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function stableRunId(seed = '') {
  return crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 12)
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/source-maturity-grid.js',
      'lib/source-maturity-routing-gap-repair.js',
      'lib/intelligence-synthesis.js',
      'lib/intelligence-action-router.js',
      'lib/action-route-review-inbox.js',
      'lib/action-route-promotion-workflow.js',
    ],
    existingDocs: [
      'docs/_archive/handoffs/2026-05-29-hot-doc-refresh/2026-05-18-source-maturity-gap-followup-triage.md',
      'docs/_archive/handoffs/2026-05-29-hot-doc-refresh/2026-05-18-source-maturity-routing-gap-repair-closeout.md',
      'docs/handoffs/2026-05-18-action-route-review-inbox-closeout.md',
      'docs/handoffs/2026-05-18-action-route-promotion-workflow-closeout.md',
    ],
    existingScripts: [
      'scripts/process-source-maturity-routing-gap-repair-check.mjs',
      'scripts/process-action-route-review-inbox-check.mjs',
      'scripts/process-action-route-promotion-workflow-check.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: [
      'Action routes are approval-gated internal proposals until an explicit apply workflow is approved.',
      'Source maturity repair must use existing source-backed evidence and must not run extraction, providers, auth repair, paid work, or external writeback.',
      'Missive current-day evidence already exists in internal atoms/chunks; this card only routes one existing signal into review.',
    ],
    reused: [
      'Existing SRC-MISSIVE-001 source-health fact.',
      'Existing Missive Atlassian Goals/Projects atom.',
      'Existing Missive retrieval chunk for that atom.',
      'Existing Action Route Review Inbox and Promotion Workflow semantics.',
    ],
    notRebuilt: [
      'No external destination apply.',
      'No live connector/extractor/provider run.',
      'No Harlan/Fal/voice/Canva/OpenHuman work.',
      'No broad UI redesign.',
    ],
    exactGap: 'SRC-MISSIVE-001 has current source-health proof plus tier-one atom/chunk evidence but no internal action route signal, so source maturity blocks at routed.',
    overBroadRisk: 'Routing a Missive source maturity gap must not silently create trusted backlog/decision/question records or apply any external action.',
    readyBy: 'Steve approved continuous safe overnight Foundation source work, and live source maturity truth exposes routed-stage gaps with existing evidence.',
    readyAt: '2026-05-18T05:30:00-04:00',
  }
}

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CARD_ID,
    title: 'Repair Missive source maturity routing gap',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P1',
    rank: 35,
    source: 'SOURCE-MATURITY-GAP-FOLLOWUP-001 live maturity queue',
    summary: 'Route an existing source-backed Missive signal into the internal action-route review layer without applying or writing externally.',
    whyItMatters: 'Foundation should move existing Missive evidence into reviewable owner decisions without pretending route apply or external action is approved.',
    nextAction: closeCard
      ? `Done under \`${SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY}\`. Continue the next safe source-maturity or connector card from live truth.`
      : 'Create an approval-required pending internal action route for one existing Missive signal, prove no destination apply/external write, and clear the routed-stage maturity gap.',
    statusNote: closeCard
      ? `Closed under \`${SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY}\`; SRC-MISSIVE-001 now has an approval-required pending route signal.`
      : `Scope/proof: \`${SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY}\`; no live extraction/auth/provider/external-write work.`,
    owner: 'Foundation Source',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    cardId: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : normalizedStage,
    planRef: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_PLAN_PATH,
    definitionOfDone: 'SRC-MISSIVE-001 has an approval-required pending internal action route backed by an active source-health fact, the existing Atlassian Goals/Projects atom, and its retrieval chunk; source maturity no longer blocks at routed for that source; no destination record is applied; focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
    proofCommands: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_PROOF_COMMANDS,
    readinessBlockerCleared: 'Live source maturity grid shows SRC-MISSIVE-001 has source-backed fact, atom, and retrieval chunk evidence but no route signal.',
    notNextBoundaries: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_APPROVAL_PATH,
      closeoutKey: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, stage = 'building_now' } = {}) {
  const planSource = await readRepoFile(SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_PLAN_PATH)
  const card = buildCardRow({ closeCard, stage })
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card,
    changedFiles: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CHANGED_FILES,
    declaredRisk: 'internal intelligence synthesis/action-route DB rows and source maturity verification surface',
    repoRoot,
  })
  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary,
          why_it_matters, next_action, status_note, owner
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (id) DO UPDATE
        SET title = EXCLUDED.title,
            team = EXCLUDED.team,
            lane = EXCLUDED.lane,
            priority = EXCLUDED.priority,
            rank = EXCLUDED.rank,
            source = EXCLUDED.source,
            summary = EXCLUDED.summary,
            why_it_matters = EXCLUDED.why_it_matters,
            next_action = EXCLUDED.next_action,
            status_note = EXCLUDED.status_note,
            owner = EXCLUDED.owner,
            updated_at = NOW()
      `,
      [
        card.id,
        card.title,
        card.scope,
        card.lane,
        card.priority,
        card.rank,
        card.source,
        card.summary,
        card.whyItMatters,
        card.nextAction,
        card.statusNote,
        card.owner,
      ],
    )
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `source-maturity-missive-routing-${stableRunId(SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_PLAN_PATH)}`,
        SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CARD_ID,
        SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_PLAN_PATH,
        planReview.status,
        planReview.score,
        planReview.maxScore,
        planReview.passThreshold,
        card.priority,
        'full',
        true,
        SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CARD_ID }),
        'codex-source-maturity-missive-routing-gap-repair',
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-source-maturity-missive-routing-gap-repair',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        card.id,
        `${closeCard ? 'Closed' : 'Updated'} ${SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CARD_ID}.`,
        JSON.stringify({ closeoutKey: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY, stage }),
      ],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
  return { card, planReview }
}

async function ensureLiveState({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_SCRIPT_PATH,
    operation: 'create/update Missive source maturity routing repair backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  const upsert = await upsertLiveCardAndPlanCritic({ closeCard, stage: normalizedStage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_SPRINT_ID,
        status: 'active',
        goal: 'Repair the Missive source maturity routed-stage gap with an approval-required internal action route.',
        activeBlockerCardId: closeCard ? null : SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizedStage,
          startedBy: 'codex-source-maturity-missive-routing-gap-repair',
          currentStatus: closeCard ? 'complete' : normalizedStage,
          closeoutKey: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Commit/push, then continue the next safe Foundation-up card from repo truth.'
            : 'Create a pending approval-required route from existing source-backed Missive evidence only.',
          priorityOrder: [SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CARD_ID],
          notNext: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'SRC-MISSIVE-001 receives a pending internal action route backed by fact, atom, and chunk refs.',
            'No route is applied and no destination record is created.',
            'Source maturity no longer blocks at routed for SRC-MISSIVE-001.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage: normalizedStage })],
    },
    'codex-source-maturity-missive-routing-gap-repair',
    {
      apply: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      replaceItems: true,
      allowItemReplacement: true,
      reason: closeCard
        ? 'Close Missive source maturity routing gap repair sprint item after focused proof.'
        : 'Start Missive source maturity routing gap repair sprint item with complete scaffold metadata.',
    },
  )
  return upsert
}

async function buildSourceMaturityGrid() {
  const foundationSnapshot = await getFoundationSnapshot()
  const sources = getSourceContracts()
  return buildSourceMaturityGridSnapshot({
    sources,
    extractionControl: foundationSnapshot.extractionControl,
    sharedCommunicationsCoverage: foundationSnapshot.sharedCommunicationsCoverage,
    intelligenceSynthesisFacts: foundationSnapshot.intelligenceSynthesisFacts,
    intelligenceSynthesis: foundationSnapshot.intelligenceSynthesis,
    intelligenceActionRouter: foundationSnapshot.intelligenceActionRouter,
    sourceMaturityOperational: foundationSnapshot.sourceMaturityOperational,
    lifecycle: foundationSnapshot.sourceLifecycle,
  })
}

async function loadTargetEvidence() {
  const pool = createPool()
  try {
    const [facts, atoms, chunks, routeRows] = await Promise.all([
      pool.query(
        `
          SELECT fact_id, fact_type, source_id, source_ids, title, claim, value, detail,
                 status, sensitivity, min_tier, updated_at
          FROM intelligence_synthesis_facts
          WHERE ($1 = ANY(source_ids) OR source_id = $1)
            AND status = 'active'
            AND min_tier <= 1
          ORDER BY updated_at DESC
          LIMIT 10
        `,
        [SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID],
      ),
      pool.query(
        `
          SELECT atom_id, source_id, title, content, atom_type, status, candidate_key,
                 artifact_id, report_artifact_id, evidence_excerpt, derived_claim,
                 sensitivity, min_tier, updated_at
          FROM intelligence_atoms
          WHERE source_id = $1
            AND atom_id = $2
            AND status NOT IN ('rejected','archived','superseded')
            AND min_tier <= 1
          ORDER BY updated_at DESC
          LIMIT 1
        `,
        [SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID, SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_TARGET_ATOM_ID],
      ),
      pool.query(
        `
          SELECT chunk_id, chunk_type, source_id, atom_id, candidate_key, artifact_id,
                 report_artifact_id, title, body, status, sensitivity, min_tier, updated_at
          FROM intelligence_retrieval_chunks
          WHERE source_id = $1
            AND chunk_id = $2
            AND status = 'active'
            AND min_tier <= 1
          ORDER BY updated_at DESC
          LIMIT 1
        `,
        [SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID, SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_TARGET_CHUNK_ID],
      ),
      pool.query(
        `
          SELECT route_id, run_id, synthesized_item_id, synthesized_item_natural_key,
                 route_type, destination_table, destination_record_id, approval_status,
                 approval_required, owner, owner_confidence, routing_reason, source_ids,
                 fact_refs, evidence_refs, evidence_chunk_refs, atom_refs, candidate_keys,
                 artifact_ids, sensitivity, min_tier, proposed_payload, metadata,
                 routed_at, updated_at
          FROM intelligence_action_routes
          WHERE source_ids && ARRAY[$1]::text[]
          ORDER BY routed_at DESC, updated_at DESC
        `,
        [SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID],
      ),
    ])
    return {
      facts: facts.rows,
      atoms: atoms.rows,
      chunks: chunks.rows,
      routes: routeRows.rows.map(mapRouteRow),
    }
  } finally {
    await pool.end()
  }
}

function mapRouteRow(row = {}) {
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

async function applyRoutingRepair(records) {
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
        'codex-source-maturity-missive-routing-gap-repair',
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
        'codex-source-maturity-missive-routing-gap-repair',
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
        VALUES ('intelligence_action_route_proposed','intelligence_action_routes',$1,'codex-source-maturity-missive-routing-gap-repair',$2,$3::jsonb)
      `,
      [
        records.route.routeId,
        `Proposed Missive source maturity routing repair route for ${records.sourceId}.`,
        JSON.stringify({
          cardId: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CARD_ID,
          closeoutKey: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY,
          sourceId: records.sourceId,
          noExternalWrite: true,
        }),
      ],
    )
    await client.query('COMMIT')
    return mapRouteRow(routeResult.rows[0])
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

async function buildLiveRepairSnapshot({ applyRepair = false } = {}) {
  const beforeGrid = await buildSourceMaturityGrid()
  const beforeRow = beforeGrid.rows.find(row => row.sourceId === SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID) || {}
  const evidence = await loadTargetEvidence()
  const candidate = selectSourceMaturityRoutingRepairCandidate({
    sourceId: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID,
    facts: evidence.facts,
    atoms: evidence.atoms,
    chunks: evidence.chunks,
  })
  const records = buildMissiveRoutingRepairRecords(candidate)
  let routeRow = evidence.routes.find(route => route.routeId === records.route?.routeId) || null
  if (applyRepair && records.ok) {
    routeRow = await applyRoutingRepair(records)
  }
  const afterGrid = await buildSourceMaturityGrid()
  const afterRow = afterGrid.rows.find(row => row.sourceId === SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID) || {}
  const evaluation = evaluateSourceMaturityRoutingGapRepair({
    beforeRow,
    afterRow,
    candidate,
    records,
    routeRow,
  })
  return {
    beforeRow,
    afterRow,
    candidate,
    records,
    routeRow,
    evaluation,
    summary: evaluation.summary,
    checks: evaluation.checks,
    failures: evaluation.failures,
    status: evaluation.status,
  }
}

async function writeCloseout(snapshot) {
  await fs.writeFile(
    path.join(repoRoot, SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CLOSEOUT_PATH),
    renderMissiveRoutingGapRepairCloseout(snapshot),
    'utf8',
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  const writeRequested = args.apply || args.closeCard || isProcessCheckWriteRequested({
    argv: process.argv.slice(2),
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  let upsert = null
  if (writeRequested) {
    upsert = await ensureLiveState({ closeCard: args.closeCard, stage: args.stage })
  }

  const planSource = await readRepoFile(SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_PLAN_PATH)
  const packageJson = JSON.parse(await readRepoFile('package.json'))
  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_APPROVAL_PATH,
    cardId: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CARD_ID,
  })
  const planReview = upsert?.planReview || evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard, stage: args.stage }),
    changedFiles: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CHANGED_FILES,
    declaredRisk: 'internal intelligence synthesis/action-route DB rows and source maturity verification surface',
    repoRoot,
  })
  const applyRepairNow = args.apply && normalizeStage(args.stage) === 'building_now'
  const live = await buildLiveRepairSnapshot({ applyRepair: applyRepairNow || args.closeCard })
  const synthetic = buildSyntheticMissiveRoutingGapRepairProof()
  const cards = await getBacklogItemsByIds([SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CARD_ID])
  const activeSprint = await getActiveFoundationCurrentSprint()
  const planCriticRuns = await getPlanCriticRunsByCardIds([SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CARD_ID])
  const closeouts = getFoundationBuildCloseouts()
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: activeSprint?.sprint,
    items: activeSprint?.items || [],
    backlogItems: cards,
    closeouts,
    planCriticRuns,
  })
  const activeItem = list(activeSprint?.items).find(item => item.cardId === SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CARD_ID) || null
  const card = cards[0] || buildCardRow({ closeCard: args.closeCard, stage: args.stage })
  const cardLane = text(card.lane)

  addCheck(checks, packageJson.scripts?.['process:source-maturity-missive-routing-gap-repair-check'] === `node --env-file-if-exists=.env ${SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:source-maturity-missive-routing-gap-repair-check'] || 'missing')
  addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'approval file is valid v2', approvalValidation.failures?.map(failure => failure.check).join(', ') || 'ok')
  addCheck(checks, planReview.status === 'pass' && planReview.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes', `score=${planReview.score}`)
  addCheck(checks, Boolean(cards[0]), 'live backlog card exists', card.id || card.cardId || 'missing')
  addCheck(checks, args.closeCard ? cardLane === 'done' : ['scoped', 'executing'].includes(cardLane), 'live backlog card is in expected lane', cardLane || 'missing')
  addCheck(checks, Boolean(activeItem), 'Current Sprint includes Missive repair item', activeItem?.stage || 'missing')
  addCheck(checks, activeItem ? activeItem.planRef === SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_PLAN_PATH : false, 'Current Sprint item has plan ref', activeItem?.planRef || 'missing')
  addCheck(checks, activeItem ? list(activeItem.proofCommands).includes('npm run process:source-maturity-missive-routing-gap-repair-check -- --close-card --json') : false, 'Current Sprint proof commands include close-card proof', list(activeItem?.proofCommands).join('; ') || 'missing')
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint status is healthy', currentSprintStatus.findings?.map(finding => finding.detail).join('; ') || 'healthy')
  addCheck(checks, synthetic.ok, 'synthetic Missive routing-gap dogfood passes', synthetic.evaluation?.failures?.map(failure => failure.check).join(', ') || 'ok')
  addCheck(checks, live.candidate.atom?.atomId === SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_TARGET_ATOM_ID, 'live candidate uses the bounded Missive atom', live.candidate.atom?.atomId || 'missing')
  addCheck(checks, live.candidate.chunk?.chunkId === SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_TARGET_CHUNK_ID, 'live candidate uses the bounded Missive chunk', live.candidate.chunk?.chunkId || 'missing')

  const repairRequired = applyRepairNow || args.closeCard || Boolean(live.routeRow)
  if (repairRequired) {
    for (const check of live.checks) {
      addCheck(checks, check.ok, check.check, check.detail)
    }
    addCheck(checks, live.status === 'healthy', 'live Missive repair snapshot is healthy', live.failures.map(failure => failure.check).join(', ') || 'healthy')
  } else {
    addCheck(checks, live.beforeRow.nextGap === 'routed', 'target source starts at routed gap', `${live.beforeRow.sourceId || 'missing'}:${live.beforeRow.nextGap || 'missing'}`)
    addCheck(checks, Number(live.beforeRow.metrics?.routeSignals || 0) === 0, 'target source starts without route signal', String(live.beforeRow.metrics?.routeSignals ?? 'missing'))
    addCheck(checks, live.candidate.ok, 'source-backed Missive repair candidate exists before mutation', list(live.candidate.failures).join(', ') || live.candidate.sourceId)
    addCheck(checks, live.records.ok, 'Missive repair records verify before mutation', list(live.records.failures).join(', ') || live.records.route?.routeId)
  }
  addCheck(checks, planSource.includes('intelligence_action_routes') && planSource.includes('reject substring-only') && planSource.includes('full `process:foundation-ship`'), 'plan names real behavior proof and full ship gate', SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_PLAN_PATH)
  addCheck(checks, (await readRepoFile('lib/source-maturity-routing-gap-repair.js')).includes('options = {}') && (await readRepoFile('lib/source-maturity-routing-gap-repair.js')).includes('const cardId = options.cardId'), 'shared routing helper accepts card metadata', 'lib/source-maturity-routing-gap-repair.js')
  addCheck(checks, (await readRepoFile('lib/foundation-build-closeout-source-records.js')).includes(SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY), 'closeout registry includes Missive repair record', SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY)
  addCheck(checks, (await readRepoFile('lib/foundation-verify-coverage-card-ids.js')).includes(SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CARD_ID), 'verifier coverage card list includes Missive repair card', SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CARD_ID)
  addCheck(checks, closeouts.some(record => record.key === SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY), 'build closeout registry exposes Missive repair closeout', SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY)

  if (args.closeCard) {
    await writeCloseout(live)
    const closeoutSource = await readRepoFile(SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CLOSEOUT_PATH)
    addCheck(checks, closeoutSource.includes(SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY) && closeoutSource.includes('No live extraction'), 'closeout file is written', SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CLOSEOUT_PATH)
  }

  const findings = checks.filter(check => !check.ok)
  const result = {
    status: findings.length ? 'risk' : 'healthy',
    cardId: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CARD_ID,
    closeoutKey: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY,
    stage: args.closeCard ? 'done_this_sprint' : normalizeStage(args.stage),
    planCritic: { status: planReview.status, score: planReview.score },
    synthetic: {
      ok: synthetic.ok,
      routeId: synthetic.records?.route?.routeId || null,
    },
    repair: live.summary,
    checks,
    findings,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Source maturity Missive routing gap repair check: ${result.status}`)
    console.log(`SOURCE_MATURITY_MISSIVE_ROUTING_REPAIR_SUMMARY ${JSON.stringify(result.repair)}`)
    for (const finding of findings) {
      console.log(`- ${finding.check}: ${finding.detail}`)
    }
  }

  await closeFoundationDb()
  if (findings.length) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
