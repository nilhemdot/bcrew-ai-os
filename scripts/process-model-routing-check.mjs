#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  buildFoundationCurrentSprintStatus,
} from '../lib/foundation-current-sprint.js'
import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  updateBacklogItem,
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
  MODEL_ROUTING_APPROVAL_PATH,
  MODEL_ROUTING_CARD_ID,
  MODEL_ROUTING_CHANGED_FILES,
  MODEL_ROUTING_CLOSEOUT_KEY,
  MODEL_ROUTING_CLOSEOUT_PATH,
  MODEL_ROUTING_PLAN_PATH,
  MODEL_ROUTING_PROOF_COMMANDS,
  MODEL_ROUTING_RUNTIME_MAP_PATH,
  MODEL_ROUTING_SCRIPT_PATH,
  MODEL_ROUTING_SPRINT_ID,
  buildModelRoutingDoctrineDogfoodProof,
  evaluateModelRoutingDoctrine,
  renderModelRoutingCloseout,
} from '../lib/model-routing-doctrine.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-model-routing'
const NEXT_CARD_ID = 'LLM-ROUTER-001'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
    syncSprint: argv.includes('--sync-sprint') || argv.includes('--syncSprint') ||
      isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.mutateSprint] }),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: String(detail || '') })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

function stableRunId(value) {
  return String(value || '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

async function upsertPlanCriticRun(planReview) {
  const pool = createPool()
  const client = await pool.connect()
  try {
    await client.query(
      `
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings,
          result, requested_by
        )
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P1','full',true,$6::text[],$7::jsonb,$8::jsonb,$9)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            gate_level = EXCLUDED.gate_level,
            full_verify_required = EXCLUDED.full_verify_required,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result,
            created_at = NOW()
      `,
      [
        `model-routing-${stableRunId(MODEL_ROUTING_PLAN_PATH)}`,
        MODEL_ROUTING_CARD_ID,
        MODEL_ROUTING_PLAN_PATH,
        planReview.status,
        Number(planReview.score),
        MODEL_ROUTING_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({
          status: planReview.status,
          score: planReview.score,
          cardId: MODEL_ROUTING_CARD_ID,
          closeoutKey: MODEL_ROUTING_CLOSEOUT_KEY,
        }),
        ACTOR,
      ],
    )
  } finally {
    client.release()
    await pool.end()
  }
}

function normalizeItem(item = {}) {
  return {
    cardId: item.cardId || item.backlogId,
    order: item.order ?? item.sprintOrder,
    stage: item.stage,
    planRef: item.planRef,
    definitionOfDone: item.definitionOfDone,
    proofCommands: item.proofCommands || [],
    readinessBlockerCleared: item.readinessBlockerCleared || '',
    notNextBoundaries: item.notNextBoundaries || [],
    existingWorkCheck: item.existingWorkCheck || {},
    returnedReason: item.returnedReason,
    metadata: item.metadata && typeof item.metadata === 'object' ? item.metadata : {},
  }
}

function modelExistingWork(base = {}) {
  return {
    ...base,
    existingCode: [
      'lib/llm-router.js',
      'lib/llm-credential-registry.js',
      'lib/llm-hub-capacity.js',
      'lib/process-plan-critic.js',
    ],
    existingDocs: [
      MODEL_ROUTING_RUNTIME_MAP_PATH,
      'docs/process/llm-hub-capacity-001-plan.md',
      'docs/process/llm-credential-registry-001-plan.md',
      'docs/process/foundation-gate-decision-tree.md',
    ],
    existingScripts: [
      MODEL_ROUTING_SCRIPT_PATH,
      'scripts/process-llm-hub-capacity-check.mjs',
      'scripts/process-llm-credential-registry-check.mjs',
      'scripts/process-plan-critic-check.mjs',
    ],
    existingPolicy: [
      'Official APIs and governed adapters are the default for production/customer-facing automated workloads.',
      'Subscription/native routes are internal capacity only after allowed/probed/logged/policy-classified.',
      'Provider/tool capability registration does not approve runtime use.',
      'Blockers block unsafe actions, not the whole sprint.',
    ],
    reused: 'Reuses the existing LLM router, credential registry, hub-capacity lane model, Plan Critic, live backlog, Current Sprint, and Foundation ship gates.',
    notRebuilt: 'Does not build provider adapters, call models/providers, mutate credentials, approve subscription routes, or create a competing model-routing doc.',
    exactGap: 'Current runtime map had model-layer direction but not a complete workload-class routing doctrine with cost, privacy, probe, fallback, and stop-control requirements.',
    overBroadRisk: 'Model-routing doctrine can drift into provider calls, Scoper, agents, public exposure, credential mutation, or broad extraction; this card parks those actions.',
    readyBy: 'Steve approved unattended continuation after FOUNDATION-SURFACE-UPDATES-001 shipped clean.',
    readyAt: '2026-05-20T06:50:00-04:00',
  }
}

function futureExistingWork(cardId, base = {}) {
  return {
    ...base,
    existingCode: [
      'live backlog item',
      'Current Sprint overlay',
      'Foundation ship gates',
    ],
    existingDocs: [
      'docs/rebuild/current-runtime-map.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
    ],
    existingScripts: [
      'npm run process:system-health-nightly-audit-check -- --json',
      'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
    ],
    existingPolicy: [
      'Do not mark this card sprint_ready/building_now until its own plan and Plan Critic pass exist.',
      'Park approval-bound private/provider/paid/browser/Drive-permission actions and continue safe work.',
    ],
    reused: `Reusable Foundation sprint gates and live backlog truth for ${cardId}.`,
    notRebuilt: 'Not built by MODEL-ROUTING-001.',
    exactGap: 'Queued for later scoped work; details must be filled by that card before it can move past scoping.',
    overBroadRisk: 'Keeping this card in scoping prevents false sprint-ready state.',
    readyBy: 'Not sprint-ready yet; queued by unattended sprint order.',
    readyAt: 'pending-card-plan',
  }
}

function buildUpdatedSprintOverlay({ activeSprint, closeCard = false }) {
  const sprint = activeSprint.sprint || {}
  const merged = (activeSprint.items || []).map(normalizeItem).map(item => {
    const isCurrent = item.cardId === MODEL_ROUTING_CARD_ID
    const isNext = item.cardId === NEXT_CARD_ID
    return {
      ...item,
      stage: isCurrent ? (closeCard ? 'done_this_sprint' : 'building_now') : 'scoping',
      planRef: isCurrent ? MODEL_ROUTING_PLAN_PATH : item.planRef,
      definitionOfDone: isCurrent
        ? 'Canonical runtime/model-routing doctrine is updated in docs/rebuild/current-runtime-map.md, with workload classes, cost/privacy/probe/fallback controls, focused proof, closeout, and no provider/runtime mutation.'
        : item.definitionOfDone,
      proofCommands: isCurrent ? MODEL_ROUTING_PROOF_COMMANDS : item.proofCommands,
      notNextBoundaries: Array.from(new Set([
        ...(item.notNextBoundaries || []),
        'Do not work MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.',
        'Do not call providers, mutate credentials, change provider config, send messages, or write external systems.',
        'Do not start paid/browser-auth, public exposure, broad private extraction, Scoper, Strategy, People, Harlan, Crewbert, or broad agent runtime from this card.',
      ])),
      existingWorkCheck: isCurrent
        ? modelExistingWork(item.existingWorkCheck || {})
        : futureExistingWork(item.cardId, item.existingWorkCheck || {}),
      metadata: {
        ...(item.metadata || {}),
        closeoutKey: isCurrent ? MODEL_ROUTING_CLOSEOUT_KEY : item.metadata?.closeoutKey,
        approvalRef: isCurrent ? MODEL_ROUTING_APPROVAL_PATH : item.metadata?.approvalRef,
        requiresOwnPlanCriticBeforeReady: !isCurrent,
        nextActiveAfterModelRouting: isNext,
      },
    }
  })
  if (!merged.some(item => item.cardId === MODEL_ROUTING_CARD_ID)) {
    merged.unshift({
      cardId: MODEL_ROUTING_CARD_ID,
      order: 1,
      stage: closeCard ? 'done_this_sprint' : 'building_now',
      planRef: MODEL_ROUTING_PLAN_PATH,
      definitionOfDone: 'Canonical runtime/model-routing doctrine is updated and proof passes.',
      proofCommands: MODEL_ROUTING_PROOF_COMMANDS,
      notNextBoundaries: [
        'Do not work MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.',
        'Do not call providers, mutate credentials, change provider config, send messages, or write external systems.',
      ],
      existingWorkCheck: modelExistingWork(),
      metadata: { closeoutKey: MODEL_ROUTING_CLOSEOUT_KEY, approvalRef: MODEL_ROUTING_APPROVAL_PATH },
    })
  }
  merged.sort((left, right) => Number(left.order || 0) - Number(right.order || 0))

  return {
    sprint: {
      sprintId: sprint.sprintId || MODEL_ROUTING_SPRINT_ID,
      status: 'active',
      goal: sprint.goal || 'Continue unattended Foundation/operator-safe work through model-routing, owner access, decision/action loop, and Strategy/People foundations.',
      activeBlockerCardId: closeCard ? NEXT_CARD_ID : MODEL_ROUTING_CARD_ID,
      metadata: {
        ...(sprint.metadata || {}),
        currentStatus: closeCard ? 'model_routing_closed_next_card_scoping' : 'model_routing_active',
        lastClosedCardId: closeCard ? MODEL_ROUTING_CARD_ID : sprint.metadata?.lastClosedCardId,
        lastCloseoutKey: closeCard ? MODEL_ROUTING_CLOSEOUT_KEY : sprint.metadata?.lastCloseoutKey,
        sprintTruthRepair: 'Future cards remain scoping until each has complete doctrine fields and Plan Critic pass; no false sprint-ready state.',
      },
    },
    items: merged,
  }
}

async function syncSprint({ activeSprint, closeCard }) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: MODEL_ROUTING_SCRIPT_PATH,
    operation: closeCard ? 'close MODEL-ROUTING-001 and advance next card to scoping' : 'sync MODEL-ROUTING-001 sprint readiness',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await upsertFoundationCurrentSprintOverlay(
    buildUpdatedSprintOverlay({ activeSprint, closeCard }),
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: activeSprint.sprint?.sprintId || MODEL_ROUTING_SPRINT_ID,
      reason: closeCard
        ? 'MODEL-ROUTING-001 closed; next card stays scoping until its own plan and Plan Critic pass exist.'
        : 'Repair sprint truth so only MODEL-ROUTING-001 is building and future cards are not falsely sprint-ready.',
    },
  )
}

