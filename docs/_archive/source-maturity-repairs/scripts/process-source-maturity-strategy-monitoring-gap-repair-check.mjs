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
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  getFoundationSnapshot,
} from '../lib/foundation-strategy-docs-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { getSourceContracts } from '../lib/source-contracts.js'
import { buildSourceMaturityGridSnapshot } from '../lib/source-maturity-grid.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import {
  SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_APPROVAL_PATH,
  SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CARD_ID,
  SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CHANGED_FILES,
  SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CLOSEOUT_KEY,
  SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CLOSEOUT_PATH,
  SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_NOT_NEXT_BOUNDARIES,
  SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_PLAN_PATH,
  SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_PROOF_COMMANDS,
  SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_SCRIPT_PATH,
  SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_SPRINT_ID,
  SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_TARGET_SOURCE_ID,
  buildSyntheticStrategyMonitoringGapRepairProof,
  evaluateStrategyMonitoringGapRepair,
  renderStrategyMonitoringGapRepairCloseout,
  selectStrategyMonitoringRepairCandidate,
} from '../lib/source-maturity-strategy-monitoring-gap-repair.js'

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

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
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

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/source-contracts.js',
      'lib/source-maturity-grid.js',
      'lib/source-maturity-gap-followup.js',
      'lib/source-contract-validation-layer.js',
    ],
    existingDocs: [
      'docs/source-registry.md',
      'docs/rebuild/current-state.md',
      'docs/_archive/handoffs/2026-05-29-hot-doc-refresh/2026-05-18-source-maturity-gap-followup-triage.md',
    ],
    existingScripts: [
      'scripts/process-source-maturity-gap-followup-check.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: [
      'SOURCE-MATURITY-GAP-FOLLOWUP-001 established safe source maturity child-card repairs from live truth.',
      'SRC-STRATEGY-001 is signed off as the canonical repo strategy packet, but continuous strategy automation is not approved.',
      'Manual/on-demand monitoring boundaries are valid only when they are explicit and do not pretend a background runtime exists.',
    ],
    reused: [
      'Existing SRC-STRATEGY-001 source contract and source facts.',
      'Existing source maturity grid and source contract validation layer.',
      'Existing build-lane scaffold and Current Sprint guards.',
    ],
    notRebuilt: [
      'No live connector, model, extraction, or external write.',
      'No extraction target creation.',
      'No strategy automation.',
      'No atom, synthesis, or route creation.',
    ],
    exactGap: 'SRC-STRATEGY-001 has signed-off source facts but no explicit updateMethod/refreshSchedule/manualRefresh boundary, so source maturity blocks at monitored.',
    overBroadRisk: 'A monitoring repair must not imply continuous strategy automation, Strategy Hub recommendations, atom-flow, synthesis, routing, or external apply is complete.',
    readyBy: 'Steve approved autonomous safe overnight Foundation source work; live source maturity shows SRC-STRATEGY-001 has source facts and a monitored-stage gap.',
    readyAt: '2026-05-18T03:05:00-04:00',
  }
}

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CARD_ID,
    title: 'Repair Strategy source maturity monitoring gap',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P1',
    rank: 40,
    source: 'Live source maturity grid',
    summary: 'Add a truthful manual/on-demand monitoring boundary for SRC-STRATEGY-001 so source maturity no longer blocks on an unmonitored strategy source.',
    whyItMatters: 'Strategy source facts already exist and are signed off, but the missing refresh posture leaves source maturity noisy and slows safe source-contract completion.',
    nextAction: closeCard
      ? `Done under \`${SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CLOSEOUT_KEY}\`. Continue the next safe source maturity/source-contract card from live truth.`
      : 'Add and prove the strategy manual/on-demand monitoring boundary without live extraction, model calls, external writes, or extraction targets.',
    statusNote: closeCard
      ? `Closed under \`${SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CLOSEOUT_KEY}\`; strategy monitoring now clears and the next real gap remains visible.`
      : `Scope/proof: \`${SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CLOSEOUT_KEY}\`; no live extraction/auth/provider/external-write work.`,
    owner: 'Foundation Source',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    cardId: SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : normalizedStage,
    planRef: SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_PLAN_PATH,
    definitionOfDone: 'SRC-STRATEGY-001 has an explicit manual/on-demand monitoring boundary; source maturity no longer blocks at monitored for strategy; the next real maturity gap remains visible; no live extraction, extraction target creation, strategy automation, model call, external write, or Drive mutation occurs; focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
    proofCommands: SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_PROOF_COMMANDS,
    readinessBlockerCleared: 'Live source maturity shows SRC-STRATEGY-001 has active source facts and no monitoring boundary; repo truth has signed-off strategy source contract coverage.',
    notNextBoundaries: SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_APPROVAL_PATH,
      closeoutKey: SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CLOSEOUT_KEY,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, stage = 'building_now' } = {}) {
  const planSource = await readRepoFile(SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_PLAN_PATH)
  const card = buildCardRow({ closeCard, stage })
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card,
    changedFiles: SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CHANGED_FILES,
    declaredRisk: 'shared Foundation source contract and source maturity verification surface',
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
        `source-maturity-strategy-monitoring-${stableRunId(SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_PLAN_PATH)}`,
        SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CARD_ID,
        SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_PLAN_PATH,
        planReview.status,
        planReview.score,
        planReview.maxScore,
        planReview.passThreshold,
        card.priority,
        'full',
        true,
        SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CARD_ID }),
        'codex-source-maturity-strategy-monitoring-gap-repair',
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-source-maturity-strategy-monitoring-gap-repair',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        card.id,
        `${closeCard ? 'Closed' : 'Updated'} ${SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CARD_ID}.`,
        JSON.stringify({ closeoutKey: SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CLOSEOUT_KEY, stage }),
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
        sprintId: SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_SPRINT_ID,
        status: 'active',
        goal: 'Repair the SRC-STRATEGY-001 monitored-stage source maturity gap with an explicit manual/on-demand repo-doc refresh boundary.',
        activeBlockerCardId: closeCard ? null : SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizedStage,
          startedBy: 'codex-source-maturity-strategy-monitoring-gap-repair',
          currentStatus: closeCard ? 'complete' : normalizedStage,
          closeoutKey: SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CLOSEOUT_KEY,
          approvalRef: SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_APPROVAL_PATH,
          planRef: SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_PLAN_PATH,
          noDriveMutationApproved: true,
          existingWorkCheck: buildExistingWorkCheck(),
          proofCommands: SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_PROOF_COMMANDS,
          notNext: SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_NOT_NEXT_BOUNDARIES,
          definitionOfDone: buildSprintItem({ closeCard, stage }).definitionOfDone,
          nextAction: closeCard
            ? 'Commit/push, then continue the next safe Foundation-up card from repo truth.'
            : 'Prove the strategy source monitoring boundary without live extraction, model calls, or external writes.',
          priorityOrder: [SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CARD_ID],
          exitCriteria: [
            'SRC-STRATEGY-001 has explicit updateMethod/refreshSchedule/manualRefresh monitoring posture.',
            'Source maturity no longer blocks at monitored for strategy.',
            'The next real gap remains visible.',
            'No live extraction, external write, model/provider call, connector mutation, or Drive mutation occurs.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
          summary,
        },
      },
      items: [buildSprintItem({ closeCard, stage: normalizedStage })],
    },
    'codex-source-maturity-strategy-monitoring-gap-repair',
    {
      apply: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      replaceItems: true,
      allowItemReplacement: true,
      reason: closeCard
        ? 'Close Strategy monitoring gap repair sprint item after focused proof.'
        : 'Start Strategy monitoring gap repair sprint item with complete scaffold metadata.',
    },
  )
}

