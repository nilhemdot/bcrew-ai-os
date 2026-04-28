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
  listSourceCrawlItems,
  upsertIntelligenceJobRun,
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

function listFromBudget(target, key) {
  const value = target?.budget?.[key]
  if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean)
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function getTargetRunner(target) {
  const maxItemsPerRun = numberFromBudget(target, 'maxItemsPerRun', 25)
  const maxFoldersPerRun = numberFromBudget(target, 'maxFoldersPerRun', 1)

  if (target.targetKey === 'gmail-current-day') {
    const query = String(target.cursorState?.query || 'newer_than:2d')
    return {
      command: 'npm',
      args: [
        'run',
        'gmail:sync-archive',
        '--',
        '--team=true',
        `--limit=${maxItemsPerRun}`,
        `--query=${query}`,
        `--crawlTarget=${target.targetKey}`,
      ],
      inspectedPattern: /Threads selected:\s*(\d+)/i,
      archivedPattern: /Archived this run:\s*(\d+)/i,
      itemFailuresPattern: /Crawl items failed:\s*(\d+)/i,
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

  if (target.targetKey === 'slack-current-day') {
    const messagesPerChannel = Math.max(1, Math.min(maxItemsPerRun, Number(target.cursorState?.messagesPerChannel) || 10))
    return {
      command: 'npm',
      args: [
        'run',
        'slack:sync-archive',
        '--',
        `--limit=${messagesPerChannel}`,
        `--crawlTarget=${target.targetKey}`,
      ],
      inspectedPattern: /Channels readable by bot:\s*(\d+)/i,
      archivedPattern: /Archived this run:\s*(\d+)/i,
      itemFailuresPattern: /Crawl items failed:\s*(\d+)/i,
      summaryPattern: /^EXTRACTION_TARGET_SUMMARY\s+(\{.+\})$/m,
    }
  }

  if (target.targetKey === 'drive-corpus-backfill') {
    return {
      command: 'npm',
      args: [
        'run',
        'drive:inventory-corpus',
        '--',
        `--target=${target.targetKey}`,
        `--maxItems=${maxItemsPerRun}`,
        `--maxFolders=${maxFoldersPerRun}`,
        '--controlledByTargetRunner=true',
      ],
      inspectedPattern: /Drive items inspected:\s*(\d+)/i,
      archivedPattern: /Drive files discovered:\s*(\d+)/i,
      itemFailuresPattern: /Crawl items failed:\s*(\d+)/i,
      summaryPattern: /^EXTRACTION_TARGET_SUMMARY\s+(\{.+\})$/m,
    }
  }

  if (target.targetKey === 'drive-content-extract-backfill') {
    const maxTextChars = numberFromBudget(target, 'maxTextChars', 250000)
    const maxPdfBytes = numberFromBudget(target, 'maxPdfBytes', 25 * 1024 * 1024)
    const retrySkippedReasonPrefixes = listFromBudget(target, 'retrySkippedReasonPrefixes')
    return {
      command: 'npm',
      args: [
        'run',
        'drive:extract-content',
        '--',
        `--target=${target.targetKey}`,
        `--limit=${maxItemsPerRun}`,
        `--maxTextChars=${maxTextChars}`,
        `--maxPdfBytes=${maxPdfBytes}`,
        ...(retrySkippedReasonPrefixes.length
          ? [`--retrySkippedReasonPrefixes=${retrySkippedReasonPrefixes.join(',')}`]
          : []),
        '--controlledByTargetRunner=true',
      ],
      inspectedPattern: /Drive content files inspected:\s*(\d+)/i,
      archivedPattern: /Drive content extracted:\s*(\d+)/i,
      extractedPattern: /Drive content extracted:\s*(\d+)/i,
      itemFailuresPattern: /Crawl items failed:\s*(\d+)/i,
      summaryPattern: /^EXTRACTION_TARGET_SUMMARY\s+(\{.+\})$/m,
    }
  }

  if (target.targetKey === 'email-attachments-backfill') {
    const maxAttachmentBytes = numberFromBudget(target, 'maxAttachmentBytes', 25 * 1024 * 1024)
    const maxTextChars = numberFromBudget(target, 'maxTextChars', 250000)
    const query = String(target.cursorState?.query || 'has:attachment newer_than:30d')
    return {
      command: 'npm',
      args: [
        'run',
        'email:extract-attachments',
        '--',
        `--target=${target.targetKey}`,
        '--team=true',
        `--limit=${maxItemsPerRun}`,
        `--query=${query}`,
        `--maxAttachmentBytes=${maxAttachmentBytes}`,
        `--maxTextChars=${maxTextChars}`,
        '--controlledByTargetRunner=true',
      ],
      inspectedPattern: /Email attachments inspected:\s*(\d+)/i,
      archivedPattern: /Email attachments extracted:\s*(\d+)/i,
      extractedPattern: /Email attachments extracted:\s*(\d+)/i,
      itemFailuresPattern: /Crawl items failed:\s*(\d+)/i,
      summaryPattern: /^EXTRACTION_TARGET_SUMMARY\s+(\{.+\})$/m,
    }
  }

  if (target.targetKey === 'video-link-inventory') {
    const maxArtifactsPerRun = numberFromBudget(target, 'maxArtifactsPerRun', maxItemsPerRun)
    return {
      command: 'npm',
      args: [
        'run',
        'video-links:inventory',
        '--',
        `--target=${target.targetKey}`,
        `--maxArtifacts=${maxArtifactsPerRun}`,
        '--controlledByTargetRunner=true',
      ],
      inspectedPattern: /Shared artifacts scanned:\s*(\d+)/i,
      archivedPattern: /Video\/media links discovered:\s*(\d+)/i,
      itemFailuresPattern: /Crawl items failed:\s*(\d+)/i,
      summaryPattern: /^EXTRACTION_TARGET_SUMMARY\s+(\{.+\})$/m,
    }
  }

  if (target.targetKey === 'video-content-extract-backfill') {
    const maxTextChars = numberFromBudget(target, 'maxTextChars', 250000)
    return {
      command: 'npm',
      args: [
        'run',
        'video:extract-content',
        '--',
        `--target=${target.targetKey}`,
        `--limit=${maxItemsPerRun}`,
        `--maxTextChars=${maxTextChars}`,
        '--controlledByTargetRunner=true',
      ],
      inspectedPattern: /Video content items inspected:\s*(\d+)/i,
      archivedPattern: /Video transcripts extracted:\s*(\d+)/i,
      extractedPattern: /Video transcripts extracted:\s*(\d+)/i,
      itemFailuresPattern: /Crawl items failed:\s*(\d+)/i,
      summaryPattern: /^EXTRACTION_TARGET_SUMMARY\s+(\{.+\})$/m,
    }
  }

  throw new Error(`No extraction target runner is configured yet for: ${target.targetKey}`)
}

function parseFirstInteger(pattern, text) {
  const match = String(text || '').match(pattern)
  return match ? Number(match[1] || 0) : null
}

function parseRunnerSummary(pattern, text) {
  if (!pattern) return null
  const match = String(text || '').match(pattern)
  if (!match) return null
  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

function getTargetScheduleEveryMinutes(target) {
  const metadataValue = Number(target?.metadata?.scheduleEveryMinutes)
  if (Number.isFinite(metadataValue) && metadataValue > 0) return metadataValue
  const budgetValue = Number(target?.budget?.scheduleEveryMinutes)
  if (Number.isFinite(budgetValue) && budgetValue > 0) return budgetValue
  return null
}

function getNextRunAt(target, finishedAt) {
  if (target?.runtimeMode !== 'scheduled') return null
  const scheduleEveryMinutes = getTargetScheduleEveryMinutes(target)
  if (!scheduleEveryMinutes) return null
  const finishedMs = Date.parse(finishedAt)
  if (!Number.isFinite(finishedMs)) return null
  return new Date(finishedMs + scheduleEveryMinutes * 60 * 1000).toISOString()
}

function normalizeIntelligenceLedgerStatus(status) {
  if (status === 'running') return 'started'
  if (status === 'partial') return 'failed'
  if (['succeeded', 'failed', 'skipped'].includes(status)) return status
  return 'failed'
}

function buildIntelligenceJobId(crawlRunId) {
  return `intel-extraction:${crawlRunId}`
}

function buildRunnerCommand(runner) {
  return [runner.command, ...runner.args]
}

async function getTargetOutputArtifactIds(targetKey, sourceId) {
  const recentItems = await listSourceCrawlItems({
    targetKey,
    status: 'succeeded',
    limit: 100,
    order: 'desc',
  })
  return recentItems
    .filter(item => item.sourceId === sourceId && item.artifactId)
    .map(item => item.artifactId)
    .slice(0, 20)
}

async function recordExtractionIntelligenceJob({
  leasedTarget,
  runner,
  actor,
  status,
  startedAt = null,
  finishedAt = null,
  durationMs = null,
  inspectedDelta = 0,
  archivedDelta = 0,
  extractedDelta = 0,
  failureCount = 0,
  outputArtifactIds = [],
  nextRunAt = null,
  resultSummary = {},
  errorMessage = null,
  cursorState = null,
}) {
  if (!leasedTarget?.crawlRunId) return null
  return upsertIntelligenceJobRun(
    {
      jobId: buildIntelligenceJobId(leasedTarget.crawlRunId),
      jobType: 'extraction_target',
      sourceId: leasedTarget.sourceId,
      sourceCrawlRunId: leasedTarget.crawlRunId,
      status: normalizeIntelligenceLedgerStatus(status),
      cursorState: cursorState || leasedTarget.cursorState || {},
      budget: leasedTarget.budget || {},
      model: null,
      provider: null,
      authPath: 'existing-source-connector',
      routeKey: null,
      costUsd: null,
      itemCounts: {
        inspected: Number(inspectedDelta || 0),
        archived: Number(archivedDelta || 0),
        extracted: Number(extractedDelta || 0),
      },
      failureCount: Number(failureCount || 0),
      outputArtifactIds,
      nextRunState: {
        targetKey: leasedTarget.targetKey,
        targetStatus: leasedTarget.status || null,
        runtimeMode: leasedTarget.effectiveRuntimeMode || leasedTarget.runtimeMode || null,
        nextRunAt,
      },
      resultSummary: {
        targetTitle: leasedTarget.title || leasedTarget.targetKey,
        command: buildRunnerCommand(runner),
        ...resultSummary,
      },
      errorMessage,
      provenance: {
        caller: 'scripts/run-extraction-target.mjs',
        backlogCardId: 'INTEL-JOBS-001',
        sourceTable: 'source_crawl_target_runs',
        parentRunId: leasedTarget.crawlRunId,
        targetKey: leasedTarget.targetKey,
        actor,
      },
      startedAt,
      finishedAt,
      durationMs,
    },
    actor,
  )
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
  if (leasedTarget.crawlRunId) console.log(`Crawl run: ${leasedTarget.crawlRunId}`)
  console.log(`Command: ${[runner.command, ...runner.args].join(' ')}`)

  const beforeStats = await getSharedCommunicationSourceStats(leasedTarget.sourceId)
  let afterStats = beforeStats
  let outcome = null
  const ledgerStartedAt = new Date().toISOString()

  await recordExtractionIntelligenceJob({
    leasedTarget,
    runner,
    actor,
    status: 'started',
    startedAt: ledgerStartedAt,
    nextRunAt: leasedTarget.nextRunAt || null,
    resultSummary: {
      runStatus: 'started',
    },
  })

  try {
    outcome = await runCommand(runner, { timeoutSeconds: maxRuntimeSeconds })
    afterStats = await getSharedCommunicationSourceStats(leasedTarget.sourceId)

    const runnerSummary = parseRunnerSummary(runner.summaryPattern, outcome.outputTail)
    const inspectedParsed = Number.isFinite(Number(runnerSummary?.inspected))
      ? Number(runnerSummary.inspected)
      : parseFirstInteger(runner.inspectedPattern, outcome.outputTail)
    const archivedParsed = Number.isFinite(Number(runnerSummary?.archived))
      ? Number(runnerSummary.archived)
      : parseFirstInteger(runner.archivedPattern, outcome.outputTail)
    const itemFailuresParsed = Number.isFinite(Number(runnerSummary?.itemFailures))
      ? Number(runnerSummary.itemFailures)
      : runner.itemFailuresPattern
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
    const archivedDelta = Number.isFinite(Number(runnerSummary?.archived))
      ? Number(runnerSummary.archived)
      : Math.max(Number(afterStats.artifacts || 0) - Number(beforeStats.artifacts || 0), 0)
    const extractedParsed = Number.isFinite(Number(runnerSummary?.extracted))
      ? Number(runnerSummary.extracted)
      : runner.extractedPattern
        ? parseFirstInteger(runner.extractedPattern, outcome.outputTail)
        : null
    const extractedDelta = Number.isFinite(Number(extractedParsed)) ? Number(extractedParsed) : 0
    const inspectedDelta = inspectedParsed == null ? archivedDelta : inspectedParsed
    const nextRunAt = getNextRunAt(leasedTarget, outcome.finishedAt)
    const cursorState = {
      artifactCount: afterStats.artifacts,
      latestArtifactUpdatedAt: afterStats.latestArtifactUpdatedAt,
      latestIngestedAt: afterStats.latestIngestedAt,
      lastRunnerAt: outcome.finishedAt,
      ...(runnerSummary?.cursorState || {}),
    }

    await finishSourceCrawlTargetRun(
      targetKey,
      {
        runId: leasedTarget.crawlRunId,
        lastRunAt: outcome.finishedAt,
        nextRunAt,
        lastStatus: effectiveStatus,
        lastError: effectiveError,
        inspectedDelta,
        archivedDelta,
        extractedDelta,
        cursorState,
        metadata: {
          command: [runner.command, ...runner.args],
          durationMs: outcome.durationMs,
          exitCode: outcome.exitCode,
          signal: outcome.signal,
          parsed: {
            inspected: inspectedParsed,
            archivedThisRun: archivedParsed,
            extractedThisRun: extractedParsed,
            itemFailures: itemFailuresParsed,
            nextRunAt,
          },
          runnerSummary: runnerSummary || null,
          ...(runnerSummary?.metadata || {}),
          beforeStats,
          afterStats,
          outputTail: outcome.outputTail,
        },
      },
      actor,
    )

    const outputArtifactIds = await getTargetOutputArtifactIds(targetKey, leasedTarget.sourceId)
    await recordExtractionIntelligenceJob({
      leasedTarget,
      runner,
      actor,
      status: effectiveStatus,
      startedAt: outcome.startedAt || ledgerStartedAt,
      finishedAt: outcome.finishedAt,
      durationMs: outcome.durationMs,
      inspectedDelta,
      archivedDelta,
      extractedDelta,
      failureCount: Number(itemFailuresParsed || 0) || (effectiveStatus === 'failed' ? 1 : 0),
      outputArtifactIds,
      nextRunAt,
      cursorState,
      errorMessage: effectiveError,
      resultSummary: {
        runStatus: effectiveStatus,
        exitCode: outcome.exitCode,
        signal: outcome.signal,
        runnerSummary: runnerSummary || null,
        parsed: {
          inspected: inspectedParsed,
          archivedThisRun: archivedParsed,
          extractedThisRun: extractedParsed,
          itemFailures: itemFailuresParsed,
        },
      },
    })

    console.log(`Extraction target ${effectiveStatus}: ${targetKey}`)
    console.log(`  Inspected: ${inspectedDelta}`)
    console.log(`  Net-new archived artifacts: ${archivedDelta}`)
    if (itemFailuresParsed != null) console.log(`  Crawl item failures: ${itemFailuresParsed}`)
    if (effectiveStatus === 'partial') {
      console.error(`Extraction target partial: ${targetKey} — ${effectiveError}`)
    }
    process.exitCode = effectiveStatus === 'succeeded' ? 0 : 1
  } catch (error) {
    const finishedAt = new Date().toISOString()
    const message = error instanceof Error ? error.message : String(error)
    try {
      afterStats = await getSharedCommunicationSourceStats(leasedTarget.sourceId)
      const archivedDelta = Math.max(Number(afterStats.artifacts || 0) - Number(beforeStats.artifacts || 0), 0)
      const nextRunAt = getNextRunAt(leasedTarget, finishedAt)
      const cursorState = {
        artifactCount: afterStats.artifacts,
        latestArtifactUpdatedAt: afterStats.latestArtifactUpdatedAt,
        latestIngestedAt: afterStats.latestIngestedAt,
        lastRunnerAt: finishedAt,
      }
      await finishSourceCrawlTargetRun(
        targetKey,
        {
          runId: leasedTarget.crawlRunId,
          lastRunAt: finishedAt,
          nextRunAt,
          lastStatus: 'failed',
          lastError: message,
          inspectedDelta: 0,
          archivedDelta,
          cursorState,
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
      await recordExtractionIntelligenceJob({
        leasedTarget,
        runner,
        actor,
        status: 'failed',
        startedAt: outcome?.startedAt || ledgerStartedAt,
        finishedAt,
        durationMs: outcome?.durationMs || Math.max(0, Date.parse(finishedAt) - Date.parse(ledgerStartedAt)),
        inspectedDelta: 0,
        archivedDelta,
        extractedDelta: 0,
        failureCount: 1,
        outputArtifactIds: await getTargetOutputArtifactIds(targetKey, leasedTarget.sourceId),
        nextRunAt,
        cursorState,
        errorMessage: message,
        resultSummary: {
          runStatus: 'failed',
          failedBeforeOutcome: !outcome,
        },
      })
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
