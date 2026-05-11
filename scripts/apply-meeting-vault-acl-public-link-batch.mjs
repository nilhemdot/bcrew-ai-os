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
  GOOGLE_SCOPES,
  googleJsonFetch,
  listDrivePermissions,
} from '../lib/google-delegated.js'
import {
  buildMeetingAclDryRunPlan,
  buildMeetingAclPolicy,
  buildMeetingRawFileInventory,
  classifyMeetingLegacyDuplicateCopyAcl,
  classifyMeetingRawFileAcl,
  MEETING_VAULT_ACL_CARD_ID,
  MEETING_VAULT_ACL_STATES,
  MEETING_VAULT_POLICY_VERSION,
  MEETING_VAULT_SENSITIVITY_CLASSES,
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

const APPROVED_BATCHES = {
  publicLink: {
    key: 'public-link',
    name: 'source_truth_originals_unsafe_anyone_removal_v1',
    slug: 'source-truth-originals-unsafe-anyone-removal',
    label: 'public-link removal',
    dryRunHash: '5cdacede6a2c68dafbf3b77a1530f7c0da0b9a87da9843f9e467524c34925af0',
    batchHash: '6d5f974c028feb5556e667e19367b806a5b0132cd98802503b664761fe2a0597',
    sourceFileRole: MEETING_VAULT_SOURCE_FILE_ROLES.ORIGINAL,
    ownerState: 'owner_clear_only',
    permissionCategory: 'unsafe_anyone',
    operationType: DRIVE_PERMISSION_OPERATION_TYPES.REMOVE_UNSAFE_PERMISSION,
    fileCount: 7,
    operationCount: 7,
  },
  domain: {
    key: 'domain',
    name: 'source_truth_originals_unsafe_domain_removal_v1',
    slug: 'source-truth-originals-unsafe-domain-removal',
    label: 'domain removal',
    dryRunHash: '2770617db5fa4013aa25c41e5f42845a37f52eef84906d2140409af6ad1ce60c',
    batchHash: '79c879769805e137b6f2efcfd0ac9325bde08a034ad1181dd572228ae8e2b382',
    sourceFileRole: MEETING_VAULT_SOURCE_FILE_ROLES.ORIGINAL,
    ownerState: 'owner_clear_only',
    permissionCategory: 'unsafe_domain',
    operationType: DRIVE_PERMISSION_OPERATION_TYPES.REMOVE_UNSAFE_PERMISSION,
    fileCount: 1,
    operationCount: 1,
  },
  standardInternalZahndteam: {
    key: 'standard-internal-zahndteam-external-user',
    name: 'source_truth_originals_standard_internal_zahndteam_external_user_removal_v1',
    slug: 'source-truth-originals-standard-internal-zahndteam-external-user-removal',
    label: 'standard-internal ZahndTeam external-user removal',
    dryRunHash: 'c97e5362819b31b7568aa8db90d24b5116edb417206f07dbaf23518af3a8bb68',
    batchHash: '75f1ac6a23c2e9b6240a5688a5185e61a89a3697d0e56efeb30d2d2dc6fc7692',
    batchHashMode: 'approved_scope_digest_plus_live_scope_hash',
    sourceFileRole: MEETING_VAULT_SOURCE_FILE_ROLES.ORIGINAL,
    sensitivityClass: MEETING_VAULT_SENSITIVITY_CLASSES.STANDARD_INTERNAL,
    ownerState: 'owner_clear_only',
    permissionCategory: 'unsafe_external_user',
    principalDomain: 'zahndteam.ca',
    operationType: DRIVE_PERMISSION_OPERATION_TYPES.REMOVE_UNSAFE_PERMISSION,
    fileCount: 90,
    operationCount: 357,
  },
  standardInternalZahndteamPartialCleanup: {
    key: 'standard-internal-zahndteam-external-user-partial-cleanup',
    name: 'source_truth_originals_standard_internal_zahndteam_external_user_partial_cleanup_v2',
    slug: 'source-truth-originals-standard-internal-zahndteam-external-user-partial-cleanup',
    label: 'standard-internal ZahndTeam external-user partial cleanup',
    dryRunHash: 'c3fdd4dd20bde5544c0b662fc1dfaf2de06d247a6a05523fc015fe0a434b3101',
    batchHash: 'c5b9c93cdcc5f9e416957f73e7d3b80c6493619454ca41fb182063e8c23c2146',
    sourceFileRole: MEETING_VAULT_SOURCE_FILE_ROLES.ORIGINAL,
    sensitivityClass: MEETING_VAULT_SENSITIVITY_CLASSES.STANDARD_INTERNAL,
    ownerState: 'owner_clear_only',
    permissionCategory: 'unsafe_external_user',
    principalDomain: 'zahndteam.ca',
    operationType: DRIVE_PERMISSION_OPERATION_TYPES.REMOVE_UNSAFE_PERMISSION,
    fileCount: 12,
    operationCount: 69,
    cleanupOfPriorApprovedDryRunHash: 'c97e5362819b31b7568aa8db90d24b5116edb417206f07dbaf23518af3a8bb68',
    cleanupOfPriorBatchHash: '75f1ac6a23c2e9b6240a5688a5185e61a89a3697d0e56efeb30d2d2dc6fc7692',
    cleanupOfPriorResultManifestHash: '043e3ff004e3446a55a2f159c61e703d019377c193420e7ca1b72582a518558c',
    cleanupOfPriorResultManifestPath: 'store/meeting-vault-acl/MEETING-VAULT-ACL-001-source-truth-originals-standard-internal-zahndteam-external-user-removal-20260511180349.apply-result.json',
  },
  standardInternalZahndteamSecondPartialCleanup: {
    key: 'standard-internal-zahndteam-external-user-second-partial-cleanup',
    name: 'source_truth_originals_standard_internal_zahndteam_external_user_second_partial_cleanup_v1',
    slug: 'source-truth-originals-standard-internal-zahndteam-external-user-second-partial-cleanup',
    label: 'standard-internal ZahndTeam external-user second partial cleanup',
    dryRunHash: 'b5924001d6b641ea5920ef2c7f533f7ba0f189d7e9f69c418ad8d38f2cebb35b',
    batchHash: '91342d964dd3ef72702fd30c522ad3b8744b722776584abb391ae58e6f7298c9',
    sourceFileRole: MEETING_VAULT_SOURCE_FILE_ROLES.ORIGINAL,
    sensitivityClass: MEETING_VAULT_SENSITIVITY_CLASSES.STANDARD_INTERNAL,
    ownerState: 'owner_clear_only',
    permissionCategory: 'unsafe_external_user',
    principalDomain: 'zahndteam.ca',
    operationType: DRIVE_PERMISSION_OPERATION_TYPES.REMOVE_UNSAFE_PERMISSION,
    fileCount: 5,
    operationCount: 12,
    cleanupOfPriorApprovedDryRunHash: 'c3fdd4dd20bde5544c0b662fc1dfaf2de06d247a6a05523fc015fe0a434b3101',
    cleanupOfPriorBatchHash: 'c5b9c93cdcc5f9e416957f73e7d3b80c6493619454ca41fb182063e8c23c2146',
    cleanupOfPriorResultManifestHash: '7dd859298a8f6971b370f881247fe9071110dafdaac28abba2e6dbccb7eb8465',
    cleanupOfPriorResultManifestPath: 'store/meeting-vault-acl/MEETING-VAULT-ACL-001-source-truth-originals-standard-internal-zahndteam-external-user-partial-cleanup-20260511210217.apply-result.json',
    includeCleanupLineageInBatchHash: true,
    noOwnerAmbiguousRows: true,
  },
  standardInternalZahndteamOwnerAuthorityDirectRepair: {
    key: 'standard-internal-zahndteam-owner-authority-direct-repair',
    name: 'source_truth_originals_standard_internal_zahndteam_owner_authority_direct_permission_repair_v1',
    slug: 'source-truth-originals-standard-internal-zahndteam-owner-authority-direct-permission-repair',
    label: 'standard-internal ZahndTeam owner-authority direct-permission repair',
    dryRunHash: 'a44cb42580f4a938212599626b8b3112c2f06167f74f88b9b8c7ef388dbd6852',
    batchHash: 'b42972a72b62065acbb9f9723eed71c7d12fa79d914a6c9d6f1284410e90f279',
    sourceFileRole: MEETING_VAULT_SOURCE_FILE_ROLES.ORIGINAL,
    sensitivityClass: MEETING_VAULT_SENSITIVITY_CLASSES.STANDARD_INTERNAL,
    ownerState: 'owner_clear_only',
    permissionCategory: 'unsafe_external_user',
    principalDomain: 'zahndteam.ca',
    operationType: DRIVE_PERMISSION_OPERATION_TYPES.REMOVE_UNSAFE_PERMISSION,
    fileCount: 1,
    operationCount: 7,
    cleanupOfPriorApprovedDryRunHash: 'b5924001d6b641ea5920ef2c7f533f7ba0f189d7e9f69c418ad8d38f2cebb35b',
    cleanupOfPriorBatchHash: '91342d964dd3ef72702fd30c522ad3b8744b722776584abb391ae58e6f7298c9',
    cleanupOfPriorResultManifestHash: '8808fd10af655d8cf67c27420c1bf79cedc83b7163262704220a980992dccc7c',
    cleanupOfPriorResultManifestPath: 'store/meeting-vault-acl/MEETING-VAULT-ACL-001-source-truth-originals-standard-internal-zahndteam-external-user-second-partial-cleanup-20260511211809.apply-result.json',
    operationHashMode: 'owner_authority_direct_repair',
    repairMethod: 'delete_exact_direct_file_permissions_as_current_file_owner_via_delegated_domain_authority',
    ownerAuthorityOnly: true,
    ownerAccountHash: 'acct:cb0eaa8879099ce7',
    directPermissionsOnly: true,
    includePermissionDetailsInSelection: true,
    noNormalBatchRemover: true,
    noGmailBatch: true,
    noInheritedPermissionRows: true,
  },
}

function selectApprovedBatch(argv = process.argv.slice(2)) {
  const args = parseArgs(argv)
  const key = String(args.batch || args.batchKey || '').trim().toLowerCase()
  if (['domain', 'unsafe_domain'].includes(key)) return APPROVED_BATCHES.domain
  if (['standard-internal-zahndteam-owner-authority-direct-repair', 'zahndteam-owner-authority-direct-repair', 'standard_internal_zahndteam_owner_authority_direct_repair'].includes(key)) return APPROVED_BATCHES.standardInternalZahndteamOwnerAuthorityDirectRepair
  if (['standard-internal-zahndteam-second-partial-cleanup', 'zahndteam-second-partial-cleanup', 'standard_internal_zahndteam_external_user_second_partial_cleanup'].includes(key)) return APPROVED_BATCHES.standardInternalZahndteamSecondPartialCleanup
  if (['standard-internal-zahndteam-partial-cleanup', 'zahndteam-partial-cleanup', 'standard_internal_zahndteam_external_user_partial_cleanup'].includes(key)) return APPROVED_BATCHES.standardInternalZahndteamPartialCleanup
  if (['standard-internal-zahndteam', 'zahndteam', 'zahndteam_external_user', 'standard_internal_zahndteam_external_user'].includes(key)) return APPROVED_BATCHES.standardInternalZahndteam
  if (key && !['public-link', 'public_link', 'unsafe_anyone'].includes(key)) {
    throw new Error(`Unsupported MEETING-VAULT-ACL-001 removal batch: ${key}`)
  }
  return APPROVED_BATCHES.publicLink
}

const APPROVED_BATCH = selectApprovedBatch()

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

function hashResultManifest(value) {
  const { resultManifestHash, ...hashInput } = value || {}
  return hashObject(hashInput)
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

async function listDrivePermissionsForBatch(userEmail, fileId) {
  if (APPROVED_BATCH.permissionCategory !== 'unsafe_domain' && !APPROVED_BATCH.includePermissionDetailsInSelection) {
    return listDrivePermissions(userEmail, fileId)
  }
  const url =
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions` +
    '?supportsAllDrives=true&fields=permissions(id,type,role,emailAddress,domain,displayName,deleted,pendingOwner,permissionDetails(inherited,inheritedFrom,permissionType,role))'
  const data = await googleJsonFetch(userEmail, url, { scopes: [GOOGLE_SCOPES.drive] })
  return Array.isArray(data.permissions) ? data.permissions : []
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
      purpose: 'meeting_vault_acl_phase_b_public_link_removal',
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
  if (file.sourceFileRole === MEETING_VAULT_SOURCE_FILE_ROLES.LEGACY_CREWBERT_COPY) return classifyMeetingLegacyDuplicateCopyAcl(file, preflight, policy)
  if (file.sourceFileRole === MEETING_VAULT_SOURCE_FILE_ROLES.ORIGINAL_MISSING) {
    const duplicate = classifyMeetingLegacyDuplicateCopyAcl(file, preflight, policy)
    return {
      ...duplicate,
      state: MEETING_VAULT_ACL_STATES.BLOCKED,
      safe: false,
      blockerCard: MEETING_VAULT_ACL_CARD_ID,
      blockerReasons: ['original_gemini_note_missing_for_crewbert_copy'],
      sourceFileRole: MEETING_VAULT_SOURCE_FILE_ROLES.ORIGINAL_MISSING,
      policy: { ...duplicate.policy, sourceFileRole: MEETING_VAULT_SOURCE_FILE_ROLES.ORIGINAL_MISSING },
    }
  }
  return classifyMeetingRawFileAcl(file, preflight, policy)
}

async function buildPreflightRecords({ candidateLimit, concurrency }) {
  const candidates = await listMeetingRawDriveFileCandidates({ limit: candidateLimit })
  const inventory = buildMeetingRawFileInventory({ ...candidates, limit: candidateLimit })
  const foundationUsers = await listFoundationUsers({ meetingSyncEnabled: true })
  const fallbackAccounts = uniqueList(foundationUsers.map(user => user.email))
  const scanned = await mapWithConcurrency(inventory.items, concurrency, async file => {
    const policy = buildMeetingAclPolicy(file)
    const preflight = await buildDriveFilePreflightWithFallback({ file, policy, fallbackAccounts })
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

function operationHashInput(operations) {
  if (APPROVED_BATCH.operationHashMode === 'owner_authority_direct_repair') {
    return {
      dryRunHash: APPROVED_BATCH.dryRunHash,
      policyVersion: MEETING_VAULT_POLICY_VERSION,
      batch: APPROVED_BATCH.name,
      repairMethod: APPROVED_BATCH.repairMethod,
      blockedSourceResultManifestHash: APPROVED_BATCH.cleanupOfPriorResultManifestHash,
      priorApprovedBatchHash: APPROVED_BATCH.cleanupOfPriorBatchHash,
      operationType: APPROVED_BATCH.operationType,
      permissionCategory: APPROVED_BATCH.permissionCategory,
      principalDomain: APPROVED_BATCH.principalDomain,
      sensitivityClass: APPROVED_BATCH.sensitivityClass,
      sourceFileRole: APPROVED_BATCH.sourceFileRole,
      ownerAuthorityOnly: true,
      noNormalBatchRemover: true,
      noGmailBatch: true,
      noOtherDomains: true,
      noProtectedSensitive: true,
      noBroadNonSensitive: true,
      noAddCrewbertReader: true,
      noUnsafeNonOwnerUser: true,
      noMoves: true,
      noOwnershipTransfers: true,
      noFileDeletions: true,
      noRequestAccessEmails: true,
      noOwnerAmbiguousFiles: true,
      noLegacyCrewbertDuplicateCopies: true,
      noOriginalMissingBlockedFiles: true,
      directPermissionsOnly: true,
      noInheritedPermissionRows: true,
      fileCount: new Set(operations.map(operation => operation.fileRefHash)).size,
      operationCount: operations.length,
      operations: operations.map(operation => ({
        fileRefHash: operation.fileRefHash,
        ownerAccountHash: operation.ownerAccountHash,
        previousSourceAccountHash: operation.previousSourceAccountHash,
        repairActorHash: operation.repairActorHash,
        permissionHash: operation.permissionHash,
        permissionEmailHash: operation.permissionEmailHash,
        role: operation.role,
        type: operation.type,
        category: operation.permissionCategory,
        permissionDetails: operation.permissionDetails || [],
      })).sort((left, right) => `${left.fileRefHash}:${left.permissionHash}`.localeCompare(`${right.fileRefHash}:${right.permissionHash}`)),
    }
  }
  if (APPROVED_BATCH.cleanupOfPriorResultManifestHash) {
    return {
      dryRunHash: APPROVED_BATCH.dryRunHash,
      policyVersion: MEETING_VAULT_POLICY_VERSION,
      batch: APPROVED_BATCH.name,
      cleanupSourceResultManifestHash: APPROVED_BATCH.cleanupOfPriorResultManifestHash,
      ...(APPROVED_BATCH.includeCleanupLineageInBatchHash ? {
        cleanupOfPriorApprovedDryRunHash: APPROVED_BATCH.cleanupOfPriorApprovedDryRunHash,
        cleanupOfPriorBatchHash: APPROVED_BATCH.cleanupOfPriorBatchHash,
      } : {}),
      operationType: APPROVED_BATCH.operationType,
      sourceFileRole: APPROVED_BATCH.sourceFileRole,
      sensitivityClass: APPROVED_BATCH.sensitivityClass,
      ownerState: APPROVED_BATCH.ownerState,
      permissionCategory: APPROVED_BATCH.permissionCategory,
      principalDomain: APPROVED_BATCH.principalDomain,
      noFailedButDisappearedRows: true,
      noMissingAccessRows: true,
      ...(APPROVED_BATCH.noOwnerAmbiguousRows ? { noOwnerAmbiguousRows: true } : {}),
      noProtectedSensitive: true,
      noBroadNonSensitive: true,
      noOtherDomains: true,
      noAddCrewbertReader: true,
      noUnsafeNonOwnerUser: true,
      noMoves: true,
      noOwnershipTransfers: true,
      noDeletions: true,
      noRequestAccessEmails: true,
      noOwnerAmbiguousFiles: true,
      noLegacyCrewbertDuplicateCopies: true,
      noOriginalMissingBlockedFiles: true,
      fileCount: new Set(operations.map(operation => operation.fileRefHash)).size,
      operationCount: operations.length,
      operations: operations.map(operation => ({
        fileRefHash: operation.fileRefHash,
        ownerHash: operation.ownerHash,
        sourceAccountHash: operation.sourceAccountHash,
        permissionHash: operation.permissionHash,
        operationType: operation.operationType,
        permissionCategory: operation.permissionCategory,
        permissionEmailHash: operation.permissionEmailHash,
        principalDomain: operation.principalDomain,
        role: operation.role,
        type: operation.type,
        sensitivityClass: operation.sensitivityClass,
        sourceFileRole: operation.sourceFileRole,
      })).sort((left, right) => `${left.fileRefHash}:${left.permissionHash}`.localeCompare(`${right.fileRefHash}:${right.permissionHash}`)),
    }
  }
  return {
    dryRunHash: APPROVED_BATCH.dryRunHash,
    policyVersion: MEETING_VAULT_POLICY_VERSION,
    batch: APPROVED_BATCH.name,
    operationType: APPROVED_BATCH.operationType,
    sourceFileRole: APPROVED_BATCH.sourceFileRole,
    ...(APPROVED_BATCH.sensitivityClass ? { sensitivityClass: APPROVED_BATCH.sensitivityClass } : {}),
    ownerState: APPROVED_BATCH.ownerState,
    permissionCategory: APPROVED_BATCH.permissionCategory,
    ...(APPROVED_BATCH.principalDomain ? { principalDomain: APPROVED_BATCH.principalDomain } : {}),
    noAddCrewbertReader: true,
    noMoves: true,
    noOwnershipTransfers: true,
    noDeletions: true,
    noRequestAccessEmails: true,
    fileCount: new Set(operations.map(operation => operation.fileRefHash)).size,
    operationCount: operations.length,
    sensitivityClassCounts: countBy(operations, operation => operation.sensitivityClass),
    ...(APPROVED_BATCH.principalDomain ? { principalDomainCounts: countBy(operations, operation => operation.principalDomain) } : {}),
    operations: operations.map(operation => ({
      fileRefHash: operation.fileRefHash,
      ownerHash: operation.ownerHash,
      sourceAccountHash: operation.sourceAccountHash,
      permissionHash: operation.permissionHash,
      operationType: operation.operationType,
      permissionCategory: operation.permissionCategory,
      role: operation.role,
      type: operation.type,
      sensitivityClass: operation.sensitivityClass,
      sourceFileRole: operation.sourceFileRole,
      ...(operation.permissionEmailHash ? { permissionEmailHash: operation.permissionEmailHash } : {}),
      ...(operation.principalDomain ? { principalDomain: operation.principalDomain } : {}),
    })).sort((left, right) => `${left.fileRefHash}:${left.permissionHash}`.localeCompare(`${right.fileRefHash}:${right.permissionHash}`)),
  }
}

async function loadCleanupFailedRows() {
  if (!APPROVED_BATCH.cleanupOfPriorResultManifestHash) return null
  const resultManifest = await readJson(path.resolve(APPROVED_BATCH.cleanupOfPriorResultManifestPath))
  const manifestHash = hashResultManifest(resultManifest)
  if (manifestHash !== APPROVED_BATCH.cleanupOfPriorResultManifestHash) {
    throw new Error(`Cleanup fail-closed: prior result manifest hash ${manifestHash} does not match approved cleanup source ${APPROVED_BATCH.cleanupOfPriorResultManifestHash}.`)
  }
  if (resultManifest.approvedDryRunHash !== APPROVED_BATCH.cleanupOfPriorApprovedDryRunHash) {
    throw new Error('Cleanup fail-closed: prior result manifest dry-run hash does not match approved cleanup source.')
  }
  if (resultManifest.approvedBatchHash !== APPROVED_BATCH.cleanupOfPriorBatchHash) {
    throw new Error('Cleanup fail-closed: prior result manifest batch hash does not match approved cleanup source.')
  }
  return new Map((Array.isArray(resultManifest.results) ? resultManifest.results : [])
    .filter(result => result.status === 'failed')
    .map(result => [`${result.fileRefHash}:${result.permissionHash}`, result]))
}

async function loadCleanupFailedRowKeys() {
  const failedRows = await loadCleanupFailedRows()
  if (!failedRows) return null
  return new Set(failedRows.keys())
}

function permissionDetailsForProof(permission = {}) {
  return (Array.isArray(permission.permissionDetails) ? permission.permissionDetails : [])
    .map(detail => ({
      inherited: Boolean(detail?.inherited),
      role: String(detail?.role || '').trim().toLowerCase(),
      permissionType: String(detail?.permissionType || '').trim().toLowerCase(),
    }))
}

function permissionHasInheritedDetail(permission = {}) {
  return permissionDetailsForProof(permission).some(detail => detail.inherited)
}

function permissionHasDirectDetail(permission = {}) {
  const details = permissionDetailsForProof(permission)
  return !details.length || details.some(detail => !detail.inherited)
}

async function selectApprovedOperations(records) {
  const originalUnsafeRecords = records.filter(record =>
    record.file.sourceFileRole === APPROVED_BATCH.sourceFileRole &&
    (!APPROVED_BATCH.sensitivityClass || record.policy.sensitivityClass === APPROVED_BATCH.sensitivityClass) &&
    record.preflight.readable === true &&
    record.preflight.ownerAmbiguous === false &&
    Number(record.preflight.permissionSummary?.unsafeCount || 0) > 0
  )
  const operations = []
  const cleanupFailedRows = await loadCleanupFailedRows()
  const cleanupFailedRowKeys = cleanupFailedRows ? new Set(cleanupFailedRows.keys()) : null
  await mapWithConcurrency(originalUnsafeRecords, 8, async record => {
    if (APPROVED_BATCH.ownerAuthorityOnly && record.preflight.ownerHash !== APPROVED_BATCH.ownerAccountHash) return
    const permissions = await listDrivePermissionsForBatch(record.preflight.readableAccount || record.file.sourceAccount, record.file.fileId)
    for (const permission of permissions) {
      const classified = classifyDrivePermission(permission, record.policy.driveAccessPolicy)
      if (classified.operationType !== APPROVED_BATCH.operationType) continue
      if (classified.category !== APPROVED_BATCH.permissionCategory) continue
      const rowKey = `${record.file.fileRefHash}:${classified.permissionHash}`
      if (cleanupFailedRowKeys && !cleanupFailedRowKeys.has(rowKey)) continue
      const cleanupFailedRow = cleanupFailedRows?.get(rowKey) || null
      const principalDomain = emailDomain(permission.emailAddress)
      if (APPROVED_BATCH.principalDomain && principalDomain !== APPROVED_BATCH.principalDomain) continue
      if (APPROVED_BATCH.directPermissionsOnly) {
        if (permissionHasInheritedDetail(permission) || !permissionHasDirectDetail(permission)) continue
      }
      const repairActor = record.preflight.readableAccount || record.file.sourceAccount
      operations.push({
        fileId: record.file.fileId,
        fileRefHash: record.file.fileRefHash,
        sourceAccount: repairActor,
        sourceAccountHash: hashProofValue(normalizeEmail(repairActor), 'acct'),
        previousSourceAccountHash: cleanupFailedRow?.sourceAccountHash || null,
        ownerHash: record.preflight.ownerHash,
        ownerAccountHash: record.preflight.ownerHash,
        repairActorHash: hashProofValue(normalizeEmail(repairActor), 'acct'),
        sensitivityClass: record.policy.sensitivityClass,
        sourceFileRole: record.file.sourceFileRole,
        operationType: APPROVED_BATCH.operationType,
        permissionId: permission.id,
        permissionHash: classified.permissionHash,
        permissionCategory: classified.category,
        permissionEmail: permission.emailAddress || null,
        permissionEmailHash: permission.emailAddress ? hashProofValue(normalizeEmail(permission.emailAddress), 'acct') : null,
        principalDomain: principalDomain || null,
        domain: permission.domain || null,
        role: classified.role,
        type: classified.type,
        permissionDetails: permissionDetailsForProof(permission),
      })
    }
  })
  return operations.sort((left, right) => `${left.fileRefHash}:${left.permissionHash}`.localeCompare(`${right.fileRefHash}:${right.permissionHash}`))
}

async function buildApplyManifest({ approval, args, repoHead }) {
  const candidateLimit = Math.min(5000, Math.max(1, Number(args.candidateLimit || args['candidate-limit'] || 5000) || 5000))
  const concurrency = Math.min(8, Math.max(1, Number(args.concurrency || 6) || 6))
  const { inventory, records, dryRunPlan } = await buildPreflightRecords({ candidateLimit, concurrency })
  if (dryRunPlan.dryRunHash !== approval.approvedDryRunHash) {
    throw new Error(`Public-link removal fail-closed: live dry-run hash ${dryRunPlan.dryRunHash} does not match approved hash ${approval.approvedDryRunHash}.`)
  }
  const operations = await selectApprovedOperations(records)
  const fileCount = new Set(operations.map(operation => operation.fileRefHash)).size
  if (fileCount !== APPROVED_BATCH.fileCount || operations.length !== APPROVED_BATCH.operationCount) {
    throw new Error(`Public-link removal fail-closed: selected ${fileCount} files / ${operations.length} operations, expected ${APPROVED_BATCH.fileCount}/${APPROVED_BATCH.operationCount}.`)
  }
  const calculatedBatchHash = hashObject(operationHashInput(operations))
  if (!APPROVED_BATCH.batchHashMode && calculatedBatchHash !== approval.approvedBatchHash) {
    throw new Error(`Public-link removal fail-closed: calculated batch hash ${calculatedBatchHash} does not match approved hash ${approval.approvedBatchHash}.`)
  }
  const manifest = {
    manifestType: 'meeting_vault_acl_phase_b_apply_manifest',
    cardId: MEETING_VAULT_ACL_CARD_ID,
    phase: 'Phase B',
    batch: APPROVED_BATCH.name,
    approvedDryRunHash: approval.approvedDryRunHash,
    approvedBatchHash: approval.approvedBatchHash,
    calculatedBatchHash,
    ...(APPROVED_BATCH.batchHashMode ? { batchHashMode: APPROVED_BATCH.batchHashMode } : {}),
    policyVersion: MEETING_VAULT_POLICY_VERSION,
    repoHead,
    generatedAt: new Date().toISOString(),
    approvalRef: args.approvalRef,
    boundaries: {
      operationType: APPROVED_BATCH.operationType,
      sourceFileRole: APPROVED_BATCH.sourceFileRole,
      ...(APPROVED_BATCH.sensitivityClass ? { sensitivityClass: APPROVED_BATCH.sensitivityClass } : {}),
      ownerState: APPROVED_BATCH.ownerState,
      permissionCategory: APPROVED_BATCH.permissionCategory,
      ...(APPROVED_BATCH.principalDomain ? { principalDomain: APPROVED_BATCH.principalDomain } : {}),
      noAddCrewbertReader: true,
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
      selectedFileCount: fileCount,
      operationCount: operations.length,
      dryRunHash: dryRunPlan.dryRunHash,
      stateCounts: dryRunPlan.stateCounts,
      sourceFileRoleCounts: dryRunPlan.sourceFileRoleCounts,
      sensitivityClassCounts: dryRunPlan.sensitivityClassCounts,
      selectedSensitivityClassCounts: countBy(operations, operation => operation.sensitivityClass),
      proposedOperationTypes: dryRunPlan.proposedOperationTypes,
    },
    operations,
  }
  return { manifest, manifestHash: hashObject(manifest), dryRunPlan }
}

async function applyOperation(operation) {
  const beforePermissions = await listDrivePermissionsForBatch(operation.sourceAccount, operation.fileId)
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
    throw new Error('Permission no longer matches the approved unsafe_anyone removal batch.')
  }
  if (APPROVED_BATCH.directPermissionsOnly && (permissionHasInheritedDetail(permission) || !permissionHasDirectDetail(permission))) {
    throw new Error('Permission no longer matches the approved direct-permission-only owner-authority repair batch.')
  }
  if (APPROVED_BATCH.principalDomain && emailDomain(permission.emailAddress) !== APPROVED_BATCH.principalDomain) {
    throw new Error('Permission no longer matches the approved principal domain.')
  }
  if (String(permission.role || '').toLowerCase() === 'owner') throw new Error('Refusing to remove an owner permission.')

  await deleteDrivePermission(operation.sourceAccount, operation.fileId, operation.permissionId)
  const afterPermissions = await listDrivePermissionsForBatch(operation.sourceAccount, operation.fileId)
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
      role: operation.role,
      type: operation.type,
      emailAddress: operation.permissionEmail || null,
      domain: operation.domain || null,
        fileRefHash: operation.fileRefHash,
        permissionHash: operation.permissionHash,
        ownerAccountHash: operation.ownerAccountHash || null,
        repairActorHash: operation.repairActorHash || null,
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
    throw new Error('Rollback manifest does not match the public-link removal batch.')
  }
  const operations = Array.isArray(manifest.rollbackOperations) ? manifest.rollbackOperations : []
  const results = await mapWithConcurrency(operations, concurrency, async operation => {
    try {
      if (operation.operationType !== 'recreate_removed_permission') throw new Error('Unsupported rollback operation.')
      const created = await createDrivePermission(operation.sourceAccount, operation.fileId, {
        role: operation.role,
        type: operation.type || (APPROVED_BATCH.permissionCategory === 'unsafe_domain' ? 'domain' : APPROVED_BATCH.permissionCategory === 'unsafe_external_user' ? 'user' : 'anyone'),
        emailAddress: operation.emailAddress || undefined,
        domain: operation.domain || undefined,
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
  if (approval.approvedSourceFileRole !== APPROVED_BATCH.sourceFileRole) failures.push('approved source file role mismatch')
  if (APPROVED_BATCH.sensitivityClass && approval.approvedSensitivityClass !== APPROVED_BATCH.sensitivityClass) failures.push('approved sensitivity class mismatch')
  if (APPROVED_BATCH.principalDomain && approval.approvedPrincipalDomain !== APPROVED_BATCH.principalDomain) failures.push('approved principal domain mismatch')
  if (APPROVED_BATCH.cleanupOfPriorResultManifestHash) {
    if (approval.cleanupOfPriorApprovedDryRunHash !== APPROVED_BATCH.cleanupOfPriorApprovedDryRunHash) failures.push('cleanup source dry-run hash mismatch')
    if (approval.cleanupOfPriorBatchHash !== APPROVED_BATCH.cleanupOfPriorBatchHash) failures.push('cleanup source batch hash mismatch')
    if (approval.cleanupOfPriorResultManifestHash !== APPROVED_BATCH.cleanupOfPriorResultManifestHash) failures.push('cleanup source result manifest hash mismatch')
    if (approval.failedButDisappearedRowsApproved !== false) failures.push('failed-but-disappeared rows must be false')
    if (approval.missingAccessRowsApproved !== false) failures.push('missing-access rows must be false')
    if (APPROVED_BATCH.noOwnerAmbiguousRows && approval.ownerAmbiguousRowsApproved !== false) failures.push('owner-ambiguous rows must be false')
  }
  if (APPROVED_BATCH.ownerAuthorityOnly) {
    if (approval.ownerAuthorityOnlyApproved !== true) failures.push('owner-authority repair approval must be explicit')
    if (approval.normalBatchRemoverApproved !== false) failures.push('normal batch remover must be false')
    if (approval.gmailBatchApproved !== false) failures.push('Gmail batch must be false')
    if (approval.inheritedPermissionRowsApproved !== false) failures.push('inherited permission rows must be false')
    if (approval.approvedOwnerAccountHash !== APPROVED_BATCH.ownerAccountHash) failures.push('approved owner account hash mismatch')
    if (approval.approvedRepairMethod !== APPROVED_BATCH.repairMethod) failures.push('approved repair method mismatch')
  }
  if (Number(approval.approvedFileCount) !== APPROVED_BATCH.fileCount) failures.push('approved file count mismatch')
  if (Number(approval.approvedOperationCount) !== APPROVED_BATCH.operationCount) failures.push('approved operation count mismatch')
  if (approval.driveMutationApproved !== true) failures.push('drive mutation approval must be explicit')
  if (approval.permissionRemovalsApproved !== true) failures.push('permission removal approval must be explicit')
  if (approval.addCrewbertReaderApproved !== false) failures.push('add Crewbert operations must be false')
  if (approval.noRequestAccessEmails !== true) failures.push('request-access email boundary missing')
  if (approval.noMovesApproved !== true) failures.push('move boundary missing')
  if (approval.noOwnershipTransfersApproved !== true) failures.push('ownership-transfer boundary missing')
  if (approval.noDeletionsApproved !== true) failures.push('deletion boundary missing')
  if (approval.ownerAmbiguousApproved !== false) failures.push('owner-ambiguous files must be false')
  if (approval.legacyCrewbertDuplicateCopiesApproved !== false) failures.push('legacy duplicate copies must be false')
  if (approval.originalMissingBlockedApproved !== false) failures.push('original-missing blocked files must be false')
  if (APPROVED_BATCH.permissionCategory === 'unsafe_domain') {
    if (approval.unsafeDomainApproved !== true) failures.push('unsafe_domain approval must be explicit')
  } else if (approval.unsafeDomainApproved !== false) {
    failures.push('unsafe_domain files must be false')
  }
  if (APPROVED_BATCH.permissionCategory === 'unsafe_external_user') {
    if (approval.unsafeExternalUserApproved !== true) failures.push('unsafe_external_user approval must be explicit')
  } else if (approval.unsafeExternalUserApproved !== false) {
    failures.push('unsafe_external_user files must be false')
  }
  if (APPROVED_BATCH.sensitivityClass === MEETING_VAULT_SENSITIVITY_CLASSES.STANDARD_INTERNAL) {
    if (approval.standardInternalExternalRemovalsApproved !== true) failures.push('standard_internal external removals approval must be explicit')
    if (approval.protectedSensitiveExternalRemovalsApproved !== false) failures.push('protected_sensitive external removals must be false')
    if (approval.broadNonSensitiveExternalRemovalsApproved !== false) failures.push('broad_non_sensitive external removals must be false')
  }
  if (approval.unsafeFrontOfficeApproved !== false) failures.push('unsafe_front_office files must be false')
  if (approval.unsafeNonOwnerUserApproved !== false) failures.push('unsafe_non_owner_user files must be false')
  if (approval.approvalDigest !== calculateApprovalDigest(approval)) failures.push('approval digest mismatch')
  if (failures.length) throw new Error(`Public-link removal approval failed validation: ${failures.join('; ')}`)
}

function noRawProof(summary) {
  const proofText = JSON.stringify(summary)
  const forbidden = [/fileId/i, /permissionId/i, /sourceAccount(?!Hash)/i, /emailAddress/i, /webViewLink/i, /https:\/\/docs\.google\.com/i]
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
    const rollback = await rollbackFromManifest({ rollbackManifestPath: path.resolve(args.rollbackManifest), concurrency: applyConcurrency })
    const summary = { mode: 'rollback', cardId: MEETING_VAULT_ACL_CARD_ID, batch: APPROVED_BATCH.name, rollbackManifestHash: rollback.manifestHash, rollbackOperationCount: rollback.rollbackOperationCount, counts: rollback.counts, metadataOnly: true }
    if (!jsonOnly) {
    console.log(`Meeting vault ACL Phase B ${APPROVED_BATCH.label} rollback`)
      console.log(`  Rollback manifest hash: ${summary.rollbackManifestHash}`)
      console.log(`  Counts: ${JSON.stringify(summary.counts)}`)
    }
    console.log(`MEETING_VAULT_ACL_REMOVAL_ROLLBACK ${JSON.stringify(summary)}`)
    if (rollback.counts.rollback_failed) process.exitCode = 1
    return
  }

  if (!applyRequested) throw new Error(`Use --apply for the approved ${APPROVED_BATCH.label} batch. Default mode is fail-closed.`)
  if (!args.approvalRef) throw new Error('--approvalRef is required')
  const approvalRef = path.resolve(args.approvalRef)
  const approval = await readJson(approvalRef)
  assertApproval(approval, args)
  const approvalIntegrity = await validatePlanApprovalFile({ repoRoot: process.cwd(), approvalRef: metadataPath(approvalRef), cardId: MEETING_VAULT_ACL_CARD_ID })
  if (!approvalIntegrity.ok) throw new Error(`Approval integrity failed: ${approvalIntegrity.failures.map(failure => failure.check).join('; ')}`)

  await initFoundationDb()
  try {
    const { manifest, manifestHash, dryRunPlan } = await buildApplyManifest({ approval, args: { ...args, approvalRef: metadataPath(approvalRef) }, repoHead })
    const applyManifestPath = path.join(storeDir, `${MEETING_VAULT_ACL_CARD_ID}-${APPROVED_BATCH.slug}-${timestamp}.apply-manifest.json`)
    const resultManifestPath = path.join(storeDir, `${MEETING_VAULT_ACL_CARD_ID}-${APPROVED_BATCH.slug}-${timestamp}.apply-result.json`)
    const rollbackManifestPath = path.join(storeDir, `${MEETING_VAULT_ACL_CARD_ID}-${APPROVED_BATCH.slug}-${timestamp}.rollback-manifest.json`)
    manifest.manifestHash = manifestHash
    await writeJson(applyManifestPath, manifest)

    const { results, rollbackManifest, counts } = await applyManifest({ manifest, applyConcurrency })
    const resultManifest = { manifestType: 'meeting_vault_acl_phase_b_apply_result', cardId: MEETING_VAULT_ACL_CARD_ID, phase: 'Phase B', batch: APPROVED_BATCH.name, approvedDryRunHash: approval.approvedDryRunHash, approvedBatchHash: approval.approvedBatchHash, applyManifestPath, rollbackManifestPath, generatedAt: new Date().toISOString(), resultCount: results.length, counts, results }
    const rollbackManifestHash = hashObject(rollbackManifest)
    rollbackManifest.rollbackManifestHash = rollbackManifestHash
    const resultManifestHash = hashObject(resultManifest)
    resultManifest.resultManifestHash = resultManifestHash
    await writeJson(rollbackManifestPath, rollbackManifest)
    await writeJson(resultManifestPath, resultManifest)

    const removedCount = Number(counts.removed || 0)
    const removedUnverifiedCount = Number(counts.removed_unverified || 0)
    const failedCount = Number(counts.failed || 0)
    const skippedCount = Number(counts.skipped_permission_absent || 0)
    const finalStatus = failedCount || skippedCount || removedCount + removedUnverifiedCount !== APPROVED_BATCH.operationCount
      ? `phase_b_${APPROVED_BATCH.key.replace(/-/g, '_')}_partial`
      : `phase_b_${APPROVED_BATCH.key.replace(/-/g, '_')}_applied`
    const rollbackAvailable = rollbackManifest.rollbackOperationCount === removedCount + removedUnverifiedCount
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
      ...(manifest.batchHashMode ? { batchHashMode: manifest.batchHashMode } : {}),
      liveDryRunHashBeforeApply: dryRunPlan.dryRunHash,
      selectedFileCount: manifest.inventory.selectedFileCount,
      operationCount: manifest.inventory.operationCount,
      selectedSensitivityClassCounts: manifest.inventory.selectedSensitivityClassCounts,
      operationType: APPROVED_BATCH.operationType,
      permissionCategory: APPROVED_BATCH.permissionCategory,
      ...(APPROVED_BATCH.principalDomain ? { principalDomain: APPROVED_BATCH.principalDomain } : {}),
      counts,
      applyManifestHash: manifestHash,
      resultManifestHash,
      rollbackManifestHash,
      rollbackOperationCount: rollbackManifest.rollbackOperationCount,
      rollbackAvailable,
      localManifestPaths: { apply: metadataPath(applyManifestPath), result: metadataPath(resultManifestPath), rollback: metadataPath(rollbackManifestPath) },
      boundaries: { noAddCrewbertReader: true, noMoves: true, noOwnershipTransfers: true, noDeletions: true, noRequestAccessEmails: true, noOwnerAmbiguousFiles: true, noLegacyCrewbertDuplicateCopies: true, noOriginalMissingBlockedFiles: true },
      metadataOnly: true,
    }
    const rawProofFindings = noRawProof(summary)
    if (rawProofFindings.length) throw new Error(`Proof summary contains raw-only keys: ${rawProofFindings.join(', ')}`)

    await recordMeetingVaultAclAudit({
      cardId: MEETING_VAULT_ACL_CARD_ID,
      policyVersion: MEETING_VAULT_POLICY_VERSION,
      status: dryRunPlan.phaseBRequired ? 'blocked_phase_b_required' : 'safe',
      dryRunHash: approval.approvedDryRunHash,
      inventoryTotal: dryRunPlan.fileCount,
      inventoryScanned: dryRunPlan.fileCount,
      inventoryComplete: true,
      phaseAComplete: true,
      counts: { fileCount: dryRunPlan.fileCount, safeCount: dryRunPlan.safeCount, unsafeCount: dryRunPlan.unsafeCount, unsafePermissionCount: dryRunPlan.unsafePermissionCount, missingCrewbertCount: dryRunPlan.missingCrewbertCount, missingAccessCount: dryRunPlan.missingAccessCount, ownerAmbiguousCount: dryRunPlan.ownerAmbiguousCount, blockedCount: dryRunPlan.blockedCount },
      proposedOperationTypes: { [APPROVED_BATCH.operationType]: manifest.inventory.operationCount },
      summary: { ...summary, phaseBApplyStatus: finalStatus },
    }, `meeting-vault-acl-${APPROVED_BATCH.key}-removal`)

    await updateBacklogItem(MEETING_VAULT_ACL_CARD_ID, {
      lane: 'scoped',
      nextAction: `Phase B ${APPROVED_BATCH.label} batch applied: removed=${removedCount}, removedPendingReadback=${removedUnverifiedCount}, failed=${failedCount}, skipped=${skippedCount}; approved dry-run hash ${approval.approvedDryRunHash}; approved batch hash ${approval.approvedBatchHash}; apply manifest hash ${manifestHash}; rollback manifest hash ${rollbackManifestHash}. Run source-truth Phase A recheck proof before scoping the next removal batch.`,
      statusNote: `Phase B ${APPROVED_BATCH.label} batch executed under explicit Steve approval. Scope was ${APPROVED_BATCH.permissionCategory}${APPROVED_BATCH.principalDomain ? ` for principal domain ${APPROVED_BATCH.principalDomain}` : ''} on owner-clear original Gemini notes only; no add-Crewbert operations, other removal categories, moves, ownership transfers, deletions, request-access emails, owner-ambiguous files, legacy duplicate copies, or original-missing blocked files were approved. Removed=${removedCount}; removedPendingReadback=${removedUnverifiedCount}; failed=${failedCount}; skipped=${skippedCount}; apply manifest hash=${manifestHash}; rollback manifest hash=${rollbackManifestHash}. MEETING-VAULT-ACL-001 is not done until recheck proves all in-scope raw meeting ACL blockers cleared or later approved batches are applied/rechecked.`,
    }, `meeting-vault-acl-${APPROVED_BATCH.key}-removal`)

    if (!jsonOnly) {
      console.log(`Meeting vault ACL Phase B ${APPROVED_BATCH.label} apply`)
      console.log(`  Status: ${finalStatus}`)
      console.log(`  Selected files: ${summary.selectedFileCount}`)
      console.log(`  Operation: ${APPROVED_BATCH.operationType}; category=${APPROVED_BATCH.permissionCategory}`)
      console.log(`  Counts: ${JSON.stringify(counts)}`)
      console.log(`  Apply manifest hash: ${manifestHash}`)
      console.log(`  Rollback manifest hash: ${rollbackManifestHash}`)
      console.log(`  Rollback operations: ${rollbackManifest.rollbackOperationCount}`)
      console.log(`  Local manifests: ${metadataPath(applyManifestPath)}, ${metadataPath(resultManifestPath)}, ${metadataPath(rollbackManifestPath)}`)
    } else {
      console.log(JSON.stringify(summary, null, 2))
    }
    console.log(`MEETING_VAULT_ACL_REMOVAL_APPLY ${JSON.stringify(summary)}`)
    if (finalStatus !== `phase_b_${APPROVED_BATCH.key.replace(/-/g, '_')}_applied` || !rollbackAvailable) process.exitCode = 1
  } finally {
    await closeFoundationDb().catch(() => {})
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