async function buildSourceMaturityGrid() {
  const foundationSnapshot = await getFoundationSnapshot()
  return buildSourceMaturityGridSnapshot({
    sources: getSourceContracts(),
    extractionControl: foundationSnapshot.extractionControl,
    sharedCommunicationsCoverage: foundationSnapshot.sharedCommunicationsCoverage,
    intelligenceSynthesisFacts: foundationSnapshot.intelligenceSynthesisFacts,
    intelligenceSynthesis: foundationSnapshot.intelligenceSynthesis,
    intelligenceActionRouter: foundationSnapshot.intelligenceActionRouter,
    sourceMaturityOperational: foundationSnapshot.sourceMaturityOperational,
    lifecycle: foundationSnapshot.sourceLifecycle,
  })
}

async function activeExtractionTargetsForSource(sourceId) {
  const snapshot = await getFoundationSnapshot()
  return list(snapshot.extractionControl?.coverageByTarget || snapshot.extractionControl?.targets)
    .filter(target => target.sourceId === sourceId || target.source_id === sourceId)
    .filter(target => {
      const status = String(target.status || '')
      const runtime = String(target.runtimeMode || target.effectiveRuntimeMode || '')
      const schedule = String(target.schedulerMode || target.scheduleStatus || target.scheduleTruth || '')
      return status === 'active' || runtime === 'scheduled' || schedule === 'scheduled'
    })
}

