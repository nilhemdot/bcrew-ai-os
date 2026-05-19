# Nightly Deep Audit Report - 2026-05-19

Closeout key: `nightly-deep-audit-upgrade-v1`
Generated at: `2026-05-19T15:17:47.748Z`
Report path: `docs/handoffs/nightly-deep-audit-2026-05-19.md`

## Morning Read

- Status: `report_ready`
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev.
- Deterministic findings: 12 total (0 P0, 5 P1, 7 P2, 0 P3)
- Changed files selected: 12
- High-risk review targets: 18
- LLM review mode: `approved_route_available_for_bounded_review`
- Dogfood against May 13 failures: passed
- Doc/report artifact bloat: `risk` (1 red, 1 yellow)

## Diff Summary

- Previous report: `docs/handoffs/nightly-deep-audit-2026-05-18.json`
- New findings: 11
- Still open: 0
- Resolved: 0
- Finding delta: 11

## LLM Review Boundary

- Executed this run: no
- Selected route: `foundation-synthesis-openclaw-chatgpt`
- Provider/model: `openclaw / openai-codex/gpt-5.4`
- Route blocker: none
- Note: An approved route is available; V1 still records packets by default unless an explicit live LLM review mode is enabled.

## Endpoint And Payload Trend

- /api/foundation-hub: 95ms, 515570B, risk=healthy (Within V1 audit budget.)
- /api/source-of-truth: 16ms, 156492B, risk=healthy (Within V1 audit budget.)
- /api/foundation/source-lifecycle: 382ms, 786828B, risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: 92ms, 373775B, risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: 18ms, 31638B, risk=healthy (Within V1 audit budget.)

## Largest Files

- scripts/foundation-verify.mjs: 4996 LOC, 277778B
- public/foundation.js: 2998 LOC, 113609B
- lib/foundation-db-schema-seed-store.js: 2653 LOC, 137639B
- lib/foundation-build-closeout-tightening-records.js: 2599 LOC, 224341B
- public/styles-foundation-workflows.css: 2591 LOC, 50351B
- lib/foundation-source-crawl-store.js: 2491 LOC, 110816B
- lib/foundation-build-closeout-overnight-records.js: 2446 LOC, 190369B
- public/styles-foundation-core.css: 2291 LOC, 43082B
- lib/foundation-db.js: 2261 LOC, 90410B
- lib/foundation-build-closeout-source-records.js: 2159 LOC, 182727B

## High-Risk Review Packets

### P0 scripts/foundation-verify.mjs

- Lines: 4996
- Bytes: 277778
- Reasons: over_3k_warn, verifier_trust_surface

```
#!/usr/bin/env node

import process from 'node:process'
import { getGroupedSourceSystems, getSourceContracts, getSourceConnectors } from '../lib/source-contracts.js'
import {
  CLOSEOUT_OWNERSHIP_GUARD_CARD_ID,
  buildSyntheticBuildLogCloseoutValidationProof,
  buildSyntheticBuildLogOwnershipProof,
  getFoundationBuildCloseouts,
  getFoundationBuildCloseoutValidation,
  FOUNDATION_BUILD_CLOSEOUT_SCHEMA_VERSION,
} from '../lib/foundation-build-log.js'
import {
  CANVA_CLIENT_PLAN_PATH,
  CANVA_CLIENT_SCRIPT_PATH,
  VERIFIER_CANVA_CLIENT_SPLIT_MODULE_CARD_ID,
  VERIFIER_CANVA_CLIENT_SPLIT_MODULE_PLAN_PATH,
  VERIFIER_CANVA_CLIENT_SPLIT_MODULE_SCRIPT_PATH,
  VERIFIER_CANVA_CLIENT_ORCHESTRATION_SPLIT_CARD_ID,
  evaluateFoundationCanvaClientVerifierOrchestration,
} from '../lib/foundation-canva-client-verifier.js'
import { buildSprintProofHelpers } from '../lib/foundation-verifier-sprint-proof.js'
import {
  buildSyntheticApprovalIntegrityStatus,
  PHASE_1_ENFORCEMENT_CARD_IDS,
  PHASE_1_ENFORCEMENT_PLAN_REF,
  PHASE_1_ENFORCEMENT_PLAN_SHA256,
  validatePlanApprovalFile,
} from '../lib/approval-integrity.js'
import {
  buildSyntheticGateReliabilityProof,
  formatFoundationGateRetryMessage,
  runWithFoundationGateRetry,
} from '../lib/foundation-gate-reliability.js'
import {
  PROCESS_CHECK_APPLY_BOUNDARY_CARD_ID,
  RUNTIME_SAFETY_HARDENING_SCRIPT_PATH,
  VERIFY_READONLY_GATE_CARD_ID,
  buildFoundationVerifyRetryOptions,
  buildVerifyReadOnlyGateDogfoodProof,
} from '../lib/foundation-runtime-safety.js'
import { buildProcessCheckApplyBoundaryDogfoodProof } from '../lib/process-write-guard.js'
import {
  PROCESS_CHECK_READONLY_MODE_CARD_ID,
  PROCESS_CHECK_READONLY_MODE_CLOSEOUT_KEY,
  PROCESS_CHECK_READONLY_MODE_SCRIPT_PATH,
  buildProcessCheckReadonlyModeProof,
} from '../lib/process-check-readonly-mode.js'
```

### P1 public/foundation.js

- Lines: 2998
- Bytes: 113609
- Reasons: frontend_route_cache_surface

```
  note.textContent = 'Current strategy rule: the page pulls live data when it loads, and you can refresh it manually. Automatic background refresh can be added later if we need it.'
  panel.appendChild(note)

  return panel
}

function renderBacklog() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading live backlog.</p>'

  Promise.all([
    fetchFoundationBacklog(),
    fetchActionReview().catch(function(error) {
      return { error: error.message || 'Action Review could not load.' }
    }),
  ]).then(function(results) {
    var hub = results[0]
    var actionReview = results[1]
    var focusedIds = getSection() === 'backlog'
      ? getSectionFocus().split(',').map(function(id) { return id.trim() }).filter(Boolean)
      : []
    backlogScopeRegistry = (hub.meta && hub.meta.backlogScopes && hub.meta.backlogScopes.length)
      ? hub.meta.backlogScopes.slice()
      : fallbackBacklogScopes.slice()
    backlogViewState.ids = focusedIds
    if (focusedIds.length) {
      backlogViewState.scope = 'all'
      backlogViewState.priority = 'all'
      backlogViewState.query = ''
    }

    container.innerHTML = ''

    /* hero */
    var hero = document.createElement('section')
    hero.className = 'hero'

    var heroInner = document.createElement('div')
    heroInner.className = 'hero-inner'

    var heroTitle = document.createElement('h1')
    heroTitle.textContent = focusedIds.length ? 'Focused Backlog View' : 'Foundation Backlog'
    heroInner.appendChild(heroTitle)

    var heroMeta = document.createElement('p')
    heroMeta.className = 'hero-copy'
    var scopeSummary = getActiveBacklogScopes().map(function(scope) {
      var count = (hub.backlogItems || []).filter(function(item) { return item.scope === scope.key }).length
```

### P1 lib/foundation-db.js

- Lines: 2261
- Bytes: 90410
- Reasons: live_truth_write_boundary

```

export async function closeFoundationDb() {
  if (!poolEndPromise) {
    poolEndPromise = pool.end()
  }
  await poolEndPromise
}

export async function resetFoundationDb() {
  await closeFoundationDb()
  pool = createFoundationPool()
  poolEndPromise = null
}

```

