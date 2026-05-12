#!/usr/bin/env node

import {
  buildFoundationSourceOnceOverSprintSeed,
} from '../lib/foundation-current-sprint.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  initFoundationDb,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
import { Pool } from 'pg'

const args = new Set(process.argv.slice(2))
const jsonMode = args.has('--json') || args.has('--json=true')
const SOURCE_ONCE_OVER_SPRINT_ID = 'foundation-source-once-over-2026-05-12'
const CONNECTOR_ROUTING_SPRINT_ID = 'connector-routing-truth-2026-05-12'
const SOURCE_HUB_ROUTING_MATRIX_CARD_ID = 'SOURCE-HUB-ROUTING-MATRIX-001'
const CONNECTOR_ROUTING_NOT_NEXT_BOUNDARIES = [
  'Do not start Reply/Watching Loop until atom flow and matrices are honest.',
  'Do not build new external connectors while the matrix cards are exposing truth only.',
  'Do not claim connected when artifacts, candidates, atoms, synthesis, and routing are not visible together.',
  'Do not run MEETING-VAULT-ACL-001 Phase B, mutate Drive permissions, or send request-access email during this truth sprint.',
]
const SOURCE_ONCE_OVER_CARD_IDS = [
  'SOURCE-MATURITY-GRID-001',
  'SOURCE-EXTRACTION-COVERAGE-001',
  'SOURCE-COVERAGE-CLOSEOUT-001',
  'MARKETING-SOURCE-MAP-001',
  'BRAND-STACK-001',
  'TIER-BEHAVIORAL-COMPLETION-001',
  'VERIFICATION-RUNS-001',
  'PER-USER-CHANGELOG-001',
  'DECISION-RESTRICTED-QUEUE-001',
  'FOUNDATION-UI-COMPLETE-001',
]
const ACTIVE_SPRINT_ITEMS = [
  {
    cardId: 'ATOM-PROMOTION-DIAGNOSE-001',
    order: 1,
    stage: 'done_this_sprint',
    definitionOfDone: 'The artifact-to-atom pipe is diagnosed and the scheduled synthesis refresh creates fresh intelligence_atoms when recent candidates exist.',
    proofCommands: [
      'npm run intelligence:synthesis-refresh',
      'npm run process:atom-promotion-diagnose-check -- --json',
    ],
    readinessBlockerCleared: 'Recent artifacts and candidates were flowing while intelligence_atoms had zero new rows in seven days.',
    metadata: { closeoutKey: 'atom-promotion-diagnose-v1' },
  },
  {
    cardId: 'SPRINT-DB-RECONCILE-001',
    order: 2,
    stage: 'done_this_sprint',
    definitionOfDone: 'Live foundation_sprints state matches the committed Source Once-Over closeout and the active sprint is the Connector + Routing Truth sprint.',
    proofCommands: [
      'npm run process:sprint-db-reconcile-check -- --json',
    ],
    readinessBlockerCleared: 'The live DB still showed MARKETING-SOURCE-MAP-001 building after the committed sprint closeout.',
    metadata: { closeoutKey: 'sprint-db-reconcile-v1' },
  },
  {
    cardId: 'VERIFY-GATE-TIERING-FIX-001',
    order: 3,
    stage: 'building_now',
    definitionOfDone: 'Backlog-card-only seed edits in lib/foundation-db.js use focused verification while schema/function/substrate edits still require the full gate.',
    proofCommands: [
      'npm run process:verify-gate-tiering-check -- --json=true',
      'npm run backlog:hygiene -- --json',
    ],
    readinessBlockerCleared: 'VERIFY-GATE-TIERING-001 regressed immediately on a scoped backlog capture.',
    metadata: { closeoutKey: 'verify-gate-tiering-fix-v1' },
  },
  {
    cardId: 'PLAN-CRITIC-LOG-001',
    order: 4,
    stage: 'sprint_ready',
    definitionOfDone: 'Plan Critic writes durable run logs for scored and rejected plans so dogfood behavior is queryable.',
    proofCommands: [
      'npm run process:plan-critic-log-check -- --json',
      'npm run process:plan-critic-check -- --json=true',
    ],
    readinessBlockerCleared: 'Plan Critic had synthetic proof but no durable record proving it actually critiqued recent plans.',
    metadata: { closeoutKey: 'plan-critic-log-v1' },
  },
  {
    cardId: 'SOURCE-CONNECTOR-MATRIX-001',
    order: 5,
    stage: 'sprint_ready',
    definitionOfDone: 'The Source Lifecycle surface exposes old-system connector coverage by brand lane and pillar, including atom-flow columns and missing connector rows.',
    proofCommands: [
      'npm run process:source-connector-matrix-check -- --json',
      'npm run backlog:hygiene -- --json',
    ],
    readinessBlockerCleared: 'Foundation cannot call sources connected until connector, extraction, artifact, candidate, atom, synthesis, and routing state are visible together.',
    metadata: { closeoutKey: 'source-connector-matrix-v1' },
  },
  {
    cardId: 'SOURCE-HUB-ROUTING-MATRIX-001',
    order: 6,
    stage: 'sprint_ready',
    definitionOfDone: 'The Source Lifecycle surface answers routed-to-where with many-to-many hub states: route, candidate, blocked, n/a, and unknown.',
    proofCommands: [
      'npm run process:source-hub-routing-matrix-check -- --json',
      'npm run backlog:hygiene -- --json',
    ],
    readinessBlockerCleared: 'The source maturity grid said routed without exposing the destination hub or reuse boundary.',
    metadata: { closeoutKey: 'source-hub-routing-matrix-v1' },
  },
]
const CONNECTOR_TRUTH_SPRINT_CARD_IDS = ACTIVE_SPRINT_ITEMS.map(item => item.cardId)

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

