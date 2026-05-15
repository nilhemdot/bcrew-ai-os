import fs from 'node:fs/promises'
import path from 'node:path'

import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
} from './process-write-guard.js'

export const PROCESS_CHECK_READONLY_MODE_CARD_ID = 'PROCESS-CHECK-READONLY-MODE-001'
export const PROCESS_CHECK_READONLY_MODE_CLOSEOUT_KEY = 'process-check-readonly-mode-v1'
export const PROCESS_CHECK_READONLY_MODE_PLAN_PATH = 'docs/process/process-check-readonly-mode-001-plan.md'
export const PROCESS_CHECK_READONLY_MODE_APPROVAL_PATH = 'docs/process/approvals/PROCESS-CHECK-READONLY-MODE-001.json'
export const PROCESS_CHECK_READONLY_MODE_SCRIPT_PATH = 'scripts/process-check-readonly-mode-check.mjs'
export const PROCESS_CHECK_READONLY_MODE_SPRINT_ID = 'process-check-readonly-mode-2026-05-15'

export const PROCESS_CHECK_READONLY_LEGACY_CLASSIFICATIONS = {
  'scripts/process-current-sprint-dynamic-truth-check.mjs': 'historical_closeout_only',
  'scripts/process-plan-critic-log-check.mjs': 'historical_closeout_only',
  'scripts/process-repair-verifier-sprint-check.mjs': 'historical_closeout_only',
  'scripts/process-source-connector-matrix-check.mjs': 'historical_closeout_only',
  'scripts/process-source-extraction-gap-followup-check.mjs': 'historical_closeout_only',
  'scripts/process-source-hub-routing-matrix-check.mjs': 'historical_closeout_only',
  'scripts/process-sprint-stage-gate-check.mjs': 'historical_closeout_only',
  'scripts/process-verify-gate-tiering-check.mjs': 'historical_closeout_only',
}

