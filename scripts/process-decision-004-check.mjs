#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActionRouterSnapshot,
} from '../lib/foundation-intelligence-db.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
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
  DECISION_004_APPROVAL_PATH,
  DECISION_004_CARD_ID,
  DECISION_004_CHANGED_FILES,
  DECISION_004_CLOSEOUT_KEY,
  DECISION_004_CLOSEOUT_PATH,
  DECISION_004_NEXT_CARD_ID,
  DECISION_004_NOT_NEXT_BOUNDARIES,
  DECISION_004_PLAN_PATH,
  DECISION_004_PROOF_COMMANDS,
  DECISION_004_SCRIPT_PATH,
  DECISION_004_SPRINT_ID,
  buildDecision004DogfoodProof,
  buildDecision004PendingReviewSnapshot,
  evaluateDecision004Implementation,
  renderDecision004Closeout,
  stableDecision004RunId,
} from '../lib/decision-004-pending-review.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-decision-004'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: String(detail || '') })
}

function getCurrentHead() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
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
    return (await fs.stat(path.join(repoRoot, relativePath))).isFile()
  } catch {
    return false
  }
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

async function loadRecentDecisions({ limit = 100 } = {}) {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT *
        FROM decisions
        ORDER BY updated_at DESC, created_at DESC
        LIMIT $1
      `,
      [limit],
    )
    return result.rows
  } finally {
    await pool.end()
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P1','full',true,$6::text[],$7::jsonb,$8::jsonb,$9)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result,
            created_at = NOW()
      `,
      [
        `decision-004-${stableDecision004RunId(DECISION_004_PLAN_PATH)}`,
        DECISION_004_CARD_ID,
        DECISION_004_PLAN_PATH,
        planReview.status,
        Number(planReview.score),
        DECISION_004_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({
          status: planReview.status,
          score: planReview.score,
          cardId: DECISION_004_CARD_ID,
          closeoutKey: DECISION_004_CLOSEOUT_KEY,
        }),
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
    cardId: item.cardId || item.backlogId,
    order: item.order ?? item.sprintOrder,
    stage: item.stage,
    planRef: item.planRef,
    definitionOfDone: item.definitionOfDone,
    proofCommands: item.proofCommands || [],
    readinessBlockerCleared: item.readinessBlockerCleared || '',
    notNextBoundaries: item.notNextBoundaries || [],
    existingWorkCheck: item.existingWorkCheck || {},
    returnedReason: item.returnedReason || '',
    nextAction: item.nextAction || '',
    metadata: item.metadata && typeof item.metadata === 'object' ? item.metadata : {},
  }
}

function buildExistingWorkCheck() {
  return {
    reused: 'Reuses GOV-001 governance accountability, ACTION-ROUTER-001 routes, MEMORY-005 temporal truth, and the existing decisions ledger/API/UI.',
    exactGap: 'Decision-shaped outputs can be reviewed, but weak proposed decisions could be marked locked without explicit source/provenance/owner evidence.',
    notRebuilt: 'No new decision database, no Action Router rebuild, no auto-approval agent, no external writes, and no private/source expansion.',
    existingCode: [
      'lib/gov-001-governance-accountability.js',
      'lib/intelligence-action-router.js',
      'lib/foundation-decision-store.js',
      'public/foundation.js',
      'server.js',
    ],
    existingPolicy: [
      'Detected decisions are proposed only.',
      'Locked decisions need explicit approval and source-backed provenance.',
      'Blockers block unsafe actions, not the whole sprint.',
    ],
    readyBy: 'gov-001-governance-accountability-v1',
    readyAt: '2026-05-20T06:45:00-04:00',
  }
}

