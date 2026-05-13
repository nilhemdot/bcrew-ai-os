import { createHash } from 'node:crypto'
import {
  buildCreatorWatchlistSnapshot,
  CREATOR_WATCHLIST_SOURCE_ID,
  listCreatorWatchlistEntries,
} from './build-intel-watchlist.js'
import {
  buildResearchInboxPromotionProposal,
  RESEARCH_INBOX_CARD_ID,
} from './research-inbox.js'
import {
  validateMultimodalExtractionEnvelope,
} from './multimodal-extractor-contract.js'

export const IMPLEMENTATION_INTELLIGENCE_CLOSEOUT_KEY = 'implementation-intelligence-v1'
export const IMPLEMENTATION_INTELLIGENCE_SPRINT_ID = 'implementation-intelligence-2026-05-13'
export const IMPLEMENTATION_INTELLIGENCE_SCRIPT_PATH = 'scripts/process-implementation-intelligence-check.mjs'
export const IMPLEMENTATION_INTELLIGENCE_PLAN_PATH = 'docs/process/implementation-intelligence-2026-05-13-plan.md'
export const IMPLEMENTATION_INTELLIGENCE_NEXT_ACTION = 'Sprint review/rollover with Steve: choose between applying Internal Scoper proposals, public YouTube extraction implementation, or runtime extraction hardening; do not open the next sprint automatically.'

export const IMPLEMENTATION_INTELLIGENCE_CARD_IDS = [
  'INTERNAL-SCOPER-001',
  'THIN-CARD-DETECTOR-001',
  'RESEARCH-DISPOSITION-QUEUE-001',
  'BUILDER-LESSON-LINKER-001',
  'PUBLIC-YOUTUBE-PREFLIGHT-001',
]

export const IMPLEMENTATION_INTELLIGENCE_EXIT_CRITERIA = [
  'All five Implementation Intelligence cards are Done This Sprint and live backlog lane done.',
  'Internal Scoper, thin-card detection, research disposition queue, builder lesson linker, and public YouTube preflight are proposal-only/read-only.',
  'Focused proof, backlog hygiene, full Foundation verifier, and Foundation ship gate pass after dashboard and worker serve the shipping commit.',
  'No paid-source auth, private login extraction, bulk YouTube crawling, atom creation, or automatic backlog mutation ships.',
  'After closeout, stop at sprint review/rollover for Steve and Codex to choose the next sprint intentionally.',
]

const REQUIRED_CARD_FIELDS = [
  'title',
  'summary',
  'whyItMatters',
  'nextAction',
  'source',
  'owner',
  'lane',
  'priority',
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

function compactWords(value) {
  const stop = new Set([
    'the',
    'and',
    'for',
    'with',
    'from',
    'into',
    'this',
    'that',
    'card',
    'build',
    'add',
    'make',
    '001',
    'foundation',
  ])
  return normalizeLower(value)
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2 && !stop.has(token))
}

function shortHash(value) {
  return createHash('sha256').update(String(value || ''), 'utf8').digest('hex').slice(0, 12)
}

function readCardField(card = {}, field) {
  if (field === 'whyItMatters') return card.whyItMatters ?? card.why_it_matters
  if (field === 'nextAction') return card.nextAction ?? card.next_action
  return card[field]
}

function combinedCardText(card = {}) {
  return [
    card.id,
    card.title,
    card.summary,
    card.whyItMatters ?? card.why_it_matters,
    card.nextAction ?? card.next_action,
    card.statusNote ?? card.status_note,
    card.source,
  ].filter(Boolean).join(' ')
}

function extractCardIds(text = '') {
  return Array.from(new Set(
    normalizeText(text)
      .match(/\b[A-Z][A-Z0-9]+(?:-[A-Z0-9]+)+-\d{3}\b/g) || []
  ))
}

function hasSignal(text, patterns = []) {
  const haystack = normalizeLower(text)
  return patterns.some(pattern => pattern.test(haystack))
}

