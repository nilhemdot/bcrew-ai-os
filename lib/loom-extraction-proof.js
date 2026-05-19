import { validateMultimodalExtractionEnvelope } from './multimodal-extractor-contract.js'
import {
  validateWebGodmodeRequest,
  buildWebGodmodeObservation,
} from './web-godmode-extractor.js'

export const LOOM_CARD_ID = 'LOOM-001'
export const LOOM_CLOSEOUT_KEY = 'loom-extraction-preflight-v1'
export const LOOM_PLAN_PATH = 'docs/process/loom-001-plan.md'
export const LOOM_APPROVAL_PATH = 'docs/process/approvals/LOOM-001.json'
export const LOOM_SCRIPT_PATH = 'scripts/process-loom-check.mjs'
export const LOOM_CLOSEOUT_PATH = 'docs/handoffs/2026-05-19-loom-extraction-preflight-closeout.md'
export const LOOM_NEXT_CARD_ID = 'MEETING-VIDEO-001'
export const LOOM_SOURCE_ID = 'SRC-LOOM-001'
export const VIDEO_INVENTORY_TARGET_KEY = 'video-link-inventory'

export const LOOM_CHANGED_FILES = [
  'lib/loom-extraction-proof.js',
  LOOM_SCRIPT_PATH,
  'lib/foundation-build-closeout-intelligence-records.js',
  LOOM_PLAN_PATH,
  LOOM_APPROVAL_PATH,
  LOOM_CLOSEOUT_PATH,
  'package.json',
]

export const LOOM_PROOF_COMMANDS = [
  'node --check lib/loom-extraction-proof.js scripts/process-loom-check.mjs',
  'npm run process:loom-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=LOOM-001 --planApprovalRef=docs/process/approvals/LOOM-001.json --closeoutKey=loom-extraction-preflight-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=LOOM-001 --closeoutKey=loom-extraction-preflight-v1',
  'npm run process:foundation-ship -- --card=LOOM-001 --planApprovalRef=docs/process/approvals/LOOM-001.json --closeoutKey=loom-extraction-preflight-v1 --commitRef=HEAD',
]

const LOOM_HOST_PATTERN = /(^|\.)loom\.com$/i
const SHARE_PATH_PATTERN = /^\/(?:share|embed)\/([a-zA-Z0-9]+)/i

function text(value) {
  return String(value || '').trim()
}

function parseUrl(value = '') {
  try {
    return new URL(text(value))
  } catch {
    return null
  }
}

function normalizeHost(value = '') {
  return text(value).toLowerCase().replace(/^www\./, '')
}

function metadataOf(item = {}) {
  return item.metadata && typeof item.metadata === 'object' ? item.metadata : {}
}

export function classifyLoomUrl(rawUrl = '') {
  const url = parseUrl(rawUrl)
  if (!url) return { platform: 'invalid', eligible: false, reason: 'invalid_url' }
  const host = normalizeHost(url.hostname)
  if (!LOOM_HOST_PATTERN.test(host)) {
    return { platform: 'not_loom', eligible: false, reason: 'not_loom_host', host }
  }
  const shareMatch = url.pathname.match(SHARE_PATH_PATTERN)
  if (!shareMatch) {
    return {
      platform: 'loom',
      eligible: false,
      reason: 'not_video_share_or_embed_url',
      host,
      normalizedUrl: url.toString(),
      path: url.pathname,
    }
  }
  url.hash = ''
  return {
    platform: 'loom',
    eligible: true,
    reason: 'loom_share_candidate',
    host,
    normalizedUrl: url.toString(),
    videoId: shareMatch[1],
    path: url.pathname,
  }
}

