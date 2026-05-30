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
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import { createIntelligenceActionRouterStore } from '../lib/intelligence-action-router.js'
import {
  INTEL_THREAD_CONTEXT_APPROVAL_PATH,
  INTEL_THREAD_CONTEXT_CARD_ID,
  INTEL_THREAD_CONTEXT_CHANGED_FILES,
  INTEL_THREAD_CONTEXT_CLOSEOUT_KEY,
  INTEL_THREAD_CONTEXT_CLOSEOUT_PATH,
  INTEL_THREAD_CONTEXT_NEXT_CARD_ID,
  INTEL_THREAD_CONTEXT_NOT_NEXT_BOUNDARIES,
  INTEL_THREAD_CONTEXT_PLAN_PATH,
  INTEL_THREAD_CONTEXT_PROOF_COMMANDS,
  INTEL_THREAD_CONTEXT_SCRIPT_PATH,
  INTEL_THREAD_CONTEXT_SPRINT_ID,
  buildIntelThreadContextDogfoodProof,
} from '../lib/intel-thread-context.js'
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
const ACTOR = 'codex-intel-thread-context'

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
    id: INTEL_THREAD_CONTEXT_CARD_ID,
    title: 'Add full thread context to evidence proof',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 16,
    source: '2026-04-28 Strategy route proof review and Current Sprint active blocker after KPI-LEAD-VALIDATION-001.',
    summary: 'Make Strategic Intelligence route proof show conversation completeness, reply-backed context, direction, latest activity, source account, evidence use, corroboration, and weak-proof flags.',
    whyItMatters: 'Steve correctly challenged source proof that looked technically valid but could have been a one-way/test/system email with no real reply. Strategic Intelligence and the Scoper need proof context before recommendations feel trustworthy.',
    nextAction: closeCard
      ? `Done under ${INTEL_THREAD_CONTEXT_CLOSEOUT_KEY}; continue ${INTEL_THREAD_CONTEXT_NEXT_CARD_ID}.`
      : 'Enrich source proof with thread context, render it in Strategy Hub route review, dogfood weak-proof flags, and close the card through full Foundation gates.',
    statusNote: closeCard
      ? `Closed v1 under ${INTEL_THREAD_CONTEXT_CLOSEOUT_KEY}; source proof now surfaces thread context and weak-proof flags without source writes or new extraction.`
      : 'Executing v1: read-only proof enrichment and Strategy Hub rendering only; no new extraction, provider calls, route apply changes, or broad private reads.',
    owner: 'Foundation Intelligence',
  }
}

