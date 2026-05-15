export const STYLESHEET_MONOLITH_SPLIT_CARD_ID = 'STYLESHEET-MONOLITH-SPLIT-001'
export const STYLESHEET_MONOLITH_SPLIT_CLOSEOUT_KEY = 'stylesheet-monolith-split-v1'
export const STYLESHEET_MONOLITH_SPLIT_PLAN_PATH = 'docs/process/stylesheet-monolith-split-001-plan.md'
export const STYLESHEET_MONOLITH_SPLIT_APPROVAL_PATH = 'docs/process/approvals/STYLESHEET-MONOLITH-SPLIT-001.json'
export const STYLESHEET_MONOLITH_SPLIT_SCRIPT_PATH = 'scripts/process-stylesheet-monolith-split-check.mjs'
export const STYLESHEET_MONOLITH_SPLIT_SPRINT_ID = 'stylesheet-monolith-split-2026-05-15'
export const STYLESHEET_MONOLITH_SPLIT_BEFORE_LINES = 9859
export const STYLESHEET_MONOLITH_SPLIT_ROOT_LINE_BUDGET = 5000
export const STYLESHEET_MONOLITH_SPLIT_MODULE_LINE_BUDGET = 5000

export const STYLESHEET_MODULE_PATHS = [
  'public/styles-base-layout.css',
  'public/styles-foundation-core.css',
  'public/styles-foundation-workflows.css',
  'public/styles-strategy-docs.css',
  'public/styles-home-foundation-shell.css',
  'public/styles-strategy-sales.css',
]

export const STYLESHEET_REQUIRED_SELECTORS = [
  ':root',
  '.login-shell',
  '.shell',
  '.ops-filter-bar',
  '.panel',
  '.foundation-stage',
  '.current-sprint-panel',
  '.build-log-list',
  '.source-stack-summary',
  '.markdown-block',
  '.support-meta',
  '.home',
  '.found-shell',
  '.harlan-toggle',
  '@media print',
  '.strategy-export-body',
  '.strategy-v2-hero-copy',
  '.sales-hero',
  '.sales-cohort-table',
]

export function countStylesheetLines(source = '') {
  const text = String(source || '')
  if (!text) return 0
  const newlineCount = (text.match(/\n/g) || []).length
  return newlineCount + (text.endsWith('\n') ? 0 : 1)
}

