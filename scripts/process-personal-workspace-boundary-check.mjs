#!/usr/bin/env node

import {
  buildPersonalWorkspaceBoundaryStatus,
} from '../lib/foundation-personal-workspace-boundary.js'

async function main() {
  const status = await buildPersonalWorkspaceBoundaryStatus({
    repoRoot: process.cwd(),
    includeSynthetic: true,
  })

  console.log('Personal workspace boundary check')
  console.log(`  Status: ${status.status}`)
  console.log(`  Real private proof mode: ${status.realPrivateProofMode}`)
  console.log(`  Real private files read: ${status.realPrivateFilesRead ? 'yes' : 'no'}`)
  console.log(`  Real private content copied: ${status.realPrivateContentCopied ? 'yes' : 'no'}`)
  console.log(`  Private paths checked: ${status.summary.privatePathCount}`)
  console.log(`  Synthetic sentinel leak proof: ${status.summary.syntheticSentinelProof ? 'pass' : 'fail'}`)
  console.log(`PERSONAL_WORKSPACE_BOUNDARY_SUMMARY ${JSON.stringify({
    status: status.status,
    realPrivateProofMode: status.realPrivateProofMode,
    realPrivateFilesRead: status.realPrivateFilesRead,
    realPrivateContentCopied: status.realPrivateContentCopied,
    privatePathCount: status.summary.privatePathCount,
    existingPrivatePathCount: status.summary.existingPrivatePathCount,
    syntheticSentinelProof: status.summary.syntheticSentinelProof,
    sentinelValuesReturned: status.syntheticProof?.sentinelValuesReturned === true,
  })}`)

  if (status.status !== 'healthy') process.exitCode = 1
}

main().catch(error => {
  console.error('Personal workspace boundary check failed.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
