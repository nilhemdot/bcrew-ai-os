# Nightly Deep Audit Report - 2026-05-28

Closeout key: `nightly-deep-audit-upgrade-v1`
Generated at: `2026-05-28T05:54:32.932Z`
Report path: `docs/handoffs/nightly-deep-audit-2026-05-28.md`

## Morning Read

- Status: `deep_review_executed`
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev.
- Active deterministic findings: 0 total (0 P0, 0 P1, 0 P2, 0 P3)
- Closed detector signals reconciled out of active audit: 0 of 0
- Changed files selected: 23
- High-risk review targets: 18
- LLM review mode: `bounded_senior_review_executed`
- Deep senior review rollup: `healthy` (deep senior review executed with 0 active finding(s) and 0 reconciled closed finding(s))
- Dogfood against May 13 failures: passed
- Doc/report artifact bloat: `healthy` (0 red, 0 yellow)

## Diff Summary

- Previous report: `docs/handoffs/nightly-deep-audit-2026-05-27.json`
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

- /api/foundation-hub: 169ms, 582510B, risk=healthy (Within V1 audit budget.)
- /api/source-of-truth: 25ms, 199972B, risk=healthy (Within V1 audit budget.)
- /api/foundation/source-lifecycle: 539ms, 646572B, risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: 120ms, 239072B, risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: 31ms, 33222B, risk=healthy (Within V1 audit budget.)

## Largest Files

- scripts/foundation-verify.mjs: 4998 LOC, 277372B
- public/dev.css: 4433 LOC, 79121B
- lib/foundation-build-closeout-source-records.js: 3205 LOC, 273394B
- lib/foundation-build-closeout-process-gate-records.js: 3133 LOC, 224729B
- public/foundation.js: 2987 LOC, 113810B
- lib/foundation-db-schema-seed-store.js: 2757 LOC, 141992B
- lib/dev-team-hub.js: 2733 LOC, 132944B
- lib/foundation-build-closeout-overnight-records.js: 2718 LOC, 216767B
- lib/foundation-build-closeout-intelligence-records.js: 2687 LOC, 202469B
- public/dev.js: 2621 LOC, 119281B

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

- Lines: 4433
- Bytes: 79121
- Reasons: changed_since_baseline, over_3k_warn

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

- Lines: 3205
- Bytes: 273394
- Reasons: changed_since_baseline, over_3k_warn, source_health_surface

```
export const sourceCloseoutRecords = [
  {
    key: 'source-browser-agentic-runtime-v1',
    backlogIds: ['SOURCE-BROWSER-AGENTIC-RUNTIME-001'],
    match: {
      subjectIncludes: [
        'Harden source expansion handoff and health',
        'SOURCE-BROWSER-AGENTIC-RUNTIME-001',
        'source-browser-agentic-runtime-v1',
      ],
    },
    operatorCloseout: true,
    mentionedBacklogIds: [
      'SOURCE-SESSION-BROKER-001',
      'SKOOL-LIVE-NAVIGATION-PROOF-002',
      'MYICOR-LIVE-NAVIGATION-PROOF-002',
      'SOURCE-FAMILY-GOD-MODE-EXTRACTORS-001',
      'DEV-BUILD-OPPORTUNITY-SCOPER-001',
    ],
    systemArea: 'Foundation source browser / YouTube source expansion handoff',
    status: 'blocked-preflight',
    acceptanceState: 'Verified V1 source-browser handoff and public/read-only source expansion are accepted as blocked-preflight; real free-community sessions, paid/auth courses, newsletter signups, downloads, purchases, posting, commenting, messaging, and broad external mutation are approval-bound continuation work behind Source Session Broker and source-specific proof cards, and the full source-browser/God Mode capability is not done.',
    whatChanged: 'Added and hardened the YouTube source-browser handoff runtime so watched-video evidence can flow into bounded public/read-only source runs, repo/page/newsletter metadata capture, free-community session-broker parking, paid/auth parking, and Dev Hub queue truth without Scoper promotion. Backlog/readback state changed only to widen the Foundation action-router snapshot limit from 100 to 500 so review/proposal state is not hidden from the Dev ranking/source surfaces.',
    whatItDoes: 'Builds a source handoff queue from watched YouTube evidence, executes only public/free read-only rows in bounded batches, persists source-browser artifacts, parks free-community rows until Source Session Broker readiness, parks paid/auth/product/form/action rows, exposes queue/run truth on the Dev Hub, widens Backlog/action-router readback visibility, and refreshes lifecycle/runtime health for the new handoff target.',
    whyItMatters: 'Steve asked for God Mode extraction to stop being a video-only dead end. This slice makes the system carry YouTube discoveries into the next source layer while staying honest about what it cannot do unattended yet: logged-in Skool/MyICOR, account creation, newsletter signup, downloa
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

### P1 lib/dev-team-hub.js

- Lines: 2733
- Bytes: 132944
- Reasons: changed_since_baseline

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

- Lines: 2621
- Bytes: 119281
- Reasons: changed_since_baseline

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

### P1 lib/foundation-db.js

- Lines: 2317
- Bytes: 93577
- Reasons: changed_since_baseline, live_truth_write_boundary

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

### P1 lib/intelligence-action-router.js

- Lines: 1683
- Bytes: 72726
- Reasons: changed_since_baseline

```
import { createHash } from 'node:crypto'
import {
  SYNTHESIS_VERIFICATION_METADATA_KEY,
  isDecisionGradeActionRoute,
  requireVerifiedSynthesisRecord,
} from './synthesis-claim-verification.js'
import {
  buildThreadContextSummary,
  enrichSourceProofItemsWithThreadContext,
} from './intel-thread-context.js'

