# Nightly Deep Audit Report - 2026-05-14

Closeout key: `nightly-deep-audit-upgrade-v1`
Generated at: `2026-05-15T01:03:33.680Z`
Report path: `docs/handoffs/nightly-deep-audit-2026-05-14.md`

## Morning Read

- Status: `report_ready`
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev.
- Deterministic findings: 76 total (50 P0, 17 P1, 8 P2, 1 P3)
- Changed files selected: 9
- High-risk review targets: 18
- LLM review mode: `approved_route_available_for_bounded_review`
- Dogfood against May 13 failures: passed

## Diff Summary

- Previous report: `none`
- New findings: 28
- Still open: 0
- Resolved: 0
- Finding delta: 28

## LLM Review Boundary

- Executed this run: no
- Selected route: `foundation-synthesis-openclaw-chatgpt`
- Provider/model: `openclaw / openai-codex/gpt-5.4`
- Route blocker: none
- Note: An approved route is available; V1 still records packets by default unless an explicit live LLM review mode is enabled.

## Endpoint And Payload Trend

- /api/foundation-hub: 74ms, 874776B, risk=warning (Payload 874776 bytes exceeds 800KB watch budget.)
- /api/source-of-truth: 2136ms, 133865B, risk=risk (Latency 2136ms exceeds 2000ms budget.)
- /api/foundation/source-lifecycle: 354ms, 603105B, risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: 63ms, 326311B, risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: 65ms, 33955B, risk=healthy (Within V1 audit budget.)

## Largest Files

- lib/foundation-db.js: 18962 LOC, 1060549B
- public/foundation.js: 16062 LOC, 613000B
- scripts/foundation-verify.mjs: 14444 LOC, 813740B
- public/styles.css: 9860 LOC, 193199B
- server.js: 7846 LOC, 279799B
- lib/foundation-build-closeout-records.js: 5809 LOC, 405390B
- lib/foundation-current-sprint.js: 1597 LOC, 79235B
- lib/intelligence-action-router.js: 1567 LOC, 66835B
- public/sales.js: 1559 LOC, 68544B
- lib/agent-feedback-reminders.js: 1500 LOC, 61595B

## High-Risk Review Packets

### P0 lib/foundation-db.js

- Lines: 18962
- Bytes: 1060549
- Reasons: actively_dangerous_10k_plus_file, live_truth_write_boundary

```
      after,
      changedFields: getBacklogChangedFields(before, after),
    },
  })

  return mapBacklogRow(result.rows[0])
}

export async function updateBacklogItem(id, input, actor = 'steve', options = {}) {
  return withFoundationTransaction(async client => {
    return updateBacklogItemWithClient(client, id, input, actor, options)
  })
}

export async function createDecision(input, actor = 'steve') {
  return withFoundationTransaction(async client => {
    const id = await getNextPrefixedId(client, 'decisions', 'DEC')
    const category = normalizeDecisionCategory(input.category)
    const supersedesIds = normalizeDecisionIdList(input.supersedesIds, id)
    const participantNames = normalizeStringList(input.participantNames)
    const result = await client.query(
      `
        INSERT INTO decisions (
          id, category, title, status, summary, rationale, source_ref,
          decision_owner, confirmed_by, participant_names, context_ref, evidence_notes,
          classified_at, classified_by, supersedes_ids
        )
        VALUES ($1,$2,$3,'proposed',$4,$5,$6,$7,$8,$9,$10,$11,NOW(),$12,$13)
        RETURNING *
      `,
      [
        id,
        category,
        input.title,
        input.summary,
        input.rationale ?? null,
        input.sourceRef ?? null,
        input.decisionOwner ?? null,
        input.confirmedBy ?? null,
        participantNames,
        input.contextRef ?? null,
        input.evidenceNotes ?? null,
        actor,
        supersedesIds,
      ]
    )

    await insertChangeEvent(client, {
```

### P0 public/foundation.js

- Lines: 16062
- Bytes: 613000
- Reasons: actively_dangerous_10k_plus_file, frontend_route_cache_surface

