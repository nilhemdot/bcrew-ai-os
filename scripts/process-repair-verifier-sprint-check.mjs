#!/usr/bin/env node

import fs from 'node:fs/promises'
import process from 'node:process'
import { Pool } from 'pg'
import {
  buildPlanCriticResultSummary,
  evaluatePlanCriticPlan,
  PLAN_CRITIC_MIN_PASS_SCORE,
} from '../lib/process-plan-critic.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  initFoundationDb,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'

const args = new Set(process.argv.slice(2))
const jsonMode = args.has('--json') || args.has('--json=true')
const openSprint = args.has('--open')
const closeProcessRepair = args.has('--close-process-repair')
const closeVerifierIndependence = args.has('--close-verifier-independence')

const PROCESS_SPRINT_ID = 'process-repair-verifier-independence-2026-05-12'
const PROCESS_SPRINT_PLAN_PATH = 'docs/process/process-repair-verifier-independence-2026-05-12-plan.md'
const CONNECTOR_ROUTING_SPRINT_ID = 'connector-routing-truth-2026-05-12'
const CONNECTOR_ROUTING_REPAIR_PLAN_PATH = 'docs/process/connector-routing-truth-process-repair.md'

const CONNECTOR_ROUTING_CARD_IDS = [
  'ATOM-PROMOTION-DIAGNOSE-001',
  'SPRINT-DB-RECONCILE-001',
  'VERIFY-GATE-TIERING-FIX-001',
  'PLAN-CRITIC-LOG-001',
  'SOURCE-CONNECTOR-MATRIX-001',
  'SOURCE-HUB-ROUTING-MATRIX-001',
]

const PROCESS_NOT_NEXT = [
  'Do not start Reply/Watching Loop.',
  'Do not build new external connectors.',
  'Do not mutate Drive permissions or run MEETING-VAULT-ACL-001 Phase B.',
  'Do not hide skipped sprint stages by backdating history.',
  'Do not patch verifier checks with active-sprint escape hatches.',
]

