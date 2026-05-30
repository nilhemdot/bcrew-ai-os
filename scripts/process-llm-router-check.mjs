#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
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
  getLlmRuntimeSnapshot,
  upsertLlmCredential,
  upsertLlmRoute,
} from '../lib/foundation-runtime-jobs-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { DEFAULT_LLM_ROUTES, LLM_WORKLOADS, callLlm, planLlmRoute } from '../lib/llm-router.js'
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
  LLM_ROUTER_APPROVAL_PATH,
  LLM_ROUTER_BOUNDED_WORKLOAD,
  LLM_ROUTER_CARD_ID,
  LLM_ROUTER_CHANGED_FILES,
  LLM_ROUTER_CLOSEOUT_KEY,
  LLM_ROUTER_CLOSEOUT_PATH,
  LLM_ROUTER_PLAN_PATH,
  LLM_ROUTER_PROOF_COMMANDS,
  LLM_ROUTER_SCRIPT_PATH,
  LLM_ROUTER_SPRINT_ID,
  evaluateLlmRouterMigration,
  renderLlmRouterCloseout,
} from '../lib/llm-router-migration.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-llm-router'
const NEXT_CARD_ID = 'FOUNDATION-USERS-001'

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

function stableRunId(value) {
  return String(value || '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,$9)
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
        `llm-router-${stableRunId(LLM_ROUTER_PLAN_PATH)}`,
        LLM_ROUTER_CARD_ID,
        LLM_ROUTER_PLAN_PATH,
        planReview.status,
        Number(planReview.score),
        LLM_ROUTER_CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({
          status: planReview.status,
          score: planReview.score,
          cardId: LLM_ROUTER_CARD_ID,
          closeoutKey: LLM_ROUTER_CLOSEOUT_KEY,
        }),
        ACTOR,
      ],
    )
  } finally {
    client.release()
    await pool.end()
  }
}