async function runFocusedProof() {
  const sourceMaturityGrid = await buildSourceMaturityGrid()
  const sourceRegistry = await readRepoFile('docs/source-registry.md')
  const currentState = await readRepoFile('docs/rebuild/current-state.md')
  const candidate = selectStrategyMonitoringRepairCandidate({
    sourceContracts: getSourceContracts(),
    sourceMaturityGrid,
    sourceRegistry,
    currentState,
  })
  const afterRow = list(sourceMaturityGrid.rows).find(row => row.sourceId === SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_TARGET_SOURCE_ID) || {}
  const activeExtractionTargets = await activeExtractionTargetsForSource(SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_TARGET_SOURCE_ID)
  const evaluation = evaluateStrategyMonitoringGapRepair({
    beforeRow: afterRow,
    afterRow,
    candidate,
    activeExtractionTargets,
  })
  return { sourceMaturityGrid, candidate, evaluation, activeExtractionTargets }
}

function includesAll(source = '', needles = []) {
  return needles.every(needle => String(source || '').includes(needle))
}

async function maybeWriteCloseout({ closeCard = false, evaluation = {} } = {}) {
  if (!closeCard) return false
  await fs.writeFile(
    path.join(repoRoot, SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CLOSEOUT_PATH),
    renderStrategyMonitoringGapRepairCloseout(evaluation),
    'utf8',
  )
  return true
}

