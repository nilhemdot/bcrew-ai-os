import fs from 'node:fs/promises'
import path from 'node:path'

import {
  FOUNDATION_FRONTEND_PAGE_PATH,
  discoverFoundationFrontendAssetRefs,
} from './foundation-frontend-asset-budgets.js'

export const FOUNDATION_FRONTEND_DOM_BUDGET_CARD_ID = 'FOUNDATION-FRONTEND-DOM-BUDGET-001'
export const FOUNDATION_FRONTEND_DOM_BUDGET_CLOSEOUT_KEY = 'foundation-frontend-dom-budget-v1'
export const FOUNDATION_FRONTEND_DOM_BUDGET_PLAN_PATH = 'docs/process/foundation-frontend-dom-budget-001-plan.md'
export const FOUNDATION_FRONTEND_DOM_BUDGET_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-FRONTEND-DOM-BUDGET-001.json'
export const FOUNDATION_FRONTEND_DOM_BUDGET_SCRIPT_PATH = 'scripts/process-foundation-frontend-dom-budget-check.mjs'
export const FOUNDATION_FRONTEND_DOM_BUDGET_SPRINT_ID = 'foundation-frontend-dom-budget-2026-05-16'

export const FOUNDATION_FRONTEND_DOM_BUDGETS = Object.freeze({
  singleFileCreateElementWarn: 450,
  singleFileCreateElementRisk: 800,
  singleFileInnerHtmlWarn: 25,
  singleFileInnerHtmlRisk: 50,
  aggregateCreateElementWarn: 1200,
  aggregateCreateElementRisk: 2400,
  aggregateAppendChildWarn: 1800,
  aggregateAppendChildRisk: 3400,
  aggregateInnerHtmlWarn: 50,
  aggregateInnerHtmlRisk: 100,
  routeCreateElementWarn: 220,
  routeCreateElementRisk: 450,
  routeAppendChildWarn: 280,
  routeAppendChildRisk: 600,
  routeInnerHtmlWarn: 8,
  routeInnerHtmlRisk: 20,
})

function normalizeText(value) {
  return String(value || '').trim()
}

function statusRank(status = '') {
  if (status === 'risk') return 2
  if (status === 'review') return 1
  return 0
}

function chooseStatus(statuses = []) {
  return statuses.reduce((winner, status) => statusRank(status) > statusRank(winner) ? status : winner, 'healthy')
}

function lineCount(text = '') {
  return text ? String(text).split(/\r?\n/).length : 0
}

function bytesOf(text = '') {
  return Buffer.byteLength(String(text), 'utf8')
}

function countMatches(text = '', pattern) {
  return (String(text || '').match(pattern) || []).length
}

function classifyRow(metric = {}, budgets = FOUNDATION_FRONTEND_DOM_BUDGETS) {
  const reasons = []
  if (metric.missing === true) {
    return {
      status: 'risk',
      severity: 'P1',
      reasons: [`${metric.path || 'Foundation frontend script'} is missing, so DOM budget cannot inspect it.`],
    }
  }
  if (metric.createElementCount > budgets.singleFileCreateElementRisk) {
    reasons.push(`${metric.path} calls document.createElement ${metric.createElementCount} times, above the ${budgets.singleFileCreateElementRisk} risk budget.`)
  } else if (metric.createElementCount > budgets.singleFileCreateElementWarn) {
    reasons.push(`${metric.path} calls document.createElement ${metric.createElementCount} times, above the ${budgets.singleFileCreateElementWarn} review budget.`)
  }
  if (metric.innerHtmlCount > budgets.singleFileInnerHtmlRisk) {
    reasons.push(`${metric.path} uses innerHTML ${metric.innerHtmlCount} times, above the ${budgets.singleFileInnerHtmlRisk} risk budget.`)
  } else if (metric.innerHtmlCount > budgets.singleFileInnerHtmlWarn) {
    reasons.push(`${metric.path} uses innerHTML ${metric.innerHtmlCount} times, above the ${budgets.singleFileInnerHtmlWarn} review budget.`)
  }
  const hasRisk = reasons.some(reason => /risk budget/.test(reason))
  return {
    status: hasRisk ? 'risk' : reasons.length ? 'review' : 'healthy',
    severity: hasRisk ? 'P1' : reasons.length ? 'P2' : 'P3',
    reasons: reasons.length ? reasons : [`${metric.path} is inside the per-file DOM budget.`],
  }
}

