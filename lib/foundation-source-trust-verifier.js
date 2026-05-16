import {
  EXPECTED_KPI_RPCS,
  EXPECTED_KPI_TABLES,
  KPI_HEALTH_PRIMARY_SURFACE,
} from './kpi-health.js'

export const VERIFIER_SOURCE_TRUST_SPLIT_MODULE_CARD_ID = 'VERIFIER-SOURCE-TRUST-SPLIT-MODULE-001'
export const VERIFIER_SOURCE_TRUST_SPLIT_MODULE_CLOSEOUT_KEY = 'verifier-source-trust-split-module-v1'
export const VERIFIER_SOURCE_TRUST_SPLIT_MODULE_PLAN_PATH = 'docs/process/verifier-source-trust-split-module-001-plan.md'
export const VERIFIER_SOURCE_TRUST_SPLIT_MODULE_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-SOURCE-TRUST-SPLIT-MODULE-001.json'
export const VERIFIER_SOURCE_TRUST_SPLIT_MODULE_SCRIPT_PATH = 'scripts/process-verifier-source-trust-split-module-check.mjs'
export const VERIFIER_SOURCE_TRUST_SPLIT_MODULE_SPRINT_ID = 'verifier-source-trust-split-module-2026-05-15'
export const VERIFIER_SOURCE_TRUST_SPLIT_MODULE_BEFORE_LINES = 15236

export const REQUIRED_WORKING_CONNECTOR_IDS = [
  'CONN-GSHEETS-001',
  'CONN-GDRIVE-001',
  'CONN-GMAIL-001',
  'CONN-GCAL-001',
  'CONN-FUB-001',
  'CONN-CLICKUP-001',
  'CONN-SLACK-001',
  'CONN-MISSIVE-001',
  'CONN-DATAFORSEO-001',
  'CONN-META-001',
]

export const REQUIRED_PLUGIN_NAMES = [
  'Browser Use',
  'Canva',
  'Documents',
  'GitHub',
  'Gmail',
  'Google Calendar',
  'Google Drive',
  'Presentations',
  'Spreadsheets',
]

export const PHASE_C_VISIBILITY_CARD_IDS = [
  'PHANTOM-CARD-CHECK-001',
  'PHASE-NUMBERING-RECONCILE-001',
  'SUB-SURFACE-MAPPING-001',
  'SYSTEM-INVENTORY-TRUE-UP-001',
  'SOURCE-CONTRACT-CLEANUP-001',
  'VERIFIER-CONSOLIDATION-001',
]

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function includesAll(text = '', patterns = []) {
  return patterns.every(pattern => String(text || '').includes(pattern))
}

function findSourceById(sources = [], sourceId) {
  return (sources || []).find(source => source.sourceId === sourceId || source.id === sourceId) || null
}

function textFromCard(card = {}) {
  return [
    card.summary,
    card.whyItMatters,
    card.nextAction,
    card.statusNote,
  ].filter(Boolean).join('\n')
}

