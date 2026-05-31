import {
  NIGHTLY_DEEP_AUDIT_JOB_KEY,
} from './nightly-deep-audit-constants.js'
import {
  NIGHTLY_AUDIT_FLEET_JOB_KEY,
  NIGHTLY_AUDIT_FLEET_SCHEDULE_LOCAL_TIME,
  NIGHTLY_AUDIT_FLEET_SCHEDULE_TIMEZONE,
} from './nightly-audit-fleet.js'
import {
  buildFoundationSystemHealthSnapshot,
} from './foundation-system-health.js'

export const FOUNDATION_HEALTH_WATCH_TO_GREEN_CARD_ID = 'FOUNDATION-HEALTH-WATCH-TO-GREEN-001'
export const FOUNDATION_HEALTH_WATCH_TO_GREEN_CLOSEOUT_KEY = 'foundation-health-watch-to-green-v1'
export const FOUNDATION_HEALTH_WATCH_TO_GREEN_PLAN_PATH = 'docs/process/foundation-health-watch-to-green-001-plan.md'
export const FOUNDATION_HEALTH_WATCH_TO_GREEN_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-HEALTH-WATCH-TO-GREEN-001.json'
export const FOUNDATION_HEALTH_WATCH_TO_GREEN_SCRIPT_PATH = 'scripts/process-foundation-health-watch-to-green-check.mjs'
export const FOUNDATION_HEALTH_WATCH_TO_GREEN_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-19-foundation-health-watch-to-green-closeout.md'
export const FOUNDATION_HEALTH_WATCH_TO_GREEN_SPRINT_ID = 'FOUNDATION-GREEN-MAIN-AUDIT-AND-SOURCE-ACTIVATION-2026-05-19'
export const FOUNDATION_HEALTH_WATCH_TO_GREEN_NEXT_CARD_ID = 'AUDIT-FINDING-TO-BACKLOG-ROUTER-001'

export const FOUNDATION_HEALTH_WATCH_TO_GREEN_CHANGED_FILES = [
  'lib/foundation-system-health.js',
  'lib/foundation-health-watch-to-green.js',
  'scripts/foundation-verify.mjs',
  FOUNDATION_HEALTH_WATCH_TO_GREEN_SCRIPT_PATH,
  'lib/foundation-verifier-health-live-summary.js',
  'lib/foundation-build-closeout-build-lane-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
  'package.json',
  FOUNDATION_HEALTH_WATCH_TO_GREEN_PLAN_PATH,
  FOUNDATION_HEALTH_WATCH_TO_GREEN_APPROVAL_PATH,
  FOUNDATION_HEALTH_WATCH_TO_GREEN_CLOSEOUT_PATH,
]

export const FOUNDATION_HEALTH_WATCH_TO_GREEN_PROOF_COMMANDS = [
  'node --check lib/foundation-system-health.js lib/foundation-health-watch-to-green.js scripts/process-foundation-health-watch-to-green-check.mjs lib/foundation-verifier-health-live-summary.js',
  'npm run process:foundation-health-watch-to-green-check -- --apply --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=FOUNDATION-HEALTH-WATCH-TO-GREEN-001 --planApprovalRef=docs/process/approvals/FOUNDATION-HEALTH-WATCH-TO-GREEN-001.json --closeoutKey=foundation-health-watch-to-green-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=FOUNDATION-HEALTH-WATCH-TO-GREEN-001 --closeoutKey=foundation-health-watch-to-green-v1',
  'npm run process:post-ship-fanout -- --card=FOUNDATION-HEALTH-WATCH-TO-GREEN-001 --closeoutKey=foundation-health-watch-to-green-v1 --commitRef=HEAD',
  'npm run process:foundation-ship -- --card=FOUNDATION-HEALTH-WATCH-TO-GREEN-001 --planApprovalRef=docs/process/approvals/FOUNDATION-HEALTH-WATCH-TO-GREEN-001.json --closeoutKey=foundation-health-watch-to-green-v1 --commitRef=HEAD',
]

