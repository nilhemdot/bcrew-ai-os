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
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  upsertRetrievalChunk,
} from '../lib/foundation-intelligence-db.js'
import {
  getFoundationSnapshot,
} from '../lib/foundation-strategy-docs-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { getSourceContracts } from '../lib/source-contracts.js'
import { buildSourceMaturityGridSnapshot } from '../lib/source-maturity-grid.js'
import { PLAN_CRITIC_MIN_PASS_SCORE, evaluatePlanCriticPlan } from '../lib/process-plan-critic.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import {
  SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_APPROVAL_PATH,
  SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CARD_ID,
  SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CHANGED_FILES,
  SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CLOSEOUT_KEY,
  SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CLOSEOUT_PATH,
  SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_NOT_NEXT_BOUNDARIES,
  SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_PLAN_PATH,
  SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_PROOF_COMMANDS,
  SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_SCRIPT_PATH,
  SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_SPRINT_ID,
  SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGETS,
  buildVerifiedSourceRoutingRepairRecords,
  buildVerifiedSourceRoutingRetrievalChunk,
  buildSyntheticVerifiedSourceRoutingGapRepairProof,
  evaluateVerifiedSourceRoutingGapRepairs,
  renderVerifiedSourceRoutingGapRepairCloseout,
} from '../lib/source-maturity-verified-routing-gap-repair.js'
import {
  selectSourceMaturityRoutingRepairCandidate,
} from '../lib/source-maturity-routing-gap-repair.js'
import {
  applySourceMaturityRoutingRepairRecords,
  mapSourceMaturityRoutingRouteRow,
} from '../lib/source-maturity-routing-gap-repair-db.js'

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

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function text(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
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

function targetBySourceId(sourceId) {
  return SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGETS.find(target => target.sourceId === sourceId) || null
}

function rowBySourceId(rows = [], sourceId) {
  return list(rows).find(row => row.sourceId === sourceId || row.source_id === sourceId) || {}
}

function buildExistingWorkCheck() {
  const sourceIds = SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGETS.map(target => target.sourceId)
  return {
    existingCode: [
      'lib/source-maturity-grid.js',
      'lib/source-maturity-routing-gap-repair.js',
      'lib/source-maturity-routing-gap-repair-db.js',
      'lib/source-maturity-verified-atom-flow-repair.js',
      'lib/intelligence-retrieval.js',
      'lib/intelligence-action-router.js',
      'lib/action-route-review-inbox.js',
      'lib/action-route-promotion-workflow.js',
    ],
    existingDocs: [
      'docs/_archive/handoffs/2026-05-29-hot-doc-refresh/2026-05-18-source-maturity-verified-evidence-gap-repair-closeout.md',
      'docs/_archive/handoffs/2026-05-29-hot-doc-refresh/2026-05-18-source-maturity-verified-atom-flow-repair-closeout.md',
      'docs/strategy/bhag-model.md',
      'docs/source-registry.md',
    ],
    existingScripts: [
      'scripts/process-source-maturity-verified-evidence-gap-repair-check.mjs',
      'scripts/process-source-maturity-verified-atom-flow-repair-check.mjs',
      'scripts/process-source-maturity-fub-routing-gap-repair-check.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: [
      'The six verified/readable source facts and accepted atoms already exist from prior governed repairs.',
      'Routing repair may create bounded retrieval chunks and approval-required pending internal routes only.',
      'Action routes are proposals until an explicit apply/promotion workflow is approved.',
    ],
    reused: [
      `Existing source facts for ${sourceIds.join(', ')}.`,
      'Existing accepted atoms for all six verified/readable source targets.',
      'Existing retrieval chunk upsert store.',
      'Existing Action Route Review Inbox and promotion workflow semantics.',
    ],
    notRebuilt: [
      'No live provider/source read or write.',
      'No extraction target creation.',
      'No model/provider call.',
      'No external destination apply.',
      'No action-route apply.',
    ],
    exactGap: `${sourceIds.join(', ')} have source facts and accepted atoms but no route signals, so the live source maturity grid blocks at routed.`,
    overBroadRisk: 'Verified/readable source routing repair must not fabricate atoms, read sources, run extraction, call providers, or silently create trusted backlog/decision/question records.',
    readyBy: 'Steve approved continuous safe overnight Foundation source work; the previous verified source atom-flow repair created the exact evidence needed for route-ready repair.',
    readyAt: '2026-05-18T11:35:00-04:00',
  }
}

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CARD_ID,
    title: 'Repair verified source maturity routing gaps',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P1',
    rank: 40,
    source: 'SOURCE-MATURITY-GAP-FOLLOWUP-001 live maturity queue',
    summary: 'Create bounded retrieval chunks and pending owner-decision routes for six verified/readable sources from existing facts and atoms only.',
    whyItMatters: 'Foundation should make verified/readable source-backed facts reviewable as operator work without reading sources, running extraction, writing externally, or pretending route apply is approved.',
    nextAction: closeCard
      ? `Done under \`${SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CLOSEOUT_KEY}\`. Continue the next safe source-maturity/source-contract repair from live truth.`
      : 'Create bounded retrieval chunks, create approval-required pending internal action routes, prove no destination apply/external write, and clear the routed-stage maturity gaps.',
    statusNote: closeCard
      ? `Closed under \`${SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CLOSEOUT_KEY}\`; all six verified/readable targets now have retrieval chunks and pending route signals.`
      : `Scope/proof: \`${SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CLOSEOUT_KEY}\`; no source read/write, live extraction, provider call, route apply, or external-write work.`,
    owner: 'Foundation Source',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    cardId: SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : normalizedStage,
    planRef: SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_PLAN_PATH,
    definitionOfDone: 'SRC-CLICKUP-001, SRC-GDOCS-001, SRC-GSHEETS-001, SRC-DATAFORSEO-001, SRC-GHL-001, and SRC-META-001 each have one active retrieval chunk backed by existing accepted atoms plus one approval-required pending internal action route; source maturity no longer blocks at routed for those sources; no source read/write, live extraction, provider call, destination apply, external write, or Drive mutation occurs; focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
    proofCommands: SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_PROOF_COMMANDS,
    readinessBlockerCleared: 'SOURCE-MATURITY-VERIFIED-ATOM-FLOW-REPAIR-001 created the accepted atoms needed for bounded chunk and route repair.',
    notNextBoundaries: SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_APPROVAL_PATH,
      closeoutKey: SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CLOSEOUT_KEY,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, stage = 'building_now' } = {}) {
  const planSource = await readRepoFile(SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_PLAN_PATH)
  const card = buildCardRow({ closeCard, stage })
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card,
    changedFiles: SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CHANGED_FILES,
    declaredRisk: 'internal retrieval/action-route DB rows and source maturity verification surface',
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
      [card.id, card.title, card.scope, card.lane, card.priority, card.rank, card.source, card.summary, card.whyItMatters, card.nextAction, card.statusNote, card.owner],
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
        `source-maturity-verified-source-routing-${stableRunId(SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_PLAN_PATH)}`,
        SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CARD_ID,
        SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_PLAN_PATH,
        planReview.status,
        planReview.score,
        planReview.maxScore,
        planReview.passThreshold,
        card.priority,
        'full',
        true,
        SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CARD_ID }),
        'codex-source-maturity-verified-routing-gap-repair',
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-source-maturity-verified-routing-gap-repair',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        card.id,
        `${closeCard ? 'Closed' : 'Updated'} ${SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CARD_ID}.`,
        JSON.stringify({ closeoutKey: SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CLOSEOUT_KEY, stage }),
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
    scriptPath: SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_SCRIPT_PATH,
    operation: 'create/update verified source routing repair backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  const upsert = await upsertLiveCardAndPlanCritic({ closeCard, stage: normalizedStage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_SPRINT_ID,
        status: 'active',
        goal: 'Repair the verified/readable routed-stage source maturity gaps with bounded retrieval chunks and approval-required internal routes.',
        activeBlockerCardId: closeCard ? null : SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizedStage,
          startedBy: 'codex-source-maturity-verified-routing-gap-repair',
          currentStatus: closeCard ? 'complete' : normalizedStage,
          closeoutKey: SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Commit/push, then continue the next safe Foundation-up card from repo truth.'
            : 'Create bounded retrieval chunks and pending approval-required routes from existing verified/readable source evidence only.',
          priorityOrder: [SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CARD_ID],
          notNext: SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'All six verified/readable source targets receive active retrieval chunks backed by existing atoms.',
            'All six verified/readable source targets receive pending internal action routes backed by fact, atom, and chunk refs.',
            'No route is applied and no destination record is created.',
            'Source maturity no longer blocks at routed for the six verified/readable source targets.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage: normalizedStage })],
    },
    'codex-source-maturity-verified-routing-gap-repair',
    {
      apply: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      replaceItems: true,
      allowItemReplacement: true,
      reason: closeCard
        ? 'Close verified source routing repair sprint item after focused proof.'
        : 'Start verified source routing repair sprint item with complete scaffold metadata.',
    },
  )
  return upsert
}