function buildDecision005Item({ existingItem = {}, currentHead = '' } = {}) {
  const normalized = normalizeSprintItem(existingItem)
  const existingMetadata = normalized.metadata || {}
  return {
    ...normalized,
    cardId: DECISION_004_NEXT_CARD_ID,
    order: Number(normalized.order || existingItem.sprintOrder || 14),
    stage: normalized.stage === 'done_this_sprint' ? normalized.stage : 'scoping',
    planRef: normalized.planRef || 'docs/process/decision-005-plan.md',
    definitionOfDone: normalized.definitionOfDone || 'Decision provenance distinguishes direct meeting/session/thread evidence from backfilled provenance and exposes participant/source lineage for future lock-in decisions.',
    proofCommands: normalized.proofCommands?.length
      ? normalized.proofCommands
      : [
          'node --check scripts/process-decision-005-check.mjs',
          'npm run process:decision-005-check -- --close-card --json',
          'npm run process:system-health-nightly-audit-check -- --json',
          'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
          'npm run backlog:hygiene -- --json',
          'npm run foundation:verify -- --json-summary',
          'npm run process:foundation-ship -- --card=DECISION-005 --planApprovalRef=docs/process/approvals/DECISION-005.json --closeoutKey=decision-005-provenance-participant-model-v1 --commitRef=HEAD',
        ],
    notNextBoundaries: Array.from(new Set([
      ...(normalized.notNextBoundaries || []),
      'Do not auto-lock or auto-apply real decisions.',
      'Do not run broad private extraction, paid/provider access, or browser-auth work.',
      'Do not mutate external systems, Drive permissions, credentials, or provider config.',
    ])),
    existingWorkCheck: {
      ...(normalized.existingWorkCheck || {}),
      reused: 'Builds on DECISION-004 lock-in guard and existing meeting/thread/source artifacts.',
      exactGap: 'Lock-in now fails closed, but the provenance model still needs clearer direct-vs-backfilled participant/session/thread lineage.',
      notRebuilt: 'No new decision database or autonomous approval workflow.',
      readyBy: DECISION_004_CLOSEOUT_KEY,
      readyAt: '2026-05-20T07:05:00-04:00',
    },
    nextAction: `Scoped next after ${DECISION_004_CLOSEOUT_KEY}; start only when DECISION-005 becomes the active build card, then deepen provenance and participant lineage for locked decisions.`,
    metadata: {
      ...existingMetadata,
      approvalBoundActionsParkInsteadOfStopping: true,
      blockersBlockActionsNotSprint: true,
      expectedCloseoutKey: 'decision-005-provenance-participant-model-v1',
      repoPosture: {
        ...(existingMetadata.repoPosture || {}),
        integrationBranch: 'main',
        expectedBaseCommit: currentHead,
        commitPushRequiredAfterCard: true,
        mainMustEqualOriginMainAtCloseout: true,
      },
    },
  }
}

function buildUpdatedSprintOverlay({ activeSprint, closeCard = false, currentHead = '' }) {
  const sprint = activeSprint.sprint || {}
  const existingItems = activeSprint.items || []
  const existingById = new Map(existingItems.map(item => [item.cardId, item]))
  const merged = existingItems.map(normalizeSprintItem)
  const currentItem = existingById.get(DECISION_004_CARD_ID) || {}
  const currentIndex = merged.findIndex(item => item.cardId === DECISION_004_CARD_ID)
  const updatedCurrent = {
    ...normalizeSprintItem(currentItem),
    cardId: DECISION_004_CARD_ID,
    order: Number(currentItem.order || currentItem.sprintOrder || 13),
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: DECISION_004_PLAN_PATH,
    definitionOfDone: 'Pending decision review snapshot exists and decision lock-in fails closed unless source, owner, confirmer, participants, context, and evidence notes are present.',
    proofCommands: DECISION_004_PROOF_COMMANDS,
    notNextBoundaries: Array.from(new Set([...(currentItem.notNextBoundaries || []), ...DECISION_004_NOT_NEXT_BOUNDARIES])),
    existingWorkCheck: {
      ...(currentItem.existingWorkCheck || {}),
      ...buildExistingWorkCheck(),
    },
    nextAction: closeCard ? `Continue ${DECISION_004_NEXT_CARD_ID}.` : 'Close DECISION-004 before DECISION-005.',
    metadata: {
      ...(currentItem.metadata || {}),
      closeoutKey: DECISION_004_CLOSEOUT_KEY,
      approvalRef: DECISION_004_APPROVAL_PATH,
      proposedOnlyUntilHumanLock: true,
      lockRequiresSourceAndProvenance: true,
      noAutoApply: true,
    },
  }
  if (currentIndex >= 0) merged[currentIndex] = updatedCurrent
  else merged.push(updatedCurrent)

  const nextIndex = merged.findIndex(item => item.cardId === DECISION_004_NEXT_CARD_ID)
  if (nextIndex >= 0) {
    merged[nextIndex] = buildDecision005Item({
      existingItem: merged[nextIndex],
      currentHead,
    })
  } else {
    merged.push(buildDecision005Item({ currentHead }))
  }
  merged.sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
  return {
    sprint: {
      sprintId: sprint.sprintId || DECISION_004_SPRINT_ID,
      status: 'active',
      goal: sprint.goal || 'Continue unattended Foundation work from source-truth into data health and operating control.',
      activeBlockerCardId: closeCard ? DECISION_004_NEXT_CARD_ID : DECISION_004_CARD_ID,
      metadata: {
        ...(sprint.metadata || {}),
        currentStatus: closeCard ? 'decision_005_scoping' : 'decision_004_active',
        lastClosedCardId: closeCard ? DECISION_004_CARD_ID : sprint.metadata?.lastClosedCardId,
        lastCloseoutKey: closeCard ? DECISION_004_CLOSEOUT_KEY : sprint.metadata?.lastCloseoutKey,
        approvalPolicy: sprint.metadata?.approvalPolicy || 'Blockers block unsafe actions, not the whole sprint. Park approval-bound operations and continue to the next safe card.',
      },
    },
    items: merged,
  }
}

