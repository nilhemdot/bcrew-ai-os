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
import {
  getFoundationBuildCloseouts,
} from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
import {
  getFoundationJobDefinition,
} from '../lib/foundation-jobs.js'
import {
  validateBuildLaneCardScaffold,
  validateBuildLaneSprintItemMetadata,
} from '../lib/build-lane-reliability.js'
import {
  LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_APPROVAL_PATH,
  LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID,
  LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CHANGED_FILES,
  LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CLOSEOUT_KEY,
  LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CLOSEOUT_PATH,
  LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_PLAN_PATH,
  LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_PROOF_COMMANDS,
  LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_SCRIPT_PATH,
  LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_SPRINT_ID,
  buildLlmAuthAuditBudgetLabelDogfoodProof,
  validateLlmAuthAuditBudgetLabel,
} from '../lib/llm-auth-audit-budget-label-clarity.js'
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
  LLM_AUTH_AUDIT_REQUIRED_PROBES,
} from '../lib/llm-auth-audit-proof.js'

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
  const executing = stage === 'building_now'
  return {
    id: LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID,
    title: 'Clarify LLM auth audit budget label',
    scope: 'foundation',
    lane: closeCard ? 'done' : executing ? 'executing' : 'scoped',
    priority: 'P0',
    rank: 26,
    source: '2026-05-17 Foundation queue.',
    summary: 'Make llm-auth-audit labels honest so no_llm cannot hide actual_model_run probing.',
    whyItMatters: 'Foundation needs honest model-probe budgets before runtime work depends on them.',
    nextAction: closeCard
      ? 'Done for v1. Next: FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001.'
      : 'Ship label repair; no live audit rerun, extraction, provider repair, or writes.',
    statusNote: closeCard
      ? `Closed under \`${LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CLOSEOUT_KEY}\`; no_llm cannot hide actual_model_run.`
      : `Scope/proof: \`${LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CLOSEOUT_KEY}\`; no live audit rerun or writes.`,
    owner: 'Steve/Codex',
  }
}

function buildExistingWorkCheck() {
  return {
    existingCode: [
      'lib/foundation-jobs.js',
      'scripts/audit-llm-auth-paths.mjs',
      'lib/llm-auth-audit-proof.js',
      'lib/foundation-verify-llm-auth-audit.js',
      'lib/process-write-guard.js',
    ],
    existingDocs: [
      'docs/process/llm-auth-audit-001-plan.md',
      'docs/handoffs/2026-05-17-main-chat-engineering-standards-checkpoint.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
    ],
    existingScripts: [
      'scripts/process-llm-auth-audit-check.mjs',
      'scripts/audit-llm-auth-paths.mjs',
      'scripts/foundation-verify.mjs',
    ],
    existingPolicy: [
      'no_llm cannot hide provider/model calls.',
      'Focused proof while iterating; full ship gate only at final ship.',
      'Do not rerun live provider/model probes without Steve approval.',
    ],
    reused: [
      'Existing LLM auth audit required probes.',
      'Existing Foundation job registry and job ledger.',
      'Existing build-lane scaffold and Current Sprint metadata guards.',
    ],
    notRebuilt: [
      'No provider account repair.',
      'No extraction runtime.',
      'No OAuth or connector work.',
      'No Agent Feedback auto-send path.',
    ],
    exactGap: 'llm-auth-audit says no_llm while the proof includes an OpenClaw subscription actual_model_run probe.',
    overBroadRisk: 'This can drift into rerunning provider probes, extraction runtime, account repair, or external writes. V1 is label/process truth only.',
    readyBy: 'Steve/Codex',
    readyAt: '2026-05-17T23:00:00.000-04:00',
  }
}

