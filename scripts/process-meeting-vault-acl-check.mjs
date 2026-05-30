#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
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
  buildMeetingVaultNoDuplicateGoogleDocProof,
  buildSyntheticMeetingVaultAclProof,
  classifyMeetingLegacyDuplicateCopyAcl,
  classifyMeetingRawFileAcl,
  assertMeetingAclMutationApproved,
  MEETING_VAULT_ACL_CARD_ID,
  MEETING_VAULT_ACL_CLOSEOUT_KEY,
  MEETING_VAULT_ACL_STATES,
  MEETING_VAULT_ACL_SUMMARY_MARKER,
  MEETING_VAULT_SOURCE_FILE_ROLES,
  MEETING_VAULT_POLICY_VERSION,
} from '../lib/meeting-vault-acl.js'
import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  updateBacklogItem,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  listFoundationUsers,
} from '../lib/foundation-people-sales-db.js'
import {
  getLatestMeetingVaultAutoEnforcementRun,
  listMeetingRawDriveFileCandidates,
  recordMeetingVaultAclAudit,
} from '../lib/foundation-source-crawl-db.js'
import {
  MEETING_VAULT_AUTO_ENFORCEMENT_CARD_ID,
  MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY,
} from '../lib/meeting-vault-auto-enforcement.js'

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

