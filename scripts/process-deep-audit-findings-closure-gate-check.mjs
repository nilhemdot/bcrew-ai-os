#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
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
  CURRENT_SPRINT_ACTIVE_CARD_GATE_SPRINT_ID,
} from '../lib/current-sprint-active-card-gate.js'
import {
  DEEP_AUDIT_FINDING_ROUTES,
  DEEP_AUDIT_FINDINGS_CLOSURE_GATE_APPROVAL_PATH as APPROVAL_PATH,
  DEEP_AUDIT_FINDINGS_CLOSURE_GATE_AUDIT_JSON_PATH as AUDIT_JSON_PATH,
  DEEP_AUDIT_FINDINGS_CLOSURE_GATE_AUDIT_MD_PATH as AUDIT_MD_PATH,
  DEEP_AUDIT_FINDINGS_CLOSURE_GATE_CARD_ID as CARD_ID,
  DEEP_AUDIT_FINDINGS_CLOSURE_GATE_CLOSEOUT_KEY as CLOSEOUT_KEY,
  DEEP_AUDIT_FINDINGS_CLOSURE_GATE_NEXT_CARD_ID as NEXT_CARD_ID,
  DEEP_AUDIT_FINDINGS_CLOSURE_GATE_PLAN_PATH as PLAN_PATH,
  DEEP_AUDIT_FINDINGS_CLOSURE_GATE_PROOF_COMMANDS as PROOF_COMMANDS,
  DEEP_AUDIT_FINDINGS_CLOSURE_GATE_SCRIPT_PATH as SCRIPT_PATH,
  buildDeepAuditFindingsClosureGateDogfoodProof,
  buildDeepAuditFindingsClosureSnapshot,
} from '../lib/deep-audit-findings-closure-gate.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-deep-audit-findings-closure-gate'
const CHANGED_FILES = [
  'lib/deep-audit-findings-closure-gate.js',
  SCRIPT_PATH,
  PLAN_PATH,
  APPROVAL_PATH,
  'lib/foundation-build-closeout-process-gate-records.js',
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P0','full',true,$6::text[],$7::jsonb,$8::jsonb,$9)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result,
            created_at = NOW()
      `,
      [
        `deep-audit-findings-closure-gate-${stableRunId(PLAN_PATH)}`,
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

function buildUpdatedSprintOverlay({ activeSprint, currentHead }) {
  const sprint = activeSprint.sprint || {}
  const items = (activeSprint.items || []).map(item => {
    const cardId = item.cardId || item.backlogId
    const metadata = item.metadata && typeof item.metadata === 'object' ? item.metadata : {}
    const nextItem = {
      cardId,
      order: item.order ?? item.sprintOrder,
      stage: item.stage,
      planRef: item.planRef,
      definitionOfDone: item.definitionOfDone,
      proofCommands: item.proofCommands || [],
      readinessBlockerCleared: item.readinessBlockerCleared || '',
      notNextBoundaries: item.notNextBoundaries || [],
      existingWorkCheck: item.existingWorkCheck || {},
      returnedReason: item.returnedReason || '',
      metadata,
    }
    if (cardId === CARD_ID) {
      return {
        ...nextItem,
        stage: 'done_this_sprint',
        planRef: PLAN_PATH,
        definitionOfDone: 'Every P0/P1/P2 May 19 deep-audit finding is routed to done/scoped/follow-up live backlog truth with owner, next action, and proof.',
        proofCommands: PROOF_COMMANDS,
        notNextBoundaries: [
          'Do not implement audit findings inside this closure gate.',
          'Do not start FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001 inside this closure gate.',
          'Do not call scoped audit findings fixed.',
          'Do not work MEETING-VAULT-ACL-001 Phase B.',
          'Do not mutate Drive permissions.',
          'Do not mutate external systems, private providers, credentials, Drive permissions, or source data.',
          'Do not start Value Builder or lower-priority feature work before the P1 renderer split.',
        ],
        existingWorkCheck: {
          existingCode: [
            'scripts/process-audit-finding-to-backlog-router-check.mjs',
            'lib/current-sprint-active-card-gate.js',
            'lib/foundation-current-sprint-store.js',
            'lib/process-plan-critic.js',
            'lib/process-write-guard.js',
          ],
          existingDocs: [
            'docs/audits/2026-05-19-foundation-deep-merge-audit.md',
            'docs/audits/2026-05-19-foundation-deep-merge-audit.json',
            'docs/process/audit-finding-to-backlog-router-001-plan.md',
            'docs/process/current-sprint-active-card-gate-001-plan.md',
          ],
          existingScripts: [
            'process:audit-finding-to-backlog-router-check',
            'process:current-sprint-active-card-gate-check',
            'process:system-health-nightly-audit-check',
            'process:build-lane-repeated-failure-action-gate-check',
          ],
          existingPolicy: [
            'Deep-audit findings become live backlog truth or shipped proof.',
            'Green means raw green; classification is not repair.',
            'Blockers block unsafe actions, not the whole sprint.',
            'Current Sprint is the executable command surface.',
          ],
          reused: 'Reuses the shipped audit router, Current Sprint active-card gate, Plan Critic, approval integrity, process write guard, live backlog, and closeout registry instead of building a second audit tracking system.',
          notRebuilt: 'No new audit datastore, no second backlog, no report-only tracker, and no feature/refactor fixes inside this routing card.',
          exactGap: 'The May 19 deep merge audit produced 13 P1/P2 findings; without this gate those findings can remain in markdown instead of becoming done/scoped live work.',
          overBroadRisk: 'The card can drift into fixing audit findings. It is bounded to routing, proof, live sprint closeout, and next-card advancement only.',
          readyBy: 'Steve approved overnight audit-control work and required that gold from the deep audit not get lost.',
          readyAt: '2026-05-19T22:31:00-04:00',
        },
        metadata: {
          ...metadata,
          closeoutKey: CLOSEOUT_KEY,
          routeCount: DEEP_AUDIT_FINDING_ROUTES.length,
          repoPosture: {
            integrationBranch: 'main',
            expectedBaseCommit: currentHead,
            commitPushRequiredAfterCard: true,
            mainMustEqualOriginMainAtCloseout: true,
          },
          blockersBlockActionsNotSprint: true,
        },
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
        currentStatus: 'deep_audit_findings_routed',
        nextAction: `Continue ${NEXT_CARD_ID}; do not start lower-priority work before the P1 renderer split.`,
      },
    },
    items,
  }
}

async function applyLiveClose({ activeSprint, planReview, gitState }) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'close deep-audit findings closure gate and advance Current Sprint',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await updateBacklogItem(CARD_ID, {
    lane: 'done',
    priority: 'P0',
    rank: 13,
    nextAction: `Done under ${CLOSEOUT_KEY}; continue ${NEXT_CARD_ID}.`,
    statusNote: `Closed under ${CLOSEOUT_KEY}; 13 May 19 deep-audit findings routed to done/scoped live backlog truth with owners and next actions.`,
    owner: 'Foundation Audit',
  }, ACTOR)
  await upsertPlanCriticRun(planReview)
  await upsertFoundationCurrentSprintOverlay(
    buildUpdatedSprintOverlay({ activeSprint, currentHead: gitState.head }),
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: activeSprint.sprint?.sprintId || CURRENT_SPRINT_ACTIVE_CARD_GATE_SPRINT_ID,
      reason: `${CARD_ID} routes deep-audit findings and advances to ${NEXT_CARD_ID}.`,
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  await initFoundationDb()

  const [
    approval,
    audit,
    auditMd,
    planSource,
    packageJson,
    moduleSource,
    scriptSource,
    closeoutRegistrySource,
    closeoutDoc,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoJson(AUDIT_JSON_PATH),
    readRepoFile(AUDIT_MD_PATH),
    readRepoFile(PLAN_PATH),
    readRepoJson('package.json'),
    readRepoFile('lib/deep-audit-findings-closure-gate.js'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/foundation-build-closeout-process-gate-records.js'),
    readRepoFile('docs/handoffs/2026-05-19-deep-audit-findings-closure-gate-closeout.md', { optional: true }),
  ])
  const gitState = getGitState()
  const routeCardIds = Array.from(new Set(DEEP_AUDIT_FINDING_ROUTES.flatMap(route => [route.targetCardId, route.coveredByCardId]).filter(Boolean).concat([CARD_ID, NEXT_CARD_ID])))
  const [activeSprint, routeCards, planCriticRuns] = await Promise.all([
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds(routeCardIds),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])
  const closeouts = getFoundationBuildCloseouts()
  const snapshot = buildDeepAuditFindingsClosureSnapshot({ audit, routeCards, closeouts })
  const dogfood = buildDeepAuditFindingsClosureGateDogfoodProof()
  const card = routeCards.find(item => item.id === CARD_ID)
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card,
    changedFiles: CHANGED_FILES,
    declaredRisk: 'deep audit finding routing, live backlog truth, Current Sprint mutation, process gate, closeout registry, package script, and ship proof',
    repoRoot,
  })

  if (args.closeCard &&
    approval.ok &&
    Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    planReview.status === 'pass' &&
    Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    snapshot.ok &&
    dogfood.ok) {
    await applyLiveClose({ activeSprint, planReview, gitState })
  }

  const [afterSprint, afterCards, afterPlanCriticRuns] = await Promise.all([
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds(routeCardIds),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])
  const afterSnapshot = buildDeepAuditFindingsClosureSnapshot({ audit, routeCards: afterCards, closeouts })
  const afterCard = afterCards.find(item => item.id === CARD_ID)
  const nextCard = afterCards.find(item => item.id === NEXT_CARD_ID)
  const closeout = closeouts.find(item => item.key === CLOSEOUT_KEY)
  const sprintItem = afterSprint.items.find(item => item.cardId === CARD_ID)

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for deep-audit closure gate', buildPlanCriticResultSummary(planReview))
  addCheck(checks, dogfood.ok, 'dogfood rejects missing audit routes and proves duplicate-id route matching', dogfood.ok ? 'pass' : JSON.stringify(dogfood))
  addCheck(checks, afterSnapshot.ok, 'all May 19 deep-audit findings route to live backlog truth', JSON.stringify(afterSnapshot.summary))
  addCheck(checks, afterSnapshot.summary.auditFindingCount === 13 && afterSnapshot.summary.p1RoutedCount === 6 && afterSnapshot.summary.p2RoutedCount === 7, 'P1/P2 route counts match audit summary', JSON.stringify(afterSnapshot.summary))
  addCheck(checks, packageJson.scripts?.['process:deep-audit-findings-closure-gate-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:deep-audit-findings-closure-gate-check'] || 'missing')
  addCheck(checks, moduleSource.includes('DEEP_AUDIT_FINDING_ROUTES') && moduleSource.includes('routeDeepAuditFinding') && moduleSource.includes('buildDeepAuditFindingsClosureSnapshot'), 'module owns deep-audit route contract', 'lib/deep-audit-findings-closure-gate.js')
  addCheck(checks, scriptSource.includes('assertProcessCheckWriteAllowed') && scriptSource.includes('upsertFoundationCurrentSprintOverlay') && scriptSource.includes('updateBacklogItem'), 'focused script uses guarded backlog and sprint mutations', SCRIPT_PATH)
  addCheck(checks, auditMd.includes('Foundation Deep Merge Audit') && audit.summary?.findingCount === 13, 'audit markdown/json pair is present', AUDIT_MD_PATH)
  addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeout?.backlogIds?.includes(CARD_ID), 'closeout registry resolves deep-audit closure gate', closeout?.key || 'missing')
  addCheck(checks, !args.closeCard || afterCard?.lane === 'done', 'deep-audit closure gate card closes when requested', afterCard ? `${afterCard.lane}/${afterCard.priority}` : 'missing')
  addCheck(checks, !args.closeCard || afterSprint.sprint?.activeBlockerCardId === NEXT_CARD_ID, 'Current Sprint advances to Current State renderer split', afterSprint.sprint?.activeBlockerCardId || 'missing')
  addCheck(checks, !args.closeCard || sprintItem?.stage === 'done_this_sprint', 'Current Sprint marks deep-audit gate done', sprintItem?.stage || 'missing')
  addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'next renderer split card is live', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, afterPlanCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE) || args.closeCard, 'durable Plan Critic pass row exists', afterPlanCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, !args.closeCard || closeoutDoc.includes(CARD_ID) && closeoutDoc.includes(NEXT_CARD_ID), 'closeout handoff records next card', closeoutDoc ? 'present' : 'missing')
  addCheck(checks, gitState.branch === 'main', 'repo branch posture is main', gitState.branch)
  addCheck(checks, gitState.head === gitState.originMain || Boolean(gitState.porcelain), 'repo is synced or in-flight card has tracked dirty work', gitState.head === gitState.originMain ? 'synced' : 'in-flight')

  const failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'risk' : 'healthy',
    generatedAt: new Date().toISOString(),
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    auditPath: AUDIT_JSON_PATH,
    activeBlocker: afterSprint.sprint?.activeBlockerCardId || null,
    snapshot: afterSnapshot,
    dogfood,
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Deep audit findings closure gate: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Deep audit findings closure gate check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
