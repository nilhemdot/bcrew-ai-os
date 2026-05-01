#!/usr/bin/env node

import process from 'node:process'
import {
  AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID,
  AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CLOSEOUT_KEY,
  buildAgentFeedbackRealUserSubmitRepairStatus,
} from '../lib/agent-feedback-real-user-submit-repair.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { assertFoundationDbReadyForReadOnlyGate, closeFoundationDb, getFoundationSnapshot } from '../lib/foundation-db.js'

function hasArg(name) {
  return process.argv.includes(`--${name}`) || process.argv.includes(`--${name}=true`)
}

async function main() {
  await assertFoundationDbReadyForReadOnlyGate('process:agent-feedback-real-user-submit-repair-check')
  const foundationHub = await getFoundationSnapshot()
  const foundationBuildLog = {
    builds: getFoundationBuildCloseouts().map(closeout => ({
      ...closeout,
      operatorCloseout: true,
      closeoutKey: closeout.key,
    })),
  }
  const status = await buildAgentFeedbackRealUserSubmitRepairStatus({
    repoRoot: process.cwd(),
    foundationHub,
    foundationBuildLog,
    includeDuplicateProbe: hasArg('includeDuplicateProbe'),
  })

  console.log('Agent Feedback real-user submit repair check')
  console.log(`  Card: ${AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CARD_ID}`)
  console.log(`  Closeout: ${AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_CLOSEOUT_KEY}`)
  console.log(`  Status: ${status.status}`)
  console.log(`  Phase: ${status.phase}`)
  console.log(`  Repair card lane: ${status.summary.repairCardLane || 'missing'}`)
  console.log(`  Steve full-loop card lane: ${status.summary.steveLoopCardLane || 'missing'}`)
  console.log(`  Production card lane: ${status.summary.productionCardLane || 'missing'}`)
  console.log(`  Previous script responses superseded: ${status.summary.previousScriptResponsesSuperseded}/${status.summary.previousScriptResponses}`)
  console.log(`  Fresh send attempt: ${status.summary.freshSendAttempt?.status || 'missing'}`)
  console.log(`  Real browser response: ${status.summary.realBrowserResponse ? 'yes' : 'no'}`)
  console.log(`  Notification: ${status.summary.notification?.status || 'waiting'}`)
  console.log(`  Reminder stopped: ${status.summary.reminderStopped ? 'yes' : 'no'}`)
  console.log(`  Duplicate resend blocked: ${status.summary.duplicateResendBlocked ? 'yes' : 'not-probed-or-no'}`)
  console.log(`  Duplicate submit clear message: ${status.summary.duplicateSubmitClearMessage ? 'yes' : 'not-probed-or-no'}`)
  console.log(`  Gmail BCC metadata: ${status.summary.gmailMetadata?.bccHeaderPresent ? 'present' : 'missing'}`)
  console.log(`  Metadata-only proof: ${status.summary.metadataOnly ? 'yes' : 'no'}`)
  for (const finding of status.findings || []) {
    console.log(`FAIL ${finding.check}${finding.detail ? ` -> ${finding.detail}` : ''}`)
  }
  console.log(`AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_SUMMARY ${JSON.stringify(status.summary)}`)
  if (status.status !== 'healthy') process.exitCode = 1
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
