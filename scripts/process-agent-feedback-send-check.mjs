#!/usr/bin/env node

import process from 'node:process'
import {
  AGENT_FEEDBACK_SEND_CARD_ID,
  AGENT_FEEDBACK_SEND_CLOSEOUT_KEY,
  buildAgentFeedbackDryRunProof,
  buildAgentFeedbackSendStatus,
} from '../lib/agent-feedback-send.js'
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
  await assertFoundationDbReadyForReadOnlyGate('process:agent-feedback-send-check')
  const dryRunProof = await buildAgentFeedbackDryRunProof({
    targetName: args.targetName || 'Georgia',
    milestoneDay: Number(args.milestoneDay || 30),
  })
  const [
    foundationHub,
    foundationBuildLog,
    sourceOfTruth,
  ] = await Promise.all([
    fetchJson(baseUrl, '/api/foundation-hub'),
    fetchJson(baseUrl, '/api/foundation/build-log?limit=5'),
    fetchJson(baseUrl, '/api/source-of-truth'),
  ])

  const status = await buildAgentFeedbackSendStatus({
    repoRoot: process.cwd(),
    foundationHub,
    foundationBuildLog,
    sourceOfTruth,
    dryRunProof,
  })

  console.log('Agent Feedback send Stage 1 proof')
  console.log(`  Card: ${AGENT_FEEDBACK_SEND_CARD_ID}`)
  console.log(`  Closeout: ${AGENT_FEEDBACK_SEND_CLOSEOUT_KEY}`)
  console.log(`  Base URL: ${baseUrl}`)
  console.log(`  Status: ${status.status}`)
  console.log(`  Stage: ${status.summary.stage}`)
  console.log(`  Target: ${status.summary.target}`)
  console.log(`  Milestone: day ${status.summary.milestoneDay}`)
  console.log(`  Due status: ${status.summary.dueStatus}`)
  console.log(`  Eligible: ${status.summary.eligible ? 'yes' : 'no'}`)
  console.log(`  Blockers: ${status.summary.blockers.length ? status.summary.blockers.join(', ') : 'none'}`)
  console.log(`  CC roles: ${status.summary.ccRolesApplied.join(', ') || 'none'}`)
  console.log(`  Duplicate CC removed: ${status.summary.ccDuplicateRolesRemoved.join(', ') || 'none'}`)
  console.log(`  Token hash proof: ${status.summary.tokenHashPresent ? 'yes' : 'no'}`)
  console.log(`  Gmail sent: ${status.summary.gmailSent ? 'yes' : 'no'}`)
  console.log(`  ClickUp Requested written: ${status.summary.clickUpRequestedWritten ? 'yes' : 'no'}`)
  console.log(`  Send card lane: ${status.summary.sendCardLane}`)
  console.log(`  Stage 2 card lane: ${status.summary.stageTwoCardLane}`)
  console.log(`  System implementation state: ${status.summary.systemImplementationState}`)
  for (const finding of status.findings) {
    console.log(`FAIL ${finding.check}${finding.detail ? ` -> ${finding.detail}` : ''}`)
  }
  console.log(`AGENT_FEEDBACK_SEND_SUMMARY ${JSON.stringify(status.summary)}`)
  console.log(`AGENT_FEEDBACK_DRY_RUN_PROOF ${JSON.stringify(status.dryRunProof)}`)
  if (status.status !== 'healthy') process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
