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
import { closeFoundationDb } from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  HARLAN_PROJECT_REGISTRY_APPROVAL_PATH as APPROVAL_PATH,
  HARLAN_PROJECT_REGISTRY_CARD_ID as CARD_ID,
  HARLAN_PROJECT_REGISTRY_CHANGED_FILES as CHANGED_FILES,
  HARLAN_PROJECT_REGISTRY_CLOSEOUT_KEY as CLOSEOUT_KEY,
  HARLAN_PROJECT_REGISTRY_CLOSEOUT_PATH as CLOSEOUT_PATH,
  HARLAN_PROJECT_REGISTRY_DOC_PATH as DOC_PATH,
  HARLAN_PROJECT_REGISTRY_NEXT_CARD_ID as NEXT_CARD_ID,
  HARLAN_PROJECT_REGISTRY_NOT_NEXT_BOUNDARIES as NOT_NEXT,
  HARLAN_PROJECT_REGISTRY_PLAN_PATH as PLAN_PATH,
  HARLAN_PROJECT_REGISTRY_PROOF_COMMANDS as PROOF_COMMANDS,
  HARLAN_PROJECT_REGISTRY_REQUIRED_SYSTEM_KEYS as REQUIRED_SYSTEM_KEYS,
  HARLAN_PROJECT_REGISTRY_SCRIPT_PATH as SCRIPT_PATH,
  HARLAN_PROJECT_REGISTRY_SPRINT_ID as SPRINT_ID,
  HARLAN_PROJECT_REGISTRY_SYSTEM_CARD_ID as SYSTEM_CARD_ID,
  buildHarlanProjectRegistry,
  buildHarlanProjectRegistryDogfoodProof,
  evaluateHarlanProjectRegistry,
} from '../lib/harlan-project-registry.js'
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
  'ROLE-ASSISTANT-CONTRACTS-001',
  'AGENT-010',
  'AGENT-CAPABILITY-REGISTRY-001',
  'AGENT-TEMPLATE-RUNTIME-CONTRACT-001',
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
    title: 'Define Harlan project registry and allowed reach',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P0',
    rank: 5,
    source: '2026-05-18 agent/extractor planning conversation + SYSTEM-011.',
    summary: 'Define the explicit project registry Harlan needs as a cross-project personal assistant: known systems, local paths, repo/API/auth posture, allowed reads/writes, approval boundaries, escalation owner, source refs, and capability status.',
    whyItMatters: 'Harlan needs declared reach before runtime work so he can answer what he can read, what is blocked, who owns approval, and which unknown systems are fail-closed instead of relying on hidden human memory.',
    nextAction: closeCard
      ? `Done under ${CLOSEOUT_KEY}. Continue ${NEXT_CARD_ID} unless repo truth surfaces a higher P0 repair.`
      : 'Ship registry contract/proof only; no Harlan implementation, live runtime, extraction, provider/model calls, sends, Drive mutation, home move, or new authority.',
    statusNote: closeCard
      ? `Closed under ${CLOSEOUT_KEY}; SYSTEM-011 project-registry concept is satisfied by this concrete Harlan registry v1.`
      : `Executing ${CLOSEOUT_KEY}; Foundation registry/proof only.`,
    owner: 'Foundation Agent Runtime',
  }
}

