export const VERIFIER_ROUTE_SPLIT_MODULE_CARD_ID = 'VERIFIER-MONOLITH-SPLIT-CONTINUE-001'
export const VERIFIER_ROUTE_SPLIT_MODULE_CLOSEOUT_KEY = 'verifier-route-split-module-v1'
export const VERIFIER_ROUTE_SPLIT_MODULE_PLAN_PATH = 'docs/process/verifier-monolith-split-continue-001-plan.md'
export const VERIFIER_ROUTE_SPLIT_MODULE_APPROVAL_PATH = 'docs/process/approvals/VERIFIER-MONOLITH-SPLIT-CONTINUE-001.json'
export const VERIFIER_ROUTE_SPLIT_MODULE_SCRIPT_PATH = 'scripts/process-verifier-route-split-module-check.mjs'
export const VERIFIER_ROUTE_SPLIT_MODULE_SPRINT_ID = 'verifier-route-split-module-2026-05-15'
export const VERIFIER_ROUTE_SPLIT_MODULE_BEFORE_LINES = 14977

export const FOUNDATION_ROUTE_SPLIT_DEFINITIONS = [
  {
    key: 'server',
    cardId: 'SERVER-ROUTE-SPLIT-001',
    closeoutKey: 'server-route-split-v1',
    scriptName: 'process:server-route-split-check',
    scriptPath: 'scripts/process-server-route-split-check.mjs',
    planPath: 'docs/process/server-route-split-001-plan.md',
    approvalPath: 'docs/process/approvals/SERVER-ROUTE-SPLIT-001.json',
    handoffPath: 'docs/handoffs/2026-05-15-server-route-split-closeout.md',
    sprintId: 'server-route-split-2026-05-15',
    moduleSourceKey: 'foundationOperatorRoutesSource',
    registerFunction: 'registerFoundationOperatorRoutes',
    serverDelegate: 'registerFoundationOperatorRoutes(app',
    routeMarkers: [
      '/api/foundation/changes',
      '/api/foundation/change-log',
      '/api/foundation/daily-summary',
      '/api/foundation/build-log',
      '/api/foundation/backlog/:cardId',
      '/api/foundation/doc-updates',
    ],
    oldInlineMarkers: [
      "app.get('/api/foundation/changes'",
      "app.get('/api/foundation/change-log'",
      "app.get('/api/foundation/daily-summary'",
      "app.get('/api/foundation/build-log'",
      "app.get('/api/foundation/backlog/:cardId'",
      "app.get('/api/foundation/doc-updates'",
    ],
    checkLabel: 'SERVER-ROUTE-SPLIT-001 extracts Foundation operator routes from server.js without behavior drift',
    planNeedle: 'focused proof script is read-only by default',
    detailLabel: 'operator',
  },
  {
    key: 'source',
    cardId: 'SOURCE-ROUTE-SPLIT-001',
    closeoutKey: 'source-route-split-v1',
    scriptName: 'process:source-route-split-check',
    scriptPath: 'scripts/process-source-route-split-check.mjs',
    planPath: 'docs/process/source-route-split-001-plan.md',
    approvalPath: 'docs/process/approvals/SOURCE-ROUTE-SPLIT-001.json',
    handoffPath: 'docs/handoffs/2026-05-15-source-route-split-closeout.md',
    sprintId: 'source-route-split-2026-05-15',
    moduleSourceKey: 'foundationSourceRoutesSource',
    registerFunction: 'registerFoundationSourceRoutes',
    serverDelegate: 'registerFoundationSourceRoutes(app',
    routeMarkers: [
      '/api/source-of-truth',
      '/api/foundation/source-lifecycle',
      '/api/foundation/marketing-source-map',
      '/api/foundation/brand-stack',
      '/api/foundation/tier-behavioral-completion',
      '/api/foundation/verification-runs',
      '/api/foundation/per-user-changelog',
      '/api/foundation/restricted-decision-queue',
      '/api/foundation/source-coverage-closeout',
      '/api/foundation/source-extraction-coverage',
      '/api/foundation/source-maturity-grid',
      '/api/foundation/source-connector-matrix',
      '/api/foundation/connector-credential-preflight',
      '/api/foundation/source-hub-routing-matrix',
    ],
    oldInlineMarkers: [
      "app.get('/api/source-of-truth'",
      "app.get('/api/foundation/source-lifecycle'",
      "app.get('/api/foundation/marketing-source-map'",
      "app.get('/api/foundation/brand-stack'",
      "app.get('/api/foundation/tier-behavioral-completion'",
      "app.get('/api/foundation/verification-runs'",
      "app.get('/api/foundation/per-user-changelog'",
      "app.get('/api/foundation/restricted-decision-queue'",
      "app.get('/api/foundation/source-coverage-closeout'",
      "app.get('/api/foundation/source-extraction-coverage'",
      "app.get('/api/foundation/source-maturity-grid'",
      "app.get('/api/foundation/source-connector-matrix'",
      "app.get('/api/foundation/connector-credential-preflight'",
      "app.get('/api/foundation/source-hub-routing-matrix'",
    ],
    checkLabel: 'SOURCE-ROUTE-SPLIT-001 extracts Foundation source/control routes from server.js without behavior drift',
    planNeedle: 'focused proof script is read-only',
    detailLabel: 'source/control',
  },
  {
    key: 'buildIntel',
    cardId: 'BUILD-INTEL-ROUTE-SPLIT-001',
    closeoutKey: 'build-intel-route-split-v1',
    scriptName: 'process:build-intel-route-split-check',
    scriptPath: 'scripts/process-build-intel-route-split-check.mjs',
    planPath: 'docs/process/build-intel-route-split-001-plan.md',
    approvalPath: 'docs/process/approvals/BUILD-INTEL-ROUTE-SPLIT-001.json',
    handoffPath: 'docs/handoffs/2026-05-15-build-intel-route-split-closeout.md',
    sprintId: 'build-intel-route-split-2026-05-15',
    moduleSourceKey: 'foundationBuildIntelRoutesSource',
    registerFunction: 'registerFoundationBuildIntelRoutes',
    serverDelegate: 'registerFoundationBuildIntelRoutes(app',
    routeMarkers: [
      '/api/foundation/build-intel-watchlist',
      '/api/foundation/multimodal-extractor-contract',
      '/api/foundation/research-inbox-contract',
      '/api/foundation/control-compression',
      '/api/foundation/implementation-intelligence',
      '/api/foundation/build-intel-extraction',
      '/api/foundation/gstack-build-intel',
    ],
    oldInlineMarkers: [
      "app.get('/api/foundation/build-intel-watchlist'",
      "app.get('/api/foundation/multimodal-extractor-contract'",
      "app.get('/api/foundation/research-inbox-contract'",
      "app.get('/api/foundation/control-compression'",
      "app.get('/api/foundation/implementation-intelligence'",
      "app.get('/api/foundation/build-intel-extraction'",
      "app.get('/api/foundation/gstack-build-intel'",
    ],
    checkLabel: 'BUILD-INTEL-ROUTE-SPLIT-001 extracts Foundation Build Intel read routes from server.js without behavior drift',
    planNeedle: 'focused proof script is read-only',
    detailLabel: 'Build Intel',
  },
]