const CARD_PLANS = [
  {
    cardId: 'SPRINT-PROCESS-REPAIR-001',
    priority: 'P0',
    order: 1,
    planRef: 'docs/process/sprint-process-repair-001-plan.md',
    definitionOfDone: 'The six Connector/Routing sprint records have honest after-action doctrine, and the active blocker is not a done card.',
    proofCommands: [
      'npm run process:repair-verifier-sprint-check -- --close-process-repair --json',
      'npm run backlog:hygiene -- --json',
    ],
    readinessBlockerCleared: 'Steve saw Doctrine missing on all six done Connector/Routing sprint cards.',
    changedFiles: [
      'docs/process/sprint-process-repair-001-plan.md',
      'scripts/process-repair-verifier-sprint-check.mjs',
      'lib/foundation-db.js',
    ],
    exactGap: 'Six shipped Connector/Routing cards were done but had missing existing-work doctrine records and a done active blocker.',
    existingCode: ['lib/foundation-db.js', 'lib/foundation-current-sprint.js', 'public/foundation.js'],
    existingScripts: ['scripts/process-repair-verifier-sprint-check.mjs', 'scripts/process-sprint-db-reconcile-check.mjs'],
  },
  {
    cardId: 'VERIFIER-SPRINT-INDEPENDENCE-001',
    priority: 'P0',
    order: 2,
    planRef: 'docs/process/verifier-sprint-independence-001-plan.md',
    definitionOfDone: 'Old sprint verifier checks prove shipped artifacts and closeouts instead of passing because a later sprint is active.',
    proofCommands: [
      'rg -n "connectorRoutingTruthSprintActive \\|\\| expectedSnippets|expectedCardIds.includes\\(currentSprintActiveBlockerCardId\\) \\|\\| connectorRoutingTruthSprintActive" scripts/foundation-verify.mjs',
      'npm run foundation:verify',
    ],
    readinessBlockerCleared: 'The verifier used current sprint state to clear old sprint checks.',
    changedFiles: [
      'docs/process/verifier-sprint-independence-001-plan.md',
      'scripts/foundation-verify.mjs',
    ],
    exactGap: 'Old sprint checks could pass from current active sprint state instead of the old work still existing.',
    existingCode: ['scripts/foundation-verify.mjs', 'lib/foundation-build-log.js', 'lib/foundation-db.js'],
    existingScripts: ['scripts/foundation-verify.mjs'],
  },
  {
    cardId: 'VERIFIER-MODULAR-SPLIT-001',
    priority: 'P0',
    order: 3,
    planRef: 'docs/process/verifier-modular-split-001-plan.md',
    definitionOfDone: 'A verifier module-boundary plan is approved without mixing a broad split into the sprint-process repair.',
    proofCommands: [
      'npm run process:repair-verifier-sprint-check -- --open --json',
    ],
    readinessBlockerCleared: 'foundation:verify has grown into a slow monolith and needs a scoped split plan before implementation.',
    changedFiles: [
      'docs/process/verifier-modular-split-001-plan.md',
    ],
    exactGap: 'The verifier needs module boundaries and runtime targets before another broad verifier refactor starts.',
    existingCode: ['scripts/foundation-verify.mjs'],
    existingScripts: ['scripts/foundation-verify.mjs', 'scripts/process-foundation-ship.mjs'],
  },
  {
    cardId: 'PROCESS-ROOT-VS-PATCH-001',
    priority: 'P1',
    order: 4,
    planRef: 'docs/process/process-root-vs-patch-001-plan.md',
    definitionOfDone: 'Plan Critic has a scoped follow-up to reject symptom-patch plans that do not prove the root invariant.',
    proofCommands: [
      'npm run process:repair-verifier-sprint-check -- --open --json',
      'npm run process:plan-critic-check -- --json=true',
    ],
    readinessBlockerCleared: 'The same process-theatre pattern repeated as active-sprint verifier shortcuts.',
    changedFiles: [
      'docs/process/process-root-vs-patch-001-plan.md',
      'lib/process-plan-critic.js',
      'scripts/process-plan-critic-check.mjs',
    ],
    exactGap: 'Plan Critic does not yet reject plans that add escape conditions instead of proving the claimed invariant.',
    existingCode: ['lib/process-plan-critic.js', 'scripts/process-plan-critic-check.mjs'],
    existingScripts: ['scripts/process-plan-critic-check.mjs'],
  },
]

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function buildExistingWorkCheck(card, overrides = {}) {
  return {
    existingCode: overrides.existingCode || card.existingCode || [],
    existingDocs: overrides.existingDocs || [
      PROCESS_SPRINT_PLAN_PATH,
      card.planRef,
      'docs/rebuild/current-state.md',
      'docs/rebuild/current-plan.md',
    ],
    existingScripts: overrides.existingScripts || card.existingScripts || [],
    existingPolicy: [
      'Scope, plan, review at 9.8, then execute.',
      'Live Backlog is task truth.',
      'Current Sprint is an overlay on live backlog truth, not a second backlog.',
      'After-action doctrine repair must not fake skipped stage history.',
      'Old sprint verifier checks should prove shipped artifacts, not current active sprint state.',
    ],
    reused: [
      'Existing foundation_sprints and foundation_sprint_items overlay tables.',
      'Existing plan_critic_runs table.',
      'Existing backlog lane and closeout records.',
      'Existing dashboard Current Sprint rendering.',
    ],
    notRebuilt: [
      'No Reply Parser or Watching Items.',
      'No new connector implementation.',
      'No Drive ACL mutation.',
      'No Strategy, Marketing, Telegram, Directors, or agent expansion.',
      'No fake backdated sprint history.',
    ],
    exactGap: overrides.exactGap || card.exactGap,
    overBroadRisk: overrides.overBroadRisk || 'The repair can drift into hiding process warnings or broad product work. Keep V1 bounded to the named invariant.',
    readyBy: 'Steve dashboard review + Codex formal sprint repair',
    readyAt: '2026-05-12T18:40:00-04:00',
  }
}

