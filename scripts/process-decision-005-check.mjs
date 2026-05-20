#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  initFoundationDb,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
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
  FOUNDATION_SPRINT_SYSTEM_CARD_ID,
} from '../lib/foundation-current-sprint.js'
import {
  DECISION_005_APPROVAL_PATH,
  DECISION_005_CARD_ID,
  DECISION_005_CHANGED_FILES,
  DECISION_005_CLOSEOUT_KEY,
  DECISION_005_CLOSEOUT_PATH,
  DECISION_005_NEXT_CARD_ID,
  DECISION_005_NOT_NEXT_BOUNDARIES,
  DECISION_005_PLAN_PATH,
  DECISION_005_PROOF_COMMANDS,
  DECISION_005_SCRIPT_PATH,
  DECISION_005_SPRINT_ID,
  buildDecision005DogfoodProof,
  buildDecision005ProvenanceSnapshot,
  evaluateDecision005Implementation,
  renderDecision005Closeout,
  stableDecision005RunId,
} from '../lib/decision-005-provenance-model.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-decision-005'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: String(detail || '') })
}

async function currentGitHead() {
  const { execFile } = await import('node:child_process')
  return new Promise(resolve => {
    execFile('git', ['rev-parse', 'HEAD'], { cwd: repoRoot }, (error, stdout) => {
      resolve(error ? '' : String(stdout || '').trim())
    })
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

async function repoFileExists(relativePath) {
  try {
    return (await fs.stat(path.join(repoRoot, relativePath))).isFile()
  } catch {
    return false
  }
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

async function loadDecisions({ limit = 200 } = {}) {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT *
        FROM decisions
        ORDER BY updated_at DESC, created_at DESC
        LIMIT $1
      `,
      [limit],
    )
    return result.rows
  } finally {
    await pool.end()
  }
}

async function backfillDecision005Rows() {
  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const lockedResult = await client.query(
      `
        UPDATE decisions
        SET provenance_type = CASE WHEN provenance_type = 'unknown' THEN 'backfilled' ELSE provenance_type END,
            provenance_status = CASE WHEN provenance_status = 'missing' THEN 'weak_backfill' ELSE provenance_status END,
            provenance_notes = COALESCE(provenance_notes, evidence_notes, 'Historical decision backfilled before direct meeting/session/thread linkage existed.'),
            participant_roles = CASE
              WHEN participant_roles = '{}'::jsonb THEN jsonb_build_object(
                'decisionOwner', decision_owner,
                'confirmedBy', confirmed_by,
                'participants', COALESCE(participant_names, '{}'::text[])
              )
              ELSE participant_roles
            END,
            updated_at = CASE
              WHEN provenance_type = 'unknown'
                OR provenance_status = 'missing'
                OR provenance_notes IS NULL
                OR participant_roles = '{}'::jsonb
              THEN NOW()
              ELSE updated_at
            END
        WHERE status = 'locked'
          AND (
            provenance_type = 'unknown'
            OR provenance_status = 'missing'
            OR provenance_notes IS NULL
            OR participant_roles = '{}'::jsonb
          )
        RETURNING id
      `,
    )
    const routeDerivedResult = await client.query(
      `
        UPDATE decisions
        SET provenance_type = 'route_derived',
            provenance_status = 'needs_review',
            provenance_notes = COALESCE(provenance_notes, 'Strategic issue/action-route proposed decision; human confirmation required before lock.'),
            source_ids = CASE WHEN cardinality(source_ids) = 0 THEN ARRAY['SRC-MEETINGS-001','SRC-GMAIL-001']::text[] ELSE source_ids END,
            route_refs = CASE
              WHEN cardinality(route_refs) = 0 AND source_ref ~ 'action-route:[A-Za-z0-9]+'
              THEN ARRAY[(regexp_match(source_ref, '(action-route:[A-Za-z0-9]+)'))[1]]::text[]
              ELSE route_refs
            END,
            participant_roles = CASE
              WHEN participant_roles = '{}'::jsonb THEN jsonb_build_object('owner', COALESCE(decision_owner, 'Foundation'))
              ELSE participant_roles
            END,
            updated_at = NOW()
        WHERE status = 'proposed'
          AND source_ref LIKE 'DECISION-008%'
          AND provenance_type = 'unknown'
        RETURNING id
      `,
    )
    await client.query('COMMIT')
    return {
      lockedBackfilled: lockedResult.rowCount,
      routeDerivedBackfilled: routeDerivedResult.rowCount,
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P1','full',true,$6::text[],$7::jsonb,$8::jsonb,$9)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result,
            created_at = NOW()
      `,
      [
        `decision-005-${stableDecision005RunId(DECISION_005_PLAN_PATH)}`,
        DECISION_005_CARD_ID,
        DECISION_005_PLAN_PATH,
        planReview.status,
        Number(planReview.score),
        DECISION_005_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({
          status: planReview.status,
          score: planReview.score,
          cardId: DECISION_005_CARD_ID,
          closeoutKey: DECISION_005_CLOSEOUT_KEY,
        }),
        ACTOR,
      ],
    )
  } finally {
    client.release()
    await pool.end()
  }
}

function normalizeSprintItem(item = {}) {
  return {
    cardId: item.cardId || item.backlogId,
    order: item.order ?? item.sprintOrder,
    stage: item.stage,
    planRef: item.planRef,
    definitionOfDone: item.definitionOfDone,
    proofCommands: item.proofCommands || [],
    readinessBlockerCleared: item.readinessBlockerCleared || '',
    notNextBoundaries: item.notNextBoundaries || [],
    existingWorkCheck: item.existingWorkCheck || {},
    nextAction: item.nextAction || '',
    metadata: item.metadata && typeof item.metadata === 'object' ? item.metadata : {},
  }
}

function buildUpdatedSprintOverlay({ activeSprint, closeCard = false, currentHead = '' }) {
  const sprint = activeSprint.sprint || {}
  const existingItems = activeSprint.items || []
  const merged = existingItems.map(normalizeSprintItem)
  const currentIndex = merged.findIndex(item => item.cardId === DECISION_005_CARD_ID)
  const currentItem = currentIndex >= 0 ? merged[currentIndex] : {}
  const updatedCurrent = {
    ...currentItem,
    cardId: DECISION_005_CARD_ID,
    order: Number(currentItem.order || 9),
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: DECISION_005_PLAN_PATH,
    definitionOfDone: 'Decision provenance distinguishes direct, route-derived, and backfilled evidence, with participants and meeting/session/thread linkage stored for future review.',
    proofCommands: DECISION_005_PROOF_COMMANDS,
    notNextBoundaries: Array.from(new Set([...(currentItem.notNextBoundaries || []), ...DECISION_005_NOT_NEXT_BOUNDARIES])),
    existingWorkCheck: {
      ...(currentItem.existingWorkCheck || {}),
      reused: 'Builds on DECISION-004 lock-in guard, MEMORY-005 temporal truth, ACTION-ROUTER-001 proposed decisions, and existing decision rows.',
      exactGap: 'Existing provenance fields did not distinguish direct evidence from route-derived or historical backfill evidence.',
      notRebuilt: 'No new decision table, no autonomous approval workflow, no external writes.',
      readyBy: 'decision-004-pending-decision-review-v1',
      readyAt: '2026-05-20T07:05:00-04:00',
    },
    nextAction: closeCard ? `Continue ${DECISION_005_NEXT_CARD_ID}.` : 'Close DECISION-005 before the next sprint item.',
    metadata: {
      ...(currentItem.metadata || {}),
      closeoutKey: DECISION_005_CLOSEOUT_KEY,
      approvalRef: DECISION_005_APPROVAL_PATH,
      directVsBackfilledProvenance: true,
      noAutoApply: true,
      repoPosture: {
        ...(currentItem.metadata?.repoPosture || {}),
        integrationBranch: 'main',
        expectedBaseCommit: currentHead,
        commitPushRequiredAfterCard: true,
      },
    },
  }
  if (currentIndex >= 0) merged[currentIndex] = updatedCurrent
  else merged.push(updatedCurrent)

  const nextIndex = merged.findIndex(item => item.cardId === DECISION_005_NEXT_CARD_ID)
  const nextItem = nextIndex >= 0 ? merged[nextIndex] : {}
  const updatedNext = {
    ...nextItem,
    cardId: DECISION_005_NEXT_CARD_ID,
    order: Number(nextItem.order || 10),
    stage: nextItem.stage === 'done_this_sprint' ? nextItem.stage : 'scoping',
    nextAction: `Ready after ${DECISION_005_CLOSEOUT_KEY}; continue only if raw health, repeated-failure gate, foundation:verify, and main sync are clean. Preserve the ${FOUNDATION_SPRINT_SYSTEM_CARD_ID} operator UX follow-up scope: Overview -> Systems -> Backlog -> Recent Work, clickable app breadcrumbs, done-velocity, moved-to-done date, Phase 1 / Truth Cleanup, command-order, backend-only, app surface metadata, at least 3 recent closeouts, and Recent Builds / Recent Work owns where shipped changes live.`,
    metadata: {
      ...(nextItem.metadata || {}),
      previousCloseoutKey: DECISION_005_CLOSEOUT_KEY,
      decisionProvenanceModelReady: true,
    },
  }
  if (nextIndex >= 0) merged[nextIndex] = updatedNext
  else merged.push(updatedNext)

  merged.sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
  return {
    sprint: {
      sprintId: sprint.sprintId || DECISION_005_SPRINT_ID,
      status: 'active',
      goal: sprint.goal || 'Continue unattended Foundation work from source-truth into data health and operating control.',
      activeBlockerCardId: closeCard ? DECISION_005_NEXT_CARD_ID : DECISION_005_CARD_ID,
      metadata: {
        ...(sprint.metadata || {}),
        currentStatus: closeCard ? 'foundation_surface_updates_scoping' : 'decision_005_active',
        lastClosedCardId: closeCard ? DECISION_005_CARD_ID : sprint.metadata?.lastClosedCardId,
        lastCloseoutKey: closeCard ? DECISION_005_CLOSEOUT_KEY : sprint.metadata?.lastCloseoutKey,
        approvalPolicy: sprint.metadata?.approvalPolicy || 'Blockers block unsafe actions, not the whole sprint. Park approval-bound operations and continue to the next safe card.',
      },
    },
    items: merged,
  }
}

async function applyLiveClose({ activeSprint, planReview, snapshot, dogfood, evaluation, backfill }) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: DECISION_005_SCRIPT_PATH,
    operation: 'close DECISION-005 and advance Current Sprint',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await updateBacklogItem(DECISION_005_CARD_ID, {
    lane: 'done',
    priority: 'P1',
    rank: 14,
    nextAction: `Done under ${DECISION_005_CLOSEOUT_KEY}; proof: npm run process:decision-005-check -- --close-card --json; closeout ${DECISION_005_CLOSEOUT_PATH}; continue ${DECISION_005_NEXT_CARD_ID}.`,
    statusNote: `Closed 2026-05-20 under ${DECISION_005_CLOSEOUT_KEY}; decisions now carry direct/route-derived/backfilled provenance, participant roles, and meeting/session/thread linkage fields.`,
    owner: 'Foundation Decisions',
  }, ACTOR)
  await updateBacklogItem(DECISION_005_NEXT_CARD_ID, {
    lane: 'scoped',
    priority: 'P1',
    nextAction: `Ready after ${DECISION_005_CLOSEOUT_KEY}; continue only after clean ship/main sync. Preserve ${FOUNDATION_SPRINT_SYSTEM_CARD_ID} context: Overview -> Systems -> Backlog -> Recent Work, clickable app breadcrumbs, done-velocity, moved-to-done date, Phase 1 / Truth Cleanup, command-order, backend-only, app surface metadata, at least 3 recent closeouts, and Recent Builds / Recent Work owns where shipped changes live.`,
    statusNote: `DECISION-005 closed; decision provenance model is ready for downstream surface work. Steve's operator UX standard is active: technical terms must have a plain-English meaning next to them, Foundation is the CEO dashboard for system-building, and FOUNDATION-SURFACE-UPDATES-001 remains the scoped P1 follow-up from ${FOUNDATION_SPRINT_SYSTEM_CARD_ID}.`,
    owner: 'Foundation UI',
  }, ACTOR)
  await upsertPlanCriticRun(planReview)
  await upsertFoundationCurrentSprintOverlay(
    buildUpdatedSprintOverlay({ activeSprint, closeCard: true, currentHead: await currentGitHead() }),
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: activeSprint.sprint?.sprintId || DECISION_005_SPRINT_ID,
      reason: `${DECISION_005_CARD_ID} closes decision provenance and advances to ${DECISION_005_NEXT_CARD_ID}.`,
    },
  )
  const closeout = renderDecision005Closeout({
    evaluation,
    snapshot: {
      ...snapshot,
      summary: {
        ...(snapshot.summary || {}),
        lockedBackfilledThisRun: backfill.lockedBackfilled,
        routeDerivedBackfilledThisRun: backfill.routeDerivedBackfilled,
      },
    },
    dogfood,
    generatedAt: new Date().toISOString(),
  })
  await fs.mkdir(path.dirname(path.join(repoRoot, DECISION_005_CLOSEOUT_PATH)), { recursive: true })
  await fs.writeFile(path.join(repoRoot, DECISION_005_CLOSEOUT_PATH), closeout)
}

