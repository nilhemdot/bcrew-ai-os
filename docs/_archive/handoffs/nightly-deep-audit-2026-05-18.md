# Nightly Deep Audit Report - 2026-05-18

Closeout key: `nightly-deep-audit-upgrade-v1`
Generated at: `2026-05-18T07:00:31.843Z`
Report path: `docs/handoffs/nightly-deep-audit-2026-05-18.md`

## Morning Read

- Status: `report_ready`
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev.
- Deterministic findings: 90 total (76 P0, 7 P1, 7 P2, 0 P3)
- Changed files selected: 4
- High-risk review targets: 18
- LLM review mode: `approved_route_available_for_bounded_review`
- Dogfood against May 13 failures: passed
- Doc/report artifact bloat: `watch` (0 red, 2 yellow)

## Diff Summary

- Previous report: `docs/handoffs/nightly-deep-audit-2026-05-17.json`
- New findings: 0
- Still open: 17
- Resolved: 0
- Finding delta: 0

## LLM Review Boundary

- Executed this run: no
- Selected route: `foundation-synthesis-openclaw-chatgpt`
- Provider/model: `openclaw / openai-codex/gpt-5.4`
- Route blocker: none
- Note: An approved route is available; V1 still records packets by default unless an explicit live LLM review mode is enabled.

## Endpoint And Payload Trend

- /api/foundation-hub: 97ms, 475082B, risk=healthy (Within V1 audit budget.)
- /api/source-of-truth: 16ms, 146916B, risk=healthy (Within V1 audit budget.)
- /api/foundation/source-lifecycle: 374ms, 684970B, risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: 90ms, 386372B, risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: 21ms, 31638B, risk=healthy (Within V1 audit budget.)

## Largest Files

- scripts/foundation-verify.mjs: 4974 LOC, 275299B
- lib/foundation-build-closeout-overnight-records.js: 4934 LOC, 398462B
- lib/foundation-db.js: 4742 LOC, 215692B
- lib/foundation-backlog-seed.js: 4652 LOC, 477958B
- lib/foundation-build-closeout-records.js: 4334 LOC, 297869B
- server.js: 3884 LOC, 135264B
- public/foundation.js: 2998 LOC, 113609B
- public/styles-foundation-workflows.css: 2591 LOC, 50351B
- lib/foundation-source-crawl-store.js: 2491 LOC, 110816B
- lib/foundation-build-closeout-tightening-records.js: 2489 LOC, 214292B

## High-Risk Review Packets

### P0 scripts/foundation-verify.mjs