function buildProcessSprintSeed(stageByCard, metadata = {}) {
  const activeCard = CARD_PLANS.find(card => stageByCard[card.cardId] === 'building_now') ||
    CARD_PLANS.find(card => stageByCard[card.cardId] !== 'done_this_sprint') ||
    CARD_PLANS[CARD_PLANS.length - 1]
  return {
    sprint: {
      sprintId: PROCESS_SPRINT_ID,
      status: 'active',
      goal: 'Repair skipped sprint process records, remove verifier active-sprint shortcuts, then scope verifier modularization and Plan Critic root-vs-patch hardening.',
      activeBlockerCardId: activeCard.cardId,
      metadata: {
        overlayOnly: true,
        sprintCommandView: true,
        executiveSummary: 'This is a process repair sprint. It exists because Steve caught real Doctrine missing warnings after the Connector/Routing Truth sprint shipped too fast.',
        currentStatus: metadata.currentStatus || `process_repair_${activeCard.cardId.toLowerCase()}`,
        nextAction: metadata.nextAction || `Finish ${activeCard.cardId} before pulling any product work.`,
        exitCriteria: [
          'All four repair cards have scoped doctrine and Plan Critic pass rows.',
          'The six Connector/Routing cards are repaired as after-action records without fake stage history.',
          'Active blocker is never a done card.',
          'Old sprint verifier checks prove shipped artifacts instead of current sprint state.',
          'Verifier modular split and root-vs-patch Plan Critic hardening are scoped, not hidden inside the immediate repair.',
        ],
        notNextBoundaries: PROCESS_NOT_NEXT,
        ...metadata,
      },
    },
    items: CARD_PLANS.map(card => ({
      cardId: card.cardId,
      order: card.order,
      stage: stageByCard[card.cardId] || 'sprint_ready',
      planRef: card.planRef,
      definitionOfDone: card.definitionOfDone,
      proofCommands: card.proofCommands,
      readinessBlockerCleared: card.readinessBlockerCleared,
      notNextBoundaries: PROCESS_NOT_NEXT,
      existingWorkCheck: buildExistingWorkCheck(card),
      metadata: {
        sprintPlanRef: PROCESS_SPRINT_PLAN_PATH,
        planCriticRunId: `${PROCESS_SPRINT_ID}:${card.cardId}:formal-plan-v1`,
      },
    })),
  }
}

