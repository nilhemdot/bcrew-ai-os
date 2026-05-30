export const SOURCE_012_CARD_ID = 'SOURCE-012'
export const SOURCE_012_CLOSEOUT_KEY = 'source-012-source-connector-live-layers-v1'
export const SOURCE_012_PLAN_PATH = 'docs/process/source-012-source-connector-live-layers-plan.md'
export const SOURCE_012_APPROVAL_PATH = 'docs/process/approvals/SOURCE-012.json'
export const SOURCE_012_SCRIPT_PATH = 'scripts/process-source-012-check.mjs'
export const SOURCE_012_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-source-012-source-connector-live-layers-closeout.md'
export const SOURCE_012_NEXT_CARD_ID = 'SOURCE-018'

export const SOURCE_012_CHANGED_FILES = [
  'lib/source-012-source-connector-layers.js',
  'lib/source-of-truth-payload.js',
  'public/foundation-source-registry-renderers.js',
  'public/foundation.js',
  SOURCE_012_SCRIPT_PATH,
  'package.json',
  'lib/foundation-build-closeout-process-gate-records.js',
  SOURCE_012_PLAN_PATH,
  SOURCE_012_APPROVAL_PATH,
  SOURCE_012_CLOSEOUT_PATH,
]

export const SOURCE_012_PROOF_COMMANDS = [
  `node --check lib/source-012-source-connector-layers.js lib/source-of-truth-payload.js public/foundation-source-registry-renderers.js public/foundation.js ${SOURCE_012_SCRIPT_PATH}`,
  'npm run process:source-012-check -- --apply --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${SOURCE_012_CARD_ID} --planApprovalRef=${SOURCE_012_APPROVAL_PATH} --closeoutKey=${SOURCE_012_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${SOURCE_012_CARD_ID} --closeoutKey=${SOURCE_012_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${SOURCE_012_CARD_ID} --planApprovalRef=${SOURCE_012_APPROVAL_PATH} --closeoutKey=${SOURCE_012_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const SOURCE_012_NOT_NEXT = [
  'Do not run live extraction from this card.',
  'Do not mutate source data, Drive permissions, provider config, credentials, or external systems.',
  'Do not treat connector access as source trust.',
  'Do not create a second source registry page.',
  'Do not start Value Builder split.',
]

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').trim()
}

function lower(value) {
  return text(value).toLowerCase()
}