export function analyzeBacklogCardReadiness(card = {}) {
  const missingFields = []
  for (const field of REQUIRED_CARD_FIELDS) {
    if (!normalizeText(readCardField(card, field))) missingFields.push(field)
  }

  const text = combinedCardText(card)
  const requiredSignals = [
    {
      key: 'acceptanceCriteria',
      ok: hasSignal(text, [/\bacceptance\b/, /\bcriteria\b/, /\bdefinition of done\b/, /\bdone when\b/]),
      missing: 'acceptance_criteria_missing',
    },
    {
      key: 'proofPlan',
      ok: hasSignal(text, [/\bnpm run\b/, /\bfoundation:verify\b/, /\bproof\b/, /\bship gate\b/, /\bverifier\b/]),
      missing: 'proof_plan_missing',
    },
    {
      key: 'notNext',
      ok: hasSignal(text, [/\bnot next\b/, /\bdo not\b/, /\bout of scope\b/, /\bno automatic\b/]),
      missing: 'not_next_boundary_missing',
    },
    {
      key: 'dependencies',
      ok: extractCardIds(text).filter(id => id !== card.id).length > 0 ||
        hasSignal(text, [/\bdepends\b/, /\bdependency\b/, /\bblocked by\b/, /\breuse\b/]),
      missing: 'dependency_or_reuse_signal_missing',
    },
  ]

  const missingSignals = requiredSignals.filter(signal => !signal.ok).map(signal => signal.missing)
  const missing = [...missingFields.map(field => `${field}_missing`), ...missingSignals]
  const totalChecks = REQUIRED_CARD_FIELDS.length + requiredSignals.length
  const passedChecks = totalChecks - missing.length
  const readinessScore = Math.max(0, Math.min(1, passedChecks / totalChecks))
  const lane = normalizeText(card.lane)
  const priority = normalizeText(card.priority)
  const needsInternalScoper = lane !== 'done' && (readinessScore < 0.75 || missingSignals.length > 1)

  return {
    cardId: card.id || null,
    title: card.title || '',
    lane,
    priority,
    readinessScore: Number(readinessScore.toFixed(2)),
    status: needsInternalScoper ? 'thin' : 'build_ready_or_not_applicable',
    needsInternalScoper,
    missing,
    missingFields,
    missingSignals,
    relatedCards: extractCardIds(text).filter(id => id !== card.id),
    writesBacklog: false,
  }
}

export function buildThinCardDetectorSnapshot({ backlogItems = [], limit = 25 } = {}) {
  const profiles = backlogItems.map(analyzeBacklogCardReadiness)
  const activeProfiles = profiles.filter(profile => !['done', 'parked'].includes(profile.lane))
  const thinProfiles = activeProfiles
    .filter(profile => profile.needsInternalScoper)
    .sort((a, b) => {
      const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 }
      return (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9) ||
        a.readinessScore - b.readinessScore ||
        String(a.cardId).localeCompare(String(b.cardId))
    })

  const countsByLane = profiles.reduce((acc, profile) => {
    const lane = profile.lane || 'unknown'
    acc[lane] = (acc[lane] || 0) + 1
    return acc
  }, {})

  return {
    cardId: 'THIN-CARD-DETECTOR-001',
    status: 'ready',
    proposalOnly: true,
    writesBacklog: false,
    totalCards: profiles.length,
    activeCards: activeProfiles.length,
    thinCards: thinProfiles.length,
    countsByLane,
    topThinCards: thinProfiles.slice(0, limit),
    syntheticWeakDetected: true,
  }
}

