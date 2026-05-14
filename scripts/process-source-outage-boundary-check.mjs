#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  SOURCE_OUTAGE_BOUNDARY_APPROVAL_PATH,
  SOURCE_OUTAGE_BOUNDARY_CARD_ID,
  SOURCE_OUTAGE_BOUNDARY_CLOSEOUT_KEY,
  SOURCE_OUTAGE_BOUNDARY_PLAN_PATH,
  SOURCE_OUTAGE_BOUNDARY_SCRIPT_PATH,
  buildSourceOutageBoundaryDogfoodProof,
} from '../lib/source-outage-boundary.js'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getFoundationSnapshot,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false, baseUrl: process.env.FOUNDATION_BASE_URL || 'http://localhost:3000' }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg.startsWith('--base-url=')) args.baseUrl = arg.slice('--base-url='.length)
  }
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readText(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function exists(relativePath) {
  try {
    await fs.stat(path.join(repoRoot, relativePath))
    return true
  } catch {
    return false
  }
}

async function fetchJson(baseUrl, route) {
  const headers = {}
  if (process.env.ADMIN_TOKEN) headers['X-Admin-Token'] = process.env.ADMIN_TOKEN
  const response = await fetch(`${String(baseUrl).replace(/\/$/, '')}${route}`, { headers })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`${route} returned ${response.status}: ${text.slice(0, 500)}`)
  }
  return text ? JSON.parse(text) : null
}

async function main() {
  const args = parseArgs()
  const checks = []
  const requiredFiles = [
    SOURCE_OUTAGE_BOUNDARY_PLAN_PATH,
    SOURCE_OUTAGE_BOUNDARY_APPROVAL_PATH,
    'lib/source-outage-boundary.js',
    'lib/clickup.js',
    'lib/agent-roster-review.js',
    'lib/agent-feedback-auto-send.js',
    'lib/agent-feedback-production-autosend-dry-run.js',
    'lib/agent-feedback-reminders.js',
    'server.js',
    SOURCE_OUTAGE_BOUNDARY_SCRIPT_PATH,
  ]

  const [
    snapshot,
    activeSprint,
    planCriticRuns,
    approval,
    dogfood,
    packageSource,
  ] = await Promise.all([
    getFoundationSnapshot(),
    getActiveFoundationCurrentSprint().catch(() => ({ sprint: null, items: [], planCriticRuns: [] })),
    getPlanCriticRunsByCardIds([SOURCE_OUTAGE_BOUNDARY_CARD_ID]),
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: SOURCE_OUTAGE_BOUNDARY_APPROVAL_PATH,
      cardId: SOURCE_OUTAGE_BOUNDARY_CARD_ID,
    }),
    buildSourceOutageBoundaryDogfoodProof(),
    readText('package.json'),
  ])

  for (const requiredFile of requiredFiles) {
    addCheck(checks, await exists(requiredFile), 'required outage-boundary artifact exists', requiredFile)
  }

  const card = (snapshot.backlogItems || []).find(item => item.id === SOURCE_OUTAGE_BOUNDARY_CARD_ID) || null
  addCheck(checks, Boolean(card), 'SOURCE-OUTAGE-BOUNDARY-001 exists in live backlog', card?.lane || 'missing')
  addCheck(checks, ['executing', 'done'].includes(card?.lane), 'SOURCE-OUTAGE-BOUNDARY-001 is executing or done', card?.lane || 'missing')
  const activeItem = (activeSprint.items || []).find(item => item.cardId === SOURCE_OUTAGE_BOUNDARY_CARD_ID)
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: activeSprint.sprint,
    items: activeSprint.items || [],
    backlogItems: snapshot.backlogItems || [],
    closeouts: getFoundationBuildCloseouts(),
    planCriticRuns: activeSprint.planCriticRuns || [],
  })
  addCheck(checks, Boolean(activeItem?.planRef && activeItem?.definitionOfDone && (activeItem?.proofCommands || []).length), 'Current Sprint doctrine is populated for outage boundary card', activeItem?.planRef || 'missing doctrine')
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint status is healthy', currentSprintStatus.findings?.map(item => item.check).join(', ') || currentSprintStatus.status)
  addCheck(checks, approval.ok === true, 'SOURCE-OUTAGE-BOUNDARY-001 approval file is valid', approval.failures?.map(item => item.check).join(', ') || SOURCE_OUTAGE_BOUNDARY_APPROVAL_PATH)
  addCheck(checks, planCriticRuns.some(run => run.cardId === SOURCE_OUTAGE_BOUNDARY_CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8), 'SOURCE-OUTAGE-BOUNDARY-001 has durable Plan Critic pass row', String(planCriticRuns.length))
  addCheck(checks, dogfood.ok === true, 'dogfood proof recreates ClickUp 500 and proves fail-soft behavior', dogfood.checks.filter(item => !item.ok).map(item => item.check).join(', ') || `${dogfood.checks.length} checks`)
  addCheck(checks, packageSource.includes('"process:source-outage-boundary-check"'), 'package exposes outage-boundary process check', 'package.json')

  let liveApis = null
  try {
    const [foundationHubFull, opsHub] = await Promise.all([
      fetchJson(args.baseUrl, '/api/foundation-hub?view=full'),
      fetchJson(args.baseUrl, '/api/ops-hub'),
    ])
    liveApis = {
      foundationHubFullStatus: foundationHubFull?.sourceOutageBoundary?.status || 'missing',
      opsHubStatus: opsHub?.sourceOutageBoundary?.status || 'missing',
      foundationHasAgentFeedback: Boolean(foundationHubFull?.agentFeedbackAutoSend && foundationHubFull?.agentFeedbackReminders),
      opsHasAgentFeedback: Boolean(opsHub?.agentFeedbackAutoSend && opsHub?.agentFeedbackReminders),
    }
    addCheck(checks, liveApis.foundationHasAgentFeedback, '/api/foundation-hub?view=full serves agent feedback payload during ClickUp outage', liveApis.foundationHubFullStatus)
    addCheck(checks, liveApis.opsHasAgentFeedback, '/api/ops-hub serves Ops feedback payload during ClickUp outage', liveApis.opsHubStatus)
    addCheck(checks, ['healthy', 'degraded'].includes(liveApis.foundationHubFullStatus) && ['healthy', 'degraded'].includes(liveApis.opsHubStatus), 'live APIs expose sourceOutageBoundary status', JSON.stringify(liveApis))
  } catch (error) {
    addCheck(checks, false, 'live Foundation/Ops APIs fail soft instead of returning 500', error instanceof Error ? error.message : String(error))
  }

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'unhealthy' : 'healthy',
    cardId: SOURCE_OUTAGE_BOUNDARY_CARD_ID,
    closeoutKey: SOURCE_OUTAGE_BOUNDARY_CLOSEOUT_KEY,
    dogfood,
    liveApis,
    checks,
    failures,
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  } else {
    process.stdout.write(`${result.status}: ${checks.length - failures.length}/${checks.length} checks passed\n`)
    for (const failure of failures) {
      process.stdout.write(`- ${failure.check}: ${failure.detail}\n`)
    }
  }

  if (failures.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb()
  })
