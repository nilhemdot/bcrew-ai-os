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
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  initFoundationDb,
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
  SOURCE_020_APPROVAL_PATH,
  SOURCE_020_CARD_ID,
  SOURCE_020_CHANGED_FILES,
  SOURCE_020_CLOSEOUT_KEY,
  SOURCE_020_CLOSEOUT_PATH,
  SOURCE_020_NEXT_CARD_ID,
  SOURCE_020_NOT_NEXT,
  SOURCE_020_PLAN_PATH,
  SOURCE_020_PROOF_COMMANDS,
  SOURCE_020_REQUIRED_FILES,
  SOURCE_020_SCRIPT_PATH,
  buildSource020AdapterHardeningSnapshot,
  buildSource020DogfoodProof,
} from '../lib/source-020-shared-comms-adapters.js'
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

async function repoFileExists(relativePath) {
  try {
    const stat = await fs.stat(path.join(repoRoot, relativePath))
    return stat.isFile()
  } catch {
    return false
  }
}

function cardIds() {
  return Array.from(new Set([
    SOURCE_020_CARD_ID,
    SOURCE_020_NEXT_CARD_ID,
    'SOURCE-019',
    ...WEB_GODMODE_SPRINT_CARD_ORDER,
  ]))
}

async function readRequiredFileSources() {
  const entries = await Promise.all(SOURCE_020_REQUIRED_FILES.map(async relativePath => [
    relativePath,
    await readRepoFile(relativePath),
  ]))
  return Object.fromEntries(entries)
}