export function buildLoomCandidateInventory(items = []) {
  const rows = []
  for (const item of Array.isArray(items) ? items : []) {
    const metadata = metadataOf(item)
    const url = item.externalId || metadata.normalizedUrl || metadata.rawUrl || ''
    const classification = classifyLoomUrl(url)
    if (classification.platform !== 'loom') continue
    rows.push({
      itemKey: item.itemKey || item.item_key || '',
      targetKey: item.targetKey || item.target_key || VIDEO_INVENTORY_TARGET_KEY,
      sourceId: item.sourceId || item.source_id || '',
      status: item.status || '',
      externalId: item.externalId || item.external_id || url,
      normalizedUrl: classification.normalizedUrl || url,
      videoId: classification.videoId || '',
      eligible: classification.eligible,
      reason: classification.reason,
      valueRoute: metadata.valueRoute || '',
      ownershipClass: metadata.ownershipClass || 'unknown',
      discoveredFrom: metadata.discoveredFrom || null,
      evidenceExcerptPresent: Boolean(text(metadata.evidenceExcerpt)),
    })
  }
  const eligible = rows.filter(row => row.eligible)
  const skipped = rows.filter(row => !row.eligible)
  return {
    status: eligible.length >= 3 ? 'ready_for_approval_packet' : 'needs_more_manifest_candidates',
    targetKey: VIDEO_INVENTORY_TARGET_KEY,
    sourceId: LOOM_SOURCE_ID,
    candidateCount: rows.length,
    eligibleCount: eligible.length,
    skippedCount: skipped.length,
    selectedCandidates: eligible.slice(0, 5),
    skipped,
  }
}

export function buildLoomRunApprovalPacket(inventory = {}) {
  const candidates = inventory.selectedCandidates || []
  return {
    cardId: LOOM_CARD_ID,
    sourceId: LOOM_SOURCE_ID,
    sourcePosture: 'private_or_workspace_video_source',
    status: 'approval_required',
    canRunNow: false,
    providerCandidates: ['apify-loom-youtube', 'authorized_browser_session'],
    requestedCandidateCount: candidates.length,
    candidateUrls: candidates.map(candidate => candidate.normalizedUrl),
    approvalRequiredFor: [
      'reading private/workspace Loom pages',
      'provider/browser actor call',
      'transcript/media availability lookup',
      'screenshot/visual workflow capture',
      'local artifact/ledger writes from private source content',
    ],
    blockedCommand: 'No command is approved by this card. After Steve approves a Loom run packet, create/run a source-specific governed Loom job against these candidate URLs.',
    allowedWithoutApproval: [
      'read existing local video-link-inventory manifest rows',
      'build candidate queue and run limits',
      'validate source/auth/rights boundaries',
      'prove synthetic WEB-GODMODE and multimodal envelopes',
    ],
    requiredApprovalFields: [
      'approvedBy',
      'approvedAt',
      'candidateUrls',
      'contentUseBoundary',
      'screenshotStoragePolicy',
      'providerOrBrowserPath',
      'maxVideos',
      'maxCostUsd',
      'artifactRetentionPolicy',
    ],
    nextAction: 'Park live Loom extraction as approval-bound and continue MEETING-VIDEO-001. Return here when Steve approves the exact Loom run packet.',
  }
}

export function buildSyntheticApprovedLoomObservation(candidate = {}) {
  const sourceUrl = candidate.normalizedUrl || 'https://www.loom.com/share/synthetictraining123'
  return buildWebGodmodeObservation({
    request: {
      sourceId: LOOM_SOURCE_ID,
      sourceType: 'authorized_loom_video',
      sourceUrl,
      accessClass: 'authorized_paid_private',
      rightsClass: 'steve_owned_training_candidate',
      contentUseBoundary: 'Synthetic approved fixture only; real Loom content requires a source-specific run packet.',
      allowedHosts: ['loom.com'],
      runMode: 'synthetic_no_network',
      operations: [
        'page_text',
        'dom_outline',
        'media_discovery',
        'transcript_discovery',
        'screenshot_reference',
        'workflow_observation',
      ],
      browserSessionPreflight: {
        approved: true,
        approvedBy: 'synthetic-test',
        actor: 'codex-foundation-builder',
        identity: 'synthetic Loom fixture',
        expiresAtOrReviewBy: '2026-05-20',
      },
      screenshotStoragePolicy: 'synthetic Loom screenshot references only; real screenshots require Steve-approved storage policy',
      visualEvidenceUseBoundary: 'synthetic workflow notes only; real visual evidence remains review-only until source packet approval',
    },
    html: `
      <main>
        <h1>Loom Training: Buyer Qualification Tool</h1>
        <p>The screen recording demonstrates a sales workflow and tool setup.</p>
        <a href="${sourceUrl}/transcript.vtt">Transcript</a>
        <iframe src="${sourceUrl.replace('/share/', '/embed/')}"></iframe>
      </main>
    `,
  })
}