```
    actions.className = 'foundation-shortcut-actions'
    actions.appendChild(createActionLink(step.cta || 'Open', step.href))
    article.appendChild(actions)
  }

  return article
}

function renderCurrentStateLevelCard(item) {
  var article = document.createElement('article')
  article.className = 'section-card current-state-level-card'

  var title = document.createElement('h4')
  title.textContent = item.title
  article.appendChild(title)

  var body = document.createElement('p')
  body.className = 'current-state-card-copy'
  body.textContent = item.body
  article.appendChild(body)

  if (item.note) {
    var note = document.createElement('p')
    note.className = 'current-state-card-note'
    note.textContent = item.note
    article.appendChild(note)
  }

  return article
}

function getCurrentStateSourceHref(sourceId) {
  if (sourceId === 'SRC-STRATEGY-001') return '/foundation#source-docs:SRC-STRATEGY-001'
  if (sourceId === 'SRC-FREEDOM-COMMUNITY-001') return '/foundation#source-sheets:SRC-FREEDOM-COMMUNITY-001'
  if (sourceId === 'SRC-OWNERS-001') return '/foundation#source-sheets:SRC-OWNERS-001'
  if (sourceId === 'SRC-FINANCE-001') return '/foundation#source-sheets:SRC-FINANCE-001'
  if (sourceId === 'SRC-FUB-001') return '/foundation#source-apis:SRC-FUB-001'
  if (sourceId === 'SRC-FREEDOM-BHAG-001') return '/foundation#source-sheets:SRC-FREEDOM-BHAG-001'
  if (sourceId === 'SRC-FREEDOM-ENGINE-001') return '/foundation#source-sheets:SRC-FREEDOM-ENGINE-001'
  return '/foundation#source-overview'
}

function renderCurrentStateSourceStamp(sourceId) {
  if (!sourceId) return null

  var sourceIds = Array.isArray(sourceId) ? sourceId : [sourceId]

  var wrap = document.createElement('div')
```

### P0 scripts/foundation-verify.mjs

- Lines: 14444
- Bytes: 813740
- Reasons: changed_since_baseline, actively_dangerous_10k_plus_file, verifier_trust_surface

```
      dbConstraintAudit.invalidSourceReferenceCount === 0 &&
      dbConstraintAudit.pendingDocUpdateStateIssueCount === 0,
    'Foundation DB constraint audit has no invalid categories, source IDs, or doc-update states',
    `${dbConstraintAudit.registeredSourceIds} registered source IDs / ${dbConstraintAudit.invalidDecisionCategoryCount} invalid categories / ${dbConstraintAudit.invalidSourceReferenceCount} invalid source refs / ${dbConstraintAudit.pendingDocUpdateStateIssueCount} doc-update state issues`,
  )
  ensure(
    checks,
    [
      "app.get('/api/foundation-hub', requireAdminToken",
      "app.post('/api/intelligence/evidence', requireAdminToken",
      "app.get('/api/ops-hub', requireAdminToken",
      "app.get('/api/source-of-truth', requireAdminToken",
      "app.get('/api/doc', requireAdminToken",
      "app.get('/api/fub/health', requireAdminToken",
      "app.get('/api/fub/person', requireAdminToken",
      "app.get('/api/fub/lead-sources', requireAdminToken",
      "app.get('/api/owners/lead-source-governance', requireAdminToken",
      "app.get('/api/owners/review-queue', requireAdminToken",
      "app.get('/api/sheets/structure-status', requireAdminToken",
      "app.get('/api/system-inventory', requireAdminToken",
      "app.get('/api/foundation/changes', requireAdminToken",
      "app.get('/api/foundation/change-log', requireAdminToken",
      "app.get('/api/foundation/per-user-changelog', requireAdminToken",
      "app.get('/api/foundation/daily-summary', requireAdminToken",
      "app.get('/api/foundation/build-log', requireAdminToken",
      "app.get('/api/foundation/doc-updates', requireAdminToken",
      "app.get('/foundation/export/strategy.pdf', requireAdminToken",
    ].every(pattern => serverSource.includes(pattern)),
    'broad Foundation/Ops/doc read APIs are admin-gated',
    'source-of-truth, doc reads, foundation hub, intelligence evidence, ops hub, FUB reads, owners queue/governance, sheet structure, system inventory, changes, changelog, per-user changelog, daily summary, build log, doc updates, and PDF export require admin token outside localhost',
  )
  ensure(
    checks,
    includesAll(serverSource, [
      "app.post('/api/auth/login'",
      "app.post('/api/auth/google'",
      "app.get('/api/auth/session'",
      "app.post('/api/auth/logout'",
      "app.get('/login'",
      "requirePageAccess('owner')",
      "r
```

### P1 public/styles.css

- Lines: 9860
- Bytes: 193199
- Reasons: over_5k_refactor_required

