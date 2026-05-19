#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
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
  FOUNDATION_UP_CAPABILITY_REGISTRY_APPROVAL_PATH as APPROVAL_PATH,
  FOUNDATION_UP_CAPABILITY_REGISTRY_CARD_ID as CARD_ID,
  FOUNDATION_UP_CAPABILITY_REGISTRY_CHANGED_FILES as CHANGED_FILES,
  FOUNDATION_UP_CAPABILITY_REGISTRY_CLOSEOUT_KEY as CLOSEOUT_KEY,
  FOUNDATION_UP_CAPABILITY_REGISTRY_CLOSEOUT_PATH as CLOSEOUT_PATH,
  FOUNDATION_UP_CAPABILITY_REGISTRY_NEXT_CARD_ID as NEXT_CARD_ID,
  FOUNDATION_UP_CAPABILITY_REGISTRY_NOT_NEXT_BOUNDARIES as NOT_NEXT,
  FOUNDATION_UP_CAPABILITY_REGISTRY_PLAN_PATH as PLAN_PATH,
  FOUNDATION_UP_CAPABILITY_REGISTRY_PROOF_COMMANDS as PROOF_COMMANDS,
  FOUNDATION_UP_CAPABILITY_REGISTRY_SCRIPT_PATH as SCRIPT_PATH,
  FOUNDATION_UP_CAPABILITY_REGISTRY_SPRINT_ID as SPRINT_ID,
  buildFoundationUpCapabilityRegistry,
  buildFoundationUpCapabilityRegistryDogfoodProof,
  evaluateFoundationUpCapabilityRegistry,
  renderFoundationUpCapabilityRegistryReport,
} from '../lib/foundation-up-capability-registry.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
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
  if (args.closeCard) args.stage = 'done_this_sprint'
  return args
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

function stableRunId(value = '') {
  return crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 12)
}

function lineCount(source = '') {
  return String(source || '').split('\n').length
}

async function readRepoFile(relativePath, { optional = false } = {}) {
  try {
    return await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
  } catch (error) {
    if (optional && error?.code === 'ENOENT') return ''
    throw error
  }
}

