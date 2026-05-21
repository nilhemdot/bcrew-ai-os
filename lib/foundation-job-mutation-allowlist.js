export const FOUNDATION_JOB_MUTATION_ALLOWLIST_CARD_ID = 'FOUNDATION-JOB-MUTATION-ALLOWLIST-001'
export const FOUNDATION_JOB_MUTATION_ALLOWLIST_SPRINT_ID = 'foundation-job-mutation-allowlist-2026-05-15'
export const FOUNDATION_JOB_MUTATION_ALLOWLIST_CLOSEOUT_KEY = 'foundation-job-mutation-allowlist-v1'
export const FOUNDATION_JOB_MUTATION_ALLOWLIST_PLAN_PATH = 'docs/process/foundation-job-mutation-allowlist-001-plan.md'
export const FOUNDATION_JOB_MUTATION_ALLOWLIST_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-JOB-MUTATION-ALLOWLIST-001.json'
export const FOUNDATION_JOB_MUTATION_ALLOWLIST_SCRIPT_PATH = 'scripts/process-foundation-job-mutation-allowlist-check.mjs'

export const FOUNDATION_JOB_MUTATION_ALLOWLIST_DECISIONS = Object.freeze({
  allow: 'allow',
  block: 'block',
})

export const FOUNDATION_JOB_MUTATION_ALLOWLIST_POSTURES = Object.freeze({
  readOnly: 'read_only',
  reportOnly: 'report_only',
  operationalWrite: 'operational_write',
  externalWrite: 'external_write',
  mutating: 'mutating',
  unknown: 'unknown',
})

export const FOUNDATION_JOB_MUTATION_ALLOWLIST = Object.freeze({
  'foundation-verify': allowScheduled('read_only', 'Verifier is read-only after VERIFY-READONLY-GATE-001; it may run unattended as a health check.'),
  'verification-runs': allowScheduled('read_only', 'process:verification-runs-check is read-only by default; any historical closeout writeback requires an explicit --apply command outside the scheduler.'),
  'nightly-deep-audit': allowScheduled('report_only', 'Scheduled hybrid deep audit writes report artifacts only; findings are proposals and never auto-mutate backlog or sprint truth.'),
  'system-health-nightly-audit': allowScheduled('report_only', 'System health nightly audit writes report artifacts only and surfaces stale jobs/sources/endpoints without auto-mutating live truth.'),
  'foundation-lessons-learned-loop': allowScheduled('read_only', 'Scheduled lessons loop reads live Foundation status and local/private memory metadata only; closeout/backlog writes require explicit --apply outside the scheduler.'),
  'connector-uptime-monitor': allowScheduled('read_only', 'Connector uptime monitor reads connector/job/source metadata and writes no live truth.'),
  'shared-comms-coverage': allowScheduled('read_only', 'Coverage report reads shared-comms artifact/candidate counts only.'),
  'gmail-sync-current': allowScheduled('operational_write', 'Current Gmail sync writes controlled source-crawl/artifact ledger rows for the already approved current-day archive lane.'),
  'calendar-sync-current': allowScheduled('operational_write', 'Current Calendar sync writes controlled source-crawl/artifact ledger rows for the approved read-only event archive lane; it must not mutate Calendar events or invites.'),
  'missive-sync-current': allowScheduled('operational_write', 'Current Missive sync writes controlled source-crawl/artifact ledger rows for the already approved current-day archive lane.'),
  'email-attachment-extract-bite': allowScheduled('operational_write', 'Email attachment bite writes governed artifact outputs/skips into the extraction ledger.'),
  'meeting-notes-sync-current': allowScheduled('operational_write', 'Meeting notes current sync writes governed source-crawl/artifact ledger rows.'),
  'slack-sync-current': allowScheduled('operational_write', 'Slack current sync writes governed source-crawl/artifact ledger rows for the current 48-hour lane.'),
  'slack-extract-latest': allowScheduled('operational_write', 'Slack extraction bite writes governed candidates for a small scheduled quota.'),
  'drive-corpus-inventory-bite': allowScheduled('read_only', 'Drive corpus inventory bite records inventory posture without moving, copying, exporting, or mutating Drive permissions.'),
  'drive-content-extract-bite': allowScheduled('operational_write', 'Drive content bite writes governed artifacts/skips from the approved Drive inventory queue.'),
  'video-content-extract-bite': allowScheduled('operational_write', 'Video content bite writes governed transcript artifacts from approved manifests only.'),
  'youtube-creator-daily-watch': allowScheduled('operational_write', 'Public YouTube creator daily watch writes governed source-crawl research-pool rows and proposal-only intelligence artifacts; it must not use auth, follow external links, mutate credentials, or create backlog cards automatically.'),
  'gmail-extract-latest': allowScheduled('operational_write', 'Gmail extraction bite writes governed candidates for a small scheduled quota.'),
  'missive-extract-latest': allowScheduled('operational_write', 'Missive extraction bite writes governed candidates for a small scheduled quota.'),
  'meeting-transcripts-extract-backlog': allowScheduled('operational_write', 'Meeting transcript extraction bite writes governed candidates for a small scheduled quota.'),
  'admin-deal-review-readonly': allowScheduled('operational_write', 'Admin deal review writes review status/action/findings only; source-field corrections remain human-owned.'),
  'admin-deal-backlog-review': allowScheduled('operational_write', 'Admin deal backlog review writes review status/action/findings only; source-field corrections remain human-owned.'),
  'conditional-deal-review-readonly': allowScheduled('operational_write', 'Conditional forecast sync rebuilds the approved generated forecast sheet from ClickUp.'),
  'agent-roster-review': allowScheduled('operational_write', 'Agent roster review writes review status/score/feedback fields for the approved Ops accountability lane.'),
  'agent-feedback-auto-send-readiness': allowScheduled('external_write', 'Agent feedback production send is externally writing by design and remains protected by its live guard, local send window, and approval artifact.'),
  'agent-feedback-reminder-readiness': allowScheduled('external_write', 'Agent feedback reminders are externally writing by design and remain protected by reminder live guard, local send window, and approval artifact.'),
  'intelligence-synthesis-spine-refresh': allowScheduled('operational_write', 'Intelligence spine refresh writes governed synthesis spine rows from already mined candidates.'),
  'intelligence-action-router-proposals': allowScheduled('operational_write', 'Action-router proposals write pending human-approval-required routes only; destination ledgers are not applied automatically.'),
})