function buildClosedSourceOnceOverSeed() {
  const seed = buildFoundationSourceOnceOverSprintSeed({
    sourceMaturityStage: 'done_this_sprint',
    sourceExtractionCoverageStage: 'done_this_sprint',
    sourceCoverageCloseoutStage: 'done_this_sprint',
    marketingSourceMapStage: 'done_this_sprint',
    brandStackStage: 'done_this_sprint',
    tierBehavioralCompletionStage: 'done_this_sprint',
    verificationRunsStage: 'done_this_sprint',
    perUserChangelogStage: 'done_this_sprint',
    decisionRestrictedQueueStage: 'done_this_sprint',
    foundationUiCompleteStage: 'done_this_sprint',
  })
  return {
    ...seed,
    sprint: {
      ...seed.sprint,
      status: 'closed',
      activeBlockerCardId: 'FOUNDATION-UI-COMPLETE-001',
      metadata: {
        ...seed.sprint.metadata,
        currentStatus: 'source_once_over_closed',
        nextAction: 'Closed. Active work moved to connector-routing-truth-2026-05-12.',
        closeoutKey: 'foundation-source-once-over-v1',
      },
    },
  }
}

function buildConnectorRoutingSprintSeed({ doneCardIds = new Set() } = {}) {
  let openAssigned = false
  const items = ACTIVE_SPRINT_ITEMS.map(item => {
    const itemWithBoundaries = {
      ...item,
      notNextBoundaries: CONNECTOR_ROUTING_NOT_NEXT_BOUNDARIES,
    }
    if (doneCardIds.has(item.cardId)) return { ...itemWithBoundaries, stage: 'done_this_sprint' }
    if (!openAssigned) {
      openAssigned = true
      return { ...itemWithBoundaries, stage: 'building_now' }
    }
    return { ...itemWithBoundaries, stage: 'sprint_ready' }
  })
  const nextOpenItem = items.find(item => item.stage !== 'done_this_sprint') || items[items.length - 1]
  return {
    sprint: {
      sprintId: CONNECTOR_ROUTING_SPRINT_ID,
      status: 'active',
      goal: 'Restore atom flow, repair process drift, then make source connector and hub routing truth visible before product work resumes.',
      activeBlockerCardId: nextOpenItem.cardId,
      metadata: {
        overlayOnly: true,
        sprintCommandView: true,
        executiveSummary: 'This sprint is a truth sprint, not a product sprint. It fixes atom promotion, reconciles live sprint state, repairs the gate/Plan Critic process drift, then populates connector and routing matrices.',
        currentStatus: nextOpenItem.cardId === SOURCE_HUB_ROUTING_MATRIX_CARD_ID || doneCardIds.has(SOURCE_HUB_ROUTING_MATRIX_CARD_ID)
          ? 'connector_routing_truth_sprint_done_review_next'
          : `next_${nextOpenItem.cardId.toLowerCase()}`,
        nextAction: doneCardIds.has(SOURCE_HUB_ROUTING_MATRIX_CARD_ID)
          ? 'Run sprint review/rollover on the connector and hub routing matrices before pulling Reply/Watching Loop or source-gap implementation.'
          : `Finish ${nextOpenItem.cardId} before pulling later sprint work.`,
        exitCriteria: [
          'Recent artifacts/candidates produce fresh intelligence_atoms.',
          'Live sprint DB agrees with committed sprint closeout truth.',
          'Backlog-card captures use focused verification; substrate edits stay full-gate.',
          'Plan Critic scores/rejections are logged durably.',
          'Connector matrix exposes missing/broken/connected source truth with atom-flow columns.',
          'Hub routing matrix answers routed-to-where for source and atom classes.',
        ],
        notNextBoundaries: [
          ...CONNECTOR_ROUTING_NOT_NEXT_BOUNDARIES,
        ],
      },
    },
    items,
  }
}

