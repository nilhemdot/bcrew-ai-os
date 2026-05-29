# Foundation Deep Merge Audit - 2026-05-19

Card: `FOUNDATION-DEEP-MERGE-AUDIT-001`
Closeout key: `foundation-deep-merge-audit-v1`
Report path: `docs/audits/2026-05-19-foundation-deep-merge-audit.md`
JSON path: `docs/audits/2026-05-19-foundation-deep-merge-audit.json`

## Merge Scope

- Baseline ref: `43d0684177470cf8b834a524026405b156fb5420`
- Baseline commit: `43d0684177470cf8b834a524026405b156fb5420`
- Head commit: `0f1cc85ed1116e46720292d60a1f571a912e8ea2`
- Commits reviewed: 565
- Changed files: 2377
- Changed code files: 857
- Deep senior review: `healthy` (deep senior review executed with 13 finding(s))
- Mutation boundary: report-only audit; no auto-fixes and no automatic backlog writes.

## Routed P0/P1 Findings

- P1 Verifier mixes active sprint assertions with historical closeout proof -> `ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001` (live_backlog_done)
- P1 Foundation client embeds a large current-state renderer -> `FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001` (live_backlog_scoped)
- P1 Foundation Hub route builds many domains in one handler -> `FOUNDATION-HUB-PAYLOAD-EXTRACT-001` (live_backlog_done)
- P1 Foundation UI embeds current-state summary truth -> `FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001` (live_backlog_done)
- P1 Source contract count is encoded as an exact baseline -> `SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001` (live_backlog_done)
- P1 Source contract count is encoded as an exact baseline -> `SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001` (live_backlog_done)
- P1 Verifier mixes active sprint assertions with historical closeout proof -> `ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001` (live_backlog_done)
- P1 Foundation client still embeds a large current-state renderer monolith -> `FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001` (live_backlog_scoped)
- P1 Foundation Hub route still builds many domains in one handler -> `FOUNDATION-HUB-PAYLOAD-EXTRACT-001` (live_backlog_done)
- P1 Foundation UI current-state summary truth is still hardcoded in a check path -> `FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001` (live_backlog_done)
- P1 Source contract count is encoded as an exact baseline -> `SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001` (live_backlog_done)
- P1 Dynamic source-count check duplicates the hardcoded baseline assumption -> `SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001` (live_backlog_done)

## Changed Code Sample

- lib/action-route-dedup-staleness-guard.js
- lib/action-route-promotion-workflow.js
- lib/action-route-review-inbox.js
- lib/agent-capability-registry.js
- lib/agent-feedback-auto-send-reconciliation.js
- lib/agent-feedback-auto-send.js
- lib/agent-feedback-clickup.js
- lib/agent-feedback-company-email-policy.js
- lib/agent-feedback-email.js
- lib/agent-feedback-production-autosend-dry-run.js
- lib/agent-feedback-real-user-submit-repair.js
- lib/agent-feedback-reminders.js
- lib/agent-feedback-response-notify.js
- lib/agent-feedback-routes.js
- lib/agent-feedback-send.js
- lib/agent-feedback-steve-full-loop-test.js
- lib/agent-feedback.js
- lib/agent-live-answer-preflight-gate.js
- lib/agent-onboarding-feedback-system.js
- lib/agent-roster-review.js
- lib/agent-status-freshness-gate.js
- lib/agent-template-runtime-contract.js
- lib/aios-runtime-portability-gate.js
- lib/app-auth.js
- lib/app-page-routes.js
- lib/approval-integrity.js
- lib/atom-flow-auto-demotion.js
- lib/audit-finding-to-backlog-router.js
- lib/auth-routes.js
- lib/auto-deploy-rollback.js
- lib/backlog-hygiene.js
- lib/backlog-scrum-master-grooming.js
- lib/backlog-store-concurrency.js
- lib/brand-stack.js
- lib/build-closeout-registry-extract.js
- lib/build-intel-creator-watchlist-expansion.js
- lib/build-intel-extraction-implementation.js
- lib/build-intel-karpathy-llm-kb-preflight.js
- lib/build-intel-watchlist.js
- lib/build-lane-failure-telemetry.js

## Diff Stat Tail

```
 ...ifier-phase-g-operator-closeout-split-check.mjs |   161 +
 .../process-verifier-plan-reviews-split-check.mjs  |   147 +
 ...fier-process-control-governance-split-check.mjs |   175 +
 ...r-process-control-orchestration-split-check.mjs |   212 +
 ...ess-verifier-process-governance-split-check.mjs |   159 +
 ...process-hardening-orchestration-split-check.mjs |   194 +
 ...rifier-process-hardening-split-module-check.mjs |   232 +
 ...ier-process-trust-orchestration-split-check.mjs |   180 +
 ...s-verifier-process-trust-split-module-check.mjs |   232 +
 ...fier-readiness-blocker-closeout-split-check.mjs |   170 +
 ...ess-verifier-readiness-followup-split-check.mjs |   168 +
 ...verifier-recent-builds-closeout-split-check.mjs |   178 +
 ...ier-recent-builds-orchestration-split-check.mjs |   190 +
 .../process-verifier-route-split-module-check.mjs  |   154 +
 ...ntime-reliability-orchestration-split-check.mjs |   192 +
 ...ss-verifier-runtime-reliability-split-check.mjs |   166 +
 ...ss-verifier-server-route-split-module-check.mjs |   288 +
 ...r-source-contract-orchestration-split-check.mjs |   268 +
 ...cess-verifier-source-contracts-module-check.mjs |   194 +
 ...-source-once-over-orchestration-split-check.mjs |   220 +
 ...er-source-once-over-progression-split-check.mjs |   172 +
 ...fier-source-trust-orchestration-split-check.mjs |   188 +
 ...ss-verifier-source-trust-split-module-check.mjs |   310 +
 ...erifier-sprint-gate-progression-split-check.mjs |   169 +
 ...ifier-structural-assurance-core-split-check.mjs |   168 +
 ...ier-surface-trust-orchestration-split-check.mjs |   189 +
 ...s-verifier-surface-trust-split-module-check.mjs |   224 +
 scripts/process-verify-gate-tiering-check.mjs      |   324 +
 scripts/process-wip-protocol-check.mjs             |   247 +
 .../process-youtube-build-intel-batch-check.mjs    |   461 +
 scripts/retry-extraction-failed-items.mjs          |   122 +
 scripts/run-extraction-target.mjs                  |   402 +-
 scripts/run-foundation-job.mjs                     |    77 +-
 scripts/seed-extraction-control.mjs                |   176 +-
 scripts/send-agent-feedback-test-email.mjs         |    78 +-
 scripts/sheets-structure-verify.mjs                |    51 +-
 scripts/sync-calendar-events.mjs                   |   237 +
 scripts/sync-clickup-conditional-forecast.mjs      |   119 +-
 scripts/sync-meeting-notes-archive.mjs             |    78 +-
 scripts/sync-missive-archive.mjs                   |   294 +-
 scripts/sync-sales-listing-cases.mjs               |    18 +
 scripts/sync-slack-archive.mjs                     |   111 +-
 scripts/sync-source-contract-registry.mjs          |    91 +
 server.js                                          |  5658 +++------
 2153 files changed, 453249 insertions(+), 31636 deletions(-)
```

---

# Nightly Deep Audit Report - 2026-05-19

