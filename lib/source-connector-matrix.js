export const SOURCE_CONNECTOR_MATRIX_CARD_ID = 'SOURCE-CONNECTOR-MATRIX-001'
export const SOURCE_CONNECTOR_MATRIX_CLOSEOUT_KEY = 'source-connector-matrix-v1'
export const SOURCE_CONNECTOR_MATRIX_SCRIPT_PATH = 'scripts/process-source-connector-matrix-check.mjs'

export const CONNECTOR_MATRIX_ROWS = [
  {
    key: 'gmail',
    connectorId: 'CONN-GMAIL-001',
    sourceId: 'SRC-GMAIL-001',
    label: 'Gmail',
    oldSystemStatus: 'wired',
    brandLanes: ['Benson Crew', 'Steve Zahnd'],
    pillars: ['Strategy', 'Ops', 'Sales', 'Recruiting', 'Retention'],
    expectedDataOwned: 'Email threads, attachments, decisions, blockers, tasks, and shared communication context.',
    hubConsumers: ['Strategy', 'Ops', 'Decision Queue', 'Backlog'],
  },
  {
    key: 'missive',
    connectorId: 'CONN-MISSIVE-001',
    sourceId: 'SRC-MISSIVE-001',
    label: 'Missive',
    oldSystemStatus: 'wired',
    brandLanes: ['Benson Crew'],
    pillars: ['Ops', 'Sales', 'Retention'],
    expectedDataOwned: 'Shared inbox conversations, customer/team follow-up, and operational coordination.',
    hubConsumers: ['Ops', 'Sales', 'Decision Queue', 'Backlog'],
  },
  {
    key: 'slack',
    connectorId: 'CONN-SLACK-001',
    sourceId: 'SRC-SLACK-001',
    label: 'Slack',
    oldSystemStatus: 'wired',
    brandLanes: ['Benson Crew'],
    pillars: ['Ops', 'Strategy', 'Recruiting', 'Retention'],
    expectedDataOwned: 'Team messages, blockers, handoffs, and operating context.',
    hubConsumers: ['Ops', 'Strategy', 'Backlog'],
  },
  {
    key: 'drive',
    connectorId: 'CONN-GDRIVE-001',
    sourceId: 'SRC-GDRIVE-001',
    label: 'Google Drive',
    oldSystemStatus: 'wired',
    brandLanes: ['Benson Crew', 'Zahnd Team Ag', 'Steve Zahnd', 'MarketMasters', 'Unchained / Education'],
    pillars: ['Strategy', 'Ops', 'Sales', 'Marketing', 'Training', 'Finance'],
    expectedDataOwned: 'Docs, PDFs, assets, meeting files, training files, and old-system IP.',
    hubConsumers: ['Strategy', 'Training', 'Marketing', 'Brand Guardian', 'Backlog'],
  },
  {
    key: 'meeting-notes',
    connectorId: 'CONN-GDRIVE-001',
    sourceId: 'SRC-MEETINGS-001',
    label: 'Google Meeting Notes / Gemini',
    oldSystemStatus: 'wired',
    brandLanes: ['Benson Crew', 'Steve Zahnd'],
    pillars: ['Strategy', 'Ops', 'Training', 'Retention'],
    expectedDataOwned: 'Meeting notes, transcripts, decisions, blockers, feedback, and recurring cadence evidence.',
    hubConsumers: ['Strategy', 'Ops', 'Decision Queue', 'Backlog'],
  },
  {
    key: 'google-sheets-type',
    connectorId: 'CONN-GSHEETS-001',
    sourceId: 'SRC-GSHEETS-001',
    label: 'Google Sheets as first-class source type',
    oldSystemStatus: 'wired',
    brandLanes: ['Benson Crew', 'Zahnd Team Ag'],
    pillars: ['Sales', 'Finance', 'Strategy', 'Ops'],
    expectedDataOwned: 'Owners Dashboard, Freedom Sheet, KPI/list tabs, and spreadsheet-backed operating truth as a source class.',
    hubConsumers: ['Strategy', 'Sales', 'Finance', 'Ops'],
  },
  {
    key: 'google-docs-type',
    connectorId: 'CONN-GDRIVE-001',
    sourceId: 'SRC-GDOCS-001',
    label: 'Google Docs as first-class source type',
    oldSystemStatus: 'wired',
    brandLanes: ['Benson Crew', 'Steve Zahnd', 'MarketMasters', 'Unchained / Education'],
    pillars: ['Strategy', 'Marketing', 'Training', 'Ops'],
    expectedDataOwned: 'Native document content separate from generic Drive blob inventory.',
    hubConsumers: ['Strategy', 'Marketing', 'Training', 'Backlog'],
  },
  {
    key: 'google-slides-type',
    connectorId: 'CONN-GDRIVE-001',
    sourceId: 'SRC-GSLIDES-001',
    label: 'Google Slides as first-class source type',
    oldSystemStatus: 'wired',
    brandLanes: ['Benson Crew', 'Steve Zahnd', 'MarketMasters', 'Unchained / Education'],
    pillars: ['Marketing', 'Training', 'Sales', 'Recruiting'],
    expectedDataOwned: 'Pitch decks, training decks, brand decks, and course/presentation assets.',
    hubConsumers: ['Marketing', 'Training', 'Sales', 'Brand Guardian'],
  },
  {
    key: 'fub',
    connectorId: 'CONN-FUB-001',
    sourceId: 'SRC-FUB-001',
    label: 'Follow Up Boss',
    oldSystemStatus: 'wired',
    brandLanes: ['Benson Crew', 'Zahnd Team Ag'],
    pillars: ['Sales', 'Recruiting', 'Ops'],
    expectedDataOwned: 'People, lead lineage, source attribution, appointments, and CRM follow-up state.',
    hubConsumers: ['Sales', 'Ops', 'Recruiting'],
  },
  {
    key: 'clickup',
    connectorId: 'CONN-CLICKUP-001',
    sourceId: 'SRC-CLICKUP-001',
    label: 'ClickUp',
    oldSystemStatus: 'wired',
    brandLanes: ['Benson Crew'],
    pillars: ['Ops', 'Sales', 'Recruiting', 'Retention'],
    expectedDataOwned: 'Tasks, Agent Roster, Deal Data Entry, onboarding work, and operational case queues.',
    hubConsumers: ['Ops', 'Sales', 'Recruiting', 'Backlog'],
  },
  {
    key: 'ghl',
    connectorId: 'CONN-GHL-001',
    sourceId: 'SRC-GHL-001',
    label: 'GoHighLevel',
    oldSystemStatus: 'wired',
    brandLanes: ['Benson Crew', 'MarketMasters', 'Steve Zahnd'],
    pillars: ['Marketing', 'Sales'],
    expectedDataOwned: 'Marketing contacts, funnels, automations, and campaign context after source-boundary sign-off.',
    hubConsumers: ['Marketing', 'Sales'],
  },
  {
    key: 'google-ads',
    connectorId: 'CONN-GADS-001',
    sourceId: 'SRC-GADS-001',
    label: 'Google Ads',
    oldSystemStatus: 'wired',
    brandLanes: ['Benson Crew', 'MarketMasters', 'Steve Zahnd'],
    pillars: ['Marketing', 'Finance'],
    expectedDataOwned: 'Paid search campaigns, spend, conversions, and MCC/account performance.',
    hubConsumers: ['Marketing', 'Finance', 'Strategy'],
    blockedReason: 'OAuth invalid_grant / re-auth required before this can be marked connected.',
  },
  {
    key: 'meta',
    connectorId: 'CONN-META-001',
    sourceId: 'SRC-META-001',
    label: 'Meta',
    oldSystemStatus: 'wired',
    brandLanes: ['Benson Crew', 'MarketMasters', 'Steve Zahnd'],
    pillars: ['Marketing', 'Brand'],
    expectedDataOwned: 'Instagram/Facebook metrics, audiences, social performance, and future publishing reads.',
    hubConsumers: ['Marketing', 'Brand Guardian', 'Strategy'],
  },
  {
    key: 'socialpilot',
    connectorId: 'CONN-SOCIALPILOT-001',
    sourceId: 'SRC-PUBLISH-001',
    label: 'SocialPilot / publishing',
    oldSystemStatus: 'candidate',
    brandLanes: ['Benson Crew', 'MarketMasters', 'Steve Zahnd'],
    pillars: ['Marketing', 'Brand'],
    expectedDataOwned: 'Publishing queue/account context, post status, and campaign execution proof.',
    hubConsumers: ['Marketing', 'Brand Guardian'],
    blockedReason: 'Enterprise API key exists as a candidate, but owner/user auth context is not validated.',
  },
  {
    key: 'ga4',
    connectorId: 'CONN-GA4-001',
    sourceId: 'SRC-GA4-001',
    label: 'GA4',
    oldSystemStatus: 'wired',
    brandLanes: ['Benson Crew', 'MarketMasters', 'Steve Zahnd', 'Unchained / Education'],
    pillars: ['Marketing', 'Finance', 'Strategy'],
    expectedDataOwned: 'Web traffic, conversions, content performance, and funnel analytics.',
    hubConsumers: ['Marketing', 'Strategy', 'Finance'],
  },
  {
    key: 'gsc',
    connectorId: 'CONN-GSC-001',
    sourceId: 'SRC-GSC-001',
    label: 'Google Search Console',
    oldSystemStatus: 'wired',
    brandLanes: ['Benson Crew', 'MarketMasters', 'Steve Zahnd', 'Unchained / Education'],
    pillars: ['Marketing', 'Strategy'],
    expectedDataOwned: 'SEO queries, pages, impressions, clicks, index health, and search opportunity.',
    hubConsumers: ['Marketing', 'Strategy'],
  },
  {
    key: 'gbp',
    connectorId: 'CONN-GBP-001',
    sourceId: 'SRC-GBP-001',
    label: 'Google Business Profile',
    oldSystemStatus: 'referenced',
    brandLanes: ['Benson Crew', 'Zahnd Team Ag'],
    pillars: ['Marketing', 'Sales', 'Retention'],
    expectedDataOwned: 'Local search presence, reviews, profile performance, and local trust signals.',
    hubConsumers: ['Marketing', 'Sales', 'Retention'],
  },
  {
    key: 'real',
    connectorId: 'CONN-REAL-001',
    sourceId: 'SRC-REAL-001',
    label: 'Real Broker',
    oldSystemStatus: 'wired',
    brandLanes: ['Benson Crew', 'Zahnd Team Ag'],
    pillars: ['Finance', 'Recruiting', 'Strategy'],
    expectedDataOwned: 'Agent network, cap state, commission history, closed transactions, and builder-network analysis.',
    hubConsumers: ['Strategy', 'Finance', 'Recruiting'],
    blockedReason: 'Never connected in the new system.',
  },
  {
    key: 'skool-earlyaidopters',
    connectorId: 'CONN-SKOOL-001',
    sourceId: 'SRC-SKOOL-001',
    label: 'Skool / earlyaidopters',
    oldSystemStatus: 'candidate',
    brandLanes: ['Unchained / Education', 'Steve Zahnd'],
    pillars: ['Training', 'Marketing', 'Recruiting'],
    expectedDataOwned: 'Paid community/course modules, posts, comments, embedded links, and authorized training context.',
    hubConsumers: ['Training', 'Marketing', 'Strategy'],
    blockedReason: 'Access, policy, and earlyaidopters paid-community permissions need explicit matrix proof.',
  },
  {
    key: 'loom',
    connectorId: 'CONN-LOOM-001',
    sourceId: 'SRC-LOOM-001',
    label: 'Loom',
    oldSystemStatus: 'candidate',
    brandLanes: ['Benson Crew', 'Steve Zahnd', 'Unchained / Education'],
    pillars: ['Training', 'Ops', 'Marketing'],
    expectedDataOwned: 'Steve-owned Loom videos, metadata, transcripts/media availability, and training/demo context.',
    hubConsumers: ['Training', 'Ops', 'Marketing'],
    blockedReason: 'Bulk extraction path not validated; Loom SDK is not enough by itself.',
  },
  {
    key: 'mycro',
    connectorId: 'CONN-MYICRO-001',
    sourceId: 'SRC-MYICRO-001',
    label: 'Mycro / myICOR',
    oldSystemStatus: 'wired',
    brandLanes: ['Steve Zahnd', 'Unchained / Education'],
    pillars: ['Training', 'Strategy', 'Ops'],
    expectedDataOwned: 'Paid training course structure, lessons, resources, process-management workflows, and internal learning patterns.',
    hubConsumers: ['Training', 'Strategy', 'Ops'],
    blockedReason: 'Source contract exists, but logged-in paid-app extraction is not connected.',
  },
  {
    key: 'zoom',
    connectorId: 'CONN-ZOOM-001',
    sourceId: 'SRC-ZOOM-001',
    label: 'Zoom',
    oldSystemStatus: 'not wired',
    brandLanes: ['Benson Crew', 'Steve Zahnd'],
    pillars: ['Strategy', 'Training', 'Ops'],
    expectedDataOwned: 'Recordings, audio transcripts, chats, and historical meeting/training recovery.',
    hubConsumers: ['Strategy', 'Training', 'Ops'],
  },
  {
    key: 'whatsapp',
    connectorId: 'CONN-WHATSAPP-001',
    sourceId: 'SRC-WHATSAPP-001',
    label: 'WhatsApp inbound',
    oldSystemStatus: 'wired',
    brandLanes: ['Steve Zahnd', 'Benson Crew'],
    pillars: ['Sales', 'Recruiting', 'Retention'],
    expectedDataOwned: 'Inbound messages and relationship context if Steve keeps the channel.',
    hubConsumers: ['Sales', 'Recruiting', 'Retention'],
  },
  {
    key: 'telegram-inbound',
    connectorId: 'CONN-TELEGRAM-IN-001',
    sourceId: 'SRC-TELEGRAM-IN-001',
    label: 'Telegram inbound',
    oldSystemStatus: 'wired',
    brandLanes: ['Steve Zahnd', 'Unchained / Education'],
    pillars: ['Strategy', 'Ops', 'Recruiting'],
    expectedDataOwned: 'Inbound messages as data, separate from Telegram as a bot/user interface.',
    hubConsumers: ['Strategy', 'Ops', 'Recruiting'],
  },
  {
    key: 'web-external',
    connectorId: 'CONN-WEB-001',
    sourceId: 'SRC-WEB-001',
    label: 'Generic web / Firecrawl / browser',
    oldSystemStatus: 'wired',
    brandLanes: ['Benson Crew', 'MarketMasters', 'Steve Zahnd', 'Unchained / Education'],
    pillars: ['Marketing', 'Strategy', 'Recruiting'],
    expectedDataOwned: 'Authorized/public web pages, competitor/reference material, and external signal research.',
    hubConsumers: ['Marketing', 'Strategy', 'Recruiting'],
  },
]

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase()
}

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function byId(rows = [], key = 'sourceId') {
  return new Map(normalizeList(rows).map(row => [row[key] || row[key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)], row]).filter(([id]) => Boolean(id)))
}

