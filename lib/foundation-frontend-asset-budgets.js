import fs from 'node:fs/promises'
import path from 'node:path'
import zlib from 'node:zlib'

export const FOUNDATION_FRONTEND_ASSET_BUDGET_CARD_ID = 'FOUNDATION-FRONTEND-ASSET-BUDGET-001'
export const FOUNDATION_FRONTEND_ASSET_BUDGET_CLOSEOUT_KEY = 'foundation-frontend-asset-budget-v1'
export const FOUNDATION_FRONTEND_ASSET_BUDGET_PLAN_PATH = 'docs/process/foundation-frontend-asset-budget-001-plan.md'
export const FOUNDATION_FRONTEND_ASSET_BUDGET_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-FRONTEND-ASSET-BUDGET-001.json'
export const FOUNDATION_FRONTEND_ASSET_BUDGET_SCRIPT_PATH = 'scripts/process-foundation-frontend-asset-budget-check.mjs'
export const FOUNDATION_FRONTEND_ASSET_BUDGET_SPRINT_ID = 'foundation-frontend-asset-budget-2026-05-16'
export const FOUNDATION_FRONTEND_PAGE_PATH = 'public/foundation.html'

export const FOUNDATION_FRONTEND_ASSET_BUDGETS = Object.freeze({
  singleJsRawWarnBytes: 650_000,
  singleJsRawRiskBytes: 1_000_000,
  singleCssRawWarnBytes: 250_000,
  singleCssRawRiskBytes: 500_000,
  totalRawWarnBytes: 800_000,
  totalRawRiskBytes: 1_500_000,
  totalGzipWarnBytes: 220_000,
  totalGzipRiskBytes: 450_000,
  noStoreReviewMinBytes: 100_000,
})

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeHref(value = '') {
  const href = normalizeText(value)
  if (!href || !href.startsWith('/')) return ''
  return href.split('#')[0]
}

function stripQuery(value = '') {
  return normalizeText(value).split('?')[0]
}

function publicPathForHref(href = '') {
  const clean = stripQuery(href).replace(/^\/+/, '')
  return clean ? `public/${clean}` : ''
}

function assetTypeForPath(relativePath = '') {
  if (/\.js$/i.test(relativePath)) return 'script'
  if (/\.css$/i.test(relativePath)) return 'style'
  if (/\.html$/i.test(relativePath)) return 'html'
  return 'asset'
}