export const intelligenceActionRouterSchemaSql = `
  CREATE TABLE IF NOT EXISTS intelligence_action_router_runs (
    run_id TEXT PRIMARY KEY,
    run_type TEXT NOT NULL
      CHECK (run_type IN ('route_proposal', 'router_proof', 'approval', 'application')),
    status TEXT NOT NULL
      CHECK (status IN ('succeeded', 'failed')),
    requested_by TEXT NOT NULL DEFAULT 'system',
    synthesized_item_count INTEGER NOT NULL DEFAULT 0,
    route_count INTEGER NOT NULL DEFAULT 0,
    approved_count INTEGER NOT NULL DEFAULT 0,
    applied_count INTEGER NOT NULL DEFAULT 0,
    max_tier INTEGER NOT NULL DEFAULT 1,
    source_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_intelligence_action_router_runs_lookup
  ON intelligence_action_router_runs(run_type, status, created_at DESC);

  CREATE TABLE IF NOT EXISTS intelligence_action_routes (
    route_id TEXT PRIMARY KEY,
    run_id TEXT REFERENCES intelligence_action_router_runs(run_id) ON DELETE SET NULL,
    synthesized_item_id TEXT NOT NULL REFERENCES intelligence_synthesized_items(synthesized_item_id) ON DELETE CASCADE,
    synthesized_item_natural_key TEXT NOT NULL,
    route_type TEXT NOT NULL
      CHECK (route_type IN (
        'decision',
        'backlog_task',
        'open_question',
        'contradiction',
        'ignore',
        'snooze',
        'owner_action',
```

### P1 lib/source-god-mode-extractor-runtime.js

- Lines: 1168
- Bytes: 44307
- Reasons: changed_since_baseline, source_health_surface

```
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

export const SOURCE_GOD_MODE_EXTRACTOR_RUNTIME_CARD_ID = 'SOURCE-BROWSER-AGENTIC-RUNTIME-001'
export const SOURCE_GOD_MODE_EXTRACTOR_RUNTIME_SCRIPT_PATH = 'scripts/process-source-god-mode-extractor-runtime-check.mjs'
export const SOURCE_GOD_MODE_EXTRACTOR_RUNTIME_ROOT = '.openclaw/source-god-mode-extractor'

export const SOURCE_GOD_MODE_REQUIRED_RUNTIME_CAPABILITIES = [
  'eyes',
  'read',
  'hands',
  'brain',
  'evidence',
  'boundaries',
  'output',
]

const SOURCE_BROWSER_ARGS = [
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-session-crashed-bubble',
  '--disable-restore-session-state',
  '--disable-features=Translate,ChromeWhatsNewUI',
]

const SAFE_PUBLIC_RESOURCE_HOSTS = new Set([
  'github.com',
  'gist.github.com',
  'raw.githubusercontent.com',
  'docs.github.com',
  'npmjs.com',
  'pypi.org',
  'playwright.dev',
  'ai.google.dev',
  'developers.google.com',
  'docs.browserbase.com',
  'browserbase.com',
  'docs.cursor.com',
  'cursor.com',
  'vercel.app',
  'aihero.dev',
])

const SHORT_LINK_HOSTS = new Set([
  'bit.ly',
  't.co',
  'tinyurl.com',
```

