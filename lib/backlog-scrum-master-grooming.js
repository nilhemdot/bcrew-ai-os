export const BACKLOG_SCRUM_MASTER_GROOMING_CARD_ID = 'BACKLOG-SCRUM-MASTER-GROOMING-001'
export const BACKLOG_SCRUM_MASTER_GROOMING_CLOSEOUT_KEY = 'backlog-scrum-master-grooming-v1'
export const BACKLOG_SCRUM_MASTER_GROOMING_SPRINT_ID = 'backlog-scrum-master-grooming-2026-05-17'
export const BACKLOG_SCRUM_MASTER_GROOMING_PLAN_PATH = 'docs/process/backlog-scrum-master-grooming-001-plan.md'
export const BACKLOG_SCRUM_MASTER_GROOMING_APPROVAL_PATH = 'docs/process/approvals/BACKLOG-SCRUM-MASTER-GROOMING-001.json'
export const BACKLOG_SCRUM_MASTER_GROOMING_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-backlog-scrum-master-grooming-closeout.md'
export const BACKLOG_SCRUM_MASTER_GROOMING_SCRIPT_PATH = 'scripts/process-backlog-scrum-master-grooming-check.mjs'
export const FOUNDATION_NEXT_SPRINT_QUEUE_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-foundation-next-sprint-queue.md'

export const THIN_CARD_MIN_TEXT_LENGTH = 650

export const BACKLOG_GROOMING_CLASSIFICATIONS = {
  buildReady: 'build-ready',
  needsEnrichment: 'needs enrichment',
  duplicateAlias: 'duplicate/alias',
  staleParked: 'stale/parked',
  blocked: 'blocked by Steve/auth/source access',
  sprintBundle: 'belongs inside a larger sprint bundle',
}

export const BACKLOG_GROOMING_DUPLICATE_ALIASES = [
  {
    cardId: 'MKT-002',
    canonicalId: 'MARKETING-PIPELINE-REBUILD-001',
    reason: 'Older marketing-backlog migration overlaps the canonical old-system marketing pipeline rebuild card.',
  },
  {
    cardId: 'MARKETING-PIPELINE-REBUILD',
    canonicalId: 'MARKETING-PIPELINE-REBUILD-001',
    reason: 'Proposal-only marketing pipeline stab overlaps the canonical marketing pipeline rebuild card.',
  },
  {
    cardId: 'REPLY-WATCHING-LOOP',
    canonicalId: 'REPLY-WATCHING-LOOP-001',
    reason: 'Proposal-only reply/watching loop stab overlaps the existing governed action-loop card.',
  },
]

export const BACKLOG_GROOMING_NEXT_SPRINT_BUNDLES = [
  {
    bundleId: 'foundation-operator-surface-truth',
    order: 1,
    title: 'Foundation operator surface truth',
    outcome: 'Make the Foundation command surface easier to inspect before more root or feature work.',
    cards: [
      'FOUNDATION-SURFACE-UPDATES-001',
      'FOUNDATION-SYSTEMS-EMPTY-GROUP-AUDIT-001',
    ],
  },
  {
    bundleId: 'foundation-control-and-access-surface',
    order: 2,
    title: 'Foundation process control and owner access',
    outcome: 'Make running systems, kill switches, decommission posture, and owner-only access visible before broader agent capability work.',
    cards: [
      'SYSTEM-010',
      'FOUNDATION-USERS-001',
    ],
  },
  {
    bundleId: 'source-contract-validation-layer',
    order: 3,
    title: 'Source contract validation layer',
    outcome: 'Revalidate core connectors and make source-contract/connectors/provenance boundaries visible as separate live layers.',
    cards: [
      'SOURCE-001',
      'SOURCE-002',
      'SOURCE-003',
      'SOURCE-012',
      'SOURCE-ID-ARRAY-PROVENANCE-IMPLEMENTATION-001',
    ],
  },
  {
    bundleId: 'security-access-hardening',
    order: 4,
    title: 'Security and access hardening',
    outcome: 'Close credential/provider proof, edge auth, and filtered shared-comms access risks before exposing wider surfaces.',
    cards: [
      'SECURITY-006',
      'SECURITY-PROVIDER-ROTATION-PROOF-001',
      'SECURITY-EDGE-001',
      'SECURITY-FILTERED-COMMS-ACCESS-001',
    ],
  },
  {
    bundleId: 'extraction-runtime-readiness',
    order: 5,
    title: 'Extraction runtime readiness',
    outcome: 'Plan current-day sync, historical backfill, Drive/Gmail/Missive attachments, meeting-video review, and supervised extraction as one coherent runtime slice.',
    cards: [
      'EXTRACT-CURRENT-001',
      'EXTRACT-BACKFILL-001',
      'DRIVE-CONTENT-001',
      'EMAIL-ATTACHMENTS-001',
      'MEETING-VIDEO-001',
      'EXTRACTION-TEAM-001',
    ],
  },
]

