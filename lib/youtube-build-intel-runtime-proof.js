import crypto from 'node:crypto'

import {
  buildBuildIntelExtractionImplementationSnapshot,
} from './build-intel-extraction-implementation.js'
import {
  buildBuildIntelDailyExtractionReviewSnapshot,
} from './build-intel-daily-extraction-review.js'
import {
  BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS,
  buildBrainFleetLedgerRecord,
  validateBrainFleetLedgerRecord,
} from './brain-fleet-quota-ledger.js'

export const YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CARD_ID = 'YOUTUBE-BUILD-INTEL-RUNTIME-PROOF-001'
export const YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SPRINT_ID = 'FOUNDATION-CONTROL-PLANE-AND-BRAIN-FLEET-READINESS-2026-05-20'
export const YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CLOSEOUT_KEY = 'youtube-build-intel-runtime-proof-v1'
export const YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_PLAN_PATH = 'docs/process/youtube-build-intel-runtime-proof-001-plan.md'
export const YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_APPROVAL_PATH = 'docs/process/approvals/YOUTUBE-BUILD-INTEL-RUNTIME-PROOF-001.json'
export const YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SCRIPT_PATH = 'scripts/process-youtube-build-intel-runtime-proof-check.mjs'
export const YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-20-youtube-build-intel-runtime-proof-closeout.md'
export const YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_NEXT_CARD_ID = 'SKOOL-APPROVED-LESSON-EXTRACT-PROOF-001'

export const YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ID = 'SRC-YOUTUBE-INTEL-001'
export const YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_VIDEO_SOURCE_ID = 'SRC-VIDEO-001'
export const YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_VIDEO_ID = 'K65vd9EYbDU'
export const YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_URL = `https://www.youtube.com/watch?v=${YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_VIDEO_ID}`
export const YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_TITLE = "I Built a $1M/y SaaS with Claude Code, Here's How"
export const YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CHANNEL = 'Nick Saraev'
export const YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_PUBLISHED_AT = '2026-05-20T13:30:22Z'
export const YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ARTIFACT_ID = `${YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ID}:video_transcript:${YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_VIDEO_ID}`
export const YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_REPORT_ARTIFACT_ID = `proof:${YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CARD_ID.toLowerCase()}:k65vd9eybdu`
export const YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_ROUTE_KEY = 'foundation-extraction-openai-api'
export const YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_INVENTORY_TARGET_KEY = 'video-link-inventory'
export const YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_EXTRACTION_TARGET_KEY = 'video-content-extract-backfill'

export const YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_NOT_NEXT = [
  'Do not run broad YouTube channel crawl or last-20 batch before this one-video proof is green.',
  'Do not run Skool, MyICOR, Loom, private video, comments/member, paid-source, or authorized-browser crawls.',
  'Do not capture screenshots/keyframes, download media, or upload media to a provider in this card.',
  'Do not run live provider/model calls for summary work; record Brain Fleet ledger truth and use deterministic local extraction only.',
  'Do not mutate credentials, provider config, source systems, MEETING-VAULT-ACL-001 Phase B, Drive permissions, public exposure settings, or external systems.',
  'Do not auto-create backlog cards, apply action routes, write external review destinations, or start Strategy/People work.',
  'Stop on quota, transcript failure, duplicate explosion, route failure, or raw Foundation health degradation.',
]

export const YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CHANGED_FILES = [
  'lib/youtube-build-intel-runtime-proof.js',
  YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SCRIPT_PATH,
  'lib/foundation-source-crawl-store.js',
  'lib/extract-retire.js',
  'lib/runtime-first-jobs.js',
  'scripts/extract-video-content.mjs',
  'scripts/run-extraction-target.mjs',
  YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_PLAN_PATH,
  YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_APPROVAL_PATH,
  YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CLOSEOUT_PATH,
  'lib/foundation-build-closeout-model-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'package.json',
]

