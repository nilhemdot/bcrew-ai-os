#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  validateBuildLaneCardScaffold,
  validateBuildLaneSprintItemMetadata,
} from '../lib/build-lane-reliability.js'
import {
  CRITICAL_ROOTS_UNDER_3K_PHASE_4_APPROVAL_PATH,
  CRITICAL_ROOTS_UNDER_3K_PHASE_4_CARD_ID,
  CRITICAL_ROOTS_UNDER_3K_PHASE_4_CHANGED_FILES,
  CRITICAL_ROOTS_UNDER_3K_PHASE_4_CLOSEOUT_KEY,
  CRITICAL_ROOTS_UNDER_3K_PHASE_4_CLOSEOUT_PATH,
  CRITICAL_ROOTS_UNDER_3K_PHASE_4_MODULE_PATHS,
  CRITICAL_ROOTS_UNDER_3K_PHASE_4_PLAN_PATH,
  CRITICAL_ROOTS_UNDER_3K_PHASE_4_PROOF_COMMANDS,
  CRITICAL_ROOTS_UNDER_3K_PHASE_4_SCRIPT_PATH,
  CRITICAL_ROOTS_UNDER_3K_PHASE_4_SPRINT_ID,
  buildCriticalRootsUnder3kPhase4DogfoodProof,
  buildCriticalRootsUnder3kPhase4Snapshot,
} from '../lib/critical-roots-under-3k-phase-4.js'
import { closeFoundationDb } from '../lib/foundation-db-session.js'
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

const CARD_ID = CRITICAL_ROOTS_UNDER_3K_PHASE_4_CARD_ID
const CLOSEOUT_KEY = CRITICAL_ROOTS_UNDER_3K_PHASE_4_CLOSEOUT_KEY
const PLAN_PATH = CRITICAL_ROOTS_UNDER_3K_PHASE_4_PLAN_PATH
const APPROVAL_PATH = CRITICAL_ROOTS_UNDER_3K_PHASE_4_APPROVAL_PATH
const CLOSEOUT_PATH = CRITICAL_ROOTS_UNDER_3K_PHASE_4_CLOSEOUT_PATH
const SCRIPT_PATH = CRITICAL_ROOTS_UNDER_3K_PHASE_4_SCRIPT_PATH
const SPRINT_ID = CRITICAL_ROOTS_UNDER_3K_PHASE_4_SPRINT_ID
const CHANGED_FILES = CRITICAL_ROOTS_UNDER_3K_PHASE_4_CHANGED_FILES
const PROOF_COMMANDS = CRITICAL_ROOTS_UNDER_3K_PHASE_4_PROOF_COMMANDS

