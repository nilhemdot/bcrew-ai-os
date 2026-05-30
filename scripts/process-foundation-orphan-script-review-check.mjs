#!/usr/bin/env node

import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
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
  FOUNDATION_ORPHAN_SCRIPT_REVIEW_APPROVAL_PATH,
  FOUNDATION_ORPHAN_SCRIPT_REVIEW_CARD_ID,
  FOUNDATION_ORPHAN_SCRIPT_REVIEW_CHANGED_FILES,
  FOUNDATION_ORPHAN_SCRIPT_REVIEW_CLOSEOUT_KEY,
  FOUNDATION_ORPHAN_SCRIPT_REVIEW_CANDIDATES,
  FOUNDATION_ORPHAN_SCRIPT_REVIEW_NEXT_CARD_ID,
  FOUNDATION_ORPHAN_SCRIPT_REVIEW_NOT_NEXT_BOUNDARIES,
  FOUNDATION_ORPHAN_SCRIPT_REVIEW_PLAN_PATH,
  FOUNDATION_ORPHAN_SCRIPT_REVIEW_PROOF_COMMANDS,
  FOUNDATION_ORPHAN_SCRIPT_REVIEW_SCRIPT_PATH,
  buildFoundationOrphanScriptReviewSnapshot,
} from '../lib/foundation-orphan-script-review.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-orphan-script-review'
const PACKAGE_SCRIPT = 'process:foundation-orphan-script-review-check'
const SCAN_EXTENSIONS = new Set(['.cjs', '.css', '.html', '.js', '.json', '.md', '.mjs', '.sh'])
const MAX_SCAN_BYTES = 1000000

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: false,
    closeCard: false,
    stage: 'building_now',
  }
  for (const rawArg of argv) {
    const arg = String(rawArg || '')
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

function normalizeStage(stage = 'building_now') {
  return ['scoping', 'sprint_ready', 'building_now'].includes(stage) ? stage : 'building_now'
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

async function pathExists(relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath))
    return true
  } catch {
    return false
  }
}

function listTrackedFiles() {
  return execFileSync('git', ['ls-files'], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
    .split(/\r?\n/)
    .map(file => file.trim())
    .filter(Boolean)
}

async function readTextIfScanCandidate(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath)
  const ext = path.extname(relativePath)
  if (!SCAN_EXTENSIONS.has(ext)) return ''
  const stat = await fs.stat(absolutePath)
  if (!stat.isFile() || stat.size > MAX_SCAN_BYTES) return ''
  return fs.readFile(absolutePath, 'utf8')
}

