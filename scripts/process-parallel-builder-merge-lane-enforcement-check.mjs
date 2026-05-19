#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  initFoundationDb,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
import {
  PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_APPROVAL_PATH,
  PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_CARD_ID as CARD_ID,
  PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_CHANGED_FILES,
  PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_CLOSEOUT_KEY as CLOSEOUT_KEY,
  PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_CLOSEOUT_PATH as CLOSEOUT_PATH,
  PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_NEXT_CARD_ID as NEXT_CARD_ID,
  PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_NOT_NEXT,
  PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_PLAN_PATH as PLAN_PATH,
  PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_PROOF_COMMANDS,
  PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_PROTOCOL_PATH as PROTOCOL_PATH,
  PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_SCRIPT_PATH as SCRIPT_PATH,
  PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_SPRINT_ID as SPRINT_ID,
  buildParallelBuilderMergeLaneEnforcementDogfoodProof,
  buildParallelBuilderMergeLaneProtocol,
  evaluateParallelBuilderMergeLaneEnforcement,
} from '../lib/parallel-builder-merge-lane-enforcement.js'
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

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] }),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
  }
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

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

async function repoFileExists(relativePath) {
  try {
    const stat = await fs.stat(path.join(repoRoot, relativePath))
    return stat.isFile()
  } catch {
    return false
  }
}

function cardIds() {
  return [
    CARD_ID,
    NEXT_CARD_ID,
    'PARALLEL-BUILDER-OPERATING-SYSTEM-001',
    'FOUNDATION-MERGE-QUEUE-001',
    'BUILD-LANE-REPEATED-FAILURE-ACTION-GATE-001',
  ]
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: CARD_ID,
    title: 'Enforce merge lanes for parallel Foundation builders',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 2,
    source: 'Steve 2026-05-19: prevent the 108-card branch pileup and upgrade dual/parallel work lanes before parallel work resumes.',
    summary: 'Tie visible builder assignments to a serialized merge queue, post-merge main verification, and blocker handoff so completed work cannot stack outside main.',
    whyItMatters: 'Parallel builders are useful only if finished work reaches main safely. Without this gate, worker velocity can recreate the branch pileup that broke trust last night.',
    nextAction: closeCard
      ? `Done under \`${CLOSEOUT_KEY}\`. Run \`${NEXT_CARD_ID}\` next.`
      : 'Build and prove the merge-lane enforcement gate before any parallel builders resume.',
    statusNote: closeCard
      ? `Closed under \`${CLOSEOUT_KEY}\`; same-worktree, same-branch, overlap, hidden/untracked builder, missing queue entry, simultaneous merge, missing post-merge proof, failed main, 108-card pileup, and blocked-worker continuation dogfood pass.`
      : `Executing \`${CLOSEOUT_KEY}\`; no parallel builders are approved until this gate closes.`,
    owner: 'Foundation Process',
  }
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `parallel-builder-merge-lane-enforcement-${stableRunId(PLAN_PATH)}`,
    result: {
      status: planReview.status,
      score: planReview.score,
      cardId: CARD_ID,
      closeoutKey: CLOSEOUT_KEY,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, planReview } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const row = buildCardRow({ closeCard })
  const planRun = buildPlanCriticRun(planReview)
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
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-parallel-builder-merge-lane-enforcement')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        planRun.runId,
        CARD_ID,
        PLAN_PATH,
        planReview.status,
        planReview.score,
        PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify(planRun.result),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-parallel-builder-merge-lane-enforcement',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} ${CARD_ID}.`,
        JSON.stringify({ closeoutKey: CLOSEOUT_KEY, nextCardId: NEXT_CARD_ID }),
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

function withCardMetadata(item = {}, { closeCard = false } = {}) {
  return {
    ...item,
    cardId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: PLAN_PATH,
    definitionOfDone: 'Visible builders are tied to main session, worker worktree, and review/integration lanes; completed work requires merge queue entry; merges serialize to main; post-merge verification and blocker handoff are enforced by dogfood proof.',
    proofCommands: PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_PROOF_COMMANDS,
    nextAction: closeCard ? `Run ${NEXT_CARD_ID} next.` : 'Close merge-lane enforcement before parallel builders resume.',
    notNextBoundaries: [
      ...PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_NOT_NEXT,
      'Do not work MEETING-VAULT-ACL-001 Phase B.',
      'Do not mutate Drive permissions.',
    ],
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      approvalRef: PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_APPROVAL_PATH,
      gatesParallelBuilders: true,
    },
  }
}

