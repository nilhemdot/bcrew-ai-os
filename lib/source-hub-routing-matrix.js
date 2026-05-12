export const SOURCE_HUB_ROUTING_MATRIX_CARD_ID = 'SOURCE-HUB-ROUTING-MATRIX-001'
export const SOURCE_HUB_ROUTING_MATRIX_CLOSEOUT_KEY = 'source-hub-routing-matrix-v1'
export const SOURCE_HUB_ROUTING_MATRIX_SCRIPT_PATH = 'scripts/process-source-hub-routing-matrix-check.mjs'

export const HUB_ROUTING_COLUMNS = [
  'Strategy',
  'Ops',
  'Sales',
  'Recruiting',
  'Retention',
  'Agent Coaching',
  'Marketing',
  'Brand Guardian',
  'Training',
  'Steve Personal Brand',
  'MarketMasters',
  'Zahnd Team Ag',
  'Unchained / Education',
  'Decision Queue',
  'Backlog',
  'Ignore / No Value',
]

const ROUTE_STATES = new Set(['route', 'candidate', 'blocked', 'n/a', 'unknown'])

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function normalizeLower(value) {
  return String(value || '').trim().toLowerCase()
}

function stateForHub(row = {}, hub = '') {
  if (hub === 'Ignore / No Value') return row.decision === 'connected' ? 'n/a' : 'unknown'
  const consumers = new Set(normalizeList(row.hubConsumers))
  const brandLanes = new Set(normalizeList(row.brandLanes))
  const relevant = consumers.has(hub) || brandLanes.has(hub)
  if (!relevant) return 'n/a'
  if (['blocked', 'missing_contract', 'missing_connector', 'missing_extraction'].includes(row.decision)) return 'blocked'
  if (row.hasRouting) return 'route'
  if (row.hasPromotedAtoms || row.hasSynthesis || row.hasArtifacts || row.hasCandidates) return 'candidate'
  return 'unknown'
}

function reasonForState(row = {}, hub = '', state = 'unknown') {
  if (state === 'blocked') return row.blockedReason || 'Source/connector/extraction is not ready enough to route safely.'
  if (state === 'route') return `${row.label} has visible routing signal and ${hub} is an allowed consumer.`
  if (state === 'candidate') return `${row.label} is plausible for ${hub}, but active routing proof is not visible yet.`
  if (state === 'n/a') return `${hub} is not an intended consumer for this source class in v1.`
  return `${hub} has not been decided for this source class.`
}

export function buildSourceHubRoutingMatrixSnapshot({ connectorMatrix = {} } = {}) {
  const rows = normalizeList(connectorMatrix.rows).map(sourceRow => {
    const cells = HUB_ROUTING_COLUMNS.map(hub => {
      const state = stateForHub(sourceRow, hub)
      return {
        hub,
        state: ROUTE_STATES.has(state) ? state : 'unknown',
        reason: reasonForState(sourceRow, hub, state),
      }
    })
    const counts = cells.reduce((acc, cell) => {
      acc[cell.state] = (acc[cell.state] || 0) + 1
      return acc
    }, {})
    return {
      sourceKey: sourceRow.key,
      sourceId: sourceRow.sourceId,
      connectorId: sourceRow.connectorId,
      label: sourceRow.label,
      decision: sourceRow.decision,
      expectedDataOwned: sourceRow.expectedDataOwned,
      sourceReadiness: sourceRow.decision === 'connected'
        ? 'ready'
        : sourceRow.decision === 'atom_gap'
          ? 'needs_atom_flow'
          : sourceRow.decision === 'routing_gap'
            ? 'needs_route'
            : 'blocked_or_missing',
      cells,
      counts,
      primaryRoutes: cells.filter(cell => cell.state === 'route').map(cell => cell.hub),
      candidates: cells.filter(cell => cell.state === 'candidate').map(cell => cell.hub),
      blocked: cells.filter(cell => cell.state === 'blocked').map(cell => cell.hub),
    }
  })

  const cellCounts = rows.flatMap(row => row.cells).reduce((acc, cell) => {
    acc[cell.state] = (acc[cell.state] || 0) + 1
    return acc
  }, {})
  const multiCandidateRows = rows.filter(row => row.primaryRoutes.length + row.candidates.length > 1)
  const blockedRows = rows.filter(row => row.blocked.length > 0)
  const unknownRows = rows.filter(row => row.cells.some(cell => cell.state === 'unknown'))
  const hubCoverage = HUB_ROUTING_COLUMNS.map(hub => {
    const cells = rows.map(row => row.cells.find(cell => cell.hub === hub)).filter(Boolean)
    return {
      hub,
      route: cells.filter(cell => cell.state === 'route').length,
      candidate: cells.filter(cell => cell.state === 'candidate').length,
      blocked: cells.filter(cell => cell.state === 'blocked').length,
      unknown: cells.filter(cell => cell.state === 'unknown').length,
      nA: cells.filter(cell => normalizeLower(cell.state) === 'n/a').length,
    }
  })

  return {
    generatedAt: new Date().toISOString(),
    cardId: SOURCE_HUB_ROUTING_MATRIX_CARD_ID,
    closeoutKey: SOURCE_HUB_ROUTING_MATRIX_CLOSEOUT_KEY,
    columns: HUB_ROUTING_COLUMNS,
    states: Array.from(ROUTE_STATES),
    summary: {
      rowCount: rows.length,
      hubCount: HUB_ROUTING_COLUMNS.length,
      routeCellCount: cellCounts.route || 0,
      candidateCellCount: cellCounts.candidate || 0,
      blockedCellCount: cellCounts.blocked || 0,
      unknownCellCount: cellCounts.unknown || 0,
      nACellCount: cellCounts['n/a'] || 0,
      multiCandidateRowCount: multiCandidateRows.length,
      blockedRowCount: blockedRows.length,
      unknownRowCount: unknownRows.length,
    },
    rows,
    hubCoverage,
    blockedRows,
    unknownRows,
  }
}
