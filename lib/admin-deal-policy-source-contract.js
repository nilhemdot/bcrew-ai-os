export const ADMIN_DEAL_POLICY_SOURCE_CONTRACT_CARD_ID = 'ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001'
export const ADMIN_DEAL_POLICY_SOURCE_CONTRACT_CLOSEOUT_KEY = 'admin-deal-policy-source-contract-v1'
export const ADMIN_DEAL_POLICY_SOURCE_CONTRACT_PLAN_PATH = 'docs/process/admin-deal-policy-source-contract-001-plan.md'
export const ADMIN_DEAL_POLICY_SOURCE_CONTRACT_APPROVAL_PATH = 'docs/process/approvals/ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001.json'
export const ADMIN_DEAL_POLICY_SOURCE_CONTRACT_SCRIPT_PATH = 'scripts/process-admin-deal-policy-source-contract-check.mjs'
export const ADMIN_DEAL_POLICY_SOURCE_CONTRACT_NEXT_CARD_ID = 'APPROVAL-THRESHOLD-REGISTRY-001'
export const ADMIN_DEAL_POLICY_SOURCE_ID = 'SRC-OPS-ADMIN-DEAL-POLICY-001'
export const ADMIN_DEAL_BACKLOG_SINCE = '2025-06-01'
export const ADMIN_DEAL_BACKLOG_SINCE_LABEL = 'June 2025 merger cutoff'
export const ADMIN_DEAL_POLICY_EFFECTIVE_DATE = '2026-04-01'
export const ADMIN_DEAL_POLICY_EFFECTIVE_LABEL = 'Q2 2026 policy effective date'
export const ADMIN_DEAL_DEFAULT_BACKLOG_LIMIT = 5
export const ADMIN_DEAL_DEFAULT_MATURE_DAYS = 10

export const ADMIN_DEAL_POLICY_SOURCE_CONTRACT_PROOF_COMMANDS = [
  'node --check lib/admin-deal-policy-source-contract.js scripts/process-admin-deal-policy-source-contract-check.mjs',
  'npm run process:admin-deal-policy-source-contract-check -- --close-card --json',
  'npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001 --planApprovalRef=docs/process/approvals/ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001.json --closeoutKey=admin-deal-policy-source-contract-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001 --closeoutKey=admin-deal-policy-source-contract-v1',
  'npm run process:foundation-ship -- --card=ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001 --planApprovalRef=docs/process/approvals/ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001.json --closeoutKey=admin-deal-policy-source-contract-v1 --commitRef=HEAD',
]

export function getAdminDealPolicySourceContract() {
  return {
    sourceId: ADMIN_DEAL_POLICY_SOURCE_ID,
    title: 'Ops Admin Deal Policy',
    owner: 'Ops Source Truth',
    status: 'source_contract_live',
    sourceOfTruthIds: ['SRC-OWNERS-001', 'SRC-FUB-001', 'SRC-CLICKUP-001'],
    backlogSince: ADMIN_DEAL_BACKLOG_SINCE,
    backlogSinceLabel: ADMIN_DEAL_BACKLOG_SINCE_LABEL,
    policyEffectiveDate: ADMIN_DEAL_POLICY_EFFECTIVE_DATE,
    policyEffectiveLabel: ADMIN_DEAL_POLICY_EFFECTIVE_LABEL,
    defaultBacklogLimit: ADMIN_DEAL_DEFAULT_BACKLOG_LIMIT,
    defaultMatureDays: ADMIN_DEAL_DEFAULT_MATURE_DAYS,
    mutationBoundary: 'scheduled review writes AI review status/action/findings only; source-field corrections remain human-owned',
    noExternalWriteExpansion: true,
  }
}

export function buildAdminDealBacklogReviewArgs({ includeWrite = true } = {}) {
  const contract = getAdminDealPolicySourceContract()
  const args = [
    'run',
    'deal-review:admin',
    '--',
    '--backlog',
    `--backlog-limit=${contract.defaultBacklogLimit}`,
    `--backlog-since=${contract.backlogSince}`,
  ]
  if (includeWrite) args.push('--write')
  return args
}

export function buildAdminDealBacklogReviewSummary() {
  const contract = getAdminDealPolicySourceContract()
  return [
    `Inspects ${contract.defaultBacklogLimit} newest eligible Admin backlog deals per day from the ${contract.backlogSinceLabel} using Date Firm (Executed) and a ${contract.defaultMatureDays}-day maturity gate.`,
    `Post-${contract.policyEffectiveDate} follow-through is checked against ClickUp Deal Data Entry, not the old Freedom review sheet.`,
    'Scheduled writeback only populates AI review status, action, and findings; it does not auto-fix source fields.',
  ].join(' ')
}

export function buildAdminDealBacklogReviewInputs() {
  return [
    'SRC-OWNERS-001 Admin deal rows',
    'SRC-FUB-001 person records',
    'SRC-CLICKUP-001 Deal Data Entry tasks',
    `Blank / not-reviewed rows and stale pre-ClickUp reviews from ${ADMIN_DEAL_BACKLOG_SINCE_LABEL} onward`,
  ]
}

