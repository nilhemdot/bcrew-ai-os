#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { setTimeout as sleep } from 'node:timers/promises'
import { promisify } from 'node:util'
import {
  AUTO_DEPLOY_REQUIRED_LABELS,
  AUTO_DEPLOY_ROLLBACK_CARD_ID,
  AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY,
  AUTO_DEPLOY_ROLLBACK_PROOF_PATH,
  buildAutoDeployHealthStatus,
  buildAutoDeployPlan,
  buildRollbackDecision,
} from '../lib/auto-deploy-rollback.js'

const execFile = promisify(execFileCallback)

function parseArgs(argv) {
  const result = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    result[key] = value ?? true
  }
  return result
}

function isTrue(value) {
  return value === true || value === 'true' || value === '1'
}

function normalize(value) {
  return String(value || '').trim()
}

function normalizeSha(value) {
  const sha = normalize(value).toLowerCase()
  return /^[0-9a-f]{40}$/.test(sha) ? sha : ''
}

async function runCommand(command, args, options = {}) {
  const { stdout, stderr } = await execFile(command, args, {
    cwd: options.cwd || process.cwd(),
    env: process.env,
    maxBuffer: options.maxBuffer || 1024 * 1024 * 8,
  })
  return { stdout: stdout || '', stderr: stderr || '' }
}

async function runGit(args, options = {}) {
  return runCommand('git', args, options)
}

async function getGitText(args, fallback = '') {
  try {
    const { stdout } = await runGit(args)
    return stdout.trim()
  } catch {
    return fallback
  }
}

async function getDirtyFiles() {
  const status = await getGitText(['status', '--porcelain'])
  return status
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
}

async function getChangedFiles(previousSha, targetSha) {
  if (!previousSha || !targetSha || previousSha === targetSha) return []
  const diff = await getGitText(['diff', '--name-only', previousSha, targetSha])
  return diff.split('\n').map(line => line.trim()).filter(Boolean)
}

async function fetchTarget({ remote = 'origin', branch = 'main' } = {}) {
  await runGit(['fetch', remote, branch])
}

async function getRepoState({ targetRef = 'origin/main' } = {}) {
  const currentSha = normalizeSha(await getGitText(['rev-parse', 'HEAD']))
  const targetSha = normalizeSha(await getGitText(['rev-parse', '--verify', targetRef]))
  const dirtyFiles = await getDirtyFiles()
  const changedFiles = await getChangedFiles(currentSha, targetSha)
  return { currentSha, targetSha, dirtyFiles, changedFiles }
}

async function listLaunchAgentLabels() {
  if (process.platform !== 'darwin') return []
  const userId = typeof process.getuid === 'function' ? process.getuid() : null
  if (!Number.isFinite(userId)) return []
  const labels = []
  for (const label of AUTO_DEPLOY_REQUIRED_LABELS) {
    try {
      await runCommand('launchctl', ['print', `gui/${userId}/${label}`], { maxBuffer: 1024 * 1024 })
      labels.push(label)
    } catch {
      // Missing labels are represented by absence; health proof fails closed.
    }
  }
  return labels
}

async function restartRuntimeServices() {
  if (process.platform !== 'darwin') throw new Error('Runtime restart requires macOS launchctl.')
  const userId = typeof process.getuid === 'function' ? process.getuid() : null
  if (!Number.isFinite(userId)) throw new Error('Cannot restart runtime: current user id is unavailable.')
  const restarted = []
  for (const label of AUTO_DEPLOY_REQUIRED_LABELS) {
    await runCommand('launchctl', ['kickstart', '-k', `gui/${userId}/${label}`], { maxBuffer: 1024 * 1024 })
    restarted.push(label)
  }
  return restarted
}

async function installDependenciesIfNeeded(packageChanged) {
  if (!packageChanged) return { skipped: true, reason: 'package files did not change' }
  await runCommand('npm', ['install'], { maxBuffer: 1024 * 1024 * 12 })
  return { skipped: false, command: 'npm install' }
}

