# Nightly Deep Audit Report - 2026-05-26

Closeout key: `nightly-deep-audit-upgrade-v1`
Generated at: `2026-05-26T07:40:44.275Z`
Report path: `docs/handoffs/nightly-deep-audit-2026-05-26.md`

## Morning Read

- Status: `deep_review_degraded`
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev.
- Active deterministic findings: 0 total (0 P0, 0 P1, 0 P2, 0 P3)
- Closed detector signals reconciled out of active audit: 7 of 7
- Changed files selected: 9
- High-risk review targets: 17
- LLM review mode: `packet_only_explicitly_degraded`
- Deep senior review rollup: `degraded` (Deep senior review did not execute. This run produced review packets only; do not present it as a completed deep code review.)
- Dogfood against May 13 failures: passed
- Doc/report artifact bloat: `healthy` (0 red, 0 yellow)

## Diff Summary

- Previous report: `docs/handoffs/nightly-deep-audit-2026-05-25.json`
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

- /api/foundation-hub: 117ms, 575701B, risk=healthy (Within V1 audit budget.)
- /api/source-of-truth: 31ms, 199966B, risk=healthy (Within V1 audit budget.)
- /api/foundation/source-lifecycle: 457ms, 629438B, risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: 127ms, 255083B, risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: 35ms, 33222B, risk=healthy (Within V1 audit budget.)

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
      'docs/_archive/handoffs/2026-05-21-youtube-current-sprint-workspace-cleanup-closeout.md',
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

### P1 lib/foundation-jobs.js

- Lines: 1485
- Bytes: 64845
- Reasons: changed_since_baseline

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

### P1 scripts/process-old-system-research-team-harvest-check.mjs

- Lines: 399
- Bytes: 16493
- Reasons: changed_since_baseline, process_check_surface

```
#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
  getBacklogItemsByIds,
} from '../lib/foundation-db.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
} from '../lib/process-write-guard.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const CARD_ID = 'OLD-SYSTEM-RESEARCH-TEAM-HARVEST-001'
const CLOSEOUT_KEY = 'old-system-research-team-harvest-v1'
const PLAN_PATH = 'docs/process/old-system-research-team-harvest-001-plan.md'
const APPROVAL_PATH = 'docs/process/approvals/OLD-SYSTEM-RESEARCH-TEAM-HARVEST-001.json'
const REPORT_PATH = 'docs/_archive/audits/2026-05-19-old-system-research-team-harvest.md'
const JSON_PATH = 'docs/audits/2026-05-19-old-system-research-team-harvest.json'
const DEFAULT_OLD_REPO = path.join(os.homedir(), 'bcrew-buddy-reference')

const PROMOTED_CARD_IDS = [
  'WEB-GODMODE-001',
  'LOOM-001',
  'MEETING-VIDEO-001',
  'SKOOL-WORKER-001',
  'MYICRO-TRAINING-001',
  'DRIVE-WORKER-001',
  'BUILD-INTEL-DAILY-EXTRACTION-REVIEW-001',
  'FOUNDATION-OPERATOR-PULSE-001',
  'SOURCE-019',
  'SOURCE-020',
  'DATA-002',
]

const KEY_EVIDENCE_PATHS = [
  'docs/agent-inventory.md',
  'docs/team-reference.md',
  'docs/architecture/intelligence-loop.md',
  'skills/bcrew-external-scout/SKILL.md',
```

### P1 scripts/process-nightly-deep-audit-upgrade-check.mjs

- Lines: 359
- Bytes: 16209
- Reasons: changed_since_baseline, process_check_surface