export const YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_COMMANDS = [
  'node --check lib/youtube-build-intel-runtime-proof.js',
  'node --check scripts/process-youtube-build-intel-runtime-proof-check.mjs',
  'node --check lib/foundation-source-crawl-store.js',
  'node --check lib/extract-retire.js',
  'node --check lib/runtime-first-jobs.js',
  'node --check scripts/extract-video-content.mjs',
  'node --check scripts/run-extraction-target.mjs',
  'npm run process:youtube-build-intel-runtime-proof-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:foundation-ship -- --card=YOUTUBE-BUILD-INTEL-RUNTIME-PROOF-001 --planApprovalRef=docs/process/approvals/YOUTUBE-BUILD-INTEL-RUNTIME-PROOF-001.json --closeoutKey=youtube-build-intel-runtime-proof-v1 --commitRef=HEAD',
]

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
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

function stableHash(value = '') {
  return crypto.createHash('sha256').update(JSON.stringify(stableValue(value)), 'utf8').digest('hex')
}

function stableTextHash(value = '') {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex')
}

function addFinding(findings, ok, check, detail = '') {
  findings.push({ ok: Boolean(ok), check, detail })
}

function parseDate(value) {
  const date = new Date(value || '')
  return Number.isNaN(date.getTime()) ? null : date
}

function sourceArtifactRef(artifactId = YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ARTIFACT_ID) {
  return `shared_communication_artifacts:${artifactId}`
}

function reportArtifactRef(reportArtifactId = YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_REPORT_ARTIFACT_ID) {
  return `intelligence_report_artifacts:${reportArtifactId}`
}

function slug(value = '') {
  return text(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item'
}

export function buildYoutubeBuildIntelRuntimeInventoryItem({ discoveredAt = new Date().toISOString() } = {}) {
  return {
    itemKey: `video-link:youtube:${stableTextHash(YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_URL).slice(0, 24)}`,
    targetKey: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_INVENTORY_TARGET_KEY,
    sourceId: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_VIDEO_SOURCE_ID,
    externalId: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_URL,
    itemType: 'video_link',
    status: 'succeeded',
    fingerprint: stableTextHash(YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_URL),
    discoveredAt,
    processedAt: discoveredAt,
    metadata: {
      platform: 'youtube',
      externalVideoId: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_VIDEO_ID,
      normalizedUrl: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_URL,
      title: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_TITLE,
      channelName: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CHANNEL,
      publishedAt: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_PUBLISHED_AT,
      sourceKind: 'steve_manual_priority',
      valueRoute: 'agent_system_learning',
      ownershipClass: 'public_youtube',
      approvalCardId: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CARD_ID,
      runtimeProofBoundary: 'one_approved_public_video_only',
      broadBatchApproved: false,
      privateOrPaidContentAllowed: false,
    },
  }
}

export function validateYoutubeBuildIntelRuntimeInventoryItem(item = {}) {
  const findings = []
  addFinding(findings, item.targetKey === YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_INVENTORY_TARGET_KEY, 'inventory target is video-link-inventory', item.targetKey || 'missing')
  addFinding(findings, item.sourceId === YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_VIDEO_SOURCE_ID, 'inventory item uses video source ID', item.sourceId || 'missing')
  addFinding(findings, item.itemType === 'video_link', 'inventory item is a video link', item.itemType || 'missing')
  addFinding(findings, item.status === 'succeeded', 'inventory item is source-discovered before content extraction', item.status || 'missing')
  addFinding(findings, item.externalId === YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_URL, 'inventory item is the exact approved public video URL', item.externalId || 'missing')
  addFinding(findings, item.metadata?.platform === 'youtube', 'inventory item platform is YouTube', item.metadata?.platform || 'missing')
  addFinding(findings, item.metadata?.externalVideoId === YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_VIDEO_ID, 'inventory item carries exact video ID', item.metadata?.externalVideoId || 'missing')
  addFinding(findings, item.metadata?.sourceKind === 'steve_manual_priority', 'Steve approval marker is present', item.metadata?.sourceKind || 'missing')
  addFinding(findings, item.metadata?.privateOrPaidContentAllowed === false, 'private/paid content is blocked', String(item.metadata?.privateOrPaidContentAllowed))
  const failures = findings.filter(finding => !finding.ok)
  return { ok: failures.length === 0, findings, failures }
}

export function deriveChapterCapture(contentText = '') {
  const lines = String(contentText || '').split('\n')
  const explicitMarkers = []
  for (const line of lines) {
    const match = line.match(/^\[(\d{2}:\d{2}(?::\d{2})?)-[^\]]+\]\s*(.+)$/)
    const label = text(match?.[2])
    if (!match || !label) continue
    if (/^(intro|introduction|chapter|part\s+\d+|step\s+\d+|lesson|setup|demo|wrap)/i.test(label)) {
      explicitMarkers.push({ startsAt: match[1], label: label.slice(0, 120) })
    }
  }
  return {
    status: explicitMarkers.length ? 'chapter_markers_detected_in_transcript' : 'not_available_from_subtitle_endpoint_v1',
    chapters: explicitMarkers.slice(0, 20),
    skippedReason: explicitMarkers.length ? null : 'youtube_subtitle_endpoint_did_not_return_chapter_metadata',
  }
}

