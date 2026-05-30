#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
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
  CURRENT_SPRINT_ACTIVE_CARD_GATE_APPROVAL_PATH as APPROVAL_PATH,
  CURRENT_SPRINT_ACTIVE_CARD_GATE_CARD_ID as CARD_ID,
  CURRENT_SPRINT_ACTIVE_CARD_GATE_CLOSEOUT_KEY as CLOSEOUT_KEY,
  CURRENT_SPRINT_ACTIVE_CARD_GATE_NOT_NEXT as NOT_NEXT,
  CURRENT_SPRINT_ACTIVE_CARD_GATE_OVERNIGHT_ORDER as OVERNIGHT_ORDER,
  CURRENT_SPRINT_ACTIVE_CARD_GATE_PLAN_PATH as PLAN_PATH,
  CURRENT_SPRINT_ACTIVE_CARD_GATE_PROOF_COMMANDS as PROOF_COMMANDS,
  CURRENT_SPRINT_ACTIVE_CARD_GATE_SCRIPT_PATH as SCRIPT_PATH,
  CURRENT_SPRINT_ACTIVE_CARD_GATE_SPRINT_ID as SPRINT_ID,
  DEEP_AUDIT_FINDINGS_CLOSURE_GATE_CARD_ID as NEXT_CARD_ID,
  buildCurrentSprintActiveCardGateDogfoodProof,
  buildCurrentSprintActiveCardGateOverlay,
  getCurrentSprintActiveCardGateBacklogRows,
  validateCurrentSprintActiveCardGateSnapshot,
} from '../lib/current-sprint-active-card-gate.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-current-sprint-active-card-gate'
const CHANGED_FILES = [
  'lib/current-sprint-active-card-gate.js',
  SCRIPT_PATH,
  PLAN_PATH,
  APPROVAL_PATH,
  'lib/foundation-build-closeout-process-gate-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'package.json',
]

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] }),
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

function git(args = []) {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  })
  return String(result.stdout || '').trim()
}

function getGitState() {
  return {
    branch: git(['rev-parse', '--abbrev-ref', 'HEAD']),
    head: git(['rev-parse', 'HEAD']),
    originMain: git(['rev-parse', 'origin/main']),
    porcelain: git(['status', '--short']),
  }
}

