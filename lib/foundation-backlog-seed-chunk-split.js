import fs from 'node:fs'
import path from 'node:path'

import { backlogSeed } from './foundation-backlog-seed.js'
import {
  FOUNDATION_BACKLOG_SEED_CHUNK_PATHS,
  FOUNDATION_BACKLOG_SEED_SOURCE_PATHS,
} from './foundation-backlog-seed-source.js'

export const FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_CARD_ID = 'FOUNDATION-BACKLOG-SEED-CHUNK-SPLIT-001'
export const FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_CLOSEOUT_KEY = 'foundation-backlog-seed-chunk-split-v1'
export const FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_PLAN_PATH = 'docs/process/foundation-backlog-seed-chunk-split-001-plan.md'
export const FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-BACKLOG-SEED-CHUNK-SPLIT-001.json'
export const FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-foundation-backlog-seed-chunk-split-closeout.md'
export const FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_SCRIPT_PATH = 'scripts/process-foundation-backlog-seed-chunk-split-check.mjs'
export const FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_SPRINT_ID = 'foundation-backlog-seed-chunk-split-2026-05-18'
export const FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_NEXT_CARD_ID = 'FOUNDATION-AGENT-USEFULNESS-RUNTIME-GATES-001'
export const FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_BEFORE_LINES = 4651
export const FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_MAX_ROOT_LINES = 3000
export const FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_MAX_CHUNK_LINES = 1500

export const FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_CHANGED_FILES = [
  'lib/foundation-backlog-seed.js',
  'lib/foundation-backlog-seed-source.js',
  ...FOUNDATION_BACKLOG_SEED_CHUNK_PATHS,
  'lib/foundation-backlog-seed-chunk-split.js',
  FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_SCRIPT_PATH,
  'lib/foundation-build-closeout-size-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'scripts/foundation-verify.mjs',
  'lib/foundation-followup-card-capture.js',
  'scripts/process-verification-runs-check.mjs',
  'scripts/process-build-lane-verifier-snapshot-wiring-repair-check.mjs',
  'scripts/process-verifier-intelligence-spine-split-module-check.mjs',
  'scripts/process-verifier-source-trust-split-module-check.mjs',
  FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_PLAN_PATH,
  FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_APPROVAL_PATH,
  FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_CLOSEOUT_PATH,
  'package.json',
]

export const FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_PROOF_COMMANDS = [
  'node --check lib/foundation-backlog-seed.js lib/foundation-backlog-seed-source.js lib/foundation-backlog-seed-chunks/*.js lib/foundation-backlog-seed-chunk-split.js lib/foundation-followup-card-capture.js scripts/process-foundation-backlog-seed-chunk-split-check.mjs scripts/foundation-verify.mjs scripts/process-verification-runs-check.mjs scripts/process-build-lane-verifier-snapshot-wiring-repair-check.mjs scripts/process-verifier-intelligence-spine-split-module-check.mjs scripts/process-verifier-source-trust-split-module-check.mjs',
  'npm run process:foundation-backlog-seed-chunk-split-check -- --close-card --json',
  'npm run backlog:hygiene -- --json',
  'npm run process:ship-check -- --card=FOUNDATION-BACKLOG-SEED-CHUNK-SPLIT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-BACKLOG-SEED-CHUNK-SPLIT-001.json --closeoutKey=foundation-backlog-seed-chunk-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=FOUNDATION-BACKLOG-SEED-CHUNK-SPLIT-001 --closeoutKey=foundation-backlog-seed-chunk-split-v1',
  'npm run foundation:verify -- --json-summary',
  'npm run process:foundation-ship -- --card=FOUNDATION-BACKLOG-SEED-CHUNK-SPLIT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-BACKLOG-SEED-CHUNK-SPLIT-001.json --closeoutKey=foundation-backlog-seed-chunk-split-v1 --commitRef=HEAD',
]

const REQUIRED_SOURCE_BUNDLE_SNIPPETS = [
  "id: 'REPORT-MINING-001'",
  'Accepted on 2026-04-27 in `docs/specs/2026-04-27-intelligence-spine-old-system-salvage.md`',
  "id: 'INTEL-ATOM-001'",
  'Done v1 on 2026-04-27',
  "id: 'FOUNDATION-CHANGELOG-001'",
  'SALES-GLS-GROUPING-OVERRIDES-001',
  'SOURCE-EXTRACTION-GAP-FOLLOWUP-001',
]

function countLines(source = '') {
  const text = String(source || '')
  if (!text) return 0
  return text.split('\n').length - (text.endsWith('\n') ? 1 : 0)
}

