import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export const E2E_STAGING_HARNESS_CARD_ID = 'E2E-STAGING-HARNESS-001'
export const E2E_STAGING_HARNESS_SPRINT_ID = 'e2e-staging-harness-2026-05-16'
export const E2E_STAGING_HARNESS_CLOSEOUT_KEY = 'e2e-staging-harness-v1'
export const E2E_STAGING_HARNESS_PLAN_PATH = 'docs/process/e2e-staging-harness-001-plan.md'
export const E2E_STAGING_HARNESS_APPROVAL_PATH = 'docs/process/approvals/E2E-STAGING-HARNESS-001.json'
export const E2E_STAGING_HARNESS_SCRIPT_PATH = 'scripts/process-e2e-staging-harness-check.mjs'

export const E2E_STAGING_VIEWPORTS = [
  { key: 'desktop', width: 1440, height: 1000 },
  { key: 'mobile', width: 390, height: 844 },
]

export const E2E_STAGING_PAGE_SURFACES = [
  { key: 'foundation', path: '/foundation', minTextLength: 80, maxMs: 5000 },
  { key: 'sales', path: '/sales', minTextLength: 40, maxMs: 5000 },
  { key: 'ops', path: '/ops', minTextLength: 40, maxMs: 5000 },
]

export const E2E_STAGING_API_SURFACES = [
  { key: 'foundation-hub', path: '/api/foundation-hub', maxMs: 2000, maxBytes: 1024 * 1024 },
  { key: 'source-of-truth', path: '/api/source-of-truth', maxMs: 2500, maxBytes: 1024 * 1024 },
  { key: 'current-sprint', path: '/api/foundation/current-sprint', maxMs: 1000, maxBytes: 256 * 1024 },
]

function normalizeText(value) {
  return String(value || '').trim()
}

function byteLength(value = '') {
  return Buffer.byteLength(String(value || ''), 'utf8')
}

function roundMs(value) {
  return Math.round(Number(value || 0) * 10) / 10
}

function joinUrl(baseUrl, routePath) {
  return `${String(baseUrl || '').replace(/\/+$/, '')}${String(routePath || '').startsWith('/') ? routePath : `/${routePath}`}`
}

function safeArtifactName(value = '') {
  return normalizeText(value).replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'surface'
}

function makeFinding(ok, check, detail = '', metadata = {}) {
  return { ok: Boolean(ok), check, detail, metadata }
}

export function evaluateE2eStagingResults(results = {}) {
  const checks = []
  const pageResults = Array.isArray(results.pages) ? results.pages : []
  const apiResults = Array.isArray(results.apis) ? results.apis : []

  checks.push(makeFinding(pageResults.length > 0, 'browser page results exist', `${pageResults.length} page viewport result(s)`))
  checks.push(makeFinding(apiResults.length > 0, 'read API results exist', `${apiResults.length} API result(s)`))

  for (const result of pageResults) {
    const label = `${result.key || 'page'}:${result.viewport || 'viewport'}`
    checks.push(makeFinding(result.status === 200, 'browser page returns HTTP 200', `${label} status=${result.status}`))
    checks.push(makeFinding(Number(result.timeMs) <= Number(result.maxMs || 5000), 'browser page stays inside latency budget', `${label} ${result.timeMs}ms <= ${result.maxMs}ms`))
    checks.push(makeFinding(Number(result.bodyTextLength) >= Number(result.minTextLength || 1), 'browser page renders nonblank body text', `${label} text=${result.bodyTextLength}`))
    checks.push(makeFinding((result.consoleErrors || []).length === 0, 'browser page has no console errors', `${label} errors=${(result.consoleErrors || []).length}`, { consoleErrors: result.consoleErrors || [] }))
    checks.push(makeFinding((result.pageErrors || []).length === 0, 'browser page has no page errors', `${label} errors=${(result.pageErrors || []).length}`, { pageErrors: result.pageErrors || [] }))
    checks.push(makeFinding(Boolean(result.screenshotPath), 'browser page captures temp screenshot path', `${label} ${result.screenshotPath || 'missing'}`))
  }

  for (const result of apiResults) {
    const label = result.key || result.path || 'api'
    checks.push(makeFinding(result.status === 200, 'read API returns HTTP 200', `${label} status=${result.status}`))
    checks.push(makeFinding(Number(result.timeMs) <= Number(result.maxMs || 1000), 'read API stays inside latency budget', `${label} ${result.timeMs}ms <= ${result.maxMs}ms`))
    checks.push(makeFinding(Number(result.bytes) <= Number(result.maxBytes || 1024 * 1024), 'read API stays inside payload budget', `${label} ${result.bytes}B <= ${result.maxBytes}B`))
    checks.push(makeFinding(Boolean(result.jsonLike), 'read API returns JSON-like payload', `${label} jsonLike=${Boolean(result.jsonLike)}`))
  }

  const failures = checks.filter(check => !check.ok)
  return {
    ok: failures.length === 0,
    checks,
    failures,
    summary: {
      pageResults: pageResults.length,
      apiResults: apiResults.length,
      screenshotDir: results.screenshotDir || null,
      failures: failures.length,
    },
  }
}