function buildCardRow({ closeCard = false } = {}) {
  return {
    id: CARD_ID,
    title: 'Foundation-up capability registry',
    scope: 'foundation',
    lane: closeCard ? 'done' : 'executing',
    priority: 'P0',
    rank: 151,
    source: '2026-05-17 main-chat hard checkpoint',
    summary: 'Require provider/tool capabilities like Fal, ElevenLabs, Canva, and terminal workers to be registered Foundation-up before agent use.',
    whyItMatters: 'Prevents tool wiring from becoming Harlan-only, hub-only, or hidden-worker side systems before Foundation can prove permission, cost, audit, owner, and callable boundaries.',
    nextAction: closeCard
      ? `Done under ${CLOSEOUT_KEY}. Continue ${NEXT_CARD_ID} from repo truth; provider/tool use still requires separate approval.`
      : 'Scope and prove the Foundation-up provider/tool capability contract without calling providers, spending credits, launching workers, or granting agent runtime authority.',
    statusNote: closeCard
      ? `Closed under ${CLOSEOUT_KEY}; provider/tool capabilities are registered but runtime/provider/agent use remains blocked pending separate approval.`
      : `Executing ${CLOSEOUT_KEY}; registration/proof only, no provider/tool side effects.`,
    owner: 'Foundation',
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/agent-capability-registry.js',
      'lib/canva-client.js',
      'lib/extraction-parallel-worker-protocol.js',
      'lib/foundation-agent-usefulness-runtime-gates.js',
      'lib/llm-credential-registry.js',
    ],
    existingDocs: [
      'docs/process/agent-capability-registry-001-plan.md',
      'docs/process/canva-client-001-plan.md',
      'docs/process/extraction-parallel-worker-protocol-001-plan.md',
      'docs/rebuild/agent-architecture.md',
    ],
    existingScripts: [
      'scripts/process-agent-capability-registry-check.mjs',
      'scripts/process-canva-client-check.mjs',
      'scripts/process-extraction-parallel-worker-protocol-check.mjs',
    ],
    existingCards: [
      'AGENT-CAPABILITY-REGISTRY-001',
      'CANVA-CLIENT-001',
      'EXTRACTION-PARALLEL-WORKER-PROTOCOL-001',
      'HARLAN-TERMINAL-RUNTIME-001',
      'FAL-IMAGE-ITERATION-TOOL-001',
      NEXT_CARD_ID,
    ],
    existingPolicy: [
      'Agent capabilities are read-only declarations until a runtime template and binding approve use.',
      'Canva has a read-only client primitive, but agent use and write/export/upload/design APIs need separate approval.',
      'Terminal workers require visible worktree/branch/file ownership and wrap reports.',
      'Provider/model/media generation needs explicit budget, audit, and approval before live calls.',
    ],
    reused: [
      'Agent capability registry fail-closed pattern.',
      'Canva client read-only/rotation-safe proof.',
      'Visible worker protocol.',
      'Ship gate and Current Sprint scaffolding.',
    ],
    notRebuilt: [
      'No provider client implementation.',
      'No live Fal/ElevenLabs/Canva call.',
      'No terminal worker launch.',
      'No Harlan/Crewbert runtime authority grant.',
    ],
    exactGap: 'Provider/tool capability truth is still scattered. This card creates the Foundation-up registration contract before any agent or worker can claim/use those tools.',
    overBroadRisk: 'This can drift into provider spend, terminal execution, hidden workers, or Harlan feature work. V1 is registration and fail-closed proof only.',
    readyBy: 'Codex Foundation builder',
    readyAt: '2026-05-18T23:58:00.000-04:00',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  return {
    cardId: CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : stage,
    planRef: PLAN_PATH,
    definitionOfDone: 'Foundation-up provider/tool registry declares capability id, provider/tool kind, env refs, permission class, cost policy, audit log, callable path, owner, approval boundary, and proof for Fal, ElevenLabs, Canva, and terminal workers; unsafe/missing/live-use variants fail closed; verifier and ship gates pass.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: 'EXTRACTION-TEAM-001 closed the supervised runtime anchor and left capability use approval-bound.',
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: APPROVAL_PATH,
      closeoutKey: CLOSEOUT_KEY,
      recommendedNext: NEXT_CARD_ID,
    },
  }
}

function buildNextSprintItem() {
  return {
    cardId: NEXT_CARD_ID,
    order: 2,
    stage: 'scoping',
    planRef: null,
    definitionOfDone: 'OpenClaw native memory baseline is safely scoped/proven or blocked without leaking private memory or breaking runtime truth.',
    proofCommands: [
      'scope-first: create plan/approval/focused proof before implementation',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    readinessBlockerCleared: `${CARD_ID} closed Foundation-up provider/tool registration.`,
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      inheritedFrom: CARD_ID,
      nextAfterCloseoutKey: CLOSEOUT_KEY,
    },
  }
}