function classifyAggregate(summary = {}, budgets = FOUNDATION_FRONTEND_DOM_BUDGETS) {
  const riskReasons = []
  const reviewReasons = []
  if (summary.totalCreateElementCount > budgets.aggregateCreateElementRisk) {
    riskReasons.push(`Foundation frontend scripts call document.createElement ${summary.totalCreateElementCount} times, above the ${budgets.aggregateCreateElementRisk} aggregate risk budget.`)
  } else if (summary.totalCreateElementCount > budgets.aggregateCreateElementWarn) {
    reviewReasons.push(`Foundation frontend scripts call document.createElement ${summary.totalCreateElementCount} times, above the ${budgets.aggregateCreateElementWarn} aggregate review budget.`)
  }
  if (summary.totalAppendChildCount > budgets.aggregateAppendChildRisk) {
    riskReasons.push(`Foundation frontend scripts call appendChild ${summary.totalAppendChildCount} times, above the ${budgets.aggregateAppendChildRisk} aggregate risk budget.`)
  } else if (summary.totalAppendChildCount > budgets.aggregateAppendChildWarn) {
    reviewReasons.push(`Foundation frontend scripts call appendChild ${summary.totalAppendChildCount} times, above the ${budgets.aggregateAppendChildWarn} aggregate review budget.`)
  }
  if (summary.totalInnerHtmlCount > budgets.aggregateInnerHtmlRisk) {
    riskReasons.push(`Foundation frontend scripts use innerHTML ${summary.totalInnerHtmlCount} times, above the ${budgets.aggregateInnerHtmlRisk} aggregate risk budget.`)
  } else if (summary.totalInnerHtmlCount > budgets.aggregateInnerHtmlWarn) {
    reviewReasons.push(`Foundation frontend scripts use innerHTML ${summary.totalInnerHtmlCount} times, above the ${budgets.aggregateInnerHtmlWarn} aggregate review budget.`)
  }
  if (riskReasons.length) {
    return { status: 'risk', severity: 'P1', reasons: riskReasons }
  }
  if (reviewReasons.length) {
    return { status: 'review', severity: 'P2', reasons: reviewReasons }
  }
  return { status: 'healthy', severity: 'P3', reasons: ['Foundation frontend aggregate DOM signals are inside budget.'] }
}

function classifyRoute(metric = {}, budgets = FOUNDATION_FRONTEND_DOM_BUDGETS) {
  const riskReasons = []
  const reviewReasons = []
  if (metric.createElementCount > budgets.routeCreateElementRisk) {
    riskReasons.push(`${metric.routeKey || 'route'} created ${metric.createElementCount} elements, above the ${budgets.routeCreateElementRisk} route risk budget.`)
  } else if (metric.createElementCount > budgets.routeCreateElementWarn) {
    reviewReasons.push(`${metric.routeKey || 'route'} created ${metric.createElementCount} elements, above the ${budgets.routeCreateElementWarn} route review budget.`)
  }
  if (metric.appendChildCount > budgets.routeAppendChildRisk) {
    riskReasons.push(`${metric.routeKey || 'route'} appended ${metric.appendChildCount} nodes, above the ${budgets.routeAppendChildRisk} route risk budget.`)
  } else if (metric.appendChildCount > budgets.routeAppendChildWarn) {
    reviewReasons.push(`${metric.routeKey || 'route'} appended ${metric.appendChildCount} nodes, above the ${budgets.routeAppendChildWarn} route review budget.`)
  }
  if (metric.innerHtmlCount > budgets.routeInnerHtmlRisk) {
    riskReasons.push(`${metric.routeKey || 'route'} used innerHTML ${metric.innerHtmlCount} times, above the ${budgets.routeInnerHtmlRisk} route risk budget.`)
  } else if (metric.innerHtmlCount > budgets.routeInnerHtmlWarn) {
    reviewReasons.push(`${metric.routeKey || 'route'} used innerHTML ${metric.innerHtmlCount} times, above the ${budgets.routeInnerHtmlWarn} route review budget.`)
  }
  if (riskReasons.length) return { status: 'risk', severity: 'P1', reasons: riskReasons }
  if (reviewReasons.length) return { status: 'review', severity: 'P2', reasons: reviewReasons }
  return { status: 'healthy', severity: 'P3', reasons: [`${metric.routeKey || 'route'} is inside the DOM render budget.`] }
}