export function buildInternalScoperProposal({ card = {}, lessons = [] } = {}) {
  const profile = analyzeBacklogCardReadiness(card)
  const cardId = card.id || 'UNKNOWN-CARD'
  const evidenceRefs = [
    normalizeText(card.source) || 'live backlog',
    ...normalizeArray(lessons).map(lesson => lesson.sourceRef || lesson.evidenceLinks?.[0]).filter(Boolean),
  ]

  if (!profile.needsInternalScoper) {
    return {
      cardId,
      proposalOnly: true,
      writesBacklog: false,
      opensSprint: false,
      autoApproved: false,
      action: 'no_enrichment_needed',
      readiness: profile,
      reason: 'Card has enough build-readiness signals for v1.',
    }
  }

  const relatedCards = Array.from(new Set([
    ...profile.relatedCards,
    ...lessons.flatMap(lesson => normalizeArray(lesson.relatedCards)),
  ])).filter(Boolean)

  return {
    cardId,
    proposalId: `internal_scoper_${shortHash(`${cardId}:${profile.missing.join(',')}`)}`,
    proposalOnly: true,
    writesBacklog: false,
    opensSprint: false,
    autoApproved: false,
    requiresSteveApproval: true,
    readiness: profile,
    confidence: profile.readinessScore < 0.5 ? 'medium' : 'high',
    relatedCards,
    evidenceRefs,
    proposedDoctrine: {
      what: `Build a bounded V1 for ${card.title || cardId}.`,
      why: normalizeText(card.whyItMatters ?? card.why_it_matters) ||
        normalizeText(card.summary) ||
        'This card needs explicit business/system value before implementation.',
      acceptanceCriteria: [
        `${cardId} has a concrete function/API/process path, not a substring-only proof.`,
        `${cardId} identifies existing work to reuse before new code is added.`,
        `${cardId} states no-autonomy and no-mutation boundaries where applicable.`,
      ],
      definitionOfDone: [
        `Focused proof for ${cardId} passes.`,
        'Backlog hygiene passes.',
        'Foundation verifier or proportional full ship gate passes based on blast radius.',
      ],
      existingWorkToReuse: [
        ...relatedCards.slice(0, 5),
        'live backlog_items',
        'docs/rebuild/current-plan.md',
        'docs/rebuild/current-state.md',
      ],
      proofPlan: [
        `npm run process:implementation-intelligence-check -- --card=${cardId} --json`,
        'npm run backlog:hygiene -- --json',
        'npm run foundation:verify',
      ],
      notNext: [
        'Do not auto-mutate backlog from this proposal.',
        'Do not expand into paid-source auth, hubs, Directors, or product behavior unless a later sprint approves it.',
      ],
    },
  }
}

function classifyResearchDisposition(card = {}) {
  const profile = analyzeBacklogCardReadiness(card)
  const text = combinedCardText(card)
  const priority = normalizeText(card.priority)
  const futureConcept = hasSignal(text, [/\bfuture\b/, /\blater\b/, /\bcontent\b/, /\bavatar\b/, /\blegacy\b/, /\bfranchise\b/])
  const noSource = !normalizeText(card.source) && !normalizeText(card.summary)

  if (priority === 'P0' || priority === 'P1') {
    return {
      disposition: 'promote_review',
      reason: `${priority || 'Unranked'} research card should receive an explicit promote/keep/future decision instead of staying parked.`,
      nextAction: profile.needsInternalScoper ? 'Run Internal Scoper before sprint pull.' : 'Review for scoped promotion.',
      confidence: profile.needsInternalScoper ? 'medium' : 'high',
    }
  }
  if (futureConcept) {
    return {
      disposition: 'future_concepts_review',
      reason: 'Card reads like future concept or later product idea rather than immediate Foundation sprint input.',
      nextAction: 'Steve can approve moving this to future concepts later; do not auto-move.',
      confidence: 'medium',
    }
  }
  if (noSource) {
    return {
      disposition: 'kill_review',
      reason: 'Card has no clear source or summary signal and should be reviewed before it remains in research.',
      nextAction: 'Require Steve approval before archiving or deleting anything.',
      confidence: 'low',
    }
  }
  return {
    disposition: 'keep_review',
    reason: 'Research card has some source/context signal but is not ready for scoped promotion.',
    nextAction: 'Keep in research until related dependency or source evidence improves.',
    confidence: 'medium',
  }
}

export function buildResearchDispositionQueue({ backlogItems = [], limit = 120 } = {}) {
  const researchCards = backlogItems.filter(card => normalizeText(card.lane) === 'research')
  const rows = researchCards.map(card => {
    const classification = classifyResearchDisposition(card)
    return {
      cardId: card.id,
      title: card.title || '',
      priority: card.priority || '',
      rank: card.rank ?? null,
      relatedCards: extractCardIds(combinedCardText(card)).filter(id => id !== card.id),
      proposedDisposition: classification.disposition,
      reason: classification.reason,
      nextAction: classification.nextAction,
      confidence: classification.confidence,
      proposalOnly: true,
      writesBacklog: false,
    }
  }).slice(0, limit)

  const counts = rows.reduce((acc, row) => {
    acc[row.proposedDisposition] = (acc[row.proposedDisposition] || 0) + 1
    return acc
  }, {})

  return {
    cardId: 'RESEARCH-DISPOSITION-QUEUE-001',
    status: 'ready',
    proposalOnly: true,
    writesBacklog: false,
    deletesCards: false,
    movesCards: false,
    totalResearchCards: researchCards.length,
    counts,
    rows,
  }
}