function targetsForSource(extractionControl = {}, sourceId) {
  return normalizeList(extractionControl.coverageByTarget || extractionControl.targets)
    .filter(target => target.sourceId === sourceId || target.source_id === sourceId)
}

function coverageForSource(sharedCommunicationsCoverage = {}, sourceId) {
  return normalizeList(sharedCommunicationsCoverage.sources).find(source => source.sourceId === sourceId) || null
}

function sourceCount(map, sourceId, fields) {
  const row = map.get(sourceId)
  if (!row) return 0
  return fields.reduce((sum, field) => sum + Number(row[field] || 0), 0)
}

function candidateCount(coverage = {}) {
  const row = coverage || {}
  return Object.values(row.candidateTypes || {}).reduce((sum, count) => sum + Number(count || 0), 0)
}

function hasUsableContract(contract = {}) {
  if (!contract.sourceId) return false
  const status = normalizeLower(contract.status)
  return !status.includes('gap') && !status.includes('scoped, not connected')
}

function connectorState(connector = {}) {
  if (!connector.connectorId) return 'missing'
  const group = normalizeLower(connector.group)
  if (group === 'working') return 'connected'
  if (group === 'available') return 'candidate'
  if (group === 'missing') return 'missing'
  return 'unknown'
}

function decisionFor(row) {
  if (row.blockedReason) return 'blocked'
  if (!row.hasContract) return 'missing_contract'
  if (!row.hasConnector) return 'missing_connector'
  if (!row.hasExtractionTarget && !row.hasArtifacts) return 'missing_extraction'
  if ((row.hasArtifacts || row.hasCandidates) && !row.hasPromotedAtoms) return 'atom_gap'
  if (row.hasPromotedAtoms && !row.hasSynthesis) return 'synthesis_gap'
  if (row.hasSynthesis && !row.hasRouting) return 'routing_gap'
  return 'connected'
}

