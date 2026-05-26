import {
  PROCESS_CHECK_WRITE_FLAGS,
  parseProcessWriteFlags,
} from './process-write-guard.js'
import {
  RECURRING_DEEP_AUDIT_CADENCE,
  RECURRING_DEEP_AUDIT_JOB_KEY,
} from './recurring-deep-audit.js'
import {
  NIGHTLY_DEEP_AUDIT_JOB_KEY,
  NIGHTLY_DEEP_AUDIT_SCHEDULE_LOCAL_TIME,
  NIGHTLY_DEEP_AUDIT_SCHEDULE_TIMEZONE,
} from './nightly-deep-audit-constants.js'
import {
  FOUNDATION_LESSONS_LEARNED_LOOP_JOB_KEY,
} from './foundation-lessons-learned-loop.js'
import {
  NIGHTLY_AUDIT_FLEET_JOB_KEY,
  NIGHTLY_AUDIT_FLEET_SCHEDULE_LOCAL_TIME,
  NIGHTLY_AUDIT_FLEET_SCHEDULE_TIMEZONE,
} from './nightly-audit-fleet.js'
import {
  FOUNDATION_JOB_MUTATION_ALLOWLIST_CARD_ID,
  evaluateFoundationJobMutationAllowlist,
} from './foundation-job-mutation-allowlist.js'
import {
  buildAdminDealBacklogReviewArgs,
  buildAdminDealBacklogReviewInputs,
  buildAdminDealBacklogReviewSummary,
} from './admin-deal-policy-source-contract.js'

export const PROCESS_CHECK_SCHEDULED_MUTATION_GUARD_CARD_ID = 'PROCESS-CHECK-SCHEDULED-MUTATION-GUARD-001'

export const FOUNDATION_JOB_MUTATION_POSTURES = Object.freeze({
  readOnly: 'read_only',
  reportOnly: 'report_only',
  mutating: 'mutating',
  externalWrite: 'external_write',
  operationalWrite: 'operational_write',
  unknown: 'unknown',
})

const MUTATING_PROCESS_CHECK_FLAGS = new Set([
  PROCESS_CHECK_WRITE_FLAGS.apply,
  PROCESS_CHECK_WRITE_FLAGS.closeCard,
  PROCESS_CHECK_WRITE_FLAGS.mutateSprint,
])

function parseLocalTime(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null
  }
  return { hour, minute }
}

function localPartsForDate(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = Number(part.value)
    return acc
  }, {})
  if (parts.hour === 24) parts.hour = 0
  return parts
}

function zonedLocalTimeToUtc({ year, month, day, hour, minute, timeZone }) {
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0, 0)
  const actual = localPartsForDate(new Date(guess), timeZone)
  const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second || 0, 0)
  return new Date(guess - (actualAsUtc - guess))
}

function addLocalDays({ year, month, day }, days) {
  const next = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0, 0))
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  }
}

function nextDailyLocalRun(referenceDate, localTime, timeZone, { inclusive = false } = {}) {
  const parsed = parseLocalTime(localTime)
  if (!parsed) return null
  const reference = referenceDate instanceof Date ? referenceDate : new Date(referenceDate)
  if (Number.isNaN(reference.getTime())) return null
  let localDate = localPartsForDate(reference, timeZone)
  let candidate = zonedLocalTimeToUtc({
    year: localDate.year,
    month: localDate.month,
    day: localDate.day,
    hour: parsed.hour,
    minute: parsed.minute,
    timeZone,
  })
  const shouldAdvance = inclusive
    ? candidate.getTime() < reference.getTime()
    : candidate.getTime() <= reference.getTime()
  if (shouldAdvance) {
    localDate = addLocalDays(localDate, 1)
    candidate = zonedLocalTimeToUtc({
      year: localDate.year,
      month: localDate.month,
      day: localDate.day,
      hour: parsed.hour,
      minute: parsed.minute,
      timeZone,
    })
  }
  return candidate
}

function dailyLocalRunForReferenceDate(referenceDate, localTime, timeZone) {
  const parsed = parseLocalTime(localTime)
  if (!parsed) return null
  const reference = referenceDate instanceof Date ? referenceDate : new Date(referenceDate)
  if (Number.isNaN(reference.getTime())) return null
  const localDate = localPartsForDate(reference, timeZone)
  return zonedLocalTimeToUtc({
    year: localDate.year,
    month: localDate.month,
    day: localDate.day,
    hour: parsed.hour,
    minute: parsed.minute,
    timeZone,
  })
}

function normalizeMutationPosture(value) {
  const normalized = String(value || '').trim()
  return Object.values(FOUNDATION_JOB_MUTATION_POSTURES).includes(normalized)
    ? normalized
    : FOUNDATION_JOB_MUTATION_POSTURES.unknown
}

function getNpmScriptName(job = {}) {
  if (String(job.command || '').trim() !== 'npm') return null
  const args = Array.isArray(job.args) ? job.args.map(arg => String(arg)) : []
  const runIndex = args.indexOf('run')
  if (runIndex < 0) return null
  return args[runIndex + 1] || null
}

function getDirectScriptPath(job = {}) {
  const args = Array.isArray(job.args) ? job.args.map(arg => String(arg)) : []
  return args.find(arg => /^scripts\/process-.*-check\.mjs$/.test(arg)) || null
}

export function getFoundationJobProcessCheckDescriptor(job = {}) {
  const npmScriptName = getNpmScriptName(job)
  const directScriptPath = getDirectScriptPath(job)
  const isNpmProcessCheck = /^process:.*-check$/.test(String(npmScriptName || ''))
  const isDirectProcessCheck = /^scripts\/process-.*-check\.mjs$/.test(String(directScriptPath || ''))
  return {
    isProcessCheck: isNpmProcessCheck || isDirectProcessCheck,
    npmScriptName,
    directScriptPath,
  }
}

export function inferFoundationJobMutationPosture(job = {}) {
  const explicit = normalizeMutationPosture(job.mutationPosture)
  if (explicit !== FOUNDATION_JOB_MUTATION_POSTURES.unknown) return explicit

  const descriptor = getFoundationJobProcessCheckDescriptor(job)
  if (descriptor.isProcessCheck) {
    const enabledFlags = parseProcessWriteFlags(job.args || [])
    if ([...enabledFlags].some(flag => MUTATING_PROCESS_CHECK_FLAGS.has(flag))) {
      return FOUNDATION_JOB_MUTATION_POSTURES.mutating
    }
    if (enabledFlags.has(PROCESS_CHECK_WRITE_FLAGS.writeReport)) {
      return FOUNDATION_JOB_MUTATION_POSTURES.reportOnly
    }

    // Scheduled process checks must declare posture. Unknown check behavior is not safe to infer.
    return FOUNDATION_JOB_MUTATION_POSTURES.unknown
  }

  if (job.jobType === 'send') return FOUNDATION_JOB_MUTATION_POSTURES.externalWrite
  if (['current_sync', 'corpus_extraction', 'extraction', 'recovery', 'synthesis', 'routing', 'review', 'sync'].includes(job.jobType)) {
    return FOUNDATION_JOB_MUTATION_POSTURES.operationalWrite
  }
  return FOUNDATION_JOB_MUTATION_POSTURES.readOnly
}

export function validateFoundationJobSchedulePosture(job = {}) {
  const runtimeMode = String(job.runtimeMode || (job.enabled ? 'manual' : 'paused')).trim()
  const mutationPosture = inferFoundationJobMutationPosture(job)
  const descriptor = getFoundationJobProcessCheckDescriptor(job)
  const enabled = job.enabled !== false
  const mutationAllowlist = evaluateFoundationJobMutationAllowlist({ ...job, runtimeMode, mutationPosture })

  if (!enabled || runtimeMode !== 'scheduled') {
    return {
      ok: true,
      cardId: PROCESS_CHECK_SCHEDULED_MUTATION_GUARD_CARD_ID,
      mutationPosture,
      mutationAllowlist,
      processCheck: descriptor,
      reason: 'Not an enabled scheduled job.',
    }
  }

  if (!mutationAllowlist.ok) {
    return {
      ok: false,
      cardId: FOUNDATION_JOB_MUTATION_ALLOWLIST_CARD_ID,
      mutationPosture,
      mutationAllowlist,
      processCheck: descriptor,
      reason: mutationAllowlist.plainEnglish,
    }
  }

  if (descriptor.isProcessCheck && mutationPosture === FOUNDATION_JOB_MUTATION_POSTURES.unknown) {
    return {
      ok: false,
      cardId: PROCESS_CHECK_SCHEDULED_MUTATION_GUARD_CARD_ID,
      mutationPosture,
      mutationAllowlist,
      processCheck: descriptor,
      reason: `Scheduled process-check job ${job.key || 'unknown'} must declare mutationPosture as read_only, report_only, or mutating before the scheduler can trust it.`,
    }
  }

  if (descriptor.isProcessCheck && mutationPosture === FOUNDATION_JOB_MUTATION_POSTURES.mutating) {
    return {
      ok: false,
      cardId: PROCESS_CHECK_SCHEDULED_MUTATION_GUARD_CARD_ID,
      mutationPosture,
      mutationAllowlist,
      processCheck: descriptor,
      reason: `Scheduled process-check job ${job.key || 'unknown'} is mutating and is blocked until it becomes manual/apply-only or is split into a read-only check plus explicit apply command.`,
    }
  }

  return {
    ok: true,
    cardId: PROCESS_CHECK_SCHEDULED_MUTATION_GUARD_CARD_ID,
    mutationPosture,
    mutationAllowlist,
    processCheck: descriptor,
    reason: descriptor.isProcessCheck
      ? `Scheduled process-check job ${job.key || 'unknown'} is ${mutationPosture}.`
      : `Scheduled non-check job ${job.key || 'unknown'} is ${mutationPosture}.`,
  }
}

