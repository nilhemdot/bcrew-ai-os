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
  MYICOR_EXTRACTION_PREFLIGHT_CARD_ID,
} from '../lib/myicor-extraction-preflight.js'
import {
  MYICRO_TRAINING_APPROVAL_PATH,
  MYICRO_TRAINING_CARD_ID,
  MYICRO_TRAINING_CHANGED_FILES,
  MYICRO_TRAINING_CLOSEOUT_KEY,
  MYICRO_TRAINING_CLOSEOUT_PATH,
  MYICRO_TRAINING_NEXT_CARD_ID,
  MYICRO_TRAINING_PLAN_PATH,
  MYICRO_TRAINING_PROOF_COMMANDS,
  MYICRO_TRAINING_SCRIPT_PATH,
  buildMyicroTrainingDogfoodProof,
  buildMyicroTrainingPreflightStatus,
} from '../lib/myicro-training-proof.js'
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
    MYICRO_TRAINING_CARD_ID,
    MYICRO_TRAINING_NEXT_CARD_ID,
    WEB_GODMODE_CARD_ID,
    MYICOR_EXTRACTION_PREFLIGHT_CARD_ID,
    ...WEB_GODMODE_SPRINT_CARD_ORDER,
  ]))
}

function buildCardRow({ closeCard = false, preflight } = {}) {
  return {
    id: MYICRO_TRAINING_CARD_ID,
    title: 'Validate Mycro paid-training app extraction lane',
    scope: 'foundation',
    lane: closeCard ? 'scoped' : 'executing',
    priority: 'P0',
    rank: 48,
    source: 'Mycro/myICOR source note, MYICOR-EXTRACTION-PREFLIGHT-001, and Steve 2026-05-19 GOD-mode extraction sprint.',
    summary: 'Create the governed Mycro/myICOR training lane preflight for a future Steve-authorized one-lesson proof through WEB-GODMODE without opening the paid app or copying paid content.',
    whyItMatters: 'Mycro/myICOR may contain high-value AI-team, project-management, and process-automation doctrine, but paid training content needs a strict approval packet before browser/video/screenshot/transcript extraction.',
    nextAction: closeCard
      ? `Blocked-preflight parked. Live Mycro/myICOR training execution requires a source-specific one-lesson approval packet. Continue ${MYICRO_TRAINING_NEXT_CARD_ID} now.`
      : 'Build Mycro/myICOR one-lesson approval packet and synthetic WEB-GODMODE proof. Do not open the paid app or use private auth.',
    statusNote: closeCard
      ? `Blocked-preflight closeout proof under \`${MYICRO_TRAINING_CLOSEOUT_KEY}\`; not marked done. Source/auth truth remains approval-bound and no paid training content was accessed.`
      : `Executing \`${MYICRO_TRAINING_CLOSEOUT_KEY}\`; metadata/source-auth preflight only, no paid app access.`,
    owner: 'Foundation Extraction',
  }
}

