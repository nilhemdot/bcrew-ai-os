#!/usr/bin/env node

import { spawn } from 'node:child_process';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import {
  closeFoundationDb,
  createFoundationJobRun,
  finishFoundationJobRun,
  getFoundationJobRunSnapshot,
  initFoundationDb,
} from '../lib/foundation-db.js';
import { getFoundationJobDefinition, getFoundationJobDefinitions } from '../lib/foundation-jobs.js';

const OUTPUT_TAIL_LIMIT = 20000;

function parseArgs(argv) {
  const result = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [key, value] = arg.slice(2).split('=');
    result[key] = value ?? true;
  }
  return result;
}

function makeRunId(jobKey) {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `job-${jobKey}-${stamp}-${suffix}`;
}

function appendTail(current, chunk) {
  const next = current + chunk;
  return next.length > OUTPUT_TAIL_LIMIT ? next.slice(next.length - OUTPUT_TAIL_LIMIT) : next;
}

function printJobList() {
  const snapshotLines = getFoundationJobDefinitions().map(job => {
    const args = [job.command, ...job.args].join(' ');
    return `${job.key}\n  ${job.title}\n  ${job.jobType} / ${job.cadence}\n  ${args}`;
  });
  console.log(snapshotLines.join('\n\n'));
}

export async function runFoundationJob(jobKey, { actor = 'codex', dryRun = false, force = false } = {}) {
  await initFoundationDb();

  const job = getFoundationJobDefinition(jobKey);
  if (!job) {
    throw new Error(`Unknown Foundation job: ${jobKey}. Run with --list to see available jobs.`);
  }

  if (!job.enabled && !force) {
    throw new Error(`Foundation job is not enabled: ${jobKey}. Pass --force=true to run intentionally.`);
  }

  const runId = makeRunId(job.key);
  if (dryRun) {
    console.log(JSON.stringify({ runId, job }, null, 2));
    return 0;
  }

  return runCommand(job, runId, actor);
}

async function runCommand(job, runId, actor) {
  const startedAt = new Date();
  let outputTail = '';
  let stderrTail = '';
  let timedOut = false;

  await createFoundationJobRun(
    {
      runId,
      jobKey: job.key,
      title: job.title,
      jobType: job.jobType,
      command: {
        command: job.command,
        args: job.args,
        cwd: process.cwd(),
      },
      metadata: {
        lane: job.lane,
        priority: job.priority,
        cadence: job.cadence,
        sourceIds: job.sourceIds,
      },
      startedAt: startedAt.toISOString(),
    },
    actor,
  );

  console.log(`Foundation job started: ${job.key}`);
  console.log(`Run ID: ${runId}`);
  console.log(`Command: ${[job.command, ...job.args].join(' ')}`);

  const outcome = await new Promise(resolve => {
    const child = spawn(job.command, job.args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const timeoutMs = Number(job.maxRuntimeSeconds) > 0 ? Number(job.maxRuntimeSeconds) * 1000 : null;
    const timeout = timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          child.kill('SIGTERM');
        }, timeoutMs)
      : null;

    child.stdout.on('data', chunk => {
      const text = chunk.toString();
      process.stdout.write(text);
      outputTail = appendTail(outputTail, text);
    });

    child.stderr.on('data', chunk => {
      const text = chunk.toString();
      process.stderr.write(text);
      outputTail = appendTail(outputTail, text);
      stderrTail = appendTail(stderrTail, text);
    });

    child.on('error', error => {
      if (timeout) clearTimeout(timeout);
      resolve({
        status: 'failed',
        exitCode: null,
        signal: null,
        errorMessage: error.message,
      });
    });

    child.on('close', (exitCode, signal) => {
      if (timeout) clearTimeout(timeout);
      resolve({
        status: exitCode === 0 && !timedOut ? 'succeeded' : 'failed',
        exitCode,
        signal,
        errorMessage: exitCode === 0 && !timedOut ? null : (
          timedOut
            ? `Timed out after ${job.maxRuntimeSeconds} seconds`
            : (stderrTail.trim().split('\n').slice(-3).join('\n') || `Exited with code ${exitCode}`)
        ),
      });
    });
  });

  const finishedAt = new Date();
  const durationMs = finishedAt.getTime() - startedAt.getTime();

  await finishFoundationJobRun(
    runId,
    {
      status: outcome.status,
      finishedAt: finishedAt.toISOString(),
      durationMs,
      exitCode: outcome.exitCode,
      signal: outcome.signal,
      outputTail,
      errorMessage: outcome.errorMessage,
    },
    actor,
  );

  console.log(`Foundation job ${outcome.status}: ${job.key} (${durationMs}ms)`);
  return outcome.status === 'succeeded' ? 0 : 1;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const actor = String(args.actor || process.env.FOUNDATION_JOB_ACTOR || 'codex').trim();

  if (args.list) {
    printJobList();
    return;
  }

  if (args.snapshot) {
    await initFoundationDb();
    const snapshot = await getFoundationJobRunSnapshot({ limit: Number(args.limit || 30), includeOutput: args.includeOutput === 'true' });
    console.log(JSON.stringify(snapshot, null, 2));
    return;
  }

  const jobKey = String(args.job || '').trim();
  if (!jobKey) {
    throw new Error('Pass --job=<job-key> or --list.');
  }

  process.exitCode = await runFoundationJob(jobKey, {
    actor,
    dryRun: args.dryRun === true || args.dryRun === 'true',
    force: args.force === true || args.force === 'true',
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main()
    .catch(error => {
      console.error('Foundation job runner failed.');
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    })
    .finally(async () => {
      await closeFoundationDb();
    });
}
