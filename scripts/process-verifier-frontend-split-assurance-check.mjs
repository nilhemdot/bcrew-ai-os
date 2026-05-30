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
  VERIFIER_FRONTEND_SPLIT_ASSURANCE_APPROVAL_PATH,
  VERIFIER_FRONTEND_SPLIT_ASSURANCE_BEFORE_LINES,
  VERIFIER_FRONTEND_SPLIT_ASSURANCE_CARD_ID,
  VERIFIER_FRONTEND_SPLIT_ASSURANCE_CLOSEOUT_KEY,
  VERIFIER_FRONTEND_SPLIT_ASSURANCE_HANDOFF_PATH,
  VERIFIER_FRONTEND_SPLIT_ASSURANCE_PLAN_PATH,
  VERIFIER_FRONTEND_SPLIT_ASSURANCE_SCRIPT_PATH,
  buildFoundationVerifierFrontendSplitAssuranceDogfoodProof,
} from '../lib/foundation-verifier-frontend-split-assurance.js'

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
    await fs.access(path.join(repoRoot, relativePath))
    return true
  } catch {
    return false
  }
}

function lineCount(source = '') {
  return String(source || '').split('\n').length
}

function scriptIsReadOnly(source = '') {
  return !/updateBacklogItem\s*\(|createBacklogItem\s*\(|upsertFoundationCurrentSprintOverlay\s*\(|INSERT\s+INTO|UPDATE\s+|DELETE\s+FROM|fs\.writeFile|writeFile\s*\(/i.test(source)
}

async function main() {
  const args = parseArgs()
  const jsonOnly = args.json === true || args.json === 'true'
  const checks = []

  const [
    moduleSource,
    structuralAssuranceSource,
    verifierSource,
    scriptSource,
    planSource,
    packageSource,
  ] = await Promise.all([
    readRepoFile('lib/foundation-verifier-frontend-split-assurance.js'),
    readRepoFile('lib/foundation-verifier-frontend-structural-assurance.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile(VERIFIER_FRONTEND_SPLIT_ASSURANCE_SCRIPT_PATH),
    readRepoFile(VERIFIER_FRONTEND_SPLIT_ASSURANCE_PLAN_PATH),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: VERIFIER_FRONTEND_SPLIT_ASSURANCE_APPROVAL_PATH,
    cardId: VERIFIER_FRONTEND_SPLIT_ASSURANCE_CARD_ID,
  })
  const [card] = await getBacklogItemsByIds([VERIFIER_FRONTEND_SPLIT_ASSURANCE_CARD_ID])
  const activeSprint = await getActiveFoundationCurrentSprint()
  const planCriticRuns = await getPlanCriticRunsByCardIds([VERIFIER_FRONTEND_SPLIT_ASSURANCE_CARD_ID])
  const sprintItem = activeSprint.items.find(item => item.cardId === VERIFIER_FRONTEND_SPLIT_ASSURANCE_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === VERIFIER_FRONTEND_SPLIT_ASSURANCE_CLOSEOUT_KEY) || null
  const dogfood = buildFoundationVerifierFrontendSplitAssuranceDogfoodProof()
  const verifierLines = lineCount(verifierSource)
  const hasPlanCriticPass = planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8)
  const activeSprintOwnsCard = sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage)
  const historicalCloseoutOwnsCard =
    card?.lane === 'done' &&
    String(card?.statusNote || '').includes(VERIFIER_FRONTEND_SPLIT_ASSURANCE_CLOSEOUT_KEY) &&
    closeout?.operatorCloseout === true &&
    (closeout.backlogIds || []).includes(VERIFIER_FRONTEND_SPLIT_ASSURANCE_CARD_ID)
  const oldStylesheetInlineMarker = 'const stylesheet' + 'MonolithSplitCard ='
  const oldFrontendInputMarker = 'const frontend' + 'SplitVerifierInput ='

  addCheck(checks, approvalValidation.ok && Number(approvalValidation.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || VERIFIER_FRONTEND_SPLIT_ASSURANCE_APPROVAL_PATH)
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, activeSprintOwnsCard || historicalCloseoutOwnsCard, 'frontend split assurance has active or historical ownership without replacing the active overlay', activeSprintOwnsCard ? `${activeSprint.sprint?.sprintId}:${sprintItem?.stage}` : closeout?.key || 'missing')
  addCheck(checks, hasPlanCriticPass || historicalCloseoutOwnsCard, 'Plan Critic pass or historical closeout exists', hasPlanCriticPass ? 'plan_critic_runs pass row present' : closeout?.key || 'missing')
  addCheck(checks, moduleSource.includes('evaluateFoundationVerifierFrontendSplitAssurance') && moduleSource.includes('buildFoundationVerifierFrontendSplitAssuranceDogfoodProof'), 'new module owns frontend split assurance evaluator and dogfood', 'lib/foundation-verifier-frontend-split-assurance.js')
  addCheck(
    checks,
    dogfood.ok === true &&
      dogfood.rejected.hiddenStylesheetFailure.ok === false &&
      dogfood.rejected.hiddenFrontendVerifierFailure.ok === false &&
      dogfood.rejected.missingDogfood.ok === false &&
      dogfood.rejected.oldInlinePredicate.ok === false &&
      dogfood.rejected.missingCloseoutProof.ok === false,
    'dogfood rejects frontend split assurance failures',
    dogfood.dogfoodInvariant,
  )
  const delegationSource = [verifierSource, structuralAssuranceSource].join('\n')
  addCheck(
    checks,
    (
      verifierSource.includes('evaluateFoundationVerifierFrontendSplitAssurance({') ||
      verifierSource.includes('evaluateFoundationVerifierFrontendStructuralAssurance({')
    ) &&
      delegationSource.includes('evaluateFoundationVerifierFrontendSplitAssurance({') &&
      delegationSource.includes('verifierFrontendSplitAssurance.checks'),
    'foundation verifier delegates frontend split assurance checks to focused module',
    'evaluateFoundationVerifierFrontendSplitAssurance',
  )
  addCheck(checks, !verifierSource.includes(oldStylesheetInlineMarker) && !verifierSource.includes(oldFrontendInputMarker), 'old inline frontend split blocks are removed', 'stylesheetMonolithSplitCard and frontendSplitVerifierInput no longer appear inline')
  addCheck(checks, verifierLines < VERIFIER_FRONTEND_SPLIT_ASSURANCE_BEFORE_LINES, 'foundation verifier line count decreases', `${VERIFIER_FRONTEND_SPLIT_ASSURANCE_BEFORE_LINES} -> ${verifierLines}`)
  addCheck(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only', 'no live-state write tokens')
  addCheck(checks, packageJson.scripts?.['process:verifier-frontend-split-assurance-check'] === `node --env-file-if-exists=.env ${VERIFIER_FRONTEND_SPLIT_ASSURANCE_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:verifier-frontend-split-assurance-check'] || 'missing')
  addCheck(checks, await repoFileExists(VERIFIER_FRONTEND_SPLIT_ASSURANCE_HANDOFF_PATH), 'closeout handoff exists', VERIFIER_FRONTEND_SPLIT_ASSURANCE_HANDOFF_PATH)
  addCheck(checks, planSource.includes('Dogfood proof recreates the failure class') && planSource.includes('No active sprint overlay replacement') && planSource.includes('No arbitrary tail extraction'), 'plan requires dogfood, rejects arbitrary extraction, and preserves active overlay', VERIFIER_FRONTEND_SPLIT_ASSURANCE_PLAN_PATH)
  addCheck(checks, moduleSource.includes('evaluateStylesheetMonolithSplit') && moduleSource.includes('evaluateFoundationFrontendSplitVerifier') && moduleSource.includes('VERIFIER_FRONTEND_SPLIT_MODULE_CARD_ID'), 'module owns the intended frontend structural split assurance domain', 'stylesheet split / frontend split verifier')

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: VERIFIER_FRONTEND_SPLIT_ASSURANCE_CARD_ID,
    closeoutKey: VERIFIER_FRONTEND_SPLIT_ASSURANCE_CLOSEOUT_KEY,
    lineCounts: {
      before: VERIFIER_FRONTEND_SPLIT_ASSURANCE_BEFORE_LINES,
      after: verifierLines,
      delta: verifierLines - VERIFIER_FRONTEND_SPLIT_ASSURANCE_BEFORE_LINES,
    },
    checks,
  }

  if (jsonOnly) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Verifier frontend split assurance proof')
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
