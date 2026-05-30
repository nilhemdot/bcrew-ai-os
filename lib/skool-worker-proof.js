import {
  COURSE_SOURCE_AUTH_BOUNDARY_APPROVAL_REQUIRED_FIELDS,
  COURSE_SOURCE_AUTH_BOUNDARY_SOURCE_ROWS,
} from './course-source-auth-boundary.js'
import {
  buildConnectorCredentialRegistrySnapshot,
} from './connector-credential-registry.js'
import {
  validateMultimodalExtractionEnvelope,
} from './multimodal-extractor-contract.js'
import {
  getSourceConnectors,
  getSourceContracts,
} from './source-contracts.js'
import {
  SOURCE_CONTRACT_VALIDATION_PROFILES,
  assertSourceContractAllowsExtraction,
  evaluateSourceContractValidationLayer,
} from './source-contract-validation-layer.js'
import {
  buildWebGodmodeObservation,
} from './web-godmode-extractor.js'

export const SKOOL_WORKER_CARD_ID = 'SKOOL-WORKER-001'
export const SKOOL_WORKER_CLOSEOUT_KEY = 'skool-worker-preflight-v1'
export const SKOOL_WORKER_PLAN_PATH = 'docs/process/skool-worker-001-plan.md'
export const SKOOL_WORKER_APPROVAL_PATH = 'docs/process/approvals/SKOOL-WORKER-001.json'
export const SKOOL_WORKER_SCRIPT_PATH = 'scripts/process-skool-worker-check.mjs'
export const SKOOL_WORKER_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-skool-worker-preflight-closeout.md'
export const SKOOL_WORKER_NEXT_CARD_ID = 'MYICRO-TRAINING-001'
export const SKOOL_SOURCE_ID = 'SRC-SKOOL-001'
export const SKOOL_CONNECTOR_KEY = 'skool-access'
export const VIDEO_INVENTORY_TARGET_KEY = 'video-link-inventory'

export const SKOOL_WORKER_CHANGED_FILES = [
  'lib/skool-worker-proof.js',
  SKOOL_WORKER_SCRIPT_PATH,
  'lib/foundation-build-closeout-intelligence-records.js',
  SKOOL_WORKER_PLAN_PATH,
  SKOOL_WORKER_APPROVAL_PATH,
  SKOOL_WORKER_CLOSEOUT_PATH,
  'package.json',
]

export const SKOOL_WORKER_PROOF_COMMANDS = [
  'node --check lib/skool-worker-proof.js scripts/process-skool-worker-check.mjs',
  'npm run process:skool-worker-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=SKOOL-WORKER-001 --planApprovalRef=docs/process/approvals/SKOOL-WORKER-001.json --closeoutKey=skool-worker-preflight-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=SKOOL-WORKER-001 --closeoutKey=skool-worker-preflight-v1',
  'npm run process:foundation-ship -- --card=SKOOL-WORKER-001 --planApprovalRef=docs/process/approvals/SKOOL-WORKER-001.json --closeoutKey=skool-worker-preflight-v1 --commitRef=HEAD',
]

const DEFAULT_SIDE_EFFECTS = Object.freeze({
  skoolLoginStarted: false,
  privateAuthUsed: false,
  paidAuthUsed: false,
  authorizedBrowserOpened: false,
  communityCrawlStarted: false,
  courseNavigationStarted: false,
  postExtractionStarted: false,
  commentExtractionStarted: false,
  memberDataRead: false,
  embeddedVideoExtractionStarted: false,
  transcriptFetched: false,
  screenshotsCaptured: 0,
  downloadsStarted: false,
  providerCallsStarted: false,
  modelCallsStarted: false,
  downstreamWritesStarted: false,
  externalWritesStarted: false,
})

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function metadataOf(row = {}) {
  return row.metadata && typeof row.metadata === 'object' ? row.metadata : {}
}

function stableExternalId(row = {}) {
  return text(row.externalId || row.external_id)
}

function sideEffectViolations(sideEffects = {}) {
  return Object.entries({ ...DEFAULT_SIDE_EFFECTS, ...sideEffects })
    .filter(([, value]) => value === true || (typeof value === 'number' && value > 0))
    .map(([key, value]) => `${key}=${value}`)
}

function missingFields(row = {}, fields = []) {
  return fields.filter(field => {
    const value = row?.[field]
    return Array.isArray(value) ? value.length === 0 : !text(value)
  })
}

