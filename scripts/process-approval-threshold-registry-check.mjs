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
  buildPlanCriticResultSummary,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import {
  APPROVAL_MIN_APPROVED_PLAN_SCORE,
  APPROVAL_MIN_APPROVED_PLAN_SCORE_LABEL,
  APPROVAL_THRESHOLD_REGISTRY_APPROVAL_PATH as APPROVAL_PATH,
  APPROVAL_THRESHOLD_REGISTRY_CARD_ID as CARD_ID,
  APPROVAL_THRESHOLD_REGISTRY_CLOSEOUT_KEY as CLOSEOUT_KEY,
  APPROVAL_THRESHOLD_REGISTRY_NEXT_CARD_ID as NEXT_CARD_ID,
  APPROVAL_THRESHOLD_REGISTRY_PLAN_PATH as PLAN_PATH,
  APPROVAL_THRESHOLD_REGISTRY_PROOF_COMMANDS as PROOF_COMMANDS,
  APPROVAL_THRESHOLD_REGISTRY_SCRIPT_PATH as SCRIPT_PATH,
  buildApprovalThresholdRegistryDogfoodProof,
  buildApprovalThresholdRegistrySummary,
  evaluateApprovalThresholdRegistryUsage,
  meetsApprovalThreshold,
} from '../lib/approval-threshold-registry.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-approval-threshold-registry'
const CLOSEOUT_DOC_PATH = 'docs/handoffs/2026-05-19-approval-threshold-registry-closeout.md'
const CHANGED_FILES = [
  'lib/approval-threshold-registry.js',
  'lib/process-plan-critic.js',
  'lib/approval-integrity.js',
  'lib/foundation-current-sprint.js',
  'lib/foundation-current-sprint-store.js',
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
        VALUES ($1,$2,$3,$4,$5,10,$6,'P2','full',true,$7::text[],$8::jsonb,$9::jsonb,$10)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            pass_threshold = EXCLUDED.pass_threshold,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result,
            created_at = NOW()
      `,
      [
        `approval-threshold-registry-${stableRunId(PLAN_PATH)}`,
        CARD_ID,
        PLAN_PATH,
        planReview.status,
        planReview.score,
        APPROVAL_MIN_APPROVED_PLAN_SCORE,
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
        definitionOfDone: 'The Plan Critic approval threshold is owned by a shared registry and consumed by approval integrity, Current Sprint proof, Plan Critic, and nightly audit drift detection.',
        proofCommands: PROOF_COMMANDS,
        notNextBoundaries: [
          'Do not rewrite every historical approval artifact or closeout label mentioning 9.8.',
          'Do not change the approval score threshold.',
          'Do not weaken approval integrity, Plan Critic, or Current Sprint stage gates.',
          'Do not turn this card into broad Plan Critic redesign.',
          'Do not work MEETING-VAULT-ACL-001 Phase B.',
          'Do not mutate Drive permissions.',
          'Do not start Value Builder or source/value expansion before the approved audit-control queue is done.',
        ],
        existingWorkCheck: {
          existingCode: [
            'lib/process-plan-critic.js',
            'lib/approval-integrity.js',
            'lib/foundation-current-sprint.js',
            'lib/foundation-current-sprint-store.js',
            'lib/code-quality-nightly-audit.js',
            'lib/deep-audit-findings-closure-gate.js',
          ],
          existingDocs: [
            'docs/audits/2026-05-19-foundation-deep-merge-audit.md',
            'docs/process/deep-audit-findings-closure-gate-001-plan.md',
            PLAN_PATH,
          ],
          existingScripts: [
            'process:code-quality-nightly-audit-check',
            'process:system-health-nightly-audit-check',
            'process:build-lane-repeated-failure-action-gate-check',
            'process:foundation-ship',
          ],
          existingPolicy: [
            'Scope, plan, review at 9.8, then execute.',
            'Audit findings must route into live backlog truth or shipped proof.',
            'Green means raw green; classification is not repair.',
            'Current Sprint is the executable command surface.',
          ],
          reused: 'Reuses existing Plan Critic API, approval integrity validator, Current Sprint readers, code-quality audit detector, and deep-audit route table.',
          notRebuilt: 'No Plan Critic redesign, no historical approval rewrite, no threshold value change, no source/value feature work.',
          exactGap: 'The May 19 deep audit found approval threshold policy duplicated as local threshold logic.',
          overBroadRisk: 'The card can drift into a massive 9.8 rewrite. It is bounded to the load-bearing threshold owners and detector.',
          readyBy: 'Steve approved unattended overnight audit-control work and required audit findings to become fixes, live cards, gates, or proof.',
          readyAt: '2026-05-19T23:45:00-04:00',
        },
        metadata: {
          ...nextItem.metadata,
          closeoutKey: CLOSEOUT_KEY,
          thresholdRegistry: buildApprovalThresholdRegistrySummary(),
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
        currentStatus: 'approval_threshold_registry_done',
        nextAction: `Continue ${NEXT_CARD_ID}; classify pinned Build Intel commit baselines as snapshot/freshness evidence.`,
      },
    },
    items,
  }
}

async function applyLiveClose({ activeSprint, planReview, gitState }) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'close approval threshold registry card and advance Current Sprint',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await updateBacklogItem(CARD_ID, {
    lane: 'done',
    priority: 'P2',
    rank: 80,
    nextAction: `Done under ${CLOSEOUT_KEY}; continue ${NEXT_CARD_ID}.`,
    statusNote: `Closed under ${CLOSEOUT_KEY}; approval threshold policy is registry-owned and consumed by Plan Critic, approval integrity, Current Sprint, and nightly audit drift proof.`,
    owner: 'Plan Critic',
  }, ACTOR)
  await upsertPlanCriticRun(planReview)
  await upsertFoundationCurrentSprintOverlay(
    buildUpdatedSprintOverlay({ activeSprint, currentHead: gitState.head }),
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: activeSprint.sprint?.sprintId,
      reason: `${CARD_ID} closes approval threshold registry drift and advances to ${NEXT_CARD_ID}.`,
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
    registrySource,
    planCriticSource,
    approvalIntegritySource,
    currentSprintSource,
    currentSprintStoreSource,
    codeQualitySource,
    deepAuditClosureSource,
    scriptSource,
    closeoutRegistrySource,
    closeoutDoc,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile(PLAN_PATH),
    readRepoJson('package.json'),
    readRepoFile('lib/approval-threshold-registry.js'),
    readRepoFile('lib/process-plan-critic.js'),
    readRepoFile('lib/approval-integrity.js'),
    readRepoFile('lib/foundation-current-sprint.js'),
    readRepoFile('lib/foundation-current-sprint-store.js'),
    readRepoFile('lib/code-quality-nightly-audit.js'),
    readRepoFile('lib/deep-audit-findings-closure-gate.js'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/foundation-build-closeout-process-gate-records.js'),
    readRepoFile(CLOSEOUT_DOC_PATH, { optional: true }),
  ])
  const gitState = getGitState()
  const [activeSprint, routeCards, planCriticRuns] = await Promise.all([
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID]),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])
  const closeouts = getFoundationBuildCloseouts()
  const card = routeCards.find(item => item.id === CARD_ID)
  const sourceProof = evaluateApprovalThresholdRegistryUsage({
    registrySource,
    planCriticSource,
    approvalIntegritySource,
    currentSprintSource,
    currentSprintStoreSource,
    codeQualityAuditSource: codeQualitySource,
    processScriptSource: scriptSource,
  })
  const dogfood = buildApprovalThresholdRegistryDogfoodProof()
  const audit = await buildCodeQualityNightlyAudit({
    repoRoot,
    skipEndpointFetch: true,
  })
  const thresholdAuditFindings = (audit.findings || []).filter(finding =>
    finding.id === 'approval-threshold-raw-literal' ||
      finding.proposedCard === CARD_ID,
  )
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card,
    changedFiles: CHANGED_FILES,
    declaredRisk: 'Plan Critic approval threshold policy, approval integrity, Current Sprint gate normalization, code-quality audit drift detector, deep-audit route table, process gate, closeout registry, and live sprint/backlog truth',
    repoRoot,
  })

  if (args.closeCard &&
    approval.ok &&
    meetsApprovalThreshold(approval.approval?.score) &&
    planReview.status === 'pass' &&
    meetsApprovalThreshold(planReview.score) &&
    sourceProof.ok &&
    dogfood.ok &&
    thresholdAuditFindings.length === 0) {
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

  addCheck(checks, approval.ok && approval.mode === 'v2' && meetsApprovalThreshold(approval.approval?.score), `approval validates at ${APPROVAL_MIN_APPROVED_PLAN_SCORE_LABEL}`, approval.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && meetsApprovalThreshold(planReview.score), 'Plan Critic passes for approval threshold registry card', buildPlanCriticResultSummary(planReview))
  addCheck(checks, sourceProof.ok, 'load-bearing threshold callers consume approval threshold registry', JSON.stringify(sourceProof.failed || []))
  addCheck(checks, dogfood.ok, 'dogfood rejects stale local threshold logic and below-threshold scores', dogfood.ok ? 'pass' : JSON.stringify(dogfood))
  addCheck(checks, thresholdAuditFindings.length === 0, 'code-quality audit no longer proposes approval threshold registry card', thresholdAuditFindings.map(finding => `${finding.id}:${finding.refs?.[0]?.path || ''}`).join(', ') || 'clean')
  addCheck(checks, packageJson.scripts?.['process:approval-threshold-registry-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:approval-threshold-registry-check'] || 'missing')
  addCheck(checks, registrySource.includes('buildApprovalThresholdRegistryDogfoodProof') && registrySource.includes('APPROVAL_MIN_APPROVED_PLAN_SCORE = 9.8'), 'registry module owns reusable proof and canonical threshold', 'lib/approval-threshold-registry.js')
  addCheck(checks, codeQualitySource.includes('evaluateApprovalThresholdRegistryUsage') && codeQualitySource.includes('approvalThresholdUsage'), 'nightly audit detector calls registry evaluator', 'lib/code-quality-nightly-audit.js')
  addCheck(checks, deepAuditClosureSource.includes(CARD_ID) && deepAuditClosureSource.includes(CLOSEOUT_KEY) && deepAuditClosureSource.includes("routeStatus: 'done'"), 'deep-audit route now names approval threshold closeout proof', 'lib/deep-audit-findings-closure-gate.js')
  addCheck(checks, scriptSource.includes('assertProcessCheckWriteAllowed') && scriptSource.includes('upsertFoundationCurrentSprintOverlay') && scriptSource.includes('updateBacklogItem'), 'focused script uses guarded backlog and sprint mutations', SCRIPT_PATH)
  addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeout?.backlogIds?.includes(CARD_ID), 'closeout registry resolves approval threshold closeout', closeout?.key || 'missing')
  addCheck(checks, !args.closeCard || afterCard?.lane === 'done', 'approval threshold registry card closes when requested', afterCard ? `${afterCard.lane}/${afterCard.priority}` : 'missing')
  addCheck(checks, !args.closeCard || afterSprint.sprint?.activeBlockerCardId === NEXT_CARD_ID, 'Current Sprint advances to Build Intel snapshot baseline card', afterSprint.sprint?.activeBlockerCardId || 'missing')
  addCheck(checks, !args.closeCard || sprintItem?.stage === 'done_this_sprint', 'Current Sprint marks approval threshold registry done', sprintItem?.stage || 'missing')
  addCheck(checks, nextCard && ['scoped', 'building_now', 'done'].includes(nextCard.lane), 'next Build Intel snapshot baseline card is live', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, afterPlanCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && meetsApprovalThreshold(run.score, run.passThreshold)) || args.closeCard, 'durable Plan Critic pass row exists', afterPlanCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, closeoutDoc.includes(CARD_ID) && closeoutDoc.includes(NEXT_CARD_ID), 'closeout handoff records shipped behavior and next card', closeoutDoc ? 'present' : 'missing')
  addCheck(checks, gitState.branch === 'main', 'repo branch posture is main', gitState.branch)
  addCheck(checks, gitState.head === gitState.originMain || Boolean(gitState.porcelain), 'repo is synced or in-flight card has tracked dirty work', gitState.head === gitState.originMain ? 'synced' : 'in-flight')

  const failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'risk' : 'healthy',
    generatedAt: new Date().toISOString(),
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    threshold: APPROVAL_MIN_APPROVED_PLAN_SCORE,
    activeBlocker: afterSprint.sprint?.activeBlockerCardId || null,
    sourceProof,
    dogfood,
    codeQualityAudit: {
      findingCount: audit.findings?.length || 0,
      proposedCards: audit.proposedCards || [],
      thresholdAuditFindingCount: thresholdAuditFindings.length,
    },
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Approval threshold registry check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Approval threshold registry check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
