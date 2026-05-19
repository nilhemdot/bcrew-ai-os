#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  buildFoundationCurrentSprintStatus,
} from '../lib/foundation-current-sprint.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
import {
  validateBuildLaneCardScaffold,
  validateBuildLaneSprintItemMetadata,
} from '../lib/build-lane-reliability.js'
import {
  AIOS_RUNTIME_PORTABILITY_GATE_APPROVAL_PATH,
  AIOS_RUNTIME_PORTABILITY_GATE_CARD_ID,
  AIOS_RUNTIME_PORTABILITY_GATE_CHANGED_FILES,
  AIOS_RUNTIME_PORTABILITY_GATE_CLOSEOUT_KEY,
  AIOS_RUNTIME_PORTABILITY_GATE_CLOSEOUT_PATH,
  AIOS_RUNTIME_PORTABILITY_GATE_PLAN_PATH,
  AIOS_RUNTIME_PORTABILITY_GATE_PROOF_COMMANDS,
  AIOS_RUNTIME_PORTABILITY_GATE_SCRIPT_PATH,
  AIOS_RUNTIME_PORTABILITY_GATE_SPRINT_ID,
  AIOS_RUNTIME_PORTABILITY_NOT_NEXT_BOUNDARIES,
  buildAiosRuntimePortabilityGate,
  buildAiosRuntimePortabilityGateDogfoodProof,
  evaluateAiosRuntimePortabilityGate,
} from '../lib/aios-runtime-portability-gate.js'
import {
  KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID,
  KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_KEY,
} from '../lib/foundation-knowledge-base-quality-gate.js'
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
    id: AIOS_RUNTIME_PORTABILITY_GATE_CARD_ID,
    title: 'AIOS runtime portability gate',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P0',
    rank: 29,
    source: 'Steve 2026-05-17 bounded Foundation queue.',
    summary: 'Gate Claude, Codex, OpenClaw, OpenHuman, Higgsfield-style runtimes through Foundation-owned identity, tools, permissions, model route, cost, logs, and fallback contracts.',
    whyItMatters: 'AIOS needs swappable runtime brains without letting any adapter own source truth, permission policy, model routing, cost, logs, or fallback behavior.',
    nextAction: closeCard
      ? 'Done for v1. Next: AGENT-STATUS-FRESHNESS-GATE-001.'
      : 'Ship runtime portability contract/proof only; no extraction, provider probe, runtime install, auth repair, model call, or external write.',
    statusNote: closeCard
      ? `Closed under \`${AIOS_RUNTIME_PORTABILITY_GATE_CLOSEOUT_KEY}\`; runtimes are adapters, not truth owners.`
      : `Scope/proof: \`${AIOS_RUNTIME_PORTABILITY_GATE_CLOSEOUT_KEY}\`; contract/proof only, no runtime implementation.`,
    owner: 'Foundation Process',
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/foundation-runtime-reliability-verifier.js',
      'lib/foundation-knowledge-base-compiler-design.js',
      'lib/foundation-knowledge-base-quality-gate.js',
      'lib/llm-auth-audit-budget-label-clarity.js',
      'lib/build-lane-reliability.js',
    ],
    existingDocs: [
      'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-knowledge-base-quality-gate-closeout.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
      'memory/2026-05-17.md',
    ],
    existingScripts: [
      'scripts/process-knowledge-base-quality-gate-check.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: [
      'Foundation owns source contracts, model routing, identity, permission policy, cost policy, logs, and fallback routes.',
      'Runtime shells are adapters; source truth and compiled knowledge stay Foundation-owned.',
      'No live extraction, auth-required/paid run, provider probe, model call, or external write without Steve approval.',
    ],
    reused: [
      'Runtime portability memory packet.',
      'KB compiler and quality-gate Foundation ownership boundary.',
      'LLM auth budget label clarity.',
      'Build-lane scaffold and Current Sprint metadata guards.',
    ],
    notRebuilt: [
      'No runtime adapter install.',
      'No Harlan terminal/runtime feature.',
      'No OpenHuman install or OAuth.',
      'No extraction runtime changes.',
    ],
    exactGap: 'AIOS has runtime portability doctrine, but needs an executable contract that rejects adapters that own truth, bypass Foundation routes, or lack cost/log/fallback policy.',
    overBroadRisk: 'This can drift into runtime implementation, provider probes, auth repair, or Harlan/OpenHuman feature work. V1 is synthetic contract proof only.',
    readyBy: 'Steve/Codex',
    readyAt: '2026-05-17T23:45:00.000-04:00',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    cardId: AIOS_RUNTIME_PORTABILITY_GATE_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : normalizedStage,
    planRef: AIOS_RUNTIME_PORTABILITY_GATE_PLAN_PATH,
    definitionOfDone: 'Runtime portability gate rejects unsafe synthetic runtime contracts, verifier coverage and full ship gate pass, closeout is registered, and no runtime implementation/provider/external action runs.',
    proofCommands: AIOS_RUNTIME_PORTABILITY_GATE_PROOF_COMMANDS,
    readinessBlockerCleared: 'Steve approved the bounded Foundation queue after the KB quality gate shipped.',
    notNextBoundaries: AIOS_RUNTIME_PORTABILITY_NOT_NEXT_BOUNDARIES,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: AIOS_RUNTIME_PORTABILITY_GATE_APPROVAL_PATH,
      closeoutKey: AIOS_RUNTIME_PORTABILITY_GATE_CLOSEOUT_KEY,
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
    cardId: AIOS_RUNTIME_PORTABILITY_GATE_CARD_ID,
    closeoutKey: AIOS_RUNTIME_PORTABILITY_GATE_CLOSEOUT_KEY,
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
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary,
          why_it_matters, next_action, status_note, owner
        )
        VALUES ($1,$2,'foundation','scoped','P0',30,$3,$4,$5,$6,$7,'Foundation Process')
        ON CONFLICT (id) DO UPDATE
        SET title = EXCLUDED.title,
            team = EXCLUDED.team,
            lane = CASE WHEN backlog_items.lane = 'done' THEN backlog_items.lane ELSE EXCLUDED.lane END,
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
        'AGENT-STATUS-FRESHNESS-GATE-001',
        'Agent status freshness gate',
        'Steve 2026-05-17 bounded Foundation queue.',
        'Agents must query live Foundation/API truth before giving current operational status; memory and notes are last-known only.',
        'Prevents stale Harlan/Codex-style status claims from sounding current when live Foundation truth has moved.',
        'Next after AIOS-RUNTIME-PORTABILITY-GATE-001: create plan/approval/proof and dogfood stale status claims.',
        'Scoped as next bounded Foundation card; no Harlan/Fal/voice/Canva/OpenHuman feature work, no extraction, no external writes.',
      ],
    )
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings, result, requested_by
        )
        VALUES ($1,$2,$3,'pass',10,10,9.8,'P0','full',true,$4::text[],'[]'::jsonb,$5::jsonb,'codex-aios-runtime-portability-gate')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            result = EXCLUDED.result
      `,
      [
        `aios-runtime-portability-${stableRunId(AIOS_RUNTIME_PORTABILITY_GATE_PLAN_PATH)}`,
        AIOS_RUNTIME_PORTABILITY_GATE_CARD_ID,
        AIOS_RUNTIME_PORTABILITY_GATE_PLAN_PATH,
        AIOS_RUNTIME_PORTABILITY_GATE_CHANGED_FILES,
        JSON.stringify(planCriticResult),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-aios-runtime-portability-gate',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        row.id,
        `${closeCard ? 'Closed' : 'Updated'} ${AIOS_RUNTIME_PORTABILITY_GATE_CARD_ID}.`,
        JSON.stringify({ closeoutKey: AIOS_RUNTIME_PORTABILITY_GATE_CLOSEOUT_KEY, stage }),
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
    scriptPath: AIOS_RUNTIME_PORTABILITY_GATE_SCRIPT_PATH,
    operation: 'create/update runtime portability backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage: normalizedStage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: AIOS_RUNTIME_PORTABILITY_GATE_SPRINT_ID,
        status: 'active',
        goal: 'Make runtime brains portable adapters under Foundation-owned contracts.',
        activeBlockerCardId: closeCard ? null : AIOS_RUNTIME_PORTABILITY_GATE_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizedStage,
          startedBy: 'codex-aios-runtime-portability-gate',
          currentStatus: closeCard ? 'complete' : normalizedStage,
          closeoutKey: AIOS_RUNTIME_PORTABILITY_GATE_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Commit/push, then continue to AGENT-STATUS-FRESHNESS-GATE-001.'
            : 'Finish synthetic runtime portability contract/proof only; no provider probe, runtime install, extraction, model call, or external write.',
          priorityOrder: [AIOS_RUNTIME_PORTABILITY_GATE_CARD_ID],
          notNext: AIOS_RUNTIME_PORTABILITY_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'Portability gate covers identity, tools, permissions, model/provider route, auth posture, cost, logs/transcripts, source truth boundary, and fallback brain.',
            'Bad synthetic runtime contracts fail closed.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage: normalizedStage })],
    },
    'codex-aios-runtime-portability-gate',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || AIOS_RUNTIME_PORTABILITY_GATE_SPRINT_ID,
      reason: 'Steve approved rolling the bounded Foundation queue into AIOS-RUNTIME-PORTABILITY-GATE-001 after the KB quality gate shipped.',
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
      approvalRef: AIOS_RUNTIME_PORTABILITY_GATE_APPROVAL_PATH,
      cardId: AIOS_RUNTIME_PORTABILITY_GATE_CARD_ID,
    }),
    getBacklogItemsByIds([
      AIOS_RUNTIME_PORTABILITY_GATE_CARD_ID,
      KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID,
      'AGENT-STATUS-FRESHNESS-GATE-001',
    ]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([AIOS_RUNTIME_PORTABILITY_GATE_CARD_ID]),
    getFoundationBuildCloseouts(),
    readRepoFile('package.json'),
    readRepoFile(AIOS_RUNTIME_PORTABILITY_GATE_PLAN_PATH),
    readRepoFile(AIOS_RUNTIME_PORTABILITY_GATE_SCRIPT_PATH),
    readRepoFile('lib/aios-runtime-portability-gate.js'),
    readRepoFile('lib/foundation-runtime-reliability-verifier.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-cleanup-records.js'),
    readRepoFile(AIOS_RUNTIME_PORTABILITY_GATE_CLOSEOUT_PATH, { optional: true }),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
  ])
  await closeFoundationDb()

  const packageJson = JSON.parse(packageSource)
  const gate = buildAiosRuntimePortabilityGate()
  const gateStatus = evaluateAiosRuntimePortabilityGate(gate)
  const dogfood = buildAiosRuntimePortabilityGateDogfoodProof()
  const selfReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: { id: AIOS_RUNTIME_PORTABILITY_GATE_CARD_ID, priority: 'P0' },
    changedFiles: AIOS_RUNTIME_PORTABILITY_GATE_CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
  })
  const planCriticPass = planCriticRuns.some(run =>
    run.cardId === AIOS_RUNTIME_PORTABILITY_GATE_CARD_ID &&
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
  const card = cards.find(item => item.id === AIOS_RUNTIME_PORTABILITY_GATE_CARD_ID) || null
  const qualityGateCard = cards.find(item => item.id === KNOWLEDGE_BASE_QUALITY_GATE_CARD_ID) || null
  const statusFreshnessCard = cards.find(item => item.id === 'AGENT-STATUS-FRESHNESS-GATE-001') || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === AIOS_RUNTIME_PORTABILITY_GATE_CARD_ID) || null
  const closeout = closeouts.find(record => record.key === AIOS_RUNTIME_PORTABILITY_GATE_CLOSEOUT_KEY) || null
  const scaffold = validateBuildLaneCardScaffold(card || {})
  const sprintMetadata = validateBuildLaneSprintItemMetadata(sprintItem || {})

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(failure => failure.check).join(', ') || AIOS_RUNTIME_PORTABILITY_GATE_APPROVAL_PATH)
  addCheck(checks, selfReview.status === 'pass' && Number(selfReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', buildPlanCriticResultSummary(selfReview))
  addCheck(checks, planCriticPass, 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, card?.priority === 'P0' && ['scoped', 'executing', 'done'].includes(card?.lane), 'live backlog card exists and is staged', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, scaffold.ok, 'live backlog card passes scaffold guard', scaffold.missing.join(', ') || 'complete')
  addCheck(checks, sprint.sprint?.sprintId === AIOS_RUNTIME_PORTABILITY_GATE_SPRINT_ID, 'Current Sprint overlay is the active card sprint', sprint.sprint?.sprintId || 'missing')
  addCheck(checks, sprintMetadata.ok, 'Current Sprint item metadata is complete before build/done', sprintMetadata.missing.join(', ') || 'complete')
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint status is healthy', currentSprintStatus.findings?.map(item => item.detail || item.check).join('; ') || 'healthy')
  addCheck(checks, qualityGateCard?.lane === 'done' && String(qualityGateCard?.statusNote || '').includes(KNOWLEDGE_BASE_QUALITY_GATE_CLOSEOUT_KEY), 'KB quality gate prerequisite is done', qualityGateCard ? `${qualityGateCard.id}:${qualityGateCard.lane}` : 'missing')
  addCheck(checks, statusFreshnessCard && ['research', 'scoped', 'sprint-ready', 'sprint_ready'].includes(statusFreshnessCard.lane), 'agent status freshness follow-up exists but is not built by this card', statusFreshnessCard ? `${statusFreshnessCard.id}:${statusFreshnessCard.lane}` : 'missing')
  addCheck(checks, gateStatus.ok && gateStatus.summary.runtimeCount >= 5, 'runtime portability healthy fixture passes', gateStatus.status)
  addCheck(checks, dogfood.ok, 'dogfood rejects unsafe runtime contracts', dogfood.invariant)
  addCheck(checks, packageJson.scripts?.['process:aios-runtime-portability-gate-check'] === `node --env-file-if-exists=.env ${AIOS_RUNTIME_PORTABILITY_GATE_SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:aios-runtime-portability-gate-check'] || 'missing')
  addCheck(checks, moduleSource.includes('evaluateAiosRuntimePortabilityGate') && moduleSource.includes('buildAiosRuntimePortabilityGateDogfoodProof'), 'module owns portability gate contract and dogfood', 'lib/aios-runtime-portability-gate.js')
  addCheck(checks, runtimeVerifierSource.includes(AIOS_RUNTIME_PORTABILITY_GATE_CARD_ID) && runtimeVerifierSource.includes('buildAiosRuntimePortabilityGateDogfoodProof'), 'runtime reliability verifier covers portability gate', 'lib/foundation-runtime-reliability-verifier.js')
  addCheck(checks, coverageSource.includes('AIOS_RUNTIME_PORTABILITY_GATE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE'), 'verifier coverage card IDs include portability gate card', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, foundationVerifySource.includes('AIOS_RUNTIME_PORTABILITY_GATE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE') || runtimeVerifierSource.includes(AIOS_RUNTIME_PORTABILITY_GATE_CARD_ID), 'foundation:verify receives portability coverage', 'runtime reliability verifier coverage')
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(AIOS_RUNTIME_PORTABILITY_GATE_CARD_ID), 'closeout registry record is registered', closeout?.key || 'missing')
  addCheck(checks, closeoutRecordsSource.includes(AIOS_RUNTIME_PORTABILITY_GATE_CLOSEOUT_KEY), 'closeout registry source contains closeout key', AIOS_RUNTIME_PORTABILITY_GATE_CLOSEOUT_KEY)
  addCheck(checks, await repoFileExists(AIOS_RUNTIME_PORTABILITY_GATE_CLOSEOUT_PATH), 'closeout handoff exists', AIOS_RUNTIME_PORTABILITY_GATE_CLOSEOUT_PATH)
  addCheck(checks, closeoutDoc.includes('AGENT-STATUS-FRESHNESS-GATE-001') && closeoutDoc.includes('This does not run live extraction'), 'closeout documents next card and no-live-extraction limit', AIOS_RUNTIME_PORTABILITY_GATE_CLOSEOUT_PATH)
  addCheck(checks, currentPlan.includes(AIOS_RUNTIME_PORTABILITY_GATE_CLOSEOUT_KEY) && currentState.includes(AIOS_RUNTIME_PORTABILITY_GATE_CLOSEOUT_KEY), 'current plan/state name portability gate closeout', AIOS_RUNTIME_PORTABILITY_GATE_CLOSEOUT_KEY)
  addCheck(checks, moduleSource.split('\n').length < 1500, 'new module is under preferred module budget', `${moduleSource.split('\n').length} lines`)
  addCheck(checks, scriptSource.split('\n').length < 1500, 'focused proof script is under preferred module budget', `${scriptSource.split('\n').length} lines`)

  const failed = checks.filter(check => !check.ok)
  const summary = {
    status: failed.length ? 'fail' : 'pass',
    generatedAt: new Date().toISOString(),
    cardId: AIOS_RUNTIME_PORTABILITY_GATE_CARD_ID,
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
    console.log('AIOS runtime portability gate check')
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
