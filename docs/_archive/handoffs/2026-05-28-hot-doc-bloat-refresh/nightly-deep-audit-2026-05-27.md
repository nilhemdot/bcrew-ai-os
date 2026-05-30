# Nightly Deep Audit Report - 2026-05-27

Closeout key: `nightly-deep-audit-upgrade-v1`
Generated at: `2026-05-27T07:00:51.756Z`
Report path: `docs/handoffs/nightly-deep-audit-2026-05-27.md`

## Morning Read

- Status: `deep_review_executed`
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev.
- Active deterministic findings: 0 total (0 P0, 0 P1, 0 P2, 0 P3)
- Closed detector signals reconciled out of active audit: 0 of 0
- Changed files selected: 4
- High-risk review targets: 14
- LLM review mode: `bounded_senior_review_executed`
- Deep senior review rollup: `healthy` (deep senior review executed with 0 active finding(s) and 0 reconciled closed finding(s))
- Dogfood against May 13 failures: passed
- Doc/report artifact bloat: `watch` (0 red, 1 yellow)

## Diff Summary

- Previous report: `docs/handoffs/nightly-deep-audit-2026-05-26.json`
- New findings: 0
- Still open: 0
- Resolved: 0
- Finding delta: 0

## LLM Review Boundary

- Executed this run: yes
- Selected route: `foundation-deep-audit-openai-api`
- Provider/model: `openai / gpt-5.5`
- Route blocker: none
- Active finding count: 0
- Closed senior-review repeats reconciled out: 0
- Note: Deep senior review executed through the approved router with report-only/no-autofix posture.

Deep senior review executed through the approved router.

## Senior Review Findings

- none

## Reconciled Closed Audit Signals

- none

## Endpoint And Payload Trend

- /api/foundation-hub: 135ms, 584505B, risk=healthy (Within V1 audit budget.)
- /api/source-of-truth: 50ms, 199956B, risk=healthy (Within V1 audit budget.)
- /api/foundation/source-lifecycle: 554ms, 641815B, risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: 159ms, 243790B, risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: 50ms, 33222B, risk=healthy (Within V1 audit budget.)

## Largest Files

- scripts/foundation-verify.mjs: 4998 LOC, 277372B
- public/dev.css: 3448 LOC, 61087B
- lib/foundation-build-closeout-process-gate-records.js: 3133 LOC, 224729B
- lib/foundation-build-closeout-source-records.js: 3078 LOC, 260750B
- public/foundation.js: 2987 LOC, 113810B
- lib/foundation-db-schema-seed-store.js: 2757 LOC, 141992B
- lib/foundation-build-closeout-overnight-records.js: 2718 LOC, 216767B
- lib/foundation-build-closeout-intelligence-records.js: 2687 LOC, 202181B
- lib/foundation-build-closeout-tightening-records.js: 2599 LOC, 226069B
- lib/foundation-source-crawl-store.js: 2514 LOC, 111865B

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

### P1 public/dev.css

- Lines: 3448
- Bytes: 61087
- Reasons: over_3k_warn

