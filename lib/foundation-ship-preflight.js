import {
  LLM_AUTH_AUDIT_JOB_KEY,
  LLM_AUTH_AUDIT_REQUIRED_CREDENTIALS,
  LLM_AUTH_AUDIT_REQUIRED_PROBES,
  LLM_AUTH_AUDIT_REQUIRED_ROUTES,
  buildLlmAuthAuditStatus,
} from './llm-auth-audit-proof.js'
import {
  FILE_SIZE_ENGINEERING_STANDARD_CARD_ID,
  buildFoundationFileSizeShipGateStatus,
} from './foundation-file-size-standard.js'
import {
  LLM_AUTH_AUDIT_MODEL_PROBE_BUDGET,
} from './llm-auth-audit-budget-label-clarity.js'

export const SHIP_GATE_FAST_PREFLIGHT_CARD_ID = 'SHIP-GATE-FAST-PREFLIGHT-001'
export const SHIP_GATE_FRESHNESS_OWNERSHIP_CARD_ID = 'SHIP-GATE-FRESHNESS-OWNERSHIP-001'
export const FOUNDATION_SHIP_PREFLIGHT_SCRIPT_PATH = 'scripts/process-foundation-ship-preflight.mjs'
export const LLM_AUTH_AUDIT_REPAIR_COMMAND = 'npm run foundation:job -- --job=llm-auth-audit --actor=codex-llm-auth-audit-proof'

const DEFAULT_MAX_AGE_HOURS = 24

function asList(value) {
  return Array.isArray(value) ? value : []
}

function isoHoursAgo(hours, now) {
  return new Date(now.getTime() - (Number(hours) || 0) * 3600000).toISOString()
}

function latestRunForJob(foundationJobs = {}, jobKey) {
  return asList(foundationJobs.latestRuns).find(run => run.jobKey === jobKey) ||
    asList(foundationJobs.jobs).find(job => job.key === jobKey)?.latestRun ||
    null
}

function ageHours(value, now) {
  const timestamp = value ? new Date(value).getTime() : NaN
  if (!Number.isFinite(timestamp)) return Infinity
  return Math.max(0, (now.getTime() - timestamp) / 3600000)
}

function formatAge(value, now) {
  const age = ageHours(value, now)
  return Number.isFinite(age) ? Math.round(age * 10) / 10 : null
}

function makeAcceptedValue(accepted) {
  return Array.isArray(accepted) ? accepted[0] : accepted
}

export function buildLlmAuthAuditFixture({
  now = new Date(),
  stale = false,
  missingJob = false,
  missingProbe = false,
  maxAgeHours = DEFAULT_MAX_AGE_HOURS,
} = {}) {
  const freshTimestamp = now.toISOString()
  const staleTimestamp = isoHoursAgo(maxAgeHours + 2, now)
  const timestamp = stale ? staleTimestamp : freshTimestamp
  const credentials = LLM_AUTH_AUDIT_REQUIRED_CREDENTIALS.map(expected => ({
    credentialKey: expected.credentialKey,
    status: expected.acceptedStatuses[0],
    policyClassification: makeAcceptedValue(expected.policyClassification),
  }))
  const routes = LLM_AUTH_AUDIT_REQUIRED_ROUTES.map(expected => ({
    routeKey: expected.routeKey,
    status: expected.acceptedStatuses[0],
    policyClassification: makeAcceptedValue(expected.policyClassification),
    riskClass: 'approved_fixture',
  }))
  const recentProbes = LLM_AUTH_AUDIT_REQUIRED_PROBES
    .filter((_expected, index) => !(missingProbe && index === 0))
    .map(expected => ({
      provider: expected.provider,
      authPath: expected.authPath,
      probeType: expected.probeType,
      status: expected.acceptedStatuses[0],
      probedAt: timestamp,
    }))
  const latestRuns = missingJob ? [] : [{
    runId: stale ? 'fixture-stale-llm-auth-audit' : 'fixture-fresh-llm-auth-audit',
    jobKey: LLM_AUTH_AUDIT_JOB_KEY,
    status: 'succeeded',
    finishedAt: timestamp,
    updatedAt: timestamp,
    requestedBy: 'dogfood',
    command: {
      command: 'npm',
      args: ['run', 'llm:auth-audit'],
    },
  }]
  const recentCalls = [{
    callId: stale ? 'fixture-stale-route-selection' : 'fixture-fresh-route-selection',
    routeKey: 'foundation-synthesis-openai-api',
    status: 'skipped',
    createdAt: timestamp,
    startedAt: timestamp,
    metadata: {
      proof: 'llm-auth-audit-route-selection',
      dryRun: true,
      reason: 'Router MVP records route selection only; no provider call made.',
    },
  }]

  return {
    llmRuntime: {
      credentials,
      routes,
      recentProbes,
      recentCalls,
    },
    foundationJobs: {
      latestRuns,
      jobs: [{
        key: LLM_AUTH_AUDIT_JOB_KEY,
        budget: LLM_AUTH_AUDIT_MODEL_PROBE_BUDGET,
        runtimeMode: 'manual',
        mutationPosture: 'read_only',
        budgetDetails: {
          modelProviderProbe: true,
          extraction: false,
          externalWrite: false,
          agentFeedbackAutoSend: false,
        },
        latestRun: latestRuns[0] || null,
      }],
    },
  }
}