```
#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  NIGHTLY_DEEP_AUDIT_APPROVAL_PATH,
  NIGHTLY_DEEP_AUDIT_JOB_KEY,
  NIGHTLY_DEEP_AUDIT_PLAN_PATH,
  NIGHTLY_DEEP_AUDIT_SCRIPT_PATH,
  NIGHTLY_DEEP_AUDIT_SCHEDULE_LOCAL_TIME,
  NIGHTLY_DEEP_AUDIT_SCHEDULE_TIMEZONE,
  NIGHTLY_DEEP_AUDIT_UPGRADE_CARD_ID,
  NIGHTLY_DEEP_AUDIT_UPGRADE_CLOSEOUT_KEY,
  NIGHTLY_DEEP_AUDIT_UPGRADE_SPRINT_ID,
  buildDeepAuditorRealLoopDogfoodProof,
  buildNightlyDeepAuditUpgrade,
  buildNightlyDeepAuditUpgradeDogfoodProof,
  renderNightlyDeepAuditUpgradeReport,
  serializeNightlyDeepAuditUpgradeJson,
} from '../lib/nightly-deep-audit-upgrade.js'
import { getFoundationJobDefinitions } from '../lib/foundation-jobs.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getFoundationSnapshot,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'
import {
  isProcessReportWriteRequested,
} from '../lib/process-write-guard.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    noWrite: false,
    skipEndpointFetch: false,
    baseUrl: process.env.FOUNDATION_BASE_URL || 'http://localhost:3000',
    timeoutMs: 8000,
    changedSinceRef: 'HEAD~1',
    runLlmReview: process.env.NIGHTLY_DEEP_AUDIT_RUN_LLM === 'true',
```

### P1 scripts/process-foundation-deep-merge-audit-check.mjs

- Lines: 316
- Bytes: 13242
- Reasons: changed_since_baseline, process_check_surface

```
#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  FOUNDATION_DEEP_MERGE_AUDIT_APPROVAL_PATH,
  FOUNDATION_DEEP_MERGE_AUDIT_CARD_ID,
  FOUNDATION_DEEP_MERGE_AUDIT_CLOSEOUT_KEY,
  FOUNDATION_DEEP_MERGE_AUDIT_JSON_PATH,
  FOUNDATION_DEEP_MERGE_AUDIT_PLAN_PATH,
  FOUNDATION_DEEP_MERGE_AUDIT_REPORT_PATH,
  FOUNDATION_DEEP_MERGE_AUDIT_SCRIPT_PATH,
} from '../lib/nightly-deep-audit-constants.js'
import {
  buildNightlyDeepAuditUpgrade,
  renderNightlyDeepAuditUpgradeReport,
  serializeNightlyDeepAuditUpgradeJson,
} from '../lib/nightly-deep-audit-upgrade.js'
import {
  closeFoundationDb,
  getBacklogItemsByIds,
} from '../lib/foundation-db.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
} from '../lib/process-write-guard.js'

const execFile = promisify(execFileCallback)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    apply: false,
    runLlmReview: false,
    baseUrl: process.env.FOUNDATION_BASE_URL || 'http://localhost:3000',
    timeoutMs: 8000,
    baselineRef: '',
  }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
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

### P1 scripts/process-research-lane-purge-check.mjs

- Lines: 242
- Bytes: 11601
- Reasons: changed_since_baseline, process_check_surface

```
}

async function writeReport(snapshot) {
  await fs.writeFile(RESEARCH_LANE_PURGE_REPORT_PATH, renderResearchLanePurgeReport(snapshot))
}