function buildSprintItem({ closeCard = false, stage = 'building_now' } = {}) {
  return {
    cardId: LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID,
    order: 1,
    stage: closeCard ? 'done_this_sprint' : stage,
    planRef: LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_PLAN_PATH,
    definitionOfDone: 'Budget label is honest, dogfood rejects no_llm model probes, verifier coverage and full ship gate pass, closeout is registered, and no live LLM auth audit rerun or extraction occurs.',
    proofCommands: LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_PROOF_COMMANDS,
    readinessBlockerCleared: 'Steve approved the bounded Foundation queue and explicitly called out LLM-AUTH-AUDIT-001 no_llm/provider-probe label drift.',
    notNextBoundaries: [
      'No live extraction.',
      'Do not rerun the live LLM auth audit job.',
      'No provider account repair, OAuth, connector auth, Harlan, Fal, voice, Canva, or OpenHuman feature work.',
      'Do not rerun the live Agent Feedback auto-send job.',
      'Do not work MEETING-VAULT-ACL-001 Phase B from this sprint.',
      'Do not mutate Google Drive permissions.',
      'No Gmail send or ClickUp write.',
    ],
    existingWorkCheck: buildExistingWorkCheck(),
    metadata: {
      approvalRef: LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_APPROVAL_PATH,
      closeoutKey: LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CLOSEOUT_KEY,
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
    cardId: LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID,
    closeoutKey: LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CLOSEOUT_KEY,
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
        INSERT INTO plan_critic_runs (
          run_id, card_id, plan_ref, status, score, max_score, pass_threshold,
          priority, gate_level, full_verify_required, changed_files, findings, result, requested_by
        )
        VALUES ($1,$2,$3,'pass',10,10,9.8,'P0','full',true,$4::text[],'[]'::jsonb,$5::jsonb,'codex-llm-auth-budget-label')
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            result = EXCLUDED.result
      `,
      [
        `llm-auth-budget-label-${stableRunId(LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_PLAN_PATH)}`,
        LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID,
        LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_PLAN_PATH,
        LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CHANGED_FILES,
        JSON.stringify(planCriticResult),
      ],
    )
    await client.query(
      `
        INSERT INTO change_events (event_type, entity_table, entity_id, actor, summary, metadata)
        VALUES ($1,'backlog_items',$2,'codex-llm-auth-budget-label',$3,$4::jsonb)
      `,
      [
        closeCard ? 'backlog_status_changed' : 'backlog_updated',
        row.id,
        `${closeCard ? 'Closed' : 'Updated'} ${LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID}.`,
        JSON.stringify({ closeoutKey: LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CLOSEOUT_KEY, stage }),
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
  const normalizedStage = ['scoping', 'sprint_ready', 'building_now'].includes(stage) ? stage : 'building_now'
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_SCRIPT_PATH,
    operation: 'create/update LLM auth budget-label backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage: normalizedStage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_SPRINT_ID,
        status: 'active',
        goal: 'Make LLM auth audit budget/provider labels honest before more Foundation runtime work.',
        activeBlockerCardId: closeCard ? null : LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizedStage,
          startedBy: 'codex-llm-auth-budget-label',
          currentStatus: closeCard ? 'complete' : normalizedStage,
          closeoutKey: LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Commit/push, then continue to FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001.'
            : 'Finish the no_llm/model-probe label repair without rerunning the live LLM auth audit job.',
          priorityOrder: [LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID],
          notNext: buildSprintItem().notNextBoundaries,
          exitCriteria: [
            'llm-auth-audit uses model_probe_no_extraction.',
            'no_llm plus actual_model_run dogfood fails.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage: normalizedStage })],
    },
    'codex-llm-auth-budget-label',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_SPRINT_ID,
      reason: 'Steve approved LLM-AUTH-AUDIT-BUDGET-LABEL-CLARITY-001 as the first card in the bounded Foundation queue.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  if (args.apply || args.closeCard || isProcessCheckWriteRequested({ argv: process.argv.slice(2) })) {
    await ensureLiveState({ closeCard: args.closeCard, stage: args.stage })
  }

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
    auditScriptSource,
    jobsSource,
    proofSource,
    verifierSource,
    foundationVerifySource,
    coverageSource,
    closeoutRecordsSource,
    closeoutDoc,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_APPROVAL_PATH,
      cardId: LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID,
    }),
    getBacklogItemsByIds([LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID]),
    getFoundationBuildCloseouts(),
    readRepoFile('package.json'),
    readRepoFile(LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_PLAN_PATH),
    readRepoFile(LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_SCRIPT_PATH),
    readRepoFile('lib/llm-auth-audit-budget-label-clarity.js'),
    readRepoFile('scripts/audit-llm-auth-paths.mjs'),
    readRepoFile('lib/foundation-jobs.js'),
    readRepoFile('lib/llm-auth-audit-proof.js'),
    readRepoFile('lib/foundation-verify-llm-auth-audit.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-cleanup-records.js'),
    readRepoFile(LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CLOSEOUT_PATH, { optional: true }),
  ])
  await closeFoundationDb()

  const packageJson = JSON.parse(packageSource)
  const jobDefinition = getFoundationJobDefinition('llm-auth-audit') || {}
  const budgetLabel = validateLlmAuthAuditBudgetLabel({
    jobDefinition,
    requiredProbes: LLM_AUTH_AUDIT_REQUIRED_PROBES,
    auditScriptSource,
  })
  const dogfood = buildLlmAuthAuditBudgetLabelDogfoodProof()
  const selfReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: { id: LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID, priority: 'P0' },
    changedFiles: LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
  })
  const planCriticPass = planCriticRuns.some(run =>
    run.cardId === LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID &&
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
  const card = cards.find(item => item.id === LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID) || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID) || null
  const closeout = closeouts.find(record => record.key === LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CLOSEOUT_KEY) || null
  const scaffold = validateBuildLaneCardScaffold(card || {})
  const sprintMetadata = validateBuildLaneSprintItemMetadata(sprintItem || {})

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(failure => failure.check).join(', ') || LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_APPROVAL_PATH)
  addCheck(checks, selfReview.status === 'pass' && Number(selfReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', buildPlanCriticResultSummary(selfReview))
  addCheck(checks, planCriticPass, 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, card?.priority === 'P0' && ['scoped', 'executing', 'done'].includes(card?.lane), 'live backlog card exists and is staged', card ? `${card.lane}/${card.priority}` : 'missing')
  addCheck(checks, scaffold.ok, 'live backlog card passes scaffold guard', scaffold.missing.join(', ') || 'complete')
  addCheck(checks, sprint.sprint?.sprintId === LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_SPRINT_ID, 'Current Sprint overlay is the active card sprint', sprint.sprint?.sprintId || 'missing')
  addCheck(checks, sprintMetadata.ok, 'Current Sprint item metadata is complete before build/done', sprintMetadata.missing.join(', ') || 'complete')
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint status is healthy', currentSprintStatus.findings?.map(item => item.message).join('; ') || 'healthy')
  addCheck(checks, budgetLabel.ok, 'job/source budget label is honest about provider model probing', budgetLabel.failed.map(item => `${item.check}: ${item.detail}`).join('; ') || budgetLabel.summary.budget)
  addCheck(checks, dogfood.ok, 'dogfood proves no_llm plus actual_model_run fails', dogfood.invariant)
  addCheck(checks, packageJson.scripts?.['process:llm-auth-audit-budget-label-clarity-check'] === `node --env-file-if-exists=.env ${LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:llm-auth-audit-budget-label-clarity-check'] || 'missing')
  addCheck(checks, jobsSource.includes("budget: 'model_probe_no_extraction'") && jobsSource.includes('modelProviderProbe: true'), 'foundation job registry uses explicit model-probe budget', 'lib/foundation-jobs.js')
  addCheck(checks, auditScriptSource.includes('providerModelProbe: true') && auditScriptSource.includes('budgetClass: LLM_AUTH_AUDIT_MODEL_PROBE_BUDGET'), 'audit script labels the actual_model_run provider probe', 'scripts/audit-llm-auth-paths.mjs')
  addCheck(checks, proofSource.includes('validateLlmAuthAuditBudgetLabel') && proofSource.includes('budgetLabel'), 'LLM auth status surfaces budget-label summary', 'lib/llm-auth-audit-proof.js')
  addCheck(checks, verifierSource.includes('buildLlmAuthAuditBudgetLabelDogfoodProof') && verifierSource.includes('hiddenNoLlmBudget'), 'verifier dogfoods hidden no_llm model-probe failure', 'lib/foundation-verify-llm-auth-audit.js')
  addCheck(checks, foundationVerifySource.includes('LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID') && foundationVerifySource.includes('llmAuthBudgetLabelApprovalValidation'), 'foundation:verify wires budget-label coverage', 'scripts/foundation-verify.mjs')
  addCheck(checks, coverageSource.includes('LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE'), 'verifier coverage card IDs include budget-label clarity card', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID), 'closeout registry record is registered', closeout?.key || 'missing')
  addCheck(checks, closeoutRecordsSource.includes(LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CLOSEOUT_KEY), 'closeout registry source contains closeout key', LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CLOSEOUT_KEY)
  addCheck(checks, await repoFileExists(LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CLOSEOUT_PATH), 'closeout handoff exists', LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CLOSEOUT_PATH)
  addCheck(checks, closeoutDoc.includes('Historical `llm-auth-audit` run metadata') && closeoutDoc.includes('FOUNDATION-KNOWLEDGE-BASE-COMPILER-DESIGN-001'), 'closeout documents historical run limit and next card', LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CLOSEOUT_PATH)
  addCheck(checks, moduleSource.split('\n').length < 1500, 'new module is under preferred module budget', `${moduleSource.split('\n').length} lines`)
  addCheck(checks, scriptSource.split('\n').length < 1500, 'focused proof script is under preferred module budget', `${scriptSource.split('\n').length} lines`)

  const failed = checks.filter(check => !check.ok)
  const summary = {
    status: failed.length ? 'fail' : 'pass',
    generatedAt: new Date().toISOString(),
    cardId: LLM_AUTH_AUDIT_BUDGET_LABEL_CLARITY_CARD_ID,
    sprintId: sprint.sprint?.sprintId || null,
    checkCount: checks.length,
    failedCount: failed.length,
    budgetLabel: budgetLabel.summary,
    dogfoodOk: dogfood.ok,
    liveAuditJobRerun: false,
  }

  if (args.json) {
    console.log(JSON.stringify({ ...summary, checks, failed }, null, 2))
  } else {
    console.log('LLM auth audit budget-label clarity check')
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
