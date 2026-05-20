#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getFoundationSnapshot,
  initFoundationDb,
  updateBacklogItem,
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
import {
  FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_APPROVAL_PATH,
  FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_CARD_ID,
  FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_CLOSEOUT_KEY,
  FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_MAY20_AUDIT_PATH,
  FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_ORDER,
  FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_PLAN_PATH,
  FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_PROOF_COMMANDS,
  FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_SCRIPT_PATH,
  buildControlPlaneTruthCleanupStatus,
  buildFoundationControlPlaneTruthCleanupCardRow,
  buildFoundationControlPlaneTruthCleanupOverlay,
} from '../lib/foundation-control-plane-truth-cleanup.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-foundation-control-plane-truth-cleanup'
const CHANGED_FILES = [
  'lib/foundation-control-plane-truth-cleanup.js',
  FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_SCRIPT_PATH,
  'scripts/process-current-sprint-active-card-gate-check.mjs',
  'scripts/process-foundation-plan-reconcile-check.mjs',
  FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_PLAN_PATH,
  FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_APPROVAL_PATH,
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'lib/foundation-build-closeout-control-plane-records.js',
  'lib/foundation-verifier-build-log-closeouts.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'package.json',
]

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: String(detail || '') })
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

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

function git(args = []) {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  })
  return String(result.stdout || '').trim()
}

function getGitState() {
  return {
    branch: git(['rev-parse', '--abbrev-ref', 'HEAD']),
    head: git(['rev-parse', 'HEAD']),
    originMain: git(['rev-parse', 'origin/main']),
    porcelain: git(['status', '--short']),
  }
}

