#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  closeFoundationDb,
  getLlmRuntimeSnapshot,
  initFoundationDb,
} from '../lib/foundation-db.js'
import {
  DEFAULT_GEMINI_WORKSPACE_ACCOUNT,
  GEMINI_WORKSPACE_CREDENTIAL_KEY,
  GEMINI_WORKSPACE_ROUTE_KEY,
  GEMINI_WORKSPACE_SOURCE,
  buildCredentialVaultDogfoodProof,
  buildGeminiWorkspaceCredentialRows,
  keychainItemExists,
  redactCredentialText,
} from '../lib/credential-vault.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const CARD_ID = 'CREDENTIAL-VAULT-SESSION-BROKER-001'
const SCRIPT_PATH = 'scripts/process-credential-vault-session-broker-check.mjs'
const CLI_PATH = 'scripts/credentials-vault.mjs'
const MODULE_PATH = 'lib/credential-vault.js'

function parseArgs(argv = process.argv.slice(2)) {
  const flags = {
    json: argv.includes('--json'),
    requireGeminiKeychain: argv.includes('--require-gemini-keychain'),
    verifyDb: argv.includes('--verify-db'),
    account: DEFAULT_GEMINI_WORKSPACE_ACCOUNT,
  }
  for (const arg of argv) {
    if (arg.startsWith('--account=')) flags.account = arg.slice('--account='.length).trim()
  }
  return flags
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: detail || '' })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function loadRuntimeRows() {
  await initFoundationDb()
  try {
    const snapshot = await getLlmRuntimeSnapshot({ limit: 20 })
    return {
      credential: snapshot.credentials.find(item => item.credentialKey === GEMINI_WORKSPACE_CREDENTIAL_KEY) || null,
      route: snapshot.routes.find(item => item.routeKey === GEMINI_WORKSPACE_ROUTE_KEY) || null,
    }
  } finally {
    await closeFoundationDb()
  }
}