Closeout key: `foundation-deep-merge-audit-v1`
Generated at: `2026-05-19T20:53:24.155Z`
Report path: `docs/audits/2026-05-19-foundation-deep-merge-audit.md`

## Morning Read

- Status: `deep_review_executed`
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev.
- Deterministic findings: 13 total (0 P0, 6 P1, 7 P2, 0 P3)
- Changed files selected: 857
- High-risk review targets: 18
- LLM review mode: `bounded_senior_review_executed`
- Deep senior review rollup: `healthy` (deep senior review executed with 13 finding(s))
- Dogfood against May 13 failures: passed
- Doc/report artifact bloat: `healthy` (0 red, 0 yellow)

## Diff Summary

- Previous report: `docs/handoffs/nightly-deep-audit-2026-05-18.json`
- New findings: 12
- Still open: 0
- Resolved: 0
- Finding delta: 12

## LLM Review Boundary

- Executed this run: yes
- Selected route: `foundation-synthesis-openclaw-chatgpt`
- Provider/model: `openclaw / openai-codex/gpt-5.4`
- Route blocker: none
- Finding count: 13
- Note: Deep senior review executed through the approved router with report-only/no-autofix posture.

Deep senior review executed through the approved router.

## Senior Review Findings

- P1 Verifier mixes active sprint assertions with historical closeout proof (scripts/foundation-verify.mjs:3073) -> ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001; owner=Foundation Verification; next=Split historical closeout validation from active sprint readiness assertions so each path uses its own state model and proof inputs.
- P1 Foundation client still embeds a large current-state renderer monolith (public/foundation.js:1) -> FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001; owner=Foundation Frontend; next=Extract current-state and backlog rendering into narrower surface-owned modules and leave public/foundation.js as orchestration only.
- P1 Foundation Hub route still builds many domains in one handler (server.js:1) -> FOUNDATION-HUB-PAYLOAD-EXTRACT-001; owner=Foundation Runtime; next=Continue extracting Foundation Hub payload assembly into bounded domain loaders with slimmer route contracts and measured payload budgets.
- P1 Foundation UI current-state summary truth is still hardcoded in a check path (scripts/process-extract-current-check.mjs:363) -> FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001; owner=Foundation Process; next=Move current-state summary text and expectations to live source-backed payload builders instead of check-script literals.
- P1 Source contract count is encoded as an exact baseline (lib/foundation-current-sprint.js:916) -> SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001; owner=Foundation Source; next=Replace exact count baselines with dynamic registry-backed lifecycle checks and update focused proofs to consume the same contract.
- P1 Dynamic source-count check duplicates the hardcoded baseline assumption (scripts/process-source-lifecycle-dynamic-counts-check.mjs:187) -> SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001; owner=Foundation Source; next=Make the focused dynamic-counts proof derive expectations from live source contracts instead of a fixed baseline literal.
- P2 Admin deal policy dates are duplicated across job config and runner logic (lib/foundation-jobs.js:981) -> ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001; owner=Ops Source Truth; next=Promote review-policy dates into one source contract that both job definitions and runner code consume.
- P2 Plan Critic approval threshold appears as raw 9.8 literals across files (lib/foundation-current-sprint.js:342) -> watch_or_review; owner=Plan Critic; next=Move the threshold into a shared registry or contract and update all readers and checks to consume that single source.
- P2 Build closeout history remains code-owned operational data (lib/foundation-build-log.js:1) -> watch_or_review; owner=Foundation Process; next=Extract closeout registry data into a dedicated data-backed source and keep code focused on reading and validating it.
- P2 Build Log still shells out to git and returns duplicated payload shapes (server.js:333) -> watch_or_review; owner=Foundation Runtime; next=Cache request-time build-log metadata, remove duplicate payload fields, and avoid per-request git shelling where possible.
- P2 Build Intel expected truth is pinned to a fixed commit baseline (lib/gstack-build-intel.js:20) -> watch_or_review; owner=Build Intel; next=Replace the pinned expected commit with classified baseline metadata or freshness rules that tolerate approved forward movement.
- P2 Focused checks assert exact dated active sprint IDs (lib/foundation-current-sprint.js:103) -> watch_or_review; owner=Foundation Process; next=Route focused checks through historical-aware sprint metadata instead of exact dated ID comparisons in code.
- P2 Foundation CSS surfaces are large enough to raise DOM rebuild and frontend drift risk (public/styles-foundation-workflows.css:1) -> watch_or_review; owner=Foundation Frontend; next=Split Foundation CSS by surface ownership and reduce shared DOM/layout coupling for workflow and core panels.

## Endpoint And Payload Trend

- /api/foundation-hub: 110ms, 522729B, risk=healthy (Within V1 audit budget.)
- /api/source-of-truth: 19ms, 196034B, risk=healthy (Within V1 audit budget.)
- /api/foundation/source-lifecycle: 379ms, 623281B, risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: 110ms, 416378B, risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: 29ms, 31638B, risk=healthy (Within V1 audit budget.)

## Largest Files

- scripts/foundation-verify.mjs: 4973 LOC, 275714B
- public/foundation.js: 2998 LOC, 113633B
- lib/foundation-db-schema-seed-store.js: 2653 LOC, 137639B
- lib/foundation-build-closeout-tightening-records.js: 2599 LOC, 226069B
- public/styles-foundation-workflows.css: 2591 LOC, 50351B
- lib/foundation-source-crawl-store.js: 2506 LOC, 111553B
- lib/foundation-build-closeout-overnight-records.js: 2446 LOC, 192241B
- public/styles-foundation-core.css: 2291 LOC, 43082B
- lib/foundation-db.js: 2261 LOC, 90410B
- lib/foundation-build-closeout-source-records.js: 2159 LOC, 182727B

## High-Risk Review Packets

### P0 scripts/foundation-verify.mjs

- Lines: 4973
- Bytes: 275714
- Reasons: changed_since_baseline, over_3k_warn, verifier_trust_surface

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
- Reasons: changed_since_baseline, frontend_route_cache_surface

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

### P1 lib/foundation-db-schema-seed-store.js

- Lines: 2653
- Bytes: 137639
- Reasons: changed_since_baseline

```
        } catch {
          // The connection is about to be released; ignore unlock cleanup failures.
        }
      }
      client.release()
    }
  }

  async function bootstrapFoundationDb(options = {}) {
    return initFoundationDb({ ...options, includeBootstrapSeed: true })
  }

  return {
    initFoundationDb,
    bootstrapFoundationDb,
  }
}

export function evaluateFoundationDbSchemaSeedSplit({
  foundationDbSource = '',
  schemaSeedSource = '',
  foundationDbLineCount = countTextLines(foundationDbSource),
  preSplitFoundationDbLineCount = FOUNDATION_DB_SCHEMA_SEED_SPLIT_PRE_SPLIT_LINES,
  auditFindingIds = [],
} = {}) {
  const checks = []
  const rootInitPattern = new RegExp('export\\s+async\\s+function\\s+initFoundationDb\\s*\\(|async\\s+function\\s+initFoundationDb\\s*\\(').test(foundationDbSource)
  const rootSeedTablePattern = new RegExp('async\\s+function\\s+seedTable\\s*\\(').test(foundationDbSource)
  const auditIds = new Set((Array.isArray(auditFindingIds) ? auditFindingIds : []).map(String))

  addCheck(
    checks,
    foundationDbSource.includes("import { createFoundationDbSchemaSeedStore } from './foundation-db-schema-seed-store.js'"),
    'foundation-db imports dedicated schema/seed initializer module',
    'import marker present',
  )
  addCheck(
    checks,
    foundationDbSource.includes('const foundationDbSchemaSeedStore = createFoundationDbSchemaSeedStore({') &&
      foundationDbSource.includes('export const initFoundationDb = foundationDbSchemaSeedStore.initFoundationDb') &&
      foundationDbSource.includes('export const bootstrapFoundationDb = foundationDbSchemaSeedStore.bootstrapFoundationDb'),
    'foundation-db keeps stable public init/bootstrap delegates',
    'delegate exports present',
  )
  addCheck(
    checks,
    !rootInitPattern,
    'foundation-db no longer owns inline initFoundationDb implementation',
```