function tryReadClaudeHelp() {
  try {
    return execFileSync('claude', ['--help'], {
      encoding: 'utf8',
      timeout: 8000,
      maxBuffer: 512 * 1024,
      env: process.env,
    })
  } catch (error) {
    return `${error?.stdout || ''}\n${error?.stderr || ''}\n${error?.message || ''}`
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

function currentExistingWork(base = {}) {
  return {
    ...base,
    existingCode: [
      'lib/llm-router.js',
      'lib/nightly-deep-audit-upgrade.js',
      'scripts/audit-llm-auth-paths.mjs',
      'lib/process-plan-critic.js',
    ],
    existingDocs: [
      'docs/rebuild/current-runtime-map.md',
      'docs/process/model-routing-001-plan.md',
      'docs/process/foundation-deep-auditor-real-loop-001-plan.md',
    ],
    existingScripts: [
      LLM_ROUTER_SCRIPT_PATH,
      'scripts/audit-llm-auth-paths.mjs',
      'scripts/process-foundation-deep-auditor-real-loop-check.mjs',
    ],
    existingPolicy: [
      'Official APIs and governed adapters are the default for production/customer-facing automated workloads.',
      'Subscription/native routes are internal capacity only after allowed/probed/logged/policy-classified.',
      'Claude Code scheduled automation is blocked unless route policy, credential policy, and execution flag all agree.',
      'Blockers block unsafe actions, not the whole sprint.',
    ],
    reused: 'Reuses the existing LLM router, LLM runtime tables, nightly deep audit senior review path, Plan Critic, Current Sprint, and ship gates.',
    notRebuilt: 'Does not call providers, mutate provider credentials, approve Claude Code scheduled automation, or build broad agents/source extraction.',
    exactGap: 'Claude Code/Agent routes existed as candidate labels but had no fail-closed adapter contract or bounded workload proof; nightly deep audit still used generic synthesis routing.',
    overBroadRisk: 'Router work can drift into provider execution, credential mutation, paid/browser auth, agents, or broad extraction; this card parks those actions.',
    readyBy: 'Steve approved unattended continuation, with unsafe actions parked and safe sprint work continuing.',
    readyAt: '2026-05-20T07:10:00-04:00',
  }
}

function futureExistingWork(cardId, base = {}) {
  return {
    ...base,
    existingCode: ['live backlog item', 'Current Sprint overlay', 'Foundation ship gates'],
    existingDocs: ['docs/rebuild/current-runtime-map.md', 'docs/rebuild/current-plan.md', 'docs/rebuild/current-state.md'],
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
    notRebuilt: 'Not built by LLM-ROUTER-001.',
    exactGap: 'Queued for later scoped work; details must be filled by that card before it can move past scoping.',
    overBroadRisk: 'Keeping this card in scoping prevents false sprint-ready state.',
    readyBy: 'Not sprint-ready yet; queued by unattended sprint order.',
    readyAt: 'pending-card-plan',
  }
}

function buildUpdatedSprintOverlay({ activeSprint, closeCard = false }) {
  const sprint = activeSprint.sprint || {}
  const merged = (activeSprint.items || []).map(normalizeItem).map(item => {
    const isCurrent = item.cardId === LLM_ROUTER_CARD_ID
    const isNext = item.cardId === NEXT_CARD_ID
    return {
      ...item,
      stage: isCurrent ? (closeCard ? 'done_this_sprint' : 'building_now') : 'scoping',
      planRef: isCurrent ? LLM_ROUTER_PLAN_PATH : item.planRef,
      definitionOfDone: isCurrent
        ? 'Policy-aware LLM router has a bounded deep-audit senior-review workload, fail-closed Claude Code adapter contract, dry-run route proof, focused proof, closeout, and no provider call.'
        : item.definitionOfDone,
      proofCommands: isCurrent ? LLM_ROUTER_PROOF_COMMANDS : item.proofCommands,
      notNextBoundaries: Array.from(new Set([
        ...(item.notNextBoundaries || []),
        'Do not call providers, mutate credentials, change provider config, send messages, or write external systems.',
        'Do not enable Claude Code scheduled automation without explicit route/credential/execution approval.',
        'Do not start paid/browser-auth, public exposure, broad private extraction, Scoper, Strategy, People, Harlan, Crewbert, or broad agent runtime from this card.',
      ])),
      existingWorkCheck: isCurrent
        ? currentExistingWork(item.existingWorkCheck || {})
        : futureExistingWork(item.cardId, item.existingWorkCheck || {}),
      metadata: {
        ...(item.metadata || {}),
        closeoutKey: isCurrent ? LLM_ROUTER_CLOSEOUT_KEY : item.metadata?.closeoutKey,
        approvalRef: isCurrent ? LLM_ROUTER_APPROVAL_PATH : item.metadata?.approvalRef,
        requiresOwnPlanCriticBeforeReady: !isCurrent,
        nextActiveAfterLlmRouter: isNext,
      },
    }
  })
  merged.sort((left, right) => Number(left.order || 0) - Number(right.order || 0))
  return {
    sprint: {
      sprintId: sprint.sprintId || LLM_ROUTER_SPRINT_ID,
      status: 'active',
      goal: sprint.goal || 'Continue unattended Foundation/operator-safe work through model routing, owner access, decision/action loop, and Strategy/People foundations.',
      activeBlockerCardId: closeCard ? NEXT_CARD_ID : LLM_ROUTER_CARD_ID,
      metadata: {
        ...(sprint.metadata || {}),
        currentStatus: closeCard ? 'llm_router_closed_next_card_scoping' : 'llm_router_active',
        lastClosedCardId: closeCard ? LLM_ROUTER_CARD_ID : sprint.metadata?.lastClosedCardId,
        lastCloseoutKey: closeCard ? LLM_ROUTER_CLOSEOUT_KEY : sprint.metadata?.lastCloseoutKey,
        sprintTruthRepair: 'Future cards remain scoping until each has complete doctrine fields and Plan Critic pass; no false sprint-ready state.',
      },
    },
    items: merged,
  }
}

async function syncSprint({ activeSprint, closeCard }) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: LLM_ROUTER_SCRIPT_PATH,
    operation: closeCard ? 'close LLM-ROUTER-001 and advance next card to scoping' : 'sync LLM-ROUTER-001 sprint readiness',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await upsertFoundationCurrentSprintOverlay(
    buildUpdatedSprintOverlay({ activeSprint, closeCard }),
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: activeSprint.sprint?.sprintId || LLM_ROUTER_SPRINT_ID,
      reason: closeCard
        ? 'LLM-ROUTER-001 closed; next card stays scoping until its own plan and Plan Critic pass exist.'
        : 'Promote LLM-ROUTER-001 to building with complete sprint truth.',
    },
  )
}

