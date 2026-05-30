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
  TRUSTED_ASSISTANT_LOOP_APPROVAL_PATH as APPROVAL_PATH,
  TRUSTED_ASSISTANT_LOOP_CARD_ID as CARD_ID,
  TRUSTED_ASSISTANT_LOOP_CHANGED_FILES as CHANGED_FILES,
  TRUSTED_ASSISTANT_LOOP_CLOSEOUT_KEY as CLOSEOUT_KEY,
  TRUSTED_ASSISTANT_LOOP_CLOSEOUT_PATH as CLOSEOUT_PATH,
  TRUSTED_ASSISTANT_LOOP_DOC_PATH as DOC_PATH,
  TRUSTED_ASSISTANT_LOOP_NEXT_CARD_ID as NEXT_CARD_ID,
  TRUSTED_ASSISTANT_LOOP_NOT_NEXT_BOUNDARIES as NOT_NEXT,
  TRUSTED_ASSISTANT_LOOP_PLAN_PATH as PLAN_PATH,
  TRUSTED_ASSISTANT_LOOP_PROOF_COMMANDS as PROOF_COMMANDS,
  TRUSTED_ASSISTANT_LOOP_SCRIPT_PATH as SCRIPT_PATH,
  TRUSTED_ASSISTANT_LOOP_SPRINT_ID as SPRINT_ID,
  buildTrustedAssistantLoopContract,
  buildTrustedAssistantLoopDogfoodProof,
  evaluateTrustedAssistantLoopContract,
} from '../lib/trusted-assistant-loop.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const PREREQ_CARD_IDS = [
  'AGENT-LIVE-ANSWER-PREFLIGHT-GATE-001',
  'AGENT-CAPABILITY-REGISTRY-001',
  'AGENT-TEMPLATE-RUNTIME-CONTRACT-001',
  'AGENT-010',
  'ROLE-ASSISTANT-CONTRACTS-001',
  'HARLAN-PROJECT-REGISTRY-001',
  'HARLAN-OPERATOR-LOOP-V1-001',
]

