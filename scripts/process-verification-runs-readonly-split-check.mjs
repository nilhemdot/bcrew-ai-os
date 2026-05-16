#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import {
  validatePlanApprovalFile,
} from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  initFoundationDb,
} from '../lib/foundation-db.js'
import {
  getFoundationJobDefinitions,
  getFoundationJobRuntime,
} from '../lib/foundation-jobs.js'
import {
  buildFoundationJobMutationAllowlistReport,
} from '../lib/foundation-job-mutation-allowlist.js'

const execFile = promisify(execFileCallback)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const CARD_ID = 'VERIFICATION-RUNS-READONLY-SPLIT-001'
const PLAN_PATH = 'docs/process/verification-runs-readonly-split-001-plan.md'
const APPROVAL_PATH = 'docs/process/approvals/VERIFICATION-RUNS-READONLY-SPLIT-001.json'

function parseArgs(argv = process.argv.slice(2)) {
  return Object.fromEntries(argv
    .filter(arg => String(arg).startsWith('--'))
    .map(arg => {
      const [key, value] = String(arg).slice(2).split('=')
      return [key, value ?? true]
    }))
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value).sort().reduce((acc, key) => {
    acc[key] = stableValue(value[key])
    return acc
  }, {})
}

function sha256Json(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stableValue(value)), 'utf8').digest('hex')
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function liveFingerprint() {
  const [activeSprint, cards] = await Promise.all([
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds([
      'VERIFICATION-RUNS-001',
      'PER-USER-CHANGELOG-001',
      CARD_ID,
    ]),
  ])
  const payload = {
    sprint: activeSprint.sprint ? {
      sprintId: activeSprint.sprint.sprintId,
      status: activeSprint.sprint.status,
      activeBlockerCardId: activeSprint.sprint.activeBlockerCardId,
      itemStages: (activeSprint.items || []).map(item => ({
        cardId: item.cardId,
        stage: item.stage,
        sprintOrder: item.sprintOrder,
      })),
    } : null,
    cards: cards.map(card => ({
      id: card.id,
      lane: card.lane,
      priority: card.priority,
      summary: card.summary,
      nextAction: card.nextAction,
      statusNote: card.statusNote,
    })),
  }
  return {
    hash: sha256Json(payload),
    payload,
  }
}

function parseVerificationRunsOutput(stdout) {
  const text = String(stdout || '')
  const jsonStart = text.indexOf('{')
  if (jsonStart < 0) throw new Error('verification-runs check did not print JSON output')
  return JSON.parse(text.slice(jsonStart))
}

async function runReadOnlyVerificationRunsCheck() {
  const { stdout } = await execFile(
    'node',
    ['--env-file-if-exists=.env', 'scripts/process-verification-runs-check.mjs', '--json=true'],
    { cwd: repoRoot, maxBuffer: 1024 * 1024 * 8 },
  )
  return parseVerificationRunsOutput(stdout)
}

async function main() {
  const args = parseArgs()
  const jsonMode = args.json === true || String(args.json || '').toLowerCase() === 'true'
  const checks = []

  await initFoundationDb()
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: APPROVAL_PATH,
    cardId: CARD_ID,
  })
  const before = await liveFingerprint()
  const result = await runReadOnlyVerificationRunsCheck()
  const after = await liveFingerprint()
  const jobs = getFoundationJobDefinitions()
  const verificationRunsJob = jobs.find(job => job.key === 'verification-runs') || null
  const verificationRunsRuntime = verificationRunsJob ? getFoundationJobRuntime(verificationRunsJob, null, new Date()) : null
  const allowlistReport = buildFoundationJobMutationAllowlistReport({ jobs })
  const verificationRunsAllowlistRow = allowlistReport.rows.find(row => row.key === 'verification-runs') || null
  const verificationRunsScriptSource = await readRepoFile('scripts/process-verification-runs-check.mjs')
  const foundationJobsSource = await readRepoFile('lib/foundation-jobs.js')

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'approval integrity passes at 9.8+', approval.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
  addCheck(checks, result.status === 'healthy', 'default verification-runs check passes', result.status || 'missing')
  addCheck(checks, result.mode === 'read_only' && result.writesSkipped === true, 'default verification-runs check declares read-only and skips writes', `${result.mode || 'missing'} / writesSkipped=${result.writesSkipped}`)
  addCheck(checks, before.hash === after.hash, 'default verification-runs check does not mutate watched backlog/current-sprint truth', `${before.hash.slice(0, 12)} -> ${after.hash.slice(0, 12)}`)
  addCheck(checks, verificationRunsJob?.mutationPosture === 'read_only', 'verification-runs job posture is read_only', verificationRunsJob?.mutationPosture || 'missing')
  addCheck(checks, verificationRunsRuntime?.scheduleStatus !== 'blocked' && verificationRunsJob?.scheduleMutationGuard?.ok === true, 'verification-runs scheduled runtime is not blocked', verificationRunsRuntime?.scheduleStatus || 'missing')
  addCheck(checks, verificationRunsAllowlistRow?.allowlistStatus === 'allowed_scheduled_read_only', 'verification-runs allowlist is scheduled read-only', verificationRunsAllowlistRow?.allowlistStatus || 'missing')
  addCheck(checks, allowlistReport.ok && allowlistReport.missingCount === 0 && allowlistReport.mismatchCount === 0, 'scheduled job mutation allowlist remains healthy', `scheduled=${allowlistReport.scheduledCount} allowed=${allowlistReport.allowedCount} blocked=${allowlistReport.blockedCount}`)
  addCheck(checks, verificationRunsScriptSource.includes('const applyMode') && verificationRunsScriptSource.includes('writesSkipped') && verificationRunsScriptSource.includes('if (applyMode)'), 'verification script keeps historical writeback behind applyMode', 'scripts/process-verification-runs-check.mjs')
  addCheck(checks, foundationJobsSource.includes('historical closeout writeback now requires explicit --apply'), 'job registry documents explicit apply boundary', 'lib/foundation-jobs.js')

  const failed = checks.filter(check => !check.ok)
  const output = {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    cardId: CARD_ID,
    planPath: PLAN_PATH,
    approvalPath: APPROVAL_PATH,
    verificationRuns: {
      mode: result.mode,
      writesSkipped: result.writesSkipped,
      candidateCount: result.verificationRuns?.summary?.candidateCount ?? null,
    },
    fingerprint: {
      before: before.hash,
      after: after.hash,
      unchanged: before.hash === after.hash,
    },
    runtime: {
      scheduleStatus: verificationRunsRuntime?.scheduleStatus || null,
      mutationPosture: verificationRunsJob?.mutationPosture || null,
      allowlistStatus: verificationRunsAllowlistRow?.allowlistStatus || null,
    },
    checks,
    findings: failed,
  }

  if (jsonMode) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log(`Verification runs read-only split check: ${output.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
