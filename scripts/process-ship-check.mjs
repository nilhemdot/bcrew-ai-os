#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  recordBuildLaneFailureEventsFromChecks,
} from '../lib/build-lane-failure-telemetry.js'
import {
  assertFoundationDbReadyForReadOnlyGate,
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getFoundationSnapshot,
} from '../lib/foundation-strategy-docs-db.js'
import {
  evaluateCloseoutPromiseContinuation,
} from '../lib/promise-to-proof-integrity-gate.js'

const execFile = promisify(execFileCallback)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const requiredCloseoutFields = [
  'whatChanged',
  'whatItDoes',
  'whyItMatters',
  'whereItLives',
  'proofCommands',
  'knownLimits',
  'reviewNext',
]

function parseArgs(argv) {
  const result = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    result[key] = value ?? true
  }
  return result
}

function boolArg(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
}

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function normalizeText(value) {
  return String(value || '').trim()
}

async function getRepoHead() {
  const { stdout } = await execFile('git', ['rev-parse', 'HEAD'], {
    cwd: repoRoot,
    maxBuffer: 1024 * 64,
  })
  return String(stdout || '').trim().toLowerCase()
}

async function fetchJson(baseUrl, pathname) {
  const response = await fetch(new URL(pathname, baseUrl))
  if (!response.ok) throw new Error(`${pathname} returned ${response.status} ${response.statusText}`)
  return response.json()
}

async function runFoundationVerify() {
  const { stdout, stderr } = await execFile('npm', ['run', 'foundation:verify'], {
    cwd: repoRoot,
    env: process.env,
    maxBuffer: 1024 * 1024 * 8,
  })
  return `${stdout || ''}${stderr || ''}`.trim()
}

