# Nightly Deep Audit Report - 2026-05-25

Closeout key: `nightly-deep-audit-upgrade-v1`
Generated at: `2026-05-25T07:01:54.071Z`
Report path: `docs/handoffs/nightly-deep-audit-2026-05-25.md`

## Morning Read

- Status: `deep_review_degraded`
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev.
- Active deterministic findings: 0 total (0 P0, 0 P1, 0 P2, 0 P3)
- Closed detector signals reconciled out of active audit: 7 of 7
- Changed files selected: 5
- High-risk review targets: 15
- LLM review mode: `requested_review_failed_closed`
- Deep senior review rollup: `degraded` (Deep senior review was requested but failed closed. The report is degraded and must not be presented as a clean deep review.)
- Dogfood against May 13 failures: passed
- Doc/report artifact bloat: `watch` (0 red, 2 yellow)

## Diff Summary

- Previous report: `docs/handoffs/nightly-deep-audit-2026-05-24.json`
- New findings: 0
- Still open: 0
- Resolved: 0
- Finding delta: 0

## LLM Review Boundary

- Executed this run: no
- Selected route: `foundation-deep-audit-openai-api`
- Provider/model: `openai / gpt-5.5`
- Route blocker: none
- Active finding count: 0
- Closed senior-review repeats reconciled out: 0
- Note: Deep senior review was requested but failed closed. The report is degraded and must not be presented as a clean deep review.

Deep senior review did not execute. Packet-only output is degraded and must not be called a completed deep code review.

## Senior Review Findings

- none

## Reconciled Closed Audit Signals

- Deterministic detector signals reconciled: 7
- Senior-review repeats reconciled: 0
- P1 active-vs-historical-verifier-mixing: covered by `active-vs-historical-verifier-split-v1`
- P1 foundation-hub-route-monolith: covered by `foundation-route-budget-cleanup-v1`
- P1 hardcoded-foundation-ui-current-summary: covered by `foundation-ui-live-summary-sources-v1`
- P1 hardcoded-source-count-baseline: covered by `source-lifecycle-dynamic-counts-v1`
- P1 hardcoded-source-count-baseline: covered by `source-lifecycle-dynamic-counts-v1`
- P2 focused-check-active-sprint-id-assumption: covered by `focused-sprint-id-historical-aware-v1`
- P2 foundation-dom-rebuild-risk: covered by `foundation-css-surface-decouple-v1`

## Endpoint And Payload Trend

- /api/foundation-hub: 133ms, 560366B, risk=healthy (Within V1 audit budget.)
- /api/source-of-truth: 22ms, 199961B, risk=healthy (Within V1 audit budget.)
- /api/foundation/source-lifecycle: 426ms, 620125B, risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: 89ms, 175417B, risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: 28ms, 33222B, risk=healthy (Within V1 audit budget.)

## Largest Files

- scripts/foundation-verify.mjs: 4998 LOC, 277372B
- lib/foundation-build-closeout-process-gate-records.js: 3133 LOC, 224729B
- public/foundation.js: 2987 LOC, 113810B
- lib/foundation-db-schema-seed-store.js: 2757 LOC, 141992B
- lib/foundation-build-closeout-intelligence-records.js: 2687 LOC, 201921B
- lib/foundation-build-closeout-tightening-records.js: 2599 LOC, 226069B
- lib/foundation-source-crawl-store.js: 2514 LOC, 111863B
- lib/foundation-build-closeout-overnight-records.js: 2446 LOC, 192241B
- lib/foundation-db.js: 2291 LOC, 92476B
- lib/foundation-shared-comms-store.js: 2176 LOC, 88461B

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

### P1 lib/foundation-db.js

- Lines: 2291
- Bytes: 92476
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

- Lines: 2048
- Bytes: 67032
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

### P1 lib/dev-team-hub.js

- Lines: 963
- Bytes: 45848
- Reasons: changed_since_baseline

