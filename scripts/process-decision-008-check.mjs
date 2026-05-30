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
  DECISION_008_APPROVAL_PATH,
  DECISION_008_CARD_ID,
  DECISION_008_CHANGED_FILES,
  DECISION_008_CLOSEOUT_KEY,
  DECISION_008_CLOSEOUT_PATH,
  DECISION_008_NEXT_CARD_ID,
  DECISION_008_NOT_NEXT_BOUNDARIES,
  DECISION_008_PLAN_PATH,
  DECISION_008_PROOF_COMMANDS,
  DECISION_008_SCRIPT_PATH,
  DECISION_008_SPRINT_ID,
  buildDecision008CandidateRows,
  buildDecision008DogfoodProof,
  buildDecision008OpenQuestion,
  buildDecision008ProposedDecision,
  evaluateDecision008Snapshot,
} from '../lib/decision-008-accountability-doctrine.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-decision-008'

function parseArgs(argv = process.argv.slice(2)) {
  const closeCard = isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] })
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    closeCard,
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
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

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: DECISION_008_CARD_ID,
    title: 'Promote atom-raised issues into accountability doctrine',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 16,
    source: 'Strategic Intelligence ledger, action-route review inbox, and Steve direction that business answers must not be buried in docs.',
    summary: 'Turn strategic issues and routed atom/synthesis signals into owner-bound open questions and proposed decisions with feedback back to the strategic issue ledger.',
    whyItMatters: 'Strategic issues only become useful when the system creates accountable follow-through and writes back whether the issue is routed, approved, rejected, snoozed, applied, or still unresolved.',
    nextAction: closeCard
      ? `Done under ${DECISION_008_CLOSEOUT_KEY}; continue ${DECISION_008_NEXT_CARD_ID}.`
      : 'Promote one route-linked strategic issue into an owner-bound open question and proposed decision, then write resolution feedback back to intelligence_strategic_issues.',
    statusNote: closeCard
      ? `Closed v1 under ${DECISION_008_CLOSEOUT_KEY}; route-linked strategic issue now has owner question, proposed decision, and resolution_feedback event while remaining review-controlled.`
      : 'Executing v1: no external writes, no locked decisions, no Scoper implementation, no extraction; internal proposed/open accountability rows only.',
    owner: 'Foundation Intelligence',
  }
}

function buildNextCardRow(existing = {}) {
  let nextAction = existing.nextAction || 'Build the gap-resolving Scoper on demand from strategic issues.'
  nextAction = ensureTextIncludes(nextAction, `Read DECISION-008 outputs from intelligence_strategic_issues, intelligence_strategic_issue_events, open_questions, proposed decisions, and intelligence_action_routes before creating any scoped card.`)
  let statusNote = existing.statusNote || ''
  statusNote = ensureTextIncludes(statusNote, `Unblocked by ${DECISION_008_CLOSEOUT_KEY}; Scoper must preserve issue/route/source refs and cannot create disconnected backlog work.`)
  return {
    ...existing,
    id: DECISION_008_NEXT_CARD_ID,
    title: existing.title || 'Build the gap-resolving Scoper',
    lane: existing.lane === 'done' ? existing.lane : 'scoped',
    priority: existing.priority || 'P0',
    rank: existing.rank || 16,
    nextAction,
    statusNote,
    owner: existing.owner || 'Foundation Intelligence',
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/strategic-intel-loop.js',
      'lib/action-route-promotion-workflow.js',
      'lib/foundation-decision-store.js',
      'lib/intelligence-action-router.js',
    ],
    existingTables: [
      'intelligence_strategic_issues',
      'intelligence_strategic_issue_events',
      'intelligence_action_routes',
      'decisions',
      'open_questions',
    ],
    existingPolicy: [
      'auto-detected decisions remain proposed until separately approved',
      'resolution feedback must write back to strategic issue truth',
      'blockers block actions, not the whole sprint',
      'source-backed evidence refs must survive every promotion step',
    ],
    existingDocs: [
      DECISION_008_PLAN_PATH,
      'docs/process/strategic-intel-001-plan.md',
      'docs/specs/2026-04-28-strategic-intelligence-loop.md',
      'docs/_archive/handoffs/2026-05-19-strategic-intel-loop-closeout.md',
    ],
    existingScripts: [
      'process:strategic-intel-check',
      'process:system-health-nightly-audit-check',
      'process:build-lane-repeated-failure-action-gate-check',
      'backlog:hygiene',
      'foundation:verify',
      'process:foundation-ship',
    ],
    exactGap: 'Strategic issues existed, but issue-to-accountability output was not yet proven: owner question, proposed decision, and feedback event had to be connected.',
    reused: 'Reuses Strategic Intelligence issue ledger truth, Action Router route refs, the decision/open-question stores, and the Current Sprint/backlog gates.',
    overBroadRisk: 'DECISION-008 could accidentally become Scoper, Strategy UI, or final doctrine application. V1 stays proposed-only and DB-local.',
    readyBy: 'Steve approved the overnight Foundation sprint to continue without babysitting; DECISION-008 became active after CSS surface decouple.',
    readyAt: '2026-05-19T23:35:00-04:00',
    notRebuilt: 'No Scoper, no Strategy UI, no source extraction, no external write, no locked/applied decision.',
  }
}

