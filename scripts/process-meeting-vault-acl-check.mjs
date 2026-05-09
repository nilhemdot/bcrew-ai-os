#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import process from 'node:process'
import { promisify } from 'node:util'

import {
  buildDriveFilePreflight,
} from '../lib/drive-access-preflight.js'
import {
  buildMeetingAclDryRunPlan,
  buildMeetingAclPolicy,
  buildMeetingRawFileInventory,
  buildMeetingVaultAclStatus,
  buildSyntheticMeetingVaultAclProof,
  classifyMeetingRawFileAcl,
  assertMeetingAclMutationApproved,
  MEETING_VAULT_ACL_CARD_ID,
  MEETING_VAULT_ACL_CLOSEOUT_KEY,
  MEETING_VAULT_ACL_SUMMARY_MARKER,
  MEETING_VAULT_POLICY_VERSION,
} from '../lib/meeting-vault-acl.js'
import {
  closeFoundationDb,
  initFoundationDb,
  listMeetingRawDriveFileCandidates,
  recordMeetingVaultAclAudit,
  updateBacklogItem,
} from '../lib/foundation-db.js'

const execFile = promisify(execFileCallback)

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [rawKey, ...rawValue] = arg.slice(2).split('=')
    args[rawKey] = rawValue.length ? rawValue.join('=') : 'true'
  }
  return args
}

function boolArg(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
}

async function currentHead() {
  try {
    const { stdout } = await execFile('git', ['rev-parse', 'HEAD'])
    return stdout.trim()
  } catch {
    return null
  }
}

async function mapWithConcurrency(items, concurrency, worker) {
  const output = new Array(items.length)
  let nextIndex = 0
  const workerCount = Math.min(items.length, Math.max(1, Number(concurrency) || 1))
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      output[index] = await worker(items[index], index)
    }
  }))
  return output
}

function noRawProof(summary) {
  const proofText = JSON.stringify(summary)
  const forbidden = [
    /content_text/i,
    /webViewLink/i,
    /sourceUrl/i,
    /title/i,
    /emailAddress/i,
    /https:\/\/docs\.google\.com/i,
  ]
  return forbidden.filter(pattern => pattern.test(proofText)).map(pattern => String(pattern))
}

function operationTypesFromClassifications(classifications) {
  const counts = {}
  for (const classification of classifications) {
    for (const operation of classification.proposedOperations || []) {
      if (!operation.operationType) continue
      counts[operation.operationType] = (counts[operation.operationType] || 0) + 1
    }
  }
  return counts
}

function summarizeClassifications(classifications) {
  const stateCounts = {}
  for (const classification of classifications) {
    stateCounts[classification.state] = (stateCounts[classification.state] || 0) + 1
  }
  return stateCounts
}

async function updateMeetingBacklog(status, summary) {
  if (status.cardCanClose) {
    await updateBacklogItem(MEETING_VAULT_ACL_CARD_ID, {
      lane: 'done',
      nextAction: 'Keep MEETING-VAULT-ACL-001 closed only while Phase A proves every in-scope raw meeting file is already safe. Any new unsafe share, missing Crewbert permission, missing access, owner ambiguity, or unscanned file reopens the raw Drive ACL/vault readiness blocker.',
      statusNote: `Closed on 2026-05-09 under \`${MEETING_VAULT_ACL_CLOSEOUT_KEY}\`. Phase A dry-run proved every in-scope raw meeting file already safe with dry-run hash ${summary.dryRunHash}; no Google Drive emails or permission mutations were sent/applied. Proof commands: \`npm run process:meeting-vault-acl-check\`, \`npm run process:foundation-done-test -- --report-only\`, \`npm run backlog:hygiene -- --json\`, and \`npm run foundation:verify\`.`,
    }, 'meeting-vault-acl-check')
    return
  }

  await updateBacklogItem(MEETING_VAULT_ACL_CARD_ID, {
    lane: 'scoped',
    nextAction: `Phase A dry-run remains blocking. Dry-run hash ${summary.dryRunHash}; counts safe=${status.counts.safeCount}, unsafe=${status.counts.unsafeCount}, missingCrewbert=${status.counts.missingCrewbertCount}, missingAccess=${status.counts.missingAccessCount}, ownerAmbiguous=${status.counts.ownerAmbiguousCount}, blocked=${status.counts.blockedCount}; operation types=${Object.keys(status.proposedOperationTypes || {}).join(', ') || 'none'}. ${status.exactApprovalNeeded || 'Resolve Phase A blockers and rerun the dry-run.'}`,
    statusNote: `Scoped/blocking on 2026-05-09 under Phase A dry-run proof only. No Google Drive emails or permission mutations were sent/applied. Dry-run hash ${summary.dryRunHash}; blocker reason=${status.blockerReason}; inventory total=${summary.inventory.totalCandidates}; scanned=${summary.inventory.scannedFileCount}; complete=${summary.inventory.permissionScanComplete ? 'yes' : 'no'}; proposed operation types=${Object.keys(status.proposedOperationTypes || {}).join(', ') || 'none'}. MEETING-VAULT-ACL-001 can close only when every in-scope file is safe, or after separate Phase B approval tied to the dry-run hash, applied repairs, recheck proof, and rollback proof.`,
  }, 'meeting-vault-acl-check')
}