function buildSystemCardRow({ closeCard = false } = {}) {
  return {
    id: SYSTEM_CARD_ID,
    title: 'Define a project registry for cross-project personal agents',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'research',
    priority: closeCard ? 'P1' : 'P2',
    rank: 43,
    source: 'Claude audit + cross-project assistant discussion; implemented concretely by HARLAN-PROJECT-REGISTRY-001.',
    summary: 'Define the project registry pattern for cross-project personal agents through the Harlan v1 registry contract: system key, location/API, auth mode, reads/writes, approvals, owner, escalation, source refs, and capability status.',
    whyItMatters: 'Cross-project agents need explicit reach and fail-closed unknown-system handling before they can operate across Steve systems.',
    nextAction: closeCard
      ? `Done under ${CLOSEOUT_KEY}; future agent registries should reuse the Harlan registry pattern.`
      : 'Use HARLAN-PROJECT-REGISTRY-001 as the concrete implementation path.',
    statusNote: closeCard
      ? `Closed under ${CLOSEOUT_KEY}; Harlan project registry v1 implements SYSTEM-011 for the first personal-agent registry.`
      : 'Research concept awaiting concrete Harlan registry.',
    owner: 'Foundation Agent Runtime',
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/role-assistant-contracts.js',
      'lib/personal-agent-onboarding-contract.js',
      'lib/agent-capability-registry.js',
      'lib/agent-template-runtime-contract.js',
    ],
    existingDocs: [
      'docs/rebuild/agent-architecture.md',
      'docs/agents/harlan.md',
      'docs/agents/role-assistant-contracts.md',
    ],
    existingScripts: [
      'scripts/process-role-assistant-contracts-check.mjs',
      'scripts/process-agent-010-check.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: [
      'Harlan is a personal assistant, not the whole OS.',
      'Project reach must be explicit and source-backed.',
      'Unknown systems are blocked until registered.',
      'Side-effect lanes require explicit approval.',
    ],
    reused: [
      'Role assistant contracts.',
      'Personal-agent onboarding contract.',
      'Capability registry.',
      'Runtime template contract.',
    ],
    notRebuilt: [
      'No Harlan implementation.',
      'No live agent runtime launch.',
      'No external Harlan home creation or move.',
      'No connector/auth mutation or external-write authority.',
    ],
    exactGap: 'Harlan has role/onboarding doctrine, but cross-project reach still needs an explicit registry contract.',
    overBroadRisk: 'This can drift into launching Harlan or granting access; V1 stays registry/proof only.',
    readyBy: 'Steve',
    readyAt: '2026-05-18T20:45:00-04:00',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  return {
    cardId: CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
    planRef: PLAN_PATH,
    definitionOfDone: 'Harlan registry declares known systems, paths/API/auth posture, reads/writes, approval boundaries, escalation, source refs, blocked unknowns, and no new authority; unsafe fixtures fail closed; full ship gate passes.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: 'ROLE-ASSISTANT-CONTRACTS-001 closed role-specific assistant contracts.',
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: APPROVAL_PATH,
      closeoutKey: CLOSEOUT_KEY,
      relatedCardId: SYSTEM_CARD_ID,
    },
  }
}

function buildNextSprintItem() {
  return {
    cardId: NEXT_CARD_ID,
    order: 2,
    stage: 'scoping',
    planRef: null,
    definitionOfDone: 'Harlan first useful operator loop gives Steve a read-only, source-backed answer about current Foundation truth without external writes or runtime side effects.',
    proofCommands: [
      'scope-first: create plan/approval/focused proof before implementation',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    readinessBlockerCleared: `${CARD_ID} closed project registry and allowed reach.`,
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      inheritedFrom: CARD_ID,
      nextAfterCloseoutKey: CLOSEOUT_KEY,
    },
  }
}

