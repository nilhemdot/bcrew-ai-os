#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_APPROVAL_PATH,
  FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_BEFORE_BYTES,
  FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_BEFORE_LINES,
  FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_BYTE_GROWTH_LIMIT,
  FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_CARD_ID,
  FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_CLOSEOUT_KEY,
  FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_MAX_AFTER_LINES,
  FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_ROUTE_BUDGET_MS,
  FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_SCRIPT_PATH,
  FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_SPRINT_ID,
  FRONTEND_FUB_LEAD_SOURCE_RENDERER_NAMES,
  evaluateFrontendFubLeadSourceRendererSplit,
  evaluateFrontendFubLeadSourceScriptOrder,
  extractFoundationFubLeadSourceScriptOrder,
} from '../lib/foundation-frontend-fub-lead-source-renderers-split.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const baseUrl = process.env.FOUNDATION_BASE_URL || 'http://localhost:3000'

function parseArgs(argv = process.argv.slice(2)) {
  return { json: argv.includes('--json') || argv.includes('--json=true') }
}

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

function lineCount(source = '') {
  return String(source || '').split('\n').length
}

function byteLength(source = '') {
  return Buffer.byteLength(String(source || ''), 'utf8')
}

async function timedFetch(pathname) {
  const started = performance.now()
  const response = await fetch(baseUrl + pathname)
  const text = await response.text()
  return {
    ok: response.ok,
    status: response.status,
    timeMs: Math.round((performance.now() - started) * 10) / 10,
    bytes: byteLength(text),
  }
}

class FakeNode {}

function createFakeElement(tagName = 'div', id = '') {
  const listeners = {}
  const classes = new Set()
  const element = new FakeNode()
  element.tagName = String(tagName || 'div').toUpperCase()
  element.id = id
  element.children = []
  element.childNodes = element.children
  element.parentElement = null
  element.hidden = false
  element.open = false
  element.href = ''
  element.target = ''
  element.rel = ''
  element.textContent = ''
  element.innerHTML = ''
  element.value = ''
  element.className = ''
  element.disabled = false
  element.selected = false
  element.dataset = {}
  element.style = {
    setProperty(name, value) {
      element.style[name] = value
    },
  }
  element.classList = {
    add(value) { classes.add(value) },
    remove(value) { classes.delete(value) },
    toggle(value) {
      if (classes.has(value)) {
        classes.delete(value)
        return false
      }
      classes.add(value)
      return true
    },
    contains(value) { return classes.has(value) },
  }
  element.setAttribute = function setAttribute(name, value) {
    element[name] = value
    if (String(name).startsWith('data-')) element.dataset[String(name).slice(5)] = String(value)
  }
  element.getAttribute = function getAttribute(name) {
    return element[name] || ''
  }
  element.appendChild = function appendChild(child) {
    if (child && typeof child === 'object') child.parentElement = element
    element.children.push(child)
    element.childNodes = element.children
    return child
  }
  element.removeChild = function removeChild(child) {
    element.children = element.children.filter(item => item !== child)
    element.childNodes = element.children
    return child
  }
  element.addEventListener = function addEventListener(type, fn) {
    listeners[type] = fn
  }
  element.dispatchEvent = function dispatchEvent(type) {
    if (listeners[type]) listeners[type]({ preventDefault() {} })
  }
  element.scrollIntoView = function scrollIntoView() {
    element.scrolled = true
  }
  return element
}

function collectText(node) {
  if (!node || typeof node !== 'object') return ''
  return [
    node.textContent || '',
    ...(node.children || []).map(collectText),
  ].join('\n')
}

function buildFakeDocument() {
  const elementsById = new Map()
  const content = createFakeElement('div', 'found-content')
  elementsById.set('found-content', content)
  return {
    content,
    createElement: tagName => createFakeElement(tagName),
    createTextNode(text) {
      const node = createFakeElement('#text')
      node.textContent = String(text || '')
      return node
    },
    getElementById(id) {
      if (!elementsById.has(id)) elementsById.set(id, createFakeElement('div', id))
      return elementsById.get(id)
    },
    querySelector() {
      return createFakeElement('div')
    },
    querySelectorAll() {
      return []
    },
  }
}

