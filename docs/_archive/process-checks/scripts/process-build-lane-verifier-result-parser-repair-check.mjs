#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { extractBuildLaneFailureEventsFromOutput } from '../lib/build-lane-failure-telemetry.js'
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

const CARD_ID = 'BUILD-LANE-VERIFIER-RESULT-PARSER-REPAIR-001'
const CLOSEOUT_KEY = 'build-lane-verifier-result-parser-repair-v1'
const PLAN_PATH = 'docs/process/build-lane-verifier-result-parser-repair-001-plan.md'
const APPROVAL_PATH = 'docs/process/approvals/BUILD-LANE-VERIFIER-RESULT-PARSER-REPAIR-001.json'
const CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-27-hot-doc-cleanup/2026-05-18-build-lane-verifier-result-parser-repair-closeout.md'
const SCRIPT_PATH = 'scripts/process-build-lane-verifier-result-parser-repair-check.mjs'
const SPRINT_ID = 'build-lane-verifier-result-parser-repair-2026-05-18'

const CHANGED_FILES = [
  'lib/build-lane-failure-telemetry.js',
  SCRIPT_PATH,
  'lib/foundation-build-closeout-build-lane-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'package.json',
  PLAN_PATH,
  APPROVAL_PATH,
  CLOSEOUT_PATH,
]

const PROOF_COMMANDS = [
  'node --check lib/build-lane-failure-telemetry.js scripts/process-build-lane-verifier-result-parser-repair-check.mjs',
  'npm run process:build-lane-verifier-result-parser-repair-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  `npm run process:foundation-ship -- --card=${CARD_ID} --planApprovalRef=${APPROVAL_PATH} --closeoutKey=${CLOSEOUT_KEY} --commitRef=HEAD`,
]

const NOT_NEXT = [
  'Do not launch parallel builders during this card.',
  'Do not use hidden subagents.',
  'Do not rewrite historical local telemetry logs.',
  'Do not weaken, skip, bypass, or demote real verifier, ship, fanout, or backlog hygiene failures.',
  'No live extraction.',
  'No auth-required or paid run.',
  'No external write.',
  'Do not mutate Drive permissions.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
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

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
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
    existingCode: 'Reuse build-lane failure telemetry parser, local telemetry rollups, System Health surfacing, process ship/fanout hooks, and closeout registry.',
    existingDocs: 'Reuse BUILD-LANE-FAILURE-TELEMETRY-001, BUILD-LANE-SERVED-CODE-FANOUT-SYNC-REPAIR-001, and Foundation gate decision tree docs.',
    existingScripts: 'Reuse process:foundation-ship, process:fanout-check, process:post-ship-fanout, backlog hygiene, foundation:verify, and approval integrity scripts.',
    existingPolicy: 'Build-lane telemetry must report real failures without weakening verifier, ship, fanout, or backlog hygiene gates.',
    reused: 'Existing failure-event extraction, fingerprinting, Current Sprint overlay, Plan Critic, process write guard, and closeout registry.',
    notRebuilt: 'No second telemetry store, no System Health redesign, no verifier rewrite, and no hidden worker model.',
    exactGap: 'PASS verifier lines ending with detail text like 0 failed were recorded as failure events.',
    overBroadRisk: 'This could drift into telemetry cleanup, verifier rewrite, or UI redesign; this card only repairs parser classification.',
    readyBy: 'Steve ordered build-lane reliability repairs after the Planck confusion and May 18 telemetry evidence exposed parser false positives.',
    readyAt: '2026-05-18T09:35:00-04:00',
  }
}

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: CARD_ID,
    title: 'Build Lane Verifier Result Parser Repair',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P0',
    rank: 24,
    source: 'Steve 2026-05-18 build-lane reliability queue plus local failure telemetry false-positive evidence.',
    summary: 'Repair build-lane failure telemetry parsing so successful verifier PASS lines with detail text like 0 failed are not recorded as failures.',
    whyItMatters: 'System Health and build-lane telemetry should route builders to actual red checks, not successful verifier lines that mention failed item counts.',
    nextAction: closeCard
      ? `Done under ${CLOSEOUT_KEY}. Continue BUILD-LANE-VERIFIER-SNAPSHOT-WIRING-REPAIR-001 from repo truth if it exists or scope it from telemetry evidence.`
      : 'Patch the telemetry result parser, prove PASS-line false positives are blocked, and ship through full Foundation gates.',
    statusNote: closeCard
      ? `Closed under ${CLOSEOUT_KEY}; no hidden subagents, no telemetry rewrite, no live extraction, no external writes.`
      : `Executing ${CLOSEOUT_KEY}; parser false-positive repair only.`,
    owner: 'Foundation Process',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  return {
    cardId: CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
    planRef: PLAN_PATH,
    definitionOfDone: 'PASS-line false positives are blocked, real FAIL/ERROR/Command failed lines still record, focused proof passes, backlog hygiene passes, foundation:verify passes, process:foundation-ship passes, commit/push is clean.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: 'Steve prioritized build-lane reliability cleanup and local telemetry showed PASS lines with 0 failed being recorded as failures.',
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-verifier-result-parser-repair')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `build-lane-verifier-result-parser-repair-${stableRunId(PLAN_PATH)}`,
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
        VALUES ($1,'backlog_items',$2,'codex-verifier-result-parser-repair',$3,$4::jsonb)
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
    operation: 'create/update verifier result parser repair backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage, planReview })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'Repair build-lane verifier result parsing so PASS lines are not recorded as failures.',
        activeBlockerCardId: closeCard ? null : CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
          startedBy: 'codex-verifier-result-parser-repair',
          currentStatus: closeCard ? 'complete' : normalizeStage(stage),
          closeoutKey: CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Commit/push, then continue BUILD-LANE-VERIFIER-SNAPSHOT-WIRING-REPAIR-001 from repo truth if present.'
            : 'Patch result parsing, prove PASS-line false positives are blocked, and run full ship gates.',
          priorityOrder: [CARD_ID, 'BUILD-LANE-VERIFIER-SNAPSHOT-WIRING-REPAIR-001', 'PARALLEL-BUILDER-OPERATING-SYSTEM-001'],
          notNext: NOT_NEXT,
          exitCriteria: [
            'PASS lines ending with failed are ignored by failure telemetry.',
            'FAIL, ERROR, and Command failed lines still record.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage })],
    },
    'codex-verifier-result-parser-repair',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'Steve prioritized build-lane result parser repair after telemetry false positives.',
    },
  )
}

