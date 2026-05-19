import fs from 'node:fs'
import path from 'node:path'

export const FILE_SIZE_ENGINEERING_STANDARD_CARD_ID = 'FILE-SIZE-ENGINEERING-STANDARD-001'
export const FILE_SIZE_ENGINEERING_STANDARD_CLOSEOUT_KEY = 'file-size-engineering-standard-v1'
export const FILE_SIZE_ENGINEERING_STANDARD_PLAN_PATH = 'docs/process/file-size-engineering-standard-001-plan.md'
export const FILE_SIZE_ENGINEERING_STANDARD_APPROVAL_PATH = 'docs/process/approvals/FILE-SIZE-ENGINEERING-STANDARD-001.json'
export const FILE_SIZE_ENGINEERING_STANDARD_SCRIPT_PATH = 'scripts/process-file-size-engineering-standard-check.mjs'
export const FILE_SIZE_WATCH_CLASSIFIER_CARD_ID = 'FOUNDATION-FILE-SIZE-WATCH-CLASSIFIER-001'
export const FILE_SIZE_WATCH_CLASSIFIER_CLOSEOUT_KEY = 'foundation-file-size-watch-classifier-v1'
export const FILE_SIZE_WATCH_CLASSIFIER_PLAN_PATH = 'docs/process/foundation-file-size-watch-classifier-001-plan.md'
export const FILE_SIZE_WATCH_CLASSIFIER_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-FILE-SIZE-WATCH-CLASSIFIER-001.json'
export const FILE_SIZE_WATCH_CLASSIFIER_SCRIPT_PATH = 'scripts/process-foundation-file-size-watch-classifier-check.mjs'

