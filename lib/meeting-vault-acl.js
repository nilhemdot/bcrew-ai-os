import crypto from 'node:crypto'
import fs from 'node:fs'
import {
  DRIVE_ACCESS_PREFLIGHT_STATES,
  DRIVE_PERMISSION_OPERATION_TYPES,
  hashProofObject,
  hashProofValue,
} from './drive-access-preflight.js'

export const MEETING_VAULT_ACL_CARD_ID = 'MEETING-VAULT-ACL-001'
export const MEETING_VAULT_ACL_CLOSEOUT_KEY = 'meeting-vault-acl-v1'
export const MEETING_VAULT_ACL_PLAN_PATH = 'docs/process/meeting-vault-acl-001-plan.md'
export const MEETING_VAULT_ACL_DOC_PATH = 'docs/process/meeting-vault-acl.md'
export const MEETING_VAULT_ACL_APPROVAL_PATH = 'docs/process/approvals/MEETING-VAULT-ACL-001.json'
export const MEETING_VAULT_ACL_SCRIPT_PATH = 'scripts/process-meeting-vault-acl-check.mjs'
export const MEETING_VAULT_ACL_SUMMARY_MARKER = 'MEETING_VAULT_ACL_SUMMARY'
export const MEETING_VAULT_POLICY_VERSION = 'meeting-vault-acl-phase-a-v1'