export function buildShipFreshnessOwnershipRows({
  llmAuthAuditStatus,
  foundationJobs = {},
  now = new Date(),
  maxAgeHours = DEFAULT_MAX_AGE_HOURS,
} = {}) {
  const latestJob = latestRunForJob(foundationJobs, LLM_AUTH_AUDIT_JOB_KEY)
  const finishedAt = latestJob?.finishedAt || latestJob?.updatedAt || latestJob?.createdAt || null
  const stale = llmAuthAuditStatus?.status !== 'healthy'
  return [{
    key: 'llm-auth-audit-freshness',
    cardId: 'LLM-AUTH-AUDIT-001',
    owner: 'Foundation Process',
    posture: 'manual',
    status: stale ? 'blocked' : 'healthy',
    blocking: stale,
    maxAgeHours,
    ageHours: formatAge(finishedAt, now),
    latestRun: latestJob ? {
      runId: latestJob.runId,
      status: latestJob.status,
      finishedAt: latestJob.finishedAt,
      requestedBy: latestJob.requestedBy,
    } : null,
    repairCommand: LLM_AUTH_AUDIT_REPAIR_COMMAND,
    detail: stale
      ? 'LLM auth audit truth is stale or incomplete. Run the approved manual job, then rerun the ship gate.'
      : 'LLM auth audit truth is fresh enough for the ship gate.',
  }]
}