export const FILE_SIZE_STANDARD = Object.freeze({
  handwrittenModule: {
    preferredMaxLines: 1500,
    watchAboveLines: 1500,
    splitPlanRequiredAboveLines: 1500,
    dispositionPlanRequiredAboveLines: 3000,
    splitNowAboveLines: 5000,
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
  unmanagedWatch: 'file_size_unmanaged_watch',
  staleWatch: 'file_size_stale_watch',
  splitNowRequired: 'file_size_split_now_required',
})

export const FILE_SIZE_WATCH_DISPOSITIONS = Object.freeze({
  'scripts/foundation-verify.mjs': Object.freeze({
    owner: 'Foundation Verifier',
    reason: 'Root verifier is a legacy orchestration surface. This card delegated progression blocker logic and leaves the root as wrapper/orchestration only.',
    threshold: 'Blocks at or above 5000 lines, or whenever a card adds verifier-domain behavior directly instead of delegating to a module.',
    nextTrigger: 'Split another verifier domain before the root reaches 5000 lines, before the review date expires, or before adding new check logic directly to the root script.',
    nextAction: 'Keep extracting verifier domains into lib/foundation-verifier-* modules; add only import/wiring to scripts/foundation-verify.mjs.',
    blockingAboveLines: 5000,
    reviewAfter: '2026-06-02',
    disposition: 'split_started_wrapper_only',
  }),
  'public/foundation.js': Object.freeze({
    owner: 'Foundation Frontend',
    reason: 'Frontend root is near the 3000-line planning threshold after prior renderer splits; remaining responsibility is shell/router wiring.',
    threshold: 'Blocks once the file reaches 3000 lines or accepts new renderer/domain behavior without extracting a renderer module.',
    nextTrigger: 'Extract another renderer slice before crossing 3000 lines or before adding feature-specific rendering behavior.',
    nextAction: 'Keep public/foundation.js as shell wiring; move new UI behavior into public/foundation-*-renderers.js modules.',
    blockingAboveLines: 3000,
    reviewAfter: '2026-06-02',
    disposition: 'managed_near_3k_shell',
  }),
  'lib/foundation-db.js': Object.freeze({
    owner: 'Foundation Data',
    reason: 'Database root is central infrastructure under the 3000-line planning threshold after schema/seed/store splits.',
    threshold: 'Blocks once the file reaches 3000 lines or receives new table/domain ownership without a store module split.',
    nextTrigger: 'Extract a store/domain module before crossing 3000 lines or before adding a new DB responsibility.',
    nextAction: 'Keep lib/foundation-db.js as connection/orchestration exports; route new domains into focused store modules.',
    blockingAboveLines: 3000,
    reviewAfter: '2026-06-02',
    disposition: 'managed_core_store_shell',
  }),
  'server.js': Object.freeze({
    owner: 'Foundation Runtime',
    reason: 'Server root is central route mounting and runtime wiring under the 3000-line planning threshold after route-module splits.',
    threshold: 'Blocks once the file reaches 3000 lines or accepts new route/domain behavior outside a route module.',
    nextTrigger: 'Extract route/domain behavior before crossing 3000 lines or before adding a new app surface directly to server.js.',
    nextAction: 'Keep server.js as thin route mounting/runtime wiring; implement route behavior in lib/*-routes.js modules.',
    blockingAboveLines: 3000,
    reviewAfter: '2026-06-02',
    disposition: 'managed_route_mount_shell',
  }),
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

function getFileSizeWatchDisposition(filePath) {
  return FILE_SIZE_WATCH_DISPOSITIONS[normalizePath(filePath)] || null
}

function dispositionHasRequiredFields(disposition = {}) {
  const row = disposition && typeof disposition === 'object' ? disposition : {}
  return Boolean(
    normalizeText(row.owner) &&
    normalizeText(row.reason) &&
    normalizeText(row.threshold) &&
    normalizeText(row.nextTrigger) &&
    normalizeText(row.nextAction) &&
    normalizeText(row.reviewAfter)
  )
}

function dispositionIsStale(disposition = {}, now = new Date()) {
  const reviewAfter = normalizeText(disposition.reviewAfter)
  if (!reviewAfter) return true
  const reviewDate = new Date(`${reviewAfter}T23:59:59.999Z`)
  const current = now instanceof Date ? now : new Date(now)
  if (Number.isNaN(reviewDate.getTime()) || Number.isNaN(current.getTime())) return true
  return current.getTime() > reviewDate.getTime()
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
  now = new Date(),
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
      const disposition = getFileSizeWatchDisposition(filePath)
      const hasDisposition = dispositionHasRequiredFields(disposition)
      const staleDisposition = hasDisposition ? dispositionIsStale(disposition, now) : false
      const blockingAboveLines = Number(disposition?.blockingAboveLines || 0)
      const blockedByThreshold = artifactClass === 'handwrittenModule' &&
        knownLineCount !== null &&
        blockingAboveLines > 0 &&
        knownLineCount >= blockingAboveLines
      const danger = artifactClass === 'handwrittenModule' &&
        knownLineCount !== null &&
        knownLineCount > budget.dangerAboveLines
      const splitNowRequired = artifactClass === 'handwrittenModule' &&
        knownLineCount !== null &&
        knownLineCount >= budget.splitNowAboveLines
      const watch = artifactClass === 'handwrittenModule' &&
        knownLineCount !== null &&
        knownLineCount > budget.watchAboveLines
      const explicitBudgetRequired = artifactClass !== 'handwrittenModule' && budget.explicitBudgetRequired === true
      const unmanagedWatch = watch && !hasDisposition && !splitNowRequired && !danger
      const managedWatch = watch && hasDisposition && !staleDisposition && !blockedByThreshold && !splitNowRequired && !danger
      const blockingWatch = watch && hasDisposition && (staleDisposition || blockedByThreshold) && !splitNowRequired && !danger
      const status = danger || splitNowRequired
        ? 'risk'
        : blockingWatch || unmanagedWatch || explicitBudgetRequired
          ? 'watch'
          : managedWatch
            ? 'managed_watch'
            : 'healthy'
      return {
        filePath,
        artifactClass,
        lineCount: knownLineCount,
        status,
        budget,
        overPreferredBudget: watch,
        danger,
        splitNowRequired,
        explicitBudgetRequired,
        disposition: disposition ? {
          owner: disposition.owner,
          reason: disposition.reason,
          threshold: disposition.threshold,
          nextTrigger: disposition.nextTrigger,
          nextAction: disposition.nextAction,
          reviewAfter: disposition.reviewAfter,
          disposition: disposition.disposition,
          blockingAboveLines: disposition.blockingAboveLines,
        } : null,
        managedWatch,
        unmanagedWatch,
        staleDisposition,
        blockingWatch,
        blockedByThreshold,
        blocksCurrentSprint: status === 'risk' || blockingWatch || unmanagedWatch,
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
    now,
  })
  const riskRows = rows.filter(row => row.status === 'risk')
  const watchRows = rows.filter(row => row.status === 'watch')
  const managedWatchRows = rows.filter(row => row.status === 'managed_watch')
  const blockingWatchRows = watchRows.filter(row => row.blocksCurrentSprint)
  const activeFindingRows = [...riskRows, ...watchRows]
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
      managedWatchCount: managedWatchRows.length,
      unmanagedWatchCount: rows.filter(row => row.unmanagedWatch).length,
      blockingWatchCount: blockingWatchRows.length,
      staleWatchCount: rows.filter(row => row.staleDisposition).length,
      overPreferredCount: rows.filter(row => row.overPreferredBudget).length,
      dangerCount: rows.filter(row => row.danger).length,
      splitNowRequiredCount: rows.filter(row => row.splitNowRequired).length,
      explicitBudgetRequiredCount: rows.filter(row => row.explicitBudgetRequired).length,
    },
    rows,
    managedFindings: managedWatchRows.slice(0, 12).map(row => ({
      id: `file_size_managed_${row.filePath.replace(/[^a-z0-9]+/gi, '_')}`,
      severity: 'P2',
      status: 'managed_watch',
      title: `${row.filePath} has a managed file-size watch disposition`,
      detail: `${row.filePath} has ${row.lineCount ?? 'unknown'} lines; ${row.disposition?.threshold || 'threshold missing'}`,
      nextAction: row.disposition?.nextAction || 'Keep owner, threshold, and next trigger current.',
      owner: row.disposition?.owner,
      threshold: row.disposition?.threshold,
      nextTrigger: row.disposition?.nextTrigger,
      filePath: row.filePath,
      lineCount: row.lineCount,
      blocksCurrentSprint: false,
    })),
    topFindings: activeFindingRows.slice(0, 12).map(row => ({
      id: `file_size_${row.filePath.replace(/[^a-z0-9]+/gi, '_')}`,
      severity: row.status === 'risk' ? 'P0' : 'P1',
      status: row.status,
      title: `${row.filePath} is ${row.status === 'risk' ? 'over active split/risk budget' : 'unmanaged or blocking file-size watch'}`,
      detail: row.artifactClass === 'handwrittenModule'
        ? `${row.filePath} has ${row.lineCount ?? 'unknown'} lines; preferred hand-written module budget is ${FILE_SIZE_STANDARD.handwrittenModule.preferredMaxLines}, plan threshold starts at ${FILE_SIZE_STANDARD.handwrittenModule.dispositionPlanRequiredAboveLines}, split-now starts at ${FILE_SIZE_STANDARD.handwrittenModule.splitNowAboveLines}, and danger starts above ${FILE_SIZE_STANDARD.handwrittenModule.dangerAboveLines}.`
        : `${row.filePath} is a ${row.artifactClass} and needs an explicit file-size budget.`,
      nextAction: row.status === 'risk'
        ? 'Split or route this file before treating Foundation file-size health as green.'
        : 'Add owner/reason/threshold/next trigger or split the file before normal progression.',
      filePath: row.filePath,
      lineCount: row.lineCount,
      owner: row.disposition?.owner || null,
      threshold: row.disposition?.threshold || null,
      nextTrigger: row.disposition?.nextTrigger || null,
      blocksCurrentSprint: row.blocksCurrentSprint,
    })),
    plainEnglish: riskRows.length
      ? `${riskRows.length} watched file-size surface(s) are red.`
      : watchRows.length
        ? `${watchRows.length} watched file-size surface(s) are unmanaged, stale, or over their blocking threshold.`
        : managedWatchRows.length
          ? `${managedWatchRows.length} file-size watch surface(s) are managed with owner, threshold, next trigger, and automatic stale escalation.`
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
      ok: FILE_SIZE_STANDARD.handwrittenModule.dispositionPlanRequiredAboveLines === 3000,
      check: '3k threshold requires explicit disposition plan',
    },
    {
      ok: FILE_SIZE_STANDARD.handwrittenModule.splitNowAboveLines === 5000,
      check: '5k threshold requires split-now or explicit exception',
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
    ...surface.rows.filter(row => row.status === 'risk').map(row => ({
      check: row.danger ? 'file-size danger budget' : FILE_SIZE_FINDING_KEYS.splitNowRequired,
      detail: row.danger
        ? `${row.filePath} has ${row.lineCount} lines; danger starts above ${FILE_SIZE_STANDARD.handwrittenModule.dangerAboveLines}.`
        : `${row.filePath} has ${row.lineCount} lines; split-now starts at ${FILE_SIZE_STANDARD.handwrittenModule.splitNowAboveLines}.`,
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
  const syntheticUnmanagedWatch = buildFoundationFileSizeStandardStatus({
    watchedPaths: ['lib/unmanaged-watch-module.js'],
    fileLineCounts: { 'lib/unmanaged-watch-module.js': 1600 },
  })
  const syntheticSplitNowRisk = buildFoundationFileSizeStandardStatus({
    watchedPaths: ['lib/split-now-module.js'],
    fileLineCounts: { 'lib/split-now-module.js': 5000 },
  })
  const syntheticManagedWatch = buildFoundationFileSizeStandardStatus({
    watchedPaths: ['server.js'],
    fileLineCounts: { 'server.js': 2023 },
    now: new Date('2026-05-20T00:00:00.000Z'),
  })
  const syntheticStaleWatch = buildFoundationFileSizeStandardStatus({
    watchedPaths: ['server.js'],
    fileLineCounts: { 'server.js': 2023 },
    now: new Date('2026-06-03T00:00:00.000Z'),
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
      syntheticUnmanagedWatch.status === 'watch' &&
      syntheticUnmanagedWatch.summary.unmanagedWatchCount === 1 &&
      syntheticSplitNowRisk.status === 'risk' &&
      syntheticSplitNowRisk.summary.splitNowRequiredCount === 1 &&
      syntheticManagedWatch.status === 'healthy' &&
      syntheticManagedWatch.summary.managedWatchCount === 1 &&
      syntheticManagedWatch.summary.watchCount === 0 &&
      syntheticStaleWatch.status === 'watch' &&
      syntheticStaleWatch.summary.staleWatchCount === 1 &&
      shipGateDanger.ok === false,
    config,
    overBudgetNoSplit,
    overBudgetWithSplit,
    reportArtifactNoBudget,
    reportArtifactWithBudget,
    systemHealthRisk,
    syntheticUnmanagedWatch,
    syntheticSplitNowRisk,
    syntheticManagedWatch,
    syntheticStaleWatch,
    shipGateDanger,
    dogfoodInvariant: 'Synthetic over-budget hand-written files without split plans revise, report artifacts without explicit budgets revise, unmanaged/stale/split-now file-size rows surface as active health debt, managed watch rows stay visible but non-blocking, and ship preflight blocks danger-budget violations.',
  }
}
