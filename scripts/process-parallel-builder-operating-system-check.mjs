#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  validateBuildLaneCardScaffold,
  validateBuildLaneSprintItemMetadata,
} from '../lib/build-lane-reliability.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import {
  PARALLEL_BUILDER_OPERATING_SYSTEM_APPROVAL_PATH,
  PARALLEL_BUILDER_OPERATING_SYSTEM_CARD_ID,
  PARALLEL_BUILDER_OPERATING_SYSTEM_CHANGED_FILES,
  PARALLEL_BUILDER_OPERATING_SYSTEM_CLOSEOUT_KEY,
  PARALLEL_BUILDER_OPERATING_SYSTEM_CLOSEOUT_PATH,
  PARALLEL_BUILDER_OPERATING_SYSTEM_NOT_NEXT,
  PARALLEL_BUILDER_OPERATING_SYSTEM_PLAN_PATH,
  PARALLEL_BUILDER_OPERATING_SYSTEM_PROOF_COMMANDS,
  PARALLEL_BUILDER_OPERATING_SYSTEM_PROTOCOL_PATH,
  PARALLEL_BUILDER_OPERATING_SYSTEM_SCRIPT_PATH,
  PARALLEL_BUILDER_OPERATING_SYSTEM_SPRINT_ID,
  buildParallelBuilderOperatingSystemDogfoodProof,
  buildParallelBuilderOperatingSystemProtocol,
  evaluateParallelBuilderOperatingSystem,
} from '../lib/parallel-builder-operating-system.js'

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

