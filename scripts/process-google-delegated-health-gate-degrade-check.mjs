#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  GOOGLE_DELEGATED_HEALTH_GATE_DEGRADE_APPROVAL_PATH,
  GOOGLE_DELEGATED_HEALTH_GATE_DEGRADE_CLOSEOUT_KEY,
  GOOGLE_DELEGATED_HEALTH_GATE_DEGRADE_PLAN_PATH,
  GOOGLE_DELEGATED_HEALTH_GATE_DEGRADE_SCRIPT_PATH,
  VERIFIER_HEALTH_SCRIPT_MODULE_CARD_ID,
  buildFoundationHealthScriptVerifierDogfoodProof,
} from '../lib/foundation-health-script-verifier.js'

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

function sourceOmitsUnsafeRuntimeCalls(source = '') {
  const banned = [
    'googleJson' + 'Fetch(',
    'googleText' + 'Fetch(',
    'googleBuffer' + 'Fetch(',
    'send' + 'Telegram',
    'send' + 'Email',
    'create' + 'BacklogItem',
    'update' + 'BacklogItem',
    'INSERT' + ' INTO',
    'UPDATE' + ' ',
    'DELETE' + ' FROM',
  ]
  return banned.every(token => !String(source || '').includes(token))
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const jsonOutput = args.json === true || args.json === 'true'
  const checks = []

  const [
    moduleSource,
    healthLiveSummarySource,
    healthModuleProofSource,
    ownersRoutesSource,
    proofSource,
    planSource,
    packageSource,
  ] = await Promise.all([
    readRepoFile('lib/foundation-health-script-verifier.js'),
    readRepoFile('lib/foundation-verifier-health-live-summary.js'),
    readRepoFile('scripts/process-verifier-health-script-module-check.mjs'),
    readRepoFile('lib/owners-governance-routes.js'),
    readRepoFile(GOOGLE_DELEGATED_HEALTH_GATE_DEGRADE_SCRIPT_PATH),
    readRepoFile(GOOGLE_DELEGATED_HEALTH_GATE_DEGRADE_PLAN_PATH),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: GOOGLE_DELEGATED_HEALTH_GATE_DEGRADE_APPROVAL_PATH,
    cardId: VERIFIER_HEALTH_SCRIPT_MODULE_CARD_ID,
  })
  const dogfood = buildFoundationHealthScriptVerifierDogfoodProof()

  ensure(checks, approvalValidation.ok && Number(approvalValidation.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || GOOGLE_DELEGATED_HEALTH_GATE_DEGRADE_APPROVAL_PATH)
  ensure(checks, dogfood.ok === true, 'health-script dogfood stays green after Google degraded-auth repair', dogfood.invariant)
  ensure(checks, dogfood.googleDelegatedAuthOutageAccepted.ok === true, 'dogfood accepts only the governed delegated-auth outage case', `${dogfood.googleDelegatedAuthOutageAccepted.summary.passed}/${dogfood.googleDelegatedAuthOutageAccepted.summary.total}`)
  ensure(checks, dogfood.googleDelegatedAuthOutageRejectedWithoutGovernedConnector.ok === false, 'dogfood rejects direct-service-account fallback when Google Workspace is not governed degraded', dogfood.googleDelegatedAuthOutageRejectedWithoutGovernedConnector.failed.map(item => item.check).join('; '))
  ensure(checks, moduleSource.includes('googleDelegatedAuthDegradedAccepted') && moduleSource.includes('googleWorkspaceGovernedDegraded') && moduleSource.includes('googleServiceAccountDirectHealthy'), 'focused verifier classifies delegated auth failure, direct read proof, and governed connector degradation', 'lib/foundation-health-script-verifier.js')
  ensure(checks, healthLiveSummarySource.includes("runHealthScriptSafe('google:health')") && healthLiveSummarySource.includes("runHealthScriptWithArgs('google:health', ['--user=service-account'])"), 'root verifier captures google:health failures and probes service-account direct fallback only after failure', 'lib/foundation-verifier-health-live-summary.js')
  ensure(checks, healthLiveSummarySource.includes('googleHealthResult') && healthLiveSummarySource.includes('googleServiceAccountHealthResult'), 'root verifier passes structured Google health results into focused evaluator', 'googleHealthResult + googleServiceAccountHealthResult')
  ensure(checks, healthModuleProofSource.includes('googleDelegatedAuthOutageAccepted') && healthModuleProofSource.includes('googleDelegatedAuthOutageRejectedWithoutGovernedConnector'), 'existing health-script module proof covers the new Google degradation dogfood', 'scripts/process-verifier-health-script-module-check.mjs')
  ensure(checks, ownersRoutesSource.includes('withOwnersGoogleDelegationFallback') && ownersRoutesSource.includes("loader('service-account')") && ownersRoutesSource.includes('service-account-direct-fallback'), 'Owners governance read routes fall back to service-account direct access after delegated auth failure', 'lib/owners-governance-routes.js')
  ensure(checks, ownersRoutesSource.includes('google_delegated_auth_invalid_grant') && ownersRoutesSource.includes('safeToUse: false') && ownersRoutesSource.includes('sourceHealth'), 'Owners governance fallback reports degraded source health instead of healthy Google delegation', 'sourceHealth.status=degraded')
  ensure(checks, ownersRoutesSource.includes("app.get('/api/owners/lead-source-governance'") && ownersRoutesSource.includes("app.get('/api/owners/review-queue'") && ownersRoutesSource.includes('accessMode: sourceHealth.accessMode'), 'Owners lead-source and review-queue read payloads expose fallback access mode', 'lead-source-governance + review-queue')
  ensure(checks, sourceOmitsUnsafeRuntimeCalls(proofSource), 'focused proof is static/read-only and does not call Google APIs or mutate local/live state', 'no runtime connector/send/write tokens')
  ensure(checks, packageJson.scripts?.['process:google-delegated-health-gate-degrade-check'] === `node --env-file-if-exists=.env ${GOOGLE_DELEGATED_HEALTH_GATE_DEGRADE_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:google-delegated-health-gate-degrade-check'] || 'missing')
  ensure(checks, planSource.includes(GOOGLE_DELEGATED_HEALTH_GATE_DEGRADE_CLOSEOUT_KEY) && planSource.includes('service-account direct') && planSource.includes('Owners lead-source governance and review-queue APIs') && planSource.includes('read-route fail-soft only') && planSource.includes('no external writes'), 'plan captures degraded-auth gate scope, Owners read fallback, and no-write boundary', GOOGLE_DELEGATED_HEALTH_GATE_DEGRADE_PLAN_PATH)

  const failed = checks.filter(check => !check.ok)
  const summary = {
    ok: failed.length === 0,
    cardId: VERIFIER_HEALTH_SCRIPT_MODULE_CARD_ID,
    closeoutKey: GOOGLE_DELEGATED_HEALTH_GATE_DEGRADE_CLOSEOUT_KEY,
    checks,
    failed,
    dogfood: {
      googleDelegatedAuthOutageAccepted: dogfood.googleDelegatedAuthOutageAccepted.ok === true,
      googleDelegatedAuthOutageRejectedWithoutGovernedConnector: dogfood.googleDelegatedAuthOutageRejectedWithoutGovernedConnector.ok === false,
    },
  }

  if (jsonOutput) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Google delegated health gate degraded-auth proof')
    checks.forEach(check => console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`))
    console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  }

  if (failed.length) process.exit(1)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
