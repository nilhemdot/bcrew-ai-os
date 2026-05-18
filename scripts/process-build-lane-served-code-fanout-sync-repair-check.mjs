#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  extractBuildLaneFailureEventsFromChecks,
} from '../lib/build-lane-failure-telemetry.js'
import {
  validateBuildLaneCardScaffold,
  validateBuildLaneSprintItemMetadata,
} from '../lib/build-lane-reliability.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
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

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const CARD_ID = 'BUILD-LANE-SERVED-CODE-FANOUT-SYNC-REPAIR-001'
const CLOSEOUT_KEY = 'build-lane-served-code-fanout-sync-repair-v1'
const PLAN_PATH = 'docs/process/build-lane-served-code-fanout-sync-repair-001-plan.md'
const APPROVAL_PATH = 'docs/process/approvals/BUILD-LANE-SERVED-CODE-FANOUT-SYNC-REPAIR-001.json'
const CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-build-lane-served-code-fanout-sync-repair-closeout.md'
const SCRIPT_PATH = 'scripts/process-build-lane-served-code-fanout-sync-repair-check.mjs'
const SPRINT_ID = 'build-lane-served-code-fanout-sync-repair-2026-05-18'

const CHANGED_FILES = [
  'scripts/process-fanout-check.mjs',
  SCRIPT_PATH,
  'lib/foundation-build-closeout-build-lane-records.js',
  'lib/foundation-build-closeout-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'package.json',
  PLAN_PATH,
  APPROVAL_PATH,
  CLOSEOUT_PATH,
]

const PROOF_COMMANDS = [
  'node --check scripts/process-fanout-check.mjs scripts/process-build-lane-served-code-fanout-sync-repair-check.mjs',
  'npm run process:build-lane-served-code-fanout-sync-repair-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  `npm run process:foundation-ship -- --card=${CARD_ID} --planApprovalRef=${APPROVAL_PATH} --closeoutKey=${CLOSEOUT_KEY} --commitRef=HEAD`,
]

const NOT_NEXT = [
  'Do not launch parallel builders during this card.',
  'Do not use hidden subagents.',
  'No live extraction.',
  'No auth-required or paid run.',
  'No external write.',
  'Do not mutate Drive permissions.',
  'Do not work MEETING-VAULT-ACL-001 Phase B.',
  'No live Agent Feedback auto-send.',
  'No Harlan/Fal/voice/Canva/OpenHuman feature work.',
]