function buildConnectorRoutingClosedSeed() {
  const connectorPlans = {
    'ATOM-PROMOTION-DIAGNOSE-001': {
      exactGap: 'Artifacts and candidates were fresh while intelligence_atoms had zero new rows in seven days.',
      existingCode: ['scripts/intelligence-synthesis-engine-proof.mjs', 'lib/intelligence-atoms.js', 'lib/foundation-db.js'],
      existingScripts: ['scripts/process-atom-promotion-diagnose-check.mjs', 'scripts/intelligence-synthesis-engine-proof.mjs'],
    },
    'SPRINT-DB-RECONCILE-001': {
      exactGap: 'Live foundation_sprints state disagreed with committed Source Once-Over closeout truth.',
      existingCode: ['lib/foundation-current-sprint.js', 'lib/foundation-db.js', 'server.js', 'public/foundation.js'],
      existingScripts: ['scripts/process-sprint-db-reconcile-check.mjs'],
    },
    'VERIFY-GATE-TIERING-FIX-001': {
      exactGap: 'Additive backlog-card seed captures in lib/foundation-db.js still triggered full-gate behavior.',
      existingCode: ['lib/process-verify-gate-tiering.js', 'lib/process-git-hooks.js', 'lib/foundation-db.js'],
      existingScripts: ['scripts/process-verify-gate-tiering-check.mjs'],
    },
    'PLAN-CRITIC-LOG-001': {
      exactGap: 'Plan Critic scoring existed, but pass/revise outcomes were not durable or queryable.',
      existingCode: ['lib/process-plan-critic.js', 'lib/foundation-db.js'],
      existingScripts: ['scripts/process-plan-critic-log-check.mjs', 'scripts/process-plan-critic-check.mjs'],
    },
    'SOURCE-CONNECTOR-MATRIX-001': {
      exactGap: 'Source visibility collapsed contract, connector, extraction, artifact, atom, synthesis, and routing truth into one fuzzy connected label.',
      existingCode: ['lib/source-connector-matrix.js', 'lib/source-contracts.js', 'server.js', 'public/foundation.js'],
      existingScripts: ['scripts/process-source-connector-matrix-check.mjs'],
    },
    'SOURCE-HUB-ROUTING-MATRIX-001': {
      exactGap: 'Source maturity said routed, but did not show which hub could use each source or why routing was blocked.',
      existingCode: ['lib/source-hub-routing-matrix.js', 'lib/source-connector-matrix.js', 'server.js', 'public/foundation.js'],
      existingScripts: ['scripts/process-source-hub-routing-matrix-check.mjs'],
    },
  }
  return {
    sprint: {
      sprintId: CONNECTOR_ROUTING_SPRINT_ID,
      status: 'closed',
      goal: 'Restore atom flow, repair process drift, then make source connector and hub routing truth visible before product work resumes.',
      activeBlockerCardId: 'SOURCE-HUB-ROUTING-MATRIX-001',
      metadata: {
        overlayOnly: true,
        currentStatus: 'closed_with_after_action_doctrine_repair',
        nextAction: 'Closed. Process repair moved to process-repair-verifier-independence-2026-05-12.',
        processRepairCard: 'SPRINT-PROCESS-REPAIR-001',
        afterActionRepair: true,
      },
    },
    items: CONNECTOR_ROUTING_CARD_IDS.map((cardId, index) => {
      const pseudoCard = {
        cardId,
        planRef: CONNECTOR_ROUTING_REPAIR_PLAN_PATH,
        exactGap: connectorPlans[cardId]?.exactGap,
        existingCode: connectorPlans[cardId]?.existingCode || [],
        existingScripts: connectorPlans[cardId]?.existingScripts || [],
      }
      return {
        cardId,
        order: index + 1,
        stage: 'done_this_sprint',
        planRef: CONNECTOR_ROUTING_REPAIR_PLAN_PATH,
        definitionOfDone: 'After-action doctrine repair records the existing work, boundaries, and exact gap behind this shipped truth-sprint card.',
        proofCommands: ['npm run process:repair-verifier-sprint-check -- --close-process-repair --json'],
        readinessBlockerCleared: 'Recorded after Steve caught missing doctrine in the live dashboard.',
        notNextBoundaries: PROCESS_NOT_NEXT,
        existingWorkCheck: buildExistingWorkCheck(pseudoCard, {
          existingDocs: [
            CONNECTOR_ROUTING_REPAIR_PLAN_PATH,
            'docs/process/connector-routing-truth-2026-05-12-plan.md',
            'docs/rebuild/current-state.md',
            'docs/rebuild/current-plan.md',
          ],
          overBroadRisk: 'This after-action record can drift into fake history. It must preserve that the doctrine was repaired after the sprint shipped.',
        }),
        metadata: {
          afterActionRepair: true,
          processRepairCard: 'SPRINT-PROCESS-REPAIR-001',
        },
      }
    }),
  }
}

