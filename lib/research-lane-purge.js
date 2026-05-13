export const RESEARCH_LANE_PURGE_CARD_ID = 'RESEARCH-LANE-PURGE-001'
export const RESEARCH_LANE_PURGE_CLOSEOUT_KEY = 'research-lane-purge-v1'
export const RESEARCH_LANE_PURGE_PLAN_PATH = 'docs/process/research-lane-purge-001-plan.md'
export const RESEARCH_LANE_PURGE_APPROVAL_PATH = 'docs/process/approvals/RESEARCH-LANE-PURGE-001.json'
export const RESEARCH_LANE_PURGE_SCRIPT_PATH = 'scripts/process-research-lane-purge-check.mjs'
export const RESEARCH_LANE_PURGE_REPORT_PATH = 'docs/handoffs/research-purge-2026-05-13.md'

const DAY_MS = 24 * 60 * 60 * 1000
const STALE_DAYS = 30

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeList(values) {
  return Array.isArray(values) ? values.filter(Boolean) : []
}

function lower(value) {
  return normalizeText(value).toLowerCase()
}

function daysSince(value, now = new Date()) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY_MS))
}

function cardText(card = {}) {
  return [
    card.id,
    card.title,
    card.summary,
    card.whyItMatters,
    card.nextAction,
    card.statusNote,
    card.source,
  ].map(normalizeText).filter(Boolean).join('\n')
}

