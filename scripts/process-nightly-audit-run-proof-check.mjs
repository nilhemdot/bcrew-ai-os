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
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  getFoundationJobRunSnapshot,
} from '../lib/foundation-runtime-jobs-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { getFoundationJobDefinition } from '../lib/foundation-jobs.js'
import {
  NIGHTLY_DEEP_AUDIT_JOB_KEY,
} from '../lib/nightly-deep-audit-constants.js'
import {
  NIGHTLY_AUDIT_RUN_PROOF_APPROVAL_PATH,
  NIGHTLY_AUDIT_RUN_PROOF_CARD_ID,
  NIGHTLY_AUDIT_RUN_PROOF_CLOSEOUT_KEY,
  NIGHTLY_AUDIT_RUN_PROOF_PLAN_PATH,
  NIGHTLY_AUDIT_RUN_PROOF_SCRIPT_PATH,
  buildNightlyAuditRunFreshnessStatus,
  buildNightlyAuditRunProofDogfood,
} from '../lib/nightly-audit-run-proof.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const SPRINT_ID = 'foundation-audit-reliability-2026-05-16'

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

function latestRunForJob(snapshot = {}, jobKey) {
  const job = (snapshot.jobs || []).find(item => item.key === jobKey)
  return job?.latestRun || (snapshot.latestRuns || []).find(run => run.jobKey === jobKey) || null
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    approval,
    cards,
    activeSprint,
    planCriticRuns,
    jobSnapshot,
    packageJsonSource,
    scriptSource,
    moduleSource,
    verifierSource,
    planSource,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: NIGHTLY_AUDIT_RUN_PROOF_APPROVAL_PATH,
      cardId: NIGHTLY_AUDIT_RUN_PROOF_CARD_ID,
    }),
    getBacklogItemsByIds([NIGHTLY_AUDIT_RUN_PROOF_CARD_ID]),
    getActiveFoundationCurrentSprint().catch(() => ({ sprint: null, items: [] })),
    getPlanCriticRunsByCardIds([NIGHTLY_AUDIT_RUN_PROOF_CARD_ID]),
    getFoundationJobRunSnapshot({ limit: 50, includeOutput: false }),
    readText('package.json'),
    readText(NIGHTLY_AUDIT_RUN_PROOF_SCRIPT_PATH),
    readText('lib/nightly-audit-run-proof.js'),
    readText('lib/foundation-intelligence-audit-verifier.js'),
    readText(NIGHTLY_AUDIT_RUN_PROOF_PLAN_PATH),
  ])
  const packageJson = JSON.parse(packageJsonSource)
  const card = cards.find(item => item.id === NIGHTLY_AUDIT_RUN_PROOF_CARD_ID) || null
  const sprintItem = activeSprint.items?.find(item => item.cardId === NIGHTLY_AUDIT_RUN_PROOF_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(item =>
    item.key === NIGHTLY_AUDIT_RUN_PROOF_CLOSEOUT_KEY &&
    (item.backlogIds || []).includes(NIGHTLY_AUDIT_RUN_PROOF_CARD_ID)
  ) || null
  const activeSprintOwnsCard = activeSprint.sprint?.sprintId === SPRINT_ID &&
    sprintItem &&
    ['building_now', 'done_this_sprint'].includes(sprintItem.stage)
  const activeSprintDoctrineOk = Boolean(sprintItem?.planRef) &&
    sprintItem.planRef === NIGHTLY_AUDIT_RUN_PROOF_PLAN_PATH &&
    Boolean(sprintItem?.definitionOfDone)
  const closedWithCloseout = card?.lane === 'done' &&
    closeout?.operatorCloseout === true &&
    closeout?.status === 'accepted'
  const job = getFoundationJobDefinition(NIGHTLY_DEEP_AUDIT_JOB_KEY)
  const latestRun = latestRunForJob(jobSnapshot, NIGHTLY_DEEP_AUDIT_JOB_KEY)
  const dogfood = buildNightlyAuditRunProofDogfood()
  const freshness = buildNightlyAuditRunFreshnessStatus({
    job,
    latestRun,
  })
  const mutationTokens = /updateBacklogItem\s*\(|createBacklogItem\s*\(|upsertFoundationCurrentSprintOverlay\s*\(|createFoundationJobRun\s*\(|finishFoundationJobRun\s*\(|INSERT\s+INTO\s+foundation_job_runs|UPDATE\s+foundation_job_runs|fs\.writeFile|writeFile\s*\(/i

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || NIGHTLY_AUDIT_RUN_PROOF_APPROVAL_PATH)
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, activeSprintOwnsCard || closedWithCloseout, 'run-proof card is active with sprint ownership or closed with Recent Work closeout', activeSprintOwnsCard ? `${activeSprint.sprint.sprintId}:${sprintItem.stage}` : closeout ? `${card?.lane}:${closeout.key}` : activeSprint.sprint ? `${activeSprint.sprint.sprintId}:missing closeout` : 'missing sprint/closeout')
  addCheck(checks, activeSprintDoctrineOk || closedWithCloseout, 'run-proof doctrine is active-sprint populated or preserved by closeout', activeSprintDoctrineOk ? sprintItem.planRef : closeout ? closeout.key : 'missing doctrine/closeout')
  addCheck(checks, planCriticRuns.some(run => run.cardId === NIGHTLY_AUDIT_RUN_PROOF_CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, packageJson.scripts?.['process:nightly-audit-run-proof-check'] === `node --env-file-if-exists=.env ${NIGHTLY_AUDIT_RUN_PROOF_SCRIPT_PATH}`, 'package script points to focused proof', packageJson.scripts?.['process:nightly-audit-run-proof-check'] || 'missing')
  addCheck(checks, job?.key === NIGHTLY_DEEP_AUDIT_JOB_KEY && job.runtimeMode === 'scheduled' && job.mutationPosture === 'report_only' && job.scheduleMutationGuard?.ok === true, 'nightly audit job stays scheduled report-only and guard-approved', job ? `${job.runtimeMode}/${job.scheduleEveryMinutes}/${job.mutationPosture}/${job.scheduleMutationGuard?.ok}` : 'missing job')
  addCheck(checks, dogfood.ok === true, 'dogfood rejects missing, failed, and stale runs and accepts fresh success', dogfood.checks.filter(check => !check.ok).map(check => check.check).join(', ') || 'all dogfood checks passed')
  addCheck(checks, freshness.ok === true, 'live latest nightly audit run is fresh or still inside current window', `${freshness.status}: ${freshness.reason}`)
  addCheck(checks, latestRun?.jobKey === NIGHTLY_DEEP_AUDIT_JOB_KEY && latestRun?.status === 'succeeded', 'latest job-run ledger has a successful nightly audit run', latestRun ? `${latestRun.runId}/${latestRun.status}/${latestRun.finishedAt || latestRun.startedAt}` : 'missing latest run')
  addCheck(checks, moduleSource.includes('NIGHTLY_AUDIT_RUN_PROOF_GRACE_MINUTES') && moduleSource.includes('buildNightlyAuditRunFreshnessStatus') && moduleSource.includes('stale prior-day success after audit window deadline fails'), 'run-proof module owns freshness semantics and dogfood fixtures', 'lib/nightly-audit-run-proof.js')
  addCheck(checks, verifierSource.includes('buildNightlyAuditRunFreshnessStatus') && verifierSource.includes('NIGHTLY-AUDIT-RUN-PROOF-001 fails closed'), 'foundation verifier consumes run freshness proof', 'lib/foundation-intelligence-audit-verifier.js')
  addCheck(checks, closeout?.operatorCloseout === true && (closeout.proofCommands || []).some(command => command.includes('process:nightly-audit-run-proof-check')), 'Recent Work closeout preserves reusable proof command', closeout ? closeout.key : 'missing closeout')
  addCheck(checks, planSource.includes('green auditor must prove actual successful execution') && planSource.includes('Dogfood proof recreates the exact miss'), 'plan names the false-green root invariant', NIGHTLY_AUDIT_RUN_PROOF_PLAN_PATH)
  addCheck(checks, !mutationTokens.test(scriptSource), 'focused proof is read-only and has no live mutation/write path', NIGHTLY_AUDIT_RUN_PROOF_SCRIPT_PATH)

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    cardId: NIGHTLY_AUDIT_RUN_PROOF_CARD_ID,
    sprintId: SPRINT_ID,
    closeoutKey: NIGHTLY_AUDIT_RUN_PROOF_CLOSEOUT_KEY,
    freshness,
    dogfood,
    latestRun: latestRun || null,
    checks,
    findings: failures,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Nightly audit run proof check: ${result.status}`)
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