export function extractStylesheetImports(rootSource = '') {
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

function normalizeModuleSources(moduleSources = {}) {
  const sourceMap = new Map()
  for (const [key, value] of Object.entries(moduleSources || {})) {
    sourceMap.set(key, String(value || ''))
    if (key.startsWith('public/')) sourceMap.set(key.slice('public/'.length), String(value || ''))
  }
  return sourceMap
}

export function combineImportedStylesheets(rootSource = '', moduleSources = {}) {
  const sourceMap = normalizeModuleSources(moduleSources)
  const imports = extractStylesheetImports(rootSource)
  return imports.map(importPath => sourceMap.get(importPath) || sourceMap.get(importPath.replace(/^public\//, '')) || '').join('\n')
}

export async function readCombinedFoundationStylesheet(repoRoot, readText) {
  const rootSource = await readText(repoRoot, 'public/styles.css')
  const moduleSources = {}
  for (const modulePath of STYLESHEET_MODULE_PATHS) moduleSources[modulePath] = await readText(repoRoot, modulePath)
  return combineImportedStylesheets(rootSource, moduleSources) || rootSource
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

export function evaluateStylesheetMonolithSplit({
  rootSource = '',
  moduleSources = {},
  htmlSources = {},
  requiredSelectors = STYLESHEET_REQUIRED_SELECTORS,
  minimumCombinedLines = STYLESHEET_MONOLITH_SPLIT_BEFORE_LINES - 20,
} = {}) {
  const checks = []
  const imports = extractStylesheetImports(rootSource)
  const combinedSource = combineImportedStylesheets(rootSource, moduleSources)
  const rootLines = countStylesheetLines(rootSource)
  const moduleLineCounts = STYLESHEET_MODULE_PATHS.map(modulePath => ({
    path: modulePath,
    lines: countStylesheetLines(moduleSources[modulePath] || ''),
  }))
  const missingModules = STYLESHEET_MODULE_PATHS.filter(modulePath => !String(moduleSources[modulePath] || '').trim())
  const missingSelectors = requiredSelectors.filter(selector => !combinedSource.includes(selector))
  const importOrderMatches = imports.length === STYLESHEET_MODULE_PATHS.length &&
    STYLESHEET_MODULE_PATHS.every((modulePath, index) => imports[index] === modulePath)
  const pagesWithoutRootStylesheet = Object.entries(htmlSources || {})
    .filter(([, source]) => String(source || '').includes('<html'))
    .filter(([, source]) => !String(source || '').includes('styles.css'))
    .map(([path]) => path)

  addCheck(
    checks,
    rootLines > 0 && rootLines < STYLESHEET_MONOLITH_SPLIT_ROOT_LINE_BUDGET,
    'root stylesheet stays below monolith line budget',
    `${rootLines}/${STYLESHEET_MONOLITH_SPLIT_ROOT_LINE_BUDGET}`,
  )
  addCheck(
    checks,
    importOrderMatches,
    'root stylesheet imports modules in preserved cascade order',
    imports.join(' -> '),
  )
  addCheck(
    checks,
    missingModules.length === 0,
    'all stylesheet modules exist with content',
    missingModules.join(', ') || 'all present',
  )
  addCheck(
    checks,
    moduleLineCounts.every(item => item.lines > 0 && item.lines < STYLESHEET_MONOLITH_SPLIT_MODULE_LINE_BUDGET),
    'stylesheet modules stay below monolith line budget',
    moduleLineCounts.map(item => `${item.path}:${item.lines}`).join(', '),
  )
  addCheck(
    checks,
    missingSelectors.length === 0,
    'combined stylesheet preserves required surface selectors',
    missingSelectors.join(', ') || `${requiredSelectors.length} selectors present`,
  )
  addCheck(
    checks,
    countStylesheetLines(combinedSource) >= minimumCombinedLines,
    'combined imported CSS preserves original stylesheet body size',
    `${countStylesheetLines(combinedSource)} lines combined`,
  )
  addCheck(
    checks,
    pagesWithoutRootStylesheet.length === 0,
    'HTML pages continue to load the stable root stylesheet entry point',
    pagesWithoutRootStylesheet.join(', ') || 'all checked pages link styles.css',
  )

  return {
    ok: checks.every(check => check.ok),
    checks,
    imports,
    rootLines,
    moduleLineCounts,
    combinedLines: countStylesheetLines(combinedSource),
    missingSelectors,
    missingModules,
    pagesWithoutRootStylesheet,
  }
}

export function buildStylesheetMonolithSplitDogfoodProof() {
  const moduleSources = Object.fromEntries(STYLESHEET_MODULE_PATHS.map((modulePath, index) => [
    modulePath,
    `${STYLESHEET_REQUIRED_SELECTORS[index % STYLESHEET_REQUIRED_SELECTORS.length]} { color: inherit; }`,
  ]))
  moduleSources[STYLESHEET_MODULE_PATHS[0]] += `\n${STYLESHEET_REQUIRED_SELECTORS.slice(STYLESHEET_MODULE_PATHS.length).join(' { color: inherit; }\n')} { color: inherit; }`
  const goodRoot = STYLESHEET_MODULE_PATHS.map(modulePath => `@import url('./${modulePath.replace('public/', '')}');`).join('\n')
  const htmlSources = { 'public/foundation.html': '<html><link rel="stylesheet" href="/styles.css"></html>' }
  const good = evaluateStylesheetMonolithSplit({ rootSource: goodRoot, moduleSources, htmlSources, minimumCombinedLines: 1 })
  const overlargeRoot = evaluateStylesheetMonolithSplit({
    rootSource: `${goodRoot}\n${Array.from({ length: STYLESHEET_MONOLITH_SPLIT_ROOT_LINE_BUDGET + 1 }, (_, index) => `.x${index}{}`).join('\n')}`,
    moduleSources,
    htmlSources,
    minimumCombinedLines: 1,
  })
  const missingImport = evaluateStylesheetMonolithSplit({
    rootSource: STYLESHEET_MODULE_PATHS.slice(0, -1).map(modulePath => `@import url('./${modulePath.replace('public/', '')}');`).join('\n'),
    moduleSources,
    htmlSources,
    minimumCombinedLines: 1,
  })
  const wrongOrder = evaluateStylesheetMonolithSplit({
    rootSource: [...STYLESHEET_MODULE_PATHS].reverse().map(modulePath => `@import url('./${modulePath.replace('public/', '')}');`).join('\n'),
    moduleSources,
    htmlSources,
    minimumCombinedLines: 1,
  })
  const missingSelectorSources = { ...moduleSources, [STYLESHEET_MODULE_PATHS[0]]: ':root { color: inherit; }' }
  const missingSelector = evaluateStylesheetMonolithSplit({
    rootSource: goodRoot,
    moduleSources: missingSelectorSources,
    htmlSources,
    minimumCombinedLines: 1,
  })
  const overlargeModuleSources = {
    ...moduleSources,
    [STYLESHEET_MODULE_PATHS[1]]: Array.from({ length: STYLESHEET_MONOLITH_SPLIT_MODULE_LINE_BUDGET + 1 }, (_, index) => `.m${index}{}`).join('\n'),
  }
  const overlargeModule = evaluateStylesheetMonolithSplit({
    rootSource: goodRoot,
    moduleSources: overlargeModuleSources,
    htmlSources,
    minimumCombinedLines: 1,
  })

  return {
    ok: good.ok === true &&
      overlargeRoot.ok === false &&
      missingImport.ok === false &&
      wrongOrder.ok === false &&
      missingSelector.ok === false &&
      overlargeModule.ok === false,
    invariant: 'stylesheet split only passes when the root is small, imports are complete/in order, modules stay below budget, and required selectors survive',
    good,
    oldFailures: {
      overlargeRootRejected: overlargeRoot.ok === false,
      missingImportRejected: missingImport.ok === false,
      wrongOrderRejected: wrongOrder.ok === false,
      missingSelectorRejected: missingSelector.ok === false,
      overlargeModuleRejected: overlargeModule.ok === false,
    },
  }
}