async function insertPlanCriticRun(pool, card, result) {
  await pool.query(
    `
      INSERT INTO plan_critic_runs (
        run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
        priority, gate_level, full_verify_required, changed_files, findings, result, requested_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::text[],$12::jsonb,$13::jsonb,$14)
      ON CONFLICT (run_id) DO UPDATE
      SET status = EXCLUDED.status,
          score = EXCLUDED.score,
          max_score = EXCLUDED.max_score,
          pass_threshold = EXCLUDED.pass_threshold,
          priority = EXCLUDED.priority,
          gate_level = EXCLUDED.gate_level,
          full_verify_required = EXCLUDED.full_verify_required,
          changed_files = EXCLUDED.changed_files,
          findings = EXCLUDED.findings,
          result = EXCLUDED.result,
          requested_by = EXCLUDED.requested_by
    `,
    [
      `${PROCESS_SPRINT_ID}:${card.cardId}:formal-plan-v1`,
      card.cardId,
      card.planRef,
      result.status,
      result.score,
      result.maxScore,
      result.passThreshold,
      card.priority,
      result.gateDecision?.level || null,
      result.gateDecision?.fullVerifyRequired === true,
      card.changedFiles,
      JSON.stringify(result.findings || []),
      JSON.stringify(result),
      'process-repair-verifier-sprint-check',
    ],
  )
}

async function evaluateAndLogPlans() {
  const pool = createPool()
  const results = []
  try {
    for (const card of CARD_PLANS) {
      const planText = await fs.readFile(card.planRef, 'utf8')
      const result = evaluatePlanCriticPlan({
        planText,
        card: { id: card.cardId, priority: card.priority },
        changedFiles: card.changedFiles,
        declaredRisk: planText,
      })
      await insertPlanCriticRun(pool, card, result)
      assert(result.status === 'pass' && Number(result.score) >= PLAN_CRITIC_MIN_PASS_SCORE, `${card.cardId} Plan Critic failed: ${buildPlanCriticResultSummary(result)}`)
      results.push({ cardId: card.cardId, status: result.status, score: result.score, gate: result.gateDecision?.level || null })
    }
  } finally {
    await pool.end()
  }
  return results
}

async function queryState() {
  const pool = createPool()
  try {
    const planRuns = await pool.query(
      `
        SELECT card_id, status, score, run_id, created_at
        FROM plan_critic_runs
        WHERE card_id = ANY($1::text[])
          AND run_id LIKE $2
        ORDER BY card_id
      `,
      [CARD_PLANS.map(card => card.cardId), `${PROCESS_SPRINT_ID}:%`],
    )
    const connectorItems = await pool.query(
      `
        SELECT backlog_id, stage, plan_ref, existing_work_check
        FROM foundation_sprint_items
        WHERE sprint_id = $1
        ORDER BY sprint_order
      `,
      [CONNECTOR_ROUTING_SPRINT_ID],
    )
    const processEvents = await pool.query(
      `
        SELECT event_type, entity_id, summary, metadata, created_at
        FROM change_events
        WHERE entity_table = 'foundation_sprints'
          AND entity_id = $1
        ORDER BY created_at DESC
        LIMIT 10
      `,
      [PROCESS_SPRINT_ID],
    )
    return {
      planRuns: planRuns.rows,
      connectorItems: connectorItems.rows,
      processEvents: processEvents.rows,
    }
  } finally {
    await pool.end()
  }
}

function missingDoctrineFields(existingWorkCheck = {}) {
  const required = [
    'existingCode',
    'existingDocs',
    'existingScripts',
    'existingPolicy',
    'reused',
    'notRebuilt',
    'exactGap',
    'overBroadRisk',
    'readyBy',
    'readyAt',
  ]
  return required.filter(field => {
    const value = existingWorkCheck[field]
    return Array.isArray(value) ? value.length === 0 : !value
  })
}

