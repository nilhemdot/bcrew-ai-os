#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getBacklogItemsByIds,
} from '../lib/foundation-backlog-sprint-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { getFoundationJobDefinitions } from '../lib/foundation-jobs.js'
import {
  FOUNDATION_DEEP_AUDITOR_REAL_LOOP_APPROVAL_PATH,
  FOUNDATION_DEEP_AUDITOR_REAL_LOOP_CARD_ID as CARD_ID,
  FOUNDATION_DEEP_AUDITOR_REAL_LOOP_CLOSEOUT_KEY as CLOSEOUT_KEY,
  FOUNDATION_DEEP_AUDITOR_REAL_LOOP_PLAN_PATH,
  FOUNDATION_DEEP_AUDITOR_REAL_LOOP_SCRIPT_PATH,
  NIGHTLY_DEEP_AUDIT_JOB_KEY,
  buildDeepAuditorRealLoopDogfoodProof,
  buildNightlyDeepAuditSeniorReview,
  buildNightlyDeepAuditUpgrade,
  classifyDeepSeniorReviewRollup,
  renderNightlyDeepAuditUpgradeReport,
  serializeNightlyDeepAuditUpgradeJson,
} from '../lib/nightly-deep-audit-upgrade.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    runLlmReview: argv.includes('--runLlmReview') || argv.includes('--run-llm-review'),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [approval, cards] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: FOUNDATION_DEEP_AUDITOR_REAL_LOOP_APPROVAL_PATH,
      cardId: CARD_ID,
    }),
    getBacklogItemsByIds([CARD_ID]),
  ])
  const [packageJsonSource, nightlyAuditSource, processScriptSource, jobsSource] = await Promise.all([
    readRepoFile('package.json'),
    readRepoFile('lib/nightly-deep-audit-upgrade.js'),
    readRepoFile(FOUNDATION_DEEP_AUDITOR_REAL_LOOP_SCRIPT_PATH),
    readRepoFile('lib/foundation-jobs.js'),
  ])
  const packageJson = JSON.parse(packageJsonSource)
  const job = getFoundationJobDefinitions().find(item => item.key === NIGHTLY_DEEP_AUDIT_JOB_KEY) || null
  const card = cards.find(item => item.id === CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  const dogfood = buildDeepAuditorRealLoopDogfoodProof()
  const packetOnlyAudit = await buildNightlyDeepAuditUpgrade({
    repoRoot,
    skipEndpointFetch: true,
    runLlmReview: false,
  })
  const packetOnlyReport = renderNightlyDeepAuditUpgradeReport(packetOnlyAudit)
  const packetOnlyJson = serializeNightlyDeepAuditUpgradeJson(packetOnlyAudit)
  const syntheticBlockedReview = await buildNightlyDeepAuditSeniorReview({
    deterministicAudit: { summary: { findingCount: 0 }, findings: [] },
    reviewTargets: [{
      file: 'server.js',
      severity: 'P1',
      reasons: ['hot_route_surface'],
      lines: 2000,
      bytes: 100000,
      excerpt: 'app.get("/api/example", handler)',
    }],
    diff: { newFindingIds: [], resolvedFindingIds: [], stillOpenFindingIds: [] },
    runLlmReview: false,
  })
  const packetOnlyRollup = classifyDeepSeniorReviewRollup(syntheticBlockedReview)

  addCheck(checks, approval.ok && Number(approval.approval?.score || 0) >= 9.8, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || FOUNDATION_DEEP_AUDITOR_REAL_LOOP_APPROVAL_PATH)
  addCheck(checks, card && ['scoped', 'executing', 'done'].includes(card.lane), 'live backlog card exists in active/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, packageJson.scripts?.['process:foundation-deep-auditor-real-loop-check'] === `node --env-file-if-exists=.env ${FOUNDATION_DEEP_AUDITOR_REAL_LOOP_SCRIPT_PATH}`, 'package script exposes focused proof', packageJson.scripts?.['process:foundation-deep-auditor-real-loop-check'] || 'missing')
  addCheck(checks, Boolean(closeout), 'closeout record exists', CLOSEOUT_KEY)
  addCheck(checks, closeout?.backlogIds?.includes(CARD_ID), 'closeout owns the deep auditor real-loop card', closeout?.backlogIds?.join(', ') || 'missing')
  addCheck(checks, dogfood.ok === true, 'dogfood prevents packet-only false deep-review and unrouted P0/P1 findings', dogfood.checks.filter(check => !check.ok).map(check => check.check).join(', ') || 'all dogfood checks passed')
  addCheck(checks, packetOnlyAudit.llmReview?.status === 'degraded_packet_only' && packetOnlyAudit.llmReview?.executedThisRun === false, 'packet-only audit status is explicit degraded', JSON.stringify(packetOnlyAudit.llmReview))
  addCheck(checks, packetOnlyAudit.status === 'deep_review_degraded' && packetOnlyAudit.deepSeniorReviewRollup?.status === 'degraded', 'top-level audit status cannot pretend packet-only is green', JSON.stringify({ status: packetOnlyAudit.status, rollup: packetOnlyAudit.deepSeniorReviewRollup }))
  addCheck(checks, packetOnlyReport.includes('Deep senior review did not execute') && packetOnlyReport.includes('must not be called a completed deep code review'), 'morning report says when deep review did not run', 'packet-only report truth present')
  addCheck(checks, packetOnlyJson.deepSeniorReviewRollup?.status === 'degraded' && packetOnlyJson.llmReview?.status === 'degraded_packet_only', 'JSON artifact exposes deep-review degraded state', JSON.stringify(packetOnlyJson.deepSeniorReviewRollup))
  addCheck(checks, packetOnlyRollup.status === 'degraded' && packetOnlyRollup.executed === false, 'rollup helper treats unexecuted review as degraded', JSON.stringify(packetOnlyRollup))
  addCheck(checks, nightlyAuditSource.includes('callLlm({') && nightlyAuditSource.includes('dryRun: false') && nightlyAuditSource.includes('buildNightlyDeepAuditSeniorReview'), 'nightly audit has real approved-route execution path', 'callLlm dryRun:false senior review path present')
  addCheck(checks, processScriptSource.includes('buildDeepAuditorRealLoopDogfoodProof') && processScriptSource.includes('degraded_packet_only'), 'focused proof guards the real-loop semantics', FOUNDATION_DEEP_AUDITOR_REAL_LOOP_SCRIPT_PATH)
  addCheck(
    checks,
    job?.runtimeMode === 'scheduled' &&
      job?.mutationPosture === 'report_only' &&
      (job.args || []).includes('--runLlmReview'),
    'scheduled nightly job requests bounded deep review while staying report-only',
    job ? `${job.runtimeMode}/${job.mutationPosture}/${(job.args || []).join(' ')}` : 'missing job',
  )
  addCheck(checks, jobsSource.includes('reports degraded packet-only mode explicitly') && jobsSource.includes('--runLlmReview'), 'job operator copy names degraded packet-only mode and bounded review', 'foundation-jobs copy updated')
  addCheck(checks, packetOnlyAudit.reportOnly === true && packetOnlyAudit.autoFixes === false && packetOnlyAudit.writesBacklog === false && packetOnlyAudit.autoCreatesBacklog === false, 'deep auditor remains report-only/no-autofix/no-autobacklog', JSON.stringify({ reportOnly: packetOnlyAudit.reportOnly, autoFixes: packetOnlyAudit.autoFixes, writesBacklog: packetOnlyAudit.writesBacklog, autoCreatesBacklog: packetOnlyAudit.autoCreatesBacklog }))

  if (args.runLlmReview) {
    const liveReviewAudit = await buildNightlyDeepAuditUpgrade({
      repoRoot,
      skipEndpointFetch: true,
      runLlmReview: true,
    })
    addCheck(
      checks,
      liveReviewAudit.llmReview?.providerReviewRequested === true,
      'optional live proof requested approved-router review',
      JSON.stringify({
        status: liveReviewAudit.llmReview?.status,
        executedThisRun: liveReviewAudit.llmReview?.executedThisRun,
        route: liveReviewAudit.llmReview?.route?.selectedRoute,
        errorMessage: liveReviewAudit.llmReview?.errorMessage || null,
      }),
    )
  }

  await closeFoundationDb()
  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    planPath: FOUNDATION_DEEP_AUDITOR_REAL_LOOP_PLAN_PATH,
    scriptPath: FOUNDATION_DEEP_AUDITOR_REAL_LOOP_SCRIPT_PATH,
    llmReview: packetOnlyAudit.llmReview,
    deepSeniorReviewRollup: packetOnlyAudit.deepSeniorReviewRollup,
    checks,
    findings: failures,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Foundation Deep Auditor Real Loop check: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }

  if (failures.length) process.exitCode = 1
}

main().catch(async error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  await closeFoundationDb().catch(() => {})
  process.exitCode = 1
})
