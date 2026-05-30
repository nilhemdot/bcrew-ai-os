#!/usr/bin/env node

import fs from 'node:fs/promises'
import process from 'node:process'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  CRAWL_RUN_LEDGER_APPROVAL_PATH,
  CRAWL_RUN_LEDGER_CARD_ID,
  CRAWL_RUN_LEDGER_CLOSEOUT_KEY,
  CRAWL_RUN_LEDGER_HANDOFF_PATH,
  CRAWL_RUN_LEDGER_PLAN_PATH,
  CRAWL_RUN_LEDGER_SCRIPT_PATH,
  CRAWL_RUN_LEDGER_SPRINT_ID,
  buildCrawlRunLedgerDogfoodProof,
  evaluateCrawlRunLedgerSources,
} from '../lib/crawl-run-ledger.js'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    args[key] = value ?? true
  }
  return args
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readText(path) {
  return fs.readFile(path, 'utf8')
}

async function fileExists(path) {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}

function scriptIsReadOnly(source = '') {
  const forbiddenTokens = [
    'upsert' + 'FoundationCurrentSprintOverlay',
    'update' + 'BacklogItem',
    'INSERT' + ' INTO',
    'UPDATE' + ' backlog_items',
    'UPDATE' + ' foundation_sprints',
    'fs.' + 'writeFile',
    'write' + 'File(',
  ]
  return forbiddenTokens.every(token => !String(source || '').includes(token))
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    approval,
    cards,
    activeSprint,
    planCriticRuns,
    sourceCrawlStoreSource,
    extractionTargetSource,
    currentPlan,
    currentState,
    packageSource,
    proofScriptSource,
    extractionVerifierSource,
    planSource,
    dogfood,
  ] = await Promise.all([
    validatePlanApprovalFile({
      approvalRef: CRAWL_RUN_LEDGER_APPROVAL_PATH,
      cardId: CRAWL_RUN_LEDGER_CARD_ID,
    }),
    getBacklogItemsByIds([CRAWL_RUN_LEDGER_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([CRAWL_RUN_LEDGER_CARD_ID]),
    readText('lib/foundation-source-crawl-store.js'),
    readText('scripts/run-extraction-target.mjs'),
    readText('docs/rebuild/current-plan.md'),
    readText('docs/rebuild/current-state.md'),
    readText('package.json'),
    readText(CRAWL_RUN_LEDGER_SCRIPT_PATH),
    readText('lib/foundation-extraction-runtime-verifier.js'),
    readText(CRAWL_RUN_LEDGER_PLAN_PATH),
    buildCrawlRunLedgerDogfoodProof(),
  ])
  const card = cards.find(item => item.id === CRAWL_RUN_LEDGER_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(item => item.key === CRAWL_RUN_LEDGER_CLOSEOUT_KEY) || null
  const sourceEvaluation = evaluateCrawlRunLedgerSources({
    sourceCrawlStoreSource,
    extractionTargetSource,
    currentPlan,
    currentState,
    packageSource,
    proofScriptSource,
  })

  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog has crawl-run ledger card in executing or done', card ? `${card.lane} / ${card.priority}` : 'missing card')
  addCheck(checks, approval.ok === true && approval.mode === 'v2' && Number(approval.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approval.ok ? `${approval.mode} / ${approval.approval?.score}` : approval.failures?.map(item => item.detail).join('; '))
  addCheck(checks, planCriticRuns.some(run => run.cardId === CRAWL_RUN_LEDGER_CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(
    checks,
    activeSprint?.sprint?.sprintId === CRAWL_RUN_LEDGER_SPRINT_ID || card?.lane === 'done',
    'Current Sprint points to crawl-run ledger while active or card is historically done',
    activeSprint?.sprint?.sprintId || 'missing active sprint',
  )
  for (const check of sourceEvaluation.checks) addCheck(checks, check.ok, check.check, check.detail)
  addCheck(checks, dogfood.ok === true && dogfood.rejected.missingRunInsert.ok === false && dogfood.rejected.missingIdempotentFinish.ok === false, 'dogfood rejects missing run-ledger failure modes', dogfood.dogfoodInvariant)
  addCheck(checks, scriptIsReadOnly(proofScriptSource), 'focused proof script is read-only', 'no DB write helpers, SQL mutation statements, or file writes')
  addCheck(checks, extractionVerifierSource.includes(CRAWL_RUN_LEDGER_CARD_ID) && extractionVerifierSource.includes('evaluateCrawlRunLedgerSources'), 'extraction runtime verifier has thin crawl-run ledger coverage', 'lib/foundation-extraction-runtime-verifier.js')
  addCheck(checks, planSource.includes('No live extraction') && planSource.includes('Dogfood proof') && planSource.includes('crawlRunId'), 'approved plan preserves no-extraction and dogfood posture', CRAWL_RUN_LEDGER_PLAN_PATH)
  if (card?.lane === 'done') {
    addCheck(
      checks,
      closeout?.operatorCloseout === true &&
        (closeout.backlogIds || []).includes(CRAWL_RUN_LEDGER_CARD_ID) &&
        await fileExists(CRAWL_RUN_LEDGER_HANDOFF_PATH) &&
        currentPlan.includes(CRAWL_RUN_LEDGER_CLOSEOUT_KEY) &&
        currentState.includes(CRAWL_RUN_LEDGER_CLOSEOUT_KEY),
      'closed card has closeout record, handoff, and rebuild docs',
      closeout ? closeout.key : 'missing closeout',
    )
  }

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    cardId: CRAWL_RUN_LEDGER_CARD_ID,
    checks,
    failed,
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
    },
    dogfood: {
      ok: dogfood.ok,
      healthyRunId: dogfood.healthy?.leasedRunId || null,
      idempotentFinish: dogfood.healthy?.idempotentFinish === true,
      rejected: Object.fromEntries(Object.entries(dogfood.rejected || {}).map(([key, value]) => [key, value.ok === false])),
    },
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log('Crawl Run Ledger proof')
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` - ${check.detail}` : ''}`)
    }
    console.log(`Summary: ${result.summary.passed}/${result.summary.total}`)
  }
  await closeFoundationDb()
  if (!result.ok) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error instanceof Error ? error.stack : String(error))
  process.exit(1)
})