async function main() {
  const args = parseArgs()
  if (args.closeCard) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: DECISION_005_SCRIPT_PATH,
      operation: 'close DECISION-005 and advance Current Sprint',
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
    })
  }

  let dbInitialized = false
  try {
    const checks = []
    const [
      approvalValidation,
      planSource,
      moduleSource,
      schemaSource,
      decisionStoreSource,
      writeRoutesSource,
      sharedCommsStoreSource,
      sharedCommsRoutesSource,
      scriptSource,
      registrySource,
      packageJson,
    ] = await Promise.all([
      validatePlanApprovalFile({ repoRoot, approvalRef: DECISION_005_APPROVAL_PATH, cardId: DECISION_005_CARD_ID }),
      readRepoFile(DECISION_005_PLAN_PATH),
      readRepoFile('lib/decision-005-provenance-model.js'),
      readRepoFile('lib/foundation-db-schema-seed-store.js'),
      readRepoFile('lib/foundation-decision-store.js'),
      readRepoFile('lib/foundation-write-routes.js'),
      readRepoFile('lib/foundation-shared-comms-store.js'),
      readRepoFile('lib/strategy-shared-comms-routes.js'),
      readRepoFile(DECISION_005_SCRIPT_PATH),
      readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
      readRepoJson('package.json'),
    ])
    const planReview = evaluatePlanCriticPlan({
      planText: planSource,
      card: {
        id: DECISION_005_CARD_ID,
        title: 'Build a decision provenance and participant model',
        priority: 'P1',
      },
      changedFiles: DECISION_005_CHANGED_FILES,
      declaredRisk: 'Decision provenance can overclaim historical certainty, block legitimate locked history, or drift into autonomous decision application.',
      repoRoot,
    })
    const planSummary = buildPlanCriticResultSummary(planReview)

    await initFoundationDb()
    dbInitialized = true
    const activeSprint = await getActiveFoundationCurrentSprint()
    let backfill = { lockedBackfilled: 0, routeDerivedBackfilled: 0 }
    if (args.closeCard) backfill = await backfillDecision005Rows()
    const decisions = await loadDecisions({ limit: 200 })
    const snapshot = buildDecision005ProvenanceSnapshot({ decisions })
    const [cards, planCriticRuns] = await Promise.all([
      getBacklogItemsByIds([DECISION_005_CARD_ID, DECISION_005_NEXT_CARD_ID]),
      getPlanCriticRunsByCardIds([DECISION_005_CARD_ID]),
    ])
    const currentActiveBlocker =
      activeSprint?.activeBlocker?.cardId ||
      activeSprint?.activeBlockerCardId ||
      activeSprint?.sprint?.activeBlockerCardId
    const closeout = getFoundationBuildCloseouts().find(record => record.key === DECISION_005_CLOSEOUT_KEY)
    const packageScript = packageJson.scripts?.['process:decision-005-check']
    const dogfood = buildDecision005DogfoodProof()
    const evaluation = evaluateDecision005Implementation({
      schemaSource,
      decisionStoreSource,
      writeRoutesSource,
      sharedCommsRoutesSource: `${sharedCommsRoutesSource}\n${sharedCommsStoreSource}`,
      moduleSource,
      scriptSource,
      registrySource,
      packageJson,
      snapshot,
    })

    addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'DECISION-005 approval validates', approvalValidation.failures?.map(item => item.check).join(', ') || DECISION_005_APPROVAL_PATH)
    addCheck(checks, approvalValidation.approval?.cardId === DECISION_005_CARD_ID && Number(approvalValidation.approval?.score) >= 9.8, 'DECISION-005 approval score is 9.8+', `${approvalValidation.approval?.cardId || 'missing'} / ${approvalValidation.approval?.score || 'missing'}`)
    addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes DECISION-005 plan', `${planReview.status} ${planReview.score}/10`)
    addCheck(checks, cards.some(card => card.id === DECISION_005_CARD_ID), 'DECISION-005 backlog card exists', cards.map(card => card.id).join(', '))
    addCheck(checks, cards.some(card => card.id === DECISION_005_NEXT_CARD_ID), 'next sprint card exists', cards.map(card => card.id).join(', '))
    addCheck(checks, currentActiveBlocker === DECISION_005_CARD_ID || (args.closeCard && currentActiveBlocker === DECISION_005_NEXT_CARD_ID), 'Current Sprint owns DECISION-005 before closeout', currentActiveBlocker || 'missing')
    addCheck(checks, snapshot.status === 'healthy' && snapshot.summary.lockedBlockedCount === 0, 'live decision provenance snapshot is healthy', JSON.stringify(snapshot.summary || {}))
    addCheck(checks, snapshot.summary.backfilledCount >= 1, 'historical locked decisions are honest backfills', JSON.stringify(snapshot.summary || {}))
    addCheck(checks, evaluation.ok, 'DECISION-005 implementation wiring is healthy', evaluation.failed.map(item => item.check).join('; ') || JSON.stringify(evaluation.summary))
    addCheck(checks, dogfood.ok, 'DECISION-005 dogfood rejects dishonest provenance', dogfood.invariant)
    addCheck(checks, packageScript === `node --env-file-if-exists=.env ${DECISION_005_SCRIPT_PATH}`, 'package script is registered', packageScript || 'missing')
    for (const relativePath of DECISION_005_CHANGED_FILES.filter(file => file.startsWith('docs/') || file.startsWith('lib/') || file.startsWith('scripts/') || file.startsWith('public/'))) {
      const willWriteCloseout = args.closeCard && relativePath === DECISION_005_CLOSEOUT_PATH
      const closeoutPending = !args.closeCard && relativePath === DECISION_005_CLOSEOUT_PATH
      addCheck(
        checks,
        willWriteCloseout || closeoutPending || await repoFileExists(relativePath),
        `${relativePath} exists`,
        willWriteCloseout || closeoutPending ? 'will be written on close' : relativePath,
      )
    }
    addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(DECISION_005_CARD_ID), 'closeout registry exposes DECISION-005', closeout?.key || 'missing')
    addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8) || args.closeCard, 'durable Plan Critic pass exists or will be written', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'pending write')

    const preCloseFailed = checks.filter(check => !check.ok)
    if (args.closeCard && preCloseFailed.length === 0) {
      await applyLiveClose({ activeSprint, planReview, snapshot, dogfood, evaluation, backfill })
    }

    const refreshedSprint = await getActiveFoundationCurrentSprint()
    const refreshedCards = await getBacklogItemsByIds([DECISION_005_CARD_ID, DECISION_005_NEXT_CARD_ID])
    const refreshedCurrent = refreshedCards.find(card => card.id === DECISION_005_CARD_ID)
    const refreshedNext = refreshedCards.find(card => card.id === DECISION_005_NEXT_CARD_ID)
    const refreshedItem = (refreshedSprint.items || []).find(item => item.cardId === DECISION_005_CARD_ID)
    const refreshedActiveBlocker = refreshedSprint.sprint?.activeBlockerCardId || null
    const closeoutDoc = await readRepoFile(DECISION_005_CLOSEOUT_PATH, { optional: true })
    addCheck(checks, !args.closeCard || refreshedCurrent?.lane === 'done', 'close-card marks DECISION-005 done in Backlog', refreshedCurrent?.lane || 'missing')
    addCheck(checks, !args.closeCard || ['scoped', 'research', 'executing'].includes(refreshedNext?.lane), 'close-card keeps next card live', refreshedNext?.lane || 'missing')
    addCheck(checks, !args.closeCard || refreshedItem?.stage === 'done_this_sprint', 'close-card marks DECISION-005 done this sprint', refreshedItem?.stage || 'missing')
    addCheck(checks, !args.closeCard || refreshedActiveBlocker === DECISION_005_NEXT_CARD_ID, `close-card advances active blocker to ${DECISION_005_NEXT_CARD_ID}`, refreshedActiveBlocker || 'missing')
    addCheck(checks, !args.closeCard || closeoutDoc.includes(DECISION_005_CLOSEOUT_KEY), 'close-card writes DECISION-005 closeout handoff', closeoutDoc ? 'present' : DECISION_005_CLOSEOUT_PATH)

    const failed = checks.filter(check => !check.ok)
    const report = {
      ok: failed.length === 0,
      status: failed.length ? 'risk' : 'healthy',
      cardId: DECISION_005_CARD_ID,
      closeoutKey: DECISION_005_CLOSEOUT_KEY,
      nextCardId: DECISION_005_NEXT_CARD_ID,
      generatedAt: new Date().toISOString(),
      closed: args.closeCard,
      backfill,
      planSummary,
      activeBlocker: refreshedActiveBlocker,
      summary: {
        checks: checks.length,
        failed: failed.length,
        ...evaluation.summary,
      },
      checks,
      failed,
      snapshot: {
        status: snapshot.status,
        summary: snapshot.summary,
        lockedBlocked: snapshot.lockedBlocked,
      },
      dogfood,
    }

    if (args.json) {
      console.log(JSON.stringify(report, null, 2))
    } else {
      console.log(`DECISION-005 status: ${report.status}`)
      for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} -> ${check.detail}`)
      if (failed.length) process.exitCode = 1
    }
    if (failed.length) process.exitCode = 1
  } finally {
    if (dbInitialized) await closeFoundationDb()
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
})