function buildNextCardRow(existing = {}) {
  const defaultNextAction = 'Build after INTEL-SCOPER-001 v1 ships at least one real scoped card. UI requirements: collapsible sections per output category (verified, partial, actual gaps, owner suggestion, next steps); each verified claim renders as a clickable evidence pointer to the source file/atom/decision/route; meeting-readable plain-English titles; next-steps produced as draft tasks the team can promote with one click; honor BC brand. Designed for shared-screen plus live discussion per AI-MEETING-PARTICIPANT-001.'
  const defaultStatusNote = 'New P1 from 2026-04-28 deep audit. Pinned separately from INTEL-SCOPER-001 because UI display is a distinct build phase and falls through the cracks otherwise.'
  const existingNextAction = text(existing.nextAction ?? existing.next_action, defaultNextAction)
  const existingStatusNote = text(existing.statusNote ?? existing.status_note, defaultStatusNote)
  return {
    ...existing,
    id: INTEL_THREAD_CONTEXT_NEXT_CARD_ID,
    title: existing.title || 'Render gap-resolving Scoper output in the Strategy Hub',
    lane: existing.lane === 'done' ? existing.lane : 'scoped',
    priority: existing.priority || 'P1',
    rank: existing.rank || 32,
    nextAction: existingNextAction.includes('collapsible sections') ? existingNextAction : defaultNextAction,
    statusNote: `${existingStatusNote.includes('2026-04-28 deep audit') ? existingStatusNote : defaultStatusNote} Unblocked by ${INTEL_THREAD_CONTEXT_CLOSEOUT_KEY}; scope/proof required before build.`.trim(),
    owner: existing.owner || 'Foundation Intelligence',
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/intelligence-action-router.js',
      'public/strategic-execution.js',
      'lib/strategic-intel-loop.js',
      'lib/intel-scoper.js',
    ],
    existingDocs: [
      'docs/specs/2026-04-28-strategic-intelligence-loop.md',
      'docs/handoffs/2026-05-19-strategic-intel-loop-closeout.md',
      'docs/process/intel-scoper-001-plan.md',
    ],
    existingScripts: [
      'process:strategic-intel-check',
      'process:intel-scoper-check',
      'process:strategy-004-check',
      'process:strategy-009-check',
      'process:system-health-nightly-audit-check',
      'process:build-lane-repeated-failure-action-gate-check',
      'backlog:hygiene',
      'foundation:verify',
    ],
    existingPolicy: [
      'Strategic Intelligence source proof must expose evidence strength before recommendations are trusted.',
      'Single-source and one-message artifacts can stay reviewable but must be labeled as weak context.',
      'Meeting Vault Phase B and Drive permissions remain outside this card.',
      'Process checks may update sprint/backlog truth only through explicit close-card write flags.',
    ],
    exactGap: 'Route proof rendered quotes and source IDs but did not make thread completeness, reply-backed context, stale/system-origin risk, evidence use, or cross-source corroboration visible enough for Steve to trust.',
    overBroadRisk: 'The card can drift into new extraction, route apply behavior, Scoper UI, provider calls, or private broad source reads. V1 only enriches existing route proof and UI rendering.',
    reused: [
      'Existing action router source proof query and Strategy Hub route-review surface.',
      'Existing shared communication artifact metadata for message counts, participants, source account, and timestamps.',
      'Existing Strategic Intelligence spec requirements around reply count, latest activity, thread status, direction, and corroboration.',
    ],
    notRebuilt: [
      'No new extraction or source sync.',
      'No route apply workflow change.',
      'No Scoper UI implementation.',
      'No atom/retrieval schema migration.',
    ],
    readyBy: 'Steve unattended Foundation sprint approval',
    readyAt: '2026-05-20T02:45:00-04:00',
  }
}

function buildSprintItemFromExisting(item = {}, { closeCard = false } = {}) {
  if (item.cardId !== INTEL_THREAD_CONTEXT_CARD_ID) return item
  return {
    ...item,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: INTEL_THREAD_CONTEXT_PLAN_PATH,
    definitionOfDone: 'Strategic Intelligence source proof exposes thread context across existing communication artifacts: reply/message counts, latest activity, participants, from/to direction, source account/container, evidence-use count, linked artifacts, corroboration status, and weak-proof flags; Strategy Hub renders those signals; dogfood proves one-message, no-reply, automated origin, stale, missing-corroboration, and reply-backed cases.',
    proofCommands: INTEL_THREAD_CONTEXT_PROOF_COMMANDS,
    readinessBlockerCleared: 'KPI-LEAD-VALIDATION-001 shipped and Current Sprint advanced to INTEL-THREAD-CONTEXT-001.',
    notNextBoundaries: INTEL_THREAD_CONTEXT_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      ...(item.metadata || {}),
      owner: 'Foundation Intelligence',
      closeoutKey: INTEL_THREAD_CONTEXT_CLOSEOUT_KEY,
      approvalRef: INTEL_THREAD_CONTEXT_APPROVAL_PATH,
    },
  }
}

