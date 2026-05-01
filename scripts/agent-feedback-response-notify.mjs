#!/usr/bin/env node

import process from 'node:process'
import {
  AGENT_FEEDBACK_RESPONSE_NOTIFY_CARD_ID,
  buildAgentFeedbackResponseNotificationDryRunProof,
} from '../lib/agent-feedback-response-notify.js'
import { assertFoundationDbReadyForReadOnlyGate } from '../lib/foundation-db.js'

function argValue(name, fallback = '') {
  const prefix = `--${name}=`
  const item = process.argv.find(arg => arg.startsWith(prefix))
  return item ? item.slice(prefix.length) : fallback
}

function printProof(proof) {
  console.log(JSON.stringify({
    cardId: proof.cardId,
    mode: proof.mode,
    sequence: proof.sequence,
    response: proof.response,
    clickUpWriteback: proof.clickUpWriteback,
    notification: proof.notification,
  }, null, 2))
}

async function main() {
  const mode = argValue('mode', 'dry-run')
  const synthetic = argValue('synthetic', 'true') !== 'false'
  const clickUpWritebackStatus = argValue('clickUpWritebackStatus', 'succeeded')
  await assertFoundationDbReadyForReadOnlyGate('agent-feedback:response-notify')
  if (mode !== 'dry-run') {
    throw new Error('AGENT-FEEDBACK-RESPONSE-NOTIFY-001 proof command only supports --mode=dry-run.')
  }
  if (!synthetic) {
    throw new Error('Response notification proof must use --synthetic=true in this build.')
  }

  const proof = await buildAgentFeedbackResponseNotificationDryRunProof({ clickUpWritebackStatus })
  printProof(proof)
  console.log(`AGENT_FEEDBACK_RESPONSE_NOTIFY_SUMMARY ${JSON.stringify({
    cardId: AGENT_FEEDBACK_RESPONSE_NOTIFY_CARD_ID,
    mode: proof.mode,
    clickUpWritebackStatus: proof.clickUpWriteback.status,
    repairStatus: proof.clickUpWriteback.repairStatus,
    recipientRoles: proof.notification.recipientRoles,
    duplicateProtected: proof.notification.duplicateProtected,
    gmailSent: proof.notification.gmailSent,
    metadataOnly: proof.notification.rawEmailsLogged === false &&
      proof.notification.rawTokenLogged === false &&
      proof.notification.feedbackContentLogged === false,
  })}`)
}

main().catch(error => {
  console.error('Agent feedback response notification proof failed.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