function resolveRepoTruth({
  sourceContracts = getSourceContracts(),
  sourceConnectors = getSourceConnectors(),
  authBoundaryRows = COURSE_SOURCE_AUTH_BOUNDARY_SOURCE_ROWS,
  env = process.env,
} = {}) {
  const sourceContract = sourceContracts.find(contract => contract.sourceId === SKOOL_SOURCE_ID) || null
  const authBoundaryRow = authBoundaryRows.find(row => row.sourceId === SKOOL_SOURCE_ID) || null
  const connectorRegistry = buildConnectorCredentialRegistrySnapshot({ env, sourceContracts, sourceConnectors })
  const connectorCredential = connectorRegistry.rows.find(row => row.key === SKOOL_CONNECTOR_KEY) || null
  const validation = evaluateSourceContractValidationLayer({
    sourceContracts,
    sourceConnectors,
    extractionTargets: [],
    profiles: SOURCE_CONTRACT_VALIDATION_PROFILES,
  })
  const sourceValidationRow = validation.rows.find(row => row.sourceId === SKOOL_SOURCE_ID) || null
  const extractionGate = assertSourceContractAllowsExtraction(SKOOL_SOURCE_ID, validation)
  return {
    sourceContract,
    authBoundaryRow,
    connectorCredential,
    sourceValidationRow,
    extractionGate,
  }
}

export function classifySkoolVideoLink(row = {}) {
  const metadata = metadataOf(row)
  const from = metadata.discoveredFrom && typeof metadata.discoveredFrom === 'object'
    ? metadata.discoveredFrom
    : {}
  const externalId = stableExternalId(row)
  return {
    itemKey: row.itemKey || row.item_key || '',
    externalId,
    sourceId: row.sourceId || row.source_id || '',
    platform: text(metadata.platform || '').toLowerCase() || 'unknown',
    valueRoute: metadata.valueRoute || '',
    status: row.status || '',
    sourceKind: metadata.sourceKind || '',
    discoveredFrom: {
      sourceId: from.sourceId || '',
      artifactType: from.artifactType || '',
      title: from.title || '',
      artifactId: from.artifactId || '',
    },
    route: 'link_inventory_only',
    allowedOperation: 'preserve URL/provenance only',
    blockedOperation: 'open Skool link, resolve redirect, crawl page, copy post/course/member/video content',
    nextAction: 'Use SKOOL-WORKER approval packet before resolving or opening this private/community URL.',
  }
}

export function buildSkoolAccessMatrix({ skoolVideoItems = [], repoTruth = resolveRepoTruth() } = {}) {
  const skoolRows = list(skoolVideoItems)
    .filter(row => text(metadataOf(row).platform).toLowerCase() === 'skool')
    .map(classifySkoolVideoLink)
  const matrix = [
    {
      surface: 'Mark M / Early AI-dopters Skool',
      route: 'manual_export_only',
      status: 'blocked_pending_source_specific_approval',
      sourceEvidence: 'MARK-M-SKOOL-EXTRACTION-PREFLIGHT-001',
      allowedNow: ['metadata-only source/auth packet reuse'],
      blockedUntilApproval: ['community login', 'course/classroom navigation', 'posts/comments/member reads', 'embedded video extraction'],
      nextAction: 'Ask Steve to approve exact community, actor, export/browser path, content-use, storage, and scope.',
    },
    {
      surface: 'Skool links discovered from Gmail/video manifest',
      route: 'link_inventory_only',
      status: skoolRows.length ? 'ready_for_source_packet' : 'needs_inventory_seed',
      sourceEvidence: VIDEO_INVENTORY_TARGET_KEY,
      allowedNow: ['URL/provenance preservation', 'platform classification', 'source packet drafting'],
      blockedUntilApproval: ['resolve redirect', 'open Skool page', 'crawl posts', 'copy classroom content'],
      nextAction: 'Keep links in the shared video/source queue until a source-specific packet is approved.',
    },
    {
      surface: 'Skool classroom/modules/lessons',
      route: 'needs_permission',
      status: 'blocked_pending_approved_access_method',
      sourceEvidence: 'docs/source-notes/skool-corpus.md',
      allowedNow: ['schema/worker contract only'],
      blockedUntilApproval: ['lesson text', 'resource links', 'embedded videos', 'screenshots/keyframes', 'summaries'],
      nextAction: 'Approve one bounded module before any WEB-GODMODE observation.',
    },
    {
      surface: 'Skool posts/comments/member data',
      route: 'blocked',
      status: 'blocked_by_privacy_and_policy',
      sourceEvidence: 'docs/source-notes/skool-corpus.md',
      allowedNow: ['none beyond source/auth policy notes'],
      blockedUntilApproval: ['post/comment extraction', 'member data read', 'downstream sharing'],
      nextAction: 'Do not extract unless content owner, privacy redaction, and platform policy are explicitly cleared.',
    },
    {
      surface: 'Skool embedded videos',
      route: 'needs_permission_then_platform_worker',
      status: 'blocked_pending_source_and_platform_approval',
      sourceEvidence: 'SRC-VIDEO-001 / SRC-LOOM-001 / SRC-YOUTUBE-INTEL-001',
      allowedNow: ['host classification after approved inventory'],
      blockedUntilApproval: ['video playback', 'transcript fetch', 'download', 'vision/OCR/model calls'],
      nextAction: 'After Skool source approval, route each embed to Loom/YouTube/Vimeo/Wistia/Drive worker based on host.',
    },
  ]
  return {
    ok: repoTruth.sourceContract?.sourceId === SKOOL_SOURCE_ID &&
      repoTruth.authBoundaryRow?.extractionAllowed === false &&
      repoTruth.connectorCredential?.safeToUse === false &&
      skoolRows.length >= 10 &&
      matrix.every(row => ['manual_export_only', 'link_inventory_only', 'needs_permission', 'blocked', 'needs_permission_then_platform_worker'].includes(row.route)),
    sourceId: SKOOL_SOURCE_ID,
    connectorKey: SKOOL_CONNECTOR_KEY,
    skoolLinkCount: skoolRows.length,
    selectedLinks: skoolRows.slice(0, 10),
    matrix,
  }
}

