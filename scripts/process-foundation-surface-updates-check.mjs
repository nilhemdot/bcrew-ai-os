#!/usr/bin/env node

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
  initFoundationDb,
} from '../lib/foundation-db-session.js'
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
  FOUNDATION_SURFACE_UPDATES_APPROVAL_PATH,
  FOUNDATION_SURFACE_UPDATES_CARD_ID,
  FOUNDATION_SURFACE_UPDATES_CHANGED_FILES,
  FOUNDATION_SURFACE_UPDATES_CLOSEOUT_KEY,
  FOUNDATION_SURFACE_UPDATES_CLOSEOUT_PATH,
  FOUNDATION_SURFACE_UPDATES_PLAN_PATH,
  FOUNDATION_SURFACE_UPDATES_PROOF_COMMANDS,
  FOUNDATION_SURFACE_UPDATES_SCRIPT_PATH,
  FOUNDATION_SURFACE_UPDATES_SPRINT_ID,
  evaluateFoundationSurfaceUpdates,
  renderFoundationSurfaceUpdatesCloseout,
} from '../lib/foundation-surface-updates.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-foundation-surface-updates'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: String(detail || '') })
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

function stableSurfaceRunId(planPath) {
  return String(planPath || '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P1','focused',true,$6::text[],$7::jsonb,$8::jsonb,$9)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result,
            created_at = NOW()
      `,
      [
        `foundation-surface-updates-${stableSurfaceRunId(FOUNDATION_SURFACE_UPDATES_PLAN_PATH)}`,
        FOUNDATION_SURFACE_UPDATES_CARD_ID,
        FOUNDATION_SURFACE_UPDATES_PLAN_PATH,
        planReview.status,
        Number(planReview.score),
        FOUNDATION_SURFACE_UPDATES_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({
          status: planReview.status,
          score: planReview.score,
          cardId: FOUNDATION_SURFACE_UPDATES_CARD_ID,
          closeoutKey: FOUNDATION_SURFACE_UPDATES_CLOSEOUT_KEY,
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
    returnedReason: item.returnedReason,
    metadata: item.metadata && typeof item.metadata === 'object' ? item.metadata : {},
  }
}

function buildUpdatedSprintOverlay({ activeSprint, closeCard = false }) {
  const sprint = activeSprint.sprint || {}
  const existingItems = activeSprint.items || []
  const merged = existingItems.map(normalizeSprintItem)
  const currentIndex = merged.findIndex(item => item.cardId === FOUNDATION_SURFACE_UPDATES_CARD_ID)
  const currentItem = currentIndex >= 0 ? merged[currentIndex] : {}
  const updatedCurrent = {
    ...currentItem,
    cardId: FOUNDATION_SURFACE_UPDATES_CARD_ID,
    order: Number(currentItem.order || 10),
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: FOUNDATION_SURFACE_UPDATES_PLAN_PATH,
    definitionOfDone: 'Overview, Backlog, and Recent Work show plain-English operator paths, clickable where-it-lives breadcrumbs, done-date signal, proof, and closeout without broad redesign.',
    proofCommands: FOUNDATION_SURFACE_UPDATES_PROOF_COMMANDS,
    notNextBoundaries: Array.from(new Set([
      ...(currentItem.notNextBoundaries || []),
      'No broad Foundation redesign.',
      'No new source/extractor/agent/value workflow.',
      'No external writes, sends, Drive permission changes, credentials, provider access, paid work, or browser-auth.',
    ])),
    existingWorkCheck: {
      ...(currentItem.existingWorkCheck || {}),
      existingCode: [
        'public/foundation-current-state-renderers.js',
        'public/foundation-operations-renderers.js',
        'public/foundation.js',
        'lib/foundation-verifier-operator-live-surface-assurance.js',
        'lib/foundation-recent-builds-verifier.js',
      ],
      existingDocs: [
        'docs/process/foundation-sprint-system-001-plan.md',
        'docs/rebuild/current-plan.md',
        'docs/rebuild/current-state.md',
      ],
      existingScripts: [
        FOUNDATION_SURFACE_UPDATES_SCRIPT_PATH,
        'scripts/process-foundation-sprint-system-check.mjs',
      ],
      reused: 'Reuses live Foundation Hub, Current Sprint, Backlog, Recent Work closeouts, source-backed current-state renderers, and existing operator UX doctrine.',
      exactGap: 'Existing surfaces had data but not a scan-friendly operator path, clickable where-it-lives links, or honest done-date signal.',
      notRebuilt: 'No broad redesign, no new source/extraction lane, and no new dashboard system.',
      readyBy: 'decision-005-provenance-participant-model-v1',
      readyAt: '2026-05-20T06:45:00-04:00',
    },
    nextAction: closeCard
      ? 'Done for v1. Roll the next Foundation sprint from live backlog truth and continue unattended safe work.'
      : 'Close FOUNDATION-SURFACE-UPDATES-001 before rolling the next sprint.',
    metadata: {
      ...(currentItem.metadata || {}),
      closeoutKey: FOUNDATION_SURFACE_UPDATES_CLOSEOUT_KEY,
      approvalRef: FOUNDATION_SURFACE_UPDATES_APPROVAL_PATH,
      operatorPath: 'Overview -> Systems -> Backlog -> Recent Work',
      repoPosture: {
        ...(currentItem.metadata?.repoPosture || {}),
        integrationBranch: 'main',
        commitPushRequiredAfterCard: true,
      },
    },
  }
  if (currentIndex >= 0) merged[currentIndex] = updatedCurrent
  else merged.push(updatedCurrent)

  merged.sort((left, right) => Number(left.order || 0) - Number(right.order || 0))
  return {
    sprint: {
      sprintId: sprint.sprintId || FOUNDATION_SURFACE_UPDATES_SPRINT_ID,
      status: 'active',
      goal: sprint.goal || 'Continue unattended Foundation work from a clean trusted-loop/source-contract closeout.',
      activeBlockerCardId: closeCard ? null : FOUNDATION_SURFACE_UPDATES_CARD_ID,
      metadata: {
        ...(sprint.metadata || {}),
        currentStatus: closeCard ? 'sprint_complete_pending_rollover' : 'foundation_surface_updates_active',
        lastClosedCardId: closeCard ? FOUNDATION_SURFACE_UPDATES_CARD_ID : sprint.metadata?.lastClosedCardId,
        lastCloseoutKey: closeCard ? FOUNDATION_SURFACE_UPDATES_CLOSEOUT_KEY : sprint.metadata?.lastCloseoutKey,
        approvalPolicy: sprint.metadata?.approvalPolicy || 'Blockers block unsafe actions, not the whole sprint. Park approval-bound operations and continue to the next safe card.',
      },
    },
    items: merged,
  }
}

async function applyLiveClose({ activeSprint, planReview, evaluation }) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: FOUNDATION_SURFACE_UPDATES_SCRIPT_PATH,
    operation: 'close FOUNDATION-SURFACE-UPDATES-001 and finish the current sprint',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await updateBacklogItem(FOUNDATION_SURFACE_UPDATES_CARD_ID, {
    lane: 'done',
    priority: 'P1',
    rank: 9,
    nextAction: `Done under ${FOUNDATION_SURFACE_UPDATES_CLOSEOUT_KEY}; roll the next safe Foundation sprint from live backlog truth and continue unattended.`,
    statusNote: `Closed 2026-05-20 under ${FOUNDATION_SURFACE_UPDATES_CLOSEOUT_KEY}; Overview -> Systems -> Backlog -> Recent Work is visible, Recent Work where-it-lives entries render app/doc/backlog breadcrumbs, done rows show an honest moved-to-done signal, and verifier expectations now allow this follow-up to be done.`,
    owner: 'Foundation UI',
  }, ACTOR)
  await upsertPlanCriticRun(planReview)
  await upsertFoundationCurrentSprintOverlay(
    buildUpdatedSprintOverlay({ activeSprint, closeCard: true }),
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: activeSprint.sprint?.sprintId || FOUNDATION_SURFACE_UPDATES_SPRINT_ID,
      reason: `${FOUNDATION_SURFACE_UPDATES_CARD_ID} closes the final card in the current sprint.`,
    },
  )
  const closeout = renderFoundationSurfaceUpdatesCloseout({
    evaluation,
    planSummary: buildPlanCriticResultSummary(planReview),
    generatedAt: new Date().toISOString(),
  })
  await fs.mkdir(path.dirname(path.join(repoRoot, FOUNDATION_SURFACE_UPDATES_CLOSEOUT_PATH)), { recursive: true })
  await fs.writeFile(path.join(repoRoot, FOUNDATION_SURFACE_UPDATES_CLOSEOUT_PATH), closeout)
}

async function main() {
  const args = parseArgs()
  if (args.closeCard) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: FOUNDATION_SURFACE_UPDATES_SCRIPT_PATH,
      operation: 'close FOUNDATION-SURFACE-UPDATES-001 and finish the current sprint',
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
    })
  }

  let dbInitialized = false
  try {
    const checks = []
    const [
      approvalValidation,
      planSource,
      currentStateSource,
      operationsSource,
      foundationClientSource,
      operatorAssuranceSource,
      recentBuildsVerifierSource,
      closeoutRegistrySource,
      scriptSource,
      packageJson,
    ] = await Promise.all([
      validatePlanApprovalFile({ repoRoot, approvalRef: FOUNDATION_SURFACE_UPDATES_APPROVAL_PATH, cardId: FOUNDATION_SURFACE_UPDATES_CARD_ID }),
      readRepoFile(FOUNDATION_SURFACE_UPDATES_PLAN_PATH),
      readRepoFile('public/foundation-current-state-renderers.js'),
      readRepoFile('public/foundation-operations-renderers.js'),
      readRepoFile('public/foundation.js'),
      readRepoFile('lib/foundation-verifier-operator-live-surface-assurance.js'),
      readRepoFile('lib/foundation-recent-builds-verifier.js'),
      readRepoFile('lib/foundation-build-closeout-foundation-surface-records.js'),
      readRepoFile(FOUNDATION_SURFACE_UPDATES_SCRIPT_PATH),
      readRepoJson('package.json'),
    ])

    const planReview = evaluatePlanCriticPlan({
      planText: planSource,
      card: {
        id: FOUNDATION_SURFACE_UPDATES_CARD_ID,
        title: 'Make Foundation surfaces plain-English and easy to inspect',
        priority: 'P1',
      },
      changedFiles: FOUNDATION_SURFACE_UPDATES_CHANGED_FILES,
      declaredRisk: 'Operator-facing UI can create false confidence if links are fake, dates are invented, or a previously scoped verifier follow-up closes without proof.',
      repoRoot,
    })
    const planSummary = buildPlanCriticResultSummary(planReview)
    const evaluation = evaluateFoundationSurfaceUpdates({
      currentStateSource,
      operationsSource,
      foundationClientSource,
      operatorAssuranceSource,
      recentBuildsVerifierSource,
      closeoutRegistrySource,
      packageJson,
    })

    await initFoundationDb()
    dbInitialized = true
    const activeSprint = await getActiveFoundationCurrentSprint()
    const [cards, planCriticRuns] = await Promise.all([
      getBacklogItemsByIds([FOUNDATION_SURFACE_UPDATES_CARD_ID]),
      getPlanCriticRunsByCardIds([FOUNDATION_SURFACE_UPDATES_CARD_ID]),
    ])
    const currentActiveBlocker =
      activeSprint?.activeBlocker?.cardId ||
      activeSprint?.activeBlockerCardId ||
      activeSprint?.sprint?.activeBlockerCardId
    const currentItem = (activeSprint.items || []).find(item => item.cardId === FOUNDATION_SURFACE_UPDATES_CARD_ID)
    const surfaceCardDone = cards.some(card => card.id === FOUNDATION_SURFACE_UPDATES_CARD_ID && card.lane === 'done')
    const surfaceSprintDone = surfaceCardDone && currentItem?.stage === 'done_this_sprint'
    const closeout = getFoundationBuildCloseouts().find(record => record.key === FOUNDATION_SURFACE_UPDATES_CLOSEOUT_KEY)

    addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'approval validates', approvalValidation.failures?.map(item => item.check).join(', ') || FOUNDATION_SURFACE_UPDATES_APPROVAL_PATH)
    addCheck(checks, approvalValidation.approval?.cardId === FOUNDATION_SURFACE_UPDATES_CARD_ID && Number(approvalValidation.approval?.score) >= 9.8, 'approval score is 9.8+', `${approvalValidation.approval?.cardId || 'missing'} / ${approvalValidation.approval?.score || 'missing'}`)
    addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes surface update plan', `${planReview.status} ${planReview.score}/10`)
    addCheck(checks, cards.some(card => card.id === FOUNDATION_SURFACE_UPDATES_CARD_ID), 'live backlog card exists', cards.map(card => card.id).join(', ') || 'missing')
    addCheck(checks, currentActiveBlocker === FOUNDATION_SURFACE_UPDATES_CARD_ID || surfaceSprintDone || (args.closeCard && !currentActiveBlocker), 'Current Sprint owns surface updates before or after closeout', surfaceSprintDone ? currentItem.stage : currentActiveBlocker || 'none')
    addCheck(checks, currentItem && ['scoping', 'sprint_ready', 'building_now', 'done_this_sprint'].includes(currentItem.stage), 'Current Sprint includes surface card', currentItem?.stage || 'missing')
    addCheck(checks, evaluation.ok, 'surface implementation evaluation is healthy', evaluation.failed.map(item => item.check).join('; ') || JSON.stringify(evaluation.summary))
    addCheck(checks, packageJson.scripts?.['process:foundation-surface-updates-check'] === `node --env-file-if-exists=.env ${FOUNDATION_SURFACE_UPDATES_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:foundation-surface-updates-check'] || 'missing')
    addCheck(checks, scriptSource.includes('assertProcessCheckWriteAllowed') && scriptSource.includes('updateBacklogItem') && scriptSource.includes('upsertFoundationCurrentSprintOverlay'), 'focused script uses explicit write guard for closeout', 'write guard markers present')
    addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(FOUNDATION_SURFACE_UPDATES_CARD_ID), 'closeout registry exposes surface card', closeout?.key || 'missing')
    addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8) || planReview.status === 'pass' || args.closeCard, 'durable Plan Critic pass exists or current run passes', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || `${planReview.status}/${planReview.score}`)

    for (const relativePath of FOUNDATION_SURFACE_UPDATES_CHANGED_FILES.filter(file => file.startsWith('docs/') || file.startsWith('lib/') || file.startsWith('scripts/') || file.startsWith('public/') || file === 'package.json')) {
      const willWriteCloseout = args.closeCard && relativePath === FOUNDATION_SURFACE_UPDATES_CLOSEOUT_PATH
      const closeoutPending = !args.closeCard && relativePath === FOUNDATION_SURFACE_UPDATES_CLOSEOUT_PATH
      addCheck(
        checks,
        willWriteCloseout || closeoutPending || await repoFileExists(relativePath),
        `${relativePath} exists`,
        willWriteCloseout || closeoutPending ? 'will be written on close' : relativePath,
      )
    }

    const preCloseFailed = checks.filter(check => !check.ok)
    if (args.closeCard && preCloseFailed.length === 0) {
      await applyLiveClose({ activeSprint, planReview, evaluation })
    }

    const refreshedSprint = await getActiveFoundationCurrentSprint()
    const refreshedCards = await getBacklogItemsByIds([FOUNDATION_SURFACE_UPDATES_CARD_ID])
    const refreshedCurrent = refreshedCards.find(card => card.id === FOUNDATION_SURFACE_UPDATES_CARD_ID)
    const refreshedItem = (refreshedSprint.items || []).find(item => item.cardId === FOUNDATION_SURFACE_UPDATES_CARD_ID)
    const refreshedActiveBlocker = refreshedSprint.sprint?.activeBlockerCardId || null
    const sprintStatus = buildFoundationCurrentSprintStatus({
      sprint: refreshedSprint.sprint,
      items: refreshedSprint.items,
      backlogItems: refreshedCards,
      closeouts: getFoundationBuildCloseouts(),
      planCriticRuns: refreshedSprint.planCriticRuns || null,
    })
    const closeoutDoc = await readRepoFile(FOUNDATION_SURFACE_UPDATES_CLOSEOUT_PATH, { optional: true })
    addCheck(checks, !args.closeCard || refreshedCurrent?.lane === 'done', 'close-card marks surface card done in Backlog', refreshedCurrent?.lane || 'missing')
    addCheck(checks, !args.closeCard || refreshedItem?.stage === 'done_this_sprint', 'close-card marks surface card done this sprint', refreshedItem?.stage || 'missing')
    addCheck(checks, !args.closeCard || !refreshedActiveBlocker, 'close-card leaves completed sprint with no active blocker before rollover', refreshedActiveBlocker || 'none')
    addCheck(checks, !args.closeCard || sprintStatus.status === 'healthy', 'Current Sprint remains healthy after all-done closeout', sprintStatus.findings?.map(item => item.check).join(', ') || 'healthy')
    addCheck(checks, !args.closeCard || closeoutDoc.includes(FOUNDATION_SURFACE_UPDATES_CLOSEOUT_KEY), 'close-card writes surface closeout handoff', closeoutDoc ? 'present' : FOUNDATION_SURFACE_UPDATES_CLOSEOUT_PATH)

    const failed = checks.filter(check => !check.ok)
    const report = {
      ok: failed.length === 0,
      status: failed.length ? 'risk' : 'healthy',
      cardId: FOUNDATION_SURFACE_UPDATES_CARD_ID,
      closeoutKey: FOUNDATION_SURFACE_UPDATES_CLOSEOUT_KEY,
      generatedAt: new Date().toISOString(),
      closed: args.closeCard,
      activeBlocker: refreshedActiveBlocker,
      planSummary,
      summary: {
        checks: checks.length,
        failed: failed.length,
        ...evaluation.summary,
      },
      checks,
      failed,
      dogfood: evaluation.dogfood,
    }

    if (args.json) {
      console.log(JSON.stringify(report, null, 2))
    } else {
      console.log(`FOUNDATION-SURFACE-UPDATES-001 status: ${report.status}`)
      for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} -> ${check.detail}`)
    }
    if (failed.length) process.exitCode = 1
  } finally {
    if (dbInitialized) await closeFoundationDb()
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
})
