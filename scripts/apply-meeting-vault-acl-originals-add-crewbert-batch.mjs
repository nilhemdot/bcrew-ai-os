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
  hashProofObject,
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
  classifyMeetingLegacyDuplicateCopyAcl,
  classifyMeetingRawFileAcl,
  MEETING_VAULT_ACL_CARD_ID,
  MEETING_VAULT_ACL_STATES,
  MEETING_VAULT_POLICY_VERSION,
  MEETING_VAULT_SOURCE_FILE_ROLES,
} from '../lib/meeting-vault-acl.js'
import {
  closeFoundationDb,
  initFoundationDb,
  listFoundationUsers,
  listMeetingRawDriveFileCandidates,
  recordMeetingVaultAclAudit,
  updateBacklogItem,
} from '../lib/foundation-db.js'
import {
  calculateApprovalDigest,
  validatePlanApprovalFile,
} from '../lib/approval-integrity.js'

const execFile = promisify(execFileCallback)

const APPROVED_BATCH = {
  name: 'source_truth_originals_missing_crewbert_add_reader_v1',
  slug: 'source-truth-originals-add-crewbert',
  dryRunHash: 'b25bbd105fcdca10971c497b22038565d5e4d4fa8a90b0b13b766232af420c90',
  batchHash: '4cd211642c2ff8d842d20a6d798cb4a8c5a2105a1fc44bed7de3bdb97e565f70',
  operationType: DRIVE_PERMISSION_OPERATION_TYPES.ADD_CREWBERT_READER,
  sourceFileRole: MEETING_VAULT_SOURCE_FILE_ROLES.ORIGINAL,
  ownerState: 'owner_clear_only',
  role: 'reader',
  crewbertEmail: 'crewbert@bensoncrew.ca',
  allowedOwnerDomain: 'bensoncrew.ca',
  fileCount: 418,
  operationCount: 418,
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

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

function emailDomain(value) {
  const email = normalizeEmail(value)
  const at = email.lastIndexOf('@')
  return at === -1 ? '' : email.slice(at + 1)
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

function uniqueList(values = []) {
  return [...new Set(values.map(value => normalizeEmail(value)).filter(Boolean))]
}

function countBy(items, getter) {
  return items.reduce((acc, item) => {
    const key = getter(item) || 'unknown'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
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
      purpose: 'meeting_vault_acl_phase_b_source_truth_originals_add_crewbert',
      sourceId: file.sourceId,
      artifactId: file.artifactId,
      policy: policy.driveAccessPolicy,
    })
    if (!firstResult) firstResult = preflight
    if (preflight.readable) return { ...preflight, readableAccount: account }
  }
  return { ...(firstResult || {}), readableAccount: accounts[0] || file.sourceAccount || null }
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

function crewbertPermissionExists(permissions) {
  return permissions.some(permission =>
    normalizeEmail(permission?.emailAddress) === APPROVED_BATCH.crewbertEmail &&
    ['owner', 'organizer', 'fileorganizer', 'writer', 'commenter', 'reader'].includes(String(permission.role || '').trim().toLowerCase()) &&
    !permission.deleted
  )
}

function ownerEmailFromPermissions(permissions = []) {
  const owners = permissions
    .filter(permission => String(permission?.role || '').trim().toLowerCase() === 'owner' && !permission.deleted)
    .map(permission => normalizeEmail(permission.emailAddress))
    .filter(Boolean)
  if (owners.length !== 1) {
    throw new Error(`Expected exactly one owner permission, found ${owners.length}.`)
  }
  if (emailDomain(owners[0]) !== APPROVED_BATCH.allowedOwnerDomain) {
    throw new Error('Owner is outside approved delegated domain.')
  }
  return owners[0]
}

async function buildPreflightRecords({ candidateLimit, concurrency }) {
  const candidates = await listMeetingRawDriveFileCandidates({ limit: candidateLimit })
  const inventory = buildMeetingRawFileInventory({ ...candidates, limit: candidateLimit })
  const foundationUsers = await listFoundationUsers({ meetingSyncEnabled: true })
  const fallbackAccounts = uniqueList(foundationUsers.map(user => user.email))
  const scanned = await mapWithConcurrency(inventory.items, concurrency, async file => {
    const policy = buildMeetingAclPolicy(file)
    const preflight = await buildDriveFilePreflightWithFallback({
      file,
      policy,
      fallbackAccounts,
    })
    return { file, policy, preflight }
  })
  annotateMeetingSourceRoles(scanned)
  const records = scanned.map(item => ({
    ...item,
    classification: classifyMeetingAclScannedItem(item),
  }))
  const dryRunPlan = buildMeetingAclDryRunPlan(records.map(record => record.classification))
  return { inventory, records, dryRunPlan }
}

function selectApprovedRecords(records) {
  return records.filter(record =>
    record.file.sourceFileRole === APPROVED_BATCH.sourceFileRole &&
    record.preflight.readable === true &&
    record.preflight.ownerAmbiguous === false &&
    record.preflight.missingCrewbert === true &&
    record.classification.state === MEETING_VAULT_ACL_STATES.MISSING_CREWBERT &&
    (record.classification.proposedOperations || []).some(operation =>
      operation.operationType === APPROVED_BATCH.operationType
    )
  )
}

function operationHashInput(operations) {
  return {
    dryRunHash: APPROVED_BATCH.dryRunHash,
    policyVersion: MEETING_VAULT_POLICY_VERSION,
    batch: APPROVED_BATCH.name,
    operationType: APPROVED_BATCH.operationType,
    sourceFileRole: APPROVED_BATCH.sourceFileRole,
    ownerState: APPROVED_BATCH.ownerState,
    role: APPROVED_BATCH.role,
    sendNotificationEmail: false,
    noRemovals: true,
    noMoves: true,
    noOwnershipTransfers: true,
    noDeletions: true,
    noRequestAccessEmails: true,
    fileCount: new Set(operations.map(operation => operation.fileRefHash)).size,
    operationCount: operations.length,
    sensitivityClassCounts: countBy(operations, operation => operation.sensitivityClass),
    unsafePermissionFileCount: operations.filter(operation => operation.beforeUnsafeCount > 0).length,
    unsafePermissionCount: operations.reduce((total, operation) => total + operation.beforeUnsafeCount, 0),
    operations: operations.map(operation => ({
      fileRefHash: operation.fileRefHash,
      ownerHash: operation.ownerHash,
      sourceAccountHash: operation.preflightSourceAccountHash,
      sourceFileRole: operation.sourceFileRole,
      sensitivityClass: operation.sensitivityClass,
      operationType: operation.operationType,
      role: operation.role,
      sendNotificationEmail: false,
      beforeUnsafeCount: operation.beforeUnsafeCount,
      rollbackPlanHash: operation.rollbackPlanHash,
    })).sort((left, right) => `${left.fileRefHash}:${left.ownerHash}`.localeCompare(`${right.fileRefHash}:${right.ownerHash}`)),
  }
}

async function buildApprovedOperation(record) {
  const permissions = await listDrivePermissions(record.preflight.readableAccount || record.file.sourceAccount, record.file.fileId)
  const ownerEmail = ownerEmailFromPermissions(permissions)
  const ownerHash = hashProofValue(ownerEmail, 'acct')
  if (record.preflight.ownerHash && record.preflight.ownerHash !== ownerHash) {
    throw new Error('Owner hash changed between preflight and apply manifest build.')
  }
  const rollbackPlan = buildMeetingAclRollbackPlan({
    operationType: APPROVED_BATCH.operationType,
    fileRefHash: record.file.fileRefHash,
    ownerHash,
    role: APPROVED_BATCH.role,
    sendNotificationEmail: false,
  })
  return {
    fileId: record.file.fileId,
    fileRefHash: record.file.fileRefHash,
    sourceAccount: ownerEmail,
    executionAccountHash: ownerHash,
    preflightSourceAccountHash: record.preflight.sourceAccountHash,
    ownerHash,
    sensitivityClass: record.policy.sensitivityClass,
    sourceFileRole: record.file.sourceFileRole,
    operationType: APPROVED_BATCH.operationType,
    role: APPROVED_BATCH.role,
    targetEmail: APPROVED_BATCH.crewbertEmail,
    sendNotificationEmail: false,
    beforeUnsafeCount: Number(record.preflight.permissionSummary?.unsafeCount || 0),
    beforePermissionSummary: record.preflight.permissionSummary,
    rollbackPlan,
    rollbackPlanHash: hashProofObject(rollbackPlan, 'rollback'),
  }
}

async function buildApplyManifest({ approval, args, repoHead }) {
  const candidateLimit = Math.min(5000, Math.max(1, Number(args.candidateLimit || args['candidate-limit'] || 5000) || 5000))
  const concurrency = Math.min(8, Math.max(1, Number(args.concurrency || 6) || 6))
  const { inventory, records, dryRunPlan } = await buildPreflightRecords({ candidateLimit, concurrency })
  if (dryRunPlan.dryRunHash !== approval.approvedDryRunHash) {
    throw new Error(`Source-truth originals add-Crewbert fail-closed: live dry-run hash ${dryRunPlan.dryRunHash} does not match approved hash ${approval.approvedDryRunHash}.`)
  }
  const selectedRecords = selectApprovedRecords(records)
  if (selectedRecords.length !== APPROVED_BATCH.fileCount) {
    throw new Error(`Source-truth originals add-Crewbert fail-closed: selected ${selectedRecords.length} files, expected ${APPROVED_BATCH.fileCount}.`)
  }
  const operations = await mapWithConcurrency(selectedRecords, concurrency, buildApprovedOperation)
  const sortedOperations = operations.sort((left, right) => `${left.fileRefHash}:${left.ownerHash}`.localeCompare(`${right.fileRefHash}:${right.ownerHash}`))
  const calculatedBatchHash = hashObject(operationHashInput(sortedOperations))
  if (calculatedBatchHash !== approval.approvedBatchHash) {
    throw new Error(`Source-truth originals add-Crewbert fail-closed: calculated batch hash ${calculatedBatchHash} does not match approved hash ${approval.approvedBatchHash}.`)
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
      sourceFileRole: APPROVED_BATCH.sourceFileRole,
      ownerState: APPROVED_BATCH.ownerState,
      role: APPROVED_BATCH.role,
      sendNotificationEmail: false,
      noRemovals: true,
      noMoves: true,
      noOwnershipTransfers: true,
      noDeletions: true,
      noRequestAccessEmails: true,
      noOwnerAmbiguousFiles: true,
      noLegacyCrewbertDuplicateCopies: true,
      noOriginalMissingBlockedFiles: true,
    },
    inventory: {
      totalCandidates: inventory.totalCandidates,
      selectedFileCount: sortedOperations.length,
      operationCount: sortedOperations.length,
      dryRunHash: dryRunPlan.dryRunHash,
      stateCounts: dryRunPlan.stateCounts,
      sensitivityClassCounts: dryRunPlan.sensitivityClassCounts,
      sourceFileRoleCounts: dryRunPlan.sourceFileRoleCounts,
      proposedOperationTypes: dryRunPlan.proposedOperationTypes,
      selectedSensitivityClassCounts: countBy(sortedOperations, operation => operation.sensitivityClass),
      selectedUnsafePermissionFileCount: sortedOperations.filter(operation => operation.beforeUnsafeCount > 0).length,
      selectedUnsafePermissionCount: sortedOperations.reduce((total, operation) => total + operation.beforeUnsafeCount, 0),
    },
    operations: sortedOperations,
  }
  return {
    manifest,
    manifestHash: hashObject(manifest),
    dryRunPlan,
  }
}

function permissionEmail(permission) {
  return normalizeEmail(permission?.emailAddress)
}

async function applyOperation(operation) {
  if (operation.operationType !== APPROVED_BATCH.operationType) throw new Error('Unsupported operation type.')
  if (operation.sourceFileRole !== APPROVED_BATCH.sourceFileRole) throw new Error('Operation is not an original Gemini note.')
  if (operation.sendNotificationEmail !== false) throw new Error('sendNotificationEmail must be false.')

  const beforePermissions = await listDrivePermissions(operation.sourceAccount, operation.fileId)
  if (crewbertPermissionExists(beforePermissions)) {
    return {
      status: 'skipped_already_present',
      operationType: operation.operationType,
      fileRefHash: operation.fileRefHash,
      ownerHash: operation.ownerHash,
      executionAccountHash: operation.executionAccountHash,
      preflightSourceAccountHash: operation.preflightSourceAccountHash,
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
  const createdIsCrewbert = Boolean(createdPermission) &&
    permissionEmail(createdPermission) === APPROVED_BATCH.crewbertEmail &&
    ['reader', 'commenter', 'writer', 'owner'].includes(String(createdPermission.role || '').trim().toLowerCase())

  return {
    status: verifiedPresent && createdIsCrewbert ? 'applied' : 'applied_unverified',
    operationType: operation.operationType,
    fileRefHash: operation.fileRefHash,
    ownerHash: operation.ownerHash,
    executionAccountHash: operation.executionAccountHash,
    preflightSourceAccountHash: operation.preflightSourceAccountHash,
    createdPermissionId: created?.id || null,
    createdPermissionHash: created?.id ? hashProofValue(created.id, 'perm') : null,
    createdPermissionRole: created?.role || operation.role,
    beforePermissionSnapshotHash: hashObject(beforePermissions),
    afterPermissionSnapshotHash: hashObject(afterPermissions),
    rollbackAvailable: Boolean(created?.id) && createdIsCrewbert,
    rollbackOperation: created?.id && createdIsCrewbert
      ? {
          operationType: 'delete_created_crewbert_reader_permission',
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
        executionAccountHash: operation.executionAccountHash,
        preflightSourceAccountHash: operation.preflightSourceAccountHash,
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
    throw new Error('Rollback manifest does not match the source-truth originals add-Crewbert batch.')
  }
  const operations = Array.isArray(manifest.rollbackOperations) ? manifest.rollbackOperations : []
  const results = await mapWithConcurrency(operations, concurrency, async operation => {
    try {
      if (operation.operationType !== 'delete_created_crewbert_reader_permission') throw new Error('Unsupported rollback operation.')
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

function assertApproval(approval, args, approvalRef) {
  const failures = []
  const expectedDryRunHash = String(args.dryRunHash || APPROVED_BATCH.dryRunHash).trim()
  const expectedBatchHash = String(args.batchHash || APPROVED_BATCH.batchHash).trim()
  if (approval.cardId !== MEETING_VAULT_ACL_CARD_ID) failures.push('cardId mismatch')
  if (approval.phase !== 'Phase B') failures.push('phase must be Phase B')
  if (approval.approvedDryRunHash !== expectedDryRunHash) failures.push('approved dry-run hash mismatch')
  if (approval.approvedBatchHash !== expectedBatchHash) failures.push('approved batch hash mismatch')
  if (approval.approvedBatch !== APPROVED_BATCH.name) failures.push('approved batch mismatch')
  if (approval.approvedOperationType !== APPROVED_BATCH.operationType) failures.push('approved operation type mismatch')
  if (approval.approvedSourceFileRole !== APPROVED_BATCH.sourceFileRole) failures.push('approved source file role mismatch')
  if (approval.approvedRole !== APPROVED_BATCH.role) failures.push('approved role mismatch')
  if (Number(approval.approvedFileCount) !== APPROVED_BATCH.fileCount) failures.push('approved file count mismatch')
  if (Number(approval.approvedOperationCount) !== APPROVED_BATCH.operationCount) failures.push('approved operation count mismatch')
  if (approval.driveMutationApproved !== true) failures.push('drive mutation approval must be explicit')
  if (approval.addCrewbertReaderApproved !== true) failures.push('add Crewbert reader approval must be explicit')
  if (approval.permissionRemovalsApproved !== false) failures.push('permission removals must be false')
  if (approval.noRequestAccessEmails !== true) failures.push('request-access email boundary missing')
  if (approval.noMovesApproved !== true) failures.push('move boundary missing')
  if (approval.noOwnershipTransfersApproved !== true) failures.push('ownership-transfer boundary missing')
  if (approval.noDeletionsApproved !== true) failures.push('deletion boundary missing')
  if (approval.ownerAmbiguousApproved !== false) failures.push('owner-ambiguous files must be false')
  if (approval.missingAccessApproved !== false) failures.push('missing-access files must be false')
  if (approval.legacyCrewbertDuplicateCopiesApproved !== false) failures.push('legacy duplicate copies must be false')
  if (approval.originalMissingBlockedApproved !== false) failures.push('original-missing blocked files must be false')
  if (approval.sendNotificationEmail !== false) failures.push('sendNotificationEmail must be false')
  if (approval.approvalDigest !== calculateApprovalDigest(approval)) failures.push('approval digest mismatch')
  if (!approvalRef) failures.push('approval ref missing')
  if (failures.length) {
    throw new Error(`Source-truth originals add-Crewbert approval failed validation: ${failures.join('; ')}`)
  }
}

function noRawProof(summary) {
  const proofText = JSON.stringify(summary)
  const forbidden = [
    /fileId/i,
    /permissionId/i,
    /sourceAccount(?!Hash)/i,
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
  const applyConcurrency = Math.min(4, Math.max(1, Number(args.applyConcurrency || args['apply-concurrency'] || 2) || 2))
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
  const storeDir = path.resolve(args.storeDir || 'store/meeting-vault-acl')

  if (rollbackRequested) {
    if (!args.rollbackManifest) throw new Error('--rollbackManifest is required for rollback mode')
    const rollback = await rollbackFromManifest({
      rollbackManifestPath: path.resolve(args.rollbackManifest),
      concurrency: applyConcurrency,
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
      console.log('Meeting vault ACL Phase B source-truth originals add-Crewbert rollback')
      console.log(`  Rollback manifest hash: ${summary.rollbackManifestHash}`)
      console.log(`  Counts: ${JSON.stringify(summary.counts)}`)
    }
    console.log(`MEETING_VAULT_ACL_ORIGINALS_ADD_CREWBERT_ROLLBACK ${JSON.stringify(summary)}`)
    if (rollback.counts.rollback_failed) process.exitCode = 1
    return
  }

  if (!applyRequested) {
    throw new Error('Use --apply for the approved source-truth originals add-Crewbert batch. Default mode is fail-closed.')
  }
  if (!args.approvalRef) throw new Error('--approvalRef is required')

  const approvalRef = path.resolve(args.approvalRef)
  const approval = await readJson(approvalRef)
  assertApproval(approval, args, approvalRef)
  const approvalIntegrity = await validatePlanApprovalFile({
    repoRoot: process.cwd(),
    approvalRef: metadataPath(approvalRef),
    cardId: MEETING_VAULT_ACL_CARD_ID,
  })
  if (!approvalIntegrity.ok) {
    throw new Error(`Approval integrity failed: ${approvalIntegrity.failures.map(failure => failure.check).join('; ')}`)
  }

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

    const { results, rollbackManifest, counts } = await applyManifest({ manifest, applyConcurrency })
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

    const appliedCount = Number(counts.applied || 0)
    const appliedUnverifiedCount = Number(counts.applied_unverified || 0)
    const failedCount = Number(counts.failed || 0)
    const skippedCount = Number(counts.skipped_already_present || 0)
    const createdCount = appliedCount + appliedUnverifiedCount
    const finalStatus = failedCount || skippedCount || createdCount !== APPROVED_BATCH.operationCount
      ? 'phase_b_originals_add_crewbert_partial'
      : 'phase_b_originals_add_crewbert_applied'
    const rollbackAvailable = rollbackManifest.rollbackOperationCount === createdCount

    const summary = {
      mode: 'apply',
      cardId: MEETING_VAULT_ACL_CARD_ID,
      phase: 'Phase B',
      batch: APPROVED_BATCH.name,
      policyVersion: MEETING_VAULT_POLICY_VERSION,
      repoHead,
      approvedDryRunHash: approval.approvedDryRunHash,
      approvedBatchHash: approval.approvedBatchHash,
      calculatedBatchHash: manifest.calculatedBatchHash,
      liveDryRunHashBeforeApply: dryRunPlan.dryRunHash,
      selectedFileCount: manifest.inventory.selectedFileCount,
      operationCount: manifest.inventory.operationCount,
      selectedSensitivityClassCounts: manifest.inventory.selectedSensitivityClassCounts,
      selectedUnsafePermissionFileCount: manifest.inventory.selectedUnsafePermissionFileCount,
      selectedUnsafePermissionCount: manifest.inventory.selectedUnsafePermissionCount,
      operationType: APPROVED_BATCH.operationType,
      sourceFileRole: APPROVED_BATCH.sourceFileRole,
      role: APPROVED_BATCH.role,
      sendNotificationEmail: false,
      counts,
      applyManifestHash: manifestHash,
      resultManifestHash,
      rollbackManifestHash,
      rollbackOperationCount: rollbackManifest.rollbackOperationCount,
      rollbackAvailable,
      localManifestPaths: {
        apply: metadataPath(applyManifestPath),
        result: metadataPath(resultManifestPath),
        rollback: metadataPath(rollbackManifestPath),
      },
      boundaries: {
        noRemovals: true,
        noMoves: true,
        noOwnershipTransfers: true,
        noDeletions: true,
        noRequestAccessEmails: true,
        noOwnerAmbiguousFiles: true,
        noLegacyCrewbertDuplicateCopies: true,
        noOriginalMissingBlockedFiles: true,
      },
      metadataOnly: true,
    }
    const rawProofFindings = noRawProof(summary)
    if (rawProofFindings.length) {
      throw new Error(`Proof summary contains raw-only keys: ${rawProofFindings.join(', ')}`)
    }

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
        unsafePermissionCount: dryRunPlan.unsafePermissionCount,
        missingCrewbertCount: dryRunPlan.missingCrewbertCount,
        missingAccessCount: dryRunPlan.missingAccessCount,
        ownerAmbiguousCount: dryRunPlan.ownerAmbiguousCount,
        blockedCount: dryRunPlan.blockedCount,
      },
      proposedOperationTypes: { [APPROVED_BATCH.operationType]: manifest.inventory.operationCount },
      summary: { ...summary, phaseBApplyStatus: finalStatus },
    }, 'meeting-vault-acl-source-truth-originals-add-crewbert')

    await updateBacklogItem(MEETING_VAULT_ACL_CARD_ID, {
      lane: 'scoped',
      nextAction: `Phase B source-truth originals add-Crewbert batch applied: applied=${appliedCount}, appliedPendingReadback=${appliedUnverifiedCount}, failed=${failedCount}, skipped=${skippedCount}; approved dry-run hash ${approval.approvedDryRunHash}; approved batch hash ${approval.approvedBatchHash}; apply manifest hash ${manifestHash}; rollback manifest hash ${rollbackManifestHash}. Run source-truth Phase A recheck proof before scoping any removal batch.`,
      statusNote: `Phase B source-truth originals add-Crewbert batch executed on 2026-05-10 under explicit Steve approval. Scope was add Crewbert reader only for 418 owner-clear original Gemini notes missing Crewbert; no removals, moves, ownership transfers, deletions, request-access emails, owner-ambiguous files, legacy Crewbert duplicate copies, or original-missing blocked files were approved. Applied=${appliedCount}; appliedPendingReadback=${appliedUnverifiedCount}; failed=${failedCount}; skipped=${skippedCount}; apply manifest hash=${manifestHash}; rollback manifest hash=${rollbackManifestHash}. MEETING-VAULT-ACL-001 is not done until recheck proves all in-scope raw meeting ACL blockers cleared or later approved batches are applied/rechecked.`,
    }, 'meeting-vault-acl-source-truth-originals-add-crewbert')

    if (!jsonOnly) {
      console.log('Meeting vault ACL Phase B source-truth originals add-Crewbert apply')
      console.log(`  Status: ${finalStatus}`)
      console.log(`  Selected files: ${summary.selectedFileCount}`)
      console.log(`  Operation: ${APPROVED_BATCH.operationType}; role=${APPROVED_BATCH.role}; notify=false`)
      console.log(`  Counts: ${JSON.stringify(counts)}`)
      console.log(`  Apply manifest hash: ${manifestHash}`)
      console.log(`  Rollback manifest hash: ${rollbackManifestHash}`)
      console.log(`  Rollback operations: ${rollbackManifest.rollbackOperationCount}`)
      console.log(`  Local manifests: ${metadataPath(applyManifestPath)}, ${metadataPath(resultManifestPath)}, ${metadataPath(rollbackManifestPath)}`)
    } else {
      console.log(JSON.stringify(summary, null, 2))
    }
    console.log(`MEETING_VAULT_ACL_ORIGINALS_ADD_CREWBERT_APPLY ${JSON.stringify(summary)}`)
    if (finalStatus !== 'phase_b_originals_add_crewbert_applied' || !rollbackAvailable) process.exitCode = 1
  } finally {
    await closeFoundationDb().catch(() => {})
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
