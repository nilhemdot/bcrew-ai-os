#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
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
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
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
  FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_APPROVAL_PATH,
  FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CARD_ID,
  FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CHANGED_FILES,
  FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CLOSEOUT_KEY,
  FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CSS_PATHS,
  FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_NEXT_CARD_ID,
  FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_PLAN_PATH,
  FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_PROOF_COMMANDS,
  FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_SCRIPT_PATH,
  buildFoundationOversizedFileSplitWaveDogfoodProof,
  buildFoundationOversizedFileSplitWaveSnapshot,
} from '../lib/foundation-oversized-file-split-wave.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-oversized-file-split-wave'
const PACKAGE_SCRIPT = 'process:foundation-oversized-file-split-wave-check'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: false,
    closeCard: false,
    stage: 'building_now',
  }
  for (const arg of argv) {
    if (arg === '--apply' || arg === '--apply=true') args.apply = true
    if (arg === '--close-card' || arg === '--close-card=true') args.closeCard = true
    if (arg.startsWith('--stage=')) args.stage = arg.slice('--stage='.length)
  }
  args.apply = args.apply || isProcessCheckWriteRequested({
    argv,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  args.closeCard = args.closeCard || isProcessCheckWriteRequested({
    argv,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function stableRunId(seed = '') {
  return crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 12)
}

function normalizeStage(stage = 'building_now') {
  return ['scoping', 'sprint_ready', 'building_now'].includes(stage) ? stage : 'building_now'
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
        `foundation-oversized-file-split-wave-${stableRunId(FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_PLAN_PATH)}`,
        FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CARD_ID,
        FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_PLAN_PATH,
        planReview.status,
        planReview.score,
        FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({
          status: planReview.status,
          score: planReview.score,
          cardId: FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CARD_ID,
          closeoutKey: FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CLOSEOUT_KEY,
          summary: buildPlanCriticResultSummary(planReview),
        }),
        ACTOR,
      ],
    )
  } finally {
    client.release()
    await pool.end()
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  return {
    cardId: FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CARD_ID,
    order: 7,
    stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
    planRef: FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_PLAN_PATH,
    definitionOfDone: 'V1 splits public/dev.css into ordered Dev core, YouTube/source, and source/approval CSS modules, updates existing proof scripts to read the bundle, and proves Dev Hub/source-session/System Truth selectors still resolve.',
    proofCommands: FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_PROOF_COMMANDS,
    readinessBlockerCleared: 'Closeout records-as-data V1 shipped, so the next safe unattended cleanup is an oversized frontend file split.',
    notNextBoundaries: [
      'Do not redesign the Dev page or change runtime behavior.',
      'Do not start FOUNDATION-HUB-FOLDER-ISOLATION-001 or any per-hub folder restructure.',
      'Do not split scripts/foundation-verify.mjs in this card.',
      'Do not delete verifier/approval/plan/check files.',
      'Do not delete scripts/codex-status.mjs.',
      'Do not work MEETING-VAULT-ACL-001 Phase B.',
      'Do not mutate Drive permissions.',
      'Do not mutate source rows, extraction state, browser/session state, atoms/vectors, credentials, or external systems.',
      'Do not touch or weaken MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001, source-session readiness, local-browser route policy, Dev Hub System Truth, or /api/foundation/dev-team-hub posture.',
    ],
    metadata: {
      closeoutKey: FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CLOSEOUT_KEY,
      v1Scope: 'public-dev-css-split',
      nextCardId: FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_NEXT_CARD_ID,
    },
  }
}

function mergeSprintItems(currentSprint = {}, item, closeCard = false) {
  const nextItems = list(currentSprint.items).map(existing => {
    if (existing.cardId !== FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CARD_ID) return existing
    return {
      ...existing,
      ...item,
      order: existing.order || existing.sprintOrder || item.order,
      sprintOrder: existing.sprintOrder || existing.order || item.order,
    }
  })
  if (!nextItems.some(existing => existing.cardId === FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CARD_ID)) {
    nextItems.push(item)
  }
  if (!closeCard) return nextItems
  return nextItems.map(existing => {
    if (existing.cardId !== FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_NEXT_CARD_ID) return existing
    return {
      ...existing,
      stage: existing.stage === 'done_this_sprint' ? existing.stage : 'scoping',
    }
  })
}

async function applyLiveState({ closeCard = false, stage = 'building_now', planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_SCRIPT_PATH,
    operation: 'update oversized file split backlog, Plan Critic, and Current Sprint state',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })

  await updateBacklogItem(FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CARD_ID, {
    lane: closeCard ? 'done' : 'executing',
    priority: 'P1',
    rank: 7,
    nextAction: closeCard
      ? `Done under ${FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CLOSEOUT_KEY}; continue ${FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_NEXT_CARD_ID}.`
      : 'Split public/dev.css into ordered CSS modules and prove Dev Hub/source-session/System Truth selectors still resolve.',
    statusNote: closeCard
      ? `Closed on 2026-05-30 under ${FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CLOSEOUT_KEY}. Proof: public/dev.css split to Dev core plus YouTube/source and source/approval modules; focused proof, Dev Hub, source-session readiness, source-family, System Truth, foundation:verify, and ship gate required before push.`
      : `Building ${FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CLOSEOUT_KEY}; V1 is a CSS ownership split only, not a visual redesign or per-hub restructure.`,
    owner: 'Foundation Builder',
  }, ACTOR)
  await upsertPlanCriticRun(planReview)

  const activeSprint = await getActiveFoundationCurrentSprint()
  const sprintId = activeSprint.sprint?.sprintId || 'FOUNDATION-TUNEUP-2026-05-29'
  const item = buildSprintItem({ closeCard, stage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId,
        status: activeSprint.sprint?.status || 'active',
        goal: activeSprint.sprint?.goal || 'Foundation tune-up from Claude/Codex audits.',
        activeBlockerCardId: closeCard
          ? FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_NEXT_CARD_ID
          : FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CARD_ID,
        metadata: {
          ...(activeSprint.sprint?.metadata || {}),
          activeBlockerCardId: closeCard
            ? FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_NEXT_CARD_ID
            : FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CARD_ID,
          oversizedFileSplitWaveV1: closeCard ? 'done_public_dev_css_split' : 'building_public_dev_css_split',
          nextAction: closeCard
            ? `Continue ${FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_NEXT_CARD_ID}; keep per-hub restructure parked for Steve checkpoint.`
            : 'Finish the public/dev.css split and prove Dev Hub/source-session/System Truth selectors still resolve.',
        },
      },
      items: mergeSprintItems(activeSprint, item, closeCard),
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: sprintId,
      reason: 'Steve approved overnight Foundation tune-up continuation; oversized file split is the active cleanup card.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  let applied = false

  await initFoundationDb()
  try {
    const [
      packageJson,
      planSource,
      htmlSource,
      coverageSource,
      ...cssValues
    ] = await Promise.all([
      readRepoJson('package.json'),
      readRepoFile(FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_PLAN_PATH),
      readRepoFile('public/dev.html'),
      readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
      ...FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CSS_PATHS.map(readRepoFile),
    ])
    const cssSources = Object.fromEntries(
      FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CSS_PATHS.map((cssPath, index) => [cssPath, cssValues[index] || '']),
    )
    const planReview = evaluatePlanCriticPlan({
      card: {
        id: FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CARD_ID,
        priority: 'P1',
      },
      planRef: FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_PLAN_PATH,
      planText: planSource,
      changedFiles: FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CHANGED_FILES,
      declaredRisk: 'Frontend CSS asset split, package script, Current Sprint state, closeout metadata, and Foundation verifier proof.',
    })
    const snapshot = buildFoundationOversizedFileSplitWaveSnapshot({
      htmlSource,
      cssSources,
      coverageSource,
    })
    const dogfood = buildFoundationOversizedFileSplitWaveDogfoodProof()

    if (args.apply || args.closeCard) {
      await applyLiveState({ closeCard: args.closeCard, stage: args.stage, planReview })
      applied = true
    }

    const activeSprint = await getActiveFoundationCurrentSprint()
    const backlogItems = await getBacklogItemsByIds(list(activeSprint.items).map(item => item.cardId))
    const planCriticRuns = await getPlanCriticRunsByCardIds(list(activeSprint.items).map(item => item.cardId))
    const currentSprintStatus = buildFoundationCurrentSprintStatus({
      sprint: activeSprint.sprint,
      items: activeSprint.items,
      backlogItems,
      closeouts: getFoundationBuildCloseouts(),
      planCriticRuns,
    })
    const activeItem = list(activeSprint.items)
      .find(item => item.cardId === FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CARD_ID)
    const approval = args.closeCard
      ? await validatePlanApprovalFile({
        repoRoot,
        approvalRef: FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_APPROVAL_PATH,
        cardId: FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CARD_ID,
      })
      : null

    addCheck(
      checks,
      packageJson.scripts?.[PACKAGE_SCRIPT]?.includes(FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_SCRIPT_PATH),
      'package exposes oversized file split proof',
      packageJson.scripts?.[PACKAGE_SCRIPT] || 'missing script',
    )
    addCheck(
      checks,
      planReview.status === 'pass' && planReview.score >= PLAN_CRITIC_MIN_PASS_SCORE,
      'Plan Critic passes for oversized file split V1',
      buildPlanCriticResultSummary(planReview),
    )
    addCheck(
      checks,
      snapshot.ok,
      'oversized file split snapshot is healthy',
      snapshot.failed.map(check => check.check).join(', ') || 'healthy',
    )
    addCheck(
      checks,
      dogfood.ok,
      'dogfood proves the split check rejects real audit failure modes',
      `oversizedRejected=${dogfood.oversizedUnsplitRejected} missingSelectorRejected=${dogfood.missingSelectorRejected}`,
    )
    addCheck(
      checks,
      !args.closeCard || approval?.ok === true,
      'approval file validates when closing',
      approval ? (approval.ok ? 'valid' : approval.failures.map(failure => failure.check).join(', ')) : 'not-closing',
    )
    addCheck(
      checks,
      !applied ||
        (args.closeCard
          ? currentSprintStatus.status === 'healthy' &&
            activeSprint.sprint?.activeBlockerCardId === FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_NEXT_CARD_ID &&
            activeItem?.stage === 'done_this_sprint'
          : activeSprint.sprint?.activeBlockerCardId === FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CARD_ID &&
            activeItem?.stage === normalizeStage(args.stage)),
      'Current Sprint reflects requested oversized file split posture',
      args.closeCard
        ? `${currentSprintStatus.status}:${activeSprint.sprint?.activeBlockerCardId}:${activeItem?.stage}`
        : `${activeSprint.sprint?.activeBlockerCardId}:${activeItem?.stage}`,
    )

    const failed = [...checks, ...snapshot.checks].filter(check => !check.ok)
    const result = {
      ok: failed.length === 0,
      status: failed.length ? 'risk' : 'healthy',
      cardId: FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CARD_ID,
      closeoutKey: FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CLOSEOUT_KEY,
      applied,
      closed: args.closeCard,
      planCritic: {
        status: planReview.status,
        score: planReview.score,
        summary: buildPlanCriticResultSummary(planReview),
      },
      snapshot: {
        lineCounts: snapshot.lineCounts,
        totalCssLines: snapshot.totalCssLines,
        missingSelectors: snapshot.missingSelectors,
        missingProgressionBlockers: snapshot.missingProgressionBlockers,
      },
      currentSprint: {
        status: currentSprintStatus.status,
        activeBlockerCardId: activeSprint.sprint?.activeBlockerCardId,
        itemStage: activeItem?.stage || null,
      },
      checks: [...checks, ...snapshot.checks],
      failed,
    }
    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`${result.status}: ${FOUNDATION_OVERSIZED_FILE_SPLIT_WAVE_CARD_ID}`)
      for (const check of result.checks) {
        console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
      }
    }
    if (!result.ok) process.exitCode = 1
  } finally {
    await closeFoundationDb().catch(() => {})
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