async function upsertBacklogRows({ closeCard = false } = {}) {
  const rows = getCurrentSprintActiveCardGateBacklogRows({ closeCard })
  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const row of rows) {
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
              lane = CASE
                WHEN backlog_items.lane = 'done' AND EXCLUDED.lane <> 'done' THEN backlog_items.lane
                ELSE EXCLUDED.lane
              END,
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
        [
          row.id,
          row.title,
          row.team,
          row.lane,
          row.priority,
          row.rank,
          row.source,
          row.summary,
          row.whyItMatters,
          row.nextAction,
          row.statusNote,
          row.owner,
        ],
      )
      await client.query(
        `
          INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
          VALUES ($1,'backlog_items',$2,$3,$4,$5::jsonb)
        `,
        [
          row.lane === 'done' ? 'backlog_status_changed' : 'backlog_updated',
          row.id,
          ACTOR,
          `${row.lane === 'done' ? 'Closed' : 'Updated'} ${row.id} for overnight sprint control.`,
          JSON.stringify({ closeoutKey: CLOSEOUT_KEY, sprintId: SPRINT_ID, lane: row.lane }),
        ],
      )
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,$9)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result,
            created_at = NOW()
      `,
      [
        `current-sprint-active-card-gate-${stableRunId(PLAN_PATH)}`,
        CARD_ID,
        PLAN_PATH,
        planReview.status,
        planReview.score,
        CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: CARD_ID, closeoutKey: CLOSEOUT_KEY }),
        ACTOR,
      ],
    )
  } finally {
    client.release()
    await pool.end()
  }
}

async function applyLiveState({ closeCard = false, planReview, gitState }) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'create/update active-card gate backlog rows, Plan Critic row, and overnight Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertBacklogRows({ closeCard })
  await upsertPlanCriticRun(planReview)
  await upsertFoundationCurrentSprintOverlay(
    buildCurrentSprintActiveCardGateOverlay({
      closeCard,
      currentHead: gitState.head,
    }),
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || SPRINT_ID,
      reason: `${CARD_ID} ${closeCard ? 'closes active-card gate and advances to deep audit closure' : 'opens overnight sprint control truth'}.`,
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  await initFoundationDb()

  const [
    approval,
    planSource,
    packageJson,
    moduleSource,
    scriptSource,
    closeoutRegistrySource,
    coverageSource,
    closeoutDoc,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile(PLAN_PATH),
    readRepoJson('package.json'),
    readRepoFile('lib/current-sprint-active-card-gate.js'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/foundation-build-closeout-process-gate-records.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('docs/_archive/handoffs/2026-05-19-current-sprint-active-card-gate-closeout.md', { optional: true }),
  ])
  const gitState = getGitState()
  const dogfood = buildCurrentSprintActiveCardGateDogfoodProof()
  const cardRow = getCurrentSprintActiveCardGateBacklogRows({ closeCard: args.closeCard }).find(row => row.id === CARD_ID)
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: cardRow,
    changedFiles: CHANGED_FILES,
    declaredRisk: 'Current Sprint control-plane mutation, backlog card creation, overnight sprint sequencing, process gate, package script, verifier coverage, and closeout registry',
    repoRoot,
  })

  if ((args.apply || args.closeCard) &&
    approval.ok &&
    Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    planReview.status === 'pass' &&
    Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    dogfood.ok) {
    await applyLiveState({ closeCard: args.closeCard, planReview, gitState })
  }

  const activeSprint = await getActiveFoundationCurrentSprint()
  const activeSprintCardIds = Array.from(new Set([
    ...OVERNIGHT_ORDER,
    ...(activeSprint.items || []).map(item => String(item.cardId || item.backlogId || '').trim()).filter(Boolean),
  ]))
  const [cards, planCriticRuns] = await Promise.all([
    getBacklogItemsByIds(activeSprintCardIds),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])
  const liveGate = validateCurrentSprintActiveCardGateSnapshot({
    sprint: activeSprint.sprint,
    items: activeSprint.items,
    backlogItems: cards,
  })
  const currentCard = cards.find(card => card.id === CARD_ID)
  const nextCard = cards.find(card => card.id === NEXT_CARD_ID)
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY)
  const sprintItem = activeSprint.items.find(item => item.cardId === CARD_ID)

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for active-card gate', buildPlanCriticResultSummary(planReview))
  addCheck(checks, dogfood.ok, 'dogfood rejects missing active-card fields and stop-whole-sprint policy', dogfood.ok ? 'pass' : JSON.stringify(dogfood))
  addCheck(checks, liveGate.ok, 'live Current Sprint active-card gate is healthy', liveGate.findings.map(item => `${item.check}: ${item.detail}`).join('; ') || liveGate.activeBlockerCardId)
  addCheck(checks, activeSprint.sprint?.status === 'active' && Boolean(activeSprint.sprint?.sprintId), 'Current Sprint exposes live active sprint truth', activeSprint.sprint?.sprintId || 'missing')
  addCheck(checks, activeSprint.items.length > 0, 'Current Sprint contains live ordered work', String(activeSprint.items.length))
  addCheck(
    checks,
    activeSprint.sprint?.sprintId !== SPRINT_ID || activeSprint.items.length === OVERNIGHT_ORDER.length,
    'historical overnight sprint order is valid when that sprint is active',
    `${activeSprint.sprint?.sprintId || 'missing'}:${activeSprint.items.length}`,
  )
  addCheck(checks, OVERNIGHT_ORDER.every(cardId => cards.some(card => card.id === cardId)), 'historical overnight sprint cards still resolve to live backlog truth', cards.map(card => card.id).join(', '))
  addCheck(checks, currentCard?.priority === 'P0' && (args.closeCard ? currentCard.lane === 'done' : ['executing', 'done'].includes(currentCard?.lane)), 'active-card gate backlog row has correct lane', currentCard ? `${currentCard.lane}/${currentCard.priority}` : 'missing')
  addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'next deep-audit closure gate card exists', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE) || args.apply || args.closeCard, 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, packageJson.scripts?.['process:current-sprint-active-card-gate-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:current-sprint-active-card-gate-check'] || 'missing')
  addCheck(checks, moduleSource.includes('blockersBlockActionsNotSprint') && moduleSource.includes('repoPosture') && moduleSource.includes('validateCurrentSprintActiveCardGateSnapshot'), 'module owns active-card/repo-posture gate behavior', 'lib/current-sprint-active-card-gate.js')
  addCheck(checks, scriptSource.includes('assertProcessCheckWriteAllowed') && scriptSource.includes('upsertFoundationCurrentSprintOverlay'), 'focused script uses explicit write guard and sprint overlay helper', SCRIPT_PATH)
  addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeout?.backlogIds?.includes(CARD_ID), 'closeout registry resolves active-card gate', closeout?.key || 'missing')
  addCheck(checks, coverageSource.includes(CARD_ID), 'verifier coverage list includes active-card gate card', CARD_ID)
  addCheck(checks, !args.closeCard || sprintItem?.stage === 'done_this_sprint', 'Current Sprint marks active-card gate done after close', sprintItem?.stage || 'missing')
  addCheck(checks, !args.closeCard || activeSprint.sprint?.activeBlockerCardId === NEXT_CARD_ID, 'Current Sprint advances to deep-audit closure after close', activeSprint.sprint?.activeBlockerCardId || 'missing')
  addCheck(checks, !args.closeCard || closeoutDoc.includes(CARD_ID) && closeoutDoc.includes(NEXT_CARD_ID), 'closeout handoff records next card', closeoutDoc ? 'present' : 'missing')
  addCheck(checks, gitState.branch === 'main', 'repo branch posture is main', gitState.branch)
  addCheck(checks, gitState.head === gitState.originMain || Boolean(gitState.porcelain), 'repo is synced or in-flight card has tracked dirty work', gitState.head === gitState.originMain ? 'synced' : 'in-flight')

  const failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'risk' : 'healthy',
    generatedAt: new Date().toISOString(),
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    sprintId: activeSprint.sprint?.sprintId || null,
    activeBlocker: activeSprint.sprint?.activeBlockerCardId || null,
    dogfood,
    liveGate,
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Current Sprint active-card gate: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Current Sprint active-card gate check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
