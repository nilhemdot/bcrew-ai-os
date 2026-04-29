#!/usr/bin/env node

import { buildSyntheticGateReliabilityProof } from '../lib/foundation-gate-reliability.js'

async function main() {
  const proof = await buildSyntheticGateReliabilityProof()

  console.log('Foundation gate reliability synthetic proof')
  console.log(`  Mode: ${proof.mode}`)
  console.log(`  Real DB deadlock induced: ${proof.realDeadlockInduced ? 'yes' : 'no'}`)
  console.log(`  Transient retry passed: ${proof.transient.passedAfterRetry ? 'yes' : 'no'} (${proof.transient.attempts} attempts)`)
  console.log(`  Permanent failure failed closed: ${proof.permanent.failedClosed ? 'yes' : 'no'} (${proof.permanent.attempts} attempt)`)
  console.log(`GATE_RELIABILITY_SUMMARY ${JSON.stringify(proof)}`)

  if (!proof.ok) process.exitCode = 1
}

main().catch(error => {
  console.error('Foundation gate reliability proof failed.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