export const FOUNDATION_HEALTH_WATCH_TO_GREEN_NOT_NEXT = [
  'Do not work MEETING-VAULT-ACL-001 Phase B or historical Meeting Vault cleanup from this card.',
  'Do not mutate Google Drive permissions.',
  'Do not rerun live meeting-notes or Gmail current sync without explicit Steve approval.',
  'Do not hide red/yellow rows by deleting them from the health report.',
  'Do not call system health green if any non-green row lacks owner, reason, threshold, and next action.',
  'Do not run live extraction, auth-required jobs, provider probes, model-spend, external writes, Drive mutation, or Agent Feedback sends.',
  'Do not skip the auditor router after health classification closes.',
]

const WATCH_FAILURE_TELEMETRY = {
  status: 'watch',
  summary: {
    redFingerprintCount: 0,
    yellowFingerprintCount: 1,
    eventCount7d: 3,
  },
  topFindings: [
    {
      id: 'build_lane_failure_synthetic-watch',
      severity: 'P1',
      status: 'watch',
      title: 'unclassified_build_lane_failure repeated in the build lane',
      detail: '3 repeats in 24h, 3 in 7d. Latest: synthetic watch row.',
      nextAction: 'Watch unclassified_build_lane_failure; one more repeat should become repair work.',
      fingerprint: 'synthetic-watch',
      commands: ['foundation:verify'],
      cardIds: ['SYNTHETIC-001'],
    },
  ],
  fingerprints: [
    {
      fingerprint: 'synthetic-watch',
      status: 'watch',
      failureClass: 'unclassified_build_lane_failure',
      count24h: 3,
      count7d: 3,
      commands: ['foundation:verify'],
      cardIds: ['SYNTHETIC-001'],
      nextAction: 'Watch unclassified_build_lane_failure; one more repeat should become repair work.',
    },
  ],
}

function succeededRun(jobKey, finishedAt) {
  return {
    runId: `${jobKey}-success`,
    jobKey,
    status: 'succeeded',
    finishedAt,
  }
}

function failedRun(jobKey, finishedAt, status = 'failed') {
  return {
    runId: `${jobKey}-failed`,
    jobKey,
    status,
    finishedAt,
    errorMessage: 'Synthetic health watch-to-green failure.',
  }
}

function buildJob({
  key,
  title,
  priority = 'P0',
  latestRun,
  mutationPosture = 'read_only',
  scheduleLocalTime,
  scheduleTimezone,
} = {}) {
  return {
    key,
    title,
    priority,
    runtimeMode: 'scheduled',
    enabled: true,
    scheduleEveryMinutes: 1440,
    ...(scheduleLocalTime ? { scheduleLocalTime } : {}),
    ...(scheduleTimezone ? { scheduleTimezone } : {}),
    mutationPosture,
    latestRun,
  }
}

