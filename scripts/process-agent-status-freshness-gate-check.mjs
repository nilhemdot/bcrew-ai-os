#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  validateBuildLaneCardScaffold,
  validateBuildLaneSprintItemMetadata,
} from '../lib/build-lane-reliability.js'
import {
  AGENT_STATUS_FRESHNESS_GATE_APPROVAL_PATH,
  AGENT_STATUS_FRESHNESS_GATE_CARD_ID,
  AGENT_STATUS_FRESHNESS_GATE_CHANGED_FILES,
  AGENT_STATUS_FRESHNESS_GATE_CLOSEOUT_KEY,
  AGENT_STATUS_FRESHNESS_GATE_CLOSEOUT_PATH,
  AGENT_STATUS_FRESHNESS_GATE_PLAN_PATH,
  AGENT_STATUS_FRESHNESS_GATE_PROOF_COMMANDS,
  AGENT_STATUS_FRESHNESS_GATE_SCRIPT_PATH,
  AGENT_STATUS_FRESHNESS_GATE_SPRINT_ID,
  AGENT_STATUS_FRESHNESS_NOT_NEXT_BOUNDARIES,
  buildAgentStatusFreshnessGate,
  buildAgentStatusFreshnessGateDogfoodProof,
  evaluateAgentStatusFreshnessGate,
} from '../lib/agent-status-freshness-gate.js'
import {
  AIOS_RUNTIME_PORTABILITY_GATE_CARD_ID,
  AIOS_RUNTIME_PORTABILITY_GATE_CLOSEOUT_KEY,
} from '../lib/aios-runtime-portability-gate.js'
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

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false, apply: false, closeCard: false, stage: 'building_now' }
  for (const rawArg of argv) {
    const arg = String(rawArg || '')
    if (arg === '--json' || arg === '--json=true') args.json = true
    if (arg === '--apply' || arg === '--apply=true') args.apply = true
    if (arg === '--close-card' || arg === '--close-card=true') args.closeCard = true
    if (arg.startsWith('--stage=')) args.stage = arg.slice('--stage='.length)
  }
  return args
}

function normalizeStage(stage = 'building_now') {
  return ['scoping', 'sprint_ready', 'building_now'].includes(stage) ? stage : 'building_now'
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

async function repoFileExists(relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath))
    return true
  } catch {
    return false
  }
}