### P1 server.js

- Lines: 2023
- Bytes: 66109
- Reasons: hot_route_surface

```
    sendApiError(res, error.statusCode || 403, error.code || 'access_denied', error.message, error.details)
    return
  }

  sendApiError(res, 403, 'access_denied', error instanceof Error ? error.message : 'Access denied.')
}

function cacheHeadersNoStore(res) {
  res.setHeader('Cache-Control', 'no-store')
}

async function closeServer(server) {
  await new Promise((resolve, reject) => {
    server.close(error => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
}

registerAuthRoutes(app, {
  publicDir: path.join(__dirname, 'public'),
  sendApiError,
  attachRequestAccessContext,
  getRequestAuthUser,
  getLocalDevUser,
})

function tokensMatch(provided, expected) {
  if (!provided || !expected) return false
  const providedBuffer = Buffer.from(provided)
  const expectedBuffer = Buffer.from(expected)
  if (providedBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(providedBuffer, expectedBuffer)
}

function isLocalRequest(req) {
  const remoteAddress = String((req.socket && req.socket.remoteAddress) || req.ip || '').trim().toLowerCase()

  if (
    remoteAddress === '::1' ||
    remoteAddress === '127.0.0.1' ||
    remoteAddress === '::ffff:127.0.0.1'
  ) {
    return true
```

### P1 lib/connector-uptime-monitor.js

- Lines: 1063
- Bytes: 42053
- Reasons: source_health_surface

```
import {
  CODE_QUALITY_NIGHTLY_AUDIT_JOB_KEY,
  CODE_QUALITY_NIGHTLY_AUDIT_REPORT_PATH,
} from './code-quality-nightly-audit.js'
import {
  NIGHTLY_DEEP_AUDIT_JOB_KEY,
  NIGHTLY_DEEP_AUDIT_REPORT_PATTERN,
} from './nightly-deep-audit-constants.js'
import {
  CONNECTOR_CREDENTIAL_DEFINITIONS,
  buildConnectorCredentialRegistrySnapshot,
} from './connector-credential-registry.js'
import {
  FOUNDATION_JOB_MUTATION_POSTURES,
  getFoundationJobDefinitions,
  getFoundationJobRuntime,
  validateFoundationJobSchedulePosture,
} from './foundation-jobs.js'
import { getSourceConnectors, getSourceContracts } from './source-contracts.js'
import {
  AGENT_FEEDBACK_AUTO_SEND_RECONCILIATION_KEY,
  AGENT_FEEDBACK_AUTO_SEND_RECONCILED_STATUS,
  getAgentFeedbackAutoSendJobRunReconciliation,
} from './agent-feedback-auto-send-reconciliation.js'

export const FOUNDATION_OPERATING_RELIABILITY_SPRINT_ID = 'foundation-operating-reliability-2026-05-14'
export const FOUNDATION_OPERATING_RELIABILITY_CLOSEOUT_KEY = 'foundation-operating-reliability-v1'
export const FOUNDATION_OPERATING_RELIABILITY_SCRIPT_PATH = 'scripts/process-foundation-operating-reliability-check.mjs'

export const FOUNDATION_OPERATING_RELIABILITY_CARD_IDS = [
  'CONNECTOR-UPTIME-MONITOR-001',
  'SOURCE-023',
  'RUNTIME-ACTIVATION-001',
  'SYSTEM-HEALTH-AUDITOR-001',
  'PLAN-STATE-RECONCILE-001',
]

export const CONNECTOR_UPTIME_MONITOR_JOB_KEY = 'connector-uptime-monitor'
export const CONNECTOR_UPTIME_MONITOR_JOB_TITLE = 'Connector Uptime Monitor'

export const CONNECTOR_HEALTH_STATUSES = Object.freeze({
  healthy: 'healthy',
  degraded: 'degraded',
  down: 'down',
  stale: 'stale',
  manual: 'manual',
  blocked: 'blocked',
  unknown: 'unknown',
```

### P1 lib/kpi-health.js

- Lines: 1045
- Bytes: 38564
- Reasons: source_health_surface

```
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const KPI_HEALTH_CONTRACT_VERSION = 1
export const KPI_HEALTH_API_CACHE_CARD_ID = 'KPI-HEALTH-API-CACHE-001'
export const KPI_HEALTH_API_CACHE_CLOSEOUT_KEY = 'kpi-health-api-cache-v1'
export const KPI_HEALTH_API_CACHE_SPRINT_ID = 'kpi-health-api-cache-2026-05-15'
export const KPI_HEALTH_API_CACHE_PLAN_PATH = 'docs/process/kpi-health-api-cache-001-plan.md'
export const KPI_HEALTH_API_CACHE_APPROVAL_PATH = 'docs/process/approvals/KPI-HEALTH-API-CACHE-001.json'
export const KPI_HEALTH_API_CACHE_SCRIPT_PATH = 'scripts/process-kpi-health-api-cache-check.mjs'
export const KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_CARD_ID = 'KPI-HEALTH-DYNAMIC-YEAR-CONTRACT-001'
export const KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_CLOSEOUT_KEY = 'kpi-health-dynamic-year-contract-v1'
export const KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_SPRINT_ID = 'kpi-health-dynamic-year-contract-2026-05-16'
export const KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_PLAN_PATH = 'docs/process/kpi-health-dynamic-year-contract-001-plan.md'
export const KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_APPROVAL_PATH = 'docs/process/approvals/KPI-HEALTH-DYNAMIC-YEAR-CONTRACT-001.json'
export const KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_SCRIPT_PATH = 'scripts/process-kpi-health-dynamic-year-contract-check.mjs'
export const KPI_HEALTH_PERIOD_CONTRACT_SOURCE_ID = 'SRC-KPI-HEALTH-PERIOD-001'
export const KPI_HEALTH_PRIMARY_SURFACE = 'Foundation > Data Sources > APIs / Apps > KPI / Supabase Health'
export const KPI_HEALTH_RUNTIME_SURFACE = 'Foundation > Runtime Health, warnings only when unhealthy'
export const KPI_HEALTH_LEE_REPO_PATH = '/Users/bensoncrew/.inspection/zahnd-team-dashboard'
export const KPI_HEALTH_FETCH_TIMEOUT_MS = Math.max(
  1_000,
  Number(process.env.KPI_HEALTH_FETCH_TIMEOUT_MS) || 5_000,
)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const LOCAL_KPI_ENV = path.join(repoRoot, 'store', 'kpi-audit.env')
const KPI_HEALTH_ROUTE_CACHE_PATH = path.join(repoRoot, 'store', 'kpi-health-route-cache.json')
const KPI_HEALTH_ROUTE_CACHE_MAX_AGE_MS = Math.max(
  60_000,
  Number(process.env.KPI_HEALTH_ROUTE_CACHE_MAX_AGE_MS) || 6 * 60 * 60 * 1000,
)
let kpiHealthRouteMemoryCache = null
const LEE_REPO_SCAN_PATHS = [
  path.join(KPI_HEALTH_LEE_REPO_PATH, 'src'),
  p
```

### P1 lib/foundation-system-health.js

- Lines: 1008
- Bytes: 44281
- Reasons: changed_since_baseline, source_health_surface

