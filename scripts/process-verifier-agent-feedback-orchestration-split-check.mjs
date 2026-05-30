#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  AGENT_FEEDBACK_FORM_REPLAY_CHECK,
  AGENT_FEEDBACK_PRODUCTION_ENABLE_CHECK,
  VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_APPROVAL_PATH,
  VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_BEFORE_LINES,
  VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_CARD_ID,
  VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_CLOSEOUT_KEY,
  VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_HANDOFF_PATH,
  VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_PLAN_PATH,
  VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_SCRIPT_PATH,
  buildFoundationAgentFeedbackOrchestrationSplitDogfoodProof,
  buildFoundationAgentFeedbackVerifierDogfoodProof,
} from '../lib/foundation-agent-feedback-verifier.js'

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

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    approval,
    cards,
    activeSprint,
    planCriticRuns,
    foundationVerifySource,
    moduleSource,
    proofScriptSource,
    historicalProofScriptSource,
    planSource,
    packageSource,
    agentOnboardingStatusSource,
    agentFeedbackSendStatusSource,
    agentFeedbackAutoSendStatusSource,
    agentFeedbackResponseNotifyStatusSource,
    agentFeedbackReminderStatusSource,
    agentFeedbackCompanyEmailPolicyStatusSource,
    agentFeedbackProductionAutoSendStatusSource,
    foundationVerifyHealthRepairStatusSource,
  ] = await Promise.all([
    validatePlanApprovalFile({
      approvalRef: VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_APPROVAL_PATH,
      cardId: VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_CARD_ID,
    }),
    getBacklogItemsByIds([VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_CARD_ID]),
    readText('scripts/foundation-verify.mjs'),
    readText('lib/foundation-agent-feedback-verifier.js'),
    readText(VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_SCRIPT_PATH),
    readText('scripts/process-verifier-agent-feedback-split-module-check.mjs'),
    readText(VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_PLAN_PATH),
    readText('package.json'),
    readText('lib/agent-onboarding-feedback-system.js'),
    readText('lib/agent-feedback-send.js'),
    readText('lib/agent-feedback-auto-send.js'),
    readText('lib/agent-feedback-response-notify.js'),
    readText('lib/agent-feedback-reminders.js'),
    readText('lib/agent-feedback-company-email-policy.js'),
    readText('lib/agent-feedback-production-autosend-dry-run.js'),
    readText('lib/foundation-verify-health-repair.js'),
  ])
  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(item => item.key === VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_CLOSEOUT_KEY) || null
  const agentFeedbackDogfood = buildFoundationAgentFeedbackVerifierDogfoodProof()
  const orchestrationDogfood = buildFoundationAgentFeedbackOrchestrationSplitDogfoodProof()
  const foundationVerifyLines = lineCount(foundationVerifySource)
  const directRootPatterns = [
    'const agentFeedbackVerifier = evaluateFoundationAgentFeedbackVerifier({',
    'checks.push(...agentFeedbackVerifier.checks)',
    'function buildVerifierAgentFeedbackProof(',
    'const AGENT_FEEDBACK_SEND_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE',
  ]
  const wrapperRootDelegation = foundationVerifySource.includes('evaluateFoundationAgentFeedbackVerifierOrchestration({') &&
    foundationVerifySource.includes('agentFeedbackOrchestrationVerifier.checks')
  const hasPlanCriticPass = planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8)
  const closeoutOwnsCard = closeout?.operatorCloseout === true &&
    (closeout.backlogIds || []).includes(VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_CARD_ID)

  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog has Agent Feedback orchestration split card in executing or done', card ? `${card.lane} / ${card.priority}` : 'missing card')
  addCheck(checks, approval.ok === true && approval.mode === 'v2' && Number(approval.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approval.ok ? `${approval.mode} / ${approval.approval?.score}` : approval.failures?.map(item => item.detail).join('; '))
  addCheck(checks, hasPlanCriticPass || closeoutOwnsCard, 'Plan Critic pass or historical closeout exists', hasPlanCriticPass ? 'plan_critic_runs pass row present' : closeout?.key || 'missing')
  addCheck(
    checks,
    activeSprint?.sprint?.sprintId !== 'verifier-agent-feedback-orchestration-split-2026-05-17' || card?.lane === 'done',
    'active sprint overlay was not replaced for this historical split',
    activeSprint?.sprint?.sprintId || 'missing active sprint',
  )
  addCheck(
    checks,
    agentFeedbackDogfood.ok === true &&
      agentFeedbackDogfood.rejected.replayGap.ok === false &&
      agentFeedbackDogfood.rejected.dryRunWrites.ok === false &&
      agentFeedbackDogfood.rejected.autoSendUngated.ok === false &&
      agentFeedbackDogfood.rejected.personalEmailAllowed.ok === false &&
      agentFeedbackDogfood.rejected.privateProofLeak.ok === false,
    'Agent Feedback verifier dogfood rejects real failure classes',
    agentFeedbackDogfood.dogfoodInvariant,
  )
  addCheck(
    checks,
    orchestrationDogfood.ok === true &&
      orchestrationDogfood.rejected.missingWrapper.ok === false &&
      orchestrationDogfood.rejected.missingDelegation.ok === false &&
      orchestrationDogfood.rejected.oldDirectCall.ok === false &&
      orchestrationDogfood.rejected.missingCloseout.ok === false &&
      orchestrationDogfood.rejected.noLineDrop.ok === false &&
      orchestrationDogfood.rejected.rootOnlyStatusModules.ok === false,
    'orchestration split dogfood rejects migration failures',
    orchestrationDogfood.invariant,
  )
  addCheck(checks, scriptIsReadOnly(proofScriptSource), 'focused proof script is read-only', 'no DB write helpers, SQL mutation statements, or fs write calls')
  addCheck(
    checks,
    packageJson.scripts?.['process:verifier-agent-feedback-orchestration-split-check'] ===
      `node --env-file-if-exists=.env ${VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_SCRIPT_PATH}`,
    'package script is registered',
    packageJson.scripts?.['process:verifier-agent-feedback-orchestration-split-check'] || 'missing',
  )
  addCheck(
    checks,
    await repoFileExists(VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_PLAN_PATH) &&
      await repoFileExists(VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_APPROVAL_PATH) &&
      await repoFileExists(VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_HANDOFF_PATH),
    'plan, approval, and handoff files exist',
    `${VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_PLAN_PATH} / ${VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_APPROVAL_PATH} / ${VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_HANDOFF_PATH}`,
  )
  addCheck(
    checks,
    moduleSource.includes('evaluateFoundationAgentFeedbackVerifierOrchestration') &&
      moduleSource.includes('buildFoundationAgentFeedbackOrchestrationSplitDogfoodProof') &&
      moduleSource.includes('buildVerifierAgentFeedbackProof') &&
      moduleSource.includes(AGENT_FEEDBACK_FORM_REPLAY_CHECK) &&
      moduleSource.includes(AGENT_FEEDBACK_PRODUCTION_ENABLE_CHECK),
    'module owns Agent Feedback orchestration helpers and verifier domain',
    'wrapper, proof fixtures, evaluator, and dogfood live in lib/foundation-agent-feedback-verifier.js',
  )
  addCheck(
    checks,
    wrapperRootDelegation && directRootPatterns.every(pattern => !foundationVerifySource.includes(pattern)),
    'root verifier delegates Agent Feedback orchestration only',
    wrapperRootDelegation ? 'wrapper delegation present and old direct root patterns absent' : 'missing wrapper delegation',
  )
  addCheck(
    checks,
    foundationVerifyLines < VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_BEFORE_LINES,
    'root verifier line count decreased',
    `${VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_BEFORE_LINES}->${foundationVerifyLines}`,
  )
  addCheck(
    checks,
    planSource.includes('Dogfood proof recreates the failure class') &&
      planSource.includes('No active sprint overlay replacement') &&
      planSource.includes('No arbitrary tail extraction') &&
      planSource.includes('Agent Feedback'),
    'plan records dogfood, no-overlay, and domain-boundary acceptance',
    VERIFIER_AGENT_FEEDBACK_ORCHESTRATION_SPLIT_PLAN_PATH,
  )
  addCheck(
    checks,
    historicalProofScriptSource.includes('historical Agent Feedback split proof accepts wrapper delegation') &&
      historicalProofScriptSource.includes('evaluateFoundationAgentFeedbackVerifierOrchestration({'),
    'historical Agent Feedback module proof accepts wrapper delegation',
    'process-verifier-agent-feedback-split-module-check.mjs is wrapper-compatible',
  )
  const statusCoverageSources = [
    ['Agent Onboarding Feedback status', agentOnboardingStatusSource],
    ['Agent Feedback Send status', agentFeedbackSendStatusSource],
    ['Agent Feedback Auto-Send status', agentFeedbackAutoSendStatusSource],
    ['Agent Feedback Response Notify status', agentFeedbackResponseNotifyStatusSource],
    ['Agent Feedback Reminder status', agentFeedbackReminderStatusSource],
    ['Agent Feedback Company Email Policy status', agentFeedbackCompanyEmailPolicyStatusSource],
    ['Agent Feedback Production Auto-Send status', agentFeedbackProductionAutoSendStatusSource],
    ['Foundation Verify Health Repair status', foundationVerifyHealthRepairStatusSource],
  ]
  const rootOnlyStatusModules = statusCoverageSources
    .filter(([, source]) => !source.includes('lib/foundation-agent-feedback-verifier.js') || !source.includes('verifierCoverageSource'))
    .map(([label]) => label)
  addCheck(
    checks,
    rootOnlyStatusModules.length === 0,
    'Agent Feedback status modules accept verifier-module coverage source',
    rootOnlyStatusModules.length ? `root-only coverage: ${rootOnlyStatusModules.join(', ')}` : 'status modules read root verifier plus Agent Feedback verifier module',
  )

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    checks,
    summary: {
      total: checks.length,
      passed: checks.length - failures.length,
      failed: failures.length,
    },
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} - ${check.detail}`)
    }
  }

  await closeFoundationDb()
  if (failures.length) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error)
  process.exitCode = 1
})