function sourceContainsDirectSecretPath(source = '') {
  return [
    /process\.env\.[A-Z0-9_]*(PASSWORD|SECRET|TOKEN)/i,
    /localStorage\.setItem\s*\(/i,
    /fs\.writeFile.*(password|secret|token)/i,
  ].some(pattern => pattern.test(source))
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    packageJsonText,
    moduleSource,
    cliSource,
    geminiProofSource,
  ] = await Promise.all([
    readRepoFile('package.json'),
    readRepoFile(MODULE_PATH),
    readRepoFile(CLI_PATH),
    readRepoFile('lib/gemini-workspace-eyes-route-proof.js'),
  ])
  const packageJson = JSON.parse(packageJsonText)
  const dogfood = buildCredentialVaultDogfoodProof()
  const rows = buildGeminiWorkspaceCredentialRows({
    account: args.account,
    keychainPresent: true,
  })
  const keychainPresent = await keychainItemExists({
    source: GEMINI_WORKSPACE_SOURCE,
    account: args.account,
  })
  const runtimeRows = args.verifyDb ? await loadRuntimeRows() : { credential: null, route: null }

  addCheck(checks, dogfood.ok, 'credential-vault dogfood proof passes', dogfood.failed.map(item => item.check).join(', ') || 'all dogfood checks passed')
  addCheck(checks, packageJson.scripts?.['credentials:vault'] === `node --env-file-if-exists=.env ${CLI_PATH}`, 'package exposes credentials:vault CLI', packageJson.scripts?.['credentials:vault'] || 'missing')
  addCheck(checks, packageJson.scripts?.['process:credential-vault-session-broker-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package exposes credential vault focused proof', packageJson.scripts?.['process:credential-vault-session-broker-check'] || 'missing')
  addCheck(checks, moduleSource.includes('security') && moduleSource.includes('add-generic-password') && moduleSource.includes('find-generic-password'), 'vault uses macOS Keychain security CLI', MODULE_PATH)
  addCheck(checks, moduleSource.includes("'-w'") && dogfood.checks.some(item => item.check.includes('prompts for password') && item.ok), 'vault stores passwords through terminal prompt posture', 'security -w prompt posture')
  addCheck(checks, cliSource.includes('gemini:add') && cliSource.includes('gemini:register') && cliSource.includes('gemini:status'), 'vault CLI has add/register/status commands', CLI_PATH)
  addCheck(checks, !cliSource.includes('readKeychainPassword'), 'CLI never imports broker-only raw password retrieval', CLI_PATH)
  addCheck(checks, !sourceContainsDirectSecretPath(`${moduleSource}\n${cliSource}`), 'vault does not write secrets to env, localStorage, or files', 'direct secret persistence paths absent')
  addCheck(checks, rows.credential.secretRef.startsWith('macos-keychain:'), 'credential row stores a Keychain secretRef only', rows.credential.secretRef)
  addCheck(checks, rows.credential.metadata.rawSecretVisibleToAgent === false && rows.route.metadata.rawSecretVisibleToAgent === false, 'credential and route metadata keep raw secret hidden from agents', JSON.stringify({ credential: rows.credential.metadata.rawSecretVisibleToAgent, route: rows.route.metadata.rawSecretVisibleToAgent }))
  addCheck(checks, rows.route.routeKey === GEMINI_WORKSPACE_ROUTE_KEY && rows.route.credentialKey === GEMINI_WORKSPACE_CREDENTIAL_KEY, 'route key is distinct from credential key and points to credential', `${rows.route.routeKey} -> ${rows.route.credentialKey}`)
  addCheck(checks, geminiProofSource.includes('GEMINI_WORKSPACE_ROUTE_KEY') && !geminiProofSource.includes("GEMINI_WORKSPACE_EYES_ROUTE_KEY = 'gemini-workspace-browser-account'"), 'Gemini eyes proof reports route key, not credential key', 'lib/gemini-workspace-eyes-route-proof.js')
  addCheck(checks, redactCredentialText('token=synthetic-secret-value').includes('[REDACTED'), 'redaction utility removes token-shaped text', 'synthetic redaction')
  if (args.requireGeminiKeychain) {
    addCheck(checks, keychainPresent, 'Gemini Keychain item exists locally', args.account)
  }
  if (args.verifyDb) {
    addCheck(checks, runtimeRows.credential?.credentialKey === GEMINI_WORKSPACE_CREDENTIAL_KEY && runtimeRows.credential?.secretRef === rows.credential.secretRef, 'DB credential metadata row is registered', runtimeRows.credential ? `${runtimeRows.credential.credentialKey}:${runtimeRows.credential.status}` : 'missing')
    addCheck(checks, runtimeRows.route?.routeKey === GEMINI_WORKSPACE_ROUTE_KEY && runtimeRows.route?.credentialKey === GEMINI_WORKSPACE_CREDENTIAL_KEY, 'DB route metadata row is registered', runtimeRows.route ? `${runtimeRows.route.routeKey}:${runtimeRows.route.status}` : 'missing')
  }

  const failed = checks.filter(check => !check.ok)
  const result = {
    ok: failed.length === 0,
    status: failed.length ? 'blocked' : 'healthy',
    cardId: CARD_ID,
    account: args.account,
    keychainPresent,
    verifyDb: args.verifyDb,
    requireGeminiKeychain: args.requireGeminiKeychain,
    routeKey: GEMINI_WORKSPACE_ROUTE_KEY,
    credentialKey: GEMINI_WORKSPACE_CREDENTIAL_KEY,
    rawSecretPrinted: false,
    checks,
    failed,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Credential vault session broker proof: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
    console.log(`Summary: ${checks.length - failed.length}/${checks.length} checks passed`)
  }
  process.exitCode = failed.length ? 1 : 0
}

main().catch(error => {
  console.error('Credential vault session broker proof failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
