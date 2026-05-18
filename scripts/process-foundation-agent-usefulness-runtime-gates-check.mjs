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
  FOUNDATION_AGENT_USEFULNESS_NOT_NEXT_BOUNDARIES as NOT_NEXT,
  FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_APPROVAL_PATH as APPROVAL_PATH,
  FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_CARD_ID as CARD_ID,
  FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_CHANGED_FILES as CHANGED_FILES,
  FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_CLOSEOUT_KEY as CLOSEOUT_KEY,
  FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_CLOSEOUT_PATH as CLOSEOUT_PATH,
  FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_PLAN_PATH as PLAN_PATH,
  FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_PROOF_COMMANDS as PROOF_COMMANDS,
  FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_SCRIPT_PATH as SCRIPT_PATH,
  FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_SPRINT_ID as SPRINT_ID,
  buildFoundationAgentUsefulnessRuntimeGateBundle,
  buildFoundationAgentUsefulnessRuntimeGateDogfoodProof,
  evaluateFoundationAgentUsefulnessRuntimeGateBundle,
} from '../lib/foundation-agent-usefulness-runtime-gates.js'
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

const NEXT_CARD_ID = 'AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001'
const CHILD_CARD_IDS = [
  'AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001',
  'AGENT-CAPABILITY-REGISTRY-001',
  'AGENT-TEMPLATE-RUNTIME-CONTRACT-001',
]
const PREREQ_CARD_IDS = [
  'AGENT-STATUS-FRESHNESS-GATE-001',
  'PARALLEL-BUILDER-OPERATING-SYSTEM-001',
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
    const stat = await fs.stat(path.join(repoRoot, relativePath))
    return stat.isFile()
  } catch {
    return false
  }
}