```
@font-face {
  font-family: 'Stratum1';
  src: url('/fonts/Stratum1-Regular.otf') format('opentype');
  font-weight: 400;
  font-display: swap;
}

@font-face {
  font-family: 'Stratum1';
  src: url('/fonts/Stratum1-Medium.otf') format('opentype');
  font-weight: 500;
  font-display: swap;
}

@font-face {
  font-family: 'Stratum1';
  src: url('/fonts/Stratum1-Bold.otf') format('opentype');
  font-weight: 700;
  font-display: swap;
}

@font-face {
  font-family: 'Stratum1';
  src: url('/fonts/Stratum1-Black.otf') format('opentype');
  font-weight: 900;
  font-display: swap;
}

:root {
  --ink: #0A0F1A;
  --blue: #0084C9;
  --blue-up: #4DBDFF;
  --blue-deep: #005FA3;
  --white: #FFFFFF;
  --grey: #EBEBEB;
  --grey-1: #F5F7FA;
  --grey-d: #4B5563;
  --grey-line: rgba(10, 15, 26, 0.08);
  --display: 'Stratum1', 'Arial Black', sans-serif;
  --body: 'Open Sans', system-ui, sans-serif;
  --mono: 'JetBrains Mono', ui-monospace, monospace;
  --t-micro: 11px;
  --t-xs: 12px;
  --t-sm: 13px;
  --t-base: 14px;
  --t-md: 16px;
  --t-lg: 18px;
  --t-xl: 22px;
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

### P1 lib/foundation-build-closeout-source-records.js

- Lines: 3078
- Bytes: 260750
- Reasons: over_3k_warn, source_health_surface

```
export const sourceCloseoutRecords = [
  {
    key: 'source-session-broker-v1',
    backlogIds: ['SOURCE-SESSION-BROKER-001'],
    match: {
      subjectIncludes: [
        'Add source session broker',
        'SOURCE-SESSION-BROKER-001',
        'source-session-broker-v1',
      ],
    },
    operatorCloseout: true,
    mentionedBacklogIds: [
      'EXTRACTOR-EYES-HANDS-BRAIN-RUNTIME-001',
      'SKOOL-LIVE-NAVIGATION-PROOF-002',
      'MYICOR-LIVE-NAVIGATION-PROOF-002',
      'HARLAN-AUTH-LIVE-DELIVERY-002',
      'SKOOL-APPROVED-LESSON-EXTRACT-PROOF-001',
      'MYICOR-APPROVED-LESSON-EXTRACT-PROOF-001',
    ],
    systemArea: 'Foundation source access / God Mode extractor sessions',
    status: 'blocked-preflight',
    acceptanceState: 'Verified V1 broker contract and local proof accepted as blocked-preflight; live Harlan delivery, MyICOR connector approval, and broad paid/private extraction are approval-bound continuation work and the full Source Session Broker capability is not done.',
    whatChanged: 'Added the Source Session Broker V1 contract and proof so approved extractors have one closed-loop access layer for isolated profiles, macOS Keychain credential refs, source identities, login recipes, auth-needed escalation, wait/resume, and fail-closed behavior.',
    whatItDoes: 'Defines the source-session gold standard: try the existing isolated browser profile first, prefer a native read-only connector/MCP when the source offers one and scope is approved, use broker-only Keychain credentials when a login recipe exists, emit auth_needed on missing creds/login recipe/MFA, wait for the human-agent DONE signal, silently reverify, then resume or fail closed. It also extends the credential vault CLI with generic source add/status/delete and wires paid-source local mapping to auth-needed artifacts.',
    whyItMatters: 'Steve cannot be the login bottleneck for every Skool, MyICOR, newsletter, free community, or future team-agent source. God Mode extraction needs a reusable session layer that can safely access approved accounts while refusing purchases, trading, banking, posting, messaging, profile changes, unsafe downloads, and raw-secret leakage.',
    whereItLives: [
      'lib/source-session-broker.js broker contract, source policies, MyICOR read-only MCP preference, request evaluator, and dogfood proof',
      'scripts/process-source-session-broker-check
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

- Lines: 2059
- Bytes: 67331
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

### P1 scripts/myicor-mcp-oauth.mjs

- Lines: 580
- Bytes: 18504
- Reasons: changed_since_baseline

```
#!/usr/bin/env node

import crypto from 'node:crypto'
import http from 'node:http'
import process from 'node:process'
import { spawn } from 'node:child_process'

import {
  buildKeychainSecretRef,
  keychainItemExists,
  readKeychainPassword,
  storeKeychainPassword,
} from '../lib/credential-vault.js'

const MCP_URL = 'https://mcp.myicor.com/mcp'
const OLD_SSE_URL = 'https://mcp.myicor.com/sse'
const AUTH_METADATA_URL = 'https://app.myicor.com/.well-known/oauth-authorization-server'
const DEFAULT_CALLBACK = 'http://127.0.0.1:7777/callback'
const DEFAULT_ACCOUNT = 'myicor-authorized-member'
const KEYCHAIN_SOURCE = 'myicor-mcp-oauth'
const DEFAULT_SCOPE = 'mcp:read mcp:tools mcp:progress mcp:inner-circle'

function parseArgs(argv = process.argv.slice(2)) {
  const [command = 'preflight', ...rest] = argv
  const flags = {
    command,
    json: rest.includes('--json'),
    open: !rest.includes('--no-open'),
    account: DEFAULT_ACCOUNT,
    callback: DEFAULT_CALLBACK,
    scope: DEFAULT_SCOPE,
    tool: '',
    paramsJson: '{}',
    timeoutMs: 10 * 60 * 1000,
  }
  for (const arg of rest) {
    if (arg.startsWith('--account=')) flags.account = arg.slice('--account='.length).trim()
    if (arg.startsWith('--callback=')) flags.callback = arg.slice('--callback='.length).trim()
    if (arg.startsWith('--scope=')) flags.scope = arg.slice('--scope='.length).trim()
    if (arg.startsWith('--tool=')) flags.tool = arg.slice('--tool='.length).trim()
    if (arg.startsWith('--paramsJson=')) flags.paramsJson = arg.slice('--paramsJson='.length).trim()
    if (arg.startsWith('--params=')) flags.paramsJson = arg.slice('--params='.length).trim()
    if (arg.startsWith('--timeoutMs=')) flags.timeoutMs = Number(arg.slice('--timeoutMs='.length))
  }
  return flags
}

function printJson(value) {
```

### P1 lib/source-session-broker.js

- Lines: 545
- Bytes: 24050
- Reasons: changed_since_baseline, source_health_surface

```
import { buildKeychainSecretRef } from './credential-vault.js'
import {
  HARLAN_AUTH_ESCALATION_LOOP_CARD_ID,
  buildAuthNeededEvent,
} from './harlan-auth-escalation-loop.js'

export const SOURCE_SESSION_BROKER_CARD_ID = 'SOURCE-SESSION-BROKER-001'
export const SOURCE_SESSION_BROKER_CLOSEOUT_KEY = 'source-session-broker-v1'
export const SOURCE_SESSION_BROKER_PLAN_PATH = 'docs/process/source-session-broker-001-plan.md'
export const SOURCE_SESSION_BROKER_APPROVAL_PATH = 'docs/process/approvals/SOURCE-SESSION-BROKER-001.json'
export const SOURCE_SESSION_BROKER_SCRIPT_PATH = 'scripts/process-source-session-broker-check.mjs'
export const SOURCE_SESSION_BROKER_DEFAULT_FREE_ACCOUNT = 'ai@bensoncrew.ca'
export const SOURCE_SESSION_BROKER_FALLBACK_FREE_ACCOUNT = 'crewbert@bensoncrew.ca'

export const SOURCE_SESSION_BROKER_FORBIDDEN_ACTIONS = [
  'purchase',
  'checkout',
  'stock_trade',
  'banking_action',
  'payment_change',
  'account_delete',
  'profile_mutation',
  'credential_mutation',
  'post_public_content',
  'comment',
  'dm_or_message',
  'unsafe_download',
]

export const SOURCE_SESSION_BROKER_BACKLOG_ITEM = {
  id: SOURCE_SESSION_BROKER_CARD_ID,
  title: 'Build closed-loop source session broker for paid and free sources',
  team: 'foundation',
  lane: 'scoped',
  priority: 'P0',
  rank: 9,
  source: 'Steve May 26 closed-loop credential/session correction',
  summary: 'Build the reusable session layer that lets approved extractors use isolated browser profiles, macOS Keychain credential refs, source identities, login recipes, auth-needed escalation, wait/resume, and fail-closed behavior without Steve babysitting every login.',
  whyItMatters: 'God Mode extraction cannot reach Skool, MyICOR, paid course platforms, newsletters, free communities, or future team-member systems if every login depends on Steve being present. The system needs a safe broker that can try the saved session first, use vaulted credentials when allowed, ask the human through their agent when MFA blocks progress, then resume or fail closed.',
  nextAction: 'Use SOURCE-SESSION-BROKER-001 as the source access layer under EXTRACTOR-EYES-HANDS-BRAIN-RUNTIME-001: save source credentials in macOS Keychain, reuse isolated profiles, emit auth-needed events through the Harlan loop when login/MFA blocks progress, and prove one bounded Skool/MyICOR source run before broad paid/private extracti
```

### P1 scripts/process-source-session-broker-check.mjs

- Lines: 394
- Bytes: 14455
- Reasons: changed_since_baseline, process_check_surface, source_health_surface

```
#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { validatePlanApprovalFile } from '../lib/approval-integrity.js'
import {
  closeFoundationDb,
  getBacklogItemsByIds,
  initFoundationDb,
} from '../lib/foundation-db.js'
import {
  PROCESS_CHECK_WRITE_FLAGS,
  assertProcessCheckWriteAllowed,
  isProcessCheckWriteRequested,
} from '../lib/process-write-guard.js'
import {
  SOURCE_SESSION_BROKER_APPROVAL_PATH,
  SOURCE_SESSION_BROKER_BACKLOG_ITEM,
  SOURCE_SESSION_BROKER_CARD_ID,
  SOURCE_SESSION_BROKER_CLOSEOUT_KEY,
  SOURCE_SESSION_BROKER_PLAN_PATH,
  SOURCE_SESSION_BROKER_SCRIPT_PATH,
  buildSourceSessionBrokerContractSnapshot,
  buildSourceSessionBrokerDogfoodProof,
  evaluateSourceSessionBrokerContract,
} from '../lib/source-session-broker.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const ACTOR = 'codex-source-session-broker'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.includes('--json') || argv.includes('--json=true'),
    apply: isProcessCheckWriteRequested({
      argv,
      allowedFlags: [PROCESS_CHECK_WRITE_FLAGS.apply],
    }),
  }
}

function addCheck(checks, ok, check, detail = '') {
  checks.push({ ok: Boolean(ok), check, detail })
}
```

### P1 lib/credential-vault.js

- Lines: 241
- Bytes: 9498
- Reasons: changed_since_baseline

```
import { spawn } from 'node:child_process'

export const CREDENTIAL_VAULT_CARD_ID = 'CREDENTIAL-VAULT-SESSION-BROKER-001'
export const MACOS_KEYCHAIN_REF_PREFIX = 'macos-keychain:'
export const BCREW_KEYCHAIN_SERVICE_PREFIX = 'bcrew-ai-os'
export const GEMINI_WORKSPACE_CREDENTIAL_KEY = 'gemini-workspace-browser-account'
export const GEMINI_WORKSPACE_ROUTE_KEY = 'foundation-video-gemini-workspace-browser'
export const GEMINI_WORKSPACE_AUTH_PATH = 'manual_interactive'
export const GEMINI_WORKSPACE_AUTH_PATH_DETAIL = 'gemini_workspace_browser_account'
export const GEMINI_WORKSPACE_SOURCE = 'gemini-workspace'
export const DEFAULT_GEMINI_WORKSPACE_ACCOUNT = 'ai@bensoncrew.ca'

function text(value) {
  return String(value || '').trim()
}

function normalizePathPart(value = '') {
  return text(value)
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildKeychainService({ source = '', account = '' } = {}) {
  const normalizedSource = normalizePathPart(source)
  const normalizedAccount = normalizePathPart(account)
  if (!normalizedSource) throw new Error('source is required.')
  if (!normalizedAccount) throw new Error('account is required.')
  return `${BCREW_KEYCHAIN_SERVICE_PREFIX}/${normalizedSource}/${normalizedAccount}`
}

export function buildKeychainSecretRef(input = {}) {
  return `${MACOS_KEYCHAIN_REF_PREFIX}${buildKeychainService(input)}`
}

export function parseKeychainSecretRef(secretRef = '') {
  const normalized = text(secretRef)
  if (!normalized.startsWith(MACOS_KEYCHAIN_REF_PREFIX)) return null
  const service = normalized.slice(MACOS_KEYCHAIN_REF_PREFIX.length)
  const parts = service.split('/')
  return {
    service,
    source: parts[1] || '',
    account: parts.slice(2).join('/') || '',
  }
}

export function buildSecurityAddGenericPasswordArgs({
```

### P3 lib/foundation-jobs.js

- Lines: 1497
- Bytes: 65459
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

### P3 lib/code-quality-nightly-audit.js

- Lines: 1416
- Bytes: 64123
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
  const syntheticGeminiModel = ['gemini', '3.5', 'flash'].join('-')
  const runtimeModelHardcode = detectRuntimePolicyHardcodesInText({
    relativePath: 'scripts/process-unowned-model-check.mjs',
    text: `const MODEL = '${syntheticGeminiModel}'`,
  })
  const runtimeModelIdFalsePositive = detectRuntimePolicyHardcodesInText({
    relativePath: 'scripts/process-card-source-id-check.mjs',
    text: `
      const cardId = 'CLAUDE-CODE-REVIEW-BRAIN-ROUTE-001'
      const sourceId = 'SRC-CLAUDE-CODE-COMMUNITY-BUILD-INTEL-001'
      const folderCard = 'MATT-POCOCK-CLAUDE-FOLDER-EVAL-001'
      const routeKey = 'foundation-extractor-claude-subscription-reasoning'
    `,
  })
```

## Top Deterministic Findings

- none

## Doc / Report Artifact Bloat

- Status: `watch`
- Handoff files: 223
- Handoff hot lines: 18334
- Nightly artifacts: 14
- Red/yellow findings: 0/1

- P1 docs/handoffs is accumulating too many hot files: docs/handoffs has 222 file(s) modified in the last 31 days; budget is 220/320.

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
Generated at: `2026-05-27T07:00:52.629Z`

## Morning Read

- Status: `report_ready`
- Active findings: 0 total (0 P0, 0 P1, 0 P2, 0 P3)
- Raw detector signals: 0
- Closed detector signals reconciled out: 0
- Active proposed backlog fixes: 0
- Detection mode: deterministic code first; no LLM detection used.
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev, no feature work.
- Synthetic proof: passed (hardcoded=2, mutator=1, slowEndpoint=risk)

## Endpoint Coverage

- /api/foundation-hub: status=200 latency=135ms payload=584505B risk=healthy (Within V1 audit budget.)
- /api/source-of-truth: status=200 latency=50ms payload=199956B risk=healthy (Within V1 audit budget.)
- /api/foundation/source-lifecycle: status=200 latency=554ms payload=641815B risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: status=200 latency=159ms payload=243790B risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: status=200 latency=50ms payload=33222B risk=healthy (Within V1 audit budget.)

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
- public/dev.css: 3448 LOC, 61087B
- lib/foundation-build-closeout-process-gate-records.js: 3133 LOC, 224729B
- lib/foundation-build-closeout-source-records.js: 3078 LOC, 260750B
- public/foundation.js: 2987 LOC, 113810B
- lib/foundation-db-schema-seed-store.js: 2757 LOC, 141992B
- lib/foundation-build-closeout-overnight-records.js: 2718 LOC, 216767B
- lib/foundation-build-closeout-intelligence-records.js: 2687 LOC, 202181B

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



## Reconciled Closed Detector Signals

- None

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