async function queryAdapterInputs() {
  const pool = createPool()
  try {
    const [targetResult, artifactResult] = await Promise.all([
      pool.query(
        `
          SELECT target_key, source_id, status, runtime_mode, last_run_at, next_run_at,
                 last_status, last_error, inspected_count, archived_count, extracted_count
          FROM source_crawl_targets
          WHERE source_id IN ('SRC-GMAIL-001','SRC-MISSIVE-001','SRC-SLACK-001','SRC-MEETINGS-001')
          ORDER BY source_id, target_key
        `,
      ),
      pool.query(
        `
          SELECT source_id, artifact_type, count(*)::int AS total, max(ingested_at) AS latest_ingested_at
          FROM shared_communication_artifacts
          WHERE source_id IN ('SRC-GMAIL-001','SRC-MISSIVE-001','SRC-SLACK-001','SRC-MEETINGS-001')
          GROUP BY source_id, artifact_type
          ORDER BY source_id, artifact_type
        `,
      ),
    ])
    return {
      targetRows: targetResult.rows,
      artifactRows: artifactResult.rows,
    }
  } finally {
    await pool.end()
  }
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: SOURCE_020_CARD_ID,
    title: 'Port and harden the shared communications source adapters',
    team: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P1',
    rank: 45,
    source: 'Shared communications implementation review, SOURCE-019 layer proof, and old-system research-team harvest.',
    summary: 'Prove the shared communications adapters are live, paginated, archive-backed, target-ledgered, and mutation-safe across Google delegated readers, Missive, Slack, Gmail attachments, and meeting notes/transcripts.',
    whyItMatters: 'The shared communications intelligence layer depends on stable source adapters. Hardening the adapter contract prevents the system from rebuilding old brittle connector sprawl or silently losing source coverage.',
    nextAction: closeCard
      ? `Done under \`${SOURCE_020_CLOSEOUT_KEY}\`; continue \`${SOURCE_020_NEXT_CARD_ID}\` for source trust scoring.`
      : 'Close the shared communications adapter hardening proof without live private reruns, external writes, or broad backfill.',
    statusNote: closeCard
      ? `Closed under \`${SOURCE_020_CLOSEOUT_KEY}\`; shared comms adapters are proven as read-first, paginated, archive-backed, and mutation-safe.`
      : `Executing \`${SOURCE_020_CLOSEOUT_KEY}\`; adapter proof over existing local code and source target truth.`,
    owner: 'Foundation Source',
  }
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `source-020-${stableRunId(SOURCE_020_PLAN_PATH)}`,
    result: {
      status: planReview.status,
      score: planReview.score,
      cardId: SOURCE_020_CARD_ID,
      closeoutKey: SOURCE_020_CLOSEOUT_KEY,
    },
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
      [row.id, row.title, row.team, row.lane, row.priority, row.rank, row.source, row.summary, row.whyItMatters, row.nextAction, row.statusNote, row.owner],
    )
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P1','standard',true,$6::text[],$7::jsonb,$8::jsonb,'codex-source-020')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        planRun.runId,
        SOURCE_020_CARD_ID,
        SOURCE_020_PLAN_PATH,
        planReview.status,
        planReview.score,
        SOURCE_020_CHANGED_FILES,
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
    if (cardId === SOURCE_020_CARD_ID && closeCard) {
      return {
        ...existing,
        cardId,
        order: index + 1,
        stage: 'done_this_sprint',
        closeoutKey: SOURCE_020_CLOSEOUT_KEY,
        proofCommands: SOURCE_020_PROOF_COMMANDS,
        nextAction: `Continue ${SOURCE_020_NEXT_CARD_ID}.`,
        definitionOfDone: 'Shared communications adapters are proven as read-first, paginated, archive-backed, target-ledgered, artifact-covered, and mutation-safe without live private reruns or external writes.',
        notNextBoundaries: SOURCE_020_NOT_NEXT,
      }
    }
    if (cardId === SOURCE_020_NEXT_CARD_ID && closeCard) {
      return {
        ...existing,
        cardId,
        order: index + 1,
        stage: 'scoping',
        nextAction: existing.nextAction || 'Scope source trust scoring over source status, freshness, completeness, health, and decision-worthiness.',
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
    scriptPath: SOURCE_020_SCRIPT_PATH,
    operation: 'upsert SOURCE-020 card, Plan Critic row, and Current Sprint state',
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
        activeBlockerCardId: closeCard ? SOURCE_020_NEXT_CARD_ID : SOURCE_020_CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: closeCard ? 'source_020_closed_next_data_002' : 'source_020_active',
          lastClosedCardId: closeCard ? SOURCE_020_CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `SOURCE-020 closed under ${SOURCE_020_CLOSEOUT_KEY}. Continue ${SOURCE_020_NEXT_CARD_ID}.`
            : 'Finish SOURCE-020 adapter hardening without live private reruns or unsafe writes.',
        },
      },
      items: mergeSprintItems(previous, { closeCard }),
    },
    'codex-source-020',
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
    activeSprintBeforeWrite,
    packageJson,
    closeoutRegistrySource,
    closeoutDoc,
    sourceNote,
    fileSources,
    adapterInputs,
  ] = await Promise.all([
    readRepoFile(SOURCE_020_PLAN_PATH),
    validatePlanApprovalFile({ repoRoot, approvalRef: SOURCE_020_APPROVAL_PATH, cardId: SOURCE_020_CARD_ID }),
    getActiveFoundationCurrentSprint(),
    readRepoJson('package.json'),
    readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
    readRepoFile(SOURCE_020_CLOSEOUT_PATH, { optional: true }),
    readRepoFile('docs/source-notes/shared-communications.md'),
    readRequiredFileSources(),
    queryAdapterInputs(),
  ])

  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow(),
    changedFiles: SOURCE_020_CHANGED_FILES,
    declaredRisk: 'Shared communications source adapter hardening proof over local connector code and source target truth without live reruns or external writes',
    repoRoot,
  })
  const adapterSnapshot = buildSource020AdapterHardeningSnapshot({
    fileSources,
    ...adapterInputs,
  })
  const dogfood = buildSource020DogfoodProof()

  if (args.closeCard) await ensureLiveState({ closeCard: true, planReview })

  const activeSprint = await getActiveFoundationCurrentSprint()
  const sprintCardIds = (activeSprint.items || []).map(item => item.cardId).filter(Boolean)
  const sprintCards = await getBacklogItemsByIds(sprintCardIds)
  const cards = await getBacklogItemsByIds(cardIds())
  const planCriticRuns = await getPlanCriticRunsByCardIds([...cardIds(), ...sprintCardIds])
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: activeSprint.sprint,
    items: activeSprint.items,
    backlogItems: sprintCards,
    closeouts: getFoundationBuildCloseouts(),
    planCriticRuns,
  })
  const card = cards.find(item => item.id === SOURCE_020_CARD_ID) || null
  const previousCard = cards.find(item => item.id === 'SOURCE-019') || null
  const nextCard = cards.find(item => item.id === SOURCE_020_NEXT_CARD_ID) || null
  const source020Item = (activeSprint.items || []).find(item => item.cardId === SOURCE_020_CARD_ID) || null
  const nextItem = (activeSprint.items || []).find(item => item.cardId === SOURCE_020_NEXT_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === SOURCE_020_CLOSEOUT_KEY) || null

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || SOURCE_020_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for SOURCE-020', buildPlanCriticResultSummary(planReview))
  addCheck(checks, planCriticRuns.some(run => run.cardId === SOURCE_020_CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, previousCard?.lane === 'done', 'SOURCE-019 prerequisite is done', previousCard ? `${previousCard.id}:${previousCard.lane}` : 'missing')
  addCheck(checks, card && (args.closeCard ? card.lane === 'done' : ['research', 'scoped', 'executing', 'done'].includes(card.lane)), 'live SOURCE-020 card exists with expected lane', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, nextCard && ['research', 'scoped', 'executing', 'done'].includes(nextCard.lane), 'next DATA-002 card remains live', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, sourceNote.includes('Port the working readers') && sourceNote.includes('shared normalization layer'), 'source note names adapter hardening path', 'docs/source-notes/shared-communications.md')
  addCheck(checks, adapterSnapshot.status === 'ready', 'adapter hardening snapshot is ready', adapterSnapshot.failures.join('; ') || 'ready')
  addCheck(checks, adapterSnapshot.adapters.length === 3 && adapterSnapshot.adapters.every(adapter => adapter.ok), 'Google, Missive, and Slack adapters expose required functions and pagination', adapterSnapshot.adapters.map(adapter => `${adapter.key}:${adapter.ok}`).join(', '))
  addCheck(checks, adapterSnapshot.targetStatus.ok && adapterSnapshot.targetStatus.activeCount >= 5, 'active shared-comms source targets are latest-successful', `active=${adapterSnapshot.targetStatus.activeCount}`)
  addCheck(checks, adapterSnapshot.missingTargetKeys.length === 0, 'required shared-comms target keys are present', adapterSnapshot.requiredTargetKeys.join(', '))
  addCheck(checks, adapterSnapshot.artifactCoverage.ok && adapterSnapshot.artifactCoverage.total > 1000, 'required artifact lanes are populated', `artifacts=${adapterSnapshot.artifactCoverage.total}`)
  addCheck(checks, adapterSnapshot.privacyBoundary.readFirst && !adapterSnapshot.privacyBoundary.externalWrites && !adapterSnapshot.privacyBoundary.drivePermissionMutation, 'adapter proof is read-first and mutation-safe', JSON.stringify(adapterSnapshot.privacyBoundary))
  addCheck(checks, dogfood.ok === true, 'dogfood rejects missing adapter function, unsafe sync mutation, failed target, and missing artifact lane', JSON.stringify(dogfood.rejectedCases))
  addCheck(checks, packageJson.scripts?.['process:source-020-check'] === `node --env-file-if-exists=.env ${SOURCE_020_SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:source-020-check'] || 'missing')
  addCheck(checks, closeoutRegistrySource.includes(SOURCE_020_CLOSEOUT_KEY) && closeoutRegistrySource.includes(SOURCE_020_CARD_ID), 'closeout registry source includes SOURCE-020 record', 'lib/foundation-build-closeout-intelligence-records.js')
  addCheck(checks, closeout?.status === 'accepted' && closeout.operatorCloseout === true && (closeout.backlogIds || []).includes(SOURCE_020_CARD_ID), 'build closeout lookup resolves SOURCE-020 record', closeout?.key || 'missing')
  addCheck(checks, await repoFileExists(SOURCE_020_CLOSEOUT_PATH), 'closeout handoff exists', SOURCE_020_CLOSEOUT_PATH)
  addCheck(checks, closeoutDoc.includes(SOURCE_020_NEXT_CARD_ID) && closeoutDoc.includes('No live private source reruns'), 'closeout states next card and source boundaries', SOURCE_020_CLOSEOUT_PATH)
  if (args.closeCard) {
    addCheck(checks, activeSprint.sprint?.activeBlockerCardId === SOURCE_020_NEXT_CARD_ID, 'Current Sprint advances to next safe card', activeSprint.sprint?.activeBlockerCardId || 'missing')
    addCheck(checks, source020Item?.stage === 'done_this_sprint', 'Current Sprint marks SOURCE-020 done this sprint', source020Item ? `${source020Item.cardId}:${source020Item.stage}` : 'missing')
    addCheck(checks, nextItem?.stage === 'scoping', 'next DATA-002 card remains visible for safe continuation', nextItem ? `${nextItem.cardId}:${nextItem.stage}` : 'missing')
  }
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint remains healthy after SOURCE-020 closeout', currentSprintStatus.findings?.map(item => `${item.check}:${item.detail}`).join('; ') || 'healthy')

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    cardId: SOURCE_020_CARD_ID,
    closeoutKey: SOURCE_020_CLOSEOUT_KEY,
    nextCardId: SOURCE_020_NEXT_CARD_ID,
    adapters: adapterSnapshot,
    dogfood,
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }
  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`SOURCE-020 shared communications adapter check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('SOURCE-020 shared communications adapter check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
