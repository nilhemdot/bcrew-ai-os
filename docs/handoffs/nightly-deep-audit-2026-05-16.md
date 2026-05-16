# Nightly Deep Audit Report - 2026-05-16

Closeout key: `nightly-deep-audit-upgrade-v1`
Generated at: `2026-05-16T18:54:35.779Z`
Report path: `docs/handoffs/nightly-deep-audit-2026-05-16.md`

## Morning Read

- Status: `report_ready`
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev.
- Deterministic findings: 55 total (40 P0, 8 P1, 7 P2, 0 P3)
- Changed files selected: 5
- High-risk review targets: 18
- LLM review mode: `approved_route_available_for_bounded_review`
- Dogfood against May 13 failures: passed

## Diff Summary

- Previous report: `docs/handoffs/nightly-deep-audit-2026-05-14.json`
- New findings: 0
- Still open: 17
- Resolved: 11
- Finding delta: -11

## LLM Review Boundary

- Executed this run: no
- Selected route: `foundation-synthesis-openclaw-chatgpt`
- Provider/model: `openclaw / openai-codex/gpt-5.4`
- Route blocker: none
- Note: An approved route is available; V1 still records packets by default unless an explicit live LLM review mode is enabled.

## Endpoint And Payload Trend

- /api/foundation-hub: 81ms, 583796B, risk=healthy (Within V1 audit budget.)
- /api/source-of-truth: 18ms, 134286B, risk=healthy (Within V1 audit budget.)
- /api/foundation/source-lifecycle: 370ms, 650307B, risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: 72ms, 322407B, risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: 82ms, 33955B, risk=healthy (Within V1 audit budget.)

## Largest Files

- scripts/foundation-verify.mjs: 12963 LOC, 733310B
- public/foundation.js: 4910 LOC, 174221B
- server.js: 4830 LOC, 160358B
- lib/foundation-db.js: 4735 LOC, 215243B
- lib/foundation-build-closeout-overnight-records.js: 4676 LOC, 380707B
- lib/foundation-backlog-seed.js: 4652 LOC, 477958B
- lib/foundation-build-closeout-records.js: 4328 LOC, 297517B
- public/styles-foundation-workflows.css: 2591 LOC, 50351B
- lib/foundation-source-crawl-store.js: 2491 LOC, 110816B
- public/styles-foundation-core.css: 2291 LOC, 43082B

## High-Risk Review Packets

### P0 scripts/foundation-verify.mjs

- Lines: 12963
- Bytes: 733310
- Reasons: changed_since_baseline, actively_dangerous_10k_plus_file, verifier_trust_surface

```
    foundationUiLiveSummarySourcesCard &&
      ['executing', 'done'].includes(foundationUiLiveSummarySourcesCard.lane) &&
      packageJson.scripts?.['process:foundation-ui-live-summary-sources-check'] === `node --env-file-if-exists=.env ${FOUNDATION_UI_LIVE_SUMMARY_SOURCES_SCRIPT_PATH}` &&
      foundationUiLiveSummarySourcesDogfood.ok === true &&
      foundationUiLiveSummaryContract.ok === true &&
      foundationCurrentStateSummarySource.includes('buildFoundationCurrentStateSummaryPayload') &&
      foundationCurrentStateSummarySource.includes('buildFoundationCurrentStateSummaryDogfoodProof') &&
      foundationCurrentStateRendererSource.includes('currentStateSummary') &&
      foundationCurrentStateRendererSource.includes('renderCurrentStateMissingSummaryPanel') &&
      !/var\s+surfaceRows\s*=\s*\[/.test(foundationCurrentStateRendererSource) &&
      codeQualityNightlyAuditSource.includes('public/foundation-current-state-renderers.js') &&
      foundationUiLiveSummarySourcesScriptSource.includes('source input changes alter UI row copy') &&
      foundationUiLiveSummarySourcesPlanSource.includes('public/foundation-current-state-renderers.js') &&
      await repoFileExists(FOUNDATION_UI_LIVE_SUMMARY_SOURCES_APPROVAL_PATH) &&
      (!foundationUiLiveSummaryClosed || (
        String(foundationUiLiveSummarySourcesCard.statusNote || '').includes(FOUNDATION_UI_LIVE_SUMMARY_SOURCES_CLOSEOUT_KEY) &&
        foundationUiLiveSummarySourcesCloseout?.operatorCloseout === true &&
        (foundationUiLiveSummarySourcesCloseout.backlogIds || []).includes(FOUNDATION_UI_LIVE_SUMMARY_SOURCES_CARD_ID) &&
        await repoFileExists('docs/handoffs/2026-05-16-foundation-ui-live-summary-sources-closeout.md')
      )),
    'FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001 renders source-backed Current State summary payload',
    foundationUiLiveSummarySourcesCard
      ? `lane=${foundationUiLiveSummarySourcesCard.lane} rows=${foundationUiLiveSummaryPayload.summary?.surfaceRowCount || 0} auditFinding=${foundationUiLiveSummaryAuditFindingIds.includes('hardcoded-foundation-ui-current-summary') ? 'present' : 'clean'} closeout=${foundationUiLiveSummarySourcesCloseout?.key || 'pending'}`
      : `missing ${FOUNDATION_UI_LIVE_SUMMARY_SOURCES_CARD_ID}`,
  )
  const processHardeningDogfood = buildFoundationProcessHardeningVerifierDogfoodProof()
  const verifierProcessHardeningSplitModuleCar
```

