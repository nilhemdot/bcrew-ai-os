# Nightly Deep Audit Report - 2026-05-16

Closeout key: `nightly-deep-audit-upgrade-v1`
Generated at: `2026-05-16T23:24:36.876Z`
Report path: `docs/handoffs/nightly-deep-audit-2026-05-16.md`

## Morning Read

- Status: `report_ready`
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev.
- Deterministic findings: 57 total (42 P0, 8 P1, 7 P2, 0 P3)
- Changed files selected: 13
- High-risk review targets: 18
- LLM review mode: `approved_route_available_for_bounded_review`
- Dogfood against May 13 failures: passed
- Doc/report artifact bloat: `watch` (0 red, 1 yellow)

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

- /api/foundation-hub: 92ms, 576894B, risk=healthy (Within V1 audit budget.)
- /api/source-of-truth: 15ms, 138931B, risk=healthy (Within V1 audit budget.)
- /api/foundation/source-lifecycle: 376ms, 622830B, risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: 82ms, 339259B, risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: 81ms, 33955B, risk=healthy (Within V1 audit budget.)

## Largest Files

- scripts/foundation-verify.mjs: 13043 LOC, 739886B
- lib/foundation-build-closeout-overnight-records.js: 4934 LOC, 398462B
- public/foundation.js: 4910 LOC, 174221B
- server.js: 4832 LOC, 160473B
- lib/foundation-db.js: 4735 LOC, 215243B
- lib/foundation-backlog-seed.js: 4652 LOC, 477958B
- lib/foundation-build-closeout-records.js: 4328 LOC, 297517B
- public/styles-foundation-workflows.css: 2591 LOC, 50351B
- lib/foundation-source-crawl-store.js: 2491 LOC, 110816B
- public/styles-foundation-core.css: 2291 LOC, 43082B

## High-Risk Review Packets

### P0 scripts/foundation-verify.mjs

- Lines: 13043
- Bytes: 739886
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
  const systemHealthNightlyAuditCard = (foundationHub.backlogItems || []).find(item => item.id === SYSTEM_HEALTH_NIGHTLY_AUDIT_CARD_ID
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

- Lines: 4832
- Bytes: 160473
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

- Lines: 1378
- Bytes: 59480
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

### P1 lib/google-delegated.js

- Lines: 1050
- Bytes: 35190
- Reasons: changed_since_baseline

```
import { JWT } from 'google-auth-library';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildGoogleSheetsCacheKey,
  getGoogleSheetsCacheStats,
  readGoogleSheetsCachedJson,
} from './google-sheets-cache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

export const GOOGLE_SA_KEY_FILE =
  process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE ||
  path.join(PROJECT_ROOT, 'store', 'crewbert-delegation-sa.json');

export const GOOGLE_SCOPES = {
  drive: 'https://www.googleapis.com/auth/drive',
  // Domain-wide delegation is currently authorized for these broader scopes.
  gmail: 'https://www.googleapis.com/auth/gmail.modify',
  gmailSend: 'https://www.googleapis.com/auth/gmail.send',
  calendar: 'https://www.googleapis.com/auth/calendar',
  sheets: 'https://www.googleapis.com/auth/spreadsheets',
};

export { getGoogleSheetsCacheStats };

let cachedServiceAccount = null;
const jwtClients = new Map();
const GOOGLE_RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

const OWNERS_DASHBOARD_SHEET_ID = '18FZ6lzS17mzKk9_45naSlCNXgTJu3CEotYLuYz_xLSk';
const OWNERS_DASHBOARD_LISTS_GID = 1609537489;

const IMPORTED_SHEET_RANGE_GUARDS = [
  {
    label: 'Owners Dashboard Lists IMPORTRANGE mirror',
    spreadsheetId: OWNERS_DASHBOARD_SHEET_ID,
    sheetTitle: 'Lists',
    sheetId: OWNERS_DASHBOARD_LISTS_GID,
    startColumnIndex: 0,
    endColumnIndex: 35, // A:AI is imported from the upstream KPI/BHAG sheet.
    source: '1A0FeVXwwpgSmkqEfZlKRC9tU6YlEqQSTSfmWdVCdrRE!Lists!A1:AI',
  },
];

function sleep(ms) {
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

- Lines: 967
- Bytes: 37796
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

### P1 lib/source-lifecycle.js

- Lines: 889
- Bytes: 37578
- Reasons: changed_since_baseline, source_health_surface

```
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readCombinedFoundationStylesheet } from './foundation-stylesheet-monolith-split.js'

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