function toIsoDate(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

function sourceTypeFor(contract = {}) {
  const haystack = lower([
    contract.sourceId,
    contract.title,
    contract.unitName,
    contract.location,
    contract.accessMethod,
    contract.scope,
  ].join(' '))
  if (/spreadsheet|sheets|sheet|workbook|tab|range/.test(haystack)) return 'spreadsheet'
  if (/docs|document|markdown|repo|filesystem|source note|strategy packet/.test(haystack)) return 'document'
  if (/gmail|missive|slack|meeting|calendar|drive|workspace/.test(haystack)) return 'workspace_app'
  if (/supabase|postgres|database|db|api|fub|follow up boss|clickup/.test(haystack)) return 'api_or_database'
  if (/video|youtube|loom|zoom|skool|course/.test(haystack)) return 'media_or_course'
  return 'other'
}

function sourceStatusFor(contract = {}) {
  const validation = lower(contract.validation)
  const status = lower(contract.status)
  const group = lower(contract.group)
  if (validation.includes('signed off') && !validation.includes('not signed off')) return 'signed_off'
  if (status.includes('current reality')) return 'current_reality_captured'
  if (status.includes('verified readable') || validation.includes('readable')) return 'readable_only'
  if (group.includes('verified') || status.includes('verified')) return 'verified'
  if (group.includes('proposed') || status.includes('scoped') || validation.includes('not signed off')) return 'scoped_not_trusted'
  if (status.includes('blocked') || status.includes('missing')) return 'blocked'
  return 'needs_review'
}

function trustStatusFor(contract = {}) {
  const sourceStatus = sourceStatusFor(contract)
  if (sourceStatus === 'signed_off') return 'trusted_signed_off'
  if (sourceStatus === 'current_reality_captured') return 'trusted_current_reality'
  if (sourceStatus === 'verified' || sourceStatus === 'readable_only') return 'readable_not_fully_signed_off'
  if (sourceStatus === 'scoped_not_trusted') return 'scoped_not_trusted'
  if (sourceStatus === 'blocked') return 'blocked'
  return 'needs_review'
}

function freshnessStatusFor(contract = {}, now = new Date()) {
  const refresh = lower(contract.refreshSchedule)
  const updateMethod = lower(contract.updateMethod)
  const manual = lower(contract.manualRefresh)
  const lastVerified = toIsoDate(contract.lastVerified)
  const lastVerifiedDate = lastVerified ? new Date(`${lastVerified}T00:00:00.000Z`) : null
  const ageDays = lastVerifiedDate ? Math.floor((now.getTime() - lastVerifiedDate.getTime()) / 86_400_000) : null
  if (/live read|scheduled|daily|automatic|background/.test(`${refresh} ${updateMethod}`)) return { status: 'monitored', ageDays }
  if (/weekly|on demand|manual|future/.test(`${refresh} ${updateMethod} ${manual}`)) return { status: 'manual_or_review_cadence', ageDays }
  if (ageDays != null && ageDays > 45) return { status: 'stale_review_needed', ageDays }
  if (lastVerified) return { status: 'dated_evidence', ageDays }
  return { status: 'unknown', ageDays: null }
}

function driftStatusFor(contract = {}) {
  const content = lower([
    contract.status,
    contract.validation,
    contract.stillOpen,
    contract.nextAction,
    contract.validationScope,
  ].join(' '))
  if (/not signed off|scoped|not connected|blocked|approval|required|still need|gap|missing/.test(content)) return 'open_or_blocked'
  if (/current reality|not yet|manual|future|review|freshness/.test(content)) return 'watch'
  return 'clear'
}

function connectorStateFor(connector = {}) {
  const group = lower(connector.group)
  const status = lower(connector.status)
  if (group === 'working' || /working|connected|healthy|available/.test(status)) return 'working'
  if (group === 'available' || /installed|needs validation|verify|pending/.test(status)) return 'needs_validation'
  return 'not_wired'
}

function directLinksFor(contract = {}) {
  const actionLinks = asArray(contract.actions)
    .map(action => ({ label: text(action.label), href: text(action.href) }))
    .filter(action => action.label && action.href)
  const packetLinks = asArray(contract.packetDocs)
    .map(doc => ({ label: text(doc.label), href: text(doc.href) }))
    .filter(doc => doc.label && doc.href)
  const location = text(contract.location)
  const locationLink = /^https?:\/\//i.test(location)
    ? [{ label: 'Source location', href: location }]
    : []
  return [...actionLinks, ...packetLinks, ...locationLink]
}

function buildSystemIndexes(groupedSystems = []) {
  const systemsBySourceId = new Map()
  const connectorIdsBySourceId = new Map()
  const systemsByConnectorId = new Map()
  for (const system of asArray(groupedSystems)) {
    for (const sourceId of asArray(system.sourceIds)) {
      if (!systemsBySourceId.has(sourceId)) systemsBySourceId.set(sourceId, [])
      systemsBySourceId.get(sourceId).push({ systemId: system.systemId, title: system.title })
      if (!connectorIdsBySourceId.has(sourceId)) connectorIdsBySourceId.set(sourceId, new Set())
      for (const connectorId of asArray(system.connectorIds)) {
        connectorIdsBySourceId.get(sourceId).add(connectorId)
      }
    }
    for (const connectorId of asArray(system.connectorIds)) {
      if (!systemsByConnectorId.has(connectorId)) systemsByConnectorId.set(connectorId, [])
      systemsByConnectorId.get(connectorId).push({ systemId: system.systemId, title: system.title })
    }
  }
  return { systemsBySourceId, connectorIdsBySourceId, systemsByConnectorId }
}

function countBy(items = [], key) {
  return asArray(items).reduce((counts, item) => {
    const value = item?.[key] || 'unknown'
    counts[value] = (counts[value] || 0) + 1
    return counts
  }, {})
}

export function buildSourceConnectorLayerStatus({
  sourceContracts = [],
  sourceConnectors = [],
  groupedSourceSystems = [],
  generatedAt = new Date().toISOString(),
} = {}) {
  const now = new Date(generatedAt)
  const {
    systemsBySourceId,
    connectorIdsBySourceId,
    systemsByConnectorId,
  } = buildSystemIndexes(groupedSourceSystems)
  const connectorRows = asArray(sourceConnectors).map(connector => ({
    connectorId: connector.connectorId,
    title: connector.title,
    connectorStatus: connectorStateFor(connector),
    technicalStatus: connector.status || 'Unknown',
    accessPath: connector.powers || connector.purpose || '',
    availableTo: connector.availableTo || '',
    dependentSystems: asArray(systemsByConnectorId.get(connector.connectorId)),
    trustBoundary: 'Connector access does not equal trusted source status.',
  }))
  const connectorMap = new Map(connectorRows.map(connector => [connector.connectorId, connector]))
  const sourceRows = asArray(sourceContracts).map(contract => {
    const freshness = freshnessStatusFor(contract, now)
    const connectorIds = Array.from(connectorIdsBySourceId.get(contract.sourceId) || [])
    const connectorStatuses = connectorIds
      .map(connectorId => connectorMap.get(connectorId)?.connectorStatus)
      .filter(Boolean)
    return {
      sourceId: contract.sourceId,
      title: contract.title,
      unitName: contract.unitName || '',
      sourceType: sourceTypeFor(contract),
      sourceStatus: sourceStatusFor(contract),
      trustStatus: trustStatusFor(contract),
      freshnessStatus: freshness.status,
      freshnessAgeDays: freshness.ageDays,
      driftStatus: driftStatusFor(contract),
      owner: contract.owner || 'System',
      directSourceLinks: directLinksFor(contract).slice(0, 6),
      dependentSystems: asArray(systemsBySourceId.get(contract.sourceId)),
      connectorIds,
      connectorStatus: connectorStatuses.length
        ? Array.from(new Set(connectorStatuses)).join(',')
        : 'no_direct_connector_mapping',
    }
  })
  const sourceRowsMissingOwner = sourceRows.filter(row => !text(row.owner))
  const sourceRowsMissingStatus = sourceRows.filter(row => !text(row.sourceStatus) || !text(row.trustStatus))
  const sourceRowsMissingDependency = sourceRows.filter(row => !row.dependentSystems.length)
  const connectorsMissingStatus = connectorRows.filter(row => !text(row.connectorStatus))

  return {
    cardId: SOURCE_012_CARD_ID,
    closeoutKey: SOURCE_012_CLOSEOUT_KEY,
    generatedAt,
    status: sourceRowsMissingOwner.length || sourceRowsMissingStatus.length || connectorsMissingStatus.length ? 'risk' : 'healthy',
    layers: [
      {
        key: 'source-contracts',
        label: 'Source contracts',
        status: 'live',
        count: sourceRows.length,
        plainEnglish: 'What the business source is, who owns it, what it owns, and whether its meaning is trusted.',
      },
      {
        key: 'connectors',
        label: 'Connector layer',
        status: 'live',
        count: connectorRows.length,
        plainEnglish: 'The technical pipe or access path. This does not create trust by itself.',
      },
      {
        key: 'trust',
        label: 'Trust layer',
        status: 'live',
        count: sourceRows.filter(row => row.trustStatus.startsWith('trusted')).length,
        plainEnglish: 'Signed-off/current-reality/readable/scoped states are separate from connector reach.',
      },
      {
        key: 'freshness-drift',
        label: 'Freshness and drift',
        status: 'watch',
        count: sourceRows.filter(row => row.freshnessStatus !== 'unknown' || row.driftStatus !== 'clear').length,
        plainEnglish: 'Freshness cadence and drift posture stay visible before extraction depends on the source.',
      },
      {
        key: 'dependencies',
        label: 'Dependent systems',
        status: sourceRowsMissingDependency.length ? 'watch' : 'live',
        count: groupedSourceSystems.length,
        plainEnglish: 'Shows which operating systems depend on each source and connector.',
      },
    ],
    summary: {
      sourceCount: sourceRows.length,
      connectorCount: connectorRows.length,
      groupedSystemCount: groupedSourceSystems.length,
      sourceStatusCounts: countBy(sourceRows, 'sourceStatus'),
      trustStatusCounts: countBy(sourceRows, 'trustStatus'),
      freshnessStatusCounts: countBy(sourceRows, 'freshnessStatus'),
      driftStatusCounts: countBy(sourceRows, 'driftStatus'),
      connectorStatusCounts: countBy(connectorRows, 'connectorStatus'),
      sourceRowsMissingOwner: sourceRowsMissingOwner.length,
      sourceRowsMissingStatus: sourceRowsMissingStatus.length,
      sourceRowsMissingDependency: sourceRowsMissingDependency.length,
      connectorsMissingStatus: connectorsMissingStatus.length,
    },
    sourceRows,
    connectorRows,
    invariants: [
      'Connector access does not equal trusted source status.',
      'Source rows must expose source status, trust status, freshness status, drift status, owner, direct source links, and dependent systems.',
      'Connector rows must expose connector status and dependent systems separately from source trust.',
    ],
  }
}

export function evaluateSourceConnectorLayerStatus(status = {}, {
  minSourceRows = 40,
  minConnectorRows = 10,
} = {}) {
  const sourceRows = asArray(status.sourceRows)
  const connectorRows = asArray(status.connectorRows)
  const layers = asArray(status.layers)
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })

  add(status.status === 'healthy', 'source connector layer status is healthy', status.status || 'missing')
  add(sourceRows.length >= minSourceRows, 'source contract rows are present', `${sourceRows.length}/${minSourceRows}`)
  add(connectorRows.length >= minConnectorRows, 'connector rows are present', `${connectorRows.length}/${minConnectorRows}`)
  add(['source-contracts', 'connectors', 'trust', 'freshness-drift', 'dependencies'].every(key => layers.some(layer => layer.key === key)), 'all five live source layers are present', layers.map(layer => layer.key).join(', '))
  add(sourceRows.every(row => row.sourceId && row.sourceStatus && row.trustStatus && row.freshnessStatus && row.driftStatus && row.owner), 'source rows carry status/trust/freshness/drift/owner', String(sourceRows.length))
  add(sourceRows.every(row => Array.isArray(row.directSourceLinks) && Array.isArray(row.dependentSystems) && Array.isArray(row.connectorIds)), 'source rows carry links, dependent systems, and connector ids arrays', String(sourceRows.length))
  add(connectorRows.every(row => row.connectorId && row.connectorStatus && row.trustBoundary), 'connector rows carry connector status and trust boundary', String(connectorRows.length))
  add(connectorRows.some(row => row.connectorStatus === 'working'), 'working connector status is represented separately from trust', JSON.stringify(status.summary?.connectorStatusCounts || {}))
  add(sourceRows.some(row => row.trustStatus.startsWith('trusted')), 'trusted source status is represented separately from connectors', JSON.stringify(status.summary?.trustStatusCounts || {}))

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    status: failed.length ? 'risk' : 'healthy',
    checks,
    failed,
  }
}