const REPRESENTATIVE_FANOUT_KEYS = [
  'source-maturity-finance-atom-flow-repair-v1',
  'ship-gate-worker-live-job-pause-v1',
  'source-maturity-github-build-intel-monitoring-gap-repair-v1',
]

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    apply: false,
    closeCard: false,
    stage: 'building_now',
    baseUrl: process.env.FOUNDATION_BASE_URL || 'http://localhost:3000',
  }
  for (const rawArg of argv) {
    const arg = String(rawArg || '')
    if (arg === '--json' || arg === '--json=true') args.json = true
    if (arg === '--apply' || arg === '--apply=true') args.apply = true
    if (arg === '--close-card' || arg === '--close-card=true') args.closeCard = true
    if (arg.startsWith('--stage=')) args.stage = arg.slice('--stage='.length)
    if (arg.startsWith('--baseUrl=')) args.baseUrl = arg.slice('--baseUrl='.length)
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

async function fetchJson(baseUrl, route) {
  const response = await fetch(`${baseUrl}${route}`)
  const body = await response.text()
  if (!response.ok) throw new Error(`${route} returned ${response.status}: ${body.slice(0, 300)}`)
  return JSON.parse(body)
}

function buildExistingWorkCheck() {
  return {
    existingCode: 'Reuse process:fanout-check, build-lane failure telemetry, runtime supervisor served-code proof, Recent Builds API, ship gate worker pause, and closeout registry.',
    existingDocs: 'Reuse BUILD-LANE-RELIABILITY-SPRINT-001, BUILD-LANE-FAILURE-TELEMETRY-001, SHIP-GATE-WORKER-LIVE-JOB-PAUSE-001, and foundation-ship-gate docs.',
    existingScripts: 'Reuse process:fanout-check, process:foundation-ship, process:ship-check, process:post-ship-fanout, backlog hygiene, and foundation:verify.',
    existingPolicy: 'Stale served code must fail closed; dependent checks should not produce misleading extra failure telemetry while the root served-code proof is red.',
    reused: 'Existing supervised dashboard/worker LaunchAgents, served-code metadata, build-log API, local telemetry, and process write guard.',
    notRebuilt: 'No new deploy system, no auto-pull LaunchAgent, no second backlog, no external monitor, and no hidden worker model.',
    exactGap: 'Fanout telemetry counted Recent Builds misses as independent failures even when stale served dashboard code was the root cause.',
    overBroadRisk: 'This could drift into deployment redesign or hidden parallel builders; this card only repairs fanout failure classification and proof.',
    readyBy: 'Steve directed direct-builder recovery after the Planck confusion and the May 18 stale served-code fanout failures.',
    readyAt: '2026-05-18T09:05:00-04:00',
  }
}

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: CARD_ID,
    title: 'Build Lane Served-Code Fanout Sync Repair',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P0',
    rank: 23,
    source: 'Steve 2026-05-18 direct-builder recovery after stale served-code fanout failures.',
    summary: 'Repair fanout failure classification so stale served dashboard code fails as the root cause without also recording misleading Recent Builds closeout failures.',
    whyItMatters: 'Builders need fanout failures to point at the right repair. Stale served code should say restart the dashboard and worker, not create false build-log registry work.',
    nextAction: closeCard
      ? `Done under ${CLOSEOUT_KEY}. Continue BUILD-LANE-VERIFIER-RESULT-PARSER-REPAIR-001 from repo truth.`
      : 'Patch process:fanout-check, prove skipped dependent checks do not create extra telemetry, and ship through full Foundation gates.',
    statusNote: closeCard
      ? `Closed under ${CLOSEOUT_KEY}; no hidden subagents, no live extraction, no external writes.`
      : `Executing ${CLOSEOUT_KEY}; root-cause fanout telemetry repair only.`,
    owner: 'Foundation Process',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  return {
    cardId: CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
    planRef: PLAN_PATH,
    definitionOfDone: 'Fanout stale served-code root-cause behavior is patched, focused proof passes, backlog hygiene passes, foundation:verify passes, process:foundation-ship passes, commit/push is clean.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: 'Steve prioritized build-lane reliability cleanup after the Planck hidden-worker confusion and stale served-code fanout failures.',
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-served-code-fanout-sync-repair')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `build-lane-served-code-fanout-sync-repair-${stableRunId(PLAN_PATH)}`,
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
        VALUES ($1,'backlog_items',$2,'codex-served-code-fanout-sync-repair',$3,$4::jsonb)
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
    operation: 'create/update served-code fanout sync repair backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage, planReview })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'Repair build-lane fanout root-cause classification for stale served code.',
        activeBlockerCardId: closeCard ? null : CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
          startedBy: 'codex-served-code-fanout-sync-repair',
          currentStatus: closeCard ? 'complete' : normalizeStage(stage),
          closeoutKey: CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Commit/push, then continue BUILD-LANE-VERIFIER-RESULT-PARSER-REPAIR-001 from repo truth.'
            : 'Patch fanout classification, prove root-cause telemetry, and run full ship gates.',
          priorityOrder: [CARD_ID, 'BUILD-LANE-VERIFIER-RESULT-PARSER-REPAIR-001', 'BUILD-LANE-VERIFIER-SNAPSHOT-WIRING-REPAIR-001'],
          notNext: NOT_NEXT,
          exitCriteria: [
            'Stale served code still fails fanout.',
            'Dependent Recent Builds checks are skipped until served code is current.',
            'Skipped dependent checks do not create separate failure telemetry.',
            'Representative fanout closeouts are visible once served code is current.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage })],
    },
    'codex-served-code-fanout-sync-repair',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'Steve prioritized build-lane served-code fanout sync repair after the Planck direct-builder recovery.',
    },
  )
}

async function getRepoHead() {
  const { execFile } = await import('node:child_process')
  const { promisify } = await import('node:util')
  const execFileAsync = promisify(execFile)
  const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot })
  return text(stdout).toLowerCase()
}