function buildClassifiedFixture({ includeUnclassified = false } = {}) {
  const jobs = [
    buildJob({
      key: NIGHTLY_DEEP_AUDIT_JOB_KEY,
      title: 'Nightly Hybrid Deep Audit',
      latestRun: succeededRun(NIGHTLY_DEEP_AUDIT_JOB_KEY, '2026-05-19T10:00:00.000Z'),
      mutationPosture: 'report_only',
    }),
    buildJob({
      key: NIGHTLY_AUDIT_FLEET_JOB_KEY,
      title: 'Nightly Specialist Audit Fleet',
      latestRun: succeededRun(NIGHTLY_AUDIT_FLEET_JOB_KEY, '2026-05-19T10:05:00.000Z'),
      scheduleLocalTime: NIGHTLY_AUDIT_FLEET_SCHEDULE_LOCAL_TIME,
      scheduleTimezone: NIGHTLY_AUDIT_FLEET_SCHEDULE_TIMEZONE,
      mutationPosture: 'read_only',
    }),
    buildJob({
      key: 'gmail-sync-current',
      title: 'Gmail Current Sync',
      latestRun: failedRun('gmail-sync-current', '2026-05-19T11:10:00.000Z', 'cancelled'),
      mutationPosture: 'operational_write',
    }),
    buildJob({
      key: 'meeting-notes-sync-current',
      title: 'Meeting Notes Current Sync',
      latestRun: failedRun('meeting-notes-sync-current', '2026-05-19T11:12:00.000Z'),
      mutationPosture: 'operational_write',
    }),
    buildJob({
      key: 'meeting-transcripts-extract-backlog',
      title: 'Meeting Transcript Extraction Backlog',
      priority: 'P1',
      latestRun: failedRun('meeting-transcripts-extract-backlog', '2026-05-19T11:13:00.000Z', 'cancelled'),
      mutationPosture: 'operational_write',
    }),
    buildJob({
      key: 'foundation-verify',
      title: 'Foundation Verifier',
      priority: 'P0',
      latestRun: failedRun('foundation-verify', '2026-05-19T11:13:30.000Z'),
      mutationPosture: 'report_only',
    }),
    buildJob({
      key: 'admin-deal-backlog-review',
      title: 'Admin Deal Backlog Inspection',
      priority: 'P1',
      latestRun: failedRun('admin-deal-backlog-review', '2026-05-19T11:14:00.000Z'),
      mutationPosture: 'operational_write',
    }),
    buildJob({
      key: 'conditional-deal-review-readonly',
      title: 'Conditional Deal Forecast Sync',
      priority: 'P1',
      latestRun: failedRun('conditional-deal-review-readonly', '2026-05-19T11:14:30.000Z'),
      mutationPosture: 'read_only',
    }),
  ]
  if (includeUnclassified) {
    jobs.push(buildJob({
      key: 'unknown-failed-job',
      title: 'Unknown Failed Job',
      latestRun: failedRun('unknown-failed-job', '2026-05-19T11:14:00.000Z'),
    }))
  }
  return buildFoundationSystemHealthSnapshot({
    foundationJobs: { jobs },
    foundationOperatingReliability: {
      connectorUptime: {
        summary: { downCount: 0, degradedCount: 1, blockedCount: 0 },
        rows: [{ key: 'google-workspace', label: 'Google Workspace', status: 'degraded' }],
        morningHealth: {
          findings: [
            {
              id: 'connector_degraded',
              severity: 'P1',
              status: 'review',
              title: 'One or more connectors are degraded',
              detail: 'Google Workspace is degraded.',
              nextAction: 'Use source-health details before changing hub behavior.',
            },
            {
              id: 'runtime_jobs_failed',
              severity: 'P1',
              status: 'review',
              title: 'Foundation jobs have recent failures',
              detail: 'Governed extraction lanes have recent failed/cancelled rows.',
              nextAction: 'Review latest run error before treating the system as green.',
            },
          ],
        },
      },
    },
    endpointBudgets: {
      summary: { riskCount: 0, reviewCount: 1 },
      findings: [
        {
          id: 'endpoint_budget_api-foundation-hub',
          severity: 'P2',
          status: 'review',
          title: '/api/foundation-hub endpoint budget is missing',
          detail: 'Synthetic missing endpoint budget.',
          nextAction: 'Run endpoint freshness repair.',
        },
      ],
    },
    docArtifactBloat: {
      status: 'risk',
      summary: { riskCount: 1, reviewCount: 1, artifactCount: 321 },
      topFindings: [
        {
          id: 'doc_artifact_handoff_monthly_file_budget',
          severity: 'P0',
          status: 'risk',
          title: 'docs/handoffs is accumulating too many hot files',
          detail: 'Synthetic hot-doc row.',
          nextAction: 'Roll old handoffs into a monthly closeout summary.',
        },
      ],
    },
    fileSizeStandard: {
      status: 'watch',
      summary: { riskCount: 0, watchCount: 1, fileCount: 1 },
      topFindings: [
        {
          id: 'file_size_public_foundation_js',
          severity: 'P1',
          status: 'watch',
          title: 'public/foundation.js is over preferred budget',
          detail: 'Synthetic watched file.',
          nextAction: 'Keep changes wrapper-only or include a split plan.',
        },
      ],
    },
    buildLaneFailureTelemetry: WATCH_FAILURE_TELEMETRY,
    sourceContracts: [{ id: 'SRC-SYNTHETIC-FOUNDATION' }],
    now: new Date('2026-05-19T12:00:00.000Z'),
  })
}

