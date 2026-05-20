export const APPROVAL_THRESHOLD_REGISTRY_CARD_ID = 'APPROVAL-THRESHOLD-REGISTRY-001'
export const APPROVAL_THRESHOLD_REGISTRY_CLOSEOUT_KEY = 'approval-threshold-registry-v1'
export const APPROVAL_THRESHOLD_REGISTRY_PLAN_PATH = 'docs/process/approval-threshold-registry-001-plan.md'
export const APPROVAL_THRESHOLD_REGISTRY_APPROVAL_PATH = 'docs/process/approvals/APPROVAL-THRESHOLD-REGISTRY-001.json'
export const APPROVAL_THRESHOLD_REGISTRY_SCRIPT_PATH = 'scripts/process-approval-threshold-registry-check.mjs'
export const APPROVAL_THRESHOLD_REGISTRY_NEXT_CARD_ID = 'BUILD-INTEL-SNAPSHOT-BASELINE-001'

export const APPROVAL_MIN_APPROVED_PLAN_SCORE = 9.8
export const APPROVAL_MIN_APPROVED_PLAN_SCORE_LABEL = '9.8+'
export const PLAN_CRITIC_MIN_PASS_SCORE = APPROVAL_MIN_APPROVED_PLAN_SCORE

export const APPROVAL_THRESHOLD_REGISTRY_PROOF_COMMANDS = [
  'node --check lib/approval-threshold-registry.js scripts/process-approval-threshold-registry-check.mjs',
  'npm run process:approval-threshold-registry-check -- --close-card --json',
  'npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=APPROVAL-THRESHOLD-REGISTRY-001 --planApprovalRef=docs/process/approvals/APPROVAL-THRESHOLD-REGISTRY-001.json --closeoutKey=approval-threshold-registry-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=APPROVAL-THRESHOLD-REGISTRY-001 --closeoutKey=approval-threshold-registry-v1',
  'npm run process:foundation-ship -- --card=APPROVAL-THRESHOLD-REGISTRY-001 --planApprovalRef=docs/process/approvals/APPROVAL-THRESHOLD-REGISTRY-001.json --closeoutKey=approval-threshold-registry-v1 --commitRef=HEAD',
]

function normalizeText(value) {
  return String(value || '').trim()
}

function lineNumberForIndex(text = '', index = 0) {
  return String(text || '').slice(0, Math.max(0, index)).split(/\r?\n/).length
}

function refForPattern(path, source, pattern, detail) {
  const text = String(source || '')
  const match = text.match(pattern)
  if (!match || match.index === undefined) return null
  return {
    path,
    line: lineNumberForIndex(text, match.index),
    detail: detail || match[0].slice(0, 120).replace(/\s+/g, ' '),
  }
}

function checkSource(checks, ok, check, detail = '', refs = []) {
  checks.push({
    ok: Boolean(ok),
    check,
    detail,
    refs: refs.filter(Boolean),
  })
}

export function normalizeApprovalThreshold(value, fallback = APPROVAL_MIN_APPROVED_PLAN_SCORE) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

export function meetsApprovalThreshold(value, threshold = APPROVAL_MIN_APPROVED_PLAN_SCORE) {
  const score = Number(value)
  if (!Number.isFinite(score)) return false
  return score >= normalizeApprovalThreshold(threshold)
}

export function buildApprovalThresholdRegistrySummary() {
  return {
    cardId: APPROVAL_THRESHOLD_REGISTRY_CARD_ID,
    closeoutKey: APPROVAL_THRESHOLD_REGISTRY_CLOSEOUT_KEY,
    minimumApprovedPlanScore: APPROVAL_MIN_APPROVED_PLAN_SCORE,
    label: APPROVAL_MIN_APPROVED_PLAN_SCORE_LABEL,
    owner: 'Plan Critic',
    rule: 'Approved Foundation plans and Plan Critic passes use one shared threshold registry.',
    nextCardId: APPROVAL_THRESHOLD_REGISTRY_NEXT_CARD_ID,
  }
}