```
import { CREATOR_WATCHLIST_SOURCE_ID } from './build-intel-watchlist.js'
import {
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
  DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID,
  DEV_TEAM_INTELLIGENCE_DIRECTOR_SOURCE_ID,
} from './dev-team-intelligence-director.js'

export const DEV_TEAM_HUB_V0_CARD_ID = 'DEV-TEAM-HUB-V0-001'
export const DEV_TEAM_HUB_V0_API_ROUTE = '/api/foundation/dev-team-hub'
export const DEV_TEAM_HUB_V0_PAGE_ROUTE = '/dev'
export const DEV_TEAM_HUB_V0_SOURCE_IDS = [
  CREATOR_WATCHLIST_SOURCE_ID,
  YOUTUBE_CREATOR_DAILY_WATCH_SOURCE_ID,
  YOUTUBE_SCOUT_VIDEO_SOURCE_ID,
  GOD_MODE_EYES_SOURCE_ID,
  GOD_MODE_EYES_VIDEO_SOURCE_ID,
  DEV_TEAM_INTELLIGENCE_DIRECTOR_SOURCE_ID,
]
export const DEV_TEAM_HUB_V0_REPORT_IDS = [
  YOUTUBE_CREATOR_DAILY_WATCH_REPORT_ARTIFACT_ID,
  YOUTUBE_SCOUT_REPORT_ARTIFACT_ID,
  YOUTUBE_BUILD_INTEL_LINK_RESOURCE_REPORT_ARTIFACT_ID,
```

### P1 scripts/process-extract-current-check.mjs

- Lines: 551
- Bytes: 27615
- Reasons: process_check_surface

```
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }

  const previous = activeSprint || await getActiveFoundationCurrentSprint()
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: previous.sprint?.sprintId || SPRINT_ID,
        status: 'active',
        goal: 'Make Foundation raw-green, self-improving, backlog-clean, operationally controlled, and ready to resume source/extract work without rebuilding tech debt.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: closeCard ? 'extract_current_closed' : 'extract_current_active',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard ? `Continue ${NEXT_CARD_ID}; EXTRACT-CURRENT is closed.` : `${CARD_ID} is active; prove current-day freshness before backfill.`,
          extractCurrentSummary: {
            status: closeCard ? 'healthy' : 'active',
            closeoutKey: CLOSEOUT_KEY,
            nextCardId: NEXT_CARD_ID,
            targetKeys: EXTRACT_CURRENT_TARGETS.map(target => target.targetKey),
            blockersParkActionsNotSprint: true,
          },
        },
      },
      items: buildSprintItems(previous, { closeCard }),
    },
    'codex-extract-current',
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous.sprint?.sprintId || SPRINT_ID,
      reason: `${CARD_ID} ${closeCard ? 'closes' : 'updates'} current-day freshness proof and ${closeCard ? `advances to ${NEXT_CARD_ID}` : 'owns the active blocker'}.`,
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  await initFoundationDb()

  const jobKeys = [
```

### P1 lib/mark-kashef-god-mode-small-batch.js

- Lines: 523
- Bytes: 24823
- Reasons: changed_since_baseline

```
import crypto from 'node:crypto'

import {
  buildCurrentModeBaseline,
  capturePublicYoutubePageEvidence,
  findTranscriptForVideo,
  runGeminiEyesForVideo,
  scoreEyesResult,
} from './god-mode-extractor-eyes-quality-loop.js'
import {
  followSafePublicResourceLinks,
  MARK_KASHEF_BASELINE_CREATOR_ID,
  MARK_KASHEF_BASELINE_SOURCE_ID,
  MARK_KASHEF_BASELINE_TARGET_KEY,
  MARK_KASHEF_BASELINE_TARGET_VIDEO_ID,
  MARK_KASHEF_LAST_50_BASELINE_CARD_ID,
  MARK_KASHEF_LAST_50_BASELINE_PLAN_PATH,
} from './god-mode-youtube-end-to-end-extractor.js'
import { GEMINI_VIDEO_CAPABILITY_DOCS, GEMINI_VIDEO_ROUTE_KEY } from './gemini-video-brain-route.js'

export const MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID = 'batch:mark-kashef-last-50:api-full-watch-small-batch-v1'
export const MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_PATH = 'docs/source-notes/mark-kashef-god-mode-small-batch-2026-05-24.md'
export const MARK_KASHEF_GOD_MODE_SMALL_BATCH_SCRIPT_PATH = 'scripts/process-mark-kashef-god-mode-small-batch-check.mjs'
export const MARK_KASHEF_GOD_MODE_SMALL_BATCH_MODEL = process.env.MARK_KASHEF_GOD_MODE_BATCH_MODEL || 'gemini-3.5-flash'
export const MARK_KASHEF_GOD_MODE_SMALL_BATCH_DEFAULT_SIZE = 3
export const MARK_KASHEF_GOD_MODE_SMALL_BATCH_MAX_SIZE = 5
export const MARK_KASHEF_GOD_MODE_SMALL_BATCH_GEMINI_TIMEOUT_MS = Number(process.env.MARK_KASHEF_GOD_MODE_BATCH_TIMEOUT_MS || 600000)

export const MARK_KASHEF_GOD_MODE_SMALL_BATCH_NOT_NEXT = [
  'Do not run the full Mark last-50 from this small batch.',
  'Do not use Gemini Workspace/subscription URL-scout output as full video watching.',
  'Do not crawl Skool, MyICOR, Gumroad, Calendly, comments, members, private, paid, auth-required, course, or community sources.',
  'Do not purchase, download, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.',
  'Do not work MEETING-VAULT-ACL-001 Phase B, mutate Drive permissions, or send request-access emails.',
  'Do not auto-create backlog cards from recommendations.',
  'Do not store raw video or screenshot bytes in git.',
]

function text(value) {
  return String(value || '').trim()
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function asNumber(value, fallback = 0) {
  const number = Number(value)
```

