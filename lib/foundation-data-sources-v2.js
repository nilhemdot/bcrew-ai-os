export const FOUNDATION_DATA_SOURCES_V2_API_PATH = '/api/foundation/data-sources'
export const FOUNDATION_DATA_SOURCES_V2_ROUTE = '/foundation#data-sources-v2'

const STAGE_LABELS = {
  connected: 'Can read it',
  extracting: 'Reading now',
  synthesizing: 'Turned into ideas',
  routing: 'Sent to hubs',
}

const STATE_RANK = {
  ready: 0,
  partial: 1,
  blocked: 2,
  planned: 3,
  unknown: 4,
}

function normalizeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function normalizeLower(value) {
  return String(value || '').trim().toLowerCase()
}

function unique(values) {
  return Array.from(new Set(normalizeList(values).map(value => String(value || '').trim()).filter(Boolean)))
}

function latestIso(values) {
  const times = normalizeList(values)
    .map(value => value ? new Date(value).getTime() : 0)
    .filter(value => Number.isFinite(value) && value > 0)
  if (!times.length) return null
  return new Date(Math.max(...times)).toISOString()
}

function byKey(rows = [], key = 'sourceId') {
  return new Map(normalizeList(rows)
    .map(row => [row?.[key], row])
    .filter(([rowKey]) => Boolean(rowKey)))
}

function sourcePlainName(row = {}, contract = {}) {
  return row.label || contract.unitName || contract.title || row.sourceId || 'Unknown source'
}

function sourcePurpose(row = {}, contract = {}) {
  return row.expectedDataOwned ||
    contract.owns ||
    contract.scope ||
    contract.validationScope ||
    'Shared source used by Foundation when the source contract and connector are approved.'
}

function compactPurpose(value = '') {
  const text = String(value || '').trim()
  if (!text) return 'Foundation can use this source when the connection and approval rules are ready.'
  if (text.length <= 190) return text
  return `${text.slice(0, 187).trim()}...`
}

function stageStateReady(condition, fallback = 'blocked') {
  return condition ? 'ready' : fallback
}

function connectedStage(row = {}) {
  if (row.blockedReason) {
    return {
      state: 'blocked',
      detail: row.blockedReason,
      at: null,
    }
  }
  if (row.connectorState === 'connected' || row.hasCredential || row.hasConnector) {
    return {
      state: 'ready',
      detail: 'Foundation has a usable access path or connector record for this source.',
      at: null,
    }
  }
  if (row.connectorState === 'candidate') {
    return {
      state: 'partial',
      detail: 'A connector path exists, but it still needs approval or proof.',
      at: null,
    }
  }
  return {
    state: 'blocked',
    detail: row.connectorStatus || 'No usable connector is visible yet.',
    at: null,
  }
}

function extractingStage(row = {}, targets = []) {
  const lastRunAt = latestIso(targets.flatMap(target => [
    target.lastRunAt,
    target.cursorState?.lastRunnerAt,
    target.cursorState?.latestIngestedAt,
    ...normalizeList(target.reasonSummary).map(reason => reason.latestUpdatedAt),
  ]))
  if (row.hasArtifacts || row.hasCandidates || row.hasExtractionTarget) {
    return {
      state: row.hasArtifacts || row.hasCandidates ? 'ready' : 'partial',
      detail: row.hasArtifacts || row.hasCandidates
        ? 'Foundation has saved extracted evidence or useful candidates from this source.'
        : 'An extraction lane exists, but saved evidence is not visible yet.',
      targetKeys: targets.map(target => target.targetKey || target.key).filter(Boolean),
      latestRunAt: lastRunAt,
    }
  }
  return {
    state: row.blockedReason ? 'blocked' : 'planned',
    detail: row.blockedReason || 'No active extraction lane is visible yet.',
    targetKeys: [],
    latestRunAt: lastRunAt,
  }
}

function synthesizingStage(row = {}, sourceMetrics = {}) {
  const latest = latestIso([
    sourceMetrics.latestFactAt,
    sourceMetrics.latestSynthesizedAt,
    sourceMetrics.latestAtomAt,
  ])
  if (row.hasSynthesis) {
    return {
      state: 'ready',
      detail: 'The brain layer has turned this source into clean facts or build intelligence.',
      lastSynthesizedAt: latest,
    }
  }
  if (row.hasPromotedAtoms || row.hasCandidates || row.hasArtifacts) {
    return {
      state: 'partial',
      detail: 'Useful findings exist, but synthesis proof is incomplete or stale.',
      lastSynthesizedAt: latest,
    }
  }
  return {
    state: row.blockedReason ? 'blocked' : 'planned',
    detail: row.blockedReason || 'Nothing from this source is ready for synthesis yet.',
    lastSynthesizedAt: latest,
  }
}