function assetKey(relativePath = '') {
  return normalizeText(relativePath)
    .replace(/^public\//, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'missing-asset'
}

function lineCount(text = '') {
  return text ? String(text).split(/\r?\n/).length : 0
}

function bytesOf(text = '') {
  return Buffer.byteLength(String(text), 'utf8')
}

function gzipBytesOf(text = '') {
  return zlib.gzipSync(Buffer.from(String(text), 'utf8')).length
}

function statusRank(status = '') {
  if (status === 'risk') return 2
  if (status === 'review') return 1
  return 0
}

function chooseStatus(statuses = []) {
  return statuses.reduce((winner, status) => statusRank(status) > statusRank(winner) ? status : winner, 'healthy')
}

function classifyAssetMetric(metric = {}, budgets = FOUNDATION_FRONTEND_ASSET_BUDGETS) {
  if (metric.missing === true || metric.httpStatus >= 400 || metric.httpStatus === 0) {
    return {
      status: 'risk',
      severity: 'P1',
      reason: `${metric.href || metric.path || 'Foundation asset'} is missing or not served successfully.`,
    }
  }

  const type = metric.type || assetTypeForPath(metric.path)
  const rawBytes = Number(metric.bytes || metric.rawBytes || 0)
  const gzipBytes = Number(metric.gzipBytes || 0)
  const cacheControl = normalizeText(metric.cacheControl).toLowerCase()
  const jsRisk = type === 'script' && rawBytes > budgets.singleJsRawRiskBytes
  const cssRisk = type === 'style' && rawBytes > budgets.singleCssRawRiskBytes
  const jsWarn = type === 'script' && rawBytes > budgets.singleJsRawWarnBytes
  const cssWarn = type === 'style' && rawBytes > budgets.singleCssRawWarnBytes
  const noStore = /no-store|no-cache|max-age=0/.test(cacheControl)
  const cacheMissing = ['script', 'style'].includes(type) && metric.served === true && !cacheControl

  if (jsRisk || cssRisk) {
    return {
      status: 'risk',
      severity: 'P1',
      reason: `${metric.path} is ${rawBytes}B raw, above the ${type === 'script' ? budgets.singleJsRawRiskBytes : budgets.singleCssRawRiskBytes}B risk budget.`,
    }
  }
  if (jsWarn || cssWarn) {
    return {
      status: 'review',
      severity: 'P2',
      reason: `${metric.path} is ${rawBytes}B raw, above the ${type === 'script' ? budgets.singleJsRawWarnBytes : budgets.singleCssRawWarnBytes}B warning budget.`,
    }
  }
  if (['script', 'style'].includes(type) && noStore && rawBytes > budgets.noStoreReviewMinBytes) {
    return {
      status: 'review',
      severity: 'P2',
      reason: `${metric.path} is ${rawBytes}B and is served with cache-control "${metric.cacheControl}".`,
    }
  }
  if (cacheMissing) {
    return {
      status: 'review',
      severity: 'P3',
      reason: `${metric.path} is served without an explicit cache-control header.`,
    }
  }
  return {
    status: 'healthy',
    severity: 'P3',
    reason: `${metric.path} is inside the frontend asset budget.`,
    gzipBytes,
  }
}

function classifyAggregate(summary = {}, budgets = FOUNDATION_FRONTEND_ASSET_BUDGETS) {
  if (summary.totalBytes > budgets.totalRawRiskBytes) {
    return {
      status: 'risk',
      severity: 'P1',
      reason: `Foundation frontend assets total ${summary.totalBytes}B raw, above the ${budgets.totalRawRiskBytes}B risk budget.`,
    }
  }
  if (summary.totalGzipBytes > budgets.totalGzipRiskBytes) {
    return {
      status: 'risk',
      severity: 'P1',
      reason: `Foundation frontend assets total ${summary.totalGzipBytes}B gzip, above the ${budgets.totalGzipRiskBytes}B risk budget.`,
    }
  }
  if (summary.totalBytes > budgets.totalRawWarnBytes) {
    return {
      status: 'review',
      severity: 'P2',
      reason: `Foundation frontend assets total ${summary.totalBytes}B raw, above the ${budgets.totalRawWarnBytes}B warning budget.`,
    }
  }
  if (summary.totalGzipBytes > budgets.totalGzipWarnBytes) {
    return {
      status: 'review',
      severity: 'P2',
      reason: `Foundation frontend assets total ${summary.totalGzipBytes}B gzip, above the ${budgets.totalGzipWarnBytes}B warning budget.`,
    }
  }
  return {
    status: 'healthy',
    severity: 'P3',
    reason: 'Foundation frontend aggregate assets are inside budget.',
  }
}

export function discoverFoundationFrontendAssetRefs(htmlText = '') {
  const refs = []
  const seen = new Set()
  const source = String(htmlText || '')
  const tagPattern = /<(script|link)\b[^>]*(?:src|href)=["']([^"']+)["'][^>]*>/gi
  for (const match of source.matchAll(tagPattern)) {
    const tag = match[1].toLowerCase()
    const href = normalizeHref(match[2])
    if (!href) continue
    const pathFromHref = publicPathForHref(href)
    const type = assetTypeForPath(pathFromHref)
    if (tag === 'link' && type !== 'style') continue
    if (tag === 'script' && type !== 'script') continue
    const key = `${type}:${pathFromHref}`
    if (seen.has(key)) continue
    seen.add(key)
    refs.push({
      href,
      path: pathFromHref,
      type,
    })
  }
  if (!seen.has('html:public/foundation.html')) {
    refs.unshift({
      href: '/foundation',
      path: FOUNDATION_FRONTEND_PAGE_PATH,
      type: 'html',
    })
  }
  return refs
}

export function buildFoundationFrontendAssetBudgetSnapshot({
  assets = [],
  generatedAt = new Date().toISOString(),
  source = 'provided_assets',
  sourcePath = null,
  budgets = FOUNDATION_FRONTEND_ASSET_BUDGETS,
} = {}) {
  const rows = assets.map(asset => {
    const metric = {
      href: normalizeText(asset.href),
      path: normalizeText(asset.path),
      type: asset.type || assetTypeForPath(asset.path),
      bytes: Number(asset.bytes || asset.rawBytes || 0),
      gzipBytes: Number(asset.gzipBytes || 0),
      lines: Number(asset.lines || 0),
      served: asset.served === true,
      httpStatus: asset.httpStatus ?? null,
      cacheControl: normalizeText(asset.cacheControl),
      contentType: normalizeText(asset.contentType),
      missing: asset.missing === true,
    }
    const classification = classifyAssetMetric(metric, budgets)
    return {
      ...metric,
      key: assetKey(metric.path || metric.href),
      status: classification.status,
      severity: classification.severity,
      reason: classification.reason,
    }
  })

  const summary = {
    assetCount: rows.length,
    scriptCount: rows.filter(row => row.type === 'script').length,
    styleCount: rows.filter(row => row.type === 'style').length,
    htmlCount: rows.filter(row => row.type === 'html').length,
    totalBytes: rows.reduce((sum, row) => sum + (row.bytes || 0), 0),
    totalGzipBytes: rows.reduce((sum, row) => sum + (row.gzipBytes || 0), 0),
    largestAssetBytes: Math.max(0, ...rows.map(row => row.bytes || 0)),
    largestAssetPath: rows.slice().sort((left, right) => (right.bytes || 0) - (left.bytes || 0))[0]?.path || null,
    noStoreCount: rows.filter(row => /no-store|no-cache|max-age=0/i.test(row.cacheControl || '')).length,
    missingCount: rows.filter(row => row.missing === true || row.httpStatus >= 400 || row.httpStatus === 0).length,
    healthyCount: rows.filter(row => row.status === 'healthy').length,
    reviewCount: rows.filter(row => row.status === 'review').length,
    riskCount: rows.filter(row => row.status === 'risk').length,
  }
  const aggregate = classifyAggregate(summary, budgets)
  const rowFindings = rows
    .filter(row => row.status !== 'healthy')
    .map(row => ({
      id: `frontend_asset_budget_${row.key}`,
      severity: row.severity,
      status: row.status,
      title: `${row.path || row.href} frontend asset budget is ${row.status}`,
      detail: row.reason,
      path: row.path,
      href: row.href,
      source: 'foundation_frontend_asset_budget',
      autoFix: false,
      autoBacklogMutation: false,
    }))
  const findings = [
    ...(aggregate.status === 'healthy' ? [] : [{
      id: 'frontend_asset_budget_aggregate',
      severity: aggregate.severity,
      status: aggregate.status,
      title: `Foundation frontend aggregate asset budget is ${aggregate.status}`,
      detail: aggregate.reason,
      source: 'foundation_frontend_asset_budget',
      autoFix: false,
      autoBacklogMutation: false,
    }]),
    ...rowFindings,
  ]
  const status = chooseStatus([aggregate.status, ...rows.map(row => row.status)])

  return {
    generatedAt,
    cardId: FOUNDATION_FRONTEND_ASSET_BUDGET_CARD_ID,
    closeoutKey: FOUNDATION_FRONTEND_ASSET_BUDGET_CLOSEOUT_KEY,
    reportOnly: true,
    readOnly: true,
    autoFixes: false,
    writesBacklog: false,
    source,
    sourcePath,
    status,
    budgets,
    summary,
    rows,
    findings,
    plainEnglish: findings.length
      ? 'Foundation frontend asset budgets need review before treating split frontend work as clean.'
      : 'Foundation frontend assets are inside budget.',
  }
}

export async function measureFoundationFrontendAssetsFromRepo({
  repoRoot = process.cwd(),
  htmlPath = FOUNDATION_FRONTEND_PAGE_PATH,
  htmlText = null,
} = {}) {
  const sourceHtml = htmlText ?? await fs.readFile(path.join(repoRoot, htmlPath), 'utf8')
  const refs = discoverFoundationFrontendAssetRefs(sourceHtml)
  const assets = []
  for (const ref of refs) {
    const absolutePath = path.join(repoRoot, ref.path)
    try {
      const text = await fs.readFile(absolutePath, 'utf8')
      assets.push({
        ...ref,
        bytes: bytesOf(text),
        gzipBytes: gzipBytesOf(text),
        lines: lineCount(text),
      })
    } catch {
      assets.push({
        ...ref,
        missing: true,
        bytes: 0,
        gzipBytes: 0,
        lines: 0,
      })
    }
  }
  return buildFoundationFrontendAssetBudgetSnapshot({
    assets,
    source: 'repo_foundation_html',
    sourcePath: htmlPath,
  })
}

async function fetchAssetMetric({ baseUrl, ref, timeoutMs }) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(new URL(ref.href, baseUrl), { signal: controller.signal })
    const body = Buffer.from(await response.arrayBuffer())
    return {
      ...ref,
      served: true,
      httpStatus: response.status,
      cacheControl: response.headers.get('cache-control') || '',
      contentType: response.headers.get('content-type') || '',
      servedBytes: body.length,
      missing: !response.ok,
    }
  } catch (error) {
    return {
      ...ref,
      served: true,
      httpStatus: 0,
      cacheControl: '',
      contentType: '',
      servedBytes: 0,
      missing: true,
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    clearTimeout(timer)
  }
}