const CONTINUATION_ITEMS = [
  { cardId: CARD_ID, title: 'Define and prove the first trusted assistant loop', owner: 'Foundation Agent Runtime' },
  { cardId: NEXT_CARD_ID, title: 'Harden Marketing Video Lab live generation safety before route wiring', owner: 'Foundation Safety' },
  { cardId: 'STRATEGY-004', title: 'Build the AI-assisted strategy planning workflow', owner: 'Strategic Intelligence' },
  { cardId: 'STRATEGY-009', title: 'Clean Strategy Package UI/UX for live planning', owner: 'Strategy UX' },
  { cardId: 'KPI-APPT-QUALITY-001', title: 'Build KPI appointment quality audit for stacking and outcomes', owner: 'Sales Data Quality' },
  { cardId: 'KPI-LEAD-VALIDATION-001', title: 'Surface KPI fake-lead and lead-source validation problems', owner: 'Sales Data Quality' },
  { cardId: 'INTEL-THREAD-CONTEXT-001', title: 'Add full thread context to evidence proof', owner: 'Strategic Intelligence' },
  { cardId: 'SCOPER-UI-001', title: 'Render gap-resolving Scoper output in the Strategy Hub', owner: 'Strategy UX' },
  { cardId: 'SOURCE-001', title: 'Revalidate Gmail as a rebuild source contract', owner: 'Source Contracts' },
  { cardId: 'SOURCE-002', title: 'Revalidate Google Calendar as a rebuild source contract', owner: 'Source Contracts' },
  { cardId: 'SOURCE-003', title: 'Revalidate Google Drive as a rebuild source contract', owner: 'Source Contracts' },
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
    title: 'Define and prove the first trusted assistant loop',
    scope: 'foundation',
    lane: closeCard ? 'done' : normalizedStage === 'building_now' ? 'executing' : 'scoped',
    priority: 'P0',
    rank: 7,
    source: 'Foundation reset audit, agent-runtime contracts, and trusted-loop overnight continuation.',
    summary: 'Narrow the rebuild to one assistant loop that is actually trustworthy: strategy docs, Foundation memory, Gmail, Google Calendar, and Google Drive, with explicit boundaries on what is not yet allowed into the loop.',
    whyItMatters: 'The rebuild will fail by widening too early, not by lacking ideas. One trusted loop becomes the proof point that every future connector, memory layer, or agent surface can build on.',
    nextAction: closeCard
      ? `Done under ${CLOSEOUT_KEY}. Continue ${NEXT_CARD_ID} unless raw health or repeated-failure gates go red.`
      : 'Define and prove the allowed tools, source prerequisites, read-write boundaries, and success checks; do not launch runtime, provider calls, live extraction, or external writes.',
    statusNote: closeCard
      ? `Closed under ${CLOSEOUT_KEY}; first trusted assistant loop contract is ready as the gate before broader assistant/source expansion.`
      : `Executing ${CLOSEOUT_KEY}; contract/proof only, no runtime launch.`,
    owner: 'Foundation Agent Runtime',
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/agent-live-answer-preflight-gate.js',
      'lib/agent-capability-registry.js',
      'lib/agent-template-runtime-contract.js',
      'lib/personal-agent-onboarding-contract.js',
      'lib/role-assistant-contracts.js',
      'lib/harlan-project-registry.js',
      'lib/harlan-operator-loop.js',
    ],
    existingDocs: [
      'docs/agents/personal-agent-onboarding.md',
      'docs/agents/role-assistant-contracts.md',
      'docs/agents/harlan-project-registry.md',
      'docs/agents/harlan-operator-loop.md',
      'docs/rebuild/agent-architecture.md',
      'docs/source-registry.md',
    ],
    existingScripts: [
      'scripts/process-agent-live-answer-preflight-gate-check.mjs',
      'scripts/process-agent-capability-registry-check.mjs',
      'scripts/process-harlan-operator-loop-check.mjs',
    ],
    existingPolicy: [
      'Current claims require live evidence.',
      'Capabilities must be registry-declared before use.',
      'Personal profile and memory values stay private/local unless explicitly approved.',
      'External writes, Drive permission mutation, Calendar writes, provider/model calls, broad extraction, and credential/source changes stay approval-bound.',
      'Blockers block unsafe actions, not the whole sprint.',
    ],
    reused: [
      'live-answer preflight',
      'capability registry',
      'agent template contract',
      'personal-agent onboarding',
      'role assistant contracts',
      'Harlan project registry',
      'Harlan operator loop',
      'source contract registry',
    ],
    notRebuilt: [
      'No Harlan runtime launch.',
      'No new connector authority.',
      'No provider/model call.',
      'No live extraction or broad backfill.',
      'No external send/write.',
    ],
    exactGap: 'No single contract currently ties the first trusted assistant loop to source prerequisites, allowed inputs, action boundaries, and blocked-action behavior.',
    overBroadRisk: 'The card can drift into building a live agent. V1 remains reusable contract/proof only.',
    readyBy: 'Steve',
    readyAt: '2026-05-20T01:55:00-04:00',
  }
}

function buildSprintItem({ item, order, closeCard = false, active = false, stage = 'building_now' } = {}) {
  const isTarget = item.cardId === CARD_ID
  const itemStage = isTarget
    ? closeCard ? 'done_this_sprint' : normalizeStage(stage)
    : active ? 'scoping' : 'scoping'
  return {
    cardId: item.cardId,
    order,
    stage: itemStage,
    planRef: isTarget ? PLAN_PATH : null,
    definitionOfDone: isTarget
      ? 'Trusted assistant loop contract defines allowed sources, inputs, actions, output evidence, failure policy, and not-next boundaries; unsafe/missing/runtime fixtures fail closed; full gates pass.'
      : 'Scope and build only after the active blocker reaches this card and a focused plan/proof exists.',
    proofCommands: isTarget
      ? PROOF_COMMANDS
      : [
          'scope-first: create plan/approval/focused proof before implementation',
          'npm run process:system-health-nightly-audit-check -- --json',
          'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
          'npm run backlog:hygiene -- --json',
          'npm run foundation:verify -- --json-summary',
        ],
    readinessBlockerCleared: isTarget ? 'FOUNDATION-OVERNIGHT-CLOSEOUT-AND-MORNING-READINESS-001 opened this safe continuation sprint.' : `${CARD_ID} closes the first trusted assistant loop gate.`,
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      owner: item.owner,
      closeoutKey: isTarget ? CLOSEOUT_KEY : null,
      approvalRef: isTarget ? APPROVAL_PATH : null,
      inheritedFrom: closeCard && !isTarget ? CLOSEOUT_KEY : undefined,
    },
  }
}

