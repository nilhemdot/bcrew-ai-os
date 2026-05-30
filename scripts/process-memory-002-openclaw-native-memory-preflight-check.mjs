#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { buildFoundationCurrentSprintStatus } from '../lib/foundation-current-sprint.js'
import { closeFoundationDb } from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  MEMORY_002_CARD_ID as CARD_ID,
  MEMORY_002_PREFLIGHT_APPROVAL_PATH as APPROVAL_PATH,
  MEMORY_002_PREFLIGHT_CHANGED_FILES as CHANGED_FILES,
  MEMORY_002_PREFLIGHT_CLOSEOUT_KEY as CLOSEOUT_KEY,
  MEMORY_002_PREFLIGHT_CLOSEOUT_PATH as CLOSEOUT_PATH,
  MEMORY_002_PREFLIGHT_NOT_NEXT_BOUNDARIES as NOT_NEXT,
  MEMORY_002_PREFLIGHT_PLAN_PATH as PLAN_PATH,
  MEMORY_002_PREFLIGHT_PROOF_COMMANDS as PROOF_COMMANDS,
  MEMORY_002_PREFLIGHT_SCRIPT_PATH as SCRIPT_PATH,
  buildOpenClawNativeMemoryPreflightDogfoodProof,
  evaluateOpenClawNativeMemoryPreflight,
} from '../lib/openclaw-native-memory-preflight.js'
import {
  PLAN_CRITIC_MIN_PASS_SCORE,
  evaluatePlanCriticPlan,
} from '../lib/process-plan-critic.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'

const execFile = promisify(execFileCallback)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-memory-002-openclaw-native-memory-preflight'
const RETURNED_REASON = 'Read-only preflight found memory-core enabled and OpenClaw memory metadata healthy, but active-memory/dreaming enablement, gateway restart, and real private recall proof require explicit local-runtime approval. No runtime mutation or private recall probe was run.'

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false, apply: false }
  for (const rawArg of argv) {
    const arg = String(rawArg || '')
    if (arg === '--json' || arg === '--json=true') args.json = true
    if (arg === '--apply' || arg === '--apply=true') args.apply = true
  }
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function stableRunId(seed = '') {
  return crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 12)
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

function parseJsonOutput(output = '') {
  const text = String(output || '').trim()
  try {
    return JSON.parse(text)
  } catch {}
  const objectStart = text.indexOf('{')
  const arrayStart = text.indexOf('[')
  const start = [objectStart, arrayStart]
    .filter(index => index >= 0)
    .sort((left, right) => left - right)[0]
  if (start === undefined) throw new Error('Command did not return JSON.')
  return JSON.parse(text.slice(start))
}

async function runJson(command, args = []) {
  const { stdout, stderr } = await execFile(command, args, {
    cwd: repoRoot,
    env: process.env,
    maxBuffer: 1024 * 1024 * 16,
  })
  return parseJsonOutput(`${stdout || ''}${stderr || ''}`)
}

function filterMemoryPlugins(pluginOutput = {}) {
  const plugins = Array.isArray(pluginOutput.plugins) ? pluginOutput.plugins : []
  return plugins
    .filter(plugin => ['memory-core', 'active-memory', 'dreaming'].includes(plugin?.id))
    .map(plugin => ({
      id: plugin.id,
      name: plugin.name,
      enabled: plugin.enabled === true,
      explicitlyEnabled: plugin.explicitlyEnabled === true,
      activated: plugin.activated === true,
      activationSource: plugin.activationSource || null,
      activationReason: plugin.activationReason || null,
      status: plugin.status || null,
      imported: plugin.imported === true,
      configJsonSchema: plugin.configJsonSchema || null,
    }))
}

function unwrapMemoryStatus(status = {}) {
  if (Array.isArray(status)) {
    return status.find(item => item?.agentId === 'main') || status[0] || {}
  }
  return status && typeof status === 'object' ? status : {}
}

function compactMemoryStatus(status = {}) {
  const envelope = unwrapMemoryStatus(status)
  const innerStatus = envelope.status && typeof envelope.status === 'object'
    ? envelope.status
    : envelope
  const scanIssues = Array.isArray(envelope.scan?.issues) ? envelope.scan.issues : []
  const statusIssues = Array.isArray(innerStatus.issues) ? innerStatus.issues : []
  const audit = envelope.audit && typeof envelope.audit === 'object'
    ? envelope.audit
    : innerStatus.audit
  return {
    agentId: envelope.agentId || innerStatus.agentId || null,
    backend: innerStatus.backend || null,
    files: Number(innerStatus.files || 0),
    chunks: Number(innerStatus.chunks || 0),
    dirty: innerStatus.dirty === true,
    workspaceDir: innerStatus.workspaceDir || null,
    dbPath: innerStatus.dbPath || null,
    provider: innerStatus.provider || null,
    model: innerStatus.model || null,
    fts: innerStatus.fts || null,
    vector: innerStatus.vector || null,
    audit: audit
      ? {
          entryCount: Number(audit.entryCount || 0),
          promotedCount: Number(audit.promotedCount || 0),
          invalidEntryCount: Number(audit.invalidEntryCount || 0),
          issues: Array.isArray(audit.issues) ? audit.issues : [],
        }
      : null,
    issues: [...statusIssues, ...scanIssues],
  }
}

