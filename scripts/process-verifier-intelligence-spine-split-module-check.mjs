#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
  getActionRouterSnapshot,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getIntelligenceAtomSpineSnapshot,
  getIntelligenceJobLedgerSnapshot,
  getIntelligenceRetrievalSnapshot,
  getPlanCriticRunsByCardIds,
  getSynthesisEngineSnapshot,
  getSynthesisFactsSnapshot,
} from '../lib/foundation-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_APPROVAL_PATH,
  VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_BEFORE_LINES,
  VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_CARD_ID,
  VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_CLOSEOUT_KEY,
  VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_SPRINT_ID,
  buildFoundationIntelligenceSpineVerifierDogfoodProof,
  evaluateFoundationIntelligenceSpineVerifier,
} from '../lib/foundation-intelligence-spine-verifier.js'
import { readFoundationBacklogSeedSourceBundle } from '../lib/foundation-backlog-seed-source.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readText(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readJson(relativePath) {
  return JSON.parse(await readText(relativePath))
}

async function readTextIfExists(relativePath) {
  try {
    return await readText(relativePath)
  } catch (error) {
    if (error?.code === 'ENOENT') return ''
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

async function loadEvaluationInput() {
  const [
    foundationDbSource,
    foundationBacklogSeedSource,
    extractionTargetSource,
    intelligenceJobProofSource,
    intelligenceSalvageSpecSource,
    strategyHubManifestSource,
    currentPlan,
    intelligencePipelineSource,
    intelligenceAtomsSource,
    packageSource,
    intelligenceAtomProofSource,
    intelligenceRetrievalSource,
    llmRouterSource,
    intelligenceRetrievalProofSource,
    intelligenceSemanticRetrievalProofSource,
    intelligenceHybridRetrievalProofSource,
    serverSource,
    intelligenceRetrievalEvalSource,
    intelligenceRetrievalEvalFixture,
    intelligenceSynthesisFactsSource,
    intelligenceSynthesisFactsProofSource,
    intelligenceSynthesisSource,
    intelligenceSynthesisProofSource,
    intelligenceActionRouterSource,
    foundationJobsSource,
    intelligenceActionRouterProofSource,
    intelligenceJobLedgerSnapshot,
    intelligenceAtomSpineSnapshot,
    intelligenceRetrievalSnapshot,
    synthesisFactsSnapshot,
    synthesisEngineSnapshot,
    actionRouterSnapshot,
  ] = await Promise.all([
    readText('lib/foundation-db.js'),
    readFoundationBacklogSeedSourceBundle({ readRepoFile: readText }),
    readText('scripts/run-extraction-target.mjs'),
    readText('scripts/intelligence-job-ledger-proof.mjs'),
    readTextIfExists('docs/specs/2026-04-27-intelligence-spine-old-system-salvage.md'),
    readText('docs/specs/2026-04-27-strategy-hub-v2-source-to-gap-manifest.md'),
    readText('docs/rebuild/current-plan.md'),
    readText('docs/rebuild/intelligence-pipeline.md'),
    readText('lib/intelligence-atoms.js'),
    readText('package.json'),
    readText('scripts/intelligence-atom-spine-proof.mjs'),
    readText('lib/intelligence-retrieval.js'),
    readText('lib/llm-router.js'),
    readText('scripts/intelligence-retrieval-proof.mjs'),
    readText('scripts/intelligence-semantic-retrieval-proof.mjs'),
    readText('scripts/intelligence-hybrid-retrieval-proof.mjs'),
    readText('server.js'),
    readText('scripts/intelligence-retrieval-eval.mjs'),
    readJson('docs/specs/2026-04-27-intelligence-retrieval-eval-baseline.json'),
    readText('lib/intelligence-synthesis-facts.js'),
    readText('scripts/intelligence-synthesis-facts-proof.mjs'),
    readText('lib/intelligence-synthesis.js'),
    readText('scripts/intelligence-synthesis-engine-proof.mjs'),
    readText('lib/intelligence-action-router.js'),
    readText('lib/foundation-jobs.js'),
    readText('scripts/intelligence-action-router-proof.mjs'),
    getIntelligenceJobLedgerSnapshot({ limit: 20 }),
    getIntelligenceAtomSpineSnapshot({ limit: 20 }),
    getIntelligenceRetrievalSnapshot({ limit: 20 }),
    getSynthesisFactsSnapshot({ limit: 20 }),
    getSynthesisEngineSnapshot({ limit: 20 }),
    getActionRouterSnapshot({ limit: 40 }),
  ])

  return {
    foundationDbSource,
    foundationDbWithBacklogSeedSource: `${foundationDbSource}\n${foundationBacklogSeedSource}`,
    extractionTargetSource,
    intelligenceJobProofSource,
    intelligenceJobLedgerSnapshot,
    intelligenceSalvageSpecSource,
    strategyHubManifestSource,
    currentPlan,
    intelligencePipelineSource,
    intelligenceAtomsSource,
    packageSource,
    intelligenceAtomProofSource,
    intelligenceAtomSpineSnapshot,
    intelligenceRetrievalSource,
    intelligenceRetrievalProofSource,
    intelligenceRetrievalSnapshot,
    llmRouterSource,
    intelligenceSemanticRetrievalProofSource,
    intelligenceHybridRetrievalProofSource,
    serverSource,
    intelligenceRetrievalEvalSource,
    intelligenceRetrievalEvalFixture,
    intelligenceSynthesisFactsSource,
    intelligenceSynthesisFactsProofSource,
    synthesisFactsSnapshot,
    intelligenceSynthesisSource,
    intelligenceSynthesisProofSource,
    synthesisEngineSnapshot,
    intelligenceActionRouterSource,
    foundationJobsSource,
    intelligenceActionRouterProofSource,
    actionRouterSnapshot,
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    approval,
    cards,
    activeSprint,
    planCriticRuns,
    input,
    foundationVerifySource,
    moduleSource,
    proofScriptSource,
    planSource,
    packageSource,
    currentState,
  ] = await Promise.all([
    validatePlanApprovalFile({
      approvalRef: VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_APPROVAL_PATH,
      cardId: VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_CARD_ID,
    }),
    getBacklogItemsByIds([VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_CARD_ID]),
    loadEvaluationInput(),
    readText('scripts/foundation-verify.mjs'),
    readText('lib/foundation-intelligence-spine-verifier.js'),
    readText(VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_SCRIPT_PATH),
    readText(VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_PLAN_PATH),
    readText('package.json'),
    readText('docs/rebuild/current-state.md'),
  ])
  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_CARD_ID) || null
  const liveEvaluation = evaluateFoundationIntelligenceSpineVerifier(input)
  const dogfood = buildFoundationIntelligenceSpineVerifierDogfoodProof()
  const closeout = getFoundationBuildCloseouts().find(item => item.key === VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_CLOSEOUT_KEY) || null
  const foundationVerifyLines = lineCount(foundationVerifySource)

  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog has intelligence-spine verifier split card in executing or done', card ? `${card.lane} / ${card.priority}` : 'missing card')
  addCheck(checks, approval.ok === true && approval.mode === 'v2' && Number(approval.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approval.ok ? `${approval.mode} / ${approval.approval?.score}` : approval.failures?.map(item => item.detail).join('; '))
  addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8), 'Plan Critic pass row exists', `${planCriticRuns.length} run(s)`)
  addCheck(
    checks,
    activeSprint?.sprint?.sprintId === VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_SPRINT_ID ||
      card?.lane === 'done',
    'Current Sprint points to this card while active or card is historically done',
    activeSprint?.sprint?.sprintId || 'missing active sprint',
  )
  for (const check of liveEvaluation.checks) addCheck(checks, check.ok, check.check, check.detail)
  addCheck(
    checks,
    dogfood.ok === true &&
      dogfood.rejected.missingLedger.ok === false &&
      dogfood.rejected.missingTierGuard.ok === false &&
      dogfood.rejected.missingApprovalGate.ok === false &&
      dogfood.rejected.missingSynthesisEvidence.ok === false,
    'dogfood rejects intelligence-spine verifier failures',
    dogfood.dogfoodInvariant,
  )
  addCheck(
    checks,
    scriptIsReadOnly(proofScriptSource),
    'focused proof script is read-only',
    'no DB write helpers, SQL mutation statements, or fs write calls',
  )
  addCheck(
    checks,
    packageJson.scripts?.['process:verifier-intelligence-spine-split-module-check'] === `node --env-file-if-exists=.env ${VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_SCRIPT_PATH}`,
    'package script is registered',
    packageJson.scripts?.['process:verifier-intelligence-spine-split-module-check'] || 'missing',
  )
  addCheck(
    checks,
    await repoFileExists(VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_PLAN_PATH) &&
      await repoFileExists(VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_APPROVAL_PATH),
    'plan and approval files exist',
    `${VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_PLAN_PATH} / ${VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_APPROVAL_PATH}`,
  )
  addCheck(
    checks,
    foundationVerifyLines < VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_BEFORE_LINES,
    'root verifier line count decreased',
    `${VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_BEFORE_LINES}->${foundationVerifyLines}`,
  )
  addCheck(
    checks,
    moduleSource.includes('evaluateFoundationIntelligenceSpineVerifier') &&
      moduleSource.includes('evaluateFoundationIntelligenceSpineVerifierOrchestration') &&
      moduleSource.includes('buildFoundationIntelligenceSpineVerifierDogfoodProof') &&
      proofScriptSource.includes('dogfood rejects intelligence-spine verifier failures'),
    'module and proof script own the extracted behavior',
    `moduleLines=${lineCount(moduleSource)} proofLines=${lineCount(proofScriptSource)}`,
  )
  addCheck(
    checks,
    (foundationVerifySource.includes('evaluateFoundationIntelligenceSpineVerifier({') ||
      foundationVerifySource.includes('evaluateFoundationIntelligenceSpineVerifierOrchestration({')) &&
      (foundationVerifySource.includes('intelligenceSpineVerifier.checks') ||
        foundationVerifySource.includes('intelligenceSpineOrchestrationVerifier.checks')) &&
      !/addCheck\(\s*checks,[\s\S]{0,1200}'INTEL-JOBS-001 intelligence job ledger is schema-backed and wired into governed extraction'/.test(foundationVerifySource) &&
      !/addCheck\(\s*checks,[\s\S]{0,1200}'ACTION-ROUTER-001 creates approval-gated routes with owner and provenance before Strategy Hub resumes'/.test(foundationVerifySource),
    'root verifier delegates intelligence-spine rows instead of keeping old inline predicates',
    'delegation present and old inline bookend labels absent',
  )
  addCheck(
    checks,
    !card || card.lane !== 'done' || (
      String(card.statusNote || '').includes(VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_CLOSEOUT_KEY) &&
      closeout?.operatorCloseout === true &&
      (closeout.backlogIds || []).includes(VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_CARD_ID) &&
      await repoFileExists('docs/handoffs/2026-05-16-verifier-intelligence-spine-split-module-closeout.md') &&
      currentState.includes(VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_CLOSEOUT_KEY)
    ),
    'done closeout is exact when card is closed',
    card?.lane === 'done' ? (closeout?.key || 'missing closeout') : 'not closed yet',
  )
  addCheck(checks, planSource.includes('Gate decision tree') && planSource.includes('Dogfood proof recreates'), 'plan documents gate decision and dogfood proof', 'plan has required proof posture')

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    cardId: VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_CARD_ID,
    closeoutKey: VERIFIER_INTELLIGENCE_SPINE_SPLIT_MODULE_CLOSEOUT_KEY,
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
      foundationVerifyLines,
      liveChecks: liveEvaluation.summary,
    },
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Verifier intelligence-spine split module proof: ${result.summary.passed}/${result.summary.total}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }

  if (!result.ok) process.exitCode = 1
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.stack : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
