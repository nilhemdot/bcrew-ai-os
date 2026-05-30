#!/usr/bin/env node

import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import { getExtractionControlSnapshot } from '../lib/foundation-source-crawl-db.js'
import {
  getIntelligenceJobLedgerSnapshot,
  upsertIntelligenceJobRun,
} from '../lib/foundation-intelligence-db.js'
import { getFoundationSnapshot } from '../lib/foundation-strategy-docs-db.js'

function normalizeLedgerStatus(status) {
  if (status === 'running') return 'started'
  if (status === 'partial') return 'failed'
  if (['succeeded', 'failed', 'skipped'].includes(status)) return status
  return 'skipped'
}

function buildProofRecord({ run, target, recentItems, card }) {
  const outputArtifactIds = recentItems
    .filter(item => item.targetKey === run.targetKey && item.sourceId === run.sourceId && item.artifactId)
    .map(item => item.artifactId)
    .slice(0, 12)

  return {
    jobId: `intel-ledger-proof:${run.runId}`,
    jobType: 'extraction_target',
    sourceId: run.sourceId,
    sourceCrawlRunId: run.runId,
    status: normalizeLedgerStatus(run.status),
    cursorState: target?.cursorState || {},
    budget: target?.budget || {},
    model: run.metadata?.model || null,
    provider: run.metadata?.provider || null,
    authPath: run.metadata?.authPath || null,
    routeKey: run.metadata?.routeKey || null,
    costUsd: run.metadata?.costUsd ?? null,
    itemCounts: {
      inspected: run.inspectedDelta,
      archived: run.archivedDelta,
      extracted: run.extractedDelta,
    },
    failureCount: run.status === 'failed' || run.status === 'partial' ? 1 : 0,
    outputArtifactIds,
    nextRunState: {
      targetKey: run.targetKey,
      targetStatus: target?.status || null,
      runtimeMode: target?.effectiveRuntimeMode || target?.runtimeMode || null,
      nextRunAt: run.nextRunAt || target?.effectiveNextRunAt || target?.nextRunAt || null,
    },
    resultSummary: {
      targetTitle: target?.title || run.targetKey,
      runStatus: run.status,
      backlogCard: {
        id: card?.id || 'INTEL-JOBS-001',
        title: card?.title || 'Add intelligence job ledger for extraction and memory work',
        summary: card?.summary || '',
        whyItMatters: card?.whyItMatters || '',
        nextAction: card?.nextAction || '',
        statusNote: card?.statusNote || '',
      },
    },
    errorMessage: run.lastError || null,
    provenance: {
      caller: 'scripts/intelligence-job-ledger-proof.mjs',
      backlogCardId: 'INTEL-JOBS-001',
      sourceTable: 'source_crawl_target_runs',
      parentRunId: run.runId,
      targetKey: run.targetKey,
    },
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    durationMs: run.startedAt && run.finishedAt
      ? Math.max(0, Date.parse(run.finishedAt) - Date.parse(run.startedAt))
      : null,
  }
}

async function main() {
  await initFoundationDb()

  const foundation = await getFoundationSnapshot()
  const card = foundation.backlogItems.find(item => item.id === 'INTEL-JOBS-001') || null
  const extraction = await getExtractionControlSnapshot({ limit: 100 })
  const proofRun =
    extraction.recentRuns.find(run => run.status === 'succeeded') ||
    extraction.recentRuns.find(run => run.status === 'partial') ||
    extraction.recentRuns.find(run => run.status === 'failed') ||
    extraction.recentRuns[0]

  if (!proofRun) {
    throw new Error('No source_crawl_target_runs rows exist yet; run a governed extraction target before ledger proof.')
  }

  const target = extraction.targets.find(item => item.targetKey === proofRun.targetKey) || null
  const proofRecord = buildProofRecord({
    run: proofRun,
    target,
    recentItems: extraction.recentItems,
    card,
  })
  const recorded = await upsertIntelligenceJobRun(proofRecord, 'intel-jobs-proof')
  const snapshot = await getIntelligenceJobLedgerSnapshot({ limit: 5 })

  console.log(JSON.stringify({
    card: card
      ? {
          id: card.id,
          title: card.title,
          lane: card.lane,
          priority: card.priority,
          summary: card.summary,
          whyItMatters: card.whyItMatters,
          nextAction: card.nextAction,
          statusNote: card.statusNote,
        }
      : null,
    recorded,
    ledgerSummary: {
      totalRuns: snapshot.totalRuns,
      byStatus: snapshot.byStatus,
      byType: snapshot.byType,
    },
    recentRuns: snapshot.recentRuns,
  }, null, 2))
}

main()
  .catch(error => {
    console.error('Intelligence job ledger proof failed.')
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeFoundationDb()
  })
