#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  CLICKUP_SOURCE_VERIFY_CARD_IDS,
  buildClickUpSourceVerifierDogfoodProof,
} from '../lib/clickup-source-verifier.js'
import {
  buildFoundationVerifySlowBudgetDogfoodProof,
} from '../lib/foundation-verify-profile-budget.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'

const execFile = promisify(execFileCallback)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const SPRINT_ID = 'foundation-clickup-verify-health-boundary-2026-05-14'
const CLOSEOUT_KEY = 'foundation-clickup-verify-health-boundary-v1'
const PLAN_REFS = {
  'CLICKUP-VERIFY-FAST-PATH-001': 'docs/process/clickup-verify-fast-path-001-plan.md',
  'CLICKUP-VERIFY-PAYLOAD-CACHE-001': 'docs/process/clickup-verify-payload-cache-001-plan.md',
  'CLICKUP-DEGRADED-HEALTH-DOGFOOD-001': 'docs/process/clickup-degraded-health-dogfood-001-plan.md',
  'FOUNDATION-VERIFY-SLOW-BUDGET-001': 'docs/process/foundation-verify-slow-budget-001-plan.md',
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false, skipLive: false }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg === '--skipLive' || arg === '--skip-live') args.skipLive = true
  }
  return args
}

function addFinding(findings, ok, check, detail = '') {
  findings.push({ ok: Boolean(ok), check, detail })
}

async function exists(relativePath) {
  try {
    await fs.stat(path.join(repoRoot, relativePath))
    return true
  } catch {
    return false
  }
}

async function runClickUpVerifyBounded() {
  const startedAt = Date.now()
  try {
    const result = await execFile('npm', ['run', '-s', 'clickup:verify', '--', '--timeoutMs=8000', '--maxTaskPages=1'], {
      cwd: repoRoot,
      env: {
        ...process.env,
        CLICKUP_VERIFY_TIMEOUT_MS: '8000',
        CLICKUP_VERIFY_MAX_TASK_PAGES: '1',
      },
      timeout: 30000,
      maxBuffer: 1024 * 1024 * 6,
    })
    return {
      ok: true,
      durationMs: Date.now() - startedAt,
      output: `${result.stdout || ''}${result.stderr || ''}`,
    }
  } catch (error) {
    return {
      ok: false,
      durationMs: Date.now() - startedAt,
      output: `${error?.stdout || ''}${error?.stderr || ''}${error instanceof Error ? `\n${error.message}` : ''}`,
    }
  }
}

function doctrineOk(item = {}) {
  return Boolean(
    item.planRef &&
    item.definitionOfDone &&
    Array.isArray(item.proofCommands) &&
    item.proofCommands.length &&
    Array.isArray(item.notNextBoundaries) &&
    item.notNextBoundaries.length &&
    item.existingWorkCheck &&
    Object.keys(item.existingWorkCheck).length
  )
}

