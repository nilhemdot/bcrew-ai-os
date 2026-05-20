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
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  initFoundationDb,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'
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
  FOUNDATION_CLIENT_CURRENT_STATE_EXTRACT_APPROVAL_PATH as APPROVAL_PATH,
  FOUNDATION_CLIENT_CURRENT_STATE_EXTRACT_CARD_ID as CARD_ID,
  FOUNDATION_CLIENT_CURRENT_STATE_EXTRACT_CLOSEOUT_KEY as CLOSEOUT_KEY,
  FOUNDATION_CLIENT_CURRENT_STATE_EXTRACT_NEXT_CARD_ID as NEXT_CARD_ID,
  FOUNDATION_CLIENT_CURRENT_STATE_EXTRACT_PLAN_PATH as PLAN_PATH,
  FOUNDATION_CLIENT_CURRENT_STATE_EXTRACT_PROOF_COMMANDS as PROOF_COMMANDS,
  FOUNDATION_CLIENT_CURRENT_STATE_EXTRACT_SCRIPT_PATH as SCRIPT_PATH,
  buildFoundationClientCurrentStateExtractDogfoodProof,
  evaluateFoundationClientCurrentStateExtraction,
} from '../lib/foundation-client-current-state-extract.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-foundation-client-current-state-extract'
const CHANGED_FILES = [
  'lib/foundation-client-current-state-extract.js',
  'lib/code-quality-nightly-audit.js',
  SCRIPT_PATH,
  PLAN_PATH,
  APPROVAL_PATH,
  'lib/foundation-build-closeout-route-frontend-records.js',
  'lib/deep-audit-findings-closure-gate.js',
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
        VALUES ($1,$2,$3,$4,$5,10,9.8,'P1','full',true,$6::text[],$7::jsonb,$8::jsonb,$9)
        ON CONFLICT (run_id) DO UPDATE
        SET status = EXCLUDED.status,
            score = EXCLUDED.score,
            changed_files = EXCLUDED.changed_files,
            findings = EXCLUDED.findings,
            result = EXCLUDED.result,
            created_at = NOW()
      `,
      [
        `foundation-client-current-state-extract-${stableRunId(PLAN_PATH)}`,
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
        definitionOfDone: 'Current State renderer ownership is extracted from public/foundation.js, the nightly audit no longer opens the stale monolith finding, and the next audit-control card is active.',
        proofCommands: PROOF_COMMANDS,
        notNextBoundaries: [
          'Do not redesign Foundation Overview.',
          'Do not rewrite the Current State renderer unless proof shows the extraction invariant fails.',
          'Do not work MEETING-VAULT-ACL-001 Phase B.',
          'Do not mutate Drive permissions.',
          'Do not change Foundation API contracts, source data, Drive permissions, credentials, providers, or private extraction.',
          'Do not start Value Builder or lower-priority feature work before the Build Log API P2 repair.',
        ],
        existingWorkCheck: {
          existingCode: [
            'public/foundation-current-state-renderers.js',
            'public/foundation.js',
            'public/foundation.html',
            'lib/foundation-frontend-current-state-renderers-split.js',
            'lib/code-quality-nightly-audit.js',
          ],
          existingDocs: [
            'docs/process/frontend-current-state-renderers-split-001-plan.md',
            'docs/process/deep-audit-findings-closure-gate-001-plan.md',
            'docs/audits/2026-05-19-foundation-deep-merge-audit.md',
          ],
          existingScripts: [
            'process:frontend-current-state-renderers-split-check',
            'process:code-quality-nightly-audit-check',
            'process:system-health-nightly-audit-check',
            'process:build-lane-repeated-failure-action-gate-check',
          ],
          existingPolicy: [
            'Audit findings become live backlog truth or shipped proof.',
            'Green means raw green; classification is not repair.',
            'Current Sprint is the executable command surface.',
            'Blockers block unsafe actions, not the whole sprint.',
          ],
          reused: 'Reuses the existing Current State split module and focused split proof instead of rewriting Foundation Overview.',
          notRebuilt: 'No UI redesign, no new frontend build system, no API contract change, and no broad renderer rewrite.',
          exactGap: 'The nightly audit still proposes FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001 from a stale public/foundation.js monolith detector even after the renderer moved.',
          overBroadRisk: 'The card can drift into a new frontend split. It is bounded to extraction proof, stale audit suppression, closeout, and sprint advancement.',
          readyBy: 'Steve approved unattended overnight audit-control work and required audit findings to become fixes, live cards, gates, or proof.',
          readyAt: '2026-05-19T22:50:00-04:00',
        },
        metadata: {
          ...metadata,
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
        currentStatus: 'current_state_renderer_audit_finding_closed',
        nextAction: `Continue ${NEXT_CARD_ID}; keep audit P2 cleanup moving without source/value expansion.`,
      },
    },
    items,
  }
}

async function applyLiveClose({ activeSprint, planReview, gitState }) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'close Current State renderer extract card and advance Current Sprint',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await updateBacklogItem(CARD_ID, {
    lane: 'done',
    priority: 'P1',
    rank: 80,
    nextAction: `Done under ${CLOSEOUT_KEY}; continue ${NEXT_CARD_ID}.`,
    statusNote: `Closed under ${CLOSEOUT_KEY}; Current State renderer ownership is extracted from public/foundation.js and the nightly audit no longer proposes the stale monolith card when extraction proof passes.`,
    owner: 'Foundation Frontend',
  }, ACTOR)
  await upsertPlanCriticRun(planReview)
  await upsertFoundationCurrentSprintOverlay(
    buildUpdatedSprintOverlay({ activeSprint, currentHead: gitState.head }),
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: activeSprint.sprint?.sprintId,
      reason: `${CARD_ID} closes stale Current State audit finding and advances to ${NEXT_CARD_ID}.`,
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
    foundationSource,
    currentStateSource,
    foundationHtml,
    moduleSource,
    codeQualitySource,
    scriptSource,
    closeoutRegistrySource,
    deepAuditClosureSource,
    closeoutDoc,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile(PLAN_PATH),
    readRepoJson('package.json'),
    readRepoFile('public/foundation.js'),
    readRepoFile('public/foundation-current-state-renderers.js'),
    readRepoFile('public/foundation.html'),
    readRepoFile('lib/foundation-client-current-state-extract.js'),
    readRepoFile('lib/code-quality-nightly-audit.js'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('lib/foundation-build-closeout-route-frontend-records.js'),
    readRepoFile('lib/deep-audit-findings-closure-gate.js'),
    readRepoFile('docs/handoffs/2026-05-19-foundation-client-current-state-extract-closeout.md', { optional: true }),
  ])
  const gitState = getGitState()
  const [activeSprint, routeCards, planCriticRuns] = await Promise.all([
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID, 'FRONTEND-CURRENT-STATE-RENDERERS-SPLIT-001']),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])
  const closeouts = getFoundationBuildCloseouts()
  const extraction = evaluateFoundationClientCurrentStateExtraction({
    foundationSource,
    currentStateSource,
    htmlSource: foundationHtml,
  })
  const dogfood = buildFoundationClientCurrentStateExtractDogfoodProof()
  const audit = await buildCodeQualityNightlyAudit({
    repoRoot,
    skipEndpointFetch: true,
  })
  const currentStateAuditFindings = (audit.findings || []).filter(finding =>
    finding.id === 'foundation-client-current-state-monolith' ||
      finding.proposedCard === CARD_ID,
  )
  const card = routeCards.find(item => item.id === CARD_ID)
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card,
    changedFiles: CHANGED_FILES,
    declaredRisk: 'frontend audit finding closure, nightly code-quality audit detector behavior, Current Sprint mutation, live backlog truth, process gate, closeout registry, and package script',
    repoRoot,
  })

  if (args.closeCard &&
    approval.ok &&
    Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    planReview.status === 'pass' &&
    Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    extraction.ok &&
    dogfood.ok &&
    currentStateAuditFindings.length === 0) {
    await applyLiveClose({ activeSprint, planReview, gitState })
  }

  const [afterSprint, afterCards, afterPlanCriticRuns] = await Promise.all([
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID, 'FRONTEND-CURRENT-STATE-RENDERERS-SPLIT-001']),
    getPlanCriticRunsByCardIds([CARD_ID]),
  ])
  const afterCard = afterCards.find(item => item.id === CARD_ID)
  const nextCard = afterCards.find(item => item.id === NEXT_CARD_ID)
  const splitCard = afterCards.find(item => item.id === 'FRONTEND-CURRENT-STATE-RENDERERS-SPLIT-001')
  const closeout = closeouts.find(item => item.key === CLOSEOUT_KEY)
  const sprintItem = afterSprint.items.find(item => item.cardId === CARD_ID)

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for Current State extract card', buildPlanCriticResultSummary(planReview))
  addCheck(checks, extraction.ok, 'Current State renderer is extracted and bounded', JSON.stringify(extraction))
  addCheck(checks, dogfood.ok, 'dogfood rejects root-owned renderer, missing module, and wrong script order', dogfood.ok ? 'pass' : JSON.stringify(dogfood))
  addCheck(checks, currentStateAuditFindings.length === 0, 'code-quality audit no longer proposes stale Current State monolith card', currentStateAuditFindings.map(finding => `${finding.id}:${finding.refs?.[0]?.path || ''}`).join(', ') || 'clean')
  addCheck(checks, splitCard?.lane === 'done', 'prior frontend Current State split exists as shipped proof', splitCard ? `${splitCard.id}:${splitCard.lane}` : 'missing')
  addCheck(checks, packageJson.scripts?.['process:foundation-client-current-state-extract-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:foundation-client-current-state-extract-check'] || 'missing')
  addCheck(checks, moduleSource.includes('evaluateFoundationClientCurrentStateExtraction') && moduleSource.includes('buildFoundationClientCurrentStateExtractDogfoodProof'), 'module owns reusable extraction proof', 'lib/foundation-client-current-state-extract.js')
  addCheck(checks, codeQualitySource.includes('isFoundationClientCurrentStateExtracted') && codeQualitySource.includes("surface.id === 'foundation-client-current-state-monolith'"), 'nightly audit detector uses extraction proof before suppressing stale finding', 'lib/code-quality-nightly-audit.js')
  addCheck(checks, scriptSource.includes('assertProcessCheckWriteAllowed') && scriptSource.includes('upsertFoundationCurrentSprintOverlay') && scriptSource.includes('updateBacklogItem'), 'focused script uses guarded backlog and sprint mutations', SCRIPT_PATH)
  addCheck(checks, deepAuditClosureSource.includes(CARD_ID) && deepAuditClosureSource.includes(CLOSEOUT_KEY), 'deep-audit route now names Current State closeout proof', 'lib/deep-audit-findings-closure-gate.js')
  addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeout?.backlogIds?.includes(CARD_ID), 'closeout registry resolves Current State extract closeout', closeout?.key || 'missing')
  addCheck(checks, !args.closeCard || afterCard?.lane === 'done', 'Current State extract card closes when requested', afterCard ? `${afterCard.lane}/${afterCard.priority}` : 'missing')
  addCheck(checks, !args.closeCard || afterSprint.sprint?.activeBlockerCardId === NEXT_CARD_ID, 'Current Sprint advances to Build Log API card', afterSprint.sprint?.activeBlockerCardId || 'missing')
  addCheck(checks, !args.closeCard || sprintItem?.stage === 'done_this_sprint', 'Current Sprint marks Current State extract done', sprintItem?.stage || 'missing')
  addCheck(checks, nextCard && ['scoped', 'executing', 'done'].includes(nextCard.lane), 'next Build Log API card is live', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
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
    activeBlocker: afterSprint.sprint?.activeBlockerCardId || null,
    extraction,
    dogfood,
    codeQualityAudit: {
      findingCount: audit.findings?.length || 0,
      proposedCards: audit.proposedCards || [],
      currentStateAuditFindingCount: currentStateAuditFindings.length,
    },
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Foundation client Current State extract: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Foundation client Current State extract check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
