# Nightly Deep Audit Report - 2026-05-26

Closeout key: `nightly-deep-audit-upgrade-v1`
Generated at: `2026-05-26T07:19:36.624Z`
Report path: `docs/handoffs/nightly-deep-audit-2026-05-26.md`

## Morning Read

- Status: `deep_review_degraded`
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev.
- Active deterministic findings: 21 total (0 P0, 7 P1, 14 P2, 0 P3)
- Closed detector signals reconciled out of active audit: 7 of 28
- Changed files selected: 21
- High-risk review targets: 18
- LLM review mode: `packet_only_explicitly_degraded`
- Deep senior review rollup: `degraded` (Deep senior review did not execute. This run produced review packets only; do not present it as a completed deep code review.)
- Dogfood against May 13 failures: passed
- Doc/report artifact bloat: `healthy` (0 red, 0 yellow)

## Diff Summary

- Previous report: `docs/handoffs/nightly-deep-audit-2026-05-25.json`
- New findings: 2
- Still open: 0
- Resolved: 0
- Finding delta: 2

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

- /api/foundation-hub: 110ms, 575833B, risk=healthy (Within V1 audit budget.)
- /api/source-of-truth: 29ms, 199966B, risk=healthy (Within V1 audit budget.)
- /api/foundation/source-lifecycle: 441ms, 629490B, risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: 153ms, 256929B, risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: 32ms, 33222B, risk=healthy (Within V1 audit budget.)

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

### P1 lib/foundation-build-closeout-intelligence-records.js

- Lines: 2687
- Bytes: 202181
- Reasons: changed_since_baseline

```
export const intelligenceCloseoutRecords = [
  {
    key: 'strategy-001-business-atoms-framework-v1',
    backlogIds: [
      'STRATEGY-001',
    ],
    match: {
      subjectIncludes: [
        'STRATEGY-001',
        'business atoms',
        'strategy-001-business-atoms-framework-v1',
      ],
    },
    operatorCloseout: true,
    mentionedBacklogIds: [
      'GOV-001',
      'DATA-003',
    ],
    systemArea: 'Strategy / business atoms',
    status: 'accepted',
    acceptanceState: 'Verified',
    whatChanged: 'Added a DB-backed Business Atoms layer with atom hits, temporal current-state semantics, and a read-only Strategy Hub Business Atoms view.',
    whatItDoes: 'Seeds source-backed planning signals from existing intelligence atoms and synthesis facts, groups them for weekly/monthly/quarterly/annual review, and keeps owner/threshold/next-trigger accountability on each atom.',
    whyItMatters: 'Strategy and governance need small reusable source-backed business signals before they can drive accountability loops, morning surfaces, or director workflows.',
    whereItLives: [
      'lib/strategy-001-business-atoms.js schema, seeding, evaluator, dashboard snapshot, dogfood proof, and closeout renderer',
      'scripts/process-strategy-001-check.mjs focused process proof and Current Sprint closeout',
      'lib/foundation-db-schema-seed-store.js business atom schema initialization',
      'lib/foundation-db.js business atom dashboard read API and source constraint audit coverage',
      'lib/source-id-constraint-contract.js source_id contract coverage for business_atoms and atom_hits',
      'lib/strategy-shared-comms-routes.js Strategy Hub v2 businessAtoms payload',
      'public/strategic-execution.js read-only Business Atoms UI view',
      'docs/process/strategy-001-business-atoms-framework-plan.md',
      'docs/process/approvals/STRATEGY-001.json',
      'docs/handoffs/2026-05-20-strategy-001-business-atoms-framework-closeout.md',
      'package.json script process:strategy-001-check',
      'scripts/process-system-health-nightly-audit-check.mjs support repair for compact report JSON and self-audit run handling',
      'docs/_archive/handoffs/2026-05-26-hot-doc-refresh/system-health-2026-05-20.md/json latest compact healthy system-health report artifacts',
    ],
    proofCommands: [
      'node --check lib/strategy-001-business-atoms.js scripts/proc
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

### P1 lib/claude-code-review-brain-route.js

- Lines: 1105
- Bytes: 42958
- Reasons: changed_since_baseline

```
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
  BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS,
  finishBrainFleetLedgerCall,
  recordBrainFleetLedgerCall,
} from './brain-fleet-quota-ledger.js'
import {
  buildAuthNeededEvent,
  runHarlanAuthEscalationScenario,
} from './harlan-auth-escalation-loop.js'
import { LLM_AUTH_PATHS, LLM_WORKLOADS } from './llm-router.js'