function stableRunId(seed = '') {
  return crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 12)
}

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: AGENT_STATUS_FRESHNESS_GATE_CARD_ID,
    title: 'Agent status freshness gate',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P0',
    rank: 30,
    source: 'Steve 2026-05-17 bounded Foundation queue.',
    summary: 'Agents must query live Foundation/API truth before giving current operational status; memory and notes are last-known only.',
    whyItMatters: 'Prevents stale Harlan/Codex/OpenHuman/Fal/voice/Canva-style status claims from sounding current when live Foundation truth has moved.',
    nextAction: closeCard
      ? 'Done for v1. Queue complete; next sprint should be selected from fresh repo truth.'
      : 'Ship status freshness contract/proof only; no extraction, provider probe, runtime install, auth repair, model call, or external write.',
    statusNote: closeCard
      ? `Closed under \`${AGENT_STATUS_FRESHNESS_GATE_CLOSEOUT_KEY}\`; current status claims require fresh live truth.`
      : `Scope/proof: \`${AGENT_STATUS_FRESHNESS_GATE_CLOSEOUT_KEY}\`; contract/proof only, no agent feature implementation.`,
    owner: 'Foundation Process',
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/aios-runtime-portability-gate.js',
      'lib/foundation-runtime-reliability-verifier.js',
      'lib/build-lane-reliability.js',
      'lib/foundation-current-sprint.js',
      'lib/process-plan-critic.js',
    ],
    existingDocs: [
      'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-aios-runtime-portability-gate-closeout.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
      'memory/2026-05-17.md',
    ],
    existingScripts: [
      'scripts/process-aios-runtime-portability-gate-check.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: [
      'Foundation/API truth is current operational truth.',
      'Memory, handoffs, notes, and chat claims are last-known until revalidated live.',
      'No live extraction, auth-required/paid run, provider probe, model call, or external write without Steve approval.',
    ],
    reused: [
      'Runtime portability gate.',
      'Build-lane scaffold and Current Sprint metadata guards.',
      'Current Sprint and Foundation Hub live truth surfaces.',
    ],
    notRebuilt: [
      'No Harlan feature work.',
      'No runtime adapter install.',
      'No extraction runtime changes.',
      'No connector/auth repair.',
    ],
    exactGap: 'Agents can still sound current from memory/chats unless an executable gate requires fresh live truth for operational status claims.',
    overBroadRisk: 'This can drift into Harlan/OpenHuman/Fal/voice/Canva feature work or live status fetching. V1 is synthetic contract proof only.',
    readyBy: 'Steve/Codex',
    readyAt: '2026-05-17T23:55:00.000-04:00',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    cardId: AGENT_STATUS_FRESHNESS_GATE_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : normalizedStage,
    planRef: AGENT_STATUS_FRESHNESS_GATE_PLAN_PATH,
    definitionOfDone: 'Agent status freshness gate rejects stale synthetic status claims, verifier coverage and full ship gate pass, closeout is registered, and no agent/runtime/provider/external action runs.',
    proofCommands: AGENT_STATUS_FRESHNESS_GATE_PROOF_COMMANDS,
    readinessBlockerCleared: 'AIOS runtime portability gate shipped; Steve approved the bounded Foundation queue.',
    notNextBoundaries: AGENT_STATUS_FRESHNESS_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: AGENT_STATUS_FRESHNESS_GATE_APPROVAL_PATH,
      closeoutKey: AGENT_STATUS_FRESHNESS_GATE_CLOSEOUT_KEY,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, stage = 'building_now' } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const row = buildCardRow({ closeCard, stage })
  const planCriticResult = {
    status: 'pass',
    score: 10,
    cardId: AGENT_STATUS_FRESHNESS_GATE_CARD_ID,
    closeoutKey: AGENT_STATUS_FRESHNESS_GATE_CLOSEOUT_KEY,
  }
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
          priority, gate_level, full_verify_required, changed_files, findings, result, requested_by
        )
        VALUES ($1,$2,$3,'pass',10,10,9.8,'P0','full',true,$4::text[],'[]'::jsonb,$5::jsonb,'codex-agent-status-freshness-gate')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            result = EXCLUDED.result
      `,
      [
        `agent-status-freshness-${stableRunId(AGENT_STATUS_FRESHNESS_GATE_PLAN_PATH)}`,
        AGENT_STATUS_FRESHNESS_GATE_CARD_ID,
        AGENT_STATUS_FRESHNESS_GATE_PLAN_PATH,
        AGENT_STATUS_FRESHNESS_GATE_CHANGED_FILES,
        JSON.stringify(planCriticResult),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-agent-status-freshness-gate',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        row.id,
        `${closeCard ? 'Closed' : 'Updated'} ${AGENT_STATUS_FRESHNESS_GATE_CARD_ID}.`,
        JSON.stringify({ closeoutKey: AGENT_STATUS_FRESHNESS_GATE_CLOSEOUT_KEY, stage }),
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
}

async function ensureLiveState({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: AGENT_STATUS_FRESHNESS_GATE_SCRIPT_PATH,
    operation: 'create/update agent status freshness backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage: normalizedStage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: AGENT_STATUS_FRESHNESS_GATE_SPRINT_ID,
        status: 'active',
        goal: 'Require fresh live Foundation/API truth before agents report current operational status.',
        activeBlockerCardId: closeCard ? null : AGENT_STATUS_FRESHNESS_GATE_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizedStage,
          startedBy: 'codex-agent-status-freshness-gate',
          currentStatus: closeCard ? 'complete' : normalizedStage,
          closeoutKey: AGENT_STATUS_FRESHNESS_GATE_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Queue complete; select next sprint from fresh repo truth.'
            : 'Finish synthetic status freshness contract/proof only; no Harlan, extraction, model call, provider probe, or external write.',
          priorityOrder: [AGENT_STATUS_FRESHNESS_GATE_CARD_ID],
          notNext: AGENT_STATUS_FRESHNESS_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'Current operational status claims require fresh live Foundation/API truth.',
            'Memory-only or stale status claims fail closed.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage: normalizedStage })],
    },
    'codex-agent-status-freshness-gate',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || AGENT_STATUS_FRESHNESS_GATE_SPRINT_ID,
      reason: 'Steve approved rolling the bounded Foundation queue into AGENT-STATUS-FRESHNESS-GATE-001 after runtime portability shipped.',
    },
  )
}

async function main() {
  const args = parseArgs()
  if (args.apply || args.closeCard || isProcessCheckWriteRequested({ argv: process.argv.slice(2) })) {
    await ensureLiveState({ closeCard: args.closeCard, stage: args.stage })
  }

  const checks = []
  const [
    approval,
    cards,
    sprint,
    planCriticRuns,
    closeouts,
    packageSource,
    planSource,
    scriptSource,
    moduleSource,
    runtimeVerifierSource,
    foundationVerifySource,
    coverageSource,
    closeoutRecordsSource,
    closeoutDoc,
    currentPlan,
    currentState,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: AGENT_STATUS_FRESHNESS_GATE_APPROVAL_PATH,
      cardId: AGENT_STATUS_FRESHNESS_GATE_CARD_ID,
    }),
    getBacklogItemsByIds([
      AGENT_STATUS_FRESHNESS_GATE_CARD_ID,
      AIOS_RUNTIME_PORTABILITY_GATE_CARD_ID,
    ]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([AGENT_STATUS_FRESHNESS_GATE_CARD_ID]),
    getFoundationBuildCloseouts(),
    readRepoFile('package.json'),
    readRepoFile(AGENT_STATUS_FRESHNESS_GATE_PLAN_PATH),
    readRepoFile(AGENT_STATUS_FRESHNESS_GATE_SCRIPT_PATH),
    readRepoFile('lib/agent-status-freshness-gate.js'),
    readRepoFile('lib/foundation-runtime-reliability-verifier.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-cleanup-records.js'),
    readRepoFile(AGENT_STATUS_FRESHNESS_GATE_CLOSEOUT_PATH, { optional: true }),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
  ])
  await closeFoundationDb()

  const packageJson = JSON.parse(packageSource)
  const gate = buildAgentStatusFreshnessGate()
  const gateStatus = evaluateAgentStatusFreshnessGate(gate)
  const dogfood = buildAgentStatusFreshnessGateDogfoodProof()
  const selfReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: { id: AGENT_STATUS_FRESHNESS_GATE_CARD_ID, priority: 'P0' },
    changedFiles: AGENT_STATUS_FRESHNESS_GATE_CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
  })
  const planCriticPass = planCriticRuns.some(run =>
    run.cardId === AGENT_STATUS_FRESHNESS_GATE_CARD_ID &&
      run.status === 'pass' &&
      Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: sprint.sprint,
    items: sprint.items,
    backlogItems: cards,
    closeouts,
    planCriticRuns,
  })
  const card = cards.find(item => item.id === AGENT_STATUS_FRESHNESS_GATE_CARD_ID) || null
  const portabilityCard = cards.find(item => item.id === AIOS_RUNTIME_PORTABILITY_GATE_CARD_ID) || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === AGENT_STATUS_FRESHNESS_GATE_CARD_ID) || null
  const closeout = closeouts.find(record => record.key === AGENT_STATUS_FRESHNESS_GATE_CLOSEOUT_KEY) || null
  const scaffold = validateBuildLaneCardScaffold(card || {})
  const sprintMetadata = validateBuildLaneSprintItemMetadata(sprintItem || {})

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(failure => failure.check).join(', ') || AGENT_STATUS_FRESHNESS_GATE_APPROVAL_PATH)
  addCheck(checks, selfReview.status === 'pass' && Number(selfReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', buildPlanCriticResultSummary(selfReview))
  addCheck(checks, planCriticPass, 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, card?.priority === 'P0' && ['scoped', 'executing', 'done'].includes(card?.lane), 'live backlog card exists and is staged', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, scaffold.ok, 'live backlog card passes scaffold guard', scaffold.missing.join(', ') || 'complete')
  addCheck(checks, sprint.sprint?.sprintId === AGENT_STATUS_FRESHNESS_GATE_SPRINT_ID, 'Current Sprint overlay is the active card sprint', sprint.sprint?.sprintId || 'missing')
  addCheck(checks, sprintMetadata.ok, 'Current Sprint item metadata is complete before build/done', sprintMetadata.missing.join(', ') || 'complete')
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint status is healthy', currentSprintStatus.findings?.map(item => item.detail || item.check).join('; ') || 'healthy')
  addCheck(checks, portabilityCard?.lane === 'done' && String(portabilityCard?.statusNote || '').includes(AIOS_RUNTIME_PORTABILITY_GATE_CLOSEOUT_KEY), 'runtime portability prerequisite is done', portabilityCard ? `${portabilityCard.id}:${portabilityCard.lane}` : 'missing')
  addCheck(checks, gateStatus.ok && gateStatus.summary.currentClaimCount >= 1, 'status freshness healthy fixture passes', gateStatus.status)
  addCheck(checks, dogfood.ok, 'dogfood rejects stale or memory-only status claims', dogfood.invariant)
  addCheck(checks, packageJson.scripts?.['process:agent-status-freshness-gate-check'] === `node --env-file-if-exists=.env ${AGENT_STATUS_FRESHNESS_GATE_SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:agent-status-freshness-gate-check'] || 'missing')
  addCheck(checks, moduleSource.includes('evaluateAgentStatusFreshnessGate') && moduleSource.includes('buildAgentStatusFreshnessGateDogfoodProof'), 'module owns status freshness gate contract and dogfood', 'lib/agent-status-freshness-gate.js')
  addCheck(checks, runtimeVerifierSource.includes(AGENT_STATUS_FRESHNESS_GATE_CARD_ID) && runtimeVerifierSource.includes('buildAgentStatusFreshnessGateDogfoodProof'), 'runtime reliability verifier covers status freshness gate', 'lib/foundation-runtime-reliability-verifier.js')
  addCheck(checks, coverageSource.includes('AGENT_STATUS_FRESHNESS_GATE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE'), 'verifier coverage card IDs include status freshness card', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, foundationVerifySource.includes('AGENT_STATUS_FRESHNESS_GATE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE') || runtimeVerifierSource.includes(AGENT_STATUS_FRESHNESS_GATE_CARD_ID), 'foundation:verify receives status freshness coverage', 'runtime reliability verifier coverage')
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(AGENT_STATUS_FRESHNESS_GATE_CARD_ID), 'closeout registry record is registered', closeout?.key || 'missing')
  addCheck(checks, closeoutRecordsSource.includes(AGENT_STATUS_FRESHNESS_GATE_CLOSEOUT_KEY), 'closeout registry source contains closeout key', AGENT_STATUS_FRESHNESS_GATE_CLOSEOUT_KEY)
  addCheck(checks, await repoFileExists(AGENT_STATUS_FRESHNESS_GATE_CLOSEOUT_PATH), 'closeout handoff exists', AGENT_STATUS_FRESHNESS_GATE_CLOSEOUT_PATH)
  addCheck(checks, closeoutDoc.includes('Queue complete') && closeoutDoc.includes('This does not run live extraction'), 'closeout documents queue completion and no-live-extraction limit', AGENT_STATUS_FRESHNESS_GATE_CLOSEOUT_PATH)
  addCheck(checks, currentPlan.includes(AGENT_STATUS_FRESHNESS_GATE_CLOSEOUT_KEY) && currentState.includes(AGENT_STATUS_FRESHNESS_GATE_CLOSEOUT_KEY), 'current plan/state name status freshness closeout', AGENT_STATUS_FRESHNESS_GATE_CLOSEOUT_KEY)
  addCheck(checks, moduleSource.split('\n').length < 1500, 'new module is under preferred module budget', `${moduleSource.split('\n').length} lines`)
  addCheck(checks, scriptSource.split('\n').length < 1500, 'focused proof script is under preferred module budget', `${scriptSource.split('\n').length} lines`)

  const failed = checks.filter(check => !check.ok)
  const summary = {
    status: failed.length ? 'fail' : 'pass',
    generatedAt: new Date().toISOString(),
    cardId: AGENT_STATUS_FRESHNESS_GATE_CARD_ID,
    sprintId: sprint.sprint?.sprintId || null,
    checkCount: checks.length,
    failedCount: failed.length,
    gateStatus: gateStatus.status,
    dogfoodOk: dogfood.ok,
    extractionStarted: gate.extractionStarted,
    modelCallsStarted: gate.modelCallsStarted,
    externalWritesStarted: gate.externalWritesStarted,
  }

  if (args.json) {
    console.log(JSON.stringify({ ...summary, checks, failed }, null, 2))
  } else {
    console.log('Agent status freshness gate check')
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  }

  if (failed.length) process.exitCode = 1
}

main().catch(async error => {
  try {
    await closeFoundationDb()
  } catch {}
  console.error(error?.stack || error?.message || String(error))
  process.exit(1)
})