function ensureSprintHasTarget(items = []) {
  if (items.some(item => item.cardId === INTEL_THREAD_CONTEXT_CARD_ID)) return items
  return [
    ...items,
    {
      cardId: INTEL_THREAD_CONTEXT_CARD_ID,
      order: items.length + 1,
      stage: 'building_now',
      title: 'Add full thread context to evidence proof',
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
    const nextExisting = await client.query('SELECT * FROM backlog_items WHERE id = $1', [INTEL_THREAD_CONTEXT_NEXT_CARD_ID])
    const nextRow = buildNextCardRow(nextExisting.rows[0] || {})
    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, next_action, status_note, owner
        )
        VALUES ($1,$2,'foundation',$3,$4,$5,$6,$7,$8)
        ON CONFLICT (id) DO UPDATE
        SET lane = CASE WHEN backlog_items.lane = 'done' THEN backlog_items.lane ELSE EXCLUDED.lane END,
            priority = EXCLUDED.priority,
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
        `intel-thread-context-${stableRunId(INTEL_THREAD_CONTEXT_PLAN_PATH)}`,
        INTEL_THREAD_CONTEXT_CARD_ID,
        INTEL_THREAD_CONTEXT_PLAN_PATH,
        planReview.status,
        Number(planReview.score),
        INTEL_THREAD_CONTEXT_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: INTEL_THREAD_CONTEXT_CARD_ID }),
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
        INTEL_THREAD_CONTEXT_CARD_ID,
        ACTOR,
        `${closeCard ? 'Closed' : 'Updated'} ${INTEL_THREAD_CONTEXT_CARD_ID}.`,
        JSON.stringify({ closeoutKey: INTEL_THREAD_CONTEXT_CLOSEOUT_KEY, nextCardId: INTEL_THREAD_CONTEXT_NEXT_CARD_ID }),
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
    scriptPath: INTEL_THREAD_CONTEXT_SCRIPT_PATH,
    operation: `create/update ${INTEL_THREAD_CONTEXT_CARD_ID} card, Plan Critic row, and Current Sprint overlay`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveRows({ closeCard, planReview })
  const baseItems = ensureSprintHasTarget(previous.items || [])
  const items = baseItems.map(item => {
    if (item.cardId === INTEL_THREAD_CONTEXT_NEXT_CARD_ID && closeCard) {
      return { ...item, stage: 'scoping' }
    }
    return buildSprintItemFromExisting(item, { closeCard })
  })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: previous.sprint?.sprintId || INTEL_THREAD_CONTEXT_SPRINT_ID,
        status: 'active',
        activeBlockerCardId: closeCard ? INTEL_THREAD_CONTEXT_NEXT_CARD_ID : INTEL_THREAD_CONTEXT_CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: closeCard ? 'next_scoping' : 'building_now',
          closeoutKey: INTEL_THREAD_CONTEXT_CLOSEOUT_KEY,
          nextAction: closeCard
            ? `Commit/push, then continue ${INTEL_THREAD_CONTEXT_NEXT_CARD_ID}.`
            : 'Ship thread-context proof enrichment for Strategic Intelligence route evidence.',
          notNext: INTEL_THREAD_CONTEXT_NOT_NEXT_BOUNDARIES,
        },
      },
      items,
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'Steve approved unattended Foundation execution; build thread-context proof and continue next safe card.',
    },
  )
}

