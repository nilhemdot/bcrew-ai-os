#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import process from 'node:process'
import { promisify } from 'node:util'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  EXTRACT_RUN_HARDENING_EXECUTION_APPROVAL_PATH,
  EXTRACT_RUN_HARDENING_EXECUTION_CARD_ID,
  EXTRACT_RUN_HARDENING_EXECUTION_CLOSEOUT_KEY,
  EXTRACT_RUN_HARDENING_EXECUTION_PLAN_PATH,
  EXTRACT_RUN_HARDENING_EXECUTION_SCRIPT_PATH,
  EXTRACTION_RETRY_FAILED_JOB_KEY,
  EXTRACTION_RETRY_FAILED_SCRIPT_PATH,
  buildSyntheticExtractionRetryExecutionProof,
} from '../lib/extraction-run-hardening-execution.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getExtractionControlSnapshot,
  initFoundationDb,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-db.js'

const execFile = promisify(execFileCallback)
const SPRINT_ID = 'source-truth-guardrails-2026-05-13'
const NEXT_CARD_ID = 'RESEARCH-LANE-PURGE-001'

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

function addFinding(findings, ok, check, detail = '') {
  if (!ok) findings.push({ check, detail })
}

async function runRetryDryRun() {
  const { stdout } = await execFile('npm', [
    'run',
    'extraction:retry-failed',
    '--',
    '--target=meetings-current-day',
    '--dryRun=true',
    '--json=true',
  ], {
    cwd: process.cwd(),
    env: process.env,
    maxBuffer: 1024 * 1024 * 4,
  })
  const start = stdout.indexOf('{')
  return JSON.parse(start >= 0 ? stdout.slice(start) : stdout)
}

async function closeSprintCard(snapshot, dryRunSummary) {
  await updateBacklogItem(EXTRACT_RUN_HARDENING_EXECUTION_CARD_ID, {
    lane: 'done',
    nextAction: 'Done for v1. Build RESEARCH-LANE-PURGE-001 next in the Source Truth Guardrails sprint. Do not broaden extraction or start product work.',
    statusNote: [
      `Closed on 2026-05-13 under \`${EXTRACT_RUN_HARDENING_EXECUTION_CLOSEOUT_KEY}\`.`,
      'V1 adds a central failed-item retry executor, a manual Foundation recovery job, and proof that eligible failed crawl items move through bounded retry success, retry exhaustion, or untouched waiting/blocked states.',
      `Live dry-run target meetings-current-day found eligibleItemCount=${dryRunSummary.eligibleItemCount || 0}; extraction control reports retryEligibleItems=${snapshot.summary?.retryEligibleItems || 0}, retryWaitingItems=${snapshot.summary?.retryWaitingItems || 0}, retryExhaustedItems=${snapshot.summary?.retryExhaustedItems || 0}, retryBlockedItems=${snapshot.summary?.retryBlockedItems || 0}.`,
      'Proof: `npm run process:extract-run-hardening-execution-check -- --json` validates the synthetic retry execution path and a live no-write dry run.',
      'This does not run broad corpus ingestion, add connectors, repair credentials, mutate Drive permissions, send request-access emails, or build product UI.',
    ].join(' '),
  }, 'codex')

  const current = await getActiveFoundationCurrentSprint()
  const sprint = current.sprint
  await upsertFoundationCurrentSprintOverlay({
    sprint: {
      sprintId: SPRINT_ID,
      status: 'active',
      goal: sprint.goal,
      activeBlockerCardId: NEXT_CARD_ID,
      metadata: {
        ...sprint.metadata,
        currentStatus: 'extract_retry_execution_done_building_research_purge',
        nextAction: 'Build RESEARCH-LANE-PURGE-001 next. Stop at sprint review after the purge report closes.',
      },
    },
    items: current.items.map(item => ({
      cardId: item.backlogId,
      order: item.order,
      stage: item.backlogId === EXTRACT_RUN_HARDENING_EXECUTION_CARD_ID
        ? 'done_this_sprint'
        : item.backlogId === NEXT_CARD_ID
          ? 'building_now'
          : item.stage,
      planRef: item.planRef,
      definitionOfDone: item.definitionOfDone,
      proofCommands: item.proofCommands,
      readinessBlockerCleared: item.readinessBlockerCleared,
      notNextBoundaries: item.notNextBoundaries,
      existingWorkCheck: item.existingWorkCheck,
      metadata: item.metadata,
    })),
  }, 'codex')
}

