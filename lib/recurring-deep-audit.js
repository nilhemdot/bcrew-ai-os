export const RECURRING_DEEP_AUDIT_CARD_ID = 'RECURRING-DEEP-AUDIT-001'
export const RECURRING_DEEP_AUDIT_JOB_KEY = 'recurring-deep-audit'
export const RECURRING_DEEP_AUDIT_OUTPUT_PATTERN = 'docs/handoffs/deep-audit-{date}.md'
export const RECURRING_DEEP_AUDIT_CADENCE = 'manual approval every 4-6 closed Foundation sprints or explicit Steve request'

export const RECURRING_DEEP_AUDIT_FINDING_FIELDS = Object.freeze([
  'severity',
  'file',
  'line',
  'issue',
  'whyItMatters',
  'fixNowOrBacklog',
  'proposedCardId',
])

export function buildRecurringDeepAuditContract() {
  return {
    cardId: RECURRING_DEEP_AUDIT_CARD_ID,
    jobKey: RECURRING_DEEP_AUDIT_JOB_KEY,
    cadence: RECURRING_DEEP_AUDIT_CADENCE,
    outputPattern: RECURRING_DEEP_AUDIT_OUTPUT_PATTERN,
    reportOnly: true,
    manualApprovalRequired: true,
    autoMutatesBacklog: false,
    autoMutatesCode: false,
    proposalOnly: true,
    findingFields: [...RECURRING_DEEP_AUDIT_FINDING_FIELDS],
    mirrorsReport: 'docs/handoffs/2026-05-13-deep-foundation-code-audit.md',
    notNightlyScanner: true,
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

export function evaluateRecurringDeepAuditJob(job = {}, contract = buildRecurringDeepAuditContract()) {
  const checks = []
  addCheck(checks, job.key === contract.jobKey, 'job key matches contract', job.key || 'missing')
  addCheck(checks, job.enabled === true, 'job is enabled for manual operator use', String(job.enabled))
  addCheck(checks, job.runtimeMode === 'manual', 'job stays manual', job.runtimeMode || 'missing')
  addCheck(checks, job.scheduleEveryMinutes === null, 'job has no unattended schedule', String(job.scheduleEveryMinutes))
  addCheck(checks, job.mutationPosture === 'report_only', 'job is report-only', job.mutationPosture || 'missing')
  addCheck(checks, job.args?.includes('process:recurring-deep-audit-check'), 'job runs the recurring deep audit proof script', (job.args || []).join(' '))
  addCheck(checks, /4-6/.test(job.cadence || ''), 'job cadence names 4-6 sprint review rhythm', job.cadence || '')
  addCheck(checks, /manual/i.test(job.nextAction || '') && /approval/i.test(job.nextAction || ''), 'job next action requires manual approval', job.nextAction || '')
  addCheck(checks, contract.findingFields.every(field => RECURRING_DEEP_AUDIT_FINDING_FIELDS.includes(field)), 'finding schema is complete', contract.findingFields.join(', '))

  const findings = checks.filter(check => !check.ok)
  return {
    ok: findings.length === 0,
    status: findings.length ? 'blocked' : 'healthy',
    contract,
    checks,
    findings,
  }
}

export function buildRecurringDeepAuditDogfoodProof(job = {}) {
  const contract = buildRecurringDeepAuditContract()
  const deterministicScannerOnly = {
    ...job,
    key: 'code-quality-nightly-audit',
    title: 'Code Quality Nightly Audit',
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 1440,
    mutationPosture: 'report_only',
    args: ['run', 'process:code-quality-nightly-audit-check', '--', '--json'],
    cadence: 'nightly deterministic scanner',
    nextAction: 'Review deterministic report.',
  }
  const autonomousReviewer = {
    ...job,
    key: RECURRING_DEEP_AUDIT_JOB_KEY,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 1440,
    mutationPosture: 'mutating',
    args: ['run', 'process:recurring-deep-audit-check', '--', '--json', '--apply'],
    cadence: 'nightly autonomous reviewer',
    nextAction: 'Auto-create backlog and patch code.',
  }
  const validManual = evaluateRecurringDeepAuditJob(job, contract)
  const scannerOnly = evaluateRecurringDeepAuditJob(deterministicScannerOnly, contract)
  const autonomous = evaluateRecurringDeepAuditJob(autonomousReviewer, contract)
  return {
    ok: validManual.ok === true && scannerOnly.ok === false && autonomous.ok === false,
    validManual,
    scannerOnly,
    autonomous,
    invariant: 'A deterministic nightly scanner is not the recurring senior-engineer deep audit, and any autonomous/mutating reviewer shape is rejected.',
  }
}