function reasonFor(row) {
  if (row.blockedReason) return row.blockedReason
  if (!row.hasContract) return `${row.sourceId} is missing as a first-class source contract.`
  if (!row.hasConnector) return `${row.connectorId} is missing from the connector registry.`
  if (!row.hasExtractionTarget && !row.hasArtifacts) return 'No extraction target or artifact flow is visible.'
  if ((row.hasArtifacts || row.hasCandidates) && !row.hasPromotedAtoms) return 'Artifacts/candidates exist but promoted atoms are not visible.'
  if (row.hasPromotedAtoms && !row.hasSynthesis) return 'Atoms exist but synthesis contribution is not visible.'
  if (row.hasSynthesis && !row.hasRouting) return 'Synthesis exists but routing destination is not visible.'
  return 'Connector/source/atom flow is visible enough for the current Foundation pass.'
}

export function buildSourceConnectorMatrixSnapshot({
  sources = [],
  connectors = [],
  extractionControl = {},
  sharedCommunicationsCoverage = {},
  intelligenceSynthesisFacts = {},
  intelligenceSynthesis = {},
  intelligenceActionRouter = {},
  sourceMaturityOperational = {},
} = {}) {
  const contractMap = byId(sources, 'sourceId')
  const connectorMap = byId(connectors, 'connectorId')
  const atomMap = byId(sourceMaturityOperational.atomsBySource || [], 'sourceId')
  const factMap = byId(sourceMaturityOperational.factsBySource || intelligenceSynthesisFacts.factsBySource || [], 'sourceId')
  const synthesizedMap = byId(sourceMaturityOperational.synthesizedItemsBySource || [], 'sourceId')
  const routeMap = byId(sourceMaturityOperational.routesBySource || [], 'sourceId')
  const latestSynthesisSourceIds = new Set(normalizeList(intelligenceSynthesis.latestRun?.sourceIds))
  const latestRouteSourceIds = new Set(normalizeList(intelligenceActionRouter.latestRun?.sourceIds))

  const rows = CONNECTOR_MATRIX_ROWS.map(definition => {
    const contract = contractMap.get(definition.sourceId) || null
    const connector = connectorMap.get(definition.connectorId) || null
    const targets = targetsForSource(extractionControl, definition.sourceId)
    const coverage = coverageForSource(sharedCommunicationsCoverage, definition.sourceId)
    const artifacts = Number(coverage?.totalArtifacts || 0)
    const candidates = candidateCount(coverage)
    const promotedAtoms = sourceCount(atomMap, definition.sourceId, ['activeAtoms', 'totalAtoms'])
    const synthesisFacts = sourceCount(factMap, definition.sourceId, ['activeFacts', 'totalFacts', 'total'])
    const synthesizedItems = sourceCount(synthesizedMap, definition.sourceId, ['activeSynthesizedItems', 'totalSynthesizedItems'])
    const routes = sourceCount(routeMap, definition.sourceId, ['activeRoutes', 'totalRoutes'])
    const row = {
      ...definition,
      hasContract: Boolean(contract),
      hasUsableContract: hasUsableContract(contract || {}),
      contractStatus: contract?.status || 'Missing source contract',
      contractValidation: contract?.validation || 'Not Signed Off',
      hasConnector: Boolean(connector),
      connectorStatus: connector?.status || 'Missing connector registry row',
      connectorState: connectorState(connector || {}),
      hasExtractionTarget: targets.length > 0,
      extractionTargetCount: targets.length,
      hasArtifacts: artifacts > 0,
      artifactCount: artifacts,
      hasCandidates: candidates > 0,
      candidateCount: candidates,
      hasPromotedAtoms: promotedAtoms > 0,
      promotedAtomCount: promotedAtoms,
      hasSynthesis: synthesisFacts > 0 || synthesizedItems > 0 || latestSynthesisSourceIds.has(definition.sourceId),
      synthesisFactCount: synthesisFacts,
      synthesizedItemCount: synthesizedItems,
      hasRouting: routes > 0 || latestRouteSourceIds.has(definition.sourceId),
      routeCount: routes,
    }
    row.decision = decisionFor(row)
    row.blockedReason = row.blockedReason || (row.decision === 'connected' ? '' : reasonFor(row))
    row.flow = {
      has_contract: row.hasContract,
      has_connector: row.hasConnector,
      has_extraction_target: row.hasExtractionTarget,
      has_artifacts: row.hasArtifacts,
      has_candidates: row.hasCandidates,
      has_promoted_atoms: row.hasPromotedAtoms,
      has_synthesis: row.hasSynthesis,
      has_routing: row.hasRouting,
      blocked_reason: row.blockedReason,
    }
    return row
  })

  const decisionCounts = rows.reduce((acc, row) => {
    acc[row.decision] = (acc[row.decision] || 0) + 1
    return acc
  }, {})
  const missingRequiredRows = rows.filter(row => ['missing_contract', 'missing_connector', 'blocked'].includes(row.decision))
  const atomFlowGaps = rows.filter(row => row.hasArtifacts && !row.hasPromotedAtoms)

  return {
    generatedAt: new Date().toISOString(),
    cardId: SOURCE_CONNECTOR_MATRIX_CARD_ID,
    closeoutKey: SOURCE_CONNECTOR_MATRIX_CLOSEOUT_KEY,
    columns: [
      'has_contract',
      'has_connector',
      'has_extraction_target',
      'has_artifacts',
      'has_candidates',
      'has_promoted_atoms',
      'has_synthesis',
      'has_routing',
      'blocked_reason',
    ],
    summary: {
      rowCount: rows.length,
      connectedCount: decisionCounts.connected || 0,
      missingContractCount: decisionCounts.missing_contract || 0,
      missingConnectorCount: decisionCounts.missing_connector || 0,
      blockedCount: decisionCounts.blocked || 0,
      atomGapCount: decisionCounts.atom_gap || 0,
      synthesisGapCount: decisionCounts.synthesis_gap || 0,
      routingGapCount: decisionCounts.routing_gap || 0,
      atomFlowGapCount: atomFlowGaps.length,
      requiredMissingOrBlockedCount: missingRequiredRows.length,
    },
    rows,
    missingRequiredRows,
    atomFlowGaps,
  }
}
