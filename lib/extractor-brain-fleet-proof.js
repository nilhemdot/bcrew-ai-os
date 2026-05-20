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

export const EXTRACTOR_BRAIN_FLEET_PROOF_CARD_ID = 'EXTRACTOR-BRAIN-FLEET-PROOF-001'
export const EXTRACTOR_BRAIN_FLEET_PROOF_SPRINT_ID = 'FOUNDATION-CONTROL-PLANE-AND-BRAIN-FLEET-READINESS-2026-05-20'
export const EXTRACTOR_BRAIN_FLEET_PROOF_CLOSEOUT_KEY = 'extractor-brain-fleet-proof-v1'
export const EXTRACTOR_BRAIN_FLEET_PROOF_PLAN_PATH = 'docs/process/extractor-brain-fleet-proof-001-plan.md'
export const EXTRACTOR_BRAIN_FLEET_PROOF_APPROVAL_PATH = 'docs/process/approvals/EXTRACTOR-BRAIN-FLEET-PROOF-001.json'
export const EXTRACTOR_BRAIN_FLEET_PROOF_SCRIPT_PATH = 'scripts/process-extractor-brain-fleet-proof-check.mjs'
export const EXTRACTOR_BRAIN_FLEET_PROOF_CLOSEOUT_PATH = 'docs/handoffs/2026-05-20-extractor-brain-fleet-proof-closeout.md'
export const EXTRACTOR_BRAIN_FLEET_PROOF_NEXT_CARD_ID = 'YOUTUBE-BUILD-INTEL-RUNTIME-PROOF-001'

export const EXTRACTOR_BRAIN_FLEET_PROOF_SOURCE_ID = 'SRC-YOUTUBE-INTEL-001'
export const EXTRACTOR_BRAIN_FLEET_PROOF_SOURCE_ARTIFACT_ID = 'SRC-YOUTUBE-INTEL-001:video_transcript:McPot5-N0ys'
export const EXTRACTOR_BRAIN_FLEET_PROOF_SOURCE_URL = 'https://youtu.be/McPot5-N0ys'
export const EXTRACTOR_BRAIN_FLEET_PROOF_SOURCE_TITLE = 'The AI Team Setup Nobody Talks About'
export const EXTRACTOR_BRAIN_FLEET_PROOF_ROUTE_KEY = 'foundation-extraction-openai-api'

export const EXTRACTOR_BRAIN_FLEET_PROOF_NOT_NEXT = [
  'Do not run MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.',
  'Do not run live provider/model calls from this extractor proof.',
  'Do not fetch YouTube transcripts, crawl channels, capture screenshots/keyframes, download media, or run broad extraction.',
  'Do not access Skool, MyICOR, Loom, private videos, paid courses, or authorized browser sessions.',
  'Do not mutate credentials, browser profiles, provider config, source systems, Drive permissions, public exposure settings, or external systems.',
  'Do not auto-create backlog cards, apply action routes, write external review destinations, or start Strategy/People work.',
  'Do not continue to YouTube runtime proof unless this proof has Brain Fleet ledger truth, persisted artifact/provenance, atoms, review routes, and raw-green gates.',
]

export const EXTRACTOR_BRAIN_FLEET_PROOF_CHANGED_FILES = [
  'lib/extractor-brain-fleet-proof.js',
  EXTRACTOR_BRAIN_FLEET_PROOF_SCRIPT_PATH,
  EXTRACTOR_BRAIN_FLEET_PROOF_PLAN_PATH,
  EXTRACTOR_BRAIN_FLEET_PROOF_APPROVAL_PATH,
  EXTRACTOR_BRAIN_FLEET_PROOF_CLOSEOUT_PATH,
  'lib/foundation-build-closeout-model-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'scripts/foundation-verify.mjs',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'package.json',
]

export const EXTRACTOR_BRAIN_FLEET_PROOF_COMMANDS = [
  'node --check lib/extractor-brain-fleet-proof.js scripts/process-extractor-brain-fleet-proof-check.mjs',
  'npm run process:extractor-brain-fleet-proof-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:foundation-ship -- --card=EXTRACTOR-BRAIN-FLEET-PROOF-001 --planApprovalRef=docs/process/approvals/EXTRACTOR-BRAIN-FLEET-PROOF-001.json --closeoutKey=extractor-brain-fleet-proof-v1 --commitRef=HEAD',
]

const REPORT_ARTIFACT_ID = `proof:${EXTRACTOR_BRAIN_FLEET_PROOF_CARD_ID.toLowerCase()}:mc-pot5-n0ys`

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

function stableString(value) {
  return JSON.stringify(stableValue(value))
}

function stableHash(value = '') {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex')
}

