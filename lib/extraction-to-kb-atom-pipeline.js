import crypto from 'node:crypto'

import { compileFoundationKbDraft } from './foundation-kb-compiler-v1.js'

export const EXTRACTION_TO_KB_ATOM_PIPELINE_CARD_ID = 'EXTRACTION-TO-KB-ATOM-PIPELINE-001'
export const EXTRACTION_TO_KB_ATOM_PIPELINE_CLOSEOUT_KEY = 'extraction-to-kb-atom-pipeline-v1'
export const EXTRACTION_TO_KB_ATOM_PIPELINE_PLAN_PATH = 'docs/process/extraction-to-kb-atom-pipeline-001-plan.md'
export const EXTRACTION_TO_KB_ATOM_PIPELINE_APPROVAL_PATH = 'docs/process/approvals/EXTRACTION-TO-KB-ATOM-PIPELINE-001.json'
export const EXTRACTION_TO_KB_ATOM_PIPELINE_SCRIPT_PATH = 'scripts/process-extraction-to-kb-atom-pipeline-check.mjs'
export const EXTRACTION_TO_KB_ATOM_PIPELINE_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-27-hot-doc-cleanup/2026-05-18-extraction-to-kb-atom-pipeline-closeout.md'
export const EXTRACTION_TO_KB_ATOM_PIPELINE_SPRINT_ID = 'extraction-to-kb-atom-pipeline-2026-05-18'
export const EXTRACTION_TO_KB_ATOM_PIPELINE_NEXT_CARD_ID = 'EXTRACTION-PARALLEL-WORKER-PROTOCOL-001'

export const EXTRACTION_TO_KB_ATOM_PIPELINE_CHANGED_FILES = [
  'lib/extraction-to-kb-atom-pipeline.js',
  'scripts/process-extraction-to-kb-atom-pipeline-check.mjs',
  'lib/foundation-intelligence-audit-verifier.js',
  'lib/foundation-build-closeout-intelligence-records.js',
  'docs/process/extraction-to-kb-atom-pipeline-001-plan.md',
  'docs/process/approvals/EXTRACTION-TO-KB-ATOM-PIPELINE-001.json',
  'docs/_archive/handoffs/2026-05-27-hot-doc-cleanup/2026-05-18-extraction-to-kb-atom-pipeline-closeout.md',
  'docs/rebuild/current-plan.md',
  'docs/rebuild/current-state.md',
  'package.json',
]

export const EXTRACTION_TO_KB_ATOM_PIPELINE_PROOF_COMMANDS = [
  'node --check lib/extraction-to-kb-atom-pipeline.js lib/foundation-intelligence-audit-verifier.js scripts/process-extraction-to-kb-atom-pipeline-check.mjs scripts/foundation-verify.mjs',
  'npm run process:extraction-to-kb-atom-pipeline-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=EXTRACTION-TO-KB-ATOM-PIPELINE-001 --planApprovalRef=docs/process/approvals/EXTRACTION-TO-KB-ATOM-PIPELINE-001.json --closeoutKey=extraction-to-kb-atom-pipeline-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=EXTRACTION-TO-KB-ATOM-PIPELINE-001 --closeoutKey=extraction-to-kb-atom-pipeline-v1',
  'npm run process:foundation-ship -- --card=EXTRACTION-TO-KB-ATOM-PIPELINE-001 --planApprovalRef=docs/process/approvals/EXTRACTION-TO-KB-ATOM-PIPELINE-001.json --closeoutKey=extraction-to-kb-atom-pipeline-v1 --commitRef=HEAD',
]

export const EXTRACTION_TO_KB_ATOM_PIPELINE_NOT_NEXT_BOUNDARIES = [
  'No live extraction.',
  'No public web lookup, YouTube API call, source crawl, transcript fetch, screenshot/keyframe capture, download, summarization, vision analysis, or model call.',
  'No private, paid, community, course, Skool, MyICOR, Loom, or authorized-browser access.',
  'No Research Inbox write, KB page write, atom row write, synthesis fact write, action-route row write, backlog mutation, vector write, or query-index write.',
  'No MEETING-VAULT-ACL-001 Phase B or historical Meeting Vault cleanup.',
  'No Drive permissions mutation or Drive request-access email.',
  'No Drive/Gmail/ClickUp/Slack/Agent Feedback mutation.',
  'No hidden subagents or parallel builders.',
]

const REQUIRED_ARTIFACT_FIELDS = [
  'artifactId',
  'sourceId',
  'sourceUrl',
  'capturedAt',
  'staleAfter',
  'privacyTier',
  'permissionClass',
  'citations',
  'claims',
]