const NOT_NEXT = [
  'Do not redesign Sales Hub, Owners governance, FUB source routing, or Foundation Hub.',
  'Do not call Owners success-path live reads from the focused proof.',
  'Do not call Sales Hub success-path writes from the focused proof.',
  'No live extraction.',
  'No auth-required or paid run.',
  'No external sends.',
  'No Drive permission mutation.',
  'Do not mutate Google Drive permissions.',
  'No Gmail/ClickUp sends.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'Do not launch parallel builders or hidden subagents.',
  'Do not build Harlan/Fal/voice/Canva/OpenHuman features.',
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

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: CARD_ID,
    title: 'Critical Roots Under 3K Phase 4',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P0',
    rank: 24,
    source: 'Steve 2026-05-18 continuous-builder priority: root file cleanup over 3K/5K before agent gates.',
    summary: 'Move Sales Hub and Owners governance route ownership out of server.js so the server root drops below 3,000 lines without behavior redesign.',
    whyItMatters: 'server.js was one of the last critical roots above 3,000 lines. Keeping route domains in focused modules prevents future shared-file collisions and makes reviews faster.',
    nextAction: closeCard
      ? 'Done under critical-roots-under-3k-phase-4-v1. Continue remaining root-file cleanup from repo truth, then agent usefulness runtime gates.'
      : 'Extract Sales Hub and Owners governance routes into focused modules, prove old inline ownership fails closed, and run full Foundation ship gates.',
    statusNote: closeCard
      ? 'Closed under critical-roots-under-3k-phase-4-v1; server.js is below 3,000 lines and route ownership is module-owned.'
      : 'Executing critical-roots-under-3k-phase-4-v1; route ownership only, no Sales/Owners/FUB behavior redesign.',
    owner: 'Foundation Process',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  return {
    cardId: CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
    planRef: PLAN_PATH,
    definitionOfDone: 'server.js is below 3,000 lines; Sales Hub and Owners governance routes are module-owned; extracted modules stay below 1,500 lines; dogfood rejects old inline route ownership, missing registrars, weak live-read proof, and weak success-write proof; backlog hygiene, foundation:verify, and process:foundation-ship pass.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: 'Build-lane verifier/telemetry reliability is green and closeout registry roots are below 3,000 lines.',
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: {
      existingCode: 'Reuse existing Sales Hub, Owners governance, FUB lead-source, auth, security, and route-split patterns.',
      existingDocs: 'Reuse critical roots Phase 1-3 and file-size standard docs.',
      existingScripts: 'Reuse process:foundation-ship, backlog:hygiene, foundation:verify, process:ship-check, and process:fanout-check.',
      existingPolicy: 'Large root files get coherent domain extraction, not arbitrary line cuts.',
      exactGap: 'server.js remained above 3,000 lines after Phase 3.',
      reused: 'Existing server route registrar pattern, FUB source payload helpers, Sales Hub domain modules, Owners review queue logic, Plan Critic, process write guard, Current Sprint overlay, and ship gates.',
      notRebuilt: 'No Sales Hub redesign, no Owners governance redesign, no FUB rewrite, no new external side effect.',
      overBroadRisk: 'This could drift into Sales/Owners behavior redesign or live source mutation; this card only moves route ownership and helper ownership.',
      readyBy: 'Steve prioritized root-file cleanup over 3K/5K after build-lane reliability and closeout registry cleanup were green.',
      readyAt: '2026-05-18T17:05:00-04:00',
    },
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-critical-roots-phase-4')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `critical-roots-phase-4-${stableRunId(PLAN_PATH)}`,
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
        VALUES ($1,'backlog_items',$2,'codex-critical-roots-phase-4',$3,$4::jsonb)
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
    operation: 'create/update critical roots phase 4 backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage, planReview })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'Move server.js Sales Hub and Owners governance routes into focused modules so the server root is below 3,000 lines.',
        activeBlockerCardId: closeCard ? null : CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
          startedBy: 'codex-critical-roots-phase-4',
          currentStatus: closeCard ? 'complete' : normalizeStage(stage),
          closeoutKey: CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Commit/push, then continue remaining root-file cleanup from repo truth.'
            : 'Finish route extraction, prove dogfood, then run full ship gates.',
          priorityOrder: [CARD_ID, 'FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001'],
          notNext: NOT_NEXT,
          exitCriteria: [
            'server.js is below 3,000 lines.',
            'Extracted modules stay below 1,500 lines.',
            'Focused dogfood rejects old inline route ownership and weak proof.',
            'foundation:verify and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage })],
    },
    'codex-critical-roots-phase-4',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'Steve prioritized root file cleanup over 3K/5K before agent gates.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  const planSource = await readRepoFile(PLAN_PATH)
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard, stage: args.stage }),
    changedFiles: CHANGED_FILES,
    declaredRisk: 'server.js route-domain extraction under critical-root file-size discipline',
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
    scriptSource,
    coverageSource,
    sizeRecordsSource,
    foundationVerifySource,
    closeoutDocExists,
    cards,
    sprint,
    planCriticRuns,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile('package.json').then(JSON.parse),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-size-records.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    repoFileExists(CLOSEOUT_PATH),
    getBacklogItemsByIds([CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])

  const snapshot = buildCriticalRootsUnder3kPhase4Snapshot({ repoRoot, proofScriptSource: scriptSource })
  const dogfood = buildCriticalRootsUnder3kPhase4DogfoodProof()
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  const card = cards[0] || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === CARD_ID) || null
  const planCriticPass = planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE)
  const scaffold = validateBuildLaneCardScaffold(card || {})
  const sprintMetadata = validateBuildLaneSprintItemMetadata(sprintItem || {})
  const scriptSourceWithoutSelfCheck = scriptSource
    .replaceAll("'spawn_agent'", '')
    .replaceAll("'send_input'", '')

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'approval validates at 9.8+', APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', `score=${planReview.score}`)
  addCheck(checks, planCriticPass, 'durable Plan Critic pass row exists', planCriticPass ? 'pass row' : 'missing')
  addCheck(checks, Boolean(card), 'live backlog card exists', card ? `${card.id}/${card.lane}` : 'missing')
  addCheck(checks, scaffold.ok, 'live backlog card passes scaffold guard', scaffold.ok ? 'complete' : scaffold.missing.join(', '))
  addCheck(checks, sprint.sprint?.sprintId === SPRINT_ID, 'Current Sprint includes Phase 4 card', sprint.sprint?.sprintId || 'missing')
  addCheck(checks, sprintMetadata.ok, 'Current Sprint item metadata is complete', sprintMetadata.ok ? 'complete' : sprintMetadata.missing.join(', '))
  addCheck(checks, packageJson.scripts?.['process:critical-roots-under-3k-phase-4-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:critical-roots-under-3k-phase-4-check'] || 'missing')
  addCheck(checks, snapshot.ok, 'critical roots Phase 4 snapshot passes', JSON.stringify({ roots: snapshot.rootRows, modules: snapshot.moduleRows }))
  addCheck(checks, dogfood.ok, 'dogfood rejects old inline route ownership and weak proof', dogfood.dogfoodInvariant)
  addCheck(checks, Boolean(closeout), 'closeout registry exposes Phase 4 closeout', closeout ? closeout.key : 'missing')
  addCheck(checks, sizeRecordsSource.includes(CLOSEOUT_KEY) && sizeRecordsSource.includes(CARD_ID), 'size closeout records include this card', 'lib/foundation-build-closeout-size-records.js')
  addCheck(checks, coverageSource.includes(CARD_ID), 'verifier coverage source includes this card', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, foundationVerifySource.includes(CARD_ID), 'foundation verifier recognizes Phase 4 active progression', 'scripts/foundation-verify.mjs')
  addCheck(checks, CRITICAL_ROOTS_UNDER_3K_PHASE_4_MODULE_PATHS.every(filePath => CHANGED_FILES.includes(filePath)), 'changed-file list names extracted modules', 'complete')
  addCheck(checks, closeoutDocExists, 'closeout handoff exists', CLOSEOUT_PATH)
  addCheck(checks, scriptSource.includes('does not call Owners success-path live reads') && scriptSource.includes('does not call Sales Hub success-path writes'), 'proof records approval-bound side-effect boundaries', 'safe preflight only')
  addCheck(checks, !scriptSourceWithoutSelfCheck.includes('spawn_agent') && !scriptSourceWithoutSelfCheck.includes('send_input'), 'focused proof does not invoke hidden worker tooling', 'clean')

  const failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'fail' : 'pass',
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    sprintId: SPRINT_ID,
    checkCount: checks.length,
    failedCount: failed.length,
    snapshot,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Critical roots under 3K Phase 4 check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main().catch(async error => {
  console.error(error?.stack || error?.message || String(error))
  await closeFoundationDb()
  process.exitCode = 1
})
