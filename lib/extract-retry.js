import {
  EXTRACTION_RETRY_FAILED_TARGETS,
  buildExtractionNextSafeCommand,
} from './extraction-run-hardening.js'
import {
  EXTRACTION_RETRY_FAILED_TARGETS as EXECUTION_RETRY_FAILED_TARGETS,
  buildExtractionRetryFailedCommand,
  targetSupportsRetryExecution,
} from './extraction-run-hardening-execution.js'

export const EXTRACT_RETRY_CARD_ID = 'EXTRACT-RETRY-001'
export const EXTRACT_RETRY_SPRINT_ID = 'extract-retry-2026-05-16'
export const EXTRACT_RETRY_CLOSEOUT_KEY = 'extract-retry-v1'
export const EXTRACT_RETRY_PLAN_PATH = 'docs/process/extract-retry-001-plan.md'
export const EXTRACT_RETRY_APPROVAL_PATH = 'docs/process/approvals/EXTRACT-RETRY-001.json'
export const EXTRACT_RETRY_SCRIPT_PATH = 'scripts/process-extract-retry-check.mjs'
export const EXTRACT_RETRY_HANDOFF_PATH = 'docs/handoffs/2026-05-16-extract-retry-closeout.md'

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

function summary(checks) {
  return {
    total: checks.length,
    passed: checks.filter(check => check.ok).length,
    failed: checks.filter(check => !check.ok).length,
  }
}

function includesAll(source = '', patterns = []) {
  return patterns.every(pattern => String(source || '').includes(pattern))
}

function listMatches(left = [], right = []) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort())
}

export function buildExtractRetrySupportMatrix() {
  const supportedTarget = 'meetings-current-day'
  const unsupportedTargets = [
    'drive-content-extract-backfill',
    'video-content-extract-backfill',
    'email-attachments-backfill',
  ]
  return {
    supportedTarget,
    unsupportedTargets,
    supported: EXTRACTION_RETRY_FAILED_TARGETS.map(targetKey => ({
      targetKey,
      nextSafeCommand: buildExtractionNextSafeCommand({ targetKey }, { retryEligibleItems: 1 }),
      executionCommand: buildExtractionRetryFailedCommand({ targetKey, actor: 'extract-retry-proof' }),
      supportedByExecution: targetSupportsRetryExecution(targetKey),
    })),
    unsupported: unsupportedTargets.map(targetKey => ({
      targetKey,
      nextSafeCommand: buildExtractionNextSafeCommand({ targetKey }, { retryEligibleItems: 1 }),
      executionCommand: buildExtractionRetryFailedCommand({ targetKey, actor: 'extract-retry-proof' }),
      supportedByExecution: targetSupportsRetryExecution(targetKey),
    })),
  }
}

export function buildExtractRetryDogfoodProof() {
  const matrix = buildExtractRetrySupportMatrix()
  const supported = matrix.supported.find(row => row.targetKey === matrix.supportedTarget)
  const unsupportedRows = matrix.unsupported
  const unsupportedTargetsBlocked = unsupportedRows.every(row =>
    row.supportedByExecution === false &&
      row.executionCommand.ok === false &&
      /target-specific failed-item retry runner/.test(row.executionCommand.blockedReason || '') &&
      /^Blocked: /.test(row.nextSafeCommand || '') &&
      !String(row.nextSafeCommand || '').includes('--retryFailed=true') &&
      !String(row.nextSafeCommand || '').includes('extraction:retry-failed'),
  )
  const supportedTargetSafe = supported?.supportedByExecution === true &&
    supported?.executionCommand?.ok === true &&
    supported.executionCommand.args.includes('--retryFailed=true') &&
    supported.nextSafeCommand === 'npm run extraction:retry-failed -- --target=meetings-current-day --dryRun=true'
  const supportListsAgree = listMatches(EXTRACTION_RETRY_FAILED_TARGETS, EXECUTION_RETRY_FAILED_TARGETS)

  return {
    ok: supportListsAgree && supportedTargetSafe && unsupportedTargetsBlocked,
    supportListsAgree,
    supportedTargetSafe,
    unsupportedTargetsBlocked,
    matrix,
    dogfoodInvariant: 'Only targets with a proven target-specific failed-item retry runner get a next-safe retry command; unsupported corpus targets block instead of advertising fake retry support.',
  }
}

