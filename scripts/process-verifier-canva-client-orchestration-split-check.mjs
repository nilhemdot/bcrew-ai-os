#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'
import {
  CANVA_CLIENT_VERIFIER_CHECK,
  VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_APPROVAL_PATH,
  VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_BEFORE_LINES,
  VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_CARD_ID,
  VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_CLOSEOUT_KEY,
  VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_HANDOFF_PATH,
  VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_PLAN_PATH,
  VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_SCRIPT_PATH,
  buildFoundationCanvaClientVerifierDogfoodProof,
} from '../lib/foundation-canva-client-verifier.js'

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
    readRepoFile('lib/foundation-canva-client-verifier.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile(VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_SCRIPT_PATH),
    readRepoFile('scripts/process-verifier-canva-client-split-module-check.mjs'),
    readRepoFile(VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_PLAN_PATH),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_APPROVAL_PATH,
    cardId: VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_CARD_ID,
  })
  const [card] = await getBacklogItemsByIds([VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_CARD_ID])
  const activeSprint = await getActiveFoundationCurrentSprint()
  const planCriticRuns = await getPlanCriticRunsByCardIds([VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_CARD_ID])
  const sprintItem = activeSprint.items.find(item => item.cardId === VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_CLOSEOUT_KEY) || null
  const dogfood = await buildFoundationCanvaClientVerifierDogfoodProof()
  const verifierLines = lineCount(verifierSource)
  const hasPlanCriticPass = planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8)
  const activeSprintOwnsCard = sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage)
  const historicalCloseoutOwnsCard =
    card?.lane === 'done' &&
    String(card?.statusNote || '').includes(VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_CLOSEOUT_KEY) &&
    closeout?.operatorCloseout === true &&
    (closeout.backlogIds || []).includes(VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_CARD_ID)
  const oldRootPatterns = [
    'const canvaClientVerifier = await evaluateFoundationCanvaClientVerifier({',
    'const canvaClientVerifierDogfood = await buildFoundationCanvaClientVerifierDogfoodProof()',
    'const verifierCanvaClientSplitModuleCard =',
  ]

  addCheck(checks, approvalValidation.ok && Number(approvalValidation.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_APPROVAL_PATH)
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, activeSprintOwnsCard || historicalCloseoutOwnsCard, 'Canva client orchestration split has active or historical ownership without replacing the active overlay', activeSprintOwnsCard ? `${activeSprint.sprint?.sprintId}:${sprintItem?.stage}` : closeout?.key || 'missing')
  addCheck(checks, hasPlanCriticPass || historicalCloseoutOwnsCard, 'Plan Critic pass or historical closeout exists', hasPlanCriticPass ? 'plan_critic_runs pass row present' : closeout?.key || 'missing')
  addCheck(checks, moduleSource.includes('evaluateFoundationCanvaClientVerifierOrchestration') && moduleSource.includes('evaluateFoundationCanvaClientVerifier') && moduleSource.includes('buildFoundationCanvaClientVerifierDogfoodProof'), 'module owns Canva client orchestration, evaluator, and dogfood', 'lib/foundation-canva-client-verifier.js')
  addCheck(
    checks,
    dogfood.ok === true &&
      dogfood.rejected.missingRefreshToken.ok === false &&
      dogfood.rejected.missingRotationBootstrap.ok === false &&
      dogfood.rejected.writeWrapperExposed.ok === false &&
      dogfood.rejected.missingOfficialReadPlan.ok === false,
    'dogfood rejects Canva client verifier failures',
    dogfood.dogfoodInvariant,
  )
  addCheck(checks, verifierSource.includes('evaluateFoundationCanvaClientVerifierOrchestration({') && verifierSource.includes('canvaClientOrchestrationVerifier.checks'), 'foundation verifier delegates Canva client orchestration to focused module', 'evaluateFoundationCanvaClientVerifierOrchestration')
  addCheck(
    checks,
    oldRootPatterns.every(pattern => !verifierSource.includes(pattern)),
    'old inline Canva client orchestration block is removed from root',
    'direct evaluator call, dogfood call, and split self-check no longer appear inline',
  )
  addCheck(checks, verifierLines < VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_BEFORE_LINES, 'foundation verifier line count decreases', `${VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_BEFORE_LINES} -> ${verifierLines}`)
  addCheck(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only', 'no live-state write tokens')
  addCheck(checks, packageJson.scripts?.['process:verifier-canva-client-orchestration-split-check'] === `node --env-file-if-exists=.env ${VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:verifier-canva-client-orchestration-split-check'] || 'missing')
  addCheck(checks, await repoFileExists(VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_HANDOFF_PATH), 'closeout handoff exists', VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_HANDOFF_PATH)
  addCheck(checks, planSource.includes('Dogfood proof recreates the failure class') && planSource.includes('No active sprint overlay replacement') && planSource.includes('No arbitrary tail extraction') && planSource.includes('No Canva writes'), 'plan requires dogfood, rejects arbitrary extraction, preserves active overlay, and stays read-only', VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_PLAN_PATH)
  addCheck(checks, historicalScriptSource.includes('evaluateFoundationCanvaClientVerifierOrchestration'), 'historical Canva client split proof accepts wrapper delegation', 'scripts/process-verifier-canva-client-split-module-check.mjs')
  addCheck(
    checks,
    moduleSource.includes(CANVA_CLIENT_VERIFIER_CHECK) &&
      moduleSource.includes('CANVA_REFRESH_TOKEN') &&
      moduleSource.includes('replaceEnvValueLine') &&
      moduleSource.includes('refusing_to_write_env_without_apply') &&
      moduleSource.includes('code_challenge_method') &&
      moduleSource.includes('missing refresh token') &&
      moduleSource.includes('missing official read-plan evidence') &&
      moduleSource.includes('createAssetUploadJob'),
    'module owns the intended Canva client verifier domain',
    'read-only Canva access, refresh-token rotation guardrails, OAuth bootstrap proof, and no-write dogfood',
  )

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_CARD_ID,
    closeoutKey: VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_CLOSEOUT_KEY,
    lineCounts: {
      before: VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_BEFORE_LINES,
      after: verifierLines,
      delta: verifierLines - VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_BEFORE_LINES,
    },
    checks,
  }

  if (jsonOnly) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Verifier Canva client orchestration split proof')
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
