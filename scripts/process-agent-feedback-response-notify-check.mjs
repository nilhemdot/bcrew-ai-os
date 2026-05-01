#!/usr/bin/env node

import process from 'node:process'
import {
  AGENT_FEEDBACK_RESPONSE_NOTIFY_CARD_ID,
  AGENT_FEEDBACK_RESPONSE_NOTIFY_CLOSEOUT_KEY,
  buildAgentFeedbackResponseNotificationDryRunProof,
  buildAgentFeedbackResponseNotifyStatus,
} from '../lib/agent-feedback-response-notify.js'
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
  await assertFoundationDbReadyForReadOnlyGate('process:agent-feedback-response-notify-check')
  const [successProof, repairProof] = await Promise.all([
    buildAgentFeedbackResponseNotificationDryRunProof({ clickUpWritebackStatus: 'succeeded' }),
    buildAgentFeedbackResponseNotificationDryRunProof({ clickUpWritebackStatus: 'failed' }),
  ])
  const [foundationHub, foundationBuildLog] = await Promise.all([
    fetchJson(baseUrl, '/api/foundation-hub'),
    fetchJson(baseUrl, '/api/foundation/build-log?limit=5'),
  ])
  const status = await buildAgentFeedbackResponseNotifyStatus({
    repoRoot: process.cwd(),
    foundationHub,
    foundationBuildLog,
    successProof,
    repairProof,
  })

  console.log('Agent Feedback response notification proof')
  console.log(`  Card: ${AGENT_FEEDBACK_RESPONSE_NOTIFY_CARD_ID}`)
  console.log(`  Closeout: ${AGENT_FEEDBACK_RESPONSE_NOTIFY_CLOSEOUT_KEY}`)
  console.log(`  Base URL: ${baseUrl}`)
  console.log(`  Status: ${status.status}`)
  console.log(`  Success dry-run: ${status.summary.successDryRun ? 'yes' : 'no'}`)
  console.log(`  Repair dry-run: ${status.summary.repairDryRun ? 'yes' : 'no'}`)
  console.log(`  Recipient roles: ${status.summary.recipientRoles.join(', ') || 'none'}`)
  console.log(`  Missing recipient roles: ${status.summary.missingRecipientRoles.join(', ') || 'none'}`)
  console.log(`  Duplicate protected: ${status.summary.duplicateProtected ? 'yes' : 'no'}`)
  console.log(`  Repair proof: ${status.summary.clickUpRepairProof || 'none'}`)
  console.log(`  Gmail sent in proof: ${status.summary.gmailSent ? 'yes' : 'no'}`)
  console.log(`  ClickUp Requested written: ${status.summary.clickUpRequestedWritten ? 'yes' : 'no'}`)
  console.log(`  Metadata-only proof: ${status.summary.metadataOnly ? 'yes' : 'no'}`)
  console.log(`  Response notify card lane: ${status.summary.notifyCardLane || 'missing'}`)
  console.log(`  Georgia send card lane: ${status.summary.georgiaSendCardLane || 'missing'}`)
  console.log(`  Closeout owns only response notify: ${status.summary.closeoutOwnsOnlyResponseNotify ? 'yes' : 'no'}`)
  for (const finding of status.findings) {
    console.log(`FAIL ${finding.check}${finding.detail ? ` -> ${finding.detail}` : ''}`)
  }
  console.log(`AGENT_FEEDBACK_RESPONSE_NOTIFY_STATUS ${JSON.stringify(status.summary)}`)
  if (status.status !== 'healthy') process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
