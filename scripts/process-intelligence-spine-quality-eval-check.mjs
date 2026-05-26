#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getIntelligenceReportBundle,
  initFoundationDb,
  updateBacklogItem,
} from '../lib/foundation-db.js'
import {
  INTELLIGENCE_SPINE_QUALITY_EVAL_APPROVAL_PATH,
  INTELLIGENCE_SPINE_QUALITY_EVAL_CARD_ID,
  INTELLIGENCE_SPINE_QUALITY_EVAL_CHANGED_FILES,
  INTELLIGENCE_SPINE_QUALITY_EVAL_MARK_REPORT_IDS,
  INTELLIGENCE_SPINE_QUALITY_EVAL_PLAN_PATH,
  INTELLIGENCE_SPINE_QUALITY_EVAL_REPORT_PATH,
  INTELLIGENCE_SPINE_QUALITY_EVAL_SCRIPT_PATH,
  buildIntelligenceSpineQualityEvalDogfoodProof,
  buildIntelligenceSpineQualityEvalSnapshot,
  renderIntelligenceSpineQualityEvalReport,
} from '../lib/intelligence-spine-quality-eval.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
  buildPlanCriticResultSummary,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
  isProcessReportWriteRequested,
} from '../lib/process-write-guard.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'intelligence-spine-quality-eval-v1'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    writeReport: isProcessReportWriteRequested(argv),
    closeCard: isProcessCheckWriteRequested({ argv, allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard] }),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
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

async function listExistingReportIds(ids = []) {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT report_artifact_id
        FROM intelligence_report_artifacts
        WHERE report_artifact_id = ANY($1::text[])
        ORDER BY array_position($1::text[], report_artifact_id)
      `,
      [ids],
    )
    return result.rows.map(row => row.report_artifact_id)
  } finally {
    await pool.end().catch(() => {})
  }
}

async function listLatestSharedSourceReportIds({ limit = 4 } = {}) {
  const pool = createPool()
  try {
    const result = await pool.query(
      `
        SELECT report_artifact_id
        FROM intelligence_report_artifacts
        WHERE source_ids && $1::text[]
          AND report_artifact_id LIKE 'report-artifact:synthesis-engine-fresh-candidate-promotion-%'
        ORDER BY created_at DESC
        LIMIT $2
      `,
      [[
        'SRC-MEETINGS-001',
        'SRC-GMAIL-001',
        'SRC-MISSIVE-001',
        'SRC-SLACK-001',
      ], Math.min(8, Math.max(1, Number(limit) || 4))],
    )
    return result.rows.map(row => row.report_artifact_id).filter(Boolean)
  } finally {
    await pool.end().catch(() => {})
  }
}

async function loadReportBundles(ids = [], options = {}) {
  const bundles = []
  for (const reportArtifactId of ids) {
    bundles.push(await getIntelligenceReportBundle(reportArtifactId, {
      atomLimit: options.atomLimit || 220,
      hitLimit: options.hitLimit || 260,
    }))
  }
  return bundles
}

async function writeQualityReport(snapshot = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: INTELLIGENCE_SPINE_QUALITY_EVAL_SCRIPT_PATH,
    operation: 'write Intelligence Spine quality eval report',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.writeReport, PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
  await fs.writeFile(
    path.join(repoRoot, INTELLIGENCE_SPINE_QUALITY_EVAL_REPORT_PATH),
    renderIntelligenceSpineQualityEvalReport(snapshot),
    'utf8',
  )
  return INTELLIGENCE_SPINE_QUALITY_EVAL_REPORT_PATH
}

function buildClosedBacklogUpdate(snapshot = {}) {
  return {
    lane: 'done',
    nextAction: 'Done under `intelligence-spine-quality-eval-v1`. Keep this quality eval in the proof stack before broad extraction scale-up; next safe work is source/run quality hardening or Steve-approved live source runs tomorrow.',
    statusNote: `Closed 2026-05-26 under \`intelligence-spine-quality-eval-v1\`; added same-input quality eval over Mark full-watch reports plus meeting/comms synthesis reports, wrote ${INTELLIGENCE_SPINE_QUALITY_EVAL_REPORT_PATH}, proved current spine score ${snapshot.current?.score ?? 'unknown'} vs baseline ${snapshot.baseline?.score ?? 'unknown'} (+${snapshot.current?.improvementOverBaseline ?? 'unknown'}), and verified Director, source-slice router, Scoper, Portfolio, and Promotion gate boundaries. No provider calls, live extraction, browser navigation, auth/private source access, external writes, sprint mutation, or automatic backlog creation.`,
  }
}

async function closeQualityEvalCard(snapshot = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: INTELLIGENCE_SPINE_QUALITY_EVAL_SCRIPT_PATH,
    operation: 'close Intelligence Spine Quality Eval backlog card',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })
  return updateBacklogItem(INTELLIGENCE_SPINE_QUALITY_EVAL_CARD_ID, buildClosedBacklogUpdate(snapshot), ACTOR)
}

