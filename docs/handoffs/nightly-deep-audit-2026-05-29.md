# Nightly Deep Audit Report - 2026-05-29

Closeout key: `nightly-deep-audit-upgrade-v1`
Generated at: `2026-05-29T07:00:52.951Z`
Report path: `docs/handoffs/nightly-deep-audit-2026-05-29.md`

## Morning Read

- Status: `deep_review_executed`
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev.
- Active deterministic findings: 1 total (0 P0, 0 P1, 1 P2, 0 P3)
- Closed detector signals reconciled out of active audit: 0 of 1
- Changed files selected: 4
- High-risk review targets: 16
- LLM review mode: `bounded_senior_review_executed`
- Deep senior review rollup: `healthy` (deep senior review executed with 1 active finding(s) and 0 reconciled closed finding(s))
- Dogfood against May 13 failures: passed
- Doc/report artifact bloat: `healthy` (0 red, 0 yellow)

## Diff Summary

- Previous report: `docs/handoffs/nightly-deep-audit-2026-05-19.json`
- New findings: 1
- Still open: 0
- Resolved: 12
- Finding delta: -11

## LLM Review Boundary

- Executed this run: yes
- Selected route: `foundation-deep-audit-openai-api`
- Provider/model: `openai / gpt-5.5`
- Route blocker: none
- Active finding count: 1
- Closed senior-review repeats reconciled out: 0
- Note: Deep senior review executed through the approved router with report-only/no-autofix posture.

Deep senior review executed through the approved router.

## Senior Review Findings

- P2 Runtime model name appears outside router/config ownership (scripts/process-source-browser-runtime-cost-guardrails-check.mjs:53) -> LLM-RUNTIME-CONFIG-AUDIT-001; owner=Source Browser / LLM runtime config owner; next=Move the model name behind the owned runtime router/config contract, have this guardrail import that source of truth, and add a focused assertion that no non-config script owns provider/model literals.

## Reconciled Closed Audit Signals

- none

## Endpoint And Payload Trend

- /api/foundation-hub: 179ms, 592055B, risk=healthy (Within V1 audit budget.)
- /api/source-of-truth: 32ms, 199958B, risk=healthy (Within V1 audit budget.)
- /api/foundation/source-lifecycle: 693ms, 628059B, risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: 121ms, 296534B, risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: 37ms, 33222B, risk=healthy (Within V1 audit budget.)

## Largest Files

- scripts/foundation-verify.mjs: 4998 LOC, 277372B
- public/dev.css: 4782 LOC, 85504B
- lib/foundation-build-closeout-source-records.js: 4750 LOC, 432200B
- lib/dev-team-hub.js: 3170 LOC, 152776B
- lib/foundation-build-closeout-process-gate-records.js: 3133 LOC, 224729B
- public/dev.js: 3067 LOC, 144988B
- public/foundation.js: 2987 LOC, 113810B
- lib/foundation-db-schema-seed-store.js: 2757 LOC, 141992B
- lib/foundation-build-closeout-overnight-records.js: 2718 LOC, 216767B
- lib/foundation-build-closeout-intelligence-records.js: 2687 LOC, 202469B

## High-Risk Review Packets

### P0 scripts/foundation-verify.mjs

- Lines: 4998
- Bytes: 277372
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

- Lines: 4782
- Bytes: 85504
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

### P1 lib/foundation-build-closeout-source-records.js

- Lines: 4750
- Bytes: 432200
- Reasons: changed_since_baseline, over_3k_warn, source_health_surface

