#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { buildCodeQualityNightlyAudit } from '../lib/code-quality-nightly-audit.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { getFoundationJobDefinition } from '../lib/foundation-jobs.js'
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
  ADMIN_DEAL_BACKLOG_SINCE,
  ADMIN_DEAL_DEFAULT_BACKLOG_LIMIT,
  ADMIN_DEAL_POLICY_SOURCE_CONTRACT_APPROVAL_PATH as APPROVAL_PATH,
  ADMIN_DEAL_POLICY_SOURCE_CONTRACT_CARD_ID as CARD_ID,
  ADMIN_DEAL_POLICY_SOURCE_CONTRACT_CLOSEOUT_KEY as CLOSEOUT_KEY,
  ADMIN_DEAL_POLICY_SOURCE_CONTRACT_NEXT_CARD_ID as NEXT_CARD_ID,
  ADMIN_DEAL_POLICY_SOURCE_CONTRACT_PLAN_PATH as PLAN_PATH,
  ADMIN_DEAL_POLICY_SOURCE_CONTRACT_PROOF_COMMANDS as PROOF_COMMANDS,
  ADMIN_DEAL_POLICY_SOURCE_CONTRACT_SCRIPT_PATH as SCRIPT_PATH,
  buildAdminDealPolicySourceContractDogfoodProof,
  evaluateAdminDealPolicySourceContractUsage,
  getAdminDealPolicySourceContract,
} from '../lib/admin-deal-policy-source-contract.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-admin-deal-policy-source-contract'
const CLOSEOUT_DOC_PATH = 'docs/_archive/handoffs/2026-05-19-admin-deal-policy-source-contract-closeout.md'
const CHANGED_FILES = [
  'lib/admin-deal-policy-source-contract.js',
  'scripts/review-admin-deals.mjs',
  'lib/foundation-jobs.js',
  'public/ops.js',
  'lib/code-quality-nightly-audit.js',
  'lib/deep-audit-findings-closure-gate.js',
  SCRIPT_PATH,
  PLAN_PATH,
  APPROVAL_PATH,
  'lib/foundation-build-closeout-process-gate-records.js',
  CLOSEOUT_DOC_PATH,
  'package.json',
]

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
  }
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

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

function git(args = []) {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  })
  return String(result.stdout || '').trim()
}