function normalizeFoundationJobDefinition(job = {}) {
  const mutationPosture = inferFoundationJobMutationPosture(job)
  const processCheck = getFoundationJobProcessCheckDescriptor(job)
  const mutationAllowlist = evaluateFoundationJobMutationAllowlist({ ...job, mutationPosture })
  const scheduleMutationGuard = validateFoundationJobSchedulePosture({
    ...job,
    mutationPosture,
  })
  return {
    ...job,
    mutationPosture,
    mutationAllowlist,
    processCheck,
    scheduleMutationGuard,
  }
}

export function buildScheduledMutationGuardDogfoodProof() {
  const scheduledMutatingCheck = normalizeFoundationJobDefinition({
    key: 'synthetic-mutating-process-check',
    title: 'Synthetic Mutating Process Check',
    jobType: 'health_check',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 60,
    command: 'npm',
    args: ['run', 'process:synthetic-check', '--', '--json=true', '--close-card=true'],
    sourceIds: [],
  })
  const scheduledUnknownCheck = normalizeFoundationJobDefinition({
    key: 'synthetic-unknown-process-check',
    title: 'Synthetic Unknown Process Check',
    jobType: 'health_check',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 60,
    command: 'npm',
    args: ['run', 'process:synthetic-check', '--', '--json=true'],
    sourceIds: [],
  })
  const scheduledReadOnlyCheck = normalizeFoundationJobDefinition({
    key: 'synthetic-readonly-process-check',
    title: 'Synthetic Read-Only Process Check',
    jobType: 'health_check',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 60,
    command: 'npm',
    args: ['run', 'process:synthetic-check', '--', '--json=true'],
    mutationPosture: FOUNDATION_JOB_MUTATION_POSTURES.readOnly,
    mutationAllowlist: {
      decision: 'allow',
      allowedPostures: ['read_only'],
      allowedRuntimeModes: ['scheduled'],
      reason: 'Synthetic read-only process-check proof fixture.',
    },
    sourceIds: [],
  })
  const scheduledReportOnlyCheck = normalizeFoundationJobDefinition({
    key: 'synthetic-reportonly-process-check',
    title: 'Synthetic Report-Only Process Check',
    jobType: 'health_check',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 60,
    command: 'npm',
    args: ['run', 'process:synthetic-check', '--', '--json=true', '--write-report=true'],
    mutationAllowlist: {
      decision: 'allow',
      allowedPostures: ['report_only'],
      allowedRuntimeModes: ['scheduled'],
      reason: 'Synthetic report-only process-check proof fixture.',
    },
    sourceIds: [],
  })
  const manualMutatingCheck = normalizeFoundationJobDefinition({
    key: 'synthetic-manual-mutating-process-check',
    title: 'Synthetic Manual Mutating Process Check',
    jobType: 'health_check',
    enabled: true,
    runtimeMode: 'manual',
    scheduleEveryMinutes: null,
    command: 'npm',
    args: ['run', 'process:synthetic-check', '--', '--json=true', '--close-card=true'],
    sourceIds: [],
  })
  const realVerificationRuns = normalizeFoundationJobDefinition(
    foundationJobDefinitions.find(job => job.key === 'verification-runs') || {},
  )

  const scheduledMutatingRuntime = getFoundationJobRuntime(scheduledMutatingCheck, null, new Date('2026-05-13T12:00:00.000Z'))
  const scheduledUnknownRuntime = getFoundationJobRuntime(scheduledUnknownCheck, null, new Date('2026-05-13T12:00:00.000Z'))
  const scheduledReadOnlyRuntime = getFoundationJobRuntime(scheduledReadOnlyCheck, null, new Date('2026-05-13T12:00:00.000Z'))
  const scheduledReportOnlyRuntime = getFoundationJobRuntime(scheduledReportOnlyCheck, null, new Date('2026-05-13T12:00:00.000Z'))
  const manualMutatingRuntime = getFoundationJobRuntime(manualMutatingCheck, null, new Date('2026-05-13T12:00:00.000Z'))
  const realVerificationRunsRuntime = getFoundationJobRuntime(realVerificationRuns, null, new Date('2026-05-13T12:00:00.000Z'))

  const ok = scheduledMutatingRuntime.scheduleStatus === 'blocked' &&
    scheduledMutatingRuntime.due === false &&
    scheduledUnknownRuntime.scheduleStatus === 'blocked' &&
    scheduledUnknownRuntime.due === false &&
    scheduledReadOnlyRuntime.scheduleStatus !== 'blocked' &&
    scheduledReportOnlyRuntime.scheduleStatus !== 'blocked' &&
    manualMutatingRuntime.scheduleStatus === 'manual' &&
    realVerificationRuns.mutationPosture === FOUNDATION_JOB_MUTATION_POSTURES.readOnly &&
    realVerificationRunsRuntime.scheduleStatus !== 'blocked'

  return {
    ok,
    mode: 'scheduled-process-check-mutation-guard-dogfood',
    scheduledMutatingCheck: {
      mutationPosture: scheduledMutatingCheck.mutationPosture,
      scheduleStatus: scheduledMutatingRuntime.scheduleStatus,
      due: scheduledMutatingRuntime.due,
      reason: scheduledMutatingRuntime.scheduleDetail,
    },
    scheduledUnknownCheck: {
      mutationPosture: scheduledUnknownCheck.mutationPosture,
      scheduleStatus: scheduledUnknownRuntime.scheduleStatus,
      due: scheduledUnknownRuntime.due,
      reason: scheduledUnknownRuntime.scheduleDetail,
    },
    scheduledReadOnlyCheck: {
      mutationPosture: scheduledReadOnlyCheck.mutationPosture,
      scheduleStatus: scheduledReadOnlyRuntime.scheduleStatus,
      due: scheduledReadOnlyRuntime.due,
    },
    scheduledReportOnlyCheck: {
      mutationPosture: scheduledReportOnlyCheck.mutationPosture,
      scheduleStatus: scheduledReportOnlyRuntime.scheduleStatus,
      due: scheduledReportOnlyRuntime.due,
    },
    manualMutatingCheck: {
      mutationPosture: manualMutatingCheck.mutationPosture,
      scheduleStatus: manualMutatingRuntime.scheduleStatus,
      due: manualMutatingRuntime.due,
    },
    realVerificationRuns: {
      mutationPosture: realVerificationRuns.mutationPosture,
      scheduleStatus: realVerificationRunsRuntime.scheduleStatus,
      due: realVerificationRunsRuntime.due,
      reason: realVerificationRunsRuntime.scheduleDetail,
    },
  }
}