function findCard(cards = [], cardId) {
  return (Array.isArray(cards) ? cards : []).find(card => card?.id === cardId) || null
}

function findCloseout(closeouts = [], closeoutKey) {
  return (Array.isArray(closeouts) ? closeouts : []).find(closeout => closeout?.key === closeoutKey) || null
}

function includesAll(text = '', needles = []) {
  return needles.every(needle => String(text || '').includes(needle))
}

function routeSplitPayloadOk(key, apis = {}) {
  if (key === 'server') {
    return Array.isArray(apis.foundationChangesApi?.changes) &&
      Array.isArray(apis.foundationBuildLog?.builds) &&
      (Array.isArray(apis.foundationChangeLog?.entries) || apis.foundationChangeLog?.generatedAt) &&
      (apis.foundationDailySummary?.generatedAt || apis.foundationDailySummary?.selectedDate || apis.foundationDailySummary?.summary) &&
      Array.isArray(apis.foundationDocUpdatesApi?.docUpdates) &&
      apis.foundationBacklogDetailEndpointRouteValidation?.ok === true
  }
  if (key === 'source') {
    return Array.isArray(apis.sourceOfTruth?.sources) &&
      Array.isArray(apis.foundationSourceLifecycle?.sources) &&
      Array.isArray(apis.foundationSourceMaturityGrid?.rows) &&
      Array.isArray(apis.foundationSourceExtractionCoverage?.rows) &&
      Array.isArray(apis.foundationSourceCoverageCloseout?.rows) &&
      apis.foundationMarketingSourceMap?.cardId === 'MARKETING-SOURCE-MAP-001' &&
      Boolean(apis.foundationBrandStack?.status) &&
      Boolean(apis.foundationTierBehavioralCompletion?.status) &&
      Boolean(apis.foundationVerificationRuns?.summary) &&
      Boolean(apis.foundationPerUserChangelog?.summary) &&
      Boolean(apis.foundationRestrictedDecisionQueue?.summary) &&
      Array.isArray(apis.foundationSourceConnectorMatrixApi?.rows) &&
      apis.foundationConnectorCredentialPreflightApi?.summary?.metadataOnly === true &&
      Array.isArray(apis.foundationSourceHubRoutingMatrixApi?.rows)
  }
  if (key === 'buildIntel') {
    return apis.foundationBuildIntelWatchlist?.cardId === 'CREATOR-WATCHLIST-001' &&
      apis.foundationMultimodalExtractorContract?.cardId === 'MULTIMODAL-EXTRACTOR-001' &&
      apis.foundationResearchInboxContract?.cardId === 'RESEARCH-INBOX-001' &&
      apis.foundationControlCompressionApi?.closeoutKey === 'foundation-control-backlog-compression-v1' &&
      apis.foundationImplementationIntelligenceApi?.closeoutKey === 'implementation-intelligence-v1' &&
      apis.foundationBuildIntelExtractionApi?.closeoutKey === 'build-intel-extraction-implementation-v1' &&
      apis.foundationGStackBuildIntelApi?.closeoutKey === 'gstack-build-intel-extraction-v1'
  }
  return false
}

