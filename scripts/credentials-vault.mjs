#!/usr/bin/env node

import process from 'node:process'

import {
  closeFoundationDb,
  getLlmRuntimeSnapshot,
  initFoundationDb,
  upsertLlmCredential,
  upsertLlmRoute,
} from '../lib/foundation-db.js'
import {
  DEFAULT_GEMINI_WORKSPACE_ACCOUNT,
  GEMINI_WORKSPACE_CREDENTIAL_KEY,
  GEMINI_WORKSPACE_ROUTE_KEY,
  GEMINI_WORKSPACE_SOURCE,
  buildKeychainService,
  buildGeminiWorkspaceCredentialRows,
  buildKeychainSecretRef,
  deleteKeychainPassword,
  keychainItemExists,
  promptAndStoreKeychainPassword,
} from '../lib/credential-vault.js'

const ACTOR = 'credential-vault-session-broker'

function parseArgs(argv = process.argv.slice(2)) {
  const [command = 'help', ...rest] = argv
  const flags = {
    command,
    apply: rest.includes('--apply'),
    json: rest.includes('--json'),
    account: DEFAULT_GEMINI_WORKSPACE_ACCOUNT,
    source: '',
  }
  for (const arg of rest) {
    if (arg.startsWith('--account=')) flags.account = arg.slice('--account='.length).trim()
    if (arg.startsWith('--source=')) flags.source = arg.slice('--source='.length).trim()
  }
  return flags
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2))
}

function usage() {
  return [
    'Usage:',
    '  npm run credentials:vault -- gemini:add --account=ai@bensoncrew.ca',
    '  npm run credentials:vault -- gemini:status --account=ai@bensoncrew.ca',
    '  npm run credentials:vault -- gemini:register --account=ai@bensoncrew.ca --apply',
    '  npm run credentials:vault -- source:add --source=myicor --account=steve@example.com',
    '  npm run credentials:vault -- source:status --source=myicor --account=steve@example.com',
    '  npm run credentials:vault -- source:delete --source=myicor --account=steve@example.com',
    '',
    'Notes:',
    '- gemini:add prompts in the terminal/macOS Keychain. Do not paste passwords into chat.',
    '- source:add stores paid-source passwords in macOS Keychain only.',
    '- status/register print metadata only; raw secrets are never printed.',
  ].join('\n')
}

function requireSourceAccount({ source, account }) {
  if (!source) throw new Error('--source is required for source vault commands.')
  if (!account) throw new Error('--account is required for source vault commands.')
}

