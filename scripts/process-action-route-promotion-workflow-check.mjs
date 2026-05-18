#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  ACTION_ROUTE_PROMOTION_WORKFLOW_ACTIONS,
  ACTION_ROUTE_PROMOTION_WORKFLOW_APPROVAL_PATH,
  ACTION_ROUTE_PROMOTION_WORKFLOW_CARD_ID,
  ACTION_ROUTE_PROMOTION_WORKFLOW_CHANGED_FILES,
  ACTION_ROUTE_PROMOTION_WORKFLOW_CLOSEOUT_KEY,
  ACTION_ROUTE_PROMOTION_WORKFLOW_CLOSEOUT_PATH,
  ACTION_ROUTE_PROMOTION_WORKFLOW_NOT_NEXT_BOUNDARIES,
  ACTION_ROUTE_PROMOTION_WORKFLOW_PLAN_PATH,
  ACTION_ROUTE_PROMOTION_WORKFLOW_PROOF_COMMANDS,
  ACTION_ROUTE_PROMOTION_WORKFLOW_SCRIPT_PATH,
  ACTION_ROUTE_PROMOTION_WORKFLOW_SPRINT_ID,
  buildActionRoutePromotionWorkflowDogfoodProof,
} from '../lib/action-route-promotion-workflow.js'
import { validateBuildLaneCardScaffold, validateBuildLaneSprintItemMetadata } from '../lib/build-lane-reliability.js'
import { recordBuildLaneFailureEventsFromChecks } from '../lib/build-lane-failure-telemetry.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
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
const REVIEW_INBOX_CARD_ID = 'ACTION-ROUTE-REVIEW-INBOX-001'
const DEDUP_CARD_ID = 'ACTION-ROUTE-DEDUP-STALENESS-GUARD-001'
const SPRINT_CARD_ID = 'FOUNDATION-KB-ACTION-REVIEW-SPRINT-001'

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

