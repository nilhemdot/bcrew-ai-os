#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_APPROVAL_PATH,
  FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_BEFORE_BYTES,
  FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_BEFORE_LINES,
  FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_BYTE_GROWTH_LIMIT,
  FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_CARD_ID,
  FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_CLOSEOUT_KEY,
  FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_MAX_AFTER_LINES,
  FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_ROUTE_BUDGET_MS,
  FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_SCRIPT_PATH,
  FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_SPRINT_ID,
  FRONTEND_DECISION_QUESTION_RENDERER_NAMES,
  evaluateFrontendDecisionQuestionRendererSplit,
  evaluateFrontendDecisionQuestionScriptOrder,
  extractFoundationDecisionQuestionScriptOrder,
} from '../lib/foundation-frontend-decision-question-renderers-split.js'
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
    toggle(value, force) {
      if (force === true) {
        classes.add(value)
        return true
      }
      if (force === false) {
        classes.delete(value)
        return false
      }
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
    location: { hash: '#decisions', replace(value) { this.replaced = value } },
    setTimeout,
    clearTimeout,
    requestAnimationFrame(fn) { return setTimeout(fn, 0) },
    localStorage: {
      getItem() { return '' },
      setItem() {},
      removeItem() {},
    },
    alert(message) { window.lastAlert = message },
    confirm() { return true },
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
    meta: {
      canonicalDecisionCategories: ['strategy', 'system', 'execution'],
      backlogScopes: [{ key: 'foundation', label: 'Foundation', active: true }],
    },
    backlogItems: [{
      id: FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_CARD_ID,
      title: 'Split Foundation Decisions and Open Questions renderers',
      scope: 'foundation',
      lane: 'executing',
      priority: 'P1',
    }],
    decisions: [
      {
        id: 'DEC-DOGFOOD-001',
        title: 'Keep renderers modular',
        category: 'system',
        status: 'locked',
        summary: 'Decision renderer split should preserve route behavior.',
        rationale: 'The old monolith was above the 5K line limit.',
        sourceRef: 'dogfood',
        decisionOwner: 'Steve',
        confirmedBy: 'Steve',
        participantNames: ['Steve', 'Codex'],
        contextRef: 'frontend split proof',
        evidenceNotes: 'Synthetic decision evidence.',
        supersedesIds: [],
        createdAt: '2026-05-15T07:00:00.000Z',
        updatedAt: '2026-05-15T07:00:00.000Z',
      },
      {
        id: 'DEC-DOGFOOD-002',
        title: 'Proposed follow-up',
        category: 'execution',
        status: 'proposed',
        summary: 'Proposed decision row should render.',
        rationale: 'Synthetic review item.',
        sourceRef: 'dogfood',
        decisionOwner: 'Steve',
        confirmedBy: '',
        participantNames: ['Codex'],
        contextRef: 'frontend split proof',
        evidenceNotes: '',
        supersedesIds: [],
        createdAt: '2026-05-15T07:05:00.000Z',
        updatedAt: '2026-05-15T07:05:00.000Z',
      },
    ],
    pendingDocUpdates: [{
      id: 'DOC-UP-DOGFOOD-001',
      decisionId: 'DEC-DOGFOOD-001',
      decisionTitle: 'Keep renderers modular',
      decisionCategory: 'system',
      decisionStatus: 'locked',
      summary: 'Update modular renderer docs',
      status: 'pending',
      targetDocPath: 'docs/rebuild/current-plan.md',
      targetSection: 'Current Sprint',
      proposedDiff: '+ renderer split proof',
      proposedText: 'renderer split proof',
      decisionSourceRef: 'dogfood',
      decisionContextRef: 'frontend split proof',
      decisionOwner: 'Steve',
      decisionConfirmedBy: 'Steve',
      decisionRationale: 'Keep file size under threshold.',
      decisionEvidenceNotes: 'Synthetic evidence.',
    }],
    openQuestions: [
      {
        id: 'Q-DOGFOOD-001',
        title: 'Which frontend seam is next?',
        owner: 'Foundation Process',
        status: 'open',
        summary: 'Pick the next bounded frontend seam.',
        createdAt: '2026-05-15T07:10:00.000Z',
        updatedAt: '2026-05-15T07:10:00.000Z',
      },
      {
        id: 'Q-DOGFOOD-002',
        title: 'Closed question',
        owner: 'Foundation Process',
        status: 'resolved',
        summary: 'Resolved question should render in history.',
        resolutionNote: 'Done.',
        createdAt: '2026-05-15T07:11:00.000Z',
        updatedAt: '2026-05-15T07:11:00.000Z',
      },
    ],
    parkingLot: [{
      id: 'PARK-DOGFOOD-001',
      title: 'Unverified signal',
      summary: 'Parking lot signal should render.',
      source: 'dogfood',
      category: 'system',
      createdAt: '2026-05-15T07:12:00.000Z',
    }],
    decisionAutoEmit: { candidates: [], latestRun: null },
  }
}

