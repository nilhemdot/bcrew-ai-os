#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
  buildPlanCriticResultSummary,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  SOURCE_ID_ARRAY_PROVENANCE_DESIGN_APPROVAL_PATH,
  SOURCE_ID_ARRAY_PROVENANCE_DESIGN_CARD_ID,
  SOURCE_ID_ARRAY_PROVENANCE_DESIGN_CLOSEOUT_KEY,
  SOURCE_ID_ARRAY_PROVENANCE_DESIGN_PLAN_PATH,
  SOURCE_ID_ARRAY_PROVENANCE_DESIGN_SCRIPT_PATH,
  SOURCE_ID_ARRAY_PROVENANCE_DESIGN_SPRINT_ID,
  buildSourceIdArrayProvenanceDesignDogfoodProof,
  evaluateSourceIdArrayProvenanceDesign,
  getSourceIdArrayProvenanceDesignRows,
} from '../lib/source-id-array-provenance-design.js'

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

function sprintStageMap(items = []) {
  return new Map((items || []).map(item => [item.cardId, item.stage]))
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
    'CREATE' + ' TABLE',
    'CREATE' + ' TRIGGER',
    'DROP' + ' TABLE',
    'fs.' + 'writeFile',
    'write' + 'File(',
  ]
  return forbiddenTokens.every(token => !String(source || '').includes(token))
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    planText,
    moduleSource,
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
    readRepoFile(SOURCE_ID_ARRAY_PROVENANCE_DESIGN_PLAN_PATH),
    readRepoFile('lib/source-id-array-provenance-design.js'),
    readRepoFile(SOURCE_ID_ARRAY_PROVENANCE_DESIGN_SCRIPT_PATH),
    readRepoFile('package.json'),
    readRepoFile('lib/foundation-source-contract-verifier.js'),
    readRepoFile('scripts/process-verifier-source-contracts-module-check.mjs'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
    readRepoFile('lib/foundation-build-closeout-overnight-records.js'),
    readRepoFile('docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-16-source-id-array-provenance-design-closeout.md', { optional: true }),
  ])
  const packageJson = JSON.parse(packageSource)
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: SOURCE_ID_ARRAY_PROVENANCE_DESIGN_APPROVAL_PATH,
    cardId: SOURCE_ID_ARRAY_PROVENANCE_DESIGN_CARD_ID,
  })
  const [cards, planCriticRuns, activeSprint] = await Promise.all([
    getBacklogItemsByIds([SOURCE_ID_ARRAY_PROVENANCE_DESIGN_CARD_ID]),
    getPlanCriticRunsByCardIds([SOURCE_ID_ARRAY_PROVENANCE_DESIGN_CARD_ID]),
    getActiveFoundationCurrentSprint(),
  ])
  await closeFoundationDb()

  const card = cards.find(item => item.id === SOURCE_ID_ARRAY_PROVENANCE_DESIGN_CARD_ID) || null
  const stages = sprintStageMap(activeSprint.items || [])
  const cardStage = stages.get(SOURCE_ID_ARRAY_PROVENANCE_DESIGN_CARD_ID)
  const doneMode = card?.lane === 'done'
  const design = evaluateSourceIdArrayProvenanceDesign()
  const designRows = getSourceIdArrayProvenanceDesignRows()
  const dogfood = buildSourceIdArrayProvenanceDesignDogfoodProof()
  const selfReview = evaluatePlanCriticPlan({
    planText,
    card: card || { id: SOURCE_ID_ARRAY_PROVENANCE_DESIGN_CARD_ID, priority: 'P0' },
    changedFiles: [
      'lib/source-id-array-provenance-design.js',
      SOURCE_ID_ARRAY_PROVENANCE_DESIGN_SCRIPT_PATH,
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

  const proofReadOnly = scriptIsReadOnly(proofScriptSource)
  const designModuleReportOnly = scriptIsReadOnly(moduleSource) &&
    moduleSource.includes('mutationPosture') &&
    moduleSource.includes('report_only') &&
    !moduleSource.includes('pg')
  const expectedRelations = [
    'intelligence_report_artifacts.source_ids',
    'intelligence_retrieval_runs.source_ids',
    'shared_communication_synthesized_items.source_ids',
  ]
  const rowsHaveChildRegistryFk = designRows.every(row =>
    row.canonicalEnforcement === 'normalized_child_table' &&
    row.sourceRegistryTable === 'source_contract_registry' &&
    row.sourceRegistryColumn === 'source_id' &&
    row.sourceIdColumn === 'source_id' &&
    row.childTable &&
    row.parentKey &&
    row.parentFk
  )
  const rowsRejectWeakPatterns = designRows.every(row =>
    row.simpleArrayFkRejected === true &&
    row.generatedScalarProjection === 'rejected_for_canonical_enforcement' &&
    row.triggerRole === 'temporary_compatibility_guard_not_canonical' &&
    row.laterApplyPosture === 'apply_gated_schema_migration'
  )

  addCheck(checks, approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approval file is valid at 9.8+', approval.failures?.map(item => item.check).join(', ') || `score=${approval.approval?.score}`)
  addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE), 'durable Plan Critic pass row exists before build', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, selfReview.status === 'pass' && Number(selfReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE, 'approved plan passes Plan Critic with architecture rules enabled', buildPlanCriticResultSummary(selfReview))
  addCheck(checks, card && ['scoped', 'executing', 'done'].includes(card.lane), 'live backlog card exists in scoped/executing/done lane', card ? `${card.lane} / ${card.priority}` : 'missing')
  addCheck(
    checks,
    doneMode ||
      (
        activeSprint.sprint?.sprintId === SOURCE_ID_ARRAY_PROVENANCE_DESIGN_SPRINT_ID &&
        ['scoping', 'sprint_ready', 'building_now', 'done_this_sprint'].includes(cardStage)
      ),
    'card is active in Current Sprint or closed in backlog',
    doneMode ? 'backlog done' : `${activeSprint.sprint?.sprintId || 'missing'} / ${cardStage || 'missing'}`,
  )
  addCheck(checks, design.ok === true && design.selectedRelationCount === 3 && design.designRelationCount === 3, 'design selects exactly the 3 array-backed source_ids relations', `${design.selectedRelationCount}/${design.expectedRelationCount}`)
  addCheck(checks, expectedRelations.every(relation => design.selectedRelations.includes(relation)), 'design relation set is the expected array-backed set', design.selectedRelations.join(', '))
  addCheck(checks, designRows.every(row => row.valueShape === 'array' && row.column === 'source_ids' && row.classification === 'needs_schema_design'), 'scalar source_id relations are excluded', designRows.map(row => `${row.relation}:${row.valueShape}`).join(', '))
  addCheck(checks, rowsHaveChildRegistryFk, 'each design row has normalized child table plus source_contract_registry(source_id) FK target', designRows.map(row => `${row.relation}->${row.childTable}`).join(', '))
  addCheck(checks, rowsRejectWeakPatterns, 'design rejects simple array FK, generated scalar canonical projection, and trigger-only canonical truth', 'weak enforcement patterns rejected')
  addCheck(checks, dogfood.ok === true, 'dogfood rejects unsafe array provenance designs', dogfood.invariant)
  addCheck(checks, dogfood.unsafeArrayFk.findingKeys.includes('unsafe_simple_array_fk_claim'), 'dogfood rejects simple array FK claim', dogfood.unsafeArrayFk.findingKeys.join(', '))
  addCheck(checks, dogfood.missingChildFk.findingKeys.includes('missing_source_registry_fk_design'), 'dogfood rejects missing source registry FK design', dogfood.missingChildFk.findingKeys.join(', '))
  addCheck(checks, dogfood.scalarLeak.findingKeys.includes('scalar_or_extra_relation_leak'), 'dogfood rejects scalar relation leakage', dogfood.scalarLeak.findingKeys.join(', '))
  addCheck(checks, dogfood.missingBackfill.findingKeys.includes('missing_apply_gated_backfill_plan'), 'dogfood rejects missing apply-gated backfill plan', dogfood.missingBackfill.findingKeys.join(', '))
  addCheck(checks, dogfood.mutationPosture.findingKeys.includes('report_only_boundary'), 'dogfood rejects non-report-only posture', dogfood.mutationPosture.findingKeys.join(', '))
  addCheck(checks, designModuleReportOnly, 'design module is report-only and has no DB mutation/import path', 'no pg import and no DDL/write tokens')
  addCheck(checks, proofReadOnly, 'focused proof script is read-only', proofReadOnly ? 'no mutation tokens in proof script' : 'mutation token found')
  addCheck(checks, packageJson.scripts?.['process:source-id-array-provenance-design-check'] === `node --env-file-if-exists=.env ${SOURCE_ID_ARRAY_PROVENANCE_DESIGN_SCRIPT_PATH}`, 'package script exposes focused proof', 'package.json script')
  addCheck(
    checks,
    sourceContractVerifierSource.includes('SOURCE_ID_ARRAY_PROVENANCE_DESIGN_CARD_ID') &&
      sourceContractVerifierSource.includes('sourceIdArrayProvenanceDesign') &&
      sourceContractVerifierProofSource.includes('buildSourceIdArrayProvenanceDesignDogfoodProof') &&
      rootVerifierSource.includes('evaluateSourceIdArrayProvenanceDesign') &&
      rootVerifierSource.includes('sourceIdArrayProvenanceDesign'),
    'source-contract verifier and root verifier cover array provenance design',
    'verifier wiring present',
  )
  addCheck(
    checks,
    currentPlan.includes(SOURCE_ID_ARRAY_PROVENANCE_DESIGN_CARD_ID) &&
      currentState.includes(SOURCE_ID_ARRAY_PROVENANCE_DESIGN_CARD_ID),
    'rebuild current plan/state record array provenance design status',
    'docs/rebuild/current-plan.md + docs/rebuild/current-state.md',
  )
  addCheck(
    checks,
    !doneMode || (
      closeoutRecords.includes(SOURCE_ID_ARRAY_PROVENANCE_DESIGN_CLOSEOUT_KEY) &&
      closeoutRecords.includes(SOURCE_ID_ARRAY_PROVENANCE_DESIGN_CARD_ID) &&
      closeoutDoc.includes(SOURCE_ID_ARRAY_PROVENANCE_DESIGN_CLOSEOUT_KEY)
    ),
    'closeout record and handoff exist when card is done',
    doneMode ? SOURCE_ID_ARRAY_PROVENANCE_DESIGN_CLOSEOUT_KEY : 'pending done closeout',
  )

  const failures = checks.filter(check => !check.ok)
  const summary = {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'healthy',
    cardId: SOURCE_ID_ARRAY_PROVENANCE_DESIGN_CARD_ID,
    closeoutKey: SOURCE_ID_ARRAY_PROVENANCE_DESIGN_CLOSEOUT_KEY,
    design: {
      mutationPosture: design.mutationPosture,
      selectedRelationCount: design.selectedRelationCount,
      designRelationCount: design.designRelationCount,
      rows: design.rows,
    },
    dogfood,
    checks,
    failures,
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(`Source ID array provenance design proof: ${summary.ok ? 'PASS' : 'FAIL'}`)
    checks.forEach(check => console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} -> ${check.detail}`))
  }

  process.exit(summary.ok ? 0 : 1)
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error)
  process.exit(1)
})
