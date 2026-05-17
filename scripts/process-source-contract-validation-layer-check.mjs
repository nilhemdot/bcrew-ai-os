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
  SOURCE_CONTRACT_VALIDATION_LAYER_APPROVAL_PATH,
  SOURCE_CONTRACT_VALIDATION_LAYER_CARD_ID,
  SOURCE_CONTRACT_VALIDATION_LAYER_CLOSEOUT_KEY,
  SOURCE_CONTRACT_VALIDATION_LAYER_CLOSEOUT_PATH,
  SOURCE_CONTRACT_VALIDATION_LAYER_PLAN_PATH,
  SOURCE_CONTRACT_VALIDATION_LAYER_SCRIPT_PATH,
  SOURCE_CONTRACT_VALIDATION_LAYER_SPRINT_ID,
  assertSourceContractAllowsExtraction,
  buildSourceContractValidationLayerDogfoodProof,
  evaluateSourceContractValidationLayer,
} from '../lib/source-contract-validation-layer.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getExtractionControlSnapshot,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'
import {
  validateExistingWorkCheck,
} from '../lib/foundation-current-sprint.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath, { optional = false } = {}) {
  try {
    return await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
  } catch (error) {
    if (optional && error?.code === 'ENOENT') return ''
    throw error
  }
}

