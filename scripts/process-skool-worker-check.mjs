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
import { listSourceCrawlItems } from '../lib/foundation-source-crawl-db.js'
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
  SKOOL_WORKER_APPROVAL_PATH,
  SKOOL_WORKER_CARD_ID,
  SKOOL_WORKER_CHANGED_FILES,
  SKOOL_WORKER_CLOSEOUT_KEY,
  SKOOL_WORKER_CLOSEOUT_PATH,
  SKOOL_WORKER_NEXT_CARD_ID,
  SKOOL_WORKER_PLAN_PATH,
  SKOOL_WORKER_PROOF_COMMANDS,
  SKOOL_WORKER_SCRIPT_PATH,
  VIDEO_INVENTORY_TARGET_KEY,
  buildSkoolWorkerDogfoodProof,
  buildSkoolWorkerPreflightStatus,
} from '../lib/skool-worker-proof.js'
import {
  WEB_GODMODE_CARD_ID,
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
    SKOOL_WORKER_CARD_ID,
    SKOOL_WORKER_NEXT_CARD_ID,
    WEB_GODMODE_CARD_ID,
    'MARK-M-SKOOL-EXTRACTION-PREFLIGHT-001',
    ...WEB_GODMODE_SPRINT_CARD_ORDER,
  ]))
}

function buildCardRow({ closeCard = false, preflight } = {}) {
  return {
    id: SKOOL_WORKER_CARD_ID,
    title: 'Build the Skool source contract and crawler worker',
    scope: 'foundation',
    lane: closeCard ? 'scoped' : 'executing',
    priority: 'P0',
    rank: 46,
    source: 'Skool source note, Mark M Skool preflight, and Steve 2026-05-19 GOD-mode extraction sprint.',
    summary: 'Build the reusable Skool worker access matrix and blocked runtime packet from source-contract truth, source-auth boundaries, the blocked connector row, and local Skool URL inventory without opening Skool.',
    whyItMatters: 'Skool may contain high-value training/community intelligence, but blind crawling private communities would create policy, copyright, privacy, and product risk.',
    nextAction: closeCard
      ? `Blocked-preflight parked. Live Skool worker execution requires a source-specific approval packet. Continue ${SKOOL_WORKER_NEXT_CARD_ID} now.`
      : 'Build Skool worker access matrix and parked approval packet. Do not open Skool or use private auth.',
    statusNote: closeCard
      ? `Blocked-preflight under \`${SKOOL_WORKER_CLOSEOUT_KEY}\`; not marked done. Local proof classified ${preflight?.matrixStatus?.skoolLinkCount || 0} Skool URL inventory rows as link-inventory-only and kept live Skool access approval-bound.`
      : `Executing \`${SKOOL_WORKER_CLOSEOUT_KEY}\`; metadata/source-auth preflight only, no Skool private access.`,
    owner: 'Foundation Extraction',
  }
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `skool-worker-preflight-${stableRunId(SKOOL_WORKER_PLAN_PATH)}`,
    result: {
      status: planReview.status,
      score: planReview.score,
      cardId: SKOOL_WORKER_CARD_ID,
      closeoutKey: SKOOL_WORKER_CLOSEOUT_KEY,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, planReview, preflight } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const row = buildCardRow({ closeCard, preflight })
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','standard',true,$6::text[],$7::jsonb,$8::jsonb,'codex-skool-worker-preflight')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        planRun.runId,
        SKOOL_WORKER_CARD_ID,
        SKOOL_WORKER_PLAN_PATH,
        planReview.status,
        planReview.score,
        SKOOL_WORKER_CHANGED_FILES,
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
    if (cardId === SKOOL_WORKER_CARD_ID && closeCard) {
      return {
        ...existing,
        cardId,
        order: index + 1,
        stage: 'returned',
        returnedReason: 'Live Skool worker execution is approval-bound. Preflight proof and access matrix are parked under skool-worker-preflight-v1; continue safe sprint work.',
        closeoutKey: SKOOL_WORKER_CLOSEOUT_KEY,
        proofCommands: SKOOL_WORKER_PROOF_COMMANDS,
        nextAction: `Await Steve approval for exact Skool source packet; continue ${SKOOL_WORKER_NEXT_CARD_ID} now.`,
        definitionOfDone: existing.definitionOfDone || 'Skool live worker execution is parked unless Steve approves exact source/use/storage/provider boundaries.',
        notNextBoundaries: existing.notNextBoundaries || [
          'No Skool login, private auth, authorized browser session, community crawl, course navigation, post/comment/member extraction, embedded video extraction, transcript fetch, screenshot/keyframe storage, model calls, external send, or public exposure.',
          'No credential/key mutation, Drive permission mutation, downstream atom/KB/action-route/vector writes, or hidden extraction worker launch.',
        ],
      }
    }
    if (cardId === SKOOL_WORKER_NEXT_CARD_ID && closeCard) {
      return {
        ...existing,
        cardId,
        order: index + 1,
        stage: 'scoping',
        nextAction: existing.nextAction || 'Continue safe Mycro/myICOR training preflight work; park live paid/provider operations if approval-bound.',
      }
    }
    return {
      ...existing,
      cardId,
      order: index + 1,
    }
  })
}

