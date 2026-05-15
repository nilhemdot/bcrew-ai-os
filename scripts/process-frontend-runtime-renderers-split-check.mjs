#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  FRONTEND_RUNTIME_RENDERERS_SPLIT_APPROVAL_PATH,
  FRONTEND_RUNTIME_RENDERERS_SPLIT_BEFORE_BYTES,
  FRONTEND_RUNTIME_RENDERERS_SPLIT_BEFORE_LINES,
  FRONTEND_RUNTIME_RENDERERS_SPLIT_BYTE_GROWTH_LIMIT,
  FRONTEND_RUNTIME_RENDERERS_SPLIT_CARD_ID,
  FRONTEND_RUNTIME_RENDERERS_SPLIT_CLOSEOUT_KEY,
  FRONTEND_RUNTIME_RENDERERS_SPLIT_PLAN_PATH,
  FRONTEND_RUNTIME_RENDERERS_SPLIT_ROUTE_BUDGET_MS,
  FRONTEND_RUNTIME_RENDERERS_SPLIT_SCRIPT_PATH,
  FRONTEND_RUNTIME_RENDERERS_SPLIT_SPRINT_ID,
  FRONTEND_RUNTIME_RENDERER_NAMES,
  FRONTEND_RUNTIME_SCRIPT_ORDER,
  evaluateFrontendRuntimeRendererSplit,
  evaluateFrontendRuntimeScriptOrder,
  extractFoundationScriptOrder,
} from '../lib/foundation-frontend-runtime-renderers-split.js'
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
  const storage = new Map()
  const routeCalls = []
  const replacements = []
  const location = {
    hash: '#system-health',
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
      if (selector !== '.found-nav-item') return []
      return ['current-state', 'build-log', 'daily-summary', 'system-health'].map(section => {
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
        json: async () => buildFakeFoundationHub(),
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

function buildFakeFoundationHub() {
  return {
    backlogItems: [{ id: 'ONE', lane: 'scoped' }],
    decisions: [],
    openQuestions: [],
    pendingDocUpdates: [],
    recentChanges: [],
    memoryStatus: [],
    kpiHealth: null,
    runtimeSupervisor: null,
    backlogHygiene: null,
    cardReferenceTrust: null,
    sourceReferenceTrust: null,
    postShipFanout: null,
    docArchiveCleanup: null,
    exceptionCuration: null,
    hitListReconcile: null,
    archiveRetire: null,
    researchCuration: null,
    sheetsApiTrust: null,
    doctrinePropagation: null,
    decisionAutoEmit: null,
    surfaceFreshnessSweep: null,
    agentFeedbackAutoSend: null,
    agentFeedbackProductionAutoSendDryRun: null,
    agentFeedbackReminders: null,
    runtimeProcessControl: {
      status: 'healthy',
      summary: {
        activeFoundationJobRuns: 0,
        activeSourceCrawlRuns: 0,
        leasedSourceCrawlItems: 0,
        activeLlmCalls: 0,
        staleRiskCount: 0,
        stopEligibleRuns: 0,
      },
      activeProcessView: { foundationJobRuns: [] },
      controls: {},
      restartOnPush: { status: 'automatic', plainEnglish: 'Automatic restart metadata is present.' },
      costRisk: { status: 'quiet' },
    },
    meetingVaultAutoEnforcement: null,
    foundationJobs: {
      jobs: [{ title: 'Nightly health', status: 'healthy', runtimeMode: 'scheduled' }],
      scheduledJobs: 1,
      dueJobs: 0,
      manualJobs: 0,
    },
    sharedCommunicationsCoverage: null,
    sharedCommunicationSynthesis: null,
    llmRuntime: {
      summary: { availableCredentials: 1, credentialCount: 1, availableRoutes: 1, routeCount: 1 },
      routes: [{ routeKey: 'default', status: 'available', provider: 'openai', authPath: 'env', model: 'gpt' }],
      credentials: [{ provider: 'openai', status: 'available' }],
    },
    extractionControl: null,
    driveCorpusInventory: null,
  }
}

function installRenderStubs(context) {
  const maybeMissingPanelNames = [
    'renderKpiHealthRuntimeWarning',
    'renderSurfaceFreshnessSweepPanel',
    'renderIntelligencePipelinePanel',
    'renderExtractionControlPanel',
    'renderDriveCorpusInventoryPanel',
    'getSystemHealthGroups',
  ]
  for (const name of maybeMissingPanelNames) {
    if (name === 'getSystemHealthGroups') {
      context[name] = () => []
    } else if (!context[name]) {
      context[name] = () => null
    }
  }
}

function wrapRuntimeRenderers(context) {
  const names = [
    'renderFoundationOperationsPurposePanel',
    'renderFoundationJobsPanel',
    'renderRuntimeProcessControlPanel',
    'renderLlmRuntimePanel',
  ]
  for (const name of names) {
    const actual = context[name]
    context[`__actual_${name}`] = actual
    context[name] = function runtimeRendererWrapper() {
      context.__routeCalls.push(name)
      return context.document.createElement('section')
    }
  }
}

async function runRuntimeBrowserDogfood(sources) {
  const fetchLog = []
  const context = createFakeBrowserContext(fetchLog)
  vm.runInContext(sources.navConfig, context, { filename: 'foundation-nav-config.js' })
  vm.runInContext(sources.data, context, { filename: 'foundation-data.js' })
  vm.runInContext(sources.foundation, context, { filename: 'foundation.js' })
  vm.runInContext(sources.runtime, context, { filename: 'foundation-runtime-renderers.js' })

  const helperBehavior = {
    purposePanel: Boolean(context.renderFoundationOperationsPurposePanel('system-health', buildFakeFoundationHub())),
    statusGroup: context.renderStatusGroupPanel('Title', 'Intro', [{ label: 'One', status: 'live', detail: 'Done' }])?.children?.length >= 2,
    llmPanel: Boolean(context.renderLlmRuntimePanel(buildFakeFoundationHub().llmRuntime)),
  }

  installRenderStubs(context)
  wrapRuntimeRenderers(context)
  vm.runInContext(sources.operations, context, { filename: 'foundation-operations-renderers.js' })
  context.fetchFoundationHubFull = async () => buildFakeFoundationHub()
  context.renderDataHealth()
  await new Promise(resolve => setImmediate(resolve))

  return {
    routeDispatch: {
      systemHealth: context.__routeCalls.includes('renderFoundationOperationsPurposePanel'),
      jobs: context.__routeCalls.includes('renderFoundationJobsPanel'),
      llmRuntime: context.__routeCalls.includes('renderLlmRuntimePanel'),
      runtimeProcess: context.__routeCalls.includes('renderRuntimeProcessControlPanel'),
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
    runtimeSource,
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
    readRepoFile('public/foundation-runtime-renderers.js'),
    readRepoFile('public/foundation-operations-renderers.js'),
    readRepoFile('public/foundation-router.js'),
    readRepoFile(FRONTEND_RUNTIME_RENDERERS_SPLIT_SCRIPT_PATH),
    readRepoFile('lib/foundation-frontend-runtime-renderers-split.js'),
    readRepoFile(FRONTEND_RUNTIME_RENDERERS_SPLIT_PLAN_PATH),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const [card] = await getBacklogItemsByIds([FRONTEND_RUNTIME_RENDERERS_SPLIT_CARD_ID])
  const sprint = await getActiveFoundationCurrentSprint()
  const sprintItem = (sprint.items || []).find(item => item.cardId === FRONTEND_RUNTIME_RENDERERS_SPLIT_CARD_ID) || null
  const planCriticRuns = await getPlanCriticRunsByCardIds([FRONTEND_RUNTIME_RENDERERS_SPLIT_CARD_ID])
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: FRONTEND_RUNTIME_RENDERERS_SPLIT_APPROVAL_PATH,
    cardId: FRONTEND_RUNTIME_RENDERERS_SPLIT_CARD_ID,
  })
  await closeFoundationDb()

  const scriptOrder = extractFoundationScriptOrder(htmlSource)
  const scriptOrderResult = evaluateFrontendRuntimeScriptOrder(scriptOrder)
  const browserDogfood = await runRuntimeBrowserDogfood({
    navConfig: navConfigSource,
    data: dataSource,
    foundation: foundationSource,
    runtime: runtimeSource,
    operations: operationsSource,
  })
  const foundationLines = lineCount(foundationSource)
  const runtimeLines = lineCount(runtimeSource)
  const combinedScriptBytes = [
    navConfigSource,
    dataSource,
    foundationSource,
    runtimeSource,
    operationsSource,
    routerSource,
  ].reduce((sum, source) => sum + byteLength(source), 0)
  const routeBudget = await timedFetch('/foundation')
  const scriptBudgets = []
  for (const src of FRONTEND_RUNTIME_SCRIPT_ORDER) {
    scriptBudgets.push({ src, ...(await timedFetch(src)) })
  }
  const split = evaluateFrontendRuntimeRendererSplit({
    foundationSource,
    runtimeSource,
    operationsSource,
    htmlSource,
    lineCounts: {
      before: FRONTEND_RUNTIME_RENDERERS_SPLIT_BEFORE_LINES,
      after: foundationLines,
    },
    routeDispatch: browserDogfood.routeDispatch,
    helperBehavior: browserDogfood.helperBehavior,
  })
  const planCritic = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= 9.8) || null

  ensure(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || FRONTEND_RUNTIME_RENDERERS_SPLIT_APPROVAL_PATH)
  ensure(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  ensure(checks, sprint.sprint?.sprintId === FRONTEND_RUNTIME_RENDERERS_SPLIT_SPRINT_ID, 'Current Sprint is the runtime renderer split sprint', sprint.sprint?.sprintId || 'missing')
  ensure(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains the card in Building Now or Done', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  ensure(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  ensure(checks, scriptOrderResult.ok, 'Foundation HTML loads runtime renderer module in dependency order', scriptOrder.join(' -> '))
  ensure(checks, foundationLines < FRONTEND_RUNTIME_RENDERERS_SPLIT_BEFORE_LINES, 'public/foundation.js line count decreases', `${FRONTEND_RUNTIME_RENDERERS_SPLIT_BEFORE_LINES} -> ${foundationLines}`)
  ensure(checks, runtimeLines >= 1000, 'runtime renderer module carries the extracted diagnostics cluster', `${runtimeLines} lines`)
  ensure(checks, combinedScriptBytes <= Math.round(FRONTEND_RUNTIME_RENDERERS_SPLIT_BEFORE_BYTES * FRONTEND_RUNTIME_RENDERERS_SPLIT_BYTE_GROWTH_LIMIT), 'combined split script bytes stay within budget', `${combinedScriptBytes}/${FRONTEND_RUNTIME_RENDERERS_SPLIT_BEFORE_BYTES}`)
  ensure(checks, routeBudget.ok && routeBudget.timeMs <= FRONTEND_RUNTIME_RENDERERS_SPLIT_ROUTE_BUDGET_MS, 'served /foundation route stays under browser budget', `${routeBudget.status} ${routeBudget.timeMs}ms ${routeBudget.bytes}B`)
  ensure(checks, scriptBudgets.every(item => item.ok && item.status === 200), 'all split browser scripts are served', scriptBudgets.map(item => `${item.src}:${item.status}`).join(', '))
  ensure(checks, browserDogfood.routeDispatch.systemHealth && browserDogfood.routeDispatch.jobs && browserDogfood.routeDispatch.llmRuntime && browserDogfood.routeDispatch.runtimeProcess, 'VM Runtime Health dispatch reaches extracted runtime renderers', browserDogfood.routeCalls.join(', '))
  ensure(checks, Object.values(browserDogfood.helperBehavior).every(Boolean), 'VM proof executes extracted runtime helper behavior', JSON.stringify(browserDogfood.helperBehavior))
  ensure(checks, split.ok === true, 'dogfood rejects missing/wrong runtime module failures', split.invariant)
  ensure(checks, FRONTEND_RUNTIME_RENDERER_NAMES.every(name => !foundationSource.includes(`function ${name}(`)) && FRONTEND_RUNTIME_RENDERER_NAMES.every(name => runtimeSource.includes(`function ${name}(`)), 'runtime renderers moved out of public/foundation.js', `${FRONTEND_RUNTIME_RENDERER_NAMES.length} functions moved`)
  ensure(checks, operationsSource.includes('function renderDataHealth()') && operationsSource.includes('renderFoundationJobsPanel(') && operationsSource.includes('renderLlmRuntimePanel('), 'operations renderers still own Runtime Health route and call runtime globals', 'renderDataHealth remains in operations module')
  ensure(checks, packageJson.scripts?.['process:frontend-runtime-renderers-split-check'] === `node --env-file-if-exists=.env ${FRONTEND_RUNTIME_RENDERERS_SPLIT_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:frontend-runtime-renderers-split-check'] || 'missing')
  ensure(checks, proofScriptSource.includes('runRuntimeBrowserDogfood') && helperSource.includes('evaluateFrontendRuntimeRendererSplit') && planSource.includes('read-only by default'), 'plan/helper/proof include behavior and read-only posture', FRONTEND_RUNTIME_RENDERERS_SPLIT_PLAN_PATH)

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: FRONTEND_RUNTIME_RENDERERS_SPLIT_CARD_ID,
    closeoutKey: FRONTEND_RUNTIME_RENDERERS_SPLIT_CLOSEOUT_KEY,
    lineCounts: {
      before: FRONTEND_RUNTIME_RENDERERS_SPLIT_BEFORE_LINES,
      after: foundationLines,
      runtime: runtimeLines,
      delta: foundationLines - FRONTEND_RUNTIME_RENDERERS_SPLIT_BEFORE_LINES,
    },
    bytes: {
      before: FRONTEND_RUNTIME_RENDERERS_SPLIT_BEFORE_BYTES,
      after: combinedScriptBytes,
      growthLimit: FRONTEND_RUNTIME_RENDERERS_SPLIT_BYTE_GROWTH_LIMIT,
    },
    routeBudget,
    scriptBudgets: scriptBudgets.map(item => ({ src: item.src, status: item.status, timeMs: item.timeMs, bytes: item.bytes })),
    split,
    checks,
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(`Foundation frontend runtime renderer split check: ${ok ? 'PASS' : 'FAIL'}`)
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
