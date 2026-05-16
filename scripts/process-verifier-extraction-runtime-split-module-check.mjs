#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  getSharedCommunicationProcessingProvenanceGaps,
  getStaleLlmCalls,
} from '../lib/foundation-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_APPROVAL_PATH,
  VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_BEFORE_LINES,
  VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_CARD_ID,
  VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_CLOSEOUT_KEY,
  VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_SPRINT_ID,
  buildFoundationExtractionRuntimeVerifierDogfoodProof,
  evaluateFoundationExtractionRuntimeVerifier,
} from '../lib/foundation-extraction-runtime-verifier.js'
import {
  CRAWL_RUN_LEDGER_CARD_ID,
  CRAWL_RUN_LEDGER_SCRIPT_PATH,
} from '../lib/crawl-run-ledger.js'
import {
  EXTRACT_RETIRE_CARD_ID,
  EXTRACT_RETIRE_PLAN_PATH,
  EXTRACT_RETIRE_SCRIPT_PATH,
} from '../lib/extract-retire.js'
import {
  EXTRACT_RETRY_CARD_ID,
  EXTRACT_RETRY_PLAN_PATH,
  EXTRACT_RETRY_SCRIPT_PATH,
} from '../lib/extract-retry.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readText(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function repoFileExists(relativePath) {
  try {
    const stat = await fs.stat(path.join(repoRoot, relativePath))
    return stat.isFile()
  } catch {
    return false
  }
}

function lineCount(source = '') {
  return String(source || '').split('\n').length
}

function scriptIsReadOnly(source = '') {
  const forbiddenTokens = [
    'create' + 'BacklogItem',
    'update' + 'BacklogItem',
    'upsert' + 'FoundationCurrentSprintOverlay',
    'INSERT' + ' INTO',
    'UPDATE' + ' ',
    'DELETE' + ' FROM',
    'fs.' + 'writeFile',
    'write' + 'File(',
  ]
  return forbiddenTokens.every(token => !String(source || '').includes(token))
}

