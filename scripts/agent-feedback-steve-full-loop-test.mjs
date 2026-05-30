#!/usr/bin/env node

import fs from 'node:fs/promises'
import process from 'node:process'
import {
  AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_APPROVAL_PATH,
  AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_MILESTONE_DAY,
  AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_TARGET,
  buildAgentFeedbackSteveFullLoopDryRunProof,
  buildAgentFeedbackSteveFullLoopSyntheticSubmitProof,
  executeApprovedSteveFullLoopSendOnly,
} from '../lib/agent-feedback-steve-full-loop-test.js'
import {
  assertFoundationDbReadyForReadOnlyGate,
  closeFoundationDb,
} from '../lib/foundation-db-session.js'

function argValue(name, fallback = '') {
  const prefix = `--${name}=`
  const item = process.argv.find(arg => arg.startsWith(prefix))
  return item ? item.slice(prefix.length) : fallback
}

async function readApproval(ref) {
  const approvalRef = String(ref || '').trim()
  if (!approvalRef) throw new Error('Live Steve full-loop mode requires --approvalRef=<approval json>.')
  return JSON.parse(await fs.readFile(approvalRef, 'utf8'))
}

function printMetadataOnly(result) {
  console.log(JSON.stringify(result, null, 2))
}

async function main() {
  const mode = argValue('mode', 'dry-run')
  await assertFoundationDbReadyForReadOnlyGate('agent-feedback:steve-full-loop-test')

  if (mode === 'dry-run') {
    const proof = await buildAgentFeedbackSteveFullLoopDryRunProof()
    printMetadataOnly(proof)
    return
  }

  if (mode === 'synthetic-submit') {
    printMetadataOnly(buildAgentFeedbackSteveFullLoopSyntheticSubmitProof())
    return
  }

  if (mode === 'send') {
    throw new Error('Mode send is disabled because it consumed the live emailed token. Use send-only.')
  }

  if (mode !== 'send-only') {
    throw new Error('Mode must be dry-run, synthetic-submit, or send-only.')
  }

  const approval = await readApproval(argValue('approvalRef', AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_APPROVAL_PATH))
  const targetName = String(approval.targetName || '')
  const milestoneDay = Number(approval.milestoneDay)
  if (targetName !== AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_TARGET ||
    milestoneDay !== AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_MILESTONE_DAY) {
    throw new Error('Steve full-loop test command only supports Steve Zahnd Day-30.')
  }

  const result = await executeApprovedSteveFullLoopSendOnly({ approval })
  printMetadataOnly(result)
}

main().catch(error => {
  console.error('Agent Feedback Steve full-loop test failed.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}).finally(async () => {
  await closeFoundationDb().catch(() => {})
})
