#!/usr/bin/env node

import process from 'node:process'

import {
  BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID,
} from '../lib/build-intel-source-value-grader.js'
import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  listSourceCrawlItems,
  upsertSourceCrawlItem,
  upsertSourceCrawlTarget,
} from '../lib/foundation-source-crawl-db.js'
import {
  getIntelligenceReportBundle,
  listYoutubeFullWatchReportArtifacts,
} from '../lib/foundation-intelligence-db.js'
import {
  buildYoutubeHandoffEvidenceFromReports,
} from '../lib/dev-team-hub.js'
import {
  SOURCE_GOD_MODE_YOUTUBE_HANDOFF_READBACK_LIMIT,
  SOURCE_GOD_MODE_YOUTUBE_HANDOFF_TARGET_KEY,
  buildSourceGodModeYoutubeHandoffQueue,
} from '../lib/source-god-mode-youtube-handoff.js'
import {
  SOURCE_BROWSER_AGENT_TARGET_KEY,
} from '../lib/source-browser-agent-harness.js'
import {
  buildSourceBrowserFallbackRetryPacket,
  runSourceBrowserFallbackRetry,
} from '../lib/source-browser-fallback-executor.js'

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function combineRunItems(...groups) {
  return groups.flatMap(group => list(group))
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: argv.includes('--apply') || argv.includes('--execute'),
    persist: argv.includes('--persist'),
    allowSourceSessionRun: argv.includes('--allowSourceSessionRun') || argv.includes('--allow-source-session-run'),
    maxRuns: 5,
    rowLimit: 0,
    bucketIds: [],
    hosts: [],
    actor: process.env.FOUNDATION_JOB_ACTOR || 'source-browser-fallback-batch-cli',
  }
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, rawValue = 'true'] = arg.slice(2).split('=')
    const value = text(rawValue)
    if (key === 'max-runs') args.maxRuns = Number(value)
    if (key === 'row-limit') args.rowLimit = Number(value)
    if (key === 'bucket') args.bucketIds.push(...value.split(',').map(text).filter(Boolean))
    if (key === 'host') args.hosts.push(...value.split(',').map(host => text(host).replace(/^www\./, '').toLowerCase()).filter(Boolean))
    if (key === 'actor') args.actor = value || args.actor
  }
  args.maxRuns = Number.isFinite(args.maxRuns) ? Math.max(1, Math.min(20, args.maxRuns)) : 5
  args.rowLimit = Number.isFinite(args.rowLimit) && args.rowLimit > 0
    ? Math.max(10, Math.min(5000, args.rowLimit))
    : 0
  return args
}

function sourceValueGraderFromBundle(bundle = {}) {
  const report = bundle.report || bundle
  return report?.structuredOutputJson || report?.structured_output_json || {}
}

function filterRows(rows = [], args = {}) {
  const bucketIds = new Set(list(args.bucketIds))
  const hosts = new Set(list(args.hosts))
  return list(rows).filter(row => {
    if (bucketIds.size && !bucketIds.has(row.bucketId)) return false
    if (hosts.size && !hosts.has(text(row.host).replace(/^www\./, '').toLowerCase())) return false
    const retryPacket = buildSourceBrowserFallbackRetryPacket({ row, fallbackPlan: row.fallbackPlan })
    if (retryPacket.cleanRetry?.allowedNow !== true && args.allowSourceSessionRun !== true) return false
    return true
  })
}

function summarizeRows(rows = []) {
  return list(rows).map(row => {
    const retryPacket = buildSourceBrowserFallbackRetryPacket({ row, fallbackPlan: row.fallbackPlan })
    return {
      rowId: row.rowId,
      bucketId: row.bucketId,
      host: row.host,
      url: row.url,
      sourceType: retryPacket.sourcePacket?.sourceType || row.sourceType,
      sourceFamily: retryPacket.sourcePacket?.sourceFamily || row.sourceFamily,
      retryStatus: retryPacket.status,
      cleanRetryAllowedNow: retryPacket.cleanRetry?.allowedNow === true,
      sourceSessionRequired: retryPacket.afterSourceSession?.required === true,
      bestDevBuildGrade: row.bestDevBuildGrade,
      command: row.command,
    }
  })
}

