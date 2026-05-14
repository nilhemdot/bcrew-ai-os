#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  ARCHITECTURAL_RULE_FINDING_KEYS,
  PLAN_CRITIC_MIN_PASS_SCORE,
  buildSyntheticPlanCriticArchitecturalRulesProof,
} from '../lib/process-plan-critic.js'
import { getFoundationJobDefinitions } from '../lib/foundation-jobs.js'
import { getFoundationBuildCloseoutValidation, getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  FOUNDATION_HUB_COMMITTED_BASELINE,
  HUB_PERF_VERIFICATION_REPORT_PATH,
  buildSyntheticFoundationHubPerformanceDogfoodProof,
  evaluateFoundationHubPerformanceMeasurement,
  measureFoundationHubPerformance,
} from '../lib/foundation-hub-performance-verification.js'
import {
  RECURRING_DEEP_AUDIT_JOB_KEY,
  buildRecurringDeepAuditContract,
  buildRecurringDeepAuditDogfoodProof,
  evaluateRecurringDeepAuditJob,
} from '../lib/recurring-deep-audit.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const SPRINT_ID = 'foundation-verification-cleanup-2026-05-14'
const CLOSEOUT_KEY = 'foundation-verification-cleanup-v1'
const PRE_SPLIT_CLOSEOUT_RECORDS_LINE_COUNT = 5862

const CARDS = [
  {
    cardId: 'PLAN-CRITIC-ARCH-RULES-DOGFOOD-001',
    approvalRef: 'docs/process/approvals/PLAN-CRITIC-ARCH-RULES-DOGFOOD-001.json',
    planRef: 'docs/process/plan-critic-arch-rules-dogfood-001-plan.md',
  },
  {
    cardId: 'HUB-PERF-VERIFICATION-001',
    approvalRef: 'docs/process/approvals/HUB-PERF-VERIFICATION-001.json',
    planRef: 'docs/process/hub-perf-verification-001-plan.md',
  },
  {
    cardId: 'MONOLITH-SPLIT-CONTINUE-001',
    approvalRef: 'docs/process/approvals/MONOLITH-SPLIT-CONTINUE-001.json',
    planRef: 'docs/process/monolith-split-continue-001-plan.md',
  },
  {
    cardId: 'RECURRING-DEEP-AUDIT-001',
    approvalRef: 'docs/process/approvals/RECURRING-DEEP-AUDIT-001.json',
    planRef: 'docs/process/recurring-deep-audit-001-plan.md',
  },
]

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false, noApi: false, baseUrl: 'http://localhost:3000' }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg === '--no-api' || arg === '--no-api=true') args.noApi = true
    else if (arg.startsWith('--baseUrl=')) args.baseUrl = arg.slice('--baseUrl='.length)
  }
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

function countLines(source = '') {
  const text = String(source || '')
  if (!text) return 0
  const newlineCount = (text.match(/\n/g) || []).length
  return newlineCount + (text.endsWith('\n') ? 0 : 1)
}

