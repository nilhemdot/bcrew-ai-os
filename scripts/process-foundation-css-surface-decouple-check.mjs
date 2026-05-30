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
  FOUNDATION_CSS_SURFACE_DECOUPLE_APPROVAL_PATH as APPROVAL_PATH,
  FOUNDATION_CSS_SURFACE_DECOUPLE_CARD_ID as CARD_ID,
  FOUNDATION_CSS_SURFACE_DECOUPLE_CLOSEOUT_KEY as CLOSEOUT_KEY,
  FOUNDATION_CSS_SURFACE_DECOUPLE_CLOSEOUT_PATH as CLOSEOUT_DOC_PATH,
  FOUNDATION_CSS_SURFACE_DECOUPLE_NEXT_CARD_ID as NEXT_CARD_ID,
  FOUNDATION_CSS_SURFACE_DECOUPLE_PLAN_PATH as PLAN_PATH,
  FOUNDATION_CSS_SURFACE_DECOUPLE_SCRIPT_PATH as SCRIPT_PATH,
  FOUNDATION_CSS_SURFACE_IMPORT_ORDER,
  FOUNDATION_CSS_SURFACE_PROOF_COMMANDS as PROOF_COMMANDS,
  buildFoundationCssSurfaceDecoupleDogfoodProof,
  evaluateFoundationCssSurfaceDecouple,
} from '../lib/foundation-css-surface-decouple.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-foundation-css-surface-decouple'
const CHANGED_FILES = [
  'public/styles.css',
  'public/styles-foundation-core.css',
  'public/styles-foundation-current-state.css',
  'public/styles-foundation-build-log.css',
  'public/styles-foundation-workflows.css',
  'lib/foundation-stylesheet-monolith-split.js',
  'lib/foundation-css-surface-decouple.js',
  SCRIPT_PATH,
  'lib/deep-audit-findings-closure-gate.js',
  'lib/foundation-build-closeout-process-gate-records.js',
  PLAN_PATH,
  APPROVAL_PATH,
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
        `foundation-css-surface-decouple-${stableRunId(PLAN_PATH)}`,
        CARD_ID,
        PLAN_PATH,
        planReview.status,
        Number(planReview.score) || 0,
        CHANGED_FILES,
        JSON.stringify(planReview.findings || []),
        JSON.stringify(planReview),
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
    ...item,
    cardId: item.cardId || item.backlogId || item.backlog_id,
    proofCommands: Array.isArray(item.proofCommands) ? item.proofCommands : [],
    notNextBoundaries: Array.isArray(item.notNextBoundaries) ? item.notNextBoundaries : [],
    metadata: item.metadata || {},
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
        definitionOfDone: 'Foundation CSS ownership modules reduce the broad core/workflows surfaces, preserve cascade order, and close the May 19 CSS/DOM audit finding with dogfood proof.',
        proofCommands: PROOF_COMMANDS,
        notNextBoundaries: [
          'Do not do a broad visual redesign.',
          'Do not rewrite unrelated CSS selectors.',
          'Do not change DOM render behavior.',
          'Do not start source/value/extraction expansion.',
          'Do not work MEETING-VAULT-ACL-001 Phase B.',
          'Do not mutate Drive permissions.',
          'Do not send external writes, rotate credentials, run paid/provider access, or perform private broad extraction.',
        ],
        existingWorkCheck: {
          existingCode: [
            'public/styles.css',
            'public/styles-foundation-core.css',
            'public/styles-foundation-workflows.css',
            'lib/foundation-stylesheet-monolith-split.js',
            'lib/deep-audit-findings-closure-gate.js',
          ],
          existingDocs: [
            'docs/_archive/audits/2026-05-19-foundation-deep-merge-audit.md',
            'docs/process/stylesheet-monolith-split-001-plan.md',
            PLAN_PATH,
          ],
          existingScripts: [
            'process:stylesheet-monolith-split-check',
            'process:code-quality-nightly-audit-check',
            'process:system-health-nightly-audit-check',
            'process:build-lane-repeated-failure-action-gate-check',
            'process:foundation-ship',
          ],
          existingPolicy: [
            'Green means raw green; classification is not repair.',
            'CSS surface watch rows must become owner-scoped modules or have explicit owner/threshold/next-trigger proof.',
            'Blockers block unsafe actions, not the whole overnight sprint.',
          ],
          reused: 'Reuses the stylesheet manifest split and narrows only two Foundation ownership slices.',
          notRebuilt: 'No redesign, no DOM renderer rewrite, no broad stylesheet migration.',
          exactGap: 'The May 19 deep audit found styles-foundation-workflows.css and styles-foundation-core.css remained broad enough to raise frontend drift risk.',
          overBroadRisk: 'A CSS cleanup can become a visual rewrite. This card moves cascade-preserving ownership blocks only.',
          readyBy: 'Steve approved unattended overnight audit-control cleanup with green-first gates.',
          readyAt: '2026-05-20T00:25:00-04:00',
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
        currentStatus: 'foundation_css_surface_decouple_done',
        nextAction: `Continue ${NEXT_CARD_ID}; keep the accountability loop moving after audit-control cleanup.`,
      },
    },
    items,
  }
}