async function waitTick() {
  await new Promise(resolve => setTimeout(resolve, 0))
}

async function runDecisionQuestionBrowserDogfood(sources) {
  const context = createVmContext()
  runClassicScript(context, 'foundation-nav-config.js', sources.navConfigSource)
  runClassicScript(context, 'foundation-data.js', sources.dataSource)
  runClassicScript(context, 'foundation.js', sources.foundationSource)
  runClassicScript(context, 'foundation-source-registry-renderers.js', sources.sourceRegistrySource)
  runClassicScript(context, 'foundation-decision-question-renderers.js', sources.decisionQuestionSource)
  runClassicScript(context, 'foundation-runtime-renderers.js', sources.runtimeSource)

  context.fetchFoundationHub = async () => syntheticHubPayload()
  context.foundationMutation = async () => ({ ok: true })

  const routeGlobals = {
    decisionCard: typeof context.renderDecisionMemoryCard === 'function',
    decisionReview: typeof context.renderDecisionReviewPanel === 'function',
    docUpdate: typeof context.renderPendingDocUpdateCard === 'function',
    questionCard: typeof context.renderOpenQuestionCard === 'function',
    questionEditor: typeof context.renderQuestionEditor === 'function',
  }

  const hub = syntheticHubPayload()
  const decisionCard = context.renderDecisionMemoryCard(hub.decisions[0], hub, hub.pendingDocUpdates, {})
  const decisionReview = context.renderDecisionReviewPanel(hub)
  const docUpdate = context.renderPendingDocUpdateCard(hub.pendingDocUpdates[0])
  const questionGroups = context.getOpenQuestionGroups(hub.openQuestions)
  const questionCard = context.renderOpenQuestionCard(hub.openQuestions[0])
  const decisionCreate = context.renderDecisionCreatePanel(hub)
  const questionCreate = context.renderQuestionCreatePanel()
  const decisionEditor = context.renderDecisionEditor(hub.decisions[0], hub)
  const questionEditor = context.renderQuestionEditor(hub.openQuestions[0])

  context.renderDecisions()
  await waitTick()
  const decisionsText = collectText(context.document.content)
  context.renderOpenQuestions()
  await waitTick()
  const questionsText = collectText(context.document.content)

  const helperBehavior = {
    decisionCard: collectText(decisionCard).includes('Keep renderers modular'),
    decisionReview: collectText(decisionReview).includes('What still needs review'),
    docUpdate: collectText(docUpdate).includes('Update modular renderer docs'),
    questionGroups: questionGroups.length === 2 && questionGroups.some(group => group.key === 'open') && questionGroups.some(group => group.key === 'resolved'),
    questionCard: collectText(questionCard).includes('Which frontend seam is next?'),
    createEditors: collectText(decisionCreate).includes('Create Decision') &&
      collectText(questionCreate).includes('Create Question') &&
      collectText(decisionEditor).includes('Save') &&
      collectText(questionEditor).includes('Save'),
    routeRender: decisionsText.includes('Foundation Decisions') &&
      decisionsText.includes('Keep renderers modular') &&
      questionsText.includes('Open Questions') &&
      questionsText.includes('Which frontend seam is next?'),
  }

  return { routeGlobals, helperBehavior }
}