function withNextCardMetadata(item = {}) {
  return {
    ...item,
    cardId: NEXT_CARD_ID,
    stage: item.stage && item.stage !== 'done_this_sprint' ? item.stage : 'scoping',
    definitionOfDone: item.definitionOfDone || 'System-health watch/yellow rows are cleared or classified with owner, reason, threshold, and next action.',
    nextAction: item.nextAction || 'Move Foundation system health from watch/yellow to green or explicit non-misleading classification.',
    notNextBoundaries: item.notNextBoundaries?.length ? item.notNextBoundaries : [
      'Do not start source/extraction activation before health/audit cleanup.',
      'Do not force approval-bound meeting-notes reruns.',
      'Do not mutate Drive permissions.',
      'Do not run live auth/private/paid/provider lanes.',
    ],
    metadata: {
      ...(item.metadata || {}),
      unblockedBy: CARD_ID,
      requiredBeforeSourceActivation: true,
    },
  }
}

function buildSprintItems(previous = {}, { closeCard = false } = {}) {
  const existing = Array.isArray(previous.items) ? previous.items : []
  const items = []
  const seen = new Set()
  for (const item of existing) {
    if (item.cardId === CARD_ID) {
      items.push(withCardMetadata(item, { closeCard }))
      seen.add(CARD_ID)
      continue
    }
    if (item.cardId === NEXT_CARD_ID) {
      if (!seen.has(CARD_ID)) {
        items.push(withCardMetadata({ order: item.order || items.length + 1 }, { closeCard }))
        seen.add(CARD_ID)
      }
      items.push(withNextCardMetadata(item))
      seen.add(NEXT_CARD_ID)
      continue
    }
    items.push(item)
    seen.add(item.cardId)
  }
  if (!seen.has(CARD_ID)) items.push(withCardMetadata({ order: items.length + 1 }, { closeCard }))
  if (closeCard && !seen.has(NEXT_CARD_ID)) items.push(withNextCardMetadata({ order: items.length + 1 }))
  return items.map((item, index) => ({ ...item, order: index + 1 }))
}

async function ensureLiveState({ closeCard = false, planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'create/update parallel builder merge lane enforcement backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await upsertLiveCardAndPlanCritic({ closeCard, planReview })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'Get Foundation fully green, lock main integration discipline, upgrade dual/parallel work lanes, upgrade auditor routing, then resume source/extraction activation.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: closeCard ? 'parallel_builder_merge_lane_enforcement_closed' : 'parallel_builder_merge_lane_enforcement_active',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `Run ${NEXT_CARD_ID} next.`
            : `Finish ${CARD_ID}; no parallel builders resume until this P0 gate closes.`,
          exitCriteria: [
            'Main integration lock is closed and pushed.',
            'Repeated failures are resolved, blocked, or attached to live repair cards.',
            'Parallel builder merge-lane enforcement is closed before any parallel builders resume.',
            'Health/audit cleanup runs before source/extraction activation.',
          ],
        },
      },
      items: buildSprintItems(previous, { closeCard }),
    },
    'codex-parallel-builder-merge-lane-enforcement',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || SPRINT_ID,
      reason: 'Steve made dual/parallel merge-lane enforcement P0 after the 108-card branch pileup.',
    },
  )
}