function evaluateDefinition(definition, input = {}) {
  const card = findCard(input.cards, definition.cardId)
  const closeout = findCloseout(input.closeouts, definition.closeoutKey)
  const moduleSource = input.sources?.[definition.moduleSourceKey] || ''
  const serverSource = input.sources?.serverSource || ''
  const scriptSource = input.sources?.scriptSources?.[definition.cardId] || ''
  const planSource = input.sources?.planSources?.[definition.cardId] || ''
  const activeSprintAtOrPast = typeof input.activeSprintAtOrPast === 'function'
    ? input.activeSprintAtOrPast
    : () => false
  const ok = Boolean(
    card &&
      card.lane === 'done' &&
      String(card.statusNote || '').includes(definition.closeoutKey) &&
      closeout?.operatorCloseout === true &&
      (closeout.backlogIds || []).includes(definition.cardId) &&
      input.packageScripts?.[definition.scriptName] === `node --env-file-if-exists=.env ${definition.scriptPath}` &&
      input.repoFiles?.[definition.planPath] === true &&
      input.repoFiles?.[definition.approvalPath] === true &&
      input.repoFiles?.[definition.handoffPath] === true &&
      moduleSource.includes(definition.registerFunction) &&
      includesAll(moduleSource, definition.routeMarkers) &&
      serverSource.includes(definition.serverDelegate) &&
      definition.oldInlineMarkers.every(marker => !serverSource.includes(marker)) &&
      scriptSource.includes('fetchJsonMeasured') &&
      scriptSource.includes('scriptIsReadOnly') &&
      planSource.includes(definition.planNeedle) &&
      routeSplitPayloadOk(definition.key, input.apis) &&
      String(input.currentPlan || '').includes(definition.closeoutKey) &&
      String(input.currentState || '').includes(definition.closeoutKey) &&
      (input.activeSprintId === definition.sprintId || activeSprintAtOrPast([definition.cardId])) &&
      String(input.foundationVerifySource || '').includes(definition.cardId)
  )
  return {
    ok,
    check: definition.checkLabel,
    detail: card
      ? `lane=${card.lane} module=${moduleSource.includes(definition.registerFunction)} inlineGone=${definition.oldInlineMarkers.every(marker => !serverSource.includes(marker))}`
      : `missing ${definition.cardId}`,
    key: definition.key,
    cardId: definition.cardId,
  }
}