async function main() {
  const args = parseArgs()
  const findings = []
  const requiredFiles = [
    'lib/clickup-source-verifier.js',
    'lib/foundation-verify-profile-budget.js',
    'scripts/clickup-source-verify.mjs',
    'scripts/process-clickup-verify-health-boundary-check.mjs',
    'scripts/foundation-verify.mjs',
    'scripts/process-foundation-verify-profile-check.mjs',
    ...Object.values(PLAN_REFS),
    ...CLICKUP_SOURCE_VERIFY_CARD_IDS.map(cardId => `docs/process/approvals/${cardId}.json`),
  ]

  for (const file of requiredFiles) {
    addFinding(findings, await exists(file), 'required ClickUp verifier boundary artifact exists', file)
  }

  const approvals = []
  for (const cardId of CLICKUP_SOURCE_VERIFY_CARD_IDS) {
    const approval = await validatePlanApprovalFile({
      repoRoot,
      approvalRef: `docs/process/approvals/${cardId}.json`,
      cardId,
    })
    approvals.push(approval)
    addFinding(
      findings,
      approval.ok && Number(approval.approval?.score) >= 9.8,
      `${cardId} approval file is valid at 9.8+`,
      approval.failures?.map(item => item.check).join(', ') || approval.approval?.approvedPlanRef || 'ok',
    )
  }

  const [activeSprint, cards, planCriticRuns, dogfood, slowBudgetDogfood, liveClickUp] = await Promise.all([
    getActiveFoundationCurrentSprint().catch(() => ({ sprint: null, items: [] })),
    getBacklogItemsByIds(CLICKUP_SOURCE_VERIFY_CARD_IDS),
    getPlanCriticRunsByCardIds(CLICKUP_SOURCE_VERIFY_CARD_IDS),
    buildClickUpSourceVerifierDogfoodProof(),
    buildFoundationVerifySlowBudgetDogfoodProof(),
    args.skipLive ? Promise.resolve({ ok: true, durationMs: 0, output: 'live clickup:verify skipped by --skipLive' }) : runClickUpVerifyBounded(),
  ])

  addFinding(
    findings,
    activeSprint.sprint?.sprintId === SPRINT_ID,
    'Current Sprint is Foundation Verifier Drag + ClickUp Health Boundary',
    activeSprint.sprint?.sprintId || 'missing',
  )
  addFinding(
    findings,
    CLICKUP_SOURCE_VERIFY_CARD_IDS.every(cardId => (activeSprint.items || []).some(item => item.cardId === cardId && ['sprint_ready', 'building_now', 'done_this_sprint'].includes(item.stage))),
    'all ClickUp verifier boundary cards are Sprint Ready or later',
    (activeSprint.items || []).map(item => `${item.cardId}:${item.stage}`).join(', '),
  )
  addFinding(
    findings,
    CLICKUP_SOURCE_VERIFY_CARD_IDS.every(cardId => doctrineOk((activeSprint.items || []).find(item => item.cardId === cardId))),
    'all ClickUp verifier boundary cards have populated doctrine',
    (activeSprint.items || []).filter(item => !doctrineOk(item)).map(item => item.cardId).join(', ') || 'ok',
  )
  addFinding(
    findings,
    CLICKUP_SOURCE_VERIFY_CARD_IDS.every(cardId => cards.some(card => card.id === cardId && !['research', 'parked'].includes(card.lane))),
    'all ClickUp verifier boundary cards exist in live backlog outside research/parked lanes',
    cards.map(card => `${card.id}:${card.lane}`).join(', '),
  )
  addFinding(
    findings,
    CLICKUP_SOURCE_VERIFY_CARD_IDS.every(cardId => planCriticRuns.some(run => run.cardId === cardId && run.status === 'pass' && Number(run.score) >= 9.8)),
    'all ClickUp verifier boundary cards have durable Plan Critic pass rows',
    planCriticRuns.map(run => `${run.cardId}:${run.status}/${run.score}`).join(', '),
  )
  addFinding(
    findings,
    dogfood.ok === true,
    'dogfood proves bounded ClickUp reads, per-run cache, degraded timeout/500/429 handling, and redaction',
    dogfood.checks.filter(check => !check.ok).map(check => `${check.check}: ${check.detail}`).join(' | ') || dogfood.dogfoodInvariant,
  )
  addFinding(
    findings,
    slowBudgetDogfood.ok === true,
    'dogfood proves verifier slow-section budget reports slow ClickUp section with owner',
    slowBudgetDogfood.rows.map(row => `${row.label}:${row.durationMs}/${row.budgetMs}:${row.owner}`).join(', '),
  )
  addFinding(
    findings,
    liveClickUp.durationMs < 30000 && liveClickUp.output.includes('CLICKUP_SOURCE_VERIFY_SUMMARY'),
    'bounded live clickup:verify emits structured summary within 30s',
    `ok=${liveClickUp.ok} duration=${Math.round(liveClickUp.durationMs)}ms tail=${liveClickUp.output.split('\n').filter(Boolean).slice(-3).join(' | ')}`,
  )

  await closeFoundationDb()

  const failed = findings.filter(finding => !finding.ok)
  const summary = {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'healthy',
    sprintId: SPRINT_ID,
    closeoutKey: CLOSEOUT_KEY,
    cards: CLICKUP_SOURCE_VERIFY_CARD_IDS,
    findings,
    liveClickUpDurationMs: liveClickUp.durationMs,
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(`ClickUp verifier health-boundary proof: ${summary.status}`)
    for (const finding of findings) {
      console.log(`  ${finding.ok ? 'PASS' : 'BLOCKED'} ${finding.check}${finding.detail ? ` -> ${finding.detail}` : ''}`)
    }
  }
  if (!summary.ok) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  const args = parseArgs()
  if (args.json) {
    console.log(JSON.stringify({
      ok: false,
      status: 'error',
      sprintId: SPRINT_ID,
      error: error instanceof Error ? error.message : String(error),
    }, null, 2))
  } else {
    console.error(error instanceof Error ? error.message : String(error))
  }
  process.exitCode = 1
})