function createVmContext() {
  const document = buildFakeDocument()
  const window = {
    location: { hash: '#source-apis', replace(value) { this.replaced = value } },
    setTimeout,
    clearTimeout,
    requestAnimationFrame(fn) { return setTimeout(fn, 0) },
    localStorage: {
      getItem() { return '' },
      setItem() {},
      removeItem() {},
    },
    addEventListener() {},
  }
  return vm.createContext({
    console,
    document,
    window,
    Node: FakeNode,
    setTimeout,
    clearTimeout,
    performance,
    URL,
    Intl,
    fetch: async () => ({ ok: true, json: async () => ({}), text: async () => '' }),
  })
}

function runClassicScript(context, filename, source) {
  vm.runInContext(source, context, { filename })
}

function syntheticFubPayload() {
  return {
    context: { key: 'owner', label: 'Owner / Support FUB' },
    stats: {
      totalSources: 3,
      openClassification: 1,
      unclassifiedMarketing: 1,
      unclassifiedOwnership: 1,
      flagged: 1,
    },
    snapshot: {
      available: true,
      refreshedAt: '2026-05-15T07:00:00Z',
      refreshedBy: 'dogfood',
    },
    scan: { peopleScanned: 12, pagesScanned: 1, truncated: false },
    freshness: { label: 'fresh' },
    sources: [
      {
        source: 'Google PPC',
        count: 8,
        marketingType: 'marketing',
        ownershipType: 'company',
        flagState: 'none',
        sourceGroup: 'Ads Leads',
        notes: 'Paid search.',
      },
      {
        source: 'Legacy Bad Source',
        count: 2,
        marketingType: 'unclassified',
        ownershipType: 'unclassified',
        flagState: 'not_canonical',
        sourceGroup: 'Ungrouped',
        notes: 'Needs review.',
      },
    ],
    drift: {
      status: 'ready',
      stale: { ageHours: 2, isStale: false },
      stats: { reviewNow: 2 },
      buckets: {
        needsRules: [{ source: 'Fresh Unknown', count: 1, defaultFlagState: 'none' }],
        openClassification: [{ source: 'Legacy Bad Source', count: 2, openMarketing: true, openOwnership: true }],
        legacyPresent: [{ source: 'Legacy Bad Source', count: 2, flagState: 'not_canonical' }],
      },
    },
  }
}

