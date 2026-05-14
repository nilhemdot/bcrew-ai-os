#!/usr/bin/env node

import process from 'node:process'

import {
  FOUNDATION_VERIFY_LLM_AUTH_AUDIT_CARD_ID,
  buildLlmAuthAuditVerifierDogfoodProof,
} from '../lib/foundation-verify-llm-auth-audit.js'

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

function main() {
  const args = parseArgs()
  const jsonMode = boolArg(args.json)
  const proof = buildLlmAuthAuditVerifierDogfoodProof()
  const summary = {
    ok: proof.ok,
    status: proof.ok ? 'healthy' : 'blocked',
    cardId: FOUNDATION_VERIFY_LLM_AUTH_AUDIT_CARD_ID,
    proof,
    findings: proof.ok ? [] : [{ check: 'llm auth audit verifier module dogfood', detail: proof.dogfoodInvariant }],
  }
  if (jsonMode) console.log(JSON.stringify(summary, null, 2))
  else {
    console.log(`LLM auth audit verifier module check: ${summary.status}`)
    if (!summary.ok) console.log(`  BLOCKED ${summary.findings[0].detail}`)
  }
  if (!summary.ok) process.exitCode = 1
}

main()
