#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  getFoundationBuildCloseouts,
  getFoundationBuildCloseoutValidation,
} from '../lib/foundation-build-log.js'
import {
  readFoundationBuildLogRegistrySource,
} from '../lib/foundation-build-log-source.js'
import {
  FOUNDATION_BUILD_CLOSEOUT_CONTROL_PLANE_PATH,
  FOUNDATION_BUILD_CLOSEOUT_REGISTRY_MAIN_PATH,
  FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_APPROVAL_PATH,
  FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_CARD_ID,
  FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_CLOSEOUT_KEY,
  FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_HANDOFF_PATH,
  FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_PLAN_PATH,
  FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_SCRIPT_PATH,
  FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_SPRINT_ID,
  buildFoundationBuildCloseoutRegistrySplitDogfoodProof,
  evaluateFoundationBuildCloseoutRegistrySplit,
} from '../lib/foundation-build-closeout-registry-split.js'
import {
  closeFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-backlog-sprint-db.js'

const execFile = promisify(execFileCallback)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, ...value] = arg.slice(2).split('=')
    args[key] = value.length ? value.join('=') : true
  }
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function repoFileExists(relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath))
    return true
  } catch {
    return false
  }
}

function parseRecordKeysFromSource(source = '') {
  const keys = []
  const pattern = /\bkey:\s*'([^']+)'/g
  for (const match of String(source || '').matchAll(pattern)) {
    keys.push(match[1])
  }
  return Array.from(new Set(keys)).sort()
}

function closeoutKeys(records = []) {
  return Array.from(new Set(
    (Array.isArray(records) ? records : [])
      .map(record => String(record?.key || '').trim())
      .filter(Boolean),
  )).sort()
}

function sameKeySet(left = [], right = []) {
  const leftKeys = Array.from(new Set(left)).sort()
  const rightKeys = Array.from(new Set(right)).sort()
  return leftKeys.length === rightKeys.length && leftKeys.every((key, index) => key === rightKeys[index])
}

function includesBaselineKeys(left = [], right = []) {
  const rightLookup = new Set(Array.from(new Set(right)).sort())
  return Array.from(new Set(left)).sort().every(key => rightLookup.has(key))
}

async function readApprovedHeadCloseoutSource(approval) {
  const head = String(approval?.approvedRepoHead || '').trim()
  if (!/^[0-9a-f]{40}$/i.test(head)) return ''
  const paths = [
    FOUNDATION_BUILD_CLOSEOUT_REGISTRY_MAIN_PATH,
    'lib/foundation-build-closeout-cleanup-records.js',
    'lib/foundation-build-closeout-overnight-records.js',
    'lib/foundation-build-closeout-tightening-records.js',
  ]
  const parts = []
  for (const relativePath of paths) {
    try {
      const { stdout } = await execFile('git', ['show', `${head}:${relativePath}`], {
        cwd: repoRoot,
        maxBuffer: 1024 * 1024 * 8,
      })
      parts.push(stdout)
    } catch {
      // Some registry modules did not exist in older heads. Missing optional modules are ignored.
    }
  }
  return parts.join('\n')
}

async function fetchBuildLogSweepStatus({ baseUrl, timeoutMs = 5000 } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(new URL('/api/foundation/build-log?limit=500', baseUrl), {
      signal: controller.signal,
    })
    const payload = response.ok ? await response.json() : null
    const entries = [
      ...((payload?.builds && Array.isArray(payload.builds)) ? payload.builds : []),
      ...((payload?.closeouts && Array.isArray(payload.closeouts)) ? payload.closeouts : []),
    ]
    const visible = entries.some(entry =>
      (entry.closeoutKey || entry.key) === 'foundation-surface-sweep-v1' &&
        (entry.backlogIds || []).includes('FOUNDATION-SWEEP-001')
    )
    return {
      ok: response.ok,
      visible,
      status: response.status,
      entries: entries.length,
    }
  } catch (error) {
    return {
      ok: false,
      visible: false,
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    clearTimeout(timer)
  }
}

