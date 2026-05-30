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
  FOUNDATION_DOC_CONSOLIDATION_APPROVAL_PATH,
  FOUNDATION_DOC_CONSOLIDATION_CARD_ID,
  FOUNDATION_DOC_CONSOLIDATION_CHANGED_FILES,
  FOUNDATION_DOC_CONSOLIDATION_CLOSEOUT_KEY,
  FOUNDATION_DOC_CONSOLIDATION_NEXT_CARD_ID,
  FOUNDATION_DOC_CONSOLIDATION_NOT_NEXT_BOUNDARIES,
  FOUNDATION_DOC_CONSOLIDATION_PLAN_PATH,
  FOUNDATION_DOC_CONSOLIDATION_PROOF_COMMANDS,
  FOUNDATION_DOC_CONSOLIDATION_SCRIPT_PATH,
  FOUNDATION_DOC_ARCHIVE_MOVE_MANIFEST_PATH,
  buildFoundationDocArchiveMoveSnapshot,
  buildFoundationDocConsolidationSnapshot,
} from '../lib/foundation-doc-consolidation-truth-archive.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-doc-consolidation-truth-archive'
const PACKAGE_SCRIPT = 'process:foundation-doc-consolidation-truth-archive-check'

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

function listTrackedFiles() {
  return execFileSync('git', ['ls-files'], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
    .split(/\r?\n/)
    .map(file => file.trim())
    .filter(Boolean)
}

async function readDocSources() {
  const tracked = listTrackedFiles()
  const docPaths = tracked.filter(file =>
    file === 'README.md' ||
    file === 'AGENTS.md' ||
    file === 'SOUL.md' ||
    (file.startsWith('docs/') && file.endsWith('.md'))
  )
  const sources = {}
  for (const file of docPaths) {
    sources[file] = await readRepoFile(file)
  }
  return sources
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
        `foundation-doc-consolidation-${stableRunId(FOUNDATION_DOC_CONSOLIDATION_PLAN_PATH)}`,
        FOUNDATION_DOC_CONSOLIDATION_CARD_ID,
        FOUNDATION_DOC_CONSOLIDATION_PLAN_PATH,
        planReview.status,
        planReview.score,
        FOUNDATION_DOC_CONSOLIDATION_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({
          status: planReview.status,
          score: planReview.score,
          cardId: FOUNDATION_DOC_CONSOLIDATION_CARD_ID,
          closeoutKey: FOUNDATION_DOC_CONSOLIDATION_CLOSEOUT_KEY,
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
    cardId: FOUNDATION_DOC_CONSOLIDATION_CARD_ID,
    order: 10,
    stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
    planRef: FOUNDATION_DOC_CONSOLIDATION_PLAN_PATH,
    definitionOfDone: 'Tracked docs are classified into canonical truth, supporting docs, active handoffs/audits, plan history, or archive; no docs are moved or deleted; competing current-truth wording is bounded and inspectable.',
    proofCommands: FOUNDATION_DOC_CONSOLIDATION_PROOF_COMMANDS,
    readinessBlockerCleared: 'Prior code/process cleanup waves shipped; doc consolidation V1 is classification-only and no-delete.',
    notNextBoundaries: FOUNDATION_DOC_CONSOLIDATION_NOT_NEXT_BOUNDARIES,
    metadata: {
      approvalRef: FOUNDATION_DOC_CONSOLIDATION_APPROVAL_PATH,
      closeoutKey: FOUNDATION_DOC_CONSOLIDATION_CLOSEOUT_KEY,
      v1Scope: 'doc-classification-no-delete-no-move',
      nextCardId: FOUNDATION_DOC_CONSOLIDATION_NEXT_CARD_ID,
    },
  }
}

function mergeSprintItems(currentSprint = {}, item, closeCard = false) {
  const nextItems = list(currentSprint.items).map(existing => {
    if (existing.cardId !== FOUNDATION_DOC_CONSOLIDATION_CARD_ID) return existing
    return {
      ...existing,
      ...item,
      order: existing.order || existing.sprintOrder || item.order,
      sprintOrder: existing.sprintOrder || existing.order || item.order,
    }
  })
  if (!nextItems.some(existing => existing.cardId === FOUNDATION_DOC_CONSOLIDATION_CARD_ID)) {
    nextItems.push(item)
  }
  if (!closeCard) return nextItems
  return nextItems.map(existing => {
    if (existing.cardId !== FOUNDATION_DOC_CONSOLIDATION_NEXT_CARD_ID) return existing
    return {
      ...existing,
      stage: existing.stage === 'done_this_sprint' ? existing.stage : 'scoping',
    }
  })
}

async function applyLiveState({ closeCard = false, stage = 'building_now', planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: FOUNDATION_DOC_CONSOLIDATION_SCRIPT_PATH,
    operation: 'update doc-consolidation backlog, Plan Critic, and Current Sprint state',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })

  await updateBacklogItem(FOUNDATION_DOC_CONSOLIDATION_CARD_ID, {
    lane: closeCard ? 'done' : 'executing',
    priority: 'P2',
    rank: 10,
    nextAction: closeCard
      ? `Done under ${FOUNDATION_DOC_CONSOLIDATION_CLOSEOUT_KEY}; continue ${FOUNDATION_DOC_CONSOLIDATION_NEXT_CARD_ID}.`
      : 'Build the no-delete doc truth/archive classification proof before moving or deleting any docs.',
    statusNote: closeCard
      ? `Closed on 2026-05-30 under ${FOUNDATION_DOC_CONSOLIDATION_CLOSEOUT_KEY}. V1 classified tracked docs into canonical/supporting/archive/readback groups and did not move or delete docs.`
      : `Building ${FOUNDATION_DOC_CONSOLIDATION_CLOSEOUT_KEY}; classification-only, no delete and no doc moves.`,
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
          ? FOUNDATION_DOC_CONSOLIDATION_NEXT_CARD_ID
          : FOUNDATION_DOC_CONSOLIDATION_CARD_ID,
        metadata: {
          ...(activeSprint.sprint?.metadata || {}),
          activeBlockerCardId: closeCard
            ? FOUNDATION_DOC_CONSOLIDATION_NEXT_CARD_ID
            : FOUNDATION_DOC_CONSOLIDATION_CARD_ID,
          docConsolidationV1: closeCard ? 'done_classification_no_delete' : 'building_classification_no_delete',
          nextAction: closeCard
            ? `Continue ${FOUNDATION_DOC_CONSOLIDATION_NEXT_CARD_ID}; keep per-hub restructure parked for Steve checkpoint.`
            : 'Finish doc classification proof without moving or deleting docs.',
        },
      },
      items: mergeSprintItems(activeSprint, item, closeCard),
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: sprintId,
      reason: 'Steve approved overnight Foundation tune-up continuation; doc consolidation V1 is classification-only and no-delete.',
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
      archiveMoveManifestSource,
      docSources,
    ] = await Promise.all([
      readRepoJson('package.json'),
      readRepoFile(FOUNDATION_DOC_CONSOLIDATION_PLAN_PATH),
      Promise.resolve(JSON.stringify(getFoundationBuildCloseouts())),
      readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
      readRepoFile('scripts/process-foundation-tuneup-roadmap-check.mjs'),
      readRepoFile(FOUNDATION_DOC_ARCHIVE_MOVE_MANIFEST_PATH),
      readDocSources(),
    ])
    const planReview = evaluatePlanCriticPlan({
      card: {
        id: FOUNDATION_DOC_CONSOLIDATION_CARD_ID,
        priority: 'P2',
      },
      planRef: FOUNDATION_DOC_CONSOLIDATION_PLAN_PATH,
      planText: planSource,
      changedFiles: FOUNDATION_DOC_CONSOLIDATION_CHANGED_FILES,
      declaredRisk: 'Foundation process review card, package script, Current Sprint state, closeout metadata, and doc truth/archive classification. No docs are moved or deleted.',
    })
    const snapshot = buildFoundationDocConsolidationSnapshot({
      docSources,
      packageScripts: packageJson.scripts || {},
      planSource,
      closeoutSource,
      coverageSource,
      roadmapSource,
    })
    const archiveMoveSnapshot = buildFoundationDocArchiveMoveSnapshot({
      docSources,
      manifestSource: archiveMoveManifestSource,
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
      .find(item => item.cardId === FOUNDATION_DOC_CONSOLIDATION_CARD_ID)
    const liveCards = await getBacklogItemsByIds([
      FOUNDATION_DOC_CONSOLIDATION_CARD_ID,
      FOUNDATION_DOC_CONSOLIDATION_NEXT_CARD_ID,
    ])
    const liveCard = liveCards.find(card => card.id === FOUNDATION_DOC_CONSOLIDATION_CARD_ID)
    const nextCard = liveCards.find(card => card.id === FOUNDATION_DOC_CONSOLIDATION_NEXT_CARD_ID)
    const approval = args.closeCard
      ? await validatePlanApprovalFile({
        repoRoot,
        approvalRef: FOUNDATION_DOC_CONSOLIDATION_APPROVAL_PATH,
        cardId: FOUNDATION_DOC_CONSOLIDATION_CARD_ID,
      })
      : null

    addCheck(
      checks,
      packageJson.scripts?.[PACKAGE_SCRIPT] ===
        'node --env-file-if-exists=.env scripts/process-foundation-doc-consolidation-truth-archive-check.mjs',
      'package script points at focused doc-consolidation checker',
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
      'doc-consolidation snapshot is healthy',
      snapshot.failed.map(check => check.check).join('; ') || 'healthy',
    )
    addCheck(
      checks,
      archiveMoveSnapshot.ok === true,
      'doc-archive move reduction snapshot is healthy',
      archiveMoveSnapshot.failed.map(check => check.check).join('; ') || 'healthy',
    )
    addCheck(
      checks,
      Boolean(activeItem || args.closeCard) &&
        (args.closeCard || !applied || activeItem.stage === normalizeStage(args.stage)),
      'Current Sprint contains doc consolidation at expected stage',
      activeItem ? `${activeItem.cardId}/${activeItem.stage}` : 'closed',
    )
    if (args.closeCard) {
      addCheck(
        checks,
        liveCard?.lane === 'done' &&
          activeSprint.sprint?.activeBlockerCardId === FOUNDATION_DOC_CONSOLIDATION_NEXT_CARD_ID &&
          nextCard?.id === FOUNDATION_DOC_CONSOLIDATION_NEXT_CARD_ID,
        'close-card advances to remap proof without starting per-hub restructure',
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
      cardId: FOUNDATION_DOC_CONSOLIDATION_CARD_ID,
      closeoutKey: FOUNDATION_DOC_CONSOLIDATION_CLOSEOUT_KEY,
      nextCardId: FOUNDATION_DOC_CONSOLIDATION_NEXT_CARD_ID,
      applied,
      closeCard: args.closeCard,
      snapshotSummary: snapshot.summary,
      archiveMoveSummary: archiveMoveSnapshot.summary,
      canonicalPaths: snapshot.canonicalPaths,
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
      console.log(`${FOUNDATION_DOC_CONSOLIDATION_CARD_ID}: healthy`)
    } else {
      console.error(`${FOUNDATION_DOC_CONSOLIDATION_CARD_ID}: blocked`)
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