### P1 lib/foundation-build-closeout-tightening-records.js

- Lines: 2599
- Bytes: 226069
- Reasons: changed_since_baseline

```
export const verifierTighteningCloseoutRecords = [
  {
    key: 'foundation-db-schema-seed-split-v1',
    backlogIds: ['FOUNDATION-DB-SCHEMA-SEED-SPLIT-001'],
    match: {
      subjectIncludes: ['FOUNDATION-DB-SCHEMA-SEED-SPLIT-001', 'foundation-db-schema-seed-split-v1', 'Foundation DB schema seed split', 'DB schema/bootstrap initializer boundary'],
    },
    operatorCloseout: true,
    mentionedBacklogIds: [
      'FOUNDATION-MONOLITH-RISK-AUDIT-001',
      'FOUNDATION-DB-INIT-SEED-SPLIT-001',
      'DB-SEED-001',
      'FOUNDATION-DB-MONOLITH-SPLIT-005',
      'BUILD-CLOSEOUT-REGISTRY-EXTRACT-001',
    ],
    systemArea: 'Foundation DB monolith cleanup / schema-bootstrap initializer boundary',
    status: 'accepted',
    acceptanceState: 'Verified',
    whatChanged: 'Extracted the Foundation DB schema/bootstrap initializer and local seed helper from `lib/foundation-db.js` into `lib/foundation-db-schema-seed-store.js`, while keeping the existing public `initFoundationDb` and `bootstrapFoundationDb` exports as delegates.',
    whatItDoes: 'Keeps schema initialization, explicit bootstrap seed posture, static seed imports, evaluator proof, and split dogfood under one focused DB initializer module instead of leaving that responsibility in the root DB file.',
    whyItMatters: 'The May 18 audit correctly called out that the DB root still mixed schema, seed/bootstrap, stores, and query APIs. This split removes that root ownership without changing startup semantics or letting the audit silence itself through substring-only proof.',
    whereItLives: [
      'lib/foundation-db-schema-seed-store.js schema/bootstrap initializer factory, split evaluator, and dogfood',
      'lib/foundation-db.js stable init/bootstrap delegate exports',
      'lib/code-quality-nightly-audit.js pattern-gated DB monolith detector',
      'lib/foundation-core-seed.js core seed split evaluator accepts the schema/seed module owner',
      'lib/foundation-db-split-verifier.js DB split verifier reads the schema/seed module',
      'lib/foundation-process-hardening-verifier.js process-hardening verifier accepts module-owned bootstrap proof',
      'lib/foundation-verifier-module-assurance.js foundation:verify coverage for this split',
      'scripts/process-foundation-db-schema-seed-split-check.mjs focused read-only proof',
      'package.json process:foundation-db-schema-seed-split-check',

```

### P1 public/styles-foundation-workflows.css

- Lines: 2591
- Bytes: 50351
- Reasons: changed_since_baseline

```
.build-log-list {
  display: grid;
  gap: 10px;
}

.build-log-executive-summary {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 1.5fr);
  gap: 18px;
  align-items: stretch;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  padding: 18px;
}

.build-log-executive-copy {
  display: grid;
  gap: 8px;
  align-content: start;
}

.build-log-executive-copy h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.22rem;
  line-height: 1.25;
}

.build-log-executive-copy p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.92rem;
  line-height: 1.5;
}

.build-log-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.build-log-summary-metric {
  display: grid;
  gap: 4px;
  min-width: 0;
  border: 1px solid var(--border);
```

### P1 lib/foundation-source-crawl-store.js

- Lines: 2506
- Bytes: 111553
- Reasons: changed_since_baseline, source_health_surface

```
import { randomUUID } from 'node:crypto'
import {
  EXTRACTION_RETRY_STATES,
  buildExtractionNextSafeCommand,
  buildExtractionRunHardeningStatus,
  classifyExtractionItemRetry,
  normalizeExtractionRetryPolicy,
} from './extraction-run-hardening.js'
import { buildExtractRetireRunUpdate } from './extract-retire.js'

export const FOUNDATION_SOURCE_CRAWL_STORE_SPLIT_CARD_ID = 'FOUNDATION-DB-MONOLITH-SPLIT-012'
export const FOUNDATION_SOURCE_CRAWL_STORE_SPLIT_SPRINT_ID = 'foundation-db-source-crawl-store-split-2026-05-16'
export const FOUNDATION_SOURCE_CRAWL_STORE_SPLIT_CLOSEOUT_KEY = 'foundation-source-crawl-store-split-v1'
export const FOUNDATION_SOURCE_CRAWL_STORE_SPLIT_PLAN_PATH = 'docs/process/foundation-db-source-crawl-store-split-012-plan.md'
export const FOUNDATION_SOURCE_CRAWL_STORE_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-012.json'
export const FOUNDATION_SOURCE_CRAWL_STORE_SPLIT_SCRIPT_PATH = 'scripts/process-foundation-source-crawl-store-split-check.mjs'
export const FOUNDATION_SOURCE_CRAWL_STORE_PRE_SPLIT_LINES = 8270

const SOURCE_CRAWL_STALE_RUN_MINUTES = 30

function countTextLines(source = '') {
  const text = String(source || '')
  if (!text) return 0
  const newlineCount = (text.match(/\n/g) || []).length
  return newlineCount + (text.endsWith('\n') ? 0 : 1)
}

function addCheck(checks, condition, check, detail = '') {
  checks.push({ ok: Boolean(condition), check, detail })
}

export function evaluateFoundationSourceCrawlStoreSplit({
  foundationDbSource = '',
  moduleSource = '',
  scriptSource = '',
  planSource = '',
  afterLines = countTextLines(foundationDbSource),
  beforeLines = FOUNDATION_SOURCE_CRAWL_STORE_PRE_SPLIT_LINES,
} = {}) {
  const checks = []
  const normalizedPlanSource = String(planSource || '').toLowerCase()
  addCheck(
    checks,
    moduleSource.includes('export function createFoundationSourceCrawlStore') &&
      moduleSource.includes('async function getStaleSourceCrawlTargetRuns') &&
      moduleSource.includes('async function markStaleSourceCrawlTargetRuns') &&
      moduleSource.includes('async function upsertSourceCrawlTarget') &&
      moduleSource.includes('async function upsertSourceCrawlItem') &&
```

### P1 lib/foundation-build-closeout-overnight-records.js

- Lines: 2446
- Bytes: 192241
- Reasons: changed_since_baseline

