#!/usr/bin/env node

import { spawn } from 'node:child_process'
import process from 'node:process'
import {
  closeFoundationDb,
  finishSourceCrawlTargetRun,
  getExtractionControlSnapshot,
  getSharedCommunicationSourceStats,
  initFoundationDb,
  leaseSourceCrawlTarget,
} from '../lib/foundation-db.js'

const OUTPUT_TAIL_LIMIT = 20000

function parseArgs(argv) {
  const result = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    result[key] = value ?? true
  }
  return result
}

function appendTail(current, chunk) {
  const next = current + chunk
  return next.length > OUTPUT_TAIL_LIMIT ? next.slice(next.length - OUTPUT_TAIL_LIMIT) : next
}

function killProcessGroup(child, signal) {
  if (!child?.pid) return
  try {
    process.kill(-child.pid, signal)
  } catch {
    try {
      child.kill(signal)
    } catch {
      // The process may have already exited.
    }
  }
}

function boolValue(value) {
  return value === true || value === 'true'
}

function numberFromBudget(target, key, fallback) {
  const value = Number(target?.budget?.[key])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function getTargetRunner(target) {
  const maxItemsPerRun = numberFromBudget(target, 'maxItemsPerRun', 25)

  if (target.targetKey === 'gmail-current-day') {
    const query = String(target.cursorState?.query || 'newer_than:2d')
    return {
      command: 'npm',
      args: ['run', 'gmail:sync-archive', '--', '--team=true', `--limit=${maxItemsPerRun}`, `--query=${query}`],
      inspectedPattern: /Threads selected:\s*(\d+)/i,
      archivedPattern: /Archived this run:\s*(\d+)/i,
    }
  }

  if (target.targetKey === 'missive-current-day') {
    return {
      command: 'npm',
      args: ['run', 'missive:sync-archive', '--', '--all=true', `--limit=${maxItemsPerRun}`, '--pageSize=50'],
      inspectedPattern: /Conversations selected:\s*(\d+)/i,
      archivedPattern: /Archived this run:\s*(\d+)/i,
    }
  }

  if (target.targetKey === 'meetings-current-day') {
    const windowHours = numberFromBudget(target, 'windowHours', Number(target.cursorState?.windowHours) || 48)
    const modifiedAfter = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString()
    return {
      command: 'npm',
      args: [
        'run',
        'meeting-notes:sync',
        '--',
        `--limit=${maxItemsPerRun}`,
        `--modifiedAfter=${modifiedAfter}`,
        `--crawlTarget=${target.targetKey}`,
      ],
      inspectedPattern: /Meetings selected for archive:\s*(\d+)/i,
      archivedPattern: /Gemini notes archived:\s*(\d+)/i,
      itemFailuresPattern: /Crawl items failed:\s*(\d+)/i,
    }
  }

  throw new Error(`No extraction target runner is configured yet for: ${target.targetKey}`)
}

function parseFirstInteger(pattern, text) {
  const match = String(text || '').match(pattern)
  return match ? Number(match[1] || 0) : null
}

async function runCommand(runner, { timeoutSeconds }) {
  const startedAt = new Date()
  let outputTail = ''
  let stderrTail = ''
  let timedOut = false

  const outcome = await new Promise(resolve => {
    let timeout = null
    let killEscalationTimeout = null
    const child = spawn(runner.command, runner.args, {
      cwd: process.cwd(),
      env: process.env,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    if (timeoutSeconds > 0) {
      timeout = setTimeout(() => {
        timedOut = true
        killProcessGroup(child, 'SIGTERM')
        killEscalationTimeout = setTimeout(() => {
          killProcessGroup(child, 'SIGKILL')
        }, 5000)
      }, timeoutSeconds * 1000)
    }

    child.stdout.on('data', chunk => {
      const text = chunk.toString()
      process.stdout.write(text)
      outputTail = appendTail(outputTail, text)
    })

    child.stderr.on('data', chunk => {
      const text = chunk.toString()
      process.stderr.write(text)
      outputTail = appendTail(outputTail, text)
      stderrTail = appendTail(stderrTail, text)
    })

    child.on('error', error => {
      if (timeout) clearTimeout(timeout)
      if (killEscalationTimeout) clearTimeout(killEscalationTimeout)
      resolve({
        status: 'failed',
        exitCode: null,
        signal: null,
        errorMessage: error.message,
      })
    })

    child.on('close', (exitCode, signal) => {
      if (timeout) clearTimeout(timeout)
      if (killEscalationTimeout) clearTimeout(killEscalationTimeout)
      resolve({
        status: exitCode === 0 && !timedOut ? 'succeeded' : 'failed',
        exitCode,
        signal,
        errorMessage: exitCode === 0 && !timedOut ? null : (
          timedOut
            ? `Timed out after ${timeoutSeconds} seconds`
            : (stderrTail.trim().split('\n').slice(-3).join('\n') || `Exited with code ${exitCode}`)
        ),
      })
    })
  })

  const finishedAt = new Date()
  return {
    ...outcome,
    outputTail,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
  }
}

async function findTarget(targetKey) {
  const snapshot = await getExtractionControlSnapshot({ limit: 200 })
  return snapshot.targets.find(target => target.targetKey === targetKey) || null
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const targetKey = String(args.target || '').trim()
  const actor = String(args.actor || process.env.FOUNDATION_JOB_ACTOR || 'extraction-target-runner').trim()
  const dryRun = boolValue(args.dryRun)
  const force = boolValue(args.force)

  if (!targetKey) {
    throw new Error('Pass --target=<target-key>. Example: --target=gmail-current-day')
  }

  await initFoundationDb()

  const target = await findTarget(targetKey)
  if (!target) throw new Error(`Unknown extraction target: ${targetKey}`)

  const runner = getTargetRunner(target)
  const maxRuntimeSeconds = numberFromBudget(target, 'maxRuntimeSeconds', 900)
  const leaseSeconds = maxRuntimeSeconds + 60

  if (dryRun) {
    console.log(JSON.stringify({
      targetKey,
      sourceId: target.sourceId,
      command: runner.command,
      args: runner.args,
      leaseSeconds,
      targetStatus: target.status,
      runtimeMode: target.runtimeMode,
    }, null, 2))
    return
  }

  const leasedTarget = await leaseSourceCrawlTarget(targetKey, {
    leaseOwner: actor,
    leaseSeconds,
    force,
  })

  console.log(`Extraction target leased: ${leasedTarget.targetKey}`)
  console.log(`Command: ${[runner.command, ...runner.args].join(' ')}`)

  const beforeStats = await getSharedCommunicationSourceStats(leasedTarget.sourceId)
  let afterStats = beforeStats
  let outcome = null

  try {
    outcome = await runCommand(runner, { timeoutSeconds: maxRuntimeSeconds })
    afterStats = await getSharedCommunicationSourceStats(leasedTarget.sourceId)

    const inspectedParsed = parseFirstInteger(runner.inspectedPattern, outcome.outputTail)
    const archivedParsed = parseFirstInteger(runner.archivedPattern, outcome.outputTail)
    const itemFailuresParsed = runner.itemFailuresPattern
      ? parseFirstInteger(runner.itemFailuresPattern, outcome.outputTail)
      : null
    const effectiveStatus =
      outcome.status === 'succeeded' && Number(itemFailuresParsed || 0) > 0
        ? 'partial'
        : outcome.status
    const effectiveError =
      effectiveStatus === 'partial'
        ? `${itemFailuresParsed} crawl item${itemFailuresParsed === 1 ? '' : 's'} failed`
        : outcome.errorMessage
    const archivedDelta = Math.max(Number(afterStats.artifacts || 0) - Number(beforeStats.artifacts || 0), 0)
    const inspectedDelta = inspectedParsed == null ? archivedDelta : inspectedParsed

    await finishSourceCrawlTargetRun(
      targetKey,
      {
        lastRunAt: outcome.finishedAt,
        lastStatus: effectiveStatus,
        lastError: effectiveError,
        inspectedDelta,
        archivedDelta,
        cursorState: {
          artifactCount: afterStats.artifacts,
          latestArtifactUpdatedAt: afterStats.latestArtifactUpdatedAt,
          latestIngestedAt: afterStats.latestIngestedAt,
          lastRunnerAt: outcome.finishedAt,
        },
        metadata: {
          command: [runner.command, ...runner.args],
          durationMs: outcome.durationMs,
          exitCode: outcome.exitCode,
          signal: outcome.signal,
          parsed: {
            inspected: inspectedParsed,
            archivedThisRun: archivedParsed,
            itemFailures: itemFailuresParsed,
          },
          beforeStats,
          afterStats,
          outputTail: outcome.outputTail,
        },
      },
      actor,
    )

    console.log(`Extraction target ${effectiveStatus}: ${targetKey}`)
    console.log(`  Inspected: ${inspectedDelta}`)
    console.log(`  Net-new archived artifacts: ${archivedDelta}`)
    if (itemFailuresParsed != null) console.log(`  Crawl item failures: ${itemFailuresParsed}`)
    process.exitCode = outcome.status === 'succeeded' ? 0 : 1
  } catch (error) {
    const finishedAt = new Date().toISOString()
    const message = error instanceof Error ? error.message : String(error)
    try {
      afterStats = await getSharedCommunicationSourceStats(leasedTarget.sourceId)
      await finishSourceCrawlTargetRun(
        targetKey,
        {
          lastRunAt: finishedAt,
          lastStatus: 'failed',
          lastError: message,
          inspectedDelta: 0,
          archivedDelta: Math.max(Number(afterStats.artifacts || 0) - Number(beforeStats.artifacts || 0), 0),
          cursorState: {
            artifactCount: afterStats.artifacts,
            latestArtifactUpdatedAt: afterStats.latestArtifactUpdatedAt,
            latestIngestedAt: afterStats.latestIngestedAt,
            lastRunnerAt: finishedAt,
          },
          metadata: {
            command: [runner.command, ...runner.args],
            failedBeforeOutcome: !outcome,
            errorMessage: message,
            beforeStats,
            afterStats,
          },
        },
        actor,
      )
    } catch (finishError) {
      console.error('Failed to record extraction target failure.')
      console.error(finishError instanceof Error ? finishError.message : String(finishError))
    }
    throw error
  }
}

main()
  .catch(error => {
    console.error('Extraction target run failed.')
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb()
  })