```
export const sourceCloseoutRecords = [
  {
    key: 'source-browser-brain-route-policy-v1',
    backlogIds: ['SOURCE-BROWSER-AGENTIC-RUNTIME-001'],
    match: {
      subjectIncludes: [
        'Add source browser brain route policy',
        'SOURCE-BROWSER-AGENTIC-RUNTIME-001',
        'source-browser-brain-route-policy-v1',
      ],
    },
    operatorCloseout: true,
    mentionedBacklogIds: [
      'SOURCE-BROWSER-BRAIN-ROUTE-POLICY-001',
      'SOURCE-BROWSER-RUNTIME-COST-GUARDRAILS-001',
      'LOCAL-VIRTUAL-BROWSER-HANDS-RUNTIME-001',
      'SOURCE-SESSION-BROKER-001',
      'BROWSERBASE-ONE-MONTH-BAKEOFF-001',
      'HARLAN-AUTH-LIVE-DELIVERY-002',
      'SKOOL-LIVE-NAVIGATION-PROOF-002',
      'MYICOR-LIVE-NAVIGATION-PROOF-002',
    ],
    systemArea: 'Foundation source browser / brain route policy',
    status: 'blocked-preflight',
    acceptanceState: 'Verified source-browser brain route policy is accepted as a blocked-preflight routing slice, not done and not accepted as full God Mode completion. It chooses and exposes the route before work starts, but real free-community sessions, MyICOR connector/live auth, live Harlan sending, Browserbase bakeoff execution, newsletter signup, paid/private extraction, downloads, purchases, posting, messaging, and Scoper promotion remain approval-bound continuation work.',
    whatChanged: 'Added a deterministic source-browser brain route policy module, focused proof, plan doc, seed card truth, Source Browser Agent plan/readback integration, and source-browser protocol note. Plans now carry brainRoute metadata so Dev/source readback can show whether a row is deterministic, local hands, source-session/Harlan, Stagehand/API, Browserbase bakeoff, or blocked.',
    whatItDoes: 'Routes normal public/free pages to deterministic source workers, repos to repo deep review, newsletters to no-submit intake, healthy free-community sessions to local hands plus the Skool runner, auth/MFA/session gaps to Source Session Broker/Harlan dry-run, MyICOR read-only connector first when approved, API/Stagehand only with supported provider/model and caps, Browserbase only during approved tiny bakeoff, and risky external actions to a separate action policy.',
    whyItMatters: 'Steve needs the extractor to stop drifting between cheap local browser work, paid API models, Browserbase, and manual babysitting. This policy makes the brain/ru
```

### P1 lib/dev-team-hub.js

- Lines: 3170
- Bytes: 152776
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

### P1 lib/foundation-build-closeout-process-gate-records.js

- Lines: 3133
- Bytes: 224729
- Reasons: over_3k_warn

```
export const processGateCloseoutRecords = [
  {
    key: 'youtube-current-sprint-workspace-cleanup-v1',
    backlogIds: [
      'YOUTUBE-CURRENT-SPRINT-WORKSPACE-CLEANUP-001',
    ],
    operatorCloseout: true,
    match: {
      subjectIncludes: [
        'YOUTUBE-CURRENT-SPRINT-WORKSPACE-CLEANUP-001',
        'youtube-current-sprint-workspace-cleanup-v1',
        'Clean current sprint workspace',
        'Clean YouTube Current Sprint workspace',
      ],
    },
    systemArea: 'Foundation sprint control / Current Sprint workspace',
    status: 'shipped',
    acceptanceState: 'Verified',
    whatChanged: 'Cleaned the active YouTube To Dev Team Intelligence sprint workspace so old shipped cards no longer appear in `Done This Sprint`.',
    whatItDoes: 'Resets the live Current Sprint overlay to the nine active YouTube sprint cards only, keeps historical shipped cards in Backlog done and Recent Work, adds sprint-plan metadata to the active sprint, renders a Sprint plan link in the Recent Work Current Sprint panel, and verifies package/doc/closeout/coverage/UI/live readback.',
    whyItMatters: 'The sprint board should show what is being executed now. Prior Foundation/Brain Fleet/GOD-mode cards are real history, but carrying them into a new sprint makes the workspace look stale and confusing.',
    whereItLives: [
      'scripts/process-youtube-current-sprint-workspace-cleanup-check.mjs guarded Current Sprint cleanup proof',
      'docs/process/youtube-current-sprint-workspace-cleanup-001-plan.md',
      'docs/process/approvals/YOUTUBE-CURRENT-SPRINT-WORKSPACE-CLEANUP-001.json',
      'docs/handoffs/2026-05-21-youtube-current-sprint-workspace-cleanup-closeout.md',
      'scripts/process-youtube-creator-daily-watch-sprint-update-check.mjs no longer preserves old done rows',
      'public/foundation-operations-renderers.js Current Sprint Sprint plan link',
      'docs/rebuild/current-plan.md and docs/rebuild/current-state.md clean-sprint workspace notes',
      'package.json script process:youtube-current-sprint-workspace-cleanup-check',
      'lib/foundation-verify-coverage-card-ids.js done-card coverage',
    ],
    proofCommands: [
      'node --check scripts/process-youtube-current-sprint-workspace-cleanup-check.mjs',
      'npm run process:youtube-current-sprint-workspace-cleanup-check -- --apply --json',
      'npm run process:youtube-current-sprint-workspa
```