```
import { dbProcessCloseoutRecords } from './foundation-build-closeout-db-process-records.js'
import { routeFrontendCloseoutRecords } from './foundation-build-closeout-route-frontend-records.js'
import { verifierRuntimeCloseoutRecords } from './foundation-build-closeout-verifier-runtime-records.js'
export const overnightCloseoutRecords = [
  {
    key: 'db-constraint-doc-update-supersedes-v1',
    backlogIds: ['DB-CONSTRAINT-001'],
    match: {
      subjectIncludes: [
        'DB-CONSTRAINT-001',
        'db-constraint-doc-update-supersedes-v1',
        'Harden doc update decision supersession',
        'doc-update decision supersession',
        'doc-update-applied supersedes',
      ],
    },
    operatorCloseout: true,
    mentionedBacklogIds: [
      'FOUNDATION-DB-MONOLITH-SPLIT-007',
      'VERIFIER-CORE-GOVERNANCE-SPLIT-MODULE-001',
    ],
    systemArea: 'Foundation DB governance / decisions and doc updates',
    status: 'accepted',
    acceptanceState: 'Verified',
    whatChanged: 'Made approved pending-doc-update apply semantics match normal decision supersession semantics for linked decisions.',
    whatItDoes: 'When a pending doc update is applied and linked to a decision, the decision store now locks the linked decision and applies its supersedesIds through the existing supersession path, recording applied supersession metadata on both decision and doc-update change events.',
    whyItMatters: 'Foundation decisions are supposed to cascade cleanly. Before this slice, a doc update could lock a replacement decision while leaving the older superseded decision active, creating contradictory governance truth.',
    whereItLives: [
      'lib/foundation-decision-store.js lockDecisionFromDocUpdate and doc-update apply supersession metadata',
      'lib/db-constraint-hardening.js DB-CONSTRAINT constants, source evaluator, and fake-client dogfood proof',
      'scripts/process-db-constraint-check.mjs read-only focused proof',
      'lib/foundation-core-governance-verifier.js DB-CONSTRAINT verifier coverage',
      'scripts/process-verifier-core-governance-split-module-check.mjs core-governance regression proof input',
      'scripts/foundation-verify.mjs full verifier dogfood input wiring',
      'package.json process:db-constraint-check',
      'docs/process/db-constraint-001-plan.md',
      'docs/process/approvals/DB-CONSTRAINT-001.json',
      'docs/_a
```

### P1 public/styles-foundation-core.css

- Lines: 2291
- Bytes: 43082
- Reasons: changed_since_baseline

```
/* ── PANELS ── */
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: var(--shadow-sm);
  min-width: 0;
}

.section-intro {
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.65;
  margin-bottom: 18px;
  max-width: 820px;
}

.panel h3 {
  font-family: 'stratum-1-web', 'Arial Black', sans-serif;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  font-size: 1.4rem;
  margin: 6px 0 0;
  color: var(--text-primary);
}

.strategy-panel {
  background: transparent;
  border: 0;
  box-shadow: none;
  padding: 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 20px;
  margin-bottom: 16px;
}

.foundation-home-hero h1 {
  font-family: 'stratum-1-web', 'Arial Black', sans-serif;
  font-weight: 900;
  text-transform: uppercase;
```

### P1 lib/foundation-db.js

- Lines: 2261
- Bytes: 90410
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

### P1 lib/foundation-build-closeout-source-records.js

- Lines: 2159
- Bytes: 182727
- Reasons: changed_since_baseline, source_health_surface

```
export const sourceCloseoutRecords = [
  {
    key: 'source-maturity-strategy-monitoring-gap-repair-v1',
    backlogIds: ['SOURCE-MATURITY-STRATEGY-MONITORING-GAP-REPAIR-001'],
    match: {
      subjectIncludes: [
        'SOURCE-MATURITY-STRATEGY-MONITORING-GAP-REPAIR-001',
        'source maturity Strategy monitoring gap repair',
        'Repair Strategy source maturity monitoring gap',
        'Strategy monitoring gap repair',
        'source-maturity-strategy-monitoring-gap-repair-v1',
        'SRC-STRATEGY-001',
      ],
    },
    operatorCloseout: true,
    mentionedBacklogIds: [
      'SOURCE-MATURITY-GAP-FOLLOWUP-001',
      'FOUNDATION-KB-COMPILER-V1-001',
    ],
    systemArea: 'Foundation source readiness',
    status: 'accepted',
    acceptanceState: 'Verified',
    whatChanged: 'Added an explicit manual/on-demand monitoring boundary to the signed-off Strategy source contract.',
    whatItDoes: 'Lets the source maturity grid treat SRC-STRATEGY-001 as monitored without claiming background strategy automation, live extraction, model calls, atom-flow, synthesis, routing, Strategy Hub recommendations, or external writes are complete.',
    whyItMatters: 'Strategy source facts already exist and are signed off; the missing refresh posture was a false noisy blocker that kept the source from exposing the next real maturity gap.',
    whereItLives: [
      'lib/source-contracts.js SRC-STRATEGY-001 updateMethod/refreshSchedule/manualRefresh',
      'lib/source-maturity-strategy-monitoring-gap-repair.js focused repair contract and dogfood proof',
      'scripts/process-source-maturity-strategy-monitoring-gap-repair-check.mjs focused proof and Current Sprint progression',
      'docs/source-registry.md Strategy monitoring boundary note',
      'docs/process/source-maturity-strategy-monitoring-gap-repair-001-plan.md',
      'docs/process/approvals/SOURCE-MATURITY-STRATEGY-MONITORING-GAP-REPAIR-001.json',
      'docs/_archive/handoffs/2026-05-29-hot-doc-refresh/2026-05-18-source-maturity-strategy-monitoring-gap-repair-closeout.md',
      'lib/foundation-verify-coverage-card-ids.js done-card coverage',
    ],
    proofCommands: [
      'node --check lib/source-maturity-strategy-monitoring-gap-repair.js scripts/process-source-maturity-strategy-monitoring-gap-repair-check.mjs',
      'npm run source-contract-registry:sync -- --apply --actor=codex-source-maturity-strategy-monitoring-gap-repair --j
```

### P1 lib/foundation-shared-comms-store.js

- Lines: 2150
- Bytes: 86906
- Reasons: changed_since_baseline