async function main() {
  await initFoundationDb()
  await updateBacklogItem('ATOM-PROMOTION-DIAGNOSE-001', {
    lane: 'done',
    nextAction: 'Done for v1. Keep atom-flow proof green before expanding source work.',
    statusNote: 'Closed on 2026-05-12 under `atom-promotion-diagnose-v1`. Proof: `npm run intelligence:synthesis-refresh` promoted fresh candidates and `npm run process:atom-promotion-diagnose-check -- --json` reported fresh atoms in the last seven days.',
  }, 'codex')
  await updateBacklogItem('SPRINT-DB-RECONCILE-001', {
    lane: 'done',
    nextAction: 'Done for v1. Keep Source Once-Over closed and current sprint state governed through process checks.',
    statusNote: 'Closed on 2026-05-12 under `sprint-db-reconcile-v1`. Proof: `npm run process:sprint-db-reconcile-check -- --json` closed Source Once-Over in live DB and activated `connector-routing-truth-2026-05-12`.',
  }, 'codex')
  const cards = await getBacklogItemsByIds([
    'ATOM-PROMOTION-DIAGNOSE-001',
    'SPRINT-DB-RECONCILE-001',
    'VERIFY-GATE-TIERING-FIX-001',
    'PLAN-CRITIC-LOG-001',
    'SOURCE-CONNECTOR-MATRIX-001',
    'SOURCE-HUB-ROUTING-MATRIX-001',
  ])
  const doneCardIds = new Set(cards.filter(card => card.lane === 'done').map(card => card.id))
  doneCardIds.add('ATOM-PROMOTION-DIAGNOSE-001')
  doneCardIds.add('SPRINT-DB-RECONCILE-001')
  await upsertFoundationCurrentSprintOverlay(buildClosedSourceOnceOverSeed(), 'codex')
  await upsertFoundationCurrentSprintOverlay(buildConnectorRoutingSprintSeed({ doneCardIds }), 'codex')

  const activeSprint = await getActiveFoundationCurrentSprint()
  await closeFoundationDb()

  const pool = createPool()
  const closedSprintResult = await pool.query(
    `
      SELECT sprint_id, status, active_blocker_card_id, closed_at, metadata
      FROM foundation_sprints
      WHERE sprint_id = $1
      LIMIT 1
    `,
    [SOURCE_ONCE_OVER_SPRINT_ID],
  )
  const closedSprintItemsResult = await pool.query(
    `
      SELECT backlog_id, stage
      FROM foundation_sprint_items
      WHERE sprint_id = $1
      ORDER BY sprint_order ASC
    `,
    [SOURCE_ONCE_OVER_SPRINT_ID],
  )
  await pool.end()

  assert(activeSprint.sprint?.sprintId === CONNECTOR_ROUTING_SPRINT_ID, `Active sprint should be ${CONNECTOR_ROUTING_SPRINT_ID}.`)
  assert(CONNECTOR_TRUTH_SPRINT_CARD_IDS.includes(activeSprint.sprint?.activeBlockerCardId), 'Active sprint should point at a Connector + Routing Truth sprint card.')
  const activeStageMap = new Map(activeSprint.items.map(item => [item.cardId, item.stage]))
  assert(activeStageMap.get('ATOM-PROMOTION-DIAGNOSE-001') === 'done_this_sprint', 'Atom promotion card should be done in active sprint.')
  assert(activeStageMap.get('SPRINT-DB-RECONCILE-001') === 'done_this_sprint', 'Sprint DB reconcile card should be done in active sprint.')
  assert(['building_now', 'done_this_sprint'].includes(activeStageMap.get('VERIFY-GATE-TIERING-FIX-001')), 'Gate fix should be building-now or done if later proof already closed it.')
  assert(activeSprint.items.length === ACTIVE_SPRINT_ITEMS.length, 'Active Connector + Routing Truth sprint item count drifted.')
  const cardMap = new Map(cards.map(card => [card.id, card]))
  assert(cardMap.get('ATOM-PROMOTION-DIAGNOSE-001')?.lane === 'done', 'Atom promotion backlog card should be done.')
  assert(cardMap.get('SPRINT-DB-RECONCILE-001')?.lane === 'done', 'Sprint DB reconcile backlog card should be done.')
  const closedSprint = closedSprintResult.rows[0] || null
  assert(closedSprint?.status === 'closed', 'Source Once-Over sprint should be closed in live DB.')
  const closedStageMap = new Map(closedSprintItemsResult.rows.map(item => [item.backlog_id, item.stage]))
  for (const cardId of SOURCE_ONCE_OVER_CARD_IDS) {
    assert(closedStageMap.get(cardId) === 'done_this_sprint', `${cardId} should be done_this_sprint in the closed Source Once-Over sprint.`)
  }

  const report = {
    ok: true,
    card: 'SPRINT-DB-RECONCILE-001',
    closedSprintId: SOURCE_ONCE_OVER_SPRINT_ID,
    activeSprint: activeSprint.sprint,
    activeItems: activeSprint.items.map(item => ({
      cardId: item.cardId,
      stage: item.stage,
      order: item.order,
    })),
    closedSprint,
    sourceOnceOverClosedItems: closedSprintItemsResult.rows,
  }

  if (jsonMode) console.log(JSON.stringify(report, null, 2))
  else {
    console.log('SPRINT-DB-RECONCILE-001 OK')
    console.log(`active sprint=${activeSprint.sprint.sprintId} blocker=${activeSprint.sprint.activeBlockerCardId}`)
  }
}

main().catch(async error => {
  try { await closeFoundationDb() } catch {}
  if (jsonMode) console.log(JSON.stringify({ ok: false, card: 'SPRINT-DB-RECONCILE-001', error: error.message }, null, 2))
  else console.error(error)
  process.exitCode = 1
})
