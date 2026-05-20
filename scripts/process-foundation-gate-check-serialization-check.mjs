#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  initFoundationDb,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
import {
  FOUNDATION_GATE_CHECK_SERIALIZATION_APPROVAL_PATH as APPROVAL_PATH,
  FOUNDATION_GATE_CHECK_SERIALIZATION_CARD_ID as CARD_ID,
  FOUNDATION_GATE_CHECK_SERIALIZATION_CLOSEOUT_KEY as CLOSEOUT_KEY,
  FOUNDATION_GATE_CHECK_SERIALIZATION_CLOSEOUT_PATH as CLOSEOUT_PATH,
  FOUNDATION_GATE_CHECK_SERIALIZATION_NEXT_CARD_ID as NEXT_CARD_ID,
  FOUNDATION_GATE_CHECK_SERIALIZATION_PLAN_PATH as PLAN_PATH,
  FOUNDATION_GATE_CHECK_SERIALIZATION_PROOF_COMMANDS,
  FOUNDATION_GATE_CHECK_SERIALIZATION_SCRIPT_PATH as SCRIPT_PATH,
  HEAVY_FOUNDATION_GATE_CHECKS,
  buildFoundationGateCheckSerializationBacklogRow,
  buildFoundationGateCheckSerializationDogfood,
  buildFoundationGateCheckSerializationSprintItem,
} from '../lib/foundation-gate-check-serialization.js'
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

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex:foundation-gate-check-serialization'

const CHANGED_FILES = [
  'lib/foundation-gate-check-serialization.js',
  'scripts/process-foundation-gate-check-serialization-check.mjs',
  'scripts/foundation-verify.mjs',
  'scripts/process-system-health-nightly-audit-check.mjs',
  'scripts/process-build-lane-repeated-failure-action-gate-check.mjs',
  'scripts/backlog-hygiene.mjs',
  'docs/process/foundation-gate-check-serialization-001-plan.md',
  'docs/process/approvals/FOUNDATION-GATE-CHECK-SERIALIZATION-001.json',
  'docs/process/foundation-ship-gate.md',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'docs/handoffs/2026-05-20-foundation-gate-check-serialization-closeout.md',
  'lib/foundation-build-closeout-control-plane-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'package.json',
]

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
  }
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

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

async function repoFileExists(relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath))
    return true
  } catch {
    return false
  }
}

function getGitState() {
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim()
  return { head }
}

function normalizeText(value) {
  return String(value || '').trim()
}

function list(values) {
  return Array.isArray(values) ? values : []
}

function scriptIsWrapped(source, label) {
  return source.includes("runSerializedFoundationGateCheck") && source.includes(label)
}

function getHeavyScriptSourceMap(sources) {
  return {
    'foundation:verify': sources.foundationVerifySource,
    'process:system-health-nightly-audit-check': sources.systemHealthScriptSource,
    'process:build-lane-repeated-failure-action-gate-check': sources.repeatedFailureScriptSource,
    'backlog:hygiene': sources.backlogHygieneScriptSource,
  }
}

function buildBrainFleetNextItem(item = {}) {
  return {
    ...item,
    cardId: NEXT_CARD_ID,
    backlogId: NEXT_CARD_ID,
    stage: 'scoping',
    metadata: {
      ...(item.metadata || {}),
      currentLane: 'Brain Fleet contract next',
      noLiveProviderProbes: true,
      strategyPeopleParked: true,
    },
  }
}

