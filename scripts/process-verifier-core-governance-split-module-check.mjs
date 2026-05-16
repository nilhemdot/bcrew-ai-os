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
  VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_APPROVAL_PATH,
  VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_BEFORE_LINES,
  VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_CARD_ID,
  VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_CLOSEOUT_KEY,
  VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_SPRINT_ID,
  buildFoundationCoreGovernanceVerifierDogfoodProof,
  evaluateFoundationCoreGovernanceVerifier,
} from '../lib/foundation-core-governance-verifier.js'
import {
  buildDbConstraintDogfoodProof,
} from '../lib/db-constraint-hardening.js'

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
    foundationVerifySource,
    moduleSource,
    proofScriptSource,
    planSource,
    packageSource,
    systemStrategy,
    currentPlan,
    currentState,
    agentsSource,
    foundationHtmlSource,
    strategicIntelSpecSource,
    foundationHardCheckpointSource,
    usersDoc,
    steveDoc,
    agentModelDoc,
    harlanDoc,
    crewbertDoc,
    personalAgentOnboardingDoc,
    ownersSourceNote,
    docsIndexSource,
    archiveIndexSource,
    docsReadmeSource,
    foundationDbSource,
    foundationDecisionStoreSource,
    foundationBacklogStoreSource,
    dbConstraintSource,
    serverSource,
    hubReadRoutesSource,
    fubSourceRoutesSource,
    foundationOperatorRoutesSource,
    foundationSourceRoutesSource,
    foundationBuildIntelRoutesSource,
    authRoutesSource,
    appPageRoutesSource,
    securityAccessSource,
    appAuthSource,
    loginHtmlSource,
    loginUiSource,
    foundationDataSource,
    foundationFrontendSource,
    strategyExportUiSource,
  ] = await Promise.all([
    fetchJson(baseUrl, '/api/foundation-hub?detail=full'),
    readText('scripts/foundation-verify.mjs'),
    readText('lib/foundation-core-governance-verifier.js'),
    readText(VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_SCRIPT_PATH),
    readText(VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_PLAN_PATH),
    readText('package.json'),
    readText('docs/system-strategy.md'),
    readText('docs/rebuild/current-plan.md'),
    readText('docs/rebuild/current-state.md'),
    readText('AGENTS.md'),
    readText('public/foundation.html'),
    readTextIfExists('docs/specs/2026-04-28-strategic-intelligence-loop.md'),
    readTextIfExists('docs/handoffs/2026-04-28-foundation-hard-checkpoint.md'),
    readTextIfExists('docs/users/README.md'),
    readTextIfExists('docs/users/steve.md'),
    readTextIfExists('docs/agents/README.md'),
    readTextIfExists('docs/agents/harlan.md'),
    readTextIfExists('docs/agents/crewbert.md'),
    readTextIfExists('docs/agents/personal-agent-onboarding.md'),
    readTextIfExists('docs/source-notes/owners-dashboard.md'),
    readTextIfExists('docs/INDEX.md'),
    readTextIfExists('docs/_archive/INDEX.md'),
    readTextIfExists('docs/README.md'),
    readText('lib/foundation-db.js'),
    readText('lib/foundation-decision-store.js'),
    readText('lib/foundation-backlog-store.js'),
    readText('lib/db-constraint-hardening.js'),
    readText('server.js'),
    readTextIfExists('lib/hub-read-routes.js'),
    readTextIfExists('lib/fub-source-routes.js'),
    readTextIfExists('lib/foundation-operator-routes.js'),
    readTextIfExists('lib/foundation-source-routes.js'),
    readTextIfExists('lib/foundation-build-intel-routes.js'),
    readTextIfExists('lib/auth-routes.js'),
    readTextIfExists('lib/app-page-routes.js'),
    readTextIfExists('lib/security-access.js'),
    readTextIfExists('lib/app-auth.js'),
    readTextIfExists('public/login.html'),
    readTextIfExists('public/login.js'),
    readTextIfExists('public/foundation-data.js'),
    readTextIfExists('public/foundation.js'),
    readTextIfExists('public/strategy-export.js'),
  ])
  const packageJson = JSON.parse(packageSource)
  return {
    foundationHub,
    packageJson,
    systemStrategy,
    currentPlan,
    currentState,
    agentsSource,
    foundationHtmlSource,
    strategicIntelSpecSource,
    foundationHardCheckpointSource,
    usersDoc,
    steveDoc,
    agentModelDoc,
    harlanDoc,
    crewbertDoc,
    personalAgentOnboardingDoc,
    ownersSourceNote,
    docsIndexSource,
    archiveIndexSource,
    docsReadmeSource,
    directModelHostOffenders: foundationHub.directModelHostOffenders || [],
    backlogSeedDrift: foundationHub.backlogSeedDrift || {},
    foundationDbSource,
    foundationDecisionStoreSource,
    foundationBacklogStoreSource,
    dbConstraintSource,
    dbConstraintDogfood: await buildDbConstraintDogfoodProof(),
    dbConstraintAudit: foundationHub.dbConstraintAudit || {},
    serverSource,
    hubReadRoutesSource,
    fubSourceRoutesSource,
    foundationOperatorRoutesSource,
    foundationSourceRoutesSource,
    foundationBuildIntelRoutesSource,
    authRoutesSource,
    appPageRoutesSource,
    securityAccessSource,
    appAuthSource,
    loginHtmlSource,
    loginUiSource,
    foundationFrontendSource: `${foundationDataSource}\n${foundationFrontendSource}`,
    strategyExportUiSource,
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
      approvalRef: VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_APPROVAL_PATH,
      cardId: VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_CARD_ID,
    }),
    getBacklogItemsByIds([VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_CARD_ID]),
    loadEvaluationInput({ baseUrl: args.baseUrl }),
  ])

  const card = cards.find(item => item.id === VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_CARD_ID) || null
  const liveEvaluation = evaluateFoundationCoreGovernanceVerifier(input)
  const dogfood = buildFoundationCoreGovernanceVerifierDogfoodProof()
  const foundationVerifyLines = lineCount(input.foundationVerifySource)
  const moduleLines = lineCount(input.moduleSource)
  const proofScriptLines = lineCount(input.proofScriptSource)
  const closeout = getFoundationBuildCloseouts().find(item => item.key === VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_CLOSEOUT_KEY) || null

  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog has core-governance verifier split card in executing or done', card ? `${card.lane} / ${card.priority}` : 'missing card')
  addCheck(checks, approval.ok === true && approval.mode === 'v2' && Number(approval.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approval.ok ? `${approval.mode} / ${approval.approval?.score}` : approval.failures?.map(item => item.detail).join('; '))
  addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8), 'Plan Critic pass row exists', `${planCriticRuns.length} run(s)`)
  addCheck(
    checks,
    activeSprint?.sprint?.sprintId === VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_SPRINT_ID ||
      card?.lane === 'done',
    'Current Sprint points to this card while active or card is historically done',
    activeSprint?.sprint?.sprintId || 'missing active sprint',
  )
  for (const check of liveEvaluation.checks) addCheck(checks, check.ok, check.check, check.detail)
  addCheck(
    checks,
    dogfood.ok === true &&
      dogfood.rejectedCases.directHostLeak &&
      dogfood.rejectedCases.ungatedRoute &&
      dogfood.rejectedCases.hostHeaderBypass &&
      dogfood.rejectedCases.fubMutationOpen &&
      dogfood.rejectedCases.invalidDbReference &&
      dogfood.rejectedCases.weakBacklogCloseout,
    'dogfood rejects core governance/security verifier failures',
    JSON.stringify(dogfood.rejectedCases),
  )
  addCheck(checks, scriptIsReadOnly(input.proofScriptSource), 'focused proof script is read-only', `script lines=${proofScriptLines}`)
  addCheck(
    checks,
    moduleLines > 100 &&
      input.moduleSource.includes('evaluateFoundationCoreGovernanceVerifier') &&
      input.moduleSource.includes('buildFoundationCoreGovernanceVerifierDogfoodProof') &&
      input.foundationVerifySource.includes('evaluateFoundationCoreGovernanceVerifier({') &&
      input.foundationVerifySource.includes('coreGovernanceVerifier.checks'),
    'root verifier delegates core governance checks to focused module',
    `moduleLines=${moduleLines}`,
  )
  addCheck(
    checks,
    input.packageJson.scripts?.['process:verifier-core-governance-split-module-check'] === `node --env-file-if-exists=.env ${VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_SCRIPT_PATH}`,
    'package script is registered',
    input.packageJson.scripts?.['process:verifier-core-governance-split-module-check'] || 'missing',
  )
  addCheck(
    checks,
    await repoFileExists(VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_PLAN_PATH) &&
      await repoFileExists(VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_APPROVAL_PATH),
    'plan and approval files exist',
    `${VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_PLAN_PATH} / ${VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_APPROVAL_PATH}`,
  )
  addCheck(
    checks,
    foundationVerifyLines < VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_BEFORE_LINES,
    'scripts/foundation-verify.mjs line count decreased',
    `${VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_BEFORE_LINES}->${foundationVerifyLines}`,
  )
  addCheck(
    checks,
    !/addCheck\(\s*checks,[\s\S]{0,1200}'system strategy and rebuild plan reflect current Foundation architecture'/.test(input.foundationVerifySource) &&
      !/addCheck\(\s*checks,[\s\S]{0,1200}'broad Foundation\/Ops\/doc read APIs are admin-gated'/.test(input.foundationVerifySource) &&
      !/addCheck\(\s*checks,[\s\S]{0,1200}'generic FUB proxy mutations are off by default'/.test(input.foundationVerifySource),
    'old inline core-governance verifier predicates left the root verifier',
    'root no longer owns the extracted check strings',
  )
  addCheck(
    checks,
    !closeout || (
      closeout.operatorCloseout === true &&
      (closeout.backlogIds || []).includes(VERIFIER_CORE_GOVERNANCE_SPLIT_MODULE_CARD_ID)
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
    console.log('Core Governance Verifier Split Module Check')
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}: ${check.detail}`)
    console.log(JSON.stringify(summary, null, 2))
  }
  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Verifier core-governance split module check failed.')
    console.error(error instanceof Error ? error.stack : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