```
import {
  getFoundationJobRuntime,
} from './foundation-jobs.js'
import {
  NIGHTLY_DEEP_AUDIT_JOB_KEY,
} from './nightly-deep-audit-constants.js'
import {
  buildNightlyAuditRunFreshnessStatus,
} from './nightly-audit-run-proof.js'
import {
  getAgentFeedbackAutoSendJobRunReconciliation,
} from './agent-feedback-auto-send-reconciliation.js'
import {
  buildFoundationFileSizeStandardStatus,
} from './foundation-file-size-standard.js'
import {
  buildBuildLaneFailureTelemetrySnapshot,
  readBuildLaneFailureTelemetrySnapshot,
} from './build-lane-failure-telemetry.js'

export const SYSTEM_HEALTH_NIGHTLY_AUDIT_CARD_ID = 'SYSTEM-HEALTH-NIGHTLY-AUDIT-001'
export const SYSTEM_HEALTH_NIGHTLY_AUDIT_CLOSEOUT_KEY = 'system-health-nightly-audit-v1'
export const SYSTEM_HEALTH_NIGHTLY_AUDIT_PLAN_PATH = 'docs/process/system-health-nightly-audit-001-plan.md'
export const SYSTEM_HEALTH_NIGHTLY_AUDIT_APPROVAL_PATH = 'docs/process/approvals/SYSTEM-HEALTH-NIGHTLY-AUDIT-001.json'
export const SYSTEM_HEALTH_NIGHTLY_AUDIT_SCRIPT_PATH = 'scripts/process-system-health-nightly-audit-check.mjs'
export const SYSTEM_HEALTH_NIGHTLY_AUDIT_JOB_KEY = 'system-health-nightly-audit'
export const SYSTEM_HEALTH_NIGHTLY_AUDIT_REPORT_PREFIX = 'docs/handoffs/system-health'
export const SCHEDULED_JOB_STALENESS_DASHBOARD_CARD_ID = 'SCHEDULED-JOB-STALENESS-DASHBOARD-001'
export const SCHEDULED_JOB_STALENESS_DASHBOARD_CLOSEOUT_KEY = 'scheduled-job-staleness-dashboard-v1'
export const SCHEDULED_JOB_STALENESS_DASHBOARD_PLAN_PATH = 'docs/process/scheduled-job-staleness-dashboard-001-plan.md'
export const SCHEDULED_JOB_STALENESS_DASHBOARD_APPROVAL_PATH = 'docs/process/approvals/SCHEDULED-JOB-STALENESS-DASHBOARD-001.json'
export const SYSTEM_HEALTH_NIGHTLY_AUDIT_SCHEDULE_LOCAL_TIME = '05:15'
export const SYSTEM_HEALTH_NIGHTLY_AUDIT_SCHEDULE_TIMEZONE = 'America/Toronto'
export const SCHEDULED_JOB_STALENESS_GRACE_MINUTES = 15
export const ACTIVE_JOB_RUN_STALE_GRACE_SECONDS = 300

const ACTIVE_JOB_RUN_STATUSES = new Set(['queued', 'running'])
const CLASSIFIED_FINDING_REPAIR_CARDS = {
  endpointMetrics: 'FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001',
  handoffHotDocCleanup: 'FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001',
  fileSizeClassifier: 'FOUNDATION-FILE-SIZE-WATCH-CLASSIFIER-001',
  extractCurrent: 'EXTRACT-CURRENT-001',
  extractBackfill: 'EXTRACT-BACKFILL-001',
  connectorMonitor: 'CONNECTOR-UPTIME-MONITOR-001
```

### P1 lib/source-lifecycle-completion.js

- Lines: 707
- Bytes: 36117
- Reasons: source_health_surface

```
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  SOURCE_LIFECYCLE_APPROVED_TARGET_BASELINE,
  SOURCE_LIFECYCLE_REQUIRED_TARGET_COUNT,
} from './source-lifecycle.js'
import {
  buildSourceLifecycleDynamicCoverage,
} from './source-lifecycle-dynamic-counts.js'
import { getFoundationBuildCloseouts } from './foundation-build-log.js'
import { readFoundationBuildLogRegistrySource } from './foundation-build-log-source.js'
import { buildFoundationReadinessStatus } from './foundation-readiness-gates.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const defaultRepoRoot = path.resolve(__dirname, '..')

export const SOURCE_LIFECYCLE_COMPLETION_CARD_ID = 'SOURCE-LIFECYCLE-COMPLETION-001'
export const SOURCE_LIFECYCLE_COMPLETION_CLOSEOUT_KEY = 'source-lifecycle-completion-v1'
export const SOURCE_LIFECYCLE_COMPLETION_PLAN_PATH = 'docs/process/source-lifecycle-completion-001-plan.md'
export const SOURCE_LIFECYCLE_COMPLETION_APPROVAL_PATH = 'docs/process/approvals/SOURCE-LIFECYCLE-COMPLETION-001.json'
export const SOURCE_LIFECYCLE_COMPLETION_DOC_PATH = 'docs/process/source-lifecycle-completion.md'
export const SOURCE_LIFECYCLE_COMPLETION_SCRIPT_PATH = 'scripts/process-source-lifecycle-completion-check.mjs'
export const SOURCE_LIFECYCLE_COMPLETION_SUMMARY_MARKER = 'SOURCE_LIFECYCLE_COMPLETION'

const COMPLETE_SOURCE_IDS = [
  'SRC-STRATEGY-001',
  'SRC-OWNERS-001',
  'SRC-CLICKUP-001',
  'SRC-GMAIL-001',
  'SRC-GCAL-001',
  'SRC-GDRIVE-001',
  'SRC-VIDEO-001',
  'SRC-SLACK-001',
  'SRC-MISSIVE-001',
  'SRC-MEETINGS-001',
  'SRC-DATAFORSEO-001',
  'SRC-GHL-001',
  'SRC-META-001',
]

const CURRENT_REALITY_SOURCE_IDS = [
  'SRC-FREEDOM-TEAM-001',
  'SRC-FREEDOM-COMMUNITY-001',
  'SRC-FREEDOM-COMMUNITY-REV-001',
  'SRC-FREEDOM-ENGINE-001',
```

### P1 lib/build-lane-failure-telemetry.js

- Lines: 674
- Bytes: 29886
- Reasons: changed_since_baseline

