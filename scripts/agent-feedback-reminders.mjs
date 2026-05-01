#!/usr/bin/env node

import process from 'node:process'
import {
  AGENT_FEEDBACK_REMINDER_CARD_ID,
  AGENT_FEEDBACK_REMINDER_CLOSEOUT_KEY,
  buildAgentFeedbackReminderReadiness,
  buildAgentFeedbackReminderSyntheticProof,
} from '../lib/agent-feedback-reminders.js'
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
  const mode = String(args.mode || 'dry-run')
  if (mode !== 'dry-run') {
    throw new Error('AGENT-FEEDBACK-REMINDER-CADENCE-001 only supports --mode=dry-run. Live reminders are not enabled in this build.')
  }

  await assertFoundationDbReadyForReadOnlyGate('agent-feedback:reminders')
  const syntheticProof = buildAgentFeedbackReminderSyntheticProof()
  const readiness = await buildAgentFeedbackReminderReadiness({
    includeCandidates: args.includeCandidates === 'true',
    syntheticProof,
  })

  console.log('Agent Feedback reminder cadence readiness')
  console.log(`  Card: ${AGENT_FEEDBACK_REMINDER_CARD_ID}`)
  console.log(`  Closeout: ${AGENT_FEEDBACK_REMINDER_CLOSEOUT_KEY}`)
  console.log(`  Mode: ${readiness.summary.mode}`)
  console.log(`  Status: ${readiness.status}`)
  console.log(`  Schedule: day 1, day 3, day 7, day 10, day 14, day 17`)
  console.log(`  Cap: 6 reminders or 30 days`)
  console.log(`  Pending reminders: ${readiness.summary.pendingReminderCount}`)
  console.log(`  Sent reminders: ${readiness.summary.sentReminderCount}`)
  console.log(`  Blocked reminders: ${readiness.summary.blockedReminderCount}`)
  console.log(`  Skipped reminders: ${readiness.summary.skippedReminderCount}`)
  console.log(`  Maxed-out reminders: ${readiness.summary.maxedOutReminderCount}`)
  console.log(`  Repair states: ${readiness.summary.repairReminderCount}`)
  console.log(`  Georgia Day-30 reminder action: ${readiness.summary.georgiaDay30ReminderAction}`)
  console.log(`  No reminder before initial request: ${readiness.summary.noReminderBeforeInitialRequest ? 'yes' : 'no'}`)
  console.log(`  Completed/skipped/blocked stop: ${readiness.summary.completedSkippedBlockedStop ? 'yes' : 'no'}`)
  console.log(`  Duplicate slot protected: ${readiness.summary.duplicateSlotProtected ? 'yes' : 'no'}`)
  console.log(`  Dry-run only: ${readiness.summary.dryRunOnly ? 'yes' : 'no'}`)
  console.log(`  Metadata-only proof: ${readiness.summary.metadataOnly ? 'yes' : 'no'}`)
  console.log(`AGENT_FEEDBACK_REMINDER_READINESS ${JSON.stringify(readiness.summary)}`)
  if (readiness.status !== 'healthy') process.exitCode = 1
}

main().catch(error => {
  console.error('Agent Feedback reminder cadence command failed.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
