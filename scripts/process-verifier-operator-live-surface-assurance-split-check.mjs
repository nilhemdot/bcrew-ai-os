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
  VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_APPROVAL_PATH,
  VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_BEFORE_LINES,
  VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_CARD_ID,
  VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_CLOSEOUT_KEY,
  VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_HANDOFF_PATH,
  VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_PLAN_PATH,
  VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_SCRIPT_PATH,
  buildFoundationVerifierOperatorLiveSurfaceAssuranceDogfoodProof,
} from '../lib/foundation-verifier-operator-live-surface-assurance.js'

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
    readRepoFile('lib/foundation-verifier-operator-live-surface-assurance.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile(VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_SCRIPT_PATH),
    readRepoFile(VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_PLAN_PATH),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_APPROVAL_PATH,
    cardId: VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_CARD_ID,
  })
  const [card] = await getBacklogItemsByIds([VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_CARD_ID])
  const activeSprint = await getActiveFoundationCurrentSprint()
  const planCriticRuns = await getPlanCriticRunsByCardIds([VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_CARD_ID])
  const sprintItem = activeSprint.items.find(item => item.cardId === VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(record => record.key === VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_CLOSEOUT_KEY) || null
  const dogfood = buildFoundationVerifierOperatorLiveSurfaceAssuranceDogfoodProof()
  const verifierLines = lineCount(verifierSource)
  const hasPlanCriticPass = planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8)
  const activeSprintOwnsCard = sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage)
  const historicalCloseoutOwnsCard =
    card?.lane === 'done' &&
    String(card?.statusNote || '').includes(VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_CLOSEOUT_KEY) &&
    closeout?.operatorCloseout === true &&
    (closeout.backlogIds || []).includes(VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_CARD_ID)
  const oldInlineMessages = [
    'Foundation Operations pages state their purpose and stale questions are cleared',
    'Strategy Hub v2 renders source-to-gap and route review while advisor remains offline',
    'api/foundation-hub exposes extraction control targets',
    'api/owners/review-queue exposes the governed Owners inbox',
    'Foundation operator UX and Recent Work follow-up is parked as scoped P1',
  ]

  addCheck(checks, approvalValidation.ok && Number(approvalValidation.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_APPROVAL_PATH)
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, activeSprintOwnsCard || historicalCloseoutOwnsCard, 'Operator/live-surface assurance split has active or historical ownership without replacing the active overlay', activeSprintOwnsCard ? `${activeSprint.sprint?.sprintId}:${sprintItem?.stage}` : closeout?.key || 'missing')
  addCheck(checks, hasPlanCriticPass || historicalCloseoutOwnsCard, 'Plan Critic pass or historical closeout exists', hasPlanCriticPass ? 'plan_critic_runs pass row present' : closeout?.key || 'missing')
  addCheck(checks, moduleSource.includes('evaluateFoundationVerifierOperatorLiveSurfaceAssurance') && moduleSource.includes('buildFoundationVerifierOperatorLiveSurfaceAssuranceDogfoodProof'), 'new module owns operator/live-surface assurance evaluator and dogfood', 'lib/foundation-verifier-operator-live-surface-assurance.js')
  addCheck(
    checks,
    dogfood.ok === true &&
      dogfood.rejected.hiddenOpsSurfaceContract.ok === false &&
      dogfood.rejected.hiddenStrategyHubSourceReview.ok === false &&
      dogfood.rejected.hiddenExtractionControlProof.ok === false &&
      dogfood.rejected.hiddenOwnersGovernance.ok === false &&
      dogfood.rejected.hiddenRecentBuildsDiscipline.ok === false &&
      dogfood.rejected.oldInlinePredicate.ok === false,
    'dogfood rejects operator/live-surface assurance failures',
    dogfood.dogfoodInvariant,
  )
  addCheck(checks, verifierSource.includes('evaluateFoundationVerifierOperatorLiveSurfaceAssurance({') && verifierSource.includes('operatorLiveSurfaceAssuranceVerifier.checks'), 'foundation verifier delegates operator/live-surface assurance checks to focused module', 'evaluateFoundationVerifierOperatorLiveSurfaceAssurance')
  addCheck(
    checks,
    oldInlineMessages.every(message => !verifierSource.includes(message)),
    'old inline operator/live-surface assertion block is removed from root',
    'Ops, Strategy Hub v2, extraction control, Owners review queue, and Recent Work assertions no longer appear inline',
  )
  addCheck(checks, verifierLines < VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_BEFORE_LINES, 'foundation verifier line count decreases', `${VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_BEFORE_LINES} -> ${verifierLines}`)
  addCheck(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only', 'no live-state write tokens')
  addCheck(checks, packageJson.scripts?.['process:verifier-operator-live-surface-assurance-split-check'] === `node --env-file-if-exists=.env ${VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:verifier-operator-live-surface-assurance-split-check'] || 'missing')
  addCheck(checks, await repoFileExists(VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_HANDOFF_PATH), 'closeout handoff exists', VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_HANDOFF_PATH)
  addCheck(checks, planSource.includes('Dogfood proof recreates the failure class') && planSource.includes('No active sprint overlay replacement') && planSource.includes('No arbitrary tail extraction'), 'plan requires dogfood, rejects arbitrary extraction, and preserves active overlay', VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_PLAN_PATH)
  addCheck(checks, moduleSource.includes('api/foundation-hub exposes extraction control targets') && moduleSource.includes('Strategy Hub v2 renders source-to-gap') && moduleSource.includes('api/owners/review-queue exposes the governed Owners inbox') && moduleSource.includes('Foundation Recent Builds v2 operator changelog hardening is closed'), 'module owns the intended operator/live-surface assurance domain', 'Ops, Strategy Hub, extraction control, Owners governance, Recent Builds')

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_CARD_ID,
    closeoutKey: VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_CLOSEOUT_KEY,
    lineCounts: {
      before: VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_BEFORE_LINES,
      after: verifierLines,
      delta: verifierLines - VERIFIER_OPERATOR_LIVE_SURFACE_ASSURANCE_SPLIT_BEFORE_LINES,
    },
    checks,
  }

  if (jsonOnly) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Verifier operator/live-surface assurance split proof')
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
