#!/usr/bin/env node

import crypto from 'node:crypto'
import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  FOUNDATION_MERGE_QUEUE_APPROVAL_PATH,
  FOUNDATION_MERGE_QUEUE_CARD_ID as CARD_ID,
  FOUNDATION_MERGE_QUEUE_CLOSEOUT_KEY as CLOSEOUT_KEY,
  FOUNDATION_MERGE_QUEUE_CLOSEOUT_PATH as CLOSEOUT_PATH,
  FOUNDATION_MERGE_QUEUE_NOT_NEXT,
  FOUNDATION_MERGE_QUEUE_PLAN_PATH as PLAN_PATH,
  FOUNDATION_MERGE_QUEUE_PROOF_COMMANDS,
  FOUNDATION_MERGE_QUEUE_PROTOCOL_PATH as PROTOCOL_PATH,
  FOUNDATION_MERGE_QUEUE_SCRIPT_PATH as SCRIPT_PATH,
  buildFoundationMergeQueueDogfoodProof,
  evaluateFoundationMergeQueueEntry,
} from '../lib/foundation-merge-queue.js'
import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
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

const execFile = promisify(execFileCallback)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const CHANGED_FILES = [
  'lib/foundation-merge-queue.js',
  SCRIPT_PATH,
  PROTOCOL_PATH,
  PLAN_PATH,
  FOUNDATION_MERGE_QUEUE_APPROVAL_PATH,
  CLOSEOUT_PATH,
  'lib/foundation-build-closeout-process-gate-records.js',
  'scripts/foundation-verify.mjs',
  'package.json',
]

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

async function git(args = []) {
  const { stdout } = await execFile('git', args, { cwd: repoRoot, maxBuffer: 1024 * 1024 })
  return String(stdout || '').trim()
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: CARD_ID,
    title: 'Foundation merge queue',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 0,
    source: 'Steve 2026-05-19 merge-to-main process correction.',
    summary: 'Create the Foundation integration-lane rule so finished cards enter a serialized merge queue instead of piling up on long-lived branches.',
    whyItMatters: 'The Foundation health branch is 108 commits ahead of main. Keep-going momentum cannot mean delaying integration until merge risk becomes Steve’s problem.',
    nextAction: closeCard
      ? 'Merge queue rule is built. Apply it before any further card train: prove branch readiness, merge only if gates are clean, then verify main.'
      : 'Build the integration queue protocol, focused proof, backlog card, approval, and closeout coverage.',
    statusNote: closeCard
      ? `Closed under \`${CLOSEOUT_KEY}\`; long branches without release-train approval are risk, and main merges require clean proof plus post-merge verification.`
      : 'Active process guardrail: do not stack more completed cards before the branch enters the merge/readiness path.',
    owner: 'Foundation Process',
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'create/update Foundation merge queue backlog card and Plan Critic row',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-foundation-merge-queue')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `foundation-merge-queue-${stableRunId(PLAN_PATH)}`,
        CARD_ID,
        PLAN_PATH,
        planReview.status,
        planReview.score,
        CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: CARD_ID }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-foundation-merge-queue',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} ${CARD_ID}.`,
        JSON.stringify({ closeoutKey: CLOSEOUT_KEY }),
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

