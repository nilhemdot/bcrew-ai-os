import fs from 'node:fs'
import path from 'node:path'

export const FILE_SIZE_ENGINEERING_STANDARD_CARD_ID = 'FILE-SIZE-ENGINEERING-STANDARD-001'
export const FILE_SIZE_ENGINEERING_STANDARD_CLOSEOUT_KEY = 'file-size-engineering-standard-v1'
export const FILE_SIZE_ENGINEERING_STANDARD_PLAN_PATH = 'docs/process/file-size-engineering-standard-001-plan.md'
export const FILE_SIZE_ENGINEERING_STANDARD_APPROVAL_PATH = 'docs/process/approvals/FILE-SIZE-ENGINEERING-STANDARD-001.json'
export const FILE_SIZE_ENGINEERING_STANDARD_SCRIPT_PATH = 'scripts/process-file-size-engineering-standard-check.mjs'

export const FILE_SIZE_STANDARD = Object.freeze({
  handwrittenModule: {
    preferredMaxLines: 1500,
    watchAboveLines: 1500,
    splitPlanRequiredAboveLines: 1500,
    dangerAboveLines: 10000,
  },
  generatedFile: {
    explicitBudgetRequired: true,
    defaultReviewAboveLines: 10000,
  },
  dataRecord: {
    explicitBudgetRequired: true,
    defaultReviewAboveLines: 3000,
  },
  reportArtifact: {
    explicitBudgetRequired: true,
    defaultReviewAboveLines: 3000,
  },
})

export const FILE_SIZE_STANDARD_WATCHED_PATHS = Object.freeze([
  'scripts/foundation-verify.mjs',
  'server.js',
  'lib/foundation-db.js',
  'public/foundation.js',
])

export const FILE_SIZE_FINDING_KEYS = Object.freeze({
  overBudgetSplitPlan: 'file_size_over_budget_split_plan',
  explicitArtifactBudget: 'file_size_explicit_artifact_budget',
  missingStandard: 'file_size_engineering_standard_missing',
})

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizePath(value) {
  return normalizeText(value).replace(/\\/g, '/').replace(/^\.\//, '')
}

function normalizeForSearch(value) {
  return normalizeText(value).replace(/\s+/g, ' ').toLowerCase()
}

function hasAny(text, patterns = []) {
  return patterns.some(pattern => pattern.test(text))
}

function countFileLines(filePath, repoRoot = process.cwd()) {
  try {
    const absolutePath = path.resolve(repoRoot, filePath)
    if (!absolutePath.startsWith(path.resolve(repoRoot))) return null
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) return null
    const source = fs.readFileSync(absolutePath, 'utf8')
    return source.split(/\r?\n/).length
  } catch {
    return null
  }
}

export function classifyFileSizeArtifact(filePath) {
  const normalized = normalizePath(filePath).toLowerCase()
  if (
    /(^|\/)(dist|build|coverage|generated|vendor)\//.test(normalized) ||
    /(?:^|\/)(package-lock|pnpm-lock|yarn\.lock)$/.test(normalized)
  ) {
    return 'generatedFile'
  }
  if (
    (
      /\.(json|jsonl|ndjson|csv|tsv)$/i.test(normalized) &&
      !/(^|\/)(package|tsconfig|jsconfig|eslint\.config|prettier\.config)\.json$/.test(normalized)
    ) ||
    /^data\//.test(normalized) ||
    /^docs\/process\/approvals\//.test(normalized)
  ) {
    return 'dataRecord'
  }
  if (
    /^docs\/handoffs\//.test(normalized) ||
    /^docs\/audits\//.test(normalized) ||
    /^reports\//.test(normalized)
  ) {
    return 'reportArtifact'
  }
  return 'handwrittenModule'
}

export function getFileSizeBudgetForPath(filePath) {
  return FILE_SIZE_STANDARD[classifyFileSizeArtifact(filePath)] || FILE_SIZE_STANDARD.handwrittenModule
}