### P1 public/dev.js

- Lines: 3067
- Bytes: 144988
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

- Lines: 2987
- Bytes: 113810
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

### P1 lib/source-god-mode-youtube-handoff.js

- Lines: 2506
- Bytes: 105227
- Reasons: changed_since_baseline, source_health_surface

```
import crypto from 'node:crypto'
import path from 'node:path'

import {
  YOUTUBE_SCOUT_SOURCE_ID,
} from './youtube-scout-latest-video-vision.js'
import {
  runSkoolFreeCommunityGodMode,
} from './skool-free-community-god-mode-runner.js'
import {
  buildPublicRepoDeepReviewPacket,
  runPublicRepoDeepReview,
} from './public-repo-deep-review-runner.js'
import {
  evaluateSourceBrowserPageHealth,
  runSourceGodModeExtractor,
} from './source-god-mode-extractor-runtime.js'
import {
  SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
  evaluateSourceSessionBrokerRequest,
} from './source-session-broker.js'
import {
  buildSourceBrowserAgentCrawlItemInput,
  planSourceBrowserAgentRun,
} from './source-browser-agent-harness.js'
import {
  buildSourceBrowserFallbackRetryPacket,
} from './source-browser-fallback-executor.js'
import {
  buildSourceSessionActionGroupReadiness,
} from './source-session-readiness-readback.js'

export const SOURCE_GOD_MODE_YOUTUBE_HANDOFF_CARD_ID = 'SOURCE-BROWSER-AGENTIC-RUNTIME-001'
export const SOURCE_GOD_MODE_YOUTUBE_HANDOFF_SCRIPT_PATH = 'scripts/process-source-god-mode-youtube-handoff-check.mjs'
export const SOURCE_GOD_MODE_YOUTUBE_HANDOFF_ROOT = '.openclaw/source-god-mode-youtube-handoff'
export const SOURCE_GOD_MODE_YOUTUBE_HANDOFF_TARGET_KEY = 'source-god-mode-youtube-handoff-runs'
export const SOURCE_GOD_MODE_YOUTUBE_HANDOFF_SOURCE_ID = YOUTUBE_SCOUT_SOURCE_ID
export const SOURCE_GOD_MODE_YOUTUBE_HANDOFF_MAX_ITEMS_PER_RUN = 20
export const SOURCE_GOD_MODE_YOUTUBE_HANDOFF_MAX_RUNTIME_SECONDS = 3900
export const SOURCE_GOD_MODE_YOUTUBE_HANDOFF_READBACK_VERSION = 2
export const SOURCE_GOD_MODE_YOUTUBE_HANDOFF_READBACK_LIMIT = 1000

const DEFAULT_ROW_LIMIT = 0
const DEV_LANE_PRIORITY_GRADES = ['S', 'A', 'B', 'C', 'D']
const SHORT_LINK_HOSTS = new Set([
  'bit.ly',
  't.co',
  'tinyurl.com',
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

### P1 lib/source-session-readiness-readback.js

- Lines: 513
- Bytes: 22289
- Reasons: changed_since_baseline, source_health_surface

```
import {
  SOURCE_SESSION_BROKER_MYICOR_AUTH_METHOD,
  SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT,
  SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
  buildSourceSessionBrokerContractSnapshot,
  buildSourceSessionSecretRef,
} from './source-session-broker.js'
import {
  buildKeychainSecretRef,
  keychainItemExists,
} from './credential-vault.js'

