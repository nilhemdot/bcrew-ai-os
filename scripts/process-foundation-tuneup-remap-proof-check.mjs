#!/usr/bin/env node

import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { buildAgenticCodebaseMap } from '../lib/agentic-codebase-map.js'
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
  FOUNDATION_TUNEUP_REMAP_APPROVAL_PATH,
  FOUNDATION_TUNEUP_REMAP_CARD_ID,
  FOUNDATION_TUNEUP_REMAP_CHANGED_FILES,
  FOUNDATION_TUNEUP_REMAP_CLOSEOUT_KEY,
  FOUNDATION_TUNEUP_REMAP_NEXT_CARD_ID,
  FOUNDATION_TUNEUP_REMAP_NOT_NEXT_BOUNDARIES,
  FOUNDATION_TUNEUP_REMAP_PLAN_PATH,
  FOUNDATION_TUNEUP_REMAP_PROOF_COMMANDS,
  FOUNDATION_TUNEUP_REMAP_SCRIPT_PATH,
  FOUNDATION_TUNEUP_REQUIRED_DONE_CARDS,
  buildFoundationTuneupRemapDogfoodProof,
  buildFoundationTuneupRemapSnapshot,
} from '../lib/foundation-tuneup-remap-proof.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-foundation-tuneup-remap-proof'
const PACKAGE_SCRIPT = 'process:foundation-tuneup-remap-proof-check'

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