async function runFubLeadSourceBrowserDogfood({ navSource, dataSource, foundationSource, sourceRegistrySource, fubLeadSourceSource }) {
  const context = createVmContext()
  runClassicScript(context, 'foundation-nav-config.js', navSource)
  runClassicScript(context, 'foundation-data.js', dataSource)
  runClassicScript(context, 'foundation.js', foundationSource)
  runClassicScript(context, 'foundation-source-registry-renderers.js', sourceRegistrySource)
  runClassicScript(context, 'foundation-fub-lead-source-renderers.js', fubLeadSourceSource)

  let liveMutationCalls = 0
  context.fetchFubLeadSources = async () => syntheticFubPayload()
  context.refreshFubLeadSources = async () => {
    liveMutationCalls += 1
    return syntheticFubPayload()
  }

  const routeGlobals = {
    manager: typeof context.renderFubLeadSourceManagerPanel === 'function',
    ownersGovernance: typeof context.renderOwnersLeadSourceGovernancePanel === 'function',
    state: Boolean(context.fubLeadSourceViewState && context.fubLeadSourceViewState.context === 'owner'),
    groupOptions: Array.isArray(context.FUB_SOURCE_GROUP_OPTIONS) && context.FUB_SOURCE_GROUP_OPTIONS.includes('Ads Leads'),
  }
  const tagHelpers = context.getFubMarketingTag({ marketingType: 'marketing' }).label === 'Marketing' &&
    context.getFubOwnershipTag({ ownershipType: 'company' }).label === 'Company' &&
    context.getFubFlagTag({ flagState: 'not_canonical' }).label === 'Invalid Lead Source'
  const groupOrder = context.getFubSourceGroupOrder('Web Leads') < context.getFubSourceGroupOrder('Ungrouped')
  const driftPanel = context.renderFubLeadSourceDriftPanel(syntheticFubPayload())
  const managerPanel = context.renderFubLeadSourceManagerPanel()
  await new Promise(resolve => setTimeout(resolve, 0))
  await new Promise(resolve => setTimeout(resolve, 0))
  const managerText = collectText(managerPanel)

  const helperBehavior = {
    tagHelpers,
    groupOrder,
    driftPanel: driftPanel && /Open review queue|Drift watch/.test(collectText(driftPanel)),
    managerRender: managerPanel && managerPanel.tagName === 'DETAILS' &&
      /FUB lead-source taxonomy|Google PPC|Legacy Bad Source/.test(managerText),
    noLiveMutationOnInitialRender: liveMutationCalls === 0,
  }

  return { routeGlobals, helperBehavior }
}

