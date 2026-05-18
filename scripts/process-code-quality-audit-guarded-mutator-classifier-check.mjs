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
  CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_APPROVAL_PATH,
  CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CARD_ID,
  CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CHANGED_FILES,
  CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CLOSEOUT_KEY,
  CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CLOSEOUT_PATH,
  CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_EXIT_CRITERIA,
  CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_NOT_NEXT,
  CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_PLAN_PATH,
  CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_PROOF_COMMANDS,
  CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_SCRIPT_PATH,
  CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_SPRINT_ID,
  buildCodeQualityAuditGuardedMutatorClassifierProof,
  buildCodeQualityAuditGuardedMutatorExistingWorkCheck,
} from '../lib/code-quality-audit-guarded-mutator-classifier.js'
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
  buildPlanCriticResultSummary,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  evaluateSprintCheckHistoricalMode,
} from '../lib/sprint-check-historical-mode.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false, apply: false, closeCard: false }
  for (const rawArg of argv) {
    const arg = String(rawArg || '')
    if (arg === '--json' || arg === '--json=true') args.json = true
    if (arg === '--apply' || arg === '--apply=true') args.apply = true
    if (arg === '--close-card' || arg === '--close-card=true') args.closeCard = true
  }
  return args
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

function buildCardRow(closeCard = false) {
  return {
    id: CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CARD_ID,
    title: 'Code quality audit guarded mutator classifier',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 26,
    source: 'Steve 2026-05-18 priority order: remaining P0 audit/process failures after verifier snapshot wiring repair.',
    summary: 'Teach the Code Quality Nightly Audit to reuse the existing process-check readonly classifier so guarded process-check mutators stop appearing as P0 false positives while unguarded and non-process mutators stay red.',
    whyItMatters: 'Steve needs the audit priority list to point at real process risk. Ninety-nine protected process-check rows drowned out the remaining real P0 failures and slowed the Foundation queue.',
    nextAction: closeCard
      ? `Done under ${CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CLOSEOUT_KEY}. Continue remaining P0 audit/process failures from repo truth.`
      : 'Run focused classifier proof, code-quality audit no-write proof, foundation:verify, and process:foundation-ship; do not auto-fix other audit findings.',
    statusNote: closeCard
      ? `Closed under ${CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CLOSEOUT_KEY}; guarded process-check false positives are removed, real mutators still fail.`
      : `Executing ${CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CLOSEOUT_KEY}; audit classifier repair only.`,
    owner: 'Foundation Process',
  }
}

function buildSprintItem(closeCard = false) {
  return {
    cardId: CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_PLAN_PATH,
    definitionOfDone: 'Guarded process-check mutator fixtures produce zero audit findings, unguarded process-check and non-process mutator fixtures still produce findings, the real no-write audit drops protected process-check P0 false positives, and full Foundation ship gates pass.',
    proofCommands: CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_PROOF_COMMANDS,
    readinessBlockerCleared: 'BUILD-LANE-VERIFIER-SNAPSHOT-WIRING-REPAIR-001 shipped green; remaining P0 audit/process failures are now the active priority.',
    notNextBoundaries: CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_NOT_NEXT,
    existingWorkCheck: buildCodeQualityAuditGuardedMutatorExistingWorkCheck(),
    metadata: {
      approvalRef: CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_APPROVAL_PATH,
      closeoutKey: CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CLOSEOUT_KEY,
    },
  }
}

