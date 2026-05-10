import crypto from 'node:crypto'
import {
  getDriveFileMetadata,
  listDrivePermissions,
} from './google-delegated.js'

export const DRIVE_ACCESS_REQUEST_CARD_ID = 'DRIVE-ACCESS-REQUEST-001'
export const DRIVE_ACCESS_REQUEST_CLOSEOUT_KEY = 'drive-access-request-v1'
export const DRIVE_ACCESS_REQUEST_PLAN_PATH = 'docs/process/meeting-vault-acl-001-plan.md'
export const DRIVE_ACCESS_REQUEST_DOC_PATH = 'docs/process/drive-access-request.md'
export const DRIVE_ACCESS_REQUEST_APPROVAL_PATH = 'docs/process/approvals/DRIVE-ACCESS-REQUEST-001.json'
export const DRIVE_ACCESS_REQUEST_SCRIPT_PATH = 'scripts/process-drive-access-request-check.mjs'
export const DRIVE_ACCESS_REQUEST_SUMMARY_MARKER = 'DRIVE_ACCESS_REQUEST_SUMMARY'

export const DRIVE_ACCESS_PREFLIGHT_STATES = {
  READABLE_SAFE: 'readable_safe',
  READABLE_REPAIRABLE: 'readable_repairable',
  READABLE_REPAIR_BLOCKED: 'readable_repair_blocked',
  MISSING_ACCESS: 'missing_access',
  OWNER_AMBIGUOUS: 'owner_ambiguous',
  PERMISSION_INHERITED_BLOCKED: 'permission_inherited_blocked',
  SHARED_DRIVE_BLOCKED: 'shared_drive_blocked',
  REQUEST_ACCESS_REQUIRED: 'request_access_required',
  UNSUPPORTED_FILE: 'unsupported_file',
  FAILED_CLOSED: 'failed_closed',
}

export const DRIVE_PERMISSION_OPERATION_TYPES = {
  ADD_CREWBERT_READER: 'add_crewbert_reader',
  ADD_CREWBERT_WRITER: 'add_crewbert_writer',
  REMOVE_UNSAFE_PERMISSION: 'remove_unsafe_permission',
  REQUEST_ACCESS: 'request_access',
  BLOCK_OWNER_AMBIGUOUS: 'block_owner_ambiguous',
  BLOCK_INHERITED_PERMISSION: 'block_inherited_permission',
}

