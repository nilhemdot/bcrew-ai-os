export const DECISION_RESTRICTED_QUEUE_CARD_ID = 'DECISION-RESTRICTED-QUEUE-001'
export const DECISION_RESTRICTED_QUEUE_CLOSEOUT_KEY = 'decision-restricted-queue-v1'
export const DECISION_RESTRICTED_QUEUE_PLAN_PATH = 'docs/process/decision-restricted-queue-001-plan.md'
export const DECISION_RESTRICTED_QUEUE_APPROVAL_PATH = 'docs/process/approvals/DECISION-RESTRICTED-QUEUE-001.json'
export const DECISION_RESTRICTED_QUEUE_SCRIPT_PATH = 'scripts/process-decision-restricted-queue-check.mjs'
export const DECISION_RESTRICTED_QUEUE_SUMMARY_MARKER = 'DECISION_RESTRICTED_QUEUE_SUMMARY'
export const DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID = 'FOUNDATION-UI-COMPLETE-001'

export const DECISION_RESTRICTED_RULES = [
  {
    key: 'termination',
    label: 'Termination or separation',
    terms: ['termination', 'terminate', 'terminated', 'fired', 'fire', 'dismissal', 'layoff', 'offboard', 'separation'],
    patterns: [
      /\bterminat(?:e|ed|ion|ing)\b/i,
      /\bfir(?:e|ed|ing)\b/i,
      /\bdismiss(?:al|ed|ing)?\b/i,
      /\blayoff\b|\blaid\s+off\b/i,
      /\boffboard(?:ing|ed)?\b/i,
      /\bseparation\b/i,
    ],
  },
  {
    key: 'compensation',
    label: 'Compensation or pay',
    terms: ['compensation', 'salary', 'commission', 'bonus', 'payroll', 'raise', 'pay plan', 'wage'],
    patterns: [
      /\bcomp(?:ensation)?\b/i,
      /\bsalary\b/i,
      /\bcommission(?:\s+split|\s+rate)?\b/i,
      /\bbonus(?:es)?\b/i,
      /\bpayroll\b/i,
      /\bpay\s+(?:plan|cut|increase|change|issue)\b/i,
      /\braise\b/i,
      /\bwage(?:s)?\b/i,
    ],
  },
  {
    key: 'performance_concern',
    label: 'Performance concern',
    terms: ['performance concern', 'performance review', 'underperforming', 'discipline', 'warning', 'PIP'],
    patterns: [
      /\bperformance\s+(?:concern|issue|review|warning|discipline|improvement|plan)\b/i,
      /\bunderperform(?:ing|er|ed)?\b/i,
      /\bPIP\b/i,
      /\bdisciplin(?:e|ary|ed|ing)\b/i,
      /\bwritten\s+warning\b/i,
      /\bcoach(?:ing)?\s+out\b/i,
    ],
  },
  {
    key: 'personnel',
    label: 'Personnel or HR',
    terms: ['personnel', 'HR', 'human resources', 'employee complaint', 'private feedback'],
    patterns: [
      /\bpersonnel\b/i,
      /\bHR\b|\bhuman\s+resources\b/i,
      /\bemployee\s+(?:complaint|conflict|issue)\b/i,
      /\bprivate\s+feedback\b/i,
      /\bworkplace\s+(?:complaint|conflict|investigation)\b/i,
    ],
  },
  {
    key: 'legal_compliance',
    label: 'Legal or compliance',
    terms: ['legal', 'lawsuit', 'compliance', 'investigation', 'complaint'],
    patterns: [
      /\blegal\b/i,
      /\blawsuit\b|\blitigation\b/i,
      /\bcompliance\b/i,
      /\binvestigation\b/i,
      /\bformal\s+complaint\b/i,
    ],
  },
]

const restrictedTextFields = [
  'title',
  'summary',
  'rationale',
  'sourceRef',
  'contextRef',
  'evidenceNotes',
  'decisionOwner',
  'confirmedBy',
]

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function compactDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function unique(values = []) {
  return Array.from(new Set(values.filter(Boolean)))
}

function decisionText(decision = {}) {
  const parts = restrictedTextFields.map(field => normalizeText(decision[field]))
  const participants = Array.isArray(decision.participantNames)
    ? decision.participantNames.map(normalizeText)
    : []
  return [...parts, ...participants].filter(Boolean).join(' ')
}

