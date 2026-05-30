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
  FOUNDATION_BRANCH_MERGE_READINESS_APPROVAL_PATH,
  FOUNDATION_BRANCH_MERGE_READINESS_CARD_ID as CARD_ID,
  FOUNDATION_BRANCH_MERGE_READINESS_CLOSEOUT_KEY as CLOSEOUT_KEY,
  FOUNDATION_BRANCH_MERGE_READINESS_CLOSEOUT_PATH as CLOSEOUT_PATH,
  FOUNDATION_BRANCH_MERGE_READINESS_NOT_NEXT,
  FOUNDATION_BRANCH_MERGE_READINESS_PLAN_PATH as PLAN_PATH,
  FOUNDATION_BRANCH_MERGE_READINESS_PROOF_COMMANDS,
  FOUNDATION_BRANCH_MERGE_READINESS_SCRIPT_PATH as SCRIPT_PATH,
  FOUNDATION_BRANCH_MERGE_READINESS_SPRINT_ID as SPRINT_ID,
  buildFoundationBranchMergeReadinessDogfoodProof,
} from '../lib/foundation-branch-merge-readiness.js'
import {
  FOUNDATION_MERGE_QUEUE_APPROVAL_PATH,
  FOUNDATION_MERGE_QUEUE_CARD_ID,
  FOUNDATION_MERGE_QUEUE_CLOSEOUT_KEY,
  FOUNDATION_MERGE_QUEUE_CLOSEOUT_PATH,
  FOUNDATION_MERGE_QUEUE_PLAN_PATH,
  FOUNDATION_MERGE_QUEUE_PROTOCOL_PATH,
  FOUNDATION_MERGE_QUEUE_SCRIPT_PATH,
} from '../lib/foundation-merge-queue.js'
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
import {
  getFoundationJobRunSnapshot,
  updateFoundationJobRunMetadata,
} from '../lib/foundation-runtime-jobs-db.js'
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
const SECURITY_CARD_ID = 'SECURITY-PROVIDER-ROTATION-PROOF-001'
const SECURITY_CLOSEOUT_KEY = 'security-provider-rotation-proof-preflight-v1'
const ARCHIVED_COLD_HANDOFFS = [
  'docs/_archive/handoffs/2026-05-12-next-leg-chat-checkpoint.md',
  'docs/_archive/handoffs/2026-05-12-foundation-audit-reset-sprint-closeout.md',
  'docs/_archive/handoffs/2026-05-13-source-truth-guardrails-sprint-handoff.md',
  'docs/_archive/handoffs/2026-05-13-strategy-chat-checkpoint-build-intel-code-quality.md',
  'docs/_archive/handoffs/2026-05-14-fresh-codex-next-sprint-handoff.md',
  'docs/_archive/handoffs/2026-05-15-foundation-main-chat-checkpoint.md',
  'docs/_archive/handoffs/system-health-2026-05-17.json',
]
const HOT_COLD_HANDOFFS = ARCHIVED_COLD_HANDOFFS.map(filePath => filePath.replace('docs/_archive/handoffs/', 'docs/handoffs/'))

const CHANGED_FILES = [
  'lib/foundation-branch-merge-readiness.js',
  SCRIPT_PATH,
  'lib/foundation-merge-queue.js',
  FOUNDATION_MERGE_QUEUE_SCRIPT_PATH,
  'lib/foundation-system-health.js',
  'scripts/foundation-verify.mjs',
  'scripts/process-verification-runs-check.mjs',
  'lib/foundation-build-closeout-process-gate-records.js',
  'package.json',
  PLAN_PATH,
  FOUNDATION_BRANCH_MERGE_READINESS_APPROVAL_PATH,
  CLOSEOUT_PATH,
  FOUNDATION_MERGE_QUEUE_PLAN_PATH,
  FOUNDATION_MERGE_QUEUE_PROTOCOL_PATH,
  FOUNDATION_MERGE_QUEUE_APPROVAL_PATH,
  FOUNDATION_MERGE_QUEUE_CLOSEOUT_PATH,
  ...ARCHIVED_COLD_HANDOFFS,
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

function countLinesForVerifier(source = '') {
  return String(source || '').split('\n').length
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: CARD_ID,
    title: 'Foundation branch merge readiness and health green',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 1,
    source: 'Steve 2026-05-19 branch/main/system-health cleanup mission.',
    summary: 'Route approval-bound security and health rows honestly, prove the Foundation branch is clean, and produce the explicit merge-readiness decision before main is touched.',
    whyItMatters: 'The Foundation branch is 108 commits ahead of main. Steve needs tomorrow morning clean, with branch truth verified and no returned security or live-extraction boundary falsely blocking the build lane.',
    nextAction: closeCard
      ? 'Branch merge-readiness proof is complete. Merge to main only after the recorded gates remain green at the merge decision point.'
      : 'Finish safe health repairs, keep approval-bound rows blocked with owners/next actions, run full branch gates, then make the explicit merge decision.',
    statusNote: closeCard
      ? `Closed under \`${CLOSEOUT_KEY}\`. Security provider rotation remains returned/approval-bound; meeting extraction rerun is blocked pending Steve approval; branch gates are recorded in the closeout.`
      : 'Active merge-readiness sprint. Do not merge until focused proof, backlog hygiene, foundation:verify, build-lane telemetry, and process:foundation-ship are green.',
    owner: 'Foundation Process',
  }
}

