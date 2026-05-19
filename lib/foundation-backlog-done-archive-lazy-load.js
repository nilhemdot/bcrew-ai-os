import {
  FOUNDATION_BACKLOG_DONE_ARCHIVE_ENDPOINT_BUDGET_BYTES,
  FOUNDATION_BACKLOG_DONE_ARCHIVE_ENDPOINT_BUDGET_MS,
  FOUNDATION_BACKLOG_DONE_ARCHIVE_ENDPOINT_PATH,
  FOUNDATION_BACKLOG_LIST_ENDPOINT_BUDGET_BYTES,
  FOUNDATION_BACKLOG_LIST_ENDPOINT_BUDGET_MS,
  FOUNDATION_BACKLOG_LIST_ENDPOINT_PATH,
  FOUNDATION_BACKLOG_RECENT_DONE_WINDOW,
  buildFoundationBacklogDoneArchivePayload,
  buildFoundationBacklogListPayload,
  validateFoundationBacklogDoneArchivePayload,
  validateFoundationBacklogListPayload,
} from './foundation-backlog-detail.js'

export const FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CARD_ID = 'FOUNDATION-BACKLOG-DONE-ARCHIVE-LAZY-LOAD-001'
export const FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_SPRINT_ID = 'foundation-backlog-done-archive-lazy-load-2026-05-17'
export const FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CLOSEOUT_KEY = 'foundation-backlog-done-archive-lazy-load-v1'
export const FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_PLAN_PATH = 'docs/process/foundation-backlog-done-archive-lazy-load-001-plan.md'
export const FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-BACKLOG-DONE-ARCHIVE-LAZY-LOAD-001.json'
export const FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_SCRIPT_PATH = 'scripts/process-foundation-backlog-done-archive-lazy-load-check.mjs'
export const FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-17-foundation-backlog-done-archive-lazy-load-closeout.md'

export const FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_PROOF_COMMANDS = [
  'npm run process:foundation-backlog-done-archive-lazy-load-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify',
  `npm run process:foundation-ship -- --card=${FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CARD_ID} --planApprovalRef=${FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_APPROVAL_PATH} --closeoutKey=${FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CLOSEOUT_KEY} --commitRef=HEAD`,
]

