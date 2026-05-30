#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_APPROVAL_PATH,
  BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_CARD_ID,
  BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_CHANGED_FILES,
  BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_CLOSEOUT_KEY,
  BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_CLOSEOUT_PATH,
  BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_PLAN_PATH,
  BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_PROOF_COMMANDS,
  BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_SCRIPT_PATH,
  BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_SPRINT_ID,
  buildBuildLaneFailureTelemetrySnapshot,
  buildSyntheticBuildLaneTelemetryResolutionProof,
  readBuildLaneFailureTelemetryEvents,
  readBuildLaneFailureTelemetryShipProofs,
} from '../lib/build-lane-failure-telemetry.js'
import {
  validateBuildLaneCardScaffold,
  validateBuildLaneSprintItemMetadata,
} from '../lib/build-lane-reliability.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
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

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const CARD_ID = BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_CARD_ID
const CLOSEOUT_KEY = BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_CLOSEOUT_KEY
const PLAN_PATH = BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_PLAN_PATH
const APPROVAL_PATH = BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_APPROVAL_PATH
const CLOSEOUT_PATH = BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_CLOSEOUT_PATH
const SCRIPT_PATH = BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_SCRIPT_PATH
const SPRINT_ID = BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_SPRINT_ID
const CHANGED_FILES = BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_CHANGED_FILES
const PROOF_COMMANDS = BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_PROOF_COMMANDS

const NOT_NEXT = [
  'Do not delete or rewrite historical local telemetry events.',
  'Do not weaken, skip, bypass, or demote real verifier, ship, fanout, or backlog hygiene failures.',
  'Do not launch parallel builders.',
  'Do not use hidden subagents.',
  'No live extraction.',
  'No auth-required or paid run.',
  'No external write.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'Do not mutate Google Drive permissions.',
  'No Drive permission mutation.',
  'No live Agent Feedback auto-send.',
  'No Harlan/Fal/voice/Canva/OpenHuman feature work.',
]

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
    const stat = await fs.stat(path.join(repoRoot, relativePath))
    return stat.isFile()
  } catch {
    return false
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: 'Reuse build-lane failure telemetry, process:foundation-ship local proof records, System Health, Current Sprint historical mode, and fanout gates.',
    existingDocs: 'Reuse BUILD-LANE-FAILURE-TELEMETRY-001, BUILD-LANE-SERVED-CODE-FANOUT-SYNC-REPAIR-001, BUILD-LANE-VERIFIER-RESULT-PARSER-REPAIR-001, and BUILD-LANE-VERIFIER-SNAPSHOT-WIRING-REPAIR-001 closeouts.',
    existingScripts: 'Reuse process:build-lane-failure-telemetry-check, process:fanout-check, backlog hygiene, foundation:verify, process:ship-check, and process:foundation-ship.',
    existingPolicy: 'Build-lane failures stay visible until a later successful ship proof supersedes them; new failures after that proof must still fail normally.',
    reused: 'Local immutable telemetry log, local ship proof file, build-lane scaffold guard, Plan Critic, process write guard, and closeout registry.',
    notRebuilt: 'No second telemetry store, no dashboard redesign, no verifier bypass, no log deletion, no hidden worker model.',
    exactGap: 'Local telemetry kept stale red fingerprints after later successful fanout/verify/ship proofs, so System Health kept routing resolved build-lane failures as current red work.',
    overBroadRisk: 'This could drift into deleting telemetry or hiding real current failures. This card only adds resolution classification from later successful ship proof.',
    readyBy: 'Steve prioritized remaining red build-lane telemetry fingerprints after verifier snapshot wiring became green.',
    readyAt: '2026-05-18T12:15:00-04:00',
  }
}

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: CARD_ID,
    title: 'Build Lane Telemetry Resolution Repair',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P0',
    rank: 22,
    source: 'Steve 2026-05-18 priority order: remaining red build-lane telemetry fingerprints after verifier green.',
    summary: 'Resolve stale build-lane telemetry fingerprints from later successful Foundation ship proof without deleting the local failure log or hiding new repeats.',
    whyItMatters: 'System Health should point builders at current red proof, not old fingerprints from failures that have since been repaired and shipped cleanly.',
    nextAction: closeCard
      ? `Done under ${CLOSEOUT_KEY}. Continue remaining P0 audit/process failures from repo truth.`
      : 'Add ship-proof-based telemetry resolution, make the telemetry proof historical-aware, and ship through full Foundation gates.',
    statusNote: closeCard
      ? `Closed under ${CLOSEOUT_KEY}; immutable telemetry preserved, stale fingerprints resolve by later ship proof, new repeats still fail.`
      : `Executing ${CLOSEOUT_KEY}; telemetry resolution only, no log deletion or verifier weakening.`,
    owner: 'Foundation Process',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  return {
    cardId: CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
    planRef: PLAN_PATH,
    definitionOfDone: 'Telemetry snapshots classify pre-ship stale failure groups as resolved after a later successful Foundation ship proof, new post-proof repeats remain red, the original telemetry focused proof is historical-aware, focused proof passes, backlog hygiene passes, foundation:verify passes, process:foundation-ship passes, commit/push is clean.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: 'Verifier is green; remaining build-lane telemetry reds are stale local fingerprints that should resolve after later successful ship proof.',
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: APPROVAL_PATH,
      closeoutKey: CLOSEOUT_KEY,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, stage = 'building_now', planReview } = {}) {
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-build-lane-telemetry-resolution-repair')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `build-lane-telemetry-resolution-repair-${stableRunId(PLAN_PATH)}`,
        CARD_ID,
        PLAN_PATH,
        planReview.status,
        planReview.score,
        CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: CARD_ID }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-build-lane-telemetry-resolution-repair',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} ${CARD_ID}.`,
        JSON.stringify({ closeoutKey: CLOSEOUT_KEY, stage }),
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

