import fs from 'node:fs/promises'
import path from 'node:path'

export const PROCESS_CHECK_REPORT_OUTPUT_POLICY_CARD_ID = 'PROCESS-CHECK-REPORT-OUTPUT-POLICY-001'
export const PROCESS_CHECK_REPORT_OUTPUT_POLICY_SCRIPT_PATH = 'scripts/process-check-report-output-policy-check.mjs'
export const PROCESS_CHECK_REPORT_OUTPUT_POLICY_PLAN_PATH = 'docs/process/process-check-report-output-policy-001-plan.md'

const PROCESS_CHECK_SCRIPT_RE = /^scripts\/process-.*-check\.mjs$/
const FILE_WRITE_RE = /\b(?:fs\.)?writeFile(?:Sync)?\s*\(/g
const REPORT_WRITE_GUARD_RE = /isProcessReportWriteRequested\s*\(|PROCESS_CHECK_WRITE_FLAGS\.writeReport|--write-report|--writeReport/
const PROCESS_WRITE_GUARD_RE = /assert(?:Current)?ProcessCheckWriteAllowed\s*\(/
const PROCESS_WRITE_POSTURE_RE = /PROCESS_CHECK_WRITE_FLAGS\.(?:apply|closeCard|mutateSprint)|--(?:apply|close-card|mutate-sprint)|isProcessCheckWriteRequested\s*\(/
const DEFAULT_NO_WRITE_RE = /--no-write|noWrite|no-write/
const DEFAULT_WRITE_IF_RE = /if\s*\(\s*!\s*(?:args\.)?noWrite\s*\)|if\s*\(\s*!\s*(?:noWrite|args\[['"]no-write['"])\s*\)/
const APPLY_GATED_RE = /if\s*\(\s*(?:args\.)?(?:apply|closeCard|closeCardRequested|closeSprint)\s*\)|--apply|--close-card/

function lineNumberForIndex(text, index) {
  if (!text || index < 0) return 1
  return String(text).slice(0, index).split(/\r?\n/).length
}

function firstLineOf(text, pattern) {
  const match = String(text || '').match(pattern)
  if (!match || match.index == null) return null
  return lineNumberForIndex(text, match.index)
}

function collectWriteLines(text = '') {
  const source = String(text || '')
  const lines = []
  for (const match of source.matchAll(FILE_WRITE_RE)) {
    lines.push(lineNumberForIndex(source, match.index || 0))
  }
  return Array.from(new Set(lines))
}

export function isProcessCheckReportOutputScript(relativePath = '') {
  return PROCESS_CHECK_SCRIPT_RE.test(String(relativePath || ''))
}

export function classifyProcessCheckReportOutputPolicy({
  relativePath = 'synthetic.mjs',
  text = '',
} = {}) {
  const source = String(text || '')
  const processCheck = isProcessCheckReportOutputScript(relativePath)
  const writeLines = collectWriteLines(source)
  const hasFileWrites = writeLines.length > 0

  if (!processCheck) {
    return {
      classification: 'not_process_check',
      protected: true,
      risk: false,
      relativePath,
      writeLines,
      reason: 'Only process-*-check.mjs scripts are governed by this report-output policy.',
    }
  }

  if (!hasFileWrites) {
    return {
      classification: 'no_file_write',
      protected: true,
      risk: false,
      relativePath,
      writeLines,
      reason: 'No direct fs.writeFile/fs.writeFileSync call was found.',
    }
  }

  const hasReportGuard = REPORT_WRITE_GUARD_RE.test(source)
  const hasProcessWriteGuard = PROCESS_WRITE_GUARD_RE.test(source)
  const hasProcessWritePosture = PROCESS_WRITE_POSTURE_RE.test(source)
  const hasDefaultNoWriteOptout = DEFAULT_NO_WRITE_RE.test(source) && DEFAULT_WRITE_IF_RE.test(source)
  const hasApplyGate = APPLY_GATED_RE.test(source)

  if (hasReportGuard) {
    return {
      classification: 'guarded_report_output',
      protected: true,
      risk: false,
      relativePath,
      writeLines,
      reason: 'Report artifact writes are behind the shared --write-report posture.',
    }
  }

  if (hasProcessWriteGuard && hasProcessWritePosture) {
    return {
      classification: 'guarded_process_write_posture',
      protected: true,
      risk: false,
      relativePath,
      writeLines,
      reason: 'Writes are covered by the shared process-check write guard and explicit apply/close/mutate posture.',
    }
  }

  if (hasDefaultNoWriteOptout) {
    return {
      classification: 'default_write_no_write_optout',
      protected: false,
      risk: true,
      relativePath,
      writeLines,
      reason: 'The command writes report artifacts by default and relies on --no-write as an opt-out.',
    }
  }

  if (hasApplyGate) {
    return {
      classification: 'legacy_apply_gated_without_shared_guard',
      protected: false,
      risk: true,
      relativePath,
      writeLines,
      reason: 'The command appears gated by apply/close flags but does not use the shared process-check write guard.',
    }
  }

  return {
    classification: 'unguarded_report_writer',
    protected: false,
    risk: true,
    relativePath,
    writeLines,
    reason: 'The process-check script writes files without an explicit report-output or shared write posture.',
  }
}

export function buildProcessCheckReportOutputPolicyFindingInput({
  relativePath = 'synthetic.mjs',
  text = '',
} = {}) {
  const classification = classifyProcessCheckReportOutputPolicy({ relativePath, text })
  return {
    ...classification,
    firstWriteLine: classification.writeLines?.[0] || firstLineOf(text, FILE_WRITE_RE) || null,
  }
}

export async function scanProcessCheckReportOutputPolicy({
  repoRoot = process.cwd(),
  scriptDir = 'scripts',
} = {}) {
  const absoluteScriptsDir = path.join(repoRoot, scriptDir)
  const entries = await fs.readdir(absoluteScriptsDir, { withFileTypes: true })
  const rows = []
  for (const entry of entries) {
    if (!entry.isFile() || !/^process-.*-check\.mjs$/.test(entry.name)) continue
    const relativePath = `${scriptDir}/${entry.name}`
    const text = await fs.readFile(path.join(repoRoot, relativePath), 'utf8')
    rows.push(classifyProcessCheckReportOutputPolicy({ relativePath, text }))
  }
  rows.sort((left, right) => left.relativePath.localeCompare(right.relativePath))
  const byClassification = rows.reduce((counts, row) => {
    counts[row.classification] = (counts[row.classification] || 0) + 1
    return counts
  }, {})
  const riskRows = rows.filter(row => row.risk)
  const protectedRows = rows.filter(row => row.protected && row.writeLines.length)
  return {
    totalProcessCheckScripts: rows.length,
    fileWriterCount: rows.filter(row => row.writeLines.length).length,
    riskCount: riskRows.length,
    protectedWriterCount: protectedRows.length,
    byClassification,
    riskRows,
    protectedRows,
    rows,
  }
}

export function buildSyntheticProcessCheckReportOutputPolicyProof() {
  const fixtures = {
    unguarded: classifyProcessCheckReportOutputPolicy({
      relativePath: 'scripts/process-report-check.mjs',
      text: `
        import fs from 'node:fs/promises'
        await fs.writeFile('docs/source-notes/run.md', '# generated')
      `,
    }),
    guardedReportOutput: classifyProcessCheckReportOutputPolicy({
      relativePath: 'scripts/process-report-check.mjs',
      text: `
        import fs from 'node:fs/promises'
        import { isProcessReportWriteRequested } from '../lib/process-write-guard.js'
        const writeReport = isProcessReportWriteRequested(process.argv.slice(2))
        if (writeReport) await fs.writeFile('docs/source-notes/run.md', '# generated')
      `,
    }),
    guardedProcessWrite: classifyProcessCheckReportOutputPolicy({
      relativePath: 'scripts/process-closeout-check.mjs',
      text: `
        import fs from 'node:fs/promises'
        import { PROCESS_CHECK_WRITE_FLAGS, assertProcessCheckWriteAllowed } from '../lib/process-write-guard.js'
        assertProcessCheckWriteAllowed({ argv: process.argv.slice(2), scriptPath: 'scripts/process-closeout-check.mjs', operation: 'write closeout report', allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard] })
        await fs.writeFile('docs/handoffs/closeout.md', '# generated')
      `,
    }),
    defaultNoWriteOptout: classifyProcessCheckReportOutputPolicy({
      relativePath: 'scripts/process-default-report-check.mjs',
      text: `
        import fs from 'node:fs/promises'
        const args = { noWrite: process.argv.includes('--no-write') }
        if (!args.noWrite) await fs.writeFile('docs/handoffs/run.md', '# generated')
      `,
    }),
    legacyApplyGate: classifyProcessCheckReportOutputPolicy({
      relativePath: 'scripts/process-legacy-apply-check.mjs',
      text: `
        import fs from 'node:fs/promises'
        const args = { apply: process.argv.includes('--apply') }
        if (args.apply) await fs.writeFile('docs/audits/run.md', '# generated')
      `,
    }),
  }

  const ok = fixtures.unguarded.risk === true &&
    fixtures.unguarded.classification === 'unguarded_report_writer' &&
    fixtures.guardedReportOutput.risk === false &&
    fixtures.guardedReportOutput.classification === 'guarded_report_output' &&
    fixtures.guardedProcessWrite.risk === false &&
    fixtures.guardedProcessWrite.classification === 'guarded_process_write_posture' &&
    fixtures.defaultNoWriteOptout.risk === true &&
    fixtures.defaultNoWriteOptout.classification === 'default_write_no_write_optout' &&
    fixtures.legacyApplyGate.risk === true &&
    fixtures.legacyApplyGate.classification === 'legacy_apply_gated_without_shared_guard'

  return {
    ok,
    mode: 'process-check-report-output-policy-synthetic-proof',
    fixtures,
  }
}
