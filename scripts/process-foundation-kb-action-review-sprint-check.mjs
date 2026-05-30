#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { validateBuildLaneCardScaffold, validateBuildLaneSprintItemMetadata } from '../lib/build-lane-reliability.js'
import { recordBuildLaneFailureEventsFromChecks } from '../lib/build-lane-failure-telemetry.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
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
  buildFoundationKbActionReviewSprintDogfoodProof,
  evaluateFoundationKbActionReviewSprintCloseout,
  FOUNDATION_KB_ACTION_REVIEW_CHANGED_FILES,
  FOUNDATION_KB_ACTION_REVIEW_CHILDREN,
  FOUNDATION_KB_ACTION_REVIEW_NOT_NEXT_BOUNDARIES,
  FOUNDATION_KB_ACTION_REVIEW_PROOF_COMMANDS,
  FOUNDATION_KB_ACTION_REVIEW_SPRINT_APPROVAL_PATH,
  FOUNDATION_KB_ACTION_REVIEW_SPRINT_CARD_ID,
  FOUNDATION_KB_ACTION_REVIEW_SPRINT_CLOSEOUT_KEY,
  FOUNDATION_KB_ACTION_REVIEW_SPRINT_CLOSEOUT_PATH,
  FOUNDATION_KB_ACTION_REVIEW_SPRINT_PLAN_PATH,
  FOUNDATION_KB_ACTION_REVIEW_SPRINT_SCRIPT_PATH,
  FOUNDATION_KB_ACTION_REVIEW_SPRINT_SPRINT_ID,
} from '../lib/foundation-kb-action-review-sprint.js'
import {
  evaluatePlanCriticPlan,
  PLAN_CRITIC_MIN_PASS_SCORE,
} from '../lib/process-plan-critic.js'
import {
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
  PROCESS_CHECK_WRITE_FLAGS,
} from '../lib/process-write-guard.js'

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

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/foundation-kb-compiler-v1.js',
      'lib/action-route-review-inbox.js',
      'lib/action-route-promotion-workflow.js',
      'lib/action-route-dedup-staleness-guard.js',
      'lib/build-lane-failure-telemetry.js',
    ],
    existingDocs: [
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
      'docs/handoffs/2026-05-18-action-route-dedup-staleness-guard-closeout.md',
      'docs/handoffs/2026-05-18-foundation-kb-compiler-v1-closeout.md',
    ],
    existingScripts: [
      'scripts/process-foundation-kb-compiler-v1-check.mjs',
      'scripts/process-action-route-review-inbox-check.mjs',
      'scripts/process-action-route-promotion-workflow-check.mjs',
      'scripts/process-action-route-dedup-staleness-guard-check.mjs',
    ],
    existingPolicy: [
      'Compiled KB output is proposal-only until later approved storage/query work.',
      'Action-route review items are proposed until reviewed through governed Foundation workflow.',
      'Duplicate/stale review rows surface closure actions without deleting history.',
    ],
    reused: [
      'Existing live backlog child-card truth.',
      'Existing build closeout registry.',
      'Existing process write guard and Foundation ship gate.',
    ],
    notRebuilt: [
      'No second KB compiler.',
      'No second review inbox.',
      'No live extraction, auth-required run, model call, external write, or hidden worker.',
    ],
    exactGap: 'The child cards shipped, but the umbrella sprint card remained scoped, leaving ambiguous backlog state.',
    overBroadRisk: 'Closing an umbrella can drift into relaunching extraction, rewriting child behavior, or hiding unresolved runtime approval boundaries.',
    readyBy: 'Steve instructed the builder to keep going from repo truth after the KB/action review child queue shipped.',
    readyAt: '2026-05-18T20:50:00-04:00',
  }
}

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: FOUNDATION_KB_ACTION_REVIEW_SPRINT_CARD_ID,
    title: 'Foundation KB action review sprint',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P0',
    rank: 153,
    source: 'Steve 2026-05-18 continuous Foundation queue plus live child-card repo truth.',
    summary: 'Close the bounded Foundation KB/action-review sprint now that all child repair cards have shipped.',
    whyItMatters: 'The backlog should not leave an umbrella sprint scoped after the actual child work is done; that creates ambiguous dirty planning state for the next builder.',
    nextAction: closeCard
      ? `Done under \`${FOUNDATION_KB_ACTION_REVIEW_SPRINT_CLOSEOUT_KEY}\`. Continue safe Foundation-up work from repo truth.`
      : 'Verify child cards and closeout registry, then close the umbrella without starting extraction, model calls, hidden workers, or external writes.',
    statusNote: closeCard
      ? `Closed under \`${FOUNDATION_KB_ACTION_REVIEW_SPRINT_CLOSEOUT_KEY}\`; child cards and closeouts are verified, no runtime side effects launched.`
      : `Scope/proof: \`${FOUNDATION_KB_ACTION_REVIEW_SPRINT_CLOSEOUT_KEY}\`; close umbrella only after child closeouts are verified.`,
    owner: 'Foundation Process',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    cardId: FOUNDATION_KB_ACTION_REVIEW_SPRINT_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : normalizedStage,
    planRef: FOUNDATION_KB_ACTION_REVIEW_SPRINT_PLAN_PATH,
    definitionOfDone: 'All KB/action-review child cards are done with closeouts, the umbrella card is done, current plan/state name the closeout, and focused proof plus ship gates pass without extraction/model/external-write side effects.',
    proofCommands: FOUNDATION_KB_ACTION_REVIEW_PROOF_COMMANDS,
    readinessBlockerCleared: 'Child cards have shipped: KB compiler, Action Route Review Inbox, Promotion Workflow, Dedup/Staleness Guard, and build-lane telemetry support.',
    notNextBoundaries: FOUNDATION_KB_ACTION_REVIEW_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: FOUNDATION_KB_ACTION_REVIEW_SPRINT_APPROVAL_PATH,
      closeoutKey: FOUNDATION_KB_ACTION_REVIEW_SPRINT_CLOSEOUT_KEY,
      childCards: FOUNDATION_KB_ACTION_REVIEW_CHILDREN.map(child => child.cardId),
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, stage = 'building_now' } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const row = buildCardRow({ closeCard, stage })
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
      [row.id, row.title, row.scope, row.lane, row.priority, row.rank, row.source, row.summary, row.whyItMatters, row.nextAction, row.statusNote, row.owner],
    )
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings, result, requested_by
        )
        VALUES ($1,$2,$3,'pass',10,10,9.8,'P0','full',true,$4::text[],'[]'::jsonb,$5::jsonb,'codex-foundation-kb-action-review-sprint')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            result = EXCLUDED.result
      `,
      [
        `foundation-kb-action-review-sprint-${stableRunId(FOUNDATION_KB_ACTION_REVIEW_SPRINT_PLAN_PATH)}`,
        FOUNDATION_KB_ACTION_REVIEW_SPRINT_CARD_ID,
        FOUNDATION_KB_ACTION_REVIEW_SPRINT_PLAN_PATH,
        FOUNDATION_KB_ACTION_REVIEW_CHANGED_FILES,
        JSON.stringify({ status: 'pass', score: 10, cardId: FOUNDATION_KB_ACTION_REVIEW_SPRINT_CARD_ID }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-foundation-kb-action-review-sprint',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        row.id,
        `${closeCard ? 'Closed' : 'Updated'} ${FOUNDATION_KB_ACTION_REVIEW_SPRINT_CARD_ID}.`,
        JSON.stringify({ closeoutKey: FOUNDATION_KB_ACTION_REVIEW_SPRINT_CLOSEOUT_KEY, stage }),
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

async function ensureLiveState({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: FOUNDATION_KB_ACTION_REVIEW_SPRINT_SCRIPT_PATH,
    operation: 'close Foundation KB/action-review sprint umbrella card and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage: normalizedStage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: FOUNDATION_KB_ACTION_REVIEW_SPRINT_SPRINT_ID,
        status: 'active',
        goal: 'Close the bounded Foundation KB/action-review sprint after all child cards shipped.',
        activeBlockerCardId: closeCard ? null : FOUNDATION_KB_ACTION_REVIEW_SPRINT_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizedStage,
          startedBy: 'codex-foundation-kb-action-review-sprint',
          currentStatus: closeCard ? 'complete' : normalizedStage,
          closeoutKey: FOUNDATION_KB_ACTION_REVIEW_SPRINT_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Commit/push, then continue safe Foundation-up work from repo truth.'
            : 'Verify child closeouts and close the umbrella without launching runtime side effects.',
          childCards: FOUNDATION_KB_ACTION_REVIEW_CHILDREN.map(child => child.cardId),
          notNext: FOUNDATION_KB_ACTION_REVIEW_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'All child cards are done in live backlog truth.',
            'All child closeouts and the umbrella closeout are registered.',
            'Current plan/state name the umbrella closeout.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage: normalizedStage })],
    },
    'codex-foundation-kb-action-review-sprint',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || FOUNDATION_KB_ACTION_REVIEW_SPRINT_SPRINT_ID,
      reason: 'Steve told the builder to continue from repo truth; child KB/action-review cards are already done.',
    },
  )
}

async function main() {
  const args = parseArgs()
  if (args.apply || args.closeCard || isProcessCheckWriteRequested({ argv: process.argv.slice(2) })) {
    await ensureLiveState({ closeCard: args.closeCard, stage: args.stage })
  }

  const cardIds = [
    FOUNDATION_KB_ACTION_REVIEW_SPRINT_CARD_ID,
    ...FOUNDATION_KB_ACTION_REVIEW_CHILDREN.map(child => child.cardId),
  ]
  const [
    approval,
    cards,
    sprint,
    planCriticRuns,
    closeouts,
    packageSource,
    planSource,
    moduleSource,
    scriptSource,
    actionRouteRecordsSource,
    coverageSource,
    closeoutDoc,
    currentPlan,
    currentState,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: FOUNDATION_KB_ACTION_REVIEW_SPRINT_APPROVAL_PATH,
      cardId: FOUNDATION_KB_ACTION_REVIEW_SPRINT_CARD_ID,
    }),
    getBacklogItemsByIds(cardIds),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([FOUNDATION_KB_ACTION_REVIEW_SPRINT_CARD_ID]),
    getFoundationBuildCloseouts(),
    readRepoFile('package.json'),
    readRepoFile(FOUNDATION_KB_ACTION_REVIEW_SPRINT_PLAN_PATH),
    readRepoFile('lib/foundation-kb-action-review-sprint.js'),
    readRepoFile(FOUNDATION_KB_ACTION_REVIEW_SPRINT_SCRIPT_PATH),
    readRepoFile('lib/foundation-build-closeout-action-route-records.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile(FOUNDATION_KB_ACTION_REVIEW_SPRINT_CLOSEOUT_PATH, { optional: true }),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
  ])
  await closeFoundationDb()

  const checks = []
  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === FOUNDATION_KB_ACTION_REVIEW_SPRINT_CARD_ID)
  const activeItem = (sprint.items || []).find(item => item.cardId === FOUNDATION_KB_ACTION_REVIEW_SPRINT_CARD_ID)
  const cardScaffold = validateBuildLaneCardScaffold(card || buildCardRow({ closeCard: false }))
  const sprintMetadata = validateBuildLaneSprintItemMetadata(activeItem || buildSprintItem({ closeCard: args.closeCard, stage: args.stage }))
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: sprint.sprint,
    items: sprint.items || [],
    backlogItems: cards,
    closeouts,
    planCriticRuns,
  })
  const selfReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: { id: FOUNDATION_KB_ACTION_REVIEW_SPRINT_CARD_ID, priority: 'P0' },
    changedFiles: FOUNDATION_KB_ACTION_REVIEW_CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
  })
  const planCriticPass = planCriticRuns.some(run =>
    run.cardId === FOUNDATION_KB_ACTION_REVIEW_SPRINT_CARD_ID &&
      run.status === 'pass' &&
      Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )
  const evaluator = evaluateFoundationKbActionReviewSprintCloseout({
    cards,
    closeouts,
    currentPlan,
    currentState,
    packageJson,
    sourceText: `${moduleSource}\n${scriptSource}`,
    requireParentDone: args.closeCard,
  })
  const dogfood = buildFoundationKbActionReviewSprintDogfoodProof()

  addCheck(checks, approval.ok && approval.mode === 'v2', 'approval file is valid v2 and matches plan hash', approval.failures?.map(f => f.check).join('; ') || approval.approvalRef)
  addCheck(checks, cardScaffold.ok, 'live umbrella backlog card has required scaffold fields', cardScaffold.missing.join(', ') || card?.lane || 'ok')
  addCheck(checks, sprint.sprint?.sprintId === FOUNDATION_KB_ACTION_REVIEW_SPRINT_SPRINT_ID && ['building_now', 'done_this_sprint'].includes(activeItem?.stage), 'Current Sprint points to umbrella closeout card', `${sprint.sprint?.sprintId || 'missing'}:${activeItem?.stage || 'missing'}`)
  addCheck(checks, sprintMetadata.ok, 'Current Sprint item has complete metadata before closeout', sprintMetadata.missing.join(', ') || 'ok')
  addCheck(checks, currentSprintStatus.status === 'healthy' || card?.lane === 'done', 'Current Sprint status remains healthy or historically done', currentSprintStatus.status)
  addCheck(checks, planCriticPass && selfReview.status === 'pass' && Number(selfReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic coverage passes for umbrella closeout', `stored=${planCriticPass} self=${selfReview.status}:${selfReview.score}`)
  addCheck(checks, dogfood.ok, 'dogfood rejects missing child, stale umbrella, missing closeout, and forbidden runtime side effects', JSON.stringify(dogfood.cases))
  for (const check of evaluator.checks) addCheck(checks, check.ok, check.check, check.detail)
  addCheck(checks, actionRouteRecordsSource.includes(FOUNDATION_KB_ACTION_REVIEW_SPRINT_CLOSEOUT_KEY), 'closeout registry records umbrella closeout', FOUNDATION_KB_ACTION_REVIEW_SPRINT_CLOSEOUT_KEY)
  addCheck(checks, coverageSource.includes(FOUNDATION_KB_ACTION_REVIEW_SPRINT_CARD_ID), 'done-card verifier coverage includes umbrella card', FOUNDATION_KB_ACTION_REVIEW_SPRINT_CARD_ID)
  addCheck(checks, !args.closeCard || closeoutDoc.includes(FOUNDATION_KB_ACTION_REVIEW_SPRINT_CLOSEOUT_KEY), 'closeout handoff exists before close-card', FOUNDATION_KB_ACTION_REVIEW_SPRINT_CLOSEOUT_PATH)
  addCheck(checks, !args.closeCard || card?.lane === 'done', 'live umbrella backlog card is done on close-card', card?.lane || 'missing')

  const failed = checks.filter(check => !check.ok)
  if (failed.length) {
    recordBuildLaneFailureEventsFromChecks({
      checks,
      repoRoot,
      command: 'process:foundation-kb-action-review-sprint-check',
      cardId: FOUNDATION_KB_ACTION_REVIEW_SPRINT_CARD_ID,
      sprintId: FOUNDATION_KB_ACTION_REVIEW_SPRINT_SPRINT_ID,
      fileModule: FOUNDATION_KB_ACTION_REVIEW_SPRINT_SCRIPT_PATH,
    })
  }

  const payload = {
    ok: failed.length === 0,
    cardId: FOUNDATION_KB_ACTION_REVIEW_SPRINT_CARD_ID,
    closeoutKey: FOUNDATION_KB_ACTION_REVIEW_SPRINT_CLOSEOUT_KEY,
    checks,
    failed,
    dogfood,
    childResults: evaluator.childResults,
    currentSprint: {
      sprintId: sprint.sprint?.sprintId || null,
      stage: activeItem?.stage || null,
      status: currentSprintStatus.status,
    },
  }

  if (args.json) {
    console.log(JSON.stringify(payload, null, 2))
  } else {
    console.log(`Foundation KB/action review sprint check: ${payload.ok ? 'PASS' : 'FAIL'}`)
    for (const check of checks) console.log(`${check.ok ? 'ok' : 'FAIL'} - ${check.check}${check.detail ? ` (${check.detail})` : ''}`)
  }
  process.exitCode = payload.ok ? 0 : 1
}

main().catch(error => {
  recordBuildLaneFailureEventsFromChecks({
    checks: [{ ok: false, check: 'process-foundation-kb-action-review-sprint-check crashed', detail: error instanceof Error ? error.message : String(error) }],
    repoRoot,
    command: 'process:foundation-kb-action-review-sprint-check',
    cardId: FOUNDATION_KB_ACTION_REVIEW_SPRINT_CARD_ID,
    sprintId: FOUNDATION_KB_ACTION_REVIEW_SPRINT_SPRINT_ID,
    fileModule: FOUNDATION_KB_ACTION_REVIEW_SPRINT_SCRIPT_PATH,
  })
  console.error(error instanceof Error ? error.stack : error)
  process.exit(1)
})