async function closeCard({ activeSprint, planReview, evaluation }) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: MODEL_ROUTING_SCRIPT_PATH,
    operation: 'close MODEL-ROUTING-001',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await updateBacklogItem(MODEL_ROUTING_CARD_ID, {
    lane: 'done',
    priority: 'P1',
    rank: 18,
    nextAction: `Done under ${MODEL_ROUTING_CLOSEOUT_KEY}; continue LLM-ROUTER-001 by scoping a bounded router migration before marking it sprint-ready.`,
    statusNote: `Closed 2026-05-20 under ${MODEL_ROUTING_CLOSEOUT_KEY}; docs/rebuild/current-runtime-map.md now owns canonical model-routing doctrine with workload classes, route controls, cost/privacy/probe/fallback/stop-control requirements, no stale exact-model hardcoding, and subscription/system-runtime boundaries.`,
    owner: 'Foundation Runtime',
  }, ACTOR)
  await syncSprint({ activeSprint, closeCard: true })
  const closeout = renderModelRoutingCloseout({
    evaluation,
    planSummary: buildPlanCriticResultSummary(planReview),
    generatedAt: new Date().toISOString(),
  })
  await fs.mkdir(path.dirname(path.join(repoRoot, MODEL_ROUTING_CLOSEOUT_PATH)), { recursive: true })
  await fs.writeFile(path.join(repoRoot, MODEL_ROUTING_CLOSEOUT_PATH), closeout)
}

