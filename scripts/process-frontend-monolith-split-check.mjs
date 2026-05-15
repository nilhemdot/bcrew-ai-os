#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  FRONTEND_MONOLITH_SCRIPT_ORDER,
  FRONTEND_MONOLITH_SPLIT_APPROVAL_PATH,
  FRONTEND_MONOLITH_SPLIT_BEFORE_BYTES,
  FRONTEND_MONOLITH_SPLIT_BEFORE_LINES,
  FRONTEND_MONOLITH_SPLIT_BYTE_GROWTH_LIMIT,
  FRONTEND_MONOLITH_SPLIT_CARD_ID,
  FRONTEND_MONOLITH_SPLIT_CLOSEOUT_KEY,
  FRONTEND_MONOLITH_SPLIT_PLAN_PATH,
  FRONTEND_MONOLITH_SPLIT_ROUTE_BUDGET_MS,
  FRONTEND_MONOLITH_SPLIT_SCRIPT_PATH,
  FRONTEND_MONOLITH_SPLIT_SPRINT_ID,
  buildFrontendMonolithSplitDogfoodProof,
  evaluateFrontendScriptOrder,
  extractFoundationScriptOrder,
} from '../lib/foundation-frontend-monolith-split.js'
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
    text,
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
  element.scrollTop = 0
  element.className = ''
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

function createFakeBrowserContext(fetchLog) {
  const elements = new Map()
  const navItems = FRONTEND_MONOLITH_SCRIPT_ORDER.map((src, index) => {
    const section = ['current-state', 'backlog', 'system-health', 'source-overview'][index] || 'overview'
    const item = createFakeElement('a', `nav-${section}`)
    item.getAttribute = name => (name === 'data-section' ? section : '')
    return item
  })
  const storage = new Map()
  const renderCalls = []
  const replacements = []
  const eventListeners = {}
  const location = {
    hash: '#backlog:FRONTEND-MONOLITH-SPLIT-001',
    replace(value) {
      replacements.push(value)
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
      if (selector === '.found-nav-item') return navItems
      return []
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
    addEventListener(type, fn) { eventListeners[type] = fn },
    requestAnimationFrame(fn) { fn() },
    setTimeout(fn) { fn() },
    clearTimeout() {},
    alert(message) { renderCalls.push(`alert:${message}`) },
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
    fetch: async (url, options = {}) => {
      const cleanUrl = String(url)
      fetchLog.push({ url: cleanUrl, method: options.method || 'GET' })
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, url: cleanUrl, index: fetchLog.length }),
        blob: async () => ({ fake: true }),
        text: async () => JSON.stringify({ ok: true, url: cleanUrl }),
      }
    },
    __renderCalls: renderCalls,
    __replacements: replacements,
    __eventListeners: eventListeners,
  }
  context.globalThis = context
  return vm.createContext(context)
}

function installRenderStubs(context) {
  const rendererNames = [
    'renderCurrentState',
    'renderFoundationSystems',
    'renderOverview',
    'renderStrategyDoc',
    'renderBacklog',
    'renderDailySummary',
    'renderDecisions',
    'renderOpenQuestions',
    'renderBuildLog',
    'renderSourceLifecycle',
    'renderSourceRegistry',
    'renderInventoryDocs',
    'renderInventoryArchiveHistory',
    'renderCapabilitySection',
    'renderDataHealth',
    'renderSystemActivity',
  ]
  for (const name of rendererNames) {
    context[name] = function rendererStub(arg) {
      context.__renderCalls.push(arg ? `${name}:${arg}` : name)
    }
  }
}