export function evaluateFoundationRouteSplitVerifier(input = {}) {
  const checks = FOUNDATION_ROUTE_SPLIT_DEFINITIONS.map(definition => evaluateDefinition(definition, input))
  return {
    ok: checks.every(check => check.ok),
    checks,
    summary: {
      total: checks.length,
      passed: checks.filter(check => check.ok).length,
      failedCardIds: checks.filter(check => !check.ok).map(check => check.cardId),
    },
  }
}

function healthySources() {
  return {
    serverSource: [
      'registerFoundationOperatorRoutes(app',
      'registerFoundationSourceRoutes(app',
      'registerFoundationBuildIntelRoutes(app',
    ].join(' '),
    foundationOperatorRoutesSource: `registerFoundationOperatorRoutes ${FOUNDATION_ROUTE_SPLIT_DEFINITIONS[0].routeMarkers.join(' ')}`,
    foundationSourceRoutesSource: `registerFoundationSourceRoutes ${FOUNDATION_ROUTE_SPLIT_DEFINITIONS[1].routeMarkers.join(' ')}`,
    foundationBuildIntelRoutesSource: `registerFoundationBuildIntelRoutes ${FOUNDATION_ROUTE_SPLIT_DEFINITIONS[2].routeMarkers.join(' ')}`,
    scriptSources: Object.fromEntries(FOUNDATION_ROUTE_SPLIT_DEFINITIONS.map(definition => [definition.cardId, 'fetchJsonMeasured scriptIsReadOnly'])),
    planSources: Object.fromEntries(FOUNDATION_ROUTE_SPLIT_DEFINITIONS.map(definition => [definition.cardId, definition.planNeedle])),
  }
}

function healthyApis() {
  return {
    foundationChangesApi: { changes: [] },
    foundationBuildLog: { builds: [] },
    foundationChangeLog: { generatedAt: 'synthetic' },
    foundationDailySummary: { generatedAt: 'synthetic' },
    foundationDocUpdatesApi: { docUpdates: [] },
    foundationBacklogDetailEndpointRouteValidation: { ok: true },
    sourceOfTruth: { sources: [] },
    foundationSourceLifecycle: { sources: [] },
    foundationSourceMaturityGrid: { rows: [] },
    foundationSourceExtractionCoverage: { rows: [] },
    foundationSourceCoverageCloseout: { rows: [] },
    foundationMarketingSourceMap: { cardId: 'MARKETING-SOURCE-MAP-001' },
    foundationBrandStack: { status: 'healthy' },
    foundationTierBehavioralCompletion: { status: 'healthy' },
    foundationVerificationRuns: { summary: {} },
    foundationPerUserChangelog: { summary: {} },
    foundationRestrictedDecisionQueue: { summary: {} },
    foundationSourceConnectorMatrixApi: { rows: [] },
    foundationConnectorCredentialPreflightApi: { summary: { metadataOnly: true } },
    foundationSourceHubRoutingMatrixApi: { rows: [] },
    foundationBuildIntelWatchlist: { cardId: 'CREATOR-WATCHLIST-001' },
    foundationMultimodalExtractorContract: { cardId: 'MULTIMODAL-EXTRACTOR-001' },
    foundationResearchInboxContract: { cardId: 'RESEARCH-INBOX-001' },
    foundationControlCompressionApi: { closeoutKey: 'foundation-control-backlog-compression-v1' },
    foundationImplementationIntelligenceApi: { closeoutKey: 'implementation-intelligence-v1' },
    foundationBuildIntelExtractionApi: { closeoutKey: 'build-intel-extraction-implementation-v1' },
    foundationGStackBuildIntelApi: { closeoutKey: 'gstack-build-intel-extraction-v1' },
  }
}