async function buildLiveSnapshot() {
  const [decisions, actionRouter] = await Promise.all([
    loadRecentDecisions({ limit: 100 }),
    getActionRouterSnapshot({ limit: 100 }),
  ])
  const routeMap = new Map()
  for (const route of [...(actionRouter.recentRoutes || []), ...(actionRouter.strategyRecentRoutes || [])]) {
    if (route?.routeId) routeMap.set(route.routeId, route)
  }
  return buildDecision004PendingReviewSnapshot({
    decisions,
    routes: Array.from(routeMap.values()),
    generatedAt: new Date().toISOString(),
  })
}

async function applyLiveClose({ activeSprint, planReview, snapshot, dogfood, evaluation }) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: DECISION_004_SCRIPT_PATH,
    operation: 'close DECISION-004 and advance Current Sprint',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await updateBacklogItem(DECISION_004_CARD_ID, {
    lane: 'done',
    priority: 'P1',
    rank: 13,
    nextAction: `Done under ${DECISION_004_CLOSEOUT_KEY}; proof: npm run process:decision-004-check -- --close-card --json; closeout ${DECISION_004_CLOSEOUT_PATH}; continue ${DECISION_004_NEXT_CARD_ID}.`,
    statusNote: `Closed 2026-05-20 under ${DECISION_004_CLOSEOUT_KEY}; pending decisions now have a review snapshot and lock-in fails closed without source/provenance/owner evidence.`,
    owner: 'Foundation Decisions',
  }, ACTOR)
  await updateBacklogItem(DECISION_004_NEXT_CARD_ID, {
    lane: 'scoped',
    priority: 'P1',
    rank: 14,
    nextAction: `Scoped next after ${DECISION_004_CLOSEOUT_KEY}; when pulled into executing, deepen direct-vs-backfilled provenance, participant, meeting/session, and thread linkage for decisions.`,
    statusNote: `Scoped after ${DECISION_004_CLOSEOUT_KEY}; lock-in is now guarded, and this card is parked until the next build starts.`,
    owner: 'Foundation Decisions',
  }, ACTOR)
  await upsertPlanCriticRun(planReview)
  await upsertFoundationCurrentSprintOverlay(
    buildUpdatedSprintOverlay({ activeSprint, closeCard: true, currentHead: getCurrentHead() }),
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: activeSprint.sprint?.sprintId || DECISION_004_SPRINT_ID,
      reason: `${DECISION_004_CARD_ID} closes pending decision review and advances to ${DECISION_004_NEXT_CARD_ID}.`,
    },
  )
  const closeout = renderDecision004Closeout({
    evaluation,
    snapshot,
    dogfood,
    generatedAt: new Date().toISOString(),
  })
  await fs.mkdir(path.dirname(path.join(repoRoot, DECISION_004_CLOSEOUT_PATH)), { recursive: true })
  await fs.writeFile(path.join(repoRoot, DECISION_004_CLOSEOUT_PATH), closeout)
}