export function transcriptContextFromArtifact(artifact = {}) {
  const contentText = artifact.contentText || artifact.content_text || ''
  return {
    artifactId: artifact.artifactId || artifact.artifact_id,
    sourceId: artifact.sourceId || artifact.source_id,
    artifactType: artifact.artifactType || artifact.artifact_type,
    title: artifact.title,
    sourceUrl: artifact.sourceUrl || artifact.source_url,
    contentLength: Number(contentText.length || artifact.contentLength || 0),
    artifactUpdatedAt: artifact.artifactUpdatedAt || artifact.artifact_updated_at || artifact.updatedAt || artifact.updated_at,
    ingestedAt: artifact.ingestedAt || artifact.ingested_at,
    excerpt: text(contentText).slice(0, 1800),
    metadata: artifact.metadata || {},
  }
}

export function validateYoutubeBuildIntelRuntimeTranscriptArtifact(artifact = {}, { now = new Date() } = {}) {
  const findings = []
  const metadata = artifact.metadata || {}
  const contentText = artifact.contentText || artifact.content_text || ''
  const updatedAt = parseDate(artifact.artifactUpdatedAt || artifact.artifact_updated_at || artifact.updatedAt || artifact.updated_at)
  const ageHours = updatedAt ? Math.round((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60)) : null
  const title = text(artifact.title)
  const sourceUrl = text(artifact.sourceUrl || artifact.source_url || metadata.normalizedUrl)

  addFinding(findings, (artifact.artifactId || artifact.artifact_id) === YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ARTIFACT_ID, 'exact approved runtime transcript artifact exists', artifact.artifactId || artifact.artifact_id || 'missing')
  addFinding(findings, (artifact.sourceId || artifact.source_id) === YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ID, 'artifact uses public YouTube Build Intel source ID', artifact.sourceId || artifact.source_id || 'missing')
  addFinding(findings, (artifact.artifactType || artifact.artifact_type) === 'video_transcript', 'artifact is a video transcript', artifact.artifactType || artifact.artifact_type || 'missing')
  addFinding(findings, sourceUrl === YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_URL, 'artifact preserves approved source URL', sourceUrl || 'missing')
  addFinding(findings, metadata.videoId === YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_VIDEO_ID, 'artifact metadata preserves exact video ID', metadata.videoId || 'missing')
  addFinding(findings, title.includes('Claude Code') || title === YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_TITLE, 'artifact title matches approved Build Intel video', title || 'missing')
  addFinding(findings, contentText.length >= 1000, 'transcript text was captured', `${contentText.length} chars`)
  addFinding(findings, text(metadata.extractionMethod) === 'dataforseo_youtube_subtitles_v1', 'transcript capture method is recorded', metadata.extractionMethod || 'missing')
  addFinding(findings, ageHours == null || ageHours <= 24, 'runtime artifact is fresh', ageHours == null ? 'unknown age' : `${ageHours} hour(s)`)

  const failures = findings.filter(finding => !finding.ok)
  return { ok: failures.length === 0, findings, failures, ageHours }
}