export function evaluateFoundationSourceTrustVerifier(input = {}) {
  const checks = []
  const sourceOfTruth = input.sourceOfTruth || {}
  const sourceContracts = input.sourceContracts || []
  const sourceConnectors = input.sourceConnectors || []
  const groupedSourceSystems = input.groupedSourceSystems || []
  const foundationHub = input.foundationHub || {}
  const sourceTruthKpiHealth = input.sourceTruthKpiHealth || sourceOfTruth.kpiHealth || {}
  const foundationHubKpiHealth = input.foundationHubKpiHealth || foundationHub.kpiHealth || {}
  const backlogHygieneApi = input.backlogHygieneApi || foundationHub.backlogHygiene || {}
  const foundationFrontendSource = input.foundationFrontendSource || ''
  const foundationHtmlSource = input.foundationHtmlSource || ''
  const foundationUiSource = input.foundationUiSource || ''
  const foundationDbWithBacklogSeedSource = input.foundationDbWithBacklogSeedSource || ''
  const foundationVerifySource = input.foundationVerifySource || ''
  const moduleSource = input.moduleSource || ''
  const phaseCApprovalFilesPresent = input.phaseCApprovalFilesPresent || []

  addCheck(
    checks,
    Array.isArray(sourceOfTruth.sources) && sourceOfTruth.sources.length === sourceContracts.length,
    'api/source-of-truth exposes the full source-contract set',
    `${Array.isArray(sourceOfTruth.sources) ? sourceOfTruth.sources.length : 'invalid'} live / ${sourceContracts.length} code`,
  )

  addCheck(
    checks,
    Array.isArray(sourceOfTruth.connectors) && sourceOfTruth.connectors.length === sourceConnectors.length,
    'api/source-of-truth exposes the full connector set',
    `${Array.isArray(sourceOfTruth.connectors) ? sourceOfTruth.connectors.length : 'invalid'} live / ${sourceConnectors.length} code`,
  )

  const workingConnectorIds = Array.isArray(sourceOfTruth.connectors)
    ? sourceOfTruth.connectors.filter(connector => connector.group === 'working').map(connector => connector.connectorId)
    : []
  const missingWorkingConnectorIds = REQUIRED_WORKING_CONNECTOR_IDS.filter(connectorId => !workingConnectorIds.includes(connectorId))
  addCheck(
    checks,
    missingWorkingConnectorIds.length === 0,
    'source connector status reflects proven working rebuild paths',
    missingWorkingConnectorIds.length
      ? `missing working status for ${missingWorkingConnectorIds.join(', ')}`
      : `${workingConnectorIds.length} connectors marked working`,
  )

  const expectedGroupedSystemIds = groupedSourceSystems.map(system => system.systemId)
  const liveGroupedSystemIds = Array.isArray(sourceOfTruth.groupedSystems)
    ? sourceOfTruth.groupedSystems.map(system => system.systemId)
    : []
  const missingGroupedSystemIds = expectedGroupedSystemIds.filter(systemId => !liveGroupedSystemIds.includes(systemId))
  addCheck(
    checks,
    Array.isArray(sourceOfTruth.groupedSystems) &&
      sourceOfTruth.groupedSystems.length === groupedSourceSystems.length &&
      missingGroupedSystemIds.length === 0 &&
      foundationHtmlSource.includes('data-section="systems"') &&
      foundationFrontendSource.includes('renderFoundationSystems') &&
      foundationFrontendSource.includes('renderGroupedSourceSystemsPanel'),
    'api/source-of-truth exposes grouped source systems for Foundation visibility',
    missingGroupedSystemIds.length
      ? `missing ${missingGroupedSystemIds.join(', ')}`
      : `${liveGroupedSystemIds.length} live / ${groupedSourceSystems.length} code`,
  )

  addCheck(
    checks,
    includesAll(foundationFrontendSource, [
      'renderDataSourcePurposePanel',
      'Show the whole source layer',
      'doc-backed source contracts only',
      'spreadsheet-backed source contracts',
      'Show app, API, and database-backed business sources',
      'Show the connector layer only',
      'Connector does not equal trusted source',
    ]),
    'Data Sources pages explain purpose and connector boundary',
    'Overview, Docs, Spreadsheets, APIs and apps, and Connectors have explicit page-purpose copy',
  )

  const expectedKpiTableNames = EXPECTED_KPI_TABLES.map(item => item.table)
  const expectedKpiRpcNames = EXPECTED_KPI_RPCS.map(item => item.rpc)
  const sourceTruthKpiTables = Array.isArray(sourceTruthKpiHealth.tables) ? sourceTruthKpiHealth.tables : []
  const sourceTruthKpiRpcs = Array.isArray(sourceTruthKpiHealth.rpcs) ? sourceTruthKpiHealth.rpcs : []
  const sourceTruthKpiTableNames = sourceTruthKpiTables.map(item => item.table)
  const sourceTruthKpiRpcNames = sourceTruthKpiRpcs.map(item => item.rpc)
  const missingKpiTables = expectedKpiTableNames.filter(table => !sourceTruthKpiTableNames.includes(table))
  const missingKpiRpcs = expectedKpiRpcNames.filter(rpc => !sourceTruthKpiRpcNames.includes(rpc))
  addCheck(
    checks,
    sourceTruthKpiHealth.contractVersion === 1 &&
      sourceTruthKpiHealth.primarySurface === KPI_HEALTH_PRIMARY_SURFACE &&
      sourceTruthKpiHealth.summary?.probeSilent === false &&
      sourceTruthKpiTables.length === expectedKpiTableNames.length &&
      sourceTruthKpiRpcs.length === expectedKpiRpcNames.length &&
      missingKpiTables.length === 0 &&
      missingKpiRpcs.length === 0 &&
      sourceTruthKpiHealth.schemaDrift?.status &&
      foundationHubKpiHealth.summary?.probeSilent === false,
    'Data Sources exposes KPI / Supabase health contract',
    missingKpiTables.length || missingKpiRpcs.length
      ? `missing tables=${missingKpiTables.join(',') || 'none'} rpcs=${missingKpiRpcs.join(',') || 'none'}`
      : `${sourceTruthKpiTables.length} tables / ${sourceTruthKpiRpcs.length} RPCs / status=${sourceTruthKpiHealth.summary?.status || 'unknown'}`,
  )

  addCheck(
    checks,
    backlogHygieneApi.contractVersion === 1 &&
      backlogHygieneApi.surface === 'Foundation > Runtime Health > Backlog Hygiene' &&
      backlogHygieneApi.thresholds?.staleExecutingDays === 3 &&
      Number.isFinite(Number(backlogHygieneApi.summary?.cardCount)) &&
      Number.isFinite(Number(backlogHygieneApi.summary?.criticalFindings)) &&
      Array.isArray(backlogHygieneApi.findings) &&
      Array.isArray(backlogHygieneApi.visibleFindings) &&
      backlogHygieneApi.visibleFindings.every(finding => finding.severity !== 'info') &&
      includesAll(input.packageSource, ['"backlog:hygiene"', 'scripts/backlog-hygiene.mjs']) &&
      includesAll(input.serverRouteSource, ['buildBacklogHygieneSnapshot', 'backlogHygiene']) &&
      includesAll(foundationFrontendSource, [
        'renderBacklogHygienePanel',
        'Backlog Hygiene',
        'Stale executing threshold',
        'No visible backlog hygiene findings',
      ]),
    'Runtime Health exposes automatic Backlog Hygiene findings',
    `${backlogHygieneApi.summary?.criticalFindings ?? 'unknown'} critical / ${backlogHygieneApi.summary?.warningFindings ?? 'unknown'} warnings / threshold=${backlogHygieneApi.thresholds?.staleExecutingDays ?? 'missing'} days`,
  )

  addCheck(
    checks,
    foundationHub.cardReferenceTrust?.summary &&
      foundationHub.cardReferenceTrust.summary.missingCardReferenceCount === 0 &&
      input.cardReferenceTrust?.summary?.missingCardReferenceCount === 0 &&
      includesAll(foundationFrontendSource, [
        'renderCardReferenceTrustPanel',
        'Card Reference Trust',
        'No missing active backlog card references',
      ]),
    'Card Reference Trust has no missing active backlog cards',
    foundationHub.cardReferenceTrust?.summary
      ? `${foundationHub.cardReferenceTrust.summary.missingCardReferenceCount} missing references across ${foundationHub.cardReferenceTrust.summary.scannedFileCount} active files`
      : 'missing Runtime Health card-reference payload',
  )

  addCheck(
    checks,
    input.syntheticCardReferenceTrust?.summary?.missingCardReferenceCount === 1 &&
      (input.syntheticCardReferenceTrust?.findings || []).some(finding => finding.cardId === 'PHANTOM-CARD-CHECK-999'),
    'Card Reference Trust catches a synthetic phantom card',
    (input.syntheticCardReferenceTrust?.findings || []).map(finding => `${finding.cardId} in ${finding.path}`).join(', ') || 'synthetic phantom was not caught',
  )

  addCheck(
    checks,
    foundationHub.sourceReferenceTrust?.summary &&
      foundationHub.sourceReferenceTrust.summary.undeclaredActiveReferenceCount === 0 &&
      input.sourceReferenceTrust?.summary?.undeclaredActiveReferenceCount === 0 &&
      input.sourceReferenceTrust?.summary?.historicalClassifiedCount >= 5 &&
      includesAll(foundationFrontendSource, [
        'renderSourceReferenceTrustPanel',
        'Source Contract Trust',
        'No missing active source IDs',
      ]),
    'Source Contract Trust has no undeclared active source IDs',
    foundationHub.sourceReferenceTrust?.summary
      ? `${foundationHub.sourceReferenceTrust.summary.undeclaredActiveReferenceCount} undeclared active refs / ${input.sourceReferenceTrust?.summary?.historicalClassifiedCount ?? 'unknown'} historical classified`
      : 'missing Runtime Health source-reference payload',
  )

  addCheck(
    checks,
    includesAll(input.sourceContractsSource, [
      "sourceId: 'SRC-STRATEGY-QUARTER-001'",
      "sourceId: 'SRC-MYICRO-001'",
      'Scoped, not connected',
    ]) &&
      includesAll(input.sourceContractCleanupDoc, [
        'SRC-STRATEGY-QUARTER-001',
        'SRC-MYICRO-001',
        'SRC-AGENT-SATISFACTION-001',
        'historical-alias',
      ]),
    'Source cleanup declares active refs and classifies historical aliases',
    'Strategy Quarter and Mycro are proposed contracts; historical source aliases are documented instead of promoted into fake truth',
  )

  addCheck(
    checks,
    includesAll(foundationVerifySource, [
      'function ensureIncludesAll',
      'buildSourceReferenceTrustStatus',
      'buildCardReferenceTrustStatus',
    ]) &&
      includesAll(input.verifierConsolidationDoc, [
        'Consolidated Check Patterns',
        'Message Rewrites',
        'Source Contract Trust has no undeclared active source IDs',
        'System Inventory shows all nine configured plugin surfaces',
        'Foundation pages, sub-surfaces, and critical API routes are mapped',
        'Dashboard is serving the same code as the repo',
      ]),
    'Verifier uses shared trust helpers and documents plain-English rewrites',
    'six consolidation patterns and 11 operator-facing message rewrites are documented',
  )

  addCheck(
    checks,
    expectedKpiTableNames.every(table => String(input.kpiHealthSource || '').includes(`table: '${table}'`)) &&
      expectedKpiRpcNames.every(rpc => String(input.kpiHealthSource || '').includes(`rpc: '${rpc}'`)) &&
      includesAll(input.kpiHealthSource, [
        'KPI_HEALTH_CONTRACT_VERSION',
        'KPI_HEALTH_PRIMARY_SURFACE',
        'freshnessWindowDays',
        'KPI_HEALTH_LEE_REPO_PATH',
        'schemaDrift',
        'probeSilent',
      ]) &&
      includesAll(input.kpiHealthScriptSource, [
        'getKpiHealthSnapshot',
        'KPI_HEALTH_SUMMARY',
        'process.exitCode = 1',
      ]) &&
      includesAll(input.kpiSourceNote, [
        'Load-bearing tables',
        'Load-bearing RPCs',
        'Freshness windows are per source',
        'Lee repo/Supabase schema drift',
        'Foundation > Data Sources > APIs / Apps > KPI / Supabase Health',
      ]),
    'KPI health probe codifies read rules, freshness, schema drift, and proof output',
    `${expectedKpiTableNames.length} tables / ${expectedKpiRpcNames.length} RPCs guarded in lib/kpi-health.js`,
  )

  const kpiHealthBacklog = (foundationHub.backlogItems || []).find(item => item.id === 'KPI-HEALTH-001') || null
  const kpiHealthBacklogText = textFromCard(kpiHealthBacklog)
  addCheck(
    checks,
    kpiHealthBacklog?.lane === 'done' &&
      kpiHealthBacklog?.priority === 'P1' &&
      expectedKpiTableNames.every(table => kpiHealthBacklogText.includes(table)) &&
      expectedKpiRpcNames.every(rpc => kpiHealthBacklogText.includes(rpc)) &&
      kpiHealthBacklogText.includes('Foundation > Data Sources > APIs / Apps > KPI / Supabase Health') &&
      kpiHealthBacklogText.includes('Runtime Health should only warn when the probe is unhealthy') &&
      String(input.currentPlan || '').includes('KPI-HEALTH-001` v1 now probes') &&
      String(input.currentState || '').includes('KPI-HEALTH-001` is done for v1'),
    'KPI-HEALTH-001 backlog and docs capture exact v1 acceptance',
    kpiHealthBacklog
      ? `${kpiHealthBacklog.lane} / ${kpiHealthBacklog.priority} / ${expectedKpiTableNames.length} tables / ${expectedKpiRpcNames.length} RPCs`
      : 'missing KPI-HEALTH-001',
  )

  addCheck(
    checks,
    includesAll(foundationFrontendSource, [
      'renderKpiSupabaseHealthPanel',
      'KPI / Supabase Health',
      'Load-bearing KPI freshness and schema drift',
      'renderKpiHealthRuntimeWarning',
      'Runtime Health only surfaces KPI here when freshness, schema drift, or the health probe itself is unhealthy',
      '/foundation#source-apis:kpi-supabase-health',
    ]),
    'Foundation UI shows KPI health in Data Sources and warnings in Runtime Health',
    'primary KPI health panel is Data Sources; Runtime Health is warning-only',
  )

  const inventoryPluginNames = (input.systemInventory?.plugins || []).map(plugin => plugin.title)
  addCheck(
    checks,
    input.systemInventory?.docs &&
      Array.isArray(input.systemInventory.docs.tracked) &&
      Array.isArray(input.systemInventory.docs.privateLocal) &&
      Array.isArray(input.systemInventory.skills) &&
      Array.isArray(input.systemInventory.plugins) &&
      input.systemInventory.plugins.length === REQUIRED_PLUGIN_NAMES.length &&
      REQUIRED_PLUGIN_NAMES.every(pluginName => inventoryPluginNames.includes(pluginName)) &&
      includesAll(foundationFrontendSource, [
        'renderSystemInventoryPurposePanel',
        'Current Docs inventory job',
        'Skills inventory job',
        'Plugins and MCPs inventory job',
        'Agents inventory job',
        'not a live Agent Registry yet',
      ]),
    'System Inventory shows all nine configured plugin surfaces',
    `${input.systemInventory?.docs?.tracked?.length ?? 'invalid'} docs / ${input.systemInventory?.skills?.length ?? 'invalid'} skills / ${input.systemInventory?.plugins?.length ?? 'invalid'} plugins: ${inventoryPluginNames.join(', ')}`,
  )

  addCheck(
    checks,
    includesAll(input.currentState, [
      'Data Sources And System Inventory Surfaces',
      'Connector does not equal trusted source',
      'not a live Agent Registry yet',
      'AGENT-006',
      'AGENT-007',
      'AGENT-010',
    ]),
    'current-state documents Data Sources and System Inventory purpose boundaries',
    'source, connector, docs, skills, plugins, and agent inventory boundaries are captured',
  )

  addCheck(
    checks,
    includesAll(foundationFrontendSource, [
      'Command Order ↔ Live Backlog',
      'Keep Maps Current',
      'Monitor Extraction',
      'Harden Corpus Lanes',
      'Freshness And Health',
      'Enforce The Process',
      'Clean Visibility Drift',
      'Close The Action Loop',
      'Re-Audit Before Features',
    ]) &&
      !foundationUiSource.includes('Phase Gates ↔ Live Backlog') &&
      !foundationUiSource.includes('Phase 1 · Truth Cleanup'),
    'Rebuild Plan UI shows command order instead of conflicting phase labels',
    'docs keep rebuild phase doctrine; UI shows Steve-facing command order',
  )

  addCheck(
    checks,
    phaseCApprovalFilesPresent.every(Boolean) &&
      PHASE_C_VISIBILITY_CARD_IDS.every(cardId => {
        const card = (foundationHub.backlogItems || []).find(item => item.id === cardId)
        return card?.lane === 'done' &&
          card.statusNote &&
          foundationDbWithBacklogSeedSource.includes(`id: '${cardId}'`) &&
          moduleSource.includes(cardId) &&
          String(input.packageSource || '').includes('foundation:verify')
      }),
    'Phase C visibility cards are done with ID-named verifier coverage',
    PHASE_C_VISIBILITY_CARD_IDS.join(', '),
  )

  addCheck(
    checks,
    includesAll(input.driveCorpusNote, [
      'Strategy Folder Operating Model',
      'quarterly evidence intake',
      'not the canonical strategy',
      'Strategy Hub / Strategic Execution',
      'Action Router',
    ]),
    'Drive strategy folder is captured as quarterly evidence intake',
    'Drive source note distinguishes raw evidence folder from canonical strategy and Strategy Hub outputs',
  )

  const liveOwnersContract = findSourceById(sourceOfTruth.sources, 'SRC-OWNERS-001')
  addCheck(
    checks,
    liveOwnersContract?.status === 'Signed Off' && liveOwnersContract?.validation === 'Signed Off',
    'api/source-of-truth keeps Owners sign-off visible',
    liveOwnersContract ? `${liveOwnersContract.status} / ${liveOwnersContract.validation}` : 'missing',
  )

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    checks,
    failed,
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
    },
  }
}