async function main() {
  const args = parseArgs()
  const checks = []

  const [
    foundationHtml,
    navSource,
    dataSource,
    foundationSource,
    sourceRegistrySource,
    fubLeadSourceSource,
    systemInventorySource,
    sourceLifecycleSource,
    runtimeSource,
    operationsSource,
    routerSource,
    packageText,
  ] = await Promise.all([
    readRepoFile('public/foundation.html'),
    readRepoFile('public/foundation-nav-config.js'),
    readRepoFile('public/foundation-data.js'),
    readRepoFile('public/foundation.js'),
    readRepoFile('public/foundation-source-registry-renderers.js'),
    readRepoFile('public/foundation-fub-lead-source-renderers.js'),
    readRepoFile('public/foundation-system-inventory-renderers.js'),
    readRepoFile('public/foundation-source-lifecycle-renderers.js'),
    readRepoFile('public/foundation-runtime-renderers.js'),
    readRepoFile('public/foundation-operations-renderers.js'),
    readRepoFile('public/foundation-router.js'),
    readRepoFile('package.json'),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_APPROVAL_PATH,
    cardId: FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_CARD_ID,
  })
  ensure(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'plan approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_APPROVAL_PATH)

  const [cards, planCriticRuns, activeSprint] = await Promise.all([
    getBacklogItemsByIds([FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_CARD_ID]),
    getPlanCriticRunsByCardIds([FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_CARD_ID]),
    getActiveFoundationCurrentSprint(),
  ])
  const card = cards[0] || null
  const planCritic = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= 9.8) || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_CARD_ID) || null
  ensure(checks, card && ['scoped', 'executing', 'done'].includes(card.lane), 'live backlog card exists in an allowed lane', card ? `${card.id}/${card.lane}` : 'missing')
  ensure(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  ensure(checks, activeSprint.sprint?.sprintId === FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_SPRINT_ID, 'Current Sprint is the FUB lead-source renderer split sprint', activeSprint.sprint?.sprintId || 'missing')
  ensure(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint item reached Building Now or Done', sprintItem ? sprintItem.stage : 'missing')

  const scriptOrder = evaluateFrontendFubLeadSourceScriptOrder(extractFoundationFubLeadSourceScriptOrder(foundationHtml))
  ensure(checks, scriptOrder.ok, 'Foundation HTML loads FUB lead-source module in required order', scriptOrder.indexes.join(', '))

  const browserDogfood = await runFubLeadSourceBrowserDogfood({
    navSource,
    dataSource,
    foundationSource,
    sourceRegistrySource,
    fubLeadSourceSource,
  })
  const splitEvaluation = evaluateFrontendFubLeadSourceRendererSplit({
    foundationSource,
    fubLeadSourceSource,
    sourceRegistrySource,
    dataSource,
    htmlSource: foundationHtml,
    lineCounts: {
      before: FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_BEFORE_LINES,
      after: lineCount(foundationSource),
    },
    routeGlobals: browserDogfood.routeGlobals,
    helperBehavior: browserDogfood.helperBehavior,
  })
  ensure(checks, splitEvaluation.ok, 'VM FUB lead-source dispatch reaches extracted renderers', JSON.stringify({
    lineCounts: splitEvaluation.lineCounts,
    routeGlobals: splitEvaluation.routeGlobals,
    helperBehavior: splitEvaluation.helperBehavior,
    oldFailures: splitEvaluation.oldFailures,
  }))
  ensure(checks, FRONTEND_FUB_LEAD_SOURCE_RENDERER_NAMES.every(name => fubLeadSourceSource.includes(`function ${name}(`)), 'moved renderer functions live in FUB lead-source module', FRONTEND_FUB_LEAD_SOURCE_RENDERER_NAMES.join(', '))
  ensure(checks, FRONTEND_FUB_LEAD_SOURCE_RENDERER_NAMES.every(name => !foundationSource.includes(`function ${name}(`)), 'public/foundation.js no longer defines moved FUB renderer functions', `${lineCount(foundationSource)} lines`)
  ensure(checks, lineCount(foundationSource) < FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_MAX_AFTER_LINES, 'public/foundation.js is below FUB split line budget', `${lineCount(foundationSource)} < ${FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_MAX_AFTER_LINES}`)

  const combinedFrontendBytes = byteLength([
    navSource,
    dataSource,
    foundationSource,
    sourceRegistrySource,
    fubLeadSourceSource,
    systemInventorySource,
    sourceLifecycleSource,
    runtimeSource,
    operationsSource,
    routerSource,
  ].join('\n'))
  ensure(checks, combinedFrontendBytes <= Math.ceil(FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_BEFORE_BYTES * FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_BYTE_GROWTH_LIMIT), 'combined frontend split bytes stay under growth budget', String(combinedFrontendBytes))

  const [foundationRoute, fubLeadSourceScript] = await Promise.all([
    timedFetch('/foundation'),
    timedFetch('/foundation-fub-lead-source-renderers.js'),
  ])
  ensure(checks, foundationRoute.ok && foundationRoute.timeMs <= FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_ROUTE_BUDGET_MS, '/foundation serves under route budget', `status=${foundationRoute.status} time=${foundationRoute.timeMs}ms bytes=${foundationRoute.bytes}`)
  ensure(checks, fubLeadSourceScript.ok && fubLeadSourceScript.bytes > 1000, 'FUB lead-source split browser script serves', `status=${fubLeadSourceScript.status} bytes=${fubLeadSourceScript.bytes}`)

  const packageJson = JSON.parse(packageText)
  ensure(checks, packageJson.scripts?.['process:frontend-fub-lead-source-renderers-split-check'] === `node --env-file-if-exists=.env ${FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:frontend-fub-lead-source-renderers-split-check'] || 'missing')

  await closeFoundationDb()
  const failures = checks.filter(check => !check.ok)
  const summary = {
    ok: failures.length === 0,
    cardId: FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_CARD_ID,
    closeoutKey: FRONTEND_FUB_LEAD_SOURCE_RENDERERS_SPLIT_CLOSEOUT_KEY,
    checks,
    failures,
    splitEvaluation,
    route: foundationRoute,
    script: fubLeadSourceScript,
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Frontend FUB lead-source renderer split proof')
    checks.forEach(check => console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`))
    console.log(`Summary: ${checks.length - failures.length}/${checks.length} checks passed`)
  }

  if (failures.length) process.exit(1)
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error)
  process.exit(1)
})
