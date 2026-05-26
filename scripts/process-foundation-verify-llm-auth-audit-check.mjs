#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  FOUNDATION_VERIFY_LLM_AUTH_AUDIT_CARD_ID,
  buildLlmAuthAuditVerifierDogfoodProof,
} from '../lib/foundation-verify-llm-auth-audit.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, ...rawValue] = arg.slice(2).split('=')
    args[key] = rawValue.length ? rawValue.join('=') : 'true'
  }
  return args
}

function boolArg(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
}

async function main() {
  const args = parseArgs()
  const jsonMode = boolArg(args.json)
  const proof = buildLlmAuthAuditVerifierDogfoodProof()
  const runtimeStoreSource = await fs.readFile(path.join(repoRoot, 'lib/foundation-llm-runtime-store.js'), 'utf8')
  const proofEvictionGuard = runtimeStoreSource.includes("metadata->>'proof' = 'llm-auth-audit-route-selection'") &&
    runtimeStoreSource.includes('routeSelectionProofResult') &&
    runtimeStoreSource.includes('recentCalls.push(routeSelectionProofCall)')
  const ok = proof.ok && proofEvictionGuard
  const summary = {
    ok,
    status: ok ? 'healthy' : 'blocked',
    cardId: FOUNDATION_VERIFY_LLM_AUTH_AUDIT_CARD_ID,
    proof,
    findings: [
      ...(proof.ok ? [] : [{ check: 'llm auth audit verifier module dogfood', detail: proof.dogfoodInvariant }]),
      ...(proofEvictionGuard ? [] : [{
        check: 'llm auth dry-run proof survives high-volume provider calls',
        detail: 'lib/foundation-llm-runtime-store.js must pin the llm-auth-audit-route-selection proof outside the generic recent-call window.',
      }]),
    ],
  }
  if (jsonMode) console.log(JSON.stringify(summary, null, 2))
  else {
    console.log(`LLM auth audit verifier module check: ${summary.status}`)
    for (const finding of summary.findings) console.log(`  BLOCKED ${finding.check}: ${finding.detail}`)
  }
  if (!summary.ok) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