- Lines: 4974
- Bytes: 275299
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
import {
  buildProcessCheckApplyBoundaryDogfoodProof,
} from '../lib/process-write-guard.js'
import {
  PROCESS_CHECK_READONLY_MODE_CARD_ID,
  PROCESS_CHECK_READONLY_MODE_CLOSEOUT_KEY,
  PROCESS_CHECK_READONLY_MODE_SCRIPT_PATH,
```

### P1 lib/foundation-build-closeout-overnight-records.js

- Lines: 4934
- Bytes: 398462
- Reasons: over_3k_warn

```
      'FRONTEND-FUB-LEAD-SOURCE-RENDERERS-SPLIT-001',
      'FRONTEND-SYSTEM-INVENTORY-RENDERERS-SPLIT-001',
      'FRONTEND-MONOLITH-SPLIT-001',
    ],
    systemArea: 'Foundation frontend monolith cleanup / Current State renderer module',
    status: 'accepted',
    acceptanceState: 'Verified',
    whatChanged: 'Extracted the Foundation Overview / Current State renderer cluster from `public/foundation.js` into `public/foundation-current-state-renderers.js`.',
    whatItDoes: '`public/foundation-current-state-renderers.js` now owns Current State source links/stamps, backlog cells, closeout boards, maturity level guide, package detail tables, surface tables, Foundation truth/execution panels, Owners review queue panel, and `renderCurrentState()` while `foundation-router.js` keeps the same route call.',
    whyItMatters: 'Steve keeps the Overview page that answers what is closed, partial, open, and next while the frontend monolith keeps shrinking through bounded, behavior-proven seams.',
    whereItLives: [
      'public/foundation-current-state-renderers.js Current State renderer module',
      'public/foundation.js remaining Foundation route/renderers monolith',
      'public/foundation.html ordered script loading',
      'lib/foundation-frontend-current-state-renderers-split.js split constants and dogfood helpers',
      'scripts/process-frontend-current-state-renderers-split-check.mjs VM-backed focused proof',
      'package.json process:frontend-current-state-renderers-split-check',
      'scripts/foundation-verify.mjs verifier coverage',
      'split frontend source readers in lib/ and scripts/process-foundation-sprint-*.mjs',
      'docs/process/frontend-current-state-renderers-split-001-plan.md',
      'docs/process/approvals/FRONTEND-CURRENT-STATE-RENDERERS-SPLIT-001.json',
      'docs/handoffs/2026-05-15-frontend-current-state-renderers-split-closeout.md',
    ],
    proofCommands: [
      'node --check public/foundation-nav-config.js public/foundation-data.js public/foundation.js public/foundation-source-registry-renderers.js public/foundation-fub-lead-source-renderers.js public/foundation-system-inventory-renderers.js public/foundation-current-state-renderers.js public/foundation-source-lifecycle-renderers.js public/foundation-runtime-renderers.js public/foundation-operations-renderers.js public/foundation-router.js scripts/process-frontend-curren
```

### P1 lib/foundation-db.js

- Lines: 4742
- Bytes: 215692
- Reasons: over_3k_warn, live_truth_write_boundary

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

### P1 lib/foundation-backlog-seed.js

- Lines: 4652
- Bytes: 477958
- Reasons: over_3k_warn

```
export const backlogSeed = [
  {
    id: 'FOUNDATION-001',
    title: 'Close the Foundation strategy layer against signed-off sources',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 1,
    source: 'Foundation review',
    summary: 'Home, Strategy Packet, System Strategy, Freedom current-reality inputs, Owners Admin meaning, Owners Lists current-reality boundary, and Finance current-reality boundary are aligned to signed-off source truth for this phase.',
    whyItMatters: 'The strategy layer should not keep reopening because old backlog text says source sign-off is missing after the source contracts and verifier prove the current input boundary is closed.',
    nextAction: 'No active strategy-layer source closeout remains. Route later work to the separate hardening cards for Freedom drift monitoring, source-backed value hardening, decision provenance, temporal history, FUB/KPI parity, and Strategy Hub.',
    statusNote: 'Closed on 2026-04-25 for the current strategy-input boundary. This is not a Foundation-wide completion claim.',
  },
  {
    id: 'FOUNDATION-002',
    title: 'Close out the Admin-tab sign-off and route remaining follow-on work to the right cards',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 2,
    source: 'Foundation reset audit + Owners Dashboard handoff',
    summary: 'The `ADMIN ONLY - Deal Data Entry` sign-off is complete. This card now exists to preserve that closure and make sure the remaining Owners Dashboard follow-on work stays attached to the right downstream cards instead of keeping a false "source sign-off still open" story alive.',
    whyItMatters: 'If the backlog keeps claiming the Admin-tab sign-off is unfinished after the source layer marks it signed off, Foundation starts violating its own truth model.',
    nextAction: 'Treat SRC-OWNERS-001, SRC-FUB-001 Owners/Admin parity, and SRC-FINANCE-001 current-reality meaning as closed for v1. Route remaining Owners data cleanup through Ops findings instead of reopening source sign-off.',
    statusNote: 'Closed on 2026-04-16. This card should stay as a closeout record, not an active blocker.',
  },
  {
    id: 'SECURITY-001',
    title: 'Rotate exposed MCP secrets and move local connector config to a safe pattern',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 3,
    source: 'Foundation reset audit',
```

### P1 lib/foundation-build-closeout-records.js

- Lines: 4334
- Bytes: 297869
- Reasons: over_3k_warn

```
import { actionRouteCloseoutRecords } from './foundation-build-closeout-action-route-records.js'
import { cleanupCloseoutRecords } from './foundation-build-closeout-cleanup-records.js'
import { controlPlaneCloseoutRecords } from './foundation-build-closeout-control-plane-records.js'
import { overnightCloseoutRecords } from './foundation-build-closeout-overnight-records.js'
import { sizeCloseoutRecords } from './foundation-build-closeout-size-records.js'
import { sourceCloseoutRecords } from './foundation-build-closeout-source-records.js'
import { verifierTighteningCloseoutRecords } from './foundation-build-closeout-tightening-records.js'

export const FOUNDATION_BUILD_CLOSEOUT_SCHEMA_VERSION = 2

export const closeoutRecords = [
  ...actionRouteCloseoutRecords,
  ...cleanupCloseoutRecords,
  ...verifierTighteningCloseoutRecords,
  ...sizeCloseoutRecords,
  ...overnightCloseoutRecords,
  ...controlPlaneCloseoutRecords,
  ...sourceCloseoutRecords,
  {
    key: 'foundation-ui-complete-v1',
    backlogIds: ['FOUNDATION-UI-COMPLETE-001'],
    match: {
      subjectIncludes: ['FOUNDATION-UI-COMPLETE-001'],
    },
    mentionedBacklogIds: [
      'SOURCE-MATURITY-GRID-001',
      'SOURCE-EXTRACTION-COVERAGE-001',
      'SOURCE-COVERAGE-CLOSEOUT-001',
      'MARKETING-SOURCE-MAP-001',
      'BRAND-STACK-001',
      'TIER-BEHAVIORAL-COMPLETION-001',
      'VERIFICATION-RUNS-001',
      'PER-USER-CHANGELOG-001',
      'DECISION-RESTRICTED-QUEUE-001',
      'REPLY-WATCHING-LOOP-001',
    ],
    systemArea: 'Foundation source depth UI',
    status: 'accepted',
    acceptanceState: 'Verified',
    whatChanged: 'Added the Foundation 30-second read to the Source Lifecycle page and closed the final Source Once-Over sprint card.',
    whatItDoes: 'Aggregates the existing source maturity, extraction coverage, source closeout, marketing source map, brand stack, tier behavior, verification runs, per-user changelog, restricted decision queue, and Current Sprint snapshots into one scan-friendly Foundation depth summary.',
    whyItMatters: 'Steve should be able to see Foundation depth and remaining gaps without asking for another outside audit. This closes the Source Once-Over sprint as a visibility and proof pass, not a product expansion.',
    whereItLives: [
      'lib/foundation-ui-complete.js',
      '/api/foundation/source-lifecycle foundationUiComplete',
      '/api/founda
```

### P1 server.js

- Lines: 3884
- Bytes: 135264
- Reasons: over_3k_warn, hot_route_surface

```
    sendApiError(res, error.statusCode || 403, error.code || 'access_denied', error.message, error.details)
    return
  }

  sendApiError(res, 403, 'access_denied', error instanceof Error ? error.message : 'Access denied.')
}

function cacheHeadersNoStore(res) {
  res.setHeader('Cache-Control', 'no-store')
}

const SALES_HUB_CACHE_TTL_MS = Math.max(15, Number(process.env.SALES_HUB_CACHE_TTL_SECONDS || 120)) * 1000
let salesHubCache = {
  payload: null,
  createdAtMs: 0,
  pending: null,
}

function clearSalesHubCache() {
  salesHubCache = {
    payload: null,
    createdAtMs: 0,
    pending: null,
  }
}

async function buildSalesHubPayload() {
  const listingInventory = await buildSalesListingInventory()
  const caseSync = await syncSalesListingCasesFromInventory(listingInventory, {
    actor: 'sales-hub-refresh',
  })
  return {
    status: 'healthy',
    hub: 'sales',
    listingInventory,
    caseSync,
    meta: {
      generatedAt: new Date().toISOString(),
      sourceId: listingInventory.source.sourceId,
      sourceListId: listingInventory.source.listId,
      sourceViewId: listingInventory.source.viewId,
    },
  }
}

async function getSalesHubPayload({ forceRefresh = false } = {}) {
  const now = Date.now()
  const ageMs = salesHubCache.payload ? now - salesHubCache.createdAtMs : null
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

### P1 lib/foundation-build-closeout-source-records.js

- Lines: 919
- Bytes: 76748
- Reasons: changed_since_baseline, source_health_surface

```
export const sourceCloseoutRecords = [
  {
    key: 'source-maturity-freedom-bhag-atom-flow-repair-v1',
    backlogIds: ['SOURCE-MATURITY-FREEDOM-BHAG-ATOM-FLOW-REPAIR-001'],
    match: {
      subjectIncludes: [
        'SOURCE-MATURITY-FREEDOM-BHAG-ATOM-FLOW-REPAIR-001',
        'source maturity Freedom BHAG atom-flow repair',
        'Repair Freedom BHAG source maturity atom-flow gap',
        'Freedom BHAG atom-flow repair',
        'source-maturity-freedom-bhag-atom-flow-repair-v1',
        'SRC-FREEDOM-BHAG-001',
      ],
    },
    operatorCloseout: true,
    mentionedBacklogIds: [
      'SOURCE-MATURITY-GAP-FOLLOWUP-001',
      'SOURCE-MATURITY-ATOM-FLOW-REPAIR-001',
      'SOURCE-MATURITY-ROUTING-GAP-REPAIR-001',
    ],
    systemArea: 'Foundation source readiness',
    status: 'accepted',
    acceptanceState: 'Verified',
    whatChanged: 'Promoted one source-backed Freedom BHAG atom and supporting atom hit from an existing active source fact.',
    whatItDoes: 'Uses the existing SRC-FREEDOM-BHAG-001 source fact for the 2026 community agent target path to create a governed atom-flow signal without extraction, model calls, Sheets reads/writes, or external writes.',
    whyItMatters: 'Foundation can advance source maturity for the BHAG source from existing governed facts while keeping synthesis, routing, and apply as separate proof lanes.',
    whereItLives: [
      'lib/source-maturity-freedom-bhag-atom-flow-repair.js Freedom BHAG-focused repair contract and dogfood proof',
      'scripts/process-source-maturity-freedom-bhag-atom-flow-repair-check.mjs focused proof and Current Sprint progression',
      'intelligence_atoms source-maturity-freedom-bhag-atom-flow-repair-v1 atom',
      'intelligence_atom_hits source-maturity-freedom-bhag-atom-flow-repair-v1 supporting hit',
      'docs/process/source-maturity-freedom-bhag-atom-flow-repair-001-plan.md',
      'docs/process/approvals/SOURCE-MATURITY-FREEDOM-BHAG-ATOM-FLOW-REPAIR-001.json',
      'docs/handoffs/2026-05-18-source-maturity-freedom-bhag-atom-flow-repair-closeout.md',
      'lib/foundation-verify-coverage-card-ids.js done-card coverage',
    ],
    proofCommands: [
      'node --check lib/source-maturity-freedom-bhag-atom-flow-repair.js scripts/process-source-maturity-freedom-bhag-atom-flow-repair-check.mjs',
      'npm run process:source-maturity-freedom-bhag-atom-flow-repair-check -- --appl
```

### P1 scripts/process-source-maturity-missive-routing-gap-repair-check.mjs

- Lines: 846
- Bytes: 38611
- Reasons: process_check_surface, source_health_surface

```
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_SCRIPT_PATH,
    operation: 'create/update Missive source maturity routing repair backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  const upsert = await upsertLiveCardAndPlanCritic({ closeCard, stage: normalizedStage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_SPRINT_ID,
        status: 'active',
        goal: 'Repair the Missive source maturity routed-stage gap with an approval-required internal action route.',
        activeBlockerCardId: closeCard ? null : SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizedStage,
          startedBy: 'codex-source-maturity-missive-routing-gap-repair',
          currentStatus: closeCard ? 'complete' : normalizedStage,
          closeoutKey: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Commit/push, then continue the next safe Foundation-up card from repo truth.'
            : 'Create a pending approval-required route from existing source-backed Missive evidence only.',
          priorityOrder: [SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_CARD_ID],
          notNext: SOURCE_MATURITY_MISSIVE_ROUTING_GAP_REPAIR_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'SRC-MISSIVE-001 receives a pending internal action route backed by fact, atom, and chunk refs.',
            'No route is applied and no destination record is created.',
            'Source maturity no longer blocks at routed for SRC-MISSIVE-001.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage: normalizedStage })],
    },
    'codex-source-maturity-missive-routing-gap-repair',
    {
      apply: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      replaceItems: true,
      allowItemReplacement: true,
      reason: closeCard
        ? 'Close Miss
```

### P1 scripts/process-source-maturity-routing-gap-repair-check.mjs

- Lines: 836
- Bytes: 36784
- Reasons: process_check_surface, source_health_surface

```
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SOURCE_MATURITY_ROUTING_GAP_REPAIR_SCRIPT_PATH,
    operation: 'create/update source maturity routing repair backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  const upsert = await upsertLiveCardAndPlanCritic({ closeCard, stage: normalizedStage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SOURCE_MATURITY_ROUTING_GAP_REPAIR_SPRINT_ID,
        status: 'active',
        goal: 'Repair a source maturity routed-stage gap with an approval-required internal action route.',
        activeBlockerCardId: closeCard ? null : SOURCE_MATURITY_ROUTING_GAP_REPAIR_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizedStage,
          startedBy: 'codex-source-maturity-routing-gap-repair',
          currentStatus: closeCard ? 'complete' : normalizedStage,
          closeoutKey: SOURCE_MATURITY_ROUTING_GAP_REPAIR_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Commit/push, then continue the next safe Foundation-up card from repo truth.'
            : 'Create a pending approval-required route from existing source-backed Slack evidence only.',
          priorityOrder: [SOURCE_MATURITY_ROUTING_GAP_REPAIR_CARD_ID],
          notNext: SOURCE_MATURITY_ROUTING_GAP_REPAIR_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'SRC-SLACK-001 receives a pending internal action route backed by fact, atom, and chunk refs.',
            'No route is applied and no destination record is created.',
            'Source maturity no longer blocks at routed for SRC-SLACK-001.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage: normalizedStage })],
    },
    'codex-source-maturity-routing-gap-repair',
    {
      apply: true,
      expectedPreviousActiveSprintId: previous?.sprint?.sprintId || null,
      replaceItems: true,
      allowItemReplacement: true,
      reason: closeCard
        ? 'Close source maturity routing gap repair sprint item after focused proof.'
        : 'Start source
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

### P1 scripts/process-repair-verifier-sprint-check.mjs

- Lines: 677
- Bytes: 33008
- Reasons: process_check_surface

```
    const value = existingWorkCheck[field]
    return Array.isArray(value) ? value.length === 0 : !value
  })
}

async function openFormalSprint() {
  await initFoundationDb()
  for (const card of CARD_PLANS) {
    await updateBacklogItem(card.cardId, {
      lane: 'scoped',
      nextAction: `Scoped under ${PROCESS_SPRINT_ID}. Run Plan Critic and stage progression before build.`,
      statusNote: `Scoped on 2026-05-12 under ${PROCESS_SPRINT_ID}. This repair sprint was opened after Steve caught that the previous repair had started before formal sprint process. Plan ref: ${card.planRef}.`,
    }, 'codex')
  }
  await upsertFoundationCurrentSprintOverlay(buildProcessSprintSeed(
    Object.fromEntries(CARD_PLANS.map(card => [card.cardId, 'scoping'])),
    {
      currentStatus: 'scoping_process_repair_verifier_independence',
      nextAction: 'Score all four plans with Plan Critic before build starts.',
      stageProgression: 'scoping',
    },
  ), 'codex')

  const planResults = await evaluateAndLogPlans()

  await upsertFoundationCurrentSprintOverlay(buildProcessSprintSeed(
    Object.fromEntries(CARD_PLANS.map(card => [card.cardId, 'sprint_ready'])),
    {
      currentStatus: 'sprint_ready_process_repair_verifier_independence',
      nextAction: 'Move SPRINT-PROCESS-REPAIR-001 to Building Now and repair records under that card.',
      stageProgression: 'sprint_ready',
    },
  ), 'codex')

  await updateBacklogItem('SPRINT-PROCESS-REPAIR-001', {
    lane: 'executing',
    nextAction: 'Building now. Repair the six Connector/Routing sprint doctrine records without fake stage history, then move active blocker to VERIFIER-SPRINT-INDEPENDENCE-001.',
    statusNote: `Building Now on 2026-05-12 under ${PROCESS_SPRINT_ID}. Scoped doctrine exists, Plan Critic pass row is logged, and this card owns the honest after-action repair.`,
  }, 'codex')

  await upsertFoundationCurrentSprintOverlay(buildProcessSprintSeed({
    'SPRINT-PROCESS-REPAIR-001': 'building_now',
    'VERIFIER-SPRINT-INDEPENDENCE-001': 'sprint_ready',
    'VERIFIER-MODULAR-SPLIT-001': 'sprint_ready',
    'PROCESS-ROOT-VS-PATCH-001': 'sprint_ready',
  }, {
    currentStatus: 'sprint_process_repair_building_now',
    nextAction: 'Repair Connector/Routing doctrine records next; do not pull product work.',
```

### P1 scripts/process-source-maturity-owners-routing-gap-repair-check.mjs

- Lines: 597
- Bytes: 30643
- Reasons: changed_since_baseline, process_check_surface, source_health_surface

```
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SOURCE_MATURITY_OWNERS_ROUTING_GAP_REPAIR_SCRIPT_PATH,
    operation: 'create/update Owners Dashboard source maturity routing repair backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  const upsert = await upsertLiveCardAndPlanCritic({ closeCard, stage: normalizedStage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SOURCE_MATURITY_OWNERS_ROUTING_GAP_REPAIR_SPRINT_ID,
        status: 'active',
        goal: 'Repair the Owners Dashboard source maturity routed-stage gap with a bounded retrieval chunk and approval-required internal action route.',
        activeBlockerCardId: closeCard ? null : SOURCE_MATURITY_OWNERS_ROUTING_GAP_REPAIR_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizedStage,
          startedBy: 'codex-source-maturity-owners-routing-gap-repair',
          currentStatus: closeCard ? 'complete' : normalizedStage,
          closeoutKey: SOURCE_MATURITY_OWNERS_ROUTING_GAP_REPAIR_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Commit/push, then continue the next safe Foundation-up card from repo truth.'
            : 'Create the bounded retrieval chunk and pending approval-required route from existing Owners Dashboard evidence only.',
          priorityOrder: [SOURCE_MATURITY_OWNERS_ROUTING_GAP_REPAIR_CARD_ID],
          notNext: SOURCE_MATURITY_OWNERS_ROUTING_GAP_REPAIR_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'SRC-OWNERS-001 receives one active retrieval chunk backed by the existing atom.',
            'SRC-OWNERS-001 receives a pending internal action route backed by fact, atom, and chunk refs.',
            'No route is applied and no destination record is created.',
            'Source maturity no longer blocks at routed for SRC-OWNERS-001.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage: normalizedStage })],
    },
    'codex-source-maturity-owners-routing-gap-repair',
    {
      apply: true,
      expectedPreviousAc
```

### P1 scripts/process-source-maturity-freedom-bhag-routing-gap-repair-check.mjs

- Lines: 597
- Bytes: 31187
- Reasons: process_check_surface, source_health_surface

```
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SOURCE_MATURITY_FREEDOM_BHAG_ROUTING_GAP_REPAIR_SCRIPT_PATH,
    operation: 'create/update Freedom BHAG source maturity routing repair backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  const upsert = await upsertLiveCardAndPlanCritic({ closeCard, stage: normalizedStage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SOURCE_MATURITY_FREEDOM_BHAG_ROUTING_GAP_REPAIR_SPRINT_ID,
        status: 'active',
        goal: 'Repair the Freedom BHAG source maturity routed-stage gap with a bounded retrieval chunk and approval-required internal action route.',
        activeBlockerCardId: closeCard ? null : SOURCE_MATURITY_FREEDOM_BHAG_ROUTING_GAP_REPAIR_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizedStage,
          startedBy: 'codex-source-maturity-freedom-bhag-routing-gap-repair',
          currentStatus: closeCard ? 'complete' : normalizedStage,
          closeoutKey: SOURCE_MATURITY_FREEDOM_BHAG_ROUTING_GAP_REPAIR_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Commit/push, then continue the next safe Foundation-up card from repo truth.'
            : 'Create the bounded retrieval chunk and pending approval-required route from existing Freedom BHAG evidence only.',
          priorityOrder: [SOURCE_MATURITY_FREEDOM_BHAG_ROUTING_GAP_REPAIR_CARD_ID],
          notNext: SOURCE_MATURITY_FREEDOM_BHAG_ROUTING_GAP_REPAIR_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'SRC-FREEDOM-BHAG-001 receives one active retrieval chunk backed by the existing atom.',
            'SRC-FREEDOM-BHAG-001 receives a pending internal action route backed by fact, atom, and chunk refs.',
            'No route is applied and no destination record is created.',
            'Source maturity no longer blocks at routed for SRC-FREEDOM-BHAG-001.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage: normalizedStage })],
    },
    'codex-source-maturity-freedom-bhag-routing-gap-repa
```

### P1 scripts/process-source-maturity-freedom-community-routing-gap-repair-check.mjs

- Lines: 597
- Bytes: 31867
- Reasons: process_check_surface, source_health_surface

```
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SOURCE_MATURITY_FREEDOM_COMMUNITY_ROUTING_GAP_REPAIR_SCRIPT_PATH,
    operation: 'create/update Freedom Community source maturity routing repair backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  const upsert = await upsertLiveCardAndPlanCritic({ closeCard, stage: normalizedStage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SOURCE_MATURITY_FREEDOM_COMMUNITY_ROUTING_GAP_REPAIR_SPRINT_ID,
        status: 'active',
        goal: 'Repair the Freedom Community source maturity routed-stage gap with a bounded retrieval chunk and approval-required internal action route.',
        activeBlockerCardId: closeCard ? null : SOURCE_MATURITY_FREEDOM_COMMUNITY_ROUTING_GAP_REPAIR_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizedStage,
          startedBy: 'codex-source-maturity-freedom-community-routing-gap-repair',
          currentStatus: closeCard ? 'complete' : normalizedStage,
          closeoutKey: SOURCE_MATURITY_FREEDOM_COMMUNITY_ROUTING_GAP_REPAIR_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Commit/push, then continue the next safe Foundation-up card from repo truth.'
            : 'Create the bounded retrieval chunk and pending approval-required route from existing Freedom Community evidence only.',
          priorityOrder: [SOURCE_MATURITY_FREEDOM_COMMUNITY_ROUTING_GAP_REPAIR_CARD_ID],
          notNext: SOURCE_MATURITY_FREEDOM_COMMUNITY_ROUTING_GAP_REPAIR_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'SRC-FREEDOM-COMMUNITY-001 receives one active retrieval chunk backed by the existing atom.',
            'SRC-FREEDOM-COMMUNITY-001 receives a pending internal action route backed by fact, atom, and chunk refs.',
            'No route is applied and no destination record is created.',
            'Source maturity no longer blocks at routed for SRC-FREEDOM-COMMUNITY-001.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage: normalizedStage })]
```

### P1 scripts/process-source-maturity-freedom-engine-routing-gap-repair-check.mjs

- Lines: 597
- Bytes: 31459
- Reasons: process_check_surface, source_health_surface

```
  assertProcessCheckWriteAllowed({
    argv: process.argv.slice(2),
    scriptPath: SOURCE_MATURITY_FREEDOM_ENGINE_ROUTING_GAP_REPAIR_SCRIPT_PATH,
    operation: 'create/update Freedom Engine source maturity routing repair backlog card, Plan Critic row, and Current Sprint overlay',
    allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply, PROCESS_CHECK_WRITE_FLAGS.closeCard, PROCESS_CHECK_WRITE_FLAGS.mutateSprint],
  })
  const previous = await getActiveFoundationCurrentSprint()
  const upsert = await upsertLiveCardAndPlanCritic({ closeCard, stage: normalizedStage })
  await upsertFoundationCurrentSprintOverlay(
    {
      sprint: {
        sprintId: SOURCE_MATURITY_FREEDOM_ENGINE_ROUTING_GAP_REPAIR_SPRINT_ID,
        status: 'active',
        goal: 'Repair the Freedom Engine source maturity routed-stage gap with a bounded retrieval chunk and approval-required internal action route.',
        activeBlockerCardId: closeCard ? null : SOURCE_MATURITY_FREEDOM_ENGINE_ROUTING_GAP_REPAIR_CARD_ID,
        metadata: {
          stage: closeCard ? 'done_this_sprint' : normalizedStage,
          startedBy: 'codex-source-maturity-freedom-engine-routing-gap-repair',
          currentStatus: closeCard ? 'complete' : normalizedStage,
          closeoutKey: SOURCE_MATURITY_FREEDOM_ENGINE_ROUTING_GAP_REPAIR_CLOSEOUT_KEY,
          nextAction: closeCard
            ? 'Commit/push, then continue the next safe Foundation-up card from repo truth.'
            : 'Create the bounded retrieval chunk and pending approval-required route from existing Freedom Engine evidence only.',
          priorityOrder: [SOURCE_MATURITY_FREEDOM_ENGINE_ROUTING_GAP_REPAIR_CARD_ID],
          notNext: SOURCE_MATURITY_FREEDOM_ENGINE_ROUTING_GAP_REPAIR_NOT_NEXT_BOUNDARIES,
          exitCriteria: [
            'SRC-FREEDOM-ENGINE-001 receives one active retrieval chunk backed by the existing atom.',
            'SRC-FREEDOM-ENGINE-001 receives a pending internal action route backed by fact, atom, and chunk refs.',
            'No route is applied and no destination record is created.',
            'Source maturity no longer blocks at routed for SRC-FREEDOM-ENGINE-001.',
            'Focused proof, backlog hygiene, foundation:verify, and process:foundation-ship pass.',
          ],
        },
      },
      items: [buildSprintItem({ closeCard, stage: normalizedStage })],
    },
    'codex-source-maturity-fre
```

## Top Deterministic Findings

- P0 focused-check-active-sprint-id-assumption: Focused checks assert exact dated active sprint IDs -> SPRINT-CHECK-HISTORICAL-MODE-001
- P0 foundation-db-schema-seed-store-monolith: Foundation DB mixes schema, seed, stores, and query APIs -> FOUNDATION-DB-SCHEMA-SEED-SPLIT-001
- P0 foundation-verify-monolith: Foundation verifier is one large execution surface -> FOUNDATION-VERIFY-REGISTRY-SPLIT-001
- P0 process-check-side-effect-risk: Process/check path contains write side effects -> PROCESS-CHECK-READONLY-MODE-001
- P0 process-check-side-effect-risk: Process/check path contains write side effects -> PROCESS-CHECK-READONLY-MODE-001
- P0 process-check-side-effect-risk: Process/check path contains write side effects -> PROCESS-CHECK-READONLY-MODE-001
- P0 process-check-side-effect-risk: Process/check path contains write side effects -> PROCESS-CHECK-READONLY-MODE-001
- P0 process-check-side-effect-risk: Process/check path contains write side effects -> PROCESS-CHECK-READONLY-MODE-001
- P0 process-check-side-effect-risk: Process/check path contains write side effects -> PROCESS-CHECK-READONLY-MODE-001
- P0 process-check-side-effect-risk: Process/check path contains write side effects -> PROCESS-CHECK-READONLY-MODE-001
- P0 process-check-side-effect-risk: Process/check path contains write side effects -> PROCESS-CHECK-READONLY-MODE-001
- P0 process-check-side-effect-risk: Process/check path contains write side effects -> PROCESS-CHECK-READONLY-MODE-001
- P0 process-check-side-effect-risk: Process/check path contains write side effects -> PROCESS-CHECK-READONLY-MODE-001
- P0 process-check-side-effect-risk: Process/check path contains write side effects -> PROCESS-CHECK-READONLY-MODE-001
- P0 process-check-side-effect-risk: Process/check path contains write side effects -> PROCESS-CHECK-READONLY-MODE-001
- P0 process-check-side-effect-risk: Process/check path contains write side effects -> PROCESS-CHECK-READONLY-MODE-001
- P0 process-check-side-effect-risk: Process/check path contains write side effects -> PROCESS-CHECK-READONLY-MODE-001
- P0 process-check-side-effect-risk: Process/check path contains write side effects -> PROCESS-CHECK-READONLY-MODE-001

## Doc / Report Artifact Bloat

- Status: `watch`
- Handoff files: 262
- Handoff hot lines: 22187
- Nightly artifacts: 10
- Red/yellow findings: 0/2

- P1 docs/handoffs is growing past the hot-doc budget: docs/handoffs contains 22187 line(s); budget is 20000/35000 warn/risk.
- P1 docs/handoffs is accumulating too many hot files: docs/handoffs has 261 file(s) modified in the last 31 days; budget is 220/320.

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
Generated at: `2026-05-18T07:00:32.400Z`

## Morning Read

- Status: `report_ready`
- Findings: 90 total (76 P0, 7 P1, 7 P2, 0 P3)
- Proposed backlog fixes: 17
- Detection mode: deterministic code first; no LLM detection used.
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev, no feature work.
- Synthetic proof: passed (hardcoded=2, mutator=1, slowEndpoint=risk)

## Endpoint Coverage

- /api/foundation-hub: status=200 latency=97ms payload=475082B risk=healthy (Within V1 audit budget.)
- /api/source-of-truth: status=200 latency=16ms payload=146916B risk=healthy (Within V1 audit budget.)
- /api/foundation/source-lifecycle: status=200 latency=374ms payload=684970B risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: status=200 latency=90ms payload=386372B risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: status=200 latency=21ms payload=31638B risk=healthy (Within V1 audit budget.)

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
- scripts/foundation-verify.mjs: 4974 LOC, 275299B
- lib/foundation-build-closeout-overnight-records.js: 4934 LOC, 398462B
- lib/foundation-db.js: 4742 LOC, 215692B
- lib/foundation-backlog-seed.js: 4652 LOC, 477958B
- lib/foundation-build-closeout-records.js: 4334 LOC, 297869B
- server.js: 3884 LOC, 135264B
- public/foundation.js: 2998 LOC, 113609B
- public/styles-foundation-workflows.css: 2591 LOC, 50351B

## Top Findings

### P0 Focused checks assert exact dated active sprint IDs
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `lib/foundation-current-sprint.js:103` (const FOUNDATION_CURRENT_SPRINT_ID = 'foundation-current-2026-05-12), `lib/foundation-current-sprint.js:145` (const FOUNDATION_SOURCE_ONCE_OVER_SPRINT_ID = 'foundation-source-once-over-2026-05-12), `lib/kpi-health.js:8` (const KPI_HEALTH_API_CACHE_SPRINT_ID = 'kpi-health-api-cache-2026-05-15), `lib/kpi-health.js:14` (const KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_SPRINT_ID = 'kpi-health-dynamic-year-contract-2026-05-16), `lib/gstack-build-intel.js:13` (const GSTACK_BUILD_INTEL_SPRINT_ID = 'gstack-build-intel-extraction-2026-05-13), `scripts/process-agent-feedback-routes-split-check.mjs:219` (activeSprint.sprint?.sprintId ===)
- Why it matters: One-time closeout checks are unsafe as nightly checks after rollover if they hard-fail on the current active sprint.
- Proposed owner/card: Foundation Process / `SPRINT-CHECK-HISTORICAL-MODE-001`
- Detector: dated active-sprint assertion detector
- False-positive note: Acceptable only in explicitly historical closeout or migration checks.

### P0 Foundation DB mixes schema, seed, stores, and query APIs
- Card lane: `FOUNDATION-MONOLITH-RISK-AUDIT-001`
- Type: `refactor_candidate`
- Evidence: `lib/foundation-db.js:847`
- Why it matters: Large mixed-responsibility surfaces slow audits, increase merge risk, and make future proof harder to isolate.
- Proposed owner/card: Foundation Engineering / `FOUNDATION-DB-SCHEMA-SEED-SPLIT-001`
- Detector: largest file/function ownership detector
- False-positive note: This is not approval to refactor during the audit sprint.

### P0 Foundation verifier is one large execution surface
- Card lane: `FOUNDATION-MONOLITH-RISK-AUDIT-001`
- Type: `refactor_candidate`
- Evidence: `scripts/foundation-verify.mjs:1590`
- Why it matters: Large mixed-responsibility surfaces slow audits, increase merge risk, and make future proof harder to isolate.
- Proposed owner/card: Foundation Engineering / `FOUNDATION-VERIFY-REGISTRY-SPLIT-001`
- Detector: largest file/function ownership detector
- False-positive note: This is not approval to refactor during the audit sprint.

### P0 Process/check path contains write side effects
- Card lane: `SPRINT-STATE-MUTATION-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/intelligence-action-router-apply.mjs:5`
- Why it matters: Nightly audits must not execute scripts that can move backlog, reopen sprints, write reports unexpectedly, or mutate source systems without explicit apply mode.
- Proposed owner/card: Foundation Process / `PROCESS-CHECK-READONLY-MODE-001`
- Detector: process script mutator pattern detector
- False-positive note: Closeout scripts can be expected mutators, but they need explicit apply/confirm boundaries before reuse by nightly audits.

### P0 Process/check path contains write side effects
- Card lane: `SPRINT-STATE-MUTATION-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-action-route-dedup-staleness-guard-check.mjs:227`
- Why it matters: Nightly audits must not execute scripts that can move backlog, reopen sprints, write reports unexpectedly, or mutate source systems without explicit apply mode.
- Proposed owner/card: Foundation Process / `PROCESS-CHECK-READONLY-MODE-001`
- Detector: process script mutator pattern detector
- False-positive note: Closeout scripts can be expected mutators, but they need explicit apply/confirm boundaries before reuse by nightly audits.

### P0 Process/check path contains write side effects
- Card lane: `SPRINT-STATE-MUTATION-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-action-route-promotion-workflow-check.mjs:226`
- Why it matters: Nightly audits must not execute scripts that can move backlog, reopen sprints, write reports unexpectedly, or mutate source systems without explicit apply mode.
- Proposed owner/card: Foundation Process / `PROCESS-CHECK-READONLY-MODE-001`
- Detector: process script mutator pattern detector
- False-positive note: Closeout scripts can be expected mutators, but they need explicit apply/confirm boundaries before reuse by nightly audits.

### P0 Process/check path contains write side effects
- Card lane: `SPRINT-STATE-MUTATION-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-action-route-review-inbox-check.mjs:237`
- Why it matters: Nightly audits must not execute scripts that can move backlog, reopen sprints, write reports unexpectedly, or mutate source systems without explicit apply mode.
- Proposed owner/card: Foundation Process / `PROCESS-CHECK-READONLY-MODE-001`
- Detector: process script mutator pattern detector
- False-positive note: Closeout scripts can be expected mutators, but they need explicit apply/confirm boundaries before reuse by nightly audits.

### P0 Process/check path contains write side effects
- Card lane: `SPRINT-STATE-MUTATION-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-agent-status-freshness-gate-check.mjs:227`
- Why it matters: Nightly audits must not execute scripts that can move backlog, reopen sprints, write reports unexpectedly, or mutate source systems without explicit apply mode.
- Proposed owner/card: Foundation Process / `PROCESS-CHECK-READONLY-MODE-001`
- Detector: process script mutator pattern detector
- False-positive note: Closeout scripts can be expected mutators, but they need explicit apply/confirm boundaries before reuse by nightly audits.

### P0 Process/check path contains write side effects
- Card lane: `SPRINT-STATE-MUTATION-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-aios-runtime-portability-gate-check.mjs:261`
- Why it matters: Nightly audits must not execute scripts that can move backlog, reopen sprints, write reports unexpectedly, or mutate source systems without explicit apply mode.
- Proposed owner/card: Foundation Process / `PROCESS-CHECK-READONLY-MODE-001`
- Detector: process script mutator pattern detector
- False-positive note: Closeout scripts can be expected mutators, but they need explicit apply/confirm boundaries before reuse by nightly audits.

### P0 Process/check path contains write side effects
- Card lane: `SPRINT-STATE-MUTATION-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-atom-flow-auto-demotion-check.mjs:158`
- Why it matters: Nightly audits must not execute scripts that can move backlog, reopen sprints, write reports unexpectedly, or mutate source systems without explicit apply mode.
- Proposed owner/card: Foundation Process / `PROCESS-CHECK-READONLY-MODE-001`
- Detector: process script mutator pattern detector
- False-positive note: Closeout scripts can be expected mutators, but they need explicit apply/confirm boundaries before reuse by nightly audits.

### P0 Process/check path contains write side effects
- Card lane: `SPRINT-STATE-MUTATION-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-brand-stack-check.mjs:178`
- Why it matters: Nightly audits must not execute scripts that can move backlog, reopen sprints, write reports unexpectedly, or mutate source systems without explicit apply mode.
- Proposed owner/card: Foundation Process / `PROCESS-CHECK-READONLY-MODE-001`
- Detector: process script mutator pattern detector
- False-positive note: Closeout scripts can be expected mutators, but they need explicit apply/confirm boundaries before reuse by nightly audits.

### P0 Process/check path contains write side effects
- Card lane: `SPRINT-STATE-MUTATION-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-build-intel-extraction-check.mjs:60`
- Why it matters: Nightly audits must not execute scripts that can move backlog, reopen sprints, write reports unexpectedly, or mutate source systems without explicit apply mode.
- Proposed owner/card: Foundation Process / `PROCESS-CHECK-READONLY-MODE-001`
- Detector: process script mutator pattern detector
- False-positive note: Closeout scripts can be expected mutators, but they need explicit apply/confirm boundaries before reuse by nightly audits.

### P0 Process/check path contains write side effects
- Card lane: `SPRINT-STATE-MUTATION-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-build-intel-karpathy-llm-kb-preflight-check.mjs:215`
- Why it matters: Nightly audits must not execute scripts that can move backlog, reopen sprints, write reports unexpectedly, or mutate source systems without explicit apply mode.
- Proposed owner/card: Foundation Process / `PROCESS-CHECK-READONLY-MODE-001`
- Detector: process script mutator pattern detector
- False-positive note: Closeout scripts can be expected mutators, but they need explicit apply/confirm boundaries before reuse by nightly audits.

### P0 Process/check path contains write side effects
- Card lane: `SPRINT-STATE-MUTATION-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-build-lane-failure-telemetry-check.mjs:228`
- Why it matters: Nightly audits must not execute scripts that can move backlog, reopen sprints, write reports unexpectedly, or mutate source systems without explicit apply mode.
- Proposed owner/card: Foundation Process / `PROCESS-CHECK-READONLY-MODE-001`
- Detector: process script mutator pattern detector
- False-positive note: Closeout scripts can be expected mutators, but they need explicit apply/confirm boundaries before reuse by nightly audits.

### P0 Process/check path contains write side effects
- Card lane: `SPRINT-STATE-MUTATION-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-build-lane-reliability-sprint-check.mjs:232`
- Why it matters: Nightly audits must not execute scripts that can move backlog, reopen sprints, write reports unexpectedly, or mutate source systems without explicit apply mode.
- Proposed owner/card: Foundation Process / `PROCESS-CHECK-READONLY-MODE-001`
- Detector: process script mutator pattern detector
- False-positive note: Closeout scripts can be expected mutators, but they need explicit apply/confirm boundaries before reuse by nightly audits.

### P0 Process/check path contains write side effects
- Card lane: `SPRINT-STATE-MUTATION-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-code-quality-nightly-audit-check.mjs:103`
- Why it matters: Nightly audits must not execute scripts that can move backlog, reopen sprints, write reports unexpectedly, or mutate source systems without explicit apply mode.
- Proposed owner/card: Foundation Process / `PROCESS-CHECK-READONLY-MODE-001`
- Detector: process script mutator pattern detector
- False-positive note: Closeout scripts can be expected mutators, but they need explicit apply/confirm boundaries before reuse by nightly audits.

### P0 Process/check path contains write side effects
- Card lane: `SPRINT-STATE-MUTATION-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-connector-credential-check.mjs:111`
- Why it matters: Nightly audits must not execute scripts that can move backlog, reopen sprints, write reports unexpectedly, or mutate source systems without explicit apply mode.
- Proposed owner/card: Foundation Process / `PROCESS-CHECK-READONLY-MODE-001`
- Detector: process script mutator pattern detector
- False-positive note: Closeout scripts can be expected mutators, but they need explicit apply/confirm boundaries before reuse by nightly audits.

### P0 Process/check path contains write side effects
- Card lane: `SPRINT-STATE-MUTATION-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-current-sprint-dynamic-truth-check.mjs:151`
- Why it matters: Nightly audits must not execute scripts that can move backlog, reopen sprints, write reports unexpectedly, or mutate source systems without explicit apply mode.
- Proposed owner/card: Foundation Process / `PROCESS-CHECK-READONLY-MODE-001`
- Detector: process script mutator pattern detector
- False-positive note: Closeout scripts can be expected mutators, but they need explicit apply/confirm boundaries before reuse by nightly audits.

## Findings By Sprint Card

- `CODEBASE-HARDCODE-AUDIT-001`: 5 findings
- `FOUNDATION-API-PERF-AUDIT-001`: 2 findings
- `FOUNDATION-FRONTEND-PERF-AUDIT-001`: 1 finding
- `FOUNDATION-MONOLITH-RISK-AUDIT-001`: 5 findings
- `VERIFIER-ASSUMPTION-REGISTRY-001`: 3 findings
- `SPRINT-STATE-MUTATION-AUDIT-001`: 74 findings
- `NIGHTLY-AUDIT-REPORT-001`: 0 findings

## Proposed Backlog Fixes

- `SPRINT-CHECK-HISTORICAL-MODE-001`
- `FOUNDATION-DB-SCHEMA-SEED-SPLIT-001`
- `FOUNDATION-VERIFY-REGISTRY-SPLIT-001`
- `PROCESS-CHECK-READONLY-MODE-001`
- `FOUNDATION-JOB-MUTATION-ALLOWLIST-001`
- `ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001`
- `FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001`
- `FOUNDATION-HUB-PAYLOAD-EXTRACT-001`
- `SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001`
- `DB-SEED-001`
- `ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001`
- `APPROVAL-THRESHOLD-REGISTRY-001`
- `BUILD-CLOSEOUT-REGISTRY-EXTRACT-001`
- `BUILD-INTEL-CONTEXT-SEARCH-INDEX-001`
- `BUILD-LOG-API-CACHE-AND-SLIM-001`
- `BUILD-INTEL-SNAPSHOT-BASELINE-001`
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