async function closeSprintCard(snapshot) {
  const counts = snapshot.summary?.dispositionCounts || {}
  await updateBacklogItem(RESEARCH_LANE_PURGE_CARD_ID, {
    lane: 'done',
    nextAction: 'Done for v1. Stop for Source Truth Guardrails sprint review/rollover; do not silently open another sprint or product work.',
    statusNote: [
      `Closed on 2026-05-13 under \`${RESEARCH_LANE_PURGE_CLOSEOUT_KEY}\`.`,
      `V1 generated \`${RESEARCH_LANE_PURGE_REPORT_PATH}\` from live backlog research rows.`,
      `The proposed-only report covers ${snapshot.summary?.researchCardCount || 0} research cards with disposition counts promote_review=${counts.promote_review || 0}, keep_review=${counts.keep_review || 0}, kill_review=${counts.kill_review || 0}, move_to_future_concepts_review=${counts.move_to_future_concepts_review || 0}.`,
      'Proof compares research-lane signatures before and after report generation, proves synthetic stale/recent/high-priority/deprecated behavior, and confirms no research card lane is changed by the report.',
      'This does not delete cards, auto-move research cards, edit or create a future-concepts parking doc, start Reply/Watching Loop, expand Strategy UI, implement connectors, mutate Drive permissions, or send request-access emails.',
    ].join(' '),
  }, 'codex')

  const current = await getActiveFoundationCurrentSprint()
  const sprint = current.sprint
  await upsertFoundationCurrentSprintOverlay({
    sprint: {
      sprintId: SPRINT_ID,
      status: 'active',
      goal: sprint.goal,
      activeBlockerCardId: null,
      metadata: {
        ...sprint.metadata,
        currentStatus: 'source_truth_guardrails_complete_review_required',
        nextAction: 'Source Truth Guardrails sprint is complete. Stop for sprint review/rollover before opening another sprint.',
        completedAt: new Date().toISOString(),
      },
    },
    items: current.items.map(item => ({
      cardId: item.backlogId,
      order: item.order,
      stage: item.backlogId === RESEARCH_LANE_PURGE_CARD_ID ? 'done_this_sprint' : item.stage,
      planRef: item.planRef,
      definitionOfDone: item.definitionOfDone,
      proofCommands: item.proofCommands,
      readinessBlockerCleared: item.readinessBlockerCleared,

```

### P1 scripts/process-build-intel-extraction-check.mjs

- Lines: 199
- Bytes: 7608
- Reasons: changed_since_baseline, process_check_surface

```
#!/usr/bin/env node

import fs from 'node:fs/promises'
import process from 'node:process'
import {
  BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CARD_IDS,
  BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CLOSEOUT_KEY,
  BUILD_INTEL_EXTRACTION_IMPLEMENTATION_REPORT_PATH,
  BUILD_INTEL_EXTRACTION_IMPLEMENTATION_SPRINT_ID,
  buildBuildIntelExtractionImplementationSnapshot,
  renderBuildIntelExtractionReport,
} from '../lib/build-intel-extraction-implementation.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getFoundationSnapshot,
  searchSharedCommunicationArtifactsForContext,
} from '../lib/foundation-db.js'
import {
  validatePlanApprovalFile,
} from '../lib/approval-integrity.js'
import {
  isProcessReportWriteRequested,
} from '../lib/process-write-guard.js'

const args = new Set(process.argv.slice(2))
const json = args.has('--json')
const noWrite = args.has('--no-write')
const writeReport = isProcessReportWriteRequested(process.argv.slice(2)) && !noWrite

function laneCounts(backlogItems = []) {
  return backlogItems.reduce((acc, item) => {
    const key = `${item.lane || 'unknown'}:${item.priority || 'unknown'}`
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function check(ok, name, detail = '') {
  return { ok: Boolean(ok), name, detail }
}

async function main() {
  const before = await getFoundationSnapshot()
```

### P1 scripts/process-gstack-build-intel-check.mjs

- Lines: 175
- Bytes: 10288
- Reasons: changed_since_baseline, process_check_surface

```
#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  GSTACK_BUILD_INTEL_CARD_IDS,
  GSTACK_BUILD_INTEL_CLOSEOUT_KEY,
  GSTACK_BUILD_INTEL_EXPECTED_COMMIT,
  GSTACK_BUILD_INTEL_LOCAL_MIRROR,
  GSTACK_BUILD_INTEL_REPORT_PATH,
  GSTACK_BUILD_INTEL_SCRIPT_PATH,
  GSTACK_BUILD_INTEL_SOURCE_ID,
  GSTACK_BUILD_INTEL_SPRINT_ID,
  buildGStackBuildIntelSnapshot,
  renderGStackBuildIntelReport,
} from '../lib/gstack-build-intel.js'
import {
  isBuildIntelSnapshotBaselineEvidence,
} from '../lib/build-intel-snapshot-baseline.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getFoundationSnapshot,
} from '../lib/foundation-db.js'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  isProcessReportWriteRequested,
} from '../lib/process-write-guard.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false, noWrite: false, card: null }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg === '--no-write') args.noWrite = true
    else if (arg.startsWith('--card=')) args.card = arg.slice('--card='.length)
  }
  args.writeReport = isProcessReportWriteRequested(argv) && !args.noWrite
  return args
}

function addFinding(findings, ok, check, detail = '') {
  findings.push({ ok: Boolean(ok), check, detail })
}

```

### P1 scripts/process-code-quality-nightly-audit-check.mjs

- Lines: 167
- Bytes: 8522
- Reasons: changed_since_baseline, process_check_surface

```
#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CODE_QUALITY_NIGHTLY_AUDIT_CARD_IDS,
  CODE_QUALITY_NIGHTLY_AUDIT_CLOSEOUT_KEY,
  CODE_QUALITY_NIGHTLY_AUDIT_JOB_KEY,
  CODE_QUALITY_NIGHTLY_AUDIT_MIN_FINDING_COUNT,
  CODE_QUALITY_NIGHTLY_AUDIT_REPORT_PATH,
  CODE_QUALITY_NIGHTLY_AUDIT_REQUIRED_ENDPOINTS,
  CODE_QUALITY_NIGHTLY_AUDIT_SCRIPT_PATH,
  CODE_QUALITY_NIGHTLY_AUDIT_SPRINT_ID,
  buildCodeQualityNightlyAudit,
  renderCodeQualityNightlyAuditReport,
} from '../lib/code-quality-nightly-audit.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getFoundationSnapshot,
  getPlanCriticRunsByCardIds,
} from '../lib/foundation-db.js'
import { getFoundationJobDefinitions } from '../lib/foundation-jobs.js'
import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  APPROVAL_MIN_APPROVED_PLAN_SCORE_LABEL,
  meetsApprovalThreshold,
} from '../lib/approval-threshold-registry.js'
import {
  isProcessReportWriteRequested,
} from '../lib/process-write-guard.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    json: false,
    noWrite: false,
    skipEndpointFetch: false,
    baseUrl: process.env.FOUNDATION_BASE_URL || 'http://localhost:3000',
    timeoutMs: 5000,
    reportPath: CODE_QUALITY_NIGHTLY_AUDIT_REPORT_PATH,
  }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
    else if (arg === '--no-write') args.noWrite = true
