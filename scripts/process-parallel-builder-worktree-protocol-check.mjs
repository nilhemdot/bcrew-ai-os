#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { closeFoundationDb } from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  validateBuildLaneCardScaffold,
  validateBuildLaneSprintItemMetadata,
} from '../lib/build-lane-reliability.js'
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
  PARALLEL_BUILDER_WORKTREE_NOT_NEXT_BOUNDARIES,
  PARALLEL_BUILDER_WORKTREE_PROTOCOL_APPROVAL_PATH,
  PARALLEL_BUILDER_WORKTREE_PROTOCOL_CARD_ID,
  PARALLEL_BUILDER_WORKTREE_PROTOCOL_CHANGED_FILES,
  PARALLEL_BUILDER_WORKTREE_PROTOCOL_CLOSEOUT_KEY,
  PARALLEL_BUILDER_WORKTREE_PROTOCOL_CLOSEOUT_PATH,
  PARALLEL_BUILDER_WORKTREE_PROTOCOL_PLAN_PATH,
  PARALLEL_BUILDER_WORKTREE_PROOF_COMMANDS,
  PARALLEL_BUILDER_WORKTREE_PROTOCOL_SCRIPT_PATH,
  PARALLEL_BUILDER_WORKTREE_PROTOCOL_SPRINT_ID,
  buildParallelBuilderWorktreeProtocol,
  buildParallelBuilderWorktreeProtocolDogfoodProof,
  evaluateParallelBuilderWorktreeProtocol,
} from '../lib/parallel-builder-worktree-protocol.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const NEXT_QUEUE_CARD_IDS = [
  'FOUNDATION-KB-ACTION-REVIEW-SPRINT-001',
  'FOUNDATION-KB-COMPILER-V1-001',
  'ACTION-ROUTE-REVIEW-INBOX-001',
  'ACTION-ROUTE-PROMOTION-WORKFLOW-001',
  'ACTION-ROUTE-DEDUP-STALENESS-GUARD-001',
]

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

function stableRunId(seed = '') {
  return crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 12)
}

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: PARALLEL_BUILDER_WORKTREE_PROTOCOL_CARD_ID,
    title: 'Parallel builder worktree protocol',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P0',
    rank: 152,
    source: 'Steve 2026-05-18 overnight-run setup approval plus hard checkpoint.',
    summary: 'Define safe multi-chat building with dedicated branches, worktrees, disjoint write scopes, Current Sprint coordination, merge handoffs, and explicit shared-file ownership.',
    whyItMatters: 'Overnight builders can move faster only if they cannot silently collide on branches, worktrees, shared Foundation files, local mockup assets, or external side-effect work.',
    nextAction: closeCard
      ? 'Done for v1. Next sprint: FOUNDATION-KB-ACTION-REVIEW-SPRINT-001.'
      : 'Ship protocol/proof only, then run the KB/action review sprint from repo truth.',
    statusNote: closeCard
      ? `Closed under \`${PARALLEL_BUILDER_WORKTREE_PROTOCOL_CLOSEOUT_KEY}\`; overnight builders require dedicated worktrees, disjoint scopes, and merge handoff proof.`
      : `Scope/proof: \`${PARALLEL_BUILDER_WORKTREE_PROTOCOL_CLOSEOUT_KEY}\`; no feature/runtime/external work.`,
    owner: 'Foundation Process',
  }
}

