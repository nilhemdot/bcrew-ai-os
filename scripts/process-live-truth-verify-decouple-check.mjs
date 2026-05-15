#!/usr/bin/env node

import fs from 'node:fs/promises'
import process from 'node:process'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  LIVE_TRUTH_VERIFY_DECOUPLE_APPROVAL_PATH,
  LIVE_TRUTH_VERIFY_DECOUPLE_CARD_ID,
  LIVE_TRUTH_VERIFY_DECOUPLE_CLOSEOUT_KEY,
  LIVE_TRUTH_VERIFY_DECOUPLE_PLAN_PATH,
  LIVE_TRUTH_VERIFY_DECOUPLE_SPRINT_ID,
  buildLiveTruthVerifyDecoupleStatus,
} from '../lib/live-truth-verify-decouple.js'
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
  const baseUrl = String(args.baseUrl || process.env.FOUNDATION_BASE_URL || 'http://localhost:3000')
  const checks = []

  await assertFoundationDbReadyForReadOnlyGate('process:live-truth-verify-decouple-check')
  const [
    approvalValidation,
    activeSprint,
    cards,
    planCriticRuns,
    status,
    scriptSource,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot: process.cwd(),
      approvalRef: LIVE_TRUTH_VERIFY_DECOUPLE_APPROVAL_PATH,
      cardId: LIVE_TRUTH_VERIFY_DECOUPLE_CARD_ID,
    }),
    getActiveFoundationCurrentSprint(),
    getBacklogItemsByIds([LIVE_TRUTH_VERIFY_DECOUPLE_CARD_ID]),
    getPlanCriticRunsByCardIds([LIVE_TRUTH_VERIFY_DECOUPLE_CARD_ID]),
    buildLiveTruthVerifyDecoupleStatus({ repoRoot: process.cwd(), baseUrl, skipEndpointFetch: true }),
    fs.readFile(new URL(import.meta.url), 'utf8'),
  ])
  const card = cards.find(item => item.id === LIVE_TRUTH_VERIFY_DECOUPLE_CARD_ID) || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === LIVE_TRUTH_VERIFY_DECOUPLE_CARD_ID) || null
  const planCriticPass = (planCriticRuns || []).some(run =>
    run.cardId === LIVE_TRUTH_VERIFY_DECOUPLE_CARD_ID &&
    run.status === 'pass' &&
    Number(run.score) >= 9.8 &&
    run.planRef === LIVE_TRUTH_VERIFY_DECOUPLE_PLAN_PATH
  )

  addCheck(checks, approvalValidation.ok && Number(approvalValidation.approval?.score) >= 9.8, 'approval integrity passes at 9.8+', approvalValidation.failures?.map(item => item.detail || item.check).join(' | ') || 'ok')
  addCheck(checks, planCriticPass, 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.cardId}:${run.status}:${run.score}`).join(', ') || 'missing')
  addCheck(checks, card?.lane === 'executing' || card?.lane === 'done', 'live backlog card is executing or done', card ? card.lane : 'missing')
  addCheck(
    checks,
    activeSprint.sprint?.sprintId === LIVE_TRUTH_VERIFY_DECOUPLE_SPRINT_ID &&
      ['building_now', 'done_this_sprint'].includes(sprintItem?.stage),
    'Current Sprint shows this card active or done',
    `${activeSprint.sprint?.sprintId || 'missing'} / ${sprintItem?.stage || 'missing'}`,
  )
  for (const check of status.checks || []) addCheck(checks, check.ok, check.check, check.detail)
  addCheck(checks, status.status === 'healthy', 'focused live-truth status is healthy', status.status)
  addCheck(
    checks,
    !hasForbiddenMutationCall(scriptSource),
    'focused proof script is read-only',
    'no live mutation calls found',
  )

  const summary = {
    ok: checks.every(check => check.ok),
    status: checks.every(check => check.ok) ? 'healthy' : 'blocked',
    cardId: LIVE_TRUTH_VERIFY_DECOUPLE_CARD_ID,
    closeoutKey: LIVE_TRUTH_VERIFY_DECOUPLE_CLOSEOUT_KEY,
    currentSprintFindingCount: status.currentSprintFindingCount,
    baseline: status.baseline,
    synthetic: status.synthetic,
    checks,
  }

  if (jsonMode) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(`Live truth verify decouple check: ${summary.status}`)
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
