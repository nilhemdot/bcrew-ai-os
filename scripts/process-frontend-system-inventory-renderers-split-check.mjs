#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_APPROVAL_PATH,
  FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_BEFORE_BYTES,
  FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_BEFORE_LINES,
  FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_BYTE_GROWTH_LIMIT,
  FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_CARD_ID,
  FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_CLOSEOUT_KEY,
  FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_MAX_AFTER_LINES,
  FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_PLAN_PATH,
  FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_ROUTE_BUDGET_MS,
  FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_SCRIPT_PATH,
  FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_SPRINT_ID,
  FRONTEND_SYSTEM_INVENTORY_RENDERER_NAMES,
  evaluateFrontendSystemInventoryRendererSplit,
  evaluateFrontendSystemInventoryScriptOrder,
  extractFoundationSystemInventoryScriptOrder,
} from '../lib/foundation-frontend-system-inventory-renderers-split.js'
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
    location: { hash: '#systems', replace(value) { this.replaced = value } },
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
    fetch: async () => ({ ok: true, json: async () => ({}), text: async () => '' }),
  })
}

function runClassicScript(context, filename, source) {
  vm.runInContext(source, context, { filename })
}

async function runSystemInventoryBrowserDogfood({ foundationSource, sourceRegistrySource, systemInventorySource }) {
  const context = createVmContext()
  runClassicScript(context, 'foundation.js', foundationSource)
  runClassicScript(context, 'foundation-source-registry-renderers.js', sourceRegistrySource)
  runClassicScript(context, 'foundation-system-inventory-renderers.js', systemInventorySource)

  const routeGlobals = {
    foundationSystems: typeof context.renderFoundationSystems === 'function',
    inventoryDocs: typeof context.renderInventoryDocs === 'function',
    inventoryArchive: typeof context.renderInventoryArchiveHistory === 'function',
    capabilitySection: typeof context.renderCapabilitySection === 'function',
    capabilityCatalog: Boolean(context.capabilityCatalog && context.capabilityCatalog['capabilities-skills']),
  }

  const sourceMap = context.buildByKey([{ sourceId: 'SRC-TEST-001', title: 'Source Test' }], 'sourceId')
  const grouped = context.groupFoundationSystemsByServiceArea([
    {
      systemId: 'SYS-TEST-001',
      title: 'Test System',
      serviceArea: 'Ops',
      implementationState: 'live',
      maturityLabel: 'Mapped',
      sourceIds: ['SRC-TEST-001'],
      connectorIds: [],
      backlogIds: ['TEST-CARD-001'],
      runtimeJobKeys: [],
      purpose: 'Dogfood system card.',
    },
  ], ['Ops'])
  const systemCard = context.renderFoundationSystemFullCard(grouped.Ops[0], {
    sourceContractMap: sourceMap,
    connectorMap: {},
    backlogMap: { 'TEST-CARD-001': { id: 'TEST-CARD-001', title: 'Test Card', lane: 'scoped', priority: 'P0' } },
    jobMap: {},
    latestRunMap: {},
  })
  const inventorySplit = context.splitInventoryDocs([
    { category: 'Active doctrine', path: 'docs/current.md' },
    { category: 'Archive', path: 'docs/_archive/old.md' },
    { category: 'Other', path: 'docs/misc.md' },
  ])
  const capabilityCard = context.renderCapabilityCard({
    id: 'CAP-TEST-001',
    title: 'Capability Test',
    type: 'Skill',
    state: 'Installed',
    tone: 'connected',
    availableTo: 'Dogfood',
    purpose: 'Prove capability rendering after split.',
  })

  const helperBehavior = {
    systemGrouping: grouped.Ops && grouped.Ops.length === 1,
    systemCard: systemCard && systemCard.tagName === 'DETAILS' && systemCard.children.length > 0,
    inventorySplit: inventorySplit.currentDocs.length === 1 &&
      inventorySplit.archiveHistoryDocs.length === 1 &&
      inventorySplit.uncategorizedDocs.length === 1,
    capabilityCard: capabilityCard && capabilityCard.tagName === 'ARTICLE' && capabilityCard.children.length > 0,
  }

  return { routeGlobals, helperBehavior }
}