function closeoutHasField(closeout, field) {
  const value = closeout[field]
  if (Array.isArray(value)) return value.length > 0 && value.every(item => normalizeText(item))
  return normalizeText(value).length > 0
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const cardId = normalizeText(args.card)
  const closeoutKey = normalizeText(args.closeoutKey)
  const planApprovalRef = normalizeText(args.planApprovalRef)
  const baseUrl = normalizeText(args.baseUrl) || 'http://localhost:3000'
  const skipLiveVerify = boolArg(args.skipLiveVerify)
  const skipLiveVerifyReason = normalizeText(args.skipLiveVerifyReason)
  const emergencyBypassReason = normalizeText(args.emergencyBypassReason)
  const checks = []

  console.log('Process ship check')
  console.log(`  Card: ${cardId || 'missing'}`)
  console.log(`  Closeout: ${closeoutKey || 'missing'}`)
  console.log(`  Approval: ${planApprovalRef || 'missing'}`)

  ensure(checks, cardId, 'card argument is present', cardId || 'missing --card')
  ensure(checks, closeoutKey, 'closeout key argument is present', closeoutKey || 'missing --closeoutKey')
  ensure(checks, planApprovalRef, 'plan approval file argument is present', planApprovalRef || 'missing --planApprovalRef')
  ensure(
    checks,
    !skipLiveVerify || Boolean(skipLiveVerifyReason),
    'live verifier skip requires a reason',
    skipLiveVerify ? skipLiveVerifyReason || 'missing --skipLiveVerifyReason' : 'not skipped',
  )
  if (emergencyBypassReason) {
    console.log(`  Emergency bypass note: ${emergencyBypassReason}`)
    console.log('  Follow-up required: create or update a backlog card for anything bypassed.')
  }

  let approvalValidation = null
  let approval = null
  if (planApprovalRef) {
    approvalValidation = await validatePlanApprovalFile({
      repoRoot,
      approvalRef: planApprovalRef,
      cardId,
    })
    approval = approvalValidation.approval
    for (const check of approvalValidation.checks) {
      ensure(checks, check.ok, check.check, check.detail)
    }
  }
  ensure(
    checks,
    approvalValidation?.ok,
    'plan approval integrity passes',
    approvalValidation ? approvalValidation.mode : 'missing validation',
  )

  await assertFoundationDbReadyForReadOnlyGate('process:ship-check')
  const foundation = await getFoundationSnapshot()
  const card = (foundation.backlogItems || []).find(item => item.id === cardId) || null
  ensure(checks, Boolean(card), 'backlog card exists', card ? `${card.id} / ${card.lane}` : 'missing card')
  ensure(checks, normalizeText(card?.summary), 'backlog card has a summary', card?.summary || 'missing summary')
  ensure(checks, normalizeText(card?.nextAction), 'backlog card has a next action', card?.nextAction || 'missing nextAction')
  ensure(checks, normalizeText(card?.statusNote), 'backlog card has a status note', card?.statusNote || 'missing statusNote')

  const closeout = getFoundationBuildCloseouts().find(record => record.key === closeoutKey) || null
  ensure(checks, Boolean(closeout), 'closeout record exists', closeoutKey || 'missing closeout key')
  for (const field of requiredCloseoutFields) {
    ensure(checks, closeout && closeoutHasField(closeout, field), `closeout has ${field}`, closeout?.[field] ? 'present' : 'missing')
  }
  ensure(checks, (closeout?.backlogIds || []).includes(cardId), 'closeout links the target card', (closeout?.backlogIds || []).join(', ') || 'missing')
  ensure(checks, (closeout?.proofCommands || []).some(command => command.includes('foundation:verify')), 'closeout includes foundation:verify proof', (closeout?.proofCommands || []).join(' | '))
  const promiseContinuation = evaluateCloseoutPromiseContinuation({
    card,
    closeout,
    backlogItems: foundation.backlogItems || [],
  })
  ensure(
    checks,
    promiseContinuation.ok,
    'partial V1 capability closeout has an open continuation card',
    promiseContinuation.reason + (promiseContinuation.continuationIds.length ? `: ${promiseContinuation.continuationIds.join(', ')}` : ''),
  )

  const repoHead = await getRepoHead()
  const foundationHub = await fetchJson(baseUrl, '/api/foundation-hub')
  const runningCommit = normalizeText(foundationHub.runtimeSupervisor?.servedCode?.runningCommit).toLowerCase()
  const runningShort = normalizeText(foundationHub.runtimeSupervisor?.servedCode?.runningShortCommit) || runningCommit.slice(0, 7)
  ensure(
    checks,
    runningCommit && runningCommit === repoHead,
    'dashboard served commit matches repo HEAD',
    runningCommit ? `served=${runningShort} head=${repoHead.slice(0, 7)}` : 'missing served-code metadata',
  )

  if (!skipLiveVerify) {
    try {
      const output = await runFoundationVerify()
      ensure(checks, /Foundation verification passed\./.test(output), 'default foundation:verify passes', output.split('\n').slice(-2).join(' | '))
    } catch (error) {
      const detail = error?.stdout || error?.stderr || error?.message || String(error)
      ensure(checks, false, 'default foundation:verify passes', String(detail).split('\n').slice(-4).join(' | '))
    }
  } else {
    ensure(checks, true, 'default foundation:verify was explicitly skipped', skipLiveVerifyReason)
  }

  console.log('')
  for (const check of checks) {
    const prefix = check.ok ? 'PASS' : 'FAIL'
    console.log(`${prefix} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
  const failed = checks.filter(check => !check.ok)
  console.log('')
  console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  if (failed.length) {
    try {
      recordBuildLaneFailureEventsFromChecks({
        repoRoot,
        checks,
        command: 'process:ship-check',
        cardId,
        closeoutKey,
      })
    } catch {}
    process.exitCode = 1
  }
}

main()
  .catch(error => {
    try {
      recordBuildLaneFailureEventsFromChecks({
        repoRoot,
        checks: [{ ok: false, check: 'process:ship-check failed before checks completed', detail: error instanceof Error ? error.message : String(error) }],
        command: 'process:ship-check',
      })
    } catch {}
    console.error('Process ship check failed.')
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