async function upsertLiveCardsAndPlanCritic({ closeCard = false, stage = 'building_now', planReview } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const row = buildCardRow({ closeCard, stage })
  const systemRow = buildSystemCardRow({ closeCard })
  try {
    await client.query('BEGIN')
    for (const item of [row, systemRow]) {
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
        [item.id, item.title, item.scope, item.lane, item.priority, item.rank, item.source, item.summary, item.whyItMatters, item.nextAction, item.statusNote, item.owner],
      )
    }
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings, result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-harlan-project-registry')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `harlan-project-registry-${stableRunId(PLAN_PATH)}`,
        CARD_ID,
        PLAN_PATH,
        planReview.status,
        Number(planReview.score),
        CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: CARD_ID, relatedCardId: SYSTEM_CARD_ID }),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-harlan-project-registry',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} ${CARD_ID}.`,
        JSON.stringify({ closeoutKey: CLOSEOUT_KEY, relatedCardId: SYSTEM_CARD_ID, stage }),
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
    operation: 'create/update HARLAN-PROJECT-REGISTRY-001, SYSTEM-011, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardsAndPlanCritic({ closeCard, stage, planReview })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'Define Harlan project registry and allowed reach before operator-loop runtime work.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizeStage(stage),
          startedBy: 'codex-harlan-project-registry',
          currentStatus: closeCard ? 'next_scoping' : normalizeStage(stage),
          closeoutKey: CLOSEOUT_KEY,
          nextAction: closeCard ? `Commit/push, then continue ${NEXT_CARD_ID}.` : 'Ship registry/proof only; no runtime launch or new authority.',
          priorityOrder: [CARD_ID, NEXT_CARD_ID],
          requiredSystemKeys: REQUIRED_SYSTEM_KEYS,
          relatedCardId: SYSTEM_CARD_ID,
          notNext: NOT_NEXT,
          exitCriteria: [
            'Initial Harlan registry systems are defined.',
            'Unknown systems, writes, connector/auth, Drive, extraction, model calls, and hidden subagents fail closed.',
            'SYSTEM-011 is linked to the concrete registry closeout.',
          ],
        },
      },
      items: closeCard ? [buildSprintItem({ closeCard, stage }), buildNextSprintItem()] : [buildSprintItem({ closeCard, stage })],
    },
    'codex-harlan-project-registry',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'Steve prioritized HARLAN-PROJECT-REGISTRY-001 / SYSTEM-011 after ROLE-ASSISTANT-CONTRACTS-001.',
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
    declaredRisk: 'Foundation Harlan project registry',
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
    registryDoc,
    harlanDoc,
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
    readRepoFile('lib/harlan-project-registry.js'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/foundation-runtime-reliability-verifier.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-agent-runtime-records.js'),
    readRepoFile(DOC_PATH),
    readRepoFile('docs/agents/harlan.md'),
    readRepoFile('docs/rebuild/agent-architecture.md'),
    readRepoFile(CLOSEOUT_PATH, { optional: true }),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
    getBacklogItemsByIds([CARD_ID, SYSTEM_CARD_ID, NEXT_CARD_ID, ...PREREQ_CARD_IDS]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])
  await closeFoundationDb()

  const card = cards.find(item => item.id === CARD_ID) || null
  const systemCard = cards.find(item => item.id === SYSTEM_CARD_ID) || null
  const nextCard = cards.find(item => item.id === NEXT_CARD_ID) || null
  const prereqCards = PREREQ_CARD_IDS.map(cardId => cards.find(item => item.id === cardId) || null)
  const sprintItem = (sprint.items || []).find(item => item.cardId === CARD_ID) || null
  const closeouts = getFoundationBuildCloseouts()
  const closeout = closeouts.find(record => record.key === CLOSEOUT_KEY) || null
  const currentSprintStatus = buildFoundationCurrentSprintStatus({ sprint: sprint.sprint, items: sprint.items, backlogItems: cards, closeouts, planCriticRuns })
  const scaffold = validateBuildLaneCardScaffold(card || {})
  const sprintMetadata = validateBuildLaneSprintItemMetadata(sprintItem || {})
  const registryStatus = evaluateHarlanProjectRegistry(buildHarlanProjectRegistry())
  const dogfood = buildHarlanProjectRegistryDogfoodProof()
  const forbiddenRuntimeTokens = [
    ['spawn', '('].join(''),
    ['exec', 'File('].join(''),
    ['run', 'LiveExtraction'].join(''),
    ['agent-feedback', ':auto-send'].join(''),
  ]

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(failure => failure.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', buildPlanCriticResultSummary(planReview))
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, card?.priority === 'P0' && ['executing', 'done'].includes(card?.lane), 'live Harlan registry card exists and is staged', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, scaffold.ok, 'live backlog card passes scaffold guard', scaffold.missing.join(', ') || 'complete')
  addCheck(checks, systemCard && (args.closeCard ? systemCard.lane === 'done' : ['research', 'scoped', 'done'].includes(systemCard.lane)), 'SYSTEM-011 is linked to this implementation', systemCard ? `${systemCard.lane}/${systemCard.priority}` : 'missing')
  addCheck(checks, sprint.sprint?.sprintId === SPRINT_ID, 'Current Sprint overlay is active for this card', sprint.sprint?.sprintId || 'missing')
  addCheck(checks, sprintMetadata.ok, 'Current Sprint item metadata is complete', sprintMetadata.missing.join(', ') || 'complete')
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint status is healthy', currentSprintStatus.findings?.map(item => item.detail || item.check).join('; ') || 'healthy')
  addCheck(checks, prereqCards.every(item => item?.lane === 'done'), 'Harlan registry prerequisites are done', prereqCards.map(item => `${item?.id || 'missing'}:${item?.lane || 'missing'}`).join(', '))
  addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'next Harlan operator loop card remains live', nextCard ? `${nextCard.lane}/${nextCard.priority}` : 'missing')
  addCheck(checks, registryStatus.ok && registryStatus.summary.systemCount >= REQUIRED_SYSTEM_KEYS.length, 'healthy Harlan project registry passes', `${registryStatus.status}/${registryStatus.summary.systemCount} systems`)
  addCheck(checks, dogfood.ok, 'dogfood rejects unsafe Harlan project registry shapes', dogfood.invariant)
  addCheck(checks, dogfood.missingSystemRejected && dogfood.missingAuthRejected && dogfood.missingEscalationRejected && dogfood.missingSourceContractsRejected, 'dogfood covers missing system/auth/escalation/source failures', JSON.stringify({ system: dogfood.missingSystemRejected, auth: dogfood.missingAuthRejected, escalation: dogfood.missingEscalationRejected, source: dogfood.missingSourceContractsRejected }))
  addCheck(checks, dogfood.unapprovedWriteRejected && dogfood.unknownAllowedRejected && dogfood.runtimeAttemptRejected, 'dogfood covers writes, unknown systems, runtime, and authority failures', JSON.stringify({ write: dogfood.unapprovedWriteRejected, unknown: dogfood.unknownAllowedRejected, runtime: dogfood.runtimeAttemptRejected }))
  addCheck(checks, packageJson.scripts?.['process:harlan-project-registry-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:harlan-project-registry-check'] || 'missing')
  addCheck(checks, moduleSource.includes('buildHarlanProjectRegistryDogfoodProof') && moduleSource.includes('HARLAN_PROJECT_REGISTRY_REQUIRED_SYSTEM_KEYS'), 'module owns registry behavior proof', 'lib/harlan-project-registry.js')
  addCheck(checks, registryDoc.includes('bcrew-ai-os') && registryDoc.includes('google-workspace-delegated') && registryDoc.includes('future-harlan-home'), 'Harlan registry doc captures required systems', DOC_PATH)
  addCheck(checks, harlanDoc.includes('Harlan Project Registry') && agentArchitecture.includes('Harlan Project Registry'), 'active Harlan doctrine links project registry', 'docs/agents/harlan.md + docs/rebuild/agent-architecture.md')
  addCheck(checks, runtimeVerifierSource.includes(CARD_ID) && runtimeVerifierSource.includes('buildHarlanProjectRegistryDogfoodProof'), 'runtime reliability verifier covers Harlan project registry', 'lib/foundation-runtime-reliability-verifier.js')
  addCheck(checks, coverageSource.includes('HARLAN_PROJECT_REGISTRY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE') && coverageSource.includes(CARD_ID) && coverageSource.includes(SYSTEM_CARD_ID), 'verifier coverage IDs include Harlan registry and SYSTEM-011', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID) && (closeout.backlogIds || []).includes(SYSTEM_CARD_ID), 'closeout registry record is registered', closeout?.key || 'missing')
  addCheck(checks, closeoutRecordsSource.includes(CLOSEOUT_KEY) && closeoutRecordsSource.includes(CARD_ID) && closeoutRecordsSource.includes(SYSTEM_CARD_ID), 'closeout registry source contains card, system card, and key', CLOSEOUT_KEY)
  addCheck(checks, await repoFileExists(CLOSEOUT_PATH), 'closeout handoff exists', CLOSEOUT_PATH)
  addCheck(checks, closeoutDoc.includes('This does not implement Harlan') && closeoutDoc.includes('new authority'), 'closeout documents runtime and authority boundary', CLOSEOUT_PATH)
  addCheck(checks, currentPlan.includes(CLOSEOUT_KEY) && currentState.includes(CLOSEOUT_KEY), 'current plan/state mention closeout key', CLOSEOUT_KEY)
  addCheck(checks, !forbiddenRuntimeTokens.some(token => scriptSource.includes(token)), 'focused proof does not launch runtime side effects', SCRIPT_PATH)
  addCheck(checks, moduleSource.split('\n').length < 1500, 'new module is under preferred module budget', `${moduleSource.split('\n').length} lines`)
  addCheck(checks, scriptSource.split('\n').length < 1500, 'focused proof script is under preferred module budget', `${scriptSource.split('\n').length} lines`)

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'fail' : 'pass',
    cardId: CARD_ID,
    relatedCardId: SYSTEM_CARD_ID,
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