async function fetchLiveRouteThreadContextSummary() {
  const pool = createPool()
  try {
    const store = createIntelligenceActionRouterStore({ pool })
    const snapshot = await store.getActionRouterSnapshot({ limit: 10 })
    const routes = [...(snapshot.strategyRecentRoutes || []), ...(snapshot.recentRoutes || [])]
    const proofItems = routes.flatMap(route => route.sourceProof?.items || [])
    const contextItems = proofItems.filter(item => item.threadContext)
    return {
      routeCount: routes.length,
      proofItemCount: proofItems.length,
      contextItemCount: contextItems.length,
      weakFlagCount: contextItems.reduce((sum, item) => sum + (item.threadContext?.weakFlags?.length || 0), 0),
      sample: contextItems.slice(0, 3).map(item => ({
        sourceId: item.sourceId,
        sourceType: item.sourceType,
        status: item.threadContext.status,
        confidenceLabel: item.threadContext.confidenceLabel,
        weakFlagCodes: item.threadContext.weakFlagCodes || [],
      })),
    }
  } finally {
    await pool.end()
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const planSource = await readRepoFile(INTEL_THREAD_CONTEXT_PLAN_PATH)
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard }),
    changedFiles: INTEL_THREAD_CONTEXT_CHANGED_FILES,
    declaredRisk: 'Thread context proof can drift into new extraction, source sync, Scoper UI, action-route apply behavior, provider calls, or private broad source reads.',
    repoRoot,
  })
  if (args.closeCard) await ensureLiveState({ closeCard: true, planReview })

  const [
    approval,
    packageJson,
    moduleSource,
    actionRouterSource,
    uiSource,
    coverageSource,
    closeoutRecordsSource,
    closeoutDoc,
    scriptSource,
    specSource,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: INTEL_THREAD_CONTEXT_APPROVAL_PATH, cardId: INTEL_THREAD_CONTEXT_CARD_ID }),
    readRepoJson('package.json'),
    readRepoFile('lib/intel-thread-context.js'),
    readRepoFile('lib/intelligence-action-router.js'),
    readRepoFile('public/strategic-execution.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
    readRepoFile(INTEL_THREAD_CONTEXT_CLOSEOUT_PATH, { optional: true }),
    readRepoFile(INTEL_THREAD_CONTEXT_SCRIPT_PATH),
    readRepoFile('docs/specs/2026-04-28-strategic-intelligence-loop.md'),
  ])

  const dogfood = buildIntelThreadContextDogfoodProof()
  const liveRouteSummary = await fetchLiveRouteThreadContextSummary()

  await initFoundationDb()
  const sprint = await getActiveFoundationCurrentSprint()
  const sprintCardIds = (sprint.items || []).map(item => item.cardId).filter(Boolean)
  const cardIds = Array.from(new Set([INTEL_THREAD_CONTEXT_CARD_ID, INTEL_THREAD_CONTEXT_NEXT_CARD_ID, ...sprintCardIds]))
  const [cards, planCriticRuns] = await Promise.all([
    getBacklogItemsByIds(cardIds),
    getPlanCriticRunsByCardIds(cardIds),
  ])
  await closeFoundationDb()

  const card = cards.find(item => item.id === INTEL_THREAD_CONTEXT_CARD_ID) || null
  const nextCard = cards.find(item => item.id === INTEL_THREAD_CONTEXT_NEXT_CARD_ID) || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === INTEL_THREAD_CONTEXT_CARD_ID) || null
  const nextSprintItem = (sprint.items || []).find(item => item.cardId === INTEL_THREAD_CONTEXT_NEXT_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === INTEL_THREAD_CONTEXT_CLOSEOUT_KEY) || null
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: sprint.sprint,
    items: sprint.items,
    backlogItems: cards,
    closeouts: getFoundationBuildCloseouts(),
    planCriticRuns,
  })
  const scaffold = validateBuildLaneCardScaffold(card || {})
  const sprintMetadata = validateBuildLaneSprintItemMetadata(sprintItem || {})

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(failure => failure.check).join(', ') || INTEL_THREAD_CONTEXT_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', buildPlanCriticResultSummary(planReview))
  addCheck(checks, planCriticRuns.some(run => run.cardId === INTEL_THREAD_CONTEXT_CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, card?.priority === 'P0' && ['executing', 'done'].includes(card?.lane), 'live backlog card exists and is staged', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, scaffold.ok, 'live backlog card passes scaffold guard', scaffold.missing.join(', ') || 'complete')
  addCheck(checks, sprint.sprint?.activeBlockerCardId === (args.closeCard ? INTEL_THREAD_CONTEXT_NEXT_CARD_ID : INTEL_THREAD_CONTEXT_CARD_ID), 'Current Sprint active blocker matches expected card', sprint.sprint?.activeBlockerCardId || 'missing')
  addCheck(checks, args.closeCard ? sprintItem?.stage === 'done_this_sprint' : Boolean(sprintItem), 'Current Sprint target item is present/closed', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  addCheck(checks, args.closeCard ? nextSprintItem?.stage === 'scoping' : true, 'next card remains scoped after closeout', nextSprintItem ? `${nextSprintItem.cardId}:${nextSprintItem.stage}` : 'not closing')
  addCheck(checks, sprintMetadata.ok, 'Current Sprint item metadata is complete', sprintMetadata.missing.join(', ') || 'complete')
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint status is healthy', currentSprintStatus.findings?.map(item => item.detail || item.check).join('; ') || 'healthy')
  addCheck(checks, nextCard && ['scoped', 'executing', 'done', 'research'].includes(nextCard.lane), 'next safe card remains live', nextCard ? `${nextCard.lane}/${nextCard.priority}` : 'missing')
  addCheck(checks, dogfood.ok, 'thread-context dogfood passes', JSON.stringify(dogfood.summary))
  addCheck(checks, dogfood.items[0]?.threadContext?.weakFlagCodes?.includes('one_message_thread'), 'dogfood flags one-message thread', 'one_message_thread')
  addCheck(checks, dogfood.items[0]?.threadContext?.weakFlagCodes?.includes('no_reply_captured'), 'dogfood flags no-reply captured', 'no_reply_captured')
  addCheck(checks, dogfood.items[0]?.threadContext?.weakFlagCodes?.includes('system_drafted_or_automated_origin'), 'dogfood flags automated/system origin', 'system_drafted_or_automated_origin')
  addCheck(checks, dogfood.items[1]?.threadContext?.replyCount === 2 && !dogfood.items[1]?.threadContext?.weakFlagCodes?.includes('no_reply_captured'), 'dogfood preserves reply-backed proof', 'reply-backed')
  addCheck(checks, liveRouteSummary.routeCount >= 1 && liveRouteSummary.contextItemCount >= 1, 'live action-router snapshot carries threadContext on source proof', JSON.stringify(liveRouteSummary))
  addCheck(checks, packageJson.scripts?.['process:intel-thread-context-check'] === `node --env-file-if-exists=.env ${INTEL_THREAD_CONTEXT_SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:intel-thread-context-check'] || 'missing')
  addCheck(checks, moduleSource.includes('buildThreadContextForProofItem') && moduleSource.includes('no_cross_source_corroboration') && moduleSource.includes('system_drafted_or_automated_origin'), 'thread-context module owns weak-proof model', 'lib/intel-thread-context.js')
  addCheck(checks, moduleSource.includes('const { metadata, threadMetadata, ...safeItem }') && moduleSource.includes('threadContext'), 'raw metadata is stripped from rendered proof items', 'safe proof item shaping')
  addCheck(checks, actionRouterSource.includes('enrichSourceProofItemsWithThreadContext') && actionRouterSource.includes('threadContextSummary'), 'action router enriches source proof with thread context', 'lib/intelligence-action-router.js')
  addCheck(checks, uiSource.includes('item.threadContext') && uiSource.includes('weakFlags') && uiSource.includes('corroboration'), 'Strategy Hub renders thread context and weak flags', 'public/strategic-execution.js')
  addCheck(checks, specSource.includes('one-message thread') && specSource.includes('reply count') && specSource.includes('latest activity'), 'Strategic Intelligence spec context was reused', 'docs/specs/2026-04-28-strategic-intelligence-loop.md')
  addCheck(checks, coverageSource.includes('INTEL_THREAD_CONTEXT_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE') && coverageSource.includes(INTEL_THREAD_CONTEXT_CARD_ID), 'verifier coverage IDs include INTEL-THREAD-CONTEXT-001', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(INTEL_THREAD_CONTEXT_CARD_ID), 'closeout registry record is registered', closeout?.key || 'missing')
  addCheck(checks, closeoutRecordsSource.includes(INTEL_THREAD_CONTEXT_CLOSEOUT_KEY) && closeoutRecordsSource.includes(INTEL_THREAD_CONTEXT_CARD_ID), 'closeout registry source contains card and key', INTEL_THREAD_CONTEXT_CLOSEOUT_KEY)
  addCheck(checks, closeoutDoc.includes('thread context') && closeoutDoc.includes('weak-proof'), 'closeout documents behavior and limits', INTEL_THREAD_CONTEXT_CLOSEOUT_PATH)
  addCheck(checks, scriptSource.includes('assertProcessCheckWriteAllowed') && scriptSource.includes('createIntelligenceActionRouterStore'), 'focused proof keeps writes explicit and validates live route proof path', INTEL_THREAD_CONTEXT_SCRIPT_PATH)

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'fail' : 'pass',
    cardId: INTEL_THREAD_CONTEXT_CARD_ID,
    closeoutKey: INTEL_THREAD_CONTEXT_CLOSEOUT_KEY,
    sprintId: sprint.sprint?.sprintId || null,
    dogfood: dogfood.summary,
    liveRouteSummary,
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`${INTEL_THREAD_CONTEXT_CARD_ID} check: ${result.status}`)
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