### P1 lib/source-god-mode-youtube-handoff.js

- Lines: 1150
- Bytes: 43590
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
  runSourceGodModeExtractor,
} from './source-god-mode-extractor-runtime.js'
import {
  SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT,
  evaluateSourceSessionBrokerRequest,
} from './source-session-broker.js'

export const SOURCE_GOD_MODE_YOUTUBE_HANDOFF_CARD_ID = 'SOURCE-BROWSER-AGENTIC-RUNTIME-001'
export const SOURCE_GOD_MODE_YOUTUBE_HANDOFF_SCRIPT_PATH = 'scripts/process-source-god-mode-youtube-handoff-check.mjs'
export const SOURCE_GOD_MODE_YOUTUBE_HANDOFF_ROOT = '.openclaw/source-god-mode-youtube-handoff'
export const SOURCE_GOD_MODE_YOUTUBE_HANDOFF_TARGET_KEY = 'source-god-mode-youtube-handoff-runs'
export const SOURCE_GOD_MODE_YOUTUBE_HANDOFF_SOURCE_ID = YOUTUBE_SCOUT_SOURCE_ID
export const SOURCE_GOD_MODE_YOUTUBE_HANDOFF_MAX_ITEMS_PER_RUN = 20
export const SOURCE_GOD_MODE_YOUTUBE_HANDOFF_MAX_RUNTIME_SECONDS = 3900