export async function measureFoundationFrontendAssetsFromServer({
  repoRoot = process.cwd(),
  baseUrl = 'http://localhost:3000',
  timeoutMs = 5000,
} = {}) {
  const sourceHtml = await fs.readFile(path.join(repoRoot, FOUNDATION_FRONTEND_PAGE_PATH), 'utf8')
  const refs = discoverFoundationFrontendAssetRefs(sourceHtml)
  const repoSnapshot = await measureFoundationFrontendAssetsFromRepo({ repoRoot, htmlText: sourceHtml })
  const servedMetrics = await Promise.all(refs.map(ref => fetchAssetMetric({ baseUrl, ref, timeoutMs })))
  const servedByPath = new Map(servedMetrics.map(metric => [metric.path, metric]))
  const assets = repoSnapshot.rows.map(row => ({
    ...row,
    ...(servedByPath.get(row.path) || {}),
  }))
  return buildFoundationFrontendAssetBudgetSnapshot({
    assets,
    source: 'live_foundation_static_assets',
    sourcePath: FOUNDATION_FRONTEND_PAGE_PATH,
  })
}

export function buildFoundationFrontendAssetBudgetDogfoodProof() {
  const healthy = buildFoundationFrontendAssetBudgetSnapshot({
    assets: [
      { href: '/foundation', path: 'public/foundation.html', type: 'html', bytes: 20_000, gzipBytes: 5_000, lines: 200, served: true, httpStatus: 200, cacheControl: 'no-store' },
      { href: '/foundation.js', path: 'public/foundation.js', type: 'script', bytes: 200_000, gzipBytes: 45_000, lines: 1800, served: true, httpStatus: 200, cacheControl: 'public, max-age=300' },
      { href: '/styles.css', path: 'public/styles.css', type: 'style', bytes: 40_000, gzipBytes: 8_000, lines: 400, served: true, httpStatus: 200, cacheControl: 'public, max-age=300' },
    ],
    generatedAt: 'synthetic',
  })
  const oversizedScript = buildFoundationFrontendAssetBudgetSnapshot({
    assets: [
      { href: '/foundation.js', path: 'public/foundation.js', type: 'script', bytes: 1_200_001, gzipBytes: 100_000, lines: 9000, served: true, httpStatus: 200, cacheControl: 'public, max-age=300' },
    ],
    generatedAt: 'synthetic',
  })
  const noStoreLargeScript = buildFoundationFrontendAssetBudgetSnapshot({
    assets: [
      { href: '/foundation.js', path: 'public/foundation.js', type: 'script', bytes: 180_000, gzipBytes: 35_000, lines: 1900, served: true, httpStatus: 200, cacheControl: 'no-store' },
    ],
    generatedAt: 'synthetic',
  })
  const missingAsset = buildFoundationFrontendAssetBudgetSnapshot({
    assets: [
      { href: '/missing.js', path: 'public/missing.js', type: 'script', missing: true, served: true, httpStatus: 404 },
    ],
    generatedAt: 'synthetic',
  })
  const aggregateBloat = buildFoundationFrontendAssetBudgetSnapshot({
    assets: [
      { href: '/a.js', path: 'public/a.js', type: 'script', bytes: 760_000, gzipBytes: 160_000, served: true, httpStatus: 200, cacheControl: 'public, max-age=300' },
      { href: '/b.js', path: 'public/b.js', type: 'script', bytes: 760_000, gzipBytes: 160_000, served: true, httpStatus: 200, cacheControl: 'public, max-age=300' },
    ],
    generatedAt: 'synthetic',
  })

  return {
    ok: healthy.status === 'healthy' &&
      oversizedScript.status === 'risk' &&
      oversizedScript.findings.some(finding => finding.id === 'frontend_asset_budget_foundation-js' && finding.status === 'risk') &&
      noStoreLargeScript.status === 'review' &&
      noStoreLargeScript.findings.some(finding => /no-store/.test(finding.detail)) &&
      missingAsset.status === 'risk' &&
      missingAsset.summary.missingCount === 1 &&
      aggregateBloat.status === 'risk' &&
      aggregateBloat.findings.some(finding => finding.id === 'frontend_asset_budget_aggregate'),
    healthy,
    oversizedScript,
    noStoreLargeScript,
    missingAsset,
    aggregateBloat,
    invariant: 'Frontend asset budgets accept healthy split assets, reject oversized/missing assets, warn on large no-store assets, and reject aggregate bloat without mutating UI, backlog, or runtime state.',
  }
}
