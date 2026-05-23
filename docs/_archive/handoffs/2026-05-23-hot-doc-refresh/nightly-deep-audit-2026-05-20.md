# Nightly Deep Audit Report - 2026-05-20

Closeout key: `nightly-deep-audit-upgrade-v1`
Generated at: `2026-05-20T07:00:34.230Z`
Report path: `docs/handoffs/nightly-deep-audit-2026-05-20.md`

## Morning Read

- Status: `deep_review_executed`
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev.
- Deterministic findings: 7 total (0 P0, 5 P1, 2 P2, 0 P3)
- Changed files selected: 4
- High-risk review targets: 13
- LLM review mode: `bounded_senior_review_executed`
- Deep senior review rollup: `healthy` (deep senior review executed with 7 finding(s))
- Dogfood against May 13 failures: passed
- Doc/report artifact bloat: `healthy` (0 red, 0 yellow)

## Diff Summary

- Previous report: `docs/handoffs/nightly-deep-audit-2026-05-19.json`
- New findings: 0
- Still open: 6
- Resolved: 6
- Finding delta: -6

## LLM Review Boundary

- Executed this run: yes
- Selected route: `foundation-synthesis-openclaw-chatgpt`
- Provider/model: `openclaw / openai-codex/gpt-5.4`
- Route blocker: none
- Finding count: 7
- Note: Deep senior review executed through the approved router with report-only/no-autofix posture.

Deep senior review executed through the approved router.

## Senior Review Findings

- P1 Verifier mixes active sprint assertions with historical closeout proof (scripts/foundation-verify.mjs:3073) -> ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001; owner=Foundation Verifier; next=Split historical closeout proof from active sprint assertions so each path uses its own state model and verifier contract.
- P1 Foundation Hub route still builds many domains in one handler (server.js:1) -> FOUNDATION-HUB-PAYLOAD-EXTRACT-001; owner=Foundation Runtime; next=Continue extracting hub payload assembly into bounded domain loaders with slimmer route orchestration and measured payload contracts.
- P1 Foundation UI current-state summary truth is still embedded in a process check (scripts/process-extract-current-check.mjs:363) -> FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001; owner=Foundation UI; next=Move current-state summary truth to source-backed payload builders and keep the check limited to proof of behavior.
- P1 Source contract count is still encoded as an exact baseline in runtime truth (lib/foundation-current-sprint.js:920) -> SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001; owner=Source Lifecycle; next=Replace fixed source-count expectations with dynamic contract-derived counts from the live source registry.
- P1 Dynamic source-count proof still repeats the exact baseline assumption (scripts/process-source-lifecycle-dynamic-counts-check.mjs:187) -> SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001; owner=Source Lifecycle; next=Make the focused check derive expected counts from live source contracts instead of a fixed baseline literal.
- P2 Focused checks still assert exact dated sprint IDs across modules (lib/foundation-current-sprint.js:107) -> watch_or_review; owner=Foundation Process; next=Route focused checks through historical-aware sprint metadata instead of exact dated ID matches.
- P2 Foundation frontend still shows heavy DOM rebuild signals above review budget (public/foundation.html:1) -> watch_or_review; owner=Foundation Frontend; next=Keep reducing DOM rebuild pressure by splitting renderers and lowering aggregate element creation and innerHTML churn on the Foundation surface.

## Endpoint And Payload Trend

- /api/foundation-hub: 101ms, 511825B, risk=healthy (Within V1 audit budget.)
- /api/source-of-truth: 21ms, 192646B, risk=healthy (Within V1 audit budget.)
- /api/foundation/source-lifecycle: 375ms, 637861B, risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: 250ms, 286801B, risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: 26ms, 33222B, risk=healthy (Within V1 audit budget.)

## Largest Files

- scripts/foundation-verify.mjs: 4973 LOC, 275775B
- public/foundation.js: 2998 LOC, 113633B
- lib/foundation-build-closeout-process-gate-records.js: 2875 LOC, 203989B
- lib/foundation-db-schema-seed-store.js: 2653 LOC, 137639B
- lib/foundation-build-closeout-tightening-records.js: 2599 LOC, 226069B
- lib/foundation-source-crawl-store.js: 2506 LOC, 111553B
- lib/foundation-build-closeout-overnight-records.js: 2446 LOC, 192241B
- lib/foundation-db.js: 2261 LOC, 90410B
- lib/foundation-build-closeout-source-records.js: 2159 LOC, 182727B
- lib/foundation-shared-comms-store.js: 2150 LOC, 86906B

## High-Risk Review Packets

