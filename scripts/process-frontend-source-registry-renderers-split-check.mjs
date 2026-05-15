#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_APPROVAL_PATH,
  FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_BEFORE_BYTES,
  FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_BEFORE_LINES,
  FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_BYTE_GROWTH_LIMIT,
  FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_CARD_ID,
  FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_CLOSEOUT_KEY,
  FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_MAX_AFTER_LINES,
  FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_PLAN_PATH,
  FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_ROUTE_BUDGET_MS,
  FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_SCRIPT_PATH,
  FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_SPRINT_ID,
  FRONTEND_SOURCE_REGISTRY_RENDERER_NAMES,
  evaluateFrontendSourceRegistryRendererSplit,
  evaluateFrontendSourceRegistryScriptOrder,
  extractFoundationScriptOrder,
} from '../lib/foundation-frontend-source-registry-renderers-split.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const baseUrl = process.env.FOUNDATION_BASE_URL || 'http://localhost:3000'

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
  }
  return args
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
  element.parentElement = null
  element.hidden = false
  element.open = false
  element.href = ''
  element.textContent = ''
  element.innerHTML = ''
  element.value = ''
  element.className = ''
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
    return child
  }
  element.removeChild = function removeChild(child) {
    element.children = element.children.filter(item => item !== child)
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

function buildFakeSourceOfTruth() {
  return {
    sources: [
      {
        sourceId: 'SRC-TEST-001',
        title: 'Synthetic Workbook',
        unitName: 'Synthetic Admin',
        owner: 'Foundation',
        accessMethod: 'Google Sheets connector',
        group: 'verified',
        validation: 'Signed Off',
        scope: 'Synthetic scope',
        owns: 'Synthetic source truth',
        signedOffTabs: ['Admin'],
        actions: [{ label: 'Open source', href: '/foundation#source-overview:SRC-TEST-001' }],
      },
    ],
    connectors: [
      {
        connectorId: 'CONN-TEST-001',
        title: 'Synthetic Connector',
        status: 'connected',
        availableTo: 'Foundation',
        powers: 'Synthetic reads',
      },
    ],
    groupedSystems: [
      {
        systemId: 'SYS-TEST-001',
        title: 'Synthetic system',
        status: 'Mapped',
        trustState: 'Synthetic only',
        sourceIds: ['SRC-TEST-001'],
        connectorIds: ['CONN-TEST-001'],
        backlogIds: [FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_CARD_ID],
      },
    ],
    kpiHealth: {
      generatedAt: '2026-05-15T00:00:00.000Z',
      projectHost: 'synthetic.supabase.co',
      schemaDrift: { status: 'healthy' },
      leeRepo: { exists: true, repoPath: 'synthetic/lee' },
      summary: { status: 'healthy', tableCount: 1, rpcCount: 1, staleTables: 0 },
      tables: [
        {
          tableName: 'pipeline',
          status: 'healthy',
          freshnessStatus: 'fresh',
          rowCount: 5,
          freshnessWindowDays: 7,
          freshnessColumn: 'updated_at',
          latestValue: '2026-05-15T00:00:00.000Z',
        },
      ],
      rpcs: [
        {
          rpcName: 'get_pipeline',
          status: 'healthy',
          rowCount: 1,
          expectedColumns: ['id'],
        },
      ],
    },
    foundation: {
      sourceRegistry: {
        meta: { exists: true, path: 'docs/source-registry.md' },
        sections: [],
      },
    },
  }
}

function createFakeBrowserContext() {
  const elements = new Map()
  const storage = new Map()
  const location = {
    hash: '#source-overview',
    replace(value) {
      const hashIndex = String(value).indexOf('#')
      location.hash = hashIndex === -1 ? '' : String(value).slice(hashIndex)
    },
  }
  const document = {
    body: createFakeElement('body', 'body'),
    createElement(tag) {
      return createFakeElement(tag)
    },
    createTextNode(text) {
      const node = createFakeElement('text')
      node.textContent = text
      return node
    },
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, createFakeElement('div', id))
      return elements.get(id)
    },
    querySelectorAll(selector) {
      if (selector !== '.found-nav-item') return []
      return ['source-overview', 'source-connectors', 'source-lifecycle'].map(section => {
        const item = createFakeElement('a', `nav-${section}`)
        item.getAttribute = name => (name === 'data-section' ? section : '')
        return item
      })
    },
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, createFakeElement('div', selector))
      return elements.get(selector)
    },
  }
  const window = {
    location,
    localStorage: {
      getItem(key) { return storage.get(key) || '' },
      setItem(key, value) { storage.set(key, String(value)) },
      removeItem(key) { storage.delete(key) },
    },
    addEventListener() {},
    requestAnimationFrame(fn) { fn() },
    setTimeout(fn) { fn() },
    clearTimeout() {},
    alert() {},
    prompt() { return '' },
  }
  const context = {
    console,
    document,
    window,
    location,
    Node: FakeNode,
    performance,
    setTimeout: window.setTimeout,
    clearTimeout: window.clearTimeout,
    requestAnimationFrame: window.requestAnimationFrame,
    URL: {
      createObjectURL() { return 'blob:fake' },
      revokeObjectURL() {},
    },
    fetchSourceOfTruth: async () => buildFakeSourceOfTruth(),
    fetchFoundationHub: async () => ({
      backlogItems: [
        { id: FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_CARD_ID, title: 'Split Foundation source registry renderers', lane: 'executing', priority: 'P0' },
      ],
      foundationJobs: { jobs: [], latestRuns: [] },
    }),
    fetchOwnersLeadSourceGovernance: async () => ({ ok: true }),
    fetchFubLeadSourceDrift: async () => ({ ok: true }),
    fetchFubLeadSourceRules: async () => ({ ok: true }),
    foundationMutation: async () => ({ ok: true }),
    getSectionFocus() {
      return ''
    },
    applySectionFocus() {
      context.__appliedFocus = true
    },
  }
  context.globalThis = context
  return vm.createContext(context)
}