const DEFAULT_ROW_LIMIT = 250
const DEV_LANE_PRIORITY_GRADES = ['S', 'A', 'B', 'C', 'D']
const SHORT_LINK_HOSTS = new Set([
  'bit.ly',
  't.co',
  'tinyurl.com',
  'lnkd.in',
  'goo.gl',
  'buff.ly',
  'shorturl.at',
  'rebrand.ly',
  'cutt.ly',
  'dub.sh',
  'linktr.ee',
  'beacons.ai',
])
const SOCIAL_PROFILE_HOSTS = new Set([
  'instagram.com',
  'linkedin.com',
  'x.com',
  'twitter.com',
  'tiktok.com',
  'facebook.com',
```

### P1 lib/strategy-shared-comms-routes.js

- Lines: 1117
- Bytes: 50324
- Reasons: changed_since_baseline

```
import {
  ACTION_ROUTE_REVIEW_INBOX_API_PATH,
  buildActionRouteReviewInboxSnapshot,
} from './action-route-review-inbox.js'
import {
  ACTION_ROUTE_PROMOTION_WORKFLOW_API_PATH,
  ACTION_ROUTE_PROMOTION_WORKFLOW_CLOSEOUT_KEY,
  buildActionRoutePromotionWorkflowMetadata,
  validateActionRoutePromotionWorkflowRequest,
} from './action-route-promotion-workflow.js'
import {
  buildStrategyPlanningWorkflowSnapshot,
  getStrategyPlanningEvidenceSnapshot,
} from './strategy-planning-workflow.js'
import {
  buildGovernanceAccountabilitySnapshot,
} from './gov-001-governance-accountability.js'
import {
  getStrategyQuarterSnapshot,
  updateStrategyQuarterContext,
} from './strategy-quarter-input-layer.js'

export const STRATEGY_SHARED_COMMS_ROUTES_SPLIT_CARD_ID = 'STRATEGY-SHARED-COMMS-ROUTES-SPLIT-001'
export const STRATEGY_SHARED_COMMS_ROUTES_SPLIT_CLOSEOUT_KEY = 'strategy-shared-comms-routes-split-v1'
export const STRATEGY_SHARED_COMMS_ROUTES_SPLIT_PLAN_PATH = 'docs/process/strategy-shared-comms-routes-split-001-plan.md'
export const STRATEGY_SHARED_COMMS_ROUTES_SPLIT_APPROVAL_PATH = 'docs/process/approvals/STRATEGY-SHARED-COMMS-ROUTES-SPLIT-001.json'
export const STRATEGY_SHARED_COMMS_ROUTES_SPLIT_SCRIPT_PATH = 'scripts/process-strategy-shared-comms-routes-split-check.mjs'
export const STRATEGY_SHARED_COMMS_ROUTES_SPLIT_SPRINT_ID = 'foundation-server-monolith-closeout-2026-05-15'
export const STRATEGY_SHARED_COMMS_ROUTES_SPLIT_BEFORE_SERVER_LINES = 6115
export const STRATEGY_SHARED_COMMS_ROUTES_SPLIT_ROUTE_BUDGET_MS = 15000
export const STRATEGY_SHARED_COMMS_ROUTES_SPLIT_ROUTE_BUDGET_BYTES = 2_000_000

const MOVED_ROUTE_MARKERS = [
  "app.get('/api/shared-communications/archive'",
  "app.get('/api/shared-communications/coverage'",
  "app.get('/api/shared-communications/candidates'",
  "app.get('/api/shared-communications/synthesis'",
  "app.post('/api/shared-communications/candidates/:candidateKey/apply-to-backlog'",
  "app.post('/api/shared-communications/candidates/:candidateKey/apply-to-decision'",
  "app.post('/api/shared-communications/candidates/:candidateKey/apply-to-question'",
  "app.post('/api/shared-communications/candidates/:candidateKey/:action'",
  "app.get('/api/strategic-execution/prework-coverage'",
  "app.get('/api/strategic-execution/goal-truth'",
  "app.get('/api/strategic-execution/operating-truth'",
  "app.get('/api/strategic-execution/quar
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

### P1 lib/dev-opportunity-vision-lens.js

- Lines: 1100
- Bytes: 55915
- Reasons: changed_since_baseline

```
export const DEV_OPPORTUNITY_VISION_LENS_ID = 'dev-opportunity-vision-lens-v1'

const LENS_LABELS = {
  teamAiosVision: 'Team AIOS vision',
  foundationReliability: 'Foundation reliability',
  godModeExtraction: 'God Mode extraction',
  godModeAutomation: 'God Mode automation',
  memoryContext: 'Memory/context',
  recruitingMarketing: 'Recruiting/marketing',
  devTeamQuality: 'Dev team quality',
  operatorLeverage: 'Steve leverage',
  vibeCodingOperator: 'Vibe coding/operator upgrade',
}

const OPPORTUNITY_DEFINITIONS = [
  {
    id: 'browser-agent-that-can-work',
    title: 'Browser Agent That Can Work',
    plainEnglish: 'Give AIOS a reliable human-style web worker that can see pages, click, type, use approved sessions, and stop when it reaches a real boundary.',
    nextMove: 'Review the strongest browser, hands, session, and computer-use evidence before deciding the runtime path.',
    terms: ['browser', 'agentic browser', 'computer use', 'hands', 'click', 'mouse', 'keyboard', 'dom', 'web', 'website', 'form', 'login', 'session', 'playwright', 'stagehand', 'browserbase', 'openclaw', 'control', 'navigation', 'chrome', 'accessibility'],
    lensBase: { teamAiosVision: 98, foundationReliability: 82, godModeExtraction: 85, godModeAutomation: 98, memoryContext: 62, recruitingMarketing: 88, devTeamQuality: 82, operatorLeverage: 94, vibeCodingOperator: 80 },
    priorityBoost: 14,
  },
  {
    id: 'extractor-that-can-go-anywhere',
    title: 'Extractor That Can Go Anywhere',
    plainEnglish: 'Build the source system that can watch, read, follow useful public/free resources, inspect communities/courses when allowed, and package the gold with proof.',
    nextMove: 'Use this to decide the next source worker: public resources, repos, newsletters, free communities, or paid/auth sessions.',
    terms: ['extractor', 'extraction', 'crawl', 'source', 'resource', 'youtube', 'video', 'transcript', 'skool', 'myicor', 'course', 'community', 'newsletter', 'repo', 'github', 'docs', 'page', 'reader', 'watch', 'visual', 'audio'],
    lensBase: { teamAiosVision: 96, foundationReliability: 90, godModeExtraction: 99, godModeAutomation: 72, memoryContext: 70, recruitingMarketing: 68, devTeamQuality: 86, operatorLeverage: 86, vibeCodingOperator: 86 },
    priorityBoost: 12,
  },
  {
    id: 'assistant-that-handles-conversations-like-steve',
    title: 'Assistant That Handles Conver
```

### P1 lib/source-lifecycle.js

- Lines: 1061
- Bytes: 42565
- Reasons: changed_since_baseline, source_health_surface

```
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readCombinedFoundationStylesheet } from './foundation-stylesheet-monolith-split.js'
import {
  YOUTUBE_CREATOR_DAILY_WATCH_DEFAULT_BASELINE_DEPTH,
  YOUTUBE_CREATOR_DAILY_WATCH_MARK_BASELINE_DEPTH,
  YOUTUBE_CREATOR_DAILY_WATCH_MAX_BASELINE_DEPTH,
  buildYoutubeCreatorDailyWatchPlan,
} from './youtube-creator-daily-watch.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const defaultRepoRoot = path.resolve(__dirname, '..')

export const SOURCE_LIFECYCLE_SCHEMA_VERSION = 1
export const SOURCE_LIFECYCLE_CARD_ID = 'SOURCE-LIFECYCLE-EXPANSION-001'
export const SOURCE_LIFECYCLE_CLOSEOUT_KEY = 'source-lifecycle-expansion-v1'
export const SOURCE_LIFECYCLE_ROUTE = '/foundation#source-lifecycle'
export const SOURCE_LIFECYCLE_API_PATH = '/api/foundation/source-lifecycle'
export const SOURCE_LIFECYCLE_APPROVED_PLAN_PATH = 'docs/process/approved-plans/source-lifecycle-expansion-v1.md'
export const SOURCE_LIFECYCLE_APPROVAL_PATH = 'docs/process/approvals/SOURCE-LIFECYCLE-EXPANSION-001.json'
export const SOURCE_LIFECYCLE_BASELINE_PATH = 'docs/audits/2026-04-30-source-lifecycle-expansion-baseline.md'
export const SOURCE_LIFECYCLE_MANUAL_REVIEW_PATH = 'docs/audits/2026-04-30-source-lifecycle-expansion-manual-review.md'

export const SOURCE_LIFECYCLE_INCLUDED_SOURCE_IDS = [
  'SRC-GMAIL-001',
  'SRC-GCAL-001',
  'SRC-MISSIVE-001',
  'SRC-MEETINGS-001',
  'SRC-SLACK-001',
  'SRC-GDRIVE-001',
  'SRC-VIDEO-001',
  'SRC-YOUTUBE-INTEL-001',
  'SRC-SKOOL-001',
  'SRC-LOOM-001',
  'SRC-MYICRO-001',
  'SRC-CREATOR-WATCHLIST-001',
]

export const SOURCE_LIFECYCLE_EXCLUDED_LANES = [
  'Strategy Hub activation',
  'Scoper',
  'Agent Factory',
  'broad corpus expansion',
  'Action Review applying',
  'research cleanup',
  'Missive attachment implementation',
```

### P1 lib/build-intel-source-value-grader.js

- Lines: 1029
- Bytes: 42508
- Reasons: changed_since_baseline, source_health_surface

```
export const BUILD_INTEL_SOURCE_VALUE_GRADER_CARD_ID = 'BUILD-INTEL-SOURCE-VALUE-GRADER-001'
export const BUILD_INTEL_SOURCE_VALUE_GRADER_PLAN_PATH = 'docs/process/build-intel-source-value-grader-001-plan.md'
export const BUILD_INTEL_SOURCE_VALUE_GRADER_APPROVAL_PATH = 'docs/process/approvals/BUILD-INTEL-SOURCE-VALUE-GRADER-001.json'
export const BUILD_INTEL_SOURCE_VALUE_GRADER_SCRIPT_PATH = 'scripts/process-build-intel-source-value-grader-check.mjs'
export const BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_ARTIFACT_ID = 'grader:build-intel-source-value-grader-001:v1'
export const BUILD_INTEL_SOURCE_VALUE_GRADER_REPORT_PATH = 'docs/source-notes/build-intel-source-value-grader-2026-05-25.md'
export const BUILD_INTEL_SOURCE_VALUE_GRADER_SOURCE_ID = 'SRC-YOUTUBE-INTEL-001'

const LANE_DEFINITIONS = [
  {
    id: 'aios_dev_build',
    label: 'AIOS / Dev build',
    terms: ['aios', 'agent', 'agentic', 'claude code', 'codex', 'mcp', 'openclaw', 'browser', 'hook', 'pipeline', 'skill', 'state', 'visual', 'repo', 'api', 'tool', 'orchestrator', 'handoff', 'gemini', 'cursor'],
  },
  {
    id: 'ops_process',
    label: 'Ops / process',
    terms: ['process', 'workflow', 'automation', 'n8n', 'miro', 'app', 'productivity', 'docs', 'slack', 'email', 'drive', 'calendar', 'spreadsheet', 'tools', 'system', 'operations', 'sop', 'handoff'],
  },
  {
    id: 'sales_conversion',
    label: 'Sales / conversion',
    terms: ['sales', 'conversion', 'close', 'closer', 'objection', 'offer', 'appointment', 'booking', 'lead follow up', 'crm', 'pipeline', 'prospect', 'listing appointment', 'buyer consult', 'script', 'negotiation'],
  },
  {
    id: 'marketing_recruiting',
    label: 'Marketing / recruiting',
    terms: ['recruit', 'recruiting', 'agent attraction', 'downline', 'rev share', 'revenue share', 'team growth', 'real broker', 'join', 'hiring', 'career', 'agent onboarding', 'culture', 'community'],
  },
  {
    id: 'marketing_lead_gen',
    label: 'Marketing / lead gen',
    terms: ['lead gen', 'lead generation', 'lead magnet', 'funnel', 'seo', 'google business', 'ads', 'meta ads', 'content', 'landing page', 'campaign', 'social', 'email marketing', 'newsletter', 'nurture', 'retarget'],
  },
  {
    id: 'steve_ai_authority',
    label: 'Steve AI authority',
    terms: ['ai expert', 'authority', 'thought leadership', 'personal brand', 'educate realtors', 'realtor ai', 'ai for real estat
```

### P1 scripts/process-dev-team-hub-v0-check.mjs

- Lines: 990
- Bytes: 63238
- Reasons: changed_since_baseline, process_check_surface

```
#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getExtractionControlSnapshot,
  getFoundationSnapshot,
  getIntelligenceReportBundle,
  initFoundationDb,
  listLlmCalls,
  listSourceCrawlItems,
  listYoutubeFullWatchReportArtifacts,
} from '../lib/foundation-db.js'
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
} from '../lib/mark-kashef-god-mode-small-batch.js'
import {
  MARK_KASHEF_BASELINE_REPORT_ARTIFACT_ID,
} from '../lib/god-mode-youtube-end-to-end-extractor.js'
import {
  isYoutubeLatest20FullWatchReportId,
} from '../lib/youtube-latest-20-full-watch-runner.js'
import {
  DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID,
} from '../lib/dev-team-intelligence-director.js'
```

## Top Deterministic Findings

- none

## Doc / Report Artifact Bloat

- Status: `healthy`
- Handoff files: 216
- Handoff hot lines: 19714
- Nightly artifacts: 18
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
Generated at: `2026-05-28T05:54:33.745Z`

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

- /api/foundation-hub: status=200 latency=169ms payload=582510B risk=healthy (Within V1 audit budget.)
- /api/source-of-truth: status=200 latency=25ms payload=199972B risk=healthy (Within V1 audit budget.)
- /api/foundation/source-lifecycle: status=200 latency=539ms payload=646572B risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: status=200 latency=120ms payload=239072B risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: status=200 latency=31ms payload=33222B risk=healthy (Within V1 audit budget.)

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
- public/dev.css: 4433 LOC, 79121B
- lib/foundation-build-closeout-source-records.js: 3205 LOC, 273394B
- lib/foundation-build-closeout-process-gate-records.js: 3133 LOC, 224729B
- public/foundation.js: 2987 LOC, 113810B
- lib/foundation-db-schema-seed-store.js: 2757 LOC, 141992B
- lib/dev-team-hub.js: 2733 LOC, 132944B
- lib/foundation-build-closeout-overnight-records.js: 2718 LOC, 216767B

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