const foundationJobDefinitions = [
  {
    key: 'foundation-verify',
    title: 'Foundation Verifier',
    jobType: 'health_check',
    lane: 'health',
    priority: 'P0',
    cadence: 'after code or source-contract changes',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 60,
    maxRuntimeSeconds: 180,
    budget: 'no_llm',
    command: 'npm',
    args: ['run', 'foundation:verify'],
    sourceIds: [],
    description: 'Runs the core Foundation smoke checks so the system knows whether repo/API/source truth still lines up.',
    nextAction: 'Run after meaningful builds and before checkpoints.',
  },
  {
    key: 'verification-runs',
    title: 'Verification Runs',
    jobType: 'health_check',
    lane: 'health',
    priority: 'P1',
    cadence: 'daily stale research/finding review',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 1440,
    maxRuntimeSeconds: 180,
    budget: 'no_llm',
    command: 'npm',
    args: ['run', 'process:verification-runs-check', '--', '--json=true'],
    mutationPosture: 'read_only',
    mutationPostureReason: 'process:verification-runs-check is read-only by default; historical closeout writeback now requires explicit --apply and is not used by the scheduler.',
    sourceIds: [],
    description: 'Builds the proposed-only stale verification report for research cards, synthesized findings, action routes, and backlog hygiene findings.',
    nextAction: 'Review surfaced stale candidates; keep V1 proposed-only until a separate write/closure card exists.',
  },
  {
    key: 'code-quality-nightly-audit',
    title: 'Code Quality Nightly Audit',
    jobType: 'health_check',
    lane: 'health',
    priority: 'P0',
    cadence: 'manual report-first until Steve approves recurring schedule',
    enabled: true,
    runtimeMode: 'manual',
    scheduleEveryMinutes: null,
    maxRuntimeSeconds: 180,
    budget: 'no_llm',
    command: 'npm',
    args: ['run', 'process:code-quality-nightly-audit-check', '--', '--json', '--write-report'],
    mutationPosture: 'report_only',
    mutationPostureReason: 'Manual report writer only; no backlog or sprint mutation is allowed from this audit command.',
    sourceIds: [],
    description: 'Runs the deterministic read-only codebase and frontend audit loop, writes the morning report, and proposes follow-up fixes without applying them.',
    nextAction: 'Review the morning report; schedule only after the recurring report quality is accepted.',
  },
  {
    key: RECURRING_DEEP_AUDIT_JOB_KEY,
    title: 'Recurring Senior-Engineer Deep Audit',
    jobType: 'review',
    lane: 'health',
    priority: 'P1',
    cadence: RECURRING_DEEP_AUDIT_CADENCE,
    enabled: true,
    runtimeMode: 'manual',
    scheduleEveryMinutes: null,
    maxRuntimeSeconds: 3600,
    budget: 'manual_llm_review_after_steve_approval',
    command: 'npm',
    args: ['run', 'process:recurring-deep-audit-check', '--', '--json'],
    mutationPosture: 'report_only',
    mutationPostureReason: 'Manual senior-engineer review contract only; no code, backlog, sprint, source-system, or external state mutation is allowed.',
    sourceIds: [],
    description: 'Runs the manually approved 4-6 sprint senior-engineer audit contract that mirrors the 2026-05-13 deep audit format and routes findings as proposals only.',
    nextAction: 'Request Steve manual approval before each run; write docs/handoffs/deep-audit-{date}.md and route any proposed cards to review only.',
  },
  {
    key: NIGHTLY_DEEP_AUDIT_JOB_KEY,
    title: 'Nightly Hybrid Deep Audit',
    jobType: 'review',
    lane: 'health',
    priority: 'P0',
    cadence: `daily ${NIGHTLY_DEEP_AUDIT_SCHEDULE_LOCAL_TIME} ${NIGHTLY_DEEP_AUDIT_SCHEDULE_TIMEZONE}`,
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 1440,
    scheduleLocalTime: NIGHTLY_DEEP_AUDIT_SCHEDULE_LOCAL_TIME,
    scheduleTimezone: NIGHTLY_DEEP_AUDIT_SCHEDULE_TIMEZONE,
    maxRuntimeSeconds: 900,
    budget: 'llm_limited_report_only',
    command: 'npm',
    args: ['run', 'process:nightly-deep-audit-upgrade-check', '--', '--json', '--write-report', '--endpointTimeoutMs=8000', '--runLlmReview'],
    mutationPosture: 'report_only',
    mutationPostureReason: 'Scheduled reviewer writes report artifacts only; no code, backlog, sprint, source-system, or external state mutation is allowed.',
    sourceIds: [],
    description: 'Runs the scheduled report-only hybrid audit Steve expected: deterministic backend/frontend scan plus changed/high-risk bounded senior review through an approved route when available; if not available, it reports degraded packet-only mode explicitly.',
    nextAction: 'Review the diff-only morning report; P0/P1 senior findings must route to proposed repair cards or the report must say the deep review degraded/not run.',
  },
  {
    key: NIGHTLY_AUDIT_FLEET_JOB_KEY,
    title: 'Nightly Specialist Audit Fleet',
    jobType: 'health_check',
    lane: 'health',
    priority: 'P0',
    cadence: `daily ${NIGHTLY_AUDIT_FLEET_SCHEDULE_LOCAL_TIME} ${NIGHTLY_AUDIT_FLEET_SCHEDULE_TIMEZONE}`,
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 1440,
    scheduleLocalTime: NIGHTLY_AUDIT_FLEET_SCHEDULE_LOCAL_TIME,
    scheduleTimezone: NIGHTLY_AUDIT_FLEET_SCHEDULE_TIMEZONE,
    maxRuntimeSeconds: 180,
    budget: 'no_llm_deterministic_report_only',
    command: 'npm',
    args: ['run', 'process:nightly-audit-fleet-check', '--', '--json'],
    mutationPosture: 'read_only',
    mutationPostureReason: 'Scheduled registry proof only; no write-report, backlog, sprint, source-system, provider, browser, or external mutation.',
    sourceIds: [],
    description: 'Runs the deterministic specialist audit-fleet registry proof after the nightly deep audit and before the 05:15 System Health rollup so hardcoded truth, extractor parity, synthesis, source freshness, UI, process, and doctrine lanes stay visible.',
    nextAction: 'System Health rolls the scheduled job and audit-fleet registry status into the morning report; proposed findings remain report-only until separate scoped repair cards exist.',
  },
  {
    key: 'system-health-nightly-audit',
    title: 'System Health Nightly Audit',
    jobType: 'health_check',
    lane: 'health',
    priority: 'P0',
    cadence: 'daily 05:15 America/Toronto',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 1440,
    scheduleLocalTime: '05:15',
    scheduleTimezone: 'America/Toronto',
    maxRuntimeSeconds: 300,
    budget: 'no_llm_report_only',
    command: 'npm',
    args: ['run', 'process:system-health-nightly-audit-check', '--', '--json', '--write-report'],
    mutationPosture: 'report_only',
    mutationPostureReason: 'Writes docs/handoffs/system-health-{date} report artifacts only; no backlog, sprint, source-system, provider, or external mutation is allowed.',
    sourceIds: [],
    description: 'Rolls up scheduled job freshness, auditor execution, verifier state, connector uptime, endpoint budgets, current sprint state, and source health into one morning health report.',
    nextAction: 'Review red/yellow system-health rows before treating Foundation as green.',
  },
  {
    key: FOUNDATION_LESSONS_LEARNED_LOOP_JOB_KEY,
    title: 'Foundation Lessons Learned Loop',
    jobType: 'review',
    lane: 'health',
    priority: 'P0',
    cadence: 'daily 05:45 America/Toronto after System Health',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 1440,
    scheduleLocalTime: '05:45',
    scheduleTimezone: 'America/Toronto',
    maxRuntimeSeconds: 180,
    budget: 'no_llm_local_private_metadata',
    command: 'npm',
    args: ['run', 'process:foundation-lessons-learned-loop-check', '--', '--json'],
    mutationPosture: 'read_only',
    mutationPostureReason: 'Reads live Foundation status and local/private memory metadata only; no backlog, sprint, source-system, provider, or external mutation is allowed from the scheduled loop.',
    sourceIds: [],
    description: 'Turns nightly audit signals, repeated failures, builder mistakes, and local/private conversation lessons into required repair/gate/card/doctrine action routes.',
    nextAction: 'If the loop reports risk, Foundation Builder owns the repair or routing before normal sprint progression continues.',
  },
  {
    key: 'connector-uptime-monitor',
    title: 'Connector Uptime Monitor',
    jobType: 'health_check',
    lane: 'health',
    priority: 'P0',
    cadence: 'every 30 minutes',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 30,
    maxRuntimeSeconds: 120,
    budget: 'no_llm_connector_metadata',
    command: 'npm',
    args: ['run', 'process:foundation-operating-reliability-check', '--', '--json', '--no-api', '--connector-only'],
    mutationPosture: 'read_only',
    mutationPostureReason: 'Connector uptime monitor reads credential/job/source metadata and writes no backlog, sprint, source-system, or external state.',
    sourceIds: ['SRC-CLICKUP-001', 'SRC-FUB-001', 'SRC-GMAIL-001', 'SRC-MISSIVE-001', 'SRC-SLACK-001', 'SRC-SUPABASE-001'],
    description: 'Builds the read-only connector uptime status used before hubs or ship gates discover source outages. System Health owns runtime and morning-health rollup.',
    nextAction: 'Review degraded/down connector rows; do not auto-fix credentials or source data from this job.',
  },
  {
    key: 'shared-comms-coverage',
    title: 'Shared Comms Coverage',
    jobType: 'health_check',
    lane: 'coverage',
    priority: 'P0',
    cadence: 'daily and after archive backfills',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 240,
    maxRuntimeSeconds: 180,
    budget: 'no_llm',
    command: 'npm',
    args: ['run', 'shared-comms:coverage'],
    sourceIds: ['SRC-GMAIL-001', 'SRC-MISSIVE-001', 'SRC-MEETINGS-001', 'SRC-SLACK-001'],
    description: 'Reports artifact/candidate coverage by source so extraction depth is visible instead of guessed.',
    nextAction: 'Run before deciding whether to backfill more or build synthesis.',
  },
  {
    key: 'llm-auth-audit',
    title: 'LLM Auth Path Audit',
    jobType: 'llm_audit',
    lane: 'model',
    priority: 'P0',
    cadence: 'before router migration and after credential changes',
    enabled: true,
    runtimeMode: 'manual',
    scheduleEveryMinutes: null,
    maxRuntimeSeconds: 180,
    budget: 'model_probe_no_extraction',
    budgetDetails: {
      modelProviderProbe: true,
      extraction: false,
      externalWrite: false,
      agentFeedbackAutoSend: false,
    },
    command: 'npm',
    args: ['run', 'llm:auth-audit'],
    sourceIds: [],
    description: 'Seeds router config and probes model/auth paths, including an explicit OpenClaw subscription model probe, without migrating real workloads.',
    nextAction: 'Run manually before any extraction/synthesis script is moved behind the router.',
  },
  {
    key: 'extraction-control-seed',
    title: 'Extraction Control Seed',
    jobType: 'control_plane',
    lane: 'extract',
    priority: 'P0',
    cadence: 'after source/backfill strategy changes',
    enabled: true,
    runtimeMode: 'manual',
    scheduleEveryMinutes: null,
    maxRuntimeSeconds: 120,
    budget: 'no_llm',
    command: 'npm',
    args: ['run', 'extraction:control-seed'],
    sourceIds: ['SRC-GMAIL-001', 'SRC-GCAL-001', 'SRC-MISSIVE-001', 'SRC-MEETINGS-001', 'SRC-SLACK-001', 'SRC-GDRIVE-001', 'SRC-SKOOL-001', 'SRC-VIDEO-001', 'SRC-LOOM-001'],
    description: 'Seeds the current-day and bounded-backfill crawl target ledger so extraction work is visible before it is automated.',
    nextAction: 'Use this as the control-plane map before scheduling current-day sync or historical backfill workers.',
  },
  {
    key: 'gmail-sync-current',
    title: 'Gmail Current Sync',
    jobType: 'current_sync',
    lane: 'archive',
    priority: 'P0',
    cadence: 'every 2 hours',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 120,
    maxRuntimeSeconds: 900,
    budget: 'connector',
    command: 'npm',
    args: ['run', 'extraction:target', '--', '--target=gmail-current-day'],
    sourceIds: ['SRC-GMAIL-001'],
    description: 'Runs recent delegated team Gmail sync through the extraction target ledger so today stays current without a manual builder-chat pull.',
    nextAction: 'Watch first scheduled runs; keep historical Gmail backfill manual until current-day stays clean.',
  },
  {
    key: 'calendar-sync-current',
    title: 'Google Calendar Current Sync',
    jobType: 'current_sync',
    lane: 'archive',
    priority: 'P1',
    cadence: 'daily 72-hour event window',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 1440,
    maxRuntimeSeconds: 600,
    budget: 'connector',
    command: 'npm',
    args: ['run', 'extraction:target', '--', '--target=calendar-current-day'],
    sourceIds: ['SRC-GCAL-001'],
    description: 'Runs a bounded read-only Google Calendar event archive through the extraction target ledger so meeting cadence context stays visible without Calendar writes.',
    nextAction: 'Watch first scheduled runs; keep Calendar candidate extraction and any invite/update automation out of scope until explicitly approved.',
  },
  {
    key: 'missive-sync-current',
    title: 'Missive Current Sync',
    jobType: 'current_sync',
    lane: 'archive',
    priority: 'P0',
    cadence: 'every 2 hours',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 120,
    maxRuntimeSeconds: 900,
    budget: 'connector',
    command: 'npm',
    args: ['run', 'extraction:target', '--', '--target=missive-current-day'],
    sourceIds: ['SRC-MISSIVE-001'],
    description: 'Runs recent Missive sync through the extraction target ledger so email-side team context, including internal comments, stays current.',
    nextAction: 'Watch first scheduled runs; keep Gmail/manual backfill off until this lane stays clean.',
  },
  {
    key: 'email-attachment-extract-bite',
    title: 'Email Attachment Extraction Bite',
    jobType: 'corpus_extraction',
    lane: 'extract',
    priority: 'P0',
    cadence: 'daily mission: five Gmail PDF/text attachment outputs',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 1440,
    maxRuntimeSeconds: 3900,
    budget: 'connector',
    command: 'npm',
    args: ['run', 'extraction:target', '--', '--target=email-attachments-backfill'],
    sourceIds: ['SRC-GMAIL-001'],
    description: 'Extracts Gmail PDF/text attachments into source-backed artifacts with explicit skips for unsupported media, Office, OCR, and calendar attachment classes.',
    nextAction: 'Run as a small daily quota mission. Add Missive attachment proof and Office/OCR/media attachment extractors as explicit follow-on lanes.',
  },
  {
    key: 'meeting-notes-sync-current',
    title: 'Meeting Notes Current Sync',
    jobType: 'current_sync',
    lane: 'archive',
    priority: 'P0',
    cadence: 'daily',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 1440,
    maxRuntimeSeconds: 900,
    budget: 'connector',
    command: 'npm',
    args: ['run', 'extraction:target', '--', '--target=meetings-current-day'],
    sourceIds: ['SRC-MEETINGS-001'],
    description: 'Runs recent Google meeting notes/transcripts through the extraction target ledger so current meeting context stays fresh.',
    nextAction: 'Run daily for new meeting notes/transcripts; use the retry job only for item-level partial failures.',
  },
  {
    key: 'meeting-notes-retry-failed',
    title: 'Meeting Notes Failed-Item Retry',
    jobType: 'recovery',
    lane: 'archive',
    priority: 'P1',
    cadence: 'after meeting crawl partial/failure',
    enabled: true,
    runtimeMode: 'manual',
    scheduleEveryMinutes: null,
    maxRuntimeSeconds: 900,
    budget: 'connector',
    command: 'npm',
    args: ['run', 'meeting-notes:retry-failed'],
    sourceIds: ['SRC-MEETINGS-001'],
    description: 'Retries only failed meeting crawl items from the source_crawl_items ledger instead of rerunning the whole current-day window.',
    nextAction: 'Run manually after a partial meeting sync; schedule only after retry semantics are proven.',
  },
  {
    key: 'extraction-retry-failed',
    title: 'Extraction Failed-Item Retry',
    jobType: 'recovery',
    lane: 'archive',
    priority: 'P1',
    cadence: 'manual after retry executor proof',
    enabled: true,
    runtimeMode: 'manual',
    scheduleEveryMinutes: null,
    maxRuntimeSeconds: 900,
    budget: 'connector',
    command: 'npm',
    args: ['run', 'extraction:retry-failed', '--', '--target=meetings-current-day', '--limit=10'],
    sourceIds: ['SRC-MEETINGS-001'],
    description: 'Runs the central failed-item retry executor against a target that has a target-specific failed-item retry path. V1 stays manual and no-write dry-run proofed before any schedule is added.',
    nextAction: 'Use dry-run first, then run manually only for eligible failed meeting crawl items. Add more targets only after their item-ID-only retry paths are proven.',
  },
  {
    key: 'slack-sync-current',
    title: 'Slack Current Sync',
    jobType: 'current_sync',
    lane: 'archive',
    priority: 'P1',
    cadence: 'daily 48-hour window',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 1440,
    maxRuntimeSeconds: 600,
    budget: 'connector',
    command: 'npm',
    args: ['run', 'extraction:target', '--', '--target=slack-current-day'],
    sourceIds: ['SRC-SLACK-001'],
    description: 'Runs recent Slack thread sync through the extraction target ledger so strategy prep can refresh Slack signal without a broad historical backfill.',
    nextAction: 'Run daily for current Slack signal; keep historical Slack as a separate extraction mission.',
  },
  {
    key: 'slack-extract-latest',
    title: 'Slack Candidate Extraction',
    jobType: 'extraction',
    lane: 'extract',
    priority: 'P1',
    cadence: 'daily history mission after Slack sync',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 1440,
    maxRuntimeSeconds: 3900,
    budget: 'llm_limited',
    command: 'npm',
    args: ['run', 'slack:extract-candidates', '--', '--onlyWithoutCandidates=true', '--limit=1'],
    sourceIds: ['SRC-SLACK-001'],
    description: 'Extracts governed candidates from archived Slack threads using the subscription route with a long worker-managed timeout.',
    nextAction: 'Run as a daily quota mission. Start at one Slack thread per day until route latency is measured cleanly, then raise the quota.',
  },
  {
    key: 'drive-corpus-inventory-bite',
    title: 'Drive Corpus Inventory Bite',
    jobType: 'corpus_inventory',
    lane: 'archive',
    priority: 'P1',
    cadence: 'daily mission: one folder inventory bite now, five filed extractions later',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 1440,
    maxRuntimeSeconds: 3900,
    budget: 'connector',
    command: 'npm',
    args: ['run', 'extraction:target', '--', '--target=drive-corpus-backfill'],
    sourceIds: ['SRC-GDRIVE-001'],
    description: 'Inventories one Google Drive corpus folder/page into the crawl ledger without moving, copying, exporting, or using an LLM.',
    nextAction: 'Run one Drive inventory bite per day until the folder queue is mapped; then add the separate filed-output extraction worker.',
  },
  {
    key: 'drive-content-extract-bite',
    title: 'Drive Content Extraction Bite',
    jobType: 'corpus_extraction',
    lane: 'extract',
    priority: 'P0',
    cadence: 'daily mission: five Drive text outputs',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 1440,
    maxRuntimeSeconds: 3900,
    budget: 'connector',
    command: 'npm',
    args: ['run', 'extraction:target', '--', '--target=drive-content-extract-backfill'],
    sourceIds: ['SRC-GDRIVE-001'],
    description: 'Extracts Google Docs, Google Sheets, PDFs, and plain text files from the Drive inventory queue into source-backed artifacts with file provenance.',
    nextAction: 'Run as a small daily quota mission. Add Slides, Office, images, and video through explicit follow-on extractors with skip reasons.',
  },
  {
    key: 'video-link-inventory-bite',
    title: 'Video Link Inventory Bite',
    jobType: 'corpus_inventory',
    lane: 'archive',
    priority: 'P1',
    cadence: 'manual daily mission: URL-manifest quota now, video extraction quota later',
    enabled: true,
    runtimeMode: 'manual',
    scheduleEveryMinutes: null,
    maxRuntimeSeconds: 3900,
    budget: 'connector',
    command: 'npm',
    args: ['run', 'extraction:target', '--', '--target=video-link-inventory'],
    sourceIds: ['SRC-VIDEO-001', 'SRC-LOOM-001', 'SRC-GDRIVE-001', 'SRC-SKOOL-001', 'SRC-GMAIL-001', 'SRC-MISSIVE-001', 'SRC-MEETINGS-001', 'SRC-SLACK-001'],
    description: 'Inventories Loom, Drive, YouTube, Vimeo, Wistia, Zoom, and Skool media links from existing archives/crawl ledgers without logging into platforms or extracting content.',
    nextAction: 'Keep as a quota mission, not a timer; validate Apify/Loom/Skool extractors on a small authorized batch before any five-video-style daily extraction mission.',
  },
  {
    key: 'youtube-creator-daily-watch',
    title: 'Public YouTube Creator Daily Watch',
    jobType: 'corpus_inventory',
    lane: 'extract',
    priority: 'P0',
    cadence: 'daily 06:30 America/Toronto',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 1440,
    scheduleLocalTime: '06:30',
    scheduleTimezone: 'America/Toronto',
    maxRuntimeSeconds: 1800,
    budget: 'public_youtube_no_auth_metadata_only',
    command: 'npm',
    args: ['run', 'youtube:creator-daily-watch', '--', '--apply', '--json'],
    mutationPosture: 'operational_write',
    mutationPostureReason: 'Writes governed source_crawl_items, a Foundation research-pool report, and proposal-only atoms/hits from public no-auth YouTube channel metadata only; no external writes, auth, comments, transcript/model calls, credential mutation, or backlog auto-creation.',
    sourceIds: ['SRC-CREATOR-WATCHLIST-001', 'SRC-YOUTUBE-INTEL-001'],
    description: 'Checks approved public YouTube creator channels daily, with Mark Kashef starting at last 50 public videos and other known public creators at last 20, then dedupes metadata into the Build Intel research pool.',
    nextAction: 'Review new source items in Dev Team Hub / Build Intel before approving extraction or backlog promotion.',
  },
  {
    key: 'youtube-god-mode-autonomous-watch-scheduler',
    title: 'YouTube God Mode Autonomous Watch Scheduler',
    jobType: 'extraction_scheduler',
    lane: 'extract',
    priority: 'P0',
    cadence: 'dry-run only until live-bounded approval and budget caps are configured',
    enabled: false,
    runtimeMode: 'manual',
    scheduleEveryMinutes: null,
    scheduleLocalTime: '07:00',
    scheduleTimezone: 'America/Toronto',
    maxRuntimeSeconds: 300,
    budget: 'gemini_api_live_bounded_requires_approval',
    command: 'npm',
    args: ['run', 'process:youtube-god-mode-autonomous-watch-scheduler-check', '--', '--json'],
    mutationPosture: 'report_only',
    mutationPostureReason: 'Builds the next public YouTube full-watch plan from source grades, duplicate history, long-course routing, retry caps, and spend caps. Disabled by default; live Gemini full-watch remains gated by explicit live-bounded approval.',
    sourceIds: ['SRC-CREATOR-WATCHLIST-001', 'SRC-YOUTUBE-INTEL-001'],
    description: 'Plans the next approved public/no-auth YouTube God Mode full-watch batch so catch-up and steady-state watching can become automatic after budget/approval proof.',
    nextAction: 'Keep disabled until focused proof and Steve-approved live-bounded budget config are in place; then enable a bounded scheduled run.',
  },
  {
    key: 'video-content-extract-bite',
    title: 'Video Content Extraction Bite',
    jobType: 'corpus_extraction',
    lane: 'extract',
    priority: 'P0',
    cadence: 'daily mission: five video transcript outputs',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 1440,
    maxRuntimeSeconds: 3900,
    budget: 'connector_plus_model_later',
    command: 'npm',
    args: ['run', 'extraction:target', '--', '--target=video-content-extract-backfill'],
    sourceIds: ['SRC-VIDEO-001', 'SRC-YOUTUBE-INTEL-001', 'SRC-LOOM-001', 'SRC-GDRIVE-001', 'SRC-SKOOL-001', 'SRC-MEETINGS-001'],
    description: 'Extracts video transcript outputs from the shared video-link manifest. V1 handles YouTube subtitles through DataForSEO; richer video understanding stays behind the multimodal extractor contract.',
    nextAction: 'Run a small daily quota. Add Drive video, Loom, Skool, Zoom, and Gemini/GPT visual review extractors one at a time behind the same queue.',
  },
  {
    key: 'gmail-extract-latest',
    title: 'Gmail Candidate Extraction',
    jobType: 'extraction',
    lane: 'extract',
    priority: 'P1',
    cadence: 'daily history mission after Gmail sync',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 1440,
    maxRuntimeSeconds: 3900,
    budget: 'llm_limited',
    command: 'npm',
    args: ['run', 'gmail:extract-candidates', '--', '--onlyWithoutCandidates=true', '--limit=3'],
    sourceIds: ['SRC-GMAIL-001'],
    description: 'Extracts governed candidates from archived Gmail threads without a successful processing run for the current content hash.',
    nextAction: 'Run as a daily quota mission until unmined Gmail backlog catches up; raise limits after route latency and spacing are stable.',
  },
  {
    key: 'missive-extract-latest',
    title: 'Missive Candidate Extraction',
    jobType: 'extraction',
    lane: 'extract',
    priority: 'P1',
    cadence: 'daily history mission after Missive sync',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 1440,
    maxRuntimeSeconds: 3900,
    budget: 'llm_limited',
    command: 'npm',
    args: ['run', 'missive:extract-candidates', '--', '--onlyWithoutCandidates=true', '--limit=3'],
    sourceIds: ['SRC-MISSIVE-001'],
    description: 'Extracts governed candidates from archived Missive conversations without a successful processing run for the current content hash, including internal comments.',
    nextAction: 'Run as a daily quota mission until unmined Missive backlog catches up; raise limits after route latency and spacing are stable.',
  },
  {
    key: 'meeting-transcript-gaps',
    title: 'Meeting Transcript Gap Report',
    jobType: 'health_check',
    lane: 'coverage',
    priority: 'P1',
    cadence: 'weekly',
    enabled: true,
    runtimeMode: 'manual',
    scheduleEveryMinutes: null,
    maxRuntimeSeconds: 300,
    budget: 'connector',
    command: 'npm',
    args: ['run', 'meeting-notes:report-gaps'],
    sourceIds: ['SRC-MEETINGS-001'],
    description: 'Finds recurring meetings and organizers with missing transcripts so Meet defaults can be fixed.',
    nextAction: 'Run after the next few meetings to confirm the Gemini default change worked.',
  },
  {
    key: 'meeting-transcript-recent-gap-verify',
    title: 'Meeting Recent Gap Verifier',
    jobType: 'health_check',
    lane: 'coverage',
    priority: 'P1',
    cadence: 'after recent gap report shows missing transcript artifacts',
    enabled: true,
    runtimeMode: 'manual',
    scheduleEveryMinutes: null,
    maxRuntimeSeconds: 3900,
    budget: 'connector',
    command: 'npm',
    args: ['run', 'meeting-notes:verify-recent-gaps', '--', '--days=14'],
    sourceIds: ['SRC-MEETINGS-001'],
    description: 'Classifies recent missing transcript artifacts as true missing, parser/tab miss, owner/account path issue, or meeting-key mismatch before meeting sync is scheduled.',
    nextAction: 'Run manually; use the repair command only for parser/account misses after the report is reviewed.',
  },
  {
    key: 'meeting-transcripts-extract-backlog',
    title: 'Meeting Transcript Extraction Backlog',
    jobType: 'extraction',
    lane: 'extract',
    priority: 'P1',
    cadence: 'daily history mission until transcript backlog clears',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 1440,
    maxRuntimeSeconds: 3900,
    budget: 'llm_limited',
    command: 'npm',
    args: ['run', 'meeting-notes:extract-candidates', '--', '--onlyWithoutCandidates=true', '--limit=3'],
    sourceIds: ['SRC-MEETINGS-001'],
    description: 'Mines archived meeting transcripts without a successful processing run for the current content hash using the subscription route with long per-call windows.',
    nextAction: 'Run as a daily quota mission until unmined meeting transcripts catch up; then keep it as the daily extraction lane for new transcripts.',
  },
  {
    key: 'admin-deal-review-readonly',
    title: 'Admin Deal Review Inspection',
    jobType: 'review',
    lane: 'transactions',
    priority: 'P1',
    cadence: 'every 8 hours: marked Admin re-reviews only',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 480,
    maxRuntimeSeconds: 600,
    budget: 'connector',
    command: 'npm',
    args: ['run', 'deal-review:admin', '--', '--queued', '--limit=10', '--write'],
    sourceIds: ['SRC-OWNERS-001', 'SRC-FUB-001'],
    servesHubs: ['ops'],
    systemSummary: 'Inspects marked Admin deal re-reviews where Ops changed THIS ROW ONLY: REVIEW ACTION to Review This Deal. Scheduled writeback only populates AI review status, action, and findings; it does not auto-fix source fields.',
    systemInputs: ['SRC-OWNERS-001 Admin deal rows', 'SRC-FUB-001 person records', 'Queued review action cells'],
    systemOutputs: ['Ops inbox issue cards', 'AI review status/action/findings in the Admin tab', 'Foundation job run status'],
    description: 'Runs explicit Admin re-reviews after Ops fixes source rows.',
    nextAction: 'Keep source-field corrections human-owned until Ops approves an apply/fix lane.',
  },
  {
    key: 'admin-deal-backlog-review',
    title: 'Admin Deal Backlog Inspection',
    jobType: 'review',
    lane: 'transactions',
    priority: 'P1',
    cadence: 'daily: five newest eligible Admin backlog deals',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 1440,
    maxRuntimeSeconds: 1200,
    budget: 'connector',
    command: 'npm',
    args: buildAdminDealBacklogReviewArgs(),
    sourceIds: ['SRC-OWNERS-001', 'SRC-FUB-001', 'SRC-CLICKUP-001'],
    servesHubs: ['ops'],
    systemSummary: buildAdminDealBacklogReviewSummary(),
    systemInputs: buildAdminDealBacklogReviewInputs(),
    systemOutputs: ['Ops inbox issue cards', 'AI review status/action/findings in the Admin tab', 'Foundation job run status'],
    description: 'Runs the paced first-pass Admin backlog inspection lane for mature firm deals.',
    nextAction: 'Keep source-field corrections human-owned until Ops approves an apply/fix lane.',
  },
  {
    key: 'conditional-deal-review-readonly',
    title: 'Conditional Deal Forecast Sync',
    jobType: 'sync',
    lane: 'transactions',
    priority: 'P1',
    cadence: 'every 4 hours: rebuild ClickUp conditional forecast',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 240,
    maxRuntimeSeconds: 600,
    budget: 'connector',
    command: 'npm',
    args: ['run', 'clickup:conditional-forecast'],
    sourceIds: ['SRC-CLICKUP-001', 'SRC-OWNERS-001'],
    servesHubs: ['ops'],
    systemSummary: 'Rebuilds the Owners Dashboard Listings and Conditional Deals tab from ClickUp Deal Data Entry conditional tasks. Buyer/seller conditional tags determine the lane; mutual-release tags are excluded as dead deals. The generated sheet preserves a Review This Conditional action for fixed rows that need a re-check and buckets conditional Net To Team into rolling closing-date collection-month forecast windows.',
    systemInputs: ['SRC-CLICKUP-001 Deal Data Entry conditional tasks', 'ClickUp buyer/seller conditional tags', 'ClickUp mutual-release tags'],
    systemOutputs: ['ClickUp-generated Listings and Conditional Deals forecast', 'Conditional pipeline missing-data summary', 'Foundation job run status'],
    description: 'Keeps the conditional forecast sheet source-backed from ClickUp instead of the disconnected legacy conditional sheet.',
    nextAction: 'Use the preserved Review This Conditional action for missing-data re-checks; keep closing dates maintained so the collection-month buckets remain true cash-date forecasting instead of conditional-deadline forecasting.',
  },
  {
    key: 'agent-roster-review',
    title: 'Agent Onboarding / Roster Inspection',
    jobType: 'review',
    lane: 'people',
    priority: 'P1',
    cadence: 'every 8 hours: inspect ClickUp Agent onboarding and roster accountability',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 480,
    maxRuntimeSeconds: 300,
    budget: 'connector',
    command: 'npm',
    args: ['run', 'agent-roster:review'],
    sourceIds: ['SRC-CLICKUP-001'],
    servesHubs: ['ops'],
    systemSummary: 'Reads the ClickUp Agent Roster as the v1 people-accountability source, surfaces roster blockers, and writes 30/60/90 onboarding-feedback results back to the roster status/score/feedback fields.',
    systemInputs: ['SRC-CLICKUP-001 Agent Roster list', 'Contract Link and contract package fields', 'Roster baseline fields', 'Onboarding NPS 30/60/90 fields'],
    systemOutputs: ['Ops inbox roster accountability cards', 'Foundation job run status'],
    description: 'Keeps the agent roster accountable and mirrors private onboarding-feedback responses back into ClickUp result fields.',
    nextAction: 'Steve, Carson, and Clare will hide/delete field clutter manually; AIOS should only validate the roster source and surface real missing accountability items.',
  },
  {
    key: 'agent-feedback-auto-send-readiness',
    title: 'Agent Feedback Production Auto-Send',
    jobType: 'send',
    lane: 'people',
    priority: 'P1',
    cadence: 'daily governed production send',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 1440,
    scheduleLocalTime: '08:30',
    scheduleTimezone: 'America/Toronto',
    maxRuntimeSeconds: 300,
    budget: 'connector',
    command: 'npm',
    args: ['run', 'agent-feedback:auto-send', '--', '--mode=live', '--includeCandidates=false'],
    sourceIds: ['SRC-CLICKUP-001'],
    servesHubs: ['ops'],
    systemSummary: 'Scans the ClickUp Agent Roster for 30/60/90 onboarding feedback candidates, sends only when the live guard is approved and the local send window is open, and writes ClickUp Requested only after Gmail succeeds.',
    systemInputs: ['SRC-CLICKUP-001 Agent Roster tasks', 'Real Start Date', 'Company Email only for Agent Feedback recipients', 'Onboarding NPS 30/60/90 fields'],
    systemOutputs: ['Production send/skipped/blocked/warning/repair counts', 'Runtime Health/Ops live-state proof', 'No raw emails, token URLs, or feedback content in broad proof'],
    description: 'Runs governed Agent Onboarding Feedback production auto-send at 8:30 AM America/Toronto. It fails closed unless AGENT_FEEDBACK_AUTO_SEND_ENABLED=true, the approved production artifact is present, and the local send window is open.',
    nextAction: 'Monitor the daily run and repair any Gmail-success/ClickUp-Requested writeback failures without resending.',
  },
  {
    key: 'agent-feedback-reminder-readiness',
    title: 'Agent Feedback Live Reminders',
    jobType: 'send',
    lane: 'people',
    priority: 'P1',
    cadence: 'daily governed reminder send',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 1440,
    scheduleLocalTime: '08:30',
    scheduleTimezone: 'America/Toronto',
    maxRuntimeSeconds: 300,
    budget: 'connector',
    command: 'npm',
    args: ['run', 'agent-feedback:reminders', '--', '--mode=live', '--includeCandidates=false'],
    sourceIds: ['SRC-CLICKUP-001'],
    servesHubs: ['ops'],
    systemSummary: 'Sends onboarding feedback reminders only after an initial request is successfully marked Requested, with the live guard approved and the local send window open. Reminder sends do not write ClickUp Requested.',
    systemInputs: ['SRC-CLICKUP-001 Agent Roster tasks', 'agent_onboarding_feedback_send_attempts', 'agent_onboarding_feedback_reminder_attempts', 'agent_onboarding_feedback_responses'],
    systemOutputs: ['Live reminder sent/skipped/blocked/maxed-out/repair counts', 'Runtime Health/Ops live-state proof', 'No raw emails, token URLs, or feedback content in broad proof'],
    description: 'Runs governed Agent Onboarding Feedback reminder sends at 8:30 AM America/Toronto. It fails closed unless AGENT_FEEDBACK_REMINDERS_ENABLED=true, the approved reminder artifact is present, and the local send window is open.',
    nextAction: 'Monitor daily reminder runs and repair any reminder ledger repair states without resending duplicate slots.',
  },
  {
    key: 'shared-comms-intelligence-bite',
    title: 'Strategy Intelligence Synthesis Bite',
    jobType: 'intelligence_bite',
    lane: 'synthesis',
    priority: 'P0',
    cadence: 'manual during strategy prep or action review',
    enabled: true,
    runtimeMode: 'manual',
    scheduleEveryMinutes: null,
    maxRuntimeSeconds: 3900,
    budget: 'llm_limited',
    command: 'npm',
    args: ['run', 'shared-comms:intelligence-bite'],
    sourceIds: ['SRC-GMAIL-001', 'SRC-MISSIVE-001', 'SRC-MEETINGS-001', 'SRC-SLACK-001'],
    description: 'Synthesizes already-mined shared-comms candidates into Strategy Hub/action-router input. Extraction miners run separately so slow subscription calls do not block leadership work.',
    nextAction: 'Run monitored synthesis-only proofs, then route synthesized items into decisions, contradictions, and owner-bound actions.',
  },
  {
    key: 'shared-comms-synthesis-v1',
    title: 'Shared Comms Strategy Synthesis V1',
    jobType: 'synthesis',
    lane: 'synthesis',
    priority: 'P0',
    cadence: 'after fresh extraction batches',
    enabled: true,
    runtimeMode: 'manual',
    scheduleEveryMinutes: null,
    maxRuntimeSeconds: 3900,
    budget: 'llm_limited',
    command: 'npm',
    args: ['run', 'synthesis:brief', '--', '--limit=120', '--maxItems=12'],
    sourceIds: ['SRC-GMAIL-001', 'SRC-MISSIVE-001', 'SRC-MEETINGS-001', 'SRC-SLACK-001'],
    description: 'Turns candidates and source-backed facts into ranked Strategy Hub/action-router input instead of a raw mining dump.',
    nextAction: 'Run monitored subscription-route proofs with the long synthesis timeout, then connect outputs to the action router.',
  },
  {
    key: 'intelligence-synthesis-spine-refresh',
    title: 'Intelligence Spine Synthesis Refresh',
    jobType: 'synthesis',
    lane: 'synthesis',
    priority: 'P0',
    cadence: 'daily governed spine refresh',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 1440,
    maxRuntimeSeconds: 3900,
    budget: 'llm_limited',
    command: 'npm',
    args: ['run', 'intelligence:synthesis-refresh'],
    sourceIds: ['SRC-GMAIL-001', 'SRC-MISSIVE-001', 'SRC-MEETINGS-001', 'SRC-SLACK-001'],
    description: 'Keeps the source -> atom -> chunk -> embedding -> fact -> synthesis spine alive on a scheduled worker path instead of depending on manual builder proof runs.',
    nextAction: 'Use as the v1 scheduled refresh lane; proofs remain manual and backlog-mutating acceptance checks stay out of the worker schedule.',
  },
  {
    key: 'intelligence-action-router-proposals',
    title: 'Intelligence Action Router Proposals',
    jobType: 'routing',
    lane: 'action',
    priority: 'P0',
    cadence: 'daily after synthesis refresh',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 1440,
    maxRuntimeSeconds: 600,
    budget: 'no_llm',
    command: 'npm',
    args: ['run', 'intelligence:action-router-proposals'],
    sourceIds: ['SRC-GMAIL-001', 'SRC-MISSIVE-001', 'SRC-MEETINGS-001', 'SRC-SLACK-001'],
    description: 'Creates pending, human-approval-required routes from governed synthesized items into decisions, backlog, open questions, ignore/snooze, and owner-bound action lanes.',
    nextAction: 'Review pending routes before applying destination writes. No route lands in an operating ledger without explicit human approval.',
  },
  {
    key: 'strategy-evidence-packet-v1',
    title: 'Strategy Evidence Packet V1',
    jobType: 'synthesis',
    lane: 'strategy',
    priority: 'P0',
    cadence: 'manual during quarterly strategy prep',
    enabled: true,
    runtimeMode: 'manual',
    scheduleEveryMinutes: null,
    maxRuntimeSeconds: 3900,
    budget: 'llm_limited',
    command: 'npm',
    args: ['run', 'strategy:evidence-packet', '--', '--limit=180', '--artifactLimit=28', '--maxItems=18'],
    sourceIds: [
      'SRC-STRATEGY-001',
      'SRC-GDRIVE-001',
      'SRC-MEETINGS-001',
      'SRC-GMAIL-001',
      'SRC-MISSIVE-001',
      'SRC-SLACK-001',
      'SRC-YOUTUBE-INTEL-001',
      'SRC-FUB-001',
      'SRC-SUPABASE-001',
      'SRC-FINANCE-001',
      'SRC-OWNERS-001',
      'SRC-CLICKUP-001',
    ],
    servesHubs: ['strategy'],
    description: 'Builds the owner-level strategy packet from mined candidates, direct Drive/video strategy artifacts, source-backed operating facts, current strategy docs, backlog, decisions, and extraction/runtime coverage.',
    nextAction: 'Use the generated packet for Steve strategy review, then route accepted issues into Strategic Execution, Decisions, Backlog, and Action Router.',
  },
]