export function evaluateApprovalThresholdRegistryUsage({
  registrySource = '',
  planCriticSource = '',
  approvalIntegritySource = '',
  currentSprintSource = '',
  currentSprintStoreSource = '',
  codeQualityAuditSource = '',
  processScriptSource = '',
} = {}) {
  const registry = String(registrySource || '')
  const planCritic = String(planCriticSource || '')
  const approvalIntegrity = String(approvalIntegritySource || '')
  const currentSprint = String(currentSprintSource || '')
  const currentSprintStore = String(currentSprintStoreSource || '')
  const codeQualityAudit = String(codeQualityAuditSource || '')
  const processScript = String(processScriptSource || '')
  const checks = []

  checkSource(
    checks,
    registry.includes('APPROVAL_MIN_APPROVED_PLAN_SCORE = 9.8') &&
      registry.includes('meetsApprovalThreshold') &&
      registry.includes('normalizeApprovalThreshold'),
    'registry owns approval score threshold and helpers',
    'lib/approval-threshold-registry.js',
    [refForPattern('lib/approval-threshold-registry.js', registry, /APPROVAL_MIN_APPROVED_PLAN_SCORE\s*=\s*9\.8/, 'canonical threshold')],
  )
  checkSource(
    checks,
    planCritic.includes('./approval-threshold-registry.js') &&
      planCritic.includes('PLAN_CRITIC_MIN_PASS_SCORE') &&
      !/export\s+const\s+PLAN_CRITIC_MIN_PASS_SCORE\s*=\s*9\.8/.test(planCritic),
    'Plan Critic imports/re-exports the registry threshold instead of declaring a local literal',
    'lib/process-plan-critic.js',
    [refForPattern('lib/process-plan-critic.js', planCritic, /export\s+const\s+PLAN_CRITIC_MIN_PASS_SCORE\s*=\s*9\.8/, 'local threshold literal')],
  )
  checkSource(
    checks,
    approvalIntegrity.includes('meetsApprovalThreshold') &&
      !/Number\s*\(\s*approval(?:\?|\.)[^)]*\)\s*>=\s*9\.8/.test(approvalIntegrity) &&
      !/Number\s*\(\s*approval\.score\s*\)\s*>=\s*9\.8/.test(approvalIntegrity),
    'approval integrity uses threshold helper for approval score checks',
    'lib/approval-integrity.js',
    [refForPattern('lib/approval-integrity.js', approvalIntegrity, /Number\s*\(\s*approval(?:\?|\.)[^)]*\)\s*>=\s*9\.8|Number\s*\(\s*approval\.score\s*\)\s*>=\s*9\.8/, 'raw approval comparison')],
  )
  checkSource(
    checks,
    currentSprint.includes('normalizeApprovalThreshold') &&
      currentSprint.includes('meetsApprovalThreshold') &&
      !/passThreshold\s*=\s*Number\s*\([^)]*9\.8/.test(currentSprint) &&
      !/passThreshold:\s*Number\.isFinite\([^)]*\)\s*\?\s*[^:]+:\s*9\.8/.test(currentSprint),
    'Current Sprint gate normalization uses registry helpers',
    'lib/foundation-current-sprint.js',
    [refForPattern('lib/foundation-current-sprint.js', currentSprint, /passThreshold\s*=\s*Number\s*\([^)]*9\.8|passThreshold:\s*Number\.isFinite\([^)]*\)\s*\?\s*[^:]+:\s*9\.8/, 'raw pass threshold fallback')],
  )
  checkSource(
    checks,
    currentSprintStore.includes('normalizeApprovalThreshold') &&
      !/passThreshold:\s*row\.pass_threshold[^?]*\?[^:]+:\s*9\.8/.test(currentSprintStore) &&
      !/passThreshold:\s*row\.pass_threshold[^?]*\?\s*9\.8/.test(currentSprintStore),
    'Current Sprint store maps DB pass threshold through registry fallback',
    'lib/foundation-current-sprint-store.js',
    [refForPattern('lib/foundation-current-sprint-store.js', currentSprintStore, /passThreshold:\s*row\.pass_threshold[^?]*(?:\?[^:]+:\s*9\.8|\?\s*9\.8)/, 'raw DB threshold fallback')],
  )
  checkSource(
    checks,
    codeQualityAudit.includes('evaluateApprovalThresholdRegistryUsage') &&
      codeQualityAudit.includes('approvalThresholdUsage') &&
      !/collectPatternRefs\s*\(\s*fileTexts\s*,\s*\/\\b9\\\.8\\b\/g/.test(codeQualityAudit),
    'code-quality audit uses registry evaluator instead of blanket raw-literal scan',
    'lib/code-quality-nightly-audit.js',
    [refForPattern('lib/code-quality-nightly-audit.js', codeQualityAudit, /collectPatternRefs\s*\(\s*fileTexts\s*,\s*\/\\b9\\\.8\\b\/g/, 'blanket raw threshold scan')],
  )
  checkSource(
    checks,
    !processScript || (
      processScript.includes('APPROVAL_MIN_APPROVED_PLAN_SCORE') &&
      processScript.includes('APPROVAL_THRESHOLD_REGISTRY_CARD_ID') &&
      processScript.includes('evaluateApprovalThresholdRegistryUsage')
    ),
    'focused process check consumes registry constants and evaluator',
    APPROVAL_THRESHOLD_REGISTRY_SCRIPT_PATH,
  )

  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    checks,
    failed,
    refs: failed.flatMap(check => check.refs || []),
  }
}

