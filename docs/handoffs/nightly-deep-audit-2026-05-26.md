# Nightly Deep Audit Report - 2026-05-26

Closeout key: `nightly-deep-audit-upgrade-v1`
Generated at: `2026-05-26T07:26:12.352Z`
Report path: `docs/handoffs/nightly-deep-audit-2026-05-26.md`

## Morning Read

- Status: `deep_review_degraded`
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev.
- Active deterministic findings: 14 total (0 P0, 0 P1, 14 P2, 0 P3)
- Closed detector signals reconciled out of active audit: 7 of 21
- Changed files selected: 5
- High-risk review targets: 18
- LLM review mode: `packet_only_explicitly_degraded`
- Deep senior review rollup: `degraded` (Deep senior review did not execute. This run produced review packets only; do not present it as a completed deep code review.)
- Dogfood against May 13 failures: passed
- Doc/report artifact bloat: `healthy` (0 red, 0 yellow)

## Diff Summary

- Previous report: `docs/handoffs/nightly-deep-audit-2026-05-25.json`
- New findings: 1
- Still open: 0
- Resolved: 0
- Finding delta: 1

## LLM Review Boundary

- Executed this run: no
- Selected route: `foundation-deep-audit-openai-api`
- Provider/model: `openai / gpt-5.5`
- Route blocker: none
- Active finding count: 0
- Closed senior-review repeats reconciled out: 0
- Note: Deep senior review did not execute. This run produced review packets only; do not present it as a completed deep code review.

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

- /api/foundation-hub: 153ms, 575831B, risk=healthy (Within V1 audit budget.)
- /api/source-of-truth: 34ms, 199966B, risk=healthy (Within V1 audit budget.)
- /api/foundation/source-lifecycle: 467ms, 629491B, risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: 133ms, 253917B, risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: 39ms, 33222B, risk=healthy (Within V1 audit budget.)

## Largest Files

- scripts/foundation-verify.mjs: 4998 LOC, 277372B
- lib/foundation-build-closeout-process-gate-records.js: 3133 LOC, 224729B
- public/foundation.js: 2987 LOC, 113810B
- public/dev.css: 2812 LOC, 50093B
- lib/foundation-db-schema-seed-store.js: 2757 LOC, 141992B
- lib/foundation-build-closeout-source-records.js: 2693 LOC, 226068B
- lib/foundation-build-closeout-intelligence-records.js: 2687 LOC, 202181B
- lib/foundation-build-closeout-tightening-records.js: 2599 LOC, 226069B
- lib/foundation-source-crawl-store.js: 2514 LOC, 111864B
- lib/foundation-build-closeout-overnight-records.js: 2446 LOC, 192241B

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

- Lines: 2292
- Bytes: 92543
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

- Lines: 2057
- Bytes: 67259
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

### P1 lib/code-quality-nightly-audit.js

- Lines: 1295
- Bytes: 59217
- Reasons: changed_since_baseline

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
  return {
    ok: hardcoded.length >= 2 &&
      activeCurrentSprint.some(finding => finding.id === 'hardcoded-current-sprint-truth' && finding.severity === 'P0') &&
      historicalCurrentSprint.every(finding => finding.id !== 'hardcoded-current-sprint-truth') &&
      bootstrapCurrentSprint.every(finding => finding.id !== 'hardcoded-current-sprint-truth') &&
      slowEndpoint.status === 'risk' &&
      timeoutEndpoint.severity === 'P0' &&
      mutator.length === 1 &&
      guardedMutator.length === 0 &&
      unguardedReportWriter.length === 1 &&
      guardedReportWriter.length === 0,
    hardcodedCount: hardcoded.length,
    activeCurrentSprintCount: activeCurrentSprint.length,
    historicalCurrentSprintCount: historicalCurrentSprint.length,
```

### P1 lib/nightly-deep-audit-upgrade.js

- Lines: 1187
- Bytes: 47750
- Reasons: changed_since_baseline

```
    timeoutMs: 90_000,
  })
  const selfRepair = detectVerifierSelfRepairRiskInText({
    relativePath: 'synthetic/foundation-verify.mjs',
    text: `async function verify() { await resetFoundationDb(); await bootstrapFoundationDb({ includeBootstrapSeed: true }); await repairLiveState(); return { ok: true } }`,
  })
  const writeCapableCheck = detectMutationPatternsInText({
    relativePath: 'synthetic/process-danger-check.mjs',
    text: `await updateBacklogItem('CARD-001', { lane: 'done' }); await upsertFoundationCurrentSprintOverlay({ sprint: { status: 'active' } })`,
  })
  const hardcodedTruth = detectHardcodedLiveTruthInText({
    relativePath: 'synthetic/live-truth.js',
    text: `const EXPECTED_SOURCE_COUNT = 35; const currentSummary = 'Latest live checkpoint: 14/14 tables and 5/5 RPCs are passing.'`,
  })
  const monolith = classifyFileRisk({ file: 'lib/foundation-db.js', lines: 19_494, changed: false })

  return {
    ok: slowEndpoint.status === 'risk' &&
      selfRepair.length === 1 &&
      writeCapableCheck.length >= 1 &&
      hardcodedTruth.length >= 2 &&
      monolith.reasons.includes('actively_dangerous_10k_plus_file'),
    slowEndpoint,
    selfRepairCount: selfRepair.length,
    writeCapableCheckCount: writeCapableCheck.length,
    hardcodedTruthCount: hardcodedTruth.length,
    monolith,
  }
}