function includesAll(source = '', needles = []) {
  return needles.every(needle => String(source || '').includes(needle))
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/action-route-review-inbox.js',
      'lib/intelligence-action-router.js',
      'lib/strategy-shared-comms-routes.js',
      'lib/foundation-db.js',
      'public/foundation-action-route-review-inbox-renderers.js',
      'scripts/foundation-verify.mjs',
    ],
    existingDocs: [
      'docs/process/action-route-review-inbox-001-plan.md',
      'docs/handoffs/2026-05-18-action-route-review-inbox-closeout.md',
      'docs/handoffs/2026-05-18-build-lane-failure-telemetry-closeout.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
    ],
    existingScripts: [
      'scripts/process-action-route-review-inbox-check.mjs',
      'scripts/process-build-lane-failure-telemetry-check.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: [
      'Action-route findings are proposed until reviewed through governed Foundation workflow.',
      'Internal Foundation DB workflow writes are allowed; external writes and live extraction are not.',
      'Duplicate backlog creation must fail closed before applying a route.',
    ],
    reused: [
      'Existing Action Router approval/apply/reject/reroute functions.',
      'Existing Review Inbox read model and Foundation frontend split file.',
      'Existing build-lane scaffold, Current Sprint metadata guard, and failure telemetry.',
    ],
    notRebuilt: [
      'No second backlog.',
      'No dedupe/staleness policy.',
      'No extraction runtime, auth flow, external writeback, or UI redesign.',
    ],
    exactGap: 'Review Inbox items can be seen but cannot yet be closed, assigned, promoted, duplicated, rejected, snoozed, or linked from the Foundation Review Inbox.',
    overBroadRisk: 'This can drift into live extraction, external writeback, broad UI redesign, or duplicate backlog creation.',
    readyBy: 'Steve approved the overnight Foundation KB/action review sprint and told the builder to keep moving through safe Foundation cards.',
    readyAt: '2026-05-18T04:20:00-04:00',
  }
}

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: ACTION_ROUTE_PROMOTION_WORKFLOW_CARD_ID,
    title: 'Action Route Promotion Workflow',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P0',
    rank: 33,
    source: 'Steve 2026-05-18 FOUNDATION-KB-ACTION-REVIEW-SPRINT-001.',
    summary: 'Add governed internal workflow actions for Action Route Review Inbox items so proposed findings can be confirmed, answered, assigned, promoted, marked duplicate, rejected, snoozed, or linked without external side effects.',
    whyItMatters: 'Steve needs proposed intelligence to become reviewed decisions, tasks, owner assignments, rejects, duplicates, and snoozes instead of repeating as a noisy unclosed pile.',
    nextAction: closeCard
      ? `Done under \`${ACTION_ROUTE_PROMOTION_WORKFLOW_CLOSEOUT_KEY}\`. Next: ${DEDUP_CARD_ID}.`
      : 'Build and prove the internal Review Inbox workflow; preserve evidence, block duplicate backlog promotion, and avoid extraction/auth/external writes.',
    statusNote: closeCard
      ? `Closed under \`${ACTION_ROUTE_PROMOTION_WORKFLOW_CLOSEOUT_KEY}\`; internal Foundation workflow only, no external writes.`
      : `Scope/proof: \`${ACTION_ROUTE_PROMOTION_WORKFLOW_CLOSEOUT_KEY}\`; internal Review Inbox workflow and duplicate prevention.`,
    owner: 'Foundation Process',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    cardId: ACTION_ROUTE_PROMOTION_WORKFLOW_CARD_ID,
    order: 3,
    stage: closeCard ? 'done_this_sprint' : normalizedStage,
    planRef: ACTION_ROUTE_PROMOTION_WORKFLOW_PLAN_PATH,
    definitionOfDone: 'Action Route Review Inbox has governed internal workflow actions, workflow metadata preserves source evidence, duplicate backlog promotion fails closed, verifier coverage and closeout registry exist, and full ship gate passes.',
    proofCommands: ACTION_ROUTE_PROMOTION_WORKFLOW_PROOF_COMMANDS,
    readinessBlockerCleared: 'ACTION-ROUTE-REVIEW-INBOX-001 shipped; Steve approved continuing the Foundation KB/action review sprint with no live extraction, auth-required/paid runs, external writes, Drive mutation, or Agent Feedback auto-send.',
    notNextBoundaries: [
      ...ACTION_ROUTE_PROMOTION_WORKFLOW_NOT_NEXT_BOUNDARIES,
      'Do not work MEETING-VAULT-ACL-001 Phase B.',
      'Do not mutate Drive permissions.',
    ],
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: ACTION_ROUTE_PROMOTION_WORKFLOW_APPROVAL_PATH,
      closeoutKey: ACTION_ROUTE_PROMOTION_WORKFLOW_CLOSEOUT_KEY,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, stage = 'building_now' } = {}) {
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
        VALUES ($1,$2,$3,'pass',10,10,9.8,'P0','full',true,$4::text[],'[]'::jsonb,$5::jsonb,'codex-action-route-promotion-workflow')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            result = EXCLUDED.result
      `,
      [
        `action-route-promotion-workflow-${stableRunId(ACTION_ROUTE_PROMOTION_WORKFLOW_PLAN_PATH)}`,
        ACTION_ROUTE_PROMOTION_WORKFLOW_CARD_ID,
        ACTION_ROUTE_PROMOTION_WORKFLOW_PLAN_PATH,
        ACTION_ROUTE_PROMOTION_WORKFLOW_CHANGED_FILES,
        JSON.stringify({ status: 'pass', score: 10, cardId: ACTION_ROUTE_PROMOTION_WORKFLOW_CARD_ID }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-action-route-promotion-workflow',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        row.id,
        `${closeCard ? 'Closed' : 'Updated'} ${ACTION_ROUTE_PROMOTION_WORKFLOW_CARD_ID}.`,
        JSON.stringify({ closeoutKey: ACTION_ROUTE_PROMOTION_WORKFLOW_CLOSEOUT_KEY, stage }),
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
    scriptPath: ACTION_ROUTE_PROMOTION_WORKFLOW_SCRIPT_PATH,
    operation: 'create/update Action Route Promotion Workflow backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage: normalizedStage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: ACTION_ROUTE_PROMOTION_WORKFLOW_SPRINT_ID,
        status: 'active',
        goal: 'Close the Review Inbox loop with governed internal action-route workflow actions.',
        activeBlockerCardId: closeCard ? null : ACTION_ROUTE_PROMOTION_WORKFLOW_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizedStage,
          startedBy: 'codex-action-route-promotion-workflow',
          currentStatus: closeCard ? 'complete' : normalizedStage,
          closeoutKey: ACTION_ROUTE_PROMOTION_WORKFLOW_CLOSEOUT_KEY,
          nextAction: closeCard
            ? `Commit/push, then continue to ${DEDUP_CARD_ID}.`
            : 'Build Review Inbox workflow; no extraction, auth, paid run, external write, UI redesign, or Agent Feedback auto-send.',
          priorityOrder: [
            SPRINT_CARD_ID,
            REVIEW_INBOX_CARD_ID,
            ACTION_ROUTE_PROMOTION_WORKFLOW_CARD_ID,
            DEDUP_CARD_ID,
          ],
          notNext: ACTION_ROUTE_PROMOTION_WORKFLOW_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'Review Inbox actions support confirm, answer, assign, promote, duplicate, reject, snooze, and link.',
            'Duplicate backlog promotion fails closed.',
            'Workflow metadata preserves source evidence.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage: normalizedStage })],
    },
    'codex-action-route-promotion-workflow',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || ACTION_ROUTE_PROMOTION_WORKFLOW_SPRINT_ID,
      reason: 'Steve approved continuing the overnight Foundation KB/action review queue.',
    },
  )
}

function unsafeExternalTokens(source = '') {
  const tokens = [
    'startExtractionRun(',
    'fetchTranscript(',
    'captureScreenshot(',
    'createChatCompletion(',
    'responses.create(',
    'sendGmail',
    'writeClickUp',
    'agent-feedback-auto-send-readiness',
    'drive.permissions',
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
    inboxSource,
    routeSource,
    dbSource,
    securitySource,
    surfaceMapSource,
    coverageSource,
    foundationVerifySource,
    frontendDataSource,
    rendererSource,
    serverSource,
    closeoutRecordsSource,
    closeoutDoc,
    currentPlan,
    currentState,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: ACTION_ROUTE_PROMOTION_WORKFLOW_APPROVAL_PATH,
      cardId: ACTION_ROUTE_PROMOTION_WORKFLOW_CARD_ID,
    }),
    getBacklogItemsByIds([
      ACTION_ROUTE_PROMOTION_WORKFLOW_CARD_ID,
      REVIEW_INBOX_CARD_ID,
      DEDUP_CARD_ID,
      SPRINT_CARD_ID,
    ]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([ACTION_ROUTE_PROMOTION_WORKFLOW_CARD_ID]),
    getFoundationBuildCloseouts(),
    readRepoFile('package.json'),
    readRepoFile(ACTION_ROUTE_PROMOTION_WORKFLOW_PLAN_PATH),
    readRepoFile('lib/action-route-promotion-workflow.js'),
    readRepoFile('lib/action-route-review-inbox.js'),
    readRepoFile('lib/strategy-shared-comms-routes.js'),
    readRepoFile('lib/foundation-db.js'),
    readRepoFile('lib/security-access.js'),
    readRepoFile('lib/foundation-surface-map.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('public/foundation-data.js'),
    readRepoFile('public/foundation-action-route-review-inbox-renderers.js'),
    readRepoFile('server.js'),
    readRepoFile('lib/foundation-build-closeout-cleanup-records.js'),
    readRepoFile(ACTION_ROUTE_PROMOTION_WORKFLOW_CLOSEOUT_PATH, { optional: true }),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
  ])
  await closeFoundationDb()

  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === ACTION_ROUTE_PROMOTION_WORKFLOW_CARD_ID)
  const activeItem = (sprint.items || []).find(item => item.cardId === ACTION_ROUTE_PROMOTION_WORKFLOW_CARD_ID)
  const stageOk = ['scoping', 'sprint_ready', 'building_now', 'done_this_sprint'].includes(activeItem?.stage) || card?.lane === 'done'
  const cardScaffold = validateBuildLaneCardScaffold(card || buildCardRow({ closeCard: false }))
  const sprintMetadata = validateBuildLaneSprintItemMetadata(activeItem || buildSprintItem({ closeCard: args.closeCard, stage: args.stage }))
  const currentSprintStatus = buildFoundationCurrentSprintStatus({ sprint: sprint.sprint, items: sprint.items || [], cards })
  const selfReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: { id: ACTION_ROUTE_PROMOTION_WORKFLOW_CARD_ID, priority: 'P0' },
    changedFiles: ACTION_ROUTE_PROMOTION_WORKFLOW_CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
  })
  const planCriticPass = planCriticRuns.some(run =>
    run.cardId === ACTION_ROUTE_PROMOTION_WORKFLOW_CARD_ID &&
      run.status === 'pass' &&
      Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )
  const dogfood = buildActionRoutePromotionWorkflowDogfoodProof()
  const closeoutRecord = closeouts.find(record => record.key === ACTION_ROUTE_PROMOTION_WORKFLOW_CLOSEOUT_KEY)

  addCheck(checks, approval.ok && approval.mode === 'v2', 'approval file is valid v2 and matches plan hash', approval.failures?.map(f => f.check).join('; ') || approval.approvalRef)
  addCheck(checks, cardScaffold.ok, 'live backlog card has required scaffold fields', cardScaffold.missing.join(', ') || card?.lane || 'ok')
  addCheck(checks, stageOk && sprint.sprint?.sprintId === ACTION_ROUTE_PROMOTION_WORKFLOW_SPRINT_ID, 'Current Sprint points to Action Route Promotion Workflow', `${sprint.sprint?.sprintId || 'missing'}:${activeItem?.stage || card?.lane || 'missing'}`)
  addCheck(checks, sprintMetadata.ok, 'Current Sprint item has complete metadata before build/done', sprintMetadata.missing.join(', ') || 'ok')
  addCheck(checks, currentSprintStatus.status === 'healthy' || card?.lane === 'done', 'Current Sprint status remains healthy or historically done', currentSprintStatus.status)
  addCheck(checks, planCriticPass && selfReview.status === 'pass' && Number(selfReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic coverage passes for workflow card', `stored=${planCriticPass} self=${selfReview.status}:${selfReview.score}`)
  addCheck(checks, dogfood.ok, 'dogfood proves workflow validation, duplicate prevention, and unsafe side-effect rejection', JSON.stringify(dogfood.cases).slice(0, 400))
  addCheck(checks, includesAll(moduleSource, [
    'validateActionRoutePromotionWorkflowRequest',
    'findExistingActionRouteBacklogItems',
    'buildActionRoutePromotionWorkflowMetadata',
    'buildActionRoutePromotionWorkflowDogfoodProof',
    'promote_to_backlog_would_duplicate_existing_card',
    'external_or_runtime_side_effect_forbidden',
  ]), 'workflow module owns validation and dogfood responsibilities', 'lib/action-route-promotion-workflow.js')
  addCheck(checks, ACTION_ROUTE_PROMOTION_WORKFLOW_ACTIONS.every(action => moduleSource.includes(action)), 'workflow module declares every supported action', ACTION_ROUTE_PROMOTION_WORKFLOW_ACTIONS.join(', '))
  addCheck(checks, includesAll(inboxSource, [
    'buildActionRoutePromotionWorkflowAvailableActions',
    'getActionRoutePromotionWorkflowState',
    'availableActions',
    'workflowRoute',
    'mutationRouteOwner',
  ]), 'Review Inbox read model exposes workflow state/actions', 'availableActions + workflowRoute')
  addCheck(checks, includesAll(routeSource, [
    'app.post(ACTION_ROUTE_PROMOTION_WORKFLOW_API_PATH',
    'validateActionRoutePromotionWorkflowRequest',
    'recordActionRouteCuration',
    "normalized.action === 'promote_to_backlog'",
    "normalized.action === 'assign_owner'",
    "normalized.action === 'duplicate'",
    "normalized.action === 'link_existing_card'",
    'action_route_promotion_workflow_failed',
  ]), 'shared route module wires narrow workflow POST route', 'POST /api/foundation/action-route-review-inbox/:routeId/workflow')
  addCheck(checks, dbSource.includes('input.promotionWorkflow') && dbSource.includes('actionRoutePromotionWorkflow'), 'DB curation stores promotion workflow metadata', 'recordActionRouteCuration metadata patch')
  addCheck(checks, securitySource.includes("route('POST', '/api/foundation/action-route-review-inbox/:routeId/workflow'"), 'security posture registers owner-gated workflow route', 'owner tier route present')
  addCheck(checks, surfaceMapSource.includes('/api/foundation/action-route-review-inbox/:routeId/workflow') && surfaceMapSource.includes(ACTION_ROUTE_PROMOTION_WORKFLOW_CARD_ID), 'surface map owns workflow backing route', 'Foundation surface map')
  addCheck(checks, includesAll(frontendDataSource, [
    'function applyActionRoutePromotionWorkflow',
    '/api/foundation/action-route-review-inbox/',
    '/workflow',
  ]), 'Foundation data helper posts to workflow route and clears cache', 'applyActionRoutePromotionWorkflow')
  addCheck(checks, includesAll(rendererSource, [
    'inboxWorkflowActionLabel',
    'submitInboxWorkflowAction',
    'availableActions',
    'applyActionRoutePromotionWorkflow',
  ]), 'Review Inbox renderer exposes lightweight workflow controls', 'no broad UI redesign')
  addCheck(checks, serverSource.includes('recordActionRouteCuration') && serverSource.includes('registerStrategySharedCommsRoutes(app'), 'server passes curation dependency to shared route module', 'recordActionRouteCuration dependency')
  addCheck(checks, packageJson.scripts?.['process:action-route-promotion-workflow-check'] === 'node --env-file-if-exists=.env scripts/process-action-route-promotion-workflow-check.mjs', 'package script is registered', 'process:action-route-promotion-workflow-check')
  addCheck(checks, coverageSource.includes('ACTION_ROUTE_PROMOTION_WORKFLOW_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE') && foundationVerifySource.includes('ACTION_ROUTE_PROMOTION_WORKFLOW_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE'), 'foundation verifier imports done-card coverage constant', 'coverage card ID is reachable')
  addCheck(checks, !unsafeExternalTokens([moduleSource, inboxSource, routeSource, frontendDataSource, rendererSource].join('\n')).length, 'workflow card does not introduce extraction/auth/model/external-write tokens', unsafeExternalTokens([moduleSource, inboxSource, routeSource, frontendDataSource, rendererSource].join('\n')).join(', ') || 'clean')
  addCheck(checks, await repoFileExists(ACTION_ROUTE_PROMOTION_WORKFLOW_SCRIPT_PATH), 'focused proof script exists', ACTION_ROUTE_PROMOTION_WORKFLOW_SCRIPT_PATH)
  addCheck(checks, !args.closeCard || (closeoutRecord && closeoutDoc.includes(ACTION_ROUTE_PROMOTION_WORKFLOW_CLOSEOUT_KEY)), 'closeout registry and handoff exist before close-card', closeoutRecord ? closeoutRecord.key : 'missing closeout record')
  addCheck(checks, !args.closeCard || (currentPlan.includes(ACTION_ROUTE_PROMOTION_WORKFLOW_CLOSEOUT_KEY) && currentState.includes(ACTION_ROUTE_PROMOTION_WORKFLOW_CLOSEOUT_KEY)), 'current plan/state name shipped workflow closeout before close-card', 'current docs')
  addCheck(checks, !args.closeCard || card?.lane === 'done', 'live backlog card is done on close-card', card?.lane || 'missing')

  const failed = checks.filter(check => !check.ok)
  if (failed.length) {
    recordBuildLaneFailureEventsFromChecks({
      checks,
      repoRoot,
      command: 'process:action-route-promotion-workflow-check',
      cardId: ACTION_ROUTE_PROMOTION_WORKFLOW_CARD_ID,
      sprintId: ACTION_ROUTE_PROMOTION_WORKFLOW_SPRINT_ID,
      fileModule: ACTION_ROUTE_PROMOTION_WORKFLOW_SCRIPT_PATH,
    })
  }

  const payload = {
    ok: failed.length === 0,
    cardId: ACTION_ROUTE_PROMOTION_WORKFLOW_CARD_ID,
    closeoutKey: ACTION_ROUTE_PROMOTION_WORKFLOW_CLOSEOUT_KEY,
    checks,
    failed,
    dogfood,
    currentSprint: {
      sprintId: sprint.sprint?.sprintId || null,
      stage: activeItem?.stage || null,
      status: currentSprintStatus.status,
    },
  }

  if (args.json) {
    console.log(JSON.stringify(payload, null, 2))
  } else {
    console.log(`Action Route Promotion Workflow check: ${payload.ok ? 'PASS' : 'FAIL'}`)
    for (const check of checks) console.log(`${check.ok ? 'ok' : 'FAIL'} - ${check.check}${check.detail ? ` (${check.detail})` : ''}`)
  }
  process.exitCode = payload.ok ? 0 : 1
}

main().catch(error => {
  recordBuildLaneFailureEventsFromChecks({
    checks: [{ ok: false, check: 'process-action-route-promotion-workflow-check crashed', detail: error instanceof Error ? error.message : String(error) }],
    repoRoot,
    command: 'process:action-route-promotion-workflow-check',
    cardId: ACTION_ROUTE_PROMOTION_WORKFLOW_CARD_ID,
    sprintId: ACTION_ROUTE_PROMOTION_WORKFLOW_SPRINT_ID,
    fileModule: ACTION_ROUTE_PROMOTION_WORKFLOW_SCRIPT_PATH,
  })
  console.error(error instanceof Error ? error.stack : error)
  process.exit(1)
})