async function runApiSurface({ baseUrl, surface, timeoutMs = 10000 }) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const started = performance.now()
  try {
    const response = await fetch(joinUrl(baseUrl, surface.path), { signal: controller.signal })
    const text = await response.text()
    let jsonLike = false
    try {
      JSON.parse(text)
      jsonLike = true
    } catch {
      jsonLike = false
    }
    return {
      key: surface.key,
      path: surface.path,
      status: response.status,
      timeMs: roundMs(performance.now() - started),
      bytes: byteLength(text),
      maxMs: surface.maxMs,
      maxBytes: surface.maxBytes,
      jsonLike,
    }
  } catch (error) {
    return {
      key: surface.key,
      path: surface.path,
      status: 0,
      timeMs: roundMs(performance.now() - started),
      bytes: 0,
      maxMs: surface.maxMs,
      maxBytes: surface.maxBytes,
      jsonLike: false,
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function runPageSurface({ browser, baseUrl, surface, viewport, screenshotDir }) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } })
  const consoleErrors = []
  const pageErrors = []
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', error => {
    pageErrors.push(error instanceof Error ? error.message : String(error))
  })
  const started = performance.now()
  let status = 0
  let bodyTextLength = 0
  let screenshotPath = ''
  let error = ''
  try {
    const response = await page.goto(joinUrl(baseUrl, surface.path), {
      waitUntil: 'domcontentloaded',
      timeout: surface.maxMs,
    })
    status = response?.status() || 0
    await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {})
    const bodyText = await page.locator('body').innerText({ timeout: 2000 }).catch(() => '')
    bodyTextLength = normalizeText(bodyText).length
    screenshotPath = path.join(screenshotDir, `${safeArtifactName(surface.key)}-${safeArtifactName(viewport.key)}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: true })
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught)
  } finally {
    await page.close().catch(() => {})
  }

  return {
    key: surface.key,
    path: surface.path,
    viewport: viewport.key,
    status,
    timeMs: roundMs(performance.now() - started),
    maxMs: surface.maxMs,
    minTextLength: surface.minTextLength,
    bodyTextLength,
    consoleErrors,
    pageErrors,
    screenshotPath,
    error,
  }
}

export async function runE2eStagingHarness({
  baseUrl = 'http://localhost:3000',
  pageSurfaces = E2E_STAGING_PAGE_SURFACES,
  apiSurfaces = E2E_STAGING_API_SURFACES,
  viewports = E2E_STAGING_VIEWPORTS,
  screenshotRoot = path.join(os.tmpdir(), 'bcrew-e2e-staging'),
} = {}) {
  const { chromium } = await import('playwright')
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const screenshotDir = path.join(screenshotRoot, timestamp)
  await fs.mkdir(screenshotDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const pages = []
  try {
    for (const surface of pageSurfaces) {
      for (const viewport of viewports) {
        pages.push(await runPageSurface({ browser, baseUrl, surface, viewport, screenshotDir }))
      }
    }
  } finally {
    await browser.close().catch(() => {})
  }

  const apis = []
  for (const surface of apiSurfaces) {
    apis.push(await runApiSurface({ baseUrl, surface, timeoutMs: Math.max(10000, Number(surface.maxMs || 1000) * 4) }))
  }

  const results = {
    ok: false,
    baseUrl,
    screenshotDir,
    pages,
    apis,
  }
  const evaluation = evaluateE2eStagingResults(results)
  return {
    ...results,
    ok: evaluation.ok,
    evaluation,
  }
}

export function buildE2eStagingHarnessDogfoodProof() {
  const good = evaluateE2eStagingResults({
    screenshotDir: '/tmp/bcrew-e2e-staging/synthetic',
    pages: [
      {
        key: 'foundation',
        viewport: 'desktop',
        status: 200,
        timeMs: 100,
        maxMs: 5000,
        bodyTextLength: 300,
        minTextLength: 80,
        consoleErrors: [],
        pageErrors: [],
        screenshotPath: '/tmp/bcrew-e2e-staging/synthetic/foundation-desktop.png',
      },
    ],
    apis: [
      {
        key: 'foundation-hub',
        status: 200,
        timeMs: 75,
        maxMs: 2000,
        bytes: 500000,
        maxBytes: 1024 * 1024,
        jsonLike: true,
      },
    ],
  })
  const blankPage = evaluateE2eStagingResults({
    pages: [
      {
        key: 'foundation',
        viewport: 'desktop',
        status: 200,
        timeMs: 100,
        maxMs: 5000,
        bodyTextLength: 0,
        minTextLength: 80,
        consoleErrors: [],
        pageErrors: [],
        screenshotPath: '/tmp/blank.png',
      },
    ],
    apis: [
      { key: 'foundation-hub', status: 200, timeMs: 75, maxMs: 2000, bytes: 500000, maxBytes: 1024 * 1024, jsonLike: true },
    ],
  })
  const consoleError = evaluateE2eStagingResults({
    pages: [
      {
        key: 'sales',
        viewport: 'mobile',
        status: 200,
        timeMs: 100,
        maxMs: 5000,
        bodyTextLength: 300,
        minTextLength: 40,
        consoleErrors: ['Uncaught TypeError: route is undefined'],
        pageErrors: [],
        screenshotPath: '/tmp/sales-mobile.png',
      },
    ],
    apis: [
      { key: 'foundation-hub', status: 200, timeMs: 75, maxMs: 2000, bytes: 500000, maxBytes: 1024 * 1024, jsonLike: true },
    ],
  })
  const apiBudget = evaluateE2eStagingResults({
    pages: [
      {
        key: 'ops',
        viewport: 'desktop',
        status: 200,
        timeMs: 100,
        maxMs: 5000,
        bodyTextLength: 300,
        minTextLength: 40,
        consoleErrors: [],
        pageErrors: [],
        screenshotPath: '/tmp/ops-desktop.png',
      },
    ],
    apis: [
      { key: 'source-of-truth', status: 200, timeMs: 4000, maxMs: 2500, bytes: 2 * 1024 * 1024, maxBytes: 1024 * 1024, jsonLike: true },
    ],
  })

  return {
    ok: good.ok === true &&
      blankPage.ok === false &&
      consoleError.ok === false &&
      apiBudget.ok === false &&
      blankPage.failures.some(failure => failure.check === 'browser page renders nonblank body text') &&
      consoleError.failures.some(failure => failure.check === 'browser page has no console errors') &&
      apiBudget.failures.some(failure => failure.check === 'read API stays inside latency budget') &&
      apiBudget.failures.some(failure => failure.check === 'read API stays inside payload budget'),
    invariant: 'The harness accepts healthy browser/API results and fails closed on blank renders, console errors, and slow or oversized read APIs.',
    good,
    oldFailures: {
      blankPageRejected: blankPage.ok === false,
      consoleErrorRejected: consoleError.ok === false,
      apiBudgetRejected: apiBudget.ok === false,
    },
  }
}
