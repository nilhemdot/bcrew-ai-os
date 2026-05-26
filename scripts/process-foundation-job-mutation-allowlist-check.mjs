#!/usr/bin/env node

import fs from 'node:fs/promises'
import process from 'node:process'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  FOUNDATION_JOB_MUTATION_ALLOWLIST_APPROVAL_PATH,
  FOUNDATION_JOB_MUTATION_ALLOWLIST_CARD_ID,
  FOUNDATION_JOB_MUTATION_ALLOWLIST_CLOSEOUT_KEY,
  FOUNDATION_JOB_MUTATION_ALLOWLIST_PLAN_PATH,
  FOUNDATION_JOB_MUTATION_ALLOWLIST_SCRIPT_PATH,
  FOUNDATION_JOB_MUTATION_ALLOWLIST_SPRINT_ID,
  buildFoundationJobMutationAllowlistDogfoodProof,
  buildFoundationJobMutationAllowlistReport,
} from '../lib/foundation-job-mutation-allowlist.js'
import {
  buildScheduledMutationGuardDogfoodProof,
  getFoundationJobDefinitions,
  getFoundationJobRuntime,
} from '../lib/foundation-jobs.js'
import {
  assertFoundationDbReadyForReadOnlyGate,
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, ...rawValue] = arg.slice(2).split('=')
    args[key] = rawValue.length ? rawValue.join('=') : 'true'
  }
  return args
}