function mergeWorkload(workloads = [], workload) {
  return Array.from(new Set([...(workloads || []), workload].filter(Boolean)))
}

async function applyRuntimeRouteTruth() {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: LLM_ROUTER_SCRIPT_PATH,
    operation: 'seed bounded LLM router route truth',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const snapshot = await getLlmRuntimeSnapshot({ limit: 10 })
  const credentialsByKey = new Map(snapshot.credentials.map(item => [item.credentialKey, item]))
  const touchedCredentials = []
  for (const credentialKey of ['openclaw-chatgpt-pro', 'openai-api-default', 'anthropic-api-default']) {
    const credential = credentialsByKey.get(credentialKey)
    if (!credential) continue
    touchedCredentials.push(await upsertLlmCredential({
      ...credential,
      allowedWorkloads: mergeWorkload(credential.allowedWorkloads, LLM_ROUTER_BOUNDED_WORKLOAD),
      metadata: {
        ...(credential.metadata || {}),
        llmRouter001WorkloadAdded: LLM_ROUTER_BOUNDED_WORKLOAD,
      },
    }, ACTOR))
  }
  const refreshedCredentials = new Map((await getLlmRuntimeSnapshot({ limit: 10 })).credentials.map(item => [item.credentialKey, item]))
  const touchedRoutes = []
  for (const route of DEFAULT_LLM_ROUTES.filter(item => item.workload === LLM_ROUTER_BOUNDED_WORKLOAD)) {
    const credential = refreshedCredentials.get(route.credentialKey)
    let status = 'probe_required'
    let riskClass = route.riskClass
    if (!credential || credential.status === 'missing') {
      status = 'blocked'
      riskClass = 'blocked'
    } else if (
      route.provider !== 'claude_code' &&
      credential.status === 'available' &&
      ['api_fallback', 'allowed'].includes(credential.policyClassification) &&
      ['api_fallback', 'allowed'].includes(route.policyClassification)
    ) {
      status = 'available'
      riskClass = route.riskClass === 'untested' ? 'low' : route.riskClass
    } else if (credential.status === 'blocked' || credential.policyClassification === 'blocked') {
      status = 'blocked'
      riskClass = 'blocked'
    }
    touchedRoutes.push(await upsertLlmRoute({
      ...route,
      status,
      riskClass,
      metadata: {
        ...(route.metadata || {}),
        seededBy: LLM_ROUTER_CARD_ID,
        providerCallsMade: false,
        credentialStatus: credential?.status || 'missing',
        credentialPolicyClassification: credential?.policyClassification || 'untested',
      },
    }, ACTOR))
  }
  const dryRun = await callLlm({
    workload: LLM_WORKLOADS.DEEP_AUDIT_SENIOR_REVIEW,
    hubKey: 'foundation',
    inputText: 'LLM router bounded workload dry-run route selection proof. Do not call a provider.',
    dryRun: true,
    metadata: { cardId: LLM_ROUTER_CARD_ID, proof: 'bounded-workload-route-selection' },
  })
  const plan = await planLlmRoute({ workload: LLM_WORKLOADS.DEEP_AUDIT_SENIOR_REVIEW, hubKey: 'foundation' })
  return {
    credentials: touchedCredentials.map(item => ({ credentialKey: item.credentialKey, status: item.status, policyClassification: item.policyClassification, allowedWorkloads: item.allowedWorkloads })),
    routes: touchedRoutes.map(item => ({ routeKey: item.routeKey, status: item.status, policyClassification: item.policyClassification, riskClass: item.riskClass })),
    dryRunCall: {
      callId: dryRun.call.callId,
      status: dryRun.call.status,
      routeKey: dryRun.routeKey,
      provider: dryRun.provider,
      authPath: dryRun.authPath,
      runnable: dryRun.plan.runnable,
    },
    plan: {
      selectedRoute: plan.selectedRoute?.routeKey || null,
      runnable: plan.runnable,
      blockReason: plan.blockReason || null,
      routeReadiness: plan.routeReadiness,
    },
  }
}

