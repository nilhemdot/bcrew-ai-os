#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_APPROVAL_PATH,
  FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_BEFORE_BYTES,
  FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_BEFORE_LINES,
  FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_BYTE_GROWTH_LIMIT,
  FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_CARD_ID,
  FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_CLOSEOUT_KEY,
  FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_MAX_AFTER_LINES,
  FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_ROUTE_BUDGET_MS,
  FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_SCRIPT_PATH,
  FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_SPRINT_ID,
  FRONTEND_CURRENT_STATE_RENDERER_NAMES,
  evaluateFrontendCurrentStateRendererSplit,
  evaluateFrontendCurrentStateScriptOrder,
  extractFoundationCurrentStateScriptOrder,
} from '../lib/foundation-frontend-current-state-renderers-split.js'
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
  element.type = ''
  element.colSpan = 0
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
    if (listeners[type]) {
      listeners[type]({
        target: element,
        preventDefault() {},
        stopPropagation() {},
      })
    }
  }
  element.closest = function closest() {
    return null
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
    location: { hash: '#current-state', replace(value) { this.replaced = value } },
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

function syntheticHubPayload() {
  return {
    currentSprint: {
      status: 'healthy',
      goal: 'Dogfood Current State split.',
      activeBlocker: {
        cardId: FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_CARD_ID,
        title: 'Split Foundation Current State renderers',
      },
      summary: { doneThisSprintCount: 1 },
      stages: [
        {
          key: 'building_now',
          items: [{
            cardId: FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_CARD_ID,
            title: 'Split Foundation Current State renderers',
          }],
        },
      ],
    },
    backlogItems: [
      {
        id: FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_CARD_ID,
        title: 'Split Foundation Current State renderers',
        lane: 'executing',
        priority: 'P1',
      },
      {
        id: 'DATA-020',
        title: 'Freshness rules',
        lane: 'done',
        priority: 'P1',
      },
      {
        id: 'SECURITY-002',
        title: 'Security layer',
        lane: 'done',
        priority: 'P0',
      },
    ],
    pendingDocUpdates: [],
    decisions: [],
    reviewQueue: {
      stats: { openItems: 1, queuedReview: 1, needsFixing: 0 },
      freshness: { status: 'clear', label: 'Fresh', reason: 'Synthetic dogfood.' },
      sections: {
        admin: {
          openItems: 1,
          queuedReview: 1,
          needsFixing: 0,
          freshness: { label: 'Fresh' },
          items: [{
            title: 'Synthetic Admin review',
            findingsPreview: 'Synthetic current-state queue item.',
            owner: 'Ops',
            reviewStatus: 'queued',
          }],
        },
      },
    },
  }
}

function syntheticStructureStatus() {
  return {
    status: 'ok',
    workbooks: [
      { label: 'Owners', status: 'ok', failedChecks: 0 },
      { label: 'Finance', status: 'ok', failedChecks: 0 },
    ],
  }
}

async function runCurrentStateBrowserDogfood({
  navSource,
  dataSource,
  foundationSource,
  sourceRegistrySource,
  fubLeadSourceSource,
  systemInventorySource,
  currentStateSource,
  sourceLifecycleSource,
  runtimeSource,
  operationsSource,
}) {
  const context = createVmContext()
  runClassicScript(context, 'foundation-nav-config.js', navSource)
  runClassicScript(context, 'foundation-data.js', dataSource)
  runClassicScript(context, 'foundation.js', foundationSource)
  runClassicScript(context, 'foundation-source-registry-renderers.js', sourceRegistrySource)
  runClassicScript(context, 'foundation-fub-lead-source-renderers.js', fubLeadSourceSource)
  runClassicScript(context, 'foundation-system-inventory-renderers.js', systemInventorySource)
  runClassicScript(context, 'foundation-current-state-renderers.js', currentStateSource)
  runClassicScript(context, 'foundation-source-lifecycle-renderers.js', sourceLifecycleSource)
  runClassicScript(context, 'foundation-runtime-renderers.js', runtimeSource)
  runClassicScript(context, 'foundation-operations-renderers.js', operationsSource)

  context.getSectionFocus = function getSectionFocus() { return '' }
  context.fetchDoc = async () => ({ meta: { updatedAt: '2026-05-15T07:35:10Z' }, markdown: '# Current State' })
  context.fetchFoundationHub = async () => syntheticHubPayload()
  context.fetchSheetStructureStatus = async () => syntheticStructureStatus()

  const routeGlobals = {
    currentState: typeof context.renderCurrentState === 'function',
    truthPanel: typeof context.renderFoundationCurrentTruthPanel === 'function',
    executionOrder: typeof context.renderFoundationExecutionOrderPanel === 'function',
    surfaceTable: typeof context.renderCurrentStateSurfaceTable === 'function',
    sourceHref: typeof context.getCurrentStateSourceHref === 'function',
  }

  const sourceLinks = context.getCurrentStateSourceHref('SRC-FUB-001') === '/foundation#source-apis:SRC-FUB-001' &&
    context.buildCurrentStateSourceLinks(['SRC-OWNERS-001', 'SRC-FUB-001']).includes('/foundation#source-sheets:SRC-OWNERS-001')
  const backlogCell = collectText(context.renderCurrentStateBacklogCell(syntheticHubPayload(), [FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_CARD_ID])).includes('1 active')
  const surfaceTable = collectText(context.renderCurrentStateSurfaceTable([
    {
      title: 'Synthetic surface',
      statusKey: 'connected',
      statusLabel: 'Ready',
      currentSummary: 'Current proof.',
      next: 'Next proof.',
      later: 'Later proof.',
      packageParts: [{
        sourceId: 'SRC-FUB-001',
        statusKey: 'connected',
        statusLabel: 'Level 6',
        body: 'FUB proof.',
        role: 'FUB source',
        next: 'No blocker.',
      }],
    },
  ])).includes('Synthetic surface')

  context.renderCurrentState()
  await new Promise(resolve => setTimeout(resolve, 0))
  await new Promise(resolve => setTimeout(resolve, 0))
  await new Promise(resolve => setTimeout(resolve, 0))
  const routeText = collectText(context.document.content)
  const routeRender = /Foundation Overview|System Maturity|Live Inboxes Are Separate/.test(routeText)

  return {
    routeGlobals,
    helperBehavior: {
      sourceLinks,
      backlogCell,
      surfaceTable,
      routeRender,
    },
  }
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
    currentStateSource,
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
    readRepoFile('public/foundation-current-state-renderers.js'),
    readRepoFile('public/foundation-source-lifecycle-renderers.js'),
    readRepoFile('public/foundation-runtime-renderers.js'),
    readRepoFile('public/foundation-operations-renderers.js'),
    readRepoFile('public/foundation-router.js'),
    readRepoFile('package.json'),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_APPROVAL_PATH,
    cardId: FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_CARD_ID,
  })
  ensure(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'plan approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_APPROVAL_PATH)

  const [cards, planCriticRuns, activeSprint] = await Promise.all([
    getBacklogItemsByIds([FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_CARD_ID]),
    getPlanCriticRunsByCardIds([FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_CARD_ID]),
    getActiveFoundationCurrentSprint(),
  ])
  const card = cards[0] || null
  const planCritic = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= 9.8) || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_CARD_ID) || null
  ensure(checks, card && ['scoped', 'executing', 'done'].includes(card.lane), 'live backlog card exists in an allowed lane', card ? `${card.id}/${card.lane}` : 'missing')
  ensure(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  ensure(checks, activeSprint.sprint?.sprintId === FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_SPRINT_ID, 'Current Sprint is the Current State renderer split sprint', activeSprint.sprint?.sprintId || 'missing')
  ensure(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint item reached Building Now or Done', sprintItem ? sprintItem.stage : 'missing')

  const scriptOrder = evaluateFrontendCurrentStateScriptOrder(extractFoundationCurrentStateScriptOrder(foundationHtml))
  ensure(checks, scriptOrder.ok, 'Foundation HTML loads Current State module in required order', scriptOrder.indexes.join(', '))

  const browserDogfood = await runCurrentStateBrowserDogfood({
    navSource,
    dataSource,
    foundationSource,
    sourceRegistrySource,
    fubLeadSourceSource,
    systemInventorySource,
    currentStateSource,
    sourceLifecycleSource,
    runtimeSource,
    operationsSource,
  })
  const splitEvaluation = evaluateFrontendCurrentStateRendererSplit({
    foundationSource,
    currentStateSource,
    dataSource,
    runtimeSource,
    routerSource,
    htmlSource: foundationHtml,
    lineCounts: {
      before: FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_BEFORE_LINES,
      after: lineCount(foundationSource),
    },
    routeGlobals: browserDogfood.routeGlobals,
    helperBehavior: browserDogfood.helperBehavior,
  })
  ensure(checks, splitEvaluation.ok, 'VM Current State dispatch reaches extracted renderers', JSON.stringify({
    lineCounts: splitEvaluation.lineCounts,
    routeGlobals: splitEvaluation.routeGlobals,
    helperBehavior: splitEvaluation.helperBehavior,
    oldFailures: splitEvaluation.oldFailures,
  }))
  ensure(checks, FRONTEND_CURRENT_STATE_RENDERER_NAMES.every(name => currentStateSource.includes(`function ${name}(`)), 'moved renderer functions live in Current State module', FRONTEND_CURRENT_STATE_RENDERER_NAMES.join(', '))
  ensure(checks, FRONTEND_CURRENT_STATE_RENDERER_NAMES.every(name => !foundationSource.includes(`function ${name}(`)), 'public/foundation.js no longer defines moved Current State renderer functions', `${lineCount(foundationSource)} lines`)
  ensure(checks, lineCount(foundationSource) < FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_MAX_AFTER_LINES, 'public/foundation.js is below Current State split line budget', `${lineCount(foundationSource)} < ${FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_MAX_AFTER_LINES}`)

  const combinedFrontendBytes = [
    foundationSource,
    sourceRegistrySource,
    fubLeadSourceSource,
    systemInventorySource,
    currentStateSource,
    sourceLifecycleSource,
    runtimeSource,
    operationsSource,
    routerSource,
    dataSource,
    navSource,
  ].reduce((total, source) => total + byteLength(source), 0)
  ensure(checks, combinedFrontendBytes < FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_BEFORE_BYTES * FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_BYTE_GROWTH_LIMIT, 'combined frontend split bytes stay under growth budget', String(combinedFrontendBytes))

  const route = await timedFetch('/foundation')
  ensure(checks, route.ok && route.timeMs < FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_ROUTE_BUDGET_MS, '/foundation serves under route budget', `status=${route.status} time=${route.timeMs}ms bytes=${route.bytes}`)

  const script = await timedFetch('/foundation-current-state-renderers.js')
  ensure(checks, script.ok && script.bytes > 1000, 'Current State split browser script serves', `status=${script.status} bytes=${script.bytes}`)

  const packageJson = JSON.parse(packageText)
  ensure(checks, packageJson.scripts?.['process:frontend-current-state-renderers-split-check'] === `node --env-file-if-exists=.env ${FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:frontend-current-state-renderers-split-check'] || 'missing')

  await closeFoundationDb()
  const failures = checks.filter(check => !check.ok)
  const summary = {
    ok: failures.length === 0,
    cardId: FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_CARD_ID,
    closeoutKey: FRONTEND_CURRENT_STATE_RENDERERS_SPLIT_CLOSEOUT_KEY,
    checks,
    failures,
    splitEvaluation,
    route,
    script,
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(`FRONTEND_CURRENT_STATE_RENDERERS_SPLIT ${summary.ok ? 'PASS' : 'FAIL'} ${checks.length - failures.length}/${checks.length}`)
    failures.forEach(failure => console.log(`FAIL ${failure.check}: ${failure.detail}`))
  }

  if (!summary.ok) process.exit(1)
}

main().catch(async error => {
  try {
    await closeFoundationDb()
  } catch {
    // Ignore close failures while reporting the original proof failure.
  }
  console.error(error)
  process.exit(1)
})
