import {
  buildCreatorWatchlistSnapshot,
  CREATOR_WATCHLIST_SOURCE_ID,
} from './build-intel-watchlist.js'
import {
  validateMultimodalExtractionEnvelope,
} from './multimodal-extractor-contract.js'
import {
  buildResearchInboxPromotionProposal,
  validateResearchInboxItem,
} from './research-inbox.js'

export const BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CLOSEOUT_KEY = 'build-intel-extraction-implementation-v1'
export const BUILD_INTEL_EXTRACTION_IMPLEMENTATION_SPRINT_ID = 'build-intel-extraction-implementation-2026-05-13'
export const BUILD_INTEL_EXTRACTION_IMPLEMENTATION_SCRIPT_PATH = 'scripts/process-build-intel-extraction-check.mjs'
export const BUILD_INTEL_EXTRACTION_IMPLEMENTATION_REPORT_PATH = 'docs/handoffs/2026-05-13-build-intel-extraction-implementation.md'
export const BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CARD_IDS = [
  'YOUTUBE-SCOUT-001',
  'PUBLIC-YOUTUBE-BUILD-INTEL-001',
  'BUILD-INTEL-OBSERVATION-EXTRACTOR-001',
  'BUILD-INTEL-RESEARCH-INBOX-PROPOSALS-001',
  'BUILD-INTEL-BRIEF-001',
]

export const BUILD_INTEL_EXTRACTION_IMPLEMENTATION_NEXT_SPRINT = 'Build Intel Extraction Expansion Sprint'

const BUILD_INTEL_QUERY = 'AI team setup folder structure agents workflows prompts dashboard build implementation'

const BUILD_INTEL_SIGNAL_PATTERNS = [
  /ai team/i,
  /agent/i,
  /folder structure/i,
  /workflow/i,
  /prompt/i,
  /dashboard/i,
  /local/i,
  /setup/i,
  /system/i,
]

const NON_BUILD_INTEL_PATTERNS = [
  /for sale/i,
  /shorts printing money/i,
  /youtube actually pays/i,
  /streamlabs alerts/i,
  /game pulse/i,
  /going viral/i,
]

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase()
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.map(item => normalizeText(item)).filter(Boolean)
  const text = normalizeText(value)
  return text ? [text] : []
}

function unique(values = []) {
  return Array.from(new Set(values.filter(Boolean)))
}

function safeUrl(value) {
  return normalizeText(value) || 'archive://missing-source-url'
}

function countSignals(context = {}) {
  const haystack = [
    context.title,
    context.excerpt,
    context.metadata?.sourceKind,
    context.metadata?.valueRoute,
    context.metadata?.evidenceExcerpt,
  ].filter(Boolean).join(' ')
  return BUILD_INTEL_SIGNAL_PATTERNS.filter(pattern => pattern.test(haystack)).length
}

function classifyTranscriptContext(context = {}) {
  const title = normalizeText(context.title)
  const metadata = context.metadata || {}
  const haystack = [title, context.excerpt, metadata.sourceKind, metadata.valueRoute, metadata.evidenceExcerpt].filter(Boolean).join(' ')
  const score = Number(context.relevanceScore || 0)
  const signalCount = countSignals(context)
  const manuallyPrioritized = metadata.sourceKind === 'steve_manual_priority' ||
    metadata.valueRoute === 'agent_system_learning'
  const nonBuildIntel = NON_BUILD_INTEL_PATTERNS.some(pattern => pattern.test(haystack))
  const selected = !nonBuildIntel && (manuallyPrioritized || signalCount >= 4 || score >= 10)

  return {
    selected,
    reason: selected
      ? manuallyPrioritized
        ? 'steve_manual_priority_agent_system_learning'
        : 'build_intel_signal_match'
      : nonBuildIntel
        ? 'non_build_intel_video'
        : 'low_build_intel_signal',
    signalCount,
    relevanceScore: score,
  }
}

