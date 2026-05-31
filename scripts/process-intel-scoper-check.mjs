#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
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
  PLAN_CRITIC_MIN_PASS_SCORE,
  buildPlanCriticResultSummary,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import {
  INTEL_SCOPER_APPROVAL_PATH,
  INTEL_SCOPER_CARD_ID,
  INTEL_SCOPER_CHANGED_FILES,
  INTEL_SCOPER_CLOSEOUT_KEY,
  INTEL_SCOPER_CLOSEOUT_PATH,
  INTEL_SCOPER_NEXT_CARD_ID,
  INTEL_SCOPER_NOT_NEXT_BOUNDARIES,
  INTEL_SCOPER_PLAN_PATH,
  INTEL_SCOPER_PROOF_COMMANDS,
  INTEL_SCOPER_SCRIPT_PATH,
  INTEL_SCOPER_SPRINT_ID,
  buildIntelScoperDogfoodProof,
  buildIntelScoperOutputs,
  evaluateIntelScoperSnapshot,
  intelScoperSchemaSql,
} from '../lib/intel-scoper.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-intel-scoper'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
  }
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function stableRunId(seed = '') {
  return crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 12)
}

async function readRepoFile(relativePath, { optional = false } = {}) {
  try {
    return await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
  } catch (error) {
    if (optional && error?.code === 'ENOENT') return ''
    throw error
  }
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

function ensureTextIncludes(value = '', required = '') {
  const text = String(value || '').trim()
  if (!required || text.includes(required)) return text
  return `${text}${text ? ' ' : ''}${required}`.trim()
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean)
  if (!value) return []
  if (typeof value === 'string') {
    return value.replace(/^{|}$/g, '').split(',').map(item => item.trim()).filter(Boolean)
  }
  return []
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: INTEL_SCOPER_CARD_ID,
    title: 'Build the gap-resolving Scoper',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 16,
    source: 'Strategic Intelligence issue ledger, DECISION-008 accountability outputs, old-system scoper lesson, and Steve direction that gold from chat/audits must not get lost.',
    summary: 'Build an on-demand Scoper that converts source-backed strategic issues into structured, proposal-only gap outputs with evidence refs, owner paths, smallest next steps, and blocked auto-action boundaries.',
    whyItMatters: 'Strategic Intelligence is only useful if surfaced issues become clear accountability choices without recreating old report piles or disconnected backlog work.',
    nextAction: closeCard
      ? `Done under ${INTEL_SCOPER_CLOSEOUT_KEY}; continue ${INTEL_SCOPER_NEXT_CARD_ID}.`
      : 'Create the v1 scoper output ledger and five-row human sample from strategic issues, DECISION-008 outputs, routes, source refs, atoms, and chunks.',
    statusNote: closeCard
      ? `Closed v1 under ${INTEL_SCOPER_CLOSEOUT_KEY}; scoper outputs are DB-backed, proposal-only, evidence-bound, and Current Sprint advances to ${INTEL_SCOPER_NEXT_CARD_ID}.`
      : 'Executing v1: no provider calls, no extraction, no external writes, no auto-created backlog, no applied decisions.',
    owner: 'Foundation Intelligence',
  }
}

