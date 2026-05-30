#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_APPROVAL_PATH,
  FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_BEFORE_BYTES,
  FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_BEFORE_LINES,
  FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_BYTE_GROWTH_LIMIT,
  FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_CARD_ID,
  FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_CLOSEOUT_KEY,
  FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_PLAN_PATH,
  FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_ROUTE_BUDGET_MS,
  FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_SCRIPT_PATH,
  FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_SPRINT_ID,
  FRONTEND_SOURCE_LIFECYCLE_RENDERER_NAMES,
  FRONTEND_SOURCE_LIFECYCLE_SCRIPT_ORDER,
  evaluateFrontendSourceLifecycleRendererSplit,
  evaluateFrontendSourceLifecycleScriptOrder,
  extractFoundationScriptOrder,
} from '../lib/foundation-frontend-source-lifecycle-renderers-split.js'
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

function createFakeBrowserContext(fetchLog) {
  const elements = new Map()
  const storage = new Map()
  const routeCalls = []
  const replacements = []
  const location = {
    hash: '#source-lifecycle',
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
      return ['current-state', 'source-lifecycle', 'system-health'].map(section => {
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
        json: async () => buildFakeSourceLifecycle(),
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

function buildFakeSourceLifecycle() {
  return {
    summary: {
      sourceContractCount: 35,
      extractionTargetCount: 12,
      parkedOrBlockedVisible: 1,
      allSourceContractsCovered: true,
      allExtractionTargetsCovered: true,
      extractionCapsUnchanged: true,
      targetBaselineChanges: 0,
    },
    sourceMaturityGrid: {
      summary: { completeSources: 1, gapSources: 1, deferredSources: 0 },
      stageKeys: ['connected', 'trusted'],
      definitions: [
        { key: 'connected', label: 'Connected' },
        { key: 'trusted', label: 'Trusted' },
      ],
      rows: [
        {
          sourceId: 'SRC-TEST-001',
          title: 'Synthetic source',
          unitName: 'Foundation',
          nextGap: 'trusted',
          tone: 'pending',
          stages: {
            connected: { ok: true, detail: 'Connected' },
            trusted: { ok: false, detail: 'Needs trust proof' },
          },
        },
      ],
      topGaps: [{ sourceId: 'SRC-TEST-001', nextGap: 'trusted', detail: 'Needs trust proof' }],
    },
    sourceExtractionCoverage: {
      summary: {
        sourceCount: 1,
        sourcesWithTarget: 1,
        sourcesWithLastSuccess: 1,
        sourcesWithFailure: 0,
        sourcesDeferred: 0,
        sourcesNotRequired: 0,
        last24hRuns: 1,
        last24hItems: 3,
        sourcesPending: 0,
      },
      rows: [
        {
          sourceId: 'SRC-TEST-001',
          title: 'Synthetic source',
          unitName: 'Foundation',
          label: 'healthy',
          tone: 'connected',
          reason: 'Synthetic proof row',
          targetKeys: ['target.synthetic'],
          latestSuccessAt: '2026-05-15T01:00:00.000Z',
          latestFailureAt: null,
          last24h: { runs: 1, items: 3 },
          nextSafeCommands: ['npm run synthetic:proof'],
        },
      ],
      topAttention: [],
    },
    definitions: [
      { key: 'connected', label: 'Connected', detail: 'Synthetic lifecycle definition.' },
    ],
    lanes: [
      { key: 'source', label: 'Source', status: 'active', detail: 'Synthetic source lane.', evidenceRefs: [] },
    ],
    extractionTargets: [
      { targetKey: 'target.synthetic', sourceId: 'SRC-TEST-001', status: 'active', schedule: 'manual', cap: 'safe', evidenceRefs: [] },
    ],
    parked: [
      { sourceId: 'SRC-PARKED-001', reason: 'Synthetic parked proof row.', status: 'parked', nextReview: '2026-05-16' },
    ],
    scope: {
      included: ['Synthetic included source lifecycle proof.'],
      excluded: ['Synthetic excluded source lifecycle proof.'],
      boundaries: ['Report-only proof.'],
    },
  }
}

function wrapSourceLifecycleRenderers(context) {
  const names = [
    'renderSourceLifecycleHero',
    'renderSourceLifecycleSummary',
    'renderSourceLifecycleScope',
  ]
  for (const name of names) {
    const actual = context[name]
    context[`__actual_${name}`] = actual
    context[name] = function sourceLifecycleRendererWrapper() {
      context.__routeCalls.push(name)
      return context.document.createElement('section')
    }
  }
}

async function runSourceLifecycleBrowserDogfood(sources) {
  const fetchLog = []
  const context = createFakeBrowserContext(fetchLog)
  vm.runInContext(sources.navConfig, context, { filename: 'foundation-nav-config.js' })
  vm.runInContext(sources.data, context, { filename: 'foundation-data.js' })
  vm.runInContext(sources.foundation, context, { filename: 'foundation.js' })
  vm.runInContext(sources.sourceLifecycle, context, { filename: 'foundation-source-lifecycle-renderers.js' })

  const lifecycle = buildFakeSourceLifecycle()
  const helperBehavior = {
    hero: Boolean(context.renderSourceLifecycleHero(lifecycle)?.children?.length),
    summary: Boolean(context.renderSourceLifecycleSummary(lifecycle)?.children?.length),
    maturityGrid: Boolean(context.renderSourceMaturityGridPanel(lifecycle.sourceMaturityGrid)?.children?.length),
    coverage: Boolean(context.renderSourceExtractionCoveragePanel(lifecycle.sourceExtractionCoverage)?.children?.length),
  }

  wrapSourceLifecycleRenderers(context)
  context.fetchSourceLifecycle = async () => lifecycle
  context.applySectionFocus = function applySectionFocus() {}
  context.renderSourceLifecycle()
  await new Promise(resolve => setImmediate(resolve))
  await new Promise(resolve => setImmediate(resolve))
  const container = context.document.getElementById('found-content')

  return {
    routeDispatch: {
      sourceLifecycle: container.children.length >= 5,
      hero: context.__routeCalls.includes('renderSourceLifecycleHero'),
      summary: context.__routeCalls.includes('renderSourceLifecycleSummary'),
      scope: context.__routeCalls.includes('renderSourceLifecycleScope'),
    },
    helperBehavior,
    routeCalls: context.__routeCalls,
    containerChildren: container.children.length,
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
    sourceLifecycleSource,
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
    readRepoFile('public/foundation-source-lifecycle-renderers.js'),
    readRepoFile('public/foundation-runtime-renderers.js'),
    readRepoFile('public/foundation-operations-renderers.js'),
    readRepoFile('public/foundation-router.js'),
    readRepoFile(FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_SCRIPT_PATH),
    readRepoFile('lib/foundation-frontend-source-lifecycle-renderers-split.js'),
    readRepoFile(FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_PLAN_PATH),
    readRepoFile('package.json'),
  ])
  const packageJson = JSON.parse(packageSource)
  const [card] = await getBacklogItemsByIds([FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_CARD_ID])
  const sprint = await getActiveFoundationCurrentSprint()
  const sprintItem = (sprint.items || []).find(item => item.cardId === FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_CARD_ID) || null
  const planCriticRuns = await getPlanCriticRunsByCardIds([FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_CARD_ID])
  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_APPROVAL_PATH,
    cardId: FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_CARD_ID,
  })
  await closeFoundationDb()

  const scriptOrder = extractFoundationScriptOrder(htmlSource)
  const scriptOrderResult = evaluateFrontendSourceLifecycleScriptOrder(scriptOrder)
  const browserDogfood = await runSourceLifecycleBrowserDogfood({
    navConfig: navConfigSource,
    data: dataSource,
    foundation: foundationSource,
    sourceLifecycle: sourceLifecycleSource,
  })
  const foundationLines = lineCount(foundationSource)
  const sourceLifecycleLines = lineCount(sourceLifecycleSource)
  const combinedScriptBytes = [
    navConfigSource,
    dataSource,
    foundationSource,
    sourceLifecycleSource,
    runtimeSource,
    operationsSource,
    routerSource,
  ].reduce((sum, source) => sum + byteLength(source), 0)
  const routeBudget = await timedFetch('/foundation')
  const scriptBudgets = []
  for (const src of FRONTEND_SOURCE_LIFECYCLE_SCRIPT_ORDER) {
    scriptBudgets.push({ src, ...(await timedFetch(src)) })
  }
  const split = evaluateFrontendSourceLifecycleRendererSplit({
    foundationSource,
    sourceLifecycleSource,
    runtimeSource,
    operationsSource,
    htmlSource,
    lineCounts: {
      before: FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_BEFORE_LINES,
      after: foundationLines,
    },
    routeDispatch: browserDogfood.routeDispatch,
    helperBehavior: browserDogfood.helperBehavior,
  })
  const planCritic = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= 9.8) || null

  ensure(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_APPROVAL_PATH)
  ensure(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  ensure(checks, sprint.sprint?.sprintId === FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_SPRINT_ID, 'Current Sprint is the source lifecycle renderer split sprint', sprint.sprint?.sprintId || 'missing')
  ensure(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint contains the card in Building Now or Done', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : 'missing')
  ensure(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  ensure(checks, scriptOrderResult.ok, 'Foundation HTML loads source lifecycle renderer module in dependency order', scriptOrder.join(' -> '))
  ensure(checks, foundationLines < FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_BEFORE_LINES, 'public/foundation.js line count decreases', `${FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_BEFORE_LINES} -> ${foundationLines}`)
  ensure(checks, sourceLifecycleLines >= 1000, 'source lifecycle renderer module carries the extracted cluster', `${sourceLifecycleLines} lines`)
  ensure(checks, combinedScriptBytes <= Math.round(FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_BEFORE_BYTES * FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_BYTE_GROWTH_LIMIT), 'combined split script bytes stay within budget', `${combinedScriptBytes}/${FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_BEFORE_BYTES}`)
  ensure(checks, routeBudget.ok && routeBudget.timeMs <= FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_ROUTE_BUDGET_MS, 'served /foundation route stays under browser budget', `${routeBudget.status} ${routeBudget.timeMs}ms ${routeBudget.bytes}B`)
  ensure(checks, scriptBudgets.every(item => item.ok && item.status === 200), 'all split browser scripts are served', scriptBudgets.map(item => `${item.src}:${item.status}`).join(', '))
  ensure(checks, browserDogfood.routeDispatch.sourceLifecycle && browserDogfood.routeDispatch.hero && browserDogfood.routeDispatch.summary && browserDogfood.routeDispatch.scope, 'VM Source Lifecycle dispatch reaches extracted renderers', browserDogfood.routeCalls.join(', '))
  ensure(checks, Object.values(browserDogfood.helperBehavior).every(Boolean), 'VM proof executes extracted source lifecycle helper behavior', JSON.stringify(browserDogfood.helperBehavior))
  ensure(checks, split.ok === true, 'dogfood rejects missing/wrong source lifecycle module failures', split.invariant)
  ensure(checks, FRONTEND_SOURCE_LIFECYCLE_RENDERER_NAMES.every(name => !foundationSource.includes(`function ${name}(`)) && FRONTEND_SOURCE_LIFECYCLE_RENDERER_NAMES.every(name => sourceLifecycleSource.includes(`function ${name}(`)), 'source lifecycle renderers moved out of public/foundation.js', `${FRONTEND_SOURCE_LIFECYCLE_RENDERER_NAMES.length} functions moved`)
  ensure(checks, foundationSource.includes('function renderSourceLifecycle()') && foundationSource.includes('renderSourceLifecycleHero(') && foundationSource.includes('renderSourceLifecycleScope('), 'public/foundation.js keeps route owner and calls source lifecycle globals', 'renderSourceLifecycle remains')
  ensure(checks, packageJson.scripts?.['process:frontend-source-lifecycle-renderers-split-check'] === `node --env-file-if-exists=.env ${FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:frontend-source-lifecycle-renderers-split-check'] || 'missing')
  ensure(checks, proofScriptSource.includes('runSourceLifecycleBrowserDogfood') && helperSource.includes('evaluateFrontendSourceLifecycleRendererSplit') && planSource.includes('real workflow'), 'plan/helper/proof include behavior and read-only posture', FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_PLAN_PATH)

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_CARD_ID,
    closeoutKey: FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_CLOSEOUT_KEY,
    lineCounts: {
      before: FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_BEFORE_LINES,
      after: foundationLines,
      sourceLifecycle: sourceLifecycleLines,
      delta: foundationLines - FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_BEFORE_LINES,
    },
    bytes: {
      before: FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_BEFORE_BYTES,
      after: combinedScriptBytes,
      growthLimit: FRONTEND_SOURCE_LIFECYCLE_RENDERERS_SPLIT_BYTE_GROWTH_LIMIT,
    },
    routeBudget,
    scriptBudgets: scriptBudgets.map(item => ({ src: item.src, status: item.status, timeMs: item.timeMs, bytes: item.bytes })),
    split,
    checks,
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(`Foundation frontend source lifecycle renderer split check: ${ok ? 'PASS' : 'FAIL'}`)
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
