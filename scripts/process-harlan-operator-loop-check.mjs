#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { validateBuildLaneCardScaffold, validateBuildLaneSprintItemMetadata } from '../lib/build-lane-reliability.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
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
  HARLAN_OPERATOR_LOOP_APPROVAL_PATH as APPROVAL_PATH,
  HARLAN_OPERATOR_LOOP_CARD_ID as CARD_ID,
  HARLAN_OPERATOR_LOOP_CHANGED_FILES as CHANGED_FILES,
  HARLAN_OPERATOR_LOOP_CLOSEOUT_KEY as CLOSEOUT_KEY,
  HARLAN_OPERATOR_LOOP_CLOSEOUT_PATH as CLOSEOUT_PATH,
  HARLAN_OPERATOR_LOOP_DOC_PATH as DOC_PATH,
  HARLAN_OPERATOR_LOOP_NEXT_CARD_ID as NEXT_CARD_ID,
  HARLAN_OPERATOR_LOOP_NOT_NEXT_BOUNDARIES as NOT_NEXT,
  HARLAN_OPERATOR_LOOP_PLAN_PATH as PLAN_PATH,
  HARLAN_OPERATOR_LOOP_PROOF_COMMANDS as PROOF_COMMANDS,
  HARLAN_OPERATOR_LOOP_REQUIRED_INPUTS as REQUIRED_INPUTS,
  HARLAN_OPERATOR_LOOP_REQUIRED_SECTIONS as REQUIRED_SECTIONS,
  HARLAN_OPERATOR_LOOP_SCRIPT_PATH as SCRIPT_PATH,
  HARLAN_OPERATOR_LOOP_SPRINT_ID as SPRINT_ID,
  buildHarlanOperatorLoop,
  buildHarlanOperatorLoopDogfoodProof,
  evaluateHarlanOperatorLoop,
} from '../lib/harlan-operator-loop.js'
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
const PREREQ_CARD_IDS = [
  'HARLAN-PROJECT-REGISTRY-001',
  'AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001',
  'AGENT-CAPABILITY-REGISTRY-001',
  'AGENT-TEMPLATE-RUNTIME-CONTRACT-001',
  'ROLE-ASSISTANT-CONTRACTS-001',
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
    title: 'Build Harlan first useful operator loop',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P0',
    rank: 6,
    source: '2026-05-18 agent/extractor planning conversation + harlan-project-registry-v1 closeout.',
    summary: 'Build the first real Harlan loop around live Foundation truth: current sprint, build log, system health, audit, build-lane telemetry, backlog, and source/action route status.',
    whyItMatters: 'Before UI, voice, avatar, or runtime power matter, Harlan must answer Steve operator questions from source-backed truth without reopening settled issues or inventing authority.',
    nextAction: closeCard
      ? `Done under ${CLOSEOUT_KEY}. Continue ${NEXT_CARD_ID} unless repo truth surfaces a higher P0 repair.`
      : 'Ship the read-only Harlan operator loop contract/proof only; no runtime launch, model call, extraction, external write, or hidden worker.',
    statusNote: closeCard
      ? `Closed under ${CLOSEOUT_KEY}; Harlan operator answers require fresh declared source inputs and fail closed on stale/missing proof.`
      : `Executing ${CLOSEOUT_KEY}; read-only source-backed operator summary proof only.`,
    owner: 'Foundation Agent Runtime',
  }
}

