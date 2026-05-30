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
  VERIFIER_SERVER_ROUTE_SPLIT_MODULE_APPROVAL_PATH,
  VERIFIER_SERVER_ROUTE_SPLIT_MODULE_BEFORE_LINES,
  VERIFIER_SERVER_ROUTE_SPLIT_MODULE_CARD_ID,
  VERIFIER_SERVER_ROUTE_SPLIT_MODULE_CLOSEOUT_KEY,
  VERIFIER_SERVER_ROUTE_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_SERVER_ROUTE_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_SERVER_ROUTE_SPLIT_MODULE_SPRINT_ID,
  buildFoundationServerRouteSplitVerifierDogfoodProof,
  evaluateFoundationServerRouteSplitVerifier,
} from '../lib/foundation-server-route-split-verifier.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readText(relativePath) {
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

async function loadVerifierInput() {
  const [
    foundationVerifySource,
    packageSource,
    currentPlan,
    currentState,
    serverSource,
    fubSourceRoutesSource,
    fubSourceRouteSplitScriptSource,
    fubSourceRouteSplitPlanSource,
    foundationRuntimeReadRoutesSource,
    foundationRuntimeReadRoutesSplitScriptSource,
    foundationRuntimeReadRoutesSplitPlanSource,
    appPageRoutesSource,
    appPageRoutesSplitScriptSource,
    appPageRoutesSplitPlanSource,
    authRoutesSource,
    authRoutesSplitScriptSource,
    authRoutesSplitPlanSource,
    hubReadRoutesSource,
    hubReadRoutesSplitScriptSource,
    hubReadRoutesSplitPlanSource,
    strategySharedCommsRoutesSource,
    strategySharedCommsRoutesSplitScriptSource,
    strategySharedCommsRoutesSplitPlanSource,
    foundationWriteRoutesSource,
    foundationWriteRoutesSplitScriptSource,
    foundationWriteRoutesSplitPlanSource,
    agentFeedbackRoutesSource,
    agentFeedbackRoutesSplitScriptSource,
    agentFeedbackRoutesSplitPlanSource,
    moduleSource,
    proofScriptSource,
    planSource,
  ] = await Promise.all([
    readText('scripts/foundation-verify.mjs'),
    readText('package.json'),
    readText('docs/rebuild/current-plan.md'),
    readText('docs/rebuild/current-state.md'),
    readText('server.js'),
    readText('lib/fub-source-routes.js'),
    readText('scripts/process-fub-source-route-split-check.mjs'),
    readText('docs/process/fub-source-route-split-001-plan.md'),
    readText('lib/foundation-runtime-read-routes.js'),
    readText('scripts/process-foundation-runtime-read-routes-split-check.mjs'),
    readText('docs/process/foundation-runtime-read-routes-split-001-plan.md'),
    readText('lib/app-page-routes.js'),
    readText('scripts/process-app-page-routes-split-check.mjs'),
    readText('docs/process/app-page-routes-split-001-plan.md'),
    readText('lib/auth-routes.js'),
    readText('scripts/process-auth-routes-split-check.mjs'),
    readText('docs/process/auth-routes-split-001-plan.md'),
    readText('lib/hub-read-routes.js'),
    readText('scripts/process-hub-read-routes-split-check.mjs'),
    readText('docs/process/hub-read-routes-split-001-plan.md'),
    readText('lib/strategy-shared-comms-routes.js'),
    readText('scripts/process-strategy-shared-comms-routes-split-check.mjs'),
    readText('docs/process/strategy-shared-comms-routes-split-001-plan.md'),
    readText('lib/foundation-write-routes.js'),
    readText('scripts/process-foundation-write-routes-split-check.mjs'),
    readText('docs/process/foundation-write-routes-split-001-plan.md'),
    readText('lib/agent-feedback-routes.js'),
    readText('scripts/process-agent-feedback-routes-split-check.mjs'),
    readText('docs/process/agent-feedback-routes-split-001-plan.md'),
    readText('lib/foundation-server-route-split-verifier.js'),
    readText(VERIFIER_SERVER_ROUTE_SPLIT_MODULE_SCRIPT_PATH),
    readText(VERIFIER_SERVER_ROUTE_SPLIT_MODULE_PLAN_PATH),
  ])
  const activeFoundationSprint = await getActiveFoundationCurrentSprint()
  const activeSprintAtOrPast = cardIds =>
    (activeFoundationSprint.items || []).some(item =>
      (cardIds || []).includes(item.cardId) &&
        ['building_now', 'done_this_sprint'].includes(item.stage)
    )

  return {
    foundationHub: {
      backlogItems: await getBacklogItemsByIds([
        VERIFIER_SERVER_ROUTE_SPLIT_MODULE_CARD_ID,
        'FUB-SOURCE-ROUTE-SPLIT-001',
        'FOUNDATION-RUNTIME-READ-ROUTES-SPLIT-001',
        'APP-PAGE-ROUTES-SPLIT-001',
        'AUTH-ROUTES-SPLIT-001',
        'HUB-READ-ROUTES-SPLIT-001',
        'STRATEGY-SHARED-COMMS-ROUTES-SPLIT-001',
        'FOUNDATION-WRITE-ROUTES-SPLIT-001',
        'AGENT-FEEDBACK-ROUTES-SPLIT-001',
      ]),
    },
    foundationBuildCloseouts: (await import('../lib/foundation-build-log.js')).getFoundationBuildCloseouts(),
    packageJson: JSON.parse(packageSource),
    currentPlan,
    currentState,
    activeFoundationSprint,
    activeSprintAtOrPast,
    foundationVerifySource,
    serverSource,
    fubSourceRoutesSource,
    fubSourceRouteSplitScriptSource,
    fubSourceRouteSplitPlanSource,
    foundationRuntimeReadRoutesSource,
    foundationRuntimeReadRoutesSplitScriptSource,
    foundationRuntimeReadRoutesSplitPlanSource,
    appPageRoutesSource,
    appPageRoutesSplitScriptSource,
    appPageRoutesSplitPlanSource,
    authRoutesSource,
    authRoutesSplitScriptSource,
    authRoutesSplitPlanSource,
    hubReadRoutesSource,
    hubReadRoutesSplitScriptSource,
    hubReadRoutesSplitPlanSource,
    strategySharedCommsRoutesSource,
    strategySharedCommsRoutesSplitScriptSource,
    strategySharedCommsRoutesSplitPlanSource,
    foundationWriteRoutesSource,
    foundationWriteRoutesSplitScriptSource,
    foundationWriteRoutesSplitPlanSource,
    agentFeedbackRoutesSource,
    agentFeedbackRoutesSplitScriptSource,
    agentFeedbackRoutesSplitPlanSource,
    foundationWriteRouteSource: `${serverSource}\n${foundationWriteRoutesSource}`,
    agentFeedbackRouteSource: `${serverSource}\n${agentFeedbackRoutesSource}`,
    moduleSource,
    proofScriptSource,
    planSource,
    repoFileExists,
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
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: VERIFIER_SERVER_ROUTE_SPLIT_MODULE_APPROVAL_PATH,
      cardId: VERIFIER_SERVER_ROUTE_SPLIT_MODULE_CARD_ID,
    }),
    getBacklogItemsByIds([VERIFIER_SERVER_ROUTE_SPLIT_MODULE_CARD_ID]),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([VERIFIER_SERVER_ROUTE_SPLIT_MODULE_CARD_ID]),
    loadVerifierInput(),
  ])

  const card = cards[0] || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === VERIFIER_SERVER_ROUTE_SPLIT_MODULE_CARD_ID) || null
  const planCritic = planCriticRuns.find(run => run.cardId === VERIFIER_SERVER_ROUTE_SPLIT_MODULE_CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8) || null
  const evaluation = await evaluateFoundationServerRouteSplitVerifier(input)
  const dogfood = await buildFoundationServerRouteSplitVerifierDogfoodProof(input)
  const verifierLines = lineCount(input.foundationVerifySource)

  addCheck(checks, approval.ok, 'Plan approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || VERIFIER_SERVER_ROUTE_SPLIT_MODULE_APPROVAL_PATH)
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, activeSprint.sprint?.sprintId === VERIFIER_SERVER_ROUTE_SPLIT_MODULE_SPRINT_ID, 'Current Sprint is the verifier server-route split module sprint', activeSprint.sprint?.sprintId || 'missing')
  addCheck(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains the card in Building Now or Done', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  addCheck(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  addCheck(checks, input.moduleSource.includes('evaluateFoundationServerRouteSplitVerifier') && input.moduleSource.includes('buildFoundationServerRouteSplitVerifierDogfoodProof'), 'new module owns server-route split verifier logic', 'lib/foundation-server-route-split-verifier.js')
  addCheck(checks, evaluation.ok, 'server-route split verifier module passes current route split state', `${evaluation.summary.passed}/${evaluation.summary.total}`)
  addCheck(checks, dogfood.ok, 'dogfood rejects old server-route split verifier failures', dogfood.invariant)
  addCheck(checks, dogfood.rejected?.missingModule, 'dogfood rejects missing route module ownership', JSON.stringify(dogfood.rejected || {}))
  addCheck(checks, dogfood.rejected?.oldInlineServer, 'dogfood rejects old inline server route ownership', JSON.stringify(dogfood.rejected || {}))
  addCheck(checks, dogfood.rejected?.missingRegistrar, 'dogfood rejects missing server registrar delegation', JSON.stringify(dogfood.rejected || {}))
  addCheck(checks, dogfood.rejected?.movedOutOfScope, 'dogfood rejects moved out-of-scope routes', JSON.stringify(dogfood.rejected || {}))
  addCheck(checks, dogfood.rejected?.weakProof, 'dogfood rejects weak substring-only proof', JSON.stringify(dogfood.rejected || {}))
  addCheck(checks, input.foundationVerifySource.includes('evaluateFoundationServerRouteSplitVerifier') && input.foundationVerifySource.includes('buildFoundationServerRouteSplitVerifierDogfoodProof'), 'foundation verifier delegates server-route split checks to focused module', 'evaluateFoundationServerRouteSplitVerifier')
  const oldInlineServerRoutePredicate = 'const fub' + 'SourceRouteSplitCard ='
  addCheck(checks, !input.foundationVerifySource.includes(oldInlineServerRoutePredicate), 'foundation verifier no longer owns old inline server-route split predicates', 'old inline FUB route block absent')
  addCheck(checks, verifierLines < VERIFIER_SERVER_ROUTE_SPLIT_MODULE_BEFORE_LINES, 'foundation verifier line count decreases', `${VERIFIER_SERVER_ROUTE_SPLIT_MODULE_BEFORE_LINES} -> ${verifierLines}`)
  addCheck(checks, scriptIsReadOnly(input.proofScriptSource), 'focused proof script is read-only', 'no write/mutation tokens in proof script')
  addCheck(checks, input.packageJson.scripts?.['process:verifier-server-route-split-module-check'] === `node --env-file-if-exists=.env ${VERIFIER_SERVER_ROUTE_SPLIT_MODULE_SCRIPT_PATH}`, 'package script is registered', input.packageJson.scripts?.['process:verifier-server-route-split-module-check'] || 'missing')
  addCheck(checks, input.planSource.includes('Substring-only proof is rejected'), 'plan rejects substring-only proof', VERIFIER_SERVER_ROUTE_SPLIT_MODULE_PLAN_PATH)

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'unhealthy' : 'healthy',
    cardId: VERIFIER_SERVER_ROUTE_SPLIT_MODULE_CARD_ID,
    closeoutKey: VERIFIER_SERVER_ROUTE_SPLIT_MODULE_CLOSEOUT_KEY,
    lineCounts: {
      before: VERIFIER_SERVER_ROUTE_SPLIT_MODULE_BEFORE_LINES,
      after: verifierLines,
      delta: verifierLines - VERIFIER_SERVER_ROUTE_SPLIT_MODULE_BEFORE_LINES,
    },
    checks,
    failed,
    dogfood: dogfood.rejected,
    routeSplitChecks: evaluation.summary,
    routeSplitFailed: evaluation.failed,
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  } else {
    process.stdout.write(`${result.status}: ${checks.length - failed.length}/${checks.length} checks passed\n`)
    for (const failure of failed) {
      process.stdout.write(`- ${failure.check}: ${failure.detail}\n`)
    }
  }

  if (failed.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb()
  })