function buildNextCardRow(existing = {}) {
  let nextAction = existing.nextAction || 'Render live source-backed values across the system.'
  nextAction = ensureTextIncludes(nextAction, `Start from ${INTEL_SCOPER_CLOSEOUT_KEY} where strategic issues now have scoped proposal outputs and preserved evidence refs.`)
  let statusNote = existing.statusNote || ''
  statusNote = ensureTextIncludes(statusNote, `Unblocked by ${INTEL_SCOPER_CLOSEOUT_KEY}; DATA-003 should render live values from source-backed tables instead of markdown snapshots.`)
  return {
    ...existing,
    id: INTEL_SCOPER_NEXT_CARD_ID,
    title: existing.title || 'Render live source-backed values across the system',
    lane: existing.lane === 'done' ? existing.lane : 'scoped',
    priority: existing.priority || 'P0',
    rank: existing.rank || 17,
    nextAction,
    statusNote,
    owner: existing.owner || 'Foundation Data',
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/strategic-intel-loop.js',
      'lib/decision-008-accountability-doctrine.js',
      'lib/intelligence-atoms.js',
      'lib/intelligence-action-router.js',
      'lib/research-inbox.js',
      'lib/implementation-intelligence.js',
    ],
    existingTables: [
      'intelligence_strategic_issues',
      'intelligence_strategic_issue_events',
      'intelligence_action_routes',
      'intelligence_atoms',
      'intelligence_retrieval_chunks',
      'decisions',
      'open_questions',
    ],
    existingPolicy: [
      'Scoper output is proposal-only and cannot auto-create backlog cards.',
      'Detected decisions remain proposed until separately approved.',
      'Strategic issue resolution feedback must write back to issue events.',
      'Source-backed evidence refs must survive every scoping step.',
      'Blockers block unsafe actions, not the whole sprint when safe work remains.',
    ],
    existingDocs: [
      INTEL_SCOPER_PLAN_PATH,
      'docs/process/strategic-intel-001-plan.md',
      'docs/process/decision-008-plan.md',
      'docs/process/internal-scoper-001-plan.md',
      'docs/_archive/audits/2026-05-19-old-system-research-team-harvest.md',
    ],
    existingScripts: [
      'process:strategic-intel-check',
      'process:decision-008-check',
      'process:implementation-intelligence-check',
      'process:system-health-nightly-audit-check',
      'process:build-lane-repeated-failure-action-gate-check',
      'backlog:hygiene',
      'foundation:verify',
      'process:foundation-ship',
    ],
    exactGap: 'The system had strategic issues and DECISION-008 accountability outputs, but no durable scoper output that says what is already answered, partial, missing, stale/test-like, or human-context-bound.',
    reused: 'Reuses Strategic Intelligence, DECISION-008, Action Router, atoms/retrieval, old-system scoper lessons, and Current Sprint/backlog gates.',
    overBroadRisk: 'Scoper could become an autonomous agent or backlog mutator. V1 is DB-local, deterministic, proposal-only, and human-approved.',
    readyBy: 'Steve approved unattended continuation and specifically asked that discussed gold become carded/durable before more work is lost.',
    readyAt: '2026-05-20T00:50:00-04:00',
    notRebuilt: 'No LLM scoper, no source extraction, no Strategy UI, no auto-opened backlog cards, no external writes.',
  }
}