async function main() {
  const args = parseArgs()
  const jsonMode = boolArg(args.json)
  const skipClose = boolArg(args.skipClose) || boolArg(args['skip-close'])
  const findings = []

  await initFoundationDb()
  try {
    const [
      approvalValidation,
      syntheticProof,
      extractionSnapshot,
      retryDryRun,
      backlogCards,
      packageSource,
      helperSource,
      retryScriptSource,
      foundationJobsSource,
      verifySource,
    ] = await Promise.all([
      validatePlanApprovalFile({
        repoRoot: process.cwd(),
        approvalRef: EXTRACT_RUN_HARDENING_EXECUTION_APPROVAL_PATH,
        cardId: EXTRACT_RUN_HARDENING_EXECUTION_CARD_ID,
      }),
      buildSyntheticExtractionRetryExecutionProof(),
      getExtractionControlSnapshot({ limit: 200 }),
      runRetryDryRun(),
      getBacklogItemsByIds([EXTRACT_RUN_HARDENING_EXECUTION_CARD_ID, NEXT_CARD_ID]),
      fs.readFile('package.json', 'utf8'),
      fs.readFile('lib/extraction-run-hardening-execution.js', 'utf8'),
      fs.readFile(EXTRACTION_RETRY_FAILED_SCRIPT_PATH, 'utf8'),
      fs.readFile('lib/foundation-jobs.js', 'utf8'),
      fs.readFile('scripts/foundation-verify.mjs', 'utf8'),
    ])
    const card = backlogCards.find(item => item.id === EXTRACT_RUN_HARDENING_EXECUTION_CARD_ID)
    const retryJob = (extractionSnapshot.jobs || []).find?.(job => job.key === EXTRACTION_RETRY_FAILED_JOB_KEY) || null

    addFinding(findings, approvalValidation.ok && approvalValidation.mode === 'v2' && approvalValidation.approval?.approvedPlanRef === EXTRACT_RUN_HARDENING_EXECUTION_PLAN_PATH, 'Plan Critic approval file is valid at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || '')
    addFinding(findings, syntheticProof.ok, 'synthetic retry execution covers success, exhaustion, waiting untouched, and blocked untouched', JSON.stringify(syntheticProof.selectedKeys || []))
    addFinding(findings, retryDryRun.status === 'healthy' && retryDryRun.supported === true && retryDryRun.dryRun === true, 'live retry executor dry-run is healthy and no-write', JSON.stringify(retryDryRun))
    addFinding(findings, String(retryDryRun.command || '').includes('--retryFailed=true') || (retryDryRun.command || []).includes('--retryFailed=true'), 'dry-run command is target-specific failed-item retry', JSON.stringify(retryDryRun.command || []))
    addFinding(findings, packageSource.includes('"extraction:retry-failed"') && packageSource.includes('"process:extract-run-hardening-execution-check"'), 'package scripts expose retry executor and focused proof')
    addFinding(findings, helperSource.includes('selectEligibleExtractionRetryItems') && helperSource.includes('finishExtractionRetryItem') && helperSource.includes('source_crawl_item_attempts'), 'helper owns bounded selection and attempt proof')
    addFinding(findings, retryScriptSource.includes('classifySourceCrawlItemRetries') && retryScriptSource.includes('getRetryableSourceCrawlItems') && retryScriptSource.includes('dryRun'), 'retry CLI reads live retry state and supports no-write proof')
    addFinding(findings, foundationJobsSource.includes(EXTRACTION_RETRY_FAILED_JOB_KEY) && foundationJobsSource.includes("runtimeMode: 'manual'"), 'Foundation job registry has manual retry recovery job')
    addFinding(findings, verifySource.includes(EXTRACT_RUN_HARDENING_EXECUTION_CARD_ID), 'foundation verifier covers this card')
    addFinding(findings, card?.lane === 'scoped' || card?.lane === 'done', 'backlog card is scoped or done before close', card?.lane || 'missing')
    addFinding(findings, !retryJob || retryJob.runtimeMode === 'manual', 'retry job is manual unless separately scheduled', retryJob?.runtimeMode || 'not in extraction snapshot')

    const summary = {
      status: findings.length ? 'blocked' : 'healthy',
      cardId: EXTRACT_RUN_HARDENING_EXECUTION_CARD_ID,
      closeoutKey: EXTRACT_RUN_HARDENING_EXECUTION_CLOSEOUT_KEY,
      planRef: EXTRACT_RUN_HARDENING_EXECUTION_PLAN_PATH,
      scriptRef: EXTRACT_RUN_HARDENING_EXECUTION_SCRIPT_PATH,
      synthetic: {
        ok: syntheticProof.ok,
        selectedKeys: syntheticProof.selectedKeys,
        successState: syntheticProof.success?.retryState,
        exhaustedState: syntheticProof.exhausted?.retryState,
        waitingUntouched: syntheticProof.waitingUntouched,
        blockedUntouched: syntheticProof.blockedUntouched,
      },
      liveDryRun: retryDryRun,
      retrySummary: {
        retryEligibleItems: Number(extractionSnapshot.summary?.retryEligibleItems || 0),
        retryWaitingItems: Number(extractionSnapshot.summary?.retryWaitingItems || 0),
        retryExhaustedItems: Number(extractionSnapshot.summary?.retryExhaustedItems || 0),
        retryBlockedItems: Number(extractionSnapshot.summary?.retryBlockedItems || 0),
      },
      findings,
    }

    if (summary.status === 'healthy' && !skipClose) await closeSprintCard(extractionSnapshot, retryDryRun)

    if (jsonMode) console.log(JSON.stringify(summary, null, 2))
    else {
      console.log('Extract run hardening execution proof')
      console.log(`  Card: ${EXTRACT_RUN_HARDENING_EXECUTION_CARD_ID}`)
      console.log(`  Status: ${summary.status}`)
      console.log(`  Dry-run eligible items: ${retryDryRun.eligibleItemCount}`)
      for (const finding of findings) console.log(`  BLOCKED ${finding.check}: ${finding.detail}`)
    }
    if (summary.status !== 'healthy') process.exitCode = 1
  } finally {
    await closeFoundationDb()
  }
}

main().catch(async error => {
  try { await closeFoundationDb() } catch {}
  if (process.argv.includes('--json') || process.argv.includes('--json=true')) {
    console.log(JSON.stringify({
      status: 'error',
      cardId: EXTRACT_RUN_HARDENING_EXECUTION_CARD_ID,
      error: error instanceof Error ? error.message : String(error),
    }, null, 2))
  } else {
    console.error(error instanceof Error ? error.stack || error.message : String(error))
  }
  process.exitCode = 1
})
