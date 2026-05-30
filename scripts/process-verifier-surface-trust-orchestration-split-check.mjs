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
  VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_APPROVAL_PATH,
  VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_BEFORE_LINES,
  VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_CARD_ID,
  VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_CLOSEOUT_KEY,
  VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_HANDOFF_PATH,
  VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_PLAN_PATH,
  VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_SCRIPT_PATH,
  buildFoundationSurfaceTrustVerifierDogfoodProof,
} from '../lib/foundation-surface-trust-verifier.js'

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
    historicalScriptSource,
    planSource,
    packageSource,
  ] = await Promise.all([
    readRepoFile('lib/foundation-surface-trust-verifier.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile(VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_SCRIPT_PATH),
    readRepoFile('scripts/process-verifier-surface-trust-split-module-check.mjs'),
    readRepoFile(VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_PLAN_PATH),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_APPROVAL_PATH,
    cardId: VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_CARD_ID,
  })
  const [card] = await getBacklogItemsByIds([VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_CARD_ID])
  const activeSprint = await getActiveFoundationCurrentSprint()
  const planCriticRuns = await getPlanCriticRunsByCardIds([VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_CARD_ID])
  const sprintItem = activeSprint.items.find(item => item.cardId === VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_CLOSEOUT_KEY) || null
  const dogfood = await buildFoundationSurfaceTrustVerifierDogfoodProof()
  const verifierLines = lineCount(verifierSource)
  const hasPlanCriticPass = planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8)
  const activeSprintOwnsCard = sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage)
  const historicalCloseoutOwnsCard =
    card?.lane === 'done' &&
    String(card?.statusNote || '').includes(VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_CLOSEOUT_KEY) &&
    closeout?.operatorCloseout === true &&
    (closeout.backlogIds || []).includes(VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_CARD_ID)
  const oldRootPatterns = [
    'const surfaceTrustVerifier = await evaluateFoundationSurfaceTrustVerifier({',
    'const surfaceTrustDogfood = await buildFoundationSurfaceTrustVerifierDogfoodProof()',
    'const verifierSurfaceTrustSplitModuleCard =',
  ]

  addCheck(checks, approvalValidation.ok && Number(approvalValidation.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_APPROVAL_PATH)
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, activeSprintOwnsCard || historicalCloseoutOwnsCard, 'Surface/trust orchestration split has active or historical ownership without replacing the active overlay', activeSprintOwnsCard ? `${activeSprint.sprint?.sprintId}:${sprintItem?.stage}` : closeout?.key || 'missing')
  addCheck(checks, hasPlanCriticPass || historicalCloseoutOwnsCard, 'Plan Critic pass or historical closeout exists', hasPlanCriticPass ? 'plan_critic_runs pass row present' : closeout?.key || 'missing')
  addCheck(checks, moduleSource.includes('evaluateFoundationSurfaceTrustVerifierOrchestration') && moduleSource.includes('evaluateFoundationSurfaceTrustVerifier') && moduleSource.includes('buildFoundationSurfaceTrustVerifierDogfoodProof'), 'module owns surface/trust orchestration, evaluator, and dogfood', 'lib/foundation-surface-trust-verifier.js')
  addCheck(
    checks,
    dogfood.ok === true &&
      dogfood.rejected.staleException.ok === false &&
      dogfood.rejected.missingDoneCoverage.ok === false &&
      dogfood.rejected.missingArtifact.ok === false &&
      dogfood.rejected.staleServedCode.ok === false &&
      dogfood.rejected.missingSurfaceMap.ok === false,
    'dogfood rejects surface/trust proof failures',
    dogfood.dogfoodInvariant,
  )
  addCheck(checks, verifierSource.includes('evaluateFoundationSurfaceTrustVerifierOrchestration({') && verifierSource.includes('surfaceTrustOrchestrationVerifier.checks'), 'foundation verifier delegates surface/trust orchestration to focused module', 'evaluateFoundationSurfaceTrustVerifierOrchestration')
  addCheck(
    checks,
    oldRootPatterns.every(pattern => !verifierSource.includes(pattern)),
    'old inline surface/trust orchestration block is removed from root',
    'direct evaluator call, dogfood call, and split self-check no longer appear inline',
  )
  addCheck(checks, verifierLines < VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_BEFORE_LINES, 'foundation verifier line count decreases', `${VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_BEFORE_LINES} -> ${verifierLines}`)
  addCheck(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only', 'no live-state write tokens')
  addCheck(checks, packageJson.scripts?.['process:verifier-surface-trust-orchestration-split-check'] === `node --env-file-if-exists=.env ${VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:verifier-surface-trust-orchestration-split-check'] || 'missing')
  addCheck(checks, await repoFileExists(VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_HANDOFF_PATH), 'closeout handoff exists', VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_HANDOFF_PATH)
  addCheck(checks, planSource.includes('Dogfood proof recreates the failure class') && planSource.includes('No active sprint overlay replacement') && planSource.includes('No arbitrary tail extraction'), 'plan requires dogfood, rejects arbitrary extraction, and preserves active overlay', VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_PLAN_PATH)
  addCheck(checks, historicalScriptSource.includes('evaluateFoundationSurfaceTrustVerifierOrchestration'), 'historical surface/trust split proof accepts wrapper delegation', 'scripts/process-verifier-surface-trust-split-module-check.mjs')
  addCheck(
    checks,
    moduleSource.includes('validateVerifierExceptionLedger') &&
      moduleSource.includes('findMissingArtifactClaims') &&
      moduleSource.includes('dashboard served code matches current repo HEAD') &&
      moduleSource.includes('api/foundation-hub exposes the Foundation surface freshness sweep'),
    'module owns the intended surface/trust orchestration domain',
    'exception ledger, artifact claims, served-code trust, and surface freshness',
  )

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_CARD_ID,
    closeoutKey: VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_CLOSEOUT_KEY,
    lineCounts: {
      before: VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_BEFORE_LINES,
      after: verifierLines,
      delta: verifierLines - VERIFIER_SURFACE_TRUST_ORCHESTRATION_SPLIT_BEFORE_LINES,
    },
    checks,
  }

  if (jsonOnly) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Verifier surface/trust orchestration split proof')
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