function list(value) {
  return Array.isArray(value) ? value : []
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

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function repoFileExists(relativePath) {
  try {
    const stat = await fs.stat(path.join(repoRoot, relativePath))
    return stat.isFile()
  } catch {
    return false
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: 'Reuse PARALLEL-BUILDER-WORKTREE-PROTOCOL-001 validator shape, process write guard, Current Sprint overlay, Plan Critic, build-log closeouts, and foundation ship/fanout gates.',
    existingDocs: 'Reuse docs/process/parallel-builder-worktree-protocol-001-plan.md and its 2026-05-18 closeout as the lower-level worktree/branch baseline.',
    existingScripts: 'Reuse process:parallel-builder-worktree-protocol-check, backlog hygiene, foundation:verify, process:foundation-ship, and fanout checks.',
    existingPolicy: 'Live backlog and Current Sprint are task truth; hidden subagents are not the default builder model; side-effect lanes require explicit approval.',
    reused: 'Existing worktree/branch/scope collision rules are extended into visible chat orchestration, reports, prompts, and shared-lock ownership.',
    notRebuilt: 'No worker runtime, no parallel builder launch, no external orchestration service, no live extraction, and no feature work.',
    exactGap: 'The Planck incident showed a main chat can interpret new builder as hidden subagent delegation, creating repo/branch/integration ambiguity.',
    overBroadRisk: 'This could drift into launching builders or building a full agent runtime. V1 only defines and proves the operating protocol.',
    readyBy: 'Steve ordered this after build-lane reliability cards so visible parallel building can be safe by tomorrow.',
    readyAt: '2026-05-18T10:10:00-04:00',
  }
}

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: PARALLEL_BUILDER_OPERATING_SYSTEM_CARD_ID,
    title: 'Parallel Builder Operating System',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P0',
    rank: 24,
    source: 'Steve 2026-05-18 Planck incident follow-up and visible parallel builder workflow request.',
    summary: 'Define and prove the visible parallel builder operating system: known chats, worktrees, branches, file ownership, shared locks, merge order, reports, and hidden-subagent rules.',
    whyItMatters: 'Steve needs 2-3 builders working safely without hidden delegation, same-branch/worktree collisions, shared-file overlap, dirty-state ambiguity, or merge conflicts becoming his problem.',
    nextAction: closeCard
      ? `Done under ${PARALLEL_BUILDER_OPERATING_SYSTEM_CLOSEOUT_KEY}. Use the paste-ready prompts and ownership table before launching real parallel builders.`
      : 'Ship the protocol/proof only. Do not launch parallel builders during this card.',
    statusNote: closeCard
      ? `Closed under ${PARALLEL_BUILDER_OPERATING_SYSTEM_CLOSEOUT_KEY}; visible builders only by default, hidden subagents require explicit approval, no builders launched.`
      : `Executing ${PARALLEL_BUILDER_OPERATING_SYSTEM_CLOSEOUT_KEY}; protocol/proof only, no live parallel builder launch.`,
    owner: 'Foundation Process',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  return {
    cardId: PARALLEL_BUILDER_OPERATING_SYSTEM_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
    planRef: PARALLEL_BUILDER_OPERATING_SYSTEM_PLAN_PATH,
    definitionOfDone: 'Live backlog card, plan, approval, protocol doc, paste-ready prompts, ownership table, focused proof, verifier coverage, closeout registry, foundation:verify, and process:foundation-ship are complete without launching parallel builders.',
    proofCommands: PARALLEL_BUILDER_OPERATING_SYSTEM_PROOF_COMMANDS,
    readinessBlockerCleared: 'Build-lane reliability cards shipped or were scoped from repo truth; Steve prioritized visible parallel-builder safety after the Planck hidden-worker confusion.',
    notNextBoundaries: PARALLEL_BUILDER_OPERATING_SYSTEM_NOT_NEXT,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: PARALLEL_BUILDER_OPERATING_SYSTEM_APPROVAL_PATH,
      closeoutKey: PARALLEL_BUILDER_OPERATING_SYSTEM_CLOSEOUT_KEY,
      protocolRef: PARALLEL_BUILDER_OPERATING_SYSTEM_PROTOCOL_PATH,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, stage = 'building_now', planReview } = {}) {
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-parallel-builder-operating-system')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `parallel-builder-operating-system-${stableRunId(PARALLEL_BUILDER_OPERATING_SYSTEM_PLAN_PATH)}`,
        PARALLEL_BUILDER_OPERATING_SYSTEM_CARD_ID,
        PARALLEL_BUILDER_OPERATING_SYSTEM_PLAN_PATH,
        planReview.status,
        planReview.score,
        PARALLEL_BUILDER_OPERATING_SYSTEM_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: PARALLEL_BUILDER_OPERATING_SYSTEM_CARD_ID }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-parallel-builder-operating-system',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        PARALLEL_BUILDER_OPERATING_SYSTEM_CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} ${PARALLEL_BUILDER_OPERATING_SYSTEM_CARD_ID}.`,
        JSON.stringify({ closeoutKey: PARALLEL_BUILDER_OPERATING_SYSTEM_CLOSEOUT_KEY, stage }),
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