export function countDomRebuildSignalsInText({ path: relativePath = '', text = '', missing = false } = {}) {
  const source = String(text || '')
  const metric = {
    path: normalizeText(relativePath),
    missing: Boolean(missing),
    lines: missing ? 0 : lineCount(source),
    bytes: missing ? 0 : bytesOf(source),
    createElementCount: missing ? 0 : countMatches(source, /document\.createElement/g),
    appendChildCount: missing ? 0 : countMatches(source, /\.appendChild\s*\(/g),
    innerHtmlCount: missing ? 0 : countMatches(source, /\binnerHTML\b/g),
    addEventListenerCount: missing ? 0 : countMatches(source, /\.addEventListener\s*\(/g),
  }
  const classification = classifyRow(metric)
  return {
    ...metric,
    status: classification.status,
    severity: classification.severity,
    reasons: classification.reasons,
  }
}

export function buildFoundationFrontendDomBudgetSnapshot({
  rows = [],
  routeMeasurements = [],
  generatedAt = new Date().toISOString(),
  source = 'provided_dom_metrics',
  sourcePath = null,
  budgets = FOUNDATION_FRONTEND_DOM_BUDGETS,
} = {}) {
  const normalizedRows = rows.map(row => {
    if (row && row.status && row.reasons) return row
    const metric = countDomRebuildSignalsInText(row || {})
    const classification = classifyRow(metric, budgets)
    return {
      ...metric,
      status: classification.status,
      severity: classification.severity,
      reasons: classification.reasons,
    }
  })
  const normalizedRoutes = routeMeasurements.map(route => {
    const metric = {
      routeKey: normalizeText(route.routeKey || route.path || route.name || 'foundation-route'),
      createElementCount: Number(route.createElementCount || 0),
      appendChildCount: Number(route.appendChildCount || 0),
      innerHtmlCount: Number(route.innerHtmlCount || 0),
      textNodeCount: Number(route.textNodeCount || 0),
      eventListenerCount: Number(route.eventListenerCount || 0),
    }
    const classification = classifyRoute(metric, budgets)
    return {
      ...metric,
      status: classification.status,
      severity: classification.severity,
      reasons: classification.reasons,
    }
  })
  const summary = {
    scriptCount: normalizedRows.length,
    routeMeasurementCount: normalizedRoutes.length,
    totalLines: normalizedRows.reduce((sum, row) => sum + Number(row.lines || 0), 0),
    totalBytes: normalizedRows.reduce((sum, row) => sum + Number(row.bytes || 0), 0),
    totalCreateElementCount: normalizedRows.reduce((sum, row) => sum + Number(row.createElementCount || 0), 0),
    totalAppendChildCount: normalizedRows.reduce((sum, row) => sum + Number(row.appendChildCount || 0), 0),
    totalInnerHtmlCount: normalizedRows.reduce((sum, row) => sum + Number(row.innerHtmlCount || 0), 0),
    totalAddEventListenerCount: normalizedRows.reduce((sum, row) => sum + Number(row.addEventListenerCount || 0), 0),
    reviewCount: normalizedRows.filter(row => row.status === 'review').length + normalizedRoutes.filter(route => route.status === 'review').length,
    riskCount: normalizedRows.filter(row => row.status === 'risk').length + normalizedRoutes.filter(route => route.status === 'risk').length,
  }
  const aggregate = classifyAggregate(summary, budgets)
  const findings = [
    ...(aggregate.status === 'healthy' ? [] : [{
      id: 'foundation_dom_budget_aggregate',
      status: aggregate.status,
      severity: aggregate.severity,
      title: `Foundation frontend aggregate DOM budget is ${aggregate.status}`,
      detail: aggregate.reasons.join(' '),
      source: 'foundation_frontend_dom_budget',
      autoFix: false,
      autoBacklogMutation: false,
    }]),
    ...normalizedRows
      .filter(row => row.status !== 'healthy')
      .map(row => ({
        id: `foundation_dom_budget_${row.path.replace(/^public\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'script'}`,
        status: row.status,
        severity: row.severity,
        title: `${row.path} DOM budget is ${row.status}`,
        detail: row.reasons.join(' '),
        path: row.path,
        source: 'foundation_frontend_dom_budget',
        autoFix: false,
        autoBacklogMutation: false,
      })),
    ...normalizedRoutes
      .filter(route => route.status !== 'healthy')
      .map(route => ({
        id: `foundation_dom_budget_route_${route.routeKey.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'route'}`,
        status: route.status,
        severity: route.severity,
        title: `${route.routeKey} render budget is ${route.status}`,
        detail: route.reasons.join(' '),
        source: 'foundation_frontend_dom_budget',
        autoFix: false,
        autoBacklogMutation: false,
      })),
  ]
  const status = chooseStatus([aggregate.status, ...normalizedRows.map(row => row.status), ...normalizedRoutes.map(route => route.status)])

  return {
    generatedAt,
    cardId: FOUNDATION_FRONTEND_DOM_BUDGET_CARD_ID,
    closeoutKey: FOUNDATION_FRONTEND_DOM_BUDGET_CLOSEOUT_KEY,
    reportOnly: true,
    readOnly: true,
    autoFixes: false,
    writesBacklog: false,
    source,
    sourcePath,
    status,
    budgets,
    summary,
    rows: normalizedRows,
    routeMeasurements: normalizedRoutes,
    findings,
    plainEnglish: findings.length
      ? 'Foundation frontend DOM rebuild budget needs review before route changes add more browser work.'
      : 'Foundation frontend DOM rebuild signals are inside budget.',
  }
}

export async function measureFoundationFrontendDomBudgetFromRepo({
  repoRoot = process.cwd(),
  htmlPath = FOUNDATION_FRONTEND_PAGE_PATH,
  htmlText = null,
  routeMeasurements = [],
} = {}) {
  const sourceHtml = htmlText ?? await fs.readFile(path.join(repoRoot, htmlPath), 'utf8')
  const refs = discoverFoundationFrontendAssetRefs(sourceHtml)
    .filter(ref => ref.type === 'script')
  const rows = []
  for (const ref of refs) {
    const absolutePath = path.join(repoRoot, ref.path)
    try {
      const text = await fs.readFile(absolutePath, 'utf8')
      rows.push(countDomRebuildSignalsInText({ path: ref.path, text }))
    } catch {
      rows.push(countDomRebuildSignalsInText({ path: ref.path, missing: true }))
    }
  }
  return buildFoundationFrontendDomBudgetSnapshot({
    rows,
    routeMeasurements,
    source: 'repo_foundation_html_scripts',
    sourcePath: htmlPath,
  })
}

export function buildFoundationFrontendDomBudgetDogfoodProof() {
  const healthy = buildFoundationFrontendDomBudgetSnapshot({
    rows: [
      countDomRebuildSignalsInText({
        path: 'public/foundation-small.js',
        text: Array.from({ length: 12 }, () => "var el = document.createElement('div'); parent.appendChild(el)").join('\n'),
      }),
    ],
    routeMeasurements: [
      { routeKey: 'healthy-current-state', createElementCount: 48, appendChildCount: 64, innerHtmlCount: 0 },
    ],
    generatedAt: 'synthetic',
  })
  const heavySource = buildFoundationFrontendDomBudgetSnapshot({
    rows: [
      countDomRebuildSignalsInText({
        path: 'public/foundation-heavy.js',
        text: Array.from({ length: 900 }, () => "var el = document.createElement('article'); root.appendChild(el)").join('\n') +
          '\n' + Array.from({ length: 55 }, () => "panel.innerHTML = ''").join('\n'),
      }),
    ],
    generatedAt: 'synthetic',
  })
  const heavyRoute = buildFoundationFrontendDomBudgetSnapshot({
    rows: [],
    routeMeasurements: [
      { routeKey: 'heavy-backlog-route', createElementCount: 500, appendChildCount: 650, innerHtmlCount: 21 },
    ],
    generatedAt: 'synthetic',
  })
  const aggregateReview = buildFoundationFrontendDomBudgetSnapshot({
    rows: [
      countDomRebuildSignalsInText({ path: 'public/a.js', text: Array.from({ length: 310 }, () => "document.createElement('div').appendChild(document.createElement('span'))").join('\n') }),
      countDomRebuildSignalsInText({ path: 'public/b.js', text: Array.from({ length: 310 }, () => "document.createElement('div').appendChild(document.createElement('span'))").join('\n') }),
      countDomRebuildSignalsInText({ path: 'public/c.js', text: Array.from({ length: 310 }, () => "document.createElement('div').appendChild(document.createElement('span'))").join('\n') }),
    ],
    generatedAt: 'synthetic',
  })

  return {
    ok: healthy.status === 'healthy' &&
      heavySource.status === 'risk' &&
      heavySource.findings.some(finding => finding.id === 'foundation_dom_budget_foundation-heavy-js' && finding.status === 'risk') &&
      heavyRoute.status === 'risk' &&
      heavyRoute.findings.some(finding => finding.id === 'foundation_dom_budget_route_heavy-backlog-route' && finding.status === 'risk') &&
      aggregateReview.status === 'review' &&
      aggregateReview.findings.some(finding => finding.id === 'foundation_dom_budget_aggregate'),
    healthy,
    heavySource,
    heavyRoute,
    aggregateReview,
    invariant: 'DOM budgets accept small split renderers, warn on aggregate churn, and reject heavy source or route fixtures without mutating UI, backlog, or runtime state.',
  }
}
