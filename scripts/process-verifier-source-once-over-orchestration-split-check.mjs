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
  VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_APPROVAL_PATH,
  VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_BEFORE_LINES,
  VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_CARD_ID,
  VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_CLOSEOUT_KEY,
  VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_HANDOFF_PATH,
  VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_PLAN_PATH,
  VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_SCRIPT_PATH,
  buildFoundationVerifierSourceOnceOverOrchestrationDogfoodProof,
  buildFoundationVerifierSourceOnceOverProgressionDogfoodProof,
} from '../lib/foundation-verifier-source-once-over-progression.js'

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

async function main() {
  const args = parseArgs()
  const jsonOnly = args.json === true || args.json === 'true'
  const checks = []
  const [
    approvalValidation,
    cards,
    activeSprint,
    planCriticRuns,
    moduleSource,
    verifierSource,
    proofScriptSource,
    historicalProofScriptSource,
    planSource,
    packageSource,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_APPROVAL_PATH,
      cardId: VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_CARD_ID,
    }),
    getBacklogItemsByIds([VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_CARD_ID]),
    readRepoFile('lib/foundation-verifier-source-once-over-progression.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile(VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_SCRIPT_PATH),
    readRepoFile('scripts/process-verifier-source-once-over-progression-split-check.mjs'),
    readRepoFile(VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_PLAN_PATH),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts()
    .find(record => record.key === VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_CLOSEOUT_KEY) || null
  const sourceOnceOverDogfood = buildFoundationVerifierSourceOnceOverProgressionDogfoodProof()
  const orchestrationDogfood = buildFoundationVerifierSourceOnceOverOrchestrationDogfoodProof()
  const verifierLines = lineCount(verifierSource)
  const hasPlanCriticPass = planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8)
  const closeoutOwnsCard = closeout?.operatorCloseout === true &&
    (closeout.backlogIds || []).includes(VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_CARD_ID)
  const requiredBundles = [
    'autoDeployRollbackBundle',
    'avatarImportBundle',
    'brandStackBundle',
    'decisionRestrictedQueueBundle',
    'foundationUiCompleteBundle',
    'marketingSourceMapBundle',
    'perUserChangelogBundle',
    'sourceCoverageCloseoutBundle',
    'sourceExtractionCoverageBundle',
    'sourceMaturityGridBundle',
    'strategyHubMeetingReadyBundle',
    'tierBehavioralCompletionBundle',
    'verificationRunsBundle',
  ]
  const wrapperDelegation = verifierSource.includes('evaluateFoundationVerifierSourceOnceOverProgressionOrchestration({') &&
    verifierSource.includes('sourceOnceOverProgressionVerifier.checks')

  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog has Source Once-Over orchestration split card in executing or done', card ? `${card.lane} / ${card.priority}` : 'missing card')
  addCheck(checks, approvalValidation.ok === true && approvalValidation.mode === 'v2' && Number(approvalValidation.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approvalValidation.ok ? `${approvalValidation.mode} / ${approvalValidation.approval?.score}` : approvalValidation.failures?.map(item => item.detail).join('; '))
  addCheck(checks, hasPlanCriticPass || closeoutOwnsCard, 'Plan Critic pass or historical closeout exists', hasPlanCriticPass ? 'plan_critic_runs pass row present' : closeout?.key || 'missing')
  addCheck(
    checks,
    activeSprint?.sprint?.sprintId !== 'verifier-source-once-over-orchestration-split-2026-05-17' || card?.lane === 'done',
    'active sprint overlay was not replaced for this historical split',
    activeSprint?.sprint?.sprintId || 'missing active sprint',
  )
  addCheck(
    checks,
    sourceOnceOverDogfood.ok === true &&
      sourceOnceOverDogfood.rejected.hiddenStrategyMeeting.ok === false &&
      sourceOnceOverDogfood.rejected.hiddenAvatarImport.ok === false &&
      sourceOnceOverDogfood.rejected.hiddenSourceCoverage.ok === false &&
      sourceOnceOverDogfood.rejected.hiddenMarketingBrand.ok === false &&
      sourceOnceOverDogfood.rejected.hiddenVerificationDecision.ok === false &&
      sourceOnceOverDogfood.rejected.hiddenFoundationUiComplete.ok === false,
    'Source Once-Over progression dogfood rejects real failure classes',
    sourceOnceOverDogfood.dogfoodInvariant,
  )
  addCheck(
    checks,
    orchestrationDogfood.ok === true &&
      orchestrationDogfood.rejected.missingWrapper.ok === false &&
      orchestrationDogfood.rejected.missingBundleInput.ok === false &&
      orchestrationDogfood.rejected.oldDirectRootCall.ok === false &&
      orchestrationDogfood.rejected.missingCloseout.ok === false &&
      orchestrationDogfood.rejected.missingProofRegistration.ok === false &&
      orchestrationDogfood.rejected.noLineDrop.ok === false,
    'orchestration dogfood rejects bundle migration failures',
    orchestrationDogfood.dogfoodInvariant,
  )
  addCheck(checks, moduleSource.includes('evaluateFoundationVerifierSourceOnceOverProgressionOrchestration') && moduleSource.includes('flattenSourceOnceOverBundles'), 'module owns bundled Source Once-Over orchestration wrapper', 'lib/foundation-verifier-source-once-over-progression.js')
  addCheck(checks, wrapperDelegation && !verifierSource.includes('evaluateFoundationVerifierSourceOnceOverProgression({'), 'root delegates Source Once-Over through the orchestration wrapper', wrapperDelegation ? 'wrapper delegation present and old direct evaluator absent' : 'missing wrapper delegation')
  addCheck(checks, requiredBundles.every(key => verifierSource.includes(`${key}:`)), 'root passes Source Once-Over domain bundles instead of flat per-card inputs', requiredBundles.join(', '))
  addCheck(checks, verifierLines < VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_BEFORE_LINES, 'root verifier line count decreased', `${VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_BEFORE_LINES}->${verifierLines}`)
  addCheck(checks, scriptIsReadOnly(proofScriptSource), 'focused proof script is read-only', 'no DB write helpers, SQL mutation statements, or fs write calls')
  addCheck(
    checks,
    packageJson.scripts?.['process:verifier-source-once-over-orchestration-split-check'] ===
      `node --env-file-if-exists=.env ${VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_SCRIPT_PATH}`,
    'package script is registered',
    packageJson.scripts?.['process:verifier-source-once-over-orchestration-split-check'] || 'missing',
  )
  addCheck(
    checks,
    await repoFileExists(VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_PLAN_PATH) &&
      await repoFileExists(VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_APPROVAL_PATH) &&
      await repoFileExists(VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_HANDOFF_PATH),
    'plan, approval, and handoff files exist',
    `${VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_PLAN_PATH} / ${VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_APPROVAL_PATH} / ${VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_HANDOFF_PATH}`,
  )
  addCheck(checks, planSource.includes('Dogfood proof recreates the failure class') && planSource.includes('No active sprint overlay replacement') && planSource.includes('No arbitrary tail extraction') && planSource.includes('bundled domain inputs'), 'plan records dogfood, no-overlay, and bundled-domain acceptance', VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_PLAN_PATH)
  addCheck(checks, historicalProofScriptSource.includes('historical Source Once-Over split proof accepts wrapper delegation') && historicalProofScriptSource.includes('evaluateFoundationVerifierSourceOnceOverProgressionOrchestration({'), 'historical Source Once-Over module proof accepts wrapper delegation', 'scripts/process-verifier-source-once-over-progression-split-check.mjs')

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_CARD_ID,
    closeoutKey: VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_CLOSEOUT_KEY,
    lineCounts: {
      before: VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_BEFORE_LINES,
      after: verifierLines,
      delta: verifierLines - VERIFIER_SOURCE_ONCE_OVER_ORCHESTRATION_SPLIT_BEFORE_LINES,
    },
    checks,
  }

  if (jsonOnly) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Verifier Source Once-Over orchestration split proof')
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