```

### P1 scripts/process-check-report-output-policy-check.mjs

- Lines: 141
- Bytes: 7292
- Reasons: changed_since_baseline, process_check_surface

```
#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  PROCESS_CHECK_REPORT_OUTPUT_POLICY_CARD_ID,
  PROCESS_CHECK_REPORT_OUTPUT_POLICY_SCRIPT_PATH,
  buildSyntheticProcessCheckReportOutputPolicyProof,
  scanProcessCheckReportOutputPolicy,
} from '../lib/process-check-report-output-policy.js'
import {
  buildCodeQualityNightlyAudit,
} from '../lib/code-quality-nightly-audit.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const EXPECTED_REPAIRED_PATHS = [
  'scripts/process-build-intel-extraction-check.mjs',
  'scripts/process-code-quality-nightly-audit-check.mjs',
  'scripts/process-foundation-deep-merge-audit-check.mjs',
  'scripts/process-gstack-build-intel-check.mjs',
  'scripts/process-nightly-deep-audit-upgrade-check.mjs',
  'scripts/process-old-system-research-team-harvest-check.mjs',
  'scripts/process-research-lane-purge-check.mjs',
]

const EXPECTED_PROTECTED_PATHS = [
  'scripts/process-build-intel-source-value-grader-check.mjs',
  'scripts/process-source-maturity-atom-flow-repair-check.mjs',
  'scripts/process-youtube-latest-20-full-watch-runner-check.mjs',
]

function parseArgs(argv = process.argv.slice(2)) {
  const args = { json: false }
  for (const arg of argv) {
    if (arg === '--json' || arg === '--json=true') args.json = true
  }
  return args
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}

function findingPaths(findings = []) {
```

## Top Deterministic Findings

- none

## Doc / Report Artifact Bloat

- Status: `healthy`
- Handoff files: 217
- Handoff hot lines: 17920
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
Generated at: `2026-05-26T07:40:44.991Z`

## Morning Read

- Status: `report_ready`
- Findings: 0 total (0 P0, 0 P1, 0 P2, 0 P3)
- Proposed backlog fixes: 0
- Detection mode: deterministic code first; no LLM detection used.
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev, no feature work.
- Synthetic proof: passed (hardcoded=2, mutator=1, slowEndpoint=risk)

## Endpoint Coverage

- /api/foundation-hub: status=200 latency=117ms payload=575701B risk=healthy (Within V1 audit budget.)
- /api/source-of-truth: status=200 latency=31ms payload=199966B risk=healthy (Within V1 audit budget.)
- /api/foundation/source-lifecycle: status=200 latency=457ms payload=629438B risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: status=200 latency=127ms payload=255083B risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: status=200 latency=35ms payload=33222B risk=healthy (Within V1 audit budget.)

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