export const SOURCE_LIFECYCLE_REQUIRED_TARGET_COUNT = 13

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
  'Drive Slides/Office/shortcut/media/OCR expansion',
  'Loom/Skool/Mycro crawler or browser extraction',
  'YouTube scout/discovery/Gemini video analysis',
  'Google Ads/publishing/reviews/training/content connector buildout',
```

### P1 scripts/run-extraction-target.mjs

- Lines: 781
- Bytes: 26106
- Reasons: changed_since_baseline

```
#!/usr/bin/env node

import { spawn } from 'node:child_process'
import process from 'node:process'
import {
  closeFoundationDb,
  finishSourceCrawlTargetRun,
  getExtractionControlSnapshot,
  getSharedCommunicationSourceStats,
  initFoundationDb,
  classifySourceCrawlItemRetries,
  leaseSourceCrawlTarget,
  listSourceCrawlItems,
  upsertIntelligenceJobRun,
} from '../lib/foundation-db.js'
import { buildExtractionNextSafeCommand } from '../lib/extraction-run-hardening.js'

const OUTPUT_TAIL_LIMIT = 20000

function parseArgs(argv) {
  const result = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [key, value] = arg.slice(2).split('=')
    const normalizedKey = String(key || '').replace(/-([a-z0-9])/g, (_match, char) => char.toUpperCase())
    result[normalizedKey] = value ?? true
  }
  return result
}

function appendTail(current, chunk) {
  const next = current + chunk
  return next.length > OUTPUT_TAIL_LIMIT ? next.slice(next.length - OUTPUT_TAIL_LIMIT) : next
}

function killProcessGroup(child, signal) {
  if (!child?.pid) return
  try {
    process.kill(-child.pid, signal)
  } catch {
    try {
      child.kill(signal)
    } catch {
      // The process may have already exited.
    }
  }
}

```

### P1 lib/connector-credential-registry.js

- Lines: 739
- Bytes: 28731
- Reasons: changed_since_baseline, source_health_surface

```
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')

export const CONNECTOR_CREDENTIAL_CARD_ID = 'CONNECTOR-CREDENTIAL-001'
export const CONNECTOR_CREDENTIAL_CLOSEOUT_KEY = 'connector-credential-v1'
export const CONNECTOR_CREDENTIAL_PLAN_PATH = 'docs/process/connector-credential-001-plan.md'
export const CONNECTOR_CREDENTIAL_APPROVAL_PATH = 'docs/process/approvals/CONNECTOR-CREDENTIAL-001.json'
export const CONNECTOR_CREDENTIAL_SCRIPT_PATH = 'scripts/process-connector-credential-check.mjs'

const DEFAULT_GOOGLE_SERVICE_ACCOUNT_REF = 'store/crewbert-delegation-sa.json'
const DEFAULT_OPENCLAW_CONFIG_REF = '~/.openclaw/openclaw.json'
const DEFAULT_CLAUDE_AUTH_REF = '~/.claude local auth'

function localPath(relativePath) {
  return path.join(PROJECT_ROOT, relativePath)
}

function homePath(relativePath) {
  return path.join(os.homedir(), relativePath)
}