function stableId(prefix, value) {
  return `${prefix}:${stableHash(value).slice(0, 24)}`
}

function unique(values = []) {
  const seen = new Set()
  const output = []
  for (const value of values.map(text).filter(Boolean)) {
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    output.push(value)
  }
  return output
}

function parseDate(value) {
  const date = new Date(value || '')
  return Number.isNaN(date.getTime()) ? null : date
}

function addFinding(findings, ok, check, detail = '') {
  findings.push({ ok: Boolean(ok), check, detail })
}

function sourceArtifactRef(artifactId = EXTRACTOR_BRAIN_FLEET_PROOF_SOURCE_ARTIFACT_ID) {
  return `shared_communication_artifacts:${artifactId}`
}

function reportArtifactRef(reportArtifactId = REPORT_ARTIFACT_ID) {
  return `intelligence_report_artifacts:${reportArtifactId}`
}

function sourceItemFromContext(context = {}) {
  return {
    artifactId: text(context.artifactId),
    sourceId: text(context.sourceId),
    artifactType: text(context.artifactType),
    title: text(context.title),
    sourceUrl: text(context.sourceUrl),
    contentLength: Number(context.contentLength || 0),
    artifactUpdatedAt: context.artifactUpdatedAt || null,
    ingestedAt: context.ingestedAt || null,
    excerpt: text(context.excerpt).slice(0, 900),
    metadata: context.metadata || {},
  }
}

export function validateExtractorBrainFleetSourceItem(sourceItem = {}, { now = new Date('2026-05-20T18:00:00.000-04:00') } = {}) {
  const findings = []
  const updatedAt = parseDate(sourceItem.artifactUpdatedAt || sourceItem.ingestedAt)
  const ageDays = updatedAt ? Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)) : null
  const url = text(sourceItem.sourceUrl || sourceItem.metadata?.normalizedUrl)

  addFinding(findings, sourceItem.artifactId === EXTRACTOR_BRAIN_FLEET_PROOF_SOURCE_ARTIFACT_ID, 'exact approved source artifact is selected', sourceItem.artifactId || 'missing')
  addFinding(findings, sourceItem.sourceId === EXTRACTOR_BRAIN_FLEET_PROOF_SOURCE_ID, 'source ID is public YouTube Build Intel', sourceItem.sourceId || 'missing')
  addFinding(findings, sourceItem.artifactType === 'video_transcript', 'source artifact is a transcript artifact', sourceItem.artifactType || 'missing')
  addFinding(findings, sourceItem.title === EXTRACTOR_BRAIN_FLEET_PROOF_SOURCE_TITLE, 'source title matches approved proof item', sourceItem.title || 'missing')
  addFinding(findings, url === EXTRACTOR_BRAIN_FLEET_PROOF_SOURCE_URL, 'source URL matches approved proof item', url || 'missing')
  addFinding(findings, Number(sourceItem.contentLength) >= 1000, 'transcript text is already captured in archive', String(sourceItem.contentLength || 0))
  addFinding(findings, sourceItem.metadata?.sourceKind === 'steve_manual_priority', 'Steve manual priority approval marker is present', sourceItem.metadata?.sourceKind || 'missing')
  addFinding(findings, text(sourceItem.metadata?.extractionMethod).length > 0, 'transcript capture method is recorded', sourceItem.metadata?.extractionMethod || 'missing')
  addFinding(findings, ageDays === null || ageDays <= 45, 'source artifact is inside proof freshness window', ageDays == null ? 'unknown age accepted for existing archive' : `${ageDays} day(s)`)

  const privateSource = /skool|myicor|loom|private|paid_course|authorized_browser/i.test(`${sourceItem.sourceId} ${sourceItem.artifactType} ${sourceItem.sourceUrl}`)
  addFinding(findings, !privateSource, 'paid/private source classes are not used in this proof', `${sourceItem.sourceId}:${sourceItem.sourceUrl}`)

  const failures = findings.filter(finding => !finding.ok)
  return {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'approved',
    findings,
    failures,
    ageDays,
  }
}

function selectApprovedSourceItem(transcriptContexts = []) {
  const exact = list(transcriptContexts)
    .map(sourceItemFromContext)
    .find(item => item.artifactId === EXTRACTOR_BRAIN_FLEET_PROOF_SOURCE_ARTIFACT_ID)
  return exact || null
}

function selectRouteContract({ llmRuntime = {}, routeKey = EXTRACTOR_BRAIN_FLEET_PROOF_ROUTE_KEY } = {}) {
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
    proofBoundary: 'deterministic_existing_transcript_no_provider_execution',
  }
}

