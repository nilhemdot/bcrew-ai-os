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
  getSharedCommunicationSynthesisSnapshot,
} from '../lib/foundation-shared-comms-db.js'
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
  SOURCE_019_APPROVAL_PATH,
  SOURCE_019_CARD_ID,
  SOURCE_019_CHANGED_FILES,
  SOURCE_019_CLOSEOUT_KEY,
  SOURCE_019_CLOSEOUT_PATH,
  SOURCE_019_NEXT_CARD_ID,
  SOURCE_019_NOT_NEXT,
  SOURCE_019_PLAN_PATH,
  SOURCE_019_PROOF_COMMANDS,
  SOURCE_019_REQUIRED_SOURCE_IDS,
  SOURCE_019_SCRIPT_PATH,
  buildSource019DogfoodProof,
  buildSource019SharedCommsLayerSnapshot,
} from '../lib/source-019-shared-comms-layer.js'
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
    SOURCE_019_CARD_ID,
    SOURCE_019_NEXT_CARD_ID,
    'BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001',
    'DRIVE-WORKER-001',
    ...WEB_GODMODE_SPRINT_CARD_ORDER,
  ]))
}

async function querySharedCommsLayerInputs() {
  const pool = createPool()
  try {
    const [artifactResult, candidateResult, candidateSampleResult, routeResult] = await Promise.all([
      pool.query(
        `
          SELECT source_id, artifact_type, count(*)::int AS total,
                 max(artifact_updated_at) AS latest_artifact_at,
                 max(ingested_at) AS latest_ingested_at
          FROM shared_communication_artifacts
          WHERE source_id = ANY($1::text[])
          GROUP BY source_id, artifact_type
          ORDER BY source_id, artifact_type
        `,
        [SOURCE_019_REQUIRED_SOURCE_IDS],
      ),
      pool.query(
        `
          SELECT source_id, candidate_type, status, count(*)::int AS total, max(updated_at) AS latest_updated_at
          FROM shared_communication_candidates
          WHERE source_id = ANY($1::text[])
          GROUP BY source_id, candidate_type, status
          ORDER BY source_id, candidate_type, status
        `,
        [SOURCE_019_REQUIRED_SOURCE_IDS],
      ),
      pool.query(
        `
          SELECT candidate_key, artifact_id, source_id, candidate_type, status, title, summary,
                 owner_hint, confidence, metadata, created_at, updated_at
          FROM shared_communication_candidates
          WHERE source_id = ANY($1::text[])
            AND status = 'pending'
          ORDER BY updated_at DESC, created_at DESC
          LIMIT 240
        `,
        [SOURCE_019_REQUIRED_SOURCE_IDS],
      ),
      pool.query(
        `
          SELECT route_type, destination_table, approval_status, count(*)::int AS total,
                 bool_and(approval_required) AS approval_required_all,
                 max(updated_at) AS latest_updated_at
          FROM intelligence_action_routes
          GROUP BY route_type, destination_table, approval_status
          ORDER BY route_type, destination_table, approval_status
        `,
      ),
    ])
    return {
      artifactRows: artifactResult.rows,
      candidateRows: candidateResult.rows,
      candidateSamples: candidateSampleResult.rows,
      routeRows: routeResult.rows,
    }
  } finally {
    await pool.end()
  }
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: SOURCE_019_CARD_ID,
    title: 'Build the shared communications ingestion and synthesis layer',
    team: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P1',
    rank: 44,
    source: 'Shared communications audit, old-system research-team harvest, and May 19 GOD-mode extraction sprint.',
    summary: 'Prove the shared communications layer spans Gmail, Missive, Slack, and meetings from archive through candidates, synthesis controls, and approval-gated action routes.',
    whyItMatters: 'The value is turning communication places where the team already works into usable intelligence without making Steve or Carson reread every message, thread, note, and transcript manually.',
    nextAction: closeCard
      ? `Done under \`${SOURCE_019_CLOSEOUT_KEY}\`; continue \`${SOURCE_019_NEXT_CARD_ID}\` to harden the source adapters.`
      : 'Close the shared communications control-plane proof without private reruns, provider calls, or downstream auto-writes.',
    statusNote: closeCard
      ? `Closed under \`${SOURCE_019_CLOSEOUT_KEY}\`; shared comms archive/candidates/synthesis/action routing are wired as one governed proposal layer.`
      : `Executing \`${SOURCE_019_CLOSEOUT_KEY}\`; proof-only layer check over existing archive/candidate/synthesis/action-route data.`,
    owner: 'Foundation Intelligence',
  }
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `source-019-${stableRunId(SOURCE_019_PLAN_PATH)}`,
    result: {
      status: planReview.status,
      score: planReview.score,
      cardId: SOURCE_019_CARD_ID,
      closeoutKey: SOURCE_019_CLOSEOUT_KEY,
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P1','standard',true,$6::text[],$7::jsonb,$8::jsonb,'codex-source-019')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        planRun.runId,
        SOURCE_019_CARD_ID,
        SOURCE_019_PLAN_PATH,
        planReview.status,
        planReview.score,
        SOURCE_019_CHANGED_FILES,
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
    if (cardId === SOURCE_019_CARD_ID && closeCard) {
      return {
        ...existing,
        cardId,
        order: index + 1,
        stage: 'done_this_sprint',
        closeoutKey: SOURCE_019_CLOSEOUT_KEY,
        proofCommands: SOURCE_019_PROOF_COMMANDS,
        nextAction: `Continue ${SOURCE_019_NEXT_CARD_ID}.`,
        definitionOfDone: 'Shared communications proves Gmail, Missive, Slack, and meetings from archive through candidates, deterministic synthesis controls, and approval-gated action routing without private reruns or auto-writes.',
        notNextBoundaries: SOURCE_019_NOT_NEXT,
      }
    }
    if (cardId === SOURCE_019_NEXT_CARD_ID && closeCard) {
      return {
        ...existing,
        cardId,
        order: index + 1,
        stage: 'scoping',
        nextAction: existing.nextAction || 'Harden shared communications source adapters and rollout gaps.',
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
    scriptPath: SOURCE_019_SCRIPT_PATH,
    operation: 'upsert SOURCE-019 card, Plan Critic row, and Current Sprint state',
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
        activeBlockerCardId: closeCard ? SOURCE_019_NEXT_CARD_ID : SOURCE_019_CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: closeCard ? 'source_019_closed_next_source_020' : 'source_019_active',
          lastClosedCardId: closeCard ? SOURCE_019_CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `SOURCE-019 closed under ${SOURCE_019_CLOSEOUT_KEY}. Continue ${SOURCE_019_NEXT_CARD_ID}.`
            : 'Finish SOURCE-019 shared communications proof without private reruns or auto-writes.',
        },
      },
      items: mergeSprintItems(previous, { closeCard }),
    },
    'codex-source-019',
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
    layerInputs,
    synthesisSnapshot,
  ] = await Promise.all([
    readRepoFile(SOURCE_019_PLAN_PATH),
    validatePlanApprovalFile({ repoRoot, approvalRef: SOURCE_019_APPROVAL_PATH, cardId: SOURCE_019_CARD_ID }),
    getActiveFoundationCurrentSprint(),
    readRepoJson('package.json'),
    readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
    readRepoFile(SOURCE_019_CLOSEOUT_PATH, { optional: true }),
    readRepoFile('docs/source-notes/shared-communications.md'),
    querySharedCommsLayerInputs(),
    getSharedCommunicationSynthesisSnapshot({ limit: 3, itemLimit: 20 }),
  ])

  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow(),
    changedFiles: SOURCE_019_CHANGED_FILES,
    declaredRisk: 'Shared communications control-plane proof over existing archive/candidate/synthesis/action-route data with no private reruns or downstream writes',
    repoRoot,
  })
  const layerSnapshot = buildSource019SharedCommsLayerSnapshot({
    ...layerInputs,
    synthesisSnapshot,
  })
  const dogfood = buildSource019DogfoodProof()

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
  const card = cards.find(item => item.id === SOURCE_019_CARD_ID) || null
  const nextCard = cards.find(item => item.id === SOURCE_019_NEXT_CARD_ID) || null
  const source019Item = (activeSprint.items || []).find(item => item.cardId === SOURCE_019_CARD_ID) || null
  const nextItem = (activeSprint.items || []).find(item => item.cardId === SOURCE_019_NEXT_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === SOURCE_019_CLOSEOUT_KEY) || null

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || SOURCE_019_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for SOURCE-019', buildPlanCriticResultSummary(planReview))
  addCheck(checks, planCriticRuns.some(run => run.cardId === SOURCE_019_CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, card && (args.closeCard ? card.lane === 'done' : ['research', 'scoped', 'executing', 'done'].includes(card.lane)), 'live SOURCE-019 card exists with expected lane', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, nextCard && ['research', 'scoped', 'executing', 'done'].includes(nextCard.lane), 'next SOURCE-020 card remains live', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, sourceNote.includes('The Missing Synthesis Layer') && sourceNote.includes('cross-artifact linking'), 'source note documents missing synthesis functions', 'docs/source-notes/shared-communications.md')
  addCheck(checks, layerSnapshot.status === 'ready', 'shared communications layer snapshot is ready', layerSnapshot.failures.join('; ') || 'ready')
  addCheck(checks, layerSnapshot.sourceCoverage.missingSources.length === 0 && layerSnapshot.sourceCoverage.artifactTotal > 1000, 'archive covers Gmail, Missive, Slack, and meetings', JSON.stringify({ sources: layerSnapshot.sourceCoverage.coveredSources, artifacts: layerSnapshot.sourceCoverage.artifactTotal }))
  addCheck(checks, layerSnapshot.candidateCoverage.pendingTotal > 100 && layerSnapshot.candidateCoverage.missingRequiredTypes.length === 0, 'candidate layer covers task, decision, and blocker signals', JSON.stringify({ pending: layerSnapshot.candidateCoverage.pendingTotal, types: layerSnapshot.candidateCoverage.candidateTypes }))
  addCheck(checks, layerSnapshot.candidateCoverage.rankedControlItems.length >= 5, 'deterministic control items provide linking/dedup/staleness/actionability', `items=${layerSnapshot.candidateCoverage.rankedControlItems.length}`)
  addCheck(checks, layerSnapshot.synthesisControls.latestRunExists && layerSnapshot.synthesisControls.latestItemsCount >= 5, 'synthesis packet exists and exposes scored controls', JSON.stringify({ items: layerSnapshot.synthesisControls.latestItemsCount, freshness: layerSnapshot.synthesisControls.latestRunFreshness }))
  addCheck(checks, layerSnapshot.routeCoverage.approvalGated && layerSnapshot.routeCoverage.routeTotal >= 5, 'action routes are approval-gated proposals', JSON.stringify({ routes: layerSnapshot.routeCoverage.routeTotal, destinations: layerSnapshot.routeCoverage.destinations }))
  addCheck(checks, layerSnapshot.privacyBoundary.proposalOnly === true && layerSnapshot.privacyBoundary.rawContentInOutput === false && layerSnapshot.privacyBoundary.externalWrites === false, 'proof output is proposal-only and private-safe', JSON.stringify(layerSnapshot.privacyBoundary))
  addCheck(checks, dogfood.ok === true, 'dogfood rejects missing source, missing dedupe, raw-content leak, and auto-write route', JSON.stringify(dogfood.rejectedCases))
  addCheck(checks, packageJson.scripts?.['process:source-019-check'] === `node --env-file-if-exists=.env ${SOURCE_019_SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:source-019-check'] || 'missing')
  addCheck(checks, closeoutRegistrySource.includes(SOURCE_019_CLOSEOUT_KEY) && closeoutRegistrySource.includes(SOURCE_019_CARD_ID), 'closeout registry source includes SOURCE-019 record', 'lib/foundation-build-closeout-intelligence-records.js')
  addCheck(checks, closeout?.status === 'accepted' && closeout.operatorCloseout === true && (closeout.backlogIds || []).includes(SOURCE_019_CARD_ID), 'build closeout lookup resolves SOURCE-019 record', closeout?.key || 'missing')
  addCheck(checks, await repoFileExists(SOURCE_019_CLOSEOUT_PATH), 'closeout handoff exists', SOURCE_019_CLOSEOUT_PATH)
  addCheck(checks, closeoutDoc.includes(SOURCE_019_NEXT_CARD_ID) && closeoutDoc.includes('No live private source reruns'), 'closeout states next card and source boundaries', SOURCE_019_CLOSEOUT_PATH)
  if (args.closeCard) {
    addCheck(checks, activeSprint.sprint?.activeBlockerCardId === SOURCE_019_NEXT_CARD_ID, 'Current Sprint advances to next safe card', activeSprint.sprint?.activeBlockerCardId || 'missing')
    addCheck(checks, source019Item?.stage === 'done_this_sprint', 'Current Sprint marks SOURCE-019 done this sprint', source019Item ? `${source019Item.cardId}:${source019Item.stage}` : 'missing')
    addCheck(checks, nextItem?.stage === 'scoping', 'next SOURCE-020 card remains visible for safe continuation', nextItem ? `${nextItem.cardId}:${nextItem.stage}` : 'missing')
  }
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint remains healthy after SOURCE-019 closeout', currentSprintStatus.findings?.map(item => `${item.check}:${item.detail}`).join('; ') || 'healthy')

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    cardId: SOURCE_019_CARD_ID,
    closeoutKey: SOURCE_019_CLOSEOUT_KEY,
    nextCardId: SOURCE_019_NEXT_CARD_ID,
    layer: layerSnapshot,
    dogfood,
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }
  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`SOURCE-019 shared communications layer check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('SOURCE-019 shared communications layer check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