export function buildAdminDealPostPolicyNote() {
  return `Q2 2026 bonus policy moved survey/review accountability out of the old Freedom per-row bonus model for deals executed on or after ${ADMIN_DEAL_POLICY_EFFECTIVE_DATE}.`
}

export function isAdminDealPostPolicyDate(executedDate, isOnOrAfterIso) {
  return typeof isOnOrAfterIso === 'function' && isOnOrAfterIso(executedDate, ADMIN_DEAL_POLICY_EFFECTIVE_DATE)
}

export function evaluateAdminDealPolicySourceContractUsage({
  reviewAdminDealsSource = '',
  foundationJobsSource = '',
  opsSource = '',
  sourceContractSource = '',
} = {}) {
  const review = String(reviewAdminDealsSource || '')
  const jobs = String(foundationJobsSource || '')
  const ops = String(opsSource || '')
  const contract = String(sourceContractSource || '')
  const checks = [
    {
      ok: contract.includes('ADMIN_DEAL_BACKLOG_SINCE') &&
        contract.includes('ADMIN_DEAL_POLICY_EFFECTIVE_DATE') &&
        contract.includes('getAdminDealPolicySourceContract'),
      check: 'source contract owns admin policy dates and metadata',
    },
    {
      ok: review.includes('ADMIN_DEAL_BACKLOG_SINCE') &&
        review.includes('ADMIN_DEAL_POLICY_EFFECTIVE_DATE') &&
        review.includes('buildAdminDealPostPolicyNote') &&
        !/const\s+DEFAULT_BACKLOG_SINCE\s*=\s*['"]\d{4}-\d{2}-\d{2}/.test(review) &&
        !/const\s+OPS_BONUS_POLICY_EFFECTIVE_DATE\s*=\s*['"]\d{4}-\d{2}-\d{2}/.test(review),
      check: 'admin runner imports policy values instead of declaring local date literals',
    },
    {
      ok: jobs.includes('buildAdminDealBacklogReviewArgs') &&
        jobs.includes('buildAdminDealBacklogReviewSummary') &&
        jobs.includes('buildAdminDealBacklogReviewInputs') &&
        !jobs.includes('--backlog-since=2025-06-01'),
      check: 'job registry reads admin backlog policy from source contract helper',
    },
    {
      ok: !ops.includes('2025-06-01') &&
        !ops.includes('Post-April-1') &&
        ops.includes('job.systemSummary || job.description'),
      check: 'Ops UI uses job/source-contract text instead of hardcoded policy dates',
    },
  ]
  const failed = checks.filter(check => !check.ok)
  return {
    ok: failed.length === 0,
    checks,
    failed,
  }
}

export function buildAdminDealPolicySourceContractDogfoodProof() {
  const healthy = evaluateAdminDealPolicySourceContractUsage({
    sourceContractSource: `
      export const ADMIN_DEAL_BACKLOG_SINCE = '2025-06-01'
      export const ADMIN_DEAL_POLICY_EFFECTIVE_DATE = '2026-04-01'
      export function getAdminDealPolicySourceContract() {}
    `,
    reviewAdminDealsSource: `
      import { ADMIN_DEAL_BACKLOG_SINCE, ADMIN_DEAL_POLICY_EFFECTIVE_DATE, buildAdminDealPostPolicyNote } from '../lib/admin-deal-policy-source-contract.js'
      const backlogSince = ADMIN_DEAL_BACKLOG_SINCE
      const policy = ADMIN_DEAL_POLICY_EFFECTIVE_DATE
      followThroughNotes.push(buildAdminDealPostPolicyNote())
    `,
    foundationJobsSource: `
      import { buildAdminDealBacklogReviewArgs, buildAdminDealBacklogReviewSummary, buildAdminDealBacklogReviewInputs } from './admin-deal-policy-source-contract.js'
      const job = { args: buildAdminDealBacklogReviewArgs(), systemSummary: buildAdminDealBacklogReviewSummary(), systemInputs: buildAdminDealBacklogReviewInputs() }
    `,
    opsSource: `
      body.appendChild(renderLabeledCopy('Extra detail', job.systemSummary || job.description || 'Uses source-contract policy.'))
    `,
  })
  const stale = evaluateAdminDealPolicySourceContractUsage({
    sourceContractSource: 'export function getAdminDealPolicySourceContract() {}',
    reviewAdminDealsSource: `
      const DEFAULT_BACKLOG_SINCE = '2025-06-01'
      const OPS_BONUS_POLICY_EFFECTIVE_DATE = '2026-04-01'
    `,
    foundationJobsSource: `
      const job = { args: ['run', 'deal-review:admin', '--', '--backlog-since=2025-06-01'] }
    `,
    opsSource: `
      body.appendChild(renderLabeledCopy('Extra detail', 'Runs newest to older from the 2025-06-01 cutoff. Post-April-1 follow-through is checked in ClickUp.'))
    `,
  })
  return {
    ok: healthy.ok && !stale.ok,
    healthy,
    stale,
  }
}