export const MEETING_VAULT_ACL_STATES = {
  SAFE: 'safe',
  UNSAFE: 'unsafe',
  MISSING_CREWBERT: 'missing_crewbert',
  MISSING_ACCESS: 'missing_access',
  OWNER_AMBIGUOUS: 'owner_ambiguous',
  BLOCKED: 'blocked',
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

function normalizeArray(value) {
  if (!Array.isArray(value)) return []
  return value.map(item => String(item || '').trim()).filter(Boolean)
}

function pushFileRef(refs, rawFileId, fields = {}) {
  const fileId = String(rawFileId || '').trim()
  if (!fileId) return
  refs.push({
    fileId,
    fileRefHash: hashProofValue(fileId, 'file'),
    ...fields,
  })
}

export function extractMeetingRawFileRefsFromArtifact(artifact = {}) {
  const metadata = artifact.metadata || {}
  const refs = []
  const base = {
    sourceId: artifact.sourceId || 'SRC-MEETINGS-001',
    artifactId: artifact.artifactId || null,
    artifactType: artifact.artifactType || null,
    sourceAccount: metadata.primarySourceAccount || artifact.sourceAccount || null,
    meetingClass: metadata.meetingClass || null,
    privacyProfile: metadata.privacyProfile || null,
    sourceKind: 'shared_communication_artifact',
  }
  pushFileRef(refs, metadata.primaryFileId, { ...base, refKind: 'primary' })
  pushFileRef(refs, metadata.noteExternalId, { ...base, refKind: 'note_external' })
  for (const fileId of normalizeArray(metadata.noteFileIds)) {
    pushFileRef(refs, fileId, { ...base, refKind: 'note_observed' })
  }
  for (const fileId of normalizeArray(metadata.transcriptFileIds)) {
    pushFileRef(refs, fileId, { ...base, refKind: 'transcript_observed' })
  }
  for (const fileId of normalizeArray(metadata.observedFileIds)) {
    pushFileRef(refs, fileId, { ...base, refKind: 'observed' })
  }
  return refs
}

export function extractMeetingRawFileRefsFromCrawlItem(item = {}) {
  const metadata = item.metadata || {}
  const refs = []
  const base = {
    sourceId: item.sourceId || 'SRC-MEETINGS-001',
    artifactId: item.artifactId || null,
    artifactType: 'source_crawl_item',
    sourceAccount: normalizeArray(metadata.observedAccounts)[0] || null,
    meetingClass: metadata.meetingClass || null,
    privacyProfile: metadata.privacyProfile || null,
    sourceKind: 'source_crawl_item',
    crawlItemKeyHash: item.itemKey ? hashProofValue(item.itemKey, 'crawlitem') : null,
  }
  pushFileRef(refs, metadata.noteFileId, { ...base, refKind: 'note_crawl_item' })
  pushFileRef(refs, metadata.transcriptFileId, { ...base, refKind: 'transcript_crawl_item' })
  for (const fileId of normalizeArray(metadata.noteFileIds)) {
    pushFileRef(refs, fileId, { ...base, refKind: 'note_crawl_item_list' })
  }
  for (const fileId of normalizeArray(metadata.transcriptFileIds)) {
    pushFileRef(refs, fileId, { ...base, refKind: 'transcript_crawl_item_list' })
  }
  return refs
}

export function buildMeetingRawFileInventory({ artifacts = [], crawlItems = [], limit = 5000 } = {}) {
  const refs = []
  for (const artifact of artifacts) refs.push(...extractMeetingRawFileRefsFromArtifact(artifact))
  for (const item of crawlItems) refs.push(...extractMeetingRawFileRefsFromCrawlItem(item))

  const byFileId = new Map()
  for (const ref of refs) {
    if (!ref.fileId) continue
    const existing = byFileId.get(ref.fileId)
    if (!existing) {
      byFileId.set(ref.fileId, {
        ...ref,
        evidenceRefs: [{
          sourceKind: ref.sourceKind,
          artifactId: ref.artifactId,
          artifactType: ref.artifactType,
          refKind: ref.refKind,
          crawlItemKeyHash: ref.crawlItemKeyHash || null,
        }],
      })
      continue
    }
    if (!existing.sourceAccount && ref.sourceAccount) existing.sourceAccount = ref.sourceAccount
    if (!existing.meetingClass && ref.meetingClass) existing.meetingClass = ref.meetingClass
    if (!existing.privacyProfile && ref.privacyProfile) existing.privacyProfile = ref.privacyProfile
    existing.evidenceRefs.push({
      sourceKind: ref.sourceKind,
      artifactId: ref.artifactId,
      artifactType: ref.artifactType,
      refKind: ref.refKind,
      crawlItemKeyHash: ref.crawlItemKeyHash || null,
    })
  }

  const items = [...byFileId.values()]
    .sort((left, right) => String(left.fileRefHash).localeCompare(String(right.fileRefHash)))
    .slice(0, Math.max(1, Number(limit) || 5000))

  return {
    totalCandidates: byFileId.size,
    returnedCandidates: items.length,
    complete: items.length === byFileId.size,
    items,
  }
}

export function buildMeetingAclPolicy(file = {}, artifact = {}) {
  return {
    policyVersion: MEETING_VAULT_POLICY_VERSION,
    strictOwnerPlusCrewbert: true,
    crewbertRole: 'reader',
    meetingClass: file.meetingClass || artifact.meetingClass || 'discussion',
    privacyProfile: file.privacyProfile || artifact.privacyProfile || 'subject_redaction',
    phase: 'phase_a_dry_run',
    mutationApproved: false,
  }
}

export function classifyMeetingRawFileAcl(file = {}, preflight = {}, policy = buildMeetingAclPolicy(file)) {
  const proposedOperations = Array.isArray(preflight.proposedOperations) ? preflight.proposedOperations : []
  const permissionSummary = preflight.permissionSummary || {}
  const missingAccess = !preflight.readable ||
    preflight.state === DRIVE_ACCESS_PREFLIGHT_STATES.MISSING_ACCESS ||
    preflight.state === DRIVE_ACCESS_PREFLIGHT_STATES.REQUEST_ACCESS_REQUIRED
  const ownerAmbiguous = Boolean(preflight.ownerAmbiguous) ||
    preflight.state === DRIVE_ACCESS_PREFLIGHT_STATES.OWNER_AMBIGUOUS
  const missingCrewbert = Boolean(preflight.missingCrewbert)
  const unsafeShareCount = Number(permissionSummary.unsafeCount || 0)

  let state = MEETING_VAULT_ACL_STATES.SAFE
  const blockerReasons = []

  if (missingAccess) {
    state = MEETING_VAULT_ACL_STATES.MISSING_ACCESS
    blockerReasons.push('request_access_needed')
  } else if (ownerAmbiguous) {
    state = MEETING_VAULT_ACL_STATES.OWNER_AMBIGUOUS
    blockerReasons.push('owner_ambiguous')
  } else if (missingCrewbert) {
    state = MEETING_VAULT_ACL_STATES.MISSING_CREWBERT
    blockerReasons.push('crewbert_missing')
  } else if (unsafeShareCount > 0) {
    state = MEETING_VAULT_ACL_STATES.UNSAFE
    blockerReasons.push('unsafe_share_detected')
  } else if (preflight.state && preflight.state !== DRIVE_ACCESS_PREFLIGHT_STATES.READABLE_SAFE) {
    state = MEETING_VAULT_ACL_STATES.BLOCKED
    blockerReasons.push(preflight.state)
  }

  const operationTypes = proposedOperations
    .map(operation => operation.operationType)
    .filter(Boolean)
  const requiresPhaseB = [
    MEETING_VAULT_ACL_STATES.UNSAFE,
    MEETING_VAULT_ACL_STATES.MISSING_CREWBERT,
  ].includes(state)

  return {
    state,
    safe: state === MEETING_VAULT_ACL_STATES.SAFE,
    requiresPhaseB,
    blockerCard: state === MEETING_VAULT_ACL_STATES.SAFE ? null : MEETING_VAULT_ACL_CARD_ID,
    blockerReasons,
    fileRefHash: file.fileRefHash || preflight.fileRefHash || null,
    ownerHash: preflight.ownerHash || null,
    sourceAccountHash: preflight.sourceAccountHash || null,
    permissionSummary: {
      total: Number(permissionSummary.total || 0),
      ownerCount: Number(permissionSummary.ownerCount || 0),
      crewbertCount: Number(permissionSummary.crewbertCount || 0),
      unsafeCount: Number(permissionSummary.unsafeCount || 0),
      writerOrOwnerCount: Number(permissionSummary.writerOrOwnerCount || 0),
    },
    proposedOperations: operationTypes.map(operationType => ({ operationType })),
    policy: {
      policyVersion: policy.policyVersion || MEETING_VAULT_POLICY_VERSION,
      phase: 'phase_a_dry_run',
      mutationApproved: false,
      strictOwnerPlusCrewbert: true,
    },
  }
}

function countOperationTypes(classifications) {
  const counts = {}
  for (const classification of classifications) {
    for (const operation of classification.proposedOperations || []) {
      counts[operation.operationType] = (counts[operation.operationType] || 0) + 1
    }
  }
  return counts
}

function summarizeStates(classifications) {
  const counts = {}
  for (const classification of classifications) {
    counts[classification.state] = (counts[classification.state] || 0) + 1
  }
  return counts
}

export function buildMeetingAclDryRunPlan(classifications = []) {
  const normalizedClassifications = classifications.map(item => ({
    state: item.state,
    fileRefHash: item.fileRefHash,
    ownerHash: item.ownerHash || null,
    sourceAccountHash: item.sourceAccountHash || null,
    permissionSummary: item.permissionSummary,
    proposedOperations: item.proposedOperations || [],
    blockerReasons: item.blockerReasons || [],
  }))
  const stateCounts = summarizeStates(normalizedClassifications)
  const proposedOperationTypes = countOperationTypes(normalizedClassifications)
  const unsafeCount = normalizedClassifications.filter(item =>
    Number(item.permissionSummary?.unsafeCount || 0) > 0
  ).length
  const unsafePermissionCount = normalizedClassifications.reduce(
    (total, item) => total + Number(item.permissionSummary?.unsafeCount || 0),
    0,
  )
  const missingCrewbertCount = Number(stateCounts[MEETING_VAULT_ACL_STATES.MISSING_CREWBERT] || 0)
  const missingAccessCount = Number(stateCounts[MEETING_VAULT_ACL_STATES.MISSING_ACCESS] || 0)
  const ownerAmbiguousCount = Number(stateCounts[MEETING_VAULT_ACL_STATES.OWNER_AMBIGUOUS] || 0)
  const blockedCount = Number(stateCounts[MEETING_VAULT_ACL_STATES.BLOCKED] || 0)
  const safeCount = Number(stateCounts[MEETING_VAULT_ACL_STATES.SAFE] || 0)
  const phaseBRequired = unsafeCount + missingCrewbertCount > 0
  const blockerReasons = [...new Set(normalizedClassifications.flatMap(item => item.blockerReasons || []))]
  const dryRunInput = {
    policyVersion: MEETING_VAULT_POLICY_VERSION,
    classifications: normalizedClassifications,
    stateCounts,
    proposedOperationTypes,
  }
  const dryRunHash = sha256(stableStringify(dryRunInput))
  return {
    policyVersion: MEETING_VAULT_POLICY_VERSION,
    dryRunHash,
    fileCount: normalizedClassifications.length,
    safeCount,
    unsafeCount,
    unsafePermissionCount,
    missingCrewbertCount,
    missingAccessCount,
    ownerAmbiguousCount,
    blockedCount,
    stateCounts,
    proposedOperationTypes,
    phaseBRequired,
    blockerReasons,
    exactApprovalNeeded: phaseBRequired
      ? `Separate MEETING-VAULT-ACL-001 Phase B permission-mutation approval tied to dry-run hash ${dryRunHash}.`
      : blockerReasons.length
        ? 'Resolve missing access, owner ambiguity, inherited permission, or incomplete inventory blockers, then rerun Phase A before any Phase B approval can be valid.'
        : '',
  }
}

export function assertMeetingAclMutationApproved({ approvalRef, dryRunHash, fileId, operation } = {}) {
  const normalizedApprovalRef = String(approvalRef || '').trim()
  if (!normalizedApprovalRef) {
    throw new Error('MEETING-VAULT-ACL-001 Phase B approval is required before any Drive permission mutation.')
  }
  if (!fs.existsSync(normalizedApprovalRef)) {
    throw new Error(`MEETING-VAULT-ACL-001 Phase B approval file is missing: ${normalizedApprovalRef}`)
  }
  if (!String(dryRunHash || '').trim()) {
    throw new Error('MEETING-VAULT-ACL-001 Phase B approval must be tied to a Phase A dry-run hash.')
  }
  if (!String(fileId || '').trim()) {
    throw new Error('MEETING-VAULT-ACL-001 Phase B apply requires an exact file ID from the approved local manifest.')
  }
  if (!operation?.operationType) {
    throw new Error('MEETING-VAULT-ACL-001 Phase B apply requires an exact operation from the approved local manifest.')
  }
  return true
}

export function buildMeetingAclRollbackPlan(appliedOperation = {}) {
  return {
    rollbackAvailable: Boolean(appliedOperation?.operationType),
    operationType: appliedOperation?.operationType || null,
    operationHash: hashProofObject(appliedOperation || {}, 'op'),
    metadataOnly: true,
  }
}

export function buildMeetingVaultAclStatus(snapshot = {}) {
  const dryRunPlan = snapshot.dryRunPlan || {}
  const inventoryComplete = snapshot.inventoryComplete !== false
  const phaseAComplete = Boolean(snapshot.phaseAComplete)
  const allSafe = dryRunPlan.fileCount > 0 &&
    inventoryComplete &&
    Number(dryRunPlan.safeCount || 0) === Number(dryRunPlan.fileCount || 0) &&
    Number(dryRunPlan.unsafeCount || 0) === 0 &&
    Number(dryRunPlan.missingCrewbertCount || 0) === 0 &&
    Number(dryRunPlan.missingAccessCount || 0) === 0 &&
    Number(dryRunPlan.ownerAmbiguousCount || 0) === 0 &&
    Number(dryRunPlan.blockedCount || 0) === 0
  const blocked = !allSafe
  const status = allSafe
    ? 'safe'
    : dryRunPlan.phaseBRequired
      ? 'blocked_phase_b_required'
      : 'blocked_phase_a_unproven'
  return {
    status,
    cardCanClose: allSafe && phaseAComplete,
    phaseAComplete,
    phaseBApproved: false,
    allSafe,
    blocked,
    blockerCard: blocked ? MEETING_VAULT_ACL_CARD_ID : null,
    blockerReason: blocked
      ? (inventoryComplete ? 'phase_a_found_unsafe_missing_or_ambiguous_files' : 'phase_a_inventory_incomplete')
      : '',
    dryRunHash: dryRunPlan.dryRunHash || null,
    counts: {
      fileCount: Number(dryRunPlan.fileCount || 0),
      safeCount: Number(dryRunPlan.safeCount || 0),
      unsafeCount: Number(dryRunPlan.unsafeCount || 0),
      unsafePermissionCount: Number(dryRunPlan.unsafePermissionCount || 0),
      missingCrewbertCount: Number(dryRunPlan.missingCrewbertCount || 0),
      missingAccessCount: Number(dryRunPlan.missingAccessCount || 0),
      ownerAmbiguousCount: Number(dryRunPlan.ownerAmbiguousCount || 0),
      blockedCount: Number(dryRunPlan.blockedCount || 0),
    },
    proposedOperationTypes: dryRunPlan.proposedOperationTypes || {},
    exactApprovalNeeded: dryRunPlan.exactApprovalNeeded || '',
  }
}

export function buildSyntheticMeetingVaultAclProof() {
  const safe = classifyMeetingRawFileAcl(
    { fileRefHash: hashProofValue('synthetic-safe-file', 'file') },
    {
      state: DRIVE_ACCESS_PREFLIGHT_STATES.READABLE_SAFE,
      readable: true,
      fileRefHash: hashProofValue('synthetic-safe-file', 'file'),
      ownerHash: hashProofValue('owner@bensoncrew.ca', 'acct'),
      sourceAccountHash: hashProofValue('owner@bensoncrew.ca', 'acct'),
      ownerAmbiguous: false,
      missingCrewbert: false,
      permissionSummary: { total: 2, ownerCount: 1, crewbertCount: 1, unsafeCount: 0, writerOrOwnerCount: 1 },
      proposedOperations: [],
    },
  )
  const missingCrewbert = classifyMeetingRawFileAcl(
    { fileRefHash: hashProofValue('synthetic-missing-crewbert-file', 'file') },
    {
      state: DRIVE_ACCESS_PREFLIGHT_STATES.READABLE_REPAIRABLE,
      readable: true,
      fileRefHash: hashProofValue('synthetic-missing-crewbert-file', 'file'),
      ownerHash: hashProofValue('owner@bensoncrew.ca', 'acct'),
      sourceAccountHash: hashProofValue('owner@bensoncrew.ca', 'acct'),
      ownerAmbiguous: false,
      missingCrewbert: true,
      permissionSummary: { total: 1, ownerCount: 1, crewbertCount: 0, unsafeCount: 0, writerOrOwnerCount: 1 },
      proposedOperations: [{ operationType: DRIVE_PERMISSION_OPERATION_TYPES.ADD_CREWBERT_READER }],
    },
  )
  const unsafe = classifyMeetingRawFileAcl(
    { fileRefHash: hashProofValue('synthetic-unsafe-file', 'file') },
    {
      state: DRIVE_ACCESS_PREFLIGHT_STATES.READABLE_REPAIRABLE,
      readable: true,
      fileRefHash: hashProofValue('synthetic-unsafe-file', 'file'),
      ownerHash: hashProofValue('owner@bensoncrew.ca', 'acct'),
      sourceAccountHash: hashProofValue('owner@bensoncrew.ca', 'acct'),
      ownerAmbiguous: false,
      missingCrewbert: false,
      permissionSummary: { total: 3, ownerCount: 1, crewbertCount: 1, unsafeCount: 1, writerOrOwnerCount: 1 },
      proposedOperations: [{ operationType: DRIVE_PERMISSION_OPERATION_TYPES.REMOVE_UNSAFE_PERMISSION }],
    },
  )
  const ownerAmbiguous = classifyMeetingRawFileAcl(
    { fileRefHash: hashProofValue('synthetic-owner-ambiguous-file', 'file') },
    {
      state: DRIVE_ACCESS_PREFLIGHT_STATES.OWNER_AMBIGUOUS,
      readable: true,
      fileRefHash: hashProofValue('synthetic-owner-ambiguous-file', 'file'),
      ownerHash: null,
      sourceAccountHash: hashProofValue('reader@bensoncrew.ca', 'acct'),
      ownerAmbiguous: true,
      missingCrewbert: true,
      permissionSummary: { total: 1, ownerCount: 0, crewbertCount: 0, unsafeCount: 1, writerOrOwnerCount: 0 },
      proposedOperations: [{ operationType: DRIVE_PERMISSION_OPERATION_TYPES.BLOCK_OWNER_AMBIGUOUS }],
    },
  )
  const dryRunPlan = buildMeetingAclDryRunPlan([safe, missingCrewbert, unsafe, ownerAmbiguous])
  const status = buildMeetingVaultAclStatus({
    inventoryComplete: true,
    phaseAComplete: true,
    dryRunPlan,
  })
  return {
    ok: safe.safe &&
      missingCrewbert.state === MEETING_VAULT_ACL_STATES.MISSING_CREWBERT &&
      unsafe.state === MEETING_VAULT_ACL_STATES.UNSAFE &&
      ownerAmbiguous.state === MEETING_VAULT_ACL_STATES.OWNER_AMBIGUOUS &&
      status.status === 'blocked_phase_b_required' &&
      Boolean(dryRunPlan.dryRunHash),
    fixtures: { safe, missingCrewbert, unsafe, ownerAmbiguous },
    dryRunPlan,
    status,
  }
}