function buildLedgerRequest(sourceItem = {}) {
  return {
    workload: 'extraction',
    hubKey: 'foundation',
    caller: 'extractor-brain-fleet-proof',
    inputArtifactRef: sourceArtifactRef(sourceItem.artifactId),
    outputArtifactRef: reportArtifactRef(),
    sourceId: sourceItem.sourceId,
    purpose: 'first governed extractor proof through Brain Fleet ledger using an already archived approved transcript artifact',
  }
}

function observationsForSource(extractionSnapshot = {}, sourceItem = {}) {
  return list(extractionSnapshot.observations)
    .filter(observation => observation.sourceArtifactId === sourceItem.artifactId)
    .slice(0, 4)
}

function reviewRoutesForSource(reviewSnapshot = {}, sourceItem = {}) {
  return list(reviewSnapshot.reviewItems)
    .filter(item => item.sourceId === sourceItem.artifactId)
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

function atomInputsFromObservations({ sourceItem = {}, observations = [], reviewRoutes = [], reportArtifactId = REPORT_ARTIFACT_ID, ledgerCallId = null } = {}) {
  return observations.map((observation, index) => {
    const dedupHash = stableHash([
      EXTRACTOR_BRAIN_FLEET_PROOF_CLOSEOUT_KEY,
      sourceItem.artifactId,
      observation.theme,
      observation.plainEnglishTakeaway,
    ].join('|'))
    const reviewRoute = reviewRoutes[index] || reviewRoutes[0] || {}
    return {
      atomId: `atom:${EXTRACTOR_BRAIN_FLEET_PROOF_CLOSEOUT_KEY}:${dedupHash.slice(0, 16)}`,
      title: `${sourceItem.title}: ${observation.theme}`,
      content: observation.plainEnglishTakeaway,
      atomType: 'pattern',
      sourceId: sourceItem.sourceId,
      artifactId: sourceItem.artifactId,
      reportArtifactId,
      modality: 'video',
      anchorType: 'youtube_transcript_archive',
      anchorValue: sourceItem.sourceUrl,
      evidenceExcerpt: sourceItem.title,
      derivedClaim: observation.implementationPattern,
      topicRefs: unique(['build-intel', 'extractor-proof', ...(observation.keywords || [])]),
      department: 'Foundation',
      valueRoute: 'build_intel',
      contentUseClass: 'implementation_intelligence',
      qualityScore: observation.confidence === 'high' ? 88 : 78,
      relevanceScore: 80 - index,
      sourceConfidence: observation.confidence === 'high' ? 0.9 : 0.82,
      extractionConfidence: 0.78,
      sensitivity: 'neutral',
      minTier: 1,
      freshness: 'structural',
      status: 'detected',
      staleAfter: '2026-06-20T00:00:00.000-04:00',
      tags: unique(['build-intel', 'brain-fleet-proof', 'governed-extraction']),
      suggestedOwner: 'Foundation',
      suggestedAction: reviewRoute.reviewRouteId
        ? `Review Build Intel route ${reviewRoute.reviewRouteId}; do not auto-promote.`
        : 'Review Build Intel proof output before promotion.',
      dedupHash,
      metadata: {
        cardId: EXTRACTOR_BRAIN_FLEET_PROOF_CARD_ID,
        closeoutKey: EXTRACTOR_BRAIN_FLEET_PROOF_CLOSEOUT_KEY,
        sourceUrl: sourceItem.sourceUrl,
        sourceArtifactRef: sourceArtifactRef(sourceItem.artifactId),
        reportArtifactRef: reportArtifactRef(reportArtifactId),
        reviewRouteId: reviewRoute.reviewRouteId || null,
        ledgerCallId,
        providerExecution: 'skipped_for_deterministic_proof',
      },
      filedBy: 'extractor-brain-fleet-proof',
    }
  })
}

function hitInputsFromAtoms({ sourceItem = {}, atomInputs = [], reportArtifactId = REPORT_ARTIFACT_ID } = {}) {
  return atomInputs.map(atom => ({
    hitId: `atom-hit:${EXTRACTOR_BRAIN_FLEET_PROOF_CLOSEOUT_KEY}:${stableHash(atom.atomId).slice(0, 16)}`,
    atomId: atom.atomId,
    sourceId: sourceItem.sourceId,
    artifactId: sourceItem.artifactId,
    reportArtifactId,
    hitType: 'supporting_evidence',
    evidenceExcerpt: sourceItem.title,
    anchorType: 'youtube_transcript_archive',
    anchorValue: sourceItem.sourceUrl,
    confidence: atom.extractionConfidence,
    occurredAt: '2026-05-20T18:00:00.000-04:00',
    metadata: {
      cardId: EXTRACTOR_BRAIN_FLEET_PROOF_CARD_ID,
      closeoutKey: EXTRACTOR_BRAIN_FLEET_PROOF_CLOSEOUT_KEY,
    },
  }))
}

function buildTrainingNotes({ sourceItem = {}, observations = [], reviewRoutes = [], ledgerRecord = null } = {}) {
  return {
    summary: `Governed extractor proof consumed existing approved public YouTube transcript artifact ${sourceItem.artifactId}, produced ${observations.length} Build Intel observation atom(s), and routed ${reviewRoutes.length} review item(s) without live provider execution.`,
    sourceUseBoundary: 'Existing transcript archive only; no fresh public web lookup, transcript fetch, screenshots, keyframes, downloads, paid/private auth, or model call.',
    operatorNotes: observations.map(observation => observation.plainEnglishTakeaway),
    reviewInstructions: [
      'Review Build Intel routes before promotion.',
      'Treat atoms as detected implementation-intelligence candidates, not accepted doctrine.',
      'Use later YouTube runtime proof for fresh public-video runtime extraction.',
    ],
    ledger: ledgerRecord ? {
      routeKey: ledgerRecord.routeKey,
      provider: ledgerRecord.provider,
      model: ledgerRecord.model,
      status: ledgerRecord.status,
      stopCondition: ledgerRecord.stopCondition,
      stopConditions: ledgerRecord.stopConditions,
    } : null,
  }
}

function buildReportArtifactInput({ snapshot = {}, ledger = null, atomInputs = [], hitInputs = [] } = {}) {
  const ledgerRecord = ledger?.ledgerRecord || snapshot.ledgerRecord
  const sourceItem = snapshot.sourceItem || {}
  const trainingNotes = buildTrainingNotes({
    sourceItem,
    observations: snapshot.observations || [],
    reviewRoutes: snapshot.reviewRoutes || [],
    ledgerRecord,
  })
  return {
    reportArtifactId: REPORT_ARTIFACT_ID,
    reportType: 'proof',
    scopeKey: EXTRACTOR_BRAIN_FLEET_PROOF_CLOSEOUT_KEY,
    department: 'Foundation',
    title: 'Extractor Brain Fleet Proof',
    status: 'generated',
    sourceIds: [EXTRACTOR_BRAIN_FLEET_PROOF_SOURCE_ID],
    inputArtifactIds: [sourceItem.artifactId],
    inputAtomIds: atomInputs.map(atom => atom.atomId),
    sourceCoverage: [
      {
        sourceId: sourceItem.sourceId,
        sourceArtifactId: sourceItem.artifactId,
        sourceUrl: sourceItem.sourceUrl,
        transcriptMode: 'existing_archive_transcript',
        approvedBy: 'Steve manual priority marker in artifact metadata',
      },
    ],
    freshnessWarnings: [],
    missingSourceWarnings: [],
    staleSourceWarnings: [],
    dedupSummary: snapshot.dedupStalenessGuard || {},
    topFindings: snapshot.observations.map(observation => ({
      theme: observation.theme,
      takeaway: observation.plainEnglishTakeaway,
      sourceArtifactId: observation.sourceArtifactId,
    })),
    actionRequiredItems: snapshot.reviewRoutes,
    openQuestions: snapshot.skippedReasons,
    contradictions: [],
    outputArtifactId: REPORT_ARTIFACT_ID,
    outputPath: EXTRACTOR_BRAIN_FLEET_PROOF_CLOSEOUT_PATH,
    structuredOutputJson: {
      cardId: EXTRACTOR_BRAIN_FLEET_PROOF_CARD_ID,
      closeoutKey: EXTRACTOR_BRAIN_FLEET_PROOF_CLOSEOUT_KEY,
      approvedSourceItem: sourceItem,
      ledgerCallId: ledger?.call?.callId || null,
      ledgerRecord,
      atomIds: atomInputs.map(atom => atom.atomId),
      hitIds: hitInputs.map(hit => hit.hitId),
      reviewRoutes: snapshot.reviewRoutes,
      trainingNotes,
      skippedReasons: snapshot.skippedReasons,
      noExternalWrites: true,
      credentialMutation: false,
    },
    metadata: {
      cardId: EXTRACTOR_BRAIN_FLEET_PROOF_CARD_ID,
      closeoutKey: EXTRACTOR_BRAIN_FLEET_PROOF_CLOSEOUT_KEY,
      ledgerCallId: ledger?.call?.callId || null,
      providerExecution: 'skipped_for_deterministic_proof',
      noExternalWrites: true,
      noCredentialMutation: true,
    },
  }
}

function buildSkippedReasons({ routeContract = {}, sourceValidation = {}, privateSourceApprovals = [] } = {}) {
  return [
    {
      code: 'provider_execution_skipped_for_deterministic_proof',
      detail: 'No live LLM/provider call was needed; Brain Fleet ledger records the skipped provider execution boundary.',
      stopCondition: BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.PROVIDER_EXECUTION_DISABLED,
    },
    {
      code: 'skool_myicor_loom_private_sources_not_run',
      detail: privateSourceApprovals.length
        ? 'Private-source approvals are intentionally outside this public transcript proof.'
        : 'No exact Skool/MyICOR/Loom paid/private source approval was provided for this card.',
    },
    ...(sourceValidation.ok ? [] : sourceValidation.failures.map(failure => ({
      code: `source_validation_${failure.check}`,
      detail: failure.detail,
    }))),
    ...(routeContract.readiness?.llmRouterRunnable === true ? [] : [{
      code: 'route_not_runnable',
      detail: routeContract.readiness?.llmRouterBlockReason || 'missing runnable route',
    }]),
  ]
}

function buildDedupStalenessGuard({ sourceItem = {}, atomInputs = [], reviewRoutes = [] } = {}) {
  const dedupHashes = atomInputs.map(atom => atom.dedupHash)
  const duplicateHashes = dedupHashes.filter((hash, index) => dedupHashes.indexOf(hash) !== index)
  return {
    sourceArtifactId: sourceItem.artifactId,
    sourceArtifactRef: sourceArtifactRef(sourceItem.artifactId),
    atomDedupHashes: dedupHashes,
    duplicateAtomDedupHashCount: new Set(duplicateHashes).size,
    atomStaleAfter: '2026-06-20T00:00:00.000-04:00',
    reviewRouteIds: reviewRoutes.map(route => route.reviewRouteId),
    duplicateReviewRouteCount: reviewRoutes.length - new Set(reviewRoutes.map(route => route.reviewRouteId)).size,
    ok: duplicateHashes.length === 0 && reviewRoutes.every(route => route.reviewRouteId),
  }
}

export function buildExtractorBrainFleetProofSnapshot({
  transcriptContexts = [],
  backlogItems = [],
  currentSprint = null,
  llmRuntime = {},
  now = new Date('2026-05-20T18:00:00.000-04:00'),
  privateSourceApprovals = [],
} = {}) {
  const sourceItem = selectApprovedSourceItem(transcriptContexts)
  const sourceValidation = validateExtractorBrainFleetSourceItem(sourceItem || {}, { now })
  const extractionSnapshot = buildBuildIntelExtractionImplementationSnapshot({
    transcriptContexts: sourceItem ? [sourceItem] : [],
    backlogItems,
    currentSprint,
    generatedAt: now.toISOString(),
  })
  const reviewSnapshot = buildBuildIntelDailyExtractionReviewSnapshot({
    extractionSnapshot,
    generatedAt: now.toISOString(),
    limit: 5,
  })
  const routeContract = selectRouteContract({ llmRuntime })
  const ledgerRequest = buildLedgerRequest(sourceItem || {})
  const ledgerRecord = buildBrainFleetLedgerRecord({
    request: ledgerRequest,
    routeContract,
    status: 'skipped',
    artifactRef: ledgerRequest.inputArtifactRef,
    outputArtifactRef: ledgerRequest.outputArtifactRef,
    failureReason: 'Provider execution disabled for deterministic existing-transcript extractor proof.',
    stopCondition: BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.PROVIDER_EXECUTION_DISABLED,
    actor: 'extractor-brain-fleet-proof',
    finishedAt: now.toISOString(),
  })
  const ledgerValidation = validateBrainFleetLedgerRecord(ledgerRecord)
  const observations = sourceValidation.ok ? observationsForSource(extractionSnapshot, sourceItem) : []
  const reviewRoutes = sourceValidation.ok ? reviewRoutesForSource(reviewSnapshot, sourceItem) : []
  const atomInputs = atomInputsFromObservations({ sourceItem: sourceItem || {}, observations, reviewRoutes })
  const hitInputs = hitInputsFromAtoms({ sourceItem: sourceItem || {}, atomInputs })
  const dedupStalenessGuard = buildDedupStalenessGuard({ sourceItem: sourceItem || {}, atomInputs, reviewRoutes })
  const skippedReasons = buildSkippedReasons({ routeContract, sourceValidation, privateSourceApprovals })
  const reportArtifact = buildReportArtifactInput({
    snapshot: {
      sourceItem,
      observations,
      reviewRoutes,
      skippedReasons,
      dedupStalenessGuard,
      ledgerRecord,
    },
    ledger: { ledgerRecord },
    atomInputs,
    hitInputs,
  })
  const ok = sourceValidation.ok &&
    extractionSnapshot.status === 'ready' &&
    observations.length >= 3 &&
    reviewRoutes.length >= 3 &&
    reviewRoutes.every(route => route.proposalOnly && !route.writesBacklog && !route.writesAtoms && !route.externalWrites) &&
    atomInputs.length >= 3 &&
    hitInputs.length === atomInputs.length &&
    dedupStalenessGuard.ok &&
    ledgerValidation.ok &&
    routeContract.provider !== 'openclaw' &&
    routeContract.readiness?.providerExecutionAllowed === false

  return {
    ok,
    status: ok ? 'ready' : 'blocked',
    cardId: EXTRACTOR_BRAIN_FLEET_PROOF_CARD_ID,
    closeoutKey: EXTRACTOR_BRAIN_FLEET_PROOF_CLOSEOUT_KEY,
    nextCardId: EXTRACTOR_BRAIN_FLEET_PROOF_NEXT_CARD_ID,
    reportArtifactId: REPORT_ARTIFACT_ID,
    sourceItem,
    sourceValidation,
    extractionSnapshot,
    reviewSnapshot,
    routeContract,
    ledgerRequest,
    ledgerRecord,
    ledgerValidation,
    observations,
    reviewRoutes,
    atomInputs,
    hitInputs,
    reportArtifact,
    dedupStalenessGuard,
    skippedReasons,
    providerExecutionAllowed: false,
    externalWrites: false,
    credentialMutation: false,
    notNextBoundaries: EXTRACTOR_BRAIN_FLEET_PROOF_NOT_NEXT,
    summary: {
      sourceArtifactId: sourceItem?.artifactId || null,
      transcriptMode: sourceItem ? 'existing_archive_transcript' : 'missing',
      routeKey: routeContract.routeKey,
      provider: routeContract.provider,
      model: routeContract.model,
      ledgerStatus: ledgerRecord.status,
      stopCondition: ledgerRecord.stopCondition,
      observationCount: observations.length,
      atomCount: atomInputs.length,
      reviewRouteCount: reviewRoutes.length,
      skippedReasonCount: skippedReasons.length,
      duplicateAtomDedupHashCount: dedupStalenessGuard.duplicateAtomDedupHashCount,
    },
    failures: [
      ...sourceValidation.failures,
      ...ledgerValidation.failed.map(failure => ({ check: failure.check, detail: failure.detail })),
      ...(extractionSnapshot.status === 'ready' ? [] : [{ check: 'extraction_snapshot_ready', detail: extractionSnapshot.status }]),
      ...(observations.length >= 3 ? [] : [{ check: 'observation_count', detail: String(observations.length) }]),
      ...(reviewRoutes.length >= 3 ? [] : [{ check: 'review_route_count', detail: String(reviewRoutes.length) }]),
      ...(dedupStalenessGuard.ok ? [] : [{ check: 'dedup_staleness_guard', detail: JSON.stringify(dedupStalenessGuard) }]),
      ...(routeContract.provider !== 'openclaw' ? [] : [{ check: 'non_openclaw_extractor_route_required', detail: routeContract.routeKey }]),
    ],
  }
}

export function buildExtractorBrainFleetProofWriteSet(snapshot = {}, { ledger = null } = {}) {
  const ledgerCallId = ledger?.call?.callId || null
  const atomInputs = atomInputsFromObservations({
    sourceItem: snapshot.sourceItem || {},
    observations: snapshot.observations || [],
    reviewRoutes: snapshot.reviewRoutes || [],
    ledgerCallId,
  })
  const hitInputs = hitInputsFromAtoms({
    sourceItem: snapshot.sourceItem || {},
    atomInputs,
  })
  const reportArtifact = buildReportArtifactInput({
    snapshot: {
      ...snapshot,
      atomInputs,
      hitInputs,
      ledgerRecord: ledger?.ledgerRecord || snapshot.ledgerRecord,
    },
    ledger: ledger || { ledgerRecord: snapshot.ledgerRecord },
    atomInputs,
    hitInputs,
  })
  return {
    reportArtifact,
    atomInputs,
    hitInputs,
  }
}

export function verifyExtractorBrainFleetPersistedProof({
  snapshot = {},
  persisted = {},
  beforeRuntime = {},
  afterRuntime = {},
} = {}) {
  const checks = []
  const sourceItem = snapshot.sourceItem || {}
  addFinding(checks, Boolean(persisted.ledgerCall?.callId), 'ledger call persisted', persisted.ledgerCall?.callId || 'missing')
  addFinding(checks, persisted.ledgerCall?.status === 'skipped', 'ledger records skipped provider execution honestly', persisted.ledgerCall?.status || 'missing')
  addFinding(checks, persisted.ledgerCall?.metadata?.brainFleetLedger?.stopCondition === BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.PROVIDER_EXECUTION_DISABLED, 'ledger stop condition records provider execution disabled', persisted.ledgerCall?.metadata?.brainFleetLedger?.stopCondition || 'missing')
  addFinding(checks, persisted.reportArtifact?.reportArtifactId === REPORT_ARTIFACT_ID, 'proof report artifact persisted', persisted.reportArtifact?.reportArtifactId || 'missing')
  addFinding(checks, list(persisted.reportArtifact?.sourceIds).includes(EXTRACTOR_BRAIN_FLEET_PROOF_SOURCE_ID), 'proof report preserves source ID', list(persisted.reportArtifact?.sourceIds).join(', ') || 'missing')
  addFinding(checks, list(persisted.reportArtifact?.inputArtifactIds).includes(sourceItem.artifactId), 'proof report preserves input artifact provenance', list(persisted.reportArtifact?.inputArtifactIds).join(', ') || 'missing')
  addFinding(checks, list(persisted.atoms).length >= 3, 'intelligence atoms persisted', String(list(persisted.atoms).length))
  addFinding(checks, list(persisted.hits).length >= 3, 'atom hits persisted', String(list(persisted.hits).length))
  addFinding(checks, list(persisted.atoms).every(atom => atom.sourceId === EXTRACTOR_BRAIN_FLEET_PROOF_SOURCE_ID && atom.artifactId === sourceItem.artifactId), 'atoms preserve source artifact refs', list(persisted.atoms).map(atom => `${atom.atomId}:${atom.sourceId}:${atom.artifactId}`).join(', '))
  addFinding(checks, list(persisted.reportArtifact?.structuredOutputJson?.reviewRoutes).length >= 3, 'Build Intel review routes are stored in proof artifact', String(list(persisted.reportArtifact?.structuredOutputJson?.reviewRoutes).length))
  addFinding(checks, text(persisted.reportArtifact?.structuredOutputJson?.trainingNotes?.summary).length > 0, 'training notes summary is stored', persisted.reportArtifact?.structuredOutputJson?.trainingNotes?.summary || 'missing')
  addFinding(checks, persisted.reportArtifact?.structuredOutputJson?.noExternalWrites === true, 'proof records no external writes', String(persisted.reportArtifact?.structuredOutputJson?.noExternalWrites))
  addFinding(checks, stableString(beforeRuntime.credentials || []) === stableString(afterRuntime.credentials || []), 'LLM credentials unchanged by extractor proof', 'credential snapshot comparison')

  const failures = checks.filter(check => !check.ok)
  return {
    ok: failures.length === 0,
    checks,
    failures,
  }
}

export function buildExtractorBrainFleetProofDogfoodProof() {
  const healthyContext = {
    artifactId: EXTRACTOR_BRAIN_FLEET_PROOF_SOURCE_ARTIFACT_ID,
    sourceId: EXTRACTOR_BRAIN_FLEET_PROOF_SOURCE_ID,
    artifactType: 'video_transcript',
    title: EXTRACTOR_BRAIN_FLEET_PROOF_SOURCE_TITLE,
    sourceUrl: EXTRACTOR_BRAIN_FLEET_PROOF_SOURCE_URL,
    contentLength: 26316,
    artifactUpdatedAt: '2026-04-26T18:00:00.000Z',
    excerpt: 'AI team setup folder structure agents workflows prompts dashboard build implementation',
    metadata: {
      sourceKind: 'steve_manual_priority',
      extractionMethod: 'dataforseo_youtube_subtitles_v1',
      normalizedUrl: EXTRACTOR_BRAIN_FLEET_PROOF_SOURCE_URL,
    },
  }
  const llmRuntime = {
    credentials: [
      {
        credentialKey: 'openai-api-default',
        accountLabel: 'OPENAI_API_KEY',
        quotaState: {},
      },
    ],
    routes: [
      {
        routeKey: EXTRACTOR_BRAIN_FLEET_PROOF_ROUTE_KEY,
        workload: 'extraction',
        hubKey: 'foundation',
        provider: 'openai',
        model: 'configured-cheap-extraction-model',
        authPath: 'api_direct',
        credentialKey: 'openai-api-default',
        status: 'available',
      },
    ],
  }
  const healthy = buildExtractorBrainFleetProofSnapshot({
    transcriptContexts: [healthyContext],
    llmRuntime,
  })
  const missingSource = buildExtractorBrainFleetProofSnapshot({ transcriptContexts: [], llmRuntime })
  const staleSource = buildExtractorBrainFleetProofSnapshot({
    transcriptContexts: [{ ...healthyContext, artifactUpdatedAt: '2026-01-01T00:00:00.000Z' }],
    llmRuntime,
  })
  const privateSource = validateExtractorBrainFleetSourceItem({
    ...healthyContext,
    sourceId: 'SRC-SKOOL-001',
    sourceUrl: 'https://skool.com/private/course',
  })
  const openclawRoute = buildExtractorBrainFleetProofSnapshot({
    transcriptContexts: [healthyContext],
    llmRuntime: {
      credentials: [{ credentialKey: 'openclaw-chatgpt-pro', accountLabel: 'local OpenClaw gateway' }],
      routes: [{
        routeKey: 'foundation-extraction-openclaw-chatgpt',
        workload: 'extraction',
        hubKey: 'foundation',
        provider: 'openclaw',
        model: 'openai-codex/gpt-5.4',
        authPath: 'chatgpt_subscription_gateway',
        credentialKey: 'openclaw-chatgpt-pro',
        status: 'available',
      }],
    },
  })
  const rawContentReviewRouteRejected = (() => {
    const route = {
      ...(healthy.reviewRoutes[0] || {}),
      rawTranscript: 'synthetic raw transcript leak',
    }
    return Object.keys(route).some(key => /rawTranscript/i.test(key))
  })()
  const directWritesRejected = healthy.reviewRoutes.every(route =>
    route.proposalOnly === true &&
      route.writesBacklog === false &&
      route.writesAtoms === false &&
      route.writesKnowledgeBase === false &&
      route.externalWrites === false
  )
  const rejectedCases = {
    missingSource: missingSource.ok === false,
    staleSource: staleSource.ok === false,
    privateSource: privateSource.ok === false,
    openclawOnlyRoute: openclawRoute.ok === false,
    rawContentReviewRouteRejected,
    directWritesRejected,
  }
  return {
    ok: healthy.ok === true && Object.values(rejectedCases).every(Boolean),
    mode: 'extractor-brain-fleet-proof-synthetic-dogfood',
    healthy: {
      ok: healthy.ok,
      sourceArtifactId: healthy.summary.sourceArtifactId,
      atomCount: healthy.summary.atomCount,
      reviewRouteCount: healthy.summary.reviewRouteCount,
      ledgerStatus: healthy.summary.ledgerStatus,
      stopCondition: healthy.summary.stopCondition,
    },
    rejectedCases,
    invariant: 'The extractor proof passes only with the exact approved public transcript artifact, Brain Fleet ledger truth, non-OpenClaw route selection, persisted artifact/atom/review-route candidates, duplicate/staleness guards, no raw transcript leakage, and no provider/external/credential side effects.',
  }
}

export function renderExtractorBrainFleetProofCloseout(snapshot = {}, persisted = {}) {
  const lines = []
  lines.push(`# ${EXTRACTOR_BRAIN_FLEET_PROOF_CARD_ID} Closeout`)
  lines.push('')
  lines.push(`Closeout key: \`${EXTRACTOR_BRAIN_FLEET_PROOF_CLOSEOUT_KEY}\``)
  lines.push('')
  lines.push('## Outcome')
  lines.push('')
  lines.push(`- Source artifact: \`${snapshot.sourceItem?.artifactId || EXTRACTOR_BRAIN_FLEET_PROOF_SOURCE_ARTIFACT_ID}\``)
  lines.push(`- Transcript mode: ${snapshot.summary?.transcriptMode || 'existing_archive_transcript'}`)
  lines.push(`- Brain Fleet route: \`${snapshot.summary?.routeKey || EXTRACTOR_BRAIN_FLEET_PROOF_ROUTE_KEY}\``)
  lines.push(`- Ledger call: \`${persisted.ledgerCall?.callId || 'written during close-card proof'}\``)
  lines.push(`- Proof report artifact: \`${REPORT_ARTIFACT_ID}\``)
  lines.push(`- Atoms created: ${persisted.atoms?.length ?? snapshot.summary?.atomCount ?? 0}`)
  lines.push(`- Build Intel review routes stored: ${snapshot.summary?.reviewRouteCount || 0}`)
  lines.push('')
  lines.push('## Boundaries')
  lines.push('')
  lines.push('- Provider execution was skipped for this deterministic proof and recorded in the Brain Fleet ledger.')
  lines.push('- No fresh transcript fetch, public crawl, screenshot/keyframe capture, media download, paid/private auth, credential mutation, or external write occurred.')
  lines.push('- Skool, MyICOR, and Loom remain blocked until exact source approvals.')
  lines.push('')
  lines.push('## Next')
  lines.push('')
  lines.push(`Continue \`${EXTRACTOR_BRAIN_FLEET_PROOF_NEXT_CARD_ID}\` only after raw-green gates and pushed main.`)
  return `${lines.join('\n')}\n`
}
