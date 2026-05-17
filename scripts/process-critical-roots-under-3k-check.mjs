#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'

const execFile = promisify(execFileCallback)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const baseUrl = process.env.FOUNDATION_BASE_URL || 'http://localhost:3000'

const CARD_ID = 'CRITICAL-ROOTS-UNDER-3K-PHASE-1'
const CLOSEOUT_KEY = 'critical-roots-under-3k-phase-1-v1'
const PLAN_PATH = 'docs/process/critical-roots-under-3k-phase-1-plan.md'
const APPROVAL_PATH = 'docs/process/approvals/CRITICAL-ROOTS-UNDER-3K-PHASE-1.json'
const SCRIPT_PATH = 'scripts/process-critical-roots-under-3k-check.mjs'
const CRITICAL_ROOTS = [
  'scripts/foundation-verify.mjs',
  'server.js',
  'lib/foundation-db.js',
  'public/foundation.js',
]
const EXTRACTED_MODULES = [
  'public/foundation-doc-markdown-renderers.js',
  'public/foundation-strategy-renderers.js',
  'public/foundation-home-renderers.js',
]
const REQUIRED_SCRIPT_ORDER = [
  '/foundation-nav-config.js',
  '/foundation-data.js',
  '/foundation-doc-markdown-renderers.js',
  '/foundation.js',
  '/foundation-home-renderers.js',
  '/foundation-strategy-renderers.js',
  '/foundation-router.js',
]

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
  return String(source || '').split(/\r?\n/).length
}

function extractScriptOrder(htmlSource = '') {
  const order = []
  const scriptPattern = /<script\s+[^>]*src="([^"]+)"[^>]*><\/script>/gi
  let match = scriptPattern.exec(htmlSource)
  while (match) {
    order.push(match[1].split('?')[0])
    match = scriptPattern.exec(htmlSource)
  }
  return order.filter(src => src.includes('foundation'))
}

function evaluateScriptOrder(order = []) {
  const indexes = REQUIRED_SCRIPT_ORDER.map(src => order.indexOf(src))
  return {
    ok: indexes.every(index => index !== -1) &&
      indexes.every((index, idx) => idx === 0 || index > indexes[idx - 1]),
    order,
    required: REQUIRED_SCRIPT_ORDER,
    indexes,
  }
}

function evaluateCriticalRootsSplitFixture(fixture = {}) {
  const findings = []
  const criticalRootCounts = fixture.criticalRootCounts || {}
  const moduleLineCounts = fixture.moduleLineCounts || {}
  const scriptOrder = evaluateScriptOrder(fixture.scriptOrder || [])
  const movedFunctions = fixture.movedFunctions || {}
  const domainBoundaries = fixture.domainBoundaries || {}

  if (!(criticalRootCounts['public/foundation.js'] > 0 && criticalRootCounts['public/foundation.js'] < 3000)) {
    findings.push('foundation_root_not_under_3000')
  }
  if (!Object.values(criticalRootCounts).some(count => Number(count) > 0 && Number(count) < 3000)) {
    findings.push('no_critical_root_under_3000')
  }
  const oversizedModules = Object.entries(moduleLineCounts).filter(([, count]) => Number(count) > 1500)
  if (oversizedModules.length) findings.push('extracted_module_over_1500')
  if (!scriptOrder.ok) findings.push('script_order_missing_or_wrong')
  if (movedFunctions.rootAbsent !== true || movedFunctions.modulesPresent !== true) {
    findings.push('moved_functions_not_proven')
  }
  if (
    domainBoundaries.docMarkdown !== true ||
    domainBoundaries.strategy !== true ||
    domainBoundaries.home !== true
  ) {
    findings.push('domain_boundaries_not_cohesive')
  }

  return { ok: findings.length === 0, findings, scriptOrder }
}

function buildDogfoodProof(goodFixture) {
  const rejected = {
    noRootUnder3k: evaluateCriticalRootsSplitFixture({
      ...goodFixture,
      criticalRootCounts: {
        ...goodFixture.criticalRootCounts,
        'public/foundation.js': 3010,
      },
    }),
    oversizedModule: evaluateCriticalRootsSplitFixture({
      ...goodFixture,
      moduleLineCounts: {
        ...goodFixture.moduleLineCounts,
        'public/foundation-doc-markdown-renderers.js': 1601,
      },
    }),
    missingScriptOrder: evaluateCriticalRootsSplitFixture({
      ...goodFixture,
      scriptOrder: [
        '/foundation-nav-config.js',
        '/foundation-data.js',
        '/foundation.js',
        '/foundation-router.js',
      ],
    }),
    arbitraryCut: evaluateCriticalRootsSplitFixture({
      ...goodFixture,
      domainBoundaries: {
        docMarkdown: true,
        strategy: false,
        home: true,
      },
    }),
  }
  const ok = Object.values(rejected).every(result => result.ok === false)
  return {
    ok,
    rejected,
    dogfoodInvariant: ok
      ? 'bad root count, oversized module, missing script order, and non-domain split fixtures fail closed'
      : 'critical root split dogfood did not reject every known bad fixture',
  }
}

async function timedFetch(pathname) {
  const started = performance.now()
  const response = await fetch(baseUrl + pathname)
  const text = await response.text()
  return {
    ok: response.ok,
    status: response.status,
    timeMs: Math.round((performance.now() - started) * 10) / 10,
    bytes: Buffer.byteLength(text, 'utf8'),
  }
}

async function changedFiles() {
  const { stdout } = await execFile('git', ['diff', '--name-only', 'HEAD'], {
    cwd: repoRoot,
    maxBuffer: 1024 * 128,
  })
  return String(stdout || '').split('\n').map(line => line.trim()).filter(Boolean)
}