async function loadFallbackBatch(args = {}) {
  const [
    youtubeFullWatchReports,
    sourceValueGraderBundle,
    sourceGodModeHandoffRunItems,
    sourceBrowserAgentRunItems,
  ] = await Promise.all([
    listYoutubeFullWatchReportArtifacts({ limit: 800 }),
    getIntelligenceReportBundle(BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID, { atomLimit: 10, hitLimit: 10 }),
    listSourceCrawlItems({ targetKey: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_TARGET_KEY, limit: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_READBACK_LIMIT, order: 'desc' }),
    listSourceCrawlItems({ targetKey: SOURCE_BROWSER_AGENT_TARGET_KEY, limit: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_READBACK_LIMIT, order: 'desc' }),
  ])
  const handoffEvidence = buildYoutubeHandoffEvidenceFromReports(youtubeFullWatchReports || [])
  const queue = buildSourceGodModeYoutubeHandoffQueue({
    handoffEvidence,
    rowLimit: args.rowLimit,
    sourceValueGrader: sourceValueGraderFromBundle(sourceValueGraderBundle),
    runItems: combineRunItems(sourceGodModeHandoffRunItems, sourceBrowserAgentRunItems),
  })
  const retryBatch = queue.browserChallengeFallbackReview?.retryBatch || {}
  const selectedRows = filterRows(retryBatch.selectedRows || [], args).slice(0, args.maxRuns)
  return { queue, retryBatch, selectedRows }
}

async function main() {
  const args = parseArgs()
  await initFoundationDb()
  try {
    const loaded = await loadFallbackBatch(args)
    const dryRunOutput = {
      ok: true,
      status: args.apply ? 'ready_to_apply' : 'dry_run',
      applyRequired: !args.apply,
      targetKey: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_TARGET_KEY,
      counts: {
        fallbackRows: loaded.retryBatch.totalRows || 0,
        cleanRetryReadyRows: loaded.retryBatch.cleanRetryReadyRows || 0,
        selectedRows: loaded.selectedRows.length,
        sourceSessionRequiredRows: loaded.retryBatch.sourceSessionRequiredRows || 0,
      },
      filters: {
        buckets: args.bucketIds,
        hosts: args.hosts,
        maxRuns: args.maxRuns,
      },
      selectedRows: summarizeRows(loaded.selectedRows),
      note: 'Dry run first. Pass --apply to execute the bounded clean-isolated retry batch; rows that still show a challenge remain parked.',
    }
    if (!args.apply || !loaded.selectedRows.length) {
      if (args.json) console.log(JSON.stringify(dryRunOutput, null, 2))
      else {
        console.log(`Source Browser fallback batch dry run: ${loaded.selectedRows.length} selected`)
        for (const row of dryRunOutput.selectedRows) console.log(`${row.bucketId} ${row.host} ${row.url}`)
      }
      return
    }

    const deps = args.persist
      ? {
          actor: args.actor,
          upsertSourceCrawlTarget,
          upsertSourceCrawlItem,
        }
      : {}
    const results = []
    for (const row of loaded.selectedRows) {
      results.push(await runSourceBrowserFallbackRetry({
        row,
        fallbackPlan: row.fallbackPlan,
        apply: true,
        persist: args.persist,
        maxPages: row.maxPages || 4,
        maxDepth: row.maxDepth || 1,
        mode: 'live_browser',
        allowSourceSessionRun: args.allowSourceSessionRun,
        deps,
        now: new Date().toISOString(),
      }))
    }
    const unsafeResults = results.filter(result => result.unsafeSideEffectDetected === true)
    const safelyTerminalRows = results.filter(result =>
      result.ok === true ||
      result.operatorEscalationRequired === true ||
      /failed_closed|blocked_before_run/.test(String(result.status || ''))
    )
    const systemOk = unsafeResults.length === 0 && safelyTerminalRows.length === results.length
    const output = {
      ok: systemOk,
      status: results.every(result => result.ok === true)
        ? 'completed'
        : systemOk
          ? 'completed_with_safe_parked_rows'
          : 'completed_with_failed_rows',
      targetKey: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_TARGET_KEY,
      counts: {
        selectedRows: loaded.selectedRows.length,
        completedRows: results.filter(result => result.ok === true).length,
        operatorEscalationRequiredRows: results.filter(result => result.operatorEscalationRequired === true).length,
        safelyParkedRows: safelyTerminalRows.filter(result => result.ok !== true).length,
        unsafeRows: unsafeResults.length,
      },
      results: results.map(result => ({
        status: result.status,
        ok: result.ok,
        url: result.packet?.sourcePacket?.url || '',
        sourceFamily: result.packet?.sourcePacket?.sourceFamily || '',
        operatorEscalationRequired: result.operatorEscalationRequired === true,
        unsafeSideEffectDetected: result.unsafeSideEffectDetected === true,
        pagesRead: result.execution?.crawlItem?.metadata?.pagesRead || 0,
      })),
    }
    if (args.json) console.log(JSON.stringify(output, null, 2))
    else {
      console.log(`Source Browser fallback batch: ${output.status}`)
      for (const result of output.results) console.log(`${result.status} pages=${result.pagesRead} ${result.url}`)
    }
    if (!output.ok) process.exitCode = 1
  } finally {
    await closeFoundationDb().catch(() => {})
  }
}

main().catch(async error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  await closeFoundationDb().catch(() => {})
  process.exitCode = 1
})