### P1 public/foundation.js

- Lines: 4910
- Bytes: 174221
- Reasons: over_3k_warn, frontend_route_cache_surface

```
  note.textContent = 'Current strategy rule: the page pulls live data when it loads, and you can refresh it manually. Automatic background refresh can be added later if we need it.'
  panel.appendChild(note)

  return panel
}

function renderFoundationHome() {
  var container = document.getElementById('found-content')
  container.innerHTML = '<p>Loading Foundation.</p>'

  Promise.all([fetchSourceOfTruth(), fetchFoundationHub()]).then(function(results) {
    var data = results[0]
    var hub = results[1]
    container.innerHTML = ''

    var hero = document.createElement('section')
    hero.className = 'hero foundation-home-hero'

    var heroLeft = document.createElement('div')

    var eyebrow = document.createElement('div')
    eyebrow.className = 'eyebrow'
    eyebrow.textContent = 'Live Strategy System'
    heroLeft.appendChild(eyebrow)

    var heroTitle = document.createElement('h1')
    heroTitle.textContent = 'Foundation'
    heroLeft.appendChild(heroTitle)

    var heroCopy = document.createElement('p')
    heroCopy.textContent = 'Use this page to see Foundation overview, source truth, live systems, and what needs Steve.'
    heroLeft.appendChild(heroCopy)
    hero.appendChild(heroLeft)

    var heroActions = document.createElement('div')
    heroActions.className = 'foundation-hero-actions'
    heroActions.appendChild(createActionLink('Overview', '/foundation#current-state', 'print-button'))
    heroActions.appendChild(createActionLink('Data Sources', '/foundation#source-overview'))
    heroActions.appendChild(createActionLink('Backlog', '/foundation#backlog'))
    hero.appendChild(heroActions)

    container.appendChild(hero)

    var snapshotPanel = renderOverviewStatusPanel(
      getFoundationHomeSnapshotItems(data, hub),
      {
        eyebrow: 'Right Now',
        title: 'Foundation Status',
```

### P1 server.js

- Lines: 4830
- Bytes: 160358
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

### P1 lib/foundation-db.js

- Lines: 4735
- Bytes: 215243
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

### P1 lib/foundation-build-closeout-overnight-records.js

- Lines: 4676
- Bytes: 380707
- Reasons: changed_since_baseline, over_3k_warn

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

- Lines: 4328
- Bytes: 297517
- Reasons: over_3k_warn

```
import { cleanupCloseoutRecords } from './foundation-build-closeout-cleanup-records.js'
import { controlPlaneCloseoutRecords } from './foundation-build-closeout-control-plane-records.js'
import { overnightCloseoutRecords } from './foundation-build-closeout-overnight-records.js'
import { verifierTighteningCloseoutRecords } from './foundation-build-closeout-tightening-records.js'

export const FOUNDATION_BUILD_CLOSEOUT_SCHEMA_VERSION = 2

export const closeoutRecords = [
  ...cleanupCloseoutRecords,
  ...verifierTighteningCloseoutRecords,
  ...overnightCloseoutRecords,
  ...controlPlaneCloseoutRecords,
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
      '/api/foundation-hub foundationUiComplete',
      'Foundation > Data Sources > Source Lifecycle > Foundation 30-Second Read',
      'public/foundation.js renderFoundationUiCompletePanel',
      'public/styles.css .foundation-ui-complete-panel',
      'scripts/process-foundation-ui-complete-check.mjs',
      'docs/process/foundation-ui-complete-001-plan.md',
    
```

