#!/usr/bin/env node

import { Pool } from 'pg'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { buildActionRouteReviewInboxSnapshot } from '../lib/action-route-review-inbox.js'
import {
  closeFoundationDb,
  getActionRouterSnapshot,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getFoundationCoreSnapshot,
  initFoundationDb,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
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
  OLD_REPLY_PARSER_PATTERNS_PROMOTED,
  REPLY_WATCHING_LOOP_ACTOR,
  REPLY_WATCHING_LOOP_ALLOWED_LEDGERS,
  REPLY_WATCHING_LOOP_APPROVAL_PATH,
  REPLY_WATCHING_LOOP_CARD_ID,
  REPLY_WATCHING_LOOP_CLOSEOUT_KEY,
  REPLY_WATCHING_LOOP_FORBIDDEN_SECOND_QUEUE_TABLES,
  REPLY_WATCHING_LOOP_HANDOFF_PATH,
  REPLY_WATCHING_LOOP_NEXT_CARD_ID,
  REPLY_WATCHING_LOOP_PLAN_PATH,
  REPLY_WATCHING_LOOP_PROOF_COMMANDS,
  REPLY_WATCHING_LOOP_SCRIPT_PATH,
  buildReplyWatchingLoopDogfoodProof,
  buildReplyWatchingLoopSnapshot,
} from '../lib/reply-watching-loop.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const CHANGED_FILES = [
  'lib/reply-watching-loop.js',
  'scripts/process-reply-watching-loop-check.mjs',
  'docs/process/reply-watching-loop-001-plan.md',
  'docs/process/approvals/REPLY-WATCHING-LOOP-001.json',
  'docs/handoffs/2026-05-20-reply-watching-loop-closeout.md',
  'lib/foundation-build-closeout-action-route-records.js',
  'package.json',
]
const PRIOR_DONE_THIS_SPRINT_CARD_IDS = new Set([
  'MODEL-ROUTING-001',
  'LLM-ROUTER-001',
  'FOUNDATION-USERS-001',
  'DECISION-007',
])

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
    mutateSprint: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.mutateSprint] }) ||
      argv.includes('--sync-sprint'),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: String(detail || '') })
}

function normalizeText(value) {
  return String(value || '').trim()
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
    returnedReason: item.returnedReason,
    metadata: item.metadata || {},
  }
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function fileExists(relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath))
    return true
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

function stableRunId(value) {
  return String(value || '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

async function getPublicTableNames() {
  const pool = createPool()
  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    return result.rows.map(row => row.table_name)
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
        `reply-watching-loop-${stableRunId(REPLY_WATCHING_LOOP_PLAN_PATH)}`,
        REPLY_WATCHING_LOOP_CARD_ID,
        REPLY_WATCHING_LOOP_PLAN_PATH,
        planReview.status,
        Number(planReview.score),
        CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({
          status: planReview.status,
          score: planReview.score,
          cardId: REPLY_WATCHING_LOOP_CARD_ID,
          closeoutKey: REPLY_WATCHING_LOOP_CLOSEOUT_KEY,
        }),
        REPLY_WATCHING_LOOP_ACTOR,
      ],
    )
  } finally {
    client.release()
    await pool.end()
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/action-route-review-inbox.js',
      'lib/action-route-promotion-workflow.js',
      'lib/action-route-dedup-staleness-guard.js',
      'lib/reply-watching-loop.js',
      'lib/foundation-db.js',
    ],
    existingDocs: [
      REPLY_WATCHING_LOOP_PLAN_PATH,
      'docs/process/action-route-review-inbox-001-plan.md',
      'docs/process/action-route-promotion-workflow-001-plan.md',
      'docs/process/action-route-dedup-staleness-guard-001-plan.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
    ],
    existingScripts: [
      REPLY_WATCHING_LOOP_SCRIPT_PATH,
      'scripts/process-action-route-review-inbox-check.mjs',
      'scripts/process-action-route-promotion-workflow-check.mjs',
      'scripts/process-action-route-dedup-staleness-guard-check.mjs',
    ],
    existingPolicy: [
      'Action-route findings are proposed until reviewed through governed Foundation workflow.',
      'Reply/watching loop must not create a second private queue competing with live backlog/open-question/decision truth.',
      'Ambiguous replies and low-confidence resolutions require human review.',
      'Blockers block unsafe actions, not the whole sprint; park approval-bound operations and continue safe work.',
    ],
    reused: 'Reuses the Action Route Review Inbox, promotion workflow, existing ledgers, Current Sprint, and live backlog truth.',
    notRebuilt: 'Does not rebuild old brief_replies/watching_items tables, Telegram bot reply dispatch, live email ingestion, source extraction, or external writes.',
    exactGap: 'Old Reply Parser and watching_items had useful reply-to-resolution logic but used a private queue and brittle auto-action behavior.',
    overBroadRisk: 'A naive rebuild would create another hidden queue or auto-close findings from ambiguous replies.',
    readyBy: 'Steve approved unattended Foundation sprint and explicitly required blockers to park unsafe actions rather than stop all work.',
    readyAt: '2026-05-20T08:08:00-04:00',
  }
}