function buildNextCardRow() {
  return {
    id: NEXT_CARD_ID,
    title: 'Expand Build Intel creator watchlist for agent/extractor research',
    scope: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 9,
    source: '2026-05-18 agent/extractor planning conversation',
    summary: 'Add/verify Build Intel watchlist entries for current agent engineering, memory systems, runtime portability, OpenHuman, knowledge-base, and extractor research sources without starting extraction.',
    whyItMatters: 'AIOS needs current Build Intel source truth before extractor/runtime work expands.',
    nextAction: 'Create plan/approval/focused proof for watchlist expansion; classify public/private/auth posture and do not start crawling, extraction, model calls, or paid/auth work.',
    statusNote: 'Scoped as the next safe card after Harlan operator loop.',
    owner: 'Foundation',
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/harlan-project-registry.js',
      'lib/agent-live-answer-preflight-gate.js',
      'lib/agent-capability-registry.js',
      'lib/agent-template-runtime-contract.js',
      'lib/role-assistant-contracts.js',
      'lib/foundation-current-sprint.js',
    ],
    existingDocs: [
      'docs/agents/harlan-project-registry.md',
      'docs/agents/harlan.md',
      'docs/rebuild/agent-architecture.md',
    ],
    existingScripts: [
      'scripts/process-harlan-project-registry-check.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: [
      'Harlan is Steve personal assistant, not the whole OS.',
      'Current answers require fresh evidence stamps.',
      'Project reach must be explicit.',
      'Runtime launch and external side effects require separate approval.',
    ],
    reused: [
      'Harlan project registry.',
      'Live-answer preflight gate.',
      'Capability registry.',
      'Agent runtime template.',
      'Role assistant contracts.',
    ],
    notRebuilt: [
      'No Harlan UI or runtime.',
      'No extraction/model/provider call.',
      'No external write or Drive mutation.',
      'No hidden worker or parallel builder launch.',
    ],
    exactGap: 'Harlan has access/role contracts, but the first useful operator answer needs a source-backed loop shape.',
    overBroadRisk: 'This can drift into a feature build; V1 stays a read-only answer contract over existing Foundation truth.',
    readyBy: 'Steve',
    readyAt: '2026-05-18T20:30:00-04:00',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  return {
    cardId: CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
    planRef: PLAN_PATH,
    definitionOfDone: 'Harlan operator loop declares required source inputs and answer sections, rejects stale/missing/memory-only/current-proof failures, blocks side effects/runtime/hidden workers, and full ship gate passes.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: 'HARLAN-PROJECT-REGISTRY-001 closed explicit Harlan project reach.',
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
    definitionOfDone: 'Build Intel watchlist entries are lookup-backed, source IDs/URLs validated, public/private/auth posture classified, cadence/priority set, and no crawling/extraction/model/paid/auth side effect starts.',
    proofCommands: [
      'scope-first: create plan/approval/focused proof before implementation',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    readinessBlockerCleared: `${CARD_ID} closed first read-only operator loop.`,
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      inheritedFrom: CARD_ID,
      nextAfterCloseoutKey: CLOSEOUT_KEY,
    },
  }
}