export const SOURCE_SESSION_READINESS_SCRIPT_PATH = 'scripts/process-source-session-readiness-check.mjs'
export const SOURCE_SESSION_READINESS_CLOSEOUT_KEY = 'source-session-readiness-readback-v1'
export const MYICOR_GOOGLE_SSO_SOURCE = 'myicor-google-sso'
export const MYICOR_MCP_OAUTH_SOURCE = 'myicor-mcp-oauth'
export const MYICOR_MCP_OAUTH_ACCOUNT = 'myicor-authorized-member'
export const CREATOR_NEWSLETTER_SOURCE = 'creator-newsletters'
export const CREATOR_NEWSLETTER_MAILBOX_SOURCE_ID = 'SRC-GMAIL-001'

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function uniqueStrings(values = []) {
  return [...new Set(list(values).map(text).filter(Boolean))]
}

function hostOf(value = '') {
  try {
    return new URL(text(value)).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

function firstUrlForHost(rows = [], hostPattern = /.*/) {
  return list(rows).find(row => hostPattern.test(row.host || hostOf(row.url)))?.url || list(rows)[0]?.url || ''
}
```

### P1 scripts/process-source-session-readiness-check.mjs

- Lines: 368
- Bytes: 17010
- Reasons: changed_since_baseline, process_check_surface, source_health_surface

```
#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID,
} from '../lib/build-intel-source-value-grader.js'
import {
  closeFoundationDb,
  getIntelligenceReportBundle,
  initFoundationDb,
  listSourceCrawlItems,
  listYoutubeFullWatchReportArtifacts,
} from '../lib/foundation-db.js'
import {
  buildYoutubeHandoffEvidenceFromReports,
} from '../lib/dev-team-hub.js'
import {
  SOURCE_GOD_MODE_YOUTUBE_HANDOFF_READBACK_LIMIT,
  SOURCE_GOD_MODE_YOUTUBE_HANDOFF_TARGET_KEY,
  buildSourceGodModeYoutubeHandoffQueue,
} from '../lib/source-god-mode-youtube-handoff.js'
import {
  CREATOR_NEWSLETTER_MAILBOX_SOURCE_ID,
  CREATOR_NEWSLETTER_SOURCE,
  MYICOR_GOOGLE_SSO_SOURCE,
  MYICOR_MCP_OAUTH_ACCOUNT,
  MYICOR_MCP_OAUTH_SOURCE,
  SOURCE_SESSION_READINESS_SCRIPT_PATH,
  buildLiveSourceSessionReadinessReadback,
  buildSourceSessionActionGroupReadiness,
} from '../lib/source-session-readiness-readback.js'
import {
  SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
  SOURCE_SESSION_BROKER_MYICOR_GOOGLE_ACCOUNT,
} from '../lib/source-session-broker.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}
```

### P1 scripts/process-source-browser-runtime-cost-guardrails-check.mjs

- Lines: 167
- Bytes: 6128
- Reasons: process_check_surface, source_health_surface

```
#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  SOURCE_AGENTIC_BROWSER_CARD_ID,
  buildSourceAgenticBrowserCostGuardrailDogfood,
  buildSourceAgenticBrowserCostPolicy,
} from '../lib/source-agentic-browser-runtime.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: detail || '' })
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readRepoJson(relativePath) {
  return JSON.parse(await readRepoFile(relativePath))
}

function sourceContainsRawSecretLeak(source = '') {
  return [
    /console\.log\s*\([^)]*(password|secret|token|api[_-]?key)/i,
    /writeFile\s*\([^)]*(password|secret|token|api[_-]?key)/i,
  ].some(pattern => pattern.test(source))
}

