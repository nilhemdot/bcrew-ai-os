import crypto from 'node:crypto'
import fs from 'node:fs'
import {
  DRIVE_ACCESS_PREFLIGHT_STATES,
  DRIVE_PERMISSION_OPERATION_TYPES,
  hashProofObject,
  hashProofValue,
} from './drive-access-preflight.js'
import { classifyMeetingShape } from './meeting-classification.js'
import { normalizeMeetingArtifactKey } from './meeting-transcripts.js'

export const MEETING_VAULT_ACL_CARD_ID = 'MEETING-VAULT-ACL-001'
export const MEETING_VAULT_ACL_CLOSEOUT_KEY = 'meeting-vault-acl-v1'
export const MEETING_VAULT_ACL_PLAN_PATH = 'docs/process/meeting-vault-acl-001-plan.md'
export const MEETING_VAULT_ACL_DOC_PATH = 'docs/process/meeting-vault-acl.md'
export const MEETING_VAULT_ACL_APPROVAL_PATH = 'docs/process/approvals/MEETING-VAULT-ACL-001.json'
export const MEETING_VAULT_ACL_SCRIPT_PATH = 'scripts/process-meeting-vault-acl-check.mjs'
export const MEETING_VAULT_ACL_SUMMARY_MARKER = 'MEETING_VAULT_ACL_SUMMARY'
export const MEETING_VAULT_POLICY_VERSION = 'meeting-vault-acl-phase-a-source-truth-v2'
export const MEETING_VAULT_NO_DUPLICATE_GOOGLE_DOC_RULE = 'meeting-vault-no-duplicate-google-docs-v1'

export const MEETING_VAULT_ACL_STATES = {
  SAFE: 'safe',
  UNSAFE: 'unsafe',
  MISSING_CREWBERT: 'missing_crewbert',
  MISSING_ACCESS: 'missing_access',
  OWNER_AMBIGUOUS: 'owner_ambiguous',
  BLOCKED: 'blocked',
}

export const MEETING_VAULT_SENSITIVITY_CLASSES = {
  PROTECTED: 'protected_sensitive',
  STANDARD_INTERNAL: 'standard_internal',
  BROAD_NON_SENSITIVE: 'broad_non_sensitive',
  UNKNOWN: 'unknown_unclassified',
}

export const MEETING_VAULT_SOURCE_FILE_ROLES = {
  ORIGINAL: 'original_gemini_note',
  LEGACY_CREWBERT_COPY: 'legacy_crewbert_duplicate_copy',
  ORIGINAL_MISSING: 'original_gemini_note_missing',
  UNKNOWN: 'unknown_raw_file',
}

const PROTECTED_CANDIDATE_SENSITIVITIES = new Set([
  'performance_concern',
  'termination_risk',
  'comp_discussion',
  'undisclosed_feedback',
])

const PROTECTED_MEETING_SIGNAL_PATTERNS = [
  /\bowners?\b/i,
  /\bleadership\b/i,
  /\b1[: ]1\b/i,
  /\bone[- ]on[- ]one\b/i,
  /\bexec(?:utive)?\b/i,
  /\bperformance\b/i,
  /\btermination\b/i,
  /\bcomp(?:ensation)?\b/i,
  /\bpayroll\b/i,
  /\bundisclosed[- ]feedback\b/i,
  /\bnamed[- ]person\b/i,
  /\blegal\b/i,
  /\bhr\b/i,
]

const BROAD_MEETING_SIGNAL_PATTERNS = [
  /\ball[- ]hands\b/i,
  /\btraining\b/i,
  /\bworkshops?\b/i,
  /\bhuddles?\b/i,
  /\bsales sessions?\b/i,
  /\bsales training\b/i,
  /\bbroad team\b/i,
  /\bteam meeting\b/i,
  /\bmasterclass\b/i,
  /\bbootcamp\b/i,
]

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

function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function normalizeBoolean(value) {
  if (value === true || value === false) return value
  const normalized = String(value ?? '').trim().toLowerCase()
  if (['true', 'yes', '1'].includes(normalized)) return true
  if (['false', 'no', '0'].includes(normalized)) return false
  return false
}

function normalizeCount(value) {
  const count = Number(value || 0)
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0
}

function sourceIncludesAll(source, markers = []) {
  return markers.every(marker => String(source || '').includes(marker))
}

function normalizeSensitivityClass(value) {
  const normalized = String(value || '').trim()
  return Object.values(MEETING_VAULT_SENSITIVITY_CLASSES).includes(normalized)
    ? normalized
    : ''
}

function meetingSignalStrings(record = {}) {
  const metadata = normalizeObject(record.metadata)
  return [
    record.title,
    record.meetingKey,
    record.externalId,
    record.query,
    record.fileName,
    metadata.meetingKey,
    metadata.query,
    metadata.noteTitle,
    metadata.transcriptTitle,
    metadata.title,
    metadata.fileName,
    metadata.meetingFolderName,
  ].map(value => String(value || '').trim()).filter(Boolean)
}