export function selectPublicBuildIntelTranscriptInputs({ transcriptContexts = [], limit = 5 } = {}) {
  const rows = Array.isArray(transcriptContexts) ? transcriptContexts : []
  const classified = rows.map(context => {
    const classification = classifyTranscriptContext(context)
    return {
      artifactId: context.artifactId,
      sourceId: context.sourceId,
      artifactType: context.artifactType,
      title: normalizeText(context.title),
      sourceUrl: safeUrl(context.sourceUrl || context.metadata?.normalizedUrl),
      contentLength: Number(context.contentLength || context.metadata?.storedTextChars || 0),
      excerpt: normalizeText(context.excerpt).slice(0, 900),
      matchedTerms: normalizeArray(context.matchedTerms),
      metadata: context.metadata || {},
      ...classification,
    }
  })

  const selected = classified
    .filter(item => item.selected)
    .sort((left, right) => {
      if (right.relevanceScore !== left.relevanceScore) return right.relevanceScore - left.relevanceScore
      return right.signalCount - left.signalCount
    })
    .slice(0, Math.max(1, Number(limit) || 5))

  const skipped = classified
    .filter(item => !item.selected)
    .slice(0, 10)
    .map(item => ({
      artifactId: item.artifactId,
      title: item.title,
      sourceUrl: item.sourceUrl,
      reason: item.reason,
      relevanceScore: item.relevanceScore,
      signalCount: item.signalCount,
    }))

  return {
    considered: classified.length,
    selected,
    skipped,
  }
}

function inferObservationThemes(input = {}) {
  const text = normalizeLower([input.title, input.excerpt].filter(Boolean).join(' '))
  const themes = []
  if (/folder|structure|directory/.test(text)) {
    themes.push({
      theme: 'foundation_file_and_folder_structure',
      plainEnglishTakeaway: 'The useful implementation lesson is not just having agents; it is giving the AI team a visible folder/system structure so work has a place to land.',
      implementationPattern: 'Represent system roles, prompts, outputs, and review queues as explicit files or DB-backed surfaces rather than loose chat context.',
      recommendation: 'Enrich foundation flow/map and internal scoper work with explicit source-to-output structure requirements.',
      relatedCards: ['SYSTEM-FLOW-MAP-001', 'INTERNAL-SCOPER-001', 'BACKLOG-MONITOR-001'],
      keywords: ['folder', 'structure', 'flow', 'scoper', 'backlog'],
    })
  }
  if (/agent|ai team|team/.test(text)) {
    themes.push({
      theme: 'ai_team_roles_need_code_boundaries',
      plainEnglishTakeaway: 'The implementation lesson is that AI team roles need deterministic code boundaries and review gates, not just more agent personas.',
      implementationPattern: 'Use code for routing, storage, checks, and queues; reserve LLM calls for judgment, synthesis, and generation.',
      recommendation: 'Keep future dev-team-advisor cards proposal-only and split code modules from true LLM-agent judgment boundaries.',
      relatedCards: ['SPRINT-MASTER-ADVISOR-001', 'FEEDBACK-TRIAGE-001', 'SKILL-IMPROVER-001'],
      keywords: ['agent', 'team', 'code', 'proposal', 'advisor'],
    })
  }
  if (/prompt|instruction|context/.test(text)) {
    themes.push({
      theme: 'prompt_context_needs_durable_memory',
      plainEnglishTakeaway: 'Prompt and context quality should come from durable project memory and card doctrine, not one-off chat instructions.',
      implementationPattern: 'Promote useful chat context into source contracts, backlog cards, handoffs, verifier checks, or memory files before it disappears.',
      recommendation: 'Use Research Inbox and Internal Scoper outputs as the bridge from builder lessons to card doctrine.',
      relatedCards: ['RESEARCH-INBOX-001', 'FEEDBACK-CAPTURE-001', 'INTERNAL-SCOPER-001'],
      keywords: ['prompt', 'context', 'memory', 'research', 'inbox'],
    })
  }
  if (/local|setup|works/.test(text)) {
    themes.push({
      theme: 'local_first_setup_with_governed_upgrade_path',
      plainEnglishTakeaway: 'A local working setup is valuable when it is governed by contracts and proof, then upgraded deliberately into broader extraction.',
      implementationPattern: 'Start with no-auth archive consumption, prove the envelope, then add current-video discovery and authorized screenshot/OCR work later.',
      recommendation: 'Make the next sprint expand discovery and visual evidence only after Steve is present for auth/content-use decisions.',
      relatedCards: ['PUBLIC-YOUTUBE-PREFLIGHT-001', 'MULTIMODAL-EXTRACTOR-001', 'YOUTUBE-SCOUT-001'],
      keywords: ['local', 'setup', 'proof', 'extraction', 'multimodal'],
    })
  }
  if (!themes.length) {
    themes.push({
      theme: 'build_intel_needs_review',
      plainEnglishTakeaway: 'This transcript has some Build Intel signal, but the implementation lesson needs Steve/Codex review before it becomes scope.',
      implementationPattern: 'Route ambiguous lessons to Research Inbox with no automatic backlog mutation.',
      recommendation: 'Review manually before enriching or creating any card.',
      relatedCards: ['RESEARCH-INBOX-001'],
      keywords: ['review', 'proposal', 'research'],
    })
  }
  return themes
}