async function buildSourceMaturityGrid() {
  const foundationSnapshot = await getFoundationSnapshot()
  return buildSourceMaturityGridSnapshot({
    sources: getSourceContracts(),
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
  const sourceIds = SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGETS.map(target => target.sourceId)
  const factIds = SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGETS.map(target => target.factId)
  const atomIds = SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGETS.map(target => target.atomId)
  const chunkIds = SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGETS.map(target => target.chunkId)
  const pool = createPool()
  try {
    const [facts, atoms, chunks, routeRows] = await Promise.all([
      pool.query(
        `
          SELECT fact_id, fact_type, source_id, source_ids, title, claim, value, detail,
                 status, sensitivity, min_tier, updated_at
          FROM intelligence_synthesis_facts
          WHERE fact_id = ANY($1::text[])
            AND (source_id = ANY($2::text[]) OR source_ids && $2::text[])
            AND status = 'active'
            AND min_tier <= 1
        `,
        [factIds, sourceIds],
      ),
      pool.query(
        `
          SELECT atom_id, source_id, title, content, atom_type, status, candidate_key,
                 artifact_id, report_artifact_id, evidence_excerpt, derived_claim,
                 sensitivity, min_tier, updated_at, metadata
          FROM intelligence_atoms
          WHERE source_id = ANY($1::text[])
            AND atom_id = ANY($2::text[])
            AND status NOT IN ('rejected','archived','superseded')
            AND min_tier <= 1
        `,
        [sourceIds, atomIds],
      ),
      pool.query(
        `
          SELECT chunk_id, chunk_type, source_id, atom_id, candidate_key, artifact_id,
                 report_artifact_id, title, body, status, sensitivity, min_tier, metadata, updated_at
          FROM intelligence_retrieval_chunks
          WHERE source_id = ANY($1::text[])
            AND chunk_id = ANY($2::text[])
            AND status = 'active'
            AND min_tier <= 1
        `,
        [sourceIds, chunkIds],
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
          WHERE source_ids && $1::text[]
          ORDER BY routed_at DESC, updated_at DESC
        `,
        [sourceIds],
      ),
    ])
    return {
      facts: facts.rows,
      atoms: atoms.rows,
      chunks: chunks.rows,
      routes: routeRows.rows.map(mapSourceMaturityRoutingRouteRow),
    }
  } finally {
    await pool.end()
  }
}

function rowForTarget(rows = [], target = {}) {
  return list(rows).find(row =>
    row.source_id === target.sourceId ||
    row.sourceId === target.sourceId ||
    row.atom_id === target.atomId ||
    row.atomId === target.atomId ||
    row.fact_id === target.factId ||
    row.factId === target.factId ||
    row.chunk_id === target.chunkId ||
    row.chunkId === target.chunkId
  ) || null
}

async function ensureRetrievalChunks({ applyRepair = false, evidence = {} } = {}) {
  const chunks = []
  for (const target of SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGETS) {
    const fact = rowForTarget(evidence.facts, target)
    const atom = rowForTarget(evidence.atoms, target)
    const existing = rowForTarget(evidence.chunks, target)
    if (existing) {
      chunks.push(existing)
      continue
    }
    if (!fact || !atom) continue
    const chunk = buildVerifiedSourceRoutingRetrievalChunk(target, atom, fact)
    if (applyRepair) {
      chunks.push(await upsertRetrievalChunk(chunk, 'codex-source-maturity-verified-routing-gap-repair'))
    } else {
      chunks.push(chunk)
    }
  }
  return chunks
}

async function runRepair({ apply = false } = {}) {
  const beforeGrid = await buildSourceMaturityGrid()
  const targetSourceIds = SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGETS.map(target => target.sourceId)
  const beforeRows = beforeGrid.rows.filter(row => targetSourceIds.includes(row.sourceId))
  const evidence = await loadTargetEvidence()
  const chunks = await ensureRetrievalChunks({ applyRepair: apply, evidence })
  const candidates = []
  const records = []
  const routeRows = []
  for (const target of SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGETS) {
    const candidate = selectSourceMaturityRoutingRepairCandidate({
      sourceId: target.sourceId,
      facts: list(evidence.facts).filter(row => row.source_id === target.sourceId || row.sourceId === target.sourceId),
      atoms: list(evidence.atoms).filter(row => row.source_id === target.sourceId || row.sourceId === target.sourceId),
      chunks: list(chunks).filter(row => row.source_id === target.sourceId || row.sourceId === target.sourceId),
    })
    const record = buildVerifiedSourceRoutingRepairRecords(candidate, new Date().toISOString(), target)
    let routeRow = list(evidence.routes).find(row => row.routeId === record.route?.routeId) || null
    if (apply && record.ok) {
      routeRow = await applySourceMaturityRoutingRepairRecords(record, {
        actor: 'codex-source-maturity-verified-routing-gap-repair',
        changeSummary: `Proposed verified source maturity routing repair route for ${record.sourceId}.`,
      })
    }
    candidates.push(candidate)
    records.push(record)
    if (routeRow) routeRows.push(routeRow)
  }
  const afterGrid = await buildSourceMaturityGrid()
  const afterRows = afterGrid.rows.filter(row => targetSourceIds.includes(row.sourceId))
  const evaluation = evaluateVerifiedSourceRoutingGapRepairs({
    beforeRows,
    afterRows,
    candidates,
    records,
    routeRows,
  })
  return { beforeRows, afterRows, evidence, chunks, candidates, records, routeRows, evaluation, summary: evaluation.summary }
}

async function writeCloseout(snapshot) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_SCRIPT_PATH,
    operation: 'write verified source routing repair closeout',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
  await fs.writeFile(
    path.join(repoRoot, SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CLOSEOUT_PATH),
    renderVerifiedSourceRoutingGapRepairCloseout(snapshot),
    'utf8',
  )
}

async function buildStatus({ closeCard = false, stage = 'building_now' } = {}) {
  const checks = []
  const packageJson = JSON.parse(await readRepoFile('package.json'))
  const planSource = await readRepoFile(SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_PLAN_PATH)
  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_APPROVAL_PATH,
    cardId: SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CARD_ID,
  })
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard, stage }),
    changedFiles: SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CHANGED_FILES,
    declaredRisk: 'internal retrieval/action-route DB rows and source maturity verification surface',
    repoRoot,
  })
  const cards = await getBacklogItemsByIds([SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CARD_ID])
  const card = cards[0] || null
  const planCriticRuns = await getPlanCriticRunsByCardIds([SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CARD_ID])
  const activeSprint = await getActiveFoundationCurrentSprint()
  const activeItem = list(activeSprint?.items).find(item => item.cardId === SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CARD_ID) || null
  const synthetic = buildSyntheticVerifiedSourceRoutingGapRepairProof()
  const closeoutRecords = getFoundationBuildCloseouts()
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: activeSprint?.sprint,
    items: activeSprint?.items || [],
    backlogItems: cards,
    closeouts: closeoutRecords,
    planCriticRuns,
  })
  const applyRepairNow = closeCard || (
    normalizeStage(stage) === 'building_now' &&
      isProcessCheckWriteRequested({ argv: process.argv.slice(2), allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] })
  )
  const repair = await runRepair({ apply: applyRepairNow })
  const repairRequired = applyRepairNow || list(repair.routeRows).length >= SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGETS.length
  const alreadyClosed = card?.lane === 'done' && activeItem?.stage === 'done_this_sprint'
  const expectedLane = closeCard ? 'done' : normalizeStage(stage) === 'building_now' ? 'executing' : 'scoped'
  const onlyPreShipCloseoutFinding = closeCard &&
    list(currentSprintStatus.findings).length === 1 &&
    currentSprintStatus.findings[0]?.check === 'done_this_sprint_requires_recent_work_closeout'

  addCheck(checks, packageJson.scripts?.['process:source-maturity-verified-routing-gap-repair-check'] === `node --env-file-if-exists=.env ${SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:source-maturity-verified-routing-gap-repair-check'] || 'missing')
  addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'approval file is valid v2', approvalValidation.failures?.map(failure => failure.check).join(', ') || 'ok')
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes', `score=${planReview.score}`)
  addCheck(checks, Boolean(card), 'live backlog card exists', card?.id || 'missing')
  addCheck(checks, card ? card.lane === expectedLane || alreadyClosed : false, 'live backlog card is in expected lane or already closed', card?.lane || 'missing')
  addCheck(checks, Boolean(activeItem), 'Current Sprint includes verified source routing item', activeItem?.stage || 'missing')
  addCheck(checks, activeItem ? activeItem.planRef === SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_PLAN_PATH : false, 'Current Sprint item has plan ref', activeItem?.planRef || 'missing')
  addCheck(checks, activeItem ? list(activeItem.proofCommands).includes('npm run process:source-maturity-verified-routing-gap-repair-check -- --close-card --json') : false, 'Current Sprint proof commands include close-card proof', list(activeItem?.proofCommands).join('; '))
  addCheck(
    checks,
    currentSprintStatus.status === 'healthy' || onlyPreShipCloseoutFinding,
    'Current Sprint status is not risk except pre-ship Recent Work closeout sync',
    onlyPreShipCloseoutFinding ? 'pre-ship closeout sync is proven by process:foundation-ship' : currentSprintStatus.findings?.map(finding => finding.detail).join('; ') || 'healthy',
  )
  addCheck(checks, synthetic.ok, 'synthetic verified source routing dogfood passes', synthetic.ok ? 'ok' : JSON.stringify(synthetic))

  const factIds = list(repair.candidates).map(candidate => candidate.fact?.factId || candidate.fact?.fact_id).filter(Boolean)
  const atomIds = list(repair.candidates).map(candidate => candidate.atom?.atomId || candidate.atom?.atom_id).filter(Boolean)
  const chunkIds = list(repair.chunks).map(chunk => chunk.chunkId || chunk.chunk_id).filter(Boolean)
  addCheck(checks, SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGETS.every(target => factIds.includes(target.factId)), 'live candidates use the bounded verified/readable source facts', factIds.join(', ') || 'missing')
  addCheck(checks, SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGETS.every(target => atomIds.includes(target.atomId)), 'live candidates use the bounded verified/readable atoms', atomIds.join(', ') || 'missing')
  addCheck(checks, SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGETS.every(target => chunkIds.includes(target.chunkId)), 'bounded verified/readable retrieval chunks exist or are buildable', chunkIds.join(', ') || 'missing')
  addCheck(checks, list(repair.chunks).every(chunk => chunk.metadata?.noLiveExtraction === true), 'bounded retrieval chunks record no live extraction', JSON.stringify(list(repair.chunks).map(chunk => chunk.metadata || {})))
  addCheck(checks, list(repair.chunks).every(chunk => chunk.metadata?.noProviderCall === true), 'bounded retrieval chunks record no provider call', JSON.stringify(list(repair.chunks).map(chunk => chunk.metadata || {})))
  addCheck(checks, list(repair.chunks).every(chunk => chunk.metadata?.noSourceReadWrite === true), 'bounded retrieval chunks record no live source read/write', JSON.stringify(list(repair.chunks).map(chunk => chunk.metadata || {})))

  if (repairRequired) {
    for (const check of repair.evaluation.checks) addCheck(checks, check.ok, check.check, check.detail)
    addCheck(checks, repair.evaluation.status === 'healthy', 'live verified source routing repair snapshot is healthy', repair.evaluation.failures.map(failure => failure.check).join(', ') || 'healthy')
  } else {
    addCheck(checks, repair.beforeRows.length === SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGETS.length, 'target source maturity rows exist before apply', `${repair.beforeRows.length}/${SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGETS.length}`)
    addCheck(checks, repair.beforeRows.every(row => row.nextGap === 'routed'), 'target sources start at routed gap before apply', repair.beforeRows.map(row => `${row.sourceId || 'missing'}:${row.nextGap || 'missing'}`).join(', '))
    addCheck(checks, repair.beforeRows.every(row => Number(row.metrics?.routeSignals || 0) === 0), 'target sources start without route signal before apply', repair.beforeRows.map(row => `${row.sourceId || 'missing'}:${row.metrics?.routeSignals ?? 'missing'}`).join(', '))
    addCheck(checks, repair.candidates.every(candidate => candidate.ok), 'source-backed route candidates exist before apply', repair.candidates.flatMap(candidate => list(candidate.failures).map(failure => `${candidate.sourceId}:${failure}`)).join(', ') || repair.candidates.map(candidate => candidate.sourceId).join(', '))
    addCheck(checks, repair.records.every(record => record.ok), 'route repair records verify before apply', repair.records.flatMap(record => list(record.failures).map(failure => `${record.sourceId}:${failure}`)).join(', ') || repair.records.map(record => record.route?.routeId).join(', '))
  }

  addCheck(checks, planSource.includes('intelligence_retrieval_chunks') && planSource.includes('reject substring-only') && planSource.includes('full `process:foundation-ship`'), 'plan names real behavior proof and full ship gate', SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_PLAN_PATH)
  addCheck(checks, (await readRepoFile('lib/source-maturity-routing-gap-repair-db.js')).includes('applySourceMaturityRoutingRepairRecords'), 'shared route DB helper exists', 'lib/source-maturity-routing-gap-repair-db.js')
  const actionRouterSource = await readRepoFile('lib/intelligence-action-router.js')
  const strategyRoutesSource = await readRepoFile('lib/strategy-shared-comms-routes.js')
  addCheck(
    checks,
    actionRouterSource.includes('strategyRecentRoutes') &&
      strategyRoutesSource.includes('strategyRecentRoutes') &&
      strategyRoutesSource.includes('uniqueRoutesById'),
    'Strategy Hub route window is protected from operational route churn',
    'strategyRecentRoutes dedicated window',
  )
  addCheck(checks, (await readRepoFile('lib/foundation-build-closeout-source-records.js')).includes(SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CLOSEOUT_KEY), 'closeout registry includes verified source routing repair record', SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CLOSEOUT_KEY)
  addCheck(checks, (await readRepoFile('lib/foundation-verify-coverage-card-ids.js')).includes(SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CARD_ID), 'verifier coverage card list includes verified source routing repair card', SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CARD_ID)
  addCheck(checks, closeoutRecords.some(record => record.key === SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CLOSEOUT_KEY), 'build closeout registry exposes verified source routing repair closeout', SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CLOSEOUT_KEY)
  if (closeCard) {
    const closeoutSource = await readRepoFile(SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CLOSEOUT_PATH)
    addCheck(checks, closeoutSource.includes(SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CLOSEOUT_KEY) && closeoutSource.includes('No live extraction'), 'closeout file is written', SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CLOSEOUT_PATH)
  }

  const findings = checks.filter(check => !check.ok)
  return {
    status: findings.length ? 'risk' : 'healthy',
    cardId: SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CARD_ID,
    closeoutKey: SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CLOSEOUT_KEY,
    stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
    planCritic: { status: planReview.status, score: planReview.score },
    synthetic: { ok: synthetic.ok, routeIds: synthetic.records?.map(record => record.route?.routeId).filter(Boolean) || [] },
    repair: repair.summary,
    checks,
    findings,
    planCriticRuns: planCriticRuns.length,
  }
}

async function main() {
  const args = parseArgs()
  await initFoundationDb()
  try {
    if (args.apply || args.closeCard) await ensureLiveState({ closeCard: args.closeCard, stage: args.stage })
    if (args.closeCard) {
      const closeoutSnapshot = await runRepair({ apply: true })
      await writeCloseout({ summary: closeoutSnapshot.summary })
    }
    const status = await buildStatus({ closeCard: args.closeCard, stage: args.stage })
    if (args.json) {
      console.log(JSON.stringify(status, null, 2))
    } else {
      console.log(`Source maturity verified source routing gap repair check: ${status.status}`)
      console.log(`  Card: ${SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CARD_ID}`)
      console.log(`  Sources: ${SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_TARGETS.map(target => target.sourceId).join(', ')}`)
      console.log(`  Routes: ${list(status.repair.routeIds).join(', ') || 'missing'}`)
      console.log(`  Gaps: ${list(status.repair.beforeNextGaps).join(', ') || 'unknown'} -> ${list(status.repair.afterNextGaps).join(', ') || 'unknown'}`)
      for (const finding of status.findings) console.log(`  BLOCKED ${finding.check}: ${finding.detail}`)
    }
    if (status.status !== 'healthy') process.exitCode = 1
  } finally {
    await closeFoundationDb()
  }
}

main().catch(async error => {
  try { await closeFoundationDb() } catch {}
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({
      status: 'error',
      cardId: SOURCE_MATURITY_VERIFIED_ROUTING_GAP_REPAIR_CARD_ID,
      error: error instanceof Error ? error.message : String(error),
    }, null, 2))
  } else {
    console.error(error)
  }
  process.exitCode = 1
})
