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
  PROCESS_TRUST_BACKLOG_HYGIENE_CHECK,
  PROCESS_TRUST_POST_SHIP_FANOUT_CHECK,
  VERIFIER_PROCESS_TRUST_SPLIT_MODULE_APPROVAL_PATH,
  VERIFIER_PROCESS_TRUST_SPLIT_MODULE_BEFORE_LINES,
  VERIFIER_PROCESS_TRUST_SPLIT_MODULE_CARD_ID,
  VERIFIER_PROCESS_TRUST_SPLIT_MODULE_CLOSEOUT_KEY,
  VERIFIER_PROCESS_TRUST_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_PROCESS_TRUST_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_PROCESS_TRUST_SPLIT_MODULE_SPRINT_ID,
  buildFoundationProcessTrustVerifierDogfoodProof,
} from '../lib/foundation-process-trust-verifier.js'

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

function escapeRegExp(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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
    planSource,
    packageSource,
    currentState,
  ] = await Promise.all([
    validatePlanApprovalFile({
      approvalRef: VERIFIER_PROCESS_TRUST_SPLIT_MODULE_APPROVAL_PATH,
      cardId: VERIFIER_PROCESS_TRUST_SPLIT_MODULE_CARD_ID,
    }),
    getBacklogItemsByIds([VERIFIER_PROCESS_TRUST_SPLIT_MODULE_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([VERIFIER_PROCESS_TRUST_SPLIT_MODULE_CARD_ID]),
    readText('scripts/foundation-verify.mjs'),
    readText('lib/foundation-process-trust-verifier.js'),
    readText(VERIFIER_PROCESS_TRUST_SPLIT_MODULE_SCRIPT_PATH),
    readText(VERIFIER_PROCESS_TRUST_SPLIT_MODULE_PLAN_PATH),
    readText('package.json'),
    readText('docs/rebuild/current-state.md'),
  ])
  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === VERIFIER_PROCESS_TRUST_SPLIT_MODULE_CARD_ID) || null
  const dogfood = buildFoundationProcessTrustVerifierDogfoodProof()
  const closeout = getFoundationBuildCloseouts().find(item => item.key === VERIFIER_PROCESS_TRUST_SPLIT_MODULE_CLOSEOUT_KEY) || null
  const foundationVerifyLines = lineCount(foundationVerifySource)
  const oldInlinePatterns = [
    new RegExp("ensure\\(\\s*checks,[\\s\\S]{0,1600}'" + escapeRegExp(PROCESS_TRUST_BACKLOG_HYGIENE_CHECK)),
    new RegExp("ensure\\(\\s*checks,[\\s\\S]{0,1800}'" + escapeRegExp(PROCESS_TRUST_POST_SHIP_FANOUT_CHECK)),
  ]

  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog has Process Trust verifier split card in executing or done', card ? `${card.lane} / ${card.priority}` : 'missing card')
  addCheck(checks, approval.ok === true && approval.mode === 'v2' && Number(approval.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approval.ok ? `${approval.mode} / ${approval.approval?.score}` : approval.failures?.map(item => item.detail).join('; '))
  addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8), 'Plan Critic pass row exists', `${planCriticRuns.length} run(s)`)
  addCheck(
    checks,
    activeSprint?.sprint?.sprintId === VERIFIER_PROCESS_TRUST_SPLIT_MODULE_SPRINT_ID ||
      card?.lane === 'done',
    'Current Sprint points to this card while active or card is historically done',
    activeSprint?.sprint?.sprintId || 'missing active sprint',
  )
  addCheck(
    checks,
    dogfood.ok === true &&
      dogfood.rejected.missingShipCheck.ok === false &&
      dogfood.rejected.missingFanout.ok === false &&
      dogfood.rejected.staleWorkerCode.ok === false &&
      dogfood.rejected.missingDoneCoverage.ok === false &&
      dogfood.rejected.missingArtifactGate.ok === false &&
      dogfood.rejected.missingPostShipFanout.ok === false,
    'old inline process trust verifier failures are rejected',
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
    packageJson.scripts?.['process:verifier-process-trust-split-module-check'] === `node --env-file-if-exists=.env ${VERIFIER_PROCESS_TRUST_SPLIT_MODULE_SCRIPT_PATH}`,
    'package script is registered',
    packageJson.scripts?.['process:verifier-process-trust-split-module-check'] || 'missing',
  )
  addCheck(
    checks,
    await repoFileExists(VERIFIER_PROCESS_TRUST_SPLIT_MODULE_PLAN_PATH) &&
      await repoFileExists(VERIFIER_PROCESS_TRUST_SPLIT_MODULE_APPROVAL_PATH),
    'plan and approval files exist',
    `${VERIFIER_PROCESS_TRUST_SPLIT_MODULE_PLAN_PATH} / ${VERIFIER_PROCESS_TRUST_SPLIT_MODULE_APPROVAL_PATH}`,
  )
  addCheck(
    checks,
    foundationVerifyLines < VERIFIER_PROCESS_TRUST_SPLIT_MODULE_BEFORE_LINES,
    'root verifier line count decreased',
    `${VERIFIER_PROCESS_TRUST_SPLIT_MODULE_BEFORE_LINES}->${foundationVerifyLines}`,
  )
  addCheck(
    checks,
    moduleSource.includes('evaluateFoundationProcessTrustVerifier') &&
      moduleSource.includes('buildFoundationProcessTrustVerifierDogfoodProof') &&
      moduleSource.includes(PROCESS_TRUST_BACKLOG_HYGIENE_CHECK) &&
      moduleSource.includes(PROCESS_TRUST_POST_SHIP_FANOUT_CHECK) &&
      moduleSource.includes(VERIFIER_PROCESS_TRUST_SPLIT_MODULE_CARD_ID),
    'module owns process trust verifier functions',
    'process trust evaluator, dogfood, and card constants live in module',
  )
  addCheck(
    checks,
    (foundationVerifySource.includes('evaluateFoundationProcessTrustVerifier({') ||
      foundationVerifySource.includes('evaluateFoundationProcessTrustVerifierOrchestration({')) &&
      (foundationVerifySource.includes('processTrustVerifier.checks') ||
        foundationVerifySource.includes('processTrustOrchestrationVerifier.checks')) &&
      moduleSource.includes('buildFoundationProcessTrustVerifierDogfoodProof') &&
      oldInlinePatterns.every(pattern => !pattern.test(foundationVerifySource)),
    'root verifier delegates process trust checks',
    'root imports the module or orchestration wrapper, pushes module checks, and no longer owns the old inline process-trust ensure blocks',
  )
  addCheck(
    checks,
    planSource.includes('Behavior proof, not substring proof') &&
      planSource.includes('Dogfood proof recreates the failure class') &&
      planSource.includes('process-trust') &&
      planSource.includes('post-ship fanout'),
    'plan records behavior-proof acceptance',
    'plan requires dogfood, read-only focused proof, and large-file split boundary',
  )
  if (closeout || card?.lane === 'done') {
    addCheck(
      checks,
      closeout?.operatorCloseout === true &&
        (closeout.backlogIds || []).includes(VERIFIER_PROCESS_TRUST_SPLIT_MODULE_CARD_ID) &&
        await repoFileExists('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-16-verifier-process-trust-split-module-closeout.md') &&
        currentState.includes(VERIFIER_PROCESS_TRUST_SPLIT_MODULE_CLOSEOUT_KEY),
      'closeout is registered when card is done',
      closeout ? closeout.key : 'missing closeout',
    )
  }

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