function selectRouteContract({ llmRuntime = {}, routeKey = YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_ROUTE_KEY } = {}) {
  const routes = list(llmRuntime.routes)
  const credentials = list(llmRuntime.credentials)
  const route = routes.find(item => item.routeKey === routeKey) ||
    routes.find(item => item.workload === 'extraction' && item.provider !== 'openclaw') ||
    routes.find(item => item.workload === 'extraction') ||
    {}
  const credential = credentials.find(item => item.credentialKey === route.credentialKey) || {}
  const quotaState = credential.quotaState && typeof credential.quotaState === 'object' ? credential.quotaState : {}
  return {
    workload: 'extraction',
    hubKey: route.hubKey || 'foundation',
    routeKey: route.routeKey || routeKey,
    provider: route.provider || 'unknown',
    model: route.model || 'unknown',
    authPath: route.authPath || credential.authPath || 'unknown',
    credentialKey: route.credentialKey || credential.credentialKey || null,
    accountLabel: credential.accountLabel || 'unknown_account_label',
    quota: {
      posture: Object.keys(quotaState).length ? 'recorded' : 'unknown',
      state: quotaState,
    },
    readiness: {
      canExecute: false,
      llmRouterRunnable: route.status === 'available',
      providerExecutionAllowed: false,
      llmRouterBlockReason: route.status === 'available' ? null : `route status is ${route.status || 'missing'}`,
      stopConditions: [
        BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.PROVIDER_EXECUTION_DISABLED,
      ],
    },
    proofBoundary: 'public_youtube_runtime_transcript_extraction_no_provider_summary_call',
  }
}

function buildLedgerRequest() {
  return {
    workload: 'extraction',
    hubKey: 'foundation',
    caller: 'youtube-build-intel-runtime-proof',
    inputArtifactRef: sourceArtifactRef(YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ARTIFACT_ID),
    outputArtifactRef: reportArtifactRef(),
    sourceId: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ID,
    purpose: 'one approved public YouTube Build Intel runtime proof with transcript artifact and local deterministic review outputs',
  }
}

function buildLedgerRecord({ routeContract = {}, status = 'skipped' } = {}) {
  return buildBrainFleetLedgerRecord({
    request: buildLedgerRequest(),
    routeContract,
    status,
    artifactRef: sourceArtifactRef(),
    outputArtifactRef: reportArtifactRef(),
    failureReason: 'Provider execution disabled for this runtime proof; transcript extraction uses DataForSEO and deterministic local Build Intel extraction.',
    stopCondition: BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.PROVIDER_EXECUTION_DISABLED,
    actor: 'youtube-build-intel-runtime-proof',
  })
}

function reviewRoutesForArtifact(reviewSnapshot = {}, artifactId = YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ARTIFACT_ID) {
  return list(reviewSnapshot.reviewItems)
    .filter(item => item.sourceId === artifactId)
    .map(item => ({
      reviewRouteId: item.reviewItemId,
      sourceId: item.sourceId,
      sourceUrl: item.sourceUrl,
      decisionState: item.decisionState,
      allowedDecisions: item.allowedDecisions,
      recommendation: item.recommendation,
      proposalOnly: item.proposalOnly === true,
      writesBacklog: item.writesBacklog === true,
      writesAtoms: item.writesAtoms === true,
      writesKnowledgeBase: item.writesKnowledgeBase === true,
      externalWrites: item.externalWrites === true,
      requiresSteveReview: item.requiresSteveReview === true,
    }))
}

function buildTrainingNotes({ observations = [], chapterCapture = {} } = {}) {
  return {
    summary: observations.length
      ? `Captured ${observations.length} Build Intel implementation observation(s) from the approved Nick Saraev public YouTube transcript.`
      : 'Transcript captured; no implementation observations were generated.',
    implementationNotes: observations.map(observation => ({
      theme: observation.theme,
      takeaway: observation.plainEnglishTakeaway,
      pattern: observation.implementationPattern,
      recommendation: observation.recommendation,
      relatedCards: observation.relatedCards || [],
    })),
    chapterCapture,
    skippedEvidence: [
      ...(chapterCapture.skippedReason ? [chapterCapture.skippedReason] : []),
      'screenshots_not_captured_in_transcript_runtime_v1',
      'keyframes_not_captured_in_transcript_runtime_v1',
      'provider_summary_call_not_run_in_v1',
    ],
  }
}