function scriptIsReadOnly(source = '') {
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
  const jsonOnly = args.json === true || args.json === 'true'
  const baseUrl = String(args.baseUrl || process.env.FOUNDATION_BASE_URL || 'http://localhost:3000')
  const checks = []

  const [
    mainSource,
    controlPlaneSource,
    splitModuleSource,
    scriptSource,
    planSource,
    packageSource,
    registrySource,
    approvalValidation,
    activeSprint,
    planCriticRuns,
    cards,
  ] = await Promise.all([
    readRepoFile(FOUNDATION_BUILD_CLOSEOUT_REGISTRY_MAIN_PATH),
    readRepoFile(FOUNDATION_BUILD_CLOSEOUT_CONTROL_PLANE_PATH),
    readRepoFile('lib/foundation-build-closeout-registry-split.js'),
    readRepoFile(FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_SCRIPT_PATH),
    readRepoFile(FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_PLAN_PATH),
    readRepoFile('package.json'),
    readFoundationBuildLogRegistrySource(repoRoot),
    validatePlanApprovalFile({
      repoRoot,
      approvalRef: FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_APPROVAL_PATH,
      cardId: FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_CARD_ID,
    }),
    getActiveFoundationCurrentSprint(),
    getPlanCriticRunsByCardIds([FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_CARD_ID]),
    getBacklogItemsByIds([FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_CARD_ID]),
  ])
  const packageJson = JSON.parse(packageSource)
  const approval = approvalValidation.approval || {}
  const baselineSource = await readApprovedHeadCloseoutSource(approval)
  const baselineKeys = parseRecordKeysFromSource(baselineSource)
  const currentCloseouts = getFoundationBuildCloseouts()
  const currentKeys = closeoutKeys(currentCloseouts)
  const expectedKeys = Array.from(new Set([
    ...baselineKeys,
    FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_CLOSEOUT_KEY,
  ])).sort()
  const validation = getFoundationBuildCloseoutValidation()
  const buildLogSweep = await fetchBuildLogSweepStatus({ baseUrl })
  const dogfood = buildFoundationBuildCloseoutRegistrySplitDogfoodProof()
  const evaluation = evaluateFoundationBuildCloseoutRegistrySplit({
    beforeRecords: expectedKeys.map(key => ({ key })),
    afterRecords: currentCloseouts,
    mainSource,
    controlPlaneSource,
    registrySource,
    validation,
    buildLogSweepVisible: buildLogSweep.visible,
    packageScript: packageJson.scripts?.['process:foundation-build-closeout-registry-split-check'] || '',
  })
  const [card] = cards
  const sprintItem = activeSprint.items.find(item => item.cardId === FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_CARD_ID) || null

  addCheck(checks, approvalValidation.ok && Number(approval.score) >= 9.8, 'Plan approval validates at 9.8+', approvalValidation.failures?.map(item => item.check).join(', ') || FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_APPROVAL_PATH)
  addCheck(checks, planCriticRuns.some(run => run.cardId === FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_CARD_ID && run.status === 'pass' && Number(run.score) >= 9.8), 'durable Plan Critic pass row exists', planCriticRuns.map(run => `${run.status}/${run.score}`).join(', ') || 'missing')
  addCheck(checks, card && ['executing', 'done'].includes(card.lane), 'live backlog card exists in executing/done lane', card ? `${card.id}:${card.lane}` : 'missing')
  addCheck(checks, activeSprint.sprint?.sprintId === FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_SPRINT_ID || card?.lane === 'done', 'Current Sprint is the closeout registry split sprint or card is historically done', activeSprint.sprint?.sprintId || 'missing')
  addCheck(checks, (sprintItem && ['building_now', 'done_this_sprint'].includes(sprintItem.stage)) || card?.lane === 'done', 'Current Sprint contains the card in Building Now/Done or card is historically done', sprintItem ? `${sprintItem.cardId}:${sprintItem.stage}` : card?.lane || 'missing')
  addCheck(checks, dogfood.ok === true, 'dogfood rejects missing-record and oversized-root registry failures', JSON.stringify({
    healthy: dogfood.healthy?.ok,
    missingRecordRejected: dogfood.missingRecord?.ok === false,
    oversizedRootRejected: dogfood.oversizedRoot?.ok === false,
    missingBuildLogSweepRejected: dogfood.missingBuildLogSweep?.ok === false,
  }))
  addCheck(checks, evaluation.ok, 'real registry split passes evaluator', evaluation.checks.filter(check => !check.ok).map(check => check.check).join(', ') || JSON.stringify(evaluation.summary))
  addCheck(checks, includesBaselineKeys(expectedKeys, currentKeys), 'approved-head closeout keys are preserved plus this sprint closeout', `${baselineKeys.length} baseline -> ${currentKeys.length} current`)
  addCheck(checks, buildLogSweep.visible === true, 'build-log 500 lookup still exposes FOUNDATION-SWEEP-001', JSON.stringify(buildLogSweep))
  addCheck(checks, scriptIsReadOnly(scriptSource), 'focused proof script is read-only', 'no DB/file mutation tokens in proof script')
  addCheck(checks, planSource.includes('Repair path') && planSource.includes('dogfood'), 'plan names repair path and dogfood proof', FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_PLAN_PATH)
  addCheck(checks, splitModuleSource.includes('buildFoundationBuildCloseoutRegistrySplitDogfoodProof') && splitModuleSource.includes('missingRecord'), 'split proof module owns dogfood fixtures', 'lib/foundation-build-closeout-registry-split.js')
  addCheck(checks, await repoFileExists(FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_HANDOFF_PATH), 'closeout handoff exists', FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_HANDOFF_PATH)

  const ok = checks.every(check => check.ok)
  const result = {
    ok,
    cardId: FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_CARD_ID,
    closeoutKey: FOUNDATION_BUILD_CLOSEOUT_REGISTRY_SPLIT_CLOSEOUT_KEY,
    checks,
    evaluation,
    dogfood,
    buildLogSweep,
  }

  await closeFoundationDb()

  if (jsonOnly) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log('Foundation build closeout registry split proof')
    checks.forEach(check => console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`))
    console.log(`Summary: ${checks.filter(check => check.ok).length}/${checks.length} checks passed`)
  }

  if (!ok) process.exit(1)
}

main().catch(async error => {
  await closeFoundationDb().catch(() => {})
  console.error(error)
  process.exit(1)
})
