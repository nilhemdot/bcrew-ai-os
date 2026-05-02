#!/usr/bin/env node

import process from 'node:process'
import {
  AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID,
  AGENT_FEEDBACK_LIVE_REMINDERS_CLOSEOUT_KEY,
  buildAgentFeedbackReminderStatus,
  buildAgentFeedbackReminderSyntheticProof,
} from '../lib/agent-feedback-reminders.js'
import {
  assertFoundationDbReadyForReadOnlyGate,
  listAgentFeedbackSendAttemptsForMilestone,
} from '../lib/foundation-db.js'
import { getClickUpListSnapshot } from '../lib/clickup.js'
import { CLICKUP_AGENT_ROSTER_LIST_ID } from '../lib/agent-roster-review.js'

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

function findRosterTask(snapshot, name) {
  const normalized = String(name || '').toLowerCase()
  return (snapshot.tasks || []).find(task => String(task?.name || '').toLowerCase().includes(normalized)) || null
}

async function initialSendProof() {
  const snapshot = await getClickUpListSnapshot(CLICKUP_AGENT_ROSTER_LIST_ID)
  const targets = [
    { label: 'Georgia', name: 'Georgia Huntley' },
    { label: 'Chris', name: 'Chris Chopite' },
  ]
  const proof = []
  for (const target of targets) {
    const task = findRosterTask(snapshot, target.name)
    if (!task?.id) {
      proof.push({ label: target.label, found: false, protectedInitialAttemptCount: 0, requestedCount: 0 })
      continue
    }
    const attempts = await listAgentFeedbackSendAttemptsForMilestone({
      taskId: task.id,
      milestoneDay: 30,
    })
    const protectedAttempts = attempts.filter(attempt =>
      ['sending', 'sent', 'clickup_requested'].includes(String(attempt.status || '').trim())
    )
    proof.push({
      label: target.label,
      found: true,
      taskIdHashPresent: true,
      protectedInitialAttemptCount: protectedAttempts.length,
      requestedCount: protectedAttempts.filter(attempt => attempt.status === 'clickup_requested').length,
      duplicateInitialBlocked: protectedAttempts.length === 1 &&
        protectedAttempts[0]?.status === 'clickup_requested',
    })
  }
  return proof
}

async function main() {
  const args = parseArgs()
  const baseUrl = String(args.baseUrl || process.env.FOUNDATION_BASE_URL || 'http://localhost:3000')
  await assertFoundationDbReadyForReadOnlyGate('process:agent-feedback-live-reminders-check')
  const syntheticProof = buildAgentFeedbackReminderSyntheticProof()
  const [foundationHub, foundationBuildLog, opsHub, initialProof] = await Promise.all([
    fetchJson(baseUrl, '/api/foundation-hub'),
    fetchJson(baseUrl, '/api/foundation/build-log?limit=80'),
    fetchJson(baseUrl, '/api/ops-hub'),
    initialSendProof(),
  ])
  const status = await buildAgentFeedbackReminderStatus({
    repoRoot: process.cwd(),
    foundationHub,
    foundationBuildLog,
    opsHub,
    syntheticProof,
  })
  const duplicateInitialSafe = initialProof.every(item => item.duplicateInitialBlocked === true)
  if (!duplicateInitialSafe) {
    status.findings.push({
      check: 'Georgia and Chris Day-30 initial sends have exactly one protected Requested attempt each',
      detail: JSON.stringify(initialProof),
    })
    status.status = 'risk'
  }

  console.log('Agent Feedback live reminders proof')
  console.log(`  Card: ${AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID}`)
  console.log(`  Closeout: ${AGENT_FEEDBACK_LIVE_REMINDERS_CLOSEOUT_KEY}`)
  console.log(`  Base URL: ${baseUrl}`)
  console.log(`  Status: ${status.status}`)
  console.log(`  Live reminders enabled: ${status.summary.liveRemindersEnabled ? 'yes' : 'no'}`)
  console.log(`  Send window: ${status.summary.sendWindowStart}-${status.summary.sendWindowEnd} ${status.summary.sendWindowTimezone}`)
  console.log(`  Pending reminders: ${status.summary.pendingReminderCount}`)
  console.log(`  Sent reminders: ${status.summary.sentReminderCount}`)
  console.log(`  Blocked reminders: ${status.summary.blockedReminderCount}`)
  console.log(`  Skipped reminders: ${status.summary.skippedReminderCount}`)
  console.log(`  Repair states: ${status.summary.repairReminderCount}`)
  console.log(`  Next reminder due: ${(status.summary.nextReminderDueDates || []).join(', ') || 'none'}`)
  console.log(`  Georgia Day-30 next reminder: ${status.summary.georgiaDay30NextReminderDueAt || 'none'}`)
  console.log(`  Chris Day-30 next reminder: ${status.summary.chrisDay30NextReminderDueAt || 'none'}`)
  console.log(`  Duplicate initial sends blocked: ${duplicateInitialSafe ? 'yes' : 'no'}`)
  console.log(`  Completion/skipped/blocked stop: ${status.summary.completedSkippedBlockedStop ? 'yes' : 'no'}`)
  console.log(`  Duplicate reminder slot protected: ${status.summary.duplicateSlotProtected ? 'yes' : 'no'}`)
  console.log(`  Metadata-only proof: ${status.summary.metadataOnly ? 'yes' : 'no'}`)
  for (const finding of status.findings) {
    console.log(`FAIL ${finding.check}${finding.detail ? ` -> ${finding.detail}` : ''}`)
  }
  console.log(`AGENT_FEEDBACK_LIVE_REMINDERS_STATUS ${JSON.stringify({
    ...status.summary,
    duplicateInitialProof: initialProof,
  })}`)
  if (status.status !== 'healthy') process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