```
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export const BUILD_LANE_FAILURE_TELEMETRY_CARD_ID = 'BUILD-LANE-FAILURE-TELEMETRY-001'
export const BUILD_LANE_FAILURE_TELEMETRY_CLOSEOUT_KEY = 'build-lane-failure-telemetry-v1'
export const BUILD_LANE_FAILURE_TELEMETRY_PLAN_PATH = 'docs/process/build-lane-failure-telemetry-001-plan.md'
export const BUILD_LANE_FAILURE_TELEMETRY_APPROVAL_PATH = 'docs/process/approvals/BUILD-LANE-FAILURE-TELEMETRY-001.json'
export const BUILD_LANE_FAILURE_TELEMETRY_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-build-lane-failure-telemetry-closeout.md'
export const BUILD_LANE_FAILURE_TELEMETRY_SCRIPT_PATH = 'scripts/process-build-lane-failure-telemetry-check.mjs'
export const BUILD_LANE_FAILURE_TELEMETRY_SPRINT_ID = 'build-lane-failure-telemetry-2026-05-18'
export const BUILD_LANE_FAILURE_TELEMETRY_LOCAL_LOG_PATH = '.git/foundation-build-lane-failure-telemetry.jsonl'
export const BUILD_LANE_FAILURE_TELEMETRY_LOCAL_SUMMARY_PATH = '.git/foundation-build-lane-failure-summary.json'
export const BUILD_LANE_FAILURE_TELEMETRY_SHIP_PROOF_PATH = '.git/foundation-ship-proof.json'
export const BUILD_LANE_FAILURE_TELEMETRY_INFLIGHT_SHIP_PROOF_ENV = 'BCREW_FOUNDATION_SHIP_INFLIGHT_PROOF'
export const BUILD_LANE_FAILURE_TELEMETRY_24H_WARNING_THRESHOLD = 3
export const BUILD_LANE_FAILURE_TELEMETRY_24H_RISK_THRESHOLD = 5
export const BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_CARD_ID = 'BUILD-LANE-TELEMETRY-RESOLUTION-REPAIR-001'
export const BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_CLOSEOUT_KEY = 'build-lane-telemetry-resolution-repair-v1'
export const BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_PLAN_PATH = 'docs/process/build-lane-telemetry-resolution-repair-001-plan.md'
export const BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_APPROVAL_PATH = 'docs/process/approvals/BUILD-LANE-TELEMETRY-RESOLUTION-REPAIR-001.json'
export const BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_CLOSEOUT_PATH = 'docs/handoffs/2026-05-18-build-lane-telemetry-resolution-repair-closeout.md'
export const BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_SCRIPT_PATH = 'scripts/process-build-lane-telemetry-resolution-repair-check.mjs'
export const BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_SPRINT_ID = 'build-lane-telemetry-resolution-repair-2026-05-18'

export const BUILD_LANE_TELEMETRY_RESOLUTION_REPAIR_PROOF_COMMANDS = [
  'node --check lib/build-lane-failure-telemetry.js l
```

### P1 scripts/process-build-lane-repeated-failure-action-gate-check.mjs

- Lines: 661
- Bytes: 30910
- Reasons: changed_since_baseline, process_check_surface

```
    operation: 'create/update repeated-failure action gate backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  if (closeCard && actionGate?.status === 'blocked') {
    throw new Error(`Cannot close ${CARD_ID}: repeated red failures still lack a repair route.`)
  }
  await upsertLiveCardAndPlanCritic({ closeCard, planReview, actionGate })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'Get Foundation fully green, lock main integration discipline, upgrade dual/parallel work lanes, upgrade auditor routing, then resume source/extraction activation.',
        activeBlockerCardId: activeBlockerAfterGate({ closeCard, actionGate }),
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: closeCard ? 'repeated_failure_gate_closed' : 'repeated_failure_gate_active',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? actionGate?.status === 'action_required'
              ? 'Run the attached repeated-failure repair card before normal sprint work.'
              : `Run ${NEXT_CARD_ID} next; no parallel builders were allowed before this P0 gate.`
            : `Finish ${CARD_ID} before ${NEXT_CARD_ID}.`,
          repeatedFailureActionGateStatus: actionGate?.status || 'unknown',
          exitCriteria: [
            'Main integration lock is closed and pushed.',
            'Repeated failures are resolved, blocked, or attached to live repair cards.',
            'Parallel builder merge-lane enforcement runs only after this P0 gate.',
            'Health/audit cleanup runs before source/extraction activation.',
          ],
        },
      },
      items: buildSprintItems(previous, { closeCard, actionGate }),
    },
    'codex-build-lane-repeated-failure-action-gate',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || SPRINT_ID,
      reason: 'Steve made repeated build-lane failures P0 before parallel-builder work.',
    },
  )
}

function containsU
```

### P1 scripts/process-foundation-health-watch-to-green-check.mjs

- Lines: 592
- Bytes: 28936
- Reasons: changed_since_baseline, process_check_surface, source_health_surface

```
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'create/update health watch-to-green backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  await upsertLiveCardAndPlanCritic({ closeCard, planReview, healthSummary })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'Get Foundation fully green, lock main integration discipline, upgrade dual/parallel work lanes, upgrade auditor routing, then resume source/extraction activation.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: closeCard ? 'foundation_health_watch_to_green_closed' : 'foundation_health_watch_to_green_active',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `Run ${NEXT_CARD_ID} next.`
            : `Finish ${CARD_ID}; system health cannot be green with unclassified red/yellow rows.`,
          systemHealthSummary: healthSummary,
          exitCriteria: [
            'No unclassified system-health red/yellow rows remain.',
            'Approval-bound rows have owner, reason, threshold, and next action.',
            'Endpoint, hot-doc, and file-size rows are routed to next sprint cards.',
            'Audit finding-to-backlog router runs before source/extraction activation.',
          ],
        },
      },
      items: buildSprintItems(previous, { closeCard }),
    },
    'codex-foundation-health-watch-to-green',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || SPRINT_ID,
      reason: 'Steve required Foundation health green or explicit non-misleading classification before source activation.',
    },
  )
}

function containsUnsafeRuntimeCall(source = '') {
  const executableSource = String(source || '').replace(/(['"`])(?:\\.|(?!\1)[\s\S])*\1/g, '')
  const patterns = [
    /\bstartExtractionRun\s*\(/,
```

### P1 scripts/process-action-route-review-inbox-check.mjs

- Lines: 559
- Bytes: 29366
- Reasons: process_check_surface

```
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: ACTION_ROUTE_REVIEW_INBOX_SCRIPT_PATH,
    operation: 'create/update Action Route Review Inbox backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage: normalizedStage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: ACTION_ROUTE_REVIEW_INBOX_SPRINT_ID,
        status: 'active',
        goal: 'Separate proposed action-route findings from normal Foundation backlog work.',
        activeBlockerCardId: closeCard ? null : ACTION_ROUTE_REVIEW_INBOX_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizedStage,
          startedBy: 'codex-action-route-review-inbox',
          currentStatus: closeCard ? 'complete' : normalizedStage,
          closeoutKey: ACTION_ROUTE_REVIEW_INBOX_CLOSEOUT_KEY,
          nextAction: closeCard
            ? `Commit/push, then continue to ${PROMOTION_CARD_ID}.`
            : 'Build read-only Review Inbox separation; no promotion/apply/reject/snooze/dedupe, extraction, model calls, or external writes.',
          priorityOrder: [
            SPRINT_CARD_ID,
            'FOUNDATION-KB-COMPILER-V1-001',
            ACTION_ROUTE_REVIEW_INBOX_CARD_ID,
            PROMOTION_CARD_ID,
            DEDUP_CARD_ID,
          ],
          notNext: ACTION_ROUTE_REVIEW_INBOX_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'Action-route findings render as proposed review items with type, owner, age, source refs, destination, and review state.',
            'Default Backlog separates route-derived rows from normal queue while preserving explicit focused-card access.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage: normalizedStage })],
    },
    'codex-action-route-review-inbox',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || ACTION_ROUTE_REVIEW_INBOX_SPRINT_ID,
      reason: 'Steve approved continuing the Foundation KB/actio
```

### P1 lib/foundation-build-closeout-build-lane-records.js

- Lines: 552
- Bytes: 41174
- Reasons: changed_since_baseline

```
export const buildLaneCloseoutRecords = [
  {
    key: 'build-lane-served-code-fanout-sync-repair-v1',
    backlogIds: [
      'BUILD-LANE-SERVED-CODE-FANOUT-SYNC-REPAIR-001',
    ],
    match: {
      subjectIncludes: [
        'BUILD-LANE-SERVED-CODE-FANOUT-SYNC-REPAIR-001',
        'Build Lane Served-Code Fanout Sync Repair',
        'build-lane-served-code-fanout-sync-repair-v1',
      ],
    },
    operatorCloseout: true,
    mentionedBacklogIds: [
      'BUILD-LANE-FAILURE-TELEMETRY-001',
      'SHIP-GATE-WORKER-LIVE-JOB-PAUSE-001',
      'PARALLEL-BUILDER-OPERATING-SYSTEM-001',
    ],
    systemArea: 'Foundation build lane reliability',
    status: 'accepted',
    acceptanceState: 'Verified',
    whatChanged: 'Repaired fanout failure classification for stale served dashboard code.',
    whatItDoes: 'Keeps stale served code as a hard fanout failure while skipping dependent Recent Builds checks until the dashboard serves repo HEAD, preventing false build-log closeout/proof/where-it-lives telemetry.',
    whyItMatters: 'Builders should fix the real root cause. Stale served code needs a runtime restart, not a misleading build-log registry repair.',
    whereItLives: [
      'scripts/process-fanout-check.mjs SKIP behavior for dependent Recent Builds checks',
      'scripts/process-build-lane-served-code-fanout-sync-repair-check.mjs focused proof and live card scaffold',
      'docs/process/build-lane-served-code-fanout-sync-repair-001-plan.md',
      'docs/process/approvals/BUILD-LANE-SERVED-CODE-FANOUT-SYNC-REPAIR-001.json',
      'docs/handoffs/2026-05-18-build-lane-served-code-fanout-sync-repair-closeout.md',
      'lib/foundation-verify-coverage-card-ids.js done-card coverage',
    ],
    proofCommands: [
      'node --check scripts/process-fanout-check.mjs scripts/process-build-lane-served-code-fanout-sync-repair-check.mjs',
      'npm run process:build-lane-served-code-fanout-sync-repair-check -- --close-card --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify',
      'npm run process:ship-check -- --card=BUILD-LANE-SERVED-CODE-FANOUT-SYNC-REPAIR-001 --planApprovalRef=docs/process/approvals/BUILD-LANE-SERVED-CODE-FANOUT-SYNC-REPAIR-001.json --closeoutKey=build-lane-served-code-fanout-sync-repair-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
      'npm run proces
```

### P1 scripts/process-foundation-raw-green-repair-and-lock-check.mjs

- Lines: 551
- Bytes: 27350
- Reasons: changed_since_baseline, process_check_surface

```
    if (!inserted && item.cardId === NEXT_CARD_ID) {
      items.push(withRawGreenSprintItem({ order: item.order || items.length + 1 }, { closeCard }))
      inserted = true
    }
    items.push(item)
  }
  if (!inserted) items.push(withRawGreenSprintItem({ order: items.length + 1 }, { closeCard }))

  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'Get Foundation fully green, lock main integration discipline, upgrade dual/parallel work lanes, upgrade auditor routing, then resume source/extraction activation.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          currentStatus: closeCard ? 'raw_green_repair_locked' : 'raw_green_repair_active',
          nextAction: closeCard
            ? `Resume ${NEXT_CARD_ID}; raw workflow failure repairs and false-green locks are shipped.`
            : `${CARD_ID} blocks normal sprint/value work until raw workflow failures are repaired.`,
        },
      },
      items: items.map((item, index) => ({ ...item, order: index + 1 })),
    },
    'codex-foundation-raw-green-repair',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || SPRINT_ID,
      reason: 'Steve made raw-green repair the active P0 blocker before normal sprint progression.',
    },
  )
}