async function ensureLiveState({ closeCard = false, stage = 'building_now', planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: PARALLEL_BUILDER_OPERATING_SYSTEM_SCRIPT_PATH,
    operation: 'create/update parallel builder operating system backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage, planReview })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: PARALLEL_BUILDER_OPERATING_SYSTEM_SPRINT_ID,
        status: 'active',
        goal: 'Create the visible parallel builder operating system without launching builders.',
        activeBlockerCardId: closeCard ? null : PARALLEL_BUILDER_OPERATING_SYSTEM_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
          startedBy: 'codex-parallel-builder-operating-system',
          currentStatus: closeCard ? 'complete' : normalizeStage(stage),
          closeoutKey: PARALLEL_BUILDER_OPERATING_SYSTEM_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Use protocol prompts/status table before launching visible parallel builders.'
            : 'Write protocol/proof and keep builders unlaunched.',
          priorityOrder: [PARALLEL_BUILDER_OPERATING_SYSTEM_CARD_ID, 'SPRINT-STATE-MUTATION-AUDIT-001', 'PROCESS-CHECK-READONLY-MODE-001'],
          notNext: PARALLEL_BUILDER_OPERATING_SYSTEM_NOT_NEXT,
          exitCriteria: [
            'Same worktree, same branch, overlapping files, hidden subagent without approval, uncoordinated shared commit, and dirty-no-wrap fixtures fail closed.',
            'Paste-ready prompts and ownership table exist.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage })],
    },
    'codex-parallel-builder-operating-system',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'Steve prioritized visible parallel-builder safety after the Planck hidden-worker confusion.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  const planSource = await readRepoFile(PARALLEL_BUILDER_OPERATING_SYSTEM_PLAN_PATH)
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard, stage: args.stage }),
    changedFiles: PARALLEL_BUILDER_OPERATING_SYSTEM_CHANGED_FILES,
    declaredRisk: 'parallel builder orchestration, hidden-subagent policy, shared-file locks, dirty-state wrap requirements, and no-launch side effects',
    repoRoot,
  })

  const writeRequested = args.apply || args.closeCard || isProcessCheckWriteRequested({
    argv: process.argv.slice(2),
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  if (writeRequested) await ensureLiveState({ closeCard: args.closeCard, stage: args.stage, planReview })

  const [
    approval,
    packageJson,
    moduleSource,
    scriptSource,
    protocolDoc,
    coverageSource,
    processHardeningSource,
    foundationVerifySource,
    closeoutRegistrySource,
    closeoutDocExists,
    cards,
    sprint,
    planCriticRuns,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: PARALLEL_BUILDER_OPERATING_SYSTEM_APPROVAL_PATH, cardId: PARALLEL_BUILDER_OPERATING_SYSTEM_CARD_ID }),
    readRepoFile('package.json').then(JSON.parse),
    readRepoFile('lib/parallel-builder-operating-system.js'),
    readRepoFile(PARALLEL_BUILDER_OPERATING_SYSTEM_SCRIPT_PATH),
    readRepoFile(PARALLEL_BUILDER_OPERATING_SYSTEM_PROTOCOL_PATH),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-process-hardening-verifier.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('lib/foundation-build-closeout-build-lane-records.js'),
    repoFileExists(PARALLEL_BUILDER_OPERATING_SYSTEM_CLOSEOUT_PATH),
    getBacklogItemsByIds([PARALLEL_BUILDER_OPERATING_SYSTEM_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([PARALLEL_BUILDER_OPERATING_SYSTEM_CARD_ID]),
  ])

  const card = cards[0] || null
  const sprintItem = list(sprint?.items).find(item => item.cardId === PARALLEL_BUILDER_OPERATING_SYSTEM_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === PARALLEL_BUILDER_OPERATING_SYSTEM_CLOSEOUT_KEY) || null
  const planCriticPass = list(planCriticRuns).some(run => run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE)
  const protocol = buildParallelBuilderOperatingSystemProtocol()
  const protocolStatus = evaluateParallelBuilderOperatingSystem(protocol)
  const dogfood = buildParallelBuilderOperatingSystemDogfoodProof()
  const hiddenWorkerNeedle = ['spawn_', 'agent('].join('')

  addCheck(checks, approval.ok, 'approval validates at 9.8+', approval.failures?.map(failure => failure.check).join(', ') || PARALLEL_BUILDER_OPERATING_SYSTEM_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', `score=${planReview.score}`)
  addCheck(checks, planCriticPass || writeRequested, 'durable Plan Critic pass row exists', planCriticPass ? 'pass row' : 'created during this run')
  addCheck(checks, Boolean(card), 'live backlog card exists', card ? `${card.id}/${card.lane}` : 'missing')
  addCheck(checks, card ? validateBuildLaneCardScaffold(card).ok : false, 'live backlog card passes scaffold guard', card ? validateBuildLaneCardScaffold(card).missing.join(', ') || 'complete' : 'missing')
  addCheck(checks, Boolean(sprintItem), 'Current Sprint includes operating-system card', sprint?.sprint?.sprintId || 'missing sprint')
  addCheck(checks, sprintItem ? validateBuildLaneSprintItemMetadata(sprintItem).ok : false, 'Current Sprint item metadata is complete', sprintItem ? validateBuildLaneSprintItemMetadata(sprintItem).missing.join(', ') || 'complete' : 'missing')
  addCheck(checks, packageJson.scripts?.['process:parallel-builder-operating-system-check'] === `node --env-file-if-exists=.env ${PARALLEL_BUILDER_OPERATING_SYSTEM_SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:parallel-builder-operating-system-check'] || 'missing')
  addCheck(checks, protocolStatus.ok && protocolStatus.summary.visibleAssignmentCount >= 4, 'healthy visible-builder protocol passes', `${protocolStatus.status}/${protocolStatus.summary.visibleAssignmentCount} visible`)
  addCheck(checks, dogfood.ok, 'dogfood rejects unsafe parallel-builder operating shapes', dogfood.invariant)
  addCheck(checks, dogfood.sameWorktreeRejected && dogfood.sameBranchRejected && dogfood.overlappingOwnershipRejected, 'dogfood rejects worktree, branch, and file collisions', 'fail-closed')
  addCheck(checks, dogfood.hiddenSubagentRejected && dogfood.uncoordinatedSharedCommitRejected && dogfood.dirtyNoWrapRejected, 'dogfood rejects hidden subagent, shared commit, and dirty no-wrap cases', 'fail-closed')
  addCheck(checks, protocolDoc.includes('Orchestrator chat prompt') && protocolDoc.includes('Foundation Builder A prompt') && protocolDoc.includes('Feature/Preflight Builder B prompt') && protocolDoc.includes('Review/Audit Builder C prompt'), 'protocol doc has paste-ready prompts', PARALLEL_BUILDER_OPERATING_SYSTEM_PROTOCOL_PATH)
  addCheck(checks, protocolDoc.includes('| Builder | Chat | Repo/Worktree | Branch | Active Card |'), 'protocol doc has who-owns-what status table format', PARALLEL_BUILDER_OPERATING_SYSTEM_PROTOCOL_PATH)
  addCheck(checks, protocolDoc.includes('Hidden subagents are forbidden by default') && protocolDoc.includes('does not launch parallel builders'), 'protocol doc captures hidden-subagent and no-launch rules', PARALLEL_BUILDER_OPERATING_SYSTEM_PROTOCOL_PATH)
  addCheck(checks, moduleSource.includes('buildParallelBuilderOperatingSystemDogfoodProof') && moduleSource.includes('hiddenSubagentRejected') && moduleSource.includes('dirtyNoWrapRejected'), 'module owns operating-system validator and dogfood', 'lib/parallel-builder-operating-system.js')
  addCheck(checks, Boolean(closeout), 'closeout registry exposes operating-system closeout', closeout ? closeout.key : 'missing')
  addCheck(checks, closeoutRegistrySource.includes(PARALLEL_BUILDER_OPERATING_SYSTEM_CLOSEOUT_KEY) && closeoutRegistrySource.includes(PARALLEL_BUILDER_OPERATING_SYSTEM_CARD_ID), 'build-lane closeout record source includes operating-system card', 'lib/foundation-build-closeout-build-lane-records.js')
  addCheck(checks, closeoutDocExists, 'closeout handoff exists', PARALLEL_BUILDER_OPERATING_SYSTEM_CLOSEOUT_PATH)
  addCheck(checks, coverageSource.includes(PARALLEL_BUILDER_OPERATING_SYSTEM_CARD_ID), 'verifier coverage source includes operating-system card', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, processHardeningSource.includes(PARALLEL_BUILDER_OPERATING_SYSTEM_CARD_ID) && processHardeningSource.includes('buildParallelBuilderOperatingSystemDogfoodProof'), 'process hardening verifier covers operating-system proof', 'lib/foundation-process-hardening-verifier.js')
  addCheck(checks, foundationVerifySource.includes('PARALLEL_BUILDER_WORKTREE_PROTOCOL_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE'), 'foundation:verify receives parallel-builder coverage bundle', 'scripts/foundation-verify.mjs')
  addCheck(checks, !scriptSource.includes(hiddenWorkerNeedle), 'focused proof does not invoke hidden worker tooling', 'clean')

  const failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'fail' : 'pass',
    cardId: PARALLEL_BUILDER_OPERATING_SYSTEM_CARD_ID,
    closeoutKey: PARALLEL_BUILDER_OPERATING_SYSTEM_CLOSEOUT_KEY,
    sprintId: sprint?.sprint?.sprintId || '',
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`Parallel builder operating system check: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
