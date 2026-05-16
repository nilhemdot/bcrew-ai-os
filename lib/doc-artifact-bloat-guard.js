import fs from 'node:fs/promises'
import path from 'node:path'

export const DOC_ARTIFACT_BLOAT_GUARD_CARD_ID = 'DOC-ARTIFACT-BLOAT-GUARD-001'
export const NIGHTLY_AUDIT_OUTPUT_BLOAT_GUARD_CARD_ID = 'NIGHTLY-AUDIT-OUTPUT-BLOAT-GUARD-001'
export const DOC_ARTIFACT_BLOAT_GUARD_CLOSEOUT_KEY = 'doc-artifact-bloat-guard-v1'
export const DOC_ARTIFACT_BLOAT_GUARD_SPRINT_ID = 'doc-artifact-bloat-guard-2026-05-16'
export const DOC_ARTIFACT_BLOAT_GUARD_PLAN_PATH = 'docs/process/doc-artifact-bloat-guard-001-plan.md'
export const DOC_ARTIFACT_BLOAT_GUARD_APPROVAL_PATH = 'docs/process/approvals/DOC-ARTIFACT-BLOAT-GUARD-001.json'
export const NIGHTLY_AUDIT_OUTPUT_BLOAT_GUARD_APPROVAL_PATH = 'docs/process/approvals/NIGHTLY-AUDIT-OUTPUT-BLOAT-GUARD-001.json'
export const DOC_ARTIFACT_BLOAT_GUARD_SCRIPT_PATH = 'scripts/process-doc-artifact-bloat-guard-check.mjs'

export const DOC_ARTIFACT_BLOAT_BUDGETS = {
  handoffMarkdownWarnLines: 1300,
  handoffMarkdownRiskLines: 1800,
  handoffMarkdownWarnBytes: 90_000,
  handoffMarkdownRiskBytes: 150_000,
  processMarkdownWarnLines: 900,
  processMarkdownRiskLines: 1300,
  approvalJsonWarnBytes: 20_000,
  approvalJsonRiskBytes: 50_000,
  nightlyMarkdownWarnLines: 1400,
  nightlyMarkdownRiskLines: 1800,
  nightlyJsonWarnBytes: 120_000,
  nightlyJsonRiskBytes: 250_000,
  systemHealthJsonWarnBytes: 120_000,
  systemHealthJsonRiskBytes: 250_000,
  handoffDirectoryWarnLines: 20_000,
  handoffDirectoryRiskLines: 35_000,
  handoffMonthlyWarnFileCount: 220,
  handoffMonthlyRiskFileCount: 320,
  hotNightlyReportsKeepDays: 7,
}

const ARTIFACT_PATHS = [
  { dir: 'docs/handoffs', extensions: ['.md', '.json'], className: 'handoff' },
  { dir: 'docs/process', extensions: ['.md'], className: 'process_doc' },
  { dir: 'docs/process/approvals', extensions: ['.json'], className: 'approval_json' },
  { dir: 'docs/audits', extensions: ['.md', '.json'], className: 'audit_artifact' },
]