function buildSprintItems({ closeCard = false, stage = 'building_now' } = {}) {
  return CONTINUATION_ITEMS.map((item, index) => buildSprintItem({
    item,
    order: index + 1,
    closeCard,
    stage,
    active: closeCard && item.cardId === NEXT_CARD_ID,
  }))
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-slice-001')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result
      `,
      [
        `slice-001-${stableRunId(PLAN_PATH)}`,
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
        VALUES ($1,'backlog_items',$2,'codex-slice-001',$3,$4::jsonb)
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
    operation: 'create/update SLICE-001 card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage, planReview })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'Prove one trusted assistant loop and then continue safe Foundation surfaces without widening too early.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          stage: closeCard ? 'next_scoping' : normalizeStage(stage),
          startedBy: 'codex-slice-001',
          currentStatus: closeCard ? 'next_scoping' : normalizeStage(stage),
          closeoutKey: CLOSEOUT_KEY,
          nextAction: closeCard ? `Commit/push, then continue ${NEXT_CARD_ID}.` : 'Ship trusted loop contract/proof only; no runtime launch.',
          priorityOrder: CONTINUATION_ITEMS.map(item => item.cardId),
          notNext: NOT_NEXT,
          exitCriteria: [
            'Required source prerequisites and read-only inputs are declared.',
            'External writes, Drive permission changes, broad extraction, model/provider runs, and hidden subagents fail closed.',
            'Approval-bound blockers park the unsafe action and continue safe work.',
          ],
        },
      },
      items: buildSprintItems({ closeCard, stage }),
    },
    'codex-slice-001',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'Steve approved continuous Foundation execution after overnight closeout.',
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
    declaredRisk: 'Trusted assistant loop runtime boundary',
    repoRoot,
  })
  const writeRequested = args.apply || args.closeCard || isProcessCheckWriteRequested({
    argv: process.argv.slice(2),
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  if (writeRequested) await ensureLiveState({ closeCard: args.closeCard, stage: args.stage, planReview })

  const sprint = await getActiveFoundationCurrentSprint()
  const sprintCardIds = (sprint.items || []).map(item => item.cardId).filter(Boolean)
  const cardIds = Array.from(new Set([CARD_ID, NEXT_CARD_ID, ...PREREQ_CARD_IDS, ...sprintCardIds]))
  const [
    approval,
    packageJson,
    moduleSource,
    scriptSource,
    runtimeVerifierSource,
    coverageSource,
    closeoutRecordsSource,
    trustedLoopDoc,
    harlanDoc,
    agentsReadme,
    closeoutDoc,
    cards,
    planCriticRuns,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile('package.json').then(JSON.parse),
    readRepoFile('lib/trusted-assistant-loop.js'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/foundation-runtime-reliability-verifier.js'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-agent-runtime-records.js'),
    readRepoFile(DOC_PATH),
    readRepoFile('docs/agents/harlan.md'),
    readRepoFile('docs/agents/README.md'),
    readRepoFile(CLOSEOUT_PATH, { optional: true }),
    getBacklogItemsByIds(cardIds),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])
  await closeFoundationDb()

  const card = cards.find(item => item.id === CARD_ID) || null
  const nextCard = cards.find(item => item.id === NEXT_CARD_ID) || null
  const prereqCards = PREREQ_CARD_IDS.map(cardId => cards.find(item => item.id === cardId) || null)
  const sprintItem = (sprint.items || []).find(item => item.cardId === CARD_ID) || null
  const nextSprintItem = (sprint.items || []).find(item => item.cardId === NEXT_CARD_ID) || null
  const closeouts = getFoundationBuildCloseouts()
  const closeout = closeouts.find(record => record.key === CLOSEOUT_KEY) || null
  const currentSprintStatus = buildFoundationCurrentSprintStatus({ sprint: sprint.sprint, items: sprint.items, backlogItems: cards, closeouts, planCriticRuns })
  const scaffold = validateBuildLaneCardScaffold(card || {})
  const sprintMetadata = validateBuildLaneSprintItemMetadata(sprintItem || {})
  const contractStatus = evaluateTrustedAssistantLoopContract(buildTrustedAssistantLoopContract())
  const dogfood = buildTrustedAssistantLoopDogfoodProof()

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(failure => failure.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', buildPlanCriticResultSummary(planReview))
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, card?.priority === 'P0' && ['executing', 'done'].includes(card?.lane), 'live backlog card exists and is staged', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, scaffold.ok, 'live backlog card passes scaffold guard', scaffold.missing.join(', ') || 'complete')
  addCheck(checks, sprint.sprint?.sprintId === SPRINT_ID, 'Current Sprint overlay is active for this card', sprint.sprint?.sprintId || 'missing')
  addCheck(checks, sprint.sprint?.activeBlockerCardId === (args.closeCard ? NEXT_CARD_ID : CARD_ID), 'Current Sprint active blocker matches expected card', sprint.sprint?.activeBlockerCardId || 'missing')
  addCheck(checks, sprintMetadata.ok, 'Current Sprint item metadata is complete', sprintMetadata.missing.join(', ') || 'complete')
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint status is healthy', currentSprintStatus.findings?.map(item => item.detail || item.check).join('; ') || 'healthy')
  addCheck(checks, prereqCards.every(item => item?.lane === 'done'), 'trusted loop prerequisites are done', prereqCards.map(item => `${item?.id || 'missing'}:${item?.lane || 'missing'}`).join(', '))
  addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'next safe card remains live', nextCard ? `${nextCard.lane}/${nextCard.priority}` : 'missing')
  addCheck(checks, args.closeCard ? nextSprintItem?.stage === 'scoping' : true, 'closeout keeps next card scoped instead of stopping', nextSprintItem ? `${NEXT_CARD_ID}:${nextSprintItem.stage}` : 'not closing')
  addCheck(checks, contractStatus.ok && contractStatus.summary.inputCount >= 8, 'healthy trusted assistant loop contract passes', contractStatus.status)
  addCheck(checks, dogfood.ok, 'dogfood rejects unsafe trusted-loop contracts', dogfood.invariant)
  addCheck(checks, dogfood.missingSourceRejected && dogfood.missingInputRejected && dogfood.memoryOnlyClaimRejected && dogfood.repoMemoryLeakRejected, 'dogfood covers source/input/memory failures', JSON.stringify({ source: dogfood.missingSourceRejected, input: dogfood.missingInputRejected, memoryOnly: dogfood.memoryOnlyClaimRejected, repoLeak: dogfood.repoMemoryLeakRejected }))
  addCheck(checks, dogfood.unsafeDefaultWriteRejected && dogfood.liveRuntimeRejected && dogfood.broadExtractionRejected && dogfood.stopsWholeSprintRejected && dogfood.missingOutputRejected, 'dogfood covers write/runtime/extraction/progression/output failures', JSON.stringify({ write: dogfood.unsafeDefaultWriteRejected, runtime: dogfood.liveRuntimeRejected, extraction: dogfood.broadExtractionRejected, stop: dogfood.stopsWholeSprintRejected, output: dogfood.missingOutputRejected }))
  addCheck(checks, packageJson.scripts?.['process:slice-001-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:slice-001-check'] || 'missing')
  addCheck(checks, moduleSource.includes('buildTrustedAssistantLoopDogfoodProof') && moduleSource.includes('park_action_continue_safe_work'), 'module owns trusted-loop behavior proof', 'lib/trusted-assistant-loop.js')
  addCheck(checks, trustedLoopDoc.includes('Contract V1') && trustedLoopDoc.includes('Source Prerequisites') && trustedLoopDoc.includes('Blockers block actions'), 'trusted loop doc captures contract v1', DOC_PATH)
  addCheck(checks, harlanDoc.includes('Trusted Assistant Loop') && agentsReadme.includes('Trusted Assistant Loop'), 'agent docs link trusted loop', 'docs/agents/harlan.md / README.md')
  addCheck(checks, runtimeVerifierSource.includes('buildTrustedAssistantLoopDogfoodProof') && runtimeVerifierSource.includes('SLICE-001'), 'runtime reliability verifier covers SLICE-001', 'lib/foundation-runtime-reliability-verifier.js')
  addCheck(checks, coverageSource.includes('TRUSTED_ASSISTANT_LOOP_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE') && coverageSource.includes(CARD_ID), 'verifier coverage IDs include SLICE-001', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(CARD_ID), 'closeout registry record is registered', closeout?.key || 'missing')
  addCheck(checks, closeoutRecordsSource.includes(CLOSEOUT_KEY) && closeoutRecordsSource.includes(CARD_ID), 'closeout registry source contains card and key', CLOSEOUT_KEY)
  addCheck(checks, await repoFileExists(CLOSEOUT_PATH), 'closeout handoff exists', CLOSEOUT_PATH)
  addCheck(checks, closeoutDoc.includes('does not launch Harlan') && closeoutDoc.includes('blockers block actions'), 'closeout documents runtime and progression boundary', CLOSEOUT_PATH)
  const forbiddenRuntimeTokens = [
    ['spawn', '('].join(''),
    ['exec', 'File('].join(''),
    ['foundation', ':job'].join(''),
  ]
  addCheck(checks, !forbiddenRuntimeTokens.some(token => scriptSource.includes(token)), 'focused proof does not launch jobs or runtime side effects', SCRIPT_PATH)
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
    nextCardId: args.closeCard ? NEXT_CARD_ID : null,
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