function ruleMatchedTerms(rule, text) {
  const lower = String(text || '').toLowerCase()
  return rule.terms.filter(term => lower.includes(term.toLowerCase()))
}

export function classifyDecisionRestriction(decision = {}) {
  const text = decisionText(decision)
  const matches = []

  for (const rule of DECISION_RESTRICTED_RULES) {
    const matched = rule.patterns.some(pattern => pattern.test(text))
    if (!matched) continue
    matches.push({
      key: rule.key,
      label: rule.label,
      matchedTerms: ruleMatchedTerms(rule, text),
    })
  }

  const categories = unique(matches.map(match => match.key))
  const terms = unique(matches.flatMap(match => match.matchedTerms)).sort((a, b) => a.localeCompare(b))
  const restricted = categories.length > 0

  return {
    restricted,
    restrictionStatus: restricted ? 'restricted' : 'general',
    route: restricted ? 'owner_only_restricted_review' : 'general_decision_log',
    ownerOnly: restricted,
    matchedCategories: categories,
    matchedTerms: terms,
    reason: restricted
      ? `Restricted because decision text matched ${matches.map(match => match.label).join(', ')}.`
      : 'No restricted decision signal matched.',
    proposedOnly: true,
    autoApplies: false,
    autoLocks: false,
  }
}

export function annotateDecisionRestriction(decision = {}) {
  const restriction = classifyDecisionRestriction(decision)
  return {
    ...decision,
    restriction,
    restricted: restriction.restricted,
    restrictionStatus: restriction.restrictionStatus,
  }
}

export function filterGeneralDecisionRecords(decisions = []) {
  return (Array.isArray(decisions) ? decisions : [])
    .map(annotateDecisionRestriction)
    .filter(decision => !decision.restriction.restricted)
}

function decisionQueueItem(decision = {}) {
  const annotated = annotateDecisionRestriction(decision)
  return {
    id: annotated.id,
    title: annotated.title,
    category: annotated.category,
    status: annotated.status,
    decisionOwner: annotated.decisionOwner || null,
    confirmedBy: annotated.confirmedBy || null,
    participantNames: annotated.participantNames || [],
    createdAt: compactDate(annotated.createdAt) || annotated.createdAt || null,
    updatedAt: compactDate(annotated.updatedAt) || annotated.updatedAt || null,
    summary: normalizeText(annotated.summary),
    restriction: annotated.restriction,
  }
}

function countBy(items, keyFn) {
  const counts = {}
  for (const item of items || []) {
    const key = keyFn(item) || 'unknown'
    counts[key] = (counts[key] || 0) + 1
  }
  return counts
}

export function buildDecisionRestrictedQueueSnapshot({
  decisions = [],
  limit = 100,
  now = new Date(),
} = {}) {
  const boundedLimit = Math.min(500, Math.max(1, Number(limit) || 100))
  const annotated = (Array.isArray(decisions) ? decisions : []).map(annotateDecisionRestriction)
  const restricted = annotated
    .filter(decision => decision.restriction.restricted)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())
  const general = annotated.filter(decision => !decision.restriction.restricted)
  const queueItems = restricted.slice(0, boundedLimit).map(decisionQueueItem)
  const matchedCategories = unique(restricted.flatMap(decision => decision.restriction.matchedCategories)).sort((a, b) => a.localeCompare(b))
  const matchedTerms = unique(restricted.flatMap(decision => decision.restriction.matchedTerms)).sort((a, b) => a.localeCompare(b))

  return {
    schemaVersion: 1,
    cardId: DECISION_RESTRICTED_QUEUE_CARD_ID,
    closeoutKey: DECISION_RESTRICTED_QUEUE_CLOSEOUT_KEY,
    generatedAt: new Date(now).toISOString(),
    status: 'healthy',
    summary: {
      decisionCount: annotated.length,
      restrictedCount: restricted.length,
      generalCount: general.length,
      queueItemCount: queueItems.length,
      proposedRestrictedCount: restricted.filter(decision => decision.status === 'proposed').length,
      lockedRestrictedCount: restricted.filter(decision => decision.status === 'locked').length,
      supersededRestrictedCount: restricted.filter(decision => decision.status === 'superseded').length,
      matchedCategoryCount: matchedCategories.length,
      matchedTermCount: matchedTerms.length,
      ownerOnly: true,
      proposedOnly: true,
      autoApplies: false,
      autoLocks: false,
      nextCardId: DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID,
    },
    countsByCategory: countBy(restricted, decision => decision.category),
    countsByRestriction: countBy(restricted.flatMap(decision => decision.restriction.matchedCategories), value => value),
    matchedCategories,
    matchedTerms,
    queueItems,
    routingRules: [
      {
        key: 'restricted_owner_review',
        decision: 'Restricted decisions route to owner-only Foundation review.',
        appliesWhen: 'Decision text matches termination, compensation, performance concern, personnel/HR, or legal/compliance rules.',
      },
      {
        key: 'general_context_filter',
        decision: 'General Strategy and extraction contexts receive only non-restricted decisions.',
        appliesWhen: 'Decision has no restricted rule match.',
      },
      {
        key: 'proposed_only',
        decision: 'This queue does not auto-lock, auto-apply, send, delete, or mutate decisions.',
        appliesWhen: 'All V1 restricted queue handling.',
      },
    ],
    boundaries: [
      'Uses the existing decisions table; no second decision system.',
      'Owner-only review queue only; no broad non-owner decision read is opened.',
      'No auto-lock, auto-apply, sends, agent routing, legal advice, HR advice, Reply Parser, or Watching Items.',
      'Generic business or marketing performance is not restricted unless people-sensitive performance language is present.',
    ],
  }
}