### P1 lib/foundation-jobs.js

- Lines: 1338
- Bytes: 57574
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
  FOUNDATION_JOB_MUTATION_ALLOWLIST_CARD_ID,
  evaluateFoundationJobMutationAllowlist,
} from './foundation-job-mutation-allowlist.js'

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
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null
  }
  return { hour, minute }
}

function localPartsForDate(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
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

### P1 lib/connector-uptime-monitor.js

- Lines: 901
- Bytes: 35040
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
})

export const RUNTIME_ACTIVATION_STATES = Object.freeze({
  active: 'active',
  scheduled: 'scheduled',
```

### P1 lib/source-lifecycle-completion.js

- Lines: 687
- Bytes: 34792
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

### P1 lib/foundation-intelligence-audit-verifier.js

- Lines: 677
- Bytes: 36803
- Reasons: changed_since_baseline

```
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CARD_IDS,
  BUILD_INTEL_EXTRACTION_IMPLEMENTATION_CLOSEOUT_KEY,
  BUILD_INTEL_EXTRACTION_IMPLEMENTATION_REPORT_PATH,
  BUILD_INTEL_EXTRACTION_IMPLEMENTATION_SCRIPT_PATH,
  buildBuildIntelExtractionImplementationSnapshot,
} from './build-intel-extraction-implementation.js'
import {
  CODE_QUALITY_NIGHTLY_AUDIT_CARD_IDS,
  CODE_QUALITY_NIGHTLY_AUDIT_CLOSEOUT_KEY,
  CODE_QUALITY_NIGHTLY_AUDIT_JOB_KEY,
  CODE_QUALITY_NIGHTLY_AUDIT_REPORT_PATH,
  CODE_QUALITY_NIGHTLY_AUDIT_REQUIRED_ENDPOINTS,
  CODE_QUALITY_NIGHTLY_AUDIT_SCRIPT_PATH,
  buildCodeQualityNightlyAudit,
  buildSyntheticCodeQualityNightlyAuditProof,
} from './code-quality-nightly-audit.js'
import {
  GSTACK_BUILD_INTEL_CARD_IDS,
  GSTACK_BUILD_INTEL_CLOSEOUT_KEY,
  GSTACK_BUILD_INTEL_EXPECTED_COMMIT,
  GSTACK_BUILD_INTEL_REPORT_PATH,
  GSTACK_BUILD_INTEL_SCRIPT_PATH,
  buildGStackBuildIntelSnapshot,
} from './gstack-build-intel.js'
import {
  IMPLEMENTATION_INTELLIGENCE_CARD_IDS,
  IMPLEMENTATION_INTELLIGENCE_CLOSEOUT_KEY,
  buildImplementationIntelligenceSnapshot,
} from './implementation-intelligence.js'
import {
  buildFoundationJobRuntimeScheduleDogfoodProof,
  getFoundationJobDefinitions,
} from './foundation-jobs.js'
import {
  NIGHTLY_DEEP_AUDIT_APPROVAL_PATH,
  NIGHTLY_DEEP_AUDIT_JOB_KEY,
  NIGHTLY_DEEP_AUDIT_PLAN_PATH,
  NIGHTLY_DEEP_AUDIT_SCRIPT_PATH,
  NIGHTLY_DEEP_AUDIT_UPGRADE_CARD_ID,
  NIGHTLY_DEEP_AUDIT_UPGRADE_CLOSEOUT_KEY,
  buildNightlyDeepAuditUpgrade,
  buildNightlyDeepAuditUpgradeDogfoodProof,
} from './nightly-deep-audit-upgrade.js'

export const VERIFIER_INTELLIGENCE_AUDIT_SPLIT_MODULE_CARD_ID = 'VERIFIER-INTELLIGENCE-AUDIT-SPLIT-MODULE-001'
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

### P1 scripts/process-foundation-sprint-system-check.mjs

- Lines: 428
- Bytes: 22842
- Reasons: process_check_surface

```
    'command-order',
    'backend-only',
    'app surface metadata',
    'at least 3 recent closeouts',
    'Recent Builds / Recent Work owns',
    'technical terms must have a plain-English meaning next to them',
  ]
  if (requiredSurfaceMarkers.every(marker => text.includes(marker))) return true
  await updateBacklogItem(FOUNDATION_SPRINT_SURFACE_FOLLOW_UP_CARD_ID, {
    nextAction: 'After `FOUNDATION-SPRINT-SYSTEM-001` defines the current-sprint overlay and Sprint Ready gates, ship the broader UX/navigation slice: top nav order becomes Overview -> Systems -> Backlog -> Recent Work; Recent Builds / Recent Work defaults collapsed and shows plain-English built/partial/not-yet status, clickable app breadcrumbs, doc links, connector/system touched, and backend-only visibility; Overview gets done-velocity visibility with newest-done first and weekly moved-to-done bars; plan/backlog grouping either matches the rebuild plan or becomes a plain-English command-order view.',
    statusNote: 'Scoped follow-up boundary refreshed on 2026-05-10 by FOUNDATION-SPRINT-SYSTEM-001 proof: sprint overlay is its own control card, while FOUNDATION-SURFACE-UPDATES-001 stays broader UI polish/follow-up work. Acceptance remains: plain-English copy is required for all operator-facing closeout entries, status labels, and Foundation page labels; technical terms must have a plain-English meaning next to them; Recent Builds / Recent Work owns the where-it-lives links, app/hub/doc breadcrumbs, and "what changed here" notes; Recent Work links directly to affected app surfaces/docs for at least 3 recent closeouts; done items show moved-to-done date and sort newest-to-oldest in done sections; weekly done-velocity bar chart appears on Overview; the misleading Phase 1 / Truth Cleanup grouping is reconciled to the rebuild plan or replaced by command-order status; backend-only changes say where the effect is visible; `foundation:verify` checks major closeouts include app surface metadata, not just files. `FOUNDATION-SPRINT-SYSTEM-001` now owns the minimal sprint overlay/process gates so they are not buried as generic UI polish. Not in scope: full design-system rewrite, full doc redline/highlight engine, user/access control panel, extraction retry/backoff, Strategy/Scoper/Agent work.',
  }, 'foundation-sprint-system-check')
  return true
}

async function closeCardIfHealthy(summary) {
  if (summ
```

### P1 scripts/process-meeting-vault-acl-check.mjs

- Lines: 420
- Bytes: 19207
- Reasons: process_check_surface

```

async function updateMeetingBacklog(status, summary) {
  const latestAutoEnforcement = await getLatestMeetingVaultAutoEnforcementRun({
    cardId: MEETING_VAULT_AUTO_ENFORCEMENT_CARD_ID,
  }).catch(() => null)
  if (!status.cardCanClose &&
    latestAutoEnforcement?.status === 'ready' &&
    latestAutoEnforcement?.canCloseMeetingVaultAcl === true) {
    await updateBacklogItem(MEETING_VAULT_ACL_CARD_ID, {
      lane: 'done',
      nextAction: 'Keep MEETING-VAULT-ACL-001 closed through the automatic forward-flow proof. Treat this legacy Phase A dry-run as evidence only; do not restart manual historical permission batches without a separate approved legacy-exception cleanup card.',
      statusNote: `Closed on 2026-05-11 through \`${MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY}\`. Latest legacy Phase A dry-run remains evidence-only with dry-run hash ${summary.dryRunHash}; auto-enforcement report hash ${latestAutoEnforcement.reportHash}; no Google Drive emails or permission mutations were sent/applied by this proof.`,
    }, 'meeting-vault-acl-check')
    return
  }

  if (status.cardCanClose) {
    await updateBacklogItem(MEETING_VAULT_ACL_CARD_ID, {
      lane: 'done',
      nextAction: 'Keep MEETING-VAULT-ACL-001 closed only while Phase A proves every protected in-scope original Gemini meeting note is already safe and every unknown file is classified. Any new unsafe protected share, missing Crewbert permission on an original, missing access, owner ambiguity, unknown classification, missing original, or unscanned file reopens the raw Drive ACL/vault readiness blocker.',
      statusNote: `Closed on 2026-05-10 under \`${MEETING_VAULT_ACL_CLOSEOUT_KEY}\`. Source-truth Phase A dry-run proved every protected in-scope original Gemini meeting note already safe with dry-run hash ${summary.dryRunHash}; no Google Drive emails or permission mutations were sent/applied. Proof commands: \`npm run process:meeting-vault-acl-check\`, \`npm run process:foundation-done-test -- --report-only\`, \`npm run backlog:hygiene -- --json\`, and \`npm run foundation:verify\`.`,
    }, 'meeting-vault-acl-check')
    return
  }

  await updateBacklogItem(MEETING_VAULT_ACL_CARD_ID, {
    lane: 'scoped',
    nextAction: `Source-truth Phase A dry-run remains blocking. Dry-run hash ${summary.dryRunHash}; source roles=${JSON.stringify(summary.sourceFileRoleCounts || {})}; sensitivity classes=
```

### P1 scripts/process-meeting-vault-auto-enforcement-check.mjs

- Lines: 402
- Bytes: 17550
- Reasons: process_check_surface

```
      proofOutputIsMetadataOnly: findings.every(finding => finding.check !== 'proof output is metadata-only'),
      legacyExceptionsBounded: status.summary.legacyExceptionCount >= 0,
    },
  }
}

async function updateMeetingVaultBacklog(status) {
  if (status.canCloseMeetingVaultAcl) {
    await updateBacklogItem(MEETING_VAULT_AUTO_ENFORCEMENT_CARD_ID, {
      lane: 'done',
      nextAction: 'Keep automatic Meeting Vault enforcement in report-only proof mode until a separate live-enforcement approval exists. Review daily audit exceptions before any future Drive mutation.',
      statusNote: `Closed on 2026-05-11 under \`${MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY}\`. V1 records the automatic forward-flow proof, no-duplicate Google Docs rule, source-truth original handling, Crewbert/access action queue, daily audit/legacy exception queue, and readiness close rule with report hash ${status.reportHash}. No historical cleanup batch, Drive permission mutation, request-access email, delete, move, ownership transfer, Strategy, Sales, Agent Feedback, Scoper, Agent Factory, broad corpus, researcher, public access, or UI polish shipped.`,
    }, 'meeting-vault-auto-enforcement-check')
    await updateBacklogItem(MEETING_VAULT_ACL_CARD_ID, {
      lane: 'done',
      nextAction: 'Keep MEETING-VAULT-ACL-001 closed only while the automatic Meeting Vault forward-flow proof stays green. New raw public/domain exposure, missing Crewbert on a forward original, unknown classification, owner ambiguity, missing access, duplicate Google Doc creation, or unbounded legacy exception queue reopens the blocker.',
      statusNote: `Closed on 2026-05-11 through \`${MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY}\` readiness rule. Manual historical Drive batching is stopped; old messy files are bounded in the legacy exception queue and new original Gemini meeting notes are governed by automatic report-only enforcement proof. Report hash ${status.reportHash}; no Google Drive permission mutations or request-access emails were sent by this closeout.`,
    }, 'meeting-vault-auto-enforcement-check')
    return
  }

  await updateBacklogItem(MEETING_VAULT_AUTO_ENFORCEMENT_CARD_ID, {
    lane: 'scoped',
    nextAction: `Automatic Meeting Vault proof is still blocked: ${status.blockerReason || 'unknown'}. Report hash ${status.reportHash}; fix the named forward-flow or high-risk blocker, then r
```

### P1 scripts/process-sprint-stage-gate-check.mjs

- Lines: 374
- Bytes: 14790
- Reasons: process_check_surface

```
#!/usr/bin/env node

import fs from 'node:fs/promises'
import process from 'node:process'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  SPRINT_STAGE_GATE_CARD_ID,
  SPRINT_STAGE_GATE_PLAN_PATH,
  SPRINT_STAGE_GATE_APPROVAL_PATH,
  SPRINT_STAGE_GATE_SCRIPT_PATH,
  validateFoundationSprintStageGate,
} from '../lib/foundation-current-sprint.js'
import { getFoundationBuildCloseouts } from '../lib/foundation-build-log.js'
import {
  closeFoundationDb,
  getActiveFoundationCurrentSprint,
  getBacklogItemsByIds,
  getPlanCriticRunsByCardIds,
  initFoundationDb,
} from '../lib/foundation-db.js'

// liveTruthPosture: historical_closeout_only - this proof replays the closed control-plane sprint to validate stage gates.
const SPRINT_ID = 'control-plane-connector-readiness-2026-05-12'
const CONNECTOR_ROUTING_SPRINT_ID = 'connector-routing-truth-2026-05-12'
const CONNECTOR_ROUTING_CARD_IDS = [
  'ATOM-PROMOTION-DIAGNOSE-001',
  'SPRINT-DB-RECONCILE-001',
  'VERIFY-GATE-TIERING-FIX-001',
  'PLAN-CRITIC-LOG-001',
  'SOURCE-CONNECTOR-MATRIX-001',
  'SOURCE-HUB-ROUTING-MATRIX-001',
]

function parseArgs(argv = process.argv.slice(2)) {
  const args = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, ...rawValue] = arg.slice(2).split('=')
    args[key] = rawValue.length ? rawValue.join('=') : 'true'
  }
  return args
}

function boolArg(value) {
  return value === true || String(value || '').toLowerCase() === 'true'
}
```

### P1 scripts/process-foundation-sprint-cadence-check.mjs

- Lines: 358
- Bytes: 19310
- Reasons: process_check_surface

```
    /https:\/\/docs\.google\.com/i,
    /emailAddress/i,
  ]
  return forbidden.filter(pattern => pattern.test(proofText)).map(pattern => String(pattern))
}

async function closeCardIfHealthy(summary) {
  if (summary.status !== 'healthy') return
  await updateBacklogItem(FOUNDATION_SPRINT_CADENCE_CARD_ID, {
    lane: 'done',
    nextAction: 'Use Current Sprint as the command view. The active sprint reset now pulls REBUILD-PLAN-RECONCILE-001 after VERIFY-GATE-TIERING-001; do not run Meeting Vault Phase B, mutate Drive permissions, or send request-access emails without separate approval.',
    statusNote: 'Closed on 2026-05-10 under `foundation-sprint-cadence-v1`. V1 adds a Current Sprint command view at the top of Recent Work with executive summary, sprint goal, current status, next card, current blocker, exit criteria, Scoping/Sprint Ready/Building Now/Returned/Done This Sprint stage rows, card definition of done, proof commands, returned reason, and next action. It updates the central sprint cadence payload, focused proof, package/verifier coverage, process doc, and rebuild state. This does not build Meeting Vault Phase B, mutate Drive permissions, send request-access emails, build broad sprint analytics, or perform broad UI polish.',
  }, 'foundation-sprint-cadence-check')
}

async function main() {
  const args = parseArgs()
  const jsonOnly = boolArg(args.json)
  const apply = boolArg(args.apply)
  const baseUrl = String(args.baseUrl || process.env.FOUNDATION_BASE_URL || 'http://localhost:3000')
  const repoHead = await currentHead()

  await initFoundationDb()
  try {
    const buildingSprint = await getActiveFoundationCurrentSprint()
    const cardIds = [
      ...FOUNDATION_CURRENT_SPRINT_ACTIVE_CARD_IDS,
      FOUNDATION_SPRINT_SYSTEM_CARD_ID,
      FOUNDATION_SPRINT_CADENCE_CARD_ID,
      'MEETING-VAULT-ACL-001',
      FOUNDATION_SPRINT_SURFACE_FOLLOW_UP_CARD_ID,
      FOUNDATION_SPRINT_DONE_VELOCITY_FOLLOW_UP_CARD_ID,
    ]
    const buildingCards = await getBacklogItemsByIds(cardIds)
    const buildingStatus = buildFoundationCurrentSprintStatus({
      sprint: buildingSprint.sprint,
      items: buildingSprint.items,
      backlogItems: buildingCards,
      closeouts: getFoundationBuildCloseouts(),
    })

    const packageJson = await readJson('package.json')
    const [
      planSource,
      docSource,
      approvalSource,
      moduleSource,
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
Generated at: `2026-05-16T18:54:36.308Z`

## Morning Read

- Status: `report_ready`
- Findings: 55 total (40 P0, 8 P1, 7 P2, 0 P3)
- Proposed backlog fixes: 17
- Detection mode: deterministic code first; no LLM detection used.
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev, no feature work.
- Synthetic proof: passed (hardcoded=2, mutator=1, slowEndpoint=risk)

## Endpoint Coverage

- /api/foundation-hub: status=200 latency=81ms payload=583796B risk=healthy (Within V1 audit budget.)
- /api/source-of-truth: status=200 latency=18ms payload=134286B risk=healthy (Within V1 audit budget.)
- /api/foundation/source-lifecycle: status=200 latency=370ms payload=650307B risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: status=200 latency=72ms payload=322407B risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: status=200 latency=82ms payload=33955B risk=healthy (Within V1 audit budget.)

## Asset And Monolith Metrics

Assets:
- public/foundation.html: 7685B raw, 1661B gzip, 113 lines
- public/styles.css: 489B raw, 268B gzip, 12 lines
- public/foundation-nav-config.js: 8135B raw, 2284B gzip, 171 lines
- public/foundation-data.js: 11993B raw, 2648B gzip, 399 lines
- public/foundation.js: 174221B raw, 33899B gzip, 4910 lines
- public/foundation-source-registry-renderers.js: 55416B raw, 10722B gzip, 1450 lines
- public/foundation-fub-lead-source-renderers.js: 27456B raw, 5884B gzip, 678 lines
- public/foundation-system-inventory-renderers.js: 57848B raw, 11281B gzip, 1519 lines
- public/foundation-current-state-renderers.js: 44753B raw, 9670B gzip, 1162 lines
- public/foundation-decision-question-renderers.js: 52409B raw, 9280B gzip, 1443 lines
- public/foundation-source-lifecycle-renderers.js: 65313B raw, 9812B gzip, 1498 lines
- public/foundation-runtime-renderers.js: 73335B raw, 16053B gzip, 1782 lines
- public/foundation-operations-renderers.js: 51026B raw, 10833B gzip, 1210 lines
- public/foundation-router.js: 5221B raw, 1498B gzip, 192 lines

DOM budget:
- status=review, scripts=12, createElement=1600, appendChild=2050, innerHTML=63

Largest files:
- scripts/foundation-verify.mjs: 12963 LOC, 733310B
- public/foundation.js: 4910 LOC, 174221B
- server.js: 4830 LOC, 160358B
- lib/foundation-db.js: 4735 LOC, 215243B
- lib/foundation-build-closeout-overnight-records.js: 4676 LOC, 380707B
- lib/foundation-backlog-seed.js: 4652 LOC, 477958B
- lib/foundation-build-closeout-records.js: 4328 LOC, 297517B
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
- Evidence: `lib/foundation-db.js:846`
- Why it matters: Large mixed-responsibility surfaces slow audits, increase merge risk, and make future proof harder to isolate.
- Proposed owner/card: Foundation Engineering / `FOUNDATION-DB-SCHEMA-SEED-SPLIT-001`
- Detector: largest file/function ownership detector
- False-positive note: This is not approval to refactor during the audit sprint.

### P0 Foundation verifier is one large execution surface
- Card lane: `FOUNDATION-MONOLITH-RISK-AUDIT-001`
- Type: `refactor_candidate`
- Evidence: `scripts/foundation-verify.mjs:2194`
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

### P0 Process/check path contains write side effects
- Card lane: `SPRINT-STATE-MUTATION-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-decision-restricted-queue-check.mjs:142`
- Why it matters: Nightly audits must not execute scripts that can move backlog, reopen sprints, write reports unexpectedly, or mutate source systems without explicit apply mode.
- Proposed owner/card: Foundation Process / `PROCESS-CHECK-READONLY-MODE-001`
- Detector: process script mutator pattern detector
- False-positive note: Closeout scripts can be expected mutators, but they need explicit apply/confirm boundaries before reuse by nightly audits.

### P0 Process/check path contains write side effects
- Card lane: `SPRINT-STATE-MUTATION-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-drive-access-request-check.mjs:166`
- Why it matters: Nightly audits must not execute scripts that can move backlog, reopen sprints, write reports unexpectedly, or mutate source systems without explicit apply mode.
- Proposed owner/card: Foundation Process / `PROCESS-CHECK-READONLY-MODE-001`
- Detector: process script mutator pattern detector
- False-positive note: Closeout scripts can be expected mutators, but they need explicit apply/confirm boundaries before reuse by nightly audits.

### P0 Process/check path contains write side effects
- Card lane: `SPRINT-STATE-MUTATION-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-extract-run-hardening-check.mjs:156`
- Why it matters: Nightly audits must not execute scripts that can move backlog, reopen sprints, write reports unexpectedly, or mutate source systems without explicit apply mode.
- Proposed owner/card: Foundation Process / `PROCESS-CHECK-READONLY-MODE-001`
- Detector: process script mutator pattern detector
- False-positive note: Closeout scripts can be expected mutators, but they need explicit apply/confirm boundaries before reuse by nightly audits.

### P0 Process/check path contains write side effects
- Card lane: `SPRINT-STATE-MUTATION-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-extract-run-hardening-execution-check.mjs:69`
- Why it matters: Nightly audits must not execute scripts that can move backlog, reopen sprints, write reports unexpectedly, or mutate source systems without explicit apply mode.
- Proposed owner/card: Foundation Process / `PROCESS-CHECK-READONLY-MODE-001`
- Detector: process script mutator pattern detector
- False-positive note: Closeout scripts can be expected mutators, but they need explicit apply/confirm boundaries before reuse by nightly audits.

### P0 Process/check path contains write side effects
- Card lane: `SPRINT-STATE-MUTATION-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-foundation-sprint-cadence-check.mjs:108`
- Why it matters: Nightly audits must not execute scripts that can move backlog, reopen sprints, write reports unexpectedly, or mutate source systems without explicit apply mode.
- Proposed owner/card: Foundation Process / `PROCESS-CHECK-READONLY-MODE-001`
- Detector: process script mutator pattern detector
- False-positive note: Closeout scripts can be expected mutators, but they need explicit apply/confirm boundaries before reuse by nightly audits.

### P0 Process/check path contains write side effects
- Card lane: `SPRINT-STATE-MUTATION-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-foundation-sprint-system-check.mjs:128`
- Why it matters: Nightly audits must not execute scripts that can move backlog, reopen sprints, write reports unexpectedly, or mutate source systems without explicit apply mode.
- Proposed owner/card: Foundation Process / `PROCESS-CHECK-READONLY-MODE-001`
- Detector: process script mutator pattern detector
- False-positive note: Closeout scripts can be expected mutators, but they need explicit apply/confirm boundaries before reuse by nightly audits.

### P0 Process/check path contains write side effects
- Card lane: `SPRINT-STATE-MUTATION-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-foundation-ui-complete-check.mjs:153`
- Why it matters: Nightly audits must not execute scripts that can move backlog, reopen sprints, write reports unexpectedly, or mutate source systems without explicit apply mode.
- Proposed owner/card: Foundation Process / `PROCESS-CHECK-READONLY-MODE-001`
- Detector: process script mutator pattern detector
- False-positive note: Closeout scripts can be expected mutators, but they need explicit apply/confirm boundaries before reuse by nightly audits.

### P0 Process/check path contains write side effects
- Card lane: `SPRINT-STATE-MUTATION-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-gstack-build-intel-check.mjs:90`
- Why it matters: Nightly audits must not execute scripts that can move backlog, reopen sprints, write reports unexpectedly, or mutate source systems without explicit apply mode.
- Proposed owner/card: Foundation Process / `PROCESS-CHECK-READONLY-MODE-001`
- Detector: process script mutator pattern detector
- False-positive note: Closeout scripts can be expected mutators, but they need explicit apply/confirm boundaries before reuse by nightly audits.

## Findings By Sprint Card

- `CODEBASE-HARDCODE-AUDIT-001`: 6 findings
- `FOUNDATION-API-PERF-AUDIT-001`: 2 findings
- `FOUNDATION-FRONTEND-PERF-AUDIT-001`: 1 finding
- `FOUNDATION-MONOLITH-RISK-AUDIT-001`: 5 findings
- `VERIFIER-ASSUMPTION-REGISTRY-001`: 3 findings
- `SPRINT-STATE-MUTATION-AUDIT-001`: 38 findings
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

