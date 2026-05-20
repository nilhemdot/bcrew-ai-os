#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { validateBuildLaneCardScaffold, validateBuildLaneSprintItemMetadata } from '../lib/build-lane-reliability.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
import {
  closeFoundationDb,
  getActionRouterSnapshot,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getIntelligenceRetrievalSnapshot,
  getPlanCriticRunsByCardIds,
  getStrategyGoalTruthSnapshot,
  getStrategyOperatingTruthSnapshot,
  initFoundationDb,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
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
import {
  STRATEGY_004_APPROVAL_PATH,
  STRATEGY_004_CARD_ID,
  STRATEGY_004_CHANGED_FILES,
  STRATEGY_004_CLOSEOUT_KEY,
  STRATEGY_004_CLOSEOUT_PATH,
  STRATEGY_004_NEXT_CARD_ID,
  STRATEGY_004_NOT_NEXT_BOUNDARIES,
  STRATEGY_004_PLAN_PATH,
  STRATEGY_004_PROOF_COMMANDS,
  STRATEGY_004_SCRIPT_PATH,
  STRATEGY_004_SPRINT_ID,
  buildStrategyPlanningWorkflowDogfoodProof,
  buildStrategyPlanningWorkflowSnapshot,
  evaluateStrategyPlanningWorkflow,
  getStrategyPlanningEvidenceSnapshot,
} from '../lib/strategy-planning-workflow.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-strategy-004-planning-workflow'

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

function text(value, fallback = '') {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim()
  return normalized || fallback
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

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: STRATEGY_004_CARD_ID,
    title: 'Build the AI-assisted strategy planning workflow',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 17,
    source: 'Current Sprint active blocker, Strategy Hub v2 source-to-gap route review, Strategic Intelligence, DECISION-008, INTEL-SCOPER-001, and Steve direction to keep building without reviving unsupported advisor chat.',
    summary: 'Add a deterministic source-backed planning workflow to Strategy Hub v2 that turns source-to-gap pressure, strategic issues, Scoper outputs, and Strategy Action Router records into priority, carry-forward, stop, and missing-data review queues.',
    whyItMatters: 'Quarterly planning needs a usable AI-assisted workflow, but it must be evidence-bound, proposal-only, and safe before any broader advisor or Director surface relies on it.',
    nextAction: closeCard
      ? `Done under ${STRATEGY_004_CLOSEOUT_KEY}; continue ${STRATEGY_004_NEXT_CARD_ID}.`
      : 'Wire source-backed planning workflow payload/UI/proof without provider calls, advisor chat, external writes, or automatic decision application.',
    statusNote: closeCard
      ? `Closed v1 under ${STRATEGY_004_CLOSEOUT_KEY}; Strategy Hub now renders deterministic priority/carry-forward/stop/missing-data planning queues and advances to ${STRATEGY_004_NEXT_CARD_ID}.`
      : 'Executing v1: source-backed planning workflow only; no LLM/provider/browser/external writes or auto-applied decisions.',
    owner: 'Strategic Intelligence',
  }
}

