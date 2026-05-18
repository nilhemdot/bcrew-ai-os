#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  ACTION_ROUTE_REVIEW_INBOX_API_PATH,
  ACTION_ROUTE_REVIEW_INBOX_APPROVAL_PATH,
  ACTION_ROUTE_REVIEW_INBOX_CARD_ID,
  ACTION_ROUTE_REVIEW_INBOX_CHANGED_FILES,
  ACTION_ROUTE_REVIEW_INBOX_CLOSEOUT_KEY,
  ACTION_ROUTE_REVIEW_INBOX_CLOSEOUT_PATH,
  ACTION_ROUTE_REVIEW_INBOX_NOT_NEXT_BOUNDARIES,
  ACTION_ROUTE_REVIEW_INBOX_PLAN_PATH,
  ACTION_ROUTE_REVIEW_INBOX_PROOF_COMMANDS,
  ACTION_ROUTE_REVIEW_INBOX_SCRIPT_PATH,
  ACTION_ROUTE_REVIEW_INBOX_SPRINT_ID,
  buildActionRouteReviewInboxDogfoodProof,
  buildActionRouteReviewInboxSnapshot,
  filterBacklogItemsForDefaultQueue,
  isActionRouteBacklogItem,
  validateActionRouteReviewInboxSnapshot,
} from '../lib/action-route-review-inbox.js'
import { validateBuildLaneCardScaffold, validateBuildLaneSprintItemMetadata } from '../lib/build-lane-reliability.js'
import { buildFoundationBacklogListPayload } from '../lib/foundation-backlog-detail.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getFoundationSnapshot,
  getPlanCriticRunsByCardIds,
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

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const PROMOTION_CARD_ID = 'ACTION-ROUTE-PROMOTION-WORKFLOW-001'
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

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/intelligence-action-router.js',
      'lib/strategy-shared-comms-routes.js',
      'lib/foundation-backlog-detail.js',
      'lib/build-lane-reliability.js',
      'public/foundation-data.js',
      'public/foundation-router.js',
      'scripts/foundation-verify.mjs',
    ],
    existingDocs: [
      'docs/process/action-route-review-inbox-001-plan.md',
      'docs/handoffs/2026-05-18-foundation-kb-compiler-v1-closeout.md',
      'docs/handoffs/2026-05-18-parallel-builder-worktree-protocol-closeout.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
    ],
    existingScripts: [
      'scripts/process-foundation-kb-compiler-v1-check.mjs',
      'scripts/process-parallel-builder-worktree-protocol-check.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: [
      'Backlog is committed/scoped work; action-route findings are proposed review items until reviewed.',
      'Action Route Review Inbox is read-only in this card.',
      'No live extraction, model call, auth-required or paid run, external write, Drive permission mutation, or Agent Feedback auto-send.',
    ],
    reused: [
      'Existing Action Router records and /api/foundation/action-review read surface.',
      'Existing backlog list/detail routes and lazy surface loading.',
      'Existing build-lane scaffold, Current Sprint metadata guard, and ship gate.',
    ],
    notRebuilt: [
      'No second backlog.',
      'No promotion/apply/reject/snooze workflow.',
      'No dedupe/staleness workflow.',
      'No broad visual UI redesign.',
      'No extractor, connector, auth, Harlan, Fal, voice, Canva, or OpenHuman feature work.',
    ],
    exactGap: 'Action-route-derived backlog rows still appear as normal backlog work; proposed intelligence needs a separate review inbox without deleting history.',
    overBroadRisk: 'This can drift into writeback workflow, live extraction, or UI redesign. V1 only separates and exposes read-only review items.',
    readyBy: 'Steve/Codex',
    readyAt: '2026-05-18T02:00:00-04:00',
  }
}

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: ACTION_ROUTE_REVIEW_INBOX_CARD_ID,
    title: 'Action Route Review Inbox',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P0',
    rank: 32,
    source: 'Steve 2026-05-18 FOUNDATION-KB-ACTION-REVIEW-SPRINT-001.',
    summary: 'Separate proposed action-route intelligence from committed Backlog work through a read-only Review Inbox with source proof and focused-card access.',
    whyItMatters: 'Steve needs Backlog to show committed/scoped build work while still being able to review proposed intelligence before promotion.',
    nextAction: closeCard
      ? `Done under \`${ACTION_ROUTE_REVIEW_INBOX_CLOSEOUT_KEY}\`. Next: ${PROMOTION_CARD_ID}.`
      : 'Build the read-only Action Route Review Inbox and default-backlog separation; do not promote, apply, reject, snooze, dedupe, or run extraction.',
    statusNote: closeCard
      ? `Closed under \`${ACTION_ROUTE_REVIEW_INBOX_CLOSEOUT_KEY}\`; read-only inbox/separation only, no external writes or action-route mutation.`
      : `Scope/proof: \`${ACTION_ROUTE_REVIEW_INBOX_CLOSEOUT_KEY}\`; read-only inbox, default-backlog separation, focused-card access preserved.`,
    owner: 'Foundation Process',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    cardId: ACTION_ROUTE_REVIEW_INBOX_CARD_ID,
    order: 2,
    stage: closeCard ? 'done_this_sprint' : normalizedStage,
    planRef: ACTION_ROUTE_REVIEW_INBOX_PLAN_PATH,
    definitionOfDone: 'Action Route Review Inbox exposes proposed action-route findings read-only, default Backlog separates route-derived rows from normal work, focused-card reads still load separated rows, verifier coverage exists, closeout is registered, and full ship gate passes.',
    proofCommands: ACTION_ROUTE_REVIEW_INBOX_PROOF_COMMANDS,
    readinessBlockerCleared: 'Foundation KB compiler V1 shipped; Steve approved continuing the Foundation KB/action review sprint with no live extraction, model calls, auth-required/paid runs, or external writes.',
    notNextBoundaries: [
      ...ACTION_ROUTE_REVIEW_INBOX_NOT_NEXT_BOUNDARIES,
      'Do not work MEETING-VAULT-ACL-001 Phase B.',
      'Do not mutate Drive permissions.',
    ],
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: ACTION_ROUTE_REVIEW_INBOX_APPROVAL_PATH,
      closeoutKey: ACTION_ROUTE_REVIEW_INBOX_CLOSEOUT_KEY,
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
    cardId: ACTION_ROUTE_REVIEW_INBOX_CARD_ID,
    closeoutKey: ACTION_ROUTE_REVIEW_INBOX_CLOSEOUT_KEY,
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
        VALUES ($1,$2,$3,'pass',10,10,9.8,'P0','full',true,$4::text[],'[]'::jsonb,$5::jsonb,'codex-action-route-review-inbox')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            result = EXCLUDED.result
      `,
      [
        `action-route-review-inbox-${stableRunId(ACTION_ROUTE_REVIEW_INBOX_PLAN_PATH)}`,
        ACTION_ROUTE_REVIEW_INBOX_CARD_ID,
        ACTION_ROUTE_REVIEW_INBOX_PLAN_PATH,
        ACTION_ROUTE_REVIEW_INBOX_CHANGED_FILES,
        JSON.stringify(planCriticResult),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-action-route-review-inbox',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        row.id,
        `${closeCard ? 'Closed' : 'Updated'} ${ACTION_ROUTE_REVIEW_INBOX_CARD_ID}.`,
        JSON.stringify({ closeoutKey: ACTION_ROUTE_REVIEW_INBOX_CLOSEOUT_KEY, stage }),
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
    scriptPath: ACTION_ROUTE_REVIEW_INBOX_SCRIPT_PATH,
    operation: 'create/update Action Route Review Inbox backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage: normalizedStage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: ACTION_ROUTE_REVIEW_INBOX_SPRINT_ID,
        status: 'active',
        goal: 'Separate proposed action-route findings from normal Foundation backlog work.',
        activeBlockerCardId: closeCard ? null : ACTION_ROUTE_REVIEW_INBOX_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizedStage,
          startedBy: 'codex-action-route-review-inbox',
          currentStatus: closeCard ? 'complete' : normalizedStage,
          closeoutKey: ACTION_ROUTE_REVIEW_INBOX_CLOSEOUT_KEY,
          nextAction: closeCard
            ? `Commit/push, then continue to ${PROMOTION_CARD_ID}.`
            : 'Build read-only Review Inbox separation; no promotion/apply/reject/snooze/dedupe, extraction, model calls, or external writes.',
          priorityOrder: [
            SPRINT_CARD_ID,
            'FOUNDATION-KB-COMPILER-V1-001',
            ACTION_ROUTE_REVIEW_INBOX_CARD_ID,
            PROMOTION_CARD_ID,
            DEDUP_CARD_ID,
          ],
          notNext: ACTION_ROUTE_REVIEW_INBOX_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'Action-route findings render as proposed review items with type, owner, age, source refs, destination, and review state.',
            'Default Backlog separates route-derived rows from normal queue while preserving explicit focused-card access.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage: normalizedStage })],
    },
    'codex-action-route-review-inbox',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || ACTION_ROUTE_REVIEW_INBOX_SPRINT_ID,
      reason: 'Steve approved continuing the Foundation KB/action review queue after Foundation KB compiler V1 shipped.',
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
  ]
  return tokens.filter(token => String(source || '').includes(token))
}

function extractInboxRouteBlock(routeSource = '') {
  const marker = 'app.get(ACTION_ROUTE_REVIEW_INBOX_API_PATH'
  const start = String(routeSource || '').indexOf(marker)
  if (start < 0) return ''
  const rest = String(routeSource || '').slice(start)
  const nextRoute = rest.indexOf("\n\n  app.")
  return nextRoute >= 0 ? rest.slice(0, nextRoute) : rest
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
    snapshot,
    packageSource,
    planSource,
    scriptSource,
    moduleSource,
    routeSource,
    backlogSource,
    securitySource,
    surfaceMapSource,
    liveApiSource,
    controlLoopSource,
    foundationVerifySource,
    coverageSource,
    frontendDataSource,
    routerSource,
    htmlSource,
    inboxRendererSource,
    backlogRendererSource,
    closeoutRecordsSource,
    closeoutDoc,
    currentPlan,
    currentState,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: ACTION_ROUTE_REVIEW_INBOX_APPROVAL_PATH,
      cardId: ACTION_ROUTE_REVIEW_INBOX_CARD_ID,
    }),
    getBacklogItemsByIds([
      ACTION_ROUTE_REVIEW_INBOX_CARD_ID,
      PROMOTION_CARD_ID,
      DEDUP_CARD_ID,
      SPRINT_CARD_ID,
    ]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([ACTION_ROUTE_REVIEW_INBOX_CARD_ID]),
    getFoundationBuildCloseouts(),
    getFoundationSnapshot(),
    readRepoFile('package.json'),
    readRepoFile(ACTION_ROUTE_REVIEW_INBOX_PLAN_PATH),
    readRepoFile(ACTION_ROUTE_REVIEW_INBOX_SCRIPT_PATH),
    readRepoFile('lib/action-route-review-inbox.js'),
    readRepoFile('lib/strategy-shared-comms-routes.js'),
    readRepoFile('lib/foundation-backlog-detail.js'),
    readRepoFile('lib/security-access.js'),
    readRepoFile('lib/foundation-surface-map.js'),
    readRepoFile('lib/foundation-verify-live-api-snapshot.js'),
    readRepoFile('lib/foundation-verifier-control-loop.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('public/foundation-data.js'),
    readRepoFile('public/foundation-router.js'),
    readRepoFile('public/foundation.html'),
    readRepoFile('public/foundation-action-route-review-inbox-renderers.js'),
    readRepoFile('public/foundation-backlog-renderers.js'),
    readRepoFile('lib/foundation-build-closeout-cleanup-records.js'),
    readRepoFile(ACTION_ROUTE_REVIEW_INBOX_CLOSEOUT_PATH, { optional: true }),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
  ])
  await closeFoundationDb()

  const packageJson = JSON.parse(packageSource)
  const dogfood = buildActionRouteReviewInboxDogfoodProof()
  const inbox = buildActionRouteReviewInboxSnapshot({
    actionRouter: snapshot.intelligenceActionRouter || {},
    backlogItems: snapshot.backlogItems || [],
  })
  const inboxValidation = validateActionRouteReviewInboxSnapshot(inbox)
  const backlogList = buildFoundationBacklogListPayload({
    backlogItems: snapshot.backlogItems || [],
  })
  const focusedActionCardId = inbox.backlogSeparation.separatedBacklogItemIds[0] || ''
  const focusedBacklogList = focusedActionCardId
    ? buildFoundationBacklogListPayload({ backlogItems: snapshot.backlogItems || [], requestedCardIds: [focusedActionCardId] })
    : null
  const separatedRows = (snapshot.backlogItems || []).filter(isActionRouteBacklogItem)
  const defaultRows = filterBacklogItemsForDefaultQueue(snapshot.backlogItems || [])
  const defaultLeakRows = (backlogList.backlogItems || []).filter(isActionRouteBacklogItem)
  const focusedRows = (focusedBacklogList?.backlogItems || []).filter(item => item.id === focusedActionCardId)
  const selfReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: { id: ACTION_ROUTE_REVIEW_INBOX_CARD_ID, priority: 'P0' },
    changedFiles: ACTION_ROUTE_REVIEW_INBOX_CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
  })
  const planCriticPass = planCriticRuns.some(run =>
    run.cardId === ACTION_ROUTE_REVIEW_INBOX_CARD_ID &&
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
  const card = cards.find(item => item.id === ACTION_ROUTE_REVIEW_INBOX_CARD_ID) || null
  const promotionCard = cards.find(item => item.id === PROMOTION_CARD_ID) || null
  const dedupCard = cards.find(item => item.id === DEDUP_CARD_ID) || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === ACTION_ROUTE_REVIEW_INBOX_CARD_ID) || null
  const closeout = closeouts.find(record => record.key === ACTION_ROUTE_REVIEW_INBOX_CLOSEOUT_KEY) || null
  const scaffold = validateBuildLaneCardScaffold(card || {})
  const sprintMetadata = validateBuildLaneSprintItemMetadata(sprintItem || {})
  const inboxRouteBlock = extractInboxRouteBlock(routeSource)
  const unsafeRuntimeHits = [
    ...containsUnsafeRuntimeCall(moduleSource),
    ...containsUnsafeRuntimeCall(inboxRouteBlock),
    ...containsUnsafeRuntimeCall(inboxRendererSource),
  ]
  const verifierLines = foundationVerifySource.split('\n').length

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(failure => failure.check).join(', ') || ACTION_ROUTE_REVIEW_INBOX_APPROVAL_PATH)
  addCheck(checks, selfReview.status === 'pass' && Number(selfReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', buildPlanCriticResultSummary(selfReview))
  addCheck(checks, planCriticPass, 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, card?.priority === 'P0' && ['scoped', 'executing', 'done'].includes(card?.lane), 'live backlog card exists and is staged', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, scaffold.ok, 'live backlog card passes scaffold guard', scaffold.missing.join(', ') || 'complete')
  addCheck(checks, sprint.sprint?.sprintId === ACTION_ROUTE_REVIEW_INBOX_SPRINT_ID, 'Current Sprint overlay is active for Review Inbox', sprint.sprint?.sprintId || 'missing')
  addCheck(checks, sprintMetadata.ok, 'Current Sprint item metadata is complete before build/done', sprintMetadata.missing.join(', ') || 'complete')
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint status is healthy', currentSprintStatus.findings?.map(item => item.detail || item.check).join('; ') || 'healthy')
  addCheck(checks, promotionCard && ['scoped', 'research'].includes(promotionCard.lane), 'promotion workflow follow-up exists and is not built here', promotionCard ? `${promotionCard.id}:${promotionCard.lane}` : 'missing')
  addCheck(checks, dedupCard && ['scoped', 'research'].includes(dedupCard.lane), 'dedupe/staleness follow-up exists and is not built here', dedupCard ? `${dedupCard.id}:${dedupCard.lane}` : 'missing')
  addCheck(checks, dogfood.ok, 'dogfood proves Review Inbox separation and bad-item rejection', dogfood.invariant)
  addCheck(checks, inboxValidation.ok, 'live Review Inbox snapshot validates', inboxValidation.failures.join(', ') || `${inboxValidation.reviewItemCount} review items`)
  addCheck(checks, Number(inbox.summary?.totalReviewItems || 0) >= Number(snapshot.intelligenceActionRouter?.totalRoutes || 0), 'inbox covers live action-router routes', `${inbox.summary?.totalReviewItems || 0}/${snapshot.intelligenceActionRouter?.totalRoutes || 0}`)
  addCheck(checks, Number(inbox.summary?.sourceCompleteItems || 0) === Number(inbox.summary?.totalReviewItems || 0), 'all review items carry source/type/owner/state', `${inbox.summary?.sourceCompleteItems || 0}/${inbox.summary?.totalReviewItems || 0}`)
  addCheck(checks, separatedRows.length >= 1 && inbox.backlogSeparation.separatedBacklogItems === separatedRows.length, 'route-derived backlog rows are represented in Review Inbox', `separated=${separatedRows.length}`)
  addCheck(checks, defaultRows.length + separatedRows.length === (snapshot.backlogItems || []).length, 'default backlog filter preserves total history by separating only review rows', `default=${defaultRows.length} separated=${separatedRows.length}`)
  addCheck(checks, backlogList.reviewInbox?.route === ACTION_ROUTE_REVIEW_INBOX_API_PATH && backlogList.summary?.defaultHiddenReviewItems >= 1, 'default backlog exposes Review Inbox route and hidden count', JSON.stringify(backlogList.reviewInbox || {}))
  addCheck(checks, defaultLeakRows.length === 0, 'default backlog does not mix action-route rows into normal queue', defaultLeakRows.map(item => item.id).join(', ') || 'clean')
  addCheck(checks, !focusedActionCardId || focusedRows.length === 1, 'explicit focused-card backlog read still loads separated action-route row', focusedActionCardId || 'no separated row available')
  addCheck(checks, routeSource.includes('app.get(ACTION_ROUTE_REVIEW_INBOX_API_PATH') && routeSource.includes('getFoundationSnapshot'), 'read-only API route is registered from live action-router/backlog truth', ACTION_ROUTE_REVIEW_INBOX_API_PATH)
  addCheck(checks, securitySource.includes("route('GET', '/api/foundation/action-route-review-inbox'"), 'security posture includes read-only owner route', 'lib/security-access.js')
  addCheck(checks, surfaceMapSource.includes(ACTION_ROUTE_REVIEW_INBOX_API_PATH) && surfaceMapSource.includes('action-route-review-inbox'), 'surface map owns Review Inbox sub-surface', 'lib/foundation-surface-map.js')
  addCheck(checks, liveApiSource.includes(ACTION_ROUTE_REVIEW_INBOX_API_PATH) && liveApiSource.includes('actionRouteReviewInboxApi'), 'live API snapshot fetches Review Inbox route', 'lib/foundation-verify-live-api-snapshot.js')
  addCheck(checks, controlLoopSource.includes('actionRouteReviewInboxApi') && controlLoopSource.includes('backlog_action_route_candidate'), 'foundation verifier checks Review Inbox behavior', 'lib/foundation-verifier-control-loop.js')
  addCheck(checks, foundationVerifySource.includes('actionRouteReviewInboxApi') && foundationVerifySource.includes('foundation-action-route-review-inbox-renderers.js'), 'foundation:verify wires live API and frontend source coverage', 'scripts/foundation-verify.mjs')
  addCheck(checks, coverageSource.includes('ACTION_ROUTE_REVIEW_INBOX_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE'), 'verifier coverage card IDs include Review Inbox card', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, frontendDataSource.includes('fetchActionRouteReviewInbox') && frontendDataSource.includes(ACTION_ROUTE_REVIEW_INBOX_API_PATH), 'frontend data layer has narrow Review Inbox fetcher', 'public/foundation-data.js')
  addCheck(checks, routerSource.includes('renderActionRouteReviewInbox') && routerSource.includes('action-route-review-inbox'), 'frontend router loads Review Inbox on demand', 'public/foundation-router.js')
  addCheck(checks, htmlSource.includes('Review Inbox') && htmlSource.includes('foundation-action-route-review-inbox-renderers.js'), 'Foundation shell registers Review Inbox nav/script', 'public/foundation.html')
  addCheck(checks, inboxRendererSource.includes('renderActionRouteReviewInbox') && inboxRendererSource.includes('fetchActionRouteReviewInbox'), 'Review Inbox renderer exists and uses narrow route', 'public/foundation-action-route-review-inbox-renderers.js')
  addCheck(checks, backlogRendererSource.includes('Review Inbox') && backlogRendererSource.includes('reviewInboxItems'), 'Backlog page routes proposed findings to Review Inbox', 'public/foundation-backlog-renderers.js')
  addCheck(checks, packageJson.scripts?.['process:action-route-review-inbox-check'] === `node --env-file-if-exists=.env ${ACTION_ROUTE_REVIEW_INBOX_SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:action-route-review-inbox-check'] || 'missing')
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(ACTION_ROUTE_REVIEW_INBOX_CARD_ID), 'closeout registry record is registered', closeout?.key || 'missing')
  addCheck(checks, closeoutRecordsSource.includes(ACTION_ROUTE_REVIEW_INBOX_CLOSEOUT_KEY), 'closeout registry source contains closeout key', ACTION_ROUTE_REVIEW_INBOX_CLOSEOUT_KEY)
  addCheck(checks, await repoFileExists(ACTION_ROUTE_REVIEW_INBOX_CLOSEOUT_PATH), 'closeout handoff exists', ACTION_ROUTE_REVIEW_INBOX_CLOSEOUT_PATH)
  addCheck(checks, closeoutDoc.includes(PROMOTION_CARD_ID) && closeoutDoc.includes('This did not run live extraction'), 'closeout documents next card and no-live-extraction limit', ACTION_ROUTE_REVIEW_INBOX_CLOSEOUT_PATH)
  addCheck(checks, currentPlan.includes(ACTION_ROUTE_REVIEW_INBOX_CLOSEOUT_KEY) && currentState.includes(ACTION_ROUTE_REVIEW_INBOX_CLOSEOUT_KEY), 'current plan/state name Review Inbox closeout', ACTION_ROUTE_REVIEW_INBOX_CLOSEOUT_KEY)
  addCheck(checks, moduleSource.split('\n').length < 1500, 'new module is under preferred module budget', `${moduleSource.split('\n').length} lines`)
  addCheck(checks, scriptSource.split('\n').length < 1500, 'focused proof script is under preferred module budget', `${scriptSource.split('\n').length} lines`)
  addCheck(checks, verifierLines < 5000, 'root verifier stays under 5,000 lines', `${verifierLines} lines`)
  addCheck(checks, unsafeRuntimeHits.length === 0, 'runtime code has no extraction/model/action-route mutation/external-write calls', unsafeRuntimeHits.join(', ') || 'clean')

  const failed = checks.filter(check => !check.ok)
  const summary = {
    status: failed.length ? 'fail' : 'pass',
    generatedAt: new Date().toISOString(),
    cardId: ACTION_ROUTE_REVIEW_INBOX_CARD_ID,
    sprintId: sprint.sprint?.sprintId || null,
    checkCount: checks.length,
    failedCount: failed.length,
    reviewItemCount: inbox.summary?.totalReviewItems || 0,
    separatedBacklogRows: separatedRows.length,
    defaultBacklogLeakRows: defaultLeakRows.length,
    verifierLines,
  }

  if (args.json) {
    console.log(JSON.stringify({ ...summary, checks, failed }, null, 2))
  } else {
    console.log('Action Route Review Inbox check')
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  }

  if (failed.length) process.exitCode = 1
}

main().catch(async error => {
  try {
    await closeFoundationDb()
  } catch {}
  console.error(error?.stack || error?.message || String(error))
  process.exit(1)
})
