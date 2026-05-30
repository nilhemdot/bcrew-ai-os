#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  APPROVAL_MIN_APPROVED_PLAN_SCORE,
  meetsApprovalThreshold,
} from '../lib/approval-threshold-registry.js'
import {
  BUILD_INTEL_SNAPSHOT_BASELINE_APPROVAL_PATH as APPROVAL_PATH,
  BUILD_INTEL_SNAPSHOT_BASELINE_CARD_ID as CARD_ID,
  BUILD_INTEL_SNAPSHOT_BASELINE_CLOSEOUT_KEY as CLOSEOUT_KEY,
  BUILD_INTEL_SNAPSHOT_BASELINE_CLOSEOUT_PATH as CLOSEOUT_DOC_PATH,
  BUILD_INTEL_SNAPSHOT_BASELINE_NEXT_CARD_ID as NEXT_CARD_ID,
  BUILD_INTEL_SNAPSHOT_BASELINE_PLAN_PATH as PLAN_PATH,
  BUILD_INTEL_SNAPSHOT_BASELINE_PROOF_COMMANDS as PROOF_COMMANDS,
  BUILD_INTEL_SNAPSHOT_BASELINE_SCRIPT_PATH as SCRIPT_PATH,
  buildBuildIntelSnapshotBaselineDogfoodProof,
  evaluateBuildIntelSnapshotBaselineUsage,
  isBuildIntelSnapshotBaselineEvidence,
} from '../lib/build-intel-snapshot-baseline.js'
import { buildCodeQualityNightlyAudit } from '../lib/code-quality-nightly-audit.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  GSTACK_BUILD_INTEL_EXPECTED_COMMIT,
  GSTACK_BUILD_INTEL_LOCAL_MIRROR,
  buildGStackBuildIntelSnapshot,
} from '../lib/gstack-build-intel.js'
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

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-build-intel-snapshot-baseline'
const CHANGED_FILES = [
  'lib/build-intel-snapshot-baseline.js',
  'lib/gstack-build-intel.js',
  'scripts/process-gstack-build-intel-check.mjs',
  'lib/code-quality-nightly-audit.js',
  'lib/foundation-intelligence-audit-verifier.js',
  'lib/deep-audit-findings-closure-gate.js',
  'docs/source-notes/github-build-intel.md',
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
        `build-intel-snapshot-baseline-${stableRunId(PLAN_PATH)}`,
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

function buildUpdatedSprintOverlay({ activeSprint, currentHead, snapshot }) {
  const sprint = activeSprint.sprint || {}
  const items = (activeSprint.items || []).map(item => {
    const nextItem = normalizeSprintItem(item)
    if (nextItem.cardId === CARD_ID) {
      return {
        ...nextItem,
        stage: 'done_this_sprint',
        planRef: PLAN_PATH,
        definitionOfDone: 'Fixed Build Intel inspected commits are labeled as snapshot evidence with source posture, as-of metadata, and a separate latest-monitoring boundary.',
        proofCommands: PROOF_COMMANDS,
        notNextBoundaries: [
          'Do not build a new GitHub crawler.',
          'Do not run live GitHub extraction.',
          'Do not import GStack code or install GStack.',
          'Do not auto-create backlog cards from Build Intel findings.',
          'Do not start source/value/extraction expansion from this card.',
          'Do not work MEETING-VAULT-ACL-001 Phase B.',
          'Do not mutate Drive permissions.',
        ],
        existingWorkCheck: {
          existingCode: [
            'lib/gstack-build-intel.js',
            'scripts/process-gstack-build-intel-check.mjs',
            'lib/code-quality-nightly-audit.js',
            'lib/foundation-intelligence-audit-verifier.js',
            'lib/deep-audit-findings-closure-gate.js',
          ],
          existingDocs: [
            'docs/source-notes/github-build-intel.md',
            'docs/_archive/audits/2026-05-19-foundation-deep-merge-audit.md',
            PLAN_PATH,
          ],
          existingScripts: [
            'process:gstack-build-intel-check',
            'process:code-quality-nightly-audit-check',
            'process:system-health-nightly-audit-check',
            'process:build-lane-repeated-failure-action-gate-check',
            'process:foundation-ship',
          ],
          existingPolicy: [
            'Build Intel public GitHub sources are read-only and proposal-only.',
            'Snapshot evidence is not latest monitoring truth.',
            'Audit findings must route into live backlog truth or shipped proof.',
          ],
          reused: 'Reuses the existing GStack Build Intel source map, scorecard, source note, code-quality audit, and intelligence verifier.',
          notRebuilt: 'No GitHub crawler, no repo clone, no external call, no code import, no source/value expansion.',
          exactGap: 'The May 19 deep audit found a fixed Build Intel commit treated as expected truth instead of snapshot evidence.',
          overBroadRisk: 'The card can drift into building a full GitHub monitor. It is bounded to semantics, proof, and route closure.',
          readyBy: 'Steve approved unattended overnight audit-control work and required audit findings to become fixes, live cards, gates, or proof.',
          readyAt: '2026-05-19T23:45:00-04:00',
        },
        metadata: {
          ...nextItem.metadata,
          closeoutKey: CLOSEOUT_KEY,
          snapshotBaseline: snapshot.snapshotBaseline,
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
        currentStatus: 'build_intel_snapshot_baseline_done',
        nextAction: `Continue ${NEXT_CARD_ID}; decide the next data-backed closeout source slice or prove existing registry extract covers it.`,
      },
    },
    items,
  }
}

async function applyLiveClose({ activeSprint, planReview, gitState, snapshot }) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'close Build Intel snapshot baseline card and advance Current Sprint',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await updateBacklogItem(CARD_ID, {
    lane: 'done',
    priority: 'P2',
    rank: 80,
    nextAction: `Done under ${CLOSEOUT_KEY}; continue ${NEXT_CARD_ID}.`,
    statusNote: `Closed under ${CLOSEOUT_KEY}; fixed Build Intel commits are snapshot evidence with explicit latest-monitoring boundaries.`,
    owner: 'Build Intel',
  }, ACTOR)
  await upsertPlanCriticRun(planReview)
  await upsertFoundationCurrentSprintOverlay(
    buildUpdatedSprintOverlay({ activeSprint, currentHead: gitState.head, snapshot }),
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: activeSprint.sprint?.sprintId,
      reason: `${CARD_ID} closes fixed Build Intel commit-baseline drift and advances to ${NEXT_CARD_ID}.`,
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
    baselineSource,
    gstackSource,
    gstackProcessSource,
    codeQualitySource,
    intelligenceVerifierSource,
    deepAuditClosureSource,
    sourceNoteSource,
    scriptSource,
    closeoutRegistrySource,
    closeoutDoc,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile(PLAN_PATH),
    readRepoJson('package.json'),
    readRepoFile('lib/build-intel-snapshot-baseline.js'),
    readRepoFile('lib/gstack-build-intel.js'),
    readRepoFile('scripts/process-gstack-build-intel-check.mjs'),
    readRepoFile('lib/code-quality-nightly-audit.js'),
    readRepoFile('lib/foundation-intelligence-audit-verifier.js'),
    readRepoFile('lib/deep-audit-findings-closure-gate.js'),
    readRepoFile('docs/source-notes/github-build-intel.md'),
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
  const sourceProof = evaluateBuildIntelSnapshotBaselineUsage({
    baselineSource,
    gstackSource,
    gstackProcessSource,
    codeQualityAuditSource: codeQualitySource,
    intelligenceVerifierSource,
    sourceNoteSource,
  })
  const dogfood = buildBuildIntelSnapshotBaselineDogfoodProof()
  const snapshot = await buildGStackBuildIntelSnapshot({
    repoRoot: GSTACK_BUILD_INTEL_LOCAL_MIRROR,
    allowMissingRepo: true,
  })
  const audit = await buildCodeQualityNightlyAudit({
    repoRoot,
    skipEndpointFetch: true,
  })
  const buildIntelAuditFindings = (audit.findings || []).filter(finding =>
    finding.id === 'fixed-build-intel-commit-baseline' ||
      finding.proposedCard === CARD_ID,
  )
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card,
    changedFiles: CHANGED_FILES,
    declaredRisk: 'Build Intel source posture, fixed commit snapshot semantics, code-quality audit drift detector, intelligence verifier, deep-audit route table, process gate, closeout registry, and live sprint/backlog truth',
    repoRoot,
  })

  if (args.closeCard &&
    approval.ok &&
    meetsApprovalThreshold(approval.approval?.score) &&
    planReview.status === 'pass' &&
    meetsApprovalThreshold(planReview.score) &&
    sourceProof.ok &&
    dogfood.ok &&
    snapshot.snapshotBaseline?.expectedSnapshotCommit === GSTACK_BUILD_INTEL_EXPECTED_COMMIT &&
    isBuildIntelSnapshotBaselineEvidence(snapshot.snapshotBaseline) &&
    buildIntelAuditFindings.length === 0) {
    await applyLiveClose({ activeSprint, planReview, gitState, snapshot })
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

  addCheck(checks, approval.ok && approval.mode === 'v2' && meetsApprovalThreshold(approval.approval?.score), 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && meetsApprovalThreshold(planReview.score), 'Plan Critic passes for Build Intel snapshot baseline card', buildPlanCriticResultSummary(planReview))
  addCheck(checks, sourceProof.ok, 'load-bearing Build Intel callers use snapshot/freshness semantics', JSON.stringify(sourceProof.failed || []))
  addCheck(checks, dogfood.ok, 'dogfood rejects stale fixed-commit latest-truth proof', dogfood.ok ? 'pass' : JSON.stringify(dogfood))
  addCheck(checks, snapshot.snapshotBaseline?.expectedSnapshotCommit === GSTACK_BUILD_INTEL_EXPECTED_COMMIT && isBuildIntelSnapshotBaselineEvidence(snapshot.snapshotBaseline), 'GStack snapshot exposes inspected snapshot baseline', `${snapshot.snapshotBaseline?.inspectedCommit || 'missing'} posture=${snapshot.snapshotBaseline?.posture || 'missing'}`)
  addCheck(checks, buildIntelAuditFindings.length === 0, 'code-quality audit no longer proposes Build Intel snapshot baseline card', buildIntelAuditFindings.map(finding => `${finding.id}:${finding.refs?.[0]?.path || ''}`).join(', ') || 'clean')
  addCheck(checks, packageJson.scripts?.['process:build-intel-snapshot-baseline-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:build-intel-snapshot-baseline-check'] || 'missing')
  addCheck(checks, deepAuditClosureSource.includes(CARD_ID) && deepAuditClosureSource.includes(CLOSEOUT_KEY) && deepAuditClosureSource.includes("routeStatus: 'done'"), 'deep-audit route now names Build Intel snapshot closeout proof', 'lib/deep-audit-findings-closure-gate.js')
  addCheck(checks, scriptSource.includes('assertProcessCheckWriteAllowed') && scriptSource.includes('upsertFoundationCurrentSprintOverlay') && scriptSource.includes('updateBacklogItem'), 'focused script uses guarded backlog and sprint mutations', SCRIPT_PATH)
  addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeout?.backlogIds?.includes(CARD_ID), 'closeout registry resolves Build Intel snapshot closeout', closeout?.key || 'missing')
  addCheck(checks, !args.closeCard || afterCard?.lane === 'done', 'Build Intel snapshot baseline card closes when requested', afterCard ? `${afterCard.lane}/${afterCard.priority}` : 'missing')
  addCheck(checks, !args.closeCard || afterSprint.sprint?.activeBlockerCardId === NEXT_CARD_ID, 'Current Sprint advances to build closeout data-source card', afterSprint.sprint?.activeBlockerCardId || 'missing')
  addCheck(checks, !args.closeCard || sprintItem?.stage === 'done_this_sprint', 'Current Sprint marks Build Intel snapshot baseline done', sprintItem?.stage || 'missing')
  addCheck(checks, nextCard && ['scoped', 'building_now', 'done'].includes(nextCard.lane), 'next build closeout data-source card is live', nextCard ? `${nextCard.id}:${nextCard.lane}` : 'missing')
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
    activeBlocker: afterSprint.sprint?.activeBlockerCardId || null,
    sourceProof,
    dogfood,
    snapshotBaseline: snapshot.snapshotBaseline || null,
    codeQualityAudit: {
      findingCount: audit.findings?.length || 0,
      proposedCards: audit.proposedCards || [],
      buildIntelAuditFindingCount: buildIntelAuditFindings.length,
    },
    checkCount: checks.length,
    failedCount: failed.length,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Build Intel snapshot baseline check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Build Intel snapshot baseline check failed.')
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