export function buildFoundationShipPreflight({
  llmRuntime = {},
  foundationJobs = {},
  fileSizeStandardStatus = null,
  now = new Date(),
  maxAgeHours = DEFAULT_MAX_AGE_HOURS,
} = {}) {
  const llmAuthAuditStatus = buildLlmAuthAuditStatus({
    llmRuntime,
    foundationJobs,
    now,
    maxAgeHours,
  })
  const freshnessOwnership = buildShipFreshnessOwnershipRows({
    llmAuthAuditStatus,
    foundationJobs,
    now,
    maxAgeHours,
  })
  const blockingRows = freshnessOwnership.filter(row => row.blocking)
  const fileSizeStatus = fileSizeStandardStatus || buildFoundationFileSizeShipGateStatus({ now })
  const findings = [
    ...asList(llmAuthAuditStatus.findings).map(finding => ({
      ...finding,
      cardId: 'LLM-AUTH-AUDIT-001',
      repairCommand: LLM_AUTH_AUDIT_REPAIR_COMMAND,
    })),
    ...blockingRows.map(row => ({
      check: `${row.key} is ship-ready`,
      detail: row.detail,
      cardId: row.cardId,
      repairCommand: row.repairCommand,
    })),
    ...asList(fileSizeStatus.findings).map(finding => ({
      ...finding,
      cardId: finding.cardId || FILE_SIZE_ENGINEERING_STANDARD_CARD_ID,
    })),
  ]

  return {
    ok: findings.length === 0,
    status: findings.length ? 'blocked' : 'healthy',
    cardIds: [SHIP_GATE_FAST_PREFLIGHT_CARD_ID, SHIP_GATE_FRESHNESS_OWNERSHIP_CARD_ID],
    generatedAt: now.toISOString(),
    maxAgeHours,
    freshnessOwnership,
    fileSizeStandard: {
      status: fileSizeStatus.status,
      ok: fileSizeStatus.ok,
      summary: fileSizeStatus.surface?.summary || null,
      findings: fileSizeStatus.findings || [],
    },
    checks: [
      {
        key: 'llm-auth-audit-status',
        status: llmAuthAuditStatus.status,
        ok: llmAuthAuditStatus.status === 'healthy',
        summary: llmAuthAuditStatus.summary,
      },
      {
        key: 'freshness-ownership',
        status: blockingRows.length ? 'blocked' : 'healthy',
        ok: blockingRows.length === 0,
        rowCount: freshnessOwnership.length,
      },
      {
        key: 'file-size-standard',
        status: fileSizeStatus.status,
        ok: fileSizeStatus.ok === true,
        summary: fileSizeStatus.surface?.summary || null,
      },
    ],
    findings,
  }
}

export function buildFoundationShipPreflightDogfoodProof({ now = new Date() } = {}) {
  const healthyFixture = buildLlmAuthAuditFixture({ now })
  const staleFixture = buildLlmAuthAuditFixture({ now, stale: true })
  const missingFixture = buildLlmAuthAuditFixture({ now, missingJob: true })
  const missingProbeFixture = buildLlmAuthAuditFixture({ now, missingProbe: true })
  const fileSizeDangerFixture = {
    ...healthyFixture,
    fileSizeStandardStatus: buildFoundationFileSizeShipGateStatus({
      watchedPaths: ['lib/red-danger-module.js'],
      fileLineCounts: { 'lib/red-danger-module.js': 10001 },
      now,
    }),
  }

  const healthy = buildFoundationShipPreflight({ ...healthyFixture, now })
  const healthyNestedLatestRun = buildFoundationShipPreflight({
    llmRuntime: healthyFixture.llmRuntime,
    foundationJobs: {
      latestRuns: [],
      jobs: healthyFixture.foundationJobs.jobs,
    },
    now,
  })
  const stale = buildFoundationShipPreflight({ ...staleFixture, now })
  const missing = buildFoundationShipPreflight({ ...missingFixture, now })
  const missingProbe = buildFoundationShipPreflight({ ...missingProbeFixture, now })
  const fileSizeDanger = buildFoundationShipPreflight({ ...fileSizeDangerFixture, now })
  const blockedCases = [stale, missing, missingProbe, fileSizeDanger]
  const blockedOutput = JSON.stringify(blockedCases)
  const ownershipRows = blockedCases.flatMap(result => result.freshnessOwnership)

  return {
    ok: healthy.ok === true &&
      healthyNestedLatestRun.ok === true &&
      blockedCases.every(result => result.ok === false && result.status === 'blocked') &&
      blockedOutput.includes(LLM_AUTH_AUDIT_REPAIR_COMMAND) &&
      fileSizeDanger.findings.some(finding => finding.cardId === FILE_SIZE_ENGINEERING_STANDARD_CARD_ID) &&
      ownershipRows.every(row => row.owner && row.posture && row.status && row.repairCommand),
    healthy,
    healthyNestedLatestRun,
    blockedCases,
    fileSizeDanger,
    dogfoodInvariant: 'Fresh fixture passes; stale/missing LLM auth fixtures and red file-size danger fixtures fail through the same preflight function path, with LLM cases printing the approved repair command.',
  }
}
