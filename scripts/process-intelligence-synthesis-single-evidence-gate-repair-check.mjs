#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { closeFoundationDb } from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import { getFoundationJobDefinition } from '../lib/foundation-jobs.js'
import { buildIntelligenceSynthesisSingleEvidenceGateDogfood } from '../lib/intelligence-synthesis.js'
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

const CARD_ID = 'INTELLIGENCE-SYNTHESIS-SINGLE-EVIDENCE-GATE-REPAIR-001'
const SPRINT_ID = 'intelligence-synthesis-single-evidence-gate-repair-2026-05-18'
const CLOSEOUT_KEY = 'intelligence-synthesis-single-evidence-gate-repair-v1'
const PLAN_PATH = 'docs/process/intelligence-synthesis-single-evidence-gate-repair-001-plan.md'
const APPROVAL_PATH = 'docs/process/approvals/INTELLIGENCE-SYNTHESIS-SINGLE-EVIDENCE-GATE-REPAIR-001.json'
const CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-27-hot-doc-cleanup/2026-05-18-intelligence-synthesis-single-evidence-gate-repair-closeout.md'
const SCRIPT_PATH = 'scripts/process-intelligence-synthesis-single-evidence-gate-repair-check.mjs'
const NEXT_CARD_ID = 'FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001'
const CHANGED_FILES = [
  'lib/intelligence-synthesis.js',
  'lib/foundation-verify-coverage-card-ids.js',
  SCRIPT_PATH,
  'lib/foundation-build-closeout-intelligence-records.js',
  'lib/foundation-build-closeout-records.js',
  'package.json',
  PLAN_PATH,
  APPROVAL_PATH,
  CLOSEOUT_PATH,
]
const PROOF_COMMANDS = [
  'node --check lib/intelligence-synthesis.js scripts/process-intelligence-synthesis-single-evidence-gate-repair-check.mjs',
  'npm run process:intelligence-synthesis-single-evidence-gate-repair-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:foundation-ship -- --card=INTELLIGENCE-SYNTHESIS-SINGLE-EVIDENCE-GATE-REPAIR-001 --planApprovalRef=docs/process/approvals/INTELLIGENCE-SYNTHESIS-SINGLE-EVIDENCE-GATE-REPAIR-001.json --closeoutKey=intelligence-synthesis-single-evidence-gate-repair-v1 --commitRef=HEAD',
]
const NOT_NEXT = [
  'Do not work MEETING-VAULT-ACL-001 Phase B or historical Meeting Vault cleanup from this sprint.',
  'Do not mutate Google Drive permissions.',
  'Do not run Slack sync or Slack extraction.',
  'Do not run live extraction.',
  'Do not send Gmail, ClickUp, Drive, or Agent Feedback mutations.',
  'Do not weaken SYNTHESIS-VERIFY-001.',
  'Do not hide remaining operational-write red rows.',
  'Do not launch hidden subagents or parallel builders.',
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

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: CARD_ID,
    title: 'Intelligence Synthesis Single Evidence Gate Repair',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P0',
    rank: 908,
    source: 'Steve 2026-05-18 continuous-builder priority: remaining P0 audit/process failures before feature work.',
    summary: 'Repair synthesis classification so under-supported Strategy-looking clusters stay operational instead of tripping SYNTHESIS-VERIFY-001 during scheduled refresh.',
    whyItMatters: 'A scheduled P0 synthesis refresh failed because the generator produced a Strategy-grade item with only one evidence chunk. The verifier was right to block it; the generator must fail closed earlier.',
    nextAction: closeCard
      ? `Done under ${CLOSEOUT_KEY}. Remaining Slack operational-write red rows are approval-bound; continue next safe Foundation-up work from repo truth.`
      : 'Repair the classifier, prove the single-evidence failure mode, reconcile the read-only verifier job, and do not run Slack/live extraction jobs.',
    statusNote: closeCard
      ? `Closed under ${CLOSEOUT_KEY}; single-evidence Strategy claims are downgraded before verifier blocking, with no live extraction or Slack rerun.`
      : `Executing ${CLOSEOUT_KEY}; code-only synthesis classification repair, no external writes.`,
    owner: 'Foundation Intelligence',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  return {
    cardId: CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
    planRef: PLAN_PATH,
    definitionOfDone: 'Synthesis classification requires multi-evidence and multi-chunk support before Strategy eligibility; dogfood recreates the single-evidence Strategy failure and proves it downgrades cleanly; no Slack/live extraction/external writes run; foundation:verify and process:foundation-ship pass.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: 'Build-lane verifier/telemetry are green; remaining P0 process work exposed a safe local synthesis classifier mismatch.',
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: {
      existingCode: 'Reuse intelligence synthesis clustering, SYNTHESIS-VERIFY-001, System Health scheduled-job surfacing, job mutation allowlist, and Foundation ship gates.',
      existingDocs: 'Reuse System Health red-row doctrine and intelligence spine verifier contracts.',
      existingScripts: 'Reuse foundation:verify, backlog:hygiene, process:foundation-ship, Plan Critic, approval integrity, and process write guard.',
      existingPolicy: 'Strategy-grade synthesis requires source-backed evidence; operational-write jobs need explicit approval before live rerun.',
      exactGap: 'The generator could mark a cluster strategyHubEligible with only one evidence chunk, making the scheduled refresh fail when the verifier blocked it.',
      reused: 'Existing verifier remains strict; this card changes classification before verification instead of weakening the verifier.',
      notRebuilt: 'No extraction runtime, Slack sync, LLM route, Action Router, Strategy Hub, or UI rebuild.',
      overBroadRisk: 'This can drift into live source repair; this card only repairs local classifier gating and documents approval-bound rows.',
      readyBy: 'Steve prioritized remaining P0 process failures after verifier and telemetry went green.',
      readyAt: '2026-05-18T14:12:00-04:00',
    },
    metadata: {
      approvalRef: APPROVAL_PATH,
      closeoutKey: CLOSEOUT_KEY,
    },
  }
}