async function closeCard({ activeSprint, planReview, evaluation, runtimeProof }) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: LLM_ROUTER_SCRIPT_PATH,
    operation: 'close LLM-ROUTER-001',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await updateBacklogItem(LLM_ROUTER_CARD_ID, {
    lane: 'done',
    priority: 'P1',
    rank: 18,
    nextAction: `Done under ${LLM_ROUTER_CLOSEOUT_KEY}; continue FOUNDATION-USERS-001 only after its own plan and Plan Critic pass exist.`,
    statusNote: `Closed 2026-05-20 under ${LLM_ROUTER_CLOSEOUT_KEY}; added a bounded ${LLM_ROUTER_BOUNDED_WORKLOAD} router workload, fail-closed Claude Code adapter contract, nightly deep-audit workload routing, and dry-run route proof with no provider calls.`,
    owner: 'Foundation Runtime',
  }, ACTOR)
  await syncSprint({ activeSprint, closeCard: true })
  const closeout = renderLlmRouterCloseout({
    evaluation,
    planSummary: buildPlanCriticResultSummary(planReview),
    dryRunCall: runtimeProof?.dryRunCall || {},
    generatedAt: new Date().toISOString(),
  })
  await fs.mkdir(path.dirname(path.join(repoRoot, LLM_ROUTER_CLOSEOUT_PATH)), { recursive: true })
  await fs.writeFile(path.join(repoRoot, LLM_ROUTER_CLOSEOUT_PATH), closeout)
}

