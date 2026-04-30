#!/usr/bin/env node

import { buildSyntheticGateReliabilityProof } from '../lib/foundation-gate-reliability.js'
import {
  closeFoundationDb,
  getActionRouterSnapshot,
  getFoundationDbConstraintAudit,
  resetFoundationDb,
} from '../lib/foundation-db.js'

async function main() {
  const proof = await buildSyntheticGateReliabilityProof({
    transientAfterCleanup: {
      probe: async () => {
        await getFoundationDbConstraintAudit({ limit: 1 })
        await getActionRouterSnapshot({ limit: 1 })
      },
      cleanup: async () => {
        await resetFoundationDb()
      },
    },
  })

  console.log('Foundation gate reliability synthetic proof')
  console.log(`  Mode: ${proof.mode}`)
  console.log(`  Real DB deadlock induced: ${proof.realDeadlockInduced ? 'yes' : 'no'}`)
  console.log(`  Transient retry passed: ${proof.transient.passedAfterRetry ? 'yes' : 'no'} (${proof.transient.attempts} attempts)`)
  console.log(`  Transient after DB cleanup retry passed: ${proof.transientAfterCleanup.passedAfterCleanup ? 'yes' : 'no'} (${proof.transientAfterCleanup.attempts} attempts, ${proof.transientAfterCleanup.cleanupCalls} cleanup)`)
  console.log(`  Permanent failure failed closed: ${proof.permanent.failedClosed ? 'yes' : 'no'} (${proof.permanent.attempts} attempt)`)
  console.log(`GATE_RELIABILITY_SUMMARY ${JSON.stringify(proof)}`)

  if (!proof.ok) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('Foundation gate reliability proof failed.')
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