function buildNextSprintItem() {
  return {
    cardId: NEXT_CARD_ID,
    order: 2,
    stage: 'scoping',
    planRef: null,
    definitionOfDone: 'Agent usefulness runtime gates are scoped with live-answer preflight, capability registry, action permission contract, stale-data warning, source-backed status claim guard, failure visibility, and proof that prompt-only rules are rejected.',
    proofCommands: [
      'scope-first: create plan/approval/proof before implementation',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    readinessBlockerCleared: 'Safe P0 process repair completed; approval-bound operational-write rows are not rerun by hidden side effect.',
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: {
      existingCode: 'Reuse source-contract trust, runtime gates, process write guards, and agent status freshness lessons.',
      existingPolicy: 'Prompt-only rules are not enough; important agent behavior must be runtime-enforced.',
      exactGap: 'Agents can still sound current or capable without code-enforced live checks and capability truth.',
      notRebuilt: 'No Harlan UI, no feature work, no live extraction, no external writes, and no hidden subagents.',
    },
    metadata: {
      inheritedFrom: CARD_ID,
      nextAfterCloseoutKey: CLOSEOUT_KEY,
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-synthesis-single-evidence-gate')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `synthesis-single-evidence-gate-${stableRunId(PLAN_PATH)}`,
        CARD_ID,
        PLAN_PATH,
        planReview?.status || 'pass',
        Number(planReview?.score || 10),
        CHANGED_FILES,
        JSON.stringify(planReview?.findings || []),
        JSON.stringify(planReview || {}),
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

async function ensureLiveState({ closeCard = false, stage = 'building_now', planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'create/update synthesis single-evidence repair card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage, planReview })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'Repair the safe local synthesis classifier mismatch behind a P0 scheduled-job red row without running approval-bound source jobs.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
          startedBy: 'codex-synthesis-single-evidence-gate',
          currentStatus: closeCard ? 'next_scoping' : normalizeStage(stage),
          closeoutKey: CLOSEOUT_KEY,
          nextAction: closeCard
            ? `Commit/push, then continue ${NEXT_CARD_ID} or root cleanup from repo truth.`
            : 'Repair local synthesis classification, prove the single-evidence gate, and avoid live Slack/extraction reruns.',
          priorityOrder: [CARD_ID, NEXT_CARD_ID],
          notNext: NOT_NEXT,
          exitCriteria: [
            'Single-evidence Strategy-looking clusters stay operational.',
            'Multi-evidence, multi-chunk clusters can still become Strategy eligible.',
            'SYNTHESIS-VERIFY-001 remains strict.',
            'Slack operational-write red rows are not rerun in this card.',
            'foundation:verify and process:foundation-ship pass.',
          ],
        },
      },
      items: closeCard ? [buildSprintItem({ closeCard, stage }), buildNextSprintItem()] : [buildSprintItem({ closeCard, stage })],
    },
    'codex-synthesis-single-evidence-gate',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'Steve prioritized remaining P0 process failures and this card is the safe no-extraction repair slice.',
    },
  )
}