const duplicateAliasMap = new Map(BACKLOG_GROOMING_DUPLICATE_ALIASES.map(item => [item.cardId, item]))
const bundledCardIds = new Set(BACKLOG_GROOMING_NEXT_SPRINT_BUNDLES.flatMap(bundle => bundle.cards))

const BLOCKED_PATTERNS = [
  /\bSteve approval required\b/i,
  /\bSteve is present\b/i,
  /\bwhen Steve is present\b/i,
  /\bprovider-side rotation\b/i,
  /\bprovider represented\b/i,
  /\brotate any live key\b/i,
  /\bcredentials?\b/i,
  /\brequest-access\b/i,
  /\bpermission\b/i,
  /\baccess-path audit\b/i,
  /\bblocked from blind\b/i,
  /\boperator approval\b/i,
  /\bsource access\b/i,
  /\bauth\b/i,
]

const STALE_PATTERNS = [
  /\bproposal-only\b/i,
  /\bproposal only\b/i,
  /\bnot active sprint\b/i,
  /\bnot active and not next\b/i,
  /\bdeferred until\b/i,
  /\bpark until\b/i,
  /\bparked until\b/i,
  /\bintentional pause\b/i,
]

const ACTIVE_QUEUE_STAGES = new Set([
  'building_now',
  'scoping',
  'blocked',
  'returned',
  'sprint_ready',
  'next',
  'queued',
])

function cardText(card = {}) {
  return [
    card.title,
    card.source,
    card.summary,
    card.whyItMatters,
    card.nextAction,
    card.statusNote,
    card.owner,
  ].filter(Boolean).join('\n')
}

export function getBacklogCardTextLength(card = {}) {
  return [
    card.source,
    card.summary,
    card.whyItMatters,
    card.nextAction,
    card.statusNote,
  ].reduce((total, value) => total + String(value || '').length, 0)
}

export function getMissingBacklogGroomingFields(card = {}) {
  return ['summary', 'whyItMatters', 'nextAction'].filter(key => !String(card[key] || '').trim())
}

export function isThinBacklogCard(card = {}) {
  return getBacklogCardTextLength(card) < THIN_CARD_MIN_TEXT_LENGTH ||
    getMissingBacklogGroomingFields(card).length > 0
}

function textMatchesAny(text, patterns) {
  return patterns.some(pattern => pattern.test(text))
}

function classifyBlocked(card = {}) {
  const text = cardText(card)
  if (textMatchesAny(text, BLOCKED_PATTERNS)) return true
  return /^SECURITY-/.test(card.id || '') || /^AGENT-FEEDBACK-.*SEND/.test(card.id || '')
}

function classifyStaleParked(card = {}) {
  if (card.lane === 'parked') return true
  const text = cardText(card)
  return textMatchesAny(text, STALE_PATTERNS)
}

export function classifyBacklogGroomingCard(card = {}) {
  const alias = duplicateAliasMap.get(card.id)
  if (alias) {
    return {
      classification: BACKLOG_GROOMING_CLASSIFICATIONS.duplicateAlias,
      buildReady: false,
      aliasTarget: alias.canonicalId,
      reason: alias.reason,
    }
  }

  if (classifyStaleParked(card)) {
    return {
      classification: BACKLOG_GROOMING_CLASSIFICATIONS.staleParked,
      buildReady: false,
      reason: card.lane === 'parked' ? 'card is in parked lane' : 'card is proposal-only, deferred, or explicitly not next',
    }
  }

  if (classifyBlocked(card)) {
    return {
      classification: BACKLOG_GROOMING_CLASSIFICATIONS.blocked,
      buildReady: false,
      reason: 'card needs Steve, auth, provider, permission, credential, or source-access action before build',
    }
  }

  if (isThinBacklogCard(card)) {
    return {
      classification: BACKLOG_GROOMING_CLASSIFICATIONS.needsEnrichment,
      buildReady: false,
      reason: `card text is below ${THIN_CARD_MIN_TEXT_LENGTH} characters or missing summary/why/next fields`,
    }
  }

  if (bundledCardIds.has(card.id)) {
    return {
      classification: BACKLOG_GROOMING_CLASSIFICATIONS.sprintBundle,
      buildReady: true,
      reason: 'card has enough scope but belongs with related cards in a sprint bundle',
    }
  }

  return {
    classification: BACKLOG_GROOMING_CLASSIFICATIONS.buildReady,
    buildReady: true,
    reason: 'card has summary, why, next action, and no obvious duplicate, stale, or source-access blocker',
  }
}