async function getRuntimeRows() {
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

function metadataOnlyRows({ account, keychainPresent }) {
  const rows = buildGeminiWorkspaceCredentialRows({ account, keychainPresent })
  return {
    credential: {
      ...rows.credential,
      secretRef: rows.credential.secretRef,
    },
    route: rows.route,
  }
}

async function status({ account, json = false } = {}) {
  const keychainPresent = await keychainItemExists({
    source: GEMINI_WORKSPACE_SOURCE,
    account,
  })
  const runtime = await getRuntimeRows()
  const result = {
    ok: keychainPresent,
    account,
    source: GEMINI_WORKSPACE_SOURCE,
    secretRef: buildKeychainSecretRef({ source: GEMINI_WORKSPACE_SOURCE, account }),
    keychainPresent,
    runtimeCredentialStatus: runtime.credential?.status || 'missing',
    runtimeRouteStatus: runtime.route?.status || 'missing',
    rawSecretPrinted: false,
  }
  if (json) {
    printJson(result)
  } else {
    console.log(`Gemini credential vault: ${keychainPresent ? 'present' : 'missing'}`)
    console.log(`account: ${account}`)
    console.log(`secretRef: ${result.secretRef}`)
    console.log(`runtime credential: ${result.runtimeCredentialStatus}`)
    console.log(`runtime route: ${result.runtimeRouteStatus}`)
    console.log('raw secret: never printed')
  }
  return result
}

async function addGemini({ account, json = false } = {}) {
  const stored = await promptAndStoreKeychainPassword({
    source: GEMINI_WORKSPACE_SOURCE,
    account,
    label: 'BCrew AI OS Gemini Workspace browser account',
    comment: 'Used by the local session broker for Gemini Workspace/App browser proof only.',
  })
  const result = {
    ok: true,
    account,
    source: GEMINI_WORKSPACE_SOURCE,
    service: stored.service,
    secretRef: stored.secretRef,
    rawSecretPrinted: false,
    next: 'Run npm run credentials:vault -- gemini:register --account=ai@bensoncrew.ca --apply',
  }
  if (json) printJson(result)
  else {
    console.log('Gemini credential stored in macOS Keychain.')
    console.log(`secretRef: ${stored.secretRef}`)
    console.log('raw secret: never printed')
    console.log(result.next)
  }
  return result
}

async function sourceStatus({ source, account, json = false } = {}) {
  requireSourceAccount({ source, account })
  const keychainPresent = await keychainItemExists({ source, account })
  const result = {
    ok: keychainPresent,
    source,
    account,
    service: buildKeychainService({ source, account }),
    secretRef: buildKeychainSecretRef({ source, account }),
    keychainPresent,
    rawSecretPrinted: false,
  }
  if (json) printJson(result)
  else {
    console.log(`Source credential vault: ${keychainPresent ? 'present' : 'missing'}`)
    console.log(`source: ${source}`)
    console.log(`account: ${account}`)
    console.log(`secretRef: ${result.secretRef}`)
    console.log('raw secret: never printed')
  }
  return result
}

async function sourceAdd({ source, account, json = false } = {}) {
  requireSourceAccount({ source, account })
  const stored = await promptAndStoreKeychainPassword({
    source,
    account,
    label: `BCrew AI OS ${source} source account`,
    comment: `Used by the local paid-source session broker for ${source}.`,
  })
  const result = {
    ok: true,
    source,
    account,
    service: stored.service,
    secretRef: stored.secretRef,
    rawSecretPrinted: false,
    next: `Run npm run credentials:vault -- source:status --source=${source} --account=${account}`,
  }
  if (json) printJson(result)
  else {
    console.log('Source credential stored in macOS Keychain.')
    console.log(`source: ${source}`)
    console.log(`account: ${account}`)
    console.log(`secretRef: ${stored.secretRef}`)
    console.log('raw secret: never printed')
    console.log(result.next)
  }
  return result
}

async function sourceDelete({ source, account, json = false } = {}) {
  requireSourceAccount({ source, account })
  const deleted = await deleteKeychainPassword({ source, account })
  const result = {
    ok: deleted,
    source,
    account,
    keychainPresent: false,
    rawSecretPrinted: false,
  }
  if (json) printJson(result)
  else {
    console.log(`Source credential delete: ${deleted ? 'deleted' : 'not found'}`)
    console.log(`source: ${source}`)
    console.log(`account: ${account}`)
    console.log('raw secret: never printed')
  }
  return result
}

async function registerGemini({ account, apply = false, json = false } = {}) {
  const keychainPresent = await keychainItemExists({
    source: GEMINI_WORKSPACE_SOURCE,
    account,
  })
  const rows = metadataOnlyRows({ account, keychainPresent })
  let written = null
  if (apply) {
    if (!keychainPresent) throw new Error('Gemini Keychain item is missing. Run gemini:add first.')
    await initFoundationDb()
    try {
      const credential = await upsertLlmCredential(rows.credential, ACTOR)
      const route = await upsertLlmRoute(rows.route, ACTOR)
      written = { credential, route }
    } finally {
      await closeFoundationDb()
    }
  }
  const result = {
    ok: keychainPresent && (apply ? Boolean(written) : true),
    dryRun: !apply,
    keychainPresent,
    account,
    rows,
    written,
    rawSecretPrinted: false,
  }
  if (json) printJson(result)
  else {
    console.log(`Gemini runtime registration: ${apply ? 'applied' : 'dry-run'}`)
    console.log(`keychain: ${keychainPresent ? 'present' : 'missing'}`)
    console.log(`credential: ${rows.credential.credentialKey} -> ${rows.credential.status}`)
    console.log(`route: ${rows.route.routeKey} -> ${rows.route.status}`)
    console.log(`secretRef: ${rows.credential.secretRef}`)
    console.log('raw secret: never printed')
    if (!apply) console.log('Add --apply to write the metadata rows.')
  }
  return result
}

async function main() {
  const args = parseArgs()
  if (args.command === 'help' || args.command === '--help' || args.command === '-h') {
    console.log(usage())
    return
  }
  if (args.command === 'gemini:add') {
    await addGemini(args)
    return
  }
  if (args.command === 'gemini:status') {
    const result = await status(args)
    process.exitCode = result.ok ? 0 : 1
    return
  }
  if (args.command === 'gemini:register') {
    const result = await registerGemini(args)
    process.exitCode = result.ok ? 0 : 1
    return
  }
  if (args.command === 'source:add') {
    await sourceAdd(args)
    return
  }
  if (args.command === 'source:status') {
    const result = await sourceStatus(args)
    process.exitCode = result.ok ? 0 : 1
    return
  }
  if (args.command === 'source:delete') {
    const result = await sourceDelete(args)
    process.exitCode = result.ok ? 0 : 1
    return
  }
  console.error(`Unknown command: ${args.command}`)
  console.error(usage())
  process.exitCode = 2
}

main().catch(error => {
  console.error('Credential vault command failed.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
