#!/usr/bin/env node

import crypto from 'node:crypto'
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
  DRIVE_CONTENT_CARD_ID,
} from '../lib/drive-content-next-bite.js'
import {
  DRIVE_CONTENT_TARGET_KEY,
  DRIVE_CORPUS_TARGET_KEY,
  DRIVE_WORKER_APPROVAL_PATH,
  DRIVE_WORKER_CARD_ID,
  DRIVE_WORKER_CHANGED_FILES,
  DRIVE_WORKER_CLOSEOUT_KEY,
  DRIVE_WORKER_CLOSEOUT_PATH,
  DRIVE_WORKER_NEXT_CARD_ID,
  DRIVE_WORKER_PLAN_PATH,
  DRIVE_WORKER_PROOF_COMMANDS,
  DRIVE_WORKER_SCRIPT_PATH,
  buildDriveWorkerDogfoodProof,
  buildDriveWorkerStatus,
} from '../lib/drive-worker-proof.js'
import {
  WEB_GODMODE_SPRINT_CARD_ORDER,
  WEB_GODMODE_SPRINT_ID,
} from '../lib/web-godmode-extractor.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
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

async function repoFileExists(relativePath) {
  try {
    const stat = await fs.stat(path.join(repoRoot, relativePath))
    return stat.isFile()
  } catch {
    return false
  }
}

function stableRunId(seed = '') {
  return crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 12)
}

function cardIds() {
  return Array.from(new Set([
    DRIVE_WORKER_CARD_ID,
    DRIVE_WORKER_NEXT_CARD_ID,
    DRIVE_CONTENT_CARD_ID,
    ...WEB_GODMODE_SPRINT_CARD_ORDER,
  ]))
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: DRIVE_WORKER_CARD_ID,
    title: 'Build the Google Drive inventory and extraction worker',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P1',
    rank: 46,
    source: 'May 19 GOD-mode extraction sprint and existing Drive corpus/content ledgers.',
    summary: 'Close Drive worker V1 by proving the governed inventory and content lanes are live, file classes are routed, duplicate fingerprints are visible, explicit skips are preserved, and unsafe Drive permission/media work is parked.',
    whyItMatters: 'Drive contains strategy, training, SOPs, sales assets, product ideas, and operations IP. The worker needs enough control-plane truth to extract useful content without turning into a broad permission-mutating crawl.',
    nextAction: closeCard
      ? `Done under \`${DRIVE_WORKER_CLOSEOUT_KEY}\`; continue \`${DRIVE_WORKER_NEXT_CARD_ID}\` with Build Intel review routing.`
      : 'Build Drive worker control-plane proof from existing corpus/content targets. Do not mutate Drive permissions or run broad media/OCR/provider work.',
    statusNote: closeCard
      ? `Closed under \`${DRIVE_WORKER_CLOSEOUT_KEY}\`; inventory/content lanes are governed, route matrix is explicit, and Drive permissions were not mutated.`
      : `Executing \`${DRIVE_WORKER_CLOSEOUT_KEY}\`; governed Drive worker control-plane proof only.`,
    owner: 'Foundation Extraction',
  }
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `drive-worker-${stableRunId(DRIVE_WORKER_PLAN_PATH)}`,
    result: {
      status: planReview.status,
      score: planReview.score,
      cardId: DRIVE_WORKER_CARD_ID,
      closeoutKey: DRIVE_WORKER_CLOSEOUT_KEY,
    },
  }
}

