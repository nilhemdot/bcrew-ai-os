#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { closeFoundationDb } from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import { validateBuildLaneCardScaffold, validateBuildLaneSprintItemMetadata } from '../lib/build-lane-reliability.js'
import {
  SHIP_GATE_WORKER_LIVE_JOB_PAUSE_APPROVAL_PATH,
  SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CARD_ID,
  SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CHANGED_FILES,
  SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CLOSEOUT_KEY,
  SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CLOSEOUT_PATH,
  SHIP_GATE_WORKER_LIVE_JOB_PAUSE_NOT_NEXT_BOUNDARIES,
  SHIP_GATE_WORKER_LIVE_JOB_PAUSE_PLAN_PATH,
  SHIP_GATE_WORKER_LIVE_JOB_PAUSE_PROOF_COMMANDS,
  SHIP_GATE_WORKER_LIVE_JOB_PAUSE_SCRIPT_PATH,
  SHIP_GATE_WORKER_LIVE_JOB_PAUSE_SPRINT_ID,
  buildShipGateWorkerLiveJobPauseDogfoodProof,
} from '../lib/ship-gate-worker-live-job-pause.js'

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

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function repoFileExists(relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath))
    return true
  } catch {
    return false
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'scripts/process-foundation-ship.mjs',
      'scripts/foundation-worker.mjs',
      'lib/foundation-extraction-runtime-verifier.js',
      'lib/build-lane-failure-telemetry.js',
    ],
    existingDocs: [
      'docs/process/foundation-ship-gate.md',
      'docs/_archive/handoffs/2026-05-29-hot-doc-refresh/2026-05-18-source-maturity-fub-monitoring-gap-repair-closeout.md',
    ],
    existingScripts: [
      'scripts/process-foundation-ship.mjs',
      'scripts/foundation-worker.mjs',
      'scripts/process-ship-check.mjs',
      'scripts/process-fanout-check.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: [
      'Foundation ship gate must prove served code without creating side effects.',
      'Worker scheduled jobs must not run as an accidental result of a ship-gate restart.',
      'No live extraction, external write, paid run, or Agent Feedback auto-send is approved.',
    ],
    reused: [
      'LaunchAgent served-code proof, worker startup metadata, build-lane failure telemetry, and extraction runtime readiness verifier.',
    ],
    notRebuilt: [
      'No permanent worker disablement.',
      'No scheduled job deletion.',
      'No connector/extractor/auth work.',
    ],
    exactGap: 'During the FUB monitoring-gap ship, process:foundation-ship restarted the Foundation worker and the worker selected a due Gmail sync job, creating a running extraction-control row that turned foundation:verify red.',
    overBroadRisk: 'A repair must not bypass served-code proof, hide runtime failures, or disable the worker indefinitely.',
    readyBy: 'Steve approved autonomous overnight Foundation reliability work and the live ship gate exposed this specific no-live-extraction boundary leak.',
    readyAt: '2026-05-18T08:20:00-04:00',
  }
}

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CARD_ID,
    title: 'Ship gate worker live job pause',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P0',
    rank: 28,
    source: 'FUB ship-gate failure repair',
    summary: 'Prevent process:foundation-ship worker restarts from accidentally starting due scheduled jobs during served-code proof.',
    whyItMatters: 'Foundation ships must prove runtime truth without causing live extraction or connector jobs that Steve did not approve.',
    nextAction: closeCard
      ? `Done under \`${SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CLOSEOUT_KEY}\`. Continue safe Foundation source/connector work from live truth.`
      : 'Arm a short worker pause during ship-gate runtime restart, prove scheduled jobs are not selected, and keep served-code proof intact.',
    statusNote: closeCard
      ? `Closed under \`${SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CLOSEOUT_KEY}\`; ship gate restarts now pause scheduled job selection.`
      : `Scope/proof: \`${SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CLOSEOUT_KEY}\`; no live extraction/auth/provider/external-write work.`,
    owner: 'Foundation Runtime',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    cardId: SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : normalizedStage,
    planRef: SHIP_GATE_WORKER_LIVE_JOB_PAUSE_PLAN_PATH,
    definitionOfDone: 'process:foundation-ship arms a short worker scheduled-job pause before LaunchAgent restart; the worker records startup code truth but does not select due jobs while the pause is active; invalid markers fail closed; expired markers resume normal operation; focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
    proofCommands: SHIP_GATE_WORKER_LIVE_JOB_PAUSE_PROOF_COMMANDS,
    readinessBlockerCleared: 'FUB ship gate exposed a live Gmail scheduled job started by ship-gate worker restart; the orphaned run was repaired and this card prevents recurrence.',
    notNextBoundaries: SHIP_GATE_WORKER_LIVE_JOB_PAUSE_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: SHIP_GATE_WORKER_LIVE_JOB_PAUSE_APPROVAL_PATH,
      closeoutKey: SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CLOSEOUT_KEY,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, stage = 'building_now' } = {}) {
  const planSource = await readRepoFile(SHIP_GATE_WORKER_LIVE_JOB_PAUSE_PLAN_PATH)
  const card = buildCardRow({ closeCard, stage })
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card,
    changedFiles: SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CHANGED_FILES,
    declaredRisk: 'Foundation ship gate runtime and scheduled worker safety',
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
        `ship-gate-worker-pause-${stableRunId(SHIP_GATE_WORKER_LIVE_JOB_PAUSE_PLAN_PATH)}`,
        SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CARD_ID,
        SHIP_GATE_WORKER_LIVE_JOB_PAUSE_PLAN_PATH,
        planReview.status,
        planReview.score,
        planReview.maxScore,
        planReview.passThreshold,
        card.priority,
        'full',
        true,
        SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CARD_ID }),
        'codex-ship-gate-worker-live-job-pause',
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-ship-gate-worker-live-job-pause',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        card.id,
        `${closeCard ? 'Closed' : 'Updated'} ${SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CARD_ID}.`,
        JSON.stringify({ closeoutKey: SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CLOSEOUT_KEY, stage }),
      ],
    )
    await client.query('COMMIT')
    return { card, planReview }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