### P1 scripts/process-mark-kashef-god-mode-small-batch-check.mjs

- Lines: 455
- Bytes: 19806
- Reasons: changed_since_baseline, process_check_surface

```

async function updateLiveSprintAndBacklog(snapshot = {}) {
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: MARK_KASHEF_GOD_MODE_SMALL_BATCH_SCRIPT_PATH,
    operation: 'update Mark baseline backlog and Current Sprint overlay after small batch',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
  })
  await updateBacklogItem(MARK_KASHEF_LAST_50_BASELINE_CARD_ID, {
    lane: 'executing',
    nextAction: `Review ${MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID}; rerun Dev Intelligence Director, then decide promote-vs-next-batch.`,
    statusNote: `Active and not done. Proof reads back from ${MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID}. Latest API full-watch small batch ${snapshot.batchRunId} processed ${snapshot.summary?.videoCount || 0} Mark videos with ${snapshot.summary?.totalBuildCandidates || 0} proposal-only candidates, no auto backlog, and no private/auth/community crawl.`,
  }, ACTOR)
  const previous = await getActiveFoundationCurrentSprint()
  const items = list(previous.items).map(item => item.cardId === MARK_KASHEF_LAST_50_BASELINE_CARD_ID
    ? buildSprintOverlayItem(item, snapshot)
    : item)
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        activeBlockerCardId: MARK_KASHEF_LAST_50_BASELINE_CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          markGodModeSmallBatchReportArtifactId: MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID,
          markGodModeSmallBatchRunId: snapshot.batchRunId,
          markGodModeSmallBatchModel: snapshot.model,
          markGodModeSmallBatchVideoIds: list(snapshot.videoResults).map(result => result.video?.videoId).filter(Boolean),
          currentStatus: 'mark_god_mode_api_small_batch_applied',
          nextAction: 'Rerun Dev Team Intelligence Director so Steve sees the small-batch candidates ranked against the AIOS mission.',
          noAutoBacklogPromotion: true,
          noExternalWrites: true,
          publicYoutubeOnly: true,
        },
      },
      items,
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId,
      reason: 'Mark baseline moved from one-video proof to guarded API full-watch small batch.',
    },
  )
}

async function loadPersistedBatch() {
```

### P1 scripts/process-dev-team-hub-v0-check.mjs

- Lines: 314
- Bytes: 16972
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
  listSourceCrawlItems,
} from '../lib/foundation-db.js'
import { getSourceContracts } from '../lib/source-contracts.js'
import { buildCreatorWatchlistSnapshot } from '../lib/build-intel-watchlist.js'
import {
  YOUTUBE_CREATOR_DAILY_WATCH_JOB_KEY,
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
  DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID,
} from '../lib/dev-team-intelligence-director.js'
import {
  DEV_TEAM_HUB_V0_API_ROUTE,
  DEV_TEAM_HUB_V0_CARD_ID,
  DEV_TEAM_HUB_V0_PAGE_ROUTE,
  DEV_TEAM_HUB_V0_SOURCE_IDS,
  buildDevTeamHubV0DogfoodProof,
  buildDevTeamHubV0Snapshot,
} from '../lib/dev-team-hub.js'