async function tableExists(client, tableName) {
  const result = await client.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = $1
      ) AS exists
    `,
    [tableName],
  )
  return result.rows[0]?.exists === true
}

async function loadIntelScoperSnapshot(client) {
  const hasScoperTable = await tableExists(client, 'intelligence_scoper_outputs')
  const issueResult = await client.query(
    `
      SELECT *
      FROM intelligence_strategic_issues
      WHERE metadata->>'cardId' = 'STRATEGIC-INTEL-001'
        AND status IN ('surfaced','triage','scoped')
      ORDER BY
        CASE WHEN resolution_ref = $1 THEN 0 ELSE 1 END,
        CASE WHEN COALESCE(array_length(route_refs, 1), 0) > 0 THEN 0 ELSE 1 END,
        CASE impact WHEN 'needle_mover' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        updated_at DESC
      LIMIT 25
    `,
    ['decision-008-accountability-doctrine-v1'],
  )
  const issues = issueResult.rows
  const issueIds = issues.map(issue => issue.issue_id).filter(Boolean)
  const routeIds = Array.from(new Set(issues.flatMap(issue => normalizeArray(issue.route_refs))))
  const sourceIds = Array.from(new Set(issues.flatMap(issue => normalizeArray(issue.source_ids))))
  const atomIds = Array.from(new Set(issues.flatMap(issue => normalizeArray(issue.atom_refs))))
  const synthesizedItemIds = Array.from(new Set(issues.flatMap(issue => normalizeArray(issue.synthesized_item_refs))))

  const routeResult = routeIds.length || sourceIds.length || atomIds.length || synthesizedItemIds.length
    ? await client.query(
      `
        SELECT *
        FROM intelligence_action_routes
        WHERE route_id = ANY($1::text[])
           OR source_ids && $2::text[]
           OR atom_refs && $3::text[]
           OR evidence_refs && $3::text[]
           OR synthesized_item_id = ANY($4::text[])
        ORDER BY updated_at DESC
        LIMIT 120
      `,
      [routeIds, sourceIds, atomIds, synthesizedItemIds],
    )
    : { rows: [] }

  const atomResult = atomIds.length
    ? await client.query(
      `
        SELECT *
        FROM intelligence_atoms
        WHERE atom_id = ANY($1::text[])
        ORDER BY updated_at DESC
        LIMIT 120
      `,
      [atomIds],
    )
    : { rows: [] }

  const decisionResult = await client.query(
    `
      SELECT *
      FROM decisions
      WHERE id LIKE 'DECISION-008-%'
         OR source_ref LIKE 'DECISION-008%'
         OR evidence_notes LIKE '%strategic-issue:%'
      ORDER BY updated_at DESC
      LIMIT 120
    `,
  )

  const openQuestionResult = await client.query(
    `
      SELECT *
      FROM open_questions
      WHERE id LIKE 'OPEN-DECISION-008-%'
         OR summary LIKE '%strategic-issue:%'
      ORDER BY updated_at DESC
      LIMIT 120
    `,
  )

  const eventResult = issueIds.length
    ? await client.query(
      `
        SELECT *
        FROM intelligence_strategic_issue_events
        WHERE issue_id = ANY($1::text[])
        ORDER BY created_at DESC
        LIMIT 200
      `,
      [issueIds],
    )
    : { rows: [] }

  const persistedOutputResult = hasScoperTable
    ? await client.query(
      `
        SELECT *
        FROM intelligence_scoper_outputs
        ORDER BY updated_at DESC
        LIMIT 50
      `,
    )
    : { rows: [] }

  const sourceSnapshot = {
    tableExists: hasScoperTable,
    issues,
    routes: routeResult.rows,
    atoms: atomResult.rows,
    decisions: decisionResult.rows,
    openQuestions: openQuestionResult.rows,
    events: eventResult.rows,
    outputs: persistedOutputResult.rows,
  }
  sourceSnapshot.candidateOutputs = buildIntelScoperOutputs(sourceSnapshot, { limit: 5 })
  return sourceSnapshot
}

async function ensureIntelScoperSchema(client) {
  await client.query(intelScoperSchemaSql)
}

async function upsertScoperOutputs(client, outputs = []) {
  for (const output of outputs) {
    const metadata = {
      ...(output.metadata || {}),
      proposalOnly: true,
      writesBacklog: false,
      opensSprint: false,
      autoApproved: false,
      requiresHumanApproval: true,
      noExternalWrite: true,
    }
    await client.query(
      `
        INSERT INTO intelligence_scoper_outputs (
          scoper_output_id, issue_id, status, proposed_card_id, title, summary,
          owner, confidence, source_ids, fact_refs, atom_refs, chunk_refs,
          synthesized_item_refs, route_refs, decision_refs, open_question_refs,
          event_refs, existing_answer_refs, gap_statements, smallest_next_steps,
          blocked_actions, proof_refs, proposal, metadata
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9::text[],$10::text[],$11::text[],$12::text[],
          $13::text[],$14::text[],$15::text[],$16::text[],$17::text[],$18::text[],
          $19::text[],$20::text[],$21::text[],$22::text[],$23::jsonb,$24::jsonb
        )
        ON CONFLICT (scoper_output_id) DO UPDATE SET
          status = EXCLUDED.status,
          proposed_card_id = EXCLUDED.proposed_card_id,
          title = EXCLUDED.title,
          summary = EXCLUDED.summary,
          owner = EXCLUDED.owner,
          confidence = EXCLUDED.confidence,
          source_ids = EXCLUDED.source_ids,
          fact_refs = EXCLUDED.fact_refs,
          atom_refs = EXCLUDED.atom_refs,
          chunk_refs = EXCLUDED.chunk_refs,
          synthesized_item_refs = EXCLUDED.synthesized_item_refs,
          route_refs = EXCLUDED.route_refs,
          decision_refs = EXCLUDED.decision_refs,
          open_question_refs = EXCLUDED.open_question_refs,
          event_refs = EXCLUDED.event_refs,
          existing_answer_refs = EXCLUDED.existing_answer_refs,
          gap_statements = EXCLUDED.gap_statements,
          smallest_next_steps = EXCLUDED.smallest_next_steps,
          blocked_actions = EXCLUDED.blocked_actions,
          proof_refs = EXCLUDED.proof_refs,
          proposal = EXCLUDED.proposal,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      `,
      [
        output.scoperOutputId,
        output.issueId,
        output.status,
        output.proposedCardId,
        output.title,
        output.summary,
        output.owner,
        output.confidence,
        output.sourceIds,
        output.factRefs,
        output.atomRefs,
        output.chunkRefs,
        output.synthesizedItemRefs,
        output.routeRefs,
        output.decisionRefs,
        output.openQuestionRefs,
        output.eventRefs,
        output.existingAnswerRefs,
        output.gapStatements,
        output.smallestNextSteps,
        output.blockedActions,
        output.proofRefs,
        JSON.stringify(output.proposal || {}),
        JSON.stringify(metadata),
      ],
    )
    await client.query(
      `
        UPDATE intelligence_strategic_issues
        SET status = CASE WHEN status IN ('surfaced','triage') THEN 'scoped' ELSE status END,
            scoped_card_refs = (
              SELECT ARRAY(
                SELECT DISTINCT value
                FROM unnest(scoped_card_refs || ARRAY[$2]::text[]) AS value
                WHERE value IS NOT NULL AND value <> ''
              )
            ),
            metadata = metadata || $3::jsonb,
            updated_at = NOW()
        WHERE issue_id = $1
      `,
      [
        output.issueId,
        output.proposedCardId,
        JSON.stringify({
          intelScoper: {
            cardId: INTEL_SCOPER_CARD_ID,
            closeoutKey: INTEL_SCOPER_CLOSEOUT_KEY,
            scoperOutputId: output.scoperOutputId,
            proposedCardId: output.proposedCardId,
            status: output.status,
            proposalOnly: true,
          },
        }),
      ],
    )
    await client.query(
      `
        INSERT INTO intelligence_strategic_issue_events (
          event_id, issue_id, event_type, previous_status, next_status,
          route_refs, scoped_card_refs, resolution_ref, actor, summary, metadata
        )
        VALUES ($1,$2,'scoped',NULL,'scoped',$3::text[],$4::text[],$5,$6,$7,$8::jsonb)
        ON CONFLICT (event_id) DO UPDATE SET
          route_refs = EXCLUDED.route_refs,
          scoped_card_refs = EXCLUDED.scoped_card_refs,
          resolution_ref = EXCLUDED.resolution_ref,
          actor = EXCLUDED.actor,
          summary = EXCLUDED.summary,
          metadata = EXCLUDED.metadata
      `,
      [
        `strategic-event:${output.issueId}:intel-scoper-v1`,
        output.issueId,
        output.routeRefs,
        [output.proposedCardId],
        INTEL_SCOPER_CLOSEOUT_KEY,
        ACTOR,
        `INTEL-SCOPER-001 created proposal-only scoper output ${output.scoperOutputId} with status ${output.status}; no backlog card or external action was auto-created.`,
        JSON.stringify({
          cardId: INTEL_SCOPER_CARD_ID,
          closeoutKey: INTEL_SCOPER_CLOSEOUT_KEY,
          scoperOutputId: output.scoperOutputId,
          proposedCardId: output.proposedCardId,
          proposalOnly: true,
          noExternalWrite: true,
        }),
      ],
    )
  }
}

async function applyIntelScoperProofState(client, outputs = []) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: INTEL_SCOPER_SCRIPT_PATH,
    operation: 'create proposal-only INTEL-SCOPER output rows and issue scoped events',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
  if (outputs.length < 5) throw new Error(`INTEL-SCOPER requires at least 5 candidate outputs; got ${outputs.length}.`)
  await client.query('BEGIN')
  try {
    await ensureIntelScoperSchema(client)
    await client.query(
      `
        DELETE FROM intelligence_scoper_outputs
        WHERE metadata->>'closeoutKey' = $1
      `,
      [INTEL_SCOPER_CLOSEOUT_KEY],
    )
    await upsertScoperOutputs(client, outputs)
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ('intelligence_action_route_curated','intelligence_scoper_outputs',$1,$2,$3,$4::jsonb)
      `,
      [
        INTEL_SCOPER_CLOSEOUT_KEY,
        ACTOR,
        `INTEL-SCOPER-001 created ${outputs.length} proposal-only scoper outputs.`,
        JSON.stringify({
          cardId: INTEL_SCOPER_CARD_ID,
          closeoutKey: INTEL_SCOPER_CLOSEOUT_KEY,
          outputCount: outputs.length,
          proposalOnly: true,
          noExternalWrite: true,
        }),
      ],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}

