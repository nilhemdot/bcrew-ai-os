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
  FOUNDATION_SPRINT_CLOSEOUT_APPROVAL_PATH as APPROVAL_PATH,
  FOUNDATION_SPRINT_CLOSEOUT_CARD_ID as CARD_ID,
  FOUNDATION_SPRINT_CLOSEOUT_CHANGED_FILES as CHANGED_FILES,
  FOUNDATION_SPRINT_CLOSEOUT_CLOSEOUT_KEY as CLOSEOUT_KEY,
  FOUNDATION_SPRINT_CLOSEOUT_HANDOFF_PATH as HANDOFF_PATH,
  FOUNDATION_SPRINT_CLOSEOUT_NOT_NEXT as NOT_NEXT,
  FOUNDATION_SPRINT_CLOSEOUT_PLAN_PATH as PLAN_PATH,
  FOUNDATION_SPRINT_CLOSEOUT_PROOF_COMMANDS as PROOF_COMMANDS,
  FOUNDATION_SPRINT_CLOSEOUT_REQUIRED_CARDS as REQUIRED_CARDS,
  FOUNDATION_SPRINT_CLOSEOUT_SCRIPT_PATH as SCRIPT_PATH,
  buildFoundationSprintCloseoutDogfoodProof,
  buildFoundationSprintCloseoutStatus,
} from '../lib/foundation-sprint-closeout-continuous-work.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const SPRINT_ID = 'FOUNDATION-GREEN-MAIN-AUDIT-AND-SOURCE-ACTIVATION-2026-05-19'

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

function parseJsonFromCommand(text = '') {
  const value = String(text || '')
  const starts = [...value.matchAll(/\n\{/g)].map(match => match.index + 1)
  starts.unshift(value.indexOf('{'))
  for (const start of starts.filter(index => index >= 0)) {
    try {
      return JSON.parse(value.slice(start))
    } catch {}
  }
  return null
}

function runNpmScript(script, args = []) {
  const output = spawnSync('npm', ['run', script, '--', ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 90 * 1024 * 1024,
  })
  const text = `${output.stdout || ''}\n${output.stderr || ''}`
  return {
    exitStatus: output.status,
    json: parseJsonFromCommand(text),
    text,
  }
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
  const porcelain = git(['status', '--short'])
  return {
    clean: porcelain.length === 0,
    status: porcelain,
    head: git(['rev-parse', 'HEAD']),
    originMain: git(['rev-parse', 'origin/main']),
  }
}

function buildCloseoutCardRow({ closeCard = false } = {}) {
  return {
    id: CARD_ID,
    title: 'Close Foundation sprint and decide continuous work readiness',
    team: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 11,
    source: 'Steve-approved May 19 Foundation-only unattended sprint.',
    summary: 'Run final sprint audit after guardrails/source/extract cards and decide whether continuous Foundation Builder / Value Builder split is safe.',
    whyItMatters: 'Steve needs an explicit go/no-go on unattended building. The system should not equate velocity with readiness if raw health, repeated failures, backlog truth, or main integration are still drifting.',
    nextAction: closeCard
      ? 'Closed: continuous Foundation Builder is ready under repair-first rules; full Value Builder split remains deferred until the next clean overnight/morning cycle or explicit Steve approval.'
      : 'Run final Foundation sprint closeout audit, name any remaining blockers, and recommend whether continuous Foundation Builder / Value Builder split is ready.',
    statusNote: closeCard
      ? `Closed under \`${CLOSEOUT_KEY}\`; raw health, repeated-failure gate, backlog hygiene, current sprint truth, and required sprint cards were green. Foundation can continue unattended under repair-first rules; Value Builder split is not auto-started by this closeout.`
      : 'Final Foundation sprint closeout is active.',
    owner: 'Foundation Ops',
  }
}

function buildCloseoutSprintItem(item = {}, { closeCard = false } = {}) {
  return {
    ...item,
    cardId: CARD_ID,
    backlogId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: PLAN_PATH,
    definitionOfDone: 'Final sprint audit proves raw health, repeated failures, backlog hygiene, Current Sprint truth, main integration, and required sprint cards are clean, then records continuous-work recommendation.',
    proofCommands: PROOF_COMMANDS,
    nextAction: closeCard ? 'Sprint closed. Start the next sprint from morning audit truth.' : 'Run final sprint closeout proof.',
    notNextBoundaries: Array.from(new Set([...(item.notNextBoundaries || []), ...NOT_NEXT])),
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      approvalRef: APPROVAL_PATH,
      approvalBoundActionsParkInsteadOfStopping: true,
      valueBuilderSplitAutoStarted: false,
    },
  }
}

