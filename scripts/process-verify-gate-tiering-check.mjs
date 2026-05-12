#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import {
  buildSyntheticVerifyGateTieringProof,
  buildVerifyGateTieringSummary,
  classifyVerificationGateForFiles,
  VERIFY_GATE_TIERING_CARD_ID,
  VERIFY_GATE_TIERING_FOCUSED_PROOF_COMMAND,
  VERIFY_GATE_TIERING_PLAN_PATH,
  VERIFY_GATE_TIERING_SCRIPT_PATH,
} from '../lib/process-verify-gate-tiering.js'
import {
  getProtectedFoundationChangedFiles,
  recordFocusedVerificationProof,
} from '../lib/process-git-hooks.js'

const execFile = promisify(execFileCallback)

function parseArgs(argv) {
  const result = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, ...rest] = arg.slice(2).split('=')
    result[key] = rest.length ? rest.join('=') : true
  }
  return result
}

async function readRepoFile(repoRoot, relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function git(repoRoot, args) {
  const { stdout } = await execFile('git', args, {
    cwd: repoRoot,
    env: process.env,
    maxBuffer: 1024 * 1024 * 4,
  })
  return String(stdout || '').trim()
}

async function getHeadChangedFiles(repoRoot, commitRef = 'HEAD') {
  const diff = await git(repoRoot, ['diff-tree', '--no-commit-id', '--name-only', '-r', commitRef]).catch(() => '')
  return diff ? diff.split('\n').map(file => file.trim()).filter(Boolean) : []
}

async function getWorkingTreeChangedFiles(repoRoot) {
  const tracked = await git(repoRoot, ['diff', '--name-only', 'HEAD']).catch(() => '')
  const untracked = await git(repoRoot, ['ls-files', '--others', '--exclude-standard']).catch(() => '')
  return `${tracked}\n${untracked}`
    .split('\n')
    .map(file => file.trim())
    .filter(Boolean)
}

async function runNodeCheck(repoRoot, filePath) {
  await execFile('node', ['--check', filePath], {
    cwd: repoRoot,
    env: process.env,
    maxBuffer: 1024 * 1024,
  })
}

async function runBacklogHygiene(repoRoot) {
  await execFile('npm', ['run', 'backlog:hygiene', '--', '--json'], {
    cwd: repoRoot,
    env: process.env,
    maxBuffer: 1024 * 1024 * 8,
  })
}

function assertIncludes({ filePath, text, needles }) {
  const missing = needles.filter(needle => !text.includes(needle))
  if (missing.length) {
    throw new Error(`${filePath} missing expected marker(s): ${missing.join(', ')}`)
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const repoRoot = process.cwd()
  const recordProof = args.recordProof === true || args.recordProof === 'true'
  const commitRef = String(args.commitRef || 'HEAD').trim()

  const [
    planText,
    currentPlanText,
    currentStateText,
    sprintText,
    buildLogText,
    hookText,
    packageText,
  ] = await Promise.all([
    readRepoFile(repoRoot, VERIFY_GATE_TIERING_PLAN_PATH),
    readRepoFile(repoRoot, 'docs/rebuild/current-plan.md'),
    readRepoFile(repoRoot, 'docs/rebuild/current-state.md'),
    readRepoFile(repoRoot, 'lib/foundation-current-sprint.js'),
    readRepoFile(repoRoot, 'lib/foundation-build-log.js'),
    readRepoFile(repoRoot, 'lib/process-git-hooks.js'),
    readRepoFile(repoRoot, 'package.json'),
  ])

  assertIncludes({
    filePath: VERIFY_GATE_TIERING_PLAN_PATH,
    text: planText,
    needles: [
      VERIFY_GATE_TIERING_CARD_ID,
      'focused verification',
      'full Foundation ship gate',
      'static',
      'focused',
      'full',
    ],
  })
  assertIncludes({
    filePath: 'docs/rebuild/current-plan.md',
    text: currentPlanText,
    needles: [VERIFY_GATE_TIERING_CARD_ID, 'proportional verification'],
  })
  assertIncludes({
    filePath: 'docs/rebuild/current-state.md',
    text: currentStateText,
    needles: [VERIFY_GATE_TIERING_CARD_ID, 'proportional verification'],
  })
  assertIncludes({
    filePath: 'lib/foundation-current-sprint.js',
    text: sprintText,
    needles: [
      'VERIFY_GATE_TIERING_CARD_ID',
      VERIFY_GATE_TIERING_CARD_ID,
      VERIFY_GATE_TIERING_SCRIPT_PATH,
      'proportional verification',
    ],
  })
  assertIncludes({
    filePath: 'lib/foundation-build-log.js',
    text: buildLogText,
    needles: [
      'verify-gate-tiering-v1',
      VERIFY_GATE_TIERING_CARD_ID,
      'proportional verification tiers',
    ],
  })
  assertIncludes({
    filePath: 'lib/process-git-hooks.js',
    text: hookText,
    needles: [
      'classifyVerificationGateForFiles',
      'recordFocusedVerificationProof',
      'FOUNDATION_FOCUSED_VERIFY_PROOF_PATH',
      VERIFY_GATE_TIERING_FOCUSED_PROOF_COMMAND,
    ],
  })

  const packageJson = JSON.parse(packageText)
  if (packageJson.scripts?.['process:verify-gate-tiering-check'] !== `node --env-file-if-exists=.env ${VERIFY_GATE_TIERING_SCRIPT_PATH}`) {
    throw new Error('package.json missing process:verify-gate-tiering-check script')
  }

  const synthetic = buildSyntheticVerifyGateTieringProof()
  if (!synthetic.ok) {
    const failures = synthetic.cases
      .filter(testCase => !testCase.ok)
      .map(testCase => `${testCase.name}: expected ${testCase.expectedLevel}, got ${testCase.actualLevel}`)
      .join('; ')
    throw new Error(`Synthetic verification-tier proof failed: ${failures}`)
  }

  await Promise.all([
    runNodeCheck(repoRoot, 'lib/process-verify-gate-tiering.js'),
    runNodeCheck(repoRoot, 'lib/process-git-hooks.js'),
    runNodeCheck(repoRoot, VERIFY_GATE_TIERING_SCRIPT_PATH),
    runNodeCheck(repoRoot, 'lib/foundation-current-sprint.js'),
    runNodeCheck(repoRoot, 'lib/foundation-build-log.js'),
  ])
  await runBacklogHygiene(repoRoot)

  const changedFiles = recordProof
    ? await getHeadChangedFiles(repoRoot, commitRef)
    : await getWorkingTreeChangedFiles(repoRoot)
  const protectedFiles = getProtectedFoundationChangedFiles(changedFiles)
  const gate = classifyVerificationGateForFiles(protectedFiles)

  let proof = null
  if (recordProof) {
    proof = await recordFocusedVerificationProof({
      repoRoot,
      cardId: VERIFY_GATE_TIERING_CARD_ID,
      commitRef,
      changedFiles: protectedFiles,
      gateLevel: gate.level,
      commands: [
        VERIFY_GATE_TIERING_FOCUSED_PROOF_COMMAND,
        'npm run backlog:hygiene -- --json',
      ],
    })
  }

  const summary = {
    ok: true,
    cardId: VERIFY_GATE_TIERING_CARD_ID,
    syntheticCases: synthetic.cases.length,
    changedProtectedFiles: protectedFiles,
    gate: {
      level: gate.level,
      fullVerifyRequired: gate.fullVerifyRequired,
      commands: gate.commands,
      summary: buildVerifyGateTieringSummary(gate),
    },
    recordedProof: proof ? {
      commitSha: proof.commitSha,
      shortSha: proof.shortSha,
      gateLevel: proof.gateLevel,
    } : null,
  }

  if (args.json === true || args.json === 'true') {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(`VERIFY_GATE_TIERING_OK ${JSON.stringify(summary)}`)
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