async function run() {
  const args = parseArgs()
  if (isProcessCheckWriteRequested({ argv: process.argv.slice(2) })) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_SCRIPT_PATH,
      operation: 'create/update Strategy source maturity monitoring repair backlog card, Plan Critic row, and Current Sprint overlay',
      allowedFlags: ['apply', 'close-card'],
    })
  }
  await initFoundationDb()

  const normalizedStage = normalizeStage(args.stage)
  const checks = []
  const synthetic = buildSyntheticStrategyMonitoringGapRepairProof()
  addCheck(checks, synthetic.ok, 'synthetic monitoring-gap dogfood passes', synthetic.ok ? 'monitored -> atomized' : JSON.stringify(synthetic, null, 2).slice(0, 1000))

  const planSource = await readRepoFile(SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_PLAN_PATH)
  const packageJson = JSON.parse(await readRepoFile('package.json'))
  const moduleSource = await readRepoFile('lib/source-maturity-strategy-monitoring-gap-repair.js')
  const scriptSource = await readRepoFile(SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_SCRIPT_PATH)
  const closeoutSourceRecords = await readRepoFile('lib/foundation-build-closeout-source-records.js')
  const coverageSource = await readRepoFile('lib/foundation-verify-coverage-card-ids.js')

  let planReview = null
  if (args.apply || args.closeCard) {
    const result = await upsertLiveCardAndPlanCritic({ closeCard: args.closeCard, stage: normalizedStage })
    planReview = result.planReview
  } else {
    planReview = evaluatePlanCriticPlan({
      planText: planSource,
      card: buildCardRow({ closeCard: args.closeCard, stage: normalizedStage }),
      changedFiles: SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CHANGED_FILES,
      declaredRisk: 'shared Foundation source contract and source maturity verification surface',
      repoRoot,
    })
  }
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes', `${planReview.status}:${planReview.score}`)

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_APPROVAL_PATH,
    cardId: SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CARD_ID,
  })
  addCheck(checks, approval.ok, 'approval integrity passes', approval.failures?.map(failure => failure.check).join(', ') || 'ok')

  const focused = await runFocusedProof()
  await maybeWriteCloseout({ closeCard: args.closeCard, evaluation: focused.evaluation })
  if (args.apply || args.closeCard) {
    await upsertCurrentSprint({ closeCard: args.closeCard, stage: normalizedStage, summary: focused.evaluation.summary })
  }

  const activeSprint = await getActiveFoundationCurrentSprint()
  const sprintStatus = buildFoundationCurrentSprintStatus(activeSprint)
  const activeItem = list(activeSprint.items).find(item => item.cardId === SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CARD_ID)
  const cards = await getBacklogItemsByIds([SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CARD_ID])
  const card = cards[0]
  const planRuns = await getPlanCriticRunsByCardIds([SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CARD_ID])
  const closeouts = getFoundationBuildCloseouts()

  addCheck(checks, focused.candidate.ok, 'live strategy monitoring candidate passes', focused.candidate.failures.join(', ') || focused.candidate.sourceId)
  addCheck(checks, focused.evaluation.ok, 'live strategy monitoring repair evaluates healthy', focused.evaluation.failures.map(failure => failure.check).join(', ') || focused.evaluation.summary.afterNextGap)
  addCheck(checks, focused.evaluation.summary.afterNextGap !== 'monitored', 'live maturity no longer blocks at monitored', focused.evaluation.summary.afterNextGap || 'missing')
  addCheck(checks, focused.evaluation.summary.activeExtractionTargets === 0, 'live proof introduced no extraction targets', String(focused.evaluation.summary.activeExtractionTargets))
  addCheck(checks, card?.id === SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CARD_ID, 'live backlog card exists', card?.id || 'missing')
  addCheck(checks, args.closeCard ? card?.lane === 'done' : ['scoped', 'executing'].includes(card?.lane), 'live backlog lane matches phase', card?.lane || 'missing')
  addCheck(checks, planRuns.some(run => run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'Plan Critic run is recorded', `${planRuns.length} run(s)`)
  addCheck(checks, activeSprint?.sprint?.sprintId === SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_SPRINT_ID, 'Current Sprint uses this sprint id', activeSprint?.sprint?.sprintId || 'missing')
  addCheck(checks, activeItem?.stage === (args.closeCard ? 'done_this_sprint' : normalizedStage), 'Current Sprint item stage is correct', activeItem?.stage || 'missing')
  const onlyPreShipCloseoutFinding = args.closeCard &&
    list(sprintStatus.findings).length === 1 &&
    sprintStatus.findings[0]?.check === 'done_this_sprint_requires_recent_work_closeout'
  addCheck(
    checks,
    sprintStatus.status !== 'risk' || onlyPreShipCloseoutFinding,
    'Current Sprint status is not risk except pre-ship Recent Work closeout sync',
    onlyPreShipCloseoutFinding ? 'pre-ship closeout sync is proven by process:foundation-ship' : sprintStatus.status,
  )
  addCheck(checks, activeItem?.metadata?.approvalRef === SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_APPROVAL_PATH, 'Current Sprint approval ref is present', activeItem?.metadata?.approvalRef || 'missing')
  addCheck(checks, activeItem?.metadata?.closeoutKey === SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CLOSEOUT_KEY, 'Current Sprint closeout key is present', activeItem?.metadata?.closeoutKey || 'missing')
  addCheck(checks, list(activeItem?.proofCommands).includes('npm run process:source-maturity-strategy-monitoring-gap-repair-check -- --close-card --json'), 'Current Sprint proof commands include close-card proof', list(activeItem?.proofCommands).join('; '))
  addCheck(checks, list(activeItem?.notNextBoundaries).some(boundary => boundary.includes('No external write')), 'Current Sprint includes external-write no-go boundary', list(activeItem?.notNextBoundaries).join('; '))
  addCheck(checks, packageJson.scripts?.['process:source-maturity-strategy-monitoring-gap-repair-check'] === `node --env-file-if-exists=.env ${SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:source-maturity-strategy-monitoring-gap-repair-check'] || 'missing')
  addCheck(checks, includesAll(moduleSource, ['buildSyntheticStrategyMonitoringGapRepairProof', 'missing_strategy_monitoring_boundary', 'does not run extraction or write externally']), 'module contains dogfood and no-external-write posture')
  addCheck(checks, includesAll(scriptSource, ['buildSourceMaturityGridSnapshot', 'selectStrategyMonitoringRepairCandidate', 'upsertFoundationCurrentSprintOverlay']), 'script uses live maturity and sprint paths')
  addCheck(checks, closeoutSourceRecords.includes(SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CLOSEOUT_KEY), 'closeout registry includes key', SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CLOSEOUT_KEY)
  addCheck(checks, coverageSource.includes('SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE'), 'done-card verifier coverage constant exists')
  addCheck(checks, coverageSource.includes(SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CARD_ID), 'done-card verifier coverage includes card id', SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CARD_ID)
  if (args.closeCard) {
    const closeoutMarkdown = await readRepoFile(SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CLOSEOUT_PATH)
    addCheck(checks, closeoutMarkdown.includes(SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CLOSEOUT_KEY), 'closeout file exists and names key', SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CLOSEOUT_PATH)
    addCheck(checks, closeouts.some(record => record.key === SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CLOSEOUT_KEY), 'build closeout registry resolves record', SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CLOSEOUT_KEY)
  }

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'risk' : 'healthy',
    cardId: SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CARD_ID,
    closeoutKey: SOURCE_MATURITY_STRATEGY_MONITORING_GAP_REPAIR_CLOSEOUT_KEY,
    applied: args.apply || args.closeCard,
    closeCard: args.closeCard,
    stage: args.closeCard ? 'done_this_sprint' : normalizedStage,
    summary: focused.evaluation.summary,
    checks,
    failures,
  }
  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Source maturity strategy monitoring gap repair: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'OK' : 'FAIL'} ${check.check}${check.detail ? ` - ${check.detail}` : ''}`)
  }
  await closeFoundationDb()
  if (!result.ok) process.exitCode = 1
}

run().catch(async error => {
  console.error(error)
  await closeFoundationDb().catch(() => {})
  process.exitCode = 1
})