function buildParserDogfood() {
  const output = [
    'PASS Slack current-day crawl has channel-level item proof after stale-run recovery -> failed / 62 items / 54 succeeded / 8 skipped / 0 failed',
    'PASS Missive current-day crawl has conversation-level item proof -> succeeded / 2740 items / 201 succeeded / 2539 skipped / 0 failed',
    'FAIL VERIFIER-PROCESS-CONTROL-ORCHESTRATION-SPLIT-001 moves Process Control verifier orchestration into bundled domain inputs -> lane=done dogfood=pass lines=5718->5719',
    'ERROR synthetic parser failure -> parser should keep explicit error lines',
    'Command failed: npm run foundation:verify',
  ].join('\n')
  const events = extractBuildLaneFailureEventsFromOutput({
    output,
    command: 'foundation:verify',
    parentCommand: 'process:foundation-ship',
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    occurredAt: new Date('2026-05-18T13:30:00.000Z'),
  })
  const checkNames = events.map(event => event.checkName)
  return {
    ok: events.length === 3 &&
      !checkNames.some(name => /^PASS\s+/i.test(name)) &&
      checkNames.some(name => name.startsWith('VERIFIER-PROCESS-CONTROL-ORCHESTRATION-SPLIT-001')) &&
      checkNames.some(name => name.startsWith('synthetic parser failure')) &&
      checkNames.some(name => name.startsWith('Command failed: npm run foundation:verify')),
    events,
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const planSource = await readRepoFile(PLAN_PATH)
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard, stage: args.stage }),
    changedFiles: CHANGED_FILES,
    declaredRisk: 'build-lane process failure telemetry parser behavior and ship coverage',
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
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-build-lane-records.js'),
    repoFileExists(CLOSEOUT_PATH),
    getBacklogItemsByIds([CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])

  const card = cards[0] || null
  const sprintItem = list(sprint?.items).find(item => item.cardId === CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  const planCriticPass = list(planCriticRuns).some(run => run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE)
  const dogfood = buildParserDogfood()

  addCheck(checks, approval.ok, 'approval validates at 9.8+', approval.failures?.map(failure => failure.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', `score=${planReview.score}`)
  addCheck(checks, planCriticPass || writeRequested, 'durable Plan Critic pass row exists', planCriticPass ? 'pass row' : 'created during this run')
  addCheck(checks, Boolean(card), 'live backlog card exists', card ? `${card.id}/${card.lane}` : 'missing')
  addCheck(checks, card ? validateBuildLaneCardScaffold(card).ok : false, 'live backlog card passes scaffold guard', card ? validateBuildLaneCardScaffold(card).missing.join(', ') || 'complete' : 'missing')
  addCheck(checks, Boolean(sprintItem), 'Current Sprint includes repair card', sprint?.sprint?.sprintId || 'missing sprint')
  addCheck(checks, sprintItem ? validateBuildLaneSprintItemMetadata(sprintItem).ok : false, 'Current Sprint item metadata is complete', sprintItem ? validateBuildLaneSprintItemMetadata(sprintItem).missing.join(', ') || 'complete' : 'missing')
  addCheck(checks, packageJson.scripts?.['process:build-lane-verifier-result-parser-repair-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:build-lane-verifier-result-parser-repair-check'] || 'missing')
  addCheck(checks, telemetrySource.includes('const passedLine = /^PASS') && telemetrySource.includes('!passedLine'), 'telemetry parser guards PASS lines', 'lib/build-lane-failure-telemetry.js')
  addCheck(checks, dogfood.ok, 'dogfood ignores PASS lines and keeps real failures', `${dogfood.events.length} events`)
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
    checks,
    failed,
  }

  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`Build-lane verifier result parser repair check: ${result.status}`)
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