function patternMatchesAny(patterns, values) {
  return values.some(value => patterns.some(pattern => pattern.test(value)))
}

function normalizeCandidateSignals(value = {}) {
  const signals = normalizeObject(value)
  const sensitivityCounts = normalizeObject(signals.sensitivityCounts)
  const protectedFromCounts = Object.entries(sensitivityCounts)
    .filter(([sensitivity]) => PROTECTED_CANDIDATE_SENSITIVITIES.has(String(sensitivity || '').trim()))
    .reduce((total, [, count]) => total + normalizeCount(count), 0)
  return {
    candidateCount: normalizeCount(signals.candidateCount),
    protectedCandidateCount: normalizeCount(signals.protectedCandidateCount) || protectedFromCounts,
    subjectPeopleCandidateCount: normalizeCount(signals.subjectPeopleCandidateCount),
    minTierOneCandidateCount: normalizeCount(signals.minTierOneCandidateCount),
    sensitivityCounts,
  }
}

function mergeCandidateSignals(left = {}, right = {}) {
  const normalizedLeft = normalizeCandidateSignals(left)
  const normalizedRight = normalizeCandidateSignals(right)
  const sensitivityCounts = { ...normalizedLeft.sensitivityCounts }
  for (const [sensitivity, count] of Object.entries(normalizedRight.sensitivityCounts)) {
    sensitivityCounts[sensitivity] = normalizeCount(sensitivityCounts[sensitivity]) + normalizeCount(count)
  }
  return normalizeCandidateSignals({
    candidateCount: normalizedLeft.candidateCount + normalizedRight.candidateCount,
    protectedCandidateCount: normalizedLeft.protectedCandidateCount + normalizedRight.protectedCandidateCount,
    subjectPeopleCandidateCount: normalizedLeft.subjectPeopleCandidateCount + normalizedRight.subjectPeopleCandidateCount,
    minTierOneCandidateCount: normalizedLeft.minTierOneCandidateCount + normalizedRight.minTierOneCandidateCount,
    sensitivityCounts,
  })
}

function rankSensitivityClass(sensitivityClass) {
  switch (sensitivityClass) {
    case MEETING_VAULT_SENSITIVITY_CLASSES.PROTECTED:
      return 4
    case MEETING_VAULT_SENSITIVITY_CLASSES.STANDARD_INTERNAL:
      return 3
    case MEETING_VAULT_SENSITIVITY_CLASSES.BROAD_NON_SENSITIVE:
      return 2
    case MEETING_VAULT_SENSITIVITY_CLASSES.UNKNOWN:
      return 1
    default:
      return 0
  }
}

function mergeSensitivityClass(left = {}, right = {}) {
  const leftClass = normalizeSensitivityClass(left.sensitivityClass) || MEETING_VAULT_SENSITIVITY_CLASSES.UNKNOWN
  const rightClass = normalizeSensitivityClass(right.sensitivityClass) || MEETING_VAULT_SENSITIVITY_CLASSES.UNKNOWN
  return rankSensitivityClass(rightClass) > rankSensitivityClass(leftClass) ? right : left
}

function normalizeMeetingKeyFromRecord(record = {}) {
  const metadata = normalizeObject(record.metadata)
  return normalizeMeetingArtifactKey(
    metadata.meetingKey ||
      record.meetingKey ||
      metadata.noteTitle ||
      metadata.transcriptTitle ||
      record.title ||
      metadata.title ||
      record.externalId ||
      '',
  )
}

function classificationEvidenceRank(ref = {}) {
  let rank = 0
  if (ref.archiveVersion === 'meeting_archive_v2') rank += 100
  if (ref.meetingClass && ref.privacyProfile) rank += 50
  if (ref.refKind === 'primary' || ref.refKind === 'note_external') rank += 10
  if (ref.title || ref.fileName || ref.meetingKey) rank += 5
  return rank
}

function recomputeMergedSensitivity(target = {}) {
  const vaultSensitivity = classifyMeetingVaultSensitivity({
    ...target,
    metadata: {
      meetingClass: target.meetingClass,
      privacyProfile: target.privacyProfile,
      sensitiveMeetingCandidate: target.sensitiveMeetingCandidate,
      meetingKey: target.meetingKey,
      fileName: target.fileName,
      title: target.title,
    },
    candidateSignals: target.candidateSignals,
  })
  target.sensitivityClass = vaultSensitivity.sensitivityClass
  target.sensitivityReason = vaultSensitivity.sensitivityReason
  target.candidateSignals = vaultSensitivity.candidateSignals
  return target
}

