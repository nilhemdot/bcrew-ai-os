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
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
import {
  ROLE_ASSISTANT_CONTRACTS_APPROVAL_PATH as APPROVAL_PATH,
  ROLE_ASSISTANT_CONTRACTS_CARD_ID as CARD_ID,
  ROLE_ASSISTANT_CONTRACTS_CHANGED_FILES as CHANGED_FILES,
  ROLE_ASSISTANT_CONTRACTS_CLOSEOUT_KEY as CLOSEOUT_KEY,
  ROLE_ASSISTANT_CONTRACTS_CLOSEOUT_PATH as CLOSEOUT_PATH,
  ROLE_ASSISTANT_CONTRACTS_DOC_PATH as DOC_PATH,
  ROLE_ASSISTANT_CONTRACTS_NEXT_CARD_ID as NEXT_CARD_ID,
  ROLE_ASSISTANT_CONTRACTS_NOT_NEXT_BOUNDARIES as NOT_NEXT,
  ROLE_ASSISTANT_CONTRACTS_PLAN_PATH as PLAN_PATH,
  ROLE_ASSISTANT_CONTRACTS_PROOF_COMMANDS as PROOF_COMMANDS,
  ROLE_ASSISTANT_CONTRACTS_REQUIRED_ROLE_IDS as REQUIRED_ROLE_IDS,
  ROLE_ASSISTANT_CONTRACTS_SCRIPT_PATH as SCRIPT_PATH,
  ROLE_ASSISTANT_CONTRACTS_SPRINT_ID as SPRINT_ID,
  buildRoleAssistantContracts,
  buildRoleAssistantContractsDogfoodProof,
  evaluateRoleAssistantContracts,
} from '../lib/role-assistant-contracts.js'
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
  'FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001',
  'AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001',
  'AGENT-CAPABILITY-REGISTRY-001',
  'AGENT-TEMPLATE-RUNTIME-CONTRACT-001',
  'OLD-SYSTEM-AGENT-ONBOARDING-HARVEST-001',
  'AGENT-010',
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
    title: 'Define role-specific assistant contracts',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P0',
    rank: 4,
    source: '2026-05-18 agent/extractor planning conversation + Steve continuous-builder queue.',
    summary: 'Define visible role contracts for Steve/Harlan, Sales Leadership, Ops, Marketing, Agent KPI coach, and Extraction worker: what each sees, does, escalates, trusts, reports, and requires approval for.',
    whyItMatters: 'Future assistants need role-specific operating contracts before runtime work expands, so they do not invent authority, hide work, overlap owners, leak private context, or mutate systems without approval.',
    nextAction: closeCard
      ? `Done under ${CLOSEOUT_KEY}. Continue ${NEXT_CARD_ID} unless repo truth surfaces a higher P0 repair.`
      : 'Ship contract/proof only; no live assistants, extraction, model/provider calls, sends, external writes, Drive mutation, or hidden subagents.',
    statusNote: closeCard
      ? `Closed under ${CLOSEOUT_KEY}; role assistant contracts are ready for later Harlan/project-registry work.`
      : `Executing ${CLOSEOUT_KEY}; Foundation contract/proof only.`,
    owner: 'Foundation Agent Runtime',
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/foundation-agent-usefulness-runtime-gates.js',
      'lib/agent-live-answer-preflight-gate.js',
      'lib/agent-capability-registry.js',
      'lib/agent-template-runtime-contract.js',
      'lib/personal-agent-onboarding-contract.js',
    ],
    existingDocs: [
      'docs/rebuild/agent-architecture.md',
      'docs/agents/personal-agent-onboarding.md',
      'docs/agents/old-system-agent-onboarding-harvest.md',
    ],
    existingScripts: [
      'scripts/process-agent-template-runtime-contract-check.mjs',
      'scripts/process-agent-010-check.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: [
      'Current operational answers require live-answer preflight.',
      'Agent capabilities must be declared before an assistant can claim them.',
      'Private profile values stay out of repo truth.',
      'Side-effect lanes require explicit approval.',
    ],
    reused: [
      'Agent usefulness gates.',
      'Live-answer preflight.',
      'Capability registry.',
      'Runtime template contract.',
      'Personal-agent onboarding contract.',
    ],
    notRebuilt: [
      'No Harlan implementation.',
      'No role assistant runtime launch.',
      'No live extraction or provider/model call.',
      'No external send/write authority granted.',
    ],
    exactGap: 'The system has a generic template and onboarding contract, but role-specific assistant examples are not yet enforceable.',
    overBroadRisk: 'This can drift into building Harlan, launching assistants, or granting source/project reach; V1 stays contract/proof only.',
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
    definitionOfDone: 'Six role assistant contracts define visibility, work scope, trusted sources, escalation, approval boundaries, status reports, failure modes, and first useful examples; unsafe fixtures fail closed; full ship gate passes.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: 'AGENT-010 closed personal-agent onboarding and private profile contract.',
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
    definitionOfDone: 'Harlan project registry declares known systems, local paths, API/auth posture, allowed reads/writes, approval boundaries, escalation owner, and blocked unknown systems without granting new authority.',
    proofCommands: [
      'scope-first: create plan/approval/focused proof before implementation',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    readinessBlockerCleared: `${CARD_ID} closed role-specific assistant contracts.`,
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-role-assistant-contracts')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `role-assistant-contracts-${stableRunId(PLAN_PATH)}`,
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
        VALUES ($1,'backlog_items',$2,'codex-role-assistant-contracts',$3,$4::jsonb)
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
    operation: 'create/update ROLE-ASSISTANT-CONTRACTS-001 card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage, planReview })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'Define visible role-specific assistant contracts before Harlan project registry and runtime work.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
          startedBy: 'codex-role-assistant-contracts',
          currentStatus: closeCard ? 'next_scoping' : normalizeStage(stage),
          closeoutKey: CLOSEOUT_KEY,
          nextAction: closeCard ? `Commit/push, then continue ${NEXT_CARD_ID}.` : 'Ship contract/proof only; no runtime launch.',
          priorityOrder: [CARD_ID, NEXT_CARD_ID],
          requiredRoleIds: REQUIRED_ROLE_IDS,
          notNext: NOT_NEXT,
          exitCriteria: [
            'Six role assistant examples are defined.',
            'Visibility, work scope, trusted sources, escalation, approval, status, and failure modes are explicit.',
            'Unapproved writes, memory-only current claims, raw private values, hidden subagents, and runtime side effects fail closed.',
          ],
        },
      },
      items: closeCard ? [buildSprintItem({ closeCard, stage }), buildNextSprintItem()] : [buildSprintItem({ closeCard, stage })],
    },
    'codex-role-assistant-contracts',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'Steve prioritized ROLE-ASSISTANT-CONTRACTS-001 after AGENT-010.',
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
    declaredRisk: 'Foundation role-specific assistant contracts',
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
    contractDoc,
    agentsReadme,
    agentArchitecture,
    closeoutDoc,
    currentPlan,
    currentState,
    cards,
    sprint,
    planCriticRuns,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile('package.json').then(JSON.parse),
    readRepoFile('lib/role-assistant-contracts.js'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/foundation-runtime-reliability-verifier.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-agent-runtime-records.js'),
    readRepoFile(DOC_PATH),
    readRepoFile('docs/agents/README.md'),
    readRepoFile('docs/rebuild/agent-architecture.md'),
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
  const contractStatus = evaluateRoleAssistantContracts(buildRoleAssistantContracts())
  const dogfood = buildRoleAssistantContractsDogfoodProof()
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
  addCheck(checks, prereqCards.every(item => item?.lane === 'done'), 'role assistant prerequisites are done', prereqCards.map(item => `${item?.id || 'missing'}:${item?.lane || 'missing'}`).join(', '))
  addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'next Harlan project registry card remains live', nextCard ? `${nextCard.lane}/${nextCard.priority}` : 'missing')
  addCheck(checks, contractStatus.ok && contractStatus.summary.roleCount >= REQUIRED_ROLE_IDS.length, 'healthy role assistant contract passes', `${contractStatus.status}/${contractStatus.summary.roleCount} roles`)
  addCheck(checks, dogfood.ok, 'dogfood rejects unsafe role assistant contracts', dogfood.invariant)
  addCheck(checks, dogfood.missingRoleRejected && dogfood.missingSourcesRejected && dogfood.missingRefsRejected && dogfood.missingEscalationRejected, 'dogfood covers missing role/source/ref/escalation failures', JSON.stringify({ role: dogfood.missingRoleRejected, sources: dogfood.missingSourcesRejected, refs: dogfood.missingRefsRejected, escalation: dogfood.missingEscalationRejected }))
  addCheck(checks, dogfood.unapprovedWriteRejected && dogfood.hiddenSubagentRejected && dogfood.memoryOnlyTrustRejected && dogfood.rawPrivateValueRejected && dogfood.runtimeAttemptRejected, 'dogfood covers writes, hidden workers, memory-only truth, privacy, and runtime failures', JSON.stringify({ write: dogfood.unapprovedWriteRejected, hidden: dogfood.hiddenSubagentRejected, memory: dogfood.memoryOnlyTrustRejected, private: dogfood.rawPrivateValueRejected, runtime: dogfood.runtimeAttemptRejected }))
  addCheck(checks, packageJson.scripts?.['process:role-assistant-contracts-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:role-assistant-contracts-check'] || 'missing')
  addCheck(checks, moduleSource.includes('buildRoleAssistantContractsDogfoodProof') && moduleSource.includes('ROLE_ASSISTANT_CONTRACTS_REQUIRED_ROLE_IDS'), 'module owns role contract behavior proof', 'lib/role-assistant-contracts.js')
  addCheck(checks, contractDoc.includes('Steve / Harlan') && contractDoc.includes('Sales Leadership Assistant') && contractDoc.includes('Extraction Worker'), 'role assistant doc captures six examples', DOC_PATH)
  addCheck(checks, agentsReadme.includes('Role Assistant Contracts') && agentArchitecture.includes('Role Assistant Contracts'), 'agent docs link role contracts from active doctrine', 'docs/agents/README.md + docs/rebuild/agent-architecture.md')
  addCheck(checks, runtimeVerifierSource.includes(CARD_ID) && runtimeVerifierSource.includes('buildRoleAssistantContractsDogfoodProof'), 'runtime reliability verifier covers role assistant contracts', 'lib/foundation-runtime-reliability-verifier.js')
  addCheck(checks, coverageSource.includes('ROLE_ASSISTANT_CONTRACTS_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE') && coverageSource.includes(CARD_ID), 'verifier coverage IDs include role assistant contracts', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'closeout registry record is registered', closeout?.key || 'missing')
  addCheck(checks, closeoutRecordsSource.includes(CLOSEOUT_KEY) && closeoutRecordsSource.includes(CARD_ID), 'closeout registry source contains card and key', CLOSEOUT_KEY)
  addCheck(checks, await repoFileExists(CLOSEOUT_PATH), 'closeout handoff exists', CLOSEOUT_PATH)
  addCheck(checks, closeoutDoc.includes('This does not launch live assistants') && closeoutDoc.includes('unapproved writes'), 'closeout documents runtime and write boundary', CLOSEOUT_PATH)
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
    contractStatus: contractStatus.status,
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