async function queryDriveWorkerLedger() {
  const pool = createPool()
  try {
    const [targets, corpusItems, contentItems] = await Promise.all([
      pool.query(
        `
          SELECT target_key AS "targetKey", source_id AS "sourceId", title, status,
                 runtime_mode AS "runtimeMode", last_run_at AS "lastRunAt",
                 last_status AS "lastStatus", inspected_count AS "inspectedCount",
                 archived_count AS "archivedCount", extracted_count AS "extractedCount",
                 last_error AS "lastError", budget, dedupe_policy AS "dedupePolicy", metadata
          FROM source_crawl_targets
          WHERE target_key IN ($1,$2)
        `,
        [DRIVE_CORPUS_TARGET_KEY, DRIVE_CONTENT_TARGET_KEY],
      ),
      pool.query(
        `
          SELECT item_key, item_type, status, retry_reason, retry_state,
                 retry_blocker_card, last_error, artifact_id, metadata, updated_at
          FROM source_crawl_items
          WHERE target_key = $1
          ORDER BY updated_at DESC
          LIMIT 500
        `,
        [DRIVE_CORPUS_TARGET_KEY],
      ),
      pool.query(
        `
          SELECT item_key, item_type, status, retry_reason, retry_state,
                 retry_blocker_card, last_error, artifact_id, metadata, updated_at
          FROM source_crawl_items
          WHERE target_key = $1
          ORDER BY updated_at DESC
          LIMIT 500
        `,
        [DRIVE_CONTENT_TARGET_KEY],
      ),
    ])
    return {
      corpusTarget: targets.rows.find(row => row.targetKey === DRIVE_CORPUS_TARGET_KEY) || null,
      contentTarget: targets.rows.find(row => row.targetKey === DRIVE_CONTENT_TARGET_KEY) || null,
      corpusItems: corpusItems.rows,
      contentItems: contentItems.rows,
    }
  } finally {
    await pool.end()
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, planReview } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const row = buildCardRow({ closeCard })
  const planRun = buildPlanCriticRun(planReview)
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
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P1','standard',true,$6::text[],$7::jsonb,$8::jsonb,'codex-drive-worker')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        planRun.runId,
        DRIVE_WORKER_CARD_ID,
        DRIVE_WORKER_PLAN_PATH,
        planReview.status,
        planReview.score,
        DRIVE_WORKER_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify(planRun.result),
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

function mergeSprintItems(previous = {}, { closeCard = false } = {}) {
  const existingById = new Map((previous.items || []).map(item => [item.cardId, item]))
  return WEB_GODMODE_SPRINT_CARD_ORDER.map((cardId, index) => {
    const existing = existingById.get(cardId) || {}
    if (cardId === DRIVE_WORKER_CARD_ID && closeCard) {
      return {
        ...existing,
        cardId,
        order: index + 1,
        stage: 'done_this_sprint',
        closeoutKey: DRIVE_WORKER_CLOSEOUT_KEY,
        proofCommands: DRIVE_WORKER_PROOF_COMMANDS,
        nextAction: `Continue ${DRIVE_WORKER_NEXT_CARD_ID}.`,
        definitionOfDone: existing.definitionOfDone || 'Drive worker V1 proves governed inventory/content lanes, route matrix, duplicate/file ID visibility, explicit skip reasons, and no Drive permission mutation.',
        notNextBoundaries: existing.notNextBoundaries || [
          'No Drive permission mutation, request-access email, broad Drive sweep, unsupported media download, provider/model call, credential mutation, external write, or public exposure.',
        ],
      }
    }
    if (cardId === DRIVE_WORKER_NEXT_CARD_ID && closeCard) {
      return {
        ...existing,
        cardId,
        order: index + 1,
        stage: 'scoping',
        nextAction: existing.nextAction || 'Build the Build Intel daily extraction review queue from existing governed extractor outputs.',
      }
    }
    return {
      ...existing,
      cardId,
      order: index + 1,
    }
  })
}

async function ensureLiveState({ closeCard = false, planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: DRIVE_WORKER_SCRIPT_PATH,
    operation: 'upsert Drive worker card, Plan Critic row, and Current Sprint state',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await upsertLiveCardAndPlanCritic({ closeCard, planReview })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: WEB_GODMODE_SPRINT_ID,
        status: 'active',
        activeBlockerCardId: closeCard ? DRIVE_WORKER_NEXT_CARD_ID : DRIVE_WORKER_CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: closeCard ? 'drive_worker_closed_next_build_intel_review' : 'drive_worker_active',
          lastClosedCardId: closeCard ? DRIVE_WORKER_CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `DRIVE-WORKER-001 closed under ${DRIVE_WORKER_CLOSEOUT_KEY}. Continue ${DRIVE_WORKER_NEXT_CARD_ID}.`
            : 'Finish Drive worker V1 without Drive permission mutation or broad media/provider work.',
        },
      },
      items: mergeSprintItems(previous, { closeCard }),
    },
    'codex-drive-worker',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || WEB_GODMODE_SPRINT_ID,
      reason: 'Steve approved unattended Foundation-only GOD-mode extraction sprint.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  await initFoundationDb()
  const [
    planSource,
    approval,
    cards,
    packageJson,
    closeoutRegistrySource,
    closeoutDoc,
    ledger,
  ] = await Promise.all([
    readRepoFile(DRIVE_WORKER_PLAN_PATH),
    validatePlanApprovalFile({ repoRoot, approvalRef: DRIVE_WORKER_APPROVAL_PATH, cardId: DRIVE_WORKER_CARD_ID }),
    getBacklogItemsByIds(cardIds()),
    readRepoJson('package.json'),
    readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
    readRepoFile(DRIVE_WORKER_CLOSEOUT_PATH, { optional: true }),
    queryDriveWorkerLedger(),
  ])
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow(),
    changedFiles: DRIVE_WORKER_CHANGED_FILES,
    declaredRisk: 'Drive inventory/content worker control plane with permission mutation and broad crawl boundaries',
    repoRoot,
  })
  const status = buildDriveWorkerStatus(ledger)
  const dogfood = buildDriveWorkerDogfoodProof()
  if (args.closeCard) await ensureLiveState({ closeCard: true, planReview })
  const activeSprint = await getActiveFoundationCurrentSprint()
  const sprintCardIds = (activeSprint.items || []).map(item => item.cardId).filter(Boolean)
  const sprintCards = await getBacklogItemsByIds(sprintCardIds)
  const planCriticRuns = await getPlanCriticRunsByCardIds([...cardIds(), ...sprintCardIds])
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: activeSprint.sprint,
    items: activeSprint.items,
    backlogItems: sprintCards,
    closeouts: getFoundationBuildCloseouts(),
    planCriticRuns,
  })
  const card = (await getBacklogItemsByIds([DRIVE_WORKER_CARD_ID])).find(item => item.id === DRIVE_WORKER_CARD_ID) || cards.find(item => item.id === DRIVE_WORKER_CARD_ID) || null
  const contentCard = cards.find(item => item.id === DRIVE_CONTENT_CARD_ID) || null
  const nextCard = cards.find(item => item.id === DRIVE_WORKER_NEXT_CARD_ID) || null
  const driveItem = (activeSprint.items || []).find(item => item.cardId === DRIVE_WORKER_CARD_ID) || null
  const nextItem = (activeSprint.items || []).find(item => item.cardId === DRIVE_WORKER_NEXT_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === DRIVE_WORKER_CLOSEOUT_KEY) || null

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || DRIVE_WORKER_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for Drive worker V1', buildPlanCriticResultSummary(planReview))
  addCheck(checks, planCriticRuns.some(run => run.cardId === DRIVE_WORKER_CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, contentCard?.lane === 'done', 'DRIVE-CONTENT prerequisite is done', contentCard ? `${contentCard.id}:${contentCard.lane}` : 'missing')
  addCheck(checks, card && (args.closeCard ? card.lane === 'done' : ['research', 'scoped', 'executing'].includes(card.lane)), 'live Drive worker card exists with expected lane', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, nextCard && ['research', 'scoped', 'executing', 'done'].includes(nextCard.lane), 'next Build Intel review card remains live', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, status.ok && status.status === 'ready', 'Drive worker status is ready from live ledgers', status.failed.map(item => item.check).join(', ') || 'ready')
  addCheck(checks, status.summary.duplicateFingerprintCount >= 0 && status.summary.driveFileIdCount >= 150, 'Drive worker exposes duplicate/file-id fingerprint basis', `ids=${status.summary.driveFileIdCount} duplicateDelta=${status.summary.duplicateFingerprintCount}`)
  addCheck(checks, status.routeMatrix.length >= 5, 'Drive worker route matrix covers inventory/content/shortcut/slides/media lanes', status.routeMatrix.map(row => `${row.route}:${row.status}`).join(', '))
  addCheck(checks, dogfood.ok === true, 'dogfood rejects missing inventory, failed targets, permission mutation, and vague skips', JSON.stringify(dogfood.rejectedCases))
  addCheck(checks, Object.values(status.sideEffects).every(value => value === false || value === 0), 'Drive worker starts no live side effects', JSON.stringify(status.sideEffects))
  addCheck(checks, packageJson.scripts?.['process:drive-worker-check'] === `node --env-file-if-exists=.env ${DRIVE_WORKER_SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:drive-worker-check'] || 'missing')
  addCheck(checks, closeoutRegistrySource.includes(DRIVE_WORKER_CLOSEOUT_KEY) && closeoutRegistrySource.includes(DRIVE_WORKER_CARD_ID), 'closeout registry source includes Drive worker record', 'lib/foundation-build-closeout-intelligence-records.js')
  addCheck(checks, closeout?.status === 'accepted' && closeout.operatorCloseout === true && (closeout.backlogIds || []).includes(DRIVE_WORKER_CARD_ID), 'build closeout lookup resolves Drive worker record', closeout?.key || 'missing')
  addCheck(checks, await repoFileExists(DRIVE_WORKER_CLOSEOUT_PATH), 'closeout handoff exists', DRIVE_WORKER_CLOSEOUT_PATH)
  addCheck(checks, closeoutDoc.includes(DRIVE_WORKER_NEXT_CARD_ID) && closeoutDoc.includes('No Drive permission mutation'), 'closeout states next card and Drive permission boundary', DRIVE_WORKER_CLOSEOUT_PATH)
  if (args.closeCard) {
    addCheck(checks, activeSprint.sprint?.activeBlockerCardId === DRIVE_WORKER_NEXT_CARD_ID, 'Current Sprint advances to next safe card', activeSprint.sprint?.activeBlockerCardId || 'missing')
    addCheck(checks, driveItem?.stage === 'done_this_sprint', 'Current Sprint marks Drive worker done this sprint', driveItem ? `${driveItem.cardId}:${driveItem.stage}` : 'missing')
    addCheck(checks, nextItem?.stage === 'scoping', 'next card remains visible for safe continuation', nextItem ? `${nextItem.cardId}:${nextItem.stage}` : 'missing')
  }
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint remains healthy after Drive worker closeout', currentSprintStatus.findings?.map(item => `${item.check}:${item.detail}`).join('; ') || 'healthy')

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    cardId: DRIVE_WORKER_CARD_ID,
    closeoutKey: DRIVE_WORKER_CLOSEOUT_KEY,
    nextCardId: DRIVE_WORKER_NEXT_CARD_ID,
    driveWorker: status,
    dogfood,
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }
  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`Drive worker check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Drive worker check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