async function main() {
  const args = parseArgs()
  const checks = []

  const [
    foundationHtml,
    foundationSource,
    docMarkdownSource,
    strategySource,
    homeSource,
    packageText,
  ] = await Promise.all([
    readRepoFile('public/foundation.html'),
    readRepoFile('public/foundation.js'),
    readRepoFile('public/foundation-doc-markdown-renderers.js'),
    readRepoFile('public/foundation-strategy-renderers.js'),
    readRepoFile('public/foundation-home-renderers.js'),
    readRepoFile('package.json'),
  ])
  const criticalRootCounts = Object.fromEntries(await Promise.all(
    CRITICAL_ROOTS.map(async filePath => [filePath, lineCount(await readRepoFile(filePath))])
  ))
  const moduleLineCounts = Object.fromEntries(
    EXTRACTED_MODULES.map(filePath => [
      filePath,
      lineCount(filePath === 'public/foundation-doc-markdown-renderers.js'
        ? docMarkdownSource
        : filePath === 'public/foundation-strategy-renderers.js'
          ? strategySource
          : homeSource),
    ])
  )
  const order = extractScriptOrder(foundationHtml)
  const movedRootTokens = [
    'function renderDocMarkdownBlock(',
    'function renderOverview()',
    'function renderStrategyDoc(',
    'function renderFoundationHome()',
    'var sectionSupportDocs =',
    'var foundationNowSequence =',
  ]
  const goodFixture = {
    criticalRootCounts,
    moduleLineCounts,
    scriptOrder: order,
    movedFunctions: {
      rootAbsent: movedRootTokens.every(token => !foundationSource.includes(token)),
      modulesPresent: docMarkdownSource.includes('function renderDocMarkdownBlock(') &&
        docMarkdownSource.includes('function renderBhagSummaryCard(') &&
        strategySource.includes('function renderOverview()') &&
        strategySource.includes('function renderStrategyDoc(') &&
        homeSource.includes('function renderFoundationHome()'),
    },
    domainBoundaries: {
      docMarkdown: docMarkdownSource.includes('function renderInlineSourceCard(') &&
        docMarkdownSource.includes('function renderEngineRequirementCard('),
      strategy: strategySource.includes('function renderRebuildPlanBacklogPanel(') &&
        strategySource.includes('function renderCurrentQuarterSection('),
      home: homeSource.includes('var foundationNowSequence =') &&
        homeSource.includes('function renderFoundationHome()'),
    },
  }
  const splitEvaluation = evaluateCriticalRootsSplitFixture(goodFixture)
  const dogfood = buildDogfoodProof(goodFixture)

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: APPROVAL_PATH,
    cardId: CARD_ID,
  })
  const [cards, planCriticRuns, diffFiles] = await Promise.all([
    getBacklogItemsByIds([CARD_ID]),
    getPlanCriticRunsByCardIds([CARD_ID]),
    changedFiles(),
  ])
  const card = cards[0] || null
  const planCritic = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= 9.8) || null
  const forbiddenTouched = diffFiles.filter(filePath => /(^|\/)(harlan|fal|voice|mockup)/i.test(filePath))

  const route = await timedFetch('/foundation')
  const scriptChecks = await Promise.all(EXTRACTED_MODULES.map(async filePath => ({
    filePath,
    ...(await timedFetch('/' + filePath.replace(/^public\//, ''))),
  })))

  ensure(checks, approval.ok && Number(approval.approval?.score) >= 9.8, 'plan approval validates at 9.8+', approval.failures?.map(item => item.check).join(', ') || APPROVAL_PATH)
  ensure(checks, card && ['scoped', 'executing', 'done'].includes(card.lane), 'live backlog card exists in an allowed lane', card ? `${card.id}/${card.lane}` : 'missing')
  ensure(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  ensure(checks, splitEvaluation.ok, 'critical root split satisfies under-3K V1 invariant', splitEvaluation.findings.join(', ') || JSON.stringify({ criticalRootCounts, moduleLineCounts }))
  ensure(checks, dogfood.ok, 'dogfood rejects bad critical-root split fixtures', dogfood.dogfoodInvariant)
  ensure(checks, criticalRootCounts['public/foundation.js'] < 3000, 'public/foundation.js is below 3,000 lines', String(criticalRootCounts['public/foundation.js']))
  ensure(checks, Object.values(moduleLineCounts).every(count => count <= 1500), 'extracted modules stay at or below 1,500 lines', JSON.stringify(moduleLineCounts))
  ensure(checks, evaluateScriptOrder(order).ok, 'Foundation HTML loads extracted modules in required order', evaluateScriptOrder(order).indexes.join(', '))
  ensure(checks, route.ok && route.timeMs < 2000, '/foundation serves under route budget', `status=${route.status} time=${route.timeMs}ms bytes=${route.bytes}`)
  ensure(checks, scriptChecks.every(result => result.ok && result.bytes > 0), 'extracted frontend modules serve', scriptChecks.map(result => `${result.filePath}:${result.status}/${result.bytes}`).join(', '))
  ensure(checks, JSON.parse(packageText).scripts?.['process:critical-roots-under-3k-check'] === `node --env-file-if-exists=.env ${SCRIPT_PATH}`, 'package script is registered', SCRIPT_PATH)
  ensure(checks, forbiddenTouched.length === 0, 'no Harlan/Fal/voice/mockup paths touched', forbiddenTouched.join(', ') || 'clean')

  const result = {
    ok: checks.every(check => check.ok),
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    checks,
    failures: checks.filter(check => !check.ok),
    splitEvaluation,
    dogfood,
    criticalRootCounts,
    moduleLineCounts,
    route,
    scriptChecks,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Critical roots under 3K check: ${result.ok ? 'PASS' : 'FAIL'}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }
  if (!result.ok) process.exitCode = 1
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