export function buildFileSizeRows({
  filePaths = FILE_SIZE_STANDARD_WATCHED_PATHS,
  fileLineCounts = {},
  repoRoot = process.cwd(),
} = {}) {
  return Array.from(new Set((Array.isArray(filePaths) ? filePaths : [])
    .map(normalizePath)
    .filter(Boolean)))
    .map(filePath => {
      const artifactClass = classifyFileSizeArtifact(filePath)
      const budget = getFileSizeBudgetForPath(filePath)
      const supplied = Number(fileLineCounts[filePath])
      const lineCount = Number.isFinite(supplied) ? supplied : countFileLines(filePath, repoRoot)
      const knownLineCount = Number.isFinite(lineCount) ? lineCount : null
      const danger = artifactClass === 'handwrittenModule' &&
        knownLineCount !== null &&
        knownLineCount > budget.dangerAboveLines
      const watch = artifactClass === 'handwrittenModule' &&
        knownLineCount !== null &&
        knownLineCount > budget.watchAboveLines
      const explicitBudgetRequired = artifactClass !== 'handwrittenModule' && budget.explicitBudgetRequired === true
      return {
        filePath,
        artifactClass,
        lineCount: knownLineCount,
        status: danger ? 'risk' : watch || explicitBudgetRequired ? 'watch' : 'healthy',
        budget,
        overPreferredBudget: watch,
        danger,
        explicitBudgetRequired,
      }
    })
}

export function buildFoundationFileSizeStandardStatus({
  watchedPaths = FILE_SIZE_STANDARD_WATCHED_PATHS,
  changedFiles = [],
  fileLineCounts = {},
  repoRoot = process.cwd(),
  now = new Date(),
} = {}) {
  const rows = buildFileSizeRows({
    filePaths: changedFiles.length ? changedFiles : watchedPaths,
    fileLineCounts,
    repoRoot,
  })
  const riskRows = rows.filter(row => row.status === 'risk')
  const watchRows = rows.filter(row => row.status === 'watch')
  return {
    generatedAt: now.toISOString(),
    cardId: FILE_SIZE_ENGINEERING_STANDARD_CARD_ID,
    closeoutKey: FILE_SIZE_ENGINEERING_STANDARD_CLOSEOUT_KEY,
    reportOnly: true,
    readOnly: true,
    status: riskRows.length ? 'risk' : watchRows.length ? 'watch' : 'healthy',
    standards: FILE_SIZE_STANDARD,
    summary: {
      fileCount: rows.length,
      riskCount: riskRows.length,
      watchCount: watchRows.length,
      overPreferredCount: rows.filter(row => row.overPreferredBudget).length,
      dangerCount: rows.filter(row => row.danger).length,
      explicitBudgetRequiredCount: rows.filter(row => row.explicitBudgetRequired).length,
    },
    rows,
    topFindings: [...riskRows, ...watchRows].slice(0, 12).map(row => ({
      id: `file_size_${row.filePath.replace(/[^a-z0-9]+/gi, '_')}`,
      severity: row.status === 'risk' ? 'P0' : 'P1',
      status: row.status,
      title: `${row.filePath} is ${row.status === 'risk' ? 'over danger budget' : 'over preferred budget'}`,
      detail: row.artifactClass === 'handwrittenModule'
        ? `${row.filePath} has ${row.lineCount ?? 'unknown'} lines; preferred hand-written module budget is ${FILE_SIZE_STANDARD.handwrittenModule.preferredMaxLines} and red/danger starts above ${FILE_SIZE_STANDARD.handwrittenModule.dangerAboveLines}.`
        : `${row.filePath} is a ${row.artifactClass} and needs an explicit file-size budget.`,
      nextAction: row.status === 'risk'
        ? 'Split or route this file before treating Foundation file-size health as green.'
        : 'Keep changes as no-new-responsibility wrappers or include a domain split plan.',
      filePath: row.filePath,
      lineCount: row.lineCount,
    })),
    plainEnglish: riskRows.length
      ? `${riskRows.length} watched file-size surface(s) are red.`
      : watchRows.length
        ? `${watchRows.length} watched file-size surface(s) are above the preferred budget.`
        : 'Watched file-size surfaces are inside the preferred hand-written module budget.',
  }
}