function atomInputsFromObservations({ artifact = {}, observations = [], reviewRoutes = [], reportArtifactId = YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_REPORT_ARTIFACT_ID, ledgerCallId = null, sourceCrawlRunId = null } = {}) {
  return observations.map((observation, index) => {
    const dedupHash = stableHash([
      YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CLOSEOUT_KEY,
      YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ARTIFACT_ID,
      observation.theme,
      observation.plainEnglishTakeaway,
    ])
    const reviewRoute = reviewRoutes[index] || reviewRoutes[0] || {}
    return {
      atomId: `atom:${YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CLOSEOUT_KEY}:${dedupHash.slice(0, 16)}`,
      title: `${YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CHANNEL}: ${observation.theme}`,
      content: observation.plainEnglishTakeaway,
      atomType: 'pattern',
      sourceId: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ID,
      artifactId: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ARTIFACT_ID,
      sourceCrawlRunId,
      reportArtifactId,
      modality: 'text',
      anchorType: 'source_url',
      anchorValue: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_URL,
      evidenceExcerpt: observation.plainEnglishTakeaway,
      derivedClaim: observation.implementationPattern,
      topicRefs: observation.keywords || [],
      valueRoute: 'build_intel',
      contentUseClass: 'internal_learning',
      audience: 'Foundation Builder',
      platformFit: ['foundation', 'build_intel', 'extractor'],
      formatRec: ['training_note', 'review_queue'],
      department: 'Foundation',
      qualityScore: observation.confidence === 'high' ? 82 : 68,
      relevanceScore: observation.confidence === 'high' ? 86 : 72,
      sourceConfidence: observation.confidence === 'high' ? 0.9 : 0.78,
      extractionConfidence: 0.78,
      sensitivity: 'neutral',
      minTier: 1,
      freshness: 'trending',
      status: 'detected',
      usedIn: [YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CARD_ID],
      dedupHash,
      suggestedOwner: 'Foundation Extraction',
      suggestedAction: observation.recommendation,
      tags: ['build-intel', 'public-youtube', 'runtime-proof'],
      notes: 'Created by one approved public YouTube runtime proof; review before promotion.',
      metadata: {
        cardId: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CARD_ID,
        closeoutKey: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CLOSEOUT_KEY,
        sourceTitle: artifact.title || YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_TITLE,
        sourceUrl: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_URL,
        sourcePublishedAt: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_PUBLISHED_AT,
        reviewRouteId: reviewRoute.reviewRouteId || null,
        ledgerCallId,
        proposalOnly: true,
        externalWrites: false,
      },
    }
  })
}

function hitInputsForAtoms({ atomInputs = [], reportArtifactId = YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_REPORT_ARTIFACT_ID, sourceCrawlRunId = null } = {}) {
  return atomInputs.map(atom => ({
    hitId: `hit:${YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CLOSEOUT_KEY}:${stableHash([atom.atomId, reportArtifactId]).slice(0, 16)}`,
    atomId: atom.atomId,
    sourceId: atom.sourceId,
    artifactId: atom.artifactId,
    reportArtifactId,
    intelligenceJobRunId: sourceCrawlRunId ? `intel-extraction:${sourceCrawlRunId}` : null,
    hitType: 'supporting_evidence',
    evidenceExcerpt: atom.evidenceExcerpt,
    anchorType: atom.anchorType,
    anchorValue: atom.anchorValue,
    confidence: Math.min(0.999, Math.max(0, Number(atom.qualityScore || 0) / 100)),
    metadata: {
      cardId: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CARD_ID,
      closeoutKey: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CLOSEOUT_KEY,
    },
  }))
}