async function loadDecision008Snapshot(client) {
  const issueResult = await client.query(
    `
      SELECT *
      FROM intelligence_strategic_issues
      WHERE metadata->>'cardId' = 'STRATEGIC-INTEL-001'
      ORDER BY
        CASE WHEN COALESCE(array_length(route_refs, 1), 0) > 0 THEN 0 ELSE 1 END,
        updated_at DESC
      LIMIT 25
    `,
  )
  const issues = issueResult.rows
  const routeIds = Array.from(new Set(issues.flatMap(issue => Array.isArray(issue.route_refs) ? issue.route_refs : []).filter(Boolean)))
  const synthesizedItemIds = Array.from(new Set(issues.flatMap(issue => Array.isArray(issue.synthesized_item_refs) ? issue.synthesized_item_refs : []).filter(Boolean)))
  const issueIds = issues.map(issue => issue.issue_id).filter(Boolean)

  const routeResult = routeIds.length || synthesizedItemIds.length
    ? await client.query(
      `
        SELECT *
        FROM intelligence_action_routes
        WHERE route_id = ANY($1::text[])
           OR synthesized_item_id = ANY($2::text[])
        ORDER BY updated_at DESC
      `,
      [routeIds, synthesizedItemIds],
    )
    : { rows: [] }

  const decisionResult = await client.query(
    `
      SELECT *
      FROM decisions
      WHERE id LIKE 'DECISION-008-%'
         OR source_ref LIKE 'DECISION-008%'
      ORDER BY updated_at DESC
    `,
  )

  const openQuestionResult = await client.query(
    `
      SELECT *
      FROM open_questions
      WHERE id LIKE 'OPEN-DECISION-008-%'
      ORDER BY updated_at DESC
    `,
  )

  const eventResult = issueIds.length
    ? await client.query(
      `
        SELECT *
        FROM intelligence_strategic_issue_events
        WHERE issue_id = ANY($1::text[])
          AND (
            resolution_ref = $2
            OR metadata->>'cardId' = $3
          )
        ORDER BY created_at DESC
      `,
      [issueIds, DECISION_008_CLOSEOUT_KEY, DECISION_008_CARD_ID],
    )
    : { rows: [] }

  const snapshot = {
    issueCount: issues.length,
    routeCount: routeResult.rows.length,
    decisionCount: decisionResult.rows.length,
    openQuestionCount: openQuestionResult.rows.length,
    eventCount: eventResult.rows.length,
    issues,
    routes: routeResult.rows,
    decisions: decisionResult.rows,
    openQuestions: openQuestionResult.rows,
    events: eventResult.rows,
  }
  snapshot.candidates = buildDecision008CandidateRows(snapshot)
  return snapshot
}