async function ensureLiveState({ closeCard = false, stage = 'building_now', planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'create/update telemetry resolution repair backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage, planReview })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'Resolve stale build-lane telemetry fingerprints from later successful ship proof without hiding new failures.',
        activeBlockerCardId: closeCard ? null : CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
          startedBy: 'codex-build-lane-telemetry-resolution-repair',
          currentStatus: closeCard ? 'complete' : normalizeStage(stage),
          closeoutKey: CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Commit/push, then continue remaining P0 audit/process failures from repo truth.'
            : 'Add telemetry resolution classification, prove stale reds resolve and new repeats fail, then run full ship gates.',
          priorityOrder: [CARD_ID, 'SPRINT-CHECK-HISTORICAL-MODE-001', 'PROCESS-CHECK-READONLY-MODE-001'],
          notNext: NOT_NEXT,
          exitCriteria: [
            'Stale telemetry groups before a later ship proof resolve without deleting log history.',
            'New repeated failures after a ship proof still become red.',
            'Build-lane failure telemetry focused proof is historical-aware after its card is done.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage })],
    },
    'codex-build-lane-telemetry-resolution-repair',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'Steve prioritized remaining red build-lane telemetry fingerprints after verifier green.',
    },
  )
}

function buildProjectedPostShipSnapshot() {
  const now = new Date()
  const projectedShipProof = {
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    passedAt: new Date(now.getTime() + 1000).toISOString(),
  }
  return buildBuildLaneFailureTelemetrySnapshot({
    events: readBuildLaneFailureTelemetryEvents({ repoRoot }),
    shipProofs: [
      ...readBuildLaneFailureTelemetryShipProofs({ repoRoot }),
      projectedShipProof,
    ],
    now,
  })
}

