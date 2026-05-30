export const FOUNDATION_CSS_SURFACE_DECOUPLE_CARD_ID = 'FOUNDATION-CSS-SURFACE-DECOUPLE-001'
export const FOUNDATION_CSS_SURFACE_DECOUPLE_CLOSEOUT_KEY = 'foundation-css-surface-decouple-v1'
export const FOUNDATION_CSS_SURFACE_DECOUPLE_PLAN_PATH = 'docs/process/foundation-css-surface-decouple-001-plan.md'
export const FOUNDATION_CSS_SURFACE_DECOUPLE_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-CSS-SURFACE-DECOUPLE-001.json'
export const FOUNDATION_CSS_SURFACE_DECOUPLE_SCRIPT_PATH = 'scripts/process-foundation-css-surface-decouple-check.mjs'
export const FOUNDATION_CSS_SURFACE_DECOUPLE_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-foundation-css-surface-decouple-closeout.md'
export const FOUNDATION_CSS_SURFACE_DECOUPLE_NEXT_CARD_ID = 'DECISION-008'

export const FOUNDATION_CSS_SURFACE_IMPORT_ORDER = [
  'public/styles-base-layout.css',
  'public/styles-foundation-core.css',
  'public/styles-foundation-current-state.css',
  'public/styles-foundation-build-log.css',
  'public/styles-foundation-workflows.css',
  'public/styles-strategy-docs.css',
  'public/styles-home-foundation-shell.css',
  'public/styles-strategy-sales.css',
]

export const FOUNDATION_CSS_SURFACE_BUDGETS = {
  rootMax: 80,
  broadCoreMax: 1800,
  broadWorkflowsMax: 2100,
  extractedSurfaceMin: 450,
  extractedSurfaceMax: 900,
  moduleMax: 2200,
}

export const FOUNDATION_CSS_SURFACE_SELECTORS = {
  currentState: [
    '.current-state-grid-4',
    '.current-state-surface-summary',
    '.current-state-package-table',
    '.foundation-system-stack',
  ],
  buildLog: [
    '.build-log-list',
    '.current-sprint-panel',
    '.build-log-card-summary',
    '.doc-update-diff',
  ],
}

export const FOUNDATION_CSS_SURFACE_PROOF_COMMANDS = [
  'node --check lib/foundation-css-surface-decouple.js scripts/process-foundation-css-surface-decouple-check.mjs',
  'npm run process:stylesheet-monolith-split-check -- --json',
  'npm run process:foundation-css-surface-decouple-check -- --close-card --json',
  'npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:foundation-ship -- --card=FOUNDATION-CSS-SURFACE-DECOUPLE-001 --planApprovalRef=docs/process/approvals/FOUNDATION-CSS-SURFACE-DECOUPLE-001.json --closeoutKey=foundation-css-surface-decouple-v1 --commitRef=HEAD',
]

export function countCssLines(source = '') {
  const text = String(source || '')
  if (!text) return 0
  const newlineCount = (text.match(/\n/g) || []).length
  return newlineCount + (text.endsWith('\n') ? 0 : 1)
}

