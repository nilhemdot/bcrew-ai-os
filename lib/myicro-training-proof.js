import {
  COURSE_SOURCE_AUTH_BOUNDARY_APPROVAL_REQUIRED_FIELDS,
} from './course-source-auth-boundary.js'
import {
  validateMultimodalExtractionEnvelope,
} from './multimodal-extractor-contract.js'
import {
  MYICOR_EXTRACTION_PREFLIGHT_CARD_ID,
  MYICOR_EXTRACTION_PREFLIGHT_CONNECTOR_KEY,
  MYICOR_EXTRACTION_PREFLIGHT_SOURCE_ID,
  buildMyicorExtractionPreflightSnapshot,
} from './myicor-extraction-preflight.js'
import {
  buildWebGodmodeObservation,
} from './web-godmode-extractor.js'

export const MYICRO_TRAINING_CARD_ID = 'MYICRO-TRAINING-001'
export const MYICRO_TRAINING_CLOSEOUT_KEY = 'myicro-training-preflight-v1'
export const MYICRO_TRAINING_PLAN_PATH = 'docs/process/myicro-training-001-plan.md'
export const MYICRO_TRAINING_APPROVAL_PATH = 'docs/process/approvals/MYICRO-TRAINING-001.json'
export const MYICRO_TRAINING_SCRIPT_PATH = 'scripts/process-myicro-training-check.mjs'
export const MYICRO_TRAINING_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-myicro-training-preflight-closeout.md'
export const MYICRO_TRAINING_NEXT_CARD_ID = 'DRIVE-WORKER-001'

export const MYICRO_TRAINING_CHANGED_FILES = [
  'lib/myicro-training-proof.js',
  MYICRO_TRAINING_SCRIPT_PATH,
  'lib/foundation-build-closeout-intelligence-records.js',
  MYICRO_TRAINING_PLAN_PATH,
  MYICRO_TRAINING_APPROVAL_PATH,
  MYICRO_TRAINING_CLOSEOUT_PATH,
  'package.json',
]

export const MYICRO_TRAINING_PROOF_COMMANDS = [
  'node --check lib/myicro-training-proof.js scripts/process-myicro-training-check.mjs',
  'npm run process:myicro-training-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=MYICRO-TRAINING-001 --planApprovalRef=docs/process/approvals/MYICRO-TRAINING-001.json --closeoutKey=myicro-training-preflight-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=MYICRO-TRAINING-001 --closeoutKey=myicro-training-preflight-v1',
  'npm run process:foundation-ship -- --card=MYICRO-TRAINING-001 --planApprovalRef=docs/process/approvals/MYICRO-TRAINING-001.json --closeoutKey=myicro-training-preflight-v1 --commitRef=HEAD',
]

const DEFAULT_SIDE_EFFECTS = Object.freeze({
  paidAppOpened: false,
  privateAuthUsed: false,
  paidAuthUsed: false,
  authorizedBrowserOpened: false,
  courseInventoryRead: false,
  lessonNavigationStarted: false,
  lessonTextCopied: false,
  resourceLinksCopied: false,
  transcriptFetched: false,
  videoPlayedOrDownloaded: false,
  screenshotsCaptured: 0,
  keyframesCaptured: 0,
  providerCallsStarted: false,
  modelCallsStarted: false,
  researchInboxWritten: false,
  kbDraftsCreated: 0,
  atomsCreated: 0,
  actionRoutesCreated: 0,
  vectorWrites: 0,
  externalWritesStarted: false,
})

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function missingFields(row = {}, fields = []) {
  return fields.filter(field => {
    const value = row?.[field]
    return Array.isArray(value) ? value.length === 0 : !text(value)
  })
}

function sideEffectViolations(sideEffects = {}) {
  return Object.entries({ ...DEFAULT_SIDE_EFFECTS, ...sideEffects })
    .filter(([, value]) => value === true || (typeof value === 'number' && value > 0))
    .map(([key, value]) => `${key}=${value}`)
}