function buildCardRow({ closeCard = false, stage = 'building_now' } = {}) {
  const normalizedStage = normalizeStage(stage)
  return {
    id: CARD_ID,
    title: 'Make agent usefulness rules code-enforced',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P0',
    rank: 1,
    source: 'Steve 2026-05-18 agent/extractor planning and continuous-builder priority.',
    summary: 'Scope and prove the runtime gate bundle that prevents agents from sounding current, capable, or action-ready unless code-enforced preflight, capability, permission, stale-data, status-claim, and failure-visibility checks pass.',
    whyItMatters: 'Harlan and future agents must be useful through enforced runtime behavior, not prompt reminders. Steve needs visible, trustworthy agents that cannot hide stale data, missing tools, or unapproved side effects.',
    nextAction: closeCard
      ? `Done under ${CLOSEOUT_KEY}. Continue ${NEXT_CARD_ID} unless repo truth surfaces a higher P0 repair.`
      : 'Ship the gate-bundle contract/proof only; do not build Harlan UI, launch agent runtime work, or run side-effect lanes.',
    statusNote: closeCard
      ? `Closed under ${CLOSEOUT_KEY}; runtime gate bundle rejects prompt-only rules, stale answers, undeclared capabilities, unapproved writes, hidden workers, and hidden failures.`
      : `Executing ${CLOSEOUT_KEY}; scoped gate bundle and proof only, no agent feature launch.`,
    owner: 'Foundation Agent Runtime',
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/agent-status-freshness-gate.js',
      'lib/aios-runtime-portability-gate.js',
      'lib/build-lane-reliability.js',
      'lib/foundation-current-sprint.js',
      'lib/process-plan-critic.js',
    ],
    existingDocs: [
      'docs/rebuild/agent-architecture.md',
      'docs/agents/personal-agent-onboarding.md',
      'docs/agents/harlan.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
    ],
    existingScripts: [
      'scripts/process-agent-status-freshness-gate-check.mjs',
      'scripts/process-parallel-builder-operating-system-check.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: [
      'Current operational claims require live Foundation/API truth.',
      'Visible builders are default; hidden workers require explicit approval.',
      'Prompt-only rules are not accepted as durable Foundation control.',
      'External writes, live extraction, paid/auth jobs, and model/provider calls need explicit approval.',
    ],
    reused: [
      'Agent status freshness gate.',
      'AIOS runtime portability gate.',
      'Parallel builder operating system boundary.',
      'Build-lane scaffold and Current Sprint metadata guards.',
    ],
    notRebuilt: [
      'No Harlan UI or feature work.',
      'No capability registry implementation.',
      'No agent template implementation.',
      'No runtime launch or live extraction.',
    ],
    exactGap: 'The backlog had the agent usefulness lesson captured, but the gate bundle still needed an executable fail-closed contract before child cards start.',
    overBroadRisk: 'This can sprawl into agent product work. V1 only scopes and proves the gate bundle.',
    readyBy: 'Steve',
    readyAt: '2026-05-18T18:55:00-04:00',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  return {
    cardId: CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
    planRef: PLAN_PATH,
    definitionOfDone: 'Runtime gate bundle is executable, prompt-only rules fail closed, child cards remain scoped, verifier coverage and closeout registry are wired, focused proof/backlog hygiene/foundation:verify/process:foundation-ship pass, and no Harlan/runtime/side-effect work launches.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: 'Build-lane telemetry is green, verifier/ship gates are green, root cleanup cards are done or watch-level only, and Steve made agent usefulness gates the next priority.',
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
    definitionOfDone: 'Operational answers are blocked or labeled unless the agent checked the relevant live local/API source first, with freshness windows, unavailable-source wording, and stale-memory dogfood.',
    proofCommands: [
      'scope-first: create plan/approval/focused proof before implementation',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
      'npm run process:foundation-ship -- --card=AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001 --commitRef=HEAD',
    ],
    readinessBlockerCleared: `${CARD_ID} closed the umbrella gate-bundle contract.`,
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: {
      existingCode: 'Reuse foundation-agent-usefulness-runtime-gates-v1 and agent-status-freshness-gate-v1.',
      existingDocs: 'Reuse agent architecture and personal-agent onboarding doctrine.',
      existingPolicy: 'Operational answers need fresh live evidence stamps before they can sound current.',
      exactGap: 'The umbrella bundle exists; the live-answer preflight child gate now needs its own implementation/proof.',
      notRebuilt: 'No Harlan UI, runtime launch, live extraction, provider/model call, or external write.',
    },
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-agent-usefulness-runtime-gates')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `agent-usefulness-runtime-gates-${stableRunId(PLAN_PATH)}`,
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
        VALUES ($1,'backlog_items',$2,'codex-agent-usefulness-runtime-gates',$3,$4::jsonb)
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
    operation: 'create/update agent usefulness runtime gates card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage, planReview })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'Make agent usefulness behavior code-enforced before Harlan or future role assistants expand.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
          startedBy: 'codex-agent-usefulness-runtime-gates',
          currentStatus: closeCard ? 'next_scoping' : normalizeStage(stage),
          closeoutKey: CLOSEOUT_KEY,
          nextAction: closeCard
            ? `Commit/push, then continue ${NEXT_CARD_ID}.`
            : 'Ship the runtime gate bundle proof only; do not launch agent/runtime/side-effect work.',
          priorityOrder: [CARD_ID, ...CHILD_CARD_IDS],
          notNext: NOT_NEXT,
          exitCriteria: [
            'Prompt-only agent rules fail closed.',
            'Stale current answers fail closed.',
            'Undeclared capability claims fail closed.',
            'Unapproved writes fail closed.',
            'Hidden workers and hidden failures fail closed.',
            'foundation:verify and process:foundation-ship pass.',
          ],
        },
      },
      items: closeCard ? [buildSprintItem({ closeCard, stage }), buildNextSprintItem()] : [buildSprintItem({ closeCard, stage })],
    },
    'codex-agent-usefulness-runtime-gates',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'Steve prioritized agent usefulness runtime gates after build-lane reliability, P0 process repairs, and root cleanup.',
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
    declaredRisk: 'Foundation agent runtime governance without feature launch',
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
    closeoutRegistrySource,
    closeoutDoc,
    currentPlan,
    currentState,
    agentArchitecture,
    personalOnboarding,
    cards,
    sprint,
    planCriticRuns,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile('package.json').then(JSON.parse),
    readRepoFile('lib/foundation-agent-usefulness-runtime-gates.js'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/foundation-runtime-reliability-verifier.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-agent-runtime-records.js'),
    readRepoFile('lib/foundation-build-closeout-records.js'),
    readRepoFile(CLOSEOUT_PATH, { optional: true }),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
    readRepoFile('docs/rebuild/agent-architecture.md'),
    readRepoFile('docs/agents/personal-agent-onboarding.md'),
    getBacklogItemsByIds([CARD_ID, ...CHILD_CARD_IDS, ...PREREQ_CARD_IDS]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])
  await closeFoundationDb()

  const card = cards.find(item => item.id === CARD_ID) || null
  const childCards = CHILD_CARD_IDS.map(cardId => cards.find(item => item.id === cardId) || null)
  const prereqCards = PREREQ_CARD_IDS.map(cardId => cards.find(item => item.id === cardId) || null)
  const sprintItem = (sprint.items || []).find(item => item.cardId === CARD_ID) || null
  const closeouts = getFoundationBuildCloseouts()
  const closeout = closeouts.find(record => record.key === CLOSEOUT_KEY) || null
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: sprint.sprint,
    items: sprint.items,
    backlogItems: cards,
    closeouts,
    planCriticRuns,
  })
  const scaffold = validateBuildLaneCardScaffold(card || {})
  const sprintMetadata = validateBuildLaneSprintItemMetadata(sprintItem || {})
  const gateStatus = evaluateFoundationAgentUsefulnessRuntimeGateBundle(buildFoundationAgentUsefulnessRuntimeGateBundle())
  const dogfood = buildFoundationAgentUsefulnessRuntimeGateDogfoodProof()
  const forbiddenRuntimeTokens = [
    ['spawn', '('].join(''),
    ['exec', 'File('].join(''),
    ['run', 'LiveExtraction'].join(''),
    ['agent-feedback', ':auto-send'].join(''),
    ['send', 'AgentFeedback'].join(''),
  ]

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(failure => failure.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', buildPlanCriticResultSummary(planReview))
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, card?.priority === 'P0' && ['executing', 'done'].includes(card?.lane), 'live backlog card exists and is staged', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, scaffold.ok, 'live backlog card passes scaffold guard', scaffold.missing.join(', ') || 'complete')
  addCheck(checks, sprint.sprint?.sprintId === SPRINT_ID, 'Current Sprint overlay is active for this card', sprint.sprint?.sprintId || 'missing')
  addCheck(checks, sprintMetadata.ok, 'Current Sprint item metadata is complete', sprintMetadata.missing.join(', ') || 'complete')
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint status is healthy', currentSprintStatus.findings?.map(item => item.detail || item.check).join('; ') || 'healthy')
  addCheck(checks, prereqCards.every(item => item?.lane === 'done'), 'agent status and visible-builder prerequisites are done', prereqCards.map(item => `${item?.id || 'missing'}:${item?.lane || 'missing'}`).join(', '))
  addCheck(checks, childCards.every(item => item && ['scoped', 'executing', 'done'].includes(item.lane) && item.priority === 'P0'), 'child agent cards remain live and staged', childCards.map(item => `${item?.id || 'missing'}:${item?.lane || 'missing'}`).join(', '))
  addCheck(checks, gateStatus.ok && gateStatus.summary.componentCount >= 7, 'healthy runtime gate bundle passes', gateStatus.status)
  addCheck(checks, dogfood.ok, 'dogfood rejects prompt-only and unsafe agent behavior', dogfood.invariant)
  addCheck(checks, dogfood.promptOnlyBundleRejected && dogfood.staleMemoryAnswerRejected && dogfood.undeclaredCapabilityRejected, 'dogfood covers prompt-only, stale-answer, and capability failures', JSON.stringify({ promptOnly: dogfood.promptOnlyBundleRejected, stale: dogfood.staleMemoryAnswerRejected, capability: dogfood.undeclaredCapabilityRejected }))
  addCheck(checks, dogfood.unapprovedWriteRejected && dogfood.hiddenWorkerRejected && dogfood.hiddenFailureRejected, 'dogfood covers side-effect, hidden-worker, and hidden-failure failures', JSON.stringify({ write: dogfood.unapprovedWriteRejected, hiddenWorker: dogfood.hiddenWorkerRejected, hiddenFailure: dogfood.hiddenFailureRejected }))
  addCheck(checks, packageJson.scripts?.['process:foundation-agent-usefulness-runtime-gates-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:foundation-agent-usefulness-runtime-gates-check'] || 'missing')
  addCheck(checks, moduleSource.includes('buildFoundationAgentUsefulnessRuntimeGateDogfoodProof') && moduleSource.includes('promptOnlyBundleRejected'), 'module owns gate bundle behavior proof', 'lib/foundation-agent-usefulness-runtime-gates.js')
  addCheck(checks, runtimeVerifierSource.includes(CARD_ID) && runtimeVerifierSource.includes('buildFoundationAgentUsefulnessRuntimeGateDogfoodProof'), 'runtime reliability verifier covers the gate bundle', 'lib/foundation-runtime-reliability-verifier.js')
  addCheck(checks, coverageSource.includes('FOUNDATION_AGENT_USEFULNESS_RUNTIME_GATES_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE') && coverageSource.includes(CARD_ID), 'verifier coverage IDs include this card', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'closeout registry record is registered', closeout?.key || 'missing')
  addCheck(checks, closeoutRecordsSource.includes(CLOSEOUT_KEY) && closeoutRegistrySource.includes('agentRuntimeCloseoutRecords'), 'closeout registry source contains the agent runtime record', CLOSEOUT_KEY)
  addCheck(checks, await repoFileExists(CLOSEOUT_PATH), 'closeout handoff exists', CLOSEOUT_PATH)
  addCheck(checks, closeoutDoc.includes('This does not build Harlan UI') && closeoutDoc.includes('hidden subagents'), 'closeout documents feature and hidden-worker boundaries', CLOSEOUT_PATH)
  addCheck(checks, currentPlan.includes(CLOSEOUT_KEY) && currentState.includes(CLOSEOUT_KEY), 'current plan/state mention closeout key', CLOSEOUT_KEY)
  addCheck(checks, agentArchitecture.includes('Harlan') && agentArchitecture.includes('Crewbert') && personalOnboarding.includes('AGENT-010'), 'agent doctrine sources remain the reference context', 'docs/rebuild/agent-architecture.md + docs/agents/personal-agent-onboarding.md')
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
    gateStatus: gateStatus.status,
    dogfoodOk: dogfood.ok,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
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
