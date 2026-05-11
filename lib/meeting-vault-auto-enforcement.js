import crypto from 'node:crypto'
import {
  DRIVE_ACCESS_PREFLIGHT_STATES,
  DRIVE_PERMISSION_OPERATION_TYPES,
  hashProofObject,
} from './drive-access-preflight.js'
import {
  MEETING_VAULT_ACL_CARD_ID,
  MEETING_VAULT_ACL_STATES,
  MEETING_VAULT_SENSITIVITY_CLASSES,
  MEETING_VAULT_SOURCE_FILE_ROLES,
  MEETING_VAULT_NO_DUPLICATE_GOOGLE_DOC_RULE,
  classifyMeetingLegacyDuplicateCopyAcl,
  classifyMeetingRawFileAcl,
  buildMeetingAclDryRunPlan,
  buildMeetingAclPolicy,
  buildMeetingVaultAclStatus,
} from './meeting-vault-acl.js'

export const MEETING_VAULT_AUTO_ENFORCEMENT_CARD_ID = 'MEETING-VAULT-AUTO-ENFORCEMENT-001'
export const MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY = 'meeting-vault-auto-enforcement-v1'
export const MEETING_VAULT_AUTO_ENFORCEMENT_PLAN_PATH = 'docs/process/meeting-vault-auto-enforcement-001-plan.md'
export const MEETING_VAULT_AUTO_ENFORCEMENT_DOC_PATH = 'docs/process/meeting-vault-auto-enforcement.md'
export const MEETING_VAULT_AUTO_ENFORCEMENT_APPROVAL_PATH = 'docs/process/approvals/MEETING-VAULT-AUTO-ENFORCEMENT-001.json'
export const MEETING_VAULT_AUTO_ENFORCEMENT_SCRIPT_PATH = 'scripts/process-meeting-vault-auto-enforcement-check.mjs'
export const MEETING_VAULT_AUTO_ENFORCEMENT_SUMMARY_MARKER = 'MEETING_VAULT_AUTO_ENFORCEMENT_SUMMARY'
export const MEETING_VAULT_AUTO_ENFORCEMENT_POLICY_VERSION = 'meeting-vault-auto-enforcement-v1'
export const MEETING_VAULT_AUTO_ENFORCEMENT_DEFAULT_MODE = 'report_only'

export const MEETING_VAULT_AUTO_ENFORCEMENT_ACTIONS = {
  SAFE_NOOP: 'safe_noop',
  ADD_CREWBERT_READER: 'add_crewbert_reader',
  REMOVE_HIGH_RISK_PUBLIC_OR_DOMAIN: 'remove_high_risk_public_or_domain',
  PROTECTED_LOCK_REQUIRED: 'protected_lock_required',
  REVIEW_REQUIRED: 'review_required',
  LEGACY_EXCEPTION: 'legacy_exception',
  REQUEST_ACCESS_NEEDED: 'request_access_needed',
  OWNER_AMBIGUOUS_BLOCKED: 'owner_ambiguous_blocked',
}

export const MEETING_VAULT_AUTO_ENFORCEMENT_ITEM_STATUSES = {
  SAFE: 'safe',
  QUEUED: 'queued',
  REVIEW_REQUIRED: 'review_required',
  LEGACY_EXCEPTION: 'legacy_exception',
  BLOCKED: 'blocked',
  HIGH_RISK_BLOCKER: 'high_risk_blocker',
}