```

### P1 scripts/process-source-lifecycle-dynamic-counts-check.mjs

- Lines: 272
- Bytes: 10909
- Reasons: process_check_surface, source_health_surface

```
#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import { buildSourceLifecycleCompletionStatus } from '../lib/source-lifecycle-completion.js'
import {
  SOURCE_LIFECYCLE_DYNAMIC_COUNTS_APPROVAL_PATH,
  SOURCE_LIFECYCLE_DYNAMIC_COUNTS_CARD_ID,
  SOURCE_LIFECYCLE_DYNAMIC_COUNTS_CLOSEOUT_KEY,
  SOURCE_LIFECYCLE_DYNAMIC_COUNTS_PLAN_PATH,
  SOURCE_LIFECYCLE_DYNAMIC_COUNTS_SCRIPT_PATH,
  SOURCE_LIFECYCLE_DYNAMIC_COUNTS_SPRINT_ID,
  buildSourceLifecycleDynamicCountsDogfoodProof,
} from '../lib/source-lifecycle-dynamic-counts.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    baseUrl: process.env.BCREW_FOUNDATION_BASE_URL || 'http://localhost:3000',
  }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg.startsWith('--baseUrl=')) args.baseUrl = arg.slice('--baseUrl='.length)
  }
  return args
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