export function buildSkoolWorkerApprovalPacket(matrixStatus = {}) {
  const fields = COURSE_SOURCE_AUTH_BOUNDARY_APPROVAL_REQUIRED_FIELDS.reduce((acc, field) => {
    acc[field] = 'pending_steve_source_specific_approval'
    return acc
  }, {})
  return {
    cardId: SKOOL_WORKER_CARD_ID,
    sourceId: SKOOL_SOURCE_ID,
    sourcePosture: 'private_community_paid_or_auth',
    status: 'approval_required',
    canRunNow: false,
    skoolLinkCount: matrixStatus.skoolLinkCount || 0,
    approvalRequiredFor: [
      'opening or resolving Skool links',
      'logging in or using an authorized browser session',
      'community/course/classroom navigation',
      'post/comment/member extraction',
      'lesson/resource/video extraction',
      'screenshots/keyframes/transcripts/summaries/model calls',
      'local artifact/ledger writes from private Skool content',
    ],
    fields: {
      ...fields,
      sourceId: SKOOL_SOURCE_ID,
      sourceClass: 'private_community',
      accessOwner: 'Steve',
      approvedActor: 'pending_approval',
      approvedAccessMethod: 'manual_export_or_authorized_browser_session_pending_approval',
      proofCommand: 'npm run process:skool-worker-check -- --close-card --json',
    },
    blockedCommand: 'No live Skool browser/crawler command is approved by this card. Create/run a source-specific governed Skool job after Steve approves exact community/module scope.',
    allowedWithoutApproval: [
      'read source contracts and source-auth rows',
      'read local Skool URL inventory rows',
      'build access matrix and approval packet',
      'prove synthetic WEB-GODMODE and multimodal Skool boundaries',
    ],
    nextAction: `Park live Skool worker execution as approval-bound and continue ${SKOOL_WORKER_NEXT_CARD_ID}.`,
  }
}

export function buildSyntheticApprovedSkoolObservation() {
  return buildWebGodmodeObservation({
    request: {
      sourceId: SKOOL_SOURCE_ID,
      sourceType: 'authorized_skool_lesson',
      sourceUrl: 'https://www.skool.com/synthetic/community/classroom/module',
      accessClass: 'authorized_paid_private',
      rightsClass: 'steve_approved_private_community_fixture',
      contentUseBoundary: 'Synthetic approved fixture only; real Skool content requires a source-specific run packet.',
      allowedHosts: ['skool.com'],
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
        identity: 'synthetic Skool fixture',
        expiresAtOrReviewBy: '2026-05-20',
      },
      screenshotStoragePolicy: 'synthetic Skool screenshot references only; real screenshots require approved storage policy',
      visualEvidenceUseBoundary: 'synthetic workflow notes only; real visual evidence remains review-only until source packet approval',
    },
    html: `
      <main>
        <h1>Skool Classroom Module: AI Team Operating System</h1>
        <p>Synthetic module outline only.</p>
        <a href="https://www.skool.com/synthetic/community/classroom/module/transcript.vtt">Transcript</a>
        <iframe src="https://www.loom.com/embed/synthetic-skool-video"></iframe>
      </main>
    `,
  })
}