async function main() {
  const args = parseArgs()
  const checks = []

  const [
    foundationSource,
    navConfigSource,
    dataSource,
    sourceRegistrySource,
    decisionQuestionSource,
    htmlSource,
    runtimeSource,
    routerSource,
    packageSource,
  ] = await Promise.all([
    readRepoFile('public/foundation.js'),
    readRepoFile('public/foundation-nav-config.js'),
    readRepoFile('public/foundation-data.js'),
    readRepoFile('public/foundation-source-registry-renderers.js'),
    readRepoFile('public/foundation-decision-question-renderers.js'),
    readRepoFile('public/foundation.html'),
    readRepoFile('public/foundation-runtime-renderers.js'),
    readRepoFile('public/foundation-router.js'),
    readRepoFile('package.json'),
  ])

  const packageJson = JSON.parse(packageSource)
  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_APPROVAL_PATH,
    cardId: FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_CARD_ID,
  })
  ensure(checks, approvalValidation.ok, 'plan approval validates at 9.8+', FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_APPROVAL_PATH)

  const [card] = await getBacklogItemsByIds([FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_CARD_ID])
  ensure(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in an allowed lane', card ? `${card.id}/${card.lane}` : 'missing')

  const planCriticRuns = await getPlanCriticRunsByCardIds([FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_CARD_ID])
  const planCriticPass = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= 9.8) || null
  ensure(checks, Boolean(planCriticPass), 'durable Plan Critic pass row exists', planCriticPass ? `${planCriticPass.status}/${planCriticPass.score}` : 'missing')

  const sprint = await getActiveFoundationCurrentSprint()
  const sprintItem = (sprint.items || []).find(item => item.cardId === FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_CARD_ID)
  ensure(checks, sprint.sprint?.sprintId === FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_SPRINT_ID, 'Current Sprint is the decision/question renderer split sprint', sprint.sprint?.sprintId || 'missing')
  ensure(checks, sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage), 'Current Sprint item reached Building Now or Done', sprintItem?.stage || 'missing')

  const scriptOrder = evaluateFrontendDecisionQuestionScriptOrder(extractFoundationDecisionQuestionScriptOrder(htmlSource))
  ensure(checks, scriptOrder.ok, 'Foundation HTML loads Decisions / Open Questions module in required order', scriptOrder.indexes.join(', '))

  const browserDogfood = await runDecisionQuestionBrowserDogfood({
    foundationSource,
    navConfigSource,
    dataSource,
    sourceRegistrySource,
    decisionQuestionSource,
    runtimeSource,
  })
  const splitEvaluation = evaluateFrontendDecisionQuestionRendererSplit({
    foundationSource,
    decisionQuestionSource,
    dataSource,
    sourceRegistrySource,
    runtimeSource,
    routerSource,
    htmlSource,
    lineCounts: {
      before: FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_BEFORE_LINES,
      after: lineCount(foundationSource),
    },
    routeGlobals: browserDogfood.routeGlobals,
    helperBehavior: browserDogfood.helperBehavior,
  })
  ensure(checks, splitEvaluation.ok, 'VM Decisions / Open Questions dispatch reaches extracted renderers', JSON.stringify({
    lineCounts: splitEvaluation.lineCounts,
    routeGlobals: splitEvaluation.routeGlobals,
    helperBehavior: splitEvaluation.helperBehavior,
    oldFailures: splitEvaluation.oldFailures,
  }))

  ensure(checks, FRONTEND_DECISION_QUESTION_RENDERER_NAMES.every(name => decisionQuestionSource.includes(`function ${name}(`)), 'moved renderer functions live in Decisions / Open Questions module', FRONTEND_DECISION_QUESTION_RENDERER_NAMES.join(', '))
  ensure(checks, FRONTEND_DECISION_QUESTION_RENDERER_NAMES.every(name => !foundationSource.includes(`function ${name}(`)), 'public/foundation.js no longer defines moved Decisions / Open Questions renderer functions', `${lineCount(foundationSource)} lines`)
  ensure(checks, lineCount(foundationSource) < FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_MAX_AFTER_LINES, 'public/foundation.js is below Decisions / Open Questions split line budget', `${lineCount(foundationSource)} < ${FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_MAX_AFTER_LINES}`)

  const combinedBytes = [
    navConfigSource,
    dataSource,
    foundationSource,
    decisionQuestionSource,
    runtimeSource,
    routerSource,
  ].reduce((total, source) => total + byteLength(source), 0)
  ensure(checks, combinedBytes <= FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_BEFORE_BYTES * FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_BYTE_GROWTH_LIMIT, 'combined frontend split bytes stay under growth budget', String(combinedBytes))

  const route = await timedFetch('/foundation')
  ensure(checks, route.ok && route.timeMs <= FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_ROUTE_BUDGET_MS, '/foundation serves under route budget', `status=${route.status} time=${route.timeMs}ms bytes=${route.bytes}`)
  const script = await timedFetch('/foundation-decision-question-renderers.js')
  ensure(checks, script.ok && script.bytes > 1000, 'Decisions / Open Questions split browser script serves', `status=${script.status} bytes=${script.bytes}`)

  ensure(checks, packageJson.scripts?.['process:frontend-decision-question-renderers-split-check'] === `node --env-file-if-exists=.env ${FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:frontend-decision-question-renderers-split-check'] || 'missing')

  await closeFoundationDb()

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    cardId: FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_CARD_ID,
    closeoutKey: FRONTEND_DECISION_QUESTION_RENDERERS_SPLIT_CLOSEOUT_KEY,
    checks,
    failures,
    splitEvaluation,
    route,
    script,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Decisions / Open Questions renderer split: ${result.ok ? 'PASS' : 'FAIL'}`)
    checks.forEach(check => {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    })
  }

  if (!result.ok) process.exitCode = 1
}

main().catch(async error => {
  try {
    await closeFoundationDb()
  } catch {
    // Ignore close failure and report the original error.
  }
  console.error(error)
  process.exitCode = 1
})