const LIVE_MUTATION_PATTERNS = [
  { key: 'backlogApi', pattern: /\b(?:updateBacklogItem|createBacklogItem)\s*\(/ },
  { key: 'currentSprintOverlay', pattern: /\bupsertFoundationCurrentSprintOverlay\s*\(/ },
  { key: 'rawPlanCriticSql', pattern: /INSERT\s+INTO\s+plan_critic_runs/i },
  { key: 'rawSprintSql', pattern: /\b(?:UPDATE|DELETE\s+FROM|INSERT\s+INTO)\s+foundation_sprint/i },
  { key: 'actionRouterApply', pattern: /\bapplyApprovedActionRoute\s*\(/ },
  { key: 'sheetWrite', pattern: /\bbatchUpdateSheetValues\s*\(/ },
]

const REPORT_WRITE_PATTERN = /\b(?:fs\.)?writeFile(?:Sync)?\s*\(/

function normalizePath(relativePath = '') {
  return String(relativePath || '').replace(/\\/g, '/').replace(/^\.\//, '')
}

function hasProcessWriteGuard(source = '') {
  return source.includes('assertProcessCheckWriteAllowed') &&
    (source.includes('isProcessCheckWriteRequested') || source.includes('PROCESS_CHECK_WRITE_FLAGS'))
}

function liveMutatorsForSource(source = '') {
  return LIVE_MUTATION_PATTERNS
    .filter(item => item.pattern.test(source))
    .map(item => item.key)
}

function isProcessCheckScript(relativePath = '') {
  return /^scripts\/process-.*-check\.mjs$/.test(normalizePath(relativePath))
}

async function listProcessCheckScripts(repoRoot) {
  const scriptsDir = path.join(repoRoot, 'scripts')
  const entries = await fs.readdir(scriptsDir, { withFileTypes: true })
  return entries
    .filter(entry => entry.isFile() && /^process-.*-check\.mjs$/.test(entry.name))
    .map(entry => `scripts/${entry.name}`)
    .sort()
}

export function classifyProcessCheckSource({
  relativePath = '',
  source = '',
  backlogWriteBoundaryGuarded = false,
} = {}) {
  const normalized = normalizePath(relativePath)
  if (!isProcessCheckScript(normalized)) {
    return {
      relativePath: normalized,
      classification: 'not_process_check',
      liveMutators: [],
      reportWrite: false,
      protected: true,
      reason: 'not a process-check script',
    }
  }

  const liveMutators = liveMutatorsForSource(source)
  const reportWrite = REPORT_WRITE_PATTERN.test(source)
  const legacyClassification = PROCESS_CHECK_READONLY_LEGACY_CLASSIFICATIONS[normalized] || null
  const hasLiveMutation = liveMutators.length > 0
  const hasGuard = hasProcessWriteGuard(source)
  const backlogOrOverlayOnly = liveMutators.every(key => ['backlogApi', 'currentSprintOverlay'].includes(key))

  if (!hasLiveMutation && reportWrite) {
    return {
      relativePath: normalized,
      classification: 'report_only',
      liveMutators,
      reportWrite,
      protected: true,
      reason: 'report artifact writer; not a live truth mutator',
    }
  }

  if (!hasLiveMutation) {
    return {
      relativePath: normalized,
      classification: 'read_only',
      liveMutators,
      reportWrite,
      protected: true,
      reason: 'no live mutation patterns detected',
    }
  }

  if (hasGuard || (backlogOrOverlayOnly && backlogWriteBoundaryGuarded)) {
    return {
      relativePath: normalized,
      classification: 'guarded_live_mutation',
      liveMutators,
      reportWrite,
      protected: true,
      reason: hasGuard
        ? 'script routes live mutation through explicit process write posture'
        : 'shared backlog/current-sprint write boundary blocks no-flag process-check mutation',
    }
  }

  if (legacyClassification) {
    return {
      relativePath: normalized,
      classification: legacyClassification,
      liveMutators,
      reportWrite,
      protected: true,
      reason: 'explicitly classified as historical closeout-only; not schedulable or current operational proof',
    }
  }

  return {
    relativePath: normalized,
    classification: 'unclassified_live_mutation',
    liveMutators,
    reportWrite,
    protected: false,
    reason: 'live mutation pattern in process-check script without guard or historical classification',
  }
}

export async function buildProcessCheckReadonlyModeScan({
  repoRoot = process.cwd(),
  backlogWriteBoundaryGuarded = false,
} = {}) {
  const scripts = await listProcessCheckScripts(repoRoot)
  const rows = []
  for (const relativePath of scripts) {
    const source = await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
    rows.push(classifyProcessCheckSource({
      relativePath,
      source,
      backlogWriteBoundaryGuarded,
    }))
  }

  const unclassified = rows.filter(row => row.classification === 'unclassified_live_mutation')
  const classificationCounts = rows.reduce((counts, row) => {
    counts[row.classification] = (counts[row.classification] || 0) + 1
    return counts
  }, {})

  return {
    ok: unclassified.length === 0,
    scriptCount: rows.length,
    classificationCounts,
    unclassified,
    rows,
  }
}

async function capture(operation) {
  try {
    return { ok: true, value: await operation(), error: null }
  } catch (error) {
    return {
      ok: false,
      code: error?.code || null,
      name: error?.name || null,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function buildProcessCheckReadonlyModeProof({ repoRoot = process.cwd() } = {}) {
  const unguardedFixture = classifyProcessCheckSource({
    relativePath: 'scripts/process-danger-check.mjs',
    source: `
      import { Pool } from 'pg'
      const pool = new Pool()
      await pool.query('UPDATE foundation_sprints SET updated_at = NOW()')
    `,
    backlogWriteBoundaryGuarded: true,
  })
  const guardedFixture = classifyProcessCheckSource({
    relativePath: 'scripts/process-safe-check.mjs',
    source: `
      import { PROCESS_CHECK_WRITE_FLAGS, assertProcessCheckWriteAllowed, isProcessCheckWriteRequested } from '../lib/process-write-guard.js'
      assertProcessCheckWriteAllowed({ argv: process.argv.slice(2), scriptPath: 'scripts/process-safe-check.mjs', operation: 'synthetic sprint update', allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.mutateSprint] })
      await pool.query('UPDATE foundation_sprints SET updated_at = NOW()')
    `,
    backlogWriteBoundaryGuarded: true,
  })
  const noFlagBlocked = await capture(() => {
    assertProcessCheckWriteAllowed({
      argv: ['--json'],
      scriptPath: 'scripts/process-danger-check.mjs',
      operation: 'synthetic backlog update',
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
    })
    return 'unexpected allowed'
  })
  const explicitAllowed = await capture(() => {
    assertProcessCheckWriteAllowed({
      argv: ['--json', '--close-card=true'],
      scriptPath: 'scripts/process-danger-check.mjs',
      operation: 'synthetic backlog update',
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
    })
    return 'allowed with explicit posture'
  })
  const scan = await buildProcessCheckReadonlyModeScan({
    repoRoot,
    backlogWriteBoundaryGuarded: true,
  })
  const ok = unguardedFixture.protected === false &&
    guardedFixture.protected === true &&
    noFlagBlocked.ok === false &&
    noFlagBlocked.code === 'PROCESS_CHECK_WRITE_BLOCKED' &&
    explicitAllowed.ok === true &&
    scan.ok === true

  return {
    ok,
    mode: 'process-check-readonly-mode-proof',
    unguardedFixture,
    guardedFixture,
    noFlagBlocked,
    explicitAllowed,
    scan: {
      ok: scan.ok,
      scriptCount: scan.scriptCount,
      classificationCounts: scan.classificationCounts,
      unclassified: scan.unclassified,
    },
  }
}