export const CONNECTOR_CREDENTIAL_REQUIRED_KEYS = [
  'fub-api',
  'kpi-supabase',
  'google-delegated-drive',
  'google-delegated-gmail',
  'google-delegated-sheets',
  'clickup-api',
  'slack-api',
  'missive-api',
  'llm-openai-api',
  'llm-openclaw',
  'llm-claude-code',
  'apify-loom-youtube',
  'dataforseo-youtube',
  'myicro-access',
  'skool-access',
  'real-broker',
  'socialpilot',
  'ga4',
  'gsc',
  'gbp',
  'telegram-inbound',
```

### P1 lib/source-lifecycle-completion.js

- Lines: 692
- Bytes: 35107
- Reasons: changed_since_baseline, source_health_surface

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

### P1 lib/verifier-behavior-sweep.js

- Lines: 609
- Bytes: 24545
- Reasons: changed_since_baseline

```
import {
  DRIVE_ACCESS_REQUEST_CARD_ID,
  DRIVE_ACCESS_REQUEST_CLOSEOUT_KEY,
  DRIVE_ACCESS_REQUEST_SCRIPT_PATH,
  buildSyntheticDriveAccessPreflightProof,
} from './drive-access-preflight.js'
import {
  EXTRACT_RUN_HARDENING_CARD_ID,
  EXTRACT_RUN_HARDENING_CLOSEOUT_KEY,
  EXTRACT_RUN_HARDENING_SCRIPT_PATH,
  buildSyntheticExtractionRunHardeningProof,
} from './extraction-run-hardening.js'
import {
  FOUNDATION_DONE_TEST_CARD_ID,
  FOUNDATION_DONE_TEST_CLOSEOUT_KEY,
  FOUNDATION_DONE_TEST_SCRIPT_PATH,
  FOUNDATION_READINESS_GATE_CARDS,
  buildFoundationReadinessStatus,
} from './foundation-readiness-gates.js'
import {
  FOUNDATION_CURRENT_SPRINT_ID,
  FOUNDATION_SPRINT_SYSTEM_CARD_ID,
  FOUNDATION_SPRINT_SYSTEM_CLOSEOUT_KEY,
  FOUNDATION_SPRINT_SYSTEM_SCRIPT_PATH,
  PLAN_CRITIC_REPLACEMENT_CARD_ID,
  PLAN_CRITIC_REPLACEMENT_CLOSEOUT_KEY,
  PLAN_CRITIC_REPLACEMENT_SCRIPT_PATH,
  SECURITY_BEHAVIOR_PROOF_CARD_ID,
  SECURITY_BEHAVIOR_PROOF_CLOSEOUT_KEY,
  SECURITY_BEHAVIOR_PROOF_SCRIPT_PATH,
  VERIFIER_BEHAVIOR_SWEEP_CARD_ID,
  buildSyntheticFoundationCurrentSprintProof,
} from './foundation-current-sprint.js'
import {
  MEETING_VAULT_ACL_CARD_ID,
  MEETING_VAULT_ACL_CLOSEOUT_KEY,
  MEETING_VAULT_ACL_SCRIPT_PATH,
  buildSyntheticMeetingVaultAclProof,
} from './meeting-vault-acl.js'
import {
  MEETING_VAULT_AUTO_ENFORCEMENT_CARD_ID,
  MEETING_VAULT_AUTO_ENFORCEMENT_CLOSEOUT_KEY,
  MEETING_VAULT_AUTO_ENFORCEMENT_SCRIPT_PATH,
  buildSyntheticMeetingVaultAutoEnforcementProof,
} from './meeting-vault-auto-enforcement.js'
import {
  PLAN_CRITIC_SUMMARY_MARKER,
  buildSyntheticPlanCriticProof,
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
- Handoff files: 165
- Handoff hot lines: 20855
- Nightly artifacts: 6
- Red/yellow findings: 0/1

- P1 docs/handoffs is growing past the hot-doc budget: docs/handoffs contains 20855 line(s); budget is 20000/35000 warn/risk.

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
Generated at: `2026-05-16T23:24:37.410Z`

## Morning Read

- Status: `report_ready`
- Findings: 57 total (42 P0, 8 P1, 7 P2, 0 P3)
- Proposed backlog fixes: 17
- Detection mode: deterministic code first; no LLM detection used.
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev, no feature work.
- Synthetic proof: passed (hardcoded=2, mutator=1, slowEndpoint=risk)

## Endpoint Coverage

- /api/foundation-hub: status=200 latency=92ms payload=576894B risk=healthy (Within V1 audit budget.)
- /api/source-of-truth: status=200 latency=15ms payload=138931B risk=healthy (Within V1 audit budget.)
- /api/foundation/source-lifecycle: status=200 latency=376ms payload=622830B risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: status=200 latency=82ms payload=339259B risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: status=200 latency=81ms payload=33955B risk=healthy (Within V1 audit budget.)

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
- public/foundation-runtime-renderers.js: 77535B raw, 16762B gzip, 1862 lines
- public/foundation-operations-renderers.js: 51556B raw, 10950B gzip, 1218 lines
- public/foundation-router.js: 5221B raw, 1498B gzip, 192 lines

DOM budget:
- status=review, scripts=12, createElement=1600, appendChild=2050, innerHTML=63

Largest files:
- scripts/foundation-verify.mjs: 13043 LOC, 739886B
- lib/foundation-build-closeout-overnight-records.js: 4934 LOC, 398462B
- public/foundation.js: 4910 LOC, 174221B
- server.js: 4832 LOC, 160473B
- lib/foundation-db.js: 4735 LOC, 215243B
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
- Evidence: `scripts/foundation-verify.mjs:2208`
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
- Evidence: `scripts/process-doc-artifact-bloat-guard-check.mjs:42`
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

## Findings By Sprint Card

- `CODEBASE-HARDCODE-AUDIT-001`: 6 findings
- `FOUNDATION-API-PERF-AUDIT-001`: 2 findings
- `FOUNDATION-FRONTEND-PERF-AUDIT-001`: 1 finding
- `FOUNDATION-MONOLITH-RISK-AUDIT-001`: 5 findings
- `VERIFIER-ASSUMPTION-REGISTRY-001`: 3 findings
- `SPRINT-STATE-MUTATION-AUDIT-001`: 40 findings
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