async function ensureLiveState({ closeCard = false, planReview, preflight } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SKOOL_WORKER_SCRIPT_PATH,
    operation: 'upsert Skool worker preflight card, Plan Critic row, and Current Sprint parked state',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await upsertLiveCardAndPlanCritic({ closeCard, planReview, preflight })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: WEB_GODMODE_SPRINT_ID,
        status: 'active',
        activeBlockerCardId: closeCard ? SKOOL_WORKER_NEXT_CARD_ID : SKOOL_WORKER_CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: closeCard ? 'skool_worker_preflight_parked_next_myicro' : 'skool_worker_preflight_active',
          lastClosedCardId: closeCard ? SKOOL_WORKER_CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `SKOOL-WORKER-001 live source access is parked approval-bound. Continue ${SKOOL_WORKER_NEXT_CARD_ID}.`
            : 'Finish Skool worker preflight or park approval-bound live operation.',
        },
      },
      items: mergeSprintItems(previous, { closeCard }),
    },
    'codex-skool-worker-preflight',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || WEB_GODMODE_SPRINT_ID,
      reason: 'Steve operating rule: blockers block unsafe actions, not the whole sprint.',
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
    sourceNote,
    courseBoundarySource,
    closeoutRegistrySource,
    closeoutDoc,
  ] = await Promise.all([
    readRepoFile(SKOOL_WORKER_PLAN_PATH),
    validatePlanApprovalFile({ repoRoot, approvalRef: SKOOL_WORKER_APPROVAL_PATH, cardId: SKOOL_WORKER_CARD_ID }),
    getBacklogItemsByIds(cardIds()),
    readRepoJson('package.json'),
    readRepoFile('docs/source-notes/skool-corpus.md'),
    readRepoFile('lib/course-source-auth-boundary.js'),
    readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
    readRepoFile(SKOOL_WORKER_CLOSEOUT_PATH, { optional: true }),
  ])
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow(),
    changedFiles: SKOOL_WORKER_CHANGED_FILES,
    declaredRisk: 'private Skool community/course approval boundary and blocked-preflight sprint progression',
    repoRoot,
  })
  const videoItems = await listSourceCrawlItems({ targetKey: VIDEO_INVENTORY_TARGET_KEY, status: 'succeeded', limit: 200, order: 'desc' })
  const preflight = buildSkoolWorkerPreflightStatus({ skoolVideoItems: videoItems })
  const dogfood = buildSkoolWorkerDogfoodProof()
  if (args.closeCard) await ensureLiveState({ closeCard: true, planReview, preflight })
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
  const card = (await getBacklogItemsByIds([SKOOL_WORKER_CARD_ID])).find(item => item.id === SKOOL_WORKER_CARD_ID) || cards.find(item => item.id === SKOOL_WORKER_CARD_ID) || null
  const webCard = cards.find(item => item.id === WEB_GODMODE_CARD_ID) || null
  const priorSkoolCard = cards.find(item => item.id === 'MARK-M-SKOOL-EXTRACTION-PREFLIGHT-001') || null
  const nextCard = cards.find(item => item.id === SKOOL_WORKER_NEXT_CARD_ID) || null
  const skoolItem = (activeSprint.items || []).find(item => item.cardId === SKOOL_WORKER_CARD_ID) || null
  const nextItem = (activeSprint.items || []).find(item => item.cardId === SKOOL_WORKER_NEXT_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === SKOOL_WORKER_CLOSEOUT_KEY) || null

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || SKOOL_WORKER_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for Skool worker preflight', buildPlanCriticResultSummary(planReview))
  addCheck(checks, planCriticRuns.some(run => run.cardId === SKOOL_WORKER_CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, webCard?.lane === 'done', 'WEB-GODMODE prerequisite is done', webCard ? `${webCard.id}:${webCard.lane}` : 'missing')
  addCheck(checks, priorSkoolCard?.lane === 'done', 'prior Mark M Skool source/auth preflight is done', priorSkoolCard ? `${priorSkoolCard.id}:${priorSkoolCard.lane}` : 'missing')
  addCheck(checks, card && (args.closeCard ? card.lane === 'scoped' : ['research', 'scoped', 'executing'].includes(card.lane)), 'live Skool worker card exists and stays not-done for blocked preflight', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, nextCard && ['research', 'scoped', 'executing', 'done'].includes(nextCard.lane), 'next Mycro card remains live', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, preflight.ok && preflight.status === 'blocked_pending_source_specific_approval', 'Skool worker preflight parks live execution behind approval', preflight.status)
  addCheck(checks, preflight.matrixStatus.skoolLinkCount >= 10, 'local video manifest has Skool link inventory rows', String(preflight.matrixStatus.skoolLinkCount))
  addCheck(checks, preflight.matrixStatus.matrix.length >= 5, 'Skool access matrix covers source surfaces', preflight.matrixStatus.matrix.map(row => `${row.surface}:${row.route}`).join(' | '))
  addCheck(checks, preflight.approvalPacket.canRunNow === false && preflight.approvalPacket.status === 'approval_required', 'run packet refuses live Skool worker run without approval', preflight.approvalPacket.status)
  addCheck(checks, preflight.blockedObservationSummary.ok === false && preflight.blockedObservationSummary.failureCodes.includes('browser_session_preflight_required'), 'WEB-GODMODE blocks private Skool observation without preflight', preflight.blockedObservationSummary.failureCodes.join(', '))
  addCheck(checks, preflight.approvedObservationSummary.ok === true && preflight.approvedObservationSummary.liveBrowserLaunched === false && preflight.approvedObservationSummary.networkFetched === false, 'synthetic approved Skool observation stays no-network', JSON.stringify(preflight.approvedObservationSummary))
  addCheck(checks, preflight.multimodal.ok === true, 'Skool multimodal envelope validates in synthetic approval mode', preflight.multimodal.findings.join(', ') || 'healthy')
  addCheck(checks, dogfood.ok === true, 'dogfood proves source/auth blocking and side-effect rejection', JSON.stringify(dogfood.rejectedCases))
  addCheck(checks, Object.values(preflight.sideEffects).every(value => value === false || value === 0), 'preflight starts no live side effects', JSON.stringify(preflight.sideEffects))
  addCheck(checks, sourceNote.includes('manual_export_only') && sourceNote.includes('Do not crawl Skool blindly'), 'Skool source note preserves access matrix boundary', 'docs/source-notes/skool-corpus.md')
  addCheck(checks, courseBoundarySource.includes('SRC-SKOOL-001') && courseBoundarySource.includes('private_community'), 'course source auth boundary classifies Skool private/community', 'lib/course-source-auth-boundary.js')
  addCheck(checks, packageJson.scripts?.['process:skool-worker-check'] === `node --env-file-if-exists=.env ${SKOOL_WORKER_SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:skool-worker-check'] || 'missing')
  addCheck(checks, closeoutRegistrySource.includes(SKOOL_WORKER_CLOSEOUT_KEY) && closeoutRegistrySource.includes('blocked-preflight') && closeoutRegistrySource.includes(SKOOL_WORKER_CARD_ID), 'closeout registry source includes blocked-preflight record', 'lib/foundation-build-closeout-intelligence-records.js')
  addCheck(checks, closeout?.status === 'blocked-preflight' && closeout.operatorCloseout === true && (closeout.backlogIds || []).includes(SKOOL_WORKER_CARD_ID), 'build closeout lookup resolves blocked-preflight record', closeout?.key || 'missing')
  addCheck(checks, await repoFileExists(SKOOL_WORKER_CLOSEOUT_PATH), 'closeout handoff exists', SKOOL_WORKER_CLOSEOUT_PATH)
  addCheck(checks, closeoutDoc.includes('not marked done') && closeoutDoc.includes(SKOOL_WORKER_NEXT_CARD_ID), 'closeout states not marked done and next card', SKOOL_WORKER_CLOSEOUT_PATH)
  if (args.closeCard) {
    addCheck(checks, activeSprint.sprint?.activeBlockerCardId === SKOOL_WORKER_NEXT_CARD_ID, 'Current Sprint advances to next safe card', activeSprint.sprint?.activeBlockerCardId || 'missing')
    addCheck(checks, skoolItem?.stage === 'returned' && Boolean(skoolItem.returnedReason), 'Current Sprint parks Skool worker as returned with reason', skoolItem ? `${skoolItem.stage}:${skoolItem.returnedReason || 'missing reason'}` : 'missing')
    addCheck(checks, nextItem?.stage === 'scoping', 'next card remains visible for safe continuation', nextItem ? `${nextItem.cardId}:${nextItem.stage}` : 'missing')
  }
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint remains healthy after parking Skool preflight', currentSprintStatus.findings?.map(item => `${item.check}:${item.detail}`).join('; ') || 'healthy')

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    cardId: SKOOL_WORKER_CARD_ID,
    closeoutKey: SKOOL_WORKER_CLOSEOUT_KEY,
    nextCardId: SKOOL_WORKER_NEXT_CARD_ID,
    preflight,
    dogfood,
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }
  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`Skool worker preflight check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Skool worker preflight check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
