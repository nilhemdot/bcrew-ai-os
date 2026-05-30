#!/usr/bin/env node

import process from 'node:process'
import {
  buildAgentFeedbackSteveFullLoopTestStatus,
} from '../lib/agent-feedback-steve-full-loop-test.js'
import {
  assertFoundationDbReadyForReadOnlyGate,
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getFoundationSnapshot,
} from '../lib/foundation-strategy-docs-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'

async function main() {
  await assertFoundationDbReadyForReadOnlyGate('process:agent-feedback-steve-full-loop-test-check')
  const foundationHub = await getFoundationSnapshot()
  const foundationBuildLog = {
    builds: getFoundationBuildCloseouts().map(closeout => ({
      ...closeout,
      operatorCloseout: true,
      closeoutKey: closeout.key,
    })),
  }
  const status = await buildAgentFeedbackSteveFullLoopTestStatus({
    repoRoot: process.cwd(),
    foundationHub,
    foundationBuildLog,
  })

  console.log('Agent Feedback Steve full-loop test check')
  console.log(`Status: ${status.status}`)
  for (const [key, value] of Object.entries(status.summary || {})) {
    console.log(`  ${key}: ${Array.isArray(value) ? value.join(',') : value}`)
  }
  if (status.findings?.length) {
    console.log('Findings:')
    for (const finding of status.findings) {
      console.log(`- ${finding.check}${finding.detail ? ` -> ${finding.detail}` : ''}`)
    }
    process.exitCode = 1
  }
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