async function upsertLiveCardAndPlanCritic({ closeCard = false, planReview } = {}) {
  const pool = createPool()
  const client = await pool.connect()
  const row = buildCardRow({ closeCard })
  try {
    await client.query('BEGIN')
    await client.query(
      `
        INSERT INTO backlog_items (id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note, owner, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,'codex-foundation-up-capability-registry')
        ON CONFLICT (run_id) DO UPDATE SET
          status = EXCLUDED.status,
          score = EXCLUDED.score,
          changed_files = EXCLUDED.changed_files,
          findings = EXCLUDED.findings,
          result = EXCLUDED.result
      `,
      [
        `foundation-up-capability-registry-${stableRunId(PLAN_PATH)}`,
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
        VALUES ($1,'backlog_items',$2,'codex-foundation-up-capability-registry',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        CARD_ID,
        `${closeCard ? 'Closed' : 'Updated'} ${CARD_ID}.`,
        JSON.stringify({ closeoutKey: CLOSEOUT_KEY, lane: row.lane }),
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
    operation: 'create/update Foundation-up capability registry card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, planReview })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'Register provider/tool capabilities Foundation-up before agent use.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : stage,
          startedBy: 'codex-foundation-up-capability-registry',
          currentStatus: closeCard ? 'next_scoping' : stage,
          closeoutKey: CLOSEOUT_KEY,
          nextAction: closeCard
            ? `Continue ${NEXT_CARD_ID} from repo truth; do not run provider/tool side effects from this card.`
            : 'Build provider/tool capability registration and fail-closed dogfood.',
          priorityOrder: [CARD_ID, NEXT_CARD_ID],
          notNext: NOT_NEXT,
          exitCriteria: [
            'Fal, ElevenLabs, Canva, and terminal worker capabilities are registered with required Foundation-up fields.',
            'Provider calls, paid spend, terminal worker launch, hidden workers, external writes, and secret values fail closed.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: closeCard
        ? [buildSprintItem({ closeCard, stage }), buildNextSprintItem()]
        : [buildSprintItem({ closeCard, stage })],
    },
    'codex-foundation-up-capability-registry',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'Steve prioritized Foundation-up tool/provider capability safety before agent use.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  const planSource = await readRepoFile(PLAN_PATH)
  const planCritic = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard }),
    changedFiles: CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
  })
  if ((args.apply || args.closeCard || isProcessCheckWriteRequested({ argv: process.argv.slice(2) })) &&
    !(planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE)) {
    throw new Error(`Plan Critic must pass before write. status=${planCritic.status} score=${planCritic.score}`)
  }
  if (args.apply || args.closeCard || isProcessCheckWriteRequested({ argv: process.argv.slice(2) })) {
    await ensureLiveState({ closeCard: args.closeCard, stage: args.stage, planReview: planCritic })
  }

  const [
    approval,
    cards,
    sprint,
    planCriticRuns,
    packageSource,
    scriptSource,
    moduleSource,
    verifierSource,
    closeoutRecordsSource,
    closeoutDoc,
    currentPlan,
    currentState,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([CARD_ID]),
    readRepoFile('package.json'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/foundation-up-capability-registry.js'),
    readRepoFile('lib/foundation-runtime-reliability-verifier.js'),
    readRepoFile('lib/foundation-build-closeout-agent-runtime-records.js'),
    readRepoFile(CLOSEOUT_PATH, { optional: true }),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
  ])

  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === CARD_ID) || null
  const nextCard = cards.find(item => item.id === NEXT_CARD_ID) || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === CARD_ID) || null
  const nextSprintItem = (sprint.items || []).find(item => item.cardId === NEXT_CARD_ID) || null
  const registry = buildFoundationUpCapabilityRegistry()
  const status = evaluateFoundationUpCapabilityRegistry(registry)
  const dogfood = buildFoundationUpCapabilityRegistryDogfoodProof()
  const renderedReport = renderFoundationUpCapabilityRegistryReport(registry)
  const closeouts = getFoundationBuildCloseouts()
  const closeout = closeouts.find(record => record.key === CLOSEOUT_KEY)
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: sprint.sprint,
    items: sprint.items,
    closeouts,
    planCriticRuns,
  })
  const durablePlanCriticPass = planCriticRuns.some(run =>
    run.cardId === CARD_ID &&
      run.status === 'pass' &&
      Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )

  addCheck(checks, approval.ok, 'approval validates at 9.8+', approval.failures?.map(check => check.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', `status=${planCritic.status} score=${planCritic.score}/10`)
  addCheck(checks, durablePlanCriticPass, 'durable Plan Critic pass row exists', durablePlanCriticPass ? 'pass' : 'missing')
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live Foundation-up capability card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, nextCard && ['scoped', 'research', 'executing', 'done'].includes(nextCard.lane), 'next repo-truth card exists', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains capability item', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  if (args.closeCard || card?.lane === 'done') {
    addCheck(checks, nextSprintItem?.stage === 'scoping', 'Current Sprint advances next card after closeout', nextSprintItem ? `${nextSprintItem.cardId}:${nextSprintItem.stage}` : 'missing')
  }
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint overlay metadata is healthy', currentSprintStatus.findings?.map(finding => finding.message || finding.detail || finding.check).join(', ') || currentSprintStatus.status)
  addCheck(checks, status.ok && status.status === 'ready', 'Foundation-up capability registry is ready', JSON.stringify(status.violations))
  addCheck(checks, status.summary.capabilityCount >= 4 && status.summary.meteredCapabilityCount >= 2 && status.summary.blockedBindingCount >= 4, 'required provider/tool capabilities are registered and blocked', JSON.stringify(status.summary))
  addCheck(checks, dogfood.ok, 'dogfood rejects missing fields, early approval, hidden workers, destructive terminal, side effects, and secret leaks', JSON.stringify(dogfood.cases))
  addCheck(checks, registry.liveProviderCallsStarted === false && registry.paidSpendStarted === false && registry.terminalWorkersLaunched === false && registry.hiddenSubagentsSpawned === false, 'no provider spend, terminal launch, or hidden workers started', JSON.stringify({ liveProviderCallsStarted: registry.liveProviderCallsStarted, paidSpendStarted: registry.paidSpendStarted, terminalWorkersLaunched: registry.terminalWorkersLaunched, hiddenSubagentsSpawned: registry.hiddenSubagentsSpawned }))
  addCheck(checks, closeoutDoc.includes(CARD_ID) && closeoutDoc.includes(CLOSEOUT_KEY), 'closeout handoff exists and names card/closeout', CLOSEOUT_PATH)
  addCheck(checks, renderedReport.includes('Fal image generation') && renderedReport.includes('Not approved'), 'rendered report summarizes registered capabilities and blocked use', 'report renderer')
  addCheck(checks, verifierSource.includes(CARD_ID) && verifierSource.includes('buildFoundationUpCapabilityRegistryDogfoodProof'), 'runtime reliability verifier covers Foundation-up capability registry', 'lib/foundation-runtime-reliability-verifier.js')
  addCheck(checks, closeoutRecordsSource.includes(CLOSEOUT_KEY) && closeout?.operatorCloseout === true, 'closeout registry includes Foundation-up capability closeout', CLOSEOUT_KEY)
  addCheck(checks, currentPlan.includes(CLOSEOUT_KEY) && currentPlan.includes(NEXT_CARD_ID), 'current plan names closeout and next card', 'docs/rebuild/current-plan.md')
  addCheck(checks, currentState.includes(CLOSEOUT_KEY) && currentState.includes(NEXT_CARD_ID), 'current state names closeout and next card', 'docs/rebuild/current-state.md')
  addCheck(checks, packageJson.scripts?.['process:foundation-up-capability-registry-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package registers focused proof script', 'process:foundation-up-capability-registry-check')
  addCheck(checks, lineCount(moduleSource) <= 1500, 'capability registry module remains under preferred module budget', `${lineCount(moduleSource)} lines`)
  addCheck(checks, lineCount(scriptSource) <= 1500, 'focused proof script remains under preferred module budget', `${lineCount(scriptSource)} lines`)

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    summary: {
      passed: checks.length - failed.length,
      total: checks.length,
      capabilityCount: status.summary.capabilityCount,
      recommendedNext: NEXT_CARD_ID,
    },
    checks,
    failures: failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Foundation-up capability registry proof: ${result.summary.passed}/${result.summary.total}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} -> ${check.detail}`)
    }
  }

  await closeFoundationDb()
  if (!result.ok) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
})