async function main() {
  const args = parseArgs()
  if (args.closeCard) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: DECISION_004_SCRIPT_PATH,
      operation: 'close DECISION-004 and advance Current Sprint',
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
    })
  }

  let dbInitialized = false
  try {
    const checks = []
    const [
      approvalValidation,
      planSource,
      moduleSource,
      decisionStoreSource,
      scriptSource,
      registrySource,
      packageJson,
    ] = await Promise.all([
      validatePlanApprovalFile({ repoRoot, approvalRef: DECISION_004_APPROVAL_PATH, cardId: DECISION_004_CARD_ID }),
      readRepoFile(DECISION_004_PLAN_PATH),
      readRepoFile('lib/decision-004-pending-review.js'),
      readRepoFile('lib/foundation-decision-store.js'),
      readRepoFile(DECISION_004_SCRIPT_PATH),
      readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
      readRepoJson('package.json'),
    ])
    const planReview = evaluatePlanCriticPlan({
      planText: planSource,
      card: {
        id: DECISION_004_CARD_ID,
        title: 'Build a pending decision review and lock-in workflow',
        priority: 'P1',
      },
      changedFiles: DECISION_004_CHANGED_FILES,
      declaredRisk: 'Decision review can drift into auto-locking, weak provenance, external writes, or a second decision system.',
      repoRoot,
    })
    const planSummary = buildPlanCriticResultSummary(planReview)

    await initFoundationDb()
    dbInitialized = true
    const [snapshot, activeSprint, cards, planCriticRuns] = await Promise.all([
      buildLiveSnapshot(),
      getActiveFoundationCurrentSprint(),
      getBacklogItemsByIds([DECISION_004_CARD_ID, DECISION_004_NEXT_CARD_ID]),
      getPlanCriticRunsByCardIds([DECISION_004_CARD_ID]),
    ])
    const currentActiveBlocker =
      activeSprint?.activeBlocker?.cardId ||
      activeSprint?.activeBlockerCardId ||
      activeSprint?.sprint?.activeBlockerCardId
    const closeout = getFoundationBuildCloseouts().find(record => record.key === DECISION_004_CLOSEOUT_KEY)
    const packageScript = packageJson.scripts?.['process:decision-004-check']
    const dogfood = buildDecision004DogfoodProof()
    const evaluation = evaluateDecision004Implementation({
      moduleSource,
      decisionStoreSource,
      scriptSource,
      registrySource,
      packageJson,
      snapshot,
    })

    addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'DECISION-004 approval validates', approvalValidation.failures?.map(item => item.check).join(', ') || DECISION_004_APPROVAL_PATH)
    addCheck(checks, approvalValidation.approval?.cardId === DECISION_004_CARD_ID && Number(approvalValidation.approval?.score) >= 9.8, 'DECISION-004 approval score is 9.8+', `${approvalValidation.approval?.cardId || 'missing'} / ${approvalValidation.approval?.score || 'missing'}`)
    addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes DECISION-004 plan', `${planReview.status} ${planReview.score}/10`)
    addCheck(checks, cards.some(card => card.id === DECISION_004_CARD_ID), 'DECISION-004 backlog card exists', cards.map(card => card.id).join(', '))
    addCheck(checks, cards.some(card => card.id === DECISION_004_NEXT_CARD_ID), 'DECISION-005 next card exists', cards.map(card => card.id).join(', '))
    addCheck(checks, currentActiveBlocker === DECISION_004_CARD_ID || (args.closeCard && currentActiveBlocker === DECISION_004_NEXT_CARD_ID), 'Current Sprint owns DECISION-004 before closeout', currentActiveBlocker || 'missing')
    addCheck(checks, snapshot.guardrails?.proposedOnlyUntilHumanLock === true && snapshot.guardrails?.lockRequiresSourceAndProvenance === true, 'pending review snapshot keeps lock guardrails', JSON.stringify(snapshot.guardrails || {}))
    addCheck(checks, snapshot.summary?.proposedDecisionCount >= 0 && snapshot.summary?.decisionRouteCount >= 0, 'pending review snapshot counts decisions and routes', JSON.stringify(snapshot.summary || {}))
    addCheck(checks, evaluation.ok, 'DECISION-004 implementation wiring is healthy', evaluation.failed.map(item => item.check).join('; ') || JSON.stringify(evaluation.summary))
    addCheck(checks, dogfood.ok, 'DECISION-004 dogfood rejects weak lock-ins', dogfood.invariant)
    addCheck(checks, packageScript === `node --env-file-if-exists=.env ${DECISION_004_SCRIPT_PATH}`, 'package script is registered', packageScript || 'missing')
    for (const relativePath of DECISION_004_CHANGED_FILES.filter(file => file.startsWith('docs/') || file.startsWith('lib/') || file.startsWith('scripts/') || file.startsWith('public/'))) {
      const willWriteCloseout = args.closeCard && relativePath === DECISION_004_CLOSEOUT_PATH
      const closeoutPending = !args.closeCard && relativePath === DECISION_004_CLOSEOUT_PATH
      addCheck(
        checks,
        willWriteCloseout || closeoutPending || await repoFileExists(relativePath),
        `${relativePath} exists`,
        willWriteCloseout || closeoutPending ? 'will be written on close' : relativePath,
      )
    }
    addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(DECISION_004_CARD_ID), 'closeout registry exposes DECISION-004', closeout?.key || 'missing')
    addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8) || args.closeCard, 'durable Plan Critic pass exists or will be written', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'pending write')

    const preCloseFailed = checks.filter(check => !check.ok)
    if (args.closeCard && preCloseFailed.length === 0) {
      await applyLiveClose({ activeSprint, planReview, snapshot, dogfood, evaluation })
    }

    const refreshedSprint = await getActiveFoundationCurrentSprint()
    const refreshedCards = await getBacklogItemsByIds([DECISION_004_CARD_ID, DECISION_004_NEXT_CARD_ID])
    const refreshedCurrent = refreshedCards.find(card => card.id === DECISION_004_CARD_ID)
    const refreshedNext = refreshedCards.find(card => card.id === DECISION_004_NEXT_CARD_ID)
    const refreshedItem = (refreshedSprint.items || []).find(item => item.cardId === DECISION_004_CARD_ID)
    const refreshedActiveBlocker = refreshedSprint.sprint?.activeBlockerCardId || null
    const closeoutDoc = await readRepoFile(DECISION_004_CLOSEOUT_PATH, { optional: true })
    addCheck(checks, !args.closeCard || refreshedCurrent?.lane === 'done', 'close-card marks DECISION-004 done in Backlog', refreshedCurrent?.lane || 'missing')
    addCheck(checks, !args.closeCard || ['scoped', 'research', 'executing'].includes(refreshedNext?.lane), 'close-card keeps DECISION-005 live next', refreshedNext?.lane || 'missing')
    addCheck(checks, !args.closeCard || refreshedItem?.stage === 'done_this_sprint', 'close-card marks DECISION-004 done this sprint', refreshedItem?.stage || 'missing')
    addCheck(checks, !args.closeCard || refreshedActiveBlocker === DECISION_004_NEXT_CARD_ID, 'close-card advances active blocker to DECISION-005', refreshedActiveBlocker || 'missing')
    addCheck(checks, !args.closeCard || closeoutDoc.includes(DECISION_004_CLOSEOUT_KEY), 'close-card writes DECISION-004 closeout handoff', closeoutDoc ? 'present' : DECISION_004_CLOSEOUT_PATH)

    const failed = checks.filter(check => !check.ok)
    const report = {
      ok: failed.length === 0,
      status: failed.length ? 'risk' : 'healthy',
      cardId: DECISION_004_CARD_ID,
      closeoutKey: DECISION_004_CLOSEOUT_KEY,
      nextCardId: DECISION_004_NEXT_CARD_ID,
      generatedAt: new Date().toISOString(),
      closed: args.closeCard,
      planSummary,
      activeBlocker: refreshedActiveBlocker,
      summary: {
        checks: checks.length,
        failed: failed.length,
        ...evaluation.summary,
      },
      checks,
      failed,
      snapshot: {
        status: snapshot.status,
        summary: snapshot.summary,
        guardrails: snapshot.guardrails,
      },
      dogfood,
    }

    if (args.json) {
      console.log(JSON.stringify(report, null, 2))
    } else {
      console.log(`DECISION-004 status: ${report.status}`)
      for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} -> ${check.detail}`)
    }
    process.exitCode = report.ok ? 0 : 1
  } finally {
    if (dbInitialized) await closeFoundationDb()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