export function buildLoomMultimodalEnvelope(candidate = {}) {
  const sourceUrl = candidate.normalizedUrl || 'https://www.loom.com/share/synthetictraining123'
  const envelope = {
    sourceId: LOOM_SOURCE_ID,
    sourceType: 'authorized_loom_video',
    sourceUrl,
    accessClass: 'authorized_paid_private',
    rightsClass: 'steve_owned_training_candidate',
    contentUseBoundary: 'Real Loom content extraction is approval-bound; this envelope proves the required output contract only.',
    evidenceLevels: ['metadata_only', 'transcript_text', 'screenshot_keyframe_reference', 'browser_session_observation'],
    route: {
      provider: 'none',
      model: 'synthetic-contract-proof',
      authPath: 'synthetic_no_network',
      estimatedCostUsd: 0,
    },
    observations: [
      {
        type: 'loom_preflight',
        text: 'Loom candidate has manifest provenance and awaits source-specific approval before live extraction.',
        sourceAnchor: sourceUrl,
      },
    ],
    sourceAnchors: [
      { id: 'manifest-row', url: sourceUrl, kind: 'video-link-inventory' },
    ],
    recommendation: 'needs_review',
    confidence: 0.68,
    screenshotStoragePolicy: 'Synthetic only; real screenshot/keyframe storage requires approved Loom packet.',
    visualEvidenceUseBoundary: 'Visual observations remain review-only until Steve approves source use.',
    accountPreflight: {
      approved: true,
      approvedBy: 'synthetic-test',
    },
    autoBacklogMutation: false,
  }
  return {
    envelope,
    validation: validateMultimodalExtractionEnvelope(envelope),
  }
}

export function buildLoomPreflightStatus({ items = [] } = {}) {
  const inventory = buildLoomCandidateInventory(items)
  const approvalPacket = buildLoomRunApprovalPacket(inventory)
  const approvedObservation = buildSyntheticApprovedLoomObservation(inventory.selectedCandidates[0])
  const blockedObservation = buildWebGodmodeObservation({
    request: {
      sourceId: LOOM_SOURCE_ID,
      sourceType: 'authorized_loom_video',
      sourceUrl: inventory.selectedCandidates[0]?.normalizedUrl || 'https://www.loom.com/share/syntheticblocked123',
      accessClass: 'authorized_paid_private',
      rightsClass: 'unknown_private_video',
      contentUseBoundary: 'Blocked fixture: private Loom content cannot be read without preflight.',
      allowedHosts: ['loom.com'],
      runMode: 'live_browser_session',
      operations: ['page_text', 'media_discovery', 'transcript_discovery', 'screenshot_reference'],
      screenshotStoragePolicy: 'blocked fixture',
      visualEvidenceUseBoundary: 'blocked fixture',
    },
  })
  const multimodal = buildLoomMultimodalEnvelope(inventory.selectedCandidates[0])
  const requestValidation = validateWebGodmodeRequest({
    sourceId: LOOM_SOURCE_ID,
    sourceType: 'authorized_loom_video',
    sourceUrl: inventory.selectedCandidates[0]?.normalizedUrl || 'https://www.loom.com/share/synthetictraining123',
    accessClass: 'authorized_paid_private',
    rightsClass: 'steve_owned_training_candidate',
    contentUseBoundary: 'Synthetic request only.',
    allowedHosts: ['loom.com'],
    runMode: 'synthetic_no_network',
    operations: ['page_text', 'media_discovery', 'transcript_discovery', 'screenshot_reference'],
    browserSessionPreflight: {
      approved: true,
      approvedBy: 'synthetic-test',
    },
    screenshotStoragePolicy: 'synthetic only',
    visualEvidenceUseBoundary: 'synthetic only',
  })
  const findings = []
  if (inventory.eligibleCount < 3) findings.push('fewer_than_three_loom_share_candidates')
  if (approvalPacket.canRunNow !== false) findings.push('approval_packet_must_not_allow_run_now')
  if (approvedObservation.ok !== true) findings.push('synthetic_approved_observation_failed')
  if (blockedObservation.ok !== false) findings.push('private_live_observation_without_preflight_did_not_block')
  if (!blockedObservation.failures.some(failure => failure.code === 'browser_session_preflight_required')) {
    findings.push('blocked_observation_missing_preflight_failure')
  }
  if (multimodal.validation.ok !== true) findings.push('multimodal_contract_failed')
  if (requestValidation.ok !== true) findings.push('web_godmode_request_validation_failed')

  return {
    ok: findings.length === 0,
    status: findings.length ? 'risk' : 'blocked_pending_approval',
    cardId: LOOM_CARD_ID,
    closeoutKey: LOOM_CLOSEOUT_KEY,
    inventory,
    approvalPacket,
    approvedObservationSummary: {
      ok: approvedObservation.ok,
      mediaCount: approvedObservation.media?.length || 0,
      transcriptCandidateCount: approvedObservation.transcriptCandidates?.length || 0,
      screenshotReferenceCount: approvedObservation.screenshotReferences?.length || 0,
      liveBrowserLaunched: approvedObservation.liveBrowserLaunched,
      networkFetched: approvedObservation.networkFetched,
    },
    blockedObservationSummary: {
      ok: blockedObservation.ok,
      status: blockedObservation.status,
      failureCodes: (blockedObservation.failures || []).map(failure => failure.code),
    },
    multimodal: {
      ok: multimodal.validation.ok,
      findings: multimodal.validation.findings,
    },
    sideEffects: {
      liveBrowserLaunched: false,
      networkFetched: false,
      providerActorCalled: false,
      transcriptFetched: false,
      videoDownloaded: false,
      screenshotBytesStored: false,
      modelCallsStarted: false,
      downstreamWritesStarted: false,
      externalWritesStarted: false,
    },
    findings,
  }
}

