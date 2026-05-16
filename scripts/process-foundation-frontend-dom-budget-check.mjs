#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { buildCodeQualityNightlyAudit } from '../lib/code-quality-nightly-audit.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  FOUNDATION_FRONTEND_DOM_BUDGET_APPROVAL_PATH,
  FOUNDATION_FRONTEND_DOM_BUDGET_CARD_ID,
  FOUNDATION_FRONTEND_DOM_BUDGET_CLOSEOUT_KEY,
  FOUNDATION_FRONTEND_DOM_BUDGET_PLAN_PATH,
  FOUNDATION_FRONTEND_DOM_BUDGET_SCRIPT_PATH,
  FOUNDATION_FRONTEND_DOM_BUDGET_SPRINT_ID,
  buildFoundationFrontendDomBudgetDogfoodProof,
  buildFoundationFrontendDomBudgetSnapshot,
  measureFoundationFrontendDomBudgetFromRepo,
} from '../lib/foundation-frontend-dom-budgets.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
  }
  return args
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readText(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function repoFileExists(relativePath) {
  try {
    const stat = await fs.stat(path.join(repoRoot, relativePath))
    return stat.isFile()
  } catch {
    return false
  }
}

function scriptIsReadOnly(source = '') {
  const forbiddenTokens = [
    'create' + 'BacklogItem',
    'update' + 'BacklogItem',
    'upsert' + 'FoundationCurrentSprintOverlay',
    'INSERT' + ' INTO',
    'UPDATE' + ' ',
    'DELETE' + ' FROM',
    'fs.' + 'writeFile',
    'write' + 'File(',
  ]
  return forbiddenTokens.every(token => !String(source || '').includes(token))
}

function stageOk(stage = '') {
  return ['scoping', 'sprint_ready', 'building_now', 'done_this_sprint'].includes(stage)
}

class FakeNode {
  constructor(tagName, metrics) {
    this.tagName = tagName
    this.metrics = metrics
    this.children = []
    this.attributes = new Map()
    this.style = {}
    this.dataset = {}
    this.className = ''
    this.id = ''
    this.href = ''
    this.type = ''
    this.colSpan = 0
    this.hidden = false
    this.textContent = ''
  }

  appendChild(child) {
    this.metrics.appendChildCount += 1
    this.children.push(child)
    child.parentNode = this
    return child
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value))
  }

  addEventListener() {
    this.metrics.eventListenerCount += 1
  }

  closest() {
    return null
  }

  set innerHTML(value) {
    this.metrics.innerHtmlCount += 1
    this.children = []
    this._innerHTML = String(value || '')
  }

  get innerHTML() {
    return this._innerHTML || ''
  }
}

function buildInstrumentedDocument() {
  const metrics = {
    createElementCount: 0,
    appendChildCount: 0,
    innerHtmlCount: 0,
    textNodeCount: 0,
    eventListenerCount: 0,
  }
  const document = {
    createElement(tagName) {
      metrics.createElementCount += 1
      return new FakeNode(tagName, metrics)
    },
    createTextNode(text) {
      metrics.textNodeCount += 1
      const node = new FakeNode('#text', metrics)
      node.textContent = String(text || '')
      return node
    },
  }
  return { document, metrics }
}

function collectText(node) {
  if (!node) return ''
  const own = node.textContent ? String(node.textContent) : ''
  return own + (node.children || []).map(collectText).join('')
}

function runClassicScript(source, context, filename) {
  vm.runInNewContext(source, context, { filename })
}