async function readSource(path) {
  return fs.readFile(path, 'utf8')
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

function uniqueList(values = []) {
  return [...new Set(values.map(value => String(value || '').trim().toLowerCase()).filter(Boolean))]
}

function isReadableCrewbertOwned(preflight = {}) {
  return Boolean(preflight.readable) &&
    !preflight.ownerAmbiguous &&
    Number(preflight.permissionSummary?.crewbertOwnerCount || 0) > 0
}

function isReadableHumanOriginal(preflight = {}) {
  return Boolean(preflight.readable) &&
    !preflight.ownerAmbiguous &&
    Number(preflight.permissionSummary?.ownerCount || 0) === 1 &&
    Number(preflight.permissionSummary?.crewbertOwnerCount || 0) === 0
}

async function buildDriveFilePreflightWithFallback({ file, policy, fallbackAccounts }) {
  const accounts = uniqueList([
    file.sourceAccount,
    ...(Array.isArray(file.observedAccounts) ? file.observedAccounts : []),
    ...(Array.isArray(file.noteObservedAccounts) ? file.noteObservedAccounts : []),
    ...(Array.isArray(file.transcriptObservedAccounts) ? file.transcriptObservedAccounts : []),
    ...fallbackAccounts,
  ])
  let firstResult = null
  for (const account of accounts) {
    const preflight = await buildDriveFilePreflight({
      fileId: file.fileId,
      intendedActor: account,
      sourceAccount: account,
      purpose: 'meeting_vault_acl_phase_a',
      sourceId: file.sourceId,
      artifactId: file.artifactId,
      policy: policy.driveAccessPolicy,
    })
    if (!firstResult) firstResult = preflight
    if (preflight.readable) return preflight
  }
  return firstResult || await buildDriveFilePreflight({
    fileId: file.fileId,
    intendedActor: file.sourceAccount,
    sourceAccount: file.sourceAccount,
    purpose: 'meeting_vault_acl_phase_a',
    sourceId: file.sourceId,
    artifactId: file.artifactId,
    policy: policy.driveAccessPolicy,
  })
}

function annotateMeetingSourceRoles(scanned = []) {
  const groups = new Map()
  for (const item of scanned) {
    const key = item.file.meetingKey || item.file.fileRefHash
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  }

  for (const groupItems of groups.values()) {
    const hasOriginal = groupItems.some(item => isReadableHumanOriginal(item.preflight))
    for (const item of groupItems) {
      if (hasOriginal && isReadableCrewbertOwned(item.preflight)) {
        item.file.sourceFileRole = MEETING_VAULT_SOURCE_FILE_ROLES.LEGACY_CREWBERT_COPY
        item.file.legacyDuplicateCopy = true
      } else if (!hasOriginal && isReadableCrewbertOwned(item.preflight)) {
        item.file.sourceFileRole = MEETING_VAULT_SOURCE_FILE_ROLES.ORIGINAL_MISSING
        item.file.legacyDuplicateCopy = true
      } else {
        item.file.sourceFileRole = MEETING_VAULT_SOURCE_FILE_ROLES.ORIGINAL
        item.file.legacyDuplicateCopy = false
      }
    }
  }

  return scanned
}

function classifyMeetingAclScannedItem({ file, preflight, policy }) {
  if (file.sourceFileRole === MEETING_VAULT_SOURCE_FILE_ROLES.LEGACY_CREWBERT_COPY) {
    return classifyMeetingLegacyDuplicateCopyAcl(file, preflight, policy)
  }
  if (file.sourceFileRole === MEETING_VAULT_SOURCE_FILE_ROLES.ORIGINAL_MISSING) {
    const duplicate = classifyMeetingLegacyDuplicateCopyAcl(file, preflight, policy)
    return {
      ...duplicate,
      state: MEETING_VAULT_ACL_STATES.BLOCKED,
      safe: false,
      blockerCard: MEETING_VAULT_ACL_CARD_ID,
      blockerReasons: ['original_gemini_note_missing_for_crewbert_copy'],
      sourceFileRole: MEETING_VAULT_SOURCE_FILE_ROLES.ORIGINAL_MISSING,
      policy: {
        ...duplicate.policy,
        sourceFileRole: MEETING_VAULT_SOURCE_FILE_ROLES.ORIGINAL_MISSING,
      },
    }
  }
  return classifyMeetingRawFileAcl(file, preflight, policy)
}

function summarizeClassifications(classifications) {
  const stateCounts = {}
  for (const classification of classifications) {
    stateCounts[classification.state] = (stateCounts[classification.state] || 0) + 1
  }
  return stateCounts
}

async function updateMeetingBacklog(status, summary) {
  const latestAutoEnforcement = await getLatestMeetingVaultAutoEnforcementRun({
    cardId: MEETING_VAULT_AUTO_ENFORCEMENT_CARD_ID,
  }).catch(() => null)
  if (!status.cardCanClose &&
    latestAutoEnforcement?.status === 'ready' &&
    latestAutoEnforcement?.canCloseMeetingVaultAcl === true) {
    await updateBacklogItem(MEETING_VAULT_ACL_CARD_ID, {
      lane: 'done',
      nextAction: 'Keep MEETING-VAULT-ACL-001 closed through the automatic forward-flow proof. Treat this legacy Phase A dry-run as evidence only; do not restart manual historical permission batches without a separate approved legacy-exception cleanup card.',
      statusNote: `Closed on 2026-05-11 through \`${MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY}\`. Latest legacy Phase A dry-run remains evidence-only with dry-run hash ${summary.dryRunHash}; auto-enforcement report hash ${latestAutoEnforcement.reportHash}; no Google Drive emails or permission mutations were sent/applied by this proof.`,
    }, 'meeting-vault-acl-check')
    return
  }

  if (status.cardCanClose) {
    await updateBacklogItem(MEETING_VAULT_ACL_CARD_ID, {
      lane: 'done',
      nextAction: 'Keep MEETING-VAULT-ACL-001 closed only while Phase A proves every protected in-scope original Gemini meeting note is already safe and every unknown file is classified. Any new unsafe protected share, missing Crewbert permission on an original, missing access, owner ambiguity, unknown classification, missing original, or unscanned file reopens the raw Drive ACL/vault readiness blocker.',
      statusNote: `Closed on 2026-05-10 under \`${MEETING_VAULT_ACL_CLOSEOUT_KEY}\`. Source-truth Phase A dry-run proved every protected in-scope original Gemini meeting note already safe with dry-run hash ${summary.dryRunHash}; no Google Drive emails or permission mutations were sent/applied. Proof commands: \`npm run process:meeting-vault-acl-check\`, \`npm run process:foundation-done-test -- --report-only\`, \`npm run backlog:hygiene -- --json\`, and \`npm run foundation:verify\`.`,
    }, 'meeting-vault-acl-check')
    return
  }

  await updateBacklogItem(MEETING_VAULT_ACL_CARD_ID, {
    lane: 'scoped',
    nextAction: `Source-truth Phase A dry-run remains blocking. Dry-run hash ${summary.dryRunHash}; source roles=${JSON.stringify(summary.sourceFileRoleCounts || {})}; sensitivity classes=${JSON.stringify(status.sensitivityClassCounts || {})}; counts safe=${status.counts.safeCount}, unsafe=${status.counts.unsafeCount}, missingCrewbert=${status.counts.missingCrewbertCount}, missingAccess=${status.counts.missingAccessCount}, ownerAmbiguous=${status.counts.ownerAmbiguousCount}, blocked=${status.counts.blockedCount}; operation types=${Object.keys(status.proposedOperationTypes || {}).join(', ') || 'none'}. ${status.exactApprovalNeeded || 'Resolve Phase A blockers and rerun the dry-run.'}`,
    statusNote: `Scoped/blocking on 2026-05-10 under source-truth Phase A dry-run proof only. No Google Drive emails or permission mutations were sent/applied. Dry-run hash ${summary.dryRunHash}; blocker reason=${status.blockerReason}; inventory total=${summary.inventory.totalCandidates}; scanned=${summary.inventory.scannedFileCount}; complete=${summary.inventory.permissionScanComplete ? 'yes' : 'no'}; source roles=${JSON.stringify(summary.sourceFileRoleCounts || {})}; sensitivity classes=${JSON.stringify(status.sensitivityClassCounts || {})}; proposed operation types=${Object.keys(status.proposedOperationTypes || {}).join(', ') || 'none'}. MEETING-VAULT-ACL-001 can close only when every protected in-scope original Gemini note is safe and every unknown file is classified, or after separate Phase B approval tied to the source-truth dry-run hash, applied repairs, recheck proof, and rollback proof.`,
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
    const [
      meetingVaultAclSource,
      meetingVaultAclScriptSource,
      syncMeetingNotesArchiveSource,
      mirrorMeetingArchiveToDriveSource,
    ] = await Promise.all([
      readSource('lib/meeting-vault-acl.js'),
      readSource('scripts/process-meeting-vault-acl-check.mjs'),
      readSource('scripts/sync-meeting-notes-archive.mjs'),
      readSource('scripts/mirror-meeting-archive-to-drive.mjs'),
    ])
    const noDuplicateGoogleDocProof = buildMeetingVaultNoDuplicateGoogleDocProof({
      meetingVaultAclSource,
      meetingVaultAclScriptSource,
      syncMeetingNotesArchiveSource,
      mirrorMeetingArchiveToDriveSource,
    })
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
    const foundationUsers = await listFoundationUsers({ meetingSyncEnabled: true })
    const fallbackAccounts = uniqueList(foundationUsers.map(user => user.email))
    const scanned = await mapWithConcurrency(filesToScan, concurrency, async file => {
      const policy = buildMeetingAclPolicy(file)
      const preflight = await buildDriveFilePreflightWithFallback({
        file,
        policy,
        fallbackAccounts,
      })
      return { file, preflight, policy }
    })
    annotateMeetingSourceRoles(scanned)
    const classifications = scanned.map(classifyMeetingAclScannedItem)
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
      noDuplicateGoogleDocProof,
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
      sensitivityClassCounts: status.sensitivityClassCounts,
      stateCounts: summarizeClassifications(classifications),
      proposedOperationTypes: operationTypesFromClassifications(classifications),
      sourceFileRoleCounts: dryRunPlan.sourceFileRoleCounts || {},
      legacyDuplicateCopyCount: dryRunPlan.legacyDuplicateCopyCount || 0,
    }
    const rawFindings = noRawProof(summary)
    const findings = []
    if (!synthetic.ok) findings.push({ check: 'synthetic Phase A ACL fixtures classify safe/unsafe/missing/ambiguous states', detail: 'fixture proof failed' })
    if (!noDuplicateGoogleDocProof.ok) findings.push({ check: 'meeting jobs cannot create duplicate Gemini-note Google Docs and ACL uses originals only', detail: noDuplicateGoogleDocProof.findings.join(', ') })
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
      console.log(`  Sensitivity classes: ${JSON.stringify(status.sensitivityClassCounts || {})}`)
      console.log(`  Source file roles: ${JSON.stringify(summary.sourceFileRoleCounts || {})}`)
      console.log(`  Counts: safe=${status.counts.safeCount}; unsafe=${status.counts.unsafeCount}; missingCrewbert=${status.counts.missingCrewbertCount}; missingAccess=${status.counts.missingAccessCount}; ownerAmbiguous=${status.counts.ownerAmbiguousCount}; blocked=${status.counts.blockedCount}`)
      console.log(`  Operation types: ${Object.keys(summary.proposedOperationTypes).join(', ') || 'none'}`)
      console.log(`  Dry-run hash: ${status.dryRunHash}`)
      console.log(`  Apply path fails closed without Phase B approval: ${applyPathFailsClosed ? 'yes' : 'no'}`)
      console.log(`  No duplicate Google Docs rule: ${noDuplicateGoogleDocProof.ok ? 'yes' : 'no'}`)
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