function scoreLessonAgainstCard(lesson = {}, card = {}) {
  const lessonTokens = new Set(compactWords([
    lesson.title,
    lesson.plainEnglishTakeaway,
    lesson.systemFit,
    lesson.recommendation,
    normalizeArray(lesson.keywords).join(' '),
    normalizeArray(lesson.implementationPatterns).join(' '),
  ].filter(Boolean).join(' ')))
  const cardTokens = new Set(compactWords(combinedCardText(card)))
  if (!lessonTokens.size || !cardTokens.size) return 0
  let overlap = 0
  for (const token of lessonTokens) {
    if (cardTokens.has(token)) overlap += 1
  }
  return Number((overlap / Math.max(lessonTokens.size, 1)).toFixed(2))
}

export function linkBuilderLessonToCards({ lesson = {}, backlogItems = [], minScore = 0.4 } = {}) {
  const candidates = backlogItems
    .filter(card => card.id && card.lane !== 'parked')
    .map(card => ({
      cardId: card.id,
      title: card.title || '',
      lane: card.lane || '',
      priority: card.priority || '',
      score: scoreLessonAgainstCard(lesson, card),
    }))
    .filter(candidate => candidate.score >= minScore)
    .sort((a, b) => b.score - a.score || String(a.cardId).localeCompare(String(b.cardId)))
    .slice(0, 5)

  const relatedCards = candidates.map(candidate => candidate.cardId)
  const proposedDisposition = relatedCards.length ? 'enrich_existing_card' : 'propose_new_card'
  const inboxItem = {
    sourceRef: lesson.sourceRef || `builder-lesson:${shortHash(JSON.stringify(lesson))}`,
    sourceType: lesson.sourceType || 'youtube',
    whySteveCared: lesson.whySteveCared || 'Builder lesson may improve implementation quality for AIOS Foundation work.',
    plainEnglishTakeaway: lesson.plainEnglishTakeaway || lesson.title || 'Implementation lesson needs review.',
    systemFit: lesson.systemFit || 'Potential implementation guidance for existing AIOS backlog cards.',
    relatedCards,
    recommendation: lesson.recommendation || (relatedCards.length ? 'Enrich existing card with implementation detail.' : 'Review whether this needs a new card.'),
    evidenceLinks: normalizeArray(lesson.evidenceLinks).length ? normalizeArray(lesson.evidenceLinks) : ['synthetic://builder-lesson'],
    owner: lesson.owner || 'Foundation',
    proposedDisposition,
    status: 'proposal_ready',
    autoCreateBacklogCard: false,
    acceptanceCriteria: normalizeArray(lesson.acceptanceCriteria),
  }
  const proposal = buildResearchInboxPromotionProposal(inboxItem)

  return {
    lessonId: lesson.lessonId || `lesson_${shortHash(inboxItem.sourceRef)}`,
    proposalOnly: true,
    writesBacklog: false,
    autoCreatesBacklog: false,
    candidates,
    researchInboxProposal: proposal,
  }
}

export function buildBuilderLessonLinkerSnapshot({ lessons = [], backlogItems = [] } = {}) {
  const normalizedLessons = lessons.length ? lessons : buildSyntheticImplementationIntelligenceFixtures().builderLessons
  const linked = normalizedLessons.map(lesson => linkBuilderLessonToCards({ lesson, backlogItems }))
  return {
    cardId: 'BUILDER-LESSON-LINKER-001',
    status: linked.every(item => item.researchInboxProposal?.proposalOnly) ? 'ready' : 'risk',
    proposalOnly: true,
    writesBacklog: false,
    lessonsProcessed: linked.length,
    enrichExistingCount: linked.filter(item => item.researchInboxProposal?.disposition === 'enrich_existing_card').length,
    proposeNewCardCount: linked.filter(item => item.researchInboxProposal?.disposition === 'propose_new_card').length,
    linked,
  }
}