async function upsertCurrentSprint({ closeCard = false, stage = 'building_now', summary = {} } = {}) {
  const previous = await getActiveFoundationCurrentSprint()
  const normalizedStage = normalizeStage(stage)
  return upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SHIP_GATE_WORKER_LIVE_JOB_PAUSE_SPRINT_ID,
        status: 'active',
        goal: 'Prevent Foundation ship-gate worker restarts from starting due scheduled jobs.',
        activeBlockerCardId: closeCard ? null : SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizedStage,
          startedBy: 'codex-ship-gate-worker-live-job-pause',
          currentStatus: closeCard ? 'complete' : normalizedStage,
          closeoutKey: SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CLOSEOUT_KEY,
          approvalRef: SHIP_GATE_WORKER_LIVE_JOB_PAUSE_APPROVAL_PATH,
          planRef: SHIP_GATE_WORKER_LIVE_JOB_PAUSE_PLAN_PATH,
          noDriveMutationApproved: true,
          noLiveExtractionApproved: true,
          existingWorkCheck: buildExistingWorkCheck(),
          proofCommands: SHIP_GATE_WORKER_LIVE_JOB_PAUSE_PROOF_COMMANDS,
          notNext: SHIP_GATE_WORKER_LIVE_JOB_PAUSE_NOT_NEXT_BOUNDARIES,
          definitionOfDone: buildSprintItem({ closeCard, stage }).definitionOfDone,
          nextAction: closeCard
            ? 'Commit/push, then continue safe Foundation work from live truth.'
            : 'Prove ship gate worker restart pauses scheduled jobs without weakening served-code proof.',
          priorityOrder: [SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CARD_ID],
          exitCriteria: [
            'process:foundation-ship arms a short worker pause marker before worker restart.',
            'foundation-worker skips due job selection while the marker is active.',
            'Served-code proof still sees current worker commit and pid.',
            'Expired pause resumes normal worker selection; invalid pause fails closed.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
          summary,
        },
      },
      items: [buildSprintItem({ closeCard, stage: normalizedStage })],
    },
    'codex-ship-gate-worker-live-job-pause',
    {
      apply: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      replaceItems: true,
      allowItemReplacement: true,
      reason: closeCard
        ? 'Close ship gate worker live job pause sprint item after focused proof.'
        : 'Start ship gate worker live job pause sprint item with complete scaffold metadata.',
    },
  )
}