export function getFoundationJobDefinitions() {
  return foundationJobDefinitions.map(job => {
    const normalized = normalizeFoundationJobDefinition(job)
    return {
      ...normalized,
      args: normalized.args.slice(),
      sourceIds: normalized.sourceIds.slice(),
      servesHubs: Array.isArray(normalized.servesHubs) ? normalized.servesHubs.slice() : undefined,
    }
  })
}

export function getFoundationJobDefinition(jobKey) {
  const normalized = String(jobKey || '').trim()
  return getFoundationJobDefinitions().find(job => job.key === normalized) || null
}

export function buildFoundationJobRuntimeScheduleDogfoodProof() {
  const job = getFoundationJobDefinition(NIGHTLY_DEEP_AUDIT_JOB_KEY)
  const beforeSchedule = getFoundationJobRuntime(job, null, new Date('2026-05-16T06:59:00.000Z'))
  const afterSchedule = getFoundationJobRuntime(job, null, new Date('2026-05-16T07:01:00.000Z'))
  const exactSchedule = getFoundationJobRuntime(job, null, new Date('2026-05-16T07:00:00.000Z'))
  const latestSucceeded = getFoundationJobRuntime(
    job,
    { status: 'succeeded', startedAt: '2026-05-16T07:00:01.000Z', finishedAt: '2026-05-16T07:02:00.000Z' },
    new Date('2026-05-16T08:00:00.000Z'),
  )
  const latestRunning = getFoundationJobRuntime(
    job,
    { status: 'running', startedAt: '2026-05-16T07:00:01.000Z' },
    new Date('2026-05-16T07:01:00.000Z'),
  )
  const oldNoLatestNextRun = nextDailyLocalRun(
    new Date('2026-05-16T07:01:00.000Z'),
    NIGHTLY_DEEP_AUDIT_SCHEDULE_LOCAL_TIME,
    NIGHTLY_DEEP_AUDIT_SCHEDULE_TIMEZONE,
    { inclusive: true },
  )

  const checks = [
    {
      ok: beforeSchedule.scheduleStatus === 'scheduled' &&
        beforeSchedule.due === false &&
        beforeSchedule.nextRunAt === '2026-05-16T07:00:00.000Z',
      check: 'no latest run before local schedule stays scheduled for today',
      detail: `${beforeSchedule.scheduleStatus}/${beforeSchedule.due}/${beforeSchedule.nextRunAt}`,
    },
    {
      ok: exactSchedule.scheduleStatus === 'due' &&
        exactSchedule.due === true &&
        exactSchedule.nextRunAt === '2026-05-16T07:00:00.000Z',
      check: 'no latest run at local schedule is due now',
      detail: `${exactSchedule.scheduleStatus}/${exactSchedule.due}/${exactSchedule.nextRunAt}`,
    },
    {
      ok: afterSchedule.scheduleStatus === 'due' &&
        afterSchedule.due === true &&
        afterSchedule.nextRunAt === '2026-05-16T07:00:00.000Z',
      check: 'no latest run after local schedule is due now instead of tomorrow',
      detail: `${afterSchedule.scheduleStatus}/${afterSchedule.due}/${afterSchedule.nextRunAt}`,
    },
    {
      ok: oldNoLatestNextRun?.toISOString() === '2026-05-17T07:00:00.000Z' &&
        afterSchedule.nextRunAt !== oldNoLatestNextRun.toISOString(),
      check: 'dogfood recreates old skipped-first-run tomorrow rollover',
      detail: `old=${oldNoLatestNextRun?.toISOString() || 'missing'} new=${afterSchedule.nextRunAt}`,
    },
    {
      ok: latestSucceeded.scheduleStatus === 'scheduled' &&
        latestSucceeded.due === false &&
        latestSucceeded.nextRunAt === '2026-05-17T07:00:00.000Z',
      check: 'latest successful run schedules the next local day',
      detail: `${latestSucceeded.scheduleStatus}/${latestSucceeded.due}/${latestSucceeded.nextRunAt}`,
    },
    {
      ok: latestRunning.scheduleStatus === 'running' &&
        latestRunning.due === false,
      check: 'running latest run blocks duplicate due state',
      detail: `${latestRunning.scheduleStatus}/${latestRunning.due}/${latestRunning.nextRunAt}`,
    },
  ]

  return {
    ok: checks.every(check => check.ok),
    mode: 'foundation-job-runtime-schedule-dogfood',
    jobKey: NIGHTLY_DEEP_AUDIT_JOB_KEY,
    scheduleLocalTime: NIGHTLY_DEEP_AUDIT_SCHEDULE_LOCAL_TIME,
    scheduleTimezone: NIGHTLY_DEEP_AUDIT_SCHEDULE_TIMEZONE,
    checks,
    beforeSchedule,
    exactSchedule,
    afterSchedule,
    latestSucceeded,
    latestRunning,
    oldNoLatestNextRunAt: oldNoLatestNextRun?.toISOString() || null,
  }
}

