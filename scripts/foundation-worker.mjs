#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import {
  closeFoundationDb,
  getFoundationJobRunSnapshot,
  initFoundationDb,
  markStaleLlmCalls,
  markStaleFoundationJobRuns,
  markStaleSourceCrawlItems,
  markStaleSourceCrawlTargetRuns,
  recordFoundationRuntimeStatus,
} from '../lib/foundation-db.js';
import { getFoundationJobDefinitions } from '../lib/foundation-jobs.js';
import { parseFoundationWorkerArgs } from '../lib/foundation-worker-reliability.js';
import { runFoundationJob } from './run-foundation-job.mjs';

const execFile = promisify(execFileCallback);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const workerStartedAt = new Date().toISOString();
const workerRestartCommand = 'launchctl kickstart -k gui/$(id -u)/ai.bcrew.foundation-worker';

function isTrue(value) {
  return value === true || value === 'true' || value === '1';
}

function normalizeGitSha(value) {
  const sha = String(value || '').trim();
  return /^[0-9a-f]{40}$/i.test(sha) ? sha.toLowerCase() : null;
}

async function captureWorkerRuntimeMetadata({ actor, once, dryRun, intervalMs, maxJobs }) {
  try {
    const { stdout } = await execFile('git', ['rev-parse', 'HEAD'], {
      cwd: repoRoot,
      maxBuffer: 1024 * 64,
    });
    const runningCommit = normalizeGitSha(stdout);
    if (!runningCommit) throw new Error('git rev-parse HEAD did not return a commit.');
    const runningShortCommit = runningCommit.slice(0, 7);
    await recordFoundationRuntimeStatus({
      serviceKey: 'foundation-worker',
      serviceLabel: 'Foundation Worker',
      status: 'live',
      startedAt: workerStartedAt,
      processId: process.pid,
      runningCommit,
      runningShortCommit,
      checkName: 'worker-startup-code-equals-HEAD',
      restartCommand: workerRestartCommand,
      plainEnglish: `Foundation worker started from commit ${runningShortCommit}. foundation:verify compares this worker-start commit to repo HEAD and the LaunchAgent process id so reviewers can catch stale worker code.`,
      metadata: { actor, once, dryRun, intervalMs, maxJobs },
    });
  } catch (error) {
    await recordFoundationRuntimeStatus({
      serviceKey: 'foundation-worker',
      serviceLabel: 'Foundation Worker',
      status: 'risk',
      startedAt: workerStartedAt,
      processId: process.pid,
      checkName: 'worker-startup-code-equals-HEAD',
      restartCommand: workerRestartCommand,
      plainEnglish: `Foundation worker could not capture its startup commit. Run: ${workerRestartCommand} to restart it, then rerun foundation:verify.`,
      metadata: {
        actor,
        once,
        dryRun,
        intervalMs,
        maxJobs,
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }
}

function selectDueJobs(snapshot, { jobKey, maxJobs }) {
  const requestedJob = String(jobKey || '').trim();
  const jobs = Array.isArray(snapshot.jobs) ? snapshot.jobs : [];
  const runnable = jobs.filter(job => {
    const scheduleGuardOk = job.scheduleMutationGuard?.ok !== false && job.scheduleStatus !== 'blocked';
    if (requestedJob) return job.key === requestedJob && scheduleGuardOk;
    return job.enabled && job.runtimeMode === 'scheduled' && job.due && scheduleGuardOk;
  });

  return runnable
    .filter(job => job.latestRun?.status !== 'running' && job.latestRun?.status !== 'queued')
    .slice(0, maxJobs);
}

function buildMaxRuntimeSecondsByJob() {
  return Object.fromEntries(getFoundationJobDefinitions()
    .map(job => [job.key, Math.floor(Number(job.maxRuntimeSeconds) || 0)])
    .filter(([jobKey, seconds]) => jobKey && seconds > 0));
}

async function runWorkerPass({ actor, dryRun, jobKey, maxJobs, staleRunMinutes, staleSourceCrawlRunMinutes, staleLlmCallSeconds, staleLlmCallGraceSeconds }) {
  if (!dryRun) {
    const reapedRuns = await markStaleFoundationJobRuns({
      olderThanMinutes: staleRunMinutes,
      maxRuntimeSecondsByJob: buildMaxRuntimeSecondsByJob(),
      graceSeconds: 300,
    }, actor);
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
    const reapedSourceCrawlItems = await markStaleSourceCrawlItems({ olderThanMinutes: staleSourceCrawlRunMinutes }, actor);
    if (reapedSourceCrawlItems.length) {
      console.warn(`Foundation worker: marked ${reapedSourceCrawlItems.length} stale source-crawl item lease(s) failed before selecting jobs.`);
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
  const args = parseFoundationWorkerArgs(process.argv.slice(2));
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
  const shouldRecordRuntimeStatus = !(once && dryRun);
  if (shouldRecordRuntimeStatus) {
    await captureWorkerRuntimeMetadata({ actor, once, dryRun, intervalMs, maxJobs });
  } else {
    console.log('Foundation worker dry-run: runtime service status not updated.');
  }

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