function allowScheduled(allowedPostures, reason) {
  return buildAllowlistEntry({
    decision: FOUNDATION_JOB_MUTATION_ALLOWLIST_DECISIONS.allow,
    allowedPostures,
    allowedRuntimeModes: ['scheduled'],
    reason,
  })
}

function blockScheduled(allowedPostures, reason) {
  return buildAllowlistEntry({
    decision: FOUNDATION_JOB_MUTATION_ALLOWLIST_DECISIONS.block,
    allowedPostures,
    allowedRuntimeModes: ['scheduled'],
    reason,
  })
}

function buildAllowlistEntry({ decision, allowedPostures, allowedRuntimeModes, reason }) {
  const postures = Array.isArray(allowedPostures) ? allowedPostures : [allowedPostures]
  const runtimeModes = Array.isArray(allowedRuntimeModes) ? allowedRuntimeModes : [allowedRuntimeModes]
  return Object.freeze({
    decision,
    allowedPostures: postures.map(normalizeMutationPosture),
    allowedRuntimeModes: runtimeModes.map(value => String(value || '').trim()).filter(Boolean),
    reason: String(reason || '').trim(),
  })
}

function normalizeMutationPosture(value) {
  const normalized = String(value || '').trim()
  return Object.values(FOUNDATION_JOB_MUTATION_ALLOWLIST_POSTURES).includes(normalized)
    ? normalized
    : FOUNDATION_JOB_MUTATION_ALLOWLIST_POSTURES.unknown
}

function normalizeRuntimeMode(job = {}) {
  return String(job.runtimeMode || (job.enabled === false ? 'paused' : 'manual')).trim() || 'manual'
}

function normalizeAllowlistEntry(entry) {
  if (!entry || typeof entry !== 'object') return null
  const decision = String(entry.decision || '').trim()
  if (!Object.values(FOUNDATION_JOB_MUTATION_ALLOWLIST_DECISIONS).includes(decision)) return null
  const allowedPostures = Array.isArray(entry.allowedPostures) ? entry.allowedPostures : []
  const allowedRuntimeModes = Array.isArray(entry.allowedRuntimeModes) ? entry.allowedRuntimeModes : []
  return {
    decision,
    allowedPostures: allowedPostures.map(normalizeMutationPosture).filter(Boolean),
    allowedRuntimeModes: allowedRuntimeModes.map(value => String(value || '').trim()).filter(Boolean),
    reason: String(entry.reason || '').trim(),
  }
}

