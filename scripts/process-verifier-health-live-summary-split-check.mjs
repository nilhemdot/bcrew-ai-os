#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_APPROVAL_PATH,
  VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_BEFORE_LINES,
  VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_CARD_ID,
  VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_CLOSEOUT_KEY,
  VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_HANDOFF_PATH,
  VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_PLAN_PATH,
  VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_SCRIPT_PATH,
  buildFoundationVerifierHealthLiveSummaryDogfoodProof,
} from '../lib/foundation-verifier-health-live-summary.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, ...value] = arg.slice(2).split('=')
    args[key] = value.length ? value.join('=') : 'true'
  }
  return args
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function repoFileExists(relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath))
    return true
  } catch {
    return false
  }
}

function lineCount(source = '') {
  return String(source || '').split('\n').length
}

function scriptIsReadOnly(source = '') {
  return !/updateBacklogItem\s*\(|createBacklogItem\s*\(|upsertFoundationCurrentSprintOverlay\s*\(|INSERT\s+INTO|UPDATE\s+|DELETE\s+FROM|fs\.writeFile|writeFile\s*\(/i.test(source)
}

async function main() {
  const args = parseArgs()
  const jsonOnly = args.json === true || args.json === 'true'
  const checks = []

  const [
    moduleSource,
    verifierSource,
    scriptSource,
    planSource,
    packageSource,
  ] = await Promise.all([
    readRepoFile('lib/foundation-verifier-health-live-summary.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile(VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_SCRIPT_PATH),
    readRepoFile(VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_PLAN_PATH),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_APPROVAL_PATH,
    cardId: VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_CARD_ID,
  })
  const [card] = await getBacklogItemsByIds([VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_CARD_ID])
  const activeSprint = await getActiveFoundationCurrentSprint()
  const planCriticRuns = await getPlanCriticRunsByCardIds([VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_CARD_ID])
  const sprintItem = activeSprint.items.find(item => item.cardId === VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_CLOSEOUT_KEY) || null
  const dogfood = buildFoundationVerifierHealthLiveSummaryDogfoodProof()
  const verifierLines = lineCount(verifierSource)
  const hasPlanCriticPass = planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8)
  const activeSprintOwnsCard = sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage)
  const historicalCloseoutOwnsCard =
    card?.lane === 'done' &&
    String(card?.statusNote || '').includes(VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_CLOSEOUT_KEY) &&
    closeout?.operatorCloseout === true &&
    (closeout.backlogIds || []).includes(VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_CARD_ID)
  const oldInlineMessages = [
    'KPI health dynamic-year contract rejects frozen params and exposes runtime period metadata',
    'FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001 renders source-backed Current State summary payload',
    'SYSTEM-HEALTH-NIGHTLY-AUDIT-001 and SCHEDULED-JOB-STALENESS-DASHBOARD-001 surface hidden job/source/system staleness',
    'VERIFIER-HEALTH-SCRIPT-MODULE-SPLIT-001 extracts health-script verifier checks into a focused module',
  ]

  addCheck(checks, approvalValidation.ok && Number(approvalValidation.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_APPROVAL_PATH)
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, activeSprintOwnsCard || historicalCloseoutOwnsCard, 'Health/live-summary split has active or historical ownership without replacing the active overlay', activeSprintOwnsCard ? `${activeSprint.sprint?.sprintId}:${sprintItem?.stage}` : closeout?.key || 'missing')
  addCheck(checks, hasPlanCriticPass || historicalCloseoutOwnsCard, 'Plan Critic pass or historical closeout exists', hasPlanCriticPass ? 'plan_critic_runs pass row present' : closeout?.key || 'missing')
  addCheck(checks, moduleSource.includes('evaluateFoundationVerifierHealthLiveSummary') && moduleSource.includes('buildFoundationVerifierHealthLiveSummaryDogfoodProof'), 'new module owns health/live-summary evaluator and dogfood', 'lib/foundation-verifier-health-live-summary.js')
  addCheck(
    checks,
    dogfood.ok === true &&
      dogfood.rejected.hiddenKpiDynamicYear.ok === false &&
      dogfood.rejected.hiddenLiveSummary.ok === false &&
      dogfood.rejected.hiddenSystemHealth.ok === false &&
      dogfood.rejected.hiddenHealthScripts.ok === false &&
      dogfood.rejected.oldInlinePredicate.ok === false,
    'dogfood rejects health/live-summary failures',
    dogfood.dogfoodInvariant,
  )
  addCheck(checks, verifierSource.includes('evaluateFoundationVerifierHealthLiveSummary({') && verifierSource.includes('healthLiveSummaryVerifier.checks'), 'foundation verifier delegates health/live-summary checks to focused module', 'evaluateFoundationVerifierHealthLiveSummary')
  addCheck(
    checks,
    oldInlineMessages.every(message => !verifierSource.includes(message)),
    'old inline health/live-summary assertion block is removed from root',
    'KPI dynamic-year, live summary, system health, and health-script split assertions no longer appear inline',
  )
  addCheck(checks, verifierLines < VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_BEFORE_LINES, 'foundation verifier line count decreases', `${VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_BEFORE_LINES} -> ${verifierLines}`)
  addCheck(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only', 'no live-state write tokens')
  addCheck(checks, packageJson.scripts?.['process:verifier-health-live-summary-split-check'] === `node --env-file-if-exists=.env ${VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:verifier-health-live-summary-split-check'] || 'missing')
  addCheck(checks, await repoFileExists(VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_HANDOFF_PATH), 'closeout handoff exists', VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_HANDOFF_PATH)
  addCheck(checks, planSource.includes('Dogfood proof recreates the failure class') && planSource.includes('No active sprint overlay replacement') && planSource.includes('No arbitrary tail extraction'), 'plan requires dogfood, rejects arbitrary extraction, and preserves active overlay', VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_PLAN_PATH)
  addCheck(checks, moduleSource.includes('KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_CARD_ID') && moduleSource.includes('FOUNDATION_UI_LIVE_SUMMARY_SOURCES_CARD_ID') && moduleSource.includes('SYSTEM_HEALTH_NIGHTLY_AUDIT_CARD_ID') && moduleSource.includes('VERIFIER_HEALTH_SCRIPT_MODULE_CARD_ID'), 'module owns the intended health/live-summary domain', 'KPI dynamic-year, Current State summary, system health, health-script verifier')

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_CARD_ID,
    closeoutKey: VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_CLOSEOUT_KEY,
    lineCounts: {
      before: VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_BEFORE_LINES,
      after: verifierLines,
      delta: verifierLines - VERIFIER_HEALTH_LIVE_SUMMARY_SPLIT_BEFORE_LINES,
    },
    checks,
  }

  if (jsonOnly) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Verifier health/live-summary split proof')
    checks.forEach(check => console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`))
    console.log(`Summary: ${checks.filter(check => check.ok).length}/${checks.length} checks passed`)
  }

  await closeFoundationDb()
  if (!ok) process.exit(1)
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error)
  process.exit(1)
})
