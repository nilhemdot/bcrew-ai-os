#!/usr/bin/env node

import process from 'node:process'

import {
  BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID,
} from '../lib/build-intel-source-value-grader.js'
import {
  closeFoundationDb,
  getIntelligenceReportBundle,
  initFoundationDb,
  listSourceCrawlItems,
  listYoutubeFullWatchReportArtifacts,
  upsertIntelligenceReportArtifact,
  upsertSourceCrawlItem,
  upsertSourceCrawlTarget,
} from '../lib/foundation-db.js'
import {
  buildYoutubeHandoffEvidenceFromReports,
} from '../lib/dev-team-hub.js'
import {
  SOURCE_GOD_MODE_YOUTUBE_HANDOFF_READBACK_LIMIT,
  SOURCE_GOD_MODE_YOUTUBE_HANDOFF_TARGET_KEY,
  buildSourceGodModeYoutubeHandoffQueue,
  persistSourceGodModeYoutubeHandoffBatch,
  runSourceGodModeYoutubeHandoffBatch,
  selectSourceGodModeYoutubeHandoffRows,
} from '../lib/source-god-mode-youtube-handoff.js'

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    apply: false,
    json: false,
    headed: false,
    maxRuns: 3,
    rowLimit: 0,
    bucketIds: [],
    actor: process.env.FOUNDATION_JOB_ACTOR || 'source-god-mode-youtube-handoff-runner',
  }
  for (const arg of argv) {
    if (arg === '--apply' || arg === '--apply=true') args.apply = true
    if (arg === '--json' || arg === '--json=true') args.json = true
    if (arg === '--headed' || arg === '--headed=true') args.headed = true
    if (arg.startsWith('--max-runs=')) args.maxRuns = Number(arg.slice('--max-runs='.length))
    if (arg.startsWith('--row-limit=')) args.rowLimit = Number(arg.slice('--row-limit='.length))
    if (arg.startsWith('--bucket=')) args.bucketIds.push(...arg.slice('--bucket='.length).split(',').map(text).filter(Boolean))
    if (arg.startsWith('--actor=')) args.actor = text(arg.slice('--actor='.length)) || args.actor
  }
  args.maxRuns = Math.max(1, Math.min(20, Number.isFinite(args.maxRuns) ? args.maxRuns : 3))
  args.rowLimit = Number.isFinite(args.rowLimit) && args.rowLimit > 0
    ? Math.max(10, Math.min(5000, args.rowLimit))
    : 0
  return args
}

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function sourceValueGraderFromBundle(bundle = {}) {
  const report = bundle.report || bundle
  return report?.structuredOutputJson || report?.structured_output_json || {}
}

function filterQueueRows(queue = {}, args = {}) {
  const allowedBuckets = new Set(list(args.bucketIds))
  if (!allowedBuckets.size) return queue
  return {
    ...queue,
    rows: list(queue.rows).filter(row => allowedBuckets.has(row.bucketId)),
  }
}

function summarizeRows(rows = []) {
  return list(rows).slice(0, 20).map(row => ({
    rowId: row.rowId,
    bucketId: row.bucketId,
    status: row.status,
    runnable: row.runnable,
    host: row.host,
    url: row.url,
    runner: row.runner,
    sourceType: row.sourceType,
    bestDevBuildGrade: row.devLanePriority?.bestDevBuildGrade || '',
  }))
}

async function loadQueue(args = {}) {
  const [
    youtubeFullWatchReports,
    sourceValueGraderBundle,
    sourceGodModeHandoffRunItems,
  ] = await Promise.all([
    listYoutubeFullWatchReportArtifacts({ limit: 800 }),
    getIntelligenceReportBundle(BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID, { atomLimit: 10, hitLimit: 10 }),
    listSourceCrawlItems({ targetKey: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_TARGET_KEY, limit: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_READBACK_LIMIT, order: 'desc' }),
  ])
  const handoffEvidence = buildYoutubeHandoffEvidenceFromReports(youtubeFullWatchReports || [])
  const queue = buildSourceGodModeYoutubeHandoffQueue({
    handoffEvidence,
    rowLimit: args.rowLimit,
    sourceValueGrader: sourceValueGraderFromBundle(sourceValueGraderBundle),
    runItems: sourceGodModeHandoffRunItems,
  })
  return { queue, handoffEvidence, sourceGodModeHandoffRunItems }
}

