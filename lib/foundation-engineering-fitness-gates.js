import {
  FOUNDATION_BACKLOG_LIST_ENDPOINT_BUDGET_BYTES,
  FOUNDATION_BACKLOG_LIST_ENDPOINT_PATH,
  FOUNDATION_BACKLOG_LIST_ENDPOINT_VERSION,
  FOUNDATION_BACKLOG_LIST_ENDPOINT_BUDGET_MS,
  FOUNDATION_BACKLOG_DONE_ARCHIVE_ENDPOINT_PATH,
  validateFoundationBacklogListPayload,
} from './foundation-backlog-detail.js'
import {
  FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_APPROVAL_PATH,
  FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CARD_ID,
  FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CLOSEOUT_KEY,
  FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CLOSEOUT_PATH,
  FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_PLAN_PATH,
  buildFoundationBacklogDoneArchiveDogfoodProof,
  evaluateFoundationBacklogDoneArchiveLazyLoad,
} from './foundation-backlog-done-archive-lazy-load.js'
import {
  buildBuildLaneExistingWorkCheck,
  classifyShipGateFanoutSync,
  evaluateCurrentSprintSurfaceAlignment,
  evaluateVerifyLoopEfficiency,
  validateBuildLaneCardScaffold,
  validateBuildLaneSprintItemMetadata,
} from './build-lane-reliability.js'
import {
  FOUNDATION_HUB_PAYLOAD_BUDGET_V2_FULL_ONLY_KEYS,
  FOUNDATION_HUB_PAYLOAD_BUDGET_V2_SUMMARY_BUDGET,
  evaluateFoundationHubPayloadBudgetV2,
  summarizeFoundationHubPayloadBudgetV2Sections,
} from './foundation-hub-payload-budget-v2.js'

export const FOUNDATION_ENGINEERING_FITNESS_GATES_CARD_ID = 'FOUNDATION-ENGINEERING-FITNESS-GATES-001'
export const FOUNDATION_SURFACE_AND_API_BUDGETS_CARD_ID = 'FOUNDATION-SURFACE-AND-API-BUDGETS-001'
export const FOUNDATION_HUB_DECOMPOSITION_GUARD_CARD_ID = 'FOUNDATION-HUB-DECOMPOSITION-GUARD-001'
export const FOUNDATION_LAZY_SURFACE_LOADING_CARD_ID = 'FOUNDATION-LAZY-SURFACE-LOADING-001'
export const FOUNDATION_LAZY_SURFACE_LOADING_SPRINT_ID = 'foundation-lazy-surface-loading-2026-05-17'
export const FOUNDATION_LAZY_SURFACE_LOADING_CLOSEOUT_KEY = 'foundation-lazy-surface-loading-v1'
export const FOUNDATION_LAZY_SURFACE_LOADING_PLAN_PATH = 'docs/process/foundation-lazy-surface-loading-001-plan.md'
export const FOUNDATION_LAZY_SURFACE_LOADING_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-LAZY-SURFACE-LOADING-001.json'
export const FOUNDATION_LAZY_SURFACE_LOADING_SCRIPT_PATH = 'scripts/process-foundation-lazy-surface-loading-check.mjs'
export const FOUNDATION_LAZY_SURFACE_LOADING_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-foundation-lazy-surface-loading-closeout.md'
export const FOUNDATION_ENGINEERING_FITNESS_GATES_SPRINT_ID = 'foundation-engineering-fitness-gates-2026-05-17'
export const FOUNDATION_ENGINEERING_FITNESS_GATES_CLOSEOUT_KEY = 'foundation-engineering-fitness-gates-v1'
export const FOUNDATION_ENGINEERING_FITNESS_GATES_PLAN_PATH = 'docs/process/foundation-engineering-fitness-gates-001-plan.md'
export const FOUNDATION_ENGINEERING_FITNESS_GATES_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-ENGINEERING-FITNESS-GATES-001.json'
export const FOUNDATION_ENGINEERING_FITNESS_GATES_SCRIPT_PATH = 'scripts/process-foundation-engineering-fitness-gates-check.mjs'
export const FOUNDATION_ENGINEERING_FITNESS_GATES_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-foundation-engineering-fitness-gates-closeout.md'

export const FOUNDATION_ENGINEERING_FITNESS_DONE_CARD_IDS = [
  FOUNDATION_ENGINEERING_FITNESS_GATES_CARD_ID,
  FOUNDATION_SURFACE_AND_API_BUDGETS_CARD_ID,
  FOUNDATION_HUB_DECOMPOSITION_GUARD_CARD_ID,
]

export const FOUNDATION_ENGINEERING_FITNESS_SCOPE_CARD_IDS = [
  ...FOUNDATION_ENGINEERING_FITNESS_DONE_CARD_IDS,
  FOUNDATION_LAZY_SURFACE_LOADING_CARD_ID,
]

export const FOUNDATION_ENGINEERING_FITNESS_NOT_NEXT_BOUNDARIES = [
  'No extractor work or extraction runtime implementation.',
  'No connector work, OAuth work, auth-required extraction, or live connector calls.',
  'No Harlan, Fal, voice, Canva, OpenHuman, hub feature work, or broad visual UI redesign.',
  'Do not rerun the live Agent Feedback auto-send job.',
  'Do not work MEETING-VAULT-ACL-001 Phase B from this sprint.',
  'Do not mutate Google Drive permissions.',
]

export const FOUNDATION_ENGINEERING_FITNESS_PROOF_COMMANDS = [
  'npm run process:foundation-engineering-fitness-gates-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  `npm run process:foundation-ship -- --card=${FOUNDATION_ENGINEERING_FITNESS_GATES_CARD_ID} --planApprovalRef=${FOUNDATION_ENGINEERING_FITNESS_GATES_APPROVAL_PATH} --closeoutKey=${FOUNDATION_ENGINEERING_FITNESS_GATES_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const FOUNDATION_LAZY_SURFACE_LOADING_PROOF_COMMANDS = [
  'npm run process:foundation-lazy-surface-loading-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  `npm run process:foundation-ship -- --card=${FOUNDATION_LAZY_SURFACE_LOADING_CARD_ID} --planApprovalRef=${FOUNDATION_LAZY_SURFACE_LOADING_APPROVAL_PATH} --closeoutKey=${FOUNDATION_LAZY_SURFACE_LOADING_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const FOUNDATION_ENGINEERING_FITNESS_CHANGED_FILES = [
  'lib/foundation-engineering-fitness-gates.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'lib/foundation-build-closeout-cleanup-records.js',
  'scripts/foundation-verify.mjs',
  FOUNDATION_ENGINEERING_FITNESS_GATES_SCRIPT_PATH,
  'package.json',
  FOUNDATION_ENGINEERING_FITNESS_GATES_PLAN_PATH,
  FOUNDATION_ENGINEERING_FITNESS_GATES_APPROVAL_PATH,
  FOUNDATION_ENGINEERING_FITNESS_GATES_CLOSEOUT_PATH,
]