```
:root {
  --bg: #f0f2f5;
  --surface: #ffffff;
  --surface-raised: #ffffff;
  --surface-inset: #f6f8fa;
  --text-primary: #0a0f1a;
  --text-secondary: #3d4654;
  --text-tertiary: #6b7280;
  --border: rgba(10, 15, 26, 0.08);
  --border-strong: rgba(10, 15, 26, 0.15);
  --brand: #0084c9;
  --brand-dark: #006ba3;
  --brand-glow: rgba(0, 132, 201, 0.12);
  --green: #10b981;
  --green-bg: rgba(16, 185, 129, 0.1);
  --amber: #f59e0b;
  --amber-bg: rgba(245, 158, 11, 0.1);
  --red: #ef4444;
  --red-bg: rgba(239, 68, 68, 0.1);
  --surface-glass: rgba(255, 255, 255, 0.82);
  --surface-glass-hover: rgba(255, 255, 255, 0.92);
  --purple: #8b5cf6;
  --purple-bg: rgba(139, 92, 246, 0.08);
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --shadow-sm: 0 1px 3px rgba(10, 15, 26, 0.06);
  --shadow-md: 0 4px 20px rgba(10, 15, 26, 0.06);
  --shadow-lg: 0 12px 40px rgba(10, 15, 26, 0.08);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

@font-face { font-family: 'stratum-1-web'; src: url('/fonts/Stratum1-Regular.otf') format('opentype'); font-weight: 400; }
@font-face { font-family: 'stratum-1-web'; src: url('/fonts/Stratum1-Medium.otf') format('opentype'); font-weight: 500; }
@font-face { font-family: 'stratum-1-web'; src: url('/fonts/Stratum1-Bold.otf') format('opentype'); font-weight: 700; }
@font-face { font-family: 'stratum-1-web'; src: url('/fonts/Stratum1-Black.otf') format('opentype'); font-weight: 900; }

body {
  min-height: 100vh;
  color: var(--text-primary);
  font-family: "Open Sans", -apple-system, sans-serif;
  font-size: 15px;
  line-height: 1.5;
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
  overflow-wrap: break-word;
  word-break: break-word;
```

### P1 server.js

- Lines: 7846
- Bytes: 279799
- Reasons: over_5k_refactor_required, hot_route_surface

```
    perUserChangelog: compactLifecycleChild(lifecycle.perUserChangelog),
    restrictedDecisionQueue: compactLifecycleChild(lifecycle.restrictedDecisionQueue),
    foundationUiComplete: compactLifecycleChild(lifecycle.foundationUiComplete),
    currentSprint: compactLifecycleChild(lifecycle.currentSprint),
    fullPayloadCompacted: true,
  }
}

app.get('/api/foundation-hub', requireAdminToken, async (req, res) => {
  const startedAtMs = Date.now()
  try {
    const mode = normalizeFoundationHubMode(req.query?.view || req.query?.mode || req.query?.detail)
    if (mode === 'summary') {
      const summaryPayload = await buildFoundationHubSummaryPayload()
      sendFoundationHubPayload(res, summaryPayload, { mode, startedAtMs })
      return
    }

    const snapshot = await getFoundationSnapshot()
    const kpiHealth = await getSafeKpiHealthSnapshot()
    const backlogHygiene = buildBacklogHygieneSnapshot({
      backlogItems: snapshot.backlogItems || [],
      closeouts: getFoundationBuildCloseouts(),
    })
    const foundation1100Review = buildFoundationReviewSprintStatus({
      artifact: await loadFoundationReviewSprintArtifact({ repoRoot: __dirname }),
      backlogItems: snapshot.backlogItems || [],
      actionRouter: snapshot.intelligenceActionRouter || {},
      hygiene: backlogHygiene,
    })
    const docArchiveCleanup = await buildDocArchiveCleanupStatus({ repoRoot: __dirname })
    const researchCuration = buildResearchCurationStatus({
      backlogItems: snapshot.backlogItems || [],
      foundationReviewSprint: foundation1100Review,
    })
    const exceptionCuration = await buildExceptionCurationStatus({ repoRoot: __dirname })
    const hitListReconcile = await buildHitListReconcileStatusFromFile({
      repoRoot: __dirname,
      backlogItems: snapshot.backlogItems || [],
    })
    const archiveRetire = await buildArchiveRetireStatus({ repoRoot: __dirname })
    const postShipFanout = await buildPostShipFanoutStatus({
      closeouts: getFoundationBuildCloseouts(),
      backlogItems: snapshot.backlogItems || [],
    })
    const doctrinePropagation = await buildDoctrinePropagationStatus({
      repoRoot: __dirname,
      apply: false,
```