const PRIVACY_RANK = {
  public: 0,
  internal: 1,
  restricted: 2,
  owner_private: 3,
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
}

function unique(values = []) {
  return [...new Set(values.map(value => text(value)).filter(Boolean))]
}

function stableHash(value = '') {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex')
}

function stableId(prefix, value) {
  return `${prefix}:${stableHash(value).slice(0, 24)}`
}

function toDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function addFailure(failures, condition, code, detail = '') {
  if (!condition) failures.push({ code, detail })
}

export function buildExtractionToKbAtomPipelineFixture(overrides = {}) {
  return {
    artifactId: 'extract-artifact:youtube-build-intel-agent-os-001',
    sourceId: 'SRC-YOUTUBE-INTEL-001',
    sourceUrl: 'https://www.youtube.com/@MarkKashef',
    sourceTitle: 'Public YouTube Build Intel fixture',
    creator: 'Mark Kashef',
    capturedAt: '2026-05-18T18:00:00.000-04:00',
    staleAfter: '2026-06-18T18:00:00.000-04:00',
    privacyTier: 'public',
    minTier: 1,
    permissionClass: 'public_no_auth_approved_artifact_fixture',
    extractionApprovalRef: 'runtime-approval-required-before-live-extraction',
    artifactMode: 'synthetic_contract_fixture',
    runtimeExtractionStarted: false,
    transcriptFetchStarted: false,
    screenshotCaptureStarted: false,
    modelCallsStarted: false,
    externalWritesStarted: false,
    downstreamWritesStarted: false,
    citations: [
      {
        id: 'cite-agent-os-workflow',
        sourceId: 'SRC-YOUTUBE-INTEL-001',
        url: 'https://www.youtube.com/@MarkKashef',
        capturedAt: '2026-05-18T18:00:00.000-04:00',
      },
    ],
    claims: [
      {
        id: 'claim-agent-os-loop',
        text: 'Agent operating-system workflow ideas must be routed through source-backed KB, atom, and action-review gates before implementation.',
        claimType: 'pattern',
        sourceId: 'SRC-YOUTUBE-INTEL-001',
        citationId: 'cite-agent-os-workflow',
        confidence: 0.86,
      },
    ],
    observations: [
      {
        id: 'obs-route-through-review',
        text: 'Useful public creator ideas should become reviewable candidates, not direct doctrine or automatic tasks.',
        sourceId: 'SRC-YOUTUBE-INTEL-001',
        citationId: 'cite-agent-os-workflow',
      },
    ],
    contradictions: [],
    recommendedOwner: 'Foundation',
    recommendedRouteType: 'owner_action',
    recommendedReviewSurface: 'build-intel-review',
    ...overrides,
  }
}