async function upsertPlanCriticRun(planReview) {
  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,$9)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result,
            created_at = NOW()
      `,
      [
        `foundation-control-plane-truth-cleanup-${stableRunId(FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_PLAN_PATH)}`,
        FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_CARD_ID,
        FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_PLAN_PATH,
        planReview.status,
        Number(planReview.score),
        CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({
          status: planReview.status,
          score: planReview.score,
          cardId: FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_CARD_ID,
          closeoutKey: FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_CLOSEOUT_KEY,
        }),
        ACTOR,
      ],
    )
  } finally {
    client.release()
    await pool.end()
  }
}

async function applyLiveClose({ activeSprint, foundation, planReview, gitState }) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_SCRIPT_PATH,
    operation: 'close control-plane truth cleanup and replace Current Sprint with Steve ordered control-plane/Brain Fleet queue',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await updateBacklogItem(
    FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_CARD_ID,
    buildFoundationControlPlaneTruthCleanupCardRow({ closeCard: true }),
    ACTOR,
  )
  await upsertPlanCriticRun(planReview)
  await upsertFoundationCurrentSprintOverlay(
    buildFoundationControlPlaneTruthCleanupOverlay({
      closeCard: true,
      currentHead: gitState.head,
      backlogItems: foundation.backlogItems || [],
    }),
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: activeSprint.sprint?.sprintId || '',
      reason: `${FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_CARD_ID} closes control-plane truth cleanup and parks Brain Fleet as the next scoped blocker.`,
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  await initFoundationDb()

  const [
    approval,
    planSource,
    packageJson,
    moduleSource,
    scriptSource,
    activeGateScriptSource,
    reconcileScriptSource,
    closeoutRegistrySource,
    coverageSource,
    may20Audit,
    currentPlan,
    currentState,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_APPROVAL_PATH,
      cardId: FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_CARD_ID,
    }),
    readRepoFile(FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_PLAN_PATH),
    readRepoJson('package.json'),
    readRepoFile('lib/foundation-control-plane-truth-cleanup.js'),
    readRepoFile(FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_SCRIPT_PATH),
    readRepoFile('scripts/process-current-sprint-active-card-gate-check.mjs'),
    readRepoFile('scripts/process-foundation-plan-reconcile-check.mjs'),
    readRepoFile('lib/foundation-build-closeout-control-plane-records.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoJson(FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_MAY20_AUDIT_PATH),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
  ])

  const gitState = getGitState()
  let activeSprint = await getActiveFoundationCurrentSprint()
  let foundation = await getFoundationSnapshot()
  const cardRow = buildFoundationControlPlaneTruthCleanupCardRow({ closeCard: args.closeCard })
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: cardRow,
    changedFiles: CHANGED_FILES,
    declaredRisk: 'Current Sprint live truth, control-plane proof gates, rebuild docs, closeout registry, verifier coverage, and DB-backed sprint overlay mutation',
    repoRoot,
  })

  if (args.closeCard &&
    approval.ok &&
    Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    planReview.status === 'pass' &&
    Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE) {
    await applyLiveClose({ activeSprint, foundation, planReview, gitState })
    activeSprint = await getActiveFoundationCurrentSprint()
    foundation = await getFoundationSnapshot()
  }

  const closeouts = getFoundationBuildCloseouts()
  const status = buildControlPlaneTruthCleanupStatus({
    activeSprint,
    backlogItems: foundation.backlogItems || [],
    closeouts,
    may20Audit,
    currentPlan,
    currentState,
  })
  const cleanupCard = (foundation.backlogItems || []).find(item => item.id === FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_CARD_ID) || null
  const closeout = closeouts.find(record => record.key === FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_CLOSEOUT_KEY) || null

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for control-plane cleanup', buildPlanCriticResultSummary(planReview))
  addCheck(checks, packageJson.scripts?.['process:foundation-control-plane-truth-cleanup-check'] === `node --env-file-if-exists=.env ${FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:foundation-control-plane-truth-cleanup-check'] || 'missing')
  addCheck(checks, moduleSource.includes('buildMay20DeepAuditRoutingStatus') && moduleSource.includes('buildFoundationControlPlaneTruthCleanupOverlay'), 'module owns May 20 audit and Current Sprint cleanup behavior', 'lib/foundation-control-plane-truth-cleanup.js')
  addCheck(checks, scriptSource.includes('assertProcessCheckWriteAllowed') && scriptSource.includes('upsertFoundationCurrentSprintOverlay'), 'focused script uses guarded sprint mutation path', FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_SCRIPT_PATH)
  addCheck(checks, activeGateScriptSource.includes('live Current Sprint active-card gate is healthy') && !activeGateScriptSource.includes('Current Sprint uses the approved overnight sprint id'), 'active-card gate no longer expects stale overnight sprint id', 'scripts/process-current-sprint-active-card-gate-check.mjs')
  addCheck(checks, reconcileScriptSource.includes('active Current Sprint docs match live API truth') && !reconcileScriptSource.includes('live Current Sprint API reports the control-plane sprint'), 'foundation-plan reconcile no longer expects old control-plane sprint as active', 'scripts/process-foundation-plan-reconcile-check.mjs')
  addCheck(checks, closeoutRegistrySource.includes(FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_CLOSEOUT_KEY) && closeout?.backlogIds?.includes(FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_CARD_ID), 'closeout registry resolves control-plane cleanup', closeout?.key || 'missing')
  addCheck(checks, coverageSource.includes(FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_CARD_ID), 'verifier coverage list includes control-plane cleanup card', FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_CARD_ID)
  addCheck(checks, FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_ORDER.every(cardId => (foundation.backlogItems || []).some(item => item.id === cardId)), 'all Steve-order cards resolve to live backlog truth', FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_ORDER.filter(cardId => !(foundation.backlogItems || []).some(item => item.id === cardId)).join(', ') || 'all present')
  addCheck(checks, status.ok, 'control-plane cleanup status is healthy', status.failed.map(item => `${item.check}: ${item.detail}`).join('; ') || 'healthy')
  addCheck(checks, cleanupCard?.lane === 'done', 'cleanup card is done after close', cleanupCard ? `${cleanupCard.id}:${cleanupCard.lane}` : 'missing')
  addCheck(checks, gitState.branch === 'main', 'repo branch posture is main', gitState.branch)
  addCheck(checks, gitState.head === gitState.originMain || Boolean(gitState.porcelain), 'repo is synced or in-flight card has tracked dirty work', gitState.head === gitState.originMain ? 'synced' : 'in-flight')

  const failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'risk' : 'healthy',
    generatedAt: new Date().toISOString(),
    cardId: FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_CARD_ID,
    closeoutKey: FOUNDATION_CONTROL_PLANE_TRUTH_CLEANUP_CLOSEOUT_KEY,
    sprintId: activeSprint.sprint?.sprintId || null,
    activeBlocker: activeSprint.sprint?.activeBlockerCardId || null,
    may20Audit: status.may20AuditRouting.summary,
    activeGate: status.activeGate,
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Foundation control-plane truth cleanup: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Foundation control-plane truth cleanup check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
