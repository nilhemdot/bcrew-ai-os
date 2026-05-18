#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  validateBuildLaneCardScaffold,
  validateBuildLaneSprintItemMetadata,
} from '../lib/build-lane-reliability.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
import {
  AGENT_CAPABILITY_REGISTRY_APPROVAL_PATH as APPROVAL_PATH,
  AGENT_CAPABILITY_REGISTRY_CARD_ID as CARD_ID,
  AGENT_CAPABILITY_REGISTRY_CHANGED_FILES as CHANGED_FILES,
  AGENT_CAPABILITY_REGISTRY_CLOSEOUT_KEY as CLOSEOUT_KEY,
  AGENT_CAPABILITY_REGISTRY_CLOSEOUT_PATH as CLOSEOUT_PATH,
  AGENT_CAPABILITY_REGISTRY_NOT_NEXT_BOUNDARIES as NOT_NEXT,
  AGENT_CAPABILITY_REGISTRY_PLAN_PATH as PLAN_PATH,
  AGENT_CAPABILITY_REGISTRY_PROOF_COMMANDS as PROOF_COMMANDS,
  AGENT_CAPABILITY_REGISTRY_SCRIPT_PATH as SCRIPT_PATH,
  AGENT_CAPABILITY_REGISTRY_SPRINT_ID as SPRINT_ID,
  buildAgentCapabilityRegistry,
  buildAgentCapabilityRegistryDogfoodProof,
  evaluateAgentCapabilityRegistry,
} from '../lib/agent-capability-registry.js'
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
const NEXT_CARD_ID = 'AGENT-TEMPLATE-RUNTIME-CONTRACT-001'
const PREREQ_CARD_IDS = [
  'FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001',
  'AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001',
  'AGENT-STATUS-FRESHNESS-GATE-001',
]

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

async function repoFileExists(relativePath) {
  try {
    return (await fs.stat(path.join(repoRoot, relativePath))).isFile()
  } catch {
    return false
  }
}

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: CARD_ID,
    title: 'Build agent capability and permission registry',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P0',
    rank: 3,
    source: 'Steve 2026-05-18 agent usefulness priority after live-answer preflight shipped.',
    summary: 'Create a Foundation-owned read-only registry for agent capabilities, tools, sources, model route, logging, and approval boundaries.',
    whyItMatters: 'Agents should not claim they can read, write, send, mutate, call models, or run extraction unless Foundation has declared the capability and fail-closed boundary.',
    nextAction: closeCard
      ? `Done under ${CLOSEOUT_KEY}. Continue ${NEXT_CARD_ID} unless repo truth surfaces a higher P0 repair.`
      : 'Ship the read-only capability registry contract/proof only; no runtime launch, live extraction, model call, or external write.',
    statusNote: closeCard
      ? `Closed under ${CLOSEOUT_KEY}; missing capability fields and unapproved side-effect claims fail closed.`
      : `Executing ${CLOSEOUT_KEY}; read-only registry contract/proof only.`,
    owner: 'Foundation Agent Runtime',
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/foundation-agent-usefulness-runtime-gates.js',
      'lib/agent-live-answer-preflight-gate.js',
      'lib/agent-status-freshness-gate.js',
      'lib/source-contracts.js SYS-AGENTS-001',
    ],
    existingDocs: [
      'docs/rebuild/agent-architecture.md',
      'docs/agents/personal-agent-onboarding.md',
      'docs/process/agent-live-answer-preflight-gate-001-plan.md',
    ],
    existingScripts: [
      'scripts/process-agent-live-answer-preflight-gate-check.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: [
      'Agents need fresh source proof before sounding current.',
      'Agents need declared capability evidence before claiming they can act.',
      'External writes, model calls, live extraction, paid/auth jobs, and hidden workers are approval-bound.',
    ],
    reused: [
      'Agent usefulness runtime gate bundle.',
      'Live-answer preflight gate.',
      'Status freshness gate.',
      'Build-lane scaffold, Plan Critic, Current Sprint, closeout registry, and Foundation ship gates.',
    ],
    notRebuilt: [
      'No Harlan UI.',
      'No live runtime launch.',
      'No reusable template implementation.',
      'No extraction/model/external-write side effects.',
    ],
    exactGap: 'Capability truth is still implicit. This card makes the registry contract executable and fail-closed.',
    overBroadRisk: 'This can drift into enabling writes or launching agents; V1 stays a read-only registry proof.',
    readyBy: 'Steve',
    readyAt: '2026-05-18T19:45:00-04:00',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  return {
    cardId: CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
    planRef: PLAN_PATH,
    definitionOfDone: 'A read-only capability registry declares agent identity, tools, source refs, read/write posture, model route, logging, and approval boundaries; missing fields, claim-only capabilities, unknown claims, unapproved side effects, and runtime side effects fail closed; full ship gate passes.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: 'AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001 shipped and made this the next child card.',
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: APPROVAL_PATH,
      closeoutKey: CLOSEOUT_KEY,
    },
  }
}