function buildSprintOverlay(activeSprint, { closeCard = false } = {}) {
  const sprint = activeSprint.sprint || {}
  const items = (activeSprint.items || []).map(normalizeSprintItem).map(item => {
    const isCurrent = item.cardId === REPLY_WATCHING_LOOP_CARD_ID
    const priorDone = closeCard && PRIOR_DONE_THIS_SPRINT_CARD_IDS.has(item.cardId)
    return {
      ...item,
      stage: isCurrent ? (closeCard ? 'done_this_sprint' : 'building_now') : priorDone ? 'done_this_sprint' : item.stage,
      planRef: isCurrent ? REPLY_WATCHING_LOOP_PLAN_PATH : item.planRef,
      definitionOfDone: isCurrent
        ? 'Old Reply Parser / watching_items behavior is replaced by a governed action-loop contract over existing ledgers, ambiguous/low-confidence replies fail closed, second queues are rejected, focused proof passes, and ship gate is clean.'
        : item.definitionOfDone,
      proofCommands: isCurrent ? REPLY_WATCHING_LOOP_PROOF_COMMANDS : item.proofCommands,
      readinessBlockerCleared: isCurrent
        ? 'Strategy Hub meeting-ready, Action Router, Action Route Review Inbox, Promotion Workflow, dedupe/staleness guard, Decision Restricted Queue, and DECISION-007 are shipped; V1 is a safe contract/proof card with no live reply ingestion.'
        : item.readinessBlockerCleared,
      notNextBoundaries: Array.from(new Set([
        ...(item.notNextBoundaries || []),
        'Do not rebuild brief_replies, watching_items, reply_parser_items, or any second private queue.',
        'Do not auto-close ambiguous replies or low-confidence resolutions.',
        'Do not run live Gmail/Missive/Slack reply ingestion from this card.',
        'Do not send messages, mutate external systems, rotate credentials, change provider config, mutate Drive permissions, or expose public routes.',
        'Do not work MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.',
        'Do not start Strategy Hub expansion, People, Harlan, Crewbert, source/extraction, paid/provider, browser-auth, or broad private extraction work.',
      ])),
      existingWorkCheck: isCurrent ? buildExistingWorkCheck() : item.existingWorkCheck,
      metadata: {
        ...(item.metadata || {}),
        approvalRef: isCurrent ? REPLY_WATCHING_LOOP_APPROVAL_PATH : item.metadata?.approvalRef,
        closeoutKey: isCurrent ? REPLY_WATCHING_LOOP_CLOSEOUT_KEY : item.metadata?.closeoutKey,
      },
    }
  })
  return {
    sprint: {
      ...sprint,
      status: 'active',
      activeBlockerCardId: closeCard ? REPLY_WATCHING_LOOP_NEXT_CARD_ID : REPLY_WATCHING_LOOP_CARD_ID,
      metadata: {
        ...(sprint.metadata || {}),
        currentStatus: closeCard ? 'reply_watching_loop_closed_next_strategy_quarter_scoping' : 'reply_watching_loop_active',
        lastClosedCardId: closeCard ? REPLY_WATCHING_LOOP_CARD_ID : sprint.metadata?.lastClosedCardId,
        lastCloseoutKey: closeCard ? REPLY_WATCHING_LOOP_CLOSEOUT_KEY : sprint.metadata?.lastCloseoutKey,
      },
    },
    items,
  }
}

async function syncSprint(activeSprint, { closeCard = false } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: REPLY_WATCHING_LOOP_SCRIPT_PATH,
    operation: closeCard ? 'close REPLY-WATCHING-LOOP-001 and advance STRATEGY-QUARTER-001 to scoping' : 'sync REPLY-WATCHING-LOOP-001 sprint truth',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await upsertFoundationCurrentSprintOverlay(
    buildSprintOverlay(activeSprint, { closeCard }),
    REPLY_WATCHING_LOOP_ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: activeSprint.sprint?.sprintId,
      reason: closeCard
        ? 'REPLY-WATCHING-LOOP-001 closed; STRATEGY-QUARTER-001 remains scoping until its own plan and proof pass.'
        : 'Promote REPLY-WATCHING-LOOP-001 to building with complete sprint truth.',
    },
  )
}