export function buildSourceConnectorLayerDogfoodProof() {
  const status = buildSourceConnectorLayerStatus({
    sourceContracts: [
      {
        sourceId: 'SRC-DOGFOOD-SHEET-001',
        title: 'Dogfood Sheet Source',
        unitName: 'Sheet tab',
        group: 'verified',
        status: 'Current reality captured',
        validation: 'Signed Off For Current Reality',
        owner: 'Ops',
        accessMethod: 'Google Sheets',
        location: 'https://docs.google.com/spreadsheets/d/example',
        lastVerified: '2026-05-19',
        refreshSchedule: 'Weekly manual review',
        actions: [{ label: 'Open sheet', href: 'https://docs.google.com/spreadsheets/d/example' }],
      },
      {
        sourceId: 'SRC-DOGFOOD-SCOPED-001',
        title: 'Dogfood Future Source',
        unitName: 'Future app',
        group: 'proposed',
        status: 'Scoped, not connected',
        validation: 'Not Signed Off',
        owner: 'Steve',
        accessMethod: 'Planned API',
        lastVerified: '2026-05-19',
        stillOpen: 'Access approval required.',
      },
    ],
    sourceConnectors: [
      {
        connectorId: 'CONN-DOGFOOD-SHEETS-001',
        title: 'Sheets Connector',
        group: 'working',
        status: 'Working in rebuild',
        powers: 'Read sheets',
      },
    ],
    groupedSourceSystems: [
      {
        systemId: 'SYS-DOGFOOD-001',
        title: 'Dogfood System',
        sourceIds: ['SRC-DOGFOOD-SHEET-001', 'SRC-DOGFOOD-SCOPED-001'],
        connectorIds: ['CONN-DOGFOOD-SHEETS-001'],
      },
    ],
    generatedAt: '2026-05-19T12:00:00.000Z',
  })
  const evaluation = evaluateSourceConnectorLayerStatus(status, {
    minSourceRows: 2,
    minConnectorRows: 1,
  })
  const trustedWithConnector = status.sourceRows.find(row => row.sourceId === 'SRC-DOGFOOD-SHEET-001')
  const scopedWithConnector = status.sourceRows.find(row => row.sourceId === 'SRC-DOGFOOD-SCOPED-001')
  return {
    ok: evaluation.ok &&
      trustedWithConnector?.trustStatus === 'trusted_signed_off' &&
      scopedWithConnector?.trustStatus === 'scoped_not_trusted' &&
      trustedWithConnector.connectorStatus === 'working' &&
      scopedWithConnector.connectorStatus === 'working',
    evaluation,
    trustedWithConnector,
    scopedWithConnector,
    invariant: 'A working connector can support both trusted and untrusted source contracts; connector reach never upgrades source trust.',
  }
}