function routingStage(row = {}, routeRow = {}) {
  const primaryRoutes = normalizeList(routeRow.primaryRoutes)
  const candidates = normalizeList(routeRow.candidates)
  if (row.hasRouting || primaryRoutes.length) {
    return {
      state: 'ready',
      detail: 'Useful findings from this source are already routed to one or more hubs.',
      routes: primaryRoutes,
      hubTags: unique([...primaryRoutes, ...candidates, ...normalizeList(row.hubConsumers)]),
    }
  }
  if (candidates.length || row.hasSynthesis) {
    return {
      state: 'partial',
      detail: 'Foundation has candidate hub routes, but live routing still needs proof.',
      routes: [],
      hubTags: unique([...candidates, ...normalizeList(row.hubConsumers)]),
    }
  }
  return {
    state: row.blockedReason ? 'blocked' : 'planned',
    detail: row.blockedReason || 'No hub route is active yet.',
    routes: [],
    hubTags: unique(normalizeList(row.hubConsumers)),
  }
}

function plainStatus(row = {}, stages = {}) {
  if (row.decision === 'connected') {
    return {
      status: 'ready',
      statusText: 'Live',
      plain: 'Foundation can read it, turn it into ideas, and send useful findings to hubs.',
    }
  }
  if (row.decision === 'blocked' || row.decision === 'missing_connector' || row.decision === 'missing_contract') {
    return {
      status: 'blocked',
      statusText: 'Needs approval',
      plain: row.blockedReason || 'This source needs approval, credentials, or a safer access path.',
    }
  }
  if (row.decision === 'missing_extraction') {
    return {
      status: 'planned',
      statusText: 'Not extracting yet',
      plain: 'Foundation knows about this source, but it is not being mined yet.',
    }
  }
  const staleSynthesis = stages.extracting?.state === 'ready' && stages.synthesizing?.state !== 'ready'
  return {
    status: staleSynthesis ? 'partial' : 'partial',
    statusText: staleSynthesis ? 'Needs synthesis' : 'Partly live',
    plain: row.blockedReason || 'One part of the chain is working, but it is not fully live yet.',
  }
}

function sourceMetricsFor(sourceId, operational = {}) {
  const atoms = byKey(operational.atomsBySource || []).get(sourceId) || {}
  const facts = byKey(operational.factsBySource || []).get(sourceId) || {}
  const synthesized = byKey(operational.synthesizedItemsBySource || []).get(sourceId) || {}
  const routes = byKey(operational.routesBySource || []).get(sourceId) || {}
  return {
    totalAtoms: Number(atoms.totalAtoms || atoms.total || 0),
    activeAtoms: Number(atoms.activeAtoms || 0),
    totalFacts: Number(facts.totalFacts || facts.total || 0),
    activeFacts: Number(facts.activeFacts || 0),
    totalSynthesizedItems: Number(synthesized.totalSynthesizedItems || 0),
    activeSynthesizedItems: Number(synthesized.activeSynthesizedItems || 0),
    totalRoutes: Number(routes.totalRoutes || 0),
    activeRoutes: Number(routes.activeRoutes || 0),
    latestAtomAt: atoms.latestAtomAt || null,
    latestFactAt: facts.latestFactAt || null,
    latestSynthesizedAt: synthesized.latestSynthesizedAt || null,
    latestRouteAt: routes.latestRouteAt || null,
  }
}

function buildTargetCard(target = {}) {
  const title = target.title || target.targetKey || target.key || 'Source target'
  const counts = target.counts || {}
  const latestRunAt = latestIso([
    target.lastRunAt,
    target.cursorState?.lastRunnerAt,
    target.cursorState?.latestIngestedAt,
    ...normalizeList(target.reasonSummary).map(reason => reason.latestUpdatedAt),
  ])
  const extracted = Number(counts.extracted || target.extractedCount || 0)
  const archived = Number(counts.archived || target.archivedCount || 0)
  return {
    targetKey: target.targetKey || target.key || '',
    title,
    status: target.status || 'unknown',
    plainStatus: target.parkedReason
      ? 'Parked'
      : extracted > 0
        ? 'Extracting'
        : archived > 0
          ? 'Connected'
          : 'Not active yet',
    detail: target.parkedReason || (extracted > 0
      ? `${extracted} extracted items are visible.`
      : archived > 0
        ? `${archived} saved items are visible.`
        : 'No saved items are visible yet.'),
    latestRunAt,
  }
}