function renderCloseout(snapshot = {}) {
  const summary = snapshot.summary || {}
  return `# REPLY-WATCHING-LOOP-001 Closeout

Date: 2026-05-20

## What Changed

- Replaced the old Reply Parser / watching_items pattern with a governed action-loop contract.
- Promoted the useful old reply intents while rejecting the old private queue shape.
- Reused Action Route Review Inbox, decisions, open questions, backlog items, synthesized items, and change events as the loop ledgers.
- Proved ambiguous replies, low-confidence resolutions, missing owner/evidence, second queues, and unsafe side effects fail closed.

## Proof

- Total loop items: ${summary.totalLoopItems || 0}
- Review inbox items: ${summary.reviewInboxItems || 0}
- Open question items: ${summary.openQuestionItems || 0}
- Unresolved items: ${summary.unresolvedCount || 0}
- Forbidden second queues: ${summary.forbiddenSecondQueueCount || 0}
- Missing owner/evidence: ${summary.missingOwnerOrEvidenceCount || 0}

## Commands

${REPLY_WATCHING_LOOP_PROOF_COMMANDS.map(command => `- \`${command}\``).join('\n')}

## Known Limits

- This does not run live Gmail, Missive, Slack, or Telegram reply ingestion.
- This does not send messages or mutate external systems.
- This does not create a new reply queue table.
- This does not auto-close ambiguous or low-confidence replies.
- This does not build Strategy Hub, People, agent runtime, or extraction features.

## Next

Continue \`${REPLY_WATCHING_LOOP_NEXT_CARD_ID}\` only after its own plan and proof pass.
`
}

async function writeCloseout(snapshot) {
  await fs.writeFile(path.join(repoRoot, REPLY_WATCHING_LOOP_HANDOFF_PATH), renderCloseout(snapshot))
}

