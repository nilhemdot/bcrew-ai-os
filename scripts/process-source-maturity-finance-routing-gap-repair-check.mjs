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
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getFoundationSnapshot,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
  upsertRetrievalChunk,
} from '../lib/foundation-db.js'
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
  SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_APPROVAL_PATH,
  SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CARD_ID,
  SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CHANGED_FILES,
  SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY,
  SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CLOSEOUT_PATH,
  SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_NOT_NEXT_BOUNDARIES,
  SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_PLAN_PATH,
  SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_PROOF_COMMANDS,
  SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_SCRIPT_PATH,
  SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_SPRINT_ID,
  SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_TARGET_ATOM_ID,
  SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_TARGET_CHUNK_ID,
  SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_TARGET_FACT_ID,
  SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID,
  buildFinanceRoutingRetrievalChunk,
  buildFinanceRoutingRepairRecords,
  buildSyntheticFinanceRoutingGapRepairProof,
  renderFinanceRoutingGapRepairCloseout,
} from '../lib/source-maturity-finance-routing-gap-repair.js'
import {
  evaluateSourceMaturityRoutingGapRepair,
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
      'lib/source-maturity-routing-gap-repair-db.js',
      'lib/source-maturity-finance-atom-flow-repair.js',
      'lib/intelligence-retrieval.js',
      'lib/intelligence-action-router.js',
      'lib/action-route-review-inbox.js',
    ],
    existingDocs: [
      'docs/handoffs/2026-05-18-source-maturity-finance-atom-flow-repair-closeout.md',
      'docs/handoffs/2026-05-18-source-maturity-owners-lists-routing-gap-repair-closeout.md',
      'docs/strategy/bhag-model.md',
      'docs/source-registry.md',
    ],
    existingScripts: [
      'scripts/process-source-maturity-finance-atom-flow-repair-check.mjs',
      'scripts/process-source-maturity-owners-lists-routing-gap-repair-check.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: [
      'Finance source fact and atom already exist from prior governed repairs.',
      'Retrieval chunk creation must use the existing atom only and must not read/write Google Sheets.',
      'Action routes are approval-gated internal proposals until an explicit apply workflow is approved.',
    ],
    reused: [
      'Existing SRC-FINANCE-001 source fact.',
      'Existing SRC-FINANCE-001 accepted atom.',
      'Existing retrieval chunk upsert store.',
      'Existing Action Route Review Inbox semantics.',
    ],
    notRebuilt: [
      'No Google Sheets read/write.',
      'No extraction target creation.',
      'No external destination apply.',
      'No live connector/extractor/provider run.',
    ],
    exactGap: 'SRC-FINANCE-001 has a source fact and accepted atom but no retrieval chunk or internal action-route signal, so the live source maturity grid blocks at routed.',
    overBroadRisk: 'Finance routing repair must not fabricate atoms, read Sheets, or silently create trusted backlog/decision/question records.',
    readyBy: 'Steve approved continuous safe overnight Foundation source work; prior Finance atom-flow repair created the exact evidence needed for this route-ready repair.',
    readyAt: '2026-05-18T03:30:00-04:00',
  }
}

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CARD_ID,
    title: 'Repair Finance source maturity routing gap',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P1',
    rank: 38,
    source: 'SOURCE-MATURITY-GAP-FOLLOWUP-001 live maturity queue',
    summary: 'Create a retrieval chunk from the existing Finance atom, then route that source-backed signal into internal review without applying or writing externally.',
    whyItMatters: 'Foundation should complete the Finance source maturity loop from existing governed evidence without touching Sheets, running extraction, or inventing source truth.',
    nextAction: closeCard
      ? `Done under \`${SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY}\`. Continue safe source maturity/source-contract work from live truth.`
      : 'Create the bounded retrieval chunk, create an approval-required pending internal action route, prove no destination apply/external write, and clear the routed-stage maturity gap.',
    statusNote: closeCard
      ? `Closed under \`${SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY}\`; SRC-FINANCE-001 now has a retrieval chunk and approval-required pending route signal.`
      : `Scope/proof: \`${SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY}\`; no Sheets read/write, live extraction, auth/provider, or external-write work.`,
    owner: 'Foundation Source',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    cardId: SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : normalizedStage,
    planRef: SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_PLAN_PATH,
    definitionOfDone: 'SRC-FINANCE-001 has one active retrieval chunk backed by the existing accepted atom plus an approval-required pending internal action route; source maturity no longer blocks at routed for that source; no Google Sheets read/write, destination record apply, live extraction, or external write occurs; focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
    proofCommands: SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_PROOF_COMMANDS,
    readinessBlockerCleared: 'SOURCE-MATURITY-FINANCE-ATOM-FLOW-REPAIR-001 created the accepted atom needed for bounded chunk and route repair.',
    notNextBoundaries: SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_APPROVAL_PATH,
      closeoutKey: SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, stage = 'building_now' } = {}) {
  const planSource = await readRepoFile(SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_PLAN_PATH)
  const card = buildCardRow({ closeCard, stage })
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card,
    changedFiles: SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CHANGED_FILES,
    declaredRisk: 'internal intelligence retrieval/action-route DB rows and source maturity verification surface',
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
        `source-maturity-finance-routing-${stableRunId(SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_PLAN_PATH)}`,
        SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CARD_ID,
        SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_PLAN_PATH,
        planReview.status,
        planReview.score,
        planReview.maxScore,
        planReview.passThreshold,
        card.priority,
        'full',
        true,
        SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CARD_ID }),
        'codex-source-maturity-finance-routing-gap-repair',
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-source-maturity-finance-routing-gap-repair',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        card.id,
        `${closeCard ? 'Closed' : 'Updated'} ${SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CARD_ID}.`,
        JSON.stringify({ closeoutKey: SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY, stage }),
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
    scriptPath: SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_SCRIPT_PATH,
    operation: 'create/update Finance source maturity routing repair backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  const upsert = await upsertLiveCardAndPlanCritic({ closeCard, stage: normalizedStage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_SPRINT_ID,
        status: 'active',
        goal: 'Repair the Finance source maturity routed-stage gap with a bounded retrieval chunk and approval-required internal action route.',
        activeBlockerCardId: closeCard ? null : SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizedStage,
          startedBy: 'codex-source-maturity-finance-routing-gap-repair',
          currentStatus: closeCard ? 'complete' : normalizedStage,
          closeoutKey: SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Commit/push, then continue the next safe Foundation-up card from repo truth.'
            : 'Create the bounded retrieval chunk and pending approval-required route from existing Finance evidence only.',
          priorityOrder: [SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CARD_ID],
          notNext: SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'SRC-FINANCE-001 receives one active retrieval chunk backed by the existing atom.',
            'SRC-FINANCE-001 receives a pending internal action route backed by fact, atom, and chunk refs.',
            'No route is applied and no destination record is created.',
            'Source maturity no longer blocks at routed for SRC-FINANCE-001.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage: normalizedStage })],
    },
    'codex-source-maturity-finance-routing-gap-repair',
    {
      apply: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      replaceItems: true,
      allowItemReplacement: true,
      reason: closeCard
        ? 'Close Finance source maturity routing gap repair sprint item after focused proof.'
        : 'Start Finance source maturity routing gap repair sprint item with complete scaffold metadata.',
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
          WHERE fact_id = $1
            AND ($2 = ANY(source_ids) OR source_id = $2)
            AND status = 'active'
            AND min_tier <= 1
          LIMIT 1
        `,
        [SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_TARGET_FACT_ID, SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID],
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
          LIMIT 1
        `,
        [SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID, SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_TARGET_ATOM_ID],
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
          LIMIT 1
        `,
        [SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID, SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_TARGET_CHUNK_ID],
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
        [SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID],
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

async function ensureRetrievalChunk({ applyRepair = false, evidence = {} } = {}) {
  const fact = evidence.facts?.[0] || null
  const atom = evidence.atoms?.[0] || null
  const existing = evidence.chunks?.[0] || null
  if (existing) return existing
  if (!fact || !atom) return null
  const chunk = buildFinanceRoutingRetrievalChunk(atom, fact)
  if (!applyRepair) return chunk
  return upsertRetrievalChunk(chunk, 'codex-source-maturity-finance-routing-gap-repair')
}

async function buildLiveRepairSnapshot({ applyRepair = false } = {}) {
  const beforeGrid = await buildSourceMaturityGrid()
  const beforeRow = beforeGrid.rows.find(row => row.sourceId === SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID) || {}
  const evidence = await loadTargetEvidence()
  const chunk = await ensureRetrievalChunk({ applyRepair, evidence })
  const candidate = selectSourceMaturityRoutingRepairCandidate({
    sourceId: SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID,
    facts: evidence.facts,
    atoms: evidence.atoms,
    chunks: chunk ? [chunk] : evidence.chunks,
  })
  const records = buildFinanceRoutingRepairRecords(candidate)
  let routeRow = evidence.routes.find(route => route.routeId === records.route?.routeId) || null
  if (applyRepair && records.ok) {
    routeRow = await applySourceMaturityRoutingRepairRecords(records, {
      actor: 'codex-source-maturity-finance-routing-gap-repair',
      changeSummary: `Proposed Finance source maturity routing repair route for ${records.sourceId}.`,
    })
  }
  const afterGrid = await buildSourceMaturityGrid()
  const afterRow = afterGrid.rows.find(row => row.sourceId === SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_TARGET_SOURCE_ID) || {}
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
    fact: evidence.facts?.[0] || null,
    atom: evidence.atoms?.[0] || null,
    chunk,
    routeRow,
    candidate,
    records,
    evaluation,
    summary: evaluation.summary,
    checks: evaluation.checks,
    failures: evaluation.failures,
    status: evaluation.status,
  }
}

async function writeCloseout(snapshot) {
  await fs.writeFile(
    path.join(repoRoot, SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CLOSEOUT_PATH),
    renderFinanceRoutingGapRepairCloseout(snapshot),
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

  const planSource = await readRepoFile(SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_PLAN_PATH)
  const packageJson = JSON.parse(await readRepoFile('package.json'))
  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_APPROVAL_PATH,
    cardId: SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CARD_ID,
  })
  const planReview = upsert?.planReview || evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard, stage: args.stage }),
    changedFiles: SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CHANGED_FILES,
    declaredRisk: 'internal intelligence retrieval/action-route DB rows and source maturity verification surface',
    repoRoot,
  })
  const applyRepairNow = args.apply && normalizeStage(args.stage) === 'building_now'
  const live = await buildLiveRepairSnapshot({ applyRepair: applyRepairNow || args.closeCard })
  const synthetic = buildSyntheticFinanceRoutingGapRepairProof()
  const cards = await getBacklogItemsByIds([SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CARD_ID])
  const activeSprint = await getActiveFoundationCurrentSprint()
  const planCriticRuns = await getPlanCriticRunsByCardIds([SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CARD_ID])
  const closeouts = getFoundationBuildCloseouts()
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: activeSprint?.sprint,
    items: activeSprint?.items || [],
    backlogItems: cards,
    closeouts,
    planCriticRuns,
  })
  const activeItem = list(activeSprint?.items).find(item => item.cardId === SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CARD_ID) || null
  const card = cards[0] || buildCardRow({ closeCard: args.closeCard, stage: args.stage })
  const cardLane = text(card.lane)

  addCheck(checks, packageJson.scripts?.['process:source-maturity-finance-routing-gap-repair-check'] === `node --env-file-if-exists=.env ${SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:source-maturity-finance-routing-gap-repair-check'] || 'missing')
  addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'approval file is valid v2', approvalValidation.failures?.map(failure => failure.check).join(', ') || 'ok')
  addCheck(checks, planReview.status === 'pass' && planReview.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes', `score=${planReview.score}`)
  addCheck(checks, Boolean(cards[0]), 'live backlog card exists', card.id || card.cardId || 'missing')
  addCheck(checks, args.closeCard ? cardLane === 'done' : ['scoped', 'executing'].includes(cardLane), 'live backlog card is in expected lane', cardLane || 'missing')
  addCheck(checks, Boolean(activeItem), 'Current Sprint includes Finance repair item', activeItem?.stage || 'missing')
  addCheck(checks, activeItem ? activeItem.planRef === SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_PLAN_PATH : false, 'Current Sprint item has plan ref', activeItem?.planRef || 'missing')
  addCheck(checks, activeItem ? list(activeItem.proofCommands).includes('npm run process:source-maturity-finance-routing-gap-repair-check -- --close-card --json') : false, 'Current Sprint proof commands include close-card proof', list(activeItem?.proofCommands).join('; ') || 'missing')
  const onlyPreShipCloseoutFinding = args.closeCard &&
    list(currentSprintStatus.findings).length === 1 &&
    currentSprintStatus.findings[0]?.check === 'done_this_sprint_requires_recent_work_closeout'
  addCheck(
    checks,
    currentSprintStatus.status === 'healthy' || onlyPreShipCloseoutFinding,
    'Current Sprint status is not risk except pre-ship Recent Work closeout sync',
    onlyPreShipCloseoutFinding ? 'pre-ship closeout sync is proven by process:foundation-ship' : currentSprintStatus.findings?.map(finding => finding.detail).join('; ') || 'healthy',
  )
  addCheck(checks, synthetic.ok, 'synthetic Finance routing-gap dogfood passes', synthetic.evaluation?.failures?.map(failure => failure.check).join(', ') || 'ok')
  addCheck(checks, live.fact?.fact_id === SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_TARGET_FACT_ID || live.fact?.factId === SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_TARGET_FACT_ID, 'live candidate uses the bounded Finance fact', live.fact?.fact_id || live.fact?.factId || 'missing')
  addCheck(checks, live.atom?.atom_id === SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_TARGET_ATOM_ID || live.atom?.atomId === SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_TARGET_ATOM_ID, 'live candidate uses the bounded Finance atom', live.atom?.atom_id || live.atom?.atomId || 'missing')
  addCheck(checks, live.chunk?.chunk_id === SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_TARGET_CHUNK_ID || live.chunk?.chunkId === SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_TARGET_CHUNK_ID, 'bounded Finance retrieval chunk exists or is buildable', live.chunk?.chunk_id || live.chunk?.chunkId || 'missing')

  const repairRequired = applyRepairNow || args.closeCard || Boolean(live.routeRow)
  if (repairRequired) {
    for (const check of live.checks) addCheck(checks, check.ok, check.check, check.detail)
    addCheck(checks, live.status === 'healthy', 'live Finance repair snapshot is healthy', live.failures.map(failure => failure.check).join(', ') || 'healthy')
  } else {
    addCheck(checks, live.beforeRow.nextGap === 'routed', 'target source starts at routed gap', `${live.beforeRow.sourceId || 'missing'}:${live.beforeRow.nextGap || 'missing'}`)
    addCheck(checks, Number(live.beforeRow.metrics?.routeSignals || 0) === 0, 'target source starts without route signal', String(live.beforeRow.metrics?.routeSignals ?? 'missing'))
    addCheck(checks, Boolean(live.fact), 'source-backed Finance fact exists before mutation', SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_TARGET_FACT_ID)
    addCheck(checks, Boolean(live.atom), 'source-backed Finance atom exists before mutation', SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_TARGET_ATOM_ID)
    addCheck(checks, live.records.ok, 'Finance repair records verify before mutation', list(live.records.failures).join(', ') || live.records.route?.routeId)
  }
  addCheck(checks, planSource.includes('intelligence_retrieval_chunks') && planSource.includes('reject substring-only') && planSource.includes('full `process:foundation-ship`'), 'plan names real behavior proof and full ship gate', SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_PLAN_PATH)
  addCheck(checks, (await readRepoFile('lib/source-maturity-routing-gap-repair-db.js')).includes('applySourceMaturityRoutingRepairRecords'), 'shared route DB helper exists', 'lib/source-maturity-routing-gap-repair-db.js')
  addCheck(checks, (await readRepoFile('lib/foundation-build-closeout-source-records.js')).includes(SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY), 'closeout registry includes Finance repair record', SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY)
  addCheck(checks, (await readRepoFile('lib/foundation-verify-coverage-card-ids.js')).includes(SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CARD_ID), 'verifier coverage card list includes Finance repair card', SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CARD_ID)
  addCheck(checks, closeouts.some(record => record.key === SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY), 'build closeout registry exposes Finance repair closeout', SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY)

  if (args.closeCard) {
    await writeCloseout(live)
    const closeoutSource = await readRepoFile(SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CLOSEOUT_PATH)
    addCheck(checks, closeoutSource.includes(SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY) && closeoutSource.includes('No live extraction'), 'closeout file is written', SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CLOSEOUT_PATH)
  }

  const findings = checks.filter(check => !check.ok)
  const result = {
    status: findings.length ? 'risk' : 'healthy',
    cardId: SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CARD_ID,
    closeoutKey: SOURCE_MATURITY_FINANCE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY,
    stage: args.closeCard ? 'done_this_sprint' : normalizeStage(args.stage),
    planCritic: { status: planReview.status, score: planReview.score },
    synthetic: { ok: synthetic.ok, routeId: synthetic.records?.route?.routeId || null },
    repair: live.summary,
    checks,
    findings,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Source maturity Finance routing gap repair check: ${result.status}`)
    console.log(`SOURCE_MATURITY_FINANCE_ROUTING_REPAIR_SUMMARY ${JSON.stringify(result.repair)}`)
    for (const finding of findings) console.log(`- ${finding.check}: ${finding.detail}`)
  }

  await closeFoundationDb()
  if (findings.length) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