function withRawGreenSprintItem(item = {}, { closeCard = false } = {}) {
  return {
    ...item,
    cardId: CARD_ID,
    stage: closeCard ? 'done_this_sprint' : 'building_now',
    planRef: PLAN_PATH,
    definitionOfDone: 'Connector repeated failure repaired with governed job proof, meeting transcript latest state repaired, false-green process exits fail closed, repeated-failure gate exposes blockers, and full Foundation ship proof passes.',
    proofCommands: PROOF_COMMANDS,
    notNextBoundaries: [
      'Do not close by classification.',
      'Do not proceed to value/source/agent feature work before this P0 closes.',
```

### P1 scripts/process-action-route-promotion-workflow-check.mjs

- Lines: 524
- Bytes: 25625
- Reasons: process_check_surface

```
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: ACTION_ROUTE_PROMOTION_WORKFLOW_SCRIPT_PATH,
    operation: 'create/update Action Route Promotion Workflow backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage: normalizedStage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: ACTION_ROUTE_PROMOTION_WORKFLOW_SPRINT_ID,
        status: 'active',
        goal: 'Close the Review Inbox loop with governed internal action-route workflow actions.',
        activeBlockerCardId: closeCard ? null : ACTION_ROUTE_PROMOTION_WORKFLOW_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizedStage,
          startedBy: 'codex-action-route-promotion-workflow',
          currentStatus: closeCard ? 'complete' : normalizedStage,
          closeoutKey: ACTION_ROUTE_PROMOTION_WORKFLOW_CLOSEOUT_KEY,
          nextAction: closeCard
            ? `Commit/push, then continue to ${DEDUP_CARD_ID}.`
            : 'Build Review Inbox workflow; no extraction, auth, paid run, external write, UI redesign, or Agent Feedback auto-send.',
          priorityOrder: [
            SPRINT_CARD_ID,
            REVIEW_INBOX_CARD_ID,
            ACTION_ROUTE_PROMOTION_WORKFLOW_CARD_ID,
            DEDUP_CARD_ID,
          ],
          notNext: ACTION_ROUTE_PROMOTION_WORKFLOW_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'Review Inbox actions support confirm, answer, assign, promote, duplicate, reject, snooze, and link.',
            'Duplicate backlog promotion fails closed.',
            'Workflow metadata preserves source evidence.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage: normalizedStage })],
    },
    'codex-action-route-promotion-workflow',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || ACTION_ROUTE_PROMOTION_WORKFLOW_SPRINT_ID,
      reason: 'Steve approved continuing the overnight Foundation KB/action review 
```

### P1 scripts/process-action-route-dedup-staleness-guard-check.mjs

- Lines: 502
- Bytes: 24373
- Reasons: process_check_surface

```
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: ACTION_ROUTE_DEDUP_STALENESS_SCRIPT_PATH,
    operation: 'create/update Action Route dedupe/staleness backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage: normalizedStage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: ACTION_ROUTE_DEDUP_STALENESS_SPRINT_ID,
        status: 'active',
        goal: 'Stop duplicate and stale Action Route Review Inbox findings from piling up as unresolved operator noise.',
        activeBlockerCardId: closeCard ? null : ACTION_ROUTE_DEDUP_STALENESS_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizedStage,
          startedBy: 'codex-action-route-dedup-staleness',
          currentStatus: closeCard ? 'complete' : normalizedStage,
          closeoutKey: ACTION_ROUTE_DEDUP_STALENESS_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Commit/push, then continue the next safe Foundation-up card from repo truth.'
            : 'Build duplicate grouping and stale-risk policy; no extraction, auth, paid run, external write, UI redesign, or Agent Feedback auto-send.',
          priorityOrder: [
            SPRINT_CARD_ID,
            REVIEW_INBOX_CARD_ID,
            PROMOTION_WORKFLOW_CARD_ID,
            ACTION_ROUTE_DEDUP_STALENESS_CARD_ID,
          ],
          notNext: ACTION_ROUTE_DEDUP_STALENESS_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'Repeated unresolved review findings are grouped with source refs and next action.',
            `Unresolved findings at ${ACTION_ROUTE_STALE_WATCH_DAYS} days are yellow watch and at ${ACTION_ROUTE_STALE_RED_DAYS} days are red risk.`,
            'Every review item preserves history and gets dedupe/staleness metadata.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage: normalizedStage })],
    },
    'codex-action-route-dedup-staleness',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprin
```

### P1 lib/foundation-verify-coverage-card-ids.js

- Lines: 453
- Bytes: 16895
- Reasons: changed_since_baseline

```
export const PROCESS_REPAIR_VERIFIER_SPRINT_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'SPRINT-PROCESS-REPAIR-001',
  'VERIFIER-SPRINT-INDEPENDENCE-001',
  'VERIFIER-MODULAR-SPLIT-001',
]

