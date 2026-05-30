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
  getSourceContractRegistrySnapshot,
} from '../lib/foundation-source-crawl-db.js'
import {
  VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_APPROVAL_PATH,
  VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_BEFORE_LINES,
  VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_CARD_ID,
  VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_CLOSEOUT_KEY,
  VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_HANDOFF_PATH,
  VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_PLAN_PATH,
  VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_SCRIPT_PATH,
  buildFoundationSourceContractOrchestrationSplitDogfoodProof,
  buildFoundationSourceContractVerifierDogfoodProof,
} from '../lib/foundation-source-contract-verifier.js'
import {
  buildSourceContractRegistryTableDogfoodProof,
} from '../lib/source-contract-registry-table.js'
import {
  buildSourceIdScalarFkDogfoodProof,
  getSourceIdScalarFkMigrationSnapshot,
} from '../lib/source-id-scalar-fk-migration.js'
import {
  buildSourceIdArrayProvenanceDesignDogfoodProof,
  evaluateSourceIdArrayProvenanceDesign,
} from '../lib/source-id-array-provenance-design.js'

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
    proofScriptSource,
    historicalProofScriptSource,
    planSource,
    packageSource,
  ] = await Promise.all([
    readRepoFile('lib/foundation-source-contract-verifier.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile(VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_SCRIPT_PATH),
    readRepoFile('scripts/process-verifier-source-contracts-module-check.mjs'),
    readRepoFile(VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_PLAN_PATH),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_APPROVAL_PATH,
    cardId: VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_CARD_ID,
  })
  const [card] = await getBacklogItemsByIds([VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_CARD_ID])
  const activeSprint = await getActiveFoundationCurrentSprint()
  const planCriticRuns = await getPlanCriticRunsByCardIds([VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_CARD_ID])
  const closeout = getFoundationBuildCloseouts()
    .find(record => record.key === VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_CLOSEOUT_KEY) || null
  const sourceContractDogfood = buildFoundationSourceContractVerifierDogfoodProof()
  const orchestrationDogfood = buildFoundationSourceContractOrchestrationSplitDogfoodProof()
  const sourceContractRegistrySnapshot = await getSourceContractRegistrySnapshot()
  const sourceContractRegistryDogfood = buildSourceContractRegistryTableDogfoodProof()
  const sourceIdScalarFkMigrationSnapshot = await getSourceIdScalarFkMigrationSnapshot()
  const sourceIdScalarFkDogfood = buildSourceIdScalarFkDogfoodProof()
  const sourceIdArrayProvenanceDesign = evaluateSourceIdArrayProvenanceDesign()
  const sourceIdArrayProvenanceDogfood = buildSourceIdArrayProvenanceDesignDogfoodProof()
  const verifierLines = lineCount(verifierSource)
  const rootDelegatesThroughWrapper = verifierSource.includes('evaluateFoundationSourceContractVerifierOrchestration({') &&
    verifierSource.includes('sourceContractOrchestrationVerifier.checks')
  const oldRootPatterns = [
    'const sourceContractRegistrySnapshot = await getSourceContractRegistrySnapshot()',
    'const sourceIdScalarFkMigrationSnapshot = await getSourceIdScalarFkMigrationSnapshot()',
    'const sourceIdArrayProvenanceDesign = evaluateSourceIdArrayProvenanceDesign()',
    'const sourceContractVerifierResult = evaluateFoundationSourceContractVerifier({',
    'sourceContractRegistryDogfood: buildSourceContractRegistryTableDogfoodProof()',
    'sourceIdScalarFkDogfood: buildSourceIdScalarFkDogfoodProof()',
    'sourceIdArrayProvenanceDogfood: buildSourceIdArrayProvenanceDesignDogfoodProof()',
    'checks.push(...sourceContractVerifierResult.checks)',
  ]
  const oldDirectRootCallRemoved = oldRootPatterns.every(pattern => !verifierSource.includes(pattern))
  const hasPlanCriticPass = planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8)
  const closeoutOwnsCard = closeout?.operatorCloseout === true &&
    (closeout.backlogIds || []).includes(VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_CARD_ID)

  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog has Source Contract orchestration split card in executing or done', card ? `${card.lane} / ${card.priority}` : 'missing card')
  addCheck(checks, approvalValidation.ok === true && approvalValidation.mode === 'v2' && Number(approvalValidation.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approvalValidation.ok ? `${approvalValidation.mode} / ${approvalValidation.approval?.score}` : approvalValidation.failures?.map(item => item.detail).join('; '))
  addCheck(checks, hasPlanCriticPass || closeoutOwnsCard, 'Plan Critic pass or historical closeout exists', hasPlanCriticPass ? 'plan_critic_runs pass row present' : closeout?.key || 'missing')
  addCheck(
    checks,
    activeSprint?.sprint?.sprintId !== 'verifier-source-contract-orchestration-split-2026-05-17' || card?.lane === 'done',
    'active sprint overlay was not replaced for this historical split',
    activeSprint?.sprint?.sprintId || 'missing active sprint',
  )
  addCheck(
    checks,
    sourceContractDogfood.ok === true &&
      sourceContractDogfood.missingOwnersSignoff.ok === false &&
      sourceContractDogfood.missingOwnersTab.ok === false &&
      sourceContractDogfood.missingRegistryRow.ok === false &&
      sourceContractDogfood.staleCurrentState.ok === false &&
      sourceContractDogfood.missingSourceContractRegistry.ok === false &&
      sourceContractDogfood.missingScalarFkMigration.ok === false &&
      sourceContractDogfood.missingArrayProvenanceDesign.ok === false,
    'Source Contract verifier dogfood rejects real failure classes',
    sourceContractDogfood.invariant,
  )
  addCheck(
    checks,
    orchestrationDogfood.ok === true &&
      orchestrationDogfood.rejected.missingWrapper.ok === false &&
      orchestrationDogfood.rejected.missingDelegation.ok === false &&
      orchestrationDogfood.rejected.oldDirectRootCall.ok === false &&
      orchestrationDogfood.rejected.rootOwnedRegistryDogfood.ok === false &&
      orchestrationDogfood.rejected.missingCloseout.ok === false &&
      orchestrationDogfood.rejected.missingProofRegistration.ok === false &&
      orchestrationDogfood.rejected.noLineDrop.ok === false,
    'orchestration split dogfood rejects migration failures',
    orchestrationDogfood.invariant,
  )
  addCheck(checks, sourceContractRegistrySnapshot.evaluation.ok === true, 'live DB source-contract registry snapshot is healthy', JSON.stringify(sourceContractRegistrySnapshot.evaluation.summary))
  addCheck(checks, sourceContractRegistryDogfood.ok === true, 'source-contract registry dogfood rejects stale/unsafe states', sourceContractRegistryDogfood.invariant)
  addCheck(checks, sourceIdScalarFkMigrationSnapshot.ok === true, 'scalar source-ID FK migration snapshot is healthy', `validated=${sourceIdScalarFkMigrationSnapshot.constraints.validatedCount}/${sourceIdScalarFkMigrationSnapshot.constraints.expectedCount} invalidRefs=${sourceIdScalarFkMigrationSnapshot.invalidReferenceCount}`)
  addCheck(checks, sourceIdScalarFkDogfood.ok === true, 'scalar source-ID FK dogfood rejects unsafe source IDs', sourceIdScalarFkDogfood.invariant)
  addCheck(checks, sourceIdArrayProvenanceDesign.ok === true, 'array source-ID provenance design is healthy and report-only', `relations=${sourceIdArrayProvenanceDesign.designRelationCount}/${sourceIdArrayProvenanceDesign.expectedRelationCount}`)
  addCheck(checks, sourceIdArrayProvenanceDogfood.ok === true, 'array source-ID provenance dogfood rejects unsafe designs', sourceIdArrayProvenanceDogfood.invariant)
  addCheck(
    checks,
    moduleSource.includes('evaluateFoundationSourceContractVerifierOrchestration') &&
      moduleSource.includes('buildFoundationSourceContractOrchestrationSplitDogfoodProof') &&
      moduleSource.includes('getSourceContractRegistrySnapshot') &&
      moduleSource.includes('buildSourceContractRegistryTableDogfoodProof') &&
      moduleSource.includes('getSourceIdScalarFkMigrationSnapshot') &&
      moduleSource.includes('buildSourceIdScalarFkDogfoodProof') &&
      moduleSource.includes('evaluateSourceIdArrayProvenanceDesign') &&
      moduleSource.includes('buildSourceIdArrayProvenanceDesignDogfoodProof'),
    'module owns Source Contract orchestration and registry/source-ID dogfood setup',
    'lib/foundation-source-contract-verifier.js',
  )
  addCheck(
    checks,
    rootDelegatesThroughWrapper && oldDirectRootCallRemoved,
    'root verifier delegates Source Contract orchestration only',
    rootDelegatesThroughWrapper ? 'wrapper delegation present and old direct root patterns absent' : 'missing wrapper delegation',
  )
  addCheck(checks, verifierLines < VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_BEFORE_LINES, 'root verifier line count decreased', `${VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_BEFORE_LINES}->${verifierLines}`)
  addCheck(checks, scriptIsReadOnly(proofScriptSource), 'focused proof script is read-only', 'no DB write helpers, SQL mutation statements, or fs write calls')
  addCheck(
    checks,
    packageJson.scripts?.['process:verifier-source-contract-orchestration-split-check'] ===
      `node --env-file-if-exists=.env ${VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_SCRIPT_PATH}`,
    'package script is registered',
    packageJson.scripts?.['process:verifier-source-contract-orchestration-split-check'] || 'missing',
  )
  addCheck(
    checks,
    await repoFileExists(VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_PLAN_PATH) &&
      await repoFileExists(VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_APPROVAL_PATH) &&
      await repoFileExists(VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_HANDOFF_PATH),
    'plan, approval, and handoff files exist',
    `${VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_PLAN_PATH} / ${VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_APPROVAL_PATH} / ${VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_HANDOFF_PATH}`,
  )
  addCheck(
    checks,
    planSource.includes('Dogfood proof recreates the failure class') &&
      planSource.includes('No active sprint overlay replacement') &&
      planSource.includes('No arbitrary tail extraction') &&
      planSource.includes('Source Contract'),
    'plan records dogfood, no-overlay, and domain-boundary acceptance',
    VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_PLAN_PATH,
  )
  addCheck(
    checks,
    historicalProofScriptSource.includes('historical source-contract split proof accepts wrapper delegation') &&
      historicalProofScriptSource.includes('evaluateFoundationSourceContractVerifierOrchestration({'),
    'historical Source Contract module proof accepts wrapper delegation',
    'scripts/process-verifier-source-contracts-module-check.mjs',
  )

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_CARD_ID,
    closeoutKey: VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_CLOSEOUT_KEY,
    lineCounts: {
      before: VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_BEFORE_LINES,
      after: verifierLines,
      delta: verifierLines - VERIFIER_SOURCE_CONTRACT_ORCHESTRATION_SPLIT_BEFORE_LINES,
    },
    checks,
  }

  if (jsonOnly) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Verifier Source Contract orchestration split proof')
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
