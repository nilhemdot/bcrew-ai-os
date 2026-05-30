#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  VERIFIER_HEALTH_SCRIPT_MODULE_APPROVAL_PATH,
  VERIFIER_HEALTH_SCRIPT_MODULE_BEFORE_LINES,
  VERIFIER_HEALTH_SCRIPT_MODULE_CARD_ID,
  VERIFIER_HEALTH_SCRIPT_MODULE_CLOSEOUT_KEY,
  VERIFIER_HEALTH_SCRIPT_MODULE_PLAN_PATH,
  VERIFIER_HEALTH_SCRIPT_MODULE_SCRIPT_PATH,
  VERIFIER_HEALTH_SCRIPT_MODULE_SPRINT_ID,
  buildFoundationHealthScriptVerifierDogfoodProof,
} from '../lib/foundation-health-script-verifier.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'

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
  const checks = []

  const [
    moduleSource,
    verifierSource,
    scriptSource,
    planSource,
    packageSource,
  ] = await Promise.all([
    readRepoFile('lib/foundation-health-script-verifier.js'),
    readRepoFile('scripts/foundation-verify.mjs'),
    readRepoFile(VERIFIER_HEALTH_SCRIPT_MODULE_SCRIPT_PATH),
    readRepoFile(VERIFIER_HEALTH_SCRIPT_MODULE_PLAN_PATH),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: VERIFIER_HEALTH_SCRIPT_MODULE_APPROVAL_PATH,
    cardId: VERIFIER_HEALTH_SCRIPT_MODULE_CARD_ID,
  })
  const [card] = await getBacklogItemsByIds([VERIFIER_HEALTH_SCRIPT_MODULE_CARD_ID])
  const activeSprint = await getActiveFoundationCurrentSprint()
  const sprintItem = activeSprint.items.find(item => item.cardId === VERIFIER_HEALTH_SCRIPT_MODULE_CARD_ID) || null
  const planCriticRuns = await getPlanCriticRunsByCardIds([VERIFIER_HEALTH_SCRIPT_MODULE_CARD_ID])
  const planCritic = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= 9.8) || null
  const dogfood = buildFoundationHealthScriptVerifierDogfoodProof()
  const verifierLines = lineCount(verifierSource)
  const removedInlinePredicates = [
    "googleHealth.includes('Spreadsheet access: OK')",
    "fubHealth.includes('Context: Support / Owner account (owner)')",
    'kpiHealthSummary?.tableCount',
    'backlogHygieneSummary?.syntheticFindings',
    'clickUpVerifyHealthy || (',
    "sheetVerify.includes('Sheet structure verification passed.')",
  ].every(token => !verifierSource.includes(token))
  const delegates = verifierSource.includes('evaluateFoundationHealthScriptVerifier({') &&
    verifierSource.includes('healthScriptVerifier.checks') &&
    verifierSource.includes('buildFoundationHealthScriptVerifierDogfoodProof') &&
    verifierSource.includes('VERIFIER_HEALTH_SCRIPT_MODULE_CARD_ID')

  ensure(checks, approvalValidation.ok && Number(approvalValidation.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || VERIFIER_HEALTH_SCRIPT_MODULE_APPROVAL_PATH)
  ensure(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  ensure(checks, activeSprint.sprint?.sprintId === VERIFIER_HEALTH_SCRIPT_MODULE_SPRINT_ID, 'Current Sprint is the verifier health-script module sprint', activeSprint.sprint?.sprintId || 'missing')
  ensure(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains the card in Building Now or Done', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  ensure(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  ensure(checks, moduleSource.includes('evaluateFoundationHealthScriptVerifier') && moduleSource.includes('buildFoundationHealthScriptVerifierDogfoodProof'), 'new module owns health-script verifier logic', 'lib/foundation-health-script-verifier.js')
  ensure(checks, dogfood.ok === true, 'dogfood rejects health-script verifier failures', dogfood.invariant)
  ensure(checks, dogfood.healthy.ok === true, 'dogfood healthy fixture passes', `${dogfood.healthy.summary.passed}/${dogfood.healthy.summary.total}`)
  ensure(checks, dogfood.missingGoogleDelegated.ok === false, 'dogfood rejects missing Google delegated access', dogfood.missingGoogleDelegated.failed.map(item => item.check).join('; '))
  ensure(checks, dogfood.riskyKpi.ok === false, 'dogfood rejects risky KPI health', dogfood.riskyKpi.failed.map(item => item.check).join('; '))
  ensure(checks, dogfood.missingBacklogSynthetic.ok === false, 'dogfood rejects missing backlog stale-card synthetic proof', dogfood.missingBacklogSynthetic.failed.map(item => item.check).join('; '))
  ensure(checks, dogfood.clickUpVendorOutageAccepted.ok === true, 'dogfood accepts governed ClickUp vendor outage only with degraded source health', `${dogfood.clickUpVendorOutageAccepted.summary.passed}/${dogfood.clickUpVendorOutageAccepted.summary.total}`)
  ensure(checks, dogfood.clickUpHardFailure.ok === false, 'dogfood rejects ClickUp hard failure without degraded source health', dogfood.clickUpHardFailure.failed.map(item => item.check).join('; '))
  ensure(checks, dogfood.brokenSheets.ok === false, 'dogfood rejects broken Sheets verification', dogfood.brokenSheets.failed.map(item => item.check).join('; '))
  ensure(checks, delegates, 'foundation verifier delegates health-script checks to focused module', 'evaluateFoundationHealthScriptVerifier')
  ensure(checks, removedInlinePredicates, 'foundation verifier no longer owns old inline health-script predicates', removedInlinePredicates ? 'old predicates absent' : 'old predicates still inline')
  ensure(checks, verifierLines < VERIFIER_HEALTH_SCRIPT_MODULE_BEFORE_LINES, 'foundation verifier line count decreases', `${VERIFIER_HEALTH_SCRIPT_MODULE_BEFORE_LINES} -> ${verifierLines}`)
  ensure(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only', 'no write/mutation tokens in proof script')
  ensure(checks, packageJson.scripts?.['process:verifier-health-script-module-check'] === `node --env-file-if-exists=.env ${VERIFIER_HEALTH_SCRIPT_MODULE_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:verifier-health-script-module-check'] || 'missing')
  ensure(checks, planSource.includes('Substring-only proof') || planSource.includes('substring theatre'), 'plan rejects substring-only proof', VERIFIER_HEALTH_SCRIPT_MODULE_PLAN_PATH)

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: VERIFIER_HEALTH_SCRIPT_MODULE_CARD_ID,
    closeoutKey: VERIFIER_HEALTH_SCRIPT_MODULE_CLOSEOUT_KEY,
    lineCounts: {
      before: VERIFIER_HEALTH_SCRIPT_MODULE_BEFORE_LINES,
      after: verifierLines,
      delta: verifierLines - VERIFIER_HEALTH_SCRIPT_MODULE_BEFORE_LINES,
    },
    checks,
    dogfood: {
      healthy: dogfood.healthy.ok,
      missingGoogleDelegatedRejected: dogfood.missingGoogleDelegated.ok === false,
      riskyKpiRejected: dogfood.riskyKpi.ok === false,
      missingBacklogSyntheticRejected: dogfood.missingBacklogSynthetic.ok === false,
      clickUpVendorOutageAccepted: dogfood.clickUpVendorOutageAccepted.ok === true,
      clickUpHardFailureRejected: dogfood.clickUpHardFailure.ok === false,
      brokenSheetsRejected: dogfood.brokenSheets.ok === false,
    },
  }

  if (jsonOutput) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Verifier health-script module proof')
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