export function buildFoundationDataSourcesV2Snapshot({
  generatedAt = new Date().toISOString(),
  sourceContracts = [],
  sourceConnectorMatrix = {},
  sourceHubRoutingMatrix = {},
  sourceLifecycle = {},
  sourceMaturityOperational = {},
} = {}) {
  const contractsById = byKey(sourceContracts, 'sourceId')
  const routesById = byKey(sourceHubRoutingMatrix.rows || [], 'sourceId')
  const targetsBySource = new Map()
  normalizeList(sourceLifecycle.targets).forEach(target => {
    const sourceId = target.sourceId
    if (!sourceId) return
    if (!targetsBySource.has(sourceId)) targetsBySource.set(sourceId, [])
    targetsBySource.get(sourceId).push(target)
  })

  const sources = normalizeList(sourceConnectorMatrix.rows).map(row => {
    const sourceId = row.sourceId
    const contract = contractsById.get(sourceId) || {}
    const routeRow = routesById.get(sourceId) || {}
    const targets = normalizeList(targetsBySource.get(sourceId)).map(buildTargetCard)
    const rawTargets = normalizeList(targetsBySource.get(sourceId))
    const metrics = sourceMetricsFor(sourceId, sourceMaturityOperational)
    const stages = {
      connected: connectedStage(row),
      extracting: extractingStage(row, rawTargets),
      synthesizing: synthesizingStage(row, metrics),
      routing: routingStage(row, routeRow),
    }
    const status = plainStatus(row, stages)
    const hubTags = unique([
      ...normalizeList(stages.routing.hubTags),
      ...normalizeList(row.hubConsumers),
      ...normalizeList(row.pillars),
    ])
    const blockers = unique([
      row.blockedReason,
      row.credentialBlockerReason,
      ...normalizeList(routeRow.blocked).map(hub => `${hub} is blocked until this source is safer to route.`),
    ])
    const lastExtractedAt = stages.extracting.latestRunAt || latestIso(rawTargets.map(target => target.lastRunAt))
    const lastSynthesizedAt = stages.synthesizing.lastSynthesizedAt || metrics.latestSynthesizedAt || metrics.latestFactAt || null

    return {
      sourceId,
      title: sourcePlainName(row, contract),
      plainName: sourcePlainName(row, contract),
      plainPurpose: compactPurpose(sourcePurpose(row, contract)),
      status: status.status,
      statusText: status.statusText,
      statusDetail: status.plain,
      sourceType: row.key || contract.group || 'source',
      connector: {
        connectorId: row.connectorId || '',
        state: row.connectorState || 'unknown',
        credentialStatus: row.credentialStatus || 'not recorded',
        blocker: row.credentialBlockerReason || '',
      },
      stages,
      stageLabels: STAGE_LABELS,
      hubTags,
      childTargets: targets,
      childCreators: [],
      lastExtractedAt,
      lastSynthesizedAt,
      blockers,
      counts: {
        extractedTargets: targets.filter(target => target.plainStatus === 'Extracting').length,
        targets: targets.length,
        atoms: metrics.totalAtoms,
        facts: metrics.totalFacts,
        synthesizedItems: metrics.totalSynthesizedItems,
        routes: metrics.totalRoutes,
      },
      sourceRefs: unique([sourceId, row.connectorId].filter(Boolean)),
      evidenceRefs: unique([
        `source:${sourceId}`,
        ...targets.slice(0, 4).map(target => `target:${target.targetKey}`),
      ]),
      drilldownHref: `/foundation#source-lifecycle:${sourceId}`,
    }
  }).sort((left, right) => {
    const rank = (STATE_RANK[left.status] ?? 9) - (STATE_RANK[right.status] ?? 9)
    if (rank !== 0) return rank
    return left.title.localeCompare(right.title)
  })

  const summary = sources.reduce((acc, source) => {
    acc.total += 1
    acc[source.status] = (acc[source.status] || 0) + 1
    acc.connected += source.stages.connected.state === 'ready' ? 1 : 0
    acc.extracting += ['ready', 'partial'].includes(source.stages.extracting.state) ? 1 : 0
    acc.synthesizing += source.stages.synthesizing.state === 'ready' ? 1 : 0
    acc.routing += source.stages.routing.state === 'ready' ? 1 : 0
    return acc
  }, {
    total: 0,
    ready: 0,
    partial: 0,
    planned: 0,
    blocked: 0,
    connected: 0,
    extracting: 0,
    synthesizing: 0,
    routing: 0,
  })

  return {
    generatedAt,
    route: FOUNDATION_DATA_SOURCES_V2_ROUTE,
    apiPath: FOUNDATION_DATA_SOURCES_V2_API_PATH,
    summary,
    labels: STAGE_LABELS,
    sources,
  }
}