export const FOUNDATION_LAZY_SURFACE_LOADING_CHANGED_FILES = [
  'lib/foundation-backlog-detail.js',
  'lib/foundation-current-sprint-verifier.js',
  'lib/foundation-operator-routes.js',
  'lib/foundation-engineering-fitness-gates.js',
  'public/foundation-data.js',
  'public/foundation.js',
  'public/foundation-operations-renderers.js',
  'server.js',
  'lib/security-access.js',
  'scripts/foundation-verify.mjs',
  FOUNDATION_LAZY_SURFACE_LOADING_SCRIPT_PATH,
  'package.json',
  FOUNDATION_LAZY_SURFACE_LOADING_PLAN_PATH,
  FOUNDATION_LAZY_SURFACE_LOADING_APPROVAL_PATH,
  FOUNDATION_LAZY_SURFACE_LOADING_CLOSEOUT_PATH,
]

export const FOUNDATION_ENGINEERING_FILE_STANDARDS = Object.freeze({
  preferredHandwrittenLines: 1500,
  watchHandwrittenLines: 1500,
  reviewHandwrittenLines: 3000,
  splitRequiredLines: 5000,
  dangerLines: 10000,
})

export const FOUNDATION_SURFACE_API_BUDGETS = Object.freeze({
  defaultApiMaxPayloadBytes: FOUNDATION_HUB_PAYLOAD_BUDGET_V2_SUMMARY_BUDGET.maxPayloadBytes,
  defaultApiMinHeadroomBytes: FOUNDATION_HUB_PAYLOAD_BUDGET_V2_SUMMARY_BUDGET.minHeadroomBytes,
  defaultApiMaxDurationMs: FOUNDATION_HUB_PAYLOAD_BUDGET_V2_SUMMARY_BUDGET.maxDurationMs,
  diagnosticApiMaxPayloadBytes: 4_200_000,
  diagnosticApiMaxDurationMs: 15_000,
  maxInitialSurfaceRoutes: 4,
  maxDefaultSectionBytes: 500_000,
})

export const FOUNDATION_AGENT_ROUTE_USAGE = Object.freeze({
  currentSprint: '/api/foundation/current-sprint',
  recentBuilds: '/api/foundation/build-log',
  sourceContracts: '/api/source-of-truth',
  sourceLifecycle: '/api/foundation/source-lifecycle',
  backlogList: FOUNDATION_BACKLOG_LIST_ENDPOINT_PATH,
  backlogDetail: '/api/foundation/backlog/:cardId',
  defaultHub: '/api/foundation-hub',
  fullDiagnostics: '/api/foundation-hub?view=full',
})

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function byteLengthJson(value) {
  return Buffer.byteLength(JSON.stringify(value), 'utf8')
}

