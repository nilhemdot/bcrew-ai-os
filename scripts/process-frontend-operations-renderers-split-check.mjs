#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  FRONTEND_OPERATIONS_RENDERERS_SPLIT_APPROVAL_PATH,
  FRONTEND_OPERATIONS_RENDERERS_SPLIT_BEFORE_BYTES,
  FRONTEND_OPERATIONS_RENDERERS_SPLIT_BEFORE_LINES,
  FRONTEND_OPERATIONS_RENDERERS_SPLIT_BYTE_GROWTH_LIMIT,
  FRONTEND_OPERATIONS_RENDERERS_SPLIT_CARD_ID,
  FRONTEND_OPERATIONS_RENDERERS_SPLIT_CLOSEOUT_KEY,
  FRONTEND_OPERATIONS_RENDERERS_SPLIT_PLAN_PATH,
  FRONTEND_OPERATIONS_RENDERERS_SPLIT_ROUTE_BUDGET_MS,
  FRONTEND_OPERATIONS_RENDERERS_SPLIT_SCRIPT_PATH,
  FRONTEND_OPERATIONS_RENDERERS_SPLIT_SPRINT_ID,
  FRONTEND_OPERATIONS_SCRIPT_ORDER,
  evaluateFrontendOperationsRendererSplit,
  evaluateFrontendOperationsScriptOrder,
  extractFoundationScriptOrder,
} from '../lib/foundation-frontend-operations-renderers-split.js'
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
  const navItems = FRONTEND_OPERATIONS_SCRIPT_ORDER.map((src, index) => {
    const section = ['current-state', 'backlog', 'build-log', 'system-health', 'system-activity'][index] || 'overview'
    const item = createFakeElement('a', `nav-${section}`)
    item.getAttribute = name => (name === 'data-section' ? section : '')
    return item
  })
  const storage = new Map()
  const routeCalls = []
  const replacements = []
  const location = {
    hash: '#build-log',
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
    addEventListener() {},
    requestAnimationFrame(fn) { fn() },
    setTimeout(fn) { fn() },
    clearTimeout() {},
    alert(message) { routeCalls.push(`alert:${message}`) },
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
        json: async () => ({ ok: true, url: cleanUrl, builds: [], summary: {}, days: [], query: {}, memoryStatus: [], recentChanges: [] }),
        text: async () => JSON.stringify({ ok: true, url: cleanUrl }),
        blob: async () => ({ fake: true }),
      }
    },
    __routeCalls: routeCalls,
    __replacements: replacements,
  }
  context.globalThis = context
  return vm.createContext(context)
}

function installNonOperationsRenderStubs(context) {
  const rendererNames = [
    'renderCurrentState',
    'renderFoundationSystems',
    'renderOverview',
    'renderStrategyDoc',
    'renderBacklog',
    'renderDecisions',
    'renderOpenQuestions',
    'renderSourceLifecycle',
    'renderSourceRegistry',
    'renderInventoryDocs',
    'renderInventoryArchiveHistory',
    'renderCapabilitySection',
  ]
  for (const name of rendererNames) {
    context[name] = function rendererStub(arg) {
      context.__routeCalls.push(arg ? `${name}:${arg}` : name)
    }
  }
}

function wrapOperationsRenderers(context) {
  for (const name of ['renderBuildLog', 'renderDataHealth', 'renderSystemActivity', 'renderDailySummary']) {
    const actual = context[name]
    context[`__actual_${name}`] = actual
    context[name] = function operationsRendererWrapper() {
      context.__routeCalls.push(name)
    }
  }
}