async function openFormalSprint() {
  await initFoundationDb()
  for (const card of CARD_PLANS) {
    await updateBacklogItem(card.cardId, {
      lane: 'scoped',
      nextAction: `Scoped under ${PROCESS_SPRINT_ID}. Run Plan Critic and stage progression before build.`,
      statusNote: `Scoped on 2026-05-12 under ${PROCESS_SPRINT_ID}. This repair sprint was opened after Steve caught that the previous repair had started before formal sprint process. Plan ref: ${card.planRef}.`,
    }, 'codex')
  }
  await upsertFoundationCurrentSprintOverlay(buildProcessSprintSeed(
    Object.fromEntries(CARD_PLANS.map(card => [card.cardId, 'scoping'])),
    {
      currentStatus: 'scoping_process_repair_verifier_independence',
      nextAction: 'Score all four plans with Plan Critic before build starts.',
      stageProgression: 'scoping',
    },
  ), 'codex')

  const planResults = await evaluateAndLogPlans()

  await upsertFoundationCurrentSprintOverlay(buildProcessSprintSeed(
    Object.fromEntries(CARD_PLANS.map(card => [card.cardId, 'sprint_ready'])),
    {
      currentStatus: 'sprint_ready_process_repair_verifier_independence',
      nextAction: 'Move SPRINT-PROCESS-REPAIR-001 to Building Now and repair records under that card.',
      stageProgression: 'sprint_ready',
    },
  ), 'codex')

  await updateBacklogItem('SPRINT-PROCESS-REPAIR-001', {
    lane: 'executing',
    nextAction: 'Building now. Repair the six Connector/Routing sprint doctrine records without fake stage history, then move active blocker to VERIFIER-SPRINT-INDEPENDENCE-001.',
    statusNote: `Building Now on 2026-05-12 under ${PROCESS_SPRINT_ID}. Scoped doctrine exists, Plan Critic pass row is logged, and this card owns the honest after-action repair.`,
  }, 'codex')

  await upsertFoundationCurrentSprintOverlay(buildProcessSprintSeed({
    'SPRINT-PROCESS-REPAIR-001': 'building_now',
    'VERIFIER-SPRINT-INDEPENDENCE-001': 'sprint_ready',
    'VERIFIER-MODULAR-SPLIT-001': 'sprint_ready',
    'PROCESS-ROOT-VS-PATCH-001': 'sprint_ready',
  }, {
    currentStatus: 'sprint_process_repair_building_now',
    nextAction: 'Repair Connector/Routing doctrine records next; do not pull product work.',
    stageProgression: 'building_now',
  }), 'codex')
  return planResults
}

async function closeSprintProcessRepair() {
  await initFoundationDb()
  await upsertFoundationCurrentSprintOverlay(buildConnectorRoutingClosedSeed(), 'codex')
  await updateBacklogItem('SPRINT-PROCESS-REPAIR-001', {
    lane: 'done',
    nextAction: 'Done for v1. Continue with VERIFIER-SPRINT-INDEPENDENCE-001 before product work resumes.',
    statusNote: 'Closed on 2026-05-12 under `connector-routing-process-repair-v1`. Repaired the Connector/Routing sprint records without faking skipped stages: all six shipped cards keep done_this_sprint state, each points to docs/process/connector-routing-truth-process-repair.md with complete existing_work_check doctrine fields, and the active sprint moved to the formal Process Repair + Verifier Independence sprint. Proof: npm run process:repair-verifier-sprint-check -- --close-process-repair --json.',
  }, 'codex')
  await updateBacklogItem('VERIFIER-SPRINT-INDEPENDENCE-001', {
    lane: 'executing',
    nextAction: 'Building now. Remove verifier active-sprint escape hatches and prove old sprint checks from closeouts/artifacts.',
    statusNote: `Building Now on 2026-05-12 under ${PROCESS_SPRINT_ID}. Scoped doctrine exists and Plan Critic pass row is logged. This card must close before product work resumes.`,
  }, 'codex')
  await upsertFoundationCurrentSprintOverlay(buildProcessSprintSeed({
    'SPRINT-PROCESS-REPAIR-001': 'done_this_sprint',
    'VERIFIER-SPRINT-INDEPENDENCE-001': 'building_now',
    'VERIFIER-MODULAR-SPLIT-001': 'sprint_ready',
    'PROCESS-ROOT-VS-PATCH-001': 'sprint_ready',
  }, {
    currentStatus: 'process_doctrine_repaired_verifier_independence_building_now',
    nextAction: 'Finish VERIFIER-SPRINT-INDEPENDENCE-001 before product work resumes.',
    stageProgression: 'process_repair_done',
  }), 'codex')
}