function compactPluginConfig(config = {}) {
  const entries = config.entries && typeof config.entries === 'object' ? config.entries : {}
  const nextEntries = {}
  for (const id of ['memory-core', 'active-memory']) {
    if (entries[id]) {
      nextEntries[id] = {
        enabled: entries[id].enabled === true ? true : undefined,
        config: entries[id].config && typeof entries[id].config === 'object'
          ? {
              enabled: entries[id].config.enabled === true ? true : undefined,
              dreaming: entries[id].config.dreaming && typeof entries[id].config.dreaming === 'object'
                ? { enabled: entries[id].config.dreaming.enabled === true }
                : undefined,
            }
          : {},
      }
    }
  }
  return { entries: nextEntries }
}

async function collectOpenClawPreflight() {
  const [configValidation, pluginOutput, memoryStatus, pluginConfig] = await Promise.all([
    runJson('openclaw', ['config', 'validate', '--json']),
    runJson('openclaw', ['plugins', 'list', '--json']),
    runJson('openclaw', ['memory', 'status', '--json']),
    runJson('openclaw', ['config', 'get', 'plugins', '--json']),
  ])
  return {
    configValidation,
    plugins: filterMemoryPlugins(pluginOutput),
    memoryStatus: compactMemoryStatus(memoryStatus),
    configPlugins: compactPluginConfig(pluginConfig),
  }
}

function buildReturnedSprintItem(previousItem = {}) {
  return {
    ...previousItem,
    cardId: CARD_ID,
    backlogId: CARD_ID,
    order: previousItem.order || previousItem.sprintOrder || 2,
    stage: 'returned',
    planRef: PLAN_PATH,
    definitionOfDone: 'MEMORY-002 OpenClaw native memory runtime enablement remains unshipped until explicit local-runtime approval allows config mutation, gateway restart, and real private recall proof.',
    proofCommands: PROOF_COMMANDS,
    readinessBlockerCleared: 'Read-only metadata preflight only; runtime enablement approval is not cleared.',
    notNextBoundaries: NOT_NEXT,
    existingWorkCheck: previousItem.existingWorkCheck || {
      existingWorkReviewed: true,
      doctrineReviewed: true,
      liveBacklogChecked: true,
      noDuplicateCard: true,
      noConflictingCloseout: true,
      notes: 'Preflight only. Existing OpenClaw memory-core metadata was inspected without runtime mutation or private recall.',
    },
    returnedReason: RETURNED_REASON,
    metadata: {
      ...(previousItem.metadata || {}),
      closeoutKey: CLOSEOUT_KEY,
      approvalBoundary: 'explicit local-runtime approval required before OpenClaw config mutation, gateway restart, active-memory/dreaming enablement, or real private recall proof',
      preflightOnly: true,
    },
  }
}

async function updateLiveState() {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'mark MEMORY-002 returned pending local-runtime approval',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })

  const previous = await getActiveFoundationCurrentSprint()
  await updateBacklogItem(CARD_ID, {
    lane: 'scoped',
    nextAction: 'Blocked pending explicit local-runtime approval for OpenClaw config mutation, gateway restart, active-memory/dreaming enablement, and a real private recall proof. Safe metadata preflight is complete; continue the next safe Foundation card if approval is not granted.',
    statusNote: 'Read-only preflight completed under `memory-002-openclaw-native-memory-preflight-v1`: memory-core is enabled and OpenClaw memory metadata is healthy, but active-memory/dreaming enablement, gateway restart, and private recall proof remain approval-bound. No runtime config mutation, gateway restart, memory search/recall, provider/model call, or private content read was run.',
  }, ACTOR)

  const previousItems = Array.isArray(previous?.items) ? previous.items : []
  const hasMemoryItem = previousItems.some(item => item.cardId === CARD_ID)
  const nextItems = (hasMemoryItem ? previousItems : [
    ...previousItems,
    { cardId: CARD_ID, order: previousItems.length + 1 },
  ]).map(item => item.cardId === CARD_ID ? buildReturnedSprintItem(item) : item)

  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: previous?.sprint?.sprintId || MEMORY_002_PREFLIGHT_SPRINT_ID,
        status: 'active',
        goal: previous?.sprint?.goal || 'Register provider/tool capabilities Foundation-up before agent use.',
        activeBlockerCardId: CARD_ID,
        metadata: {
          ...(previous?.sprint?.metadata || {}),
          currentStatus: 'blocked_returned',
          nextAction: 'MEMORY-002 is returned pending explicit local-runtime approval. Continue the next safe Foundation card from repo truth if approval is not granted.',
          closeoutKey: CLOSEOUT_KEY,
          approvalBoundary: 'OpenClaw config mutation, gateway restart, active-memory/dreaming enablement, and real private recall proof require explicit local-runtime approval.',
        },
      },
      items: nextItems,
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'MEMORY-002 preflight completed as metadata-only and must return pending explicit local-runtime approval.',
    },
  )
}