export function buildLoomDogfoodProof() {
  const inventory = buildLoomCandidateInventory([
    { itemKey: 'loom-1', externalId: 'https://www.loom.com/share/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', status: 'succeeded', metadata: { valueRoute: 'loom_source', evidenceExcerpt: 'training' } },
    { itemKey: 'loom-2', externalId: 'https://www.loom.com/share/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', status: 'succeeded', metadata: { valueRoute: 'loom_source', evidenceExcerpt: 'training' } },
    { itemKey: 'loom-3', externalId: 'https://www.loom.com/embed/cccccccccccccccccccccccccccccccc', status: 'succeeded', metadata: { valueRoute: 'loom_source', evidenceExcerpt: 'training' } },
    { itemKey: 'loom-marketing', externalId: 'https://www.loom.com/use-case?x=1', status: 'succeeded', metadata: { valueRoute: 'loom_source' } },
  ])
  const clean = buildLoomPreflightStatus({ items: [
    ...inventory.selectedCandidates.map(candidate => ({ itemKey: candidate.itemKey, externalId: candidate.normalizedUrl, status: 'succeeded', metadata: { valueRoute: 'loom_source', evidenceExcerpt: 'training' } })),
    ...inventory.skipped.map(candidate => ({ itemKey: candidate.itemKey, externalId: candidate.normalizedUrl, status: 'succeeded', metadata: { valueRoute: 'loom_source' } })),
  ] })
  const blocked = buildWebGodmodeObservation({
    request: {
      sourceId: LOOM_SOURCE_ID,
      sourceType: 'authorized_loom_video',
      sourceUrl: 'https://www.loom.com/share/dddddddddddddddddddddddddddddddd',
      accessClass: 'authorized_paid_private',
      rightsClass: 'unknown_private_video',
      contentUseBoundary: 'blocked fixture',
      allowedHosts: ['loom.com'],
      runMode: 'live_browser_session',
      operations: ['page_text', 'media_discovery', 'transcript_discovery'],
    },
  })
  return {
    ok: inventory.eligibleCount === 3 &&
      inventory.skippedCount === 1 &&
      clean.ok === true &&
      clean.status === 'blocked_pending_approval' &&
      clean.approvalPacket.canRunNow === false &&
      blocked.ok === false &&
      blocked.failures.some(failure => failure.code === 'browser_session_preflight_required'),
    inventory,
    cleanStatus: clean.status,
    blockedFailureCodes: blocked.failures.map(failure => failure.code),
  }
}