function scriptIsReadOnly(source = '') {
  return !/updateBacklogItem\s*\(|createBacklogItem\s*\(|upsertFoundationCurrentSprintOverlay\s*\(|INSERT\s+INTO\s+backlog_items|UPDATE\s+backlog_items|DELETE\s+FROM\s+backlog_items|INSERT\s+INTO\s+plan_critic_runs|UPDATE\s+foundation_sprints|DELETE\s+FROM\s+foundation_sprint_items|syncSourceContractRegistryTable\s*\(|finishFoundationJobRun\s*\(|createFoundationJobRun\s*\(|send[A-Za-z]*Email\s*\(|writeFile\s*\(|fs\.writeFile/i.test(source)
}

function sourceHasAll(source = '', patterns = []) {
  return patterns.every(pattern => source.includes(pattern))
}

function avoidsExternalWriteJobCommands(source = '') {
  const forbidden = [
    ['agent', 'feedback:auto', 'send'].join('-'),
    ['agent', 'feedback', 'auto', 'send'].join('-'),
    ['g', 'mail'].join('') + '.*' + ['s', 'end'].join(''),
    ['click', 'up'].join('') + '.*' + ['w', 'rite'].join(''),
  ].map(pattern => new RegExp(pattern, 'i'))
  return !forbidden.some(pattern => pattern.test(source))
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    approval,
    cards,
    sprint,
    planCriticRuns,
    extractionControl,
    packageSource,
    planSource,
    scriptSource,
    moduleSource,
    sourceContractVerifierSource,
    foundationVerifySource,
    sourceRegistryDoc,
    currentStateDoc,
    closeoutRecordsSource,
    closeoutDoc,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: SOURCE_CONTRACT_VALIDATION_LAYER_APPROVAL_PATH,
      cardId: SOURCE_CONTRACT_VALIDATION_LAYER_CARD_ID,
    }),
    getBacklogItemsByIds([SOURCE_CONTRACT_VALIDATION_LAYER_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([SOURCE_CONTRACT_VALIDATION_LAYER_CARD_ID]),
    getExtractionControlSnapshot({ limit: 300 }),
    readRepoFile('package.json'),
    readRepoFile(SOURCE_CONTRACT_VALIDATION_LAYER_PLAN_PATH),
    readRepoFile(SOURCE_CONTRACT_VALIDATION_LAYER_SCRIPT_PATH),
    readRepoFile('lib/source-contract-validation-layer.js'),
    readRepoFile('lib/foundation-source-contract-verifier.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile('docs/source-registry.md'),
    readRepoFile('docs/rebuild/current-state.md'),
    readRepoFile('lib/foundation-build-closeout-cleanup-records.js'),
    readRepoFile(SOURCE_CONTRACT_VALIDATION_LAYER_CLOSEOUT_PATH, { optional: true }),
  ])
  await closeFoundationDb()

  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === SOURCE_CONTRACT_VALIDATION_LAYER_CARD_ID) || null
  const sprintItem = (sprint.items || []).find(item => item.cardId === SOURCE_CONTRACT_VALIDATION_LAYER_CARD_ID) || null
  const selfReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: card || { id: SOURCE_CONTRACT_VALIDATION_LAYER_CARD_ID, priority: 'P0' },
    changedFiles: [
      'lib/source-contract-validation-layer.js',
      'lib/foundation-source-contract-verifier.js',
      'scripts/process-source-contract-validation-layer-check.mjs',
      'scripts/foundation-verify.mjs',
      'package.json',
      'docs/source-registry.md',
      'docs/rebuild/current-state.md',
      'lib/foundation-build-closeout-cleanup-records.js',
      SOURCE_CONTRACT_VALIDATION_LAYER_PLAN_PATH,
      SOURCE_CONTRACT_VALIDATION_LAYER_APPROVAL_PATH,
      SOURCE_CONTRACT_VALIDATION_LAYER_CLOSEOUT_PATH,
    ],
    declaredRisk: planSource,
    architecturalRules: true,
  })
  const liveValidation = evaluateSourceContractValidationLayer({
    extractionTargets: extractionControl.targets || [],
    sourceRegistryText: sourceRegistryDoc,
    currentStateText: currentStateDoc,
  })
  const dogfood = buildSourceContractValidationLayerDogfoodProof()
  const authRequiredExtractionGate = assertSourceContractAllowsExtraction('SRC-SKOOL-001', liveValidation)
  const planCriticPass = planCriticRuns.some(run =>
    run.cardId === SOURCE_CONTRACT_VALIDATION_LAYER_CARD_ID &&
      run.status === 'pass' &&
      Number(run.score) >= PLAN_CRITIC_MIN_PASS_SCORE
  )
  const packageScript = packageJson.scripts?.['process:source-contract-validation-layer-check']
  const sprintItemReadiness = validateExistingWorkCheck(sprintItem?.existingWorkCheck || {})
  const sprintNotNextText = (sprintItem?.notNextBoundaries || []).join('\n')
  const closeoutRegistered =
    closeoutRecordsSource.includes(SOURCE_CONTRACT_VALIDATION_LAYER_CLOSEOUT_KEY) &&
    closeoutRecordsSource.includes(SOURCE_CONTRACT_VALIDATION_LAYER_CARD_ID) &&
    closeoutRecordsSource.includes(SOURCE_CONTRACT_VALIDATION_LAYER_CLOSEOUT_PATH)
  const activeSprintOwnsCard =
    sprint.sprint?.sprintId === SOURCE_CONTRACT_VALIDATION_LAYER_SPRINT_ID &&
      ['building_now', 'done_this_sprint'].includes(sprintItem?.stage)
  const historicalCloseoutOwnsCard =
    card?.lane === 'done' &&
      closeoutRegistered &&
      closeoutDoc.includes(SOURCE_CONTRACT_VALIDATION_LAYER_CARD_ID) &&
      closeoutDoc.includes(SOURCE_CONTRACT_VALIDATION_LAYER_CLOSEOUT_KEY)

  addCheck(
    checks,
    approval.ok && Number(approval.approval?.score) >= PLAN_CRITIC_MIN_PASS_SCORE,
    'approval file validates at 9.8+',
    approval.failures?.map(item => item.check).join(', ') || SOURCE_CONTRACT_VALIDATION_LAYER_APPROVAL_PATH,
  )
  addCheck(
    checks,
    selfReview.status === 'pass' && Number(selfReview.score) >= PLAN_CRITIC_MIN_PASS_SCORE,
    'approved plan passes Plan Critic with architecture rules enabled',
    buildPlanCriticResultSummary(selfReview),
  )
  addCheck(
    checks,
    planCriticPass,
    'durable Plan Critic pass row exists',
    planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing',
  )
  addCheck(
    checks,
    card && ['scoped', 'executing', 'done'].includes(card.lane) && card.priority === 'P0',
    'existing live backlog card is used',
    card ? `${card.id}/${card.lane}/${card.priority}` : 'missing',
  )
  addCheck(
    checks,
    activeSprintOwnsCard || historicalCloseoutOwnsCard,
    'Current Sprint truth or historical closeout owns the validation-layer card',
    activeSprintOwnsCard
      ? `${sprint.sprint?.sprintId}/${sprintItem?.stage || 'missing'}`
      : historicalCloseoutOwnsCard
        ? SOURCE_CONTRACT_VALIDATION_LAYER_CLOSEOUT_KEY
        : sprint.sprint ? `${sprint.sprint.sprintId}/${sprintItem?.stage || 'missing'}` : 'missing sprint',
  )
  addCheck(
    checks,
    historicalCloseoutOwnsCard || (
      sprintItemReadiness.ok &&
        /MEETING-VAULT-ACL-001 Phase B/.test(sprintNotNextText) &&
        /Drive permissions/.test(sprintNotNextText)
    ),
    'Current Sprint metadata has complete existing-work and Drive guardrails',
    historicalCloseoutOwnsCard
      ? SOURCE_CONTRACT_VALIDATION_LAYER_CLOSEOUT_KEY
      : sprintItemReadiness.ok ? 'complete' : `missing ${sprintItemReadiness.missingFields.join(', ')}`,
  )
  addCheck(
    checks,
    liveValidation.ok &&
      liveValidation.summary.contractCount >= 39 &&
      liveValidation.summary.passed === liveValidation.summary.contractCount &&
      liveValidation.summary.activeAuthRequiredExtractionTargetCount === 0,
    'live source contracts validate fail-closed',
    JSON.stringify(liveValidation.summary),
  )
  addCheck(
    checks,
    dogfood.ok,
    'dogfood rejects thin/unsafe source contracts',
    dogfood.invariant,
  )
  addCheck(
    checks,
    authRequiredExtractionGate.ok === false &&
      /blocked/i.test(authRequiredExtractionGate.reason || ''),
    'auth-required source does not pass extraction gate',
    authRequiredExtractionGate.reason || 'missing reason',
  )
  addCheck(
    checks,
    sourceHasAll(moduleSource, [
      'evaluateSourceContractValidationLayer',
      'assertSourceContractAllowsExtraction',
      'buildSourceContractValidationLayerDogfoodProof',
      'SOURCE_CONTRACT_VALIDATION_PROFILES',
      'activeAuthRequiredExtractionTargetCount',
    ]),
    'validation module owns evaluator, extraction gate, profiles, and dogfood',
    'lib/source-contract-validation-layer.js',
  )
  addCheck(
    checks,
    sourceHasAll(sourceContractVerifierSource, [
      'evaluateSourceContractValidationLayer',
      'buildSourceContractValidationLayerDogfoodProof',
      'SOURCE_CONTRACT_VALIDATION_LAYER_CARD_ID',
    ]),
    'source-contract verifier includes validation-layer coverage',
    'lib/foundation-source-contract-verifier.js',
  )
  addCheck(
    checks,
    foundationVerifySource.includes('evaluateFoundationSourceContractVerifierOrchestration({'),
    'root foundation verifier delegates through source-contract verifier orchestration',
    'scripts/foundation-verify.mjs',
  )
  addCheck(
    checks,
    foundationVerifySource.includes('knownLaterFoundationProgressionBlockers') &&
      foundationVerifySource.includes(SOURCE_CONTRACT_VALIDATION_LAYER_CARD_ID),
    'root foundation verifier recognizes source-contract validation as current sprint progression',
    SOURCE_CONTRACT_VALIDATION_LAYER_CARD_ID,
  )
  addCheck(
    checks,
    sourceRegistryDoc.includes(SOURCE_CONTRACT_VALIDATION_LAYER_CARD_ID) &&
      sourceRegistryDoc.includes('blocked source contracts must carry blocker, reason, and next action'),
    'source registry documents validation layer',
    'docs/source-registry.md',
  )
  addCheck(
    checks,
    currentStateDoc.includes(SOURCE_CONTRACT_VALIDATION_LAYER_CARD_ID) &&
      currentStateDoc.includes('thin source contracts now fail closed before connector or extractor work depends on them'),
    'current-state documents validation layer',
    'docs/rebuild/current-state.md',
  )
  addCheck(
    checks,
    closeoutRegistered &&
      closeoutDoc.includes(SOURCE_CONTRACT_VALIDATION_LAYER_CARD_ID) &&
      closeoutDoc.includes(SOURCE_CONTRACT_VALIDATION_LAYER_CLOSEOUT_KEY),
    'closeout registry and handoff own the sprint',
    closeoutRegistered ? SOURCE_CONTRACT_VALIDATION_LAYER_CLOSEOUT_KEY : 'missing closeout registry record',
  )
  addCheck(
    checks,
    packageScript === `node --env-file-if-exists=.env ${SOURCE_CONTRACT_VALIDATION_LAYER_SCRIPT_PATH}`,
    'package script is registered',
    packageScript || 'missing',
  )
  addCheck(
    checks,
    scriptIsReadOnly(scriptSource),
    'focused proof is read-only and avoids external writes',
    SOURCE_CONTRACT_VALIDATION_LAYER_SCRIPT_PATH,
  )
  addCheck(
    checks,
    avoidsExternalWriteJobCommands(scriptSource),
    'focused proof does not run live Agent Feedback auto-send or external-write jobs',
    'clean',
  )

  const failures = checks.filter(check => !check.ok)
  const output = {
    ok: failures.length === 0,
    cardId: SOURCE_CONTRACT_VALIDATION_LAYER_CARD_ID,
    closeoutKey: SOURCE_CONTRACT_VALIDATION_LAYER_CLOSEOUT_KEY,
    checks,
    failures,
    summary: liveValidation.summary,
    authRequiredExtractionGate,
    dogfood: {
      ok: dogfood.ok,
      invariant: dogfood.invariant,
    },
    currentSprint: {
      sprintId: sprint.sprint?.sprintId || null,
      stage: sprintItem?.stage || null,
    },
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    console.log(`Source contract validation layer check: ${output.ok ? 'PASS' : 'FAIL'}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }
  if (failures.length) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
