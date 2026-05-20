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
  getBacklogItemsByIds,
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
  FOCUSED_SPRINT_ID_AUDIT_REFS,
  FOCUSED_SPRINT_ID_HISTORICAL_AWARE_APPROVAL_PATH as APPROVAL_PATH,
  FOCUSED_SPRINT_ID_HISTORICAL_AWARE_CARD_ID as CARD_ID,
  FOCUSED_SPRINT_ID_HISTORICAL_AWARE_CLOSEOUT_KEY as CLOSEOUT_KEY,
  FOCUSED_SPRINT_ID_HISTORICAL_AWARE_CLOSEOUT_PATH as CLOSEOUT_DOC_PATH,
  FOCUSED_SPRINT_ID_HISTORICAL_AWARE_NEXT_CARD_ID as NEXT_CARD_ID,
  FOCUSED_SPRINT_ID_HISTORICAL_AWARE_PLAN_PATH as PLAN_PATH,
  FOCUSED_SPRINT_ID_HISTORICAL_AWARE_PROOF_COMMANDS as PROOF_COMMANDS,
  FOCUSED_SPRINT_ID_HISTORICAL_AWARE_SCRIPT_PATH as SCRIPT_PATH,
  buildFocusedSprintIdHistoricalAwareDogfoodProof,
  evaluateFocusedSprintIdHistoricalAwareness,
} from '../lib/focused-sprint-id-historical-aware.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-focused-sprint-id-historical-aware'
const CHANGED_FILES = [
  'lib/focused-sprint-id-historical-aware.js',
  'lib/agent-feedback-routes.js',
  SCRIPT_PATH,
  'scripts/process-agent-feedback-routes-split-check.mjs',
  'scripts/process-app-page-routes-split-check.mjs',
  'lib/deep-audit-findings-closure-gate.js',
  'lib/foundation-build-closeout-process-gate-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  PLAN_PATH,
  APPROVAL_PATH,
  CLOSEOUT_DOC_PATH,
  'package.json',
]

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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P2','full',true,$6::text[],$7::jsonb,$8::jsonb,$9)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result,
            created_at = NOW()
      `,
      [
        `focused-sprint-id-historical-aware-${stableRunId(PLAN_PATH)}`,
        CARD_ID,
        PLAN_PATH,
        planReview.status,
        Number(planReview.score) || 0,
        CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify(planReview),
        ACTOR,
      ],
    )
  } finally {
    client.release()
    await pool.end()
  }
}

function normalizeSprintItem(item = {}) {
  return {
    ...item,
    cardId: item.cardId || item.backlogId || item.backlog_id,
    proofCommands: Array.isArray(item.proofCommands) ? item.proofCommands : [],
    notNextBoundaries: Array.isArray(item.notNextBoundaries) ? item.notNextBoundaries : [],
    existingWorkCheck: item.existingWorkCheck || {},
    metadata: item.metadata || {},
  }
}

function buildUpdatedSprintOverlay({ activeSprint, currentHead }) {
  const sprint = activeSprint.sprint || {}
  const items = (activeSprint.items || []).map(item => {
    const nextItem = normalizeSprintItem(item)
    if (nextItem.cardId === CARD_ID) {
      return {
        ...nextItem,
        stage: 'done_this_sprint',
        planRef: PLAN_PATH,
        definitionOfDone: 'Focused checks named by the May 19 deep audit validate through historical-aware sprint metadata or verified closeout proof instead of exact dated active-sprint assumptions.',
        proofCommands: PROOF_COMMANDS,
        notNextBoundaries: [
          'Do not rewrite every legacy process check in this card.',
          'Do not remove bootstrap/default sprint metadata that is explicitly marked as non-live truth.',
          'Do not weaken active Current Sprint proof for cards that are actually active.',
          'Do not work MEETING-VAULT-ACL-001 Phase B.',
          'Do not mutate Drive permissions.',
          'Do not start source/value/extraction expansion.',
          'Do not send external writes, rotate credentials, run paid/provider access, or perform private broad extraction.',
        ],
        existingWorkCheck: {
          existingCode: [
            'lib/sprint-check-historical-mode.js',
            'scripts/process-sprint-check-historical-mode-check.mjs',
            'scripts/process-agent-feedback-routes-split-check.mjs',
            'scripts/process-app-page-routes-split-check.mjs',
            'lib/deep-audit-findings-closure-gate.js',
          ],
          existingDocs: [
            'docs/process/sprint-check-historical-mode-001-plan.md',
            'docs/audits/2026-05-19-foundation-deep-merge-audit.md',
            PLAN_PATH,
          ],
          existingScripts: [
            'process:sprint-check-historical-mode-check',
            'process:code-quality-nightly-audit-check',
            'process:system-health-nightly-audit-check',
            'process:build-lane-repeated-failure-action-gate-check',
            'process:foundation-ship',
          ],
          existingPolicy: [
            'A shipped proof stays valid because verified closeout proof exists, not because an old sprint remains active.',
            'Bootstrap sprint literals are metadata only and cannot override live DB/API Current Sprint truth.',
            'Audit findings become live backlog truth or shipped proof.',
          ],
          reused: 'Reuses sprint-check-historical-mode-v1 and applies it to the remaining focused checks named by the deep audit.',
          notRebuilt: 'No new sprint engine, no broad legacy-process rewrite, and no live sprint truth replacement.',
          exactGap: 'The May 19 deep audit found exact dated active-sprint assumptions in focused checks after closeout rollover.',
          overBroadRisk: 'This card can drift into changing every historical proof script. It is bounded to named audit refs plus a reusable detector.',
          readyBy: 'Steve approved unattended overnight audit-control work and required deep-audit findings to become fixes, live cards, gates, or proof.',
          readyAt: '2026-05-20T00:15:00-04:00',
        },
        metadata: {
          ...nextItem.metadata,
          closeoutKey: CLOSEOUT_KEY,
          repoPosture: {
            integrationBranch: 'main',
            expectedBaseCommit: currentHead,
            commitPushRequiredAfterCard: true,
            mainMustEqualOriginMainAtCloseout: true,
          },
          blockersBlockActionsNotSprint: true,
          approvalBoundActionsParkInsteadOfStopping: true,
        },
      }
    }
    if (nextItem.cardId === NEXT_CARD_ID && nextItem.stage !== 'done_this_sprint') {
      return {
        ...nextItem,
        stage: 'scoping',
      }
    }
    return nextItem
  })
  return {
    sprint: {
      sprintId: sprint.sprintId,
      status: 'active',
      goal: sprint.goal,
      activeBlockerCardId: NEXT_CARD_ID,
      metadata: {
        ...(sprint.metadata || {}),
        currentStatus: 'focused_sprint_id_historical_aware_done',
        nextAction: `Continue ${NEXT_CARD_ID}; keep audit P2 cleanup moving before intelligence/value expansion.`,
      },
    },
    items,
  }
}

async function applyLiveClose({ activeSprint, planReview, gitState }) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'close focused sprint ID historical-aware card and advance Current Sprint',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await updateBacklogItem(CARD_ID, {
    lane: 'done',
    priority: 'P2',
    rank: 85,
    nextAction: `Done under ${CLOSEOUT_KEY}; continue ${NEXT_CARD_ID}.`,
    statusNote: `Closed under ${CLOSEOUT_KEY}; focused checks named by the May 19 deep audit now validate through historical-aware sprint metadata or verified closeout proof, with reusable detector proof for future sprint-ID regressions.`,
    owner: 'Foundation Process',
  }, ACTOR)
  await upsertPlanCriticRun(planReview)
  await upsertFoundationCurrentSprintOverlay(
    buildUpdatedSprintOverlay({ activeSprint, currentHead: gitState.head }),
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: activeSprint.sprint?.sprintId,
      reason: `${CARD_ID} closes focused exact sprint ID audit finding and advances to ${NEXT_CARD_ID}.`,
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  await initFoundationDb()

  const filePaths = Array.from(new Set([
    ...FOCUSED_SPRINT_ID_AUDIT_REFS.map(ref => ref.path),
    'lib/focused-sprint-id-historical-aware.js',
    SCRIPT_PATH,
    'lib/deep-audit-findings-closure-gate.js',
    'lib/foundation-build-closeout-process-gate-records.js',
    'lib/foundation-verify-coverage-card-ids.js',
  ]))
  const fileSources = Object.fromEntries(await Promise.all(filePaths.map(async filePath => [
    filePath,
    await readRepoFile(filePath, { optional: true }),
  ])))
  const [
    approval,
    planSource,
    packageJson,
    closeoutDoc,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile(PLAN_PATH),
    readRepoJson('package.json'),
    readRepoFile(CLOSEOUT_DOC_PATH, { optional: true }),
  ])
  const gitState = getGitState()
  const [activeSprint, cards] = await Promise.all([
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID, 'SPRINT-CHECK-HISTORICAL-MODE-001']),
  ])
  const card = cards.find(item => item.id === CARD_ID)
  const nextCard = cards.find(item => item.id === NEXT_CARD_ID)
  const priorCard = cards.find(item => item.id === 'SPRINT-CHECK-HISTORICAL-MODE-001')
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: { id: CARD_ID, priority: 'P2' },
    planPath: PLAN_PATH,
    changedFiles: CHANGED_FILES,
  })
  const snapshot = evaluateFocusedSprintIdHistoricalAwareness(fileSources)
  const dogfood = buildFocusedSprintIdHistoricalAwareDogfoodProof()
  const closeouts = getFoundationBuildCloseouts()
  const closeout = closeouts.find(item => item.key === CLOSEOUT_KEY)
  const priorCloseout = closeouts.find(item => item.key === 'sprint-check-historical-mode-v1')
  const deepAuditClosureSource = fileSources['lib/deep-audit-findings-closure-gate.js'] || ''

  if (args.closeCard &&
    approval.ok &&
    Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    planReview.status === 'pass' &&
    Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    snapshot.ok &&
    dogfood.ok &&
    deepAuditClosureSource.includes("findingId: 'focused-check-active-sprint-id-assumption'") &&
    deepAuditClosureSource.includes("routeStatus: 'done'")) {
    await applyLiveClose({ activeSprint, planReview, gitState })
  }

  const [afterSprint, afterCards] = await Promise.all([
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID, 'SPRINT-CHECK-HISTORICAL-MODE-001']),
  ])
  const afterCard = afterCards.find(item => item.id === CARD_ID)
  const afterNextCard = afterCards.find(item => item.id === NEXT_CARD_ID)
  const sprintItem = afterSprint.items.find(item => item.cardId === CARD_ID)

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for focused sprint ID card', buildPlanCriticResultSummary(planReview))
  addCheck(checks, card && ['scoped', 'executing', 'done'].includes(card.lane), 'live backlog card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, priorCard?.lane === 'done' && priorCloseout, 'prior historical-mode card is shipped and reusable', priorCloseout ? priorCloseout.key : (priorCard ? `${priorCard.id}:${priorCard.lane}` : 'missing'))
  addCheck(checks, snapshot.ok, 'audit-named sprint ID refs are historical-aware or metadata-only', snapshot.summary)
  addCheck(checks, snapshot.failedRefs.length === 0, 'audit-named refs are all classified with allowed posture', snapshot.failedRefs.map(ref => ref.detail).join(', ') || 'clean')
  addCheck(checks, snapshot.unsafeDirectComparisons.length === 0, 'audit-named focused checks have no unsafe direct active-sprint comparison', snapshot.unsafeDirectComparisons.map(item => `${item.path}:${item.line}`).join(', ') || 'clean')
  addCheck(checks, dogfood.ok, 'dogfood rejects stale exact sprint proof and accepts historical-aware paths', JSON.stringify(dogfood))
  addCheck(checks, fileSources['scripts/process-agent-feedback-routes-split-check.mjs'].includes('evaluateSprintCheckHistoricalMode') && fileSources['scripts/process-agent-feedback-routes-split-check.mjs'].includes('getFoundationBuildCloseouts'), 'Agent Feedback route split proof uses verified closeout historical mode', 'scripts/process-agent-feedback-routes-split-check.mjs')
  addCheck(checks, fileSources['scripts/process-app-page-routes-split-check.mjs'].includes('evaluateSprintCheckHistoricalMode') && fileSources['scripts/process-app-page-routes-split-check.mjs'].includes('getFoundationBuildCloseouts'), 'App page route split proof uses verified closeout historical mode', 'scripts/process-app-page-routes-split-check.mjs')
  addCheck(checks, deepAuditClosureSource.includes("findingId: 'focused-check-active-sprint-id-assumption'") && deepAuditClosureSource.includes("routeStatus: 'done'") && deepAuditClosureSource.includes(CLOSEOUT_KEY), 'deep-audit closure route marks focused sprint ID finding done under this closeout', 'lib/deep-audit-findings-closure-gate.js')
  addCheck(checks, packageJson.scripts?.['process:focused-sprint-id-historical-aware-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:focused-sprint-id-historical-aware-check'] || 'missing')
  addCheck(checks, planSource.includes('Exact dated sprint IDs are allowed only as metadata') && planSource.includes('verified closeout proof'), 'plan states metadata-only and verified closeout boundary', PLAN_PATH)
  addCheck(checks, closeoutDoc.includes(CARD_ID) && closeoutDoc.includes(NEXT_CARD_ID), 'closeout handoff records shipped behavior and next card', closeoutDoc ? 'present' : 'missing')
  addCheck(checks, closeout?.backlogIds?.includes(CARD_ID), 'closeout registry resolves focused sprint ID closeout', closeout?.key || 'missing')
  addCheck(checks, fileSources['lib/foundation-verify-coverage-card-ids.js'].includes(CARD_ID), 'foundation verifier coverage includes card ID', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, !args.closeCard || afterCard?.lane === 'done', 'focused sprint ID card closes when requested', afterCard ? `${afterCard.lane}/${afterCard.priority}` : 'missing')
  addCheck(checks, !args.closeCard || sprintItem?.stage === 'done_this_sprint', 'Current Sprint marks focused sprint ID card done', sprintItem?.stage || 'missing')
  addCheck(checks, !args.closeCard || afterSprint.sprint?.activeBlockerCardId === NEXT_CARD_ID, 'Current Sprint advances to CSS surface decouple card', afterSprint.sprint?.activeBlockerCardId || 'missing')
  addCheck(checks, afterNextCard && ['scoped', 'building_now', 'done'].includes(afterNextCard.lane), 'next CSS surface decouple card is live', afterNextCard ? `${afterNextCard.id}:${afterNextCard.lane}` : 'missing')
  addCheck(checks, gitState.branch === 'main', 'repo branch posture is main', gitState.branch)
  addCheck(checks, gitState.head === gitState.originMain || Boolean(gitState.porcelain), 'repo is synced or in-flight card has tracked dirty work', gitState.head === gitState.originMain ? 'synced' : 'in-flight')

  await closeFoundationDb()

  const failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'risk' : 'healthy',
    generatedAt: new Date().toISOString(),
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    activeBlocker: afterSprint.sprint?.activeBlockerCardId || null,
    snapshot,
    dogfood,
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Focused sprint ID historical-aware check: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }

  if (failed.length) process.exit(1)
}

main().catch(async error => {
  try {
    await closeFoundationDb()
  } catch {}
  console.error(error instanceof Error ? error.stack : String(error))
  process.exit(1)
})