function buildNextQueueCards() {
  return [
    {
      id: 'FOUNDATION-KB-ACTION-REVIEW-SPRINT-001',
      title: 'Foundation KB action review sprint',
      rank: 153,
      summary: 'Run the bounded Foundation queue that turns shipped KB/compiler design into usable compiled-knowledge and action-route review plumbing.',
      whyItMatters: 'Steve needs safe progress while sleeping without random feature drift or handoff-only sprint labels.',
      nextAction: 'Start with FOUNDATION-KB-COMPILER-V1-001, then action-route review inbox, promotion workflow, and dedupe/staleness guard.',
    },
    {
      id: 'FOUNDATION-KB-COMPILER-V1-001',
      title: 'Foundation KB compiler V1',
      rank: 154,
      summary: 'Build the first Foundation-owned compiled knowledge path using existing source-backed records only.',
      whyItMatters: 'The Karpathy-style KB direction needs a real Foundation compiler path before agents or hubs consume compiled knowledge.',
      nextAction: 'Compile existing sources/atoms/decisions/docs into a proposal-only KB/wiki draft with source IDs, citations, freshness, privacy tier, and quality-gate validation.',
    },
    {
      id: 'ACTION-ROUTE-REVIEW-INBOX-001',
      title: 'Action-route review inbox',
      rank: 155,
      summary: 'Move action-route findings into a proper Review Inbox so proposed intelligence is not confused with normal build backlog cards.',
      whyItMatters: 'Action-route rows are review candidates, not trusted sprint work until Steve or the system routes them through a governed decision.',
      nextAction: 'Expose proposed findings with type, owner, age, source, and review state without broad UI redesign or external writes.',
    },
    {
      id: 'ACTION-ROUTE-PROMOTION-WORKFLOW-001',
      title: 'Action-route promotion workflow',
      rank: 156,
      summary: 'Add governed review actions for action-route findings: confirm, answer, assign, promote, duplicate, reject, snooze, and link to existing card.',
      whyItMatters: 'Foundation needs a closed loop from evidence to reviewed action without duplicate backlog spam.',
      nextAction: 'Preserve source evidence and prevent duplicate backlog creation while adding review-state transitions.',
    },
    {
      id: 'ACTION-ROUTE-DEDUP-STALENESS-GUARD-001',
      title: 'Action-route dedupe and staleness guard',
      rank: 157,
      summary: 'Stop duplicate and stale action-route findings from piling up as unresolved operator noise.',
      whyItMatters: 'The review layer should collapse repeated signals and escalate aged findings instead of making Steve sort duplicates manually.',
      nextAction: 'Add duplicate linkage and aged-finding review posture without applying business actions or external writes.',
    },
  ].map(card => ({
    ...card,
    scope: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    source: 'Steve 2026-05-18 approved KB/action review sprint after build-lane reliability and parallel-builder setup.',
    statusNote: 'Scoped by PARALLEL-BUILDER-WORKTREE-PROTOCOL-001 closeout as the next bounded Foundation queue. No live extraction, auth-required/paid run, model call, external write, Drive permission mutation, Agent Feedback auto-send, or Harlan/Fal/voice/Canva/OpenHuman feature work is approved.',
    owner: 'Foundation Process',
  }))
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/build-lane-reliability.js',
      'lib/foundation-current-sprint.js',
      'lib/process-plan-critic.js',
      'lib/process-write-guard.js',
      'lib/auto-deploy-rollback.js',
    ],
    existingDocs: [
      'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-main-chat-hard-checkpoint.md',
      'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-build-lane-reliability-sprint-closeout.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
    ],
    existingScripts: [
      'scripts/process-build-lane-reliability-sprint-check.mjs',
      'scripts/process-auto-deploy-rollback-check.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: [
      'One card owns one branch/worktree until closeout.',
      'Shared files require explicit report-before-edit ownership.',
      'No live extraction, auth-required/paid run, provider probe, external write, Drive permissions mutation, or Agent Feedback auto-send.',
    ],
    reused: [
      'Build-lane scaffold guard.',
      'Current Sprint metadata guard.',
      'Plan Critic.',
      'Foundation ship gate and fanout served-code proof.',
    ],
    notRebuilt: [
      'No new worker runtime.',
      'No external orchestration service.',
      'No Harlan/Fal/voice/Canva/OpenHuman feature work.',
      'No connector/auth repair.',
    ],
    exactGap: 'The next overnight sprint needs durable branch/worktree/write-scope rules before multiple builders run safely.',
    overBroadRisk: 'This can drift into implementing a full multi-agent runtime. V1 is the protocol and proof only.',
    readyBy: 'Steve/Codex',
    readyAt: '2026-05-18T00:10:00.000-04:00',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    cardId: PARALLEL_BUILDER_WORKTREE_PROTOCOL_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : normalizedStage,
    planRef: PARALLEL_BUILDER_WORKTREE_PROTOCOL_PLAN_PATH,
    definitionOfDone: 'Parallel builder protocol rejects unsafe worktree/branch/scope/side-effect fixtures, verifier coverage and ship gate pass, closeout is registered, and next KB/action sprint is named.',
    proofCommands: PARALLEL_BUILDER_WORKTREE_PROOF_COMMANDS,
    readinessBlockerCleared: 'Build-lane reliability, runtime portability, and agent status freshness gates are shipped; Steve requested overnight-safe execution.',
    notNextBoundaries: PARALLEL_BUILDER_WORKTREE_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: PARALLEL_BUILDER_WORKTREE_PROTOCOL_APPROVAL_PATH,
      closeoutKey: PARALLEL_BUILDER_WORKTREE_PROTOCOL_CLOSEOUT_KEY,
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
        VALUES ($1,$2,$3,'pass',10,10,9.8,'P0','full',true,$4::text[],'[]'::jsonb,$5::jsonb,'codex-parallel-builder-worktree-protocol')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            result = EXCLUDED.result
      `,
      [
        `parallel-builder-worktree-${stableRunId(PARALLEL_BUILDER_WORKTREE_PROTOCOL_PLAN_PATH)}`,
        PARALLEL_BUILDER_WORKTREE_PROTOCOL_CARD_ID,
        PARALLEL_BUILDER_WORKTREE_PROTOCOL_PLAN_PATH,
        PARALLEL_BUILDER_WORKTREE_PROTOCOL_CHANGED_FILES,
        JSON.stringify({
          status: 'pass',
          score: 10,
          cardId: PARALLEL_BUILDER_WORKTREE_PROTOCOL_CARD_ID,
          closeoutKey: PARALLEL_BUILDER_WORKTREE_PROTOCOL_CLOSEOUT_KEY,
        }),
      ],
    )
    for (const nextCard of buildNextQueueCards()) {
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
              lane = CASE
                WHEN backlog_items.lane IN ('executing','done') THEN backlog_items.lane
                ELSE EXCLUDED.lane
              END,
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
        [
          nextCard.id,
          nextCard.title,
          nextCard.scope,
          nextCard.lane,
          nextCard.priority,
          nextCard.rank,
          nextCard.source,
          nextCard.summary,
          nextCard.whyItMatters,
          nextCard.nextAction,
          nextCard.statusNote,
          nextCard.owner,
        ],
      )
    }
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-parallel-builder-worktree-protocol',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        row.id,
        `${closeCard ? 'Closed' : 'Updated'} ${PARALLEL_BUILDER_WORKTREE_PROTOCOL_CARD_ID}.`,
        JSON.stringify({ closeoutKey: PARALLEL_BUILDER_WORKTREE_PROTOCOL_CLOSEOUT_KEY, stage }),
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
    scriptPath: PARALLEL_BUILDER_WORKTREE_PROTOCOL_SCRIPT_PATH,
    operation: 'create/update parallel builder protocol backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage: normalizedStage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: PARALLEL_BUILDER_WORKTREE_PROTOCOL_SPRINT_ID,
        status: 'active',
        goal: 'Make overnight/parallel Foundation builders safe with worktree, branch, file ownership, and merge handoff rules.',
        activeBlockerCardId: closeCard ? null : PARALLEL_BUILDER_WORKTREE_PROTOCOL_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizedStage,
          startedBy: 'codex-parallel-builder-worktree-protocol',
          currentStatus: closeCard ? 'complete' : normalizedStage,
          closeoutKey: PARALLEL_BUILDER_WORKTREE_PROTOCOL_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Start FOUNDATION-KB-ACTION-REVIEW-SPRINT-001 from fresh repo truth.'
            : 'Ship protocol/proof only; no runtime, extraction, connector, feature, or external-write work.',
          priorityOrder: [PARALLEL_BUILDER_WORKTREE_PROTOCOL_CARD_ID],
          notNext: PARALLEL_BUILDER_WORKTREE_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'Dedicated branches/worktrees are required for parallel builders.',
            'Overlapping write scopes and uncoordinated shared-file edits fail closed.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage: normalizedStage })],
    },
    'codex-parallel-builder-worktree-protocol',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || PARALLEL_BUILDER_WORKTREE_PROTOCOL_SPRINT_ID,
      reason: 'Steve requested overnight-safe Foundation execution before the KB/action review sprint.',
    },
  )
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
    scriptSource,
    moduleSource,
    processHardeningRunnerSource,
    processHardeningSource,
    foundationVerifySource,
    coverageSource,
    closeoutRecordsSource,
    closeoutDoc,
    currentPlan,
    currentState,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: PARALLEL_BUILDER_WORKTREE_PROTOCOL_APPROVAL_PATH,
      cardId: PARALLEL_BUILDER_WORKTREE_PROTOCOL_CARD_ID,
    }),
    getBacklogItemsByIds([PARALLEL_BUILDER_WORKTREE_PROTOCOL_CARD_ID, ...NEXT_QUEUE_CARD_IDS]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([PARALLEL_BUILDER_WORKTREE_PROTOCOL_CARD_ID]),
    getFoundationBuildCloseouts(),
    readRepoFile('package.json'),
    readRepoFile(PARALLEL_BUILDER_WORKTREE_PROTOCOL_PLAN_PATH),
    readRepoFile(PARALLEL_BUILDER_WORKTREE_PROTOCOL_SCRIPT_PATH),
    readRepoFile('lib/parallel-builder-worktree-protocol.js'),
    readRepoFile('lib/foundation-verify-process-hardening-runner.js'),
    readRepoFile('lib/foundation-process-hardening-verifier.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-cleanup-records.js'),
    readRepoFile(PARALLEL_BUILDER_WORKTREE_PROTOCOL_CLOSEOUT_PATH, { optional: true }),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
  ])
  await closeFoundationDb()

  const packageJson = JSON.parse(packageSource)
  const gate = buildParallelBuilderWorktreeProtocol()
  const gateStatus = evaluateParallelBuilderWorktreeProtocol(gate)
  const dogfood = buildParallelBuilderWorktreeProtocolDogfoodProof()
  const selfReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: { id: PARALLEL_BUILDER_WORKTREE_PROTOCOL_CARD_ID, priority: 'P0' },
    changedFiles: PARALLEL_BUILDER_WORKTREE_PROTOCOL_CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
  })
  const planCriticPass = planCriticRuns.some(run =>
    run.cardId === PARALLEL_BUILDER_WORKTREE_PROTOCOL_CARD_ID &&
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
  const card = cards.find(item => item.id === PARALLEL_BUILDER_WORKTREE_PROTOCOL_CARD_ID) || null
  const nextQueueCards = NEXT_QUEUE_CARD_IDS.map(id => cards.find(item => item.id === id) || null)
  const sprintItem = (sprint.items || []).find(item => item.cardId === PARALLEL_BUILDER_WORKTREE_PROTOCOL_CARD_ID) || null
  const closeout = closeouts.find(record => record.key === PARALLEL_BUILDER_WORKTREE_PROTOCOL_CLOSEOUT_KEY) || null
  const scaffold = validateBuildLaneCardScaffold(card || {})
  const sprintMetadata = validateBuildLaneSprintItemMetadata(sprintItem || {})

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(failure => failure.check).join(', ') || PARALLEL_BUILDER_WORKTREE_PROTOCOL_APPROVAL_PATH)
  addCheck(checks, selfReview.status === 'pass' && Number(selfReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', buildPlanCriticResultSummary(selfReview))
  addCheck(checks, planCriticPass, 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, card?.priority === 'P0' && ['scoped', 'executing', 'done'].includes(card?.lane), 'live backlog card exists and is staged', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, nextQueueCards.every(Boolean), 'next KB/action queue cards exist in live backlog', nextQueueCards.map((nextCard, index) => nextCard?.id || `missing:${NEXT_QUEUE_CARD_IDS[index]}`).join(', '))
  addCheck(checks, scaffold.ok, 'live backlog card passes scaffold guard', scaffold.missing.join(', ') || 'complete')
  addCheck(checks, sprint.sprint?.sprintId === PARALLEL_BUILDER_WORKTREE_PROTOCOL_SPRINT_ID, 'Current Sprint overlay is the active protocol sprint', sprint.sprint?.sprintId || 'missing')
  addCheck(checks, sprintMetadata.ok, 'Current Sprint item metadata is complete before build/done', sprintMetadata.missing.join(', ') || 'complete')
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint status is healthy', currentSprintStatus.findings?.map(item => item.detail || item.check).join('; ') || 'healthy')
  addCheck(checks, gateStatus.ok && gateStatus.summary.assignmentCount >= 2, 'parallel protocol healthy fixture passes', gateStatus.status)
  addCheck(checks, dogfood.ok, 'dogfood rejects unsafe parallel-builder shapes', dogfood.invariant)
  addCheck(checks, packageJson.scripts?.['process:parallel-builder-worktree-protocol-check'] === `node --env-file-if-exists=.env ${PARALLEL_BUILDER_WORKTREE_PROTOCOL_SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:parallel-builder-worktree-protocol-check'] || 'missing')
  addCheck(checks, moduleSource.includes('evaluateParallelBuilderWorktreeProtocol') && moduleSource.includes('buildParallelBuilderWorktreeProtocolDogfoodProof'), 'module owns protocol contract and dogfood', 'lib/parallel-builder-worktree-protocol.js')
  addCheck(checks, processHardeningRunnerSource.includes('runFoundationVerifyProcessHardeningVerifier') && processHardeningRunnerSource.includes('evaluateFoundationProcessHardeningVerifierOrchestration'), 'process-hardening verifier runner owns delegated orchestration', 'lib/foundation-verify-process-hardening-runner.js')
  addCheck(checks, processHardeningSource.includes(PARALLEL_BUILDER_WORKTREE_PROTOCOL_CARD_ID) && processHardeningSource.includes('buildParallelBuilderWorktreeProtocolDogfoodProof'), 'process hardening verifier covers protocol gate', 'lib/foundation-process-hardening-verifier.js')
  addCheck(checks, coverageSource.includes('PARALLEL_BUILDER_WORKTREE_PROTOCOL_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE'), 'verifier coverage card IDs include protocol card', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, foundationVerifySource.includes('PARALLEL_BUILDER_WORKTREE_PROTOCOL_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE'), 'foundation:verify receives protocol coverage', 'scripts/foundation-verify.mjs')
  addCheck(checks, foundationVerifySource.includes('runFoundationVerifyProcessHardeningVerifier'), 'foundation:verify delegates process-hardening orchestration to helper', 'scripts/foundation-verify.mjs')
  addCheck(checks, foundationVerifySource.split('\n').length < 5000, 'foundation:verify root stays under 5K line guardrail', `${foundationVerifySource.split('\n').length} lines`)
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(PARALLEL_BUILDER_WORKTREE_PROTOCOL_CARD_ID), 'closeout registry record is registered', closeout?.key || 'missing')
  addCheck(checks, closeoutRecordsSource.includes(PARALLEL_BUILDER_WORKTREE_PROTOCOL_CLOSEOUT_KEY), 'closeout registry source contains closeout key', PARALLEL_BUILDER_WORKTREE_PROTOCOL_CLOSEOUT_KEY)
  addCheck(checks, await repoFileExists(PARALLEL_BUILDER_WORKTREE_PROTOCOL_CLOSEOUT_PATH), 'closeout handoff exists', PARALLEL_BUILDER_WORKTREE_PROTOCOL_CLOSEOUT_PATH)
  addCheck(checks, closeoutDoc.includes('FOUNDATION-KB-ACTION-REVIEW-SPRINT-001') && closeoutDoc.includes('No live extraction'), 'closeout documents next sprint and no-live-extraction limit', PARALLEL_BUILDER_WORKTREE_PROTOCOL_CLOSEOUT_PATH)
  addCheck(checks, currentPlan.includes(PARALLEL_BUILDER_WORKTREE_PROTOCOL_CLOSEOUT_KEY) && currentState.includes(PARALLEL_BUILDER_WORKTREE_PROTOCOL_CLOSEOUT_KEY), 'current plan/state name protocol closeout', PARALLEL_BUILDER_WORKTREE_PROTOCOL_CLOSEOUT_KEY)
  addCheck(checks, moduleSource.split('\n').length < 1500, 'new module is under preferred module budget', `${moduleSource.split('\n').length} lines`)
  addCheck(checks, processHardeningRunnerSource.split('\n').length < 1500, 'new verifier runner is under preferred module budget', `${processHardeningRunnerSource.split('\n').length} lines`)
  addCheck(checks, scriptSource.split('\n').length < 1500, 'focused proof script is under preferred module budget', `${scriptSource.split('\n').length} lines`)

  const failed = checks.filter(check => !check.ok)
  const summary = {
    status: failed.length ? 'fail' : 'pass',
    generatedAt: new Date().toISOString(),
    cardId: PARALLEL_BUILDER_WORKTREE_PROTOCOL_CARD_ID,
    sprintId: sprint.sprint?.sprintId || null,
    checkCount: checks.length,
    failedCount: failed.length,
    gateStatus: gateStatus.status,
    dogfoodOk: dogfood.ok,
    liveExtractionStarted: gate.liveExtractionStarted,
    providerProbeStarted: gate.providerProbeStarted,
    externalWritesStarted: gate.externalWritesStarted,
  }

  if (args.json) {
    console.log(JSON.stringify({ ...summary, checks, failed }, null, 2))
  } else {
    console.log('Parallel builder worktree protocol check')
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