function getFoundContent(context) {
  return context.document.getElementById('found-content')
}

async function runSourceRegistryBrowserDogfood({
  foundationSource,
  sourceRegistrySource,
  sourceLifecycleSource,
  runtimeSource,
  operationsSource,
}) {
  const context = createFakeBrowserContext()
  vm.runInContext(foundationSource, context, { filename: 'foundation.js' })
  vm.runInContext(sourceRegistrySource, context, { filename: 'foundation-source-registry-renderers.js' })
  vm.runInContext(sourceLifecycleSource, context, { filename: 'foundation-source-lifecycle-renderers.js' })
  vm.runInContext(runtimeSource, context, { filename: 'foundation-runtime-renderers.js' })
  vm.runInContext(operationsSource, context, { filename: 'foundation-operations-renderers.js' })

  const tag = context.renderSourceTag('Trusted', 'connected')
  const meta = context.renderSourceMetaItem('Owner', 'Foundation')
  const bullet = context.renderSourceBulletGroup('Findings', ['One', 'Two'])
  const connector = context.renderConnectorCard({
    connectorId: 'CONN-TEST-001',
    title: 'Synthetic Connector',
    status: 'connected',
    availableTo: 'Foundation',
    powers: 'Synthetic reads',
  })

  const sourceLifecyclePanel = context.renderBrandStackPanel({
    status: 'healthy',
    summary: { activeBrandCount: 1, reviewRequiredBrandCount: 0, missingSourceRefCount: 0 },
    brands: [
      {
        brandId: 'brand-test',
        title: 'Synthetic Brand',
        status: 'active',
        sourceRefCount: 1,
        avatarCount: 1,
        gapSourceCount: 0,
        guardianBoundaryDefined: true,
        audienceBoundary: 'Synthetic',
        guardianRules: ['Synthetic rule'],
        sourceIds: ['SRC-TEST-001'],
      },
    ],
    boundary: ['Synthetic only'],
  })

  context.renderSourceRegistry('source-overview')
  await Promise.resolve()
  await Promise.resolve()
  const content = getFoundContent(context)
  const sourceOverviewChildren = content.children.length

  context.renderSourceRegistry('source-connectors')
  await Promise.resolve()
  await Promise.resolve()
  const connectorChildren = getFoundContent(context).children.length

  context.renderSourceRegistry('source-apis')
  await Promise.resolve()
  await Promise.resolve()
  const kpiChildren = getFoundContent(context).children.length

  return {
    ok: tag.textContent === 'Trusted' &&
      tag.className.includes('source-tag-connected') &&
      meta.children.length === 2 &&
      bullet.children.length >= 2 &&
      connector.children.length >= 3 &&
      sourceLifecyclePanel &&
      sourceLifecyclePanel.children.length >= 2 &&
      sourceOverviewChildren >= 5 &&
      connectorChildren >= 2 &&
      kpiChildren >= 3,
    helperBehavior: {
      tag: tag.textContent === 'Trusted' && tag.className.includes('source-tag-connected'),
      meta: meta.children.length === 2,
      bullet: bullet.children.length >= 2,
      connector: connector.children.length >= 3,
      sourceLifecycleUsesSharedHelpers: sourceLifecyclePanel && sourceLifecyclePanel.children.length >= 2,
    },
    routeDispatch: {
      sourceRegistry: sourceOverviewChildren >= 5,
      hero: sourceOverviewChildren >= 1,
      systems: sourceOverviewChildren >= 4,
      connectors: connectorChildren >= 2,
      kpi: kpiChildren >= 3,
    },
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    foundationSource,
    sourceRegistrySource,
    sourceLifecycleSource,
    runtimeSource,
    operationsSource,
    routerSource,
    htmlSource,
    packageSource,
    planSource,
  ] = await Promise.all([
    readRepoFile('public/foundation.js'),
    readRepoFile('public/foundation-source-registry-renderers.js'),
    readRepoFile('public/foundation-source-lifecycle-renderers.js'),
    readRepoFile('public/foundation-runtime-renderers.js'),
    readRepoFile('public/foundation-operations-renderers.js'),
    readRepoFile('public/foundation-router.js'),
    readRepoFile('public/foundation.html'),
    readRepoFile('package.json'),
    readRepoFile(FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_PLAN_PATH),
  ])
  const packageJson = JSON.parse(packageSource)
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_APPROVAL_PATH,
    cardId: FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_CARD_ID,
  })
  const [card] = await getBacklogItemsByIds([FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_CARD_ID])
  const activeSprint = await getActiveFoundationCurrentSprint()
  const planCriticRuns = await getPlanCriticRunsByCardIds([FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_CARD_ID])
  const passRun = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= 9.8)

  const browserDogfood = await runSourceRegistryBrowserDogfood({
    foundationSource,
    sourceRegistrySource,
    sourceLifecycleSource,
    runtimeSource,
    operationsSource,
  })
  const evaluation = evaluateFrontendSourceRegistryRendererSplit({
    foundationSource,
    sourceRegistrySource,
    sourceLifecycleSource,
    runtimeSource,
    operationsSource,
    htmlSource,
    lineCounts: {
      before: FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_BEFORE_LINES,
      after: lineCount(foundationSource),
    },
    routeDispatch: browserDogfood.routeDispatch,
    helperBehavior: browserDogfood.helperBehavior,
  })
  const route = await timedFetch('/foundation')
  const scripts = await Promise.all([
    '/foundation-source-registry-renderers.js',
    '/foundation-source-lifecycle-renderers.js',
    '/foundation-runtime-renderers.js',
    '/foundation-operations-renderers.js',
    '/foundation-router.js',
  ].map(async src => ({ src, ...(await timedFetch(src)) })))

  ensure(checks, approval.ok, 'approval file validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || approval.mode)
  ensure(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card is in an active or done lane', card ? card.lane : 'missing')
  ensure(checks, activeSprint.sprint?.sprintId === FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_SPRINT_ID || card?.lane === 'done', 'Current Sprint owns this card while active', activeSprint.sprint?.sprintId || 'missing')
  ensure(checks, Boolean(passRun), 'durable Plan Critic pass row exists', passRun ? `${passRun.runId} score=${passRun.score}` : 'missing pass run')
  ensure(checks, evaluation.ok, 'split invariant passes', JSON.stringify(evaluation))
  ensure(checks, browserDogfood.ok, 'VM Source Registry dispatch reaches extracted renderers', JSON.stringify(browserDogfood))
  ensure(checks, route.ok && route.timeMs < FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_ROUTE_BUDGET_MS, '/foundation route stays under budget', `${route.status} ${route.timeMs}ms ${route.bytes}B`)
  ensure(checks, scripts.every(script => script.ok), 'split browser scripts return 200', scripts.map(script => `${script.src}:${script.status}`).join(', '))
  ensure(checks, byteLength(foundationSource + sourceRegistrySource) <= Math.ceil(FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_BEFORE_BYTES * FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_BYTE_GROWTH_LIMIT), 'combined split bytes stay within growth budget', `${byteLength(foundationSource + sourceRegistrySource)}B`)
  ensure(checks, lineCount(foundationSource) < FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_MAX_AFTER_LINES, 'public/foundation.js drops below 10K lines', `${lineCount(foundationSource)} lines`)
  ensure(checks, packageJson.scripts?.['process:frontend-source-registry-renderers-split-check'] === `node --env-file-if-exists=.env ${FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:frontend-source-registry-renderers-split-check'] || 'missing')
  ensure(checks, planSource.includes('Dogfood proof recreates the unsafe old shape'), 'plan documents dogfood proof', 'dogfood section present')
  ensure(checks, routerSource.includes('function route()'), 'router module remains present', 'router script loaded after split modules')
  ensure(checks, FRONTEND_SOURCE_REGISTRY_RENDERER_NAMES.every(name => sourceRegistrySource.includes(`function ${name}(`)), 'all moved renderer names exist in source registry module', 'moved names present')

  await closeFoundationDb()

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    cardId: FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_CARD_ID,
    closeoutKey: FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_CLOSEOUT_KEY,
    summary: {
      checks: checks.length,
      passed: checks.length - failures.length,
      failed: failures.length,
      route,
      scripts,
      lineCounts: {
        before: FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_BEFORE_LINES,
        after: lineCount(foundationSource),
        sourceRegistryModule: lineCount(sourceRegistrySource),
      },
    },
    evaluation,
    browserDogfood,
    checks,
    failures,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else if (result.ok) {
    console.log(`OK ${FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_CARD_ID}: ${result.summary.passed}/${result.summary.checks} checks passed.`)
  } else {
    console.error(`FAIL ${FRONTEND_SOURCE_REGISTRY_RENDERERS_SPLIT_CARD_ID}: ${failures.length} failure(s).`)
    failures.forEach(failure => console.error(`- ${failure.check}: ${failure.detail}`))
  }

  if (!result.ok) process.exitCode = 1
}

main().catch(async error => {
  try {
    await closeFoundationDb()
  } catch {}
  console.error(error)
  process.exitCode = 1
})