export function buildSyntheticDecisionRestrictedQueueProof() {
  const decisions = [
    {
      id: 'DEC-SYN-001',
      category: 'people',
      status: 'proposed',
      title: 'Review Tanner compensation adjustment',
      summary: 'Discuss commission split and pay plan before any routing.',
      createdAt: '2026-05-12T12:00:00Z',
    },
    {
      id: 'DEC-SYN-002',
      category: 'people',
      status: 'proposed',
      title: 'Georgia performance concern',
      summary: 'Performance concern needs owner-only review before broader queue routing.',
      createdAt: '2026-05-12T12:01:00Z',
    },
    {
      id: 'DEC-SYN-003',
      category: 'people',
      status: 'locked',
      title: 'Termination review',
      summary: 'Termination language must be sequestered.',
      createdAt: '2026-05-12T12:02:00Z',
    },
    {
      id: 'DEC-SYN-004',
      category: 'strategy',
      status: 'proposed',
      title: 'Marketing performance dashboard',
      summary: 'Review campaign performance and content cadence.',
      createdAt: '2026-05-12T12:03:00Z',
    },
    {
      id: 'DEC-SYN-005',
      category: 'system',
      status: 'proposed',
      title: 'Legal compliance routing',
      summary: 'Compliance investigation wording should stay owner-only.',
      createdAt: '2026-05-12T12:04:00Z',
    },
  ]
  const snapshot = buildDecisionRestrictedQueueSnapshot({ decisions })
  const general = filterGeneralDecisionRecords(decisions)
  const restrictedIds = snapshot.queueItems.map(item => item.id)
  const generalIds = general.map(item => item.id)
  const requiredRestrictedIds = ['DEC-SYN-001', 'DEC-SYN-002', 'DEC-SYN-003', 'DEC-SYN-005']

  return {
    ok:
      requiredRestrictedIds.every(id => restrictedIds.includes(id)) &&
      generalIds.includes('DEC-SYN-004') &&
      !generalIds.some(id => requiredRestrictedIds.includes(id)) &&
      snapshot.summary.ownerOnly === true &&
      snapshot.summary.proposedOnly === true &&
      snapshot.summary.autoApplies === false &&
      snapshot.summary.autoLocks === false &&
      snapshot.summary.nextCardId === DECISION_RESTRICTED_QUEUE_NEXT_CARD_ID,
    snapshot,
    summary: {
      restrictedCount: snapshot.summary.restrictedCount,
      generalCount: snapshot.summary.generalCount,
      restrictedIds,
      generalIds,
      matchedCategories: snapshot.matchedCategories,
      ownerOnly: snapshot.summary.ownerOnly,
      proposedOnly: snapshot.summary.proposedOnly,
      nextCardId: snapshot.summary.nextCardId,
    },
  }
}
