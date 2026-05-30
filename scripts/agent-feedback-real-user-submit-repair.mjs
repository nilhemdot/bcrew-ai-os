#!/usr/bin/env node

import fs from 'node:fs/promises'
import process from 'node:process'
import {
  AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_APPROVAL_PATH,
  buildAgentFeedbackRealUserSubmitRepairStatus,
  buildAgentFeedbackRealUserSyntheticSubmitProof,
  executeApprovedRealUserSubmitRepairSendOnly,
} from '../lib/agent-feedback-real-user-submit-repair.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  assertFoundationDbReadyForReadOnlyGate,
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getFoundationSnapshot,
} from '../lib/foundation-strategy-docs-db.js'

function argValue(name, fallback = '') {
  const prefix = `--${name}=`
  const item = process.argv.find(arg => arg.startsWith(prefix))
  return item ? item.slice(prefix.length) : fallback
}

async function readApproval(ref) {
  const approvalRef = String(ref || '').trim()
  if (!approvalRef) throw new Error('Repair send-only mode requires --approvalRef=<approval json>.')
  return JSON.parse(await fs.readFile(approvalRef, 'utf8'))
}

function printMetadataOnly(result) {
  console.log(JSON.stringify(result, null, 2))
}

async function main() {
  const mode = argValue('mode', 'status')
  await assertFoundationDbReadyForReadOnlyGate('agent-feedback:real-user-submit-repair')

  if (mode === 'status') {
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
    })
    printMetadataOnly(status)
    return
  }

  if (mode === 'synthetic-submit') {
    printMetadataOnly(buildAgentFeedbackRealUserSyntheticSubmitProof())
    return
  }

  if (mode !== 'send-only') {
    throw new Error('Mode must be status, synthetic-submit, or send-only.')
  }

  const approval = await readApproval(argValue('approvalRef', AGENT_FEEDBACK_REAL_USER_SUBMIT_REPAIR_APPROVAL_PATH))
  const result = await executeApprovedRealUserSubmitRepairSendOnly({ approval })
  printMetadataOnly(result)
}

main().catch(error => {
  console.error('Agent Feedback real-user submit repair failed.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}).finally(async () => {
  await closeFoundationDb().catch(() => {})
})