function buildSourceAnchor(input = {}) {
  return {
    label: input.title || input.artifactId || 'Build Intel transcript',
    url: safeUrl(input.sourceUrl),
    artifactId: input.artifactId || null,
    evidenceLevel: 'transcript_text',
  }
}

export function extractBuildIntelObservationsFromInputs({ inputs = [] } = {}) {
  const observations = []
  for (const input of inputs) {
    const sourceAnchor = buildSourceAnchor(input)
    const themes = inferObservationThemes(input)
    for (const theme of themes) {
      observations.push({
        observationId: `${input.artifactId || 'artifact'}:${theme.theme}`,
        sourceArtifactId: input.artifactId,
        sourceTitle: input.title,
        sourceUrl: sourceAnchor.url,
        theme: theme.theme,
        plainEnglishTakeaway: theme.plainEnglishTakeaway,
        implementationPattern: theme.implementationPattern,
        recommendation: theme.recommendation,
        relatedCards: theme.relatedCards,
        keywords: theme.keywords,
        confidence: input.reason === 'steve_manual_priority_agent_system_learning' ? 'high' : 'medium',
        sourceAnchors: [sourceAnchor],
        evidenceLevels: ['transcript_text'],
        visualEvidenceStatus: 'not_captured_v1',
        missingEvidence: ['screenshots', 'ocr_text', 'key_frames'],
        proposalOnly: true,
        writesBacklog: false,
      })
    }
  }
  return observations
}

export function buildMultimodalEnvelopeForInput({ input = {}, observations = [] } = {}) {
  const envelope = {
    sourceId: input.sourceId || CREATOR_WATCHLIST_SOURCE_ID,
    sourceType: 'public_youtube_video',
    sourceUrl: safeUrl(input.sourceUrl),
    accessClass: 'public_permitted',
    rightsClass: 'public_transcript_archive_via_permitted_subtitle_extractor',
    contentUseBoundary: 'Implementation intelligence only; cite source anchors; do not reproduce transcript text or use paid/private content.',
    evidenceLevels: ['transcript_text'],
    route: {
      provider: input.metadata?.extractionMethod || 'existing_shared_communication_video_transcript',
      model: 'deterministic_build_intel_observation_extractor_v1',
      authPath: 'none',
      estimatedCostUsd: Number(input.metadata?.dataForSeoCostUsd || 0),
    },
    observations: observations.map(observation => observation.plainEnglishTakeaway),
    sourceAnchors: [buildSourceAnchor(input)],
    recommendation: observations.length ? 'adapt' : 'needs_review',
    confidence: input.reason === 'steve_manual_priority_agent_system_learning' ? 'high' : 'medium',
    captureMethod: 'archive_transcript_reuse',
    screenshotStoragePolicy: '',
    visualEvidenceUseBoundary: '',
    visualEvidenceStatus: 'not_captured_v1',
    skippedEvidence: ['screenshots', 'ocr_text', 'key_frames'],
    autoBacklogMutation: false,
  }
  const validation = validateMultimodalExtractionEnvelope(envelope)
  return {
    ...envelope,
    validation,
  }
}