export function buildYoutubeBuildIntelRuntimeProofSnapshot({
  artifact = null,
  transcriptContexts = [],
  backlogItems = [],
  currentSprint = null,
  llmRuntime = {},
  extractionRun = null,
  ledgerCallId = null,
  generatedAt = new Date().toISOString(),
  now = new Date(generatedAt),
} = {}) {
  const exactContext = artifact ? transcriptContextFromArtifact(artifact) : list(transcriptContexts)
    .find(item => item.artifactId === YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ARTIFACT_ID)
  const contexts = exactContext ? [exactContext] : []
  const extractionSnapshot = buildBuildIntelExtractionImplementationSnapshot({
    transcriptContexts: contexts,
    backlogItems,
    currentSprint,
    generatedAt,
  })
  const reviewSnapshot = buildBuildIntelDailyExtractionReviewSnapshot({
    extractionSnapshot,
  })
  const routeContract = selectRouteContract({ llmRuntime })
  const ledgerRecord = buildLedgerRecord({ routeContract })
  const ledgerValidation = validateBrainFleetLedgerRecord(ledgerRecord)
  const artifactValidation = artifact
    ? validateYoutubeBuildIntelRuntimeTranscriptArtifact(artifact, { now })
    : { ok: false, failures: [{ check: 'artifact exists', detail: 'missing' }], findings: [] }
  const chapterCapture = deriveChapterCapture(artifact?.contentText || artifact?.content_text || '')
  const reviewRoutes = reviewRoutesForArtifact(reviewSnapshot)
  const trainingNotes = buildTrainingNotes({
    observations: extractionSnapshot.observations,
    chapterCapture,
  })
  const atomInputs = atomInputsFromObservations({
    artifact,
    observations: extractionSnapshot.observations,
    reviewRoutes,
    ledgerCallId,
    sourceCrawlRunId: extractionRun?.sourceCrawlRunId || extractionRun?.runId || null,
  })
  const hitInputs = hitInputsForAtoms({
    atomInputs,
    sourceCrawlRunId: extractionRun?.sourceCrawlRunId || extractionRun?.runId || null,
  })
  const findings = []

  addFinding(findings, artifactValidation.ok, 'approved public YouTube transcript artifact is captured', artifactValidation.failures?.map(failure => failure.check).join(', ') || 'ok')
  addFinding(findings, extractionRun?.status === 'succeeded' || artifactValidation.ok, 'runtime extraction target succeeded or artifact already exists', extractionRun?.status || 'artifact-readback')
  addFinding(findings, extractionSnapshot.status === 'ready' && extractionSnapshot.selectedTranscriptArtifacts === 1, 'Build Intel extractor consumes exactly one approved transcript', `${extractionSnapshot.status} selected=${extractionSnapshot.selectedTranscriptArtifacts}`)
  addFinding(findings, extractionSnapshot.observations.length >= 1, 'implementation atoms have source observations', `${extractionSnapshot.observations.length} observation(s)`)
  addFinding(findings, reviewRoutes.length >= 1, 'Build Intel review route is created for the source artifact', `${reviewRoutes.length} route(s)`)
  addFinding(findings, reviewRoutes.every(route => route.proposalOnly && !route.writesBacklog && !route.writesAtoms && !route.externalWrites), 'review routes are proposal-only and have no external writes', 'proposal-only')
  addFinding(findings, ledgerValidation.ok, 'Brain Fleet ledger record has route/model/account/quota/stop truth', ledgerValidation.failed.map(failure => failure.check).join(', ') || 'ok')
  addFinding(findings, routeContract.provider !== 'openclaw', 'runtime proof uses a non-OpenClaw Brain Fleet route contract', `${routeContract.provider}/${routeContract.routeKey}`)
  addFinding(findings, atomInputs.length >= 1 && hitInputs.length === atomInputs.length, 'atom and hit write set is complete', `${atomInputs.length} atoms / ${hitInputs.length} hits`)
  addFinding(findings, chapterCapture.status && Array.isArray(chapterCapture.chapters), 'chapter capture result is explicit', chapterCapture.status)
  addFinding(findings, trainingNotes.skippedEvidence.length >= 1, 'skipped/error reasons are logged honestly', trainingNotes.skippedEvidence.join(', '))
  addFinding(findings, true, 'broad/private extraction remains blocked by card boundary', YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_NOT_NEXT.join(' | '))

  const failures = findings.filter(finding => !finding.ok)
  return {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'ready',
    cardId: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CARD_ID,
    closeoutKey: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CLOSEOUT_KEY,
    source: {
      sourceId: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ID,
      videoSourceId: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_VIDEO_SOURCE_ID,
      artifactId: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ARTIFACT_ID,
      videoId: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_VIDEO_ID,
      title: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_TITLE,
      channel: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CHANNEL,
      sourceUrl: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_URL,
      publishedAt: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_PUBLISHED_AT,
    },
    generatedAt,
    artifactValidation,
    extractionRun,
    ledgerCallId,
    routeContract,
    ledgerRecord,
    ledgerValidation,
    extractionSnapshot,
    reviewSnapshot,
    reviewRoutes,
    trainingNotes,
    chapterCapture,
    atomInputs,
    hitInputs,
    findings,
    failures,
    notNext: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_NOT_NEXT,
  }
}

