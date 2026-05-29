import fs from 'node:fs/promises'
import path from 'node:path'

export const AGENTIC_CODEBASE_MAP_CARD_ID = 'AGENTIC-CODEBASE-MAP-001'
export const AGENTIC_CODEBASE_MAP_SCRIPT_PATH = 'scripts/process-agentic-codebase-map-check.mjs'
export const AGENTIC_CODEBASE_MAP_PLAN_PATH = 'docs/process/agentic-codebase-map-001-plan.md'
export const AGENTIC_CODEBASE_MAP_VERSION = 'agentic-codebase-map-v1'

export const AGENTIC_CODEBASE_INCLUDE_ROOTS = Object.freeze([
  'server.js',
  'package.json',
  'AGENTS.md',
  'lib',
  'scripts',
  'public',
  'docs/rebuild',
  'docs/process',
  'docs/source-notes',
  'ops/launchagents',
])

export const AGENTIC_CODEBASE_EXCLUDE_PATHS = Object.freeze([
  '.git',
  '.claude',
  '.openclaw',
  '.env',
  'node_modules',
  'memory',
  'MEMORY.md',
  'USER.md',
  'TOOLS.md',
  'IDENTITY.md',
  'HEARTBEAT.md',
  'docs/_archive',
  'docs/conversation-archive',
  'public/assets',
])

const EXTENSIONS = new Set(['.js', '.mjs', '.json', '.md', '.css', '.html'])

const CRITICAL_SURFACES = Object.freeze([
  { path: 'server.js', purpose: 'HTTP/API entrypoint' },
  { path: 'lib/dev-team-hub.js', purpose: 'Dev page read model' },
  { path: 'public/dev.js', purpose: 'Dev page client rendering' },
  { path: 'lib/foundation-db.js', purpose: 'live Postgres access layer' },
  { path: 'scripts/foundation-verify.mjs', purpose: 'Foundation verifier' },
  { path: 'scripts/process-foundation-ship.mjs', purpose: 'ship gate wrapper' },
  { path: 'lib/foundation-jobs.js', purpose: 'scheduled job registry' },
  { path: 'scripts/foundation-worker.mjs', purpose: 'scheduled worker runtime' },
  { path: 'lib/source-browser-agent-harness.js', purpose: 'Source Browser Agent planner' },
  { path: 'lib/source-browser-agent-executor.js', purpose: 'Source Browser Agent executor' },
  { path: 'lib/source-session-broker.js', purpose: 'source session/auth broker' },
  { path: 'lib/youtube-creator-god-mode-catchup.js', purpose: 'YouTube source SOP readback' },
  { path: 'lib/youtube-god-mode-autonomous-watch-scheduler.js', purpose: 'YouTube autopilot scheduler' },
])

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function normalizeRelativePath(value = '') {
  return text(value).replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+/g, '/')
}

function pathIsExcluded(relativePath = '') {
  const normalized = normalizeRelativePath(relativePath)
  return AGENTIC_CODEBASE_EXCLUDE_PATHS.some(excluded => {
    const root = normalizeRelativePath(excluded)
    return normalized === root || normalized.startsWith(`${root}/`)
  })
}

function categoryForFile(relativePath = '') {
  const normalized = normalizeRelativePath(relativePath)
  if (normalized === 'server.js') return 'server'
  if (normalized === 'package.json') return 'config'
  if (normalized.startsWith('scripts/process-')) return 'process_check'
  if (normalized.startsWith('scripts/run-')) return 'runner_cli'
  if (normalized.startsWith('scripts/')) return 'script'
  if (normalized.startsWith('public/')) return 'frontend'
  if (normalized.startsWith('docs/process/')) return 'process_doc'
  if (normalized.startsWith('docs/rebuild/')) return 'current_doctrine'
  if (normalized.startsWith('docs/source-notes/')) return 'source_note'
  if (normalized.startsWith('ops/')) return 'ops'
  if (normalized.startsWith('lib/')) return 'library'
  if (normalized.endsWith('.md')) return 'doc'
  return 'other'
}