async function buildStatus(args = {}) {
  if (args.apply || isProcessCheckWriteRequested({ argv: process.argv.slice(2) })) {
    await updateLiveState()
  }

  const [
    planSource,
    packageSource,
    scriptSource,
    fanoutCheckSource,
    postShipFanoutSource,
    moduleSource,
    closeoutRegistrySource,
    closeoutDoc,
    currentPlan,
    currentState,
    livePreflight,
    approval,
    cards,
    sprint,
  ] = await Promise.all([
    readRepoFile(PLAN_PATH),
    readRepoFile('package.json'),
    readRepoFile(SCRIPT_PATH),
    readRepoFile('scripts/process-fanout-check.mjs'),
    readRepoFile('scripts/process-post-ship-fanout.mjs'),
    readRepoFile('lib/openclaw-native-memory-preflight.js'),
    readRepoFile('lib/foundation-build-closeout-agent-runtime-records.js'),
    readRepoFile(CLOSEOUT_PATH),
    readRepoFile('docs/rebuild/current-plan.md'),
    readRepoFile('docs/rebuild/current-state.md'),
    collectOpenClawPreflight(),
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    getBacklogItemsByIds([CARD_ID, 'FOUNDATION-UP-CAPABILITY-REGISTRY-001']),
    getActiveFoundationCurrentSprint(),
  ])
  const checks = []
  const planCritic = evaluatePlanCriticPlan({
    planText: planSource,
    card: {
      id: CARD_ID,
      title: 'Enable the OpenClaw native memory baseline',
      lane: 'scoped',
      priority: 'P0',
      rank: 3,
      summary: 'Preflight the OpenClaw native memory baseline from metadata only, then keep runtime enablement blocked pending explicit local-runtime approval.',
      whyItMatters: 'Harlan memory should be enabled deliberately without leaking private memory or mutating runtime state from an unapproved Foundation card.',
      nextAction: 'Blocked pending explicit local-runtime approval for config mutation, gateway restart, active-memory/dreaming enablement, and real private recall proof.',
      statusNote: RETURNED_REASON,
    },
    changedFiles: CHANGED_FILES,
    declaredRisk: planSource,
    architecturalRules: true,
  })
  const liveStatus = evaluateOpenClawNativeMemoryPreflight(livePreflight)
  const dogfood = buildOpenClawNativeMemoryPreflightDogfoodProof()
  const closeout = getFoundationBuildCloseouts().find(record => record.key === CLOSEOUT_KEY) || null
  const card = cards.find(item => item.id === CARD_ID) || null
  const activeItem = (sprint.items || []).find(item => item.cardId === CARD_ID) || null
  const sprintStatus = buildFoundationCurrentSprintStatus({
    sprint: sprint.sprint,
    items: sprint.items || [],
    backlogItems: cards,
    closeouts: getFoundationBuildCloseouts(),
    planCriticRuns: sprint.planCriticRuns || [],
  })

  for (const check of approval.checks || []) addCheck(checks, check.ok, check.check, check.detail)
  addCheck(checks, approval.ok, 'plan approval integrity passes', approval.mode)
  addCheck(checks, planCritic.status === 'pass' && planCritic.score >= PLAN_CRITIC_MIN_PASS_SCORE, 'Plan Critic passes for preflight/return scope', `status=${planCritic.status} score=${planCritic.score}`)
  addCheck(checks, liveStatus.ok && liveStatus.status === 'blocked_pending_runtime_approval', 'live OpenClaw preflight passes only as blocked pending approval', liveStatus.status)
  addCheck(checks, dogfood.ok, 'dogfood rejects runtime mutation, false approval, and missing active-memory', dogfood.invariant)
  addCheck(checks, packageSource.includes('"process:memory-002-openclaw-native-memory-preflight-check"'), 'package registers focused proof script', 'process:memory-002-openclaw-native-memory-preflight-check')
  addCheck(checks, moduleSource.includes('attemptedRuntimeMutation') && moduleSource.includes('attemptedPrivateRecallProbe'), 'module owns fail-closed side-effect and private recall guards', 'openclaw preflight evaluator')
  addCheck(checks, fanoutCheckSource.includes('blocked-preflight') && fanoutCheckSource.includes('target card is done or has blocked-preflight closeout'), 'fanout check supports blocked-preflight closeouts without marking cards done', 'process:fanout-check blocked-preflight posture')
  addCheck(checks, postShipFanoutSource.includes('blocked-preflight') && postShipFanoutSource.includes('target card is done or has blocked-preflight closeout'), 'post-ship fanout supports blocked-preflight closeouts without marking cards done', 'process:post-ship-fanout blocked-preflight posture')
  const runtimeCommandPatterns = [
    /\brunJson\('openclaw',\s*\['plugins',\s*'enable'/,
    /\brunJson\('openclaw',\s*\['config',\s*'set'/,
    /\brunJson\('openclaw',\s*\['memory',\s*'search'/,
    /\brunJson\('openclaw',\s*\['memory',\s*'promote'/,
    /\brunJson\('openclaw',\s*\['gateway',\s*'restart'/,
    /\bexecFile\('launchctl'/,
  ]
  addCheck(checks, runtimeCommandPatterns.every(pattern => !pattern.test(scriptSource)), 'focused script contains no runtime mutation/private recall commands', 'read-only OpenClaw metadata commands only')
  addCheck(checks, closeoutRegistrySource.includes(CLOSEOUT_KEY) && closeoutRegistrySource.includes(CARD_ID), 'closeout registry records MEMORY-002 preflight ownership', CLOSEOUT_KEY)
  addCheck(checks, Boolean(closeout) && (closeout.backlogIds || []).includes(CARD_ID), 'build closeout links MEMORY-002', closeout ? closeout.key : 'missing closeout')
  addCheck(checks, closeoutDoc.includes(CLOSEOUT_KEY) && closeoutDoc.includes('No OpenClaw config mutation'), 'handoff records no runtime mutation boundary', CLOSEOUT_PATH)
  addCheck(checks, currentPlan.includes(CLOSEOUT_KEY) && currentPlan.includes('returned pending explicit local-runtime approval'), 'current plan records returned approval boundary', 'docs/rebuild/current-plan.md')
  addCheck(checks, currentState.includes(CLOSEOUT_KEY) && currentState.includes('active-memory/dreaming'), 'current state records preflight boundary', 'docs/rebuild/current-state.md')
  addCheck(checks, card?.lane === 'scoped', 'live backlog keeps MEMORY-002 scoped, not done', card?.lane || 'missing')
  addCheck(checks, !args.apply || activeItem?.stage === 'returned', 'Current Sprint marks MEMORY-002 returned when applied', activeItem?.stage || 'missing')
  addCheck(checks, sprintStatus.findings.length === 0, 'Current Sprint remains structurally healthy', sprintStatus.findings.map(finding => finding.check).join(', ') || 'healthy')

  return {
    ok: checks.every(check => check.ok),
    checks,
    failures: checks.filter(check => !check.ok),
    cardId: CARD_ID,
    closeoutKey: CLOSEOUT_KEY,
    livePreflight: liveStatus,
    dogfood,
    currentSprint: {
      sprintId: sprint.sprint?.sprintId || null,
      activeBlockerCardId: sprint.sprint?.activeBlockerCardId || null,
      memoryStage: activeItem?.stage || null,
    },
    planCritic: {
      status: planCritic.status,
      score: planCritic.score,
      runId: `memory-002-openclaw-native-memory-preflight-${stableRunId(PLAN_PATH)}`,
    },
  }
}

function printStatus(status) {
  console.log('MEMORY-002 OpenClaw native memory preflight')
  console.log(`  Status: ${status.ok ? 'pass' : 'fail'}`)
  console.log(`  Live posture: ${status.livePreflight.status}`)
  console.log(`  memory-core: ${status.livePreflight.summary.memoryCore}`)
  console.log(`  active-memory: ${status.livePreflight.summary.activeMemory}`)
  console.log(`  files/chunks: ${status.livePreflight.summary.memoryFiles}/${status.livePreflight.summary.memoryChunks}`)
  console.log(`  sprint: ${status.currentSprint.sprintId || 'missing'} / MEMORY-002=${status.currentSprint.memoryStage || 'missing'}`)
  console.log('')
  for (const check of status.checks) {
    console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.check}${check.detail ? ` -> ${check.detail}` : ''}`)
  }
}

async function main() {
  const args = parseArgs()
  const status = await buildStatus(args)
  if (args.json) {
    console.log(JSON.stringify(status, null, 2))
  } else {
    printStatus(status)
  }
  if (!status.ok) process.exitCode = 1
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb().catch(() => {})
  })