function buildCurrentSprintOverlay(previous, { closeCard = false, currentHead }) {
  const previousSprint = previous.sprint || {}
  let items = list(previous.items).map(item => ({ ...item }))
  const serializationIndex = items.findIndex(item => item.cardId === CARD_ID || item.backlogId === CARD_ID)
  const serializationItem = buildFoundationGateCheckSerializationSprintItem(
    serializationIndex >= 0 ? items[serializationIndex] : { order: 1 },
    { closeCard },
  )
  if (serializationIndex >= 0) items[serializationIndex] = serializationItem
  else items = [serializationItem, ...items.map(item => ({ ...item, order: Number(item.order || item.sprintOrder || 0) + 1 }))]

  if (closeCard) {
    items = items.map(item => item.cardId === NEXT_CARD_ID || item.backlogId === NEXT_CARD_ID
      ? buildBrainFleetNextItem(item)
      : item)
  }

  const activeBlockerCardId = closeCard ? NEXT_CARD_ID : CARD_ID
  return {
    sprint: {
      ...previousSprint,
      sprintId: previousSprint.sprintId || 'foundation-control-plane-and-brain-fleet-readiness-2026-05-20',
      status: 'active',
      goal: previousSprint.goal || 'Keep Foundation raw green while building Brain Fleet and governed extractor readiness.',
      activeBlockerCardId,
      metadata: {
        ...(previousSprint.metadata || {}),
        currentStatus: closeCard ? 'foundation_gate_serialization_closed_brain_fleet_next' : 'foundation_gate_serialization_building',
        activeBlockerCardId,
        nextAction: closeCard
          ? `${NEXT_CARD_ID}: build provider-agnostic no-auth Brain Fleet contract; no live provider probes.`
          : `${CARD_ID}: serialize DB-heavy Foundation proof checks before Brain Fleet.`,
        runOrder: [
          CARD_ID,
          NEXT_CARD_ID,
          'HARLAN-AUTH-ESCALATION-LOOP-001',
          'BRAIN-FLEET-QUOTA-LEDGER-001',
          'BRAIN-FLEET-MODEL-CAPABILITY-REGISTRY-001',
          'CODEX-DIRECT-SUBSCRIPTION-ROUTE-001',
          'GEMINI-VIDEO-BRAIN-ROUTE-001',
          'CLAUDE-CODE-REVIEW-BRAIN-ROUTE-001',
          'OPENCLAW-ADAPTER-BOUNDARY-001',
          'EXTRACTOR-BRAIN-FLEET-PROOF-001',
          'YOUTUBE-BUILD-INTEL-RUNTIME-PROOF-001',
        ],
        strategyPeopleParked: true,
        buildLaneCount: 1,
        heavyFoundationDbChecksSequential: true,
        currentHead,
      },
    },
    items,
  }
}

async function upsertLiveRows({ closeCard = false, planReview }) {
  const row = buildFoundationGateCheckSerializationBacklogRow({ closeCard })
  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note, owner
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (id) DO UPDATE
        SET lane = EXCLUDED.lane,
            priority = EXCLUDED.priority,
            rank = EXCLUDED.rank,
            next_action = EXCLUDED.next_action,
            status_note = EXCLUDED.status_note,
            owner = EXCLUDED.owner,
            updated_at = NOW()
      `,
      [row.id, row.title, row.team, row.lane, row.priority, row.rank, row.source, row.summary, row.whyItMatters, row.nextAction, row.statusNote, row.owner],
    )
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings, result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,$6,'P0','full',true,$7::text[],$8::jsonb,$9::jsonb,$10)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result,
            created_at = NOW()
      `,
      [
        `foundation-gate-check-serialization-${stableRunId(PLAN_PATH)}`,
        CARD_ID,
        PLAN_PATH,
        planReview.status,
        Number(planReview.score),
        PLAN_CRITIC_MIN_PASS_SCORE,
        CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: CARD_ID, closeoutKey: CLOSEOUT_KEY }),
        ACTOR,
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,$3,$4,$5::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        CARD_ID,
        ACTOR,
        `${closeCard ? 'Closed' : 'Updated'} ${CARD_ID}.`,
        JSON.stringify({ closeoutKey: CLOSEOUT_KEY, nextCardId: NEXT_CARD_ID }),
      ],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