export const FOUNDATION_SPRINT_SYSTEM_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'FOUNDATION-SPRINT-SYSTEM-001',
]

export const FOUNDATION_SPRINT_REVIEW_CARD_ID = 'FOUNDATION-SPRINT-REVIEW-001'
export const FOUNDATION_SPRINT_REVIEW_DOC_PATH = 'docs/process/foundation-sprint-review-001.md'
export const FOUNDATION_SPRINT_REVIEW_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  FOUNDATION_SPRINT_REVIEW_CARD_ID,
]

export const FOUNDATION_FOLLOWUP_CARD_CAPTURE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'FOUNDATION-FOLLOWUP-CARD-CAPTURE-001',
]

export const FOUNDATION_SYSTEMS_SERVICE_GROUPING_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'FOUNDATION-SYSTEMS-SERVICE-GROUPING-001',
]

export const SYSTEM_REGISTRATION_SWEEP_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'SYSTEM-REGISTRATION-SWEEP-001',
]

export const SALES_GLS_SCOREBOARD_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'SALES-GLS-SCOREBOARD-V1',
]

export const GATE_RELIABILITY_RECURRING_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'GATE-RELIABILITY-002',
]

export const GATE_RELIABILITY_DIRECT_VERIFIER_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'GATE-RELIABILITY-003',
]

export const RUNTIME_SAFETY_HARDENING_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'VERIFY-READONLY-GATE-001',
  'PROCESS-CHECK-APPLY-BOUNDARY-001',
  'PROCESS-CHECK-SCHEDULED-MUTATION-GUARD-001',
  'FOUNDATION-DB-INIT-SEED-SPLIT-001',
  'CURRENT-SPRINT-MUTATION-GUARDS-001',
  'BACKLOG-STORE-CONCURRENCY-001',
]
```

### P1 scripts/process-foundation-ship.mjs

- Lines: 451
- Bytes: 15339
- Reasons: changed_since_baseline, process_check_surface

```
#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import process from 'node:process'
import { promisify } from 'node:util'
import {
  classifyFoundationGateError,
  formatFoundationGateRetryMessage,
  sleep,
} from '../lib/foundation-gate-reliability.js'
import {
  BUILD_LANE_FAILURE_TELEMETRY_INFLIGHT_SHIP_PROOF_ENV,
  recordBuildLaneFailureEventsFromError,
} from '../lib/build-lane-failure-telemetry.js'
import { recordFoundationShipProof } from '../lib/process-git-hooks.js'
import {
  SHIP_GATE_WORKER_LIVE_JOB_PAUSE_DEFAULT_TTL_MS,
  clearFoundationWorkerShipPause,
  writeFoundationWorkerShipPause,
} from '../lib/ship-gate-worker-live-job-pause.js'

const execFile = promisify(execFileCallback)

const requiredArgs = ['card', 'planApprovalRef', 'closeoutKey']

function parseArgs(argv) {
  const result = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    result[key] = value ?? true
  }
  return result
}

function normalize(value) {
  return String(value || '').trim()
}

function buildArg(name, value) {
  return `--${name}=${value}`
}