function makeKpiHealthFixture() {
  return {
    contractVersion: 1,
    primarySurface: KPI_HEALTH_PRIMARY_SURFACE,
    summary: { probeSilent: false, status: 'healthy' },
    schemaDrift: { status: 'healthy' },
    tables: EXPECTED_KPI_TABLES.map(item => ({ table: item.table })),
    rpcs: EXPECTED_KPI_RPCS.map(item => ({ rpc: item.rpc })),
  }
}

function buildHealthySourceTrustContext(overrides = {}) {
  const sourceContracts = [{ sourceId: 'SRC-OWNERS-001', status: 'Signed Off', validation: 'Signed Off' }]
  const sourceConnectors = REQUIRED_WORKING_CONNECTOR_IDS.map(connectorId => ({ connectorId }))
  const groupedSourceSystems = [{ systemId: 'SYS-ONE' }]
  const kpiHealth = makeKpiHealthFixture()
  const phaseCards = PHASE_C_VISIBILITY_CARD_IDS.map(id => ({ id, lane: 'done', statusNote: `${id} done` }))
  const kpiBacklog = {
    id: 'KPI-HEALTH-001',
    lane: 'done',
    priority: 'P1',
    summary: [
      ...EXPECTED_KPI_TABLES.map(item => item.table),
      ...EXPECTED_KPI_RPCS.map(item => item.rpc),
      'Foundation > Data Sources > APIs / Apps > KPI / Supabase Health',
      'Runtime Health should only warn when the probe is unhealthy',
    ].join(' '),
  }
  const foundationFrontendSource = [
    'data-section="systems"',
    'renderFoundationSystems',
    'renderGroupedSourceSystemsPanel',
    'renderDataSourcePurposePanel',
    'Show the whole source layer',
    'doc-backed source contracts only',
    'spreadsheet-backed source contracts',
    'Show app, API, and database-backed business sources',
    'Show the connector layer only',
    'Connector does not equal trusted source',
    'renderBacklogHygienePanel',
    'Backlog Hygiene',
    'Stale executing threshold',
    'No visible backlog hygiene findings',
    'renderCardReferenceTrustPanel',
    'Card Reference Trust',
    'No missing active backlog card references',
    'renderSourceReferenceTrustPanel',
    'Source Contract Trust',
    'No missing active source IDs',
    'renderKpiSupabaseHealthPanel',
    'KPI / Supabase Health',
    'Load-bearing KPI freshness and schema drift',
    'renderKpiHealthRuntimeWarning',
    'Runtime Health only surfaces KPI here when freshness, schema drift, or the health probe itself is unhealthy',
    '/foundation#source-apis:kpi-supabase-health',
    'renderSystemInventoryPurposePanel',
    'Current Docs inventory job',
    'Skills inventory job',
    'Plugins and MCPs inventory job',
    'Agents inventory job',
    'not a live Agent Registry yet',
    'Command Order ↔ Live Backlog',
    'Keep Maps Current',
    'Monitor Extraction',
    'Harden Corpus Lanes',
    'Freshness And Health',
    'Enforce The Process',
    'Clean Visibility Drift',
    'Close The Action Loop',
    'Re-Audit Before Features',
  ].join('\n')
  const currentState = [
    'KPI-HEALTH-001` is done for v1',
    'Data Sources And System Inventory Surfaces',
    'Connector does not equal trusted source',
    'not a live Agent Registry yet',
    'AGENT-006',
    'AGENT-007',
    'AGENT-010',
  ].join('\n')
  const kpiHealthSource = [
    ...EXPECTED_KPI_TABLES.map(item => `table: '${item.table}'`),
    ...EXPECTED_KPI_RPCS.map(item => `rpc: '${item.rpc}'`),
    'KPI_HEALTH_CONTRACT_VERSION',
    'KPI_HEALTH_PRIMARY_SURFACE',
    'freshnessWindowDays',
    'KPI_HEALTH_LEE_REPO_PATH',
    'schemaDrift',
    'probeSilent',
  ].join('\n')
  const foundationDbWithBacklogSeedSource = PHASE_C_VISIBILITY_CARD_IDS.map(id => `id: '${id}'`).join('\n')
  const moduleSource = PHASE_C_VISIBILITY_CARD_IDS.join('\n')

  return {
    sourceOfTruth: {
      sources: sourceContracts,
      connectors: REQUIRED_WORKING_CONNECTOR_IDS.map(connectorId => ({ connectorId, group: 'working' })),
      groupedSystems: groupedSourceSystems,
      kpiHealth,
    },
    sourceContracts,
    sourceConnectors,
    groupedSourceSystems,
    foundationHub: {
      kpiHealth,
      backlogHygiene: {
        contractVersion: 1,
        surface: 'Foundation > Runtime Health > Backlog Hygiene',
        thresholds: { staleExecutingDays: 3 },
        summary: { cardCount: 10, criticalFindings: 0, warningFindings: 0 },
        findings: [],
        visibleFindings: [],
      },
      cardReferenceTrust: { summary: { missingCardReferenceCount: 0, scannedFileCount: 1 } },
      sourceReferenceTrust: { summary: { undeclaredActiveReferenceCount: 0 } },
      backlogItems: [kpiBacklog, ...phaseCards],
    },
    cardReferenceTrust: { summary: { missingCardReferenceCount: 0 } },
    syntheticCardReferenceTrust: {
      summary: { missingCardReferenceCount: 1 },
      findings: [{ cardId: 'PHANTOM-CARD-CHECK-999', path: 'docs/rebuild/synthetic.md' }],
    },
    sourceReferenceTrust: { summary: { undeclaredActiveReferenceCount: 0, historicalClassifiedCount: 5 } },
    sourceContractsSource: "sourceId: 'SRC-STRATEGY-QUARTER-001'\nsourceId: 'SRC-MYICRO-001'\nScoped, not connected",
    sourceContractCleanupDoc: 'SRC-STRATEGY-QUARTER-001\nSRC-MYICRO-001\nSRC-AGENT-SATISFACTION-001\nhistorical-alias',
    verifierConsolidationDoc: 'Consolidated Check Patterns\nMessage Rewrites\nSource Contract Trust has no undeclared active source IDs\nSystem Inventory shows all nine configured plugin surfaces\nFoundation pages, sub-surfaces, and critical API routes are mapped\nDashboard is serving the same code as the repo',
    kpiHealthSource,
    kpiHealthScriptSource: 'getKpiHealthSnapshot\nKPI_HEALTH_SUMMARY\nprocess.exitCode = 1',
    kpiSourceNote: 'Load-bearing tables\nLoad-bearing RPCs\nFreshness windows are per source\nLee repo/Supabase schema drift\nFoundation > Data Sources > APIs / Apps > KPI / Supabase Health',
    packageSource: '"backlog:hygiene"\nscripts/backlog-hygiene.mjs\nfoundation:verify',
    serverRouteSource: 'buildBacklogHygieneSnapshot\nbacklogHygiene',
    foundationFrontendSource,
    foundationHtmlSource: 'data-section="systems"',
    foundationUiSource: foundationFrontendSource,
    foundationDbWithBacklogSeedSource,
    foundationVerifySource: 'function ensureIncludesAll\nbuildSourceReferenceTrustStatus\nbuildCardReferenceTrustStatus',
    moduleSource,
    phaseCApprovalFilesPresent: PHASE_C_VISIBILITY_CARD_IDS.map(() => true),
    systemInventory: {
      docs: { tracked: ['a'], privateLocal: [] },
      skills: ['a'],
      plugins: REQUIRED_PLUGIN_NAMES.map(title => ({ title })),
    },
    currentPlan: 'KPI-HEALTH-001` v1 now probes',
    currentState,
    driveCorpusNote: 'Strategy Folder Operating Model\nquarterly evidence intake\nnot the canonical strategy\nStrategy Hub / Strategic Execution\nAction Router',
    ...overrides,
  }
}