async function readText(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8')
```

### P1 lib/foundation-build-intel-routes.js

- Lines: 263
- Bytes: 10016
- Reasons: changed_since_baseline

```
import {
  DEV_TEAM_HUB_V0_API_ROUTE,
  buildDevTeamHubV0Snapshot,
} from './dev-team-hub.js'
import {
  YOUTUBE_CREATOR_DAILY_WATCH_JOB_KEY,
  YOUTUBE_CREATOR_DAILY_WATCH_REPORT_ARTIFACT_ID,
  YOUTUBE_CREATOR_DAILY_WATCH_TARGET_KEY,
} from './youtube-creator-daily-watch.js'
import {
  YOUTUBE_SCOUT_REPORT_ARTIFACT_ID,
} from './youtube-scout-latest-video-vision.js'
import {
  YOUTUBE_BUILD_INTEL_LINK_RESOURCE_REPORT_ARTIFACT_ID,
} from './youtube-build-intel-link-resource.js'
import {
  GOD_MODE_EXTRACTOR_EYES_QUALITY_LOOP_REPORT_ARTIFACT_ID,
} from './god-mode-extractor-eyes-quality-loop.js'
import {
  MARK_KASHEF_GOD_MODE_SMALL_BATCH_REPORT_ARTIFACT_ID,
} from './mark-kashef-god-mode-small-batch.js'
import {
  DEV_TEAM_INTELLIGENCE_DIRECTOR_REPORT_ARTIFACT_ID,
} from './dev-team-intelligence-director.js'

export function registerFoundationBuildIntelRoutes(app, deps = {}) {
  const {
    requireAdminToken,
    sendApiError,
    getFoundationSnapshot,
    getActiveFoundationCurrentSprint,
    getExtractionControlSnapshot,
    getIntelligenceReportBundle,
    listFoundationFeedbackItems,
    listFoundationAcknowledgedStates,
    listSourceCrawlItems,
    searchSharedCommunicationArtifactsForContext,
    getFoundationBuildCloseouts,
    getSourceContracts,
    buildCreatorWatchlistSnapshot,
    buildYoutubeCreatorDailyWatchReadSnapshot,
    buildMultimodalExtractorContractSnapshot,
    buildResearchInboxContractSnapshot,
    buildFoundationControlCompressionSnapshot,
    buildImplementationIntelligenceSnapshot,
    buildBuildIntelExtractionImplementationSnapshot,
    buildGStackBuildIntelSnapshot,
  } = deps
```

### P3 lib/foundation-jobs.js

- Lines: 1436
- Bytes: 62010
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
```

### P3 lib/code-quality-nightly-audit.js

- Lines: 1230
- Bytes: 55569
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
  return {
    ok: hardcoded.length >= 2 &&
      activeCurrentSprint.some(finding => finding.id === 'hardcoded-current-sprint-truth' && finding.severity === 'P0') &&
      historicalCurrentSprint.every(finding => finding.id !== 'hardcoded-current-sprint-truth') &&
      bootstrapCurrentSprint.every(finding => finding.id !== 'hardcoded-current-sprint-truth') &&
      slowEndpoint.status === 'risk' &&
      timeoutEndpoint.severity === 'P0' &&
      mutator.length === 1 &&
      guardedMutator.length === 0,
    hardcodedCount: hardcoded.length,
    activeCurrentSprintCount: activeCurrentSprint.length,
    historicalCurrentSprintCount: historicalCurrentSprint.length,
    bootstrapCurrentSprintCount: bootstrapCurrentSprint.length,
    slowEndpoint,
    timeoutEndpoint,
    mutatorCount: mutator.length,
    guardedMutatorCount: guardedMutator.length,
  }
}

export async function buildCodeQualityNightlyAudit({
  repoRoot = process.cwd(),
  baseUrl = 'http://localhost:3000',
  timeoutMs = 5000,
  skipEndpointFetch = false,
} = {}) {
  const allFiles = await listFiles(repoRoot)
  const scanTargets = unique([
    'server.js',
    'package.json',
```

## Top Deterministic Findings

- none

## Doc / Report Artifact Bloat

- Status: `watch`
- Handoff files: 233
- Handoff hot lines: 24096
- Nightly artifacts: 22
- Red/yellow findings: 0/2

- P1 docs/handoffs is growing past the hot-doc budget: docs/handoffs contains 24096 line(s); budget is 20000/35000 warn/risk.
- P1 docs/handoffs is accumulating too many hot files: docs/handoffs has 232 file(s) modified in the last 31 days; budget is 220/320.

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
Generated at: `2026-05-25T07:01:54.746Z`

## Morning Read

- Status: `report_ready`
- Findings: 0 total (0 P0, 0 P1, 0 P2, 0 P3)
- Proposed backlog fixes: 0
- Detection mode: deterministic code first; no LLM detection used.
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev, no feature work.
- Synthetic proof: passed (hardcoded=2, mutator=1, slowEndpoint=risk)

## Endpoint Coverage

- /api/foundation-hub: status=200 latency=133ms payload=560366B risk=healthy (Within V1 audit budget.)
- /api/source-of-truth: status=200 latency=22ms payload=199961B risk=healthy (Within V1 audit budget.)
- /api/foundation/source-lifecycle: status=200 latency=426ms payload=620125B risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: status=200 latency=89ms payload=175417B risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: status=200 latency=28ms payload=33222B risk=healthy (Within V1 audit budget.)

## Asset And Monolith Metrics

Assets:
- public/foundation.html: 8368B raw, 1755B gzip, 121 lines
- public/styles.css: 593B raw, 286B gzip, 14 lines
- public/foundation-nav-config.js: 8513B raw, 2367B gzip, 177 lines
- public/foundation-data.js: 15198B raw, 3075B gzip, 494 lines
- public/foundation-doc-markdown-renderers.js: 37274B raw, 7467B gzip, 1213 lines
- public/foundation.js: 113810B raw, 22415B gzip, 2987 lines
- public/foundation-backlog-renderers.js: 12173B raw, 2904B gzip, 303 lines
- public/foundation-action-route-review-inbox-renderers.js: 9997B raw, 2767B gzip, 234 lines
- public/foundation-source-registry-renderers.js: 60541B raw, 11908B gzip, 1537 lines
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
- public/foundation-router.js: 5474B raw, 1567B gzip, 198 lines

DOM budget:
- status=review, scripts=18, createElement=1769, appendChild=2261, innerHTML=76

Largest files:
- scripts/foundation-verify.mjs: 4998 LOC, 277372B
- lib/foundation-build-closeout-process-gate-records.js: 3133 LOC, 224729B
- public/foundation.js: 2987 LOC, 113810B
- lib/foundation-db-schema-seed-store.js: 2757 LOC, 141992B
- lib/foundation-build-closeout-intelligence-records.js: 2687 LOC, 201921B
- lib/foundation-build-closeout-tightening-records.js: 2599 LOC, 226069B
- lib/foundation-source-crawl-store.js: 2514 LOC, 111863B
- lib/foundation-build-closeout-overnight-records.js: 2446 LOC, 192241B

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

