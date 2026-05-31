# Nightly Deep Audit Report - 2026-05-31

Closeout key: `nightly-deep-audit-upgrade-v1`
Generated at: `2026-05-31T07:00:59.365Z`
Report path: `docs/handoffs/nightly-deep-audit-2026-05-31.md`

## Morning Read

- Status: `deep_review_executed`
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev.
- Active deterministic findings: 0 total (0 P0, 0 P1, 0 P2, 0 P3)
- Closed detector signals reconciled out of active audit: 0 of 0
- Changed files selected: 8
- High-risk review targets: 15
- LLM review mode: `bounded_senior_review_executed`
- Deep senior review rollup: `healthy` (deep senior review executed with 0 active finding(s) and 0 reconciled closed finding(s))
- Dogfood against May 13 failures: passed
- Doc/report artifact bloat: `healthy` (0 red, 0 yellow)

## Diff Summary

- Previous report: `docs/handoffs/nightly-deep-audit-2026-05-30.json`
- New findings: 0
- Still open: 0
- Resolved: 0
- Finding delta: 0

## LLM Review Boundary

- Executed this run: yes
- Selected route: `foundation-deep-audit-openai-api`
- Provider/model: `openai / gpt-5.5`
- Route blocker: none
- Active finding count: 0
- Closed senior-review repeats reconciled out: 0
- Note: Deep senior review executed through the approved router with report-only/no-autofix posture.

Deep senior review executed through the approved router.

## Senior Review Findings

- none

## Reconciled Closed Audit Signals

- none

## Endpoint And Payload Trend

- /api/foundation-hub: 204ms, 611454B, risk=healthy (Within V1 audit budget.)
- /api/source-of-truth: 24ms, 199981B, risk=healthy (Within V1 audit budget.)
- /api/foundation/source-lifecycle: 322ms, 660446B, risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: 141ms, 469108B, risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: 28ms, 33222B, risk=healthy (Within V1 audit budget.)

## Largest Files

- scripts/foundation-verify.mjs: 4999 LOC, 277964B
- public/dev.css: 3531 LOC, 64413B
- lib/dev-team-hub.js: 3485 LOC, 166237B
- public/dev.js: 3170 LOC, 149938B
- public/foundation.js: 2991 LOC, 114042B
- lib/foundation-db-schema-seed-store.js: 2775 LOC, 143411B
- lib/source-god-mode-youtube-handoff.js: 2705 LOC, 115788B
- lib/foundation-source-crawl-store.js: 2541 LOC, 112933B
- lib/foundation-shared-comms-store.js: 2176 LOC, 88461B
- lib/foundation-runtime-reliability-verifier.js: 2169 LOC, 135265B

## High-Risk Review Packets

### P0 scripts/foundation-verify.mjs

- Lines: 4999
- Bytes: 277964
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
  buildFoundationVerifierProgressionHelpers,
} from '../lib/foundation-verifier-progression-helpers.js'
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
import { runSerializedFoundationGateCheck } from '../lib/foundation-gate-check-serialization.js'
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
```

### P1 public/dev.css

- Lines: 3531
- Bytes: 64413
- Reasons: over_3k_warn

```
@font-face {
  font-family: 'Stratum1';
  src: url('/fonts/Stratum1-Regular.otf') format('opentype');
  font-weight: 400;
  font-display: swap;
}

@font-face {
  font-family: 'Stratum1';
  src: url('/fonts/Stratum1-Medium.otf') format('opentype');
  font-weight: 500;
  font-display: swap;
}

@font-face {
  font-family: 'Stratum1';
  src: url('/fonts/Stratum1-Bold.otf') format('opentype');
  font-weight: 700;
  font-display: swap;
}

@font-face {
  font-family: 'Stratum1';
  src: url('/fonts/Stratum1-Black.otf') format('opentype');
  font-weight: 900;
  font-display: swap;
}