async function upsertBacklogRows({ closeCard = false, nextCard = {} } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const rows = [buildCardRow({ closeCard }), buildNextCardRow(nextCard)]
  try {
    await client.query('BEGIN')
    for (const row of rows) {
      await client.query(
        `
          INSERT INTO backlog_items (
            id, title, team, lane, priority, rank, source, summary,
            why_it_matters, next_action, status_note, owner
          )
          VALUES ($1,$2,'foundation',$3,$4,$5,$6,$7,$8,$9,$10,$11)
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
        [row.id, row.title, row.lane, row.priority, row.rank, row.source, row.summary, row.whyItMatters, row.nextAction, row.statusNote, row.owner],
      )
    }
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,$3,$4,$5::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        INTEL_SCOPER_CARD_ID,
        ACTOR,
        `${closeCard ? 'Closed' : 'Updated'} ${INTEL_SCOPER_CARD_ID}.`,
        JSON.stringify({
          closeoutKey: INTEL_SCOPER_CLOSEOUT_KEY,
          activeBlockerCardId: closeCard ? INTEL_SCOPER_NEXT_CARD_ID : INTEL_SCOPER_CARD_ID,
        }),
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
}

async function upsertPlanCriticRun(planReview) {
  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,$9)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result,
            created_at = NOW()
      `,
      [
        `intel-scoper-${stableRunId(INTEL_SCOPER_PLAN_PATH)}`,
        INTEL_SCOPER_CARD_ID,
        INTEL_SCOPER_PLAN_PATH,
        planReview.status,
        planReview.score,
        INTEL_SCOPER_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({
          status: planReview.status,
          score: planReview.score,
          cardId: INTEL_SCOPER_CARD_ID,
          closeoutKey: INTEL_SCOPER_CLOSEOUT_KEY,
        }),
        ACTOR,
      ],
    )
  } finally {
    client.release()
    await pool.end()
  }
}

async function closeCardAndAdvanceSprint({ planReview, activeSprint, nextCard } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: INTEL_SCOPER_SCRIPT_PATH,
    operation: 'close INTEL-SCOPER-001 and advance Current Sprint',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
  await upsertBacklogRows({ closeCard: true, nextCard })
  await upsertPlanCriticRun(planReview)

  const previous = activeSprint || await getActiveFoundationCurrentSprint()
  const existing = Array.isArray(previous.items) ? previous.items : []
  const items = existing.map((item, index) => {
    if (item.cardId === INTEL_SCOPER_CARD_ID) {
      return {
        ...item,
        order: item.order || index + 1,
        stage: 'done_this_sprint',
        planRef: INTEL_SCOPER_PLAN_PATH,
        definitionOfDone: 'At least five source-backed strategic issues have proposal-only scoper outputs that classify answered/partial/gap/stale/context state, preserve evidence refs, and block auto-action.',
        proofCommands: INTEL_SCOPER_PROOF_COMMANDS,
        nextAction: `Continue ${INTEL_SCOPER_NEXT_CARD_ID}; INTEL-SCOPER proposal-only outputs are live.`,
        notNextBoundaries: Array.from(new Set([...(item.notNextBoundaries || []), ...INTEL_SCOPER_NOT_NEXT_BOUNDARIES])),
        metadata: {
          ...(item.metadata || {}),
          closeoutKey: INTEL_SCOPER_CLOSEOUT_KEY,
          approvalRef: INTEL_SCOPER_APPROVAL_PATH,
          outputTable: 'intelligence_scoper_outputs',
          proposalOnly: true,
        },
        existingWorkCheck: buildExistingWorkCheck(),
      }
    }
    if (item.cardId === INTEL_SCOPER_NEXT_CARD_ID) {
      return {
        ...item,
        order: item.order || index + 1,
        stage: 'scoping',
        planRef: item.planRef || 'docs/process/data-003-plan.md',
        nextAction: ensureTextIncludes(item.nextAction || '', `Use ${INTEL_SCOPER_CLOSEOUT_KEY} outputs as evidence-bound source of scoped strategic gaps.`),
        metadata: {
          ...(item.metadata || {}),
          unblockedBy: INTEL_SCOPER_CARD_ID,
          inputLedger: 'intelligence_scoper_outputs',
        },
      }
    }
    return { ...item, order: item.order || index + 1 }
  })

  return upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: previous.sprint?.sprintId || INTEL_SCOPER_SPRINT_ID,
        status: 'active',
        activeBlockerCardId: INTEL_SCOPER_NEXT_CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: 'intel_scoper_done',
          lastClosedCardId: INTEL_SCOPER_CARD_ID,
          nextAction: `Continue ${INTEL_SCOPER_NEXT_CARD_ID}; Scoper output ledger is live.`,
        },
      },
      items,
      mutation: {
        apply: true,
        allowItemReplacement: true,
        reason: 'INTEL-SCOPER-001 closes and advances to DATA-003.',
      },
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || null,
      reason: 'INTEL-SCOPER-001 closes and advances the active blocker.',
    },
  )
}

