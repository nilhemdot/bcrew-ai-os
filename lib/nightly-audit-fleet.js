export const NIGHTLY_AUDIT_FLEET_CARD_ID = 'NIGHTLY-AUDIT-FLEET-001'
export const NIGHTLY_AUDIT_FLEET_SCRIPT_PATH = 'scripts/process-nightly-audit-fleet-check.mjs'
export const NIGHTLY_AUDIT_FLEET_JOB_KEY = 'nightly-audit-fleet'
export const NIGHTLY_AUDIT_FLEET_SCHEDULE_LOCAL_TIME = '03:05'
export const NIGHTLY_AUDIT_FLEET_SCHEDULE_TIMEZONE = 'America/Toronto'

const REQUIRED_LANE_IDS = [
  'code_quality',
  'hardcoded_truth_runtime_config',
  'extractor_god_mode_parity',
  'synthesis_director_quality',
  'source_coverage_freshness',
  'ui_brand_system',
  'process_write_boundary',
  'mission_doctrine_alignment',
]

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function lane(input = {}) {
  return {
    laneId: input.laneId,
    title: input.title,
    owner: input.owner || 'Foundation',
    severityFloor: input.severityFloor || 'P2',
    deterministicMode: input.deterministicMode !== false,
    llmMode: input.llmMode || {
      enabled: false,
      routerRequired: true,
      approvedRouteRequired: true,
      budgetRequired: true,
    },
    inputs: list(input.inputs),
    checks: list(input.checks),
    outputSchema: {
      laneId: true,
      severity: true,
      findingId: true,
      title: true,
      evidenceRefs: true,
      proposedOwnerOrCard: true,
      confidence: true,
      ...input.outputSchema,
    },
    boundaries: {
      reportOnly: true,
      autoFix: false,
      autoCreateBacklog: false,
      externalWrites: false,
      credentialMutation: false,
      providerConfigMutation: false,
      liveExtraction: false,
      ...input.boundaries,
    },
  }
}

export function buildNightlyAuditFleetRegistry() {
  return {
    cardId: NIGHTLY_AUDIT_FLEET_CARD_ID,
    version: 1,
    mode: 'report_only_deterministic_first',
    rollup: {
      jobKey: NIGHTLY_AUDIT_FLEET_JOB_KEY,
      scheduleLocalTime: NIGHTLY_AUDIT_FLEET_SCHEDULE_LOCAL_TIME,
      scheduleTimezone: NIGHTLY_AUDIT_FLEET_SCHEDULE_TIMEZONE,
      morningReport: true,
      runsBeforeSystemHealth: true,
      groupsFindingsBy: ['severity', 'laneId', 'new_worse_resolved_still_open'],
      writesBacklog: false,
      autoFix: false,
      externalWrites: false,
      markdownReportRequiresWriteReport: true,
    },
    lanes: [
      lane({
        laneId: 'code_quality',
        title: 'Code Quality Auditor',
        inputs: ['git diff/stat', 'file size inventory', 'proof command registry', 'endpoint metrics'],
        checks: ['monolith risk', 'proof weakness', 'dead code', 'duplication', 'latency/payload risk'],
      }),
      lane({
        laneId: 'hardcoded_truth_runtime_config',
        title: 'Hardcoded Truth / Runtime Config Auditor',
        severityFloor: 'P1',
        inputs: ['source contracts', 'LLM route registry', 'scheduled jobs', 'runtime config', 'UI live-state copy'],
        checks: ['hardcoded model names outside router', 'hardcoded source lists', 'hardcoded schedules or budgets', 'markdown-as-runtime-db', 'UI literals pretending to be live truth'],
      }),
      lane({
        laneId: 'extractor_god_mode_parity',
        title: 'Extractor God Mode Auditor',
        inputs: ['God Mode parity matrix', 'source-packet ledger', 'extractor run reports', 'source-family maturity'],
        checks: ['false God Mode claims', 'missing Hands', 'missing source-packet status', 'operator-excluded comments reintroduced', 'long-course routing gaps'],
      }),
      lane({
        laneId: 'synthesis_director_quality',
        title: 'Synthesis + Director Auditor',
        inputs: ['synthesis reports', 'Director reports', 'source-value grader', 'Scoper/Portfolio outputs'],
        checks: ['weak evidence promotion', 'duplicate recommendations', 'source weighting drift', 'mission-score drift', 'stale synthesis'],
      }),
      lane({
        laneId: 'source_coverage_freshness',
        title: 'Source Coverage + Freshness Auditor',
        inputs: ['creator watchlist', 'source contracts', 'source coverage matrix', 'Foundation job ledger'],
        checks: ['stale sources', 'blocked approval packets', 'missing connectors', 'S/A source catch-up gaps', 'failed extractor families'],
      }),
      lane({
        laneId: 'ui_brand_system',
        title: 'UI / Brand System Auditor',
        inputs: ['served pages', 'CSS tokens', 'design contract', 'Playwright screenshots where available'],
        checks: ['layout drift', 'card/pill misuse', 'mobile overflow', 'type scale drift', 'accessibility risk'],
      }),
      lane({
        laneId: 'process_write_boundary',
        title: 'Process / Write-Boundary Auditor',
        severityFloor: 'P1',
        inputs: ['process scripts', 'package scripts', 'scheduled jobs', 'git status discipline'],
        checks: ['check scripts that mutate', 'reports written without --write-report', 'external writes in proof paths', 'dirty-tree runtime writes', 'auto-backlog mutation'],
      }),
      lane({
        laneId: 'mission_doctrine_alignment',
        title: 'Mission / Doctrine Auditor',
        inputs: ['current plan/state', 'system strategy', 'handoffs promoted to truth', 'active sprint order'],
        checks: ['work not advancing AIOS mission', 'handoff-only promises', 'operator corrections not promoted', 'source-first violations', 'approval-gate bypass'],
      }),
    ],
  }
}