export function evaluateExtractRetrySources({
  retryModuleSource = '',
  runHardeningSource = '',
  executionSource = '',
  meetingSyncSource = '',
  retryScriptSource = '',
  packageSource = '',
  jobsSource = '',
  extractionRuntimeVerifierSource = '',
  proofScriptSource = '',
  planSource = '',
  currentPlan = '',
  currentState = '',
} = {}) {
  const checks = []

  addCheck(
    checks,
    includesAll(runHardeningSource, [
      'export const EXTRACTION_RETRY_FAILED_TARGETS',
      'targetSupportsFailedItemRetry',
      'npm run extraction:retry-failed -- --target=${targetKey} --dryRun=true',
      'needs a target-specific retry command',
    ]) &&
      !runHardeningSource.includes("['drive-content-extract-backfill', 'video-content-extract-backfill'].includes(targetKey)") &&
      !runHardeningSource.includes("targetKey === 'email-attachments-backfill'"),
    'next-safe command only advertises proven retry targets',
    'unsupported Drive/video/email targets now block instead of returning fake --retryFailed target commands',
  )
  addCheck(
    checks,
    executionSource.includes("EXTRACTION_RETRY_FAILED_TARGETS,\n  EXTRACTION_RETRY_STATES") &&
      executionSource.includes('export { EXTRACTION_RETRY_FAILED_TARGETS }') &&
      executionSource.includes('targetSupportsRetryExecution'),
    'retry executor shares the same supported-target list',
    'execution module imports and re-exports retry target support from run-hardening truth',
  )
  addCheck(
    checks,
    meetingSyncSource.includes('getRetryableSourceCrawlItems') &&
      meetingSyncSource.includes('Retry eligible crawl items') &&
      !meetingSyncSource.includes('status: \'failed\',\n    limit') &&
      !meetingSyncSource.includes('Retry failed crawl items'),
    'meeting retry loader uses eligible retry rows, not every failed row',
    'blocked/waiting/exhausted rows are excluded by the store query before a retry run',
  )
  addCheck(
    checks,
    includesAll(retryScriptSource, [
      'getRetryableSourceCrawlItems',
      'targetSupportsRetryExecution',
      '--dryRun=true',
      'eligibleItemCount',
    ]),
    'central retry CLI keeps no-write dry-run and eligible-row behavior',
    'scripts/retry-extraction-failed-items.mjs remains the supported no-write review path',
  )
  addCheck(
    checks,
    packageSource.includes(`"process:extract-retry-check": "node --env-file-if-exists=.env ${EXTRACT_RETRY_SCRIPT_PATH}"`) &&
      packageSource.includes('"extraction:retry-failed"') &&
      jobsSource.includes("key: 'extraction-retry-failed'") &&
      jobsSource.includes("runtimeMode: 'manual'"),
    'package and Foundation job registry expose retry as manual reviewed work',
    'retry remains manual/report-first; no scheduled retry loop is introduced',
  )
  addCheck(
    checks,
    retryModuleSource.includes('buildExtractRetryDogfoodProof') &&
      proofScriptSource.includes('focused proof script is read-only') &&
      extractionRuntimeVerifierSource.includes(EXTRACT_RETRY_CARD_ID) &&
      extractionRuntimeVerifierSource.includes('evaluateExtractRetrySources'),
    'focused proof and extraction-runtime verifier cover EXTRACT-RETRY',
    EXTRACT_RETRY_SCRIPT_PATH,
  )
  addCheck(
    checks,
    planSource.includes('unsupported targets block') &&
      planSource.includes('No live extraction') &&
      currentPlan.includes(EXTRACT_RETRY_CLOSEOUT_KEY) &&
      currentState.includes(EXTRACT_RETRY_CLOSEOUT_KEY),
    'plan and rebuild docs record retry honesty boundary',
    EXTRACT_RETRY_PLAN_PATH,
  )

  return {
    ok: checks.every(check => check.ok),
    checks,
    summary: summary(checks),
  }
}
