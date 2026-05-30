#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  STYLESHEET_MODULE_PATHS,
  STYLESHEET_MONOLITH_SPLIT_APPROVAL_PATH,
  STYLESHEET_MONOLITH_SPLIT_BEFORE_LINES,
  STYLESHEET_MONOLITH_SPLIT_CARD_ID,
  STYLESHEET_MONOLITH_SPLIT_CLOSEOUT_KEY,
  STYLESHEET_MONOLITH_SPLIT_PLAN_PATH,
  STYLESHEET_MONOLITH_SPLIT_SCRIPT_PATH,
  STYLESHEET_MONOLITH_SPLIT_SPRINT_ID,
  buildStylesheetMonolithSplitDogfoodProof,
  evaluateStylesheetMonolithSplit,
} from '../lib/foundation-stylesheet-monolith-split.js'
import { evaluateSprintCheckHistoricalMode } from '../lib/sprint-check-historical-mode.js'
import { closeFoundationDb } from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const HTML_PAGES = [
  'public/agent-feedback.html',
  'public/architecture.html',
  'public/doc.html',
  'public/foundation.html',
  'public/index.html',
  'public/login.html',
  'public/ops.html',
  'public/sales.html',
  'public/strategic-execution.html',
  'public/strategy-export.html',
]

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    args[key] = value ?? true
  }
  return args
}

function ensure(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

function sourceIsReadOnly(source = '') {
  const banned = [
    'create' + 'BacklogItem',
    'update' + 'BacklogItem',
    'upsert' + 'FoundationCurrentSprintOverlay',
    'INSERT' + ' INTO',
    'UPDATE' + ' ',
    'DELETE' + ' FROM',
    'fs.' + 'writeFile',
    'write' + 'File(',
  ]
  return banned.every(token => !source.includes(token))
}

async function main() {
  const args = parseArgs()
  const jsonOutput = args.json === true || args.json === 'true'
  const checks = []

  const [
    rootSource,
    packageSource,
    planSource,
    scriptSource,
    moduleSource,
  ] = await Promise.all([
    readRepoFile('public/styles.css'),
    readRepoFile('package.json'),
    readRepoFile(STYLESHEET_MONOLITH_SPLIT_PLAN_PATH),
    readRepoFile(STYLESHEET_MONOLITH_SPLIT_SCRIPT_PATH),
    readRepoFile('lib/foundation-stylesheet-monolith-split.js'),
  ])
  const moduleSources = {}
  for (const modulePath of STYLESHEET_MODULE_PATHS) {
    moduleSources[modulePath] = await readRepoFile(modulePath)
  }
  const htmlSources = {}
  for (const pagePath of HTML_PAGES) {
    htmlSources[pagePath] = await readRepoFile(pagePath)
  }

  const packageJson = JSON.parse(packageSource)
  const approvalValidation = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: STYLESHEET_MONOLITH_SPLIT_APPROVAL_PATH,
    cardId: STYLESHEET_MONOLITH_SPLIT_CARD_ID,
  })
  const [card] = await getBacklogItemsByIds([STYLESHEET_MONOLITH_SPLIT_CARD_ID])
  const activeSprint = await getActiveFoundationCurrentSprint()
  const sprintItem = activeSprint.items.find(item => item.cardId === STYLESHEET_MONOLITH_SPLIT_CARD_ID) || null
  const planCriticRuns = await getPlanCriticRunsByCardIds([STYLESHEET_MONOLITH_SPLIT_CARD_ID])
  const planCritic = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= 9.8) || null
  const closeouts = getFoundationBuildCloseouts()
  const sprintMode = evaluateSprintCheckHistoricalMode({
    activeSprint,
    card,
    closeouts,
    cardId: STYLESHEET_MONOLITH_SPLIT_CARD_ID,
    expectedSprintId: STYLESHEET_MONOLITH_SPLIT_SPRINT_ID,
    closeoutKey: STYLESHEET_MONOLITH_SPLIT_CLOSEOUT_KEY,
  })
  const evaluation = evaluateStylesheetMonolithSplit({ rootSource, moduleSources, htmlSources })
  const dogfood = buildStylesheetMonolithSplitDogfoodProof()

  ensure(checks, approvalValidation.ok && Number(approvalValidation.approval?.score) >= 9.8, 'Plan approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || STYLESHEET_MONOLITH_SPLIT_APPROVAL_PATH)
  ensure(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  ensure(checks, sprintMode.ok, 'Current Sprint proof is active or verified historical closeout', `${sprintMode.mode}: ${sprintMode.reason}`)
  ensure(checks, sprintItem || sprintMode.mode === 'historical_closeout', 'Current Sprint contains active card or historical closeout covers it', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : sprintMode.mode)
  ensure(checks, planCritic, 'durable Plan Critic pass row exists', planCritic ? `${planCritic.status}/${planCritic.score}` : 'missing')
  for (const check of evaluation.checks) ensure(checks, check.ok, check.check, check.detail)
  ensure(checks, dogfood.ok === true, 'dogfood rejects old stylesheet monolith failures', dogfood.invariant)
  ensure(checks, evaluation.rootLines < STYLESHEET_MONOLITH_SPLIT_BEFORE_LINES, 'public/styles.css line count decreases', `${STYLESHEET_MONOLITH_SPLIT_BEFORE_LINES} -> ${evaluation.rootLines}`)
  ensure(checks, moduleSource.includes('evaluateStylesheetMonolithSplit') && moduleSource.includes('buildStylesheetMonolithSplitDogfoodProof'), 'stylesheet split evaluator module owns proof logic', 'lib/foundation-stylesheet-monolith-split.js')
  ensure(checks, sourceIsReadOnly(scriptSource), 'focused proof script is read-only', 'no write/mutation tokens in proof script')
  ensure(checks, packageJson.scripts?.['process:stylesheet-monolith-split-check'] === `node --env-file-if-exists=.env ${STYLESHEET_MONOLITH_SPLIT_SCRIPT_PATH}`, 'package script is registered', packageJson.scripts?.['process:stylesheet-monolith-split-check'] || 'missing')
  ensure(checks, planSource.includes('mechanical cascade-preserving split') && planSource.includes('Dogfood'), 'plan documents cascade-preserving split and dogfood proof', STYLESHEET_MONOLITH_SPLIT_PLAN_PATH)

  const ok = checks.every(check => check.ok)
  const summary = {
    ok,
    cardId: STYLESHEET_MONOLITH_SPLIT_CARD_ID,
    closeoutKey: STYLESHEET_MONOLITH_SPLIT_CLOSEOUT_KEY,
    lineCounts: {
      before: STYLESHEET_MONOLITH_SPLIT_BEFORE_LINES,
      rootAfter: evaluation.rootLines,
      combinedAfter: evaluation.combinedLines,
      modules: evaluation.moduleLineCounts,
    },
    imports: evaluation.imports,
    dogfood: dogfood.oldFailures,
    checks,
  }

  if (jsonOutput) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log('Stylesheet monolith split proof')
    checks.forEach(check => console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`))
    console.log(`Summary: ${checks.filter(check => check.ok).length}/${checks.length} checks passed`)
  }

  await closeFoundationDb()
  if (!ok) process.exit(1)
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error)
  process.exit(1)
})