export function evaluateNightlyAuditFleetRegistry(registry = buildNightlyAuditFleetRegistry()) {
  const failures = []
  const lanes = list(registry.lanes)
  const laneIds = new Set(lanes.map(item => item.laneId))

  for (const requiredLaneId of REQUIRED_LANE_IDS) {
    if (!laneIds.has(requiredLaneId)) failures.push({ code: 'missing_required_lane', detail: requiredLaneId })
  }
  for (const item of lanes) {
    if (!text(item.title)) failures.push({ code: 'missing_lane_title', detail: item.laneId || 'missing' })
    if (!item.deterministicMode) failures.push({ code: 'lane_not_deterministic_first', detail: item.laneId })
    if (item.llmMode?.enabled === true && (!item.llmMode.routerRequired || !item.llmMode.approvedRouteRequired || !item.llmMode.budgetRequired)) {
      failures.push({ code: 'llm_lane_missing_router_budget_boundary', detail: item.laneId })
    }
    if (item.boundaries?.reportOnly !== true) failures.push({ code: 'lane_not_report_only', detail: item.laneId })
    if (item.boundaries?.autoFix !== false) failures.push({ code: 'lane_allows_auto_fix', detail: item.laneId })
    if (item.boundaries?.autoCreateBacklog !== false) failures.push({ code: 'lane_allows_auto_backlog', detail: item.laneId })
    if (item.boundaries?.externalWrites !== false) failures.push({ code: 'lane_allows_external_writes', detail: item.laneId })
    if (item.boundaries?.credentialMutation !== false) failures.push({ code: 'lane_allows_credential_mutation', detail: item.laneId })
    if (item.boundaries?.liveExtraction !== false) failures.push({ code: 'lane_allows_live_extraction', detail: item.laneId })
    for (const field of ['laneId', 'severity', 'findingId', 'title', 'evidenceRefs', 'proposedOwnerOrCard', 'confidence']) {
      if (item.outputSchema?.[field] !== true) failures.push({ code: 'lane_missing_output_schema_field', detail: `${item.laneId}:${field}` })
    }
  }

  const hardcodedLane = lanes.find(item => item.laneId === 'hardcoded_truth_runtime_config')
  if (!list(hardcodedLane?.checks).some(check => /hardcoded model names/i.test(check))) {
    failures.push({ code: 'hardcoded_lane_missing_model_truth_check', detail: hardcodedLane?.laneId || 'missing' })
  }
  if (!list(hardcodedLane?.checks).some(check => /UI literals/i.test(check))) {
    failures.push({ code: 'hardcoded_lane_missing_ui_literal_check', detail: hardcodedLane?.laneId || 'missing' })
  }

  const extractorLane = lanes.find(item => item.laneId === 'extractor_god_mode_parity')
  if (!list(extractorLane?.checks).some(check => /operator-excluded comments/i.test(check))) {
    failures.push({ code: 'extractor_lane_missing_comment_regression_check', detail: extractorLane?.laneId || 'missing' })
  }

  if (registry.rollup?.writesBacklog !== false || registry.rollup?.autoFix !== false || registry.rollup?.externalWrites !== false) {
    failures.push({ code: 'rollup_allows_side_effects', detail: 'rollup must be report-only' })
  }
  if (registry.rollup?.jobKey !== NIGHTLY_AUDIT_FLEET_JOB_KEY) {
    failures.push({ code: 'rollup_job_key_missing', detail: registry.rollup?.jobKey || 'missing' })
  }
  if (registry.rollup?.scheduleLocalTime !== NIGHTLY_AUDIT_FLEET_SCHEDULE_LOCAL_TIME || registry.rollup?.scheduleTimezone !== NIGHTLY_AUDIT_FLEET_SCHEDULE_TIMEZONE) {
    failures.push({ code: 'rollup_schedule_missing', detail: `${registry.rollup?.scheduleLocalTime || 'missing'} ${registry.rollup?.scheduleTimezone || 'missing'}` })
  }
  if (registry.rollup?.runsBeforeSystemHealth !== true) {
    failures.push({ code: 'rollup_not_before_system_health', detail: 'audit fleet must run before 05:15 system health' })
  }
  if (registry.rollup?.markdownReportRequiresWriteReport !== true) {
    failures.push({ code: 'markdown_report_write_report_gate_missing', detail: 'missing --write-report gate' })
  }

  return { ok: failures.length === 0, failures }
}

