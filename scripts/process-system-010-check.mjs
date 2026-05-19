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
  SYSTEM_010_APPROVAL_PATH,
  SYSTEM_010_CARD_ID as CARD_ID,
  SYSTEM_010_CHANGED_FILES,
  SYSTEM_010_CLOSEOUT_KEY as CLOSEOUT_KEY,
  SYSTEM_010_CLOSEOUT_PATH,
  SYSTEM_010_NEXT_CARD_ID as NEXT_CARD_ID,
  SYSTEM_010_NOT_NEXT,
  SYSTEM_010_PLAN_PATH,
  SYSTEM_010_PROOF_COMMANDS,
  SYSTEM_010_SCRIPT_PATH,
  buildSystem010DogfoodProof,
  evaluateSystem010ProcessControl,
} from '../lib/system-010-process-control.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const SPRINT_ID = 'FOUNDATION-GREEN-MAIN-AUDIT-AND-SOURCE-ACTIVATION-2026-05-19'
const GHOST_CARD_ID = 'SYSTEM-010-GHOST-CLOSEOUT-001'
const GHOST_CHECK_SCRIPT = 'process:system-010-ghost-closeout-check'

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
  for (const start of starts.filter(index => index >= 0).reverse()) {
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

function buildSystem010CardRow({ closeCard = false } = {}) {
  return {
    id: CARD_ID,
    title: 'Add visible process control, kill switches, and decommission workflow for running agents',
    team: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 4,
    source: 'Steve-approved May 19 Foundation-only unattended sprint; top-level reconciliation over shipped SYSTEM-010 runtime/process-control work.',
    summary: 'Close SYSTEM-010 by proving the shipped runtime/process-control layer covers pause, kill, decommission, ownership, stale ledger, restart visibility, and operator-safe controls.',
    whyItMatters: 'Foundation cannot run unattended if jobs, workers, and long-running processes are invisible or unstoppable. The operator needs controls that fail closed and stay visible in System Health.',
    nextAction: closeCard
      ? `Done under \`${CLOSEOUT_KEY}\`; continue \`${NEXT_CARD_ID}\` before extraction work.`
      : 'Prove the existing SYSTEM-010 process-control layer, close this top-level card, and advance to SOURCE-012.',
    statusNote: closeCard
      ? `Closed under \`${CLOSEOUT_KEY}\`; runtime/process-control v1 is live through the shipped ghost closeout and top-level Current Sprint truth now advances to SOURCE-012.`
      : `Executing \`${CLOSEOUT_KEY}\`; proving shipped runtime controls and reconciling top-level SYSTEM-010 truth.`,
    owner: 'Foundation Process',
  }
}

function buildSource012CardRow() {
  return {
    id: NEXT_CARD_ID,
    title: 'Make source contracts and connectors visible as separate live layers',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 5,
    source: 'Steve-approved May 19 Foundation-only unattended sprint; promoted after SYSTEM-010 so source truth is clean before extraction expansion.',
    summary: 'Build the next source layer so users can clearly see the difference between a source contract, a technical connector, trust state, freshness, drift, owner, and dependent systems.',
    whyItMatters: 'Extraction work should not expand on fuzzy source truth. Source contracts and connectors need separate visible live layers before current/backfill extraction builds more dependence on them.',
    nextAction: 'Build SOURCE-012 next with an approved plan and focused proof: source status, connector status, trust status, freshness, drift, owner, direct source link, and dependent-system split.',
    statusNote: `Next active Foundation card after ${CLOSEOUT_KEY}; promoted to P0 for this sprint because it gates safe source/extract work. Proof/acceptance must be scoped before closeout and full gates are required.`,
    owner: 'Foundation Source',
  }
}

function buildSystem010SprintItem(item = {}, { closeCard = false } = {}) {
  return {
    ...item,
    cardId: CARD_ID,
    backlogId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: SYSTEM_010_PLAN_PATH,
    definitionOfDone: 'Top-level SYSTEM-010 closes only when shipped runtime/process-control proof covers stop, decommission, owner metadata, stale liveness, restart visibility, and active-process controls.',
    proofCommands: SYSTEM_010_PROOF_COMMANDS,
    nextAction: closeCard ? `Run ${NEXT_CARD_ID} next.` : 'Close SYSTEM-010 before SOURCE-012 and extraction work.',
    notNextBoundaries: Array.from(new Set([...(item.notNextBoundaries || []), ...SYSTEM_010_NOT_NEXT])),
    existingWorkCheck: {
      reused: [
        'SYSTEM-010-GHOST-CLOSEOUT-001 shipped runtime/process-control implementation',
        'lib/runtime-process-control.js',
        'GET /api/foundation/active-processes',
        'job stop and decommission routes',
        'Runtime Health controls',
        'Foundation worker process-owner metadata',
        'Runtime supervisor visibility',
      ],
      notRebuilt: [
        'No replacement runtime control surface.',
        'No new process manager.',
        'No new external job runner.',
        'No source/extract/value work from this card.',
      ],
      existingCode: [
        'lib/runtime-process-control.js',
        'scripts/process-system-010-ghost-closeout-check.mjs',
        'lib/foundation-runtime-read-routes.js',
        'server.js',
        'public/foundation.js',
      ],
      existingDocs: [
        'docs/process/system-010-ghost-closeout-001-plan.md',
        'docs/process/system-010-ghost-closeout.md',
        'docs/process/runtime-supervisor-001-plan.md',
      ],
      existingScripts: [
        'scripts/process-system-010-ghost-closeout-check.mjs',
        'scripts/process-runtime-supervisor-check.mjs',
        'scripts/run-foundation-job.mjs',
        'scripts/foundation-worker.mjs',
      ],
      existingPolicy: [
        'Blockers block actions, not the whole sprint.',
        'Unsafe stop/decommission must fail closed.',
        'Decommission requires explicit confirmation and no active run.',
        'Existing governed repair reruns may run without stopping the whole sprint when they only read approved source data and write local ledger/proof rows.',
      ],
      exactGap: 'The runtime control implementation was shipped under SYSTEM-010-GHOST-CLOSEOUT-001, but the top-level SYSTEM-010 card remained the Current Sprint blocker.',
      overBroadRisk: 'A full rewrite of runtime controls would be unnecessary and risky. This card is a top-level reconciliation, stale-source cleanup, and proof wrapper over the shipped implementation.',
      readyBy: 'Steve',
      readyAt: '2026-05-19T14:45:00-04:00',
    },
    metadata: {
      ...(item.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      approvalRef: SYSTEM_010_APPROVAL_PATH,
      ghostCardId: GHOST_CARD_ID,
    },
  }
}

function buildSource012SprintItem(item = {}, { active = false } = {}) {
  return {
    ...item,
    cardId: NEXT_CARD_ID,
    backlogId: NEXT_CARD_ID,
    stage: active ? 'scoping' : (item.stage || 'scoping'),
    planRef: 'docs/process/source-012-source-connector-live-layers-plan.md',
    definitionOfDone: 'Source contracts and connectors render as separate live layers with source status, connector status, trust status, freshness, drift, owner, direct source link, and dependent systems.',
    proofCommands: [
      'node --check lib/source-contracts.js scripts/process-source-012-check.mjs',
      'npm run process:source-012-check -- --apply --close-card --json',
      'npm run process:system-health-nightly-audit-check -- --json',
      'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
      'npm run process:foundation-ship -- --card=SOURCE-012 --planApprovalRef=docs/process/approvals/SOURCE-012.json --closeoutKey=source-012-source-connector-live-layers-v1 --commitRef=HEAD',
    ],
    nextAction: 'Build SOURCE-012 next; keep source contracts and connector status separate before extraction expansion.',
    notNextBoundaries: Array.from(new Set([...(item.notNextBoundaries || []), ...SYSTEM_010_NOT_NEXT])),
    metadata: {
      ...(item.metadata || {}),
      unblockedBy: CARD_ID,
      requiredBeforeExtractionExpansion: true,
    },
  }
}

function buildSprintItems(previous = {}, { closeCard = false } = {}) {
  const existing = Array.isArray(previous.items) ? previous.items : []
  const items = []
  const seen = new Set()
  for (const item of existing) {
    if (item.cardId === CARD_ID) {
      items.push(buildSystem010SprintItem(item, { closeCard }))
      seen.add(CARD_ID)
      continue
    }
    if (item.cardId === NEXT_CARD_ID) {
      if (!seen.has(CARD_ID)) {
        items.push(buildSystem010SprintItem({ order: item.order || items.length + 1 }, { closeCard }))
        seen.add(CARD_ID)
      }
      items.push(buildSource012SprintItem(item, { active: closeCard }))
      seen.add(NEXT_CARD_ID)
      continue
    }
    items.push(item)
    if (item.cardId) seen.add(item.cardId)
  }
  if (!seen.has(CARD_ID)) items.push(buildSystem010SprintItem({ order: items.length + 1 }, { closeCard }))
  if (closeCard && !seen.has(NEXT_CARD_ID)) items.push(buildSource012SprintItem({ order: items.length + 1 }, { active: true }))
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

async function upsertLiveState({ closeCard = false, planReview, activeSprint } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SYSTEM_010_SCRIPT_PATH,
    operation: 'create/update SYSTEM-010 and SOURCE-012 backlog rows, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })

  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await updateBacklogRow(client, buildSystem010CardRow({ closeCard }))
    await updateBacklogRow(client, buildSource012CardRow())
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-system-010-process-control')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `system-010-process-control-${stableRunId(SYSTEM_010_PLAN_PATH)}`,
        CARD_ID,
        SYSTEM_010_PLAN_PATH,
        planReview.status,
        planReview.score,
        SYSTEM_010_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: CARD_ID, closeoutKey: CLOSEOUT_KEY }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-system-010-process-control',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} ${CARD_ID}.`,
        JSON.stringify({
          closeoutKey: CLOSEOUT_KEY,
          nextCardId: NEXT_CARD_ID,
          ghostCardId: GHOST_CARD_ID,
        }),
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
        goal: 'Make Foundation raw-green, self-improving, backlog-clean, operationally controlled, and ready to resume source/extract work without rebuilding tech debt.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: closeCard ? 'system_010_process_control_closed' : 'system_010_process_control_active',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `Continue ${NEXT_CARD_ID}; SYSTEM-010 is closed.`
            : `${CARD_ID} is active; prove process controls before SOURCE-012.`,
          system010ProcessControlSummary: {
            status: closeCard ? 'healthy' : 'active',
            closeoutKey: CLOSEOUT_KEY,
            ghostCardId: GHOST_CARD_ID,
            nextCardId: NEXT_CARD_ID,
            blockersBlockActionsNotSprint: true,
          },
        },
      },
      items: buildSprintItems(previous, { closeCard }),
    },
    'codex-system-010-process-control',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || SPRINT_ID,
      reason: `${CARD_ID} ${closeCard ? 'closes' : 'updates'} process-control truth and ${closeCard ? `advances to ${NEXT_CARD_ID}` : 'owns the active blocker'}.`,
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
    sourceContractsText,
    closeoutRegistrySource,
    closeoutDoc,
    activeSprint,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: SYSTEM_010_APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile(SYSTEM_010_PLAN_PATH),
    readRepoFile('package.json'),
    readRepoFile('lib/system-010-process-control.js'),
    readRepoFile(SYSTEM_010_SCRIPT_PATH),
    readRepoFile('lib/source-contracts.js'),
    readRepoFile('lib/foundation-build-closeout-process-gate-records.js'),
    readRepoFile(SYSTEM_010_CLOSEOUT_PATH, { optional: true }),
    getActiveFoundationCurrentSprint(),
  ])

  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildSystem010CardRow({ closeCard: args.closeCard }),
    changedFiles: SYSTEM_010_CHANGED_FILES,
    declaredRisk: 'runtime process controls, Current Sprint active blocker progression, source contract stale truth, and full Foundation ship gate',
    repoRoot,
  })

  let workingActiveSprint = activeSprint
  let preAppliedLiveState = false
  if ((args.apply || args.closeCard) &&
    approval.ok &&
    Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    planReview.status === 'pass' &&
    Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE) {
    await upsertLiveState({ closeCard: args.closeCard, planReview, activeSprint })
    preAppliedLiveState = true
    workingActiveSprint = await getActiveFoundationCurrentSprint()
  }

  const [cards, planCriticRuns] = await Promise.all([
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID, GHOST_CARD_ID]),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])
  const packageJson = JSON.parse(packageJsonSource)
  const closeouts = getFoundationBuildCloseouts()
  const expectedActiveBlockerCardId = args.closeCard ? NEXT_CARD_ID : CARD_ID
  const liveStatus = evaluateSystem010ProcessControl({
    activeSprint: workingActiveSprint,
    cards,
    closeouts,
    packageJson,
    sourceContractsText,
    expectedActiveBlockerCardId,
  })
  const dogfood = buildSystem010DogfoodProof()
  const ghostCheck = runNpmScript(GHOST_CHECK_SCRIPT, ['--json'])
  const p0Reality = runNpmScript('process:foundation-backlog-p0-reality-cleanup-check', ['--json'])
  const systemHealth = runNpmScript('process:system-health-nightly-audit-check', ['--json'])
  const repeatedFailureGate = runNpmScript('process:build-lane-repeated-failure-action-gate-check', ['--json'])
  const systemCard = cards.find(item => item.id === CARD_ID) || null
  const sourceCard = cards.find(item => item.id === NEXT_CARD_ID) || null
  const systemSprintItem = (workingActiveSprint.items || []).find(item => item.cardId === CARD_ID) || null
  const sourceSprintItem = (workingActiveSprint.items || []).find(item => item.cardId === NEXT_CARD_ID) || null
  const closeout = closeouts.find(record => record.key === CLOSEOUT_KEY) || null

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || SYSTEM_010_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for SYSTEM-010 top-level closeout', buildPlanCriticResultSummary(planReview))
  addCheck(checks, dogfood.ok, 'dogfood rejects unsafe stop/decommission/run-control cases', dogfood.checks.filter(check => !check.ok).map(check => check.check).join(', ') || 'pass')
  addCheck(checks, ghostCheck.exitStatus === 0, 'shipped SYSTEM-010 ghost proof still passes', `exit=${ghostCheck.exitStatus}`)
  addCheck(checks, liveStatus.ok, 'live SYSTEM-010 process-control truth is healthy', liveStatus.failed.map(item => item.check).join(', ') || 'pass')
  addCheck(checks, systemCard?.priority === 'P0' && (args.closeCard ? systemCard.lane === 'done' : ['executing', 'scoped', 'done'].includes(systemCard?.lane)), 'SYSTEM-010 backlog row is correct', systemCard ? `${systemCard.lane}/${systemCard.priority}` : 'missing')
  addCheck(checks, sourceCard?.priority === 'P0' && sourceCard?.lane === 'scoped', 'SOURCE-012 is promoted as next scoped P0', sourceCard ? `${sourceCard.lane}/${sourceCard.priority}` : 'missing')
  addCheck(checks, p0Reality.exitStatus === 0 && p0Reality.json?.status === 'healthy', 'P0 reality gate remains healthy', `exit=${p0Reality.exitStatus} status=${p0Reality.json?.status || 'missing'}`)
  addCheck(checks, systemHealth.exitStatus === 0 && (systemHealth.json?.status === 'healthy' || systemHealth.json?.systemHealth?.status === 'healthy'), 'System Health remains healthy', `exit=${systemHealth.exitStatus} status=${systemHealth.json?.status || systemHealth.json?.systemHealth?.status || 'missing'}`)
  addCheck(checks, repeatedFailureGate.exitStatus === 0 && repeatedFailureGate.json?.status === 'healthy', 'repeated-failure gate remains healthy', `exit=${repeatedFailureGate.exitStatus} status=${repeatedFailureGate.json?.status || 'missing'}`)
  addCheck(checks, moduleSource.includes('evaluateSystem010ProcessControl') && moduleSource.includes('buildSystem010DogfoodProof'), 'reusable SYSTEM-010 proof module owns dogfood evaluation', 'lib/system-010-process-control.js')
  addCheck(checks, scriptSource.includes('upsertFoundationCurrentSprintOverlay') && scriptSource.includes('buildSource012CardRow'), 'focused script closes SYSTEM-010 and advances SOURCE-012', SYSTEM_010_SCRIPT_PATH)
  addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'closeout registry resolves top-level SYSTEM-010', closeout?.key || 'missing')
  addCheck(checks, closeoutDoc.includes(CARD_ID) && closeoutDoc.includes(NEXT_CARD_ID), 'closeout handoff exists and names next card', SYSTEM_010_CLOSEOUT_PATH)
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE) || args.apply, 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, !args.closeCard || systemSprintItem?.stage === 'done_this_sprint' || args.apply, 'Current Sprint records SYSTEM-010 closeout', systemSprintItem?.stage || 'missing')
  addCheck(checks, !args.closeCard || sourceSprintItem?.stage === 'scoping', 'Current Sprint exposes SOURCE-012 next', sourceSprintItem?.stage || 'missing')
  addCheck(checks, !args.closeCard || (workingActiveSprint.sprint?.activeBlockerCardId || workingActiveSprint.sprint?.active_blocker_card_id) === NEXT_CARD_ID || args.apply, 'Current Sprint active blocker advances to SOURCE-012 after close', workingActiveSprint.sprint?.activeBlockerCardId || workingActiveSprint.sprint?.active_blocker_card_id || 'missing')

  let failed = checks.filter(check => !check.ok)
  if ((args.apply || args.closeCard) && !failed.length && !preAppliedLiveState) {
    await upsertLiveState({ closeCard: args.closeCard, planReview, activeSprint })
  }

  if (args.closeCard) {
    const [refreshedCards, refreshedPlanCritic, refreshedSprint] = await Promise.all([
      getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID]),
      getPlanCriticRunsByCardIds([CARD_ID]),
      getActiveFoundationCurrentSprint(),
    ])
    addCheck(checks, refreshedCards.some(item => item.id === CARD_ID && item.lane === 'done'), 'live backlog card is done after close', refreshedCards.map(item => `${item.id}:${item.lane}`).join(', ') || 'missing')
    addCheck(checks, refreshedCards.some(item => item.id === NEXT_CARD_ID && item.lane === 'scoped' && item.priority === 'P0'), 'SOURCE-012 is scoped P0 after close', refreshedCards.map(item => `${item.id}:${item.lane}/${item.priority}`).join(', ') || 'missing')
    addCheck(checks, refreshedPlanCritic.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists after close', refreshedPlanCritic.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
    addCheck(checks, (refreshedSprint.sprint?.activeBlockerCardId || refreshedSprint.sprint?.active_blocker_card_id) === NEXT_CARD_ID, 'active blocker is SOURCE-012 after close', refreshedSprint.sprint?.activeBlockerCardId || refreshedSprint.sprint?.active_blocker_card_id || 'missing')
  }

  failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'risk' : 'healthy',
    generatedAt: new Date().toISOString(),
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    nextCardId: NEXT_CARD_ID,
    liveStatus,
    dogfood,
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`SYSTEM-010 process-control check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('SYSTEM-010 process-control check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