function findExistingRelatedCards({ relatedCards = [], backlogItems = [] } = {}) {
  const liveIds = new Set((backlogItems || []).map(card => card.id).filter(Boolean))
  return relatedCards.filter(cardId => liveIds.has(cardId))
}

export function buildResearchInboxItemsFromObservations({ observations = [], backlogItems = [], limit = 5 } = {}) {
  return observations.slice(0, Math.max(1, Number(limit) || 5)).map(observation => {
    const relatedCards = findExistingRelatedCards({
      relatedCards: observation.relatedCards,
      backlogItems,
    })
    const item = {
      sourceRef: `${observation.sourceUrl}#${encodeURIComponent(observation.theme)}`,
      sourceType: 'youtube',
      whySteveCared: 'Steve identified builder YouTube sources as Build Intel for improving AIOS implementation, not marketing content.',
      plainEnglishTakeaway: observation.plainEnglishTakeaway,
      systemFit: observation.implementationPattern,
      relatedCards,
      recommendation: observation.recommendation,
      evidenceLinks: unique([
        observation.sourceUrl,
        observation.sourceArtifactId ? `shared_communication_artifacts:${observation.sourceArtifactId}` : '',
      ]),
      owner: 'Foundation',
      proposedDisposition: relatedCards.length ? 'enrich_existing_card' : 'needs_steve_review',
      status: 'proposal_ready',
      autoCreateBacklogCard: false,
      acceptanceCriteria: [
        'Steve/Codex reviews this proposal before any backlog card changes.',
        'Any accepted enrichment preserves proposal-only provenance and source anchors.',
      ],
    }
    return {
      item,
      validation: validateResearchInboxItem(item),
      promotionProposal: buildResearchInboxPromotionProposal(item),
    }
  })
}

function summarizeThemes(observations = []) {
  const counts = {}
  for (const observation of observations) {
    counts[observation.theme] = (counts[observation.theme] || 0) + 1
  }
  return Object.entries(counts)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([theme, count]) => ({ theme, count }))
}

function summarizeRelatedCards(proposalRows = []) {
  return unique(proposalRows.flatMap(row => row.item?.relatedCards || []))
}

export function buildBuildIntelBrief({ selectedInputs = [], observations = [], proposalRows = [], generatedAt = new Date().toISOString() } = {}) {
  const relatedCards = summarizeRelatedCards(proposalRows)
  return {
    cardId: 'BUILD-INTEL-BRIEF-001',
    status: selectedInputs.length && observations.length && proposalRows.length ? 'ready' : 'risk',
    generatedAt,
    title: 'Build Intel Extraction Implementation Brief',
    summary: selectedInputs.length
      ? `Consumed ${selectedInputs.length} existing public transcript artifact and produced ${observations.length} implementation observations plus ${proposalRows.length} proposal-only Research Inbox items.`
      : 'No public Build Intel transcript artifacts were selected.',
    topThemes: summarizeThemes(observations),
    selectedArtifacts: selectedInputs.map(input => ({
      artifactId: input.artifactId,
      title: input.title,
      sourceUrl: input.sourceUrl,
      reason: input.reason,
    })),
    proposalCount: proposalRows.length,
    existingCardTargets: relatedCards,
    blockedSources: [
      {
        source: 'Skool earlyaidopters + Mark Kashef',
        reason: 'Steve-present auth/content-use decision required.',
      },
      {
        source: 'myICOR',
        reason: 'Steve-present auth/content-use decision required.',
      },
      {
        source: 'Loom / screenshot-OCR / keyframes',
        reason: 'Requires authorized route and visual evidence storage/use policy.',
      },
    ],
    nextRecommendedSprint: BUILD_INTEL_EXTRACTION_IMPLEMENTATION_NEXT_SPRINT,
    nextRecommendedWork: [
      'Add current public-video discovery once creator channel URLs are confirmed.',
      'Add public developer-community Build Intel sources such as GitHub/Git, Codex Community, Claude Code Community, OpenClaw, and notable open-source AI-coding setups as implementation-pattern inputs.',
      'Add authorized paid-source preflight for Skool/myICOR with Steve present.',
      'Upgrade transcript-only observations with screenshot/OCR/keyframe evidence where allowed.',
      'Run BUILD-SCOPER as proposal-only LLM judgment after more extracted observations exist.',
    ],
    notNext: [
      'No automatic backlog mutation.',
      'No paid/private extraction without Steve auth decision.',
      'No daily scheduled Director/brief automation.',
      'No marketing content production in this Build Intel lane.',
    ],
  }
}