function hasSplitPlan(searchText) {
  return hasAny(searchText, [
    /\bsplit plan\b/,
    /\bsplit\/extraction\b/,
    /\bextract(?:ion)?\b[^.]{0,160}\b(module|file|boundary)\b/,
    /\bnew module\b/,
    /\bmodule boundary\b/,
    /\bthin wrapper\b/,
    /\bno new responsibility\b/,
    /\bdo not add[^.]{0,160}\b(monolith|large file|over-budget file)\b/,
  ])
}

function hasExplicitArtifactBudget(searchText) {
  return hasAny(searchText, [
    /\bexplicit (?:file-size|size|line) budget\b/,
    /\bgenerated (?:file|artifact)[^.]{0,120}\bbudget\b/,
    /\bdata (?:record|file|artifact)[^.]{0,120}\bbudget\b/,
    /\breport artifact[^.]{0,120}\bbudget\b/,
    /\b(?:json|csv|report|handoff)[^.]{0,120}\bunder\s+\d+\s*(?:lines?|kb|mb)\b/,
  ])
}

function makeFinding(key, detail, severity = 'critical', metadata = {}) {
  return { key, detail, severity, metadata }
}

export function evaluatePlanFileSizeStandard({
  planText,
  changedFiles = [],
  fileLineCounts = {},
  repoRoot = process.cwd(),
} = {}) {
  const searchText = normalizeForSearch(planText)
  const rows = buildFileSizeRows({
    filePaths: changedFiles,
    fileLineCounts,
    repoRoot,
  })
  const splitPlan = hasSplitPlan(searchText)
  const explicitArtifactBudget = hasExplicitArtifactBudget(searchText)
  const findings = []
  const overBudgetHandwritten = rows.filter(row =>
    row.artifactClass === 'handwrittenModule' &&
    row.lineCount !== null &&
    row.lineCount > FILE_SIZE_STANDARD.handwrittenModule.splitPlanRequiredAboveLines
  )
  if (overBudgetHandwritten.length && !splitPlan) {
    findings.push(makeFinding(
      FILE_SIZE_FINDING_KEYS.overBudgetSplitPlan,
      `Plans touching hand-written files above ${FILE_SIZE_STANDARD.handwrittenModule.preferredMaxLines} lines must include a split/no-new-responsibility plan.`,
      'critical',
      { files: overBudgetHandwritten.map(row => ({ filePath: row.filePath, lineCount: row.lineCount })) },
    ))
  }

  const artifactBudgetRows = rows.filter(row => row.explicitBudgetRequired)
  if (artifactBudgetRows.length && !explicitArtifactBudget) {
    findings.push(makeFinding(
      FILE_SIZE_FINDING_KEYS.explicitArtifactBudget,
      'Generated files, data records, and report artifacts need separate explicit file-size budgets before they grow.',
      'critical',
      { files: artifactBudgetRows.map(row => ({ filePath: row.filePath, artifactClass: row.artifactClass })) },
    ))
  }

  return {
    ok: findings.length === 0,
    findings,
    rows,
    splitPlan,
    explicitArtifactBudget,
  }
}

export function validateFoundationFileSizeStandardConfig() {
  const checks = [
    {
      ok: FILE_SIZE_STANDARD.handwrittenModule.preferredMaxLines === 1500,
      check: 'preferred hand-written module budget is 1500 lines',
    },
    {
      ok: FILE_SIZE_STANDARD.handwrittenModule.watchAboveLines === 1500,
      check: 'watch threshold starts above 1500 lines',
    },
    {
      ok: FILE_SIZE_STANDARD.handwrittenModule.dangerAboveLines === 10000,
      check: 'red/danger threshold starts above 10000 lines',
    },
    {
      ok: FILE_SIZE_STANDARD.generatedFile.explicitBudgetRequired === true &&
        FILE_SIZE_STANDARD.dataRecord.explicitBudgetRequired === true &&
        FILE_SIZE_STANDARD.reportArtifact.explicitBudgetRequired === true,
      check: 'generated/data/report artifacts require explicit budgets',
    },
  ]
  return {
    ok: checks.every(check => check.ok),
    checks,
  }
}