export function buildNightlyAuditFleetRollupStatus({
  registry = buildNightlyAuditFleetRegistry(),
  job = null,
  scheduledJobRow = null,
} = {}) {
  const evaluation = evaluateNightlyAuditFleetRegistry(registry)
  const lanes = list(registry.lanes)
  const laneIds = lanes.map(item => item.laneId)
  const reportOnly = registry.rollup?.writesBacklog === false &&
    registry.rollup?.autoFix === false &&
    registry.rollup?.externalWrites === false
  const failures = [
    ...evaluation.failures,
    ...(!job ? [{ code: 'scheduled_job_missing', detail: NIGHTLY_AUDIT_FLEET_JOB_KEY }] : []),
    ...(job && job.runtimeMode !== 'scheduled' ? [{ code: 'scheduled_job_not_scheduled', detail: job.runtimeMode || 'missing' }] : []),
    ...(job && job.mutationPosture !== 'read_only' ? [{ code: 'scheduled_job_not_read_only', detail: job.mutationPosture || 'missing' }] : []),
    ...(job?.scheduleLocalTime !== NIGHTLY_AUDIT_FLEET_SCHEDULE_LOCAL_TIME ? [{ code: 'scheduled_job_wrong_local_time', detail: job?.scheduleLocalTime || 'missing' }] : []),
    ...(job?.scheduleTimezone !== NIGHTLY_AUDIT_FLEET_SCHEDULE_TIMEZONE ? [{ code: 'scheduled_job_wrong_timezone', detail: job?.scheduleTimezone || 'missing' }] : []),
    ...(job?.scheduleMutationGuard?.ok === false ? [{ code: 'scheduled_job_mutation_guard_blocked', detail: job.scheduleMutationGuard.reason || 'blocked' }] : []),
    ...(!reportOnly ? [{ code: 'rollup_not_report_only', detail: 'rollup side-effect flags must be false' }] : []),
  ]

  return {
    ok: failures.length === 0,
    status: failures.length ? 'risk' : 'healthy',
    jobKey: NIGHTLY_AUDIT_FLEET_JOB_KEY,
    cardId: NIGHTLY_AUDIT_FLEET_CARD_ID,
    scheduleLocalTime: NIGHTLY_AUDIT_FLEET_SCHEDULE_LOCAL_TIME,
    scheduleTimezone: NIGHTLY_AUDIT_FLEET_SCHEDULE_TIMEZONE,
    laneCount: lanes.length,
    laneIds,
    hardcodedTruthLanePresent: laneIds.includes('hardcoded_truth_runtime_config'),
    reportOnly,
    autoFix: registry.rollup?.autoFix === true,
    writesBacklog: registry.rollup?.writesBacklog === true,
    externalWrites: registry.rollup?.externalWrites === true,
    scheduledJobStatus: scheduledJobRow?.status || null,
    latestRunStatus: job?.latestRun?.status || null,
    latestRunAt: job?.latestRun?.finishedAt || job?.latestRun?.startedAt || job?.latestRun?.createdAt || null,
    failures,
  }
}

