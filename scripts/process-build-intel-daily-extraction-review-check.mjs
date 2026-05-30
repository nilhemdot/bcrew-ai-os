#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CLOSEOUT_KEY,
  buildBuildIntelExtractionImplementationSnapshot,
} from '../lib/build-intel-extraction-implementation.js'
import {
  BUILD_INTEL_DAILY_EXTRACTION_REVIEW_APPROVAL_PATH,
  BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CARD_ID,
  BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CHANGED_FILES,
  BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CLOSEOUT_KEY,
  BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CLOSEOUT_PATH,
  BUILD_INTEL_DAILY_EXTRACTION_REVIEW_NEXT_CARD_ID,
  BUILD_INTEL_DAILY_EXTRACTION_REVIEW_PLAN_PATH,
  BUILD_INTEL_DAILY_EXTRACTION_REVIEW_PROOF_COMMANDS,
  BUILD_INTEL_DAILY_EXTRACTION_REVIEW_SCRIPT_PATH,
  buildBuildIntelDailyExtractionReviewDogfoodProof,
  buildBuildIntelDailyExtractionReviewSnapshot,
} from '../lib/build-intel-daily-extraction-review.js'
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
  searchSharedCommunicationArtifactsForContext,
} from '../lib/foundation-shared-comms-db.js'
import {
  getFoundationSnapshot,
} from '../lib/foundation-strategy-docs-db.js'
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
    BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CARD_ID,
    BUILD_INTEL_DAILY_EXTRACTION_REVIEW_NEXT_CARD_ID,
    'DRIVE-WORKER-001',
    'RESEARCH-INBOX-001',
    ...WEB_GODMODE_SPRINT_CARD_ORDER,
  ]))
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CARD_ID,
    title: 'Create Build Intel extraction review queue for daily learning atoms',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P1',
    rank: 50,
    source: 'May 19 GOD-mode extraction sprint, Build Intel extraction implementation, Research Inbox contract, and old-system scout harvest.',
    summary: 'Create a proposal-only daily review queue that receives bounded Build Intel extraction outputs and makes each item reviewable with source anchors, evidence levels, applicability, related cards, recommendation, promote/archive decisions, and approval boundaries.',
    whyItMatters: 'Build Intel should become learning the system can act on, not transcript piles or old-system report sprawl. Steve needs a review queue that turns extracted lessons into governed promote/archive decisions without unsafe automatic writes.',
    nextAction: closeCard
      ? `Done under \`${BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CLOSEOUT_KEY}\`; continue \`${BUILD_INTEL_DAILY_EXTRACTION_REVIEW_NEXT_CARD_ID}\`.`
      : 'Build the proposal-only Build Intel daily extraction review queue from existing governed extraction outputs. Do not crawl new sources or mutate backlog/atoms from content.',
    statusNote: closeCard
      ? `Closed under \`${BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CLOSEOUT_KEY}\`; Build Intel outputs now route into a bounded review queue with promote/archive decisions and no downstream auto-writes.`
      : `Executing \`${BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CLOSEOUT_KEY}\`; proposal-only review routing, no new crawl/provider/private extraction.`,
    owner: 'Foundation Intelligence',
  }
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `build-intel-daily-review-${stableRunId(BUILD_INTEL_DAILY_EXTRACTION_REVIEW_PLAN_PATH)}`,
    result: {
      status: planReview.status,
      score: planReview.score,
      cardId: BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CARD_ID,
      closeoutKey: BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CLOSEOUT_KEY,
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
      [row.id, row.title, row.scope, row.lane, row.priority, row.rank, row.source, row.summary, row.whyItMatters, row.nextAction, row.statusNote, row.owner],
    )
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P1','standard',true,$6::text[],$7::jsonb,$8::jsonb,'codex-build-intel-daily-review')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        planRun.runId,
        BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CARD_ID,
        BUILD_INTEL_DAILY_EXTRACTION_REVIEW_PLAN_PATH,
        planReview.status,
        planReview.score,
        BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CHANGED_FILES,
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
    if (cardId === BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CARD_ID && closeCard) {
      return {
        ...existing,
        cardId,
        order: index + 1,
        stage: 'done_this_sprint',
        closeoutKey: BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CLOSEOUT_KEY,
        proofCommands: BUILD_INTEL_DAILY_EXTRACTION_REVIEW_PROOF_COMMANDS,
        nextAction: `Continue ${BUILD_INTEL_DAILY_EXTRACTION_REVIEW_NEXT_CARD_ID}.`,
        definitionOfDone: existing.definitionOfDone || 'Build Intel extraction outputs have a proposal-only daily review queue with source anchors, evidence levels, applicability, related cards, recommendations, decisions, and approval boundaries.',
        notNextBoundaries: existing.notNextBoundaries || [
          'No automatic backlog, atom, KB, vector, action-route, or external writes from Build Intel items.',
          'No new crawl, private/auth/paid source access, screenshots, OCR, keyframes, transcription, provider/model calls, or browser login in this card.',
        ],
      }
    }
    if (cardId === BUILD_INTEL_DAILY_EXTRACTION_REVIEW_NEXT_CARD_ID && closeCard) {
      return {
        ...existing,
        cardId,
        order: index + 1,
        stage: 'scoping',
        nextAction: existing.nextAction || 'Continue shared communications ingestion/synthesis source layer work.',
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
    scriptPath: BUILD_INTEL_DAILY_EXTRACTION_REVIEW_SCRIPT_PATH,
    operation: 'upsert Build Intel daily review card, Plan Critic row, and Current Sprint state',
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
        activeBlockerCardId: closeCard ? BUILD_INTEL_DAILY_EXTRACTION_REVIEW_NEXT_CARD_ID : BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: closeCard ? 'build_intel_daily_review_closed_next_source_019' : 'build_intel_daily_review_active',
          lastClosedCardId: closeCard ? BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001 closed under ${BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CLOSEOUT_KEY}. Continue ${BUILD_INTEL_DAILY_EXTRACTION_REVIEW_NEXT_CARD_ID}.`
            : 'Finish Build Intel daily review queue without downstream auto-writes or new private/provider extraction.',
        },
      },
      items: mergeSprintItems(previous, { closeCard }),
    },
    'codex-build-intel-daily-review',
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
    foundationSnapshot,
    activeSprintBeforeWrite,
    packageJson,
    closeoutRegistrySource,
    closeoutDoc,
    transcriptContexts,
  ] = await Promise.all([
    readRepoFile(BUILD_INTEL_DAILY_EXTRACTION_REVIEW_PLAN_PATH),
    validatePlanApprovalFile({ repoRoot, approvalRef: BUILD_INTEL_DAILY_EXTRACTION_REVIEW_APPROVAL_PATH, cardId: BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CARD_ID }),
    getFoundationSnapshot(),
    getActiveFoundationCurrentSprint(),
    readRepoJson('package.json'),
    readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
    readRepoFile(BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CLOSEOUT_PATH, { optional: true }),
    searchSharedCommunicationArtifactsForContext({
      query: 'AI team setup folder structure agents workflows prompts dashboard build implementation',
      sourceIds: ['SRC-YOUTUBE-INTEL-001'],
      artifactTypes: ['video_transcript'],
      limit: 10,
      excerptChars: 1800,
    }),
  ])
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow(),
    changedFiles: BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CHANGED_FILES,
    declaredRisk: 'Build Intel daily review queue with proposal-only routing, private-source boundaries, and no downstream writes',
    repoRoot,
  })
  const extractionSnapshot = buildBuildIntelExtractionImplementationSnapshot({
    transcriptContexts,
    backlogItems: foundationSnapshot.backlogItems || [],
    currentSprint: activeSprintBeforeWrite,
  })
  const reviewSnapshot = buildBuildIntelDailyExtractionReviewSnapshot({
    extractionSnapshot,
  })
  const dogfood = buildBuildIntelDailyExtractionReviewDogfoodProof()
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
  const card = (await getBacklogItemsByIds([BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CARD_ID])).find(item => item.id === BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CARD_ID) || cards.find(item => item.id === BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CARD_ID) || null
  const driveCard = cards.find(item => item.id === 'DRIVE-WORKER-001') || null
  const nextCard = cards.find(item => item.id === BUILD_INTEL_DAILY_EXTRACTION_REVIEW_NEXT_CARD_ID) || null
  const buildIntelItem = (activeSprint.items || []).find(item => item.cardId === BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CARD_ID) || null
  const nextItem = (activeSprint.items || []).find(item => item.cardId === BUILD_INTEL_DAILY_EXTRACTION_REVIEW_NEXT_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CLOSEOUT_KEY) || null

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || BUILD_INTEL_DAILY_EXTRACTION_REVIEW_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for Build Intel daily review queue', buildPlanCriticResultSummary(planReview))
  addCheck(checks, planCriticRuns.some(run => run.cardId === BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, driveCard?.lane === 'done', 'DRIVE-WORKER prerequisite is done', driveCard ? `${driveCard.id}:${driveCard.lane}` : 'missing')
  addCheck(checks, card && (args.closeCard ? card.lane === 'done' : ['research', 'scoped', 'executing'].includes(card.lane)), 'live Build Intel daily review card exists with expected lane', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, nextCard && ['research', 'scoped', 'executing', 'done'].includes(nextCard.lane), 'next SOURCE-019 card remains live', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, extractionSnapshot.status === 'ready' && extractionSnapshot.selectedTranscriptArtifacts >= 1, 'upstream Build Intel extraction snapshot is ready', `${extractionSnapshot.status} selected=${extractionSnapshot.selectedTranscriptArtifacts}`)
  addCheck(checks, reviewSnapshot.status === 'ready', 'daily review snapshot is ready', reviewSnapshot.failedValidations.map(row => `${row.reviewItemId}:${row.validation.findings.join(',')}`).join('; ') || 'ready')
  addCheck(checks, reviewSnapshot.summary.reviewItemCount >= 3 && reviewSnapshot.summary.publicReadyCount >= 1, 'review queue has public ready items', JSON.stringify(reviewSnapshot.summary))
  addCheck(checks, reviewSnapshot.summary.blockedApprovalCount >= 1, 'approval-bound Build Intel sources are parked, not hidden', `blocked=${reviewSnapshot.summary.blockedApprovalCount}`)
  addCheck(checks, reviewSnapshot.reviewItems.every(item => item.proposalOnly === true && item.writesBacklog === false && item.writesAtoms === false && item.externalWrites === false), 'review queue has no downstream auto-writes', 'proposalOnly/no writes')
  addCheck(
    checks,
    reviewSnapshot.reviewItems.every(item => Array.isArray(item.allowedDecisions) && item.allowedDecisions.includes('archive_no_action')) &&
      reviewSnapshot.reviewItems
        .filter(item => item.decisionState !== 'blocked_approval')
        .every(item => item.allowedDecisions.some(decision => decision.includes('promote') || decision.includes('enrich'))) &&
      reviewSnapshot.reviewItems
        .filter(item => item.decisionState === 'blocked_approval')
        .every(item => item.allowedDecisions.includes('block_pending_approval')),
    'review items expose correct decision actions',
    'public=promote/archive blocked=block/archive/request-more-evidence',
  )
  addCheck(checks, dogfood.ok === true, 'dogfood rejects missing source, private promotion, raw content leak, and auto-write', JSON.stringify(dogfood.rejectedCases))
  addCheck(checks, packageJson.scripts?.['process:build-intel-daily-extraction-review-check'] === `node --env-file-if-exists=.env ${BUILD_INTEL_DAILY_EXTRACTION_REVIEW_SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:build-intel-daily-extraction-review-check'] || 'missing')
  addCheck(checks, closeoutRegistrySource.includes(BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CLOSEOUT_KEY) && closeoutRegistrySource.includes(BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CARD_ID), 'closeout registry source includes Build Intel review record', 'lib/foundation-build-closeout-intelligence-records.js')
  addCheck(checks, closeout?.status === 'accepted' && closeout.operatorCloseout === true && (closeout.backlogIds || []).includes(BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CARD_ID), 'build closeout lookup resolves Build Intel review record', closeout?.key || 'missing')
  addCheck(checks, await repoFileExists(BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CLOSEOUT_PATH), 'closeout handoff exists', BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CLOSEOUT_PATH)
  addCheck(checks, closeoutDoc.includes(BUILD_INTEL_DAILY_EXTRACTION_REVIEW_NEXT_CARD_ID) && closeoutDoc.includes('No automatic backlog mutation'), 'closeout states next card and no-auto-write boundary', BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CLOSEOUT_PATH)
  if (args.closeCard) {
    addCheck(checks, activeSprint.sprint?.activeBlockerCardId === BUILD_INTEL_DAILY_EXTRACTION_REVIEW_NEXT_CARD_ID, 'Current Sprint advances to next safe card', activeSprint.sprint?.activeBlockerCardId || 'missing')
    addCheck(checks, buildIntelItem?.stage === 'done_this_sprint', 'Current Sprint marks Build Intel review done this sprint', buildIntelItem ? `${buildIntelItem.cardId}:${buildIntelItem.stage}` : 'missing')
    addCheck(checks, nextItem?.stage === 'scoping', 'next SOURCE-019 card remains visible for safe continuation', nextItem ? `${nextItem.cardId}:${nextItem.stage}` : 'missing')
  }
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint remains healthy after Build Intel review closeout', currentSprintStatus.findings?.map(item => `${item.check}:${item.detail}`).join('; ') || 'healthy')

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    cardId: BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CARD_ID,
    closeoutKey: BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CLOSEOUT_KEY,
    nextCardId: BUILD_INTEL_DAILY_EXTRACTION_REVIEW_NEXT_CARD_ID,
    review: reviewSnapshot,
    dogfood,
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }
  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`Build Intel daily extraction review check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Build Intel daily extraction review check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