function classificationComplete(finding = {}) {
  const classification = finding.classification || null
  return Boolean(
    classification &&
      classification.status === 'classified' &&
      classification.type &&
      classification.owner &&
      classification.reason &&
      classification.threshold &&
      classification.nextAction &&
      typeof classification.blocksCurrentSprint === 'boolean',
  )
}

export function summarizeFoundationHealthWatchToGreen(systemHealth = {}) {
  const findings = Array.isArray(systemHealth.findings) ? systemHealth.findings : []
  const nonGreenFindings = findings.filter(finding => ['risk', 'watch'].includes(finding.rollupLevel))
  const unclassified = nonGreenFindings.filter(finding => !classificationComplete(finding))
  const approvalBoundMeetingNotes = findings.find(finding => finding.id === 'scheduled_job_meeting-notes-sync-current') || null
  const foundationVerifier = findings.find(finding => finding.id === 'scheduled_job_foundation-verify') || null
  const conditionalDeal = findings.find(finding => finding.id === 'scheduled_job_conditional-deal-review-readonly') || null
  const endpointRouted = findings.filter(finding => String(finding.id || '').startsWith('endpoint_budget_'))
  const hotDocRouted = findings.filter(finding => String(finding.id || '').startsWith('doc_artifact_handoff_'))
  const fileSizeRouted = findings.filter(finding => String(finding.id || '').startsWith('file_size_'))
  const buildLaneRouted = findings.filter(finding => String(finding.id || '').startsWith('build_lane_failure_'))
  return {
    ok: Number(systemHealth.summary?.unclassifiedRiskCount || 0) === 0 &&
      Number(systemHealth.summary?.unclassifiedWatchCount || 0) === 0 &&
      unclassified.length === 0,
    status: systemHealth.status || 'unknown',
    rawStatus: systemHealth.summary?.rawStatus || 'unknown',
    classificationStatus: systemHealth.summary?.classificationStatus || 'unknown',
    blockingClassifiedRiskCount: Number(systemHealth.summary?.blockingClassifiedRiskCount || 0),
    blockingClassifiedWatchCount: Number(systemHealth.summary?.blockingClassifiedWatchCount || 0),
    rawRiskCount: Number(systemHealth.summary?.rawRiskCount || 0),
    rawWatchCount: Number(systemHealth.summary?.rawWatchCount || 0),
    classifiedFindingCount: Number(systemHealth.summary?.classifiedFindingCount || 0),
    unclassifiedRiskCount: Number(systemHealth.summary?.unclassifiedRiskCount || 0),
    unclassifiedWatchCount: Number(systemHealth.summary?.unclassifiedWatchCount || 0),
    unclassifiedFindingIds: unclassified.map(finding => finding.id).filter(Boolean),
    approvalBoundMeetingNotes: approvalBoundMeetingNotes?.classification || null,
    foundationVerifier: foundationVerifier?.classification || null,
    conditionalDeal: conditionalDeal?.classification || null,
    endpointRoutedCount: endpointRouted.length,
    hotDocRoutedCount: hotDocRouted.length,
    fileSizeRoutedCount: fileSizeRouted.length,
    buildLaneRoutedCount: buildLaneRouted.length,
    plainEnglish: systemHealth.plainEnglish || '',
  }
}

