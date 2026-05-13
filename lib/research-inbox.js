export const RESEARCH_INBOX_CARD_ID = 'RESEARCH-INBOX-001'

export const RESEARCH_INBOX_SOURCE_TYPES = [
  'youtube',
  'skool',
  'myicor',
  'loom',
  'course',
  'article',
  'book',
  'chat',
  'github',
  'public_repo',
  'public_community',
  'manual_note',
]

export const RESEARCH_INBOX_DISPOSITIONS = [
  'propose_new_card',
  'enrich_existing_card',
  'archive',
  'needs_steve_review',
  'blocked',
]

export const RESEARCH_INBOX_STATUSES = [
  'new',
  'needs_review',
  'proposal_ready',
  'approved_by_steve',
  'archived',
  'blocked',
]

function hasText(value) {
  return String(value || '').trim().length > 0
}

export function validateResearchInboxItem(item = {}) {
  const findings = []
  const requiredTextFields = [
    'sourceRef',
    'sourceType',
    'whySteveCared',
    'plainEnglishTakeaway',
    'systemFit',
    'recommendation',
    'owner',
    'proposedDisposition',
  ]
  for (const field of requiredTextFields) {
    if (!hasText(item[field])) findings.push(`${field}_missing`)
  }
  if (!RESEARCH_INBOX_SOURCE_TYPES.includes(item.sourceType)) findings.push('source_type_invalid')
  if (!RESEARCH_INBOX_DISPOSITIONS.includes(item.proposedDisposition)) findings.push('disposition_invalid')
  if (!RESEARCH_INBOX_STATUSES.includes(item.status || 'new')) findings.push('status_invalid')
  if (!Array.isArray(item.relatedCards)) findings.push('related_cards_missing')
  if (!Array.isArray(item.evidenceLinks) || !item.evidenceLinks.length) findings.push('evidence_links_missing')
  if (item.autoCreateBacklogCard === true) findings.push('auto_create_backlog_forbidden')
  return {
    ok: findings.length === 0,
    findings,
  }
}

export function buildResearchInboxPromotionProposal(item = {}) {
  const validation = validateResearchInboxItem(item)
  if (!validation.ok) {
    return {
      ok: false,
      proposalOnly: true,
      writesBacklog: false,
      findings: validation.findings,
    }
  }
  return {
    ok: true,
    proposalOnly: true,
    writesBacklog: false,
    requiresSteveApproval: true,
    cardId: RESEARCH_INBOX_CARD_ID,
    disposition: item.proposedDisposition,
    relatedCards: item.relatedCards,
    proposedBacklogDraft: item.proposedDisposition === 'propose_new_card'
      ? {
          title: item.recommendation,
          source: item.sourceRef,
          summary: item.plainEnglishTakeaway,
          whyItMatters: item.systemFit,
          acceptanceCriteria: item.acceptanceCriteria || [],
        }
      : null,
    proposedEnrichment: item.proposedDisposition === 'enrich_existing_card'
      ? {
          targetCards: item.relatedCards,
          context: item.plainEnglishTakeaway,
          evidenceLinks: item.evidenceLinks,
        }
      : null,
  }
}

export function buildResearchInboxContractSnapshot() {
  return {
    status: 'ready',
    cardId: RESEARCH_INBOX_CARD_ID,
    proposalOnly: true,
    autoMutationAllowed: false,
    buildScoperOutputTarget: RESEARCH_INBOX_CARD_ID,
    nextSprintName: 'Build Intel Extraction Implementation Sprint',
    requiredFields: [
      'sourceRef',
      'sourceType',
      'whySteveCared',
      'plainEnglishTakeaway',
      'systemFit',
      'relatedCards',
      'recommendation',
      'evidenceLinks',
      'owner',
      'proposedDisposition',
    ],
    statuses: RESEARCH_INBOX_STATUSES,
    dispositions: RESEARCH_INBOX_DISPOSITIONS,
    sourceTypes: RESEARCH_INBOX_SOURCE_TYPES,
  }
}
