#!/usr/bin/env node

import process from 'node:process'
import {
  AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID,
  AGENT_FEEDBACK_LIVE_REMINDERS_CLOSEOUT_KEY,
  AGENT_FEEDBACK_REMINDER_CARD_ID,
  AGENT_FEEDBACK_REMINDER_CLOSEOUT_KEY,
  buildAgentFeedbackReminderReadiness,
  buildAgentFeedbackReminderSyntheticProof,
  runAgentFeedbackLiveReminders,
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
  const now = args.now ? new Date(String(args.now)) : new Date()
  if (Number.isNaN(now.getTime())) throw new Error('Invalid --now timestamp.')
  const includeCandidates = args.includeCandidates === 'true'

  if (mode === 'live') {
    const result = await runAgentFeedbackLiveReminders({
      includeCandidates,
      now,
      maxSends: args.maxSends || null,
    })

    console.log('Agent Feedback live reminders')
    console.log(`  Card: ${AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID}`)
    console.log(`  Closeout: ${AGENT_FEEDBACK_LIVE_REMINDERS_CLOSEOUT_KEY}`)
    console.log(`  Mode: ${result.mode}`)
    console.log(`  Status: ${result.status}`)
    console.log(`  Enabled: ${result.reminderEnablement.enabled ? 'yes' : 'no'}`)
    console.log(`  Send window: ${result.sendWindow.start}-${result.sendWindow.end} ${result.sendWindow.timezone}`)
    console.log(`  Send window open: ${result.sendWindow.canSendNow ? 'yes' : 'no'}`)
    console.log(`  Pending reminders: ${result.summary.pendingReminderCount}`)
    console.log(`  Sent reminders: ${result.summary.sentReminderCount}`)
    console.log(`  Blocked reminders: ${result.summary.blockedReminderCount}`)
    console.log(`  Skipped reminders: ${result.summary.skippedReminderCount}`)
    console.log(`  Repair states: ${result.summary.repairReminderCount}`)
    console.log(`  Georgia Day-30 next reminder: ${result.summary.georgiaDay30NextReminderDueAt || 'none'}`)
    console.log(`  Chris Day-30 next reminder: ${result.summary.chrisDay30NextReminderDueAt || 'none'}`)
    console.log(`AGENT_FEEDBACK_LIVE_REMINDERS_RESULT ${JSON.stringify({
      mode: result.mode,
      status: result.status,
      enabled: result.reminderEnablement.enabled,
      sendWindowOpen: result.sendWindow.canSendNow,
      failClosedReasons: result.reminderEnablement.failClosedReasons,
      pendingReminderCount: result.summary.pendingReminderCount,
      sentReminderCount: result.summary.sentReminderCount,
      blockedReminderCount: result.summary.blockedReminderCount,
      skippedReminderCount: result.summary.skippedReminderCount,
      repairReminderCount: result.summary.repairReminderCount,
      nextReminderDueDates: result.summary.nextReminderDueDates,
      georgiaDay30ReminderAction: result.summary.georgiaDay30ReminderAction,
      georgiaDay30NextReminderDueAt: result.summary.georgiaDay30NextReminderDueAt,
      chrisDay30ReminderAction: result.summary.chrisDay30ReminderAction,
      chrisDay30NextReminderDueAt: result.summary.chrisDay30NextReminderDueAt,
      metadataOnly: result.privacy.metadataOnly,
    })}`)
    if (!result.ok) process.exitCode = 1
    return
  }

  if (mode !== 'dry-run') throw new Error('Use --mode=dry-run or --mode=live.')

  await assertFoundationDbReadyForReadOnlyGate('agent-feedback:reminders')
  const syntheticProof = buildAgentFeedbackReminderSyntheticProof()
  const readiness = await buildAgentFeedbackReminderReadiness({
    includeCandidates,
    syntheticProof,
    now,
  })

  console.log('Agent Feedback reminder readiness')
  console.log(`  Card: ${readiness.cardId || AGENT_FEEDBACK_REMINDER_CARD_ID}`)
  console.log(`  Closeout: ${readiness.closeoutKey || AGENT_FEEDBACK_REMINDER_CLOSEOUT_KEY}`)
  console.log(`  Mode: ${readiness.summary.mode}`)
  console.log(`  Status: ${readiness.status}`)
  console.log(`  Schedule: day 1, day 3, day 7, day 10, day 14, day 17`)
  console.log(`  Cap: 6 reminders or 30 days`)
  console.log(`  Live reminders enabled: ${readiness.summary.liveRemindersEnabled ? 'yes' : 'no'}`)
  console.log(`  Send window: ${readiness.summary.sendWindowStart || '08:30'}-${readiness.summary.sendWindowEnd || '10:00'} ${readiness.summary.sendWindowTimezone || 'America/Toronto'}`)
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