async function buildCandidateFileRecords() {
  const trackedFiles = listTrackedFiles()
  const trackedSet = new Set(trackedFiles)
  const sourceByPath = new Map()
  for (const file of trackedFiles) {
    try {
      const source = await readTextIfScanCandidate(file)
      if (source) sourceByPath.set(file, source)
    } catch {
      continue
    }
  }

  const records = {}
  for (const candidate of FOUNDATION_ORPHAN_SCRIPT_REVIEW_CANDIDATES) {
    const needles = [
      candidate.path,
      path.basename(candidate.path),
    ].filter(Boolean)
    const references = []
    for (const [file, source] of sourceByPath.entries()) {
      if (file === candidate.path) continue
      if (needles.some(needle => source.includes(needle))) references.push(file)
    }
    records[candidate.path] = {
      exists: await pathExists(candidate.path),
      tracked: trackedSet.has(candidate.path),
      source: sourceByPath.get(candidate.path) || '',
      references: references.sort(),
    }
  }
  return records
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
        `foundation-orphan-script-review-${stableRunId(FOUNDATION_ORPHAN_SCRIPT_REVIEW_PLAN_PATH)}`,
        FOUNDATION_ORPHAN_SCRIPT_REVIEW_CARD_ID,
        FOUNDATION_ORPHAN_SCRIPT_REVIEW_PLAN_PATH,
        planReview.status,
        planReview.score,
        FOUNDATION_ORPHAN_SCRIPT_REVIEW_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({
          status: planReview.status,
          score: planReview.score,
          cardId: FOUNDATION_ORPHAN_SCRIPT_REVIEW_CARD_ID,
          closeoutKey: FOUNDATION_ORPHAN_SCRIPT_REVIEW_CLOSEOUT_KEY,
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
    cardId: FOUNDATION_ORPHAN_SCRIPT_REVIEW_CARD_ID,
    order: 9,
    stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
    planRef: FOUNDATION_ORPHAN_SCRIPT_REVIEW_PLAN_PATH,
    definitionOfDone: 'Named orphan-script candidates have keep/retire/repoint decisions with owner, reference evidence, protected-script guardrails, and no delete-first action.',
    proofCommands: FOUNDATION_ORPHAN_SCRIPT_REVIEW_PROOF_COMMANDS,
    readinessBlockerCleared: 'Done-semantics repair shipped and active blocker advanced to orphan-script review.',
    notNextBoundaries: FOUNDATION_ORPHAN_SCRIPT_REVIEW_NOT_NEXT_BOUNDARIES,
    metadata: {
      approvalRef: FOUNDATION_ORPHAN_SCRIPT_REVIEW_APPROVAL_PATH,
      closeoutKey: FOUNDATION_ORPHAN_SCRIPT_REVIEW_CLOSEOUT_KEY,
      v1Scope: 'review-only-script-ownership-decisions',
      nextCardId: FOUNDATION_ORPHAN_SCRIPT_REVIEW_NEXT_CARD_ID,
    },
  }
}

function mergeSprintItems(currentSprint = {}, item, closeCard = false) {
  const nextItems = list(currentSprint.items).map(existing => {
    if (existing.cardId !== FOUNDATION_ORPHAN_SCRIPT_REVIEW_CARD_ID) return existing
    return {
      ...existing,
      ...item,
      order: existing.order || existing.sprintOrder || item.order,
      sprintOrder: existing.sprintOrder || existing.order || item.order,
    }
  })
  if (!nextItems.some(existing => existing.cardId === FOUNDATION_ORPHAN_SCRIPT_REVIEW_CARD_ID)) {
    nextItems.push(item)
  }
  if (!closeCard) return nextItems
  return nextItems.map(existing => {
    if (existing.cardId !== FOUNDATION_ORPHAN_SCRIPT_REVIEW_NEXT_CARD_ID) return existing
    return {
      ...existing,
      stage: existing.stage === 'done_this_sprint' ? existing.stage : 'scoping',
    }
  })
}

async function applyLiveState({ closeCard = false, stage = 'building_now', planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: FOUNDATION_ORPHAN_SCRIPT_REVIEW_SCRIPT_PATH,
    operation: 'update orphan-script backlog, Plan Critic, and Current Sprint state',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })

  await updateBacklogItem(FOUNDATION_ORPHAN_SCRIPT_REVIEW_CARD_ID, {
    lane: closeCard ? 'done' : 'executing',
    priority: 'P1',
    rank: 9,
    nextAction: closeCard
      ? `Done under ${FOUNDATION_ORPHAN_SCRIPT_REVIEW_CLOSEOUT_KEY}; continue ${FOUNDATION_ORPHAN_SCRIPT_REVIEW_NEXT_CARD_ID}.`
      : 'Record owner-backed keep decisions for the named orphan-script candidates without deleting or archiving scripts.',
    statusNote: closeCard
      ? `Closed on 2026-05-30 under ${FOUNDATION_ORPHAN_SCRIPT_REVIEW_CLOSEOUT_KEY}. All named candidates were kept with owner/reference/protection rationale; no scripts were deleted or archived.`
      : `Building ${FOUNDATION_ORPHAN_SCRIPT_REVIEW_CLOSEOUT_KEY}; review-only card, no delete-first cleanup and no per-hub restructure.`,
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
          ? FOUNDATION_ORPHAN_SCRIPT_REVIEW_NEXT_CARD_ID
          : FOUNDATION_ORPHAN_SCRIPT_REVIEW_CARD_ID,
        metadata: {
          ...(activeSprint.sprint?.metadata || {}),
          activeBlockerCardId: closeCard
            ? FOUNDATION_ORPHAN_SCRIPT_REVIEW_NEXT_CARD_ID
            : FOUNDATION_ORPHAN_SCRIPT_REVIEW_CARD_ID,
          orphanScriptReviewV1: closeCard ? 'done_review_only_no_delete' : 'building_review_only_no_delete',
          nextAction: closeCard
            ? `Continue ${FOUNDATION_ORPHAN_SCRIPT_REVIEW_NEXT_CARD_ID}; keep per-hub restructure parked for Steve checkpoint.`
            : 'Finish orphan-script ownership decisions with no deletion and protected-lane proof.',
        },
      },
      items: mergeSprintItems(activeSprint, item, closeCard),
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: sprintId,
      reason: 'Steve approved overnight Foundation tune-up continuation; orphan-script review is the active no-delete card.',
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
      closeoutSource,
      coverageSource,
      roadmapSource,
      fileRecords,
    ] = await Promise.all([
      readRepoJson('package.json'),
      readRepoFile(FOUNDATION_ORPHAN_SCRIPT_REVIEW_PLAN_PATH),
      Promise.resolve(JSON.stringify(getFoundationBuildCloseouts())),
      readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
      readRepoFile('scripts/process-foundation-tuneup-roadmap-check.mjs'),
      buildCandidateFileRecords(),
    ])
    const planReview = evaluatePlanCriticPlan({
      card: {
        id: FOUNDATION_ORPHAN_SCRIPT_REVIEW_CARD_ID,
        priority: 'P1',
      },
      planRef: FOUNDATION_ORPHAN_SCRIPT_REVIEW_PLAN_PATH,
      planText: planSource,
      changedFiles: FOUNDATION_ORPHAN_SCRIPT_REVIEW_CHANGED_FILES,
      declaredRisk: 'Foundation process review card, package script, Current Sprint state, closeout metadata, and script-ownership guardrails.',
    })
    const snapshot = buildFoundationOrphanScriptReviewSnapshot({
      fileRecords,
      packageScripts: packageJson.scripts || {},
      planSource,
      closeoutSource,
      coverageSource,
      roadmapSource,
    })

    if (args.apply || args.closeCard) {
      await applyLiveState({ closeCard: args.closeCard, stage: args.stage, planReview })
      applied = true
    }

    const activeSprint = await getActiveFoundationCurrentSprint()
    const backlogCards = await getBacklogItemsByIds(list(activeSprint.items).map(item => item.cardId))
    const planCriticRuns = await getPlanCriticRunsByCardIds(list(activeSprint.items).map(item => item.cardId))
    const currentSprintStatus = buildFoundationCurrentSprintStatus({
      sprint: activeSprint.sprint,
      items: activeSprint.items,
      backlogItems: backlogCards,
      closeouts: getFoundationBuildCloseouts(),
      planCriticRuns,
    })
    const activeItem = list(activeSprint.items)
      .find(item => item.cardId === FOUNDATION_ORPHAN_SCRIPT_REVIEW_CARD_ID)
    const liveCards = await getBacklogItemsByIds([
      FOUNDATION_ORPHAN_SCRIPT_REVIEW_CARD_ID,
      FOUNDATION_ORPHAN_SCRIPT_REVIEW_NEXT_CARD_ID,
    ])
    const liveCard = liveCards.find(card => card.id === FOUNDATION_ORPHAN_SCRIPT_REVIEW_CARD_ID)
    const nextCard = liveCards.find(card => card.id === FOUNDATION_ORPHAN_SCRIPT_REVIEW_NEXT_CARD_ID)
    const approval = args.closeCard
      ? await validatePlanApprovalFile({
        repoRoot,
        approvalRef: FOUNDATION_ORPHAN_SCRIPT_REVIEW_APPROVAL_PATH,
        cardId: FOUNDATION_ORPHAN_SCRIPT_REVIEW_CARD_ID,
      })
      : null

    addCheck(
      checks,
      packageJson.scripts?.[PACKAGE_SCRIPT] ===
        'node --env-file-if-exists=.env scripts/process-foundation-orphan-script-review-check.mjs',
      'package script points at focused orphan-script checker',
      packageJson.scripts?.[PACKAGE_SCRIPT] || 'missing',
    )
    addCheck(
      checks,
      planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE,
      'Plan Critic passes at 9.8+',
      `${planReview.score}/10 ${planReview.status}`,
    )
    addCheck(
      checks,
      snapshot.ok === true,
      'orphan-script review snapshot is healthy',
      snapshot.failed.map(check => check.check).join('; ') || 'healthy',
    )
    addCheck(
      checks,
      Boolean(activeItem || args.closeCard) &&
        (args.closeCard || !applied || activeItem.stage === normalizeStage(args.stage)),
      'Current Sprint contains orphan-script review at expected stage',
      activeItem ? `${activeItem.cardId}/${activeItem.stage}` : 'closed',
    )
    if (args.closeCard) {
      addCheck(
        checks,
        liveCard?.lane === 'done' &&
          activeSprint.sprint?.activeBlockerCardId === FOUNDATION_ORPHAN_SCRIPT_REVIEW_NEXT_CARD_ID &&
          nextCard?.id === FOUNDATION_ORPHAN_SCRIPT_REVIEW_NEXT_CARD_ID,
        'close-card advances to doc consolidation without starting per-hub restructure',
        `lane=${liveCard?.lane || 'missing'} active=${activeSprint.sprint?.activeBlockerCardId || 'missing'} nextLane=${nextCard?.lane || 'missing'}`,
      )
      addCheck(
        checks,
        approval?.ok === true,
        'close-card approval is valid',
        approval?.ok ? 'approval valid' : (approval?.failures || []).map(failure => failure.check).join('; '),
      )
    }

    const failed = checks.filter(check => !check.ok)
    const result = {
      ok: failed.length === 0,
      status: failed.length === 0 ? 'healthy' : 'blocked',
      cardId: FOUNDATION_ORPHAN_SCRIPT_REVIEW_CARD_ID,
      closeoutKey: FOUNDATION_ORPHAN_SCRIPT_REVIEW_CLOSEOUT_KEY,
      nextCardId: FOUNDATION_ORPHAN_SCRIPT_REVIEW_NEXT_CARD_ID,
      applied,
      closeCard: args.closeCard,
      snapshotSummary: snapshot.summary,
      decisions: snapshot.evaluations.map(result => ({
        path: result.path,
        decision: result.decision,
        owner: result.owner,
        classification: result.classification,
        protected: result.protected,
        referenceCount: result.referenceCount,
      })),
      planReview: {
        status: planReview.status,
        score: planReview.score,
        summary: buildPlanCriticResultSummary(planReview),
      },
      currentSprint: {
        sprintId: activeSprint.sprint?.sprintId || null,
        activeBlockerCardId: activeSprint.sprint?.activeBlockerCardId || null,
        status: currentSprintStatus.status,
      },
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else if (result.ok) {
      console.log(`${FOUNDATION_ORPHAN_SCRIPT_REVIEW_CARD_ID}: healthy`)
    } else {
      console.error(`${FOUNDATION_ORPHAN_SCRIPT_REVIEW_CARD_ID}: blocked`)
      for (const failure of failed) console.error(`- ${failure.check}: ${failure.detail}`)
    }
    process.exitCode = result.ok ? 0 : 1
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack : String(error))
  process.exitCode = 1
})
