import {
  BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CLOSEOUT_KEY,
} from './build-intel-extraction-implementation.js'
import {
  buildCreatorWatchlistSnapshot,
} from './build-intel-watchlist.js'

export const BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CARD_ID = 'BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001'
export const BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CLOSEOUT_KEY = 'build-intel-daily-extraction-review-v1'
export const BUILD_INTEL_DAILY_EXTRACTION_REVIEW_PLAN_PATH = 'docs/process/build-intel-daily-extraction-review-001-plan.md'
export const BUILD_INTEL_DAILY_EXTRACTION_REVIEW_APPROVAL_PATH = 'docs/process/approvals/BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001.json'
export const BUILD_INTEL_DAILY_EXTRACTION_REVIEW_SCRIPT_PATH = 'scripts/process-build-intel-daily-extraction-review-check.mjs'
export const BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CLOSEOUT_PATH = 'docs/handoffs/2026-05-19-build-intel-daily-extraction-review-closeout.md'
export const BUILD_INTEL_DAILY_EXTRACTION_REVIEW_NEXT_CARD_ID = 'SOURCE-019'

export const BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CHANGED_FILES = [
  'lib/build-intel-daily-extraction-review.js',
  BUILD_INTEL_DAILY_EXTRACTION_REVIEW_SCRIPT_PATH,
  'lib/foundation-build-closeout-intelligence-records.js',
  BUILD_INTEL_DAILY_EXTRACTION_REVIEW_PLAN_PATH,
  BUILD_INTEL_DAILY_EXTRACTION_REVIEW_APPROVAL_PATH,
  BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CLOSEOUT_PATH,
  'package.json',
]

export const BUILD_INTEL_DAILY_EXTRACTION_REVIEW_PROOF_COMMANDS = [
  'node --check lib/build-intel-daily-extraction-review.js scripts/process-build-intel-daily-extraction-review-check.mjs',
  'npm run process:build-intel-daily-extraction-review-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001 --planApprovalRef=docs/process/approvals/BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001.json --closeoutKey=build-intel-daily-extraction-review-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001 --closeoutKey=build-intel-daily-extraction-review-v1',
  'npm run process:foundation-ship -- --card=BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001 --planApprovalRef=docs/process/approvals/BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001.json --closeoutKey=build-intel-daily-extraction-review-v1 --commitRef=HEAD',
]

export const BUILD_INTEL_REVIEW_DECISION_STATES = [
  'needs_review',
  'promote_candidate',
  'archive_candidate',
  'blocked_approval',
]

export const BUILD_INTEL_REVIEW_ALLOWED_DECISIONS = [
  'promote_to_research_inbox',
  'enrich_existing_backlog_card',
  'create_scoped_backlog_card_after_review',
  'archive_no_action',
  'request_more_evidence',
  'block_pending_approval',
]

const FORBIDDEN_CONTENT_KEYS = [
  'rawTranscript',
  'raw_transcript',
  'contentText',
  'content_text',
  'body',
  'html',
  'fullText',
  'full_text',
  'excerpt',
]

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function unique(values = []) {
  return [...new Set(values.map(value => text(value)).filter(Boolean))]
}