export function classifyBacklogGroomingItems(cards = []) {
  const nonDoneCards = cards.filter(card => card.lane !== 'done')
  const classifications = nonDoneCards.map(card => ({
    cardId: card.id,
    lane: card.lane,
    priority: card.priority,
    rank: card.rank,
    title: card.title,
    textLength: getBacklogCardTextLength(card),
    thin: isThinBacklogCard(card),
    ...classifyBacklogGroomingCard(card),
  }))
  const counts = classifications.reduce((memo, item) => {
    memo.byClassification[item.classification] = (memo.byClassification[item.classification] || 0) + 1
    if (item.buildReady) memo.buildReady += 1
    if (item.thin) memo.thin += 1
    return memo
  }, { total: classifications.length, buildReady: 0, thin: 0, byClassification: {} })
  return { classifications, counts }
}

export function getDuplicateAliasStatus(card = {}) {
  const alias = duplicateAliasMap.get(card.id)
  if (!alias) return { applies: false, ok: true }
  const text = cardText(card)
  const ok = text.includes(alias.canonicalId) && /alias|supersed|duplicate|overlap/i.test(text)
  return {
    applies: true,
    ok,
    canonicalId: alias.canonicalId,
    reason: alias.reason,
  }
}

export function evaluateBacklogGroomingQueue({ cards = [], activeSprint = null, bundles = BACKLOG_GROOMING_NEXT_SPRINT_BUNDLES } = {}) {
  const cardsById = new Map(cards.map(card => [card.id, card]))
  const failures = []
  const activeItems = (activeSprint?.items || []).filter(item => ACTIVE_QUEUE_STAGES.has(String(item.stage || '').trim()))

  for (const item of activeItems) {
    failures.push(...evaluateQueuedCard({
      card: cardsById.get(item.cardId),
      cardId: item.cardId,
      context: `active sprint ${activeSprint?.sprint?.sprintId || 'unknown'}/${item.stage}`,
    }))
  }

  for (const bundle of bundles) {
    for (const cardId of bundle.cards || []) {
      failures.push(...evaluateQueuedCard({
        card: cardsById.get(cardId),
        cardId,
        context: `next sprint bundle ${bundle.bundleId}`,
      }))
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    activeItemCount: activeItems.length,
    bundleCount: bundles.length,
    bundleCardCount: bundles.reduce((total, bundle) => total + (bundle.cards || []).length, 0),
  }
}

export function evaluateQueuedCard({ card, cardId, context }) {
  const failures = []
  if (!card) {
    failures.push({ type: 'missing_card', cardId, context })
    return failures
  }

  const classification = classifyBacklogGroomingCard(card)
  const aliasStatus = getDuplicateAliasStatus(card)
  if (card.lane === 'done') failures.push({ type: 'done_card_active_or_next', cardId, context })
  if (isThinBacklogCard(card)) failures.push({ type: 'thin_card', cardId, context, textLength: getBacklogCardTextLength(card) })
  if (classification.classification === BACKLOG_GROOMING_CLASSIFICATIONS.staleParked) failures.push({ type: 'stale_or_parked_card', cardId, context })
  if (aliasStatus.applies && !aliasStatus.ok) failures.push({ type: 'duplicate_without_alias', cardId, context, canonicalId: aliasStatus.canonicalId })
  if (aliasStatus.applies && aliasStatus.ok) failures.push({ type: 'duplicate_card_queued', cardId, context, canonicalId: aliasStatus.canonicalId })

  return failures
}

export function buildBacklogGroomingDogfoodProof(liveCards = []) {
  const [sampleCard] = liveCards.filter(card => card.lane !== 'done' && !isThinBacklogCard(card))
  const liveCard = sampleCard || {
    id: 'SYNTHETIC-LIVE-CARD-001',
    lane: 'scoped',
    title: 'Synthetic live card',
    source: 'synthetic',
    summary: 'Synthetic live card with enough detail for queue validation.',
    whyItMatters: 'Synthetic live card proves a healthy card can pass the queue check.',
    nextAction: 'Run the synthetic proof.',
    statusNote: 'This synthetic card is not stale, duplicate, thin, or done. It has sufficient text to pass the queue validator.',
  }
  const baseCards = [
    liveCard,
    {
      id: 'THIN-CARD-001',
      lane: 'scoped',
      title: 'Thin card',
      source: 'synthetic',
      summary: 'Too thin.',
      whyItMatters: 'Too thin.',
      nextAction: 'Too thin.',
      statusNote: '',
    },
    {
      id: 'STALE-CARD-001',
      lane: 'parked',
      title: 'Parked card',
      source: 'synthetic',
      summary: 'Parked card with enough detail to prove stale cards fail.',
      whyItMatters: 'Parked cards should not be treated as next sprint work.',
      nextAction: 'Do not queue.',
      statusNote: 'Intentional pause, not active. This text is long enough that thinness is not the reason it fails.',
    },
    {
      id: 'DONE-CARD-001',
      lane: 'done',
      title: 'Done card',
      source: 'synthetic',
      summary: 'Done card with enough detail to prove done cards fail active queue validation.',
      whyItMatters: 'Done work should not be presented as active or next sprint work.',
      nextAction: 'Already done.',
      statusNote: 'Closed on 2026-05-17 with proof: npm run foundation:verify passed and docs/handoffs/example.md records the closeout.',
    },
    {
      id: 'MKT-002',
      lane: 'research',
      title: 'Duplicate without alias',
      source: 'synthetic',
      summary: 'Duplicate card with enough detail to prove duplicate queue validation.',
      whyItMatters: 'Duplicate cards should not be queued unless they are explicitly resolved to canonical live truth.',
      nextAction: 'Do not queue this duplicate.',
      statusNote: 'Long enough synthetic note but intentionally missing alias target wording for duplicate validation.',
    },
  ]
  const makeBundle = cardId => [{ bundleId: 'dogfood', cards: [cardId] }]
  const healthy = evaluateBacklogGroomingQueue({ cards: baseCards, activeSprint: { items: [] }, bundles: makeBundle(liveCard.id) })
  const missing = evaluateBacklogGroomingQueue({ cards: baseCards, activeSprint: { items: [] }, bundles: makeBundle('MISSING-CARD-001') })
  const thin = evaluateBacklogGroomingQueue({ cards: baseCards, activeSprint: { items: [] }, bundles: makeBundle('THIN-CARD-001') })
  const stale = evaluateBacklogGroomingQueue({ cards: baseCards, activeSprint: { items: [] }, bundles: makeBundle('STALE-CARD-001') })
  const done = evaluateBacklogGroomingQueue({ cards: baseCards, activeSprint: { items: [] }, bundles: makeBundle('DONE-CARD-001') })
  const duplicate = evaluateBacklogGroomingQueue({ cards: baseCards, activeSprint: { items: [] }, bundles: makeBundle('MKT-002') })

  return {
    ok: healthy.ok === true &&
      missing.failures.some(failure => failure.type === 'missing_card') &&
      thin.failures.some(failure => failure.type === 'thin_card') &&
      stale.failures.some(failure => failure.type === 'stale_or_parked_card') &&
      done.failures.some(failure => failure.type === 'done_card_active_or_next') &&
      duplicate.failures.some(failure => failure.type === 'duplicate_without_alias'),
    healthyAccepted: healthy.ok,
    missingRejected: missing.ok === false,
    thinRejected: thin.ok === false,
    staleRejected: stale.ok === false,
    doneRejected: done.ok === false,
    duplicateWithoutAliasRejected: duplicate.ok === false,
    invariant: 'active/next sprint queues reject missing, thin, duplicate-without-alias, stale/parked, and done cards',
  }
}

export function buildBacklogGroomingEnrichment(card = {}, classification = classifyBacklogGroomingCard(card)) {
  if (classification.classification === BACKLOG_GROOMING_CLASSIFICATIONS.duplicateAlias) {
    const alias = duplicateAliasMap.get(card.id)
    return {
      nextAction: `Superseded for planning by ${alias.canonicalId}. Do not schedule this duplicate/overlap directly; enrich or build the canonical card instead.`,
      statusNote: appendGroomingNote(card.statusNote, `Duplicate/alias resolved on 2026-05-17 by BACKLOG-SCRUM-MASTER-GROOMING-001. Canonical live card: ${alias.canonicalId}. Reason: ${alias.reason}`),
    }
  }

  if (classification.classification !== BACKLOG_GROOMING_CLASSIFICATIONS.needsEnrichment) return null

  return {
    nextAction: `${String(card.nextAction || '').trim()} Before execution, convert this into a scoped sprint plan with owner, source contract or data boundary, acceptance criteria, focused proof command, foundation:verify, closeout key, and not-next exclusions.`,
    statusNote: appendGroomingNote(card.statusNote, `Enriched on 2026-05-17 by BACKLOG-SCRUM-MASTER-GROOMING-001. This card has enough live backlog context for sprint planning only after its plan names the exact data/source surface, proof command, ship gate, closeout key, and out-of-scope feature boundaries. Do not treat research-lane wording as implementation approval.`),
  }
}

function appendGroomingNote(existing = '', note = '') {
  const current = String(existing || '').trim()
  if (current.includes('BACKLOG-SCRUM-MASTER-GROOMING-001')) return current
  return [current, note].filter(Boolean).join('\n\n')
}