export function classifyMeetingVaultSensitivity(record = {}) {
  const metadata = normalizeObject(record.metadata)
  const candidateSignals = normalizeCandidateSignals(record.candidateSignals || record.sensitivitySignals || metadata.candidateSignals || metadata.sensitivitySignals)
  const explicitSensitivityClass = normalizeSensitivityClass(record.sensitivityClass || metadata.sensitivityClass)
  if (explicitSensitivityClass) {
    return {
      sensitivityClass: explicitSensitivityClass,
      sensitivityReason: String(record.sensitivityReason || metadata.sensitivityReason || 'explicit_sensitivity_class').trim(),
      candidateSignals,
      classified: explicitSensitivityClass !== MEETING_VAULT_SENSITIVITY_CLASSES.UNKNOWN,
    }
  }
  const meetingClass = String(record.meetingClass || metadata.meetingClass || '').trim()
  const privacyProfile = String(record.privacyProfile || metadata.privacyProfile || '').trim()
  const sensitiveMeetingCandidate = normalizeBoolean(record.sensitiveMeetingCandidate ?? metadata.sensitiveMeetingCandidate)
  const signalStrings = meetingSignalStrings(record)
  const realSensitiveCandidateSignal = candidateSignals.protectedCandidateCount > 0 ||
    candidateSignals.subjectPeopleCandidateCount > 0
  const protectedMeetingSignal = sensitiveMeetingCandidate ||
    privacyProfile === 'sensitive_discussion' ||
    patternMatchesAny(PROTECTED_MEETING_SIGNAL_PATTERNS, signalStrings)
  const broadMeetingSignal = (meetingClass === 'broadcast' && privacyProfile === 'baseline') ||
    patternMatchesAny(BROAD_MEETING_SIGNAL_PATTERNS, signalStrings)

  if (broadMeetingSignal && !realSensitiveCandidateSignal && !protectedMeetingSignal) {
    const shape = classifyMeetingShape({ title: signalStrings.join(' ') })
    return {
      sensitivityClass: MEETING_VAULT_SENSITIVITY_CLASSES.BROAD_NON_SENSITIVE,
      sensitivityReason: meetingClass === 'broadcast' && privacyProfile === 'baseline'
        ? 'broadcast_baseline_metadata'
        : shape.meetingClass === 'broadcast'
          ? 'broad_meeting_signal'
          : 'broad_meeting_doctrine_signal',
      candidateSignals,
      classified: true,
    }
  }

  if (
    realSensitiveCandidateSignal ||
    candidateSignals.minTierOneCandidateCount > 0 ||
    protectedMeetingSignal
  ) {
    return {
      sensitivityClass: MEETING_VAULT_SENSITIVITY_CLASSES.PROTECTED,
      sensitivityReason: realSensitiveCandidateSignal
        ? 'candidate_sensitive_or_subject_person_signal'
        : candidateSignals.minTierOneCandidateCount > 0
          ? 'candidate_min_tier_signal'
          : 'meeting_privacy_or_title_signal',
      candidateSignals,
      classified: true,
    }
  }

  if (meetingClass || privacyProfile) {
    return {
      sensitivityClass: MEETING_VAULT_SENSITIVITY_CLASSES.STANDARD_INTERNAL,
      sensitivityReason: 'classified_internal_meeting_without_sensitive_signal',
      candidateSignals,
      classified: true,
    }
  }

  return {
    sensitivityClass: MEETING_VAULT_SENSITIVITY_CLASSES.UNKNOWN,
    sensitivityReason: 'missing_meeting_sensitivity_classification',
    candidateSignals,
    classified: false,
  }
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
  const vaultSensitivity = classifyMeetingVaultSensitivity({
    ...artifact,
    candidateSignals: artifact.sensitivitySignals || artifact.candidateSignals,
  })
  const refs = []
  const meetingKey = normalizeMeetingKeyFromRecord(artifact)
  const base = {
    sourceId: artifact.sourceId || 'SRC-MEETINGS-001',
    artifactId: artifact.artifactId || null,
    artifactType: artifact.artifactType || null,
    externalId: artifact.externalId || null,
    title: artifact.title || metadata.noteTitle || metadata.transcriptTitle || null,
    sourceAccount: metadata.primarySourceAccount || artifact.sourceAccount || null,
    sourceContainer: artifact.sourceContainer || null,
    archiveVersion: metadata.archiveVersion || null,
    meetingKey,
    meetingClass: metadata.meetingClass || null,
    privacyProfile: metadata.privacyProfile || null,
    sensitiveMeetingCandidate: normalizeBoolean(metadata.sensitiveMeetingCandidate),
    sensitivityClass: vaultSensitivity.sensitivityClass,
    sensitivityReason: vaultSensitivity.sensitivityReason,
    candidateSignals: vaultSensitivity.candidateSignals,
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
  const vaultSensitivity = classifyMeetingVaultSensitivity(item)
  const refs = []
  const meetingKey = normalizeMeetingKeyFromRecord(item)
  const base = {
    sourceId: item.sourceId || 'SRC-MEETINGS-001',
    artifactId: item.artifactId || null,
    artifactType: 'source_crawl_item',
    externalId: item.externalId || null,
    title: metadata.noteTitle || metadata.transcriptTitle || null,
    sourceAccount: normalizeArray(metadata.observedAccounts)[0] || null,
    sourceContainer: 'source_crawl_items',
    archiveVersion: metadata.archiveVersion || null,
    meetingKey,
    meetingClass: metadata.meetingClass || null,
    privacyProfile: metadata.privacyProfile || null,
    sensitiveMeetingCandidate: normalizeBoolean(metadata.sensitiveMeetingCandidate),
    sensitivityClass: vaultSensitivity.sensitivityClass,
    sensitivityReason: vaultSensitivity.sensitivityReason,
    candidateSignals: vaultSensitivity.candidateSignals,
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
        classificationRank: classificationEvidenceRank(ref),
        sourceFileRole: MEETING_VAULT_SOURCE_FILE_ROLES.UNKNOWN,
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
    if (!existing.sourceContainer && ref.sourceContainer) existing.sourceContainer = ref.sourceContainer
    if (!existing.archiveVersion && ref.archiveVersion) existing.archiveVersion = ref.archiveVersion
    if (!existing.meetingKey && ref.meetingKey) existing.meetingKey = ref.meetingKey
    const refRank = classificationEvidenceRank(ref)
    if (refRank > Number(existing.classificationRank || 0)) {
      existing.classificationRank = refRank
      existing.title = ref.title || existing.title || null
      existing.externalId = ref.externalId || existing.externalId || null
      existing.meetingKey = ref.meetingKey || existing.meetingKey || null
      existing.meetingClass = ref.meetingClass || null
      existing.privacyProfile = ref.privacyProfile || null
      existing.sensitiveMeetingCandidate = ref.sensitiveMeetingCandidate
      existing.sensitivityClass = ref.sensitivityClass
      existing.sensitivityReason = ref.sensitivityReason
    } else if (refRank === Number(existing.classificationRank || 0)) {
      const mergedSensitivity = mergeSensitivityClass(existing, ref)
      existing.sensitivityClass = mergedSensitivity.sensitivityClass
      existing.sensitivityReason = mergedSensitivity.sensitivityReason
      if (!existing.meetingClass && ref.meetingClass) existing.meetingClass = ref.meetingClass
      if (!existing.privacyProfile && ref.privacyProfile) existing.privacyProfile = ref.privacyProfile
      if (!existing.title && ref.title) existing.title = ref.title
    }
    if (!existing.sensitiveMeetingCandidate && ref.sensitiveMeetingCandidate) existing.sensitiveMeetingCandidate = ref.sensitiveMeetingCandidate
    existing.candidateSignals = mergeCandidateSignals(existing.candidateSignals, ref.candidateSignals)
    recomputeMergedSensitivity(existing)
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
  const vaultSensitivity = classifyMeetingVaultSensitivity({
    ...artifact,
    ...file,
    candidateSignals: mergeCandidateSignals(file.candidateSignals, artifact.candidateSignals),
  })
  const sensitivityClass = vaultSensitivity.sensitivityClass
  const protectedRawFile = sensitivityClass === MEETING_VAULT_SENSITIVITY_CLASSES.PROTECTED
  const unknownClassification = sensitivityClass === MEETING_VAULT_SENSITIVITY_CLASSES.UNKNOWN
  const broadNonSensitive = sensitivityClass === MEETING_VAULT_SENSITIVITY_CLASSES.BROAD_NON_SENSITIVE
  const standardInternal = sensitivityClass === MEETING_VAULT_SENSITIVITY_CLASSES.STANDARD_INTERNAL
  return {
    policyVersion: MEETING_VAULT_POLICY_VERSION,
    strictOwnerPlusCrewbert: protectedRawFile,
    crewbertRole: 'reader',
    meetingClass: file.meetingClass || artifact.meetingClass || 'discussion',
    privacyProfile: file.privacyProfile || artifact.privacyProfile || '',
    sensitivityClass,
    sensitivityReason: vaultSensitivity.sensitivityReason,
    protectedRawFile,
    unknownClassification,
    broadNonSensitive,
    standardInternal,
    phase: 'phase_a_dry_run',
    mutationApproved: false,
    driveAccessPolicy: {
      policyVersion: MEETING_VAULT_POLICY_VERSION,
      crewbertRole: 'reader',
      requireCrewbert: !unknownClassification,
      allowInternalUsers: !protectedRawFile && !unknownClassification,
      allowInternalGroups: broadNonSensitive,
      allowInternalDomain: broadNonSensitive,
      allowFrontOffice: !protectedRawFile && !unknownClassification,
    },
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

  if (policy.unknownClassification) {
    state = MEETING_VAULT_ACL_STATES.BLOCKED
    blockerReasons.push('unclassified_sensitivity')
  } else if (missingAccess) {
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
    sensitivityClass: policy.sensitivityClass,
    sensitivityReason: policy.sensitivityReason,
    ownerHash: preflight.ownerHash || null,
    sourceAccountHash: preflight.sourceAccountHash || null,
    permissionSummary: {
      total: Number(permissionSummary.total || 0),
      ownerCount: Number(permissionSummary.ownerCount || 0),
      crewbertCount: Number(permissionSummary.crewbertCount || 0),
      crewbertOwnerCount: Number(permissionSummary.crewbertOwnerCount || 0),
      unsafeCount: Number(permissionSummary.unsafeCount || 0),
      writerOrOwnerCount: Number(permissionSummary.writerOrOwnerCount || 0),
    },
    proposedOperations: operationTypes.map(operationType => ({ operationType })),
    policy: {
      policyVersion: policy.policyVersion || MEETING_VAULT_POLICY_VERSION,
      phase: 'phase_a_dry_run',
      mutationApproved: false,
      strictOwnerPlusCrewbert: Boolean(policy.strictOwnerPlusCrewbert),
      sensitivityClass: policy.sensitivityClass,
      sensitivityReason: policy.sensitivityReason,
      sourceFileRole: file.sourceFileRole || MEETING_VAULT_SOURCE_FILE_ROLES.ORIGINAL,
      duplicateCopy: Boolean(file.legacyDuplicateCopy),
    },
  }
}

export function classifyMeetingLegacyDuplicateCopyAcl(file = {}, preflight = {}, policy = buildMeetingAclPolicy(file)) {
  const permissionSummary = preflight.permissionSummary || {}
  const categories = permissionSummary.categories || {}
  const externallyUnsafe = Number(categories.unsafe_anyone || 0) +
    Number(categories.unsafe_external_user || 0) +
    Number(categories.unsafe_domain || 0)
  const missingAccess = !preflight.readable ||
    preflight.state === DRIVE_ACCESS_PREFLIGHT_STATES.MISSING_ACCESS ||
    preflight.state === DRIVE_ACCESS_PREFLIGHT_STATES.REQUEST_ACCESS_REQUIRED
  const ownerAmbiguous = Boolean(preflight.ownerAmbiguous) ||
    preflight.state === DRIVE_ACCESS_PREFLIGHT_STATES.OWNER_AMBIGUOUS
  const blockerReasons = ['legacy_crewbert_duplicate_copy_identified']
  let state = MEETING_VAULT_ACL_STATES.SAFE
  if (missingAccess) {
    state = MEETING_VAULT_ACL_STATES.MISSING_ACCESS
    blockerReasons.push('duplicate_copy_access_unproven')
  } else if (ownerAmbiguous) {
    state = MEETING_VAULT_ACL_STATES.OWNER_AMBIGUOUS
    blockerReasons.push('duplicate_copy_owner_ambiguous')
  } else if (externallyUnsafe > 0) {
    state = MEETING_VAULT_ACL_STATES.BLOCKED
    blockerReasons.push('duplicate_copy_external_exposure_review_needed')
  }
  return {
    state,
    safe: state === MEETING_VAULT_ACL_STATES.SAFE,
    requiresPhaseB: false,
    blockerCard: state === MEETING_VAULT_ACL_STATES.SAFE ? null : MEETING_VAULT_ACL_CARD_ID,
    blockerReasons,
    fileRefHash: file.fileRefHash || preflight.fileRefHash || null,
    sensitivityClass: policy.sensitivityClass,
    sensitivityReason: policy.sensitivityReason,
    sourceFileRole: MEETING_VAULT_SOURCE_FILE_ROLES.LEGACY_CREWBERT_COPY,
    ownerHash: preflight.ownerHash || null,
    sourceAccountHash: preflight.sourceAccountHash || null,
    permissionSummary: {
      total: Number(permissionSummary.total || 0),
      ownerCount: Number(permissionSummary.ownerCount || 0),
      crewbertCount: Number(permissionSummary.crewbertCount || 0),
      crewbertOwnerCount: Number(permissionSummary.crewbertOwnerCount || 0),
      unsafeCount: externallyUnsafe,
      writerOrOwnerCount: Number(permissionSummary.writerOrOwnerCount || 0),
    },
    proposedOperations: [],
    policy: {
      policyVersion: policy.policyVersion || MEETING_VAULT_POLICY_VERSION,
      phase: 'phase_a_dry_run',
      mutationApproved: false,
      strictOwnerPlusCrewbert: false,
      sensitivityClass: policy.sensitivityClass,
      sensitivityReason: policy.sensitivityReason,
      sourceFileRole: MEETING_VAULT_SOURCE_FILE_ROLES.LEGACY_CREWBERT_COPY,
      duplicateCopy: true,
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

function summarizeSensitivityClasses(classifications) {
  const counts = {}
  for (const classification of classifications) {
    const sensitivityClass = classification.sensitivityClass || classification.policy?.sensitivityClass || MEETING_VAULT_SENSITIVITY_CLASSES.UNKNOWN
    counts[sensitivityClass] = (counts[sensitivityClass] || 0) + 1
  }
  return counts
}

export function buildMeetingAclDryRunPlan(classifications = []) {
  const normalizedClassifications = classifications.map(item => ({
    state: item.state,
    fileRefHash: item.fileRefHash,
    sensitivityClass: item.sensitivityClass || item.policy?.sensitivityClass || MEETING_VAULT_SENSITIVITY_CLASSES.UNKNOWN,
    sensitivityReason: item.sensitivityReason || item.policy?.sensitivityReason || '',
    ownerHash: item.ownerHash || null,
    sourceAccountHash: item.sourceAccountHash || null,
    sourceFileRole: item.sourceFileRole || item.policy?.sourceFileRole || MEETING_VAULT_SOURCE_FILE_ROLES.ORIGINAL,
    duplicateCopy: Boolean(item.policy?.duplicateCopy || item.duplicateCopy),
    permissionSummary: item.permissionSummary,
    proposedOperations: item.proposedOperations || [],
    blockerReasons: item.blockerReasons || [],
  }))
  const stateCounts = summarizeStates(normalizedClassifications)
  const sensitivityClassCounts = summarizeSensitivityClasses(normalizedClassifications)
  const proposedOperationTypes = countOperationTypes(normalizedClassifications)
  const aclDecisionClassifications = normalizedClassifications.filter(item =>
    item.sourceFileRole === MEETING_VAULT_SOURCE_FILE_ROLES.ORIGINAL
  )
  const unsafeCount = aclDecisionClassifications.filter(item =>
    Number(item.permissionSummary?.unsafeCount || 0) > 0
  ).length
  const unsafePermissionCount = aclDecisionClassifications.reduce(
    (total, item) => total + Number(item.permissionSummary?.unsafeCount || 0),
    0,
  )
  const originalStateCounts = summarizeStates(aclDecisionClassifications)
  const missingCrewbertCount = Number(originalStateCounts[MEETING_VAULT_ACL_STATES.MISSING_CREWBERT] || 0)
  const missingAccessCount = Number(stateCounts[MEETING_VAULT_ACL_STATES.MISSING_ACCESS] || 0)
  const ownerAmbiguousCount = Number(stateCounts[MEETING_VAULT_ACL_STATES.OWNER_AMBIGUOUS] || 0)
  const blockedCount = Number(stateCounts[MEETING_VAULT_ACL_STATES.BLOCKED] || 0)
  const safeCount = Number(stateCounts[MEETING_VAULT_ACL_STATES.SAFE] || 0)
  const sourceFileRoleCounts = normalizedClassifications.reduce((counts, item) => {
    counts[item.sourceFileRole] = (counts[item.sourceFileRole] || 0) + 1
    return counts
  }, {})
  const legacyDuplicateCopyCount = Number(sourceFileRoleCounts[MEETING_VAULT_SOURCE_FILE_ROLES.LEGACY_CREWBERT_COPY] || 0)
  const phaseBRequired = unsafeCount + missingCrewbertCount > 0
  const blockerReasons = [...new Set(normalizedClassifications.flatMap(item => item.blockerReasons || []))]
  const dryRunInput = {
    policyVersion: MEETING_VAULT_POLICY_VERSION,
    classifications: normalizedClassifications,
    stateCounts,
    sensitivityClassCounts,
    proposedOperationTypes,
    sourceFileRoleCounts,
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
    sensitivityClassCounts,
    proposedOperationTypes,
    sourceFileRoleCounts,
    legacyDuplicateCopyCount,
    phaseBRequired,
    blockerReasons,
    exactApprovalNeeded: phaseBRequired
      ? `Separate MEETING-VAULT-ACL-001 Phase B permission-mutation approval tied to source-truth dry-run hash ${dryRunHash}.`
      : blockerReasons.length
        ? 'Resolve unclassified sensitivity, missing access, owner ambiguity, inherited permission, or incomplete inventory blockers, then rerun Phase A before any Phase B approval can be valid.'
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
    sensitivityClassCounts: dryRunPlan.sensitivityClassCounts || {},
    proposedOperationTypes: dryRunPlan.proposedOperationTypes || {},
    exactApprovalNeeded: dryRunPlan.exactApprovalNeeded || '',
  }
}

export function buildMeetingVaultNoDuplicateGoogleDocProof(sources = {}) {
  const syncSource = String(sources.syncMeetingNotesArchiveSource || sources.syncSource || '')
  const mirrorSource = String(sources.mirrorMeetingArchiveToDriveSource || sources.mirrorSource || '')
  const aclSource = String(sources.meetingVaultAclSource || sources.aclSource || '')
  const aclScriptSource = String(sources.meetingVaultAclScriptSource || sources.aclScriptSource || '')
  const meetingJobSource = [syncSource, mirrorSource].join('\n')
  const prohibitedCopyPatterns = [
    /\bfiles\.copy\b/i,
    /\/drive\/v3\/files\/[^'"`\s]+\/copy/i,
    /\bcopyDriveFile\b/i,
  ]
  const syncWriteMarkers = [
    'createDriveTextFile',
    'createDriveFolder',
    'ensureDriveFolder',
    'createDrivePermission',
    'deleteDrivePermission',
  ]
  const findings = []
  const currentJobsCanCopyGoogleDocs = prohibitedCopyPatterns.some(pattern => pattern.test(meetingJobSource))
  const syncCanWriteDriveFiles = syncWriteMarkers.some(marker => syncSource.includes(marker))
  const mirrorCanWriteDriveFiles = [
    'createDriveTextFile',
    'createDriveFolder',
    'ensureDriveFolder',
    'findDriveFile',
  ].some(marker => mirrorSource.includes(marker)) ||
    !mirrorSource.includes('Drive mirror writes are disabled') ||
    !mirrorSource.includes('Drive files created: 0')
  const syncStoresInDb = sourceIncludesAll(syncSource, [
    'driveExportDoc',
    'upsertSharedCommunicationArtifact',
    'contentText',
    'contentHash',
  ])
  const syncPrefersOriginals = sourceIncludesAll(syncSource, [
    'ownerEmailsForFile',
    'crewbertOwned',
    'return candidateIsCopy ? current : candidate',
    'primaryOwnerEmails',
    'originalFileId',
    'legacyCrewbertDuplicateFileIds',
  ])
  const aclSeparatesCopies = sourceIncludesAll(aclSource, [
    'MEETING_VAULT_SOURCE_FILE_ROLES',
    'LEGACY_CREWBERT_COPY',
    'ORIGINAL_MISSING',
    'classifyMeetingLegacyDuplicateCopyAcl',
    'item.sourceFileRole === MEETING_VAULT_SOURCE_FILE_ROLES.ORIGINAL',
  ])
  const aclScriptExcludesCopies = sourceIncludesAll(aclScriptSource, [
    'annotateMeetingSourceRoles',
    'isReadableHumanOriginal',
    'isReadableCrewbertOwned',
    'classifyMeetingLegacyDuplicateCopyAcl',
  ])

  if (currentJobsCanCopyGoogleDocs) findings.push('meeting_job_has_google_doc_copy_path')
  if (syncCanWriteDriveFiles) findings.push('meeting_sync_can_write_drive_files')
  if (mirrorCanWriteDriveFiles) findings.push('meeting_mirror_can_write_drive_files')
  if (!syncStoresInDb) findings.push('meeting_sync_does_not_store_archive_in_db')
  if (!syncPrefersOriginals) findings.push('meeting_sync_does_not_prove_original_preference')
  if (!aclSeparatesCopies) findings.push('acl_layer_does_not_separate_legacy_copies')
  if (!aclScriptExcludesCopies) findings.push('acl_script_does_not_exclude_copies_from_decisions')

  return {
    rule: MEETING_VAULT_NO_DUPLICATE_GOOGLE_DOC_RULE,
    ok: findings.length === 0,
    findings,
    assertions: {
      currentMeetingJobsCannotCopyGoogleDocs: !currentJobsCanCopyGoogleDocs,
      meetingSyncCannotWriteDriveFiles: !syncCanWriteDriveFiles,
      mirrorCannotWriteDriveFiles: !mirrorCanWriteDriveFiles,
      archiveStoredInDb: syncStoresInDb,
      originalsPreferredForFutureSync: syncPrefersOriginals,
      legacyCopiesSeparated: aclSeparatesCopies,
      aclDecisionsUseOriginalsOnly: aclScriptExcludesCopies,
    },
  }
}

export function buildSyntheticMeetingVaultAclProof() {
  const safe = classifyMeetingRawFileAcl(
    {
      fileRefHash: hashProofValue('synthetic-safe-file', 'file'),
      meetingClass: 'broadcast',
      privacyProfile: 'baseline',
      sensitivityClass: MEETING_VAULT_SENSITIVITY_CLASSES.BROAD_NON_SENSITIVE,
      sensitivityReason: 'synthetic_safe_broad',
    },
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
    {
      fileRefHash: hashProofValue('synthetic-missing-crewbert-file', 'file'),
      meetingClass: 'discussion',
      privacyProfile: 'subject_redaction',
      sensitivityClass: MEETING_VAULT_SENSITIVITY_CLASSES.PROTECTED,
      sensitivityReason: 'synthetic_missing_crewbert_protected',
    },
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
    {
      fileRefHash: hashProofValue('synthetic-unsafe-file', 'file'),
      sensitivityClass: MEETING_VAULT_SENSITIVITY_CLASSES.PROTECTED,
      sensitivityReason: 'synthetic_protected',
    },
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
  const broadInternal = classifyMeetingRawFileAcl(
    {
      fileRefHash: hashProofValue('synthetic-broad-file', 'file'),
      meetingClass: 'broadcast',
      privacyProfile: 'baseline',
      sensitivityClass: MEETING_VAULT_SENSITIVITY_CLASSES.BROAD_NON_SENSITIVE,
      sensitivityReason: 'synthetic_broad',
    },
    {
      state: DRIVE_ACCESS_PREFLIGHT_STATES.READABLE_SAFE,
      readable: true,
      fileRefHash: hashProofValue('synthetic-broad-file', 'file'),
      ownerHash: hashProofValue('owner@bensoncrew.ca', 'acct'),
      sourceAccountHash: hashProofValue('owner@bensoncrew.ca', 'acct'),
      ownerAmbiguous: false,
      missingCrewbert: false,
      permissionSummary: { total: 3, ownerCount: 1, crewbertCount: 1, unsafeCount: 0, writerOrOwnerCount: 2 },
      proposedOperations: [],
    },
    buildMeetingAclPolicy({
      meetingClass: 'broadcast',
      privacyProfile: 'baseline',
      sensitivityClass: MEETING_VAULT_SENSITIVITY_CLASSES.BROAD_NON_SENSITIVE,
      sensitivityReason: 'synthetic_broad',
    }),
  )
  const legacyDuplicate = classifyMeetingLegacyDuplicateCopyAcl(
    {
      fileRefHash: hashProofValue('synthetic-crewbert-copy-file', 'file'),
      meetingClass: 'broadcast',
      privacyProfile: 'baseline',
      sensitivityClass: MEETING_VAULT_SENSITIVITY_CLASSES.BROAD_NON_SENSITIVE,
      sensitivityReason: 'synthetic_duplicate_copy',
      sourceFileRole: MEETING_VAULT_SOURCE_FILE_ROLES.LEGACY_CREWBERT_COPY,
      legacyDuplicateCopy: true,
    },
    {
      state: DRIVE_ACCESS_PREFLIGHT_STATES.READABLE_SAFE,
      readable: true,
      fileRefHash: hashProofValue('synthetic-crewbert-copy-file', 'file'),
      ownerHash: hashProofValue('crewbert@bensoncrew.ca', 'acct'),
      sourceAccountHash: hashProofValue('crewbert@bensoncrew.ca', 'acct'),
      ownerAmbiguous: false,
      missingCrewbert: false,
      permissionSummary: {
        total: 2,
        ownerCount: 1,
        crewbertCount: 1,
        crewbertOwnerCount: 1,
        unsafeCount: 0,
        writerOrOwnerCount: 1,
        categories: { owner: 1, allowed_internal_user: 1 },
      },
      proposedOperations: [],
    },
  )
  const ownerAmbiguous = classifyMeetingRawFileAcl(
    {
      fileRefHash: hashProofValue('synthetic-owner-ambiguous-file', 'file'),
      meetingClass: 'discussion',
      privacyProfile: 'subject_redaction',
      sensitivityClass: MEETING_VAULT_SENSITIVITY_CLASSES.PROTECTED,
      sensitivityReason: 'synthetic_owner_ambiguous_protected',
    },
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
  const dryRunPlan = buildMeetingAclDryRunPlan([safe, missingCrewbert, unsafe, ownerAmbiguous, legacyDuplicate])
  const status = buildMeetingVaultAclStatus({
    inventoryComplete: true,
    phaseAComplete: true,
    dryRunPlan,
  })
  return {
    ok: safe.safe &&
      missingCrewbert.state === MEETING_VAULT_ACL_STATES.MISSING_CREWBERT &&
      unsafe.state === MEETING_VAULT_ACL_STATES.UNSAFE &&
      broadInternal.state === MEETING_VAULT_ACL_STATES.SAFE &&
      buildMeetingAclPolicy({ meetingClass: 'broadcast', privacyProfile: 'baseline' }).driveAccessPolicy.allowInternalUsers === true &&
      legacyDuplicate.safe &&
      legacyDuplicate.sourceFileRole === MEETING_VAULT_SOURCE_FILE_ROLES.LEGACY_CREWBERT_COPY &&
      ownerAmbiguous.state === MEETING_VAULT_ACL_STATES.OWNER_AMBIGUOUS &&
      status.status === 'blocked_phase_b_required' &&
      Boolean(dryRunPlan.dryRunHash),
    fixtures: { safe, missingCrewbert, unsafe, broadInternal, ownerAmbiguous, legacyDuplicate },
    dryRunPlan,
    status,
  }
}