function boolArg(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function hasForbiddenMutationCall(source) {
  const forbiddenTokens = [
    ['update', 'BacklogItem'].join(''),
    ['create', 'BacklogItem'].join(''),
    ['upsert', 'FoundationCurrentSprintOverlay'].join(''),
    ['fs.', 'write', 'File'].join(''),
    ['write', 'File'].join(''),
  ]
  const forbiddenPatterns = [
    ['INSERT', '\\s+', 'INTO'].join(''),
    ['UPDATE', '\\s+', 'foundation_'].join(''),
    ['DELETE', '\\s+', 'FROM'].join(''),
  ]
  return forbiddenTokens.some(token => new RegExp(`\\b${token}\\b`, 'i').test(source)) ||
    forbiddenPatterns.some(pattern => new RegExp(pattern, 'i').test(source))
}

async function main() {
  const args = parseArgs()
  const jsonMode = boolArg(args.json)
  const checks = []

  await assertFoundationDbReadyForReadOnlyGate('process:foundation-job-mutation-allowlist-check')
  const [
    approvalValidation,
    activeSprint,
    cards,
    planCriticRuns,
    scriptSource,
    packageJson,
    foundationJobsSource,
    summaryPayloadSource,
    runtimeActivationSource,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot: process.cwd(),
      approvalRef: FOUNDATION_JOB_MUTATION_ALLOWLIST_APPROVAL_PATH,
      cardId: FOUNDATION_JOB_MUTATION_ALLOWLIST_CARD_ID,
    }),
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds([FOUNDATION_JOB_MUTATION_ALLOWLIST_CARD_ID]),
    getPlanCriticRunsByCardIds([FOUNDATION_JOB_MUTATION_ALLOWLIST_CARD_ID]),
    fs.readFile(new URL(import.meta.url), 'utf8'),
    fs.readFile('package.json', 'utf8').then(JSON.parse),
    fs.readFile('lib/foundation-jobs.js', 'utf8'),
    fs.readFile('lib/foundation-hub-summary-payload.js', 'utf8'),
    fs.readFile('lib/connector-uptime-monitor.js', 'utf8'),
  ])
  const card = cards.find(item => item.id === FOUNDATION_JOB_MUTATION_ALLOWLIST_CARD_ID) || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === FOUNDATION_JOB_MUTATION_ALLOWLIST_CARD_ID) || null
  const planCriticPass = (planCriticRuns || []).some(run =>
    run.cardId === FOUNDATION_JOB_MUTATION_ALLOWLIST_CARD_ID &&
    run.status === 'pass' &&
    Number(run.score) >= 9.8 &&
    run.planRef === FOUNDATION_JOB_MUTATION_ALLOWLIST_PLAN_PATH
  )
  const jobs = getFoundationJobDefinitions()
  const report = buildFoundationJobMutationAllowlistReport({ jobs })
  const dogfood = buildFoundationJobMutationAllowlistDogfoodProof()
  const scheduledMutationGuardDogfood = buildScheduledMutationGuardDogfoodProof()
  const runtimeRows = jobs
    .filter(job => job.runtimeMode === 'scheduled')
    .map(job => ({ job, runtime: getFoundationJobRuntime(job, null, new Date('2026-05-15T16:00:00.000Z')) }))
  const verificationRunsRuntime = runtimeRows.find(row => row.job.key === 'verification-runs')?.runtime || null

  addCheck(checks, approvalValidation.ok && Number(approvalValidation.approval?.score) >= 9.8, 'approval integrity passes at 9.8+', approvalValidation.failures?.map(item => item.detail || item.check).join(' | ') || 'ok')
  addCheck(checks, planCriticPass, 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.cardId}:${run.status}:${run.score}`).join(', ') || 'missing')
  addCheck(checks, card?.lane === 'executing' || card?.lane === 'done', 'live backlog card is executing or done', card ? card.lane : 'missing')
  addCheck(
    checks,
    (
      activeSprint.sprint?.sprintId === FOUNDATION_JOB_MUTATION_ALLOWLIST_SPRINT_ID &&
      ['building_now', 'done_this_sprint'].includes(sprintItem?.stage)
    ) || card?.lane === 'done',
    'Current Sprint shows this card active/done or live backlog keeps historical done proof',
    card?.lane === 'done'
      ? `historical done card / ${FOUNDATION_JOB_MUTATION_ALLOWLIST_CLOSEOUT_KEY}`
      : `${activeSprint.sprint?.sprintId || 'missing'} / ${sprintItem?.stage || 'missing'}`,
  )
  addCheck(checks, report.ok, 'real scheduled jobs have explicit allowlist posture', `scheduled=${report.scheduledCount} allowed=${report.allowedCount} blocked=${report.blockedCount} missing=${report.missingCount} mismatch=${report.mismatchCount}`)
  addCheck(
    checks,
    report.rows.some(row => row.key === 'verification-runs' && row.allowlistStatus === 'allowed_scheduled_read_only') &&
      verificationRunsRuntime?.scheduleStatus !== 'blocked',
    'verification-runs is allowlisted only after becoming scheduled read-only',
    verificationRunsRuntime?.scheduleStatus || 'missing runtime',
  )
  addCheck(checks, runtimeRows.every(({ job, runtime }) => job.mutationAllowlist && runtime.scheduleMutationGuard?.mutationAllowlist), 'runtime rows carry mutation allowlist status', `${runtimeRows.filter(({ job }) => job.mutationAllowlist).length}/${runtimeRows.length}`)
  addCheck(checks, dogfood.ok, 'dogfood blocks missing and mismatched scheduled jobs', `missing=${dogfood.scheduledMissing.status} mismatch=${dogfood.scheduledMismatch.status}`)
  addCheck(checks, scheduledMutationGuardDogfood.ok, 'existing process-check scheduled mutation guard still passes', scheduledMutationGuardDogfood.realVerificationRuns?.scheduleStatus || 'missing')
  addCheck(
    checks,
    packageJson.scripts?.['process:foundation-job-mutation-allowlist-check'] === `node --env-file-if-exists=.env ${FOUNDATION_JOB_MUTATION_ALLOWLIST_SCRIPT_PATH}`,
    'package script is registered',
    packageJson.scripts?.['process:foundation-job-mutation-allowlist-check'] || 'missing',
  )
  addCheck(
    checks,
    foundationJobsSource.includes('evaluateFoundationJobMutationAllowlist') &&
      foundationJobsSource.includes('FOUNDATION_JOB_MUTATION_ALLOWLIST_CARD_ID'),
    'foundation job guard uses mutation allowlist',
    'lib/foundation-jobs.js',
  )
  addCheck(
    checks,
    summaryPayloadSource.includes('mutationAllowlist') && runtimeActivationSource.includes('mutationAllowlist'),
    'runtime and compact hub job rows expose mutation allowlist',
    'connector uptime + summary payload',
  )
  addCheck(checks, !hasForbiddenMutationCall(scriptSource), 'focused proof script is read-only', 'no live mutation calls found')

  const summary = {
    ok: checks.every(check => check.ok),
    status: checks.every(check => check.ok) ? 'healthy' : 'blocked',
    cardId: FOUNDATION_JOB_MUTATION_ALLOWLIST_CARD_ID,
    closeoutKey: FOUNDATION_JOB_MUTATION_ALLOWLIST_CLOSEOUT_KEY,
    report: {
      status: report.status,
      scheduledCount: report.scheduledCount,
      allowedCount: report.allowedCount,
      blockedCount: report.blockedCount,
      missingCount: report.missingCount,
      mismatchCount: report.mismatchCount,
      failingRows: report.failingRows,
      blockedRows: report.blockedRows.map(row => ({ key: row.key, posture: row.mutationPosture, status: row.allowlistStatus, reason: row.plainEnglish })),
    },
    dogfood,
    checks,
  }

  if (jsonMode) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(`Foundation job mutation allowlist check: ${summary.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
  if (!summary.ok) process.exitCode = 1
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