async function main() {
  const args = parseArgs()
  await initFoundationDb()
  try {
    const loaded = await loadQueue(args)
    const queue = filterQueueRows(loaded.queue, args)
    const runnableRows = list(queue.rows).filter(row => row.runnable === true)
    const nextRows = selectSourceGodModeYoutubeHandoffRows(queue, { maxRuns: args.maxRuns })
    if (!args.apply) {
      const output = {
        ok: true,
        status: 'dry_run',
        applyRequired: true,
        targetKey: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_TARGET_KEY,
        queue: {
          status: loaded.queue.status,
          counts: loaded.queue.counts,
          filteredRowCount: list(queue.rows).length,
          filteredRunnableCount: runnableRows.length,
          buckets: args.bucketIds,
        },
        nextRows: summarizeRows(nextRows),
        note: 'Pass --apply to run bounded public/free source-browser rows and persist evidence readback.',
      }
      if (args.json) console.log(JSON.stringify(output, null, 2))
      else {
        console.log(`Source handoff dry run: ${runnableRows.length} runnable rows`)
        for (const row of output.nextRows) console.log(`${row.bucketId} ${row.host} ${row.url}`)
      }
      return
    }

    if (!runnableRows.length) {
      const output = {
        ok: true,
        status: 'no_runnable_rows',
        targetKey: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_TARGET_KEY,
        queue: {
          counts: loaded.queue.counts,
          filteredRowCount: list(queue.rows).length,
          buckets: args.bucketIds,
        },
      }
      if (args.json) console.log(JSON.stringify(output, null, 2))
      else console.log('No runnable source handoff rows are available.')
      return
    }

    const batch = await runSourceGodModeYoutubeHandoffBatch({
      queue,
      maxRuns: args.maxRuns,
      mode: 'live_browser',
      headed: args.headed,
      now: new Date().toISOString(),
    })
    const persistence = await persistSourceGodModeYoutubeHandoffBatch(batch, {
      actor: args.actor,
      upsertSourceCrawlTarget,
      upsertSourceCrawlItem,
      upsertIntelligenceReportArtifact,
    })
    const output = {
      ok: batch.ok === true && persistence.ok === true,
      status: persistence.ok ? 'completed_evidence_persisted' : 'persistence_blocked',
      targetKey: SOURCE_GOD_MODE_YOUTUBE_HANDOFF_TARGET_KEY,
      queue: {
        counts: loaded.queue.counts,
        filteredRowCount: list(queue.rows).length,
        filteredRunnableCount: runnableRows.length,
        buckets: args.bucketIds,
      },
      batch: {
        status: batch.status,
        ok: batch.ok,
        batchRunId: batch.batchRunId,
        selectedRows: batch.selectedRows,
        results: batch.results.map(result => ({
          rowId: result.rowId,
          bucketId: result.bucketId,
          runner: result.runner,
          status: result.status,
          ok: result.ok,
          pagesRead: result.pagesRead,
          handsEvents: result.handsEvents,
          artifacts: result.artifacts,
        })),
        sideEffects: batch.sideEffects,
      },
      persistence: {
        status: persistence.status,
        ok: persistence.ok,
        sourceCrawlItemCount: list(persistence.sourceCrawlItems).length,
        reportArtifactId: persistence.reportArtifact?.reportArtifactId || persistence.reportArtifact?.report_artifact_id || '',
        targetKey: persistence.target?.targetKey || persistence.target?.target_key || '',
        sideEffects: persistence.sideEffects,
      },
    }
    if (args.json) console.log(JSON.stringify(output, null, 2))
    else {
      console.log(`Source handoff run: ${output.status}`)
      console.log(`Batch: ${batch.batchRunId}`)
      for (const result of output.batch.results) console.log(`${result.bucketId} ${result.status} pages=${result.pagesRead} ${result.artifacts?.reportPath || ''}`)
      console.log(`Report: ${output.persistence.reportArtifactId}`)
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