async function main() {
  const args = parseArgs()
  const checks = []
  const [packageJson, runtimeSource, runnerSource, checkpointSource] = await Promise.all([
    readRepoJson('package.json'),
    readRepoFile('lib/source-agentic-browser-runtime.js'),
    readRepoFile('scripts/run-source-agentic-browser.mjs'),
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

- P2 runtime-model-name-hardcode-risk: Runtime model name appears outside router/config ownership -> LLM-RUNTIME-CONFIG-AUDIT-001

## Doc / Report Artifact Bloat

- Status: `healthy`
- Handoff files: 215
- Handoff hot lines: 14686
- Nightly artifacts: 6
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
Generated at: `2026-05-29T07:00:53.937Z`

## Morning Read

- Status: `report_ready`
- Active findings: 1 total (0 P0, 0 P1, 1 P2, 0 P3)
- Raw detector signals: 1
- Closed detector signals reconciled out: 0
- Active proposed backlog fixes: 1
- Detection mode: deterministic code first; no LLM detection used.
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev, no feature work.
- Synthetic proof: passed (hardcoded=2, mutator=1, slowEndpoint=risk)

## Endpoint Coverage

- /api/foundation-hub: status=200 latency=179ms payload=592055B risk=healthy (Within V1 audit budget.)
- /api/source-of-truth: status=200 latency=32ms payload=199958B risk=healthy (Within V1 audit budget.)
- /api/foundation/source-lifecycle: status=200 latency=693ms payload=628059B risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: status=200 latency=121ms payload=296534B risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: status=200 latency=37ms payload=33222B risk=healthy (Within V1 audit budget.)

## Asset And Monolith Metrics

Assets:
- public/foundation.html: 8561B raw, 1792B gzip, 123 lines
- public/styles.css: 649B raw, 296B gzip, 15 lines
- public/foundation-nav-config.js: 8635B raw, 2385B gzip, 179 lines
- public/foundation-data.js: 15667B raw, 3127B gzip, 508 lines
- public/foundation-doc-markdown-renderers.js: 37274B raw, 7467B gzip, 1213 lines
- public/foundation.js: 113810B raw, 22415B gzip, 2987 lines
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
- status=review, scripts=19, createElement=1770, appendChild=2332, innerHTML=79

Largest files:
- scripts/foundation-verify.mjs: 4998 LOC, 277372B
- public/dev.css: 4782 LOC, 85504B
- lib/foundation-build-closeout-source-records.js: 4750 LOC, 432200B
- lib/dev-team-hub.js: 3170 LOC, 152776B
- lib/foundation-build-closeout-process-gate-records.js: 3133 LOC, 224729B
- public/dev.js: 3067 LOC, 144988B
- public/foundation.js: 2987 LOC, 113810B
- lib/foundation-db-schema-seed-store.js: 2757 LOC, 141992B

## Top Findings

### P2 Runtime model name appears outside router/config ownership
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-source-browser-runtime-cost-guardrails-check.mjs:53` (gpt-4.1-mini)
- Why it matters: Model choices should be controlled by the Foundation LLM router or provider capability records. Scattering exact model names makes upgrades brittle and can leave critical intelligence lanes on old models.
- Proposed owner/card: LLM Router / `LLM-RUNTIME-CONFIG-AUDIT-001`
- Detector: runtime model literal detector
- False-positive note: Exact provider model literals outside route/config ownership should move behind the LLM router, provider pricing, or capability records.

## Findings By Sprint Card

- `CODEBASE-HARDCODE-AUDIT-001`: 1 finding
- `FOUNDATION-API-PERF-AUDIT-001`: 0 findings
- `FOUNDATION-FRONTEND-PERF-AUDIT-001`: 0 findings
- `FOUNDATION-MONOLITH-RISK-AUDIT-001`: 0 findings
- `VERIFIER-ASSUMPTION-REGISTRY-001`: 0 findings
- `SPRINT-STATE-MUTATION-AUDIT-001`: 0 findings
- `NIGHTLY-AUDIT-REPORT-001`: 0 findings

## Proposed Backlog Fixes

- `LLM-RUNTIME-CONFIG-AUDIT-001`

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