function addFinding(findings, ok, code, detail = '', severity = 'risk') {
  if (ok) return
  findings.push({ code, detail, severity })
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function includesAll(source = '', needles = []) {
  return needles.every(needle => String(source || '').includes(needle))
}

function classifyHandwrittenFile(lineCount = 0) {
  const lines = Number(lineCount) || 0
  if (lines > FOUNDATION_ENGINEERING_FILE_STANDARDS.dangerLines) return 'danger'
  if (lines > FOUNDATION_ENGINEERING_FILE_STANDARDS.splitRequiredLines) return 'split_required'
  if (lines > FOUNDATION_ENGINEERING_FILE_STANDARDS.reviewHandwrittenLines) return 'review'
  if (lines > FOUNDATION_ENGINEERING_FILE_STANDARDS.watchHandwrittenLines) return 'watch'
  return 'healthy'
}

export function buildEngineeringFitnessExistingWorkCheck(overrides = {}) {
  return {
    ...buildBuildLaneExistingWorkCheck({
      existingCode: 'Reuse build-lane reliability validators, Foundation Hub payload budget V2, endpoint budgets, Current Sprint truth, Plan Critic, and process ship gates.',
      existingDocs: 'Reuse the build-lane reliability closeout, main-chat engineering standards checkpoint, file-size standard, and payload budget V2 closeout.',
      existingScripts: 'Reuse focused proof posture, backlog hygiene, foundation:verify, process:foundation-ship, and verifier coverage constants.',
      existingPolicy: 'Foundation standards must cover files, APIs, page loading, agent routes, verification loops, build artifacts, and runtime truth before extractor work.',
      reused: 'Existing live backlog cards, DB-backed Current Sprint overlay, payload budget V2, and build-lane reliability dogfood patterns.',
      notRebuilt: 'No extractor runtime, connector auth, new UI visual design, second backlog, or replacement verifier framework.',
      exactGap: 'Foundation standards exist in pieces; one executable engineering fitness gate must catch page/API monoliths and build-lane drift before more systems build on them.',
      overBroadRisk: 'Could drift into extraction, connector auth, visual UI redesign, hub features, or route rewrites.',
      readyBy: 'Steve explicitly approved FOUNDATION-ENGINEERING-FITNESS-GATES-001 after build-lane reliability shipped.',
      readyAt: '2026-05-17T16:10:00-04:00',
    }),
    ...overrides,
  }
}

export function buildLazySurfaceLoadingExistingWorkCheck(overrides = {}) {
  return {
    ...buildBuildLaneExistingWorkCheck({
      existingCode: 'Reuse Foundation Hub payload budget V2, Current Sprint route, Recent Work build-log route, Source of Truth route, backlog detail route, and engineering fitness loading contracts.',
      existingDocs: 'Reuse the engineering fitness closeout and standards checkpoint; do not redesign the Foundation UI.',
      existingScripts: 'Reuse focused proof posture, backlog hygiene, foundation:verify, and process:foundation-ship.',
      existingPolicy: 'Foundation shell and menu should not fetch broad detail payloads before the operator opens a detail surface.',
      reused: 'Existing DB-backed backlog rows, /api/foundation/current-sprint, /api/foundation/build-log, /api/source-of-truth, and full diagnostics route.',
      notRebuilt: 'No extractor runtime, connector auth, visual redesign, Harlan, Fal, voice, Canva, OpenHuman, Drive mutation, or Agent Feedback auto-send.',
      exactGap: 'Backlog lacked a read-only list route and Recent Work/Backlog still used the default Foundation Hub as a detail side channel.',
      overBroadRisk: 'Could drift into UI redesign, Hub payload hiding, extractor work, or connector work.',
      readyBy: 'Steve approved lazy surface loading after engineering fitness gates showed Foundation still had loading slowness/fatness.',
      readyAt: '2026-05-17T16:45:00-04:00',
    }),
    ...overrides,
  }
}

export function evaluateEngineeringFileFitness(files = []) {
  const rows = list(files).map(file => {
    const kind = text(file.kind || 'handwritten')
    const lineCount = Number(file.lineCount ?? file.lines ?? 0)
    const explicitBudgetLines = Number(file.explicitBudgetLines || 0)
    const splitPlan = Boolean(file.splitPlan)
    const generatedNeedsBudget = ['generated', 'data', 'report'].includes(kind)
    const status = generatedNeedsBudget
      ? !explicitBudgetLines ? 'explicit_budget_missing' : lineCount > explicitBudgetLines ? 'budget_exceeded' : 'healthy'
      : classifyHandwrittenFile(lineCount)
    const ok = generatedNeedsBudget
      ? status === 'healthy'
      : !['split_required', 'danger'].includes(status) && (status !== 'review' || splitPlan || !file.addsLines)
    return {
      path: text(file.path),
      kind,
      lineCount,
      explicitBudgetLines: explicitBudgetLines || null,
      splitPlan,
      addsLines: Boolean(file.addsLines),
      status,
      ok,
    }
  })
  const findings = []
  for (const row of rows) {
    addFinding(findings, row.ok, `file_${row.status}`, `${row.path}:${row.lineCount} lines`, ['review', 'watch'].includes(row.status) ? 'warning' : 'risk')
  }
  return {
    ok: findings.filter(finding => finding.severity === 'risk').length === 0,
    rows,
    findings,
    standards: FOUNDATION_ENGINEERING_FILE_STANDARDS,
  }
}

export function evaluateFoundationSurfaceAndApiBudgets(routes = []) {
  const rows = list(routes).map(route => {
    const routePath = text(route.route)
    const kind = text(route.kind || 'default')
    const payloadBytes = Number(route.payloadBytes || 0)
    const durationMs = Number(route.durationMs || 0)
    const topSections = list(route.topSections)
    const maxPayloadBytes = kind === 'diagnostic'
      ? FOUNDATION_SURFACE_API_BUDGETS.diagnosticApiMaxPayloadBytes
      : kind === 'default'
        ? FOUNDATION_SURFACE_API_BUDGETS.defaultApiMaxPayloadBytes
        : Number(route.maxPayloadBytes || FOUNDATION_SURFACE_API_BUDGETS.defaultApiMaxPayloadBytes)
    const maxDurationMs = kind === 'diagnostic'
      ? FOUNDATION_SURFACE_API_BUDGETS.diagnosticApiMaxDurationMs
      : kind === 'default'
        ? FOUNDATION_SURFACE_API_BUDGETS.defaultApiMaxDurationMs
        : Number(route.maxDurationMs || FOUNDATION_SURFACE_API_BUDGETS.defaultApiMaxDurationMs)
    const ok = payloadBytes <= maxPayloadBytes && durationMs <= maxDurationMs
    return {
      route: routePath,
      kind,
      payloadBytes,
      durationMs,
      maxPayloadBytes,
      maxDurationMs,
      topSections,
      ok,
    }
  })
  const findings = rows
    .filter(row => !row.ok)
    .map(row => ({
      code: 'route_budget_exceeded',
      route: row.route,
      detail: `${row.payloadBytes}B/${row.durationMs}ms exceeds ${row.maxPayloadBytes}B/${row.maxDurationMs}ms`,
      topSections: row.topSections,
      severity: 'risk',
    }))
  return {
    ok: findings.length === 0,
    rows,
    findings,
    budgets: FOUNDATION_SURFACE_API_BUDGETS,
  }
}

export function evaluateFoundationHubDecomposition({
  defaultHubPayload = {},
  defaultDurationMs = defaultHubPayload?.foundationHubPerformance?.durationMs || 0,
  defaultPayloadBytes = defaultHubPayload?.foundationHubPerformance?.payloadBytes || byteLengthJson(defaultHubPayload),
  fullDiagnosticsPayload = {},
  fullDiagnosticsDurationMs = fullDiagnosticsPayload?.foundationHubPerformance?.durationMs || 0,
  fullDiagnosticsPayloadBytes = fullDiagnosticsPayload?.foundationHubPerformance?.payloadBytes || byteLengthJson(fullDiagnosticsPayload),
  dedicatedRoutes = [],
} = {}) {
  const defaultBudget = evaluateFoundationHubPayloadBudgetV2({
    payload: defaultHubPayload,
    durationMs: defaultDurationMs,
    payloadBytes: defaultPayloadBytes,
  })
  const fullOnlyPresent = FOUNDATION_HUB_PAYLOAD_BUDGET_V2_FULL_ONLY_KEYS.filter(key =>
    Object.prototype.hasOwnProperty.call(defaultHubPayload || {}, key)
  )
  const routeSet = new Set(list(dedicatedRoutes).map(route => text(route)))
  const requiredRoutes = Object.values(FOUNDATION_AGENT_ROUTE_USAGE)
  const missingRoutes = requiredRoutes.filter(route => !routeSet.has(route))
  const fullDiagnosticsOk = fullDiagnosticsPayloadBytes <= FOUNDATION_SURFACE_API_BUDGETS.diagnosticApiMaxPayloadBytes &&
    fullDiagnosticsDurationMs <= FOUNDATION_SURFACE_API_BUDGETS.diagnosticApiMaxDurationMs
  const oversizedSections = summarizeFoundationHubPayloadBudgetV2Sections(defaultHubPayload)
    .filter(section => Number(section.bytes || 0) > FOUNDATION_SURFACE_API_BUDGETS.maxDefaultSectionBytes)
  const findings = []
  addFinding(findings, defaultBudget.ok, 'default_hub_budget_failed', defaultBudget.plainEnglish, 'risk')
  addFinding(findings, fullOnlyPresent.length === 0, 'full_only_keys_in_default_hub', fullOnlyPresent.join(', '), 'risk')
  addFinding(findings, missingRoutes.length === 0, 'missing_dedicated_routes', missingRoutes.join(', '), 'risk')
  addFinding(findings, fullDiagnosticsOk, 'full_diagnostics_budget_failed', `${fullDiagnosticsPayloadBytes}B/${fullDiagnosticsDurationMs}ms`, 'risk')
  addFinding(findings, oversizedSections.length === 0, 'default_hub_section_over_budget', JSON.stringify(oversizedSections), 'risk')
  return {
    ok: findings.length === 0,
    defaultBudget,
    fullDiagnostics: {
      payloadBytes: fullDiagnosticsPayloadBytes,
      durationMs: fullDiagnosticsDurationMs,
      ok: fullDiagnosticsOk,
    },
    requiredRoutes,
    missingRoutes,
    oversizedSections,
    findings,
  }
}

function functionBlock(source = '', functionName = '') {
  const marker = `function ${functionName}(`
  const start = String(source || '').indexOf(marker)
  if (start < 0) return ''
  const rest = String(source || '').slice(start)
  const next = rest.slice(marker.length).search(/\nfunction\s+[A-Za-z0-9_]+\s*\(/)
  return next < 0 ? rest : rest.slice(0, marker.length + next)
}

export function evaluateFoundationLazySurfaceRouteLoadingArchitecture({
  publicDataSource = '',
  foundationSource = '',
  operationsRendererSource = '',
  operatorRoutesSource = '',
  backlogModuleSource = '',
  packageJson = {},
  routePayloads = {},
  defaultHubPayload = {},
  fullDiagnosticsPayload = {},
} = {}) {
  const findings = []
  const backlogRender = functionBlock(foundationSource, 'renderBacklog')
  const buildLogRender = functionBlock(operationsRendererSource, 'renderBuildLog')
  const sourceRegistryRender = functionBlock(foundationSource, 'renderSourceRegistry')
  const dataHealthRender = functionBlock(operationsRendererSource, 'renderDataHealth')
  const add = (ok, code, detail, severity = 'risk') => addFinding(findings, ok, code, detail, severity)
  const backlogValidation = validateFoundationBacklogListPayload(routePayloads.backlog || {})
  const defaultBudget = evaluateFoundationHubPayloadBudgetV2({
    payload: defaultHubPayload,
    durationMs: defaultHubPayload?.foundationHubPerformance?.durationMs || 0,
    payloadBytes: defaultHubPayload?.foundationHubPerformance?.payloadBytes || byteLengthJson(defaultHubPayload),
  })
  const backlogBytes = byteLengthJson(routePayloads.backlog || {})
  const backlogMs = Number(routePayloads.backlogDurationMs || 0)
  const defaultBacklogCount = list(defaultHubPayload.backlogItems).length

  add(publicDataSource.includes('function fetchFoundationBacklog') && publicDataSource.includes(FOUNDATION_BACKLOG_LIST_ENDPOINT_PATH), 'missing_backlog_fetch_helper', 'public/foundation-data.js must expose the backlog list route')
  add(publicDataSource.includes('function fetchFoundationCurrentSprint()') && publicDataSource.includes('/api/foundation/current-sprint'), 'missing_current_sprint_fetch_helper', 'Recent Work must use the Current Sprint route directly')
  add(operatorRoutesSource.includes("app.get('/api/foundation/backlog'") && operatorRoutesSource.includes('buildFoundationBacklogListPayload'), 'missing_backlog_list_route', 'operator routes must own GET /api/foundation/backlog')
  add(backlogModuleSource.includes(FOUNDATION_BACKLOG_LIST_ENDPOINT_VERSION) && backlogModuleSource.includes('validateFoundationBacklogListPayload'), 'missing_backlog_list_contract', 'backlog list contract/version/validator must be durable')
  add(backlogRender.includes('fetchFoundationBacklog()') && !backlogRender.includes('fetchFoundationHub()'), 'backlog_still_uses_broad_hub', 'Backlog render must fetch the backlog route, not default Hub')
  add(buildLogRender.includes('fetchFoundationBuildLog()') && buildLogRender.includes('fetchFoundationCurrentSprint()') && !buildLogRender.includes('fetchFoundationHub()'), 'recent_work_still_uses_broad_hub', 'Recent Work must fetch build-log and current-sprint narrow routes')
  add(sourceRegistryRender.includes('fetchSourceOfTruth()') && !sourceRegistryRender.includes('fetchFoundationHub()'), 'source_registry_not_narrow', 'Source Registry must use source-of-truth route')
  add(dataHealthRender.includes('fetchFoundationHubFull()') && !dataHealthRender.includes('fetchFoundationHub()'), 'system_health_not_diagnostic_route', 'System Health/Diagnostics must use explicit full diagnostics route')
  add(backlogValidation.ok, 'backlog_list_payload_invalid', backlogValidation.failures.join('; ') || 'payload ok')
  add(backlogBytes <= FOUNDATION_BACKLOG_LIST_ENDPOINT_BUDGET_BYTES && backlogMs <= FOUNDATION_BACKLOG_LIST_ENDPOINT_BUDGET_MS, 'backlog_route_budget_failed', `${backlogBytes}B/${backlogMs}ms`)
  add(defaultBacklogCount === 0 || backlogValidation.totalItems === defaultBacklogCount, 'backlog_route_row_drift', `route=${backlogValidation.totalItems} hub=${defaultBacklogCount}`)
  add(defaultBudget.ok, 'default_hub_budget_failed', defaultBudget.plainEnglish)
  add(fullDiagnosticsPayload?.foundationHubView?.mode === 'full', 'full_diagnostics_not_explicit', 'full diagnostics route must stay explicit')
  add(Array.isArray(routePayloads.buildLog?.builds), 'build_log_route_missing', '/api/foundation/build-log must return builds')
  add(Array.isArray(routePayloads.currentSprint?.items) && routePayloads.currentSprint?.currentSprint, 'current_sprint_route_missing', '/api/foundation/current-sprint must return item truth')
  add(routePayloads.sourceOfTruth && typeof routePayloads.sourceOfTruth === 'object', 'source_registry_route_missing', '/api/source-of-truth must return source contract truth')
  add(packageJson.scripts?.['process:foundation-lazy-surface-loading-check'] === `node --env-file-if-exists=.env ${FOUNDATION_LAZY_SURFACE_LOADING_SCRIPT_PATH}`, 'focused_proof_not_registered', 'package.json script missing')

  return {
    ok: findings.filter(finding => finding.severity === 'risk').length === 0,
    findings,
    summary: {
      backlogBytes,
      backlogMs,
      backlogItems: backlogValidation.totalItems,
      defaultHubBytes: defaultBudget.measured.payloadBytes,
    },
  }
}

export function buildFoundationLazySurfaceLoadingDogfoodProof() {
  const goodPayloads = {
    backlog: {
      ok: true,
      status: 'healthy',
      contractVersion: FOUNDATION_BACKLOG_LIST_ENDPOINT_VERSION,
      summary: { totalItems: 1, visibleItems: 1, doneItems: 0, activeItems: 1, archivedDoneItems: 0 },
      meta: { backlogScopes: [{ key: 'foundation' }], backlogIdPrefixes: ['FOUNDATION'] },
      backlogItems: [{ id: 'FOUNDATION-LAZY-SURFACE-LOADING-001', title: 'Lazy', lane: 'scoped' }],
      doneArchive: { route: FOUNDATION_BACKLOG_DONE_ARCHIVE_ENDPOINT_PATH, available: false },
      reviewInbox: { route: '/api/foundation/action-route-review-inbox', available: false },
    },
    buildLog: { builds: [] },
    currentSprint: { items: [], currentSprint: {} },
    sourceOfTruth: { sources: [] },
  }
  const common = {
    publicDataSource: `function fetchFoundationBacklog(){return foundationRead('${FOUNDATION_BACKLOG_LIST_ENDPOINT_PATH}')} function fetchFoundationCurrentSprint(){return foundationRead('/api/foundation/current-sprint')}`,
    foundationSource: 'function renderBacklog(){ fetchFoundationBacklog() }\nfunction renderSourceRegistry(){ fetchSourceOfTruth() }',
    operationsRendererSource: 'function renderBuildLog(){ fetchFoundationBuildLog(); fetchFoundationCurrentSprint() }\nfunction renderDataHealth(){ fetchFoundationHubFull() }',
    operatorRoutesSource: "app.get('/api/foundation/backlog', requireAdminToken, () => buildFoundationBacklogListPayload())",
    backlogModuleSource: `${FOUNDATION_BACKLOG_LIST_ENDPOINT_VERSION} validateFoundationBacklogListPayload`,
    packageJson: { scripts: { 'process:foundation-lazy-surface-loading-check': `node --env-file-if-exists=.env ${FOUNDATION_LAZY_SURFACE_LOADING_SCRIPT_PATH}` } },
    routePayloads: goodPayloads,
    defaultHubPayload: {
      backlogItems: goodPayloads.backlog.backlogItems,
      backlogContract: { contractVersion: 'foundation-hub-backlog.contract.v1', totalItems: 1, defaultItemCount: 1, fullPayloadCompacted: true },
      foundationJobs: { fullPayloadCompacted: true },
      foundation1100Review: { fullPayloadCompacted: true },
      researchCuration: { fullPayloadCompacted: true },
      foundationHubPerformance: { payloadBytes: 1000, durationMs: 10 },
    },
    fullDiagnosticsPayload: { foundationHubView: { mode: 'full' }, foundationHubPerformance: { payloadBytes: 1000, durationMs: 10 } },
  }
  const valid = evaluateFoundationLazySurfaceRouteLoadingArchitecture(common)
  const allInOneBacklog = evaluateFoundationLazySurfaceRouteLoadingArchitecture({
    ...common,
    foundationSource: 'function renderBacklog(){ fetchFoundationHub() }\nfunction renderSourceRegistry(){ fetchSourceOfTruth() }',
  })
  const allInOneRecentWork = evaluateFoundationLazySurfaceRouteLoadingArchitecture({
    ...common,
    operationsRendererSource: 'function renderBuildLog(){ fetchFoundationBuildLog(); fetchFoundationHub() }\nfunction renderDataHealth(){ fetchFoundationHubFull() }',
  })
  const missingRoute = evaluateFoundationLazySurfaceRouteLoadingArchitecture({
    ...common,
    operatorRoutesSource: '',
  })
  return {
    ok: valid.ok && !allInOneBacklog.ok && !allInOneRecentWork.ok && !missingRoute.ok,
    valid,
    allInOneBacklog,
    allInOneRecentWork,
    missingRoute,
    invariant: 'Narrow backlog/current-sprint route ownership passes; broad Hub reuse and missing backlog route fail.',
  }
}

export function evaluateFoundationLazySurfaceLoadingArchitecture({
  initialLoadRoutes = [],
  surfaceRouteMap = {},
} = {}) {
  const initial = list(initialLoadRoutes).map(text)
  const fullDiagnosticsOnInitial = initial.includes(FOUNDATION_AGENT_ROUTE_USAGE.fullDiagnostics)
  const detailRoutes = Object.values(FOUNDATION_AGENT_ROUTE_USAGE)
    .filter(route => route !== FOUNDATION_AGENT_ROUTE_USAGE.defaultHub)
  const detailRoutesOnInitial = detailRoutes.filter(route => initial.includes(route))
  const missingSurfaceRoutes = Object.entries(surfaceRouteMap || {})
    .filter(([, route]) => !text(route))
    .map(([surface]) => surface)
  const allInOneInitial = detailRoutesOnInitial.length >= 3 || initial.length > FOUNDATION_SURFACE_API_BUDGETS.maxInitialSurfaceRoutes
  const ok = !fullDiagnosticsOnInitial && !allInOneInitial && missingSurfaceRoutes.length === 0
  return {
    ok,
    initialLoadRoutes: initial,
    detailRoutesOnInitial,
    missingSurfaceRoutes,
    fullDiagnosticsOnInitial,
    allInOneInitial,
    deferredCardId: FOUNDATION_LAZY_SURFACE_LOADING_CARD_ID,
  }
}

export function assessLazySurfaceLoadingFollowup({
  availableRoutes = [],
} = {}) {
  const routes = new Set(list(availableRoutes).map(text))
  const hasBacklogListRoute = routes.has('/api/foundation/backlog') || routes.has('/api/foundation/backlog?view=list')
  return {
    closeAsArchitectureNow: hasBacklogListRoute,
    followupCardId: FOUNDATION_LAZY_SURFACE_LOADING_CARD_ID,
    reason: hasBacklogListRoute
      ? 'Backlog has a list route, so lazy surface loading can be implemented as loading architecture without shared-route work.'
      : 'Backlog still lacks a read-only list route separate from default Hub; keep lazy surface loading as the immediate scoped follow-up instead of pretending it shipped.',
  }
}

export function buildFoundationEngineeringFitnessDogfoodProof() {
  const fileFitness = evaluateEngineeringFileFitness([
    { path: 'lib/compact.js', lineCount: 900, kind: 'handwritten' },
    { path: 'scripts/generated-report.json', lineCount: 2200, kind: 'report', explicitBudgetLines: 3000 },
  ])
  const overBudgetFile = evaluateEngineeringFileFitness([
    { path: 'scripts/foundation-verify.mjs', lineCount: 5375, kind: 'handwritten', addsLines: true, splitPlan: false },
  ])
  const generatedNoBudget = evaluateEngineeringFileFitness([
    { path: 'docs/handoffs/report.json', lineCount: 2000, kind: 'report' },
  ])
  const compactHub = {
    backlogItems: [{ id: 'FOUNDATION-DOGFOOD-001', title: 'Compact card', summary: 'Small row.' }],
    backlogContract: {
      contractVersion: 'foundation-hub-backlog.contract.v1',
      totalItems: 1,
      defaultItemCount: 1,
      fullPayloadCompacted: true,
    },
    foundationJobs: { fullPayloadCompacted: true, rows: [] },
    foundation1100Review: { fullPayloadCompacted: true },
    researchCuration: { fullPayloadCompacted: true, rows: [] },
    recentChanges: [],
    foundationHubPerformance: { mode: 'summary', durationMs: 100, payloadBytes: 0 },
  }
  const compactHubBytes = byteLengthJson(compactHub)
  const hubPass = evaluateFoundationHubDecomposition({
    defaultHubPayload: compactHub,
    defaultPayloadBytes: compactHubBytes,
    fullDiagnosticsPayload: { foundationHubPerformance: { mode: 'full', durationMs: 1000, payloadBytes: 2_000_000 } },
    fullDiagnosticsPayloadBytes: 2_000_000,
    dedicatedRoutes: Object.values(FOUNDATION_AGENT_ROUTE_USAGE),
  })
  const hubFail = evaluateFoundationHubDecomposition({
    defaultHubPayload: {
      ...compactHub,
      backlogItems: Array.from({ length: 40 }, (_, index) => ({ id: `DOGFOOD-${index}`, text: 'x'.repeat(20_000) })),
      sharedCommunicationSynthesis: { rows: [{ detail: 'full-only leak' }] },
    },
    defaultPayloadBytes: 900_000,
    fullDiagnosticsPayloadBytes: 2_000_000,
    fullDiagnosticsDurationMs: 1000,
    dedicatedRoutes: ['/api/foundation-hub'],
  })
  const lazyPass = evaluateFoundationLazySurfaceLoadingArchitecture({
    initialLoadRoutes: ['/api/source-of-truth', '/api/foundation-hub'],
    surfaceRouteMap: FOUNDATION_AGENT_ROUTE_USAGE,
  })
  const lazyFail = evaluateFoundationLazySurfaceLoadingArchitecture({
    initialLoadRoutes: [
      '/api/foundation-hub',
      '/api/foundation-hub?view=full',
      '/api/foundation/build-log',
      '/api/foundation/source-lifecycle',
      '/api/source-of-truth',
    ],
    surfaceRouteMap: { currentSprint: '' },
  })
  const verifyLoopPass = evaluateVerifyLoopEfficiency([
    { type: 'focused-proof', status: 'pass' },
    { type: 'process-foundation-ship', status: 'pass' },
  ])
  const verifyLoopFail = evaluateVerifyLoopEfficiency([
    { type: 'focused-proof', status: 'fail' },
    { type: 'foundation-verify-full', status: 'fail' },
    { type: 'foundation-verify-full', status: 'fail' },
  ])
  const thinCard = validateBuildLaneCardScaffold({ id: 'THIN-001', title: 'Thin', lane: 'scoped', priority: 'P0' })
  const staleFanout = classifyShipGateFanoutSync({
    localHead: 'new111',
    servedCommit: 'old000',
    localCloseoutExists: true,
    recentBuildsExposeCloseout: false,
  })
  const currentSprintDrift = evaluateCurrentSprintSurfaceAlignment({
    dbSprint: { items: [{ cardId: 'FOUNDATION-ENGINEERING-FITNESS-GATES-001' }] },
    apiPayload: { sprint: {}, items: [] },
    hubPayload: { currentSprint: { items: [] } },
  })
  const ok = fileFitness.ok &&
    overBudgetFile.ok === false &&
    generatedNoBudget.ok === false &&
    hubPass.ok &&
    hubFail.ok === false &&
    hubFail.findings.some(finding => finding.code === 'default_hub_section_over_budget' || finding.code === 'default_hub_budget_failed') &&
    lazyPass.ok &&
    lazyFail.ok === false &&
    verifyLoopPass.ok &&
    verifyLoopFail.ok === false &&
    thinCard.ok === false &&
    staleFanout.status === 'stale_served_code' &&
    currentSprintDrift.ok === false
  return {
    ok,
    fileFitness,
    overBudgetFile,
    generatedNoBudget,
    hubPass,
    hubFail,
    lazyPass,
    lazyFail,
    verifyLoopPass,
    verifyLoopFail,
    thinCard,
    staleFanout,
    currentSprintDrift,
    invariant: 'Fitness gates pass compact healthy contracts and reject over-budget files, report artifacts without budgets, oversized default Hub sections, all-in-one page loading, repeated full verifies, thin scaffold fields, stale served code, and Current Sprint drift.',
  }
}

export function evaluateFoundationEngineeringFitnessSprint({
  cards = [],
  sprint = {},
  apiPayload = {},
  hubPayload = {},
  packageJson = {},
  closeoutRecordsSource = '',
  coverageSource = '',
  moduleSource = '',
  scriptSource = '',
  closeoutDoc = '',
  lazyFollowup = {},
} = {}) {
  const checks = []
  const cardMap = new Map(list(cards).map(card => [card.id, card]))
  const missingDoneCards = FOUNDATION_ENGINEERING_FITNESS_DONE_CARD_IDS.filter(id => !cardMap.has(id))
  const missingScopeCards = FOUNDATION_ENGINEERING_FITNESS_SCOPE_CARD_IDS.filter(id => !cardMap.has(id))
  const doneCardScaffold = FOUNDATION_ENGINEERING_FITNESS_DONE_CARD_IDS
    .map(id => validateBuildLaneCardScaffold(cardMap.get(id) || { id }))
  const sprintItems = list(sprint.items)
  const sprintItemResults = sprintItems.map(validateBuildLaneSprintItemMetadata)
  const surface = evaluateCurrentSprintSurfaceAlignment({ dbSprint: sprint, apiPayload, hubPayload })
  const dogfood = buildFoundationEngineeringFitnessDogfoodProof()
  const lazyCard = cardMap.get(FOUNDATION_LAZY_SURFACE_LOADING_CARD_ID)

  addCheck(checks, missingDoneCards.length === 0, 'engineering fitness P0 cards exist', missingDoneCards.join(', ') || 'complete')
  addCheck(checks, missingScopeCards.length === 0, 'lazy surface loading follow-up card exists', missingScopeCards.join(', ') || 'complete')
  addCheck(checks, doneCardScaffold.every(result => result.ok), 'engineering fitness P0 cards pass scaffold validation', doneCardScaffold.filter(result => !result.ok).map(result => `${result.cardId}:${result.missing.join(',')}`).join('; ') || 'complete')
  addCheck(checks, lazyCard && ['scoped', 'sprint-ready', 'sprint_ready', 'done'].includes(text(lazyCard.lane)), 'lazy surface loading is scoped or done, not lost', lazyCard?.lane || 'missing')
  addCheck(checks, lazyFollowup.followupCardId === FOUNDATION_LAZY_SURFACE_LOADING_CARD_ID && lazyFollowup.closeAsArchitectureNow === false, 'lazy surface loading remains explicit immediate follow-up when route work is required', lazyFollowup.reason || 'missing')
  addCheck(checks, sprint.sprint?.sprintId === FOUNDATION_ENGINEERING_FITNESS_GATES_SPRINT_ID, 'active sprint is engineering fitness gate sprint', sprint.sprint?.sprintId || 'missing')
  addCheck(checks, sprintItems.length === FOUNDATION_ENGINEERING_FITNESS_DONE_CARD_IDS.length, 'active sprint carries the three P0 engineering fitness items', `${sprintItems.length}/${FOUNDATION_ENGINEERING_FITNESS_DONE_CARD_IDS.length}`)
  addCheck(checks, sprintItemResults.every(result => result.ok), 'active sprint items carry full metadata standard', sprintItemResults.filter(result => !result.ok).map(result => result.missing.join(',')).join('; ') || 'complete')
  addCheck(checks, surface.ok, 'Current Sprint API and Hub expose DB truth for engineering sprint', JSON.stringify(surface))
  addCheck(checks, dogfood.ok, 'engineering fitness dogfood rejects standards failure modes', dogfood.invariant)
  addCheck(checks, packageJson.scripts?.['process:foundation-engineering-fitness-gates-check'] === `node --env-file-if-exists=.env ${FOUNDATION_ENGINEERING_FITNESS_GATES_SCRIPT_PATH}`, 'package exposes focused engineering fitness proof', packageJson.scripts?.['process:foundation-engineering-fitness-gates-check'] || 'missing')
  addCheck(checks, closeoutRecordsSource.includes(FOUNDATION_ENGINEERING_FITNESS_GATES_CLOSEOUT_KEY) && closeoutRecordsSource.includes(FOUNDATION_ENGINEERING_FITNESS_GATES_CARD_ID), 'closeout registry includes engineering fitness gate', FOUNDATION_ENGINEERING_FITNESS_GATES_CLOSEOUT_KEY)
  addCheck(checks, coverageSource.includes('FOUNDATION_ENGINEERING_FITNESS_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE'), 'verifier coverage card IDs include engineering fitness gate', 'coverage constant')
  addCheck(checks, moduleSource.includes('evaluateFoundationHubDecomposition') && moduleSource.includes('evaluateFoundationLazySurfaceLoadingArchitecture'), 'module owns Hub decomposition and lazy loading architecture evaluators', 'module evaluators present')
  addCheck(checks, scriptSource.includes('assertProcessCheckWriteAllowed') && scriptSource.includes('close-card'), 'focused proof has explicit write posture', 'write guard and close-card present')
  addCheck(checks, closeoutDoc.includes(FOUNDATION_ENGINEERING_FITNESS_GATES_CLOSEOUT_KEY) && closeoutDoc.includes('EXTRACTION-RUNTIME-READINESS-001'), 'closeout states shipped key and next sprint', FOUNDATION_ENGINEERING_FITNESS_GATES_CLOSEOUT_PATH)

  return {
    ok: checks.every(check => check.ok),
    checks,
    failed: checks.filter(check => !check.ok),
    summary: {
      doneCardCount: FOUNDATION_ENGINEERING_FITNESS_DONE_CARD_IDS.length,
      scopeCardCount: FOUNDATION_ENGINEERING_FITNESS_SCOPE_CARD_IDS.length,
      sprintItemCount: sprintItems.length,
      surface,
      dogfoodOk: dogfood.ok,
      lazyFollowup,
    },
  }
}

export async function evaluateFoundationEngineeringFitnessVerifierCoverage({
  cards = [],
  closeouts = [],
  packageJson = {},
  foundationHubSummary = {},
  foundationHubFull = {},
  sources = {},
  repoFileExists = async () => false,
} = {}) {
  const checks = []
  const findCard = id => list(cards).find(card => card.id === id) || null
  const closeout = list(closeouts).find(record => record.key === FOUNDATION_ENGINEERING_FITNESS_GATES_CLOSEOUT_KEY) || null
  const lazyCard = findCard(FOUNDATION_LAZY_SURFACE_LOADING_CARD_ID)
  const lazyCloseout = list(closeouts).find(record => record.key === FOUNDATION_LAZY_SURFACE_LOADING_CLOSEOUT_KEY) || null
  const doneArchiveCard = findCard(FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CARD_ID)
  const doneArchiveCloseout = list(closeouts).find(record => record.key === FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CLOSEOUT_KEY) || null
  const summaryBudget = evaluateFoundationHubPayloadBudgetV2({
    payload: foundationHubSummary,
    durationMs: foundationHubSummary?.foundationHubPerformance?.durationMs || 0,
    payloadBytes: foundationHubSummary?.foundationHubPerformance?.payloadBytes || byteLengthJson(foundationHubSummary),
  })
  const fullBytes = Number(foundationHubFull?.foundationHubPerformance?.payloadBytes || byteLengthJson(foundationHubFull))
  const fullDuration = Number(foundationHubFull?.foundationHubPerformance?.durationMs || 0)
  const dogfood = buildFoundationEngineeringFitnessDogfoodProof()

  addCheck(
    checks,
    FOUNDATION_ENGINEERING_FITNESS_DONE_CARD_IDS.every(id => {
      const card = findCard(id)
      return card?.lane === 'done' && String(card.statusNote || '').includes(FOUNDATION_ENGINEERING_FITNESS_GATES_CLOSEOUT_KEY)
    }),
    'engineering fitness done cards are live done cards',
    FOUNDATION_ENGINEERING_FITNESS_DONE_CARD_IDS.map(id => `${id}:${findCard(id)?.lane || 'missing'}`).join(', '),
  )
  addCheck(
    checks,
    closeout?.operatorCloseout === true &&
      FOUNDATION_ENGINEERING_FITNESS_DONE_CARD_IDS.every(id => (closeout.backlogIds || []).includes(id)),
    'engineering fitness closeout is registered with done card IDs',
    closeout?.key || 'missing',
  )
  addCheck(checks, summaryBudget.ok, 'default Foundation Hub remains under summary budget', `${summaryBudget.measured.payloadBytes}B`)
  addCheck(checks, fullBytes <= FOUNDATION_SURFACE_API_BUDGETS.diagnosticApiMaxPayloadBytes && fullDuration <= FOUNDATION_SURFACE_API_BUDGETS.diagnosticApiMaxDurationMs, 'full diagnostics route stays under separate diagnostic budget', `${fullBytes}B/${fullDuration}ms`)
  addCheck(checks, dogfood.ok, 'engineering fitness dogfood remains executable in foundation:verify', dogfood.invariant)
  addCheck(checks, packageJson.scripts?.['process:foundation-engineering-fitness-gates-check'] === `node --env-file-if-exists=.env ${FOUNDATION_ENGINEERING_FITNESS_GATES_SCRIPT_PATH}`, 'focused engineering fitness proof is registered', packageJson.scripts?.['process:foundation-engineering-fitness-gates-check'] || 'missing')
  addCheck(checks, includesAll(sources.verifierCoverageSource, FOUNDATION_ENGINEERING_FITNESS_DONE_CARD_IDS), 'verifier coverage source lists done card IDs', 'coverage ids present')
  addCheck(checks, String(sources.foundationVerifySource || '').includes('evaluateFoundationEngineeringFitnessVerifierCoverage'), 'foundation:verify calls engineering fitness verifier coverage', 'call present')
  addCheck(checks, String(sources.moduleSource || '').includes('FOUNDATION_AGENT_ROUTE_USAGE') && String(sources.moduleSource || '').includes('FOUNDATION_SURFACE_API_BUDGETS'), 'engineering fitness module exposes route and API budgets', 'route/API budget constants present')
  addCheck(checks, await repoFileExists(FOUNDATION_ENGINEERING_FITNESS_GATES_PLAN_PATH), 'engineering fitness plan exists', FOUNDATION_ENGINEERING_FITNESS_GATES_PLAN_PATH)
  addCheck(checks, await repoFileExists(FOUNDATION_ENGINEERING_FITNESS_GATES_APPROVAL_PATH), 'engineering fitness approval exists', FOUNDATION_ENGINEERING_FITNESS_GATES_APPROVAL_PATH)
  addCheck(checks, await repoFileExists(FOUNDATION_ENGINEERING_FITNESS_GATES_CLOSEOUT_PATH), 'engineering fitness closeout exists', FOUNDATION_ENGINEERING_FITNESS_GATES_CLOSEOUT_PATH)
  if (lazyCard?.lane === 'done') {
    const lazyArchitecture = evaluateFoundationLazySurfaceRouteLoadingArchitecture({
      publicDataSource: sources.publicDataSource || '',
      foundationSource: sources.foundationSource || '',
      operationsRendererSource: sources.operationsRendererSource || '',
      operatorRoutesSource: sources.operatorRoutesSource || '',
      backlogModuleSource: sources.backlogModuleSource || '',
      packageJson,
      routePayloads: sources.routePayloads || {},
      defaultHubPayload: foundationHubSummary,
      fullDiagnosticsPayload: foundationHubFull,
    })
    const lazyDogfood = buildFoundationLazySurfaceLoadingDogfoodProof()
    addCheck(checks, lazyCloseout?.operatorCloseout === true && (lazyCloseout.backlogIds || []).includes(FOUNDATION_LAZY_SURFACE_LOADING_CARD_ID), 'lazy surface loading closeout is registered', lazyCloseout?.key || 'missing')
    addCheck(checks, lazyArchitecture.ok, 'lazy surface loading architecture stays narrow', lazyArchitecture.findings.map(finding => `${finding.code}:${finding.detail}`).join('; ') || 'healthy')
    addCheck(checks, lazyDogfood.ok, 'lazy surface loading dogfood remains executable', lazyDogfood.invariant)
    addCheck(checks, includesAll(sources.verifierCoverageSource, [FOUNDATION_LAZY_SURFACE_LOADING_CARD_ID]), 'verifier coverage source lists lazy loading card ID', FOUNDATION_LAZY_SURFACE_LOADING_CARD_ID)
    addCheck(checks, await repoFileExists(FOUNDATION_LAZY_SURFACE_LOADING_PLAN_PATH), 'lazy surface loading plan exists', FOUNDATION_LAZY_SURFACE_LOADING_PLAN_PATH)
    addCheck(checks, await repoFileExists(FOUNDATION_LAZY_SURFACE_LOADING_APPROVAL_PATH), 'lazy surface loading approval exists', FOUNDATION_LAZY_SURFACE_LOADING_APPROVAL_PATH)
    addCheck(checks, await repoFileExists(FOUNDATION_LAZY_SURFACE_LOADING_CLOSEOUT_PATH), 'lazy surface loading closeout exists', FOUNDATION_LAZY_SURFACE_LOADING_CLOSEOUT_PATH)
  }
  if (doneArchiveCard?.lane === 'done') {
    const archiveArchitecture = evaluateFoundationBacklogDoneArchiveLazyLoad({
      defaultPayload: sources.routePayloads?.backlog || {},
      archivePayload: sources.routePayloads?.doneArchive || {},
      defaultBytes: sources.routeMetrics?.backlogBytes,
      archiveBytes: sources.routeMetrics?.doneArchiveBytes,
      defaultMs: sources.routeMetrics?.backlogMs,
      archiveMs: sources.routeMetrics?.doneArchiveMs,
      publicDataSource: sources.publicDataSource || '',
      backlogRendererSource: sources.backlogRendererSource || '',
      routerSource: sources.routerSource || '',
      operatorRoutesSource: sources.operatorRoutesSource || '',
      backlogModuleSource: sources.backlogModuleSource || '',
      securityAccessSource: sources.securityAccessSource || '',
      packageJson,
    })
    const archiveDogfood = buildFoundationBacklogDoneArchiveDogfoodProof()
    addCheck(checks, doneArchiveCloseout?.operatorCloseout === true && (doneArchiveCloseout.backlogIds || []).includes(FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CARD_ID), 'done archive lazy-load closeout is registered', doneArchiveCloseout?.key || 'missing')
    addCheck(checks, archiveArchitecture.ok, 'done archive lazy-load architecture stays narrow', archiveArchitecture.failed.map(finding => `${finding.check}:${finding.detail}`).join('; ') || 'healthy')
    addCheck(checks, archiveDogfood.ok, 'done archive lazy-load dogfood remains executable', archiveDogfood.invariant)
    addCheck(checks, includesAll(sources.verifierCoverageSource, [FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CARD_ID]), 'verifier coverage source lists done archive card ID', FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CARD_ID)
    addCheck(checks, await repoFileExists(FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_PLAN_PATH), 'done archive lazy-load plan exists', FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_PLAN_PATH)
    addCheck(checks, await repoFileExists(FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_APPROVAL_PATH), 'done archive lazy-load approval exists', FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_APPROVAL_PATH)
    addCheck(checks, await repoFileExists(FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CLOSEOUT_PATH), 'done archive lazy-load closeout exists', FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CLOSEOUT_PATH)
  }

  return {
    ok: checks.every(check => check.ok),
    checks,
    summary: {
      defaultHubBytes: summaryBudget.measured.payloadBytes,
      fullDiagnosticsBytes: fullBytes,
      dogfoodOk: dogfood.ok,
    },
  }
}