function blockedRuntimeHits(source = '') {
  const patterns = [
    /\bfrom\s+['"].*foundation-db/i,
    /\bfrom\s+['"]pg['"]/i,
    /\bfetch\s*\(/i,
    /\bwriteFile\b/i,
    /\bappendFile\b/i,
    /\bspawn(?:Sync)?\b/i,
    /\bexec(?:File|Sync)?\b/i,
    /\bplaywright\b/i,
    /\bpuppeteer\b/i,
    /\bupdateBacklogItem\s*\(/i,
    /\bcreateBacklogItem\s*\(/i,
  ]
  return patterns.filter(pattern => pattern.test(source)).map(pattern => String(pattern))
}

async function main() {
  const args = parseArgs()
  const checks = []
  let reportPath = null
  let closedCard = null

  await initFoundationDb()
  try {
    const [
      packageJson,
      planText,
      approvalValidation,
      moduleSource,
      scriptSource,
      systemStrategyText,
      businessStrategyText,
      currentPlanText,
      currentSprint,
      existingMarkReportIds,
      sharedReportIds,
    ] = await Promise.all([
      readRepoJson('package.json'),
      readRepoFile(INTELLIGENCE_SPINE_QUALITY_EVAL_PLAN_PATH),
      validatePlanApprovalFile({
        repoRoot,
        approvalRef: INTELLIGENCE_SPINE_QUALITY_EVAL_APPROVAL_PATH,
        cardId: INTELLIGENCE_SPINE_QUALITY_EVAL_CARD_ID,
      }),
      readRepoFile('lib/intelligence-spine-quality-eval.js'),
      readRepoFile(INTELLIGENCE_SPINE_QUALITY_EVAL_SCRIPT_PATH),
      readRepoFile('docs/system-strategy.md'),
      readRepoFile('docs/business-strategy.md'),
      readRepoFile('docs/rebuild/current-plan.md'),
      getActiveFoundationCurrentSprint(),
      listExistingReportIds(INTELLIGENCE_SPINE_QUALITY_EVAL_MARK_REPORT_IDS),
      listLatestSharedSourceReportIds({ limit: 4 }),
    ])

    const planReview = evaluatePlanCriticPlan({
      planText,
      card: { id: INTELLIGENCE_SPINE_QUALITY_EVAL_CARD_ID, priority: 'P0' },
      changedFiles: INTELLIGENCE_SPINE_QUALITY_EVAL_CHANGED_FILES,
      declaredRisk: 'Focused read-only quality evaluation over existing report artifacts with optional report file write and explicit close-card path; no provider calls, browser/source runs, backlog creation, external writes, or sprint mutation.',
      repoRoot,
    })

    const [videoReportBundles, sharedReportBundles] = await Promise.all([
      loadReportBundles(existingMarkReportIds, { atomLimit: 240, hitLimit: 280 }),
      loadReportBundles(sharedReportIds, { atomLimit: 120, hitLimit: 160 }),
    ])

    const snapshot = buildIntelligenceSpineQualityEvalSnapshot({
      generatedAt: new Date().toISOString(),
      videoReportBundles,
      sharedReportBundles,
      currentSprint,
      systemStrategyText,
      businessStrategyText,
      currentPlanText,
    })
    const dogfood = buildIntelligenceSpineQualityEvalDogfoodProof()
    const moduleRuntimeHits = blockedRuntimeHits(moduleSource)

    if (args.writeReport || args.closeCard) {
      if (!snapshot.ok) {
        throw new Error(`Intelligence Spine quality eval blocked: ${snapshot.failures.map(failure => failure.check).join(', ')}`)
      }
    }
    if (args.writeReport) reportPath = await writeQualityReport(snapshot)
    if (args.closeCard) closedCard = await closeQualityEvalCard(snapshot)

    const [liveCard] = await getBacklogItemsByIds([INTELLIGENCE_SPINE_QUALITY_EVAL_CARD_ID])

    addCheck(
      checks,
      approvalValidation.ok && approvalValidation.mode === 'v2' && Number(approvalValidation.approval?.score) >= 9.8,
      'approval file validates for quality-eval scope',
      approvalValidation.failures?.map(item => item.check).join(', ') || INTELLIGENCE_SPINE_QUALITY_EVAL_APPROVAL_PATH
    )
    addCheck(
      checks,
      planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE,
      'Plan Critic passes quality-eval plan',
      buildPlanCriticResultSummary(planReview)
    )
    addCheck(
      checks,
      packageJson.scripts?.['process:intelligence-spine-quality-eval-check'] === `node --env-file-if-exists=.env ${INTELLIGENCE_SPINE_QUALITY_EVAL_SCRIPT_PATH}`,
      'package exposes focused Intelligence Spine quality eval proof',
      packageJson.scripts?.['process:intelligence-spine-quality-eval-check'] || 'missing'
    )
    addCheck(
      checks,
      planText.includes('same-input quality comparison') &&
        planText.includes('Mark full-watch') &&
        planText.includes('meeting/comms') &&
        planText.includes('No provider calls') &&
        planText.includes('no automatic backlog creation'),
      'plan locks same-input sample, no-provider, and no-backlog boundaries',
      INTELLIGENCE_SPINE_QUALITY_EVAL_PLAN_PATH
    )
    addCheck(
      checks,
      moduleRuntimeHits.length === 0,
      'quality eval module has no DB/browser/http/process/file-write side effects',
      moduleRuntimeHits.join(', ') || 'clean'
    )
    addCheck(
      checks,
      scriptSource.includes('isProcessReportWriteRequested') &&
        scriptSource.includes('PROCESS_CHECK_WRITE_FLAGS.writeReport') &&
        scriptSource.includes('PROCESS_CHECK_WRITE_FLAGS.closeCard') &&
        scriptSource.includes('updateBacklogItem'),
      'process script keeps report and live backlog writes behind explicit flags',
      'write-report and close-card guards present'
    )
    addCheck(
      checks,
      dogfood.ok === true,
      'dogfood recreates duplicate/raw-routing failure mode and proves current spine improves',
      dogfood.checks.filter(check => !check.ok).map(check => check.check).join(', ') || 'dogfood pass'
    )
    addCheck(
      checks,
      snapshot.ok === true,
      'live quality eval snapshot is healthy',
      snapshot.failures.map(failure => failure.check).join(', ') || snapshot.status
    )
    addCheck(
      checks,
      snapshot.selectedReports.markVideoReportIds.length >= 1 &&
        snapshot.selectedReports.sharedInternalReportIds.length >= 1,
      'live sample includes Mark reports and internal meeting/comms reports',
      `mark=${snapshot.selectedReports.markVideoReportIds.length}; shared=${snapshot.selectedReports.sharedInternalReportIds.length}`
    )
    addCheck(
      checks,
      snapshot.current.score >= snapshot.current.passThreshold &&
        snapshot.current.improvementOverBaseline >= snapshot.current.improvementThreshold,
      'live current spine score clears threshold and improves over baseline',
      `current=${snapshot.current.score}; baseline=${snapshot.baseline.score}; improvement=${snapshot.current.improvementOverBaseline}`
    )
    addCheck(
      checks,
      snapshot.current.portfolio.groupCount === snapshot.current.portfolio.returnToScoperCount,
      'raw Director recommendations return to Scoper before Portfolio/Promotion',
      `${snapshot.current.portfolio.returnToScoperCount}/${snapshot.current.portfolio.groupCount}`
    )
    addCheck(
      checks,
      snapshot.noProviderCalls === true &&
        snapshot.noLiveExtraction === true &&
        snapshot.externalWrites === false &&
        snapshot.writesBacklog === false,
      'eval snapshot is no-provider, no-extraction, no-external-write, no-backlog',
      'safe read path'
    )
    addCheck(
      checks,
      !args.writeReport || reportPath === INTELLIGENCE_SPINE_QUALITY_EVAL_REPORT_PATH,
      'write-report writes the Steve-readable quality report only when requested',
      reportPath || 'not requested'
    )
    addCheck(
      checks,
      !args.closeCard || closedCard?.lane === 'done',
      'close-card marks live quality-eval card done only when requested',
      closedCard?.lane || liveCard?.lane || 'missing'
    )

    const failures = checks.filter(check => !check.ok)
    const output = {
      ok: failures.length === 0,
      status: failures.length ? 'risk' : 'healthy',
      cardId: INTELLIGENCE_SPINE_QUALITY_EVAL_CARD_ID,
      reportPath: INTELLIGENCE_SPINE_QUALITY_EVAL_REPORT_PATH,
      snapshot: {
        status: snapshot.status,
        baselineScore: snapshot.baseline.score,
        currentScore: snapshot.current.score,
        improvementOverBaseline: snapshot.current.improvementOverBaseline,
        rawCandidates: snapshot.baseline.rawCandidateCount,
        duplicateClusters: snapshot.baseline.duplicateClusterCount,
        directorCandidates: snapshot.current.director.candidateCount,
        markReports: snapshot.selectedReports.markVideoReportIds,
        sharedReports: snapshot.selectedReports.sharedInternalReportIds,
        sourceSlice: snapshot.current.sourceSlice,
        portfolio: snapshot.current.portfolio,
        topCandidates: snapshot.current.director.topCandidates.slice(0, 5),
      },
      checks,
      failures,
      wroteReport: Boolean(reportPath),
      closedCard: closedCard ? { id: closedCard.id, lane: closedCard.lane } : null,
    }

    if (args.json) {
      console.log(JSON.stringify(output, null, 2))
    } else {
      console.log(`Intelligence Spine quality eval: ${output.status}`)
      for (const check of checks) {
        console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
      }
      console.log(`\nSummary: ${checks.length - failures.length}/${checks.length} checks passed`)
      console.log(`Score: current ${snapshot.current.score}, baseline ${snapshot.baseline.score}, improvement +${snapshot.current.improvementOverBaseline}`)
    }
    process.exitCode = failures.length ? 1 : 0
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error('Intelligence Spine quality eval failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