export const DEFAULT_DRIVE_ACCESS_POLICY = {
  crewbertEmail: 'crewbert@bensoncrew.ca',
  frontOfficeEmail: 'ai@bensoncrew.ca',
  allowedDomains: ['bensoncrew.ca'],
  crewbertRole: 'reader',
  requireCrewbert: true,
  allowInternalUsers: false,
  allowInternalGroups: false,
  allowInternalDomain: false,
  allowFrontOffice: false,
  policyVersion: 'drive-access-request-v1',
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

function normalizeRole(value) {
  return String(value || '').trim().toLowerCase()
}

function normalizePermissionType(value) {
  return String(value || '').trim().toLowerCase()
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

export function hashProofValue(value, prefix = '') {
  const digest = crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex')
  return prefix ? `${prefix}:${digest.slice(0, 16)}` : digest
}

export function hashProofObject(value, prefix = '') {
  return hashProofValue(stableStringify(value), prefix)
}

export function normalizeDriveActor(input = {}) {
  const actor = typeof input === 'string' ? { email: input } : input || {}
  const email = normalizeEmail(actor.email || actor.userEmail || actor.sourceAccount || '')
  return {
    email,
    emailHash: email ? hashProofValue(email, 'acct') : null,
    actorType: actor.actorType || (email.endsWith('@bensoncrew.ca') ? 'workspace_user' : 'unknown'),
  }
}

export function normalizeDriveAccessPolicy(policy = {}) {
  const merged = {
    ...DEFAULT_DRIVE_ACCESS_POLICY,
    ...policy,
  }
  return {
    ...merged,
    crewbertEmail: normalizeEmail(merged.crewbertEmail),
    frontOfficeEmail: normalizeEmail(merged.frontOfficeEmail),
    crewbertRole: normalizeRole(merged.crewbertRole || 'reader'),
    allowedDomains: (merged.allowedDomains || []).map(domain => String(domain || '').trim().toLowerCase()).filter(Boolean),
  }
}

function emailDomain(email) {
  const normalized = normalizeEmail(email)
  const at = normalized.lastIndexOf('@')
  return at === -1 ? '' : normalized.slice(at + 1)
}

function roleCanWrite(role) {
  return ['owner', 'organizer', 'fileorganizer', 'writer'].includes(normalizeRole(role))
}

function emailBelongsToAllowedDomain(email, policy) {
  const domain = emailDomain(email)
  return Boolean(domain && policy.allowedDomains.includes(domain))
}

function domainBelongsToAllowedDomain(permission, policy) {
  const domain = String(permission.domain || permission.emailAddress || '').trim().toLowerCase()
  return Boolean(domain && policy.allowedDomains.includes(domain))
}

export function classifyDrivePermission(permission = {}, policyInput = {}) {
  const policy = normalizeDriveAccessPolicy(policyInput)
  const type = normalizePermissionType(permission.type)
  const role = normalizeRole(permission.role)
  const email = normalizeEmail(permission.emailAddress)
  const isDeleted = Boolean(permission.deleted)
  const emailHash = email ? hashProofValue(email, 'acct') : null
  const permissionHash = permission.id ? hashProofValue(permission.id, 'perm') : null

  if (isDeleted) {
    return {
      category: 'ignored_deleted',
      allowed: true,
      unsafe: false,
      role,
      type,
      emailHash,
      permissionHash,
      reason: 'deleted permission ignored',
    }
  }

  if (role === 'owner') {
    const crewbertOwner = Boolean(email && email === policy.crewbertEmail)
    return {
      category: 'owner',
      allowed: true,
      unsafe: false,
      role,
      type,
      emailHash,
      permissionHash,
      crewbertOwner,
      reason: 'owner permission preserved',
    }
  }

  if (email && email === policy.crewbertEmail) {
    const allowedRole = policy.crewbertRole === 'writer'
      ? ['reader', 'commenter', 'writer'].includes(role)
      : ['reader', 'commenter'].includes(role)
    return {
      category: 'crewbert',
      allowed: allowedRole,
      unsafe: !allowedRole,
      role,
      type,
      emailHash,
      permissionHash,
      reason: allowedRole ? 'crewbert system access present' : 'crewbert role exceeds approved policy',
    }
  }

  if (type === 'anyone') {
    return {
      category: 'unsafe_anyone',
      allowed: false,
      unsafe: true,
      operationType: DRIVE_PERMISSION_OPERATION_TYPES.REMOVE_UNSAFE_PERMISSION,
      role,
      type,
      emailHash,
      permissionHash,
      reason: 'anyone permission is unsafe for raw meeting files',
    }
  }

  if (type === 'domain') {
    if (policy.allowInternalDomain && domainBelongsToAllowedDomain(permission, policy)) {
      return {
        category: 'allowed_internal_domain',
        allowed: true,
        unsafe: false,
        role,
        type,
        emailHash,
        permissionHash,
        reason: 'allowed internal domain permission for non-sensitive meeting file',
      }
    }
    return {
      category: 'unsafe_domain',
      allowed: false,
      unsafe: true,
      operationType: DRIVE_PERMISSION_OPERATION_TYPES.REMOVE_UNSAFE_PERMISSION,
      role,
      type,
      emailHash,
      permissionHash,
      reason: 'domain permission is unsafe for raw meeting files',
    }
  }

  if (type === 'group') {
    if (policy.allowInternalGroups && email && emailBelongsToAllowedDomain(email, policy)) {
      return {
        category: 'allowed_internal_group',
        allowed: true,
        unsafe: false,
        role,
        type,
        emailHash,
        permissionHash,
        reason: 'allowed internal group permission for non-sensitive meeting file',
      }
    }
    return {
      category: 'unsafe_group',
      allowed: false,
      unsafe: true,
      operationType: DRIVE_PERMISSION_OPERATION_TYPES.REMOVE_UNSAFE_PERMISSION,
      role,
      type,
      emailHash,
      permissionHash,
      reason: 'group permission is not approved for raw meeting files',
    }
  }

  if (email && email === policy.frontOfficeEmail) {
    if (policy.allowFrontOffice) {
      return {
        category: 'allowed_front_office',
        allowed: true,
        unsafe: false,
        role,
        type,
        emailHash,
        permissionHash,
        reason: 'front-office account allowed for non-sensitive meeting file',
      }
    }
    return {
      category: 'unsafe_front_office',
      allowed: false,
      unsafe: true,
      operationType: DRIVE_PERMISSION_OPERATION_TYPES.REMOVE_UNSAFE_PERMISSION,
      role,
      type,
      emailHash,
      permissionHash,
      reason: 'front-office ai account should not retain durable raw-file access',
    }
  }

  if (email && !policy.allowedDomains.includes(emailDomain(email))) {
    return {
      category: 'unsafe_external_user',
      allowed: false,
      unsafe: true,
      operationType: DRIVE_PERMISSION_OPERATION_TYPES.REMOVE_UNSAFE_PERMISSION,
      role,
      type,
      emailHash,
      permissionHash,
      reason: 'external user permission is unsafe for raw meeting files',
    }
  }

  if (email) {
    if (policy.allowInternalUsers && emailBelongsToAllowedDomain(email, policy)) {
      return {
        category: 'allowed_internal_user',
        allowed: true,
        unsafe: false,
        role,
        type,
        emailHash,
        permissionHash,
        reason: 'allowed internal user permission for non-sensitive meeting file',
      }
    }
    return {
      category: 'unsafe_non_owner_user',
      allowed: false,
      unsafe: true,
      operationType: DRIVE_PERMISSION_OPERATION_TYPES.REMOVE_UNSAFE_PERMISSION,
      role,
      type,
      emailHash,
      permissionHash,
      reason: 'non-owner human raw access is not approved by Phase A',
    }
  }

  return {
    category: 'unknown_permission',
    allowed: false,
    unsafe: true,
    operationType: DRIVE_PERMISSION_OPERATION_TYPES.REMOVE_UNSAFE_PERMISSION,
    role,
    type,
    emailHash,
    permissionHash,
    reason: 'permission shape is unknown',
  }
}

function summarizePermissionClassifications(classifications) {
  const counts = {}
  for (const classification of classifications) {
    counts[classification.category] = (counts[classification.category] || 0) + 1
  }
  return counts
}

function buildPermissionSummary(classifications) {
  const crewbertAccess = classifications.filter(item =>
    (item.category === 'crewbert' && item.allowed) || item.crewbertOwner
  )
  return {
    total: classifications.length,
    ownerCount: classifications.filter(item => item.category === 'owner').length,
    crewbertCount: crewbertAccess.length,
    crewbertOwnerCount: classifications.filter(item => item.crewbertOwner).length,
    unsafeCount: classifications.filter(item => item.unsafe).length,
    writerOrOwnerCount: classifications.filter(item => roleCanWrite(item.role)).length,
    categories: summarizePermissionClassifications(classifications),
  }
}

function classifyGoogleError(error) {
  const message = error instanceof Error ? error.message : String(error || '')
  const statusMatch = message.match(/\b(401|403|404|429|500|502|503|504)\b/)
  const status = statusMatch ? Number(statusMatch[1]) : null
  if (status === 401 || status === 403) return { state: DRIVE_ACCESS_PREFLIGHT_STATES.MISSING_ACCESS, status, message }
  if (status === 404) return { state: DRIVE_ACCESS_PREFLIGHT_STATES.REQUEST_ACCESS_REQUIRED, status, message }
  return { state: DRIVE_ACCESS_PREFLIGHT_STATES.FAILED_CLOSED, status, message }
}

export function classifyDriveRepairAuthority(preflight = {}) {
  if (!preflight.readable) {
    return {
      canRepair: false,
      reason: preflight.state || DRIVE_ACCESS_PREFLIGHT_STATES.MISSING_ACCESS,
      state: preflight.state || DRIVE_ACCESS_PREFLIGHT_STATES.MISSING_ACCESS,
    }
  }
  if (preflight.ownerAmbiguous) {
    return {
      canRepair: false,
      reason: 'owner_ambiguous',
      state: DRIVE_ACCESS_PREFLIGHT_STATES.OWNER_AMBIGUOUS,
    }
  }
  if (preflight.proposedOperations?.some(operation => operation.operationType === DRIVE_PERMISSION_OPERATION_TYPES.BLOCK_INHERITED_PERMISSION)) {
    return {
      canRepair: false,
      reason: 'inherited_permission_blocked',
      state: DRIVE_ACCESS_PREFLIGHT_STATES.PERMISSION_INHERITED_BLOCKED,
    }
  }
  if (!preflight.proposedOperations?.length) {
    return {
      canRepair: false,
      reason: 'no_repair_needed',
      state: DRIVE_ACCESS_PREFLIGHT_STATES.READABLE_SAFE,
    }
  }
  return {
    canRepair: true,
    reason: 'dry_run_only_repairable_after_explicit_approval',
    state: DRIVE_ACCESS_PREFLIGHT_STATES.READABLE_REPAIRABLE,
  }
}

export function buildDriveAccessRequestPlan(preflight = {}) {
  if (preflight.state === DRIVE_ACCESS_PREFLIGHT_STATES.READABLE_SAFE) {
    return {
      action: 'none',
      nextSafeAction: 'No access request or permission repair needed.',
      blockerCard: null,
    }
  }
  if (!preflight.readable || preflight.state === DRIVE_ACCESS_PREFLIGHT_STATES.MISSING_ACCESS) {
    return {
      action: 'request_access_needed',
      nextSafeAction: 'Ask the file owner to grant Crewbert/AIOS access after owner identity is confirmed; no automated request email is sent in this slice.',
      blockerCard: DRIVE_ACCESS_REQUEST_CARD_ID,
    }
  }
  if (preflight.ownerAmbiguous) {
    return {
      action: 'owner_ambiguous',
      nextSafeAction: 'Confirm the original owner/organizer before any repair.',
      blockerCard: DRIVE_ACCESS_REQUEST_CARD_ID,
    }
  }
  if (preflight.proposedOperations?.length) {
    return {
      action: 'phase_b_approval_required',
      nextSafeAction: 'Review the dry-run hash and create a separate MEETING-VAULT-ACL-001 Phase B approval before any Drive mutation.',
      blockerCard: 'MEETING-VAULT-ACL-001',
    }
  }
  return {
    action: 'failed_closed',
    nextSafeAction: 'Investigate the preflight result before treating the file as safe.',
    blockerCard: DRIVE_ACCESS_REQUEST_CARD_ID,
  }
}

export function redactDriveProof(value) {
  if (Array.isArray(value)) return value.map(redactDriveProof)
  if (!value || typeof value !== 'object') return value
  const redacted = {}
  for (const [key, entry] of Object.entries(value)) {
    if (/^(fileId|permissionId|email|emailAddress|webViewLink|name|title|sourceUrl)$/i.test(key)) {
      redacted[`${key}Hash`] = hashProofValue(entry, key.toLowerCase())
      continue
    }
    redacted[key] = redactDriveProof(entry)
  }
  return redacted
}

function buildPreflightFromPermissions({
  fileId,
  sourceAccount,
  intendedActor,
  metadata,
  permissions,
  policy,
  purpose,
  sourceId,
  artifactId,
}) {
  const classifications = permissions.map(permission => classifyDrivePermission(permission, policy))
  const ownerPermissions = classifications.filter(classification => classification.category === 'owner')
  const crewbertPermissions = classifications.filter(classification =>
    (classification.category === 'crewbert' && classification.allowed) || classification.crewbertOwner
  )
  const unsafePermissions = classifications.filter(classification => classification.unsafe)
  const ownerAmbiguous = ownerPermissions.length !== 1
  const missingCrewbert = policy.requireCrewbert !== false && crewbertPermissions.length === 0
  const proposedOperations = []

  if (ownerAmbiguous) {
    proposedOperations.push({
      operationType: DRIVE_PERMISSION_OPERATION_TYPES.BLOCK_OWNER_AMBIGUOUS,
      reason: 'owner identity is not exactly one owner permission',
    })
  }
  if (missingCrewbert) {
    proposedOperations.push({
      operationType: policy.crewbertRole === 'writer'
        ? DRIVE_PERMISSION_OPERATION_TYPES.ADD_CREWBERT_WRITER
        : DRIVE_PERMISSION_OPERATION_TYPES.ADD_CREWBERT_READER,
      reason: 'crewbert system identity is missing',
    })
  }
  for (const unsafe of unsafePermissions) {
    proposedOperations.push({
      operationType: unsafe.operationType || DRIVE_PERMISSION_OPERATION_TYPES.REMOVE_UNSAFE_PERMISSION,
      reason: unsafe.reason,
      permissionHash: unsafe.permissionHash,
      permissionCategory: unsafe.category,
    })
  }

  const permissionSummary = buildPermissionSummary(classifications)
  const state = ownerAmbiguous
    ? DRIVE_ACCESS_PREFLIGHT_STATES.OWNER_AMBIGUOUS
    : proposedOperations.length
      ? DRIVE_ACCESS_PREFLIGHT_STATES.READABLE_REPAIRABLE
      : DRIVE_ACCESS_PREFLIGHT_STATES.READABLE_SAFE
  const preflight = {
    state,
    readable: true,
    supported: true,
    sourceId: sourceId || null,
    artifactId: artifactId || null,
    fileRefHash: hashProofValue(fileId, 'file'),
    sourceAccountHash: hashProofValue(sourceAccount, 'acct'),
    intendedActor: normalizeDriveActor(intendedActor || sourceAccount),
    ownerHash: ownerPermissions[0]?.emailHash || null,
    ownerAmbiguous,
    missingCrewbert,
    permissionSummary,
    proposedOperations,
    repairAuthority: null,
    accessRequestPlan: null,
    metadata: {
      purpose: purpose || 'drive_access_preflight',
      mimeType: metadata?.mimeType || null,
      modifiedTimePresent: Boolean(metadata?.modifiedTime),
      permissionClassifications: permissionSummary.categories,
    },
  }
  preflight.repairAuthority = classifyDriveRepairAuthority(preflight)
  preflight.accessRequestPlan = buildDriveAccessRequestPlan(preflight)
  return preflight
}

export async function buildDriveFilePreflight({
  fileId,
  intendedActor,
  sourceAccount,
  purpose = 'drive_access_preflight',
  sourceId = null,
  artifactId = null,
  policy: policyInput = {},
} = {}) {
  const normalizedFileId = String(fileId || '').trim()
  const normalizedSourceAccount = normalizeEmail(sourceAccount || intendedActor?.email || intendedActor || '')
  const policy = normalizeDriveAccessPolicy(policyInput)
  if (!normalizedFileId) {
    return {
      state: DRIVE_ACCESS_PREFLIGHT_STATES.UNSUPPORTED_FILE,
      readable: false,
      supported: false,
      fileRefHash: null,
      sourceAccountHash: normalizedSourceAccount ? hashProofValue(normalizedSourceAccount, 'acct') : null,
      ownerHash: null,
      ownerAmbiguous: true,
      missingCrewbert: true,
      permissionSummary: { total: 0, ownerCount: 0, crewbertCount: 0, unsafeCount: 0, writerOrOwnerCount: 0, categories: {} },
      proposedOperations: [],
      repairAuthority: { canRepair: false, reason: 'missing_file_id', state: DRIVE_ACCESS_PREFLIGHT_STATES.UNSUPPORTED_FILE },
      accessRequestPlan: {
        action: 'failed_closed',
        nextSafeAction: 'No file ID was available for this metadata-only preflight.',
        blockerCard: DRIVE_ACCESS_REQUEST_CARD_ID,
      },
      metadata: { purpose, errorClass: 'missing_file_id' },
    }
  }
  if (!normalizedSourceAccount) {
    return {
      state: DRIVE_ACCESS_PREFLIGHT_STATES.FAILED_CLOSED,
      readable: false,
      supported: true,
      fileRefHash: hashProofValue(normalizedFileId, 'file'),
      sourceAccountHash: null,
      ownerHash: null,
      ownerAmbiguous: true,
      missingCrewbert: true,
      permissionSummary: { total: 0, ownerCount: 0, crewbertCount: 0, unsafeCount: 0, writerOrOwnerCount: 0, categories: {} },
      proposedOperations: [{ operationType: DRIVE_PERMISSION_OPERATION_TYPES.REQUEST_ACCESS, reason: 'missing source account' }],
      repairAuthority: { canRepair: false, reason: 'missing_source_account', state: DRIVE_ACCESS_PREFLIGHT_STATES.FAILED_CLOSED },
      accessRequestPlan: {
        action: 'failed_closed',
        nextSafeAction: 'Resolve the delegated source account before reading Drive permissions.',
        blockerCard: DRIVE_ACCESS_REQUEST_CARD_ID,
      },
      metadata: { purpose, errorClass: 'missing_source_account' },
    }
  }

  try {
    const [metadata, permissions] = await Promise.all([
      getDriveFileMetadata(normalizedSourceAccount, normalizedFileId),
      listDrivePermissions(normalizedSourceAccount, normalizedFileId),
    ])
    return buildPreflightFromPermissions({
      fileId: normalizedFileId,
      sourceAccount: normalizedSourceAccount,
      intendedActor,
      metadata,
      permissions,
      policy,
      purpose,
      sourceId,
      artifactId,
    })
  } catch (error) {
    const errorClass = classifyGoogleError(error)
    const base = {
      state: errorClass.state,
      readable: false,
      supported: true,
      sourceId: sourceId || null,
      artifactId: artifactId || null,
      fileRefHash: hashProofValue(normalizedFileId, 'file'),
      sourceAccountHash: hashProofValue(normalizedSourceAccount, 'acct'),
      intendedActor: normalizeDriveActor(intendedActor || normalizedSourceAccount),
      ownerHash: null,
      ownerAmbiguous: true,
      missingCrewbert: true,
      permissionSummary: { total: 0, ownerCount: 0, crewbertCount: 0, unsafeCount: 0, writerOrOwnerCount: 0, categories: {} },
      proposedOperations: [{ operationType: DRIVE_PERMISSION_OPERATION_TYPES.REQUEST_ACCESS, reason: errorClass.state }],
      repairAuthority: { canRepair: false, reason: errorClass.state, state: errorClass.state },
      metadata: {
        purpose,
        errorClass: errorClass.state,
        googleStatus: errorClass.status,
      },
    }
    return {
      ...base,
      accessRequestPlan: buildDriveAccessRequestPlan(base),
    }
  }
}

export function buildSyntheticDriveAccessPreflightProof() {
  const policy = normalizeDriveAccessPolicy()
  const safe = buildPreflightFromPermissions({
    fileId: 'synthetic-safe-file',
    sourceAccount: 'owner@bensoncrew.ca',
    intendedActor: 'owner@bensoncrew.ca',
    metadata: { mimeType: 'application/vnd.google-apps.document', modifiedTime: '2026-05-09T00:00:00.000Z' },
    permissions: [
      { id: 'perm-owner', type: 'user', role: 'owner', emailAddress: 'owner@bensoncrew.ca' },
      { id: 'perm-crewbert', type: 'user', role: 'reader', emailAddress: policy.crewbertEmail },
    ],
    policy,
    purpose: 'synthetic_safe',
    sourceId: 'SRC-MEETINGS-001',
    artifactId: 'synthetic-safe-artifact',
  })
  const unsafe = buildPreflightFromPermissions({
    fileId: 'synthetic-unsafe-file',
    sourceAccount: 'owner@bensoncrew.ca',
    intendedActor: 'owner@bensoncrew.ca',
    metadata: { mimeType: 'application/vnd.google-apps.document', modifiedTime: '2026-05-09T00:00:00.000Z' },
    permissions: [
      { id: 'perm-owner', type: 'user', role: 'owner', emailAddress: 'owner@bensoncrew.ca' },
      { id: 'perm-ai', type: 'user', role: 'writer', emailAddress: policy.frontOfficeEmail },
      { id: 'perm-anyone', type: 'anyone', role: 'reader' },
    ],
    policy,
    purpose: 'synthetic_unsafe',
    sourceId: 'SRC-MEETINGS-001',
    artifactId: 'synthetic-unsafe-artifact',
  })
  const ambiguous = buildPreflightFromPermissions({
    fileId: 'synthetic-ambiguous-file',
    sourceAccount: 'reader@bensoncrew.ca',
    intendedActor: 'reader@bensoncrew.ca',
    metadata: { mimeType: 'application/vnd.google-apps.document', modifiedTime: '2026-05-09T00:00:00.000Z' },
    permissions: [
      { id: 'perm-reader', type: 'user', role: 'reader', emailAddress: 'reader@bensoncrew.ca' },
    ],
    policy,
    purpose: 'synthetic_ambiguous',
    sourceId: 'SRC-MEETINGS-001',
    artifactId: 'synthetic-ambiguous-artifact',
  })
  const missingAccess = {
    state: DRIVE_ACCESS_PREFLIGHT_STATES.REQUEST_ACCESS_REQUIRED,
    readable: false,
    supported: true,
    fileRefHash: hashProofValue('synthetic-missing-file', 'file'),
    sourceAccountHash: hashProofValue('reader@bensoncrew.ca', 'acct'),
    ownerHash: null,
    ownerAmbiguous: true,
    missingCrewbert: true,
    permissionSummary: { total: 0, ownerCount: 0, crewbertCount: 0, unsafeCount: 0, writerOrOwnerCount: 0, categories: {} },
    proposedOperations: [{ operationType: DRIVE_PERMISSION_OPERATION_TYPES.REQUEST_ACCESS, reason: 'request_access_required' }],
    repairAuthority: { canRepair: false, reason: 'request_access_required', state: DRIVE_ACCESS_PREFLIGHT_STATES.REQUEST_ACCESS_REQUIRED },
    accessRequestPlan: {
      action: 'request_access_needed',
      nextSafeAction: 'No email sent; operator approval required.',
      blockerCard: DRIVE_ACCESS_REQUEST_CARD_ID,
    },
    metadata: { purpose: 'synthetic_missing_access' },
  }

  return {
    ok: safe.state === DRIVE_ACCESS_PREFLIGHT_STATES.READABLE_SAFE &&
      unsafe.state === DRIVE_ACCESS_PREFLIGHT_STATES.READABLE_REPAIRABLE &&
      ambiguous.state === DRIVE_ACCESS_PREFLIGHT_STATES.OWNER_AMBIGUOUS &&
      missingAccess.state === DRIVE_ACCESS_PREFLIGHT_STATES.REQUEST_ACCESS_REQUIRED,
    fixtures: { safe, unsafe, ambiguous, missingAccess },
  }
}