async function resolveLlmReviewRoute() {
  try {
    const plan = await planLlmRoute({ workload: LLM_WORKLOADS.DEEP_AUDIT_SENIOR_REVIEW, hubKey: 'foundation' })
    return {
      runnable: plan.runnable,
      selectedRoute: plan.selectedRoute?.routeKey || null,
      provider: plan.selectedRoute?.provider || null,
      model: plan.selectedRoute?.model || null,
      blockReason: plan.blockReason || null,
      routeReadiness: plan.routeReadiness || [],
    }
  } catch (error) {
    return {
      runnable: false,
      selectedRoute: null,
      provider: null,
      model: null,
      blockReason: error instanceof Error ? error.message : String(error),
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

### P1 lib/source-lifecycle.js

- Lines: 1050
- Bytes: 42260
- Reasons: source_health_surface

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

### P1 scripts/process-subscription-brain-extractor-adapter-check.mjs

- Lines: 749
- Bytes: 36512
- Reasons: process_check_surface

```
    scriptPath: SCRIPT_PATH,
    operation: 'update subscription adapter backlog rows, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const currentHead = git(['rev-parse', 'HEAD'])
  const previous = await getActiveFoundationCurrentSprint()
  await upsertBacklogRows({ closeCard })
  await upsertPlanCriticRun(planReview)
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: SPRINT_ID,
        status: 'active',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        goal: previous.sprint?.goal || 'YouTube To Dev Team Intelligence V1: connect source-backed Build Intel into Dev Team decisions and approval-gated build promotion.',
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentHead,
          currentStatus: closeCard ? 'subscription_brain_extractor_adapter_closed' : 'subscription_brain_extractor_adapter_building',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
          nextAction: closeCard
            ? `${NEXT_CARD_ID}: run guarded Mark public last-50 baseline using proven Eyes route and subscription reasoning boundary.`
            : `${CARD_ID}: prove logged-in subscription mini-brain evidence reasoning before Mark last-50.`,
          subscriptionAdapterReportArtifactId: REPORT_ARTIFACT_ID,
          seedVideoId: SUBSCRIPTION_BRAIN_EXTRACTOR_ADAPTER_SEED_VIDEO_ID,
          directVideoEyesRoute: 'foundation-video-gemini-api',
          subscriptionRouteUse: 'bounded_evidence_reasoning_only',
          noBroadExtraction: true,
          noCredentialMutation: true,
          noExternalWrites: true,
          noAutoBacklogCards: true,
          strategyPeopleParked: true,
        },
      },
      items: buildSprintItems(previous, { closeCard, currentHead }),
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || SPRINT_ID,
      reason: 'Steve ordered subscription mini-brain adapter proof before Mark last-50 extraction.',
    },
  )
}

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

### P1 scripts/process-harlan-auth-escalation-loop-check.mjs

- Lines: 546
- Bytes: 25981
- Reasons: process_check_surface

```
    scriptPath: SCRIPT_PATH,
    operation: 'update HARLAN-AUTH-ESCALATION-LOOP-001 backlog row, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  if (!previous?.sprint?.sprintId) throw new Error('No active Current Sprint found for Harlan auth escalation update.')

  await upsertPlanCriticRun(planReview)
  await updateBacklogItem(CARD_ID, buildBacklogUpdate({ closeCard }), ACTOR)

  const previousItems = previous.items || []
  const nextItems = previousItems.map(item => {
    const cardId = item.cardId || item.backlogId
    if (cardId === CARD_ID) return buildSprintItem(item, { closeCard })
    if (closeCard && cardId === NEXT_CARD_ID) return buildNextSprintItem(item)
    return cloneSprintItem(item)
  })

  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SPRINT_ID,
        status: 'active',
        goal: previous.sprint.goal || 'Build Foundation control-plane and Brain Fleet readiness before extractor runtime work.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          ...(previous.sprint.metadata || {}),
          activeQueue: [
            CARD_ID,
            NEXT_CARD_ID,
            'BRAIN-FLEET-MODEL-CAPABILITY-REGISTRY-001',
            'CODEX-DIRECT-SUBSCRIPTION-ROUTE-001',
            'GEMINI-VIDEO-BRAIN-ROUTE-001',
            'CLAUDE-CODE-REVIEW-BRAIN-ROUTE-001',
            'OPENCLAW-ADAPTER-BOUNDARY-001',
            'EXTRACTOR-BRAIN-FLEET-PROOF-001',
            'YOUTUBE-BUILD-INTEL-RUNTIME-PROOF-001',
          ],
          currentStatus: closeCard ? `continue ${NEXT_CARD_ID}` : `building ${CARD_ID}`,
          closeoutKey: closeCard ? CLOSEOUT_KEY : previous.sprint.metadata?.closeoutKey,
          notNext: NOT_NEXT,
        },
      },
      items: nextItems.length ? nextItems : [buildSprintItem({}, { closeCard })],
    },
    ACTOR,
    {
      apply: true,
```

### P1 scripts/process-youtube-god-mode-autonomous-watch-scheduler-check.mjs

- Lines: 537
- Bytes: 21656
- Reasons: process_check_surface

```
#!/usr/bin/env node

import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import {
  YOUTUBE_GOD_MODE_AUTONOMOUS_WATCH_SCHEDULER_CARD_ID,
  YOUTUBE_GOD_MODE_AUTONOMOUS_WATCH_SCHEDULER_JOB_KEY,
  YOUTUBE_GOD_MODE_AUTONOMOUS_WATCH_SCHEDULER_PLAN_PATH,
  YOUTUBE_GOD_MODE_AUTONOMOUS_WATCH_SCHEDULER_SCRIPT_PATH,
  YOUTUBE_GOD_MODE_SCHEDULER_DEFAULT_CONFIG,
  buildYoutubeGodModeAutonomousWatchPlan,
  buildYoutubeGodModeAutonomousWatchSchedulerDogfoodProof,
} from '../lib/youtube-god-mode-autonomous-watch-scheduler.js'
import { getFoundationJobDefinitions } from '../lib/foundation-jobs.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const DEFAULT_COMMAND_TIMEOUT_MS = 60 * 60 * 1000
const GEMINI_STANDARD_PRICING_BY_MODEL = {
  'gemini-3.5-flash': { inputPerMillionUsd: 1.50, outputPerMillionUsd: 9.00 },
  'gemini-2.5-flash': { inputPerMillionUsd: 0.30, outputPerMillionUsd: 2.50 },
}

function text(value) {
  return String(value || '').trim()
}

function readArgValue(argv = [], prefix = '') {
  const found = argv.find(arg => String(arg || '').startsWith(prefix))
  return found ? String(found).slice(prefix.length).trim() : ''
}

function readArgValues(argv = [], prefix = '') {
  return argv
    .filter(arg => String(arg || '').startsWith(prefix))
    .flatMap(arg => String(arg).slice(prefix.length).split(','))
    .map(text)
    .filter(Boolean)
}

function flag(argv = [], name = '') {
  return argv.includes(name) || argv.includes(`${name}=true`)
}
```

### P1 scripts/process-youtube-current-sprint-workspace-cleanup-check.mjs

- Lines: 487
- Bytes: 23081
- Reasons: process_check_surface

```
  const missing = EXPECTED_ACTIVE_IDS.filter(id => !byId.has(id))
  if (missing.length) {
    throw new Error(`Cannot clean sprint; missing active sprint item(s): ${missing.join(', ')}`)
  }

  await upsertCleanupBacklogRow()
  await upsertPlanCriticRun(planReview)

  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: SPRINT_ID,
        status: 'active',
        goal: 'YouTube To Dev Team Intelligence V1: daily public creator watch, Mark last-50 baseline, Dev Team Hub, Director output, and approval-gated build promotion.',
        activeBlockerCardId: ACTIVE_CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          sprintWorkspaceCleanupCardId: CARD_ID,
          sprintPlanRef: PRIMARY_SPRINT_PLAN_REF,
          sprintProcessPlanRef: PROCESS_SPRINT_PLAN_REF,
          sprintCorrectionPlanRef: DAILY_WATCH_CORRECTION_PLAN_REF,
          sprintPlanCloseoutKey: 'youtube-dev-team-intelligence-sprint-plan-v1',
          sprintCorrectionCloseoutKey: 'youtube-creator-daily-watch-sprint-update-v1',
          currentStatus: 'youtube_sprint_workspace_clean',
          executiveSummary: 'Current sprint is clean: old shipped cards live in Backlog done and Recent Work; this board shows only the YouTube To Dev Team Intelligence V1 execution cards.',
          nextAction: `${ACTIVE_CARD_ID}: build scheduled public creator watch with Mark last-50 and other creator last-20 baseline rules.`,
          activeBlockerCardId: ACTIVE_CARD_ID,
          runOrder: EXPECTED_ACTIVE_IDS,
          previousDoneRowsMovedToRecentWork: HISTORICAL_DONE_IDS,
          parkedOutsideSprint: PARKED_OUTSIDE_SPRINT,
          exitCriteria: EXIT_CRITERIA,
          cleanSprintOverlay: true,
          doneThisSprintClearedForNewSprint: true,
          oldDoneMovedToRecentWork: true,
          dailyWatchRequired: true,
          markKashefBaselineDepth: 50,
          defaultCreatorBaselineDepth: 20,
          noBroadExtraction: true,
          noCredentialMutation: true,
          noExternalWrites: true,
          noAutoBacklogCards: true,
          publicYoutubeFirst: true,
          strategyPeopleParked: true,
          approvalPolicy: 'Approval-bound private/external actions park the exact source item and continue safe sprint work; daily watch may inspect public no-auth metadata only; deeper extractio
```

### P1 scripts/process-foundation-gate-check-serialization-check.mjs

- Lines: 477
- Bytes: 23619
- Reasons: process_check_surface

```
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: `create/update ${CARD_ID} card, Plan Critic row, and Current Sprint overlay`,
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveRows({ closeCard, planReview })
  await upsertFoundationCurrentSprintOverlay(
    buildCurrentSprintOverlay(previous, { closeCard, currentHead: gitState.head }),
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: `${CARD_ID} ${closeCard ? 'closed; advance to Brain Fleet contract' : 'is the active serialization blocker'}.`,
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  await initFoundationDb()

  const [
    approval,
    planSource,
    packageJson,
    moduleSource,
    scriptSource,
    foundationVerifySource,
    systemHealthScriptSource,
    repeatedFailureScriptSource,
    backlogHygieneScriptSource,
    foundationShipSource,
    shipGateDoc,
    currentPlan,
    currentState,
    closeoutRegistrySource,
    coverageSource,
    closeoutDoc,
  ] = await Promise.all([
    validatePlanApprovalFile({ repoRoot, approvalRef: APPROVAL_PATH, cardId: CARD_ID }),
    readRepoFile(PLAN_PATH),
    readRepoJson('package.json'),
    readRepoFile('lib/foundation-gate-check-serialization.js'),
    readRepoFile(SCRIPT_PATH),
```

### P1 scripts/process-mark-kashef-goal-build-intel-packet-check.mjs

- Lines: 472
- Bytes: 26565
- Reasons: process_check_surface

```
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_SCRIPT_PATH,
    operation: 'create/update Mark Kashef goal Build Intel packet card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage, planReview })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_SPRINT_ID,
        status: 'active',
        goal: 'Close Mark Kashef public /goal Build Intel packet without transcript/visual extraction or implementation drift.',
        activeBlockerCardId: closeCard ? MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_NEXT_CARD_ID : MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : stage,
          startedBy: 'codex-mark-kashef-goal-packet',
          currentStatus: closeCard ? 'next_scoping' : stage,
          closeoutKey: MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CLOSEOUT_KEY,
          nextAction: closeCard
            ? `Continue ${MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_NEXT_CARD_ID} from repo truth.`
            : 'Write Mark Kashef /goal public metadata packet and keep extraction/implementation blocked.',
          priorityOrder: [
            MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_CARD_ID,
            MARK_KASHEF_GOAL_BUILD_INTEL_PACKET_NEXT_CARD_ID,
          ],
          notNext: MARK_KASHEF_GOAL_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'Exact public source metadata is verified without transcript or visual extraction.',
            'Official /goal docs are linked for mechanics and Mark-specific workflow claims remain unextracted.',
            'Pattern candidates route to AIOS goal-runner eval rather than direct implementation.',
            'Dogfood rejects missing source proof, title mismatch, missing official docs, transcript fetch, private Skool access, copied transcript, downstream writes, and direct implementation.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: closeCard
        ? [buildSprintItem({ closeCard, stage }), buil
```

### P1 scripts/process-mark-m-skool-extraction-preflight-check.mjs

- Lines: 468
- Bytes: 26158
- Reasons: process_check_surface

```
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: MARK_M_SKOOL_EXTRACTION_PREFLIGHT_SCRIPT_PATH,
    operation: 'create/update Mark M Skool preflight card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, stage, planReview })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: MARK_M_SKOOL_EXTRACTION_PREFLIGHT_SPRINT_ID,
        status: 'active',
        goal: 'Close Mark M Skool private-community source/auth preflight without accessing private content.',
        activeBlockerCardId: closeCard ? MARK_M_SKOOL_EXTRACTION_PREFLIGHT_NEXT_CARD_ID : MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : stage,
          startedBy: 'codex-mark-m-skool-extraction-preflight',
          currentStatus: closeCard ? 'next_scoping' : stage,
          closeoutKey: MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CLOSEOUT_KEY,
          nextAction: closeCard
            ? `Continue ${MARK_M_SKOOL_EXTRACTION_PREFLIGHT_NEXT_CARD_ID} from repo truth.`
            : 'Write Skool metadata-only source/auth preflight and keep private access blocked.',
          priorityOrder: [
            MARK_M_SKOOL_EXTRACTION_PREFLIGHT_CARD_ID,
            MARK_M_SKOOL_EXTRACTION_PREFLIGHT_NEXT_CARD_ID,
            'MATT-POCOCK-CLAUDE-FOLDER-EVAL-001',
          ],
          notNext: MARK_M_SKOOL_EXTRACTION_PREFLIGHT_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'Source contract, connector credential, validation profile, and source-auth row all prove Skool is blocked pending approval.',
            'Approval packet draft names every required field without granting extraction.',
            'Dogfood rejects missing source truth, unsafe approval, paid/private auth, live extraction, copied community content, inspected community map, downstream writes, and model calls.',
            'No Skool private access, posts, comments, member data, lessons, transcripts, screenshots, downloads, model calls, or downstream writes occur.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],

```

### P1 scripts/process-matt-pocock-claude-folder-eval-check.mjs

- Lines: 458
- Bytes: 24023
- Reasons: process_check_surface

```
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: MATT_POCOCK_CLAUDE_FOLDER_EVAL_SCRIPT_PATH,
    operation: 'create/update Matt Pocock eval card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  await upsertLiveCardAndPlanCritic({ closeCard, planReview })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: MATT_POCOCK_CLAUDE_FOLDER_EVAL_SPRINT_ID,
        status: 'active',
        goal: 'Close Matt Pocock public Claude folder/source eval without install, extraction, import, or implementation drift.',
        activeBlockerCardId: closeCard ? MATT_POCOCK_CLAUDE_FOLDER_EVAL_NEXT_CARD_ID : MATT_POCOCK_CLAUDE_FOLDER_EVAL_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : stage,
          startedBy: 'codex-matt-pocock-claude-folder-eval',
          currentStatus: closeCard ? 'done_ready_for_next_repo_truth' : stage,
          closeoutKey: MATT_POCOCK_CLAUDE_FOLDER_EVAL_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Continue the next safe Foundation-up backlog card from repo truth.'
            : 'Write Matt Pocock public source eval packet and keep install/extraction/import blocked.',
          priorityOrder: [
            MATT_POCOCK_CLAUDE_FOLDER_EVAL_CARD_ID,
            MATT_POCOCK_CLAUDE_FOLDER_EVAL_NEXT_CARD_ID,
          ],
          notNext: MATT_POCOCK_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'Public GitHub repo metadata, commit, license, and skill catalog shape are recorded.',
            'Commands/skills/markdown-memory patterns are classified without copying raw skills.',
            '90-day context handling remains blocked as unverified because the public repo scan did not find it.',
            'Dogfood rejects install, plugin/symlink writes, raw content copy, extraction, false 90-day claim, and downstream writes.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: closeCard
        ? [buildSprintItem({ closeCard, stage }), buildNextSprintItem()]
        : [buildSprintItem({ closeCard, stage })],
    },
    'codex-matt-pocock-claude-folder
```

## Top Deterministic Findings

- P2 runtime-model-name-hardcode-risk: Runtime model name appears outside router/config ownership -> LLM-RUNTIME-CONFIG-AUDIT-001
- P2 runtime-model-name-hardcode-risk: Runtime model name appears outside router/config ownership -> LLM-RUNTIME-CONFIG-AUDIT-001
- P2 runtime-model-name-hardcode-risk: Runtime model name appears outside router/config ownership -> LLM-RUNTIME-CONFIG-AUDIT-001
- P2 runtime-model-name-hardcode-risk: Runtime model name appears outside router/config ownership -> LLM-RUNTIME-CONFIG-AUDIT-001
- P2 runtime-model-name-hardcode-risk: Runtime model name appears outside router/config ownership -> LLM-RUNTIME-CONFIG-AUDIT-001
- P2 runtime-model-name-hardcode-risk: Runtime model name appears outside router/config ownership -> LLM-RUNTIME-CONFIG-AUDIT-001
- P2 runtime-model-name-hardcode-risk: Runtime model name appears outside router/config ownership -> LLM-RUNTIME-CONFIG-AUDIT-001
- P2 runtime-model-name-hardcode-risk: Runtime model name appears outside router/config ownership -> LLM-RUNTIME-CONFIG-AUDIT-001
- P2 runtime-model-name-hardcode-risk: Runtime model name appears outside router/config ownership -> LLM-RUNTIME-CONFIG-AUDIT-001
- P2 runtime-model-name-hardcode-risk: Runtime model name appears outside router/config ownership -> LLM-RUNTIME-CONFIG-AUDIT-001
- P2 runtime-model-name-hardcode-risk: Runtime model name appears outside router/config ownership -> LLM-RUNTIME-CONFIG-AUDIT-001
- P2 runtime-model-name-hardcode-risk: Runtime model name appears outside router/config ownership -> LLM-RUNTIME-CONFIG-AUDIT-001
- P2 runtime-model-name-hardcode-risk: Runtime model name appears outside router/config ownership -> LLM-RUNTIME-CONFIG-AUDIT-001
- P2 runtime-model-name-hardcode-risk: Runtime model name appears outside router/config ownership -> LLM-RUNTIME-CONFIG-AUDIT-001

## Doc / Report Artifact Bloat

- Status: `healthy`
- Handoff files: 217
- Handoff hot lines: 17930
- Nightly artifacts: 14
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
Generated at: `2026-05-26T07:26:13.055Z`

## Morning Read

- Status: `report_ready`
- Findings: 14 total (0 P0, 0 P1, 14 P2, 0 P3)
- Proposed backlog fixes: 1
- Detection mode: deterministic code first; no LLM detection used.
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev, no feature work.
- Synthetic proof: passed (hardcoded=2, mutator=1, slowEndpoint=risk)

## Endpoint Coverage

- /api/foundation-hub: status=200 latency=153ms payload=575831B risk=healthy (Within V1 audit budget.)
- /api/source-of-truth: status=200 latency=34ms payload=199966B risk=healthy (Within V1 audit budget.)
- /api/foundation/source-lifecycle: status=200 latency=467ms payload=629491B risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: status=200 latency=133ms payload=253917B risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: status=200 latency=39ms payload=33222B risk=healthy (Within V1 audit budget.)

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
- lib/foundation-build-closeout-process-gate-records.js: 3133 LOC, 224729B
- public/foundation.js: 2987 LOC, 113810B
- public/dev.css: 2812 LOC, 50093B
- lib/foundation-db-schema-seed-store.js: 2757 LOC, 141992B
- lib/foundation-build-closeout-source-records.js: 2693 LOC, 226068B
- lib/foundation-build-closeout-intelligence-records.js: 2687 LOC, 202181B
- lib/foundation-build-closeout-tightening-records.js: 2599 LOC, 226069B

## Top Findings

### P2 Runtime model name appears outside router/config ownership
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `lib/foundation-intelligence-audit-verifier.js:96`
- Why it matters: Model choices should be controlled by the Foundation LLM router or provider capability records. Scattering exact model names makes upgrades brittle and can leave critical intelligence lanes on old models.
- Proposed owner/card: LLM Router / `LLM-RUNTIME-CONFIG-AUDIT-001`
- Detector: runtime model literal detector
- False-positive note: Router defaults, provider docs, historical handoffs, and test fixtures may name exact models; active workload scripts should route through config.

### P2 Runtime model name appears outside router/config ownership
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `lib/source-lifecycle.js:296`
- Why it matters: Model choices should be controlled by the Foundation LLM router or provider capability records. Scattering exact model names makes upgrades brittle and can leave critical intelligence lanes on old models.
- Proposed owner/card: LLM Router / `LLM-RUNTIME-CONFIG-AUDIT-001`
- Detector: runtime model literal detector
- False-positive note: Router defaults, provider docs, historical handoffs, and test fixtures may name exact models; active workload scripts should route through config.

### P2 Runtime model name appears outside router/config ownership
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `lib/gstack-build-intel.js:387`
- Why it matters: Model choices should be controlled by the Foundation LLM router or provider capability records. Scattering exact model names makes upgrades brittle and can leave critical intelligence lanes on old models.
- Proposed owner/card: LLM Router / `LLM-RUNTIME-CONFIG-AUDIT-001`
- Detector: runtime model literal detector
- False-positive note: Router defaults, provider docs, historical handoffs, and test fixtures may name exact models; active workload scripts should route through config.

### P2 Runtime model name appears outside router/config ownership
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-connector-credential-check.mjs:227`
- Why it matters: Model choices should be controlled by the Foundation LLM router or provider capability records. Scattering exact model names makes upgrades brittle and can leave critical intelligence lanes on old models.
- Proposed owner/card: LLM Router / `LLM-RUNTIME-CONFIG-AUDIT-001`
- Detector: runtime model literal detector
- False-positive note: Router defaults, provider docs, historical handoffs, and test fixtures may name exact models; active workload scripts should route through config.

### P2 Runtime model name appears outside router/config ownership
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-foundation-gate-check-serialization-check.mjs:195`
- Why it matters: Model choices should be controlled by the Foundation LLM router or provider capability records. Scattering exact model names makes upgrades brittle and can leave critical intelligence lanes on old models.
- Proposed owner/card: LLM Router / `LLM-RUNTIME-CONFIG-AUDIT-001`
- Detector: runtime model literal detector
- False-positive note: Router defaults, provider docs, historical handoffs, and test fixtures may name exact models; active workload scripts should route through config.

### P2 Runtime model name appears outside router/config ownership
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-foundation-plan-reconcile-check.mjs:53`
- Why it matters: Model choices should be controlled by the Foundation LLM router or provider capability records. Scattering exact model names makes upgrades brittle and can leave critical intelligence lanes on old models.
- Proposed owner/card: LLM Router / `LLM-RUNTIME-CONFIG-AUDIT-001`
- Detector: runtime model literal detector
- False-positive note: Router defaults, provider docs, historical handoffs, and test fixtures may name exact models; active workload scripts should route through config.

### P2 Runtime model name appears outside router/config ownership
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-gstack-build-intel-check.mjs:125`
- Why it matters: Model choices should be controlled by the Foundation LLM router or provider capability records. Scattering exact model names makes upgrades brittle and can leave critical intelligence lanes on old models.
- Proposed owner/card: LLM Router / `LLM-RUNTIME-CONFIG-AUDIT-001`
- Detector: runtime model literal detector
- False-positive note: Router defaults, provider docs, historical handoffs, and test fixtures may name exact models; active workload scripts should route through config.

### P2 Runtime model name appears outside router/config ownership
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-harlan-auth-escalation-loop-check.mjs:322`
- Why it matters: Model choices should be controlled by the Foundation LLM router or provider capability records. Scattering exact model names makes upgrades brittle and can leave critical intelligence lanes on old models.
- Proposed owner/card: LLM Router / `LLM-RUNTIME-CONFIG-AUDIT-001`
- Detector: runtime model literal detector
- False-positive note: Router defaults, provider docs, historical handoffs, and test fixtures may name exact models; active workload scripts should route through config.

### P2 Runtime model name appears outside router/config ownership
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-mark-kashef-goal-build-intel-packet-check.mjs:158`
- Why it matters: Model choices should be controlled by the Foundation LLM router or provider capability records. Scattering exact model names makes upgrades brittle and can leave critical intelligence lanes on old models.
- Proposed owner/card: LLM Router / `LLM-RUNTIME-CONFIG-AUDIT-001`
- Detector: runtime model literal detector
- False-positive note: Router defaults, provider docs, historical handoffs, and test fixtures may name exact models; active workload scripts should route through config.

### P2 Runtime model name appears outside router/config ownership
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-mark-m-skool-extraction-preflight-check.mjs:312`
- Why it matters: Model choices should be controlled by the Foundation LLM router or provider capability records. Scattering exact model names makes upgrades brittle and can leave critical intelligence lanes on old models.
- Proposed owner/card: LLM Router / `LLM-RUNTIME-CONFIG-AUDIT-001`
- Detector: runtime model literal detector
- False-positive note: Router defaults, provider docs, historical handoffs, and test fixtures may name exact models; active workload scripts should route through config.

### P2 Runtime model name appears outside router/config ownership
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-matt-pocock-claude-folder-eval-check.mjs:37`
- Why it matters: Model choices should be controlled by the Foundation LLM router or provider capability records. Scattering exact model names makes upgrades brittle and can leave critical intelligence lanes on old models.
- Proposed owner/card: LLM Router / `LLM-RUNTIME-CONFIG-AUDIT-001`
- Detector: runtime model literal detector
- False-positive note: Router defaults, provider docs, historical handoffs, and test fixtures may name exact models; active workload scripts should route through config.

### P2 Runtime model name appears outside router/config ownership
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-subscription-brain-extractor-adapter-check.mjs:688`
- Why it matters: Model choices should be controlled by the Foundation LLM router or provider capability records. Scattering exact model names makes upgrades brittle and can leave critical intelligence lanes on old models.
- Proposed owner/card: LLM Router / `LLM-RUNTIME-CONFIG-AUDIT-001`
- Detector: runtime model literal detector
- False-positive note: Router defaults, provider docs, historical handoffs, and test fixtures may name exact models; active workload scripts should route through config.

### P2 Runtime model name appears outside router/config ownership
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-youtube-current-sprint-workspace-cleanup-check.mjs:71`
- Why it matters: Model choices should be controlled by the Foundation LLM router or provider capability records. Scattering exact model names makes upgrades brittle and can leave critical intelligence lanes on old models.
- Proposed owner/card: LLM Router / `LLM-RUNTIME-CONFIG-AUDIT-001`
- Detector: runtime model literal detector
- False-positive note: Router defaults, provider docs, historical handoffs, and test fixtures may name exact models; active workload scripts should route through config.

### P2 Runtime model name appears outside router/config ownership
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-youtube-god-mode-autonomous-watch-scheduler-check.mjs:25`
- Why it matters: Model choices should be controlled by the Foundation LLM router or provider capability records. Scattering exact model names makes upgrades brittle and can leave critical intelligence lanes on old models.
- Proposed owner/card: LLM Router / `LLM-RUNTIME-CONFIG-AUDIT-001`
- Detector: runtime model literal detector
- False-positive note: Router defaults, provider docs, historical handoffs, and test fixtures may name exact models; active workload scripts should route through config.

## Findings By Sprint Card

- `CODEBASE-HARDCODE-AUDIT-001`: 14 findings
- `FOUNDATION-API-PERF-AUDIT-001`: 0 findings
- `FOUNDATION-FRONTEND-PERF-AUDIT-001`: 0 findings
- `FOUNDATION-MONOLITH-RISK-AUDIT-001`: 0 findings
- `VERIFIER-ASSUMPTION-REGISTRY-001`: 0 findings
- `SPRINT-STATE-MUTATION-AUDIT-001`: 0 findings
- `NIGHTLY-AUDIT-REPORT-001`: 0 findings

## Proposed Backlog Fixes

- `LLM-RUNTIME-CONFIG-AUDIT-001`

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