function unique(values = []) {
  const seen = new Set()
  return values.filter(value => {
    const key = normalizeText(value)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function extractRelatedSignals(card = {}) {
  const text = cardText(card)
  const ids = text.match(/\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d{3}\b/g) || []
  const source = normalizeText(card.source)
  const signals = unique([
    ...ids.filter(id => id !== card.id),
    source && `source:${source}`,
  ])
  return signals.slice(0, 6)
}

function classifyDisposition(card = {}, { now = new Date() } = {}) {
  const text = lower(cardText(card))
  const priority = normalizeText(card.priority || 'P3').toUpperCase()
  const updatedAt = card.updatedAt || card.updated_at || card.createdAt || card.created_at
  const ageDays = daysSince(updatedAt, now)
  const isStale = typeof ageDays === 'number' ? ageDays >= STALE_DAYS : true
  const relatedSignals = extractRelatedSignals(card)
  const hasRelatedSignal = relatedSignals.length > 0
  const highPriority = priority === 'P0' || priority === 'P1'
  const textSuggestsPromotion = /\b(next sprint|p0|critical|blocking|must|source contract|connector|security|strategy|reply|watching|tier|gate|verifier)\b/.test(text)
  const textSuggestsKill = /\b(deprecated|duplicate|superseded|obsolete|invalid|wrong|dead|kill)\b/.test(text)
  const textSuggestsFuture = /\b(future|idea|concept|content|someday|later|parking|explore|maybe)\b/.test(text)

  if (highPriority || textSuggestsPromotion) {
    return {
      disposition: 'promote_review',
      reason: highPriority
        ? `${priority} research card needs an explicit promote/return/kill decision instead of staying parked.`
        : 'Research text names a near-term blocker or next-sprint signal.',
      ageDays,
      isStale,
      relatedSignals,
    }
  }

  if (isStale && textSuggestsKill && !hasRelatedSignal) {
    return {
      disposition: 'kill_review',
      reason: 'Stale research text appears deprecated/duplicate/superseded and has no related sprint signal.',
      ageDays,
      isStale,
      relatedSignals,
    }
  }

  if (textSuggestsFuture && !highPriority) {
    return {
      disposition: 'move_to_future_concepts_review',
      reason: 'Looks like a future idea/concept rather than active sprint input.',
      ageDays,
      isStale,
      relatedSignals,
    }
  }

  if (!isStale || hasRelatedSignal) {
    return {
      disposition: 'keep_review',
      reason: !isStale
        ? 'Recent update; keep visible for another review cycle.'
        : 'Related card/source signal exists; keep until the related work is reviewed.',
      ageDays,
      isStale,
      relatedSignals,
    }
  }

  if (textSuggestsFuture || isStale) {
    return {
      disposition: 'move_to_future_concepts_review',
      reason: textSuggestsFuture
        ? 'Looks like a future idea/concept rather than active sprint input.'
        : 'Stale research card has no related sprint signal; review for future-concepts parking.',
      ageDays,
      isStale,
      relatedSignals,
    }
  }

  return {
    disposition: 'keep_review',
    reason: 'Default preserve path; no automatic purge decision is allowed.',
    ageDays,
    isStale,
    relatedSignals,
  }
}

function countBy(rows, keyFn) {
  return rows.reduce((acc, row) => {
    const key = keyFn(row)
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

export function buildResearchLanePurgeSnapshot({
  backlogItems = [],
  generatedAt = new Date().toISOString(),
} = {}) {
  const now = new Date(generatedAt)
  const researchCards = normalizeList(backlogItems)
    .filter(card => card.lane === 'research')
    .sort((left, right) => {
      const leftPriority = normalizeText(left.priority || 'P9')
      const rightPriority = normalizeText(right.priority || 'P9')
      if (leftPriority !== rightPriority) return leftPriority.localeCompare(rightPriority)
      return normalizeText(left.id).localeCompare(normalizeText(right.id))
    })

  const items = researchCards.map((card, index) => {
    const disposition = classifyDisposition(card, { now })
    return {
      rank: index + 1,
      cardId: card.id,
      title: card.title,
      priority: card.priority || null,
      createdAt: card.createdAt || card.created_at || null,
      updatedAt: card.updatedAt || card.updated_at || null,
      ageDays: disposition.ageDays,
      updateSignal: disposition.ageDays === null
        ? 'missing update timestamp'
        : disposition.ageDays >= STALE_DAYS
          ? `stale ${disposition.ageDays}d`
          : `recent ${disposition.ageDays}d`,
      relatedSignals: disposition.relatedSignals,
      proposedDisposition: disposition.disposition,
      proposedOnly: true,
      reason: disposition.reason,
      nextReviewAction: disposition.disposition === 'promote_review'
        ? 'Steve/reviewer decides whether to promote into scoped backlog or return/kill.'
        : disposition.disposition === 'kill_review'
          ? 'Steve/reviewer confirms before any close/delete action.'
          : disposition.disposition === 'move_to_future_concepts_review'
            ? 'Steve/reviewer decides whether to move the idea into a future-concepts parking doc.'
            : 'Keep parked until the related source/sprint context changes.',
    }
  })

  return {
    cardId: RESEARCH_LANE_PURGE_CARD_ID,
    closeoutKey: RESEARCH_LANE_PURGE_CLOSEOUT_KEY,
    reportPath: RESEARCH_LANE_PURGE_REPORT_PATH,
    generatedAt,
    proposedOnly: true,
    mutationPolicy: 'report_only_no_backlog_lane_changes',
    staleDays: STALE_DAYS,
    summary: {
      researchCardCount: researchCards.length,
      proposedOnlyCount: items.filter(item => item.proposedOnly).length,
      staleCount: items.filter(item => item.ageDays === null || item.ageDays >= STALE_DAYS).length,
      withRelatedSignalCount: items.filter(item => item.relatedSignals.length).length,
      dispositionCounts: countBy(items, item => item.proposedDisposition),
      priorityCounts: countBy(items, item => item.priority || 'missing'),
    },
    items,
    knownLimits: [
      'This report does not delete cards.',
      'This report does not auto-move research cards.',
      'This report does not edit or create a future-concepts parking doc.',
      'Every disposition is proposed-only and needs human review before live backlog mutation.',
    ],
  }
}

function escapeCell(value) {
  return normalizeText(value).replace(/\|/g, '/')
}

export function renderResearchLanePurgeReport(snapshot = {}) {
  const summary = snapshot.summary || {}
  const counts = summary.dispositionCounts || {}
  const lines = [
    '# Research Lane Purge Report - 2026-05-13',
    '',
    'Status: PROPOSED ONLY. No backlog cards were deleted, closed, or moved by this report.',
    '',
    '## Summary',
    '',
    `- Research cards scanned: ${summary.researchCardCount || 0}`,
    `- Proposed-only rows: ${summary.proposedOnlyCount || 0}`,
    `- Stale rows at ${snapshot.staleDays || STALE_DAYS}+ days: ${summary.staleCount || 0}`,
    `- Rows with related card/source signals: ${summary.withRelatedSignalCount || 0}`,
    `- Promote review: ${counts.promote_review || 0}`,
    `- Keep review: ${counts.keep_review || 0}`,
    `- Kill review: ${counts.kill_review || 0}`,
    `- Move to future concepts review: ${counts.move_to_future_concepts_review || 0}`,
    '',
    '## Guardrails',
    '',
    '- Proposed only: Steve/reviewer must approve any live backlog move later.',
    '- No automatic lane changes.',
    '- No automatic deletes or closes.',
    '- No future-concepts parking doc is edited or created in this card.',
    '',
    '## Rows',
    '',
    '| Rank | Card | Priority | Update Signal | Related Signal | Proposed Disposition | Reason |',
    '| ---: | --- | --- | --- | --- | --- | --- |',
  ]

  for (const item of normalizeList(snapshot.items)) {
    lines.push([
      item.rank,
      item.cardId,
      item.priority || '',
      item.updateSignal || '',
      item.relatedSignals?.join(', ') || 'none',
      item.proposedDisposition,
      item.reason,
    ].map(escapeCell).join(' | ').replace(/^/, '| ').replace(/$/, ' |'))
  }

  lines.push(
    '',
    '## Known Limits',
    '',
    ...normalizeList(snapshot.knownLimits).map(item => `- ${item}`),
    '',
  )

  return lines.join('\n')
}

export function researchLaneSignature(backlogItems = []) {
  return normalizeList(backlogItems)
    .filter(card => card.lane === 'research')
    .map(card => `${card.id}:${card.lane}:${card.updatedAt || card.updated_at || ''}`)
    .sort()
    .join('|')
}

export function buildSyntheticResearchLanePurgeProof() {
  const snapshot = buildResearchLanePurgeSnapshot({
    generatedAt: '2026-05-13T06:00:00.000Z',
    backlogItems: [
      {
        id: 'RECENT-RESEARCH-001',
        lane: 'research',
        priority: 'P2',
        title: 'Recent active note',
        summary: 'Recently updated operator note.',
        updatedAt: '2026-05-12T06:00:00.000Z',
      },
      {
        id: 'STALE-FUTURE-001',
        lane: 'research',
        priority: 'P3',
        title: 'Future content concept',
        summary: 'Someday content idea.',
        updatedAt: '2026-03-01T06:00:00.000Z',
      },
      {
        id: 'STALE-P0-001',
        lane: 'research',
        priority: 'P0',
        title: 'Critical connector blocker',
        summary: 'Important source contract blocker.',
        updatedAt: '2026-03-01T06:00:00.000Z',
      },
      {
        id: 'STALE-KILL-001',
        lane: 'research',
        priority: 'P3',
        title: 'Deprecated duplicate idea',
        summary: 'Duplicate and superseded by newer work.',
        updatedAt: '2026-03-01T06:00:00.000Z',
      },
      {
        id: 'DONE-001',
        lane: 'done',
        priority: 'P1',
        title: 'Done card should be ignored',
        updatedAt: '2026-03-01T06:00:00.000Z',
      },
    ],
  })
  const dispositionById = new Map(snapshot.items.map(item => [item.cardId, item.proposedDisposition]))
  const inputAfter = snapshot.items.map(item => item.cardId)
  return {
    ok: snapshot.summary.researchCardCount === 4 &&
      snapshot.summary.proposedOnlyCount === 4 &&
      dispositionById.get('RECENT-RESEARCH-001') === 'keep_review' &&
      dispositionById.get('STALE-FUTURE-001') === 'move_to_future_concepts_review' &&
      dispositionById.get('STALE-P0-001') === 'promote_review' &&
      dispositionById.get('STALE-KILL-001') === 'kill_review' &&
      !inputAfter.includes('DONE-001'),
    summary: snapshot.summary,
    dispositions: Object.fromEntries(dispositionById.entries()),
  }
}