async function upsertLiveState({ closeCard = false, planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_SCRIPT_PATH,
    operation: 'create/update audit classifier backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const pool = createPool()
  const client = await pool.connect()
  const row = buildCardRow(closeCard)
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-code-quality-audit-guarded-mutator-classifier')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `code-quality-audit-guarded-mutator-classifier-${stableRunId(CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_PLAN_PATH)}`,
        CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CARD_ID,
        CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_PLAN_PATH,
        planReview.status,
        planReview.score,
        CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CARD_ID }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-code-quality-audit-guarded-mutator-classifier',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} ${CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CARD_ID}.`,
        JSON.stringify({ closeoutKey: CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CLOSEOUT_KEY, lane: row.lane }),
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

  const previous = await getActiveFoundationCurrentSprint()
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_SPRINT_ID,
        status: 'active',
        goal: 'Remove guarded process-check false positives from the Code Quality Nightly Audit while preserving red findings for real unguarded mutators.',
        activeBlockerCardId: closeCard ? null : CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : 'building_now',
          startedBy: 'codex-code-quality-audit-guarded-mutator-classifier',
          currentStatus: closeCard ? 'complete' : 'building',
          closeoutKey: CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Commit/push this audit classifier repair, then continue the remaining P0 audit/process queue from repo truth.'
            : 'Finish guarded mutator classifier proof and ship gates.',
          exitCriteria: CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_EXIT_CRITERIA,
          priorityOrder: [CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CARD_ID],
          notNext: CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_NOT_NEXT,
        },
      },
      items: [buildSprintItem(closeCard)],
    },
    'codex-code-quality-audit-guarded-mutator-classifier',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_SPRINT_ID,
      reason: 'Steve ordered continuous Foundation builder work on remaining P0 audit/process failures.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  const planSource = await readRepoFile(CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_PLAN_PATH)
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: { id: CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CARD_ID, priority: 'P0' },
    changedFiles: CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
    repoRoot,
  })

  if (args.apply || args.closeCard || isProcessCheckWriteRequested({ argv: process.argv.slice(2) })) {
    await upsertLiveState({ closeCard: args.closeCard, planReview })
  }

  const [
    approval,
    cards,
    sprint,
    planCriticRuns,
    proof,
    packageSource,
    scriptSource,
    moduleSource,
    auditSource,
    closeoutSource,
    closeoutDoc,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_APPROVAL_PATH,
      cardId: CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CARD_ID,
    }),
    getBacklogItemsByIds([CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CARD_ID]),
    buildCodeQualityAuditGuardedMutatorClassifierProof({ repoRoot }),
    readRepoFile('package.json'),
    readRepoFile(CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_SCRIPT_PATH),
    readRepoFile('lib/code-quality-audit-guarded-mutator-classifier.js'),
    readRepoFile('lib/code-quality-nightly-audit.js'),
    readRepoFile('lib/foundation-build-closeout-control-plane-records.js'),
    readRepoFile(CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CLOSEOUT_PATH),
  ])
  const packageJson = JSON.parse(packageSource)
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CLOSEOUT_KEY) || null
  const card = cards[0] || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CARD_ID) || null
  const sprintProofMode = evaluateSprintCheckHistoricalMode({
    activeSprint: sprint,
    card,
    closeouts: getFoundationBuildCloseouts(),
    cardId: CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CARD_ID,
    expectedSprintId: CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_SPRINT_ID,
    closeoutKey: CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CLOSEOUT_KEY,
  })
  const planCriticPass = planCriticRuns.some(run =>
    run.cardId === CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CARD_ID &&
      run.status === 'pass' &&
      Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )
  const cardScaffold = validateBuildLaneCardScaffold(card || {})
  const sprintMetadata = validateBuildLaneSprintItemMetadata(sprintItem || {})

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(failure => failure.check).join(', ') || CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', buildPlanCriticResultSummary(planReview))
  addCheck(checks, cardScaffold.ok, 'live backlog card scaffold is complete', cardScaffold.missing.join(', ') || `${card?.id}:${card?.lane}`)
  addCheck(checks, sprintProofMode.ok === true, 'current or historical sprint proof validates classifier card', `${sprintProofMode.mode}: ${sprintProofMode.reason}`)
  addCheck(checks, sprintProofMode.mode === 'historical_closeout' || sprintMetadata.ok, 'Current Sprint item has required metadata while active', sprintProofMode.mode === 'historical_closeout' ? 'historical closeout' : sprintMetadata.missing.join(', ') || sprintItem?.stage || 'missing')
  addCheck(checks, planCriticPass, 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, proof.ok === true, 'dogfood proves guarded mutators are skipped and unguarded mutators stay red', JSON.stringify({
    guarded: proof.guardedProcessCheckCount,
    unguarded: proof.unguardedProcessCheckCount,
    nonProcess: proof.nonProcessMutatorCount,
    p0: proof.auditSummary?.p0,
    processCheckReadonlyFindingCount: proof.processCheckReadonlyFindingCount,
  }))
  addCheck(checks, proof.protectedProcessCheckFalsePositiveCount === 0, 'real audit has zero protected process-check false positives', String(proof.protectedProcessCheckFalsePositiveCount))
  addCheck(checks, proof.processCheckReadonlyFindingCount <= 1, 'real audit leaves only the remaining non-process readonly-mode finding', String(proof.processCheckReadonlyFindingCount))
  addCheck(checks, auditSource.includes('classifyProcessCheckSource') && auditSource.includes('processCheckClassification.protected === true'), 'audit detector consumes process-check classifier protected status', 'lib/code-quality-nightly-audit.js')
  addCheck(checks, packageJson.scripts?.['process:code-quality-audit-guarded-mutator-classifier-check'] === `node --env-file-if-exists=.env ${CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:code-quality-audit-guarded-mutator-classifier-check'] || 'missing')
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CARD_ID), 'closeout registry owns this card', closeout?.key || 'missing')
  addCheck(checks, closeoutSource.includes(CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CLOSEOUT_KEY), 'control-plane closeout source includes closeout key', CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CLOSEOUT_KEY)
  addCheck(checks, await repoFileExists(CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CLOSEOUT_PATH), 'closeout handoff exists', CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CLOSEOUT_PATH)
  addCheck(checks, closeoutDoc.includes(CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CLOSEOUT_KEY) && closeoutDoc.includes('remaining P0 audit/process'), 'closeout states shipped key and next work', CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CLOSEOUT_PATH)
  addCheck(checks, scriptSource.split('\n').length < 500, 'focused proof script stays under module budget', `${scriptSource.split('\n').length} lines`)
  addCheck(checks, moduleSource.split('\n').length < 300, 'classifier proof module stays under module budget', `${moduleSource.split('\n').length} lines`)

  await closeFoundationDb()

  const failed = checks.filter(check => !check.ok)
  const summary = {
    status: failed.length ? 'fail' : 'pass',
    generatedAt: new Date().toISOString(),
    cardId: CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CARD_ID,
    closeoutKey: CODE_QUALITY_AUDIT_GUARDED_MUTATOR_CLASSIFIER_CLOSEOUT_KEY,
    sprintId: sprint.sprint?.sprintId || null,
    checkCount: checks.length,
    failedCount: failed.length,
    proof,
  }

  if (args.json) {
    console.log(JSON.stringify({ ...summary, checks, failed }, null, 2))
  } else {
    console.log('Code quality audit guarded mutator classifier check')
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
  console.error(error instanceof Error ? error.stack : String(error))
  process.exit(1)
})