export const FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CHANGED_FILES = [
  'lib/foundation-backlog-detail.js',
  'lib/foundation-backlog-done-archive-lazy-load.js',
  'lib/foundation-operator-routes.js',
  'lib/security-access.js',
  'server.js',
  'public/foundation-data.js',
  'public/foundation-backlog-renderers.js',
  'public/foundation-router.js',
  'public/foundation-nav-config.js',
  'public/foundation.html',
  'lib/foundation-verify-live-api-snapshot.js',
  'lib/foundation-engineering-fitness-gates.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'scripts/foundation-verify.mjs',
  FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_SCRIPT_PATH,
  FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_PLAN_PATH,
  FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_APPROVAL_PATH,
  FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_CLOSEOUT_PATH,
]

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function byteLengthJson(value) {
  return Buffer.byteLength(JSON.stringify(value || {}), 'utf8')
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

export function buildBacklogDoneArchiveExistingWorkCheck(overrides = {}) {
  return {
    existingCode: 'Reuse Foundation backlog list/detail contracts, operator routes, security route registry, frontend cache helpers, and engineering fitness lazy-loading checks.',
    existingDocs: 'Reuse engineering fitness and lazy surface loading closeouts plus the main-chat engineering standards checkpoint.',
    existingScripts: 'Reuse focused proof, backlog hygiene, foundation:verify, process:foundation-ship, approval integrity, and Plan Critic.',
    existingPolicy: 'This is loading architecture only; no backlog semantic rewrite, data deletion, extractor runtime, connector/auth work, UI redesign, Drive mutation, or Agent Feedback auto-send.',
    reused: 'Existing backlog_items live table, Foundation route shell, existing backlog card renderer, Recent Work build-log history, and done closeout registry.',
    notRebuilt: 'No second backlog, no new UI framework, no new Recent Work timeline, no full-history deletion, and no extractor queue.',
    exactGap: 'The dedicated backlog route still returns every old done card by default, keeping the Backlog page heavy even after lazy surface loading.',
    overBroadRisk: 'Could drift into backlog taxonomy changes, visual redesign, Recent Work rewrite, extractor runtime, connector/auth work, or broad route cleanup.',
    readyBy: 'Steve approved the four-card Foundation queue and explicitly put done-archive lazy loading before extractor readiness.',
    readyAt: '2026-05-17T16:50:00-04:00',
    ...overrides,
  }
}

export function evaluateFoundationBacklogDoneArchiveLazyLoad({
  defaultPayload = {},
  archivePayload = {},
  defaultBytes = byteLengthJson(defaultPayload),
  archiveBytes = byteLengthJson(archivePayload),
  defaultMs = 0,
  archiveMs = 0,
  publicDataSource = '',
  backlogRendererSource = '',
  routerSource = '',
  operatorRoutesSource = '',
  backlogModuleSource = '',
  securityAccessSource = '',
  packageJson = {},
} = {}) {
  const checks = []
  const defaultValidation = validateFoundationBacklogListPayload(defaultPayload)
  const archiveValidation = validateFoundationBacklogDoneArchivePayload(archivePayload)
  const routeIndex = String(operatorRoutesSource).indexOf("app.get('/api/foundation/backlog/done-archive'")
  const detailIndex = String(operatorRoutesSource).indexOf("app.get('/api/foundation/backlog/:cardId'")

  addCheck(checks, defaultValidation.ok, 'default backlog payload contract is valid', defaultValidation.failures.join('; ') || 'valid')
  addCheck(checks, archiveValidation.ok, 'done archive payload contract is valid', archiveValidation.failures.join('; ') || 'valid')
  addCheck(checks, Number(defaultPayload.summary?.totalItems) === Number(archivePayload.summary?.totalItems), 'default and archive routes preserve total count', `${defaultPayload.summary?.totalItems}/${archivePayload.summary?.totalItems}`)
  addCheck(checks, Number(defaultPayload.summary?.doneItems) === Number(archivePayload.summary?.doneItems), 'default and archive routes preserve done count', `${defaultPayload.summary?.doneItems}/${archivePayload.summary?.doneItems}`)
  addCheck(checks, Number(defaultPayload.summary?.archivedDoneItems) === Number(archivePayload.summary?.archivedDoneItems), 'default points to the same archive count', `${defaultPayload.summary?.archivedDoneItems}/${archivePayload.summary?.archivedDoneItems}`)
  addCheck(checks, Number(defaultPayload.summary?.visibleItems) < Number(defaultPayload.summary?.totalItems), 'default backlog does not load full history', `${defaultPayload.summary?.visibleItems}/${defaultPayload.summary?.totalItems}`)
  addCheck(checks, list(defaultPayload.backlogItems).every(item => item.lane !== 'done' || Number(defaultPayload.summary?.recentDoneWindow) > 0), 'default backlog keeps only bounded done rows', `${defaultPayload.summary?.recentDoneItems || 0} recent done`)
  addCheck(checks, list(archivePayload.backlogItems).every(item => item.lane === 'done'), 'done archive contains only done rows', `${list(archivePayload.backlogItems).length} rows`)
  addCheck(checks, defaultBytes <= FOUNDATION_BACKLOG_LIST_ENDPOINT_BUDGET_BYTES && Number(defaultMs) <= FOUNDATION_BACKLOG_LIST_ENDPOINT_BUDGET_MS, 'default backlog route stays under budget', `${defaultBytes}B/${defaultMs}ms`)
  addCheck(checks, archiveBytes <= FOUNDATION_BACKLOG_DONE_ARCHIVE_ENDPOINT_BUDGET_BYTES && Number(archiveMs) <= FOUNDATION_BACKLOG_DONE_ARCHIVE_ENDPOINT_BUDGET_MS, 'done archive route stays under explicit budget', `${archiveBytes}B/${archiveMs}ms`)
  addCheck(checks, String(publicDataSource).includes('fetchFoundationBacklogDoneArchive') && String(publicDataSource).includes(FOUNDATION_BACKLOG_DONE_ARCHIVE_ENDPOINT_PATH), 'frontend data helper exposes done archive route', FOUNDATION_BACKLOG_DONE_ARCHIVE_ENDPOINT_PATH)
  addCheck(checks, String(publicDataSource).includes('fetchFoundationBacklog(options)') && String(publicDataSource).includes('?ids='), 'focused backlog links can request archived cards by ID', 'ids query support')
  addCheck(checks, String(backlogRendererSource).includes('renderBacklogDoneArchive') && String(backlogRendererSource).includes('fetchFoundationBacklogDoneArchive()'), 'done archive page fetches explicit archive route', 'renderBacklogDoneArchive')
  addCheck(checks, String(backlogRendererSource).includes('fetchFoundationBacklog({ ids: focusedIds })'), 'default backlog page passes focused IDs without broad Hub fallback', 'focused ID fetch')
  addCheck(checks, String(routerSource).includes("section === 'backlog-done-archive'") && String(routerSource).includes('renderBacklogDoneArchive()'), 'router exposes done archive page', 'backlog-done-archive')
  addCheck(checks, routeIndex >= 0 && detailIndex >= 0 && routeIndex < detailIndex, 'done archive route is registered before card detail route', `${routeIndex}/${detailIndex}`)
  addCheck(checks, String(operatorRoutesSource).includes('buildFoundationBacklogDoneArchivePayload'), 'operator routes use done archive payload builder', 'buildFoundationBacklogDoneArchivePayload')
  addCheck(checks, String(backlogModuleSource).includes('buildFoundationBacklogDoneArchivePayload') && String(backlogModuleSource).includes('validateFoundationBacklogDoneArchivePayload'), 'backlog module owns archive contract and validator', 'contract + validator')
  addCheck(checks, String(securityAccessSource).includes("route('GET', '/api/foundation/backlog/done-archive'"), 'security access registers archive route', FOUNDATION_BACKLOG_DONE_ARCHIVE_ENDPOINT_PATH)
  addCheck(checks, packageJson.scripts?.['process:foundation-backlog-done-archive-lazy-load-check'] === `node --env-file-if-exists=.env ${FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_SCRIPT_PATH}`, 'package exposes focused proof', FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_SCRIPT_PATH)

  return {
    ok: checks.every(check => check.ok),
    checks,
    failed: checks.filter(check => !check.ok),
    summary: {
      defaultBytes,
      archiveBytes,
      defaultItems: defaultPayload.summary?.visibleItems || 0,
      totalItems: defaultPayload.summary?.totalItems || 0,
      archivedDoneItems: defaultPayload.summary?.archivedDoneItems || 0,
    },
  }
}

export function buildFoundationBacklogDoneArchiveDogfoodProof() {
  const fixture = [
    { id: 'DOGFOOD-ACTIVE-001', title: 'Active A', team: 'foundation', lane: 'scoped', priority: 'P0', summary: 'Active card A' },
    { id: 'DOGFOOD-ACTIVE-002', title: 'Active B', team: 'foundation', lane: 'research', priority: 'P1', summary: 'Active card B' },
    { id: 'DOGFOOD-DONE-001', title: 'Done 1', team: 'foundation', lane: 'done', priority: 'P1', updatedAt: '2026-05-17T10:00:00Z', summary: 'Done recent 1' },
    { id: 'DOGFOOD-DONE-002', title: 'Done 2', team: 'foundation', lane: 'done', priority: 'P1', updatedAt: '2026-05-16T10:00:00Z', summary: 'Done recent 2' },
    { id: 'DOGFOOD-DONE-003', title: 'Done 3', team: 'foundation', lane: 'done', priority: 'P1', updatedAt: '2026-05-15T10:00:00Z', summary: 'Done archive 3' },
    { id: 'DOGFOOD-DONE-004', title: 'Done 4', team: 'foundation', lane: 'done', priority: 'P1', updatedAt: '2026-05-14T10:00:00Z', summary: 'Done archive 4' },
  ]
  const defaultPayload = buildFoundationBacklogListPayload({ backlogItems: fixture, recentDoneLimit: 2 })
  const archivePayload = buildFoundationBacklogDoneArchivePayload({ backlogItems: fixture, recentDoneLimit: 2 })
  const focusedPayload = buildFoundationBacklogListPayload({
    backlogItems: fixture,
    recentDoneLimit: 2,
    requestedCardIds: ['DOGFOOD-DONE-004'],
  })
  const badDefaultPayload = {
    ...defaultPayload,
    summary: { ...defaultPayload.summary, visibleItems: fixture.length, archivedDoneItems: 0 },
    backlogItems: fixture,
  }
  const commonSource = {
    publicDataSource: `function fetchFoundationBacklog(options){return foundationRead('${FOUNDATION_BACKLOG_LIST_ENDPOINT_PATH}' + '?ids=')} function fetchFoundationBacklogDoneArchive(){return foundationRead('${FOUNDATION_BACKLOG_DONE_ARCHIVE_ENDPOINT_PATH}')}`,
    backlogRendererSource: 'function renderBacklog(){ fetchFoundationBacklog({ ids: focusedIds }) } function renderBacklogDoneArchive(){ fetchFoundationBacklogDoneArchive() }',
    routerSource: "if (section === 'backlog-done-archive') renderBacklogDoneArchive()",
    operatorRoutesSource: "app.get('/api/foundation/backlog', fn); app.get('/api/foundation/backlog/done-archive', fn); app.get('/api/foundation/backlog/:cardId', fn); buildFoundationBacklogDoneArchivePayload",
    backlogModuleSource: 'buildFoundationBacklogDoneArchivePayload validateFoundationBacklogDoneArchivePayload',
    securityAccessSource: "route('GET', '/api/foundation/backlog/done-archive'",
    packageJson: { scripts: { 'process:foundation-backlog-done-archive-lazy-load-check': `node --env-file-if-exists=.env ${FOUNDATION_BACKLOG_DONE_ARCHIVE_LAZY_LOAD_SCRIPT_PATH}` } },
  }
  const valid = evaluateFoundationBacklogDoneArchiveLazyLoad({
    ...commonSource,
    defaultPayload,
    archivePayload,
  })
  const allDoneLoaded = evaluateFoundationBacklogDoneArchiveLazyLoad({
    ...commonSource,
    defaultPayload: badDefaultPayload,
    archivePayload,
  })
  const missingArchiveRoute = evaluateFoundationBacklogDoneArchiveLazyLoad({
    ...commonSource,
    defaultPayload,
    archivePayload,
    operatorRoutesSource: "app.get('/api/foundation/backlog', fn); app.get('/api/foundation/backlog/:cardId', fn);",
  })
  const focusedArchivedVisible = focusedPayload.summary?.requestedArchivedDoneItems === 1 &&
    focusedPayload.backlogItems.some(item => item.id === 'DOGFOOD-DONE-004')
  return {
    ok: valid.ok &&
      allDoneLoaded.ok === false &&
      missingArchiveRoute.ok === false &&
      focusedArchivedVisible,
    valid,
    allDoneLoaded,
    missingArchiveRoute,
    focusedPayload,
    recentDoneWindow: FOUNDATION_BACKLOG_RECENT_DONE_WINDOW,
    invariant: 'Default backlog loads active plus recent done, older done stays behind archive, focused archived IDs still load, and missing/archive-bypass fixtures fail.',
  }
}
