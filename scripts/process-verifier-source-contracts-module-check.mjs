#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  VERIFIER_SOURCE_CONTRACT_MODULE_APPROVAL_PATH,
  VERIFIER_SOURCE_CONTRACT_MODULE_BEFORE_LINES,
  VERIFIER_SOURCE_CONTRACT_MODULE_CARD_ID,
  VERIFIER_SOURCE_CONTRACT_MODULE_CLOSEOUT_KEY,
  VERIFIER_SOURCE_CONTRACT_MODULE_PLAN_PATH,
  VERIFIER_SOURCE_CONTRACT_MODULE_SCRIPT_PATH,
  VERIFIER_SOURCE_CONTRACT_MODULE_SPRINT_ID,
  buildFoundationSourceContractVerifierDogfoodProof,
} from '../lib/foundation-source-contract-verifier.js'
import {
  buildSourceContractRegistryTableDogfoodProof,
} from '../lib/source-contract-registry-table.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  getSourceContractRegistrySnapshot,
} from '../lib/foundation-db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    args[key] = value ?? true
  }
  return args
}

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

function lineCount(source = '') {
  return String(source || '').split('\n').length
}

function scriptIsReadOnly(source = '') {
  const banned = [
    'create' + 'BacklogItem',
    'update' + 'BacklogItem',
    'upsert' + 'FoundationCurrentSprintOverlay',
    'INSERT' + ' INTO',
    'UPDATE' + ' ',
    'DELETE' + ' FROM',
    'fs.' + 'writeFile',
    'write' + 'File(',
  ]
  return banned.every(token => !source.includes(token))
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const jsonOutput = args.json === true || args.json === 'true'
  const checks = []

  const [
    moduleSource,
    verifierSource,
    scriptSource,
    planSource,
    packageSource,
  ] = await Promise.all([
    readRepoFile('lib/foundation-source-contract-verifier.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile(VERIFIER_SOURCE_CONTRACT_MODULE_SCRIPT_PATH),
    readRepoFile(VERIFIER_SOURCE_CONTRACT_MODULE_PLAN_PATH),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: VERIFIER_SOURCE_CONTRACT_MODULE_APPROVAL_PATH,
    cardId: VERIFIER_SOURCE_CONTRACT_MODULE_CARD_ID,
  })
  const [card] = await getBacklogItemsByIds([VERIFIER_SOURCE_CONTRACT_MODULE_CARD_ID])
  const activeSprint = await getActiveFoundationCurrentSprint()
  const sprintItem = activeSprint.items.find(item => item.cardId === VERIFIER_SOURCE_CONTRACT_MODULE_CARD_ID) || null
  const planCriticRuns = await getPlanCriticRunsByCardIds([VERIFIER_SOURCE_CONTRACT_MODULE_CARD_ID])
  const planCritic = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= 9.8) || null
  const dogfood = buildFoundationSourceContractVerifierDogfoodProof()
  const sourceContractRegistrySnapshot = await getSourceContractRegistrySnapshot()
  const sourceContractRegistryDogfood = buildSourceContractRegistryTableDogfoodProof()
  const verifierLines = lineCount(verifierSource)
  const removedOldInlinePredicates = [
    "ownersContract?.status === 'Signed Off'",
    "financeContract?.status === 'Current reality captured'",
    "freedomCommunityContract?.signedOffTabs?.includes",
    "['Split Cal', 'Agent Splits', 'Listings and Conditional Deals'",
    "['Monthly Budget', 'Budget Original', 'Monthly Actuals (Roll Up)'",
  ].every(token => !verifierSource.includes(token))
  const delegates = verifierSource.includes('evaluateFoundationSourceContractVerifier') &&
    verifierSource.includes('buildFoundationSourceContractVerifierDogfoodProof') &&
    verifierSource.includes('VERIFIER_SOURCE_CONTRACT_MODULE_CARD_ID')

  ensure(checks, approvalValidation.ok && Number(approvalValidation.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || VERIFIER_SOURCE_CONTRACT_MODULE_APPROVAL_PATH)
  ensure(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  ensure(checks, activeSprint.sprint?.sprintId === VERIFIER_SOURCE_CONTRACT_MODULE_SPRINT_ID || card?.lane === 'done', 'Current Sprint is source-contract verifier sprint or card is historically done', activeSprint.sprint?.sprintId || 'missing')
  ensure(checks, card?.lane === 'done' || (sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage)), 'Current Sprint contains the card in Building Now/Done or backlog is done', card?.lane === 'done' ? 'backlog done' : sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  ensure(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  ensure(checks, moduleSource.includes('evaluateFoundationSourceContractVerifier') && moduleSource.includes('buildFoundationSourceContractVerifierDogfoodProof'), 'new module owns source-contract verifier logic', 'lib/foundation-source-contract-verifier.js')
  ensure(checks, dogfood.ok === true, 'dogfood rejects source-contract verifier failures', dogfood.invariant)
  ensure(checks, dogfood.healthy.ok === true, 'dogfood healthy fixture passes', `${dogfood.healthy.summary.passed}/${dogfood.healthy.summary.total}`)
  ensure(checks, dogfood.missingOwnersSignoff.ok === false, 'dogfood rejects missing Owners signoff', dogfood.missingOwnersSignoff.failed.map(item => item.check).join('; '))
  ensure(checks, dogfood.missingOwnersTab.ok === false, 'dogfood rejects missing Owners tab coverage', dogfood.missingOwnersTab.failed.map(item => item.check).join('; '))
  ensure(checks, dogfood.missingRegistryRow.ok === false, 'dogfood rejects stale registry row', dogfood.missingRegistryRow.failed.map(item => item.check).join('; '))
  ensure(checks, dogfood.staleCurrentState.ok === false, 'dogfood rejects stale current-state mirror boundary', dogfood.staleCurrentState.failed.map(item => item.check).join('; '))
  ensure(checks, dogfood.missingSourceContractRegistry.ok === false, 'dogfood rejects missing DB source-contract registry proof', dogfood.missingSourceContractRegistry.failed.map(item => item.check).join('; '))
  ensure(checks, sourceContractRegistrySnapshot.evaluation.ok === true, 'live DB source-contract registry snapshot is healthy', JSON.stringify(sourceContractRegistrySnapshot.evaluation.summary))
  ensure(checks, sourceContractRegistryDogfood.ok === true, 'source-contract registry dogfood rejects stale/unsafe states', sourceContractRegistryDogfood.invariant)
  ensure(checks, delegates, 'foundation verifier delegates source-contract checks to focused module', 'evaluateFoundationSourceContractVerifier')
  ensure(checks, removedOldInlinePredicates, 'foundation verifier no longer owns old inline source-contract predicates', removedOldInlinePredicates ? 'old predicates absent' : 'old predicates still inline')
  ensure(checks, verifierLines < VERIFIER_SOURCE_CONTRACT_MODULE_BEFORE_LINES, 'foundation verifier line count decreases', `${VERIFIER_SOURCE_CONTRACT_MODULE_BEFORE_LINES} -> ${verifierLines}`)
  ensure(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only', 'no write/mutation tokens in proof script')
  ensure(checks, packageJson.scripts?.['process:verifier-source-contracts-module-check'] === `node --env-file-if-exists=.env ${VERIFIER_SOURCE_CONTRACT_MODULE_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:verifier-source-contracts-module-check'] || 'missing')
  ensure(checks, planSource.includes('Substring-only proof is rejected'), 'plan rejects substring-only proof', VERIFIER_SOURCE_CONTRACT_MODULE_PLAN_PATH)

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: VERIFIER_SOURCE_CONTRACT_MODULE_CARD_ID,
    closeoutKey: VERIFIER_SOURCE_CONTRACT_MODULE_CLOSEOUT_KEY,
    lineCounts: {
      before: VERIFIER_SOURCE_CONTRACT_MODULE_BEFORE_LINES,
      after: verifierLines,
      delta: verifierLines - VERIFIER_SOURCE_CONTRACT_MODULE_BEFORE_LINES,
    },
    checks,
    dogfood: {
      healthy: dogfood.healthy.ok,
      missingOwnersSignoffRejected: dogfood.missingOwnersSignoff.ok === false,
      missingOwnersTabRejected: dogfood.missingOwnersTab.ok === false,
      missingRegistryRowRejected: dogfood.missingRegistryRow.ok === false,
      staleCurrentStateRejected: dogfood.staleCurrentState.ok === false,
      missingSourceContractRegistryRejected: dogfood.missingSourceContractRegistry.ok === false,
      sourceContractRegistryDogfood: sourceContractRegistryDogfood.ok === true,
    },
  }

  if (jsonOutput) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Verifier source-contract module proof')
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