async function upsertLiveStateRows({ closeCard = false, stage = 'building_now', planReview } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const row = buildCardRow({ closeCard, stage })
  const nextRow = buildNextCardRow()
  try {
    await client.query('BEGIN')
    for (const item of [row, nextRow]) {
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
        [item.id, item.title, item.scope, item.lane, item.priority, item.rank, item.source, item.summary, item.whyItMatters, item.nextAction, item.statusNote, item.owner],
      )
    }
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings, result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-harlan-operator-loop')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `harlan-operator-loop-${stableRunId(PLAN_PATH)}`,
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
        VALUES ($1,'backlog_items',$2,'codex-harlan-operator-loop',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} ${CARD_ID}.`,
        JSON.stringify({ closeoutKey: CLOSEOUT_KEY, stage, nextCardId: NEXT_CARD_ID }),
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
    operation: 'create/update HARLAN-OPERATOR-LOOP-V1-001, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveStateRows({ closeCard, stage, planReview })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'Build Harlan first read-only source-backed Foundation operator loop.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
          startedBy: 'codex-harlan-operator-loop',
          currentStatus: closeCard ? 'next_scoping' : normalizeStage(stage),
          closeoutKey: CLOSEOUT_KEY,
          nextAction: closeCard ? `Commit/push, then continue ${NEXT_CARD_ID}.` : 'Ship read-only source-backed operator loop only; no runtime or side effects.',
          priorityOrder: [CARD_ID, NEXT_CARD_ID],
          requiredInputs: REQUIRED_INPUTS,
          requiredSections: REQUIRED_SECTIONS,
          notNext: NOT_NEXT,
          exitCriteria: [
            'Harlan operator answer covers current truth, changes, broken, blocked, owners, and next.',
            'Every current claim has fresh declared source evidence.',
            'Runtime, model, extraction, external write, and hidden worker attempts fail closed.',
          ],
        },
      },
      items: closeCard ? [buildSprintItem({ closeCard, stage }), buildNextSprintItem()] : [buildSprintItem({ closeCard, stage })],
    },
    'codex-harlan-operator-loop',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'Steve prioritized HARLAN-OPERATOR-LOOP-V1-001 after Harlan project registry shipped.',
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
    declaredRisk: 'Foundation Harlan operator-loop answer contract',
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
    operatorDoc,
    harlanDoc,
    closeoutDoc,
    currentPlan,
    currentState,
    cards,
    sprint,
    planCriticRuns,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile('package.json').then(JSON.parse),
    readRepoFile('lib/harlan-operator-loop.js'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/foundation-runtime-reliability-verifier.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-agent-runtime-records.js'),
    readRepoFile(DOC_PATH),
    readRepoFile('docs/agents/harlan.md'),
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
  const loopStatus = evaluateHarlanOperatorLoop(buildHarlanOperatorLoop())
  const dogfood = buildHarlanOperatorLoopDogfoodProof()
  const forbiddenRuntimeTokens = [
    ['spawn', '('].join(''),
    ['exec', 'File('].join(''),
    ['run', 'LiveExtraction'].join(''),
    ['agent-feedback', ':auto-send'].join(''),
  ]

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(failure => failure.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', buildPlanCriticResultSummary(planReview))
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, card?.priority === 'P0' && ['executing', 'done'].includes(card?.lane), 'live Harlan operator loop card exists and is staged', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, scaffold.ok, 'live backlog card passes scaffold guard', scaffold.missing.join(', ') || 'complete')
  addCheck(checks, sprint.sprint?.sprintId === SPRINT_ID, 'Current Sprint overlay is active for this card', sprint.sprint?.sprintId || 'missing')
  addCheck(checks, sprintMetadata.ok, 'Current Sprint item metadata is complete', sprintMetadata.missing.join(', ') || 'complete')
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint status is healthy', currentSprintStatus.findings?.map(item => item.detail || item.check).join('; ') || 'healthy')
  addCheck(checks, prereqCards.every(item => item?.lane === 'done'), 'Harlan operator prerequisites are done', prereqCards.map(item => `${item?.id || 'missing'}:${item?.lane || 'missing'}`).join(', '))
  addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'next Build Intel watchlist card remains live', nextCard ? `${nextCard.lane}/${nextCard.priority}` : 'missing')
  addCheck(checks, loopStatus.ok && loopStatus.summary.inputCount >= REQUIRED_INPUTS.length && loopStatus.summary.sectionCount >= REQUIRED_SECTIONS.length, 'healthy Harlan operator loop passes', `${loopStatus.status}/${loopStatus.summary.inputCount} inputs/${loopStatus.summary.sectionCount} sections`)
  addCheck(checks, dogfood.ok, 'dogfood rejects unsafe Harlan operator loop shapes', dogfood.invariant)
  addCheck(checks, dogfood.missingInputRejected && dogfood.memoryOnlyRejected && dogfood.staleInputRejected && dogfood.missingSectionRefsRejected, 'dogfood covers source proof failures', JSON.stringify({ missing: dogfood.missingInputRejected, memory: dogfood.memoryOnlyRejected, stale: dogfood.staleInputRejected, refs: dogfood.missingSectionRefsRejected }))
  addCheck(checks, dogfood.unapprovedWriteRejected && dogfood.runtimeAttemptRejected && dogfood.missingNextRejected && dogfood.unavailableCurrentRejected, 'dogfood covers side effects, runtime, next action, and unavailable-current failures', JSON.stringify({ write: dogfood.unapprovedWriteRejected, runtime: dogfood.runtimeAttemptRejected, next: dogfood.missingNextRejected, unavailable: dogfood.unavailableCurrentRejected }))
  addCheck(checks, packageJson.scripts?.['process:harlan-operator-loop-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:harlan-operator-loop-check'] || 'missing')
  addCheck(checks, moduleSource.includes('buildHarlanOperatorLoopDogfoodProof') && moduleSource.includes('HARLAN_OPERATOR_LOOP_REQUIRED_INPUTS'), 'module owns operator-loop behavior proof', 'lib/harlan-operator-loop.js')
  addCheck(checks, operatorDoc.includes('what is true right now') && operatorDoc.includes('source-backed'), 'Harlan operator-loop doc captures required answer shape', DOC_PATH)
  addCheck(checks, harlanDoc.includes('Harlan Operator Loop'), 'active Harlan doctrine links operator loop', 'docs/agents/harlan.md')
  addCheck(checks, runtimeVerifierSource.includes(CARD_ID) && runtimeVerifierSource.includes('buildHarlanOperatorLoopDogfoodProof'), 'runtime reliability verifier covers Harlan operator loop', 'lib/foundation-runtime-reliability-verifier.js')
  addCheck(checks, coverageSource.includes('HARLAN_OPERATOR_LOOP_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE') && coverageSource.includes(CARD_ID), 'verifier coverage IDs include Harlan operator loop', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'closeout registry record is registered', closeout?.key || 'missing')
  addCheck(checks, closeoutRecordsSource.includes(CLOSEOUT_KEY) && closeoutRecordsSource.includes(CARD_ID), 'closeout registry source contains card and key', CLOSEOUT_KEY)
  addCheck(checks, await repoFileExists(CLOSEOUT_PATH), 'closeout handoff exists', CLOSEOUT_PATH)
  addCheck(checks, closeoutDoc.includes('This does not implement Harlan') && closeoutDoc.includes('runtime'), 'closeout documents runtime boundary', CLOSEOUT_PATH)
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
    loopStatus: loopStatus.status,
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
