#!/usr/bin/env node

import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';
import {
  closeFoundationDb,
  getFoundationJobRunSnapshot,
  initFoundationDb,
  markStaleLlmCalls,
  markStaleFoundationJobRuns,
  markStaleSourceCrawlTargetRuns,
} from '../lib/foundation-db.js';
import { runFoundationJob } from './run-foundation-job.mjs';

function parseArgs(argv) {
  const result = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [key, value] = arg.slice(2).split('=');
    result[key] = value ?? true;
  }
  return result;
}

function isTrue(value) {
  return value === true || value === 'true' || value === '1';
}

function selectDueJobs(snapshot, { jobKey, maxJobs }) {
  const requestedJob = String(jobKey || '').trim();
  const jobs = Array.isArray(snapshot.jobs) ? snapshot.jobs : [];
  const runnable = jobs.filter(job => {
    if (requestedJob) return job.key === requestedJob;
    return job.enabled && job.runtimeMode === 'scheduled' && job.due;
  });

  return runnable
    .filter(job => job.latestRun?.status !== 'running' && job.latestRun?.status !== 'queued')
    .slice(0, maxJobs);
}

async function runWorkerPass({ actor, dryRun, jobKey, maxJobs, staleRunMinutes, staleSourceCrawlRunMinutes, staleLlmCallSeconds, staleLlmCallGraceSeconds }) {
  if (!dryRun) {
    const reapedRuns = await markStaleFoundationJobRuns({ olderThanMinutes: staleRunMinutes }, actor);
    if (reapedRuns.length) {
      console.warn(`Foundation worker: marked ${reapedRuns.length} stale active run(s) failed before selecting jobs.`);
    }
    const reapedLlmCalls = await markStaleLlmCalls({
      olderThanSeconds: staleLlmCallSeconds,
      graceSeconds: staleLlmCallGraceSeconds,
    }, actor);
    if (reapedLlmCalls.length) {
      console.warn(`Foundation worker: marked ${reapedLlmCalls.length} stale LLM call(s) failed before selecting jobs.`);
    }
    const reapedSourceCrawlRuns = await markStaleSourceCrawlTargetRuns({ olderThanMinutes: staleSourceCrawlRunMinutes }, actor);
    if (reapedSourceCrawlRuns.length) {
      console.warn(`Foundation worker: marked ${reapedSourceCrawlRuns.length} stale source-crawl run(s) failed before selecting jobs.`);
    }
  }

  const snapshot = await getFoundationJobRunSnapshot({ limit: 50 });
  const jobs = selectDueJobs(snapshot, { jobKey, maxJobs });

  if (!jobs.length) {
    console.log(`Foundation worker: no due jobs. scheduled=${snapshot.scheduledJobs} due=${snapshot.dueJobs}`);
    return { ran: 0, failed: 0 };
  }

  let failed = 0;
  for (const job of jobs) {
    console.log(`Foundation worker: ${dryRun ? 'would run' : 'running'} ${job.key} (${job.scheduleDetail})`);
    if (dryRun) continue;
    try {
      const exitCode = await runFoundationJob(job.key, { actor });
      if (exitCode !== 0) failed += 1;
    } catch (error) {
      failed += 1;
      console.error(`Foundation worker: job ${job.key} failed before completion.`);
      console.error(error instanceof Error ? error.stack || error.message : String(error));
    }
  }

  return { ran: dryRun ? 0 : jobs.length, failed };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const once = isTrue(args.once);
  const dryRun = isTrue(args.dryRun);
  const actor = String(args.actor || process.env.FOUNDATION_JOB_ACTOR || 'foundation-worker').trim();
  const intervalMs = Math.max(10_000, Number(args.intervalMs || process.env.FOUNDATION_WORKER_INTERVAL_MS || 60_000));
  const maxJobs = Math.max(1, Math.min(5, Number(args.maxJobs || 1)));
  const jobKey = args.job ? String(args.job) : '';
  const staleRunMinutes = Math.max(30, Number(args.staleRunMinutes || process.env.FOUNDATION_WORKER_STALE_RUN_MINUTES || 180));
  const staleSourceCrawlRunMinutes = Math.max(5, Number(args.staleSourceCrawlRunMinutes || process.env.FOUNDATION_WORKER_STALE_SOURCE_CRAWL_RUN_MINUTES || 30));
  const staleLlmCallSeconds = Math.max(30, Number(args.staleLlmCallSeconds || process.env.FOUNDATION_WORKER_STALE_LLM_CALL_SECONDS || 240));
  const staleLlmCallGraceSeconds = Math.max(0, Number(args.staleLlmCallGraceSeconds || process.env.FOUNDATION_WORKER_STALE_LLM_CALL_GRACE_SECONDS || 60));

  await initFoundationDb();

  console.log(`Foundation worker started. once=${once} dryRun=${dryRun} intervalMs=${intervalMs} maxJobs=${maxJobs}`);

  let exitCode = 0;
  do {
    try {
      const result = await runWorkerPass({
        actor,
        dryRun,
        jobKey,
        maxJobs,
        staleRunMinutes,
        staleSourceCrawlRunMinutes,
        staleLlmCallSeconds,
        staleLlmCallGraceSeconds,
      });
      if (result.failed > 0) exitCode = 1;
    } catch (error) {
      exitCode = 1;
      console.error('Foundation worker pass failed.');
      console.error(error instanceof Error ? error.stack || error.message : String(error));
    }
    if (!once) await sleep(intervalMs);
  } while (!once);

  process.exitCode = exitCode;
}

main()
  .catch(error => {
    console.error('Foundation worker failed.');
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeFoundationDb();
  });