function buildSprintItems({ closeCard = false } = {}) {
  const items = [
    {
      cardId: CARD_ID,
      order: 1,
      stage: closeCard ? 'done_this_sprint' : 'building_now',
      planRef: PLAN_PATH,
      definitionOfDone: 'Security provider proof is returned without blocking the build lane, safe system-health rows are repaired or routed, branch verification gates pass, and the closeout records the exact merge decision.',
      proofCommands: FOUNDATION_BRANCH_MERGE_READINESS_PROOF_COMMANDS,
      nextAction: closeCard
        ? 'Run final branch ship gate, then merge to main only if the branch remains clean and verified.'
        : 'Finish branch proof, then make the explicit merge decision.',
      readinessBlockerCleared: 'SECURITY-PROVIDER-ROTATION-PROOF-001 has a no-secret preflight closeout but still needs provider-side owner proof, so it is not eligible to remain the active build blocker.',
      notNextBoundaries: FOUNDATION_BRANCH_MERGE_READINESS_NOT_NEXT,
      existingWorkCheck: {
        existingCode: [
          'lib/foundation-current-sprint.js',
          'lib/foundation-system-health.js',
          'scripts/foundation-verify.mjs',
          'scripts/process-foundation-ship.mjs',
        ],
        existingDocs: [
          'docs/process/security-provider-rotation-proof-preflight-001-plan.md',
          'docs/handoffs/2026-05-18-security-provider-rotation-proof-preflight.md',
          'docs/process/foundation-merge-queue-protocol.md',
        ],
        existingScripts: [
          'scripts/process-foundation-merge-queue-check.mjs',
          'scripts/process-verification-runs-check.mjs',
          'scripts/process-build-lane-failure-telemetry-check.mjs',
        ],
        existingPolicy: [
          'Provider-side proof cannot be inferred from repo cleanup.',
          'Live extraction and external writes require explicit approval.',
          'Long-lived branches must enter a merge queue before more card stacking.',
        ],
        reused: [
          'SECURITY-PROVIDER-ROTATION-PROOF-001 no-secret preflight ledger.',
          'Existing Current Sprint returned stage.',
          'System Health report-only rollup.',
          'Build-lane telemetry local summary.',
        ],
        notRebuilt: [
          'No second backlog.',
          'No new ship gate.',
          'No new scheduler.',
          'No provider/auth/extraction runner.',
        ],
        exactGap: 'The returned security card was still the visible active blocker and stale job failures made the branch look broken after the preflight shipped.',
        overBroadRisk: 'This can drift into provider secret rotation, live extraction reruns, or a forced main merge. V1 stays health routing and merge-readiness proof only.',
        readyBy: 'Steve explicitly reprioritized the session toward branch/main/system-health cleanup.',
        readyAt: '2026-05-19T00:20:00-04:00',
      },
      metadata: {
        closeoutKey: CLOSEOUT_KEY,
        approvalRef: FOUNDATION_BRANCH_MERGE_READINESS_APPROVAL_PATH,
      },
    },
  ]
  if (!closeCard) {
    items.push({
      cardId: SECURITY_CARD_ID,
      order: 2,
      stage: 'returned',
      planRef: 'docs/process/security-provider-rotation-proof-preflight-001-plan.md',
      definitionOfDone: 'Provider-side rotation, revocation, retirement, or dead-key proof exists without raw values in repo truth.',
      proofCommands: [
        'npm run process:security-provider-rotation-proof-preflight-check -- --apply --json',
        'npm run backlog:hygiene -- --json',
        'npm run foundation:verify -- --json-summary',
      ],
      returnedReason: 'No-secret preflight is complete; real provider-side proof remains approval-bound and must not hold the branch merge-readiness sprint hostage.',
      notNextBoundaries: [
        'No provider-side credential rotation, revocation, retirement, live validation, hashes, or raw values.',
        'No provider API calls or external writes.',
      ],
      metadata: {
        closeoutKey: SECURITY_CLOSEOUT_KEY,
        approvalBoundary: 'Provider/account-owner proof is required.',
      },
    })
  }
  return items
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, planReview } = {}) {
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-branch-merge-readiness')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `foundation-branch-merge-readiness-${stableRunId(PLAN_PATH)}`,
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
        VALUES ($1,'backlog_items',$2,'codex-branch-merge-readiness',$3,$4::jsonb)
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

async function latestJobRun(jobKey) {
  const snapshot = await getFoundationJobRunSnapshot({ limit: 100, includeOutput: false })
  return (snapshot.latestRuns || []).find(run => run.jobKey === jobKey) ||
    (snapshot.runs || []).find(run => run.jobKey === jobKey) ||
    null
}

async function routeApprovalBoundMeetingRun() {
  const run = await latestJobRun('meeting-notes-sync-current')
  if (!run || run.status === 'succeeded') return run
  return updateFoundationJobRunMetadata(run.runId, {
    systemHealthRouting: {
      status: 'blocked_by_approval',
      owner: 'Steve',
      nextAction: 'Do not rerun live meeting extraction without explicit Steve approval; inspect stale-run cause or schedule a safe preflight-only repair card first.',
      routedByCard: CARD_ID,
      routedAt: new Date().toISOString(),
    },
  }, 'codex-branch-merge-readiness')
}

async function ensureLiveState({ closeCard = false, planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'create/update merge-readiness backlog card, Plan Critic row, Current Sprint overlay, and approval-bound job routing metadata',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, planReview })
  await routeApprovalBoundMeetingRun()
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'Get Foundation branch clean, health-routed, and merge-ready without hiding approval-bound work.',
        activeBlockerCardId: closeCard ? null : CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : 'building_now',
          startedBy: 'codex-branch-merge-readiness',
          currentStatus: closeCard ? 'complete' : 'building',
          closeoutKey: CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Merge to main only if branch gates still pass at merge time; then verify main after merge.'
            : 'Finish merge-readiness proof and do not touch main yet.',
          approvalBoundary: 'Provider proof, live extraction reruns, and external writes remain Steve/provider-owned.',
          notNext: FOUNDATION_BRANCH_MERGE_READINESS_NOT_NEXT,
          exitCriteria: [
            'SECURITY-PROVIDER-ROTATION-PROOF-001 is returned, not active blocker.',
            'Safe red health rows are repaired; approval-bound rows have owner/next action.',
            'backlog hygiene, build-lane telemetry, foundation:verify, and process:foundation-ship pass.',
            'Closeout records exact merge decision.',
          ],
        },
      },
      items: buildSprintItems({ closeCard }),
    },
    'codex-branch-merge-readiness',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'Steve reprioritized toward branch/main readiness and explicit approval-bound health routing before further card expansion.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  const planSource = await readRepoFile(PLAN_PATH)
  const verifierSource = await readRepoFile('scripts/foundation-verify.mjs')
  const systemHealthSource = await readRepoFile('lib/foundation-system-health.js')
  const verificationRunsScriptSource = await readRepoFile('scripts/process-verification-runs-check.mjs')
  const processGateCloseoutSource = await readRepoFile('lib/foundation-build-closeout-process-gate-records.js')
  const packageJson = JSON.parse(await readRepoFile('package.json'))
  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: FOUNDATION_BRANCH_MERGE_READINESS_APPROVAL_PATH,
    cardId: CARD_ID,
  })
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard }),
    changedFiles: CHANGED_FILES,
    declaredRisk: 'branch merge readiness, live sprint routing, and approval-bound system health rows',
    repoRoot,
  })

  await initFoundationDb()
  if (args.apply || args.closeCard) await ensureLiveState({ closeCard: args.closeCard, planReview })
  const [activeSprint, cards, planCriticRuns, meetingRun] = await Promise.all([
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds([CARD_ID, SECURITY_CARD_ID, FOUNDATION_MERGE_QUEUE_CARD_ID]),
    getPlanCriticRunsByCardIds([CARD_ID, FOUNDATION_MERGE_QUEUE_CARD_ID]),
    latestJobRun('meeting-notes-sync-current'),
  ])

  const cardMap = new Map(cards.map(card => [card.id, card]))
  const currentBranch = await git(['rev-parse', '--abbrev-ref', 'HEAD'])
  const branchSync = await git(['rev-list', '--left-right', '--count', `origin/${currentBranch}...HEAD`]).catch(error => `error:${error.message}`)
  const mainDelta = await git(['rev-list', '--left-right', '--count', 'origin/main...HEAD']).catch(error => `error:${error.message}`)
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  const dogfood = buildFoundationBranchMergeReadinessDogfoodProof({
    currentSprint: activeSprint,
    securityCard: cardMap.get(SECURITY_CARD_ID),
    mergeReadinessCard: cardMap.get(CARD_ID),
    meetingRun,
    verifierLineCount: countLinesForVerifier(verifierSource),
  })

  addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || FOUNDATION_BRANCH_MERGE_READINESS_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && planReview.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for merge-readiness card', `${planReview.status}/${planReview.score}`)
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, currentBranch === 'foundation/system-health-red-to-green-001', 'working branch is Foundation health branch', currentBranch)
  addCheck(checks, /^0\t\d+$/.test(branchSync), 'branch contains origin branch and can be pushed', branchSync)
  addCheck(checks, /^0\t\d+$/.test(mainDelta), 'branch contains main and is ahead of origin/main', mainDelta)
  addCheck(checks, args.closeCard ? cardMap.get(CARD_ID)?.lane === 'done' : ['executing', 'done'].includes(cardMap.get(CARD_ID)?.lane), 'merge-readiness card exists in expected lane', cardMap.get(CARD_ID)?.lane || 'missing')
  addCheck(checks, cardMap.get(FOUNDATION_MERGE_QUEUE_CARD_ID)?.lane === 'done', 'merge queue guardrail is built before branch merge decision', cardMap.get(FOUNDATION_MERGE_QUEUE_CARD_ID)?.lane || 'missing')
  addCheck(checks, cardMap.get(SECURITY_CARD_ID)?.lane === 'scoped' && /provider-side/i.test(cardMap.get(SECURITY_CARD_ID)?.nextAction || ''), 'security provider proof remains scoped and provider-owned', cardMap.get(SECURITY_CARD_ID)?.nextAction || 'missing')
  addCheck(checks, dogfood.ok, 'dogfood proves returned security and approval-bound extraction do not block active build lane', dogfood.invariant)
  addCheck(checks, countLinesForVerifier(verifierSource) < 5000, 'root verifier is below hard build-lane guard', `${countLinesForVerifier(verifierSource)} lines`)
  addCheck(checks, systemHealthSource.includes('systemHealthRouting') && systemHealthSource.includes('blocked_by_approval'), 'System Health supports approval-bound job routing', 'lib/foundation-system-health.js')
  addCheck(checks, verificationRunsScriptSource.includes('foundation-build-closeout-source-once-over-records.js'), 'verification-runs proof reads split closeout source', 'scripts/process-verification-runs-check.mjs')
  const archivedHandoffChecks = await Promise.all(ARCHIVED_COLD_HANDOFFS.map(async (archivedPath, index) => ({
    archivedPath,
    hotPath: HOT_COLD_HANDOFFS[index],
    archived: await repoFileExists(archivedPath),
    hot: await repoFileExists(HOT_COLD_HANDOFFS[index]),
  })))
  addCheck(
    checks,
    archivedHandoffChecks.every(row => row.archived && !row.hot),
    'cold handoff archive set is out of hot handoffs',
    archivedHandoffChecks
      .filter(row => !row.archived || row.hot)
      .map(row => `${row.archivedPath}:archived=${row.archived} hot=${row.hot}`)
      .join(', ') || `${ARCHIVED_COLD_HANDOFFS.length} archived`
  )
  addCheck(checks, packageJson.scripts?.['process:foundation-branch-merge-readiness-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:foundation-branch-merge-readiness-check'] || 'missing')
  addCheck(checks, packageJson.scripts?.['process:foundation-merge-queue-check'] === `node --env-file-if-exists=.env ${FOUNDATION_MERGE_QUEUE_SCRIPT_PATH}`, 'package exposes merge queue focused proof', packageJson.scripts?.['process:foundation-merge-queue-check'] || 'missing')
  addCheck(checks, processGateCloseoutSource.includes(CLOSEOUT_KEY) && processGateCloseoutSource.includes(CARD_ID), 'closeout registry includes merge-readiness record', 'lib/foundation-build-closeout-process-gate-records.js')
  addCheck(checks, processGateCloseoutSource.includes(FOUNDATION_MERGE_QUEUE_CLOSEOUT_KEY) && processGateCloseoutSource.includes(FOUNDATION_MERGE_QUEUE_CARD_ID), 'closeout registry includes merge queue record', 'lib/foundation-build-closeout-process-gate-records.js')
  addCheck(checks, closeout && (closeout.backlogIds || []).includes(CARD_ID), 'build closeout lookup resolves merge-readiness closeout', closeout?.key || 'missing')
  addCheck(checks, !/spawn_agent|startExtractionRun\s*\(|sendGmail|writeClickUp/.test(systemHealthSource + verificationRunsScriptSource), 'card does not introduce hidden worker, extraction, or external-write path', 'safe routing only')

  const result = {
    status: checks.every(check => check.ok) ? 'healthy' : 'risk',
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    branch: currentBranch,
    branchSync,
    mainDelta,
    dogfood,
    checks,
    failed: checks.filter(check => !check.ok),
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Foundation branch merge-readiness check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (result.failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Foundation branch merge-readiness check failed.')
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