function buildNextCardRow(existing = {}) {
  return {
    ...existing,
    id: STRATEGY_004_NEXT_CARD_ID,
    title: existing.title || 'Clean Strategy Package UI/UX for live planning',
    lane: existing.lane === 'done' ? existing.lane : 'scoped',
    priority: existing.priority || 'P0',
    rank: existing.rank || 18,
    nextAction: text(existing.nextAction, 'Clean Strategy Package UI/UX for live planning.'),
    statusNote: `${text(existing.statusNote)} Unblocked by ${STRATEGY_004_CLOSEOUT_KEY}; scope/proof required before build, starting from source-backed planning workflow queues, not old advisor chat.`.trim(),
    owner: existing.owner || 'Strategy UX',
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/strategy-shared-comms-routes.js',
      'lib/strategy-hub-meeting-ready.js',
      'lib/strategic-intel-loop.js',
      'lib/decision-008-accountability-doctrine.js',
      'lib/intel-scoper.js',
      'lib/intelligence-action-router.js',
      'public/strategic-execution.js',
    ],
    existingTables: [
      'intelligence_strategic_issues',
      'intelligence_scoper_outputs',
      'intelligence_action_routes',
      'strategy_hub_snapshots',
    ],
    existingDocs: [
      STRATEGY_004_PLAN_PATH,
      'docs/process/strategy-hub-meeting-ready-001-plan.md',
      'docs/process/strategic-intel-001-plan.md',
      'docs/process/decision-008-plan.md',
      'docs/process/intel-scoper-001-plan.md',
    ],
    existingScripts: [
      'process:strategy-hub-meeting-ready-check',
      'process:strategic-intel-check',
      'process:decision-008-check',
      'process:intel-scoper-check',
      'process:system-health-nightly-audit-check',
      'process:build-lane-repeated-failure-action-gate-check',
      'backlog:hygiene',
      'foundation:verify',
      'process:foundation-ship',
    ],
    existingPolicy: [
      'Strategy Hub v2 consumes source-backed facts, Strategy Action Router records, and Scoper outputs.',
      'Detected decisions and Scoper outputs remain proposal-only until explicit human approval.',
      'Operational routes stay hidden unless explicitly Strategy Hub eligible.',
      'Blockers block unsafe actions, not the whole sprint when safe work remains.',
    ],
    exactGap: 'Strategy Hub had source-to-gap, meeting packet, and route review surfaces, but no planning workflow that tells Steve what to prioritize, carry forward, stop, or fill with missing data.',
    reused: [
      'Source-to-gap truth',
      'Strategy meeting packet pressure cards',
      'Strategic issue ledger',
      'Scoper outputs',
      'Action Router review items',
      'Retrieval eval status',
    ],
    overBroadRisk: 'The card can drift into advisor chat, provider calls, auto-applied decisions, or broad source expansion. V1 is deterministic, source-backed, proposal-only, and read-only.',
    notRebuilt: [
      'No old Strategy Advisor chat.',
      'No model/provider call.',
      'No extraction or browser automation.',
      'No external write/send.',
      'No auto-created backlog or applied decision.',
    ],
    readyBy: 'Steve unattended Foundation sprint approval',
    readyAt: '2026-05-20T02:20:00-04:00',
  }
}

function buildSprintItemFromExisting(item = {}, { closeCard = false } = {}) {
  if (item.cardId !== STRATEGY_004_CARD_ID) return item
  return {
    ...item,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: STRATEGY_004_PLAN_PATH,
    definitionOfDone: 'Strategy Hub v2 renders a deterministic source-backed planning workflow with priority, carry-forward, stop, and missing-data queues; every item has provenance, owner, and next action; advisor chat/provider/external writes remain blocked; full gates pass.',
    proofCommands: STRATEGY_004_PROOF_COMMANDS,
    readinessBlockerCleared: 'SLICE-001 and Marketing Video Lab safety closed; Strategy Hub can add a bounded source-backed workflow without widening into provider or extraction work.',
    notNextBoundaries: STRATEGY_004_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      ...(item.metadata || {}),
      owner: 'Strategic Intelligence',
      closeoutKey: STRATEGY_004_CLOSEOUT_KEY,
      approvalRef: STRATEGY_004_APPROVAL_PATH,
    },
  }
}

function ensureSprintHasTarget(items = []) {
  if (items.some(item => item.cardId === STRATEGY_004_CARD_ID)) return items
  return [
    ...items,
    {
      cardId: STRATEGY_004_CARD_ID,
      order: items.length + 1,
      stage: 'building_now',
      title: 'Build the AI-assisted strategy planning workflow',
    },
  ]
}

