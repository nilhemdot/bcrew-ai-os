#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  NIGHTLY_DEEP_AUDIT_JOB_KEY,
  NIGHTLY_DEEP_AUDIT_SCHEDULE_LOCAL_TIME,
  NIGHTLY_DEEP_AUDIT_SCHEDULE_TIMEZONE,
} from '../lib/nightly-deep-audit-constants.js'
import {
  buildFoundationJobRuntimeScheduleDogfoodProof,
  getFoundationJobDefinition,
  getFoundationJobRuntime,
} from '../lib/foundation-jobs.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const CARD_ID = 'NIGHTLY-AUDIT-SCHEDULER-DUE-FIX-001'
const SPRINT_ID = 'foundation-audit-reliability-2026-05-16'
const PLAN_REF = 'docs/process/nightly-audit-scheduler-due-fix-001-plan.md'
const APPROVAL_REF = 'docs/process/approvals/NIGHTLY-AUDIT-SCHEDULER-DUE-FIX-001.json'
const SCRIPT_PATH = 'scripts/process-nightly-audit-scheduler-due-fix-check.mjs'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readText(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [approval, cards, activeSprint, planCriticRuns, packageJsonSource, scriptSource, planSource] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_REF, cardId: CARD_ID }),
    getBacklogItemsByIds([CARD_ID]),
    getActiveFoundationCurrentSprint().catch(() => ({ sprint: null, items: [] })),
    getPlanCriticRunsByCardIds([CARD_ID]),
    readText('package.json'),
    readText(SCRIPT_PATH),
    readText(PLAN_REF),
  ])
  const packageJson = JSON.parse(packageJsonSource)
  const card = cards.find(item => item.id === CARD_ID) || null
  const sprintItem = activeSprint.items?.find(item => item.cardId === CARD_ID) || null
  const dogfood = buildFoundationJobRuntimeScheduleDogfoodProof()
  const job = getFoundationJobDefinition(NIGHTLY_DEEP_AUDIT_JOB_KEY)
  const runtimeAtMissedFirstWindow = getFoundationJobRuntime(job, null, new Date('2026-05-16T07:01:00.000Z'))
  const oldTomorrowRolloverRejected = dogfood.checks.some(check =>
    check.check === 'dogfood recreates old skipped-first-run tomorrow rollover' &&
    check.ok === true &&
    /old=2026-05-17T07:00:00\.000Z new=2026-05-16T07:00:00\.000Z/.test(check.detail || '')
  )
  const mutationTokens = /updateBacklogItem\s*\(|createBacklogItem\s*\(|upsertFoundationCurrentSprintOverlay\s*\(|INSERT\s+INTO\s+backlog_items|UPDATE\s+backlog_items|INSERT\s+INTO\s+foundation_sprints|UPDATE\s+foundation_sprints|DELETE\s+FROM\s+foundation_sprint_items|fs\.writeFile|writeFile\s*\(/i

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || APPROVAL_REF)
  addCheck(checks, card && ['scoped', 'done'].includes(card.lane), 'live backlog card exists in scoped/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, activeSprint.sprint?.sprintId === SPRINT_ID && sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains scheduler card in active/done stage', activeSprint.sprint ? `${activeSprint.sprint.sprintId}:${sprintItem?.stage || 'missing'}` : 'missing sprint')
  addCheck(checks, Boolean(sprintItem?.planRef) && sprintItem.planRef === PLAN_REF && Boolean(sprintItem?.definitionOfDone), 'Current Sprint doctrine is populated for scheduler card', sprintItem?.planRef || 'missing doctrine')
  addCheck(checks, planCriticRuns.some(run => run.cardId === CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, packageJson.scripts?.['process:nightly-audit-scheduler-due-fix-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package script points to focused proof', packageJson.scripts?.['process:nightly-audit-scheduler-due-fix-check'] || 'missing')
  addCheck(checks, job?.key === NIGHTLY_DEEP_AUDIT_JOB_KEY && job.runtimeMode === 'scheduled' && job.scheduleLocalTime === NIGHTLY_DEEP_AUDIT_SCHEDULE_LOCAL_TIME && job.scheduleTimezone === NIGHTLY_DEEP_AUDIT_SCHEDULE_TIMEZONE && job.mutationPosture === 'report_only' && job.scheduleMutationGuard?.ok === true, 'nightly audit job stays scheduled report-only and guard-approved', job ? `${job.runtimeMode}/${job.scheduleLocalTime}/${job.mutationPosture}/${job.scheduleMutationGuard?.ok}` : 'missing job')
  addCheck(checks, dogfood.ok === true, 'scheduler dogfood proof passes', dogfood.checks.filter(check => !check.ok).map(check => check.check).join(', ') || 'all dogfood checks passed')
  addCheck(checks, runtimeAtMissedFirstWindow.due === true && runtimeAtMissedFirstWindow.scheduleStatus === 'due' && runtimeAtMissedFirstWindow.nextRunAt === '2026-05-16T07:00:00.000Z', 'no-latest 03:01 local runtime is due now', `${runtimeAtMissedFirstWindow.scheduleStatus}/${runtimeAtMissedFirstWindow.due}/${runtimeAtMissedFirstWindow.nextRunAt}`)
  addCheck(checks, oldTomorrowRolloverRejected, 'dogfood proves old tomorrow rollover is rejected', dogfood.oldNoLatestNextRunAt || 'missing old rollover proof')
  addCheck(checks, planSource.includes('Root cause / root invariant') && planSource.includes('getFoundationJobRuntime()') && planSource.includes('rejects substring-only proof'), 'plan names root invariant and real function-path proof', PLAN_REF)
  addCheck(checks, !mutationTokens.test(scriptSource), 'focused proof is read-only and has no live mutation/write path', SCRIPT_PATH)

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    cardId: CARD_ID,
    sprintId: SPRINT_ID,
    dogfood,
    runtimeAtMissedFirstWindow,
    checks,
    findings: failures,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Nightly audit scheduler due fix check: ${result.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }

  await closeFoundationDb()
  if (failures.length) process.exitCode = 1
}

main().catch(async error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  await closeFoundationDb().catch(() => {})
  process.exitCode = 1
})