async function latestJobRows(jobKeys = []) {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT DISTINCT ON (job_key)
          run_id, job_key, status, started_at, finished_at, error_message
        FROM foundation_job_runs
        WHERE job_key = ANY($1)
        ORDER BY job_key, COALESCE(finished_at, started_at) DESC
      `,
      [jobKeys],
    )
    return result.rows
  } finally {
    await pool.end()
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const planSource = await readRepoFile(PLAN_PATH)
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard, stage: args.stage }),
    changedFiles: CHANGED_FILES,
    declaredRisk: 'intelligence synthesis Strategy eligibility classification and scheduled-job health',
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
    scriptSource,
    synthesisSource,
    verificationSource,
    closeoutRegistrySource,
    closeoutDoc,
    closeoutDocExists,
    cards,
    sprint,
    planCriticRuns,
    jobRows,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile('package.json').then(JSON.parse),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/intelligence-synthesis.js'),
    readRepoFile('lib/synthesis-claim-verification.js'),
    readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
    readRepoFile(CLOSEOUT_PATH),
    repoFileExists(CLOSEOUT_PATH),
    getBacklogItemsByIds([CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([CARD_ID]),
    latestJobRows(['foundation-verify', 'intelligence-synthesis-spine-refresh', 'slack-extract-latest', 'slack-sync-current']),
  ])
  const dogfood = buildIntelligenceSynthesisSingleEvidenceGateDogfood()
  const card = cards.find(item => item.id === CARD_ID) || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  const latestFoundationVerify = jobRows.find(row => row.job_key === 'foundation-verify') || null
  const latestSynthesis = jobRows.find(row => row.job_key === 'intelligence-synthesis-spine-refresh') || null
  const latestSlackExtract = jobRows.find(row => row.job_key === 'slack-extract-latest') || null
  const latestSlackSync = jobRows.find(row => row.job_key === 'slack-sync-current') || null
  const slackExtractDefinition = getFoundationJobDefinition('slack-extract-latest')
  const slackSyncDefinition = getFoundationJobDefinition('slack-sync-current')
  const forbiddenProcessTokens = [
    ['node:', 'child_process'].join(''),
    ['spawn', '('].join(''),
    ['exec', 'File('].join(''),
    ['run', 'FoundationJob('].join(''),
  ]

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(failure => failure.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', buildPlanCriticResultSummary(planReview))
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, card?.priority === 'P0' && ['executing', 'done'].includes(card?.lane), 'live backlog card exists and is staged', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, sprint.sprint?.sprintId === SPRINT_ID && sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint carries repair card while active', sprint.sprint ? `${sprint.sprint.sprintId}:${sprintItem?.stage || 'missing'}` : 'missing sprint')
  addCheck(checks, dogfood.ok === true, 'dogfood recreates single-evidence Strategy claim and downgrades it before verifier block', JSON.stringify(dogfood.singleChunk || {}))
  addCheck(checks, dogfood.singleChunk?.strategyItemCount === 0 && !(dogfood.singleChunk?.blockedReasons || []).includes('single_evidence_strategy_claim'), 'single evidence cluster stays operational and verifies cleanly', JSON.stringify(dogfood.singleChunk || {}))
  addCheck(checks, dogfood.multiChunk?.strategyItemCount >= 1 && !(dogfood.multiChunk?.blockedReasons || []).length, 'multi-evidence multi-chunk cluster can still become Strategy eligible', JSON.stringify(dogfood.multiChunk || {}))
  addCheck(checks, synthesisSource.includes('strategyGradeSupport') && synthesisSource.includes('evidenceChunkRefs.length >= 2'), 'synthesis classifier checks evidence chunk support before Strategy eligibility', 'lib/intelligence-synthesis.js')
  addCheck(checks, verificationSource.includes('single_evidence_strategy_claim') && verificationSource.includes("claimClass === 'strategy_grade'"), 'SYNTHESIS-VERIFY-001 remains strict for Strategy-grade claims', 'lib/synthesis-claim-verification.js')
  addCheck(checks, latestFoundationVerify?.status === 'succeeded', 'read-only foundation-verify scheduled job has fresh success after stale failure', latestFoundationVerify ? `${latestFoundationVerify.run_id}/${latestFoundationVerify.status}` : 'missing latest foundation-verify run')
  addCheck(checks, latestSynthesis?.status === 'failed' && String(latestSynthesis.error_message || '').includes('runGovernedSynthesis'), 'pre-repair synthesis scheduled failure is classified without live rerun', latestSynthesis ? `${latestSynthesis.run_id}/${latestSynthesis.status}` : 'missing synthesis failure')
  addCheck(checks, slackExtractDefinition?.mutationPosture === 'operational_write' && slackSyncDefinition?.mutationPosture === 'operational_write', 'Slack red rows are approval-bound operational-write jobs', `${slackExtractDefinition?.mutationPosture || 'missing'}/${slackSyncDefinition?.mutationPosture || 'missing'}`)
  addCheck(checks, latestSlackExtract?.status === 'failed' && latestSlackSync?.status === 'failed', 'Slack failed rows remain visible and were not hidden by this card', `${latestSlackExtract?.status || 'missing'}/${latestSlackSync?.status || 'missing'}`)
  addCheck(checks, !forbiddenProcessTokens.some(token => scriptSource.includes(token)), 'focused proof does not launch live extraction or external-write jobs', SCRIPT_PATH)
  addCheck(checks, packageJson.scripts?.['process:intelligence-synthesis-single-evidence-gate-repair-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:intelligence-synthesis-single-evidence-gate-repair-check'] || 'missing')
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'closeout registry record is registered', closeout?.key || 'missing')
  addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeoutRegistrySource.includes(CARD_ID), 'closeout registry source contains card and closeout key', 'lib/foundation-build-closeout-intelligence-records.js')
  addCheck(checks, closeoutDocExists && closeoutDoc.includes('No Slack sync') && closeoutDoc.includes('approval-bound'), 'closeout handoff documents side-effect boundaries', CLOSEOUT_PATH)
  addCheck(checks, synthesisSource.split('\n').length < 1500, 'intelligence synthesis module remains under preferred budget', `${synthesisSource.split('\n').length} lines`)

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'fail' : 'pass',
    cardId: CARD_ID,
    sprintId: SPRINT_ID,
    closeoutKey: CLOSEOUT_KEY,
    checkCount: checks.length,
    failedCount: failed.length,
    dogfood,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`${CARD_ID} check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  }

  if (failed.length) process.exitCode = 1
  await closeFoundationDb()
}

main().catch(async error => {
  try {
    await closeFoundationDb()
  } catch {}
  console.error(error?.stack || error?.message || String(error))
  process.exitCode = 1
})