async function upsertLiveRows({ closeCard = false, planReview }) {
  const pool = createPool()
  const client = await pool.connect()
  const row = buildCardRow({ closeCard })
  try {
    await client.query('BEGIN')
    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary,
          why_it_matters, next_action, status_note, owner
        )
        VALUES ($1,$2,'foundation',$3,$4,$5,$6,$7,$8,$9,$10,$11)
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
      [row.id, row.title, row.lane, row.priority, row.rank, row.source, row.summary, row.whyItMatters, row.nextAction, row.statusNote, row.owner],
    )
    const nextExisting = await client.query('SELECT * FROM backlog_items WHERE id = $1', [STRATEGY_004_NEXT_CARD_ID])
    const nextRow = buildNextCardRow(nextExisting.rows[0] || {})
    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, next_action, status_note, owner
        )
        VALUES ($1,$2,'foundation',$3,$4,$5,$6,$7,$8)
        ON CONFLICT (id) DO UPDATE
        SET lane = CASE WHEN backlog_items.lane = 'done' THEN backlog_items.lane ELSE EXCLUDED.lane END,
            next_action = EXCLUDED.next_action,
            status_note = EXCLUDED.status_note,
            owner = COALESCE(NULLIF(EXCLUDED.owner, ''), backlog_items.owner),
            updated_at = NOW()
      `,
      [nextRow.id, nextRow.title, nextRow.lane, nextRow.priority, nextRow.rank, nextRow.nextAction, nextRow.statusNote, nextRow.owner],
    )
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings, result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,$9)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `strategy-004-${stableRunId(STRATEGY_004_PLAN_PATH)}`,
        STRATEGY_004_CARD_ID,
        STRATEGY_004_PLAN_PATH,
        planReview.status,
        Number(planReview.score),
        STRATEGY_004_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: STRATEGY_004_CARD_ID }),
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
        STRATEGY_004_CARD_ID,
        ACTOR,
        `${closeCard ? 'Closed' : 'Updated'} ${STRATEGY_004_CARD_ID}.`,
        JSON.stringify({ closeoutKey: STRATEGY_004_CLOSEOUT_KEY, nextCardId: STRATEGY_004_NEXT_CARD_ID }),
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

async function ensureLiveState({ closeCard = false, planReview }) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: STRATEGY_004_SCRIPT_PATH,
    operation: `create/update ${STRATEGY_004_CARD_ID} card, Plan Critic row, and Current Sprint overlay`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveRows({ closeCard, planReview })
  const baseItems = ensureSprintHasTarget(previous.items || [])
  const items = baseItems.map(item => {
    if (item.cardId === STRATEGY_004_NEXT_CARD_ID && closeCard) {
      return { ...item, stage: 'scoping' }
    }
    return buildSprintItemFromExisting(item, { closeCard })
  })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: previous.sprint?.sprintId || STRATEGY_004_SPRINT_ID,
        status: 'active',
        activeBlockerCardId: closeCard ? STRATEGY_004_NEXT_CARD_ID : STRATEGY_004_CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: closeCard ? 'next_scoping' : 'building_now',
          closeoutKey: STRATEGY_004_CLOSEOUT_KEY,
          nextAction: closeCard
            ? `Commit/push, then continue ${STRATEGY_004_NEXT_CARD_ID}.`
            : 'Ship deterministic source-backed planning workflow only.',
          notNext: STRATEGY_004_NOT_NEXT_BOUNDARIES,
        },
      },
      items,
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'Steve approved unattended Foundation execution; close Strategy planning workflow and continue next safe card.',
    },
  )
}

async function buildLiveWorkflow() {
  const [goalTruth, operatingTruth, actionRouter, retrieval, planningEvidence] = await Promise.all([
    getStrategyGoalTruthSnapshot(),
    getStrategyOperatingTruthSnapshot(),
    getActionRouterSnapshot({ limit: 50 }),
    getIntelligenceRetrievalSnapshot({ limit: 20 }),
    getStrategyPlanningEvidenceSnapshot({ issueLimit: 25, scoperLimit: 25 }),
  ])
  const workflow = buildStrategyPlanningWorkflowSnapshot({
    goalTruth,
    operatingTruth,
    actionRouter,
    retrieval,
    meetingReady: {},
    strategicIssues: planningEvidence.strategicIssues || [],
    scoperOutputs: planningEvidence.scoperOutputs || [],
  })
  return { workflow, planningEvidence }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const planSource = await readRepoFile(STRATEGY_004_PLAN_PATH)
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard }),
    changedFiles: STRATEGY_004_CHANGED_FILES,
    declaredRisk: 'Strategy Hub planning workflow can drift into unsupported advisor recommendations.',
    repoRoot,
  })
  if (args.closeCard) await ensureLiveState({ closeCard: true, planReview })

  const [
    approval,
    packageJson,
    moduleSource,
    routeSource,
    htmlSource,
    uiSource,
    coverageSource,
    closeoutRecordsSource,
    closeoutDoc,
    scriptSource,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: STRATEGY_004_APPROVAL_PATH, cardId: STRATEGY_004_CARD_ID }),
    readRepoJson('package.json'),
    readRepoFile('lib/strategy-planning-workflow.js'),
    readRepoFile('lib/strategy-shared-comms-routes.js'),
    readRepoFile('public/strategic-execution.html'),
    readRepoFile('public/strategic-execution.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-process-gate-records.js'),
    readRepoFile(STRATEGY_004_CLOSEOUT_PATH, { optional: true }),
    readRepoFile(STRATEGY_004_SCRIPT_PATH),
  ])

  await initFoundationDb()
  let live = null
  try {
    live = await buildLiveWorkflow()
  } finally {
    // Keep the shared Foundation DB open for the sprint/backlog reads below.
  }
  const liveEvaluation = evaluateStrategyPlanningWorkflow(live.workflow)
  const dogfood = buildStrategyPlanningWorkflowDogfoodProof()
  const sprint = await getActiveFoundationCurrentSprint()
  const sprintCardIds = (sprint.items || []).map(item => item.cardId).filter(Boolean)
  const cardIds = Array.from(new Set([STRATEGY_004_CARD_ID, STRATEGY_004_NEXT_CARD_ID, ...sprintCardIds]))
  const [cards, planCriticRuns] = await Promise.all([
    getBacklogItemsByIds(cardIds),
    getPlanCriticRunsByCardIds(cardIds),
  ])
  await closeFoundationDb()
  const card = cards.find(item => item.id === STRATEGY_004_CARD_ID) || null
  const nextCard = cards.find(item => item.id === STRATEGY_004_NEXT_CARD_ID) || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === STRATEGY_004_CARD_ID) || null
  const nextSprintItem = (sprint.items || []).find(item => item.cardId === STRATEGY_004_NEXT_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === STRATEGY_004_CLOSEOUT_KEY) || null
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: sprint.sprint,
    items: sprint.items,
    backlogItems: cards,
    closeouts: getFoundationBuildCloseouts(),
    planCriticRuns,
  })
  const scaffold = validateBuildLaneCardScaffold(card || {})
  const sprintMetadata = validateBuildLaneSprintItemMetadata(sprintItem || {})
  const readOnlyScript = ![
    ['fetch', '('].join(''),
    ['ax', 'ios'].join(''),
    ['child', '_process'].join(''),
    ['foundation', ':job'].join(''),
  ].some(token => scriptSource.includes(token))

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(failure => failure.check).join(', ') || STRATEGY_004_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', buildPlanCriticResultSummary(planReview))
  addCheck(checks, planCriticRuns.some(run => run.cardId === STRATEGY_004_CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, card?.priority === 'P0' && ['executing', 'done'].includes(card?.lane), 'live backlog card exists and is staged', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, scaffold.ok, 'live backlog card passes scaffold guard', scaffold.missing.join(', ') || 'complete')
  addCheck(checks, sprint.sprint?.activeBlockerCardId === (args.closeCard ? STRATEGY_004_NEXT_CARD_ID : STRATEGY_004_CARD_ID), 'Current Sprint active blocker matches expected card', sprint.sprint?.activeBlockerCardId || 'missing')
  addCheck(checks, args.closeCard ? sprintItem?.stage === 'done_this_sprint' : Boolean(sprintItem), 'Current Sprint target item is present/closed', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  addCheck(checks, args.closeCard ? nextSprintItem?.stage === 'scoping' : true, 'next card remains scoped after closeout', nextSprintItem ? `${nextSprintItem.cardId}:${nextSprintItem.stage}` : 'not closing')
  addCheck(checks, sprintMetadata.ok, 'Current Sprint item metadata is complete', sprintMetadata.missing.join(', ') || 'complete')
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint status is healthy', currentSprintStatus.findings?.map(item => item.detail || item.check).join('; ') || 'healthy')
  addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'next safe card remains live', nextCard ? `${nextCard.lane}/${nextCard.priority}` : 'missing')
  addCheck(checks, dogfood.ok, 'planning workflow dogfood passes', JSON.stringify(dogfood.summary))
  addCheck(checks, dogfood.weakRejected === true, 'dogfood rejects unsupported recommendation without provenance', 'weak source-less item rejected')
  addCheck(checks, dogfood.variantChanged === true, 'changed source values affect planning readout', 'variant changed')
  addCheck(checks, dogfood.operationalHidden === true, 'operational routes stay hidden from planning workflow', 'hidden operational route rejected')
  addCheck(checks, liveEvaluation.ok, 'live planning workflow evaluates healthy', JSON.stringify(liveEvaluation.summary))
  addCheck(checks, live.workflow.noProviderCalls === true && live.workflow.noExternalWrites === true && live.workflow.appliesDecisions === false, 'live workflow is read-only/proposal-only', 'no provider/write/apply')
  addCheck(checks, packageJson.scripts?.['process:strategy-004-check'] === `node --env-file-if-exists=.env ${STRATEGY_004_SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:strategy-004-check'] || 'missing')
  addCheck(checks, moduleSource.includes('buildStrategyPlanningWorkflowSnapshot') && moduleSource.includes('getStrategyPlanningEvidenceSnapshot'), 'planning module owns builder and DB read helper', 'lib/strategy-planning-workflow.js')
  addCheck(checks, routeSource.includes('planningWorkflow') && routeSource.includes('getStrategyPlanningEvidenceSnapshot'), 'Strategy Hub API payload includes planning workflow', 'lib/strategy-shared-comms-routes.js')
  addCheck(checks, htmlSource.includes('data-section="planning"') && uiSource.includes('renderPlanningWorkflow') && uiSource.includes('advisor-chat recommendations'), 'Strategy Hub UI exposes Planning Workflow without advisor chat', 'public/strategic-execution.js')
  addCheck(checks, coverageSource.includes('STRATEGY_004_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE') && coverageSource.includes(STRATEGY_004_CARD_ID), 'verifier coverage IDs include STRATEGY-004', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(STRATEGY_004_CARD_ID), 'closeout registry record is registered', closeout?.key || 'missing')
  addCheck(checks, closeoutRecordsSource.includes(STRATEGY_004_CLOSEOUT_KEY) && closeoutRecordsSource.includes(STRATEGY_004_CARD_ID), 'closeout registry source contains card and key', STRATEGY_004_CLOSEOUT_KEY)
  addCheck(checks, closeoutDoc.includes('deterministic source-backed planning workflow') && closeoutDoc.includes('No advisor chat'), 'closeout documents scope and boundary', STRATEGY_004_CLOSEOUT_PATH)
  addCheck(checks, readOnlyScript, 'focused proof avoids provider calls, subprocesses, and job launches', STRATEGY_004_SCRIPT_PATH)

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'fail' : 'pass',
    cardId: STRATEGY_004_CARD_ID,
    closeoutKey: STRATEGY_004_CLOSEOUT_KEY,
    sprintId: sprint.sprint?.sprintId || null,
    liveSummary: liveEvaluation.summary,
    dogfood: dogfood.summary,
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`${STRATEGY_004_CARD_ID} check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  }

  if (failed.length) process.exitCode = 1
}

main().catch(async error => {
  try {
    await closeFoundationDb()
  } catch {}
  console.error(error?.stack || error?.message || String(error))
  process.exitCode = 1
})