function buildPlanCriticRun(planReview) {
  return {
    runId: `myicro-training-preflight-${stableRunId(MYICRO_TRAINING_PLAN_PATH)}`,
    result: {
      status: planReview.status,
      score: planReview.score,
      cardId: MYICRO_TRAINING_CARD_ID,
      closeoutKey: MYICRO_TRAINING_CLOSEOUT_KEY,
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','standard',true,$6::text[],$7::jsonb,$8::jsonb,'codex-myicro-training-preflight')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        planRun.runId,
        MYICRO_TRAINING_CARD_ID,
        MYICRO_TRAINING_PLAN_PATH,
        planReview.status,
        planReview.score,
        MYICRO_TRAINING_CHANGED_FILES,
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
    if (cardId === MYICRO_TRAINING_CARD_ID && closeCard) {
      return {
        ...existing,
        cardId,
        order: index + 1,
        stage: 'returned',
        returnedReason: 'Live Mycro/myICOR paid-training execution is approval-bound. Preflight proof and one-lesson approval packet are parked under myicro-training-preflight-v1; continue safe sprint work.',
        closeoutKey: MYICRO_TRAINING_CLOSEOUT_KEY,
        proofCommands: MYICRO_TRAINING_PROOF_COMMANDS,
        nextAction: `Await Steve approval for exact Mycro/myICOR one-lesson packet; continue ${MYICRO_TRAINING_NEXT_CARD_ID} now.`,
        definitionOfDone: existing.definitionOfDone || 'Mycro/myICOR live paid-training execution is parked unless Steve approves exact source/use/storage/provider boundaries.',
        notNextBoundaries: existing.notNextBoundaries || [
          'No Mycro/myICOR login, private auth, paid auth, authorized browser session, course inventory, lesson navigation, resource extraction, transcript/media fetch, screenshot/keyframe storage, model calls, external send, or public exposure.',
          'No credential/key mutation, Drive permission mutation, downstream atom/KB/action-route/vector writes, or hidden extraction worker launch.',
        ],
      }
    }
    if (cardId === MYICRO_TRAINING_NEXT_CARD_ID && closeCard) {
      return {
        ...existing,
        cardId,
        order: index + 1,
        stage: 'scoping',
        nextAction: existing.nextAction || 'Continue safe Drive worker inventory/extraction work; park private/permission/media operations if approval-bound.',
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
    scriptPath: MYICRO_TRAINING_SCRIPT_PATH,
    operation: 'upsert Mycro/myICOR training preflight card, Plan Critic row, and Current Sprint parked state',
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
        activeBlockerCardId: closeCard ? MYICRO_TRAINING_NEXT_CARD_ID : MYICRO_TRAINING_CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: closeCard ? 'myicro_training_preflight_parked_next_drive_worker' : 'myicro_training_preflight_active',
          lastClosedCardId: closeCard ? MYICRO_TRAINING_CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `MYICRO-TRAINING-001 live paid source access is parked approval-bound. Continue ${MYICRO_TRAINING_NEXT_CARD_ID}.`
            : 'Finish Mycro/myICOR training preflight or park approval-bound live operation.',
        },
      },
      items: mergeSprintItems(previous, { closeCard }),
    },
    'codex-myicro-training-preflight',
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
    closeoutRegistrySource,
    closeoutDoc,
  ] = await Promise.all([
    readRepoFile(MYICRO_TRAINING_PLAN_PATH),
    validatePlanApprovalFile({ repoRoot, approvalRef: MYICRO_TRAINING_APPROVAL_PATH, cardId: MYICRO_TRAINING_CARD_ID }),
    getBacklogItemsByIds(cardIds()),
    readRepoJson('package.json'),
    readRepoFile('docs/source-notes/myicro-training.md'),
    readRepoFile('lib/foundation-build-closeout-intelligence-records.js'),
    readRepoFile(MYICRO_TRAINING_CLOSEOUT_PATH, { optional: true }),
  ])
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow(),
    changedFiles: MYICRO_TRAINING_CHANGED_FILES,
    declaredRisk: 'paid Mycro/myICOR training approval boundary and blocked-preflight sprint progression',
    repoRoot,
  })
  const preflight = buildMyicroTrainingPreflightStatus()
  const dogfood = buildMyicroTrainingDogfoodProof()
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
  const card = (await getBacklogItemsByIds([MYICRO_TRAINING_CARD_ID])).find(item => item.id === MYICRO_TRAINING_CARD_ID) || cards.find(item => item.id === MYICRO_TRAINING_CARD_ID) || null
  const webCard = cards.find(item => item.id === WEB_GODMODE_CARD_ID) || null
  const priorMyicorCard = cards.find(item => item.id === MYICOR_EXTRACTION_PREFLIGHT_CARD_ID) || null
  const nextCard = cards.find(item => item.id === MYICRO_TRAINING_NEXT_CARD_ID) || null
  const myicroItem = (activeSprint.items || []).find(item => item.cardId === MYICRO_TRAINING_CARD_ID) || null
  const nextItem = (activeSprint.items || []).find(item => item.cardId === MYICRO_TRAINING_NEXT_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === MYICRO_TRAINING_CLOSEOUT_KEY) || null

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || MYICRO_TRAINING_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for Mycro training preflight', buildPlanCriticResultSummary(planReview))
  addCheck(checks, planCriticRuns.some(run => run.cardId === MYICRO_TRAINING_CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, webCard?.lane === 'done', 'WEB-GODMODE prerequisite is done', webCard ? `${webCard.id}:${webCard.lane}` : 'missing')
  addCheck(checks, priorMyicorCard?.lane === 'done', 'prior MYICOR source/auth preflight is done', priorMyicorCard ? `${priorMyicorCard.id}:${priorMyicorCard.lane}` : 'missing')
  addCheck(checks, card && (args.closeCard ? card.lane === 'scoped' : ['research', 'scoped', 'executing'].includes(card.lane)), 'live Mycro card exists and stays not-done for blocked preflight', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, nextCard && ['research', 'scoped', 'executing', 'done'].includes(nextCard.lane), 'next Drive worker card remains live', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, preflight.ok && preflight.status === 'blocked_pending_source_specific_approval', 'Mycro training preflight parks live execution behind approval', preflight.status)
  addCheck(checks, preflight.approvalPacket.canRunNow === false && preflight.approvalPacket.status === 'approval_required', 'one-lesson run packet refuses live Mycro run without approval', preflight.approvalPacket.status)
  addCheck(checks, preflight.blockedObservationSummary.ok === false && preflight.blockedObservationSummary.failureCodes.includes('browser_session_preflight_required'), 'WEB-GODMODE blocks private Mycro observation without preflight', preflight.blockedObservationSummary.failureCodes.join(', '))
  addCheck(checks, preflight.approvedObservationSummary.ok === true && preflight.approvedObservationSummary.liveBrowserLaunched === false && preflight.approvedObservationSummary.networkFetched === false, 'synthetic approved Mycro observation stays no-network', JSON.stringify(preflight.approvedObservationSummary))
  addCheck(checks, preflight.multimodal.ok === true, 'Mycro multimodal envelope validates in synthetic approval mode', preflight.multimodal.findings.join(', ') || 'healthy')
  addCheck(checks, dogfood.ok === true, 'dogfood proves source/auth blocking and side-effect rejection', JSON.stringify(dogfood.rejectedCases))
  addCheck(checks, Object.values(preflight.sideEffects).every(value => value === false || value === 0), 'preflight starts no live side effects', JSON.stringify(preflight.sideEffects))
  addCheck(checks, sourceNote.includes('Phase B needs one Steve-authorized lesson') && sourceNote.includes('do not blind-scrape'), 'Mycro source note preserves one-lesson approval boundary', 'docs/source-notes/myicro-training.md')
  addCheck(checks, packageJson.scripts?.['process:myicro-training-check'] === `node --env-file-if-exists=.env ${MYICRO_TRAINING_SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:myicro-training-check'] || 'missing')
  addCheck(checks, closeoutRegistrySource.includes(MYICRO_TRAINING_CLOSEOUT_KEY) && closeoutRegistrySource.includes('blocked-preflight') && closeoutRegistrySource.includes(MYICRO_TRAINING_CARD_ID), 'closeout registry source includes blocked-preflight record', 'lib/foundation-build-closeout-intelligence-records.js')
  addCheck(checks, closeout?.status === 'blocked-preflight' && closeout.operatorCloseout === true && (closeout.backlogIds || []).includes(MYICRO_TRAINING_CARD_ID), 'build closeout lookup resolves blocked-preflight record', closeout?.key || 'missing')
  addCheck(checks, await repoFileExists(MYICRO_TRAINING_CLOSEOUT_PATH), 'closeout handoff exists', MYICRO_TRAINING_CLOSEOUT_PATH)
  addCheck(checks, closeoutDoc.includes('not marked done') && closeoutDoc.includes(MYICRO_TRAINING_NEXT_CARD_ID), 'closeout states not marked done and next card', MYICRO_TRAINING_CLOSEOUT_PATH)
  if (args.closeCard) {
    addCheck(checks, activeSprint.sprint?.activeBlockerCardId === MYICRO_TRAINING_NEXT_CARD_ID, 'Current Sprint advances to next safe card', activeSprint.sprint?.activeBlockerCardId || 'missing')
    addCheck(checks, myicroItem?.stage === 'returned' && Boolean(myicroItem.returnedReason), 'Current Sprint parks Mycro training as returned with reason', myicroItem ? `${myicroItem.stage}:${myicroItem.returnedReason || 'missing reason'}` : 'missing')
    addCheck(checks, nextItem?.stage === 'scoping', 'next card remains visible for safe continuation', nextItem ? `${nextItem.cardId}:${nextItem.stage}` : 'missing')
  }
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint remains healthy after parking Mycro preflight', currentSprintStatus.findings?.map(item => `${item.check}:${item.detail}`).join('; ') || 'healthy')

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    cardId: MYICRO_TRAINING_CARD_ID,
    closeoutKey: MYICRO_TRAINING_CLOSEOUT_KEY,
    nextCardId: MYICRO_TRAINING_NEXT_CARD_ID,
    preflight,
    dogfood,
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }
  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`Mycro training preflight check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Mycro training preflight check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
