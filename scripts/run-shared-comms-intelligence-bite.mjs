#!/usr/bin/env node

import { spawn } from 'node:child_process';
import process from 'node:process';

function parseArgs(argv) {
  const result = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [key, value] = arg.slice(2).split('=');
    result[key] = value ?? true;
  }
  return result;
}

function boolArg(value) {
  return value === true || value === 'true' || value === '1';
}

function buildSteps(args) {
  const actor = args.actor || process.env.FOUNDATION_JOB_ACTOR || 'shared-comms-intelligence-bite';
  const steps = [];

  if (boolArg(args.includeGmail) && !boolArg(args.skipGmail)) {
    steps.push({
      label: 'Gmail candidate bite',
      command: 'npm',
      args: ['run', 'foundation:job', '--', '--job=gmail-extract-latest', `--actor=${actor}`],
    });
  }

  if (boolArg(args.includeMissive) && !boolArg(args.skipMissive)) {
    steps.push({
      label: 'Missive candidate bite',
      command: 'npm',
      args: ['run', 'foundation:job', '--', '--job=missive-extract-latest', `--actor=${actor}`],
    });
  }

  if (boolArg(args.includeMeetings) && !boolArg(args.skipMeetings)) {
    steps.push({
      label: 'Meeting transcript candidate bite',
      command: 'npm',
      args: ['run', 'foundation:job', '--', '--job=meeting-transcripts-extract-backlog', `--actor=${actor}`],
    });
  }

  if (!boolArg(args.skipSynthesis)) {
    steps.push({
      label: 'Shared-comms synthesis',
      command: 'npm',
      args: ['run', 'foundation:job', '--', '--job=shared-comms-synthesis-v1', `--actor=${actor}`],
    });
  }

  return steps;
}

function runStep(step) {
  return new Promise((resolve, reject) => {
    console.log('');
    console.log(`== ${step.label} ==`);
    console.log([step.command, ...step.args].join(' '));

    const child = spawn(step.command, step.args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('close', (exitCode, signal) => {
      if (exitCode === 0) {
        resolve();
        return;
      }
      reject(new Error(`${step.label} failed with ${signal || `exit ${exitCode}`}`));
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = boolArg(args.dryRun);
  const steps = buildSteps(args);

  console.log('Shared communications intelligence bite');
  console.log(`  Steps: ${steps.length}`);
  console.log(`  Dry run: ${dryRun}`);

  if (!steps.length) {
    throw new Error('No intelligence bite steps selected.');
  }

  if (dryRun) {
    for (const step of steps) {
      console.log(`- ${step.label}: ${[step.command, ...step.args].join(' ')}`);
    }
    return;
  }

  for (const step of steps) {
    await runStep(step);
  }

  console.log('');
  console.log('Shared communications intelligence bite complete.');
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
