import crypto from 'node:crypto'

export const BUILD_OPPORTUNITY_PROMOTION_GATE_CARD_ID = 'BUILD-OPPORTUNITY-PROMOTION-GATE-001'
export const BUILD_OPPORTUNITY_PROMOTION_GATE_PLAN_PATH = 'docs/process/build-opportunity-promotion-gate-001-plan.md'
export const BUILD_OPPORTUNITY_PROMOTION_GATE_APPROVAL_PATH = 'docs/process/approvals/BUILD-OPPORTUNITY-PROMOTION-GATE-001.json'
export const BUILD_OPPORTUNITY_PROMOTION_GATE_SCRIPT_PATH = 'scripts/process-build-opportunity-promotion-gate-check.mjs'

export const BUILD_OPPORTUNITY_PROMOTION_ACTIONS = [
  'create_backlog_card',
  'attach_to_existing_card',
  'reject',
  'mark_duplicate',
  'mark_stale',
]

export const BUILD_OPPORTUNITY_PROMOTION_STATUS = {
  approvalRequired: 'approval_required',
  backlogCardProposalReady: 'backlog_card_proposal_ready',
  existingCardAttachmentProposalReady: 'existing_card_attachment_proposal_ready',
  needsMoreEvidence: 'needs_more_evidence',
  duplicateAttachRequired: 'duplicate_attach_required',
  staleNeedsRefresh: 'stale_needs_refresh',
  blockedUnsafe: 'blocked_unsafe',
  targetCardRequired: 'target_card_required',
  rejected: 'rejected_with_evidence',
  duplicateLogged: 'duplicate_logged',
  staleLogged: 'stale_logged',
}

const ACTION_SET = new Set(BUILD_OPPORTUNITY_PROMOTION_ACTIONS)
const DEFAULT_MAX_STALE_DAYS = 45
const EXPLICIT_APPROVAL_FIELDS = [
  'approved',
  'approvedBy',
  'approvedAt',
  'approvalId',
  'approvalRef',
]
const UNSAFE_FLAG_LABELS = {
  liveExtraction: 'live_extraction',
  providerCall: 'provider_call',
  modelCall: 'model_call',
  crawl: 'crawl',
  clickNavigation: 'click_navigation',
  authRequiredRun: 'auth_required_run',
  paidRun: 'paid_run',
  privateSourceRun: 'private_source_run',
  externalWrite: 'external_write',
  formSubmit: 'form_submit',
  download: 'download',
  purchase: 'purchase',
  credentialMutation: 'credential_mutation',
  backlogWrite: 'backlog_write',
  sprintMutation: 'sprint_mutation',
}

function text(value) {
  return String(value || '').trim()
}

function compactText(value) {
  return text(value).replace(/\s+/g, ' ')
}

function list(value) {
  if (!Array.isArray(value)) return []
  return value.map(item => text(item)).filter(Boolean)
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value).sort().reduce((acc, key) => {
    if (value[key] !== undefined) acc[key] = stableValue(value[key])
    return acc
  }, {})
}

function stableHash(value = '') {
  return crypto.createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex')
}

function slug(value = '') {
  return compactText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'build-opportunity'
}

function unique(values = []) {
  return [...new Set(values.map(text).filter(Boolean))]
}