export function buildMyicroTrainingApprovalPacket(preflight = {}) {
  const fields = COURSE_SOURCE_AUTH_BOUNDARY_APPROVAL_REQUIRED_FIELDS.reduce((acc, field) => {
    acc[field] = 'pending_steve_source_specific_approval'
    return acc
  }, {})
  return {
    cardId: MYICRO_TRAINING_CARD_ID,
    sourceId: MYICOR_EXTRACTION_PREFLIGHT_SOURCE_ID,
    connectorKey: MYICOR_EXTRACTION_PREFLIGHT_CONNECTOR_KEY,
    sourcePosture: 'paid_private_training_app',
    status: 'approval_required',
    canRunNow: false,
    priorPreflightCardId: MYICOR_EXTRACTION_PREFLIGHT_CARD_ID,
    approvalRequiredFor: [
      'opening the Mycro/myICOR app',
      'logging in or using an authorized browser session',
      'course inventory or lesson navigation',
      'lesson text/resource extraction',
      'video playback/transcript/audio extraction',
      'screenshots/keyframes/visual workflow notes from paid content',
      'model, OCR, vision, transcription, KB, atom, vector, or action-route writes from paid content',
      'local artifact/ledger writes from paid training content',
    ],
    fields: {
      ...fields,
      sourceId: MYICOR_EXTRACTION_PREFLIGHT_SOURCE_ID,
      sourceClass: 'paid_course',
      accessOwner: 'Steve',
      approvedActor: 'pending_approval',
      approvedAccessMethod: 'authorized_browser_session_future_pending_approval',
      permittedContentTypes: 'one approved lesson only: course metadata, page text, resource inventory, transcript/audio notes if allowed, screenshot/keyframe references if allowed',
      maxScope: 'one Steve-approved lesson/page proof',
      artifactStoragePolicy: 'pending_approval; no paid content artifacts before source-specific packet',
      privacyRedactionPolicy: 'pending_approval; default internal-only',
      contentUseBoundary: preflight?.sensitivity?.contentUseBoundary || 'internal_learning_only_after_approval',
      downstreamUsePolicy: 'no KB/atom/action-route/vector writes until source-specific approval and extraction-to-KB/atom routing rules are met',
      operatorReviewCadence: 'Steve reviews first proof before any broader run',
      rollbackDeletePlan: 'delete local artifacts/ledger rows from the proof if Steve rejects content-use boundary',
      proofCommand: 'npm run process:myicro-training-check -- --close-card --json',
      expiryOrReviewDate: 'next Steve review before live run',
    },
    allowedWithoutApproval: [
      'read source contracts and source-auth rows',
      'reuse MYICOR-EXTRACTION-PREFLIGHT-001 metadata-only source/auth proof',
      'prove synthetic WEB-GODMODE and multimodal boundaries',
      'prepare the one-lesson approval packet',
    ],
    blockedCommand: 'No live Mycro/myICOR browser/provider/extraction command is approved by this card. Create/run a source-specific governed job only after Steve approves exact course/lesson scope.',
    nextAction: `Park live Mycro/myICOR training extraction as approval-bound and continue ${MYICRO_TRAINING_NEXT_CARD_ID}.`,
  }
}