export function buildFoundationSourceTrustVerifierDogfoodProof() {
  const healthy = evaluateFoundationSourceTrustVerifier(buildHealthySourceTrustContext())
  const missingConnector = evaluateFoundationSourceTrustVerifier(buildHealthySourceTrustContext({
    sourceOfTruth: {
      ...buildHealthySourceTrustContext().sourceOfTruth,
      connectors: REQUIRED_WORKING_CONNECTOR_IDS
        .filter(connectorId => connectorId !== 'CONN-CLICKUP-001')
        .map(connectorId => ({ connectorId, group: 'working' })),
    },
  }))
  const staleKpi = evaluateFoundationSourceTrustVerifier(buildHealthySourceTrustContext({
    sourceOfTruth: {
      ...buildHealthySourceTrustContext().sourceOfTruth,
      kpiHealth: { ...makeKpiHealthFixture(), tables: [] },
    },
  }))
  const missingReferenceTrust = evaluateFoundationSourceTrustVerifier(buildHealthySourceTrustContext({
    foundationHub: {
      ...buildHealthySourceTrustContext().foundationHub,
      cardReferenceTrust: { summary: { missingCardReferenceCount: 1, scannedFileCount: 1 } },
    },
    cardReferenceTrust: { summary: { missingCardReferenceCount: 1 } },
  }))
  const stalePhaseCoverage = evaluateFoundationSourceTrustVerifier(buildHealthySourceTrustContext({
    moduleSource: 'substring-only proof with no Phase C card IDs',
  }))

  return {
    ok: healthy.ok === true &&
      missingConnector.ok === false &&
      staleKpi.ok === false &&
      missingReferenceTrust.ok === false &&
      stalePhaseCoverage.ok === false,
    healthy,
    missingConnector,
    staleKpi,
    missingReferenceTrust,
    stalePhaseCoverage,
    invariant: 'Source-trust verifier accepts healthy source truth and rejects missing connector health, stale KPI health, missing reference trust, and substring-only Phase C coverage.',
  }
}
