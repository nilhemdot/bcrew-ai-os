#!/usr/bin/env node

import process from 'node:process'
import {
  AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID,
  AGENT_FEEDBACK_LIVE_REMINDERS_CLOSEOUT_KEY,
  AGENT_FEEDBACK_REMINDER_CARD_ID,
  AGENT_FEEDBACK_REMINDER_CLOSEOUT_KEY,
  buildAgentFeedbackReminderStatus,
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

async function fetchJson(baseUrl, pathname) {
  const response = await fetch(new URL(pathname, baseUrl))
  if (!response.ok) throw new Error(`${pathname} returned ${response.status} ${response.statusText}`)
  return response.json()
}

async function main() {
  const args = parseArgs()
  const baseUrl = String(args.baseUrl || process.env.FOUNDATION_BASE_URL || 'http://localhost:3000')
  await assertFoundationDbReadyForReadOnlyGate('process:agent-feedback-reminder-cadence-check')
  const syntheticProof = buildAgentFeedbackReminderSyntheticProof()
  const [foundationHub, foundationBuildLog, opsHub] = await Promise.all([
    fetchJson(baseUrl, '/api/foundation-hub'),
    fetchJson(baseUrl, '/api/foundation/build-log?limit=80'),
    fetchJson(baseUrl, '/api/ops-hub'),
  ])
  const status = await buildAgentFeedbackReminderStatus({
    repoRoot: process.cwd(),
    foundationHub,
    foundationBuildLog,
    opsHub,
    syntheticProof,
  })

  console.log('Agent Feedback reminder proof')
  console.log(`  Card: ${status.cardId || AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID || AGENT_FEEDBACK_REMINDER_CARD_ID}`)
  console.log(`  Closeout: ${status.closeoutKey || AGENT_FEEDBACK_LIVE_REMINDERS_CLOSEOUT_KEY || AGENT_FEEDBACK_REMINDER_CLOSEOUT_KEY}`)
  console.log(`  Base URL: ${baseUrl}`)
  console.log(`  Status: ${status.status}`)
  console.log(`  Pending reminders: ${status.summary.pendingReminderCount}`)
  console.log(`  Sent reminders: ${status.summary.sentReminderCount}`)
  console.log(`  Blocked reminders: ${status.summary.blockedReminderCount}`)
  console.log(`  Skipped reminders: ${status.summary.skippedReminderCount}`)
  console.log(`  Maxed-out reminders: ${status.summary.maxedOutReminderCount}`)
  console.log(`  Repair states: ${status.summary.repairReminderCount}`)
  console.log(`  No reminder before initial request: ${status.summary.noReminderBeforeInitialRequest ? 'yes' : 'no'}`)
  console.log(`  Completed/skipped/blocked stop: ${status.summary.completedSkippedBlockedStop ? 'yes' : 'no'}`)
  console.log(`  Duplicate slot protected: ${status.summary.duplicateSlotProtected ? 'yes' : 'no'}`)
  console.log(`  Cap stops at 6/30: ${status.summary.capStopsAtSixOrThirtyDays ? 'yes' : 'no'}`)
  console.log(`  Live reminders enabled: ${status.summary.liveRemindersEnabled ? 'yes' : 'no'}`)
  console.log(`  Dry-run report has no side effects: ${status.summary.dryRunOnly ? 'yes' : 'no'}`)
  console.log(`  Metadata-only proof: ${status.summary.metadataOnly ? 'yes' : 'no'}`)
  console.log(`  Reminder card lane: ${status.summary.reminderCardLane || 'missing'}`)
  console.log(`  Live reminder card lane: ${status.summary.liveReminderCardLane || 'missing'}`)
  console.log(`  Georgia send card lane: ${status.summary.georgiaSendCardLane || 'missing'}`)
  console.log(`  Closeout owns only live reminder card: ${status.summary.closeoutOwnsOnlyLiveReminder ? 'yes' : 'no'}`)
  for (const finding of status.findings) {
    console.log(`FAIL ${finding.check}${finding.detail ? ` -> ${finding.detail}` : ''}`)
  }
  console.log(`AGENT_FEEDBACK_REMINDER_STATUS ${JSON.stringify(status.summary)}`)
  if (status.status !== 'healthy') process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
