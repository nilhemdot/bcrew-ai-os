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
  getSourceContractRegistrySnapshot,
} from '../lib/foundation-db.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
  buildPlanCriticResultSummary,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  SOURCE_ID_SCALAR_FK_MIGRATION_APPLY_SCRIPT_PATH,
  SOURCE_ID_SCALAR_FK_MIGRATION_APPROVAL_PATH,
  SOURCE_ID_SCALAR_FK_MIGRATION_CARD_ID,
  SOURCE_ID_SCALAR_FK_MIGRATION_CLOSEOUT_KEY,
  SOURCE_ID_SCALAR_FK_MIGRATION_PLAN_PATH,
  SOURCE_ID_SCALAR_FK_MIGRATION_SCRIPT_PATH,
  SOURCE_ID_SCALAR_FK_MIGRATION_SPRINT_ID,
  buildSourceIdScalarFkDogfoodProof,
  getSourceIdScalarFkMigrationSnapshot,
  getSourceIdScalarFkRelations,
} from '../lib/source-id-scalar-fk-migration.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail: String(detail || '') })
}

async function readRepoFile(relativePath, { optional = false } = {}) {
  try {
    return await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
  } catch (error) {
    if (optional && error?.code === 'ENOENT') return ''
    throw error
  }
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
  const forbiddenTokens = [
    'create' + 'BacklogItem',
    'update' + 'BacklogItem',
    'upsert' + 'FoundationCurrentSprintOverlay',
    'INSERT' + ' INTO',
    'UPDATE' + ' foundation_',
    'DELETE' + ' FROM foundation_',
    'ALTER' + ' TABLE',
    'DROP' + ' TABLE',
    'fs.' + 'writeFile',
    'write' + 'File(',
  ]
  return forbiddenTokens.every(token => !String(source || '').includes(token))
}