async function measureCurrentStateVmRender() {
  const rendererSource = await readText('public/foundation-current-state-renderers.js')
  const { document, metrics } = buildInstrumentedDocument()
  const context = {
    document,
    console,
    Set,
    Array,
    String,
    encodeURIComponent,
    getSectionFocus: () => '',
    slugify: value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    createActionLink: (label, href) => {
      const link = document.createElement('a')
      link.textContent = label
      link.href = href
      return link
    },
    renderTable: rows => {
      const table = document.createElement('table')
      ;(rows || []).forEach(row => {
        const tr = document.createElement('tr')
        tr.textContent = String(row || '')
        table.appendChild(tr)
      })
      return table
    },
    phaseGOperatorOrder: [],
  }
  runClassicScript(rendererSource, context, 'public/foundation-current-state-renderers.js')
  const rows = [
    {
      title: 'Strategy packet',
      statusKey: 'connected',
      statusLabel: 'Ready',
      surfaceType: 'Package',
      levelLabel: 'Level 3',
      current: 'Source-backed strategy current state.',
      next: 'Keep monitored.',
      later: 'No blocker.',
      sourceId: ['SRC-STRATEGY-001', 'SRC-OWNERS-001'],
      packageParts: [
        { sourceId: 'SRC-STRATEGY-001', statusKey: 'connected', statusLabel: 'Ready', body: 'Docs visible', next: 'Watch changes', role: 'Strategy docs' },
        { sourceId: 'SRC-OWNERS-001', statusKey: 'connected', statusLabel: 'Ready', body: 'Owners package visible', next: 'No action', role: 'Owners' },
      ],
    },
    {
      title: 'KPI source health',
      statusKey: 'pending',
      statusLabel: 'Review',
      surfaceType: 'Data source',
      levelLabel: 'Level 3',
      current: 'KPI health needs review.',
      next: 'Check runtime health.',
      later: 'No blocker.',
      sourceId: 'SRC-SUPABASE-001',
    },
  ]
  const node = context.renderCurrentStateSurfaceTable(rows)
  return {
    routeKey: 'current-state-surface-table-vm',
    createElementCount: metrics.createElementCount,
    appendChildCount: metrics.appendChildCount,
    innerHtmlCount: metrics.innerHtmlCount,
    textNodeCount: metrics.textNodeCount,
    eventListenerCount: metrics.eventListenerCount,
    renderedText: collectText(node),
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    approval,
    cards,
    activeSprint,
    planCriticRuns,
    packageSource,
    moduleSource,
    scriptSource,
    nightlyAuditSource,
    foundationVerifySource,
    currentPlan,
    currentState,
    planSource,
  ] = await Promise.all([
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: FOUNDATION_FRONTEND_DOM_BUDGET_APPROVAL_PATH,
      cardId: FOUNDATION_FRONTEND_DOM_BUDGET_CARD_ID,
    }),
    getBacklogItemsByIds([FOUNDATION_FRONTEND_DOM_BUDGET_CARD_ID]),
    getActiveFoundationCurrentSprint().catch(() => ({ sprint: null, items: [] })),
    getPlanCriticRunsByCardIds([FOUNDATION_FRONTEND_DOM_BUDGET_CARD_ID]),
    readText('package.json'),
    readText('lib/foundation-frontend-dom-budgets.js'),
    readText(FOUNDATION_FRONTEND_DOM_BUDGET_SCRIPT_PATH),
    readText('lib/code-quality-nightly-audit.js'),
    readText('scripts/foundation-verify.mjs'),
    readText('docs/rebuild/current-plan.md'),
    readText('docs/rebuild/current-state.md'),
    readText(FOUNDATION_FRONTEND_DOM_BUDGET_PLAN_PATH),
  ])
  const packageJson = JSON.parse(packageSource)
  const card = cards.find(item => item.id === FOUNDATION_FRONTEND_DOM_BUDGET_CARD_ID) || null
  const activeItem = (activeSprint.items || []).find(item => item.cardId === FOUNDATION_FRONTEND_DOM_BUDGET_CARD_ID) || null
  const closeout = getFoundationBuildCloseouts().find(item => item.key === FOUNDATION_FRONTEND_DOM_BUDGET_CLOSEOUT_KEY) || null
  const dogfood = buildFoundationFrontendDomBudgetDogfoodProof()
  const repoSnapshot = await measureFoundationFrontendDomBudgetFromRepo({ repoRoot })
  const vmRoute = await measureCurrentStateVmRender()
  const routeSnapshot = buildFoundationFrontendDomBudgetSnapshot({
    rows: [],
    routeMeasurements: [vmRoute],
    generatedAt: 'vm-proof',
  })
  const heavyRouteSnapshot = buildFoundationFrontendDomBudgetSnapshot({
    rows: [],
    routeMeasurements: [
      { routeKey: 'synthetic-heavy-foundation-route', createElementCount: 500, appendChildCount: 650, innerHtmlCount: 21 },
    ],
    generatedAt: 'synthetic',
  })
  const nightlyAudit = await buildCodeQualityNightlyAudit({ repoRoot, skipEndpointFetch: true })
  const nightlyDomFinding = (nightlyAudit.findings || []).find(finding => finding.id === 'foundation-dom-rebuild-risk') || null

  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog has DOM budget card in executing or done', card ? `${card.lane} / ${card.priority}` : 'missing card')
  addCheck(checks, approval.ok === true && approval.mode === 'v2' && Number(approval.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approval.ok ? `${approval.mode} / ${approval.approval?.score}` : approval.failures?.map(item => item.detail).join('; '))
  addCheck(checks, planCriticRuns.some(run => run.status === 'pass' && Number(run.score) >= 9.8), 'Plan Critic pass row exists', `${planCriticRuns.length} run(s)`)
  addCheck(checks, activeSprint?.sprint?.sprintId === FOUNDATION_FRONTEND_DOM_BUDGET_SPRINT_ID || card?.lane === 'done', 'Current Sprint points to DOM budget while active or card is historically done', activeSprint?.sprint?.sprintId || 'missing active sprint')
  addCheck(checks, card?.lane === 'done' || (activeItem && stageOk(activeItem.stage)), 'Current Sprint item has active stage truth before closeout', activeItem ? `${activeItem.cardId}:${activeItem.stage}` : `card lane=${card?.lane || 'missing'}`)
  addCheck(checks, dogfood.ok === true && dogfood.heavySource.status === 'risk' && dogfood.heavyRoute.status === 'risk' && dogfood.aggregateReview.status === 'review', 'dogfood proves heavy source/route fixtures fail and aggregate churn warns', dogfood.invariant)
  addCheck(checks, repoSnapshot.rows.length >= 10 && repoSnapshot.rows.some(row => row.path === 'public/foundation.js') && repoSnapshot.summary.totalCreateElementCount > 0 && repoSnapshot.status !== 'risk', 'repo snapshot discovers Foundation frontend scripts dynamically', `scripts=${repoSnapshot.summary.scriptCount} createElement=${repoSnapshot.summary.totalCreateElementCount} appendChild=${repoSnapshot.summary.totalAppendChildCount} innerHTML=${repoSnapshot.summary.totalInnerHtmlCount} status=${repoSnapshot.status}`)
  addCheck(checks, routeSnapshot.status !== 'risk' && /Strategy packet/.test(vmRoute.renderedText), 'VM route proof counts real Current State renderer DOM work', `createElement=${vmRoute.createElementCount} appendChild=${vmRoute.appendChildCount} innerHTML=${vmRoute.innerHtmlCount} text="${vmRoute.renderedText.slice(0, 60)}"`)
  addCheck(checks, heavyRouteSnapshot.status === 'risk' && heavyRouteSnapshot.findings.some(finding => finding.id === 'foundation_dom_budget_route_synthetic-heavy-foundation-route'), 'synthetic heavy render fixture triggers DOM budget risk', heavyRouteSnapshot.findings.map(finding => finding.detail).join(' '))
  addCheck(checks, repoSnapshot.reportOnly === true && repoSnapshot.readOnly === true && repoSnapshot.autoFixes === false && repoSnapshot.writesBacklog === false, 'DOM budget snapshot is report-only and read-only', JSON.stringify({ reportOnly: repoSnapshot.reportOnly, readOnly: repoSnapshot.readOnly, autoFixes: repoSnapshot.autoFixes, writesBacklog: repoSnapshot.writesBacklog }))
  addCheck(checks, moduleSource.includes('measureFoundationFrontendDomBudgetFromRepo') && moduleSource.includes('countDomRebuildSignalsInText') && moduleSource.includes('buildFoundationFrontendDomBudgetDogfoodProof'), 'focused module owns DOM signal counting, repo measurement, and dogfood proof', 'lib/foundation-frontend-dom-budgets.js')
  addCheck(checks, nightlyAuditSource.includes('measureFoundationFrontendDomBudgetFromRepo') && nightlyAuditSource.includes('domBudgetSnapshot') && nightlyAuditSource.includes('FOUNDATION_FRONTEND_DOM_BUDGET_CARD_ID'), 'nightly audit consumes DOM budget snapshot instead of inline counters', 'lib/code-quality-nightly-audit.js')
  addCheck(checks, nightlyAudit.domBudgetSnapshot?.summary?.totalCreateElementCount > 0 && nightlyDomFinding?.proposedCard === FOUNDATION_FRONTEND_DOM_BUDGET_CARD_ID, 'nightly audit emits DOM budget finding from centralized snapshot when over review budget', nightlyDomFinding ? `${nightlyDomFinding.severity} / ${nightlyDomFinding.detector}` : 'missing finding')
  addCheck(checks, packageJson.scripts?.['process:foundation-frontend-dom-budget-check'] === `node --env-file-if-exists=.env ${FOUNDATION_FRONTEND_DOM_BUDGET_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:foundation-frontend-dom-budget-check'] || 'missing')
  addCheck(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only', 'no DB write helpers, SQL mutation statements, or fs write calls')
  addCheck(checks, foundationVerifySource.includes('FOUNDATION_FRONTEND_DOM_BUDGET_CARD_ID') && foundationVerifySource.includes('buildFoundationFrontendDomBudgetDogfoodProof') && foundationVerifySource.includes('FOUNDATION-FRONTEND-DOM-BUDGET-001 measures frontend DOM rebuild budget'), 'foundation verifier has thin delegated DOM budget coverage', 'scripts/foundation-verify.mjs')
  addCheck(checks, planSource.includes('Dogfood proof') && planSource.includes('VM route proof') && planSource.includes('synthetic heavy render fixture'), 'approved plan preserves dogfood and VM route-budget posture', FOUNDATION_FRONTEND_DOM_BUDGET_PLAN_PATH)
  if (closeout || card?.lane === 'done') {
    addCheck(checks, closeout?.operatorCloseout === true && (closeout.backlogIds || []).includes(FOUNDATION_FRONTEND_DOM_BUDGET_CARD_ID) && await repoFileExists('docs/handoffs/2026-05-16-foundation-frontend-dom-budget-closeout.md') && currentPlan.includes(FOUNDATION_FRONTEND_DOM_BUDGET_CLOSEOUT_KEY) && currentState.includes(FOUNDATION_FRONTEND_DOM_BUDGET_CLOSEOUT_KEY), 'closeout is registered when card is done', closeout ? closeout.key : 'missing closeout')
  }

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    cardId: FOUNDATION_FRONTEND_DOM_BUDGET_CARD_ID,
    closeoutKey: FOUNDATION_FRONTEND_DOM_BUDGET_CLOSEOUT_KEY,
    checks,
    failures,
    repoSnapshot,
    vmRoute,
    routeSnapshot,
    heavyRouteSnapshot,
    dogfood,
    nightlyDomFinding,
    summary: {
      total: checks.length,
      passed: checks.length - failures.length,
      failed: failures.length,
      repoStatus: repoSnapshot.status,
      repoCreateElementCount: repoSnapshot.summary.totalCreateElementCount,
      vmRouteStatus: routeSnapshot.status,
    },
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check} - ${check.detail}`)
    }
  }

  await closeFoundationDb()
  if (failures.length) process.exitCode = 1
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error)
  process.exitCode = 1
})
