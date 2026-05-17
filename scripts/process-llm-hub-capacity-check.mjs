#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  LLM_HUB_CAPACITY_APPROVAL_PATH,
  LLM_HUB_CAPACITY_CARD_ID,
  LLM_HUB_CAPACITY_CLOSEOUT_KEY,
  LLM_HUB_CAPACITY_LANE_DEFINITIONS,
  LLM_HUB_CAPACITY_PLAN_PATH,
  LLM_HUB_CAPACITY_SCRIPT_PATH,
  LLM_HUB_CAPACITY_SPRINT_ID,
  buildLlmHubCapacityDogfoodProof,
} from '../lib/llm-hub-capacity.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getLlmRuntimeSnapshot,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

function addFinding(findings, ok, check, detail = '') {
  findings.push({ ok: Boolean(ok), check, detail })
}

async function readText(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readJson(relativePath) {
  return JSON.parse(await readText(relativePath))
}

async function exists(relativePath) {
  try {
    await fs.stat(path.join(repoRoot, relativePath))
    return true
  } catch {
    return false
  }
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

function scriptIsReadOnly(scriptSource = '') {
  const mutationTokens = /createBacklogItem\s*\(|updateBacklogItem\s*\(|upsertFoundationCurrentSprintOverlay\s*\(|INSERT\s+INTO\s+backlog_items|UPDATE\s+backlog_items|INSERT\s+INTO\s+llm_credentials|UPDATE\s+llm_credentials|INSERT\s+INTO\s+llm_routes|UPDATE\s+llm_routes|createLlmCall\s*\(|finishLlmCall\s*\(|fs\.writeFile|writeFile\s*\(/i
  return !mutationTokens.test(scriptSource)
}

async function main() {
  const args = parseArgs()
  const findings = []

  const requiredFiles = [
    'lib/llm-hub-capacity.js',
    'lib/foundation-llm-runtime-store.js',
    'public/foundation-runtime-renderers.js',
    LLM_HUB_CAPACITY_SCRIPT_PATH,
    LLM_HUB_CAPACITY_PLAN_PATH,
    LLM_HUB_CAPACITY_APPROVAL_PATH,
    'package.json',
  ]
  for (const file of requiredFiles) {
    addFinding(findings, await exists(file), 'required LLM hub capacity artifact exists', file)
  }

  const approval = await validatePlanApprovalFile({
    repoRoot,
    approvalRef: LLM_HUB_CAPACITY_APPROVAL_PATH,
    cardId: LLM_HUB_CAPACITY_CARD_ID,
  })
  addFinding(findings, approval.ok, 'approval file validates', approval.failures.map(item => item.check).join(', ') || LLM_HUB_CAPACITY_APPROVAL_PATH)

  const packageJson = await readJson('package.json')
  addFinding(
    findings,
    packageJson.scripts?.['process:llm-hub-capacity-check'] === 'node --env-file-if-exists=.env scripts/process-llm-hub-capacity-check.mjs',
    'package script is registered',
    packageJson.scripts?.['process:llm-hub-capacity-check'] || 'missing',
  )

  const scriptSource = await readText(LLM_HUB_CAPACITY_SCRIPT_PATH)
  addFinding(findings, scriptIsReadOnly(scriptSource), 'focused proof script is read-only', LLM_HUB_CAPACITY_SCRIPT_PATH)

  const moduleSource = await readText('lib/llm-hub-capacity.js')
  addFinding(
    findings,
    LLM_HUB_CAPACITY_LANE_DEFINITIONS.length >= 7 &&
      moduleSource.includes('builder-chat-manual-review') &&
      moduleSource.includes('foundation-system-worker-extraction') &&
      moduleSource.includes('strategy-advisor-fast') &&
      moduleSource.includes('strategy-advisor-deep') &&
      moduleSource.includes('coding-claude-code-agent') &&
      moduleSource.includes('video-vision-gemini-api') &&
      moduleSource.includes('direct-api-fallback-openai'),
    'capacity lane definitions cover the required V1 lanes',
    `${LLM_HUB_CAPACITY_LANE_DEFINITIONS.length} lane(s)`,
  )

  const dogfood = buildLlmHubCapacityDogfoodProof()
  addFinding(findings, dogfood.ok, 'dogfood proof rejects weak capacity lanes', dogfood.invariant)

  const snapshot = await getLlmRuntimeSnapshot({ limit: 20 })
  addFinding(findings, Boolean(snapshot.capacity), 'live LLM runtime snapshot includes capacity section', snapshot.capacity?.summary ? JSON.stringify(snapshot.capacity.summary) : 'missing')
  addFinding(findings, Array.isArray(snapshot.capacity?.lanes) && snapshot.capacity.lanes.length >= 7, 'live capacity snapshot has named lanes', String(snapshot.capacity?.lanes?.length || 0))
  addFinding(findings, snapshot.capacity?.summary?.redLanes === 0, 'live capacity has no red lanes', JSON.stringify(snapshot.capacity?.summary || {}))
  addFinding(findings, Boolean(snapshot.summary && Object.prototype.hasOwnProperty.call(snapshot.summary, 'capacityLaneCount')), 'LLM runtime summary exposes capacity counts', JSON.stringify(snapshot.summary || {}))

  const [card] = await getBacklogItemsByIds([LLM_HUB_CAPACITY_CARD_ID])
  addFinding(findings, Boolean(card), 'live backlog card exists', card?.lane || 'missing')
  addFinding(findings, ['scoped', 'executing', 'done'].includes(card?.lane), 'live backlog card is scoped/active/done', card?.lane || 'missing')
  addFinding(findings, card?.priority === 'P0', 'live backlog card keeps P0 priority', card?.priority || 'missing')

  const sprint = await getActiveFoundationCurrentSprint()
  const sprintItem = sprint.items.find(item => item.cardId === LLM_HUB_CAPACITY_CARD_ID)
  addFinding(findings, sprint.sprint?.sprintId === LLM_HUB_CAPACITY_SPRINT_ID || sprintItem?.stage === 'done_this_sprint', 'Current Sprint points at LLM hub capacity sprint', sprint.sprint?.sprintId || 'missing')
  addFinding(findings, Boolean(sprintItem), 'Current Sprint includes LLM hub capacity item', sprintItem?.stage || 'missing')
  addFinding(findings, !sprintItem || doctrineOk(sprintItem), 'Current Sprint doctrine is populated', sprintItem?.planRef || 'missing')

  const planCriticRuns = await getPlanCriticRunsByCardIds([LLM_HUB_CAPACITY_CARD_ID])
  const planCriticPass = planCriticRuns.find(run => run.status === 'pass' && Number(run.score) >= Number(run.passThreshold || 9.8))
  addFinding(findings, Boolean(planCriticPass), 'durable Plan Critic pass row exists', planCriticPass ? `${planCriticPass.score}/${planCriticPass.maxScore}` : 'missing')
  addFinding(findings, planCriticPass?.gateLevel === 'full', 'Plan Critic selected full gate for capacity truth', planCriticPass?.gateLevel || 'missing')

  const failures = findings.filter(finding => !finding.ok)
  const output = {
    ok: failures.length === 0,
    cardId: LLM_HUB_CAPACITY_CARD_ID,
    closeoutKey: LLM_HUB_CAPACITY_CLOSEOUT_KEY,
    dogfood,
    capacitySummary: snapshot.capacity?.summary || null,
    findings,
    failures,
  }

  if (args.json) {
    console.log(JSON.stringify(output, null, 2))
  } else if (output.ok) {
    console.log('LLM-HUB-CAPACITY-001 OK')
  } else {
    console.error(`LLM-HUB-CAPACITY-001 FAILED (${failures.length})`)
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