async function readTrackedSources() {
  const tracked = listTrackedFiles()
  const sourcePaths = tracked.filter(file =>
    /\.(mjs|js|css|json)$/.test(file) &&
    !file.startsWith('node_modules/') &&
    !file.startsWith('docs/_archive/') &&
    !file.startsWith('.openclaw/') &&
    !file.startsWith('.claude/')
  )
  const sources = {}
  for (const file of sourcePaths) {
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
        `foundation-tuneup-remap-${stableRunId(FOUNDATION_TUNEUP_REMAP_PLAN_PATH)}`,
        FOUNDATION_TUNEUP_REMAP_CARD_ID,
        FOUNDATION_TUNEUP_REMAP_PLAN_PATH,
        planReview.status,
        planReview.score,
        FOUNDATION_TUNEUP_REMAP_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({
          status: planReview.status,
          score: planReview.score,
          cardId: FOUNDATION_TUNEUP_REMAP_CARD_ID,
          closeoutKey: FOUNDATION_TUNEUP_REMAP_CLOSEOUT_KEY,
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
    cardId: FOUNDATION_TUNEUP_REMAP_CARD_ID,
    order: 11,
    stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
    planRef: FOUNDATION_TUNEUP_REMAP_PLAN_PATH,
    definitionOfDone: 'The codebase is remapped after the tune-up, audit baselines are compared to live repo facts, no generated graph/private state is committed, and the next per-hub restructure stays checkpoint-only.',
    proofCommands: FOUNDATION_TUNEUP_REMAP_PROOF_COMMANDS,
    readinessBlockerCleared: 'Prior safe tune-up cards are closed; remap proof is read-only except live backlog/sprint closeout writes.',
    notNextBoundaries: FOUNDATION_TUNEUP_REMAP_NOT_NEXT_BOUNDARIES,
    metadata: {
      approvalRef: FOUNDATION_TUNEUP_REMAP_APPROVAL_PATH,
      closeoutKey: FOUNDATION_TUNEUP_REMAP_CLOSEOUT_KEY,
      nextCardId: FOUNDATION_TUNEUP_REMAP_NEXT_CARD_ID,
      v1Scope: 'read-only-after-tuneup-remap-proof',
    },
  }
}

function buildCheckpointHubItem(existing = {}) {
  return {
    ...existing,
    cardId: FOUNDATION_TUNEUP_REMAP_NEXT_CARD_ID,
    order: existing.order || existing.sprintOrder || 3,
    sprintOrder: existing.sprintOrder || existing.order || 3,
    stage: 'scoping',
    readinessBlockerCleared: 'Steve checkpoint required before any per-hub folder implementation.',
    notNextBoundaries: [
      'Do not implement per-hub folder restructure until Steve reviews the remap proof and explicitly approves the build card.',
      ...FOUNDATION_TUNEUP_REMAP_NOT_NEXT_BOUNDARIES,
    ],
    metadata: {
      ...(existing.metadata || {}),
      checkpointRequired: true,
      checkpointReason: 'FOUNDATION-TUNEUP-REMAP-PROOF-001 closed; per-hub restructure is the next big L-effort decision.',
    },
  }
}

function mergeSprintItems(currentSprint = {}, item, closeCard = false) {
  const nextItems = list(currentSprint.items).map(existing => {
    if (existing.cardId === FOUNDATION_TUNEUP_REMAP_CARD_ID) {
      return {
        ...existing,
        ...item,
        order: existing.order || existing.sprintOrder || item.order,
        sprintOrder: existing.sprintOrder || existing.order || item.order,
      }
    }
    if (closeCard && existing.cardId === FOUNDATION_TUNEUP_REMAP_NEXT_CARD_ID) {
      return buildCheckpointHubItem(existing)
    }
    return existing
  })
  if (!nextItems.some(existing => existing.cardId === FOUNDATION_TUNEUP_REMAP_CARD_ID)) {
    nextItems.push(item)
  }
  if (closeCard && !nextItems.some(existing => existing.cardId === FOUNDATION_TUNEUP_REMAP_NEXT_CARD_ID)) {
    nextItems.push(buildCheckpointHubItem())
  }
  return nextItems
}

async function applyLiveState({ closeCard = false, stage = 'building_now', planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: FOUNDATION_TUNEUP_REMAP_SCRIPT_PATH,
    operation: 'update remap proof backlog, Plan Critic, and Current Sprint state',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })

  await updateBacklogItem(FOUNDATION_TUNEUP_REMAP_CARD_ID, {
    lane: closeCard ? 'done' : 'executing',
    priority: 'P1',
    rank: 11,
    nextAction: closeCard
      ? `Done under ${FOUNDATION_TUNEUP_REMAP_CLOSEOUT_KEY}; stop for Steve checkpoint before ${FOUNDATION_TUNEUP_REMAP_NEXT_CARD_ID}.`
      : 'Run the read-only codebase remap and compare audit baselines to live repo facts.',
    statusNote: closeCard
      ? `Closed on 2026-05-30 under ${FOUNDATION_TUNEUP_REMAP_CLOSEOUT_KEY}. V1 remapped the codebase after the tune-up, compared live import/file-size/doc signals to audit baselines, and left per-hub restructuring checkpoint-only.`
      : `Building ${FOUNDATION_TUNEUP_REMAP_CLOSEOUT_KEY}; read-only remap proof, no generated graph or per-hub implementation.`,
    owner: 'Foundation Builder',
  }, ACTOR)
  if (closeCard) {
    await updateBacklogItem(FOUNDATION_TUNEUP_REMAP_NEXT_CARD_ID, {
      lane: 'scoped',
      priority: 'P1',
      rank: 3,
      nextAction: 'Steve checkpoint required before implementation. Review the remap proof and approve the per-hub folder card before any code restructure starts.',
      statusNote: 'Checkpoint-only after foundation-tuneup-remap-proof-v1. Do not implement per-hub folder restructure until Steve explicitly approves the build card.',
      owner: 'Foundation Builder',
    }, ACTOR)
  }
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
          ? FOUNDATION_TUNEUP_REMAP_NEXT_CARD_ID
          : FOUNDATION_TUNEUP_REMAP_CARD_ID,
        metadata: {
          ...(activeSprint.sprint?.metadata || {}),
          activeBlockerCardId: closeCard
            ? FOUNDATION_TUNEUP_REMAP_NEXT_CARD_ID
            : FOUNDATION_TUNEUP_REMAP_CARD_ID,
          remapProofV1: closeCard ? 'done_stop_for_hub_checkpoint' : 'building_readonly_remap',
          nextAction: closeCard
            ? `Stop for Steve checkpoint before ${FOUNDATION_TUNEUP_REMAP_NEXT_CARD_ID}; do not implement per-hub folders unattended.`
            : 'Finish read-only tune-up remap proof.',
        },
      },
      items: mergeSprintItems(activeSprint, item, closeCard),
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: sprintId,
      reason: 'Steve approved overnight Foundation tune-up continuation; remap V1 is read-only and leaves per-hub restructure parked for checkpoint.',
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
      trackedSources,
      activeSprintBefore,
    ] = await Promise.all([
      readRepoJson('package.json'),
      readRepoFile(FOUNDATION_TUNEUP_REMAP_PLAN_PATH),
      readRepoFile('lib/foundation-build-closeout-process-gate-operations-records.js'),
      readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
      readRepoFile('scripts/process-foundation-tuneup-roadmap-check.mjs'),
      readTrackedSources(),
      getActiveFoundationCurrentSprint(),
    ])
    const liveCardIds = [
      ...FOUNDATION_TUNEUP_REQUIRED_DONE_CARDS,
      FOUNDATION_TUNEUP_REMAP_CARD_ID,
      FOUNDATION_TUNEUP_REMAP_NEXT_CARD_ID,
    ]
    const liveCards = await getBacklogItemsByIds(liveCardIds)
    const map = await buildAgenticCodebaseMap({ repoRoot })
    const planReview = evaluatePlanCriticPlan({
      card: {
        id: FOUNDATION_TUNEUP_REMAP_CARD_ID,
        priority: 'P1',
      },
      planRef: FOUNDATION_TUNEUP_REMAP_PLAN_PATH,
      planText: planSource,
      changedFiles: FOUNDATION_TUNEUP_REMAP_CHANGED_FILES,
      declaredRisk: 'Foundation process proof card, codebase map readback, package script, Current Sprint state, closeout metadata, and before/after audit baseline readback. No generated graph, plugin install, docs deletion, per-hub restructure, source rows, browser sessions, or external writes.',
    })
    const snapshot = buildFoundationTuneupRemapSnapshot({
      map,
      packageScripts: packageJson.scripts || {},
      trackedSources,
      liveCards,
      planSource,
      closeoutSource,
      coverageSource,
      roadmapSource,
    })
    const dogfood = buildFoundationTuneupRemapDogfoodProof()

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
    const activeItem = list(activeSprint.items).find(item => item.cardId === FOUNDATION_TUNEUP_REMAP_CARD_ID)
    const checkpointItem = list(activeSprint.items).find(item => item.cardId === FOUNDATION_TUNEUP_REMAP_NEXT_CARD_ID)
    const latestCards = await getBacklogItemsByIds([
      FOUNDATION_TUNEUP_REMAP_CARD_ID,
      FOUNDATION_TUNEUP_REMAP_NEXT_CARD_ID,
    ])
    const remapCard = latestCards.find(card => card.id === FOUNDATION_TUNEUP_REMAP_CARD_ID)
    const nextCard = latestCards.find(card => card.id === FOUNDATION_TUNEUP_REMAP_NEXT_CARD_ID)
    const approval = args.closeCard
      ? await validatePlanApprovalFile({
        repoRoot,
        approvalRef: FOUNDATION_TUNEUP_REMAP_APPROVAL_PATH,
        cardId: FOUNDATION_TUNEUP_REMAP_CARD_ID,
      })
      : null

    addCheck(
      checks,
      packageJson.scripts?.[PACKAGE_SCRIPT] ===
        'node --env-file-if-exists=.env scripts/process-foundation-tuneup-remap-proof-check.mjs',
      'package script points at focused tune-up remap checker',
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
      'tune-up remap snapshot is healthy',
      snapshot.failed.map(check => check.check).join('; ') || 'healthy',
    )
    addCheck(
      checks,
      dogfood.ok === true,
      'dogfood rejects unreduced import pressure and started hub restructure',
      dogfood.ok ? 'healthy' : 'failed',
    )
    addCheck(
      checks,
      Boolean(activeItem || args.closeCard) &&
        (args.closeCard || !applied || activeItem.stage === normalizeStage(args.stage)),
      'Current Sprint contains remap proof at expected stage',
      activeItem ? `${activeItem.cardId}/${activeItem.stage}` : 'closed',
    )
    if (args.closeCard) {
      addCheck(
        checks,
        remapCard?.lane === 'done' &&
          nextCard?.lane === 'scoped' &&
          activeSprint.sprint?.activeBlockerCardId === FOUNDATION_TUNEUP_REMAP_NEXT_CARD_ID &&
          checkpointItem?.stage === 'scoping',
        'close-card advances only to per-hub checkpoint, not implementation',
        `remap=${remapCard?.lane || 'missing'} next=${nextCard?.lane || 'missing'} active=${activeSprint.sprint?.activeBlockerCardId || 'missing'} stage=${checkpointItem?.stage || 'missing'}`,
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
      cardId: FOUNDATION_TUNEUP_REMAP_CARD_ID,
      closeoutKey: FOUNDATION_TUNEUP_REMAP_CLOSEOUT_KEY,
      nextCardId: FOUNDATION_TUNEUP_REMAP_NEXT_CARD_ID,
      applied,
      closeCard: args.closeCard,
      snapshotSummary: snapshot.summary,
      importSnapshot: snapshot.importSnapshot,
      currentSprintBefore: {
        sprintId: activeSprintBefore.sprint?.sprintId || null,
        activeBlockerCardId: activeSprintBefore.sprint?.activeBlockerCardId || null,
      },
      currentSprint: {
        sprintId: activeSprint.sprint?.sprintId || null,
        activeBlockerCardId: activeSprint.sprint?.activeBlockerCardId || null,
        status: currentSprintStatus.status,
      },
      planReview: {
        status: planReview.status,
        score: planReview.score,
        summary: buildPlanCriticResultSummary(planReview),
      },
      checks,
      failed,
    }

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else if (result.ok) {
      console.log(`${FOUNDATION_TUNEUP_REMAP_CARD_ID}: healthy`)
    } else {
      console.error(`${FOUNDATION_TUNEUP_REMAP_CARD_ID}: blocked`)
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