```
import { randomUUID } from 'node:crypto'

import {
  SYNTHESIS_VERIFICATION_METADATA_KEY,
  buildSynthesisEvidenceIndex,
  isDecisionGradeActionRoute,
  summarizeVerificationResults,
  verifySynthesizedRecord,
} from './synthesis-claim-verification.js'

export const FOUNDATION_SHARED_COMMS_STORE_SPLIT_CARD_ID = 'FOUNDATION-DB-MONOLITH-SPLIT-009'
export const FOUNDATION_SHARED_COMMS_STORE_SPLIT_SPRINT_ID = 'foundation-db-shared-comms-store-split-2026-05-16'
export const FOUNDATION_SHARED_COMMS_STORE_SPLIT_CLOSEOUT_KEY = 'foundation-shared-comms-store-split-v1'
export const FOUNDATION_SHARED_COMMS_STORE_SPLIT_PLAN_PATH = 'docs/process/foundation-db-shared-comms-store-split-009-plan.md'
export const FOUNDATION_SHARED_COMMS_STORE_SPLIT_APPROVAL_PATH = 'docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-009.json'
export const FOUNDATION_SHARED_COMMS_STORE_SPLIT_SCRIPT_PATH = 'scripts/process-foundation-shared-comms-store-split-check.mjs'
export const FOUNDATION_SHARED_COMMS_STORE_SPLIT_BEFORE_LINES = 11187

function countTextLines(source = '') {
  const text = String(source || '')
  if (!text) return 0
  const newlineCount = (text.match(/\n/g) || []).length
  return newlineCount + (text.endsWith('\n') ? 0 : 1)
}

function addEvaluationCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail: String(detail || '') })
}

export function createFoundationSharedCommunicationStore(deps = {}) {
  const {
    pool,
    withFoundationTransaction,
    getNextPrefixedId,
    normalizeBacklogScopeKey,
    mapBacklogRow,
    normalizeDecisionCategory,
    normalizeDecisionIdList,
    normalizeStringList,
    mapDecisionRow,
    mapOpenQuestionRow,
    insertChangeEvent,
    getRegisteredSourceIds,
  } = deps

  if (!pool || typeof pool.query !== 'function') {
    throw new Error('Shared communications store requires a queryable pool.')
  }
```

### P1 lib/foundation-runtime-reliability-verifier.js

- Lines: 2023
- Bytes: 127084
- Reasons: changed_since_baseline

```
      Number(foundationHubSummary.foundationHubPerformance?.payloadBytes || 0) <= FOUNDATION_HUB_SUMMARY_BUDGET.maxPayloadBytes &&
      foundationHubFull.foundationHubPerformance?.mode === 'full' &&
      foundationHubFull.sharedCommunicationSynthesis &&
      foundationHubFull.extractionControl &&
      foundationHubFull.llmRuntime &&
      foundationHubFull.driveCorpusInventory &&
      packageScripts['process:foundation-performance-check'] === `node --env-file-if-exists=.env ${FOUNDATION_PERFORMANCE_SCRIPT_PATH}` &&
      sources.hubReadRoutesSource?.includes('getFoundationCoreSnapshot') &&
      sources.hubReadRoutesSource?.includes("app.get('/api/foundation-hub'") &&
      sources.hubReadRoutesSource?.includes('normalizeFoundationHubMode') &&
      sources.foundationFrontendSource?.includes('fetchFoundationHubFull') &&
      sources.foundationFrontendSource?.includes('/api/foundation-hub?view=full') &&
      sources.foundationDbSource?.includes('getFoundationCoreSnapshot') &&
      sources.foundationHubPerformanceSource?.includes('/api/foundation-hub?view=full') &&
      sources.foundationHubPerformanceSource?.includes('buildSyntheticFoundationHubBudgetProof') &&
      sources.foundationPerformanceScriptSource?.includes('default Foundation Hub route stays under latency and payload budget') &&
      sources.foundationBuildLogRegistrySource?.includes(FOUNDATION_PERFORMANCE_CLOSEOUT_KEY) &&
      includesAll(foundationVerifySource, FOUNDATION_PERFORMANCE_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE),
    'FOUNDATION-PERFORMANCE-001 makes default Foundation Hub fast while preserving full diagnostics',
    foundationPerformanceCard
      ? `lane=${foundationPerformanceCard.lane} dogfood=${proofs.foundationPerformanceProof.ok ? 'pass' : 'blocked'} summary=${foundationHubSummary.foundationHubPerformance?.payloadBytes || 'missing'}B closeout=${foundationPerformanceCloseout?.key || 'missing'}`
      : `missing ${FOUNDATION_PERFORMANCE_CARD_ID}`,
  )

  const foundationFullDiagnosticsPerfCards = FOUNDATION_FULL_DIAGNOSTICS_PERF_DONE_CARD_IDS_FOR_VERIFIER_COVERAGE.map(id => findCard(cards, id))
  const foundationFullDiagnosticsPerfCloseout = findCloseout(closeouts, FOUNDATION_FULL_DIAGNOSTICS_CLOSEOUT_KEY)
  addCheck(
    checks,
    foundationFullDiagnosticsPerfCards.every(card =>
      card &&
      card.lane === 'done' &&
      String(card.statusNote || '').includes(FO
```

### P1 server.js

- Lines: 2023
- Bytes: 66109
- Reasons: changed_since_baseline, hot_route_surface

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

### P1 lib/foundation-agent-feedback-verifier.js

- Lines: 1945
- Bytes: 110005
- Reasons: changed_since_baseline

```
import { validatePlanApprovalFile } from './approval-integrity.js'
import {
  AGENT_ONBOARDING_FEEDBACK_SYSTEM_APPROVAL_PATH,
  AGENT_ONBOARDING_FEEDBACK_SYSTEM_APPROVED_PLAN_PATH,
  AGENT_ONBOARDING_FEEDBACK_SYSTEM_BASELINE_PATH,
  AGENT_ONBOARDING_FEEDBACK_SYSTEM_CARD_ID,
  AGENT_ONBOARDING_FEEDBACK_SYSTEM_CLOSEOUT_KEY,
  AGENT_ONBOARDING_FEEDBACK_SYSTEM_EMPTY_AUDIT_CARD_ID,
  AGENT_ONBOARDING_FEEDBACK_SYSTEM_HARD_BOUNDARIES,
  AGENT_ONBOARDING_FEEDBACK_SYSTEM_MANUAL_REVIEW_PATH,
  buildAgentOnboardingFeedbackSystemStatus,
} from './agent-onboarding-feedback-system.js'
import {
  AGENT_FEEDBACK_AUTO_SEND_APPROVAL_PATH,
  AGENT_FEEDBACK_AUTO_SEND_APPROVED_PLAN_PATH,
  AGENT_FEEDBACK_AUTO_SEND_CARD_ID,
  AGENT_FEEDBACK_AUTO_SEND_CLOSEOUT_KEY,
  AGENT_FEEDBACK_AUTO_SEND_JOB_KEY,
  AGENT_FEEDBACK_AUTO_SEND_READINESS_PROOF_PATH,
  AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CLOSEOUT_KEY,
  AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_PROOF_PATH,
  buildAgentFeedbackAutoSendStatus,
} from './agent-feedback-auto-send.js'
import {
  AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_APPROVAL_PATH,
  AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_APPROVED_PLAN_PATH,
  AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CARD_ID,
  AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_CLOSEOUT_KEY,
  AGENT_FEEDBACK_COMPANY_EMAIL_POLICY_PROOF_PATH,
  AGENT_FEEDBACK_PRODUCTION_AUTOSEND_ENABLE_CARD_ID,
  AGENT_FEEDBACK_STEVE_FULL_LOOP_TEST_CARD_ID,
  buildAgentFeedbackCompanyEmailPolicyStatus,
} from './agent-feedback-company-email-policy.js'
import {
  AGENT_FEEDBACK_LIVE_REMINDERS_APPROVAL_PATH,
  AGENT_FEEDBACK_LIVE_REMINDERS_APPROVED_PLAN_PATH,
  AGENT_FEEDBACK_LIVE_REMINDERS_CARD_ID,
  AGENT_FEEDBACK_LIVE_REMINDERS_CLOSEOUT_KEY,
  AGENT_FEEDBACK_LIVE_REMINDERS_LIVE_APPROVAL_PATH,
  AGENT_FEEDBACK_LIVE_REMINDERS_PROOF_PATH,
  AGENT_FEEDBACK_REMINDER_APPROVAL_PATH,
  AGENT_FEEDBACK_REMINDER_APPROVED_PLAN_PATH,
  AGENT_FEEDBACK_REMINDER_CARD_ID,
  AGENT_FEEDBACK_REMINDER_CLOSEOUT_KEY,
  AGENT_FEEDBACK_REMINDER_JOB_KEY,
  AGENT_FEEDBACK_REMINDER_PROOF_PATH,
  buildAgentFeedbackReminderStatus,
} from './agent-feedback-reminders.js'
```