async function main() {
  const args = parseArgs()
  const checks = []
  const planSource = await readRepoFile(PLAN_PATH)
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard, stage: args.stage }),
    changedFiles: CHANGED_FILES,
    declaredRisk: 'build-lane telemetry resolution, System Health status, and proof gate integrity',
    repoRoot,
  })

  const writeRequested = args.apply || args.closeCard || isProcessCheckWriteRequested({
    argv: process.argv.slice(2),
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  if (writeRequested) await ensureLiveState({ closeCard: args.closeCard, stage: args.stage, planReview })

  const [
    approval,
    packageJson,
    telemetrySource,
    systemHealthSource,
    originalTelemetryScriptSource,
    scriptSource,
    coverageSource,
    closeoutRegistrySource,
    closeoutDocExists,
    cards,
    sprint,
    planCriticRuns,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile('package.json').then(JSON.parse),
    readRepoFile('lib/build-lane-failure-telemetry.js'),
    readRepoFile('lib/foundation-system-health.js'),
    readRepoFile('scripts/process-build-lane-failure-telemetry-check.mjs'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-build-lane-records.js'),
    repoFileExists(CLOSEOUT_PATH),
    getBacklogItemsByIds([CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])

  const card = cards[0] || null
  const sprintItem = (sprint?.items || []).find(item => item.cardId === CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  const planCriticPass = (planCriticRuns || []).some(run => run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE)
  const synthetic = buildSyntheticBuildLaneTelemetryResolutionProof()
  const projected = buildProjectedPostShipSnapshot()

  addCheck(checks, approval.ok, 'approval validates at 9.8+', approval.failures?.map(failure => failure.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', `score=${planReview.score}`)
  addCheck(checks, planCriticPass || writeRequested, 'durable Plan Critic pass row exists', planCriticPass ? 'pass row' : 'created during this run')
  addCheck(checks, Boolean(card), 'live backlog card exists', card ? `${card.id}/${card.lane}` : 'missing')
  addCheck(checks, card ? validateBuildLaneCardScaffold(card).ok : false, 'live backlog card passes scaffold guard', card ? validateBuildLaneCardScaffold(card).missing.join(', ') || 'complete' : 'missing')
  addCheck(checks, Boolean(sprintItem), 'Current Sprint includes repair card', sprint?.sprint?.sprintId || 'missing sprint')
  addCheck(checks, sprintItem ? validateBuildLaneSprintItemMetadata(sprintItem).ok : false, 'Current Sprint item metadata is complete', sprintItem ? validateBuildLaneSprintItemMetadata(sprintItem).missing.join(', ') || 'complete' : 'missing')
  addCheck(checks, packageJson.scripts?.['process:build-lane-telemetry-resolution-repair-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:build-lane-telemetry-resolution-repair-check'] || 'missing')
  addCheck(checks, telemetrySource.includes('later_successful_foundation_ship') && telemetrySource.includes('resolvedFingerprintCount'), 'telemetry snapshot classifies resolved fingerprints from ship proof', 'lib/build-lane-failure-telemetry.js')
  addCheck(checks, synthetic.ok, 'dogfood resolves stale failures but keeps new repeats red', `resolved=${synthetic.resolvedSnapshot.summary.resolvedFingerprintCount} redAfter=${synthetic.stillRedSnapshot.summary.redFingerprintCount}`)
  addCheck(checks, projected.summary?.redFingerprintCount === 0, 'projected post-ship telemetry has zero red fingerprints', `red=${projected.summary?.redFingerprintCount || 0} resolved=${projected.summary?.resolvedFingerprintCount || 0}`)
  addCheck(checks, systemHealthSource.includes('readBuildLaneFailureTelemetrySnapshot'), 'System Health reads telemetry with resolution proof', 'lib/foundation-system-health.js')
  addCheck(checks, originalTelemetryScriptSource.includes('evaluateSprintCheckHistoricalMode') && originalTelemetryScriptSource.includes('Current or historical sprint proof validates telemetry card'), 'original telemetry focused proof is historical-aware', 'scripts/process-build-lane-failure-telemetry-check.mjs')
  addCheck(checks, Boolean(closeout), 'closeout registry exposes repair closeout', closeout ? closeout.key : 'missing')
  addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeoutRegistrySource.includes(CARD_ID), 'build-lane closeout record source includes repair', 'lib/foundation-build-closeout-build-lane-records.js')
  addCheck(checks, closeoutDocExists, 'closeout handoff exists', CLOSEOUT_PATH)
  addCheck(checks, coverageSource.includes(CARD_ID), 'verifier coverage source includes repair card', 'lib/foundation-verify-coverage-card-ids.js')
  const hiddenWorkerNeedle = ['spawn_', 'agent('].join('')
  addCheck(checks, !scriptSource.includes(hiddenWorkerNeedle), 'focused proof does not invoke hidden worker tooling', 'clean')

  const failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'fail' : 'pass',
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    sprintId: sprint?.sprint?.sprintId || '',
    checkCount: checks.length,
    failedCount: failed.length,
    projectedSummary: projected.summary,
    checks,
    failed,
  }

  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`Build-lane telemetry resolution repair check: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