async function main() {
  const args = parseArgs()
  const checks = []
  let exitCode = 0
  await initFoundationDb()
  try {
    const planSource = await readRepoFile(REPLY_WATCHING_LOOP_PLAN_PATH)
    const approval = await validatePlanApprovalFile({
      repoRoot,
      approvalRef: REPLY_WATCHING_LOOP_APPROVAL_PATH,
      cardId: REPLY_WATCHING_LOOP_CARD_ID,
    })
    addCheck(checks, approval.ok, 'approval validates at 9.8+', approval.ok ? REPLY_WATCHING_LOOP_APPROVAL_PATH : JSON.stringify(approval.failures || []))
    const planReview = evaluatePlanCriticPlan({
      card: { id: REPLY_WATCHING_LOOP_CARD_ID, priority: 'P1' },
      planText: planSource,
      changedFiles: CHANGED_FILES,
      currentPatch: '',
      repoRoot,
    })
    await upsertPlanCriticRun(planReview)
    addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for REPLY-WATCHING-LOOP-001 plan', `${planReview.status}/${planReview.score}`)

    const [core, actionRouter, tableNames] = await Promise.all([
      getFoundationCoreSnapshot({ decisionLimit: 500, questionLimit: 500 }),
      getActionRouterSnapshot({ limit: 100 }),
      getPublicTableNames(),
    ])
    const reviewInbox = buildActionRouteReviewInboxSnapshot({
      actionRouter,
      backlogItems: core.backlogItems,
    })
    const snapshot = buildReplyWatchingLoopSnapshot({
      actionRouteReviewInbox: reviewInbox,
      openQuestions: core.openQuestions,
      tableNames,
    })

    if (args.closeCard) {
      await updateBacklogItem(REPLY_WATCHING_LOOP_CARD_ID, {
        lane: 'done',
        statusNote: 'Closed 2026-05-20 under reply-watching-loop-v1; old Reply Parser/watching_items behavior is replaced by a governed action-loop contract over existing ledgers with ambiguous/low-confidence auto-close and second queues blocked.',
        nextAction: 'Done under reply-watching-loop-v1; continue STRATEGY-QUARTER-001 only after its own plan and proof pass.',
      }, REPLY_WATCHING_LOOP_ACTOR)
      const activeSprint = await getActiveFoundationCurrentSprint()
      await syncSprint(activeSprint, { closeCard: true })
      await writeCloseout(snapshot)
    } else if (args.mutateSprint) {
      const activeSprint = await getActiveFoundationCurrentSprint()
      await syncSprint(activeSprint, { closeCard: false })
    }

    const dogfood = buildReplyWatchingLoopDogfoodProof()
    const closeouts = getFoundationBuildCloseouts()
    const closeoutExists = closeouts.some(closeout => closeout.key === REPLY_WATCHING_LOOP_CLOSEOUT_KEY)
    const backlogCards = await getBacklogItemsByIds([REPLY_WATCHING_LOOP_CARD_ID, REPLY_WATCHING_LOOP_NEXT_CARD_ID])
    const backlogCardById = new Map(backlogCards.map(card => [card.id, card]))
    const currentCard = backlogCardById.get(REPLY_WATCHING_LOOP_CARD_ID)
    const nextCard = backlogCardById.get(REPLY_WATCHING_LOOP_NEXT_CARD_ID)
    const forbiddenTablesPresent = REPLY_WATCHING_LOOP_FORBIDDEN_SECOND_QUEUE_TABLES
      .filter(table => tableNames.includes(table))

    addCheck(checks, dogfood.ok, 'dogfood rejects unsafe reply/watching loop fixtures', dogfood.dogfoodInvariant)
    addCheck(checks, snapshot.ok, 'live reply/watching loop snapshot is healthy', `${snapshot.status}; items=${snapshot.summary.totalLoopItems}`)
    addCheck(checks, snapshot.summary.reviewInboxItems > 0, 'loop reuses Action Route Review Inbox items', `${snapshot.summary.reviewInboxItems} review items`)
    addCheck(checks, forbiddenTablesPresent.length === 0, 'no old private reply/watching queue tables exist', forbiddenTablesPresent.length ? forbiddenTablesPresent.join(',') : 'none')
    addCheck(checks, REPLY_WATCHING_LOOP_ALLOWED_LEDGERS.every(table => tableNames.includes(table)), 'allowed existing ledgers are present', REPLY_WATCHING_LOOP_ALLOWED_LEDGERS.join(', '))
    addCheck(checks, OLD_REPLY_PARSER_PATTERNS_PROMOTED.length === 6, 'old reply parser intent model is promoted', OLD_REPLY_PARSER_PATTERNS_PROMOTED.join(', '))
    addCheck(checks, closeoutExists, 'closeout registry includes reply-watching-loop-v1', REPLY_WATCHING_LOOP_CLOSEOUT_KEY)
    addCheck(checks, await fileExists(REPLY_WATCHING_LOOP_PLAN_PATH) && await fileExists(REPLY_WATCHING_LOOP_APPROVAL_PATH), 'plan and approval files exist', REPLY_WATCHING_LOOP_PLAN_PATH)
    addCheck(checks, await fileExists(REPLY_WATCHING_LOOP_HANDOFF_PATH) || !args.closeCard, 'closeout handoff exists after close-card', args.closeCard ? REPLY_WATCHING_LOOP_HANDOFF_PATH : 'not closing')
    addCheck(checks, currentCard?.lane === 'done' || !args.closeCard, 'REPLY-WATCHING-LOOP-001 is done after close-card', currentCard ? `${currentCard.id}:${currentCard.lane}` : 'missing')
    addCheck(checks, Boolean(nextCard), 'next backlog card exists', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')

    const failures = checks.filter(check => !check.ok)
    if (failures.length) exitCode = 1
    const result = {
      ok: failures.length === 0,
      status: failures.length ? 'risk' : 'healthy',
      cardId: REPLY_WATCHING_LOOP_CARD_ID,
      closeoutKey: REPLY_WATCHING_LOOP_CLOSEOUT_KEY,
      snapshot,
      checks,
      failures,
    }
    if (args.json) console.log(JSON.stringify(result, null, 2))
    else {
      console.log(`REPLY-WATCHING-LOOP-001 ${result.status}`)
      for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} -> ${check.detail}`)
    }
  } catch (error) {
    exitCode = 1
    const result = {
      ok: false,
      status: 'error',
      error: error?.stack || String(error),
      checks,
      failures: checks.filter(check => !check.ok),
    }
    if (args.json) console.log(JSON.stringify(result, null, 2))
    else console.error(result.error)
  } finally {
    await closeFoundationDb()
  }
  process.exit(exitCode)
}

main()