### P1 public/styles-strategy-sales.css

- Lines: 1933
- Bytes: 35369
- Reasons: changed_since_baseline

```
.strategy-v2-hero-copy {
  display: grid;
  gap: 8px;
  min-width: 0;
  max-width: 760px;
}

.strategy-v2-hero-status {
  display: grid;
  justify-items: end;
  gap: 10px;
  min-width: 0;
}

.strategy-v2-hero .eyebrow,
.strategy-v2-hero p {
  color: var(--text-secondary);
}

.strategy-v2-hero h1 {
  max-width: 620px;
  margin: 7px 0 8px;
  color: var(--text-primary);
  font-family: 'stratum-1-web', 'Arial Black', sans-serif;
  font-size: clamp(1.7rem, 2.4vw, 2.35rem);
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1.02;
  text-transform: uppercase;
}

.strategy-v2-status-strip,
.strategy-v2-route-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}

.strategy-v2-panel {
  display: grid;
  gap: 18px;
  border-radius: var(--radius-sm);
}

.strategy-v2-muted {
  max-width: 78ch;
  color: var(--text-secondary);
```

### P1 public/foundation-runtime-renderers.js

- Lines: 1901
- Bytes: 79848
- Reasons: changed_since_baseline

```
}

function renderFoundationPurposeCard(config) {
  var article = document.createElement('article')
  article.className = 'foundation-purpose-card'

  var icon = document.createElement('div')
  icon.className = 'foundation-purpose-icon'
  icon.innerHTML = config.icon
  article.appendChild(icon)

  var title = document.createElement('h3')
  title.textContent = config.title
  article.appendChild(title)

  var body = document.createElement('p')
  body.textContent = config.body
  article.appendChild(body)

  return article
}

function renderFoundationModuleCard(section) {
  var article = document.createElement('article')
  article.className = 'foundation-module-card'

  var title = document.createElement('h4')
  title.textContent = section.title
  article.appendChild(title)

  var excerpt = document.createElement('p')
  excerpt.textContent = section.content.split('\n')[0]
  article.appendChild(excerpt)

  var actions = document.createElement('div')
  actions.className = 'foundation-module-actions'

  var openPacket = document.createElement('a')
  openPacket.className = 'secondary-button'
  openPacket.href = '/foundation#overview'
  openPacket.textContent = 'Open Packet'
  actions.appendChild(openPacket)

  var supportDoc = sectionSupportDocs[section.title]
  if (supportDoc) {
    var supportLink = document.createElement('a')
    supportLink.className = 'secondary-button'
    supportLink.href = buildDocHref(supportDoc.path, 'docs/business-strategy.md')
```

### P1 lib/foundation-verifier-source-once-over-progression.js

- Lines: 1775
- Bytes: 91614
- Reasons: changed_since_baseline, source_health_surface

```
import { PLAN_CRITIC_MIN_PASS_SCORE } from './process-plan-critic.js'
import { FOUNDATION_SOURCE_ONCE_OVER_SPRINT_ID } from './foundation-current-sprint.js'
import {
  STRATEGY_HUB_MEETING_READY_CARD_ID,
  STRATEGY_HUB_MEETING_READY_CLOSEOUT_KEY,
  STRATEGY_HUB_MEETING_READY_PLAN_PATH,
  STRATEGY_HUB_MEETING_READY_SCRIPT_PATH,
  STRATEGY_HUB_MEETING_READY_SUMMARY_MARKER,
} from './strategy-hub-meeting-ready.js'
import {
  AVATAR_IMPORT_CARD_ID,
  AVATAR_IMPORT_CLOSEOUT_KEY,
  AVATAR_IMPORT_PLAN_PATH,
  AVATAR_IMPORT_SCRIPT_PATH,
  AVATAR_IMPORT_SUMMARY_MARKER,
  MARKETING_AVATAR_EXPECTED_COUNTS,
} from './marketing-avatar-registry.js'
import {
  AUTO_DEPLOY_ROLLBACK_CARD_ID,
  AUTO_DEPLOY_ROLLBACK_CLOSEOUT_KEY,
  AUTO_DEPLOY_ROLLBACK_PLAN_PATH,
  AUTO_DEPLOY_ROLLBACK_RUNNER_PATH,
  AUTO_DEPLOY_ROLLBACK_SCRIPT_PATH,
  AUTO_DEPLOY_ROLLBACK_SUMMARY_MARKER,
} from './auto-deploy-rollback.js'
import {
  SOURCE_MATURITY_GRID_CARD_ID,
  SOURCE_MATURITY_GRID_CLOSEOUT_KEY,
  SOURCE_MATURITY_GRID_PLAN_PATH,
  SOURCE_MATURITY_GRID_SCRIPT_PATH,
  SOURCE_MATURITY_GRID_SUMMARY_MARKER,
  SOURCE_MATURITY_STAGE_KEYS,
} from './source-maturity-grid.js'
import {
  EXTRACT_RUN_HARDENING_CARD_ID,
  EXTRACT_RUN_HARDENING_CLOSEOUT_KEY,
} from './extraction-run-hardening.js'
import {
  SOURCE_EXTRACTION_COVERAGE_CARD_ID,
  SOURCE_EXTRACTION_COVERAGE_CLOSEOUT_KEY,
  SOURCE_EXTRACTION_COVERAGE_PLAN_PATH,
  SOURCE_EXTRACTION_COVERAGE_SCRIPT_PATH,
  SOURCE_EXTRACTION_COVERAGE_STATES,
  SOURCE_EXTRACTION_COVERAGE_SUMMARY_MARKER,
} from './source-extraction-coverage.js'
import {
  SOURCE_COVERAGE_CLOSEOUT_CARD_ID,
  SOURCE_COVERAGE_CLOSEOUT_CLOSEOUT_KEY,
```

### P1 lib/foundation-build-closeout-control-plane-records.js

- Lines: 1732
- Bytes: 127800
- Reasons: changed_since_baseline