export function buildFoundationHealthWatchToGreenDogfoodProof() {
  const classified = buildClassifiedFixture()
  const unclassified = buildClassifiedFixture({ includeUnclassified: true })
  const classifiedSummary = summarizeFoundationHealthWatchToGreen(classified)
  const unclassifiedSummary = summarizeFoundationHealthWatchToGreen(unclassified)
  const checks = [
    {
      ok: classified.status === 'risk' &&
        classifiedSummary.classificationStatus === 'healthy' &&
        classifiedSummary.rawRiskCount > 0 &&
        classifiedSummary.blockingClassifiedRiskCount > 0 &&
        classifiedSummary.classifiedFindingCount >= 9 &&
        classifiedSummary.unclassifiedRiskCount === 0,
      check: 'classified approval/watch rows do not hide raw non-green workflow status',
    },
    {
      ok: classified.findings.every(finding => !['risk', 'watch'].includes(finding.rollupLevel) || classificationComplete(finding)),
      check: 'every non-green classified row has owner, reason, threshold, next action, and explicit blocking decision',
    },
    {
      ok: classified.findings.some(finding =>
        finding.id === 'scheduled_job_meeting-notes-sync-current' &&
          finding.classification?.type === 'approval_bound_extraction_lane' &&
          finding.classification?.owner === 'Steve' &&
          finding.classification?.repairCardId === 'EXTRACT-CURRENT-001',
      ),
      check: 'meeting-notes current sync remains Steve approval-bound and routed to EXTRACT-CURRENT-001',
    },
    {
      ok: classified.findings.some(finding =>
        finding.id === 'scheduled_job_foundation-verify' &&
          finding.classification?.type === 'scheduled_verifier_repair_lane' &&
          finding.classification?.owner === 'Foundation Builder' &&
          finding.classification?.repairCardId === 'FOUNDATION-VERIFY-HEALTH-REPAIR-001',
      ),
      check: 'scheduled foundation verifier failure routes to verifier health repair without hiding red status',
    },
    {
      ok: classified.findings.some(finding =>
        finding.id === 'scheduled_job_admin-deal-backlog-review' &&
          finding.classification?.type === 'approval_bound_operational_write_lane' &&
          finding.classification?.owner === 'Steve' &&
          finding.classification?.repairCardId === 'ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001',
      ),
      check: 'admin deal backlog review remains Steve approval-bound and routed to its source contract',
    },
    {
      ok: classified.findings.some(finding =>
        finding.id === 'scheduled_job_conditional-deal-review-readonly' &&
          finding.classification?.type === 'approval_bound_business_source_read_lane' &&
          finding.classification?.owner === 'Steve' &&
          finding.classification?.repairCardId === 'ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001',
      ),
      check: 'conditional deal read-only failure remains Steve approval-bound and routed to admin/source contract',
    },
    {
      ok: classified.findings.some(finding =>
        finding.id === 'endpoint_budget_api-foundation-hub' &&
          finding.classification?.repairCardId === 'FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001',
      ),
      check: 'endpoint metrics row routes to endpoint freshness card',
    },
    {
      ok: classified.findings.some(finding =>
        finding.id === 'doc_artifact_handoff_monthly_file_budget' &&
          finding.classification?.repairCardId === 'FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001',
      ),
      check: 'hot-doc row routes to handoff cleanup card',
    },
    {
      ok: classified.findings.some(finding =>
        finding.id === 'file_size_public_foundation_js' &&
          finding.classification?.repairCardId === 'FOUNDATION-FILE-SIZE-WATCH-CLASSIFIER-001',
      ),
      check: 'file-size row routes to file-size classifier card',
    },
    {
      ok: classified.findings.some(finding =>
        finding.id === 'build_lane_failure_synthetic-watch' &&
          finding.classification?.repairCardId === 'BUILD-LANE-REPEATED-FAILURE-ACTION-GATE-001',
      ),
      check: 'build-lane watch row routes to repeated-failure action gate',
    },
    {
      ok: unclassified.status === 'risk' &&
        unclassifiedSummary.unclassifiedRiskCount > 0 &&
        unclassifiedSummary.unclassifiedFindingIds.includes('scheduled_job_unknown-failed-job'),
      check: 'unclassified red row still blocks green',
    },
  ]
  return {
    ok: checks.every(check => check.ok),
    mode: 'foundation-health-watch-to-green-dogfood',
    checks,
    classifiedSummary,
    unclassifiedSummary,
  }
}
