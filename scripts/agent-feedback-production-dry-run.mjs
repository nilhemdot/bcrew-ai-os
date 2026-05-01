#!/usr/bin/env node

import process from 'node:process'
import {
  AGENT_FEEDBACK_PRODUCTION_AUTOSEND_DRY_RUN_STAGE,
  buildAgentFeedbackProductionAutoSendDryRunReport,
} from '../lib/agent-feedback-production-autosend-dry-run.js'
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
  const includeCandidates = args.includeCandidates !== 'false'
  await assertFoundationDbReadyForReadOnlyGate('agent-feedback:production-dry-run')
  const report = await buildAgentFeedbackProductionAutoSendDryRunReport({
    includeCandidates,
    forceRefresh: args.forceRefresh === 'true' || args.forceRefresh === true,
  })

  console.log(JSON.stringify({
    ok: true,
    stage: AGENT_FEEDBACK_PRODUCTION_AUTOSEND_DRY_RUN_STAGE,
    mode: report.mode,
    generatedAt: report.generatedAt,
    source: report.source,
    productionRules: report.productionRules,
    classificationVocabulary: report.classificationVocabulary,
    summary: report.summary,
    candidates: report.candidates,
    sideEffects: report.sideEffects,
    productionEnablement: report.productionEnablement,
    privacy: report.privacy,
  }, null, 2))
}

main().catch(error => {
  console.error('Agent Feedback production dry-run report failed.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
