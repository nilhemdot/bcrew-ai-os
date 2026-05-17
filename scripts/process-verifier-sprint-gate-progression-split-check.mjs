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
  VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_APPROVAL_PATH,
  VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_BEFORE_LINES,
  VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_CARD_ID,
  VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_CLOSEOUT_KEY,
  VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_HANDOFF_PATH,
  VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_PLAN_PATH,
  VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_SCRIPT_PATH,
  buildFoundationVerifierSprintGateProgressionDogfoodProof,
} from '../lib/foundation-verifier-sprint-gate-progression.js'

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
    verifierSource,
    scriptSource,
    planSource,
    packageSource,
  ] = await Promise.all([
    readRepoFile('lib/foundation-verifier-sprint-gate-progression.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile(VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_SCRIPT_PATH),
    readRepoFile(VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_PLAN_PATH),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_APPROVAL_PATH,
    cardId: VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_CARD_ID,
  })
  const [card] = await getBacklogItemsByIds([VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_CARD_ID])
  const activeSprint = await getActiveFoundationCurrentSprint()
  const planCriticRuns = await getPlanCriticRunsByCardIds([VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_CARD_ID])
  const sprintItem = activeSprint.items.find(item => item.cardId === VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_CLOSEOUT_KEY) || null
  const dogfood = buildFoundationVerifierSprintGateProgressionDogfoodProof()
  const verifierLines = lineCount(verifierSource)
  const hasPlanCriticPass = planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8)
  const activeSprintOwnsCard = sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage)
  const historicalCloseoutOwnsCard =
    card?.lane === 'done' &&
    String(card?.statusNote || '').includes(VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_CLOSEOUT_KEY) &&
    closeout?.operatorCloseout === true &&
    (closeout.backlogIds || []).includes(VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_CARD_ID)
  const oldVerifyGateInlineMarker = 'const verify' + 'GateTieringBuildLogExact ='
  const oldCurrentSprintInlineMarker = 'evaluateFoundation' + 'CurrentSprintVerifier({'
  const oldSecurityInlineMarker = 'SECURITY-BEHAVIOR-PROOF-001 proves route-boundary access and subject-person redaction behavior'

  addCheck(checks, approvalValidation.ok && Number(approvalValidation.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_APPROVAL_PATH)
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, activeSprintOwnsCard || historicalCloseoutOwnsCard, 'Sprint gate progression split has active or historical ownership without replacing the active overlay', activeSprintOwnsCard ? `${activeSprint.sprint?.sprintId}:${sprintItem?.stage}` : closeout?.key || 'missing')
  addCheck(checks, hasPlanCriticPass || historicalCloseoutOwnsCard, 'Plan Critic pass or historical closeout exists', hasPlanCriticPass ? 'plan_critic_runs pass row present' : closeout?.key || 'missing')
  addCheck(checks, moduleSource.includes('evaluateFoundationVerifierSprintGateProgression') && moduleSource.includes('buildFoundationVerifierSprintGateProgressionDogfoodProof'), 'new module owns sprint gate progression evaluator and dogfood', 'lib/foundation-verifier-sprint-gate-progression.js')
  addCheck(
    checks,
    dogfood.ok === true &&
      dogfood.rejected.hiddenCurrentSprintSystem.ok === false &&
      dogfood.rejected.hiddenVerifyGateTiering.ok === false &&
      dogfood.rejected.hiddenPlanCriticGate.ok === false &&
      dogfood.rejected.hiddenSecurityBehavior.ok === false &&
      dogfood.rejected.hiddenVerifierBehaviorSweep.ok === false &&
      dogfood.rejected.oldInlinePredicate.ok === false,
    'dogfood rejects sprint gate progression failures',
    dogfood.dogfoodInvariant,
  )
  addCheck(checks, verifierSource.includes('evaluateFoundationVerifierSprintGateProgression({') && verifierSource.includes('sprintGateProgressionVerifier.checks'), 'foundation verifier delegates sprint gate progression checks to focused module', 'evaluateFoundationVerifierSprintGateProgression')
  addCheck(
    checks,
    !verifierSource.includes(oldVerifyGateInlineMarker) &&
      !verifierSource.includes(oldCurrentSprintInlineMarker) &&
      !verifierSource.includes(oldSecurityInlineMarker),
    'old inline sprint gate progression blocks are removed from root',
    'verify-gate/current-sprint/security behavior predicates no longer appear inline',
  )
  addCheck(checks, verifierLines < VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_BEFORE_LINES, 'foundation verifier line count decreases', `${VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_BEFORE_LINES} -> ${verifierLines}`)
  addCheck(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only', 'no live-state write tokens')
  addCheck(checks, packageJson.scripts?.['process:verifier-sprint-gate-progression-split-check'] === `node --env-file-if-exists=.env ${VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:verifier-sprint-gate-progression-split-check'] || 'missing')
  addCheck(checks, await repoFileExists(VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_HANDOFF_PATH), 'closeout handoff exists', VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_HANDOFF_PATH)
  addCheck(checks, planSource.includes('Dogfood proof recreates the failure class') && planSource.includes('No active sprint overlay replacement') && planSource.includes('No arbitrary tail extraction'), 'plan requires dogfood, rejects arbitrary extraction, and preserves active overlay', VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_PLAN_PATH)
  addCheck(checks, moduleSource.includes('FOUNDATION_SPRINT_SYSTEM_CARD_ID') && moduleSource.includes('VERIFY_GATE_TIERING_CARD_ID') && moduleSource.includes('PLAN_CRITIC_REPLACEMENT_CARD_ID') && moduleSource.includes('SECURITY_BEHAVIOR_PROOF_CARD_ID') && moduleSource.includes('VERIFIER_BEHAVIOR_SWEEP_CARD_ID'), 'module owns the intended Current Sprint gate progression domain', 'Foundation sprint / verify gate / Plan Critic / security / behavior sweep')

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_CARD_ID,
    closeoutKey: VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_CLOSEOUT_KEY,
    lineCounts: {
      before: VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_BEFORE_LINES,
      after: verifierLines,
      delta: verifierLines - VERIFIER_SPRINT_GATE_PROGRESSION_SPLIT_BEFORE_LINES,
    },
    checks,
  }

  if (jsonOnly) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Verifier sprint gate progression split proof')
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