```
    operatorCloseout: true,
    mentionedBacklogIds: [
      'PLAN-CRITIC-ARCHITECTURAL-RULES-001',
    ],
    systemArea: 'Foundation runtime safety hardening',
    status: 'accepted',
    acceptanceState: 'Verified',
    whatChanged: 'Made the live foundation:verify retry path read-only, added a process-check write posture guard, blocked scheduled mutating process-check jobs from the Foundation worker/job runner, split default Foundation DB init from explicit seed/bootstrap writes, guarded Current Sprint overlay mutation, and locked backlog item updates against silent lost writes.',
    whatItDoes: 'The verifier can still retry bounded transient failures, but it no longer attaches a repair hook that can make broken live state green before reporting success. Process check scripts now route audited close/report/sprint mutation paths through an explicit apply/write guard. Foundation job definitions now carry mutation posture and the scheduler blocks process-check jobs that are mutating or unknown. `initFoundationDb()` now runs schema setup only by default; seed/bootstrap writes require the explicit `bootstrapFoundationDb()` / `foundation:db-bootstrap` path. `upsertFoundationCurrentSprintOverlay()` now requires explicit apply posture, expected previous active sprint id, and explicit item replacement approval before it can close active sprints or replace sprint items. `updateBacklogItem()` now locks the target row before merging fields, and backlog change events carry full before/after state plus changed fields. Focused dogfood proofs recreate the old repair-then-pass pattern, a no-flag check write attempt, a scheduled mutating check, the old schema-init-writes-live-truth failure mode, the old broad Current Sprint helper mutation, and the old stale backlog merge write that loses one writer, then prove the new paths fail closed, require explicit posture, leave watched truth rows unchanged, or preserve both concurrent backlog writes.',
    whyItMatters: 'Steve asked for the rebuild to be tight enough that green gates mean real health and check commands are safe to run. A verifier that repairs what it verifies, check scripts that quietly mutate live state, scheduled checks that can close backlog/sprint rows, an init function that rewrites backlog/source/sprint truth, a broad sprint overlay helper that can replace active sprint truth, and backlog writes that silent
```

## Top Deterministic Findings

- P1 active-vs-historical-verifier-mixing: Verifier mixes active sprint assertions with historical closeout proof -> ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001
- P1 foundation-client-current-state-monolith: Foundation client embeds a large current-state renderer -> FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001
- P1 foundation-hub-route-monolith: Foundation Hub route builds many domains in one handler -> FOUNDATION-HUB-PAYLOAD-EXTRACT-001
- P1 hardcoded-foundation-ui-current-summary: Foundation UI embeds current-state summary truth -> FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001
- P1 hardcoded-source-count-baseline: Source contract count is encoded as an exact baseline -> SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001
- P1 hardcoded-source-count-baseline: Source contract count is encoded as an exact baseline -> SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001
- P2 admin-deal-policy-date-duplication: Admin deal-review policy dates are duplicated across runner, job config, and UI -> ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001
- P2 approval-threshold-raw-literal: Plan Critic 9.8 threshold appears as raw literals -> APPROVAL-THRESHOLD-REGISTRY-001
- P2 build-closeout-code-owned-data: Build closeout history is code-owned data -> BUILD-CLOSEOUT-REGISTRY-EXTRACT-001
- P2 build-log-request-time-git-and-duplication: Build Log shells out to git and returns duplicate group/build payloads -> BUILD-LOG-API-CACHE-AND-SLIM-001
- P2 fixed-build-intel-commit-baseline: Build Intel commit is pinned as expected truth -> BUILD-INTEL-SNAPSHOT-BASELINE-001
- P2 focused-check-active-sprint-id-assumption: Focused checks assert exact dated active sprint IDs -> SPRINT-CHECK-HISTORICAL-MODE-001
- P2 foundation-dom-rebuild-risk: Foundation frontend has heavy DOM rebuild signals -> FOUNDATION-FRONTEND-DOM-BUDGET-001

## Doc / Report Artifact Bloat

- Status: `healthy`
- Handoff files: 115
- Handoff hot lines: 7322
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
Generated at: `2026-05-19T20:53:24.790Z`

## Morning Read

- Status: `report_ready`
- Findings: 13 total (0 P0, 6 P1, 7 P2, 0 P3)
- Proposed backlog fixes: 12
- Detection mode: deterministic code first; no LLM detection used.
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev, no feature work.
- Synthetic proof: passed (hardcoded=2, mutator=1, slowEndpoint=risk)

## Endpoint Coverage

- /api/foundation-hub: status=200 latency=110ms payload=522729B risk=healthy (Within V1 audit budget.)
- /api/source-of-truth: status=200 latency=19ms payload=196034B risk=healthy (Within V1 audit budget.)
- /api/foundation/source-lifecycle: status=200 latency=379ms payload=623281B risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: status=200 latency=110ms payload=416378B risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: status=200 latency=29ms payload=31638B risk=healthy (Within V1 audit budget.)

## Asset And Monolith Metrics

Assets:
- public/foundation.html: 8181B raw, 1727B gzip, 119 lines
- public/styles.css: 489B raw, 268B gzip, 12 lines
- public/foundation-nav-config.js: 8407B raw, 2349B gzip, 175 lines
- public/foundation-data.js: 14401B raw, 2982B gzip, 469 lines
- public/foundation-doc-markdown-renderers.js: 37237B raw, 7462B gzip, 1212 lines
- public/foundation.js: 113633B raw, 22327B gzip, 2998 lines
- public/foundation-backlog-renderers.js: 12173B raw, 2904B gzip, 303 lines
- public/foundation-action-route-review-inbox-renderers.js: 9997B raw, 2767B gzip, 234 lines
- public/foundation-source-registry-renderers.js: 57243B raw, 11161B gzip, 1487 lines
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
- status=review, scripts=17, createElement=1669, appendChild=2142, innerHTML=73

Largest files:
- scripts/foundation-verify.mjs: 4973 LOC, 275714B
- public/foundation.js: 2998 LOC, 113633B
- lib/foundation-db-schema-seed-store.js: 2653 LOC, 137639B
- lib/foundation-build-closeout-tightening-records.js: 2599 LOC, 226069B
- public/styles-foundation-workflows.css: 2591 LOC, 50351B
- lib/foundation-source-crawl-store.js: 2506 LOC, 111553B
- lib/foundation-build-closeout-overnight-records.js: 2446 LOC, 192241B
- public/styles-foundation-core.css: 2291 LOC, 43082B

## Top Findings

### P1 Verifier mixes active sprint assertions with historical closeout proof
- Card lane: `VERIFIER-ASSUMPTION-REGISTRY-001`
- Type: `drift_risk`
- Evidence: `scripts/foundation-verify.mjs:3073` (historicalCardHasVerifiedCloseout), `scripts/foundation-verify.mjs:3097` (activeSprintAtOrPast), `scripts/foundation-verify.mjs:3103` (historicalCardHasVerifiedCloseout), `scripts/foundation-verify.mjs:4143` (historicalCardHasVerifiedCloseout), `scripts/foundation-verify.mjs:4348` (activeSprintAtOrPast), `scripts/foundation-verify.mjs:4429` (activeSprintAtOrPast)
- Why it matters: A current-sprint advancement assertion can pass from a historical closeout unless active and historical helpers are separate.
- Proposed owner/card: Foundation Verifier / `ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001`
- Detector: active versus historical helper detector

### P1 Foundation client embeds a large current-state renderer
- Card lane: `FOUNDATION-MONOLITH-RISK-AUDIT-001`
- Type: `refactor_candidate`
- Evidence: `public/foundation.js`
- Why it matters: Large mixed-responsibility surfaces slow audits, increase merge risk, and make future proof harder to isolate.
- Proposed owner/card: Foundation Engineering / `FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001`
- Detector: largest file/function ownership detector
- False-positive note: This is not approval to refactor during the audit sprint.

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
- Evidence: `lib/foundation-current-sprint.js:916`
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