function normalizePath(value) {
  return String(value || '').trim().replace(/\\/g, '/').replace(/^\.\//, '')
}

function toDate(value) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

function daysBetween(left, right) {
  return Math.max(0, Math.round((toDate(right).getTime() - toDate(left).getTime()) / 86_400_000))
}

function countLines(text = '') {
  const source = String(text || '')
  if (!source) return 0
  const lineBreaks = (source.match(/\n/g) || []).length
  return lineBreaks + (source.endsWith('\n') ? 0 : 1)
}

function severityRank(severity) {
  if (severity === 'P0') return 0
  if (severity === 'P1') return 1
  if (severity === 'P2') return 2
  return 3
}

function makeFinding({
  id,
  severity,
  status,
  title,
  detail,
  nextAction,
  path: artifactPath,
  className,
  budgetKey,
  value,
  budget,
} = {}) {
  return {
    id,
    severity,
    status,
    title,
    detail,
    nextAction,
    path: artifactPath,
    className,
    budgetKey,
    value,
    budget,
    autoFix: false,
    autoBacklogMutation: false,
  }
}

function classifyThreshold({ value, warn, risk }) {
  if (Number(value || 0) >= Number(risk || Infinity)) return 'risk'
  if (Number(value || 0) >= Number(warn || Infinity)) return 'watch'
  return 'healthy'
}

function fileBudgetForRecord(record, budgets = DOC_ARTIFACT_BLOAT_BUDGETS) {
  const normalized = normalizePath(record.path)
  const ext = path.extname(normalized)
  if (/^docs\/handoffs\/nightly-deep-audit-\d{4}-\d{2}-\d{2}\.md$/.test(normalized)) {
    return {
      lineWarn: budgets.nightlyMarkdownWarnLines,
      lineRisk: budgets.nightlyMarkdownRiskLines,
      byteWarn: budgets.handoffMarkdownWarnBytes,
      byteRisk: budgets.handoffMarkdownRiskBytes,
      label: 'nightly audit markdown report',
    }
  }
  if (/^docs\/handoffs\/nightly-deep-audit-\d{4}-\d{2}-\d{2}\.json$/.test(normalized)) {
    return {
      lineWarn: Infinity,
      lineRisk: Infinity,
      byteWarn: budgets.nightlyJsonWarnBytes,
      byteRisk: budgets.nightlyJsonRiskBytes,
      label: 'nightly audit json report',
    }
  }
  if (/^docs\/handoffs\/system-health-\d{4}-\d{2}-\d{2}\.json$/.test(normalized)) {
    return {
      lineWarn: Infinity,
      lineRisk: Infinity,
      byteWarn: budgets.systemHealthJsonWarnBytes,
      byteRisk: budgets.systemHealthJsonRiskBytes,
      label: 'system health json report',
    }
  }
  if (record.className === 'handoff' && ext === '.md') {
    return {
      lineWarn: budgets.handoffMarkdownWarnLines,
      lineRisk: budgets.handoffMarkdownRiskLines,
      byteWarn: budgets.handoffMarkdownWarnBytes,
      byteRisk: budgets.handoffMarkdownRiskBytes,
      label: 'handoff markdown',
    }
  }
  if (record.className === 'process_doc' && ext === '.md') {
    return {
      lineWarn: budgets.processMarkdownWarnLines,
      lineRisk: budgets.processMarkdownRiskLines,
      byteWarn: budgets.handoffMarkdownWarnBytes,
      byteRisk: budgets.handoffMarkdownRiskBytes,
      label: 'process markdown',
    }
  }
  if (record.className === 'approval_json' && ext === '.json') {
    return {
      lineWarn: Infinity,
      lineRisk: Infinity,
      byteWarn: budgets.approvalJsonWarnBytes,
      byteRisk: budgets.approvalJsonRiskBytes,
      label: 'approval json',
    }
  }
  return {
    lineWarn: Infinity,
    lineRisk: Infinity,
    byteWarn: Infinity,
    byteRisk: Infinity,
    label: record.className || 'artifact',
  }
}

function analyzeRecord(record, budgets = DOC_ARTIFACT_BLOAT_BUDGETS) {
  const artifactPath = normalizePath(record.path)
  const budget = fileBudgetForRecord(record, budgets)
  const findings = []
  const lineStatus = classifyThreshold({ value: record.lines, warn: budget.lineWarn, risk: budget.lineRisk })
  const byteStatus = classifyThreshold({ value: record.bytes, warn: budget.byteWarn, risk: budget.byteRisk })
  if (lineStatus !== 'healthy') {
    findings.push(makeFinding({
      id: `doc_artifact_lines_${artifactPath.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`,
      severity: lineStatus === 'risk' ? 'P0' : 'P1',
      status: lineStatus,
      title: `${budget.label} is too long`,
      detail: `${artifactPath} has ${record.lines} line(s); budget is ${budget.lineWarn}/${budget.lineRisk} warn/risk.`,
      nextAction: 'Summarize, split, or archive the artifact before treating the docs layer as healthy.',
      path: artifactPath,
      className: record.className,
      budgetKey: 'lines',
      value: record.lines,
      budget: { warn: budget.lineWarn, risk: budget.lineRisk },
    }))
  }
  if (byteStatus !== 'healthy') {
    findings.push(makeFinding({
      id: `doc_artifact_bytes_${artifactPath.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`,
      severity: byteStatus === 'risk' ? 'P0' : 'P1',
      status: byteStatus,
      title: `${budget.label} is too large`,
      detail: `${artifactPath} is ${record.bytes} byte(s); budget is ${budget.byteWarn}/${budget.byteRisk} warn/risk.`,
      nextAction: 'Make the artifact diff-only or move cold detail into an archived summary before it becomes a second monolith.',
      path: artifactPath,
      className: record.className,
      budgetKey: 'bytes',
      value: record.bytes,
      budget: { warn: budget.byteWarn, risk: budget.byteRisk },
    }))
  }
  return findings
}

export function evaluateDocArtifactBloatRecords({
  records = [],
  budgets = DOC_ARTIFACT_BLOAT_BUDGETS,
  now = new Date(),
} = {}) {
  const normalizedRecords = records.map(record => ({
    ...record,
    path: normalizePath(record.path),
    className: record.className || 'artifact',
    lines: Number(record.lines || 0),
    bytes: Number(record.bytes || 0),
  }))
  const fileFindings = normalizedRecords.flatMap(record => analyzeRecord(record, budgets))
  const handoffRecords = normalizedRecords.filter(record => record.path.startsWith('docs/handoffs/'))
  const handoffLineTotal = handoffRecords.reduce((sum, record) => sum + record.lines, 0)
  const recentHandoffCount = handoffRecords.filter(record => {
    if (!record.modifiedAt) return false
    return daysBetween(record.modifiedAt, now) <= 31
  }).length
  const directoryFindings = []
  const handoffLineStatus = classifyThreshold({
    value: handoffLineTotal,
    warn: budgets.handoffDirectoryWarnLines,
    risk: budgets.handoffDirectoryRiskLines,
  })
  if (handoffLineStatus !== 'healthy') {
    directoryFindings.push(makeFinding({
      id: 'doc_artifact_handoff_directory_line_budget',
      severity: handoffLineStatus === 'risk' ? 'P0' : 'P1',
      status: handoffLineStatus,
      title: 'docs/handoffs is growing past the hot-doc budget',
      detail: `docs/handoffs contains ${handoffLineTotal} line(s); budget is ${budgets.handoffDirectoryWarnLines}/${budgets.handoffDirectoryRiskLines} warn/risk.`,
      nextAction: 'Archive cold detail or replace repeated large reports with monthly summaries.',
      path: 'docs/handoffs',
      className: 'handoff_directory',
      budgetKey: 'totalLines',
      value: handoffLineTotal,
      budget: { warn: budgets.handoffDirectoryWarnLines, risk: budgets.handoffDirectoryRiskLines },
    }))
  }
  const monthlyFileStatus = classifyThreshold({
    value: recentHandoffCount,
    warn: budgets.handoffMonthlyWarnFileCount,
    risk: budgets.handoffMonthlyRiskFileCount,
  })
  if (monthlyFileStatus !== 'healthy') {
    directoryFindings.push(makeFinding({
      id: 'doc_artifact_handoff_monthly_file_budget',
      severity: monthlyFileStatus === 'risk' ? 'P0' : 'P1',
      status: monthlyFileStatus,
      title: 'docs/handoffs is accumulating too many hot files',
      detail: `docs/handoffs has ${recentHandoffCount} file(s) modified in the last 31 days; budget is ${budgets.handoffMonthlyWarnFileCount}/${budgets.handoffMonthlyRiskFileCount}.`,
      nextAction: 'Roll old handoffs into a monthly closeout summary and keep only current working handoffs hot.',
      path: 'docs/handoffs',
      className: 'handoff_directory',
      budgetKey: 'recentFileCount',
      value: recentHandoffCount,
      budget: { warn: budgets.handoffMonthlyWarnFileCount, risk: budgets.handoffMonthlyRiskFileCount },
    }))
  }

  const findings = [...fileFindings, ...directoryFindings].sort((left, right) => {
    const rank = severityRank(left.severity) - severityRank(right.severity)
    if (rank !== 0) return rank
    return String(left.path || '').localeCompare(String(right.path || ''))
  })
  const riskCount = findings.filter(finding => finding.status === 'risk').length
  const reviewCount = findings.filter(finding => finding.status === 'watch').length
  const nightlyRecords = normalizedRecords.filter(record => /docs\/handoffs\/(nightly-deep-audit|system-health)-\d{4}-\d{2}-\d{2}\.(md|json)$/.test(record.path))
  const status = riskCount ? 'risk' : reviewCount ? 'watch' : 'healthy'

  return {
    status,
    generatedAt: toDate(now).toISOString(),
    cardIds: [
      DOC_ARTIFACT_BLOAT_GUARD_CARD_ID,
      NIGHTLY_AUDIT_OUTPUT_BLOAT_GUARD_CARD_ID,
    ],
    closeoutKey: DOC_ARTIFACT_BLOAT_GUARD_CLOSEOUT_KEY,
    reportOnly: true,
    readOnly: true,
    autoFixes: false,
    writesBacklog: false,
    writesSourceSystems: false,
    budgets,
    summary: {
      artifactCount: normalizedRecords.length,
      handoffFileCount: handoffRecords.length,
      handoffLineTotal,
      recentHandoffFileCount: recentHandoffCount,
      nightlyArtifactCount: nightlyRecords.length,
      riskCount,
      reviewCount,
    },
    topArtifacts: [...normalizedRecords]
      .sort((left, right) => right.lines - left.lines || right.bytes - left.bytes)
      .slice(0, 12)
      .map(record => ({
        path: record.path,
        className: record.className,
        lines: record.lines,
        bytes: record.bytes,
      })),
    topFindings: findings.slice(0, 20),
    findings,
    plainEnglish: status === 'risk'
      ? 'Doc/report artifacts have red bloat findings. Do not let reports or handoffs become the next monolith.'
      : status === 'watch'
        ? 'Doc/report artifacts are usable but have yellow size findings to review.'
        : 'Doc/report artifacts are inside the current hot-doc budgets.',
  }
}

async function listFilesRecursive(repoRoot, relativeDir, extensions) {
  const absoluteDir = path.join(repoRoot, relativeDir)
  let entries = []
  try {
    entries = await fs.readdir(absoluteDir, { withFileTypes: true })
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    throw error
  }
  const files = []
  for (const entry of entries) {
    const relativePath = normalizePath(path.join(relativeDir, entry.name))
    const absolutePath = path.join(repoRoot, relativePath)
    if (entry.isDirectory()) {
      files.push(...await listFilesRecursive(repoRoot, relativePath, extensions))
    } else if (entry.isFile() && extensions.includes(path.extname(entry.name))) {
      files.push({ relativePath, absolutePath })
    }
  }
  return files
}

export async function collectDocArtifactRecords({
  repoRoot = process.cwd(),
} = {}) {
  const seen = new Set()
  const records = []
  for (const spec of ARTIFACT_PATHS) {
    const files = await listFilesRecursive(repoRoot, spec.dir, spec.extensions)
    for (const file of files) {
      if (seen.has(file.relativePath)) continue
      seen.add(file.relativePath)
      const stat = await fs.stat(file.absolutePath)
      const text = await fs.readFile(file.absolutePath, 'utf8')
      records.push({
        path: file.relativePath,
        className: spec.className,
        lines: countLines(text),
        bytes: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      })
    }
  }
  return records
}

export async function buildDocArtifactBloatSnapshot({
  repoRoot = process.cwd(),
  budgets = DOC_ARTIFACT_BLOAT_BUDGETS,
  now = new Date(),
} = {}) {
  const records = await collectDocArtifactRecords({ repoRoot })
  return evaluateDocArtifactBloatRecords({ records, budgets, now })
}

export function buildDocArtifactBloatGuardDogfoodProof() {
  const now = new Date('2026-05-16T12:00:00.000Z')
  const healthyRecords = [
    {
      path: 'docs/handoffs/nightly-deep-audit-2026-05-16.md',
      className: 'handoff',
      lines: 800,
      bytes: 60_000,
      modifiedAt: now.toISOString(),
    },
    {
      path: 'docs/handoffs/system-health-2026-05-16.json',
      className: 'handoff',
      lines: 1,
      bytes: 40_000,
      modifiedAt: now.toISOString(),
    },
  ]
  const bloatedRecords = [
    {
      path: 'docs/handoffs/nightly-deep-audit-2026-05-17.md',
      className: 'handoff',
      lines: 2200,
      bytes: 180_000,
      modifiedAt: now.toISOString(),
    },
    {
      path: 'docs/handoffs/nightly-deep-audit-2026-05-17.json',
      className: 'handoff',
      lines: 1,
      bytes: 300_000,
      modifiedAt: now.toISOString(),
    },
    {
      path: 'docs/process/giant-plan.md',
      className: 'process_doc',
      lines: 1500,
      bytes: 100_000,
      modifiedAt: now.toISOString(),
    },
  ]
  const healthy = evaluateDocArtifactBloatRecords({ records: healthyRecords, now })
  const bloated = evaluateDocArtifactBloatRecords({ records: bloatedRecords, now })
  const checks = [
    {
      ok: healthy.status === 'healthy' && healthy.summary.riskCount === 0,
      check: 'healthy diff-sized audit artifacts stay green',
      detail: healthy.plainEnglish,
    },
    {
      ok: bloated.status === 'risk' && bloated.findings.some(finding => finding.path.endsWith('nightly-deep-audit-2026-05-17.md') && finding.budgetKey === 'lines'),
      check: 'oversized nightly markdown report is red',
      detail: JSON.stringify(bloated.findings.filter(finding => finding.path.endsWith('.md')).slice(0, 2)),
    },
    {
      ok: bloated.findings.some(finding => finding.path.endsWith('nightly-deep-audit-2026-05-17.json') && finding.budgetKey === 'bytes'),
      check: 'oversized nightly json report is red',
      detail: JSON.stringify(bloated.findings.filter(finding => finding.path.endsWith('.json')).slice(0, 2)),
    },
    {
      ok: bloated.findings.some(finding => finding.path === 'docs/process/giant-plan.md' && finding.status === 'risk'),
      check: 'oversized process plan is red',
      detail: JSON.stringify(bloated.findings.filter(finding => finding.path === 'docs/process/giant-plan.md')),
    },
    {
      ok: bloated.reportOnly === true && bloated.autoFixes === false && bloated.writesBacklog === false,
      check: 'bloat guard is report-only and cannot mutate backlog or docs',
      detail: 'reportOnly=true autoFixes=false writesBacklog=false',
    },
  ]
  return {
    ok: checks.every(check => check.ok),
    checks,
    healthy,
    bloated,
    dogfoodInvariant: 'Oversized reports and process docs fail closed as red findings, while diff-sized reports stay green.',
  }
}