async function main() {
  const args = parseArgs()
  const checks = []

  const [
    foundationHtml,
    foundationSource,
    navConfigSource,
    dataSource,
    sourceRegistrySource,
    systemInventorySource,
    sourceLifecycleSource,
    runtimeSource,
    operationsSource,
    routerSource,
    packageText,
  ] = await Promise.all([
    readRepoFile('public/foundation.html'),
    readRepoFile('public/foundation.js'),
    readRepoFile('public/foundation-nav-config.js'),
    readRepoFile('public/foundation-data.js'),
    readRepoFile('public/foundation-source-registry-renderers.js'),
    readRepoFile('public/foundation-system-inventory-renderers.js'),
    readRepoFile('public/foundation-source-lifecycle-renderers.js'),
    readRepoFile('public/foundation-runtime-renderers.js'),
    readRepoFile('public/foundation-operations-renderers.js'),
    readRepoFile('public/foundation-router.js'),
    readRepoFile('package.json'),
  ])

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_APPROVAL_PATH,
    cardId: FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_CARD_ID,
  })
  ensure(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'plan approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_APPROVAL_PATH)

  const [cards, planCriticRuns, activeSprint] = await Promise.all([
    getBacklogItemsByIds([FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_CARD_ID]),
    getPlanCriticRunsByCardIds([FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_CARD_ID]),
    getActiveFoundationCurrentSprint(),
  ])
  const card = cards[0] || null
  const planCritic = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= 9.8) || null
  const sprintItem = (activeSprint.items || []).find(item => item.cardId === FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_CARD_ID) || null
  ensure(checks, card && ['scoped', 'executing', 'done'].includes(card.lane), 'live backlog card exists in an allowed lane', card ? `${card.id}/${card.lane}` : 'missing')
  ensure(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  ensure(checks, activeSprint.sprint?.sprintId === FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_SPRINT_ID, 'Current Sprint is the system inventory renderer split sprint', activeSprint.sprint?.sprintId || 'missing')
  ensure(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint item reached Building Now or Done', sprintItem ? sprintItem.stage : 'missing')

  const scriptOrder = evaluateFrontendSystemInventoryScriptOrder(extractFoundationSystemInventoryScriptOrder(foundationHtml))
  ensure(checks, scriptOrder.ok, 'Foundation HTML loads system inventory module in required order', scriptOrder.indexes.join(', '))

  const browserDogfood = await runSystemInventoryBrowserDogfood({
    foundationSource,
    sourceRegistrySource,
    systemInventorySource,
  })
  const splitEvaluation = evaluateFrontendSystemInventoryRendererSplit({
    foundationSource,
    systemInventorySource,
    sourceRegistrySource,
    routerSource,
    htmlSource: foundationHtml,
    lineCounts: {
      before: FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_BEFORE_LINES,
      after: lineCount(foundationSource),
    },
    routeGlobals: browserDogfood.routeGlobals,
    helperBehavior: browserDogfood.helperBehavior,
  })
  ensure(checks, splitEvaluation.ok, 'VM System Inventory dispatch reaches extracted renderers', JSON.stringify({
    lineCounts: splitEvaluation.lineCounts,
    routeGlobals: splitEvaluation.routeGlobals,
    helperBehavior: splitEvaluation.helperBehavior,
    oldFailures: splitEvaluation.oldFailures,
  }))
  ensure(checks, FRONTEND_SYSTEM_INVENTORY_RENDERER_NAMES.every(name => systemInventorySource.includes(`function ${name}(`)), 'moved renderer functions live in system inventory module', FRONTEND_SYSTEM_INVENTORY_RENDERER_NAMES.join(', '))
  ensure(checks, FRONTEND_SYSTEM_INVENTORY_RENDERER_NAMES.every(name => !foundationSource.includes(`function ${name}(`)), 'public/foundation.js no longer defines moved renderer functions', `${lineCount(foundationSource)} lines`)
  ensure(checks, lineCount(foundationSource) < FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_MAX_AFTER_LINES, 'public/foundation.js is below system inventory split line budget', `${lineCount(foundationSource)} < ${FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_MAX_AFTER_LINES}`)

  const combinedFrontendBytes = byteLength([
    navConfigSource,
    dataSource,
    foundationSource,
    sourceRegistrySource,
    systemInventorySource,
    sourceLifecycleSource,
    runtimeSource,
    operationsSource,
    routerSource,
  ].join('\n'))
  ensure(checks, combinedFrontendBytes <= Math.ceil(FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_BEFORE_BYTES * FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_BYTE_GROWTH_LIMIT), 'combined frontend split bytes stay under growth budget', String(combinedFrontendBytes))

  const [foundationRoute, systemInventoryScript] = await Promise.all([
    timedFetch('/foundation'),
    timedFetch('/foundation-system-inventory-renderers.js'),
  ])
  ensure(checks, foundationRoute.ok && foundationRoute.timeMs <= FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_ROUTE_BUDGET_MS, '/foundation serves under route budget', `status=${foundationRoute.status} time=${foundationRoute.timeMs}ms bytes=${foundationRoute.bytes}`)
  ensure(checks, systemInventoryScript.ok && systemInventoryScript.bytes > 1000, 'system inventory split browser script serves', `status=${systemInventoryScript.status} bytes=${systemInventoryScript.bytes}`)

  const packageJson = JSON.parse(packageText)
  ensure(checks, packageJson.scripts?.['process:frontend-system-inventory-renderers-split-check'] === `node --env-file-if-exists=.env ${FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:frontend-system-inventory-renderers-split-check'] || 'missing')

  await closeFoundationDb()
  const failures = checks.filter(check => !check.ok)
  const summary = {
    ok: failures.length === 0,
    cardId: FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_CARD_ID,
    closeoutKey: FRONTEND_SYSTEM_INVENTORY_RENDERERS_SPLIT_CLOSEOUT_KEY,
    checks,
    failures,
    splitEvaluation,
    route: foundationRoute,
    script: systemInventoryScript,
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Frontend system inventory renderer split proof')
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
