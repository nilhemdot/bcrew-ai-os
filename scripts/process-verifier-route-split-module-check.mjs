#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  FOUNDATION_ROUTE_SPLIT_DEFINITIONS,
  VERIFIER_ROUTE_SPLIT_MODULE_APPROVAL_PATH,
  VERIFIER_ROUTE_SPLIT_MODULE_BEFORE_LINES,
  VERIFIER_ROUTE_SPLIT_MODULE_CARD_ID,
  VERIFIER_ROUTE_SPLIT_MODULE_CLOSEOUT_KEY,
  VERIFIER_ROUTE_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_ROUTE_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_ROUTE_SPLIT_MODULE_SPRINT_ID,
  buildFoundationRouteSplitVerifierDogfoodProof,
} from '../lib/foundation-route-split-verifier.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    args[key] = value ?? true
  }
  return args
}

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

function lineCount(source = '') {
  return String(source || '').split('\n').length
}

function scriptIsReadOnly(source = '') {
  const banned = [
    'create' + 'BacklogItem',
    'update' + 'BacklogItem',
    'upsert' + 'FoundationCurrentSprintOverlay',
    'INSERT' + ' INTO',
    'UPDATE' + ' ',
    'DELETE' + ' FROM',
    'fs.' + 'writeFile',
    'write' + 'File(',
  ]
  return banned.every(token => !source.includes(token))
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const jsonOutput = args.json === true || args.json === 'true'
  const baseUrl = String(args.baseUrl || 'http://localhost:3000')
  const checks = []

  const [
    moduleSource,
    verifierSource,
    scriptSource,
    planSource,
    packageSource,
  ] = await Promise.all([
    readRepoFile('lib/foundation-route-split-verifier.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile(VERIFIER_ROUTE_SPLIT_MODULE_SCRIPT_PATH),
    readRepoFile(VERIFIER_ROUTE_SPLIT_MODULE_PLAN_PATH),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: VERIFIER_ROUTE_SPLIT_MODULE_APPROVAL_PATH,
    cardId: VERIFIER_ROUTE_SPLIT_MODULE_CARD_ID,
  })
  const [card] = await getBacklogItemsByIds([VERIFIER_ROUTE_SPLIT_MODULE_CARD_ID])
  const activeSprint = await getActiveFoundationCurrentSprint()
  const sprintItem = activeSprint.items.find(item => item.cardId === VERIFIER_ROUTE_SPLIT_MODULE_CARD_ID) || null
  const planCriticRuns = await getPlanCriticRunsByCardIds([VERIFIER_ROUTE_SPLIT_MODULE_CARD_ID])
  const planCritic = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= 9.8) || null
  const dogfood = buildFoundationRouteSplitVerifierDogfoodProof()
  const verifierLines = lineCount(verifierSource)
  const removedInlineLabels = FOUNDATION_ROUTE_SPLIT_DEFINITIONS.every(definition => !verifierSource.includes(definition.checkLabel))
  const delegates = verifierSource.includes('evaluateFoundationRouteSplitVerifier') &&
    verifierSource.includes('buildFoundationRouteSplitVerifierDogfoodProof') &&
    verifierSource.includes('VERIFIER_ROUTE_SPLIT_MODULE_CARD_ID')

  ensure(checks, approvalValidation.ok && Number(approvalValidation.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || VERIFIER_ROUTE_SPLIT_MODULE_APPROVAL_PATH)
  ensure(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  ensure(checks, activeSprint.sprint?.sprintId === VERIFIER_ROUTE_SPLIT_MODULE_SPRINT_ID, 'Current Sprint is the verifier route split module sprint', activeSprint.sprint?.sprintId || 'missing')
  ensure(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains the card in Building Now or Done', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  ensure(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  ensure(checks, moduleSource.includes('evaluateFoundationRouteSplitVerifier') && moduleSource.includes('FOUNDATION_ROUTE_SPLIT_DEFINITIONS'), 'new module owns route-split verifier definitions', 'lib/foundation-route-split-verifier.js')
  ensure(checks, dogfood.ok === true, 'dogfood rejects old route-split verifier failures', dogfood.invariant)
  ensure(checks, delegates, 'foundation verifier delegates route-split checks to focused module', 'evaluateFoundationRouteSplitVerifier')
  ensure(checks, removedInlineLabels, 'foundation verifier no longer owns old inline route-split check labels', removedInlineLabels ? 'old labels absent' : 'old labels still inline')
  ensure(checks, verifierLines < VERIFIER_ROUTE_SPLIT_MODULE_BEFORE_LINES, 'foundation verifier line count decreases', `${VERIFIER_ROUTE_SPLIT_MODULE_BEFORE_LINES} -> ${verifierLines}`)
  ensure(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only', 'no write/mutation tokens in proof script')
  ensure(checks, packageJson.scripts?.['process:verifier-route-split-module-check'] === `node --env-file-if-exists=.env ${VERIFIER_ROUTE_SPLIT_MODULE_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:verifier-route-split-module-check'] || 'missing')
  ensure(checks, planSource.includes('substring-only proof is rejected') || planSource.includes('Substring-only proof is rejected'), 'plan rejects substring-only proof', VERIFIER_ROUTE_SPLIT_MODULE_PLAN_PATH)

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: VERIFIER_ROUTE_SPLIT_MODULE_CARD_ID,
    closeoutKey: VERIFIER_ROUTE_SPLIT_MODULE_CLOSEOUT_KEY,
    baseUrl,
    lineCounts: {
      before: VERIFIER_ROUTE_SPLIT_MODULE_BEFORE_LINES,
      after: verifierLines,
      delta: verifierLines - VERIFIER_ROUTE_SPLIT_MODULE_BEFORE_LINES,
    },
    checks,
    dogfood: {
      passing: dogfood.passing.ok,
      oldInlineStillPresentRejected: dogfood.oldInlineStillPresent.checks.find(check => check.cardId === 'SERVER-ROUTE-SPLIT-001')?.ok === false,
      missingModuleRouteMarkerRejected: dogfood.missingModuleRouteMarker.checks.find(check => check.cardId === 'BUILD-INTEL-ROUTE-SPLIT-001')?.ok === false,
      wrongBuildIntelPayloadRejected: dogfood.wrongBuildIntelPayload.checks.find(check => check.cardId === 'BUILD-INTEL-ROUTE-SPLIT-001')?.ok === false,
      missingCloseoutOwnershipRejected: dogfood.missingCloseoutOwnership.ok === false,
    },
  }

  if (jsonOutput) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Verifier route split module proof')
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