export const CLAUDE_CODE_REVIEW_BRAIN_ROUTE_CARD_ID = 'CLAUDE-CODE-REVIEW-BRAIN-ROUTE-001'
export const CLAUDE_CODE_REVIEW_BRAIN_ROUTE_SPRINT_ID = 'FOUNDATION-CONTROL-PLANE-AND-BRAIN-FLEET-READINESS-2026-05-20'
export const CLAUDE_CODE_REVIEW_BRAIN_ROUTE_CLOSEOUT_KEY = 'claude-code-review-brain-route-v1'
export const CLAUDE_CODE_REVIEW_BRAIN_ROUTE_PLAN_PATH = 'docs/process/claude-code-review-brain-route-001-plan.md'
export const CLAUDE_CODE_REVIEW_BRAIN_ROUTE_APPROVAL_PATH = 'docs/process/approvals/CLAUDE-CODE-REVIEW-BRAIN-ROUTE-001.json'
export const CLAUDE_CODE_REVIEW_BRAIN_ROUTE_SCRIPT_PATH = 'scripts/process-claude-code-review-brain-route-check.mjs'
export const CLAUDE_CODE_REVIEW_BRAIN_ROUTE_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-26-hot-doc-refresh/2026-05-20-claude-code-review-brain-route-closeout.md'
export const CLAUDE_CODE_REVIEW_BRAIN_ROUTE_NEXT_CARD_ID = 'OPENCLAW-ADAPTER-BOUNDARY-001'

export const CLAUDE_CODE_REVIEW_CREDENTIAL_KEY = 'claude-code-local-max'
export const CLAUDE_CODE_REVIEW_ROUTE_KEY = 'foundation-agent-claude-code'
export const CLAUDE_CODE_REVIEW_MODEL = process.env.LLM_CLAUDE_CODE_REVIEW_MODEL || process.env.LLM_AGENT_MODEL || 'default-claude-code-model'
export const CLAUDE_CODE_REVIEW_PROBE_TOKEN = 'CLAUDE_CODE_REVIEW_BRAIN_ROUTE_OK'
export const CLAUDE_CODE_REVIEW_PROBE_TYPE = 'bounded_claude_code_review_route_probe'

export const CLAUDE_CODE_REVIEW_DOCS = Object.freeze({
  cliReference: 'https://docs.anthropic.com/en/docs/claude-code/cli-usage',
  sdk: 'https://docs.anthropic.com/s/claude-code-sdk',
})