function surfaceForFile(relativePath = '') {
  const normalized = normalizeRelativePath(relativePath)
  if (/youtube|video/i.test(normalized)) return 'youtube_extraction'
  if (/source-browser|source-god-mode|source-session|skool|newsletter|repo-deep/i.test(normalized)) return 'source_browser'
  if (/harlan|agent|capability|template/i.test(normalized)) return 'agent_runtime'
  if (/foundation-verify|verifier|verify/i.test(normalized)) return 'verification'
  if (/dev-team|build-intel|director|scoper|portfolio/i.test(normalized)) return 'dev_intelligence'
  if (/foundation-db|source-crawl|postgres|credential/i.test(normalized)) return 'data_access'
  if (/public\/dev|dev\.css|dev-team-hub/i.test(normalized)) return 'dev_page'
  if (/foundation-worker|foundation-jobs|launchagents/i.test(normalized)) return 'scheduled_runtime'
  return 'general'
}

function extractJsImports(source = '') {
  const imports = new Set()
  const importRe = /\bimport\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/g
  let match = null
  while ((match = importRe.exec(source))) imports.add(match[1])
  return Array.from(imports).slice(0, 40)
}

function extractJsExports(source = '') {
  const exports = new Set()
  const namedExportRe = /\bexport\s+(?:async\s+)?(?:function|const|class)\s+([A-Za-z0-9_]+)/g
  const listExportRe = /\bexport\s*\{([^}]+)\}/g
  let match = null
  while ((match = namedExportRe.exec(source))) exports.add(match[1])
  while ((match = listExportRe.exec(source))) {
    for (const part of match[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/i)[1] || part.trim().split(/\s+/)[0]
      if (name) exports.add(name)
    }
  }
  return Array.from(exports).slice(0, 60)
}

