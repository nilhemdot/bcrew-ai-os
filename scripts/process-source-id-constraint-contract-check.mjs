#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
  buildPlanCriticResultSummary,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  SOURCE_ID_CONSTRAINT_AUDIT_RELATIONS,
  SOURCE_ID_CONSTRAINT_CONTRACT_APPROVAL_PATH,
  SOURCE_ID_CONSTRAINT_CONTRACT_CARD_ID,
  SOURCE_ID_CONSTRAINT_CONTRACT_CLOSEOUT_KEY,
  SOURCE_ID_CONSTRAINT_CONTRACT_PLAN_PATH,
  SOURCE_ID_CONSTRAINT_CONTRACT_SCRIPT_PATH,
  SOURCE_ID_CONSTRAINT_CONTRACT_SPRINT_ID,
  buildSourceIdConstraintContractDogfoodProof,
  evaluateSourceIdConstraintContract,
} from '../lib/source-id-constraint-contract.js'
import {
  closeFoundationDb,
  getFoundationDbConstraintAudit,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'

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

function sprintStageMap(items = []) {
  return new Map((items || []).map(item => [item.cardId, item.stage]))
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    planText,
    packageSource,
    contractSource,
    scriptSource,
    foundationDbSource,
    verifierSource,
    rootVerifierSource,
    splitVerifierScriptSource,
    currentPlan,
    currentState,
    closeoutRecords,
  ] = await Promise.all([
    readRepoFile(SOURCE_ID_CONSTRAINT_CONTRACT_PLAN_PATH),
    readRepoFile('package.json'),
    readRepoFile('lib/source-id-constraint-contract.js'),
    readRepoFile(SOURCE_ID_CONSTRAINT_CONTRACT_SCRIPT_PATH),
    readRepoFile('lib/foundation-db.js'),
    readRepoFile('lib/foundation-core-governance-verifier.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('scripts/process-verifier-core-governance-split-module-check.mjs'),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
    readRepoFile('lib/foundation-build-closeout-overnight-records.js'),
  ])
  const packageJson = JSON.parse(packageSource)
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: SOURCE_ID_CONSTRAINT_CONTRACT_APPROVAL_PATH,
    cardId: SOURCE_ID_CONSTRAINT_CONTRACT_CARD_ID,
  })
  const [
    cards,
    planCriticRuns,
    sprint,
    dbConstraintAudit,
  ] = await Promise.all([
    getBacklogItemsByIds([SOURCE_ID_CONSTRAINT_CONTRACT_CARD_ID]),
    getPlanCriticRunsByCardIds([SOURCE_ID_CONSTRAINT_CONTRACT_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getFoundationDbConstraintAudit({ limit: 20 }),
  ])
  await closeFoundationDb()

  const card = cards.find(item => item.id === SOURCE_ID_CONSTRAINT_CONTRACT_CARD_ID) || null
  const stages = sprintStageMap(sprint.items || [])
  const selfReview = evaluatePlanCriticPlan({
    planText,
    card: card || { id: SOURCE_ID_CONSTRAINT_CONTRACT_CARD_ID, priority: 'P1' },
    changedFiles: [
      'lib/source-id-constraint-contract.js',
      SOURCE_ID_CONSTRAINT_CONTRACT_SCRIPT_PATH,
      'package.json',
      'lib/foundation-core-governance-verifier.js',
      'scripts/process-verifier-core-governance-split-module-check.mjs',
      'scripts/foundation-verify.mjs',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
      'lib/foundation-build-closeout-overnight-records.js',
    ],
    declaredRisk: planText,
    architecturalRules: true,
  })
  const contract = evaluateSourceIdConstraintContract()
  const dogfood = buildSourceIdConstraintContractDogfoodProof()
  const proofScriptHasLiveMutation = /updateBacklogItem\s*\(|createBacklogItem\s*\(|upsertFoundationCurrentSprintOverlay\s*\(|INSERT\s+INTO\s+plan_critic_runs|UPDATE\s+foundation_sprints|UPDATE\s+foundation_sprint_items|DELETE\s+FROM\s+foundation_sprint_items|ALTER\s+TABLE|CREATE\s+INDEX|DROP\s+TABLE|fs\.writeFile|writeFile\s*\(/i.test(scriptSource)
  const auditRelationCoverage = SOURCE_ID_CONSTRAINT_AUDIT_RELATIONS.every(relation => foundationDbSource.includes(`'${relation}'`))

  addCheck(
    checks,
    approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE,
    'approval file is valid at 9.8+',
    approval.failures?.map(item => item.check).join(', ') || `score=${approval.approval?.score}`,
  )
  addCheck(
    checks,
    planCriticRuns.some(run => run.cardId === SOURCE_ID_CONSTRAINT_CONTRACT_CARD_ID && run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE),
    'durable Plan Critic pass row exists before build',
    planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing',
  )
  addCheck(
    checks,
    selfReview.status === 'pass' && Number(selfReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE,
    'approved plan passes Plan Critic with architecture rules enabled',
    buildPlanCriticResultSummary(selfReview),
  )
  addCheck(
    checks,
    card && ['scoped', 'done'].includes(card.lane),
    'live backlog card exists in scoped/done lane',
    card ? `${card.lane} / ${card.priority}` : 'missing',
  )
  addCheck(
    checks,
    card?.lane === 'done' ||
      (
        sprint.sprint?.sprintId === SOURCE_ID_CONSTRAINT_CONTRACT_SPRINT_ID &&
        ['building_now', 'done_this_sprint'].includes(stages.get(SOURCE_ID_CONSTRAINT_CONTRACT_CARD_ID))
      ),
    'card is active in Current Sprint or closed in backlog',
    card?.lane === 'done'
      ? 'backlog done'
      : `${sprint.sprint?.sprintId || 'missing sprint'} / ${stages.get(SOURCE_ID_CONSTRAINT_CONTRACT_CARD_ID) || 'missing stage'}`,
  )
  addCheck(
    checks,
    contract.ok &&
      contract.auditedRelationCount === SOURCE_ID_CONSTRAINT_AUDIT_RELATIONS.length &&
      contract.contractRelationCount === SOURCE_ID_CONSTRAINT_AUDIT_RELATIONS.length,
    'source-ID contract covers every audited DB source relation',
    `${contract.contractRelationCount}/${contract.auditedRelationCount} relation(s) / findings=${contract.findings.length}`,
  )
  addCheck(
    checks,
    (contract.classificationCounts.fk_safe_now || 0) >= 1 &&
      (contract.classificationCounts.needs_schema_design || 0) >= 1,
    'contract separates scalar FK-safe references from schema-design references',
    JSON.stringify(contract.classificationCounts),
  )
  addCheck(
    checks,
    dogfood.ok,
    'dogfood rejects unsafe source-ID constraint claims',
    JSON.stringify({
      valid: dogfood.valid?.ok,
      unsafeArrayFk: dogfood.unsafeArrayFk?.findingKeys,
      missingRegisteredSourceEnforcement: dogfood.missingRegisteredSourceEnforcement?.findingKeys,
      missingRelation: dogfood.missingRelation?.findingKeys,
      mutationPosture: dogfood.mutationPosture?.findingKeys,
    }),
  )
  addCheck(
    checks,
    dbConstraintAudit.invalidSourceReferenceCount === 0,
    'live DB source references are valid against registered source contracts',
    `${dbConstraintAudit.invalidSourceReferenceCount || 0} invalid source reference(s)`,
  )
  addCheck(
    checks,
    auditRelationCoverage,
    'contract relation set matches getFoundationDbConstraintAudit relation set',
    SOURCE_ID_CONSTRAINT_AUDIT_RELATIONS.filter(relation => !foundationDbSource.includes(`'${relation}'`)).join(', ') || 'all relation names found',
  )
  addCheck(
    checks,
    contractSource.includes('SOURCE_ID_CONSTRAINT_CONTRACT_CLOSEOUT_KEY') &&
      contractSource.includes('evaluateSourceIdConstraintContract') &&
      contractSource.includes('buildSourceIdConstraintContractDogfoodProof') &&
      contractSource.includes('unsafe_array_fk_claim') &&
      contractSource.includes('report_only_boundary'),
    'source-ID contract module owns constants, evaluator, and dogfood proof',
    'lib/source-id-constraint-contract.js',
  )
  addCheck(
    checks,
    !proofScriptHasLiveMutation,
    'focused proof script is read-only',
    proofScriptHasLiveMutation ? 'live mutator or file write pattern found' : 'no live mutator patterns found',
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:source-id-constraint-contract-check'] === `node --env-file-if-exists=.env ${SOURCE_ID_CONSTRAINT_CONTRACT_SCRIPT_PATH}`,
    'package exposes focused source-ID contract proof',
    packageJson.scripts?.['process:source-id-constraint-contract-check'] || 'missing',
  )
  addCheck(
    checks,
    verifierSource.includes('SOURCE_ID_CONSTRAINT_CONTRACT_CARD_ID') &&
      verifierSource.includes('sourceIdConstraintContractDogfood') &&
      verifierSource.includes('sourceIdConstraintContractSource') &&
      rootVerifierSource.includes('buildSourceIdConstraintContractDogfoodProof') &&
      splitVerifierScriptSource.includes('buildSourceIdConstraintContractDogfoodProof'),
    'core governance verifier is wired to source-ID constraint contract coverage',
    'core verifier, root verifier, and split proof script',
  )
  addCheck(
    checks,
    currentPlan.includes(SOURCE_ID_CONSTRAINT_CONTRACT_CLOSEOUT_KEY) &&
      currentState.includes(SOURCE_ID_CONSTRAINT_CONTRACT_CLOSEOUT_KEY),
    'rebuild current plan/state record the source-ID contract closeout',
    'docs/rebuild/current-plan.md + docs/rebuild/current-state.md',
  )
  addCheck(
    checks,
    closeoutRecords.includes(SOURCE_ID_CONSTRAINT_CONTRACT_CLOSEOUT_KEY) &&
      closeoutRecords.includes(SOURCE_ID_CONSTRAINT_CONTRACT_CARD_ID),
    'Recent Work closeout record exists',
    'lib/foundation-build-closeout-overnight-records.js',
  )

  const findings = checks.filter(check => !check.ok)
  const summary = {
    ok: findings.length === 0,
    status: findings.length ? 'blocked' : 'healthy',
    cardId: SOURCE_ID_CONSTRAINT_CONTRACT_CARD_ID,
    closeoutKey: SOURCE_ID_CONSTRAINT_CONTRACT_CLOSEOUT_KEY,
    contract: {
      auditedRelationCount: contract.auditedRelationCount,
      contractRelationCount: contract.contractRelationCount,
      classificationCounts: contract.classificationCounts,
      findings: contract.findings,
    },
    dogfood,
    checks,
    findings,
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Source-ID constraint contract proof')
    console.log(`Status: ${summary.status}`)
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} :: ${check.detail}`)
  }

  if (!summary.ok) process.exitCode = 1
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
