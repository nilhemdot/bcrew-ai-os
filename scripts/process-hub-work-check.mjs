#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  HUB_WORK_CHECK_SCRIPT_PATH,
  HUB_WORK_COORDINATION_APPROVAL_PATH,
  HUB_WORK_COORDINATION_CARD_ID,
  HUB_WORK_COORDINATION_CLOSEOUT_KEY,
  HUB_WORK_COORDINATION_PLAN_PATH,
  HUB_WORK_COORDINATION_SPRINT_ID,
  HUB_WORK_HANDOFF_TEMPLATE_PATH,
  HUB_WORK_OWNERSHIP_MATRIX_PATH,
  HUB_WORK_PROMPT_TEMPLATE_PATH,
  HUB_WORK_PROTOCOL_PATH,
  HUB_WORK_SPRINT_HANDOFF_PATH,
  buildHubWorkDogfoodProof,
  loadHubWorkOwnershipMatrix,
  validateHubWorkManifest,
} from '../lib/hub-work-check.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getFoundationSnapshot,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    manifest: '',
  }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg.startsWith('--manifest=')) args.manifest = arg.slice('--manifest='.length)
  }
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
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
  return JSON.parse(await fs.readFile(path.resolve(repoRoot, relativePath), 'utf8'))
}

async function main() {
  const args = parseArgs()
  const checks = []
  const requiredFiles = [
    HUB_WORK_COORDINATION_PLAN_PATH,
    HUB_WORK_PROTOCOL_PATH,
    HUB_WORK_OWNERSHIP_MATRIX_PATH,
    HUB_WORK_PROMPT_TEMPLATE_PATH,
    HUB_WORK_HANDOFF_TEMPLATE_PATH,
    HUB_WORK_SPRINT_HANDOFF_PATH,
    'docs/handoffs/2026-05-14-hub-work-coordination-closeout.md',
    HUB_WORK_COORDINATION_APPROVAL_PATH,
    'lib/hub-work-check.js',
    HUB_WORK_CHECK_SCRIPT_PATH,
  ]
  const [snapshot, activeSprint, planCriticRuns, approval, matrix] = await Promise.all([
    getFoundationSnapshot(),
    getActiveFoundationCurrentSprint().catch(() => ({ sprint: null, items: [], planCriticRuns: [] })),
    getPlanCriticRunsByCardIds([HUB_WORK_COORDINATION_CARD_ID]),
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: HUB_WORK_COORDINATION_APPROVAL_PATH,
      cardId: HUB_WORK_COORDINATION_CARD_ID,
    }),
    loadHubWorkOwnershipMatrix({ repoRoot }),
  ])

  for (const requiredFile of requiredFiles) {
    addCheck(checks, await exists(requiredFile), 'required hub-work artifact exists', requiredFile)
  }

  addCheck(checks, matrix?.schemaVersion === 1, 'ownership matrix has schema version 1', String(matrix?.schemaVersion ?? 'missing'))
  addCheck(checks, Boolean(matrix?.hubs?.sales && matrix?.hubs?.ops && matrix?.hubs?.strategy), 'ownership matrix covers Sales, Ops, and Strategy', Object.keys(matrix?.hubs || {}).join(', '))

  const knownCardIds = (snapshot.backlogItems || []).map(item => item.id)
  addCheck(checks, knownCardIds.includes(HUB_WORK_COORDINATION_CARD_ID), 'HUB-001 exists in live backlog', String(knownCardIds.includes(HUB_WORK_COORDINATION_CARD_ID)))

  const activeItem = (activeSprint.items || []).find(item => item.cardId === HUB_WORK_COORDINATION_CARD_ID)
  const currentSprintStatus = buildFoundationCurrentSprintStatus({
    sprint: activeSprint.sprint,
    items: activeSprint.items || [],
    backlogItems: snapshot.backlogItems || [],
    closeouts: getFoundationBuildCloseouts(),
    planCriticRuns: activeSprint.planCriticRuns || [],
  })
  const activeExitCriteria = Array.isArray(activeSprint.sprint?.metadata?.exitCriteria)
    ? activeSprint.sprint.metadata.exitCriteria
    : []
  addCheck(checks, activeSprint.sprint?.sprintId === HUB_WORK_COORDINATION_SPRINT_ID || activeItem?.stage === 'done_this_sprint', 'Current Sprint is the hub coordination sprint or closed with HUB-001', activeSprint.sprint?.sprintId || 'missing sprint')
  addCheck(checks, currentSprintStatus.status === 'healthy', 'Current Sprint status is healthy', currentSprintStatus.findings?.map(item => item.check).join(', ') || currentSprintStatus.status)
  addCheck(checks, activeExitCriteria.length >= 3, 'HUB-001 sprint exit criteria are explicit', String(activeExitCriteria.length))
  addCheck(checks, Boolean(activeItem?.planRef && activeItem?.definitionOfDone && (activeItem?.proofCommands || []).length), 'HUB-001 sprint doctrine is populated', activeItem?.planRef || 'missing active item doctrine')
  addCheck(checks, approval.ok === true, 'HUB-001 approval file is valid', approval.failures?.map(item => item.check).join(', ') || HUB_WORK_COORDINATION_APPROVAL_PATH)
  addCheck(checks, planCriticRuns.some(run => run.cardId === HUB_WORK_COORDINATION_CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8), 'HUB-001 has durable Plan Critic pass row', String(planCriticRuns.length))

  const dogfood = buildHubWorkDogfoodProof({ matrix, knownCardIds })
  addCheck(checks, dogfood.ok === true, 'dogfood manifest cases pass and fail as expected', dogfood.cases.filter(item => !item.ok).map(item => item.name).join(', ') || `${dogfood.cases.length} cases`)

  let manifestValidation = null
  if (args.manifest) {
    const manifest = await readJson(args.manifest)
    manifestValidation = validateHubWorkManifest(manifest, {
      matrix,
      knownCardIds,
      requireKnownCard: true,
    })
    addCheck(checks, manifestValidation.ok === true, 'provided hub-work manifest is valid', args.manifest)
  }

  const failures = checks.filter(check => !check.ok)
  const result = {
    ok: failures.length === 0,
    status: failures.length ? 'unhealthy' : 'healthy',
    cardId: HUB_WORK_COORDINATION_CARD_ID,
    closeoutKey: HUB_WORK_COORDINATION_CLOSEOUT_KEY,
    sprintId: HUB_WORK_COORDINATION_SPRINT_ID,
    dogfood,
    manifestValidation,
    findings: failures,
    checks,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`Hub work check: ${result.status}`)
    for (const check of checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
    }
  }

  await closeFoundationDb()
  if (failures.length) process.exitCode = 1
}

main().catch(async error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  await closeFoundationDb().catch(() => {})
  process.exitCode = 1
})