### P2 Admin deal-review policy dates are duplicated across runner, job config, and UI
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `lib/foundation-jobs.js:981` (--backlog-since=), `lib/foundation-jobs.js:981` (2025-06-01), `lib/foundation-jobs.js:984` (June 2025), `lib/foundation-jobs.js:984` (2026-04-01), `lib/foundation-jobs.js:985` (June 2025), `scripts/review-admin-deals.mjs:14` (DEFAULT_BACKLOG_SINCE)
- Why it matters: Policy cutoff changes require manual edits across several surfaces unless a source contract owns the dates.
- Proposed owner/card: Ops Source Truth / `ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001`
- Detector: policy-date duplication detector
- False-positive note: Durable policy dates are acceptable when source ID, owner, and as-of date are explicit.

### P2 Plan Critic 9.8 threshold appears as raw literals
- Card lane: `VERIFIER-ASSUMPTION-REGISTRY-001`
- Type: `drift_risk`
- Evidence: `lib/foundation-current-sprint.js:342` (9.8), `lib/foundation-current-sprint.js:347` (9.8), `lib/foundation-current-sprint.js:486` (9.8), `lib/source-lifecycle-completion.js:682` (9.8), `lib/source-lifecycle-completion.js:682` (9.8), `scripts/process-action-route-dedup-staleness-guard-check.mjs:231` (9.8)
- Why it matters: Approval policy can drift when some checks import the registry constant and others hardcode the score.
- Proposed owner/card: Plan Critic / `APPROVAL-THRESHOLD-REGISTRY-001`
- Detector: raw approval threshold detector
- False-positive note: The canonical constant is valid; duplicated raw literals are the risk.

### P2 Build closeout history is code-owned data
- Card lane: `FOUNDATION-MONOLITH-RISK-AUDIT-001`
- Type: `refactor_candidate`
- Evidence: `lib/foundation-build-log.js`
- Why it matters: Large mixed-responsibility surfaces slow audits, increase merge risk, and make future proof harder to isolate.
- Proposed owner/card: Foundation Engineering / `BUILD-CLOSEOUT-REGISTRY-EXTRACT-001`
- Detector: largest file/function ownership detector
- False-positive note: This is not approval to refactor during the audit sprint.

### P2 Build Log shells out to git and returns duplicate group/build payloads
- Card lane: `FOUNDATION-API-PERF-AUDIT-001`
- Type: `performance_risk`
- Evidence: `server.js:333`, `lib/foundation-build-log.js`
- Why it matters: Request-time subprocess work and duplicated serialized build entries can make Recent Work slow as closeout history grows.
- Proposed owner/card: Foundation Runtime / `BUILD-LOG-API-CACHE-AND-SLIM-001`
- Detector: request-time git log detector

### P2 Build Intel commit is pinned as expected truth
- Card lane: `VERIFIER-ASSUMPTION-REGISTRY-001`
- Type: `drift_risk`
- Evidence: `lib/gstack-build-intel.js:20` (GSTACK_BUILD_INTEL_EXPECTED_COMMIT), `lib/gstack-build-intel.js:313` (GSTACK_BUILD_INTEL_EXPECTED_COMMIT), `lib/gstack-build-intel.js:314` (GSTACK_BUILD_INTEL_EXPECTED_COMMIT), `lib/gstack-build-intel.js:324` (GSTACK_BUILD_INTEL_EXPECTED_COMMIT), `lib/gstack-build-intel.js:391` (GSTACK_BUILD_INTEL_EXPECTED_COMMIT), `lib/gstack-build-intel.js:521` (GSTACK_BUILD_INTEL_EXPECTED_COMMIT)
- Why it matters: A fixed inspected commit is valid snapshot evidence, but it must not be treated as latest Build Intel monitoring truth.
- Proposed owner/card: Build Intel / `BUILD-INTEL-SNAPSHOT-BASELINE-001`
- Detector: expected-commit baseline detector
- False-positive note: Valid when labeled inspected snapshot evidence with an as-of date.

### P2 Focused checks assert exact dated active sprint IDs
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `lib/foundation-current-sprint.js:103` (const FOUNDATION_CURRENT_SPRINT_ID = 'foundation-current-2026-05-12), `lib/foundation-current-sprint.js:145` (const FOUNDATION_SOURCE_ONCE_OVER_SPRINT_ID = 'foundation-source-once-over-2026-05-12), `lib/foundation-verify-registry-split.js:7` (const FOUNDATION_VERIFY_REGISTRY_SPLIT_SPRINT_ID = 'foundation-verify-registry-split-2026-05-18), `lib/kpi-health.js:8` (const KPI_HEALTH_API_CACHE_SPRINT_ID = 'kpi-health-api-cache-2026-05-15), `lib/kpi-health.js:14` (const KPI_HEALTH_DYNAMIC_YEAR_CONTRACT_SPRINT_ID = 'kpi-health-dynamic-year-contract-2026-05-16), `lib/gstack-build-intel.js:13` (const GSTACK_BUILD_INTEL_SPRINT_ID = 'gstack-build-intel-extraction-2026-05-13)
- Why it matters: One-time closeout checks are unsafe as nightly checks after rollover if they hard-fail on the current active sprint.
- Proposed owner/card: Foundation Process / `SPRINT-CHECK-HISTORICAL-MODE-001`
- Detector: dated active-sprint assertion detector
- False-positive note: Active live-truth literals still fail as P0; dated card/sprint metadata is a review finding unless a focused proof hard-fails after rollover.

### P2 Foundation frontend has heavy DOM rebuild signals
- Card lane: `FOUNDATION-FRONTEND-PERF-AUDIT-001`
- Type: `performance_risk`
- Evidence: `public/foundation.html:103`, `public/foundation.html:1` (Foundation frontend scripts call document.createElement 1669 times, above the 1200 aggregate review budget. Foundation frontend scripts call appendChild 2142 times, above the 1800 aggregate review budget. Foundation frontend scripts use innerHTML 73 times, above the 50 aggregate review budget.)
- Why it matters: Backlog, source, current-state, and runtime filters can churn large DOM trees on each interaction as card/source counts grow.
- Proposed owner/card: Foundation Frontend / `FOUNDATION-FRONTEND-DOM-BUDGET-001`
- Detector: DOM budget snapshot status=review createElement=1669 appendChild=2142 innerHTML=73

## Findings By Sprint Card

- `CODEBASE-HARDCODE-AUDIT-001`: 5 findings
- `FOUNDATION-API-PERF-AUDIT-001`: 1 finding
- `FOUNDATION-FRONTEND-PERF-AUDIT-001`: 1 finding
- `FOUNDATION-MONOLITH-RISK-AUDIT-001`: 3 findings
- `VERIFIER-ASSUMPTION-REGISTRY-001`: 3 findings
- `SPRINT-STATE-MUTATION-AUDIT-001`: 0 findings
- `NIGHTLY-AUDIT-REPORT-001`: 0 findings

## Proposed Backlog Fixes

- `ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001`
- `FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001`
- `FOUNDATION-HUB-PAYLOAD-EXTRACT-001`
- `FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001`
- `SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001`
- `ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001`
- `APPROVAL-THRESHOLD-REGISTRY-001`
- `BUILD-CLOSEOUT-REGISTRY-EXTRACT-001`
- `BUILD-LOG-API-CACHE-AND-SLIM-001`
- `BUILD-INTEL-SNAPSHOT-BASELINE-001`
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