async function runCloseCardWrites({ planReview, activeSprint, nextCard } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  try {
    let snapshot = await loadIntelScoperSnapshot(client)
    await applyIntelScoperProofState(client, snapshot.candidateOutputs)
    await closeCardAndAdvanceSprint({ planReview, activeSprint, nextCard })
    snapshot = await loadIntelScoperSnapshot(client)
    return { snapshot, applied: { outputCount: snapshot.outputs.length, outputIds: snapshot.outputs.map(row => row.scoper_output_id).slice(0, 5) } }
  } finally {
    client.release()
    await pool.end()
  }
}

async function loadSnapshotReadonly() {
  const pool = createPool()
  const client = await pool.connect()
  try {
    return await loadIntelScoperSnapshot(client)
  } finally {
    client.release()
    await pool.end()
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  await initFoundationDb()

  const [
    packageJson,
    planText,
    moduleSource,
    scriptSource,
    registrySource,
    approval,
    initialCards,
    activeSprint,
  ] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile(INTEL_SCOPER_PLAN_PATH),
    readRepoFile('lib/intel-scoper.js'),
    readRepoFile(INTEL_SCOPER_SCRIPT_PATH),
    readRepoFile('lib/foundation-build-closeout-process-gate-records.js'),
    validatePlanApprovalFile({ repoRoot, approvalRef: INTEL_SCOPER_APPROVAL_PATH, cardId: INTEL_SCOPER_CARD_ID }),
    getBacklogItemsByIds([INTEL_SCOPER_CARD_ID, INTEL_SCOPER_NEXT_CARD_ID]),
    getActiveFoundationCurrentSprint(),
  ])

  const nextCardBefore = initialCards.find(card => card.id === INTEL_SCOPER_NEXT_CARD_ID)
  const planReview = evaluatePlanCriticPlan({
    planText,
    card: buildCardRow({ closeCard: args.closeCard }),
    changedFiles: INTEL_SCOPER_CHANGED_FILES,
    declaredRisk: 'internal DB schema/table writes, scoper output upserts, strategic issue scoped events, Current Sprint advancement',
    repoRoot,
  })

  let applied = null
  let snapshot = null
  if (args.closeCard && approval.ok && planReview.status === 'pass') {
    const result = await runCloseCardWrites({ planReview, activeSprint, nextCard: nextCardBefore })
    snapshot = result.snapshot
    applied = result.applied
  } else {
    snapshot = await loadSnapshotReadonly()
  }

  const evaluation = evaluateIntelScoperSnapshot(snapshot)
  const dogfood = buildIntelScoperDogfoodProof()
  const cards = await getBacklogItemsByIds([INTEL_SCOPER_CARD_ID, INTEL_SCOPER_NEXT_CARD_ID])
  const refreshedSprint = await getActiveFoundationCurrentSprint()
  const planCriticRuns = await getPlanCriticRunsByCardIds([INTEL_SCOPER_CARD_ID])
  const closeouts = getFoundationBuildCloseouts()
  const closeoutDoc = await readRepoFile(INTEL_SCOPER_CLOSEOUT_PATH, { optional: true })
  await closeFoundationDb()

  const card = cards.find(item => item.id === INTEL_SCOPER_CARD_ID) || null
  const nextCard = cards.find(item => item.id === INTEL_SCOPER_NEXT_CARD_ID) || null
  const sprintItem = (refreshedSprint.items || []).find(item => item.cardId === INTEL_SCOPER_CARD_ID) || null
  const nextSprintItem = (refreshedSprint.items || []).find(item => item.cardId === INTEL_SCOPER_NEXT_CARD_ID) || null
  const closeout = closeouts.find(record => record.key === INTEL_SCOPER_CLOSEOUT_KEY) || null
  const activeBlocker = refreshedSprint.sprint?.activeBlockerCardId || refreshedSprint.sprint?.active_blocker_card_id || null
  const intelScoperDone = card?.lane === 'done' && Boolean(closeout)
  const nextCardDone = nextCard?.lane === 'done'
  const nextCardPinnedOrClosed = Boolean(nextCard) && (
    nextCardDone ||
    String(nextCard.nextAction || '').includes(INTEL_SCOPER_CLOSEOUT_KEY) ||
    String(nextCard.statusNote || '').includes(INTEL_SCOPER_CLOSEOUT_KEY)
  )
  const durablePlanCriticPass = planCriticRuns.some(run =>
    run.cardId === INTEL_SCOPER_CARD_ID &&
    run.status === 'pass' &&
    Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )

  addCheck(checks, approval.ok, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || INTEL_SCOPER_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && planReview.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for INTEL-SCOPER-001 plan', buildPlanCriticResultSummary(planReview))
  addCheck(checks, durablePlanCriticPass || args.closeCard, 'durable Plan Critic pass row exists', durablePlanCriticPass ? 'present' : 'written during close-card')
  addCheck(checks, packageJson.scripts?.['process:intel-scoper-check'] === `node --env-file-if-exists=.env ${INTEL_SCOPER_SCRIPT_PATH}`, 'package exposes focused proof script', packageJson.scripts?.['process:intel-scoper-check'] || 'missing')
  addCheck(checks, planText.includes('intelligence_scoper_outputs') && planText.includes('proposal-only') && planText.includes('five-row'), 'plan names output ledger, proposal-only boundary, and five-row sample', INTEL_SCOPER_PLAN_PATH)
  addCheck(checks, moduleSource.includes('buildIntelScoperOutput') && moduleSource.includes('evaluateIntelScoperSnapshot'), 'module owns output builder and evaluator', 'markers present')
  addCheck(checks, scriptSource.includes('applyIntelScoperProofState') && scriptSource.includes('intelligence_scoper_outputs'), 'script owns guarded scoper output writes', 'markers present')
  addCheck(checks, evaluation.ok, 'INTEL-SCOPER output snapshot is healthy', evaluation.failed.map(item => item.check).join('; ') || JSON.stringify(evaluation.summary))
  addCheck(checks, dogfood.ok, 'dogfood rejects weak or mutating scoper outputs', dogfood.invariant)
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live INTEL-SCOPER backlog card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, nextCardPinnedOrClosed, 'DATA-003 is done or pinned to INTEL-SCOPER outputs', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, registrySource.includes(INTEL_SCOPER_CLOSEOUT_KEY), 'closeout registry includes INTEL-SCOPER', INTEL_SCOPER_CLOSEOUT_KEY)
  addCheck(checks, closeout && closeout.backlogIds?.includes(INTEL_SCOPER_CARD_ID), 'closeout record links INTEL-SCOPER', closeout ? closeout.key : 'missing')
  addCheck(checks, closeoutDoc.includes(INTEL_SCOPER_CLOSEOUT_KEY) && closeoutDoc.includes('intelligence_scoper_outputs'), 'closeout handoff exists and names scoper output ledger', INTEL_SCOPER_CLOSEOUT_PATH)
  addCheck(checks, refreshedSprint.sprint?.sprintId === INTEL_SCOPER_SPRINT_ID || intelScoperDone, 'Current Sprint may advance after historical INTEL-SCOPER closeout', refreshedSprint.sprint?.sprintId || 'missing')
  addCheck(checks, !args.closeCard || sprintItem?.stage === 'done_this_sprint', 'close-card marks INTEL-SCOPER done this sprint', sprintItem?.stage || 'not closed')
  addCheck(checks, !args.closeCard || activeBlocker === INTEL_SCOPER_NEXT_CARD_ID, 'close-card advances active blocker to DATA-003', activeBlocker || 'missing')
  addCheck(checks, !args.closeCard || nextSprintItem?.stage === 'scoping', 'next sprint item remains scoped for its own build', nextSprintItem?.stage || 'missing')

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    cardId: INTEL_SCOPER_CARD_ID,
    closeoutKey: INTEL_SCOPER_CLOSEOUT_KEY,
    applied,
    scoper: evaluation.summary,
    dogfood,
    currentSprint: {
      sprintId: refreshedSprint.sprint?.sprintId || null,
      activeBlockerCardId: activeBlocker,
      intelScoperStage: sprintItem?.stage || null,
      nextStage: nextSprintItem?.stage || null,
    },
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`INTEL-SCOPER-001 check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
  if (failed.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error)
  closeFoundationDb()
    .finally(() => {
      process.exit(1)
    })
})