function readRepoText(repoRoot, relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

function uniqueCount(values = []) {
  return new Set(values).size
}

export function evaluateBacklogSeedChunkSplitFixture({
  rootLineCount,
  chunkLineCounts = [],
  beforeLineCount = FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_BEFORE_LINES,
  seedIds = [],
  sourceBundle = '',
} = {}) {
  const ids = seedIds.filter(Boolean)
  const requiredSnippetsPresent = REQUIRED_SOURCE_BUNDLE_SNIPPETS.every(snippet => sourceBundle.includes(snippet))
  const checks = [
    {
      ok: rootLineCount > 0 && rootLineCount < FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_MAX_ROOT_LINES,
      check: 'seed root is below 3,000 lines',
      detail: `${rootLineCount}`,
    },
    {
      ok: rootLineCount > 0 && rootLineCount < beforeLineCount,
      check: 'seed root is smaller than pre-split baseline',
      detail: `${rootLineCount} < ${beforeLineCount}`,
    },
    {
      ok: chunkLineCounts.length >= 2 && chunkLineCounts.every(lineCount => lineCount > 0 && lineCount <= FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_MAX_CHUNK_LINES),
      check: 'all seed chunks are bounded',
      detail: chunkLineCounts.join(', '),
    },
    {
      ok: ids.length >= 300 && uniqueCount(ids) === ids.length,
      check: 'seed id list is complete and unique',
      detail: `${uniqueCount(ids)}/${ids.length}`,
    },
    {
      ok: requiredSnippetsPresent,
      check: 'source bundle preserves verifier seed snippets',
      detail: REQUIRED_SOURCE_BUNDLE_SNIPPETS.filter(snippet => !sourceBundle.includes(snippet)).join(', '),
    },
  ]
  return {
    ok: checks.every(check => check.ok),
    checks,
  }
}

export function buildFoundationBacklogSeedChunkSplitSnapshot({ repoRoot = process.cwd() } = {}) {
  const rootSource = readRepoText(repoRoot, 'lib/foundation-backlog-seed.js')
  const chunkRows = FOUNDATION_BACKLOG_SEED_CHUNK_PATHS.map(filePath => {
    const source = readRepoText(repoRoot, filePath)
    return {
      filePath,
      lineCount: countLines(source),
    }
  })
  const sourceBundle = FOUNDATION_BACKLOG_SEED_SOURCE_PATHS
    .map(filePath => readRepoText(repoRoot, filePath))
    .join('\n')
  const seedIds = backlogSeed.map(item => item.id).filter(Boolean)
  const evaluation = evaluateBacklogSeedChunkSplitFixture({
    rootLineCount: countLines(rootSource),
    chunkLineCounts: chunkRows.map(row => row.lineCount),
    seedIds,
    sourceBundle,
  })
  return {
    ok:
      evaluation.ok &&
      rootSource.includes('export const backlogSeed = [') &&
      FOUNDATION_BACKLOG_SEED_CHUNK_PATHS.every(filePath => rootSource.includes(filePath.replace('lib/', './'))) &&
      sourceBundle.includes('export const backlogSeedChunk001 = ['),
    root: {
      filePath: 'lib/foundation-backlog-seed.js',
      lineCount: countLines(rootSource),
      beforeLineCount: FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_BEFORE_LINES,
    },
    chunks: chunkRows,
    seedRows: backlogSeed.length,
    uniqueSeedIds: uniqueCount(seedIds),
    sourcePathCount: FOUNDATION_BACKLOG_SEED_SOURCE_PATHS.length,
    evaluation,
  }
}

export function buildFoundationBacklogSeedChunkSplitDogfoodProof() {
  const healthySource = REQUIRED_SOURCE_BUNDLE_SNIPPETS.join('\n')
  const healthy = evaluateBacklogSeedChunkSplitFixture({
    rootLineCount: 374,
    chunkLineCounts: [938, 938, 938, 937, 908],
    seedIds: Array.from({ length: 358 }, (_, index) => `CARD-${String(index).padStart(3, '0')}`),
    sourceBundle: healthySource,
  })
  const monolithRejected = evaluateBacklogSeedChunkSplitFixture({
    rootLineCount: FOUNDATION_BACKLOG_SEED_CHUNK_SPLIT_BEFORE_LINES,
    chunkLineCounts: [],
    seedIds: Array.from({ length: 358 }, (_, index) => `CARD-${String(index).padStart(3, '0')}`),
    sourceBundle: healthySource,
  })
  const missingChunkRejected = evaluateBacklogSeedChunkSplitFixture({
    rootLineCount: 374,
    chunkLineCounts: [938, 938],
    seedIds: Array.from({ length: 358 }, (_, index) => `CARD-${String(index).padStart(3, '0')}`),
    sourceBundle: REQUIRED_SOURCE_BUNDLE_SNIPPETS.slice(0, -1).join('\n'),
  })
  const duplicateIdRejected = evaluateBacklogSeedChunkSplitFixture({
    rootLineCount: 374,
    chunkLineCounts: [938, 938, 938],
    seedIds: ['CARD-001', 'CARD-001', ...Array.from({ length: 300 }, (_, index) => `CARD-${String(index + 2).padStart(3, '0')}`)],
    sourceBundle: healthySource,
  })
  return {
    ok:
      healthy.ok &&
      monolithRejected.ok === false &&
      missingChunkRejected.ok === false &&
      duplicateIdRejected.ok === false,
    healthy,
    monolithRejected,
    missingChunkRejected,
    duplicateIdRejected,
    dogfoodInvariant: 'The split accepts bounded seed chunks and rejects the pre-split monolithic root, incomplete verifier source bundles, and duplicate seed IDs.',
  }
}
