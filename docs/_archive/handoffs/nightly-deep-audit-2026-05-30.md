# Nightly Deep Audit Report - 2026-05-30

Closeout key: `nightly-deep-audit-upgrade-v1`
Generated at: `2026-05-30T07:00:32.452Z`
Report path: `docs/_archive/handoffs/nightly-deep-audit-2026-05-30.md`

## Morning Read

- Status: `deep_review_executed`
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev.
- Active deterministic findings: 0 total (0 P0, 0 P1, 0 P2, 0 P3)
- Closed detector signals reconciled out of active audit: 0 of 0
- Changed files selected: 5
- High-risk review targets: 15
- LLM review mode: `bounded_senior_review_executed`
- Deep senior review rollup: `healthy` (deep senior review executed with 0 active finding(s) and 0 reconciled closed finding(s))
- Dogfood against May 13 failures: passed
- Doc/report artifact bloat: `healthy` (0 red, 0 yellow)

## Diff Summary

- Previous report: `docs/handoffs/nightly-deep-audit-2026-05-29.json`
- New findings: 0
- Still open: 0
- Resolved: 1
- Finding delta: -1

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

- /api/foundation-hub: 155ms, 595991B, risk=healthy (Within V1 audit budget.)
- /api/source-of-truth: 25ms, 199969B, risk=healthy (Within V1 audit budget.)
- /api/foundation/source-lifecycle: 661ms, 648566B, risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: 104ms, 237569B, risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: 32ms, 33222B, risk=healthy (Within V1 audit budget.)

## Largest Files

- scripts/foundation-verify.mjs: 4994 LOC, 276777B
- lib/dev-team-hub.js: 3211 LOC, 155694B
- public/dev.js: 3168 LOC, 149765B
- public/dev.css: 3109 LOC, 56017B
- public/foundation.js: 2991 LOC, 114042B
- lib/foundation-db-schema-seed-store.js: 2757 LOC, 141992B
- lib/foundation-build-closeout-overnight-records.js: 2718 LOC, 216767B
- lib/source-god-mode-youtube-handoff.js: 2705 LOC, 115788B
- lib/foundation-build-closeout-intelligence-records.js: 2687 LOC, 202469B
- lib/foundation-build-closeout-tightening-records.js: 2599 LOC, 226105B

## High-Risk Review Packets

### P0 scripts/foundation-verify.mjs

- Lines: 4994
- Bytes: 276777
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

### P1 lib/dev-team-hub.js

- Lines: 3211
- Bytes: 155694
- Reasons: over_3k_warn

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

- Lines: 3168
- Bytes: 149765
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

### P1 public/dev.css

- Lines: 3109
- Bytes: 56017
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

### P1 lib/foundation-db.js

- Lines: 2317
- Bytes: 93577
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

- Lines: 2059
- Bytes: 67337
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

### P1 lib/foundation-build-closeout-process-gate-operations-records.js

- Lines: 1290
- Bytes: 90136
- Reasons: changed_since_baseline