### P0 scripts/foundation-verify.mjs

- Lines: 4973
- Bytes: 275775
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
```

### P1 public/foundation.js

- Lines: 2998
- Bytes: 113633
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

### P1 lib/foundation-build-closeout-process-gate-records.js

- Lines: 2875
- Bytes: 203989
- Reasons: changed_since_baseline

```
export const processGateCloseoutRecords = [
  {
    key: 'strategy-004-planning-workflow-v1',
    backlogIds: [
      'STRATEGY-004',
      'STRATEGY-009',
    ],
    operatorCloseout: true,
    match: {
      subjectIncludes: [
        'STRATEGY-004',
        'strategy-004-planning-workflow-v1',
        'Strategy planning workflow',
      ],
    },
    systemArea: 'Strategy Hub planning workflow',
    status: 'shipped',
    acceptanceState: 'Verified',
    whatChanged: 'Added a deterministic source-backed Planning Workflow to Strategy Hub v2.',
    whatItDoes: '`STRATEGY-004` turns source-to-gap pressure, Strategy Action Router records, Strategic Intelligence issues, Scoper outputs, and retrieval status into priority, carry-forward, stop, and missing-data review queues with owner, next action, and provenance refs.',
    whyItMatters: 'Steve needs usable AI-assisted quarterly planning without reviving unsupported advisor chat or applying decisions automatically.',
    whereItLives: [
      'lib/strategy-planning-workflow.js deterministic builder, evidence reader, evaluator, and dogfood proof',
      'lib/strategy-shared-comms-routes.js /api/strategic-execution/v2 planningWorkflow payload',
      'public/strategic-execution.html Planning Workflow nav item',
      'public/strategic-execution.js Planning Workflow renderer',
      'scripts/process-strategy-004-check.mjs focused proof and close-card writer',
      'docs/process/strategy-004-planning-workflow-plan.md',
      'docs/process/approvals/STRATEGY-004.json',
      'docs/handoffs/2026-05-20-strategy-004-planning-workflow-closeout.md',
    ],
    proofCommands: [
      'node --check lib/strategy-planning-workflow.js lib/strategy-shared-comms-routes.js public/strategic-execution.js scripts/process-strategy-004-check.mjs',
      'npm run process:strategy-004-check -- --close-card --json',
      'npm run process:system-health-nightly-audit-check -- --json',
      'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
      'npm run backlog:hygiene -- --json',
      'npm run foundation:verify -- --json-summary',
      'npm run process:ship-check -- --card=STRATEGY-004 --planApprovalRef=docs/process/approvals/STRATEGY-004.json --closeoutKey=strategy-004-planning-workflow-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
      'npm run proc
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

- Lines: 2036
- Bytes: 66645
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

### P1 lib/foundation-verify-coverage-card-ids.js

- Lines: 513
- Bytes: 20844
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

### P1 scripts/process-kpi-lead-validation-check.mjs

- Lines: 506
- Bytes: 27288
- Reasons: changed_since_baseline, process_check_surface, source_health_surface

```
  await upsertLiveRows({ closeCard, planReview })
  const baseItems = ensureSprintHasTarget(previous.items || [])
  const items = baseItems.map(item => {
    if (item.cardId === KPI_LEAD_VALIDATION_NEXT_CARD_ID && closeCard) {
      return { ...item, stage: 'scoping' }
    }
    return buildSprintItemFromExisting(item, { closeCard })
  })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        ...(previous.sprint || {}),
        sprintId: previous.sprint?.sprintId || KPI_LEAD_VALIDATION_SPRINT_ID,
        status: 'active',
        activeBlockerCardId: closeCard ? KPI_LEAD_VALIDATION_NEXT_CARD_ID : KPI_LEAD_VALIDATION_CARD_ID,
        metadata: {
          ...(previous.sprint?.metadata || {}),
          currentStatus: closeCard ? 'next_scoping' : 'building_now',
          closeoutKey: KPI_LEAD_VALIDATION_CLOSEOUT_KEY,
          nextAction: closeCard
            ? `Commit/push, then continue ${KPI_LEAD_VALIDATION_NEXT_CARD_ID}.`
            : 'Ship read-only KPI/FUB lead-source validation audit.',
          notNext: KPI_LEAD_VALIDATION_NOT_NEXT_BOUNDARIES,
        },
      },
      items,
    },
    ACTOR,
    {
      apply: true,
      allowItemReplacement: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      reason: 'Steve approved unattended Foundation execution; build KPI lead-source validation audit and continue next safe card.',
    },
  )
}

async function main() {
  const args = parseArgs()
  const checks = []
  const planSource = await readRepoFile(KPI_LEAD_VALIDATION_PLAN_PATH)
  const planReview = evaluatePlanCriticPlan({
    planText: planSource,
    card: buildCardRow({ closeCard: args.closeCard }),
    changedFiles: KPI_LEAD_VALIDATION_CHANGED_FILES,
    declaredRisk: 'KPI/FUB lead validation can drift into source writes, person-level tracked reports, appointment quality, Shopping List discipline, or broad KPI rebuild.',
    repoRoot,
  })
```

### P1 lib/kpi-lead-validation-audit.js

- Lines: 469
- Bytes: 19441
- Reasons: changed_since_baseline, source_health_surface

```
import { listFubLeadSourceRules } from './foundation-db.js'
import { getKpiCredential, loadKpiLocalEnv, normalizeKpiSupabaseUrl } from './kpi-health.js'

export const KPI_LEAD_VALIDATION_CARD_ID = 'KPI-LEAD-VALIDATION-001'
export const KPI_LEAD_VALIDATION_CLOSEOUT_KEY = 'kpi-lead-validation-v1'
export const KPI_LEAD_VALIDATION_PLAN_PATH = 'docs/process/kpi-lead-validation-001-plan.md'
export const KPI_LEAD_VALIDATION_APPROVAL_PATH = 'docs/process/approvals/KPI-LEAD-VALIDATION-001.json'
export const KPI_LEAD_VALIDATION_SCRIPT_PATH = 'scripts/process-kpi-lead-validation-check.mjs'
export const KPI_LEAD_VALIDATION_CLOSEOUT_PATH = 'docs/handoffs/2026-05-20-kpi-lead-validation-closeout.md'
export const KPI_LEAD_VALIDATION_NEXT_CARD_ID = 'INTEL-THREAD-CONTEXT-001'
export const KPI_LEAD_VALIDATION_SPRINT_ID = 'FOUNDATION-TRUSTED-LOOP-AND-SAFE-SURFACES-2026-05-20'
export const KPI_LEAD_VALIDATION_SOURCE_ID = 'SRC-SUPABASE-001'
export const KPI_LEAD_VALIDATION_FUB_SOURCE_ID = 'SRC-FUB-001'
export const KPI_LEAD_VALIDATION_PAGE_SIZE = 1000
export const KPI_LEAD_VALIDATION_UNCLAIMED_POND_USER_ID = 22

export const KPI_LEAD_VALIDATION_CHANGED_FILES = [
  'lib/kpi-lead-validation-audit.js',
  'scripts/process-kpi-lead-validation-check.mjs',
  'package.json',
  'docs/process/kpi-lead-validation-001-plan.md',
  'docs/process/approvals/KPI-LEAD-VALIDATION-001.json',
  'docs/handoffs/2026-05-20-kpi-lead-validation-closeout.md',
  'lib/foundation-build-closeout-process-gate-records.js',
  'lib/foundation-verify-coverage-card-ids.js',
]

export const KPI_LEAD_VALIDATION_PROOF_COMMANDS = [
  'node --check lib/kpi-lead-validation-audit.js scripts/process-kpi-lead-validation-check.mjs',
  'npm run process:kpi-lead-validation-check -- --close-card --json',
  'npm run process:system-health-nightly-audit-check -- --json',
  'npm run process:build-lane-repeated-failure-action-gate-check -- --json',
  'npm run backlog:hygiene -- --json',
  'npm run foundation:verify -- --json-summary',
  'npm run process:ship-check -- --card=KPI-LEAD-VALIDATION-001 --planApprovalRef=docs/process/approvals/KPI-LEAD-VALIDATION-001.json --closeoutKey=kpi-lead-validation-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify',
  'npm run process:fanout-check -- --card=KPI-LEAD-VALIDATION-001 --closeoutKey=kpi-lead-validation-v1',
  'npm run process:foundation-
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

### P3 lib/foundation-jobs.js

- Lines: 1414
- Bytes: 60676
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

- P1 active-vs-historical-verifier-mixing: Verifier mixes active sprint assertions with historical closeout proof -> ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001
- P1 foundation-hub-route-monolith: Foundation Hub route builds many domains in one handler -> FOUNDATION-HUB-PAYLOAD-EXTRACT-001
- P1 hardcoded-foundation-ui-current-summary: Foundation UI embeds current-state summary truth -> FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001
- P1 hardcoded-source-count-baseline: Source contract count is encoded as an exact baseline -> SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001
- P1 hardcoded-source-count-baseline: Source contract count is encoded as an exact baseline -> SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001
- P2 focused-check-active-sprint-id-assumption: Focused checks assert exact dated active sprint IDs -> SPRINT-CHECK-HISTORICAL-MODE-001
- P2 foundation-dom-rebuild-risk: Foundation frontend has heavy DOM rebuild signals -> FOUNDATION-FRONTEND-DOM-BUDGET-001

## Doc / Report Artifact Bloat

- Status: `healthy`
- Handoff files: 156
- Handoff hot lines: 9815
- Nightly artifacts: 7
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
Generated at: `2026-05-20T07:00:34.819Z`

## Morning Read

- Status: `report_ready`
- Findings: 7 total (0 P0, 5 P1, 2 P2, 0 P3)
- Proposed backlog fixes: 6
- Detection mode: deterministic code first; no LLM detection used.
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev, no feature work.
- Synthetic proof: passed (hardcoded=2, mutator=1, slowEndpoint=risk)

## Endpoint Coverage

- /api/foundation-hub: status=200 latency=101ms payload=511825B risk=healthy (Within V1 audit budget.)
- /api/source-of-truth: status=200 latency=21ms payload=192646B risk=healthy (Within V1 audit budget.)
- /api/foundation/source-lifecycle: status=200 latency=375ms payload=637861B risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: status=200 latency=250ms payload=286801B risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: status=200 latency=26ms payload=33222B risk=healthy (Within V1 audit budget.)

## Asset And Monolith Metrics

Assets:
- public/foundation.html: 8181B raw, 1727B gzip, 119 lines
- public/styles.css: 593B raw, 286B gzip, 14 lines
- public/foundation-nav-config.js: 8407B raw, 2349B gzip, 175 lines
- public/foundation-data.js: 14835B raw, 3028B gzip, 482 lines
- public/foundation-doc-markdown-renderers.js: 37237B raw, 7462B gzip, 1212 lines
- public/foundation.js: 113633B raw, 22327B gzip, 2998 lines
- public/foundation-backlog-renderers.js: 12173B raw, 2904B gzip, 303 lines
- public/foundation-action-route-review-inbox-renderers.js: 9997B raw, 2767B gzip, 234 lines
- public/foundation-source-registry-renderers.js: 60541B raw, 11908B gzip, 1537 lines
- public/foundation-fub-lead-source-renderers.js: 27456B raw, 5884B gzip, 678 lines
- public/foundation-system-inventory-renderers.js: 65366B raw, 12729B gzip, 1696 lines
- public/foundation-current-state-renderers.js: 45147B raw, 9808B gzip, 1172 lines
- public/foundation-decision-question-renderers.js: 52409B raw, 9280B gzip, 1443 lines
- public/foundation-source-lifecycle-renderers.js: 65313B raw, 9812B gzip, 1498 lines
- public/foundation-runtime-renderers.js: 82614B raw, 17844B gzip, 1975 lines
- public/foundation-operations-renderers.js: 52777B raw, 11195B gzip, 1252 lines
- public/foundation-home-renderers.js: 5330B raw, 1775B gzip, 128 lines
- public/foundation-strategy-renderers.js: 25646B raw, 5784B gzip, 787 lines
- public/foundation-router.js: 5394B raw, 1544B gzip, 196 lines

DOM budget:
- status=review, scripts=17, createElement=1708, appendChild=2190, innerHTML=73

Largest files:
- scripts/foundation-verify.mjs: 4973 LOC, 275775B
- public/foundation.js: 2998 LOC, 113633B
- lib/foundation-build-closeout-process-gate-records.js: 2875 LOC, 203989B
- lib/foundation-db-schema-seed-store.js: 2653 LOC, 137639B
- lib/foundation-build-closeout-tightening-records.js: 2599 LOC, 226069B
- lib/foundation-source-crawl-store.js: 2506 LOC, 111553B
- lib/foundation-build-closeout-overnight-records.js: 2446 LOC, 192241B
- lib/foundation-db.js: 2261 LOC, 90410B

## Top Findings

### P1 Verifier mixes active sprint assertions with historical closeout proof
- Card lane: `VERIFIER-ASSUMPTION-REGISTRY-001`
- Type: `drift_risk`
- Evidence: `scripts/foundation-verify.mjs:3073` (historicalCardHasVerifiedCloseout), `scripts/foundation-verify.mjs:3097` (activeSprintAtOrPast), `scripts/foundation-verify.mjs:3103` (historicalCardHasVerifiedCloseout), `scripts/foundation-verify.mjs:4143` (historicalCardHasVerifiedCloseout), `scripts/foundation-verify.mjs:4348` (activeSprintAtOrPast), `scripts/foundation-verify.mjs:4429` (activeSprintAtOrPast)
- Why it matters: A current-sprint advancement assertion can pass from a historical closeout unless active and historical helpers are separate.
- Proposed owner/card: Foundation Verifier / `ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001`
- Detector: active versus historical helper detector

### P1 Foundation Hub route builds many domains in one handler
- Card lane: `FOUNDATION-MONOLITH-RISK-AUDIT-001`
- Type: `refactor_candidate`
- Evidence: `server.js`
- Why it matters: Large mixed-responsibility surfaces slow audits, increase merge risk, and make future proof harder to isolate.
- Proposed owner/card: Foundation Engineering / `FOUNDATION-HUB-PAYLOAD-EXTRACT-001`
- Detector: largest file/function ownership detector
- False-positive note: This is not approval to refactor during the audit sprint.

### P1 Foundation UI embeds current-state summary truth
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-extract-current-check.mjs:363`
- Why it matters: Static UI copy can report stale health, source, or KPI counts after APIs change.
- Proposed owner/card: Foundation UI / `FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001`
- Detector: currentSummary/static-live-copy detector
- False-positive note: Static maturity explainers are acceptable; live checkpoint wording is not.

### P1 Source contract count is encoded as an exact baseline
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `lib/foundation-current-sprint.js:920`
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

### P2 Focused checks assert exact dated active sprint IDs
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `lib/foundation-current-sprint.js:107` (const FOUNDATION_CURRENT_SPRINT_ID = 'foundation-current-2026-05-12), `lib/foundation-current-sprint.js:149` (const FOUNDATION_SOURCE_ONCE_OVER_SPRINT_ID = 'foundation-source-once-over-2026-05-12), `lib/foundation-current-sprint-store.js:5` (const FOUNDATION_DB_STORE_SPLIT_SPRINT_ID = 'foundation-db-store-split-2026-05-14), `lib/code-quality-nightly-audit.js:38` (const CODE_QUALITY_NIGHTLY_AUDIT_SPRINT_ID = 'foundation-code-quality-nightly-audit-2026-05-13), `lib/code-quality-nightly-audit.js:968` (const SPRINT_ID = 'control-plane-connector-readiness-2026-05-12), `lib/code-quality-nightly-audit.js:974` (const SPRINT_ID = 'control-plane-connector-readiness-2026-05-12)
- Why it matters: One-time closeout checks are unsafe as nightly checks after rollover if they hard-fail on the current active sprint.
- Proposed owner/card: Foundation Process / `SPRINT-CHECK-HISTORICAL-MODE-001`
- Detector: dated active-sprint assertion detector
- False-positive note: Active live-truth literals still fail as P0; dated card/sprint metadata is a review finding unless a focused proof hard-fails after rollover.

### P2 Foundation frontend has heavy DOM rebuild signals
- Card lane: `FOUNDATION-FRONTEND-PERF-AUDIT-001`
- Type: `performance_risk`
- Evidence: `public/foundation.html:103`, `public/foundation.html:1` (Foundation frontend scripts call document.createElement 1708 times, above the 1200 aggregate review budget. Foundation frontend scripts call appendChild 2190 times, above the 1800 aggregate review budget. Foundation frontend scripts use innerHTML 73 times, above the 50 aggregate review budget.)
- Why it matters: Backlog, source, current-state, and runtime filters can churn large DOM trees on each interaction as card/source counts grow.
- Proposed owner/card: Foundation Frontend / `FOUNDATION-FRONTEND-DOM-BUDGET-001`
- Detector: DOM budget snapshot status=review createElement=1708 appendChild=2190 innerHTML=73

## Findings By Sprint Card

- `CODEBASE-HARDCODE-AUDIT-001`: 4 findings
- `FOUNDATION-API-PERF-AUDIT-001`: 0 findings
- `FOUNDATION-FRONTEND-PERF-AUDIT-001`: 1 finding
- `FOUNDATION-MONOLITH-RISK-AUDIT-001`: 1 finding
- `VERIFIER-ASSUMPTION-REGISTRY-001`: 1 finding
- `SPRINT-STATE-MUTATION-AUDIT-001`: 0 findings
- `NIGHTLY-AUDIT-REPORT-001`: 0 findings

## Proposed Backlog Fixes

- `ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001`
- `FOUNDATION-HUB-PAYLOAD-EXTRACT-001`
- `FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001`
- `SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001`
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

