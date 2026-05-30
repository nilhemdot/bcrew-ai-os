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
  VERIFIER_CORE_GOVERNANCE_ORCHESTRATION_SPLIT_APPROVAL_PATH,
  VERIFIER_CORE_GOVERNANCE_ORCHESTRATION_SPLIT_BEFORE_LINES,
  VERIFIER_CORE_GOVERNANCE_ORCHESTRATION_SPLIT_CARD_ID,
  VERIFIER_CORE_GOVERNANCE_ORCHESTRATION_SPLIT_CLOSEOUT_KEY,
  VERIFIER_CORE_GOVERNANCE_ORCHESTRATION_SPLIT_HANDOFF_PATH,
  VERIFIER_CORE_GOVERNANCE_ORCHESTRATION_SPLIT_PLAN_PATH,
  VERIFIER_CORE_GOVERNANCE_ORCHESTRATION_SPLIT_SCRIPT_PATH,
  buildFoundationCoreGovernanceVerifierDogfoodProof,
} from '../lib/foundation-core-governance-verifier.js'

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
    moduleSource,
    verifierSource,
    scriptSource,
    planSource,
    packageSource,
  ] = await Promise.all([
    readRepoFile('lib/foundation-core-governance-verifier.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile(VERIFIER_CORE_GOVERNANCE_ORCHESTRATION_SPLIT_SCRIPT_PATH),
    readRepoFile(VERIFIER_CORE_GOVERNANCE_ORCHESTRATION_SPLIT_PLAN_PATH),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: VERIFIER_CORE_GOVERNANCE_ORCHESTRATION_SPLIT_APPROVAL_PATH,
    cardId: VERIFIER_CORE_GOVERNANCE_ORCHESTRATION_SPLIT_CARD_ID,
  })
  const [card] = await getBacklogItemsByIds([VERIFIER_CORE_GOVERNANCE_ORCHESTRATION_SPLIT_CARD_ID])
  const activeSprint = await getActiveFoundationCurrentSprint()
  const planCriticRuns = await getPlanCriticRunsByCardIds([VERIFIER_CORE_GOVERNANCE_ORCHESTRATION_SPLIT_CARD_ID])
  const sprintItem = activeSprint.items.find(item => item.cardId === VERIFIER_CORE_GOVERNANCE_ORCHESTRATION_SPLIT_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === VERIFIER_CORE_GOVERNANCE_ORCHESTRATION_SPLIT_CLOSEOUT_KEY) || null
  const dogfood = buildFoundationCoreGovernanceVerifierDogfoodProof()
  const verifierLines = lineCount(verifierSource)
  const hasPlanCriticPass = planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8)
  const activeSprintOwnsCard = sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage)
  const historicalCloseoutOwnsCard =
    card?.lane === 'done' &&
    String(card?.statusNote || '').includes(VERIFIER_CORE_GOVERNANCE_ORCHESTRATION_SPLIT_CLOSEOUT_KEY) &&
    closeout?.operatorCloseout === true &&
    (closeout.backlogIds || []).includes(VERIFIER_CORE_GOVERNANCE_ORCHESTRATION_SPLIT_CARD_ID)
  const oldRootPatterns = [
    'const coreGovernanceVerifier = evaluateFoundationCoreGovernanceVerifier({',
    'const verifierCoreGovernanceSplitModuleCard =',
    'const verifierCoreGovernanceSplitModuleDogfood = buildFoundationCoreGovernanceVerifierDogfoodProof()',
    'shared-comms candidates apply idempotently',
    'LLM router refuses non-runnable routes',
    'source crawl ledger is run-id, lease-owner, and item-key safe',
  ]

  addCheck(checks, approvalValidation.ok && Number(approvalValidation.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || VERIFIER_CORE_GOVERNANCE_ORCHESTRATION_SPLIT_APPROVAL_PATH)
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, activeSprintOwnsCard || historicalCloseoutOwnsCard, 'Core-governance orchestration split has active or historical ownership without replacing the active overlay', activeSprintOwnsCard ? `${activeSprint.sprint?.sprintId}:${sprintItem?.stage}` : closeout?.key || 'missing')
  addCheck(checks, hasPlanCriticPass || historicalCloseoutOwnsCard, 'Plan Critic pass or historical closeout exists', hasPlanCriticPass ? 'plan_critic_runs pass row present' : closeout?.key || 'missing')
  addCheck(checks, moduleSource.includes('evaluateFoundationCoreGovernanceVerifierOrchestration') && moduleSource.includes('evaluateFoundationCoreGovernanceVerifier') && moduleSource.includes('buildFoundationCoreGovernanceVerifierDogfoodProof'), 'module owns core-governance orchestration, evaluator, and dogfood', 'lib/foundation-core-governance-verifier.js')
  addCheck(
    checks,
    dogfood.ok === true &&
      dogfood.rejectedCases.directHostLeak &&
      dogfood.rejectedCases.ungatedRoute &&
      dogfood.rejectedCases.hostHeaderBypass &&
      dogfood.rejectedCases.fubMutationOpen &&
      dogfood.rejectedCases.invalidDbReference &&
      dogfood.rejectedCases.weakBacklogCloseout &&
      dogfood.rejectedCases.unsafeSourceIdContract &&
      dogfood.rejectedCases.unsafeSharedCommsApply &&
      dogfood.rejectedCases.runnableRouteBypass &&
      dogfood.rejectedCases.unsafeSourceCrawlLedger,
    'dogfood rejects core-governance proof failures',
    JSON.stringify(dogfood.rejectedCases),
  )
  addCheck(checks, verifierSource.includes('evaluateFoundationCoreGovernanceVerifierOrchestration({') && verifierSource.includes('coreGovernanceOrchestrationVerifier.checks'), 'foundation verifier delegates core-governance orchestration to focused module', 'evaluateFoundationCoreGovernanceVerifierOrchestration')
  addCheck(
    checks,
    oldRootPatterns.every(pattern => !verifierSource.includes(pattern)),
    'old inline core-governance orchestration and promoted safety predicates are removed from root',
    'module call, split self-check, shared-comms, LLM route, and source-crawl ledger predicates no longer appear inline',
  )
  addCheck(checks, verifierLines < VERIFIER_CORE_GOVERNANCE_ORCHESTRATION_SPLIT_BEFORE_LINES, 'foundation verifier line count decreases', `${VERIFIER_CORE_GOVERNANCE_ORCHESTRATION_SPLIT_BEFORE_LINES} -> ${verifierLines}`)
  addCheck(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only', 'no live-state write tokens')
  addCheck(checks, packageJson.scripts?.['process:verifier-core-governance-orchestration-split-check'] === `node --env-file-if-exists=.env ${VERIFIER_CORE_GOVERNANCE_ORCHESTRATION_SPLIT_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:verifier-core-governance-orchestration-split-check'] || 'missing')
  addCheck(checks, await repoFileExists(VERIFIER_CORE_GOVERNANCE_ORCHESTRATION_SPLIT_HANDOFF_PATH), 'closeout handoff exists', VERIFIER_CORE_GOVERNANCE_ORCHESTRATION_SPLIT_HANDOFF_PATH)
  addCheck(checks, planSource.includes('Dogfood proof recreates the failure class') && planSource.includes('No active sprint overlay replacement') && planSource.includes('No arbitrary tail extraction'), 'plan requires dogfood, rejects arbitrary extraction, and preserves active overlay', VERIFIER_CORE_GOVERNANCE_ORCHESTRATION_SPLIT_PLAN_PATH)
  addCheck(
    checks,
    moduleSource.includes('shared-comms candidates apply idempotently') &&
      moduleSource.includes('LLM router refuses non-runnable routes') &&
      moduleSource.includes('source crawl ledger is run-id, lease-owner, and item-key safe'),
    'module owns the intended core-governance orchestration domain',
    'shared-comms idempotency, LLM route runnable safety, source-crawl run/lease safety',
  )

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: VERIFIER_CORE_GOVERNANCE_ORCHESTRATION_SPLIT_CARD_ID,
    closeoutKey: VERIFIER_CORE_GOVERNANCE_ORCHESTRATION_SPLIT_CLOSEOUT_KEY,
    lineCounts: {
      before: VERIFIER_CORE_GOVERNANCE_ORCHESTRATION_SPLIT_BEFORE_LINES,
      after: verifierLines,
      delta: verifierLines - VERIFIER_CORE_GOVERNANCE_ORCHESTRATION_SPLIT_BEFORE_LINES,
    },
    checks,
  }

  if (jsonOnly) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Verifier core-governance orchestration split proof')
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