function buildNextSprintItem() {
  return {
    cardId: NEXT_CARD_ID,
    order: 2,
    stage: 'scoping',
    planRef: null,
    definitionOfDone: 'A reusable agent runtime template rejects agents missing identity, owner, role, source access, memory scope, tool permissions, approval posture, live-answer preflight, logging, action routing, failure visibility, and decommission path.',
    proofCommands: [
      'scope-first: create plan/approval/focused proof before implementation',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    readinessBlockerCleared: `${CARD_ID} closed capability registry.`,
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      inheritedFrom: CARD_ID,
      nextAfterCloseoutKey: CLOSEOUT_KEY,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, stage = 'building_now', planReview } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const row = buildCardRow({ closeCard, stage })
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-agent-capability-registry')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `agent-capability-registry-${stableRunId(PLAN_PATH)}`,
        CARD_ID,
        PLAN_PATH,
        planReview.status,
        Number(planReview.score),
        CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: CARD_ID }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-agent-capability-registry',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} ${CARD_ID}.`,
        JSON.stringify({ closeoutKey: CLOSEOUT_KEY, stage }),
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

async function ensureLiveState({ closeCard = false, stage = 'building_now', planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'create/update agent capability registry card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage, planReview })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'Make agent capability claims fail closed unless Foundation has declared the capability and approval boundary.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
          startedBy: 'codex-agent-capability-registry',
          currentStatus: closeCard ? 'next_scoping' : normalizeStage(stage),
          closeoutKey: CLOSEOUT_KEY,
          nextAction: closeCard ? `Commit/push, then continue ${NEXT_CARD_ID}.` : 'Ship read-only capability registry contract/proof only.',
          priorityOrder: [CARD_ID, NEXT_CARD_ID],
          notNext: NOT_NEXT,
          exitCriteria: [
            'Declared read-only capability claims pass.',
            'Missing tools/source refs/model route/logging/approval boundary and unapproved side-effect claims fail closed.',
            'foundation:verify and process:foundation-ship pass.',
          ],
        },
      },
      items: closeCard ? [buildSprintItem({ closeCard, stage }), buildNextSprintItem()] : [buildSprintItem({ closeCard, stage })],
    },
    'codex-agent-capability-registry',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'Steve prioritized the agent runtime gate queue and capability registry is next after live-answer preflight.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  const planSource = await readRepoFile(PLAN_PATH)
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard, stage: args.stage }),
    changedFiles: CHANGED_FILES,
    declaredRisk: 'Foundation agent capability and permission registry',
    repoRoot,
  })
  const writeRequested = args.apply || args.closeCard || isProcessCheckWriteRequested({
    argv: process.argv.slice(2),
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  if (writeRequested) await ensureLiveState({ closeCard: args.closeCard, stage: args.stage, planReview })

  const [
    approval,
    packageJson,
    moduleSource,
    scriptSource,
    runtimeVerifierSource,
    coverageSource,
    closeoutRecordsSource,
    closeoutDoc,
    currentPlan,
    currentState,
    cards,
    sprint,
    planCriticRuns,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile('package.json').then(JSON.parse),
    readRepoFile('lib/agent-capability-registry.js'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/foundation-runtime-reliability-verifier.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-agent-runtime-records.js'),
    readRepoFile(CLOSEOUT_PATH, { optional: true }),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID, ...PREREQ_CARD_IDS]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])
  await closeFoundationDb()

  const card = cards.find(item => item.id === CARD_ID) || null
  const nextCard = cards.find(item => item.id === NEXT_CARD_ID) || null
  const prereqCards = PREREQ_CARD_IDS.map(cardId => cards.find(item => item.id === cardId) || null)
  const sprintItem = (sprint.items || []).find(item => item.cardId === CARD_ID) || null
  const closeouts = getFoundationBuildCloseouts()
  const closeout = closeouts.find(record => record.key === CLOSEOUT_KEY) || null
  const currentSprintStatus = buildFoundationCurrentSprintStatus({ sprint: sprint.sprint, items: sprint.items, backlogItems: cards, closeouts, planCriticRuns })
  const scaffold = validateBuildLaneCardScaffold(card || {})
  const sprintMetadata = validateBuildLaneSprintItemMetadata(sprintItem || {})
  const registryStatus = evaluateAgentCapabilityRegistry(buildAgentCapabilityRegistry())
  const dogfood = buildAgentCapabilityRegistryDogfoodProof()
  const forbiddenRuntimeTokens = [
    ['spawn', '('].join(''),
    ['exec', 'File('].join(''),
    ['run', 'LiveExtraction'].join(''),
    ['agent-feedback', ':auto-send'].join(''),
  ]

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(failure => failure.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', buildPlanCriticResultSummary(planReview))
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, card?.priority === 'P0' && ['executing', 'done'].includes(card?.lane), 'live backlog card exists and is staged', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, scaffold.ok, 'live backlog card passes scaffold guard', scaffold.missing.join(', ') || 'complete')
  addCheck(checks, sprint.sprint?.sprintId === SPRINT_ID, 'Current Sprint overlay is active for this card', sprint.sprint?.sprintId || 'missing')
  addCheck(checks, sprintMetadata.ok, 'Current Sprint item metadata is complete', sprintMetadata.missing.join(', ') || 'complete')
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint status is healthy', currentSprintStatus.findings?.map(item => item.detail || item.check).join('; ') || 'healthy')
  addCheck(checks, prereqCards.every(item => item?.lane === 'done'), 'agent gate prerequisites are done', prereqCards.map(item => `${item?.id || 'missing'}:${item?.lane || 'missing'}`).join(', '))
  addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane) && nextCard.priority === 'P0', 'next runtime template card remains live', nextCard ? `${nextCard.lane}/${nextCard.priority}` : 'missing')
  addCheck(checks, registryStatus.ok && registryStatus.summary.capabilityCount >= 2, 'healthy capability registry fixture passes', registryStatus.status)
  addCheck(checks, dogfood.ok, 'dogfood rejects missing or unsafe capability claims', dogfood.invariant)
  addCheck(checks, dogfood.missingToolsRejected && dogfood.missingSourceRefsRejected && dogfood.missingModelRouteRejected && dogfood.missingLoggingRejected, 'dogfood covers required registry fields', JSON.stringify({ tools: dogfood.missingToolsRejected, sources: dogfood.missingSourceRefsRejected, model: dogfood.missingModelRouteRejected, logging: dogfood.missingLoggingRejected }))
  addCheck(checks, dogfood.claimOnlyCapabilityRejected && dogfood.undeclaredCapabilityClaimRejected && dogfood.unapprovedWriteClaimRejected && dogfood.liveSideEffectAttemptRejected, 'dogfood covers claim-only, unknown claim, side effect, and runtime launch failures', JSON.stringify({ claimOnly: dogfood.claimOnlyCapabilityRejected, unknown: dogfood.undeclaredCapabilityClaimRejected, write: dogfood.unapprovedWriteClaimRejected, runtime: dogfood.liveSideEffectAttemptRejected }))
  addCheck(checks, packageJson.scripts?.['process:agent-capability-registry-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:agent-capability-registry-check'] || 'missing')
  addCheck(checks, moduleSource.includes('buildAgentCapabilityRegistryDogfoodProof') && moduleSource.includes('writePosture'), 'module owns registry behavior proof', 'lib/agent-capability-registry.js')
  addCheck(checks, runtimeVerifierSource.includes(CARD_ID) && runtimeVerifierSource.includes('buildAgentCapabilityRegistryDogfoodProof'), 'runtime reliability verifier covers the capability registry', 'lib/foundation-runtime-reliability-verifier.js')
  addCheck(checks, coverageSource.includes('AGENT_CAPABILITY_REGISTRY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE') && coverageSource.includes(CARD_ID), 'verifier coverage IDs include this card', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'closeout registry record is registered', closeout?.key || 'missing')
  addCheck(checks, closeoutRecordsSource.includes(CLOSEOUT_KEY) && closeoutRecordsSource.includes(CARD_ID), 'closeout registry source contains card and key', CLOSEOUT_KEY)
  addCheck(checks, await repoFileExists(CLOSEOUT_PATH), 'closeout handoff exists', CLOSEOUT_PATH)
  addCheck(checks, closeoutDoc.includes('This does not build Harlan UI') && closeoutDoc.includes('capability registry'), 'closeout documents feature boundary and registry proof', CLOSEOUT_PATH)
  addCheck(checks, currentPlan.includes(CLOSEOUT_KEY) && currentState.includes(CLOSEOUT_KEY), 'current plan/state mention closeout key', CLOSEOUT_KEY)
  addCheck(checks, !forbiddenRuntimeTokens.some(token => scriptSource.includes(token)), 'focused proof does not launch runtime side effects', SCRIPT_PATH)
  addCheck(checks, moduleSource.split('\n').length < 1500, 'new module is under preferred module budget', `${moduleSource.split('\n').length} lines`)
  addCheck(checks, scriptSource.split('\n').length < 1500, 'focused proof script is under preferred module budget', `${scriptSource.split('\n').length} lines`)

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'fail' : 'pass',
    cardId: CARD_ID,
    sprintId: sprint.sprint?.sprintId || null,
    closeoutKey: CLOSEOUT_KEY,
    checkCount: checks.length,
    failedCount: failed.length,
    registryStatus: registryStatus.status,
    dogfoodOk: dogfood.ok,
    checks,
    failed,
  }

  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`${CARD_ID} check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  }

  if (failed.length) process.exitCode = 1
}

main().catch(async error => {
  try {
    await closeFoundationDb()
  } catch {}
  console.error(error?.stack || error?.message || String(error))
  process.exitCode = 1
})
