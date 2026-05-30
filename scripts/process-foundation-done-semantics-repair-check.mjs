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
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
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
  FOUNDATION_DONE_SEMANTICS_REPAIR_APPROVAL_PATH,
  FOUNDATION_DONE_SEMANTICS_REPAIR_CARD_ID,
  FOUNDATION_DONE_SEMANTICS_REPAIR_CHANGED_FILES,
  FOUNDATION_DONE_SEMANTICS_REPAIR_CLOSEOUT_KEY,
  FOUNDATION_DONE_SEMANTICS_REPAIR_NEXT_CARD_ID,
  FOUNDATION_DONE_SEMANTICS_REPAIR_NOT_NEXT_BOUNDARIES,
  FOUNDATION_DONE_SEMANTICS_REPAIR_PLAN_PATH,
  FOUNDATION_DONE_SEMANTICS_REPAIR_PROOF_COMMANDS,
  FOUNDATION_DONE_SEMANTICS_REPAIR_SCRIPT_PATH,
  buildFoundationDoneSemanticsRepairDogfoodProof,
  buildFoundationDoneSemanticsRepairSnapshot,
} from '../lib/foundation-done-semantics-repair.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-done-semantics-repair'
const PACKAGE_SCRIPT = 'process:foundation-done-semantics-repair-check'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: false,
    closeCard: false,
    stage: 'building_now',
  }
  for (const rawArg of argv) {
    const arg = String(rawArg || '')
    if (arg === '--apply' || arg === '--apply=true') args.apply = true
    if (arg === '--close-card' || arg === '--close-card=true') args.closeCard = true
    if (arg.startsWith('--stage=')) args.stage = arg.slice('--stage='.length)
  }
  args.apply = args.apply || isProcessCheckWriteRequested({
    argv,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  args.closeCard = args.closeCard || isProcessCheckWriteRequested({
    argv,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function stableRunId(seed = '') {
  return crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 12)
}

function normalizeStage(stage = 'building_now') {
  return ['scoping', 'sprint_ready', 'building_now'].includes(stage) ? stage : 'building_now'
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

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

async function readLiveBacklogItems() {
  const pool = createPool()
  try {
    const result = await pool.query(`
      SELECT id, title, team, team AS scope, lane, priority, rank, source,
             summary, why_it_matters AS "whyItMatters",
             next_action AS "nextAction", status_note AS "statusNote",
             owner, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM backlog_items
      ORDER BY rank NULLS LAST, created_at ASC
    `)
    return result.rows
  } finally {
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
        `foundation-done-semantics-repair-${stableRunId(FOUNDATION_DONE_SEMANTICS_REPAIR_PLAN_PATH)}`,
        FOUNDATION_DONE_SEMANTICS_REPAIR_CARD_ID,
        FOUNDATION_DONE_SEMANTICS_REPAIR_PLAN_PATH,
        planReview.status,
        planReview.score,
        FOUNDATION_DONE_SEMANTICS_REPAIR_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({
          status: planReview.status,
          score: planReview.score,
          cardId: FOUNDATION_DONE_SEMANTICS_REPAIR_CARD_ID,
          closeoutKey: FOUNDATION_DONE_SEMANTICS_REPAIR_CLOSEOUT_KEY,
          summary: buildPlanCriticResultSummary(planReview),
        }),
        ACTOR,
      ],
    )
  } finally {
    client.release()
    await pool.end()
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  return {
    cardId: FOUNDATION_DONE_SEMANTICS_REPAIR_CARD_ID,
    order: 8,
    stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
    planRef: FOUNDATION_DONE_SEMANTICS_REPAIR_PLAN_PATH,
    definitionOfDone: 'Backlog list, done archive, card detail, and UI readback classify done rows as behavior-proven, V1 contract, preflight/contract, blocked/waiting, blocked preflight, or unclear; V1/preflight/blocked/unclear rows cannot read as feature-complete; focused proof dogfoods the exact audit failure mode.',
    proofCommands: FOUNDATION_DONE_SEMANTICS_REPAIR_PROOF_COMMANDS,
    readinessBlockerCleared: 'Oversized public/dev.css split shipped; next safe card is readback semantics with no historical card rewrite.',
    notNextBoundaries: FOUNDATION_DONE_SEMANTICS_REPAIR_NOT_NEXT_BOUNDARIES,
    metadata: {
      approvalRef: FOUNDATION_DONE_SEMANTICS_REPAIR_APPROVAL_PATH,
      closeoutKey: FOUNDATION_DONE_SEMANTICS_REPAIR_CLOSEOUT_KEY,
      v1Scope: 'done-readback-semantics-no-history-rewrite',
      nextCardId: FOUNDATION_DONE_SEMANTICS_REPAIR_NEXT_CARD_ID,
    },
  }
}

function mergeSprintItems(currentSprint = {}, item, closeCard = false) {
  const nextItems = list(currentSprint.items).map(existing => {
    if (existing.cardId !== FOUNDATION_DONE_SEMANTICS_REPAIR_CARD_ID) return existing
    return {
      ...existing,
      ...item,
      order: existing.order || existing.sprintOrder || item.order,
      sprintOrder: existing.sprintOrder || existing.order || item.order,
    }
  })
  if (!nextItems.some(existing => existing.cardId === FOUNDATION_DONE_SEMANTICS_REPAIR_CARD_ID)) {
    nextItems.push(item)
  }
  if (!closeCard) return nextItems
  return nextItems.map(existing => {
    if (existing.cardId !== FOUNDATION_DONE_SEMANTICS_REPAIR_NEXT_CARD_ID) return existing
    return {
      ...existing,
      stage: existing.stage === 'done_this_sprint' ? existing.stage : 'scoping',
    }
  })
}

async function applyLiveState({ closeCard = false, stage = 'building_now', planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: FOUNDATION_DONE_SEMANTICS_REPAIR_SCRIPT_PATH,
    operation: 'update done-semantics backlog, Plan Critic, and Current Sprint state',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })

  await updateBacklogItem(FOUNDATION_DONE_SEMANTICS_REPAIR_CARD_ID, {
    lane: closeCard ? 'done' : 'executing',
    priority: 'P1',
    rank: 8,
    nextAction: closeCard
      ? `Done under ${FOUNDATION_DONE_SEMANTICS_REPAIR_CLOSEOUT_KEY}; continue ${FOUNDATION_DONE_SEMANTICS_REPAIR_NEXT_CARD_ID}.`
      : 'Add done-outcome readback to backlog list/archive/detail/UI and prove V1, preflight, blocked, and unclear rows cannot read as feature-complete.',
    statusNote: closeCard
      ? `Closed on 2026-05-30 under ${FOUNDATION_DONE_SEMANTICS_REPAIR_CLOSEOUT_KEY}. Backlog API/UI now classify done rows by outcome and expose explicit review candidates without rewriting historical cards.`
      : `Building ${FOUNDATION_DONE_SEMANTICS_REPAIR_CLOSEOUT_KEY}; V1 is readback semantics only, not a historical card rewrite or verifier cleanup.`,
    owner: 'Foundation Builder',
  }, ACTOR)
  await upsertPlanCriticRun(planReview)

  const activeSprint = await getActiveFoundationCurrentSprint()
  const sprintId = activeSprint.sprint?.sprintId || 'FOUNDATION-TUNEUP-2026-05-29'
  const item = buildSprintItem({ closeCard, stage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId,
        status: activeSprint.sprint?.status || 'active',
        goal: activeSprint.sprint?.goal || 'Foundation tune-up from Claude/Codex audits.',
        activeBlockerCardId: closeCard
          ? FOUNDATION_DONE_SEMANTICS_REPAIR_NEXT_CARD_ID
          : FOUNDATION_DONE_SEMANTICS_REPAIR_CARD_ID,
        metadata: {
          ...(activeSprint.sprint?.metadata || {}),
          activeBlockerCardId: closeCard
            ? FOUNDATION_DONE_SEMANTICS_REPAIR_NEXT_CARD_ID
            : FOUNDATION_DONE_SEMANTICS_REPAIR_CARD_ID,
          doneSemanticsRepairV1: closeCard ? 'done_readback_semantics' : 'building_done_readback_semantics',
          nextAction: closeCard
            ? `Continue ${FOUNDATION_DONE_SEMANTICS_REPAIR_NEXT_CARD_ID}; keep per-hub restructure parked for Steve checkpoint.`
            : 'Finish done-outcome readback and prove V1/preflight/blocked rows cannot appear feature-complete.',
        },
      },
      items: mergeSprintItems(activeSprint, item, closeCard),
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: sprintId,
      reason: 'Steve approved overnight Foundation tune-up continuation; done semantics repair is the active readback card.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  let applied = false

  await initFoundationDb()
  try {
    const [
      packageJson,
      planSource,
      backlogModuleSource,
      foundationUiSource,
      closeoutSource,
      coverageSource,
      backlogItems,
    ] = await Promise.all([
      readRepoJson('package.json'),
      readRepoFile(FOUNDATION_DONE_SEMANTICS_REPAIR_PLAN_PATH),
      readRepoFile('lib/foundation-backlog-detail.js'),
      readRepoFile('public/foundation.js'),
      readRepoFile('lib/foundation-build-closeout-process-gate-operations-records.js'),
      readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
      readLiveBacklogItems(),
    ])
    const planReview = evaluatePlanCriticPlan({
      card: {
        id: FOUNDATION_DONE_SEMANTICS_REPAIR_CARD_ID,
        priority: 'P1',
      },
      planRef: FOUNDATION_DONE_SEMANTICS_REPAIR_PLAN_PATH,
      planText: planSource,
      changedFiles: FOUNDATION_DONE_SEMANTICS_REPAIR_CHANGED_FILES,
      declaredRisk: 'Backlog API contract/readback semantics, UI rendering, package script, Current Sprint state, closeout metadata, and Foundation verifier proof.',
    })
    const snapshot = buildFoundationDoneSemanticsRepairSnapshot({
      backlogItems,
      backlogModuleSource,
      foundationUiSource,
      packageScripts: packageJson.scripts || {},
      closeoutSource,
      coverageSource,
    })
    const dogfood = buildFoundationDoneSemanticsRepairDogfoodProof()

    if (args.apply || args.closeCard) {
      await applyLiveState({ closeCard: args.closeCard, stage: args.stage, planReview })
      applied = true
    }

    const activeSprint = await getActiveFoundationCurrentSprint()
    const backlogCards = await getBacklogItemsByIds(list(activeSprint.items).map(item => item.cardId))
    const planCriticRuns = await getPlanCriticRunsByCardIds(list(activeSprint.items).map(item => item.cardId))
    const currentSprintStatus = buildFoundationCurrentSprintStatus({
      sprint: activeSprint.sprint,
      items: activeSprint.items,
      backlogItems: backlogCards,
      closeouts: getFoundationBuildCloseouts(),
      planCriticRuns,
    })
    const activeItem = list(activeSprint.items)
      .find(item => item.cardId === FOUNDATION_DONE_SEMANTICS_REPAIR_CARD_ID)
    const liveCards = await getBacklogItemsByIds([
      FOUNDATION_DONE_SEMANTICS_REPAIR_CARD_ID,
      FOUNDATION_DONE_SEMANTICS_REPAIR_NEXT_CARD_ID,
    ])
    const liveCard = liveCards.find(card => card.id === FOUNDATION_DONE_SEMANTICS_REPAIR_CARD_ID)
    const nextCard = liveCards.find(card => card.id === FOUNDATION_DONE_SEMANTICS_REPAIR_NEXT_CARD_ID)
    const approval = args.closeCard
      ? await validatePlanApprovalFile({
        repoRoot,
        approvalRef: FOUNDATION_DONE_SEMANTICS_REPAIR_APPROVAL_PATH,
        cardId: FOUNDATION_DONE_SEMANTICS_REPAIR_CARD_ID,
      })
      : null

    addCheck(
      checks,
      packageJson.scripts?.[PACKAGE_SCRIPT] ===
        'node --env-file-if-exists=.env scripts/process-foundation-done-semantics-repair-check.mjs',
      'package script points at focused done-semantics checker',
      packageJson.scripts?.[PACKAGE_SCRIPT] || 'missing',
    )
    addCheck(
      checks,
      planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE,
      'Plan Critic passes at 9.8+',
      `${planReview.score}/10 ${planReview.status}`,
    )
    addCheck(
      checks,
      snapshot.ok === true,
      'done-semantics snapshot is healthy',
      snapshot.failed.map(check => check.check).join('; ') || 'healthy',
    )
    addCheck(
      checks,
      dogfood.ok === true,
      'dogfood proves limiting done rows are not feature-complete',
      dogfood.ok ? 'healthy' : 'failed',
    )
    addCheck(
      checks,
      Boolean(activeItem || args.closeCard) &&
        (args.closeCard || !applied || activeItem.stage === normalizeStage(args.stage)),
      'Current Sprint contains done-semantics card at expected stage',
      activeItem ? `${activeItem.cardId}/${activeItem.stage}` : 'closed',
    )
    if (args.closeCard) {
      addCheck(
        checks,
        liveCard?.lane === 'done' &&
          activeSprint.sprint?.activeBlockerCardId === FOUNDATION_DONE_SEMANTICS_REPAIR_NEXT_CARD_ID &&
          nextCard?.id === FOUNDATION_DONE_SEMANTICS_REPAIR_NEXT_CARD_ID,
        'close-card advances to orphan-script review without starting per-hub restructure',
        `lane=${liveCard?.lane || 'missing'} active=${activeSprint.sprint?.activeBlockerCardId || 'missing'} nextLane=${nextCard?.lane || 'missing'}`,
      )
      addCheck(
        checks,
        approval?.ok === true,
        'close-card approval is valid',
        approval?.ok ? 'approval valid' : (approval?.failures || []).map(failure => failure.check).join('; '),
      )
    }

    const failed = checks.filter(check => !check.ok)
    const result = {
      ok: failed.length === 0,
      status: failed.length === 0 ? 'healthy' : 'blocked',
      cardId: FOUNDATION_DONE_SEMANTICS_REPAIR_CARD_ID,
      closeoutKey: FOUNDATION_DONE_SEMANTICS_REPAIR_CLOSEOUT_KEY,
      nextCardId: FOUNDATION_DONE_SEMANTICS_REPAIR_NEXT_CARD_ID,
      applied,
      closeCard: args.closeCard,
      snapshotSummary: snapshot.summary,
      planReview: {
        status: planReview.status,
        score: planReview.score,
        summary: buildPlanCriticResultSummary(planReview),
      },
      currentSprint: {
        sprintId: activeSprint.sprint?.sprintId || null,
        activeBlockerCardId: activeSprint.sprint?.activeBlockerCardId || null,
        status: currentSprintStatus.status,
      },
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else if (result.ok) {
      console.log(`${FOUNDATION_DONE_SEMANTICS_REPAIR_CARD_ID}: healthy`)
    } else {
      console.error(`${FOUNDATION_DONE_SEMANTICS_REPAIR_CARD_ID}: blocked`)
      for (const failure of failed) console.error(`- ${failure.check}: ${failure.detail}`)
    }
    process.exitCode = result.ok ? 0 : 1
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack : String(error))
  process.exitCode = 1
})