async function fetchFoundationHub(baseUrl, timeoutMs = 5000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/foundation-hub`, {
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json()
  } finally {
    clearTimeout(timer)
  }
}

async function waitForFoundationHealth({ expectedSha, baseUrl, retries, intervalMs }) {
  let lastStatus = null
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const [foundationHub, launchAgents] = await Promise.all([
        fetchFoundationHub(baseUrl),
        listLaunchAgentLabels(),
      ])
      lastStatus = buildAutoDeployHealthStatus({ expectedSha, foundationHub, launchAgents })
      if (lastStatus.status === 'healthy') return lastStatus
    } catch (error) {
      lastStatus = {
        status: 'risk',
        expectedSha,
        failures: [{ key: 'foundation_hub_fetch', detail: error instanceof Error ? error.message : String(error) }],
      }
    }
    if (attempt < retries) await sleep(intervalMs)
  }
  return lastStatus
}

async function recordProof(proof) {
  const proofPath = path.resolve(process.cwd(), AUTO_DEPLOY_ROLLBACK_PROOF_PATH)
  await fs.mkdir(path.dirname(proofPath), { recursive: true })
  await fs.writeFile(proofPath, `${JSON.stringify(proof, null, 2)}\n`)
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2))
    return
  }
  console.log('Auto deploy rollback')
  console.log(`  Status: ${result.status}`)
  console.log(`  Current: ${result.plan?.currentShortSha || 'missing'}`)
  console.log(`  Target: ${result.plan?.targetShortSha || 'missing'}`)
  console.log(`  Mode: ${result.apply ? 'apply' : 'dry-run'}`)
  if (result.plan?.blockers?.length) console.log(`  Blockers: ${result.plan.blockers.join(', ')}`)
  if (result.health?.status) console.log(`  Health: ${result.health.status}`)
  if (result.rollback?.status) console.log(`  Rollback: ${result.rollback.status}`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const apply = isTrue(args.apply)
  const json = isTrue(args.json)
  const skipFetch = isTrue(args.skipFetch)
  const remote = normalize(args.remote) || 'origin'
  const branch = normalize(args.branch) || 'main'
  const targetRef = normalize(args.targetRef) || `${remote}/${branch}`
  const baseUrl = normalize(args.baseUrl) || 'http://localhost:3000'
  const healthRetries = Math.max(1, Number(args.healthRetries || 12))
  const healthIntervalMs = Math.max(250, Number(args.healthIntervalMs || 2500))

  if (!skipFetch) await fetchTarget({ remote, branch })
  const repoState = await getRepoState({ targetRef })
  const plan = buildAutoDeployPlan({
    ...repoState,
    platform: process.platform,
    apply,
  })

  if (!apply) {
    const result = {
      status: plan.status === 'blocked' ? 'dry_run_blocked' : 'dry_run_ready',
      cardId: AUTO_DEPLOY_ROLLBACK_CARD_ID,
      closeoutKey: AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY,
      apply,
      targetRef,
      plan,
    }
    printResult(result, json)
    return
  }

  if (plan.status === 'blocked') {
    const result = {
      status: 'blocked',
      cardId: AUTO_DEPLOY_ROLLBACK_CARD_ID,
      closeoutKey: AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY,
      apply,
      targetRef,
      plan,
    }
    await recordProof({ ...result, recordedAt: new Date().toISOString() })
    printResult(result, json)
    process.exitCode = 1
    return
  }

  if (plan.status === 'noop') {
    const health = await waitForFoundationHealth({
      expectedSha: plan.currentSha,
      baseUrl,
      retries: healthRetries,
      intervalMs: healthIntervalMs,
    })
    const result = {
      status: health.status === 'healthy' ? 'noop_healthy' : 'noop_health_risk',
      cardId: AUTO_DEPLOY_ROLLBACK_CARD_ID,
      closeoutKey: AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY,
      apply,
      targetRef,
      plan,
      health,
    }
    await recordProof({ ...result, recordedAt: new Date().toISOString() })
    printResult(result, json)
    process.exitCode = health.status === 'healthy' ? 0 : 1
    return
  }

  const previousSha = plan.currentSha
  const targetSha = plan.targetSha
  let health = null
  let rollback = null
  let rollbackHealth = null
  const actions = []

  try {
    await runGit(['merge', '--ff-only', targetRef])
    actions.push('git merge --ff-only')
    actions.push(await installDependenciesIfNeeded(plan.packageChanged))
    actions.push({ restarted: await restartRuntimeServices() })
    health = await waitForFoundationHealth({
      expectedSha: targetSha,
      baseUrl,
      retries: healthRetries,
      intervalMs: healthIntervalMs,
    })
  } catch (error) {
    health = {
      status: 'risk',
      failures: [{ key: 'deploy_exception', detail: error instanceof Error ? error.message : String(error) }],
    }
  }

  rollback = buildRollbackDecision({
    previousSha,
    targetSha,
    deployAttempted: true,
    healthStatus: health,
  })

  if (rollback.shouldRollback) {
    await runGit(['reset', '--hard', previousSha])
    actions.push('git reset --hard previousSha')
    actions.push(await installDependenciesIfNeeded(plan.packageChanged))
    actions.push({ rollbackRestarted: await restartRuntimeServices() })
    rollbackHealth = await waitForFoundationHealth({
      expectedSha: previousSha,
      baseUrl,
      retries: healthRetries,
      intervalMs: healthIntervalMs,
    })
  }

  const result = {
    status: health?.status === 'healthy'
      ? 'deployed'
      : rollbackHealth?.status === 'healthy'
        ? 'rolled_back'
        : 'risk',
    cardId: AUTO_DEPLOY_ROLLBACK_CARD_ID,
    closeoutKey: AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY,
    apply,
    targetRef,
    plan,
    actions,
    health,
    rollback,
    rollbackHealth,
  }
  await recordProof({ ...result, recordedAt: new Date().toISOString() })
  printResult(result, json)
  process.exitCode = result.status === 'deployed' ? 0 : 1
}

main().catch(error => {
  console.error('Auto deploy rollback failed.')
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