function buildSyntheticInput(overrides = {}) {
  const cards = FOUNDATION_ROUTE_SPLIT_DEFINITIONS.map(definition => ({
    id: definition.cardId,
    lane: 'done',
    statusNote: `Closed under ${definition.closeoutKey}.`,
  }))
  const closeouts = FOUNDATION_ROUTE_SPLIT_DEFINITIONS.map(definition => ({
    key: definition.closeoutKey,
    operatorCloseout: true,
    backlogIds: [definition.cardId],
  }))
  const packageScripts = Object.fromEntries(FOUNDATION_ROUTE_SPLIT_DEFINITIONS.map(definition => [
    definition.scriptName,
    `node --env-file-if-exists=.env ${definition.scriptPath}`,
  ]))
  const repoFiles = Object.fromEntries(FOUNDATION_ROUTE_SPLIT_DEFINITIONS.flatMap(definition => [
    [definition.planPath, true],
    [definition.approvalPath, true],
    [definition.handoffPath, true],
  ]))
  return {
    cards,
    closeouts,
    packageScripts,
    repoFiles,
    sources: healthySources(),
    apis: healthyApis(),
    currentPlan: FOUNDATION_ROUTE_SPLIT_DEFINITIONS.map(definition => definition.closeoutKey).join(' '),
    currentState: FOUNDATION_ROUTE_SPLIT_DEFINITIONS.map(definition => definition.closeoutKey).join(' '),
    activeSprintId: 'synthetic-different-sprint',
    activeSprintAtOrPast: cardIds => FOUNDATION_ROUTE_SPLIT_DEFINITIONS.some(definition => cardIds.includes(definition.cardId)),
    foundationVerifySource: FOUNDATION_ROUTE_SPLIT_DEFINITIONS.map(definition => definition.cardId).join(' '),
    ...overrides,
  }
}

export function buildFoundationRouteSplitVerifierDogfoodProof() {
  const passing = evaluateFoundationRouteSplitVerifier(buildSyntheticInput())
  const oldInlineStillPresent = evaluateFoundationRouteSplitVerifier(buildSyntheticInput({
    sources: {
      ...healthySources(),
      serverSource: `${healthySources().serverSource} app.get('/api/foundation/changes'`,
    },
  }))
  const missingModuleRouteMarker = evaluateFoundationRouteSplitVerifier(buildSyntheticInput({
    sources: {
      ...healthySources(),
      foundationBuildIntelRoutesSource: 'registerFoundationBuildIntelRoutes /api/foundation/build-intel-watchlist',
    },
  }))
  const wrongBuildIntelPayload = evaluateFoundationRouteSplitVerifier(buildSyntheticInput({
    apis: {
      ...healthyApis(),
      foundationBuildIntelWatchlist: { cardId: 'WRONG-CARD-001' },
    },
  }))
  const missingCloseoutOwnership = evaluateFoundationRouteSplitVerifier(buildSyntheticInput({
    closeouts: [],
  }))

  return {
    ok: passing.ok === true &&
      oldInlineStillPresent.checks.find(check => check.cardId === 'SERVER-ROUTE-SPLIT-001')?.ok === false &&
      missingModuleRouteMarker.checks.find(check => check.cardId === 'BUILD-INTEL-ROUTE-SPLIT-001')?.ok === false &&
      wrongBuildIntelPayload.checks.find(check => check.cardId === 'BUILD-INTEL-ROUTE-SPLIT-001')?.ok === false &&
      missingCloseoutOwnership.ok === false,
    passing,
    oldInlineStillPresent,
    missingModuleRouteMarker,
    wrongBuildIntelPayload,
    missingCloseoutOwnership,
    invariant: 'Route-split verifier module accepts healthy split fixtures and rejects old inline routes, missing module ownership, wrong payloads, and missing closeout ownership.',
  }
}
