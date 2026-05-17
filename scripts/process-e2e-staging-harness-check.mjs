#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  E2E_STAGING_HARNESS_APPROVAL_PATH,
  E2E_STAGING_HARNESS_CARD_ID,
  E2E_STAGING_HARNESS_CLOSEOUT_KEY,
  E2E_STAGING_HARNESS_PLAN_PATH,
  E2E_STAGING_HARNESS_SCRIPT_PATH,
  E2E_STAGING_HARNESS_SPRINT_ID,
  buildE2eStagingHarnessDogfoodProof,
  runE2eStagingHarness,
} from '../lib/e2e-staging-harness.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    live: false,
    baseUrl: process.env.FOUNDATION_BASE_URL || 'http://localhost:3000',
  }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg === '--live' || arg === '--live=true') args.live = true
    else if (arg.startsWith('--baseUrl=')) args.baseUrl = arg.slice('--baseUrl='.length).trim()
  }
  return args
}

function addFinding(findings, ok, check, detail = '', metadata = {}) {
  findings.push({ ok: Boolean(ok), check, detail, metadata })
}

async function exists(relativePath) {
  try {
    await fs.stat(path.join(repoRoot, relativePath))
    return true
  } catch {
    return false
  }
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(repoRoot, relativePath), 'utf8'))
}

function doctrineOk(item = {}) {
  return Boolean(
    item.planRef &&
    item.definitionOfDone &&
    Array.isArray(item.proofCommands) &&
    item.proofCommands.length &&
    Array.isArray(item.notNextBoundaries) &&
    item.notNextBoundaries.length &&
    item.existingWorkCheck &&
    Object.keys(item.existingWorkCheck).length
  )
}

async function main() {
  const args = parseArgs()
  const findings = []

  const requiredFiles = [
    'lib/e2e-staging-harness.js',
    E2E_STAGING_HARNESS_SCRIPT_PATH,
    E2E_STAGING_HARNESS_PLAN_PATH,
    E2E_STAGING_HARNESS_APPROVAL_PATH,
    'package.json',
    'package-lock.json',
  ]
  for (const file of requiredFiles) {
    addFinding(findings, await exists(file), 'required E2E staging artifact exists', file)
  }

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: E2E_STAGING_HARNESS_APPROVAL_PATH,
    cardId: E2E_STAGING_HARNESS_CARD_ID,
  })
  addFinding(findings, approval.ok, 'approval file validates', approval.failures.map(item => item.check).join(', ') || E2E_STAGING_HARNESS_APPROVAL_PATH)

  const packageJson = await readJson('package.json')
  addFinding(
    findings,
    packageJson.scripts?.['process:e2e-staging-harness-check'] === 'node --env-file-if-exists=.env scripts/process-e2e-staging-harness-check.mjs',
    'package script is registered',
    packageJson.scripts?.['process:e2e-staging-harness-check'] || 'missing',
  )
  addFinding(
    findings,
    Boolean(packageJson.devDependencies?.playwright || packageJson.dependencies?.playwright),
    'Playwright dependency is registered',
    packageJson.devDependencies?.playwright || packageJson.dependencies?.playwright || 'missing',
  )

  const dogfood = buildE2eStagingHarnessDogfoodProof()
  addFinding(findings, dogfood.ok, 'dogfood proof rejects blank page, console error, and API budget failures', dogfood.invariant)

  const [card] = await getBacklogItemsByIds([E2E_STAGING_HARNESS_CARD_ID])
  addFinding(findings, Boolean(card), 'live backlog card exists', card?.lane || 'missing')
  addFinding(findings, ['executing', 'done'].includes(card?.lane), 'live backlog card is active or done', card?.lane || 'missing')
  addFinding(findings, card?.priority === 'P1', 'live backlog card keeps P1 priority', card?.priority || 'missing')

  const sprint = await getActiveFoundationCurrentSprint()
  const sprintItem = sprint.items.find(item => item.cardId === E2E_STAGING_HARNESS_CARD_ID)
  addFinding(findings, sprint.sprint?.sprintId === E2E_STAGING_HARNESS_SPRINT_ID || sprintItem?.stage === 'done_this_sprint', 'Current Sprint points at E2E staging harness sprint', sprint.sprint?.sprintId || 'missing')
  addFinding(findings, Boolean(sprintItem), 'Current Sprint includes E2E staging harness item', sprintItem?.stage || 'missing')
  addFinding(findings, !sprintItem || doctrineOk(sprintItem), 'Current Sprint doctrine is populated', sprintItem?.planRef || 'missing')

  const planCriticRuns = await getPlanCriticRunsByCardIds([E2E_STAGING_HARNESS_CARD_ID])
  const planCriticPass = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= Number(run.passThreshold || 9.8))
  addFinding(findings, Boolean(planCriticPass), 'durable Plan Critic pass row exists', planCriticPass ? `${planCriticPass.score}/${planCriticPass.maxScore}` : 'missing')
  addFinding(findings, planCriticPass?.gateLevel === 'full', 'Plan Critic selected full gate for this harness', planCriticPass?.gateLevel || 'missing')

  let liveResult = null
  if (args.live) {
    liveResult = await runE2eStagingHarness({ baseUrl: args.baseUrl })
    addFinding(
      findings,
      liveResult.ok,
      'live Playwright staging harness passes',
      liveResult.evaluation.failures.map(item => `${item.check}: ${item.detail}`).join(' | ') || liveResult.evaluation.summary.screenshotDir || args.baseUrl,
      { summary: liveResult.evaluation.summary },
    )
  }

  const failures = findings.filter(finding => !finding.ok)
  const output = {
    ok: failures.length === 0,
    cardId: E2E_STAGING_HARNESS_CARD_ID,
    closeoutKey: E2E_STAGING_HARNESS_CLOSEOUT_KEY,
    live: args.live,
    baseUrl: args.baseUrl,
    dogfood: {
      ok: dogfood.ok,
      oldFailures: dogfood.oldFailures,
    },
    liveSummary: liveResult?.evaluation?.summary || null,
    findings,
    failures,
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else if (output.ok) {
    console.log('E2E-STAGING-HARNESS-001 OK')
    if (liveResult?.evaluation?.summary?.screenshotDir) {
      console.log(`Screenshots: ${liveResult.evaluation.summary.screenshotDir}`)
    }
  } else {
    console.error(`E2E-STAGING-HARNESS-001 FAILED (${failures.length})`)
    for (const failure of failures) console.error(`- ${failure.check}: ${failure.detail}`)
  }

  await closeFoundationDb()
  if (!output.ok) process.exitCode = 1
}

main().catch(async error => {
  console.error(error instanceof Error ? error.stack : String(error))
  await closeFoundationDb().catch(() => {})
  process.exitCode = 1
})
