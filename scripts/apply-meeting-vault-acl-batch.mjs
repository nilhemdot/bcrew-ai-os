#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { execFile as execFileCallback } from 'node:child_process'
import { promisify } from 'node:util'

import {
  buildDriveFilePreflight,
  DRIVE_PERMISSION_OPERATION_TYPES,
  hashProofValue,
} from '../lib/drive-access-preflight.js'
import {
  createDrivePermission,
  deleteDrivePermission,
  listDrivePermissions,
} from '../lib/google-delegated.js'
import {
  buildMeetingAclDryRunPlan,
  buildMeetingAclPolicy,
  buildMeetingRawFileInventory,
  buildMeetingAclRollbackPlan,
  classifyMeetingRawFileAcl,
  MEETING_VAULT_ACL_CARD_ID,
  MEETING_VAULT_POLICY_VERSION,
  MEETING_VAULT_SENSITIVITY_CLASSES,
} from '../lib/meeting-vault-acl.js'
import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  updateBacklogItem,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  listMeetingRawDriveFileCandidates,
  recordMeetingVaultAclAudit,
} from '../lib/foundation-source-crawl-db.js'

const execFile = promisify(execFileCallback)

const APPROVED_BATCH = {
  name: 'batch_1_protected_sensitive_owner_clear_add_crewbert_reader',
  dryRunHash: '31c5bb2cab981f1bb19cb49ff3bdf6b0ea19b0fe1ed871b5d7385f025f34ee4d',
  batchHash: 'f4e3b19c08f53bd9d476903cc1ebc7d6356b845e590f86b08cfe6960db1d2105',
  sensitivityClass: MEETING_VAULT_SENSITIVITY_CLASSES.PROTECTED,
  operationType: DRIVE_PERMISSION_OPERATION_TYPES.ADD_CREWBERT_READER,
  role: 'reader',
  ownerState: 'owner_clear_only',
  fileCount: 190,
  operationCount: 190,
  crewbertEmail: 'crewbert@bensoncrew.ca',
}

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

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value)
    .sort()
    .reduce((acc, key) => {
      if (value[key] !== undefined) acc[key] = stableValue(value[key])
      return acc
    }, {})
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value))
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex')
}

function hashObject(value) {
  return sha256(stableStringify(value))
}

async function currentHead() {
  try {
    const { stdout } = await execFile('git', ['rev-parse', 'HEAD'])
    return stdout.trim()
  } catch {
    return null
  }
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true })
}

async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath))
  await fs.writeFile(filePath, `${JSON.stringify(stableValue(value), null, 2)}\n`, 'utf8')
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

function metadataPath(filePath) {
  return filePath.replace(process.cwd(), '.')
}