function slug(value = '') {
  return text(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item'
}

function stableSourceUrl(value = '') {
  return text(value) || 'archive://missing-source-url'
}

function insightTypeForObservation(observation = {}) {
  const theme = text(observation.theme)
  if (/folder|structure|flow/.test(theme)) return 'implementation_structure'
  if (/agent|team|role/.test(theme)) return 'agent_system_design'
  if (/prompt|context|memory/.test(theme)) return 'prompt_context_memory'
  if (/setup|local|proof|extraction/.test(theme)) return 'extraction_workflow'
  return 'implementation_pattern'
}

function applicabilityForObservation(observation = {}) {
  const confidence = text(observation.confidence)
  const relatedCards = list(observation.relatedCards)
  const score = confidence === 'high' ? 5 : relatedCards.length ? 4 : 3
  return {
    score,
    label: score >= 5 ? 'high' : score >= 4 ? 'medium_high' : 'medium',
    reason: relatedCards.length
      ? `Links to ${relatedCards.length} existing backlog card(s).`
      : 'Needs Steve/Codex review before it becomes scope.',
  }
}

function boundaryForObservation(observation = {}, envelope = {}) {
  return {
    accessClass: envelope.accessClass || 'public_permitted',
    rightsClass: envelope.rightsClass || 'public_transcript_archive_via_permitted_subtitle_extractor',
    contentUseBoundary: envelope.contentUseBoundary || 'Implementation intelligence only; cite source anchors and do not reproduce transcript text.',
    privateOrPaid: false,
    approvalRequired: false,
  }
}

function hasForbiddenRawContentKeys(value, path = []) {
  if (!value || typeof value !== 'object') return []
  const findings = []
  for (const [key, child] of Object.entries(value)) {
    const childPath = [...path, key]
    if (FORBIDDEN_CONTENT_KEYS.includes(key)) findings.push(`raw_content_key:${childPath.join('.')}`)
    if (child && typeof child === 'object') findings.push(...hasForbiddenRawContentKeys(child, childPath))
  }
  return findings
}

function blockedReviewItemFromSource(source = {}, index = 0) {
  const label = text(source.source) || `blocked-source-${index + 1}`
  return {
    reviewItemId: `build-intel-blocked:${slug(label)}`,
    sourceId: `blocked:${slug(label)}`,
    sourceTitle: label,
    sourceUrl: 'approval://source-specific-run-packet-required',
    evidenceLevels: [],
    evidenceLinks: [],
    insightType: 'approval_boundary',
    bcrewApplicability: {
      score: 4,
      label: 'medium_high',
      reason: 'Potentially valuable Build Intel source, but live content access is approval-bound.',
    },
    relatedBacklogCardIds: ['WEB-GODMODE-001'],
    recommendation: text(source.reason) || 'Create a source-specific approval packet before extraction.',
    decisionState: 'blocked_approval',
    allowedDecisions: ['block_pending_approval', 'request_more_evidence', 'archive_no_action'],
    promoteTarget: null,
    proofLinks: [BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CLOSEOUT_KEY],
    sourceBoundary: {
      accessClass: 'paid_or_private_approval_required',
      rightsClass: 'unknown_until_source_packet_approved',
      contentUseBoundary: 'Do not access, extract, transcribe, screenshot, or route until Steve approves the exact source/run packet.',
      privateOrPaid: true,
      approvalRequired: true,
    },
    blockedActions: [
      'private_or_paid_content_read',
      'browser_login',
      'media_download',
      'screenshot_storage',
      'provider_model_call',
      'downstream_atom_or_backlog_write',
    ],
    proposalOnly: true,
    writesBacklog: false,
    writesAtoms: false,
    writesKnowledgeBase: false,
    externalWrites: false,
    requiresSteveReview: true,
  }
}

export function buildReviewItemsFromBuildIntelSnapshot(snapshot = {}, { limit = 10 } = {}) {
  const observations = list(snapshot.observations)
  const envelopesByUrl = new Map(list(snapshot.multimodalEnvelopes).map(envelope => [stableSourceUrl(envelope.sourceUrl), envelope]))
  const proposalsByTheme = new Map()
  for (const row of list(snapshot.researchInboxRows)) {
    const sourceRef = text(row.item?.sourceRef)
    const theme = decodeURIComponent(sourceRef.split('#').pop() || '')
    if (theme) proposalsByTheme.set(theme, row)
  }

  const reviewItems = observations.slice(0, Math.max(1, Number(limit) || 10)).map((observation, index) => {
    const sourceUrl = stableSourceUrl(observation.sourceUrl)
    const envelope = envelopesByUrl.get(sourceUrl) || {}
    const proposal = proposalsByTheme.get(text(observation.theme)) || list(snapshot.researchInboxRows)[index] || {}
    const relatedBacklogCardIds = unique([
      ...list(observation.relatedCards),
      ...list(proposal.item?.relatedCards),
    ])
    const decisionState = relatedBacklogCardIds.length ? 'promote_candidate' : 'needs_review'
    return {
      reviewItemId: `build-intel-review:${slug(observation.sourceArtifactId || observation.sourceTitle)}:${slug(observation.theme)}`,
      sourceId: observation.sourceArtifactId || envelope.sourceId || 'build-intel-archive',
      sourceTitle: text(observation.sourceTitle) || 'Build Intel source artifact',
      sourceUrl,
      evidenceLevels: unique([...(list(observation.evidenceLevels)), ...(list(envelope.evidenceLevels))]),
      evidenceLinks: unique([
        sourceUrl,
        observation.sourceArtifactId ? `shared_communication_artifacts:${observation.sourceArtifactId}` : '',
        BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CLOSEOUT_KEY,
      ]),
      insightType: insightTypeForObservation(observation),
      bcrewApplicability: applicabilityForObservation(observation),
      relatedBacklogCardIds,
      recommendation: text(observation.recommendation) || text(proposal.item?.recommendation) || 'Review before promoting.',
      decisionState,
      allowedDecisions: BUILD_INTEL_REVIEW_ALLOWED_DECISIONS,
      promoteTarget: decisionState === 'promote_candidate' ? 'research_inbox_proposal' : 'manual_review',
      proofLinks: unique([
        BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CLOSEOUT_KEY,
        proposal.promotionProposal?.cardId,
        ...(list(proposal.item?.evidenceLinks)),
      ]),
      sourceBoundary: boundaryForObservation(observation, envelope),
      blockedActions: [],
      proposalOnly: true,
      writesBacklog: false,
      writesAtoms: false,
      writesKnowledgeBase: false,
      externalWrites: false,
      requiresSteveReview: true,
    }
  })

  return [
    ...reviewItems,
    ...list(snapshot.brief?.blockedSources).map(blockedReviewItemFromSource),
  ]
}

export function validateBuildIntelReviewItem(item = {}) {
  const findings = []
  const requiredTextFields = [
    'reviewItemId',
    'sourceId',
    'sourceTitle',
    'sourceUrl',
    'insightType',
    'recommendation',
    'decisionState',
  ]
  for (const field of requiredTextFields) {
    if (!text(item[field])) findings.push(`${field}_missing`)
  }
  if (!BUILD_INTEL_REVIEW_DECISION_STATES.includes(item.decisionState)) findings.push('decision_state_invalid')
  if (!Array.isArray(item.evidenceLevels)) findings.push('evidence_levels_missing')
  if (!Array.isArray(item.evidenceLinks)) findings.push('evidence_links_missing')
  if (!Array.isArray(item.relatedBacklogCardIds)) findings.push('related_backlog_cards_missing')
  if (!Array.isArray(item.allowedDecisions) || !item.allowedDecisions.includes('archive_no_action')) findings.push('archive_decision_missing')
  if (
    item.decisionState !== 'blocked_approval' &&
    (!Array.isArray(item.allowedDecisions) || !item.allowedDecisions.some(decision => decision.includes('promote') || decision.includes('enrich')))
  ) {
    findings.push('promote_decision_missing')
  }
  if (item.proposalOnly !== true) findings.push('proposal_only_required')
  if (item.writesBacklog === true) findings.push('writes_backlog_forbidden')
  if (item.writesAtoms === true) findings.push('writes_atoms_forbidden')
  if (item.writesKnowledgeBase === true) findings.push('writes_kb_forbidden')
  if (item.externalWrites === true) findings.push('external_writes_forbidden')
  if (item.sourceBoundary?.privateOrPaid === true && item.decisionState !== 'blocked_approval') findings.push('private_paid_source_must_be_blocked_approval')
  if (item.decisionState === 'blocked_approval' && item.sourceBoundary?.approvalRequired !== true) findings.push('blocked_item_needs_approval_boundary')
  if (item.decisionState !== 'blocked_approval' && !item.evidenceLinks?.length) findings.push('review_item_needs_evidence_links')
  if (!item.bcrewApplicability || Number(item.bcrewApplicability.score || 0) < 1) findings.push('applicability_missing')
  findings.push(...hasForbiddenRawContentKeys(item))
  return {
    ok: findings.length === 0,
    findings,
  }
}

export function buildBuildIntelDailyExtractionReviewSnapshot({
  extractionSnapshot = {},
  watchlist = buildCreatorWatchlistSnapshot(),
  generatedAt = new Date().toISOString(),
  limit = 10,
} = {}) {
  const reviewItems = buildReviewItemsFromBuildIntelSnapshot(extractionSnapshot, { limit })
  const validations = reviewItems.map(item => ({
    reviewItemId: item.reviewItemId,
    validation: validateBuildIntelReviewItem(item),
  }))
  const failedValidations = validations.filter(row => row.validation.ok !== true)
  const publicReadyCount = reviewItems.filter(item => item.decisionState !== 'blocked_approval').length
  const blockedApprovalCount = reviewItems.filter(item => item.decisionState === 'blocked_approval').length
  const promoteCandidateCount = reviewItems.filter(item => item.decisionState === 'promote_candidate').length
  const archiveCandidateCount = reviewItems.filter(item => item.decisionState === 'archive_candidate').length
  const watchlistBuildIntelCount = list(watchlist.entries).filter(entry => entry.sourceCategory === 'build_intel').length

  return {
    status: reviewItems.length && failedValidations.length === 0 && publicReadyCount > 0 ? 'ready' : 'risk',
    cardId: BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CARD_ID,
    closeoutKey: BUILD_INTEL_DAILY_EXTRACTION_REVIEW_CLOSEOUT_KEY,
    upstreamCloseoutKey: BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CLOSEOUT_KEY,
    generatedAt,
    cadence: {
      dailyMaxReviewItems: Math.max(1, Number(limit) || 10),
      weeklySteveScan: true,
      staleReviewEscalationDays: 7,
    },
    policy: {
      proposalOnly: true,
      autoBacklogMutation: false,
      autoAtomWrite: false,
      autoKnowledgeBaseWrite: false,
      externalWrites: false,
      privatePaidSourcesRequireApproval: true,
      evidenceStoragePolicy: 'source anchors and metadata only unless a source-specific packet approves transcript/media/screenshot storage.',
    },
    sourceCoverage: {
      watchlistBuildIntelCount,
      extractionStatus: extractionSnapshot.status || 'unknown',
      selectedTranscriptArtifacts: Number(extractionSnapshot.selectedTranscriptArtifacts || 0),
      observations: list(extractionSnapshot.observations).length,
      researchInboxRows: list(extractionSnapshot.researchInboxRows).length,
      publicYoutubeCandidateCount: Number(extractionSnapshot.publicYoutubeCandidateCount || 0),
    },
    summary: {
      reviewItemCount: reviewItems.length,
      publicReadyCount,
      blockedApprovalCount,
      promoteCandidateCount,
      archiveCandidateCount,
      failedValidationCount: failedValidations.length,
    },
    reviewItems,
    validations,
    failedValidations,
    nextAction: `Review/promote Build Intel items, then continue ${BUILD_INTEL_DAILY_EXTRACTION_REVIEW_NEXT_CARD_ID}.`,
    notNext: [
      'No automatic backlog mutation from Build Intel items.',
      'No atom, KB, vector, action-route, or external writes.',
      'No paid/private Skool, Loom, Mycro/myICOR, browser-auth, screenshot, OCR, keyframe, model, or transcription work without source-specific approval.',
      'No new source crawling from this daily review queue card.',
    ],
  }
}

export function buildBuildIntelDailyExtractionReviewDogfoodProof() {
  const validPublic = validateBuildIntelReviewItem({
    reviewItemId: 'build-intel-review:synthetic:agent-system-design',
    sourceId: 'artifact:synthetic',
    sourceTitle: 'Synthetic public Build Intel item',
    sourceUrl: 'https://example.com/build-intel',
    evidenceLevels: ['transcript_text'],
    evidenceLinks: ['https://example.com/build-intel', 'shared_communication_artifacts:synthetic'],
    insightType: 'agent_system_design',
    bcrewApplicability: { score: 4, label: 'medium_high', reason: 'Synthetic valid row.' },
    relatedBacklogCardIds: ['SOURCE-019'],
    recommendation: 'Review and enrich SOURCE-019.',
    decisionState: 'promote_candidate',
    allowedDecisions: BUILD_INTEL_REVIEW_ALLOWED_DECISIONS,
    promoteTarget: 'research_inbox_proposal',
    sourceBoundary: { privateOrPaid: false, approvalRequired: false },
    proposalOnly: true,
    writesBacklog: false,
    writesAtoms: false,
    writesKnowledgeBase: false,
    externalWrites: false,
  })
  const missingSource = validateBuildIntelReviewItem({
    ...blockedReviewItemFromSource({ source: 'Broken' }),
    sourceUrl: '',
  })
  const privatePromoted = validateBuildIntelReviewItem({
    ...blockedReviewItemFromSource({ source: 'Paid source' }),
    decisionState: 'promote_candidate',
  })
  const rawContentLeak = validateBuildIntelReviewItem({
    ...blockedReviewItemFromSource({ source: 'Leak' }),
    rawTranscript: 'This raw transcript body should never live in the review queue.',
  })
  const autoWrite = validateBuildIntelReviewItem({
    ...blockedReviewItemFromSource({ source: 'Auto write' }),
    writesBacklog: true,
  })
  const rejectedCases = {
    missingSource: missingSource.ok === false && missingSource.findings.includes('sourceUrl_missing'),
    privatePromoted: privatePromoted.ok === false && privatePromoted.findings.includes('private_paid_source_must_be_blocked_approval'),
    rawContentLeak: rawContentLeak.ok === false && rawContentLeak.findings.some(finding => finding.startsWith('raw_content_key')),
    autoWrite: autoWrite.ok === false && autoWrite.findings.includes('writes_backlog_forbidden'),
  }
  return {
    ok: validPublic.ok === true && Object.values(rejectedCases).every(Boolean),
    validPublic,
    rejectedCases,
  }
}