export function extractCssImports(rootSource = '') {
  const imports = []
  const pattern = /@import\s+url\((['"]?)([^'")]+)\1\)\s*;/gi
  let match = pattern.exec(String(rootSource || ''))
  while (match) {
    const importPath = String(match[2] || '').trim()
    imports.push(importPath.startsWith('./')
      ? `public/${importPath.slice(2)}`
      : importPath.replace(/^\/+/, 'public/'))
    match = pattern.exec(String(rootSource || ''))
  }
  return imports
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function selectorMissing(moduleSource = '', selectors = []) {
  return selectors.filter(selector => !String(moduleSource || '').includes(selector))
}

function selectorsStillIn(source = '', selectors = []) {
  return selectors.filter(selector => String(source || '').includes(selector))
}

export function evaluateFoundationCssSurfaceDecouple({
  rootSource = '',
  moduleSources = {},
  deepAuditClosureSource = '',
  closeouts = [],
} = {}) {
  const checks = []
  const imports = extractCssImports(rootSource)
  const lineCounts = Object.fromEntries(FOUNDATION_CSS_SURFACE_IMPORT_ORDER.map(modulePath => [
    modulePath,
    countCssLines(moduleSources[modulePath] || ''),
  ]))
  const missingModules = FOUNDATION_CSS_SURFACE_IMPORT_ORDER.filter(modulePath => !String(moduleSources[modulePath] || '').trim())
  const importOrderMatches = imports.length === FOUNDATION_CSS_SURFACE_IMPORT_ORDER.length &&
    FOUNDATION_CSS_SURFACE_IMPORT_ORDER.every((modulePath, index) => imports[index] === modulePath)
  const rootLines = countCssLines(rootSource)
  const currentStateSource = moduleSources['public/styles-foundation-current-state.css'] || ''
  const buildLogSource = moduleSources['public/styles-foundation-build-log.css'] || ''
  const coreSource = moduleSources['public/styles-foundation-core.css'] || ''
  const workflowSource = moduleSources['public/styles-foundation-workflows.css'] || ''
  const currentStateMissing = selectorMissing(currentStateSource, FOUNDATION_CSS_SURFACE_SELECTORS.currentState)
  const buildLogMissing = selectorMissing(buildLogSource, FOUNDATION_CSS_SURFACE_SELECTORS.buildLog)
  const currentStateStillBroad = selectorsStillIn(coreSource, FOUNDATION_CSS_SURFACE_SELECTORS.currentState)
  const buildLogStillBroad = selectorsStillIn(workflowSource, FOUNDATION_CSS_SURFACE_SELECTORS.buildLog)
  const overBudgetModules = Object.entries(lineCounts)
    .filter(([, lines]) => lines > FOUNDATION_CSS_SURFACE_BUDGETS.moduleMax)
    .map(([modulePath, lines]) => `${modulePath}:${lines}`)
  const closeout = closeouts.find(item => item?.key === FOUNDATION_CSS_SURFACE_DECOUPLE_CLOSEOUT_KEY)
  const auditRouteDone = String(deepAuditClosureSource || '').includes("findingId: 'foundation-dom-rebuild-risk'") &&
    String(deepAuditClosureSource || '').includes("routeStatus: 'done'") &&
    String(deepAuditClosureSource || '').includes(FOUNDATION_CSS_SURFACE_DECOUPLE_CLOSEOUT_KEY)

  addCheck(checks, rootLines > 0 && rootLines <= FOUNDATION_CSS_SURFACE_BUDGETS.rootMax, 'root stylesheet remains a thin import manifest', `${rootLines}/${FOUNDATION_CSS_SURFACE_BUDGETS.rootMax}`)
  addCheck(checks, importOrderMatches, 'root stylesheet imports CSS ownership modules in preserved cascade order', imports.join(' -> '))
  addCheck(checks, missingModules.length === 0, 'all CSS ownership modules exist with content', missingModules.join(', ') || 'all present')
  addCheck(checks, lineCounts['public/styles-foundation-core.css'] <= FOUNDATION_CSS_SURFACE_BUDGETS.broadCoreMax, 'Foundation core CSS is reduced below broad-surface budget', `${lineCounts['public/styles-foundation-core.css']}/${FOUNDATION_CSS_SURFACE_BUDGETS.broadCoreMax}`)
  addCheck(checks, lineCounts['public/styles-foundation-workflows.css'] <= FOUNDATION_CSS_SURFACE_BUDGETS.broadWorkflowsMax, 'Foundation workflows CSS is reduced below broad-surface budget', `${lineCounts['public/styles-foundation-workflows.css']}/${FOUNDATION_CSS_SURFACE_BUDGETS.broadWorkflowsMax}`)
  addCheck(checks, lineCounts['public/styles-foundation-current-state.css'] >= FOUNDATION_CSS_SURFACE_BUDGETS.extractedSurfaceMin && lineCounts['public/styles-foundation-current-state.css'] <= FOUNDATION_CSS_SURFACE_BUDGETS.extractedSurfaceMax, 'Current State/System Inventory CSS lives in its own bounded module', `${lineCounts['public/styles-foundation-current-state.css']} lines`)
  addCheck(checks, lineCounts['public/styles-foundation-build-log.css'] >= FOUNDATION_CSS_SURFACE_BUDGETS.extractedSurfaceMin && lineCounts['public/styles-foundation-build-log.css'] <= FOUNDATION_CSS_SURFACE_BUDGETS.extractedSurfaceMax, 'Build Log/Current Sprint CSS lives in its own bounded module', `${lineCounts['public/styles-foundation-build-log.css']} lines`)
  addCheck(checks, overBudgetModules.length === 0, 'CSS modules stay below owner-module budget', overBudgetModules.join(', ') || 'clean')
  addCheck(checks, currentStateMissing.length === 0, 'Current State/System Inventory selectors moved to current-state module', currentStateMissing.join(', ') || 'present')
  addCheck(checks, buildLogMissing.length === 0, 'Build Log/Current Sprint selectors moved to build-log module', buildLogMissing.join(', ') || 'present')
  addCheck(checks, currentStateStillBroad.length === 0, 'Current State/System Inventory selectors no longer live in broad core CSS', currentStateStillBroad.join(', ') || 'clean')
  addCheck(checks, buildLogStillBroad.length === 0, 'Build Log/Current Sprint selectors no longer live in broad workflows CSS', buildLogStillBroad.join(', ') || 'clean')
  addCheck(checks, auditRouteDone || Boolean(closeout), 'deep-audit CSS/DOM finding is routed to shipped proof', auditRouteDone ? 'route done' : (closeout?.key || 'missing'))

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    checks,
    failed,
    imports,
    lineCounts: {
      root: rootLines,
      ...lineCounts,
    },
    currentStateMissing,
    buildLogMissing,
    currentStateStillBroad,
    buildLogStillBroad,
    overBudgetModules,
  }
}

export function buildFoundationCssSurfaceDecoupleDogfoodProof() {
  const goodModules = Object.fromEntries(FOUNDATION_CSS_SURFACE_IMPORT_ORDER.map(modulePath => [
    modulePath,
    '.placeholder { color: inherit; }',
  ]))
  goodModules['public/styles-foundation-core.css'] = '.panel { display: block; }'
  goodModules['public/styles-foundation-workflows.css'] = '.strategy-document { display: block; }'
  goodModules['public/styles-foundation-current-state.css'] = FOUNDATION_CSS_SURFACE_SELECTORS.currentState.map(selector => `${selector} { display: block; }`).join('\n')
  goodModules['public/styles-foundation-build-log.css'] = FOUNDATION_CSS_SURFACE_SELECTORS.buildLog.map(selector => `${selector} { display: block; }`).join('\n')
  const filler = Array.from({ length: FOUNDATION_CSS_SURFACE_BUDGETS.extractedSurfaceMin }, (_, index) => `.x${index} { color: inherit; }`).join('\n')
  goodModules['public/styles-foundation-current-state.css'] += `\n${filler}`
  goodModules['public/styles-foundation-build-log.css'] += `\n${filler}`
  const goodRoot = FOUNDATION_CSS_SURFACE_IMPORT_ORDER.map(modulePath => `@import url('./${modulePath.replace('public/', '')}');`).join('\n')
  const routeDoneSource = `
    findingId: 'foundation-dom-rebuild-risk',
    routeStatus: 'done',
    targetCloseoutKey: '${FOUNDATION_CSS_SURFACE_DECOUPLE_CLOSEOUT_KEY}',
  `
  const good = evaluateFoundationCssSurfaceDecouple({
    rootSource: goodRoot,
    moduleSources: goodModules,
    deepAuditClosureSource: routeDoneSource,
  })
  const missingImport = evaluateFoundationCssSurfaceDecouple({
    rootSource: FOUNDATION_CSS_SURFACE_IMPORT_ORDER.filter(modulePath => modulePath !== 'public/styles-foundation-build-log.css').map(modulePath => `@import url('./${modulePath.replace('public/', '')}');`).join('\n'),
    moduleSources: goodModules,
    deepAuditClosureSource: routeDoneSource,
  })
  const staleBroadSelectors = evaluateFoundationCssSurfaceDecouple({
    rootSource: goodRoot,
    moduleSources: {
      ...goodModules,
      'public/styles-foundation-core.css': `${goodModules['public/styles-foundation-core.css']}\n.current-state-grid-4 { display: grid; }`,
      'public/styles-foundation-workflows.css': `${goodModules['public/styles-foundation-workflows.css']}\n.build-log-list { display: grid; }`,
    },
    deepAuditClosureSource: routeDoneSource,
  })
  const unresolvedAuditRoute = evaluateFoundationCssSurfaceDecouple({
    rootSource: goodRoot,
    moduleSources: goodModules,
    deepAuditClosureSource: "findingId: 'foundation-dom-rebuild-risk', routeStatus: 'scoped'",
  })

  return {
    ok: good.ok === true &&
      missingImport.ok === false &&
      staleBroadSelectors.ok === false &&
      unresolvedAuditRoute.ok === false,
    good,
    rejected: {
      missingImport: missingImport.ok === false,
      staleBroadSelectors: staleBroadSelectors.ok === false,
      unresolvedAuditRoute: unresolvedAuditRoute.ok === false,
    },
  }
}