export function buildSkoolMultimodalEnvelope() {
  const envelope = {
    sourceId: SKOOL_SOURCE_ID,
    sourceType: 'authorized_skool_lesson',
    sourceUrl: 'https://www.skool.com/synthetic/community/classroom/module',
    accessClass: 'authorized_paid_private',
    rightsClass: 'steve_approved_private_community_fixture',
    contentUseBoundary: 'Real Skool extraction is approval-bound; this envelope proves the required output contract only.',
    evidenceLevels: ['metadata_only', 'transcript_text', 'screenshot_keyframe_reference', 'browser_session_observation'],
    route: {
      provider: 'none',
      model: 'synthetic-contract-proof',
      authPath: 'synthetic_no_network',
      estimatedCostUsd: 0,
    },
    observations: [
      {
        type: 'skool_worker_preflight',
        text: 'Skool module/classroom awaits source-specific approval before content review.',
        sourceAnchor: 'SRC-SKOOL-001 synthetic module',
      },
    ],
    sourceAnchors: [
      { id: 'skool-module', url: 'https://www.skool.com/synthetic/community/classroom/module', kind: 'synthetic_skool_module' },
    ],
    recommendation: 'needs_review',
    confidence: 0.68,
    screenshotStoragePolicy: 'Synthetic only; real screenshot/keyframe storage requires approved Skool packet.',
    visualEvidenceUseBoundary: 'Visual observations remain review-only until Steve approves Skool content use.',
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

export function buildSkoolWorkerPreflightStatus(input = {}) {
  const repoTruth = resolveRepoTruth(input)
  const matrixStatus = buildSkoolAccessMatrix({ skoolVideoItems: input.skoolVideoItems, repoTruth })
  const approvalPacket = buildSkoolWorkerApprovalPacket(matrixStatus)
  const requiredApprovalFieldGaps = missingFields(approvalPacket.fields, COURSE_SOURCE_AUTH_BOUNDARY_APPROVAL_REQUIRED_FIELDS)
  const sideEffects = { ...DEFAULT_SIDE_EFFECTS, ...(input.sideEffects || {}) }
  const sideEffectsStarted = sideEffectViolations(sideEffects)
  const approvedObservation = buildSyntheticApprovedSkoolObservation()
  const blockedObservation = buildWebGodmodeObservation({
    request: {
      sourceId: SKOOL_SOURCE_ID,
      sourceType: 'authorized_skool_lesson',
      sourceUrl: 'https://www.skool.com/synthetic/private-module',
      accessClass: 'authorized_paid_private',
      rightsClass: 'private_community_training',
      contentUseBoundary: 'Approval required before private Skool content is accessed.',
      allowedHosts: ['skool.com'],
      runMode: 'synthetic_no_network',
      operations: ['page_text', 'media_discovery', 'screenshot_reference'],
      browserSessionPreflight: {
        approved: false,
      },
      screenshotStoragePolicy: 'required but not enough without source preflight',
      visualEvidenceUseBoundary: 'required but not enough without source preflight',
    },
    html: '<main><h1>Blocked private Skool module</h1></main>',
  })
  const multimodal = buildSkoolMultimodalEnvelope()
  const checks = [
    {
      ok: repoTruth.sourceContract?.sourceId === SKOOL_SOURCE_ID,
      check: 'source contract exists',
      detail: repoTruth.sourceContract?.sourceId || 'missing',
    },
    {
      ok: repoTruth.sourceContract?.status === 'Gap' && repoTruth.sourceContract?.validation === 'Not Signed Off',
      check: 'source contract remains gap/not signed off',
      detail: `${repoTruth.sourceContract?.status || 'missing'} / ${repoTruth.sourceContract?.validation || 'missing'}`,
    },
    {
      ok: repoTruth.authBoundaryRow?.sourceClass === 'private_community' &&
        repoTruth.authBoundaryRow?.extractionAllowed === false &&
        repoTruth.authBoundaryRow?.approvalRequired === true,
      check: 'source-auth boundary blocks Skool extraction',
      detail: `${repoTruth.authBoundaryRow?.sourceClass || 'missing'} / allowed=${repoTruth.authBoundaryRow?.extractionAllowed}`,
    },
    {
      ok: repoTruth.connectorCredential?.status === 'blocked' &&
        repoTruth.connectorCredential?.safeToUse === false,
      check: 'Skool connector remains blocked',
      detail: `${repoTruth.connectorCredential?.status || 'missing'} / safe=${repoTruth.connectorCredential?.safeToUse}`,
    },
    {
      ok: repoTruth.extractionGate?.ok === false,
      check: 'source extraction gate fails closed before approval',
      detail: repoTruth.extractionGate?.reason || 'missing',
    },
    {
      ok: matrixStatus.ok,
      check: 'Skool worker access matrix is complete and source-backed',
      detail: `${matrixStatus.matrix.length} routes / ${matrixStatus.skoolLinkCount} links`,
    },
    {
      ok: approvalPacket.canRunNow === false && requiredApprovalFieldGaps.length === 0,
      check: 'approval packet refuses runtime and names required fields',
      detail: requiredApprovalFieldGaps.join(', ') || 'complete',
    },
    {
      ok: approvedObservation.ok === true && approvedObservation.liveBrowserLaunched === false && approvedObservation.networkFetched === false,
      check: 'synthetic approved Skool observation stays no-network',
      detail: approvedObservation.status,
    },
    {
      ok: blockedObservation.ok === false &&
        list(blockedObservation.failures).some(failure => failure.code === 'browser_session_preflight_required'),
      check: 'private Skool observation blocks without preflight',
      detail: list(blockedObservation.failures).map(failure => failure.code).join(', '),
    },
    {
      ok: multimodal.validation.ok === true,
      check: 'Skool multimodal envelope validates',
      detail: multimodal.validation.findings?.join(', ') || 'healthy',
    },
    {
      ok: sideEffectsStarted.length === 0,
      check: 'no Skool auth/extraction/model/output side effects occurred',
      detail: sideEffectsStarted.join(', ') || 'none',
    },
  ]
  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    status: 'blocked_pending_source_specific_approval',
    sourceId: SKOOL_SOURCE_ID,
    connectorKey: SKOOL_CONNECTOR_KEY,
    repoTruth,
    matrixStatus,
    approvalPacket,
    approvedObservationSummary: {
      ok: approvedObservation.ok,
      status: approvedObservation.status,
      liveBrowserLaunched: approvedObservation.liveBrowserLaunched,
      networkFetched: approvedObservation.networkFetched,
      mediaCount: approvedObservation.media?.length || 0,
      transcriptCandidateCount: approvedObservation.transcriptCandidates?.length || 0,
    },
    blockedObservationSummary: {
      ok: blockedObservation.ok,
      status: blockedObservation.status,
      failureCodes: list(blockedObservation.failures).map(item => item.code),
    },
    multimodal: {
      ok: multimodal.validation.ok,
      findings: multimodal.validation.findings || [],
    },
    sideEffects,
    checks,
    failed,
  }
}

export function buildSkoolWorkerDogfoodProof() {
  const healthy = buildSkoolWorkerPreflightStatus({
    skoolVideoItems: Array.from({ length: 12 }, (_, index) => ({
      itemKey: `video-link:skool:synthetic-${index}`,
      externalId: `https://link.skool.com/synthetic/${index}`,
      status: 'succeeded',
      metadata: {
        platform: 'skool',
        valueRoute: 'skool_source',
        sourceKind: 'shared_communication_artifact',
      },
    })),
  })
  const extractionUnblocked = buildSkoolWorkerPreflightStatus({
    authBoundaryRows: COURSE_SOURCE_AUTH_BOUNDARY_SOURCE_ROWS.map(row =>
      row.sourceId === SKOOL_SOURCE_ID
        ? { ...row, extractionAllowed: true, approvalRequired: false }
        : row
    ),
    skoolVideoItems: Array.from({ length: 12 }, (_, index) => ({
      itemKey: `video-link:skool:unsafe-${index}`,
      externalId: `https://link.skool.com/unsafe/${index}`,
      status: 'succeeded',
      metadata: { platform: 'skool' },
    })),
  })
  const sideEffectsStarted = buildSkoolWorkerPreflightStatus({
    skoolVideoItems: Array.from({ length: 12 }, (_, index) => ({
      itemKey: `video-link:skool:side-effect-${index}`,
      externalId: `https://link.skool.com/side-effect/${index}`,
      status: 'succeeded',
      metadata: { platform: 'skool' },
    })),
    sideEffects: {
      skoolLoginStarted: true,
      communityCrawlStarted: true,
      modelCallsStarted: true,
    },
  })
  const rejectedCases = {
    extractionUnblocked: extractionUnblocked.ok === false,
    sideEffectsStarted: sideEffectsStarted.ok === false,
  }
  return {
    ok: healthy.ok === true && Object.values(rejectedCases).every(Boolean),
    healthy,
    rejectedCases,
    invariant: 'Skool worker preflight passes only when source/auth extraction is blocked, Skool URL rows are inventory-only, approval fields are complete, private browser access is preflighted, and no auth/extraction/model/output side effects occur.',
  }
}
