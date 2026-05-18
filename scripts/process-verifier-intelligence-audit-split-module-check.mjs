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
} from '../lib/foundation-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_APPROVAL_PATH,
  VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_BEFORE_LINES,
  VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_CARD_ID,
  VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_CLOSEOUT_KEY,
  VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_SPRINT_ID,
  buildFoundationIntelligenceAuditVerifierDogfoodProof,
  evaluateFoundationIntelligenceAuditVerifier,
} from '../lib/foundation-intelligence-audit-verifier.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    baseUrl: (argv.find(arg => arg.startsWith('--baseUrl=')) || '').split('=')[1] || process.env.FOUNDATION_VERIFY_BASE_URL || 'http://localhost:3000',
  }
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readText(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readTextIfExists(relativePath) {
  try {
    return await readText(relativePath)
  } catch (error) {
    if (error?.code === 'ENOENT') return ''
    throw error
  }
}

async function repoFileExists(relativePath) {
  try {
    const stat = await fs.stat(path.join(repoRoot, relativePath))
    return stat.isFile()
  } catch {
    return false
  }
}

async function fetchJson(baseUrl, pathname) {
  const response = await fetch(new URL(pathname, baseUrl))
  if (!response.ok) throw new Error(`GET ${pathname} failed: ${response.status}`)
  return response.json()
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

async function loadEvaluationInput({ baseUrl }) {
  const [
    foundationHub,
    foundationHubSummary,
    foundationVerifySource,
    moduleSource,
    proofScriptSource,
    planSource,
    packageSource,
    currentPlan,
    currentState,
    sourceRegistry,
    foundationBuildIntelRoutesSource,
    securityAccessSource,
    foundationJobsSource,
    moduleAssuranceSource,
  ] = await Promise.all([
    fetchJson(baseUrl, '/api/foundation-hub?detail=full'),
    fetchJson(baseUrl, '/api/foundation-hub'),
    readText('scripts/foundation-verify.mjs'),
    readText('lib/foundation-intelligence-audit-verifier.js'),
    readText(VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_SCRIPT_PATH),
    readText(VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_PLAN_PATH),
    readText('package.json'),
    readText('docs/rebuild/current-plan.md'),
    readText('docs/rebuild/current-state.md'),
    readText('docs/source-registry.md'),
    readTextIfExists('lib/foundation-build-intel-routes.js'),
    readTextIfExists('lib/security-access.js'),
    readText('lib/foundation-jobs.js'),
    readText('lib/foundation-verifier-module-assurance.js'),
  ])
  const packageJson = JSON.parse(packageSource)
  return {
    repoRoot,
    foundationHub,
    foundationHubSummary,
    foundationBuildCloseouts: getFoundationBuildCloseouts(),
    foundationBuildLog: foundationHub.buildLog || {},
    packageJson,
    currentPlan,
    currentState,
    sourceRegistry,
    foundationBuildIntelRoutesSource,
    securityAccessSource,
    foundationJobsSource,
    moduleAssuranceSource,
    foundationVerifySource,
    moduleSource,
    proofScriptSource,
    planSource,
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
  ] = await Promise.all([
    validatePlanApprovalFile({
      approvalRef: VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_APPROVAL_PATH,
      cardId: VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_CARD_ID,
    }),
    getBacklogItemsByIds([VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_CARD_ID]),
    loadEvaluationInput({ baseUrl: args.baseUrl }),
  ])

  const card = cards.find(item => item.id === VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_CARD_ID) || null
  const liveEvaluation = await evaluateFoundationIntelligenceAuditVerifier(input)
  const dogfood = await buildFoundationIntelligenceAuditVerifierDogfoodProof()
  const foundationVerifyLines = lineCount(input.foundationVerifySource)
  const moduleLines = lineCount(input.moduleSource)
  const proofScriptLines = lineCount(input.proofScriptSource)
  const closeout = input.foundationBuildCloseouts.find(item => item.key === VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_CLOSEOUT_KEY) || null

  addCheck(
    checks,
    card && ['executing', 'done'].includes(card.lane),
    'live backlog has verifier intelligence/audit split card in executing or done',
    card ? `${card.lane} / ${card.priority}` : 'missing card',
  )
  addCheck(
    checks,
    approval.ok === true && approval.mode === 'v2' && Number(approval.approval?.score) >= 9.8,
    'Plan approval validates at 9.8+',
    approval.ok ? `${approval.mode} / ${approval.approval?.score}` : approval.error,
  )
  addCheck(
    checks,
    planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8),
    'Plan Critic pass row exists',
    `${planCriticRuns.length} run(s)`,
  )
  addCheck(
    checks,
    activeSprint?.sprint?.sprintId === VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_SPRINT_ID ||
      card?.lane === 'done',
    'Current Sprint points to this card while active or card is historically done',
    activeSprint?.sprint?.sprintId || 'missing active sprint',
  )
  for (const check of liveEvaluation.checks) {
    addCheck(checks, check.ok, check.check, check.detail)
  }
  addCheck(
    checks,
    dogfood.ok === true &&
      dogfood.rejectedCases.implementationMutation &&
      dogfood.rejectedCases.buildIntelPaidAuth &&
      dogfood.rejectedCases.gstackImport &&
      dogfood.rejectedCases.auditAutoFix &&
      dogfood.rejectedCases.nightlyWrite,
    'dogfood rejects intelligence/audit verifier failures',
    JSON.stringify(dogfood.rejectedCases),
  )
  addCheck(
    checks,
    scriptIsReadOnly(input.proofScriptSource),
    'focused proof script is read-only',
    `script lines=${proofScriptLines}`,
  )
  addCheck(
    checks,
    moduleLines > 100 &&
      input.moduleSource.includes('evaluateFoundationIntelligenceAuditVerifier') &&
      input.moduleSource.includes('buildFoundationIntelligenceAuditVerifierDogfoodProof') &&
      `${input.foundationVerifySource}\n${input.moduleAssuranceSource}`.includes('evaluateFoundationIntelligenceAuditVerifier({') &&
      `${input.foundationVerifySource}\n${input.moduleAssuranceSource}`.includes('intelligenceAuditVerifier.checks'),
    'root verifier delegates intelligence/audit checks to focused module',
    `moduleLines=${moduleLines}`,
  )
  addCheck(
    checks,
    input.packageJson.scripts?.['process:verifier-intelligence-audit-split-module-check'] === `node --env-file-if-exists=.env ${VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_SCRIPT_PATH}`,
    'package script is registered',
    input.packageJson.scripts?.['process:verifier-intelligence-audit-split-module-check'] || 'missing',
  )
  addCheck(
    checks,
    await repoFileExists(VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_PLAN_PATH) &&
      await repoFileExists(VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_APPROVAL_PATH),
    'plan and approval files exist',
    `${VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_PLAN_PATH} / ${VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_APPROVAL_PATH}`,
  )
  addCheck(
    checks,
    foundationVerifyLines < VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_BEFORE_LINES,
    'scripts/foundation-verify.mjs line count decreased',
    `${VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_BEFORE_LINES}->${foundationVerifyLines}`,
  )
  addCheck(
    checks,
    !closeout || (
      closeout.operatorCloseout === true &&
      (closeout.backlogIds || []).includes(VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_CARD_ID)
    ),
    'closeout is exact when present',
    closeout ? `${closeout.key} / ${(closeout.backlogIds || []).join(',')}` : 'pending closeout',
  )

  const failed = checks.filter(check => !check.ok)
  const summary = {
    status: failed.length ? 'fail' : 'pass',
    checks: checks.length,
    failed: failed.length,
    dogfood,
    liveEvaluation: liveEvaluation.summary,
    foundationVerifyLines,
  }
  if (args.json) {
    console.log(JSON.stringify({ summary, checks }, null, 2))
  } else {
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` - ${check.detail}` : ''}`)
    }
    console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  }
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