async function main() {
  const args = parseArgs()
  const checks = []
  const planSource = await readRepoFile(PLAN_PATH)
  const protocolSource = await readRepoFile(PROTOCOL_PATH)
  const closeoutSource = await readRepoFile(CLOSEOUT_PATH)
  const verifierSource = await readRepoFile('scripts/foundation-verify.mjs')
  const processGateCloseoutSource = await readRepoFile('lib/foundation-build-closeout-process-gate-records.js')
  const packageJson = JSON.parse(await readRepoFile('package.json'))
  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: FOUNDATION_MERGE_QUEUE_APPROVAL_PATH,
    cardId: CARD_ID,
  })
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard }),
    changedFiles: CHANGED_FILES,
    declaredRisk: 'branch integration lane, main merge readiness, and Foundation ship process',
    repoRoot,
  })

  await initFoundationDb()
  if (args.apply || args.closeCard) await upsertLiveCardAndPlanCritic({ closeCard: args.closeCard, planReview })
  const [cards, planCriticRuns] = await Promise.all([
    getBacklogItemsByIds([CARD_ID]),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])

  const card = cards.find(item => item.id === CARD_ID) || null
  const currentBranch = await git(['rev-parse', '--abbrev-ref', 'HEAD'])
  const branchSync = await git(['rev-list', '--left-right', '--count', `origin/${currentBranch}...HEAD`]).catch(error => `error:${error.message}`)
  const mainDelta = await git(['rev-list', '--left-right', '--count', 'origin/main...HEAD']).catch(error => `error:${error.message}`)
  const worktreeStatus = await git(['status', '--porcelain'])
  const mergeConflictCheckPassed = /^0\s+\d+$/.test(mainDelta)
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  const dogfood = buildFoundationMergeQueueDogfoodProof()
  const currentQueueState = evaluateFoundationMergeQueueEntry({
    mainDelta,
    branchSynced: branchSync === '0\t0',
    worktreeClean: worktreeStatus.length === 0,
    closeoutExists: Boolean(closeout),
    focusedProofPassed: true,
    fullShipGatePassed: true,
    approvalBoundFalseDone: false,
    blockedCardHoldingSprint: false,
    mergeConflictCheckPassed,
    releaseTrainApproved: false,
  })

  addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || FOUNDATION_MERGE_QUEUE_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && planReview.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for merge queue card', `${planReview.status}/${planReview.score}`)
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, args.closeCard ? card?.lane === 'done' : ['executing', 'done'].includes(card?.lane), 'merge queue card exists in expected lane', card?.lane || 'missing')
  addCheck(checks, dogfood.ok, 'dogfood proves merge queue fails closed', dogfood.invariant)
  addCheck(checks, protocolSource.includes('integration queue') && protocolSource.includes('serializes pushes to main') && protocolSource.includes('verify main') && protocolSource.includes('release train'), 'protocol doc includes queue, merge, verification, and release-train rules', PROTOCOL_PATH)
  addCheck(checks, closeoutSource.includes(CLOSEOUT_KEY) && closeoutSource.includes('108 commits ahead'), 'closeout records current branch integration risk', CLOSEOUT_PATH)
  addCheck(checks, /^0\t\d+$/.test(branchSync), 'branch contains origin branch and can be pushed', branchSync)
  addCheck(checks, /^0\t\d+$/.test(mainDelta), 'branch contains origin/main and can use fast-forward merge lane if gates pass', mainDelta)
  addCheck(checks, currentQueueState.canContinueStacking === false && currentQueueState.findings.some(finding => finding.key === 'long_branch_release_train_risk' || finding.key === 'worktree_clean'), 'current branch is detected as not safe for more card stacking before integration', currentQueueState.status)
  addCheck(checks, packageJson.scripts?.['process:foundation-merge-queue-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:foundation-merge-queue-check'] || 'missing')
  addCheck(checks, processGateCloseoutSource.includes(CLOSEOUT_KEY) && processGateCloseoutSource.includes(CARD_ID), 'closeout registry includes merge queue record', 'lib/foundation-build-closeout-process-gate-records.js')
  addCheck(checks, closeout && (closeout.backlogIds || []).includes(CARD_ID), 'build closeout lookup resolves merge queue closeout', closeout?.key || 'missing')
  addCheck(checks, verifierSource.includes(CARD_ID), 'foundation verifier progression allowlist knows merge queue blocker', 'scripts/foundation-verify.mjs')
  addCheck(checks, await repoFileExists(PROTOCOL_PATH) && await repoFileExists(CLOSEOUT_PATH), 'protocol and closeout artifacts exist', `${PROTOCOL_PATH}, ${CLOSEOUT_PATH}`)
  addCheck(checks, !/git\s+push|git\s+merge|sendGmail|writeClickUp|startExtractionRun\s*\(/.test(planSource + protocolSource), 'card does not perform live merge or external-write side effects', 'protocol and guardrail only')

  const result = {
    status: checks.every(check => check.ok) ? 'healthy' : 'risk',
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    branch: currentBranch,
    branchSync,
    mainDelta,
    currentQueueState,
    dogfood,
    checks,
    failed: checks.filter(check => !check.ok),
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Foundation merge queue check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (result.failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Foundation merge queue check failed.')
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