export const CLAUDE_CODE_REVIEW_BRAIN_ROUTE_NOT_NEXT = [
  'Do not use Claude Code as a generic backend API or scheduled extractor route from this card.',
  'Do not run extractor proof, broad source crawls, Skool, MyICOR, Loom, or YouTube runtime work from this card.',
  'Do not run Claude ultrareview, cloud review, background agents, b
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

### P1 lib/codex-direct-subscription-route.js

- Lines: 969
- Bytes: 39368
- Reasons: changed_since_baseline

```
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
  BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS,
  finishBrainFleetLedgerCall,
  recordBrainFleetLedgerCall,
} from './brain-fleet-quota-ledger.js'
import {
  buildAuthNeededEvent,
  runHarlanAuthEscalationScenario,
} from './harlan-auth-escalation-loop.js'
import { LLM_AUTH_PATHS, LLM_WORKLOADS } from './llm-router.js'

export const CODEX_DIRECT_SUBSCRIPTION_ROUTE_CARD_ID = 'CODEX-DIRECT-SUBSCRIPTION-ROUTE-001'
export const CODEX_DIRECT_SUBSCRIPTION_ROUTE_SPRINT_ID = 'FOUNDATION-CONTROL-PLANE-AND-BRAIN-FLEET-READINESS-2026-05-20'
export const CODEX_DIRECT_SUBSCRIPTION_ROUTE_CLOSEOUT_KEY = 'codex-direct-subscription-route-v1'
export const CODEX_DIRECT_SUBSCRIPTION_ROUTE_PLAN_PATH = 'docs/process/codex-direct-subscription-route-001-plan.md'
export const CODEX_DIRECT_SUBSCRIPTION_ROUTE_APPROVAL_PATH = 'docs/process/approvals/CODEX-DIRECT-SUBSCRIPTION-ROUTE-001.json'
export const CODEX_DIRECT_SUBSCRIPTION_ROUTE_SCRIPT_PATH = 'scripts/process-codex-direct-subscription-route-check.mjs'
export const CODEX_DIRECT_SUBSCRIPTION_ROUTE_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-26-hot-doc-refresh/2026-05-20-codex-direct-subscription-route-closeout.md'
export const CODEX_DIRECT_SUBSCRIPTION_ROUTE_NEXT_CARD_ID = 'GEMINI-VIDEO-BRAIN-ROUTE-001'

export const CODEX_DIRECT_SUBSCRIPTION_CREDENTIAL_KEY = 'codex-direct-chatgpt-local'
export const CODEX_DIRECT_SUBSCRIPTION_ROUTE_KEY = 'foundation-agent-codex-direct'
export const CODEX_DIRECT_SUBSCRIPTION_PRIMARY_MODEL = process.env.LLM_CODEX_DIRECT_MODEL || 'gpt-5.5'
export const CODEX_DIRECT_SUBSCRIPTION_FALLBACK_MODEL = process.env.LLM_CODEX_DIRECT_FALLBACK_MODEL || 'gpt-5.4-mini'
export const CODEX_DIRECT_SUBSCRIPTION_PROBE_TOKEN = 'CODEX_DIRECT_SUBSCRIPTION_ROUTE_OK'
export const CODEX_DIRECT_SUBSCRIPTION_PROBE_TYPE = 'bounded_local_cli_probe'

export const CODEX_DIRECT_SUBSCRIPTION_ROUTE_NOT_NEXT = [
  'Do not use direct Codex subscription as a generic backend API.',
  'Do not run extraction, broad source crawls, Skool, MyICOR, Loom, or YouTube runtime work from this card.',
  'Do not work MEETING-VAULT-ACL-001 Phase B or historical Meeting Vault cleanup from this card.',
  'Do not mutate Google Drive permissions.',
  'Do not send emails, Telegram, Slac
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

### P1 lib/foundation-build-closeout-model-records.js

- Lines: 741
- Bytes: 55378
- Reasons: changed_since_baseline

```
export const modelCloseoutRecords = [
  {
    key: 'brain-fleet-foundation-v1',
    backlogIds: [
      'BRAIN-FLEET-FOUNDATION-001',
    ],
    match: {
      subjectIncludes: [
        'BRAIN-FLEET-FOUNDATION-001',
        'brain-fleet-foundation-v1',
        'Brain Fleet foundation',
      ],
    },
    operatorCloseout: true,
    mentionedBacklogIds: [
      'HARLAN-AUTH-ESCALATION-LOOP-001',
      'BRAIN-FLEET-QUOTA-LEDGER-001',
      'BRAIN-FLEET-MODEL-CAPABILITY-REGISTRY-001',
      'EXTRACTOR-BRAIN-FLEET-PROOF-001',
    ],
    systemArea: 'Brain Fleet / LLM route contract',
    status: 'shipped',
    acceptanceState: 'Verified',
    whatChanged: 'Added the no-auth Brain Fleet foundation contract over existing LLM runtime truth. The contract maps `llm_credentials` and `llm_routes` into provider-agnostic route contracts, reuses the existing LLM router planner and credential registry, rejects raw prompt/content payloads, and keeps provider execution disabled until auth escalation, quota ledger, and capability registry cards ship.',
    whatItDoes: 'Lets extractor and future agent work ask which route/model/account-label would be selected without running provider probes, mutating credentials, creating a second router, or pretending quota/auth/capability controls are ready.',
    whyItMatters: 'Brain Fleet needs to become a governed routing layer, not a hidden subscription farm. This gives Steve a visible contract before live provider work starts and keeps Foundation health clean while Build Intel extraction readiness advances.',
    whereItLives: [
      'lib/brain-fleet-foundation.js',
      'scripts/process-brain-fleet-foundation-check.mjs',
      'docs/process/brain-fleet-foundation-001-plan.md',
      'docs/process/approvals/BRAIN-FLEET-FOUNDATION-001.json',
      'docs/_archive/handoffs/2026-05-26-hot-doc-refresh/2026-05-20-brain-fleet-foundation-closeout.md',
      'docs/rebuild/current-plan.md',
      'docs/rebuild/current-state.md',
      'lib/foundation-build-closeout-model-records.js',
      'lib/foundation-verify-coverage-card-ids.js',
      'lib/foundation-verify-live-api-snapshot.js',
      'scripts/foundation-verify.mjs',
      'package.json',
    ],
    proofCommands: [
      'node --check lib/brain-fleet-foundation.js scripts/process-brain-fleet-foundation-check.mjs',
      'npm run process:brain-fleet-foundation-check -- --close-card --j
```

### P1 lib/foundation-build-closeout-build-lane-records.js

- Lines: 724
- Bytes: 53222
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

### P1 lib/brain-fleet-model-capability-registry.js

- Lines: 700
- Bytes: 32031
- Reasons: changed_since_baseline

```
export const BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_CARD_ID = 'BRAIN-FLEET-MODEL-CAPABILITY-REGISTRY-001'
export const BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_SPRINT_ID = 'FOUNDATION-CONTROL-PLANE-AND-BRAIN-FLEET-READINESS-2026-05-20'
export const BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_CLOSEOUT_KEY = 'brain-fleet-model-capability-registry-v1'
export const BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_PLAN_PATH = 'docs/process/brain-fleet-model-capability-registry-001-plan.md'
export const BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_APPROVAL_PATH = 'docs/process/approvals/BRAIN-FLEET-MODEL-CAPABILITY-REGISTRY-001.json'
export const BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_SCRIPT_PATH = 'scripts/process-brain-fleet-model-capability-registry-check.mjs'
export const BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-26-hot-doc-refresh/2026-05-20-brain-fleet-model-capability-registry-closeout.md'
export const BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_NEXT_CARD_ID = 'CODEX-DIRECT-SUBSCRIPTION-ROUTE-001'

export const BRAIN_FLEET_MODEL_CAPABILITY_REGISTRY_VERSION = 1

export const BRAIN_FLEET_CAPABILITY_SUPPORT = Object.freeze({
  SUPPORTED: 'supported',
  UNSUPPORTED: 'unsupported',
  PROBE_REQUIRED: 'probe_required',
  UNKNOWN: 'unknown',
})

export const BRAIN_FLEET_CAPABILITY_SPEED_MODES = Object.freeze([
  'fast',
  'standard',
  'deep',
  'embedding',
  'vision',
  'manual',
  'unknown',
])

export const BRAIN_FLEET_CAPABILITY_REASONING_POSTURES = Object.freeze([
  'none',
  'standard',
  'high',
  'coding_agent',
  'vision_multimodal',
  'manual',
  'unknown',
])

export const BRAIN_FLEET_AUTH_POSTURES = Object.freeze([
  'available',
  'probe_required',
  'auth_needed',
  'blocked',
  'manual_only',
  'unknown',
])

export const BRAIN_FLEET_QUOTA_POSTURES = Object.freeze([
```

### P1 scripts/process-gemini-video-brain-route-check.mjs

- Lines: 644
- Bytes: 29980
- Reasons: changed_since_baseline, process_check_surface

```
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'update Gemini route backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const currentHead = await git(['rev-parse', 'HEAD'])
  const previous = await getActiveFoundationCurrentSprint()
  await updateBacklogItem(CARD_ID, buildBacklogUpdate({ closeCard }), ACTOR)
  await upsertPlanCriticRun(planReview)
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: SPRINT_ID,
        status: 'active',
        goal: previous.sprint?.goal || 'Build Brain Fleet and extractor readiness without breaking Foundation health.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentHead,
          currentStatus: closeCard ? 'gemini_video_brain_route_closed_claude_next' : 'gemini_video_brain_route_building',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `${NEXT_CARD_ID}: probe bounded Claude Code / Agent SDK local route; mark experimental if policy/subscription posture is ambiguous.`
            : `${CARD_ID}: run bounded Gemini video/long-context route proof with ledger, Harlan auth-needed flow, artifact contract, and fallback.`,
          activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
          buildLaneCount: 1,
          strategyPeopleParked: true,
          geminiRouteKey: GEMINI_VIDEO_ROUTE_KEY,
          noBroadExtraction: true,
          noCredentialMutation: true,
          noExternalWrites: true,
        },
      },
      items: buildSprintItems(previous, { closeCard, currentHead }),
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || SPRINT_ID,
      reason: 'Steve ordered Gemini video/long-context route proof after direct Codex and before Claude, OpenClaw adapter boundary, or extractor proof.',
    },
  )
}

async function main() {
```

### P1 scripts/process-claude-code-review-brain-route-check.mjs

- Lines: 642
- Bytes: 29698
- Reasons: changed_since_baseline, process_check_surface

```
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'update Claude route backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const currentHead = await git(['rev-parse', 'HEAD'])
  const previous = await getActiveFoundationCurrentSprint()
  await updateBacklogItem(CARD_ID, buildBacklogUpdate({ closeCard }), ACTOR)
  await upsertPlanCriticRun(planReview)
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: SPRINT_ID,
        status: 'active',
        goal: previous.sprint?.goal || 'Build Brain Fleet and extractor readiness without breaking Foundation health.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentHead,
          currentStatus: closeCard ? 'claude_code_review_brain_route_closed_openclaw_next' : 'claude_code_review_brain_route_building',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `${NEXT_CARD_ID}: demote OpenClaw to adapter status and keep Foundation architecture provider-agnostic.`
            : `${CARD_ID}: run bounded Claude Code review route proof with ledger, Harlan auth-needed flow, SDK posture, and experimental policy classification.`,
          activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
          buildLaneCount: 1,
          strategyPeopleParked: true,
          claudeRouteKey: CLAUDE_CODE_REVIEW_ROUTE_KEY,
          claudeRoutePolicyPosture: 'experimental',
          extractorV1BlockedByClaude: false,
          noBroadExtraction: true,
          noCredentialMutation: true,
          noExternalWrites: true,
        },
      },
      items: buildSprintItems(previous, { closeCard, currentHead }),
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || SPRINT_ID,
      reason: 'Steve ordered Claude Code review route after Gemini and before OpenClaw adapter boundary; Claude ambiguity must not block extractor v1.',
    },
  )
}
```

### P1 scripts/process-codex-direct-subscription-route-check.mjs

- Lines: 629
- Bytes: 28851
- Reasons: changed_since_baseline, process_check_surface

```
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SCRIPT_PATH,
    operation: 'update direct Codex route backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const currentHead = await git(['rev-parse', 'HEAD'])
  const previous = await getActiveFoundationCurrentSprint()
  await updateBacklogItem(CARD_ID, buildBacklogUpdate({ closeCard }), ACTOR)
  await upsertPlanCriticRun(planReview)
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: SPRINT_ID,
        status: 'active',
        goal: previous.sprint?.goal || 'Build Brain Fleet and extractor readiness without breaking Foundation health.',
        activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentHead,
          currentStatus: closeCard ? 'codex_direct_subscription_route_closed_gemini_next' : 'codex_direct_subscription_route_building',
          lastClosedCardId: closeCard ? CARD_ID : previous.sprint?.metadata?.lastClosedCardId,
          nextAction: closeCard
            ? `${NEXT_CARD_ID}: add/probe bounded Gemini video/long-context route with ledger and Harlan auth-needed flow.`
            : `${CARD_ID}: run bounded direct Codex CLI route proof with ledger and no external writes.`,
          activeBlockerCardId: closeCard ? NEXT_CARD_ID : CARD_ID,
          buildLaneCount: 1,
          strategyPeopleParked: true,
          directCodexRouteKey: CODEX_DIRECT_SUBSCRIPTION_ROUTE_KEY,
          noGenericBackendApi: true,
          noExternalWrites: true,
        },
      },
      items: buildSprintItems(previous, { closeCard, currentHead }),
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || SPRINT_ID,
      reason: 'Steve ordered direct Codex route before Gemini, Claude, OpenClaw adapter boundary, or extractor proof.',
    },
  )
}