function assertApproval(approval, args) {
  const failures = []
  const expectedDryRunHash = String(args.dryRunHash || APPROVED_BATCH.dryRunHash).trim()
  const expectedBatchHash = String(args.batchHash || APPROVED_BATCH.batchHash).trim()
  if (approval.cardId !== MEETING_VAULT_ACL_CARD_ID) failures.push('cardId mismatch')
  if (approval.phase !== 'Phase B') failures.push('phase must be Phase B')
  if (approval.approvedDryRunHash !== expectedDryRunHash) failures.push('approved dry-run hash mismatch')
  if (approval.approvedBatchHash !== expectedBatchHash) failures.push('approved batch hash mismatch')
  if (approval.approvedBatch !== APPROVED_BATCH.name) failures.push('approved batch mismatch')
  if (approval.approvedOperationType !== APPROVED_BATCH.operationType) failures.push('approved operation type mismatch')
  if (approval.approvedRole !== APPROVED_BATCH.role) failures.push('approved role mismatch')
  if (Number(approval.approvedFileCount) !== APPROVED_BATCH.fileCount) failures.push('approved file count mismatch')
  if (Number(approval.approvedOperationCount) !== APPROVED_BATCH.operationCount) failures.push('approved operation count mismatch')
  if (approval.noRequestAccessEmails !== true) failures.push('request-access email boundary missing')
  if (approval.permissionRemovalsApproved !== false) failures.push('permission removals must be false')
  if (approval.ownerAmbiguousApproved !== false) failures.push('owner-ambiguous files must be false')
  if (approval.missingAccessApproved !== false) failures.push('missing-access files must be false')
  if (approval.driveMutationApproved !== true) failures.push('drive mutation approval must be explicit for this batch')
  if (failures.length) {
    throw new Error(`Phase B Batch 1 approval artifact failed validation: ${failures.join('; ')}`)
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

function permissionEmail(permission) {
  return String(permission?.emailAddress || '').trim().toLowerCase()
}

function crewbertPermissionExists(permissions) {
  return permissions.some(permission =>
    permissionEmail(permission) === APPROVED_BATCH.crewbertEmail &&
    ['owner', 'organizer', 'fileorganizer', 'writer', 'commenter', 'reader'].includes(String(permission.role || '').trim().toLowerCase()) &&
    !permission.deleted
  )
}

function buildApprovedOperation(record) {
  return {
    fileId: record.file.fileId,
    fileRefHash: record.file.fileRefHash,
    sourceAccount: record.file.sourceAccount,
    sourceAccountHash: record.preflight.sourceAccountHash,
    ownerHash: record.preflight.ownerHash,
    sensitivityClass: record.policy.sensitivityClass,
    operationType: APPROVED_BATCH.operationType,
    role: APPROVED_BATCH.role,
    targetEmail: APPROVED_BATCH.crewbertEmail,
    sendNotificationEmail: false,
    beforePermissionSummary: record.preflight.permissionSummary,
    rollback: buildMeetingAclRollbackPlan({
      operationType: APPROVED_BATCH.operationType,
      fileRefHash: record.file.fileRefHash,
      ownerHash: record.preflight.ownerHash,
    }),
  }
}

function selectApprovedBatch(records) {
  return records.filter(record =>
    record.policy.sensitivityClass === APPROVED_BATCH.sensitivityClass &&
    record.preflight.readable === true &&
    record.preflight.ownerAmbiguous === false &&
    record.preflight.missingCrewbert === true &&
    (record.preflight.proposedOperations || []).some(operation =>
      operation.operationType === APPROVED_BATCH.operationType
    )
  )
}

async function buildPreflightRecords({ candidateLimit, concurrency }) {
  const candidates = await listMeetingRawDriveFileCandidates({ limit: candidateLimit })
  const inventory = buildMeetingRawFileInventory({ ...candidates, limit: candidateLimit })
  const records = await mapWithConcurrency(inventory.items, concurrency, async file => {
    const policy = buildMeetingAclPolicy(file)
    const preflight = await buildDriveFilePreflight({
      fileId: file.fileId,
      intendedActor: file.sourceAccount,
      sourceAccount: file.sourceAccount,
      purpose: 'meeting_vault_acl_phase_b_batch_1_apply_preflight',
      sourceId: file.sourceId,
      artifactId: file.artifactId,
      policy: policy.driveAccessPolicy,
    })
    const classification = classifyMeetingRawFileAcl(file, preflight, policy)
    return { file, policy, preflight, classification }
  })
  const dryRunPlan = buildMeetingAclDryRunPlan(records.map(record => record.classification))
  return { inventory, records, dryRunPlan }
}

async function buildApplyManifest({ approval, args, repoHead }) {
  const candidateLimit = Math.min(5000, Math.max(1, Number(args.candidateLimit || args['candidate-limit'] || 5000) || 5000))
  const concurrency = Math.min(8, Math.max(1, Number(args.concurrency || 4) || 4))
  const { inventory, records, dryRunPlan } = await buildPreflightRecords({ candidateLimit, concurrency })
  if (dryRunPlan.dryRunHash !== approval.approvedDryRunHash) {
    throw new Error(`Phase B Batch 1 fail-closed: live dry-run hash ${dryRunPlan.dryRunHash} does not match approved hash ${approval.approvedDryRunHash}.`)
  }
  const batchRecords = selectApprovedBatch(records)
  if (batchRecords.length !== APPROVED_BATCH.fileCount) {
    throw new Error(`Phase B Batch 1 fail-closed: selected ${batchRecords.length} files, expected ${APPROVED_BATCH.fileCount}.`)
  }
  const operations = batchRecords.map(buildApprovedOperation)
  const manifest = {
    manifestType: 'meeting_vault_acl_phase_b_apply_manifest',
    cardId: MEETING_VAULT_ACL_CARD_ID,
    phase: 'Phase B',
    batch: APPROVED_BATCH.name,
    approvedDryRunHash: approval.approvedDryRunHash,
    approvedBatchHash: approval.approvedBatchHash,
    policyVersion: MEETING_VAULT_POLICY_VERSION,
    repoHead,
    generatedAt: new Date().toISOString(),
    approvalRef: args.approvalRef,
    boundaries: {
      operationType: APPROVED_BATCH.operationType,
      sensitivityClass: APPROVED_BATCH.sensitivityClass,
      ownerState: APPROVED_BATCH.ownerState,
      role: APPROVED_BATCH.role,
      sendNotificationEmail: false,
      noRemovals: true,
      noRequestAccessEmails: true,
      noOwnerAmbiguousFiles: true,
      noMissingAccessFiles: true,
    },
    inventory: {
      totalCandidates: inventory.totalCandidates,
      selectedFileCount: operations.length,
      operationCount: operations.length,
      dryRunHash: dryRunPlan.dryRunHash,
      stateCounts: dryRunPlan.stateCounts,
      sensitivityClassCounts: dryRunPlan.sensitivityClassCounts,
      proposedOperationTypes: dryRunPlan.proposedOperationTypes,
    },
    operations,
  }
  return {
    manifest,
    manifestHash: hashObject(manifest),
    dryRunPlan,
  }
}

async function applyOperation(operation) {
  const beforePermissions = await listDrivePermissions(operation.sourceAccount, operation.fileId)
  if (crewbertPermissionExists(beforePermissions)) {
    const crewbertRole = beforePermissions.find(permission =>
      permissionEmail(permission) === APPROVED_BATCH.crewbertEmail &&
      !permission.deleted
    )?.role || null
    return {
      status: String(crewbertRole || '').toLowerCase() === 'owner' ? 'skipped_crewbert_owner' : 'skipped_already_present',
      operationType: operation.operationType,
      fileRefHash: operation.fileRefHash,
      ownerHash: operation.ownerHash,
      sourceAccountHash: operation.sourceAccountHash,
      beforePermissionSnapshotHash: hashObject(beforePermissions),
      afterPermissionSnapshotHash: hashObject(beforePermissions),
      rollbackAvailable: false,
    }
  }

  const created = await createDrivePermission(operation.sourceAccount, operation.fileId, {
    emailAddress: operation.targetEmail,
    role: operation.role,
    type: 'user',
    sendNotificationEmail: false,
  })
  const afterPermissions = await listDrivePermissions(operation.sourceAccount, operation.fileId)
  const verifiedPresent = crewbertPermissionExists(afterPermissions)
  const createdPermission = afterPermissions.find(permission => permission.id === created?.id)
  const createdIsCrewbertOwner = createdPermission &&
    permissionEmail(createdPermission) === APPROVED_BATCH.crewbertEmail &&
    String(createdPermission.role || '').trim().toLowerCase() === 'owner'
  return {
    status: createdIsCrewbertOwner ? 'skipped_crewbert_owner' : verifiedPresent ? 'applied' : 'applied_unverified',
    operationType: operation.operationType,
    fileRefHash: operation.fileRefHash,
    ownerHash: operation.ownerHash,
    sourceAccountHash: operation.sourceAccountHash,
    createdPermissionId: created?.id || null,
    createdPermissionHash: created?.id ? hashProofValue(created.id, 'perm') : null,
    createdPermissionRole: created?.role || operation.role,
    beforePermissionSnapshotHash: hashObject(beforePermissions),
    afterPermissionSnapshotHash: hashObject(afterPermissions),
    rollbackAvailable: Boolean(created?.id) && !createdIsCrewbertOwner,
    rollbackOperation: created?.id && !createdIsCrewbertOwner
      ? {
          operationType: 'delete_crewbert_permission',
          fileId: operation.fileId,
          sourceAccount: operation.sourceAccount,
          permissionId: created.id,
          fileRefHash: operation.fileRefHash,
          permissionHash: hashProofValue(created.id, 'perm'),
        }
      : null,
  }
}

async function applyManifest({ manifest, applyConcurrency }) {
  const results = await mapWithConcurrency(manifest.operations, applyConcurrency, async operation => {
    try {
      return await applyOperation(operation)
    } catch (error) {
      return {
        status: 'failed',
        operationType: operation.operationType,
        fileRefHash: operation.fileRefHash,
        ownerHash: operation.ownerHash,
        sourceAccountHash: operation.sourceAccountHash,
        errorClass: error?.response?.status || error?.status || 'google_api_error',
        errorMessageHash: hashProofValue(error instanceof Error ? error.message : String(error || ''), 'err'),
        rollbackAvailable: false,
      }
    }
  })
  const rollbackOperations = results
    .map(result => result.rollbackOperation)
    .filter(Boolean)
  const counts = results.reduce((acc, result) => {
    acc[result.status] = (acc[result.status] || 0) + 1
    return acc
  }, {})
  return {
    results,
    rollbackManifest: {
      manifestType: 'meeting_vault_acl_phase_b_rollback_manifest',
      cardId: MEETING_VAULT_ACL_CARD_ID,
      phase: 'Phase B',
      batch: APPROVED_BATCH.name,
      approvedDryRunHash: manifest.approvedDryRunHash,
      approvedBatchHash: manifest.approvedBatchHash,
      generatedAt: new Date().toISOString(),
      rollbackOperationCount: rollbackOperations.length,
      rollbackOperations,
    },
    counts,
  }
}

async function rollbackFromManifest({ rollbackManifestPath, concurrency }) {
  const manifest = await readJson(rollbackManifestPath)
  if (manifest.cardId !== MEETING_VAULT_ACL_CARD_ID || manifest.batch !== APPROVED_BATCH.name) {
    throw new Error('Rollback manifest does not match MEETING-VAULT-ACL-001 Batch 1.')
  }
  const operations = Array.isArray(manifest.rollbackOperations) ? manifest.rollbackOperations : []
  const results = await mapWithConcurrency(operations, concurrency, async operation => {
    try {
      await deleteDrivePermission(operation.sourceAccount, operation.fileId, operation.permissionId)
      return {
        status: 'rolled_back',
        fileRefHash: operation.fileRefHash,
        permissionHash: operation.permissionHash,
      }
    } catch (error) {
      return {
        status: 'rollback_failed',
        fileRefHash: operation.fileRefHash,
        permissionHash: operation.permissionHash,
        errorMessageHash: hashProofValue(error instanceof Error ? error.message : String(error || ''), 'err'),
      }
    }
  })
  return {
    manifestHash: hashObject(manifest),
    rollbackOperationCount: operations.length,
    results,
    counts: results.reduce((acc, result) => {
      acc[result.status] = (acc[result.status] || 0) + 1
      return acc
    }, {}),
  }
}

function noRawProof(summary) {
  const proofText = JSON.stringify(summary)
  const forbidden = [
    /fileId/i,
    /permissionId/i,
    /sourceAccount/i,
    /emailAddress/i,
    /targetEmail/i,
    /webViewLink/i,
    /https:\/\/docs\.google\.com/i,
  ]
  return forbidden.filter(pattern => pattern.test(proofText)).map(pattern => String(pattern))
}

async function main() {
  const args = parseArgs()
  const applyRequested = boolArg(args.apply)
  const rollbackRequested = boolArg(args.rollback)
  const jsonOnly = boolArg(args.json)
  const repoHead = await currentHead()
  const concurrency = Math.min(4, Math.max(1, Number(args.applyConcurrency || args['apply-concurrency'] || 2) || 2))
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
  const storeDir = path.resolve(args.storeDir || 'store/meeting-vault-acl')

  if (rollbackRequested) {
    if (!args.rollbackManifest) throw new Error('--rollbackManifest is required for rollback mode')
    const rollback = await rollbackFromManifest({
      rollbackManifestPath: path.resolve(args.rollbackManifest),
      concurrency,
    })
    const summary = {
      mode: 'rollback',
      cardId: MEETING_VAULT_ACL_CARD_ID,
      batch: APPROVED_BATCH.name,
      rollbackManifestHash: rollback.manifestHash,
      rollbackOperationCount: rollback.rollbackOperationCount,
      counts: rollback.counts,
      metadataOnly: true,
    }
    if (!jsonOnly) {
      console.log('Meeting vault ACL Phase B Batch 1 rollback')
      console.log(`  Rollback manifest hash: ${summary.rollbackManifestHash}`)
      console.log(`  Counts: ${JSON.stringify(summary.counts)}`)
    }
    console.log(`MEETING_VAULT_ACL_PHASE_B_ROLLBACK ${JSON.stringify(summary)}`)
    if (rollback.counts.rollback_failed) process.exitCode = 1
    return
  }

  if (!applyRequested) {
    throw new Error('Use --apply for the approved Phase B Batch 1 mutation. Default mode is fail-closed.')
  }
  if (!args.approvalRef) throw new Error('--approvalRef is required')

  const approvalRef = path.resolve(args.approvalRef)
  const approval = await readJson(approvalRef)
  assertApproval(approval, args)

  await initFoundationDb()
  try {
    const { manifest, manifestHash, dryRunPlan } = await buildApplyManifest({
      approval,
      args: { ...args, approvalRef: metadataPath(approvalRef) },
      repoHead,
    })
    const applyManifestPath = path.join(storeDir, `${MEETING_VAULT_ACL_CARD_ID}-phase-b-batch-1-${timestamp}.apply-manifest.json`)
    const resultManifestPath = path.join(storeDir, `${MEETING_VAULT_ACL_CARD_ID}-phase-b-batch-1-${timestamp}.apply-result.json`)
    const rollbackManifestPath = path.join(storeDir, `${MEETING_VAULT_ACL_CARD_ID}-phase-b-batch-1-${timestamp}.rollback-manifest.json`)
    manifest.manifestHash = manifestHash
    await writeJson(applyManifestPath, manifest)

    const { results, rollbackManifest, counts } = await applyManifest({ manifest, applyConcurrency: concurrency })
    const resultManifest = {
      manifestType: 'meeting_vault_acl_phase_b_apply_result',
      cardId: MEETING_VAULT_ACL_CARD_ID,
      phase: 'Phase B',
      batch: APPROVED_BATCH.name,
      approvedDryRunHash: approval.approvedDryRunHash,
      approvedBatchHash: approval.approvedBatchHash,
      applyManifestPath,
      rollbackManifestPath,
      generatedAt: new Date().toISOString(),
      resultCount: results.length,
      counts,
      results,
    }
    const rollbackManifestHash = hashObject(rollbackManifest)
    rollbackManifest.rollbackManifestHash = rollbackManifestHash
    const resultManifestHash = hashObject(resultManifest)
    resultManifest.resultManifestHash = resultManifestHash

    await writeJson(rollbackManifestPath, rollbackManifest)
    await writeJson(resultManifestPath, resultManifest)

    const summary = {
      mode: 'apply',
      cardId: MEETING_VAULT_ACL_CARD_ID,
      phase: 'Phase B',
      batch: APPROVED_BATCH.name,
      policyVersion: MEETING_VAULT_POLICY_VERSION,
      repoHead,
      approvedDryRunHash: approval.approvedDryRunHash,
      approvedBatchHash: approval.approvedBatchHash,
      liveDryRunHashBeforeApply: dryRunPlan.dryRunHash,
      selectedFileCount: manifest.operations.length,
      operationType: APPROVED_BATCH.operationType,
      role: APPROVED_BATCH.role,
      sendNotificationEmail: false,
      counts,
      applyManifestHash: manifestHash,
      resultManifestHash,
      rollbackManifestHash,
      rollbackOperationCount: rollbackManifest.rollbackOperationCount,
      rollbackAvailable: rollbackManifest.rollbackOperationCount === Number(counts.applied || 0) + Number(counts.applied_unverified || 0),
      localManifestPaths: {
        apply: metadataPath(applyManifestPath),
        result: metadataPath(resultManifestPath),
        rollback: metadataPath(rollbackManifestPath),
      },
      boundaries: {
        noRemovals: true,
        noRequestAccessEmails: true,
        noOwnerAmbiguousFiles: true,
        noMissingAccessFiles: true,
      },
      metadataOnly: true,
    }
    const rawProofFindings = noRawProof(summary)
    if (rawProofFindings.length) {
      throw new Error(`Proof summary contains raw-only keys: ${rawProofFindings.join(', ')}`)
    }

    const appliedCount = Number(counts.applied || 0)
    const failedCount = Number(counts.failed || 0)
    const skippedCount = Number(counts.skipped_already_present || 0)
    const appliedUnverifiedCount = Number(counts.applied_unverified || 0)
    const createdCount = appliedCount + appliedUnverifiedCount
    const finalStatus = failedCount || skippedCount || createdCount !== APPROVED_BATCH.operationCount
      ? 'phase_b_batch_1_partial'
      : 'phase_b_batch_1_applied'
    const auditStatus = dryRunPlan.phaseBRequired
      ? 'blocked_phase_b_required'
      : dryRunPlan.blockerReasons?.length
        ? 'blocked_phase_a_unproven'
        : 'safe'

    await recordMeetingVaultAclAudit({
      cardId: MEETING_VAULT_ACL_CARD_ID,
      policyVersion: MEETING_VAULT_POLICY_VERSION,
      status: auditStatus,
      dryRunHash: approval.approvedDryRunHash,
      inventoryTotal: dryRunPlan.fileCount,
      inventoryScanned: dryRunPlan.fileCount,
      inventoryComplete: true,
      phaseAComplete: true,
      counts: {
        fileCount: dryRunPlan.fileCount,
        safeCount: dryRunPlan.safeCount,
        unsafeCount: dryRunPlan.unsafeCount,
        missingCrewbertCount: dryRunPlan.missingCrewbertCount,
        missingAccessCount: dryRunPlan.missingAccessCount,
        ownerAmbiguousCount: dryRunPlan.ownerAmbiguousCount,
        blockedCount: dryRunPlan.blockedCount,
      },
      proposedOperationTypes: { [APPROVED_BATCH.operationType]: manifest.operations.length },
      summary: { ...summary, phaseBApplyStatus: finalStatus },
    }, 'meeting-vault-acl-phase-b-batch-1')

    await updateBacklogItem(MEETING_VAULT_ACL_CARD_ID, {
      lane: 'scoped',
      nextAction: `Phase B Batch 1 applied for add_crewbert_reader only: applied=${appliedCount}, appliedPendingReadback=${appliedUnverifiedCount}, failed=${failedCount}, skipped=${skippedCount}; approved dry-run hash ${approval.approvedDryRunHash}; approved batch hash ${approval.approvedBatchHash}; apply manifest hash ${manifestHash}; rollback manifest hash ${rollbackManifestHash}. Run recheck proof and choose the next approved batch only after review.`,
      statusNote: `Phase B Batch 1 executed on 2026-05-10 under explicit Steve approval. Scope was add Crewbert reader only for 190 protected_sensitive owner-clear files. No removals, request-access emails, owner-ambiguous files, or missing-access files were approved. Applied=${appliedCount}; appliedPendingReadback=${appliedUnverifiedCount}; failed=${failedCount}; skipped=${skippedCount}; apply manifest hash=${manifestHash}; rollback manifest hash=${rollbackManifestHash}. MEETING-VAULT-ACL-001 is not done until recheck proves all in-scope raw meeting ACL blockers cleared or later approved batches are applied/rechecked.`,
    }, 'meeting-vault-acl-phase-b-batch-1')

    if (!jsonOnly) {
      console.log('Meeting vault ACL Phase B Batch 1 apply')
      console.log(`  Status: ${finalStatus}`)
      console.log(`  Selected files: ${manifest.operations.length}`)
      console.log(`  Operation: ${APPROVED_BATCH.operationType}; role=${APPROVED_BATCH.role}; notify=false`)
      console.log(`  Counts: ${JSON.stringify(counts)}`)
      console.log(`  Apply manifest hash: ${manifestHash}`)
      console.log(`  Rollback manifest hash: ${rollbackManifestHash}`)
      console.log(`  Rollback operations: ${rollbackManifest.rollbackOperationCount}`)
      console.log(`  Local manifests: ${metadataPath(applyManifestPath)}, ${metadataPath(resultManifestPath)}, ${metadataPath(rollbackManifestPath)}`)
    } else {
      console.log(JSON.stringify(summary, null, 2))
    }
    console.log(`MEETING_VAULT_ACL_PHASE_B_APPLY ${JSON.stringify(summary)}`)
    if (finalStatus !== 'phase_b_batch_1_applied') process.exitCode = 1
  } finally {
    await closeFoundationDb().catch(() => {})
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
