#!/usr/bin/env node

import process from 'node:process'
import {
  buildAgentFeedbackAutoSendReadiness,
} from '../lib/agent-feedback-auto-send.js'
import { assertFoundationDbReadyForReadOnlyGate } from '../lib/foundation-db.js'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [rawKey, ...rawValue] = arg.slice(2).split('=')
    args[rawKey] = rawValue.length ? rawValue.join('=') : 'true'
  }
  return args
}

async function main() {
  const args = parseArgs()
  const mode = String(args.mode || 'dry-run').trim()
  await assertFoundationDbReadyForReadOnlyGate('agent-feedback:auto-send')

  if (!['dry-run', 'report'].includes(mode)) {
    throw new Error('Auto-send readiness build only supports --mode=dry-run or --mode=report. Live send mode requires a separate approved send/allowlist path.')
  }

  const readiness = await buildAgentFeedbackAutoSendReadiness({
    repoRoot: process.cwd(),
    includeCandidates: args.includeCandidates === 'true' || args.includeCandidates === true,
  })
  console.log(JSON.stringify({
    ok: readiness.status === 'healthy',
    mode: readiness.runtimeMode,
    cardId: readiness.cardId,
    closeoutKey: readiness.closeoutKey,
    summary: readiness.summary,
    liveGuard: readiness.liveGuard,
    guardMatrix: readiness.guardMatrix,
    report: readiness.report,
    privacy: readiness.privacy,
  }, null, 2))
  if (readiness.status !== 'healthy') process.exitCode = 1
}

main().catch(error => {
  console.error('Agent Feedback auto-send readiness command failed.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
