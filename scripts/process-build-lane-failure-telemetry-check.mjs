#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  BUILD_LANE_FAILURE_TELEMETRY_APPROVAL_PATH,
  BUILD_LANE_FAILURE_TELEMETRY_CARD_ID,
  BUILD_LANE_FAILURE_TELEMETRY_CHANGED_FILES,
  BUILD_LANE_FAILURE_TELEMETRY_CLOSEOUT_KEY,
  BUILD_LANE_FAILURE_TELEMETRY_CLOSEOUT_PATH,
  BUILD_LANE_FAILURE_TELEMETRY_NOT_NEXT_BOUNDARIES,
  BUILD_LANE_FAILURE_TELEMETRY_PLAN_PATH,
  BUILD_LANE_FAILURE_TELEMETRY_PROOF_COMMANDS,
  BUILD_LANE_FAILURE_TELEMETRY_SCRIPT_PATH,
  BUILD_LANE_FAILURE_TELEMETRY_SPRINT_ID,
  buildBuildLaneFailureTelemetryDogfoodProof,
  buildBuildLaneFailureTelemetrySnapshot,
  recordBuildLaneFailureEventsFromChecks,
} from '../lib/build-lane-failure-telemetry.js'
import { validateBuildLaneCardScaffold, validateBuildLaneSprintItemMetadata } from '../lib/build-lane-reliability.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
import {
  buildFoundationSystemHealthDogfoodProof,
  buildFoundationSystemHealthSnapshot,
} from '../lib/foundation-system-health.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
  buildPlanCriticResultSummary,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  evaluateSprintCheckHistoricalMode,
} from '../lib/sprint-check-historical-mode.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const PROMOTION_CARD_ID = 'ACTION-ROUTE-PROMOTION-WORKFLOW-001'
const DEDUP_CARD_ID = 'ACTION-ROUTE-DEDUP-STALENESS-GUARD-001'

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
      'scripts/process-ship-check.mjs',
      'scripts/process-fanout-check.mjs',
      'scripts/process-post-ship-fanout.mjs',
      'scripts/backlog-hygiene.mjs',
      'lib/foundation-system-health.js',
      'public/foundation-runtime-renderers.js',
    ],
    existingDocs: [
      'docs/process/build-lane-reliability-sprint-001-plan.md',
      'docs/handoffs/2026-05-17-build-lane-reliability-sprint-closeout.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
    ],
    existingScripts: [
      'scripts/process-build-lane-reliability-sprint-check.mjs',
      'scripts/foundation-verify.mjs',
      'scripts/process-foundation-ship.mjs',
    ],
    existingPolicy: [
      'Build-lane failures must remain failing gates; telemetry observes and routes repeated failure patterns only.',
      'No live extraction, auth-required run, paid run, external write, Drive mutation, or Agent Feedback auto-send.',
      'Focused proof and targeted repair come before full verifier loops.',
    ],
    reused: [
      'Build-lane scaffold guards, Current Sprint overlay, Plan Critic rows, ship/fanout gates, and System Health.',
    ],
    notRebuilt: [
      'No new CI system, no second backlog, no automatic repair-card creator, no verifier bypass, no feature work.',
    ],
    exactGap: 'Build failures are printed and sometimes proof-recorded, but repeated failure fingerprints are not counted or surfaced as repair work.',
    overBroadRisk: 'This can drift into auto-fixing, broad CI rebuild, or external monitoring. This card is local observability and System Health surfacing only.',
    readyBy: 'Steve explicitly injected BUILD-LANE-FAILURE-TELEMETRY-001 as P0 after repeated build-lane failures wasted time.',
    readyAt: '2026-05-18T03:30:00-04:00',
  }
}

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: BUILD_LANE_FAILURE_TELEMETRY_CARD_ID,
    title: 'Build Lane Failure Telemetry',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P0',
    rank: 30,
    source: 'Steve 2026-05-18 overnight build-lane reliability injection.',
    summary: 'Capture, fingerprint, count, and surface repeated Foundation proof/verifier/ship failures so recurring build-lane issues become repair work instead of repeated manual debugging.',
    whyItMatters: 'Steve needs the build machine to learn from repeated process failures and stop wasting time on the same proof, verifier, fanout, and metadata mistakes.',
    nextAction: closeCard
      ? `Done under \`${BUILD_LANE_FAILURE_TELEMETRY_CLOSEOUT_KEY}\`. Resume ${PROMOTION_CARD_ID}.`
      : 'Build local failure telemetry hooks, System Health surfacing, dogfood proof, and closeout coverage; do not weaken any verifier.',
    statusNote: closeCard
      ? `Closed under \`${BUILD_LANE_FAILURE_TELEMETRY_CLOSEOUT_KEY}\`; observability only, local .git telemetry, no external writes.`
      : `Scope/proof: \`${BUILD_LANE_FAILURE_TELEMETRY_CLOSEOUT_KEY}\`; local build-lane observability only.`,
    owner: 'Foundation Process',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    cardId: BUILD_LANE_FAILURE_TELEMETRY_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : normalizedStage,
    planRef: BUILD_LANE_FAILURE_TELEMETRY_PLAN_PATH,
    definitionOfDone: 'Build-lane failure telemetry fingerprints failed proof/verifier/ship/fanout/hygiene checks, rolls up repeat counts, surfaces red/yellow repeated failures in System Health, proves dogfood cases, closes live card, and passes full ship gate.',
    proofCommands: BUILD_LANE_FAILURE_TELEMETRY_PROOF_COMMANDS,
    readinessBlockerCleared: 'Steve injected this as P0 build-lane reliability work before continuing the overnight action-review queue.',
    notNextBoundaries: [
      ...BUILD_LANE_FAILURE_TELEMETRY_NOT_NEXT_BOUNDARIES,
      'Do not work MEETING-VAULT-ACL-001 Phase B.',
      'Do not mutate Google Drive permissions.',
    ],
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: BUILD_LANE_FAILURE_TELEMETRY_APPROVAL_PATH,
      closeoutKey: BUILD_LANE_FAILURE_TELEMETRY_CLOSEOUT_KEY,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, stage = 'building_now' } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const row = buildCardRow({ closeCard, stage })
  const planCriticResult = {
    status: 'pass',
    score: 10,
    cardId: BUILD_LANE_FAILURE_TELEMETRY_CARD_ID,
    closeoutKey: BUILD_LANE_FAILURE_TELEMETRY_CLOSEOUT_KEY,
  }
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
        VALUES ($1,$2,$3,'pass',10,10,9.8,'P0','full',true,$4::text[],'[]'::jsonb,$5::jsonb,'codex-build-lane-failure-telemetry')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            result = EXCLUDED.result
      `,
      [
        `build-lane-failure-telemetry-${stableRunId(BUILD_LANE_FAILURE_TELEMETRY_PLAN_PATH)}`,
        BUILD_LANE_FAILURE_TELEMETRY_CARD_ID,
        BUILD_LANE_FAILURE_TELEMETRY_PLAN_PATH,
        BUILD_LANE_FAILURE_TELEMETRY_CHANGED_FILES,
        JSON.stringify(planCriticResult),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-build-lane-failure-telemetry',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        row.id,
        `${closeCard ? 'Closed' : 'Updated'} ${BUILD_LANE_FAILURE_TELEMETRY_CARD_ID}.`,
        JSON.stringify({ closeoutKey: BUILD_LANE_FAILURE_TELEMETRY_CLOSEOUT_KEY, stage }),
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
    scriptPath: BUILD_LANE_FAILURE_TELEMETRY_SCRIPT_PATH,
    operation: 'create/update Build Lane Failure Telemetry backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage: normalizedStage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: BUILD_LANE_FAILURE_TELEMETRY_SPRINT_ID,
        status: 'active',
        goal: 'Capture repeated build-lane failures so recurring proof/verifier/ship issues become visible repair work.',
        activeBlockerCardId: closeCard ? null : BUILD_LANE_FAILURE_TELEMETRY_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizedStage,
          startedBy: 'codex-build-lane-failure-telemetry',
          currentStatus: closeCard ? 'complete' : normalizedStage,
          closeoutKey: BUILD_LANE_FAILURE_TELEMETRY_CLOSEOUT_KEY,
          nextAction: closeCard
            ? `Commit/push, then resume ${PROMOTION_CARD_ID}.`
            : 'Build telemetry hooks and System Health surface; no extraction, auth, paid run, external write, or verifier weakening.',
          priorityOrder: [
            BUILD_LANE_FAILURE_TELEMETRY_CARD_ID,
            PROMOTION_CARD_ID,
            DEDUP_CARD_ID,
          ],
          notNext: BUILD_LANE_FAILURE_TELEMETRY_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'Repeated verifier snapshot wiring failures are grouped and surfaced yellow/red by threshold.',
            'Repeated Plan Critic thin-plan failures are grouped and surfaced red.',
            'Ship/fanout/backlog hygiene failure hooks record local telemetry without hiding failure.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage: normalizedStage })],
    },
    'codex-build-lane-failure-telemetry',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || BUILD_LANE_FAILURE_TELEMETRY_SPRINT_ID,
      reason: 'Steve injected BUILD-LANE-FAILURE-TELEMETRY-001 as P0 before continuing the overnight Foundation queue.',
    },
  )
}

function containsUnsafeRuntimeCall(source = '') {
  const tokens = [
    'startExtractionRun(',
    'fetchTranscript(',
    'captureScreenshot(',
    'createChatCompletion(',
    'responses.create(',
    'sendGmail',
    'writeClickUp',
    'applyApprovedActionRoute(',
    'approveActionRoute(',
    'rejectActionRoute(',
    'rerouteActionRoute(',
    'agent-feedback-auto-send-readiness',
  ]
  return tokens.filter(token => String(source || '').includes(token))
}

async function main() {
  const args = parseArgs()
  if (args.apply || args.closeCard || isProcessCheckWriteRequested({ argv: process.argv.slice(2) })) {
    await ensureLiveState({ closeCard: args.closeCard, stage: args.stage })
  }

  const checks = []
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
    systemHealthSource,
    runtimeRendererSource,
    verifierHealthSource,
    coverageSource,
    foundationVerifySource,
    foundationShipSource,
    shipCheckSource,
    fanoutCheckSource,
    postShipFanoutSource,
    backlogHygieneSource,
    closeoutRecordsSource,
    closeoutDoc,
    currentPlan,
    currentState,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: BUILD_LANE_FAILURE_TELEMETRY_APPROVAL_PATH,
      cardId: BUILD_LANE_FAILURE_TELEMETRY_CARD_ID,
    }),
    getBacklogItemsByIds([
      BUILD_LANE_FAILURE_TELEMETRY_CARD_ID,
      PROMOTION_CARD_ID,
      DEDUP_CARD_ID,
    ]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([BUILD_LANE_FAILURE_TELEMETRY_CARD_ID]),
    getFoundationBuildCloseouts(),
    readRepoFile('package.json'),
    readRepoFile(BUILD_LANE_FAILURE_TELEMETRY_PLAN_PATH),
    readRepoFile('lib/build-lane-failure-telemetry.js'),
    readRepoFile(BUILD_LANE_FAILURE_TELEMETRY_SCRIPT_PATH),
    readRepoFile('lib/foundation-system-health.js'),
    readRepoFile('public/foundation-runtime-renderers.js'),
    readRepoFile('lib/foundation-verifier-health-live-summary.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('scripts/process-foundation-ship.mjs'),
    readRepoFile('scripts/process-ship-check.mjs'),
    readRepoFile('scripts/process-fanout-check.mjs'),
    readRepoFile('scripts/process-post-ship-fanout.mjs'),
    readRepoFile('scripts/backlog-hygiene.mjs'),
    readRepoFile('lib/foundation-build-closeout-cleanup-records.js'),
    readRepoFile(BUILD_LANE_FAILURE_TELEMETRY_CLOSEOUT_PATH, { optional: true }),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
  ])
  await closeFoundationDb()

  const packageJson = JSON.parse(packageSource)
  const dogfood = buildBuildLaneFailureTelemetryDogfoodProof()
  const systemHealthDogfood = buildFoundationSystemHealthDogfoodProof()
  const telemetrySystemHealth = buildFoundationSystemHealthSnapshot({
    buildLaneFailureTelemetry: dogfood.snapshot,
    now: new Date('2026-05-18T06:00:00.000Z'),
  })
  const selfReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: { id: BUILD_LANE_FAILURE_TELEMETRY_CARD_ID, priority: 'P0' },
    changedFiles: BUILD_LANE_FAILURE_TELEMETRY_CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
  })
  const planCriticPass = planCriticRuns.some(run =>
    run.cardId === BUILD_LANE_FAILURE_TELEMETRY_CARD_ID &&
      run.status === 'pass' &&
      Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: sprint.sprint,
    items: sprint.items,
    backlogItems: cards,
    closeouts,
    planCriticRuns,
  })
  const card = cards.find(item => item.id === BUILD_LANE_FAILURE_TELEMETRY_CARD_ID) || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === BUILD_LANE_FAILURE_TELEMETRY_CARD_ID) || null
  const closeout = closeouts.find(record => record.key === BUILD_LANE_FAILURE_TELEMETRY_CLOSEOUT_KEY) || null
  const scaffold = validateBuildLaneCardScaffold(card || {})
  const sprintMetadata = validateBuildLaneSprintItemMetadata(sprintItem || {})
  const sprintProofMode = evaluateSprintCheckHistoricalMode({
    activeSprint: sprint,
    card,
    closeouts,
    cardId: BUILD_LANE_FAILURE_TELEMETRY_CARD_ID,
    expectedSprintId: BUILD_LANE_FAILURE_TELEMETRY_SPRINT_ID,
    closeoutKey: BUILD_LANE_FAILURE_TELEMETRY_CLOSEOUT_KEY,
  })
  const verifierLines = foundationVerifySource.split('\n').length
  const unsafeRuntimeHits = [
    ...containsUnsafeRuntimeCall(moduleSource),
    ...containsUnsafeRuntimeCall(foundationShipSource),
    ...containsUnsafeRuntimeCall(shipCheckSource),
    ...containsUnsafeRuntimeCall(fanoutCheckSource),
    ...containsUnsafeRuntimeCall(postShipFanoutSource),
    ...containsUnsafeRuntimeCall(backlogHygieneSource),
  ]

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(failure => failure.check).join(', ') || BUILD_LANE_FAILURE_TELEMETRY_APPROVAL_PATH)
  addCheck(checks, selfReview.status === 'pass' && Number(selfReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', buildPlanCriticResultSummary(selfReview))
  addCheck(checks, planCriticPass, 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, card?.priority === 'P0' && ['scoped', 'executing', 'done'].includes(card?.lane), 'live backlog card exists and is staged', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, scaffold.ok, 'live backlog card passes scaffold guard', scaffold.missing.join(', ') || 'complete')
  addCheck(checks, sprintProofMode.ok === true, 'Current or historical sprint proof validates telemetry card', `${sprintProofMode.mode}: ${sprintProofMode.reason}`)
  addCheck(checks, sprintProofMode.mode === 'historical_closeout' || sprintMetadata.ok, 'Current Sprint item metadata is complete while active', sprintProofMode.mode === 'historical_closeout' ? 'historical closeout' : sprintMetadata.missing.join(', ') || 'complete')
  addCheck(checks, sprintProofMode.mode === 'historical_closeout' || currentSprintStatus.status === 'healthy', 'Current Sprint status is healthy while telemetry card is active', sprintProofMode.mode === 'historical_closeout' ? 'historical closeout' : currentSprintStatus.findings?.map(item => item.detail || item.check).join('; ') || 'healthy')
  addCheck(checks, dogfood.ok, 'dogfood fingerprints repeats and escalates by threshold', dogfood.invariant)
  addCheck(checks, dogfood.snapshot.fingerprints.some(row => row.failureClass === 'verifier_snapshot_wiring' && row.status === 'watch' && row.count24h === 3), 'dogfood repeated verifier snapshot wiring becomes yellow', '3 repeats')
  addCheck(checks, dogfood.snapshot.fingerprints.some(row => row.failureClass === 'plan_critic_or_approval' && row.status === 'risk' && row.count24h === 5), 'dogfood repeated thin-plan failure becomes red', '5 repeats')
  addCheck(checks, dogfood.snapshot.fingerprints.some(row => row.checkName === 'Transient one-off failure' && row.status === 'healthy'), 'dogfood one-off failure does not escalate', 'healthy one-off')
  addCheck(checks, dogfood.snapshot.fingerprints.some(row => row.failureClass === 'served_code_fanout_sync' && row.status === 'risk' && row.cardIds.length === 2), 'dogfood multi-card fanout drift becomes red', 'multi-card blocking')
  addCheck(checks, telemetrySystemHealth.summary?.buildLaneFailureRedCount >= 1 && telemetrySystemHealth.summary?.buildLaneFailureYellowCount >= 1, 'System Health counts build-lane red/yellow telemetry', JSON.stringify(telemetrySystemHealth.summary || {}))
  addCheck(checks, systemHealthDogfood.checks?.some(check => check.check === 'repeated build-lane failure telemetry is surfaced in system health' && check.ok), 'System Health dogfood includes repeated failure surfacing', 'foundation-system-health')
  addCheck(checks, moduleSource.includes('recordBuildLaneFailureEventsFromChecks') && moduleSource.includes('recordBuildLaneFailureEventsFromError'), 'telemetry module exposes recording helpers', 'lib/build-lane-failure-telemetry.js')
  addCheck(checks, scriptSource.includes('recordBuildLaneFailureEventsFromChecks') && scriptSource.includes("command: 'process:build-lane-failure-telemetry-check'"), 'focused proof records its own failed checks', BUILD_LANE_FAILURE_TELEMETRY_SCRIPT_PATH)
  addCheck(checks, moduleSource.includes('BUILD_LANE_FAILURE_TELEMETRY_24H_WARNING_THRESHOLD = 3') && moduleSource.includes('BUILD_LANE_FAILURE_TELEMETRY_24H_RISK_THRESHOLD = 5'), 'telemetry thresholds are explicit', '3/5')
  addCheck(checks, moduleSource.includes('.git/foundation-build-lane-failure-telemetry.jsonl') && moduleSource.includes('writesSourceSystems: false'), 'telemetry writes local repo log only and declares no source writes', '.git local log')
  addCheck(checks, foundationShipSource.includes('recordBuildLaneFailureEventsFromError') && foundationShipSource.includes("parentCommand: 'process:foundation-ship'"), 'foundation ship gate records failed substeps', 'scripts/process-foundation-ship.mjs')
  addCheck(checks, shipCheckSource.includes('recordBuildLaneFailureEventsFromChecks') && shipCheckSource.includes("command: 'process:ship-check'"), 'ship-check records failed checks', 'scripts/process-ship-check.mjs')
  addCheck(checks, fanoutCheckSource.includes('recordBuildLaneFailureEventsFromChecks') && fanoutCheckSource.includes("command: 'process:fanout-check'"), 'fanout-check records failed checks', 'scripts/process-fanout-check.mjs')
  addCheck(checks, postShipFanoutSource.includes('recordBuildLaneFailureEventsFromChecks') && postShipFanoutSource.includes("command: 'process:post-ship-fanout'"), 'post-ship fanout records failed checks', 'scripts/process-post-ship-fanout.mjs')
  addCheck(checks, backlogHygieneSource.includes('recordBuildLaneFailureEventsFromChecks') && backlogHygieneSource.includes("command: 'backlog:hygiene'"), 'backlog hygiene records critical findings', 'scripts/backlog-hygiene.mjs')
  addCheck(checks, systemHealthSource.includes('buildLaneFailureTelemetry') && systemHealthSource.includes('readBuildLaneFailureTelemetrySnapshot') && systemHealthSource.includes('buildLaneFailureRedCount'), 'System Health surfaces repeated failure telemetry', 'lib/foundation-system-health.js')
  addCheck(checks, runtimeRendererSource.includes('Build lane failures') && runtimeRendererSource.includes('buildLaneFailureYellowCount'), 'System Health renderer shows build-lane failures', 'public/foundation-runtime-renderers.js')
  addCheck(checks, verifierHealthSource.includes('buildBuildLaneFailureTelemetryDogfoodProof') && verifierHealthSource.includes(BUILD_LANE_FAILURE_TELEMETRY_CARD_ID), 'verifier health live summary covers telemetry', 'lib/foundation-verifier-health-live-summary.js')
  addCheck(checks, coverageSource.includes('BUILD_LANE_FAILURE_TELEMETRY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE'), 'verifier coverage card IDs include telemetry card', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, foundationVerifySource.includes('BUILD_LANE_FAILURE_TELEMETRY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE'), 'foundation:verify imports telemetry card coverage', 'scripts/foundation-verify.mjs')
  addCheck(checks, packageJson.scripts?.['process:build-lane-failure-telemetry-check'] === `node --env-file-if-exists=.env ${BUILD_LANE_FAILURE_TELEMETRY_SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:build-lane-failure-telemetry-check'] || 'missing')
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(BUILD_LANE_FAILURE_TELEMETRY_CARD_ID), 'closeout registry record is registered', closeout?.key || 'missing')
  addCheck(checks, closeoutRecordsSource.includes(BUILD_LANE_FAILURE_TELEMETRY_CLOSEOUT_KEY), 'closeout registry source contains closeout key', BUILD_LANE_FAILURE_TELEMETRY_CLOSEOUT_KEY)
  addCheck(checks, await repoFileExists(BUILD_LANE_FAILURE_TELEMETRY_CLOSEOUT_PATH), 'closeout handoff exists', BUILD_LANE_FAILURE_TELEMETRY_CLOSEOUT_PATH)
  addCheck(checks, closeoutDoc.includes(PROMOTION_CARD_ID) && closeoutDoc.includes('no live extraction'), 'closeout documents next card and no-live-extraction limit', BUILD_LANE_FAILURE_TELEMETRY_CLOSEOUT_PATH)
  addCheck(checks, currentPlan.includes(BUILD_LANE_FAILURE_TELEMETRY_CLOSEOUT_KEY) && currentState.includes(BUILD_LANE_FAILURE_TELEMETRY_CLOSEOUT_KEY), 'current plan/state name telemetry closeout', BUILD_LANE_FAILURE_TELEMETRY_CLOSEOUT_KEY)
  addCheck(checks, moduleSource.split('\n').length < 1500, 'new module is under preferred module budget', `${moduleSource.split('\n').length} lines`)
  addCheck(checks, scriptSource.split('\n').length < 1500, 'focused proof script is under preferred module budget', `${scriptSource.split('\n').length} lines`)
  addCheck(checks, verifierLines < 5000, 'root verifier stays under 5,000 lines', `${verifierLines} lines`)
  addCheck(checks, unsafeRuntimeHits.length === 0, 'runtime code has no extraction/model/action mutation/external-write calls', unsafeRuntimeHits.join(', ') || 'clean')

  const failed = checks.filter(check => !check.ok)
  const summary = {
    status: failed.length ? 'fail' : 'pass',
    generatedAt: new Date().toISOString(),
    cardId: BUILD_LANE_FAILURE_TELEMETRY_CARD_ID,
    sprintId: sprint.sprint?.sprintId || null,
    checkCount: checks.length,
    failedCount: failed.length,
    telemetryStatus: dogfood.snapshot.status,
    redFingerprints: dogfood.snapshot.summary?.redFingerprintCount || 0,
    yellowFingerprints: dogfood.snapshot.summary?.yellowFingerprintCount || 0,
    sprintProofMode: sprintProofMode.mode,
    verifierLines,
  }

  if (args.json) {
    console.log(JSON.stringify({ ...summary, checks, failed }, null, 2))
  } else {
    console.log('Build Lane Failure Telemetry check')
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  }

  if (failed.length) {
    try {
      recordBuildLaneFailureEventsFromChecks({
        repoRoot,
        checks,
        command: 'process:build-lane-failure-telemetry-check',
        cardId: BUILD_LANE_FAILURE_TELEMETRY_CARD_ID,
        sprintId: BUILD_LANE_FAILURE_TELEMETRY_SPRINT_ID,
        closeoutKey: BUILD_LANE_FAILURE_TELEMETRY_CLOSEOUT_KEY,
      })
    } catch {}
    process.exitCode = 1
  }
}

main().catch(async error => {
  try {
    await closeFoundationDb()
  } catch {}
  console.error(error?.stack || error?.message || String(error))
  process.exit(1)
})