async function main() {
  const args = parseArgs()
```

### P1 lib/brain-fleet-quota-ledger.js

- Lines: 592
- Bytes: 23687
- Reasons: changed_since_baseline

```
import { planBrainFleetRoute } from './brain-fleet-foundation.js'
import { createLlmCall, finishLlmCall } from './foundation-db.js'

export const BRAIN_FLEET_QUOTA_LEDGER_CARD_ID = 'BRAIN-FLEET-QUOTA-LEDGER-001'
export const BRAIN_FLEET_QUOTA_LEDGER_SPRINT_ID = 'FOUNDATION-CONTROL-PLANE-AND-BRAIN-FLEET-READINESS-2026-05-20'
export const BRAIN_FLEET_QUOTA_LEDGER_CLOSEOUT_KEY = 'brain-fleet-quota-ledger-v1'
export const BRAIN_FLEET_QUOTA_LEDGER_PLAN_PATH = 'docs/process/brain-fleet-quota-ledger-001-plan.md'
export const BRAIN_FLEET_QUOTA_LEDGER_APPROVAL_PATH = 'docs/process/approvals/BRAIN-FLEET-QUOTA-LEDGER-001.json'
export const BRAIN_FLEET_QUOTA_LEDGER_SCRIPT_PATH = 'scripts/process-brain-fleet-quota-ledger-check.mjs'
export const BRAIN_FLEET_QUOTA_LEDGER_CLOSEOUT_PATH = 'docs/_archive/handoffs/2026-05-26-hot-doc-refresh/2026-05-20-brain-fleet-quota-ledger-closeout.md'
export const BRAIN_FLEET_QUOTA_LEDGER_NEXT_CARD_ID = 'BRAIN-FLEET-MODEL-CAPABILITY-REGISTRY-001'

export const BRAIN_FLEET_LEDGER_VERSION = 1

export const BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS = Object.freeze({
  NONE: 'none',
  AUTH_NEEDED: 'auth_needed',
  RATE_LIMITED: 'rate_limited',
  QUOTA_EXHAUSTED: 'quota_exhausted',
  PROVIDER_FAILURE: 'provider_failure',
  PROVIDER_EXECUTION_DISABLED: 'provider_execution_disabled_for_proof',
  ROUTE_NOT_RUNNABLE: 'route_not_runnable',
  MISSING_LEDGER_TRUTH: 'missing_ledger_truth',
})

export const BRAIN_FLEET_QUOTA_LEDGER_NOT_NEXT = [
  'Do not run live provider probes from the quota ledger card.',
  'Do not execute OpenClaw, Codex, Gemini, Claude, OpenAI, Anthropic, browser automation, or extractor model calls.',
  'Do not run MEETING-VAULT-ACL-001 Phase B or mutate Drive permissions.',
  'Do not mutate credentials, provider config, source systems, Drive permissions, email, Telegram, or public systems.',
  'Do not start extractor proof, YouTube runtime proof, broad crawl, Strategy, or People work from this card.',
  'Do not hide auth, quota, rate-limit, provider, or missing-ledger failures as green.',
]

const TERMINAL_STATUSES = new Set(['succeeded', 'failed', 'skipped'])
const STOP_REQUIRED_STATUSES = new Set(['failed', 'skipped'])
const STOP_ON_FAILURE_CONDITIONS = new Set([
  BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.AUTH_NEEDED,
  BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.RATE_LIMITED,
  BRAIN_FLEET_QUOTA_LEDGER_STOP_CONDITIONS.QUOTA_EXHAUS
```

## Top Deterministic Findings

- P1 process-check-report-write-policy-risk: Process/check path writes repo reports without explicit report-output posture -> PROCESS-CHECK-REPORT-OUTPUT-POLICY-001
- P1 process-check-report-write-policy-risk: Process/check path writes repo reports without explicit report-output posture -> PROCESS-CHECK-REPORT-OUTPUT-POLICY-001
- P1 process-check-report-write-policy-risk: Process/check path writes repo reports without explicit report-output posture -> PROCESS-CHECK-REPORT-OUTPUT-POLICY-001
- P1 process-check-report-write-policy-risk: Process/check path writes repo reports without explicit report-output posture -> PROCESS-CHECK-REPORT-OUTPUT-POLICY-001
- P1 process-check-report-write-policy-risk: Process/check path writes repo reports without explicit report-output posture -> PROCESS-CHECK-REPORT-OUTPUT-POLICY-001
- P1 process-check-report-write-policy-risk: Process/check path writes repo reports without explicit report-output posture -> PROCESS-CHECK-REPORT-OUTPUT-POLICY-001
- P1 process-check-report-write-policy-risk: Process/check path writes repo reports without explicit report-output posture -> PROCESS-CHECK-REPORT-OUTPUT-POLICY-001
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
- Handoff files: 216
- Handoff hot lines: 17870
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
Generated at: `2026-05-26T07:19:37.318Z`

## Morning Read

- Status: `report_ready`
- Findings: 21 total (0 P0, 7 P1, 14 P2, 0 P3)
- Proposed backlog fixes: 2
- Detection mode: deterministic code first; no LLM detection used.
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev, no feature work.
- Synthetic proof: passed (hardcoded=2, mutator=1, slowEndpoint=risk)

## Endpoint Coverage

- /api/foundation-hub: status=200 latency=110ms payload=575833B risk=healthy (Within V1 audit budget.)
- /api/source-of-truth: status=200 latency=29ms payload=199966B risk=healthy (Within V1 audit budget.)
- /api/foundation/source-lifecycle: status=200 latency=441ms payload=629490B risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: status=200 latency=153ms payload=256929B risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: status=200 latency=32ms payload=33222B risk=healthy (Within V1 audit budget.)

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

### P1 Process/check path writes repo reports without explicit report-output posture
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-build-intel-extraction-check.mjs:60` (default_write_no_write_optout)
- Why it matters: Live extraction and synthesis runs should persist operational truth to the Foundation store. Markdown/source-note files are checkpoint artifacts and should require an explicit `--write-report` posture so normal jobs do not dirty Git or turn repo docs into a runtime database.
- Proposed owner/card: Foundation Process / `PROCESS-CHECK-REPORT-OUTPUT-POLICY-001`
- Detector: process check report-output policy detector
- False-positive note: The command writes report artifacts by default and relies on --no-write as an opt-out.

### P1 Process/check path writes repo reports without explicit report-output posture
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-code-quality-nightly-audit-check.mjs:108` (default_write_no_write_optout)
- Why it matters: Live extraction and synthesis runs should persist operational truth to the Foundation store. Markdown/source-note files are checkpoint artifacts and should require an explicit `--write-report` posture so normal jobs do not dirty Git or turn repo docs into a runtime database.
- Proposed owner/card: Foundation Process / `PROCESS-CHECK-REPORT-OUTPUT-POLICY-001`
- Detector: process check report-output policy detector
- False-positive note: The command writes report artifacts by default and relies on --no-write as an opt-out.

### P1 Process/check path writes repo reports without explicit report-output posture
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-foundation-deep-merge-audit-check.mjs:190` (legacy_apply_gated_without_shared_guard)
- Why it matters: Live extraction and synthesis runs should persist operational truth to the Foundation store. Markdown/source-note files are checkpoint artifacts and should require an explicit `--write-report` posture so normal jobs do not dirty Git or turn repo docs into a runtime database.
- Proposed owner/card: Foundation Process / `PROCESS-CHECK-REPORT-OUTPUT-POLICY-001`
- Detector: process check report-output policy detector
- False-positive note: The command appears gated by apply/close flags but does not use the shared process-check write guard.

### P1 Process/check path writes repo reports without explicit report-output posture
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-gstack-build-intel-check.mjs:93` (default_write_no_write_optout)
- Why it matters: Live extraction and synthesis runs should persist operational truth to the Foundation store. Markdown/source-note files are checkpoint artifacts and should require an explicit `--write-report` posture so normal jobs do not dirty Git or turn repo docs into a runtime database.
- Proposed owner/card: Foundation Process / `PROCESS-CHECK-REPORT-OUTPUT-POLICY-001`
- Detector: process check report-output policy detector
- False-positive note: The command writes report artifacts by default and relies on --no-write as an opt-out.

### P1 Process/check path writes repo reports without explicit report-output posture
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-nightly-deep-audit-upgrade-check.mjs:87` (unguarded_report_writer)
- Why it matters: Live extraction and synthesis runs should persist operational truth to the Foundation store. Markdown/source-note files are checkpoint artifacts and should require an explicit `--write-report` posture so normal jobs do not dirty Git or turn repo docs into a runtime database.
- Proposed owner/card: Foundation Process / `PROCESS-CHECK-REPORT-OUTPUT-POLICY-001`
- Detector: process check report-output policy detector
- False-positive note: The process-check script writes files without an explicit report-output or shared write posture.

### P1 Process/check path writes repo reports without explicit report-output posture
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-old-system-research-team-harvest-check.mjs:319` (legacy_apply_gated_without_shared_guard)
- Why it matters: Live extraction and synthesis runs should persist operational truth to the Foundation store. Markdown/source-note files are checkpoint artifacts and should require an explicit `--write-report` posture so normal jobs do not dirty Git or turn repo docs into a runtime database.
- Proposed owner/card: Foundation Process / `PROCESS-CHECK-REPORT-OUTPUT-POLICY-001`
- Detector: process check report-output policy detector
- False-positive note: The command appears gated by apply/close flags but does not use the shared process-check write guard.

### P1 Process/check path writes repo reports without explicit report-output posture
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-research-lane-purge-check.mjs:54` (unguarded_report_writer)
- Why it matters: Live extraction and synthesis runs should persist operational truth to the Foundation store. Markdown/source-note files are checkpoint artifacts and should require an explicit `--write-report` posture so normal jobs do not dirty Git or turn repo docs into a runtime database.
- Proposed owner/card: Foundation Process / `PROCESS-CHECK-REPORT-OUTPUT-POLICY-001`
- Detector: process check report-output policy detector
- False-positive note: The process-check script writes files without an explicit report-output or shared write posture.

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
- Evidence: `scripts/process-gstack-build-intel-check.mjs:121`
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

## Findings By Sprint Card

- `CODEBASE-HARDCODE-AUDIT-001`: 21 findings
- `FOUNDATION-API-PERF-AUDIT-001`: 0 findings
- `FOUNDATION-FRONTEND-PERF-AUDIT-001`: 0 findings
- `FOUNDATION-MONOLITH-RISK-AUDIT-001`: 0 findings
- `VERIFIER-ASSUMPTION-REGISTRY-001`: 0 findings
- `SPRINT-STATE-MUTATION-AUDIT-001`: 0 findings
- `NIGHTLY-AUDIT-REPORT-001`: 0 findings

## Proposed Backlog Fixes

- `PROCESS-CHECK-REPORT-OUTPUT-POLICY-001`
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