function dateValue(value) {
  const raw = text(value)
  if (!raw) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

function daysBetween(later, earlier) {
  return Math.floor((later.getTime() - earlier.getTime()) / 86_400_000)
}

function bool(value) {
  return value === true || value === 'true' || value === 1 || value === '1'
}

function normalizeUnsafeFlags(input = {}) {
  const raw = {
    ...(input.unsafeFlags && typeof input.unsafeFlags === 'object' ? input.unsafeFlags : {}),
    liveExtraction: input.liveExtraction ?? input.live_extraction,
    providerCall: input.providerCall ?? input.provider_call,
    modelCall: input.modelCall ?? input.model_call,
    crawl: input.crawl,
    clickNavigation: input.clickNavigation ?? input.click_navigation,
    authRequiredRun: input.authRequiredRun ?? input.auth_required_run,
    paidRun: input.paidRun ?? input.paid_run,
    privateSourceRun: input.privateSourceRun ?? input.private_source_run,
    externalWrite: input.externalWrite ?? input.external_write,
    formSubmit: input.formSubmit ?? input.form_submit,
    download: input.download,
    purchase: input.purchase,
    credentialMutation: input.credentialMutation ?? input.credential_mutation,
    backlogWrite: input.backlogWrite ?? input.backlog_write ?? input.autoCreateBacklogCard ?? input.auto_create_backlog_card,
    sprintMutation: input.sprintMutation ?? input.sprint_mutation,
  }
  return Object.fromEntries(Object.keys(UNSAFE_FLAG_LABELS).map(key => [key, bool(raw[key])]))
}

function unsafeReasons(flags = {}) {
  return Object.entries(flags)
    .filter(([, value]) => value === true)
    .map(([key]) => UNSAFE_FLAG_LABELS[key] || key)
}

function sourceRefsFromCandidate(candidate = {}) {
  return unique([
    ...list(candidate.sourceRefs),
    ...list(candidate.sourceLineage),
    ...list(candidate.evidenceRefs),
    ...list(candidate.evidenceLinks),
    ...list(candidate.evidenceChunkRefs),
    ...list(candidate.atomRefs),
    ...list(candidate.hitRefs),
    ...list(candidate.artifactIds),
    ...list(candidate.inputArtifactIds),
    ...list(candidate.sourceIds),
    ...list(candidate.scope?.sourceRefs),
    candidate.sourceReportArtifactId,
    candidate.reportArtifactId,
    candidate.report_artifact_id,
    candidate.sourceArtifactId,
    candidate.sourceVideoId ? `youtube:${candidate.sourceVideoId}` : '',
    candidate.videoId ? `youtube:${candidate.videoId}` : '',
    candidate.sourceUrl,
    candidate.source_url,
    ...(list(candidate.evidenceTimestamps).map(item => `timestamp:${item}`)),
    ...(list(candidate.scope?.evidenceRefs)),
  ])
}

function rawEvidenceRefsFromCandidate(candidate = {}) {
  const refs = sourceRefsFromCandidate(candidate)
  return refs.filter(ref => /^(atom|hit|intelligence_atom|intelligence_hit):/i.test(ref) || /\b(atom|hit)\b/i.test(ref))
}

function tokenize(value = '') {
  return unique(compactText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map(token => token.replace(/^-+|-+$/g, ''))
    .filter(token => token.length >= 3 && !['and', 'the', 'for', 'from', 'with', 'into', 'build', 'card'].includes(token)))
}

function tokenOverlapScore(left = '', right = '') {
  const leftTokens = new Set(tokenize(left))
  const rightTokens = new Set(tokenize(right))
  if (!leftTokens.size || !rightTokens.size) return 0
  let overlap = 0
  for (const token of leftTokens) {
    if (rightTokens.has(token)) overlap += 1
  }
  return overlap / new Set([...leftTokens, ...rightTokens]).size
}

function normalizeAction(value = '') {
  const action = text(value || 'create_backlog_card')
  return ACTION_SET.has(action) ? action : 'create_backlog_card'
}

function normalizeApproval(approval = {}) {
  const normalized = {
    approved: bool(approval.approved),
    approvedBy: text(approval.approvedBy || approval.approved_by || approval.actor),
    approvedAt: text(approval.approvedAt || approval.approved_at),
    approvalId: text(approval.approvalId || approval.approval_id),
    approvalRef: text(approval.approvalRef || approval.approval_ref),
    note: text(approval.note || approval.reason),
  }
  const presentFields = EXPLICIT_APPROVAL_FIELDS.filter(field => {
    if (field === 'approved') return approval.approved !== undefined
    return Boolean(normalized[field])
  })
  return {
    ...normalized,
    explicit: presentFields.length >= 1,
    usable: normalized.approved === true && Boolean(normalized.approvedBy) && Boolean(normalized.approvedAt),
    presentFields,
  }
}

export function normalizeBuildOpportunityCandidate(input = {}) {
  const scope = input.scope && typeof input.scope === 'object' ? input.scope : {}
  const title = compactText(input.title || input.name || input.finding || input.groupTitle || input.id)
  const summary = compactText(input.summary || input.why || input.whyItMatters || scope.why || input.reason || input.description)
  const recommendedNextStep = compactText(input.recommendedNextStep || input.nextAction || input.recommendation || scope.details || scope.what)
  const sourceRefs = sourceRefsFromCandidate({ ...input, scope })
  const candidateKey = text(input.candidateKey || input.groupId || input.id || input.suggestedCardId) ||
    `build-opportunity:${slug(title)}:${stableHash({ title, sourceRefs }).slice(0, 10)}`
  return {
    candidateKey,
    title,
    summary,
    recommendedNextStep,
    lane: text(input.lane || input.portfolioLane || input.department || 'general-aios'),
    priority: text(input.priority || 'P1'),
    rank: Number.isFinite(Number(input.rank || input.portfolioRank)) ? Number(input.rank || input.portfolioRank) : null,
    sourceIds: unique(list(input.sourceIds)),
    sourceRefs,
    rawEvidenceRefs: rawEvidenceRefsFromCandidate({ ...input, scope }),
    sourceReportArtifactId: text(input.sourceReportArtifactId || input.reportArtifactId || input.report_artifact_id),
    sourceVideoId: text(input.sourceVideoId || input.videoId || input.video_id),
    sourceUrl: text(input.sourceUrl || input.source_url),
    sourceTrustLabel: text(input.sourceTrustLabel || input.sourceTrust || input.director?.sourceTrustLabel),
    portfolioDecision: text(input.portfolioDecision || input.decision),
    portfolioScore: Number.isFinite(Number(input.portfolioScore)) ? Number(input.portfolioScore) : null,
    suggestedCardId: text(input.suggestedCardId || input.cardId),
    evidenceTimestamps: list(input.evidenceTimestamps),
    acceptanceCriteria: unique([
      ...list(input.acceptanceCriteria),
      ...list(scope.acceptanceCriteria),
    ]),
    definitionOfDone: unique([
      ...list(input.definitionOfDone),
      ...list(scope.definitionOfDone),
    ]),
    proofCommands: unique([
      ...list(input.proofCommands),
      ...list(input.proofPlan),
      ...list(scope.proofPlan),
      ...list(scope.tests),
      ...list(input.tests),
    ]),
    risks: unique([
      ...list(input.risks),
      ...list(scope.risks),
    ]),
    notNext: unique([
      ...list(input.notNext),
      ...list(input.outOfScope),
      ...list(scope.notNext),
      ...list(scope.outOfScope),
    ]),
    latestEvidenceAt: text(input.latestEvidenceAt || input.extractedAt || input.generatedAt || input.reviewedAt),
    status: text(input.status),
    unsafeFlags: normalizeUnsafeFlags(input),
    raw: input,
  }
}

export function buildBuildOpportunityEvidencePacket({
  candidate = {},
  actor = 'foundation-review',
  now = new Date().toISOString(),
} = {}) {
  const normalized = normalizeBuildOpportunityCandidate(candidate)
  const packetId = `build-opportunity-packet:${slug(normalized.title)}:${stableHash({
    candidateKey: normalized.candidateKey,
    sourceRefs: normalized.sourceRefs,
  }).slice(0, 12)}`
  return {
    packetId,
    version: 'build-opportunity-promotion-gate.v1',
    createdAt: now,
    createdBy: text(actor || 'foundation-review'),
    candidateKey: normalized.candidateKey,
    title: normalized.title,
    summary: normalized.summary,
    recommendedNextStep: normalized.recommendedNextStep,
    lane: normalized.lane,
    priority: normalized.priority,
    sourceIds: normalized.sourceIds,
    sourceRefs: normalized.sourceRefs,
    rawEvidenceRefs: normalized.rawEvidenceRefs,
    sourceReportArtifactId: normalized.sourceReportArtifactId,
    sourceVideoId: normalized.sourceVideoId,
    sourceUrl: normalized.sourceUrl,
    sourceTrustLabel: normalized.sourceTrustLabel,
    portfolioDecision: normalized.portfolioDecision,
    portfolioScore: normalized.portfolioScore,
    acceptanceCriteria: normalized.acceptanceCriteria,
    definitionOfDone: normalized.definitionOfDone,
    proofCommands: normalized.proofCommands,
    risks: normalized.risks,
    notNext: normalized.notNext,
    latestEvidenceAt: normalized.latestEvidenceAt,
    sourcePosture: 'source_backed_human_approval_required',
    writesBacklog: false,
    externalWrites: false,
    normalized,
  }
}

export function validateBuildOpportunityEvidencePacket(packet = {}) {
  const failures = []
  const sourceTrustLabel = text(packet.sourceTrustLabel).toLowerCase()
  const hasSourceAnchor = Boolean(packet.sourceReportArtifactId || packet.sourceVideoId || packet.sourceUrl || list(packet.sourceIds).length)
  const sourceRefs = list(packet.sourceRefs)

  if (text(packet.title).length < 8) failures.push('title_required')
  if (text(packet.summary).length < 24) failures.push('summary_or_why_required')
  if (text(packet.recommendedNextStep).length < 24) failures.push('recommended_next_step_required')
  if (!hasSourceAnchor) failures.push('source_anchor_required')
  if (sourceRefs.length < 2) failures.push('source_refs_required')
  if (!list(packet.rawEvidenceRefs).length) failures.push('raw_atom_or_hit_evidence_required')
  if (sourceTrustLabel.includes('scout') || sourceTrustLabel.includes('subscription')) failures.push('full_watch_or_source_packet_required')
  if (!list(packet.acceptanceCriteria).length) failures.push('acceptance_criteria_required')
  if (!list(packet.definitionOfDone).length) failures.push('definition_of_done_required')
  if (!list(packet.proofCommands).length) failures.push('proof_commands_required')
  if (!list(packet.risks).length) failures.push('risks_required')
  if (!list(packet.notNext).length) failures.push('not_next_boundaries_required')

  return {
    ok: failures.length === 0,
    failures: unique(failures),
  }
}

export function findDuplicateBuildOpportunityBacklogItems({
  candidate = {},
  existingBacklogItems = [],
} = {}) {
  const normalized = normalizeBuildOpportunityCandidate(candidate)
  const candidateText = [
    normalized.candidateKey,
    normalized.suggestedCardId,
    normalized.title,
    normalized.summary,
    normalized.recommendedNextStep,
    ...normalized.sourceRefs,
  ].join('\n')
  return (Array.isArray(existingBacklogItems) ? existingBacklogItems : [])
    .map(item => {
      const itemText = [
        item.id,
        item.title,
        item.summary,
        item.whyItMatters,
        item.nextAction,
        item.statusNote,
        item.source,
        ...(Array.isArray(item.tags) ? item.tags : []),
      ].filter(Boolean).join('\n')
      const directMatch = [item.id, item.title, item.source].map(text).some(value =>
        value && [normalized.candidateKey, normalized.suggestedCardId, normalized.title].map(text).includes(value)
      )
      const sourceOverlap = normalized.sourceRefs.some(ref => ref.length >= 8 && itemText.toLowerCase().includes(ref.toLowerCase()))
      const score = directMatch || sourceOverlap ? 1 : tokenOverlapScore(candidateText, itemText)
      return {
        id: text(item.id),
        title: text(item.title),
        lane: text(item.lane || item.status),
        score: Number(score.toFixed(3)),
      }
    })
    .filter(item => item.id && item.score >= 0.28)
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
}

export function isBuildOpportunityEvidenceStale({
  candidate = {},
  now = new Date().toISOString(),
  maxStaleDays = DEFAULT_MAX_STALE_DAYS,
} = {}) {
  const normalized = normalizeBuildOpportunityCandidate(candidate)
  const evidenceDate = dateValue(normalized.latestEvidenceAt)
  const nowDate = dateValue(now) || new Date()
  if (!evidenceDate) {
    return {
      stale: false,
      ageDays: null,
      reason: 'no_evidence_date_supplied',
    }
  }
  const ageDays = daysBetween(nowDate, evidenceDate)
  return {
    stale: ageDays > Number(maxStaleDays || DEFAULT_MAX_STALE_DAYS),
    ageDays,
    maxStaleDays: Number(maxStaleDays || DEFAULT_MAX_STALE_DAYS),
    reason: ageDays > Number(maxStaleDays || DEFAULT_MAX_STALE_DAYS) ? 'evidence_older_than_gate_window' : 'fresh',
  }
}

function buildProposedBacklogCard({ packet = {}, approval = {} } = {}) {
  const normalized = packet.normalized || {}
  const id = normalized.suggestedCardId || `BUILD-OPP-${slug(packet.title).toUpperCase().replace(/-/g, '-')}-001`.slice(0, 92)
  return {
    id,
    title: packet.title,
    lane: normalized.lane || 'scoped',
    priority: normalized.priority || 'P1',
    source: packet.packetId,
    summary: packet.summary,
    whyItMatters: `Source-backed Build Intel opportunity approved from packet ${packet.packetId}.`,
    nextAction: packet.recommendedNextStep,
    statusNote: `Proposal generated after explicit approval by ${approval.approvedBy} at ${approval.approvedAt}; applying it still requires the separate backlog write path.`,
    definitionOfDone: packet.definitionOfDone,
    acceptanceCriteria: packet.acceptanceCriteria,
    proofCommands: packet.proofCommands,
    evidencePacketId: packet.packetId,
    sourceRefs: packet.sourceRefs,
    notNextBoundaries: packet.notNext,
    risks: packet.risks,
    writesBacklog: false,
  }
}

function buildExistingCardAttachment({ packet = {}, targetCardId = '', approval = {}, note = '' } = {}) {
  return {
    targetCardId: text(targetCardId),
    attachmentType: 'build_opportunity_evidence_packet',
    evidencePacketId: packet.packetId,
    title: packet.title,
    summary: packet.summary,
    recommendedNextStep: packet.recommendedNextStep,
    sourceRefs: packet.sourceRefs,
    acceptanceCriteria: packet.acceptanceCriteria,
    proofCommands: packet.proofCommands,
    notNextBoundaries: packet.notNext,
    approvedBy: approval.approvedBy,
    approvedAt: approval.approvedAt,
    reviewNote: text(note),
    writesBacklog: false,
  }
}

function decisionLog({ status, action, packet, actor, note = '', approval = {}, duplicateBacklogItems = [], stale = {} } = {}) {
  return {
    status,
    action,
    packetId: packet.packetId,
    candidateKey: packet.candidateKey,
    reviewedBy: text(actor || approval.approvedBy || 'foundation-review'),
    reviewedAt: new Date().toISOString(),
    note: text(note),
    approvalRef: approval.approvalRef || approval.approvalId || '',
    duplicateBacklogItemIds: duplicateBacklogItems.map(item => item.id),
    stale,
    sourceRefs: packet.sourceRefs,
    noAutoBacklogPromotion: true,
    writesBacklog: false,
    externalWrites: false,
  }
}

function result({
  status,
  action,
  packet,
  actor,
  note = '',
  approval = {},
  failures = [],
  duplicateBacklogItems = [],
  stale = {},
  proposedBacklogCard = null,
  proposedAttachment = null,
} = {}) {
  return {
    ok: failures.length === 0,
    status,
    action,
    failures: unique(failures),
    proposalOnly: true,
    writesBacklog: false,
    externalWrites: false,
    requiresSteveApproval: !approval.usable,
    evidencePacket: packet,
    duplicateBacklogItems,
    stale,
    proposedBacklogCard,
    proposedAttachment,
    decisionLog: decisionLog({ status, action, packet, actor, note, approval, duplicateBacklogItems, stale }),
  }
}

export function evaluateBuildOpportunityPromotionGate({
  candidate = {},
  action = 'create_backlog_card',
  approval = {},
  existingBacklogItems = [],
  targetCardId = '',
  note = '',
  actor = 'foundation-review',
  now = new Date().toISOString(),
  maxStaleDays = DEFAULT_MAX_STALE_DAYS,
} = {}) {
  const normalizedAction = normalizeAction(action)
  const normalizedApproval = normalizeApproval(approval)
  const packet = buildBuildOpportunityEvidencePacket({ candidate, actor, now })
  const validation = validateBuildOpportunityEvidencePacket(packet)
  const duplicateBacklogItems = findDuplicateBuildOpportunityBacklogItems({ candidate, existingBacklogItems })
  const stale = isBuildOpportunityEvidenceStale({ candidate, now, maxStaleDays })
  const unsafe = unsafeReasons(packet.normalized?.unsafeFlags || {})

  if (unsafe.length) {
    return result({
      status: BUILD_OPPORTUNITY_PROMOTION_STATUS.blockedUnsafe,
      action: normalizedAction,
      packet,
      actor,
      note,
      approval: normalizedApproval,
      failures: ['external_or_runtime_side_effect_forbidden', ...unsafe],
      duplicateBacklogItems,
      stale,
    })
  }

  if (normalizedAction === 'reject') {
    const failures = []
    if (!text(note)) failures.push('reject_requires_reason')
    if (!packet.title) failures.push('title_required')
    return result({
      status: BUILD_OPPORTUNITY_PROMOTION_STATUS.rejected,
      action: normalizedAction,
      packet,
      actor,
      note,
      approval: normalizedApproval,
      failures,
      duplicateBacklogItems,
      stale,
    })
  }

  if (normalizedAction === 'mark_duplicate') {
    const failures = []
    if (!text(targetCardId)) failures.push('duplicate_requires_target_card')
    if (!text(note)) failures.push('duplicate_requires_reason')
    return result({
      status: BUILD_OPPORTUNITY_PROMOTION_STATUS.duplicateLogged,
      action: normalizedAction,
      packet,
      actor,
      note,
      approval: normalizedApproval,
      failures,
      duplicateBacklogItems,
      stale,
    })
  }

  if (normalizedAction === 'mark_stale') {
    const failures = []
    if (!text(note)) failures.push('stale_requires_refresh_reason')
    return result({
      status: BUILD_OPPORTUNITY_PROMOTION_STATUS.staleLogged,
      action: normalizedAction,
      packet,
      actor,
      note,
      approval: normalizedApproval,
      failures,
      duplicateBacklogItems,
      stale,
    })
  }

  if (!validation.ok) {
    return result({
      status: BUILD_OPPORTUNITY_PROMOTION_STATUS.needsMoreEvidence,
      action: normalizedAction,
      packet,
      actor,
      note,
      approval: normalizedApproval,
      failures: validation.failures,
      duplicateBacklogItems,
      stale,
    })
  }

  if (stale.stale) {
    return result({
      status: BUILD_OPPORTUNITY_PROMOTION_STATUS.staleNeedsRefresh,
      action: normalizedAction,
      packet,
      actor,
      note,
      approval: normalizedApproval,
      failures: ['evidence_refresh_required'],
      duplicateBacklogItems,
      stale,
    })
  }

  if (normalizedAction === 'attach_to_existing_card') {
    if (!text(targetCardId)) {
      return result({
        status: BUILD_OPPORTUNITY_PROMOTION_STATUS.targetCardRequired,
        action: normalizedAction,
        packet,
        actor,
        note,
        approval: normalizedApproval,
        failures: ['target_card_required'],
        duplicateBacklogItems,
        stale,
      })
    }
    if (!normalizedApproval.usable) {
      return result({
        status: BUILD_OPPORTUNITY_PROMOTION_STATUS.approvalRequired,
        action: normalizedAction,
        packet,
        actor,
        note,
        approval: normalizedApproval,
        failures: ['steve_approval_required'],
        duplicateBacklogItems,
        stale,
      })
    }
    return result({
      status: BUILD_OPPORTUNITY_PROMOTION_STATUS.existingCardAttachmentProposalReady,
      action: normalizedAction,
      packet,
      actor,
      note,
      approval: normalizedApproval,
      duplicateBacklogItems,
      stale,
      proposedAttachment: buildExistingCardAttachment({ packet, targetCardId, approval: normalizedApproval, note }),
    })
  }

  if (duplicateBacklogItems.length) {
    return result({
      status: BUILD_OPPORTUNITY_PROMOTION_STATUS.duplicateAttachRequired,
      action: normalizedAction,
      packet,
      actor,
      note,
      approval: normalizedApproval,
      failures: ['duplicate_existing_backlog_card_requires_attachment'],
      duplicateBacklogItems,
      stale,
    })
  }

  if (!normalizedApproval.usable) {
    return result({
      status: BUILD_OPPORTUNITY_PROMOTION_STATUS.approvalRequired,
      action: normalizedAction,
      packet,
      actor,
      note,
      approval: normalizedApproval,
      failures: ['steve_approval_required'],
      duplicateBacklogItems,
      stale,
    })
  }

  return result({
    status: BUILD_OPPORTUNITY_PROMOTION_STATUS.backlogCardProposalReady,
    action: normalizedAction,
    packet,
    actor,
    note,
    approval: normalizedApproval,
    duplicateBacklogItems,
    stale,
    proposedBacklogCard: buildProposedBacklogCard({ packet, approval: normalizedApproval }),
  })
}

export function buildBuildOpportunityPromotionGateDogfoodProof() {
  const now = '2026-05-26T03:00:00.000-04:00'
  const approval = {
    approved: true,
    approvedBy: 'Steve',
    approvedAt: now,
    approvalId: 'approval:dogfood:build-opportunity-promotion',
  }
  const candidate = {
    id: 'portfolio:god-mode-extractor:SCOPED-VIDEO-SOP-001',
    title: 'Video-to-SOP Agentic Pipeline',
    summary: 'Turn approved source-backed video evidence into structured SOP packets without losing timestamp proof.',
    recommendedNextStep: 'Create a bounded proposal-only SOP packet generator that consumes approved extractor artifacts and produces reviewable markdown.',
    lane: 'god-mode-extractor',
    priority: 'P0',
    portfolioDecision: 'standalone_scoped_candidate',
    portfolioScore: 87,
    sourceIds: ['SRC-YOUTUBE-INTEL-001'],
    sourceReportArtifactId: 'batch:mark-kashef-last-50:api-full-watch-small-batch-v1',
    sourceVideoId: 'hTWxGSsGDZU',
    sourceTrustLabel: 'api_full_watch',
    sourceRefs: [
      'atom:mark-kashef-last-50-baseline-001:api-batch:htwxgssgdzu:video-to-sop-agentic-pipeline',
      'hit:atom:mark-kashef-last-50-baseline-001:api-batch:htwxgssgdzu:video-to-sop-agentic-pipeline',
      'timestamp:04:20',
    ],
    latestEvidenceAt: now,
    acceptanceCriteria: [
      'Consumes existing approved extractor artifacts only.',
      'Every SOP section links to source report, video id, and timestamp evidence.',
    ],
    definitionOfDone: [
      'Synthetic approved video artifact renders a complete SOP packet.',
      'Missing evidence is shown as a gap instead of being invented.',
    ],
    proofCommands: [
      'node --check lib/build-opportunity-promotion-gate.js',
      'npm run process:build-opportunity-promotion-gate-check -- --json',
    ],
    risks: ['Promotion can make weak source findings look more certain than they are.'],
    notNext: [
      'Do not run a new extraction from the promotion gate.',
      'Do not create backlog cards without Steve approval.',
    ],
  }
  const weakCandidate = {
    title: 'Make agents smarter',
    summary: 'Improve agents.',
    recommendedNextStep: 'Do something better.',
    sourceRefs: ['summary-only'],
  }
  const staleCandidate = {
    ...candidate,
    id: 'portfolio:stale:video-sop',
    latestEvidenceAt: '2026-01-01T00:00:00.000-05:00',
  }
  const unsafeCandidate = {
    ...candidate,
    id: 'portfolio:unsafe:video-sop',
    liveExtraction: true,
    providerCall: true,
  }
  const existingBacklogItems = [
    {
      id: 'VIDEO-SOP-PIPELINE-001',
      title: 'Video-to-SOP Agentic Pipeline',
      summary: 'Existing backlog card for turning video evidence into SOP packets.',
      source: candidate.sourceRefs[0],
    },
  ]

  const approvalRequired = evaluateBuildOpportunityPromotionGate({ candidate, now })
  const approvedCreate = evaluateBuildOpportunityPromotionGate({ candidate, approval, now })
  const weak = evaluateBuildOpportunityPromotionGate({ candidate: weakCandidate, approval, now })
  const duplicate = evaluateBuildOpportunityPromotionGate({ candidate, approval, existingBacklogItems, now })
  const stale = evaluateBuildOpportunityPromotionGate({ candidate: staleCandidate, approval, now })
  const unsafe = evaluateBuildOpportunityPromotionGate({ candidate: unsafeCandidate, approval, now })
  const attachMissingTarget = evaluateBuildOpportunityPromotionGate({
    candidate,
    action: 'attach_to_existing_card',
    approval,
    now,
  })
  const approvedAttachment = evaluateBuildOpportunityPromotionGate({
    candidate,
    action: 'attach_to_existing_card',
    approval,
    targetCardId: 'VIDEO-SOP-PIPELINE-001',
    note: 'Approved as enrichment to existing scoped card.',
    now,
  })
  const rejected = evaluateBuildOpportunityPromotionGate({
    candidate,
    action: 'reject',
    note: 'Not aligned with current sprint order.',
    actor: 'Steve',
    now,
  })

  const checks = [
    {
      ok: approvalRequired.status === BUILD_OPPORTUNITY_PROMOTION_STATUS.approvalRequired &&
        approvalRequired.writesBacklog === false &&
        approvalRequired.failures.includes('steve_approval_required'),
      check: 'source-backed candidate without approval is gated',
      detail: approvalRequired.status,
    },
    {
      ok: approvedCreate.status === BUILD_OPPORTUNITY_PROMOTION_STATUS.backlogCardProposalReady &&
        approvedCreate.proposedBacklogCard?.writesBacklog === false &&
        approvedCreate.proposedBacklogCard?.evidencePacketId === approvedCreate.evidencePacket.packetId,
      check: 'approved candidate produces a no-write backlog proposal',
      detail: approvedCreate.proposedBacklogCard?.id || 'missing',
    },
    {
      ok: weak.status === BUILD_OPPORTUNITY_PROMOTION_STATUS.needsMoreEvidence &&
        weak.failures.includes('source_anchor_required') &&
        weak.writesBacklog === false,
      check: 'weak candidate is blocked for missing source proof',
      detail: weak.failures.join(', '),
    },
    {
      ok: duplicate.status === BUILD_OPPORTUNITY_PROMOTION_STATUS.duplicateAttachRequired &&
        duplicate.duplicateBacklogItems[0]?.id === 'VIDEO-SOP-PIPELINE-001',
      check: 'duplicate candidate must attach instead of creating another card',
      detail: duplicate.duplicateBacklogItems.map(item => item.id).join(', '),
    },
    {
      ok: stale.status === BUILD_OPPORTUNITY_PROMOTION_STATUS.staleNeedsRefresh &&
        stale.failures.includes('evidence_refresh_required'),
      check: 'stale evidence requires refresh before promotion',
      detail: `${stale.stale.ageDays} days`,
    },
    {
      ok: unsafe.status === BUILD_OPPORTUNITY_PROMOTION_STATUS.blockedUnsafe &&
        unsafe.failures.includes('live_extraction') &&
        unsafe.failures.includes('provider_call'),
      check: 'promotion gate rejects runtime/source side effects',
      detail: unsafe.failures.join(', '),
    },
    {
      ok: attachMissingTarget.status === BUILD_OPPORTUNITY_PROMOTION_STATUS.targetCardRequired,
      check: 'attachment path requires a target card',
      detail: attachMissingTarget.failures.join(', '),
    },
    {
      ok: approvedAttachment.status === BUILD_OPPORTUNITY_PROMOTION_STATUS.existingCardAttachmentProposalReady &&
        approvedAttachment.proposedAttachment?.targetCardId === 'VIDEO-SOP-PIPELINE-001' &&
        approvedAttachment.proposedAttachment?.writesBacklog === false,
      check: 'approved attachment produces a no-write existing-card patch',
      detail: approvedAttachment.proposedAttachment?.targetCardId || 'missing',
    },
    {
      ok: rejected.status === BUILD_OPPORTUNITY_PROMOTION_STATUS.rejected &&
        rejected.decisionLog.note === 'Not aligned with current sprint order.',
      check: 'reject decision preserves evidence packet and reason',
      detail: rejected.status,
    },
    {
      ok: [
        approvalRequired,
        approvedCreate,
        weak,
        duplicate,
        stale,
        unsafe,
        attachMissingTarget,
        approvedAttachment,
        rejected,
      ].every(item => item.proposalOnly === true && item.writesBacklog === false && item.externalWrites === false),
      check: 'all promotion outcomes are proposal-only and no-write',
      detail: 'proposal-only',
    },
  ]

  return {
    ok: checks.every(check => check.ok),
    checks,
    cases: {
      approvalRequired,
      approvedCreate,
      weak,
      duplicate,
      stale,
      unsafe,
      attachMissingTarget,
      approvedAttachment,
      rejected,
    },
  }
}
