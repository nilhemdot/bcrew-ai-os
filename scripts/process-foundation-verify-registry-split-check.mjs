#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { buildCodeQualityNightlyAudit } from '../lib/code-quality-nightly-audit.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  FOUNDATION_VERIFY_REGISTRY_SPLIT_APPROVAL_PATH,
  FOUNDATION_VERIFY_REGISTRY_SPLIT_CARD_ID,
  FOUNDATION_VERIFY_REGISTRY_SPLIT_CHANGED_FILES,
  FOUNDATION_VERIFY_REGISTRY_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_VERIFY_REGISTRY_SPLIT_HANDOFF_PATH,
  FOUNDATION_VERIFY_REGISTRY_SPLIT_PLAN_PATH,
  FOUNDATION_VERIFY_REGISTRY_SPLIT_SCRIPT_PATH,
  buildFoundationVerifyRegistrySplitDogfoodProof,
  evaluateFoundationVerifyRegistrySplit,
} from '../lib/foundation-verify-registry-split.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.some(arg => arg === '--json' || arg === '--json=true'),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
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

function scriptIsReadOnly(source = '') {
  return !/updateBacklogItem\s*\(|createBacklogItem\s*\(|upsertFoundationCurrentSprintOverlay\s*\(|INSERT\s+INTO|UPDATE\s+|DELETE\s+FROM|fs\.writeFile|writeFile\s*\(/i.test(source)
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    planSource,
    packageJson,
    verifierSource,
    structuralAssuranceSource,
    registrySource,
    auditSource,
    proofScriptSource,
    coverageSource,
    closeoutRegistrySource,
  ] = await Promise.all([
    readRepoFile(FOUNDATION_VERIFY_REGISTRY_SPLIT_PLAN_PATH),
    readRepoFile('package.json').then(JSON.parse),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('lib/foundation-verifier-structural-assurance-core.js'),
    readRepoFile('lib/foundation-verify-registry-split.js'),
    readRepoFile('lib/code-quality-nightly-audit.js'),
    readRepoFile(FOUNDATION_VERIFY_REGISTRY_SPLIT_SCRIPT_PATH),
    readRepoFile('lib/foundation-verify-coverage-card-ids.js'),
    readRepoFile('lib/foundation-build-closeout-tightening-records.js'),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: FOUNDATION_VERIFY_REGISTRY_SPLIT_APPROVAL_PATH,
    cardId: FOUNDATION_VERIFY_REGISTRY_SPLIT_CARD_ID,
  })
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: {
      id: FOUNDATION_VERIFY_REGISTRY_SPLIT_CARD_ID,
      priority: 'P0',
      summary: 'Split and prove the Foundation verifier registry boundary.',
      whyItMatters: 'The nightly audit should fail on real verifier monolith risk, not stale pattern-only proof after the root is below 5,000 lines.',
    },
    changedFiles: FOUNDATION_VERIFY_REGISTRY_SPLIT_CHANGED_FILES,
    declaredRisk: 'foundation:verify root budget, verifier module registry, code-quality nightly audit detector, closeout registry, and package process proof',
    repoRoot,
  })
  const [card] = await getBacklogItemsByIds([FOUNDATION_VERIFY_REGISTRY_SPLIT_CARD_ID])
  const sprint = await getActiveFoundationCurrentSprint()
  const planCriticRuns = await getPlanCriticRunsByCardIds([FOUNDATION_VERIFY_REGISTRY_SPLIT_CARD_ID])
  const closeout = getFoundationBuildCloseouts().find(item => item.key === FOUNDATION_VERIFY_REGISTRY_SPLIT_CLOSEOUT_KEY) || null
  const dogfood = buildFoundationVerifyRegistrySplitDogfoodProof()
  const registryResult = await evaluateFoundationVerifyRegistrySplit({
    foundationVerifySource: verifierSource,
    structuralAssuranceSource,
    codeQualityNightlyAuditSource: auditSource,
    packageScripts: packageJson.scripts || {},
    backlogItems: card ? [card] : [],
    closeouts: getFoundationBuildCloseouts(),
    repoFileExists,
  })
  const audit = await buildCodeQualityNightlyAudit({
    repoRoot,
    skipEndpointFetch: true,
  })
  const auditStillFlagsFoundationVerify = (audit.findings || [])
    .some(finding => finding.id === 'foundation-verify-monolith')
  const sprintItem = (sprint.items || []).find(item => item.cardId === FOUNDATION_VERIFY_REGISTRY_SPLIT_CARD_ID) || null
  const planCriticPass = planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE)
  const historicalCloseoutOwnsCard = card?.lane === 'done' &&
    String(card?.statusNote || '').includes(FOUNDATION_VERIFY_REGISTRY_SPLIT_CLOSEOUT_KEY) &&
    closeout?.operatorCloseout === true &&
    (closeout.backlogIds || []).includes(FOUNDATION_VERIFY_REGISTRY_SPLIT_CARD_ID)

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval validates at 9.8+', approval.failures?.map(failure => failure.check).join(', ') || FOUNDATION_VERIFY_REGISTRY_SPLIT_APPROVAL_PATH)
  addCheck(checks, planReview.status === 'pass' && Number(planReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'plan passes Plan Critic', `score=${planReview.score}`)
  addCheck(checks, planCriticPass, 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, Boolean(card && ['executing', 'done'].includes(card.lane)), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, Boolean(sprintItem || historicalCloseoutOwnsCard), 'active sprint or historical closeout owns the card', sprintItem ? `${sprint.sprint?.sprintId}:${sprintItem.stage}` : closeout?.key || 'missing')
  addCheck(checks, Boolean(historicalCloseoutOwnsCard), 'closeout registry owns the done card', closeout ? closeout.key : 'missing')
  addCheck(checks, packageJson.scripts?.['process:foundation-verify-registry-split-check'] === `node --env-file-if-exists=.env ${FOUNDATION_VERIFY_REGISTRY_SPLIT_SCRIPT_PATH}`, 'package exposes focused proof', packageJson.scripts?.['process:foundation-verify-registry-split-check'] || 'missing')
  addCheck(checks, registrySource.includes('FOUNDATION_VERIFY_REGISTRY_REQUIRED_DOMAINS') && registrySource.includes('evaluateFoundationVerifyRegistrySplit'), 'registry module owns split-domain proof', 'lib/foundation-verify-registry-split.js')
  addCheck(checks, dogfood.ok, 'dogfood rejects stale verifier monolith failure modes', dogfood.dogfoodInvariant)
  for (const check of registryResult.checks) checks.push(check)
  addCheck(checks, auditStillFlagsFoundationVerify === false, 'nightly audit no longer hard-flags resolved foundation verifier root', auditStillFlagsFoundationVerify ? 'still flagged' : 'resolved')
  addCheck(checks, scriptIsReadOnly(proofScriptSource), 'focused proof script is read-only', 'no live-state write tokens')
  addCheck(checks, coverageSource.includes(FOUNDATION_VERIFY_REGISTRY_SPLIT_CARD_ID), 'verifier coverage source includes card ID', 'lib/foundation-verify-coverage-card-ids.js')
  addCheck(checks, closeoutRegistrySource.includes(FOUNDATION_VERIFY_REGISTRY_SPLIT_CLOSEOUT_KEY) && closeoutRegistrySource.includes(FOUNDATION_VERIFY_REGISTRY_SPLIT_CARD_ID), 'closeout registry source includes card and key', 'lib/foundation-build-closeout-tightening-records.js')
  addCheck(checks, await repoFileExists(FOUNDATION_VERIFY_REGISTRY_SPLIT_HANDOFF_PATH), 'closeout handoff exists', FOUNDATION_VERIFY_REGISTRY_SPLIT_HANDOFF_PATH)

  const failed = checks.filter(check => !check.ok)
  const result = {
    status: failed.length ? 'fail' : 'pass',
    cardId: FOUNDATION_VERIFY_REGISTRY_SPLIT_CARD_ID,
    closeoutKey: FOUNDATION_VERIFY_REGISTRY_SPLIT_CLOSEOUT_KEY,
    checkCount: checks.length,
    failedCount: failed.length,
    auditFindingCount: audit.summary?.findingCount || 0,
    registrySummary: registryResult.summary,
    failed,
    checks,
  }

  if (args.json) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`Foundation verify registry split check: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }

  await closeFoundationDb()
  if (failed.length) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
