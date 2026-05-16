#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import process from 'node:process'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'
import {
  EXTRACT_RETRY_APPROVAL_PATH,
  EXTRACT_RETRY_CARD_ID,
  EXTRACT_RETRY_CLOSEOUT_KEY,
  EXTRACT_RETRY_PLAN_PATH,
  EXTRACT_RETRY_SCRIPT_PATH,
  EXTRACT_RETRY_SPRINT_ID,
  buildExtractRetryDogfoodProof,
  evaluateExtractRetrySources,
} from '../lib/extract-retry.js'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readText(path) {
  return fs.readFile(path, 'utf8')
}

function scriptIsReadOnly(source = '') {
  const forbiddenTokens = [
    'upsert' + 'FoundationCurrentSprintOverlay',
    'update' + 'BacklogItem',
    'create' + 'BacklogItem',
    'INSERT' + ' INTO',
    'UPDATE' + ' ',
    'DELETE' + ' FROM',
    'fs.' + 'writeFile',
    'write' + 'File(',
  ]
  return forbiddenTokens.every(token => !String(source || '').includes(token))
}

function runRetryDryRun() {
  const result = spawnSync(
    'npm',
    ['run', 'extraction:retry-failed', '--', '--target=meetings-current-day', '--dryRun=true', '--json=true'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 10,
    },
  )
  let parsed = null
  try {
    const stdout = String(result.stdout || '').trim()
    const jsonStart = stdout.lastIndexOf('\n{')
    parsed = JSON.parse(jsonStart >= 0 ? stdout.slice(jsonStart + 1) : stdout)
  } catch {
    parsed = null
  }
  return {
    ok: result.status === 0 && parsed?.status === 'healthy' && parsed.executed === false && parsed.supported === true,
    status: result.status,
    parsed,
    stdoutTail: String(result.stdout || '').slice(-2000),
    stderrTail: String(result.stderr || '').slice(-2000),
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    approval,
    cards,
    activeSprint,
    planCriticRuns,
    retryModuleSource,
    runHardeningSource,
    executionSource,
    meetingSyncSource,
    retryScriptSource,
    packageSource,
    jobsSource,
    extractionRuntimeVerifierSource,
    proofScriptSource,
    planSource,
    currentPlan,
    currentState,
  ] = await Promise.all([
    validatePlanApprovalFile({
      approvalRef: EXTRACT_RETRY_APPROVAL_PATH,
      cardId: EXTRACT_RETRY_CARD_ID,
    }),
    getBacklogItemsByIds([EXTRACT_RETRY_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([EXTRACT_RETRY_CARD_ID]),
    readText('lib/extract-retry.js'),
    readText('lib/extraction-run-hardening.js'),
    readText('lib/extraction-run-hardening-execution.js'),
    readText('scripts/sync-meeting-notes-archive.mjs'),
    readText('scripts/retry-extraction-failed-items.mjs'),
    readText('package.json'),
    readText('lib/foundation-jobs.js'),
    readText('lib/foundation-extraction-runtime-verifier.js'),
    readText(EXTRACT_RETRY_SCRIPT_PATH),
    readText(EXTRACT_RETRY_PLAN_PATH),
    readText('docs/rebuild/current-plan.md'),
    readText('docs/rebuild/current-state.md'),
  ])
  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === EXTRACT_RETRY_CARD_ID) || null
  const dogfood = buildExtractRetryDogfoodProof()
  const sourceEvaluation = evaluateExtractRetrySources({
    retryModuleSource,
    runHardeningSource,
    executionSource,
    meetingSyncSource,
    retryScriptSource,
    packageSource,
    jobsSource,
    extractionRuntimeVerifierSource,
    proofScriptSource,
    planSource,
    currentPlan,
    currentState,
  })
  const retryDryRun = runRetryDryRun()
  const closeout = getFoundationBuildCloseouts().find(item => item.key === EXTRACT_RETRY_CLOSEOUT_KEY) || null

  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog has EXTRACT-RETRY in executing or done', card ? `${card.lane} / ${card.priority}` : 'missing card')
  addCheck(checks, approval.ok === true && approval.mode === 'v2' && Number(approval.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approval.ok ? `${approval.mode} / ${approval.approval?.score}` : approval.failures?.map(item => item.detail).join('; '))
  addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8), 'Plan Critic pass row exists', `${planCriticRuns.length} run(s)`)
  addCheck(
    checks,
    activeSprint?.sprint?.sprintId === EXTRACT_RETRY_SPRINT_ID || card?.lane === 'done',
    'Current Sprint points to EXTRACT-RETRY while active or card is historically done',
    activeSprint?.sprint?.sprintId || 'missing active sprint',
  )
  for (const check of sourceEvaluation.checks) addCheck(checks, check.ok, check.check, check.detail)
  addCheck(
    checks,
    dogfood.ok === true &&
      dogfood.supportListsAgree === true &&
      dogfood.supportedTargetSafe === true &&
      dogfood.unsupportedTargetsBlocked === true,
    'dogfood proves retry support is honest',
    dogfood.dogfoodInvariant,
  )
  addCheck(
    checks,
    retryDryRun.ok === true,
    'live no-write retry dry-run stays healthy and does not execute extraction',
    retryDryRun.parsed ? `status=${retryDryRun.parsed.status} supported=${retryDryRun.parsed.supported} executed=${retryDryRun.parsed.executed}` : retryDryRun.stderrTail || retryDryRun.stdoutTail,
  )
  addCheck(
    checks,
    scriptIsReadOnly(proofScriptSource),
    'focused proof script is read-only',
    'no DB write helpers, SQL mutation statements, or fs write calls',
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:extract-retry-check'] === `node --env-file-if-exists=.env ${EXTRACT_RETRY_SCRIPT_PATH}`,
    'package script is registered',
    packageJson.scripts?.['process:extract-retry-check'] || 'missing',
  )
  addCheck(
    checks,
    !card || card.lane !== 'done' || (
      String(card.statusNote || '').includes(EXTRACT_RETRY_CLOSEOUT_KEY) &&
      closeout?.operatorCloseout === true &&
      (closeout.backlogIds || []).includes(EXTRACT_RETRY_CARD_ID)
    ),
    'done closeout is exact when card is closed',
    card?.lane === 'done' ? (closeout?.key || 'missing closeout') : 'not closed yet',
  )

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    cardId: EXTRACT_RETRY_CARD_ID,
    closeoutKey: EXTRACT_RETRY_CLOSEOUT_KEY,
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
      sourceChecks: sourceEvaluation.summary,
    },
    checks,
    failed,
    dogfood,
    retryDryRun: {
      ok: retryDryRun.ok,
      status: retryDryRun.status,
      parsed: retryDryRun.parsed,
    },
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`EXTRACT-RETRY proof: ${result.summary.passed}/${result.summary.total}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }

  if (!result.ok) process.exitCode = 1
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.stack : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