async function main() {
  const args = parseArgs()
  const jsonOnly = boolArg(args.json)
  const applyRequested = boolArg(args.apply)
  const candidateLimit = Math.min(5000, Math.max(1, Number(args.candidateLimit || args['candidate-limit'] || 5000) || 5000))
  const permissionLimit = Math.min(candidateLimit, Math.max(1, Number(args.permissionLimit || args['permission-limit'] || candidateLimit) || candidateLimit))
  const concurrency = Math.min(8, Math.max(1, Number(args.concurrency || 4) || 4))
  const repoHead = await currentHead()

  if (applyRequested) {
    try {
      assertMeetingAclMutationApproved({
        approvalRef: args.approvalRef,
        dryRunHash: args.dryRunHash,
        fileId: args.fileId,
        operation: { operationType: args.operationType },
      })
      console.error('Unexpected Phase B approval acceptance; real Drive mutation is outside this approved slice.')
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error))
    }
    process.exitCode = 1
    return
  }

  await initFoundationDb()
  try {
    const synthetic = buildSyntheticMeetingVaultAclProof()
    let applyPathFailsClosed = false
    try {
      assertMeetingAclMutationApproved({
        dryRunHash: 'synthetic-dry-run-hash',
        fileId: 'synthetic-file-id',
        operation: { operationType: 'remove_unsafe_permission' },
      })
    } catch {
      applyPathFailsClosed = true
    }

    const candidates = await listMeetingRawDriveFileCandidates({ limit: candidateLimit })
    const inventory = buildMeetingRawFileInventory({ ...candidates, limit: candidateLimit })
    const filesToScan = inventory.items.slice(0, permissionLimit)
    const permissionScanComplete = inventory.complete && filesToScan.length === inventory.totalCandidates
    const classifications = await mapWithConcurrency(filesToScan, concurrency, async file => {
      const preflight = await buildDriveFilePreflight({
        fileId: file.fileId,
        intendedActor: file.sourceAccount,
        sourceAccount: file.sourceAccount,
        purpose: 'meeting_vault_acl_phase_a',
        sourceId: file.sourceId,
        artifactId: file.artifactId,
      })
      return classifyMeetingRawFileAcl(file, preflight, buildMeetingAclPolicy(file))
    })
    const dryRunPlan = buildMeetingAclDryRunPlan(classifications)
    const status = buildMeetingVaultAclStatus({
      inventoryComplete: permissionScanComplete,
      phaseAComplete: true,
      dryRunPlan,
    })
    if (!permissionScanComplete && !status.exactApprovalNeeded) {
      status.exactApprovalNeeded = 'Complete the Phase A permission inventory scan before any Phase B approval can be valid.'
    }

    const summary = {
      cardId: MEETING_VAULT_ACL_CARD_ID,
      closeoutKey: MEETING_VAULT_ACL_CLOSEOUT_KEY,
      policyVersion: MEETING_VAULT_POLICY_VERSION,
      repoHead,
      status: status.status,
      cardCanClose: status.cardCanClose,
      syntheticOk: synthetic.ok,
      applyPathFailsClosed,
      dryRunHash: status.dryRunHash,
      blockerReason: status.blockerReason,
      exactApprovalNeeded: status.exactApprovalNeeded,
      inventory: {
        totalCandidates: inventory.totalCandidates,
        returnedCandidates: inventory.returnedCandidates,
        scannedFileCount: filesToScan.length,
        inventoryComplete: inventory.complete,
        permissionScanComplete,
      },
      counts: status.counts,
      stateCounts: summarizeClassifications(classifications),
      proposedOperationTypes: operationTypesFromClassifications(classifications),
    }
    const rawFindings = noRawProof(summary)
    const findings = []
    if (!synthetic.ok) findings.push({ check: 'synthetic Phase A ACL fixtures classify safe/unsafe/missing/ambiguous states', detail: 'fixture proof failed' })
    if (!applyPathFailsClosed) findings.push({ check: 'apply path fails closed without Phase B approval', detail: 'approval guard accepted missing approval' })
    if (inventory.totalCandidates <= 0) findings.push({ check: 'meeting raw file inventory exists', detail: 'no in-scope raw meeting file refs discovered' })
    if (!filesToScan.length) findings.push({ check: 'Phase A scanned at least one in-scope file', detail: 'permission scan was empty' })
    if (rawFindings.length) findings.push({ check: 'proof output is metadata-only', detail: rawFindings.join(', ') })

    const finalStatus = findings.length ? 'failed_closed' : status.status
    summary.status = finalStatus

    await recordMeetingVaultAclAudit({
      cardId: MEETING_VAULT_ACL_CARD_ID,
      policyVersion: MEETING_VAULT_POLICY_VERSION,
      status: finalStatus,
      dryRunHash: status.dryRunHash,
      inventoryTotal: inventory.totalCandidates,
      inventoryScanned: filesToScan.length,
      inventoryComplete: permissionScanComplete,
      phaseAComplete: true,
      counts: status.counts,
      proposedOperationTypes: summary.proposedOperationTypes,
      summary,
    }, 'meeting-vault-acl-check')

    await updateMeetingBacklog(status, summary)

    if (!jsonOnly) {
      console.log('Meeting vault ACL Phase A dry-run proof')
      console.log(`  Card: ${MEETING_VAULT_ACL_CARD_ID}`)
      console.log(`  Policy: ${MEETING_VAULT_POLICY_VERSION}`)
      console.log(`  Repo: ${repoHead ? repoHead.slice(0, 7) : 'unknown'}`)
      console.log(`  Status: ${summary.status}`)
      console.log(`  Card can close: ${status.cardCanClose ? 'yes' : 'no'}`)
      console.log(`  Inventory: candidates=${inventory.totalCandidates}; scanned=${filesToScan.length}; complete=${permissionScanComplete ? 'yes' : 'no'}`)
      console.log(`  Counts: safe=${status.counts.safeCount}; unsafe=${status.counts.unsafeCount}; missingCrewbert=${status.counts.missingCrewbertCount}; missingAccess=${status.counts.missingAccessCount}; ownerAmbiguous=${status.counts.ownerAmbiguousCount}; blocked=${status.counts.blockedCount}`)
      console.log(`  Operation types: ${Object.keys(summary.proposedOperationTypes).join(', ') || 'none'}`)
      console.log(`  Dry-run hash: ${status.dryRunHash}`)
      console.log(`  Apply path fails closed without Phase B approval: ${applyPathFailsClosed ? 'yes' : 'no'}`)
      console.log(`  Blocker reason: ${status.blockerReason || 'none'}`)
      if (status.exactApprovalNeeded) console.log(`  Exact approval needed: ${status.exactApprovalNeeded}`)
      for (const finding of findings) {
        console.log(`FAIL ${finding.check}${finding.detail ? ` -> ${finding.detail}` : ''}`)
      }
    } else {
      console.log(JSON.stringify({ summary, findings }, null, 2))
    }

    console.log(`${MEETING_VAULT_ACL_SUMMARY_MARKER} ${JSON.stringify(summary)}`)
    if (findings.length) process.exitCode = 1
  } finally {
    await closeFoundationDb()
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
