#!/usr/bin/env node

import fs from 'node:fs/promises'
import process from 'node:process'
import {
  AGENT_FEEDBACK_SEND_DEFAULT_MILESTONE,
  AGENT_FEEDBACK_SEND_DEFAULT_TARGET,
  buildAgentFeedbackDryRunProof,
  executeApprovedAgentFeedbackSend,
} from '../lib/agent-feedback-send.js'
import { assertFoundationDbReadyForReadOnlyGate } from '../lib/foundation-db-session.js'

function argValue(name, fallback = '') {
  const prefix = `--${name}=`
  const item = process.argv.find(arg => arg.startsWith(prefix))
  return item ? item.slice(prefix.length) : fallback
}

async function readApproval(ref) {
  const approvalRef = String(ref || '').trim()
  if (!approvalRef) throw new Error('SEND APPROVED mode requires --approvalRef=<route-specific approval json>.')
  return JSON.parse(await fs.readFile(approvalRef, 'utf8'))
}

function printMetadataOnly(result) {
  console.log(JSON.stringify({
    ok: true,
    mode: result.mode || 'dry-run',
    target: result.target,
    milestone: result.milestone,
    eligibility: result.eligibility,
    recipientPlan: result.recipientPlan,
    email: result.email,
    token: result.token,
    clickUpWritebackPlan: result.clickUpWritebackPlan,
    duplicateProtection: result.duplicateProtection,
    sideEffects: result.sideEffects,
    gmail: result.gmail || undefined,
    clickUpRequestedWritten: result.clickUpRequestedWritten,
  }, null, 2))
}

async function main() {
  const mode = argValue('mode', 'dry-run')
  const targetName = argValue('targetName', AGENT_FEEDBACK_SEND_DEFAULT_TARGET)
  const milestoneDay = Number(argValue('milestoneDay', String(AGENT_FEEDBACK_SEND_DEFAULT_MILESTONE)))
  await assertFoundationDbReadyForReadOnlyGate('agent-feedback:test-email')

  if (mode === 'dry-run') {
    const proof = await buildAgentFeedbackDryRunProof({ targetName, milestoneDay })
    printMetadataOnly(proof)
    return
  }

  if (mode !== 'send') {
    throw new Error('Mode must be dry-run or send.')
  }

  const approval = await readApproval(argValue('approvalRef'))
  const result = await executeApprovedAgentFeedbackSend({
    targetName,
    milestoneDay,
    approval,
  })
  printMetadataOnly(result)
}

main().catch(error => {
  console.error('Agent feedback send command failed.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