export function buildSyntheticApprovedMyicroObservation() {
  return buildWebGodmodeObservation({
    request: {
      sourceId: MYICOR_EXTRACTION_PREFLIGHT_SOURCE_ID,
      sourceType: 'authorized_myicor_lesson',
      sourceUrl: 'https://learn.myicro.example/synthetic/course/lesson',
      accessClass: 'authorized_paid_private',
      rightsClass: 'steve_approved_paid_training_fixture',
      contentUseBoundary: 'Synthetic approved fixture only; real Mycro/myICOR content requires a source-specific run packet.',
      allowedHosts: ['learn.myicro.example'],
      runMode: 'synthetic_no_network',
      operations: [
        'page_text',
        'dom_outline',
        'link_discovery',
        'media_discovery',
        'transcript_discovery',
        'screenshot_reference',
        'workflow_observation',
      ],
      browserSessionPreflight: {
        approved: true,
        approvedBy: 'synthetic-test',
        actor: 'codex-foundation-builder',
        identity: 'synthetic Mycro paid-training fixture',
        expiresAtOrReviewBy: '2026-05-20',
      },
      screenshotStoragePolicy: 'synthetic Mycro screenshot references only; real screenshots require approved storage policy',
      visualEvidenceUseBoundary: 'synthetic workflow notes only; real visual evidence remains review-only until source packet approval',
    },
    html: `
      <main>
        <h1>Mycro Training Lesson: AI Team Operating System</h1>
        <p>Synthetic lesson outline only.</p>
        <a href="https://learn.myicro.example/synthetic/course/lesson/transcript.vtt">Transcript</a>
        <a href="https://learn.myicro.example/synthetic/course/lesson/resources.pdf">Resource</a>
        <iframe src="https://www.loom.com/embed/synthetic-myicro-video"></iframe>
      </main>
    `,
  })
}