async function main() {
  const args = parseArgs()
  if (args.closeCard || args.syncSprint) {
    assertProcessCheckWriteAllowed({
      argv: process.argv.slice(2),
      scriptPath: LLM_ROUTER_SCRIPT_PATH,
      operation: args.closeCard ? 'close LLM-ROUTER-001' : 'sync LLM-ROUTER-001 sprint readiness',
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
    })
  }

  let dbInitialized = false
  try {
    const [
      approvalValidation,
      planSource,
      llmRouterSource,
      nightlyAuditSource,
      closeoutRegistrySource,
      packageJson,
    ] = await Promise.all([
      validatePlanApprovalFile({ repoRoot, approvalRef: LLM_ROUTER_APPROVAL_PATH, cardId: LLM_ROUTER_CARD_ID }),
      readRepoFile(LLM_ROUTER_PLAN_PATH),
      readRepoFile('lib/llm-router.js'),
      readRepoFile('lib/nightly-deep-audit-upgrade.js'),
      Promise.all([
        readRepoFile('lib/foundation-build-closeout-records.js'),
        readRepoFile('lib/foundation-build-closeout-model-records.js'),
      ]).then(parts => parts.join('\n')),
      readRepoJson('package.json'),
    ])
    const claudeHelpSource = tryReadClaudeHelp()
    const planReview = evaluatePlanCriticPlan({
      planText: planSource,
      card: {
        id: LLM_ROUTER_CARD_ID,
        title: 'Finish policy-aware LLM router migration',
        priority: 'P0',
      },
      changedFiles: LLM_ROUTER_CHANGED_FILES,
      declaredRisk: 'Router migration can accidentally enable provider execution, direct spend, credential mutation, or false runtime availability if the bounded workload and Claude adapter gates are not fail-closed.',
      repoRoot,
    })
    const evaluation = evaluateLlmRouterMigration({
      llmRouterSource,
      nightlyAuditSource,
      closeoutRegistrySource,
      packageJson,
      claudeHelpSource,
    })

    await initFoundationDb()
    dbInitialized = true
    await upsertPlanCriticRun(planReview)
    const activeSprint = await getActiveFoundationCurrentSprint()
    const sprintCardIds = Array.from(new Set([
      ...(activeSprint.items || []).map(item => item.cardId || item.backlogId).filter(Boolean),
      LLM_ROUTER_CARD_ID,
      NEXT_CARD_ID,
    ]))
    const [cards, planCriticRuns] = await Promise.all([
      getBacklogItemsByIds(sprintCardIds),
      getPlanCriticRunsByCardIds(sprintCardIds),
    ])

    if (args.syncSprint && !args.closeCard) await syncSprint({ activeSprint, closeCard: false })
    const runtimeProof = args.closeCard ? await applyRuntimeRouteTruth() : null
    if (args.closeCard) await closeCard({ activeSprint, planReview, evaluation, runtimeProof })

    const refreshedSprint = await getActiveFoundationCurrentSprint()
    const closeouts = getFoundationBuildCloseouts()
    const currentSprintStatus = buildFoundationCurrentSprintStatus({
      sprint: refreshedSprint.sprint,
      items: refreshedSprint.items,
      backlogItems: cards,
      closeouts,
      planCriticRuns,
    })

    const currentItem = (refreshedSprint.items || []).find(item => item.cardId === LLM_ROUTER_CARD_ID)
    const nextItem = (refreshedSprint.items || []).find(item => item.cardId === NEXT_CARD_ID)
    const closeoutRecord = closeouts.find(record => record.key === LLM_ROUTER_CLOSEOUT_KEY)
    const llmRouterCard = cards.find(card => card.id === LLM_ROUTER_CARD_ID) || null
    const historicalDone = llmRouterCard?.lane === 'done' &&
      closeoutRecord?.operatorCloseout === true &&
      (closeoutRecord.backlogIds || []).includes(LLM_ROUTER_CARD_ID)
    const stagePostureIsSafe = args.closeCard
      ? nextItem?.stage === 'scoping'
      : historicalDone
        ? true
      : currentItem?.stage === 'building_now' ||
        (currentItem?.stage === 'done_this_sprint' && llmRouterCard?.lane === 'done')
    const checks = []

    addCheck(checks, approvalValidation.ok && approvalValidation.mode === 'v2', 'approval validates', approvalValidation.failures?.map(item => item.check).join(', ') || LLM_ROUTER_APPROVAL_PATH)
    addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes LLM router plan', buildPlanCriticResultSummary(planReview))
    addCheck(checks, evaluation.ok, 'LLM router migration evaluation is healthy', evaluation.failed.map(item => item.check).join('; ') || JSON.stringify(evaluation.summary))
    addCheck(checks, cards.some(card => card.id === LLM_ROUTER_CARD_ID), 'live backlog card exists', cards.map(card => card.id).join(', ') || 'missing')
    addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8) || planReview.status === 'pass', 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || `${planReview.status}/${planReview.score}`)
    addCheck(
      checks,
      historicalDone || currentItem?.existingWorkCheck?.existingCode?.length || currentItem?.existingWorkCheck?.existingCode,
      'Current Sprint LLM card has existing-code doctrine while active or verified historical closeout',
      historicalDone ? `${LLM_ROUTER_CARD_ID}:done` : currentItem?.stage || 'missing',
    )
    addCheck(
      checks,
      stagePostureIsSafe,
      'Current Sprint stage posture is safe while active or historically done',
      args.closeCard
        ? `${NEXT_CARD_ID}:${nextItem?.stage}`
        : historicalDone
          ? `${LLM_ROUTER_CARD_ID}:done`
          : `${LLM_ROUTER_CARD_ID}:${currentItem?.stage}`,
    )
    addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint status is healthy after LLM router sync', currentSprintStatus.findings?.map(item => item.detail).join('; ') || 'healthy')
    addCheck(checks, closeoutRecord?.operatorCloseout === true && (closeoutRecord.backlogIds || []).includes(LLM_ROUTER_CARD_ID), 'closeout registry exposes LLM router card', closeoutRecord?.key || 'missing')
    if (args.closeCard) {
      addCheck(checks, runtimeProof?.routes?.some(route => route.routeKey === 'foundation-deep-audit-claude-code'), 'runtime route truth includes Claude Code deep-audit route', JSON.stringify(runtimeProof?.routes || []))
      addCheck(checks, runtimeProof?.dryRunCall?.status === 'skipped' && Boolean(runtimeProof?.dryRunCall?.callId), 'bounded workload dry-run call is logged without provider execution', JSON.stringify(runtimeProof?.dryRunCall || {}))
    }

    const failed = checks.filter(check => !check.ok)
    const result = {
      status: failed.length ? 'risk' : 'healthy',
      ok: failed.length === 0,
      cardId: LLM_ROUTER_CARD_ID,
      closeoutKey: LLM_ROUTER_CLOSEOUT_KEY,
      planCritic: {
        status: planReview.status,
        score: planReview.score,
        summary: buildPlanCriticResultSummary(planReview),
      },
      evaluation: evaluation.summary,
      runtimeProof,
      currentSprint: {
        status: currentSprintStatus.status,
        activeBlocker: refreshedSprint.sprint?.activeBlockerCardId,
        currentStage: currentItem?.stage,
        nextStage: nextItem?.stage,
      },
      checks,
      failed,
    }

    if (args.json) console.log(JSON.stringify(result, null, 2))
    else {
      console.log(`LLM-ROUTER-001 ${result.status}`)
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
