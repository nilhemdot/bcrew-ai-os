import fs from 'node:fs/promises'
import path from 'node:path'

import {
  CODE_QUALITY_NIGHTLY_AUDIT_REQUIRED_ENDPOINTS,
  classifyEndpointMetric,
  measureFoundationEndpoint,
} from './code-quality-nightly-audit.js'

export const FOUNDATION_ENDPOINT_BUDGETS_CARD_ID = 'FOUNDATION-ENDPOINT-BUDGETS-001'
export const FOUNDATION_ENDPOINT_BUDGETS_CLOSEOUT_KEY = 'foundation-endpoint-budgets-v1'
export const FOUNDATION_ENDPOINT_BUDGETS_PLAN_PATH = 'docs/process/foundation-endpoint-budgets-001-plan.md'
export const FOUNDATION_ENDPOINT_BUDGETS_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-ENDPOINT-BUDGETS-001.json'
export const FOUNDATION_ENDPOINT_BUDGETS_SCRIPT_PATH = 'scripts/process-foundation-endpoint-budgets-check.mjs'
export const FOUNDATION_ENDPOINT_BUDGETS_SPRINT_ID = 'foundation-endpoint-budgets-2026-05-16'

export const FOUNDATION_ENDPOINT_BUDGET_ROUTES = Object.freeze([...CODE_QUALITY_NIGHTLY_AUDIT_REQUIRED_ENDPOINTS])

function normalizeNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function endpointKey(endpoint = '') {
  return String(endpoint || '')
    .replace(/^\/+/, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'missing-endpoint'
}

function rowStatusFromRisk(risk = {}) {
  if (risk.status === 'risk') return 'risk'
  if (risk.status === 'warning') return 'review'
  if (risk.status === 'healthy') return 'healthy'
  return 'review'
}

export function normalizeEndpointBudgetMetric(metric = {}, generatedAt = new Date().toISOString()) {
  const endpoint = String(metric.endpoint || '').trim()
  if (!endpoint || metric.skipped) {
    return {
      endpoint: endpoint || 'missing',
      key: endpointKey(endpoint),
      status: 'review',
      riskStatus: 'missing',
      severity: 'P2',
      reason: metric.reason || 'Endpoint metric was not recorded by the latest audit.',
      measuredAt: generatedAt,
      ok: false,
      httpStatus: metric.status ?? null,
      durationMs: normalizeNumber(metric.durationMs),
      payloadBytes: normalizeNumber(metric.payloadBytes),
      timeout: metric.timeout === true,
      timeoutMs: normalizeNumber(metric.timeoutMs),
    }
  }

  const risk = metric.risk || classifyEndpointMetric(metric)
  return {
    endpoint,
    key: endpointKey(endpoint),
    status: rowStatusFromRisk(risk),
    riskStatus: risk.status || 'unknown',
    severity: risk.severity || 'P2',
    reason: risk.reason || 'No route budget reason recorded.',
    measuredAt: metric.measuredAt || generatedAt,
    ok: metric.ok === true && risk.status === 'healthy',
    httpStatus: metric.status ?? null,
    durationMs: normalizeNumber(metric.durationMs),
    payloadBytes: normalizeNumber(metric.payloadBytes),
    timeout: metric.timeout === true,
    timeoutMs: normalizeNumber(metric.timeoutMs),
  }
}

export function buildFoundationEndpointBudgetSnapshot({
  endpointMetrics = [],
  generatedAt = new Date().toISOString(),
  source = 'provided_metrics',
  sourcePath = null,
} = {}) {
  const metricsByEndpoint = new Map(
    (Array.isArray(endpointMetrics) ? endpointMetrics : [])
      .filter(metric => metric && metric.endpoint)
      .map(metric => [metric.endpoint, metric]),
  )
  const rows = FOUNDATION_ENDPOINT_BUDGET_ROUTES.map(endpoint =>
    normalizeEndpointBudgetMetric(metricsByEndpoint.get(endpoint) || { endpoint, skipped: true, reason: 'Missing from latest endpoint metrics.' }, generatedAt)
  )
  const findings = rows
    .filter(row => row.status !== 'healthy')
    .map(row => ({
      id: `endpoint_budget_${row.key}`,
      severity: row.severity,
      status: row.status,
      title: `${row.endpoint} endpoint budget is ${row.riskStatus}`,
      detail: row.reason,
      nextAction: row.riskStatus === 'missing'
        ? 'Run the scheduled nightly deep audit so endpoint metrics are captured in the JSON report.'
        : 'Scope a focused performance card before building more hub work on this route.',
      endpoint: row.endpoint,
      source: 'foundation_endpoint_budgets',
      autoFix: false,
      autoBacklogMutation: false,
    }))

  const measuredRows = rows.filter(row => row.riskStatus !== 'missing')
  const riskRows = rows.filter(row => row.status === 'risk')
  const reviewRows = rows.filter(row => row.status === 'review')
  const status = riskRows.length ? 'risk' : reviewRows.length ? 'review' : 'healthy'
  return {
    generatedAt,
    cardId: FOUNDATION_ENDPOINT_BUDGETS_CARD_ID,
    closeoutKey: FOUNDATION_ENDPOINT_BUDGETS_CLOSEOUT_KEY,
    reportOnly: true,
    readOnly: true,
    autoFixes: false,
    writesBacklog: false,
    source,
    sourcePath,
    status,
    summary: {
      routeCount: rows.length,
      measuredCount: measuredRows.length,
      healthyCount: rows.filter(row => row.status === 'healthy').length,
      reviewCount: reviewRows.length,
      riskCount: riskRows.length,
      missingCount: rows.filter(row => row.riskStatus === 'missing').length,
      maxDurationMs: Math.max(0, ...rows.map(row => row.durationMs || 0)),
      maxPayloadBytes: Math.max(0, ...rows.map(row => row.payloadBytes || 0)),
    },
    rows,
    findings,
    plainEnglish: findings.length
      ? 'Endpoint budgets need review before treating Foundation operator routes as clean.'
      : 'Endpoint budgets are healthy for the required Foundation operator routes.',
  }
}

export async function measureFoundationEndpointBudgetSnapshot({
  baseUrl = 'http://localhost:3000',
  timeoutMs = 8000,
} = {}) {
  const endpointMetrics = await Promise.all(FOUNDATION_ENDPOINT_BUDGET_ROUTES.map(endpoint =>
    measureFoundationEndpoint({ baseUrl, endpoint, timeoutMs })
  ))
  return buildFoundationEndpointBudgetSnapshot({
    endpointMetrics,
    generatedAt: new Date().toISOString(),
    source: 'live_focused_measurement',
  })
}

export async function loadLatestFoundationEndpointBudgetSnapshot({
  repoRoot = process.cwd(),
} = {}) {
  const handoffDir = path.join(repoRoot, 'docs/handoffs')
  let entries = []
  try {
    entries = await fs.readdir(handoffDir)
  } catch {
    return buildFoundationEndpointBudgetSnapshot({
      endpointMetrics: [],
      source: 'missing_handoff_dir',
      sourcePath: 'docs/handoffs',
    })
  }
  const latest = entries
    .filter(name => /^nightly-deep-audit-\d{4}-\d{2}-\d{2}\.json$/.test(name))
    .sort()
    .pop()
  if (!latest) {
    return buildFoundationEndpointBudgetSnapshot({
      endpointMetrics: [],
      source: 'missing_nightly_deep_audit_json',
      sourcePath: 'docs/handoffs',
    })
  }
  const relativePath = `docs/handoffs/${latest}`
  const parsed = JSON.parse(await fs.readFile(path.join(repoRoot, relativePath), 'utf8'))
  const endpointMetrics = Array.isArray(parsed.endpointMetrics)
    ? parsed.endpointMetrics
    : Array.isArray(parsed.deterministicAudit?.endpointMetrics)
      ? parsed.deterministicAudit.endpointMetrics
      : []
  return buildFoundationEndpointBudgetSnapshot({
    endpointMetrics,
    generatedAt: parsed.generatedAt || new Date().toISOString(),
    source: 'latest_nightly_deep_audit_json',
    sourcePath: relativePath,
  })
}

export function buildFoundationEndpointBudgetsDogfoodProof() {
  const healthy = buildFoundationEndpointBudgetSnapshot({
    endpointMetrics: FOUNDATION_ENDPOINT_BUDGET_ROUTES.map(endpoint => ({
      endpoint,
      ok: true,
      status: 200,
      durationMs: 120,
      payloadBytes: 200_000,
      timeout: false,
      timeoutMs: 8000,
    })),
    generatedAt: 'synthetic',
  })
  const oldSlowRoute = buildFoundationEndpointBudgetSnapshot({
    endpointMetrics: FOUNDATION_ENDPOINT_BUDGET_ROUTES.map(endpoint => ({
      endpoint,
      ok: true,
      status: 200,
      durationMs: endpoint === '/api/source-of-truth' ? 70_244 : 120,
      payloadBytes: endpoint === '/api/source-of-truth' ? 4_630_000 : 200_000,
      timeout: false,
      timeoutMs: 90_000,
    })),
    generatedAt: 'synthetic',
  })
  const bloatedHub = buildFoundationEndpointBudgetSnapshot({
    endpointMetrics: FOUNDATION_ENDPOINT_BUDGET_ROUTES.map(endpoint => ({
      endpoint,
      ok: true,
      status: 200,
      durationMs: 120,
      payloadBytes: endpoint === '/api/foundation-hub' ? 874_776 : 200_000,
      timeout: false,
      timeoutMs: 8000,
    })),
    generatedAt: 'synthetic',
  })
  const missingMetrics = buildFoundationEndpointBudgetSnapshot({
    endpointMetrics: [],
    generatedAt: 'synthetic',
  })

  return {
    ok: healthy.status === 'healthy' &&
      oldSlowRoute.status === 'risk' &&
      oldSlowRoute.findings.some(finding => finding.endpoint === '/api/source-of-truth' && finding.status === 'risk') &&
      bloatedHub.status === 'review' &&
      bloatedHub.findings.some(finding => finding.endpoint === '/api/foundation-hub' && /800KB/.test(finding.detail)) &&
      missingMetrics.status === 'review' &&
      missingMetrics.summary.missingCount === FOUNDATION_ENDPOINT_BUDGET_ROUTES.length,
    healthy,
    oldSlowRoute,
    bloatedHub,
    missingMetrics,
    invariant: 'Endpoint budget health accepts current healthy routes, rejects the old 70s/4.63MB route, warns on over-800KB payloads, and reports missing metrics without mutating anything.',
  }
}