async function runOperationsBrowserDogfood(sources) {
  const fetchLog = []
  const context = createFakeBrowserContext(fetchLog)
  vm.runInContext(sources.navConfig, context, { filename: 'foundation-nav-config.js' })
  vm.runInContext(sources.data, context, { filename: 'foundation-data.js' })
  vm.runInContext(sources.foundation, context, { filename: 'foundation.js' })
  vm.runInContext(sources.operations, context, { filename: 'foundation-operations-renderers.js' })

  const helperBehavior = {
    anchor: context.getBuildAnchorId({ closeoutKey: 'A Test Closeout!' }) === 'build-closeout-a-test-closeout',
    commitGrouping: (() => {
      const groups = context.groupBuildsByCommit([
        { sha: 'abc123', shortSha: 'abc123', subject: 'One' },
        { sha: 'abc123', shortSha: 'abc123', subject: 'Two' },
      ])
      return groups.length === 1 && groups[0].builds.length === 2
    })(),
    textList: context.renderBuildTextList(['one', 'two'])?.children?.length === 2,
    daySelector: context.renderDailySummaryDaySelector({
      query: { selectedDate: '2026-05-15' },
      recentDays: [{ date: '2026-05-15', shipped: 1, changes: 2 }],
    })?.children?.length >= 2,
  }

  installNonOperationsRenderStubs(context)
  wrapOperationsRenderers(context)
  vm.runInContext(sources.router, context, { filename: 'foundation-router.js' })

  for (const section of ['#build-log', '#system-health', '#system-activity', '#daily-summary']) {
    context.window.location.hash = section
    context.route()
  }

  return {
    routeDispatch: {
      buildLog: context.__routeCalls.includes('renderBuildLog'),
      systemHealth: context.__routeCalls.includes('renderDataHealth'),
      systemActivity: context.__routeCalls.includes('renderSystemActivity'),
      dailySummary: context.__routeCalls.includes('renderDailySummary'),
    },
    helperBehavior,
    routeCalls: context.__routeCalls,
    fetchCount: fetchLog.length,
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
    operationsSource,
    routerSource,
    proofScriptSource,
    helperSource,
    planSource,
    packageSource,
  ] = await Promise.all([
    readRepoFile('public/foundation.html'),
    readRepoFile('public/foundation-nav-config.js'),
    readRepoFile('public/foundation-data.js'),
    readRepoFile('public/foundation.js'),
    readRepoFile('public/foundation-operations-renderers.js'),
    readRepoFile('public/foundation-router.js'),
    readRepoFile(FRONTEND_OPERATIONS_RENDERERS_SPLIT_SCRIPT_PATH),
    readRepoFile('lib/foundation-frontend-operations-renderers-split.js'),
    readRepoFile(FRONTEND_OPERATIONS_RENDERERS_SPLIT_PLAN_PATH),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const [card] = await getBacklogItemsByIds([FRONTEND_OPERATIONS_RENDERERS_SPLIT_CARD_ID])
  const sprint = await getActiveFoundationCurrentSprint()
  const sprintItem = (sprint.items || []).find(item => item.cardId === FRONTEND_OPERATIONS_RENDERERS_SPLIT_CARD_ID) || null
  const planCriticRuns = await getPlanCriticRunsByCardIds([FRONTEND_OPERATIONS_RENDERERS_SPLIT_CARD_ID])
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: FRONTEND_OPERATIONS_RENDERERS_SPLIT_APPROVAL_PATH,
    cardId: FRONTEND_OPERATIONS_RENDERERS_SPLIT_CARD_ID,
  })
  await closeFoundationDb()

  const scriptOrder = extractFoundationScriptOrder(htmlSource)
  const scriptOrderResult = evaluateFrontendOperationsScriptOrder(scriptOrder)
  const browserDogfood = await runOperationsBrowserDogfood({
    navConfig: navConfigSource,
    data: dataSource,
    foundation: foundationSource,
    operations: operationsSource,
    router: routerSource,
  })
  const foundationLines = lineCount(foundationSource)
  const operationsLines = lineCount(operationsSource)
  const combinedScriptBytes = [
    navConfigSource,
    dataSource,
    foundationSource,
    operationsSource,
    routerSource,
  ].reduce((sum, source) => sum + byteLength(source), 0)
  const routeBudget = await timedFetch('/foundation')
  const scriptBudgets = []
  for (const src of FRONTEND_OPERATIONS_SCRIPT_ORDER) {
    scriptBudgets.push({ src, ...(await timedFetch(src)) })
  }
  const split = evaluateFrontendOperationsRendererSplit({
    foundationSource,
    operationsSource,
    htmlSource,
    lineCounts: {
      before: FRONTEND_OPERATIONS_RENDERERS_SPLIT_BEFORE_LINES,
      after: foundationLines,
    },
    routeDispatch: browserDogfood.routeDispatch,
    helperBehavior: browserDogfood.helperBehavior,
  })
  const planCritic = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= 9.8) || null

  ensure(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || FRONTEND_OPERATIONS_RENDERERS_SPLIT_APPROVAL_PATH)
  ensure(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  ensure(checks, sprint.sprint?.sprintId === FRONTEND_OPERATIONS_RENDERERS_SPLIT_SPRINT_ID, 'Current Sprint is the operations renderer split sprint', sprint.sprint?.sprintId || 'missing')
  ensure(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains the card in Building Now or Done', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  ensure(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  ensure(checks, scriptOrderResult.ok, 'Foundation HTML loads operations renderer module in dependency order', scriptOrder.join(' -> '))
  ensure(checks, foundationLines < FRONTEND_OPERATIONS_RENDERERS_SPLIT_BEFORE_LINES, 'public/foundation.js line count decreases', `${FRONTEND_OPERATIONS_RENDERERS_SPLIT_BEFORE_LINES} -> ${foundationLines}`)
  ensure(checks, operationsLines >= 900, 'operations renderer module carries the extracted renderer cluster', `${operationsLines} lines`)
  ensure(checks, combinedScriptBytes <= Math.round(FRONTEND_OPERATIONS_RENDERERS_SPLIT_BEFORE_BYTES * FRONTEND_OPERATIONS_RENDERERS_SPLIT_BYTE_GROWTH_LIMIT), 'combined split script bytes stay within budget', `${combinedScriptBytes}/${FRONTEND_OPERATIONS_RENDERERS_SPLIT_BEFORE_BYTES}`)
  ensure(checks, routeBudget.ok && routeBudget.timeMs <= FRONTEND_OPERATIONS_RENDERERS_SPLIT_ROUTE_BUDGET_MS, 'served /foundation route stays under browser budget', `${routeBudget.status} ${routeBudget.timeMs}ms ${routeBudget.bytes}B`)
  ensure(checks, scriptBudgets.every(item => item.ok && item.status === 200), 'all split browser scripts are served', scriptBudgets.map(item => `${item.src}:${item.status}`).join(', '))
  ensure(checks, browserDogfood.routeDispatch.buildLog && browserDogfood.routeDispatch.systemHealth && browserDogfood.routeDispatch.systemActivity && browserDogfood.routeDispatch.dailySummary, 'VM router dispatch reaches extracted operations renderers', browserDogfood.routeCalls.join(', '))
  ensure(checks, Object.values(browserDogfood.helperBehavior).every(Boolean), 'VM proof executes extracted helper behavior', JSON.stringify(browserDogfood.helperBehavior))
  ensure(checks, split.ok === true, 'dogfood rejects missing/wrong operations module failures', split.invariant)
  ensure(checks, !foundationSource.includes('function renderDataHealth()') && !foundationSource.includes('function renderBuildLog()') && operationsSource.includes('function renderDataHealth()') && operationsSource.includes('function renderBuildLog()'), 'operations renderers moved out of public/foundation.js', 'renderDataHealth/renderBuildLog moved')
  ensure(checks, packageJson.scripts?.['process:frontend-operations-renderers-split-check'] === `node --env-file-if-exists=.env ${FRONTEND_OPERATIONS_RENDERERS_SPLIT_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:frontend-operations-renderers-split-check'] || 'missing')
  ensure(checks, proofScriptSource.includes('runOperationsBrowserDogfood') && helperSource.includes('evaluateFrontendOperationsRendererSplit') && planSource.includes('read-only by default'), 'plan/helper/proof include behavior and read-only posture', FRONTEND_OPERATIONS_RENDERERS_SPLIT_PLAN_PATH)

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: FRONTEND_OPERATIONS_RENDERERS_SPLIT_CARD_ID,
    closeoutKey: FRONTEND_OPERATIONS_RENDERERS_SPLIT_CLOSEOUT_KEY,
    lineCounts: {
      before: FRONTEND_OPERATIONS_RENDERERS_SPLIT_BEFORE_LINES,
      after: foundationLines,
      operations: operationsLines,
      delta: foundationLines - FRONTEND_OPERATIONS_RENDERERS_SPLIT_BEFORE_LINES,
    },
    bytes: {
      before: FRONTEND_OPERATIONS_RENDERERS_SPLIT_BEFORE_BYTES,
      after: combinedScriptBytes,
      growthLimit: FRONTEND_OPERATIONS_RENDERERS_SPLIT_BYTE_GROWTH_LIMIT,
    },
    routeBudget,
    scriptBudgets: scriptBudgets.map(item => ({ src: item.src, status: item.status, timeMs: item.timeMs, bytes: item.bytes })),
    split,
    checks,
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(`Foundation frontend operations renderer split check: ${ok ? 'PASS' : 'FAIL'}`)
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
