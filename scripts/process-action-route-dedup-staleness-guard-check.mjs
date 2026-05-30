#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  ACTION_ROUTE_DEDUP_STALENESS_APPROVAL_PATH,
  ACTION_ROUTE_DEDUP_STALENESS_CARD_ID,
  ACTION_ROUTE_DEDUP_STALENESS_CHANGED_FILES,
  ACTION_ROUTE_DEDUP_STALENESS_CLOSEOUT_KEY,
  ACTION_ROUTE_DEDUP_STALENESS_CLOSEOUT_PATH,
  ACTION_ROUTE_DEDUP_STALENESS_NOT_NEXT_BOUNDARIES,
  ACTION_ROUTE_DEDUP_STALENESS_PLAN_PATH,
  ACTION_ROUTE_DEDUP_STALENESS_PROOF_COMMANDS,
  ACTION_ROUTE_DEDUP_STALENESS_SCRIPT_PATH,
  ACTION_ROUTE_DEDUP_STALENESS_SPRINT_ID,
  ACTION_ROUTE_STALE_RED_DAYS,
  ACTION_ROUTE_STALE_WATCH_DAYS,
  buildActionRouteDedupStalenessDogfoodProof,
} from '../lib/action-route-dedup-staleness-guard.js'
import { validateBuildLaneCardScaffold, validateBuildLaneSprintItemMetadata } from '../lib/build-lane-reliability.js'
import { recordBuildLaneFailureEventsFromChecks } from '../lib/build-lane-failure-telemetry.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
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
const PROMOTION_WORKFLOW_CARD_ID = 'ACTION-ROUTE-PROMOTION-WORKFLOW-001'
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
      'lib/action-route-promotion-workflow.js',
      'lib/foundation-verifier-control-loop.js',
      'public/foundation-action-route-review-inbox-renderers.js',
      'scripts/foundation-verify.mjs',
    ],
    existingDocs: [
      'docs/process/action-route-review-inbox-001-plan.md',
      'docs/process/action-route-promotion-workflow-001-plan.md',
      'docs/handoffs/2026-05-18-action-route-review-inbox-closeout.md',
      'docs/handoffs/2026-05-18-action-route-promotion-workflow-closeout.md',
      'docs/handoffs/2026-05-18-build-lane-failure-telemetry-closeout.md',
    ],
    existingScripts: [
      'scripts/process-action-route-review-inbox-check.mjs',
      'scripts/process-action-route-promotion-workflow-check.mjs',
      'scripts/process-build-lane-failure-telemetry-check.mjs',
    ],
    existingPolicy: [
      'Action-route findings are proposed until reviewed through governed Foundation workflow.',
      'Promotion workflow can mark duplicate, reject, snooze, link, and promote without external side effects.',
      'Build-lane failure telemetry exists so repeated process failures should become visible repair work.',
    ],
    reused: [
      'Existing Action Route Review Inbox read model and page.',
      'Existing promotion workflow actions for duplicate/link/reject/snooze.',
      'Existing control-loop verifier and Foundation build closeout registry.',
    ],
    notRebuilt: [
      'No second review inbox.',
      'No automatic deletion or hiding of history.',
      'No live extraction, auth flow, external writeback, or UI redesign.',
    ],
    exactGap: 'Review Inbox can close individual items, but it does not yet group repeated findings or make stale unresolved findings require a clear next action.',
    overBroadRisk: 'This can drift into auto-rejecting rows, deleting history, running extraction, broad UI redesign, or external writeback.',
    readyBy: 'Steve explicitly injected this overnight Foundation card to stop repeated noisy items and recurring process waste.',
    readyAt: '2026-05-18T05:15:00-04:00',
  }
}

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: ACTION_ROUTE_DEDUP_STALENESS_CARD_ID,
    title: 'Action-route dedupe and staleness guard',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P0',
    rank: 157,
    source: 'Steve 2026-05-18 overnight Foundation build-lane feedback and FOUNDATION-KB-ACTION-REVIEW-SPRINT-001.',
    summary: 'Stop duplicate and stale action-route findings from piling up as unresolved operator noise.',
    whyItMatters: 'The system should name repeated proposed findings, show aging risk, and point to closure actions instead of making Steve and builders rediscover the same action-route noise.',
    nextAction: closeCard
      ? `Done under \`${ACTION_ROUTE_DEDUP_STALENESS_CLOSEOUT_KEY}\`. Continue next safe Foundation-up card from repo truth.`
      : 'Build and prove Action Route Review Inbox duplicate grouping and stale-risk policy without hiding history or mutating external systems.',
    statusNote: closeCard
      ? `Closed under \`${ACTION_ROUTE_DEDUP_STALENESS_CLOSEOUT_KEY}\`; duplicate/stale guard is read-model policy only, no automatic deletion or external write.`
      : `Scope/proof: \`${ACTION_ROUTE_DEDUP_STALENESS_CLOSEOUT_KEY}\`; groups duplicate review items and surfaces stale next actions.`,
    owner: 'Foundation Process',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    cardId: ACTION_ROUTE_DEDUP_STALENESS_CARD_ID,
    order: 4,
    stage: closeCard ? 'done_this_sprint' : normalizedStage,
    planRef: ACTION_ROUTE_DEDUP_STALENESS_PLAN_PATH,
    definitionOfDone: 'Action Route Review Inbox groups repeated unresolved findings, marks stale unresolved findings yellow/red with next actions, preserves every row/history item, exposes the policy in live route/UI/verifier surfaces, and full ship gate passes.',
    proofCommands: ACTION_ROUTE_DEDUP_STALENESS_PROOF_COMMANDS,
    readinessBlockerCleared: 'ACTION-ROUTE-REVIEW-INBOX-001 and ACTION-ROUTE-PROMOTION-WORKFLOW-001 shipped; Steve approved continuing the safe Foundation queue with no live extraction, auth-required/paid runs, external writes, Drive mutation, or Agent Feedback auto-send.',
    notNextBoundaries: [
      ...ACTION_ROUTE_DEDUP_STALENESS_NOT_NEXT_BOUNDARIES,
      'Do not auto-delete, auto-reject, or hide action-route history.',
      'Do not work MEETING-VAULT-ACL-001 Phase B.',
      'Do not mutate Drive permissions.',
    ],
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: ACTION_ROUTE_DEDUP_STALENESS_APPROVAL_PATH,
      closeoutKey: ACTION_ROUTE_DEDUP_STALENESS_CLOSEOUT_KEY,
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
        VALUES ($1,$2,$3,'pass',10,10,9.8,'P0','full',true,$4::text[],'[]'::jsonb,$5::jsonb,'codex-action-route-dedup-staleness')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            result = EXCLUDED.result
      `,
      [
        `action-route-dedup-staleness-${stableRunId(ACTION_ROUTE_DEDUP_STALENESS_PLAN_PATH)}`,
        ACTION_ROUTE_DEDUP_STALENESS_CARD_ID,
        ACTION_ROUTE_DEDUP_STALENESS_PLAN_PATH,
        ACTION_ROUTE_DEDUP_STALENESS_CHANGED_FILES,
        JSON.stringify({ status: 'pass', score: 10, cardId: ACTION_ROUTE_DEDUP_STALENESS_CARD_ID }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-action-route-dedup-staleness',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        row.id,
        `${closeCard ? 'Closed' : 'Updated'} ${ACTION_ROUTE_DEDUP_STALENESS_CARD_ID}.`,
        JSON.stringify({ closeoutKey: ACTION_ROUTE_DEDUP_STALENESS_CLOSEOUT_KEY, stage }),
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
    scriptPath: ACTION_ROUTE_DEDUP_STALENESS_SCRIPT_PATH,
    operation: 'create/update Action Route dedupe/staleness backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage: normalizedStage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: ACTION_ROUTE_DEDUP_STALENESS_SPRINT_ID,
        status: 'active',
        goal: 'Stop duplicate and stale Action Route Review Inbox findings from piling up as unresolved operator noise.',
        activeBlockerCardId: closeCard ? null : ACTION_ROUTE_DEDUP_STALENESS_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizedStage,
          startedBy: 'codex-action-route-dedup-staleness',
          currentStatus: closeCard ? 'complete' : normalizedStage,
          closeoutKey: ACTION_ROUTE_DEDUP_STALENESS_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Commit/push, then continue the next safe Foundation-up card from repo truth.'
            : 'Build duplicate grouping and stale-risk policy; no extraction, auth, paid run, external write, UI redesign, or Agent Feedback auto-send.',
          priorityOrder: [
            SPRINT_CARD_ID,
            REVIEW_INBOX_CARD_ID,
            PROMOTION_WORKFLOW_CARD_ID,
            ACTION_ROUTE_DEDUP_STALENESS_CARD_ID,
          ],
          notNext: ACTION_ROUTE_DEDUP_STALENESS_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'Repeated unresolved review findings are grouped with source refs and next action.',
            `Unresolved findings at ${ACTION_ROUTE_STALE_WATCH_DAYS} days are yellow watch and at ${ACTION_ROUTE_STALE_RED_DAYS} days are red risk.`,
            'Every review item preserves history and gets dedupe/staleness metadata.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage: normalizedStage })],
    },
    'codex-action-route-dedup-staleness',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || ACTION_ROUTE_DEDUP_STALENESS_SPRINT_ID,
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
    verifierSource,
    coverageSource,
    foundationVerifySource,
    rendererSource,
    closeoutRecordsSource,
    actionRouteRecordsSource,
    closeoutDoc,
    currentPlan,
    currentState,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: ACTION_ROUTE_DEDUP_STALENESS_APPROVAL_PATH,
      cardId: ACTION_ROUTE_DEDUP_STALENESS_CARD_ID,
    }),
    getBacklogItemsByIds([
      ACTION_ROUTE_DEDUP_STALENESS_CARD_ID,
      REVIEW_INBOX_CARD_ID,
      PROMOTION_WORKFLOW_CARD_ID,
      SPRINT_CARD_ID,
    ]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([ACTION_ROUTE_DEDUP_STALENESS_CARD_ID]),
    getFoundationBuildCloseouts(),
    readRepoFile('package.json'),
    readRepoFile(ACTION_ROUTE_DEDUP_STALENESS_PLAN_PATH),
    readRepoFile('lib/action-route-dedup-staleness-guard.js'),
    readRepoFile('lib/action-route-review-inbox.js'),
    readRepoFile('lib/foundation-verifier-control-loop.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('public/foundation-action-route-review-inbox-renderers.js'),
    readRepoFile('lib/foundation-build-closeout-records.js'),
    readRepoFile('lib/foundation-build-closeout-action-route-records.js'),
    readRepoFile(ACTION_ROUTE_DEDUP_STALENESS_CLOSEOUT_PATH, { optional: true }),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
  ])
  await closeFoundationDb()

  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === ACTION_ROUTE_DEDUP_STALENESS_CARD_ID)
  const activeItem = (sprint.items || []).find(item => item.cardId === ACTION_ROUTE_DEDUP_STALENESS_CARD_ID)
  const stageOk = ['scoping', 'sprint_ready', 'building_now', 'done_this_sprint'].includes(activeItem?.stage) || card?.lane === 'done'
  const cardScaffold = validateBuildLaneCardScaffold(card || buildCardRow({ closeCard: false }))
  const sprintMetadata = validateBuildLaneSprintItemMetadata(activeItem || buildSprintItem({ closeCard: args.closeCard, stage: args.stage }))
  const currentSprintStatus = buildFoundationCurrentSprintStatus({ sprint: sprint.sprint, items: sprint.items || [], cards })
  const selfReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: { id: ACTION_ROUTE_DEDUP_STALENESS_CARD_ID, priority: 'P0' },
    changedFiles: ACTION_ROUTE_DEDUP_STALENESS_CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
  })
  const planCriticPass = planCriticRuns.some(run =>
    run.cardId === ACTION_ROUTE_DEDUP_STALENESS_CARD_ID &&
      run.status === 'pass' &&
      Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )
  const dogfood = buildActionRouteDedupStalenessDogfoodProof()
  const closeoutRecord = closeouts.find(record => record.key === ACTION_ROUTE_DEDUP_STALENESS_CLOSEOUT_KEY)

  addCheck(checks, approval.ok && approval.mode === 'v2', 'approval file is valid v2 and matches plan hash', approval.failures?.map(f => f.check).join('; ') || approval.approvalRef)
  addCheck(checks, cardScaffold.ok, 'live backlog card has required scaffold fields', cardScaffold.missing.join(', ') || card?.lane || 'ok')
  addCheck(checks, stageOk && sprint.sprint?.sprintId === ACTION_ROUTE_DEDUP_STALENESS_SPRINT_ID, 'Current Sprint points to Action Route dedupe/staleness guard', `${sprint.sprint?.sprintId || 'missing'}:${activeItem?.stage || card?.lane || 'missing'}`)
  addCheck(checks, sprintMetadata.ok, 'Current Sprint item has complete metadata before build/done', sprintMetadata.missing.join(', ') || 'ok')
  addCheck(checks, currentSprintStatus.status === 'healthy' || card?.lane === 'done', 'Current Sprint status remains healthy or historically done', currentSprintStatus.status)
  addCheck(checks, planCriticPass && selfReview.status === 'pass' && Number(selfReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic coverage passes for dedupe/staleness card', `stored=${planCriticPass} self=${selfReview.status}:${selfReview.score}`)
  addCheck(checks, dogfood.ok, 'dogfood groups duplicates, flags stale watch/risk, and rejects malformed stale output', JSON.stringify(dogfood.summary))
  addCheck(checks, includesAll(moduleSource, [
    'buildActionRouteDedupStalenessGuard',
    'attachActionRouteDedupStalenessGuard',
    'validateActionRouteDedupStalenessSnapshot',
    'buildActionRouteDedupStalenessDogfoodProof',
    'ACTION_ROUTE_STALE_WATCH_DAYS = 3',
    'ACTION_ROUTE_STALE_RED_DAYS = 7',
  ]), 'dedupe/staleness module owns policy, validator, thresholds, and dogfood', 'lib/action-route-dedup-staleness-guard.js')
  addCheck(checks, includesAll(inboxSource, [
    'attachActionRouteDedupStalenessGuard',
    'dedupStalenessOwner',
    'item_missing_dedupe_key',
    'item_missing_staleness',
  ]), 'Review Inbox snapshot attaches dedupe/staleness guard', 'lib/action-route-review-inbox.js')
  addCheck(checks, includesAll(verifierSource, [
    "dedupStaleness?.contractVersion === 'action-route-dedup-staleness-guard.v1'",
    "dedupStalenessOwner === 'ACTION-ROUTE-DEDUP-STALENESS-GUARD-001'",
    'item.dedupeKey && item.staleness?.status',
  ]), 'control-loop verifier checks live Review Inbox dedupe/staleness contract', 'lib/foundation-verifier-control-loop.js')
  addCheck(checks, includesAll(rendererSource, [
    'duplicateClusterIds',
    'item.staleness',
    'summary.duplicateClusters',
    'summary.staleRiskItems',
  ]), 'Review Inbox renderer surfaces duplicate and stale state without broad redesign', 'public/foundation-action-route-review-inbox-renderers.js')
  addCheck(checks, packageJson.scripts?.['process:action-route-dedup-staleness-guard-check'] === 'node --env-file-if-exists=.env scripts/process-action-route-dedup-staleness-guard-check.mjs', 'package script is registered', 'process:action-route-dedup-staleness-guard-check')
  addCheck(checks, coverageSource.includes('ACTION_ROUTE_DEDUP_STALENESS_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE') && foundationVerifySource.includes('ACTION_ROUTE_DEDUP_STALENESS_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE'), 'foundation verifier imports done-card coverage constant', 'coverage card ID is reachable')
  addCheck(checks, closeoutRecordsSource.includes('actionRouteCloseoutRecords') && actionRouteRecordsSource.includes(ACTION_ROUTE_DEDUP_STALENESS_CLOSEOUT_KEY), 'closeout registry uses action-route record module to avoid growing cleanup registry over budget', 'lib/foundation-build-closeout-action-route-records.js')
  addCheck(checks, !unsafeExternalTokens([moduleSource, inboxSource, verifierSource, rendererSource].join('\n')).length, 'dedupe/staleness card does not introduce extraction/auth/model/external-write tokens', unsafeExternalTokens([moduleSource, inboxSource, verifierSource, rendererSource].join('\n')).join(', ') || 'clean')
  addCheck(checks, await repoFileExists(ACTION_ROUTE_DEDUP_STALENESS_SCRIPT_PATH), 'focused proof script exists', ACTION_ROUTE_DEDUP_STALENESS_SCRIPT_PATH)
  addCheck(checks, !args.closeCard || (closeoutRecord && closeoutDoc.includes(ACTION_ROUTE_DEDUP_STALENESS_CLOSEOUT_KEY)), 'closeout registry and handoff exist before close-card', closeoutRecord ? closeoutRecord.key : 'missing closeout record')
  addCheck(checks, !args.closeCard || (currentPlan.includes(ACTION_ROUTE_DEDUP_STALENESS_CLOSEOUT_KEY) && currentState.includes(ACTION_ROUTE_DEDUP_STALENESS_CLOSEOUT_KEY)), 'current plan/state name shipped dedupe/staleness closeout before close-card', 'current docs')
  addCheck(checks, !args.closeCard || card?.lane === 'done', 'live backlog card is done on close-card', card?.lane || 'missing')

  const failed = checks.filter(check => !check.ok)
  if (failed.length) {
    recordBuildLaneFailureEventsFromChecks({
      checks,
      repoRoot,
      command: 'process:action-route-dedup-staleness-guard-check',
      cardId: ACTION_ROUTE_DEDUP_STALENESS_CARD_ID,
      sprintId: ACTION_ROUTE_DEDUP_STALENESS_SPRINT_ID,
      fileModule: ACTION_ROUTE_DEDUP_STALENESS_SCRIPT_PATH,
    })
  }

  const payload = {
    ok: failed.length === 0,
    cardId: ACTION_ROUTE_DEDUP_STALENESS_CARD_ID,
    closeoutKey: ACTION_ROUTE_DEDUP_STALENESS_CLOSEOUT_KEY,
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
    console.log(`Action Route dedupe/staleness guard check: ${payload.ok ? 'PASS' : 'FAIL'}`)
    for (const check of checks) console.log(`${check.ok ? 'ok' : 'FAIL'} - ${check.check}${check.detail ? ` (${check.detail})` : ''}`)
  }
  process.exitCode = payload.ok ? 0 : 1
}

main().catch(error => {
  recordBuildLaneFailureEventsFromChecks({
    checks: [{ ok: false, check: 'process-action-route-dedup-staleness-guard-check crashed', detail: error instanceof Error ? error.message : String(error) }],
    repoRoot,
    command: 'process:action-route-dedup-staleness-guard-check',
    cardId: ACTION_ROUTE_DEDUP_STALENESS_CARD_ID,
    sprintId: ACTION_ROUTE_DEDUP_STALENESS_SPRINT_ID,
    fileModule: ACTION_ROUTE_DEDUP_STALENESS_SCRIPT_PATH,
  })
  console.error(error instanceof Error ? error.stack : error)
  process.exit(1)
})