async function applyLiveState({ closeCard = false, planReview, gitState }) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: `create/update ${CARD_ID} card, Plan Critic row, and Current Sprint overlay`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveRows({ closeCard, planReview })
  await upsertFoundationCurrentSprintOverlay(
    buildCurrentSprintOverlay(previous, { closeCard, currentHead: gitState.head }),
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: `${CARD_ID} ${closeCard ? 'closed; advance to Brain Fleet contract' : 'is the active serialization blocker'}.`,
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  await initFoundationDb()

  const [
    approval,
    planSource,
    packageJson,
    moduleSource,
    scriptSource,
    foundationVerifySource,
    systemHealthScriptSource,
    repeatedFailureScriptSource,
    backlogHygieneScriptSource,
    foundationShipSource,
    shipGateDoc,
    currentPlan,
    currentState,
    closeoutRegistrySource,
    coverageSource,
    closeoutDoc,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile(PLAN_PATH),
    readRepoJson('package.json'),
    readRepoFile('lib/foundation-gate-check-serialization.js'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('scripts/process-system-health-nightly-audit-check.mjs'),
    readRepoFile('scripts/process-build-lane-repeated-failure-action-gate-check.mjs'),
    readRepoFile('scripts/backlog-hygiene.mjs'),
    readRepoFile('scripts/process-foundation-ship.mjs'),
    readRepoFile('docs/process/foundation-ship-gate.md'),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
    readRepoFile('lib/foundation-build-closeout-control-plane-records.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile(CLOSEOUT_PATH, { optional: true }),
  ])

  const gitState = getGitState()
  const dogfood = await buildFoundationGateCheckSerializationDogfood()
  const cardRow = buildFoundationGateCheckSerializationBacklogRow({ closeCard: args.closeCard })
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: cardRow,
    changedFiles: CHANGED_FILES,
    declaredRisk: 'Foundation DB-heavy proof execution, canonical verifier entrypoint, System Health, repeated-failure gate, backlog hygiene, Current Sprint overlay, backlog card, closeout registry, and package scripts',
    repoRoot,
  })

  if (args.closeCard &&
    approval.ok &&
    Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    planReview.status === 'pass' &&
    Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    dogfood.ok) {
    await applyLiveState({ closeCard: true, planReview, gitState })
  }

  const activeSprint = await getActiveFoundationCurrentSprint()
  const sprintCardIds = Array.from(new Set([
    CARD_ID,
    NEXT_CARD_ID,
    ...list(activeSprint.items).map(item => normalizeText(item.cardId || item.backlogId)).filter(Boolean),
  ]))
  const [cards, planCriticRuns] = await Promise.all([
    getBacklogItemsByIds(sprintCardIds),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: activeSprint.sprint,
    items: activeSprint.items,
    backlogItems: cards,
    closeouts: getFoundationBuildCloseouts(),
    planCriticRuns: null,
  })
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY)
  const card = cards.find(item => item.id === CARD_ID)
  const nextCard = cards.find(item => item.id === NEXT_CARD_ID)
  const serializationItem = list(activeSprint.items).find(item => item.cardId === CARD_ID || item.backlogId === CARD_ID)
  const nextItem = list(activeSprint.items).find(item => item.cardId === NEXT_CARD_ID || item.backlogId === NEXT_CARD_ID)
  const heavySources = getHeavyScriptSourceMap({
    foundationVerifySource,
    systemHealthScriptSource,
    repeatedFailureScriptSource,
    backlogHygieneScriptSource,
  })
  const wrappedHeavyChecks = HEAVY_FOUNDATION_GATE_CHECKS.filter(check => scriptIsWrapped(heavySources[check.command] || '', check.command))
  const sourceBundle = [
    moduleSource,
    scriptSource,
    foundationVerifySource,
    systemHealthScriptSource,
    repeatedFailureScriptSource,
    backlogHygieneScriptSource,
    foundationShipSource,
    shipGateDoc,
    currentPlan,
    currentState,
  ].join('\n')
  const unsafeGreenByClassification = /ignore.*deadlock|deadlock.*healthy|raw(?:Risk|Watch)Count\s*=\s*0/i.test(moduleSource)

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for serialization card', buildPlanCriticResultSummary(planReview))
  addCheck(checks, dogfood.ok, 'dogfood serializes concurrent heavy-gate attempts, allows owner reentry, and fails closed on permanent error', dogfood.ok ? JSON.stringify({ nonOverlapping: dogfood.nonOverlapping, ownerReentry: dogfood.ownerReentry?.childReentrant === true, failedClosed: dogfood.permanentFailure.failedClosed }) : JSON.stringify(dogfood))
  addCheck(checks, HEAVY_FOUNDATION_GATE_CHECKS.length >= 4 && HEAVY_FOUNDATION_GATE_CHECKS.every(check => check.command && check.scriptPath && check.reason), 'heavy Foundation DB checks are classified with reasons', HEAVY_FOUNDATION_GATE_CHECKS.map(check => check.command).join(', '))
  addCheck(checks, moduleSource.includes('fs.mkdir(lockDir') && moduleSource.includes('owner.json') && moduleSource.includes('staleMs') && moduleSource.includes('runSerializedFoundationGateCheck'), 'serialization module uses a shared local atomic lock with stale cleanup', 'lib/foundation-gate-check-serialization.js')
  addCheck(checks, wrappedHeavyChecks.length === HEAVY_FOUNDATION_GATE_CHECKS.length, 'all classified heavy DB checks use shared serialization wrapper', wrappedHeavyChecks.map(check => check.command).join(', ') || 'none')
  addCheck(checks, foundationVerifySource.includes('runWithFoundationGateRetry') && foundationVerifySource.includes('formatFoundationGateRetryMessage'), 'foundation:verify keeps bounded transient retry diagnostics inside serialization', 'scripts/foundation-verify.mjs')
  addCheck(checks, systemHealthScriptSource.includes("systemHealth.status === 'healthy'") && systemHealthScriptSource.includes('rawRiskCount') && systemHealthScriptSource.includes('rawWatchCount'), 'System Health still fails when embedded raw health is red/yellow', 'scripts/process-system-health-nightly-audit-check.mjs')
  addCheck(checks, repeatedFailureScriptSource.includes('currentFailuresResolved') && repeatedFailureScriptSource.includes('unsatisfiedRedItems'), 'repeated-failure gate still blocks unresolved red repeated failures', 'scripts/process-build-lane-repeated-failure-action-gate-check.mjs')
  addCheck(checks, backlogHygieneScriptSource.includes('criticalFindings') && backlogHygieneScriptSource.includes('recordBuildLaneFailureEventsFromChecks'), 'backlog hygiene still records critical failure telemetry', 'scripts/backlog-hygiene.mjs')
  addCheck(checks, foundationShipSource.includes('process:fanout-check') && foundationShipSource.includes('process:post-ship-fanout') && foundationShipSource.includes('foundation:verify') && FOUNDATION_GATE_CHECK_SERIALIZATION_PROOF_COMMANDS.some(command => command.includes('process:system-health-nightly-audit-check')) && FOUNDATION_GATE_CHECK_SERIALIZATION_PROOF_COMMANDS.some(command => command.includes('process:build-lane-repeated-failure-action-gate-check')) && FOUNDATION_GATE_CHECK_SERIALIZATION_PROOF_COMMANDS.some(command => command.includes('backlog:hygiene')), 'foundation ship keeps final verifier and the card proof list keeps required heavy gates', 'scripts/process-foundation-ship.mjs')
  addCheck(checks, !unsafeGreenByClassification, 'serialization code does not force raw green or ignore deadlock failures', 'no raw count override or deadlock-ignore pattern found')
  addCheck(checks, packageJson.scripts?.['process:foundation-gate-check-serialization-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused serialization proof', packageJson.scripts?.['process:foundation-gate-check-serialization-check'] || 'missing')
  addCheck(checks, shipGateDoc.includes('DB-heavy Foundation proof checks') && shipGateDoc.includes('sequential'), 'ship gate docs state DB-heavy Foundation proof checks run sequentially', 'docs/process/foundation-ship-gate.md')
  addCheck(checks, currentPlan.includes(CARD_ID) && currentPlan.includes(NEXT_CARD_ID) && currentPlan.includes('Strategy/People are parked'), 'current plan names serialization blocker and parks Strategy/People', 'docs/rebuild/current-plan.md')
  addCheck(checks, currentState.includes(CARD_ID) && currentState.includes(NEXT_CARD_ID) && currentState.includes('Strategy/People are parked'), 'current state names serialization blocker and parks Strategy/People', 'docs/rebuild/current-state.md')
  addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeoutRegistrySource.includes(CARD_ID), 'closeout registry source includes serialization closeout', 'lib/foundation-build-closeout-control-plane-records.js')
  addCheck(checks, coverageSource.includes(CARD_ID), 'verifier coverage includes serialization card', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, await repoFileExists(CLOSEOUT_PATH) && closeoutDoc.includes(CLOSEOUT_KEY), 'closeout handoff exists for serialization card', CLOSEOUT_PATH)
  addCheck(checks, closeout?.operatorCloseout === true && list(closeout.backlogIds).includes(CARD_ID), 'build closeout lookup resolves serialization closeout', closeout?.key || 'missing')
  addCheck(checks, card && (args.closeCard ? card.lane === 'done' : ['scoped', 'executing'].includes(card.lane)), 'serialization backlog card lane matches proof mode', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'Brain Fleet next card exists in live backlog', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, serializationItem && (args.closeCard ? serializationItem.stage === 'done_this_sprint' : ['scoping', 'building_now'].includes(serializationItem.stage)), 'Current Sprint tracks serialization card stage', serializationItem ? `${serializationItem.cardId}:${serializationItem.stage}` : 'missing')
  addCheck(checks, activeSprint.sprint?.activeBlockerCardId === (args.closeCard ? NEXT_CARD_ID : CARD_ID), 'Current Sprint active blocker matches run state', activeSprint.sprint?.activeBlockerCardId || 'missing')
  addCheck(checks, !args.closeCard || ['scoping', 'building_now'].includes(nextItem?.stage), 'close-card advances Brain Fleet as the active blocker without requiring pre-card Plan Critic', args.closeCard ? (nextItem ? `${nextItem.cardId}:${nextItem.stage}` : 'missing') : 'not closing')
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint stage gate remains healthy', currentSprintStatus.findings?.map(item => `${item.check}: ${item.detail}`).join('; ') || currentSprintStatus.plainEnglish)
  addCheck(checks, FOUNDATION_GATE_CHECK_SERIALIZATION_PROOF_COMMANDS.includes('npm run process:foundation-gate-check-serialization-check -- --close-card --json'), 'proof command list includes close-card focused proof', FOUNDATION_GATE_CHECK_SERIALIZATION_PROOF_COMMANDS.join('; '))
  addCheck(checks, sourceBundle.includes('FOUNDATION-GATE-CHECK-SERIALIZATION-001') && !/STRATEGY-003.*active blocker/i.test(currentPlan + currentState), 'source truth does not revive stale Strategy active-blocker assumption', 'Strategy remains parked')

  const failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'risk' : 'healthy',
    generatedAt: new Date().toISOString(),
    cardId: CARD_ID,
    nextCardId: NEXT_CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    checkCount: checks.length,
    failedCount: failed.length,
    dogfood,
    currentSprint: {
      sprintId: activeSprint.sprint?.sprintId || null,
      activeBlockerCardId: activeSprint.sprint?.activeBlockerCardId || null,
      currentSprintStatus: currentSprintStatus.status,
    },
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Foundation gate check serialization check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Foundation gate check serialization proof failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