export function buildApprovalThresholdRegistryDogfoodProof() {
  const healthy = evaluateApprovalThresholdRegistryUsage({
    registrySource: `
      export const APPROVAL_MIN_APPROVED_PLAN_SCORE = 9.8
      export function normalizeApprovalThreshold(value) { return Number.isFinite(Number(value)) ? Number(value) : APPROVAL_MIN_APPROVED_PLAN_SCORE }
      export function meetsApprovalThreshold(score) { return Number(score) >= APPROVAL_MIN_APPROVED_PLAN_SCORE }
    `,
    planCriticSource: `
      import { PLAN_CRITIC_MIN_PASS_SCORE } from './approval-threshold-registry.js'
      export { PLAN_CRITIC_MIN_PASS_SCORE } from './approval-threshold-registry.js'
      const pass = score >= PLAN_CRITIC_MIN_PASS_SCORE
    `,
    approvalIntegritySource: `
      import { meetsApprovalThreshold } from './approval-threshold-registry.js'
      checks.push({ ok: meetsApprovalThreshold(approval?.score) })
    `,
    currentSprintSource: `
      import { meetsApprovalThreshold, normalizeApprovalThreshold } from './approval-threshold-registry.js'
      const passThreshold = normalizeApprovalThreshold(run.passThreshold ?? run.pass_threshold)
      if (meetsApprovalThreshold(run.score, run.passThreshold)) {}
    `,
    currentSprintStoreSource: `
      import { normalizeApprovalThreshold } from './approval-threshold-registry.js'
      const row = { passThreshold: normalizeApprovalThreshold(row.pass_threshold) }
    `,
    codeQualityAuditSource: `
      import { evaluateApprovalThresholdRegistryUsage } from './approval-threshold-registry.js'
      const approvalThresholdUsage = evaluateApprovalThresholdRegistryUsage({})
    `,
    processScriptSource: `
      import { APPROVAL_MIN_APPROVED_PLAN_SCORE, APPROVAL_THRESHOLD_REGISTRY_CARD_ID, evaluateApprovalThresholdRegistryUsage } from '../lib/approval-threshold-registry.js'
    `,
  })
  const stale = evaluateApprovalThresholdRegistryUsage({
    registrySource: 'export const OTHER = true',
    planCriticSource: 'export const PLAN_CRITIC_MIN_PASS_SCORE = 9.8',
    approvalIntegritySource: 'checks.push({ ok: Number(approval?.score) >= 9.8 })',
    currentSprintSource: 'const passThreshold = Number(run.passThreshold ?? run.pass_threshold ?? 9.8)',
    currentSprintStoreSource: 'passThreshold: row.pass_threshold === null ? 9.8 : Number(row.pass_threshold)',
    codeQualityAuditSource: 'const planCriticRefs = collectPatternRefs(fileTexts, /\\b9\\.8\\b/g)',
    processScriptSource: 'const CARD_ID = "APPROVAL-THRESHOLD-REGISTRY-001"',
  })
  return {
    ok: healthy.ok &&
      !stale.ok &&
      meetsApprovalThreshold(APPROVAL_MIN_APPROVED_PLAN_SCORE) &&
      !meetsApprovalThreshold(APPROVAL_MIN_APPROVED_PLAN_SCORE - 0.1),
    healthy,
    stale,
    thresholdBehavior: {
      passAtThreshold: meetsApprovalThreshold(APPROVAL_MIN_APPROVED_PLAN_SCORE),
      failBelowThreshold: !meetsApprovalThreshold(APPROVAL_MIN_APPROVED_PLAN_SCORE - 0.1),
    },
  }
}

