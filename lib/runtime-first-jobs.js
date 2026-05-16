export const RUNTIME_FIRST_JOBS_CARD_ID = 'RUNTIME-FIRST-JOBS-001'
export const RUNTIME_FIRST_JOBS_SPRINT_ID = 'runtime-first-jobs-2026-05-16'
export const RUNTIME_FIRST_JOBS_CLOSEOUT_KEY = 'runtime-first-jobs-v1'
export const RUNTIME_FIRST_JOBS_PLAN_PATH = 'docs/process/runtime-first-jobs-001-plan.md'
export const RUNTIME_FIRST_JOBS_APPROVAL_PATH = 'docs/process/approvals/RUNTIME-FIRST-JOBS-001.json'
export const RUNTIME_FIRST_JOBS_SCRIPT_PATH = 'scripts/process-runtime-first-jobs-check.mjs'

export const RUNTIME_FIRST_SAFE_TARGET_KEYS = Object.freeze([
  'gmail-current-day',
  'missive-current-day',
])

export const RUNTIME_FIRST_SAFE_JOB_KEYS = Object.freeze([
  'gmail-sync-current',
  'missive-sync-current',
])

function includesAll(text = '', patterns = []) {
  return patterns.every(pattern => String(text || '').includes(pattern))
}

function indexBefore(text = '', beforePattern, afterPattern) {
  const source = String(text || '')
  const beforeIndex = source.indexOf(beforePattern)
  const afterIndex = source.indexOf(afterPattern)
  return beforeIndex >= 0 && afterIndex >= 0 && beforeIndex < afterIndex
}

function sourceStoreReturnsDelegate(source = '', delegateName) {
  return new RegExp(`return\\s*{[\\s\\S]*\\b${delegateName}\\b[\\s\\S]*}`, 'm').test(String(source || ''))
}

function dbExportsDelegate(source = '', delegateName) {
  return String(source || '').includes(`export const ${delegateName} = foundationSourceCrawlStore.${delegateName}`)
}

export function evaluateRuntimeFirstJobsContract({
  foundationDbSource = '',
  foundationSourceCrawlStoreSource = '',
  runExtractionTargetSource = '',
  foundationJobsSource = '',
} = {}) {
  const checks = [
    {
      key: 'source-crawl-store-lease-return',
      ok: sourceStoreReturnsDelegate(foundationSourceCrawlStoreSource, 'leaseSourceCrawlTarget'),
      detail: 'source-crawl store returns leaseSourceCrawlTarget',
    },
    {
      key: 'source-crawl-store-finish-return',
      ok: sourceStoreReturnsDelegate(foundationSourceCrawlStoreSource, 'finishSourceCrawlTargetRun'),
      detail: 'source-crawl store returns finishSourceCrawlTargetRun',
    },
    {
      key: 'foundation-db-lease-export',
      ok: dbExportsDelegate(foundationDbSource, 'leaseSourceCrawlTarget'),
      detail: 'foundation-db re-exports leaseSourceCrawlTarget',
    },
    {
      key: 'foundation-db-finish-export',
      ok: dbExportsDelegate(foundationDbSource, 'finishSourceCrawlTargetRun'),
      detail: 'foundation-db re-exports finishSourceCrawlTargetRun',
    },
    {
      key: 'target-runner-imports-delegates',
      ok: includesAll(runExtractionTargetSource, [
        'leaseSourceCrawlTarget',
        'finishSourceCrawlTargetRun',
        'getExtractionControlSnapshot',
      ]),
      detail: 'target runner imports source-crawl delegate surface',
    },
    {
      key: 'target-runner-normalizes-dry-run',
      ok: /replace\(\s*\/-\(\[a-z0-9\]\)\//.test(runExtractionTargetSource) ||
        runExtractionTargetSource.includes('replace(/-([a-z0-9])/g'),
      detail: 'target runner normalizes --dry-run to dryRun',
    },
    {
      key: 'dry-run-before-lease',
      ok: indexBefore(runExtractionTargetSource, 'if (dryRun)', 'const leasedTarget = await leaseSourceCrawlTarget'),
      detail: 'dry-run branch happens before source-crawl lease',
    },
    {
      key: 'current-sync-jobs-registered',
      ok: RUNTIME_FIRST_SAFE_JOB_KEYS.every(jobKey => foundationJobsSource.includes(`key: '${jobKey}'`)) &&
        RUNTIME_FIRST_SAFE_TARGET_KEYS.every(targetKey => foundationJobsSource.includes(`--target=${targetKey}`)) &&
        foundationJobsSource.includes("runtimeMode: 'scheduled'") &&
        foundationJobsSource.includes("budget: 'connector'"),
      detail: 'Gmail and Missive current-sync jobs remain governed scheduled extraction targets',
    },
  ]

  return {
    ok: checks.every(check => check.ok),
    checks,
    failed: checks.filter(check => !check.ok),
  }
}

export function buildRuntimeFirstJobsDogfoodProof(input = {}) {
  const repaired = evaluateRuntimeFirstJobsContract(input)
  const oldMissingDbExport = evaluateRuntimeFirstJobsContract({
    ...input,
    foundationDbSource: String(input.foundationDbSource || '')
      .replace(/export const leaseSourceCrawlTarget = foundationSourceCrawlStore\.leaseSourceCrawlTarget\n?/, '')
      .replace(/export const finishSourceCrawlTargetRun = foundationSourceCrawlStore\.finishSourceCrawlTargetRun\n?/, ''),
  })
  const oldDryRunParser = evaluateRuntimeFirstJobsContract({
    ...input,
    runExtractionTargetSource: String(input.runExtractionTargetSource || '').replace(
      "const normalizedKey = String(key || '').replace(/-([a-z0-9])/g, (_match, char) => char.toUpperCase())\n    result[normalizedKey] = value ?? true",
      'result[key] = value ?? true',
    ),
  })

  return {
    ok: repaired.ok === true &&
      oldMissingDbExport.ok === false &&
      oldDryRunParser.ok === false &&
      oldMissingDbExport.failed.some(check => check.key === 'foundation-db-finish-export') &&
      oldDryRunParser.failed.some(check => check.key === 'target-runner-normalizes-dry-run'),
    mode: 'runtime-first-jobs-dogfood',
    repaired,
    oldMissingDbExportRejected: oldMissingDbExport.ok === false,
    oldDryRunParserRejected: oldDryRunParser.ok === false,
    firstSafeTargets: RUNTIME_FIRST_SAFE_TARGET_KEYS,
    firstSafeJobs: RUNTIME_FIRST_SAFE_JOB_KEYS,
  }
}