async function runBrowserDogfood(sources) {
  const fetchLog = []
  const context = createFakeBrowserContext(fetchLog)
  vm.runInContext(sources.navConfig, context, { filename: 'foundation-nav-config.js' })
  vm.runInContext(sources.data, context, { filename: 'foundation-data.js' })

  const firstHub = await context.fetchFoundationHub()
  const secondHub = await context.fetchFoundationHub()
  const repeatedReadUsesCache = firstHub === secondHub &&
    fetchLog.filter(item => item.url === '/api/foundation-hub').length === 1
  context.clearFoundationCaches()
  await context.fetchFoundationHub()
  const clearInvalidates = fetchLog.filter(item => item.url === '/api/foundation-hub').length === 2
  context.cache.foundationHub = { stale: true }
  await context.foundationMutation('/api/foundation/proof', 'POST', { ok: true })
  const mutationClears = context.cache.foundationHub === null

  vm.runInContext(sources.foundation, context, { filename: 'foundation.js' })
  installRenderStubs(context)
  vm.runInContext(sources.router, context, { filename: 'foundation-router.js' })

  const initialCalls = context.__renderCalls.slice()
  context.window.location.hash = '#system-health'
  context.route()
  context.window.location.hash = '#source-overview:SRC-OWNERS-001'
  context.route()
  context.window.location.hash = '#bhag-model'
  context.route()

  const allCalls = context.__renderCalls.slice()
  return {
    ok: true,
    routeDispatch: {
      backlog: initialCalls.includes('renderBacklog'),
      systemHealth: allCalls.includes('renderDataHealth'),
      sourceOverview: allCalls.includes('renderSourceRegistry:source-overview'),
      strategyDoc: allCalls.includes('renderStrategyDoc:bhag-model'),
    },
    cache: {
      repeatedReadUsesCache,
      clearInvalidates,
      mutationClears,
      fetchCount: fetchLog.length,
    },
    renderCalls: allCalls,
  }
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [
    htmlSource,
    navConfigSource,
    dataSource,
    foundationSource,
    routerSource,
    proofScriptSource,
    planSource,
    packageSource,
  ] = await Promise.all([
    readRepoFile('public/foundation.html'),
    readRepoFile('public/foundation-nav-config.js'),
    readRepoFile('public/foundation-data.js'),
    readRepoFile('public/foundation.js'),
    readRepoFile('public/foundation-router.js'),
    readRepoFile(FRONTEND_MONOLITH_SPLIT_SCRIPT_PATH),
    readRepoFile(FRONTEND_MONOLITH_SPLIT_PLAN_PATH),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const [card] = await getBacklogItemsByIds([FRONTEND_MONOLITH_SPLIT_CARD_ID])
  const sprint = await getActiveFoundationCurrentSprint()
  const sprintItem = (sprint.items || []).find(item => item.cardId === FRONTEND_MONOLITH_SPLIT_CARD_ID) || null
  const planCriticRuns = await getPlanCriticRunsByCardIds([FRONTEND_MONOLITH_SPLIT_CARD_ID])
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: FRONTEND_MONOLITH_SPLIT_APPROVAL_PATH,
    cardId: FRONTEND_MONOLITH_SPLIT_CARD_ID,
  })
  await closeFoundationDb()

  const scriptOrder = extractFoundationScriptOrder(htmlSource)
  const scriptOrderResult = evaluateFrontendScriptOrder(scriptOrder)
  const routeBudget = await timedFetch('/foundation')
  const scriptBudgets = []
  for (const src of FRONTEND_MONOLITH_SCRIPT_ORDER) {
    scriptBudgets.push({ src, ...(await timedFetch(src)) })
  }
  const browserDogfood = await runBrowserDogfood({
    navConfig: navConfigSource,
    data: dataSource,
    foundation: foundationSource,
    router: routerSource,
  })
  const combinedScriptBytes = [
    navConfigSource,
    dataSource,
    foundationSource,
    routerSource,
  ].reduce((sum, source) => sum + byteLength(source), 0)
  const foundationLines = lineCount(foundationSource)
  const dogfood = buildFrontendMonolithSplitDogfoodProof({
    order: scriptOrder,
    routeDispatch: {
      backlog: browserDogfood.routeDispatch.backlog,
      systemHealth: browserDogfood.routeDispatch.systemHealth,
    },
    cache: browserDogfood.cache,
    lineCounts: {
      before: FRONTEND_MONOLITH_SPLIT_BEFORE_LINES,
      after: foundationLines,
    },
  })
  const planCritic = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= 9.8) || null

  ensure(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || FRONTEND_MONOLITH_SPLIT_APPROVAL_PATH)
  ensure(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  ensure(checks, sprint.sprint?.sprintId === FRONTEND_MONOLITH_SPLIT_SPRINT_ID, 'Current Sprint is the frontend monolith split sprint', sprint.sprint?.sprintId || 'missing')
  ensure(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains the card in Building Now or Done', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  ensure(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  ensure(checks, scriptOrderResult.ok, 'Foundation HTML loads frontend modules in dependency order', scriptOrder.join(' -> '))
  ensure(checks, foundationLines < FRONTEND_MONOLITH_SPLIT_BEFORE_LINES, 'public/foundation.js line count decreases', `${FRONTEND_MONOLITH_SPLIT_BEFORE_LINES} -> ${foundationLines}`)
  ensure(checks, combinedScriptBytes <= Math.round(FRONTEND_MONOLITH_SPLIT_BEFORE_BYTES * FRONTEND_MONOLITH_SPLIT_BYTE_GROWTH_LIMIT), 'combined split script bytes stay within budget', `${combinedScriptBytes}/${FRONTEND_MONOLITH_SPLIT_BEFORE_BYTES}`)
  ensure(checks, routeBudget.ok && routeBudget.timeMs <= FRONTEND_MONOLITH_SPLIT_ROUTE_BUDGET_MS, 'served /foundation route stays under browser budget', `${routeBudget.status} ${routeBudget.timeMs}ms ${routeBudget.bytes}B`)
  ensure(checks, scriptBudgets.every(item => item.ok && item.status === 200), 'all split browser scripts are served', scriptBudgets.map(item => `${item.src}:${item.status}`).join(', '))
  ensure(checks, browserDogfood.routeDispatch.backlog && browserDogfood.routeDispatch.systemHealth && browserDogfood.routeDispatch.sourceOverview && browserDogfood.routeDispatch.strategyDoc, 'VM browser proof routes to expected renderers', browserDogfood.renderCalls.join(', '))
  ensure(checks, browserDogfood.cache.repeatedReadUsesCache && browserDogfood.cache.clearInvalidates && browserDogfood.cache.mutationClears, 'VM browser proof preserves cache and mutation invalidation behavior', JSON.stringify(browserDogfood.cache))
  ensure(checks, dogfood.ok === true, 'dogfood rejects old frontend split failures', dogfood.invariant)
  ensure(checks, !foundationSource.includes('var cache = {') && !foundationSource.includes('function route()') && !foundationSource.includes('function init()'), 'public/foundation.js no longer owns data cache or router/init blocks', 'blocks extracted')
  ensure(checks, dataSource.includes('function fetchFoundationHub') && dataSource.includes('function foundationMutation') && routerSource.includes('function route()') && routerSource.includes('init()'), 'new frontend modules own data and router functions', 'data/router modules')
  ensure(checks, packageJson.scripts?.['process:frontend-monolith-split-check'] === `node --env-file-if-exists=.env ${FRONTEND_MONOLITH_SPLIT_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:frontend-monolith-split-check'] || 'missing')
  ensure(checks, planSource.includes('Route/performance budget') && proofScriptSource.includes('runBrowserDogfood'), 'plan and proof include route/cache dogfood', FRONTEND_MONOLITH_SPLIT_PLAN_PATH)

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: FRONTEND_MONOLITH_SPLIT_CARD_ID,
    closeoutKey: FRONTEND_MONOLITH_SPLIT_CLOSEOUT_KEY,
    lineCounts: {
      before: FRONTEND_MONOLITH_SPLIT_BEFORE_LINES,
      after: foundationLines,
      delta: foundationLines - FRONTEND_MONOLITH_SPLIT_BEFORE_LINES,
    },
    bytes: {
      before: FRONTEND_MONOLITH_SPLIT_BEFORE_BYTES,
      after: combinedScriptBytes,
      growthLimit: FRONTEND_MONOLITH_SPLIT_BYTE_GROWTH_LIMIT,
    },
    routeBudget,
    scriptBudgets: scriptBudgets.map(item => ({ src: item.src, status: item.status, timeMs: item.timeMs, bytes: item.bytes })),
    dogfood,
    checks,
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(`Foundation frontend monolith split check: ${ok ? 'PASS' : 'FAIL'}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }
  if (!ok) process.exit(1)
}

main().catch(async error => {
  try {
    await closeFoundationDb()
  } catch {}
  console.error(error instanceof Error ? error.stack : String(error))
  process.exit(1)
})