export function buildBuildIntelExtractionImplementationSnapshot({
  transcriptContexts = [],
  backlogItems = [],
  currentSprint = null,
  generatedAt = new Date().toISOString(),
} = {}) {
  const selection = selectPublicBuildIntelTranscriptInputs({ transcriptContexts })
  const observations = extractBuildIntelObservationsFromInputs({ inputs: selection.selected })
  const observationsByArtifact = observations.reduce((acc, observation) => {
    const key = observation.sourceArtifactId || 'unknown'
    acc[key] = acc[key] || []
    acc[key].push(observation)
    return acc
  }, {})
  const envelopes = selection.selected.map(input => buildMultimodalEnvelopeForInput({
    input,
    observations: observationsByArtifact[input.artifactId] || [],
  }))
  const researchInboxRows = buildResearchInboxItemsFromObservations({
    observations,
    backlogItems,
  })
  const brief = buildBuildIntelBrief({
    selectedInputs: selection.selected,
    observations,
    proposalRows: researchInboxRows,
    generatedAt,
  })
  const allEnvelopesValid = envelopes.every(envelope => envelope.validation?.ok === true)
  const allInboxRowsValid = researchInboxRows.every(row =>
    row.validation?.ok === true &&
      row.promotionProposal?.proposalOnly === true &&
      row.promotionProposal?.writesBacklog === false &&
      row.item?.autoCreateBacklogCard === false
  )
  const watchlist = buildCreatorWatchlistSnapshot()
  const publicCandidates = (watchlist.entries || [])
    .filter(entry => entry.sourceCategory === 'build_intel')
    .filter(entry => (entry.platforms || []).some(platform => platform.type === 'youtube'))

  return {
    status: selection.selected.length && observations.length && allEnvelopesValid && allInboxRowsValid ? 'ready' : 'risk',
    closeoutKey: BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CLOSEOUT_KEY,
    sprintId: BUILD_INTEL_EXTRACTION_IMPLEMENTATION_SPRINT_ID,
    cardIds: BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CARD_IDS,
    currentSprintId: currentSprint?.sprint?.sprintId || null,
    generatedAt,
    proposalOnly: true,
    writesBacklog: false,
    opensSprint: false,
    paidAuthUsed: false,
    paidAuthRequiredForV1: false,
    newExternalCrawlStarted: false,
    publicWebSearchStarted: false,
    extractionStarted: true,
    extractionMode: 'existing_archive_transcript_consumption',
    atomsCreated: 0,
    screenshotsCaptured: 0,
    keyFramesCaptured: 0,
    ocrTextCaptured: 0,
    transcriptContextsConsidered: selection.considered,
    selectedTranscriptArtifacts: selection.selected.length,
    skippedTranscriptArtifacts: selection.skipped.length,
    publicYoutubeCandidateCount: publicCandidates.length,
    selectedInputs: selection.selected,
    skippedInputs: selection.skipped,
    multimodalEnvelopes: envelopes,
    observations,
    researchInboxRows,
    brief,
    youtubeScout: {
      cardId: 'YOUTUBE-SCOUT-001',
      status: selection.selected.length ? 'ready' : 'risk',
      selectedArtifactCount: selection.selected.length,
      skippedArtifactCount: selection.skipped.length,
      noAuthRequired: true,
      newExternalCrawlStarted: false,
    },
    publicYoutubeBuildIntel: {
      cardId: 'PUBLIC-YOUTUBE-BUILD-INTEL-001',
      status: selection.selected.length ? 'ready' : 'risk',
      query: BUILD_INTEL_QUERY,
      consumedExistingTranscriptArtifacts: selection.selected.length,
    },
    observationExtractor: {
      cardId: 'BUILD-INTEL-OBSERVATION-EXTRACTOR-001',
      status: observations.length && allEnvelopesValid ? 'ready' : 'risk',
      observationsCount: observations.length,
      allEnvelopesValid,
      visualEvidenceStatus: 'not_captured_v1',
    },
    researchInboxProposals: {
      cardId: 'BUILD-INTEL-RESEARCH-INBOX-PROPOSALS-001',
      status: allInboxRowsValid && researchInboxRows.length ? 'ready' : 'risk',
      proposalCount: researchInboxRows.length,
      enrichExistingCount: researchInboxRows.filter(row => row.item?.proposedDisposition === 'enrich_existing_card').length,
      needsReviewCount: researchInboxRows.filter(row => row.item?.proposedDisposition === 'needs_steve_review').length,
      allRowsValid: allInboxRowsValid,
      writesBacklog: false,
      autoCreatesBacklog: false,
    },
    buildIntelBrief: brief,
    nextAction: 'Sprint review with Steve: decide whether the next Build Intel sprint should add current public-video discovery, paid-source auth preflight, or screenshot/OCR/keyframe upgrade.',
  }
}