export function validateExtractionArtifactForPipeline(artifact = {}, options = {}) {
  const failures = []
  const now = toDate(options.now || '2026-05-18T18:00:00.000-04:00')
  for (const field of REQUIRED_ARTIFACT_FIELDS) {
    const value = artifact[field]
    addFailure(failures, Array.isArray(value) ? value.length > 0 : Boolean(text(value)), 'missing_required_field', field)
  }

  const citations = list(artifact.citations)
  const claims = list(artifact.claims)
  const sourceIds = unique([artifact.sourceId, ...citations.map(citation => citation.sourceId), ...claims.map(claim => claim.sourceId)])
  const staleAfter = toDate(artifact.staleAfter)
  const capturedAt = toDate(artifact.capturedAt)
  const privacyTier = text(artifact.privacyTier)
  const privacyRank = PRIVACY_RANK[privacyTier]
  const sourceUrl = text(artifact.sourceUrl)

  addFailure(failures, sourceIds.length === 1 && sourceIds[0] === text(artifact.sourceId), 'source_id_mismatch', sourceIds.join(', ') || 'missing')
  addFailure(failures, /^https?:\/\//.test(sourceUrl) || sourceUrl.startsWith('artifact://') || sourceUrl.startsWith('docs/'), 'source_ref_required', sourceUrl || 'missing')
  addFailure(failures, Boolean(capturedAt), 'captured_at_required', text(artifact.capturedAt) || 'missing')
  addFailure(failures, Boolean(staleAfter) && (!now || staleAfter > now), 'freshness_stale_or_missing', text(artifact.staleAfter) || 'missing')
  addFailure(failures, privacyRank !== undefined, 'privacy_tier_required', privacyTier || 'missing')
  addFailure(failures, privacyRank === undefined || privacyRank <= PRIVACY_RANK.restricted || Boolean(artifact.privateSourceApprovalRef), 'owner_private_requires_approval', privacyTier || 'missing')
  addFailure(failures, !/private|paid|skool|myicor|loom|course|authorized/i.test(text(artifact.permissionClass)) || Boolean(artifact.privateSourceApprovalRef), 'private_or_paid_source_requires_approval', text(artifact.permissionClass))
  addFailure(failures, list(artifact.contradictions).every(item => text(item.status) === 'resolved'), 'unresolved_contradiction', `${list(artifact.contradictions).length} contradiction(s)`)

  for (const claim of claims) {
    const claimId = text(claim.id) || 'missing-claim'
    const matchingCitation = citations.find(citation =>
      text(citation.id) === text(claim.citationId) &&
        text(citation.sourceId) === text(claim.sourceId) &&
        (text(citation.url) || text(citation.artifactId) || text(citation.evidenceId))
    )
    addFailure(failures, Boolean(text(claim.text)), 'claim_text_required', claimId)
    addFailure(failures, Boolean(matchingCitation), 'claim_citation_required', claimId)
  }

  const unsafeSideEffects = [
    'runtimeExtractionStarted',
    'transcriptFetchStarted',
    'screenshotCaptureStarted',
    'modelCallsStarted',
    'externalWritesStarted',
    'downstreamWritesStarted',
  ].filter(field => artifact[field] === true)
  addFailure(failures, unsafeSideEffects.length === 0, 'unsafe_side_effect_started', unsafeSideEffects.join(', '))

  return {
    ok: failures.length === 0,
    status: failures.length ? 'blocked' : 'accepted',
    failures,
    summary: {
      citationCount: citations.length,
      claimCount: claims.length,
      sourceIds,
      privacyTier,
      staleAfter: artifact.staleAfter || null,
      unsafeSideEffectCount: unsafeSideEffects.length,
    },
  }
}

function buildKbRecordsFromArtifact(artifact = {}) {
  return list(artifact.claims).map((claim, index) => ({
    recordType: 'atom',
    recordId: `${artifact.artifactId || 'artifact'}#${claim.id || index + 1}`,
    title: artifact.sourceTitle || `Extraction claim ${index + 1}`,
    claim: claim.text,
    sourceId: claim.sourceId || artifact.sourceId,
    evidenceRef: list(artifact.citations).find(citation => citation.id === claim.citationId)?.url || artifact.sourceUrl,
    minTier: artifact.minTier || 1,
    privacyTier: artifact.privacyTier || 'internal',
    updatedAt: artifact.capturedAt,
  }))
}

function buildAtomCandidates(artifact = {}) {
  return list(artifact.claims).map((claim, index) => ({
    atomId: stableId('atom-candidate', `${artifact.artifactId}|${claim.id || index}`),
    title: artifact.sourceTitle || `Extraction atom candidate ${index + 1}`,
    atomType: claim.claimType === 'pattern' ? 'pattern' : 'claim',
    sourceId: claim.sourceId || artifact.sourceId,
    evidenceRef: list(artifact.citations).find(citation => citation.id === claim.citationId)?.url || artifact.sourceUrl,
    citationId: claim.citationId,
    derivedClaim: claim.text,
    qualityScore: Math.round(Number(claim.confidence || 0.8) * 100),
    status: 'candidate_only',
    writeMode: 'proposal_only',
    approvalRequiredBeforePersist: true,
  }))
}

function buildSynthesisFactCandidates(artifact = {}) {
  return list(artifact.claims).map((claim, index) => ({
    factId: stableId('fact-candidate', `${artifact.artifactId}|${claim.id || index}`),
    naturalKey: stableId('fact-natural-key', `${claim.sourceId || artifact.sourceId}|${claim.text}`),
    sourceIds: unique([claim.sourceId || artifact.sourceId]),
    evidenceRefs: unique([claim.citationId, artifact.artifactId]),
    text: claim.text,
    supportLevel: 'single_artifact_candidate',
    status: 'candidate_only',
    writeMode: 'proposal_only',
    approvalRequiredBeforePersist: true,
  }))
}

function buildActionRouteCandidates(artifact = {}) {
  return list(artifact.claims).map((claim, index) => ({
    routeId: stableId('action-route-candidate', `${artifact.artifactId}|${claim.id || index}|${artifact.recommendedOwner || 'Foundation'}`),
    routeType: artifact.recommendedRouteType || 'owner_action',
    destinationTable: 'backlog_items',
    owner: artifact.recommendedOwner || 'Foundation',
    reviewSurface: artifact.recommendedReviewSurface || 'build-intel-review',
    sourceIds: unique([claim.sourceId || artifact.sourceId]),
    evidenceRefs: unique([claim.citationId, artifact.artifactId]),
    proposedPayload: {
      title: artifact.sourceTitle || 'Review extraction insight',
      summary: claim.text,
      nextAction: 'Review this source-backed extraction candidate before any backlog, KB, atom, or action-route write.',
    },
    approvalStatus: 'not_created',
    approvalRequiredBeforePersist: true,
    writeMode: 'proposal_only',
  }))
}

function buildReviewInboxCandidates(artifact = {}) {
  return list(artifact.observations).map((observation, index) => ({
    reviewId: stableId('review-candidate', `${artifact.artifactId}|${observation.id || index}`),
    sourceId: observation.sourceId || artifact.sourceId,
    evidenceRefs: unique([observation.citationId, artifact.artifactId]),
    text: observation.text,
    queue: 'extraction-output-review',
    status: 'candidate_only',
    writeMode: 'proposal_only',
    approvalRequiredBeforePersist: true,
  }))
}

export function buildExtractionToKbAtomPipelineSnapshot(input = {}) {
  const artifact = input.artifact || buildExtractionToKbAtomPipelineFixture()
  const validation = validateExtractionArtifactForPipeline(artifact, input)
  const kbDraft = compileFoundationKbDraft({
    records: validation.ok ? buildKbRecordsFromArtifact(artifact) : [],
    title: 'Extraction Output Routing Draft',
    pageId: 'kb-extraction-output-routing-draft',
    compiledAt: input.compiledAt || '2026-05-18T18:30:00.000-04:00',
    staleAfter: input.staleAfter || artifact.staleAfter,
    liveExtractionStarted: artifact.runtimeExtractionStarted === true,
    modelCallsStarted: artifact.modelCallsStarted === true,
    externalWritesStarted: artifact.externalWritesStarted === true,
    compiledPageWriteStarted: input.compiledPageWriteStarted === true,
  })
  const atomCandidates = validation.ok ? buildAtomCandidates(artifact) : []
  const synthesisFactCandidates = validation.ok ? buildSynthesisFactCandidates(artifact) : []
  const actionRouteCandidates = validation.ok ? buildActionRouteCandidates(artifact) : []
  const reviewInboxCandidates = validation.ok ? buildReviewInboxCandidates(artifact) : []
  const outputWrites = {
    kbPageWrite: input.kbPageWrite === true,
    atomWrite: input.atomWrite === true,
    synthesisFactWrite: input.synthesisFactWrite === true,
    actionRouteWrite: input.actionRouteWrite === true,
    reviewInboxWrite: input.reviewInboxWrite === true,
    backlogMutation: input.backlogMutation === true,
  }
  const unsafeWriteKeys = Object.entries(outputWrites).filter(([, value]) => value === true).map(([key]) => key)
  const ok = validation.ok === true &&
    kbDraft.status === 'draft_ready' &&
    unsafeWriteKeys.length === 0 &&
    atomCandidates.length > 0 &&
    synthesisFactCandidates.length > 0 &&
    actionRouteCandidates.length > 0 &&
    reviewInboxCandidates.length > 0 &&
    [...atomCandidates, ...synthesisFactCandidates, ...actionRouteCandidates, ...reviewInboxCandidates]
      .every(candidate => candidate.writeMode === 'proposal_only' && candidate.approvalRequiredBeforePersist === true)

  return {
    cardId: EXTRACTION_TO_KB_ATOM_PIPELINE_CARD_ID,
    closeoutKey: EXTRACTION_TO_KB_ATOM_PIPELINE_CLOSEOUT_KEY,
    status: ok ? 'ready' : 'blocked',
    ok,
    proposalOnly: true,
    runtimeExtractionApprovedByThisCard: false,
    liveExtractionStarted: artifact.runtimeExtractionStarted === true,
    modelCallsStarted: artifact.modelCallsStarted === true,
    externalWritesStarted: artifact.externalWritesStarted === true,
    outputWrites,
    validation,
    kbDraft,
    atomCandidates,
    synthesisFactCandidates,
    actionRouteCandidates,
    reviewInboxCandidates,
    failures: [
      ...validation.failures.map(failure => `${failure.code}:${failure.detail}`),
      ...kbDraft.failures.map(failure => `kb:${failure}`),
      ...unsafeWriteKeys.map(key => `write_started:${key}`),
    ],
    notNextBoundaries: EXTRACTION_TO_KB_ATOM_PIPELINE_NOT_NEXT_BOUNDARIES,
    recommendedNext: EXTRACTION_TO_KB_ATOM_PIPELINE_NEXT_CARD_ID,
    summary: {
      sourceId: artifact.sourceId || null,
      citationCount: validation.summary.citationCount,
      claimCount: validation.summary.claimCount,
      kbDraftStatus: kbDraft.status,
      atomCandidateCount: atomCandidates.length,
      synthesisFactCandidateCount: synthesisFactCandidates.length,
      actionRouteCandidateCount: actionRouteCandidates.length,
      reviewInboxCandidateCount: reviewInboxCandidates.length,
      unsafeWriteCount: unsafeWriteKeys.length,
      unsafeSideEffectCount: validation.summary.unsafeSideEffectCount,
    },
  }
}

export function buildExtractionToKbAtomPipelineDogfoodProof() {
  const healthy = buildExtractionToKbAtomPipelineSnapshot()
  const missingSourceId = buildExtractionToKbAtomPipelineSnapshot({
    artifact: buildExtractionToKbAtomPipelineFixture({ sourceId: '' }),
  })
  const missingCitation = buildExtractionToKbAtomPipelineSnapshot({
    artifact: buildExtractionToKbAtomPipelineFixture({
      citations: [],
      claims: [{ ...buildExtractionToKbAtomPipelineFixture().claims[0], citationId: '' }],
    }),
  })
  const staleArtifact = buildExtractionToKbAtomPipelineSnapshot({
    artifact: buildExtractionToKbAtomPipelineFixture({ staleAfter: '2026-05-01T00:00:00.000-04:00' }),
  })
  const unresolvedContradiction = buildExtractionToKbAtomPipelineSnapshot({
    artifact: buildExtractionToKbAtomPipelineFixture({
      contradictions: [{ id: 'contra-1', status: 'open', detail: 'Fixture contradiction must be resolved before routing.' }],
    }),
  })
  const privateWithoutApproval = buildExtractionToKbAtomPipelineSnapshot({
    artifact: buildExtractionToKbAtomPipelineFixture({
      privacyTier: 'owner_private',
      permissionClass: 'private_course_auth_required',
      privateSourceApprovalRef: '',
    }),
  })
  const liveSideEffect = buildExtractionToKbAtomPipelineSnapshot({
    artifact: buildExtractionToKbAtomPipelineFixture({
      runtimeExtractionStarted: true,
      transcriptFetchStarted: true,
      modelCallsStarted: true,
    }),
  })
  const directWrites = buildExtractionToKbAtomPipelineSnapshot({
    kbPageWrite: true,
    atomWrite: true,
    actionRouteWrite: true,
    backlogMutation: true,
  })
  const rejectedCases = {
    missingSourceId: missingSourceId.ok === false,
    missingCitation: missingCitation.ok === false,
    staleArtifact: staleArtifact.ok === false,
    unresolvedContradiction: unresolvedContradiction.ok === false,
    privateWithoutApproval: privateWithoutApproval.ok === false,
    liveSideEffect: liveSideEffect.ok === false,
    directWrites: directWrites.ok === false,
  }
  return {
    ok: healthy.ok === true && Object.values(rejectedCases).every(Boolean),
    healthy,
    rejectedCases,
    invariant: 'Source-backed extraction artifacts can become proposal-only KB, atom, synthesis fact, review, and action-route candidates; missing source/citation/freshness/privacy/contradiction proof, live side effects, and direct writes fail closed.',
  }
}

export function renderExtractionToKbAtomPipelineReport(snapshot = buildExtractionToKbAtomPipelineSnapshot()) {
  const lines = []
  lines.push(`# ${EXTRACTION_TO_KB_ATOM_PIPELINE_CARD_ID}`)
  lines.push('')
  lines.push(`Status: ${snapshot.status}`)
  lines.push(`Source: ${snapshot.summary.sourceId || 'missing'}`)
  lines.push('')
  lines.push('## Proposal Outputs')
  lines.push('')
  lines.push(`- KB draft: ${snapshot.summary.kbDraftStatus}`)
  lines.push(`- Atom candidates: ${snapshot.summary.atomCandidateCount}`)
  lines.push(`- Synthesis fact candidates: ${snapshot.summary.synthesisFactCandidateCount}`)
  lines.push(`- Action route candidates: ${snapshot.summary.actionRouteCandidateCount}`)
  lines.push(`- Review inbox candidates: ${snapshot.summary.reviewInboxCandidateCount}`)
  lines.push('')
  lines.push('## Write Boundary')
  lines.push('')
  lines.push(`- Runtime extraction approved by this card: ${snapshot.runtimeExtractionApprovedByThisCard}`)
  lines.push(`- Unsafe output writes: ${snapshot.summary.unsafeWriteCount}`)
  lines.push(`- Unsafe side effects: ${snapshot.summary.unsafeSideEffectCount}`)
  return lines.join('\n')
}