function buildTelemetryDogfood() {
  const checks = [
    { ok: false, check: 'dashboard served commit matches repo HEAD', detail: 'served=old999 head=new123' },
    { ok: true, skipped: true, check: 'Recent Builds exposes this closeout', detail: 'served=old999 head=new123; restart dashboard/worker before checking Recent Builds fanout' },
    { ok: true, skipped: true, check: 'Recent Builds carries verifier proof command', detail: 'served=old999 head=new123; restart dashboard/worker before checking Recent Builds fanout' },
  ]
  const events = extractBuildLaneFailureEventsFromChecks({
    checks,
    command: 'process:fanout-check',
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
  })
  return {
    ok: events.length === 1 &&
      events[0]?.failureClass === 'served_code_fanout_sync' &&
      events[0]?.checkName === 'dashboard served commit matches repo HEAD',
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
    declaredRisk: 'build-lane process gate behavior and live served-code proof',
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
    fanoutSource,
    scriptSource,
    coverageSource,
    closeoutRegistrySource,
    closeoutDocExists,
    cards,
    sprint,
    planCriticRuns,
    repoHead,
    foundationHub,
    buildLog,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile('package.json').then(JSON.parse),
    readRepoFile('scripts/process-fanout-check.mjs'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-build-lane-records.js'),
    repoFileExists(CLOSEOUT_PATH),
    getBacklogItemsByIds([CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([CARD_ID]),
    getRepoHead(),
    fetchJson(args.baseUrl, '/api/foundation-hub'),
    fetchJson(args.baseUrl, '/api/foundation/build-log?limit=500'),
  ])

  const card = cards[0] || null
  const sprintItem = list(sprint?.items).find(item => item.cardId === CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  const telemetryDogfood = buildTelemetryDogfood()
  const servedCommit = text(foundationHub.runtimeSupervisor?.servedCode?.runningCommit).toLowerCase()
  const workerCommit = text(foundationHub.runtimeSupervisor?.workerCode?.runningCommit).toLowerCase()
  const buildLogRows = list(buildLog.builds)
  const missingBuildLogKeys = REPRESENTATIVE_FANOUT_KEYS.filter(key => {
    const row = buildLogRows.find(build => build.closeoutKey === key)
    return !row || !list(row.proofCommands).some(command => command.includes('foundation:verify')) || !list(row.whereItLives).length
  })
  const planCriticPass = list(planCriticRuns).some(run => run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE)

  addCheck(checks, approval.ok, 'approval validates at 9.8+', approval.failures?.map(failure => failure.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && planReview.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', `score=${planReview.score}`)
  addCheck(checks, planCriticPass || writeRequested, 'durable Plan Critic pass row exists', planCriticPass ? 'pass row' : 'created during this run')
  addCheck(checks, Boolean(card), 'live backlog card exists', card ? `${card.id}/${card.lane}` : 'missing')
  addCheck(checks, card ? validateBuildLaneCardScaffold(card).ok : false, 'live backlog card passes scaffold guard', card ? validateBuildLaneCardScaffold(card).missing.join(', ') || 'complete' : 'missing')
  addCheck(checks, Boolean(sprintItem), 'Current Sprint includes repair card', sprint?.sprint?.sprintId || 'missing sprint')
  addCheck(checks, sprintItem ? validateBuildLaneSprintItemMetadata(sprintItem).ok : false, 'Current Sprint item metadata is complete', sprintItem ? validateBuildLaneSprintItemMetadata(sprintItem).missing.join(', ') || 'complete' : 'missing')
  addCheck(checks, packageJson.scripts?.['process:build-lane-served-code-fanout-sync-repair-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:build-lane-served-code-fanout-sync-repair-check'] || 'missing')
  addCheck(checks, fanoutSource.includes('function skip(') && fanoutSource.includes('Recent Builds exposes this closeout') && fanoutSource.includes('restart dashboard/worker before checking Recent Builds fanout'), 'fanout-check skips dependent Recent Builds checks when served code is stale', 'scripts/process-fanout-check.mjs')
  addCheck(checks, fanoutSource.includes("const prefix = check.skipped ? 'SKIP'"), 'fanout-check prints SKIP rows distinctly', 'SKIP prefix')
  addCheck(checks, telemetryDogfood.ok, 'dogfood records only stale served-code failure, not skipped dependent checks', `${telemetryDogfood.events.length} events`)
  addCheck(checks, servedCommit && servedCommit === repoHead, 'dashboard served commit matches repo HEAD', servedCommit ? `served=${servedCommit.slice(0, 7)} head=${repoHead.slice(0, 7)}` : 'missing served commit')
  addCheck(checks, workerCommit && workerCommit === repoHead, 'worker served commit matches repo HEAD', workerCommit ? `worker=${workerCommit.slice(0, 7)} head=${repoHead.slice(0, 7)}` : 'missing worker commit')
  addCheck(checks, missingBuildLogKeys.length === 0, 'representative fanout closeouts are visible through served build-log API', missingBuildLogKeys.join(', ') || REPRESENTATIVE_FANOUT_KEYS.join(', '))
  addCheck(checks, Boolean(closeout), 'closeout registry exposes repair closeout', closeout ? closeout.key : 'missing')
  addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeoutRegistrySource.includes(CARD_ID), 'build-lane closeout record source includes repair', 'lib/foundation-build-closeout-build-lane-records.js')
  addCheck(checks, closeoutDocExists, 'closeout handoff exists', CLOSEOUT_PATH)
  addCheck(checks, coverageSource.includes('BUILD_LANE_SERVED_CODE_FANOUT_SYNC_REPAIR_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE') && coverageSource.includes(CARD_ID), 'verifier coverage card IDs include repair card', 'lib/foundation-verify-coverage-card-ids.js')
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
    console.log(`Build-lane served-code fanout sync repair check: ${result.status}`)
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