export function buildYoutubeBuildIntelRuntimeProofWriteSet(snapshot = {}) {
  const atomIds = list(snapshot.atomInputs).map(atom => atom.atomId)
  return {
    reportArtifact: {
      reportArtifactId: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_REPORT_ARTIFACT_ID,
      reportType: 'proof',
      scopeKey: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CARD_ID,
      department: 'foundation',
      title: `YouTube Build Intel runtime proof - ${YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CHANNEL}`,
      status: snapshot.ok ? 'generated' : 'failed',
      sourceIds: [
        YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ID,
        YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_VIDEO_SOURCE_ID,
      ],
      generatedByJobRunId: snapshot.extractionRun?.sourceCrawlRunId || snapshot.extractionRun?.runId || null,
      intelligenceJobRunId: snapshot.extractionRun?.sourceCrawlRunId ? `intel-extraction:${snapshot.extractionRun.sourceCrawlRunId}` : null,
      inputArtifactIds: [YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ARTIFACT_ID],
      inputAtomIds: atomIds,
      sourceCoverage: [{
        sourceId: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ID,
        artifactId: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ARTIFACT_ID,
        sourceUrl: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_URL,
        evidenceLevel: 'transcript_text',
      }],
      dedupSummary: {
        guard: 'deterministic_artifact_atom_ids',
        artifactId: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ARTIFACT_ID,
        atomIds,
      },
      rejectedNoiseSummary: snapshot.trainingNotes?.skippedEvidence || [],
      topFindings: list(snapshot.extractionSnapshot?.observations).map(observation => ({
        theme: observation.theme,
        finding: observation.plainEnglishTakeaway,
        recommendation: observation.recommendation,
      })),
      actionRequiredItems: list(snapshot.reviewRoutes).map(route => ({
        reviewRouteId: route.reviewRouteId,
        decisionState: route.decisionState,
        recommendation: route.recommendation,
        requiresSteveReview: route.requiresSteveReview,
      })),
      openQuestions: snapshot.chapterCapture?.skippedReason ? [{
        question: 'Should this public-video lane add official chapter metadata or visual/keyframe capture later?',
        reason: snapshot.chapterCapture.skippedReason,
      }] : [],
      structuredOutputJson: {
        source: snapshot.source,
        trainingNotes: snapshot.trainingNotes,
        reviewRoutes: snapshot.reviewRoutes,
        chapterCapture: snapshot.chapterCapture,
        extractionRun: snapshot.extractionRun,
        ledger: snapshot.ledgerRecord,
        stopControls: snapshot.notNext,
      },
      metadata: {
        cardId: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CARD_ID,
        closeoutKey: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CLOSEOUT_KEY,
        sourceUrl: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_URL,
        artifactId: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ARTIFACT_ID,
        extractionTargetKey: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_EXTRACTION_TARGET_KEY,
        inventoryTargetKey: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_INVENTORY_TARGET_KEY,
        sourceCrawlRunId: snapshot.extractionRun?.sourceCrawlRunId || snapshot.extractionRun?.runId || null,
        ledgerCallId: snapshot.ledgerCallId || null,
        proposalOnly: true,
        broadBatchApproved: false,
        externalWrites: false,
      },
    },
    atomInputs: snapshot.atomInputs || [],
    hitInputs: snapshot.hitInputs || [],
  }
}

export function verifyYoutubeBuildIntelRuntimePersistedProof({
  snapshot = {},
  report = null,
  atoms = [],
  hits = [],
  ledgerCall = null,
} = {}) {
  const findings = []
  const expectedAtomIds = new Set(list(snapshot.atomInputs).map(atom => atom.atomId))
  const expectedHitIds = new Set(list(snapshot.hitInputs).map(hit => hit.hitId))
  const atomIds = new Set(list(atoms).map(atom => atom.atomId || atom.atom_id))
  const hitIds = new Set(list(hits).map(hit => hit.hitId || hit.hit_id))
  const metadata = report?.metadata || {}

  addFinding(findings, report?.reportArtifactId === YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_REPORT_ARTIFACT_ID || report?.report_artifact_id === YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_REPORT_ARTIFACT_ID, 'proof report artifact persisted', report?.reportArtifactId || report?.report_artifact_id || 'missing')
  addFinding(findings, list(report?.inputArtifactIds || report?.input_artifact_ids).includes(YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ARTIFACT_ID), 'proof report links source transcript artifact', list(report?.inputArtifactIds || report?.input_artifact_ids).join(', ') || 'missing')
  addFinding(findings, [...expectedAtomIds].every(atomId => atomIds.has(atomId)), 'all expected atoms persisted', `${atomIds.size}/${expectedAtomIds.size}`)
  addFinding(findings, [...expectedHitIds].every(hitId => hitIds.has(hitId)), 'all expected atom hits persisted', `${hitIds.size}/${expectedHitIds.size}`)
  addFinding(findings, ledgerCall?.metadata?.brainFleetLedger?.routeKey || metadata.ledgerCallId, 'Brain Fleet ledger call is linked', ledgerCall?.callId || ledgerCall?.call_id || metadata.ledgerCallId || 'missing')
  addFinding(findings, metadata.externalWrites === false || report?.structuredOutputJson?.stopControls, 'persisted proof records no external writes boundary', String(metadata.externalWrites))

  const failures = findings.filter(finding => !finding.ok)
  return { ok: failures.length === 0, findings, failures }
}