async function closeVerifierSprintIndependence() {
  await initFoundationDb()
  await updateBacklogItem('VERIFIER-SPRINT-INDEPENDENCE-001', {
    lane: 'done',
    nextAction: 'Done for v1. Continue with VERIFIER-MODULAR-SPLIT-001 before product work resumes.',
    statusNote: 'Closed on 2026-05-12 under `verifier-sprint-independence-v1`. V1 removes the Connector/Routing active-sprint shortcut from foundation verification, makes old sprint checks rely on done backlog cards plus verified closeouts/artifacts, and keeps current-active-blocker assertions scoped to the active sprint. Proof: grep for the old shortcut returns no matches and `npm run foundation:verify` passed 266/266.',
  }, 'codex')
  await updateBacklogItem('VERIFIER-MODULAR-SPLIT-001', {
    lane: 'executing',
    nextAction: 'Building now. Turn the scoped module-boundary plan into the smallest verifier split proof boundary without weakening full verify.',
    statusNote: `Building Now on 2026-05-12 under ${PROCESS_SPRINT_ID}. Scoped doctrine exists and Plan Critic pass row is logged. Keep this card to module-boundary proof; do not hide a broad verifier rewrite inside it.`,
  }, 'codex')
  await upsertFoundationCurrentSprintOverlay(buildProcessSprintSeed({
    'SPRINT-PROCESS-REPAIR-001': 'done_this_sprint',
    'VERIFIER-SPRINT-INDEPENDENCE-001': 'done_this_sprint',
    'VERIFIER-MODULAR-SPLIT-001': 'building_now',
    'PROCESS-ROOT-VS-PATCH-001': 'sprint_ready',
  }, {
    currentStatus: 'verifier_independence_done_modular_split_building_now',
    nextAction: 'Finish VERIFIER-MODULAR-SPLIT-001 before product work resumes.',
    stageProgression: 'verifier_independence_done',
  }), 'codex')
}