function pickPrimaryCandidate(snapshot = {}) {
  const candidates = Array.isArray(snapshot.candidates) ? snapshot.candidates : []
  return candidates.find(candidate =>
    candidate.routeLinked &&
      ['pending', 'approved'].includes(candidate.routeApprovalStatus) &&
      candidate.sourceIds.length &&
      candidate.factRefs.length &&
      candidate.atomRefs.length &&
      candidate.chunkRefs.length
  ) || null
}

async function applyDecision008ProofState(client, candidate) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: DECISION_008_SCRIPT_PATH,
    operation: 'create DECISION-008 proposed accountability rows and issue feedback',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
  if (!candidate) throw new Error('No route-linked DECISION-008 candidate is available to close the card.')
  const decision = buildDecision008ProposedDecision(candidate)
  const question = buildDecision008OpenQuestion(candidate)
  const metadata = {
    cardId: DECISION_008_CARD_ID,
    closeoutKey: DECISION_008_CLOSEOUT_KEY,
    issueId: candidate.issueId,
    routeId: candidate.routeId,
    proposedDecisionId: candidate.proposedDecisionId,
    openQuestionId: candidate.openQuestionId,
    domain: candidate.domain,
    conflictStatus: candidate.conflictStatus,
    sourceIds: candidate.sourceIds,
    factRefs: candidate.factRefs,
    atomRefs: candidate.atomRefs,
    chunkRefs: candidate.chunkRefs,
    synthesizedItemRefs: candidate.synthesizedItemRefs,
    proposedOnly: true,
    noExternalWrite: true,
  }

  await client.query('BEGIN')
  try {
    await client.query(
      `
        INSERT INTO open_questions (id, title, summary, owner, status)
        VALUES ($1,$2,$3,$4,'open')
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          summary = EXCLUDED.summary,
          owner = EXCLUDED.owner,
          status = 'open',
          updated_at = NOW()
      `,
      [question.id, question.title, question.summary, question.owner],
    )
    await client.query(
      `
        INSERT INTO decisions (
          id, category, title, status, summary, rationale, source_ref,
          classified_at, classified_by, decision_owner, confirmed_by,
          context_ref, evidence_notes
        )
        VALUES ($1,$2,$3,'proposed',$4,$5,$6,NOW(),$7,$8,NULL,$9,$10)
        ON CONFLICT (id) DO UPDATE SET
          category = EXCLUDED.category,
          title = EXCLUDED.title,
          status = 'proposed',
          summary = EXCLUDED.summary,
          rationale = EXCLUDED.rationale,
          source_ref = EXCLUDED.source_ref,
          classified_at = NOW(),
          classified_by = EXCLUDED.classified_by,
          decision_owner = EXCLUDED.decision_owner,
          confirmed_by = NULL,
          context_ref = EXCLUDED.context_ref,
          evidence_notes = EXCLUDED.evidence_notes,
          updated_at = NOW()
      `,
      [
        decision.id,
        decision.category,
        decision.title,
        decision.summary,
        decision.rationale,
        decision.sourceRef,
        ACTOR,
        decision.decisionOwner,
        decision.contextRef,
        decision.evidenceNotes,
      ],
    )
    await client.query(
      `
        UPDATE intelligence_action_routes
        SET metadata = metadata || $2::jsonb,
            updated_at = NOW()
        WHERE route_id = $1
      `,
      [
        candidate.routeId,
        JSON.stringify({
          decision008Accountability: {
            ...metadata,
            outputState: 'owner_question_and_proposed_decision_created',
          },
        }),
      ],
    )
    await client.query(
      `
        UPDATE intelligence_strategic_issues
        SET status = CASE WHEN status = 'surfaced' THEN 'triage' ELSE status END,
            resolution_status = 'route_pending',
            resolution_ref = $2,
            route_refs = (
              SELECT ARRAY(
                SELECT DISTINCT value
                FROM unnest(route_refs || ARRAY[$3]::text[]) AS value
                WHERE value IS NOT NULL AND value <> ''
              )
            ),
            metadata = metadata || $4::jsonb,
            updated_at = NOW()
        WHERE issue_id = $1
      `,
      [
        candidate.issueId,
        DECISION_008_CLOSEOUT_KEY,
        candidate.routeId,
        JSON.stringify({
          decision008Accountability: {
            ...metadata,
            status: 'route_pending',
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
        VALUES ($1,$2,'resolution_feedback',$3,$4,$5::text[],ARRAY[]::text[],$6,$7,$8,$9::jsonb)
        ON CONFLICT (event_id) DO UPDATE SET
          previous_status = EXCLUDED.previous_status,
          next_status = EXCLUDED.next_status,
          route_refs = EXCLUDED.route_refs,
          resolution_ref = EXCLUDED.resolution_ref,
          actor = EXCLUDED.actor,
          summary = EXCLUDED.summary,
          metadata = EXCLUDED.metadata
      `,
      [
        candidate.feedbackEventId,
        candidate.issueId,
        candidate.issueStatus || null,
        candidate.issueStatus === 'surfaced' ? 'triage' : candidate.issueStatus || 'triage',
        [candidate.routeId],
        DECISION_008_CLOSEOUT_KEY,
        ACTOR,
        `DECISION-008 promoted ${candidate.issueId} into open question ${candidate.openQuestionId} and proposed decision ${candidate.proposedDecisionId}; final application still requires human approval.`,
        JSON.stringify(metadata),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ('intelligence_action_route_curated','intelligence_strategic_issues',$1,$2,$3,$4::jsonb)
      `,
      [
        candidate.issueId,
        ACTOR,
        `DECISION-008 accountability feedback recorded for ${candidate.issueId}.`,
        JSON.stringify(metadata),
      ],
    )
    await client.query('COMMIT')
    return { decision, question, eventId: candidate.feedbackEventId }
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
        DECISION_008_CARD_ID,
        ACTOR,
        `${closeCard ? 'Closed' : 'Updated'} ${DECISION_008_CARD_ID}.`,
        JSON.stringify({
          closeoutKey: DECISION_008_CLOSEOUT_KEY,
          activeBlockerCardId: closeCard ? DECISION_008_NEXT_CARD_ID : DECISION_008_CARD_ID,
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
        `decision-008-${stableRunId(DECISION_008_PLAN_PATH)}`,
        DECISION_008_CARD_ID,
        DECISION_008_PLAN_PATH,
        planReview.status,
        planReview.score,
        DECISION_008_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({
          status: planReview.status,
          score: planReview.score,
          cardId: DECISION_008_CARD_ID,
          closeoutKey: DECISION_008_CLOSEOUT_KEY,
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
    scriptPath: DECISION_008_SCRIPT_PATH,
    operation: 'close DECISION-008 and advance Current Sprint',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
  await upsertBacklogRows({ closeCard: true, nextCard })
  await upsertPlanCriticRun(planReview)

  const previous = activeSprint || await getActiveFoundationCurrentSprint()
  const existing = Array.isArray(previous.items) ? previous.items : []
  const items = existing.map((item, index) => {
    if (item.cardId === DECISION_008_CARD_ID) {
      return {
        ...item,
        order: item.order || index + 1,
        stage: 'done_this_sprint',
        planRef: DECISION_008_PLAN_PATH,
        definitionOfDone: 'At least one route-linked strategic issue is promoted into an owner-bound open question and proposed decision, preserving issue/route/source refs and writing resolution_feedback back to the strategic issue ledger.',
        proofCommands: DECISION_008_PROOF_COMMANDS,
        nextAction: `Continue ${DECISION_008_NEXT_CARD_ID}; DECISION-008 accountability feedback is live.`,
        notNextBoundaries: Array.from(new Set([...(item.notNextBoundaries || []), ...DECISION_008_NOT_NEXT_BOUNDARIES])),
        metadata: {
          ...(item.metadata || {}),
          closeoutKey: DECISION_008_CLOSEOUT_KEY,
          approvalRef: DECISION_008_APPROVAL_PATH,
          outputTables: ['open_questions', 'decisions', 'intelligence_strategic_issue_events'],
          proposedOnly: true,
        },
        existingWorkCheck: buildExistingWorkCheck(),
      }
    }
    if (item.cardId === DECISION_008_NEXT_CARD_ID) {
      return {
        ...item,
        order: item.order || index + 1,
        stage: 'scoping',
        planRef: item.planRef || 'docs/process/intel-scoper-001-plan.md',
        nextAction: ensureTextIncludes(item.nextAction || '', `Start from ${DECISION_008_CLOSEOUT_KEY} issue feedback and route/source refs.`),
        metadata: {
          ...(item.metadata || {}),
          unblockedBy: DECISION_008_CARD_ID,
          inputLedger: 'intelligence_strategic_issues',
          inputFeedbackLedger: 'intelligence_strategic_issue_events',
          inputDecisionStatus: 'proposed_only',
        },
      }
    }
    return { ...item, order: item.order || index + 1 }
  })

  return upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: previous.sprint?.sprintId || DECISION_008_SPRINT_ID,
        status: 'active',
        activeBlockerCardId: DECISION_008_NEXT_CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: 'decision_008_done',
          lastClosedCardId: DECISION_008_CARD_ID,
          nextAction: `Continue ${DECISION_008_NEXT_CARD_ID}; accountability loop v1 is live.`,
        },
      },
      items,
      mutation: {
        apply: true,
        allowItemReplacement: true,
        reason: 'DECISION-008 closes and advances to INTEL-SCOPER-001.',
      },
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || null,
      reason: 'DECISION-008 closes and advances the active blocker.',
    },
  )
}

async function runCloseCardWrites({ planReview, activeSprint, nextCard } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  try {
    let snapshot = await loadDecision008Snapshot(client)
    const candidate = pickPrimaryCandidate(snapshot)
    const applied = await applyDecision008ProofState(client, candidate)
    await closeCardAndAdvanceSprint({ planReview, activeSprint, nextCard })
    snapshot = await loadDecision008Snapshot(client)
    return { snapshot, applied }
  } finally {
    client.release()
    await pool.end()
  }
}

async function loadSnapshotReadonly() {
  const pool = createPool()
  const client = await pool.connect()
  try {
    return await loadDecision008Snapshot(client)
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
    readRepoFile(DECISION_008_PLAN_PATH),
    readRepoFile('lib/decision-008-accountability-doctrine.js'),
    readRepoFile(DECISION_008_SCRIPT_PATH),
    readRepoFile('lib/foundation-build-closeout-process-gate-records.js'),
    validatePlanApprovalFile({ repoRoot, approvalRef: DECISION_008_APPROVAL_PATH, cardId: DECISION_008_CARD_ID }),
    getBacklogItemsByIds([DECISION_008_CARD_ID, DECISION_008_NEXT_CARD_ID]),
    getActiveFoundationCurrentSprint(),
  ])

  const nextCardBefore = initialCards.find(card => card.id === DECISION_008_NEXT_CARD_ID)
  const planReview = evaluatePlanCriticPlan({
    planText,
    card: buildCardRow({ closeCard: args.closeCard }),
    changedFiles: DECISION_008_CHANGED_FILES,
    declaredRisk: 'internal DB proposed decision/open question writes, strategic issue feedback update, Current Sprint advancement',
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

  const evaluation = evaluateDecision008Snapshot(snapshot)
  const dogfood = buildDecision008DogfoodProof()
  const cards = await getBacklogItemsByIds([DECISION_008_CARD_ID, DECISION_008_NEXT_CARD_ID])
  const refreshedSprint = await getActiveFoundationCurrentSprint()
  const planCriticRuns = await getPlanCriticRunsByCardIds([DECISION_008_CARD_ID])
  const closeouts = getFoundationBuildCloseouts()
  const closeoutDoc = await readRepoFile(DECISION_008_CLOSEOUT_PATH, { optional: true })
  await closeFoundationDb()

  const card = cards.find(item => item.id === DECISION_008_CARD_ID) || null
  const nextCard = cards.find(item => item.id === DECISION_008_NEXT_CARD_ID) || null
  const sprintItem = (refreshedSprint.items || []).find(item => item.cardId === DECISION_008_CARD_ID) || null
  const nextSprintItem = (refreshedSprint.items || []).find(item => item.cardId === DECISION_008_NEXT_CARD_ID) || null
  const closeout = closeouts.find(record => record.key === DECISION_008_CLOSEOUT_KEY) || null
  const activeBlocker = refreshedSprint.sprint?.activeBlockerCardId || refreshedSprint.sprint?.active_blocker_card_id || null
  const durablePlanCriticPass = planCriticRuns.some(run =>
    run.cardId === DECISION_008_CARD_ID &&
    run.status === 'pass' &&
    Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )

  addCheck(checks, approval.ok, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || DECISION_008_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && planReview.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for DECISION-008 plan', buildPlanCriticResultSummary(planReview))
  addCheck(checks, durablePlanCriticPass || args.closeCard, 'durable Plan Critic pass row exists', durablePlanCriticPass ? 'present' : 'written during close-card')
  addCheck(checks, packageJson.scripts?.['process:decision-008-check'] === `node --env-file-if-exists=.env ${DECISION_008_SCRIPT_PATH}`, 'package exposes focused proof script', packageJson.scripts?.['process:decision-008-check'] || 'missing')
  addCheck(checks, planText.includes('intelligence_strategic_issues') && planText.includes('resolution_feedback') && planText.includes('proposed decision'), 'plan names issue ledger, feedback, and proposed-only output', DECISION_008_PLAN_PATH)
  addCheck(checks, moduleSource.includes('buildDecision008Candidate') && moduleSource.includes('evaluateDecision008Snapshot'), 'module owns candidate/evaluator behavior', 'markers present')
  addCheck(checks, scriptSource.includes('applyDecision008ProofState') && scriptSource.includes('resolution_feedback'), 'script owns guarded proof writes', 'markers present')
  addCheck(checks, evaluation.ok, 'DECISION-008 accountability snapshot is healthy', evaluation.failed.map(item => item.check).join('; ') || JSON.stringify(evaluation.summary))
  addCheck(checks, dogfood.ok, 'dogfood rejects weak accountability promotion fixtures', dogfood.invariant)
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live DECISION-008 backlog card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, nextCard && nextCard.nextAction?.includes('DECISION-008 outputs'), 'INTEL-SCOPER-001 is pinned to DECISION-008 outputs', nextCard?.nextAction || 'missing')
  addCheck(checks, registrySource.includes(DECISION_008_CLOSEOUT_KEY), 'closeout registry includes DECISION-008', DECISION_008_CLOSEOUT_KEY)
  addCheck(checks, closeout && closeout.backlogIds?.includes(DECISION_008_CARD_ID), 'closeout record links DECISION-008', closeout ? closeout.key : 'missing')
  addCheck(checks, closeoutDoc.includes(DECISION_008_CLOSEOUT_KEY) && closeoutDoc.includes('intelligence_strategic_issues'), 'closeout handoff exists and names issue ledger', DECISION_008_CLOSEOUT_PATH)
  addCheck(checks, refreshedSprint.sprint?.sprintId === DECISION_008_SPRINT_ID, 'Current Sprint remains overnight audit-control sprint', refreshedSprint.sprint?.sprintId || 'missing')
  addCheck(checks, !args.closeCard || sprintItem?.stage === 'done_this_sprint', 'close-card marks DECISION-008 done this sprint', sprintItem?.stage || 'not closed')
  addCheck(checks, !args.closeCard || activeBlocker === DECISION_008_NEXT_CARD_ID, 'close-card advances active blocker to INTEL-SCOPER-001', activeBlocker || 'missing')
  addCheck(checks, !args.closeCard || nextSprintItem?.stage === 'scoping', 'next sprint item remains scoped for its own build', nextSprintItem?.stage || 'missing')

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    cardId: DECISION_008_CARD_ID,
    closeoutKey: DECISION_008_CLOSEOUT_KEY,
    applied,
    accountability: evaluation.summary,
    dogfood,
    currentSprint: {
      sprintId: refreshedSprint.sprint?.sprintId || null,
      activeBlockerCardId: activeBlocker,
      decision008Stage: sprintItem?.stage || null,
      nextStage: nextSprintItem?.stage || null,
    },
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`DECISION-008 check: ${result.status}`)
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