function getGitState() {
  return {
    branch: git(['rev-parse', '--abbrev-ref', 'HEAD']),
    head: git(['rev-parse', 'HEAD']),
    originMain: git(['rev-parse', 'origin/main']),
    porcelain: git(['status', '--short']),
  }
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P2','full',true,$6::text[],$7::jsonb,$8::jsonb,$9)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result,
            created_at = NOW()
      `,
      [
        `admin-deal-policy-source-contract-${stableRunId(PLAN_PATH)}`,
        CARD_ID,
        PLAN_PATH,
        planReview.status,
        planReview.score,
        CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify({ status: planReview.status, score: planReview.score, cardId: CARD_ID, closeoutKey: CLOSEOUT_KEY }),
        ACTOR,
      ],
    )
  } finally {
    client.release()
    await pool.end()
  }
}

function normalizeSprintItem(item = {}) {
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
    returnedReason: item.returnedReason || '',
    metadata: item.metadata && typeof item.metadata === 'object' ? item.metadata : {},
  }
}

function buildUpdatedSprintOverlay({ activeSprint, currentHead }) {
  const sprint = activeSprint.sprint || {}
  const items = (activeSprint.items || []).map(item => {
    const nextItem = normalizeSprintItem(item)
    if (nextItem.cardId === CARD_ID) {
      return {
        ...nextItem,
        stage: 'done_this_sprint',
        planRef: PLAN_PATH,
        definitionOfDone: 'Admin deal review policy dates and limits are owned by one source contract consumed by the runner, job registry, Ops UI, and nightly audit proof.',
        proofCommands: PROOF_COMMANDS,
        notNextBoundaries: [
          'Do not change Admin review behavior.',
          'Do not run live Admin deal review jobs.',
          'Do not call Google Sheets, FUB, ClickUp, or external connectors.',
          'Do not approve source-field apply/writeback.',
          'Do not work MEETING-VAULT-ACL-001 Phase B.',
          'Do not mutate Drive permissions.',
          'Do not start Value Builder or source/value expansion before the approved audit-control queue is done.',
        ],
        existingWorkCheck: {
          existingCode: [
            'scripts/review-admin-deals.mjs',
            'lib/foundation-jobs.js',
            'public/ops.js',
            'lib/code-quality-nightly-audit.js',
            'lib/deep-audit-findings-closure-gate.js',
          ],
          existingDocs: [
            'docs/_archive/audits/2026-05-19-foundation-deep-merge-audit.md',
            'docs/source-notes/owners-dashboard.md',
            'docs/source-notes/freedom-sheet.md',
            'docs/process/deep-audit-findings-closure-gate-001-plan.md',
          ],
          existingScripts: [
            'process:code-quality-nightly-audit-check',
            'process:system-health-nightly-audit-check',
            'process:build-lane-repeated-failure-action-gate-check',
            'process:foundation-ship',
          ],
          existingPolicy: [
            'Audit findings become live backlog truth or shipped proof.',
            'Green means raw green; classification is not repair.',
            'Current Sprint is the executable command surface.',
            'Source-field corrections remain human-owned until explicit apply approval.',
          ],
          reused: 'Reuses existing Admin deal review runner, job registry, Ops UI, Owners/FUB/ClickUp source IDs, and nightly audit routing.',
          notRebuilt: 'No live Admin review run, no connector calls, no behavior change, no external writes, no source-field writeback lane.',
          exactGap: 'The May 19 deep audit found duplicated Admin deal policy dates across runner, job config, and UI.',
          overBroadRisk: 'The card can drift into Ops workflow redesign. It is bounded to source-contract ownership, consumer wiring, audit routing, and closeout.',
          readyBy: 'Steve approved unattended overnight audit-control work and required audit findings to become fixes, live cards, gates, or proof.',
          readyAt: '2026-05-19T23:20:00-04:00',
        },
        metadata: {
          ...nextItem.metadata,
          closeoutKey: CLOSEOUT_KEY,
          repoPosture: {
            integrationBranch: 'main',
            expectedBaseCommit: currentHead,
            commitPushRequiredAfterCard: true,
            mainMustEqualOriginMainAtCloseout: true,
          },
          blockersBlockActionsNotSprint: true,
          approvalBoundActionsParkInsteadOfStopping: true,
        },
      }
    }
    if (nextItem.cardId === NEXT_CARD_ID && nextItem.stage !== 'done_this_sprint') {
      return {
        ...nextItem,
        stage: 'scoping',
      }
    }
    return nextItem
  })
  return {
    sprint: {
      sprintId: sprint.sprintId,
      status: 'active',
      goal: sprint.goal,
      activeBlockerCardId: NEXT_CARD_ID,
      metadata: {
        ...(sprint.metadata || {}),
        currentStatus: 'admin_deal_policy_source_contract_done',
        nextAction: `Continue ${NEXT_CARD_ID}; keep audit P2 cleanup moving before intelligence/value expansion.`,
      },
    },
    items,
  }
}

async function applyLiveClose({ activeSprint, planReview, gitState }) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'close Admin Deal Policy source-contract card and advance Current Sprint',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await updateBacklogItem(CARD_ID, {
    lane: 'done',
    priority: 'P2',
    rank: 80,
    nextAction: `Done under ${CLOSEOUT_KEY}; continue ${NEXT_CARD_ID}.`,
    statusNote: `Closed under ${CLOSEOUT_KEY}; Admin deal policy dates, limits, maturity gate, source IDs, and write boundary are source-owned and consumed by the runner, job registry, Ops UI, and nightly audit proof.`,
    owner: 'Ops Source Truth',
  }, ACTOR)
  await upsertPlanCriticRun(planReview)
  await upsertFoundationCurrentSprintOverlay(
    buildUpdatedSprintOverlay({ activeSprint, currentHead: gitState.head }),
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: activeSprint.sprint?.sprintId,
      reason: `${CARD_ID} closes Admin deal policy date duplication and advances to ${NEXT_CARD_ID}.`,
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  await initFoundationDb()

  const [
    approval,
    planSource,
    packageJson,
    contractSource,
    reviewAdminDealsSource,
    foundationJobsSource,
    opsSource,
    codeQualitySource,
    scriptSource,
    closeoutRegistrySource,
    deepAuditClosureSource,
    closeoutDoc,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile(PLAN_PATH),
    readRepoJson('package.json'),
    readRepoFile('lib/admin-deal-policy-source-contract.js'),
    readRepoFile('scripts/review-admin-deals.mjs'),
    readRepoFile('lib/foundation-jobs.js'),
    readRepoFile('public/ops.js'),
    readRepoFile('lib/code-quality-nightly-audit.js'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/foundation-build-closeout-process-gate-records.js'),
    readRepoFile('lib/deep-audit-findings-closure-gate.js'),
    readRepoFile(CLOSEOUT_DOC_PATH, { optional: true }),
  ])
  const gitState = getGitState()
  const [activeSprint, routeCards, planCriticRuns] = await Promise.all([
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID]),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])
  const closeouts = getFoundationBuildCloseouts()
  const contract = getAdminDealPolicySourceContract()
  const sourceProof = evaluateAdminDealPolicySourceContractUsage({
    reviewAdminDealsSource,
    foundationJobsSource,
    opsSource,
    sourceContractSource: contractSource,
  })
  const dogfood = buildAdminDealPolicySourceContractDogfoodProof()
  const adminJob = getFoundationJobDefinition('admin-deal-backlog-review')
  const audit = await buildCodeQualityNightlyAudit({
    repoRoot,
    skipEndpointFetch: true,
  })
  const adminPolicyAuditFindings = (audit.findings || []).filter(finding =>
    finding.id === 'admin-deal-policy-date-duplication' ||
      finding.proposedCard === CARD_ID,
  )
  const card = routeCards.find(item => item.id === CARD_ID)
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card,
    changedFiles: CHANGED_FILES,
    declaredRisk: 'scheduled job metadata, Admin review runner defaults, Ops UI source text, nightly code-quality audit detector behavior, Current Sprint mutation, live backlog truth, process gate, closeout registry, and package script',
    repoRoot,
  })

  if (args.closeCard &&
    approval.ok &&
    Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    planReview.status === 'pass' &&
    Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    sourceProof.ok &&
    dogfood.ok &&
    adminPolicyAuditFindings.length === 0) {
    await applyLiveClose({ activeSprint, planReview, gitState })
  }

  const [afterSprint, afterCards, afterPlanCriticRuns] = await Promise.all([
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID]),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])
  const afterCard = afterCards.find(item => item.id === CARD_ID)
  const nextCard = afterCards.find(item => item.id === NEXT_CARD_ID)
  const closeout = closeouts.find(item => item.key === CLOSEOUT_KEY)
  const sprintItem = afterSprint.items.find(item => item.cardId === CARD_ID)

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for Admin Deal Policy source-contract card', buildPlanCriticResultSummary(planReview))
  addCheck(checks, contract.sourceId === 'SRC-OPS-ADMIN-DEAL-POLICY-001' && contract.backlogSince === ADMIN_DEAL_BACKLOG_SINCE && contract.defaultBacklogLimit === ADMIN_DEAL_DEFAULT_BACKLOG_LIMIT, 'source contract exposes expected policy metadata', JSON.stringify(contract))
  addCheck(checks, sourceProof.ok, 'Admin runner, job registry, and Ops UI consume policy source contract', JSON.stringify(sourceProof.failed || []))
  addCheck(checks, dogfood.ok, 'dogfood rejects local policy date constants, job args, and UI copy', dogfood.ok ? 'pass' : JSON.stringify(dogfood))
  addCheck(checks, adminJob?.args?.includes(`--backlog-since=${ADMIN_DEAL_BACKLOG_SINCE}`) && adminJob?.systemSummary?.includes(contract.backlogSinceLabel), 'foundation job definition still exposes contract-built backlog args and summary', adminJob ? `${adminJob.args.join(' ')} / ${adminJob.systemSummary}` : 'missing')
  addCheck(checks, adminPolicyAuditFindings.length === 0, 'code-quality audit no longer proposes stale Admin deal policy card', adminPolicyAuditFindings.map(finding => `${finding.id}:${finding.refs?.[0]?.path || ''}`).join(', ') || 'clean')
  addCheck(checks, packageJson.scripts?.['process:admin-deal-policy-source-contract-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:admin-deal-policy-source-contract-check'] || 'missing')
  addCheck(checks, contractSource.includes('evaluateAdminDealPolicySourceContractUsage') && contractSource.includes('buildAdminDealPolicySourceContractDogfoodProof'), 'module owns reusable source-contract proof', 'lib/admin-deal-policy-source-contract.js')
  addCheck(checks, codeQualitySource.includes('evaluateAdminDealPolicySourceContractUsage') && codeQualitySource.includes('admin-deal-policy-date-duplication') && codeQualitySource.includes('!adminDealPolicyReady'), 'nightly audit detector uses Admin policy source-contract proof before suppressing stale finding', 'lib/code-quality-nightly-audit.js')
  addCheck(checks, scriptSource.includes('assertProcessCheckWriteAllowed') && scriptSource.includes('upsertFoundationCurrentSprintOverlay') && scriptSource.includes('updateBacklogItem'), 'focused script uses guarded backlog and sprint mutations', SCRIPT_PATH)
  addCheck(checks, deepAuditClosureSource.includes(CARD_ID) && deepAuditClosureSource.includes(CLOSEOUT_KEY) && deepAuditClosureSource.includes("routeStatus: 'done'"), 'deep-audit route now names Admin policy closeout proof', 'lib/deep-audit-findings-closure-gate.js')
  addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeout?.backlogIds?.includes(CARD_ID), 'closeout registry resolves Admin policy source-contract closeout', closeout?.key || 'missing')
  addCheck(checks, !args.closeCard || afterCard?.lane === 'done', 'Admin policy source-contract card closes when requested', afterCard ? `${afterCard.lane}/${afterCard.priority}` : 'missing')
  addCheck(checks, !args.closeCard || afterSprint.sprint?.activeBlockerCardId === NEXT_CARD_ID, 'Current Sprint advances to approval threshold registry card', afterSprint.sprint?.activeBlockerCardId || 'missing')
  addCheck(checks, !args.closeCard || sprintItem?.stage === 'done_this_sprint', 'Current Sprint marks Admin policy source-contract done', sprintItem?.stage || 'missing')
  addCheck(checks, nextCard && ['scoped', 'building_now', 'done'].includes(nextCard.lane), 'next approval threshold registry card is live', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, afterPlanCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE) || args.closeCard, 'durable Plan Critic pass row exists', afterPlanCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, closeoutDoc.includes(CARD_ID) && closeoutDoc.includes(NEXT_CARD_ID), 'closeout handoff records shipped behavior and next card', closeoutDoc ? 'present' : 'missing')
  addCheck(checks, gitState.branch === 'main', 'repo branch posture is main', gitState.branch)
  addCheck(checks, gitState.head === gitState.originMain || Boolean(gitState.porcelain), 'repo is synced or in-flight card has tracked dirty work', gitState.head === gitState.originMain ? 'synced' : 'in-flight')

  const failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'risk' : 'healthy',
    generatedAt: new Date().toISOString(),
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    activeBlocker: afterSprint.sprint?.activeBlockerCardId || null,
    sourceProof,
    dogfood,
    codeQualityAudit: {
      findingCount: audit.findings?.length || 0,
      proposedCards: audit.proposedCards || [],
      adminPolicyAuditFindingCount: adminPolicyAuditFindings.length,
    },
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Admin Deal Policy source-contract check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Admin Deal Policy source-contract check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