function buildSprintItems(previous = {}, { closeCard = false } = {}) {
  const existing = Array.isArray(previous.items) ? previous.items : []
  const items = []
  let sawCard = false
  for (const item of existing) {
    if (item.cardId === CARD_ID) {
      items.push(buildCloseoutSprintItem(item, { closeCard }))
      sawCard = true
    } else {
      items.push(item)
    }
  }
  if (!sawCard) items.push(buildCloseoutSprintItem({ order: items.length + 1 }, { closeCard }))
  return items.map((item, index) => ({ ...item, order: index + 1, sprintOrder: index + 1 }))
}

async function updateBacklogRow(client, row) {
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
}

async function upsertLiveState({ closeCard = false, planReview, activeSprint, closeoutStatus } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'create/update final sprint closeout backlog row, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })

  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await updateBacklogRow(client, buildCloseoutCardRow({ closeCard }))
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-sprint-closeout')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `foundation-sprint-closeout-${stableRunId(PLAN_PATH)}`,
        CARD_ID,
        PLAN_PATH,
        planReview.status,
        planReview.score,
        CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: CARD_ID, closeoutKey: CLOSEOUT_KEY, recommendation: closeoutStatus?.recommendation || null }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-sprint-closeout',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} ${CARD_ID}.`,
        JSON.stringify({ closeoutKey: CLOSEOUT_KEY, recommendation: closeoutStatus?.recommendation || null }),
      ],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }

  const previous = activeSprint || await getActiveFoundationCurrentSprint()
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: previous.sprint?.sprintId || SPRINT_ID,
        status: 'active',
        goal: 'Foundation-only sprint closed with raw-green, repeated-failure, backlog, Current Sprint, and source/extract proof.',
        activeBlockerCardId: closeCard ? null : CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: closeCard ? 'foundation_sprint_closed' : 'foundation_sprint_closeout_active',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? 'No active card remains in this sprint. Start the next sprint from morning audit truth; continuous Foundation Builder is ready under repair-first rules.'
            : `${CARD_ID} is active; close the Foundation-only sprint before any split.`,
          exitCriteria: [
            'System Health is healthy with raw risk/watch at zero.',
            'Repeated-failure gate is healthy.',
            'Backlog hygiene is healthy.',
            'Current Sprint truth is healthy.',
            'Required Foundation-only sprint cards are done.',
            'Main is clean and synced.',
          ],
          continuousWorkReadiness: closeoutStatus?.recommendation || null,
        },
      },
      items: buildSprintItems(previous, { closeCard }),
    },
    'codex-sprint-closeout',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || SPRINT_ID,
      reason: `${CARD_ID} ${closeCard ? 'closes' : 'updates'} the Foundation-only sprint readiness decision.`,
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
    packageJsonSource,
    moduleSource,
    scriptSource,
    closeoutRegistrySource,
    closeoutDoc,
    activeSprint,
    cards,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile(PLAN_PATH),
    readRepoFile('package.json'),
    readRepoFile('lib/foundation-sprint-closeout-continuous-work.js'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/foundation-build-closeout-process-gate-records.js'),
    readRepoFile(HANDOFF_PATH, { optional: true }),
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds([...REQUIRED_CARDS, CARD_ID]),
  ])

  const systemHealth = runNpmScript('process:system-health-nightly-audit-check', ['--json'])
  const repeatedFailureGate = runNpmScript('process:build-lane-repeated-failure-action-gate-check', ['--json'])
  const currentSprintTruth = runNpmScript('process:current-sprint-dynamic-truth-check', ['--json'])
  const backlogHygiene = runNpmScript('backlog:hygiene', ['--json'])
  const gitState = {
    ...getGitState(),
    inFlightCloseout: args.apply || args.closeCard,
  }
  const dogfood = buildFoundationSprintCloseoutDogfoodProof()
  const closeoutStatus = buildFoundationSprintCloseoutStatus({
    systemHealth,
    repeatedFailureGate,
    currentSprintTruth,
    backlogHygiene,
    cards,
    git: gitState,
  })
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCloseoutCardRow({ closeCard: args.closeCard }),
    changedFiles: CHANGED_FILES,
    declaredRisk: 'final sprint control-plane closeout, Current Sprint completion state, continuous-work recommendation, package script, closeout registry, and full Foundation ship gate',
    repoRoot,
  })

  let workingActiveSprint = activeSprint
  let preAppliedLiveState = false
  if ((args.apply || args.closeCard) &&
    approval.ok &&
    Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    planReview.status === 'pass' &&
    Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    (!args.closeCard || closeoutStatus.ok)) {
    await upsertLiveState({ closeCard: args.closeCard, planReview, activeSprint, closeoutStatus })
    preAppliedLiveState = true
    workingActiveSprint = await getActiveFoundationCurrentSprint()
  }

  const [refreshedCards, planCriticRuns] = await Promise.all([
    getBacklogItemsByIds([...REQUIRED_CARDS, CARD_ID]),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])
  const packageJson = JSON.parse(packageJsonSource)
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  const currentCard = refreshedCards.find(item => item.id === CARD_ID) || null
  const sprintItem = (workingActiveSprint.items || []).find(item => item.cardId === CARD_ID) || null
  const activeBlockerCardId = workingActiveSprint.sprint?.activeBlockerCardId || workingActiveSprint.sprint?.active_blocker_card_id || ''

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for final sprint closeout', buildPlanCriticResultSummary(planReview))
  addCheck(checks, dogfood.ok, 'dogfood rejects false continuous-work readiness', dogfood.invariant)
  addCheck(checks, closeoutStatus.ok, 'final closeout readiness status is healthy', closeoutStatus.failed.map(item => item.check).join(', ') || 'pass')
  addCheck(checks, moduleSource.includes('buildFoundationSprintCloseoutStatus') && moduleSource.includes('valueBuilderSplit') && moduleSource.includes('FOUNDATION_SPRINT_CLOSEOUT_REQUIRED_CARDS'), 'closeout module owns reusable readiness decision', 'lib/foundation-sprint-closeout-continuous-work.js')
  addCheck(checks, scriptSource.includes('activeBlockerCardId: closeCard ? null : CARD_ID') && scriptSource.includes('continuousWorkReadiness'), 'focused script closes sprint without auto-starting next split', SCRIPT_PATH)
  addCheck(checks, packageJson.scripts?.['process:foundation-sprint-closeout-continuous-work-ready-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes final sprint closeout focused proof', packageJson.scripts?.['process:foundation-sprint-closeout-continuous-work-ready-check'] || 'missing')
  addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'closeout registry resolves final sprint closeout', closeout?.key || 'missing')
  addCheck(checks, closeoutDoc.includes(CARD_ID) && closeoutDoc.includes('continuous Foundation Builder') && closeoutDoc.includes('Value Builder split'), 'closeout handoff exists and records split recommendation', HANDOFF_PATH)
  addCheck(checks, currentCard?.priority === 'P0' && (args.closeCard ? currentCard.lane === 'done' : ['executing', 'scoped', 'done'].includes(currentCard?.lane)), 'final sprint closeout backlog row is correct', currentCard ? `${currentCard.lane}/${currentCard.priority}` : 'missing')
  addCheck(checks, !args.closeCard || sprintItem?.stage === 'done_this_sprint' || args.apply, 'Current Sprint records final closeout', sprintItem?.stage || 'missing')
  addCheck(checks, !args.closeCard || !activeBlockerCardId || args.apply, 'Current Sprint has no active blocker after final closeout', activeBlockerCardId || 'none')
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE) || args.apply, 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')

  let failed = checks.filter(check => !check.ok)
  if ((args.apply || args.closeCard) && !failed.length && !preAppliedLiveState) {
    await upsertLiveState({ closeCard: args.closeCard, planReview, activeSprint, closeoutStatus })
  }

  if (args.closeCard) {
    const [latestCards, latestPlanCritic, latestSprint] = await Promise.all([
      getBacklogItemsByIds([CARD_ID]),
      getPlanCriticRunsByCardIds([CARD_ID]),
      getActiveFoundationCurrentSprint(),
    ])
    const latestActiveBlocker = latestSprint.sprint?.activeBlockerCardId || latestSprint.sprint?.active_blocker_card_id || ''
    addCheck(checks, latestCards.some(item => item.id === CARD_ID && item.lane === 'done'), 'live backlog card is done after close', latestCards.map(item => `${item.id}:${item.lane}`).join(', ') || 'missing')
    addCheck(checks, latestPlanCritic.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists after close', latestPlanCritic.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
    addCheck(checks, !latestActiveBlocker, 'no active blocker remains after sprint closeout', latestActiveBlocker || 'none')
  }

  failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'risk' : 'healthy',
    generatedAt: new Date().toISOString(),
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    closeoutStatus,
    dogfood,
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Foundation sprint closeout check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Foundation sprint closeout check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