### P1 lib/foundation-build-closeout-records.js

- Lines: 5809
- Bytes: 405390
- Reasons: over_5k_refactor_required

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

### P1 lib/connector-uptime-monitor.js

- Lines: 870
- Bytes: 33597
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

- Lines: 863
- Bytes: 35998
- Reasons: source_health_surface

```
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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

export const SOURCE_LIFECYCLE_MIN_SOURCE_CONTRACTS = 35
export const SOURCE_LIFECYCLE_REQUIRED_TARGET_COUNT = 12

export const SOURCE_LIFECYCLE_INCLUDED_SOURCE_IDS = [
  'SRC-GMAIL-001',
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
]
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

### P1 lib/source-lifecycle-completion.js

- Lines: 667
- Bytes: 33630
- Reasons: source_health_surface

```
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  SOURCE_LIFECYCLE_APPROVED_TARGET_BASELINE,
  SOURCE_LIFECYCLE_MIN_SOURCE_CONTRACTS,
  SOURCE_LIFECYCLE_REQUIRED_TARGET_COUNT,
} from './source-lifecycle.js'
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
export const SOURCE_LIFECYCLE_COMPLETION_EXPECTED_SOURCE_COUNT = 36

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
  'SRC-FREEDOM-BHAG-001',
```

### P1 lib/kpi-health.js

- Lines: 652
- Bytes: 23426
- Reasons: source_health_surface

```
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const KPI_HEALTH_CONTRACT_VERSION = 1
export const KPI_HEALTH_PRIMARY_SURFACE = 'Foundation > Data Sources > APIs / Apps > KPI / Supabase Health'
export const KPI_HEALTH_RUNTIME_SURFACE = 'Foundation > Runtime Health, warnings only when unhealthy'
export const KPI_HEALTH_LEE_REPO_PATH = '/Users/bensoncrew/.inspection/zahnd-team-dashboard'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const LOCAL_KPI_ENV = path.join(repoRoot, 'store', 'kpi-audit.env')
const LEE_REPO_SCAN_PATHS = [
  path.join(KPI_HEALTH_LEE_REPO_PATH, 'src'),
  path.join(KPI_HEALTH_LEE_REPO_PATH, 'supabase', 'migrations'),
]
const LEE_REPO_SCAN_EXTENSIONS = new Set(['.sql', '.ts', '.tsx'])
const FRESHNESS_CANDIDATES = [
  'updated_at',
  'lastupdatedatetime',
  'last_seen_at',
  'login_at',
  'activity_date',
  'recordcreateddate',
  'created_at',
  'createddate',
  'added_at',
  'end_date',
  'leaddate',
  'startdate',
  'date_firm_executed',
]