export function buildFoundationFileSizeShipGateStatus(options = {}) {
  const config = validateFoundationFileSizeStandardConfig()
  const surface = buildFoundationFileSizeStandardStatus(options)
  const findings = [
    ...config.checks.filter(check => !check.ok).map(check => ({
      check: FILE_SIZE_FINDING_KEYS.missingStandard,
      detail: check.check,
      cardId: FILE_SIZE_ENGINEERING_STANDARD_CARD_ID,
    })),
    ...surface.rows.filter(row => row.danger).map(row => ({
      check: 'file-size danger budget',
      detail: `${row.filePath} has ${row.lineCount} lines; danger starts above ${FILE_SIZE_STANDARD.handwrittenModule.dangerAboveLines}.`,
      cardId: FILE_SIZE_ENGINEERING_STANDARD_CARD_ID,
    })),
  ]
  return {
    ok: findings.length === 0,
    status: findings.length ? 'blocked' : 'healthy',
    config,
    surface,
    findings,
  }
}

export function buildFoundationFileSizeStandardDogfoodProof() {
  const weakPlan = `
# DOGFOOD-FILE-SIZE-001 Plan

## What
Add new behavior directly to an existing utility.

## Why
Steve needs this change in the Foundation workflow.

## Acceptance Criteria
- The behavior exists.

## Definition Of Done
- The code is changed.

## Details
Keep it simple in the existing file.

## Risks
Repair path is revise.

## Tests
Run npm run process:file-size-engineering-standard-check.
`
  const strongPlan = `${weakPlan}

Split plan: keep the touched over-budget file as a thin wrapper with no new responsibility, and extract the behavior to a new domain module. Explicit file-size budget: generated files under 10000 lines, data records under 3000 lines, and report artifacts under 3000 lines.
`
  const overBudgetNoSplit = evaluatePlanFileSizeStandard({
    planText: weakPlan,
    changedFiles: ['lib/medium-foundation-module.js'],
    fileLineCounts: { 'lib/medium-foundation-module.js': 1801 },
  })
  const overBudgetWithSplit = evaluatePlanFileSizeStandard({
    planText: strongPlan,
    changedFiles: ['lib/medium-foundation-module.js'],
    fileLineCounts: { 'lib/medium-foundation-module.js': 1801 },
  })
  const reportArtifactNoBudget = evaluatePlanFileSizeStandard({
    planText: weakPlan,
    changedFiles: ['docs/handoffs/2026-05-17-large-report.json'],
    fileLineCounts: { 'docs/handoffs/2026-05-17-large-report.json': 200 },
  })
  const reportArtifactWithBudget = evaluatePlanFileSizeStandard({
    planText: strongPlan,
    changedFiles: ['docs/handoffs/2026-05-17-large-report.json'],
    fileLineCounts: { 'docs/handoffs/2026-05-17-large-report.json': 200 },
  })
  const systemHealthRisk = buildFoundationFileSizeStandardStatus({
    watchedPaths: ['lib/red-danger-module.js'],
    fileLineCounts: { 'lib/red-danger-module.js': 10001 },
  })
  const shipGateDanger = buildFoundationFileSizeShipGateStatus({
    watchedPaths: ['lib/red-danger-module.js'],
    fileLineCounts: { 'lib/red-danger-module.js': 10001 },
  })
  const config = validateFoundationFileSizeStandardConfig()

  return {
    ok: config.ok === true &&
      overBudgetNoSplit.ok === false &&
      overBudgetNoSplit.findings.some(finding => finding.key === FILE_SIZE_FINDING_KEYS.overBudgetSplitPlan) &&
      overBudgetWithSplit.ok === true &&
      reportArtifactNoBudget.ok === false &&
      reportArtifactNoBudget.findings.some(finding => finding.key === FILE_SIZE_FINDING_KEYS.explicitArtifactBudget) &&
      reportArtifactWithBudget.ok === true &&
      systemHealthRisk.status === 'risk' &&
      systemHealthRisk.topFindings.some(finding => finding.status === 'risk') &&
      shipGateDanger.ok === false,
    config,
    overBudgetNoSplit,
    overBudgetWithSplit,
    reportArtifactNoBudget,
    reportArtifactWithBudget,
    systemHealthRisk,
    shipGateDanger,
    dogfoodInvariant: 'Synthetic over-budget hand-written files without split plans revise, report artifacts without explicit budgets revise, red/danger file-size rows surface in System Health, and ship preflight blocks danger-budget violations.',
  }
}
