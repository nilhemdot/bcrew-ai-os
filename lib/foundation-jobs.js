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
    budget: 'no_llm',
    command: 'npm',
    args: ['run', 'llm:auth-audit'],
    sourceIds: [],
    description: 'Seeds router config and probes model/auth paths without migrating real workloads.',
    nextAction: 'Run manually before any extraction/synthesis script is moved behind the router.',
  },
  {
    key: 'gmail-sync-current',
    title: 'Gmail Current Sync',
    jobType: 'current_sync',
    lane: 'archive',
    priority: 'P0',
    cadence: 'daily',
    enabled: true,
    runtimeMode: 'manual',
    scheduleEveryMinutes: null,
    maxRuntimeSeconds: 900,
    budget: 'connector',
    command: 'npm',
    args: ['run', 'gmail:sync-archive', '--', '--team=true', '--limit=25', '--query=newer_than:2d'],
    sourceIds: ['SRC-GMAIL-001'],
    description: 'Archives recent delegated team Gmail threads so today stays current without a manual builder-chat pull.',
    nextAction: 'Move into scheduler after the manual runner proves stable.',
  },
  {
    key: 'missive-sync-current',
    title: 'Missive Current Sync',
    jobType: 'current_sync',
    lane: 'archive',
    priority: 'P0',
    cadence: 'daily',
    enabled: true,
    runtimeMode: 'manual',
    scheduleEveryMinutes: null,
    maxRuntimeSeconds: 900,
    budget: 'connector',
    command: 'npm',
    args: ['run', 'missive:sync-archive', '--', '--all=true', '--limit=100', '--pageSize=50'],
    sourceIds: ['SRC-MISSIVE-001'],
    description: 'Archives recent Missive conversations and internal comments so email-side team context stays current.',
    nextAction: 'Move into scheduler after cursor/rate-limit behavior is consistently clean.',
  },
  {
    key: 'gmail-extract-latest',
    title: 'Gmail Candidate Extraction',
    jobType: 'extraction',
    lane: 'extract',
    priority: 'P1',
    cadence: 'after Gmail sync',
    enabled: true,
    runtimeMode: 'manual',
    scheduleEveryMinutes: null,
    maxRuntimeSeconds: 1200,
    budget: 'llm_limited',
    command: 'npm',
    args: ['run', 'gmail:extract-candidates', '--', '--limit=50'],
    sourceIds: ['SRC-GMAIL-001'],
    description: 'Extracts governed candidates from the latest archived Gmail threads.',
    nextAction: 'Replace offset-based manual chunks with unprocessed-artifact targeting.',
  },
  {
    key: 'missive-extract-latest',
    title: 'Missive Candidate Extraction',
    jobType: 'extraction',
    lane: 'extract',
    priority: 'P1',
    cadence: 'after Missive sync',
    enabled: true,
    runtimeMode: 'manual',
    scheduleEveryMinutes: null,
    maxRuntimeSeconds: 1200,
    budget: 'llm_limited',
    command: 'npm',
    args: ['run', 'missive:extract-candidates', '--', '--limit=50'],
    sourceIds: ['SRC-MISSIVE-001'],
    description: 'Extracts governed candidates from archived Missive conversations, including internal comments.',
    nextAction: 'Replace offset-based manual chunks with unprocessed-artifact targeting.',
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
    key: 'admin-deal-review-readonly',
    title: 'Admin Deal Review Read-Only',
    jobType: 'review',
    lane: 'transactions',
    priority: 'P1',
    cadence: 'daily when queued rows exist',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 360,
    maxRuntimeSeconds: 600,
    budget: 'connector',
    command: 'npm',
    args: ['run', 'deal-review:admin', '--', '--queued', '--limit=10'],
    sourceIds: ['SRC-OWNERS-001', 'SRC-FUB-001'],
    description: 'Reads queued closed deals and FUB joins without writing sheet findings.',
    nextAction: 'Keep write mode separate and approval-gated.',
  },
  {
    key: 'conditional-deal-review-readonly',
    title: 'Conditional Deal Review Read-Only',
    jobType: 'review',
    lane: 'transactions',
    priority: 'P1',
    cadence: 'daily when queued rows exist',
    enabled: true,
    runtimeMode: 'scheduled',
    scheduleEveryMinutes: 360,
    maxRuntimeSeconds: 600,
    budget: 'connector',
    command: 'npm',
    args: ['run', 'deal-review:conditional', '--', '--queued', '--limit=10'],
    sourceIds: ['SRC-OWNERS-001', 'SRC-FUB-001'],
    description: 'Reads queued conditional/listing rows and FUB joins without writing sheet findings.',
    nextAction: 'Keep write mode separate and approval-gated.',
  },
  {
    key: 'shared-comms-synthesis-v1',
    title: 'Shared Comms Synthesis V1',
    jobType: 'synthesis',
    lane: 'synthesis',
    priority: 'P0',
    cadence: 'after fresh extraction batches',
    enabled: true,
    runtimeMode: 'manual',
    scheduleEveryMinutes: null,
    maxRuntimeSeconds: 900,
    budget: 'llm_limited',
    command: 'npm',
    args: ['run', 'synthesis:brief', '--', '--limit=120', '--maxItems=12'],
    sourceIds: ['SRC-GMAIL-001', 'SRC-MISSIVE-001', 'SRC-MEETINGS-001', 'SRC-SLACK-001'],
    description: 'Turns candidates and source-backed facts into a short ranked synthesis output instead of a raw mining dump.',
    nextAction: 'Stabilize JSON/output reliability, then make this the first recurring intelligence brief job.',
  },
]

export function getFoundationJobDefinitions() {
  return foundationJobDefinitions.map(job => ({
    ...job,
    args: job.args.slice(),
    sourceIds: job.sourceIds.slice(),
  }))
}

export function getFoundationJobDefinition(jobKey) {
  const normalized = String(jobKey || '').trim()
  return getFoundationJobDefinitions().find(job => job.key === normalized) || null
}

export function getFoundationJobRuntime(job, latestRun, now = new Date()) {
  const runtimeMode = job.runtimeMode || (job.enabled ? 'manual' : 'paused')
  const scheduleEveryMinutes = Number(job.scheduleEveryMinutes) > 0 ? Number(job.scheduleEveryMinutes) : null
  const latestTime = latestRun?.finishedAt || latestRun?.startedAt || latestRun?.createdAt || null
  const latestAt = latestTime ? new Date(latestTime) : null
  const latestValid = latestAt && !Number.isNaN(latestAt.getTime())
  const running = latestRun?.status === 'running' || latestRun?.status === 'queued'

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
    }
  }

  if (!scheduleEveryMinutes) {
    return {
      runtimeMode: 'manual',
      due: false,
      nextRunAt: null,
      scheduleStatus: 'manual',
      scheduleDetail: 'No schedule interval configured.',
    }
  }

  if (!latestValid) {
    return {
      runtimeMode: 'scheduled',
      due: !running,
      nextRunAt: now.toISOString(),
      scheduleStatus: running ? 'running' : 'due',
      scheduleDetail: running ? 'Running now.' : 'Due now: no prior run recorded.',
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
  }
}