export function buildMyicroMultimodalEnvelope() {
  const envelope = {
    sourceId: MYICOR_EXTRACTION_PREFLIGHT_SOURCE_ID,
    sourceType: 'authorized_myicor_lesson',
    sourceUrl: 'https://learn.myicro.example/synthetic/course/lesson',
    accessClass: 'authorized_paid_private',
    rightsClass: 'steve_approved_paid_training_fixture',
    contentUseBoundary: 'Real Mycro/myICOR extraction is approval-bound; this envelope proves the required output contract only.',
    evidenceLevels: ['metadata_only', 'transcript_text', 'screenshot_keyframe_reference', 'browser_session_observation'],
    route: {
      provider: 'none',
      model: 'synthetic-contract-proof',
      authPath: 'synthetic_no_network',
      estimatedCostUsd: 0,
    },
    observations: [
      {
        type: 'myicro_training_preflight',
        text: 'Mycro/myICOR training lesson awaits source-specific approval before content review.',
        sourceAnchor: 'SRC-MYICRO-001 synthetic lesson',
      },
    ],
    sourceAnchors: [
      { id: 'myicro-lesson', url: 'https://learn.myicro.example/synthetic/course/lesson', kind: 'synthetic_paid_training_lesson' },
    ],
    recommendation: 'needs_review',
    confidence: 0.7,
    screenshotStoragePolicy: 'Synthetic only; real screenshot/keyframe storage requires approved Mycro/myICOR packet.',
    visualEvidenceUseBoundary: 'Visual observations remain review-only until Steve approves Mycro/myICOR content use.',
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

export function buildMyicroTrainingPreflightStatus(input = {}) {
  const sourcePreflight = buildMyicorExtractionPreflightSnapshot(input)
  const approvalPacket = buildMyicroTrainingApprovalPacket(sourcePreflight)
  const requiredApprovalFieldGaps = missingFields(approvalPacket.fields, COURSE_SOURCE_AUTH_BOUNDARY_APPROVAL_REQUIRED_FIELDS)
  const sideEffects = { ...DEFAULT_SIDE_EFFECTS, ...(input.sideEffects || {}) }
  const sideEffectsStarted = sideEffectViolations(sideEffects)
  const approvedObservation = buildSyntheticApprovedMyicroObservation()
  const blockedObservation = buildWebGodmodeObservation({
    request: {
      sourceId: MYICOR_EXTRACTION_PREFLIGHT_SOURCE_ID,
      sourceType: 'authorized_myicor_lesson',
      sourceUrl: 'https://learn.myicro.example/private/course/lesson',
      accessClass: 'authorized_paid_private',
      rightsClass: 'paid_training_private',
      contentUseBoundary: 'Approval required before paid Mycro/myICOR content is accessed.',
      allowedHosts: ['learn.myicro.example'],
      runMode: 'synthetic_no_network',
      operations: ['page_text', 'media_discovery', 'screenshot_reference'],
      browserSessionPreflight: {
        approved: false,
      },
      screenshotStoragePolicy: 'required but not enough without source preflight',
      visualEvidenceUseBoundary: 'required but not enough without source preflight',
    },
    html: '<main><h1>Blocked paid Mycro lesson</h1></main>',
  })
  const multimodal = buildMyicroMultimodalEnvelope()
  const checks = [
    {
      ok: sourcePreflight.ok === true &&
        sourcePreflight.sourceId === MYICOR_EXTRACTION_PREFLIGHT_SOURCE_ID &&
        sourcePreflight.approvalRequired === true &&
        sourcePreflight.approvedExtraction === false,
      check: 'prior MyICOR source/auth preflight keeps paid training blocked',
      detail: `${sourcePreflight.status} / approved=${sourcePreflight.approvedExtraction}`,
    },
    {
      ok: sourcePreflight.connectorCredential?.status === 'blocked' &&
        sourcePreflight.connectorCredential?.safeToUse === false,
      check: 'Mycro/myICOR connector remains blocked',
      detail: `${sourcePreflight.connectorCredential?.status || 'missing'} / safe=${sourcePreflight.connectorCredential?.safeToUse}`,
    },
    {
      ok: sourcePreflight.extractionGate?.ok === false,
      check: 'source extraction gate fails closed before approval',
      detail: sourcePreflight.extractionGate?.reason || 'missing',
    },
    {
      ok: approvalPacket.canRunNow === false &&
        approvalPacket.status === 'approval_required' &&
        requiredApprovalFieldGaps.length === 0,
      check: 'one-lesson approval packet refuses runtime and names required fields',
      detail: requiredApprovalFieldGaps.join(', ') || 'complete',
    },
    {
      ok: approvedObservation.ok === true &&
        approvedObservation.liveBrowserLaunched === false &&
        approvedObservation.networkFetched === false,
      check: 'synthetic approved Mycro observation stays no-network',
      detail: approvedObservation.status,
    },
    {
      ok: blockedObservation.ok === false &&
        list(blockedObservation.failures).some(failure => failure.code === 'browser_session_preflight_required'),
      check: 'private paid Mycro observation blocks without preflight',
      detail: list(blockedObservation.failures).map(failure => failure.code).join(', '),
    },
    {
      ok: multimodal.validation.ok === true,
      check: 'Mycro multimodal envelope validates',
      detail: multimodal.validation.findings?.join(', ') || 'healthy',
    },
    {
      ok: sideEffectsStarted.length === 0,
      check: 'no paid app/auth/extraction/model/output side effects occurred',
      detail: sideEffectsStarted.join(', ') || 'none',
    },
  ]
  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    status: 'blocked_pending_source_specific_approval',
    sourceId: MYICOR_EXTRACTION_PREFLIGHT_SOURCE_ID,
    connectorKey: MYICOR_EXTRACTION_PREFLIGHT_CONNECTOR_KEY,
    sourcePreflight,
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

export function buildMyicroTrainingDogfoodProof() {
  const healthy = buildMyicroTrainingPreflightStatus()
  const extractionUnblocked = buildMyicroTrainingPreflightStatus({
    approvalPacketDraft: {
      sourceSpecificApprovalGranted: true,
      approvalRef: 'unsafe-real-approval',
    },
  })
  const sideEffectsStarted = buildMyicroTrainingPreflightStatus({
    sideEffects: {
      paidAppOpened: true,
      authorizedBrowserOpened: true,
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
    invariant: 'Mycro training preflight passes only when source/auth extraction is blocked, the one-lesson approval packet is complete but not approved, WEB-GODMODE refuses private paid content without preflight, and no paid app/auth/model/output side effects occur.',
  }
}