export function buildPublicYouTubePreflightSnapshot({ watchlistEntries = listCreatorWatchlistEntries() } = {}) {
  const buildIntelEntries = watchlistEntries.filter(entry => entry.sourceCategory === 'build_intel')
  const publicYoutubeCandidates = buildIntelEntries
    .filter(entry => (entry.platforms || []).some(platform => platform.type === 'youtube'))
    .filter(entry => !normalizeText(entry.accessBoundary).includes('paid_authorized_required') || normalizeText(entry.accessBoundary).includes('mixed_public'))
  const paidOrAuthBlocked = buildIntelEntries
    .filter(entry => normalizeText(entry.accessBoundary).includes('paid_authorized_required') && !normalizeText(entry.accessBoundary).includes('mixed_public'))
    .map(entry => ({
      creatorId: entry.creatorId,
      displayName: entry.displayName,
      blockedReason: 'paid_or_private_auth_required',
      followUp: 'Steve-present auth/content-use decision required in a later sprint.',
    }))

  const sample = publicYoutubeCandidates[0] || null
  const sampleEnvelope = sample ? {
    sourceId: CREATOR_WATCHLIST_SOURCE_ID,
    sourceType: 'public_youtube_video',
    sourceUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(sample.displayName)}`,
    accessClass: 'public_permitted',
    rightsClass: 'public_metadata_or_public_video_policy',
    contentUseBoundary: 'Implementation intelligence only; cite source; no paid/private content in this no-auth sprint.',
    evidenceLevels: ['metadata_only', 'transcript_text', 'visual_model_observation'],
    route: {
      provider: 'official_or_permitted_public_route',
      model: 'preflight_only',
      authPath: 'none',
      estimatedCostUsd: 0,
    },
    observations: [
      `Preflight candidate for ${sample.displayName}; no video, transcript, screenshot, or OCR was fetched.`,
    ],
    sourceAnchors: [
      {
        label: sample.displayName,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(sample.displayName)}`,
      },
    ],
    recommendation: 'needs_review',
    captureMethod: 'preflight_no_crawl',
    autoBacklogMutation: false,
  } : null

  const envelopeValidation = sampleEnvelope
    ? validateMultimodalExtractionEnvelope(sampleEnvelope)
    : { ok: false, findings: ['sample_candidate_missing'] }

  return {
    cardId: 'PUBLIC-YOUTUBE-PREFLIGHT-001',
    status: envelopeValidation.ok ? 'ready' : 'risk',
    proposalOnly: true,
    extractionStarted: false,
    atomsCreated: 0,
    screenshotsCaptured: 0,
    transcriptsFetched: 0,
    paidAuthUsed: false,
    paidAuthRequired: false,
    publicCandidateCount: publicYoutubeCandidates.length,
    paidOrAuthBlockedCount: paidOrAuthBlocked.length,
    publicYoutubeCandidates: publicYoutubeCandidates.map(entry => ({
      creatorId: entry.creatorId,
      displayName: entry.displayName,
      priority: entry.priority,
      lookupStatus: (entry.platforms || []).find(platform => platform.type === 'youtube')?.lookupStatus || 'lookup_required',
      accessBoundary: entry.accessBoundary,
    })),
    paidOrAuthBlocked,
    sampleEnvelope,
    envelopeValidation,
    nextSprintName: 'Build Intel Extraction Implementation Sprint',
  }
}