export function getFoundationJobMutationAllowlistEntry(jobOrKey) {
  if (jobOrKey && typeof jobOrKey === 'object') {
    const override = normalizeAllowlistEntry(jobOrKey.mutationAllowlist)
    if (override) return override
    return normalizeAllowlistEntry(FOUNDATION_JOB_MUTATION_ALLOWLIST[String(jobOrKey.key || '').trim()])
  }
  return normalizeAllowlistEntry(FOUNDATION_JOB_MUTATION_ALLOWLIST[String(jobOrKey || '').trim()])
}

export function evaluateFoundationJobMutationAllowlist(job = {}) {
  const key = String(job.key || '').trim()
  const runtimeMode = normalizeRuntimeMode(job)
  const enabled = job.enabled !== false
  const mutationPosture = normalizeMutationPosture(job.mutationPosture)
  const entry = getFoundationJobMutationAllowlistEntry(job)
  const scheduled = enabled && runtimeMode === 'scheduled'
  const base = {
    cardId: FOUNDATION_JOB_MUTATION_ALLOWLIST_CARD_ID,
    key,
    runtimeMode,
    enabled,
    scheduled,
    mutationPosture,
    allowlistFound: Boolean(entry),
    decision: entry?.decision || null,
    allowedPostures: entry?.allowedPostures || [],
    allowedRuntimeModes: entry?.allowedRuntimeModes || [],
    reason: entry?.reason || '',
  }

  if (!scheduled) {
    return {
      ...base,
      ok: true,
      status: runtimeMode === 'manual' ? 'manual_not_scheduled' : `${runtimeMode || 'not'}_not_scheduled`,
      plainEnglish: 'Allowlist is required only for enabled scheduled jobs.',
    }
  }

  if (!key) {
    return {
      ...base,
      ok: false,
      status: 'missing_job_key',
      plainEnglish: 'Enabled scheduled Foundation jobs require a stable job key before the scheduler can trust them.',
    }
  }

  if (!entry) {
    return {
      ...base,
      ok: false,
      status: 'missing_allowlist',
      plainEnglish: `Scheduled Foundation job ${key} has no mutation allowlist row.`,
    }
  }

  if (!entry.allowedRuntimeModes.includes(runtimeMode)) {
    return {
      ...base,
      ok: false,
      status: 'runtime_mode_mismatch',
      plainEnglish: `Scheduled Foundation job ${key} is ${runtimeMode}, but its allowlist permits ${entry.allowedRuntimeModes.join(', ') || 'no runtime modes'}.`,
    }
  }

  if (!entry.allowedPostures.includes(mutationPosture)) {
    return {
      ...base,
      ok: false,
      status: 'posture_mismatch',
      plainEnglish: `Scheduled Foundation job ${key} is ${mutationPosture}, but its allowlist permits ${entry.allowedPostures.join(', ') || 'no postures'}.`,
    }
  }

  if (entry.decision === FOUNDATION_JOB_MUTATION_ALLOWLIST_DECISIONS.block) {
    return {
      ...base,
      ok: false,
      status: 'blocked_by_allowlist',
      plainEnglish: entry.reason || `Scheduled Foundation job ${key} is intentionally blocked by allowlist.`,
    }
  }

  return {
    ...base,
    ok: true,
    status: `allowed_scheduled_${mutationPosture}`,
    plainEnglish: entry.reason || `Scheduled Foundation job ${key} is allowlisted as ${mutationPosture}.`,
  }
}

export function buildFoundationJobMutationAllowlistReport({ jobs = [] } = {}) {
  const rows = (Array.isArray(jobs) ? jobs : []).map(job => {
    const allowlist = evaluateFoundationJobMutationAllowlist(job)
    const runtimeMode = normalizeRuntimeMode(job)
    return {
      key: String(job.key || '').trim(),
      title: job.title || '',
      jobType: job.jobType || '',
      runtimeMode,
      enabled: job.enabled !== false,
      scheduled: allowlist.scheduled,
      mutationPosture: allowlist.mutationPosture,
      allowlistStatus: allowlist.status,
      allowlistOk: allowlist.ok === true,
      allowlistFound: allowlist.allowlistFound === true,
      decision: allowlist.decision,
      allowedPostures: allowlist.allowedPostures,
      allowedRuntimeModes: allowlist.allowedRuntimeModes,
      plainEnglish: allowlist.plainEnglish,
      reason: allowlist.reason,
      command: [job.command, ...(Array.isArray(job.args) ? job.args : [])].filter(Boolean).join(' '),
      sourceIds: Array.isArray(job.sourceIds) ? job.sourceIds.slice() : [],
    }
  })
  const scheduledRows = rows.filter(row => row.scheduled)
  const blockedRows = scheduledRows.filter(row => row.allowlistStatus === 'blocked_by_allowlist')
  const allowedRows = scheduledRows.filter(row => row.allowlistOk)
  const failingRows = scheduledRows.filter(row => !row.allowlistOk && row.allowlistStatus !== 'blocked_by_allowlist')
  const missingRows = scheduledRows.filter(row => row.allowlistStatus === 'missing_allowlist')
  const mismatchRows = scheduledRows.filter(row => row.allowlistStatus === 'posture_mismatch' || row.allowlistStatus === 'runtime_mode_mismatch')
  const unknownRows = scheduledRows.filter(row => row.mutationPosture === FOUNDATION_JOB_MUTATION_ALLOWLIST_POSTURES.unknown)
  const ok = scheduledRows.length > 0 &&
    failingRows.length === 0 &&
    missingRows.length === 0 &&
    mismatchRows.length === 0 &&
    unknownRows.length === 0

  return {
    ok,
    status: ok ? 'healthy' : 'blocked',
    cardId: FOUNDATION_JOB_MUTATION_ALLOWLIST_CARD_ID,
    scheduledCount: scheduledRows.length,
    allowedCount: allowedRows.length,
    blockedCount: blockedRows.length,
    missingCount: missingRows.length,
    mismatchCount: mismatchRows.length,
    unknownCount: unknownRows.length,
    failingRows,
    missingRows,
    mismatchRows,
    blockedRows,
    rows,
  }
}