async function applyLiveClose({ activeSprint, planReview, gitState }) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'close Foundation CSS surface decouple card and advance Current Sprint',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await updateBacklogItem(CARD_ID, {
    lane: 'done',
    priority: 'P2',
    rank: 86,
    nextAction: `Done under ${CLOSEOUT_KEY}; continue ${NEXT_CARD_ID}.`,
    statusNote: `Closed under ${CLOSEOUT_KEY}; Foundation Current State/System Inventory and Build Log/Current Sprint CSS now live in bounded ownership modules, broad core/workflows CSS dropped below risk budgets, and the May 19 CSS/DOM audit finding routes to shipped proof.`,
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
      reason: `${CARD_ID} closes CSS surface audit finding and advances to ${NEXT_CARD_ID}.`,
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  await initFoundationDb()

  const moduleSources = {}
  for (const modulePath of FOUNDATION_CSS_SURFACE_IMPORT_ORDER) {
    moduleSources[modulePath] = await readRepoFile(modulePath)
  }
  const [
    rootSource,
    packageJson,
    planSource,
    closeoutDoc,
    deepAuditClosureSource,
    approval,
  ] = await Promise.all([
    readRepoFile('public/styles.css'),
    readRepoJson('package.json'),
    readRepoFile(PLAN_PATH),
    readRepoFile(CLOSEOUT_DOC_PATH, { optional: true }),
    readRepoFile('lib/deep-audit-findings-closure-gate.js'),
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
  ])
  const gitState = getGitState()
  const [activeSprint, cards] = await Promise.all([
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID, 'STYLESHEET-MONOLITH-SPLIT-001']),
  ])
  const card = cards.find(item => item.id === CARD_ID)
  const nextCard = cards.find(item => item.id === NEXT_CARD_ID)
  const stylesheetCard = cards.find(item => item.id === 'STYLESHEET-MONOLITH-SPLIT-001')
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: { id: CARD_ID, priority: 'P2' },
    planPath: PLAN_PATH,
    changedFiles: CHANGED_FILES,
  })
  const closeouts = getFoundationBuildCloseouts()
  const closeout = closeouts.find(item => item.key === CLOSEOUT_KEY)
  const stylesheetCloseout = closeouts.find(item => item.key === 'stylesheet-monolith-split-v1')
  const evaluation = evaluateFoundationCssSurfaceDecouple({
    rootSource,
    moduleSources,
    deepAuditClosureSource,
    closeouts,
  })
  const dogfood = buildFoundationCssSurfaceDecoupleDogfoodProof()

  if (args.closeCard &&
    approval.ok &&
    Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    planReview.status === 'pass' &&
    Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE &&
    evaluation.ok &&
    dogfood.ok &&
    deepAuditClosureSource.includes("findingId: 'foundation-dom-rebuild-risk'") &&
    deepAuditClosureSource.includes("routeStatus: 'done'")) {
    await applyLiveClose({ activeSprint, planReview, gitState })
  }

  const [afterSprint, afterCards] = await Promise.all([
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds([CARD_ID, NEXT_CARD_ID]),
  ])
  const afterCard = afterCards.find(item => item.id === CARD_ID)
  const afterNextCard = afterCards.find(item => item.id === NEXT_CARD_ID)
  const sprintItem = afterSprint.items.find(item => item.cardId === CARD_ID)

  addCheck(checks, approval.ok && approval.mode === 'v2' && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for CSS surface card', buildPlanCriticResultSummary(planReview))
  addCheck(checks, card && ['scoped', 'executing', 'done'].includes(card.lane), 'live backlog card exists', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, nextCard && ['scoped', 'research', 'done'].includes(nextCard.lane), 'next card exists in live backlog', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
  addCheck(checks, stylesheetCard?.lane === 'done' && stylesheetCloseout, 'stylesheet manifest split is shipped and reusable', stylesheetCloseout ? stylesheetCloseout.key : (stylesheetCard ? `${stylesheetCard.id}:${stylesheetCard.lane}` : 'missing'))
  addCheck(checks, evaluation.ok, 'CSS ownership split passes real repo evaluation', `${evaluation.failed.length} failed checks`)
  for (const check of evaluation.checks) addCheck(checks, check.ok, check.check, check.detail)
  addCheck(checks, dogfood.ok, 'dogfood rejects missing import, stale broad selectors, and unresolved audit route', JSON.stringify(dogfood.rejected))
  addCheck(checks, packageJson.scripts?.['process:foundation-css-surface-decouple-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:foundation-css-surface-decouple-check'] || 'missing')
  addCheck(checks, planSource.includes('Build Log/Current Sprint') && planSource.includes('Current State/System Inventory') && planSource.includes('preserve cascade order'), 'plan names ownership slices and cascade boundary', PLAN_PATH)
  addCheck(checks, closeoutDoc.includes(CARD_ID) && closeoutDoc.includes(NEXT_CARD_ID), 'closeout handoff records shipped behavior and next card', closeoutDoc ? 'present' : 'missing')
  addCheck(checks, closeout?.backlogIds?.includes(CARD_ID), 'closeout registry resolves CSS surface closeout', closeout?.key || 'missing')
  addCheck(checks, !args.closeCard || afterCard?.lane === 'done', 'CSS surface card closes when requested', afterCard ? `${afterCard.lane}/${afterCard.priority}` : 'missing')
  addCheck(checks, !args.closeCard || sprintItem?.stage === 'done_this_sprint', 'Current Sprint marks CSS surface card done', sprintItem?.stage || 'missing')
  addCheck(checks, !args.closeCard || afterSprint.sprint?.activeBlockerCardId === NEXT_CARD_ID, 'Current Sprint advances to Decision accountability card', afterSprint.sprint?.activeBlockerCardId || 'missing')
  addCheck(checks, afterNextCard && ['scoped', 'research', 'done'].includes(afterNextCard.lane), 'next Decision card remains live', afterNextCard ? `${afterNextCard.id}:${afterNextCard.lane}` : 'missing')
  addCheck(checks, gitState.branch === 'main', 'repo branch posture is main', gitState.branch)
  addCheck(checks, gitState.head === gitState.originMain || Boolean(gitState.porcelain), 'repo is synced or in-flight card has tracked dirty work', gitState.head === gitState.originMain ? 'synced' : 'in-flight')

  await closeFoundationDb()

  const failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'risk' : 'healthy',
    generatedAt: new Date().toISOString(),
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    activeBlocker: afterSprint.sprint?.activeBlockerCardId || null,
    lineCounts: evaluation.lineCounts,
    dogfood: dogfood.rejected,
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Foundation CSS surface decouple check: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }

  if (failed.length) process.exit(1)
}

main().catch(async error => {
  try {
    await closeFoundationDb()
  } catch {}
  console.error(error instanceof Error ? error.stack : String(error))
  process.exit(1)
})
