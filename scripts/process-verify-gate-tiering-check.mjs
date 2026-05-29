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
import {
  closeFoundationDb,
  initFoundationDb,
  updateBacklogItem,
} from '../lib/foundation-db.js'
import { readFoundationBuildLogRegistrySource } from '../lib/foundation-build-log-source.js'
import { Pool } from 'pg'

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

async function getWorkingTreeDiffsByFile(repoRoot, files = []) {
  const diffsByFile = {}
  await Promise.all(files.map(async file => {
    const diff = await git(repoRoot, ['diff', '--unified=0', 'HEAD', '--', file]).catch(() => '')
    if (diff) diffsByFile[file] = diff
  }))
  return diffsByFile
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

function createPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

async function closeGateTieringFixCard() {
  await initFoundationDb()
  await updateBacklogItem('VERIFY-GATE-TIERING-FIX-001', {
    lane: 'done',
    nextAction: 'Done for v1. Keep additive backlog-card seed captures on focused proof and keep schema/function/substrate edits full-gate.',
    statusNote: 'Closed on 2026-05-12 under `verify-gate-tiering-fix-v1`. V1 adds diff-aware `lib/foundation-db.js` classification: additive backlog-card seed captures are focused-gate eligible, while deletions, schema changes, functions, and arbitrary JS remain full-gate. Proof: `npm run process:verify-gate-tiering-check -- --json=true` synthetic cases include backlog-card capture focused and schema/function change full.',
  }, 'codex')
  await closeFoundationDb()

  const pool = createPool()
  try {
    await pool.query(
      `
        UPDATE foundation_sprint_items
        SET stage = 'done_this_sprint',
            updated_at = NOW()
        WHERE sprint_id = 'connector-routing-truth-2026-05-12'
          AND backlog_id = 'VERIFY-GATE-TIERING-FIX-001'
      `,
    )
    await pool.query(
      `
        UPDATE foundation_sprints
        SET active_blocker_card_id = 'PLAN-CRITIC-LOG-001',
            metadata = metadata || $1::jsonb,
            updated_at = NOW()
        WHERE sprint_id = 'connector-routing-truth-2026-05-12'
          AND status = 'active'
      `,
      [JSON.stringify({
        currentStatus: 'gate_fix_done_next_plan_critic_log',
        nextAction: 'Build PLAN-CRITIC-LOG-001 next so Plan Critic dogfood is queryable before matrix work.',
      })],
    )
  } finally {
    await pool.end()
  }
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
    buildCloseoutRegistryText,
    hookText,
    packageText,
  ] = await Promise.all([
    readRepoFile(repoRoot, VERIFY_GATE_TIERING_PLAN_PATH),
    readRepoFile(repoRoot, 'docs/rebuild/current-plan.md'),
    readRepoFile(repoRoot, 'docs/rebuild/current-state.md'),
    readRepoFile(repoRoot, 'lib/foundation-current-sprint.js'),
    readRepoFile(repoRoot, 'lib/foundation-build-log.js'),
    readFoundationBuildLogRegistrySource(repoRoot),
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
    filePath: 'Foundation build closeout registry',
    text: buildCloseoutRegistryText,
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
      'getChangedDiffsForPush',
      'recordFocusedVerificationProof',
      'FOUNDATION_FOCUSED_VERIFY_PROOF_PATH',
      VERIFY_GATE_TIERING_FOCUSED_PROOF_COMMAND,
    ],
  })
  assertIncludes({
    filePath: 'lib/process-verify-gate-tiering.js',
    text: await readRepoFile(repoRoot, 'lib/process-verify-gate-tiering.js'),
    needles: [
      'isFoundationDbBacklogCaptureOnlyDiff',
      'additive Foundation DB backlog-card capture uses focused proof',
      'Foundation DB schema or function changes require full Foundation ship gate',
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
    runNodeCheck(repoRoot, 'lib/foundation-build-closeout-records.js'),
    runNodeCheck(repoRoot, 'lib/foundation-build-closeout-process-gate-records.js'),
  ])
  await runBacklogHygiene(repoRoot)

  const changedFiles = recordProof
    ? await getHeadChangedFiles(repoRoot, commitRef)
    : await getWorkingTreeChangedFiles(repoRoot)
  const protectedFiles = getProtectedFoundationChangedFiles(changedFiles)
  const diffsByFile = recordProof ? {} : await getWorkingTreeDiffsByFile(repoRoot, protectedFiles)
  const gate = classifyVerificationGateForFiles(protectedFiles, { diffsByFile })
  const applyLiveState = args.apply === true ||
    args.apply === 'true' ||
    args.closeCard === true ||
    args.closeCard === 'true' ||
    args['close-card'] === true ||
    args['close-card'] === 'true' ||
    args.mutateSprint === true ||
    args.mutateSprint === 'true' ||
    args['mutate-sprint'] === true ||
    args['mutate-sprint'] === 'true'
  if (applyLiveState) {
    await closeGateTieringFixCard()
  }

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
    fixCardId: 'VERIFY-GATE-TIERING-FIX-001',
    liveStateApplied: applyLiveState,
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