function includesAll(source = '', needles = []) {
  return needles.every(needle => String(source || '').includes(needle))
}

async function run() {
  const args = parseArgs()
  if (isProcessCheckWriteRequested({ argv: process.argv.slice(2) })) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: SHIP_GATE_WORKER_LIVE_JOB_PAUSE_SCRIPT_PATH,
      operation: 'create/update ship gate worker live-job pause backlog card, Plan Critic row, and Current Sprint overlay',
      allowedFlags: ['apply', 'close-card'],
    })
  }

  const normalizedStage = normalizeStage(args.stage)
  const checks = []
  const processShipSource = await readRepoFile('scripts/process-foundation-ship.mjs')
  const workerSource = await readRepoFile('scripts/foundation-worker.mjs')
  const moduleSource = await readRepoFile('lib/ship-gate-worker-live-job-pause.js')
  const extractionVerifierSource = await readRepoFile('lib/foundation-extraction-runtime-verifier.js')
  const coverageSource = await readRepoFile('lib/foundation-verify-coverage-card-ids.js')
  const cleanupCloseoutSource = await readRepoFile('lib/foundation-build-closeout-cleanup-records.js')
  const packageJson = JSON.parse(await readRepoFile('package.json'))
  const currentPlan = await readRepoFile('docs/rebuild/current-plan.md')
  const currentState = await readRepoFile('docs/rebuild/current-state.md')
  const planSource = await readRepoFile(SHIP_GATE_WORKER_LIVE_JOB_PAUSE_PLAN_PATH)

  const dogfood = buildShipGateWorkerLiveJobPauseDogfoodProof({
    processFoundationShipSource: processShipSource,
    foundationWorkerSource: workerSource,
  })
  addCheck(checks, dogfood.ok, 'dogfood proves ship-gate worker pause behavior and wiring', dogfood.ok ? 'active blocks, expired resumes, invalid fails closed' : JSON.stringify(dogfood, null, 2).slice(0, 1000))

  let planReview = null
  if (args.apply || args.closeCard) {
    const result = await upsertLiveCardAndPlanCritic({ closeCard: args.closeCard, stage: normalizedStage })
    planReview = result.planReview
  } else {
    planReview = evaluatePlanCriticPlan({
      planText: planSource,
      card: buildCardRow({ closeCard: args.closeCard, stage: normalizedStage }),
      changedFiles: SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CHANGED_FILES,
      declaredRisk: 'Foundation ship gate runtime and scheduled worker safety',
      repoRoot,
    })
  }
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes', `${planReview.status}:${planReview.score}`)

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: SHIP_GATE_WORKER_LIVE_JOB_PAUSE_APPROVAL_PATH,
    cardId: SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CARD_ID,
  })
  addCheck(checks, approval.ok, 'approval integrity passes', approval.failures?.map(failure => failure.check).join(', ') || 'ok')

  if (args.apply || args.closeCard) {
    await upsertCurrentSprint({ closeCard: args.closeCard, stage: normalizedStage, summary: dogfood })
  }

  const activeSprint = await getActiveFoundationCurrentSprint()
  const rows = await getBacklogItemsByIds([SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CARD_ID])
  const card = rows.find(row => row.id === SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CARD_ID) || null
  const planCriticRows = await getPlanCriticRunsByCardIds([SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CARD_ID])
  const sprintStatus = buildFoundationCurrentSprintStatus(activeSprint)
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CARD_ID) || null
  const scaffold = validateBuildLaneCardScaffold(card || {})
  const sprintMetadata = validateBuildLaneSprintItemMetadata(sprintItem || {})
  const closeout = getFoundationBuildCloseouts().find(item => item.key === SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CLOSEOUT_KEY) || null

  addCheck(checks, card?.lane === (args.closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped'), 'live backlog card is in expected lane', card?.lane || 'missing')
  addCheck(checks, scaffold.ok, 'live backlog card has required scaffold fields', scaffold.missing.join(', ') || 'complete')
  addCheck(checks, planCriticRows.some(row => row.status === 'pass' && Number(row.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'Plan Critic pass row exists', String(planCriticRows.length))
  addCheck(checks, sprintItem?.stage === (args.closeCard ? 'done_this_sprint' : normalizedStage), 'Current Sprint item is in expected stage', sprintItem?.stage || 'missing')
  addCheck(checks, sprintMetadata.ok, 'Current Sprint metadata is complete', sprintMetadata.missing.join(', ') || sprintStatus.status)
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CARD_ID), 'closeout registry contains ship gate worker pause record', closeout?.key || 'missing')
  addCheck(checks, await repoFileExists(SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CLOSEOUT_PATH), 'closeout handoff exists', SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CLOSEOUT_PATH)
  addCheck(checks, packageJson.scripts?.['process:ship-gate-worker-live-job-pause-check'] === `node --env-file-if-exists=.env ${SHIP_GATE_WORKER_LIVE_JOB_PAUSE_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:ship-gate-worker-live-job-pause-check'] || 'missing')
  addCheck(checks, includesAll(processShipSource, ['writeFoundationWorkerShipPause', 'clearFoundationWorkerShipPause', 'skipWorkerScheduledPause', 'workerScheduledPauseMs']), 'ship gate arms and clears worker scheduled-job pause', 'process-foundation-ship')
  addCheck(checks, includesAll(workerSource, ['readFoundationWorkerShipPause', 'evaluateFoundationWorkerShipPause', 'ship gate scheduled-job pause active']), 'worker skips due jobs while pause is active', 'foundation-worker')
  addCheck(checks, extractionVerifierSource.includes('writeFoundationWorkerShipPause') && extractionVerifierSource.includes('ship gate restarts pause scheduled job selection'), 'foundation:verify covers ship-gate worker pause wiring', 'foundation-extraction-runtime-verifier')
  addCheck(checks, coverageSource.includes('SHIP-GATE-WORKER-LIVE-JOB-PAUSE-001'), 'done-card verifier coverage lists this card', 'coverage source')
  addCheck(checks, cleanupCloseoutSource.includes(SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CLOSEOUT_KEY), 'closeout registry source lists closeout key', 'cleanup closeout records')
  addCheck(checks, currentPlan.includes(SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CARD_ID) && currentState.includes(SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CARD_ID), 'current plan/state document the runtime repair', 'docs/rebuild')
  addCheck(checks, includesAll(moduleSource, ['invalid ship-gate worker pause marker fails closed', 'externalWritePerformed: false']), 'module documents fail-closed/no-external-write behavior', 'ship-gate-worker-live-job-pause')

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'risk' : 'healthy',
    cardId: SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CARD_ID,
    closeoutKey: SHIP_GATE_WORKER_LIVE_JOB_PAUSE_CLOSEOUT_KEY,
    checks,
    failures,
    summary: {
      dogfood: dogfood.ok ? 'pass' : 'fail',
      currentSprint: sprintStatus.status,
      closeCard: args.closeCard,
    },
  }
  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Ship gate worker live-job pause check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
  await closeFoundationDb()
  if (!result.ok) process.exitCode = 1
}

run().catch(async error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  await closeFoundationDb().catch(() => {})
  process.exitCode = 1
})