export function renderBuildIntelExtractionReport(snapshot = {}) {
  const brief = snapshot.brief || snapshot.buildIntelBrief || {}
  const selected = snapshot.selectedInputs || []
  const observations = snapshot.observations || []
  const proposals = snapshot.researchInboxRows || []
  const lines = [
    '# Build Intel Extraction Implementation - 2026-05-13',
    '',
    `Closeout key: \`${BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CLOSEOUT_KEY}\``,
    '',
    '## Summary',
    '',
    brief.summary || 'No summary generated.',
    '',
    '## Evidence Boundary',
    '',
    '- Input: existing public `video_transcript` artifacts already in `shared_communication_artifacts`.',
    '- No paid/private auth was used.',
    '- No public web search, broad YouTube crawl, screenshot capture, OCR, keyframes, or atom creation happened in this V1.',
    '- Outputs are proposal-only and require Steve/Codex review before backlog changes.',
    '',
    '## Selected Artifacts',
    '',
    ...selected.map(input => `- \`${input.artifactId}\` - ${input.title} (${input.sourceUrl})`),
    ...(selected.length ? [] : ['- None selected.']),
    '',
    '## Top Themes',
    '',
    ...(brief.topThemes || []).map(theme => `- ${theme.theme}: ${theme.count}`),
    ...((brief.topThemes || []).length ? [] : ['- None.']),
    '',
    '## Observations',
    '',
    ...observations.map(observation => `- ${observation.theme}: ${observation.plainEnglishTakeaway}`),
    ...(observations.length ? [] : ['- None.']),
    '',
    '## Research Inbox Proposals',
    '',
    ...proposals.map(row => `- ${row.item?.proposedDisposition || 'unknown'} -> ${(row.item?.relatedCards || []).join(', ') || 'Steve review'}: ${row.item?.recommendation || ''}`),
    ...(proposals.length ? [] : ['- None.']),
    '',
    '## Next',
    '',
    `Recommended next sprint: ${brief.nextRecommendedSprint || BUILD_INTEL_EXTRACTION_IMPLEMENTATION_NEXT_SPRINT}.`,
    '',
    ...(brief.nextRecommendedWork || []).map(item => `- ${item}`),
    '',
    '## Not Next',
    '',
    ...(brief.notNext || []).map(item => `- ${item}`),
    '',
  ]
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`
}