export const MEETING_VAULT_LEGACY_EXCEPTION_REASONS = {
  LEGACY_DUPLICATE_COPY: 'legacy_duplicate_copy',
  ORIGINAL_MISSING: 'original_missing',
  OWNER_AMBIGUOUS: 'owner_ambiguous',
  MISSING_ACCESS: 'missing_access',
  INHERITED_PERMISSION_UNRESOLVED: 'inherited_permission_unresolved',
  EXTERNAL_GUEST_UNCLASSIFIED: 'external_guest_unclassified',
  HIGH_RISK_PUBLIC_OR_DOMAIN: 'high_risk_public_or_domain',
  PROTECTED_REVIEW_REQUIRED: 'protected_review_required',
  BLOCKED_PENDING_OWNER_AUTHORITY: 'blocked_pending_owner_authority',
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

function normalizeDateMs(value) {
  const epoch = Date.parse(String(value || ''))
  return Number.isFinite(epoch) ? epoch : 0
}

function countBy(items = [], getter) {
  return items.reduce((counts, item) => {
    const key = getter(item) || 'unknown'
    counts[key] = (counts[key] || 0) + 1
    return counts
  }, {})
}

function countPermissionCategory(classification = {}, category) {
  return Number(classification.permissionSummary?.categories?.[category] || 0)
}

function countHighRiskPublicOrDomain(classification = {}) {
  return countPermissionCategory(classification, 'unsafe_anyone') +
    countPermissionCategory(classification, 'unsafe_domain')
}

function hasPermissionCategory(classification = {}, category) {
  return countPermissionCategory(classification, category) > 0
}

function sourceFileRoleFor(classification = {}) {
  return classification.sourceFileRole ||
    classification.policy?.sourceFileRole ||
    MEETING_VAULT_SOURCE_FILE_ROLES.ORIGINAL
}

function sensitivityClassFor(classification = {}) {
  return classification.sensitivityClass ||
    classification.policy?.sensitivityClass ||
    MEETING_VAULT_SENSITIVITY_CLASSES.UNKNOWN
}

function observedAtFor(file = {}) {
  return file.ingestedAt ||
    file.artifactUpdatedAt ||
    file.updatedAt ||
    file.processedAt ||
    file.discoveredAt ||
    null
}

function isForwardItem(file = {}, enforcementStartAt) {
  const startMs = normalizeDateMs(enforcementStartAt)
  const observedMs = normalizeDateMs(observedAtFor(file))
  if (!startMs || !observedMs) return false
  return observedMs >= startMs
}

function baseReasonForClassification(classification = {}) {
  const reasons = Array.isArray(classification.blockerReasons) ? classification.blockerReasons : []
  if (reasons.length) return reasons[0]
  if (classification.state) return classification.state
  return 'meeting_vault_auto_enforcement_review'
}

function legacyReasonFor({ classification = {}, forward = false }) {
  const sourceFileRole = sourceFileRoleFor(classification)
  if (sourceFileRole === MEETING_VAULT_SOURCE_FILE_ROLES.LEGACY_CREWBERT_COPY) {
    return MEETING_VAULT_LEGACY_EXCEPTION_REASONS.LEGACY_DUPLICATE_COPY
  }
  if (sourceFileRole === MEETING_VAULT_SOURCE_FILE_ROLES.ORIGINAL_MISSING) {
    return MEETING_VAULT_LEGACY_EXCEPTION_REASONS.ORIGINAL_MISSING
  }
  if (classification.state === MEETING_VAULT_ACL_STATES.OWNER_AMBIGUOUS) {
    return MEETING_VAULT_LEGACY_EXCEPTION_REASONS.OWNER_AMBIGUOUS
  }
  if (classification.state === MEETING_VAULT_ACL_STATES.MISSING_ACCESS) {
    return MEETING_VAULT_LEGACY_EXCEPTION_REASONS.MISSING_ACCESS
  }
  if (countHighRiskPublicOrDomain(classification) > 0) {
    return MEETING_VAULT_LEGACY_EXCEPTION_REASONS.HIGH_RISK_PUBLIC_OR_DOMAIN
  }
  if (sensitivityClassFor(classification) === MEETING_VAULT_SENSITIVITY_CLASSES.PROTECTED) {
    return MEETING_VAULT_LEGACY_EXCEPTION_REASONS.PROTECTED_REVIEW_REQUIRED
  }
  if (!forward && hasPermissionCategory(classification, 'unsafe_external_user')) {
    return MEETING_VAULT_LEGACY_EXCEPTION_REASONS.EXTERNAL_GUEST_UNCLASSIFIED
  }
  return MEETING_VAULT_LEGACY_EXCEPTION_REASONS.BLOCKED_PENDING_OWNER_AUTHORITY
}

export function classifyMeetingVaultAutoEnforcementItem({ file = {}, classification = {}, enforcementStartAt } = {}) {
  const sourceFileRole = sourceFileRoleFor(classification)
  const sensitivityClass = sensitivityClassFor(classification)
  const forward = isForwardItem(file, enforcementStartAt)
  const original = sourceFileRole === MEETING_VAULT_SOURCE_FILE_ROLES.ORIGINAL
  const legacySourceRole = sourceFileRole === MEETING_VAULT_SOURCE_FILE_ROLES.LEGACY_CREWBERT_COPY ||
    sourceFileRole === MEETING_VAULT_SOURCE_FILE_ROLES.ORIGINAL_MISSING
  const highRiskPublicOrDomainCount = countHighRiskPublicOrDomain(classification)
  const unsafeExternalUserCount = countPermissionCategory(classification, 'unsafe_external_user')
  const unsafeCount = Number(classification.permissionSummary?.unsafeCount || 0)
  const historicalIssue = !forward && (
    legacySourceRole ||
    unsafeCount > 0 ||
    classification.state === MEETING_VAULT_ACL_STATES.MISSING_ACCESS ||
    classification.state === MEETING_VAULT_ACL_STATES.OWNER_AMBIGUOUS ||
    classification.state === MEETING_VAULT_ACL_STATES.BLOCKED ||
    classification.state === MEETING_VAULT_ACL_STATES.MISSING_CREWBERT ||
    !classification.safe
  )

  let action = MEETING_VAULT_AUTO_ENFORCEMENT_ACTIONS.SAFE_NOOP
  let status = MEETING_VAULT_AUTO_ENFORCEMENT_ITEM_STATUSES.SAFE
  let riskLevel = 'low'
  let reason = 'already_safe'
  let blockerCard = null
  let operationType = null
  let legacyExceptionReason = null

  if (historicalIssue) {
    action = MEETING_VAULT_AUTO_ENFORCEMENT_ACTIONS.LEGACY_EXCEPTION
    status = MEETING_VAULT_AUTO_ENFORCEMENT_ITEM_STATUSES.LEGACY_EXCEPTION
    legacyExceptionReason = legacyReasonFor({ classification, forward })
    reason = legacyExceptionReason
    riskLevel = highRiskPublicOrDomainCount > 0 || sensitivityClass === MEETING_VAULT_SENSITIVITY_CLASSES.PROTECTED
      ? 'high'
      : 'medium'
    blockerCard = MEETING_VAULT_ACL_CARD_ID
  } else if (sensitivityClass === MEETING_VAULT_SENSITIVITY_CLASSES.UNKNOWN) {
    action = MEETING_VAULT_AUTO_ENFORCEMENT_ACTIONS.REVIEW_REQUIRED
    status = MEETING_VAULT_AUTO_ENFORCEMENT_ITEM_STATUSES.BLOCKED
    riskLevel = 'high'
    reason = 'unknown_unclassified'
    blockerCard = MEETING_VAULT_ACL_CARD_ID
  } else if (classification.state === MEETING_VAULT_ACL_STATES.MISSING_ACCESS) {
    action = MEETING_VAULT_AUTO_ENFORCEMENT_ACTIONS.REQUEST_ACCESS_NEEDED
    status = MEETING_VAULT_AUTO_ENFORCEMENT_ITEM_STATUSES.BLOCKED
    riskLevel = 'high'
    reason = 'request_access_needed'
    blockerCard = 'DRIVE-ACCESS-REQUEST-001'
    operationType = DRIVE_PERMISSION_OPERATION_TYPES.REQUEST_ACCESS
  } else if (classification.state === MEETING_VAULT_ACL_STATES.OWNER_AMBIGUOUS) {
    action = MEETING_VAULT_AUTO_ENFORCEMENT_ACTIONS.OWNER_AMBIGUOUS_BLOCKED
    status = MEETING_VAULT_AUTO_ENFORCEMENT_ITEM_STATUSES.BLOCKED
    riskLevel = 'high'
    reason = 'owner_ambiguous'
    blockerCard = 'DRIVE-ACCESS-REQUEST-001'
    operationType = DRIVE_PERMISSION_OPERATION_TYPES.BLOCK_OWNER_AMBIGUOUS
  } else if (highRiskPublicOrDomainCount > 0) {
    action = MEETING_VAULT_AUTO_ENFORCEMENT_ACTIONS.REMOVE_HIGH_RISK_PUBLIC_OR_DOMAIN
    status = MEETING_VAULT_AUTO_ENFORCEMENT_ITEM_STATUSES.HIGH_RISK_BLOCKER
    riskLevel = 'high'
    reason = 'raw_public_or_domain_exposure'
    blockerCard = MEETING_VAULT_ACL_CARD_ID
    operationType = DRIVE_PERMISSION_OPERATION_TYPES.REMOVE_UNSAFE_PERMISSION
  } else if (classification.state === MEETING_VAULT_ACL_STATES.MISSING_CREWBERT) {
    action = MEETING_VAULT_AUTO_ENFORCEMENT_ACTIONS.ADD_CREWBERT_READER
    status = MEETING_VAULT_AUTO_ENFORCEMENT_ITEM_STATUSES.QUEUED
    riskLevel = 'medium'
    reason = 'crewbert_reader_missing'
    blockerCard = MEETING_VAULT_ACL_CARD_ID
    operationType = DRIVE_PERMISSION_OPERATION_TYPES.ADD_CREWBERT_READER
  } else if (sensitivityClass === MEETING_VAULT_SENSITIVITY_CLASSES.PROTECTED && unsafeCount > 0) {
    action = MEETING_VAULT_AUTO_ENFORCEMENT_ACTIONS.PROTECTED_LOCK_REQUIRED
    status = MEETING_VAULT_AUTO_ENFORCEMENT_ITEM_STATUSES.REVIEW_REQUIRED
    riskLevel = 'high'
    reason = baseReasonForClassification(classification)
    blockerCard = MEETING_VAULT_ACL_CARD_ID
    operationType = DRIVE_PERMISSION_OPERATION_TYPES.REMOVE_UNSAFE_PERMISSION
  } else if (unsafeExternalUserCount > 0) {
    action = MEETING_VAULT_AUTO_ENFORCEMENT_ACTIONS.REVIEW_REQUIRED
    status = MEETING_VAULT_AUTO_ENFORCEMENT_ITEM_STATUSES.REVIEW_REQUIRED
    riskLevel = sensitivityClass === MEETING_VAULT_SENSITIVITY_CLASSES.BROAD_NON_SENSITIVE ? 'low' : 'medium'
    reason = 'external_guest_legitimacy_review_required'
    blockerCard = MEETING_VAULT_ACL_CARD_ID
  } else if (!classification.safe && original) {
    action = MEETING_VAULT_AUTO_ENFORCEMENT_ACTIONS.REVIEW_REQUIRED
    status = MEETING_VAULT_AUTO_ENFORCEMENT_ITEM_STATUSES.REVIEW_REQUIRED
    riskLevel = 'medium'
    reason = baseReasonForClassification(classification)
    blockerCard = classification.blockerCard || MEETING_VAULT_ACL_CARD_ID
  }

  return {
    fileRefHash: classification.fileRefHash || file.fileRefHash || null,
    sourceFileRole,
    sensitivityClass,
    ownerHash: classification.ownerHash || null,
    action,
    status,
    riskLevel,
    reason,
    blockerCard,
    operationType,
    legacyExceptionReason,
    forward,
    metadata: {
      permissionSummary: classification.permissionSummary || {},
      highRiskPublicOrDomainCount,
      unsafeExternalUserCount,
      observedAtPresent: Boolean(observedAtFor(file)),
      rollbackRequirement: operationType
        ? 'metadata-only before/after snapshot plus exact permission recreation/deletion operation if live enforcement is separately approved'
        : null,
    },
  }
}

function summarizeItems(items = []) {
  const actionCounts = countBy(items, item => item.action)
  const statusCounts = countBy(items, item => item.status)
  const riskCounts = countBy(items, item => item.riskLevel)
  const sensitivityClassCounts = countBy(items, item => item.sensitivityClass)
  const sourceFileRoleCounts = countBy(items, item => item.sourceFileRole)
  const forwardItems = items.filter(item => item.forward)
  const legacyExceptions = items.filter(item => item.status === MEETING_VAULT_AUTO_ENFORCEMENT_ITEM_STATUSES.LEGACY_EXCEPTION)
  const highRiskForwardProtectedOriginals = items.filter(item =>
    item.forward &&
    item.sourceFileRole === MEETING_VAULT_SOURCE_FILE_ROLES.ORIGINAL &&
    item.sensitivityClass === MEETING_VAULT_SENSITIVITY_CLASSES.PROTECTED &&
    item.metadata.highRiskPublicOrDomainCount > 0
  )

  return {
    processedCount: items.length,
    forwardCount: forwardItems.length,
    legacyExceptionCount: legacyExceptions.length,
    actionCounts,
    statusCounts,
    riskCounts,
    sensitivityClassCounts,
    sourceFileRoleCounts,
    highRiskCurrentProtectedOriginalCount: highRiskForwardProtectedOriginals.length,
    highRiskForwardProtectedOriginalCount: highRiskForwardProtectedOriginals.length,
    missingCrewbertQueuedCount: Number(actionCounts[MEETING_VAULT_AUTO_ENFORCEMENT_ACTIONS.ADD_CREWBERT_READER] || 0),
    protectedReviewQueueCount: items.filter(item =>
      item.sensitivityClass === MEETING_VAULT_SENSITIVITY_CLASSES.PROTECTED &&
      [
        MEETING_VAULT_AUTO_ENFORCEMENT_ACTIONS.PROTECTED_LOCK_REQUIRED,
        MEETING_VAULT_AUTO_ENFORCEMENT_ACTIONS.REVIEW_REQUIRED,
      ].includes(item.action)
    ).length,
    publicDomainHighRiskCount: items.filter(item =>
      item.metadata.highRiskPublicOrDomainCount > 0
    ).length,
    broadGuestPreservedCount: items.filter(item =>
      item.sensitivityClass === MEETING_VAULT_SENSITIVITY_CLASSES.BROAD_NON_SENSITIVE &&
      item.action === MEETING_VAULT_AUTO_ENFORCEMENT_ACTIONS.REVIEW_REQUIRED &&
      item.reason === 'external_guest_legitimacy_review_required'
    ).length,
  }
}

export function buildMeetingVaultAutoEnforcementStatus({
  classifications = [],
  inventoryComplete = true,
  enforcementStartAt,
  noDuplicateGoogleDocProof = { ok: false },
  syntheticProof = { ok: false },
  mode = 'report_only',
  generatedAt = new Date().toISOString(),
} = {}) {
  const normalizedItems = classifications.map(entry =>
    classifyMeetingVaultAutoEnforcementItem({
      file: entry.file || {},
      classification: entry.classification || entry,
      enforcementStartAt,
    })
  )
  const summary = summarizeItems(normalizedItems)
  const forwardFlowProven = Boolean(syntheticProof.ok) &&
    Boolean(noDuplicateGoogleDocProof.ok) &&
    inventoryComplete &&
    mode === MEETING_VAULT_AUTO_ENFORCEMENT_DEFAULT_MODE
  const legacyQueueBounded = summary.legacyExceptionCount >= 0 &&
    normalizedItems.every(item =>
      item.status !== MEETING_VAULT_AUTO_ENFORCEMENT_ITEM_STATUSES.LEGACY_EXCEPTION ||
      Boolean(item.legacyExceptionReason)
    )
  const canCloseMeetingVaultAcl = forwardFlowProven &&
    legacyQueueBounded &&
    summary.highRiskForwardProtectedOriginalCount === 0
  const status = canCloseMeetingVaultAcl ? 'ready' : 'blocked'
  const reportHash = sha256(stableStringify({
    policyVersion: MEETING_VAULT_AUTO_ENFORCEMENT_POLICY_VERSION,
    mode,
    enforcementStartAt,
    inventoryComplete,
    noDuplicateGoogleDocProofOk: Boolean(noDuplicateGoogleDocProof.ok),
    syntheticProofOk: Boolean(syntheticProof.ok),
    summary,
    items: normalizedItems.map(item => ({
      fileRefHash: item.fileRefHash,
      sourceFileRole: item.sourceFileRole,
      sensitivityClass: item.sensitivityClass,
      action: item.action,
      status: item.status,
      riskLevel: item.riskLevel,
      reason: item.reason,
      legacyExceptionReason: item.legacyExceptionReason,
      forward: item.forward,
    })),
  }))

  return {
    cardId: MEETING_VAULT_AUTO_ENFORCEMENT_CARD_ID,
    closeoutKey: MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY,
    policyVersion: MEETING_VAULT_AUTO_ENFORCEMENT_POLICY_VERSION,
    mode,
    status,
    generatedAt,
    enforcementStartAt,
    reportHash,
    canCloseMeetingVaultAcl,
    blockerCard: canCloseMeetingVaultAcl ? null : MEETING_VAULT_ACL_CARD_ID,
    blockerReason: canCloseMeetingVaultAcl
      ? ''
      : summary.highRiskForwardProtectedOriginalCount > 0
        ? 'current_protected_public_or_domain_exposure'
        : 'automatic_forward_flow_or_legacy_queue_unproven',
    summary,
    noDuplicateGoogleDocProof,
    syntheticProof,
    items: normalizedItems,
    legacyExceptions: normalizedItems.filter(item => item.status === MEETING_VAULT_AUTO_ENFORCEMENT_ITEM_STATUSES.LEGACY_EXCEPTION),
    nextSafeAction: canCloseMeetingVaultAcl
      ? 'Keep automatic Meeting Vault enforcement in report-only proof mode until a separate live-mutation approval enables safe new-note enforcement.'
      : 'Resolve high-risk current protected exposure or repair the automatic forward-flow proof before closing MEETING-VAULT-ACL-001.',
  }
}

export function assertMeetingVaultAutoEnforcementMutationApproved({ approvalRef, mode } = {}) {
  if (mode !== 'apply' && mode !== 'live') return true
  if (!String(approvalRef || '').trim()) {
    throw new Error('MEETING-VAULT-AUTO-ENFORCEMENT-001 live Drive mutation requires a separate explicit approval artifact.')
  }
  return true
}

export function buildSyntheticMeetingVaultAutoEnforcementProof() {
  const protectedMissingCrewbert = classifyMeetingRawFileAcl(
    {
      fileRefHash: 'file:synthetic-protected-missing-crewbert',
      sensitivityClass: MEETING_VAULT_SENSITIVITY_CLASSES.PROTECTED,
      sensitivityReason: 'synthetic_protected',
    },
    {
      state: DRIVE_ACCESS_PREFLIGHT_STATES.READABLE_REPAIRABLE,
      readable: true,
      fileRefHash: 'file:synthetic-protected-missing-crewbert',
      ownerHash: 'acct:owner',
      ownerAmbiguous: false,
      missingCrewbert: true,
      permissionSummary: { total: 1, ownerCount: 1, crewbertCount: 0, unsafeCount: 0, categories: {} },
      proposedOperations: [{ operationType: DRIVE_PERMISSION_OPERATION_TYPES.ADD_CREWBERT_READER }],
    },
  )
  const broadGuestReview = classifyMeetingRawFileAcl(
    {
      fileRefHash: 'file:synthetic-broad-guest',
      meetingClass: 'broadcast',
      privacyProfile: 'baseline',
      sensitivityClass: MEETING_VAULT_SENSITIVITY_CLASSES.BROAD_NON_SENSITIVE,
      sensitivityReason: 'synthetic_broad',
    },
    {
      state: DRIVE_ACCESS_PREFLIGHT_STATES.READABLE_REPAIRABLE,
      readable: true,
      fileRefHash: 'file:synthetic-broad-guest',
      ownerHash: 'acct:owner',
      ownerAmbiguous: false,
      missingCrewbert: false,
      permissionSummary: {
        total: 3,
        ownerCount: 1,
        crewbertCount: 1,
        unsafeCount: 1,
        categories: { unsafe_external_user: 1 },
      },
      proposedOperations: [{ operationType: DRIVE_PERMISSION_OPERATION_TYPES.REMOVE_UNSAFE_PERMISSION }],
    },
    buildMeetingAclPolicy({
      meetingClass: 'broadcast',
      privacyProfile: 'baseline',
      sensitivityClass: MEETING_VAULT_SENSITIVITY_CLASSES.BROAD_NON_SENSITIVE,
    }),
  )
  const publicProtected = classifyMeetingRawFileAcl(
    {
      fileRefHash: 'file:synthetic-public-protected',
      sensitivityClass: MEETING_VAULT_SENSITIVITY_CLASSES.PROTECTED,
      sensitivityReason: 'synthetic_protected',
    },
    {
      state: DRIVE_ACCESS_PREFLIGHT_STATES.READABLE_REPAIRABLE,
      readable: true,
      fileRefHash: 'file:synthetic-public-protected',
      ownerHash: 'acct:owner',
      ownerAmbiguous: false,
      missingCrewbert: false,
      permissionSummary: {
        total: 3,
        ownerCount: 1,
        crewbertCount: 1,
        unsafeCount: 1,
        categories: { unsafe_anyone: 1 },
      },
      proposedOperations: [{ operationType: DRIVE_PERMISSION_OPERATION_TYPES.REMOVE_UNSAFE_PERMISSION }],
    },
  )
  const legacyDuplicate = classifyMeetingLegacyDuplicateCopyAcl(
    {
      fileRefHash: 'file:synthetic-legacy-copy',
      sourceFileRole: MEETING_VAULT_SOURCE_FILE_ROLES.LEGACY_CREWBERT_COPY,
      legacyDuplicateCopy: true,
      sensitivityClass: MEETING_VAULT_SENSITIVITY_CLASSES.STANDARD_INTERNAL,
    },
    {
      state: DRIVE_ACCESS_PREFLIGHT_STATES.READABLE_SAFE,
      readable: true,
      fileRefHash: 'file:synthetic-legacy-copy',
      ownerHash: 'acct:crewbert',
      ownerAmbiguous: false,
      missingCrewbert: false,
      permissionSummary: {
        total: 1,
        ownerCount: 1,
        crewbertCount: 1,
        crewbertOwnerCount: 1,
        unsafeCount: 0,
        categories: { owner: 1 },
      },
      proposedOperations: [],
    },
  )
  const enforcementStartAt = '2026-05-11T00:00:00.000Z'
  const items = [
    { file: { ingestedAt: '2026-05-11T00:01:00.000Z' }, classification: protectedMissingCrewbert },
    { file: { ingestedAt: '2026-05-11T00:02:00.000Z' }, classification: broadGuestReview },
    { file: { ingestedAt: '2026-05-11T00:03:00.000Z' }, classification: publicProtected },
    { file: { ingestedAt: '2026-05-10T23:59:00.000Z' }, classification: legacyDuplicate },
  ].map(item => classifyMeetingVaultAutoEnforcementItem({ ...item, enforcementStartAt }))
  const dryRunPlan = buildMeetingAclDryRunPlan([protectedMissingCrewbert, broadGuestReview, publicProtected, legacyDuplicate])
  const aclStatus = buildMeetingVaultAclStatus({ inventoryComplete: true, phaseAComplete: true, dryRunPlan })
  return {
    ok: items[0].action === MEETING_VAULT_AUTO_ENFORCEMENT_ACTIONS.ADD_CREWBERT_READER &&
      items[1].action === MEETING_VAULT_AUTO_ENFORCEMENT_ACTIONS.REVIEW_REQUIRED &&
      items[1].riskLevel === 'low' &&
      items[2].action === MEETING_VAULT_AUTO_ENFORCEMENT_ACTIONS.REMOVE_HIGH_RISK_PUBLIC_OR_DOMAIN &&
      items[3].action === MEETING_VAULT_AUTO_ENFORCEMENT_ACTIONS.LEGACY_EXCEPTION &&
      aclStatus.status === 'blocked_phase_b_required' &&
      Boolean(dryRunPlan.dryRunHash),
    rule: MEETING_VAULT_NO_DUPLICATE_GOOGLE_DOC_RULE,
    itemHashes: items.map(item => hashProofObject(item, 'auto')),
  }
}