```
export const processGateOperationsCloseoutRecords = [
  {
    key: 'verify-gate-tiering-v1',
    backlogIds: ['VERIFY-GATE-TIERING-001'],
    match: {
      subjectIncludes: ['VERIFY-GATE-TIERING-001'],
    },
    systemArea: 'Foundation process',
    status: 'accepted',
    acceptanceState: 'Verified',
    whatChanged: 'Added proportional verification tiers for protected Foundation changes: static, focused, and full.',
    whatItDoes: 'Lets bounded docs, Current Sprint, process-proof, and Foundation/Ops surface changes pass pre-push with a recorded focused proof while keeping full-risk substrate changes on the full Foundation ship gate.',
    whyItMatters: 'Automatic proof still holds, but small safe changes no longer pay the full verifier cost every time or rely on informal bypasses.',
    whereItLives: [
      'Current Sprint',
      'lib/process-verify-gate-tiering.js',
      'scripts/process-verify-gate-tiering-check.mjs',
      'lib/process-git-hooks.js',
      'docs/process/verify-gate-tiering-001-plan.md',
    ],
    proofCommands: [
      'npm run process:verify-gate-tiering-check -- --json=true',
      'npm run backlog:hygiene -- --json',
    ],
    proofStatus: 'Focused verification tiering proof passed; backlog hygiene reported healthy with 354 cards and 0 findings.',
    reviewNext: 'Use the focused proof for bounded non-full changes; pull REBUILD-PLAN-RECONCILE-001 next.',
    knownLimits: [
      'This is not the VERIFIER-BEHAVIOR-SWEEP-001 cleanup.',
      'Full-risk paths still require process:foundation-ship or an explicit card/reason bypass.',
      'The bootstrap commit touches package/backlog seed files, so the old full-risk protection still applies to that ship.',
    ],
  },
  {
    key: 'foundation-verify-gate-tiering-finish-v1',
    backlogIds: ['FOUNDATION-VERIFY-GATE-TIERING-FINISH-001'],
    match: {
      subjectIncludes: [
        'FOUNDATION-VERIFY-GATE-TIERING-FINISH-001',
        'foundation-verify-gate-tiering-finish-v1',
        'Finish verifier gate deletion tiering',
      ],
    },
    systemArea: 'Foundation process',
    status: 'accepted',
    acceptanceState: 'Verified',
    whatChanged: 'Finished the tune-up verifier tiering gap by making protected Foundation file deletions classify as full-gate work and by recording focused proof from the actual HEAD diff.',
    whatItDoes: 'Keeps docs/process/hook edits on the fas
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

- Lines: 675
- Bytes: 26350
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

### P1 scripts/process-foundation-tuneup-remap-proof-check.mjs

- Lines: 493
- Bytes: 18606
- Reasons: changed_since_baseline, process_check_surface

```
async function applyLiveState({ closeCard = false, stage = 'building_now', planReview } = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: FOUNDATION_TUNEUP_REMAP_SCRIPT_PATH,
    operation: 'update remap proof backlog, Plan Critic, and Current Sprint state',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard],
  })

  await updateBacklogItem(FOUNDATION_TUNEUP_REMAP_CARD_ID, {
    lane: closeCard ? 'done' : 'executing',
    priority: 'P1',
    rank: 11,
    nextAction: closeCard
      ? `Done under ${FOUNDATION_TUNEUP_REMAP_CLOSEOUT_KEY}; stop for Steve checkpoint before ${FOUNDATION_TUNEUP_REMAP_NEXT_CARD_ID}.`
      : 'Run the read-only codebase remap and compare audit baselines to live repo facts.',
    statusNote: closeCard
      ? `Closed on 2026-05-30 under ${FOUNDATION_TUNEUP_REMAP_CLOSEOUT_KEY}. V1 remapped the codebase after the tune-up, compared live import/file-size/doc signals to audit baselines, and left per-hub restructuring checkpoint-only.`
      : `Building ${FOUNDATION_TUNEUP_REMAP_CLOSEOUT_KEY}; read-only remap proof, no generated graph or per-hub implementation.`,
    owner: 'Foundation Builder',
  }, ACTOR)
  if (closeCard) {
    await updateBacklogItem(FOUNDATION_TUNEUP_REMAP_NEXT_CARD_ID, {
      lane: 'scoped',
      priority: 'P1',
      rank: 3,
      nextAction: 'Steve checkpoint required before implementation. Review the remap proof and approve the per-hub folder card before any code restructure starts.',
      statusNote: 'Checkpoint-only after foundation-tuneup-remap-proof-v1. Do not implement per-hub folder restructure until Steve explicitly approves the build card.',
      owner: 'Foundation Builder',
    }, ACTOR)
  }
  await upsertPlanCriticRun(planReview)

  const activeSprint = await getActiveFoundationCurrentSprint()
  const sprintId = activeSprint.sprint?.sprintId || 'FOUNDATION-TUNEUP-2026-05-29'
  const item = buildSprintItem({ closeCard, stage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId,
        status: activeSprint.sprint?.status || 'active',
        goal: activeSprint.sprint?.goal || 'Foundation tune-up from Claude/Codex audits.',
        activeBlockerCardId: closeCard
          ? FOUNDATION_TUNEUP_REMAP_NEXT_CARD_ID
          : FOUNDATION_TUNEUP_REMAP_CARD_ID,
        metadata: {
          ...(a
```

### P1 lib/agentic-codebase-map.js

- Lines: 373
- Bytes: 15429
- Reasons: changed_since_baseline

```
import fs from 'node:fs/promises'
import path from 'node:path'

export const AGENTIC_CODEBASE_MAP_CARD_ID = 'AGENTIC-CODEBASE-MAP-001'
export const AGENTIC_CODEBASE_MAP_SCRIPT_PATH = 'scripts/process-agentic-codebase-map-check.mjs'
export const AGENTIC_CODEBASE_MAP_PLAN_PATH = 'docs/process/agentic-codebase-map-001-plan.md'
export const AGENTIC_CODEBASE_MAP_VERSION = 'agentic-codebase-map-v1'

export const AGENTIC_CODEBASE_INCLUDE_ROOTS = Object.freeze([
  'server.js',
  'package.json',
  'AGENTS.md',
  'lib',
  'scripts',
  'public',
  'docs/rebuild',
  'docs/process',
  'docs/source-notes',
  'ops/launchagents',
])

export const AGENTIC_CODEBASE_EXCLUDE_PATHS = Object.freeze([
  '.git',
  '.claude',
  '.openclaw',
  '.env',
  'node_modules',
  'memory',
  'MEMORY.md',
  'USER.md',
  'TOOLS.md',
  'IDENTITY.md',
  'HEARTBEAT.md',
  'docs/_archive',
  'docs/conversation-archive',
  'public/assets',
])

const EXTENSIONS = new Set(['.js', '.mjs', '.json', '.md', '.css', '.html'])

const CRITICAL_SURFACES = Object.freeze([
  { path: 'server.js', purpose: 'HTTP/API entrypoint' },
  { path: 'lib/dev-team-hub.js', purpose: 'Dev page read model' },
  { path: 'public/dev.js', purpose: 'Dev page client rendering' },
  { path: 'lib/foundation-db.js', purpose: 'live Postgres access layer' },
  { path: 'scripts/foundation-verify.mjs', purpose: 'Foundation verifier' },
  { path: 'scripts/process-foundation-ship.mjs', purpose: 'ship gate wrapper' },
  { path: 'lib/foundation-jobs.js', purpose: 'scheduled job registry' },
```

### P1 lib/foundation-tuneup-remap-proof.js

- Lines: 356
- Bytes: 15857
- Reasons: changed_since_baseline

```
import {
  evaluateAgenticCodebaseMap,
} from './agentic-codebase-map.js'

export const FOUNDATION_TUNEUP_REMAP_CARD_ID = 'FOUNDATION-TUNEUP-REMAP-PROOF-001'
export const FOUNDATION_TUNEUP_REMAP_CLOSEOUT_KEY = 'foundation-tuneup-remap-proof-v1'
export const FOUNDATION_TUNEUP_REMAP_PLAN_PATH = 'docs/process/foundation-tuneup-remap-proof-001-plan.md'
export const FOUNDATION_TUNEUP_REMAP_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-TUNEUP-REMAP-PROOF-001.json'
export const FOUNDATION_TUNEUP_REMAP_SCRIPT_PATH = 'scripts/process-foundation-tuneup-remap-proof-check.mjs'
export const FOUNDATION_TUNEUP_REMAP_NEXT_CARD_ID = 'FOUNDATION-HUB-FOLDER-ISOLATION-001'

export const FOUNDATION_TUNEUP_REMAP_CHANGED_FILES = [
  'lib/agentic-codebase-map.js',
  'lib/foundation-tuneup-remap-proof.js',
  FOUNDATION_TUNEUP_REMAP_SCRIPT_PATH,
  FOUNDATION_TUNEUP_REMAP_PLAN_PATH,
  FOUNDATION_TUNEUP_REMAP_APPROVAL_PATH,
  'lib/foundation-verify-coverage-card-ids.js',
  'lib/foundation-build-closeout-process-gate-operations-records.js',
  'package.json',
]

export const FOUNDATION_TUNEUP_REMAP_PROOF_COMMANDS = [
  'node --check lib/agentic-codebase-map.js',
  'node --check lib/foundation-tuneup-remap-proof.js',
  'node --check scripts/process-foundation-tuneup-remap-proof-check.mjs',
  'npm run process:agentic-codebase-map-check -- --json',
  'npm run process:foundation-tuneup-remap-proof-check -- --json',
  'npm run process:foundation-tuneup-remap-proof-check -- --apply --stage=building_now --json',
  'npm run process:foundation-tuneup-remap-proof-check -- --close-card --json',
  'npm run process:foundation-tuneup-roadmap-check -- --json',
  'npm run process:builder-memory-system-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  `npm run process:ship-check -- --card=${FOUNDATION_TUNEUP_REMAP_CARD_ID} --planApprovalRef=${FOUNDATION_TUNEUP_REMAP_APPROVAL_PATH} --closeoutKey=${FOUNDATION_TUNEUP_REMAP_CLOSEOUT_KEY} --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`,
  `npm run process:fanout-check -- --card=${FOUNDATION_TUNEUP_REMAP_CARD_ID} --closeoutKey=${FOUNDATION_TUNEUP_REMAP_CLOSEOUT_KEY}`,
  `npm run process:foundation-ship -- --card=${FOUNDATION_TUNEUP_REMAP_CARD_ID} --planApprovalRef=${FOUNDATION_TUNEUP_REMAP_APPROVAL_PATH} --closeoutKey=${FOUNDATION_TUNEUP_REMAP_CLOS
```

### P3 lib/foundation-jobs.js

- Lines: 1520
- Bytes: 67128
- Reasons: changed/review target

```
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

```

### P3 lib/code-quality-nightly-audit.js

- Lines: 1416
- Bytes: 64123
- Reasons: changed/review target

```
  })
  const timeoutEndpoint = classifyEndpointMetric({
    ok: false,
    timeout: true,
    timeoutMs: 5000,
  })
  const mutator = detectMutationPatternsInText({
    relativePath: 'synthetic/process-check.mjs',
    text: `await updateBacklogItem('CARD-001', { lane: 'done' })`,
  })
  const guardedMutator = detectMutationPatternsInText({
    relativePath: 'scripts/process-safe-check.mjs',
    text: `
      import { PROCESS_CHECK_WRITE_FLAGS, assertProcessCheckWriteAllowed, isProcessCheckWriteRequested } from '../lib/process-write-guard.js'
      assertProcessCheckWriteAllowed({ argv: process.argv.slice(2), scriptPath: 'scripts/process-safe-check.mjs', operation: 'synthetic update', allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] })
      if (isProcessCheckWriteRequested({ argv: process.argv.slice(2), allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply] })) await updateBacklogItem('CARD-001', { lane: 'done' })
    `,
  })
  const unguardedReportWriter = detectProcessReportWritePolicyInText({
    relativePath: 'scripts/process-report-check.mjs',
    text: `
      import fs from 'node:fs/promises'
      await fs.writeFile('docs/source-notes/run.md', '# generated')
    `,
  })
  const guardedReportWriter = detectProcessReportWritePolicyInText({
    relativePath: 'scripts/process-report-check.mjs',
    text: `
      import fs from 'node:fs/promises'
      import { isProcessReportWriteRequested } from '../lib/process-write-guard.js'
      const args = { writeReport: isProcessReportWriteRequested(process.argv.slice(2)) }
      if (args.writeReport) await fs.writeFile('docs/source-notes/run.md', '# generated')
    `,
  })
  const syntheticGeminiModel = ['gemini', '3.5', 'flash'].join('-')
  const runtimeModelHardcode = detectRuntimePolicyHardcodesInText({
    relativePath: 'scripts/process-unowned-model-check.mjs',
    text: `const MODEL = '${syntheticGeminiModel}'`,
  })
  const runtimeModelIdFalsePositive = detectRuntimePolicyHardcodesInText({
    relativePath: 'scripts/process-card-source-id-check.mjs',
    text: `
      const cardId = 'CLAUDE-CODE-REVIEW-BRAIN-ROUTE-001'
      const sourceId = 'SRC-CLAUDE-CODE-COMMUNITY-BUILD-INTEL-001'
      const folderCard = 'MATT-POCOCK-CLAUDE-FOLDER-EVAL-001'
      const routeKey = 'foundation-extractor-claude-subscription-reasoning'
    `,
  })
```

## Top Deterministic Findings

- none

## Doc / Report Artifact Bloat

- Status: `healthy`
- Handoff files: 201
- Handoff hot lines: 15883
- Nightly artifacts: 10
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
Generated at: `2026-05-30T07:00:33.410Z`

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

- /api/foundation-hub: status=200 latency=155ms payload=595991B risk=healthy (Within V1 audit budget.)
- /api/source-of-truth: status=200 latency=25ms payload=199969B risk=healthy (Within V1 audit budget.)
- /api/foundation/source-lifecycle: status=200 latency=661ms payload=648566B risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: status=200 latency=104ms payload=237569B risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: status=200 latency=32ms payload=33222B risk=healthy (Within V1 audit budget.)

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
- public/foundation-source-lifecycle-renderers.js: 65313B raw, 9812B gzip, 1498 lines
- public/foundation-runtime-renderers.js: 82614B raw, 17844B gzip, 1975 lines
- public/foundation-operations-renderers.js: 55410B raw, 11774B gzip, 1313 lines
- public/foundation-users-renderers.js: 11827B raw, 2838B gzip, 332 lines
- public/foundation-home-renderers.js: 5330B raw, 1775B gzip, 128 lines
- public/foundation-strategy-renderers.js: 25646B raw, 5784B gzip, 787 lines
- public/foundation-router.js: 5556B raw, 1585B gzip, 200 lines

DOM budget:
- status=review, scripts=19, createElement=1770, appendChild=2333, innerHTML=79

Largest files:
- scripts/foundation-verify.mjs: 4994 LOC, 276777B
- lib/dev-team-hub.js: 3211 LOC, 155694B
- public/dev.js: 3168 LOC, 149765B
- public/dev.css: 3109 LOC, 56017B
- public/foundation.js: 2991 LOC, 114042B
- lib/foundation-db-schema-seed-store.js: 2757 LOC, 141992B
- lib/foundation-build-closeout-overnight-records.js: 2718 LOC, 216767B
- lib/source-god-mode-youtube-handoff.js: 2705 LOC, 115788B

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