async function loadEvaluationInput() {
  const [
    foundationDbSource,
    sourceCrawlStoreSource,
    llmRuntimeStoreSource,
    runtimeJobStoreSource,
    foundationWorkerSource,
    foundationJobsSource,
    extractionTargetSource,
    videoInventorySource,
    currentPlan,
    currentState,
    extractionControlSeedSource,
    googleDelegatedSource,
    driveContentExtractionSource,
    packageSource,
    driveLinkInventorySource,
    sharedCandidateExtractionSource,
    crawlRunLedgerScriptSource,
    extractRetireModuleSource,
    extractRetireScriptSource,
    extractRetirePlanSource,
    extractRetryModuleSource,
    extractRetryScriptSource,
    extractRetryPlanSource,
    extractRunHardeningSource,
    extractRunHardeningExecutionSource,
    meetingNotesSyncSource,
    extractionRetryFailedScriptSource,
    extractionRuntimeVerifierSource,
    processingProvenanceGaps,
    staleLlmCalls,
  ] = await Promise.all([
    readText('lib/foundation-db.js'),
    readText('lib/foundation-source-crawl-store.js'),
    readText('lib/foundation-llm-runtime-store.js'),
    readText('lib/foundation-runtime-job-store.js'),
    readText('scripts/foundation-worker.mjs'),
    readText('lib/foundation-jobs.js'),
    readText('scripts/run-extraction-target.mjs'),
    readText('scripts/inventory-video-links.mjs'),
    readText('docs/rebuild/current-plan.md'),
    readText('docs/rebuild/current-state.md'),
    readText('scripts/seed-extraction-control.mjs'),
    readText('lib/google-delegated.js'),
    readText('scripts/extract-drive-content.mjs'),
    readText('package.json'),
    readText('scripts/inventory-drive-linked-files.mjs'),
    readText('lib/shared-candidate-extraction.js'),
    readText(CRAWL_RUN_LEDGER_SCRIPT_PATH),
    readText('lib/extract-retire.js'),
    readText(EXTRACT_RETIRE_SCRIPT_PATH),
    readText(EXTRACT_RETIRE_PLAN_PATH),
    readText('lib/extract-retry.js'),
    readText(EXTRACT_RETRY_SCRIPT_PATH),
    readText(EXTRACT_RETRY_PLAN_PATH),
    readText('lib/extraction-run-hardening.js'),
    readText('lib/extraction-run-hardening-execution.js'),
    readText('scripts/sync-meeting-notes-archive.mjs'),
    readText('scripts/retry-extraction-failed-items.mjs'),
    readText('lib/foundation-extraction-runtime-verifier.js'),
    getSharedCommunicationProcessingProvenanceGaps({
      since: '2026-04-24T17:14:00-04:00',
      limit: 10,
    }),
    getStaleLlmCalls({ olderThanSeconds: 240, graceSeconds: 60, limit: 10 }),
  ])

  return {
    foundationDbSource,
    sourceCrawlStoreSource,
    llmRuntimeStoreSource,
    runtimeJobStoreSource,
    foundationWorkerSource,
    foundationJobsSource,
    extractionTargetSource,
    videoInventorySource,
    currentPlan,
    currentState,
    extractionControlSeedSource,
    googleDelegatedSource,
    driveContentExtractionSource,
    packageSource,
    driveLinkInventorySource,
    sharedCandidateExtractionSource,
    crawlRunLedgerScriptSource,
    extractRetireModuleSource,
    extractRetireScriptSource,
    extractRetirePlanSource,
    extractRetryModuleSource,
    extractRetryScriptSource,
    extractRetryPlanSource,
    extractRunHardeningSource,
    extractRunHardeningExecutionSource,
    meetingNotesSyncSource,
    extractionRetryFailedScriptSource,
    extractionRuntimeVerifierSource,
    processingProvenanceGaps,
    staleLlmCalls,
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
    input,
    foundationVerifySource,
    moduleSource,
    proofScriptSource,
    planSource,
    packageSource,
    currentState,
  ] = await Promise.all([
    validatePlanApprovalFile({
      approvalRef: VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_APPROVAL_PATH,
      cardId: VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_CARD_ID,
    }),
    getBacklogItemsByIds([VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_CARD_ID, CRAWL_RUN_LEDGER_CARD_ID, EXTRACT_RETIRE_CARD_ID, EXTRACT_RETRY_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_CARD_ID]),
    loadEvaluationInput(),
    readText('scripts/foundation-verify.mjs'),
    readText('lib/foundation-extraction-runtime-verifier.js'),
    readText(VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_SCRIPT_PATH),
    readText(VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_PLAN_PATH),
    readText('package.json'),
    readText('docs/rebuild/current-state.md'),
  ])
  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_CARD_ID) || null
  const liveEvaluation = evaluateFoundationExtractionRuntimeVerifier({
    ...input,
    foundationHub: { backlogItems: cards },
    foundationBuildCloseouts: getFoundationBuildCloseouts(),
  })
  const dogfood = buildFoundationExtractionRuntimeVerifierDogfoodProof()
  const closeout = getFoundationBuildCloseouts().find(item => item.key === VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_CLOSEOUT_KEY) || null
  const foundationVerifyLines = lineCount(foundationVerifySource)

  const oldInlinePatterns = [
    new RegExp("ensure\\(\\s*checks,[\\s\\S]{0,1200}'Foundation worker catches job failures and reaps stale active runs/calls'"),
    new RegExp("ensure\\(\\s*checks,[\\s\\S]{0,1200}'llm_calls has no timeout-expired planned/started calls'"),
  ]

  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog has extraction-runtime verifier split card in executing or done', card ? `${card.lane} / ${card.priority}` : 'missing card')
  addCheck(checks, approval.ok === true && approval.mode === 'v2' && Number(approval.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approval.ok ? `${approval.mode} / ${approval.approval?.score}` : approval.failures?.map(item => item.detail).join('; '))
  addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8), 'Plan Critic pass row exists', `${planCriticRuns.length} run(s)`)
  addCheck(
    checks,
    activeSprint?.sprint?.sprintId === VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_SPRINT_ID ||
      card?.lane === 'done',
    'Current Sprint points to this card while active or card is historically done',
    activeSprint?.sprint?.sprintId || 'missing active sprint',
  )
  for (const check of liveEvaluation.checks) addCheck(checks, check.ok, check.check, check.detail)
  addCheck(
    checks,
    dogfood.ok === true &&
      dogfood.rejected.missingWorkerReaper.ok === false &&
      dogfood.rejected.missingCorpusQuota.ok === false &&
      dogfood.rejected.missingDriveExtractionSupport.ok === false &&
      dogfood.rejected.missingLlmProvenance.ok === false &&
      dogfood.rejected.missingExtractRetry.ok === false,
    'dogfood rejects extraction-runtime verifier failures',
    dogfood.dogfoodInvariant,
  )
  addCheck(
    checks,
    scriptIsReadOnly(proofScriptSource),
    'focused proof script is read-only',
    'no DB write helpers, SQL mutation statements, or fs write calls',
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:verifier-extraction-runtime-split-module-check'] === `node --env-file-if-exists=.env ${VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_SCRIPT_PATH}`,
    'package script is registered',
    packageJson.scripts?.['process:verifier-extraction-runtime-split-module-check'] || 'missing',
  )
  addCheck(
    checks,
    await repoFileExists(VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_PLAN_PATH) &&
      await repoFileExists(VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_APPROVAL_PATH),
    'plan and approval files exist',
    `${VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_PLAN_PATH} / ${VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_APPROVAL_PATH}`,
  )
  addCheck(
    checks,
    foundationVerifyLines < VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_BEFORE_LINES,
    'root verifier line count decreased',
    `${VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_BEFORE_LINES}->${foundationVerifyLines}`,
  )
  addCheck(
    checks,
    moduleSource.includes('evaluateFoundationExtractionRuntimeVerifier') &&
      moduleSource.includes('buildFoundationExtractionRuntimeVerifierDogfoodProof') &&
      proofScriptSource.includes('dogfood rejects extraction-runtime verifier failures'),
    'module and proof script own the extracted behavior',
    `moduleLines=${lineCount(moduleSource)} proofLines=${lineCount(proofScriptSource)}`,
  )
  addCheck(
    checks,
    foundationVerifySource.includes('evaluateFoundationExtractionRuntimeVerifier({') &&
      foundationVerifySource.includes('extractionRuntimeVerifier.checks') &&
      oldInlinePatterns.every(pattern => !pattern.test(foundationVerifySource)),
    'root verifier delegates extraction-runtime rows instead of keeping old inline predicates',
    'delegation present and old inline bookend labels absent',
  )
  addCheck(
    checks,
    !card || card.lane !== 'done' || (
      String(card.statusNote || '').includes(VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_CLOSEOUT_KEY) &&
      closeout?.operatorCloseout === true &&
      (closeout.backlogIds || []).includes(VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_CARD_ID) &&
      await repoFileExists('docs/handoffs/2026-05-16-verifier-extraction-runtime-split-module-closeout.md') &&
      currentState.includes(VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_CLOSEOUT_KEY)
    ),
    'done closeout is exact when card is closed',
    card?.lane === 'done' ? (closeout?.key || 'missing closeout') : 'not closed yet',
  )
  addCheck(checks, planSource.includes('Gate decision tree') && planSource.includes('Dogfood proof recreates'), 'plan documents gate decision and dogfood proof', 'plan has required proof posture')

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    cardId: VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_CARD_ID,
    closeoutKey: VERIFIER_EXTRACTION_RUNTIME_SPLIT_MODULE_CLOSEOUT_KEY,
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
      foundationVerifyLines,
      liveChecks: liveEvaluation.summary,
    },
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Verifier extraction-runtime split module proof: ${result.summary.passed}/${result.summary.total}`)
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