export function getFoundationJobRuntime(job, latestRun, now = new Date()) {
  const runtimeMode = job.runtimeMode || (job.enabled ? 'manual' : 'paused')
  const scheduleEveryMinutes = Number(job.scheduleEveryMinutes) > 0 ? Number(job.scheduleEveryMinutes) : null
  const latestTime = latestRun?.finishedAt || latestRun?.startedAt || latestRun?.createdAt || null
  const latestAt = latestTime ? new Date(latestTime) : null
  const latestValid = latestAt && !Number.isNaN(latestAt.getTime())
  const running = latestRun?.status === 'running' || latestRun?.status === 'queued'
  const scheduleLocalTime = String(job.scheduleLocalTime || '').trim()
  const scheduleTimezone = String(job.scheduleTimezone || '').trim() || 'America/Toronto'

  if (runtimeMode === 'decommissioned') {
    return {
      runtimeMode: 'decommissioned',
      due: false,
      nextRunAt: null,
      scheduleStatus: 'decommissioned',
      scheduleDetail: job.pauseReason ? `Decommissioned: ${job.pauseReason}` : 'Decommissioned and blocked from scheduled/manual runs.',
    }
  }

  if (!job.enabled || runtimeMode === 'paused') {
    return {
      runtimeMode: 'paused',
      due: false,
      nextRunAt: null,
      scheduleStatus: 'paused',
      scheduleDetail: job.pauseReason ? `Paused: ${job.pauseReason}` : 'Paused or disabled.',
    }
  }

  if (runtimeMode !== 'scheduled') {
    return {
      runtimeMode: 'manual',
      due: false,
      nextRunAt: null,
      scheduleStatus: 'manual',
      scheduleDetail: 'Manual-only until explicitly scheduled.',
      scheduleMutationGuard: validateFoundationJobSchedulePosture({ ...job, runtimeMode }),
    }
  }

  const scheduleMutationGuard = validateFoundationJobSchedulePosture({ ...job, runtimeMode })
  if (!scheduleMutationGuard.ok) {
    return {
      runtimeMode: 'blocked',
      due: false,
      nextRunAt: null,
      scheduleStatus: 'blocked',
      scheduleDetail: scheduleMutationGuard.reason,
      scheduleMutationGuard,
    }
  }

  if (!scheduleEveryMinutes) {
    return {
      runtimeMode: 'manual',
      due: false,
      nextRunAt: null,
      scheduleStatus: 'manual',
      scheduleDetail: 'No schedule interval configured.',
      scheduleMutationGuard,
    }
  }

  if (scheduleLocalTime) {
    const nextRun = latestValid
      ? nextDailyLocalRun(latestAt, scheduleLocalTime, scheduleTimezone)
      : dailyLocalRunForReferenceDate(now, scheduleLocalTime, scheduleTimezone)
    if (!nextRun) {
      return {
      runtimeMode: 'scheduled',
      due: false,
      nextRunAt: null,
      scheduleStatus: 'risk',
      scheduleDetail: `Invalid local schedule time: ${scheduleLocalTime}.`,
      scheduleMutationGuard,
    }
  }
    const due = !running && nextRun.getTime() <= now.getTime()
    const minutesUntilDue = Math.ceil((nextRun.getTime() - now.getTime()) / 60000)

    return {
      runtimeMode: 'scheduled',
      due,
      nextRunAt: nextRun.toISOString(),
      scheduleStatus: running ? 'running' : due ? 'due' : 'scheduled',
      scheduleDetail: running
        ? 'Running now.'
        : due
          ? `Due now. Scheduled daily at ${scheduleLocalTime} ${scheduleTimezone}.`
          : `Next run in ${Math.max(0, minutesUntilDue)} minutes. Scheduled daily at ${scheduleLocalTime} ${scheduleTimezone}.`,
      scheduleMutationGuard,
    }
  }

  if (!latestValid) {
    return {
      runtimeMode: 'scheduled',
      due: !running,
      nextRunAt: now.toISOString(),
      scheduleStatus: running ? 'running' : 'due',
      scheduleDetail: running ? 'Running now.' : 'Due now: no prior run recorded.',
      scheduleMutationGuard,
    }
  }

  const nextRun = new Date(latestAt.getTime() + scheduleEveryMinutes * 60 * 1000)
  const due = !running && nextRun.getTime() <= now.getTime()
  const minutesUntilDue = Math.ceil((nextRun.getTime() - now.getTime()) / 60000)

  return {
    runtimeMode: 'scheduled',
    due,
    nextRunAt: nextRun.toISOString(),
    scheduleStatus: running ? 'running' : due ? 'due' : 'scheduled',
    scheduleDetail: running
      ? 'Running now.'
      : due
        ? `Due now. Scheduled every ${scheduleEveryMinutes} minutes.`
        : `Next run in ${Math.max(0, minutesUntilDue)} minutes.`,
    scheduleMutationGuard,
  }
}
