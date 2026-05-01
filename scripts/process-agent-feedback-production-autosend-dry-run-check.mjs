#!/usr/bin/env node

import process from 'node:process'
import {
  AGENT_FEEDBACK_PRODUCTION_AUTOSEND_DRY_RUN_CLOSEOUT_KEY,
  AGENT_FEEDBACK_PRODUCTION_AUTOSEND_DRY_RUN_STAGE,
  AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID,
  buildAgentFeedbackProductionAutoSendDryRunStatus,
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

async function fetchJson(baseUrl, pathname) {
  const response = await fetch(new URL(pathname, baseUrl))
  if (!response.ok) throw new Error(`${pathname} returned ${response.status} ${response.statusText}`)
  return response.json()
}

async function main() {
  const args = parseArgs()
  const baseUrl = String(args.baseUrl || process.env.FOUNDATION_BASE_URL || 'http://localhost:3000')
  await assertFoundationDbReadyForReadOnlyGate('process:agent-feedback-production-autosend-dry-run-check')
  const [
    foundationHub,
    foundationBuildLog,
    foundationDryRun,
    opsDryRun,
  ] = await Promise.all([
    fetchJson(baseUrl, '/api/foundation-hub'),
    fetchJson(baseUrl, '/api/foundation/build-log?limit=20'),
    fetchJson(baseUrl, '/api/foundation/agent-feedback-production-dry-run?includeCandidates=false'),
    fetchJson(baseUrl, '/api/ops/agent-feedback-production-dry-run?includeCandidates=false'),
  ])
  const status = await buildAgentFeedbackProductionAutoSendDryRunStatus({
    repoRoot: process.cwd(),
    foundationHub,
    foundationBuildLog,
    opsDryRun,
    report: foundationDryRun.report,
  })

  console.log('Agent Feedback production auto-send Stage 1 dry-run proof')
  console.log(`  Card: ${AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID}`)
  console.log(`  Stage: ${AGENT_FEEDBACK_PRODUCTION_AUTOSEND_DRY_RUN_STAGE}`)
  console.log(`  Closeout: ${AGENT_FEEDBACK_PRODUCTION_AUTOSEND_DRY_RUN_CLOSEOUT_KEY}`)
  console.log(`  Base URL: ${baseUrl}`)
  console.log(`  Status: ${status.status}`)
  console.log(`  Tasks inspected: ${status.summary.tasksInspected}`)
  console.log(`  Candidates inspected: ${status.summary.totalCandidates}`)
  console.log(`  Sendable if enabled: ${status.summary.sendableCount}`)
  console.log(`  Classifications: ${JSON.stringify(status.summary.byClassification)}`)
  console.log(`  Production auto-send enabled: ${status.summary.productionAutoSendEnabled ? 'yes' : 'no'}`)
  console.log(`  Env toggle enabled: ${status.summary.envToggleEnabled ? 'yes' : 'no'}`)
  console.log(`  Production approval artifact exists: ${status.summary.productionApprovalArtifactExists ? 'yes' : 'no'}`)
  console.log(`  Metadata-only: ${status.summary.metadataOnly ? 'yes' : 'no'}`)
  console.log(`  Card lane: ${status.summary.cardLane || 'missing'}`)
  console.log(`  Closeout state: ${status.summary.closeoutStatus || 'missing'} / ${status.summary.closeoutAcceptanceState || 'missing'}`)
  for (const candidate of status.summary.wouldBeEmailedPreview || []) {
    console.log(`  WOULD_SEND ${candidate.agentName} day ${candidate.milestoneDay} (${candidate.classification})`)
  }
  for (const finding of status.findings) {
    console.log(`FAIL ${finding.check}${finding.detail ? ` -> ${finding.detail}` : ''}`)
  }
  console.log(`AGENT_FEEDBACK_PRODUCTION_AUTOSEND_DRY_RUN_SUMMARY ${JSON.stringify(status.summary)}`)
  if (status.status !== 'healthy') process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