export const EXPECTED_KPI_TABLES = [
  {
    table: 'profiles',
    readRule: 'Identity / roster joins',
    dashboardSurface: 'Agent roster, roles, leaderboard display names, admin gates',
    freshnessWindowDays: 90,
    expectedColumns: ['id', 'user_id', 'email', 'role', 'updated_at'],
    freshnessColumns: ['updated_at', 'created_at'],
  },
  {
    table: 'users',
    readRule: 'Identity / roster joins',
    dashboardSurface: 'FUB-style numeric userid bridge for pipeline/activity joins',
    freshnessWindowDays: 120,
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

### P1 scripts/process-foundation-sprint-system-check.mjs

- Lines: 394
- Bytes: 21429
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

### P1 lib/clickup-source-verifier.js

- Lines: 379
- Bytes: 14628
- Reasons: changed_since_baseline, source_health_surface

```
import {
  buildClickUpSourceHealth,
  buildUnavailableClickUpListSnapshot,
  clickUpGet,
  listClickUpTasks,
  normalizeClickUpKey,
} from './clickup.js'

export const CLICKUP_SOURCE_VERIFY_DEFAULT_TIMEOUT_MS = 8000
export const CLICKUP_SOURCE_VERIFY_DEFAULT_MAX_TASK_PAGES = 1

export const CLICKUP_SOURCE_VERIFY_CARD_IDS = [
  'CLICKUP-VERIFY-FAST-PATH-001',
  'CLICKUP-VERIFY-PAYLOAD-CACHE-001',
  'CLICKUP-DEGRADED-HEALTH-DOGFOOD-001',
  'FOUNDATION-VERIFY-SLOW-BUDGET-001',
]

export const CLICKUP_VERIFY_LISTS = [
  {
    key: 'dealDataEntry',
    id: process.env.CLICKUP_DEAL_DATA_ENTRY_LIST_ID || '901112153939',
    expectedName: 'Deal Data Entry',
    role: 'Deals workflow and review follow-through',
    requiredStatuses: [],
    requiredFields: [
      '❗ Deal Status',
      'Deal #',
      'Follow Up Boss Link',
      'AIOS Admin Deal Row Link',
      'FUB Call / Review Evidence Link',
      'NPS Status',
      'Review Status',
      'Internal Onboarding Status',
      'Internal Deal Review Status',
    ],
  },
  {
    key: 'agentRoster',
    id: process.env.CLICKUP_AGENT_ROSTER_LIST_ID || '901113292355',
    expectedName: 'Agent Roster',
    role: 'Agent roster, contract link, onboarding-NPS accountability',
    requiredStatuses: [],
    requiredFields: [
      'Contract Link',
      'Recruited By',
      'Real Start Date',
      'End Date',
```

### P1 scripts/process-sprint-stage-gate-check.mjs

- Lines: 373
- Bytes: 14666
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

- Lines: 368
- Bytes: 19109
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
  const baseUrl = String(args.baseUrl || process.env.FOUNDATION_BASE_URL || 'http://localhost:3000')
  const repoHead = await currentHead()

  await initFoundationDb()
  try {
    const buildingSeed = buildDefaultFoundationSprintSeed({
      stage: 'done_this_sprint',
      cadenceStage: 'building_now',
    })
    await upsertFoundationCurrentSprintOverlay(buildingSeed, 'foundation-sprint-cadence-check')
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

```

### P1 lib/foundation-build-closeout-cleanup-records.js

- Lines: 363
- Bytes: 29508
- Reasons: changed_since_baseline

```
export const cleanupCloseoutRecords = [
  {
    key: 'nightly-deep-audit-upgrade-v1',
    backlogIds: [
      'NIGHTLY-DEEP-AUDIT-UPGRADE-001',
    ],
    match: {
      subjectIncludes: ['nightly-deep-audit-upgrade-v1', 'Nightly Deep Audit Upgrade', 'scheduled report-only nightly hybrid audit'],
    },
    operatorCloseout: true,
    mentionedBacklogIds: [
      'FOUNDATION-HUB-PAYLOAD-EXTRACT-001',
      'FOUNDATION-FRONTEND-ASSET-BUDGET-001',
      'SOURCE-OF-TRUTH-PERF-BUDGET-001',
      'MONOLITH-SPLIT-CONTINUE-001',
    ],
    systemArea: 'Foundation reviewer loop / code quality',
    status: 'accepted',
    acceptanceState: 'Verified',
    whatChanged: 'Upgraded the weaker manual audit posture into a scheduled report-only nightly hybrid deep audit that combines deterministic backend/frontend scanning, changed/high-risk review target selection, endpoint/payload trends, and approved-route review packets.',
    whatItDoes: 'Runs a nightly 03:00 America/Toronto reviewer job with report-only posture. The audit writes date-based markdown and JSON reports, selects high-risk backend/frontend/verifier/hot-route/DB surfaces, records route readiness for bounded LLM review without spending by default, and dogfoods the known May 13 failure modes.',
    whyItMatters: 'Steve expected the system to catch backend bugs, frontend bugs, hardcoded truth, slow routes, write-boundary leaks, monolith growth, and simplification opportunities before they became another messy rebuild. This makes that reviewer loop scheduled and visible without auto-fixes or auto backlog mutation.',
    whereItLives: [
      'lib/nightly-deep-audit-constants.js',
      'lib/nightly-deep-audit-upgrade.js',
      'scripts/process-nightly-deep-audit-upgrade-check.mjs',
      'lib/foundation-jobs.js nightly-deep-audit scheduled report-only job',
      'lib/connector-uptime-monitor.js morning health nightly deep audit status',
      'scripts/process-foundation-operating-reliability-check.mjs closed-sprint reliability proof',
      'scripts/foundation-verify.mjs nightly deep audit done-card coverage',
      'docs/process/nightly-deep-audit-upgrade-001-plan.md',
      'docs/process/approvals/NIGHTLY-DEEP-AUDIT-UPGRADE-001.json',
      'docs/handoffs/nightly-deep-audit-2026-05-14.md',
      'docs/handoffs/nightly-deep-audit-2026-05-14.json',
      'docs/handoffs/2026-05-14-nightly-deep-audit-upgrade-clo
```

## Top Deterministic Findings

- P0 focused-check-active-sprint-id-assumption: Focused checks assert exact dated active sprint IDs -> SPRINT-CHECK-HISTORICAL-MODE-001
- P0 foundation-db-schema-seed-store-monolith: Foundation DB mixes schema, seed, stores, and query APIs -> FOUNDATION-DB-SCHEMA-SEED-SPLIT-001
- P0 foundation-hub-aggregate-overfetch: /api/foundation-hub is an all-in-one aggregation chokepoint -> FOUNDATION-HUB-API-PERF-BUDGET-001
- P0 foundation-verify-monolith: Foundation verifier is one large execution surface -> FOUNDATION-VERIFY-REGISTRY-SPLIT-001
- P0 hardcoded-current-sprint-truth: Live-looking Current Sprint truth is hardcoded -> LIVE-TRUTH-VERIFY-DECOUPLE-001
- P0 hardcoded-current-sprint-truth: Live-looking Current Sprint truth is hardcoded -> LIVE-TRUTH-VERIFY-DECOUPLE-001
- P0 hardcoded-current-sprint-truth: Live-looking Current Sprint truth is hardcoded -> LIVE-TRUTH-VERIFY-DECOUPLE-001
- P0 hardcoded-current-sprint-truth: Live-looking Current Sprint truth is hardcoded -> LIVE-TRUTH-VERIFY-DECOUPLE-001
- P0 hardcoded-current-sprint-truth: Live-looking Current Sprint truth is hardcoded -> LIVE-TRUTH-VERIFY-DECOUPLE-001
- P0 hardcoded-current-sprint-truth: Live-looking Current Sprint truth is hardcoded -> LIVE-TRUTH-VERIFY-DECOUPLE-001
- P0 hardcoded-current-sprint-truth: Live-looking Current Sprint truth is hardcoded -> LIVE-TRUTH-VERIFY-DECOUPLE-001
- P0 hardcoded-current-sprint-truth: Live-looking Current Sprint truth is hardcoded -> LIVE-TRUTH-VERIFY-DECOUPLE-001
- P0 kpi-health-request-path-timeout-risk: KPI health probes run on source/hub request paths without a visible timeout budget -> KPI-HEALTH-API-CACHE-001
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
Generated at: `2026-05-15T01:03:35.947Z`

## Morning Read

- Status: `report_ready`
- Findings: 76 total (50 P0, 17 P1, 8 P2, 1 P3)
- Proposed backlog fixes: 27
- Detection mode: deterministic code first; no LLM detection used.
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev, no feature work.
- Synthetic proof: passed (hardcoded=2, mutator=1, slowEndpoint=risk)

## Endpoint Coverage

- /api/foundation-hub: status=200 latency=74ms payload=874776B risk=warning (Payload 874776 bytes exceeds 800KB watch budget.)
- /api/source-of-truth: status=200 latency=2136ms payload=133865B risk=risk (Latency 2136ms exceeds 2000ms budget.)
- /api/foundation/source-lifecycle: status=200 latency=354ms payload=603105B risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: status=200 latency=63ms payload=326311B risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: status=200 latency=65ms payload=33955B risk=healthy (Within V1 audit budget.)

## Asset And Monolith Metrics

Assets:
- public/foundation.js: 613000B raw, 115673B gzip, 16062 lines
- public/styles.css: 193199B raw, 26848B gzip, 9860 lines
- public/foundation.html: 6908B raw, 1569B gzip, 102 lines

Largest files:
- lib/foundation-db.js: 18962 LOC, 1060549B
- public/foundation.js: 16062 LOC, 613000B
- scripts/foundation-verify.mjs: 14444 LOC, 813740B
- public/styles.css: 9860 LOC, 193199B
- server.js: 7846 LOC, 279799B
- lib/foundation-build-closeout-records.js: 5809 LOC, 405390B
- lib/foundation-current-sprint.js: 1597 LOC, 79235B
- lib/intelligence-action-router.js: 1567 LOC, 66835B

## Top Findings

### P0 Focused checks assert exact dated active sprint IDs
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `lib/foundation-current-sprint.js:102` (const FOUNDATION_CURRENT_SPRINT_ID = 'foundation-current-2026-05-12), `lib/foundation-current-sprint.js:143` (const FOUNDATION_SOURCE_ONCE_OVER_SPRINT_ID = 'foundation-source-once-over-2026-05-12), `lib/gstack-build-intel.js:13` (const GSTACK_BUILD_INTEL_SPRINT_ID = 'gstack-build-intel-extraction-2026-05-13), `scripts/process-atom-flow-auto-demotion-check.mjs:28` (const SPRINT_ID = 'source-truth-guardrails-2026-05-13), `scripts/process-build-intel-extraction-check.mjs:78` (activeSprint.sprint?.sprintId ===), `scripts/process-clickup-verify-health-boundary-check.mjs:27` (const SPRINT_ID = 'foundation-clickup-verify-health-boundary-2026-05-14)
- Why it matters: One-time closeout checks are unsafe as nightly checks after rollover if they hard-fail on the current active sprint.
- Proposed owner/card: Foundation Process / `SPRINT-CHECK-HISTORICAL-MODE-001`
- Detector: dated active-sprint assertion detector
- False-positive note: Acceptable only in explicitly historical closeout or migration checks.

### P0 Foundation DB mixes schema, seed, stores, and query APIs
- Card lane: `FOUNDATION-MONOLITH-RISK-AUDIT-001`
- Type: `refactor_candidate`
- Evidence: `lib/foundation-db.js:7208`
- Why it matters: Large mixed-responsibility surfaces slow audits, increase merge risk, and make future proof harder to isolate.
- Proposed owner/card: Foundation Engineering / `FOUNDATION-DB-SCHEMA-SEED-SPLIT-001`
- Detector: largest file/function ownership detector
- False-positive note: This is not approval to refactor during the audit sprint.

### P0 /api/foundation-hub is an all-in-one aggregation chokepoint
- Card lane: `FOUNDATION-API-PERF-AUDIT-001`
- Type: `performance_risk`
- Evidence: `server.js:5285`, `lib/foundation-db.js:14048`
- Why it matters: The first Foundation render depends on the heaviest aggregate endpoint and serial builder fanout.
- Proposed owner/card: Foundation API / `FOUNDATION-HUB-API-PERF-BUDGET-001`
- Detector: foundation hub aggregate route detector
- False-positive note: Aggregator routes are fine when section timing, payload budgets, and cache boundaries are explicit.

### P0 Foundation verifier is one large execution surface
- Card lane: `FOUNDATION-MONOLITH-RISK-AUDIT-001`
- Type: `refactor_candidate`
- Evidence: `scripts/foundation-verify.mjs:1633`
- Why it matters: Large mixed-responsibility surfaces slow audits, increase merge risk, and make future proof harder to isolate.
- Proposed owner/card: Foundation Engineering / `FOUNDATION-VERIFY-REGISTRY-SPLIT-001`
- Detector: largest file/function ownership detector
- False-positive note: This is not approval to refactor during the audit sprint.

### P0 Live-looking Current Sprint truth is hardcoded
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `lib/foundation-current-sprint.js:102`
- Why it matters: Current Sprint command truth must come from live sprint records, not stale code or docs that can block rollover.
- Proposed owner/card: Foundation verifier / `LIVE-TRUTH-VERIFY-DECOUPLE-001`
- Detector: Current Sprint dated-string detector
- False-positive note: Historical closeout sections are acceptable when explicitly labeled as history.

### P0 Live-looking Current Sprint truth is hardcoded
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/foundation-verify.mjs:11182`
- Why it matters: Current Sprint command truth must come from live sprint records, not stale code or docs that can block rollover.
- Proposed owner/card: Foundation verifier / `LIVE-TRUTH-VERIFY-DECOUPLE-001`
- Detector: Current Sprint dated-string detector
- False-positive note: Historical closeout sections are acceptable when explicitly labeled as history.

### P0 Live-looking Current Sprint truth is hardcoded
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-connector-credential-check.mjs:35`
- Why it matters: Current Sprint command truth must come from live sprint records, not stale code or docs that can block rollover.
- Proposed owner/card: Foundation verifier / `LIVE-TRUTH-VERIFY-DECOUPLE-001`
- Detector: Current Sprint dated-string detector
- False-positive note: Historical closeout sections are acceptable when explicitly labeled as history.

### P0 Live-looking Current Sprint truth is hardcoded
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-current-sprint-dynamic-truth-check.mjs:19`
- Why it matters: Current Sprint command truth must come from live sprint records, not stale code or docs that can block rollover.
- Proposed owner/card: Foundation verifier / `LIVE-TRUTH-VERIFY-DECOUPLE-001`
- Detector: Current Sprint dated-string detector
- False-positive note: Historical closeout sections are acceptable when explicitly labeled as history.

### P0 Live-looking Current Sprint truth is hardcoded
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-foundation-plan-reconcile-check.mjs:17`
- Why it matters: Current Sprint command truth must come from live sprint records, not stale code or docs that can block rollover.
- Proposed owner/card: Foundation verifier / `LIVE-TRUTH-VERIFY-DECOUPLE-001`
- Detector: Current Sprint dated-string detector
- False-positive note: Historical closeout sections are acceptable when explicitly labeled as history.

### P0 Live-looking Current Sprint truth is hardcoded
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-llm-auth-audit-check.mjs:27`
- Why it matters: Current Sprint command truth must come from live sprint records, not stale code or docs that can block rollover.
- Proposed owner/card: Foundation verifier / `LIVE-TRUTH-VERIFY-DECOUPLE-001`
- Detector: Current Sprint dated-string detector
- False-positive note: Historical closeout sections are acceptable when explicitly labeled as history.

### P0 Live-looking Current Sprint truth is hardcoded
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-source-extraction-gap-followup-check.mjs:46`
- Why it matters: Current Sprint command truth must come from live sprint records, not stale code or docs that can block rollover.
- Proposed owner/card: Foundation verifier / `LIVE-TRUTH-VERIFY-DECOUPLE-001`
- Detector: Current Sprint dated-string detector
- False-positive note: Historical closeout sections are acceptable when explicitly labeled as history.

### P0 Live-looking Current Sprint truth is hardcoded
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-sprint-stage-gate-check.mjs:24`
- Why it matters: Current Sprint command truth must come from live sprint records, not stale code or docs that can block rollover.
- Proposed owner/card: Foundation verifier / `LIVE-TRUTH-VERIFY-DECOUPLE-001`
- Detector: Current Sprint dated-string detector
- False-positive note: Historical closeout sections are acceptable when explicitly labeled as history.

### P0 KPI health probes run on source/hub request paths without a visible timeout budget
- Card lane: `FOUNDATION-API-PERF-AUDIT-001`
- Type: `performance_risk`
- Evidence: `server.js:230`, `lib/kpi-health.js:289`
- Why it matters: Sequential Supabase table/RPC probes can hold core Foundation routes hostage.
- Proposed owner/card: KPI Health / `KPI-HEALTH-API-CACHE-001`
- Detector: request-path KPI health probe detector
- False-positive note: Acceptable only with cache, timeout, and stale fallback proof.

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

## Findings By Sprint Card

- `CODEBASE-HARDCODE-AUDIT-001`: 19 findings
- `FOUNDATION-API-PERF-AUDIT-001`: 8 findings
- `FOUNDATION-FRONTEND-PERF-AUDIT-001`: 3 findings
- `FOUNDATION-MONOLITH-RISK-AUDIT-001`: 5 findings
- `VERIFIER-ASSUMPTION-REGISTRY-001`: 3 findings
- `SPRINT-STATE-MUTATION-AUDIT-001`: 38 findings
- `NIGHTLY-AUDIT-REPORT-001`: 0 findings

## Proposed Backlog Fixes

- `SPRINT-CHECK-HISTORICAL-MODE-001`
- `FOUNDATION-DB-SCHEMA-SEED-SPLIT-001`
- `FOUNDATION-HUB-API-PERF-BUDGET-001`
- `FOUNDATION-VERIFY-REGISTRY-SPLIT-001`
- `LIVE-TRUTH-VERIFY-DECOUPLE-001`
- `KPI-HEALTH-API-CACHE-001`
- `PROCESS-CHECK-READONLY-MODE-001`
- `FOUNDATION-JOB-MUTATION-ALLOWLIST-001`
- `ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001`
- `FOUNDATION-ENDPOINT-BUDGETS-001`
- `FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001`
- `FOUNDATION-HUB-PAYLOAD-EXTRACT-001`
- `GSTACK-BUILD-INTEL-SNAPSHOT-CACHE-001`
- `FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001`
- `KPI-HEALTH-DYNAMIC-YEAR-CONTRACT-001`
- `SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001`
- `DB-SEED-001`
- `FOUNDATION-FRONTEND-ASSET-BUDGET-001`
- `SOURCE-LIFECYCLE-SLIM-SNAPSHOT-001`
- `ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001`
- `APPROVAL-THRESHOLD-REGISTRY-001`
- `BUILD-CLOSEOUT-REGISTRY-EXTRACT-001`
- `BUILD-INTEL-CONTEXT-SEARCH-INDEX-001`
- `BUILD-LOG-API-CACHE-AND-SLIM-001`
- `BUILD-INTEL-SNAPSHOT-BASELINE-001`
- `FOUNDATION-FRONTEND-DOM-BUDGET-001`
- `BROWSER-QA-PROOF-001`

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