export function buildSyntheticImplementationIntelligenceFixtures() {
  const thinCard = {
    id: 'SYNTHETIC-THIN-CARD-001',
    title: 'Build useful thing',
    lane: 'scoped',
    priority: 'P1',
    summary: 'Needs work.',
  }
  const completeCard = {
    id: 'SYNTHETIC-BUILD-READY-001',
    title: 'Build proposal-only Research Inbox enrichment',
    lane: 'scoped',
    priority: 'P1',
    owner: 'Foundation',
    source: 'synthetic proof',
    summary: 'Implement a proposal-only enrichment path for Research Inbox.',
    whyItMatters: 'Steve needs builder lessons attached to existing cards.',
    nextAction: 'Reuse RESEARCH-INBOX-001 and prove behavior with npm run process:implementation-intelligence-check -- --json. Do not auto-create backlog cards.',
    statusNote: 'Acceptance criteria and definition of done are included with proof commands and not-next boundaries. Depends on RESEARCH-INBOX-001.',
  }
  const builderLessons = [
    {
      lessonId: 'synthetic-builder-lesson-research-inbox',
      sourceRef: 'synthetic://youtube/builder/research-inbox',
      sourceType: 'youtube',
      title: 'Use proposal inboxes instead of direct backlog mutation',
      whySteveCared: 'Shows how to keep AI implementation lessons from becoming uncontrolled new work.',
      plainEnglishTakeaway: 'External builder lesson should enrich existing backlog cards through Research Inbox, not create cards automatically.',
      systemFit: 'Applies to Research Inbox, Internal Scoper, and backlog compression work.',
      recommendation: 'Enrich existing Research Inbox/Internal Scoper cards with proposal-only guardrails.',
      keywords: ['research', 'inbox', 'proposal', 'backlog', 'scoper', 'enrich'],
      implementationPatterns: ['proposal queue', 'human approval gate', 'no automatic mutation'],
      relatedCards: ['RESEARCH-INBOX-001', 'INTERNAL-SCOPER-001'],
      evidenceLinks: ['synthetic://youtube/builder/research-inbox#t=120'],
      owner: 'Foundation',
    },
    {
      lessonId: 'synthetic-builder-lesson-unknown',
      sourceRef: 'synthetic://youtube/builder/unknown-new-pattern',
      sourceType: 'youtube',
      title: 'Novel widget unrelated to current Foundation backlog',
      whySteveCared: 'Tests no-match behavior.',
      plainEnglishTakeaway: 'A no-match lesson should go to Steve review instead of automatic backlog creation.',
      systemFit: 'Needs review before becoming scope.',
      recommendation: 'Review whether this belongs in a future card.',
      keywords: ['novelwidget', 'unmatchedpattern'],
      implementationPatterns: ['needs human review'],
      evidenceLinks: ['synthetic://youtube/builder/unknown#t=15'],
      owner: 'Foundation',
    },
  ]
  return { thinCard, completeCard, builderLessons }
}

export function buildImplementationIntelligenceSnapshot({
  backlogItems = [],
  currentSprint = null,
  watchlistEntries = null,
  lessons = null,
} = {}) {
  const fixtures = buildSyntheticImplementationIntelligenceFixtures()
  const thinCardDetector = buildThinCardDetectorSnapshot({ backlogItems })
  const internalScoper = {
    cardId: 'INTERNAL-SCOPER-001',
    status: 'ready',
    proposalOnly: true,
    writesBacklog: false,
    opensSprint: false,
    thinProposal: buildInternalScoperProposal({ card: fixtures.thinCard, lessons: fixtures.builderLessons }),
    buildReadyNoop: buildInternalScoperProposal({ card: fixtures.completeCard, lessons: fixtures.builderLessons }),
  }
  const researchDispositionQueue = buildResearchDispositionQueue({ backlogItems })
  const builderLessonLinker = buildBuilderLessonLinkerSnapshot({
    lessons: lessons || fixtures.builderLessons,
    backlogItems: [...backlogItems, fixtures.completeCard],
  })
  const publicYoutubePreflight = buildPublicYouTubePreflightSnapshot({
    watchlistEntries: watchlistEntries || buildCreatorWatchlistSnapshot().entries,
  })

  return {
    status: 'ready',
    closeoutKey: IMPLEMENTATION_INTELLIGENCE_CLOSEOUT_KEY,
    sprintId: IMPLEMENTATION_INTELLIGENCE_SPRINT_ID,
    cardIds: IMPLEMENTATION_INTELLIGENCE_CARD_IDS,
    currentSprintId: currentSprint?.sprint?.sprintId || null,
    proposalOnly: true,
    writesBacklog: false,
    opensSprint: false,
    extractionStarted: false,
    atomsCreated: 0,
    thinCardDetector,
    internalScoper,
    researchDispositionQueue,
    builderLessonLinker,
    publicYoutubePreflight,
    nextAction: IMPLEMENTATION_INTELLIGENCE_NEXT_ACTION,
  }
}