function extractMarkdownHeadings(source = '') {
  return String(source || '')
    .split('\n')
    .filter(line => /^#{1,3}\s+/.test(line))
    .map(line => line.replace(/^#{1,3}\s+/, '').trim())
    .filter(Boolean)
    .slice(0, 20)
}

function packageScriptSummary(packageJson = {}) {
  const scripts = packageJson.scripts || {}
  const entries = Object.keys(scripts).sort()
  return {
    count: entries.length,
    sourceScripts: entries.filter(key => key.startsWith('source:')).slice(0, 120),
    processChecks: entries.filter(key => key.startsWith('process:')).slice(0, 360),
    extractionScripts: entries.filter(key => /youtube|source|skool|newsletter|repo|browser/i.test(key)).slice(0, 240),
  }
}

async function safeRead(relativePath, repoRoot) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function collectFilesFromRoot(root, repoRoot, files, { maxFiles }) {
  const relativeRoot = normalizeRelativePath(root)
  if (!relativeRoot || pathIsExcluded(relativeRoot) || files.length >= maxFiles) return
  const absolute = path.join(repoRoot, relativeRoot)
  let stat = null
  try {
    stat = await fs.stat(absolute)
  } catch {
    return
  }
  if (stat.isFile()) {
    if (EXTENSIONS.has(path.extname(relativeRoot))) files.push(relativeRoot)
    return
  }
  if (!stat.isDirectory()) return
  const entries = await fs.readdir(absolute, { withFileTypes: true })
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (files.length >= maxFiles) break
    const child = normalizeRelativePath(path.join(relativeRoot, entry.name))
    if (pathIsExcluded(child)) continue
    if (entry.isDirectory()) {
      await collectFilesFromRoot(child, repoRoot, files, { maxFiles })
    } else if (entry.isFile() && EXTENSIONS.has(path.extname(child))) {
      files.push(child)
    }
  }
}

async function collectIncludedFiles(repoRoot, { maxFiles = 5000 } = {}) {
  const files = []
  for (const root of AGENTIC_CODEBASE_INCLUDE_ROOTS) {
    await collectFilesFromRoot(root, repoRoot, files, { maxFiles })
  }
  return Array.from(new Set(files)).sort()
}

async function summarizeFile(relativePath, repoRoot) {
  const source = await safeRead(relativePath, repoRoot)
  const ext = path.extname(relativePath)
  const lines = source.split('\n').length
  const summary = {
    path: relativePath,
    category: categoryForFile(relativePath),
    surface: surfaceForFile(relativePath),
    ext,
    bytes: Buffer.byteLength(source, 'utf8'),
    lines,
    sizeRisk: lines >= 10000 ? 'danger_10k' : lines >= 5000 ? 'split_required_5k' : lines >= 3000 ? 'warn_3k' : 'normal',
  }
  if (['.js', '.mjs'].includes(ext)) {
    summary.imports = extractJsImports(source)
    summary.exports = extractJsExports(source)
  }
  if (ext === '.md') summary.headings = extractMarkdownHeadings(source)
  return summary
}

export async function buildAgenticCodebaseMap({
  repoRoot = process.cwd(),
  maxFiles = 5000,
  generatedAt = new Date().toISOString(),
} = {}) {
  const files = await collectIncludedFiles(repoRoot, { maxFiles })
  const fileSummaries = []
  for (const relativePath of files) fileSummaries.push(await summarizeFile(relativePath, repoRoot))

  let packageJson = {}
  try {
    packageJson = JSON.parse(await safeRead('package.json', repoRoot))
  } catch {}

  const byCategory = {}
  const bySurface = {}
  for (const file of fileSummaries) {
    byCategory[file.category] = (byCategory[file.category] || 0) + 1
    bySurface[file.surface] = (bySurface[file.surface] || 0) + 1
  }
  const includedPaths = new Set(fileSummaries.map(file => file.path))
  const criticalSurfaces = CRITICAL_SURFACES.map(surface => ({
    ...surface,
    present: includedPaths.has(surface.path),
  }))
  const sizeRisks = fileSummaries
    .filter(file => file.sizeRisk !== 'normal')
    .sort((left, right) => right.lines - left.lines)
    .slice(0, 60)
  const importEdges = fileSummaries
    .filter(file => list(file.imports).length)
    .flatMap(file => list(file.imports).map(importPath => ({ from: file.path, to: importPath })))
    .slice(0, 600)

  return {
    ok: true,
    version: AGENTIC_CODEBASE_MAP_VERSION,
    cardId: AGENTIC_CODEBASE_MAP_CARD_ID,
    generatedAt,
    includeRoots: AGENTIC_CODEBASE_INCLUDE_ROOTS,
    excludedPaths: AGENTIC_CODEBASE_EXCLUDE_PATHS,
    privacy: {
      privateLocalFilesExcluded: ['MEMORY.md', 'USER.md', 'TOOLS.md', 'memory/', '.openclaw/', '.claude/', '.env'],
      includedPrivatePathCount: fileSummaries.filter(file => pathIsExcluded(file.path)).length,
      archiveIncluded: fileSummaries.some(file => file.path.startsWith('docs/_archive/') || file.path.startsWith('docs/conversation-archive/')),
      rawSecretScan: 'not_run_by_design; this map stores structure, exports, headings, and counts, not file bodies',
    },
    summary: {
      fileCount: fileSummaries.length,
      totalLines: fileSummaries.reduce((sum, file) => sum + file.lines, 0),
      totalBytes: fileSummaries.reduce((sum, file) => sum + file.bytes, 0),
      categoryCount: Object.keys(byCategory).length,
      surfaceCount: Object.keys(bySurface).length,
      criticalSurfaceCount: criticalSurfaces.length,
      criticalSurfacePresentCount: criticalSurfaces.filter(surface => surface.present).length,
      sizeRiskCount: sizeRisks.length,
      importEdgeCount: importEdges.length,
    },
    readFirst: [
      'AGENTS.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
      'docs/rebuild/current-runtime-map.md',
      'docs/source-notes/source-browser-agent-protocol-scope-2026-05-28.md',
      'docs/handoffs/2026-05-28-agentic-codebase-map.md',
    ],
    scripts: packageScriptSummary(packageJson),
    byCategory,
    bySurface,
    criticalSurfaces,
    sizeRisks,
    importEdges,
    files: fileSummaries,
  }
}

export function evaluateAgenticCodebaseMap(map = {}) {
  const checks = []
  const add = (ok, check, detail = '') => checks.push({ ok: Boolean(ok), check, detail })
  const files = list(map.files)
  const critical = list(map.criticalSurfaces)
  add(map.version === AGENTIC_CODEBASE_MAP_VERSION, 'map_version_current', map.version || 'missing')
  add(files.length > 100, 'map_has_meaningful_repo_coverage', String(files.length))
  add(files.every(file => !pathIsExcluded(file.path)), 'private_and_local_paths_excluded', String(files.filter(file => pathIsExcluded(file.path)).length))
  add(map.privacy?.archiveIncluded === false, 'archive_and_conversation_exports_excluded', String(map.privacy?.archiveIncluded))
  add(critical.every(surface => surface.present), 'critical_surfaces_present', `${critical.filter(surface => surface.present).length}/${critical.length}`)
  add(list(map.scripts?.sourceScripts).includes('source:browser-agent'), 'source_browser_agent_script_visible', 'source:browser-agent')
  add(list(map.scripts?.processChecks).includes('process:source-browser-agent-harness-check'), 'source_browser_harness_proof_visible', 'process:source-browser-agent-harness-check')
  add(files.some(file => file.path === 'docs/source-notes/understand-anything-repo-eval-2026-05-28.md'), 'understand_anything_eval_visible_without_install', 'docs/source-notes/understand-anything-repo-eval-2026-05-28.md')
  add(!files.some(file => /knowledge-graph\.json$|\.understand-anything\//.test(file.path)), 'no_generated_understand_anything_graph_committed', 'no generated graph path included')
  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    status: failed.length ? 'unhealthy' : 'healthy',
    checks,
    failed,
  }
}

export function buildAgenticCodebaseMapDogfoodProof() {
  const healthy = evaluateAgenticCodebaseMap({
    version: AGENTIC_CODEBASE_MAP_VERSION,
    privacy: { archiveIncluded: false },
    files: [
      ...Array.from({ length: 120 }, (_, index) => ({ path: `lib/example-${index}.js` })),
      { path: 'docs/source-notes/understand-anything-repo-eval-2026-05-28.md' },
    ],
    criticalSurfaces: CRITICAL_SURFACES.map(surface => ({ ...surface, present: true })),
    scripts: {
      sourceScripts: ['source:browser-agent'],
      processChecks: ['process:source-browser-agent-harness-check'],
    },
  })
  const leaksPrivate = evaluateAgenticCodebaseMap({
    version: AGENTIC_CODEBASE_MAP_VERSION,
    privacy: { archiveIncluded: false },
    files: [
      ...Array.from({ length: 120 }, (_, index) => ({ path: `lib/example-${index}.js` })),
      { path: 'MEMORY.md' },
      { path: 'docs/source-notes/understand-anything-repo-eval-2026-05-28.md' },
    ],
    criticalSurfaces: CRITICAL_SURFACES.map(surface => ({ ...surface, present: true })),
    scripts: {
      sourceScripts: ['source:browser-agent'],
      processChecks: ['process:source-browser-agent-harness-check'],
    },
  })
  const missingCritical = evaluateAgenticCodebaseMap({
    version: AGENTIC_CODEBASE_MAP_VERSION,
    privacy: { archiveIncluded: false },
    files: [
      ...Array.from({ length: 120 }, (_, index) => ({ path: `lib/example-${index}.js` })),
      { path: 'docs/source-notes/understand-anything-repo-eval-2026-05-28.md' },
    ],
    criticalSurfaces: CRITICAL_SURFACES.map((surface, index) => ({ ...surface, present: index !== 0 })),
    scripts: {
      sourceScripts: ['source:browser-agent'],
      processChecks: ['process:source-browser-agent-harness-check'],
    },
  })
  return {
    ok: healthy.ok === true && leaksPrivate.ok === false && missingCritical.ok === false,
    healthy,
    leaksPrivate,
    missingCritical,
    invariant: 'Repo maps are useful only when they cover core surfaces, exclude private/local paths, and do not commit generated third-party graphs.',
  }
}