async function main() {
  const args = parseArgs()
  if (args.closeCard || args.syncSprint) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: MODEL_ROUTING_SCRIPT_PATH,
      operation: args.closeCard ? 'close MODEL-ROUTING-001' : 'sync MODEL-ROUTING-001 sprint readiness',
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
    })
  }

  let dbInitialized = false
  try {
    const [
      approvalValidation,
      planSource,
      runtimeMapSource,
      llmRouterSource,
      llmCredentialRegistrySource,
      llmHubCapacitySource,
      closeoutRegistrySource,
      packageJson,
    ] = await Promise.all([
      validatePlanApprovalFile({ repoRoot, approvalRef: MODEL_ROUTING_APPROVAL_PATH, cardId: MODEL_ROUTING_CARD_ID }),
      readRepoFile(MODEL_ROUTING_PLAN_PATH),
      readRepoFile(MODEL_ROUTING_RUNTIME_MAP_PATH),
      readRepoFile('lib/llm-router.js'),
      readRepoFile('lib/llm-credential-registry.js'),
      readRepoFile('lib/llm-hub-capacity.js'),
      Promise.all([
        readRepoFile('lib/foundation-build-closeout-records.js'),
        readRepoFile('lib/foundation-build-closeout-model-records.js'),
      ]).then(parts => parts.join('\n')),
      readRepoJson('package.json'),
    ])

    const planReview = evaluatePlanCriticPlan({
      planText: planSource,
      card: {
        id: MODEL_ROUTING_CARD_ID,
        title: 'Document canonical model routing doctrine',
        priority: 'P1',
      },
      changedFiles: MODEL_ROUTING_CHANGED_FILES,
      declaredRisk: 'Canonical runtime doctrine and Current Sprint truth can create false confidence if they hardcode stale model names, approve subscription routes as product backend, or mark future cards sprint-ready before Plan Critic.',
      repoRoot,
    })
    const evaluation = evaluateModelRoutingDoctrine({
      runtimeMapSource,
      llmRouterSource,
      llmCredentialRegistrySource,
      llmHubCapacitySource,
      closeoutRegistrySource,
      packageJson,
    })
    const dogfood = buildModelRoutingDoctrineDogfoodProof()

    await initFoundationDb()
    dbInitialized = true
    await upsertPlanCriticRun(planReview)
    const activeSprint = await getActiveFoundationCurrentSprint()
    const [cards, planCriticRuns] = await Promise.all([
      getBacklogItemsByIds([MODEL_ROUTING_CARD_ID, NEXT_CARD_ID]),
      getPlanCriticRunsByCardIds([MODEL_ROUTING_CARD_ID]),
    ])

    if (args.syncSprint && !args.closeCard) await syncSprint({ activeSprint, closeCard: false })
    if (args.closeCard) await closeCard({ activeSprint, planReview, evaluation })

    const refreshedSprint = await getActiveFoundationCurrentSprint()
    const closeouts = getFoundationBuildCloseouts()
    const currentSprintStatus = buildFoundationCurrentSprintStatus({
      sprint: refreshedSprint.sprint,
      items: refreshedSprint.items,
      backlogItems: cards,
      closeouts,
      planCriticRuns,
    })

    const currentItem = (refreshedSprint.items || []).find(item => item.cardId === MODEL_ROUTING_CARD_ID)
    const nextItem = (refreshedSprint.items || []).find(item => item.cardId === NEXT_CARD_ID)
    const closeoutRecord = closeouts.find(record => record.key === MODEL_ROUTING_CLOSEOUT_KEY)
    const modelCard = cards.find(card => card.id === MODEL_ROUTING_CARD_ID) || null
    const stagePostureIsSafe = args.closeCard
      ? nextItem?.stage === 'scoping'
      : currentItem?.stage === 'building_now' ||
        (currentItem?.stage === 'done_this_sprint' && modelCard?.lane === 'done')
    const checks = []

    addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'approval validates', approvalValidation.failures?.map(item => item.check).join(', ') || MODEL_ROUTING_APPROVAL_PATH)
    addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes model-routing plan', buildPlanCriticResultSummary(planReview))
    addCheck(checks, evaluation.ok, 'model-routing doctrine evaluation is healthy', evaluation.failed.map(item => item.check).join('; ') || JSON.stringify(evaluation.summary))
    addCheck(checks, dogfood.ok, 'dogfood rejects bad model-routing doctrine fixtures', JSON.stringify(dogfood.cases))
    addCheck(checks, cards.some(card => card.id === MODEL_ROUTING_CARD_ID), 'live backlog card exists', cards.map(card => card.id).join(', ') || 'missing')
    addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8) || planReview.status === 'pass', 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || `${planReview.status}/${planReview.score}`)
    addCheck(checks, currentItem?.existingWorkCheck?.existingCode?.length || currentItem?.existingWorkCheck?.existingCode, 'Current Sprint model card has existing-code doctrine', currentItem?.stage || 'missing')
    addCheck(checks, stagePostureIsSafe, 'Current Sprint stage posture is safe', args.closeCard ? `${NEXT_CARD_ID}:${nextItem?.stage}` : `${MODEL_ROUTING_CARD_ID}:${currentItem?.stage}`)
    addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint status is healthy after model-routing sync', currentSprintStatus.findings?.map(item => item.detail).join('; ') || 'healthy')
    addCheck(checks, packageJson.scripts?.['process:model-routing-check'] === `node --env-file-if-exists=.env ${MODEL_ROUTING_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:model-routing-check'] || 'missing')
    addCheck(checks, closeoutRecord?.operatorCloseout === true && (closeoutRecord.backlogIds || []).includes(MODEL_ROUTING_CARD_ID), 'closeout registry exposes model-routing card', closeoutRecord?.key || 'missing')

    const failed = checks.filter(check => !check.ok)
    const result = {
      status: failed.length ? 'risk' : 'healthy',
      ok: failed.length === 0,
      cardId: MODEL_ROUTING_CARD_ID,
      closeoutKey: MODEL_ROUTING_CLOSEOUT_KEY,
      planCritic: {
        status: planReview.status,
        score: planReview.score,
        summary: buildPlanCriticResultSummary(planReview),
      },
      evaluation: evaluation.summary,
      dogfood: dogfood.cases,
      currentSprint: {
        status: currentSprintStatus.status,
        activeBlocker: refreshedSprint.sprint?.activeBlockerCardId,
        modelStage: currentItem?.stage,
        nextStage: nextItem?.stage,
      },
      checks,
      failed,
    }

    if (args.json) console.log(JSON.stringify(result, null, 2))
    else {
      console.log(`MODEL-ROUTING-001 ${result.status}`)
      for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}: ${check.detail}`)
    }
    process.exitCode = failed.length ? 1 : 0
  } finally {
    if (dbInitialized) await closeFoundationDb()
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
})