function sprintStageMap(items = []) {
  return new Map((items || []).map(item => [item.cardId, item.stage]))
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    planText,
    moduleSource,
    applyScriptSource,
    proofScriptSource,
    packageSource,
    sourceContractVerifierSource,
    sourceContractVerifierProofSource,
    rootVerifierSource,
    currentPlan,
    currentState,
    closeoutRecords,
    closeoutDoc,
  ] = await Promise.all([
    readRepoFile(SOURCE_ID_SCALAR_FK_MIGRATION_PLAN_PATH),
    readRepoFile('lib/source-id-scalar-fk-migration.js'),
    readRepoFile(SOURCE_ID_SCALAR_FK_MIGRATION_APPLY_SCRIPT_PATH),
    readRepoFile(SOURCE_ID_SCALAR_FK_MIGRATION_SCRIPT_PATH),
    readRepoFile('package.json'),
    readRepoFile('lib/foundation-source-contract-verifier.js'),
    readRepoFile('scripts/process-verifier-source-contracts-module-check.mjs'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
    readRepoFile('lib/foundation-build-closeout-overnight-records.js'),
    readRepoFile('docs/handoffs/2026-05-16-source-id-scalar-fk-migration-closeout.md', { optional: true }),
  ])
  const packageJson = JSON.parse(packageSource)
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: SOURCE_ID_SCALAR_FK_MIGRATION_APPROVAL_PATH,
    cardId: SOURCE_ID_SCALAR_FK_MIGRATION_CARD_ID,
  })
  const [
    cards,
    planCriticRuns,
    activeSprint,
    registrySnapshot,
    fkSnapshot,
  ] = await Promise.all([
    getBacklogItemsByIds([SOURCE_ID_SCALAR_FK_MIGRATION_CARD_ID]),
    getPlanCriticRunsByCardIds([SOURCE_ID_SCALAR_FK_MIGRATION_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getSourceContractRegistrySnapshot(),
    getSourceIdScalarFkMigrationSnapshot(),
  ])
  await closeFoundationDb()

  const card = cards.find(item => item.id === SOURCE_ID_SCALAR_FK_MIGRATION_CARD_ID) || null
  const stages = sprintStageMap(activeSprint.items || [])
  const cardStage = stages.get(SOURCE_ID_SCALAR_FK_MIGRATION_CARD_ID)
  const doneMode = card?.lane === 'done'
  const dogfood = buildSourceIdScalarFkDogfoodProof()
  const relations = getSourceIdScalarFkRelations()
  const selfReview = evaluatePlanCriticPlan({
    planText,
    card: card || { id: SOURCE_ID_SCALAR_FK_MIGRATION_CARD_ID, priority: 'P0' },
    changedFiles: [
      'lib/source-id-scalar-fk-migration.js',
      SOURCE_ID_SCALAR_FK_MIGRATION_APPLY_SCRIPT_PATH,
      SOURCE_ID_SCALAR_FK_MIGRATION_SCRIPT_PATH,
      'lib/foundation-source-contract-verifier.js',
      'scripts/process-verifier-source-contracts-module-check.mjs',
      'scripts/foundation-verify.mjs',
      'package.json',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
      'lib/foundation-build-closeout-overnight-records.js',
    ],
    declaredRisk: planText,
    architecturalRules: true,
  })

  const applyRequiresFlag = applyScriptSource.includes('args.apply') &&
    applyScriptSource.includes('Dry-run only') &&
    /if\s*\(\s*args\.apply\s*\)/.test(applyScriptSource)
  const proofReadOnly = scriptIsReadOnly(proofScriptSource)
  const applyOwnsAlter = applyScriptSource.includes('applySourceIdScalarFksWithClient') &&
    moduleSource.includes(['ALTER', 'TABLE'].join(' ')) &&
    moduleSource.includes('VALIDATE CONSTRAINT')

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval file is valid at 9.8+', approval.failures?.map(item => item.check).join(', ') || `score=${approval.approval?.score}`)
  addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists before build', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, selfReview.status === 'pass' && Number(selfReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approved plan passes Plan Critic with architecture rules enabled', buildPlanCriticResultSummary(selfReview))
  addCheck(checks, card && ['scoped', 'executing', 'done'].includes(card.lane), 'live backlog card exists in scoped/executing/done lane', card ? `${card.lane} / ${card.priority}` : 'missing')
  addCheck(
    checks,
    doneMode ||
      (
        activeSprint.sprint?.sprintId === SOURCE_ID_SCALAR_FK_MIGRATION_SPRINT_ID &&
        ['scoping', 'sprint_ready', 'building_now', 'done_this_sprint'].includes(cardStage)
      ),
    'card is active in Current Sprint or closed in backlog',
    doneMode ? 'backlog done' : `${activeSprint.sprint?.sprintId || 'missing'} / ${cardStage || 'missing'}`,
  )
  addCheck(checks, registrySnapshot.evaluation.ok === true, 'source_contract_registry is healthy before FK enforcement', JSON.stringify(registrySnapshot.evaluation.summary))
  addCheck(checks, relations.length === 10 && relations.every(row => row.valueShape === 'scalar' && row.column === 'source_id'), 'migration relation list contains only 10 scalar source_id references', relations.map(row => row.relation).join(', '))
  addCheck(checks, dogfood.ok === true, 'dogfood rejects array-backed FK migration and unsafe identifiers', dogfood.invariant)
  addCheck(checks, fkSnapshot.invalidReferenceCount === 0, 'live scalar source_id rows all reference registered source contracts', `${fkSnapshot.invalidReferenceCount} invalid source reference(s)`)
  addCheck(checks, fkSnapshot.constraints.ok === true && fkSnapshot.constraints.validatedCount === 10, 'all scalar source_id FK constraints exist and are validated', `${fkSnapshot.constraints.validatedCount}/${fkSnapshot.constraints.expectedCount} validated`)
  addCheck(checks, fkSnapshot.arrayConstraintRows.length === 0, 'array-backed source_ids remain out of simple FK migration', `${fkSnapshot.arrayConstraintRows.length} unexpected array relation constraint(s)`)
  addCheck(checks, applyRequiresFlag, 'apply script is dry-run by default and requires --apply for schema writes', applyRequiresFlag ? 'apply gated' : 'missing apply guard')
  addCheck(checks, applyOwnsAlter, 'schema mutation is isolated to the apply-gated migration path', 'module owns ALTER/VALIDATE; proof script is read-only')
  addCheck(checks, proofReadOnly, 'focused proof script is read-only', proofReadOnly ? 'no mutation tokens in proof script' : 'mutation token found')
  addCheck(checks, packageJson.scripts?.['source-id-scalar-fks:apply'] === `node --env-file-if-exists=.env ${SOURCE_ID_SCALAR_FK_MIGRATION_APPLY_SCRIPT_PATH}` && packageJson.scripts?.['process:source-id-scalar-fk-migration-check'] === `node --env-file-if-exists=.env ${SOURCE_ID_SCALAR_FK_MIGRATION_SCRIPT_PATH}`, 'package scripts expose apply-gated migration and focused proof', 'package.json scripts')
  addCheck(
    checks,
    sourceContractVerifierSource.includes('SOURCE_ID_SCALAR_FK_MIGRATION_CARD_ID') &&
      sourceContractVerifierSource.includes('sourceIdScalarFkMigrationSnapshot') &&
      sourceContractVerifierProofSource.includes('getSourceIdScalarFkMigrationSnapshot') &&
      rootVerifierSource.includes('getSourceIdScalarFkMigrationSnapshot') &&
      rootVerifierSource.includes('sourceIdScalarFkMigrationSnapshot'),
    'source-contract verifier and root verifier cover scalar FK migration',
    'verifier wiring present',
  )
  addCheck(
    checks,
    currentPlan.includes(SOURCE_ID_SCALAR_FK_MIGRATION_CARD_ID) &&
      currentState.includes(SOURCE_ID_SCALAR_FK_MIGRATION_CARD_ID),
    'rebuild current plan/state record scalar FK migration status',
    'docs/rebuild/current-plan.md + docs/rebuild/current-state.md',
  )
  addCheck(
    checks,
    !doneMode || (
      closeoutRecords.includes(SOURCE_ID_SCALAR_FK_MIGRATION_CLOSEOUT_KEY) &&
      closeoutRecords.includes(SOURCE_ID_SCALAR_FK_MIGRATION_CARD_ID) &&
      closeoutDoc.includes(SOURCE_ID_SCALAR_FK_MIGRATION_CLOSEOUT_KEY)
    ),
    'closeout record and handoff exist when card is done',
    doneMode ? SOURCE_ID_SCALAR_FK_MIGRATION_CLOSEOUT_KEY : 'pending done closeout',
  )

  const failures = checks.filter(check => !check.ok)
  const summary = {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    cardId: SOURCE_ID_SCALAR_FK_MIGRATION_CARD_ID,
    closeoutKey: SOURCE_ID_SCALAR_FK_MIGRATION_CLOSEOUT_KEY,
    constraints: fkSnapshot.constraints,
    invalidReferenceCount: fkSnapshot.invalidReferenceCount,
    dogfood,
    checks,
    failures,
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(`Source ID scalar FK migration proof: ${summary.ok ? 'PASS' : 'FAIL'}`)
    checks.forEach(check => console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} -> ${check.detail}`))
  }

  process.exit(summary.ok ? 0 : 1)
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error)
  process.exit(1)
})