:root {
  --ink: #0A0F1A;
  --blue: #0084C9;
  --blue-up: #4DBDFF;
  --blue-deep: #005FA3;
  --white: #FFFFFF;
  --grey: #EBEBEB;
  --grey-1: #F5F7FA;
  --grey-d: #4B5563;
  --grey-line: rgba(10, 15, 26, 0.08);
  --display: 'Stratum1', 'Arial Black', sans-serif;
  --body: 'Open Sans', system-ui, sans-serif;
  --mono: 'JetBrains Mono', ui-monospace, monospace;
  --t-micro: 11px;
  --t-xs: 12px;
  --t-sm: 13px;
  --t-base: 14px;
  --t-md: 16px;
  --t-lg: 18px;
  --t-xl: 22px;
```

### P1 lib/dev-team-hub.js

- Lines: 3485
- Bytes: 166237
- Reasons: changed_since_baseline, over_3k_warn

```
import { CREATOR_WATCHLIST_SOURCE_ID } from './build-intel-watchlist.js'
import {
  YOUTUBE_CREATOR_DAILY_WATCH_JOB_KEY,
  YOUTUBE_CREATOR_DAILY_WATCH_MARK_CREATOR_ID,
  YOUTUBE_CREATOR_DAILY_WATCH_REPORT_ARTIFACT_ID,
  YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID,
  YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
} from './youtube-creator-daily-watch.js'
import {
  YOUTUBE_SCOUT_CHANNEL,
  YOUTUBE_SCOUT_CHANNEL_URL,
  YOUTUBE_SCOUT_REPORT_ARTIFACT_ID,
  YOUTUBE_SCOUT_SEED_ARTIFACT_ID,
  YOUTUBE_SCOUT_SEED_VIDEO_ID,
  YOUTUBE_SCOUT_SEED_VIDEO_URL,
  YOUTUBE_SCOUT_SOURCE_ID,
  YOUTUBE_SCOUT_VIDEO_SOURCE_ID,
} from './youtube-scout-latest-video-vision.js'
import {
  YOUTUBE_BUILD_INTEL_LINK_RESOURCE_REPORT_ARTIFACT_ID,
} from './youtube-build-intel-link-resource.js'
import {
  GOD_MODE_EYES_SOURCE_ID,
  GOD_MODE_EYES_VIDEO_SOURCE_ID,
  GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID,
} from './god-mode-extractor-eyes-quality-loop.js'
import {
  MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID,
} from './mark-kashef-god-mode-small-batch.js'
import {
  MARK_KASHEF_BASELINE_REPORT_ARTIFACT_ID,
} from './god-mode-youtube-end-to-end-extractor.js'
import {
  DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID,
  DEV_TEAM_INTELLIGENCE_DIRECTOR_SOURCE_ID,
} from './dev-team-intelligence-director.js'
import {
  BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID,
  BUILD_INTEL_SOURCE_VALUE_GRADER_SOURCE_ID,
} from './build-intel-source-value-grader.js'
import {
  isYoutubeLatest20FullWatchReportId,
} from './youtube-latest-20-full-watch-runner.js'
import {
  buildDevIntelSourceCoverageSnapshot,
} from './dev-intel-source-coverage.js'
import {
  buildSourcePacketPreview,
```

### P1 public/dev.js

- Lines: 3170
- Bytes: 149938
- Reasons: over_3k_warn

```
  const runtime = systemRuntimeCopy(system)
  const youtubeCreators = list(system.creatorLeaderboard).length
    ? list(system.creatorLeaderboard)
    : list(system.topCreators)
  const youtubeCreatorTotal = Number(system.readbackTruth?.creatorLeaderboardCount || youtubeCreators.length)
  const youtubeGradeSummary = Object.entries(system.creatorGradeBuckets || {})
    .map(([grade, count]) => `${grade}: ${count}`)
    .join(' · ')
  els.youtubeSystem.innerHTML = `
    <section class="yt-runtime ${escapeHtml(systemTone(runtime))}">
      <div>
        <span>LIVE PIPELINE</span>
        <h2>${escapeHtml(runtime)}</h2>
        <p>${escapeHtml(job.statusDetail || job.scheduleDetail || system.sourceRoute || 'Foundation runtime status is loading.')}</p>
      </div>
      <div class="yt-runtime-meta">
        <span><b>Last job</b>${escapeHtml(shortDate(job.latestRunAt || job.latestRunStartedAt))}</span>
        <span><b>Next run</b>${escapeHtml(shortDate(job.nextRunAt))}</span>
        <span><b>Latest batch</b>${escapeHtml(shortDate(latestBatch.updatedAt))}</span>
        <span><b>Duration</b>${escapeHtml(durationCopy(job.latestRunDurationMs))}</span>
      </div>
    </section>

    <section class="yt-stats" aria-label="YouTube intelligence counts">
      ${renderYoutubeSystemStats(system)}
    </section>

    <section class="yt-section">
      <div class="yt-section-head">
        <span>PIPELINE STAGES</span>
        <h3>One connected system, not separate chores</h3>
      </div>
      <div class="yt-stage-grid">
        ${list(system.stages).map(renderYoutubeStage).join('') || '<article class="loading-card">No stage readback available.</article>'}
      </div>
    </section>

    <section class="yt-two-col">
      <div class="yt-section">
        <div class="yt-section-head">
          <span>NEXT WATCH BATCH</span>
          <h3>Exact public videos selected</h3>
        </div>
        <div class="yt-video-list">
          ${list(system.selectedVideos).map(renderYoutubeNextVideo).join('') || '<article class="loading-card">No runnable public videos selected right now.</article>'}
        </div>
      </div>
      <div class="yt-section">
```

### P1 public/foundation.js

- Lines: 2991
- Bytes: 114042
- Reasons: frontend_route_cache_surface

```
  note.textContent = 'Current strategy rule: the page pulls live data when it loads, and you can refresh it manually. Automatic background refresh can be added later if we need it.'
  panel.appendChild(note)

  return panel
}

function renderBacklog() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading live backlog.</p>'
  var focusedIds = getSection() === 'backlog'
    ? getSectionFocus().split(',').map(function(id) { return id.trim() }).filter(Boolean)
    : []

  Promise.all([
    fetchFoundationBacklog({ ids: focusedIds }),
    fetchActionReview().catch(function(error) {
      return { error: error.message || 'Action Review could not load.' }
    }),
  ]).then(function(results) {
    var hub = results[0]
    var actionReview = results[1]
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

### P1 server.js

- Lines: 2073
- Bytes: 67726
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
  listFoundationUsers,
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
```

### P1 scripts/process-dev-team-hub-v0-check.mjs

- Lines: 1818
- Bytes: 119641
- Reasons: changed_since_baseline, process_check_surface

```
#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  closeFoundationDb,
  initFoundationDb,
} from '../lib/foundation-db-session.js'
import {
  getActiveFoundationCurrentSprint,
} from '../lib/foundation-backlog-sprint-db.js'
import {
  getExtractionControlSnapshot,
  listSourceCrawlItems,
} from '../lib/foundation-source-crawl-db.js'
import {
  getIntelligenceReportBundle,
  listYoutubeFullWatchReportArtifacts,
} from '../lib/foundation-intelligence-db.js'
import {
  getFoundationSnapshot,
} from '../lib/foundation-strategy-docs-db.js'
import {
  listLlmCalls,
} from '../lib/foundation-runtime-jobs-db.js'
import { getSourceContracts } from '../lib/source-contracts.js'
import { buildCreatorWatchlistSnapshot } from '../lib/build-intel-watchlist.js'
import {
  YOUTUBE_CREATOR_DAILY_WATCH_JOB_KEY,
  YOUTUBE_CREATOR_DAILY_WATCH_READBACK_LIMIT,
  YOUTUBE_CREATOR_DAILY_WATCH_REPORT_ARTIFACT_ID,
  YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
  buildYoutubeCreatorDailyWatchReadSnapshot,
} from '../lib/youtube-creator-daily-watch.js'
import {
  YOUTUBE_SCOUT_REPORT_ARTIFACT_ID,
} from '../lib/youtube-scout-latest-video-vision.js'
import {
  YOUTUBE_BUILD_INTEL_LINK_RESOURCE_REPORT_ARTIFACT_ID,
} from '../lib/youtube-build-intel-link-resource.js'
import {
  GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID,
} from '../lib/god-mode-extractor-eyes-quality-loop.js'
import {
  MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID,
```

### P1 lib/connector-uptime-monitor.js

- Lines: 1109
- Bytes: 43886
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

### P1 lib/foundation-verify-coverage-card-ids.js

- Lines: 696
- Bytes: 27165
- Reasons: changed_since_baseline

```
export const PROCESS_REPAIR_VERIFIER_SPRINT_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'SPRINT-PROCESS-REPAIR-001',
  'VERIFIER-SPRINT-INDEPENDENCE-001',
  'VERIFIER-MODULAR-SPLIT-001',
]

export const FOUNDATION_SPRINT_SYSTEM_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'FOUNDATION-SPRINT-SYSTEM-001',
  'HUMAN-WEB-AGENT-V1-SPRINT-PLAN-001',
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

export const FOUNDATION_GATE_CHECK_SERIALIZATION_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'FOUNDATION-GATE-CHECK-SERIALIZATION-001',
]

export const RUNTIME_SAFETY_HARDENING_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE = [
  'VERIFY-READONLY-GATE-001',
  'PROCESS-CHECK-APPLY-BOUNDARY-001',
```

### P1 lib/dev-hub-next-repair-queue.js

- Lines: 541
- Bytes: 26640
- Reasons: changed_since_baseline

```
export const DEV_HUB_NEXT_REPAIR_QUEUE_CARD_ID = 'DEV-HUB-NEXT-REPAIR-QUEUE-001'
export const DEV_HUB_NEXT_REPAIR_QUEUE_CLOSEOUT_KEY = 'dev-hub-next-repair-queue-v1'
export const DEV_HUB_NEXT_REPAIR_QUEUE_PLAN_PATH = 'docs/process/dev-hub-next-repair-queue-001-plan.md'
export const DEV_HUB_NEXT_REPAIR_QUEUE_APPROVAL_PATH = 'docs/process/approvals/DEV-HUB-NEXT-REPAIR-QUEUE-001.json'
export const DEV_HUB_NEXT_REPAIR_QUEUE_SCRIPT_PATH = 'scripts/process-dev-hub-next-repair-queue-check.mjs'
export const DEV_HUB_NEXT_REPAIR_QUEUE_CONTRACT_VERSION = 'dev-hub-next-repair-queue.v1'
export const DEV_HUB_NEXT_REPAIR_QUEUE_VISIBLE_HOME = 'Dev Hub > Data Pool > Next Repairs'

function list(value) {
  return Array.isArray(value) ? value : []
}

function text(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function count(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function toIso(value) {
  if (value instanceof Date) return value.toISOString()
  const date = new Date(value || '')
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

function truncate(value, maxChars = 190) {
  const normalized = text(value)
  if (normalized.length <= maxChars) return normalized
  return `${normalized.slice(0, Math.max(0, maxChars - 3)).trim()}...`
}

function buildBoundaries() {
  return {
    readOnly: true,
    proposalOnly: true,
    noCardCreate: true,
    noBacklogMutation: true,
    noScoperMutation: true,
    noPortfolioMutation: true,
    noCurrentSprintMutation: true,
    noApprovalMutation: true,
    noRouteApprove: true,
    noRouteApply: true,
    noRouteReject: true,
    noRouteSnooze: true,
    noRouteReroute: true,
```

### P1 public/dev.html

- Lines: 411
- Bytes: 17796
- Reasons: changed_since_baseline

```
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dev Intelligence · BCrew AI OS</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/hub-launcher.css?v=20260525a" />
  <link rel="stylesheet" href="/dev.css?v=20260530-oversized-core" />
  <link rel="stylesheet" href="/dev-youtube-source.css?v=20260530-oversized-v1" />
  <link rel="stylesheet" href="/dev-source-approval.css?v=20260530-oversized-v1" />
  <link rel="stylesheet" href="/dev-scoper-evidence-trace.css?v=20260531-scoper-trace-v1" />
  <link rel="stylesheet" href="/dev-intelligence-hygiene.css?v=20260531-hygiene-v1" />
  <link rel="stylesheet" href="/dev-auditor-flow.css?v=20260531-auditor-flow-v1" />
  <link rel="stylesheet" href="/dev-synthesis-scope.css?v=20260531-synthesis-scope-v1" />
  <link rel="stylesheet" href="/dev-route-review-triage.css?v=20260531-route-triage-v1" />
  <link rel="stylesheet" href="/dev-scoper-runtime-readback.css?v=20260531-scoper-runtime-v1" />
  <link rel="stylesheet" href="/dev-business-source-pipeline-triage.css?v=20260531-business-source-v1" />
  <link rel="stylesheet" href="/dev-next-repair-queue.css?v=20260531-next-repair-v1" />
</head>
<body>
  <header class="launcher-topbar">
    <a class="launcher-brand" href="/" aria-label="BCrew AI OS home">
      <span class="launcher-logo-frame">
        <img src="/assets/bc-logo.svg" alt="Benson Crew logo" />
      </span>
      <span class="launcher-brand-name">
        BCREW AI OS <span aria-hidden="true">&middot;</span><span>dev · build</span>
      </span>
    </a>

    <div class="launcher-topbar-right">
      <span class="launcher-clock" id="launcher-clock">Loading time <b>&middot; EDT</b></span>
      <span class="launcher-live"><span class="launcher-live-dot"></span>SYSTEM LIVE</span>
      <div class="launcher-user-menu-wrap" id="launcher-user" aria-live="polite">
        <button
          clas
```

### P1 scripts/process-dev-hub-next-repair-queue-check.mjs

- Lines: 376
- Bytes: 18491
- Reasons: changed_since_baseline, process_check_surface

```
    source: 'Steve overnight approval: let the Dev Hub recommend the next safe repairs while parking approval-bound mutation work.',
    summary: 'Added a read-only Dev Hub Next Repair Queue that ranks proposal-only repair rows across business source flow, route review, Scoper runtime, synthesis scope, auditor flow, and hygiene pressure.',
    whyItMatters: 'The Dev Hub now tells the builder what to do next from live pipe evidence without creating cards, promoting Scoper work, applying routes, or auto-building.',
    nextAction: 'Done under dev-hub-next-repair-queue-v1. Next safe slice: choose one proposed repair and build it as a separate approved card; keep extraction, connector sync, Scoper scheduling, route apply, and model-backed synthesis approval-bound.',
    statusNote: `Closed with proof: npm run process:dev-hub-next-repair-queue-check -- --close-card --json; npm run process:dev-team-hub-v0-check -- --json; npm run foundation:verify -- --json-summary. Live next-repair summary: proposals=${readback.summary?.proposedRepairCount || 0}, approvalBound=${readback.summary?.approvalBoundCount || 0}, internalWriteRequired=${readback.summary?.internalWriteRequiredCount || 0}, cardsCreated=${readback.summary?.cardsCreatedByReadback || 0}, routeMutations=${readback.summary?.routeMutationsByReadback || 0}, atomWrites=${readback.summary?.atomRowsWrittenByReadback || 0}, modelCalls=${readback.summary?.modelCallsStarted || 0}, externalWrites=${readback.summary?.externalWritesByReadback || 0}. All rows remain proposal-only and no backlog, Scoper, Portfolio, Current Sprint, route, atom, fact, synthesis, extraction, connector, Harlan, model, or external write is performed by this readback path.`,
    owner: 'Codex / Dev Hub',
  }
  const existing = (await getBacklogItemsByIds([DEV_HUB_NEXT_REPAIR_QUEUE_CARD_ID]))[0]
  if (existing) return updateBacklogItem(DEV_HUB_NEXT_REPAIR_QUEUE_CARD_ID, update, ACTOR)
  return createBacklogItem({ ...update, idPrefix: 'DEV-HUB-NEXT-REPAIR-QUEUE' }, ACTOR)
}

async function buildLiveReadback() {
  const generatedAt = new Date().toISOString()
  const foundationSnapshot = await getFoundationSnapshot()
  const extractionControl = await getExtractionControlSnapshot({ limit: 200 })
  const foundationDoneBar = buildDevHubFoundationDoneBarFromInputs({
    foundationSnapshot,
    extractionControl,
    sourceContracts: getSourceContracts(),
```

### P1 lib/foundation-db.js

- Lines: 211
- Bytes: 6725
- Reasons: live_truth_write_boundary

```
// Compatibility facade only. New code should import the owning domain module.
export {
  FOUNDATION_DB_INIT_SEED_SPLIT_CARD_ID,
  FOUNDATION_DB_READ_ONLY_GATE_TABLES,
  assertFoundationDbReadyForReadOnlyGate,
  bootstrapFoundationDb,
  buildFoundationDbInitSeedSplitDogfoodProof,
  closeFoundationDb,
  getFoundationDbConstraintAudit,
  getFoundationDbReadOnlyGateReadiness,
  initFoundationDb,
  resetFoundationDb,
  withFoundationAdvisoryLock,
} from './foundation-db-session.js'

export {
  BACKLOG_STORE_CONCURRENCY_CARD_ID,
  CURRENT_SPRINT_MUTATION_GUARDS_CARD_ID,
  FoundationCurrentSprintMutationGuardError,
  buildCurrentSprintMutationGuardsDogfoodProof,
  createBacklogItem,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getBacklogSeedDriftSnapshot,
  getFoundationBacklogIdPrefixes,
  getFoundationBacklogScopes,
  getPlanCriticRunsByCardIds,
  updateBacklogItem,
  upsertFoundationCurrentSprintOverlay,
} from './foundation-backlog-sprint-db.js'

export {
  classifySourceCrawlItemRetries,
  finishSourceCrawlTargetRun,
  getDriveCorpusInventorySnapshot,
  getExtractionControlSnapshot,
  getExtractionRunHardeningSnapshot,
  getLatestDriveAccessPreflightRun,
  getLatestMeetingVaultAclAudit,
  getLatestMeetingVaultAutoEnforcementRun,
  getMeetingVaultLegacyExceptions,
  getRetryableSourceCrawlItems,
  getSourceContractRegistrySnapshot,
  getSourceCrawlItemsByExternalId,
  getSourceMaturityOperationalMetrics,
  getStaleSourceCrawlTargetRuns,
  leaseRetryableSourceCrawlItems,
  leaseSourceCrawlTarget,
```

### P1 public/dev-next-repair-queue.css

- Lines: 160
- Bytes: 2818
- Reasons: changed_since_baseline

```
.next-repair-head-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.next-repair-head-stats span {
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--muted);
  font-size: var(--t-xs);
  font-weight: 800;
  padding: 6px 10px;
  text-transform: uppercase;
}

.next-repair-queue {
  display: grid;
  gap: var(--s-4);
}

.next-repair-summary,
.next-repair-list {
  display: grid;
  gap: var(--s-3);
}

.next-repair-summary {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.next-repair-list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.next-repair-summary article,
.next-repair-boundary,
.next-repair-card,
.next-repair-empty {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 8px;
}

.next-repair-summary article {
  min-height: 88px;
  padding: var(--s-4);
```

### P1 public/dev-next-repair-queue.js

- Lines: 121
- Bytes: 4228
- Reasons: changed_since_baseline

```
  }

  function renderNextRepairQueue(snapshot = {}) {
    if (!root) return
    const queue = snapshot.nextRepairQueue || {}
    const summary = queue.summary || {}

    if (headStats) {
      headStats.innerHTML = `
        <span><b>${escapeHtml(compactNumber(summary.proposedRepairCount || 0))}</b> proposed</span>
        <span><b>${escapeHtml(compactNumber(summary.approvalBoundCount || 0))}</b> approval-bound</span>
        <span><b>${escapeHtml(compactNumber(summary.cardsCreatedByReadback || 0))}</b> cards created</span>
      `
    }

    if (!queue.ok) {
      root.innerHTML = `
        <article class="next-repair-empty blocked">
          <span>Fail closed</span>
          <h3>Next Repair Queue is not healthy</h3>
          <p>${escapeHtml(list(queue.failures).slice(0, 4).join(' · ') || 'No repair queue payload returned.')}</p>
        </article>
      `
      return
    }

    root.innerHTML = `
      <section class="next-repair-summary">
        ${renderMetric('Proposals', summary.proposedRepairCount)}
        ${renderMetric('Approval Bound', summary.approvalBoundCount)}
        ${renderMetric('Internal Writes', summary.internalWriteRequiredCount)}
        ${renderMetric('Cards Created', summary.cardsCreatedByReadback)}
      </section>

      <section class="next-repair-boundary">
        <div>
          <span>Proposal-only repair queue</span>
          <p>${escapeHtml(queue.plainEnglish || 'Ranks next repairs without creating cards, promoting Scoper work, applying routes, or writing externally.')}</p>
        </div>
      </section>

      <section class="next-repair-list">
        ${list(queue.proposedRepairs).map(renderRepair).join('') || '<article class="next-repair-card"><div class="next-repair-copy"><strong>No repair proposals returned.</strong></div></article>'}
      </section>
    `
  }

  function renderNextRepairError(error = '') {
```

## Top Deterministic Findings

- none

## Doc / Report Artifact Bloat

- Status: `healthy`
- Handoff files: 11
- Handoff hot lines: 3381
- Nightly artifacts: 9
- Red/yellow findings: 0/0

- none

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
Generated at: `2026-05-31T07:00:59.981Z`

## Morning Read

- Status: `report_ready`
- Active findings: 0 total (0 P0, 0 P1, 0 P2, 0 P3)
- Raw detector signals: 0
- Closed detector signals reconciled out: 0
- Active proposed backlog fixes: 0
- Detection mode: deterministic code first; no LLM detection used.
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev, no feature work.
- Synthetic proof: passed (hardcoded=2, mutator=1, slowEndpoint=risk)

## Endpoint Coverage

- /api/foundation-hub: status=200 latency=204ms payload=611454B risk=healthy (Within V1 audit budget.)
- /api/source-of-truth: status=200 latency=24ms payload=199981B risk=healthy (Within V1 audit budget.)
- /api/foundation/source-lifecycle: status=200 latency=322ms payload=660446B risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: status=200 latency=141ms payload=469108B risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: status=200 latency=28ms payload=33222B risk=healthy (Within V1 audit budget.)

## Asset And Monolith Metrics

Assets:
- public/foundation.html: 8561B raw, 1792B gzip, 123 lines
- public/styles.css: 649B raw, 296B gzip, 15 lines
- public/foundation-nav-config.js: 8635B raw, 2385B gzip, 179 lines
- public/foundation-data.js: 15667B raw, 3127B gzip, 508 lines
- public/foundation-doc-markdown-renderers.js: 37274B raw, 7467B gzip, 1213 lines
- public/foundation.js: 114042B raw, 22472B gzip, 2991 lines
- public/foundation-backlog-renderers.js: 12173B raw, 2904B gzip, 303 lines
- public/foundation-action-route-review-inbox-renderers.js: 9997B raw, 2767B gzip, 234 lines
- public/foundation-source-registry-renderers.js: 60541B raw, 11908B gzip, 1537 lines
- public/foundation-data-sources-v2-renderers.js: 10368B raw, 2788B gzip, 248 lines
- public/foundation-fub-lead-source-renderers.js: 27456B raw, 5884B gzip, 678 lines
- public/foundation-system-inventory-renderers.js: 65366B raw, 12729B gzip, 1696 lines
- public/foundation-current-state-renderers.js: 48830B raw, 10564B gzip, 1249 lines
- public/foundation-decision-question-renderers.js: 52409B raw, 9280B gzip, 1443 lines
- public/foundation-source-lifecycle-renderers.js: 65761B raw, 9916B gzip, 1501 lines
- public/foundation-runtime-renderers.js: 82614B raw, 17844B gzip, 1975 lines
- public/foundation-operations-renderers.js: 55410B raw, 11774B gzip, 1313 lines
- public/foundation-users-renderers.js: 11827B raw, 2838B gzip, 332 lines
- public/foundation-home-renderers.js: 5330B raw, 1775B gzip, 128 lines
- public/foundation-strategy-renderers.js: 25646B raw, 5784B gzip, 787 lines
- public/foundation-router.js: 5556B raw, 1585B gzip, 200 lines

DOM budget:
- status=review, scripts=19, createElement=1770, appendChild=2335, innerHTML=79

Largest files:
- scripts/foundation-verify.mjs: 4999 LOC, 277964B
- public/dev.css: 3531 LOC, 64413B
- lib/dev-team-hub.js: 3485 LOC, 166237B
- public/dev.js: 3170 LOC, 149938B
- public/foundation.js: 2991 LOC, 114042B
- lib/foundation-db-schema-seed-store.js: 2775 LOC, 143411B
- lib/source-god-mode-youtube-handoff.js: 2705 LOC, 115788B
- lib/foundation-source-crawl-store.js: 2541 LOC, 112933B

## Top Findings



## Findings By Sprint Card

- `CODEBASE-HARDCODE-AUDIT-001`: 0 findings
- `FOUNDATION-API-PERF-AUDIT-001`: 0 findings
- `FOUNDATION-FRONTEND-PERF-AUDIT-001`: 0 findings
- `FOUNDATION-MONOLITH-RISK-AUDIT-001`: 0 findings
- `VERIFIER-ASSUMPTION-REGISTRY-001`: 0 findings
- `SPRINT-STATE-MUTATION-AUDIT-001`: 0 findings
- `NIGHTLY-AUDIT-REPORT-001`: 0 findings

## Proposed Backlog Fixes



## Reconciled Closed Detector Signals

- None

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