export function buildFoundationJobMutationAllowlistDogfoodProof() {
  const scheduledMissing = evaluateFoundationJobMutationAllowlist({
    key: 'synthetic-missing-allowlist-job',
    enabled: true,
    runtimeMode: 'scheduled',
    mutationPosture: 'read_only',
  })
  const scheduledMismatch = evaluateFoundationJobMutationAllowlist({
    key: 'synthetic-mismatched-allowlist-job',
    enabled: true,
    runtimeMode: 'scheduled',
    mutationPosture: 'mutating',
    mutationAllowlist: allowScheduled('report_only', 'Synthetic report-only job should fail when it becomes mutating.'),
  })
  const scheduledReadOnly = evaluateFoundationJobMutationAllowlist({
    key: 'synthetic-readonly-allowlist-job',
    enabled: true,
    runtimeMode: 'scheduled',
    mutationPosture: 'read_only',
    mutationAllowlist: allowScheduled('read_only', 'Synthetic read-only job is allowed.'),
  })
  const scheduledReportOnly = evaluateFoundationJobMutationAllowlist({
    key: 'synthetic-reportonly-allowlist-job',
    enabled: true,
    runtimeMode: 'scheduled',
    mutationPosture: 'report_only',
    mutationAllowlist: allowScheduled('report_only', 'Synthetic report-only job is allowed.'),
  })
  const scheduledOperationalWrite = evaluateFoundationJobMutationAllowlist({
    key: 'synthetic-operational-write-allowlist-job',
    enabled: true,
    runtimeMode: 'scheduled',
    mutationPosture: 'operational_write',
    mutationAllowlist: allowScheduled('operational_write', 'Synthetic internal operational writer is allowed only by explicit row.'),
  })
  const scheduledExternalWrite = evaluateFoundationJobMutationAllowlist({
    key: 'synthetic-external-write-allowlist-job',
    enabled: true,
    runtimeMode: 'scheduled',
    mutationPosture: 'external_write',
    mutationAllowlist: allowScheduled('external_write', 'Synthetic external writer is allowed only by explicit row.'),
  })
  const scheduledBlocked = evaluateFoundationJobMutationAllowlist({
    key: 'synthetic-blocked-mutating-allowlist-job',
    enabled: true,
    runtimeMode: 'scheduled',
    mutationPosture: 'mutating',
    mutationAllowlist: blockScheduled('mutating', 'Synthetic mutating job is intentionally blocked.'),
  })

  const ok = scheduledMissing.ok === false &&
    scheduledMissing.status === 'missing_allowlist' &&
    scheduledMismatch.ok === false &&
    scheduledMismatch.status === 'posture_mismatch' &&
    scheduledReadOnly.ok === true &&
    scheduledReportOnly.ok === true &&
    scheduledOperationalWrite.ok === true &&
    scheduledExternalWrite.ok === true &&
    scheduledBlocked.ok === false &&
    scheduledBlocked.status === 'blocked_by_allowlist'

  return {
    ok,
    mode: 'foundation-job-mutation-allowlist-dogfood',
    scheduledMissing,
    scheduledMismatch,
    scheduledReadOnly,
    scheduledReportOnly,
    scheduledOperationalWrite,
    scheduledExternalWrite,
    scheduledBlocked,
  }
}