function containsUnsafeRuntimeCall(source = '') {
  const executableSource = String(source || '').replace(/(['"`])(?:\\.|(?!\1)[\s\S])*\1/g, '')
  const patterns = [
    /\bstartExtractionRun\s*\(/,
    /\bfetchTranscript\s*\(/,
    /\bcreateChatCompletion\s*\(/,
    /\bresponses\.create\s*\(/,
    /\bsendGmail\b/,
    /\bwriteClickUp\b/,
    /\bapplyApprovedActionRoute\s*\(/,
    /\bapproveActionRoute\s*\(/,
    /\brejectActionRoute\s*\(/,
    /\brerouteActionRoute\s*\(/,
    /\bspawn_agent\s*\(/,
  ]
  return patterns.filter(pattern => pattern.test(executableSource)).map(pattern => pattern.source)
}

function summarizeViolations(violations = []) {
  return violations.slice(0, 10).map(item => `${item.ruleId}:${item.detail}`).join('; ')
}

async function main() {
  const args = parseArgs()
  const checks = []
  await initFoundationDb()

  const [
    planSource,
    approval,
  ] = await Promise.all([
    readRepoFile(PLAN_PATH),
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_APPROVAL_PATH,
      cardId: CARD_ID,
    }),
  ])

  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard }),
    changedFiles: PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_CHANGED_FILES,
    declaredRisk: 'parallel builder merge-lane enforcement, main integration discipline, serialized merge queue, and post-merge verification',
    repoRoot,
  })

  if (args.apply || args.closeCard) await ensureLiveState({ closeCard: args.closeCard, planReview })

  const [
    activeSprint,
    cards,
    planCriticRuns,
    packageJson,
    protocolDoc,
    closeoutDoc,
    moduleSource,
    scriptSource,
    processHardeningSource,
    coverageSource,
    closeoutRecordsSource,
    operatingProtocolDoc,
    mergeQueueProtocolDoc,
  ] = await Promise.all([
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds(cardIds()),
    getPlanCriticRunsByCardIds(cardIds()),
    readRepoJson('package.json'),
    readRepoFile(PROTOCOL_PATH),
    readRepoFile(CLOSEOUT_PATH, { optional: true }),
    readRepoFile('lib/parallel-builder-merge-lane-enforcement.js'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/foundation-process-hardening-verifier.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-build-lane-records.js'),
    readRepoFile('docs/process/parallel-builder-operating-system-001-protocol.md'),
    readRepoFile('docs/process/foundation-merge-queue-protocol.md'),
  ])

  const card = cards.find(item => item.id === CARD_ID) || null
  const nextCard = cards.find(item => item.id === NEXT_CARD_ID) || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === CARD_ID) || null
  const nextSprintItem = (activeSprint.items || []).find(item => item.cardId === NEXT_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  const protocolStatus = evaluateParallelBuilderMergeLaneEnforcement(buildParallelBuilderMergeLaneProtocol())
  const dogfood = buildParallelBuilderMergeLaneEnforcementDogfoodProof()
  const sprintCardIds = (activeSprint.items || []).map(item => item.cardId).filter(Boolean)
  const sprintCards = await getBacklogItemsByIds(sprintCardIds)
  const sprintPlanCriticRuns = await getPlanCriticRunsByCardIds(sprintCardIds)
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: activeSprint.sprint,
    items: activeSprint.items,
    backlogItems: sprintCards,
    closeouts: getFoundationBuildCloseouts(),
    planCriticRuns: sprintPlanCriticRuns,
  })
  const unsafeRuntimeHits = [
    ...containsUnsafeRuntimeCall(moduleSource),
    ...containsUnsafeRuntimeCall(scriptSource),
  ]

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || PARALLEL_BUILDER_MERGE_LANE_ENFORCEMENT_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for merge-lane enforcement', buildPlanCriticResultSummary(planReview))
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, card?.priority === 'P0' && (args.closeCard ? card.lane === 'done' : ['executing', 'done'].includes(card?.lane)), 'live backlog card exists and is P0', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'health watch-to-green card remains live next', nextCard ? `${nextCard.lane}/${nextCard.priority}` : 'missing')
  addCheck(checks, activeSprint.sprint?.sprintId === SPRINT_ID, 'Current Sprint remains green/main/audit/source activation sprint', activeSprint.sprint?.sprintId || 'missing')
  addCheck(checks, sprintItem && (args.closeCard ? sprintItem.stage === 'done_this_sprint' : ['building_now', 'done_this_sprint'].includes(sprintItem.stage)), 'Current Sprint includes merge-lane gate in expected stage', sprintItem?.stage || 'missing')
  addCheck(checks, !args.closeCard || activeSprint.sprint?.activeBlockerCardId === NEXT_CARD_ID, 'Current Sprint active blocker advances to health watch-to-green after close', activeSprint.sprint?.activeBlockerCardId || 'missing')
  addCheck(checks, !args.closeCard || nextSprintItem, 'next card remains visible after merge-lane gate closes', nextSprintItem?.stage || 'missing')
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint status remains healthy after gate update', currentSprintStatus.findings?.map(item => `${item.check}:${item.detail}`).join('; ') || 'healthy')
  addCheck(checks, protocolStatus.ok === true && protocolStatus.summary.assignmentCount >= 4, 'merge-lane protocol evaluates healthy', summarizeViolations(protocolStatus.violations) || JSON.stringify(protocolStatus.summary))
  addCheck(checks, dogfood.ok === true, 'dogfood rejects branch-pileup and merge-lane failure modes', dogfood.invariant)
  addCheck(checks, dogfood.sameWorktreeRejected && dogfood.sameBranchRejected && dogfood.overlappingScopeRejected, 'dogfood rejects worktree, branch, and file ownership collisions', 'collision cases')
  addCheck(checks, dogfood.untrackedBuilderRejected && dogfood.missingQueueEntryRejected && dogfood.simultaneousMergesRejected, 'dogfood rejects hidden/untracked builders, missing queue entry, and simultaneous merges', 'queue cases')
  addCheck(checks, dogfood.missingPostMergeVerifyRejected && dogfood.mainFailedNoRepairRejected && dogfood.unmergedPileupRejected, 'dogfood rejects missing post-merge proof, failed main, and 108-card pileup', 'post-merge cases')
  addCheck(checks, dogfood.blockedConflictRejected && dogfood.blockedSafeAccepted, 'dogfood enforces non-conflicting blocker continuation', 'blocked worker cases')
  addCheck(checks, packageJson.scripts?.['process:parallel-builder-merge-lane-enforcement-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:parallel-builder-merge-lane-enforcement-check'] || 'missing')
  addCheck(checks, protocolDoc.includes('Hard Blocks') && protocolDoc.includes('108-card branch pileup') && protocolDoc.includes('Post-Merge Rule'), 'protocol doc names hard blocks and post-merge rule', PROTOCOL_PATH)
  addCheck(checks, operatingProtocolDoc.includes('One visible chat per builder') && mergeQueueProtocolDoc.includes('serializes pushes to main'), 'new gate reuses existing builder OS and merge queue doctrine', 'existing docs')
  addCheck(checks, processHardeningSource.includes('buildParallelBuilderMergeLaneEnforcementDogfoodProof') && processHardeningSource.includes(CARD_ID), 'process hardening verifier covers merge-lane gate', 'lib/foundation-process-hardening-verifier.js')
  addCheck(checks, coverageSource.includes(CARD_ID), 'verifier coverage includes merge-lane card', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, closeoutRecordsSource.includes(CLOSEOUT_KEY) && closeoutRecordsSource.includes(CARD_ID), 'closeout registry source includes merge-lane closeout', 'lib/foundation-build-closeout-build-lane-records.js')
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'build closeout lookup resolves merge-lane gate', closeout?.key || 'missing')
  addCheck(checks, await repoFileExists(CLOSEOUT_PATH), 'closeout handoff exists', CLOSEOUT_PATH)
  addCheck(checks, closeoutDoc.includes(NEXT_CARD_ID) && closeoutDoc.includes('Parallel builders remain unlaunched'), 'closeout states next card and no builder launch', CLOSEOUT_PATH)
  addCheck(checks, moduleSource.split('\n').length < 700, 'merge-lane module stays under preferred size', `${moduleSource.split('\n').length} lines`)
  addCheck(checks, scriptSource.split('\n').length < 700, 'focused proof script stays under preferred size', `${scriptSource.split('\n').length} lines`)
  addCheck(checks, unsafeRuntimeHits.length === 0, 'gate code has no extraction/model/action/external-write calls', unsafeRuntimeHits.join(', ') || 'clean')
  addCheck(checks, !/parallelBuildersLaunched:\s*true|hiddenWorkerSpawns:\s*\[[^\]]+\]/.test(moduleSource), 'default protocol does not launch parallel or hidden workers', 'proposal-only')

  const failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'risk' : 'healthy',
    generatedAt: new Date().toISOString(),
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    protocol: {
      status: protocolStatus.status,
      summary: protocolStatus.summary,
    },
    dogfood: {
      ok: dogfood.ok,
      sameWorktreeRejected: dogfood.sameWorktreeRejected,
      sameBranchRejected: dogfood.sameBranchRejected,
      overlappingScopeRejected: dogfood.overlappingScopeRejected,
      untrackedBuilderRejected: dogfood.untrackedBuilderRejected,
      missingQueueEntryRejected: dogfood.missingQueueEntryRejected,
      simultaneousMergesRejected: dogfood.simultaneousMergesRejected,
      missingPostMergeVerifyRejected: dogfood.missingPostMergeVerifyRejected,
      mainFailedNoRepairRejected: dogfood.mainFailedNoRepairRejected,
      unmergedPileupRejected: dogfood.unmergedPileupRejected,
      blockedConflictRejected: dogfood.blockedConflictRejected,
      blockedSafeAccepted: dogfood.blockedSafeAccepted,
    },
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Parallel Builder Merge Lane Enforcement check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Parallel Builder Merge Lane Enforcement check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
