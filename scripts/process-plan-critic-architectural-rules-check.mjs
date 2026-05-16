#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  PLAN_CRITIC_ARCHITECTURAL_RULES_APPROVAL_PATH,
  PLAN_CRITIC_ARCHITECTURAL_RULES_CARD_ID,
  PLAN_CRITIC_ARCHITECTURAL_RULES_CLOSEOUT_KEY,
  PLAN_CRITIC_ARCHITECTURAL_RULES_PLAN_PATH,
  PLAN_CRITIC_ARCHITECTURAL_RULES_SCRIPT_PATH,
  PLAN_CRITIC_ARCHITECTURAL_RULES_SPRINT_ID,
  buildPlanCriticResultSummary,
  buildSyntheticPlanCriticArchitecturalRulesProof,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
  }
  return args
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    planText,
    packageSource,
    planCriticSource,
    architectureRulesSource,
    scriptSource,
    foundationVerifySource,
    buildCloseoutRecordsSource,
    cleanupCloseoutRecordsSource,
    controlPlaneCloseoutRecordsSource,
  ] = await Promise.all([
    readRepoFile(PLAN_CRITIC_ARCHITECTURAL_RULES_PLAN_PATH),
    readRepoFile('package.json'),
    readRepoFile('lib/process-plan-critic.js'),
    readRepoFile('lib/plan-critic-architectural-rules.js'),
    readRepoFile(PLAN_CRITIC_ARCHITECTURAL_RULES_SCRIPT_PATH),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('lib/foundation-build-closeout-records.js'),
    readRepoFile('lib/foundation-build-closeout-cleanup-records.js').catch(() => ''),
    readRepoFile('lib/foundation-build-closeout-control-plane-records.js').catch(() => ''),
  ])
  const packageJson = JSON.parse(packageSource)
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: PLAN_CRITIC_ARCHITECTURAL_RULES_APPROVAL_PATH,
    cardId: PLAN_CRITIC_ARCHITECTURAL_RULES_CARD_ID,
  })
  const planCriticRuns = await getPlanCriticRunsByCardIds([PLAN_CRITIC_ARCHITECTURAL_RULES_CARD_ID])
  const cards = await getBacklogItemsByIds([PLAN_CRITIC_ARCHITECTURAL_RULES_CARD_ID])
  const sprint = await getActiveFoundationCurrentSprint()
  await closeFoundationDb()

  const card = cards.find(item => item.id === PLAN_CRITIC_ARCHITECTURAL_RULES_CARD_ID) || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === PLAN_CRITIC_ARCHITECTURAL_RULES_CARD_ID) || null
  const selfReview = evaluatePlanCriticPlan({
    planText,
    card: card || { id: PLAN_CRITIC_ARCHITECTURAL_RULES_CARD_ID, priority: 'P1' },
    changedFiles: [
      'lib/process-plan-critic.js',
      'lib/plan-critic-architectural-rules.js',
      PLAN_CRITIC_ARCHITECTURAL_RULES_SCRIPT_PATH,
      'scripts/foundation-verify.mjs',
      'lib/foundation-build-log.js',
      'package.json',
    ],
    declaredRisk: planText,
    architecturalRules: true,
  })
  const dogfood = buildSyntheticPlanCriticArchitecturalRulesProof()

  addCheck(
    checks,
    approval.ok && Number(approval.approval?.score) >= 9.8,
    'approval file is valid at 9.8+',
    approval.failures?.map(item => item.check).join(', ') || `score=${approval.approval?.score}`,
  )
  addCheck(
    checks,
    planCriticRuns.some(run => run.cardId === PLAN_CRITIC_ARCHITECTURAL_RULES_CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8),
    'durable Plan Critic pass row exists before build',
    planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing',
  )
  addCheck(
    checks,
    card && ['scoped', 'done'].includes(card.lane),
    'live backlog card exists',
    card ? `${card.lane} / ${card.priority}` : 'missing',
  )
  addCheck(
    checks,
    card?.lane === 'done' ||
      (
        sprint.sprint?.sprintId === PLAN_CRITIC_ARCHITECTURAL_RULES_SPRINT_ID &&
        ['building_now', 'done_this_sprint'].includes(sprintItem?.stage)
      ),
    'card is either closed in backlog or active in the architecture guardrail sprint',
    card?.lane === 'done'
      ? `closed backlog lane ${card.lane}`
      : sprint.sprint ? `${sprint.sprint.sprintId} / ${sprintItem?.stage || 'missing stage'}` : 'missing sprint',
  )
  addCheck(
    checks,
    selfReview.status === 'pass' && Number(selfReview.score) >= 9.8,
    'approved plan passes Plan Critic with architecture rules enabled',
    buildPlanCriticResultSummary(selfReview),
  )
  addCheck(
    checks,
    dogfood.ok,
    'dogfood rejects architecture-risk plans and passes compliant plan',
    JSON.stringify({
      largeFileNoSplit: dogfood.largeFileNoSplit?.status,
      checkWriteNoApply: dogfood.checkWriteNoApply?.status,
      verifierLiveState: dogfood.verifierLiveState?.status,
      auditFixNoDogfood: dogfood.auditFixNoDogfood?.status,
      noFocusedProof: dogfood.noFocusedProof?.status,
      offScopeSideWorkNoCoordination: dogfood.offScopeSideWorkNoCoordination?.status,
      coordinatedSideWork: dogfood.coordinatedSideWork?.status,
      compliant: dogfood.compliant?.status,
    }),
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:plan-critic-architectural-rules-check'] === `node --env-file-if-exists=.env ${PLAN_CRITIC_ARCHITECTURAL_RULES_SCRIPT_PATH}`,
    'package exposes focused architecture proof',
    packageJson.scripts?.['process:plan-critic-architectural-rules-check'] || 'missing',
  )
  addCheck(
    checks,
    architectureRulesSource.includes('LARGE_FILE_LINE_THRESHOLD') &&
      architectureRulesSource.includes('evaluatePlanCriticArchitecturalRules') &&
      architectureRulesSource.includes('architecture_check_script_apply_posture') &&
      architectureRulesSource.includes('architecture_verifier_read_only') &&
      architectureRulesSource.includes('architecture_audit_fix_dogfood') &&
      architectureRulesSource.includes('evaluateProcessWipProtocolPlan') &&
      architectureRulesSource.includes('PROCESS_WIP_PROTOCOL_FINDING_KEY'),
    'architecture rules module owns deterministic finding keys',
    'lib/plan-critic-architectural-rules.js',
  )
  addCheck(
    checks,
    planCriticSource.includes('architecturalRules') &&
      planCriticSource.includes('buildSyntheticPlanCriticArchitecturalRulesProof') &&
      planCriticSource.includes('architectural_rot_rules'),
    'Plan Critic integrates architecture-rule findings',
    'lib/process-plan-critic.js',
  )
  addCheck(
    checks,
    scriptSource.includes('dogfood rejects architecture-risk plans and passes compliant plan') &&
      scriptSource.includes('approved plan passes Plan Critic with architecture rules enabled'),
    'focused proof script calls actual function behavior',
    PLAN_CRITIC_ARCHITECTURAL_RULES_SCRIPT_PATH,
  )
  addCheck(
    checks,
    foundationVerifySource.includes(PLAN_CRITIC_ARCHITECTURAL_RULES_CARD_ID) &&
      foundationVerifySource.includes('buildSyntheticPlanCriticArchitecturalRulesProof'),
    'foundation verifier has card coverage',
    'scripts/foundation-verify.mjs',
  )
  addCheck(
    checks,
    (buildCloseoutRecordsSource.includes(PLAN_CRITIC_ARCHITECTURAL_RULES_CLOSEOUT_KEY) ||
      cleanupCloseoutRecordsSource.includes(PLAN_CRITIC_ARCHITECTURAL_RULES_CLOSEOUT_KEY) ||
      controlPlaneCloseoutRecordsSource.includes(PLAN_CRITIC_ARCHITECTURAL_RULES_CLOSEOUT_KEY)) &&
      (buildCloseoutRecordsSource.includes(PLAN_CRITIC_ARCHITECTURAL_RULES_CARD_ID) ||
        cleanupCloseoutRecordsSource.includes(PLAN_CRITIC_ARCHITECTURAL_RULES_CARD_ID) ||
        controlPlaneCloseoutRecordsSource.includes(PLAN_CRITIC_ARCHITECTURAL_RULES_CARD_ID)),
    'Recent Work closeout record exists',
    'lib/foundation-build-closeout-records.js',
  )

  const findings = checks.filter(check => !check.ok)
  const summary = {
    ok: findings.length === 0,
    status: findings.length ? 'blocked' : 'healthy',
    cardId: PLAN_CRITIC_ARCHITECTURAL_RULES_CARD_ID,
    closeoutKey: PLAN_CRITIC_ARCHITECTURAL_RULES_CLOSEOUT_KEY,
    selfReview: {
      status: selfReview.status,
      score: selfReview.score,
      findings: selfReview.findings,
    },
    dogfood: {
      ok: dogfood.ok,
      largeFileNoSplit: dogfood.largeFileNoSplit?.status,
      checkWriteNoApply: dogfood.checkWriteNoApply?.status,
      verifierLiveState: dogfood.verifierLiveState?.status,
      auditFixNoDogfood: dogfood.auditFixNoDogfood?.status,
      noFocusedProof: dogfood.noFocusedProof?.status,
      offScopeSideWorkNoCoordination: dogfood.offScopeSideWorkNoCoordination?.status,
      coordinatedSideWork: dogfood.coordinatedSideWork?.status,
      compliant: dogfood.compliant?.status,
    },
    checks,
    findings,
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Plan Critic architectural rules proof')
    console.log(`  Card: ${PLAN_CRITIC_ARCHITECTURAL_RULES_CARD_ID}`)
    console.log(`  Status: ${summary.status}`)
    console.log(`  Self review: ${buildPlanCriticResultSummary(selfReview)}`)
    for (const finding of findings) console.log(`  BLOCKED ${finding.check}: ${finding.detail}`)
  }
  if (findings.length) process.exitCode = 1
}

main().catch(async error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
  await closeFoundationDb().catch(() => {})
})