async function main() {
  const args = parseArgs()
  const checks = []
  const approvalResults = await Promise.all(CARDS.map(card => validatePlanApprovalFile({
    repoRoot,
    approvalRef: card.approvalRef,
    cardId: card.cardId,
  })))
  const [
    sprint,
    planCriticRuns,
    backlogCards,
    packageSource,
    closeoutRecordsSource,
    cleanupRecordsSource,
    reportSource,
  ] = await Promise.all([
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds(CARDS.map(card => card.cardId)),
    getBacklogItemsByIds(CARDS.map(card => card.cardId)),
    readRepoFile('package.json'),
    readRepoFile('lib/foundation-build-closeout-records.js'),
    readRepoFile('lib/foundation-build-closeout-cleanup-records.js'),
    readRepoFile(HUB_PERF_VERIFICATION_REPORT_PATH),
  ])
  await closeFoundationDb()

  const packageJson = JSON.parse(packageSource)
  const planCriticDogfood = buildSyntheticPlanCriticArchitecturalRulesProof()
  const hubPerfDogfood = buildSyntheticFoundationHubPerformanceDogfoodProof()
  const committedPerformance = evaluateFoundationHubPerformanceMeasurement(FOUNDATION_HUB_COMMITTED_BASELINE)
  const jobs = getFoundationJobDefinitions()
  const recurringDeepAuditJob = jobs.find(job => job.key === RECURRING_DEEP_AUDIT_JOB_KEY)
  const recurringContract = buildRecurringDeepAuditContract()
  const recurringEvaluation = evaluateRecurringDeepAuditJob(recurringDeepAuditJob || {}, recurringContract)
  const recurringDogfood = buildRecurringDeepAuditDogfoodProof(recurringDeepAuditJob || {})
  const closeouts = getFoundationBuildCloseouts()
  const closeoutValidation = getFoundationBuildCloseoutValidation()

  addCheck(
    checks,
    approvalResults.every(result => result.ok && Number(result.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE),
    'all four approval files validate at 9.8+',
    approvalResults.filter(result => !result.ok).map(result => result.approvalRef).join(', ') || 'all valid',
  )
  addCheck(
    checks,
    CARDS.every(card => planCriticRuns.some(run => run.cardId === card.cardId && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE)),
    'all four durable Plan Critic rows pass',
    planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', '),
  )
  addCheck(
    checks,
    backlogCards.length === CARDS.length && backlogCards.every(card => ['scoped', 'done'].includes(card.lane)),
    'all four backlog cards exist in scoped/done lanes',
    backlogCards.map(card => `${card.id}:${card.lane}`).join(', '),
  )
  addCheck(
    checks,
    sprint.sprint?.sprintId === SPRINT_ID &&
      CARDS.every(card => sprint.items.some(item => item.cardId === card.cardId && ['sprint_ready', 'building_now', 'done_this_sprint'].includes(item.stage))),
    'Current Sprint contains all four cards with doctrine and active stages',
    sprint.sprint ? `${sprint.sprint.sprintId} ${sprint.items.map(item => `${item.cardId}:${item.stage}`).join(', ')}` : 'missing sprint',
  )

  addCheck(
    checks,
    planCriticDogfood.ok &&
      planCriticDogfood.hotRouteNoBudget?.findings?.some(finding => finding.key === ARCHITECTURAL_RULE_FINDING_KEYS.performanceBudget),
    'Plan Critic dogfood rejects architecture-risk and hot-route/no-budget plans',
    JSON.stringify({
      large: planCriticDogfood.largeFileNoSplit?.status,
      check: planCriticDogfood.checkWriteNoApply?.status,
      verifier: planCriticDogfood.verifierLiveState?.status,
      audit: planCriticDogfood.auditFixNoDogfood?.status,
      focused: planCriticDogfood.noFocusedProof?.status,
      hotRoute: planCriticDogfood.hotRouteNoBudget?.status,
      compliant: planCriticDogfood.compliant?.status,
    }),
  )

  addCheck(
    checks,
    hubPerfDogfood.ok && committedPerformance.ok,
    'Foundation Hub performance dogfood and committed baseline pass',
    hubPerfDogfood.invariant,
  )
  addCheck(
    checks,
    reportSource.includes('0.073341s') &&
      reportSource.includes('891,236') &&
      reportSource.includes('62.386321s') &&
      reportSource.includes('4,799,862'),
    'Foundation Hub performance report records measured baseline',
    HUB_PERF_VERIFICATION_REPORT_PATH,
  )

  let livePerformance = null
  if (!args.noApi) {
    livePerformance = await measureFoundationHubPerformance({ baseUrl: args.baseUrl })
    const liveEvaluation = evaluateFoundationHubPerformanceMeasurement(livePerformance)
    addCheck(
      checks,
      liveEvaluation.ok,
      'live Foundation Hub measurement is inside budgets',
      liveEvaluation.findings.map(finding => finding.check).join(', ') || JSON.stringify(livePerformance),
    )
  }

  const closeoutRecordLineCount = countLines(closeoutRecordsSource)
  const closeoutRecord = closeouts.find(record => record.key === CLOSEOUT_KEY)
  addCheck(
    checks,
    closeoutRecordsSource.includes("import { cleanupCloseoutRecords }") &&
      closeoutRecordsSource.includes('...cleanupCloseoutRecords') &&
      cleanupRecordsSource.includes(CLOSEOUT_KEY) &&
      cleanupRecordsSource.includes('foundation-operating-reliability-v1'),
    'cleanup closeout records are split into a dedicated module',
    'lib/foundation-build-closeout-cleanup-records.js',
  )
  addCheck(
    checks,
    closeoutRecordLineCount < PRE_SPLIT_CLOSEOUT_RECORDS_LINE_COUNT,
    'root closeout records file line count decreased',
    `${closeoutRecordLineCount} < ${PRE_SPLIT_CLOSEOUT_RECORDS_LINE_COUNT}`,
  )
  addCheck(
    checks,
    Boolean(closeoutRecord) && closeoutRecord.backlogIds.length === CARDS.length,
    'new sprint closeout is visible through build-log API',
    closeoutRecord ? closeoutRecord.backlogIds.join(', ') : 'missing',
  )
  addCheck(
    checks,
    closeoutValidation.invalidCloseoutKeys.length === 0 && closeoutValidation.backlogIds.includes('RECURRING-DEEP-AUDIT-001'),
    'closeout validation remains healthy',
    JSON.stringify(closeoutValidation),
  )

  addCheck(
    checks,
    recurringEvaluation.ok && recurringDogfood.ok,
    'recurring deep audit contract is manual/report-only and dogfooded',
    recurringDogfood.invariant,
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:recurring-deep-audit-check'] &&
      packageJson.scripts?.['process:foundation-verification-cleanup-check'],
    'package exposes focused proof scripts',
    JSON.stringify({
      recurring: packageJson.scripts?.['process:recurring-deep-audit-check'],
      sprint: packageJson.scripts?.['process:foundation-verification-cleanup-check'],
    }),
  )

  const findings = checks.filter(check => !check.ok)
  const summary = {
    ok: findings.length === 0,
    status: findings.length ? 'blocked' : 'healthy',
    sprintId: SPRINT_ID,
    closeoutKey: CLOSEOUT_KEY,
    planCriticDogfood: {
      ok: planCriticDogfood.ok,
      hotRouteNoBudget: planCriticDogfood.hotRouteNoBudget?.status,
      compliant: planCriticDogfood.compliant?.status,
    },
    performance: {
      committed: committedPerformance.measurement,
      live: livePerformance,
    },
    monolithSplit: {
      rootCloseoutRecordLineCount: closeoutRecordLineCount,
      preSplitCloseoutRecordLineCount: PRE_SPLIT_CLOSEOUT_RECORDS_LINE_COUNT,
    },
    recurringDeepAudit: {
      jobKey: RECURRING_DEEP_AUDIT_JOB_KEY,
      contract: recurringContract,
      jobStatus: recurringEvaluation.status,
    },
    checks,
    findings,
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Foundation Verification + Continued Cleanup proof')
    console.log(`  Status: ${summary.status}`)
    for (const finding of findings) console.log(`  BLOCKED ${finding.check}: ${finding.detail}`)
  }
  if (findings.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