function printUsage() {
  console.log('Usage:')
  console.log('  npm run process:foundation-ship -- --card=<CARD> --planApprovalRef=<APPROVAL_JSON> --closeoutKey=<CLOSEOUT_KEY> [--commitRef=HEAD]')
  console.log('')
  console.log('Runs, in order:')
```

## Top Deterministic Findings

- P1 active-vs-historical-verifier-mixing: Verifier mixes active sprint assertions with historical closeout proof -> ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001
- P1 foundation-client-current-state-monolith: Foundation client embeds a large current-state renderer -> FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001
- P1 foundation-hub-route-monolith: Foundation Hub route builds many domains in one handler -> FOUNDATION-HUB-PAYLOAD-EXTRACT-001
- P1 hardcoded-source-count-baseline: Source contract count is encoded as an exact baseline -> SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001
- P1 hardcoded-source-count-baseline: Source contract count is encoded as an exact baseline -> SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001
- P2 admin-deal-policy-date-duplication: Admin deal-review policy dates are duplicated across runner, job config, and UI -> ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001
- P2 approval-threshold-raw-literal: Plan Critic 9.8 threshold appears as raw literals -> APPROVAL-THRESHOLD-REGISTRY-001
- P2 build-closeout-code-owned-data: Build closeout history is code-owned data -> BUILD-CLOSEOUT-REGISTRY-EXTRACT-001
- P2 build-log-request-time-git-and-duplication: Build Log shells out to git and returns duplicate group/build payloads -> BUILD-LOG-API-CACHE-AND-SLIM-001
- P2 fixed-build-intel-commit-baseline: Build Intel commit is pinned as expected truth -> BUILD-INTEL-SNAPSHOT-BASELINE-001
- P2 focused-check-active-sprint-id-assumption: Focused checks assert exact dated active sprint IDs -> SPRINT-CHECK-HISTORICAL-MODE-001
- P2 foundation-dom-rebuild-risk: Foundation frontend has heavy DOM rebuild signals -> FOUNDATION-FRONTEND-DOM-BUDGET-001

## Doc / Report Artifact Bloat

- Status: `risk`
- Handoff files: 324
- Handoff hot lines: 22614
- Nightly artifacts: 11
- Red/yellow findings: 1/1

- P0 docs/handoffs is accumulating too many hot files: docs/handoffs has 323 file(s) modified in the last 31 days; budget is 220/320.
- P1 docs/handoffs is growing past the hot-doc budget: docs/handoffs contains 22614 line(s); budget is 20000/35000 warn/risk.

## Dogfood Proof

- 70s / 4.63 MB endpoint fixture: `risk`
- Self-repairing verifier fixture count: 1
- Write-capable check fixture count: 1
- Hardcoded live truth fixture count: 2
- 10K+ monolith fixture reasons: actively_dangerous_10k_plus_file, live_truth_write_boundary

## Boundaries

- No auto-fixes.
- No auto backlog mutation.
- No hub feature work.
- No Build Intel extraction.
- No paid-source auth.
- No unapproved provider spend.

## Deterministic Scanner Detail

# Code Quality Nightly Audit Report - 2026-05-13

Closeout key: `foundation-code-quality-nightly-audit-v1`
Sprint: `foundation-code-quality-nightly-audit-2026-05-13`
Generated at: `2026-05-19T15:17:48.324Z`

## Morning Read

- Status: `report_ready`
- Findings: 12 total (0 P0, 5 P1, 7 P2, 0 P3)
- Proposed backlog fixes: 11
- Detection mode: deterministic code first; no LLM detection used.
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev, no feature work.
- Synthetic proof: passed (hardcoded=2, mutator=1, slowEndpoint=risk)

## Endpoint Coverage

- /api/foundation-hub: status=200 latency=95ms payload=515570B risk=healthy (Within V1 audit budget.)
- /api/source-of-truth: status=200 latency=16ms payload=156492B risk=healthy (Within V1 audit budget.)
- /api/foundation/source-lifecycle: status=200 latency=382ms payload=786828B risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: status=200 latency=92ms payload=373775B risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: status=200 latency=18ms payload=31638B risk=healthy (Within V1 audit budget.)

## Asset And Monolith Metrics

Assets:
- public/foundation.html: 8181B raw, 1727B gzip, 119 lines
- public/styles.css: 489B raw, 268B gzip, 12 lines
- public/foundation-nav-config.js: 8407B raw, 2349B gzip, 175 lines
- public/foundation-data.js: 14401B raw, 2982B gzip, 469 lines
- public/foundation-doc-markdown-renderers.js: 37237B raw, 7462B gzip, 1212 lines
- public/foundation.js: 113609B raw, 22321B gzip, 2998 lines
- public/foundation-backlog-renderers.js: 12173B raw, 2904B gzip, 303 lines
- public/foundation-action-route-review-inbox-renderers.js: 9997B raw, 2767B gzip, 234 lines
- public/foundation-source-registry-renderers.js: 55416B raw, 10722B gzip, 1450 lines
- public/foundation-fub-lead-source-renderers.js: 27456B raw, 5884B gzip, 678 lines
- public/foundation-system-inventory-renderers.js: 57848B raw, 11281B gzip, 1519 lines
- public/foundation-current-state-renderers.js: 45147B raw, 9808B gzip, 1172 lines
- public/foundation-decision-question-renderers.js: 52409B raw, 9280B gzip, 1443 lines
- public/foundation-source-lifecycle-renderers.js: 65313B raw, 9812B gzip, 1498 lines
- public/foundation-runtime-renderers.js: 79848B raw, 17296B gzip, 1901 lines
- public/foundation-operations-renderers.js: 51605B raw, 10951B gzip, 1218 lines
- public/foundation-home-renderers.js: 5330B raw, 1775B gzip, 128 lines
- public/foundation-strategy-renderers.js: 18156B raw, 4055B gzip, 576 lines
- public/foundation-router.js: 5394B raw, 1544B gzip, 196 lines

DOM budget:
- status=review, scripts=17, createElement=1669, appendChild=2139, innerHTML=73

Largest files:
- scripts/foundation-verify.mjs: 4996 LOC, 277778B
- public/foundation.js: 2998 LOC, 113609B
- lib/foundation-db-schema-seed-store.js: 2653 LOC, 137639B
- lib/foundation-build-closeout-tightening-records.js: 2599 LOC, 224341B
- public/styles-foundation-workflows.css: 2591 LOC, 50351B
- lib/foundation-source-crawl-store.js: 2491 LOC, 110816B
- lib/foundation-build-closeout-overnight-records.js: 2446 LOC, 190369B
- public/styles-foundation-core.css: 2291 LOC, 43082B

## Top Findings

### P1 Verifier mixes active sprint assertions with historical closeout proof
- Card lane: `VERIFIER-ASSUMPTION-REGISTRY-001`
- Type: `drift_risk`
- Evidence: `scripts/foundation-verify.mjs:3070` (historicalCardHasVerifiedCloseout), `scripts/foundation-verify.mjs:3136` (activeSprintAtOrPast), `scripts/foundation-verify.mjs:3138` (historicalCardHasVerifiedCloseout), `scripts/foundation-verify.mjs:4166` (historicalCardHasVerifiedCloseout), `scripts/foundation-verify.mjs:4371` (activeSprintAtOrPast), `scripts/foundation-verify.mjs:4452` (activeSprintAtOrPast)
- Why it matters: A current-sprint advancement assertion can pass from a historical closeout unless active and historical helpers are separate.
- Proposed owner/card: Foundation Verifier / `ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001`
- Detector: active versus historical helper detector

### P1 Foundation client embeds a large current-state renderer
- Card lane: `FOUNDATION-MONOLITH-RISK-AUDIT-001`
- Type: `refactor_candidate`
- Evidence: `public/foundation.js`
- Why it matters: Large mixed-responsibility surfaces slow audits, increase merge risk, and make future proof harder to isolate.
- Proposed owner/card: Foundation Engineering / `FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001`
- Detector: largest file/function ownership detector
- False-positive note: This is not approval to refactor during the audit sprint.

### P1 Foundation Hub route builds many domains in one handler
- Card lane: `FOUNDATION-MONOLITH-RISK-AUDIT-001`
- Type: `refactor_candidate`
- Evidence: `server.js`
- Why it matters: Large mixed-responsibility surfaces slow audits, increase merge risk, and make future proof harder to isolate.
- Proposed owner/card: Foundation Engineering / `FOUNDATION-HUB-PAYLOAD-EXTRACT-001`
- Detector: largest file/function ownership detector
- False-positive note: This is not approval to refactor during the audit sprint.

### P1 Source contract count is encoded as an exact baseline
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `lib/foundation-current-sprint.js:916`
- Why it matters: Source registry additions can break or stale-pass different surfaces when expected counts are not derived from `getSourceContracts()`.
- Proposed owner/card: Source Lifecycle / `SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001`
- Detector: source-count literal detector
- False-positive note: Accepted historical closeout text can stay if it is not used as current live truth.

### P1 Source contract count is encoded as an exact baseline
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-source-lifecycle-dynamic-counts-check.mjs:187`
- Why it matters: Source registry additions can break or stale-pass different surfaces when expected counts are not derived from `getSourceContracts()`.
- Proposed owner/card: Source Lifecycle / `SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001`
- Detector: source-count literal detector
- False-positive note: Accepted historical closeout text can stay if it is not used as current live truth.

### P2 Admin deal-review policy dates are duplicated across runner, job config, and UI
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `lib/foundation-jobs.js:956` (--backlog-since=), `lib/foundation-jobs.js:956` (2025-06-01), `lib/foundation-jobs.js:959` (June 2025), `lib/foundation-jobs.js:959` (2026-04-01), `lib/foundation-jobs.js:960` (June 2025), `scripts/review-admin-deals.mjs:14` (DEFAULT_BACKLOG_SINCE)
- Why it matters: Policy cutoff changes require manual edits across several surfaces unless a source contract owns the dates.
- Proposed owner/card: Ops Source Truth / `ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001`
- Detector: policy-date duplication detector
- False-positive note: Durable policy dates are acceptable when source ID, owner, and as-of date are explicit.

### P2 Plan Critic 9.8 threshold appears as raw literals
- Card lane: `VERIFIER-ASSUMPTION-REGISTRY-001`
- Type: `drift_risk`
- Evidence: `lib/foundation-current-sprint.js:342` (9.8), `lib/foundation-current-sprint.js:347` (9.8), `lib/foundation-current-sprint.js:486` (9.8), `lib/source-lifecycle-completion.js:682` (9.8), `lib/source-lifecycle-completion.js:682` (9.8), `scripts/process-action-route-dedup-staleness-guard-check.mjs:231` (9.8)
- Why it matters: Approval policy can drift when some checks import the registry constant and others hardcode the score.
- Proposed owner/card: Plan Critic / `APPROVAL-THRESHOLD-REGISTRY-001`
- Detector: raw approval threshold detector
- False-positive note: The canonical constant is valid; duplicated raw literals are the risk.

### P2 Build closeout history is code-owned data
- Card lane: `FOUNDATION-MONOLITH-RISK-AUDIT-001`
- Type: `refactor_candidate`
- Evidence: `lib/foundation-build-log.js`
- Why it matters: Large mixed-responsibility surfaces slow audits, increase merge risk, and make future proof harder to isolate.
- Proposed owner/card: Foundation Engineering / `BUILD-CLOSEOUT-REGISTRY-EXTRACT-001`
- Detector: largest file/function ownership detector
- False-positive note: This is not approval to refactor during the audit sprint.

### P2 Build Log shells out to git and returns duplicate group/build payloads
- Card lane: `FOUNDATION-API-PERF-AUDIT-001`
- Type: `performance_risk`
- Evidence: `server.js:333`, `lib/foundation-build-log.js`
- Why it matters: Request-time subprocess work and duplicated serialized build entries can make Recent Work slow as closeout history grows.
- Proposed owner/card: Foundation Runtime / `BUILD-LOG-API-CACHE-AND-SLIM-001`
- Detector: request-time git log detector

### P2 Build Intel commit is pinned as expected truth
- Card lane: `VERIFIER-ASSUMPTION-REGISTRY-001`
- Type: `drift_risk`
- Evidence: `lib/gstack-build-intel.js:20` (GSTACK_BUILD_INTEL_EXPECTED_COMMIT), `lib/gstack-build-intel.js:313` (GSTACK_BUILD_INTEL_EXPECTED_COMMIT), `lib/gstack-build-intel.js:314` (GSTACK_BUILD_INTEL_EXPECTED_COMMIT), `lib/gstack-build-intel.js:324` (GSTACK_BUILD_INTEL_EXPECTED_COMMIT), `lib/gstack-build-intel.js:391` (GSTACK_BUILD_INTEL_EXPECTED_COMMIT), `lib/gstack-build-intel.js:521` (GSTACK_BUILD_INTEL_EXPECTED_COMMIT)
- Why it matters: A fixed inspected commit is valid snapshot evidence, but it must not be treated as latest Build Intel monitoring truth.
- Proposed owner/card: Build Intel / `BUILD-INTEL-SNAPSHOT-BASELINE-001`
- Detector: expected-commit baseline detector
- False-positive note: Valid when labeled inspected snapshot evidence with an as-of date.

### P2 Focused checks assert exact dated active sprint IDs
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `lib/foundation-current-sprint.js:103` (const FOUNDATION_CURRENT_SPRINT_ID = 'foundation-current-2026-05-12), `lib/foundation-current-sprint.js:145` (const FOUNDATION_SOURCE_ONCE_OVER_SPRINT_ID = 'foundation-source-once-over-2026-05-12), `lib/foundation-verify-registry-split.js:7` (const FOUNDATION_VERIFY_REGISTRY_SPLIT_SPRINT_ID = 'foundation-verify-registry-split-2026-05-18), `lib/kpi-health.js:8` (const KPI_HEALTH_API_CACHE_SPRINT_ID = 'kpi-health-api-cache-2026-05-15), `lib/kpi-health.js:14` (const KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_SPRINT_ID = 'kpi-health-dynamic-year-contract-2026-05-16), `lib/gstack-build-intel.js:13` (const GSTACK_BUILD_INTEL_SPRINT_ID = 'gstack-build-intel-extraction-2026-05-13)
- Why it matters: One-time closeout checks are unsafe as nightly checks after rollover if they hard-fail on the current active sprint.
- Proposed owner/card: Foundation Process / `SPRINT-CHECK-HISTORICAL-MODE-001`
- Detector: dated active-sprint assertion detector
- False-positive note: Active live-truth literals still fail as P0; dated card/sprint metadata is a review finding unless a focused proof hard-fails after rollover.

### P2 Foundation frontend has heavy DOM rebuild signals
- Card lane: `FOUNDATION-FRONTEND-PERF-AUDIT-001`
- Type: `performance_risk`
- Evidence: `public/foundation.html:103`, `public/foundation.html:1` (Foundation frontend scripts call document.createElement 1669 times, above the 1200 aggregate review budget. Foundation frontend scripts call appendChild 2139 times, above the 1800 aggregate review budget. Foundation frontend scripts use innerHTML 73 times, above the 50 aggregate review budget.)
- Why it matters: Backlog, source, current-state, and runtime filters can churn large DOM trees on each interaction as card/source counts grow.
- Proposed owner/card: Foundation Frontend / `FOUNDATION-FRONTEND-DOM-BUDGET-001`
- Detector: DOM budget snapshot status=review createElement=1669 appendChild=2139 innerHTML=73

## Findings By Sprint Card

- `CODEBASE-HARDCODE-AUDIT-001`: 4 findings
- `FOUNDATION-API-PERF-AUDIT-001`: 1 finding
- `FOUNDATION-FRONTEND-PERF-AUDIT-001`: 1 finding
- `FOUNDATION-MONOLITH-RISK-AUDIT-001`: 3 findings
- `VERIFIER-ASSUMPTION-REGISTRY-001`: 3 findings
- `SPRINT-STATE-MUTATION-AUDIT-001`: 0 findings
- `NIGHTLY-AUDIT-REPORT-001`: 0 findings

## Proposed Backlog Fixes

- `ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001`
- `FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001`
- `FOUNDATION-HUB-PAYLOAD-EXTRACT-001`
- `SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001`
- `ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001`
- `APPROVAL-THRESHOLD-REGISTRY-001`
- `BUILD-CLOSEOUT-REGISTRY-EXTRACT-001`
- `BUILD-LOG-API-CACHE-AND-SLIM-001`
- `BUILD-INTEL-SNAPSHOT-BASELINE-001`
- `SPRINT-CHECK-HISTORICAL-MODE-001`
- `FOUNDATION-FRONTEND-DOM-BUDGET-001`

## Browser QA Route Matrix Proposal

- `#current-state`: open route, fail console errors, assert nonblank/non-loading content, verify hash/content match, check overflow, capture mobile and desktop, exercise one primary interaction when present.
- `#systems`: open route, fail console errors, assert nonblank/non-loading content, verify hash/content match, check overflow, capture mobile and desktop, exercise one primary interaction when present.
- `#backlog`: open route, fail console errors, assert nonblank/non-loading content, verify hash/content match, check overflow, capture mobile and desktop, exercise one primary interaction when present.
- `#source-lifecycle`: open route, fail console errors, assert nonblank/non-loading content, verify hash/content match, check overflow, capture mobile and desktop, exercise one primary interaction when present.
- `#system-health`: open route, fail console errors, assert nonblank/non-loading content, verify hash/content match, check overflow, capture mobile and desktop, exercise one primary interaction when present.
- `#build-log`: open route, fail console errors, assert nonblank/non-loading content, verify hash/content match, check overflow, capture mobile and desktop, exercise one primary interaction when present.
- `#overview`: open route, fail console errors, assert nonblank/non-loading content, verify hash/content match, check overflow, capture mobile and desktop, exercise one primary interaction when present.

## False-Positive Handling

- Historical closeout text is acceptable when clearly labeled as history.
- Fixed inspected commits are acceptable when labeled snapshot evidence with as-of date.
- Policy dates are acceptable when tied to an owner/source contract.
- Closeout scripts may mutate state only when run as explicit apply/ship actions, not as nightly audit dependencies.

## Not Applied

This report did not edit source files, move backlog cards, open or close sprints, run mutating process checks, apply Action Router routes, schedule jobs, or call any LLM to detect findings.