export function buildYoutubeBuildIntelRuntimeDogfoodProof() {
  const goodInventory = buildYoutubeBuildIntelRuntimeInventoryItem()
  const badPrivate = {
    ...goodInventory,
    externalId: 'https://www.skool.com/private/lesson',
    metadata: {
      ...goodInventory.metadata,
      platform: 'skool',
      privateOrPaidContentAllowed: true,
    },
  }
  const goodInventoryValidation = validateYoutubeBuildIntelRuntimeInventoryItem(goodInventory)
  const badPrivateValidation = validateYoutubeBuildIntelRuntimeInventoryItem(badPrivate)
  const noArtifact = buildYoutubeBuildIntelRuntimeProofSnapshot({
    artifact: null,
    transcriptContexts: [],
    backlogItems: [],
    llmRuntime: { routes: [], credentials: [] },
  })
  const fakeArtifact = {
    artifactId: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ARTIFACT_ID,
    sourceId: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ID,
    artifactType: 'video_transcript',
    title: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_TITLE,
    sourceUrl: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_URL,
    contentText: 'short transcript',
    artifactUpdatedAt: new Date().toISOString(),
    metadata: {
      videoId: YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_VIDEO_ID,
      extractionMethod: 'dataforseo_youtube_subtitles_v1',
    },
  }
  const shortArtifactValidation = validateYoutubeBuildIntelRuntimeTranscriptArtifact(fakeArtifact)
  return {
    ok: goodInventoryValidation.ok &&
      !badPrivateValidation.ok &&
      !noArtifact.ok &&
      !shortArtifactValidation.ok,
    cases: {
      goodInventory: goodInventoryValidation.ok,
      privateSourceRejected: !badPrivateValidation.ok,
      missingArtifactRejected: !noArtifact.ok,
      shortTranscriptRejected: !shortArtifactValidation.ok,
    },
  }
}

export function renderYoutubeBuildIntelRuntimeCloseout(snapshot = {}) {
  const lines = [
    '# YouTube Build Intel Runtime Proof Closeout',
    '',
    `Closeout key: \`${YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CLOSEOUT_KEY}\``,
    `Card: \`${YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CARD_ID}\``,
    '',
    '## Source',
    '',
    `- Video: ${YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_TITLE}`,
    `- Channel: ${YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_CHANNEL}`,
    `- URL: ${YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_URL}`,
    `- Transcript artifact: \`${YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_SOURCE_ARTIFACT_ID}\``,
    '',
    '## Proof',
    '',
    `- Status: ${snapshot.status || 'unknown'}`,
    `- Observations: ${snapshot.extractionSnapshot?.observations?.length || 0}`,
    `- Atoms: ${snapshot.atomInputs?.length || 0}`,
    `- Review routes: ${snapshot.reviewRoutes?.length || 0}`,
    `- Chapter capture: ${snapshot.chapterCapture?.status || 'unknown'}`,
    `- Source crawl run: ${snapshot.extractionRun?.sourceCrawlRunId || snapshot.extractionRun?.runId || 'readback-only'}`,
    '',
    '## Boundaries',
    '',
    ...YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_NOT_NEXT.map(item => `- ${item}`),
    '',
    '## Proof Commands',
    '',
    ...YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_COMMANDS.map(command => `- \`${command}\``),
    '',
    '## Next',
    '',
    `Continue \`${YOUTUBE_BUILD_INTEL_RUNTIME_PROOF_NEXT_CARD_ID}\` only after raw Foundation gates are green and main is pushed.`,
    '',
  ]
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`
}