export function buildNightlyAuditFleetDogfoodProof() {
  const validRegistry = buildNightlyAuditFleetRegistry()
  const valid = evaluateNightlyAuditFleetRegistry(validRegistry)
  const withoutHardcoded = {
    ...validRegistry,
    lanes: validRegistry.lanes.filter(item => item.laneId !== 'hardcoded_truth_runtime_config'),
  }
  const withAutoFix = {
    ...validRegistry,
    lanes: validRegistry.lanes.map(item => item.laneId === 'code_quality'
      ? { ...item, boundaries: { ...item.boundaries, autoFix: true } }
      : item),
  }
  const withUnsafeLlm = {
    ...validRegistry,
    lanes: validRegistry.lanes.map(item => item.laneId === 'mission_doctrine_alignment'
      ? { ...item, llmMode: { enabled: true, routerRequired: false, approvedRouteRequired: false, budgetRequired: false } }
      : item),
  }
  const withoutCommentGuard = {
    ...validRegistry,
    lanes: validRegistry.lanes.map(item => item.laneId === 'extractor_god_mode_parity'
      ? { ...item, checks: item.checks.filter(check => !/operator-excluded comments/i.test(check)) }
      : item),
  }

  const cases = [
    {
      name: 'valid_registry_passes',
      ok: valid.ok === true,
      validation: valid,
    },
    {
      name: 'missing_hardcoded_truth_lane_fails',
      ok: evaluateNightlyAuditFleetRegistry(withoutHardcoded).failures.some(failure => failure.code === 'missing_required_lane'),
      validation: evaluateNightlyAuditFleetRegistry(withoutHardcoded),
    },
    {
      name: 'auto_fix_fails_closed',
      ok: evaluateNightlyAuditFleetRegistry(withAutoFix).failures.some(failure => failure.code === 'lane_allows_auto_fix'),
      validation: evaluateNightlyAuditFleetRegistry(withAutoFix),
    },
    {
      name: 'unsafe_llm_lane_fails_closed',
      ok: evaluateNightlyAuditFleetRegistry(withUnsafeLlm).failures.some(failure => failure.code === 'llm_lane_missing_router_budget_boundary'),
      validation: evaluateNightlyAuditFleetRegistry(withUnsafeLlm),
    },
    {
      name: 'comment_regression_guard_missing_fails',
      ok: evaluateNightlyAuditFleetRegistry(withoutCommentGuard).failures.some(failure => failure.code === 'extractor_lane_missing_comment_regression_check'),
      validation: evaluateNightlyAuditFleetRegistry(withoutCommentGuard),
    },
  ]

  return {
    ok: cases.every(item => item.ok),
    laneCount: validRegistry.lanes.length,
    laneIds: validRegistry.lanes.map(item => item.laneId),
    cases,
  }
}
