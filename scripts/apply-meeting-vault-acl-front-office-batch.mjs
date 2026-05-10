#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { execFile as execFileCallback } from 'node:child_process'
import { promisify } from 'node:util'

import {
  buildDriveFilePreflight,
  classifyDrivePermission,
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
  classifyMeetingRawFileAcl,
  MEETING_VAULT_ACL_CARD_ID,
  MEETING_VAULT_POLICY_VERSION,
  MEETING_VAULT_SENSITIVITY_CLASSES,
} from '../lib/meeting-vault-acl.js'
import {
  closeFoundationDb,
  initFoundationDb,
  listMeetingRawDriveFileCandidates,
  recordMeetingVaultAclAudit,
  updateBacklogItem,
} from '../lib/foundation-db.js'

const execFile = promisify(execFileCallback)

const APPROVED_BATCH = {
  name: 'protected_owner_clear_unsafe_front_office',
  slug: 'protected-front-office-removal',
  dryRunHash: '758e60d077e28f369b5f5c6774bf975152a0c1add77d0e615da451bf12932138',
  batchHash: 'cad317e4090b11170560e32aaedcfd26d5983884e435be6d8d6d8b420b5780d5',
  sensitivityClass: MEETING_VAULT_SENSITIVITY_CLASSES.PROTECTED,
  ownerState: 'owner_clear_only',
  permissionCategory: 'unsafe_front_office',
  operationType: DRIVE_PERMISSION_OPERATION_TYPES.REMOVE_UNSAFE_PERMISSION,
  fileCount: 24,
  operationCount: 24,
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

function hashObject(value) {
  return crypto.createHash('sha256').update(stableStringify(value), 'utf8').digest('hex')
}

function permissionEmail(permission) {
  return String(permission?.emailAddress || '').trim().toLowerCase()
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
  if (approval.approvedPermissionCategory !== APPROVED_BATCH.permissionCategory) failures.push('approved permission category mismatch')
  if (Number(approval.approvedFileCount) !== APPROVED_BATCH.fileCount) failures.push('approved file count mismatch')
  if (Number(approval.approvedOperationCount) !== APPROVED_BATCH.operationCount) failures.push('approved operation count mismatch')
  if (approval.driveMutationApproved !== true) failures.push('drive mutation approval must be explicit')
  if (approval.permissionRemovalsApproved !== true) failures.push('permission removal approval must be explicit')
  if (approval.addCrewbertReaderApproved !== false) failures.push('add Crewbert operations must be false')
  if (approval.noRequestAccessEmails !== true) failures.push('request-access email boundary missing')
  if (approval.ownerAmbiguousApproved !== false) failures.push('owner-ambiguous files must be false')
  if (approval.missingAccessApproved !== false) failures.push('missing-access files must be false')
  if (approval.unsafeAnyoneApproved !== false) failures.push('unsafe_anyone files must be false')
  if (approval.unsafeExternalUserApproved !== false) failures.push('unsafe_external_user files must be false')
  if (approval.unsafeNonOwnerUserApproved !== false) failures.push('unsafe_non_owner_user files must be false')
  if (failures.length) {
    throw new Error(`Phase B front-office removal approval failed validation: ${failures.join('; ')}`)
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

async function buildPreflightRecords({ candidateLimit, concurrency }) {
  const candidates = await listMeetingRawDriveFileCandidates({ limit: candidateLimit })
  const inventory = buildMeetingRawFileInventory({ ...candidates, limit: candidateLimit })
  const records = await mapWithConcurrency(inventory.items, concurrency, async file => {
    const policy = buildMeetingAclPolicy(file)
    const [preflight, permissions] = await Promise.all([
      buildDriveFilePreflight({
        fileId: file.fileId,
        intendedActor: file.sourceAccount,
        sourceAccount: file.sourceAccount,
        purpose: 'meeting_vault_acl_phase_b_front_office_removal_preflight',
        sourceId: file.sourceId,
        artifactId: file.artifactId,
        policy: policy.driveAccessPolicy,
      }),
      listDrivePermissions(file.sourceAccount, file.fileId).catch(() => []),
    ])
    const classification = classifyMeetingRawFileAcl(file, preflight, policy)
    return { file, policy, preflight, permissions, classification }
  })
  const dryRunPlan = buildMeetingAclDryRunPlan(records.map(record => record.classification))
  return { inventory, records, dryRunPlan }
}

function operationHashInput(operations) {
  return {
    dryRunHash: APPROVED_BATCH.dryRunHash,
    policyVersion: MEETING_VAULT_POLICY_VERSION,
    batch: APPROVED_BATCH.name,
    operationType: APPROVED_BATCH.operationType,
    sensitivityClass: APPROVED_BATCH.sensitivityClass,
    ownerState: APPROVED_BATCH.ownerState,
    permissionCategory: APPROVED_BATCH.permissionCategory,
    fileCount: new Set(operations.map(operation => operation.fileRefHash)).size,
    operationCount: operations.length,
    operations: operations.map(operation => ({
      fileRefHash: operation.fileRefHash,
      ownerHash: operation.ownerHash,
      sourceAccountHash: operation.sourceAccountHash,
      permissionHash: operation.permissionHash,
      operationType: operation.operationType,
      permissionCategory: operation.permissionCategory,
      role: operation.role,
      type: operation.type,
    })).sort((left, right) => `${left.fileRefHash}:${left.permissionHash}`.localeCompare(`${right.fileRefHash}:${right.permissionHash}`)),
  }
}

function selectApprovedOperations(records) {
  const operations = []
  for (const record of records) {
    if (record.policy.sensitivityClass !== APPROVED_BATCH.sensitivityClass) continue
    if (!record.preflight.readable || record.preflight.ownerAmbiguous) continue
    for (const permission of record.permissions || []) {
      const classified = classifyDrivePermission(permission, record.policy.driveAccessPolicy)
      if (classified.operationType !== APPROVED_BATCH.operationType) continue
      if (classified.category !== APPROVED_BATCH.permissionCategory) continue
      operations.push({
        fileId: record.file.fileId,
        fileRefHash: record.file.fileRefHash,
        sourceAccount: record.file.sourceAccount,
        sourceAccountHash: record.preflight.sourceAccountHash,
        ownerHash: record.preflight.ownerHash,
        sensitivityClass: record.policy.sensitivityClass,
        operationType: APPROVED_BATCH.operationType,
        permissionId: permission.id,
        permissionHash: classified.permissionHash,
        permissionCategory: classified.category,
        permissionEmail: permission.emailAddress || '',
        permissionEmailHash: permission.emailAddress ? hashProofValue(permission.emailAddress.toLowerCase(), 'acct') : null,
        role: classified.role,
        type: classified.type,
        beforePermissionSummary: record.preflight.permissionSummary,
      })
    }
  }
  return operations.sort((left, right) => `${left.fileRefHash}:${left.permissionHash}`.localeCompare(`${right.fileRefHash}:${right.permissionHash}`))
}

async function buildApplyManifest({ approval, args, repoHead }) {
  const candidateLimit = Math.min(5000, Math.max(1, Number(args.candidateLimit || args['candidate-limit'] || 5000) || 5000))
  const concurrency = Math.min(8, Math.max(1, Number(args.concurrency || 4) || 4))
  const { inventory, records, dryRunPlan } = await buildPreflightRecords({ candidateLimit, concurrency })
  if (dryRunPlan.dryRunHash !== approval.approvedDryRunHash) {
    throw new Error(`Phase B front-office removal fail-closed: live dry-run hash ${dryRunPlan.dryRunHash} does not match approved hash ${approval.approvedDryRunHash}.`)
  }
  const operations = selectApprovedOperations(records)
  const fileCount = new Set(operations.map(operation => operation.fileRefHash)).size
  if (fileCount !== APPROVED_BATCH.fileCount || operations.length !== APPROVED_BATCH.operationCount) {
    throw new Error(`Phase B front-office removal fail-closed: selected ${fileCount} files / ${operations.length} operations, expected ${APPROVED_BATCH.fileCount}/${APPROVED_BATCH.operationCount}.`)
  }
  const calculatedBatchHash = hashObject(operationHashInput(operations))
  if (calculatedBatchHash !== approval.approvedBatchHash) {
    throw new Error(`Phase B front-office removal fail-closed: calculated batch hash ${calculatedBatchHash} does not match approved hash ${approval.approvedBatchHash}.`)
  }
  const manifest = {
    manifestType: 'meeting_vault_acl_phase_b_apply_manifest',
    cardId: MEETING_VAULT_ACL_CARD_ID,
    phase: 'Phase B',
    batch: APPROVED_BATCH.name,
    approvedDryRunHash: approval.approvedDryRunHash,
    approvedBatchHash: approval.approvedBatchHash,
    calculatedBatchHash,
    policyVersion: MEETING_VAULT_POLICY_VERSION,
    repoHead,
    generatedAt: new Date().toISOString(),
    approvalRef: args.approvalRef,
    boundaries: {
      operationType: APPROVED_BATCH.operationType,
      permissionCategory: APPROVED_BATCH.permissionCategory,
      sensitivityClass: APPROVED_BATCH.sensitivityClass,
      ownerState: APPROVED_BATCH.ownerState,
      noAddCrewbertReader: true,
      noRequestAccessEmails: true,
      noOwnerAmbiguousFiles: true,
      noMissingAccessFiles: true,
      noUnsafeAnyone: true,
      noUnsafeExternalUser: true,
      noUnsafeNonOwnerUser: true,
    },
    inventory: {
      totalCandidates: inventory.totalCandidates,
      selectedFileCount: fileCount,
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
  const permission = beforePermissions.find(item => item.id === operation.permissionId)
  if (!permission) {
    return {
      status: 'skipped_permission_absent',
      operationType: operation.operationType,
      fileRefHash: operation.fileRefHash,
      ownerHash: operation.ownerHash,
      sourceAccountHash: operation.sourceAccountHash,
      permissionHash: operation.permissionHash,
      beforePermissionSnapshotHash: hashObject(beforePermissions),
      afterPermissionSnapshotHash: hashObject(beforePermissions),
      rollbackAvailable: false,
    }
  }
  const classified = classifyDrivePermission(permission, {
    requireCrewbert: true,
    allowInternalUsers: false,
    allowInternalGroups: false,
    allowInternalDomain: false,
    allowFrontOffice: false,
    policyVersion: MEETING_VAULT_POLICY_VERSION,
  })
  if (classified.category !== APPROVED_BATCH.permissionCategory || classified.operationType !== APPROVED_BATCH.operationType) {
    throw new Error('Permission no longer matches the approved unsafe_front_office removal batch.')
  }
  if (String(permission.role || '').toLowerCase() === 'owner') {
    throw new Error('Refusing to remove an owner permission.')
  }

  await deleteDrivePermission(operation.sourceAccount, operation.fileId, operation.permissionId)
  const afterPermissions = await listDrivePermissions(operation.sourceAccount, operation.fileId)
  const stillPresent = afterPermissions.some(item => item.id === operation.permissionId)
  return {
    status: stillPresent ? 'removed_unverified' : 'removed',
    operationType: operation.operationType,
    fileRefHash: operation.fileRefHash,
    ownerHash: operation.ownerHash,
    sourceAccountHash: operation.sourceAccountHash,
    permissionHash: operation.permissionHash,
    beforePermissionSnapshotHash: hashObject(beforePermissions),
    afterPermissionSnapshotHash: hashObject(afterPermissions),
    rollbackAvailable: true,
    rollbackOperation: {
      operationType: 'recreate_removed_permission',
      fileId: operation.fileId,
      sourceAccount: operation.sourceAccount,
      emailAddress: operation.permissionEmail,
      role: operation.role,
      type: operation.type,
      fileRefHash: operation.fileRefHash,
      permissionHash: operation.permissionHash,
    },
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
        permissionHash: operation.permissionHash,
        errorClass: error?.response?.status || error?.status || 'google_api_error',
        errorMessageHash: hashProofValue(error instanceof Error ? error.message : String(error || ''), 'err'),
        rollbackAvailable: false,
      }
    }
  })
  const rollbackOperations = results.map(result => result.rollbackOperation).filter(Boolean)
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
    throw new Error('Rollback manifest does not match the protected front-office removal batch.')
  }
  const operations = Array.isArray(manifest.rollbackOperations) ? manifest.rollbackOperations : []
  const results = await mapWithConcurrency(operations, concurrency, async operation => {
    try {
      if (operation.operationType !== 'recreate_removed_permission') throw new Error('Unsupported rollback operation.')
      const created = await createDrivePermission(operation.sourceAccount, operation.fileId, {
        emailAddress: operation.emailAddress,
        role: operation.role,
        type: operation.type || 'user',
        sendNotificationEmail: false,
      })
      return {
        status: 'rolled_back',
        fileRefHash: operation.fileRefHash,
        originalPermissionHash: operation.permissionHash,
        recreatedPermissionHash: created?.id ? hashProofValue(created.id, 'perm') : null,
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
      console.log('Meeting vault ACL Phase B protected front-office rollback')
      console.log(`  Rollback manifest hash: ${summary.rollbackManifestHash}`)
      console.log(`  Counts: ${JSON.stringify(summary.counts)}`)
    }
    console.log(`MEETING_VAULT_ACL_FRONT_OFFICE_ROLLBACK ${JSON.stringify(summary)}`)
    if (rollback.counts.rollback_failed) process.exitCode = 1
    return
  }

  if (!applyRequested) {
    throw new Error('Use --apply for the approved protected front-office removal batch. Default mode is fail-closed.')
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
    const applyManifestPath = path.join(storeDir, `${MEETING_VAULT_ACL_CARD_ID}-${APPROVED_BATCH.slug}-${timestamp}.apply-manifest.json`)
    const resultManifestPath = path.join(storeDir, `${MEETING_VAULT_ACL_CARD_ID}-${APPROVED_BATCH.slug}-${timestamp}.apply-result.json`)
    const rollbackManifestPath = path.join(storeDir, `${MEETING_VAULT_ACL_CARD_ID}-${APPROVED_BATCH.slug}-${timestamp}.rollback-manifest.json`)
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
      selectedFileCount: manifest.inventory.selectedFileCount,
      operationCount: manifest.inventory.operationCount,
      operationType: APPROVED_BATCH.operationType,
      permissionCategory: APPROVED_BATCH.permissionCategory,
      sendNotificationEmail: false,
      counts,
      applyManifestHash: manifestHash,
      resultManifestHash,
      rollbackManifestHash,
      rollbackOperationCount: rollbackManifest.rollbackOperationCount,
      rollbackAvailable: rollbackManifest.rollbackOperationCount === Number(counts.removed || 0) + Number(counts.removed_unverified || 0),
      localManifestPaths: {
        apply: metadataPath(applyManifestPath),
        result: metadataPath(resultManifestPath),
        rollback: metadataPath(rollbackManifestPath),
      },
      boundaries: {
        noAddCrewbertReader: true,
        noRequestAccessEmails: true,
        noOwnerAmbiguousFiles: true,
        noMissingAccessFiles: true,
        noUnsafeAnyone: true,
        noUnsafeExternalUser: true,
        noUnsafeNonOwnerUser: true,
      },
      metadataOnly: true,
    }
    const rawProofFindings = noRawProof(summary)
    if (rawProofFindings.length) {
      throw new Error(`Proof summary contains raw-only keys: ${rawProofFindings.join(', ')}`)
    }

    const removedCount = Number(counts.removed || 0)
    const failedCount = Number(counts.failed || 0)
    const skippedCount = Number(counts.skipped_permission_absent || 0)
    const removedUnverifiedCount = Number(counts.removed_unverified || 0)
    const finalStatus = failedCount || skippedCount || removedUnverifiedCount || removedCount !== APPROVED_BATCH.operationCount
      ? 'phase_b_front_office_partial'
      : 'phase_b_front_office_applied'
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
    }, 'meeting-vault-acl-phase-b-front-office')

    await updateBacklogItem(MEETING_VAULT_ACL_CARD_ID, {
      lane: 'scoped',
      nextAction: `Phase B protected front-office removal applied: removed=${removedCount}, failed=${failedCount}, skipped=${skippedCount}; approved dry-run hash ${approval.approvedDryRunHash}; approved batch hash ${approval.approvedBatchHash}; apply manifest hash ${manifestHash}; rollback manifest hash ${rollbackManifestHash}. Run recheck proof and choose the next approved batch only after review.`,
      statusNote: `Phase B protected front-office removal executed on 2026-05-10 under explicit Steve approval. Scope was remove_unsafe_permission only for 24 unsafe_front_office permissions on protected_sensitive owner-clear files. No add_crewbert_reader, unsafe_anyone, unsafe_external_user, unsafe_non_owner_user, owner-ambiguous, missing-access, or request-access email operations were approved. Removed=${removedCount}; failed=${failedCount}; skipped=${skippedCount}; apply manifest hash=${manifestHash}; rollback manifest hash=${rollbackManifestHash}. MEETING-VAULT-ACL-001 remains scoped/blocking and not done pending recheck and later approved batches.`,
    }, 'meeting-vault-acl-phase-b-front-office')

    if (!jsonOnly) {
      console.log('Meeting vault ACL Phase B protected front-office removal')
      console.log(`  Status: ${finalStatus}`)
      console.log(`  Selected files: ${manifest.inventory.selectedFileCount}`)
      console.log(`  Operations: ${manifest.inventory.operationCount}`)
      console.log(`  Counts: ${JSON.stringify(counts)}`)
      console.log(`  Apply manifest hash: ${manifestHash}`)
      console.log(`  Rollback manifest hash: ${rollbackManifestHash}`)
      console.log(`  Rollback operations: ${rollbackManifest.rollbackOperationCount}`)
      console.log(`  Local manifests: ${metadataPath(applyManifestPath)}, ${metadataPath(resultManifestPath)}, ${metadataPath(rollbackManifestPath)}`)
    } else {
      console.log(JSON.stringify(summary, null, 2))
    }
    console.log(`MEETING_VAULT_ACL_FRONT_OFFICE_APPLY ${JSON.stringify(summary)}`)
    if (finalStatus !== 'phase_b_front_office_applied') process.exitCode = 1
  } finally {
    await closeFoundationDb().catch(() => {})
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