async function main() {
  let planResults = []
  if (openSprint) planResults = await openFormalSprint()
  if (closeProcessRepair) await closeSprintProcessRepair()
  if (closeVerifierIndependence) await closeVerifierSprintIndependence()

  const [activeSprint, cards, state] = await Promise.all([
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds(CARD_PLANS.map(card => card.cardId)),
    queryState(),
  ])
  await closeFoundationDb()

  assert(activeSprint.sprint?.sprintId === PROCESS_SPRINT_ID, `Active sprint should be ${PROCESS_SPRINT_ID}.`)
  const stageMap = new Map((activeSprint.items || []).map(item => [item.cardId, item.stage]))
  for (const card of CARD_PLANS) {
    const item = (activeSprint.items || []).find(sprintItem => sprintItem.cardId === card.cardId)
    assert(item, `${card.cardId} missing from active process sprint.`)
    assert(item.planRef === card.planRef, `${card.cardId} planRef missing.`)
    assert(missingDoctrineFields(item.existingWorkCheck || {}).length === 0, `${card.cardId} active sprint doctrine fields missing.`)
    assert(state.planRuns.some(run => run.card_id === card.cardId && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), `${card.cardId} missing Plan Critic pass row.`)
  }
  const cardsById = new Map(cards.map(card => [card.id, card]))
  assert(['building_now', 'done_this_sprint'].includes(stageMap.get('SPRINT-PROCESS-REPAIR-001')), 'SPRINT-PROCESS-REPAIR-001 should be building or done after formal open.')
  if (stageMap.get('SPRINT-PROCESS-REPAIR-001') === 'done_this_sprint') {
    const verifierDone = stageMap.get('VERIFIER-SPRINT-INDEPENDENCE-001') === 'done_this_sprint'
    const expectedActiveBlocker = verifierDone ? 'VERIFIER-MODULAR-SPLIT-001' : 'VERIFIER-SPRINT-INDEPENDENCE-001'
    assert(activeSprint.sprint?.activeBlockerCardId === expectedActiveBlocker, `Active blocker should be ${expectedActiveBlocker}.`)
    if (verifierDone) {
      assert(cardsById.get('VERIFIER-SPRINT-INDEPENDENCE-001')?.lane === 'done', 'VERIFIER-SPRINT-INDEPENDENCE-001 should be done after close.')
      assert(stageMap.get('VERIFIER-MODULAR-SPLIT-001') === 'building_now', 'VERIFIER-MODULAR-SPLIT-001 should be Building Now after verifier independence closes.')
      assert(cardsById.get('VERIFIER-MODULAR-SPLIT-001')?.lane === 'executing', 'VERIFIER-MODULAR-SPLIT-001 should be executing after verifier independence closes.')
    }
    for (const row of state.connectorItems) {
      assert(CONNECTOR_ROUTING_CARD_IDS.includes(row.backlog_id), `${row.backlog_id} is not an expected Connector/Routing card.`)
      assert(row.stage === 'done_this_sprint', `${row.backlog_id} should remain done_this_sprint.`)
      assert(row.plan_ref === CONNECTOR_ROUTING_REPAIR_PLAN_PATH, `${row.backlog_id} should point at the repair doctrine doc.`)
      assert(missingDoctrineFields(row.existing_work_check || {}).length === 0, `${row.backlog_id} repaired doctrine fields missing.`)
    }
    assert(state.connectorItems.length === CONNECTOR_ROUTING_CARD_IDS.length, 'Connector/Routing closed sprint should have exactly six repaired items.')
  } else {
    assert(activeSprint.sprint?.activeBlockerCardId === 'SPRINT-PROCESS-REPAIR-001', 'Active blocker should be SPRINT-PROCESS-REPAIR-001 while repair is building.')
  }

  const report = {
    ok: true,
    sprintId: PROCESS_SPRINT_ID,
    activeBlockerCardId: activeSprint.sprint?.activeBlockerCardId,
    activeItems: activeSprint.items.map(item => ({
      cardId: item.cardId,
      stage: item.stage,
      planRef: item.planRef,
      doctrineMissing: missingDoctrineFields(item.existingWorkCheck || {}),
    })),
    backlogCards: cards.map(card => ({ id: card.id, lane: card.lane, nextAction: card.nextAction })),
    planResults,
    planRuns: state.planRuns.map(row => ({
      cardId: row.card_id,
      status: row.status,
      score: Number(row.score),
      runId: row.run_id,
      createdAt: row.created_at,
    })),
    connectorRoutingRepair: state.connectorItems.map(row => ({
      cardId: row.backlog_id,
      stage: row.stage,
      planRef: row.plan_ref,
      missingDoctrineFields: missingDoctrineFields(row.existing_work_check || {}),
    })),
    processEvents: state.processEvents,
  }
  if (jsonMode) console.log(JSON.stringify(report, null, 2))
  else {
    console.log('PROCESS-REPAIR-VERIFIER-SPRINT OK')
    console.log(`active blocker=${report.activeBlockerCardId}`)
  }
}

main().catch(async error => {
  try { await closeFoundationDb() } catch {}
  const report = { ok: false, error: error.message }
  if (jsonMode) console.log(JSON.stringify(report, null, 2))
  else console.error(error)
  process.exitCode = 1
})
