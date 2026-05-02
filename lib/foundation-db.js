import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { getDriveFileMetadata, getSheetValues } from './google-delegated.js'
import { getFoundationJobDefinitions, getFoundationJobRuntime } from './foundation-jobs.js'
import { getSourceContracts } from './source-contracts.js'
import { createIntelligenceAtomStore, intelligenceAtomSchemaSql } from './intelligence-atoms.js'
import { createIntelligenceRetrievalStore, intelligenceRetrievalSchemaSql } from './intelligence-retrieval.js'
import { createIntelligenceSynthesisFactStore, intelligenceSynthesisFactsSchemaSql } from './intelligence-synthesis-facts.js'
import { createIntelligenceSynthesisStore, intelligenceSynthesisSchemaSql } from './intelligence-synthesis.js'
import { createIntelligenceActionRouterStore, intelligenceActionRouterSchemaSql } from './intelligence-action-router.js'
import { getFoundationSurfaceMap } from './foundation-surface-map.js'
import { buildCardReferenceTrustStatus } from './card-reference-trust.js'
import { buildSourceReferenceTrustStatus } from './source-reference-trust.js'

function createFoundationPool() {
  return new Pool({
    host: process.env.BCREW_DB_HOST || '/tmp',
    database: process.env.BCREW_DB_NAME || 'bcrew_ai_os',
    user: process.env.BCREW_DB_USER || process.env.USER,
  })
}

let pool = createFoundationPool()
let poolEndPromise = null

export const FOUNDATION_DB_READ_ONLY_GATE_TABLES = [
  'backlog_items',
  'decisions',
  'parking_lot_items',
  'open_questions',
  'memory_system_status',
  'foundation_runtime_status',
  'pending_doc_updates',
  'change_events',
  'foundation_job_runs',
  'foundation_job_controls',
  'shared_communication_artifacts',
  'shared_communication_candidates',
  'source_crawl_targets',
  'source_crawl_target_runs',
  'source_crawl_items',
  'intelligence_job_runs',
  'intelligence_atoms',
  'intelligence_retrieval_runs',
  'intelligence_synthesis_fact_runs',
  'intelligence_synthesis_runs',
  'intelligence_action_routes',
  'agent_onboarding_feedback_responses',
  'agent_onboarding_feedback_send_attempts',
  'agent_onboarding_feedback_reminder_attempts',
  'agent_onboarding_feedback_response_notifications',
  'sales_listing_assignments',
]

const foundationPoolHandle = {
  query(...args) {
    return pool.query(...args)
  },
  connect(...args) {
    return pool.connect(...args)
  },
}

const canonicalDecisionCategories = ['strategy', 'system', 'execution', 'people']
const SOURCE_CRAWL_STALE_RUN_MINUTES = 30

const backlogScopeDefinitions = [
  {
    key: 'foundation',
    label: 'Foundation / System',
    shortLabel: 'foundation/system',
    queueOwner: 'root',
    active: true,
  },
  {
    key: 'strategic_execution',
    label: 'Strategic Execution',
    shortLabel: 'strategic execution',
    queueOwner: 'root',
    active: true,
  },
  {
    key: 'marketing',
    label: 'Marketing',
    shortLabel: 'marketing',
    queueOwner: 'hub',
    active: true,
  },
  {
    key: 'sales',
    label: 'Sales',
    shortLabel: 'sales',
    queueOwner: 'hub',
    active: false,
  },
  {
    key: 'operations',
    label: 'Operations',
    shortLabel: 'operations',
    queueOwner: 'hub',
    active: false,
  },
  {
    key: 'retention',
    label: 'Retention',
    shortLabel: 'retention',
    queueOwner: 'hub',
    active: false,
  },
]

const legacyBacklogScopeMap = {
  dev: 'foundation',
}

const backlogScopeKeys = backlogScopeDefinitions.map(scope => scope.key)
const backlogScopeOrderSql = backlogScopeDefinitions
  .map((scope, index) => `WHEN '${scope.key}' THEN ${index}`)
  .join(' ')

const foundationUserSeed = [
  {
    email: 'ai@bensoncrew.ca',
    name: 'AI',
    tier: null,
    userType: 'system',
    active: true,
    meetingSyncEnabled: true,
  },
  {
    email: 'crewbert@bensoncrew.ca',
    name: 'Crewbert',
    tier: null,
    userType: 'system',
    active: true,
    meetingSyncEnabled: false,
  },
  {
    email: 'steve.zahnd@bensoncrew.ca',
    name: 'Steve',
    tier: 1,
    userType: 'human',
    active: true,
    meetingSyncEnabled: true,
  },
  {
    email: 'nick.bergmann@bensoncrew.ca',
    name: 'Nick',
    tier: 2,
    userType: 'human',
    active: true,
    meetingSyncEnabled: true,
  },
  {
    email: 'carsonc@bensoncrew.ca',
    name: 'Carson',
    tier: 2,
    userType: 'human',
    active: true,
    meetingSyncEnabled: true,
  },
  {
    email: 'ryanc@bensoncrew.ca',
    name: 'Ryan',
    tier: 2,
    userType: 'human',
    active: true,
    meetingSyncEnabled: true,
  },
  {
    email: 'blake.berfelz@bensoncrew.ca',
    name: 'Blake',
    tier: 2,
    userType: 'human',
    active: true,
    meetingSyncEnabled: true,
  },
  {
    email: 'scottb@bensoncrew.ca',
    name: 'Scott',
    tier: 2,
    userType: 'human',
    active: true,
    meetingSyncEnabled: true,
  },
  {
    email: 'clare.manalo@bensoncrew.ca',
    name: 'Clare',
    tier: 2,
    userType: 'human',
    active: true,
    meetingSyncEnabled: true,
  },
  {
    email: 'accounting@bensoncrew.ca',
    name: 'Ahsan',
    tier: 2,
    userType: 'human',
    active: true,
    meetingSyncEnabled: true,
  },
  {
    email: 'tanner.marsh@bensoncrew.ca',
    name: 'Tanner',
    tier: 3,
    userType: 'human',
    active: true,
    meetingSyncEnabled: true,
  },
  {
    email: 'georgia.huntley@bensoncrew.ca',
    name: 'Georgia',
    tier: 3,
    userType: 'human',
    active: true,
    meetingSyncEnabled: true,
  },
]

const backlogSeed = [
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
    summary: 'Treat the committed secrets in `.mcp.json` as a real security incident: rotate the exposed credentials, move the local MCP configuration to env-backed values, and stop storing live secrets in repo-tracked config.',
    whyItMatters: 'A trust-layer rebuild cannot ignore live keys committed in git history. Even if the rest of the architecture is sound, secret leakage is a direct foundation failure.',
    nextAction: 'Identify the exposed keys, rotate them, move the local MCP config to environment-backed values or local-only config, and add the minimum secret-scanning guardrail so this does not happen again.',
    statusNote: 'Backlog hygiene pass on 2026-04-28 moved this out of executing because no same-session provider-side rotation proof is active in the repo. Still P0 and still real security work; it returns to executing only when the rotation/proof owner is actively working it and can record closure evidence without storing secrets.',
  },
  {
    id: 'SECURITY-006',
    title: 'Rotate or prove retired credentials exposed in Lee FUBZahnd repo',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 3,
    source: '2026-04-26 FUBZahnd middleware audit',
    summary: 'The public Lee `FUBZahnd` repo contains hardcoded live-looking integration credentials and connection strings in `App.config`. Treat them as exposed until provider-side rotation or retirement proof exists.',
    whyItMatters: 'This repo is now part of the Foundation source-evidence chain. If any old FUB, system-header, SMTP, SQL Server, or Supabase credential is still valid, the exposure is a real security incident independent of the current AI OS repo.',
    nextAction: 'Do not copy values into docs or chat. Identify each provider represented in `App.config`, rotate any live key, prove retired any dead key, and record the closure evidence without storing secrets in repo truth.',
    statusNote: 'Backlog hygiene pass on 2026-04-28 moved this out of executing because no same-session provider-side rotation/retirement proof is active in the repo. Still P0 and still required before treating Lee FUBZahnd credential exposure as closed.',
  },
  {
    id: 'CONNECTOR-CREDENTIAL-001',
    title: 'Create connector credential inventory and preflight checks',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 5,
    source: 'Founder correction during FUB/KPI deep audit',
    summary: 'Maintain a no-secret inventory of required connector credentials, env var names, provider/account owner, last probe result, and workloads each credential unlocks. Deep audits should preflight required connectors and stop with a clear blocker when a required key is missing instead of continuing halfway.',
    whyItMatters: 'Steve already spent hours collecting keys. If AI OS cannot tell which credentials exist and which source work they unlock, future agents will waste time, produce partial audits, and ask Steve to redo work that should already be in local config.',
    nextAction: 'Build the first credential/preflight registry for FUB, KPI Supabase, Google delegated Drive/Gmail/Sheets, ClickUp, Slack, Missive, OpenClaw/API model routes, Apify/Loom/YouTube candidates, and future Skool access. Store references/probe status only, never secret values.',
    statusNote: 'Scoped, not active. Before build, submit a 9.8 plan with acceptance/proof coverage for no-secret credential metadata, provider probes, and verifier/process-gate evidence; ship only through process:foundation-ship.',
  },
  {
    id: 'SECURITY-002',
    title: 'Define subject-person redaction and owner-preserving comms access',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 4,
    source: '2026-04-23 auth/tiers/vault spec + founder privacy rule',
    summary: 'Central auth/tier/redaction v1 is implemented through `lib/security-access.js`: requests get server-derived access context, covered routes have explicit postures, `assertTier`/`assertRole` are central, intelligence evidence ignores client `maxTier`, and shared-comms/intelligence routes stay Tier 1-only unless filtered access is proven.',
    whyItMatters: 'Tiers alone do not solve the real leak. The system now has a fail-closed layer for subject-person redaction, sensitivity/min_tier checks, stable redacted response shapes, and raw shared-comms boundaries before any broader hub/query/assistant expansion.',
    nextAction: 'Done for v1. Keep non-Tier-1 shared-comms/intelligence access closed until a later approved card proves filtered summaries against real data. Do not expand Strategy, Sales, Agent Feedback, Scoper, Agent Factory, corpus, or UI polish from this closeout.',
    statusNote: 'Closed on 2026-05-02 under `security-002-auth-tier-redaction-v1`. V1 adds `lib/security-access.js`, a route posture registry for all planned read surfaces, DB-backed request access context via Foundation users, central `assertTier`/`assertRole`, server-derived actor tier for `/api/intelligence/evidence`, stable redacted response helpers, subject_people/sensitivity/min_tier synthetic proof, owner-preserving shared-comms summary boundary, fail-closed missing tier/classification behavior, `process:security-002-check`, approval integrity evidence, and `foundation:verify` coverage. Routes that cannot yet be filtered safely remain Tier 1-only.',
  },
  {
    id: 'MEETING-VAULT-ACL-001',
    title: 'Enforce owner-preserving ACLs for raw meeting notes',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 4,
    source: '2026-05-02 missing-card capture audit + docs/specs/2026-04-23-auth-tiers-vault.md',
    summary: 'Build the raw Google Drive meeting-note protection layer that SECURITY-002 intentionally did not build: inventory meeting-note file permissions, preserve the document owner, add the system/vault identity where required, and remove unsafe participant access only after an approved dry-run proves the exact changes.',
    whyItMatters: 'SECURITY-002 protects what AIOS returns, but it does not remove someone from an original Google Doc. If Ryan or another non-owner can still open a raw sensitive meeting note in Drive, the privacy model leaks even when AIOS redacts correctly.',
    nextAction: 'Before implementation, produce a 9.8 plan that proves owner identity, permission inventory, dry-run diff, allowlisted system identity, explicit Steve approval before any ACL mutation, before/after audit snapshots, rollback path, and synthetic proof that a non-owner cannot read a protected raw meeting note through Drive or AIOS.',
    statusNote: 'Captured on 2026-05-02 after the missing-card audit. This is separate from SECURITY-002 v1. Do not mutate real Drive ACLs from this card without an explicit approval artifact and a dry-run report. Related evidence: `docs/specs/2026-04-23-auth-tiers-vault.md`, `docs/source-notes/shared-communications.md`, `lib/google-delegated.js` permission helpers.',
  },
  {
    id: 'SECURITY-FILTERED-COMMS-ACCESS-001',
    title: 'Prove real-data filtered shared-comms access for non-Tier-1 users',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 4,
    source: '2026-05-02 missing-card capture audit + SECURITY-002 closeout limits',
    summary: 'Turn the SECURITY-002 synthetic redaction helpers into real-data filtered summary access for approved non-Tier-1 users without exposing raw shared communications, hidden item identities, subject-person content, or Tier-1-only context.',
    whyItMatters: 'SECURITY-002 correctly leaves unsafe shared-comms and intelligence routes Tier 1-only. Broader assistants, hubs, or users still cannot consume shared communications until the system proves filtered summaries against real artifacts.',
    nextAction: 'Plan and prove a narrow real-data filtered-summary route: owner/requester context, subject_people and sensitivity classification, stable redacted response shape, no suppressed-item leakage, source evidence links safe for the requester, denial examples, verifier coverage, and process:foundation-ship.',
    statusNote: 'Captured on 2026-05-02. Do not broaden shared-communications, intelligence evidence, Strategy, assistant, or hub read access until this or a successor card is approved and verified.',
  },
  {
    id: 'SECURITY-EDGE-001',
    title: 'Harden public edge auth before exposing AIOS beyond trusted local access',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 4,
    source: '2026-05-02 missing-card capture audit + auth/tier/vault spec',
    summary: 'Define and prove the public edge layer for AIOS access, including stable tunnel/DNS posture, Cloudflare Access or equivalent identity gate, local-dev exceptions, and route behavior when requests arrive from outside trusted localhost paths.',
    whyItMatters: 'App-tier checks are necessary but not sufficient once the dashboard or hubs are reachable from the internet. The auth/tier/vault spec requires edge identity plus app middleware plus raw-data vault controls.',
    nextAction: 'Before any public exposure, write the edge-auth plan: allowed hostnames, tunnel ownership, identity provider policy, emergency shutoff, local-dev bypass rules, session handoff into AIOS auth context, synthetic external-denial proof, and rollback.',
    statusNote: 'Captured on 2026-05-02. This is a gate before public/broader external exposure, not a reason to pause local Foundation hardening.',
  },
  {
    id: 'SECURITY-PROVIDER-ROTATION-PROOF-001',
    title: 'Prove provider-side rotation or retirement for exposed credentials',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 4,
    source: '2026-05-02 missing-card capture audit + SECURITY-001/SECURITY-006 drift',
    summary: 'Reconcile the gap between repo-side secret cleanup and provider-side proof by proving every exposed or live-looking credential was rotated, revoked, retired, or classified dead at the provider without storing secret values in repo truth.',
    whyItMatters: 'A secret is not safe because the repo stopped showing it. Foundation needs provider-side closure evidence for current and legacy connector exposures, including old FUBZahnd-style credentials, before security incidents can be treated as closed.',
    nextAction: 'Create a no-secret evidence ledger: provider/account, credential class, exposure source, current status, rotation/revocation/retirement proof reference, owner, date, and remaining blocker. Keep raw values out of docs, logs, verifier output, and chat.',
    statusNote: 'Captured on 2026-05-02 because SECURITY-001 had stale/done-looking state while provider-side proof was still called out as missing. This card owns proof reconciliation; it does not reopen code cleanup that already shipped.',
  },
  {
    id: 'DRIVE-ACCESS-REQUEST-001',
    title: 'Prove delegated Drive access-request and ACL repair preflights',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 4,
    source: '2026-05-02 source-note missing-card audit',
    summary: 'Build a safe preflight for Drive files that AIOS cannot read or may need to repair: identify the active Google account, intended delegated actor, current permissions, owner, request-access behavior, and whether an ACL repair is allowed.',
    whyItMatters: 'Meeting vault ACLs, Drive corpus mining, and John-linked source gaps all depend on knowing whether the system can request or change access from the right identity. The 2026-04-26 browser test proved account/session ambiguity can make access automation unsafe.',
    nextAction: 'Plan an inventory/dry-run only path first: no permission mutation, no blind request spam, clear active-account proof, owner detection, allowed-operation classification, and a stopped-with-reason result when the owner or authority is unclear.',
    statusNote: 'Captured on 2026-05-02 as a dependency for MEETING-VAULT-ACL-001 and Drive corpus hardening. Real permission writes require a later explicit approval artifact.',
  },
  {
    id: 'FOUNDATION-DONE-TEST-001',
    title: 'Define the Foundation done exit test',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 5,
    source: '2026-05-02 sprint planning + missing-card capture audit',
    summary: 'Foundation readiness now has an explicit exit test: `process:foundation-done-test` evaluates source-verifiable answers, tier/redaction safety, P0 gate coverage, runtime/process health, extraction retry/ledger/backfill health, raw meeting Drive ACL/vault status, and stable pass/fail output.',
    whyItMatters: 'Foundation no longer depends on chat memory or vibes to decide whether Strategy can resume. The system can say ready, or it can honestly say not_ready and name the failed leg, blocker card, and next proof command.',
    nextAction: 'Done for the exit-test implementation. The current readiness result can remain not_ready while named blocker cards stay open; pull one blocker next instead of pretending Foundation is done.',
    statusNote: 'Closed on 2026-05-02 under `foundation-done-test-v1`. V1 adds `lib/foundation-readiness-gates.js`, `scripts/process-foundation-done-test.mjs`, `docs/process/foundation-done-test.md`, approval artifact `docs/process/approvals/FOUNDATION-DONE-TEST-001.json`, verifier coverage, and build-log closeout. It does not make Foundation pass artificially, reopen SECURITY-002, mutate Drive ACLs, broaden public/external access, start Strategy, expand Sales or Agent Feedback, build Scoper/Agent Factory, expand corpus, or do UI polish.',
  },
  {
    id: 'SYSTEM-010-GHOST-CLOSEOUT-001',
    title: 'Split and close SYSTEM-010 ghost-process controls',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 5,
    source: '2026-05-02 missing-card capture audit + SYSTEM-010 partial closeout risk',
    summary: 'Convert the remaining SYSTEM-010 ghost-process doctrine into exact proof slices for dead-man liveness, auto-restart-on-push, decommission controls, kill/pause safety, active-process visibility, and cost/process risk warnings.',
    whyItMatters: 'SYSTEM-010 is still the old-system failure lesson. Pause/resume and served-code checks help, but Foundation is not runtime-safe while processes can run, spend, fail, or keep stale code alive without an operator-grade stop/decommission/dead-man path.',
    nextAction: 'Submit a 9.8 plan that either closes the remaining umbrella in one slice or splits it into child cards for dead-man/autorestart, decommission controls, and cost/budget controls. Acceptance must include UI/API visibility, proof commands, and a failure-mode test.',
    statusNote: 'Captured on 2026-05-02 to prevent SYSTEM-010 from staying an umbrella that sounds closed while kill switch, dead-man, auto-restart, decommission, and cost controls remain open.',
  },
  {
    id: 'SOURCE-LIFECYCLE-COMPLETION-001',
    title: 'Prove source lifecycle completion and revalidation gates',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 6,
    source: '2026-05-02 rebuild-doc missing-card audit',
    summary: 'Promote source lifecycle visibility into a completion gate that proves priority sources are connected, extracting, trusted, fresh enough, privacy-classified, and assigned a next action or blocked reason.',
    whyItMatters: 'Source Lifecycle UI is useful, but Foundation readiness depends on source states being operationally true. A source can look visible while still lacking current/backfill posture, trust proof, or explicit blocking reason.',
    nextAction: 'Define the completion rubric for live priority sources: connector status, source contract, extraction current/backfill state, trust state, privacy posture, last proof command, owner, and next safe command. Merge with existing source revalidation cards where possible.',
    statusNote: 'Captured on 2026-05-02. This should not duplicate SOURCE-LIFECYCLE-EXPANSION-001; it owns the completion/revalidation gate after the visibility slice.',
  },
  {
    id: 'EXTRACT-RUN-HARDENING-001',
    title: 'Harden extraction run retry, ledger, and partial-failure behavior',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 7,
    source: '2026-05-02 missing-card capture audit + EXTRACT-RETRY/CRAWL-RUN-LEDGER gaps',
    summary: 'Consolidate the remaining extraction-control hardening into one build plan: run IDs, idempotent target runs, failed-item retry/backoff, partial failure alerts, bounded backfill windows, stale lease reaping, and visible next safe command.',
    whyItMatters: 'Extraction is now a supply chain. If failed items, partial runs, stale leases, and backfill cursors are not mechanically controlled, the archive will look healthy while silently missing Drive files, meetings, videos, attachments, or source windows.',
    nextAction: 'Before implementation, reconcile existing EXTRACT-RETRY-001, CRAWL-RUN-LEDGER-001, EXTRACT-CURRENT-001, EXTRACT-BACKFILL-001, and EXTRACT-RETIRE-001 into a 9.8 plan with acceptance criteria, proof commands, verifier coverage, and process:foundation-ship. Do not add new corpus lanes from this card.',
    statusNote: 'Captured on 2026-05-02 to avoid six scattered extraction hardening gaps. This card should merge or sequence child cards instead of duplicating them. Scope/proof signal: plan first, then prove run IDs, retry/backoff, partial-failure alerts, stale leases, cursor/backfill state, and next-safe-command behavior.',
  },
  {
    id: 'SYNTHESIS-VERIFY-001',
    title: 'Verify synthesized claims before Strategy or scout output consumes them',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 8,
    source: '2026-05-02 audit/archive missing-card capture',
    summary: 'Add a claim verification gate for synthesis, scouts, and strategy packets so generated items must stay tied to source evidence, facts, retrieval chunks, and allowed confidence before they are treated as decision-grade output.',
    whyItMatters: 'The intelligence spine can retrieve and synthesize, but Strategy Hub and future scouts need a stronger proof layer than "the words sound right." Claims should fail or downgrade when evidence is missing, stale, low confidence, or outside the permitted tier.',
    nextAction: 'Define claim classes, required evidence fields, source/fact overlap checks, contradiction handling, stale evidence behavior, tier limits, and verifier coverage. Run retrieval eval before and after any synthesis verification change.',
    statusNote: 'Captured on 2026-05-02. This complements SYNTHESIS-FACTS-001 and SYNTHESIS-ENGINE-001; it does not reopen the completed v1 spine.',
  },
  {
    id: 'MEETING-FORWARD-TRANSCRIPT-ENFORCEMENT-001',
    title: 'Prove future meeting transcript capture and gap handling',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 43,
    source: '2026-05-02 meeting-system missing-card audit',
    summary: 'Prove that future meetings keep notes/transcripts captured by organizer and series, that missing transcript gaps surface clearly, and that the system stops or escalates when expected meeting artifacts are absent.',
    whyItMatters: 'Historical meeting archive depth is useful, but the operating system fails if future meetings silently miss transcripts or only some organizers are covered. Meeting intelligence must stay current without Steve remembering to check Drive manually.',
    nextAction: 'Use the enabled Foundation users, Calendar/Drive scan results, transcript-gap report, and meeting source contract to define expected capture, missing-artifact states, owner escalation, and proof for the most recent meetings by organizer.',
    statusNote: 'Captured on 2026-05-02. This is different from MEETING-VAULT-ACL-001: this card proves capture completeness; the vault card proves raw-file access control.',
  },
  {
    id: 'PROCESS-ACK-STATES-001',
    title: 'Add acknowledged-state handling for accepted gaps and pauses',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 45,
    source: '2026-05-02 audit/archive missing-card capture',
    summary: 'Create a governed way to mark known gaps, intentional pauses, and accepted risks as acknowledged so audits and verifiers stop re-flagging the same issue while still keeping review dates and owners visible.',
    whyItMatters: 'Not every gap should block every sprint, but chat memory is not a durable exception system. Acknowledged states need owner, reason, expiry or review date, related card, and verifier behavior.',
    nextAction: 'Define the ack-state registry shape and where it appears in Runtime Health, backlog hygiene, audits, and verifier exceptions. Include expiry/review behavior so acknowledgments do not become permanent silence.',
    statusNote: 'Captured on 2026-05-02 after repeated audit drift around paused/scoped cards such as SOURCE-021 and known privacy/source gaps.',
  },
  {
    id: 'VERIFIER-INCREMENTAL-COVERAGE-001',
    title: 'Add incremental verifier coverage for changed Foundation surfaces',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 45,
    source: '2026-05-02 sprint planning and missing-card capture audit',
    summary: 'Create a focused verifier path that checks the changed card and dependent surfaces without running the full Foundation suite for every small edit, while keeping full foundation:verify available for protected releases.',
    whyItMatters: 'The full verifier is valuable but slow. If every small backlog/doc change feels like a full-system inspection, Foundation fixes get heavier and builders are more likely to bypass or delay proof.',
    nextAction: 'Plan the incremental command, changed-file/card detection, dependency map, structural checks, fallback to full verify, no-op P95 target, and process-gate integration. Keep structural verifier work separate from speed work.',
    statusNote: 'Captured on 2026-05-02. This is the speed/incremental verifier card. Structural verifier coverage remains a separate gate if not already owned by a more specific card.',
  },
  {
    id: 'FOUNDATION-USERS-001',
    title: 'Build an owner-only Foundation user access panel',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 5,
    source: '2026-04-28 Foundation access-control feedback',
    summary: 'Create a Foundation admin surface so Steve can manage AIOS users without editing `.env`: list users, add email/name/role, disable users, review the access-change audit trail, and see whether each enabled user has Google-login and/or password-login coverage.',
    whyItMatters: 'As AIOS moves beyond local-only founder use, user access cannot live in hidden environment JSON. Steve needs an owner-only control panel that changes access audibly, supports approved external collaborators such as Sales Hub users, and avoids exposing passwords or broadening the full auth/redaction scope.',
    nextAction: 'Define the owner-only user admin flow: list active/disabled users, add email/name/role, disable user, show allowed login methods, add/reset password fallback only when needed, write audit events, hide password/secret material, and add verifier coverage that non-owners cannot manage access.',
    statusNote: 'Backlog follow-up only; do not build during the EXTRACT-CONTROL-001 schedule reconciliation slice. Enriched 2026-05-01 after John Kitchens external Sales Hub access: Google login can work for explicitly enabled external accounts, but the admin panel still needs a visible login-method/password-fallback path. Tie this to SECURITY-002/auth-tier work, but keep it smaller than full subject-person redaction and hub access policy.',
  },
  {
    id: 'SECURITY-003',
    title: 'Close direct LLM spend and transcription bypasses',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 4,
    source: '2026-04-25 Foundation code audit',
    summary: 'Zoom audio transcription no longer contains a direct OpenAI audio endpoint call and fails closed for non-dry-run use. The verifier now checks direct OpenAI, Anthropic, and Gemini host calls outside approved adapters instead of only checking OpenAI Responses.',
    whyItMatters: 'The subscription-first doctrine only works if every paid/model workload is routed, ledged, and explicitly allowed. A single unchecked transcription path can silently burn API spend and skip provenance.',
    nextAction: 'Keep Zoom audio recovery paused. If the business later reopens it, build transcription as a router-ledged workload with explicit provenance instead of restoring direct API calls.',
    statusNote: 'Closed as a stop-gap on 2026-04-25: direct transcription spend path is fail-closed and verifier coverage is broadened.',
  },
  {
    id: 'SECURITY-004',
    title: 'Gate broad Foundation, Ops, and doc read APIs before any non-local access',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 4,
    source: '2026-04-25 Foundation code audit',
    summary: 'Broad Foundation/Ops/doc read APIs now use `requireAdminToken` outside localhost: source-of-truth, document reads, Foundation hub snapshot, Owners review queue/governance, FUB read helpers, sheet structure, system inventory, changes, and pending doc updates.',
    whyItMatters: 'Localhost reduces today’s blast radius, but the plan says no broad read surface before auth/tier/redaction. If the dashboard is exposed beyond the laptop, these routes can leak user roster, decisions, doc proposals, Ops queue details, and governance data.',
    nextAction: 'Keep the verifier guard. Replace this stop-gap with full `SECURITY-002` auth/tier and subject-person redaction before broader hub, assistant, or user-facing access.',
    statusNote: 'Closed as an interim gate on 2026-04-25. Full privacy model remains under `SECURITY-002`.',
  },
  {
    id: 'LLM-AUTH-AUDIT-001',
    title: 'Probe and classify model auth paths after runtime changes',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 6,
    source: '2026-04-25 runtime router doctrine',
    summary: 'Run the LLM auth audit whenever Codex, OpenClaw, Claude Code, API keys, or route defaults change so Foundation knows which model paths are actually usable for each workload.',
    whyItMatters: 'A route that exists in config is not production capacity. The system needs real-call proof, policy classification, and call logging before scheduled jobs can trust any subscription, native, or API path.',
    nextAction: 'After the local Codex/OpenClaw upgrade, run `npm run foundation:job -- --job=llm-auth-audit`, confirm GPT-5.5/OpenClaw and Claude Code route status, and update route policy notes from the probe result.',
    statusNote: 'Historical probe proved OpenClaw/Codex on GPT-5.4 and local Claude Code login. Repo defaults now target GPT-5.5, so a fresh probe is required.',
  },
  {
    id: 'LLM-CREDENTIAL-REGISTRY-001',
    title: 'Keep model credentials and route policies in the Foundation registry',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 6,
    source: '2026-04-25 runtime router doctrine',
    summary: 'Maintain model credentials, auth paths, route status, allowed workloads, hub ownership, fallback policy, and risk classification in DB-backed Foundation tables instead of loose environment assumptions.',
    whyItMatters: 'The old system blurred subscriptions, API keys, agents, and coding tools. A DB-backed registry keeps model access auditable and prevents hidden spend, ghost capacity, or unsupported routes from becoming production defaults.',
    nextAction: 'Extend `llm_credentials` and `llm_routes` with the missing hub-capacity policy fields, then make dashboard/router views show capacity ownership, status, fallback, and last successful probe.',
    statusNote: 'Scoped, not active. Existing tables are `llm_credentials`, `llm_routes`, `llm_route_probes`, and `llm_calls`; before build, require acceptance/proof for hub-capacity policy fields, dashboard-facing capacity view, verifier coverage, and process:foundation-ship.',
  },
  {
    id: 'LLM-HUB-CAPACITY-001',
    title: 'Define compliant hub-dedicated model capacity lanes',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 6,
    source: '2026-04-25 runtime router doctrine',
    summary: 'Assign Foundation and future hubs to explicit model-capacity lanes without blind account rotation or consumer-plan arbitrage. Subscriptions can be internal capacity only when allowed, probed, paced, logged, and policy-classified.',
    whyItMatters: 'Foundation cannot depend on one overloaded account, but the product also cannot be built as a subscription farm. Customer-facing automation should default to official APIs unless a native/subscription route is explicitly approved for the workload.',
    nextAction: 'Define named capacity lanes for builder chat, system worker, Strategy Advisor Fast/Deep modes, Claude Code/coding, video/vision, and direct API fallback. Include owner email/account, provider, allowed workloads, weekly/monthly budget, pacing, fallback, stop controls, and which account window each lane burns.',
    statusNote: 'Scoped, not active. Doctrine is locked: Foundation + router + adapters; subscriptions are internal capacity, not the product backend. Before build, require acceptance/proof for named compliant capacity lanes, stop controls, verifier coverage, and process:foundation-ship.',
  },
  {
    id: 'LLM-ROUTER-001',
    title: 'Finish policy-aware LLM router migration',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 6,
    source: '2026-04-25 runtime router doctrine',
    summary: 'Move model workloads through `lib/llm-router.js` one workload family at a time, with actual-call probes, provider/auth-path logging, fallback policy, and blocked direct spend outside approved adapters.',
    whyItMatters: 'The router is how AIOS avoids becoming OpenClaw, Claude Code SDK, or a pile of scripts. It lets Foundation choose the right brain per job while preserving provenance, budget control, and replaceability.',
    nextAction: 'Add the Claude Code / Claude Agent SDK adapter under the same router, then route the next bounded workload family only after probe success and policy classification.',
    statusNote: 'Scoped, not active. OpenClaw/Codex adapter and guarded OpenAI fallback are live for shared-comms extraction/synthesis; Claude Code adapter, hub capacity lanes, and broader workload migration remain open. Before build, require acceptance/proof for one bounded workload family, route probes, verifier coverage, and process:foundation-ship.',
  },
  {
    id: 'FOUNDATION-003',
    title: 'Close source sign-off for SRC-FINANCE-001',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 1,
    source: 'Foundation reset audit + Owners Dashboard finance walkthrough',
    summary: 'Weekly Actuals, Monthly Budget, Cashflow Dash, and the partner-commission normalization boundary are signed off for current-reality meaning.',
    whyItMatters: 'The source layer should not keep reopening finance meaning after the source note already locked the workbook logic. Future payment reconciliation and QuickBooks checks are separate hardening, not current source-signoff blockers.',
    nextAction: 'Treat `SRC-FINANCE-001` as closed for current reality. Keep QuickBooks parked as optional compliance verification and route future work to freshness, payment reconciliation, or automation-hardening cards only when those surfaces are being built.',
    statusNote: 'Closed for current reality. Current doctrine: Weekly Actuals = operating finance ledger, Cashflow Dash = management truth after partner-commission normalization, QuickBooks = optional compliance ledger / verification detail.',
  },
  {
    id: 'FOUNDATION-004',
    title: 'Run an operating-truth refinement pass after the core sheet validations',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 3,
    source: 'Freedom / Owners validation closeout',
    summary: 'After the Freedom Sheet and Owners Admin / finance validations are complete, run one explicit pass to refine the company operating truths: promote durable business rules out of validation notes, remove one-off caveats from the wrong places, and lock what belongs in strategy docs versus source notes versus backlog.',
    whyItMatters: 'Critical business logic like roster semantics, recruiter attribution, community revenue meaning, and company-kept revenue rules should not stay fragmented across sheet notes, handoff packets, and founder memory. The system needs one tuned interpretation layer after the source walk-throughs are done.',
    nextAction: 'Once the current sheet validations are closed, review the captured notes across Freedom, Owners, and finance, then tighten `docs/strategy/operating-truths.md`, trim duplicated interpretation from source notes, file any remaining unresolved business-rule gaps as explicit backlog cards, and produce one final Freedom rebuild blueprint so a future agent can rebuild the workbook logic without rereading the full chat history.',
    statusNote: 'Do this after the current source-validation passes, not in the middle of them. The closeout output should include both refined operating truths and a durable rebuild blueprint.',
  },
  {
    id: 'FOUNDATION-VERIFY-001',
    title: 'Add minimal foundation smoke checks and source-health verification',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 2,
    source: 'Foundation reset audit',
    summary: 'Add the smallest repeatable verification layer that proves the Foundation app, DB-backed trust layer, critical source reads, and source-truth consistency still work after changes.',
    whyItMatters: 'Right now trust depends too much on manual spot checks. The foundation needs a cheap repeatable proof path before more modules, connectors, or agents get added.',
    nextAction: 'Keep expanding the verification pass only when new source surfaces or new write paths close. Do not reopen this as generic test-sprawl.',
    statusNote: 'Done. `npm run foundation:verify` is live and covers the current baseline: core Foundation APIs, Google health, FUB health, and source-truth consistency checks.',
  },
  {
    id: 'FOUNDATION-SWEEP-001',
    title: 'Automate Foundation surface freshness sweeps',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 6,
    source: '2026-04-26 Foundation page stale-status correction',
    summary: 'When source contracts, connectors, jobs, docs, backlog cards, or system maps change, the Foundation UI and docs must update from live data or fail verification. The system should not depend on Steve noticing stale colors, stale page copy, or outdated connector/source states during manual review.',
    whyItMatters: 'A Foundation page that looks current but is stale recreates the old-system failure in a cleaner UI. The whole point of Foundation is visible operating truth: what is connected, trusted, scheduled, stale, failed, missing, or next. If that truth only updates when a human happens to inspect a page, the system will drift every day.',
    nextAction: 'Done for v1. Keep the Foundation surface map and Runtime Health stale-run panel current whenever Foundation nav, APIs, docs, source contracts, job schedules, system inventory, or hub links change. Next Foundation build is `FOUNDATION-CHANGELOG-002`.',
    statusNote: 'Done on 2026-04-28. V1 maps all 31 Foundation nav pages to backing APIs/docs/tables/source IDs/backlog owners, exposes `surfaceFreshnessSweep` in `/api/foundation-hub`, renders the sweep in Runtime Health, adds `foundation:verify` guards, and caught/reaped stale Slack source-crawl run `crawl-slack-current-day-20260427145904292-3f93bebd` through the stale source-crawl run reaper.',
  },
  {
    id: 'FOUNDATION-CHANGELOG-001',
    title: 'Enforce build closeout through Recent Builds and backlog proof',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 7,
    source: '2026-04-27 builder/reviewer drift review',
    summary: 'Make shipped system changes visible in Foundation Recent Builds and require backlog cards moving to done to carry closeout proof instead of relying on chat memory or reviewer recollection.',
    whyItMatters: 'Steve needs to answer what changed, what it does, where it lives, and whether it was accepted without reading git logs or long chats. Build discipline has to be enforced by the system, not remembered by whichever AI is working that day.',
    nextAction: 'Done for v1. Keep Recent Builds as the operator-facing build log and keep the done-lane guard in `updateBacklogItem` / `createBacklogItem`; later hardening can add richer DB-backed change records if the git-backed view is not enough.',
    statusNote: 'Closed on 2026-04-27. Recent Builds is live in Foundation and `foundation:verify` now requires backlog create/update paths to guard cards moving to done with build/change closeout proof instead of a bare lane change.',
  },
  {
    id: 'FOUNDATION-CHANGELOG-002',
    title: 'Make Recent Builds operator-readable',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 8,
    source: '2026-04-28 Steve hard checkpoint after rapid build day',
    summary: 'Upgrade Foundation Recent Builds from a commit/file list into an operator changelog that answers what changed, what it does, why it matters, where it lives, related backlog card, status, proof command, and acceptance state.',
    whyItMatters: 'Steve should not need to read git logs, long chats, or code diffs to understand what was built during a heavy AI build day. If the system cannot explain its own changes, Foundation is not serving as the control plane.',
    nextAction: 'Done for v1. Keep `lib/foundation-build-log.js` closeout records current for major builds, especially when a card moves to done or a heavy build day changes multiple Foundation surfaces.',
    statusNote: 'Closed on 2026-04-28. Recent Builds v2 now merges git commits with repo-truth closeout records, related backlog cards, proof commands, review-next notes, and known limits; `/api/foundation/build-log` exposes grouped day/system payloads; `npm run foundation:verify` passed 103/103 and guards the v2 schema and visible closeout proof.',
  },
  {
    id: 'FOUNDATION-SURFACE-UPDATES-001',
    title: 'Make Foundation surfaces plain-English and easy to inspect',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 9,
    source: '2026-04-28 Steve review of Recent Builds visibility, plain-English Foundation UX, and plan/backlog confusion',
    summary: 'Upgrade Foundation from a technical control panel into a plain-English operator surface: Overview, Systems, Backlog, and Recent Work should explain what the system can do, what is queued, what moved to done, where shipped changes live, and what needs attention without requiring git logs, file paths, or chat memory.',
    whyItMatters: 'Steve reads Foundation like the CEO dashboard for system-building. If the page says Phase 1 but does not match the rebuild plan, if done work has no date, or if Recent Work does not say where to click, Foundation creates confusion instead of command clarity.',
    nextAction: 'Ship the UX/navigation slice: top nav order becomes Overview -> Systems -> Backlog -> Recent Work; Recent Builds / Recent Work defaults collapsed and shows plain-English built/partial/not-yet status, clickable app breadcrumbs, doc links, connector/system touched, and backend-only visibility; Overview gets done-velocity visibility with newest-done first and weekly moved-to-done bars; plan/backlog grouping either matches the rebuild plan or becomes a plain-English command-order view.',
    statusNote: 'Expanded 2026-04-28 from Recent Builds link polish into Foundation operator clarity. Acceptance: plain-English copy is required for all operator-facing closeout entries, status labels, and Foundation page labels; technical terms must have a plain-English meaning next to them; Recent Builds / Recent Work owns the where-it-lives links, app/hub/doc breadcrumbs, and "what changed here" notes; Recent Work links directly to affected app surfaces/docs for at least 3 recent closeouts; done items show moved-to-done date and sort newest-to-oldest in done sections; weekly done-velocity bar chart appears on Overview; the misleading Phase 1 / Truth Cleanup grouping is reconciled to the rebuild plan or replaced by command-order status; backend-only changes say where the effect is visible; `foundation:verify` checks major closeouts include app surface metadata, not just files. Not in scope: full design-system rewrite, full doc redline/highlight engine, user/access control panel, extraction retry/backoff, Strategy/Scoper/Agent work.',
  },
  {
    id: 'BACKLOG-HYGIENE-PASS-001',
    title: 'Clean stale backlog lanes before action-loop work resumes',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 4,
    source: '2026-04-28 Steve escalation: backlog must manage the work, not chat memory',
    summary: 'One-time backlog hygiene pass after stale executing cards were found manually. Walk the live backlog lanes, promote done work, split partial work, clarify active work, and move inactive work out of executing before the Action Router review/apply slice resumes.',
    whyItMatters: 'Foundation cannot claim to be the system-building control plane if Steve has to manually notice stale doing cards. The backlog must show what is actually active, done, scoped, or research before the dev loop builds more UI.',
    nextAction: 'Done for v1. Structural prevention moves to `BACKLOG-HYGIENE-001`, `DEV-PROCESS-AUDIT-001`, and `PROCESS-HOOKS-001`; `FOUNDATION-SURFACE-UPDATES-001` owns the Recent Builds / Recent Work links and where-it-lives UX.',
    statusNote: 'Closed on 2026-04-28. Hygiene pass moved `DOC-AUTHORITY-001` and `DATA-004` to done with proof notes, split `SOURCE-021-PROOF-001` from remaining `SOURCE-021` work, moved `SECURITY-001` and `SECURITY-006` out of executing until provider-side proof is active, and created the structural follow-up cards. Proof command: `npm run foundation:verify`.',
  },
  {
    id: 'BACKLOG-HYGIENE-001',
    title: 'Add automatic backlog hygiene findings',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 4,
    source: '2026-04-28 Steve escalation after stale executing cards were found manually',
    summary: 'Build an autonomous backlog hygiene probe that checks live backlog state against closeout records, commits, status notes, updated dates, and lane rules, then reports plain-English findings when a card looks stale, half-closed, or missing required proof.',
    whyItMatters: 'Steve should not be the stale-card detector. If a card sits in executing with a matching closeout, or a done card lacks proof, Foundation should flag it the same way KPI Health flags stale or drifting source data.',
    nextAction: 'Done for v1. Keep the read-only probe running through `npm run backlog:hygiene`, `/api/foundation-hub > backlogHygiene`, and Runtime Health. Structural enforcement still moves next through `DEV-PROCESS-AUDIT-001` and `PROCESS-HOOKS-001`.',
    statusNote: 'Closed on 2026-04-28. V1 adds `lib/backlog-hygiene.js`, `npm run backlog:hygiene`, synthetic stale-card proof, `/api/foundation-hub > backlogHygiene`, Runtime Health > Backlog Hygiene, and verifier coverage. Default stale executing threshold is 3 days, configurable by CLI/env. Proof commands: `npm run backlog:hygiene -- --includeSynthetic=true` and `npm run foundation:verify`.',
  },
  {
    id: 'DEV-PROCESS-AUDIT-001',
    title: 'Audit the dev-loop failures that let doctrine drift',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 4,
    source: '2026-04-28 Steve escalation after backlog and plan-gate violations',
    summary: 'Review the concrete failures from the 2026-04-28 build loop and turn them into hook requirements: stale lanes, pre-score shipping, manual backlog updates, stale served code, weak where-it-lives metadata, restart-dependent verifier claims, phase/plan confusion, and transient verifier failures from source quotas.',
    whyItMatters: 'Process hooks should prevent real failure patterns, not enforce ceremonial checkboxes. This audit turns the day’s misses into specific gate requirements before hooks are built.',
    nextAction: 'Done for v1. Use `docs/audits/2026-04-28-dev-process-audit.md` as the requirements input for `PROCESS-HOOKS-001`, then return to `ACTION-REVIEW-APPLY-001` after hooks ship.',
    statusNote: 'Closed on 2026-04-28. The audit maps each failure to exactly one owner and lists 10 v1 hook requirements for `PROCESS-HOOKS-001`: card reference, external 9.8+ plan, seven-field closeout draft, default live dashboard proof, served-code equals HEAD, done-card proof, touched-card lane/status update, where-it-lives metadata, red-verifier stop rule, and explicit emergency bypass. Proof command: `npm run foundation:verify`.',
  },
  {
    id: 'PROCESS-HOOKS-001',
    title: 'Add pre-commit and post-ship process gates',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 4,
    source: '2026-04-28 Steve escalation: work like a proper dev team',
    summary: 'Create lightweight process hooks that enforce the dev loop before and after a ship: formal card, external 9.8+ plan, verifier coverage, seven-field closeout draft, live dashboard/served-code proof, touched-card backlog update, where-it-lives metadata, plain-English Recent Builds entry, and proof command.',
    whyItMatters: 'The old dev system had quality gates. The rebuild needs the same discipline so Codex cannot ship code that bypasses the backlog, skips the 9.8 plan gate, or leaves Steve to manually ask where the change lives.',
    nextAction: 'Done for v1. Use `npm run process:ship-check` before trusting a normal ship, then build `ACTION-REVIEW-APPLY-001` and stop to re-plan with Steve.',
    statusNote: 'Closed on 2026-04-28. V1 adds `scripts/process-ship-check.mjs`, `npm run process:ship-check`, `docs/process/ship-check.md`, and approval evidence at `docs/process/approvals/PROCESS-HOOKS-001.json`. The check requires a live backlog card, approval file with score >= 9.8, approver, timestamp, seven-field closeout, where-it-lives metadata, proof command, served dashboard commit equals repo HEAD, red-verifier stop-on-red-verifier behavior, and default `npm run foundation:verify` unless `--skipLiveVerifyReason` is supplied. Proof commands: `npm run process:ship-check -- --card=PROCESS-HOOKS-001 --planApprovalRef=docs/process/approvals/PROCESS-HOOKS-001.json --closeoutKey=process-hooks-v1` and `npm run foundation:verify`. V1 is manual/scripted, not auto-installed as a Git hook.',
  },
  {
    id: 'PROCESS-FANOUT-001',
    title: 'Add post-ship fan-out verification for Foundation closeouts',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 4,
    source: '2026-04-28 Steve command-order reset: nothing manual, ships must update every affected surface',
    summary: 'Turn post-ship fan-out into one process check so a closeout cannot update only code, only live DB, or only docs. The check proves the live backlog card, seven-field closeout, where-it-lives metadata, current plan/state updates, Recent Builds, verifier coverage, served-code trust, skill/doctrine freshness, and identity/memory boundary tracking.',
    whyItMatters: 'A ship is not trustworthy if live Postgres, backlog seed, build-log closeout, current plan/state, Recent Work metadata, served-code proof, and active skill doctrine disagree. Foundation must catch that itself instead of making Steve spot it manually.',
    nextAction: 'Done for v1 after repair. Use `npm run process:fanout-check -- --card=<CARD> --closeoutKey=<KEY>` after a normal Foundation ship, together with `npm run process:ship-check`, before trusting closeout. Wave 2 next: combine VERIFIER-DONE-COVERAGE-001 and VERIFIER-ARTIFACT-EXISTS-001 in one verifier slice, and run WORKER-CODE-TRUST-001 in parallel.',
    statusNote: 'Repaired on 2026-04-28 after audit found the previous done state was false. V1 now actually adds `scripts/process-fanout-check.mjs`, `npm run process:fanout-check`, `docs/process/ship-fanout.md`, approval evidence at `docs/process/approvals/PROCESS-FANOUT-001.json`, closeout key `process-fanout-v1-repair`, and verifier coverage. The check fails if a card/closeout claims missing files, docs, npm scripts, Recent Builds proof, where-it-lives metadata, verifier proof, or stale served dashboard code. V1 is a script gate, not an automatic Git hook.',
  },
  {
    id: 'WORKER-CODE-TRUST-001',
    title: 'Prove the Foundation worker is running current code',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 4,
    source: 'Wave 2 Card 3 after PROCESS-FANOUT-001 repair',
    summary: 'Add served-code trust for the supervised Foundation worker so scheduled jobs cannot keep running old code without Foundation noticing.',
    whyItMatters: 'Dashboard served-code trust only proves the web app is current. The worker runs scheduled jobs in the background, so stale worker code can keep acting even when the dashboard is clean.',
    nextAction: 'Done for v1. Keep worker code trust green through `foundation:verify`. Dead-man liveness, auto-restart-on-push, and broader runtime controls remain under `SYSTEM-010` / `RUNTIME-SUPERVISOR-001`.',
    statusNote: 'Closed on 2026-04-28. V1 makes `scripts/foundation-worker.mjs` capture its startup commit and process id, writes that status to `foundation_runtime_status`, exposes it as `/api/foundation-hub > runtimeSupervisor.workerCode`, renders Foundation > Runtime Health > Worker Code Trust, and makes `foundation:verify` compare the worker startup commit and LaunchAgent pid to repo HEAD. Proof commands: `launchctl kickstart -k gui/$(id -u)/ai.bcrew.foundation-worker`, `npm run foundation:verify`, `npm run process:ship-check -- --card=WORKER-CODE-TRUST-001 --planApprovalRef=docs/process/approvals/WORKER-CODE-TRUST-001.json --closeoutKey=worker-code-trust-v1`, and `npm run process:fanout-check -- --card=WORKER-CODE-TRUST-001 --closeoutKey=worker-code-trust-v1`.',
  },
  {
    id: 'VERIFIER-DONE-COVERAGE-001',
    title: 'Require verifier proof for done backlog cards',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 4,
    source: 'Wave 2 Cards 1+2 after PROCESS-FANOUT-001 false-done repair',
    summary: 'Make `foundation:verify` fail when a `lane: done` backlog card has no ID-named verifier proof and no explicit, approved legacy exception.',
    whyItMatters: 'Done cannot mean "we remember doing it." A done card needs machine-checkable proof or a visible exception so stale or false-done work cannot hide behind process memory.',
    nextAction: 'Done for v1. Keep `docs/process/verifier-exceptions.json` small and review open-ended exceptions before they reach 90 days. Next structural step is `POST-SHIP-FAN-OUT-001` after Wave 2 review.',
    statusNote: 'Closed on 2026-04-28. V1 adds `docs/process/verifier-exceptions.json`, validates exception fields, fails expired or stale open-ended exceptions, detects synthetic done-card-without-proof input, and makes `foundation:verify` require every live done card to have ID-named verifier coverage or a valid legacy exception. Proof commands: `npm run foundation:verify`, `npm run process:ship-check -- --card=VERIFIER-DONE-COVERAGE-001 --planApprovalRef=docs/process/approvals/VERIFIER-DONE-COVERAGE-001.json --closeoutKey=verifier-done-artifact-gates`, and `npm run process:fanout-check -- --card=VERIFIER-DONE-COVERAGE-001 --closeoutKey=verifier-done-artifact-gates`.',
  },
  {
    id: 'VERIFIER-ARTIFACT-EXISTS-001',
    title: 'Fail verification when done work claims missing artifacts',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 4,
    source: 'Wave 2 Cards 1+2 after PROCESS-FANOUT-001 false-done repair',
    summary: 'Make `foundation:verify` scan done cards and closeouts for claimed files, docs, npm scripts, and simple API routes, then fail if any claimed artifact does not exist.',
    whyItMatters: '`PROCESS-FANOUT-001` was marked done while claiming a missing script, doc, and npm command. This check makes that class of lie fail at the main Foundation verifier layer, not only in a one-off process script.',
    nextAction: 'Done for v1. Keep artifact claims plain and concrete in closeouts; dynamic or ambiguous claims should be turned into explicit paths, scripts, or routes before a card moves to done.',
    statusNote: 'Closed on 2026-04-28. V1 adds claimed-artifact detection for files/docs, `npm run` scripts, and simple API routes across done cards and Foundation closeouts. It also proves the detector with a synthetic missing-artifact input and records exception counts in the closeout. Proof commands: `npm run foundation:verify`, `npm run process:ship-check -- --card=VERIFIER-ARTIFACT-EXISTS-001 --planApprovalRef=docs/process/approvals/VERIFIER-ARTIFACT-EXISTS-001.json --closeoutKey=verifier-done-artifact-gates`, and `npm run process:fanout-check -- --card=VERIFIER-ARTIFACT-EXISTS-001 --closeoutKey=verifier-done-artifact-gates`.',
  },
  {
    id: 'POST-SHIP-FAN-OUT-001',
    title: 'Check post-ship fanout before trusting closeouts',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 4,
    source: 'Wave 3 Card 4 after verifier done/artifact gates',
    summary: 'Add a post-ship fanout gate that checks whether a shipped closeout updated the right surrounding surfaces: Backlog, Recent Work, verifier proof, UI surfaces, and rebuild plan/state docs.',
    whyItMatters: 'A ship is not trustworthy if code changed but the operator-facing truth around it did not move. This check catches “code shipped, surrounding truth did not” before Steve has to spot it manually.',
    nextAction: 'Done for v1. Use `npm run process:post-ship-fanout -- --card=<CARD> --closeoutKey=<KEY>` after the normal ship and fanout checks. V1 reports missing fanout; it does not auto-edit backlog, docs, or UI metadata.',
    statusNote: 'Closed on 2026-04-29. V1 adds `lib/post-ship-fanout.js`, `scripts/process-post-ship-fanout.mjs`, `npm run process:post-ship-fanout`, `docs/process/post-ship-fanout.md`, approval evidence at `docs/process/approvals/POST-SHIP-FAN-OUT-001.json`, Runtime Health > Post-Ship Fanout, a synthetic missing-fanout proof, and closeout key `post-ship-fanout-v1`. Proof commands: `npm run foundation:verify`, `npm run process:ship-check -- --card=POST-SHIP-FAN-OUT-001 --planApprovalRef=docs/process/approvals/POST-SHIP-FAN-OUT-001.json --closeoutKey=post-ship-fanout-v1`, `npm run process:fanout-check -- --card=POST-SHIP-FAN-OUT-001 --closeoutKey=post-ship-fanout-v1`, and `npm run process:post-ship-fanout -- --card=POST-SHIP-FAN-OUT-001 --closeoutKey=post-ship-fanout-v1 --commitRef=7335a8f`.',
  },
  {
    id: 'SHEETS-QUOTA-HARDENING-001',
    title: 'Harden Google Sheets quota behavior during verifier and ship gates',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 5,
    source: '2026-04-28 Wave 2 review after repeated Google Sheets 429 verifier interruptions',
    summary: 'Add server-side caching and batch reads for Google Sheets API calls so `foundation:verify` and process ship checks stop tripping the 60/min user quota during dev iteration.',
    whyItMatters: 'Three gates back-to-back can hit Google Sheets quota during normal review. That is annoying now and becomes a real blocker before Wave 5 parallel chats run multiple ship checks at once.',
    nextAction: 'Done for v1. Keep Runtime Health > Sheets API Trust visible during parallel build waves. External Google Cloud quota increase remains an operator checklist in `docs/process/sheets-quota-hardening.md`.',
    statusNote: 'Closed on 2026-04-29. V1 adds `lib/google-sheets-cache.js`, wraps read-only Sheets GET helpers in `lib/google-delegated.js`, adds `getSheetValuesBatch`, switches Drive Sheets extraction to batchGet, exposes `/api/foundation-hub > sheetsApiTrust`, renders Foundation > Runtime Health > Sheets API Trust, and documents the Google Cloud quota request checklist. Writes are never cached and Google API errors are not cached as healthy data. Proof commands: `npm run foundation:verify`, `npm run process:ship-check -- --card=SHEETS-QUOTA-HARDENING-001 --planApprovalRef=docs/process/approvals/SHEETS-QUOTA-HARDENING-001.json --closeoutKey=sheets-quota-hardening-v1`, and `npm run process:fanout-check -- --card=SHEETS-QUOTA-HARDENING-001 --closeoutKey=sheets-quota-hardening-v1`.',
  },
  {
    id: 'DOC-ARCHIVE-AUTO-001',
    title: 'Move old evidence docs out of active folders without deleting them',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 5,
    source: 'Phase D Card 13 from Steve canonical enforcement hit list',
    summary: 'Move stale handoffs, audits, and research notes into `docs/_archive/` so active evidence folders stop looking like current operating truth.',
    whyItMatters: 'Old evidence should stay searchable, but it should not compete with current plan, current state, backlog, or verifier truth. Steve should not have to guess which checkpoint is still active.',
    nextAction: 'Done for v1. Keep protected active handoffs/audits in place only when current source contracts, verifier checks, or rebuild docs still link to them. Future archive work should use `npm run phase-d:cleanup -- --archive --apply` instead of manual moves.',
    statusNote: 'Closed on 2026-04-29. V1 adds `scripts/phase-d-cleanup.mjs`, `docs/process/doc-archive-manifest.json`, `docs/_archive/README.md`, and `docs/_archive/INDEX.md`; 113 files were preserved under `docs/_archive` (87 handoffs, 18 audits, 8 research docs). Runtime Health > Doc Archive Cleanup and `foundation:verify` guard the manifest. Proof commands: `npm run phase-d:cleanup -- --archive --apply` and `npm run foundation:verify`.',
  },
  {
    id: 'RESEARCH-CURATION-001',
    title: 'Make research-lane cards visible without auto-closing them',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 5,
    source: 'Phase D Card 14 from Steve canonical enforcement hit list',
    summary: 'Add a lightweight Research Curation view that preserves research cards and labels them for later human review instead of auto-closing them.',
    whyItMatters: 'Research and pre-backlog ideas are future leverage. Cleanup should make them easier to review, not silently decide they are dead.',
    nextAction: 'Done for v1. Use Foundation > Backlog > Research Curation as the preserved research-card list. Promotion, superseding, or retirement remains a later reviewed backlog action.',
    statusNote: 'Closed on 2026-04-29. V1 exposes `/api/foundation-hub > researchCuration`, renders Foundation > Backlog > Research Curation, preserves all research-lane cards, and verifies zero auto-closed research cards. Proof command: `npm run foundation:verify`.',
  },
  {
    id: 'REBUILD-DOCS-RETIRE-001',
    title: 'Move stale rebuild docs into plan history',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 5,
    source: 'Phase D Card 15 from Steve canonical enforcement hit list',
    summary: 'Move old rebuild plan files into `docs/rebuild/plan-history/` so `current-plan.md` and `current-state.md` remain the active rebuild truth.',
    whyItMatters: 'Multiple rebuild plans make the system feel like it is lying. Historical plans are useful evidence, but they must not sit beside active doctrine as if they are current.',
    nextAction: 'Done for v1. Keep `docs/rebuild/current-plan.md` and `docs/rebuild/current-state.md` as active truth; treat retired rebuild docs as history unless a current card promotes a detail back into active plan.',
    statusNote: 'Closed on 2026-04-29. V1 moved the old rebuild master plan and old rebuild decisions doc into `docs/rebuild/plan-history/`, recorded `docs/process/rebuild-doc-retire-manifest.json`, and verifies the retired files exist while the old active paths are no longer present. Proof commands: `npm run phase-d:cleanup -- --rebuild-retire --apply` and `npm run foundation:verify`.',
  },
  {
    id: 'ARCHIVE-RETIRE-001',
    title: 'Delete only allowlisted safe-delete junk',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 5,
    source: 'Phase D Card 16 from Steve canonical enforcement hit list',
    summary: 'Run the only Phase D delete lane with a strict allowlist for regenerable junk inside explicit safe-delete archives.',
    whyItMatters: 'Cleanup sometimes needs deletion, but it cannot become a broad destructive pass. The system must refuse anything outside the allowlist and record what happened.',
    nextAction: 'Done for v1. Do not delete anything outside the safe-delete allowlist. If no safe-delete archive exists, record “nothing found” and do not improvise.',
    statusNote: 'Closed on 2026-04-29. V1 adds `docs/process/archive-retire-manifest.json`; no explicit safe-delete archive was present, so 0 files were deleted and the script recorded that it did not improvise. The script prints refused entries when non-allowlisted items are found. Proof commands: `npm run phase-d:cleanup -- --archive-retire --apply` and `npm run foundation:verify`.',
  },
  {
    id: 'EXCEPTION-CURATION-001',
    title: 'Triage historical verifier exceptions before they expire',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 5,
    source: 'Wave 3 review after VERIFIER-DONE-COVERAGE-001 added 24 historical exceptions',
    summary: 'Walk the 24 historical verifier exceptions before the 90-day clock expires on 2026-07-27, then add real verifier coverage, retire/restructure cards, or re-approve with updated reasons.',
    whyItMatters: 'Verifier exceptions are a controlled loophole, not a permanent escape hatch. If they are not curated before expiry, foundation:verify should fail instead of letting old done-card gaps hide again.',
    nextAction: 'Done for v1 curation. Next physical cleanup remains before 2026-07-27: add direct verifier coverage, retire/restructure the card, or re-approve with a fresh reason for each exception.',
    statusNote: 'Closed on 2026-04-29 for curation. V1 adds `docs/process/verifier-exception-curation.json`, `/api/foundation-hub > exceptionCuration`, Runtime Health > Exception Curation, and verifier coverage. All 24 historical exceptions are classified without extending the 2026-07-27 deadline. Proof command: `npm run foundation:verify`.',
  },
  {
    id: 'DOCTRINE-PROPAGATION-001',
    title: 'Keep active Foundation doctrine propagated into the working skill',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 4,
    source: 'Wave 4 Card 5 from the canonical enforcement hit list',
    summary: 'Add a doctrine propagation check so the active bcrew-foundation skill carries the current build rules instead of letting stale skill text steer future Codex sessions.',
    whyItMatters: 'Steve should not have to keep re-teaching backlog-pulled work, the 9.8 plan gate, plain-English closeouts, and hit-list sequence. If the working skill drifts, future builders drift too.',
    nextAction: 'Done for v1. Keep the hardcoded doctrine source list in `lib/doctrine-propagation.js` current when new durable rules are approved. `HIT-LIST-RECONCILE-001` owns external hit-list reconciliation later.',
    statusNote: 'Closed on 2026-04-29. V1 adds `lib/doctrine-propagation.js`, `scripts/doctrine-propagation-check.mjs`, `npm run doctrine:propagation-check`, `docs/process/doctrine-propagation.md`, approval evidence at `docs/process/approvals/DOCTRINE-PROPAGATION-001.json`, a generated doctrine section in the local bcrew-foundation skill, `/api/foundation-hub > doctrinePropagation`, Runtime Health > Doctrine Propagation, and synthetic stale-skill proof. Private memory files are checked by timestamp only; their content is not copied into repo truth. Proof commands: `npm run doctrine:propagation-check -- --apply`, `npm run foundation:verify`, `npm run process:ship-check -- --card=DOCTRINE-PROPAGATION-001 --planApprovalRef=docs/process/approvals/DOCTRINE-PROPAGATION-001.json --closeoutKey=doctrine-propagation-v1`, `npm run process:fanout-check -- --card=DOCTRINE-PROPAGATION-001 --closeoutKey=doctrine-propagation-v1`, and `npm run process:post-ship-fanout -- --card=DOCTRINE-PROPAGATION-001 --closeoutKey=doctrine-propagation-v1 --commitRef=483da49`.',
  },
  {
    id: 'DECISION-AUTO-EMIT-001',
    title: 'Auto-create proposed decisions from explicit repo decision language',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 4,
    source: 'Wave 4 Card 6 from the canonical enforcement hit list',
    summary: 'Add a dry-run-first decision emitter that scans commits or checkpoint text for explicit decision verbs and creates proposed DEC records only when apply mode is used.',
    whyItMatters: 'Decisions should not live only in chat, commit prose, or memory. The system needs a safe first pass that turns obvious decisions into reviewable records without locking them automatically.',
    nextAction: 'Done for v1. Use `npm run decision:auto-emit -- --commitRef=<sha>` for dry runs and add `--apply=true` only when a human wants proposed decision records written.',
    statusNote: 'Closed on 2026-04-29. V1 adds `lib/decision-auto-emit.js`, `scripts/decision-auto-emit.mjs`, `npm run decision:auto-emit`, `docs/process/decision-auto-emit.md`, approval evidence at `docs/process/approvals/DECISION-AUTO-EMIT-001.json`, `/api/foundation-hub > decisionAutoEmit`, Foundation > Decisions > Auto-Emitted Decisions, synthetic decision proof, and proposed-only apply mode. It uses only existing categories: strategy, system, execution, people. Proof commands: `npm run decision:auto-emit -- --synthetic=true`, `npm run foundation:verify`, `npm run process:ship-check -- --card=DECISION-AUTO-EMIT-001 --planApprovalRef=docs/process/approvals/DECISION-AUTO-EMIT-001.json --closeoutKey=decision-auto-emit-v1`, `npm run process:fanout-check -- --card=DECISION-AUTO-EMIT-001 --closeoutKey=decision-auto-emit-v1`, and `npm run process:post-ship-fanout -- --card=DECISION-AUTO-EMIT-001 --closeoutKey=decision-auto-emit-v1 --commitRef=HEAD`.',
  },
  {
    id: 'HIT-LIST-RECONCILE-001',
    title: 'Reconcile the external hit list against repo backlog state',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 5,
    source: 'Wave 4 review after Codex nearly skipped Cards 5 and 6',
    summary: 'Create a future check that compares Steve’s canonical enforcement hit list against live backlog state so the builder cannot skip cards because chat memory or repo plan text is incomplete.',
    whyItMatters: 'The Wave 3 review caught a new drift class: the external Google Doc hit list said Phase B had two remaining cards, while Codex almost jumped to Phase C. That truth source needs a governed reconciliation path.',
    nextAction: 'Done for v1. Manually refresh `docs/process/hit-list-snapshot.json` when Steve updates the Google Doc; v1 warns when the snapshot is older than 14 days and does not auto-import private docs.',
    statusNote: 'Closed on 2026-04-29. V1 adds `docs/process/hit-list-snapshot.json`, `/api/foundation-hub > hitListReconcile`, Runtime Health > Hit-List Reconcile, and verifier coverage. Privacy boundary: the repo uses a manually imported snapshot and does not auto-read Steve’s Google Doc.',
  },
  {
    id: 'PHANTOM-CARD-CHECK-001',
    title: 'Fail active docs and code when they reference missing backlog cards',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 4,
    source: 'Phase C Track 1 from Steve canonical enforcement hit list',
    summary: 'Add a card-reference trust check so active Foundation docs and code cannot point Steve at backlog cards that do not exist.',
    whyItMatters: 'A missing card reference is invisible work. If the system says a card owns something, Steve needs that card to exist or the reference to be corrected.',
    nextAction: 'Done for v1. Keep historical handoffs/audits out of the blocking active scan until a later archive cleanup decides how to handle old references.',
    statusNote: 'Closed on 2026-04-29. V1 adds `lib/card-reference-trust.js`, `/api/foundation-hub > cardReferenceTrust`, Runtime Health > Card Reference Trust, synthetic phantom-card proof, and verifier coverage for active doc/code references.',
  },
  {
    id: 'PHASE-NUMBERING-RECONCILE-001',
    title: 'Replace confusing Foundation phase labels with command order',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 4,
    source: 'Phase C Track 1 from Steve canonical enforcement hit list',
    summary: 'Stop showing the old Foundation Overview phase labels as if they were the rebuild plan. Keep Phase 0-8 in docs and show command-order steps in the UI.',
    whyItMatters: 'Steve reads the Overview as the working plan. If the UI says Phase 1 but the rebuild plan means something else, the system is creating drift.',
    nextAction: 'Done for v1. Use the Rebuild Plan docs for phase doctrine and the Foundation UI command-order view for what to work on next.',
    statusNote: 'Closed on 2026-04-29. V1 replaces `Phase Gates ↔ Live Backlog` and old Phase 1-7 labels with `Command Order ↔ Live Backlog`: Keep Maps Current, Monitor Extraction, Harden Corpus Lanes, Freshness And Health, Enforce The Process, Clean Visibility Drift, Close The Action Loop, and Re-Audit Before Features.',
  },
  {
    id: 'SUB-SURFACE-MAPPING-001',
    title: 'Map Foundation sub-surfaces and API routes, not only top-level pages',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 4,
    source: 'Phase C Track 2 from Steve canonical enforcement hit list',
    summary: 'Expand the Foundation surface map so closeouts and Runtime Health can point to specific panels, cards, and API routes instead of broad menu pages.',
    whyItMatters: 'Steve asked where shipped work lives. Top-level page names are not enough once Runtime Health, Recent Work, System Inventory, and source surfaces have many panels.',
    nextAction: 'Done for v1. Keep the surface map updated through post-ship fan-out checks as new Foundation panels and routes are added.',
    statusNote: 'Closed on 2026-04-29. V1 adds sub-surface records for critical Runtime Health gates, Backlog/Recent Work/Data Source panels, and Foundation API routes. Verifier now allows more map entries than top-level nav sections while still requiring every nav section to be mapped.',
  },
  {
    id: 'SYSTEM-INVENTORY-TRUE-UP-001',
    title: 'Make System Inventory match configured plugin capability',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 4,
    source: 'Phase C Track 2 from Steve canonical enforcement hit list',
    summary: 'Correct System Inventory so the plugin count includes Browser Use, Documents, Presentations, and Spreadsheets instead of only curated plugins.',
    whyItMatters: 'The “what can the system do?” page was undercounting runtime capability. That makes Foundation look less capable than the actual Codex environment.',
    nextAction: 'Done for v1. Inventory is config/filesystem-backed, not live MCP introspection. Future connector runtime health can extend this without changing the source-truth boundary.',
    statusNote: 'Closed on 2026-04-29. V1 updates plugin discovery to include openai-curated, openai-bundled, and openai-primary-runtime plugin caches. `/api/system-inventory` and Foundation > System Inventory > Plugins / MCPs now report nine configured plugin surfaces.',
  },
  {
    id: 'RECENT-BUILDS-MULTI-CLOSEOUT-001',
    title: 'Support multiple closeouts for one commit in Recent Work',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 5,
    source: 'Wave 4 review after two parallel cards needed separate commits for separate closeouts',
    summary: 'Let Recent Work show more than one closeout for a single commit when a tightly coupled wave lands together.',
    whyItMatters: 'Parallel tracks sometimes need one commit for coordination but multiple card closeouts for review. Recent Work should not force artificial commit splitting just to show the truth.',
    nextAction: 'Done for v1. Keep richer Recent Work polish under `FOUNDATION-SURFACE-UPDATES-001`; this slice only makes multi-closeout commits visible and collapsed.',
    statusNote: 'Closed on 2026-04-29. V1 groups same-commit closeouts in Recent Builds under a collapsed Multiple Closeouts section while keeping each closeout’s proof, where-it-lives links, and review-next note. Verifier guards that multi-closeout API output and UI rendering do not collapse to one closeout.',
  },
  {
    id: 'FULL-SYSTEM-RE-AUDIT-001',
    title: 'Re-audit Foundation after enforcement and cleanup phases',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 5,
    source: 'Phase E from Steve canonical enforcement hit list',
    summary: 'Run a full system re-audit after Phase A-D cleanup lands, before returning to feature work.',
    whyItMatters: 'Steve needs proof the cleanup actually worked before Scoper, Strategy, Agent Factory, or broader feature work resumes.',
    nextAction: 'Done for v1. Re-audit found 0 blockers, 9 minor-drift areas, and 3 clean areas. Open Phase F with follow-up cards; since `ACTION-REVIEW-APPLY-001` is already done for v1, use that surface or scope the next narrow action-loop child slice after Steve reviews the audit.',
    statusNote: 'Closed on 2026-04-29. Audit artifact `docs/audits/2026-04-29-full-system-re-audit.md` consolidates 12 scoped audit passes. `foundation:verify`, process gates, Recent Builds closeout, and approval evidence prove the re-audit. Phase F recommendation: open with follow-up cards; no blocker found.',
  },
  {
    id: 'DOC-AUTHORITY-INDEX-REPAIR-001',
    title: 'Repair doc authority index drift after archive cleanup',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 6,
    source: 'FULL-SYSTEM-RE-AUDIT-001 Phase E finding',
    summary: 'Clean minor doc-index drift created by retiring old rebuild docs and moving historical evidence to archive folders.',
    whyItMatters: 'The archive cleanup worked, but stale doc links and active-truth labels can make old plan evidence look current again.',
    nextAction: 'Done for v1. Cleanup B can use `docs/process/doc-other-triage.md` for broader doc moves without treating retired plan-history evidence as active doctrine.',
    statusNote: 'Closed on 2026-04-29 in Wave Cleanup A. `docs/README.md` no longer lists retired rebuild decisions as Supporting Truth, plan-history docs now resolve back to `../current-plan.md`, and `docs/INDEX.md` classifies retired rebuild docs as superseded evidence. Proof command: `npm run foundation:verify`.',
  },
  {
    id: 'LOCAL-DOC-LINK-001',
    title: 'Open private local docs from Foundation on the local machine',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 6,
    source: 'Steve Wave Cleanup A: local docs should be clickable only on the local machine',
    summary: 'Make `USER.md`, `TOOLS.md`, `IDENTITY.md`, `HEARTBEAT.md`, and `MEMORY.md` clickable from System Inventory when Foundation is running locally and trusted.',
    whyItMatters: 'Steve needs fast access to private workspace docs during local operation, but those files must stay metadata-only when Foundation is viewed from anywhere else.',
    nextAction: 'Done for v1. Keep the allowlist tight; any new private doc must be deliberately added to `privateLocalMarkdownMeta` and covered by verifier privacy tests.',
    statusNote: 'Closed on 2026-04-29. `/api/foundation/local-doc/:name` opens only five allowlisted repo-root files after local-host, served-code, and repo-root gates pass; non-local, traversal, and non-allowlisted requests return 403. `docs/process/local-doc-link.md` documents the privacy boundary.',
  },
  {
    id: 'DOC-OTHER-TRIAGE-001',
    title: 'Classify System Inventory Other docs before Cleanup B',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 6,
    source: 'Steve Wave Cleanup A: 127 docs in Other need explicit triage before broader cleanup',
    summary: 'Inspect the System Inventory `Other` bucket and classify each doc into the approved 12 categories without moving or deleting files.',
    whyItMatters: 'The 127-doc Other bucket hides doc bloat. Cleanup B needs a concrete input list before any archive, promote, or move work starts.',
    nextAction: 'Done for v1. Cleanup B should use `docs/process/doc-other-triage.md` as input and still preserve the no-delete rule unless a future card explicitly approves deletion.',
    statusNote: 'Closed on 2026-04-29. `docs/process/doc-other-triage.md` reviews 127 Other docs with path, current category, proposed category, status, reason, and owner card. This slice did not move or delete any listed doc.',
  },
  {
    id: 'DOC-CATEGORIZATION-001',
    title: 'Replace System Inventory Other with real doc categories',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 6,
    source: 'Wave Cleanup B after DOC-OTHER-TRIAGE-001 classified 127 Other docs',
    summary: 'Use `docs/process/doc-other-triage.md` and path rules to show tracked docs under the approved 12 categories instead of the vague Other bucket.',
    whyItMatters: 'System Inventory should tell Steve what kind of doc he is looking at. A giant Other bucket recreates hidden doc bloat and makes cleanup depend on manual translation.',
    nextAction: 'Done for v1. Keep the 12-category rule visible in `lib/doc-categorization.js`; future doc moves or deletions still need their own 9.8 card.',
    statusNote: 'Closed on 2026-04-29 in Wave Cleanup B. System Inventory now classifies tracked markdown docs with the approved 12 categories, uses the Other triage report as evidence input, and keeps Local-private separate for private local docs. This slice did not move or delete docs.',
  },
  {
    id: 'DOCTRINE-PROPAGATION-002',
    title: 'Harden doctrine propagation freshness checks',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 6,
    source: 'FULL-SYSTEM-RE-AUDIT-001 Phase E finding',
    summary: 'Extend doctrine propagation beyond the v1 hardcoded memory-file list and improve tier-two persona/skill freshness checks.',
    whyItMatters: 'Doctrine propagation v1 works, but future daily memory files could drift without being noticed if the checker only watches a fixed file list.',
    nextAction: 'Done for v2. Keep private memory detection metadata-only; add any new durable doctrine to the plain-English doctrine source list instead of copying private memory text.',
    statusNote: 'Closed on 2026-04-29 in Wave Cleanup B. V2 detects root private files plus `memory/*.md` by path/mtime only, reports `contentCopied:false`, and checks tier-two persona surfaces through semantic signal groups without auto-editing them.',
  },
  {
    id: 'PROCESS-HOOKS-002',
    title: 'Make process gates harder to forget',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 6,
    source: 'FULL-SYSTEM-RE-AUDIT-001 Phase E finding',
    summary: 'Move from operator-run process gate scripts toward local workflow hooks or stronger default enforcement.',
    whyItMatters: '`process:ship-check`, `process:fanout-check`, and `process:post-ship-fanout` work, but Steve/Codex still have to remember to run them.',
    nextAction: 'Done for v2. Use `npm run process:foundation-ship -- --card=<CARD> --planApprovalRef=<APPROVAL_JSON> --closeoutKey=<KEY> --commitRef=HEAD` before trusting normal Foundation ships.',
    statusNote: 'Closed on 2026-04-29 in Wave Cleanup B. V2 adds `scripts/process-foundation-ship.mjs`, `npm run process:foundation-ship`, and `docs/process/foundation-ship-gate.md`; the wrapper refuses missing required args and runs ship-check, fanout-check, post-ship-fanout, and foundation:verify in order.',
  },
  {
    id: 'GATE-PERFORMANCE-001',
    title: 'Speed up the Foundation ship gate without weakening proof',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 7,
    source: 'Phase G opened after Wave Cleanup B slow gate run',
    summary: 'Optimize the canonical Foundation ship wrapper so normal ships do not rerun the same live verifier twice and timing is visible.',
    whyItMatters: 'The process gate must have teeth, but it cannot be so slow that builders and reviewers start avoiding it. Faster proof keeps discipline usable.',
    nextAction: 'Done for v1. Keep the wrapper target under five minutes for normal ships; profile the timing summary before adding heavier checks.',
    statusNote: 'Closed on 2026-04-29 in Phase G Track 1. V1 runs foundation:verify once at the end, runs fanout checks in parallel, prints per-step timing, and keeps strict duplicate-verifier mode available with `--strictShipCheckVerify=true`.',
  },
  {
    id: 'GATE-RELIABILITY-001',
    title: 'Harden Foundation gate reliability after transient DB deadlocks',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 7,
    source: 'Phase 1 enforcement review found repeated transient DB deadlocks during ship/foundation verifier runs',
    summary: 'Investigate and harden the Foundation gate DB/concurrency path so direct `npm run foundation:verify`, fanout checks, and process wrapper runs do not intermittently fail with `deadlock detected` while permanent gate failures still fail closed.',
    whyItMatters: 'The gates now have teeth, but a flaky gate makes Steve and builders rerun proof by hand and creates doubt about whether a failure is real. Strict enforcement needs reliable execution, not lucky retries.',
    nextAction: 'Done for v1. Keep raw foundation:verify wrapped in bounded transient retry, reset Foundation DB pool state before retry, and keep deterministic fixture proof for transient retry, retry after DB cleanup, and permanent fail-closed behavior.',
    statusNote: 'Closed on 2026-04-29 under foundation-control-layer-v1; patched under gate-reliability-retry-pool-reset-v1 after review found closed-pool retry reuse. V1 adds lib/foundation-gate-reliability.js, scripts/process-gate-reliability-check.mjs, npm run process:gate-reliability-check, deterministic injected transient/permanent proof, raw foundation:verify retry wrapper for transient gate errors, and a retry-after-DB-cleanup proof that resets the Foundation DB pool before the second attempt. It does not induce real DB deadlocks or hide permanent verifier failures. Proof commands: npm run process:gate-reliability-check and npm run foundation:verify.',
  },
  {
    id: 'GATE-RELIABILITY-002',
    title: 'Eliminate recurring foundation:verify transient retry source',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 7,
    source: 'Steve follow-up after PLAIN-ENGLISH-SWEEP-001 verification saw another bounded transient retry',
    summary: 'Diagnose the recurring foundation:verify transient retry class after the retry-pool-reset patch and make future retry output identify the failing subsystem instead of printing only a generic transient retry.',
    whyItMatters: 'A retry that works is still a reliability smell if it keeps recurring without naming the cause. Foundation gates should help the builder tell whether the issue is Postgres deadlock contention, Foundation DB pool cleanup, network transport, external quota, or a permanent verifier failure.',
    nextAction: 'Done for v1. Keep bounded retry behavior, keep permanent failures fail-closed, and use the diagnostic class/subsystem output when any future verifier or ship-wrapper retry fires. The ship wrapper runs fanout gates sequentially by default to avoid the observed local Postgres deadlock class. Next expected Phase G card remains UI-MENU-LAYOUT-POLISH-001 after review.',
    statusNote: 'Closed on 2026-04-30 under gate-reliability-recurring-transient-v1. V1 classifies transient gate failures as postgres-deadlock, foundation-db-pool-closed, network-timeout, or external-quota; process:foundation-ship and foundation:verify print class/subsystem diagnostics; process:foundation-ship runs fanout gates sequentially by default with --parallelFanout=true left as an explicit profiling mode; process:gate-reliability-check covers the recurring deadlock diagnostic plus the existing DB-cleanup retry and permanent fail-closed cases. Proof commands: npm run process:gate-reliability-check, repeated npm run foundation:verify, and npm run process:foundation-ship -- --card=GATE-RELIABILITY-002 --planApprovalRef=docs/process/approvals/GATE-RELIABILITY-002.json --closeoutKey=gate-reliability-recurring-transient-v1 --commitRef=HEAD.',
  },
  {
    id: 'GATE-RELIABILITY-003',
    title: 'Eliminate direct foundation:verify Postgres deadlock source',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 7,
    source: 'UI-MENU-LAYOUT-POLISH-001 independent review found a direct foundation:verify postgres-deadlock retry after GATE-RELIABILITY-002',
    summary: 'Direct Foundation verifier and process gate reads now use read-only DB readiness checks instead of running write-heavy schema/seed initialization during normal review.',
    whyItMatters: 'A verifier that writes schema/seed state while the dashboard or worker is live can deadlock on core Foundation tables and make proof feel like rerun roulette. Review gates should read and verify existing truth, not take DDL locks.',
    nextAction: 'Done for v1. Keep direct verifier gates read-only under normal review, keep safe Postgres metadata diagnostics for future transient retries, and continue to use explicit app startup or approved migration paths for DB initialization.',
    statusNote: 'Closed on 2026-04-30 under gate-reliability-direct-verifier-deadlock-v1. V1 adds read-only DB readiness checks for foundation:verify, process ship/fanout gates, post-ship fanout, and backlog hygiene so direct review proof does not run write-heavy initFoundationDb schema/seed work. Gate reliability proof now covers direct foundation:verify Postgres deadlock metadata with safe code, relation OID, process id, gate label, and retry-attempt diagnostics only; no row data, source content, or private content is logged. Proof commands: npm run process:gate-reliability-check, three repeated npm run foundation:verify runs, npm run backlog:hygiene -- --json, and npm run process:foundation-ship -- --card=GATE-RELIABILITY-003 --planApprovalRef=docs/process/approvals/GATE-RELIABILITY-003.json --closeoutKey=gate-reliability-direct-verifier-deadlock-v1 --commitRef=HEAD.',
  },
  {
    id: 'FOUNDATION-PLAN-RECONCILE-001',
    title: 'Reconcile the hard-checkpoint sprint plan into backlog truth',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 7,
    source: 'Steve hard checkpoint after Phase G Track 1 exposed chat-only scope and missing cards',
    summary: 'Promote the hard-checkpoint sprint plan into live backlog, seed truth, current plan/state, verifier coverage, and Recent Work so the next Foundation sprint starts from repo truth instead of chat memory.',
    whyItMatters: 'Steve should not have to keep re-pasting plans to prevent scope from disappearing. If a review exposes required work, the backlog must carry the full context before another builder starts coding.',
    nextAction: 'Build this before Phase G Track 2. Confirm the Tier 0 cards exist with full context, current-plan/current-state show the sprint order, and verifier coverage fails if those cards disappear.',
    statusNote: 'Scoped from the 2026-04-29 hard checkpoint. This is a planning/backlog-truth repair slice only; it does not build Phase G UI, Strategy, Scoper, Agent Factory, broad source expansion, or retry/backoff.',
  },
  {
    id: 'PERSONAL-WORKSPACE-BOUNDARY-001',
    title: 'Formalize Foundation versus personal workspace boundaries',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 7,
    source: 'Hard checkpoint missed-card audit: local/private files and operator workspace scope were discussed but not carded',
    summary: 'Define which local files and surfaces belong to Steve/private workspace versus shared Foundation repo truth, including USER.md, MEMORY.md, memory/*.md, SOUL.md, TOOLS.md, HEARTBEAT.md, local docs, and operator-only notes.',
    whyItMatters: 'Foundation needs to know these files exist without leaking private content or letting local-only workspace state become accidental product truth.',
    nextAction: 'Done for v1. Keep real private workspace proof metadata-only and use synthetic sentinel fixtures for leak tests.',
    statusNote: 'Closed on 2026-04-29 under foundation-control-layer-v1. V1 adds lib/foundation-personal-workspace-boundary.js, scripts/process-personal-workspace-boundary-check.mjs, docs/process/personal-workspace-boundary.md, /api/foundation-hub > personalWorkspaceBoundary, metadata-only real private file proof, and synthetic sentinel leak proof. Real private content is not copied, quoted, summarized, tokenized, or logged. Proof commands: npm run process:personal-workspace-boundary-check and npm run foundation:verify.',
  },
  {
    id: 'CEO-DASHBOARD-PATTERN-001',
    title: 'Define the CEO dashboard pattern for Foundation surfaces',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 7,
    source: 'Hard checkpoint missed-card audit: CEO dashboard pattern was referenced in memory/plan but never made a backlog object',
    summary: 'Turn Steve’s operator-surface expectations into a reusable Foundation pattern: what changed, where it lives, what to review, what is blocked, what is next, and what confidence/proof exists.',
    whyItMatters: 'Every Foundation page should reduce decision friction. Without a shared CEO-dashboard pattern, builders keep shipping technically correct panels that still force Steve to translate the system.',
    nextAction: 'Done for v1. Use docs/process/ceo-dashboard-pattern.md as the control contract before any Phase G operator UI or polish work.',
    statusNote: 'Closed on 2026-04-29 under foundation-control-layer-v1. V1 adds docs/process/ceo-dashboard-pattern.md, lib/foundation-ceo-dashboard-pattern.js, /api/foundation-hub > ceoDashboardPattern, and verifier coverage for required operator answers: what changed, where it lives, what to review, what is blocked, what is next, proof/confidence, empty state, and error state. It does not implement Phase G UI polish. Proof commands: npm run foundation:verify.',
  },
  {
    id: 'APPROVAL-FILE-INTEGRITY-001',
    title: 'Make 9.8 approval evidence tamper-evident',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 7,
    source: 'Hard checkpoint audit: approval JSON exists but can be self-attested or edited without structural proof',
    summary: 'Harden plan-approval evidence so a 9.8 score links to the approved plan content, card, approver, timestamp, and expected build context instead of being only editable repo JSON.',
    whyItMatters: 'The 9.8 gate has teeth only if the approval evidence cannot be casually rewritten after the fact. Otherwise the gate can become theater while still passing scripts.',
    nextAction: 'Done for v1. Use approvalSchemaVersion 2 for new Foundation approval files; legacy approval files are accepted only when listed in docs/process/approval-legacy-exceptions.json.',
    statusNote: 'Closed on 2026-04-29 under phase-1-enforcement-v1. V1 adds lib/approval-integrity.js, scripts/approval-integrity-check.mjs, docs/process/approval-integrity.md, docs/process/approved-plans/phase-1-enforcement-v1.md, v2 approval files for the Phase 1 cards, approval digest/hash validation inside process:ship-check, and synthetic tampered-plan proof. Proof commands: npm run process:approval-integrity-check -- --synthetic=true and npm run foundation:verify.',
  },
  {
    id: 'DOCTRINE-PROPAGATION-003',
    title: 'Close remaining doctrine propagation gaps',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 7,
    source: 'Hard checkpoint audit after doctrine propagation v1/v2: several durable rules were still missing from generated doctrine',
    summary: 'Extend the generated Foundation doctrine source with the remaining operating rules: nothing manual, memory is not backlog, and pre-commit/ship gate required.',
    whyItMatters: 'If durable operating rules live only in chat, each new session can drift. The active skill and Foundation surfaces need the current doctrine without copying private memory content.',
    nextAction: 'Done for v3. Keep generated doctrine aligned with lib/doctrine-propagation.js and continue treating private-memory signals as metadata-only.',
    statusNote: 'Closed on 2026-04-29 under foundation-control-layer-v1. V3 adds the missing control-layer doctrine for nothing manual, memory is not backlog, pre-commit/ship gate required, metadata-only private proof, reliable gate failures, proposed-only detected decisions, and CEO-dashboard operator questions. Proof commands: npm run doctrine:propagation-check and npm run foundation:verify.',
  },
  {
    id: 'DECISION-AUTO-EMIT-002',
    title: 'Promote real pivots and commitments into decision records',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 7,
    source: 'Hard checkpoint audit: many pivots/parks/adopts happened in chat and commits, but decision records did not capture them automatically',
    summary: 'Upgrade decision auto-emission so explicit pivot, park, adopt, defer, lock, disable, override, or sequence-change language in closeouts and plan updates becomes a proposed decision record with source proof.',
    whyItMatters: 'Foundation cannot explain why direction changed if decisions remain hidden in chat. The decision ledger should capture the actual control-plane moves that shape the rebuild.',
    nextAction: 'Done for v2. Use dry-run first, scan only approved tracked source surfaces, refuse private workspace text files before read, and keep apply mode proposed-only.',
    statusNote: 'Closed on 2026-04-29 under foundation-control-layer-v1. V2 adds override and sequence-change detection, approved Foundation source-surface scanning, private workspace text-file refusal before content read, duplicate proof, and proposed-only apply safety. It does not silently create applied or locked decisions. Proof commands: npm run decision:auto-emit -- --synthetic=true, npm run decision:auto-emit -- --foundationSources=true, and npm run foundation:verify.',
  },
  {
    id: 'BUILD-LOG-BACKLOG-ID-FIX-001',
    title: 'Fix build-log backlog ID cross-pollution',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 7,
    source: 'Hard checkpoint audit: multi-closeout commits can smear related backlog IDs across separate closeout records',
    summary: 'Tighten Recent Work closeout grouping so each closeout shows only its intended backlog cards while still allowing multiple closeouts on one commit.',
    whyItMatters: 'Recent Work is supposed to tell Steve exactly what changed and what card owns it. Cross-polluted backlog IDs make proof look broader than it is and weaken review trust.',
    nextAction: 'Done for v1. Keep closeout-owned backlogIds explicit and move incidental/context card references into mentionedBacklogIds instead of relatedBacklog ownership.',
    statusNote: 'Closed on 2026-04-29 under phase-1-enforcement-v1. V1 changes lib/foundation-build-log.js so closeout records own only explicit backlogIds, exposes mentionedBacklog separately, keeps same-commit closeouts grouped, and adds synthetic plus live API proof that ownership stays exact. Proof commands: npm run foundation:verify and live /api/foundation/build-log inspection.',
  },
  {
    id: 'PRE-COMMIT-HOOK-INSTALL-001',
    title: 'Install local Git hook enforcement for Foundation ships',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 7,
    source: 'Hard checkpoint audit: process gates exist but are still manual unless the builder remembers to run them',
    summary: 'Add a real local hook or repo-managed hook installer so Foundation ship gates cannot be honestly skipped by a direct commit/push workflow.',
    whyItMatters: 'Scripts are not enforcement if nobody is forced to run them. The process must fail closed enough that Steve is not the manual QA system.',
    nextAction: 'Done for v1. Keep .githooks installed with npm run process:install-hooks; process:foundation-ship remains the canonical full gate and records local proof for protected Foundation pushes.',
    statusNote: 'Closed on 2026-04-29 under phase-1-enforcement-v1. V1 adds .githooks/pre-commit, .githooks/pre-push, lib/process-git-hooks.js, scripts/install-git-hooks.mjs, scripts/process-git-hook-check.mjs, npm run process:install-hooks, npm run process:git-hook-check, docs/process/git-hooks.md, protected Foundation path rules, local core.hooksPath proof, and explicit bypass reason/follow-up-card behavior. Proof commands: npm run process:install-hooks, npm run process:git-hook-check -- --mode=pre-commit, and npm run foundation:verify.',
  },
  {
    id: 'CLOSEOUT-BACKFILL-001',
    title: 'Backfill or exception missing closeout proof for done cards',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 7,
    source: 'Backlog Hygiene still reports done-without-proof warnings after verifier done-card coverage landed',
    summary: 'Review done cards that still lack enough closeout proof, backfill real proof where it exists, and explicitly exception or move any card whose proof cannot be found.',
    whyItMatters: 'A done lane is only useful if done means proven. Missing closeout proof keeps old work ambiguous and weakens Recent Work as the system history.',
    nextAction: 'Done for v1. Preserve docs/process/closeout-backfill-phase-1.md as the frozen target list and keep future closeout-proof cleanup under explicit backlog cards.',
    statusNote: 'Closed on 2026-04-29 under phase-1-enforcement-v1. V1 snapshots the 13 Backlog Hygiene done_without_closeout_proof targets in docs/process/closeout-backfill-phase-1.md, backfills real proof where available, preserves historical verifier exceptions where proof is incomplete, and updates status notes without inventing new proof. Proof commands: npm run backlog:hygiene and npm run foundation:verify.',
  },
  {
    id: 'PLAIN-ENGLISH-SWEEP-001',
    title: 'Run a plain-English sweep across Foundation operator surfaces',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 7,
    source: 'Path A Phase G planning opened after Wave Cleanup B',
    summary: 'Review Foundation operator copy so failure messages, panel labels, and next actions say what is wrong, what it means, and what to do next.',
    whyItMatters: 'Foundation can be technically correct and still hard to operate if Steve has to translate jargon during a build day.',
    nextAction: 'Done for v1. Stop for review; next expected Phase G card is UI-MENU-LAYOUT-POLISH-001 unless Steve changes the order.',
    statusNote: 'Closed on 2026-04-30 under plain-english-sweep-v1. V1 updates Foundation operator copy only, records 60 audited copy entries across Backlog/Action Review, Runtime Health, Recent Work/Build Log, Data Sources, System Inventory, and shell/nav/mobile/error/empty states, and records 24/24 manual route/viewport passes. No IDs, selectors, API shapes, route names, data contract keys, source IDs, card IDs, table names, proof commands, source-contract strings, layout, Recent Work redesign, source expansion, Strategy, Scoper, Agent Factory, corpus, research, or action-review workflows changed. Proof commands: npm run process:plain-english-sweep-check, npm run backlog:hygiene -- --json, npm run foundation:verify, live /api/foundation-hub proof, live /api/foundation/build-log proof, and npm run process:foundation-ship -- --card=PLAIN-ENGLISH-SWEEP-001 --planApprovalRef=docs/process/approvals/PLAIN-ENGLISH-SWEEP-001.json --closeoutKey=plain-english-sweep-v1 --commitRef=HEAD.',
  },
  {
    id: 'CHANGE-LOG-COMPREHENSIVE-001',
    title: 'Make the Foundation change log comprehensive and easy to audit',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 7,
    source: 'Path A Phase G planning opened after Wave Cleanup B',
    summary: 'System Activity now has a comprehensive source-backed changelog with recent highlights, by-surface grouping, by-type grouping, raw evidence rows, inspectable evidence refs, and owner/context card separation.',
    whyItMatters: 'Steve needs Foundation to explain what changed and where it lives without rebuilding context from chat.',
    nextAction: 'Done for v1. Stop for review; next expected Phase G card is DAILY-EXEC-SUMMARY-001 unless Steve changes the order.',
    statusNote: 'Closed on 2026-04-30 under change-log-comprehensive-v1. V1 adds /api/foundation/change-log as an additive source-backed changelog layer over verified closeouts, DB change_events, and changed-file evidence; /api/foundation/changes remains backward-compatible. System Activity now shows recent highlights, by-surface groups, by-type groups, and a raw evidence feed with inspectable evidence refs. The process check proves 40+ entries, 20+ verified closeout-backed entries, at least 8/10 change types unless absence is proven, latest 5 Recent Builds represented, the current closeout represented, zero ownership/context smearing, no silent missing categories, and no private/local file content copied into entries. This did not implement Daily Exec Summary, source lifecycle expansion, Strategy, Scoper, Agent Factory, corpus, research cleanup, or a new feature lane.',
  },
  {
    id: 'RECENT-BUILDS-BILLION-DOLLAR-UI-001',
    title: 'Upgrade Recent Builds into a billion-dollar operator UI',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 7,
    source: 'Path A Phase G planning opened after Wave Cleanup B',
    summary: 'Recent Work / Recent Builds is now an executive-grade review surface with collapsed closeout cards, a review-next queue, proof visibility, owner/context separation, and same-commit closeouts that remain individually reviewable.',
    whyItMatters: 'Recent Builds is the trust surface for whether the system is actually improving. It should feel like a serious operator dashboard, not a raw audit feed.',
    nextAction: 'Done for v1. Stop for review; next expected Phase G card is CHANGE-LOG-COMPREHENSIVE-001 unless Steve changes the order.',
    statusNote: 'Closed on 2026-04-30 under recent-builds-billion-dollar-ui-v1. Recent Work now has an executive summary, visible review-next queue, collapsed-by-default closeout cards, proof/known-limit/where-it-lives sections, separate owning-card and context-card treatments, and same-commit groups that stay grouped while keeping each closeout individually reviewable. Ownership semantics remain exact: backlogIds own cards only, mentioned/context cards stay context only. This did not implement comprehensive changelog, daily summary, source lifecycle expansion, Strategy, Scoper, Agent Factory, corpus, research cleanup, or a new feature lane.',
  },
  {
    id: 'DAILY-EXEC-SUMMARY-001',
    title: 'Create a daily executive summary surface',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 7,
    source: 'Path A Phase G planning opened after Wave Cleanup B',
    summary: 'Foundation now has a date-scoped daily executive summary surface that shows where the day started, what changed, what shipped, what remains, what was learned, what is next, and proof/evidence refs.',
    whyItMatters: 'A clean Foundation should reduce the amount of chat archaeology Steve needs before deciding what to do next.',
    nextAction: 'Done for v1. Stop for review; next expected Phase G card is SOURCE-LIFECYCLE-EXPANSION-001 unless Steve changes the order.',
    statusNote: 'Closed on 2026-04-30 under daily-exec-summary-v1. V1 adds /api/foundation/daily-summary as an additive date-scoped summary layer over Recent Work, comprehensive changelog, current plan/state, live backlog truth, action/research disposition summaries, and recorded proof. Foundation > Daily Summary shows selected date, recent-day selector/list, where we started, what changed, what shipped, what remains, what we learned, what is next, and proof/evidence refs. The process check proves evidence refs on every section, latest 5 Recent Builds represented, this closeout represented, shipped/still-open/needs-review/next-build separation, no ownership/context smearing, no private/local content copied, and existing build-log/changelog/changes API compatibility. This did not implement source lifecycle expansion, Strategy, Scoper, Agent Factory, corpus, research cleanup, Action Review applying, or a new feature lane.',
  },
  {
    id: 'SOURCE-LIFECYCLE-EXPANSION-001',
    title: 'Expand the source intelligence lifecycle',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 7,
    source: 'Path A Phase G planning opened after Wave Cleanup B',
    summary: 'Foundation now has a source lifecycle visibility/control layer that shows which source lanes are connected, verified, extracted, reviewed, retried, or parked without starting new ingestion.',
    whyItMatters: 'Source coverage should improve from trusted command order, not random corpus expansion. Missing and underdeveloped lanes need to be visible before any future source build is approved.',
    nextAction: 'Done for v1. Stop for review. Do not start any new source build automatically; Steve decides the next Foundation gate or feature lane from the reviewed lifecycle surface.',
    statusNote: 'Closed on 2026-04-30 under source-lifecycle-expansion-v1. V1 adds /api/foundation/source-lifecycle and Foundation > Data Sources > Lifecycle as an additive visibility/control layer over all 35 source contracts and all 12 governed extraction targets. It shows included lanes, parked/blocked lanes, extraction caps, target states, lifecycle definitions, and metadata-only evidence refs. It does not create new extraction targets, increase quotas, activate Strategy Hub, Scoper, Agent Factory, broad corpus expansion, research cleanup, Action Review applying, or a new feature lane.',
  },
  {
    id: 'FOUNDATION-FOLLOWUP-CARD-CAPTURE-001',
    title: 'Capture post-Phase-G follow-up cards before new builds',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 7,
    source: 'SOURCE-LIFECYCLE-EXPANSION-001 review accepted on 2026-04-30',
    summary: 'The missing follow-up cards from the accepted source lifecycle review are now captured as real scoped backlog cards with full context and build order.',
    whyItMatters: 'The Foundation build sequence should not depend on chat memory. If the next Systems grouping, Agent Onboarding Feedback system, and feedback send-path work are not in backlog truth, the system can drift into feature work without clear scope or approval boundaries.',
    nextAction: 'Done for v1. Stop for review. Next expected build order is 1. FOUNDATION-SYSTEMS-SERVICE-GROUPING-001, 2. AGENT-ONBOARDING-FEEDBACK-SYSTEM-001, 3. AGENT-FEEDBACK-SEND-001.',
    statusNote: 'Closed on 2026-04-30 under foundation-followup-card-capture-v1. Created and scoped FOUNDATION-SYSTEMS-SERVICE-GROUPING-001, AGENT-ONBOARDING-FEEDBACK-SYSTEM-001, and AGENT-FEEDBACK-SEND-001 with required deep context. PEOPLE-006 remains related/context only. This capture build did not send Gmail, write ClickUp Requested, implement Systems grouping, start feature work, or start Strategy, Scoper, Agent Factory, corpus, source expansion, or research cleanup.',
  },
  {
    id: 'FOUNDATION-SYSTEMS-SERVICE-GROUPING-001',
    title: 'Group Foundation Systems by service area',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 8,
    source: 'Post SOURCE-LIFECYCLE-EXPANSION-001 review follow-up',
    summary: 'The Foundation Systems page now groups the 12 existing grouped systems by the approved business/service areas while preserving source-backed system detail.',
    whyItMatters: 'Foundation Systems now reads by how the business works. Service-area grouping makes it clear which systems serve Foundation, Strategy, Sales, Recruiting, Marketing, onboarding, deals, finance, operations, extraction, people, and review/accountability without inventing fake systems.',
    nextAction: 'Done for v1. Stop for review. Next expected card is AGENT-ONBOARDING-FEEDBACK-SYSTEM-001. Approved service groups: Foundation / Control Plane; Strategy / Leadership; Sales; Recruiting; Marketing - Clients; Marketing - Agents; Agent Onboarding; Client Onboarding; Closing / Deals; Finance; Operations; Source Intelligence / Extraction; People / Retention; Review Queues / Accountability.',
    statusNote: 'Closed on 2026-04-30 under foundation-systems-service-grouping-v1. Classified the 12 existing grouped systems into the 14 approved service groups with one primary serviceArea and valid secondaryServiceAreas where needed. Sales and Recruiting must stay separate. No combined Sales/Recruiting bucket. Systems touching both use primary + secondary service area. Empty service groups may show No mapped systems yet. Partial and planned systems stay labeled. No Gmail send. No ClickUp Requested writeback. No Agent Onboarding Feedback system build. No AGENT-FEEDBACK-SEND-001. No Strategy, Scoper, Agent Factory, corpus/source expansion, research cleanup, or any new feature lane.',
  },
  {
    id: 'AGENT-ONBOARDING-FEEDBACK-SYSTEM-001',
    title: 'Expose Agent Onboarding Feedback as a real Foundation/Ops system',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 9,
    source: 'Post SOURCE-LIFECYCLE-EXPANSION-001 review follow-up',
    summary: 'Agent Onboarding Feedback is now visible as a partial Foundation/Ops system with trigger, source, queue, form, writeback, statuses, blockers, proof surfaces, and privacy boundaries.',
    whyItMatters: 'The 30/60/90 onboarding feedback lane already has pieces in ClickUp, Ops review, private token forms, and response/writeback code. It needs one visible system record before the production send path is built.',
    nextAction: 'Done for v1. Stop for review. Next expected Agent Feedback build is AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001 before Steve full-loop live testing. SYS-AGENT-ONBOARDING-FEEDBACK-001 stays implementationState partial until the governed send loop ships live.',
    statusNote: 'Closed on 2026-04-30 under agent-onboarding-feedback-system-v1. Added SYS-AGENT-ONBOARDING-FEEDBACK-001 to /api/source-of-truth groupedSystems as the 13th grouped system, preserved the existing 12 grouped systems, mapped the system to Agent Onboarding, and marked implementationState partial because the queue, /agent-feedback private-token form, agent_onboarding_feedback_responses table, and Completed/Score/Feedback writeback path exist but the production Gmail send path and ClickUp Requested writeback are not built yet. Preserved system context: System name: Agent Onboarding Feedback. Operating area: Agent Onboarding. Source of truth: ClickUp Agent Roster. Trigger: Real Start Date + day 30/60/90. Current queue: Agent Roster review / Ops review queue. Current form: /agent-feedback private token link. Current writeback: Onboarding NPS 30/60/90 Status, Score, Feedback fields. Current statuses: not due, due, requested, completed, skipped, blocked, expired window. Current blockers after AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001: missing Real Start Date, missing Company Email, invalid Company Email, expired send window, missing/invalid feedback fields. Contract Link is warning-only. Proof surfaces: Ops Hub Agent Roster queue, /api/owners/review-queue, ClickUp task, feedback response DB table agent_onboarding_feedback_responses, Gmail send proof once send path exists. Privacy boundary: private feedback links, no private feedback content broadly exposed, feedback content visible only in approved owner/review surfaces. Known test cases: Steve Zahnd: Day-30 dry-run eligible through Company Email; Georgia: Real Start Date 2026-03-29, Day-30 due 2026-04-28, due item exists; Chris: does not fire until Real Start Date is set/readable. Proof is metadata-only for known cases. No Gmail send. No ClickUp Requested writeback. This card created/scoped FOUNDATION-SYSTEMS-EMPTY-GROUP-AUDIT-001 as context only, kept AGENT-FEEDBACK-SEND-001 scoped, did not send Georgia a survey, did not build the production email path, did not broaden Systems regrouping, and did not copy private feedback tokens, feedback content, or raw email addresses into tracked docs, verifier logs, build log, or manual proof.',
  },
  {
    id: 'AGENT-FEEDBACK-SEND-001',
    title: 'Build governed Agent Onboarding Feedback email send path',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 10,
    source: 'Post SOURCE-LIFECYCLE-EXPANSION-001 review follow-up',
    summary: 'Stage 1 of the 30/60/90 onboarding feedback send path is built and dry-run proven without sending Gmail or writing ClickUp Requested.',
    whyItMatters: 'Sending agent feedback emails is an external action with privacy and ClickUp writeback implications. It must be dry-run-first, approval-gated, duplicate-safe, and proven before real sends.',
    nextAction: 'Done for Stage 1. Stop for review. The next live test is AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001 after AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001; no Georgia test is the current target.',
    statusNote: 'Closed on 2026-04-30 under agent-feedback-send-v1 for Stage 1 only, then policy-corrected by AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001. Dry-run first. No real send without Steve exact SEND APPROVED or a later approved production-all artifact. Agent Feedback sends use ClickUp Company Email only for every request, test send, auto-send candidate, and reminder candidate. Personal Email is not used for Agent Feedback send eligibility. Onboarding feedback sends use BCC/internal oversight roles Steve, Carson, Ryan, and Georgia by default, with To-recipient dedupe. Capture Gmail message/thread ID only after approval. Built eligibility, metadata-only dry-run, duplicate-send protection, Gmail send path wiring, Requested writeback sequencing, privacy checks, and verifier coverage. Mark Requested in ClickUp only after Gmail send succeeds. Duplicate send protection. No send if Company Email is missing or invalid. No send if milestone window expired. Contract Link is warning/data-quality metadata only and does not block 30/60/90 onboarding feedback send eligibility. Steve Zahnd Day-30 dry-run is eligible through Company Email and is the next live full-loop test target; Georgia may remain eligible in dry-run but is not the test target. No Gmail send. No ClickUp Requested writeback. No Georgia survey. Submitted feedback still writes Completed, score, and feedback text back to the correct ClickUp Onboarding NPS 30/60/90 Status, Score, and Feedback fields. Feedback response is stored in the agent_onboarding_feedback_responses table with task ID, agent name, milestone day, token hash, score, feedback, and submitted timestamp. Feedback content is not broadly exposed outside approved owner/review surfaces. Private feedback token URLs, raw email addresses, and feedback content are not copied into tracked proof.',
  },
  {
    id: 'AGENT-FEEDBACK-AUTO-SEND-001',
    title: 'Build governed Agent Onboarding Feedback auto-send readiness',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 11,
    source: 'Steve clarification after AGENT-FEEDBACK-SEND-001 Stage 2 readiness',
    summary: 'The Agent Onboarding Feedback send path now has daily auto-send readiness scanning and two-key live-send controls, with no Gmail send or ClickUp Requested writeback during this build.',
    whyItMatters: 'The intended end-state is governed automatic 30/60/90 feedback sending, not manual one-off sends. The system needs scanner, reporting, side-effect safety, duplicate protection, and explicit live-send controls before Steve approves any test or production send mode.',
    nextAction: 'Done for readiness. Stop for review. Next decision is AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001, then AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001. Production-all requires a separate approval artifact.',
    statusNote: 'Closed on 2026-05-01 under agent-feedback-auto-send-v1 as auto-send readiness only, then policy-corrected by AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001. V1 adds a daily dry-run/report scanner over the ClickUp Agent Roster for 30/60/90 onboarding feedback candidates, reports would-send/sent/skipped/blocked/warning/repair counts in Runtime Health and Ops, and keeps default behavior dry-run/report-only. Live sends require both AGENT_FEEDBACK_AUTO_SEND_ENABLED=true and an approved mode/allowlist artifact; toggle alone cannot send, allowlist alone cannot send, and production-all requires a separate approval artifact. Auto-send candidates use Company Email only. Steve Zahnd Day-30 is eligible in dry-run and is the next full-loop test target; Georgia Day-30 may remain eligible in dry-run but is not the live test target. Contract Link remains warning-only. Duplicate-send protection and Gmail-before-ClickUp Requested sequencing remain enforced; if Gmail succeeds but ClickUp Requested fails, the send attempt stays in sent/repair state and does not become resendable. No Gmail send, no ClickUp Requested writeback, no broad live auto-send, no raw email addresses, token URLs, or feedback content were written to tracked docs, verifier logs, build log, or broad API JSON. Closeout owns only AGENT-FEEDBACK-AUTO-SEND-001.',
  },
  {
    id: 'AGENT-FEEDBACK-RESPONSE-NOTIFY-001',
    title: 'Notify internal oversight when onboarding feedback is submitted',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 12,
    source: 'Steve response-notification gate before Georgia live-send',
    summary: 'Agent Onboarding Feedback submissions now notify Steve, Carson, Ryan, and Georgia internally after the response is saved, with ClickUp writeback status and duplicate protection.',
    whyItMatters: 'A Georgia or future agent survey is not useful if completed feedback sits quietly in the database. Internal oversight needs a private notification after submission, including repair status when ClickUp writeback fails.',
    nextAction: 'Done for v1. Stop for review. Response notifications remain active for the Steve full-loop test and later production-all enablement.',
    statusNote: 'Closed on 2026-05-01 under agent-feedback-response-notify-v1. V1 sends internal response notifications only after agent_onboarding_feedback_responses saves the submitted feedback and after the ClickUp Completed/Score/Feedback writeback attempt. Notifications go to internal oversight roles Steve, Carson, Ryan, and Georgia using approved internal email identities. The internal email includes agent name, milestone day, score, feedback text, submitted timestamp, ClickUp task/source reference, and ClickUp writeback status. If ClickUp writeback fails after DB save, the notification still sends with repair status clickup_completed_writeback_failed. Duplicate notification protection is keyed by response_id in agent_onboarding_feedback_response_notifications. Synthetic dry-run proof covers success and repair paths with no Gmail send. Tracked docs, verifier logs, build log, and broad API proof use roles/hashes only and do not copy private tokens, raw email addresses, or feedback text. No external survey email, ClickUp Requested writeback, live auto-send, Strategy, Scoper, Agent Factory, corpus/source expansion, research cleanup, or new feature lane happened. Closeout owns only AGENT-FEEDBACK-RESPONSE-NOTIFY-001.',
  },
  {
    id: 'AGENT-FEEDBACK-REMINDER-CADENCE-001',
    title: 'Build Agent Onboarding Feedback reminder cadence readiness',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 13,
    source: 'Steve reminder cadence gate before full-loop test',
    summary: 'Agent Onboarding Feedback now has dry-run reminder cadence readiness with schedule, caps, stop rules, duplicate slot protection, ledger schema, and Runtime/Ops counts.',
    whyItMatters: 'Before Steve tests the full loop, the system needs the reminder lane in place so request, reminder, submission, ClickUp writeback, and internal notification can be exercised without redesigning the send path mid-test.',
    nextAction: 'Done for readiness. Stop for review. Next expected step is AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001, then AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001; no live reminder, Georgia send, Steve test, production auto-send, or ClickUp Requested writeback happened in this build.',
    statusNote: 'Closed on 2026-05-01 under agent-feedback-reminder-cadence-v1 as reminder cadence readiness only. V1 adds the reminder schedule day 1, day 3, day 7, day 10, day 14, and day 17 after a successful initial request, with cap 6 reminders or 30 days after initial request. No reminder can run before a successful initial request exists in agent_onboarding_feedback_send_attempts with status clickup_requested. Reminders stop if feedback is completed or ClickUp status is Completed, Skipped, or Blocked. Duplicate slot protection is keyed by agent_onboarding_feedback_reminder_attempts clickup_task_id + milestone_day + reminder_slot_key. Runtime Health and Ops expose pending, sent, skipped, blocked, maxed-out, repair, warning, and next-due counts. AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001 makes reminder recipients use Company Email only. Dry-run/report mode only; no live reminder send, Georgia send, Steve test, production auto-send, ClickUp Requested writeback, Gmail send, raw email address, token URL, or feedback-content exposure happened. Closeout owns only AGENT-FEEDBACK-REMINDER-CADENCE-001.',
  },
  {
    id: 'AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001',
    title: 'Make Agent Feedback sends use Company Email only',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 14,
    source: 'Steve mission to get Agent Feedback live without one-person patches',
    summary: 'Agent Feedback request sends, test sends, auto-send readiness, and reminder readiness now use ClickUp Company Email only, with Personal Email removed from send eligibility.',
    whyItMatters: 'The Steve full-loop dry-run was blocked because the workflow still treated non-Georgia targets as external agents and looked for Personal Email. Agent Feedback is a company-roster workflow, so all eligibility must use Company Email before live testing or production auto-send.',
    nextAction: 'Done for v1. Next build is AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001 for Steve Zahnd only, then AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001 after the full loop passes.',
    statusNote: 'Closed on 2026-05-01 under agent-feedback-company-email-policy-v1. Agent Feedback request sends, auto-send candidates, reminder candidates, and test sends now use ClickUp Company Email only. Personal Email is not used anywhere in Agent Feedback send eligibility, and legacy Personal Email blockers cannot appear in Agent Feedback checks. Contract Link remains warning-only. BCC oversight remains Steve, Carson, Ryan, and Georgia with To-recipient dedupe. The route-specific approval validator supports any approved target, not Georgia only. Test allowlists and auto-send allowlists support any named target while production-all remains a separate approval mode. Proof shows Steve Zahnd Day-30 dry-run eligible via Company Email, Georgia Day-30 eligible via Company Email when checked but not the live test target, and a synthetic external agent eligible via Company Email. Send, auto-send, reminder, and response-notify checks passed. No Gmail send, no ClickUp Requested writeback, no production auto-send, no Georgia test, and no raw emails/tokens/feedback content in tracked proof.',
  },
  {
    id: 'AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001',
    title: 'Run the Steve Zahnd Agent Feedback full-loop test',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 15,
    source: 'Steve mission to get Agent Feedback live',
    summary: 'Run one controlled live onboarding feedback loop on the Steve Zahnd card only: request email, Requested writeback, form submission, DB save, Completed/Score/Feedback writeback, response notification, reminder stop, and duplicate protection.',
    whyItMatters: 'The live system needs one end-to-end proof on Steve before production auto-send is enabled. This proves Gmail, ClickUp Requested, feedback submission, DB persistence, ClickUp completion fields, internal notification, reminder stop, and duplicate ledger behavior together.',
    nextAction: 'Not accepted. Build AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001 before any production enablement. The repair must prove Steve submitted through the real emailed browser link.',
    statusNote: 'Reopened on 2026-05-01 after Steve reported the browser submit failed because the live test script consumed the emailed token with a synthetic controlled response. The prior proof remains evidence of the failure mode only, not acceptance. Production auto-send is stopped until AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001 sends a fresh Steve Day-30 email, waits for Steve to submit the real browser link, and proves DB response, ClickUp Completed/Score/Feedback, notification, reminder stop, and duplicate protection.',
  },
  {
    id: 'AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001',
    title: 'Repair Steve full-loop test for real browser submission',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 16,
    source: 'Steve correction after script consumed the emailed full-loop token',
    summary: 'Split Steve full-loop testing into send-only/manual-user and dry-run-only synthetic modes, supersede the script-consumed test artifacts, send one fresh Steve Day-30 request, and verify Steve submits through the real emailed browser link.',
    whyItMatters: 'The previous script proved internal plumbing but invalidated the actual user experience by consuming Steve’s token before he could submit. Production cannot start until the real browser path is proven.',
    nextAction: 'Done for repair. Stop before production enablement. The next card remains AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001 only after separate production approval; start with dry-run production report, not live auto-send.',
    statusNote: 'Closed on 2026-05-01 under agent-feedback-real-user-submit-repair-v1. The repair split send-only/manual-user mode from dry-run-only synthetic-submit, disabled live synthetic consumption of the emailed token, superseded the prior script-consumed Steve Day-30 response without deleting evidence, sent one fresh Steve Day-30 Company Email request, and waited for Steve to submit from the real emailed browser link. Final proof shows the DB saved the real browser response, ClickUp Completed/Score/Feedback writeback succeeded, internal notification sent to Steve/Carson/Ryan/Georgia, reminder readiness stops because feedback is completed, duplicate submit returns the clear already-submitted message, duplicate resend is blocked before Gmail or ClickUp side effects, manual-user BCC metadata is correct with Steve deduped from actual BCC, production auto-send remains disabled, Georgia was not the target, and no other roster send happened. Closeout owns only AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001.',
  },
  {
    id: 'FOUNDATION-VERIFY-HEALTH-REPAIR-001',
    title: 'Repair Foundation verifier health before production auto-send',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 17,
    source: 'Steve directive after AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001 acceptance',
    summary: 'Fix or classify the three remaining foundation:verify failures: worker startup code trust, DAILY-EXEC-SUMMARY-001, and AGENT-ONBOARDING-FEEDBACK-SYSTEM-001.',
    whyItMatters: 'The onboarding real-user flow is proven, but production auto-send should not start while Foundation health is red. The verifier must be green before the production enablement card opens.',
    nextAction: 'Done for health repair. Next card is AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001, starting with a dry-run production report and separate production approval. Do not enable production auto-send from this closeout.',
    statusNote: 'Closed on 2026-05-01 under foundation-verify-health-repair-v1. Worker startup code trust was real served-code drift and was repaired by restarting the Foundation worker so it serves HEAD. DAILY-EXEC-SUMMARY-001 was stale date-scoped verifier expectation and now compares latest Recent Work builds as of the selected summary date. AGENT-ONBOARDING-FEEDBACK-SYSTEM-001 was stale live source-context wording and now records explicit status vocabulary, live-send Gmail proof wording, and current Chris source-state proof. Full foundation:verify is green, backlog hygiene is green, dashboard and worker serve HEAD, the real-user Agent Feedback repair remains accepted, production auto-send remains disabled, no Gmail was sent, and no ClickUp writeback happened. Closeout owns only FOUNDATION-VERIFY-HEALTH-REPAIR-001.',
  },
  {
    id: 'AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001',
    title: 'Enable governed Agent Feedback production auto-send',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 18,
    source: 'Steve mission to get Agent Feedback live after full-loop proof',
    summary: 'Production-all auto-send is live for eligible 30/60/90 onboarding feedback initial requests through the governed two-key approval path.',
    whyItMatters: 'The end state is a live daily Agent Roster scan that sends eligible onboarding feedback requests automatically, records proof, starts reminders after Requested, and notifies internal oversight after responses.',
    nextAction: 'Closed under agent-feedback-production-autosend-enable-v1. Live reminders are now handled by AGENT-FEEDBACK-LIVE-REMINDERS-001.',
    statusNote: 'Closed on 2026-05-01 under agent-feedback-production-autosend-enable-v1. Production auto-send is live with AGENT_FEEDBACK_AUTO_SEND_ENABLED=true and the approved production artifact. The daily job runs at 8:30 AM America/Toronto, fails closed outside the 8:30-10:00 AM America/Toronto send window, uses Company Email only, BCCs Steve/Carson/Ryan/Georgia with To/BCC dedupe, writes ClickUp Requested only after Gmail succeeds, blocks repeat sends through agent_onboarding_feedback_send_attempts, records non-resend repair state if Gmail succeeds and ClickUp Requested writeback fails, and exposes enabled state, send window, last run, next run, sent/skipped/blocked/warning/repair counts in Runtime/Ops. Controlled production proof is metadata-only with no raw emails, private token URLs, raw tokens, or feedback content. Reminder sends were intentionally left to AGENT-FEEDBACK-LIVE-REMINDERS-001. Closeout owns only AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001. Proof commands include npm run agent-feedback:auto-send -- --mode=live --maxSends=5, npm run process:agent-feedback-production-autosend-enable-check, npm run backlog:hygiene -- --json, and npm run foundation:verify.',
  },
  {
    id: 'AGENT-FEEDBACK-LIVE-REMINDERS-001',
    title: 'Enable governed Agent Feedback live reminders',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 19,
    source: 'Steve mission to make the full Agent Onboarding Feedback loop live',
    summary: 'Live reminders are enabled for requested-but-not-completed 30/60/90 onboarding feedback, using the existing cadence and the approved 8:30-10:00 AM America/Toronto send window.',
    whyItMatters: 'Production initial requests are live, but the full loop is not running until requested feedback receives governed follow-up reminders without duplicate sends or off-hours outreach.',
    nextAction: 'Closed under agent-feedback-live-reminders-v1. Stop for Steve review. Next work is the systems visibility pass, then Foundation + Strategy only.',
    statusNote: 'Closed on 2026-05-02 under agent-feedback-live-reminders-v1. Live reminders are enabled with AGENT_FEEDBACK_REMINDERS_ENABLED=true and the approved production reminder artifact. The reminder job runs at 8:30 AM America/Toronto, fails closed outside the 8:30-10:00 AM America/Toronto send window before Gmail, ClickUp, or reminder ledger side effects, uses ClickUp Company Email only, BCCs Steve/Carson/Ryan/Georgia with To/BCC dedupe, follows the day 1, 3, 7, 10, 14, and 17 cadence after the initial Requested timestamp, blocks repeat reminder slots through agent_onboarding_feedback_reminder_attempts, does not write ClickUp Requested, and stops after feedback is completed, skipped, or blocked. Georgia Huntley Day-30 and Chris Chopite Day-30 have exactly one protected Requested initial attempt each; no reminder was due in the controlled run, and both next reminder states are deferred to 2026-05-03T00:00:00.000Z unless completed first. Broad proof is metadata-only with no raw emails, private token URLs, raw tokens, or feedback content. Closeout owns only AGENT-FEEDBACK-LIVE-REMINDERS-001.',
  },
  {
    id: 'SYSTEM-REGISTRATION-SWEEP-001',
    title: 'Register shipped systems in Foundation Systems',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 20,
    source: 'Steve systems visibility pass after Agent Feedback live reminders',
    summary: 'GLS is registered as its own live Sales system in Foundation Systems/source truth, and shipped-system registration now has verifier coverage.',
    whyItMatters: 'A shipped system should not depend on memory or a hub page to be discoverable. Foundation Systems must show what is live, what source owns it, where to open it, and which closeout proves it.',
    nextAction: 'Closed under system-registration-sweep-v1. Stop for Steve review. Do not start new GLS features, onboarding features, Strategy, Scoper, Agent, corpus, or broad Foundation cleanup from this closeout.',
    statusNote: 'Closed on 2026-05-02 under system-registration-sweep-v1. Added SYS-SALES-GLS-001 as GLS System / Get Listings Sold under Sales with implementationState live, routes /sales#gls-dashboard and /sales#gls-system, ClickUp Deal Data Entry / SRC-CLICKUP-001 as source truth, KPI Shopping List / SRC-SUPABASE-001 as supporting evidence only, trigger active listings crossing stale threshold, owner lane Sales Leadership, and proof SALES-GLS-SCOREBOARD-V1 closeout. Confirmed SYS-AGENT-ONBOARDING-FEEDBACK-001 remains visible as live under Agent Onboarding. Added process:system-registration-sweep-check and foundation:verify coverage so protected shipped systems fail when missing from /api/source-of-truth groupedSystems / Foundation Systems. Closeout owns only SYSTEM-REGISTRATION-SWEEP-001.',
  },
  {
    id: 'AGENT-FEEDBACK-GEORGIA-SEND-001',
    title: 'Send the approved Georgia onboarding feedback request',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P2',
    rank: 19,
    source: 'AGENT-FEEDBACK-SEND-001 Stage 1 follow-up',
    summary: 'Paused Georgia-specific live-send card retained as historical context only; Steve full-loop test is now the active live test path.',
    whyItMatters: 'Georgia helped prove readiness, but the current mission is not another one-off Georgia patch. The system must prove Steve real-user browser submit, then production auto-send.',
    nextAction: 'Do not build unless Steve explicitly reopens a Georgia-specific send. Active order is AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001, then AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001 after repair acceptance.',
    statusNote: 'Scoped by AGENT-FEEDBACK-SEND-001 as historical context and superseded by AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001 plus the Steve full-loop test path. Georgia Day-30 may remain eligible in dry-run through ClickUp Company Email, but Georgia is not the live test target. Onboarding feedback sends use Company Email only, BCC/internal oversight roles Steve, Carson, Ryan, and Georgia by default, and To-recipient dedupe. Contract Link is warning/data-quality metadata only and does not block 30/60/90 onboarding feedback send eligibility. Proof must remain metadata-only except Gmail message/thread IDs and ClickUp Requested writeback confirmation after an approved send; no token URLs, raw email addresses, or feedback content in tracked proof.',
  },
  {
    id: 'FOUNDATION-SYSTEMS-EMPTY-GROUP-AUDIT-001',
    title: 'Audit empty Foundation Systems service groups',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P2',
    rank: 11,
    source: 'FOUNDATION-SYSTEMS-SERVICE-GROUPING-001 review follow-up',
    summary: 'Audit every empty Systems service group and decide whether it is truly empty, missing an existing system mapping, or needs a new scoped system-build card.',
    whyItMatters: 'Empty service groups are useful signals. They should not be filled with fake systems, but they also should not hide missing mappings for Recruiting, Finance, onboarding, deals, people, or marketing-client systems.',
    nextAction: 'Plan the audit only when Steve approves this card. Every empty group gets a disposition: valid empty, existing system to map, or new scoped card needed. Findings must be visible in backlog/current plan. No fake systems. Sales and Recruiting stay separate.',
    statusNote: 'Scoped on 2026-04-30 by AGENT-ONBOARDING-FEEDBACK-SYSTEM-001 as context only. After Agent Onboarding Feedback is mapped, Agent Onboarding should no longer be empty. Remaining empty groups should be audited without inventing fake systems: Recruiting, Marketing - Clients, Client Onboarding, Closing / Deals, Finance, and People / Retention unless source-backed evidence changes before the audit. This card stays scoped and is not owned by agent-onboarding-feedback-system-v1.',
  },
  {
    id: 'UI-MENU-LAYOUT-POLISH-001',
    title: 'Polish Foundation UI, menus, and layout',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 7,
    source: 'Path A Phase G planning opened after Wave Cleanup B',
    summary: 'Foundation navigation, page hierarchy, mobile behavior, and System Inventory current-vs-archive/history split are polished for operator use.',
    whyItMatters: 'The Foundation UI is now the control surface for the system. It needs to be usable enough that Steve trusts it under pressure.',
    nextAction: 'Done for v1. Stop for review; next expected Phase G card is RECENT-BUILDS-BILLION-DOLLAR-UI-001 unless Steve changes the order.',
    statusNote: 'Closed on 2026-04-30 under ui-menu-layout-polish-v1. Default System Inventory current-doc view excludes archive/history docs, Archive / History is available at /foundation#inventory-archive-history, private/local docs remain metadata-only, and desktop/mobile manual review passed for the required routes. This did not redesign Recent Work, changelog, daily summary, source lifecycle, Strategy, Scoper, Agent Factory, corpus, research, or action-review workflows.',
  },
  {
    id: 'BACKLOG-HYGIENE-PASS-002',
    title: 'Clean the remaining Foundation backlog hygiene warnings',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 7,
    source: 'Foundation 1100 Review Sprint approved at 9.8 on 2026-04-29',
    summary: 'Snapshot and clean the 20 remaining Backlog Hygiene warnings so scoped work stops sounding active and active P0 cards carry enough process-gate clarity before Phase G starts.',
    whyItMatters: 'Phase G should start from trusted command order, not a backlog where old scoped cards read like active work or P0 cards lack proof expectations.',
    nextAction: 'Done for v1. Keep npm run backlog:hygiene and process:foundation-review-sprint-check in the proof chain before Phase G starts.',
    statusNote: 'Closed on 2026-04-30 under foundation-1100-review-v1. Baseline snapshot in docs/process/foundation-1100-review-sprint.json captured 20 hygiene warnings before wrapper-card creation; final Backlog Hygiene is healthy with 0 findings. Proof commands: npm run backlog:hygiene -- --json, npm run process:foundation-review-sprint-check, and npm run foundation:verify.',
  },
  {
    id: 'ACTION-REVIEW-CLEANUP-001',
    title: 'Curate pending source-derived action routes',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 7,
    source: 'Foundation 1100 Review Sprint approved at 9.8 on 2026-04-29',
    summary: 'Snapshot and review the 18 pending Action Review routes into clear dispositions without applying business, owner-action, finance, sales, people, customer, invoice, or access-grant routes without Steve route-specific approval.',
    whyItMatters: 'Action Router is only useful if pending routes become trusted review truth instead of a pile of ambiguous source-derived suggestions.',
    nextAction: 'Done for v1. Keep business/owner-action routes classified/recommended only until Steve approves a specific route for apply.',
    statusNote: 'Closed on 2026-04-30 under foundation-1100-review-v1. Baseline snapshot captured 18 pending Action Review routes; final proof records Foundation 1100 curation metadata on 18/18 routes, applies 0 routes in this sprint, and preserves the no business/external side-effect boundary. Proof commands: npm run process:foundation-review-sprint-check, live /api/foundation/action-review, and npm run foundation:verify.',
  },
  {
    id: 'RESEARCH-CURATION-002',
    title: 'Disposition the preserved research and future-build cards',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 7,
    source: 'Foundation 1100 Review Sprint approved at 9.8 on 2026-04-29',
    summary: 'Disposition the 102 preserved research/future-build cards into keep-research or park-future-build using existing backlog/API metadata only.',
    whyItMatters: 'Research cards should not look like active backlog, but curation must not explode into deep investigation or broad source expansion before Phase G readiness.',
    nextAction: 'Done for v1. Keep the 102 research/future-build dispositions as triage only; deeper work needs a later approved investigation or scoped build plan.',
    statusNote: 'Closed on 2026-04-30 under foundation-1100-review-v1. Baseline snapshot captured 102 research/future-build cards and assigns 102 disposition-only calls: 85 park-future-build and 17 keep-research. No research card was deleted, deep-researched, implemented, or source/corpus-expanded. Proof commands: npm run process:foundation-review-sprint-check, /api/foundation-hub > researchCuration, and npm run foundation:verify.',
  },
  {
    id: 'PHASE-G-READINESS-001',
    title: 'Set final Phase G order after cleanup',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 7,
    source: 'Foundation 1100 Review Sprint approved at 9.8 on 2026-04-29',
    summary: 'Use backlog hygiene, action review, and research curation outputs to lock the final Phase G order before any Phase G UI build starts.',
    whyItMatters: 'Phase G should open from clean Foundation command order, with language/layout work sequenced before bigger executive surfaces and source expansion kept last.',
    nextAction: 'Done for v1. Stop for review, then submit a separate 9.8-ready plan for PLAIN-ENGLISH-SWEEP-001 unless Steve changes the Phase G order.',
    statusNote: 'Closed on 2026-04-30 under foundation-1100-review-v1. Final Phase G order is recorded as PLAIN-ENGLISH-SWEEP-001, UI-MENU-LAYOUT-POLISH-001, RECENT-BUILDS-BILLION-DOLLAR-UI-001, CHANGE-LOG-COMPREHENSIVE-001, DAILY-EXEC-SUMMARY-001, SOURCE-LIFECYCLE-EXPANSION-001. SECURITY-002 and SYSTEM-010 stay gates before broader hub/autonomous work; EXTRACT-RETRY-001 builds only when failed crawl items justify it. Proof commands: npm run process:foundation-review-sprint-check and npm run foundation:verify.',
  },
  {
    id: 'SOURCE-CONTRACT-CLEANUP-001',
    title: 'Clean active source-contract references',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 4,
    source: 'Phase C Track 3 from Steve canonical enforcement hit list',
    summary: 'Make every active `SRC-*` reference resolve to a declared source contract or an explicit historical classification.',
    whyItMatters: 'Source IDs are supposed to be trusted references. If active code or docs use source IDs that do not exist, Foundation is pointing at fake truth.',
    nextAction: 'Done for v1. Keep `docs/process/source-contract-cleanup.md` as the evidence table for historical aliases and future candidates until those sources are actually built.',
    statusNote: 'Closed on 2026-04-29. V1 adds proposed source contracts for `SRC-STRATEGY-QUARTER-001` and `SRC-MYICRO-001`, classifies historical/audit-only source references, adds `lib/source-reference-trust.js`, and verifies zero undeclared active source references.',
  },
  {
    id: 'VERIFIER-CONSOLIDATION-001',
    title: 'Consolidate duplicate verifier checks and rewrite jargon messages',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 4,
    source: 'Phase C Track 3 from Steve canonical enforcement hit list',
    summary: 'Make the verifier easier to maintain and make failure messages plain enough for an operator to act on.',
    whyItMatters: 'A verifier that only Codex understands is not a trust layer. Failures need to explain what broke and what to do next.',
    nextAction: 'Done for v1. Keep future verifier changes helper-backed where practical and keep error labels plain-English first.',
    statusNote: 'Closed on 2026-04-29. V1 adds source-reference trust helper checks, documents six consolidated verifier patterns, rewrites/document 11 operator-facing verifier messages, and keeps `foundation:verify` green with no coverage loss.',
  },
  {
    id: 'MEMORY-001',
    title: 'Stand up the business memory foundation in PostgreSQL',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 2,
    source: 'Rebuild foundation',
    summary: 'Create the structured store for sessions, decisions, backlog items, parking lot items, and open questions.',
    whyItMatters: 'Volatile work should not live in markdown; the old system already proved that.',
    nextAction: 'Use the live PostgreSQL memory layer as the base for follow-on cards like native memory, activity history, policy output, and verification instead of reopening this foundation card.',
    statusNote: 'Closeout backfilled on 2026-04-29 under CLOSEOUT-BACKFILL-001. Evidence: historical done state is explicitly preserved in docs/process/verifier-exceptions.json, and npm run foundation:verify plus npm run backlog:hygiene now keep the remaining uncertainty visible instead of treating a bare done note as proof.',
  },
  {
    id: 'MEMORY-002',
    title: 'Enable the OpenClaw native memory baseline',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 3,
    source: 'Memory architecture call',
    summary: 'Enable OpenClaw `memory-core`, `active-memory`, and `dreaming` as the baseline recall layer before layering on heavier external memory systems.',
    whyItMatters: 'This gives Harlan real recall without prematurely adopting a more complex external stack.',
    nextAction: 'Update the OpenClaw config to enable the native memory plugins, restart the gateway cleanly, and run a real recall check using BCrew facts that should persist across sessions.',
    statusNote: 'Scoped, not active. Before build, require acceptance/proof for native OpenClaw memory enablement, clean gateway restart, real recall check, verifier coverage, and process:foundation-ship before benchmarking Honcho, Hindsight, or any heavier memory layer.',
  },
  {
    id: 'SCHEMA-001',
    title: 'Remove decision-category taxonomy drift',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 4,
    source: 'Foundation reset audit',
    summary: 'Align the decision seed data, UI, and canonical validator around one category set so the live trust layer does not violate its own rules.',
    whyItMatters: 'The seed still uses legacy categories like foundation, data, and memory while the live app expects strategy, system, execution, and people. That drift quietly weakens trust.',
    nextAction: 'Keep future decision work aligned to the canonical categories and treat any new category drift as a fresh schema bug instead of reopening this card.',
    statusNote: 'Closeout backfilled on 2026-04-29 under CLOSEOUT-BACKFILL-001. Evidence: historical done state is explicitly preserved in docs/process/verifier-exceptions.json, and npm run foundation:verify plus npm run backlog:hygiene now keep the remaining uncertainty visible instead of treating a bare done note as proof.',
  },
  {
    id: 'SOURCE-001',
    title: 'Revalidate Gmail as a rebuild source contract',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 3,
    source: 'Foundation reset audit',
    summary: 'Prove Gmail read access in the rebuild, define what shared communication truth it owns, and mark the signed-off boundary in the source registry instead of assuming the old-system connection still counts.',
    whyItMatters: 'Email is not just a later sales or ops tool. It is part of the shared cross-hub communication memory layer for decisions, follow-through, meeting prep, and leadership context. If Gmail is assumed instead of revalidated, the system will reason over a communications source that may not actually be ready.',
    nextAction: 'Use the live delegated Gmail reader to define the exact mailbox boundary, search presets, and archive / normalization path the Foundation shared-communications layer should trust first, then decide what still belongs to Missive instead of Gmail.',
    statusNote: 'Delegated Gmail reads are now live in the rebuild for `ai@bensoncrew.ca`, including search, message read, and thread read. The remaining work is signed-off scope and normalization, not basic access.',
  },
  {
    id: 'SOURCE-002',
    title: 'Revalidate Google Calendar as a rebuild source contract',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 4,
    source: 'Foundation reset audit',
    summary: 'Prove Calendar access in the rebuild, define which calendars and cadence truths it owns, and capture the exact signed-off boundary for meeting-prep and governance workflows.',
    whyItMatters: 'Calendar is part of the shared communications and cadence memory layer, not just a later department tool. The system cannot safely treat it as live operating truth until the rebuild-specific connection and scope are verified.',
    nextAction: 'Use the live delegated Calendar reader to define the exact primary calendars, event classes, and governance reads the Foundation shared-communications layer should trust first, then decide what should later move into hub-specific workflows.',
    statusNote: 'Delegated Calendar reads are now live in the rebuild for `ai@bensoncrew.ca`, including bounded event listing. The remaining work is signed-off scope and normalization, not basic access.',
  },
  {
    id: 'SOURCE-003',
    title: 'Revalidate Google Drive as a rebuild source contract',
    team: 'foundation',
    lane: 'ranked',
    priority: 'P1',
    rank: 5,
    source: 'Foundation reset audit',
    summary: 'Prove Drive access in the rebuild, define which docs and folders are canonical, and record the signed-off scope for strategy, meeting artifacts, and source-linked supporting material.',
    whyItMatters: 'Drive is part of the shared business memory layer because leadership notes, strategy docs, and working artifacts live there. If Drive scope remains fuzzy, the system will mix canonical material with random readable files.',
    nextAction: 'Keep the delegated Google Workspace Drive path as the canonical standard. Treat the Strategy Folder as quarterly strategy-evidence intake under SRC-GDRIVE-001, not as canonical strategy itself, and keep extracted evidence linked back to canonical strategy docs, Strategy Hub, and Action Router outputs.',
    statusNote: 'Foundation shared-memory source for docs, notes, and supporting artifacts. Google Workspace should standardize on the delegated path here. 2026-04-26 update captured the Strategy Folder operating model in docs/source-notes/google-drive-corpus.md.',
  },
  {
    id: 'SOURCE-004',
    title: 'Revalidate ClickUp as a rebuild source contract',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 36,
    source: 'Foundation reset audit',
    summary: 'Verify the rebuild can read ClickUp, then lock the workflow boundary it actually owns now: active-agent roster, onboarding, culture workflow, contract-link monitoring, and Ops deal closeout tasks.',
    whyItMatters: 'ClickUp is now proven as the live roster and deal-workflow source. If that boundary stays fuzzy, contract knowledge and Ops follow-through will keep living in Steve memory, spreadsheet leftovers, and ungoverned task names.',
    nextAction: 'Keep Deal Data Entry `Full Deal List` (`8chw3b6-33791`) and Steve-visible Operations Agent Roster default view (`6-901113292355-1`) as the v1 governed working views. Require Deal # / Trade Number on transaction tasks, and require Real Start Date on roster records because it triggers the AIOS day-30/day-60/day-90 onboarding feedback review lane.',
    statusNote: 'Closeout backfilled on 2026-04-29 under CLOSEOUT-BACKFILL-001. Evidence: historical done state is explicitly preserved in docs/process/verifier-exceptions.json. Existing source-boundary details remain: Deal Data Entry has AIOS review fields; Conditional forecast rebuilds from ClickUp; Admin review joins ClickUp by Deal # first, then property/address fallback; Agent Roster is live in Ops for contract-link, roster baseline, onboarding NPS trigger checks, private AIOS feedback, ClickUp writeback, and personal-email coverage.',
  },
  {
    id: 'SOURCE-005',
    title: 'Revalidate Slack as a rebuild source contract',
    team: 'foundation',
    lane: 'done',
    priority: 'P2',
    rank: 37,
    source: 'Foundation reset audit',
    summary: 'Verify Slack connectivity in the rebuild, define what communication truth it owns, and decide whether it belongs in the Foundation shared communications layer or only as a later notification surface.',
    whyItMatters: 'Slack was present in the old system, but the rebuild should not assume it is part of the trusted communication layer until the connector and scope are revalidated.',
    nextAction: 'Keep the existing bot identity, make the rollout list explicit, and invite it to missing channels that matter starting with accountability. The open work is archive/extraction hardening and coverage, not rediscovering whether Slack is readable.',
    statusNote: 'Closeout backfilled on 2026-04-29 under CLOSEOUT-BACKFILL-001. Evidence: historical done state is explicitly preserved in docs/process/verifier-exceptions.json. Existing source-boundary details remain: Slack auth, channel listing, channel history, and thread archive are live; the remaining gap is channel coverage for channels the bot cannot read yet.',
  },
  {
    id: 'SOURCE-006',
    title: 'Revalidate Missive as a rebuild source contract',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P2',
    rank: 38,
    source: 'Foundation reset audit',
    summary: 'Verify Missive connectivity in the rebuild and lock its live role as the shared email workspace for inboxes, comments, routing, and internal conversation context.',
    whyItMatters: 'Missive is a real operating source here, not a maybe-tool. If the rebuild cannot read the email threads, internal comments, and @mentions where work is actually getting discussed, the system will miss major operating context.',
    nextAction: 'Use the live Missive bridge to define the exact inboxes, assignment context, and comment surfaces the Foundation shared-communications layer should trust first, then normalize those reads alongside Gmail instead of treating them as separate systems.',
    statusNote: 'Missive reads are now live in the rebuild for org health, inbox conversations, and full thread reads. The remaining work is signed-off scope and normalization, not basic connectivity.',
  },
  {
    id: 'SOURCE-007',
    title: 'Revalidate DataForSEO as a rebuild source contract',
    team: 'foundation',
    lane: 'research',
    priority: 'P2',
    rank: 39,
    source: 'Foundation reset audit',
    summary: 'Verify DataForSEO connectivity in the rebuild, define the SEO truths it can provide, and record whether it should remain part of the new operating surface or stay dormant until marketing expansion.',
    whyItMatters: 'SEO tooling existed in the old stack, but it is not foundation-safe to assume that connection or its business value without a rebuild-specific check.',
    nextAction: 'Confirm DataForSEO access, identify the exact ranking or keyword workflows still worth trusting, and decide whether it belongs in the foundation backlog now or only after marketing restarts.',
    statusNote: 'Useful later, not a blocker for the first trusted loop.',
  },
  {
    id: 'SOURCE-008',
    title: 'Revalidate Follow Up Boss as a rebuild source contract',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 6,
    source: 'Foundation reset audit + Owners Dashboard handoff',
    summary: 'Prove Follow Up Boss access in the rebuild, lock the Owners-to-FUB join path, and define what CRM truth is safe to trust for attribution, ISA evidence, referral chains, and deal-triggered contact cleanup.',
    whyItMatters: 'Owners closeout now has a live proof case: `T#26100` resolves from the Owners row to a real FUB person with matching address, company-style source context, and ISA evidence. Until that join path and CRM boundary are explicit, attribution and AI review will stay founder-memory work.',
    nextAction: 'Keep the read boundary aligned with Admin review and Ops findings. Do not add FUB mutations until an approval-gated apply lane exists.',
    statusNote: 'Closed on 2026-04-25 for the Owners/Admin parity read boundary. Column BZ -> FUB person joins are signed off for identity, source, stage, assigned-agent, tag, address, phone, and email parity; Owners remains the deal ledger and source-row write target.',
  },
  {
    id: 'SOURCE-009',
    title: 'Revalidate GoHighLevel as a rebuild source contract',
    team: 'foundation',
    lane: 'research',
    priority: 'P2',
    rank: 40,
    source: 'Foundation reset audit',
    summary: 'Verify GoHighLevel connectivity in the rebuild, define what contact or automation truth it still owns, and decide whether it belongs in the trusted system or stays outside the current foundation scope.',
    whyItMatters: 'GoHighLevel was live in the old system, but the rebuild should not inherit that assumption until the connection and business role are explicitly revalidated.',
    nextAction: 'Confirm GHL access on this machine, identify the exact location and automation scopes that matter, and record whether it is active, legacy, or deferred.',
    statusNote: 'Not part of the first trusted loop, but it should not remain ambiguous.',
  },
  {
    id: 'SOURCE-010',
    title: 'Revalidate Supabase KPI surfaces as a rebuild source contract',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 41,
    source: 'Foundation reset audit',
    summary: 'KPI is confirmed as a live Benson Crew foundation system. The Lee / `zahnd-team-dashboard` repo, Supabase types/migrations, live database audit checkpoint, and source note now lock the first-pass AI OS read rules for pipeline, shopping list, executed deals, goals, competition, and usage.',
    whyItMatters: 'AI OS can safely build around KPI only if it reads the right truth layer on purpose. `persons`/`appointments`, `leads`, `deal_data`, goals, competition tables/RPCs, and `users_activity` have different meanings.',
    nextAction: 'No current-state source-signoff work remains. Use `KPI-HEALTH-001` for health checks, visible freshness, and recurring Lee repo / Supabase schema drift review.',
    statusNote: 'Closed for read-rule lock. KPI is live and readable; it is not a ghost source and not a rebuild target.',
  },
  {
    id: 'KPI-HEALTH-001',
    title: 'Add KPI health checks and Lee repo/schema drift review',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 42,
    source: 'SOURCE-010 closeout + 2026-04-28 reviewer gate',
    summary: 'Closed for v1: AI OS now has a read-only KPI / Supabase health probe for the locked KPI read rules: profiles, users, persons, appointments, leads, deal_data, goals, company_goals, expansion_goals, users_activity, admin_user_activity_reports, leaderboard_challenges, leaderboard_teams, leaderboard_team_members, plus get_company_dashboard_stats, get_company_leads, get_company_appointments, get_team_mqy_build_metrics, and get_team_mqy_perform_metrics.',
    whyItMatters: 'Steve uses KPI/Supabase truth for Sales, finance, Owners pulse, competition, usage, and weekly operator readouts. Stale timestamps, changed RPC output, missing columns, or Lee repo/Supabase schema drift can silently produce wrong numbers in a meeting.',
    nextAction: 'Closed for v1. Use Foundation > Data Sources > APIs / Apps > KPI / Supabase Health as the primary surface. Runtime Health should only warn when the probe is unhealthy. Next rebuild decision should read Action Router pending/apply state, KPI health, synthesis quality, and extraction coverage before picking the next slice.',
    statusNote: 'V1 acceptance: exact KPI table/RPC probe list is codified in lib/kpi-health.js; per-source freshness windows are checked; live Supabase columns and RPC output fields are compared against the locked read rules; the local Lee `zahnd-team-dashboard` repo is scanned for expected table/RPC references; `/api/source-of-truth` and `/api/foundation-hub` expose `kpiHealth`; Foundation Data Sources renders the KPI / Supabase Health panel; Runtime Health warns only when unhealthy; `npm run kpi:health` and `npm run foundation:verify` are the proof commands. Not in scope: rebuilding KPI, Sales Hub automation, Action Router UX, Strategy UI, Scoper, Agent Factory, or extraction retry/backoff.',
  },
  {
    id: 'KPI-APPT-QUALITY-001',
    title: 'Build KPI appointment quality audit for stacking and outcomes',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 43,
    source: 'KPI How To page + founder clarification + 2026-04-26 live appointment audit',
    summary: 'Agents commonly stack multiple discovery/consult appointments for the same opportunity, fail to update outcomes, or use wrong outcome labels. Repeatable 2026-04-26 KPI audit found 3442 active appointment rows, 951 missing outcomes, 53 non-standard outcome labels, 142 known outcomes used against the wrong appointment-type context, and 52 likely same-person/same-type stacks covering 119 rows inside a 90-day current-year window.',
    whyItMatters: 'Company goals, consult conversion, signed-client pace, and future agent coaching depend on appointment data being entered correctly. If stacked or outcome-missing appointments are treated as clean production, AIOS will coach from bad conversion math.',
    nextAction: 'Turn `npm run kpi:data-quality` into the first Sales Hub data-quality panel or queued audit: agent-level missing outcomes, non-standard labels, outcome/type mismatches, and likely 60-90 day same-person stacks. Treat buy+sell pairs, multiple properties, and separate deal paths as legitimate exceptions before coaching a correction.',
    statusNote: 'Read-only audit script exists and is backed by live KPI Supabase plus AIOS FUB source rules. Multiple close appointments should trigger a question, not an accusation: if it is one opportunity with repeated meetings, coach the agent to move/update the original appointment and outcome; if it is buy+sell or multiple properties, preserve separate outcome tracks.',
  },
  {
    id: 'KPI-LEAD-VALIDATION-001',
    title: 'Surface KPI fake-lead and lead-source validation problems',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 44,
    source: 'KPI How To page + founder clarification + FUB/KPI lead semantics audit',
    summary: 'FUB automatically creates lead-stage records when people are added. If agents add realtors, vendors, support-network contacts, duplicates, or other non-leads and do not move them out quickly, KPI can count fake leads. Repeatable 2026-04-26 KPI/FUB audit found 16657 active lead-stage rows, including 6726 invalid/generic source rows: 5030 `Import`, 1485 `<unspecified>`, 208 `Sphere`, and 3 blank. Founder clarification: `Import`, `<unspecified>`, generic `Sphere`, `SOI`, and similar placeholders are not validated final lead sources.',
    whyItMatters: 'Lead pace is one of the highest-leverage Sales Hub coaching inputs. Fake or unvalidated leads inflate production, distort company goal confidence, and make agent advice wrong.',
    nextAction: 'Turn `npm run kpi:data-quality` into the first Sales Hub lead-source panel or queued audit: invalid/generic source rows, active lead-stage rows, pond/unclaimed context, and guided correction prompts. Use stage/source/owner/timing/tag context before accusing an agent of fake leads.',
    statusNote: 'Read-only audit script exists and is backed by live KPI Supabase plus AIOS FUB source rules. Generic source values should trigger guided correction, not acceptance: for referral/introduction, identify the origin person and connect/add them in FUB when permissions exist; for met in person/social, capture where/platform in secondary lead-source info.',
  },
  {
    id: 'KPI-SHOPPING-001',
    title: 'Govern Shopping List weekly discipline for Sales Hub coaching',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 45,
    source: 'KPI How To page + founder clarification + 2026-04-26 Shopping List audit + meeting evidence',
    summary: 'Shopping List is the manual working-opportunity layer agents are expected to maintain weekly. Repeatable 2026-04-26 KPI audit found 293 active rows, 91 high-score active rows, 16 stale high-score rows older than 60 days, 36 active rows past their score-specific expected window, 49 blank action plans, 17 high-score blank action plans, 35 duplicate active client clusters, and 85 duplicate active client rows.',
    whyItMatters: 'Shopping List discipline is one of the clearest signals for whether an agent is actively managing pipeline. If AIOS ignores stale/missing/duplicate Shopping List behavior, future Sales Hub coaching will miss the work agents are actually failing to do.',
    nextAction: 'Turn `npm run kpi:shopping-list` into the first Shopping List discipline panel or queued audit: score-window expiry, stale high-score rows, blank action plans, high-score blank action plans, duplicates, missing updates, and signed/not-signed drift. Mine remaining Reilly evidence if available, but current Sofia/team/leadership/huddle meeting evidence is already enough to preserve the doctrine.',
    statusNote: 'Read-only audit script exists and is backed by live KPI Supabase. Duplicate rows should trigger a question first because buy/sell, multiple properties, and separate opportunity paths may be legitimate. KPI-native writes should stay limited to agent-authorized Shopping List / goal workflows until SALES-005 is designed.',
  },
  {
    id: 'SOURCE-011',
    title: 'Revalidate Google Ads as a rebuild source contract',
    team: 'foundation',
    lane: 'research',
    priority: 'P2',
    rank: 42,
    source: 'Foundation reset audit',
    summary: 'Verify Google Ads connectivity in the rebuild, define what paid-media truth it would own, and decide whether it belongs in the post-foundation marketing surface or remains out of scope for now.',
    whyItMatters: 'Paid media is meaningful later, but the rebuild should not carry it as an implied live source without a real connector and an explicit operating boundary.',
    nextAction: 'Confirm Google Ads access, identify the MCC or account surfaces that matter, and record whether this source is active, deferred, or waiting on a future marketing phase.',
    statusNote: 'Useful later than the first assistant loop, but still needs a real revalidation card.',
  },
  {
    id: 'SLICE-001',
    title: 'Define and prove the first trusted assistant loop',
    team: 'foundation',
    lane: 'ranked',
    priority: 'P0',
    rank: 7,
    source: 'Foundation reset audit',
    summary: 'Narrow the rebuild to one assistant loop that is actually trustworthy: strategy docs, Foundation memory, Gmail, Google Calendar, and Google Drive, with explicit boundaries on what is not yet allowed into the loop.',
    whyItMatters: 'The rebuild will fail by widening too early, not by lacking ideas. One trusted loop becomes the proof point that every future connector, memory layer, or agent surface can build on.',
    nextAction: 'Define the allowed tools, source prerequisites, read-write boundaries, and success checks for the first loop, then use that loop as the gate before enabling broader connectors or additional agents.',
    statusNote: 'Proof before scale. No second loop until the first one is trustworthy.',
  },
  {
    id: 'MEMORY-003',
    title: 'Capture full conversations in a browsable archive',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 3,
    source: 'Memory and operating-system direction',
    summary: 'Store full assistant chats, meeting transcripts, and key operating conversations in a structured archive the team can browse later by date, source, participant, topic, and linked decisions.',
    whyItMatters: 'If the raw conversations disappear into chat tools or local logs, we lose lessons learned, implementation history, auditability, and a huge amount of reusable business IP.',
    nextAction: 'Define the archive model: source connector, thread/session ID, participants, timestamps, transcript body, linked decisions/backlog items, redaction rules, and the first ingest paths from Codex sessions, Google Meet transcripts, and core assistant channels.',
    statusNote: 'Archive first. Summaries and lessons can be built on top of it later.',
  },
  {
    id: 'MEMORY-004',
    title: 'Turn archived conversations into lessons learned and reusable IP',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 4,
    source: 'Founder IP capture direction',
    summary: 'Use the archived conversations to extract lessons learned, implementation timelines, case studies, ebook/source material, and reusable training or sales assets without having to reread everything manually.',
    whyItMatters: 'The work of building the system is itself valuable intellectual property. If we capture and organize it well, it becomes proof, training, marketing, and product insight instead of disappearing into old chats.',
    nextAction: 'Define the extraction workflow: lessons-learned records, timeline summaries, quote/clip capture, approval and redaction rules, and how archived conversations roll into content, training, and product packaging.',
    statusNote: 'Depends on MEMORY-003. Do not try to build polished outputs before the archive exists.',
  },
  {
    id: 'MEMORY-005',
    title: 'Implement a temporal truth model for strategy and decisions',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 5,
    source: 'Memory architecture and strategy-truth review',
    summary: 'Track when a strategic fact became true, when it stopped being true, and what superseded it so the system can answer “what is true now?” without losing historical context.',
    whyItMatters: 'A live operating system cannot just keep the latest wording. It needs time-aware truth so decisions, priorities, and strategy shifts do not collapse into one blurry present-tense record.',
    nextAction: 'Define the first temporal schema for decisions and strategy records using fields like valid_from, valid_until, superseded_by, and current_state query rules.',
    statusNote: 'This was part of the early memory architecture discussion and should not get lost just because Graphiti was deferred.',
  },
  {
    id: 'DATA-001',
    title: 'Build a Freedom Sheet source adapter and schema-drift monitor',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 4,
    source: 'Freedom Sheet foundation work',
    summary: 'Read the sheet through stable source IDs and detect structural changes instead of hardcoding cell references.',
    whyItMatters: 'If tabs or headers move, the system should notify us and recover instead of silently breaking.',
    nextAction: 'Define the adapter contract around the current Freedom source IDs, add structural header and range checks, and expose the results through the data-health surface instead of leaving drift detection implicit.',
    statusNote: 'Keep this lightweight until the broader source-health layer is in place, but do not leave the Freedom connection as a blind read.',
  },
  {
    id: 'DATA-003',
    title: 'Render live source-backed values across the system',
    team: 'foundation',
    lane: 'research',
    priority: 'P0',
    rank: 4,
    source: 'Strategy system principle',
    summary: 'Stop trusting markdown to hold live math. Render values from source IDs so updates in source systems flow across the dashboard and supporting docs automatically.',
    whyItMatters: 'If a KPI, milestone path, or assumption changes in the source of truth, the system should update everywhere without manual doc cleanup or stale snapshots.',
    nextAction: 'Define the first live-rendered source cards for BHAG milestones, Agent Engine assumptions, and source badges in supporting strategy views.',
    statusNote: 'This is now a core system principle, not a nice-to-have.',
  },
  {
    id: 'DATA-004',
    title: 'Turn source contracts into structured app metadata',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 5,
    source: 'Foundation audit',
    summary: 'Promote source contracts from markdown-only documentation into structured app metadata that powers source IDs, open/edit actions, and source-aware UI behavior.',
    whyItMatters: 'If source links, statuses, and locations live only in prose or hardcoded frontend logic, the system will drift. Source contracts need to be executable, not just described.',
    nextAction: 'Done for v1. Keep structured source contracts as the backing layer for `/api/source-of-truth`, Foundation Data Sources, connector/source grouping, and source-aware UI links. Route remaining visible-status unification to `SOURCE-012` and operator-surface polish to `FOUNDATION-SURFACE-UPDATES-001`.',
    statusNote: 'Closed on 2026-04-28 by backlog hygiene pass after verifier proof showed `/api/source-of-truth` exposes all source contracts/connectors/grouped source systems, Data Sources explains page purpose and connector boundaries, and Foundation pages map back to source IDs. Proof command: `npm run foundation:verify`.',
  },
  {
    id: 'DATA-005',
    title: 'Normalize lead-source lineage between Owners Dashboard and Follow Up Boss',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 7,
    source: 'Owners Dashboard admin tab walkthrough',
    summary: 'Define one canonical lead-source taxonomy and lineage model across the Owners Dashboard and Follow Up Boss so deals can be traced back to a valid source, ground-zero attribution is preserved, and company-versus-agent credit is rule-driven instead of guessed.',
    whyItMatters: 'If lead source, secondary source, ground-zero source, ISA-set status, and FUB IDs are inconsistent, the business cannot trust attribution, company-generated credit, marketing ROI, or coaching signals. Steve called `Import` and `Unspecified` values high-severity operational failures.',
    nextAction: 'Use the locked rule model inside Admin review and Ops findings. Keep unresolved source rows queued instead of guessing, and keep source-field fixes human-owned until the apply lane is approved.',
    statusNote: 'Closed on 2026-04-25 for v1 source-lineage rules. The governed `fub_lead_source_rules` table owns source classification; Admin review now consumes it for invalid-source, company/agent expectation, and ISA mismatch checks. `<unspecified>` remains quarantine only, not final attribution truth.',
  },
  {
    id: 'DATA-006',
    title: 'Build Admin-tab data quality rules for the Owners Dashboard deal ledger',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 8,
    source: 'Owners Dashboard admin tab deep audit',
    summary: 'Turn the critical Admin-tab business rules into explicit validations and an AI deal-review flow so new or exception rows can be flagged, fixed in source, and re-reviewed instead of relying on manual spot checks.',
    whyItMatters: 'The deal ledger now drives attribution, company-versus-agent classification, split math, ISA economics, CRM enrichment, and downstream ops follow-through. If those rules stay implicit, every later hub will inherit hidden errors.',
    nextAction: 'Use the executable review lane to route remaining Owners cleanup into Ops. Keep source-field fixes human-owned until an approval-gated apply lane exists.',
    statusNote: 'Closed on 2026-04-25 for v1 Admin deal-review enforcement. The Admin runner writes CC/CD/CE and now checks split math, governed source classification, company/agent expectation, FUB joins/source/stage/ISA evidence, pre-2026-04-01 Freedom follow-through, and post-2026-04-01 ClickUp Deal Data Entry follow-through by Trade Number. Conditional review has the matching S:U review lane but still needs row identity backfill through DATA-008-style cleanup.',
  },
  {
    id: 'DATA-007',
    title: 'Backfill invalid lead-source rows in the Owners Dashboard deal ledger',
    team: 'foundation',
    lane: 'research',
    priority: 'P0',
    rank: 9,
    source: 'Full Admin-tab audit',
    summary: 'Clean the `Lead Source (Bonus System For Having This 100% Complete)` field for the rows currently using invalid or legacy values like lowercase `unspecified`, `Import`, `HomeOptima`, and generic call-source labels, then map those rows to governed Follow Up Boss-compatible source values.',
    whyItMatters: 'The full-tab audit found 984 invalid lead-source rows out of 1504 populated `Deal #` rows. That makes source attribution, marketing ROI, and company-versus-agent credit structurally unreliable.',
    nextAction: 'Work invalid lead-source findings through the Ops/Admin review queue as they appear. Keep source-field corrections human-owned until the approval-gated apply lane exists.',
    statusNote: 'No longer blocks the Owners Admin source-package closeout. The Admin review system now detects unresolved, ungoverned, or non-final lead sources and routes them as Ops findings. The remaining work is operational cleanup and future apply-lane automation, not Foundation source connection/understanding.',
  },
  {
    id: 'DATA-008',
    title: 'Backfill missing Follow Up Boss links in Column BZ',
    team: 'foundation',
    lane: 'research',
    priority: 'P0',
    rank: 10,
    source: 'Full Admin-tab audit',
    summary: 'Populate `Client Follow UP Boss ID` for the historical deal rows that are currently missing CRM linkage so the sheet can be reconciled against Follow Up Boss and used for source-of-truth checks.',
    whyItMatters: 'Only 45 of 1504 rows currently have a populated FUB link. With 1459 rows missing linkage, the system cannot actually reconcile most historical deals to the CRM.',
    nextAction: 'Work missing-FUB-link findings through the Ops/Admin review queue as they appear. Backfill high-value recent rows first, but do not block the source package on historical completeness.',
    statusNote: 'No longer blocks the Owners Admin source-package closeout. Column BZ is the locked FUB join field, and Admin review surfaces missing links as Ops findings. Historical backfill remains useful cleanup, but the system is connected, understood, and able to extract/synthesize from linked rows.',
  },
  {
    id: 'DATA-009',
    title: 'Resolve suspicious duplicate full-credit deal rows in the Admin tab',
    team: 'foundation',
    lane: 'research',
    priority: 'P0',
    rank: 11,
    source: 'Full Admin-tab audit',
    summary: 'Review the known suspicious duplicate trades where the same realtor has multiple rows with `Total = 1` and decide whether they are true duplicates, bad data, or an edge-case workflow that needs explicit rules.',
    whyItMatters: 'The full-tab audit directly confirmed suspicious pairs like `T#25263` and `T#25226`. If those rows are duplicates, they can distort counts, credits, and downstream reporting.',
    nextAction: 'Let Admin review surface over-credit and split-credit failures, then only audit specific suspicious trades that still escape the rule set.',
    statusNote: 'No longer blocks the Owners Admin source-package closeout. V1 Admin review checks trade-level split totals, deal credit, volume/commission credit, gross-to-team cash anchoring, and required split-row fields. Do not collapse all duplicate `Deal #` rows blindly; legitimate split-credit rows remain valid.',
  },
  {
    id: 'DATA-010',
    title: 'Normalize malformed and non-operational trade identifiers in the Admin tab',
    team: 'foundation',
    lane: 'research',
    priority: 'P0',
    rank: 12,
    source: 'Full Admin-tab audit',
    summary: 'Separate placeholder rows and malformed trade IDs from the operational deal ledger so rollups, seasonality views, and audit checks do not quietly mix forecast rows and naming anomalies into real historical production.',
    whyItMatters: 'The full-tab audit found goal-builder placeholder rows plus malformed or inconsistent trade identifiers like `T23051`, ` T#23012`, numeric-only IDs, `T#20125anotheronewrong`, older `GTA#` variants, and lower-case split suffixes. Without normalization, row counts and grouping logic drift.',
    nextAction: 'Tag the placeholder goal-builder rows explicitly, standardize or map malformed trade IDs, and define which historical naming variants are valid versus which should be normalized or excluded from operational reporting.',
    statusNote: 'This is especially important before we use 2023-to-today deal history for seasonality or KPI rollups.',
  },
  {
    id: 'DATA-011',
    title: 'Audit address parity between Owners Dashboard, Follow Up Boss, and Home Value Hub',
    team: 'foundation',
    lane: 'research',
    priority: 'P0',
    rank: 13,
    source: 'Owners Dashboard column validation',
    summary: 'Define and measure the address-integrity rules across the deal ledger, Follow Up Boss, and Home Value Hub / Home Optima so bought-property records are complete and usable for homeowner follow-up.',
    whyItMatters: 'For buy-side deals, the bought-property address should exist and match across the sheet, Follow Up Boss, and Home Value Hub. If those systems drift, the business loses homeowner-marketing coverage, client-value workflows, and trustworthy address-based coaching or retention signals.',
    nextAction: 'Start with recent buy-side rows, compare `Deal Address` against the linked FUB contact and Home Value Hub record, define the mismatch cases, and quantify how many past clients and supporters are missing Home Value Hub coverage.',
    statusNote: 'Treat Home Value Hub as the internal name and Home Optima as the external/vendor name.',
  },
  {
    id: 'DATA-012',
    title: 'Audit QuickBooks AR completeness from Column D',
    team: 'foundation',
    lane: 'research',
    priority: 'P0',
    rank: 14,
    source: 'Owners Dashboard column validation',
    summary: 'Treat `Commission/Fees Into Accounting Software?` as a live accounting-control field and define the check that proves deal-level AR / commission entries have been entered into QuickBooks.',
    whyItMatters: 'Column D is still relevant in the current system because it confirms whether the AR side of a deal has been entered into QuickBooks. If that stays informal, the finance layer can drift away from the operational ledger and cash-collection follow-up gets weaker.',
    nextAction: 'Define the exact allowed statuses in Column D, map them to the QuickBooks workflow, and decide how the system should flag deals that are closed or cash-collected without confirmed accounting entry.',
    statusNote: 'This is not legacy bookkeeping residue. It is a real finance-control signal.',
  },
  {
    id: 'DATA-013',
    title: 'Audit client identity parity between Owners Dashboard and Follow Up Boss',
    team: 'foundation',
    lane: 'research',
    priority: 'P0',
    rank: 15,
    source: 'Owners Dashboard column validation',
    summary: 'Compare `Client Name` in the Admin tab against the linked Follow Up Boss contact and define the mismatch cases so the team can trust deal-to-person identity across systems.',
    whyItMatters: 'If the client name in the ledger does not line up with the linked FUB record, either FUB was not updated properly or the sheet entry is wrong. That breaks CRM reconciliation, downstream automations, and confidence in any coaching or attribution based on the linked person.',
    nextAction: 'Start with rows that already have a populated `Client Follow UP Boss ID`, compare names, classify mismatch patterns, and define the cleanup ownership between Ops and CRM hygiene.',
    statusNote: 'This pairs naturally with DATA-008, but it is a different integrity problem than missing FUB links.',
  },
  {
    id: 'DATA-014',
    title: 'Operationalize ISA Set Deal and company-versus-agent attribution rules',
    team: 'foundation',
    lane: 'research',
    priority: 'P0',
    rank: 16,
    source: 'Owners Dashboard full-tab audit',
    summary: 'Turn `ISA Set Deal` from an empty placeholder column into a real attribution input and use it to tighten `Company or Agent` logic when source lineage alone is not enough.',
    whyItMatters: 'Steve called out examples where ISA-set business is being recorded in the wrong place and the final `Company or Agent` value is therefore wrong. If ISA-set logic stays informal, company-generated credit will keep drifting and Ops will keep guessing.',
    nextAction: 'Define the valid `ISA Set Deal` states, backfill recent qualifying rows, and encode the rule that agent-sourced leads with an ISA-set override still count as company-generated when appropriate.',
    statusNote: 'This is part of the broader attribution cleanup, but it deserves its own implementation path because the new column is currently unused.',
  },
  {
    id: 'DATA-015',
    title: 'Backfill and enforce Deal or Lease classification',
    team: 'foundation',
    lane: 'research',
    priority: 'P0',
    rank: 17,
    source: 'Owners Dashboard full-tab audit',
    summary: 'Populate `Deal or Lease?` and define when it overrides the old price-threshold heuristic so lease activity stops leaking into buy/sell production analysis.',
    whyItMatters: 'The sheet now has a dedicated `Deal or Lease?` column, but it is currently empty across the audited tab. Until that field is used, the system has to rely on rough proxies like sub-200k pricing, which is good enough for hints but not for trustworthy reporting.',
    nextAction: 'Define the allowed values, backfill the recent periods first, and decide when historical rows should be inferred versus manually corrected.',
    statusNote: 'This will sharpen production counts, coaching metrics, and seasonality views.',
  },
  {
    id: 'DATA-016',
    title: 'Normalize legacy anonymized realtor aliases and departed-agent history',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 18,
    source: 'Owners Dashboard deep audit',
    summary: 'Decide how to handle old anonymized realtor values like `zz -bt` so historical attribution is either mapped cleanly or explicitly treated as irrecoverably anonymized.',
    whyItMatters: 'The Admin tab still contains historical placeholder realtor names from the old direct-from-sheet presentation workflow. If those aliases are left ambiguous, any historical per-agent analysis on departed agents becomes misleading and future migrations may silently preserve junk labels as if they were real people.',
    nextAction: 'Identify whether a reliable alias map exists, decide whether the goal is historical restoration or explicit archival, and then standardize how departed-agent history is represented going forward.',
    statusNote: 'The KPI dashboard removed the original reason for anonymizing names, but the old rows still need a deliberate policy.',
  },
  {
    id: 'DATA-017',
    title: 'Encode brokerage, Real Broker, and Benson Crew eras in deal-ledger reporting',
    team: 'foundation',
    lane: 'research',
    priority: 'P0',
    rank: 19,
    source: 'Owners Dashboard full-tab audit',
    summary: 'Make the Admin-tab reporting and future source contracts explicitly era-aware so historical rows are interpreted using the business rules that were true at the time, not today’s assumptions.',
    whyItMatters: 'The sheet spans at least three real operating eras: brokerage before about 2023-04-01, Real Broker from about 2023-04-01 through 2025-06-30, and Benson Crew from about 2025-07-01 onward. Cobroke fields, lead-source expectations, attribution rules, and commission norms do not mean the same thing across those periods.',
    nextAction: 'Define the canonical era boundaries, tag or infer the era from `Date Firm (Executed)`, and document which columns and rollups should be included, ignored, or reinterpreted in each era before we do serious 2023-to-today seasonality or KPI analysis.',
    statusNote: 'This is a prerequisite for trustworthy historical comparisons.',
  },
  {
    id: 'DATA-018',
    title: 'Queue review when new Follow Up Boss lead sources appear',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 18,
    source: 'Owners closeout + FUB taxonomy review',
    summary: 'Compare each refreshed raw FUB source snapshot against the governed source rules and surface any new, renamed, or reappearing source names for review before Operations starts using them in the Owners ledger.',
    whyItMatters: 'If new raw FUB source names appear silently, the governed dropdown and attribution rules drift immediately. Steve wants new sources surfaced for review and notification instead of silently becoming cleanup debt.',
    nextAction: 'Keep the FUB drift lane aligned with the governed queue model as the source taxonomy evolves, but do not reopen this card unless the drift stops landing in the queue or new source-name cases appear that the current diff model cannot represent.',
    statusNote: 'Closeout backfilled on 2026-04-29 under CLOSEOUT-BACKFILL-001. Evidence: npm run foundation:verify includes the DATA-018/DATA-019/DATA-020 done guardrail and npm run backlog:hygiene no longer treats this as a bare done note. Existing proof details remain: raw FUB snapshots, rule diffing, change-event generation, Foundation drift panels, and the combined Owners review queue route new/open/legacy FUB source drift into a governed inbox.',
  },
  {
    id: 'DATA-019',
    title: 'Enforce approved Follow Up Boss lead sources in the Owners Dashboard',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 19,
    source: 'Owners closeout + governed dropdown fix',
    summary: 'Treat the Admin-tab dropdown list as a governed final-deal-source surface, not a manual helper list, and keep it synced to the approved taxonomy and quarantine rules.',
    whyItMatters: 'Column `N` is now strict against `Lists!J3:J63`, but if that governed list drifts away from the approved taxonomy, Ops will still be choosing stale or broken values inside a “validated” field.',
    nextAction: 'Keep the governed Owners list explicit and queue-ready, but do not reopen this card unless unexpected values, missing approved values, or duplicates stop being surfaced by the verifier and the combined review queue.',
    statusNote: 'Closeout backfilled on 2026-04-29 under CLOSEOUT-BACKFILL-001. Evidence: npm run foundation:verify includes the DATA-018/DATA-019/DATA-020 done guardrail and npm run backlog:hygiene no longer treats this as a bare done note. Existing proof details remain: strict dropdown is live, the canonical governed list is explicit, the verifier is visible, and future Owners-list drift lands in the governed queue.',
  },
  {
    id: 'GOVERNANCE-IMPORTRANGE-001',
    title: 'Block service-account writes into IMPORTRANGE mirror ranges',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 23,
    source: 'Owners Dashboard imported Lists repair',
    summary: 'Add a source-aware write guard so Google Sheets service-account writes cannot directly mutate imported mirror ranges such as Owners Dashboard `Lists!A:AI`.',
    whyItMatters: 'A direct write into an imported spill range can silently block the entire mirror and make downstream formulas look broken even though the formulas are correct.',
    nextAction: 'Extend the guard registry whenever another imported mirror is discovered; use narrow repair overrides only in scripts that intentionally clear blockers.',
    statusNote: 'Closeout backfilled on 2026-04-29 under CLOSEOUT-BACKFILL-001. Evidence: historical done state is explicitly preserved in docs/process/verifier-exceptions.json. Existing proof details remain: lib/google-delegated.js blocks values writes and raw batchUpdate writes that overlap the protected Owners Dashboard Lists mirror range, and owners:repair-lists is the controlled repair path.',
  },
  {
    id: 'DATA-020',
    title: 'Define source freshness rules and stale-data guardrails',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 20,
    source: 'Owners closeout + source maturity model',
    summary: 'Define when governed lists, source reviews, and review lanes are considered fresh enough to trust, stale enough to warn on, or old enough to re-open for review.',
    whyItMatters: 'A controlled source list can still go stale. Steve wants the system to show when lead-source rules, governed dropdowns, or AI review lanes have aged out so the foundation does not get sloppy again.',
    nextAction: 'Keep the first governed freshness rules live for the Owners/FUB layer, then reuse the same pattern later for finance, KPI, and wider source surfaces instead of inventing a second stale-state model.',
    statusNote: 'Closeout backfilled on 2026-04-29 under CLOSEOUT-BACKFILL-001. Evidence: npm run foundation:verify includes the DATA-018/DATA-019/DATA-020 done guardrail and npm run backlog:hygiene no longer treats this as a bare done note. Existing proof details remain: raw FUB snapshot age, governed-dropdown drift age, Admin/Conditional review-lane age, and combined Owners inbox age surface fresh/warning/stale states with thresholds and founder-alert flags.',
  },
  {
    id: 'FINANCE-001',
    title: 'Normalize partner commissions across the Owners Dashboard finance stack',
    team: 'foundation',
    lane: 'research',
    priority: 'P0',
    rank: 6,
    source: 'Owners Dashboard finance walkthrough',
    summary: 'Lock the internal finance source contract around `(Input) Weekly Actuals`, then trace how partner commissions flow through weekly actuals, monthly roll-ups, annual roll-ups, and `Cashflow Dash` so top-line revenue and owners expense are not overstated.',
    whyItMatters: 'Weekly Actuals is the internal finance truth, but partner commissions are currently backed out at the dashboard layer. If the normalization logic stays implicit or only exists in one layer, monthly and annual reporting can drift away from the real company economics.',
    nextAction: 'Map the exact flow from `ADMIN ONLY - Deal Data Entry` to `(Input) Weekly Actuals`, `Monthly Actuals (Roll Up)`, annual roll-ups, and `Cashflow Dash`, then decide where the partner-commission adjustment should live canonically.',
    statusNote: 'Treat Weekly Actuals as the finance source of truth. Use Cashflow Dash as a validation and management-interpretation layer until the normalization path is cleaned up.',
  },
  {
    id: 'FINANCE-002',
    title: 'Build a governed agent split-contract layer',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 18,
    source: 'Owners Dashboard split validation',
    summary: 'Model agent compensation as governed contract packages backed by ClickUp roster links and signed contract files instead of partially maintained spreadsheet rows and founder memory.',
    whyItMatters: 'The first live proof now exists: Matt Allman roster task `868hre80z` links to a signed contract that proves his normal `50 / 50` split and his ISA `45 / 55` override, including leases. The system needs a governed home for that truth before exception deals can be reviewed safely.',
    nextAction: 'Create starter registry entries from active agents and exception deals. Use ClickUp roster fields plus linked Drive contract folders to lock agent, effective dates, package type, normal split, company-deal split, agent-deal split, ISA override, lease rule, mentor / apprentice rules, cap rules, and incomplete-contract flags. Re-open review only when the contract link or metadata changes.',
    statusNote: 'First proof exists. The open work is promoting proven packages into a governed registry, not proving the concept.',
  },
  {
    id: 'FINANCE-003',
    title: 'Model conditional deals as an optional cashflow scenario layer',
    team: 'foundation',
    lane: 'research',
    priority: 'P2',
    rank: 19,
    source: 'Owners Dashboard conditional deals validation',
    summary: 'Treat conditional deals as a forecast / scenario layer instead of mixing them into firm cash truth. The current workbook tracks conditionally sold deals manually, with condition due dates and expected closing dates, so leadership can see how much money could exist if those deals firm up.',
    whyItMatters: 'Conditional deals are useful for planning, but they are not created cash. If the future cashflow system cannot separate firm cash from conditional scenarios cleanly, leadership will either overtrust soft pipeline or lose visibility into likely near-term upside.',
    nextAction: 'Define the first model for conditional pipeline in cashflow: status, agent, address, split-adjusted volume, commission math, team share, condition due date, expected close date, optional expected cash date, and a cashflow toggle that can include or exclude conditional deals from the projection.',
    statusNote: 'Future-state finance feature, not a replacement for the Admin deal ledger.',
  },
  {
    id: 'ENGINE-001',
    title: 'Make planning attrition a first-class engine input',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 5,
    source: 'Agent Engine rebuild',
    summary: 'Break the planning attrition assumption out of the buried recruiting formula and make it an explicit source-backed input in the BHAG builder or replacement source-of-truth system.',
    whyItMatters: 'Right now the system can show live attrition pressure, but not the planning attrition assumption that drives required recruiting pace. That keeps one of the most important engine assumptions hidden.',
    nextAction: 'Add a visible planning attrition field to the source of truth, then wire it into the Agent Engine and financial interpretation views.',
    statusNote: 'Needed before the engine math is fully explainable and editable in-system.',
  },
  {
    id: 'SYSTEM-001',
    title: 'Write a separate system-strategy doc for the AI OS',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 1,
    source: 'Foundation architecture',
    summary: 'Keep business strategy and system strategy separate so the AI operating model does not leak into company strategy.',
    whyItMatters: 'This keeps the foundation readable for humans and reliable for agents.',
    nextAction: 'Use `docs/system-strategy.md` as the architecture-boundary document and update it only when the real operating model changes.',
    statusNote: 'Base doc exists. This card now records the separation rule and prevents the old hybrid-doc mistake from coming back.',
  },
  {
    id: 'STRATEGY-001',
    title: 'Business Atoms Framework',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 6,
    source: 'Atoms framework design',
    summary: 'Apply the marketing atoms pattern to the whole business so recurring wins, losses, bottlenecks, frustrations, decisions, and assumption risks can be captured as structured strategic signals.',
    whyItMatters: 'Quarterly planning should run on recurring evidence, not vibes. The old marketing system proved that atoms become powerful once they are searchable, tagged, and actually used downstream.',
    nextAction: 'Create business_atoms and atom_hits tables, define tagging and hit logic, and add a dashboard view with weekly, monthly, quarterly, and annual filters. Keep audience and avatar targeting as optional overlays on top of the core atom record: marketing should support the locked 10 RETAIN client avatars and 5 ATTRACT agent avatars, while other hubs can start with simpler audience or pillar tags until they truly need their own persona model.',
    statusNote: 'Atoms should be shared foundation intelligence first, with marketing avatar targeting layered on cleanly instead of forcing every hub into marketing-style avatar logic on day one.',
  },
  {
    id: 'GOV-001',
    title: 'Build governance accountability into the system',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 7,
    source: 'Governance design',
    summary: 'Make the system hold leadership and departments accountable to the strategy, cadence, and execution rules by preparing the room, enforcing the sequence, capturing structured outputs, and surfacing drift instead of only documenting the process.',
    whyItMatters: 'The AI OS should not just help the team work. It should enforce the operating cadence, surface drift, and make follow-through visible.',
    nextAction: 'Define the first governance loop: cadence checks, pre-meeting briefing, agenda enforcement, decision capture, owner/deadline tracking, and escalation rules for misses or drift.',
    statusNote: 'This should behave like an operating partner for governance, not a passive logbook.',
  },
  {
    id: 'PEOPLE-001',
    title: 'Build people accountability and performance intelligence layer',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 8,
    source: 'Leadership accountability design',
    summary: 'Use calendar attendance, meeting notes, expected outputs, compensation, role expectations, and operating signals to give leadership a grounded view of who is contributing, where accountability is slipping, and where coaching or intervention is needed.',
    whyItMatters: 'Quarterly and monthly reviews should be informed by a third-party system that sees real behavior and outcomes, not just whoever argues best in the room.',
    nextAction: 'Define the people-intelligence model: role expectations, meeting attendance, cadence compliance, output expectations, coaching signals, and guardrails for fair evaluation.',
    statusNote: 'Must be evidence-based and role-based, not vague vibe scoring.',
  },
  {
    id: 'DATA-002',
    title: 'Build source trust scoring layer',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 9,
    source: 'Foundation system design',
    summary: 'Score each source not just for connectivity, but for recency, completeness, health, and decision-worthiness.',
    whyItMatters: 'A connected source that is stale or broken should not carry the same weight as a healthy source of truth.',
    nextAction: 'Define a first scoring model using connection status, signed-off state, recency, completeness, and schema health, then surface that score beside each source contract in Foundation.',
    statusNote: 'This should explain why a source is In Review, Verified Readable, Partially Signed Off, or decision-safe instead of making those states feel arbitrary.',
  },
  {
    id: 'DECISION-001',
    title: 'Build decision-to-doc traceability',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 10,
    source: 'Foundation system design',
    summary: 'Every strategy-doc change should point back to the exact decision, session, source, or event that justified it.',
    whyItMatters: 'This makes the strategy layer auditable and keeps updates grounded in real evidence.',
    nextAction: 'Keep using the existing pending-doc-update and change-event flow as the single trace path, then build richer visible change history and contradiction cleanup on top of it through DECISION-002 and DECISION-003.',
    statusNote: 'Closeout backfilled on 2026-04-29 under CLOSEOUT-BACKFILL-001. Evidence: historical done state is explicitly preserved in docs/process/verifier-exceptions.json. Existing proof details remain: Foundation hub exposes decision-to-doc traceability, pending doc updates carry linked decision context, and Decisions / strategy watch surfaces show affected docs, linked update counts, source context, and approval path without inventing a second trace system.',
  },
  {
    id: 'DECISION-002',
    title: 'Build a strategy change ledger and inline change annotations',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 11,
    source: 'Foundation change-tracking design',
    summary: 'Track every meaningful Foundation strategy change with before/after values, linked decisions, timestamps, participants, affected sections, and visible annotations that show readers what changed and why.',
    whyItMatters: 'Major strategy changes should never disappear into silent edits. Leadership and agents need to see what changed, why it changed, and where the supporting decision lives.',
    nextAction: 'Keep using the current decision-linked ledger and doc-scoped annotations as the live path, then deepen the annotation model only if we need section-level or line-level highlighting later.',
    statusNote: 'Closeout backfilled on 2026-04-29 under CLOSEOUT-BACKFILL-001. Evidence: historical done state is explicitly preserved in docs/process/verifier-exceptions.json. Existing proof details remain: Strategy watch panels show a decision-linked newest-first ledger, proposals carry before/after diff context, and doc-scoped annotations show what changed, where it changed, and which decision justified it.',
  },
  {
    id: 'DECISION-003',
    title: 'Build decision conflict detection and cleanup workflow',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 12,
    source: 'Decision governance design',
    summary: 'Continuously scan proposed and locked decisions for overlap, contradiction, supersession, or ambiguity, then flag those conflicts in the system before old and new agreements silently coexist.',
    whyItMatters: 'Running a team depends on clear agreements. If a new agreement changes an old one but the system does not flag it, people will keep citing different versions of the truth and accountability falls apart.',
    nextAction: 'Keep using the live contradiction / traceability queue as the current cleanup path, then deepen the relationship model only if we need more than lock review, missing evidence, missing provenance, broken supersedes links, orphan doc proposals, and overlap review.',
    statusNote: 'Closeout backfilled on 2026-04-29 under CLOSEOUT-BACKFILL-001. Evidence: historical done state is explicitly preserved in docs/process/verifier-exceptions.json. Existing proof details remain: Foundation hub exposes a decision review snapshot, Decisions / Current State can show the contradiction queue, and the system flags proposed decisions, missing source refs, incomplete provenance, broken supersedes links, orphan doc proposals, and overlap candidates.',
  },
  {
    id: 'DECISION-004',
    title: 'Build a pending decision review and lock-in workflow',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 13,
    source: 'Governance operator design',
    summary: 'Capture statements from meetings, transcripts, chats, and operator workflows that sound like real decisions, then route them into a pending review state instead of pretending they are fully locked before a human confirms them.',
    whyItMatters: 'A lot of contradiction starts when the room thinks a decision was made but nobody later confirms whether it was final, provisional, or only exploratory. The system should help separate “sounds like a decision” from “this is now the live agreement.”',
    nextAction: 'Define the pending-decision pipeline: extraction from meetings and chats, confidence scoring, reviewer assignment by role, statuses like needs verification / ready to lock / rejected / merged into existing decision, contradiction checks against the existing decision log, and how unresolved pending decisions show up in governance cadences.',
    statusNote: 'The right pattern is: detect possible decisions early, keep them visibly reviewable, check them against existing agreements, and only lock them once the right human owner confirms they are real.',
  },
  {
    id: 'DECISION-005',
    title: 'Build a decision provenance and participant model',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 14,
    source: 'Decision accountability design',
    summary: 'The first provenance model is live and the locked seed decisions are now backfilled with owner, confirmer, participants, context, and evidence notes.',
    whyItMatters: 'A decision log is only trustworthy if the company can answer who decided, who was in the room, whether it was a group agreement or an owner confirmation, and what context justified the change. Without that provenance, people will dispute the agreement later or treat the log like a thin summary with no accountability weight.',
    nextAction: 'Deepen the model with cleaner meeting/session/thread linkage, a clearer distinction between direct and backfilled provenance, and better capture on future decisions.',
    statusNote: 'Scoped, not active. Core fields are backfilled for locked seed decisions; remaining work is richer linkage and provenance quality rules. Before build, require acceptance/proof for meeting/session/thread linkage, direct vs backfilled provenance, verifier coverage, and process:foundation-ship.',
  },
  {
    id: 'DECISION-006',
    title: 'Turn locked decisions into visible policy and SOP artifacts',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 15,
    source: 'Decision-log model review + old strategy/policy history',
    summary: 'Use the canonical decision log to create a visible policy/SOP layer for real operating agreements like expense policy, ownership-pay rules, approval standards, and other recurring company rules so those agreements do not disappear into chats, meeting memory, or stale side docs.',
    whyItMatters: 'A company does not just need a decision log. It also needs the current operating rule people are supposed to follow. If a decision changes the expense policy, ownership-pay handling, or another standing rule, the system should be able to show the current policy artifact, what decision created it, what decision superseded it, and what history sits behind it. Otherwise people keep citing old agreements or asking “where does that actually live?”',
    nextAction: 'Define the first policy/SOP model around concrete artifacts: expense policy, ownership-pay rules, approval standards, and supersession behavior. Decide which decisions emit policy artifacts, how policies trace back to locked decisions, where they live in the UI, and how one new decision cleanly overrides an older rule without losing the history.',
    statusNote: 'Keep one canonical decision system. Policies and SOPs should be linked artifacts generated from that system, not a second disconnected truth layer.',
  },
  {
    id: 'GOV-002',
    title: 'Build meeting effectiveness scoring',
    team: 'foundation',
    lane: 'research',
    priority: 'P2',
    rank: 13,
    source: 'Governance system design',
    summary: 'Track whether meetings happened, produced decisions, created ownership, and actually moved the business forward.',
    whyItMatters: 'A meeting existing on the calendar is not the same as a meeting doing its job.',
    nextAction: 'Define a simple meeting-quality rubric tied to decisions, ownership clarity, and follow-through.',
    statusNote: 'Build after baseline governance accountability is in place.',
  },
  {
    id: 'PEOPLE-002',
    title: 'Define role expectation contracts',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 14,
    source: 'People intelligence design',
    summary: 'Create explicit expectation contracts by role so people accountability is grounded in agreed outputs and behaviors.',
    whyItMatters: 'Fair accountability requires explicit expectations before evaluation.',
    nextAction: 'Define the structure for role expectations, required cadences, output expectations, and quality standards.',
    statusNote: 'Dependency for serious people intelligence.',
  },
  {
    id: 'STRATEGY-002',
    title: 'Build company drift map',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 15,
    source: 'Foundation system design',
    summary: 'Show where the business is drifting from strategy by pillar, department, cadence, and source health.',
    whyItMatters: 'Leadership should be able to see where reality is diverging from the plan before that drift becomes damage.',
    nextAction: 'Define the drift categories and how they roll up into one executive view.',
    statusNote: 'Becomes much more powerful once governance and people intelligence exist.',
  },
  {
    id: 'STRATEGY-003',
    title: 'Deepen Strategic Execution into a live quarterly priorities workspace',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 16,
    source: 'Strategy module design',
    summary: 'Evolve the existing Strategic Execution hub beyond mostly static quarterly docs into a live strategy workspace that holds the current quarter, SMART priorities, milestones, owners, evidence, meeting notes, carry-forward decisions, and archived outcomes.',
    whyItMatters: 'Quarterly priorities are not just text. They are the live operating bridge between annual strategy and the next 90 days of execution, and they need to be collaborative, measurable, and easy for AI to reason over.',
    nextAction: 'Use the existing Strategic Execution surface as the base. Define the quarterly-priorities data model: quarter definition, SMART priority records, milestones, owners, status, carry-forward/archive rules, and how the live execution workspace should render them without pushing quarterly churn back into Foundation.',
    statusNote: 'This is no longer a hypothetical future workspace. It is the next evolution of the Strategic Execution hub that already exists.',
  },
  {
    id: 'STRATEGY-004',
    title: 'Build the AI-assisted strategy planning workflow',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 17,
    source: 'Strategy team system design',
    summary: 'Create the pre-strategy workflow for quarterly planning: ingest prior-quarter pre-work, meeting notes, strategic evidence, atoms, and performance data so AI can help identify the most urgent priorities, propose options, expose missing-data gaps, and support carry-forward or stop decisions across Attract, Grow, and Retain.',
    whyItMatters: 'The strategy system should help leadership go from evidence to priorities, not just store the final answer. This is the real AI layer for the future strategy team.',
    nextAction: 'Harden the active Strategy Hub v2 source-to-gap command surface: route resolution feedback, due dates, person-owner resolution, missing-reader source cards, and completion tracking. Do not revive old advisor chat, unsupported recommendations, or AI priority feed surfaces.',
    statusNote: 'Source-to-gap v1 is active after Action Router v1 closure proof. Strategy Hub now consumes live goal truth, operating truth, retrieval eval status, and Action Router records with review/promote controls while advisor chat remains blocked.',
  },
  {
    id: 'SYSTEM-STRATEGY-REVIEW-001',
    title: 'Promote builder-reviewer lessons into system strategy',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 15,
    source: '2026-04-26 through 2026-04-28 builder/reviewer conversation review',
    summary: 'Review the builder/reviewer conversations from the intensive Foundation spine, Strategy Hub repair, and Strategic Intelligence reframing cycle, then promote durable lessons into system strategy, backlog cards, or verifier checks. Capture the function-vs-form testing lesson and memory-versus-repo-truth discipline explicitly.',
    whyItMatters: 'The system learned important lessons: function beats form, verifiers can become the accidental spec, loose atom spam must be caught by output-quality checks, memory is not backlog, build closeout belongs in Foundation, AIOS must support live meeting discussion, and the Strategy layer must continuously surface needle-moving issues instead of acting like a quarterly document shelf.',
    nextAction: 'Done for v1. Keep the 2026-04-28 hard checkpoint handoff as evidence and use the promoted backlog/doc/verifier changes as the active truth. Reopen only if Steve supplies additional unpasted Claude/Codex chats that were not covered by the Apr 27-28 checkpoint.',
    statusNote: 'Closed on 2026-04-28 through the Foundation hard checkpoint: durable lessons were promoted into system strategy, current plan/state, and backlog cards including `FOUNDATION-CHANGELOG-002`, `STRATEGIC-INTEL-001`, `INTEL-SCOPER-001`, `STRATEGY-HUB-MEETING-READY-001`, `STRATEGY-QUARTER-001`, and `MODEL-ROUTING-001`; verification remains `foundation:verify` plus the handoff at `docs/handoffs/2026-04-28-foundation-hard-checkpoint.md`.',
  },
  {
    id: 'STRATEGY-HUB-MEETING-READY-001',
    title: 'Make Strategy Hub output readable in live ownership meetings',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 30,
    source: 'Steve live review of Strategy Hub route proof and controls',
    summary: 'Make the Strategy Hub usable in live ownership meetings: plain-English issue cards, human-readable proof, clear button outcomes, owner assignment, snooze durations, applied/done visibility, and safe destructive actions.',
    whyItMatters: 'The product vision is not managing hidden technical route records. AIOS should sit open in meetings while the team talks through surfaced issues and moves work down the field. If proof renders as IDs, buttons are unclear, or applied Strategy work disappears into Foundation ledgers, the system will not be trusted even when the backend is technically correct.',
    nextAction: 'Do not continue Strategy UI polish until the Foundation hard checkpoint, freshness sweep, and build visibility work are stable. When this resumes, redesign the Strategy route-review surface for live ownership meetings, not as a raw system control panel: source proof must render sender, date, quote, thread participants, reply/reply-count or thread status when available, and source link/context instead of internal IDs; Approve/Apply, Needs Owner, Snooze, Ignore, and Reject need tooltips or a legend explaining what happens and where the record lands; Snooze needs 1 day / 1 week / 1 month / 1 quarter / custom; Needs Owner needs a real owner picker; Strategy-approved items must appear in the Strategy workspace applied/done view; Reject must confirm before closing a proposal. Acceptance smoke test for closeout: Steve dispositions all currently-pending legacy operational routes (the 11 from the pre-clustering era still in `intelligence_action_routes`) per-item via the Hub UI — that walkthrough proves the meeting-ready UX works at scale, not just on the 1 strategy route.',
    statusNote: 'V1 proof plumbing shipped in commit `784fbf2`: human-readable proof, action guide/tooltips, owner picker, snooze durations, reject confirmation, and Applied / Done grouping. Steve explicitly did not accept the UI quality as meeting-ready on 2026-04-28. Keep this scoped/parked until Foundation trust and build-visibility work catch up. Closeout requires the legacy-route walkthrough as smoke test.',
  },
  {
    id: 'STRATEGIC-INTEL-001',
    title: 'Define the continuous Strategic Intelligence loop',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 15,
    source: '2026-04-28 Steve and Claude Strategic Intelligence reframing',
    summary: 'Define Strategy Hub as a continuous strategic intelligence operating loop that mines company signals, separates strategic issues from operational noise, scores urgency/impact/confidence/staleness, and moves issues from surfaced to scoped to discussed to decided to resolved.',
    whyItMatters: 'Steve is building AIOS to use Strategy continuously, not once per quarter. The system must surface needle-moving business issues, prove what matters, show what is already answered, identify the actual gaps, and help resolve them week by week.',
    nextAction: 'Review and approve `docs/specs/2026-04-28-strategic-intelligence-loop.md` before code. The draft chooses a real `intelligence_strategic_issues` table, lifecycle fields, typed urgency, impact, confidence, and staleness, daily/event/weekly cadence, old scout -> director -> scoper -> sprint mapping, resolution feedback writes, and 10x pilot metrics: >= 5 strategic issues surfaced/week, >= 3 scoped/week, >= 2 resolved-to-applied/week, and median manual investigation time <= 30 minutes per issue. Implementation blocks `INTEL-SCOPER-001` until the issue-ledger/schema decision is accepted.',
    statusNote: 'New P0 from 2026-04-28. The checkpoint moved the design out of chat memory into `docs/specs/2026-04-28-strategic-intelligence-loop.md`, but this remains scoped until Steve/system review accepts the spec. Do not expand Strategic Intelligence code before Foundation sweep/build visibility catches up.',
  },
  {
    id: 'INTEL-SCOPER-001',
    title: 'Build the gap-resolving Scoper',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 16,
    source: 'Old-system Scoper salvage plus 2026-04-28 Steve Strategic Intelligence review',
    summary: 'Build an on-demand Scoper that takes a Strategy route or synthesized item and produces a structured gap analysis: what is already answered with proof, what is partial, what is actually still missing, who likely owns it, and the smallest useful next steps.',
    whyItMatters: 'The current route proved the system can cluster signals, but the card was weak because it did not resolve ambiguity. The 10x value layer is not another research summary; it is a tool-using Scoper that checks the system, verifies what is already solved, narrows the true gaps, and turns a vague issue into a near-ready work plan.',
    nextAction: 'Depends on STRATEGIC-INTEL-001 approving the strategic issue ledger/schema and scoring fields in `docs/specs/2026-04-28-strategic-intelligence-loop.md`. Build after Foundation sweep/build visibility and the STRATEGIC-INTEL-001 spec gate. V1 must be on-demand through a "Scope this" action, not auto-run on every item. First gate: classify the item as `already_answered`, `partially_answered`, `real_gap`, `stale_or_test`, or `needs_human_context`. It must query atoms, retrieval chunks, synthesis facts, source contracts, decisions, open questions, backlog, docs, existing routes, prior scoped cards, and relevant operating facts; persist to an `intelligence_scoped_cards` style table or named equivalent; return structured sections for verified already-answered, partial evidence, actual remaining gaps, stale/test risk, owner options, smallest next steps, and evidence pointers. The Hub UI must show the scoped result after "Scope this" as a meeting-readable panel with verified / partial / remaining-gaps sections, evidence chips, suggested next steps, scoped-card status, and a link back to the stored scoped card. Every verified claim must cite a file, source ID, fact, atom, chunk, decision, route, or backlog ID. Include a minimal Agent Spec: purpose, tools, inputs, outputs, kill switch, max cost/latency per scope, evidence requirements, and human approval boundary. Produce a 5-row human sample before closeout.',
    statusNote: 'New P0 from 2026-04-28. The hard checkpoint preserved the exact gap-resolving output contract in `docs/specs/2026-04-28-strategic-intelligence-loop.md`. This is the first real tool-using agent shape, but it is deliberately narrower than Agent Factory and waits behind Foundation checkpoint work.',
  },
  {
    id: 'INTEL-THREAD-CONTEXT-001',
    title: 'Add full thread context to evidence proof',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 16,
    source: '2026-04-28 Strategy route proof review',
    summary: 'Make route/scoper evidence show whether a source signal is an active conversation, one-way email, system-drafted test-like artifact, or reply-backed thread across Gmail, Missive, meetings, and other shared communication sources.',
    whyItMatters: 'The first Strategy route was technically legitimate but weak: it was backed by email signals with no replies captured, and Steve correctly questioned whether it was a real active issue or a dead/test email. Strategic Intelligence cannot be trusted if proof only shows quotes without conversation completeness and confidence context.',
    nextAction: 'After Foundation sweep/build visibility work, extend evidence proof to expose full thread context where available: reply count, latest activity, participants, direction/from-to, source account, hit/use counts, linked artifacts, cross-source corroboration, and weak-proof flags such as one-message thread, system-drafted origin, no reply captured, stale date, or no owner response. Feed these signals into Strategic Intelligence confidence/staleness and Scoper first-gate classification.',
    statusNote: 'New P1 from the 2026-04-28 hard checkpoint. This can be built as part of `STRATEGIC-INTEL-001` / `INTEL-SCOPER-001` proof hardening, but it is tracked separately so weak source-proof context is not lost.',
  },
  {
    id: 'STRATEGY-QUARTER-001',
    title: 'Create the source-backed Strategy Quarter input layer',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 17,
    source: 'Steve Q2 AIOS operating-system priority',
    summary: 'Create the canonical source-backed quarter strategy layer that stores quarter theme, critical number, unresolved strategic issues, department targets, open decisions, prework outputs, weekly ownership review outputs, and follow-up routing.',
    whyItMatters: 'Strategy Quarter is important context for Strategic Intelligence, not the whole value layer. The system needs the current quarter operating intent so it can interpret issues, tradeoffs, urgency, and department targets during weekly ownership review.',
    nextAction: 'Build after the meeting-ready UX and Strategic Intelligence spec are pinned. V1 remains PostgreSQL-backed canonical records with source ID `SRC-STRATEGY-QUARTER-001`; write path through Strategy Hub owner/admin forms, not CLI-only or direct sheet edits; synthesis integration through new strategy-quarter fact types in the source fact ledger, aligned with goal-truth-style source facts. Use existing Drive/notes as import evidence, not the canonical write surface.',
    statusNote: 'Scoped on 2026-04-27 and recontextualized on 2026-04-28. This is the quarter context/input layer for the continuous Strategic Intelligence loop, not the 10x value layer by itself. Data store, write path, and synthesis integration are pinned before build starts.',
  },
  {
    id: 'MODEL-ROUTING-001',
    title: 'Document canonical model routing doctrine',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 18,
    source: '2026-04-28 subscription, API credit, and Scoper runtime discussion',
    summary: 'Create canonical doctrine for which model/runtime class handles each AIOS workload, separating human subscriptions from system runtime and tying model choices to cost, privacy, latency, and quality needs.',
    whyItMatters: 'Steve has multiple Claude, Codex, and Gemini subscriptions plus API capacity. Without a clear routing doctrine, the system can drift into subscription-farm thinking, hidden spend, or using the wrong model for high-stakes scoping. The system needs one explicit policy before Scoper and agent work expand.',
    nextAction: 'Update the canonical runtime doctrine in `docs/rebuild/current-runtime-map.md`; do not create a competing model-routing doc unless that file is intentionally split later. Preserve the rule: subscriptions are for humans/live operator use when allowed, probed, logged, and classified; system runtime uses official APIs and governed adapters by default. Define task classes for cheap classification/tagging, embeddings, synthesis, Scoper deep tool use, coding, heartbeats, and high-stakes scopes. Verify current official model availability before hardcoding exact model names. Include cost tracking per feature and privacy/tier boundaries.',
    statusNote: 'New P1 from 2026-04-28. This should not block the meeting-ready Strategy Hub pass, but it should land before broad Scoper/agent runtime expansion.',
  },
  {
    id: 'STRATEGY-007',
    title: 'Build full-screen Strategy Advisor workspace and fast/deep modes',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 18,
    source: '2026-04-26 strategy prep live-use feedback',
    summary: 'Turn the current floating Strategy Advisor into a live-session workspace: a full-screen chat view, saved strategy conversation thread, evidence links, suggested questions, and mode selection between fast answers and deeper synthesis.',
    whyItMatters: 'Tomorrow strategy work needs the advisor to be usable in the room, not only as a small bubble. Fast mode should answer normal questions without rebuilding the full world every time; deep mode should deliberately spend more time/tokens when Steve asks for heavier synthesis.',
    nextAction: 'Done for live-use v1. Keep deeper review/promote workflow on STRATEGY-004 and capacity/account policy on LLM-HUB-CAPACITY-001.',
    statusNote: 'Closed on 2026-04-26 and tightened on 2026-04-27. Strategic Execution now has a full-screen Strategy Advisor workspace, session-saved local thread, Fast/Deep mode controls, route/model/latency/effort metadata, direct artifact search for who-said-what questions, and the original floating launcher preserved for quick access. Fast is compact live-meeting mode; Deep / XHigh is the slower smartest-available subscription synthesis mode. Live proof: Ryan pre-strat question now answers from the filled PDF form fields instead of packet summary only.',
  },
  {
    id: 'STRATEGY-008',
    title: 'Build pre-strat read coverage engine',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 19,
    source: '2026-04-26 strategy prep source-read QA',
    summary: 'Expose a source-backed read-coverage engine for Q2 pre-strat notes so the Strategy hub can prove which expected participant notes are extracted, readable, linked, and available to the advisor.',
    whyItMatters: 'Strategy cannot walk into a leadership session guessing whether Ryan, Scott, Carson, Georgia, Nick, Clare, Ahsan, Steve, or Blake were actually read. Missing notes need to be visible as gaps, not discovered mid-question.',
    nextAction: 'Done for v1. Keep using the coverage panel before the strategy session; if any late note appears in Drive, rerun Drive content extraction and confirm the participant row is source-backed rather than packet-inferred.',
    statusNote: 'Closed on 2026-04-26 and refreshed on 2026-04-27 after Blake uploaded his Q2 pre-work. Strategic Execution now has /api/strategic-execution/prework-coverage and the UI shows Pre-Strat Read Coverage. Live checkpoint: 9/9 expected rows read, 11 current Q2 artifacts indexed, Blake extracted as SRC-GDRIVE-001:drive_pdf:1x5UsSybYWbHdZQRN7yE6vnjnXsWnUWa9, Scott covered through manual visual review, and Ryan/Carson/Georgia/Ahsan through fillable PDF form fields.',
  },
  {
    id: 'STRATEGY-009',
    title: 'Clean Strategy Package UI/UX for live planning',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 20,
    source: '2026-04-26 strategy package live-use review',
    summary: 'Audit and consolidate Strategic Execution pages so Overview, Strategy Advisor, Evidence Packet, Supporting Docs, Quarterly Priorities, and Strategic Issues each have one job and do not repeat the same packet, board, and priority blocks in confusing ways.',
    whyItMatters: 'Tomorrow strategy needs a cockpit that answers what we know, what is missing, what to decide, and what to promote. Repetitive panels make Steve lose trust in whether the system is organized or just moving text around.',
    nextAction: 'Do a full page-by-page UX pass: keep Overview as the command cockpit, Advisor as the live conversation, Evidence Packet as source proof/read coverage, Review Board as decisions/issues, and Quarterly Priorities as accepted outputs. Remove duplicate board/packet rendering where it does not earn its place.',
    statusNote: 'Scoped from Steve’s 2026-04-26 review. First cleanup already removed the compact review board from Overview, added pre-strat coverage, and kept recommended priorities visible. Remaining work is a deliberate page hierarchy and review/promote flow, not more random panel movement.',
  },
  {
    id: 'STRATEGY-010',
    title: 'Add live goal-truth guardrails to Strategy Hub',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 21,
    source: '2026-04-26 strategy live-use correction',
    summary: 'Make Strategy Hub and Strategy Advisor use live BHAG and Agent Engine source rows before packet summaries for $2B, 10,000-agent, behind/ahead, recruiting-pace, and active-capacity claims.',
    whyItMatters: 'Steve spent weeks connecting Owners, FUB, KPI, finance, BHAG, and Agent Engine truth so Strategy advice would not make up numbers. A stale packet summary saying the 10,000-agent community path is behind when live BHAG says ahead destroys trust and defeats the point of Foundation.',
    nextAction: 'Done for v1. Keep this guardrail in verifier and regenerate Strategy Evidence Packets whenever goal-source semantics change.',
    statusNote: 'Closed on 2026-04-26. Live source truth now separates Team Goal $2B pace, Community Goal 10,000 Agents pace, and Agent Engine active productive capacity. Current proof: team volume is behind live pace, 10k community path is ahead live pace, and active productive Agent Engine capacity is behind. Strategy Advisor context, packet generation, UI, and verifier now carry this distinction.',
  },
  {
    id: 'GOV-003',
    title: 'Build strategy-to-calendar enforcement',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 18,
    source: 'Governance system design',
    summary: 'If the strategy defines a cadence, the system should verify it exists on the calendar and flag gaps before the cadence breaks.',
    whyItMatters: 'Strategy should show up in the calendar, not just in documents.',
    nextAction: 'Map required meetings and review cadences to calendar checks, missing-event alerts, preflight briefing requirements, and post-meeting closeout expectations.',
    statusNote: 'Direct extension of the governance accountability layer and the first preflight check for a live governance operator.',
  },
  {
    id: 'SYSTEM-002',
    title: 'Define modular product architecture around Foundation',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 19,
    source: 'Product architecture insight',
    summary: 'Treat Foundation as the core product and design future team and pillar modules to plug into it instead of forking their own systems.',
    whyItMatters: 'This keeps the AI OS sellable and extensible. Strategy, memory, sources, governance, and accountability should be shared primitives that every future module reuses.',
    nextAction: 'Write the first modular architecture note: Foundation core, shared primitives, and how future modules like Marketing, Strategy Team, People, and Ops attach to it.',
    statusNote: 'Captures the idea that someone may eventually buy one pillar while still depending on the Foundation backbone.',
  },
  {
    id: 'AGENT-001',
    title: 'Define the core agent topology for the AI OS',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 20,
    source: 'Agent system design',
    summary: 'Design the real agent model: Crewbert as orchestrator, Harlan as Steve-facing assistant, department assistants, and how true agents differ from lightweight routed personas.',
    whyItMatters: 'The old system blurred true agents and wrapped personas. We need a clear architecture before building chat surfaces, role-based assistants, or per-user experiences.',
    nextAction: 'Map the minimum viable agent topology: orchestrator, personal assistant, department assistant pattern, and when to use routing versus a dedicated agent runtime.',
    statusNote: 'Important before we promise every leader or agent a full assistant.',
  },
  {
    id: 'UX-001',
    title: 'Add a home-screen chat surface for the main assistant',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 21,
    source: 'Foundation UX direction',
    summary: 'Put a real conversation box on the Foundation home screen so Steve can talk to the main assistant from inside the system instead of treating chat as separate from the OS.',
    whyItMatters: 'The operating system should feel alive and usable from the home screen. The chat surface becomes the front door into strategy, memory, sources, and execution support.',
    nextAction: 'Define the first home chat experience: what assistant it talks to, what context it gets, and how it links into memory, backlog, and source-backed views.',
    statusNote: 'Scope this before building around a final agent identity decision.',
  },
  {
    id: 'PEOPLE-003',
    title: 'Design role-based workspace and assistant experiences',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 22,
    source: 'Product and people-system design',
    summary: 'Different users should see different workspaces, assistants, and accountability layers based on who they are: Steve, leadership, department owners, or agents on the team.',
    whyItMatters: 'If everyone sees the same system, the experience gets noisy and low-trust. Role-aware views are necessary for assistants like Harlan, Chief, or future team-facing copilots.',
    nextAction: 'Define the first role tiers, what each role can see, and what their assistant should help with.',
    statusNote: 'Connect this later to auth, permissions, and people accountability.',
  },
  {
    id: 'DEV-001',
    title: 'Rebuild a lightweight parallel dev loop with worktree isolation',
    team: 'foundation',
    lane: 'research',
    priority: 'P2',
    rank: 23,
    source: 'Old dev-team salvage',
    summary: 'Reuse the strongest pattern from the old system: DB-backed tasks, isolated git worktrees, a scoped builder/reviewer loop, and safe parallel execution.',
    whyItMatters: 'This is how we eventually let 2–5 agents work in parallel without stepping on each other, while keeping the rebuild much lighter than the old Frankenstein.',
    nextAction: 'Document the v2 dev loop: task table, worktree-per-task, small role set (scoper, builder, QA, review loop), and branch ownership rules.',
    statusNote: 'Useful accelerator later, not a current blocker.',
  },
  {
    id: 'DEV-002',
    title: 'Define the research-to-release pipeline and scoped-card standard',
    team: 'foundation',
    lane: 'research',
    priority: 'P2',
    rank: 24,
    source: 'Old dev-team salvage',
    summary: 'Salvage the strongest pipeline pattern from the old system: research finds WHAT is changing, synthesis decides WHY it matters, scoping defines HOW it should be built, ranking decides WHEN it enters the queue, build-and-review proves quality, human review confirms risk, and only then does work push live. The future-state version should also define the trust ladder for when some of that human review can be relaxed.',
    whyItMatters: 'The old system was directionally right when it forced work through quality gates before build. The real value was never “lots of agents.” It was the pipeline discipline that prevented thin ideas from reaching implementation and created the long-term possibility of safe autonomy. If the new system wants to earn autopilot later, it needs a clear research -> synthesis -> scope -> rank -> build/review -> human review -> push-live model first, plus explicit trust thresholds for what can eventually bypass the human gate.',
    nextAction: 'Define the v2 pipeline in plain terms for the new system: stage names, entry/exit criteria, what data each stage must attach, the scoped-card standard (problem/context, why it matters, build shape, acceptance criteria, definition of done, risks, dependencies, blocked reason, verification/test plan, source links), the review-loop quality bar, the human-review checkpoint, and the trust-building path toward selective autonomous push-live later.',
    statusNote: 'Do not rebuild the old dev-team theater. Keep the good part: rich scoped cards, explicit gates, strong review loops, and a trust ladder that earns autonomy instead of assuming it. The website can stay simpler than the full pipeline, but the underlying card standard still needs real build context instead of thin notes.',
  },
  {
    id: 'UX-002',
    title: 'Wire Harlan to one continuous cross-channel assistant',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 24,
    source: 'Foundation assistant product design',
    summary: 'Make Harlan one real assistant identity across web, Telegram, and future channels instead of separate mock chat surfaces. The website chat should continue the same conversation and memory thread no matter where Steve is talking to Harlan.',
    whyItMatters: 'If Harlan feels like separate fake copies in different channels, trust drops immediately. The Foundation viewer should reflect one assistant, one memory spine, and one session history across channels.',
    nextAction: 'Define the shared conversation model, channel identity rules, and memory/session contract for Harlan across web and Telegram.',
    statusNote: 'Current home chat is only a preview. This captures the real product requirement.',
  },
  {
    id: 'AGENT-010',
    title: 'Recover personal-agent onboarding and private profile system',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 8,
    source: 'Founder personal-agent doctrine + old BCrew-Buddy onboarding plan',
    summary: 'Recover and rebuild the personal-agent onboarding system for when a human gets an AI assistant. The assistant should help build a private personal profile, learn role, goals, preferences, allowed systems, personal context the human chooses to share, feedback, and what useful help looks like. ME.md is only a working label, similar in spirit to USER.md.',
    whyItMatters: 'Harlan and future team assistants will be weak if they do not know the human they serve. The old system had serious onboarding/coaching ideas, but they must be recovered into the new Foundation model instead of being lost in old docs or chat memory.',
    nextAction: 'Audit `~/bcrew-buddy-reference/docs/plans/bot-onboarding-coaching-plan.md`, define the first personal-agent profile schema, calibration interview, feedback loop, daily nugget rules, privacy boundaries, and Harlan pilot acceptance criteria.',
    statusNote: 'Captured 2026-04-26 after Steve clarified that personal agents must know the person, their goals, preferences, role, family/personal context when shared, and deliver one useful daily nugget. This is separate from ClickUp Agent Roster 30/60/90 feedback.',
  },
  {
    id: 'UX-003',
    title: 'Align Foundation nav order with strategy review order',
    team: 'foundation',
    lane: 'done',
    priority: 'P2',
    rank: 25,
    source: 'Foundation viewer audit',
    summary: 'Keep the Foundation site in the same top-down order we use to review and lock strategy so the website stays a clean viewing layer instead of inventing a new mental model.',
    whyItMatters: 'The website exists to help Steve view the system. If the nav order drifts from the actual strategy packet, review gets harder and the UI starts creating confusion instead of reducing it.',
    nextAction: 'Keep the nav aligned to the current review model as future hubs split out; do not let later additions reintroduce a confusing order.',
    statusNote: 'Closeout backfilled on 2026-04-29 under CLOSEOUT-BACKFILL-001. Evidence: historical done state is explicitly preserved in docs/process/verifier-exceptions.json. Existing proof details remain: Foundation nav follows the review order and packet/supporting-doc hierarchy instead of inventing a separate mental model.',
  },
  {
    id: 'UX-004',
    title: 'Create a Foundation UI pattern checklist',
    team: 'foundation',
    lane: 'done',
    priority: 'P2',
    rank: 26,
    source: 'Foundation build consistency',
    summary: 'Write down the small layout and component rules that keep Foundation pages consistent as we keep rebuilding them.',
    whyItMatters: 'Without a pattern checklist, small shifts in where intros, source lines, footers, tables, and live snapshot cards sit will keep making the system feel inconsistent even when the data is right.',
    nextAction: 'Keep docs/superpowers/specs/foundation-ui-patterns.md current as the live pattern note and treat future approved-section protections as UX-005 work, not a reason to reopen this card.',
    statusNote: 'Done. The Foundation UI pattern checklist now exists as a live internal build note.',
  },
  {
    id: 'UX-005',
    title: 'Protect approved UI sections from drift during moves and refactors',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 27,
    source: 'Strategic Execution move failure',
    summary: 'When a section or card has already been approved, moving it to a new hub should preserve the exact content and layout unless a new explicit redesign is approved.',
    whyItMatters: 'We lost time and trust by reinterpreting an approved section instead of moving it literally. The system needs a guardrail for approved UI so moves do not become accidental rewrites.',
    nextAction: 'Define the first protection mechanism for approved sections: exact component reuse, approved-section registry, or snapshot-based checks for key Foundation and Strategic Execution views.',
    statusNote: 'This is a build-discipline rule derived directly from the Current Quarter move failure.',
  },
  {
    id: 'UX-006',
    title: 'Build smart export packets for Strategy and Foundation',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 28,
    source: 'Foundation home review + strategy export pass',
    summary: 'Replace the current single-file strategy PDF with source-backed export packets that can assemble the business strategy, its supporting docs, and later the full Foundation surface into one polished branded artifact.',
    whyItMatters: 'Leadership will need artifacts that can be downloaded, shared, printed, and reviewed outside the app, but those exports cannot collapse back into stale ad hoc documents. The export system needs to respect the modular strategy architecture while still producing one clean packet when needed.',
    nextAction: 'Define export modes and inclusion rules: strategy packet only, strategy packet plus supporting docs, and eventual full Foundation export with system strategy, source trust, decisions, and closeout state. Decide ordering, branding, appendix behavior, timestamps, and how live source-backed sections should be consolidated without breaking trust or duplicating stale snapshots.',
    statusNote: 'Not a Foundation closeout blocker. Do this after Home, Strategy, and System Strategy are fully buttoned up.',
  },
  {
    id: 'CLEANUP-001',
    title: 'Clean leftover internal references and shared frontend helpers after Foundation closeout',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 26,
    source: 'Frankenstein prevention audit',
    summary: 'The live Foundation files are much cleaner now, but there are still a few internal leftovers: duplicated helper code across the frontend surfaces, historical build notes that reference removed files, and compatibility aliases that should eventually be reviewed instead of living forever by accident.',
    whyItMatters: 'The remaining risk is no longer giant dead live files. It is slower drift: duplicated helper logic, stale internal references, and compatibility glue that nobody re-evaluates. Cleaning that up keeps Foundation tight without wasting time on fake archaeology.',
    nextAction: 'Review the current real candidates: shared helper duplication across `public/doc.js`, `public/foundation.js`, and `public/strategic-execution.js`; historical internal build notes under `docs/superpowers/*`; and the remaining compatibility aliases for removed doc paths. Keep intentional redirects, archive stale build notes when they stop helping, and only delete what no longer serves a real purpose.',
    statusNote: 'This is now a bounded hygiene pass, not a hunt for imaginary dead files.',
  },
  {
    id: 'MANDATE-001',
    title: 'Define dual mandates for departments with dual pillar roles',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 27,
    source: 'Department mandates review',
    summary: 'Departments that support more than one pillar should not be flattened into one vague mandate. Define their overall mandate, then break out the specific mandate they carry inside each pillar they influence.',
    whyItMatters: 'If Marketing, Operations, or other cross-functional teams are described too loosely, ownership gets blurry. The system needs to show what each department is responsible for in Attract, Grow, and Retain when those roles split.',
    nextAction: 'When the mandates pass starts, identify departments with dual roles and define both the overall mandate and the pillar-specific mandates they carry.',
    statusNote: 'Captured during the Agent Engine and mandates review so it is handled intentionally, not as a wording patch.',
  },
  {
    id: 'AGENT-002',
    title: 'Build a live strategic operator across leadership and department cadences',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 29,
    source: 'Leadership meeting agent idea',
    summary: 'Create an agent that sits across leadership, strategy, and key department meetings, prepares the room, keeps the agenda on sequence, asks follow-up questions, captures decisions, turns them into structured work, and can push approved updates into connected systems like backlog, ClickUp, and operating trackers during or immediately after the meeting.',
    whyItMatters: 'Leadership should not have to both run the business and act as the full-time strategy PM layer. A strong strategic operator could protect cadence, improve accountability, spot drift across departments, and close the gap between meeting decisions and real system updates.',
    nextAction: 'Define the MVP: pre-meeting briefing, live presence across core cadences, agenda enforcement, question prompts, decision extraction, owner/deadline tracking, approval rules for in-meeting system updates, post-meeting closeout, and escalation rules when departments miss commitments or drift off strategy.',
    statusNote: 'Start as a disciplined strategic operator across the main business cadences, not a transcript bot, novelty demo, or fully autonomous meeting boss.',
  },
  {
    id: 'AGENT-003',
    title: 'Add voice-triggered live meeting control for Harlan',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 30,
    source: 'Meeting copilot product idea',
    summary: 'Let Harlan join a Google Meet or business cadence as a live strategic operator that can be activated by voice cues such as “Hey Harlan, kick us off” or “Hey Harlan, what are we missing?”',
    whyItMatters: 'If Harlan can be activated naturally in the room, it becomes much easier to use across leadership and department meetings for kickoff, agenda discipline, question prompting, and approved in-meeting actions without turning the meeting into a manual operator workflow.',
    nextAction: 'Define the first live-meeting interaction model: wake phrase or push-to-talk trigger, meeting-room transport, interruption rules, participant awareness, approval gates for live system changes, and when Harlan should speak versus stay silent across the main cadences.',
    statusNote: 'This is a voice/runtime layer on top of AGENT-002, not a replacement for the live strategic operator core.',
  },
  {
    id: 'AGENT-004',
    title: 'Add mission-control and queue safety for the live operator',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 31,
    source: 'Strategic operator runtime design',
    summary: 'Create the runtime safety layer for the live operator: mission-control visibility, queued task routing, duplicate suppression, and approval boundaries so meeting, chat, and follow-up actions do not collide or fail silently.',
    whyItMatters: 'A live operator that can speak, write, delegate, and update systems across channels will lose trust fast if actions overlap, disappear, or fire twice.',
    nextAction: 'Define the first runtime contract: queue semantics, operator session state, channel allowlists, duplicate suppression, approval checkpoints, and the minimum mission-control view needed to supervise live operator actions.',
    statusNote: 'This is runtime trust and observability for AGENT-002/003, not a vanity dashboard project.',
  },
  {
    id: 'AGENT-009',
    title: 'Prepare a v1 strategic planning copilot for the April 22 planning session',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 16,
    source: 'Strategic planning deadline + Mark Kashef meeting-pattern review',
    summary: 'Build the first narrow strategic-planning copilot around the April 22 planning session instead of treating the meeting-agent idea as abstract future work. V1 should prepare the room, prompt sharper questions, capture real decisions and owners, and produce a usable closeout packet after the session.',
    whyItMatters: 'This is the first real prove-it moment for the strategic-operator idea. If the system can materially improve one live planning session, it earns the right to expand into recurring leadership and department cadences. Mark\'s work makes it clear this can be real; the rebuild needs to capture that value without pretending we adopted his full stack.',
    nextAction: 'Scope the April 22 MVP: required pre-read inputs, agenda structure, in-room interaction mode (voice or text-assisted), decision/owner extraction, approval boundary for live updates, and the exact outputs leadership should receive within 24 hours after the session.',
    statusNote: 'This is a narrow trust-building loop for one planning session, not the whole War Room or agent-runtime buildout.',
  },
  {
    id: 'SYSTEM-004',
    title: 'Build a live System Capabilities surface',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 32,
    source: 'Old-system audit + Foundation visibility review',
    summary: 'Create one live place in Foundation that shows what the OS can actually use right now: models, tools, skills, connectors/plugins, and any system-level runtimes that future hubs and agents depend on.',
    whyItMatters: 'The old system had useful capability visibility, but it was trapped in generated docs and stale JSON. In the rebuild, hidden capability state creates the same confusion in a cleaner wrapper: people cannot tell what the system really has, what is connected, what is trusted, or what is still just an idea.',
    nextAction: 'Define the first capabilities schema and UI: model layer, tool layer, skill layer, connector/plugin layer, working status, proof of working state, and which agents or surfaces can access each capability. Drive it from real config and runtime state instead of a hand-maintained inventory doc.',
    statusNote: 'This should become a live operating surface, not another static markdown report.',
  },
  {
    id: 'SYSTEM-005',
    title: 'Build role-based human approval routing across the OS',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 33,
    source: 'Governance review + old write-safety gold',
    summary: 'Replace founder-centric approval assumptions with a role-based human approval model so strategy changes, outbound actions, content approvals, and future agent writes route to the right owner instead of collapsing back onto one person.',
    whyItMatters: 'The system cannot be sellable, scalable, or politically durable if every approval path implicitly routes to Steve. The old backlog had the right instinct here, and the current doctrine already points the same way: the right human owner confirms. That needs to become an explicit operating model, not just wording.',
    nextAction: 'Define approval routing by action type: strategy changes, source sign-off, content approval, outbound communication, department execution, and future agent configuration changes. Name owner roles, fallback rules, escalation rules, and what must be recorded in the audit trail every time an approval happens.',
    statusNote: 'Start with routing doctrine and visibility before automating actual approval flows.',
  },
  {
    id: 'SYSTEM-006',
    title: 'Define what Foundation Operations owns versus what future hubs own',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 34,
    source: 'Foundation Operations review',
    summary: 'Tighten the operating-record model so Foundation Operations clearly owns the root system records, while Strategic Execution, Marketing, departments, and future hubs own their own execution records instead of dumping everything back into Foundation forever.',
    whyItMatters: 'The current root queue is intentionally transitional, but that only works if the boundary is explicit. Without a clean ownership model, the team will keep asking whether a backlog item, decision, question, or policy belongs to Foundation, to a strategy layer, or to a future hub. That confusion turns the root system into a catch-all and eventually recreates the same clutter this rebuild is trying to avoid.',
    nextAction: 'Define the ownership rules and record map for Foundation Operations: what belongs in the canonical decision log, what stays in the root Foundation backlog, what counts as a root open question, what becomes filtered views, what graduates into Strategic Execution, and what moves into future hub-local queues without losing traceability.',
    statusNote: '2026-04-26 Foundation Operations page review kept Backlog, Decisions, Open Questions, System Activity, and Runtime Health in the menu, but clarified each page purpose and boundary. The next deeper work is still the ownership split before more hub-local queues arrive.',
  },
  {
    id: 'SYSTEM-007',
    title: 'Build a searchable Foundation activity explorer beyond the latest audit feed',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 38,
    source: 'Foundation Operations review',
    summary: 'Keep System Activity as the short operator feed, but add the fuller audit surface behind it so the team can search, filter, and inspect older change events instead of relying on only the latest page-sized slice.',
    whyItMatters: 'The latest 20 events are enough for quick operator review, but not enough for real audit work once the system gets busier. If the only visible history is a tiny rolling window, conflict cleanup, provenance review, and postmortems will all stay harder than they need to be.',
    nextAction: 'Design the first real activity explorer: event search, date range, actor filter, entity type filter, event-type filter, direct links back to the affected record, and enough metadata visibility that humans can reconstruct what changed without going spelunking through raw DB rows.',
    statusNote: 'Do not turn the default page into a noisy firehose. Keep the main activity page short and readable, then add the explorer as the deeper audit layer.',
  },
  {
    id: 'SYSTEM-008',
    title: 'Deepen System Health into a real diagnostic and alert model',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 39,
    source: 'Foundation Operations review',
    summary: 'Keep the overview page as the closeout summary, but evolve Runtime Health into the deeper diagnostic layer for trust, memory, verification, connector/runtime state, and future alert conditions.',
    whyItMatters: 'Right now  is only the first component-status layer. That is fine for the current rebuild, but eventually the team will need a clearer distinction between high-level closeout state on Home and low-level operator diagnostics, degradation reasons, and health warnings in the health view.',
    nextAction: 'Define the health model and view layers: which components belong in health, what counts as live/pending/risk/planned, how source-health and verification failures should surface, what future alerts or warning thresholds matter, and how the page should differ from the simpler home-page summary.',
    statusNote: 'Good enough for now, but it should grow into a true operator diagnostic surface instead of staying a shallow duplicate forever.',
  },
  {
    id: 'RUNTIME-HEALTH-SIMPLIFY-001',
    title: 'Make Runtime Health easier to read without weakening diagnostics',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 39,
    source: '2026-04-28 Steve review: Runtime Health is a beast',
    summary: 'Runtime Health has become a powerful diagnostic page, but it is too dense for normal operator scanning. Add a plain-English top layer that says what is healthy, what needs attention, and what changed, while keeping the deep diagnostic sections available underneath.',
    whyItMatters: 'Steve needs a fast answer before a meeting: is the system okay, what needs attention, and where should he click? If Runtime Health is technically correct but exhausting to read, Foundation still depends on an engineer to translate it.',
    nextAction: 'Design a later simplification slice: collapsed-by-default diagnostic groups, plain-English section summaries, health grades, attention-only filters, and direct links into the exact deeper panel. Do not remove the existing detail; make it easier to enter.',
    statusNote: 'Parked follow-up, not next. This should build after the action-loop Review/Apply slice or when Runtime Health becomes a repeated operator pain. Related but smaller than SYSTEM-008: this is UX simplification, not a new diagnostic model.',
  },
  {
    id: 'SYSTEM-012',
    title: 'Define hub Scopers before building acting agent swarms',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 40,
    source: 'Foundation-to-hub architecture refinement',
    summary: 'Lock the role of a hub Scoper: a reader that consumes approved Foundation intelligence, goes deeper into raw context when needed, and produces scoped work for one hub before any large acting-agent layer is turned on.',
    whyItMatters: 'The old system had the right instinct with directors and scopers, but the architecture became too fragmented. If the rebuild skips this role definition, it will either jump too fast into acting agents or collapse all intelligence work back into one giant assistant.',
    nextAction: 'Use `INTEL-SCOPER-001` as the first concrete Scoper build. Future hub Scopers should inherit from that proof instead of designing director/scoper/agent layers in the abstract.',
    statusNote: 'Foundation ingests and approves. Hub Scopers read, deepen, and scope. Later specialist agents act. The old-system rule that Scopers must query atoms directly is now a design gate for REPORT-MINING-001 and INTEL-ATOM-001; `INTEL-SCOPER-001` now carries the first gap-resolving Scoper contract.',
  },
  {
    id: 'AGENT-005',
    title: 'Define the agent franchise model before building more agents',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 34,
    source: 'Old-system audit + agent-franchise discussion',
    summary: 'Define the contract every real agent must satisfy before it is built or activated: purpose, owner, model, tools, skills, permissions, memory, inputs, outputs, cadence, reports, escalation path, and approval boundary.',
    whyItMatters: 'The old system had good agent ideas but weak enforcement. Agents existed without one consistently enforced contract, which made them hard to trust, hard to compare, and easy to let drift. If we build more agents without a franchise model, we will repeat the same failure in a prettier interface.',
    nextAction: 'Park active agent-factory work until STRATEGY-QUARTER-001 has been used in production for at least two weekly ownership cycles and one other hub, Marketing or Ops, has started a source-to-action slice. When that trigger is met, define the first franchise schema and build gate before creating any autonomous agent.',
    statusNote: 'Concrete deferral set on 2026-04-27. Agent Factory, System Health Auditor, and cleanup/write agents are right ideas but not current builds. Do not build a real autonomous agent until the Strategy/Foundation loop has operated for 2+ weekly cycles and at least one other hub has started.',
  },
  {
    id: 'AGENT-006',
    title: 'Build a live Agent Registry from the franchise contract',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 35,
    source: 'Old All Agents + Agent Detail audit',
    summary: 'Create a live registry page for every real and planned agent so the team can see what exists, what each agent is for, who owns it, what it can access, and what contract it is supposed to satisfy.',
    whyItMatters: 'The old All Agents and Agent Detail surfaces were conceptually right: people need a visible registry, not hidden agent definitions scattered across files. But the old implementation went stale because it depended on generated docs and startup JSON. The new system should keep the visibility and kill the staleness.',
    nextAction: 'Define the first registry views: all agents, per-agent detail, owner, status, model, tools, skills, permissions, memory layer, cadence, outputs, source dependencies, and last known operational state. Drive it from the live franchise model and runtime state, not a static System Inventory placeholder.',
    statusNote: 'Registry explains what the agent is. Operations will explain what it is doing right now. 2026-04-26 Foundation Inventory audit clarified that System Inventory > Agents is only a boundary/system-map view, not a live Agent Registry yet.',
  },
  {
    id: 'AGENT-007',
    title: 'Build a live Agent Operations surface',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 36,
    source: 'Old agent-operations audit + Foundation supervision need',
    summary: 'Create the live operational view for agent runtime state: scheduled, running, degraded, paused, queued, awaiting approval, recently changed, and recently failed.',
    whyItMatters: 'An agent registry is not enough. Humans also need to know what is happening now. The old dashboard had the right instinct with activity, schedule, and status, but the new system should separate static contract from live operations so supervision stays clear instead of noisy.',
    nextAction: 'Define the smallest useful operations surface: status, schedule, last successful run, current queue, blocked approvals, degraded reasons, recent outputs, and recent change events. Keep it live and operational, not a vanity telemetry board or a System Inventory card.',
    statusNote: 'Start simple. This is supervision and trust, not a giant NOC dashboard. 2026-04-26 Foundation Inventory audit clarified that agent runtime status is not live in System Inventory yet.',
  },
  {
    id: 'AGENT-008',
    title: 'Separate agent identity from system repos and define the three-tier agent model',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 41,
    source: 'Claude audit + agent-boundary design discussion',
    summary: 'Codify the operating-model boundary: personal agents can span multiple systems for one human owner, system-dedicated agents can know one system deeply, and coding assistants like Codex and Claude Code stay implementation tools instead of pretending to be business agents. Agent identity, memory, permissions, and channel access should live outside any one project repo.',
    whyItMatters: 'The old system blurred folder docs, agent persona, and coding tools. That makes every repo feel like an agent cage and forces the same architecture debate every session. Clean boundaries are required before an agent registry, agent operations, or cross-project assistants can be trusted.',
    nextAction: 'Define the first external agent identity model (`~/.agents/<name>/` or equivalent registry), map the first examples across the three tiers, and document what belongs in repo docs versus agent identity and runtime config.',
    statusNote: 'This is an architecture-boundary card, not a prompt-writing exercise.',
  },
  {
    id: 'INFRA-003',
    title: 'Define isolated macOS deployment for browser-capable agents',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 42,
    source: 'Claude audit + Mac Mini deployment discussion',
    summary: 'When agents need real browser auth or separated credentials, deploy them with isolated macOS users and sessions instead of piling everything into one shared operator account. The deployment note should cover separate Chrome profiles, Keychains, tokens, logs, dummy-display assumptions, and how to attach for debugging without contaminating another agent session.',
    whyItMatters: 'Headless browser work breaks too often on real auth, and shared sessions blur credentials fast. The deployment boundary matters as much as the prompt boundary once real agents can browse, log in, or act on behalf of different people.',
    nextAction: 'Write the first Mac Mini deployment note: one user per browser-capable agent, session isolation, profile/token boundaries, launchd implications, dummy HDMI/display strategy, and the debug attach path.',
    statusNote: 'Do this before live browser agents, not after the first credential mess.',
  },
  {
    id: 'SYSTEM-011',
    title: 'Define a project registry for cross-project personal agents',
    team: 'foundation',
    lane: 'research',
    priority: 'P2',
    rank: 43,
    source: 'Claude audit + cross-project assistant discussion',
    summary: 'Personal agents like Harlan should know which repos, dashboards, APIs, and credential boundaries they are allowed to reach across Steve’s systems. Make that explicit in a project registry instead of leaving cross-project reachability as hidden human memory.',
    whyItMatters: 'Cross-project agents are only useful if reachability is visible and governed. Without a registry, roaming agents become either overpowered or mysteriously blind, and every new system turns into manual one-off setup.',
    nextAction: 'Define the first registry schema: system key, local path, repo URL, API base, auth mode, allowed actions, owner, and escalation boundary. Use it later as the routing layer for personal assistants that span multiple systems.',
    statusNote: 'This is the cross-project reachability map for personal agents, not a duplicate of the per-system Agent Registry.',
  },
  {
    id: 'RUNTIME-ACTIVATION-001',
    title: 'Finish the Foundation runtime activation registry',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 5,
    source: 'Runtime closeout audit + current plan drift check',
    summary: 'Make every built system show an explicit activation state, owner, schedule, health, pause switch, and manual-only reason so Foundation can answer what is running, asleep, stale, failed, paused, or retired.',
    whyItMatters: 'A script that exists but is not registered, scheduled, supervised, or intentionally manual recreates the old system problem: built work looks real but nobody knows whether it is alive. Runtime truth has to live in Foundation, not in chat memory or terminal windows.',
    nextAction: 'Extend the current job registry and source target snapshots into one activation view: manual, registered, scheduled, active, paused, failed, retired, and manual-only. Tie each active system to last run, next run, owner, stop control, failure state, and source/backlog card.',
    statusNote: 'Scoped, not active. First slice is live through job registry, job runs, runtime controls, LaunchAgents, and source target snapshots; remaining work is the complete activation-state model and decommission/manual-only coverage. Before build, require acceptance/proof, verifier coverage, and process:foundation-ship.',
  },
  {
    id: 'RUNTIME-WORKER-001',
    title: 'Harden the Foundation background worker process',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 5,
    source: 'Runtime closeout audit + current plan drift check',
    summary: 'Keep `npm run foundation:worker` as the governed routine runner and harden it until scheduled jobs are boring, visible, retryable, pausable, and safe to leave running.',
    whyItMatters: 'Foundation cannot depend on Steve watching terminal sessions. The worker must survive normal use, avoid duplicate runs, expose failures, and stop cleanly before extraction, deal review, and model-backed miners expand.',
    nextAction: 'Monitor several scheduled cycles, prove failure and retry behavior on real partial-failure jobs, keep active-run locking enforced, expose stale/failed states clearly, and only add more scheduled jobs after current lanes stay stable.',
    statusNote: 'Worker loop, DB-backed run history, active-run locking, process-group timeout cleanup, pause/resume controls, and LaunchAgent supervision are live. Failure semantics, retry policy, and alerting still need closeout.',
  },
  {
    id: 'RUNTIME-SUPERVISOR-001',
    title: 'Complete Mac Mini process supervision and dead-man visibility',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 5,
    source: 'Runtime closeout audit + current plan drift check',
    summary: 'Make the dashboard, Foundation worker, and later supervised routines visible and controllable as Mac Mini services instead of fragile one-off shell processes.',
    whyItMatters: 'A local OS can only be trusted if humans can prove what is alive, what restarted, what died, what is burning model capacity, and how to stop it. This is the line between a real Foundation runtime and a pile of useful scripts.',
    nextAction: 'Keep the served-code-equals-HEAD verifier check green, then finish LaunchAgent status, stable log paths, restart behavior, auto-restart-on-push, dead-man checks, stop/decommission controls, and cost/process warnings. Tie the remaining work to `SYSTEM-010` instead of scattering it across chats.',
    statusNote: 'Dashboard and Foundation worker LaunchAgents are live. Served-code-equals-HEAD now captures the dashboard server-start commit, shows it in Runtime Health, and makes `foundation:verify` fail with the restart command if the served dashboard commit does not match repo HEAD. Remaining work is dead-man visibility, operator runbook, decommission controls, cost/process alarms, and auto-restart-on-push.',
  },
  {
    id: 'RUNTIME-FIRST-JOBS-001',
    title: 'Activate only the first safe scheduled Foundation jobs',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 5,
    source: 'Runtime closeout audit + current plan drift check',
    summary: 'Use a small first-job set to prove scheduling instead of turning on every built routine at once: verification, shared-comms coverage, deal review, current-day sync, and bounded manual synthesis/mining.',
    whyItMatters: 'The old system drifted by adding more agents and jobs than the control plane could supervise. Foundation should earn trust with a few stable scheduled jobs, then expand only when failure, pause, and cost controls are visible.',
    nextAction: 'Monitor 2-3 clean cycles per scheduled lane, keep daily quotas deliberately small, and keep unsupported Drive content, attachments, Skool, Loom/video, and Zoom media behind explicit proof cards instead of broad scheduling.',
    statusNote: 'First scheduled set has expanded with proof: verifier, coverage, Ops review jobs, Gmail/Missive current-day, meeting current-day, Slack current-day, shared-comms extraction quota missions, and Drive inventory now run through the worker. Remaining closeout is paced monitoring plus stronger stop/decommission controls.',
  },
  {
    id: 'SKOOL-001',
    title: 'Validate Skool corpus access and extraction boundary',
    team: 'foundation',
    lane: 'research',
    priority: 'P2',
    rank: 44,
    source: 'Mark Kashef Skool access + ClaudeClaw reference review',
    summary: 'Define exactly how Skool communities, classroom modules, posts, comments, links, and embedded videos can be inventoried or extracted without violating platform policy or mixing third-party IP into BCrew-owned output.',
    whyItMatters: 'Skool may contain high-value patterns and training material, but blind crawling is blocked. Foundation must know what Steve owns, what he has permission to use, what is third-party reference only, and what cannot be extracted.',
    nextAction: 'Create the Skool access matrix: community, owner, Steve access type, content-use class, export/API/Zapier/manual path, embedded video hosts, allowed operations, blocked operations, and first proof path. Start with inventory and authorized exports only.',
    statusNote: 'Research/access-boundary card. Do not build browser scraping until the route is explicitly approved and compliant.',
  },
  {
    id: 'ACTION-ROUTER-001',
    title: 'Route synthesized intelligence into governed action ledgers',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 6,
    source: '2026-04-24 Foundation closeout checkpoint',
    summary: 'Build Action Router v1 so synthesized items stop sitting as orphaned output and become source-backed decisions, backlog tasks, open questions, contradictions, ignore/snooze records, or owner-bound actions with evidence links.',
    whyItMatters: 'Foundation is not done when it can summarize. It is done when extracted intelligence can move into the operating ledgers Steve actually uses to make decisions, assign work, resolve contradictions, and close loops.',
    nextAction: 'Keep Action Router v1 operating as the approval gate from synthesized items into decisions, backlog, open questions, ignore/snooze, and owner-bound actions. Resume Strategy Hub v2 only on top of this routed loop.',
    statusNote: 'Done v1 on 2026-04-27. Action Router creates pending, human-approval-required routes from governed synthesized items into existing operating ledgers with fact/evidence/chunk provenance, explicit owner or needs-owner queue, and no autopilot destination writes.',
  },
  {
    id: 'ACTION-REVIEW-APPLY-001',
    title: 'Make pending Action Router routes easy to review and apply',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 6,
    source: '2026-04-28 evidence read after KPI-HEALTH-001: 18 pending routes, 1 applied, 0 approved-stuck',
    summary: 'Build the first narrow human action-loop UX slice: show pending routes clearly, let Steve approve or reject with plain-English outcomes, apply approved routes with confirmation that the destination ledger row was written, and expose aged/stuck routes before they disappear into the queue.',
    whyItMatters: 'Foundation is not useful just because it finds things. The value appears when a source-backed finding becomes a real backlog card, decision, question, ignore/snooze record, or owner action that Steve can trust. With 18 pending routes and only 1 applied, the bottleneck is review cadence, not capture.',
    nextAction: 'Done for v1. Use Foundation > Backlog > Action Review to review pending routes, approve or reject them, apply approved routes, and confirm the destination record proof. Stop and re-plan with Steve before picking the next Foundation slice.',
    statusNote: 'Closed on 2026-04-28. V1 adds `/api/foundation/action-review`, `POST /api/foundation/action-review/:routeId/review`, a Backlog > Action Review panel, plain-English route cards, reject-requires-reason, approved-route apply, applied destination proof, aged/stuck route visibility, verifier coverage, and process-gate proof. Not in scope: resolution-loop recurrence hardening, broad Strategy UI expansion, Scoper, Agent Factory, retry/backoff, or another corpus lane.',
  },
  {
    id: 'VIDEO-001',
    title: 'Wrap video-link inventory in extraction target control',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 44,
    source: 'Loom / Skool / video corpus checkpoint',
    summary: 'The video/media link inventory lane has been wrapped in the extraction target runner and now preserves discovered media links before any platform-specific extractor runs.',
    whyItMatters: 'The first step was to stop asking Steve to collect links manually and give Foundation a governed manifest for Loom, Drive, YouTube, Vimeo, Wistia, Zoom, and Skool URLs.',
    nextAction: 'Do not reopen this card for extraction work. Use MULTIMODAL-EXTRACTOR-001, CREATOR-WATCHLIST-001, YOUTUBE-SCOUT-001, LOOM-001, SKOOL-001, ZOOM-RECOVERY-001, and WEB-CRAWLER-001 for the next platform-specific extraction work.',
    statusNote: 'Closed as inventory-wrapper work. Current target proof found media URLs and runs through extraction control; it does not yet transcript, watch, crawl, or deeply understand the videos.',
  },
  {
    id: 'LOOM-001',
    title: 'Validate authorized Loom extraction path',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 44,
    source: 'Loom admin access + video corpus checkpoint',
    summary: 'Prove a small authorized path for Steve-owned Loom videos, including metadata, transcript, media availability, authentication behavior, cost, error modes, and content-use class.',
    whyItMatters: 'Loom is one of the old training/video corpora. It can become high-value source evidence only after Foundation proves an authorized extractor and records provenance instead of blindly downloading private media.',
    nextAction: 'Use 3 to 5 Steve-owned Loom URLs from the video-link inventory. Test approved extraction route, record result fields, cost, failure modes, and whether transcript/metadata/MP4 URL is available. Only then add a scheduled Loom extractor bite.',
    statusNote: 'Proof card only. Bulk Loom extraction is blocked until access and extraction behavior are validated.',
  },
  {
    id: 'SOURCE-014',
    title: 'Close strategy live-input boundary for the full strategy packet',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    source: 'rebuild-plan',
    summary: 'Freedom Community, BHAG Builder, Agent Engine, and the strategy-used Owners slice are captured for current-reality strategy use. The current strategy live-input boundary is closed for this phase.',
    whyItMatters: 'The Strategy packet should show as closed once the exact live inputs behind it are signed off; future hardening should not masquerade as an unfinished source sign-off.',
    nextAction: 'Keep the closed package aligned through verifier checks. Route later work to Freedom drift monitoring, source-backed value hardening, decision provenance, temporal history, FUB/KPI source trust, and Strategy Hub cards.',
    statusNote: 'Closed on 2026-04-25 after Owners, Finance, Freedom, and Lists current-reality coverage were made explicit and verified.',
  },
  {
    id: 'SOURCE-015',
    title: 'Investigate Real Broker API as a future source-of-truth layer',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 38,
    source: 'Freedom / Real Broker follow-through',
    summary: 'Validate the Real Broker reZEN / Bolt API as more than a simple reporting feed. The old system already treated it as a candidate source for team roster, cap status, commission history, closed transactions, and downline/network data, with known endpoint patterns and an API key obtained at the time. A key strategic use case is identifying the strongest builders across the combined ownership-group network instead of treating the API as just another stats source.',
    whyItMatters: 'The rebuild should not blindly copy spreadsheet shortcuts for community revenue, cap state, commission logic, or network size if the brokerage platform itself can supply cleaner direct truth. More importantly, this source may be the cleanest path to find the top builders inside the combined Real network so Benson Crew can identify who is really driving growth, build tighter relationships with them, and create higher-value rooms like masterminds around the right people.',
    nextAction: 'On the Mac Mini, verify whether Real Broker credentials still exist and work, test the old candidate endpoints (`/api/v1/agent/{id}/cap-info`, `/api/v1/agent/{id}/commission-history`, `/api/v1/reports/{id}/transactions/closed`, `/api/v1/agents/{id}/network-size-by-tier`), then determine whether Real exposes enough structure to rank the top builders across the combined network and support future mastermind / relationship-building workflows. Map exactly which truths Real can own versus what must stay in Freedom, Owners, or ClickUp.',
    statusNote: 'Not for the middle of the current sheet pass. This is the follow-through card for building a cleaner future source-of-truth layer once validation is done.',
  },
  {
    id: 'SOURCE-016',
    title: 'Define the marketing pillar source map for Benson Crew, Steve Zahnd, and MarketMasters',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 39,
    source: 'Freedom marketing tabs + old performance system review',
    summary: 'Lock the future foundation source map for the four marketing pillars `awareness`, `engagement`, `leads`, and `remarketing` across the three lanes that matter: Benson Crew, Steve Zahnd, and MarketMasters. Use the old performance system and the current Freedom marketing tabs as reference material, not as the final source model.',
    whyItMatters: 'The old system already proved the right shape: normalized KPI storage by brand and pillar, plus explicit remarketing audience tracking. The current Freedom tabs still hold the business intent, but the rebuild source layer is missing clear contract ownership for parts of that system, especially `GA4`, `Search Console`, `Google Business Profile`, `YouTube`, and remarketing audiences. If this source map stays fuzzy, the future marketing rebuild will drift back into spreadsheet copying instead of source-owned truth.',
    nextAction: 'Use `docs/source-notes/freedom-marketing.md` plus the old performance collector to lock the live source inventory by brand lane and pillar: verify `GA4`, `Search Console`, `Google Business Profile`, `Google Ads`, `Meta`, `YouTube`, remarketing audiences, and the publishing/distribution surface. Treat `SRC-PUBLISH-001` as a real SocialPilot validation task now that the enterprise API docs and key exist, but do not mark it connected until the owner/user auth context is proven.',
    statusNote: 'This is no longer a pure theory card. The old system already proved the brand/pillar model and the current gap is connector reality: account ownership, brand-lane verification, and missing contracts. Publishing is now a concrete SocialPilot candidate, not a generic placeholder.',
  },
  {
    id: 'SOURCE-017',
    title: 'Lock KPI and FUB opportunity-hygiene rules before building sales coaches',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 42,
    source: 'KPI deep audit + founder operating truth',
    summary: 'Define one explicit Benson Crew rule model for accidental FUB-created leads, temporary `Delete Lead` cleanup, support-network vs active-lead staging, non-lead homes like `Realtors/Vendors`, `Other Contacts`, and `Trash`, true opportunity re-entry, and invalid/generic source correction so future AI coaches do not mistake dirty CRM movement for real pipeline creation.',
    whyItMatters: 'The KPI system can only coach well if it knows the difference between a new human, a bad auto-created lead, and a real new opportunity. If that semantic layer stays in Steve’s head, future assistants will overstate lead creation, understate hygiene problems, and coach from broken pipeline truth.',
    nextAction: 'Use the KPI `How To` rules, FUB stage/source model, old-system appointment / stage notes, and current founder doctrine to write the explicit opportunity-hygiene contract: when `Delete Lead` is temporary cleanup, which stages are true non-lead homes, how `Possible Supporter` differs from `Supporter/SOI`, how `Realtors/Vendors`, `Other Contacts`, and `Trash` should be treated, how re-entry should be interpreted, and how invalid sources like `Import`, `<unspecified>`, generic `Sphere`, and `SOI` should route through guided correction questions before KPI performance is praised.',
    statusNote: 'The founder-side meanings are now largely locked. The remaining work is turning that doctrine into a clean governed contract before building FUB cleanup agents, KPI coaches, or any automation that praises new-opportunity counts. Generic `Sphere` is now explicitly not final attribution; the assistant should ask for Family, Met - In Person, Met - Social Media, Referral/Introduction, or another governed source plus secondary/Ground Zero details.',
  },
  {
    id: 'SOURCE-018',
    title: 'Revalidate Google Gemini meeting notes as a foundation source contract',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 43,
    source: 'Shared communications audit + strategy-change review',
    summary: 'Treat Google Workspace meeting notes and transcripts, including the Gemini note-taker output already included in the stack, as a first-class foundation source instead of leaving them spread across memory cards and future operator ideas.',
    whyItMatters: 'Strategy, governance, and people accountability all depend on what was actually said in the room. If meeting capture stays vague, decisions, annotations, and follow-through will keep depending on founder memory and partial summaries.',
    nextAction: 'Use the now-live paginated delegated scan, transcript-gap report, and meeting-class metadata to close the meeting contract: verify the post-default forward flow on each organizer’s most recent meetings, keep widening governed extraction/apply depth, and only then decide whether older pre-2026 artifacts justify a deeper historical pull.',
    statusNote: 'Delegated meeting-note reads now scan the enabled BCrew user list with paginated Drive search, detect standalone transcript docs or embedded transcript sections, archive canonical meeting artifacts into PostgreSQL, mirror organized copies into Crewbert Drive in copy mode, and tag meetings `broadcast` vs `discussion`. Remaining work is forward-looking transcript enforcement verification, privacy/read-side controls, and deeper historical probing, not basic access.',
  },
  {
    id: 'SOURCE-019',
    title: 'Build the shared communications ingestion and synthesis layer',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 44,
    source: 'Shared communications audit + old-system operator pattern',
    summary: 'Read Missive email threads and comments, Google meeting notes, Slack messages, and related Gmail surfaces into one governed extraction layer that can synthesize what work is happening, what decisions were made, and what tasks or ClickUp updates should be proposed.',
    whyItMatters: 'The value is not just source access. The value is turning the places where the team already works into usable intelligence so Steve and Carson do not have to reread everything manually just to understand progress, decisions, and follow-through.',
    nextAction: 'Keep scheduled current-day and daily candidate extraction lanes running; add attachment/content/video extraction before claiming strategy-ready full corpus coverage.',
    statusNote: 'Shared archive is materially real across Gmail, Missive, Slack, meeting notes, meeting transcripts, Drive Docs/Sheets/PDF/text, Gmail PDF/text attachments, and YouTube subtitle transcripts. It is not complete source understanding until Missive attachments, richer attachment file types, OCR/media, rich video vision, and linked meeting videos are handled. See EMAIL-ATTACHMENTS-001, DRIVE-CONTENT-001, MEETING-VIDEO-001, and MULTIMODAL-EXTRACTOR-001.',
  },
  {
    id: 'SOURCE-020',
    title: 'Port and harden the shared communications source adapters',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 45,
    source: 'Shared communications implementation review',
    summary: 'Use the proven old readers as the starting point for the rebuild instead of inventing fresh adapters: port the richer delegated Google readers, port the Missive bridge, and revalidate Slack reads as a read-first source surface.',
    whyItMatters: 'The fastest credible path is not a blank-sheet rebuild of every connector. The old system already proved useful Gmail, Calendar, Drive-export, meeting-note, and Missive read patterns. Reusing those patterns cleanly is lower risk and gets Foundation to a usable shared-intelligence layer faster.',
    nextAction: 'Keep the now-live Google delegated stack, Missive bridge, and Slack reader stable, watch for pagination/regression issues, and harden the remaining rollout gaps before layering more automation on top.',
    statusNote: 'Adapter hardening is no longer hypothetical: Drive pagination is fixed, the meeting backfill now reaches a real multi-month archive, Slack history paginates, and the existing bot covers almost all required ops channels. Remaining adapter work is the last Slack rollout gaps plus older-archive probing, not blank-sheet connector work.',
  },
  {
    id: 'SYNTHESIS-ENGINE-001',
    title: 'Build the continuous synthesis layer on top of extraction',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 8,
    source: 'Shared-comms architecture review + founder pushback on mining without intelligence',
    summary: 'Turn the shared candidate queue into actual intelligence by continuously linking related signals, detecting what has already been resolved, deduping repeated mentions across sources, scoring staleness, and ranking what is truly actionable now.',
    whyItMatters: 'Raw extraction is not the end product. A table with thousands of task, blocker, decision, and atom candidates is just mining residue unless the system can collapse it into a small live set of what is new, unresolved, relevant, and worth attention. This is the layer that makes the archive useful for strategy, operating review, and later hub reasoning.',
    nextAction: 'Done for v1. Keep synthesis quality gates active while Strategy Hub consumes clustered, strategy/operational classified items; next hardening is route disposition, build-closeout discipline, and the Strategy Quarter source layer.',
    statusNote: 'Closed on 2026-04-27 after Steve accepted the repaired sample grain. Proof synthesis-engine-proof-20260428030545 produced 8 clustered items, 1 Strategy item, 0 single-evidence Strategy items, and a meeting-readable title: "Clarify where leads come from across Benson Crew / Steve Zahnd / MarketMasters." Action Router selector proof shows routerVisible=7/7 after first Strategy route action-route:f49fdec1289d13c01400bfa2 was generated with no operational leakage into Strategy Hub.',
  },
  {
    id: 'COMMS-BACKFILL-001',
    title: 'Make shared-comms historical backfills cursor-based and supervised',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 46,
    source: 'Late-night shared-comms checkpoint + bounded Gmail/Missive runs',
    summary: 'Turn Gmail, Missive, Slack, Drive/Meet, and Zoom historical pulls into resumable backfill jobs with explicit cursor state, oldest/newest coverage, errors, rate-limit handling, and run status instead of relying on one-off manual terminal runs.',
    whyItMatters: 'The archive is now valuable, but Steve needs to know what time window is actually covered. Bounded pulls can look complete while only reaching April 2026. Without durable cursor state, 180-day or merger-era coverage becomes tribal memory and cannot be trusted by Strategy Hub or future briefs.',
    nextAction: 'Define the first backfill-run record model and wire it into the existing scripts: Missive `until` cursor, Gmail mailbox/date-window state, Slack pagination, Drive page tokens, Zoom folder import status, per-run counts, oldest/newest artifact dates, last error, and next safe command. Keep it read/archive only until `SYSTEM-010` supervision exists.',
    statusNote: 'Scoped, not active. Current archive depth is useful but not historically complete: Gmail and Missive currently reach April 2026, Slack reaches January 2026, meeting artifacts include recovered Zoom chat context back to October 2024, and transcripts reach March 2025. Before build, require acceptance/proof for cursor state, oldest/newest coverage, verifier coverage, and process:foundation-ship.',
  },
  {
    id: 'EXTRACTION-TEAM-001',
    title: 'Build the supervised extraction team runtime',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 7,
    source: 'Founder direction on daily backfill/crawl system',
    summary: 'Build the supervised Foundation extraction team that can connect to sources, understand source shape, extract rich evidence, synthesize it into source-backed intelligence, and route it to actions without becoming the old prompt-scout swarm.',
    whyItMatters: 'Steve does not need a weak scraper. Foundation has to preserve rich context from Gmail, Missive, meetings, Drive, Zoom, Loom, YouTube, Skool, public web, and old-system reports, while keeping source rights, provenance, cost, cursor state, and failure handling visible.',
    nextAction: 'Continue from the Slack and Missive current-day item proofs: ship coverage-by-target visibility, add retry/backoff for failed source_crawl_items, and choose the next missing corpus lane only after Runtime Health makes the unhealthy/thin list clear.',
    statusNote: 'First runtime slice is live: registered jobs, DB-backed run history, CLI runner, source-crawl target ledger, dashboard visibility, Drive Docs/Sheets/PDF/text content extraction, Gmail PDF/text attachment extraction, YouTube subtitle transcript extraction, 2026-04-28 Slack current-day channel item proof, and 2026-04-28 Missive current-day conversation item proof. Missing pieces are richer multimodal extractors, richer attachment extraction, retry semantics, coverage views, and governed action routing.',
  },
  {
    id: 'DRIVE-CORPUS-001',
    title: 'Build Google Drive corpus crawler and organizer',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 46,
    source: 'Founder direction on old Drive/shared-drive mining',
    summary: 'Create a governed crawler for old Google Drive and shared-drive folders that inventories folders/files, detects useful docs/media/links, mirrors or organizes approved artifacts into the Crewbert archive, and extracts candidates/atoms one folder at a time.',
    whyItMatters: 'Benson Crew and Zahnd Team have years of value buried across old shared drives: trainings, strategy docs, sales assets, marketing angles, videos, and course material. Trying to mine all of it manually blocks product work; ignoring it wastes the company’s historical IP.',
    nextAction: 'Define the Drive crawl state model: root folder, folder cursor, file type, owner/account, inspected_at, action taken, archive/mirror destination, extraction status, skip reason, error, and next folder. Start read-only/inventory-first, then allow copy-to-archive organization after Steve approves the folder strategy.',
    statusNote: 'Source contract seed is `SRC-GDRIVE-001`. Do not ACL-strip originals in this phase; copy/mirror and classify first.',
  },
  {
    id: 'EXTRACT-CONTROL-001',
    title: 'Finish the source extraction control plane',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 7,
    source: 'Deep intelligence audit + current plan drift check',
    summary: 'Own source crawl targets, crawl items, leases, cursors, budgets, worker state, partial failures, and source-specific run boundaries from one Foundation control plane.',
    whyItMatters: 'Extraction is not a single research run. Gmail, Missive, meetings, Drive, Skool, YouTube, Loom, Zoom, and web sources all need resumable, observable, source-bound control or the system will lose coverage truth immediately.',
    nextAction: 'Closed for v1. Keep Runtime Health coverage-by-target current as new lanes are added. Failed-item retry/backoff stays in EXTRACT-RETRY-001, surface breadcrumb/update polish stays in FOUNDATION-SURFACE-UPDATES-001, and later extraction-control hardening should become child cards instead of reopening this umbrella.',
    statusNote: 'Closed on 2026-04-28 after EXTRACT-METRICS-001 shipped the Runtime Health coverage-by-target panel. Source crawl targets/items now support scheduled current-day sync, Drive inventory, video-link inventory, daily shared-comms extraction missions, Slack channel item proof, Missive conversation item proof, item summaries/findings, Foundation-job schedule truth, and per-target coverage metrics for last success, last failure, next bite, item totals, failed/skipped reasons, and remaining backlog indicators where available. Closeout proof: `npm run foundation:verify` on localhost:3000 after dashboard restart.',
  },
  {
    id: 'EXTRACT-CURRENT-001',
    title: 'Build the current-day source sync lane',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 7,
    source: 'Deep intelligence audit + current plan drift check',
    summary: 'Keep the last 24 to 48 hours of priority sources fresh without waiting for historical backfills.',
    whyItMatters: 'Steve should not lose today while the system crawls history. A current-day lane lets Foundation stay fresh, extract new decisions and blockers, and keep hubs useful even while old data is being mined slowly.',
    nextAction: 'Monitor scheduled Gmail/Missive/meeting/Slack current-day runs, prove alert behavior on real partial failures, then raise quotas only after the lanes stay stable.',
    statusNote: 'Scoped, not active. Current-day sync exists for Gmail/Missive plus daily meeting/Slack runs; Drive, Skool, YouTube, Loom, Zoom, and web remain corpus/history lanes. Before build, require acceptance/proof for alert behavior, quota changes, verifier coverage, and process:foundation-ship.',
  },
  {
    id: 'EXTRACT-BACKFILL-001',
    title: 'Build the bounded historical backfill lane',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 7,
    source: 'Deep intelligence audit + current plan drift check',
    summary: 'Replace giant manual archive crawls with bounded historical bites that record cursor, inspected range, budget, failures, and what remains.',
    whyItMatters: 'Historical Drive, Gmail, meetings, Missive, Slack, Zoom, Skool, and video archives contain real IP, but open-ended backfills create slow chats, stale claims, and unknown coverage. The system needs to crawl history in visible, restartable chunks.',
    nextAction: 'Define the durable backfill contract for each source: fixed bite size, oldest/newest coverage, cursor state, stop condition, per-item failures, retry state, output artifacts, and next safe command. Promote current daily quota missions into that contract instead of relying on job success alone.',
    statusNote: 'Scoped, not active. Daily quota missions exist for Gmail, Missive, meeting transcript, Slack extraction, and Drive inventory; historical completeness is unproven until coverage windows, remaining backlog, and resumable cursors are recorded. Before build, require acceptance/proof, verifier coverage, and process:foundation-ship.',
  },
  {
    id: 'EXTRACT-RETIRE-001',
    title: 'Auto-retire empty history and corpus missions',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 46,
    source: 'Claude review of daily quota source missions',
    summary: 'Daily history and corpus missions should stop or pause themselves when their remaining backlog is zero instead of firing forever as successful zero-work jobs.',
    whyItMatters: 'Scheduled extraction should prove completion. If empty queues keep running forever, operators cannot tell the difference between caught-up history and a job that is quietly wasting scheduler/model capacity.',
    nextAction: 'Add per-mission remaining-backlog accounting and completion rules. When a history mission sees zero eligible items for a configured number of clean runs, mark the target/job complete or paused with a clear reason; keep current-day lanes scheduled.',
    statusNote: 'Not built. Current daily history missions can run zero-work successfully, but they do not auto-retire when the queue is empty.',
  },
  {
    id: 'DRIVE-WORKER-001',
    title: 'Build the Google Drive inventory and extraction worker',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 46,
    source: 'Deep intelligence audit + current plan drift check',
    summary: 'Turn the Drive corpus proof into a governed worker that inventories folders/files, fingerprints duplicates, classifies high-value artifacts, and extracts approved content one folder at a time.',
    whyItMatters: 'The old Drive/shared-drive corpus has training, presentations, sales assets, product ideas, operating doctrine, and content IP. Leaving it as manual browsing wastes value; crawling it without governance risks chaos and accidental moves.',
    nextAction: 'Keep daily Drive inventory/content extraction running. Continue link-following for strategy docs, add Slides/Office/shortcut target workers, and move rich handwriting, screenshots, and Drive/video media into the governed multimodal lane.',
    statusNote: 'Read-only inventory and content extraction slices are live. Drive Docs/Sheets/PDF/text/markdown extraction, linked-doc inventory, and rough OCR fallback have proven against the strategy folder, John agenda/binder, Q2 pre-strat PDFs, Scott handwritten scan, Steve draft, and five previously skipped Google Sheets. The umbrella still depends on file-type workers and MEETING-VIDEO-001/MULTIMODAL-EXTRACTOR-001 for rich media and high-confidence handwriting.',
  },
  {
    id: 'DRIVE-CONTENT-001',
    title: 'Build Drive Docs and PDF content extraction v1',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 7,
    source: '2026-04-26 Drive content extraction proof',
    summary: 'Drive access, inventory, linked-doc discovery, and content extraction are live. Google Docs are exported as text; PDFs, scanned PDFs with OCR fallback, plain-text, and markdown Drive blobs are downloaded and parsed into normalized source artifacts. Unsupported Drive file types remain explicit follow-on lanes.',
    whyItMatters: 'Steve needs the AI OS to read what is inside Drive, not only know file names. Strategy prep, training material, SOPs, recruiting proof, and course/content reuse will miss major evidence until readable Drive content is archived with provenance.',
    nextAction: 'Monitor the scheduled drive-content-extract-bite target, keep strategy folders prioritized, continue agenda/link inventory, finish John-linked access after approvals arrive, and add next file-type extractors: Slides, Office conversion, shortcut target resolution, vision-grade handwriting/screenshots, and media routing into MULTIMODAL-EXTRACTOR-001.',
    statusNote: 'V1 shipped and proved: 40 Drive Docs/PDF/text artifacts / 713,744 chars archived, including John KT Binder MAR 2026.pdf, John Q1 agenda plus accessible linked docs, Team Prestrat Template, Q2 pre-strat PDFs, PDF form fields from fillable pre-strat docs, Carson/Steve notes, Steve Q2 draft markdown, Scott handwritten scan via manual visual review, and the Q1 vision/core-values doc. 2026-04-28 follow-up added Google Sheets text extraction through Sheets API values; proof run crawl-drive-content-extract-backfill-20260428181558392-93bfbd63 inspected 5 existing sheet-skipped items, archived 5 drive_spreadsheet artifacts / 308,697 chars, and recorded 0 crawl item failures. John-linked access gaps are recorded; Steve manually requested the remaining access. The Strategy Folder is documented as quarterly evidence intake; remaining skips are explicit and file-type/access based.',
  },
  {
    id: 'EMAIL-ATTACHMENTS-001',
    title: 'Archive and extract Gmail and Missive attachments',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 7,
    source: '2026-04-26 source automation review',
    summary: 'Gmail PDF/text attachment extraction v1 is live and scheduled. Missive attachments plus richer Gmail attachment classes still need their own manifest/download proof, mime-type handling, extraction status, and provenance.',
    whyItMatters: 'A large share of real business context can live in attached PDFs, docs, images, spreadsheets, contracts, and decks. If the system reads only the email body, it may miss the actual source evidence needed for strategy, Ops, finance, recruiting, and client-experience decisions.',
    nextAction: 'Monitor `email-attachment-extract-bite`, then add Missive attachment extraction and richer attachment classes: Office conversion, spreadsheets/slides, OCR/scanned PDFs, images, audio, and video through the multimodal extractor contract.',
    statusNote: 'Scoped, not active. First Gmail attachment slice shipped and proof exists, but Missive and multimodal attachment handling remain open; current daily email sync is not full email understanding. Before build, require acceptance/proof for one bounded attachment lane, verifier coverage, and process:foundation-ship.',
  },
  {
    id: 'MEETING-VIDEO-001',
    title: 'Review videos and recordings linked from meeting notes',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 7,
    source: '2026-04-26 source automation review',
    summary: 'Meeting notes and transcript text are archived, and video-link inventory can find video/recording URLs. The system does not yet watch/review meeting recordings or videos linked inside notes; those links are only manifest items awaiting platform-specific extraction.',
    whyItMatters: 'Gemini notes and transcripts capture a lot, but important context can live in recordings, embedded videos, Looms, Drive videos, Zoom recordings, or YouTube links. If those are not reviewed, strategy extraction can miss demos, training, nuance, and visual evidence.',
    nextAction: 'Use the shared video-content queue to prioritize meeting-linked Drive/Zoom/Loom/YouTube videos, classify access and rights, prefer existing transcripts where available, and add the next platform extractor proof behind explicit quota, ledger, and stop controls. Do not confuse transcript-only extraction with GOD-mode meeting/video review.',
    statusNote: 'First shared-video slice shipped: YouTube subtitle extraction from the video manifest produced 13 video_transcript artifacts / 261,853 chars after worker and manual Mycro follow-up. No-subtitle videos route into the future vision/transcription lane. Meeting-specific rich video review still needs Drive/Zoom/Loom/meeting-link prioritization under the same queue.',
  },
  {
    id: 'SKOOL-WORKER-001',
    title: 'Build the Skool source contract and crawler worker',
    team: 'foundation',
    lane: 'research',
    priority: 'P0',
    rank: 46,
    source: 'Deep intelligence audit + current plan drift check',
    summary: 'Treat Skool as governed paid/private source material with explicit access, content-use, redaction, and allowed-operation boundaries before any crawler processes communities, courses, lessons, posts, comments, links, or media.',
    whyItMatters: 'Skool may contain high-value training and community intelligence, but blind scraping would create policy, copyright, and product risk. Foundation needs an access-approved worker that extracts value without redistributing private material as raw content.',
    nextAction: 'Finish the access-path audit, classify each community/course as allowed, manual-export-only, link-inventory-only, blocked, or needs-permission, then prove one authorized module before broad crawl behavior exists.',
    statusNote: 'Blocked from blind scraping. This card exists so the Skool crawler is captured but cannot silently start before the source contract and permissions are clear.',
  },
  {
    id: 'EXTRACT-RETRY-001',
    title: 'Add failed-item retry and partial-run alert handling for corpus crawls',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 46,
    source: 'Codex runtime review after Gmail/Missive scheduling',
    summary: 'Make failed source-crawl items retryable and visible across meeting, Drive, Skool, video, attachment, and other high-variance crawlers without rerunning whole target windows blindly.',
    whyItMatters: 'Meeting notes, Drive files, Skool lessons, PDFs, and videos can partially fail while the overall command succeeds. If partials look green, the dashboard lies and the crawler silently skips valuable or broken items.',
    nextAction: 'Add failed-item retry/backoff: target-specific retry queues, attempt caps, reason filters, dashboard alert state, and a proof run where failed `source_crawl_items` are retried without killing unrelated work or rerunning the full target window.',
    statusNote: 'Refreshed 2026-04-28 after Slack item-proof work. Partial target runs now exit nonzero and Runtime Health shows failed/skipped item summaries; remaining work is retry/backoff execution, alerting, and source-specific retry behavior beyond the first meeting retry no-op.',
  },
  {
    id: 'EXTRACT-SCHEDULE-001',
    title: 'Consolidate Foundation job and source-crawl target schedule truth',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 46,
    source: 'Codex runtime review after Gmail/Missive scheduling',
    summary: 'Unify or clearly derive `nextRunAt` between Foundation job scheduling and source crawl targets so operators do not see two different schedule truths.',
    whyItMatters: 'Gmail is aligned now, but Missive target next-run can stay null until the target is updated by a run while the job registry already knows the next run. That is fine during MVP, but not safe once operators rely on target panels.',
    nextAction: 'Closed for the schedule-display slice. Keep using Foundation job runtime as visible schedule truth for scheduled targets; use `crawlCheckpointNextRunAt` only as runner checkpoint metadata.',
    statusNote: 'Closed on 2026-04-28 under EXTRACT-CONTROL-001 schedule reconciliation. Runtime Health now displays Foundation job schedule as the visible next run for scheduled crawl targets, preserves target next_run_at as `crawlCheckpointNextRunAt`, and verifier coverage prevents `job_target_schedule_mismatch` findings from returning.',
  },
  {
    id: 'EXTRACT-METRICS-001',
    title: 'Build extraction coverage-by-target metrics',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 46,
    source: 'Runtime Health lane-shape inspection after EXTRACT-SCHEDULE-001',
    summary: 'Build a coverage-by-target extraction view that shows last success, last failure, next bite, item totals, succeeded/skipped/failed counts, top reasons, and remaining backlog indicators where each lane exposes them.',
    whyItMatters: 'Operators need a per-target readout of what actually ran, what was skipped or failed, and where coverage is thin. Without that view, extraction confidence still depends on chat memory and raw database rows.',
    nextAction: 'Closed for v1. Use the Runtime Health coverage panel to choose the next evidence-based extraction slice. Failed-item retry execution remains parked in EXTRACT-RETRY-001; broad Drive/email/video expansion remains out of scope until the panel shows that lane as the next best slice.',
    statusNote: 'Closed on 2026-04-28. Lane inspection found Slack, Gmail, meetings, Drive corpus/content, attachments, video, and Missive current-day lanes already emitted source_crawl_items after Missive needed normalization; Missive now writes missive_conversation items. Runtime Health now exposes the coverage-by-target panel with last success, last failure, next bite, item totals, top failed/skipped reasons, and remaining backlog indicators where available. Closeout proof: `npm run foundation:verify` on localhost:3000 after dashboard restart.',
  },
  {
    id: 'WEB-CRAWLER-001',
    title: 'Define compliant web and video crawler boundaries',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 46,
    source: 'Founder direction on Skool, YouTube, Loom, and web crawling',
    summary: 'Define the Foundation crawler strategy for public web, YouTube, Loom, Vimeo, Wistia, Skool-linked assets, paid/community sources, and creator websites using platform-specific allowed operations and content-use boundaries.',
    whyItMatters: 'A human-like extraction system needs to browse and understand pages, but it also needs rules. Official APIs, authorized exports, browser automation, screenshots, transcripts, and downloads have different cost, policy, and trust profiles.',
    nextAction: 'Create the platform matrix: access method, allowed operation, blocked operation, transcript/export path, screenshot/frame policy, owner/content-use class, storage target, cadence, dedupe key, value routes, and fallback extractor. Start with public web and YouTube official/permitted paths.',
    statusNote: 'Boundary card. Pairs with multimodal extractor, YouTube scout, Loom, Skool, Drive, and hub routing cards.',
  },
  {
    id: 'WEB-GODMODE-001',
    title: 'Build governed website GOD-mode extraction worker',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 47,
    source: 'Steve Mycro / GOD-mode extractor correction',
    summary: 'Build a browser-capable extraction worker for authorized websites and web apps that can navigate like a human: log in through approved sessions, move through pages/courses, read text, watch videos, capture page structure/screenshots, detect workflows/tools shown, and file source evidence into the same artifact/atom pipeline as video extraction.',
    whyItMatters: 'Many high-value trainings and systems are not just files or captions. They live behind websites, course portals, dashboards, demos, and pages where the meaning comes from what is visible and how the workflow is structured. If AIOS cannot inspect those governed pages with visual context and progress through lessons, Steve has to manually retell the process layer he is paying to learn and wants to teach agents.',
    nextAction: 'Start with one governed proof on an allowed/public or Steve-authorized page/app: preflight the intended browser account/profile, load the page, navigate one small workflow, capture readable text, DOM outline, screenshots, links/media references, workflow observations, permissions/use class, cost/runtime metadata, and a source-backed summary. Then connect the worker to WEB-CRAWLER-001 boundaries and MULTIMODAL-EXTRACTOR-001 atoms.',
    statusNote: 'Not built. Browser Use exists in the coding session, but AIOS does not yet have a governed website/browser extraction worker. 2026-04-26 access-request test proved the local browser profile was Steve, not ai@, so native request-access automation needs account/session preflight before it can be trusted. This is separate from YouTube subtitle extraction and must not be claimed done until artifacts/atoms land in Foundation.',
  },
  {
    id: 'MYICRO-TRAINING-001',
    title: 'Validate Mycro paid-training app extraction lane',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 48,
    source: 'Steve paid Mycro/myICOR training access',
    summary: 'Create the governed source lane for Steve-authorized Mycro training access: log into the app, navigate course-to-course/lesson-to-lesson, inventory courses/lessons/resources, review videos and screenshots/folder structures, extract process-management and AI-team operating doctrine, and route useful patterns into AIOS architecture/backlog/atoms.',
    whyItMatters: 'Steve pays for this training because the operator behind it has unusually strong AI-team/process-management experience. The value is not just spoken transcript text; it is the demonstrated folder structures, images, course resources, project-management workflow, and agent-team operating model. If AIOS cannot study this app with governed visual/context extraction and lesson navigation, Steve has to manually retell the lessons.',
    nextAction: 'Create `SRC-MYICRO-001` as a source contract after access proof. First proof: use a Steve-authorized login/session, map the course structure, move through one lesson path, extract one lesson with text, screenshots, video transcript/visual notes, resource links, and BCrew applicability. Record content-use boundaries: internal learning/process improvement only unless Steve confirms broader rights.',
    statusNote: 'Not built. The public Mycro YouTube subtitle proof exists, but logged-in paid app extraction does not. This card depends on WEB-GODMODE-001, MULTIMODAL-EXTRACTOR-001, WEB-CRAWLER-001, and the future atom/retrieval spine.',
  },
  {
    id: 'RESEARCH-INBOX-001',
    title: 'Create a pre-backlog research inbox for external ideas',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 48,
    source: '2026-04-28 Steve framing: pre-backlog backlog for YouTube, Mycro/myICOR, courses, articles, and AI-system ideas',
    summary: 'Create a staging surface for useful outside material before it becomes committed backlog work. External content, training, videos, articles, courses, and Steve ideas should land in a research inbox, get discussed in plain English, then either promote into backlog with acceptance criteria or archive with the reason.',
    whyItMatters: 'Steve is still the dev head for now, but valuable ideas from YouTube, Mycro/myICOR, courses, and AI-system builders can disappear if they live only in chat or his head. A pre-backlog lane lets AIOS learn from outside ideas without turning every idea into committed build work.',
    nextAction: 'Define the v1 intake model: source link or file, source type, why Steve cared, plain-English takeaway, system fit, related cards, recommendation, promote/archive decision, owner, and evidence links. Connect later to WEB-GODMODE-001, MULTIMODAL-EXTRACTOR-001, CREATOR-WATCHLIST-001, and MYICRO-TRAINING-001 when ingestion plumbing is ready.',
    statusNote: 'Captured as scoped P1, not next. This is the idea triage layer before backlog, not a crawler and not an agent-managed backlog. Build after the action-loop Review/Apply slice and after Steve decides whether Foundation is good enough to un-pause Scoper/dev-intelligence work.',
  },
  {
    id: 'SYNTHESIS-FACTS-001',
    title: 'Ground synthesis in source-backed KPI, finance, strategy, and operating facts',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 9,
    source: 'Founder clarification on atoms versus decision-grade strategy intelligence',
    summary: 'Feed synthesis with governed source facts from strategy, KPI, finance, Owners, FUB, marketing, and source contracts so strategy packets rank issues against the business reality instead of only summarizing comms candidates.',
    whyItMatters: 'Atoms from meetings and emails are not enough for ownership decisions. Strategy work needs concise facts: KPI breaks, cash/finance exceptions, source-trust gaps, deal/lead-source truth, and signed-off strategy priorities. Those should stay source-backed and traceable, not become loose atom spam.',
    nextAction: 'Keep SYNTHESIS-FACTS-001 closed and stable as the source-backed fact ledger for synthesis and Strategy Hub v2. Next work is Strategy Hub v2 source-to-gap plus route review/promote on top of facts, synthesized items, and action routes; no advisor chat or recommendation surface.',
    statusNote: 'Done v1 on 2026-04-27. Source-backed synthesis fact ledger persists strategy/source-contract, goal, operating, KPI, source-snapshot, source-health, and retrieved-evidence facts with maxTier, stable natural keys, stale-run archival, and source-overlap filtering.',
  },
  {
    id: 'INTEL-JOBS-001',
    title: 'Add intelligence job ledger for extraction and memory work',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 9,
    source: '2026-04-24 deep intelligence audit + 2026-04-25 backlog hygiene',
    summary: 'Create one DB-backed ledger for ingestion, extraction, chunking, embedding, synthesis, YouTube discovery, video analysis, and brief generation jobs.',
    whyItMatters: 'Without a job ledger, coverage keeps living in chat memory. Steve needs to see what ran, what source it touched, what it cost, where the cursor is, what failed, and what can safely run next.',
    nextAction: 'Use the live ledger as the provenance base for INTEL-ATOM-001, retrieval, synthesis, and Action Router. Do not rebuild this card unless verifier or runtime evidence shows governed extraction writers stopped recording ledger rows.',
    statusNote: 'Done and hardened on 2026-04-27. intelligence_job_runs and intelligence_job_llm_calls are live; proof and governed extraction targets write source_id, job_type, cursor, budget, provider/auth path, item counts, output artifacts, next state, and caller provenance. foundation:verify guards the schema and governed extraction writer.',
  },
  {
    id: 'INTEL-ATOM-001',
    title: 'Define the source-backed intelligence atom schema',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 11,
    source: 'Steve Connect/Understand/Extract/Synthesize correction + old-system Director/Scoper/Gold Library salvage gate',
    summary: 'Define the common output contract for extracted value and report-derived intelligence: observations, claims, patterns, demonstrated workflows, decisions, risks, corrections, content ideas, action candidates, and governed report/brief artifacts, all linked to source evidence.',
    whyItMatters: 'Reports alone are too coarse and raw transcripts are too noisy. Foundation needs small, rich, source-backed atoms that can be searched, synthesized, routed, accepted, rejected, superseded, and reused by hubs. The old marketing Gold Library proved atoms are only valuable when Scopers can query them directly and reuse high-quality hits instead of relying on diluted Director summaries.',
    nextAction: 'Keep INTEL-ATOM-001 closed and stable as the report/atom/hit substrate for the completed spine. Next work is Strategy Hub v2 source-to-gap plus route review/promote on top of facts, synthesized items, and action routes; no advisor chat or recommendation surface.',
    statusNote: 'Done v1 on 2026-04-27. INTEL-ATOM-001 now has DB-backed intelligence_report_artifacts, intelligence_atoms, intelligence_atom_hits, direct Scoper query fields/helpers, Foundation snapshot exposure, and a repeatable proof command.',
  },
  {
    id: 'RETRIEVAL-001',
    title: 'Build chunk-level lexical search over archived artifacts',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 12,
    source: '2026-04-24 deep intelligence audit',
    summary: 'Add chunk tables and Postgres full-text lexical search over real shared-communications candidates/artifacts promoted into atoms before relying on vector search.',
    whyItMatters: 'Exact names, tools, source IDs, deal IDs, people, and platform terms matter. Vector-only memory will miss important exact-match evidence and make the system feel fuzzy.',
    nextAction: 'Keep RETRIEVAL-001 closed and stable as lexical retrieval over candidate-backed atom chunks. Next work is Strategy Hub v2 source-to-gap plus route review/promote on top of facts, synthesized items, and action routes; run retrieval eval before major retrieval/synthesis changes.',
    statusNote: 'Done v1 on 2026-04-27. RETRIEVAL-001 now promotes real shared_communication_candidates into intelligence_atoms, stores candidate-backed chunks in intelligence_retrieval_chunks, and proves lexical search with explicit maxTier enforcement.',
  },
  {
    id: 'RETRIEVAL-002',
    title: 'Install pgvector and add semantic retrieval',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 13,
    source: '2026-04-24 deep intelligence audit + current pgvector research',
    summary: 'Enable pgvector in Postgres and add 1536-dimension embeddings for the candidate-backed intelligence_retrieval_chunks corpus.',
    whyItMatters: 'Postgres is old because it is battle-tested. pgvector lets the system keep vectors beside source truth, joins, permissions, and provenance instead of splitting memory across another database too early.',
    nextAction: 'Keep RETRIEVAL-002 closed and stable as semantic retrieval over candidate-backed chunks. Next work is Strategy Hub v2 source-to-gap plus route review/promote on top of facts, synthesized items, and action routes; run retrieval eval before major retrieval/synthesis changes.',
    statusNote: 'Done v1 on 2026-04-27. pgvector is installed, candidate-backed chunks have 1536-dimension OpenAI embeddings, semantic search requires explicit maxTier, and proof runs over the real RETRIEVAL-001 corpus.',
  },
  {
    id: 'RETRIEVAL-003',
    title: 'Build hybrid retrieval and evidence API',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 14,
    source: '2026-04-24 deep intelligence audit',
    summary: 'Combine lexical search, semantic vector search, direct atom search, source filters, and sensitivity/tier rules into one evidence API for synthesis and future chat recall.',
    whyItMatters: 'The assistant should not depend on giant chat context. It should retrieve the right evidence from the system and show exactly where it came from.',
    nextAction: 'Keep RETRIEVAL-003 closed and stable as the governed hybrid evidence API. Next work is Strategy Hub v2 source-to-gap plus route review/promote on top of facts, synthesized items, and action routes; run retrieval eval before major retrieval/synthesis changes.',
    statusNote: 'Done v1 on 2026-04-27. Hybrid evidence search fuses lexical, semantic, and atom matches with explicit maxTier and source-backed result payloads. Retrieval eval baseline now guards 20 expected matches across Gmail, Meetings, and Missive.',
  },
  {
    id: 'MULTIMODAL-EXTRACTOR-001',
    title: 'Build the GOD-mode multimodal extraction worker contract',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 43,
    source: 'Steve extraction-team correction',
    summary: 'Create the common extractor contract for sources that require human-like understanding: Zoom recordings, Loom videos, YouTube videos, Skool lessons, web pages, screenshots, transcripts, slides, and demos.',
    whyItMatters: 'The old extractor was too shallow. The new system needs to understand what is said, shown, clicked, demonstrated, and implied, then turn it into valuable atoms with timestamps, screenshots/visual notes where allowed, and source links.',
    nextAction: 'Extend the v1 transcript/OCR lanes into the GOD-mode contract: channel/video metadata, transcript/audio acquisition, timestamp/page anchoring, screenshot/keyframe policy, handwriting/screenshot reading, visual tool/workflow detection, screenshare/demo steps, model route, cost budget, rights/use boundary, quality score, skip reasons, and failure handling.',
    statusNote: 'Scoped, not active. First small worker proof is live through DataForSEO subtitles, shared video queue, rough OCR fallback, and manual visual review; rich multimodal lanes remain open. Before build, require acceptance/proof for one bounded extractor contract slice, verifier coverage, and process:foundation-ship.',
  },
  {
    id: 'CREATOR-WATCHLIST-001',
    title: 'Create normalized creator and source watchlist',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 44,
    source: 'Old external scout registry + Steve latest-video requirement',
    summary: 'Recover and normalize Steve’s creator/channel list from old BCrew-Buddy, chat handoffs, and source notes into one watchlist for YouTube, blogs, Skool, X, LinkedIn, newsletters, and websites.',
    whyItMatters: 'The system cannot stay current if the creator list lives in old chat memory or old skill files. Watchlist truth needs IDs, priority, source category, access boundary, cadence, and why each creator matters.',
    nextAction: 'Seed from the old external scout channel registry and the 2026-04-24 audit list. Add creator_id, display name, priority, source category, YouTube channel ID/URL, blog/Skool/social URLs, access boundary, cadence, notes, and active flag.',
    statusNote: 'Backlogged now; build after retrieval/job-ledger foundation, before YouTube scout scale-up.',
  },
  {
    id: 'YOUTUBE-SCOUT-001',
    title: 'Build YouTube discovery and Gemini video intelligence MVP',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 45,
    source: '2026-04-24 deep intelligence audit + current Gemini/YouTube docs',
    summary: 'Build the first current external intelligence loop: discover uploads with official YouTube routes, analyze selected public videos with Gemini video understanding, and store derived timestamped intelligence atoms.',
    whyItMatters: 'This is how AIOS stays current on what strong builders and operators are teaching without Steve manually feeding every video. It must understand both transcript and what is visually demonstrated.',
    nextAction: 'Route channel/profile links to `CREATOR-WATCHLIST-001`, then start with 5 creators and 3 latest videos each. Store metadata, transcript/vision evidence, thesis, tools shown, workflows, prompts/screens, architecture patterns, claims to verify, BCrew applications, adopt/adapt/ignore recommendation, timestamps, and source confidence.',
    statusNote: 'Scoped, not active. First YouTube subtitle lane is live from manifest URLs; discovery, creator watchlists, comments, channel cadence, and Gemini/video-vision understanding remain open. Before build, require acceptance/proof for a bounded watchlist/video slice, verifier coverage, and process:foundation-ship. Do not start with 200 videos.',
  },
  {
    id: 'ZOOM-RECOVERY-001',
    title: 'Validate historical Zoom recording recovery and extraction',
    team: 'foundation',
    lane: 'research',
    priority: 'P2',
    rank: 46,
    source: 'Historical Zoom recovery source target',
    summary: 'Define how old Zoom recordings and transcripts should be recovered, transcribed if needed, classified, and converted into source-backed atoms without flooding the system.',
    whyItMatters: 'Old meetings and trainings likely contain valuable decisions, coaching, and operating doctrine. They should be mined in bounded bites, not dumped into the system blindly.',
    nextAction: 'Pick one small historical Zoom batch, confirm access path, transcript/audio availability, content-use class, privacy/sensitivity, extraction cost, and output quality. Then decide whether to promote zoom-audio-recovery-backfill from paused to planned.',
    statusNote: 'Backlogged because the source target exists but was only paused metadata, not a clear work card.',
  },
  {
    id: 'PLATFORM-INTEL-001',
    title: 'Define the cross-platform intelligence layer for publishing hubs',
    team: 'foundation',
    lane: 'research',
    priority: 'P2',
    rank: 47,
    source: 'Founder authority build + multi-hub content architecture',
    summary: 'Define one Foundation layer for platform-specific publishing intelligence so future hubs do not each reinvent what YouTube, Instagram, TikTok, X, LinkedIn, Skool, SEO, AEO, and Meta currently reward.',
    whyItMatters: 'Publishing hubs will need current format rules, cadence patterns, algorithm changes, and performance lessons. If every hub rediscovers that separately, the system will duplicate work and drift.',
    nextAction: 'Define the minimum source map and storage model for platform intelligence: platform announcements, trusted external trackers, internal post-performance reads, and the normalized facts each publishing hub should be able to consume.',
    statusNote: 'Do not block Sunday strategy prep or current shared-comms work on this. Queue it now so the publishing layer has a real Foundation home later.',
  },
  {
    id: 'HUB-INTEL-001',
    title: 'Define hub value routing for mined intelligence and content assets',
    team: 'marketing',
    lane: 'research',
    priority: 'P1',
    rank: 47,
    source: 'Founder extraction-to-money-and-strategy direction',
    summary: 'Define how Foundation extraction routes mined material to the right consumer hub: strategy, ops, sales leadership, marketing, recruiting, agent coaching, Benson Crew residential, Zahnd Team Ag, Steve Zahnd personal brand, MarketMasters, and Steve-owned education/monetization assets.',
    whyItMatters: 'Extraction only becomes nuclear power if the system knows who can use each signal. The same Drive file, meeting, Skool lesson, or email thread may be useful for a course, a YouTube script, an SOP, an agent coaching prompt, a recruiting proof point, or a strategy decision. Without routing, the archive becomes a pile.',
    nextAction: 'Define the first `value_route` taxonomy and hub handoff model: allowed hubs, owner entity, privacy/sensitivity class, evidence link, suggested output type, approval boundary, and whether the asset is safe for Benson Crew client-facing content, Steve personal brand, MarketMasters, Zahnd Team Ag, or Steve-owned education products.',
    statusNote: 'Foundation classifies and routes. Hubs act. Do not build content automation before this boundary exists.',
  },
  {
    id: 'CRM-OWNERSHIP-001',
    title: 'Define owner-entity tagging before multi-tenant CRM work',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 48,
    source: 'Founder portability rule + future recruiting CRM design',
    summary: 'Define the owner-entity field and export boundary before the future BCrew AI OS CRM and tenant model land so Steve-owned, BCrew-owned, Real-owned, and shared records do not get mixed by accident.',
    whyItMatters: 'Once CRM records, hub data, and future recruiting flows start writing into one system, retrofitting ownership semantics will be painful. The portability boundary needs to exist before multi-tenant writes become real.',
    nextAction: 'Lock the first owner-entity schema and read/write rules for `steve_personal`, `bcrew_llc`, `real_broker`, `unchained_realtor`, and `shared`, then attach that model to the future multi-tenancy and recruiting-CRM work instead of bolting it on later.',
    statusNote: 'Architectural card only for now. Do not let this sprawl into building the recruiting CRM before the Foundation core and Sunday strategy work are closed.',
  },
  {
    id: 'CRM-RECRUIT-001',
    title: 'Build Steve personal recruiting CRM inside AI OS later',
    team: 'foundation',
    lane: 'research',
    priority: 'P2',
    rank: 48,
    source: 'Unchained Realtor capture-forward discussion + founder CRM boundary',
    summary: 'Future recruiting CRM should live inside BCrew AI OS as Steve’s personal/recruiting lane, not as a separate Unchained Realtor CRM. External funnels should capture and forward leads into one governed people system.',
    whyItMatters: 'Steve does not want to manage two CRMs. Recruiting leads, course/community leads, and team-candidate relationships need one source of truth with owner-entity tagging so Steve-owned records remain portable and BCrew-owned records remain clear.',
    nextAction: 'After Foundation, multi-tenancy, and owner-entity rules are stable, define the first recruiting CRM schema: candidate, source/funnel, relationship state, follow-up cadence, conversation history, ownership entity, export boundary, and how it reads shared intelligence without exposing private team commentary.',
    statusNote: 'Future build only. Do not let this interrupt current shared-comms, synthesis, source-trust, or strategy-foundation work.',
  },
  {
    id: 'CRM-LEGACY-001',
    title: 'Archive and review legacy Houseable CRM code if it becomes available',
    team: 'foundation',
    lane: 'research',
    priority: 'P2',
    rank: 48,
    source: 'Founder note about prior million-dollar CRM build',
    summary: 'If Steve gets the old Houseable/legacy CRM code into Git, archive it as reference material and mine it for useful schema, workflow, and CRM-domain lessons without importing the old runtime blindly.',
    whyItMatters: 'The old CRM may contain paid-for domain knowledge that can reduce future rebuild mistakes, but copying old code into the new OS without review would recreate legacy complexity. It should be preserved as reference, not treated as the target architecture.',
    nextAction: 'When the repo arrives, read the database schema, lead/contact model, task/follow-up flows, permission model, and reporting logic. Produce one source note: salvageable concepts, rejected patterns, and implications for `CRM-RECRUIT-001` or any future FUB-replacement work.',
    statusNote: 'No action until Steve provides the repo. This is a parking card so the idea is not lost.',
  },
  {
    id: 'LEGACY-SYSTEM-AUDIT-001',
    title: 'Line-read old systems and promote only durable rebuild truth',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 14,
    source: '2026-04-25 full system closeout audit',
    summary: 'Audit the local old-system roots as source material: BCrew-Buddy, old bcrew skills, KPI / Zahnd dashboard, OpenClaw workspace, and Unchained notes. Promote only durable doctrine, source contracts, schemas, useful patterns, and rebuild requirements into active docs or DB-backed cards.',
    whyItMatters: 'Steve rebuilt because the old system became a Frankenstein. The answer is not to copy the old system or ignore it. The answer is to salvage its value deliberately while keeping Foundation clean and source-backed.',
    nextAction: 'Read each legacy root in bounded passes, produce one salvage map per system, classify each finding as promote, backlog, source note, spec, evidence-only, duplicate, or reject, and close/merge stale cards after promotion.',
    statusNote: 'Scoped, not active. Initial inventory is complete; full legacy line-read remains open before broad memory/extraction scale-up claims. Before build, require acceptance/proof for bounded salvage maps, promotion/rejection decisions, verifier coverage, and process:foundation-ship.',
  },
  {
    id: 'DOC-AUTHORITY-001',
    title: 'Make one generated doc authority map the rebuild truth',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 15,
    source: '2026-04-25 docs audit',
    summary: 'Keep `docs/README.md`, `docs/INDEX.md`, current-plan, current-state, system-strategy, and doc-cleanup aligned around one active-doc set so old audits and handoffs remain evidence until promoted.',
    whyItMatters: 'The rebuild loses continuity when a fresh chat cannot tell active doctrine from old evidence. The system needs a generated authority map that prevents historical handoffs from becoming competing truth.',
    nextAction: 'Done for v1. Keep the index generator authoritative as maintenance; create a child card only if a new doc-authority feature is needed. Evidence docs stay evidence until promoted into current plan/state, source contracts, or backlog.',
    statusNote: 'Closed on 2026-04-28 by backlog hygiene pass. First slice shipped on 2026-04-25: indexes include generated timestamps, promoted-to column, and no free-floating active-reference status. 2026-04-26 verifier guards added System Strategy / Rebuild Plan alignment and clarified All Docs as file-level inventory, not active doctrine. Proof command: `npm run foundation:verify`.',
  },
  {
    id: 'DB-SEED-001',
    title: 'Split backlog seed truth from live DB migrations',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 16,
    source: '2026-04-25 DB audit',
    summary: 'Replace the current mix of static `backlogSeed`, `ON CONFLICT DO NOTHING`, and startup patch updates with explicit migrations or governed seed sync rules.',
    whyItMatters: 'If seed files and live Postgres disagree, future chats cannot trust whether a backlog card is current truth, stale fixture data, or a startup mutation side effect.',
    nextAction: 'Use the seed/live drift report to classify mismatches, promote durable seed changes through explicit review, and replace startup patch updates with migration-style changes.',
    statusNote: 'First hardening slice exposes seed/live drift through `npm run backlog:seed-drift`, `/api/foundation-hub`, and verifier coverage. Mismatch resolution remains open.',
  },
  {
    id: 'CRAWL-RUN-LEDGER-001',
    title: 'Add run IDs to source crawl target execution',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 17,
    source: '2026-04-25 DB audit',
    summary: 'Add a `source_crawl_target_runs` ledger or equivalent run ID layer so extraction target leasing, finish, item counts, retries, and counters are idempotent under parallel workers.',
    whyItMatters: 'The quick fix now requires matching lease owner on finish, but long-term extraction needs a real run identity so retries and parallel leases cannot double-count or overwrite another runner.',
    nextAction: 'Let scheduled extraction targets write real run history through the new ledger, then use that history to tighten retry/idempotency behavior and dashboard run review.',
    statusNote: 'First ledger slice adds `source_crawl_target_runs`, creates a run row on target lease, finishes it by `crawlRunId`, and exposes recent runs in Foundation extraction control.',
  },
  {
    id: 'DB-CONSTRAINT-001',
    title: 'Harden DB constraints for decisions, sources, and doc updates',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 18,
    source: '2026-04-25 DB audit',
    summary: 'Move critical API-only rules into Postgres or verifier-backed contracts: decision categories, source IDs, doc-update state transitions, and supersession behavior.',
    whyItMatters: 'Foundation memory is only trustworthy if the DB refuses invalid truth, not just the current API route. Exported helpers, future jobs, and manual scripts can bypass UI validation.',
    nextAction: 'Finish the second slice by making doc-update-applied decisions run the same supersession semantics as normal decision updates, then decide where source ID checks should become real DB foreign keys versus verifier-backed contracts.',
    statusNote: 'First hardening slice adds a Postgres decision-category check, helper-level decision category validation, guarded doc-update transitions, and source-ID/doc-update-state verifier coverage.',
  },
  {
    id: 'AVATAR-001',
    title: 'Port and lock the marketing avatar registry from the old system',
    team: 'marketing',
    lane: 'research',
    priority: 'P2',
    rank: 6,
    source: 'Old marketing avatar docs + pipeline architecture',
    summary: 'Carry the old marketing avatar system into the rebuild as a governed marketing overlay: 10 RETAIN client avatars plus 5 ATTRACT agent avatars with trigger language, pains, objections, platform behavior, buying signals, and format guidance. The old docs are salvageable and specific, not placeholder copy.',
    whyItMatters: 'Marketing avatars are foundational for the future marketing hub, but they should be foundational as a marketing overlay, not as the base schema for every atom in the whole system. If we lose them, content and recruiting revert to generic messaging. If we force them into the core atom layer too early, other hubs inherit the wrong structure.',
    nextAction: 'Port `docs/marketing/avatars/*` from the old system into a governed avatar registry in the rebuild, map each avatar to ATTRACT or RETAIN, and define how atoms, scoping cards, and future marketing briefs reference avatar IDs without making avatars mandatory for non-marketing hubs.',
    statusNote: 'Low-priority carry-forward for the marketing hub build. The avatar research is already strong enough to salvage; the missing work is registry shape, governance, and clean integration with atoms/overlays.',
  },
  {
    id: 'PM-BASE-001',
    title: 'Define the shared project-management base before hub PMs',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 49,
    source: 'ClickUp + meeting-note project-manager discussion',
    summary: 'Define the Foundation project-management substrate that every future hub PM uses: ClickUp read/write, task lifecycle rules, due-date normalization, stale-task detection, atom/candidate-to-task links, and approval boundaries.',
    whyItMatters: 'Each hub should eventually have its own project manager behavior, but those hub PMs should not each reinvent task state, ClickUp access, stale detection, or evidence links. Shared PM infrastructure prevents another swarm of disconnected managers.',
    nextAction: 'Write the base contract first: what Foundation owns, what ClickUp owns, what a hub PM overlay may decide, how meeting/email/Slack commitments update task state, and what must require human approval before writes. Then later define Marketing PM, Sales PM, Recruiting PM, Ops PM, and Retention PM overlays separately.',
    statusNote: 'This is not an acting agent yet. It is the shared task-management substrate future hub PMs will sit on.',
  },
  {
    id: 'FUB-AGENT-TOOLS-001',
    title: 'Backlog future agent-facing FUB tools without mixing them into leadership synthesis',
    team: 'foundation',
    lane: 'research',
    priority: 'P2',
    rank: 49,
    source: 'Founder clarification on FUB client data versus leadership intelligence',
    summary: 'Keep FUB client notes, call transcripts, lead nurture, and transaction context queued for future agent-facing tools, but do not mix that client CRM data into the current leadership shared-comms synthesis unless a specific source-trust or KPI use case requires it.',
    whyItMatters: 'FUB has a lot of valuable data, but most of it is client/agent execution context, not ownership strategy context. Pulling it into the current synthesis layer too early would add noise and privacy risk. It belongs in a later agent-facing or sales hub phase.',
    nextAction: 'When the agent-facing engine phase begins, map FUB notes, calls, transactions, lead nurture, and client timeline reads into explicit use cases: agent assistant, sales manager view, nurture coaching, or future CRM replacement. Until then, keep current FUB work focused on KPI semantics and source-trust contracts.',
    statusNote: 'Queued intentionally after Steve clarified the scope. Current work should not ingest FUB notes just because the API exists.',
  },
  {
    id: 'REPORT-MINING-001',
    title: 'Mine old intelligence and scout reports into doctrine and synthesis patterns',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 10,
    source: 'Old BCrew Buddy archive review + 2026-04-27 atom/scoper sequencing correction',
    summary: 'Review the old intelligence outputs directly before atom implementation. The archived scout reports, executive briefs, Director intel, platform notes, marketing reports, Gold Library atoms, and Scoper feedback contain the synthesis/report shapes and data-access rules that must inform the new memory spine.',
    whyItMatters: 'The old system already knew how to produce useful outputs even when the architecture was messy. If we only port adapters and build raw extraction tables, we lose the Director/Scoper/report hierarchy that created value. The rebuild must salvage the report shapes and atom-query rules while rejecting agent sprawl, private memories, and ungoverned prompts.',
    nextAction: 'Use the accepted salvage spec as the input contract for INTEL-ATOM-001. Keep this card closed unless a future old-system review discovers a materially different report or atom shape that changes the atom contract.',
    statusNote: 'Accepted on 2026-04-27 in `docs/specs/2026-04-27-intelligence-spine-old-system-salvage.md`. The spec preserves old Director brief, Marketing Director, Scoper finding, Gold Library atom, lifecycle/performance, and direct Scoper query patterns, and lists required changes to INTEL-ATOM-001.',
  },
  {
    id: 'SOURCE-021',
    title: 'Close current writer ownership and coaching language for FUB lead semantics',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 46,
    source: 'FUB / KPI audit + founder operating clarification',
    summary: 'The v1 evidence proof is recorded under `SOURCE-021-PROOF-001`, and the 2026-05-02 proof pass locked the read/coaching semantics for `leaddate`, `leadclaimeddate`, opportunity re-entry, recycled/claimed leads, pond/unclaimed ownership, and `Active Client`. The only unresolved piece is the exact production writer/replication path that writes the rich date fields into live Supabase.',
    whyItMatters: 'Sales strategy and future coaches depend on knowing whether an agent created a brand-new human lead, claimed a recycled/pond opportunity, or reactivated an existing supporter/past-client/non-lead. Without this contract, AI OS will overstate lead creation and coach from broken pipeline truth.',
    nextAction: 'Paused until exact writer evidence is available: current production FUB sync runner source/deployment package, SQL Server Agent or scheduled-job proof for the active `fub.up_InsertPerson` pipeline, direct live Postgres metadata/log access proving the Supabase-side writer/replication path, or Lee confirmation of the deployed writer and host. Until then, AI OS may read and explain these fields but must not rebuild or write this pipeline.',
    statusNote: 'Paused on 2026-05-02 after exhausting current local/repo/source evidence. Proof: `fub.up_InsertPerson` writes `LeadDate` from lead-stage entry and `LeadClaimedDate` from user 22 -> non-22 claims; `InsertPersonToSupabase` does not write `leaddate`, `leadclaimeddate`, `activeclientdate`, or other rich stage dates; the KPI dashboard reads claimed-date first then lead-date; live Supabase still has current rich date values (`102` rows with `leaddate >= 2026-04-27`, `32` rows with `leadclaimeddate >= 2026-04-27`, `0 / 95` recent active lead-stage rows missing `leaddate`, and stage 57 `Active Client` is `leadstage = true`, `clientstage = false`). Coaching copy is locked: never say "agent created a lead" unless the record proves a brand-new human; `leaddate` is opportunity-entry timing, `leadclaimeddate` is claim/recycle timing, and `Active Client` is downstream opportunity context. Missing proof: exact production writer/replication path into live Supabase. Evidence lives in `docs/source-notes/fub-zahnd-middleware.md`, `docs/source-notes/fub-kpi-deal-connection-map.md`, and `docs/source-notes/kpi-dashboard.md`. Proof commands: `npm run process:source-021-writer-proof-check`, `npm run backlog:hygiene`, and `npm run foundation:verify`.',
  },
  {
    id: 'SOURCE-021-PROOF-001',
    title: 'Record FUB/KPI opportunity-semantics proof',
    team: 'foundation',
    lane: 'done',
    priority: 'P0',
    rank: 46,
    source: '2026-04-28 backlog hygiene split from SOURCE-021',
    summary: 'Preserve the completed v1 proof that FUB humans, KPI opportunity rows, KPI deal data, and Owners linked rows can be reconciled for opportunity-semantics work.',
    whyItMatters: 'The evidence proof should not disappear inside an executing card. Future Sales Hub and coaching work need to know what is already proven versus what still needs writer-path and language decisions.',
    nextAction: 'Done for v1. Use this proof as the baseline for `SOURCE-021`; do not reopen unless the FUB/KPI/Owners relationship changes materially.',
    statusNote: 'Closed on 2026-04-28 by backlog hygiene pass. Existing proof confirmed 53/53 FUB-linked Owners deal groups matched KPI persons and KPI deal_data, 8/53 showed multiple KPI person rows, 6/53 had leadclaimeddate, user ID 22 is active Benson Crew Assistant, and a second-pass check found 2451 active non-deleted rows with leadclaimeddate. Evidence lives in `docs/source-notes/fub-zahnd-middleware.md`, `docs/source-notes/fub-kpi-deal-connection-map.md`, and `docs/source-notes/kpi-dashboard.md`; proof command: `npm run foundation:verify`.',
  },
  {
    id: 'SOURCE-012',
    title: 'Make source contracts and connectors visible as separate live layers',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 37,
    source: 'Source-trust review + user confusion around connectors',
    summary: 'Build the next source layer so users can clearly see the difference between a source contract, a technical connector, and a signed-off trusted source instead of collapsing those ideas into one fuzzy label. Use it to collapse duplicate source-truth surfaces into one canonical visible status model.',
    whyItMatters: 'Repeated confusion around “is that a source contract or a connector?” is a signal that the model is not visible enough. The old system had useful data-source maps, but they became stale because they were doc-driven. The rebuild should keep the clarity, make it live, and stop showing overlapping truth surfaces that contradict each other.',
    nextAction: 'Finish the canonical status model: source ID, owner, source type, connector status, trust status, signed-off boundary, dependent systems, direct source link, freshness, and drift state. Keep Data Sources and Connectors visually separate.',
    statusNote: '2026-04-26 Foundation Inventory audit confirmed Data Sources is the front door to the source layer and added page-purpose boundaries for Overview, Docs, Spreadsheets, APIs / Apps, and Connectors. Remaining work is freshness/drift/status unification, not another overlapping source page.',
  },
  {
    id: 'STRATEGY-005',
    title: 'Define the boundary between Foundation and Strategic Execution',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 30,
    source: 'Foundation architecture review',
    summary: 'Define what stays in Foundation as durable direction and what moves into the next-layer planning module for annual priorities, quarterly sprints, monthly plans, and weekly execution.',
    whyItMatters: 'If Foundation keeps absorbing live strategy execution, it stops being a stable truth layer. If we separate it too early without clear rules, the system becomes confusing.',
    nextAction: 'Write the first boundary note: Foundation = durable vision, values, engine, brands, governance, and mandates. Strategic Execution = annual priorities, quarterly priorities, strategic issues, monthly plans, and weekly follow-through.',
    statusNote: 'This should settle where Quarterly Priorities and Strategic Issues live long term.',
  },
  {
    id: 'STRATEGY-006',
    title: 'Define the hub-overlay model on top of business atoms',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 20,
    source: 'Atoms architecture refinement',
    summary: 'Keep business atoms as shared Foundation evidence, then define how each hub adds its own intelligence lens without forcing every atom into one marketing-style schema.',
    whyItMatters: 'Marketing already has a strong avatar model, but Ops, Strategy, Sales, and Retention will likely need different overlays. If the system collapses those into one universal schema too early, the atom layer will get messy and every hub will fight the same design.',
    nextAction: 'Define the first overlay types on top of business_atoms: marketing audience/avatar targeting, strategy issue/decision/blocker framing, ops workflow/handoff/SOP framing, sales objection/stage/coaching framing, and retention engagement/risk framing. Keep overlays optional and additive, not required for base atom creation.',
    statusNote: 'Marketing avatars stay real and important, but they should sit on top of the shared atom model instead of becoming the atom model itself.',
  },
  {
    id: 'MANDATE-002',
    title: 'Separate durable mandates from quarterly execution asks',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 31,
    source: 'Foundation vs execution boundary review',
    summary: 'Keep department mandates durable in Foundation and move quarter-specific asks, focus shifts, and sprint expectations into the execution layer.',
    whyItMatters: 'If mandates change every quarter, they are not mandates. The system needs a clean distinction between a department’s enduring job and the current period’s strategic ask.',
    nextAction: 'Define the rule set for mandates versus quarterly execution expectations before we finalize Department Mandates and the future Strategic Execution module.',
    statusNote: 'Useful before we decide whether departments live partly in Foundation and partly in the next-layer strategy workspace.',
  },
  {
    id: 'SYSTEM-003',
    title: 'Evaluate structured companion records around canonical strategy docs',
    team: 'foundation',
    lane: 'parked',
    priority: 'P2',
    rank: 32,
    source: 'Foundation architecture review',
    summary: 'Keep docs and Git as the canonical durable strategy layer, but evaluate later whether structured companion records would help versioning, UI rendering, source linkage, and diff views without replacing docs as the source of durable truth.',
    whyItMatters: 'Current doctrine is clear: durable truth lives in docs/Git and volatile operating memory lives in PostgreSQL. If we ever add structured strategy records, they must support that model instead of creating a second conflicting truth system.',
    nextAction: 'Do not touch this until Foundation trust, verification, and source layers are stable. If reopened later, define a companion-record model that wraps canonical docs instead of replacing them.',
    statusNote: 'Parked. The current doctrine keeps durable strategy in docs and Git.',
  },
  {
    id: 'SYSTEM-009',
    title: 'Make backlog scopes and future hub queues data-driven instead of hardcoded',
    team: 'foundation',
    lane: 'done',
    priority: 'P1',
    rank: 35,
    source: 'Codex audit + Foundation Operations architecture review',
    summary: 'The root backlog now uses a data-driven scope registry instead of fixed `dev` / `marketing` labels, so Foundation, Strategic Execution, Marketing, and future hubs can share one queue model without frontend surgery.',
    whyItMatters: 'The rebuild is explicitly modular. If backlog scope and queue ownership stay hardcoded to a tiny set of team labels, every new hub will require UI surgery and the root queue will keep behaving like a temporary hack instead of a real operating model.',
    nextAction: 'Keep the scope registry authoritative, let the API/UI read from it, and expand the active scopes only when a real root queue or hub is ready instead of hardcoding new labels ad hoc.',
    statusNote: 'Closeout backfilled on 2026-04-29 under CLOSEOUT-BACKFILL-001. Evidence: historical done state is explicitly preserved in docs/process/verifier-exceptions.json. Existing proof details remain: canonical backlog scopes are registry-driven, legacy dev items are backfilled to foundation, and the Foundation UI/API create, filter, and edit against scope metadata instead of fixed labels.',
  },
  {
    id: 'SYSTEM-010',
    title: 'Add visible process control, kill switches, and decommission workflow for running agents',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P0',
    rank: 5,
    source: 'Ghost-agent lesson captured 2026-04-15',
    summary: 'Every running scheduler, agent process, automation worker, and orchestration runtime should be visible, stoppable, and cost-tracked from inside the system so ghost processes cannot quietly burn money or keep acting after the team thinks a system is shut down.',
    whyItMatters: 'The old system kept running silently after people thought it was effectively dead. That is a direct trust and cost failure. If the new system cannot show what is running, stop it, and decommission it cleanly, the same problem will come back under a newer name.',
    nextAction: 'Extend the first job ledger into real supervision: schedules, pause/disable controls, cursor state, retry policy, cost tracking, auto-restart-on-push, and approval-gated write jobs.',
    statusNote: 'First visible job/process control is live for routines. It records command, run status, output tail, duration, exit code, and recent failures. The dashboard served-code-equals-HEAD check now fails loudly when the live dashboard is stale and tells the operator how to restart it; kill switches, scheduler/daemon control, auto-restart-on-push, and cost controls remain open.',
  },
  {
    id: 'MANDATE-003',
    title: 'Add a How We Know measurement layer to department mandates',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 33,
    source: 'Department mandates research review',
    summary: 'Keep the Foundation mandate wording durable, but define the measurable proof layer that shows whether each department is actually executing its mandate in the live system.',
    whyItMatters: 'Without a measurement layer, mandates can stay accurate on paper while the real system fails underneath them.',
    nextAction: 'Define the first How We Know model: primary KPI proof, visibility rules, failure conditions, and where the measurement layer lives in Strategic Execution versus Foundation.',
    statusNote: 'The durable mandate should stay clean; the proof layer belongs in the next operational layer.',
  },
  {
    id: 'EXEC-001',
    title: 'Define a 48-hour blocker escalation rule',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 34,
    source: 'Department mandates research review',
    summary: 'If a P0 or P1 item is blocked by one person for too long, the system should escalate visibly instead of letting the company freeze around that bottleneck.',
    whyItMatters: 'Leadership rescue and silent blockers are recurring failure modes. The system needs a clear escalation rule, not just goodwill.',
    nextAction: 'Define what counts as a blocker, which items qualify, the escalation timeline, who gets notified, and where the escalation shows up in Strategic Execution and meeting prep.',
    statusNote: 'This came directly out of the old-system intelligence and the current leadership-rescue issue.',
  },
  {
    id: 'EXEC-002',
    title: 'Define the BCrew backlog ownership and sprint-cadence model',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 35,
    source: 'Scrum principle review + execution-system design',
    summary: 'Adapt the strongest Scrum principles into a BCrew operating model: one accountable backlog owner per backlog, a visible ordered queue, quarterly focus selected from that queue, weekly sprint-style execution cadence, and regular inspect/adapt loops that keep work moving without turning the company into ceremony theater.',
    whyItMatters: 'The system needs a real execution model, not just a list of tasks. The useful part of Scrum here is clear ownership, transparent backlog management, sprint cadence, inspection, and adaptation. Without that model, the backlog becomes a pile, priorities drift, and AI cannot manage the queue intelligently. The goal is not to cosplay software Scrum across the whole company; it is to translate the best execution principles into a model the business can actually run.',
    nextAction: 'Define the first BCrew execution model in plain terms: annual strategic goals, quarterly focus selection, monthly review/re-order cadence, weekly sprint execution, one accountable backlog owner per surface, how AI supports backlog refinement without owning final order, and how items move from candidate work into committed sprint work and then into done.',
    statusNote: 'Use official Scrum principles as the base and adapt them for business execution. Keep the parts that drive clarity, ownership, and adaptation. Drop ceremony that does not fit the company.',
  },
  {
    id: 'SALES-001',
    title: 'Protect the sales leadership lane from deal-production conflict',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 35,
    source: 'Department mandates research review',
    summary: 'Clarify how much personal production can coexist with sales leadership before coaching cadence, standards, and accountability start to slip.',
    whyItMatters: 'The mandate is clear, but the lane can still fail if leadership work keeps getting crowded out by deals.',
    nextAction: 'Define the operating rule for protected sales leadership time, acceptable production overlap, and what evidence shows the lane is no longer protected.',
    statusNote: 'Useful before we lock the growth-side accountability model.',
  },
  {
    id: 'SALES-002',
    title: 'Turn deal-ledger profitability and negotiation fields into coaching signals',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 35,
    source: 'Owners Dashboard deal-ledger walkthrough',
    summary: 'Use the Admin tab to produce real coaching signals around listing transaction-fee capture, LP/SP performance, commission-rate discipline, and signed-to-paid timing instead of leaving those insights trapped in spreadsheet columns.',
    whyItMatters: 'Steve explicitly called out that agents are giving up on transaction fees, that LP/SP should show whether sellers are getting more and buyers are paying less, and that commission-rate discipline matters. These are exactly the kinds of concrete production signals Sales Leadership should be able to coach against.',
    nextAction: 'Define the first coaching metrics from Columns V through AA plus the timing chain in F through I, then decide which ones belong in agent scorecards, manager coaching prompts, and profitability reporting.',
    statusNote: 'Build this on top of cleaned source data. Do not surface coaching metrics before the underlying attribution and integrity checks are good enough.',
  },
  {
    id: 'SALES-003',
    title: 'Turn KPI maintain-pace questions into a governed assistant query',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 36,
    source: 'Live KPI query walkthrough + founder request',
    summary: 'Productize the repeated sales-coaching question: who is on pace for maintain by cash executed, then signed clients, then apps set. The current answer path works, but it still requires live reverse-engineering across goals, profiles, deal_data, appointments, and pipeline timing.',
    whyItMatters: 'This is exactly the kind of management question Steve, Harlan, future sales assistants, and feedback scouts will ask repeatedly. If the logic stays manual, answers take minutes, can drift between assistants, and are too slow for live coaching or repeated leader review.',
    nextAction: 'Create one governed KPI pace read for AI OS: active roster filter, maintain target math, pipeline-adjusted pace windows, live actuals for cash executed / signed clients / consults set, and ranked output buckets. Expose it as a reusable query or endpoint so assistants can answer in seconds instead of rebuilding the logic ad hoc.',
    statusNote: 'Today the logic is understood and manually proven. Next step is to turn it into a signed-off reusable read for Sales Hub and assistant access.',
  },
  {
    id: 'SALES-004',
    title: 'Define the agent-facing KPI coach and daily nugget loop',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 36,
    source: 'Founder CRM replacement / agent AI coach vision',
    summary: 'Define the future agent-facing assistant experience inside the KPI / Sales Hub layer: each agent can ask about their KPI system, Home Value Hub, CRM/opportunity rules, receive one source-backed coaching nugget per day, and eventually get help fixing their own KPI/FUB hygiene when permissions exist.',
    whyItMatters: 'The long-term value is not just replacing scattered SaaS. It is turning the rebuilt source layer into a useful agent coach that teaches the team how the business systems work, nudges better behavior daily, and eventually supports replacing expensive external CRM surfaces with an integrated AI OS that can help agents act, not just read.',
    nextAction: 'After KPI/FUB opportunity semantics, source privacy, and assistant identity boundaries are stable, write the first agent-coach contract: allowed sources, daily-nugget rules, opt-in/notification channel, role/tier visibility, forbidden/private content, KPI/Home Value Hub/FUB question types, proof checks, and the boundary between advice, suggested fixes, and agent-authorized writes.',
    statusNote: 'This is the product destination for the KPI/FUB work, not a current build shortcut. It depends on SOURCE-021, SOURCE-017, KPI-APPT-QUALITY-001, KPI-LEAD-VALIDATION-001, KPI-SHOPPING-001, SECURITY-002, UX-002, PEOPLE-003, and the future Sales Hub read/apply layer.',
  },
  {
    id: 'SALES-005',
    title: 'Design agent-authorized KPI/FUB fix and apply layer',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 37,
    source: 'Founder agent coach / future CRM replacement vision',
    summary: 'Define how an agent-facing assistant moves from detecting KPI/FUB issues to helping the agent fix them, and eventually applying fixes in the agent-owned systems after signup, API-key setup, and explicit permission.',
    whyItMatters: 'The useful product is not only a report that says agents entered bad data. The assistant should help them correct bad appointment outcomes, fake leads, source issues, Shopping List gaps, and other hygiene problems while preserving auditability and permission boundaries.',
    nextAction: 'Design the first apply contract: agent identity, connected accounts/API keys, allowed write surfaces, suggested-fix preview, approval step, audit log, rollback/escalation rules, and which fixes are safe to automate versus which require manager or Ops review. V1 likely writes mostly to FUB for source/stage/contact hygiene, and to KPI only for goals plus Shopping List action-plan workflows.',
    statusNote: 'Do not build writes before the read/audit gates are reliable. Most KPI production truth flows from FUB/Lee DB; KPI-native writes are mainly goals and Shopping List. If Shopping List endpoints are missing, request implementation in the owned KPI codebase instead of bypassing boundaries.',
  },
  {
    id: 'SALES-006',
    title: 'Frame Sales Hub around GROW KPI and system drivers',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 37,
    source: 'Steve Sales Hub dashboard review, 2026-05-01',
    summary: 'Define the high-level Sales Hub dashboard as a GROW command view: the number-one sales KPI is average agent production moving toward the 10k-per-agent target, and the dashboard branches into systems and signals that help leaders drive that KPI. GLS is one system inside Sales Hub, not the Sales Hub itself; future systems may include GBS / Get Buyers Sold, KPI Shopping List discipline, lead-to-appointment conversion, signed-rate, firm-rate, and commission-rate visibility.',
    whyItMatters: 'Sales leaders need one clear top-line read before they dive into operating systems. If the hub starts with GLS alone, it can look like a listing workflow instead of a growth dashboard. The useful v1 should show the GROW KPI first, then point to the levers that improve it: stale listing movement, buyer conversion, Shopping List quality, lead-to-appointment rate, signed rate, firm rate, and commission rate.',
    nextAction: 'After the GLS dashboard review settles, design a thin Sales Dashboard v1: top GROW KPI card, driver tree/system branches, metadata-only signal counts, and links into GLS Manager and future driver surfaces such as GBS. Do not build a CRM, agent coach, broad source expansion, or write/apply layer in this card.',
    statusNote: 'Captured as a future Sales Dashboard idea only. Enriched 2026-05-01 from Steve review: Sales Hub should start with GROW / 10k-per-agent average and branch into operating systems, not make GLS look like the whole hub. This is not part of the current GLS scoreboard/menu cleanup and should not be implemented until Steve explicitly pulls the Sales Dashboard v1 slice forward.',
  },
  {
    id: 'SALES-GLS-SCOREBOARD-V1',
    title: 'Ship GLS scoreboard and manager v1',
    team: 'sales',
    lane: 'done',
    priority: 'P1',
    rank: 37,
    source: 'Steve GLS Scoreboard V1 request and 2026-05-01 live review',
    summary: 'Built the Get Listings Sold v1 surface inside Sales Hub: a case-first GLS Dashboard, active pipeline and total-case scoreboards, sales leader scoreboard, weekly case cohort, moved/sold visibility, GLS Manager queue, grouped project cards, per-case history, approved Sales Hub access for leadership, and a faster cached AIOS view with last-refresh visibility plus manual ClickUp refresh.',
    whyItMatters: 'The Sales team now has one lightweight scoreboard for the GLS process without creating a CRM: how many stale-listing cases exist, who owns them, which got plans, which were adjusted, which sold or failed, and which leaders are moving work.',
    nextAction: 'Stop V1 here for review. Use the follow-up GLS cards for split/merge overrides, re-stale reopen behavior, manager usability, leader accountability rhythm, date filters, and history controls. Do not broaden this card into agent coach, CRM replacement, GBS, Strategy, Scoper, or source expansion.',
    statusNote: 'Closed on 2026-05-01 under Sales GLS V1 closeout. Proof: npm run process:sales-listings-hub-check, npm run backlog:hygiene -- --json, live /api/sales-hub?refresh=1 proof, manual /sales#gls-dashboard and /sales#gls-system review, leadership email sent after approval, and docs/handoffs/2026-05-01-sales-gls-v1-closeout.md. Latest speed pass removes the Open ClickUp View CTA, serves cached AIOS data immediately when stale, shows the last ClickUp refresh time, explains GLS edits save to AIOS immediately, and keeps live ClickUp refresh manual.',
  },
  {
    id: 'SALES-GLS-GROUPING-OVERRIDES-001',
    title: 'Add manual split and merge controls for GLS grouped cases',
    team: 'sales',
    lane: 'scoped',
    priority: 'P1',
    rank: 38,
    source: 'Steve GLS grouped-project review, 2026-05-01',
    summary: 'Add persisted GLS grouping overrides so a manager can split one listing out of an auto-grouped project, merge listings that belong together, and keep case counts correct even when the address/agent auto-grouping rule would otherwise put them back together.',
    whyItMatters: 'Auto-grouping correctly keeps Nick Bergmann\'s seven listings at one address as one project, but the system needs a human override when one unit is actually a separate case. Without split/merge controls, case counts can be wrong and leaders cannot trust the manager queue.',
    nextAction: 'Design the override model: stable project key, listing-level split override, manual merge group, undo/archive behavior, history preservation, and proof that Nick\'s seven-unit group stays one case unless a manager explicitly splits one listing out.',
    statusNote: 'Scoped only. Do not build inside GLS V1 closeout. Acceptance should prove case count changes from 40 to 41 when one listing is split out, history remains attached to the right case, and auto-grouping does not silently undo the override.',
  },
  {
    id: 'SALES-GLS-RESTALE-REOPEN-001',
    title: 'Handle adjusted listings that go stale again',
    team: 'sales',
    lane: 'scoped',
    priority: 'P1',
    rank: 39,
    source: 'Steve GLS active/resolved model review, 2026-05-01',
    summary: 'Define and build the re-stale loop for GLS: adjusted/repositioned stays in the same case history, but if the listing becomes stale again before it sells or fails, the case should re-enter the active pipeline as needing owner attention instead of getting lost.',
    whyItMatters: 'The main GLS goal is to move stale listings. A listing can be adjusted and still fail to move. If that re-stale signal does not reopen visible work, the system will falsely look successful while the listing is stuck again.',
    nextAction: 'Lock the lifecycle rule: adjusted/repositioned is progress but not final resolution; sold and failed resolve; stale-again after adjustment reactivates the same case, resets the visible owner-needed cue, and records a new cycle without double-counting all-time identified cases incorrectly.',
    statusNote: 'Scoped only. Do not build inside GLS V1 closeout. Acceptance should prove adjusted still-active cases remain visible, sold/failed leave active, and a re-stale adjusted case returns to Needs owner while preserving prior history.',
  },
  {
    id: 'SALES-GLS-MANAGER-USABILITY-001',
    title: 'Tighten the GLS Manager work queue usability',
    team: 'sales',
    lane: 'scoped',
    priority: 'P2',
    rank: 40,
    source: 'Steve GLS Manager review, 2026-05-01',
    summary: 'Make the GLS Manager easier to use day to day: clearer project versus individual rows, tighter card layout, quick filters, clearer save states, less duplicated dashboard information, and a faster path to work the next case.',
    whyItMatters: 'The dashboard answers what is happening. The manager page is where leaders actually do the work. If the work queue feels cluttered or ambiguous, assignments and game-plan updates will not stay current.',
    nextAction: 'Review the live GLS Manager with sales leaders, list the top workflow frictions, and design one narrow UI pass focused on queue scanning, filtering, editing, and mobile fit. Keep dashboard metrics and future coaching out of this card.',
    statusNote: 'Scoped follow-up from V1 review. Current V1 is acceptable enough to use, but Steve flagged the actual listings/manager page as the next usability surface after the scoreboard.',
  },
  {
    id: 'SALES-GLS-LEADER-ACCOUNTABILITY-001',
    title: 'Add GLS leader accountability rhythm and report',
    team: 'sales',
    lane: 'scoped',
    priority: 'P2',
    rank: 41,
    source: 'Steve GLS sales-leader scoreboard review, 2026-05-01',
    summary: 'Turn the sales leader scoreboard into an accountability rhythm: who owns active cases, who resolves the most cases, who gets adjustments and sales, what is stuck, and what John/leadership should review in owner meetings.',
    whyItMatters: 'Steve wants GLS to answer which sales leaders get stale listings moving, not only how many stale listings exist. The scoreboard should support accountability without becoming a heavy CRM.',
    nextAction: 'Design the first weekly leadership report/SOP: owner meeting readout, leader rows, stuck cases, no-owner cases, adjusted/sold/fail outcomes, and simple expectations for Blake, Nick, John, Ryan, and Steve. Include screenshots/help text only if they make the workflow easier.',
    statusNote: 'Scoped follow-up. V1 already has leader performance rows; this card owns the cadence, accountability story, and leadership-report layer.',
  },
  {
    id: 'SALES-GLS-FUNNEL-FILTERS-001',
    title: 'Add date filters to total GLS case outcomes',
    team: 'sales',
    lane: 'research',
    priority: 'P2',
    rank: 42,
    source: 'Steve GLS total-case dashboard review, 2026-05-01',
    summary: 'Add lightweight date slicing to the total GLS case scoreboard so leaders can review all-time results, this week, last week, this month, custom ranges, and cohort outcomes without confusing active pipeline counts.',
    whyItMatters: 'Active pipeline should show current unresolved work, while total outcomes should show conversion over history. Date filters make the historical scoreboard useful for week-over-week improvement and leader accountability.',
    nextAction: 'Define the exact filter model after case-history dates are stable: date entered GLS, date adjusted, date sold/failed, week cohort, and how filtered totals interact with current active counts. Keep weekly cohort rows case-only, not listing/case slash values.',
    statusNote: 'Research follow-up. V1 intentionally leaves total cases all-time and notes that date filters can layer on later.',
  },
  {
    id: 'SALES-GLS-HISTORY-CONTROLS-001',
    title: 'Add GLS case history cleanup controls',
    team: 'sales',
    lane: 'research',
    priority: 'P3',
    rank: 43,
    source: 'Steve GLS case-history review, 2026-05-01',
    summary: 'Define safe controls for noisy or mistaken GLS case history: hide/archive entries, show hidden entries for audit, and decide whether any test history can be hard-deleted by an owner-only action.',
    whyItMatters: 'Case history builds trust only if it is useful. The V1 fix hides noisy baseline entries, but production history should not become cluttered, and deletion needs a policy so real accountability is not erased by accident.',
    nextAction: 'Decide the policy first: which entries are immutable audit, which can be hidden, which test artifacts can be deleted, who can do it, and how the card shows that cleanup happened. Then build the smallest owner-only control.',
    statusNote: 'Research follow-up. V1 hides baseline noise and supports clearing the current note, but it does not add delete/archive controls for historical ledger entries.',
  },
  {
    id: 'RETAIN-001',
    title: 'Define weekly retention actions and testimonial ownership',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 36,
    source: 'Department mandates research review',
    summary: 'Turn retention from a vague concept into a visible operating lane with weekly actions, early-risk signals, and a clear owner for testimonials and review capture.',
    whyItMatters: 'Retention is one of the least explicit parts of the current system, and testimonial ownership is falling through the cracks between teams.',
    nextAction: 'Define the weekly retention operating motions, risk signals, testimonial/review ownership, and which parts belong to Retention, Marketing, or Operations.',
    statusNote: 'This should sharpen the RETAIN lane without bloating the Foundation mandate itself.',
  },
  {
    id: 'OPS-001',
    title: 'Map cross-department handoffs in Strategic Execution',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 37,
    source: 'Department mandates review',
    summary: 'Define the key handoff points between departments so the system can show where work, leads, risk, and accountability should pass cleanly from one function to another.',
    whyItMatters: 'Many strategic issues live at the handoff points, not inside one department. If the handoffs stay implicit, blame and drift stay fuzzy.',
    nextAction: 'Draft the first handoff map: Marketing -> Recruiting, Recruiting -> Operations, Sales -> Retention, and any other recurring cross-department transfer points that need clear ownership.',
    statusNote: 'This belongs in Strategic Execution and operating design, not in the durable mandates doc.',
  },
  {
    id: 'PEOPLE-004',
    title: 'Build an org capability and support-gap review layer',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 38,
    source: 'Founder org-design reflection',
    summary: 'Use strategy, meeting history, accountability signals, and real operating output to identify where the organization needs clearer leadership support, better management structure, stronger role fit, or future hiring help.',
    whyItMatters: 'The system should help reveal where the company is structurally weak, where the founder is over-carrying, and where accountable leadership or people support is missing.',
    nextAction: 'Define the first org-capability review: role fit, management load, blocked departments, support gaps, and what should be solved by coaching, redesign, or hiring.',
    statusNote: 'This is not vibe-based HR. It should be grounded in role expectations, evidence, and real operating behavior.',
  },
  {
    id: 'OPS-002',
    title: 'Define team enablement and tool-investment strategy',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 39,
    source: 'Department mandates review',
    summary: 'Define how tools, systems, subscriptions, and internal enablement assets support agent retention, operational leverage, and marketing/recruiting effectiveness without becoming a vague catch-all category.',
    whyItMatters: 'The company is already investing heavily in tools and leverage systems. If that investment stays conceptually fuzzy, ownership, ROI, and strategic fit will stay fuzzy too.',
    nextAction: 'Define the enablement model: which tool investments primarily support Retain, which support Attract, who owns the budget and outcomes, and how the system should measure time-back, leverage, and adoption.',
    statusNote: 'This should likely sit across Operations, Marketing, and Retention rather than becoming its own engine pillar.',
  },
  {
    id: 'PEOPLE-005',
    title: 'Define when shared departments should split as the company scales',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 40,
    source: 'Department mandates review',
    summary: 'Set the future-state criteria for when cross-functional departments should become more specialized teams, such as Attract Marketing vs Retain Marketing or Onboarding vs ongoing Operations.',
    whyItMatters: 'The current structure works only as long as the overlaps are manageable. The system should know what growth conditions trigger a cleaner org split instead of waiting for confusion and overload.',
    nextAction: 'Define the split triggers: workload, pipeline volume, management load, quality drift, backlog pressure, and accountability failure thresholds that justify creating more specialized teams.',
    statusNote: 'Useful for scaling the company without prematurely adding headcount or structure.',
  },
  {
    id: 'ENGINE-002',
    title: 'Separate team membership from counted production roster in the Freedom rebuild',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    source: 'Freedom Sheet tab-by-tab validation',
    summary: 'The current Agent Engine counts active roster from start and end dates, while business reality needs a separate production-roster rule. Team membership and counted production roster are not the same thing.',
    whyItMatters: 'Non-producing team members can still belong to the team without counting toward capacity math. If the rebuild keeps one blended status model, roster math and accountability logic will stay muddy.',
    nextAction: 'Define the canonical production-roster state separate from team membership, then rebuild active-headcount logic on that explicit state instead of the current end-date workaround.',
    statusNote: 'Discovered during Freedom Sheet calculator validation on 2026-04-18.',
  },
  {
    id: 'DATA-021',
    title: 'Replace Freedom hidden Owners mirror with direct ledger dependency in Level 2 rebuild',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    source: 'Freedom Sheet tab-by-tab validation',
    summary: 'The Freedom Sheet Agent Engine economics currently depend on a hidden IMPORTRANGE mirror of the Owners Admin ledger. The rebuild should read the canonical ledger directly instead of depending on a hidden spreadsheet copy.',
    whyItMatters: 'The hidden mirror obscures source-of-truth boundaries and duplicates critical economics logic. Leaving it in place would keep the new system dependent on spreadsheet plumbing instead of a clean source layer.',
    nextAction: 'In the Level 2 Freedom rebuild, wire gross-to-team, agent portion, and team portion directly from the canonical Owners ledger source and retire the hidden IMPORTRANGE dependency.',
    statusNote: 'Discovered during Freedom Sheet calculator validation on 2026-04-18.',
  },
  {
    id: 'ENGINE-003',
    title: 'Align Freedom Agent Engine chart-feed windows and labels',
    team: 'foundation',
    lane: 'research',
    priority: 'P2',
    source: 'Freedom Sheet tab-by-tab validation',
    summary: 'The production chart-feed block in `AG:AK` is labeled as rolling 6-month but currently uses a 12-row window. Chart labels and formulas should match so secondary reporting does not drift from the validated engine logic.',
    whyItMatters: 'Even if the core calculator is correct, misleading chart windows create operator confusion and make it harder to trust the sheet during review and later rebuild work.',
    nextAction: 'Review each `AG:AK` chart-feed block, confirm the intended window for each one, and make the formulas and titles agree.',
    statusNote: 'Filed during Freedom deep checkpoint on 2026-04-18.',
  },
  {
    id: 'ENGINE-004',
    title: 'Remove hardcoded split assumptions from Freedom annual-agent earnings helper metrics',
    team: 'foundation',
    lane: 'research',
    priority: 'P2',
    source: 'Freedom Sheet tab-by-tab validation',
    summary: 'The annual-agent earnings helper block uses hardcoded `0.5` split assumptions for net-to-agent calculations. Those helper metrics should either read source-backed split assumptions or be clearly labeled as rough estimates.',
    whyItMatters: 'If the helper block is used for recruiting or compensation storytelling, hardcoded assumptions can drift away from the validated engine logic and create false confidence.',
    nextAction: 'Decide whether these helper metrics should use the BHAG split assumptions, actual trailing split logic, or stay as explicitly rough recruiting-only estimates.',
    statusNote: 'Filed during Freedom deep checkpoint on 2026-04-18.',
  },
  {
    id: 'OPS-003',
    title: 'Repair the ops-improvement rollup and remove the dead NPS Scores & Reviews dependency',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 4,
    source: 'Freedom Sheet ops validation',
    summary: 'Fix the `Data Entry - Ops Cont Improvement` monthly rollup so transaction-management metrics read from the live deal / NPS / review source path instead of the removed `NPS Scores & Reviews` tab, then restore trustworthy monthly OSI inputs.',
    whyItMatters: 'The Ops Satisfaction dashboard cannot be trusted while the master ops rollup contains live `#REF!` errors and stale dependency assumptions.',
    nextAction: 'Replace the dead sheet reference, lock the month-row rules for the ops rollup, and rerun the `Ops Satisfaction` sanity check against the repaired source rows.',
    statusNote: 'This is source-layer repair work, not dashboard polish.',
  },
  {
    id: 'OPS-004',
    title: 'Collapse duplicated ops bonus rules into one governed model and retire dead legacy paths',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 40,
    source: 'Freedom Sheet ops validation',
    summary: 'The old ops bonus rules are split across feeder tabs, the `Bonus System` sheet, and a local agent-onboarding lookup, while the Q2 2026 policy moved live accountability to quarterly quality calls, ClickUp-documented improvements, Owners/FUB/QuickBooks data accuracy, and client-experience capture rate.',
    whyItMatters: 'A fuzzy bonus model creates fake accountability. The company needs one trusted view of what behaviors earn bonuses and which old spreadsheet-era incentives are dead.',
    nextAction: 'Retire the dead per-row Freedom bonus assumptions, then design one governed Q2 bonus model for quality calls, improvement projects, data accuracy, eligible-client survey capture, NPS, Google reviews, and sub-9 feedback. ClickUp Deal Data Entry and FUB transcripts now own post-policy client-experience workflow evidence; Owners/FUB/QuickBooks own data accuracy.',
    statusNote: 'Q2 2026 policy PDF is now read. Do not encode the old Freedom per-row NPS/Google-review bonus as live truth for post-2026-04-01 deals. Admin review now fails post-policy follow-through against ClickUp Deal Data Entry by Trade Number after the firm + 10-day gate.',
  },
  {
    id: 'OPS-008',
    title: 'Repair ClickUp Deal Data Entry Trade Number coverage for linked deals',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 41,
    source: '2026-04-26 FUB/KPI/Deal Data connection audit',
    summary: 'The live connection audit found ClickUp Deal Data Entry is readable and contains 1647 tasks, with 1210 tasks carrying a Deal #. Across all Owners/Admin deals, 1097/1300 deal groups match ClickUp by Deal #. But none of the 53 audited FUB-linked Owners deal groups matched by Deal #, while 48/53 matched ClickUp by address.',
    whyItMatters: 'ClickUp is supposed to own post-policy Ops follow-through, NPS, Google review, internal feedback, and FUB outreach evidence. If high-value FUB-linked deals have tasks but missing/wrong Trade Numbers, AIOS can inspect Owners/FUB/KPI truth but cannot reliably prove Ops follow-through without fallback matching and cleanup.',
    nextAction: 'Use Ops Hub findings and the connection audit to separate tasks that exist by address but need Deal # backfill from deals with no ClickUp task at all. Backfill current/deal-active Trade Numbers first, then decide whether older closed tasks should be bulk repaired or left as historical evidence gaps.',
    statusNote: 'This is data-linkage cleanup, not an API-key or connector failure. ClickUp verification passes and broad Owners Deal # joins work; the problem is missing/wrong task-level Deal # coverage in the FUB-linked proof set.',
  },
  {
    id: 'DATA-022',
    title: 'Add a richer Google Sheets reader for cell notes and comments',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 41,
    source: 'Freedom Sheet validation',
    summary: 'The richer Google reader baseline now exists in repo code: sheet values/formulas are still the default path, but we can now explicitly read cell notes via Sheets grid metadata and spreadsheet comments via Drive. The remaining work is to use that richer path intentionally in the source validations and any UI or verification flows that depend on note/comment meaning.',
    whyItMatters: 'Important operating context already lives in notes/comments across Freedom and related sheets. If the system does not deliberately switch to the richer reader where needed, it will keep missing business meaning even though the raw capability now exists.',
    nextAction: 'Keep the new helpers as the baseline richer-reader path, then mark which source validations require them and wire them into the specific validation / verification flows that rely on notes or comments for meaning.',
    statusNote: 'Baseline capability exists now in `lib/google-delegated.js`. This card is no longer about proving feasibility; it is about using the richer reader in the right places.',
  },
  {
    id: 'RETAIN-002',
    title: 'Turn Agent Satisfaction into a real retention and culture system',
    team: 'foundation',
    lane: 'research',
    priority: 'P1',
    rank: 37,
    source: 'Freedom Agent Satisfaction validation + founder operating truth',
    summary: 'The current Agent Satisfaction sheet is a starting point, not the finished system. It should evolve from a basic survey dashboard into a real retention and culture layer that tracks survey signals, meeting engagement, and the producing agents that matter most.',
    whyItMatters: 'Georgia has changed the program over time, but the dashboard was not kept in sync. If the system cannot absorb those operating changes, the founder ends up carrying the logic again and the retention lane stays weak.',
    nextAction: 'Define the v2 Agent Satisfaction / Retention model: current survey cadence, which meetings count as engagement, which agents matter most, how to use survey folders and attendance signals, and what future telemetry should come from Slack, email, and other behavior to flag retention risk early.',
    statusNote: 'This should sharpen RETAIN work beyond generic testimonials. The immediate goal is to make the current sheet usable as-is, then expand it into a fuller retention system.',
  },
  {
    id: 'MKT-001',
    title: 'Hold major marketing execution until the foundation is locked',
    team: 'marketing',
    lane: 'parked',
    priority: 'P0',
    rank: 1,
    source: 'Leadership decision',
    summary: 'Do not restart the broader marketing machine until strategy, source contracts, and memory spine are trustworthy.',
    whyItMatters: 'The old system moved too fast and scattered attention before the foundation could hold.',
    nextAction: 'Resume after strategy lock and memory foundation checkpoint.',
    statusNote: 'Intentional pause, not abandonment.',
  },
  {
    id: 'MKT-002',
    title: 'Port the old marketing backlog into the new structured system',
    team: 'marketing',
    lane: 'research',
    priority: 'P1',
    rank: 2,
    source: 'Old system migration',
    summary: 'Review old marketing backlog cards, keep the strong work, and re-sequence it in the new system once the base is stable.',
    whyItMatters: 'There is real value in the old backlog, but it needs structure and truth underneath it.',
    nextAction: 'Pull the highest-value items only after the foundation checkpoint.',
    statusNote: 'Deferred until foundation work settles.',
  },
  {
    id: 'MKT-003',
    title: 'Define MarketMasters data sources and measurement model',
    team: 'marketing',
    lane: 'scoped',
    priority: 'P1',
    rank: 3,
    source: 'Strategy support',
    summary: 'Identify how MarketMasters performance will be measured and where those metrics will live.',
    whyItMatters: 'MarketMasters is a strategic vehicle and needs the same source-of-truth discipline as the team engine.',
    nextAction: 'Map current sheets, events, and outreach systems into source IDs.',
    statusNote: 'Scoped, waiting on foundation time.',
  },
  {
    id: 'MKT-004',
    title: 'Turn the Source Intelligence Lifecycle into a founder-led AI OS content piece',
    team: 'marketing',
    lane: 'research',
    priority: 'P2',
    rank: 4,
    source: 'Steve 2026-04-25 Foundation closeout review',
    summary: 'Package the Foundation lifecycle — connect, verify, understand, extract, synthesize, route/action — into a future Steve-led YouTube/video/content asset about building a real AI OS instead of a pile of disconnected automations.',
    whyItMatters: 'The build process itself is marketable proof. This framework explains why the system starts with source truth before agents, dashboards, or content automation, and it can become strong founder-led content once the Foundation is solid enough to show.',
    nextAction: 'Park until Foundation closeout is stable. Later, turn the lifecycle into a simple video outline with one Benson Crew example, one old-system failure lesson, and one practical takeaway for operators building AI systems.',
    statusNote: 'Good marketing/IP idea captured; not allowed to pull focus from Foundation source connection, extraction, synthesis, and action-routing work.',
  },
  {
    id: 'AI-MEETING-PARTICIPANT-001',
    title: 'AIOS as live meeting co-participant, not a dashboard',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 31,
    source: '2026-04-27 Steve product vision: AI OS open during ownership meetings',
    summary: 'Capture and enforce the product north star: AIOS is designed to be open during ownership/team meetings and talked-with in real-time. Issues, suggestions, and Scoper output are surfaced live and discussed; the team moves work down the field through dialogue with the system, not by managing ClickUp cards offline.',
    whyItMatters: 'Steve articulated this on 2026-04-27 as the actual product target: real-time AI participation during meetings, replacing the failure mode of managing ClickUp cards. Without this north star captured as repo truth, future builders default to async dashboard polish and lose the dialogue-during-meeting workflow that justifies the system existing at all.',
    nextAction: 'Use this card as the north-star reference for STRATEGY-HUB-MEETING-READY-001 acceptance, INTEL-SCOPER-001 output design, and SCOPER-UI-001 display layer. Hub features should be evaluated against the test: would this work as something the ownership team reads out loud and discusses live, with AI as a co-participant? If not, redesign.',
    statusNote: 'New P1 from 2026-04-28 deep audit. Scoped now so the meeting-AI vision binds future builders even though no code ships against this card directly. Hub UX, Scoper output, plain-English titles, dialogue-friendly framing, and per-item provenance display all serve this north star.',
  },
  {
    id: 'SCOPER-UI-001',
    title: 'Render gap-resolving Scoper output in the Strategy Hub',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P1',
    rank: 32,
    source: '2026-04-28 deep audit gap: INTEL-SCOPER-001 covers agent logic, not display',
    summary: 'Build the Hub UI surface that displays the structured output of INTEL-SCOPER-001 scoped cards. Steve clicks "Scope this" on a Strategy route, the gap-resolving Scoper produces structured sections (verified-already-answered, partial evidence, actual gaps, suggested owner, next steps, evidence pointers), and this card defines how those sections render, expand, and link back to provenance.',
    whyItMatters: 'INTEL-SCOPER-001 produces structured scoped cards but does not specify how the Hub renders them. Without an explicit display layer, the Scoper output either gets dumped as raw JSON or buried in another generic surface. The 10x value of the Scoper depends on the human-readability of its output during weekly ownership review, which is a UI build, not an agent build.',
    nextAction: 'Build after INTEL-SCOPER-001 v1 ships at least one real scoped card. UI requirements: collapsible sections per output category (verified, partial, actual gaps, owner suggestion, next steps); each verified claim renders as a clickable evidence pointer to the source file/atom/decision/route; meeting-readable plain-English titles; next-steps produced as draft tasks the team can promote with one click; honor BC brand. Designed for shared-screen plus live discussion per AI-MEETING-PARTICIPANT-001.',
    statusNote: 'New P1 from 2026-04-28 deep audit. Pinned separately from INTEL-SCOPER-001 because UI display is a distinct build phase and falls through the cracks otherwise.',
  },
  {
    id: 'SYSTEM-HEALTH-AUDITOR-001',
    title: 'Nightly read-only Foundation health auditor',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P2',
    rank: 50,
    source: '2026-04-27 Steve nightly system-cleanup conversation',
    summary: 'Read-only nightly agent that inspects Foundation for drift: backlog cards marked done without proof, shipped commits without changelog or system records, stale docs vs live data, live DB vs seed drift, dirty or untracked files, source contracts changed without dependent surfaces updating, worker or job failures or stale runs, AGENTS.md or rebuild doctrine violations. Output: DB-backed findings with severity, affected files and systems, suggested owner, exact cleanup task. Never auto-mutates; surfaces only.',
    whyItMatters: 'Verifier covers what was anticipated; the Health Auditor catches what the verifier missed. As the system grows, manual review cannot keep up with drift across cards, docs, code, and data. A nightly read-only audit ensures small drift becomes findable instead of silently rotting until a major refactor is needed.',
    nextAction: 'Do not start until INTEL-SCOPER-001 has been in production use for 2+ weeks producing at least 10 valuable scoped cards, AND AGENT-005 (agent franchise model) v1 exists, AND STRATEGY-QUARTER-001 has run for 2+ weekly ownership cycles. The Scoper is the first concrete agent and its build informs the auditor agent spec. Use the Scoper Agent Spec template as the seed for this agent. Read-only scope is a hard requirement: never write to business systems.',
    statusNote: 'New P2 deferred from 2026-04-28 deep audit. Concept is right but premature. Pinned now so the deferral has explicit gate language and the idea does not get lost between conversations.',
  },
  {
    id: 'SYSTEM-CLEANUP-AGENT-001',
    title: 'Bounded approval-gated cleanup executor',
    team: 'foundation',
    lane: 'scoped',
    priority: 'P2',
    rank: 51,
    source: '2026-04-27 Steve nightly system-cleanup conversation',
    summary: 'Write-capable bounded agent that acts on Steve-approved findings from SYSTEM-HEALTH-AUDITOR-001. Performs system-level cleanup (backlog state corrections, doc updates, file commits or reverts, stale-record archival) within strict scope. Never auto-mutates business systems. Every action requires explicit approval per finding.',
    whyItMatters: 'Health Auditor surfaces; Cleanup Agent acts. Without a paired execution path, the auditor produces findings that pile up and never close. Together they form the maintenance loop. Apart they are either useless (auditor-only) or dangerous (cleanup-only without review).',
    nextAction: 'Do not start until SYSTEM-HEALTH-AUDITOR-001 has been running for 2+ weeks producing approved findings without false positives. Hard rules: never auto-mutates business systems (FUB, ClickUp, KPI source-of-truth sheets); only operates on system meta (backlog state, docs, stale records, dirty files); every action requires explicit Steve approval per finding; full audit trail of who approved and what changed.',
    statusNote: 'New P2 deferred from 2026-04-28 deep audit. Sequenced after Health Auditor proves itself. Pinned now so the right ordering is enforced when the deferral gate hits.',
  },
]

const decisionsSeed = [
  {
    id: 'DEC-001',
    category: 'system',
    title: 'Canonical strategy stays in docs; volatile operating memory moves to the database',
    status: 'locked',
    summary: 'Business strategy and supporting strategy docs remain the human-readable source of truth. Daily-changing work such as backlog items, decisions, sessions, and parking-lot items belongs in the structured memory layer.',
    rationale: 'The old system already proved that markdown backlogs go stale. We want readable docs and durable operational memory, not one thing pretending to be both.',
    sourceRef: 'Old system backlog lessons + rebuild decisions',
    decisionOwner: 'Steve',
    confirmedBy: 'Steve',
    participantNames: ['Steve', 'Codex'],
    contextRef: 'Rebuild session decisions on 2026-04-11',
    evidenceNotes: 'Backfilled from the early rebuild decision seed and source reference during the first provenance rollout. Replace with an exact session/thread link later if needed.',
  },
  {
    id: 'DEC-002',
    category: 'strategy',
    title: 'North Star distinguishes the team goal from the downline goal',
    status: 'locked',
    summary: 'Benson Crew is building toward a $2B real estate team while growing the combined Benson Crew leadership downline at Real Broker toward 10,000 agents.',
    rationale: 'The $2B target is team production. The 10,000-agent target is the combined leadership downline at Real Broker, not Benson Crew headcount.',
    sourceRef: 'Business strategy lock pass',
    decisionOwner: 'Steve',
    confirmedBy: 'Steve',
    participantNames: ['Steve', 'Codex'],
    contextRef: 'Business strategy lock pass',
    evidenceNotes: 'Backfilled from the early rebuild decision seed and source reference during the first provenance rollout. Replace with an exact session/thread link later if needed.',
  },
  {
    id: 'DEC-003',
    category: 'system',
    title: 'Freedom Sheet sections are now treated as source contracts',
    status: 'locked',
    summary: 'A:E owns team/member data, G:O owns community/downline tracking, P:U owns community revenue, Agent Engine owns live operating assumptions, and BHAG Builder owns long-range targets.',
    rationale: 'The system must reference stable source IDs so the location can change later without breaking every consumer.',
    sourceRef: 'Freedom Sheet verification on 2026-04-12',
    decisionOwner: 'Steve',
    confirmedBy: 'Steve',
    participantNames: ['Steve', 'Codex'],
    contextRef: 'Freedom Sheet verification on 2026-04-12',
    evidenceNotes: 'Backfilled from the early rebuild decision seed and source reference during the first provenance rollout. Replace with an exact session/thread link later if needed.',
  },
  {
    id: 'DEC-004',
    category: 'system',
    title: 'Start with OpenClaw-native memory plus Postgres business memory',
    status: 'locked',
    summary: 'We are not building the full world-class memory layer from scratch first. We are starting with OpenClaw-native memory for agent recall and Postgres for business memory.',
    rationale: 'This gives us a strong baseline quickly, keeps data local, and leaves room to benchmark Honcho or Hindsight later if recall quality still falls short.',
    sourceRef: 'Memory architecture review',
    decisionOwner: 'Steve',
    confirmedBy: 'Steve',
    participantNames: ['Steve', 'Codex'],
    contextRef: 'Memory architecture review',
    evidenceNotes: 'Backfilled from the early rebuild decision seed and source reference during the first provenance rollout. Replace with an exact session/thread link later if needed.',
  },
  {
    id: 'DEC-005',
    category: 'system',
    title: 'Live values come from source contracts, not markdown snapshots',
    status: 'locked',
    summary: 'Strategy docs explain what the numbers mean and which source owns them. The system should render live values from source IDs so changes propagate across the full system.',
    rationale: 'Markdown is good for meaning and rules, but it is the wrong place to act as a live calculator. Source systems own mutable math.',
    sourceRef: 'Strategy lock pass on live source-of-truth rendering',
    decisionOwner: 'Steve',
    confirmedBy: 'Steve',
    participantNames: ['Steve', 'Codex'],
    contextRef: 'Strategy lock pass on live source-of-truth rendering',
    evidenceNotes: 'Backfilled from the early rebuild decision seed and source reference during the first provenance rollout. Replace with an exact session/thread link later if needed.',
  },
  {
    id: 'DEC-006',
    category: 'system',
    title: 'Source contracts must power source access in the UI',
    status: 'locked',
    summary: 'Every source-backed view should use structured source-contract metadata for source IDs, status, and open/edit access instead of hardcoded frontend links.',
    rationale: 'If source access lives in ad hoc UI code, users and agents lose trust quickly and the system drifts away from the real source of truth.',
    sourceRef: 'Foundation audit on 2026-04-13',
    decisionOwner: 'Steve',
    confirmedBy: 'Steve',
    participantNames: ['Steve', 'Codex'],
    contextRef: 'Foundation audit on 2026-04-13',
    evidenceNotes: 'Backfilled from the early rebuild decision seed and source reference during the first provenance rollout. Replace with an exact session/thread link later if needed.',
  },
  {
    id: 'DEC-007',
    category: 'system',
    title: 'The operating system should act as a live strategic operator, not just a passive recorder',
    status: 'locked',
    summary: 'The system should sit across leadership and department cadences, understand what teams are working on, compare activity against strategy and priorities, flag drift or low-value work, and help turn meeting decisions into structured follow-through in connected systems.',
    rationale: 'The point of the operating system is not just to store notes or summarize meetings. It should help keep the business on track in real time by connecting strategy, meetings, accountability, and execution.',
    sourceRef: 'Leadership meeting operator direction on 2026-04-14',
    decisionOwner: 'Steve',
    confirmedBy: 'Steve',
    participantNames: ['Steve', 'Codex'],
    contextRef: 'Leadership meeting operator direction on 2026-04-14',
    evidenceNotes: 'Backfilled from the early rebuild decision seed and source reference during the first provenance rollout. Replace with an exact meeting/session link later if needed.',
  },
]

const parkingLotSeed = [
  {
    id: 'PARK-001',
    title: 'Benchmark Honcho, Hindsight, and MemClaw after the native baseline is live',
    summary: 'We still want a world-class memory system, but we are not blocking the rebuild on the perfect tool choice before the baseline is enabled.',
    owner: 'Dev',
  },
  {
    id: 'PARK-002',
    title: 'Plan how to internalize scattered spreadsheet logic over time',
    summary: 'Some sheet logic will stay external for now, but we want a path to pull fragile source-of-truth math into the system where it makes sense.',
    owner: 'Dev',
  },
]

const openQuestionsSeed = [
  {
    id: 'Q-001',
    title: 'What is the final definition of the live attrition metric in the Agent Engine?',
    summary: 'Resolved for current Foundation purposes: planning attrition and live operating attrition are different metrics, and non-producing-agent departures should not count against production-roster attrition. Remaining hardening belongs in Agent Engine source docs and ENGINE-001, not this open-question queue.',
    owner: 'Strategy',
    status: 'resolved',
    resolvedAt: '2026-04-26T20:30:00.000Z',
    resolvedBy: 'codex',
    resolutionNote: 'Closed during Foundation Operations cleanup. The current operating rule is captured in Agent Engine docs and operating truths; ENGINE-001 owns later hardening of planning attrition as a first-class source-backed input.',
  },
  {
    id: 'Q-002',
    title: 'Which external sources should stay external versus be internalized over time?',
    summary: 'Resolved as a standing source-contract doctrine instead of a single open question. AIOS keeps external systems while they are source truth, maps them through source contracts, and internalizes only when a scoped backlog card proves the replacement boundary.',
    owner: 'Strategy',
    status: 'resolved',
    resolvedAt: '2026-04-26T20:30:00.000Z',
    resolvedBy: 'codex',
    resolutionNote: 'Closed during Foundation Operations cleanup. Data Sources, Systems, and the live Backlog now own source-by-source migration decisions; this broad question should not stay open forever.',
  },
  {
    id: 'Q-003',
    title: 'Where should partner commissions be normalized in the finance stack?',
    summary: 'Resolved out of the open-question queue and routed to FINANCE-001. Current reality is signed off: Weekly Actuals is source truth, and Cashflow Dash is the management interpretation layer that backs partner commissions out for current reporting. The deeper normalization policy is scoped finance work.',
    owner: 'Finance',
    status: 'resolved',
    resolvedAt: '2026-04-26T20:30:00.000Z',
    resolvedBy: 'codex',
    resolutionNote: 'Closed during Foundation Operations cleanup. Keep FINANCE-001 as the active work card; do not leave the same issue duplicated as an open question.',
  },
  {
    id: 'Q-004',
    title: 'What is the final row grain and unresolved field-definition boundary of the Owners Dashboard Admin tab?',
    summary: 'Resolved for Owners Admin v1. The signed-off rule is that a trade can have multiple credited rows; source fields and reporting fields must live on credited rows, while cash anchor fields stay on the anchor row. Remaining malformed trade and field cleanup belongs in data/backlog cards, not this open-question queue.',
    owner: 'Operations',
    status: 'resolved',
    resolvedAt: '2026-04-26T20:30:00.000Z',
    resolvedBy: 'codex',
    resolutionNote: 'Closed during Foundation Operations cleanup. Owners Admin v1 source-package closeout is done; remaining cleanup is routed through Ops findings and data/backlog cards such as DATA-010 rather than a stale open question.',
  },
  {
    id: 'Q-005',
    title: 'What are the remaining unresolved Admin-tab field definitions?',
    summary: 'Merged into Q-004 during the Foundation open-question cleanup. The remaining Admin-tab unknowns now live under the broader row-grain and field-definition question instead of existing as a duplicate.',
    owner: 'Operations',
    status: 'resolved',
    resolvedAt: '2026-04-15T23:39:57.225Z',
    resolvedBy: 'codex',
    resolutionNote: 'Merged into Q-004 during the Foundation open-question cleanup. The remaining Admin-tab unknowns are now tracked under the broader row-grain and field-definition question instead of living as a duplicate.',
  },
]

const memoryStatusSeed = [
  {
    componentKey: 'strategy-docs',
    label: 'Strategy Docs',
    status: 'live',
    detail: 'Canonical strategy and supporting docs live in the repo and are rendered in the dashboard.',
  },
  {
    componentKey: 'business-db',
    label: 'Business Memory DB',
    status: 'live',
    detail: 'PostgreSQL is running locally on the Mac mini and is now backing the first memory/backlog layer.',
  },
  {
    componentKey: 'openclaw-native-memory',
    label: 'OpenClaw Native Memory',
    status: 'pending',
    detail: 'The OpenClaw workspace is pointed at the repo, but native memory plugins still need to be configured and tested.',
  },
  {
    componentKey: 'shared-cross-tool-memory',
    label: 'Advanced Shared Memory',
    status: 'planned',
    detail: 'Honcho, Hindsight, and MemClaw stay on the evaluation path after the native baseline is working.',
  },
  {
    componentKey: 'source-health',
    label: 'Source Health Monitoring',
    status: 'planned',
    detail: 'Freedom Sheet adapters and schema-drift alerts are not wired yet. They are a near-term dev priority.',
  },
]

const BHAG_DOC_PATH = 'docs/strategy/bhag-model.md'
const AGENT_ENGINE_DOC_PATH = 'docs/strategy/agent-engine.md'
const FREEDOM_SHEET_ID = '1fyPB-g_B08okE01G3L0tzUTaJiuivrSBo1RqMYHt2Dw'
const OWNERS_SHEET_ID = '18FZ6lzS17mzKk9_45naSlCNXgTJu3CEotYLuYz_xLSk'
const TORONTO_TIMEZONE = 'America/Toronto'
const MONTH_INDEX = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
}

const docSourceSnapshotsSeed = [
  {
    id: 'DOCSNAP-001',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2026',
    value: '$310M',
    detail: '10-year team sales-volume targets from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 1,
  },
  {
    id: 'DOCSNAP-002',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2027',
    value: '$341M',
    detail: '10-year team sales-volume targets from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 2,
  },
  {
    id: 'DOCSNAP-003',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2028',
    value: '$392M',
    detail: '10-year team sales-volume targets from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 3,
  },
  {
    id: 'DOCSNAP-004',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2029',
    value: '$471M',
    detail: '10-year team sales-volume targets from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 4,
  },
  {
    id: 'DOCSNAP-005',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2030',
    value: '$588M',
    detail: '10-year team sales-volume targets from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 5,
  },
  {
    id: 'DOCSNAP-006',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2031',
    value: '$751M',
    detail: '10-year team sales-volume targets from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 6,
  },
  {
    id: 'DOCSNAP-007',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2032',
    value: '$960M',
    detail: '10-year team sales-volume targets from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 7,
  },
  {
    id: 'DOCSNAP-008',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2033',
    value: '$1.23B',
    detail: '10-year team sales-volume targets from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 8,
  },
  {
    id: 'DOCSNAP-009',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2034',
    value: '$1.57B',
    detail: '10-year team sales-volume targets from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 9,
  },
  {
    id: 'DOCSNAP-010',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Team Goal: $2B',
    label: '2035',
    value: '$2.0B',
    detail: '10-year team sales-volume targets from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 10,
  },
  {
    id: 'DOCSNAP-011',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-OWNERS-001',
    groupTitle: 'Team Goal: $2B',
    label: 'Actual',
    value: '$43.95M YTD',
    detail: 'Executed-date volume from the Owners Dashboard (Volume Credit filtered by Date Firm/Executed in 2026).',
    asOf: '2026-04-12',
    sortOrder: 11,
  },
  {
    id: 'DOCSNAP-012',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-OWNERS-001',
    groupTitle: 'Team Goal: $2B',
    label: 'Pace',
    value: 'Behind by $41.79M (-48.7%)',
    detail: 'Executed-date volume from the Owners Dashboard (Volume Credit filtered by Date Firm/Executed in 2026).',
    asOf: '2026-04-12',
    sortOrder: 12,
  },
  {
    id: 'DOCSNAP-015',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: '2026',
    value: '700 agents',
    detail: '10-year community target path from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 1,
  },
  {
    id: 'DOCSNAP-016',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: '2027',
    value: '770 agents',
    detail: '10-year community target path from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 2,
  },
  {
    id: 'DOCSNAP-017',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: '2028',
    value: '886 agents',
    detail: '10-year community target path from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 3,
  },
  {
    id: 'DOCSNAP-018',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: '2029',
    value: '1,063 agents',
    detail: '10-year community target path from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 4,
  },
  {
    id: 'DOCSNAP-019',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: '2030',
    value: '1,329 agents',
    detail: '10-year community target path from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 5,
  },
  {
    id: 'DOCSNAP-020',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: '2031',
    value: '1,990 agents',
    detail: '10-year community target path from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 6,
  },
  {
    id: 'DOCSNAP-021',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: '2032',
    value: '2,980 agents',
    detail: '10-year community target path from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 7,
  },
  {
    id: 'DOCSNAP-022',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: '2033',
    value: '4,462 agents',
    detail: '10-year community target path from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 8,
  },
  {
    id: 'DOCSNAP-023',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: '2034',
    value: '6,681 agents',
    detail: '10-year community target path from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 9,
  },
  {
    id: 'DOCSNAP-024',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-BHAG-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: '2035',
    value: '10,000 agents',
    detail: '10-year community target path from the Benson Crew BHAG Builder.',
    asOf: '2026-04-13',
    sortOrder: 10,
  },
  {
    id: 'DOCSNAP-025',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-COMMUNITY-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: 'Started 2026',
    value: '643 agents',
    detail: 'Current combined ownership-group downline pace from the Freedom Sheet community tracker.',
    asOf: '2026-01-01',
    sortOrder: 11,
  },
  {
    id: 'DOCSNAP-032',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-COMMUNITY-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: 'Actual',
    value: '675 agents',
    detail: 'Current combined ownership-group downline pace from the Freedom Sheet community tracker.',
    asOf: '2026-04-01',
    sortOrder: 12,
  },
  {
    id: 'DOCSNAP-033',
    docPath: 'docs/strategy/bhag-model.md',
    sourceId: 'SRC-FREEDOM-COMMUNITY-001',
    groupTitle: 'Community Goal: 10,000 Agents',
    label: 'Pace',
    value: 'Behind by 25 agents (-3.6%)',
    detail: 'Current combined ownership-group downline pace from the Freedom Sheet community tracker.',
    asOf: '2026-04-01',
    sortOrder: 13,
  },
]

function getTorontoDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TORONTO_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })

  return formatter.formatToParts(date).reduce((acc, part) => {
    if (part.type === 'year' || part.type === 'month' || part.type === 'day') {
      acc[part.type] = Number(part.value)
    }
    return acc
  }, {})
}

function getTodayTorontoIso() {
  const parts = getTorontoDateParts()
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

function getDayOfYearToronto() {
  const parts = getTorontoDateParts()
  const start = Date.UTC(parts.year, 0, 1)
  const current = Date.UTC(parts.year, parts.month - 1, parts.day)
  return Math.floor((current - start) / 86400000) + 1
}

function daysInTorontoYear(year) {
  return new Date(Date.UTC(year, 1, 29)).getUTCDate() === 29 ? 366 : 365
}

function parseNumber(value) {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const normalized = value.replace(/[$,%\s,]/g, '')
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function sheetSerialToDate(serial) {
  const numeric = parseNumber(serial)
  if (!Number.isFinite(numeric)) return null
  return new Date(Math.round((numeric - 25569) * 86400 * 1000))
}

function formatCompactCurrency(value) {
  const numeric = parseNumber(value) || 0
  const abs = Math.abs(numeric)

  if (abs >= 1_000_000_000) return `$${(numeric / 1_000_000_000).toFixed(2).replace(/\.00$/, '')}B`
  if (abs >= 1_000_000) return `$${(numeric / 1_000_000).toFixed(0)}M`
  if (abs >= 1_000) return `$${(numeric / 1_000).toFixed(0)}K`
  return `$${Math.round(numeric)}`
}

function formatAgentCount(value) {
  const numeric = Math.round(parseNumber(value) || 0)
  return `${numeric.toLocaleString('en-CA')} agents`
}

function formatAgentCountPrecise(value) {
  const numeric = parseNumber(value)
  if (!Number.isFinite(numeric)) return '—'
  const rounded = Math.round(numeric * 10) / 10
  return `${(rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(1))} agents`
}

function formatAgentCountCeil(value) {
  const numeric = parseNumber(value)
  if (!Number.isFinite(numeric)) return '—'
  return `${Math.ceil(numeric).toLocaleString('en-CA')} agents`
}

function formatMonthlyAgentRate(value) {
  const numeric = parseNumber(value)
  if (!Number.isFinite(numeric)) return '—'
  const rounded = Math.round(numeric * 10) / 10
  return `${(rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(1))} / mo`
}

function formatPercent(value) {
  const numeric = parseNumber(value)
  if (!Number.isFinite(numeric)) return '—'
  return `${Math.round(numeric * 100)}%`
}

function formatCurrencyDelta(value) {
  const numeric = parseNumber(value)
  if (!Number.isFinite(numeric)) return '—'
  return formatCompactCurrency(Math.abs(numeric))
}

function formatAgentDelta(value) {
  const numeric = parseNumber(value)
  if (!Number.isFinite(numeric)) return '—'
  return `${Math.round(Math.abs(numeric)).toLocaleString('en-CA')} agents`
}

function formatPointDelta(value) {
  const numeric = parseNumber(value)
  if (!Number.isFinite(numeric)) return '—'
  const points = Math.abs(numeric * 100)
  const rounded = Math.round(points * 10) / 10
  return `${(rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(1))} pts`
}

function formatPaceLabel(diff, unitFormatter) {
  const abs = Math.abs(diff)
  const direction = diff >= 0 ? 'Ahead' : 'Behind'
  return `${direction} by ${unitFormatter(abs)}`
}

function formatPaceWithPercent(diff, baseline, unitFormatter) {
  const pct = baseline ? Math.abs(diff) / baseline : 0
  const sign = diff >= 0 ? '+' : '-'
  return `${formatPaceLabel(diff, unitFormatter)} (${sign}${(pct * 100).toFixed(1)}%)`
}

function monthYearToIso(monthName, year) {
  const monthKey = String(monthName || '').trim().toLowerCase()
  const monthIndex = MONTH_INDEX[monthKey]
  const numericYear = parseNumber(year)
  if (monthIndex == null || !numericYear) return getTodayTorontoIso()
  return `${numericYear}-${String(monthIndex + 1).padStart(2, '0')}-01`
}

function buildBhagYearRows(groupTitle, rows, sourceId, detail, valueFormatter, startYear = 2026) {
  return rows.flatMap((row, index) => {
    const yearLabel = String(startYear + index)
    return [
      {
        docPath: BHAG_DOC_PATH,
        sourceId,
        groupTitle,
        label: yearLabel,
        value: valueFormatter(row[0]),
        detail,
        asOf: getTodayTorontoIso(),
        sortOrder: index + 1,
      },
      {
        docPath: BHAG_DOC_PATH,
        sourceId,
        groupTitle,
        label: `Growth ${yearLabel}`,
        value: formatPercent(row[1]),
        detail,
        asOf: getTodayTorontoIso(),
        sortOrder: 100 + index + 1,
      },
    ]
  })
}

function buildEngineMetricRow(groupTitle, label, value, detail, sortOrder, sourceId = 'SRC-FREEDOM-ENGINE-001') {
  return {
    docPath: AGENT_ENGINE_DOC_PATH,
    sourceId,
    groupTitle,
    label,
    value,
    detail,
    asOf: getTodayTorontoIso(),
    sortOrder,
  }
}

async function getLiveAgentEngineSourceSnapshot() {
  const currentYear = getTorontoDateParts().year
  const yearStart = 2026
  const [bhagCalcRes, bhagTargetsRes, engineRes] = await Promise.all([
    getSheetValues('service-account', FREEDOM_SHEET_ID, "'Benson Crew Bhag Builder'!A22:B31"),
    getSheetValues('service-account', FREEDOM_SHEET_ID, "'Benson Crew Bhag Builder'!K4:L13"),
    getSheetValues('service-account', FREEDOM_SHEET_ID, "'Agent Engine'!A1:K10"),
  ])

  const calcRows = bhagCalcRes.values || []
  const calcMap = {}
  calcRows.forEach(row => {
    const key = String(row?.[0] || '').trim()
    if (!key || row?.[1] == null) return
    calcMap[key] = row[1]
  })

  function getCalcMetric(...keys) {
    for (const key of keys) {
      const numeric = parseNumber(calcMap[key])
      if (Number.isFinite(numeric)) return numeric
    }
    return null
  }

  const annualVolumeAverage = getCalcMetric('Annual Volume Average', 'Agent Annual Volume Average')
  const teamSplit = getCalcMetric('Split to Team')
  const monthlyGciAverage = getCalcMetric('Average Monthly GCI', 'Agent Average Monthly GCI')
  const planningAttritionAssumption = getCalcMetric('Planning Attrition Assumption')

  const targetRows = (bhagTargetsRes.values || [])
    .map(row => [parseNumber(row[0]), parseNumber(row[1])])
    .filter(row => Number.isFinite(row[0]))

  const values = engineRes.values || []
  const requiredRecruitingPace = parseNumber(values[2]?.[1])
  const recruitingSixMonth = parseNumber(values[3]?.[1])
  const attritionRate = parseNumber(values[4]?.[1])
  const avgAdditions = parseNumber(values[5]?.[1])
  const avgAttrition = parseNumber(values[6]?.[1])

  const activeAgents = parseNumber(values[2]?.[4])

  const avgProduction = parseNumber(values[2]?.[7])
  const productionTarget = Number.isFinite(monthlyGciAverage)
    ? monthlyGciAverage
    : parseNumber(values[3]?.[7])

  const actualSplit = parseNumber(values[2]?.[10])
  const targetSplit = parseNumber(values[3]?.[10])

  const currentYearIndex = Math.max(0, Math.min(currentYear - yearStart, targetRows.length - 1))
  const currentYearVolumeTarget = targetRows[currentYearIndex]?.[0]
  const requiredAgentsThisYear = Number.isFinite(currentYearVolumeTarget) && Number.isFinite(annualVolumeAverage) && annualVolumeAverage > 0
    ? currentYearVolumeTarget / annualVolumeAverage
    : null
  const requiredAgentsThisYearDisplay = Number.isFinite(requiredAgentsThisYear)
    ? Math.ceil(requiredAgentsThisYear)
    : null

  const nextYear = Math.min(currentYear + 1, yearStart + targetRows.length - 1)
  const nextYearIndex = Math.max(0, nextYear - yearStart)
  const nextYearVolumeTarget = targetRows[nextYearIndex]?.[0]
  const requiredStartAgents = Number.isFinite(nextYearVolumeTarget) && Number.isFinite(annualVolumeAverage) && annualVolumeAverage > 0
    ? nextYearVolumeTarget / annualVolumeAverage
    : parseNumber(values[3]?.[4])
  const requiredStartAgentsDisplay = Number.isFinite(requiredStartAgents)
    ? Math.ceil(requiredStartAgents)
    : null

  const recruitingGap = Number.isFinite(requiredRecruitingPace) && Number.isFinite(recruitingSixMonth)
    ? recruitingSixMonth - requiredRecruitingPace
    : null
  const capacityGap = Number.isFinite(activeAgents) && Number.isFinite(requiredStartAgentsDisplay)
    ? activeAgents - requiredStartAgentsDisplay
    : parseNumber(values[4]?.[4])
  const currentYearGap = Number.isFinite(activeAgents) && Number.isFinite(requiredAgentsThisYearDisplay)
    ? activeAgents - requiredAgentsThisYearDisplay
    : null
  const splitGap = Number.isFinite(actualSplit) && Number.isFinite(targetSplit)
    ? actualSplit - targetSplit
    : parseNumber(values[4]?.[10])
  const productionGap = Number.isFinite(avgProduction) && Number.isFinite(productionTarget)
    ? avgProduction - productionTarget
    : null

  const inputsDetail = 'Live productivity and unit-economics assumptions from the Benson Crew BHAG Builder.'
  const pathDetail = 'Required agent counts at the current annual volume average per agent.'
  const requirementBhagDetail = 'What the model needs next, using the BHAG builder and current productivity assumption.'
  const requirementEngineDetail = 'Current recruiting and capacity read from the Freedom KPI Sheet Agent Engine tab.'

  const snapshot = [
    {
      docPath: AGENT_ENGINE_DOC_PATH,
      sourceId: 'SRC-FREEDOM-BHAG-001',
      groupTitle: 'Engine Inputs',
      label: 'Average Monthly GCI',
      value: `${formatCompactCurrency(monthlyGciAverage)} / mo`,
      detail: inputsDetail,
      asOf: getTodayTorontoIso(),
      sortOrder: 1,
    },
    {
      docPath: AGENT_ENGINE_DOC_PATH,
      sourceId: 'SRC-FREEDOM-BHAG-001',
      groupTitle: 'Engine Inputs',
      label: 'Split to Team',
      value: formatPercent(teamSplit),
      detail: inputsDetail,
      asOf: getTodayTorontoIso(),
      sortOrder: 2,
    },
  ]

  targetRows.forEach((row, index) => {
    const yearLabel = String(yearStart + index)
    const requiredAgents = Number.isFinite(annualVolumeAverage) && annualVolumeAverage > 0
      ? row[0] / annualVolumeAverage
      : null

    snapshot.push(
      {
        docPath: AGENT_ENGINE_DOC_PATH,
        sourceId: 'SRC-FREEDOM-BHAG-001',
        groupTitle: 'Required Agent Path',
        label: yearLabel,
        value: formatCompactCurrency(row[0]),
        detail: pathDetail,
        asOf: getTodayTorontoIso(),
        sortOrder: index + 1,
      },
      {
        docPath: AGENT_ENGINE_DOC_PATH,
        sourceId: 'SRC-FREEDOM-BHAG-001',
        groupTitle: 'Required Agent Path',
        label: `Required Agents ${yearLabel}`,
        value: formatAgentCountCeil(requiredAgents),
        detail: pathDetail,
        asOf: getTodayTorontoIso(),
        sortOrder: 100 + index + 1,
      },
    )
  })

  snapshot.push(
    {
      docPath: AGENT_ENGINE_DOC_PATH,
      sourceId: 'SRC-FREEDOM-BHAG-001',
      groupTitle: 'Current Requirement',
      label: 'Current-Year Volume Target',
      value: formatCompactCurrency(currentYearVolumeTarget),
      detail: requirementBhagDetail,
      asOf: getTodayTorontoIso(),
      sortOrder: 1,
    },
    {
      docPath: AGENT_ENGINE_DOC_PATH,
      sourceId: 'SRC-FREEDOM-BHAG-001',
      groupTitle: 'Current Requirement',
      label: 'Required Agents This Year',
      value: formatAgentCountCeil(requiredAgentsThisYearDisplay),
      detail: requirementBhagDetail,
      asOf: getTodayTorontoIso(),
      sortOrder: 2,
    },
    {
      docPath: AGENT_ENGINE_DOC_PATH,
      sourceId: 'SRC-FREEDOM-BHAG-001',
      groupTitle: 'Current Requirement',
      label: 'Next-Year Volume Target',
      value: formatCompactCurrency(nextYearVolumeTarget),
      detail: requirementBhagDetail,
      asOf: getTodayTorontoIso(),
      sortOrder: 3,
    },
    {
      docPath: AGENT_ENGINE_DOC_PATH,
      sourceId: 'SRC-FREEDOM-BHAG-001',
      groupTitle: 'Current Requirement',
      label: 'Required Start-of-Year Agents',
      value: formatAgentCountCeil(requiredStartAgentsDisplay),
      detail: requirementBhagDetail,
      asOf: getTodayTorontoIso(),
      sortOrder: 4,
    },
    buildEngineMetricRow('Current Requirement', 'Current Active Agents', formatAgentCountPrecise(activeAgents), requirementEngineDetail, 5),
    buildEngineMetricRow('Current Requirement', 'Gap This Year', formatPaceWithPercent(currentYearGap, requiredAgentsThisYearDisplay, formatAgentDelta), requirementEngineDetail, 6),
    buildEngineMetricRow('Current Requirement', 'Gap to Next Year', formatPaceWithPercent(capacityGap, requiredStartAgentsDisplay, formatAgentDelta), requirementEngineDetail, 7),
    buildEngineMetricRow('Current Requirement', 'Required Recruiting Pace', formatMonthlyAgentRate(requiredRecruitingPace), requirementEngineDetail, 8),
    buildEngineMetricRow('Current Requirement', 'Current Recruiting Pace', formatMonthlyAgentRate(recruitingSixMonth), requirementEngineDetail, 9),
    buildEngineMetricRow('Current Requirement', 'Current Avg Production / Agent', `${formatCompactCurrency(avgProduction)} / mo`, requirementEngineDetail, 10),
    buildEngineMetricRow('Current Requirement', 'Production Target / Agent', `${formatCompactCurrency(productionTarget)} / mo`, requirementBhagDetail, 11, 'SRC-FREEDOM-BHAG-001'),
    buildEngineMetricRow('Current Requirement', 'Production Gap', formatPaceWithPercent(productionGap, productionTarget, formatCurrencyDelta), requirementEngineDetail, 12),
    buildEngineMetricRow(
      'Current Requirement',
      'Planning Attrition Assumption',
      formatPercent(planningAttritionAssumption),
      'The planning attrition rate now comes from the BHAG builder assumptions and feeds the required recruiting formula.',
      13,
      'SRC-FREEDOM-BHAG-001'
    ),
    buildEngineMetricRow('Current Requirement', 'Live Attrition Pressure', formatPercent(attritionRate), requirementEngineDetail, 14),
    buildEngineMetricRow('Current Requirement', 'Avg Additions / Month', formatMonthlyAgentRate(avgAdditions), requirementEngineDetail, 15),
    buildEngineMetricRow('Current Requirement', 'Avg Attrition / Month', formatMonthlyAgentRate(avgAttrition), requirementEngineDetail, 16),
    buildEngineMetricRow('Current Requirement', 'Actual Split', formatPercent(actualSplit), requirementEngineDetail, 17),
    buildEngineMetricRow('Current Requirement', 'Target Split', formatPercent(targetSplit), requirementEngineDetail, 18),
    buildEngineMetricRow('Current Requirement', 'Split Gap', `${splitGap >= 0 ? 'Above target' : 'Below target'} by ${formatPointDelta(splitGap)}`, requirementEngineDetail, 19),
  )

  return snapshot
}

async function getLiveBhagSourceSnapshot() {
  const currentYear = getTorontoDateParts().year
  const yearStart = 2026
  const [teamTargetsRes, communityTargetsRes, communityTrackerRes, ownersRes] = await Promise.all([
    getSheetValues('service-account', FREEDOM_SHEET_ID, "'Benson Crew Bhag Builder'!K4:L13"),
    getSheetValues('service-account', FREEDOM_SHEET_ID, "'Benson Crew Bhag Builder'!K20:L29"),
    getSheetValues('service-account', FREEDOM_SHEET_ID, "'Data Entry - BCrew Team/Community'!G1:O80"),
    getSheetValues('service-account', OWNERS_SHEET_ID, "'ADMIN ONLY - Deal Data Entry'!G:AI"),
  ])

  const teamTargetRows = (teamTargetsRes.values || [])
    .map(row => [parseNumber(row[0]), parseNumber(row[1])])
    .filter(row => Number.isFinite(row[0]))
  const communityTargetRows = (communityTargetsRes.values || [])
    .map(row => [parseNumber(row[0]), parseNumber(row[1])])
    .filter(row => Number.isFinite(row[0]))

  const snapshot = []
  snapshot.push(
    ...buildBhagYearRows(
      'Team Goal: $2B',
      teamTargetRows,
      'SRC-FREEDOM-BHAG-001',
      'Live 2026-2035 team target path from the Benson Crew BHAG Builder.',
      formatCompactCurrency,
      yearStart,
    ),
  )

  const teamCurrentTarget = teamTargetRows[currentYear - yearStart]?.[0] || teamTargetRows[0]?.[0] || 0
  const ownersRows = ownersRes.values || []
  const ownersHeader = ownersRows[0] || []
  const volumeIdx = ownersHeader.findIndex(value => String(value).trim() === 'Volume Credit')
  let actualVolumeYtd = 0

  ownersRows.slice(1).forEach(row => {
    const executedDate = sheetSerialToDate(row[0])
    const volumeCredit = parseNumber(row[volumeIdx])
    if (!executedDate || !Number.isFinite(volumeCredit)) return
    if (executedDate.getUTCFullYear() !== currentYear) return
    actualVolumeYtd += volumeCredit
  })

  const targetToDate = teamCurrentTarget * (getDayOfYearToronto() / daysInTorontoYear(currentYear))
  const teamDiff = actualVolumeYtd - targetToDate
  snapshot.push(
    {
      docPath: BHAG_DOC_PATH,
      sourceId: 'SRC-OWNERS-001',
      groupTitle: 'Team Goal: $2B',
      label: 'Should Be',
      value: formatCompactCurrency(targetToDate),
      detail: 'Prorated team target-to-date for the current year, based on Eastern time.',
      asOf: getTodayTorontoIso(),
      sortOrder: 11,
    },
    {
      docPath: BHAG_DOC_PATH,
      sourceId: 'SRC-OWNERS-001',
      groupTitle: 'Team Goal: $2B',
      label: 'Actual',
      value: `${formatCompactCurrency(actualVolumeYtd)} YTD`,
      detail: 'Executed-date volume from the Owners Dashboard (Volume Credit filtered by Date Firm/Executed in the current year).',
      asOf: getTodayTorontoIso(),
      sortOrder: 12,
    },
    {
      docPath: BHAG_DOC_PATH,
      sourceId: 'SRC-OWNERS-001',
      groupTitle: 'Team Goal: $2B',
      label: 'Pace',
      value: formatPaceWithPercent(teamDiff, targetToDate, formatCompactCurrency),
      detail: 'Executed-date volume from the Owners Dashboard (Volume Credit filtered by Date Firm/Executed in the current year).',
      asOf: getTodayTorontoIso(),
      sortOrder: 13,
    },
  )

  snapshot.push(
    ...buildBhagYearRows(
      'Community Goal: 10,000 Agents',
      communityTargetRows,
      'SRC-FREEDOM-BHAG-001',
      'Live 2026-2035 community target path from the Benson Crew BHAG Builder.',
      formatAgentCount,
      yearStart,
    ),
  )

  const communityRows = (communityTrackerRes.values || []).slice(2).map(row => ({
    month: row[0],
    year: parseNumber(row[1]),
    totalCommunity: parseNumber(row[3]),
  }))
  const currentYearCommunityRows = communityRows.filter(row => row.year === currentYear && Number.isFinite(row.totalCommunity) && row.totalCommunity > 0)
  const startedRow = currentYearCommunityRows[0] || null
  const latestRow = currentYearCommunityRows[currentYearCommunityRows.length - 1] || null
  const communityCurrentTarget = communityTargetRows[currentYear - yearStart]?.[0] || communityTargetRows[0]?.[0] || 0
  const communityStarted = startedRow?.totalCommunity || 0
  const actualCommunity = latestRow?.totalCommunity || 0
  const communityTargetToDate = communityStarted + ((communityCurrentTarget - communityStarted) * (getDayOfYearToronto() / daysInTorontoYear(currentYear)))
  const communityDiff = actualCommunity - communityTargetToDate

  snapshot.push(
    {
      docPath: BHAG_DOC_PATH,
      sourceId: 'SRC-FREEDOM-COMMUNITY-001',
      groupTitle: 'Community Goal: 10,000 Agents',
      label: 'Should Be',
      value: formatAgentCount(communityTargetToDate),
      detail: 'Prorated community target-to-date for the current year, based on Eastern time.',
      asOf: latestRow ? monthYearToIso(latestRow.month, latestRow.year) : getTodayTorontoIso(),
      sortOrder: 12,
    },
    {
      docPath: BHAG_DOC_PATH,
      sourceId: 'SRC-FREEDOM-COMMUNITY-001',
      groupTitle: 'Community Goal: 10,000 Agents',
      label: 'Actual',
      value: formatAgentCount(actualCommunity),
      detail: 'Current combined ownership-group downline pace from the Freedom Sheet community tracker.',
      asOf: latestRow ? monthYearToIso(latestRow.month, latestRow.year) : getTodayTorontoIso(),
      sortOrder: 13,
    },
    {
      docPath: BHAG_DOC_PATH,
      sourceId: 'SRC-FREEDOM-COMMUNITY-001',
      groupTitle: 'Community Goal: 10,000 Agents',
      label: 'Pace',
      value: formatPaceWithPercent(communityDiff, communityTargetToDate, formatAgentCount),
      detail: 'Current combined ownership-group downline pace from the Freedom Sheet community tracker.',
      asOf: latestRow ? monthYearToIso(latestRow.month, latestRow.year) : getTodayTorontoIso(),
      sortOrder: 14,
    },
  )

  return snapshot
}

async function seedTable(client, tableName, rows, insertSql, valuesBuilder) {
  for (const row of rows) {
    const values = valuesBuilder(row)
    await client.query(insertSql, values)
  }
}

function getBacklogIdPrefixes() {
  return Array.from(new Set(backlogSeed.map(item => String(item.id || '').split('-')[0]).filter(Boolean))).sort()
}

function getBacklogScopes() {
  return backlogScopeDefinitions.map(scope => ({ ...scope }))
}

function normalizeBacklogScopeKey(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return ''
  return legacyBacklogScopeMap[normalized] || normalized
}

function mapBacklogRow(row) {
  const scope = normalizeBacklogScopeKey(row.scope ?? row.team)
  return {
    id: row.id,
    title: row.title,
    scope,
    team: scope,
    lane: row.lane,
    priority: row.priority,
    rank: row.rank,
    source: row.source,
    summary: row.summary,
    whyItMatters: row.why_it_matters ?? row.whyItMatters,
    nextAction: row.next_action ?? row.nextAction,
    statusNote: row.status_note ?? row.statusNote,
    owner: row.owner,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
}

export async function getBacklogItemsByIds(ids = []) {
  const normalizedIds = Array.from(new Set(
    (Array.isArray(ids) ? ids : [])
      .map(id => String(id || '').trim())
      .filter(Boolean)
  ))

  if (!normalizedIds.length) return []

  const result = await pool.query(
    `
      SELECT id, title, team, lane, priority, rank, source, summary, why_it_matters AS "whyItMatters",
             next_action AS "nextAction", status_note AS "statusNote", owner, created_at, updated_at
      FROM backlog_items
      WHERE id = ANY($1::text[])
      ORDER BY CASE team ${backlogScopeOrderSql} ELSE 999 END,
               rank NULLS LAST,
               created_at ASC
    `,
    [normalizedIds]
  )

  return result.rows.map(mapBacklogRow)
}

const backlogSeedStableFields = ['title', 'team', 'source', 'summary', 'whyItMatters']
const backlogSeedMutableFields = ['lane', 'priority', 'rank', 'nextAction', 'statusNote']

function normalizeBacklogSeedComparableValue(field, value) {
  if (value === undefined || value === null) return null
  if (field === 'rank') {
    const numericValue = Number(value)
    return Number.isFinite(numericValue) ? numericValue : null
  }
  if (field === 'team') return normalizeBacklogScopeKey(value)
  return String(value).trim().replace(/\s+/g, ' ')
}

function normalizeBacklogSeedComparableRow(row) {
  const mapped = mapBacklogRow(row)
  return {
    id: mapped.id,
    title: mapped.title,
    team: mapped.team,
    lane: mapped.lane,
    priority: mapped.priority,
    rank: mapped.rank,
    source: mapped.source,
    summary: mapped.summary,
    whyItMatters: mapped.whyItMatters,
    nextAction: mapped.nextAction,
    statusNote: mapped.statusNote,
    updatedAt: mapped.updatedAt || null,
  }
}

function compareBacklogSeedFields(seedRow, liveRow, fields) {
  return fields
    .map(field => {
      const seedValue = seedRow[field]
      const liveValue = liveRow[field]
      const normalizedSeed = normalizeBacklogSeedComparableValue(field, seedValue)
      const normalizedLive = normalizeBacklogSeedComparableValue(field, liveValue)
      if (normalizedSeed === normalizedLive) return null
      return {
        field,
        seedValue,
        liveValue,
      }
    })
    .filter(Boolean)
}

export async function getBacklogSeedDriftSnapshot(options = {}) {
  const parsedLimit = Number(options.limit ?? 50)
  const limit = Number.isFinite(parsedLimit) && parsedLimit >= 0 ? Math.floor(parsedLimit) : 50
  const seedRows = backlogSeed.map(normalizeBacklogSeedComparableRow)
  const seedIds = seedRows.map(row => row.id).filter(Boolean)

  if (!seedIds.length) {
    return {
      generatedAt: new Date().toISOString(),
      policy: 'Live Postgres backlog is operational truth. backlogSeed is bootstrap/default doctrine until promoted through explicit migration or review.',
      seedRows: 0,
      liveSeedRows: 0,
      missingLiveIds: [],
      stableFields: backlogSeedStableFields,
      mutableFields: backlogSeedMutableFields,
      stableMismatchCount: 0,
      mutableMismatchCount: 0,
      totalMismatchCount: 0,
      rowsWithStableDrift: 0,
      rowsWithMutableDrift: 0,
      driftItemCount: 0,
      items: [],
    }
  }

  const result = await pool.query(
    `
      SELECT id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note, updated_at
      FROM backlog_items
      WHERE id = ANY($1::text[])
    `,
    [seedIds]
  )
  const liveById = new Map(result.rows.map(row => [row.id, normalizeBacklogSeedComparableRow(row)]))
  const missingLiveIds = []
  const items = []
  let driftItemCount = 0
  let stableMismatchCount = 0
  let mutableMismatchCount = 0
  let rowsWithStableDrift = 0
  let rowsWithMutableDrift = 0

  for (const seedRow of seedRows) {
    const liveRow = liveById.get(seedRow.id)
    if (!liveRow) {
      missingLiveIds.push(seedRow.id)
      driftItemCount += 1
      stableMismatchCount += backlogSeedStableFields.length
      rowsWithStableDrift += 1
      if (items.length < limit) {
        items.push({
          id: seedRow.id,
          title: seedRow.title,
          status: 'missing_live_row',
          stableMismatches: backlogSeedStableFields.map(field => ({
            field,
            seedValue: seedRow[field],
            liveValue: null,
          })),
          mutableMismatches: [],
        })
      }
      continue
    }

    const stableMismatches = compareBacklogSeedFields(seedRow, liveRow, backlogSeedStableFields)
    const mutableMismatches = compareBacklogSeedFields(seedRow, liveRow, backlogSeedMutableFields)
    if (!stableMismatches.length && !mutableMismatches.length) continue

    driftItemCount += 1
    stableMismatchCount += stableMismatches.length
    mutableMismatchCount += mutableMismatches.length
    if (stableMismatches.length) rowsWithStableDrift += 1
    if (mutableMismatches.length) rowsWithMutableDrift += 1

    if (items.length < limit) {
      items.push({
        id: seedRow.id,
        title: liveRow.title || seedRow.title,
        status: stableMismatches.length ? 'requires_promotion_review' : 'live_state_differs_from_seed',
        liveUpdatedAt: liveRow.updatedAt,
        stableMismatches,
        mutableMismatches,
      })
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    policy: 'Live Postgres backlog is operational truth. backlogSeed is bootstrap/default doctrine until promoted through explicit migration or review.',
    seedRows: seedRows.length,
    liveSeedRows: result.rows.length,
    missingLiveIds,
    stableFields: backlogSeedStableFields,
    mutableFields: backlogSeedMutableFields,
    stableMismatchCount,
    mutableMismatchCount,
    totalMismatchCount: stableMismatchCount + mutableMismatchCount,
    rowsWithStableDrift,
    rowsWithMutableDrift,
    driftItemCount,
    items,
  }
}

function getRegisteredSourceIds() {
  return getSourceContracts()
    .map(source => source.sourceId || source.id)
    .filter(Boolean)
    .sort()
}

function mapDbAuditCountRow(row) {
  return {
    relation: row.relation,
    value: row.value,
    count: Number(row.count || 0),
  }
}

export async function getFoundationDbConstraintAudit(options = {}) {
  const parsedLimit = Number(options.limit ?? 50)
  const limit = Number.isFinite(parsedLimit) && parsedLimit >= 0 ? Math.floor(parsedLimit) : 50
  const registeredSourceIds = Array.isArray(options.sourceIds) && options.sourceIds.length
    ? options.sourceIds
    : getRegisteredSourceIds()

  const [decisionCategoryResult, sourceReferenceResult, docUpdateStateResult] = await Promise.all([
    pool.query(
      `
        SELECT 'decisions.category' AS relation, category AS value, COUNT(*)::int AS count
        FROM decisions
        WHERE NOT (category = ANY($1::text[]))
        GROUP BY category
        ORDER BY category
        LIMIT $2
      `,
      [canonicalDecisionCategories, limit]
    ),
    pool.query(
      `
        WITH source_refs AS (
          SELECT 'doc_source_snapshots.source_id' AS relation, source_id AS value FROM doc_source_snapshots
          UNION ALL
          SELECT 'shared_communication_artifacts.source_id' AS relation, source_id AS value FROM shared_communication_artifacts
          UNION ALL
          SELECT 'shared_communication_candidates.source_id' AS relation, source_id AS value FROM shared_communication_candidates
          UNION ALL
          SELECT 'shared_communication_artifact_processing_runs.source_id' AS relation, source_id AS value FROM shared_communication_artifact_processing_runs
          UNION ALL
          SELECT 'source_crawl_targets.source_id' AS relation, source_id AS value FROM source_crawl_targets
          UNION ALL
          SELECT 'source_crawl_target_runs.source_id' AS relation, source_id AS value FROM source_crawl_target_runs
          UNION ALL
          SELECT 'source_crawl_items.source_id' AS relation, source_id AS value FROM source_crawl_items
          UNION ALL
          SELECT 'intelligence_report_artifacts.source_ids' AS relation, source_id AS value
          FROM intelligence_report_artifacts, unnest(source_ids) AS source_id
          UNION ALL
          SELECT 'intelligence_atoms.source_id' AS relation, source_id AS value FROM intelligence_atoms
          UNION ALL
          SELECT 'intelligence_atom_hits.source_id' AS relation, source_id AS value FROM intelligence_atom_hits
          UNION ALL
          SELECT 'intelligence_retrieval_chunks.source_id' AS relation, source_id AS value FROM intelligence_retrieval_chunks
          UNION ALL
          SELECT 'intelligence_retrieval_runs.source_ids' AS relation, source_id AS value
          FROM intelligence_retrieval_runs, unnest(source_ids) AS source_id
          UNION ALL
          SELECT 'shared_communication_synthesized_items.source_ids' AS relation, source_id AS value
          FROM shared_communication_synthesized_items, unnest(source_ids) AS source_id
        )
        SELECT relation, value, COUNT(*)::int AS count
        FROM source_refs
        WHERE value IS NOT NULL
          AND NOT (value = ANY($1::text[]))
        GROUP BY relation, value
        ORDER BY relation, value
        LIMIT $2
      `,
      [registeredSourceIds, limit]
    ),
    pool.query(
      `
        SELECT 'pending_doc_updates.status_state' AS relation,
               id || ':' || status AS value,
               1::int AS count
        FROM pending_doc_updates
        WHERE (status = 'applied' AND (applied_at IS NULL OR applied_commit IS NULL))
           OR (status IN ('approved', 'rejected', 'failed') AND reviewed_at IS NULL)
           OR (status = 'pending' AND reviewed_at IS NOT NULL)
        ORDER BY id
        LIMIT $1
      `,
      [limit]
    ),
  ])

  const invalidDecisionCategories = decisionCategoryResult.rows.map(mapDbAuditCountRow)
  const invalidSourceReferences = sourceReferenceResult.rows.map(mapDbAuditCountRow)
  const pendingDocUpdateStateIssues = docUpdateStateResult.rows.map(mapDbAuditCountRow)

  return {
    generatedAt: new Date().toISOString(),
    registeredSourceIds: registeredSourceIds.length,
    canonicalDecisionCategories: canonicalDecisionCategories.slice(),
    invalidDecisionCategoryCount: invalidDecisionCategories.reduce((total, item) => total + item.count, 0),
    invalidDecisionCategories,
    invalidSourceReferenceCount: invalidSourceReferences.reduce((total, item) => total + item.count, 0),
    invalidSourceReferences,
    pendingDocUpdateStateIssueCount: pendingDocUpdateStateIssues.reduce((total, item) => total + item.count, 0),
    pendingDocUpdateStateIssues,
  }
}

function mapFoundationUserRow(row) {
  return {
    email: row.email,
    name: row.name,
    tier: row.tier === null || row.tier === undefined ? null : Number(row.tier),
    userType: row.user_type ?? row.userType,
    active: Boolean(row.active),
    meetingSyncEnabled: Boolean(row.meeting_sync_enabled ?? row.meetingSyncEnabled),
    metadata: row.metadata || {},
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
}

function mapDecisionRow(row) {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    status: row.status,
    summary: row.summary,
    rationale: row.rationale,
    sourceRef: row.source_ref ?? row.sourceRef,
    decisionOwner: row.decision_owner ?? row.decisionOwner,
    confirmedBy: row.confirmed_by ?? row.confirmedBy,
    participantNames: row.participant_names ?? row.participantNames ?? [],
    contextRef: row.context_ref ?? row.contextRef,
    evidenceNotes: row.evidence_notes ?? row.evidenceNotes,
    classifiedAt: row.classified_at ?? row.classifiedAt,
    classifiedBy: row.classified_by ?? row.classifiedBy,
    supersedesIds: row.supersedes_ids ?? row.supersedesIds ?? [],
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
}

function mapOpenQuestionRow(row) {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    owner: row.owner,
    status: row.status || 'open',
    resolvedAt: row.resolved_at ?? row.resolvedAt,
    resolvedBy: row.resolved_by ?? row.resolvedBy,
    resolutionNote: row.resolution_note ?? row.resolutionNote,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
}

function mapPendingDocUpdateRow(row) {
  return {
    id: row.id,
    decisionId: row.decision_id ?? row.decisionId,
    decisionTitle: row.decision_title ?? row.decisionTitle,
    decisionCategory: row.decision_category ?? row.decisionCategory,
    decisionStatus: row.decision_status ?? row.decisionStatus,
    decisionSourceRef: row.decision_source_ref ?? row.decisionSourceRef,
    decisionOwner: row.decision_owner ?? row.decisionOwner,
    decisionConfirmedBy: row.decision_confirmed_by ?? row.decisionConfirmedBy,
    decisionParticipantNames: row.decision_participant_names ?? row.decisionParticipantNames ?? [],
    decisionContextRef: row.decision_context_ref ?? row.decisionContextRef,
    decisionEvidenceNotes: row.decision_evidence_notes ?? row.decisionEvidenceNotes,
    decisionRationale: row.decision_rationale ?? row.decisionRationale,
    targetDocPath: row.target_doc_path ?? row.targetDocPath,
    targetSection: row.target_section ?? row.targetSection,
    summary: row.summary,
    currentText: row.current_text ?? row.currentText,
    proposedText: row.proposed_text ?? row.proposedText,
    proposedDiff: row.proposed_diff ?? row.proposedDiff,
    status: row.status,
    proposedAt: row.proposed_at ?? row.proposedAt,
    proposedBy: row.proposed_by ?? row.proposedBy,
    reviewedAt: row.reviewed_at ?? row.reviewedAt,
    reviewedBy: row.reviewed_by ?? row.reviewedBy,
    appliedAt: row.applied_at ?? row.appliedAt,
    appliedCommit: row.applied_commit ?? row.appliedCommit,
    expiresAt: row.expires_at ?? row.expiresAt,
    metadata: row.metadata || {},
  }
}

function getDecisionTextTokens(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter(function(token) {
      return token.length >= 4 && [
        'that', 'this', 'with', 'from', 'into', 'then', 'than', 'they', 'them',
        'have', 'will', 'when', 'where', 'what', 'which', 'should', 'stays',
        'stay', 'only', 'just', 'real', 'live', 'work', 'works', 'using', 'used',
        'system', 'strategy', 'decision', 'decisions', 'docs', 'doc', 'current',
      ].indexOf(token) === -1
    })
}

function getDecisionKeywordSet(item) {
  const tokens = getDecisionTextTokens((item && item.title) || '').concat(
    getDecisionTextTokens((item && item.summary) || '')
  )
  return Array.from(new Set(tokens))
}

function hasDecisionRelationshipLink(left, right) {
  const leftIds = (left && left.supersedesIds) || []
  const rightIds = (right && right.supersedesIds) || []
  return leftIds.indexOf(right.id) !== -1 || rightIds.indexOf(left.id) !== -1
}

function getDecisionReviewPriority(type) {
  if (type === 'needs_lock') return 0
  if (type === 'missing_source_ref') return 1
  if (type === 'missing_provenance') return 2
  if (type === 'broken_supersedes_link') return 3
  if (type === 'orphan_doc_update') return 4
  if (type === 'possible_relationship') return 5
  return 9
}

function buildDecisionTraceabilitySnapshot(decisions, pendingDocUpdates, recentChanges) {
  const decisionList = Array.isArray(decisions) ? decisions : []
  const updates = Array.isArray(pendingDocUpdates) ? pendingDocUpdates : []
  const changes = Array.isArray(recentChanges) ? recentChanges : []

  const byDecision = {}
  const linkedDecisionIds = new Set()

  decisionList.forEach(function(decision) {
    const linkedUpdates = updates.filter(function(update) {
      return update.decisionId === decision.id
    })
    if (linkedUpdates.length) linkedDecisionIds.add(decision.id)

    const linkedUpdateIds = new Set(linkedUpdates.map(function(update) { return update.id }))
    const decisionEvents = changes.filter(function(change) {
      return change.entityTable === 'decisions' && change.entityId === decision.id
    })
    const docEvents = changes.filter(function(change) {
      if (String(change.eventType || '').indexOf('doc_update_') !== 0) return false
      if (linkedUpdateIds.has(change.entityId)) return true
      return change.metadata && change.metadata.decisionId === decision.id
    })

    const affectedDocs = Array.from(new Set(linkedUpdates.map(function(update) {
      return update.targetDocPath
    }).filter(Boolean))).sort(function(a, b) {
      return a.localeCompare(b)
    })

    const openDocUpdates = linkedUpdates.filter(function(update) {
      return update.status === 'pending' || update.status === 'approved' || update.status === 'failed'
    })
    const appliedDocUpdates = linkedUpdates.filter(function(update) {
      return update.status === 'applied'
    })

    const latestDocTouch = linkedUpdates.slice().sort(function(a, b) {
      return new Date(b.appliedAt || b.reviewedAt || b.proposedAt || 0).getTime() - new Date(a.appliedAt || a.reviewedAt || a.proposedAt || 0).getTime()
    })[0] || null

    const latestDecisionEvent = decisionEvents.slice().sort(function(a, b) {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    })[0] || null

    const latestDocEvent = docEvents.slice().sort(function(a, b) {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    })[0] || null

    byDecision[decision.id] = {
      decisionId: decision.id,
      linkedDocUpdateCount: linkedUpdates.length,
      openDocUpdateCount: openDocUpdates.length,
      appliedDocUpdateCount: appliedDocUpdates.length,
      affectedDocs,
      latestDecisionEventAt: latestDecisionEvent ? latestDecisionEvent.createdAt : null,
      latestDocEventAt: latestDocEvent ? latestDocEvent.createdAt : null,
      latestApprovalBy: latestDocTouch ? (latestDocTouch.reviewedBy || latestDocTouch.proposedBy || null) : null,
      latestAppliedCommit: latestDocTouch ? (latestDocTouch.appliedCommit || null) : null,
      traceStatus: linkedUpdates.length ? 'linked' : 'unlinked',
    }
  })

  const docs = {}
  updates.forEach(function(update) {
    const key = String(update.targetDocPath || '').trim()
    if (!key) return
    if (!docs[key]) {
      docs[key] = {
        targetDocPath: key,
        linkedDecisionIds: [],
        pendingDocUpdateCount: 0,
        appliedDocUpdateCount: 0,
        latestDocEventAt: null,
      }
    }
    if (update.decisionId && docs[key].linkedDecisionIds.indexOf(update.decisionId) === -1) {
      docs[key].linkedDecisionIds.push(update.decisionId)
    }
    if (update.status === 'applied') docs[key].appliedDocUpdateCount += 1
    if (update.status === 'pending' || update.status === 'approved' || update.status === 'failed') docs[key].pendingDocUpdateCount += 1
  })

  changes.forEach(function(change) {
    if (String(change.eventType || '').indexOf('doc_update_') !== 0) return
    const targetDocPath = change.metadata && change.metadata.targetDocPath
    if (!targetDocPath || !docs[targetDocPath]) return
    const current = docs[targetDocPath].latestDocEventAt
    if (!current || new Date(change.createdAt).getTime() > new Date(current).getTime()) {
      docs[targetDocPath].latestDocEventAt = change.createdAt
    }
  })

  return {
    summary: {
      totalDecisions: decisionList.length,
      linkedDecisions: linkedDecisionIds.size,
      unlinkedDecisions: decisionList.length - linkedDecisionIds.size,
      totalDocUpdates: updates.length,
      linkedDocUpdates: updates.filter(function(update) { return Boolean(update.decisionId) }).length,
      orphanDocUpdates: updates.filter(function(update) { return !update.decisionId }).length,
      affectedDocs: Object.keys(docs).length,
    },
    byDecision,
    byDocPath: docs,
  }
}

function buildDecisionReviewSnapshot(decisions, pendingDocUpdates) {
  const decisionList = Array.isArray(decisions)
    ? decisions.slice().sort(function(a, b) {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      })
    : []
  const updates = Array.isArray(pendingDocUpdates) ? pendingDocUpdates : []
  const byId = {}
  decisionList.forEach(function(item) {
    byId[item.id] = item
  })

  const reviewItems = []

  decisionList.forEach(function(item) {
    if (item.status === 'proposed') {
      reviewItems.push({
        key: 'proposed-' + item.id,
        tone: 'pending',
        type: 'needs_lock',
        title: item.id + ' still needs lock / cleanup',
        meta: item.category + ' decision',
        detail: 'This decision is still proposed. It needs either a lock, a merge, or a rejection path.',
        relatedDecisionIds: [item.id],
        nextStep: 'Review whether this should lock, merge into an existing decision, or be rejected.',
      })
    }

    if (!item.sourceRef) {
      reviewItems.push({
        key: 'source-ref-' + item.id,
        tone: 'pending',
        type: 'missing_source_ref',
        title: item.id + ' is missing source evidence',
        meta: item.status + ' · ' + item.category,
        detail: 'This decision does not have a source reference yet. That weakens provenance and later review.',
        relatedDecisionIds: [item.id],
        nextStep: 'Add the exact meeting, audit, chat, or source reference that justified this decision.',
      })
    }

    if (item.status === 'locked') {
      const missingParts = []
      if (!item.decisionOwner) missingParts.push('decision owner')
      if (!item.confirmedBy) missingParts.push('confirmed by')
      if (!item.participantNames || !item.participantNames.length) missingParts.push('participants')
      if (!item.contextRef) missingParts.push('context ref')

      if (missingParts.length) {
        reviewItems.push({
          key: 'provenance-' + item.id,
          tone: 'pending',
          type: 'missing_provenance',
          title: item.id + ' has incomplete decision provenance',
          meta: item.category + ' · locked',
          detail: 'Missing: ' + missingParts.join(', ') + '.',
          relatedDecisionIds: [item.id],
          nextStep: 'Fill in the owner, confirmer, participants, and context so this lock has durable provenance.',
        })
      }
    }

    ;(item.supersedesIds || []).forEach(function(targetId) {
      if (!byId[targetId]) {
        reviewItems.push({
          key: 'broken-link-' + item.id + '-' + targetId,
          tone: 'missing',
          type: 'broken_supersedes_link',
          title: item.id + ' points at a missing superseded decision',
          meta: item.status + ' · ' + item.category,
          detail: 'Supersedes target ' + targetId + ' is not present in the live decision log.',
          relatedDecisionIds: [item.id],
          nextStep: 'Fix the supersedes link or remove it if the old decision was referenced by mistake.',
        })
      }
    })
  })

  updates.forEach(function(item) {
    if (item.status === 'pending' && !item.decisionId) {
      reviewItems.push({
        key: 'orphan-doc-' + item.id,
        tone: 'pending',
        type: 'orphan_doc_update',
        title: item.id + ' has no linked decision',
        meta: 'Pending doc proposal',
        detail: 'This doc update proposal is reviewable, but it is not linked back to a decision yet.',
        relatedDecisionIds: [],
        nextStep: 'Link this proposal to the decision that actually justified the doc change.',
      })
    }
  })

  const activeDecisions = decisionList.filter(function(item) {
    return item.status !== 'superseded'
  })

  for (let index = 0; index < activeDecisions.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < activeDecisions.length; compareIndex += 1) {
      const left = activeDecisions[index]
      const right = activeDecisions[compareIndex]
      if (left.category !== right.category) continue
      if (hasDecisionRelationshipLink(left, right)) continue

      const leftTokens = getDecisionKeywordSet(left)
      const rightTokens = getDecisionKeywordSet(right)
      const shared = leftTokens.filter(function(token) {
        return rightTokens.indexOf(token) !== -1
      })

      if (shared.length >= 3) {
        reviewItems.push({
          key: 'overlap-' + left.id + '-' + right.id,
          tone: 'planned',
          type: 'possible_relationship',
          title: left.id + ' and ' + right.id + ' may need an explicit relationship',
          meta: left.category + ' decisions',
          detail: 'Shared terms: ' + shared.slice(0, 5).join(', ') + '. These do not look broken, but they may need an explicit clarify / related / supersedes relationship so the log reads cleanly.',
          relatedDecisionIds: [left.id, right.id],
          nextStep: 'Review whether they should stay separate, get a relationship note, or eventually be linked through clarification or supersession.',
        })
      }
    }
  }

  reviewItems.sort(function(a, b) {
    const priorityDiff = getDecisionReviewPriority(a.type) - getDecisionReviewPriority(b.type)
    if (priorityDiff) return priorityDiff
    return String(a.title || '').localeCompare(String(b.title || ''))
  })

  const counts = {
    needsLock: reviewItems.filter(function(item) { return item.type === 'needs_lock' }).length,
    missingSourceRef: reviewItems.filter(function(item) { return item.type === 'missing_source_ref' }).length,
    missingProvenance: reviewItems.filter(function(item) { return item.type === 'missing_provenance' }).length,
    brokenSupersedesLink: reviewItems.filter(function(item) { return item.type === 'broken_supersedes_link' }).length,
    orphanDocUpdate: reviewItems.filter(function(item) { return item.type === 'orphan_doc_update' }).length,
    possibleRelationship: reviewItems.filter(function(item) { return item.type === 'possible_relationship' }).length,
  }

  return {
    total: reviewItems.length,
    status: reviewItems.length ? 'pending' : 'connected',
    counts,
    items: reviewItems,
  }
}

function mapChangeEventRow(row) {
  return {
    id: row.id,
    eventType: row.event_type ?? row.eventType,
    entityTable: row.entity_table ?? row.entityTable,
    entityId: row.entity_id ?? row.entityId,
    actor: row.actor,
    summary: row.summary,
    metadata: row.metadata || {},
    createdAt: row.created_at ?? row.createdAt,
  }
}

function mapSharedCommunicationArtifactRow(row, { includeSensitive = false } = {}) {
  const contentText = row.content_text ?? row.contentText ?? ''
  const mapped = {
    artifactId: row.artifact_id ?? row.artifactId,
    sourceId: row.source_id ?? row.sourceId,
    artifactType: row.artifact_type ?? row.artifactType,
    externalId: row.external_id ?? row.externalId,
    contentHash: row.content_hash ?? row.contentHash ?? '',
    contentLength: contentText.length,
    artifactCreatedAt: row.artifact_created_at ?? row.artifactCreatedAt ?? null,
    artifactUpdatedAt: row.artifact_updated_at ?? row.artifactUpdatedAt ?? null,
    metadata: row.metadata || {},
    ingestedBy: row.ingested_by ?? row.ingestedBy ?? null,
    ingestedAt: row.ingested_at ?? row.ingestedAt ?? null,
    updatedAt: row.updated_at ?? row.updatedAt ?? null,
  }

  if (includeSensitive) {
    mapped.title = row.title || ''
    mapped.sourceAccount = row.source_account ?? row.sourceAccount ?? ''
    mapped.sourceContainer = row.source_container ?? row.sourceContainer ?? ''
    mapped.sourceUrl = row.source_url ?? row.sourceUrl ?? ''
    mapped.participants = Array.isArray(row.participants) ? row.participants : []
    mapped.excerpt = contentText ? contentText.slice(0, 280) : ''
  }

  return mapped
}

function mapSharedCommunicationCandidateRow(row) {
  return {
    candidateKey: row.candidate_key ?? row.candidateKey,
    artifactId: row.artifact_id ?? row.artifactId,
    sourceId: row.source_id ?? row.sourceId,
    candidateType: row.candidate_type ?? row.candidateType,
    status: row.status,
    title: row.title || '',
    summary: row.summary || '',
    ownerHint: row.owner_hint ?? row.ownerHint ?? '',
    evidenceExcerpt: row.evidence_excerpt ?? row.evidenceExcerpt ?? '',
    confidence: row.confidence == null ? null : Number(row.confidence),
    metadata: row.metadata || {},
    createdAt: row.created_at ?? row.createdAt ?? null,
    updatedAt: row.updated_at ?? row.updatedAt ?? null,
  }
}

function ensureSharedCommunicationCandidateCanApply(candidate) {
  if (!['pending', 'approved'].includes(candidate.status)) {
    throw new Error(`Candidate ${candidate.candidateKey} is ${candidate.status}; only pending or approved candidates can be applied.`)
  }
  if (candidate.metadata && candidate.metadata.appliedTargetId) {
    throw new Error(`Candidate ${candidate.candidateKey} was already applied to ${candidate.metadata.appliedTarget || 'a target'} ${candidate.metadata.appliedTargetId}.`)
  }
}

function mapSharedCommunicationSynthesisRunRow(row) {
  return {
    runId: row.run_id ?? row.runId,
    title: row.title || '',
    status: row.status,
    model: row.model || '',
    outputPath: row.output_path ?? row.outputPath ?? '',
    candidateLimit: row.candidate_limit ?? row.candidateLimit ?? null,
    candidatesRead: row.candidates_read ?? row.candidatesRead ?? 0,
    daysWindow: row.days_window ?? row.daysWindow ?? null,
    maxItems: row.max_items ?? row.maxItems ?? null,
    sourceCoverage: row.source_coverage || [],
    suppressedPatterns: row.suppressed_patterns || [],
    openQuestions: row.open_questions || [],
    archiveSummary: row.archive_summary || [],
    candidateSummary: row.candidate_summary || [],
    sourceFacts: row.source_facts || {},
    metadata: row.metadata || {},
    generatedAt: row.generated_at ?? row.generatedAt ?? null,
    createdAt: row.created_at ?? row.createdAt ?? null,
    updatedAt: row.updated_at ?? row.updatedAt ?? null,
  }
}

function mapSharedCommunicationSynthesizedItemRow(row) {
  return {
    synthesisItemId: row.synthesis_item_id ?? row.synthesisItemId,
    runId: row.run_id ?? row.runId,
    rank: row.rank == null ? null : Number(row.rank),
    itemType: row.item_type ?? row.itemType,
    status: row.status,
    title: row.title || '',
    oneLine: row.one_line ?? row.oneLine ?? '',
    whyItMatters: row.why_it_matters ?? row.whyItMatters ?? '',
    recommendedNextAction: row.recommended_next_action ?? row.recommendedNextAction ?? '',
    suggestedOwner: row.suggested_owner ?? row.suggestedOwner ?? '',
    sourceCount: row.source_count ?? row.sourceCount ?? 0,
    candidateKeys: Array.isArray(row.candidate_keys) ? row.candidate_keys : [],
    sourceIds: Array.isArray(row.source_ids) ? row.source_ids : [],
    evidenceSummary: row.evidence_summary ?? row.evidenceSummary ?? '',
    confidence: row.confidence == null ? null : Number(row.confidence),
    sensitivity: row.sensitivity || 'neutral',
    metadata: row.metadata || {},
    createdAt: row.created_at ?? row.createdAt ?? null,
  }
}

function mapFubLeadSourceRuleRow(row) {
  return {
    source: row.source_name,
    marketingType: row.marketing_type,
    ownershipType: row.ownership_type,
    flagState: row.flag_state,
    sourceGroup: row.source_group,
    notes: row.notes,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
    updatedBy: row.updated_by || null,
  }
}

function mapFubLeadSourceSnapshotRow(row) {
  return {
    contextKey: row.context_key,
    contextLabel: row.context_label,
    sources: Array.isArray(row.payload) ? row.payload : [],
    scan: {
      uniqueSources: Number(row.unique_sources || 0),
      peopleScanned: Number(row.people_scanned || 0),
      pagesScanned: Number(row.pages_scanned || 0),
      truncated: Boolean(row.truncated),
    },
    refreshedAt: row.refreshed_at?.toISOString?.() || row.refreshed_at || null,
    refreshedBy: row.refreshed_by || null,
  }
}

function mapAgentOnboardingFeedbackResponseRow(row) {
  return {
    id: row.id,
    tokenHash: row.token_hash,
    clickUpTaskId: row.clickup_task_id,
    agentName: row.agent_name,
    milestoneDay: Number(row.milestone_day),
    score: Number(row.score),
    improvementFeedback: row.improvement_feedback || '',
    submittedAt: row.submitted_at?.toISOString?.() || row.submitted_at || null,
    userAgent: row.user_agent || '',
    metadata: row.metadata || {},
    createdAt: row.created_at?.toISOString?.() || row.created_at || null,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
  }
}

function mapAgentOnboardingFeedbackSendAttemptRow(row) {
  return {
    id: row.id,
    clickUpTaskId: row.clickup_task_id,
    agentName: row.agent_name,
    milestoneDay: Number(row.milestone_day),
    tokenHash: row.token_hash || '',
    status: row.status,
    gmailMessageId: row.gmail_message_id || '',
    gmailThreadId: row.gmail_thread_id || '',
    metadata: row.metadata || {},
    createdAt: row.created_at?.toISOString?.() || row.created_at || null,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
  }
}

function mapAgentOnboardingFeedbackResponseNotificationRow(row) {
  return {
    id: row.id,
    responseId: row.response_id,
    clickUpTaskId: row.clickup_task_id,
    agentName: row.agent_name,
    milestoneDay: Number(row.milestone_day),
    status: row.status,
    gmailMessageId: row.gmail_message_id || '',
    gmailThreadId: row.gmail_thread_id || '',
    metadata: row.metadata || {},
    createdAt: row.created_at?.toISOString?.() || row.created_at || null,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
  }
}

function mapAgentOnboardingFeedbackReminderAttemptRow(row) {
  return {
    id: row.id,
    clickUpTaskId: row.clickup_task_id,
    agentName: row.agent_name,
    milestoneDay: Number(row.milestone_day),
    reminderSlotKey: row.reminder_slot_key,
    reminderDueAt: row.reminder_due_at?.toISOString?.() || row.reminder_due_at || null,
    status: row.status,
    gmailMessageId: row.gmail_message_id || '',
    gmailThreadId: row.gmail_thread_id || '',
    metadata: row.metadata || {},
    createdAt: row.created_at?.toISOString?.() || row.created_at || null,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
  }
}

function mapSalesListingAssignmentRow(row) {
  return {
    clickUpTaskId: row.clickup_task_id,
    listingTitle: row.listing_title || '',
    listingUrl: row.listing_url || '',
    agentName: row.agent_name || '',
    resetDate: row.reset_date?.toISOString?.()?.slice(0, 10) || row.reset_date || null,
    daysSinceReset: row.days_since_reset == null ? null : Number(row.days_since_reset),
    assignedLeaderKey: row.assigned_leader_key || '',
    assignedLeaderName: row.assigned_leader_name || '',
    assignedLeaderEmail: row.assigned_leader_email || '',
    actionPlanStatus: row.action_plan_status || 'not_started',
    caseStatus: row.case_status || 'identified',
    outcomeStatus: row.outcome_status || 'open',
    actionPlanState: row.action_plan_state || 'unknown',
    actionPlanNoReason: row.action_plan_no_reason || '',
    firstSeenStaleDate: row.first_seen_stale_date?.toISOString?.()?.slice(0, 10) || row.first_seen_stale_date || null,
    staleSinceDate: row.stale_since_date?.toISOString?.()?.slice(0, 10) || row.stale_since_date || null,
    originalResetDate: row.original_reset_date?.toISOString?.()?.slice(0, 10) || row.original_reset_date || null,
    currentResetDate: row.current_reset_date?.toISOString?.()?.slice(0, 10) || row.current_reset_date || null,
    adjustedAt: row.adjusted_at?.toISOString?.()?.slice(0, 10) || row.adjusted_at || null,
    adjustmentDetectedAt: row.adjustment_detected_at?.toISOString?.() || row.adjustment_detected_at || null,
    actionPlanText: row.action_plan_text || '',
    updatedBy: row.updated_by || '',
    metadata: row.metadata || {},
    createdAt: row.created_at?.toISOString?.() || row.created_at || null,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
  }
}

const SALES_LISTING_CASE_HISTORY_LIMIT = 30

function normalizeSalesHistoryText(value, limit = 240) {
  return String(value == null ? '' : value)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit)
}

function salesHistoryValue(value) {
  if (value instanceof Date) return value.toISOString()
  return normalizeSalesHistoryText(value)
}

function salesHistoryActorLabel(actor) {
  const text = normalizeSalesHistoryText(actor, 80)
  if (!text) return 'system'
  if (text.includes('@')) return 'Sales Hub user'
  if (/process:sales-listings-hub-check/i.test(text)) return 'Sales Hub check'
  if (/sales-listing-case-sync/i.test(text)) return 'GLS sync'
  if (/sales-hub/i.test(text)) return 'Sales Hub'
  return text
}

function normalizeSalesCaseHistoryEvent(event) {
  if (!event || typeof event !== 'object') return null
  const at = normalizeSalesHistoryText(event.at || event.createdAt, 40)
  const title = normalizeSalesHistoryText(event.title, 80)
  if (!at || !title) return null
  return {
    id: normalizeSalesHistoryText(event.id || `${at}:${title}`, 120),
    at,
    title,
    source: normalizeSalesHistoryText(event.source, 80),
    actor: salesHistoryActorLabel(event.actor),
    note: normalizeSalesHistoryText(event.note, 500),
    changes: Array.isArray(event.changes)
      ? event.changes.map(change => ({
          field: normalizeSalesHistoryText(change?.field, 60),
          label: normalizeSalesHistoryText(change?.label, 80),
          from: normalizeSalesHistoryText(change?.from, 160),
          to: normalizeSalesHistoryText(change?.to, 160),
        })).filter(change => change.field && change.label)
      : [],
  }
}

function normalizeSalesCaseHistory(metadata) {
  const history = Array.isArray(metadata?.caseHistory) ? metadata.caseHistory : []
  return history.map(normalizeSalesCaseHistoryEvent).filter(Boolean).slice(-SALES_LISTING_CASE_HISTORY_LIMIT)
}

function buildSalesCaseHistoryTitle(changes, input = {}) {
  const outcome = String(input.outcomeStatus || '').trim()
  const actionPlanState = String(input.actionPlanState || '').trim()
  if (changes.some(change => change.field === 'actionPlanNoReason') && !String(input.actionPlanNoReason || '').trim()) return 'No-game-plan reason cleared'
  if (changes.some(change => change.field === 'actionPlanText') && !String(input.actionPlanText || '').trim()) return 'Game plan note cleared'
  if (['no_action', 'cancelled', 'expired'].includes(outcome)) return 'Marked failed'
  if (['conditional', 'firm', 'closed'].includes(outcome)) return 'Movement recorded'
  if (outcome === 'adjusted') return 'Adjusted or repositioned'
  if (changes.some(change => change.field === 'currentResetDate' || change.field === 'adjustedAt')) return 'Listing adjusted or relisted'
  if (actionPlanState === 'no') return 'Game plan marked no'
  if (actionPlanState === 'yes') return 'Game plan marked yes'
  if (changes.some(change => change.field === 'actionPlanNoReason')) return 'No-game-plan reason updated'
  if (changes.some(change => change.field === 'actionPlanText')) return 'Game plan note updated'
  if (changes.some(change => change.field === 'assignedLeader')) return 'Sales leader updated'
  if (changes.some(change => change.field === 'caseStatus')) return 'Case status updated'
  return 'Case updated'
}

function buildSalesCaseHistoryNote(input = {}, flags = {}) {
  if (flags.hasActionPlanNoReason && String(input.actionPlanNoReason || '').trim()) {
    return normalizeSalesHistoryText(input.actionPlanNoReason, 500)
  }
  if (flags.hasActionPlanText && String(input.actionPlanText || '').trim()) {
    return normalizeSalesHistoryText(input.actionPlanText, 500)
  }
  return ''
}

function currentSalesCaseChanges(existing = {}) {
  return [
    { field: 'assignedLeader', label: 'Sales leader', from: '', to: existing.assignedLeaderName || existing.assignedLeaderKey || 'Unassigned' },
    { field: 'caseStatus', label: 'Case status', from: '', to: existing.caseStatus || 'identified' },
    { field: 'outcomeStatus', label: 'Outcome', from: '', to: existing.outcomeStatus || 'open' },
    { field: 'actionPlanState', label: 'Game plan', from: '', to: existing.actionPlanState || 'unknown' },
    existing.actionPlanNoReason
      ? { field: 'actionPlanNoReason', label: 'No-game-plan reason', from: '', to: existing.actionPlanNoReason }
      : null,
    existing.actionPlanText
      ? { field: 'actionPlanText', label: 'Game plan note', from: '', to: existing.actionPlanText }
      : null,
  ].filter(change => change && change.to)
}

function historyAlreadyHasCurrentNote(history = [], existing = {}) {
  const note = normalizeSalesHistoryText(existing.actionPlanNoReason || existing.actionPlanText || '', 500)
  if (!note) return true
  return history.some(event =>
    normalizeSalesHistoryText(event.note, 500) === note ||
    (event.changes || []).some(change => ['actionPlanNoReason', 'actionPlanText'].includes(change.field) && normalizeSalesHistoryText(change.to, 500) === note)
  )
}

function buildCurrentSalesCaseCapture(existing = {}, inputMetadata = {}, actor = 'system', at = new Date().toISOString()) {
  const note = normalizeSalesHistoryText(existing.actionPlanNoReason || existing.actionPlanText || 'History started from existing GLS case state.', 500)
  return {
    id: `gls-case-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at,
    title: existing.actionPlanNoReason ? 'No-game-plan reason captured' : 'Current state captured',
    source: normalizeSalesHistoryText(inputMetadata.source || 'sales-hub', 80),
    actor: salesHistoryActorLabel(actor),
    note,
    changes: currentSalesCaseChanges(existing),
  }
}

function buildSalesCaseHistory(existing, input = {}, inputMetadata = {}, actor = 'system', flags = {}) {
  const priorHistory = normalizeSalesCaseHistory(existing?.metadata)
  const source = normalizeSalesHistoryText(inputMetadata.source || 'sales-hub', 80)
  const at = new Date().toISOString()
  const changes = []

  function addChange(enabled, field, label, fromValue, toValue) {
    if (!enabled) return
    const from = salesHistoryValue(fromValue)
    const to = salesHistoryValue(toValue)
    if (from === to) return
    changes.push({ field, label, from, to })
  }

  addChange(
    Object.prototype.hasOwnProperty.call(input, 'assignedLeaderKey'),
    'assignedLeader',
    'Sales leader',
    existing?.assignedLeaderName || existing?.assignedLeaderKey || 'Unassigned',
    input.assignedLeaderName || input.assignedLeaderKey || 'Unassigned'
  )
  addChange(flags.hasCaseStatus, 'caseStatus', 'Case status', existing?.caseStatus || '', input.caseStatus || 'identified')
  addChange(flags.hasOutcomeStatus, 'outcomeStatus', 'Outcome', existing?.outcomeStatus || '', input.outcomeStatus || 'open')
  addChange(flags.hasActionPlanState, 'actionPlanState', 'Game plan', existing?.actionPlanState || '', input.actionPlanState || 'unknown')
  addChange(flags.hasActionPlanNoReason, 'actionPlanNoReason', 'No-game-plan reason', existing?.actionPlanNoReason || '', input.actionPlanNoReason || '')
  addChange(flags.hasActionPlanText, 'actionPlanText', 'Game plan note', existing?.actionPlanText || '', input.actionPlanText || '')
  addChange(
    Object.prototype.hasOwnProperty.call(input, 'currentResetDate'),
    'currentResetDate',
    'Reset date',
    existing?.currentResetDate || '',
    input.currentResetDate || ''
  )
  addChange(
    Object.prototype.hasOwnProperty.call(input, 'adjustedAt'),
    'adjustedAt',
    'Adjusted date',
    existing?.adjustedAt || '',
    input.adjustedAt || ''
  )

  if (!existing) {
    return [
      ...priorHistory,
      {
        id: `gls-case-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        at,
        title: 'Entered GLS',
        source,
        actor: salesHistoryActorLabel(actor),
        note: normalizeSalesHistoryText(inputMetadata.clickUpStatus || 'Listing crossed the stale threshold.', 500),
        changes: changes.filter(change => change.to),
      },
    ].slice(-SALES_LISTING_CASE_HISTORY_LIMIT)
  }

  if (!priorHistory.length && !changes.length) {
    return [buildCurrentSalesCaseCapture(existing, inputMetadata, actor, at)].slice(-SALES_LISTING_CASE_HISTORY_LIMIT)
  }

  if (!changes.length && !historyAlreadyHasCurrentNote(priorHistory, existing)) {
    return [
      ...priorHistory,
      buildCurrentSalesCaseCapture(existing, inputMetadata, actor, at),
    ].slice(-SALES_LISTING_CASE_HISTORY_LIMIT)
  }

  if (!changes.length) return null

  return [
    ...priorHistory,
    {
      id: `gls-case-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at,
      title: buildSalesCaseHistoryTitle(changes, input),
      source,
      actor: salesHistoryActorLabel(actor),
      note: buildSalesCaseHistoryNote(input, flags),
      changes,
    },
  ].slice(-SALES_LISTING_CASE_HISTORY_LIMIT)
}

function mapFoundationJobRunRow(row, { includeOutput = false } = {}) {
  return {
    runId: row.run_id,
    jobKey: row.job_key,
    title: row.title,
    jobType: row.job_type,
    status: row.status,
    command: row.command || {},
    requestedBy: row.requested_by,
    startedAt: row.started_at?.toISOString?.() || row.started_at || null,
    finishedAt: row.finished_at?.toISOString?.() || row.finished_at || null,
    durationMs: row.duration_ms == null ? null : Number(row.duration_ms),
    exitCode: row.exit_code == null ? null : Number(row.exit_code),
    signal: row.signal || null,
    outputTail: includeOutput ? row.output_tail || '' : undefined,
    errorMessage: row.error_message || null,
    metadata: row.metadata || {},
    createdAt: row.created_at?.toISOString?.() || row.created_at || null,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
  }
}

async function withFoundationTransaction(work) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const result = await work(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // Ignore rollback failures and rethrow the original error.
    }
    throw error
  } finally {
    client.release()
  }
}

async function insertChangeEvent(client, event) {
  await client.query(
    `
      INSERT INTO change_events (
        event_type, entity_table, entity_id, actor, summary, metadata
      )
      VALUES ($1,$2,$3,$4,$5,$6::jsonb)
    `,
    [
      event.eventType,
      event.entityTable,
      event.entityId,
      event.actor,
      event.summary,
      JSON.stringify(event.metadata || {}),
    ]
  )
}

export async function withFoundationAdvisoryLock(lockKey, work) {
  const normalizedLockKey = String(lockKey || '').trim()
  if (!normalizedLockKey) throw new Error('lockKey is required.')

  const client = await pool.connect()
  let lockHeld = false
  try {
    await client.query('SELECT pg_advisory_lock(hashtext($1))', [normalizedLockKey])
    lockHeld = true
    return await work()
  } finally {
    if (lockHeld) {
      try {
        await client.query('SELECT pg_advisory_unlock(hashtext($1))', [normalizedLockKey])
      } catch {
        // The lock is session scoped and the client is being released.
      }
    }
    client.release()
  }
}

function getNumericSuffix(id, prefix) {
  const match = String(id || '').match(new RegExp(`^${prefix}-(\\d+)$`))
  return match ? Number(match[1]) : 0
}

async function getNextPrefixedId(client, tableName, prefix) {
  const normalizedPrefix = String(prefix || '').trim().toUpperCase()
  if (!normalizedPrefix) throw new Error('A valid ID prefix is required.')

  const result = await client.query(
    `
      SELECT id
      FROM ${tableName}
      WHERE id LIKE $1
      ORDER BY id DESC
    `,
    [`${normalizedPrefix}-%`]
  )

  const nextNumber = result.rows.reduce((max, row) => {
    return Math.max(max, getNumericSuffix(row.id, normalizedPrefix))
  }, 0) + 1

  return `${normalizedPrefix}-${String(nextNumber).padStart(3, '0')}`
}

export async function initFoundationDb() {
  const client = await pool.connect()
  let schemaLockHeld = false

  try {
    await client.query("SELECT pg_advisory_lock(hashtext('bcrew_foundation_schema_init'))")
    schemaLockHeld = true
    await client.query('BEGIN')

    await client.query(`
      CREATE TABLE IF NOT EXISTS backlog_items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        team TEXT NOT NULL,
        lane TEXT NOT NULL CHECK (lane IN ('research', 'scoped', 'ranked', 'executing', 'parked', 'done')),
        priority TEXT NOT NULL CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
        rank INTEGER,
        source TEXT,
        summary TEXT,
        why_it_matters TEXT,
        next_action TEXT,
        status_note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_backlog_team_lane_rank
      ON backlog_items(team, lane, rank, created_at);

      CREATE TABLE IF NOT EXISTS decisions (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('locked', 'proposed', 'superseded')),
        summary TEXT NOT NULL,
        rationale TEXT,
        source_ref TEXT,
        decision_owner TEXT,
        confirmed_by TEXT,
        participant_names TEXT[],
        context_ref TEXT,
        evidence_notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_decisions_status_category
      ON decisions(status, category, created_at DESC);

      CREATE TABLE IF NOT EXISTS parking_lot_items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        owner TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS open_questions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        owner TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS memory_system_status (
        component_key TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('live', 'pending', 'planned', 'risk')),
        detail TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS foundation_runtime_status (
        service_key TEXT PRIMARY KEY,
        service_label TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('starting', 'live', 'risk', 'stale', 'unknown')),
        started_at TIMESTAMPTZ,
        process_id INTEGER,
        running_commit TEXT,
        running_short_commit TEXT,
        captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        check_name TEXT NOT NULL,
        restart_command TEXT NOT NULL,
        plain_english TEXT NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS doc_source_snapshots (
        id TEXT PRIMARY KEY,
        doc_path TEXT NOT NULL,
        source_id TEXT NOT NULL,
        group_title TEXT NOT NULL,
        label TEXT NOT NULL,
        value TEXT NOT NULL,
        detail TEXT,
        as_of DATE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_doc_source_snapshots_doc_path
      ON doc_source_snapshots(doc_path, group_title, sort_order, created_at);

      CREATE TABLE IF NOT EXISTS strategy_hub_snapshots (
        snapshot_key TEXT PRIMARY KEY,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        source_status TEXT NOT NULL DEFAULT 'live'
          CHECK (source_status IN ('live', 'degraded')),
        generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by TEXT NOT NULL DEFAULT 'system'
      );

      CREATE TABLE IF NOT EXISTS fub_lead_source_rules (
        source_name TEXT PRIMARY KEY,
        marketing_type TEXT NOT NULL DEFAULT 'unclassified'
          CHECK (marketing_type IN ('marketing', 'non_marketing', 'unclassified')),
        ownership_type TEXT NOT NULL DEFAULT 'unclassified'
          CHECK (ownership_type IN ('company', 'agent', 'referral', 'other', 'unclassified')),
        flag_state TEXT NOT NULL DEFAULT 'none'
          CHECK (flag_state IN ('none', 'needs_cleanup', 'not_canonical', 'merge_candidate')),
        source_group TEXT,
        notes TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_fub_lead_source_rules_marketing
      ON fub_lead_source_rules(marketing_type, ownership_type, updated_at DESC);

      CREATE TABLE IF NOT EXISTS fub_lead_source_snapshots (
        context_key TEXT PRIMARY KEY,
        context_label TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '[]'::jsonb,
        unique_sources INTEGER NOT NULL DEFAULT 0,
        people_scanned INTEGER NOT NULL DEFAULT 0,
        pages_scanned INTEGER NOT NULL DEFAULT 0,
        truncated BOOLEAN NOT NULL DEFAULT FALSE,
        refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        refreshed_by TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_fub_lead_source_snapshots_refreshed
      ON fub_lead_source_snapshots(refreshed_at DESC);
    `)

    await client.query(`
      ALTER TABLE decisions
      ADD COLUMN IF NOT EXISTS classified_at TIMESTAMPTZ;

      ALTER TABLE decisions
      ADD COLUMN IF NOT EXISTS classified_by TEXT;

      ALTER TABLE decisions
      ADD COLUMN IF NOT EXISTS supersedes_ids TEXT[];

      ALTER TABLE decisions
      ADD COLUMN IF NOT EXISTS decision_owner TEXT;

      ALTER TABLE decisions
      ADD COLUMN IF NOT EXISTS confirmed_by TEXT;

      ALTER TABLE decisions
      ADD COLUMN IF NOT EXISTS participant_names TEXT[];

      ALTER TABLE decisions
      ADD COLUMN IF NOT EXISTS context_ref TEXT;

      ALTER TABLE decisions
      ADD COLUMN IF NOT EXISTS evidence_notes TEXT;

      ALTER TABLE decisions
      DROP CONSTRAINT IF EXISTS decisions_category_check;

      ALTER TABLE decisions
      ADD CONSTRAINT decisions_category_check
      CHECK (category IN ('strategy', 'system', 'execution', 'people'));

      UPDATE decisions
      SET classified_at = COALESCE(classified_at, created_at)
      WHERE classified_at IS NULL;

      ALTER TABLE backlog_items
      ADD COLUMN IF NOT EXISTS owner TEXT;

      ALTER TABLE fub_lead_source_rules
      ADD COLUMN IF NOT EXISTS flag_state TEXT NOT NULL DEFAULT 'none';

      ALTER TABLE fub_lead_source_rules
      DROP CONSTRAINT IF EXISTS fub_lead_source_rules_flag_state_check;

      ALTER TABLE fub_lead_source_rules
      ADD CONSTRAINT fub_lead_source_rules_flag_state_check
      CHECK (flag_state IN ('none', 'needs_cleanup', 'not_canonical', 'merge_candidate'));

      ALTER TABLE open_questions
      ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';

      ALTER TABLE open_questions
      DROP CONSTRAINT IF EXISTS open_questions_status_check;

      ALTER TABLE open_questions
      ADD CONSTRAINT open_questions_status_check
      CHECK (status IN ('open', 'resolved'));

      ALTER TABLE open_questions
      ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

      ALTER TABLE open_questions
      ADD COLUMN IF NOT EXISTS resolved_by TEXT;

      ALTER TABLE open_questions
      ADD COLUMN IF NOT EXISTS resolution_note TEXT;

      UPDATE open_questions
      SET status = COALESCE(status, 'open')
      WHERE status IS NULL;

      CREATE TABLE IF NOT EXISTS pending_doc_updates (
        id TEXT PRIMARY KEY,
        decision_id TEXT REFERENCES decisions(id),
        target_doc_path TEXT NOT NULL,
        target_section TEXT,
        summary TEXT NOT NULL,
        current_text TEXT,
        proposed_text TEXT NOT NULL,
        proposed_diff TEXT,
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'approved', 'rejected', 'applied', 'expired', 'failed')),
        proposed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        proposed_by TEXT NOT NULL,
        reviewed_at TIMESTAMPTZ,
        reviewed_by TEXT,
        applied_at TIMESTAMPTZ,
        applied_commit TEXT,
        expires_at TIMESTAMPTZ,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb
      );

      CREATE INDEX IF NOT EXISTS idx_pending_doc_updates_status
      ON pending_doc_updates(status);

      CREATE INDEX IF NOT EXISTS idx_pending_doc_updates_decision
      ON pending_doc_updates(decision_id);

      CREATE TABLE IF NOT EXISTS change_events (
        id BIGSERIAL PRIMARY KEY,
        event_type TEXT NOT NULL
          CHECK (event_type IN (
            'decision_proposed', 'decision_classified', 'decision_locked', 'decision_superseded',
            'backlog_created', 'backlog_status_changed', 'backlog_updated',
            'question_created', 'question_updated', 'question_resolved', 'question_reopened',
            'doc_update_proposed', 'doc_update_approved', 'doc_update_applied', 'doc_update_rejected', 'doc_update_failed',
            'source_drift_detected', 'source_drift_cleared',
            'review_queue_changed', 'review_queue_cleared',
            'job_run_started', 'job_run_succeeded', 'job_run_failed',
            'foundation_job_control_updated',
            'llm_credential_updated', 'llm_route_updated', 'llm_route_probe_recorded',
            'source_crawl_target_updated', 'source_crawl_item_updated',
            'intelligence_job_run_recorded',
            'intelligence_report_artifact_recorded',
            'intelligence_atom_upserted',
            'intelligence_atom_hit_recorded',
            'intelligence_retrieval_run_recorded',
            'intelligence_retrieval_chunk_upserted',
            'intelligence_synthesis_facts_run_recorded',
            'intelligence_synthesis_run_recorded',
            'intelligence_action_router_run_recorded',
            'intelligence_action_route_proposed',
            'intelligence_action_route_curated',
            'intelligence_action_route_approved',
            'intelligence_action_route_applied'
          )),
        entity_table TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        actor TEXT NOT NULL,
        summary TEXT NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_change_events_created_at
      ON change_events(created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_change_events_entity
      ON change_events(entity_table, entity_id);

      ALTER TABLE change_events
      DROP CONSTRAINT IF EXISTS change_events_event_type_check;

      ALTER TABLE change_events
      ADD CONSTRAINT change_events_event_type_check
      CHECK (event_type IN (
        'decision_proposed', 'decision_classified', 'decision_locked', 'decision_superseded',
        'backlog_created', 'backlog_status_changed', 'backlog_updated',
        'question_created', 'question_updated', 'question_resolved', 'question_reopened',
        'doc_update_proposed', 'doc_update_approved', 'doc_update_applied', 'doc_update_rejected', 'doc_update_failed',
        'source_drift_detected', 'source_drift_cleared',
        'review_queue_changed', 'review_queue_cleared',
        'job_run_started', 'job_run_succeeded', 'job_run_failed',
        'foundation_job_control_updated',
        'llm_credential_updated', 'llm_route_updated', 'llm_route_probe_recorded',
        'source_crawl_target_updated', 'source_crawl_item_updated',
        'intelligence_job_run_recorded',
        'intelligence_report_artifact_recorded',
        'intelligence_atom_upserted',
        'intelligence_atom_hit_recorded',
        'intelligence_retrieval_run_recorded',
        'intelligence_retrieval_chunk_upserted',
        'intelligence_synthesis_facts_run_recorded',
        'intelligence_synthesis_run_recorded',
        'intelligence_action_router_run_recorded',
        'intelligence_action_route_proposed',
        'intelligence_action_route_curated',
        'intelligence_action_route_approved',
        'intelligence_action_route_applied'
      ));

      CREATE TABLE IF NOT EXISTS shared_communication_artifacts (
        artifact_id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        artifact_type TEXT NOT NULL
          CHECK (artifact_type IN ('meeting_note', 'meeting_transcript', 'email_thread', 'calendar_event', 'missive_thread', 'slack_thread', 'drive_document', 'drive_spreadsheet', 'drive_pdf', 'drive_text', 'gmail_attachment', 'video_transcript')),
        external_id TEXT NOT NULL,
        title TEXT,
        source_account TEXT,
        source_container TEXT,
        source_url TEXT,
        participants JSONB NOT NULL DEFAULT '[]'::jsonb,
        content_text TEXT NOT NULL DEFAULT '',
        content_hash TEXT NOT NULL DEFAULT '',
        artifact_created_at TIMESTAMPTZ,
        artifact_updated_at TIMESTAMPTZ,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        ingested_by TEXT,
        ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_shared_communication_artifacts_source
      ON shared_communication_artifacts(source_id, artifact_type, artifact_updated_at DESC, ingested_at DESC);

      CREATE TABLE IF NOT EXISTS shared_communication_candidates (
        candidate_key TEXT PRIMARY KEY,
        artifact_id TEXT NOT NULL REFERENCES shared_communication_artifacts(artifact_id) ON DELETE CASCADE,
        source_id TEXT NOT NULL,
        candidate_type TEXT NOT NULL
          CHECK (candidate_type IN ('task_candidate', 'decision_candidate', 'blocker', 'feedback_signal', 'atom_candidate')),
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'approved', 'rejected', 'applied', 'duplicate')),
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        owner_hint TEXT,
        evidence_excerpt TEXT,
        confidence NUMERIC(4,3),
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_shared_communication_candidates_lookup
      ON shared_communication_candidates(source_id, candidate_type, status, updated_at DESC);

      CREATE TABLE IF NOT EXISTS shared_communication_artifact_processing_runs (
        run_id TEXT PRIMARY KEY,
        artifact_id TEXT NOT NULL REFERENCES shared_communication_artifacts(artifact_id) ON DELETE CASCADE,
        source_id TEXT NOT NULL,
        artifact_type TEXT NOT NULL,
        artifact_content_hash TEXT NOT NULL DEFAULT '',
        processing_type TEXT NOT NULL,
        extraction_method TEXT,
        provider TEXT,
        auth_path TEXT,
        route_key TEXT,
        model TEXT,
        status TEXT NOT NULL
          CHECK (status IN ('succeeded', 'failed', 'skipped', 'blocked')),
        candidate_count INTEGER NOT NULL DEFAULT 0,
        error_message TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        processed_by TEXT,
        processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE shared_communication_artifact_processing_runs
      ADD COLUMN IF NOT EXISTS artifact_content_hash TEXT NOT NULL DEFAULT '';

      ALTER TABLE shared_communication_artifact_processing_runs
      ADD COLUMN IF NOT EXISTS provider TEXT;

      ALTER TABLE shared_communication_artifact_processing_runs
      ADD COLUMN IF NOT EXISTS auth_path TEXT;

      ALTER TABLE shared_communication_artifact_processing_runs
      ADD COLUMN IF NOT EXISTS route_key TEXT;

      UPDATE shared_communication_artifact_processing_runs processing
      SET artifact_content_hash = artifact.content_hash
      FROM shared_communication_artifacts artifact
      WHERE processing.artifact_id = artifact.artifact_id
        AND COALESCE(processing.artifact_content_hash, '') = ''
        AND COALESCE(artifact.content_hash, '') <> ''
        AND artifact.updated_at <= processing.processed_at;

      CREATE INDEX IF NOT EXISTS idx_shared_communication_artifact_processing_lookup
      ON shared_communication_artifact_processing_runs(
        source_id, artifact_type, processing_type, extraction_method, status, processed_at DESC
      );

      CREATE INDEX IF NOT EXISTS idx_shared_communication_artifact_processing_artifact
      ON shared_communication_artifact_processing_runs(artifact_id, processing_type, extraction_method, status);

      CREATE INDEX IF NOT EXISTS idx_shared_communication_artifact_processing_current
      ON shared_communication_artifact_processing_runs(
        artifact_id, processing_type, extraction_method, artifact_content_hash, status
      );

      CREATE TABLE IF NOT EXISTS shared_communication_synthesis_runs (
        run_id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'completed'
          CHECK (status IN ('completed', 'failed')),
        model TEXT NOT NULL,
        output_path TEXT,
        candidate_limit INTEGER,
        candidates_read INTEGER NOT NULL DEFAULT 0,
        days_window INTEGER,
        max_items INTEGER,
        source_coverage JSONB NOT NULL DEFAULT '[]'::jsonb,
        suppressed_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
        open_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
        archive_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
        candidate_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
        source_facts JSONB NOT NULL DEFAULT '{}'::jsonb,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE shared_communication_synthesis_runs
      ADD COLUMN IF NOT EXISTS source_facts JSONB NOT NULL DEFAULT '{}'::jsonb;

      CREATE INDEX IF NOT EXISTS idx_shared_communication_synthesis_runs_generated
      ON shared_communication_synthesis_runs(generated_at DESC);

      CREATE TABLE IF NOT EXISTS shared_communication_synthesized_items (
        synthesis_item_id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES shared_communication_synthesis_runs(run_id) ON DELETE CASCADE,
        rank INTEGER NOT NULL,
        item_type TEXT NOT NULL
          CHECK (item_type IN (
            'decision',
            'blocker',
            'action_item',
            'strategic_issue',
            'pattern',
            'content_atom',
            'source_trust_issue'
          )),
        status TEXT NOT NULL
          CHECK (status IN (
            'new',
            'active',
            'needs_decision',
            'needs_owner',
            'stale_watch',
            'historical_context',
            'likely_resolved'
          )),
        title TEXT NOT NULL,
        one_line TEXT NOT NULL DEFAULT '',
        why_it_matters TEXT NOT NULL DEFAULT '',
        recommended_next_action TEXT NOT NULL DEFAULT '',
        suggested_owner TEXT,
        source_count INTEGER NOT NULL DEFAULT 0,
        candidate_keys TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
        source_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
        evidence_summary TEXT NOT NULL DEFAULT '',
        confidence NUMERIC(4,3),
        sensitivity TEXT NOT NULL DEFAULT 'neutral'
          CHECK (sensitivity IN (
            'neutral',
            'positive',
            'performance_concern',
            'termination_risk',
            'comp_discussion',
            'undisclosed_feedback'
          )),
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_shared_communication_synthesized_items_run
      ON shared_communication_synthesized_items(run_id, rank ASC);

      CREATE INDEX IF NOT EXISTS idx_shared_communication_synthesized_items_lookup
      ON shared_communication_synthesized_items(item_type, status, rank ASC);

      ${intelligenceAtomSchemaSql}

      ${intelligenceRetrievalSchemaSql}

      ${intelligenceSynthesisFactsSchemaSql}

      ${intelligenceSynthesisSchemaSql}

      ${intelligenceActionRouterSchemaSql}

      CREATE TABLE IF NOT EXISTS foundation_job_runs (
        run_id TEXT PRIMARY KEY,
        job_key TEXT NOT NULL,
        title TEXT NOT NULL,
        job_type TEXT NOT NULL,
        status TEXT NOT NULL
          CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
        command JSONB NOT NULL DEFAULT '{}'::jsonb,
        requested_by TEXT NOT NULL DEFAULT 'system',
        started_at TIMESTAMPTZ,
        finished_at TIMESTAMPTZ,
        duration_ms INTEGER,
        exit_code INTEGER,
        signal TEXT,
        output_tail TEXT NOT NULL DEFAULT '',
        error_message TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_foundation_job_runs_lookup
      ON foundation_job_runs(job_key, status, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_foundation_job_runs_created
      ON foundation_job_runs(created_at DESC);

      CREATE UNIQUE INDEX IF NOT EXISTS idx_foundation_job_runs_active_unique
      ON foundation_job_runs(job_key)
      WHERE status IN ('queued', 'running');

      CREATE TABLE IF NOT EXISTS foundation_job_controls (
        job_key TEXT PRIMARY KEY,
        runtime_mode TEXT
          CHECK (runtime_mode IS NULL OR runtime_mode IN ('scheduled', 'manual', 'paused')),
        enabled BOOLEAN,
        schedule_every_minutes INTEGER
          CHECK (schedule_every_minutes IS NULL OR schedule_every_minutes > 0),
        pause_reason TEXT,
        updated_by TEXT NOT NULL DEFAULT 'system',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS llm_credentials (
        credential_key TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        auth_path TEXT NOT NULL
          CHECK (auth_path IN (
            'api_direct',
            'claude_code_subscription',
            'claude_code_oauth_token',
            'claude_agent_sdk',
            'chatgpt_subscription_gateway',
            'codex_subscription',
            'gemini_api_direct',
            'manual_interactive'
          )),
        display_name TEXT NOT NULL,
        account_label TEXT,
        hub_key TEXT NOT NULL DEFAULT 'foundation',
        workload_lane TEXT NOT NULL DEFAULT 'foundation',
        secret_ref TEXT,
        status TEXT NOT NULL DEFAULT 'unknown'
          CHECK (status IN ('unknown', 'available', 'missing', 'blocked', 'exhausted', 'disabled')),
        policy_classification TEXT NOT NULL DEFAULT 'untested'
          CHECK (policy_classification IN (
            'untested',
            'allowed',
            'blocked',
            'manual_only',
            'experimental',
            'api_fallback'
          )),
        allowed_workloads TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
        notes TEXT,
        quota_state JSONB NOT NULL DEFAULT '{}'::jsonb,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_by TEXT NOT NULL DEFAULT 'system',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_llm_credentials_lookup
      ON llm_credentials(provider, auth_path, hub_key, workload_lane, status);

      CREATE TABLE IF NOT EXISTS llm_routes (
        route_key TEXT PRIMARY KEY,
        workload TEXT NOT NULL,
        hub_key TEXT NOT NULL DEFAULT 'foundation',
        priority INTEGER NOT NULL DEFAULT 1,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        auth_path TEXT NOT NULL
          CHECK (auth_path IN (
            'api_direct',
            'claude_code_subscription',
            'claude_code_oauth_token',
            'claude_agent_sdk',
            'chatgpt_subscription_gateway',
            'codex_subscription',
            'gemini_api_direct',
            'manual_interactive'
          )),
        credential_key TEXT REFERENCES llm_credentials(credential_key) ON DELETE SET NULL,
        fallback_route_key TEXT,
        status TEXT NOT NULL DEFAULT 'planned'
          CHECK (status IN ('planned', 'probe_required', 'available', 'blocked', 'disabled')),
        policy_classification TEXT NOT NULL DEFAULT 'untested'
          CHECK (policy_classification IN (
            'untested',
            'allowed',
            'blocked',
            'manual_only',
            'experimental',
            'api_fallback'
          )),
        cost_cap_usd NUMERIC(10,4),
        risk_class TEXT NOT NULL DEFAULT 'untested'
          CHECK (risk_class IN ('low', 'medium', 'high', 'untested', 'blocked')),
        notes TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_by TEXT NOT NULL DEFAULT 'system',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_llm_routes_lookup
      ON llm_routes(workload, hub_key, priority, status);

      CREATE TABLE IF NOT EXISTS llm_route_probes (
        probe_id TEXT PRIMARY KEY,
        credential_key TEXT REFERENCES llm_credentials(credential_key) ON DELETE SET NULL,
        provider TEXT NOT NULL,
        auth_path TEXT NOT NULL,
        probe_type TEXT NOT NULL,
        status TEXT NOT NULL
          CHECK (status IN ('passed', 'failed', 'skipped', 'warning')),
        detail TEXT NOT NULL DEFAULT '',
        capability JSONB NOT NULL DEFAULT '{}'::jsonb,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        probed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        probed_by TEXT NOT NULL DEFAULT 'system'
      );

      CREATE INDEX IF NOT EXISTS idx_llm_route_probes_lookup
      ON llm_route_probes(provider, auth_path, probe_type, probed_at DESC);

      CREATE TABLE IF NOT EXISTS llm_calls (
        call_id TEXT PRIMARY KEY,
        workload TEXT NOT NULL,
        hub_key TEXT NOT NULL DEFAULT 'foundation',
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        auth_path TEXT NOT NULL,
        credential_key TEXT REFERENCES llm_credentials(credential_key) ON DELETE SET NULL,
        route_key TEXT REFERENCES llm_routes(route_key) ON DELETE SET NULL,
        status TEXT NOT NULL
          CHECK (status IN ('planned', 'started', 'succeeded', 'failed', 'skipped')),
        estimated_input_tokens INTEGER,
        estimated_output_tokens INTEGER,
        estimated_cost_usd NUMERIC(12,6),
        error_message TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        started_at TIMESTAMPTZ,
        finished_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_llm_calls_lookup
      ON llm_calls(workload, hub_key, status, created_at DESC);

      CREATE TABLE IF NOT EXISTS source_crawl_targets (
        target_key TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        title TEXT NOT NULL,
        lane TEXT NOT NULL
          CHECK (lane IN ('current_day', 'backfill', 'corpus_mining', 'recovery')),
        target_type TEXT NOT NULL DEFAULT 'source',
        status TEXT NOT NULL DEFAULT 'planned'
          CHECK (status IN ('planned', 'active', 'paused', 'complete', 'blocked')),
        priority TEXT NOT NULL DEFAULT 'P1'
          CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
        runtime_mode TEXT NOT NULL DEFAULT 'manual'
          CHECK (runtime_mode IN ('scheduled', 'manual', 'paused')),
        cursor_state JSONB NOT NULL DEFAULT '{}'::jsonb,
        budget JSONB NOT NULL DEFAULT '{}'::jsonb,
        dedupe_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
        lease_owner TEXT,
        lease_expires_at TIMESTAMPTZ,
        last_run_at TIMESTAMPTZ,
        next_run_at TIMESTAMPTZ,
        last_status TEXT,
        last_error TEXT,
        inspected_count INTEGER NOT NULL DEFAULT 0,
        archived_count INTEGER NOT NULL DEFAULT 0,
        extracted_count INTEGER NOT NULL DEFAULT 0,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        notes TEXT,
        updated_by TEXT NOT NULL DEFAULT 'system',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_source_crawl_targets_lookup
      ON source_crawl_targets(lane, status, priority, updated_at DESC);

      CREATE TABLE IF NOT EXISTS source_crawl_target_runs (
        run_id TEXT PRIMARY KEY,
        target_key TEXT NOT NULL REFERENCES source_crawl_targets(target_key) ON DELETE CASCADE,
        source_id TEXT NOT NULL,
        status TEXT NOT NULL
          CHECK (status IN ('running', 'succeeded', 'partial', 'failed', 'skipped')),
        lease_owner TEXT NOT NULL,
        lease_expires_at TIMESTAMPTZ,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        finished_at TIMESTAMPTZ,
        next_run_at TIMESTAMPTZ,
        last_error TEXT,
        inspected_delta INTEGER NOT NULL DEFAULT 0,
        archived_delta INTEGER NOT NULL DEFAULT 0,
        extracted_delta INTEGER NOT NULL DEFAULT 0,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_source_crawl_target_runs_lookup
      ON source_crawl_target_runs(target_key, status, started_at DESC);

      CREATE TABLE IF NOT EXISTS source_crawl_items (
        item_key TEXT PRIMARY KEY,
        target_key TEXT NOT NULL REFERENCES source_crawl_targets(target_key) ON DELETE CASCADE,
        source_id TEXT NOT NULL,
        external_id TEXT NOT NULL,
        item_type TEXT NOT NULL DEFAULT 'artifact',
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'leased', 'succeeded', 'failed', 'skipped')),
        fingerprint TEXT,
        lease_owner TEXT,
        lease_expires_at TIMESTAMPTZ,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        artifact_id TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        processed_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (target_key, external_id)
      );

      CREATE INDEX IF NOT EXISTS idx_source_crawl_items_lookup
      ON source_crawl_items(target_key, status, updated_at DESC);

      CREATE TABLE IF NOT EXISTS intelligence_job_runs (
        job_id TEXT PRIMARY KEY,
        job_type TEXT NOT NULL,
        source_id TEXT,
        artifact_id TEXT,
        foundation_run_id TEXT REFERENCES foundation_job_runs(run_id) ON DELETE SET NULL,
        source_crawl_run_id TEXT REFERENCES source_crawl_target_runs(run_id) ON DELETE SET NULL,
        synthesis_run_id TEXT REFERENCES shared_communication_synthesis_runs(run_id) ON DELETE SET NULL,
        status TEXT NOT NULL
          CHECK (status IN ('planned', 'started', 'succeeded', 'failed', 'skipped')),
        cursor_state JSONB NOT NULL DEFAULT '{}'::jsonb,
        budget JSONB NOT NULL DEFAULT '{}'::jsonb,
        model TEXT,
        provider TEXT,
        auth_path TEXT,
        route_key TEXT,
        cost_usd NUMERIC(12,6),
        item_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
        failure_count INTEGER NOT NULL DEFAULT 0,
        output_artifact_ids TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
        next_run_state JSONB NOT NULL DEFAULT '{}'::jsonb,
        result_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
        error_message TEXT,
        provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
        started_at TIMESTAMPTZ,
        finished_at TIMESTAMPTZ,
        duration_ms INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_intelligence_job_runs_lookup
      ON intelligence_job_runs(status, job_type, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_intelligence_job_runs_source
      ON intelligence_job_runs(source_id, job_type, created_at DESC);

      CREATE TABLE IF NOT EXISTS intelligence_job_llm_calls (
        job_id TEXT NOT NULL REFERENCES intelligence_job_runs(job_id) ON DELETE CASCADE,
        call_id TEXT NOT NULL REFERENCES llm_calls(call_id) ON DELETE CASCADE,
        relationship TEXT NOT NULL DEFAULT 'used',
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (job_id, call_id)
      );

      CREATE TABLE IF NOT EXISTS users (
        email TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        tier SMALLINT
          CHECK (tier IS NULL OR tier IN (1, 2, 3)),
        user_type TEXT NOT NULL
          CHECK (user_type IN ('human', 'system')),
        active BOOLEAN NOT NULL DEFAULT true,
        meeting_sync_enabled BOOLEAN NOT NULL DEFAULT false,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_users_meeting_sync_enabled
      ON users(meeting_sync_enabled, active, user_type, email);

      CREATE TABLE IF NOT EXISTS agent_onboarding_feedback_responses (
        id TEXT PRIMARY KEY,
        token_hash TEXT NOT NULL UNIQUE,
        clickup_task_id TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        milestone_day INTEGER NOT NULL
          CHECK (milestone_day IN (30, 60, 90)),
        score INTEGER NOT NULL
          CHECK (score BETWEEN 1 AND 10),
        improvement_feedback TEXT NOT NULL DEFAULT '',
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        user_agent TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_agent_onboarding_feedback_lookup
      ON agent_onboarding_feedback_responses(clickup_task_id, milestone_day, submitted_at DESC);

      CREATE TABLE IF NOT EXISTS agent_onboarding_feedback_send_attempts (
        id TEXT PRIMARY KEY,
        clickup_task_id TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        milestone_day INTEGER NOT NULL
          CHECK (milestone_day IN (30, 60, 90)),
        token_hash TEXT NOT NULL,
        status TEXT NOT NULL
          CHECK (status IN ('sending', 'sent', 'clickup_requested', 'failed', 'superseded')),
        gmail_message_id TEXT,
        gmail_thread_id TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_feedback_active_send_once
      ON agent_onboarding_feedback_send_attempts(clickup_task_id, milestone_day)
      WHERE status IN ('sending', 'sent', 'clickup_requested');

      CREATE INDEX IF NOT EXISTS idx_agent_feedback_send_attempt_lookup
      ON agent_onboarding_feedback_send_attempts(clickup_task_id, milestone_day, updated_at DESC);

      ALTER TABLE agent_onboarding_feedback_send_attempts
      DROP CONSTRAINT IF EXISTS agent_onboarding_feedback_send_attempts_status_check;

      ALTER TABLE agent_onboarding_feedback_send_attempts
      ADD CONSTRAINT agent_onboarding_feedback_send_attempts_status_check
      CHECK (status IN ('sending', 'sent', 'clickup_requested', 'failed', 'superseded'));

      CREATE TABLE IF NOT EXISTS agent_onboarding_feedback_reminder_attempts (
        id TEXT PRIMARY KEY,
        clickup_task_id TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        milestone_day INTEGER NOT NULL
          CHECK (milestone_day IN (30, 60, 90)),
        reminder_slot_key TEXT NOT NULL,
        reminder_due_at TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL
          CHECK (status IN ('pending', 'sending', 'sent', 'skipped', 'blocked', 'maxed_out', 'repair', 'failed')),
        gmail_message_id TEXT,
        gmail_thread_id TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_feedback_reminder_slot_once
      ON agent_onboarding_feedback_reminder_attempts(clickup_task_id, milestone_day, reminder_slot_key);

      CREATE INDEX IF NOT EXISTS idx_agent_feedback_reminder_attempt_lookup
      ON agent_onboarding_feedback_reminder_attempts(clickup_task_id, milestone_day, updated_at DESC);

      CREATE TABLE IF NOT EXISTS agent_onboarding_feedback_response_notifications (
        id TEXT PRIMARY KEY,
        response_id TEXT NOT NULL UNIQUE,
        clickup_task_id TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        milestone_day INTEGER NOT NULL
          CHECK (milestone_day IN (30, 60, 90)),
        status TEXT NOT NULL
          CHECK (status IN ('sending', 'sent', 'failed')),
        gmail_message_id TEXT,
        gmail_thread_id TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_agent_feedback_response_notification_lookup
      ON agent_onboarding_feedback_response_notifications(clickup_task_id, milestone_day, updated_at DESC);

      CREATE TABLE IF NOT EXISTS sales_listing_assignments (
        clickup_task_id TEXT PRIMARY KEY,
        listing_title TEXT NOT NULL DEFAULT '',
        listing_url TEXT NOT NULL DEFAULT '',
        agent_name TEXT NOT NULL DEFAULT '',
        reset_date DATE,
        days_since_reset INTEGER,
        assigned_leader_key TEXT NOT NULL DEFAULT '',
        assigned_leader_name TEXT NOT NULL DEFAULT '',
        assigned_leader_email TEXT NOT NULL DEFAULT '',
        action_plan_status TEXT NOT NULL DEFAULT 'not_started'
          CHECK (action_plan_status IN ('not_started', 'connected_with_agent', 'created', 'implemented', 'blocked')),
        case_status TEXT NOT NULL DEFAULT 'identified',
        outcome_status TEXT NOT NULL DEFAULT 'open',
        action_plan_state TEXT NOT NULL DEFAULT 'unknown',
        action_plan_no_reason TEXT NOT NULL DEFAULT '',
        first_seen_stale_date DATE,
        stale_since_date DATE,
        original_reset_date DATE,
        current_reset_date DATE,
        adjusted_at DATE,
        adjustment_detected_at TIMESTAMPTZ,
        action_plan_text TEXT NOT NULL DEFAULT '',
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_sales_listing_assignments_leader
      ON sales_listing_assignments(assigned_leader_key, updated_at DESC);
    `)

    await client.query(`
      ALTER TABLE sales_listing_assignments
      ADD COLUMN IF NOT EXISTS case_status TEXT NOT NULL DEFAULT 'identified';

      ALTER TABLE sales_listing_assignments
      ADD COLUMN IF NOT EXISTS outcome_status TEXT NOT NULL DEFAULT 'open';

      ALTER TABLE sales_listing_assignments
      ADD COLUMN IF NOT EXISTS action_plan_state TEXT NOT NULL DEFAULT 'unknown';

      ALTER TABLE sales_listing_assignments
      ADD COLUMN IF NOT EXISTS action_plan_no_reason TEXT NOT NULL DEFAULT '';

      ALTER TABLE sales_listing_assignments
      ADD COLUMN IF NOT EXISTS first_seen_stale_date DATE;

      ALTER TABLE sales_listing_assignments
      ADD COLUMN IF NOT EXISTS stale_since_date DATE;

      ALTER TABLE sales_listing_assignments
      ADD COLUMN IF NOT EXISTS original_reset_date DATE;

      ALTER TABLE sales_listing_assignments
      ADD COLUMN IF NOT EXISTS current_reset_date DATE;

      ALTER TABLE sales_listing_assignments
      ADD COLUMN IF NOT EXISTS adjusted_at DATE;

      ALTER TABLE sales_listing_assignments
      ADD COLUMN IF NOT EXISTS adjustment_detected_at TIMESTAMPTZ;

      ALTER TABLE sales_listing_assignments
      ADD COLUMN IF NOT EXISTS action_plan_text TEXT NOT NULL DEFAULT '';

      ALTER TABLE sales_listing_assignments
      DROP CONSTRAINT IF EXISTS sales_listing_assignments_case_status_check;

      ALTER TABLE sales_listing_assignments
      ADD CONSTRAINT sales_listing_assignments_case_status_check
      CHECK (case_status IN ('identified', 'assigned', 'contacted_agent', 'action_plan_created', 'action_plan_implemented', 'adjusted', 'blocked', 'closed'));

      ALTER TABLE sales_listing_assignments
      DROP CONSTRAINT IF EXISTS sales_listing_assignments_outcome_status_check;

      ALTER TABLE sales_listing_assignments
      ADD CONSTRAINT sales_listing_assignments_outcome_status_check
      CHECK (outcome_status IN ('open', 'adjusted', 'conditional', 'firm', 'closed', 'cancelled', 'expired', 'no_action'));

      ALTER TABLE sales_listing_assignments
      DROP CONSTRAINT IF EXISTS sales_listing_assignments_action_plan_state_check;

      ALTER TABLE sales_listing_assignments
      ADD CONSTRAINT sales_listing_assignments_action_plan_state_check
      CHECK (action_plan_state IN ('unknown', 'yes', 'no'));
    `)

    await client.query(`
      ALTER TABLE shared_communication_artifacts
      DROP CONSTRAINT IF EXISTS shared_communication_artifacts_artifact_type_check;
    `)

    await client.query(`
      ALTER TABLE shared_communication_artifacts
      ADD CONSTRAINT shared_communication_artifacts_artifact_type_check
      CHECK (artifact_type IN ('meeting_note', 'meeting_transcript', 'email_thread', 'calendar_event', 'missive_thread', 'slack_thread', 'drive_document', 'drive_spreadsheet', 'drive_pdf', 'drive_text', 'gmail_attachment', 'video_transcript'));
    `)

    await client.query(`
      ALTER TABLE backlog_items
      DROP CONSTRAINT IF EXISTS backlog_items_team_check;
    `)

    await client.query(`
      UPDATE backlog_items
      SET team = 'foundation'
      WHERE team = 'dev';
    `)

    await client.query(`
      ALTER TABLE backlog_items
      ADD CONSTRAINT backlog_items_team_check
      CHECK (team IN (${backlogScopeKeys.map(scope => `'${scope}'`).join(', ')}));
    `)

    await seedTable(
      client,
      'users',
      foundationUserSeed,
      `
        INSERT INTO users (
          email, name, tier, user_type, active, meeting_sync_enabled, metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
        ON CONFLICT (email) DO UPDATE
        SET name = EXCLUDED.name,
            tier = EXCLUDED.tier,
            user_type = EXCLUDED.user_type,
            active = EXCLUDED.active,
            meeting_sync_enabled = EXCLUDED.meeting_sync_enabled,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
      `,
      row => [
        row.email,
        row.name,
        row.tier,
        row.userType,
        row.active,
        row.meetingSyncEnabled,
        JSON.stringify(row.metadata || {}),
      ]
    )

    await seedTable(
      client,
      'backlog_items',
      backlogSeed,
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO NOTHING
      `,
      row => [
        row.id,
        row.title,
        normalizeBacklogScopeKey(row.scope ?? row.team),
        row.lane,
        row.priority,
        row.rank,
        row.source,
        row.summary,
        row.whyItMatters,
        row.nextAction,
        row.statusNote,
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET title = $2,
            lane = $3,
            summary = $4,
            why_it_matters = $5,
            next_action = $6,
            status_note = $7,
            updated_at = NOW()
        WHERE id = $1
          AND title = $8
      `,
      [
        'FOUNDATION-002',
        'Close out the Admin-tab sign-off and route remaining follow-on work to the right cards',
        'done',
        'The `ADMIN ONLY - Deal Data Entry` sign-off is complete. This card now exists to preserve that closure and make sure the remaining Owners Dashboard follow-on work stays attached to the right downstream cards instead of keeping a false "source sign-off still open" story alive.',
        'If the backlog keeps claiming the Admin-tab sign-off is unfinished after the source layer marks it signed off, Foundation starts violating its own truth model.',
        'Treat `SRC-OWNERS-001`, `SRC-FUB-001` Owners/Admin parity, and `SRC-FINANCE-001` current-reality meaning as closed for v1. Route remaining Owners data cleanup through Ops findings instead of reopening source sign-off.',
        'Closed on 2026-04-16. This card should stay as a closeout record, not an active blocker.',
        'Finish source sign-off for SRC-OWNERS-001',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET title = $2,
            lane = $3,
            summary = $4,
            why_it_matters = $5,
            next_action = $6,
            status_note = $7,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'FOUNDATION-001',
        'Close the Foundation strategy layer against signed-off sources',
        'done',
        'Home, Strategy Packet, System Strategy, Freedom current-reality inputs, Owners Admin meaning, Owners Lists current-reality boundary, and Finance current-reality boundary are aligned to signed-off source truth for this phase.',
        'The strategy layer should not keep reopening because old backlog text says source sign-off is missing after the source contracts and verifier prove the current input boundary is closed.',
        'No active strategy-layer source closeout remains. Route later work to the separate hardening cards for Freedom drift monitoring, source-backed value hardening, decision provenance, temporal history, FUB/KPI parity, and Strategy Hub.',
        'Closed on 2026-04-25 for the current strategy-input boundary. This is not a Foundation-wide completion claim.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            summary = $3,
            next_action = $4,
            status_note = $5,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'UI-MENU-LAYOUT-POLISH-001',
        'done',
        'Foundation navigation, page hierarchy, mobile behavior, and System Inventory current-vs-archive/history split are polished for operator use.',
        'Done for v1. Stop for review; next expected Phase G card is RECENT-BUILDS-BILLION-DOLLAR-UI-001 unless Steve changes the order.',
        'Closed on 2026-04-30 under ui-menu-layout-polish-v1. Default System Inventory current-doc view excludes archive/history docs, Archive / History is available at /foundation#inventory-archive-history, private/local docs remain metadata-only, and desktop/mobile manual review passed for the required routes. This did not redesign Recent Work, changelog, daily summary, source lifecycle, Strategy, Scoper, Agent Factory, corpus, research, or action-review workflows.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            priority = $3,
            summary = $4,
            next_action = $5,
            status_note = $6,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'GATE-RELIABILITY-003',
        'done',
        'P0',
        'Direct Foundation verifier and process gate reads now use read-only DB readiness checks instead of running write-heavy schema/seed initialization during normal review.',
        'Done for v1. Keep direct verifier gates read-only under normal review, keep safe Postgres metadata diagnostics for future transient retries, and continue to use explicit app startup or approved migration paths for DB initialization.',
        'Closed on 2026-04-30 under gate-reliability-direct-verifier-deadlock-v1. V1 adds read-only DB readiness checks for foundation:verify, process ship/fanout gates, post-ship fanout, and backlog hygiene so direct review proof does not run write-heavy initFoundationDb schema/seed work. Gate reliability proof now covers direct foundation:verify Postgres deadlock metadata with safe code, relation OID, process id, gate label, and retry-attempt diagnostics only; no row data, source content, or private content is logged. Proof commands: npm run process:gate-reliability-check, three repeated npm run foundation:verify runs, npm run backlog:hygiene -- --json, and npm run process:foundation-ship -- --card=GATE-RELIABILITY-003 --planApprovalRef=docs/process/approvals/GATE-RELIABILITY-003.json --closeoutKey=gate-reliability-direct-verifier-deadlock-v1 --commitRef=HEAD.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            priority = $3,
            summary = $4,
            next_action = $5,
            status_note = $6,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'RECENT-BUILDS-BILLION-DOLLAR-UI-001',
        'done',
        'P1',
        'Recent Work / Recent Builds is now an executive-grade review surface with collapsed closeout cards, a review-next queue, proof visibility, owner/context separation, and same-commit closeouts that remain individually reviewable.',
        'Done for v1. Stop for review; next expected Phase G card is CHANGE-LOG-COMPREHENSIVE-001 unless Steve changes the order.',
        'Closed on 2026-04-30 under recent-builds-billion-dollar-ui-v1. Recent Work now has an executive summary, visible review-next queue, collapsed-by-default closeout cards, proof/known-limit/where-it-lives sections, separate owning-card and context-card treatments, and same-commit groups that stay grouped while keeping each closeout individually reviewable. Ownership semantics remain exact: backlogIds own cards only, mentioned/context cards stay context only. This did not implement comprehensive changelog, daily summary, source lifecycle expansion, Strategy, Scoper, Agent Factory, corpus, research cleanup, or a new feature lane.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            priority = $3,
            summary = $4,
            next_action = $5,
            status_note = $6,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'CHANGE-LOG-COMPREHENSIVE-001',
        'done',
        'P1',
        'System Activity now has a comprehensive source-backed changelog with recent highlights, by-surface grouping, by-type grouping, raw evidence rows, inspectable evidence refs, and owner/context card separation.',
        'Done for v1. Stop for review; next expected Phase G card is DAILY-EXEC-SUMMARY-001 unless Steve changes the order.',
        'Closed on 2026-04-30 under change-log-comprehensive-v1. V1 adds /api/foundation/change-log as an additive source-backed changelog layer over verified closeouts, DB change_events, and changed-file evidence; /api/foundation/changes remains backward-compatible. System Activity now shows recent highlights, by-surface groups, by-type groups, and a raw evidence feed with inspectable evidence refs. The process check proves 40+ entries, 20+ verified closeout-backed entries, at least 8/10 change types unless absence is proven, latest 5 Recent Builds represented, the current closeout represented, zero ownership/context smearing, no silent missing categories, and no private/local file content copied into entries. This did not implement Daily Exec Summary, source lifecycle expansion, Strategy, Scoper, Agent Factory, corpus, research cleanup, or a new feature lane.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            priority = $3,
            summary = $4,
            next_action = $5,
            status_note = $6,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'AGENT-ONBOARDING-FEEDBACK-SYSTEM-001',
        'done',
        'P1',
        'Agent Onboarding Feedback is now visible as a partial Foundation/Ops system with trigger, source, queue, form, writeback, statuses, blockers, proof surfaces, and privacy boundaries.',
        'Done for v1. Stop for review. Next expected Agent Feedback build is AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001 before Steve full-loop live testing. SYS-AGENT-ONBOARDING-FEEDBACK-001 stays implementationState partial until the governed send loop ships live.',
        'Closed on 2026-04-30 under agent-onboarding-feedback-system-v1. Added SYS-AGENT-ONBOARDING-FEEDBACK-001 to /api/source-of-truth groupedSystems as the 13th grouped system, preserved the existing 12 grouped systems, mapped the system to Agent Onboarding, and marked implementationState partial because the queue, /agent-feedback private-token form, agent_onboarding_feedback_responses table, and Completed/Score/Feedback writeback path exist but the production Gmail send path and ClickUp Requested writeback are not built yet. Preserved system context: System name: Agent Onboarding Feedback. Operating area: Agent Onboarding. Source of truth: ClickUp Agent Roster. Trigger: Real Start Date + day 30/60/90. Current queue: Agent Roster review / Ops review queue. Current form: /agent-feedback private token link. Current writeback: Onboarding NPS 30/60/90 Status, Score, Feedback fields. Current statuses: not due, due, requested, completed, skipped, blocked, expired window. Current blockers after AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001: missing Real Start Date, missing Company Email, invalid Company Email, expired send window, missing/invalid feedback fields. Contract Link is warning-only. Proof surfaces: Ops Hub Agent Roster queue, /api/owners/review-queue, ClickUp task, feedback response DB table agent_onboarding_feedback_responses, Gmail send proof once send path exists. Privacy boundary: private feedback links, no private feedback content broadly exposed, feedback content visible only in approved owner/review surfaces. Known test cases: Steve Zahnd: Day-30 dry-run eligible through Company Email; Georgia: Real Start Date 2026-03-29, Day-30 due 2026-04-28, due item exists; Chris: does not fire until Real Start Date is set/readable. Proof is metadata-only for known cases. No Gmail send. No ClickUp Requested writeback. This card created/scoped FOUNDATION-SYSTEMS-EMPTY-GROUP-AUDIT-001 as context only, kept AGENT-FEEDBACK-SEND-001 scoped, did not send Georgia a survey, did not build the production email path, did not broaden Systems regrouping, and did not copy private feedback tokens, feedback content, or raw email addresses into tracked docs, verifier logs, build log, or manual proof.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            priority = $3,
            summary = $4,
            next_action = $5,
            status_note = $6,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'AGENT-FEEDBACK-SEND-001',
        'done',
        'P1',
        'Stage 1 of the 30/60/90 onboarding feedback send path is built and dry-run proven without sending Gmail or writing ClickUp Requested.',
        'Done for Stage 1. Stop for review. The next live test is AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001 after AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001; no Georgia test is the current target.',
        'Closed on 2026-04-30 under agent-feedback-send-v1 for Stage 1 only, then policy-corrected by AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001. Dry-run first. No real send without Steve exact SEND APPROVED or a later approved production-all artifact. Agent Feedback sends use ClickUp Company Email only for every request, test send, auto-send candidate, and reminder candidate. Personal Email is not used for Agent Feedback send eligibility. Onboarding feedback sends use BCC/internal oversight roles Steve, Carson, Ryan, and Georgia by default, with To-recipient dedupe. Capture Gmail message/thread ID only after approval. Built eligibility, metadata-only dry-run, duplicate-send protection, Gmail send path wiring, Requested writeback sequencing, privacy checks, and verifier coverage. Mark Requested in ClickUp only after Gmail send succeeds. Duplicate send protection. No send if Company Email is missing or invalid. No send if milestone window expired. Contract Link is warning/data-quality metadata only and does not block 30/60/90 onboarding feedback send eligibility. Steve Zahnd Day-30 dry-run is eligible through Company Email and is the next live full-loop test target; Georgia may remain eligible in dry-run but is not the test target. No Gmail send. No ClickUp Requested writeback. No Georgia survey. Submitted feedback still writes Completed, score, and feedback text back to the correct ClickUp Onboarding NPS 30/60/90 Status, Score, and Feedback fields. Feedback response is stored in the agent_onboarding_feedback_responses table with task ID, agent name, milestone day, token hash, score, feedback, and submitted timestamp. Feedback content is not broadly exposed outside approved owner/review surfaces. Private feedback token URLs, raw email addresses, and feedback content are not copied into tracked proof.',
      ]
    )

    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          lane = EXCLUDED.lane,
          priority = EXCLUDED.priority,
          rank = EXCLUDED.rank,
          summary = EXCLUDED.summary,
          why_it_matters = EXCLUDED.why_it_matters,
          next_action = EXCLUDED.next_action,
          status_note = EXCLUDED.status_note,
          updated_at = NOW()
      `,
      [
        'AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001',
        'Make Agent Feedback sends use Company Email only',
        'foundation',
        'done',
        'P1',
        14,
        'Steve mission to get Agent Feedback live without one-person patches',
        'Agent Feedback request sends, test sends, auto-send readiness, and reminder readiness now use ClickUp Company Email only, with Personal Email removed from send eligibility.',
        'The Steve full-loop dry-run was blocked because the workflow still treated non-Georgia targets as external agents and looked for Personal Email. Agent Feedback is a company-roster workflow, so all eligibility must use Company Email before live testing or production auto-send.',
        'Done for v1. Next build is AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001 for Steve Zahnd only, then AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001 after the full loop passes.',
        'Closed on 2026-05-01 under agent-feedback-company-email-policy-v1. Agent Feedback request sends, auto-send candidates, reminder candidates, and test sends now use ClickUp Company Email only. Personal Email is not used anywhere in Agent Feedback send eligibility, and legacy Personal Email blockers cannot appear in Agent Feedback checks. Contract Link remains warning-only. BCC oversight remains Steve, Carson, Ryan, and Georgia with To-recipient dedupe. The route-specific approval validator supports any approved target, not Georgia only. Test allowlists and auto-send allowlists support any named target while production-all remains a separate approval mode. Proof shows Steve Zahnd Day-30 dry-run eligible via Company Email, Georgia Day-30 eligible via Company Email when checked but not the live test target, and a synthetic external agent eligible via Company Email. Send, auto-send, reminder, and response-notify checks passed. No Gmail send, no ClickUp Requested writeback, no production auto-send, no Georgia test, and no raw emails/tokens/feedback content in tracked proof.',
      ]
    )

    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          lane = EXCLUDED.lane,
          priority = EXCLUDED.priority,
          rank = EXCLUDED.rank,
          summary = EXCLUDED.summary,
          why_it_matters = EXCLUDED.why_it_matters,
          next_action = EXCLUDED.next_action,
          status_note = EXCLUDED.status_note,
          updated_at = NOW()
      `,
      [
        'AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001',
        'Run the Steve Zahnd Agent Feedback full-loop test',
        'foundation',
        'scoped',
        'P1',
        15,
        'Steve mission to get Agent Feedback live',
        'Run one controlled live onboarding feedback loop on the Steve Zahnd card only: request email, Requested writeback, form submission, DB save, Completed/Score/Feedback writeback, response notification, reminder stop, and duplicate protection.',
        'The live system needs one end-to-end proof on Steve before production auto-send is enabled. This proves Gmail, ClickUp Requested, feedback submission, DB persistence, ClickUp completion fields, internal notification, reminder stop, and duplicate ledger behavior together.',
        'Not accepted. Build AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001 before any production enablement. The repair must prove Steve submitted through the real emailed browser link.',
        'Reopened on 2026-05-01 after Steve reported the browser submit failed because the live test script consumed the emailed token with a synthetic controlled response. The prior proof remains evidence of the failure mode only, not acceptance. Production auto-send is stopped until AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001 sends a fresh Steve Day-30 email, waits for Steve to submit the real browser link, and proves DB response, ClickUp Completed/Score/Feedback, notification, reminder stop, and duplicate protection.',
      ]
    )

    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          lane = EXCLUDED.lane,
          priority = EXCLUDED.priority,
          rank = EXCLUDED.rank,
          summary = EXCLUDED.summary,
          why_it_matters = EXCLUDED.why_it_matters,
          next_action = EXCLUDED.next_action,
          status_note = EXCLUDED.status_note,
          updated_at = NOW()
      `,
      [
        'AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001',
        'Repair Steve full-loop test for real browser submission',
        'foundation',
        'done',
        'P0',
        16,
        'Steve correction after script consumed the emailed full-loop token',
        'Split Steve full-loop testing into send-only/manual-user and dry-run-only synthetic modes, supersede the script-consumed test artifacts, send one fresh Steve Day-30 request, and verify Steve submits through the real emailed browser link.',
        'The previous script proved internal plumbing but invalidated the actual user experience by consuming Steve’s token before he could submit. Production cannot start until the real browser path is proven.',
        'Done for repair. Stop before production enablement. The next card remains AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001 only after separate production approval; start with dry-run production report, not live auto-send.',
        'Closed on 2026-05-01 under agent-feedback-real-user-submit-repair-v1. The repair split send-only/manual-user mode from dry-run-only synthetic-submit, disabled live synthetic consumption of the emailed token, superseded the prior script-consumed Steve Day-30 response without deleting evidence, sent one fresh Steve Day-30 Company Email request, and waited for Steve to submit from the real emailed browser link. Final proof shows the DB saved the real browser response, ClickUp Completed/Score/Feedback writeback succeeded, internal notification sent to Steve/Carson/Ryan/Georgia, reminder readiness stops because feedback is completed, duplicate submit returns the clear already-submitted message, duplicate resend is blocked before Gmail or ClickUp side effects, manual-user BCC metadata is correct with Steve deduped from actual BCC, production auto-send remains disabled, Georgia was not the target, and no other roster send happened. Closeout owns only AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001.',
      ]
    )

    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          lane = EXCLUDED.lane,
          priority = EXCLUDED.priority,
          rank = EXCLUDED.rank,
          summary = EXCLUDED.summary,
          why_it_matters = EXCLUDED.why_it_matters,
          next_action = EXCLUDED.next_action,
          status_note = EXCLUDED.status_note,
          updated_at = NOW()
      `,
      [
        'FOUNDATION-VERIFY-HEALTH-REPAIR-001',
        'Repair Foundation verifier health before production auto-send',
        'foundation',
        'done',
        'P0',
        17,
        'Steve directive after AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001 acceptance',
        'Fix or classify the three remaining foundation:verify failures: worker startup code trust, DAILY-EXEC-SUMMARY-001, and AGENT-ONBOARDING-FEEDBACK-SYSTEM-001.',
        'The onboarding real-user flow is proven, but production auto-send should not start while Foundation health is red. The verifier must be green before the production enablement card opens.',
        'Done for health repair. Next card is AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001, starting with a dry-run production report and separate production approval. Do not enable production auto-send from this closeout.',
        'Closed on 2026-05-01 under foundation-verify-health-repair-v1. Worker startup code trust was real served-code drift and was repaired by restarting the Foundation worker so it serves HEAD. DAILY-EXEC-SUMMARY-001 was stale date-scoped verifier expectation and now compares latest Recent Work builds as of the selected summary date. AGENT-ONBOARDING-FEEDBACK-SYSTEM-001 was stale live source-context wording and now records explicit status vocabulary, live-send Gmail proof wording, and current Chris source-state proof. Full foundation:verify is green, backlog hygiene is green, dashboard and worker serve HEAD, the real-user Agent Feedback repair remains accepted, production auto-send remains disabled, no Gmail was sent, and no ClickUp writeback happened. Closeout owns only FOUNDATION-VERIFY-HEALTH-REPAIR-001.',
      ]
    )

    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          lane = EXCLUDED.lane,
          priority = EXCLUDED.priority,
          rank = EXCLUDED.rank,
          summary = EXCLUDED.summary,
          why_it_matters = EXCLUDED.why_it_matters,
          next_action = EXCLUDED.next_action,
          status_note = EXCLUDED.status_note,
          updated_at = NOW()
      `,
      [
        'AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001',
        'Enable governed Agent Feedback production auto-send',
        'foundation',
        'done',
        'P1',
        18,
        'Agent Feedback production enablement',
        'Production-all auto-send is live for eligible 30/60/90 onboarding feedback initial requests through the governed two-key approval path.',
        'This closes the operational gap between ready Agent Feedback infrastructure and live production onboarding feedback requests while keeping sends governed, duplicate-safe, and visible.',
        'Closed under agent-feedback-production-autosend-enable-v1. Live reminders are now handled by AGENT-FEEDBACK-LIVE-REMINDERS-001.',
        'Closed on 2026-05-01 under agent-feedback-production-autosend-enable-v1. Production auto-send is live with AGENT_FEEDBACK_AUTO_SEND_ENABLED=true and the approved production artifact. The daily job runs at 8:30 AM America/Toronto, fails closed outside the 8:30-10:00 AM America/Toronto send window, uses Company Email only, BCCs Steve/Carson/Ryan/Georgia with To/BCC dedupe, writes ClickUp Requested only after Gmail succeeds, blocks repeat sends through agent_onboarding_feedback_send_attempts, records non-resend repair state if Gmail succeeds and ClickUp Requested writeback fails, and exposes enabled state, send window, last run, next run, sent/skipped/blocked/warning/repair counts in Runtime/Ops. Controlled production proof is metadata-only with no raw emails, private token URLs, raw tokens, or feedback content. Reminder sends were intentionally left to AGENT-FEEDBACK-LIVE-REMINDERS-001. Closeout owns only AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001. Proof commands include npm run agent-feedback:auto-send -- --mode=live --maxSends=5, npm run process:agent-feedback-production-autosend-enable-check, npm run backlog:hygiene -- --json, and npm run foundation:verify. Proof doc: docs/audits/2026-05-01-agent-feedback-production-autosend-enable-proof.md.',
      ]
    )

    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          lane = EXCLUDED.lane,
          priority = EXCLUDED.priority,
          rank = EXCLUDED.rank,
          summary = EXCLUDED.summary,
          why_it_matters = EXCLUDED.why_it_matters,
          next_action = EXCLUDED.next_action,
          status_note = EXCLUDED.status_note,
          updated_at = NOW()
      `,
      [
        'AGENT-FEEDBACK-LIVE-REMINDERS-001',
        'Enable governed Agent Feedback live reminders',
        'foundation',
        'done',
        'P1',
        19,
        'Steve mission to make the full Agent Onboarding Feedback loop live',
        'Live reminders are enabled for requested-but-not-completed 30/60/90 onboarding feedback, using the existing cadence and the approved 8:30-10:00 AM America/Toronto send window.',
        'Production initial requests are live, but the full loop is not running until requested feedback receives governed follow-up reminders without duplicate sends or off-hours outreach.',
        'Closed under agent-feedback-live-reminders-v1. Stop for Steve review. Next work is the systems visibility pass, then Foundation + Strategy only.',
        'Closed on 2026-05-02 under agent-feedback-live-reminders-v1. Live reminders are enabled with AGENT_FEEDBACK_REMINDERS_ENABLED=true and the approved production reminder artifact. The reminder job runs at 8:30 AM America/Toronto, fails closed outside the 8:30-10:00 AM America/Toronto send window before Gmail, ClickUp, or reminder ledger side effects, uses ClickUp Company Email only, BCCs Steve/Carson/Ryan/Georgia with To/BCC dedupe, follows the day 1, 3, 7, 10, 14, and 17 cadence after the initial Requested timestamp, blocks repeat reminder slots through agent_onboarding_feedback_reminder_attempts, does not write ClickUp Requested, and stops after feedback is completed, skipped, or blocked. Georgia Huntley Day-30 and Chris Chopite Day-30 have exactly one protected Requested initial attempt each; no reminder was due in the controlled run, and both next reminder states are deferred to 2026-05-03T00:00:00.000Z unless completed first. Broad proof is metadata-only with no raw emails, private token URLs, raw tokens, or feedback content. Closeout owns only AGENT-FEEDBACK-LIVE-REMINDERS-001.',
      ]
    )

    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          lane = EXCLUDED.lane,
          priority = EXCLUDED.priority,
          rank = EXCLUDED.rank,
          summary = EXCLUDED.summary,
          why_it_matters = EXCLUDED.why_it_matters,
          next_action = EXCLUDED.next_action,
          status_note = EXCLUDED.status_note,
          updated_at = NOW()
      `,
      [
        'AGENT-FEEDBACK-REMINDER-CADENCE-001',
        'Build Agent Onboarding Feedback reminder cadence readiness',
        'foundation',
        'done',
        'P1',
        13,
        'Steve reminder cadence gate before full-loop test',
        'Agent Onboarding Feedback now has dry-run reminder cadence readiness with schedule, caps, stop rules, duplicate slot protection, ledger schema, and Runtime/Ops counts.',
        'Before Steve tests the full loop, the system needs the reminder lane in place so request, reminder, submission, ClickUp writeback, and internal notification can be exercised without redesigning the send path mid-test.',
        'Done for readiness. Stop for review. Next expected step is AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001, then AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001; no live reminder, Georgia send, Steve test, production auto-send, or ClickUp Requested writeback happened in this build.',
        'Closed on 2026-05-01 under agent-feedback-reminder-cadence-v1 as reminder cadence readiness only. V1 adds the reminder schedule day 1, day 3, day 7, day 10, day 14, and day 17 after a successful initial request, with cap 6 reminders or 30 days after initial request. No reminder can run before a successful initial request exists in agent_onboarding_feedback_send_attempts with status clickup_requested. Reminders stop if feedback is completed or ClickUp status is Completed, Skipped, or Blocked. Duplicate slot protection is keyed by agent_onboarding_feedback_reminder_attempts clickup_task_id + milestone_day + reminder_slot_key. Runtime Health and Ops expose pending, sent, skipped, blocked, maxed-out, repair, warning, and next-due counts. AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001 makes reminder recipients use Company Email only. Dry-run/report mode only; no live reminder send, Georgia send, Steve test, production auto-send, ClickUp Requested writeback, Gmail send, raw email address, token URL, or feedback-content exposure happened. Closeout owns only AGENT-FEEDBACK-REMINDER-CADENCE-001.',
      ]
    )

    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          lane = EXCLUDED.lane,
          priority = EXCLUDED.priority,
          rank = EXCLUDED.rank,
          summary = EXCLUDED.summary,
          why_it_matters = EXCLUDED.why_it_matters,
          next_action = EXCLUDED.next_action,
          status_note = EXCLUDED.status_note,
          updated_at = NOW()
      `,
      [
        'AGENT-FEEDBACK-AUTO-SEND-001',
        'Build governed Agent Onboarding Feedback auto-send readiness',
        'foundation',
        'done',
        'P1',
        11,
        'Steve clarification after AGENT-FEEDBACK-SEND-001 Stage 2 readiness',
        'The Agent Onboarding Feedback send path now has daily auto-send readiness scanning and two-key live-send controls, with no Gmail send or ClickUp Requested writeback during this build.',
        'The intended end-state is governed automatic 30/60/90 feedback sending, not manual one-off sends. The system needs scanner, reporting, side-effect safety, duplicate protection, and explicit live-send controls before Steve approves any test or production send mode.',
        'Done for readiness. Stop for review. Next decision is AGENT-FEEDBACK-STEVE-FULL-LOOP-TEST-001, then AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001. Production-all requires a separate approval artifact.',
        'Closed on 2026-05-01 under agent-feedback-auto-send-v1 as auto-send readiness only, then policy-corrected by AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001. V1 adds a daily dry-run/report scanner over the ClickUp Agent Roster for 30/60/90 onboarding feedback candidates, reports would-send/sent/skipped/blocked/warning/repair counts in Runtime Health and Ops, and keeps default behavior dry-run/report-only. Live sends require both AGENT_FEEDBACK_AUTO_SEND_ENABLED=true and an approved mode/allowlist artifact; toggle alone cannot send, allowlist alone cannot send, and production-all requires a separate approval artifact. Auto-send candidates use Company Email only. Steve Zahnd Day-30 is eligible in dry-run and is the next full-loop test target; Georgia Day-30 may remain eligible in dry-run but is not the live test target. Contract Link remains warning-only. Duplicate-send protection and Gmail-before-ClickUp Requested sequencing remain enforced; if Gmail succeeds but ClickUp Requested fails, the send attempt stays in sent/repair state and does not become resendable. No Gmail send, no ClickUp Requested writeback, no broad live auto-send, no raw email addresses, token URLs, or feedback content were written to tracked docs, verifier logs, build log, or broad API JSON. Closeout owns only AGENT-FEEDBACK-AUTO-SEND-001.',
      ]
    )

    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          lane = EXCLUDED.lane,
          priority = EXCLUDED.priority,
          rank = EXCLUDED.rank,
          summary = EXCLUDED.summary,
          why_it_matters = EXCLUDED.why_it_matters,
          next_action = EXCLUDED.next_action,
          status_note = EXCLUDED.status_note,
          updated_at = NOW()
      `,
      [
        'AGENT-FEEDBACK-RESPONSE-NOTIFY-001',
        'Notify internal oversight when onboarding feedback is submitted',
        'foundation',
        'done',
        'P1',
        12,
        'Steve response-notification gate before Georgia live-send',
        'Agent Onboarding Feedback submissions now notify Steve, Carson, Ryan, and Georgia internally after the response is saved, with ClickUp writeback status and duplicate protection.',
        'A Georgia or future agent survey is not useful if completed feedback sits quietly in the database. Internal oversight needs a private notification after submission, including repair status when ClickUp writeback fails.',
        'Done for v1. Stop for review. Response notifications remain active for the Steve full-loop test and later production-all enablement.',
        'Closed on 2026-05-01 under agent-feedback-response-notify-v1. V1 sends internal response notifications only after agent_onboarding_feedback_responses saves the submitted feedback and after the ClickUp Completed/Score/Feedback writeback attempt. Notifications go to internal oversight roles Steve, Carson, Ryan, and Georgia using approved internal email identities. The internal email includes agent name, milestone day, score, feedback text, submitted timestamp, ClickUp task/source reference, and ClickUp writeback status. If ClickUp writeback fails after DB save, the notification still sends with repair status clickup_completed_writeback_failed. Duplicate notification protection is keyed by response_id in agent_onboarding_feedback_response_notifications. Synthetic dry-run proof covers success and repair paths with no Gmail send. Tracked docs, verifier logs, build log, and broad API proof use roles/hashes only and do not copy private tokens, raw email addresses, or feedback text. No external survey email, ClickUp Requested writeback, live auto-send, Strategy, Scoper, Agent Factory, corpus/source expansion, research cleanup, or new feature lane happened. Closeout owns only AGENT-FEEDBACK-RESPONSE-NOTIFY-001.',
      ]
    )

    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          lane = EXCLUDED.lane,
          priority = EXCLUDED.priority,
          rank = EXCLUDED.rank,
          summary = EXCLUDED.summary,
          why_it_matters = EXCLUDED.why_it_matters,
          next_action = EXCLUDED.next_action,
          status_note = EXCLUDED.status_note,
          updated_at = NOW()
      `,
      [
        'AGENT-FEEDBACK-GEORGIA-SEND-001',
        'Send the approved Georgia onboarding feedback request',
        'foundation',
        'scoped',
        'P2',
        19,
        'AGENT-FEEDBACK-SEND-001 Stage 1 follow-up',
        'Paused Georgia-specific live-send card retained as historical context only; Steve full-loop test is now the active live test path.',
        'Georgia helped prove readiness, but the current mission is not another one-off Georgia patch. The system must prove Steve real-user browser submit, then production auto-send.',
        'Do not build unless Steve explicitly reopens a Georgia-specific send. Active order is AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001, then AGENT-FEEDBACK-PRODUCTION-AUTOSEND-ENABLE-001 after repair acceptance.',
        'Scoped by AGENT-FEEDBACK-SEND-001 as historical context and superseded by AGENT-FEEDBACK-COMPANY-EMAIL-POLICY-001 plus the Steve full-loop test path. Georgia Day-30 may remain eligible in dry-run through ClickUp Company Email, but Georgia is not the live test target. Onboarding feedback sends use Company Email only, BCC/internal oversight roles Steve, Carson, Ryan, and Georgia by default, and To-recipient dedupe. Contract Link is warning/data-quality metadata only and does not block 30/60/90 onboarding feedback send eligibility. Proof must remain metadata-only except Gmail message/thread IDs and ClickUp Requested writeback confirmation after an approved send; no token URLs, raw email addresses, or feedback content in tracked proof.',
      ]
    )

    await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary, why_it_matters, next_action, status_note
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO NOTHING
      `,
      [
        'FOUNDATION-SYSTEMS-EMPTY-GROUP-AUDIT-001',
        'Audit empty Foundation Systems service groups',
        'foundation',
        'scoped',
        'P2',
        11,
        'FOUNDATION-SYSTEMS-SERVICE-GROUPING-001 review follow-up',
        'Audit every empty Systems service group and decide whether it is truly empty, missing an existing system mapping, or needs a new scoped system-build card.',
        'Empty service groups are useful signals. They should not be filled with fake systems, but they also should not hide missing mappings for Recruiting, Finance, onboarding, deals, people, or marketing-client systems.',
        'Plan the audit only when Steve approves this card. Every empty group gets a disposition: valid empty, existing system to map, or new scoped card needed. Findings must be visible in backlog/current plan. No fake systems. Sales and Recruiting stay separate.',
        'Scoped on 2026-04-30 by AGENT-ONBOARDING-FEEDBACK-SYSTEM-001 as context only. After Agent Onboarding Feedback is mapped, Agent Onboarding should no longer be empty. Remaining empty groups should be audited without inventing fake systems: Recruiting, Marketing - Clients, Client Onboarding, Closing / Deals, Finance, and People / Retention unless source-backed evidence changes before the audit. This card stays scoped and is not owned by agent-onboarding-feedback-system-v1.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            priority = $3,
            summary = $4,
            next_action = $5,
            status_note = $6,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'DAILY-EXEC-SUMMARY-001',
        'done',
        'P1',
        'Foundation now has a date-scoped daily executive summary surface that shows where the day started, what changed, what shipped, what remains, what was learned, what is next, and proof/evidence refs.',
        'Done for v1. Stop for review; next expected Phase G card is SOURCE-LIFECYCLE-EXPANSION-001 unless Steve changes the order.',
        'Closed on 2026-04-30 under daily-exec-summary-v1. V1 adds /api/foundation/daily-summary as an additive date-scoped summary layer over Recent Work, comprehensive changelog, current plan/state, live backlog truth, action/research disposition summaries, and recorded proof. Foundation > Daily Summary shows selected date, recent-day selector/list, where we started, what changed, what shipped, what remains, what we learned, what is next, and proof/evidence refs. The process check proves evidence refs on every section, latest 5 Recent Builds represented, this closeout represented, shipped/still-open/needs-review/next-build separation, no ownership/context smearing, no private/local content copied, and existing build-log/changelog/changes API compatibility. This did not implement source lifecycle expansion, Strategy, Scoper, Agent Factory, corpus, research cleanup, Action Review applying, or a new feature lane.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET title = $2,
            lane = $3,
            summary = $4,
            why_it_matters = $5,
            next_action = $6,
            status_note = $7,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SOURCE-014',
        'Close strategy live-input boundary for the full strategy packet',
        'done',
        'Freedom Community, BHAG Builder, Agent Engine, and the strategy-used Owners slice are captured for current-reality strategy use. The current strategy live-input boundary is closed for this phase.',
        'The Strategy packet should show as closed once the exact live inputs behind it are signed off; future hardening should not masquerade as an unfinished source sign-off.',
        'Keep the closed package aligned through verifier checks. Route later work to Freedom drift monitoring, source-backed value hardening, decision provenance, temporal history, FUB/KPI source trust, and Strategy Hub cards.',
        'Closed on 2026-04-25 after Owners, Finance, Freedom, and Lists current-reality coverage were made explicit and verified.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET title = $2,
            lane = $3,
            summary = $4,
            why_it_matters = $5,
            next_action = $6,
            status_note = $7,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'FOUNDATION-003',
        'Close source sign-off for SRC-FINANCE-001',
        'done',
        'Weekly Actuals, Monthly Budget, Cashflow Dash, and the partner-commission normalization boundary are signed off for current-reality meaning.',
        'The source layer should not keep reopening finance meaning after the source note already locked the workbook logic. Future payment reconciliation and QuickBooks checks are separate hardening, not current source-signoff blockers.',
        'Treat `SRC-FINANCE-001` as closed for current reality. Keep QuickBooks parked as optional compliance verification and route future work to freshness, payment reconciliation, or automation-hardening cards only when those surfaces are being built.',
        'Closed for current reality. Current doctrine: Weekly Actuals = operating finance ledger, Cashflow Dash = management truth after partner-commission normalization, QuickBooks = optional compliance ledger / verification detail.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            summary = $3,
            next_action = $4,
            status_note = $5,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SYSTEM-009',
        'done',
        'The root backlog now uses a data-driven scope registry instead of fixed `dev` / `marketing` labels, so Foundation, Strategic Execution, Marketing, and future hubs can share one queue model without frontend surgery.',
        'Keep the scope registry authoritative, let the API/UI read from it, and expand the active scopes only when a real root queue or hub is ready instead of hardcoding new labels ad hoc.',
        'Closeout backfilled on 2026-04-29 under CLOSEOUT-BACKFILL-001. Evidence: historical done state is explicitly preserved in docs/process/verifier-exceptions.json. Existing proof details remain: canonical backlog scopes are registry-driven, legacy dev items are backfilled to foundation, and the Foundation UI/API create, filter, and edit against scope metadata instead of fixed labels.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            next_action = $3,
            status_note = $4,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SOURCE-001',
        'scoped',
        'Keep scoped and not active. Later plan the Gmail boundary and normalization slice with signed-off source scope, acceptance, and proof commands before execution.',
        'Foundation 1100 hygiene cleanup on 2026-04-30: scoped/parked only, not active and not next. Delegated Gmail access exists, but remaining work is signed-off scope and normalization and must not start without approved plan, proof commands, foundation:verify, and closeout.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            priority = $3,
            next_action = $4,
            status_note = $5,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'STRATEGIC-INTEL-001',
        'scoped',
        'P0',
        'Keep scoped and not active. Before any build, review and approve `docs/specs/2026-04-28-strategic-intelligence-loop.md`. The approved plan must decide the `intelligence_strategic_issues` ledger/schema, lifecycle fields, typed urgency, impact, confidence, and staleness, daily/event/weekly cadence, old scout -> director -> scoper -> sprint mapping, resolution feedback writes, and 10x pilot metrics: >= 5 strategic issues surfaced/week, >= 3 scoped/week, >= 2 resolved-to-applied/week, and median manual investigation time <= 30 minutes per issue. Implementation blocks `INTEL-SCOPER-001` until the issue-ledger/schema decision is accepted. Closeout requires acceptance criteria, proof commands, foundation:verify, and closeout evidence.',
        'Foundation 1100 hygiene cleanup on 2026-04-30: scoped/parked only, not active and not next. This card must not move to executing or done without an approved plan, explicit acceptance criteria, proof commands, foundation:verify, and closeout evidence. Original context is preserved below.\n\nNew P0 from 2026-04-28. The checkpoint moved the design out of chat memory into `docs/specs/2026-04-28-strategic-intelligence-loop.md`, but this remains scoped until Steve/system review accepts the spec. Do not expand Strategic Intelligence code before Foundation sweep/build visibility catches up.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            next_action = $3,
            status_note = $4,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SOURCE-002',
        'scoped',
        'Keep scoped and not active. Later plan the Calendar boundary and normalization slice with signed-off source scope, acceptance, and proof commands before execution.',
        'Foundation 1100 hygiene cleanup on 2026-04-30: scoped/parked only, not active and not next. Delegated Calendar access exists, but remaining work is signed-off scope and normalization and must not start without approved plan, proof commands, foundation:verify, and closeout.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            next_action = $3,
            status_note = $4,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SOURCE-006',
        'scoped',
        'Keep scoped and not active. Later plan Missive boundary/normalization with signed-off source scope, acceptance, and proof commands before execution.',
        'Foundation 1100 hygiene cleanup on 2026-04-30: scoped/parked only, not active and not next. Missive access exists, but remaining work is signed-off scope and normalization and must not start without approved plan, proof commands, foundation:verify, and closeout.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            next_action = $3,
            status_note = $4,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SOURCE-018',
        'scoped',
        'Use the now-live paginated delegated scan, transcript-gap report, and meeting-class metadata to close the meeting contract: verify the post-default forward flow on each organizer’s most recent meetings, keep widening governed extraction/apply depth, and only then decide whether older pre-2026 artifacts justify a deeper historical pull.',
        'Delegated meeting-note reads now scan the enabled BCrew user list with paginated Drive search, detect standalone transcript docs or embedded transcript sections, archive canonical meeting artifacts into PostgreSQL, mirror organized copies into Crewbert Drive in copy mode, and tag meetings `broadcast` vs `discussion`. Remaining work is forward-looking transcript enforcement verification, privacy/read-side controls, and deeper historical probing, not basic access.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            next_action = $3,
            status_note = $4,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SOURCE-019',
        'scoped',
        'Keep Gmail / Missive / Slack / meeting archives stable, deepen candidate promotion paths, add read-side subject-person redaction, and close the synthesis functions on top: cross-artifact linking, resolution detection, cross-source dedup, staleness scoring, and actionability ranking.',
        'Shared archive is now materially real across Gmail, Missive, Slack, meeting notes, and meeting transcripts, with governed extraction live for all four, first apply paths for task -> backlog, decision -> decision, and blocker -> open question, plus a first batch synthesis proof. Remaining work is durable backfill control, source-backed fact grounding, read-side privacy/query logic, and turning synthesis from proof into operating layer.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            priority = $3,
            rank = $4,
            next_action = $5,
            status_note = $6,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SYNTHESIS-ENGINE-001',
        'done',
        'P0',
        8,
        'Done for v1. Keep synthesis quality gates active while Strategy Hub consumes clustered, strategy/operational classified items; next hardening is route disposition, build-closeout discipline, and the Strategy Quarter source layer.',
        'Closed on 2026-04-27 after Steve accepted the repaired sample grain. Proof synthesis-engine-proof-20260428030545 produced 8 clustered items, 1 Strategy item, 0 single-evidence Strategy items, and a meeting-readable title: "Clarify where leads come from across Benson Crew / Steve Zahnd / MarketMasters." Action Router selector proof shows routerVisible=7/7 after first Strategy route action-route:f49fdec1289d13c01400bfa2 was generated with no operational leakage into Strategy Hub.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET next_action = $2,
            status_note = $3,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SOURCE-020',
        'Keep the now-live Google delegated stack, Missive bridge, and Slack reader stable, watch for pagination/regression issues, and harden the remaining rollout gaps before layering more automation on top.',
        'Adapter hardening is no longer hypothetical: Drive pagination is fixed, the meeting backfill now reaches a real multi-month archive, Slack history paginates, and the existing bot covers almost all required ops channels. Remaining adapter work is the last Slack rollout gaps plus older-archive probing, not blank-sheet connector work.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            priority = $3,
            rank = $4,
            next_action = $5,
            status_note = $6,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'EXTRACTION-TEAM-001',
        'scoped',
        'P0',
        7,
        'Keep scoped and not active. Later choose the next extraction slice from Runtime Health evidence, then write acceptance/proof commands and run foundation:verify before closeout.',
        'Foundation 1100 hygiene cleanup on 2026-04-30: scoped/parked only, not active and not next. Existing runtime slices are proof history only; missing pieces must not start without approved plan, acceptance criteria, proof commands, foundation:verify, and closeout.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            priority = $3,
            rank = $4,
            next_action = $5,
            status_note = $6,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SYSTEM-010',
        'scoped',
        'P0',
        5,
        'Keep scoped and not active. Later plan scheduler/supervision controls with acceptance, proof commands, foundation:verify, and explicit closeout before any runtime-control build.',
        'Foundation 1100 hygiene cleanup on 2026-04-30: scoped/parked only, not active and not next. Existing job ledger proof history stays separate; scheduler, kill-switch, pause, retry, cursor, cost, and approval-gated write controls require a later approved plan, proof commands, foundation:verify, and closeout.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            priority = $3,
            rank = $4,
            summary = $5,
            why_it_matters = $6,
            next_action = $7,
            status_note = $8,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SECURITY-002',
        'done',
        'P0',
        4,
        'Central auth/tier/redaction v1 is implemented through `lib/security-access.js`: requests get server-derived access context, covered routes have explicit postures, `assertTier`/`assertRole` are central, intelligence evidence ignores client `maxTier`, and shared-comms/intelligence routes stay Tier 1-only unless filtered access is proven.',
        'Tiers alone do not solve the real leak. The system now has a fail-closed layer for subject-person redaction, sensitivity/min_tier checks, stable redacted response shapes, and raw shared-comms boundaries before any broader hub/query/assistant expansion.',
        'Done for v1. Keep non-Tier-1 shared-comms/intelligence access closed until a later approved card proves filtered summaries against real data. Do not expand Strategy, Sales, Agent Feedback, Scoper, Agent Factory, corpus, or UI polish from this closeout.',
        'Closed on 2026-05-02 under `security-002-auth-tier-redaction-v1`. V1 adds `lib/security-access.js`, a route posture registry for all planned read surfaces, DB-backed request access context via Foundation users, central `assertTier`/`assertRole`, server-derived actor tier for `/api/intelligence/evidence`, stable redacted response helpers, subject_people/sensitivity/min_tier synthetic proof, owner-preserving shared-comms summary boundary, fail-closed missing tier/classification behavior, `process:security-002-check`, approval integrity evidence, and `foundation:verify` coverage. Routes that cannot yet be filtered safely remain Tier 1-only.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET lane = $2,
            summary = $3,
            next_action = $4,
            status_note = $5,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SECURITY-003',
        'done',
        'Zoom audio transcription no longer contains a direct OpenAI audio endpoint call and fails closed for non-dry-run use. The verifier now checks direct OpenAI, Anthropic, and Gemini host calls outside approved adapters instead of only checking OpenAI Responses.',
        'Keep Zoom audio recovery paused. If the business later reopens it, build transcription as a router-ledged workload with explicit provenance instead of restoring direct API calls.',
        'Closed as a stop-gap on 2026-04-25: direct transcription spend path is fail-closed and verifier coverage is broadened.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET title = $2,
            lane = $3,
            summary = $4,
            next_action = $5,
            status_note = $6,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SECURITY-004',
        'Gate broad Foundation, Ops, and doc read APIs before any non-local access',
        'done',
        'Broad Foundation/Ops/doc read APIs now use `requireAdminToken` outside localhost: source-of-truth, document reads, Foundation hub snapshot, Owners review queue/governance, FUB read helpers, sheet structure, system inventory, changes, and pending doc updates.',
        'Keep the verifier guard. Replace this stop-gap with full `SECURITY-002` auth/tier and subject-person redaction before broader hub, assistant, or user-facing access.',
        'Closed as an interim gate on 2026-04-25. Full privacy model remains under `SECURITY-002`.',
      ]
    )

    await client.query(
      `
        UPDATE backlog_items
        SET priority = $2,
            rank = $3,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        'SYNTHESIS-FACTS-001',
        'P0',
        9,
      ]
    )

    await seedTable(
      client,
      'decisions',
      decisionsSeed,
      `
        INSERT INTO decisions (
          id, category, title, status, summary, rationale, source_ref,
          decision_owner, confirmed_by, participant_names, context_ref, evidence_notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (id) DO NOTHING
      `,
      row => [
        row.id,
        row.category,
        row.title,
        row.status,
        row.summary,
        row.rationale,
        row.sourceRef,
        row.decisionOwner ?? null,
        row.confirmedBy ?? null,
        normalizeStringList(row.participantNames),
        row.contextRef ?? null,
        row.evidenceNotes ?? null,
      ]
    )

    for (const row of decisionsSeed) {
      await client.query(
        `
          UPDATE decisions
          SET decision_owner = COALESCE(decision_owner, $2),
              confirmed_by = COALESCE(confirmed_by, $3),
              participant_names = CASE
                WHEN participant_names IS NULL OR cardinality(participant_names) = 0 THEN $4::text[]
                ELSE participant_names
              END,
              context_ref = COALESCE(context_ref, $5),
              evidence_notes = COALESCE(evidence_notes, $6),
              updated_at = CASE
                WHEN decision_owner IS NULL
                  OR confirmed_by IS NULL
                  OR participant_names IS NULL
                  OR cardinality(participant_names) = 0
                  OR context_ref IS NULL
                  OR evidence_notes IS NULL
                THEN NOW()
                ELSE updated_at
              END
          WHERE id = $1
        `,
        [
          row.id,
          row.decisionOwner ?? null,
          row.confirmedBy ?? null,
          normalizeStringList(row.participantNames),
          row.contextRef ?? null,
          row.evidenceNotes ?? null,
        ]
      )
    }

    await seedTable(
      client,
      'parking_lot_items',
      parkingLotSeed,
      `
        INSERT INTO parking_lot_items (id, title, summary, owner)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (id) DO NOTHING
      `,
      row => [row.id, row.title, row.summary, row.owner]
    )

    await seedTable(
      client,
      'open_questions',
      openQuestionsSeed,
      `
        INSERT INTO open_questions (id, title, summary, owner, status, resolved_at, resolved_by, resolution_note)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (id) DO NOTHING
      `,
      row => [
        row.id,
        row.title,
        row.summary,
        row.owner,
        row.status || 'open',
        row.resolvedAt || null,
        row.resolvedBy || null,
        row.resolutionNote || null,
      ]
    )

    await seedTable(
      client,
      'memory_system_status',
      memoryStatusSeed,
      `
        INSERT INTO memory_system_status (component_key, label, status, detail)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (component_key) DO NOTHING
      `,
      row => [row.componentKey, row.label, row.status, row.detail]
    )

    await client.query(
      `
        DELETE FROM doc_source_snapshots
        WHERE doc_path = $1
      `,
      ['docs/strategy/bhag-model.md']
    )

    await seedTable(
      client,
      'doc_source_snapshots',
      docSourceSnapshotsSeed,
      `
        INSERT INTO doc_source_snapshots (
          id, doc_path, source_id, group_title, label, value, detail, as_of, sort_order
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (id) DO UPDATE SET
          doc_path = EXCLUDED.doc_path,
          source_id = EXCLUDED.source_id,
          group_title = EXCLUDED.group_title,
          label = EXCLUDED.label,
          value = EXCLUDED.value,
          detail = EXCLUDED.detail,
          as_of = EXCLUDED.as_of,
          sort_order = EXCLUDED.sort_order,
          updated_at = NOW()
      `,
      row => [
        row.id,
        row.docPath,
        row.sourceId,
        row.groupTitle,
        row.label,
        row.value,
        row.detail,
        row.asOf,
        row.sortOrder,
      ]
    )

    await client.query('COMMIT')
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // Ignore rollback failures and rethrow the original startup error.
    }
    throw error
  } finally {
    if (schemaLockHeld) {
      try {
        await client.query("SELECT pg_advisory_unlock(hashtext('bcrew_foundation_schema_init'))")
      } catch {
        // The connection is about to be released; ignore unlock cleanup failures.
      }
    }
    client.release()
  }
}

export async function getFoundationDbReadOnlyGateReadiness(options = {}) {
  const requiredTables = Array.isArray(options.requiredTables) && options.requiredTables.length
    ? options.requiredTables.map(value => String(value || '').trim()).filter(Boolean)
    : FOUNDATION_DB_READ_ONLY_GATE_TABLES
  const result = await pool.query(
    `
      SELECT c.relname, c.oid::text AS oid, c.relkind::text AS relkind
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = ANY($1::text[])
        AND c.relkind IN ('r', 'p')
      ORDER BY c.relname ASC
    `,
    [requiredTables]
  )
  const foundByName = new Map(result.rows.map(row => [row.relname, row]))
  const missingTables = requiredTables.filter(name => !foundByName.has(name))

  return {
    ok: missingTables.length === 0,
    mode: 'read-only-metadata-check',
    checkedAt: new Date().toISOString(),
    requiredTables,
    presentTables: requiredTables
      .filter(name => foundByName.has(name))
      .map(name => ({
        name,
        oid: foundByName.get(name).oid,
        relkind: foundByName.get(name).relkind,
      })),
    missingTables,
    writeInitializationSkipped: true,
  }
}

export async function assertFoundationDbReadyForReadOnlyGate(label = 'Foundation read-only gate', options = {}) {
  const readiness = await getFoundationDbReadOnlyGateReadiness(options)
  if (!readiness.ok) {
    const missing = readiness.missingTables.join(', ') || 'unknown'
    throw new Error(`${label} requires an initialized Foundation DB before read-only gate checks. Missing tables: ${missing}. Start or restart the Foundation dashboard/worker, or run an explicit approved DB initialization path, then rerun the gate.`)
  }
  return readiness
}

function getFoundationJobHealth(job, latestRun) {
  if (!job.enabled) {
    return {
      status: 'planned',
      detail: 'Registered but not enabled for the runner yet.',
    }
  }

  if (latestRun?.status === 'running' || latestRun?.status === 'queued') {
    return {
      status: 'pending',
      detail: `Currently ${latestRun.status}.`,
    }
  }

  const runtime = getFoundationJobRuntime(job, latestRun)
  if (runtime.scheduleStatus === 'paused') {
    return {
      status: 'planned',
      detail: runtime.scheduleDetail,
    }
  }

  if (runtime.scheduleStatus === 'manual' && !latestRun) {
    return {
      status: 'planned',
      detail: runtime.scheduleDetail,
    }
  }

  if (runtime.due && latestRun?.status !== 'failed') {
    return {
      status: 'pending',
      detail: runtime.scheduleDetail,
    }
  }

  if (!latestRun) {
    return {
      status: 'pending',
      detail: 'Registered, but no run has been recorded yet.',
    }
  }

  if (latestRun.status === 'succeeded') {
    return {
      status: 'live',
      detail: runtime.scheduleDetail || (latestRun.finishedAt ? `Last succeeded ${latestRun.finishedAt}.` : 'Last run succeeded.'),
    }
  }

  return {
    status: 'risk',
    detail: latestRun.errorMessage || `Last run ${latestRun.status}.`,
  }
}

function mapFoundationJobControlRow(row) {
  return {
    jobKey: row.job_key,
    runtimeMode: row.runtime_mode || null,
    enabled: row.enabled,
    scheduleEveryMinutes: row.schedule_every_minutes == null ? null : Number(row.schedule_every_minutes),
    pauseReason: row.pause_reason || null,
    updatedBy: row.updated_by || null,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
  }
}

function mapLlmCredentialRow(row) {
  return {
    credentialKey: row.credential_key,
    provider: row.provider,
    authPath: row.auth_path,
    displayName: row.display_name,
    accountLabel: row.account_label || null,
    hubKey: row.hub_key,
    workloadLane: row.workload_lane,
    secretRef: row.secret_ref || null,
    status: row.status,
    policyClassification: row.policy_classification,
    allowedWorkloads: Array.isArray(row.allowed_workloads) ? row.allowed_workloads : [],
    notes: row.notes || '',
    quotaState: row.quota_state || {},
    metadata: row.metadata || {},
    updatedBy: row.updated_by || null,
    createdAt: row.created_at?.toISOString?.() || row.created_at || null,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
  }
}

function mapLlmRouteRow(row) {
  return {
    routeKey: row.route_key,
    workload: row.workload,
    hubKey: row.hub_key,
    priority: Number(row.priority || 1),
    provider: row.provider,
    model: row.model,
    authPath: row.auth_path,
    credentialKey: row.credential_key || null,
    fallbackRouteKey: row.fallback_route_key || null,
    status: row.status,
    policyClassification: row.policy_classification,
    costCapUsd: row.cost_cap_usd == null ? null : Number(row.cost_cap_usd),
    riskClass: row.risk_class,
    notes: row.notes || '',
    metadata: row.metadata || {},
    updatedBy: row.updated_by || null,
    createdAt: row.created_at?.toISOString?.() || row.created_at || null,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
  }
}

function mapLlmRouteProbeRow(row) {
  return {
    probeId: row.probe_id,
    credentialKey: row.credential_key || null,
    provider: row.provider,
    authPath: row.auth_path,
    probeType: row.probe_type,
    status: row.status,
    detail: row.detail || '',
    capability: row.capability || {},
    metadata: row.metadata || {},
    probedAt: row.probed_at?.toISOString?.() || row.probed_at || null,
    probedBy: row.probed_by || null,
  }
}

function mapLlmCallRow(row) {
  return {
    callId: row.call_id,
    workload: row.workload,
    hubKey: row.hub_key,
    provider: row.provider,
    model: row.model,
    authPath: row.auth_path,
    credentialKey: row.credential_key || null,
    routeKey: row.route_key || null,
    status: row.status,
    estimatedInputTokens: row.estimated_input_tokens == null ? null : Number(row.estimated_input_tokens),
    estimatedOutputTokens: row.estimated_output_tokens == null ? null : Number(row.estimated_output_tokens),
    estimatedCostUsd: row.estimated_cost_usd == null ? null : Number(row.estimated_cost_usd),
    errorMessage: row.error_message || null,
    metadata: row.metadata || {},
    startedAt: row.started_at?.toISOString?.() || row.started_at || null,
    finishedAt: row.finished_at?.toISOString?.() || row.finished_at || null,
    createdAt: row.created_at?.toISOString?.() || row.created_at || null,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
  }
}

function mapSourceCrawlTargetRow(row) {
  return {
    targetKey: row.target_key,
    sourceId: row.source_id,
    title: row.title,
    lane: row.lane,
    targetType: row.target_type,
    status: row.status,
    priority: row.priority,
    runtimeMode: row.runtime_mode,
    cursorState: row.cursor_state || {},
    budget: row.budget || {},
    dedupePolicy: row.dedupe_policy || {},
    leaseOwner: row.lease_owner || null,
    leaseExpiresAt: row.lease_expires_at?.toISOString?.() || row.lease_expires_at || null,
    lastRunAt: row.last_run_at?.toISOString?.() || row.last_run_at || null,
    nextRunAt: row.next_run_at?.toISOString?.() || row.next_run_at || null,
    lastStatus: row.last_status || null,
    lastError: row.last_error || null,
    inspectedCount: Number(row.inspected_count || 0),
    archivedCount: Number(row.archived_count || 0),
    extractedCount: Number(row.extracted_count || 0),
    metadata: row.metadata || {},
    notes: row.notes || '',
    updatedBy: row.updated_by || null,
    createdAt: row.created_at?.toISOString?.() || row.created_at || null,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
  }
}

function mapSourceCrawlTargetRunRow(row) {
  return {
    runId: row.run_id,
    targetKey: row.target_key,
    sourceId: row.source_id,
    status: row.status,
    leaseOwner: row.lease_owner || null,
    leaseExpiresAt: row.lease_expires_at?.toISOString?.() || row.lease_expires_at || null,
    startedAt: row.started_at?.toISOString?.() || row.started_at || null,
    finishedAt: row.finished_at?.toISOString?.() || row.finished_at || null,
    nextRunAt: row.next_run_at?.toISOString?.() || row.next_run_at || null,
    lastError: row.last_error || null,
    inspectedDelta: Number(row.inspected_delta || 0),
    archivedDelta: Number(row.archived_delta || 0),
    extractedDelta: Number(row.extracted_delta || 0),
    metadata: row.metadata || {},
    createdAt: row.created_at?.toISOString?.() || row.created_at || null,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
  }
}

function getSourceCrawlRunStaleState(run, thresholdMinutes = SOURCE_CRAWL_STALE_RUN_MINUTES) {
  if (!run || run.status !== 'running') {
    return {
      isStale: false,
      reason: null,
      ageMinutes: null,
      thresholdMinutes,
    }
  }

  const nowMs = Date.now()
  const startedMs = Date.parse(run.startedAt || run.createdAt || '')
  const leaseExpiresMs = Date.parse(run.leaseExpiresAt || '')
  const ageMinutes = Number.isFinite(startedMs)
    ? Math.floor((nowMs - startedMs) / 60000)
    : null
  const leaseExpired = Number.isFinite(leaseExpiresMs) && leaseExpiresMs < nowMs
  const olderThanThreshold = ageMinutes != null && ageMinutes >= thresholdMinutes

  return {
    isStale: leaseExpired || olderThanThreshold,
    reason: leaseExpired
      ? 'lease_expired'
      : olderThanThreshold
        ? 'running_past_threshold'
        : null,
    ageMinutes,
    thresholdMinutes,
  }
}

function attachSourceCrawlRunStaleState(run, thresholdMinutes = SOURCE_CRAWL_STALE_RUN_MINUTES) {
  return {
    ...run,
    staleState: getSourceCrawlRunStaleState(run, thresholdMinutes),
  }
}

function mapIntelligenceJobRunRow(row) {
  return {
    jobId: row.job_id,
    jobType: row.job_type,
    sourceId: row.source_id || null,
    artifactId: row.artifact_id || null,
    foundationRunId: row.foundation_run_id || null,
    sourceCrawlRunId: row.source_crawl_run_id || null,
    synthesisRunId: row.synthesis_run_id || null,
    status: row.status,
    cursorState: row.cursor_state || {},
    budget: row.budget || {},
    model: row.model || null,
    provider: row.provider || null,
    authPath: row.auth_path || null,
    routeKey: row.route_key || null,
    costUsd: row.cost_usd == null ? null : Number(row.cost_usd),
    itemCounts: row.item_counts || {},
    failureCount: Number(row.failure_count || 0),
    outputArtifactIds: Array.isArray(row.output_artifact_ids) ? row.output_artifact_ids : [],
    nextRunState: row.next_run_state || {},
    resultSummary: row.result_summary || {},
    errorMessage: row.error_message || null,
    provenance: row.provenance || {},
    llmCallIds: Array.isArray(row.llm_call_ids) ? row.llm_call_ids.filter(Boolean) : [],
    startedAt: row.started_at?.toISOString?.() || row.started_at || null,
    finishedAt: row.finished_at?.toISOString?.() || row.finished_at || null,
    durationMs: row.duration_ms == null ? null : Number(row.duration_ms),
    createdAt: row.created_at?.toISOString?.() || row.created_at || null,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
  }
}

function getTargetScheduleFallback(target) {
  const runtimeMode = target.runtimeMode || 'manual'
  const nextRunAt = target.nextRunAt || null
  let scheduleStatus = 'manual'
  let scheduleDetail = 'Manual-only crawl target.'

  if (runtimeMode === 'paused') {
    scheduleStatus = 'paused'
    scheduleDetail = 'Paused crawl target.'
  } else if (runtimeMode === 'scheduled') {
    scheduleStatus = nextRunAt ? 'scheduled' : 'scheduled_without_next_run'
    scheduleDetail = nextRunAt
      ? 'Target-level next run is recorded.'
      : 'Target marked scheduled, but no target-level next run is recorded.'
  }

  return {
    source: 'target',
    scheduleTruth: 'target',
    foundationJobKey: target.metadata?.foundationJobKey || null,
    jobTitle: null,
    runtimeMode,
    scheduleStatus,
    scheduleDetail,
    due: false,
    nextRunAt,
    crawlCheckpointNextRunAt: nextRunAt,
    latestRunStatus: target.lastStatus || null,
    latestRunAt: target.lastRunAt || null,
  }
}

function attachSourceCrawlTargetSchedule(target, foundationJobSchedules) {
  const foundationJobKey = target.metadata?.foundationJobKey || null
  const jobSchedule = foundationJobKey ? foundationJobSchedules.get(foundationJobKey) : null
  const crawlCheckpointNextRunAt = target.nextRunAt || null
  const scheduler = jobSchedule
    ? {
        source: 'foundation_job',
        scheduleTruth: 'foundation_job',
        foundationJobKey,
        jobTitle: jobSchedule.title,
        runtimeMode: jobSchedule.runtimeMode,
        scheduleStatus: jobSchedule.scheduleStatus,
        scheduleDetail: jobSchedule.scheduleDetail,
        due: jobSchedule.due,
        nextRunAt: jobSchedule.nextRunAt,
        crawlCheckpointNextRunAt,
        latestRunStatus: jobSchedule.latestRunStatus,
        latestRunAt: jobSchedule.latestRunAt,
      }
    : getTargetScheduleFallback(target)

  return {
    ...target,
    nextRunAt: scheduler.nextRunAt,
    crawlCheckpointNextRunAt,
    foundationJobKey,
    scheduler,
    effectiveRuntimeMode: scheduler.runtimeMode,
    effectiveNextRunAt: scheduler.nextRunAt,
  }
}

function createEmptySourceCrawlItemSummary(targetKey) {
  return {
    targetKey,
    totalItems: 0,
    pendingItems: 0,
    leasedItems: 0,
    succeededItems: 0,
    failedItems: 0,
    skippedItems: 0,
    latestItemUpdatedAt: null,
    reasons: [],
  }
}

async function getSourceCrawlTargetItemSummaries(targetKeys = []) {
  const normalizedTargetKeys = Array.from(new Set(
    (targetKeys || []).map(targetKey => String(targetKey || '').trim()).filter(Boolean)
  ))
  const summaries = new Map(normalizedTargetKeys.map(targetKey => [
    targetKey,
    createEmptySourceCrawlItemSummary(targetKey),
  ]))
  if (!normalizedTargetKeys.length) return summaries

  const result = await pool.query(
    `
      SELECT target_key,
             status,
             COALESCE(
               NULLIF(metadata->>'reason', ''),
               NULLIF(metadata->>'skipReason', ''),
               NULLIF(metadata->>'contentExtractionStatus', ''),
               NULLIF(metadata->>'extractionStatus', ''),
               'unspecified'
             ) AS reason,
             COUNT(*)::integer AS item_count,
             MAX(updated_at) AS latest_updated_at
      FROM source_crawl_items
      WHERE target_key = ANY($1::text[])
      GROUP BY target_key, status, reason
      ORDER BY target_key ASC, item_count DESC
    `,
    [normalizedTargetKeys]
  )

  for (const row of result.rows) {
    const targetKey = row.target_key
    const summary = summaries.get(targetKey) || createEmptySourceCrawlItemSummary(targetKey)
    const count = Number(row.item_count || 0)
    summary.totalItems += count
    if (row.status === 'pending') summary.pendingItems += count
    if (row.status === 'leased') summary.leasedItems += count
    if (row.status === 'succeeded') summary.succeededItems += count
    if (row.status === 'failed') summary.failedItems += count
    if (row.status === 'skipped') summary.skippedItems += count
    const latest = row.latest_updated_at?.toISOString?.() || row.latest_updated_at || null
    if (!summary.latestItemUpdatedAt || (latest && Date.parse(latest) > Date.parse(summary.latestItemUpdatedAt))) {
      summary.latestItemUpdatedAt = latest
    }
    summary.reasons.push({
      status: row.status,
      reason: row.reason,
      count,
      latestUpdatedAt: latest,
    })
    summaries.set(targetKey, summary)
  }

  return summaries
}

async function getSourceCrawlTargetRunCoverage(targetKeys = []) {
  const normalizedTargetKeys = Array.from(new Set(
    (targetKeys || []).map(targetKey => String(targetKey || '').trim()).filter(Boolean)
  ))
  const coverage = new Map(normalizedTargetKeys.map(targetKey => [
    targetKey,
    {
      targetKey,
      runCount: 0,
      successfulRuns: 0,
      failedRuns: 0,
      lastSuccessAt: null,
      lastFailureAt: null,
      latestFailureRunId: null,
      latestFailureStatus: null,
      latestFailureError: null,
    },
  ]))
  if (!normalizedTargetKeys.length) return coverage

  const [aggregateResult, latestFailureResult] = await Promise.all([
    pool.query(
      `
        SELECT target_key,
               COUNT(*)::integer AS run_count,
               COUNT(*) FILTER (WHERE status = 'succeeded')::integer AS successful_runs,
               COUNT(*) FILTER (WHERE status IN ('failed', 'partial'))::integer AS failed_runs,
               MAX(CASE WHEN status = 'succeeded'
                 THEN COALESCE(finished_at, updated_at, started_at, created_at)
               END) AS last_success_at,
               MAX(CASE WHEN status IN ('failed', 'partial')
                 THEN COALESCE(finished_at, updated_at, started_at, created_at)
               END) AS last_failure_at
        FROM source_crawl_target_runs
        WHERE target_key = ANY($1::text[])
        GROUP BY target_key
      `,
      [normalizedTargetKeys]
    ),
    pool.query(
      `
        SELECT DISTINCT ON (target_key)
               target_key, run_id, status, last_error,
               COALESCE(finished_at, updated_at, started_at, created_at) AS occurred_at
        FROM source_crawl_target_runs
        WHERE target_key = ANY($1::text[])
          AND status IN ('failed', 'partial')
        ORDER BY target_key, COALESCE(finished_at, updated_at, started_at, created_at) DESC NULLS LAST
      `,
      [normalizedTargetKeys]
    ),
  ])

  for (const row of aggregateResult.rows) {
    const targetKey = row.target_key
    const existing = coverage.get(targetKey) || { targetKey }
    coverage.set(targetKey, {
      ...existing,
      runCount: Number(row.run_count || 0),
      successfulRuns: Number(row.successful_runs || 0),
      failedRuns: Number(row.failed_runs || 0),
      lastSuccessAt: row.last_success_at?.toISOString?.() || row.last_success_at || null,
      lastFailureAt: row.last_failure_at?.toISOString?.() || row.last_failure_at || null,
    })
  }

  for (const row of latestFailureResult.rows) {
    const targetKey = row.target_key
    const existing = coverage.get(targetKey) || { targetKey }
    coverage.set(targetKey, {
      ...existing,
      lastFailureAt: row.occurred_at?.toISOString?.() || row.occurred_at || existing.lastFailureAt || null,
      latestFailureRunId: row.run_id || null,
      latestFailureStatus: row.status || null,
      latestFailureError: row.last_error || null,
    })
  }

  return coverage
}

function buildSourceCrawlReasonCoverage(itemSummary = {}, statuses = ['failed', 'skipped'], limit = 5) {
  const statusOrder = new Map(statuses.map((status, index) => [status, index]))
  return (Array.isArray(itemSummary.reasons) ? itemSummary.reasons : [])
    .filter(reason => statusOrder.has(reason.status) && Number(reason.count || 0) > 0)
    .sort((a, b) => {
      const statusDelta = (statusOrder.get(a.status) ?? 99) - (statusOrder.get(b.status) ?? 99)
      if (statusDelta !== 0) return statusDelta
      return Number(b.count || 0) - Number(a.count || 0)
    })
    .slice(0, limit)
    .map(reason => ({
      status: reason.status,
      reason: reason.reason || 'unspecified',
      count: Number(reason.count || 0),
      latestUpdatedAt: reason.latestUpdatedAt || null,
    }))
}

function buildSourceCrawlRemainingIndicators(target) {
  const indicators = []
  const itemSummary = target.itemSummary || {}
  const cursorState = target.cursorState || {}

  if (Number(itemSummary.pendingItems || 0) > 0) {
    indicators.push({
      label: 'Pending crawl items',
      count: Number(itemSummary.pendingItems || 0),
      detail: 'Rows waiting in source_crawl_items.',
    })
  }
  if (Number(itemSummary.leasedItems || 0) > 0) {
    indicators.push({
      label: 'Leased crawl items',
      count: Number(itemSummary.leasedItems || 0),
      detail: 'Rows currently held by a worker lease.',
    })
  }

  const driveInventory = cursorState.driveInventory || {}
  if (Number(driveInventory.queuedFolderCount || 0) > 0) {
    indicators.push({
      label: 'Queued Drive folders',
      count: Number(driveInventory.queuedFolderCount || 0),
      detail: `${Number(driveInventory.inspectedFolderCount || 0)} inspected folders recorded.`,
    })
  }

  const pendingReasonIndicators = (Array.isArray(itemSummary.reasons) ? itemSummary.reasons : [])
    .filter(reason =>
      Number(reason.count || 0) > 0 &&
      /pending|queued_for_later|requires_|needs_|not_in_v1/i.test(reason.reason || '')
    )
    .slice(0, 4)
    .map(reason => ({
      label: reason.reason || 'pending work',
      count: Number(reason.count || 0),
      detail: `${reason.status || 'item'} ledger reason.`,
    }))

  return [...indicators, ...pendingReasonIndicators].slice(0, 6)
}

function buildSourceCrawlTargetCoverage(target, runCoverage = {}) {
  const itemSummary = target.itemSummary || createEmptySourceCrawlItemSummary(target.targetKey)
  const scheduler = target.scheduler || {}
  const lastFailureAt = runCoverage.lastFailureAt ||
    (target.lastStatus === 'failed' || target.lastStatus === 'partial' ? target.lastRunAt : null)
  const latestFailureStatus = runCoverage.latestFailureStatus ||
    (target.lastStatus === 'failed' || target.lastStatus === 'partial' ? target.lastStatus : null)
  const latestFailureError = runCoverage.latestFailureError ||
    (target.lastStatus === 'failed' || target.lastStatus === 'partial' ? target.lastError : null)

  return {
    targetKey: target.targetKey,
    title: target.title,
    sourceId: target.sourceId,
    lane: target.lane,
    targetType: target.targetType,
    status: target.status,
    priority: target.priority,
    runtimeMode: target.runtimeMode,
    effectiveRuntimeMode: target.effectiveRuntimeMode,
    scheduleStatus: scheduler.scheduleStatus || null,
    scheduleTruth: scheduler.scheduleTruth || null,
    nextBiteAt: scheduler.nextRunAt || target.effectiveNextRunAt || target.nextRunAt || null,
    crawlCheckpointNextRunAt: scheduler.crawlCheckpointNextRunAt || target.crawlCheckpointNextRunAt || null,
    lastRunAt: target.lastRunAt,
    lastStatus: target.lastStatus,
    lastError: target.lastError,
    lastSuccessAt: runCoverage.lastSuccessAt || (target.lastStatus === 'succeeded' ? target.lastRunAt : null),
    lastFailureAt,
    latestFailureRunId: runCoverage.latestFailureRunId || null,
    latestFailureStatus,
    latestFailureError,
    runCount: Number(runCoverage.runCount || 0),
    successfulRuns: Number(runCoverage.successfulRuns || 0),
    failedRuns: Number(runCoverage.failedRuns || 0),
    counts: {
      inspectedCount: Number(target.inspectedCount || 0),
      archivedCount: Number(target.archivedCount || 0),
      extractedCount: Number(target.extractedCount || 0),
      totalItems: Number(itemSummary.totalItems || 0),
      succeededItems: Number(itemSummary.succeededItems || 0),
      skippedItems: Number(itemSummary.skippedItems || 0),
      failedItems: Number(itemSummary.failedItems || 0),
      pendingItems: Number(itemSummary.pendingItems || 0),
      leasedItems: Number(itemSummary.leasedItems || 0),
    },
    topReasons: buildSourceCrawlReasonCoverage(itemSummary),
    remainingBacklogIndicators: buildSourceCrawlRemainingIndicators(target),
    healthFindings: Array.isArray(target.healthFindings) ? target.healthFindings : [],
    budget: target.budget || {},
    notes: target.notes || '',
  }
}

function buildSourceCrawlTargetHealthFindings(target) {
  const findings = []
  const itemSummary = target.itemSummary || createEmptySourceCrawlItemSummary(target.targetKey)

  if (target.lastStatus === 'failed' || target.lastStatus === 'partial') {
    findings.push({
      severity: target.lastStatus === 'failed' ? 'risk' : 'warning',
      type: `latest_target_${target.lastStatus}`,
      detail: `Latest target state is ${target.lastStatus}${target.lastError ? `: ${target.lastError}` : '.'}`,
    })
  }

  if (itemSummary.failedItems > 0) {
    findings.push({
      severity: 'warning',
      type: 'failed_crawl_items',
      detail: `${itemSummary.failedItems} crawl item${itemSummary.failedItems === 1 ? '' : 's'} failed and need retry or classification.`,
    })
  }

  if (itemSummary.skippedItems > 0) {
    findings.push({
      severity: 'info',
      type: 'skipped_crawl_items',
      detail: `${itemSummary.skippedItems} crawl item${itemSummary.skippedItems === 1 ? '' : 's'} are explicitly skipped with reasons.`,
    })
  }

  if (target.targetKey === 'slack-current-day' && itemSummary.totalItems === 0) {
    findings.push({
      severity: 'warning',
      type: 'missing_slack_channel_item_proof',
      detail: 'Slack current-day has target runs but no channel-level source_crawl_items yet.',
    })
  }

  return findings
}

function mapSourceCrawlItemRow(row) {
  return {
    itemKey: row.item_key,
    targetKey: row.target_key,
    sourceId: row.source_id,
    externalId: row.external_id,
    itemType: row.item_type,
    status: row.status,
    fingerprint: row.fingerprint || null,
    leaseOwner: row.lease_owner || null,
    leaseExpiresAt: row.lease_expires_at?.toISOString?.() || row.lease_expires_at || null,
    attemptCount: Number(row.attempt_count || 0),
    lastError: row.last_error || null,
    artifactId: row.artifact_id || null,
    metadata: row.metadata || {},
    discoveredAt: row.discovered_at?.toISOString?.() || row.discovered_at || null,
    processedAt: row.processed_at?.toISOString?.() || row.processed_at || null,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
  }
}

async function getFoundationJobScheduleIndex() {
  const controls = await getFoundationJobControls()
  const latestResult = await pool.query(
    `
      SELECT DISTINCT ON (job_key)
             run_id, job_key, title, job_type, status, command, requested_by,
             started_at, finished_at, duration_ms, exit_code, signal,
             output_tail, error_message, metadata, created_at, updated_at
      FROM foundation_job_runs
      ORDER BY job_key, created_at DESC
    `
  )

  const latestByJob = new Map()
  for (const row of latestResult.rows) {
    const run = mapFoundationJobRunRow(row)
    latestByJob.set(run.jobKey, run)
  }

  const now = new Date()
  return new Map(getFoundationJobDefinitions().map(baseJob => {
    const job = applyFoundationJobControl(baseJob, controls.get(baseJob.key))
    const latestRun = latestByJob.get(job.key) || null
    const runtime = getFoundationJobRuntime(job, latestRun, now)
    const latestRunAt = latestRun?.finishedAt || latestRun?.startedAt || latestRun?.createdAt || null
    return [
      job.key,
      {
        jobKey: job.key,
        title: job.title,
        enabled: job.enabled,
        runtimeMode: runtime.runtimeMode,
        scheduleEveryMinutes: job.scheduleEveryMinutes ?? null,
        scheduleStatus: runtime.scheduleStatus,
        scheduleDetail: runtime.scheduleDetail,
        due: runtime.due,
        nextRunAt: runtime.nextRunAt,
        latestRunStatus: latestRun?.status || null,
        latestRunAt,
      },
    ]
  }))
}

async function getFoundationJobControls() {
  const result = await pool.query(
    `
      SELECT job_key, runtime_mode, enabled, schedule_every_minutes,
             pause_reason, updated_by, updated_at
      FROM foundation_job_controls
      ORDER BY job_key ASC
    `
  )
  return new Map(result.rows.map(row => [row.job_key, mapFoundationJobControlRow(row)]))
}

function applyFoundationJobControl(job, control) {
  if (!control) return job
  return {
    ...job,
    enabled: typeof control.enabled === 'boolean' ? control.enabled : job.enabled,
    runtimeMode: control.runtimeMode || job.runtimeMode,
    scheduleEveryMinutes: control.scheduleEveryMinutes ?? job.scheduleEveryMinutes,
    pauseReason: control.pauseReason,
    controlUpdatedBy: control.updatedBy,
    controlUpdatedAt: control.updatedAt,
  }
}

function mapFoundationRuntimeStatusRow(row) {
  if (!row) return null
  return {
    serviceKey: row.service_key,
    serviceLabel: row.service_label,
    status: row.status,
    startedAt: row.started_at,
    processId: row.process_id,
    runningCommit: row.running_commit,
    runningShortCommit: row.running_short_commit,
    capturedAt: row.captured_at,
    checkName: row.check_name,
    restartCommand: row.restart_command,
    plainEnglish: row.plain_english,
    metadata: row.metadata || {},
    updatedAt: row.updated_at,
  }
}

export async function recordFoundationRuntimeStatus(input = {}) {
  const serviceKey = String(input.serviceKey || '').trim()
  if (!serviceKey) throw new Error('serviceKey is required.')
  const serviceLabel = String(input.serviceLabel || serviceKey).trim()
  const status = String(input.status || 'unknown').trim()
  const checkName = String(input.checkName || 'served-code-equals-HEAD').trim()
  const restartCommand = String(input.restartCommand || '').trim()
  const plainEnglish = String(input.plainEnglish || '').trim()
  if (!plainEnglish) throw new Error('plainEnglish is required.')
  if (!restartCommand) throw new Error('restartCommand is required.')
  const result = await pool.query(
    `
      INSERT INTO foundation_runtime_status (
        service_key, service_label, status, started_at, process_id,
        running_commit, running_short_commit, captured_at, check_name,
        restart_command, plain_english, metadata, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8,$9,$10,$11,NOW())
      ON CONFLICT (service_key) DO UPDATE
      SET service_label = EXCLUDED.service_label,
          status = EXCLUDED.status,
          started_at = EXCLUDED.started_at,
          process_id = EXCLUDED.process_id,
          running_commit = EXCLUDED.running_commit,
          running_short_commit = EXCLUDED.running_short_commit,
          captured_at = EXCLUDED.captured_at,
          check_name = EXCLUDED.check_name,
          restart_command = EXCLUDED.restart_command,
          plain_english = EXCLUDED.plain_english,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      RETURNING *
    `,
    [
      serviceKey,
      serviceLabel,
      status,
      input.startedAt || null,
      Number.isFinite(Number(input.processId)) ? Number(input.processId) : null,
      input.runningCommit || null,
      input.runningShortCommit || null,
      checkName,
      restartCommand,
      plainEnglish,
      JSON.stringify(input.metadata || {}),
    ]
  )
  return mapFoundationRuntimeStatusRow(result.rows[0])
}

export async function getFoundationRuntimeStatus(serviceKey) {
  const result = await pool.query(
    `
      SELECT *
      FROM foundation_runtime_status
      WHERE service_key = $1
    `,
    [serviceKey]
  )
  return mapFoundationRuntimeStatusRow(result.rows[0])
}

export async function getFoundationJobRunSnapshot({ limit = 30, includeOutput = false } = {}) {
  const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 30))
  const controls = await getFoundationJobControls()
  const recentResult = await pool.query(
    `
      SELECT run_id, job_key, title, job_type, status, command, requested_by,
             started_at, finished_at, duration_ms, exit_code, signal,
             output_tail, error_message, metadata, created_at, updated_at
      FROM foundation_job_runs
      ORDER BY created_at DESC
      LIMIT $1
    `,
    [normalizedLimit]
  )
  const latestResult = await pool.query(
    `
      SELECT DISTINCT ON (job_key)
             run_id, job_key, title, job_type, status, command, requested_by,
             started_at, finished_at, duration_ms, exit_code, signal,
             output_tail, error_message, metadata, created_at, updated_at
      FROM foundation_job_runs
      ORDER BY job_key, created_at DESC
    `
  )

  const latestRuns = recentResult.rows.map(row => mapFoundationJobRunRow(row, { includeOutput }))
  const latestByJob = new Map()
  for (const row of latestResult.rows) {
    const run = mapFoundationJobRunRow(row, { includeOutput })
    latestByJob.set(run.jobKey, run)
  }

  const now = new Date()
  const jobs = getFoundationJobDefinitions().map(baseJob => {
    const job = applyFoundationJobControl(baseJob, controls.get(baseJob.key))
    const latestRun = latestByJob.get(job.key) || null
    const health = getFoundationJobHealth(job, latestRun)
    const runtime = getFoundationJobRuntime(job, latestRun, now)
    return {
      ...job,
      status: health.status,
      statusDetail: health.detail,
      runtimeMode: runtime.runtimeMode,
      scheduleStatus: runtime.scheduleStatus,
      scheduleDetail: runtime.scheduleDetail,
      due: runtime.due,
      nextRunAt: runtime.nextRunAt,
      latestRun,
    }
  })

  return {
    generatedAt: new Date().toISOString(),
    totalJobs: jobs.length,
    enabledJobs: jobs.filter(job => job.enabled).length,
    scheduledJobs: jobs.filter(job => job.runtimeMode === 'scheduled').length,
    dueJobs: jobs.filter(job => job.due).length,
    manualJobs: jobs.filter(job => job.runtimeMode === 'manual').length,
    jobs,
    latestRuns,
  }
}

export async function updateFoundationJobControl(jobKey, input = {}, actor = 'system') {
  const normalizedJobKey = String(jobKey || '').trim()
  if (!normalizedJobKey) throw new Error('jobKey is required.')

  const allowedModes = new Set(['scheduled', 'manual', 'paused'])
  const runtimeMode = input.runtimeMode == null || input.runtimeMode === ''
    ? null
    : String(input.runtimeMode)
  if (runtimeMode && !allowedModes.has(runtimeMode)) {
    throw new Error(`Invalid runtime mode: ${runtimeMode}`)
  }

  const enabled = typeof input.enabled === 'boolean' ? input.enabled : null
  const scheduleEveryMinutes = input.scheduleEveryMinutes == null || input.scheduleEveryMinutes === ''
    ? null
    : Number(input.scheduleEveryMinutes)
  if (scheduleEveryMinutes != null && (!Number.isFinite(scheduleEveryMinutes) || scheduleEveryMinutes <= 0)) {
    throw new Error('scheduleEveryMinutes must be a positive number when provided.')
  }
  const pauseReason = input.pauseReason == null ? null : String(input.pauseReason).trim()

  return withFoundationTransaction(async client => {
    const result = await client.query(
      `
        INSERT INTO foundation_job_controls (
          job_key, runtime_mode, enabled, schedule_every_minutes,
          pause_reason, updated_by, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,NOW())
        ON CONFLICT (job_key) DO UPDATE SET
          runtime_mode = EXCLUDED.runtime_mode,
          enabled = EXCLUDED.enabled,
          schedule_every_minutes = EXCLUDED.schedule_every_minutes,
          pause_reason = EXCLUDED.pause_reason,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
        RETURNING job_key, runtime_mode, enabled, schedule_every_minutes,
                  pause_reason, updated_by, updated_at
      `,
      [
        normalizedJobKey,
        runtimeMode,
        enabled,
        scheduleEveryMinutes,
        pauseReason,
        actor,
      ]
    )

    await insertChangeEvent(client, {
      eventType: 'foundation_job_control_updated',
      entityTable: 'foundation_job_controls',
      entityId: normalizedJobKey,
      actor,
      summary: `${normalizedJobKey} control updated`,
      metadata: {
        jobKey: normalizedJobKey,
        runtimeMode,
        enabled,
        scheduleEveryMinutes,
        pauseReason,
      },
    })

    return mapFoundationJobControlRow(result.rows[0])
  })
}

export async function createFoundationJobRun(input, actor = 'system') {
  if (!input.runId || !input.jobKey || !input.title || !input.jobType || !input.command) {
    throw new Error('runId/jobKey/title/jobType/command are required for Foundation job runs.')
  }

  return withFoundationTransaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [input.jobKey])

    let result
    try {
      result = await client.query(
        `
          INSERT INTO foundation_job_runs (
            run_id, job_key, title, job_type, status, command, requested_by,
            started_at, metadata
          )
          VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9::jsonb)
          RETURNING run_id, job_key, title, job_type, status, command, requested_by,
                    started_at, finished_at, duration_ms, exit_code, signal,
                    output_tail, error_message, metadata, created_at, updated_at
        `,
        [
          input.runId,
          input.jobKey,
          input.title,
          input.jobType,
          input.status || 'running',
          JSON.stringify(input.command || {}),
          actor,
          input.startedAt || new Date().toISOString(),
          JSON.stringify(input.metadata || {}),
        ]
      )
    } catch (error) {
      if (error?.code === '23505' && String(error.constraint || '').includes('foundation_job_runs_active')) {
        throw new Error(`Foundation job already has an active run: ${input.jobKey}`)
      }
      throw error
    }

    await insertChangeEvent(client, {
      eventType: 'job_run_started',
      entityTable: 'foundation_job_runs',
      entityId: input.runId,
      actor,
      summary: `${input.title} started`,
      metadata: {
        jobKey: input.jobKey,
        jobType: input.jobType,
      },
    })

    return mapFoundationJobRunRow(result.rows[0], { includeOutput: true })
  })
}

export async function finishFoundationJobRun(runId, input, actor = 'system') {
  const normalizedRunId = String(runId || '').trim()
  if (!normalizedRunId) throw new Error('runId is required to finish a Foundation job run.')

  const status = input.status === 'succeeded' ? 'succeeded' : input.status === 'cancelled' ? 'cancelled' : 'failed'
  const finishedAt = input.finishedAt || new Date().toISOString()
  const result = await withFoundationTransaction(async client => {
    const updateResult = await client.query(
      `
        UPDATE foundation_job_runs
        SET status = $2,
            finished_at = $3,
            duration_ms = $4,
            exit_code = $5,
            signal = $6,
            output_tail = $7,
            error_message = $8,
            metadata = COALESCE(metadata, '{}'::jsonb) || $9::jsonb,
            updated_at = NOW()
        WHERE run_id = $1
        RETURNING run_id, job_key, title, job_type, status, command, requested_by,
                  started_at, finished_at, duration_ms, exit_code, signal,
                  output_tail, error_message, metadata, created_at, updated_at
      `,
      [
        normalizedRunId,
        status,
        finishedAt,
        input.durationMs ?? null,
        input.exitCode ?? null,
        input.signal ?? null,
        input.outputTail || '',
        input.errorMessage || null,
        JSON.stringify(input.metadata || {}),
      ]
    )

    if (!updateResult.rows[0]) {
      throw new Error(`Foundation job run not found: ${normalizedRunId}`)
    }

    const row = updateResult.rows[0]
    await insertChangeEvent(client, {
      eventType: status === 'succeeded' ? 'job_run_succeeded' : 'job_run_failed',
      entityTable: 'foundation_job_runs',
      entityId: normalizedRunId,
      actor,
      summary: `${row.title} ${status}`,
      metadata: {
        jobKey: row.job_key,
        jobType: row.job_type,
        durationMs: row.duration_ms,
        exitCode: row.exit_code,
        signal: row.signal,
      },
    })

    return mapFoundationJobRunRow(row, { includeOutput: true })
  })

  return result
}

export async function markStaleFoundationJobRuns({ olderThanMinutes = 180 } = {}, actor = 'system') {
  const normalizedMinutes = Math.max(30, Math.min(24 * 60, Number(olderThanMinutes) || 180))
  return withFoundationTransaction(async client => {
    const result = await client.query(
      `
        UPDATE foundation_job_runs
        SET status = 'failed',
            finished_at = NOW(),
            duration_ms = GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NOW() - COALESCE(started_at, created_at))) * 1000))::integer,
            error_message = COALESCE(NULLIF(error_message, ''), 'Marked failed by stale active-run reaper.'),
            metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
              'staleReapedBy', $2::text,
              'staleReapedAt', NOW(),
              'staleThresholdMinutes', $1::int
            ),
            updated_at = NOW()
        WHERE status IN ('queued', 'running')
          AND COALESCE(started_at, created_at) < NOW() - ($1::int * INTERVAL '1 minute')
        RETURNING run_id, job_key, title, job_type, status, command, requested_by,
                  started_at, finished_at, duration_ms, exit_code, signal,
                  output_tail, error_message, metadata, created_at, updated_at
      `,
      [normalizedMinutes, actor]
    )

    for (const row of result.rows) {
      await insertChangeEvent(client, {
        eventType: 'job_run_failed',
        entityTable: 'foundation_job_runs',
        entityId: row.run_id,
        actor,
        summary: `${row.title} marked failed after stale active run`,
        metadata: {
          jobKey: row.job_key,
          staleThresholdMinutes: normalizedMinutes,
        },
      })
    }

    return result.rows.map(row => mapFoundationJobRunRow(row, { includeOutput: true }))
  })
}

export async function getStaleSourceCrawlTargetRuns({ olderThanMinutes = SOURCE_CRAWL_STALE_RUN_MINUTES, limit = 50 } = {}) {
  const normalizedMinutes = Math.max(5, Math.min(24 * 60, Number(olderThanMinutes) || SOURCE_CRAWL_STALE_RUN_MINUTES))
  const normalizedLimit = Math.min(200, Math.max(1, Number(limit) || 50))
  const result = await pool.query(
    `
      SELECT run_id, target_key, source_id, status, lease_owner, lease_expires_at,
             started_at, finished_at, next_run_at, last_error, inspected_delta,
             archived_delta, extracted_delta, metadata, created_at, updated_at
      FROM source_crawl_target_runs
      WHERE status = 'running'
        AND (
          (lease_expires_at IS NOT NULL AND lease_expires_at < NOW())
          OR started_at < NOW() - ($1::int * INTERVAL '1 minute')
        )
      ORDER BY started_at ASC
      LIMIT $2
    `,
    [normalizedMinutes, normalizedLimit]
  )

  return result.rows
    .map(mapSourceCrawlTargetRunRow)
    .map(run => attachSourceCrawlRunStaleState(run, normalizedMinutes))
}

export async function markStaleSourceCrawlTargetRuns({ olderThanMinutes = SOURCE_CRAWL_STALE_RUN_MINUTES, limit = 50 } = {}, actor = 'system') {
  const normalizedMinutes = Math.max(5, Math.min(24 * 60, Number(olderThanMinutes) || SOURCE_CRAWL_STALE_RUN_MINUTES))
  const normalizedLimit = Math.min(200, Math.max(1, Number(limit) || 50))
  return withFoundationTransaction(async client => {
    const result = await client.query(
      `
        WITH selected AS (
          SELECT run_id,
                 CASE
                   WHEN lease_expires_at IS NOT NULL AND lease_expires_at < NOW() THEN 'lease_expired'
                   ELSE 'running_past_threshold'
                 END AS stale_reason
          FROM source_crawl_target_runs
          WHERE status = 'running'
            AND (
              (lease_expires_at IS NOT NULL AND lease_expires_at < NOW())
              OR started_at < NOW() - ($1::int * INTERVAL '1 minute')
            )
          ORDER BY started_at ASC
          LIMIT $3
          FOR UPDATE
        )
        UPDATE source_crawl_target_runs runs
        SET status = 'failed',
            finished_at = NOW(),
            last_error = COALESCE(NULLIF(runs.last_error, ''), 'Marked failed by stale source-crawl run reaper.'),
            metadata = COALESCE(runs.metadata, '{}'::jsonb) || jsonb_build_object(
              'staleReapedBy', $2::text,
              'staleReapedAt', NOW(),
              'staleThresholdMinutes', $1::int,
              'staleReason', selected.stale_reason
            ),
            updated_at = NOW()
        FROM selected
        WHERE runs.run_id = selected.run_id
        RETURNING runs.run_id, runs.target_key, runs.source_id, runs.status, runs.lease_owner,
                  runs.lease_expires_at, runs.started_at, runs.finished_at, runs.next_run_at,
                  runs.last_error, runs.inspected_delta, runs.archived_delta, runs.extracted_delta,
                  runs.metadata, runs.created_at, runs.updated_at
      `,
      [normalizedMinutes, actor, normalizedLimit]
    )

    const rows = result.rows.map(row => mapSourceCrawlTargetRunRow(row))
    for (const row of rows) {
      await client.query(
        `
          UPDATE source_crawl_targets
          SET lease_owner = NULL,
              lease_expires_at = NULL,
              last_status = 'failed',
              last_error = COALESCE(NULLIF(last_error, ''), 'Marked failed by stale source-crawl run reaper.'),
              metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                'staleRunId', $4::text,
                'staleRunReapedBy', $2::text,
                'staleRunReapedAt', NOW()
              ),
              updated_by = $2,
              updated_at = NOW()
          WHERE target_key = $1
            AND lease_owner = $3
            AND (
              lease_expires_at IS NULL
              OR lease_expires_at < NOW()
            )
        `,
        [row.targetKey, actor, row.leaseOwner, row.runId]
      )

      await insertChangeEvent(client, {
        eventType: 'source_crawl_target_updated',
        entityTable: 'source_crawl_target_runs',
        entityId: row.runId,
        actor,
        summary: `${row.targetKey} source-crawl run marked failed after stale active run`,
        metadata: {
          targetKey: row.targetKey,
          sourceId: row.sourceId,
          staleThresholdMinutes: normalizedMinutes,
          staleReason: row.metadata?.staleReason || 'unknown',
        },
      })
    }

    return rows.map(run => attachSourceCrawlRunStaleState(run, normalizedMinutes))
  })
}

export async function upsertLlmCredential(input, actor = 'system') {
  const credentialKey = String(input?.credentialKey || '').trim()
  if (!credentialKey) throw new Error('credentialKey is required.')

  return withFoundationTransaction(async client => {
    const result = await client.query(
      `
        INSERT INTO llm_credentials (
          credential_key, provider, auth_path, display_name, account_label,
          hub_key, workload_lane, secret_ref, status, policy_classification,
          allowed_workloads, notes, quota_state, metadata, updated_by, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::text[],$12,$13::jsonb,$14::jsonb,$15,NOW())
        ON CONFLICT (credential_key) DO UPDATE SET
          provider = EXCLUDED.provider,
          auth_path = EXCLUDED.auth_path,
          display_name = EXCLUDED.display_name,
          account_label = EXCLUDED.account_label,
          hub_key = EXCLUDED.hub_key,
          workload_lane = EXCLUDED.workload_lane,
          secret_ref = EXCLUDED.secret_ref,
          status = EXCLUDED.status,
          policy_classification = EXCLUDED.policy_classification,
          allowed_workloads = EXCLUDED.allowed_workloads,
          notes = EXCLUDED.notes,
          quota_state = EXCLUDED.quota_state,
          metadata = COALESCE(llm_credentials.metadata, '{}'::jsonb) || EXCLUDED.metadata,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
        RETURNING credential_key, provider, auth_path, display_name, account_label,
                  hub_key, workload_lane, secret_ref, status, policy_classification,
                  allowed_workloads, notes, quota_state, metadata, updated_by,
                  created_at, updated_at
      `,
      [
        credentialKey,
        String(input.provider || '').trim(),
        String(input.authPath || '').trim(),
        String(input.displayName || credentialKey).trim(),
        input.accountLabel == null ? null : String(input.accountLabel).trim(),
        String(input.hubKey || 'foundation').trim(),
        String(input.workloadLane || 'foundation').trim(),
        input.secretRef == null ? null : String(input.secretRef).trim(),
        String(input.status || 'unknown').trim(),
        String(input.policyClassification || 'untested').trim(),
        Array.isArray(input.allowedWorkloads) ? input.allowedWorkloads.map(value => String(value).trim()).filter(Boolean) : [],
        input.notes == null ? null : String(input.notes).trim(),
        JSON.stringify(input.quotaState || {}),
        JSON.stringify(input.metadata || {}),
        actor,
      ]
    )

    await insertChangeEvent(client, {
      eventType: 'llm_credential_updated',
      entityTable: 'llm_credentials',
      entityId: credentialKey,
      actor,
      summary: `${credentialKey} LLM credential updated`,
      metadata: {
        provider: input.provider,
        authPath: input.authPath,
        status: input.status || 'unknown',
        policyClassification: input.policyClassification || 'untested',
      },
    })

    return mapLlmCredentialRow(result.rows[0])
  })
}

export async function upsertLlmRoute(input, actor = 'system') {
  const routeKey = String(input?.routeKey || '').trim()
  if (!routeKey) throw new Error('routeKey is required.')

  return withFoundationTransaction(async client => {
    const result = await client.query(
      `
        INSERT INTO llm_routes (
          route_key, workload, hub_key, priority, provider, model, auth_path,
          credential_key, fallback_route_key, status, policy_classification,
          cost_cap_usd, risk_class, notes, metadata, updated_by, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,NOW())
        ON CONFLICT (route_key) DO UPDATE SET
          workload = EXCLUDED.workload,
          hub_key = EXCLUDED.hub_key,
          priority = EXCLUDED.priority,
          provider = EXCLUDED.provider,
          model = EXCLUDED.model,
          auth_path = EXCLUDED.auth_path,
          credential_key = EXCLUDED.credential_key,
          fallback_route_key = EXCLUDED.fallback_route_key,
          status = EXCLUDED.status,
          policy_classification = EXCLUDED.policy_classification,
          cost_cap_usd = EXCLUDED.cost_cap_usd,
          risk_class = EXCLUDED.risk_class,
          notes = EXCLUDED.notes,
          metadata = COALESCE(llm_routes.metadata, '{}'::jsonb) || EXCLUDED.metadata,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
        RETURNING route_key, workload, hub_key, priority, provider, model,
                  auth_path, credential_key, fallback_route_key, status,
                  policy_classification, cost_cap_usd, risk_class, notes,
                  metadata, updated_by, created_at, updated_at
      `,
      [
        routeKey,
        String(input.workload || '').trim(),
        String(input.hubKey || 'foundation').trim(),
        Number(input.priority || 1),
        String(input.provider || '').trim(),
        String(input.model || '').trim(),
        String(input.authPath || '').trim(),
        input.credentialKey == null ? null : String(input.credentialKey).trim(),
        input.fallbackRouteKey == null ? null : String(input.fallbackRouteKey).trim(),
        String(input.status || 'planned').trim(),
        String(input.policyClassification || 'untested').trim(),
        input.costCapUsd == null ? null : Number(input.costCapUsd),
        String(input.riskClass || 'untested').trim(),
        input.notes == null ? null : String(input.notes).trim(),
        JSON.stringify(input.metadata || {}),
        actor,
      ]
    )

    await insertChangeEvent(client, {
      eventType: 'llm_route_updated',
      entityTable: 'llm_routes',
      entityId: routeKey,
      actor,
      summary: `${routeKey} LLM route updated`,
      metadata: {
        workload: input.workload,
        hubKey: input.hubKey || 'foundation',
        provider: input.provider,
        authPath: input.authPath,
        status: input.status || 'planned',
      },
    })

    return mapLlmRouteRow(result.rows[0])
  })
}

export async function recordLlmRouteProbe(input, actor = 'system') {
  const probeId = String(input?.probeId || `llm-probe-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${randomUUID().slice(0, 8)}`).trim()

  const result = await pool.query(
    `
      INSERT INTO llm_route_probes (
        probe_id, credential_key, provider, auth_path, probe_type, status,
        detail, capability, metadata, probed_at, probed_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11)
      RETURNING probe_id, credential_key, provider, auth_path, probe_type,
                status, detail, capability, metadata, probed_at, probed_by
    `,
    [
      probeId,
      input.credentialKey == null ? null : String(input.credentialKey).trim(),
      String(input.provider || '').trim(),
      String(input.authPath || '').trim(),
      String(input.probeType || '').trim(),
      String(input.status || 'skipped').trim(),
      String(input.detail || '').trim(),
      JSON.stringify(input.capability || {}),
      JSON.stringify(input.metadata || {}),
      input.probedAt || new Date().toISOString(),
      actor,
    ]
  )

  await pool.query(
    `
      INSERT INTO change_events (
        event_type, entity_table, entity_id, actor, summary, metadata
      )
      VALUES ($1,$2,$3,$4,$5,$6::jsonb)
    `,
    [
      'llm_route_probe_recorded',
      'llm_route_probes',
      probeId,
      actor,
      `${input.provider || 'unknown'} ${input.authPath || 'unknown'} probe ${input.status || 'skipped'}`,
      JSON.stringify({
        provider: input.provider,
        authPath: input.authPath,
        credentialKey: input.credentialKey || null,
        probeType: input.probeType,
        status: input.status || 'skipped',
      }),
    ]
  )

  return mapLlmRouteProbeRow(result.rows[0])
}

export async function createLlmCall(input, actor = 'system') {
  const callId = String(input?.callId || `llm-call-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${randomUUID().slice(0, 8)}`).trim()
  const startedAt = input.startedAt || new Date().toISOString()
  const result = await pool.query(
    `
      INSERT INTO llm_calls (
        call_id, workload, hub_key, provider, model, auth_path, credential_key,
        route_key, status, estimated_input_tokens, estimated_output_tokens,
        estimated_cost_usd, error_message, metadata, started_at, finished_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16)
      RETURNING call_id, workload, hub_key, provider, model, auth_path,
                credential_key, route_key, status, estimated_input_tokens,
                estimated_output_tokens, estimated_cost_usd, error_message,
                metadata, started_at, finished_at, created_at, updated_at
    `,
    [
      callId,
      String(input.workload || '').trim(),
      String(input.hubKey || 'foundation').trim(),
      String(input.provider || '').trim(),
      String(input.model || '').trim(),
      String(input.authPath || '').trim(),
      input.credentialKey == null ? null : String(input.credentialKey).trim(),
      input.routeKey == null ? null : String(input.routeKey).trim(),
      String(input.status || 'started').trim(),
      input.estimatedInputTokens == null ? null : Number(input.estimatedInputTokens),
      input.estimatedOutputTokens == null ? null : Number(input.estimatedOutputTokens),
      input.estimatedCostUsd == null ? null : Number(input.estimatedCostUsd),
      input.errorMessage == null ? null : String(input.errorMessage).trim(),
      JSON.stringify({ ...(input.metadata || {}), requestedBy: actor }),
      startedAt,
      input.finishedAt || null,
    ]
  )

  return mapLlmCallRow(result.rows[0])
}

export async function finishLlmCall(callId, input = {}) {
  const normalizedCallId = String(callId || '').trim()
  if (!normalizedCallId) throw new Error('callId is required.')

  const result = await pool.query(
    `
      UPDATE llm_calls
      SET status = $2,
          estimated_output_tokens = COALESCE($3, estimated_output_tokens),
          estimated_cost_usd = COALESCE($4, estimated_cost_usd),
          error_message = $5,
          metadata = COALESCE(metadata, '{}'::jsonb) || $6::jsonb,
          finished_at = COALESCE($7, NOW()),
          updated_at = NOW()
      WHERE call_id = $1
      RETURNING call_id, workload, hub_key, provider, model, auth_path,
                credential_key, route_key, status, estimated_input_tokens,
                estimated_output_tokens, estimated_cost_usd, error_message,
                metadata, started_at, finished_at, created_at, updated_at
    `,
    [
      normalizedCallId,
      String(input.status || 'succeeded').trim(),
      input.estimatedOutputTokens == null ? null : Number(input.estimatedOutputTokens),
      input.estimatedCostUsd == null ? null : Number(input.estimatedCostUsd),
      input.errorMessage == null ? null : String(input.errorMessage).trim(),
      JSON.stringify(input.metadata || {}),
      input.finishedAt || null,
    ]
  )

  if (!result.rows[0]) throw new Error(`LLM call not found: ${normalizedCallId}`)
  return mapLlmCallRow(result.rows[0])
}

export async function getLlmRuntimeSnapshot({ limit = 20 } = {}) {
  const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 20))
  const [credentialsResult, routesResult, probesResult, callsResult] = await Promise.all([
    pool.query(`
      SELECT credential_key, provider, auth_path, display_name, account_label,
             hub_key, workload_lane, secret_ref, status, policy_classification,
             allowed_workloads, notes, quota_state, metadata, updated_by,
             created_at, updated_at
      FROM llm_credentials
      ORDER BY hub_key ASC, workload_lane ASC, provider ASC, credential_key ASC
    `),
    pool.query(`
      SELECT route_key, workload, hub_key, priority, provider, model,
             auth_path, credential_key, fallback_route_key, status,
             policy_classification, cost_cap_usd, risk_class, notes,
             metadata, updated_by, created_at, updated_at
      FROM llm_routes
      ORDER BY hub_key ASC, workload ASC, priority ASC, route_key ASC
    `),
    pool.query(`
      SELECT probe_id, credential_key, provider, auth_path, probe_type,
             status, detail, capability, metadata, probed_at, probed_by
      FROM llm_route_probes
      ORDER BY probed_at DESC
      LIMIT $1
    `, [normalizedLimit]),
    pool.query(`
      SELECT call_id, workload, hub_key, provider, model, auth_path,
             credential_key, route_key, status, estimated_input_tokens,
             estimated_output_tokens, estimated_cost_usd, error_message,
             metadata, started_at, finished_at, created_at, updated_at
      FROM llm_calls
      ORDER BY created_at DESC
      LIMIT $1
    `, [normalizedLimit]),
  ])

  const credentials = credentialsResult.rows.map(mapLlmCredentialRow)
  const routes = routesResult.rows.map(mapLlmRouteRow)
  const recentProbes = probesResult.rows.map(mapLlmRouteProbeRow)
  const recentCalls = callsResult.rows.map(mapLlmCallRow)
  const latestProbeByRoute = new Map()
  for (const probe of recentProbes) {
    const key = [
      probe.credentialKey || '',
      probe.provider,
      probe.authPath,
      probe.probeType,
    ].join('|')
    if (!latestProbeByRoute.has(key)) {
      latestProbeByRoute.set(key, probe)
    }
  }
  const latestProbes = [...latestProbeByRoute.values()]

  return {
    generatedAt: new Date().toISOString(),
    credentials,
    routes,
    recentProbes,
    recentCalls,
    summary: {
      credentialCount: credentials.length,
      availableCredentials: credentials.filter(item => item.status === 'available').length,
      routeCount: routes.length,
      availableRoutes: routes.filter(item => item.status === 'available').length,
      latestProbeFailures: latestProbes.filter(item => item.status === 'failed').length,
      recentProbeFailures: latestProbes.filter(item => item.status === 'failed').length,
      recentCallFailures: recentCalls.filter(item => item.status === 'failed').length,
    },
  }
}

export async function getStaleLlmCalls({ olderThanSeconds = 240, graceSeconds = 60, limit = 20 } = {}) {
  const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 20))
  const fallbackTimeoutSeconds = Math.max(1, Number(olderThanSeconds) || 240)
  const normalizedGraceSeconds = Math.max(0, Number(graceSeconds) || 0)
  const result = await pool.query(
    `
      WITH active_calls AS (
        SELECT call_id, workload, hub_key, provider, model, auth_path,
               credential_key, route_key, status, metadata, created_at, finished_at,
               error_message,
               CASE
                 WHEN COALESCE(metadata->>'timeoutMs', '') ~ '^[0-9]+$'
                 THEN CEIL((metadata->>'timeoutMs')::numeric / 1000.0)::integer
                 ELSE $1::integer
               END AS timeout_seconds
        FROM llm_calls
        WHERE status IN ('planned', 'started')
      )
      SELECT call_id, workload, hub_key, provider, model, auth_path,
             credential_key, route_key, status, metadata, created_at, finished_at,
             error_message, timeout_seconds,
             $2::integer AS grace_seconds,
             FLOOR(EXTRACT(EPOCH FROM (NOW() - created_at)))::integer AS age_seconds
      FROM active_calls
      WHERE created_at < NOW() - ((timeout_seconds + $2::integer)::text || ' seconds')::interval
      ORDER BY created_at ASC
      LIMIT $3
    `,
    [fallbackTimeoutSeconds, normalizedGraceSeconds, normalizedLimit]
  )

  return result.rows.map(row => ({
    callId: row.call_id,
    workload: row.workload,
    hubKey: row.hub_key,
    provider: row.provider,
    model: row.model,
    authPath: row.auth_path,
    credentialKey: row.credential_key,
    routeKey: row.route_key,
    status: row.status,
    metadata: row.metadata || {},
    timeoutSeconds: Number(row.timeout_seconds || fallbackTimeoutSeconds),
    graceSeconds: Number(row.grace_seconds || normalizedGraceSeconds),
    ageSeconds: Number(row.age_seconds || 0),
    createdAt: row.created_at,
    finishedAt: row.finished_at,
    errorMessage: row.error_message || '',
  }))
}

export async function markStaleLlmCalls({ olderThanSeconds = 240, graceSeconds = 60, limit = 50 } = {}, actor = 'system') {
  const normalizedLimit = Math.min(200, Math.max(1, Number(limit) || 50))
  const fallbackTimeoutSeconds = Math.max(1, Number(olderThanSeconds) || 240)
  const normalizedGraceSeconds = Math.max(0, Number(graceSeconds) || 0)

  const result = await pool.query(
    `
      WITH stale_calls AS (
        SELECT call_id
        FROM (
          SELECT call_id,
                 CASE
                   WHEN COALESCE(metadata->>'timeoutMs', '') ~ '^[0-9]+$'
                   THEN CEIL((metadata->>'timeoutMs')::numeric / 1000.0)::integer
                   ELSE $1::integer
                 END AS timeout_seconds,
                 created_at
          FROM llm_calls
          WHERE status IN ('planned', 'started')
        ) active_calls
        WHERE created_at < NOW() - ((timeout_seconds + $2::integer)::text || ' seconds')::interval
        ORDER BY created_at ASC
        LIMIT $3
      )
      UPDATE llm_calls
      SET status = 'failed',
          error_message = COALESCE(NULLIF(error_message, ''), 'Marked failed by stale LLM call reaper.'),
          metadata = COALESCE(metadata, '{}'::jsonb) || $4::jsonb,
          finished_at = COALESCE(finished_at, NOW()),
          updated_at = NOW()
      WHERE call_id IN (SELECT call_id FROM stale_calls)
      RETURNING call_id, workload, hub_key, provider, model, auth_path,
                credential_key, route_key, status, estimated_input_tokens,
                estimated_output_tokens, estimated_cost_usd, error_message,
                metadata, started_at, finished_at, created_at, updated_at
    `,
    [
      fallbackTimeoutSeconds,
      normalizedGraceSeconds,
      normalizedLimit,
      JSON.stringify({
        staleLlmCallReapedBy: actor,
        staleLlmCallReapedAt: new Date().toISOString(),
        staleLlmCallFallbackTimeoutSeconds: fallbackTimeoutSeconds,
        staleLlmCallGraceSeconds: normalizedGraceSeconds,
      }),
    ]
  )

  return result.rows.map(mapLlmCallRow)
}

export async function upsertSourceCrawlTarget(input, actor = 'system') {
  const targetKey = String(input?.targetKey || '').trim()
  if (!targetKey) throw new Error('targetKey is required.')

  return withFoundationTransaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`source_crawl_target:${targetKey}`])

    const result = await client.query(
      `
        INSERT INTO source_crawl_targets (
          target_key, source_id, title, lane, target_type, status, priority,
          runtime_mode, cursor_state, budget, dedupe_policy, lease_owner,
          lease_expires_at, last_run_at, next_run_at, last_status, last_error,
          inspected_count, archived_count, extracted_count, metadata, notes,
          updated_by, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21::jsonb,$22,$23,NOW())
        ON CONFLICT (target_key) DO UPDATE SET
          source_id = EXCLUDED.source_id,
          title = EXCLUDED.title,
          lane = EXCLUDED.lane,
          target_type = EXCLUDED.target_type,
          status = EXCLUDED.status,
          priority = EXCLUDED.priority,
          runtime_mode = EXCLUDED.runtime_mode,
          cursor_state = COALESCE(source_crawl_targets.cursor_state, '{}'::jsonb) || EXCLUDED.cursor_state,
          budget = COALESCE(source_crawl_targets.budget, '{}'::jsonb) || EXCLUDED.budget,
          dedupe_policy = COALESCE(source_crawl_targets.dedupe_policy, '{}'::jsonb) || EXCLUDED.dedupe_policy,
          lease_owner = EXCLUDED.lease_owner,
          lease_expires_at = EXCLUDED.lease_expires_at,
          last_run_at = COALESCE(EXCLUDED.last_run_at, source_crawl_targets.last_run_at),
          next_run_at = COALESCE(EXCLUDED.next_run_at, source_crawl_targets.next_run_at),
          last_status = COALESCE(EXCLUDED.last_status, source_crawl_targets.last_status),
          last_error = EXCLUDED.last_error,
          inspected_count = GREATEST(source_crawl_targets.inspected_count, EXCLUDED.inspected_count),
          archived_count = GREATEST(source_crawl_targets.archived_count, EXCLUDED.archived_count),
          extracted_count = GREATEST(source_crawl_targets.extracted_count, EXCLUDED.extracted_count),
          metadata = COALESCE(source_crawl_targets.metadata, '{}'::jsonb) || EXCLUDED.metadata,
          notes = EXCLUDED.notes,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
        RETURNING target_key, source_id, title, lane, target_type, status,
                  priority, runtime_mode, cursor_state, budget, dedupe_policy,
                  lease_owner, lease_expires_at, last_run_at, next_run_at,
                  last_status, last_error, inspected_count, archived_count,
                  extracted_count, metadata, notes, updated_by, created_at,
                  updated_at
      `,
      [
        targetKey,
        String(input.sourceId || '').trim(),
        String(input.title || targetKey).trim(),
        String(input.lane || 'backfill').trim(),
        String(input.targetType || 'source').trim(),
        String(input.status || 'planned').trim(),
        String(input.priority || 'P1').trim(),
        String(input.runtimeMode || 'manual').trim(),
        JSON.stringify(input.cursorState || {}),
        JSON.stringify(input.budget || {}),
        JSON.stringify(input.dedupePolicy || {}),
        input.leaseOwner == null ? null : String(input.leaseOwner).trim(),
        input.leaseExpiresAt || null,
        input.lastRunAt || null,
        input.nextRunAt || null,
        input.lastStatus == null ? null : String(input.lastStatus).trim(),
        input.lastError == null ? null : String(input.lastError).trim(),
        Number(input.inspectedCount || 0),
        Number(input.archivedCount || 0),
        Number(input.extractedCount || 0),
        JSON.stringify(input.metadata || {}),
        input.notes == null ? null : String(input.notes).trim(),
        actor,
      ]
    )

    await insertChangeEvent(client, {
      eventType: 'source_crawl_target_updated',
      entityTable: 'source_crawl_targets',
      entityId: targetKey,
      actor,
      summary: `${targetKey} crawl target updated`,
      metadata: {
        sourceId: input.sourceId,
        lane: input.lane || 'backfill',
        status: input.status || 'planned',
        runtimeMode: input.runtimeMode || 'manual',
      },
    })

    return mapSourceCrawlTargetRow(result.rows[0])
  })
}

export async function upsertSourceCrawlItem(input, actor = 'system') {
  const itemKey = String(input?.itemKey || '').trim()
  if (!itemKey) throw new Error('itemKey is required.')
  const targetKey = String(input.targetKey || '').trim()
  if (!targetKey) throw new Error('targetKey is required.')
  const externalId = String(input.externalId || '').trim()
  if (!externalId) throw new Error('externalId is required.')
  const incrementAttempt = Boolean(input?.incrementAttempt)
  const metadataDeleteKeys = Array.isArray(input?.metadataDeleteKeys)
    ? input.metadataDeleteKeys.map(key => String(key || '').trim()).filter(Boolean)
    : []

  return withFoundationTransaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`source_crawl_item:${targetKey}:${externalId}`])

    const result = await client.query(
      `
        INSERT INTO source_crawl_items (
          item_key, target_key, source_id, external_id, item_type, status,
          fingerprint, lease_owner, lease_expires_at, attempt_count,
          last_error, artifact_id, metadata, discovered_at, processed_at,
          updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,NOW())
        ON CONFLICT (target_key, external_id) DO UPDATE SET
          item_type = EXCLUDED.item_type,
          status = EXCLUDED.status,
          fingerprint = COALESCE(EXCLUDED.fingerprint, source_crawl_items.fingerprint),
          lease_owner = EXCLUDED.lease_owner,
          lease_expires_at = EXCLUDED.lease_expires_at,
          attempt_count = CASE
            WHEN $16 = TRUE THEN source_crawl_items.attempt_count + 1
            ELSE GREATEST(source_crawl_items.attempt_count, EXCLUDED.attempt_count)
          END,
          last_error = EXCLUDED.last_error,
          artifact_id = COALESCE(EXCLUDED.artifact_id, source_crawl_items.artifact_id),
          metadata = COALESCE((
            SELECT jsonb_object_agg(existing.key, existing.value)
            FROM jsonb_each(COALESCE(source_crawl_items.metadata, '{}'::jsonb)) AS existing
            WHERE NOT (existing.key = ANY($17::text[]))
          ), '{}'::jsonb) || EXCLUDED.metadata,
          processed_at = COALESCE(EXCLUDED.processed_at, source_crawl_items.processed_at),
          updated_at = NOW()
        RETURNING item_key, target_key, source_id, external_id, item_type,
                  status, fingerprint, lease_owner, lease_expires_at,
                  attempt_count, last_error, artifact_id, metadata,
                  discovered_at, processed_at, updated_at
      `,
      [
        itemKey,
        targetKey,
        String(input.sourceId || '').trim(),
        externalId,
        String(input.itemType || 'artifact').trim(),
        String(input.status || 'pending').trim(),
        input.fingerprint == null ? null : String(input.fingerprint).trim(),
        input.leaseOwner == null ? null : String(input.leaseOwner).trim(),
        input.leaseExpiresAt || null,
        Number(input.attemptCount ?? (incrementAttempt ? 1 : 0)),
        input.lastError == null ? null : String(input.lastError).trim(),
        input.artifactId == null ? null : String(input.artifactId).trim(),
        JSON.stringify(input.metadata || {}),
        input.discoveredAt || new Date().toISOString(),
        input.processedAt || null,
        incrementAttempt,
        metadataDeleteKeys,
      ]
    )

    const item = mapSourceCrawlItemRow(result.rows[0])

    await insertChangeEvent(client, {
      eventType: 'source_crawl_item_updated',
      entityTable: 'source_crawl_items',
      entityId: item.itemKey,
      actor,
      summary: `${item.itemKey} crawl item updated`,
      metadata: {
        targetKey: input.targetKey,
        sourceId: input.sourceId,
        status: input.status || 'pending',
      },
    })

    return item
  })
}

function makeSourceCrawlRunId(targetKey) {
  const compactTarget = String(targetKey || 'target')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'target'
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '')
  return `crawl-${compactTarget}-${stamp}-${randomUUID().slice(0, 8)}`
}

export async function leaseSourceCrawlTarget(targetKey, { leaseOwner = 'system', leaseSeconds = 900, force = false } = {}) {
  const normalizedTargetKey = String(targetKey || '').trim()
  if (!normalizedTargetKey) throw new Error('targetKey is required.')

  return withFoundationTransaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`source_crawl_target:${normalizedTargetKey}`])
    const result = await client.query(
      `
        UPDATE source_crawl_targets
        SET lease_owner = $2,
            lease_expires_at = NOW() + ($3::text || ' seconds')::interval,
            last_status = 'leased',
            last_error = NULL,
            updated_by = $2,
            updated_at = NOW()
        WHERE target_key = $1
          AND (
            $4 = TRUE
            OR (
              status NOT IN ('blocked', 'paused', 'complete')
              AND runtime_mode <> 'paused'
              AND (lease_expires_at IS NULL OR lease_expires_at < NOW())
            )
          )
        RETURNING target_key, source_id, title, lane, target_type, status,
                  priority, runtime_mode, cursor_state, budget, dedupe_policy,
                  lease_owner, lease_expires_at, last_run_at, next_run_at,
                  last_status, last_error, inspected_count, archived_count,
                  extracted_count, metadata, notes, updated_by, created_at,
                  updated_at
      `,
      [normalizedTargetKey, String(leaseOwner || 'system').trim(), Number(leaseSeconds || 900), Boolean(force)]
    )

    if (!result.rows[0]) {
      throw new Error(`Source crawl target is not leaseable or is already leased: ${normalizedTargetKey}`)
    }

    const target = mapSourceCrawlTargetRow(result.rows[0])
    const runId = makeSourceCrawlRunId(normalizedTargetKey)
    const runResult = await client.query(
      `
        INSERT INTO source_crawl_target_runs (
          run_id, target_key, source_id, status, lease_owner, lease_expires_at,
          metadata
        )
        VALUES ($1,$2,$3,'running',$4,$5,$6::jsonb)
        RETURNING run_id, target_key, source_id, status, lease_owner, lease_expires_at,
                  started_at, finished_at, next_run_at, last_error, inspected_delta,
                  archived_delta, extracted_delta, metadata, created_at, updated_at
      `,
      [
        runId,
        target.targetKey,
        target.sourceId,
        target.leaseOwner || String(leaseOwner || 'system').trim(),
        target.leaseExpiresAt,
        JSON.stringify({
          forced: Boolean(force),
          leaseSeconds: Number(leaseSeconds || 900),
        }),
      ]
    )

    return {
      ...target,
      crawlRunId: runId,
      crawlRun: mapSourceCrawlTargetRunRow(runResult.rows[0]),
    }
  })
}

export async function finishSourceCrawlTargetRun(targetKey, input = {}, actor = 'system') {
  const normalizedTargetKey = String(targetKey || '').trim()
  if (!normalizedTargetKey) throw new Error('targetKey is required.')
  const leaseOwner = String(input.leaseOwner || actor || 'system').trim()
  const requestedRunId = String(input.runId || input.crawlRunId || '').trim()

  return withFoundationTransaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`source_crawl_target:${normalizedTargetKey}`])
    const activeRunResult = await client.query(
      `
        SELECT run_id
        FROM source_crawl_target_runs
        WHERE target_key = $1
          AND lease_owner = $2
          AND status = 'running'
          AND ($3::text IS NULL OR run_id = $3)
        ORDER BY started_at DESC
        LIMIT 1
        FOR UPDATE
      `,
      [normalizedTargetKey, leaseOwner, requestedRunId || null]
    )
    const activeRunId = activeRunResult.rows[0]?.run_id || null
    if (requestedRunId && !activeRunId) {
      throw new Error(`Source crawl target run finish blocked because ${requestedRunId} is not running for ${normalizedTargetKey} under ${leaseOwner}.`)
    }

    const result = await client.query(
      `
        UPDATE source_crawl_targets
        SET lease_owner = NULL,
            lease_expires_at = NULL,
            last_run_at = COALESCE($2, NOW()),
            next_run_at = $3,
            last_status = $4,
            last_error = $5,
            inspected_count = inspected_count + $6,
            archived_count = archived_count + $7,
            extracted_count = extracted_count + $8,
            cursor_state = COALESCE(cursor_state, '{}'::jsonb) || $9::jsonb,
            metadata = COALESCE(metadata, '{}'::jsonb) || $10::jsonb,
            updated_by = $11,
            updated_at = NOW()
        WHERE target_key = $1
          AND lease_owner = $12
        RETURNING target_key, source_id, title, lane, target_type, status,
                  priority, runtime_mode, cursor_state, budget, dedupe_policy,
                  lease_owner, lease_expires_at, last_run_at, next_run_at,
                  last_status, last_error, inspected_count, archived_count,
                  extracted_count, metadata, notes, updated_by, created_at,
                  updated_at
      `,
      [
        normalizedTargetKey,
        input.lastRunAt || null,
        input.nextRunAt || null,
        String(input.lastStatus || 'succeeded').trim(),
        input.lastError == null ? null : String(input.lastError).trim(),
        Number(input.inspectedDelta || 0),
        Number(input.archivedDelta || 0),
        Number(input.extractedDelta || 0),
        JSON.stringify(input.cursorState || {}),
        JSON.stringify(input.metadata || {}),
        actor,
        leaseOwner,
      ]
    )

    if (!result.rows[0]) throw new Error(`Source crawl target finish blocked because ${normalizedTargetKey} is not leased by ${leaseOwner}.`)
    const target = mapSourceCrawlTargetRow(result.rows[0])
    let finishedRun = null
    if (activeRunId) {
      const runResult = await client.query(
        `
          UPDATE source_crawl_target_runs
          SET status = $2,
              finished_at = COALESCE($3, NOW()),
              next_run_at = $4,
              last_error = $5,
              inspected_delta = $6,
              archived_delta = $7,
              extracted_delta = $8,
              metadata = COALESCE(metadata, '{}'::jsonb) || $9::jsonb,
              updated_at = NOW()
          WHERE run_id = $1
          RETURNING run_id, target_key, source_id, status, lease_owner, lease_expires_at,
                    started_at, finished_at, next_run_at, last_error, inspected_delta,
                    archived_delta, extracted_delta, metadata, created_at, updated_at
        `,
        [
          activeRunId,
          String(input.lastStatus || 'succeeded').trim(),
          input.lastRunAt || null,
          input.nextRunAt || null,
          input.lastError == null ? null : String(input.lastError).trim(),
          Number(input.inspectedDelta || 0),
          Number(input.archivedDelta || 0),
          Number(input.extractedDelta || 0),
          JSON.stringify(input.metadata || {}),
        ]
      )
      finishedRun = runResult.rows[0] ? mapSourceCrawlTargetRunRow(runResult.rows[0]) : null
    }

    return {
      ...target,
      crawlRunId: activeRunId,
      crawlRun: finishedRun,
    }
  })
}

export async function listSourceCrawlItems({ targetKey, status, limit = 50, order = 'asc' } = {}) {
  const normalizedTargetKey = String(targetKey || '').trim()
  const normalizedStatus = String(status || '').trim()
  const normalizedLimit = Math.min(200, Math.max(1, Number(limit) || 50))
  const normalizedOrder = String(order || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC'
  const whereClauses = []
  const values = []

  if (normalizedTargetKey) {
    values.push(normalizedTargetKey)
    whereClauses.push(`target_key = $${values.length}`)
  }
  if (normalizedStatus) {
    values.push(normalizedStatus)
    whereClauses.push(`status = $${values.length}`)
  }

  values.push(normalizedLimit)
  const limitParam = `$${values.length}`
  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''

  const result = await pool.query(
    `
      SELECT item_key, target_key, source_id, external_id, item_type, status,
             fingerprint, lease_owner, lease_expires_at, attempt_count,
             last_error, artifact_id, metadata, discovered_at, processed_at,
             updated_at
      FROM source_crawl_items
      ${whereSql}
      ORDER BY updated_at ${normalizedOrder}
      LIMIT ${limitParam}
    `,
    values,
  )

  return result.rows.map(mapSourceCrawlItemRow)
}

function normalizeIntelligenceJobStatus(status) {
  const normalized = String(status || 'started').trim()
  const allowed = new Set(['planned', 'started', 'succeeded', 'failed', 'skipped'])
  if (!allowed.has(normalized)) throw new Error(`Invalid intelligence job status: ${normalized}`)
  return normalized
}

function normalizeTextArray(value) {
  if (Array.isArray(value)) {
    return value.map(item => String(item || '').trim()).filter(Boolean)
  }
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function getRegisteredSourceContractIds() {
  return getSourceContracts().map(source => source.sourceId || source.id).filter(Boolean)
}

const intelligenceAtomStore = createIntelligenceAtomStore({
  pool: foundationPoolHandle,
  withFoundationTransaction,
  insertChangeEvent,
  getRegisteredSourceIds: getRegisteredSourceContractIds,
})

export const upsertIntelligenceReportArtifact = (...args) => intelligenceAtomStore.upsertIntelligenceReportArtifact(...args)
export const upsertIntelligenceAtom = (...args) => intelligenceAtomStore.upsertIntelligenceAtom(...args)
export const recordIntelligenceAtomHit = (...args) => intelligenceAtomStore.recordIntelligenceAtomHit(...args)
export const queryIntelligenceAtomsForScoper = (...args) => intelligenceAtomStore.queryIntelligenceAtomsForScoper(...args)
export const getIntelligenceAtomSpineSnapshot = (...args) => intelligenceAtomStore.getIntelligenceAtomSpineSnapshot(...args)

const intelligenceRetrievalStore = createIntelligenceRetrievalStore({
  pool: foundationPoolHandle,
  withFoundationTransaction,
  insertChangeEvent,
  getRegisteredSourceIds: getRegisteredSourceContractIds,
  upsertIntelligenceReportArtifact,
  upsertIntelligenceAtom,
  recordIntelligenceAtomHit,
  queryIntelligenceAtomsForScoper,
})

export const promoteSharedCommunicationCandidatesToAtoms = (...args) => intelligenceRetrievalStore.promoteSharedCommunicationCandidatesToAtoms(...args)
export const searchIntelligenceEvidenceHybrid = (...args) => intelligenceRetrievalStore.searchIntelligenceEvidenceHybrid(...args)
export const searchIntelligenceChunks = (...args) => intelligenceRetrievalStore.searchIntelligenceChunks(...args)
export const searchIntelligenceChunksSemantic = (...args) => intelligenceRetrievalStore.searchIntelligenceChunksSemantic(...args)
export const selectRetrievalChunksForEmbedding = (...args) => intelligenceRetrievalStore.selectRetrievalChunksForEmbedding(...args)
export const upsertRetrievalChunkEmbedding = (...args) => intelligenceRetrievalStore.upsertRetrievalChunkEmbedding(...args)
export const buildRetrievalEmbeddingInput = (...args) => intelligenceRetrievalStore.buildRetrievalEmbeddingInput(...args)
export const upsertRetrievalChunk = (...args) => intelligenceRetrievalStore.upsertRetrievalChunk(...args)
export const recordRetrievalRun = (...args) => intelligenceRetrievalStore.recordRetrievalRun(...args)
export const getIntelligenceRetrievalSnapshot = (...args) => intelligenceRetrievalStore.getIntelligenceRetrievalSnapshot(...args)

const intelligenceSynthesisFactStore = createIntelligenceSynthesisFactStore({
  pool: foundationPoolHandle,
  withFoundationTransaction,
  insertChangeEvent,
  getRegisteredSourceIds: getRegisteredSourceContractIds,
  getSourceContracts,
  getStrategyGoalTruthSnapshot,
  getStrategyOperatingTruthSnapshot,
  searchIntelligenceEvidenceHybrid,
})

export const collectSourceBackedSynthesisFacts = (...args) => intelligenceSynthesisFactStore.collectSourceBackedSynthesisFacts(...args)
export const upsertSynthesisFactsBundle = (...args) => intelligenceSynthesisFactStore.upsertSynthesisFactsBundle(...args)
export const querySynthesisFacts = (...args) => intelligenceSynthesisFactStore.querySynthesisFacts(...args)
export const getSynthesisFactsSnapshot = (...args) => intelligenceSynthesisFactStore.getSynthesisFactsSnapshot(...args)

const intelligenceSynthesisStore = createIntelligenceSynthesisStore({
  pool: foundationPoolHandle,
  withFoundationTransaction,
  insertChangeEvent,
  querySynthesisFacts,
})

export const runGovernedSynthesis = (...args) => intelligenceSynthesisStore.runGovernedSynthesis(...args)
export const getSynthesisEngineSnapshot = (...args) => intelligenceSynthesisStore.getSynthesisEngineSnapshot(...args)

const intelligenceActionRouterStore = createIntelligenceActionRouterStore({
  pool: foundationPoolHandle,
  withFoundationTransaction,
  insertChangeEvent,
})

export const proposeActionRoutes = (...args) => intelligenceActionRouterStore.proposeActionRoutes(...args)
export const approveActionRoute = (...args) => intelligenceActionRouterStore.approveActionRoute(...args)
export const applyApprovedActionRoute = (...args) => intelligenceActionRouterStore.applyApprovedActionRoute(...args)
export const getActionRoute = (...args) => intelligenceActionRouterStore.getActionRoute(...args)
export const getActionRouterSnapshot = (...args) => intelligenceActionRouterStore.getActionRouterSnapshot(...args)
export const rejectActionRoute = (...args) => intelligenceActionRouterStore.rejectActionRoute(...args)
export const rerouteActionRoute = (...args) => intelligenceActionRouterStore.rerouteActionRoute(...args)

export async function recordActionRouteCuration(routeId, input = {}, actor = 'foundation-review-sprint') {
  const normalizedRouteId = String(routeId || '').trim()
  if (!normalizedRouteId) throw new Error('routeId is required for action-route curation.')

  return withFoundationTransaction(async client => {
    const routeResult = await client.query(
      `SELECT * FROM intelligence_action_routes WHERE route_id = $1 FOR UPDATE`,
      [normalizedRouteId]
    )
    const route = routeResult.rows[0]
    if (!route) throw new Error(`Action route not found: ${normalizedRouteId}`)
    if (route.approval_status === 'applied' && input.applyAllowedWithoutSteve !== true) {
      throw new Error(`Refusing to curate already-applied route without explicit apply allowance: ${normalizedRouteId}`)
    }

    const curation = {
      closeoutKey: String(input.closeoutKey || '').trim(),
      disposition: String(input.disposition || '').trim(),
      recommendation: String(input.recommendation || '').trim(),
      reviewedOnly: input.reviewedOnly !== false,
      foundationHousekeeping: Boolean(input.foundationHousekeeping),
      businessSideEffect: Boolean(input.businessSideEffect),
      applyAllowedWithoutSteve: Boolean(input.applyAllowedWithoutSteve),
      externalSideEffectAllowed: Boolean(input.externalSideEffectAllowed),
      reviewedBy: String(input.reviewedBy || actor).trim(),
      reviewedAt: input.reviewedAt || new Date().toISOString(),
    }

    const updatedResult = await client.query(
      `
        UPDATE intelligence_action_routes
        SET metadata = metadata || $2::jsonb,
            updated_at = NOW()
        WHERE route_id = $1
        RETURNING *
      `,
      [
        normalizedRouteId,
        JSON.stringify({ foundation1100Review: curation }),
      ]
    )

    await insertChangeEvent(client, {
      eventType: 'intelligence_action_route_curated',
      entityTable: 'intelligence_action_routes',
      entityId: normalizedRouteId,
      actor,
      summary: `Curated action route ${normalizedRouteId} for ${curation.closeoutKey}`,
      metadata: {
        closeoutKey: curation.closeoutKey,
        disposition: curation.disposition,
        reviewedOnly: curation.reviewedOnly,
      },
    })

    return updatedResult.rows[0]
  })
}

export async function upsertIntelligenceJobRun(input = {}, actor = 'system') {
  const jobId = String(input.jobId || input.job_id || '').trim()
  const jobType = String(input.jobType || input.job_type || '').trim()
  if (!jobId || !jobType) throw new Error('jobId and jobType are required for intelligence job runs.')

  const status = normalizeIntelligenceJobStatus(input.status)
  const outputArtifactIds = normalizeTextArray(input.outputArtifactIds || input.output_artifact_ids)
  const llmCallIds = normalizeTextArray(input.llmCallIds || input.llm_call_ids)

  return withFoundationTransaction(async client => {
    const result = await client.query(
      `
        INSERT INTO intelligence_job_runs (
          job_id, job_type, source_id, artifact_id, foundation_run_id,
          source_crawl_run_id, synthesis_run_id, status, cursor_state,
          budget, model, provider, auth_path, route_key, cost_usd,
          item_counts, failure_count, output_artifact_ids, next_run_state,
          result_summary, error_message, provenance, started_at, finished_at,
          duration_ms
        )
        VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9::jsonb,
          $10::jsonb,$11,$12,$13,$14,$15,
          $16::jsonb,$17,$18::text[],$19::jsonb,
          $20::jsonb,$21,$22::jsonb,$23,$24,
          $25
        )
        ON CONFLICT (job_id) DO UPDATE SET
          job_type = EXCLUDED.job_type,
          source_id = EXCLUDED.source_id,
          artifact_id = EXCLUDED.artifact_id,
          foundation_run_id = EXCLUDED.foundation_run_id,
          source_crawl_run_id = EXCLUDED.source_crawl_run_id,
          synthesis_run_id = EXCLUDED.synthesis_run_id,
          status = EXCLUDED.status,
          cursor_state = EXCLUDED.cursor_state,
          budget = EXCLUDED.budget,
          model = EXCLUDED.model,
          provider = EXCLUDED.provider,
          auth_path = EXCLUDED.auth_path,
          route_key = EXCLUDED.route_key,
          cost_usd = EXCLUDED.cost_usd,
          item_counts = EXCLUDED.item_counts,
          failure_count = EXCLUDED.failure_count,
          output_artifact_ids = EXCLUDED.output_artifact_ids,
          next_run_state = EXCLUDED.next_run_state,
          result_summary = EXCLUDED.result_summary,
          error_message = EXCLUDED.error_message,
          provenance = EXCLUDED.provenance,
          started_at = EXCLUDED.started_at,
          finished_at = EXCLUDED.finished_at,
          duration_ms = EXCLUDED.duration_ms,
          updated_at = NOW()
        RETURNING job_id, job_type, source_id, artifact_id, foundation_run_id,
                  source_crawl_run_id, synthesis_run_id, status, cursor_state,
                  budget, model, provider, auth_path, route_key, cost_usd,
                  item_counts, failure_count, output_artifact_ids, next_run_state,
                  result_summary, error_message, provenance, started_at,
                  finished_at, duration_ms, created_at, updated_at,
                  ARRAY[]::text[] AS llm_call_ids
      `,
      [
        jobId,
        jobType,
        input.sourceId == null ? null : String(input.sourceId).trim(),
        input.artifactId == null ? null : String(input.artifactId).trim(),
        input.foundationRunId == null ? null : String(input.foundationRunId).trim(),
        input.sourceCrawlRunId == null ? null : String(input.sourceCrawlRunId).trim(),
        input.synthesisRunId == null ? null : String(input.synthesisRunId).trim(),
        status,
        JSON.stringify(input.cursorState || {}),
        JSON.stringify(input.budget || {}),
        input.model == null ? null : String(input.model).trim(),
        input.provider == null ? null : String(input.provider).trim(),
        input.authPath == null ? null : String(input.authPath).trim(),
        input.routeKey == null ? null : String(input.routeKey).trim(),
        input.costUsd == null ? null : Number(input.costUsd),
        JSON.stringify(input.itemCounts || {}),
        Number(input.failureCount || 0),
        outputArtifactIds,
        JSON.stringify(input.nextRunState || {}),
        JSON.stringify(input.resultSummary || {}),
        input.errorMessage == null ? null : String(input.errorMessage).trim(),
        JSON.stringify({
          ...(input.provenance || {}),
          recordedBy: actor,
        }),
        input.startedAt || null,
        input.finishedAt || null,
        input.durationMs == null ? null : Number(input.durationMs),
      ]
    )

    await client.query('DELETE FROM intelligence_job_llm_calls WHERE job_id = $1', [jobId])
    for (const callId of llmCallIds) {
      await client.query(
        `
          INSERT INTO intelligence_job_llm_calls (job_id, call_id, relationship, metadata)
          VALUES ($1,$2,$3,$4::jsonb)
          ON CONFLICT (job_id, call_id) DO UPDATE SET
            relationship = EXCLUDED.relationship,
            metadata = EXCLUDED.metadata
        `,
        [
          jobId,
          callId,
          String(input.llmCallRelationship || 'used').trim(),
          JSON.stringify(input.llmCallMetadata || {}),
        ]
      )
    }

    await insertChangeEvent(client, {
      eventType: 'intelligence_job_run_recorded',
      entityTable: 'intelligence_job_runs',
      entityId: jobId,
      actor,
      summary: `${jobType} intelligence job ${status}`,
      metadata: {
        jobId,
        jobType,
        status,
        sourceId: input.sourceId || null,
        foundationRunId: input.foundationRunId || null,
        sourceCrawlRunId: input.sourceCrawlRunId || null,
        synthesisRunId: input.synthesisRunId || null,
      },
    })

    return {
      ...mapIntelligenceJobRunRow(result.rows[0]),
      llmCallIds,
    }
  })
}

export async function getIntelligenceJobLedgerSnapshot({ limit = 20 } = {}) {
  const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 20))
  const [runsResult, summaryResult] = await Promise.all([
    pool.query(
      `
        SELECT jobs.job_id, jobs.job_type, jobs.source_id, jobs.artifact_id,
               jobs.foundation_run_id, jobs.source_crawl_run_id, jobs.synthesis_run_id,
               jobs.status, jobs.cursor_state, jobs.budget, jobs.model, jobs.provider,
               jobs.auth_path, jobs.route_key, jobs.cost_usd, jobs.item_counts,
               jobs.failure_count, jobs.output_artifact_ids, jobs.next_run_state,
               jobs.result_summary, jobs.error_message, jobs.provenance,
               jobs.started_at, jobs.finished_at, jobs.duration_ms,
               jobs.created_at, jobs.updated_at,
               COALESCE(array_agg(links.call_id ORDER BY links.created_at) FILTER (WHERE links.call_id IS NOT NULL), ARRAY[]::text[]) AS llm_call_ids
        FROM intelligence_job_runs jobs
        LEFT JOIN intelligence_job_llm_calls links ON links.job_id = jobs.job_id
        GROUP BY jobs.job_id
        ORDER BY jobs.created_at DESC
        LIMIT $1
      `,
      [normalizedLimit]
    ),
    pool.query(`
      SELECT status, job_type, COUNT(*)::integer AS total
      FROM intelligence_job_runs
      GROUP BY status, job_type
      ORDER BY status ASC, job_type ASC
    `),
  ])

  const recentRuns = runsResult.rows.map(mapIntelligenceJobRunRow)
  const byStatus = {}
  const byType = {}
  let totalRuns = 0
  for (const row of summaryResult.rows) {
    const count = Number(row.total || 0)
    totalRuns += count
    byStatus[row.status] = (byStatus[row.status] || 0) + count
    byType[row.job_type] = (byType[row.job_type] || 0) + count
  }

  return {
    generatedAt: new Date().toISOString(),
    totalRuns,
    byStatus,
    byType,
    recentRuns,
  }
}

export async function getSourceCrawlItemsByExternalId({ targetKey, externalIds = [] } = {}) {
  const normalizedTargetKey = String(targetKey || '').trim()
  const normalizedExternalIds = [...new Set(
    (externalIds || [])
      .map(value => String(value || '').trim())
      .filter(Boolean)
  )]

  if (!normalizedTargetKey) throw new Error('targetKey is required.')
  if (!normalizedExternalIds.length) return new Map()

  const result = await pool.query(
    `
      SELECT item_key, target_key, source_id, external_id, item_type, status,
             fingerprint, lease_owner, lease_expires_at, attempt_count,
             last_error, artifact_id, metadata, discovered_at, processed_at,
             updated_at
      FROM source_crawl_items
      WHERE target_key = $1
        AND external_id = ANY($2::text[])
    `,
    [normalizedTargetKey, normalizedExternalIds],
  )

  return new Map(result.rows.map(row => [row.external_id, mapSourceCrawlItemRow(row)]))
}

export async function listDriveContentExtractionQueue({
  inventoryTargetKey = 'drive-corpus-backfill',
  extractionTargetKey = 'drive-content-extract-backfill',
  limit = 5,
  includeUnsupported = true,
  retrySkippedReasonPrefixes = [],
  parentPathIncludes = '',
  nameIncludes = '',
  fileIds = [],
  forceReprocess = false,
} = {}) {
  const normalizedInventoryTargetKey = String(inventoryTargetKey || '').trim()
  const normalizedExtractionTargetKey = String(extractionTargetKey || '').trim()
  const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 5))
  const normalizedRetrySkippedReasonPrefixes = Array.isArray(retrySkippedReasonPrefixes)
    ? retrySkippedReasonPrefixes.map(prefix => String(prefix || '').trim()).filter(Boolean)
    : []
  const normalizedParentPathIncludes = String(parentPathIncludes || '').trim()
  const normalizedNameIncludes = String(nameIncludes || '').trim()
  const normalizedFileIds = Array.isArray(fileIds)
    ? fileIds.map(fileId => String(fileId || '').trim()).filter(Boolean)
    : []
  const shouldForceReprocess = Boolean(forceReprocess)
  if (!normalizedInventoryTargetKey) throw new Error('inventoryTargetKey is required.')
  if (!normalizedExtractionTargetKey) throw new Error('extractionTargetKey is required.')

  const supportedMimeTypes = [
    'application/vnd.google-apps.document',
    'application/vnd.google-apps.spreadsheet',
    'application/pdf',
    'text/plain',
    'text/markdown',
  ]

  const filters = [
    'inventory.target_key = $1',
    "inventory.source_id = 'SRC-GDRIVE-001'",
    "inventory.item_type = 'drive_file'",
    "inventory.status = 'succeeded'",
  ]
  const values = [normalizedInventoryTargetKey, normalizedExtractionTargetKey]

  if (shouldForceReprocess) {
    filters.push('(processed.item_key IS NULL OR processed.item_key IS NOT NULL)')
  } else if (normalizedRetrySkippedReasonPrefixes.length) {
    values.push(normalizedRetrySkippedReasonPrefixes)
    filters.push(`(
      processed.item_key IS NULL
      OR (
        processed.status = 'skipped'
        AND EXISTS (
          SELECT 1
          FROM unnest($${values.length}::text[]) AS retry_prefix
          WHERE COALESCE(processed.metadata->>'skipReason', '') LIKE retry_prefix || '%'
        )
      )
    )`)
  } else {
    filters.push('processed.item_key IS NULL')
  }

  if (!includeUnsupported) {
    values.push(supportedMimeTypes)
    filters.push(`inventory.metadata->>'mimeType' = ANY($${values.length}::text[])`)
  }

  if (normalizedParentPathIncludes) {
    values.push(`%${normalizedParentPathIncludes}%`)
    filters.push(`COALESCE(inventory.metadata->>'parentPath', '') ILIKE $${values.length}`)
  }

  if (normalizedNameIncludes) {
    values.push(`%${normalizedNameIncludes}%`)
    filters.push(`COALESCE(inventory.metadata->>'name', '') ILIKE $${values.length}`)
  }

  if (normalizedFileIds.length) {
    values.push(normalizedFileIds)
    filters.push(`inventory.metadata->>'driveFileId' = ANY($${values.length}::text[])`)
  }

  values.push(normalizedLimit)

  const result = await pool.query(
    `
      SELECT inventory.item_key, inventory.target_key, inventory.source_id,
             inventory.external_id, inventory.item_type, inventory.status,
             inventory.fingerprint, inventory.lease_owner, inventory.lease_expires_at,
             inventory.attempt_count, inventory.last_error, inventory.artifact_id,
             inventory.metadata, inventory.discovered_at, inventory.processed_at,
             inventory.updated_at
      FROM source_crawl_items inventory
      LEFT JOIN source_crawl_items processed
        ON processed.target_key = $2
       AND processed.external_id = inventory.external_id
       AND processed.status IN ('succeeded', 'skipped')
      WHERE ${filters.join(' AND ')}
      ORDER BY
        CASE inventory.metadata->>'valueRoute'
          WHEN 'strategy_evidence' THEN 0
          ELSE 1
        END,
        CASE inventory.metadata->>'mimeType'
          WHEN 'application/vnd.google-apps.document' THEN 0
          WHEN 'application/vnd.google-apps.spreadsheet' THEN 1
          WHEN 'application/pdf' THEN 2
          WHEN 'text/plain' THEN 3
          ELSE 9
        END,
        inventory.updated_at ASC
      LIMIT $${values.length}
    `,
    values,
  )

  return result.rows.map(mapSourceCrawlItemRow)
}

export async function listVideoContentExtractionQueue({
  inventoryTargetKey = 'video-link-inventory',
  extractionTargetKey = 'video-content-extract-backfill',
  limit = 5,
} = {}) {
  const normalizedInventoryTargetKey = String(inventoryTargetKey || '').trim()
  const normalizedExtractionTargetKey = String(extractionTargetKey || '').trim()
  const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 5))
  if (!normalizedInventoryTargetKey) throw new Error('inventoryTargetKey is required.')
  if (!normalizedExtractionTargetKey) throw new Error('extractionTargetKey is required.')

  const result = await pool.query(
    `
      SELECT inventory.item_key, inventory.target_key, inventory.source_id, inventory.external_id,
             inventory.item_type, inventory.status, inventory.fingerprint, inventory.lease_owner,
             inventory.lease_expires_at, inventory.attempt_count, inventory.last_error,
             inventory.artifact_id, inventory.metadata, inventory.discovered_at,
             inventory.processed_at, inventory.updated_at
      FROM source_crawl_items inventory
      LEFT JOIN source_crawl_items extraction
        ON extraction.target_key = $2
       AND extraction.external_id = inventory.external_id
       AND extraction.status IN ('succeeded', 'skipped')
      WHERE inventory.target_key = $1
        AND inventory.source_id = 'SRC-VIDEO-001'
        AND inventory.item_type = 'video_link'
        AND inventory.status = 'succeeded'
        AND extraction.item_key IS NULL
      ORDER BY
        CASE
          WHEN inventory.metadata->>'sourceKind' IN ('steve_manual_priority', 'manual_steve_priority')
          THEN -1
          WHEN inventory.metadata->>'platform' = 'youtube'
            AND (
              inventory.external_id ILIKE '%youtu.be/%'
              OR inventory.external_id ILIKE '%youtube.com/watch%'
              OR inventory.external_id ILIKE '%youtube.com/shorts/%'
            )
          THEN 0
          WHEN inventory.metadata->>'platform' = 'youtube' THEN 1
          WHEN inventory.metadata->>'platform' = 'google_drive' THEN 2
          WHEN inventory.metadata->>'platform' = 'loom' THEN 3
          ELSE 4
        END,
        inventory.updated_at ASC
      LIMIT $3
    `,
    [normalizedInventoryTargetKey, normalizedExtractionTargetKey, normalizedLimit],
  )

  return result.rows.map(mapSourceCrawlItemRow)
}

export async function getSharedCommunicationSourceStats(sourceId) {
  const normalizedSourceId = String(sourceId || '').trim()
  if (!normalizedSourceId) throw new Error('sourceId is required.')

  const result = await pool.query(
    `
      SELECT
        COUNT(*)::integer AS artifacts,
        MAX(artifact_updated_at) AS latest_artifact_updated_at,
        MAX(ingested_at) AS latest_ingested_at
      FROM shared_communication_artifacts
      WHERE source_id = $1
    `,
    [normalizedSourceId]
  )

  const row = result.rows[0] || {}
  return {
    sourceId: normalizedSourceId,
    artifacts: Number(row.artifacts || 0),
    latestArtifactUpdatedAt: row.latest_artifact_updated_at?.toISOString?.() || row.latest_artifact_updated_at || null,
    latestIngestedAt: row.latest_ingested_at?.toISOString?.() || row.latest_ingested_at || null,
  }
}

export async function getSharedCommunicationExistingExternalIds({ sourceId, artifactType, externalIds = [] } = {}) {
  const normalizedSourceId = String(sourceId || '').trim()
  const normalizedArtifactType = String(artifactType || '').trim()
  const normalizedExternalIds = [...new Set(
    (externalIds || [])
      .map(value => String(value || '').trim())
      .filter(Boolean)
  )]

  if (!normalizedSourceId) throw new Error('sourceId is required.')
  if (!normalizedArtifactType) throw new Error('artifactType is required.')
  if (!normalizedExternalIds.length) return new Set()

  const result = await pool.query(
    `
      SELECT external_id
      FROM shared_communication_artifacts
      WHERE source_id = $1
        AND artifact_type = $2
        AND external_id = ANY($3::text[])
    `,
    [normalizedSourceId, normalizedArtifactType, normalizedExternalIds]
  )

  return new Set(result.rows.map(row => row.external_id).filter(Boolean))
}

export async function getSharedCommunicationExistingArtifactsByExternalId({ sourceId, artifactType, externalIds = [] } = {}) {
  const normalizedSourceId = String(sourceId || '').trim()
  const normalizedArtifactType = String(artifactType || '').trim()
  const normalizedExternalIds = [...new Set(
    (externalIds || [])
      .map(value => String(value || '').trim())
      .filter(Boolean)
  )]

  if (!normalizedSourceId) throw new Error('sourceId is required.')
  if (!normalizedArtifactType) throw new Error('artifactType is required.')
  if (!normalizedExternalIds.length) return new Map()

  const result = await pool.query(
    `
      SELECT external_id, artifact_updated_at, ingested_at, content_hash
      FROM shared_communication_artifacts
      WHERE source_id = $1
        AND artifact_type = $2
        AND external_id = ANY($3::text[])
    `,
    [normalizedSourceId, normalizedArtifactType, normalizedExternalIds]
  )

  return new Map(result.rows.map(row => [
    row.external_id,
    {
      externalId: row.external_id,
      artifactUpdatedAt: row.artifact_updated_at?.toISOString?.() || row.artifact_updated_at || null,
      ingestedAt: row.ingested_at?.toISOString?.() || row.ingested_at || null,
      contentHash: row.content_hash || null,
    },
  ]))
}

export async function getExtractionControlSnapshot({ limit = 50 } = {}) {
  const normalizedLimit = Math.min(200, Math.max(1, Number(limit) || 50))
  const [targetsResult, itemsResult, runsResult, staleActiveRunsResult, recentStaleReapedRunsResult] = await Promise.all([
    pool.query(`
      SELECT target_key, source_id, title, lane, target_type, status,
             priority, runtime_mode, cursor_state, budget, dedupe_policy,
             lease_owner, lease_expires_at, last_run_at, next_run_at,
             last_status, last_error, inspected_count, archived_count,
             extracted_count, metadata, notes, updated_by, created_at, updated_at
      FROM source_crawl_targets
      ORDER BY CASE priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 ELSE 3 END,
               lane ASC,
               target_key ASC
      LIMIT $1
    `, [normalizedLimit]),
    pool.query(`
      SELECT item_key, target_key, source_id, external_id, item_type, status,
             fingerprint, lease_owner, lease_expires_at, attempt_count,
             last_error, artifact_id, metadata, discovered_at, processed_at,
             updated_at
      FROM source_crawl_items
      ORDER BY updated_at DESC
      LIMIT $1
    `, [normalizedLimit]),
    pool.query(`
      SELECT run_id, target_key, source_id, status, lease_owner, lease_expires_at,
             started_at, finished_at, next_run_at, last_error, inspected_delta,
             archived_delta, extracted_delta, metadata, created_at, updated_at
      FROM source_crawl_target_runs
      ORDER BY started_at DESC
      LIMIT $1
    `, [normalizedLimit]),
    pool.query(`
      SELECT run_id, target_key, source_id, status, lease_owner, lease_expires_at,
             started_at, finished_at, next_run_at, last_error, inspected_delta,
             archived_delta, extracted_delta, metadata, created_at, updated_at
      FROM source_crawl_target_runs
      WHERE status = 'running'
        AND (
          (lease_expires_at IS NOT NULL AND lease_expires_at < NOW())
          OR started_at < NOW() - ($1::int * INTERVAL '1 minute')
        )
      ORDER BY started_at ASC
      LIMIT $2
    `, [SOURCE_CRAWL_STALE_RUN_MINUTES, normalizedLimit]),
    pool.query(`
      SELECT run_id, target_key, source_id, status, lease_owner, lease_expires_at,
             started_at, finished_at, next_run_at, last_error, inspected_delta,
             archived_delta, extracted_delta, metadata, created_at, updated_at
      FROM source_crawl_target_runs
      WHERE status = 'failed'
        AND metadata ? 'staleReapedAt'
      ORDER BY updated_at DESC
      LIMIT $1
    `, [Math.min(20, normalizedLimit)]),
  ])

  const foundationJobSchedules = await getFoundationJobScheduleIndex()
  const scheduledTargets = targetsResult.rows
    .map(mapSourceCrawlTargetRow)
    .map(target => attachSourceCrawlTargetSchedule(target, foundationJobSchedules))
  const itemSummaries = await getSourceCrawlTargetItemSummaries(
    scheduledTargets.map(target => target.targetKey)
  )
  const targets = scheduledTargets.map(target => {
    const itemSummary = itemSummaries.get(target.targetKey) || createEmptySourceCrawlItemSummary(target.targetKey)
    const targetWithItems = {
      ...target,
      itemSummary,
    }

    return {
      ...targetWithItems,
      healthFindings: buildSourceCrawlTargetHealthFindings(targetWithItems),
    }
  })
  const runCoverage = await getSourceCrawlTargetRunCoverage(
    targets.map(target => target.targetKey)
  )
  const coverageByTarget = targets.map(target =>
    buildSourceCrawlTargetCoverage(target, runCoverage.get(target.targetKey))
  )
  const recentItems = itemsResult.rows.map(mapSourceCrawlItemRow)
  const recentRuns = runsResult.rows
    .map(mapSourceCrawlTargetRunRow)
    .map(run => attachSourceCrawlRunStaleState(run, SOURCE_CRAWL_STALE_RUN_MINUTES))
  const staleActiveRuns = staleActiveRunsResult.rows
    .map(mapSourceCrawlTargetRunRow)
    .map(run => attachSourceCrawlRunStaleState(run, SOURCE_CRAWL_STALE_RUN_MINUTES))
  const recentStaleReapedRuns = recentStaleReapedRunsResult.rows.map(mapSourceCrawlTargetRunRow)

  return {
    generatedAt: new Date().toISOString(),
    targets,
    coverageByTarget,
    recentItems,
    recentRuns,
    staleActiveRuns,
    recentStaleReapedRuns,
    summary: {
      targetCount: targets.length,
      activeTargets: targets.filter(item => item.status === 'active').length,
      pausedTargets: targets.filter(item => item.status === 'paused' || item.runtimeMode === 'paused').length,
      scheduledTargets: targets.filter(item => item.scheduler?.runtimeMode === 'scheduled').length,
      dueTargets: targets.filter(item => item.scheduler?.due).length,
      currentDayTargets: targets.filter(item => item.lane === 'current_day').length,
      backfillTargets: targets.filter(item => item.lane === 'backfill').length,
      corpusMiningTargets: targets.filter(item => item.lane === 'corpus_mining').length,
      recoveryTargets: targets.filter(item => item.lane === 'recovery').length,
      blockedTargets: targets.filter(item => item.status === 'blocked').length,
      recentItemFailures: recentItems.filter(item => item.status === 'failed').length,
      recentRuns: recentRuns.length,
      runningRuns: recentRuns.filter(item => item.status === 'running').length,
      staleActiveRuns: staleActiveRuns.length,
      recentStaleReapedRuns: recentStaleReapedRuns.length,
      staleRunThresholdMinutes: SOURCE_CRAWL_STALE_RUN_MINUTES,
      recentRunFailures: recentRuns.filter(item => item.status === 'failed' || item.status === 'partial').length,
      targetsWithFindings: targets.filter(item => item.healthFindings.length).length,
      targetRiskFindings: targets.reduce((sum, item) => (
        sum + item.healthFindings.filter(finding => finding.severity === 'risk').length
      ), 0),
      targetWarningFindings: targets.reduce((sum, item) => (
        sum + item.healthFindings.filter(finding => finding.severity === 'warning').length
      ), 0),
      targetsWithFailedItems: targets.filter(item => item.itemSummary.failedItems > 0).length,
      targetsWithSkippedItems: targets.filter(item => item.itemSummary.skippedItems > 0).length,
      coverageTargets: coverageByTarget.length,
      coverageTargetsWithLastSuccess: coverageByTarget.filter(item => item.lastSuccessAt).length,
      coverageTargetsWithLastFailure: coverageByTarget.filter(item => item.lastFailureAt).length,
      coverageTargetsWithRemainingBacklog: coverageByTarget.filter(item => item.remainingBacklogIndicators.length).length,
    },
  }
}

export async function getDriveCorpusInventorySnapshot({ limit = 20, targetKey = 'drive-corpus-backfill' } = {}) {
  const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 20))
  const normalizedTargetKey = String(targetKey || 'drive-corpus-backfill').trim()
  const [targetResult, summaryResult, valueRouteResult, extractionStatusResult, recentResult] = await Promise.all([
    pool.query(`
      SELECT target_key, source_id, title, lane, target_type, status,
             priority, runtime_mode, cursor_state, budget, dedupe_policy,
             lease_owner, lease_expires_at, last_run_at, next_run_at,
             last_status, last_error, inspected_count, archived_count,
             extracted_count, metadata, notes, updated_by, created_at, updated_at
      FROM source_crawl_targets
      WHERE target_key = $1
      LIMIT 1
    `, [normalizedTargetKey]),
    pool.query(`
      SELECT
        COUNT(*)::integer AS total_items,
        COUNT(*) FILTER (WHERE item_type = 'drive_folder')::integer AS folders,
        COUNT(*) FILTER (WHERE item_type = 'drive_file')::integer AS files,
        COUNT(*) FILTER (WHERE status = 'failed')::integer AS failed_items,
        COUNT(*) FILTER (WHERE metadata->>'extractionStatus' LIKE 'pending%')::integer AS pending_extraction
      FROM source_crawl_items
      WHERE target_key = $1
    `, [normalizedTargetKey]),
    pool.query(`
      SELECT COALESCE(NULLIF(metadata->>'valueRoute', ''), 'unknown') AS value_route,
             COUNT(*)::integer AS item_count
      FROM source_crawl_items
      WHERE target_key = $1
      GROUP BY value_route
      ORDER BY item_count DESC, value_route ASC
      LIMIT 12
    `, [normalizedTargetKey]),
    pool.query(`
      SELECT COALESCE(NULLIF(metadata->>'extractionStatus', ''), 'unknown') AS extraction_status,
             COUNT(*)::integer AS item_count
      FROM source_crawl_items
      WHERE target_key = $1
      GROUP BY extraction_status
      ORDER BY item_count DESC, extraction_status ASC
      LIMIT 12
    `, [normalizedTargetKey]),
    pool.query(`
      SELECT item_key, target_key, source_id, external_id, item_type, status,
             fingerprint, lease_owner, lease_expires_at, attempt_count,
             last_error, artifact_id, metadata, discovered_at, processed_at,
             updated_at
      FROM source_crawl_items
      WHERE target_key = $1
      ORDER BY updated_at DESC
      LIMIT $2
    `, [normalizedTargetKey, normalizedLimit]),
  ])

  const target = targetResult.rows[0] ? mapSourceCrawlTargetRow(targetResult.rows[0]) : null
  const summaryRow = summaryResult.rows[0] || {}
  return {
    generatedAt: new Date().toISOString(),
    target,
    summary: {
      targetKey: normalizedTargetKey,
      totalItems: Number(summaryRow.total_items || 0),
      folders: Number(summaryRow.folders || 0),
      files: Number(summaryRow.files || 0),
      failedItems: Number(summaryRow.failed_items || 0),
      pendingExtraction: Number(summaryRow.pending_extraction || 0),
      inspectedFolders: Number(target?.cursorState?.driveInventory?.inspectedFolderCount || 0),
      queuedFolders: Number(target?.cursorState?.driveInventory?.queuedFolderCount || 0),
    },
    valueRoutes: valueRouteResult.rows.map(row => ({
      valueRoute: row.value_route,
      itemCount: Number(row.item_count || 0),
    })),
    extractionStatuses: extractionStatusResult.rows.map(row => ({
      extractionStatus: row.extraction_status,
      itemCount: Number(row.item_count || 0),
    })),
    recentItems: recentResult.rows.map(mapSourceCrawlItemRow),
  }
}

function buildFoundationSurfaceFreshnessSweep({
  backlogItems = [],
  extractionControl = {},
  backlogSeedDrift = {},
  dbConstraintAudit = {},
} = {}) {
  const sourceIds = new Set(getSourceContracts().map(source => source.sourceId || source.id).filter(Boolean))
  const backlogIds = new Set((backlogItems || []).map(item => item.id).filter(Boolean))
  const staleActiveRuns = Array.isArray(extractionControl.staleActiveRuns)
    ? extractionControl.staleActiveRuns
    : []
  const recentStaleReapedRuns = Array.isArray(extractionControl.recentStaleReapedRuns)
    ? extractionControl.recentStaleReapedRuns
    : []

  const surfaces = getFoundationSurfaceMap().map(surface => {
    const findings = []
    const missingSourceIds = (surface.sourceIds || []).filter(sourceId => !sourceIds.has(sourceId))
    const missingBacklogIds = (surface.backlogIds || []).filter(backlogId => !backlogIds.has(backlogId))

    if (missingSourceIds.length) {
      findings.push({
        severity: 'risk',
        type: 'missing_source_contract',
        detail: `Missing source contract IDs: ${missingSourceIds.join(', ')}`,
      })
    }

    if (missingBacklogIds.length) {
      findings.push({
        severity: 'risk',
        type: 'missing_backlog_owner',
        detail: `Missing backlog owner IDs: ${missingBacklogIds.join(', ')}`,
      })
    }

    if (surface.section === 'system-health') {
      staleActiveRuns.forEach(run => {
        findings.push({
          severity: 'risk',
          type: 'stale_source_crawl_run',
          detail: `${run.targetKey} run ${run.runId} is still ${run.status} after ${run.staleState?.ageMinutes ?? 'unknown'} minutes.`,
          targetKey: run.targetKey,
          runId: run.runId,
        })
      })
      recentStaleReapedRuns.slice(0, 5).forEach(run => {
        findings.push({
          severity: 'warning',
          type: 'stale_source_crawl_run_reaped',
          detail: `${run.targetKey} run ${run.runId} was marked failed by the stale source-crawl run reaper.`,
          targetKey: run.targetKey,
          runId: run.runId,
        })
      })
    }

    if (surface.section === 'backlog' && Number(backlogSeedDrift?.totalMismatchCount || 0) > 0) {
      findings.push({
        severity: 'warning',
        type: 'seed_live_drift',
        detail: `${backlogSeedDrift.totalMismatchCount} seed/live backlog mismatches are visible in the drift report.`,
      })
    }

    if (surface.section === 'source-overview' && Number(dbConstraintAudit?.invalidSourceReferenceCount || 0) > 0) {
      findings.push({
        severity: 'risk',
        type: 'invalid_source_reference',
        detail: `${dbConstraintAudit.invalidSourceReferenceCount} invalid source references exist in DB-backed records.`,
      })
    }

    const status = findings.some(finding => finding.severity === 'risk')
      ? 'risk'
      : findings.length
        ? 'warning'
        : 'live'

    return {
      ...surface,
      status,
      findings,
      missingSourceIds,
      missingBacklogIds,
      backingCounts: {
        apis: surface.backingApis.length,
        docs: surface.backingDocs.length,
        tables: surface.backingTables.length,
        sourceIds: surface.sourceIds.length,
        backlogIds: surface.backlogIds.length,
      },
    }
  })

  const findings = surfaces.flatMap(surface =>
    surface.findings.map(finding => ({
      surfaceSection: surface.section,
      surfaceLabel: surface.label,
      owner: surface.owner,
      ...finding,
    }))
  )

  return {
    generatedAt: new Date().toISOString(),
    surfaces,
    findings,
    summary: {
      mappedSurfaceCount: surfaces.length,
      surfacesWithFindings: surfaces.filter(surface => surface.findings.length).length,
      riskSurfaces: surfaces.filter(surface => surface.status === 'risk').length,
      warningSurfaces: surfaces.filter(surface => surface.status === 'warning').length,
      staleActiveRunCount: staleActiveRuns.length,
      recentStaleReapedRunCount: recentStaleReapedRuns.length,
      missingSourceBindingCount: surfaces.reduce((sum, surface) => sum + surface.missingSourceIds.length, 0),
      missingBacklogBindingCount: surfaces.reduce((sum, surface) => sum + surface.missingBacklogIds.length, 0),
    },
  }
}

export async function getFoundationSnapshot() {
  const sharedCommunicationsArchive = await getSharedCommunicationArchiveSnapshot({ limit: 10 })
  const sharedCommunicationsCoverage = await getSharedCommunicationCoverageSnapshot()
  const sharedCommunicationCandidates = await getSharedCommunicationCandidateSnapshot({
    status: 'pending',
    limit: 10,
    includeItems: false,
  })
  const sharedCommunicationSynthesis = await getSharedCommunicationSynthesisSnapshot({
    limit: 3,
    itemLimit: 12,
  })
  const foundationJobs = await getFoundationJobRunSnapshot({ limit: 20 })
  const intelligenceJobs = await getIntelligenceJobLedgerSnapshot({ limit: 20 })
  const intelligenceAtomSpine = await getIntelligenceAtomSpineSnapshot({ limit: 20 })
  const intelligenceRetrieval = await getIntelligenceRetrievalSnapshot({ limit: 20 })
  const intelligenceSynthesisFacts = await getSynthesisFactsSnapshot({ limit: 20 })
  const intelligenceSynthesis = await getSynthesisEngineSnapshot({ limit: 20 })
  const intelligenceActionRouter = await getActionRouterSnapshot({ limit: 20 })
  const llmRuntime = await getLlmRuntimeSnapshot({ limit: 20 })
  const extractionControl = await getExtractionControlSnapshot({ limit: 50 })
  const driveCorpusInventory = await getDriveCorpusInventorySnapshot({ limit: 20 })
  const backlogSeedDrift = await getBacklogSeedDriftSnapshot({ limit: 20 })
  const dbConstraintAudit = await getFoundationDbConstraintAudit({ limit: 20 })
  const [backlogResult, decisionsResult, parkingResult, questionsResult, memoryStatusResult, pendingDocUpdatesResult, recentChangesResult, usersResult] =
    await Promise.all([
      pool.query(`
        SELECT id, title, team, lane, priority, rank, source, summary, why_it_matters AS "whyItMatters",
               next_action AS "nextAction", status_note AS "statusNote", owner, created_at, updated_at
        FROM backlog_items
        ORDER BY CASE team ${backlogScopeOrderSql} ELSE 999 END,
                 rank NULLS LAST,
                 created_at ASC
      `),
      pool.query(`
        SELECT id, category, title, status, summary, rationale, source_ref,
               decision_owner, confirmed_by, participant_names, context_ref, evidence_notes,
               classified_at, classified_by, supersedes_ids, created_at, updated_at
        FROM decisions
        ORDER BY created_at DESC
        LIMIT 200
      `),
      pool.query(`
        SELECT id, title, summary, owner, created_at, updated_at
        FROM parking_lot_items
        ORDER BY created_at ASC
        LIMIT 200
      `),
      pool.query(`
        SELECT id, title, summary, owner, status, resolved_at, resolved_by, resolution_note, created_at, updated_at
        FROM open_questions
        ORDER BY status ASC, created_at ASC
        LIMIT 200
      `),
      pool.query(`
        SELECT component_key AS "componentKey", label, status, detail, updated_at AS "updatedAt"
        FROM memory_system_status
        ORDER BY label ASC
      `),
      pool.query(`
        SELECT p.id, p.decision_id, d.title AS decision_title, d.category AS decision_category, d.status AS decision_status,
               d.source_ref AS decision_source_ref, d.decision_owner AS decision_owner, d.confirmed_by AS decision_confirmed_by,
               d.participant_names AS decision_participant_names, d.context_ref AS decision_context_ref,
               d.evidence_notes AS decision_evidence_notes, d.rationale AS decision_rationale,
               p.target_doc_path, p.target_section, p.summary,
               p.current_text, p.proposed_text, p.proposed_diff, p.status, p.proposed_at, p.proposed_by,
               p.reviewed_at, p.reviewed_by, p.applied_at, p.applied_commit, p.expires_at, p.metadata
        FROM pending_doc_updates p
        LEFT JOIN decisions d ON d.id = p.decision_id
        ORDER BY p.proposed_at DESC
      `),
      pool.query(`
        SELECT id, event_type, entity_table, entity_id, actor, summary, metadata, created_at
        FROM change_events
        ORDER BY created_at DESC
        LIMIT 20
      `),
      pool.query(`
        SELECT email, name, tier, user_type, active, meeting_sync_enabled, metadata, created_at, updated_at
        FROM users
        WHERE active = true
        ORDER BY user_type ASC, name ASC, email ASC
      `),
    ])

  const backlogItems = backlogResult.rows.map(mapBacklogRow)
  const decisions = decisionsResult.rows.map(mapDecisionRow)
  const pendingDocUpdates = pendingDocUpdatesResult.rows.map(mapPendingDocUpdateRow)
  const recentChanges = recentChangesResult.rows.map(mapChangeEventRow)
  const surfaceFreshnessSweep = buildFoundationSurfaceFreshnessSweep({
    backlogItems,
    extractionControl,
    backlogSeedDrift,
    dbConstraintAudit,
  })
  const cardReferenceTrust = await buildCardReferenceTrustStatus({
    declaredCardIds: backlogItems.map(item => item.id),
  })
  const sourceReferenceTrust = await buildSourceReferenceTrustStatus()

  return {
    backlogItems,
    decisions,
    parkingLot: parkingResult.rows,
    openQuestions: questionsResult.rows.map(mapOpenQuestionRow),
    users: usersResult.rows.map(mapFoundationUserRow),
    memoryStatus: memoryStatusResult.rows,
    pendingDocUpdates,
    recentChanges,
    decisionTraceability: buildDecisionTraceabilitySnapshot(decisions, pendingDocUpdates, recentChanges),
    decisionReview: buildDecisionReviewSnapshot(decisions, pendingDocUpdates),
    sharedCommunicationsArchive,
    sharedCommunicationsCoverage,
    sharedCommunicationCandidates,
    sharedCommunicationSynthesis,
    foundationJobs,
    intelligenceJobs,
    intelligenceAtomSpine,
    intelligenceRetrieval,
    intelligenceSynthesisFacts,
    intelligenceSynthesis,
    intelligenceActionRouter,
    llmRuntime,
    extractionControl,
    driveCorpusInventory,
    surfaceFreshnessSweep,
    cardReferenceTrust,
    sourceReferenceTrust,
    backlogSeedDrift,
    dbConstraintAudit,
    meta: {
      canonicalDecisionCategories,
      backlogIdPrefixes: getBacklogIdPrefixes(),
      backlogScopes: getBacklogScopes(),
    },
  }
}

function normalizeDecisionIdList(ids, currentId = null) {
  const seen = new Set()
  return (ids || [])
    .map(value => String(value || '').trim().toUpperCase())
    .filter(value => value && value !== currentId)
    .filter(value => {
      if (seen.has(value)) return false
      seen.add(value)
      return true
    })
}

function normalizeDecisionCategory(value, fallback = null) {
  const normalized = String(value ?? '').trim()
  if (!normalized && fallback) return fallback
  if (!canonicalDecisionCategories.includes(normalized)) {
    throw new Error(`Unsupported decision category: ${normalized || '<blank>'}`)
  }
  return normalized
}

function normalizeStringList(values) {
  const seen = new Set()
  return (Array.isArray(values) ? values : [])
    .map(value => String(value ?? '').trim())
    .filter(Boolean)
    .filter(value => {
      const key = value.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

async function markSupersededDecisions(client, supersedesIds, sourceDecisionId, actor) {
  const normalizedIds = normalizeDecisionIdList(supersedesIds, sourceDecisionId)
  if (!normalizedIds.length) return []

  const existingResult = await client.query(
    `
      SELECT id, status
      FROM decisions
      WHERE id = ANY($1::text[])
    `,
    [normalizedIds]
  )

  const foundIds = new Set(existingResult.rows.map(row => row.id))

  for (const row of existingResult.rows) {
    if (row.status === 'superseded') continue

    await client.query(
      `
        UPDATE decisions
        SET status = 'superseded',
            updated_at = NOW()
        WHERE id = $1
      `,
      [row.id]
    )

    await insertChangeEvent(client, {
      eventType: 'decision_superseded',
      entityTable: 'decisions',
      entityId: row.id,
      actor,
      summary: `Decision ${row.id} superseded by ${sourceDecisionId}`,
      metadata: {
        supersededBy: sourceDecisionId,
      },
    })
  }

  return normalizedIds.filter(id => foundIds.has(id))
}

export function getCanonicalDecisionCategories() {
  return canonicalDecisionCategories.slice()
}

export function getFoundationBacklogIdPrefixes() {
  return getBacklogIdPrefixes()
}

export function getFoundationBacklogScopes() {
  return getBacklogScopes()
}

export async function getRecentChangeEvents(limit = 20) {
  const result = await pool.query(
    `
      SELECT id, event_type, entity_table, entity_id, actor, summary, metadata, created_at
      FROM change_events
      ORDER BY created_at DESC
      LIMIT $1
    `,
    [limit]
  )

  return result.rows.map(mapChangeEventRow)
}

export async function getLatestChangeEventForEntity(entityTable, entityId, eventTypes = []) {
  const table = String(entityTable || '').trim()
  const id = String(entityId || '').trim()
  if (!table || !id) return null

  const normalizedEventTypes = Array.isArray(eventTypes)
    ? eventTypes.map(value => String(value || '').trim()).filter(Boolean)
    : []

  const values = [table, id]
  let where = `
      WHERE entity_table = $1
        AND entity_id = $2
  `

  if (normalizedEventTypes.length) {
    values.push(normalizedEventTypes)
    where += `
        AND event_type = ANY($3)
    `
  }

  const result = await pool.query(
    `
      SELECT id, event_type, entity_table, entity_id, actor, summary, metadata, created_at
      FROM change_events
      ${where}
      ORDER BY created_at DESC
      LIMIT 1
    `,
    values
  )

  return result.rows[0] ? mapChangeEventRow(result.rows[0]) : null
}

export async function getSharedCommunicationArchiveSnapshot({ sourceId, artifactType, limit = 20, includeSensitive = false } = {}) {
  const normalizedLimit = Math.min(1000, Math.max(1, Number(limit) || 20))
  const values = []
  const filters = []

  if (sourceId) {
    values.push(String(sourceId).trim())
    filters.push(`source_id = $${values.length}`)
  }

  if (artifactType) {
    values.push(String(artifactType).trim())
    filters.push(`artifact_type = $${values.length}`)
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''

  const [summaryResult, recentResult] = await Promise.all([
    pool.query(
      `
        SELECT source_id, artifact_type, COUNT(*)::int AS total
        FROM shared_communication_artifacts
        ${whereClause}
        GROUP BY source_id, artifact_type
        ORDER BY source_id ASC, artifact_type ASC
      `,
      values
    ),
    pool.query(
      `
        SELECT artifact_id, source_id, artifact_type, external_id, title,
               source_account, source_container, source_url, participants,
               content_text, content_hash, artifact_created_at, artifact_updated_at,
               metadata, ingested_by, ingested_at, updated_at
        FROM shared_communication_artifacts
        ${whereClause}
        ORDER BY COALESCE(artifact_updated_at, ingested_at) DESC, ingested_at DESC
        LIMIT $${values.length + 1}
      `,
      [...values, normalizedLimit]
    ),
  ])

  const bySource = {}
  const byType = {}
  let totalArtifacts = 0

  for (const row of summaryResult.rows) {
    const count = Number(row.total || 0)
    totalArtifacts += count
    bySource[row.source_id] = (bySource[row.source_id] || 0) + count
    byType[row.artifact_type] = (byType[row.artifact_type] || 0) + count
  }

  return {
    totalArtifacts,
    bySource,
    byType,
    items: recentResult.rows.map(row => mapSharedCommunicationArtifactRow(row, { includeSensitive })),
  }
}

const artifactContextStopWords = new Set([
  'the',
  'and',
  'for',
  'you',
  'your',
  'that',
  'this',
  'with',
  'what',
  'did',
  'his',
  'her',
  'was',
  'were',
  'say',
  'he',
  'she',
  'when',
  'where',
  'said',
  'says',
  'from',
  'have',
  'about',
  'into',
  'they',
  'them',
  'being',
  'pre',
  'prestrat',
  'strat',
  'strategy',
  'strategic',
  'start',
  'stop',
  'doc',
])

const artifactContextNameTerms = new Set([
  'steve',
  'scott',
  'ryan',
  'carson',
  'georgia',
  'nick',
  'clare',
  'ahsan',
  'blake',
  'tanner',
])

function getArtifactContextTerms(query) {
  const terms = Array.from(new Set(String(query || '')
    .toLowerCase()
    .match(/[a-z0-9]+/g) || []))
    .filter(term => term.length >= 3 && !artifactContextStopWords.has(term))
    .slice(0, 10)

  const expanded = [...terms]
  if (terms.includes('angry')) expanded.push('hate', 'upset', 'frustrat', 'mad')
  return Array.from(new Set(expanded)).slice(0, 14)
}

function buildArtifactContextExcerpt(contentText, terms, excerptChars) {
  const content = String(contentText || '')
  if (!content) return ''
  const lowerContent = content.toLowerCase()
  const focusTerms = terms.filter(term => !artifactContextNameTerms.has(term))
  const searchTerms = focusTerms.length ? focusTerms : terms
  const firstMatch = searchTerms
    .map(term => lowerContent.indexOf(term.toLowerCase()))
    .filter(index => index >= 0)
    .sort((left, right) => left - right)[0]
  const normalizedExcerptChars = Math.min(6000, Math.max(600, Number(excerptChars) || 1800))
  const start = firstMatch >= 0
    ? Math.max(0, firstMatch - Math.floor(normalizedExcerptChars / 3))
    : 0
  const excerpt = content.slice(start, start + normalizedExcerptChars).trim()
  return `${start > 0 ? '...' : ''}${excerpt}${start + normalizedExcerptChars < content.length ? '...' : ''}`
}

export async function searchSharedCommunicationArtifactsForContext({
  query = '',
  sourceIds = [],
  artifactTypes = [],
  limit = 12,
  excerptChars = 1800,
} = {}) {
  const terms = getArtifactContextTerms(query)
  const normalizedSourceIds = Array.isArray(sourceIds)
    ? sourceIds.map(sourceId => String(sourceId || '').trim()).filter(Boolean)
    : []
  const normalizedArtifactTypes = Array.isArray(artifactTypes)
    ? artifactTypes.map(artifactType => String(artifactType || '').trim()).filter(Boolean)
    : []
  const normalizedLimit = Math.min(30, Math.max(1, Number(limit) || 12))

  const filters = []
  const values = []

  if (normalizedSourceIds.length) {
    values.push(normalizedSourceIds)
    filters.push(`source_id = ANY($${values.length}::text[])`)
  }

  if (normalizedArtifactTypes.length) {
    values.push(normalizedArtifactTypes)
    filters.push(`artifact_type = ANY($${values.length}::text[])`)
  }

  if (terms.length) {
    const termFilters = []
    for (const term of terms) {
      values.push(`%${term}%`)
      termFilters.push(`(title ILIKE $${values.length} OR content_text ILIKE $${values.length})`)
    }
    filters.push(`(${termFilters.join(' OR ')})`)
  }

  values.push(Math.min(500, Math.max(normalizedLimit * 20, 100)))
  const result = await pool.query(
    `
      SELECT artifact_id, source_id, artifact_type, external_id, title,
             source_account, source_container, source_url, participants,
             content_text, content_hash, artifact_created_at, artifact_updated_at,
             metadata, ingested_by, ingested_at, updated_at
      FROM shared_communication_artifacts
      ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
      ORDER BY COALESCE(artifact_updated_at, ingested_at) DESC, ingested_at DESC
      LIMIT $${values.length}
    `,
    values,
  )

  return result.rows
    .map(row => {
      const contentText = row.content_text || ''
      const lowerTitle = String(row.title || '').toLowerCase()
      const lowerContent = contentText.toLowerCase()
      const matchedTerms = terms.filter(term => lowerTitle.includes(term) || lowerContent.includes(term))
      const titleHits = terms.filter(term => lowerTitle.includes(term)).length
      const contentHits = terms.filter(term => lowerContent.includes(term)).length
      return {
        artifactId: row.artifact_id,
        sourceId: row.source_id,
        artifactType: row.artifact_type,
        title: row.title || '',
        sourceAccount: row.source_account || '',
        sourceContainer: row.source_container || '',
        sourceUrl: row.source_url || '',
        contentLength: contentText.length,
        artifactUpdatedAt: row.artifact_updated_at || null,
        ingestedAt: row.ingested_at || null,
        matchedTerms,
        relevanceScore: titleHits * 12 + contentHits,
        excerpt: buildArtifactContextExcerpt(contentText, matchedTerms.length ? matchedTerms : terms, excerptChars),
        metadata: row.metadata || {},
      }
    })
    .filter(item => item.excerpt)
    .sort((left, right) => {
      if (right.relevanceScore !== left.relevanceScore) return right.relevanceScore - left.relevanceScore
      return String(right.ingestedAt || '').localeCompare(String(left.ingestedAt || ''))
    })
    .slice(0, normalizedLimit)
}

const strategyPreworkExpectedParticipants = [
  { key: 'steve', name: 'Steve Zahnd', aliases: ['steve zahnd', 'steve'] },
  { key: 'scott', name: 'Scott Benson', aliases: ['scott benson', 'scott'] },
  { key: 'ryan', name: 'Ryan Campbell', aliases: ['ryan campbell', 'ryan'] },
  { key: 'carson', name: 'Carson', aliases: ['carson'] },
  { key: 'georgia', name: 'Georgia Huntley', aliases: ['georgia huntley', 'georgia'] },
  { key: 'nick', name: 'Nick Bergmann', aliases: ['nick bergmann', 'nick'] },
  { key: 'clare', name: 'Clare', aliases: ['clare'] },
  { key: 'ahsan', name: 'Ahsan', aliases: ['ahsan abdul sattar', 'ahsan'] },
  { key: 'blake', name: 'Blake Berfelz', aliases: ['blake berfelz', 'blake'] },
]

function inferStrategyPreworkParticipant(row) {
  const title = String(row.title || '').toLowerCase()
  if (title.includes('template')) return ''

  for (const participant of strategyPreworkExpectedParticipants) {
    if (participant.aliases.some(alias => title.includes(alias))) return participant.key
  }

  const contentLead = String(row.content_text || '').slice(0, 4000).toLowerCase()
  for (const participant of strategyPreworkExpectedParticipants) {
    const namePatterns = participant.aliases.flatMap(alias => [
      `name: ${alias}`,
      `name:${alias}`,
      `from: ${alias}`,
    ])
    if (namePatterns.some(pattern => contentLead.includes(pattern))) return participant.key
  }

  return ''
}

function isStrategyPreworkCurrent(row) {
  const title = String(row.title || '').toLowerCase()
  const contentLead = String(row.content_text || '').slice(0, 5000).toLowerCase()
  const parentPath = String(row.metadata?.parentPath || row.metadata?.parentFolderName || '').toLowerCase()
  return (
    title.includes('q2') ||
    title.includes('april 2026') ||
    title.includes('strategy bensoncrew april') ||
    title.includes('steve zahnd - q2') ||
    parentPath.includes('q2') ||
    parentPath.includes('may-july') ||
    contentLead.includes('quarter: q2') ||
    contentLead.includes('quarter:q2') ||
    contentLead.includes('q2 2026') ||
    contentLead.includes('april 24, 2026') ||
    contentLead.includes('apr 24 2026') ||
    contentLead.includes('april 24, 26') ||
    contentLead.includes('april 23')
  )
}

function getStrategyPreworkReadMethod(row) {
  const metadata = row.metadata || {}
  const method = String(metadata.extractionMethod || '')
  if (method === 'manual_visual_review_v1') return 'manual_visual_review'
  if (metadata.pdfFormFieldsUsed === true || metadata.pdfFormFieldsUsed === 'true') return 'pdf_form_fields'
  if (method.includes('ocr')) return 'rough_ocr'
  if (method.includes('google_doc')) return 'google_doc_text'
  if (method.includes('blob_text')) return 'text_file'
  if (method.includes('pdftotext')) return 'pdf_text'
  return method || 'text_artifact'
}

function getStrategyPreworkExcerpt(row) {
  const content = String(row.content_text || '')
  if (!content) return ''
  const lowerContent = content.toLowerCase()
  const focusTerms = [
    '--- pdf form fields ---',
    'what do you think our company should start',
    'activity 1',
    'i learned',
    'strengths',
    'weaknesses',
    'opportunities',
    'threats',
    'priority',
    'quarterly theme',
  ]
  const firstMatch = focusTerms
    .map(term => lowerContent.indexOf(term))
    .filter(index => index >= 0)
    .sort((left, right) => left - right)[0]
  const start = firstMatch >= 0 ? Math.max(0, firstMatch - 80) : 0
  return `${start > 0 ? '...' : ''}${content.slice(start, start + 900).trim()}${start + 900 < content.length ? '...' : ''}`
}

function mapStrategyPreworkArtifact(row) {
  return {
    artifactId: row.artifact_id,
    sourceId: row.source_id,
    artifactType: row.artifact_type,
    title: row.title || '',
    sourceUrl: row.source_url || '',
    contentLength: Number(row.content_length || 0),
    participantKey: inferStrategyPreworkParticipant(row),
    currentCycle: isStrategyPreworkCurrent(row),
    readMethod: getStrategyPreworkReadMethod(row),
    extractionMethod: row.metadata?.extractionMethod || '',
    pdfFormFieldsUsed: row.metadata?.pdfFormFieldsUsed === true || row.metadata?.pdfFormFieldsUsed === 'true',
    artifactUpdatedAt: row.artifact_updated_at || null,
    ingestedAt: row.ingested_at || null,
    excerpt: getStrategyPreworkExcerpt(row),
    metadata: {
      parentPath: row.metadata?.parentPath || '',
      driveFileId: row.metadata?.driveFileId || '',
      valueRoute: row.metadata?.valueRoute || '',
    },
  }
}

function summarizeStrategyPreworkParticipant(participant, artifacts) {
  const participantArtifacts = artifacts
    .filter(artifact => artifact.participantKey === participant.key)
    .sort((left, right) => {
      const leftCurrent = left.currentCycle ? 1 : 0
      const rightCurrent = right.currentCycle ? 1 : 0
      if (rightCurrent !== leftCurrent) return rightCurrent - leftCurrent
      return String(right.ingestedAt || '').localeCompare(String(left.ingestedAt || ''))
    })

  const currentArtifacts = participantArtifacts.filter(artifact => artifact.currentCycle)
  const usableArtifacts = currentArtifacts.length ? currentArtifacts : participantArtifacts
  const hasManualVisualReview = usableArtifacts.some(artifact => artifact.readMethod === 'manual_visual_review')
  const hasFormFields = usableArtifacts.some(artifact => artifact.pdfFormFieldsUsed)
  const hasRoughOcrOnly = usableArtifacts.length > 0 && usableArtifacts.every(artifact => artifact.readMethod === 'rough_ocr')
  const contentLength = usableArtifacts.reduce((sum, artifact) => sum + Number(artifact.contentLength || 0), 0)
  const primaryArtifact = usableArtifacts[0] || null

  let status = 'missing'
  let statusLabel = 'Missing'
  let gap = 'No current pre-strat artifact found in extracted Drive strategy evidence.'

  if (usableArtifacts.length) {
    status = 'read'
    statusLabel = 'Read'
    gap = ''
    if (hasManualVisualReview) statusLabel = 'Read - visual review'
    else if (hasFormFields) statusLabel = 'Read - form fields'
    else if (hasRoughOcrOnly) {
      status = 'needs_visual_review'
      statusLabel = 'Rough OCR'
      gap = 'Readable enough for search, but handwritten/scanned evidence still needs vision-grade review before exact quotes are trusted.'
    }
  }

  return {
    key: participant.key,
    name: participant.name,
    status,
    statusLabel,
    gap,
    artifactCount: usableArtifacts.length,
    totalArtifactCount: participantArtifacts.length,
    contentLength,
    primaryArtifact,
    artifacts: usableArtifacts.slice(0, 4),
  }
}

export async function getStrategyPreworkCoverageSnapshot() {
  const result = await pool.query(
    `
      SELECT artifact_id, source_id, artifact_type, title, source_url,
             LENGTH(content_text)::int AS content_length,
             content_text,
             metadata,
             artifact_updated_at,
             ingested_at,
             updated_at
      FROM shared_communication_artifacts
      WHERE source_id = 'SRC-GDRIVE-001'
        AND title NOT ILIKE '%template%'
        AND (
          title ILIKE '%prestrat%'
          OR title ILIKE '%pre-strat%'
          OR title ILIKE '%pre strat%'
          OR title ILIKE '%nick_strat_doc_q2_2026%'
          OR title ILIKE '%Strategy BensonCrew April%'
          OR title ILIKE '%Steve Zahnd - Q2 2026 Pre-Strat%'
          OR title ILIKE '%Scott Q2 2026 Pre-Strat%'
        )
      ORDER BY COALESCE(artifact_updated_at, ingested_at) DESC, ingested_at DESC
    `,
  )

  const allArtifacts = result.rows.map(mapStrategyPreworkArtifact)
  const artifacts = allArtifacts.filter(artifact => artifact.currentCycle)
  const participants = strategyPreworkExpectedParticipants.map(participant =>
    summarizeStrategyPreworkParticipant(participant, artifacts)
  )
  const unread = participants.filter(participant => participant.status === 'missing')
  const needsVisualReview = participants.filter(participant => participant.status === 'needs_visual_review')
  const read = participants.filter(participant => participant.status !== 'missing')
  const unassignedArtifacts = artifacts
    .filter(artifact => !artifact.participantKey)
    .map(artifact => ({
      artifactId: artifact.artifactId,
      title: artifact.title,
      sourceUrl: artifact.sourceUrl,
      contentLength: artifact.contentLength,
      readMethod: artifact.readMethod,
      artifactUpdatedAt: artifact.artifactUpdatedAt,
      ingestedAt: artifact.ingestedAt,
    }))

  return {
    generatedAt: new Date().toISOString(),
    sourceId: 'SRC-GDRIVE-001',
    scope: 'Q2/current strategy pre-work artifacts extracted from the Drive strategy corpus',
    expectedParticipants: strategyPreworkExpectedParticipants.map(participant => participant.name),
    summary: {
      expectedCount: participants.length,
      readCount: read.length,
      missingCount: unread.length,
      needsVisualReviewCount: needsVisualReview.length,
      artifactCount: artifacts.length,
      totalContentLength: artifacts.reduce((sum, artifact) => sum + artifact.contentLength, 0),
      status: unread.length ? 'missing_artifacts' : needsVisualReview.length ? 'needs_visual_review' : 'read_complete',
    },
    participants,
    unassignedArtifacts,
  }
}

function normalizeStrategyGoalFact(row) {
  return {
    sourceId: row.sourceId || row.source_id || '',
    group: row.groupTitle || row.group_title || '',
    label: row.label || '',
    value: row.value || '',
    detail: row.detail || '',
    asOf: row.asOf || row.as_of || null,
    sortOrder: Number(row.sortOrder || row.sort_order || 0),
  }
}

function findStrategyGoalFact(rows, group, label) {
  return rows.find(row => row.group === group && row.label === label) || null
}

function strategyGoalStatusFromValue(value) {
  const normalized = String(value || '').toLowerCase()
  if (normalized.startsWith('ahead') || normalized.startsWith('above target')) return 'ahead'
  if (normalized.startsWith('behind') || normalized.startsWith('below target')) return 'behind'
  return 'neutral'
}

function buildStrategyGoalGroup({ key, title, rows, labels, rule, caveat }) {
  const facts = labels
    .map(label => findStrategyGoalFact(rows, title, label))
    .filter(Boolean)
  const paceFact =
    facts.find(fact => /pace|gap/i.test(fact.label)) ||
    facts.find(fact => /actual/i.test(fact.label)) ||
    facts[0] ||
    null

  return {
    key,
    title,
    status: strategyGoalStatusFromValue(paceFact?.value),
    statusLabel: paceFact ? `${paceFact.label}: ${paceFact.value}` : 'No live pace row',
    asOf: paceFact?.asOf || facts.find(fact => fact.asOf)?.asOf || null,
    rule,
    caveat,
    facts,
  }
}

export async function getStrategyGoalTruthSnapshot() {
  const [bhagRowsRaw, engineRowsRaw] = await Promise.all([
    getDocSourceSnapshot(BHAG_DOC_PATH),
    getDocSourceSnapshot(AGENT_ENGINE_DOC_PATH),
  ])

  const bhagRows = (bhagRowsRaw || []).map(normalizeStrategyGoalFact)
  const engineRows = (engineRowsRaw || []).map(normalizeStrategyGoalFact)
  const currentRequirementRows = engineRows.filter(row => row.group === 'Current Requirement')

  const groups = [
    buildStrategyGoalGroup({
      key: 'team_volume',
      title: 'Team Goal: $2B',
      rows: bhagRows,
      labels: ['2026', 'Should Be', 'Actual', 'Pace', '2033', '2035'],
      rule: '$2B is the Benson Crew team sales-volume goal. Pace uses Owners Dashboard executed-date Volume Credit against the prorated current-year target.',
      caveat: 'This is team production pace, not the 10,000-agent community count.',
    }),
    buildStrategyGoalGroup({
      key: 'community_agents',
      title: 'Community Goal: 10,000 Agents',
      rows: bhagRows,
      labels: ['2026', 'Should Be', 'Actual', 'Pace', '2035'],
      rule: '10,000 agents is the combined ownership-group agent organization at Real Broker, not Benson Crew team headcount.',
      caveat: 'Do not describe this path as behind if the live Pace row says Ahead. Keep this separate from active productive Benson Crew agent capacity.',
    }),
    {
      key: 'agent_engine_capacity',
      title: 'Agent Engine Capacity',
      status: strategyGoalStatusFromValue(findStrategyGoalFact(currentRequirementRows, 'Current Requirement', 'Gap This Year')?.value),
      statusLabel: findStrategyGoalFact(currentRequirementRows, 'Current Requirement', 'Gap This Year')?.value
        ? `Gap This Year: ${findStrategyGoalFact(currentRequirementRows, 'Current Requirement', 'Gap This Year').value}`
        : 'No live gap row',
      asOf: currentRequirementRows.find(row => row.asOf)?.asOf || null,
      rule: 'Agent Engine capacity is the active productive Benson Crew agent requirement. It is separate from the 10,000-agent Real Broker community path.',
      caveat: 'Use this when discussing team capacity, recruiting pace, active productive agents, production gap, and split assumptions.',
      facts: [
        'Required Agents This Year',
        'Required Start-of-Year Agents',
        'Current Active Agents',
        'Gap This Year',
        'Gap to Next Year',
        'Required Recruiting Pace',
        'Current Recruiting Pace',
        'Current Avg Production / Agent',
        'Production Target / Agent',
        'Production Gap',
        'Actual Split',
        'Target Split',
        'Split Gap',
      ].map(label => findStrategyGoalFact(currentRequirementRows, 'Current Requirement', label)).filter(Boolean),
    },
  ]

  return {
    generatedAt: new Date().toISOString(),
    sourceIds: ['SRC-FREEDOM-BHAG-001', 'SRC-FREEDOM-ENGINE-001', 'SRC-FREEDOM-COMMUNITY-001', 'SRC-OWNERS-001'],
    rule: 'Any Strategy Advisor or packet claim about goal pace, behind/ahead status, $2B, 10,000 agents, recruiting pace, or active-agent capacity must use these live source rows before packet summaries, old docs, or meeting chatter.',
    groups,
  }
}

function sourceContractBrief(sourceId) {
  const source = getSourceContracts().find(item => item.sourceId === sourceId)
  if (!source) return { sourceId }
  return {
    sourceId: source.sourceId,
    title: source.title,
    unitName: source.unitName || '',
    status: source.status,
    validation: source.validation,
    lastVerified: source.lastVerified || null,
    owns: source.owns || '',
    boundaryNote: source.boundaryNote || '',
    validationScope: source.validationScope || '',
  }
}

function findSheetMetric(rows, label) {
  const expected = String(label || '').toLowerCase()
  for (const row of rows || []) {
    const labelIndex = row.findIndex(value => String(value || '').trim().toLowerCase() === expected)
    if (labelIndex === -1) continue
    const value = row.slice(labelIndex + 1).find(cell => String(cell ?? '').trim() !== '')
    return value ?? ''
  }
  return ''
}

function summarizeRightmostNumeric(row) {
  for (let index = (row || []).length - 1; index >= 0; index--) {
    const numeric = parseNumber(row[index])
    if (Number.isFinite(numeric) && numeric !== 0) return numeric
  }
  return null
}

function findWeeklyActualsMetric(rows, label) {
  const expected = String(label || '').toLowerCase()
  const row = (rows || []).find(item => String(item?.[3] || '').trim().toLowerCase() === expected)
  return row ? summarizeRightmostNumeric(row) : null
}

function sourceFact(label, value, detail, sourceId) {
  return {
    label,
    value: value == null || value === '' ? 'Not surfaced' : String(value),
    detail,
    sourceId,
  }
}

function conditionalCollectionFacts(rows) {
  const collectionFacts = (rows || [])
    .filter(row => String(row?.[0] || '').trim().toLowerCase().startsWith('collecting '))
    .slice(0, 4)
    .map(row => sourceFact(
      `${String(row[0]).trim()} Net To Team`,
      formatCompactCurrency(parseNumber(row[1])),
      'Listings and Conditional Deals forecast metric. Cash collection buckets use closing date only. Current month, next month, and following month labels roll forward automatically when the month changes.',
      'SRC-OWNERS-001',
    ))
  const missingClosingDateRow = (rows || []).find(row => String(row?.[0] || '').trim().toLowerCase() === 'net to team missing closing date')
  if (missingClosingDateRow) {
    collectionFacts.push(sourceFact(
      'Net To Team Missing Closing Date',
      formatCompactCurrency(parseNumber(missingClosingDateRow[1])),
      'Conditional Net To Team with no closing date. This is visible as forecast risk but is not counted as collection cash until a closing date exists.',
      'SRC-OWNERS-001',
    ))
  }
  return collectionFacts
}

function cardFromContract(sourceId, facts, currentRead, guardrail) {
  const contract = sourceContractBrief(sourceId)
  return {
    ...contract,
    currentRead,
    guardrail,
    facts,
  }
}

export async function getStrategyOperatingTruthSnapshot() {
  const [
    goalTruth,
    ownersMeta,
    cashflowRowsResponse,
    weeklyRowsResponse,
    conditionalRowsResponse,
    fubSnapshot,
    kpiBacklogResponse,
  ] = await Promise.all([
    getStrategyGoalTruthSnapshot(),
    getDriveFileMetadata('service-account', OWNERS_SHEET_ID),
    getSheetValues('service-account', OWNERS_SHEET_ID, "'Cashflow Dash'!A1:J25"),
    getSheetValues('service-account', OWNERS_SHEET_ID, "'(Input) Weekly Actuals'!A1:BR8"),
    getSheetValues('service-account', OWNERS_SHEET_ID, "'Listings and Conditional Deals'!A1:B12"),
    getFubLeadSourceSnapshot('owner'),
    pool.query(
      `
        SELECT id, title, lane, priority, summary, status_note, updated_at
        FROM backlog_items
        WHERE id = ANY($1::text[])
        ORDER BY id
      `,
      [['KPI-HEALTH-001', 'KPI-APPT-QUALITY-001', 'KPI-LEAD-VALIDATION-001', 'KPI-SHOPPING-001', 'SOURCE-010', 'SOURCE-021']]
    ),
  ])

  const cashflowRows = cashflowRowsResponse.values || []
  const weeklyRows = weeklyRowsResponse.values || []
  const conditionalRows = conditionalRowsResponse.values || []
  const kpiCards = kpiBacklogResponse.rows.map(row => ({
    id: row.id,
    title: row.title,
    lane: row.lane,
    priority: row.priority,
    summary: row.summary || '',
    statusNote: row.status_note || '',
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at || null,
  }))

  const sourceCards = [
    cardFromContract(
      'SRC-FINANCE-001',
      [
        sourceFact('Workbook Modified', ownersMeta?.modifiedTime || null, 'Google Drive modified time for the Owners Dashboard workbook that contains Weekly Actuals and Cashflow Dash.', 'SRC-FINANCE-001'),
        sourceFact('Available Cash', formatCompactCurrency(parseNumber(findSheetMetric(cashflowRows, 'Available Cash (Today)')),), 'Cashflow Dash management view.', 'SRC-FINANCE-001'),
        sourceFact('Expected AR', formatCompactCurrency(parseNumber(findSheetMetric(cashflowRows, 'Expected AR'))), 'Cashflow Dash management view.', 'SRC-FINANCE-001'),
        sourceFact('Uncollected AR', formatCompactCurrency(parseNumber(findSheetMetric(cashflowRows, 'Uncollected AR'))), 'Cashflow Dash management view.', 'SRC-FINANCE-001'),
        sourceFact('Latest Weekly Revenue Cell', formatCompactCurrency(findWeeklyActualsMetric(weeklyRows, 'Total Revenue')), 'Rightmost non-zero value surfaced from the Weekly Actuals Total Revenue row.', 'SRC-FINANCE-001'),
        sourceFact('Latest Weekly Expense Cell', formatCompactCurrency(findWeeklyActualsMetric(weeklyRows, 'Total Expenses')), 'Rightmost non-zero value surfaced from the Weekly Actuals Total Expenses row.', 'SRC-FINANCE-001'),
      ],
      'Finance truth exists and is signed off for current reality. Weekly Actuals is the operating ledger; Cashflow Dash is the management interpretation layer.',
      'Do not recommend "install weekly finance truth" as if the source does not exist. If finance remains strategic, frame the gap as specific freshness, reconciliation, collections, or scenario-proof work and cite the live finance rows or finance backlog.',
    ),
    cardFromContract(
      'SRC-OWNERS-001',
      [
        sourceFact('Workbook Modified', ownersMeta?.modifiedTime || null, 'Google Drive modified time for the Owners Dashboard workbook.', 'SRC-OWNERS-001'),
        sourceFact('Conditional Last Sync', findSheetMetric(conditionalRows, 'Last sync'), 'ClickUp-generated conditional forecast sheet sync timestamp.', 'SRC-OWNERS-001'),
        sourceFact('Active Conditional Tasks', findSheetMetric(conditionalRows, 'Active conditional tasks'), 'Listings and Conditional Deals forecast metric.', 'SRC-OWNERS-001'),
        sourceFact('Conditions Due / Past Due', findSheetMetric(conditionalRows, 'Conditions due / past due'), 'Listings and Conditional Deals forecast metric.', 'SRC-OWNERS-001'),
        ...conditionalCollectionFacts(conditionalRows),
      ],
      'Owners/Admin is the signed-off deal ledger and the conditional forecast sheet is generated from ClickUp for current cash-forecast cleanup.',
      'Use Owners/BHAG rows for production pace and deal truth before relying on meeting discussion about production.',
    ),
    cardFromContract(
      'SRC-FUB-001',
      [
        sourceFact('FUB Snapshot Refreshed', fubSnapshot?.refreshedAt || null, 'Saved owner-context FUB lead-source snapshot refresh time.', 'SRC-FUB-001'),
        sourceFact('Unique FUB Sources', fubSnapshot?.scan?.uniqueSources, 'Unique lead sources observed in the saved owner-context FUB snapshot.', 'SRC-FUB-001'),
        sourceFact('People Scanned', fubSnapshot?.scan?.peopleScanned, 'People scanned in the saved owner-context FUB lead-source snapshot.', 'SRC-FUB-001'),
      ],
      'FUB is readable and governs CRM person/source/stage/tag context for parity and sales/KPI hygiene questions.',
      'Use FUB source rules and KPI/FUB doctrine before praising lead creation or diagnosing source quality from conversation alone.',
    ),
    cardFromContract(
      'SRC-SUPABASE-001',
      [
        sourceFact('Read Rules', 'pipeline, Shopping List, executed deals, goals, competition, usage', 'SOURCE-010 is closed for first-pass KPI read rules.', 'SRC-SUPABASE-001'),
        sourceFact('KPI Audit Cards', kpiCards.map(card => card.id).join(', '), 'Live backlog cards carrying KPI health, appointment, lead-validation, Shopping List, and opportunity-semantics proof.', 'SRC-SUPABASE-001'),
      ],
      'KPI is readable and read rules are locked; current open work is health/freshness/schema drift and quality/audit surfaces, not rediscovering whether KPI exists.',
      'Use KPI read rules and KPI quality cards before making agent production, lead, appointment, Shopping List, or usage claims.',
    ),
  ]

  return {
    generatedAt: new Date().toISOString(),
    rule: 'Strategic gaps must be checked against live source truth before they become recommendations. Shared-comms candidates are leads/evidence, not final operating truth. If a live source says the system already exists or is signed off, reframe the issue as a precise health/freshness/reconciliation/proof gap or suppress it.',
    sourceIds: ['SRC-OWNERS-001', 'SRC-FINANCE-001', 'SRC-FUB-001', 'SRC-SUPABASE-001', 'SRC-FREEDOM-BHAG-001', 'SRC-FREEDOM-ENGINE-001'],
    currentGoalTruth: goalTruth,
    sourceCards,
    kpiCards,
  }
}

export async function getSharedCommunicationCoverageSnapshot() {
  const [
    artifactResult,
    candidateResult,
    candidateArtifactResult,
    processingArtifactResult,
    latestSynthesisResult,
  ] = await Promise.all([
    pool.query(
      `
        SELECT source_id, artifact_type, COUNT(*)::int AS total,
               MIN(artifact_updated_at) AS oldest_artifact_at,
               MAX(artifact_updated_at) AS newest_artifact_at,
               MIN(ingested_at) AS first_ingested_at,
               MAX(ingested_at) AS last_ingested_at
        FROM shared_communication_artifacts
        GROUP BY source_id, artifact_type
        ORDER BY source_id ASC, artifact_type ASC
      `
    ),
    pool.query(
      `
        SELECT source_id, candidate_type, status, COUNT(*)::int AS total
        FROM shared_communication_candidates
        GROUP BY source_id, candidate_type, status
        ORDER BY source_id ASC, candidate_type ASC, status ASC
      `
    ),
    pool.query(
      `
        SELECT artifact.source_id,
               artifact.artifact_type,
               COUNT(DISTINCT artifact.artifact_id)::int AS total_artifacts,
               COUNT(DISTINCT candidate.artifact_id)::int AS artifacts_with_candidates
        FROM shared_communication_artifacts artifact
        LEFT JOIN (
          SELECT DISTINCT artifact_id
          FROM shared_communication_candidates
          WHERE status <> 'rejected'
        ) candidate ON candidate.artifact_id = artifact.artifact_id
        GROUP BY artifact.source_id, artifact.artifact_type
        ORDER BY artifact.source_id ASC, artifact.artifact_type ASC
      `
    ),
    pool.query(
      `
        SELECT artifact.source_id,
               artifact.artifact_type,
               COUNT(DISTINCT processing.artifact_id)::int AS artifacts_processed
        FROM shared_communication_artifacts artifact
        LEFT JOIN shared_communication_artifact_processing_runs processing
          ON processing.artifact_id = artifact.artifact_id
         AND processing.status = 'succeeded'
         AND processing.processing_type = 'candidate_extraction'
         AND COALESCE(processing.artifact_content_hash, '') = COALESCE(artifact.content_hash, '')
        GROUP BY artifact.source_id, artifact.artifact_type
        ORDER BY artifact.source_id ASC, artifact.artifact_type ASC
      `
    ),
    pool.query(
      `
        SELECT run_id, title, candidates_read, generated_at, output_path
        FROM shared_communication_synthesis_runs
        ORDER BY generated_at DESC, created_at DESC
        LIMIT 1
      `
    ),
  ])

  const bySource = {}
  let totalArtifacts = 0
  let totalCandidates = 0

  for (const row of artifactResult.rows) {
    const source = row.source_id
    const total = Number(row.total || 0)
    totalArtifacts += total
    if (!bySource[source]) {
      bySource[source] = {
        sourceId: source,
        totalArtifacts: 0,
        artifactsWithCandidates: 0,
        artifactsWithoutCandidates: 0,
        artifactsProcessed: 0,
        artifactsPendingProcessing: 0,
        processingCoveragePercent: 0,
        extractionCoveragePercent: 0,
        totalCandidates: 0,
        artifactTypes: {},
        candidateTypes: {},
        oldestArtifactAt: null,
        newestArtifactAt: null,
        firstIngestedAt: null,
        lastIngestedAt: null,
      }
    }

    const target = bySource[source]
    target.totalArtifacts += total
    target.artifactTypes[row.artifact_type] = {
      total,
      artifactsWithCandidates: 0,
      artifactsWithoutCandidates: total,
      artifactsProcessed: 0,
      artifactsPendingProcessing: total,
      processingCoveragePercent: 0,
      extractionCoveragePercent: 0,
      oldestArtifactAt: row.oldest_artifact_at ?? null,
      newestArtifactAt: row.newest_artifact_at ?? null,
      firstIngestedAt: row.first_ingested_at ?? null,
      lastIngestedAt: row.last_ingested_at ?? null,
    }

    for (const [field, value] of [
      ['oldestArtifactAt', row.oldest_artifact_at],
      ['newestArtifactAt', row.newest_artifact_at],
      ['firstIngestedAt', row.first_ingested_at],
      ['lastIngestedAt', row.last_ingested_at],
    ]) {
      if (!value) continue
      if (!target[field]) {
        target[field] = value
      } else if (field.startsWith('oldest') || field.startsWith('first')) {
        target[field] = new Date(value) < new Date(target[field]) ? value : target[field]
      } else {
        target[field] = new Date(value) > new Date(target[field]) ? value : target[field]
      }
    }
  }

  for (const row of candidateResult.rows) {
    const source = row.source_id
    const total = Number(row.total || 0)
    totalCandidates += total
    if (!bySource[source]) {
      bySource[source] = {
        sourceId: source,
        totalArtifacts: 0,
        artifactsWithCandidates: 0,
        artifactsWithoutCandidates: 0,
        artifactsProcessed: 0,
        artifactsPendingProcessing: 0,
        processingCoveragePercent: 0,
        extractionCoveragePercent: 0,
        totalCandidates: 0,
        artifactTypes: {},
        candidateTypes: {},
        oldestArtifactAt: null,
        newestArtifactAt: null,
        firstIngestedAt: null,
        lastIngestedAt: null,
      }
    }
    const target = bySource[source]
    target.totalCandidates += total
    const key = `${row.candidate_type}:${row.status}`
    target.candidateTypes[key] = total
  }

  for (const row of candidateArtifactResult.rows) {
    const source = row.source_id
    const totalArtifactsForType = Number(row.total_artifacts || 0)
    const withCandidatesForType = Number(row.artifacts_with_candidates || 0)
    const withoutCandidatesForType = Math.max(0, totalArtifactsForType - withCandidatesForType)
    if (!bySource[source]) {
      bySource[source] = {
        sourceId: source,
        totalArtifacts: totalArtifactsForType,
        artifactsWithCandidates: 0,
        artifactsWithoutCandidates: 0,
        artifactsProcessed: 0,
        artifactsPendingProcessing: 0,
        processingCoveragePercent: 0,
        extractionCoveragePercent: 0,
        totalCandidates: 0,
        artifactTypes: {},
        candidateTypes: {},
        oldestArtifactAt: null,
        newestArtifactAt: null,
        firstIngestedAt: null,
        lastIngestedAt: null,
      }
    }

    const target = bySource[source]
    target.artifactsWithCandidates += withCandidatesForType
    target.artifactsWithoutCandidates += withoutCandidatesForType
    if (!target.artifactTypes[row.artifact_type]) {
      target.artifactTypes[row.artifact_type] = {
        total: totalArtifactsForType,
        oldestArtifactAt: null,
        newestArtifactAt: null,
        firstIngestedAt: null,
        lastIngestedAt: null,
      }
    }
    target.artifactTypes[row.artifact_type].artifactsWithCandidates = withCandidatesForType
    target.artifactTypes[row.artifact_type].artifactsWithoutCandidates = withoutCandidatesForType
    target.artifactTypes[row.artifact_type].extractionCoveragePercent = totalArtifactsForType
      ? Math.round((withCandidatesForType / totalArtifactsForType) * 1000) / 10
      : 0
  }

  for (const row of processingArtifactResult.rows) {
    const source = row.source_id
    const totalArtifactsForType = Number(bySource[source]?.artifactTypes?.[row.artifact_type]?.total || 0)
    const processedForType = Number(row.artifacts_processed || 0)
    const pendingForType = Math.max(0, totalArtifactsForType - processedForType)
    if (!bySource[source]) {
      bySource[source] = {
        sourceId: source,
        totalArtifacts: totalArtifactsForType,
        artifactsWithCandidates: 0,
        artifactsWithoutCandidates: 0,
        artifactsProcessed: 0,
        artifactsPendingProcessing: 0,
        processingCoveragePercent: 0,
        extractionCoveragePercent: 0,
        totalCandidates: 0,
        artifactTypes: {},
        candidateTypes: {},
        oldestArtifactAt: null,
        newestArtifactAt: null,
        firstIngestedAt: null,
        lastIngestedAt: null,
      }
    }

    const target = bySource[source]
    target.artifactsProcessed += processedForType
    target.artifactsPendingProcessing += pendingForType
    if (!target.artifactTypes[row.artifact_type]) {
      target.artifactTypes[row.artifact_type] = {
        total: totalArtifactsForType,
        artifactsWithCandidates: 0,
        artifactsWithoutCandidates: totalArtifactsForType,
        artifactsProcessed: 0,
        artifactsPendingProcessing: totalArtifactsForType,
        processingCoveragePercent: 0,
        extractionCoveragePercent: 0,
        oldestArtifactAt: null,
        newestArtifactAt: null,
        firstIngestedAt: null,
        lastIngestedAt: null,
      }
    }
    target.artifactTypes[row.artifact_type].artifactsProcessed = processedForType
    target.artifactTypes[row.artifact_type].artifactsPendingProcessing = pendingForType
    target.artifactTypes[row.artifact_type].processingCoveragePercent = totalArtifactsForType
      ? Math.round((processedForType / totalArtifactsForType) * 1000) / 10
      : 0
  }

  for (const source of Object.values(bySource)) {
    source.extractionCoveragePercent = source.totalArtifacts
      ? Math.round((source.artifactsWithCandidates / source.totalArtifacts) * 1000) / 10
      : 0
    source.processingCoveragePercent = source.totalArtifacts
      ? Math.round((source.artifactsProcessed / source.totalArtifacts) * 1000) / 10
      : 0
    if (!source.artifactsPendingProcessing) {
      source.artifactsPendingProcessing = Math.max(0, source.totalArtifacts - source.artifactsProcessed)
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    totalArtifacts,
    totalCandidates,
    sources: Object.values(bySource),
    latestSynthesisRun: latestSynthesisResult.rows[0]
      ? {
          runId: latestSynthesisResult.rows[0].run_id,
          title: latestSynthesisResult.rows[0].title,
          candidatesRead: latestSynthesisResult.rows[0].candidates_read,
          generatedAt: latestSynthesisResult.rows[0].generated_at,
          outputPath: latestSynthesisResult.rows[0].output_path,
        }
      : null,
  }
}

export async function listFoundationUsers({
  activeOnly = true,
  meetingSyncEnabled = null,
  userType = null,
} = {}) {
  const values = []
  const filters = []

  if (activeOnly) {
    values.push(true)
    filters.push(`active = $${values.length}`)
  }

  if (meetingSyncEnabled !== null && meetingSyncEnabled !== undefined) {
    values.push(Boolean(meetingSyncEnabled))
    filters.push(`meeting_sync_enabled = $${values.length}`)
  }

  if (userType) {
    values.push(String(userType).trim())
    filters.push(`user_type = $${values.length}`)
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
  const result = await pool.query(
    `
      SELECT email, name, tier, user_type, active, meeting_sync_enabled, metadata, created_at, updated_at
      FROM users
      ${whereClause}
      ORDER BY user_type ASC, name ASC, email ASC
    `,
    values
  )

  return result.rows.map(mapFoundationUserRow)
}

export async function getSharedCommunicationArtifactsForProcessing({ sourceId, artifactType, limit = 20, offset = 0 } = {}) {
  const normalizedLimit = Math.min(1000, Math.max(1, Number(limit) || 20))
  const normalizedOffset = Math.max(0, Number(offset) || 0)
  const values = []
  const filters = []

  if (sourceId) {
    values.push(String(sourceId).trim())
    filters.push(`source_id = $${values.length}`)
  }

  if (artifactType) {
    values.push(String(artifactType).trim())
    filters.push(`artifact_type = $${values.length}`)
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
  const result = await pool.query(
    `
      SELECT artifact_id, source_id, artifact_type, external_id, title,
             content_text, content_hash, artifact_updated_at, metadata
      FROM shared_communication_artifacts
      ${whereClause}
      ORDER BY COALESCE(artifact_updated_at, ingested_at) DESC, ingested_at DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `,
    [...values, normalizedLimit, normalizedOffset]
  )

  return result.rows.map(row => ({
    artifactId: row.artifact_id,
    sourceId: row.source_id,
    artifactType: row.artifact_type,
    externalId: row.external_id,
    title: row.title || '',
    contentText: row.content_text || '',
    contentHash: row.content_hash || '',
    artifactUpdatedAt: row.artifact_updated_at ?? null,
    metadata: row.metadata || {},
  }))
}

export async function getSharedCommunicationArtifactsWithoutCandidatesForProcessing({
  sourceId,
  artifactType,
  limit = 20,
  offset = 0,
  processingType = 'candidate_extraction',
  extractionMethod = null,
} = {}) {
  const normalizedLimit = Math.min(1000, Math.max(1, Number(limit) || 20))
  const normalizedOffset = Math.max(0, Number(offset) || 0)
  const values = []
  const filters = []

  if (sourceId) {
    values.push(String(sourceId).trim())
    filters.push(`artifact.source_id = $${values.length}`)
  }

  if (artifactType) {
    values.push(String(artifactType).trim())
    filters.push(`artifact.artifact_type = $${values.length}`)
  }

  const processingFilters = [
    'processing.artifact_id = artifact.artifact_id',
    `processing.status = 'succeeded'`,
    `COALESCE(processing.artifact_content_hash, '') = COALESCE(artifact.content_hash, '')`,
  ]
  if (processingType) {
    values.push(String(processingType).trim())
    processingFilters.push(`processing.processing_type = $${values.length}`)
  }
  if (extractionMethod) {
    values.push(String(extractionMethod).trim())
    processingFilters.push(`processing.extraction_method = $${values.length}`)
  }
  filters.push(`
        NOT EXISTS (
          SELECT 1
          FROM shared_communication_artifact_processing_runs processing
          WHERE ${processingFilters.join(' AND ')}
        )
  `)

  const whereClause = `WHERE ${filters.join(' AND ')}`
  const result = await pool.query(
    `
      SELECT artifact.artifact_id, artifact.source_id, artifact.artifact_type,
             artifact.external_id, artifact.title, artifact.content_text,
             artifact.content_hash, artifact.artifact_updated_at, artifact.metadata
      FROM shared_communication_artifacts artifact
      ${whereClause}
      ORDER BY COALESCE(artifact.artifact_updated_at, artifact.ingested_at) DESC, artifact.ingested_at DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `,
    [...values, normalizedLimit, normalizedOffset]
  )

  return result.rows.map(row => ({
    artifactId: row.artifact_id,
    sourceId: row.source_id,
    artifactType: row.artifact_type,
    externalId: row.external_id,
    title: row.title || '',
    contentText: row.content_text || '',
    contentHash: row.content_hash || '',
    artifactUpdatedAt: row.artifact_updated_at ?? null,
    metadata: row.metadata || {},
  }))
}

export async function recordSharedCommunicationArtifactProcessingRun(input, actor = 'system') {
  if (!input.artifactId || !input.sourceId || !input.artifactType || !input.processingType || !input.status) {
    throw new Error('artifactId/sourceId/artifactType/processingType/status are required for artifact processing run writes.')
  }

  const runId = input.runId || `artifact-proc-${new Date().toISOString().replace(/[-:.TZ]/g, '')}-${randomUUID().slice(0, 8)}`
  const result = await pool.query(
    `
      INSERT INTO shared_communication_artifact_processing_runs (
        run_id, artifact_id, source_id, artifact_type, artifact_content_hash,
        processing_type, extraction_method, provider, auth_path, route_key,
        model, status, candidate_count, error_message,
        metadata, processed_by, processed_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,COALESCE($17::timestamptz, NOW()))
      ON CONFLICT (run_id) DO UPDATE
      SET status = EXCLUDED.status,
          artifact_content_hash = EXCLUDED.artifact_content_hash,
          provider = EXCLUDED.provider,
          auth_path = EXCLUDED.auth_path,
          route_key = EXCLUDED.route_key,
          model = EXCLUDED.model,
          candidate_count = EXCLUDED.candidate_count,
          error_message = EXCLUDED.error_message,
          metadata = EXCLUDED.metadata,
          processed_by = EXCLUDED.processed_by,
          processed_at = EXCLUDED.processed_at
      RETURNING run_id, artifact_id, source_id, artifact_type, processing_type,
                artifact_content_hash, extraction_method, provider, auth_path,
                route_key, model, status, candidate_count, error_message,
                metadata, processed_by, processed_at
    `,
    [
      runId,
      input.artifactId,
      input.sourceId,
      input.artifactType,
      input.artifactContentHash ?? '',
      input.processingType,
      input.extractionMethod ?? null,
      input.provider ?? null,
      input.authPath ?? null,
      input.routeKey ?? null,
      input.model ?? null,
      input.status,
      Number(input.candidateCount || 0),
      input.errorMessage ?? null,
      JSON.stringify(input.metadata || {}),
      actor,
      input.processedAt ?? null,
    ]
  )

  const row = result.rows[0]
  return {
    runId: row.run_id,
    artifactId: row.artifact_id,
    sourceId: row.source_id,
    artifactType: row.artifact_type,
    artifactContentHash: row.artifact_content_hash || '',
    processingType: row.processing_type,
    extractionMethod: row.extraction_method,
    provider: row.provider || null,
    authPath: row.auth_path || null,
    routeKey: row.route_key || null,
    model: row.model,
    status: row.status,
    candidateCount: Number(row.candidate_count || 0),
    errorMessage: row.error_message || '',
    metadata: row.metadata || {},
    processedBy: row.processed_by || null,
    processedAt: row.processed_at,
  }
}

export async function getSharedCommunicationProcessingProvenanceGaps({
  since = '2026-04-24T17:14:00-04:00',
  limit = 20,
} = {}) {
  const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 20))
  const result = await pool.query(
    `
      SELECT run_id, artifact_id, source_id, artifact_type, processing_type,
             extraction_method, status, artifact_content_hash, provider,
             auth_path, route_key, model, processed_at
      FROM shared_communication_artifact_processing_runs
      WHERE processed_at >= $1::timestamptz
        AND processing_type = 'candidate_extraction'
        AND (
          COALESCE(artifact_content_hash, '') = ''
          OR provider IS NULL
          OR auth_path IS NULL
          OR route_key IS NULL
          OR model IS NULL
        )
      ORDER BY processed_at DESC
      LIMIT $2
    `,
    [since, normalizedLimit]
  )

  return result.rows.map(row => ({
    runId: row.run_id,
    artifactId: row.artifact_id,
    sourceId: row.source_id,
    artifactType: row.artifact_type,
    processingType: row.processing_type,
    extractionMethod: row.extraction_method,
    status: row.status,
    artifactContentHash: row.artifact_content_hash || '',
    provider: row.provider || null,
    authPath: row.auth_path || null,
    routeKey: row.route_key || null,
    model: row.model || null,
    processedAt: row.processed_at,
  }))
}

export async function upsertSharedCommunicationArtifact(input, actor = 'system') {
  const artifactId =
    input.artifactId ||
    `${String(input.sourceId || '').trim()}:${String(input.externalId || '').trim()}`

  if (!artifactId || !input.sourceId || !input.artifactType || !input.externalId) {
    throw new Error('artifactId/sourceId/artifactType/externalId are required for shared communication archive writes.')
  }

  return withFoundationTransaction(async client => {
    const result = await client.query(
      `
        INSERT INTO shared_communication_artifacts (
          artifact_id, source_id, artifact_type, external_id, title,
          source_account, source_container, source_url, participants,
          content_text, content_hash, artifact_created_at, artifact_updated_at,
          metadata, ingested_by
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14::jsonb,$15)
        ON CONFLICT (artifact_id) DO UPDATE
        SET title = EXCLUDED.title,
            source_account = EXCLUDED.source_account,
            source_container = EXCLUDED.source_container,
            source_url = EXCLUDED.source_url,
            participants = EXCLUDED.participants,
            content_text = EXCLUDED.content_text,
            content_hash = EXCLUDED.content_hash,
            artifact_created_at = COALESCE(EXCLUDED.artifact_created_at, shared_communication_artifacts.artifact_created_at),
            artifact_updated_at = COALESCE(EXCLUDED.artifact_updated_at, shared_communication_artifacts.artifact_updated_at),
            metadata = EXCLUDED.metadata,
            ingested_by = EXCLUDED.ingested_by,
            ingested_at = NOW(),
            updated_at = CASE
              WHEN shared_communication_artifacts.title IS DISTINCT FROM EXCLUDED.title
                OR shared_communication_artifacts.source_account IS DISTINCT FROM EXCLUDED.source_account
                OR shared_communication_artifacts.source_container IS DISTINCT FROM EXCLUDED.source_container
                OR shared_communication_artifacts.source_url IS DISTINCT FROM EXCLUDED.source_url
                OR shared_communication_artifacts.participants IS DISTINCT FROM EXCLUDED.participants
                OR shared_communication_artifacts.content_hash IS DISTINCT FROM EXCLUDED.content_hash
                OR shared_communication_artifacts.artifact_updated_at IS DISTINCT FROM EXCLUDED.artifact_updated_at
                OR shared_communication_artifacts.metadata IS DISTINCT FROM EXCLUDED.metadata
              THEN NOW()
              ELSE shared_communication_artifacts.updated_at
            END
        RETURNING artifact_id, source_id, artifact_type, external_id, title,
                  source_account, source_container, source_url, participants,
                  content_text, content_hash, artifact_created_at, artifact_updated_at,
                  metadata, ingested_by, ingested_at, updated_at
      `,
      [
        artifactId,
        input.sourceId,
        input.artifactType,
        input.externalId,
        input.title ?? null,
        input.sourceAccount ?? null,
        input.sourceContainer ?? null,
        input.sourceUrl ?? null,
        JSON.stringify(Array.isArray(input.participants) ? input.participants : []),
        input.contentText ?? '',
        input.contentHash ?? '',
        input.artifactCreatedAt ?? null,
        input.artifactUpdatedAt ?? null,
        JSON.stringify(input.metadata || {}),
        actor,
      ]
    )

    return mapSharedCommunicationArtifactRow(result.rows[0])
  })
}

export async function getSharedCommunicationCandidateSnapshot({
  sourceId,
  candidateType,
  status,
  limit = 20,
  includeItems = true,
} = {}) {
  const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 20))
  const values = []
  const filters = []

  if (sourceId) {
    values.push(String(sourceId).trim())
    filters.push(`source_id = $${values.length}`)
  }

  if (candidateType) {
    values.push(String(candidateType).trim())
    filters.push(`candidate_type = $${values.length}`)
  }

  if (status) {
    values.push(String(status).trim())
    filters.push(`status = $${values.length}`)
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
  const summaryResult = await pool.query(
    `
      SELECT candidate_type, status, COUNT(*)::int AS total
      FROM shared_communication_candidates
      ${whereClause}
      GROUP BY candidate_type, status
      ORDER BY candidate_type ASC, status ASC
    `,
    values
  )

  const byType = {}
  const byStatus = {}
  let totalCandidates = 0

  for (const row of summaryResult.rows) {
    const count = Number(row.total || 0)
    totalCandidates += count
    byType[row.candidate_type] = (byType[row.candidate_type] || 0) + count
    byStatus[row.status] = (byStatus[row.status] || 0) + count
  }

  let items = []
  if (includeItems) {
    const itemsResult = await pool.query(
      `
        SELECT candidate_key, artifact_id, source_id, candidate_type, status,
               title, summary, owner_hint, evidence_excerpt, confidence,
               metadata, created_at, updated_at
        FROM shared_communication_candidates
        ${whereClause}
        ORDER BY updated_at DESC, created_at DESC
        LIMIT $${values.length + 1}
      `,
      [...values, normalizedLimit]
    )
    items = itemsResult.rows.map(mapSharedCommunicationCandidateRow)
  }

  return {
    totalCandidates,
    byType,
    byStatus,
    items,
  }
}

export async function upsertSharedCommunicationCandidate(input) {
  if (!input.candidateKey || !input.artifactId || !input.sourceId || !input.candidateType || !input.title || !input.summary) {
    throw new Error('candidateKey/artifactId/sourceId/candidateType/title/summary are required for shared communication candidate writes.')
  }

  const result = await pool.query(
    `
      INSERT INTO shared_communication_candidates (
        candidate_key, artifact_id, source_id, candidate_type, title, summary,
        owner_hint, evidence_excerpt, confidence, metadata
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
      ON CONFLICT (candidate_key) DO UPDATE
      SET title = EXCLUDED.title,
          summary = EXCLUDED.summary,
          owner_hint = EXCLUDED.owner_hint,
          evidence_excerpt = EXCLUDED.evidence_excerpt,
          confidence = EXCLUDED.confidence,
          metadata = EXCLUDED.metadata,
          status = CASE
            WHEN shared_communication_candidates.status = 'rejected'
              AND shared_communication_candidates.metadata->>'rejectedByCleanup' = 'true'
            THEN 'pending'
            WHEN shared_communication_candidates.status = 'duplicate'
              AND shared_communication_candidates.metadata->>'duplicateByCleanup' = 'true'
            THEN 'pending'
            ELSE shared_communication_candidates.status
          END,
          updated_at = CASE
            WHEN shared_communication_candidates.title IS DISTINCT FROM EXCLUDED.title
              OR shared_communication_candidates.summary IS DISTINCT FROM EXCLUDED.summary
              OR shared_communication_candidates.owner_hint IS DISTINCT FROM EXCLUDED.owner_hint
              OR shared_communication_candidates.evidence_excerpt IS DISTINCT FROM EXCLUDED.evidence_excerpt
              OR shared_communication_candidates.confidence IS DISTINCT FROM EXCLUDED.confidence
              OR shared_communication_candidates.metadata IS DISTINCT FROM EXCLUDED.metadata
              OR (
                shared_communication_candidates.status = 'rejected'
                AND shared_communication_candidates.metadata->>'rejectedByCleanup' = 'true'
              )
              OR (
                shared_communication_candidates.status = 'duplicate'
                AND shared_communication_candidates.metadata->>'duplicateByCleanup' = 'true'
              )
            THEN NOW()
            ELSE shared_communication_candidates.updated_at
          END
      RETURNING candidate_key, artifact_id, source_id, candidate_type, status,
                title, summary, owner_hint, evidence_excerpt, confidence,
                metadata, created_at, updated_at
    `,
    [
      input.candidateKey,
      input.artifactId,
      input.sourceId,
      input.candidateType,
      input.title,
      input.summary,
      input.ownerHint ?? null,
      input.evidenceExcerpt ?? null,
      input.confidence ?? null,
      JSON.stringify(input.metadata || {}),
    ]
  )

  return mapSharedCommunicationCandidateRow(result.rows[0])
}

export async function recordSharedCommunicationSynthesisRun(input, actor = 'system') {
  if (!input.runId || !input.title || !input.model) {
    throw new Error('runId/title/model are required for shared communication synthesis writes.')
  }

  const items = Array.isArray(input.items) ? input.items : []
  return withFoundationTransaction(async client => {
    const runResult = await client.query(
      `
        INSERT INTO shared_communication_synthesis_runs (
          run_id, title, status, model, output_path, candidate_limit,
          candidates_read, days_window, max_items, source_coverage,
          suppressed_patterns, open_questions, archive_summary,
          candidate_summary, source_facts, metadata, generated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,$14::jsonb,$15::jsonb,$16::jsonb,$17)
        ON CONFLICT (run_id) DO UPDATE
        SET title = EXCLUDED.title,
            status = EXCLUDED.status,
            model = EXCLUDED.model,
            output_path = EXCLUDED.output_path,
            candidate_limit = EXCLUDED.candidate_limit,
            candidates_read = EXCLUDED.candidates_read,
            days_window = EXCLUDED.days_window,
            max_items = EXCLUDED.max_items,
            source_coverage = EXCLUDED.source_coverage,
            suppressed_patterns = EXCLUDED.suppressed_patterns,
            open_questions = EXCLUDED.open_questions,
            archive_summary = EXCLUDED.archive_summary,
            candidate_summary = EXCLUDED.candidate_summary,
            source_facts = EXCLUDED.source_facts,
            metadata = EXCLUDED.metadata,
            generated_at = EXCLUDED.generated_at,
            updated_at = NOW()
        RETURNING run_id, title, status, model, output_path, candidate_limit,
                  candidates_read, days_window, max_items, source_coverage,
                  suppressed_patterns, open_questions, archive_summary,
                  candidate_summary, source_facts, metadata, generated_at, created_at, updated_at
      `,
      [
        input.runId,
        input.title,
        input.status || 'completed',
        input.model,
        input.outputPath || null,
        input.candidateLimit ?? null,
        input.candidatesRead ?? 0,
        input.daysWindow ?? null,
        input.maxItems ?? null,
        JSON.stringify(input.sourceCoverage || []),
        JSON.stringify(input.suppressedPatterns || []),
        JSON.stringify(input.openQuestions || []),
        JSON.stringify(input.archiveSummary || []),
        JSON.stringify(input.candidateSummary || []),
        JSON.stringify(input.sourceFacts || {}),
        JSON.stringify({
          ...(input.metadata || {}),
          recordedBy: actor,
        }),
        input.generatedAt || new Date().toISOString(),
      ]
    )

    await client.query(
      `DELETE FROM shared_communication_synthesized_items WHERE run_id = $1`,
      [input.runId]
    )

    for (const item of items) {
      const itemId = item.synthesisItemId || `${input.runId}:${item.rank}`
      await client.query(
        `
          INSERT INTO shared_communication_synthesized_items (
            synthesis_item_id, run_id, rank, item_type, status, title,
            one_line, why_it_matters, recommended_next_action, suggested_owner,
            source_count, candidate_keys, source_ids, evidence_summary,
            confidence, sensitivity, metadata
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::text[],$13::text[],$14,$15,$16,$17::jsonb)
        `,
        [
          itemId,
          input.runId,
          item.rank,
          item.itemType || item.item_type,
          item.status,
          item.title,
          item.oneLine || item.one_line || '',
          item.whyItMatters || item.why_it_matters || '',
          item.recommendedNextAction || item.recommended_next_action || '',
          item.suggestedOwner || item.suggested_owner || null,
          item.sourceCount ?? item.source_count ?? 0,
          Array.isArray(item.candidateKeys) ? item.candidateKeys : item.candidate_keys || [],
          Array.isArray(item.sourceIds) ? item.sourceIds : item.source_ids || [],
          item.evidenceSummary || item.evidence_summary || '',
          item.confidence ?? null,
          item.sensitivity || 'neutral',
          JSON.stringify(item.metadata || {}),
        ]
      )
    }

    return {
      run: mapSharedCommunicationSynthesisRunRow(runResult.rows[0]),
      itemCount: items.length,
    }
  })
}

export async function getSharedCommunicationSynthesisSnapshot({ limit = 3, itemLimit = 20, packetType = '' } = {}) {
  const normalizedLimit = Math.min(20, Math.max(1, Number(limit) || 3))
  const normalizedItemLimit = Math.min(100, Math.max(1, Number(itemLimit) || 20))
  const normalizedPacketType = String(packetType || '').trim()
  const values = [normalizedLimit]
  const filters = []

  if (normalizedPacketType) {
    values.push(normalizedPacketType)
    filters.push(`metadata->>'packetType' = $${values.length}`)
  }

  const runsResult = await pool.query(
    `
      SELECT run_id, title, status, model, output_path, candidate_limit,
             candidates_read, days_window, max_items, source_coverage,
             suppressed_patterns, open_questions, archive_summary,
             candidate_summary, source_facts, metadata, generated_at, created_at, updated_at
      FROM shared_communication_synthesis_runs
      ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
      ORDER BY generated_at DESC, created_at DESC
      LIMIT $1
    `,
    values
  )

  const runs = runsResult.rows.map(mapSharedCommunicationSynthesisRunRow)
  const latestRunId = runs[0]?.runId || ''
  let latestItems = []

  if (latestRunId) {
    const itemsResult = await pool.query(
      `
        SELECT synthesis_item_id, run_id, rank, item_type, status, title,
               one_line, why_it_matters, recommended_next_action, suggested_owner,
               source_count, candidate_keys, source_ids, evidence_summary,
               confidence, sensitivity, metadata, created_at
        FROM shared_communication_synthesized_items
        WHERE run_id = $1
        ORDER BY rank ASC
        LIMIT $2
      `,
      [latestRunId, normalizedItemLimit]
    )
    latestItems = itemsResult.rows.map(mapSharedCommunicationSynthesizedItemRow)
  }

  return {
    latestRun: runs[0] || null,
    runs,
    latestItems,
  }
}

export async function rejectSharedCommunicationCandidatesByExtractionMethod({
  sourceId,
  candidateType,
  extractionMethods,
  actor = 'system',
  reason = 'Superseded by a newer extraction method.',
} = {}) {
  const normalizedMethods = (Array.isArray(extractionMethods) ? extractionMethods : [extractionMethods])
    .map(value => String(value || '').trim())
    .filter(Boolean)

  if (!normalizedMethods.length) {
    throw new Error('At least one extraction method is required to reject shared communication candidates.')
  }

  const values = []
  const filters = [`status = 'pending'`]

  if (sourceId) {
    values.push(String(sourceId).trim())
    filters.push(`source_id = $${values.length}`)
  }

  if (candidateType) {
    values.push(String(candidateType).trim())
    filters.push(`candidate_type = $${values.length}`)
  }

  values.push(normalizedMethods)
  filters.push(`COALESCE(metadata->>'extractionMethod', '') = ANY($${values.length}::text[])`)

  values.push(
    JSON.stringify({
      rejectionActor: actor,
      rejectionReason: reason,
      rejectedByCleanup: true,
      rejectedAt: new Date().toISOString(),
    })
  )

  const patchParam = values.length
  const result = await pool.query(
    `
      UPDATE shared_communication_candidates
      SET status = 'rejected',
          metadata = COALESCE(metadata, '{}'::jsonb) || $${patchParam}::jsonb,
          updated_at = NOW()
      WHERE ${filters.join(' AND ')}
      RETURNING candidate_key
    `,
    values
  )

  return {
    rejected: result.rowCount || 0,
    candidateKeys: result.rows.map(row => row.candidate_key),
  }
}

export async function rejectSharedCommunicationCandidatesForArtifacts({
  sourceId,
  candidateType,
  artifactIds,
  excludeCandidateKeys = [],
  extractionMethods,
  actor = 'system',
  reason = 'Superseded by a newer extraction method.',
} = {}) {
  const normalizedMethods = (Array.isArray(extractionMethods) ? extractionMethods : [extractionMethods])
    .map(value => String(value || '').trim())
    .filter(Boolean)
  const normalizedArtifactIds = (Array.isArray(artifactIds) ? artifactIds : [artifactIds])
    .map(value => String(value || '').trim())
    .filter(Boolean)
  const normalizedExcludeCandidateKeys = (Array.isArray(excludeCandidateKeys) ? excludeCandidateKeys : [excludeCandidateKeys])
    .map(value => String(value || '').trim())
    .filter(Boolean)

  if (!normalizedMethods.length) {
    throw new Error('At least one extraction method is required to reject shared communication candidates.')
  }
  if (!normalizedArtifactIds.length) {
    return { rejected: 0, candidateKeys: [] }
  }

  const values = []
  const filters = [`status = 'pending'`]

  if (sourceId) {
    values.push(String(sourceId).trim())
    filters.push(`source_id = $${values.length}`)
  }

  if (candidateType) {
    values.push(String(candidateType).trim())
    filters.push(`candidate_type = $${values.length}`)
  }

  values.push(normalizedArtifactIds)
  filters.push(`artifact_id = ANY($${values.length}::text[])`)

  values.push(normalizedMethods)
  filters.push(`COALESCE(metadata->>'extractionMethod', '') = ANY($${values.length}::text[])`)

  if (normalizedExcludeCandidateKeys.length) {
    values.push(normalizedExcludeCandidateKeys)
    filters.push(`candidate_key <> ALL($${values.length}::text[])`)
  }

  values.push(
    JSON.stringify({
      rejectionActor: actor,
      rejectionReason: reason,
      rejectedByCleanup: true,
      rejectedAt: new Date().toISOString(),
    })
  )

  const patchParam = values.length
  const result = await pool.query(
    `
      UPDATE shared_communication_candidates
      SET status = 'rejected',
          metadata = COALESCE(metadata, '{}'::jsonb) || $${patchParam}::jsonb,
          updated_at = NOW()
      WHERE ${filters.join(' AND ')}
      RETURNING candidate_key
    `,
    values
  )

  return {
    rejected: result.rowCount || 0,
    candidateKeys: result.rows.map(row => row.candidate_key),
  }
}

export async function updateSharedCommunicationCandidateStatus(
  candidateKey,
  status,
  actor = 'system',
  metadataPatch = {}
) {
  const normalizedStatus = String(status || '').trim()
  const allowedStatuses = new Set(['pending', 'approved', 'rejected', 'applied', 'duplicate'])
  if (!allowedStatuses.has(normalizedStatus)) {
    throw new Error(`Unsupported shared communication candidate status: ${normalizedStatus}`)
  }

  const result = await pool.query(
    `
      UPDATE shared_communication_candidates
      SET status = $2,
          metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
          updated_at = NOW()
      WHERE candidate_key = $1
      RETURNING candidate_key, artifact_id, source_id, candidate_type, status,
                title, summary, owner_hint, evidence_excerpt, confidence,
                metadata, created_at, updated_at
    `,
    [
      candidateKey,
      normalizedStatus,
      JSON.stringify({
        ...metadataPatch,
        lastStatusActor: actor,
        lastStatusChangedAt: new Date().toISOString(),
      }),
    ]
  )

  const row = result.rows[0]
  if (!row) {
    throw new Error(`Shared communication candidate not found: ${candidateKey}`)
  }

  return mapSharedCommunicationCandidateRow(row)
}

export async function applySharedCommunicationCandidateToBacklog(
  candidateKey,
  backlogInput = {},
  actor = 'system'
) {
  return withFoundationTransaction(async client => {
    const candidateResult = await client.query(
      `
        SELECT candidate_key, artifact_id, source_id, candidate_type, status,
               title, summary, owner_hint, evidence_excerpt, confidence,
               metadata, created_at, updated_at
        FROM shared_communication_candidates
        WHERE candidate_key = $1
        FOR UPDATE
      `,
      [candidateKey]
    )

    const candidateRow = candidateResult.rows[0]
    if (!candidateRow) {
      throw new Error(`Shared communication candidate not found: ${candidateKey}`)
    }

    const candidate = mapSharedCommunicationCandidateRow(candidateRow)
    ensureSharedCommunicationCandidateCanApply(candidate)
    if (candidate.candidateType !== 'task_candidate') {
      throw new Error(`Only task candidates can be applied to backlog right now: ${candidate.candidateType}`)
    }

    const backlogId = await getNextPrefixedId(client, 'backlog_items', backlogInput.idPrefix || 'SYSTEM')
    const scope = normalizeBacklogScopeKey(backlogInput.scope ?? backlogInput.team ?? 'foundation')
    const lane = backlogInput.lane || 'scoped'
    const priority = backlogInput.priority || 'P2'
    const source = backlogInput.source || `${candidate.sourceId} shared communications candidate`
    const owner = backlogInput.owner ?? candidate.ownerHint ?? null
    const whyItMatters =
      backlogInput.whyItMatters ||
      `Promoted from shared communications candidate ${candidate.candidateKey} so the work can move into the governed backlog.`
    const nextAction = backlogInput.nextAction || candidate.summary
    const statusNote = backlogInput.statusNote || `Applied from ${candidate.candidateKey}.`

    const backlogResult = await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary,
          why_it_matters, next_action, status_note, owner
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING *
      `,
      [
        backlogId,
        backlogInput.title || candidate.title,
        scope,
        lane,
        priority,
        backlogInput.rank ?? null,
        source,
        backlogInput.summary || candidate.summary,
        whyItMatters,
        nextAction,
        statusNote,
        owner,
      ]
    )

    await insertChangeEvent(client, {
      eventType: 'backlog_created',
      entityTable: 'backlog_items',
      entityId: backlogId,
      actor,
      summary: `Created backlog item ${backlogId}: ${backlogInput.title || candidate.title}`,
      metadata: {
        lane,
        priority,
        scope,
        sourceCandidateKey: candidate.candidateKey,
      },
    })

    const appliedCandidateResult = await client.query(
      `
        UPDATE shared_communication_candidates
        SET status = 'applied',
            metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
            updated_at = NOW()
        WHERE candidate_key = $1
        RETURNING candidate_key, artifact_id, source_id, candidate_type, status,
                  title, summary, owner_hint, evidence_excerpt, confidence,
                  metadata, created_at, updated_at
      `,
      [
        candidateKey,
        JSON.stringify({
          appliedBy: actor,
          appliedAt: new Date().toISOString(),
          appliedTarget: 'backlog_item',
          appliedTargetId: backlogId,
        }),
      ]
    )

    return {
      backlogItem: mapBacklogRow(backlogResult.rows[0]),
      candidate: mapSharedCommunicationCandidateRow(appliedCandidateResult.rows[0]),
    }
  })
}

export async function applySharedCommunicationCandidateToDecision(
  candidateKey,
  decisionInput = {},
  actor = 'system'
) {
  return withFoundationTransaction(async client => {
    const candidateResult = await client.query(
      `
        SELECT candidate_key, artifact_id, source_id, candidate_type, status,
               title, summary, owner_hint, evidence_excerpt, confidence,
               metadata, created_at, updated_at
        FROM shared_communication_candidates
        WHERE candidate_key = $1
        FOR UPDATE
      `,
      [candidateKey]
    )

    const candidateRow = candidateResult.rows[0]
    if (!candidateRow) {
      throw new Error(`Shared communication candidate not found: ${candidateKey}`)
    }

    const candidate = mapSharedCommunicationCandidateRow(candidateRow)
    ensureSharedCommunicationCandidateCanApply(candidate)
    if (candidate.candidateType !== 'decision_candidate') {
      throw new Error(`Only decision candidates can be applied to decisions right now: ${candidate.candidateType}`)
    }

    const decisionId = await getNextPrefixedId(client, 'decisions', 'DEC')
    const category = normalizeDecisionCategory(decisionInput.category, 'execution')
    const supersedesIds = normalizeDecisionIdList(decisionInput.supersedesIds, decisionId)
    const participantNames = normalizeStringList(
      decisionInput.participantNames ?? candidate.metadata?.links?.participants ?? []
    )
    const decisionTitle = decisionInput.title || candidate.title
    const decisionSummary = decisionInput.summary || candidate.summary
    const rationale = Object.prototype.hasOwnProperty.call(decisionInput, 'rationale')
      ? (decisionInput.rationale ?? null)
      : candidate.summary
    const sourceRef =
      decisionInput.sourceRef ||
      `${candidate.sourceId} shared communications candidate ${candidate.candidateKey}`
    const decisionOwner = Object.prototype.hasOwnProperty.call(decisionInput, 'decisionOwner')
      ? (decisionInput.decisionOwner ?? null)
      : (candidate.ownerHint ?? null)
    const confirmedBy = Object.prototype.hasOwnProperty.call(decisionInput, 'confirmedBy')
      ? (decisionInput.confirmedBy ?? null)
      : null
    const contextRef = Object.prototype.hasOwnProperty.call(decisionInput, 'contextRef')
      ? (decisionInput.contextRef ?? null)
      : (candidate.metadata?.artifactTitle || candidate.artifactId || null)
    const evidenceNotes = Object.prototype.hasOwnProperty.call(decisionInput, 'evidenceNotes')
      ? (decisionInput.evidenceNotes ?? null)
      : (candidate.evidenceExcerpt || null)

    const decisionResult = await client.query(
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
        decisionId,
        category,
        decisionTitle,
        decisionSummary,
        rationale,
        sourceRef,
        decisionOwner,
        confirmedBy,
        participantNames,
        contextRef,
        evidenceNotes,
        actor,
        supersedesIds,
      ]
    )

    await insertChangeEvent(client, {
      eventType: 'decision_proposed',
      entityTable: 'decisions',
      entityId: decisionId,
      actor,
      summary: `Proposed decision ${decisionId}: ${decisionTitle}`,
      metadata: {
        category,
        supersedesIds,
        decisionOwner,
        confirmedBy,
        participantNames,
        contextRef,
        sourceCandidateKey: candidate.candidateKey,
      },
    })

    const appliedCandidateResult = await client.query(
      `
        UPDATE shared_communication_candidates
        SET status = 'applied',
            metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
            updated_at = NOW()
        WHERE candidate_key = $1
        RETURNING candidate_key, artifact_id, source_id, candidate_type, status,
                  title, summary, owner_hint, evidence_excerpt, confidence,
                  metadata, created_at, updated_at
      `,
      [
        candidateKey,
        JSON.stringify({
          appliedBy: actor,
          appliedAt: new Date().toISOString(),
          appliedTarget: 'decision',
          appliedTargetId: decisionId,
        }),
      ]
    )

    return {
      decision: mapDecisionRow(decisionResult.rows[0]),
      candidate: mapSharedCommunicationCandidateRow(appliedCandidateResult.rows[0]),
    }
  })
}

export async function applySharedCommunicationCandidateToQuestion(
  candidateKey,
  questionInput = {},
  actor = 'system'
) {
  return withFoundationTransaction(async client => {
    const candidateResult = await client.query(
      `
        SELECT candidate_key, artifact_id, source_id, candidate_type, status,
               title, summary, owner_hint, evidence_excerpt, confidence,
               metadata, created_at, updated_at
        FROM shared_communication_candidates
        WHERE candidate_key = $1
        FOR UPDATE
      `,
      [candidateKey]
    )

    const candidateRow = candidateResult.rows[0]
    if (!candidateRow) {
      throw new Error(`Shared communication candidate not found: ${candidateKey}`)
    }

    const candidate = mapSharedCommunicationCandidateRow(candidateRow)
    ensureSharedCommunicationCandidateCanApply(candidate)
    if (candidate.candidateType !== 'blocker') {
      throw new Error(`Only blocker candidates can be applied to open questions right now: ${candidate.candidateType}`)
    }

    const questionId = await getNextPrefixedId(client, 'open_questions', 'Q')
    const questionTitle = questionInput.title || candidate.title
    const questionSummary = questionInput.summary || candidate.summary
    const questionOwner = Object.prototype.hasOwnProperty.call(questionInput, 'owner')
      ? (questionInput.owner ?? null)
      : (candidate.ownerHint ?? null)

    const questionResult = await client.query(
      `
        INSERT INTO open_questions (
          id, title, summary, owner, status
        )
        VALUES ($1,$2,$3,$4,'open')
        RETURNING *
      `,
      [questionId, questionTitle, questionSummary, questionOwner]
    )

    await insertChangeEvent(client, {
      eventType: 'question_created',
      entityTable: 'open_questions',
      entityId: questionId,
      actor,
      summary: `Opened question ${questionId}: ${questionTitle}`,
      metadata: {
        sourceCandidateKey: candidate.candidateKey,
      },
    })

    const appliedCandidateResult = await client.query(
      `
        UPDATE shared_communication_candidates
        SET status = 'applied',
            metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
            updated_at = NOW()
        WHERE candidate_key = $1
        RETURNING candidate_key, artifact_id, source_id, candidate_type, status,
                  title, summary, owner_hint, evidence_excerpt, confidence,
                  metadata, created_at, updated_at
      `,
      [
        candidateKey,
        JSON.stringify({
          appliedBy: actor,
          appliedAt: new Date().toISOString(),
          appliedTarget: 'open_question',
          appliedTargetId: questionId,
        }),
      ]
    )

    return {
      question: mapOpenQuestionRow(questionResult.rows[0]),
      candidate: mapSharedCommunicationCandidateRow(appliedCandidateResult.rows[0]),
    }
  })
}

export async function recordSourceDriftChange(input, actor = 'system') {
  return withFoundationTransaction(async client => {
    const eventType = String(input.eventType || '').trim()
    const entityTable = String(input.entityTable || '').trim()
    const entityId = String(input.entityId || '').trim()
    const summary = String(input.summary || '').trim()
    const metadata = input.metadata || {}
    const fingerprint = metadata && typeof metadata === 'object' ? String(metadata.fingerprint || '').trim() : ''

    if (!['source_drift_detected', 'source_drift_cleared'].includes(eventType)) {
      throw new Error('Source drift event type must be source_drift_detected or source_drift_cleared.')
    }
    if (!entityTable) throw new Error('Source drift entity table is required.')
    if (!entityId) throw new Error('Source drift entity id is required.')
    if (!summary) throw new Error('Source drift summary is required.')
    if (!fingerprint) throw new Error('Source drift fingerprint is required.')

    const existingResult = await client.query(
      `
        SELECT id, event_type, entity_table, entity_id, actor, summary, metadata, created_at
        FROM change_events
        WHERE entity_table = $1
          AND entity_id = $2
          AND event_type IN ('source_drift_detected', 'source_drift_cleared')
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [entityTable, entityId]
    )

    const existing = existingResult.rows[0] ? mapChangeEventRow(existingResult.rows[0]) : null
    if (
      existing &&
      existing.eventType === eventType &&
      String(existing.metadata && existing.metadata.fingerprint || '') === fingerprint
    ) {
      return {
        inserted: false,
        event: existing,
      }
    }

    await insertChangeEvent(client, {
      eventType,
      entityTable,
      entityId,
      actor,
      summary,
      metadata,
    })

    const insertedResult = await client.query(
      `
        SELECT id, event_type, entity_table, entity_id, actor, summary, metadata, created_at
        FROM change_events
        WHERE entity_table = $1
          AND entity_id = $2
          AND event_type = $3
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [entityTable, entityId, eventType]
    )

    return {
      inserted: true,
      event: insertedResult.rows[0] ? mapChangeEventRow(insertedResult.rows[0]) : null,
    }
  })
}

export async function recordReviewQueueChange(input, actor = 'system') {
  return withFoundationTransaction(async client => {
    const eventType = String(input.eventType || '').trim()
    const entityTable = String(input.entityTable || '').trim()
    const entityId = String(input.entityId || '').trim()
    const summary = String(input.summary || '').trim()
    const metadata = input.metadata || {}
    const fingerprint = metadata && typeof metadata === 'object' ? String(metadata.fingerprint || '').trim() : ''

    if (!['review_queue_changed', 'review_queue_cleared'].includes(eventType)) {
      throw new Error('Review queue event type must be review_queue_changed or review_queue_cleared.')
    }
    if (!entityTable) throw new Error('Review queue entity table is required.')
    if (!entityId) throw new Error('Review queue entity id is required.')
    if (!summary) throw new Error('Review queue summary is required.')
    if (!fingerprint) throw new Error('Review queue fingerprint is required.')

    const existingResult = await client.query(
      `
        SELECT id, event_type, entity_table, entity_id, actor, summary, metadata, created_at
        FROM change_events
        WHERE entity_table = $1
          AND entity_id = $2
          AND event_type IN ('review_queue_changed', 'review_queue_cleared')
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [entityTable, entityId]
    )

    const existing = existingResult.rows[0] ? mapChangeEventRow(existingResult.rows[0]) : null
    if (
      existing &&
      existing.eventType === eventType &&
      String(existing.metadata && existing.metadata.fingerprint || '') === fingerprint
    ) {
      return {
        inserted: false,
        event: existing,
      }
    }

    await insertChangeEvent(client, {
      eventType,
      entityTable,
      entityId,
      actor,
      summary,
      metadata,
    })

    const insertedResult = await client.query(
      `
        SELECT id, event_type, entity_table, entity_id, actor, summary, metadata, created_at
        FROM change_events
        WHERE entity_table = $1
          AND entity_id = $2
          AND event_type = $3
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [entityTable, entityId, eventType]
    )

    return {
      inserted: true,
      event: insertedResult.rows[0] ? mapChangeEventRow(insertedResult.rows[0]) : null,
    }
  })
}

function assertBacklogDoneCloseout(id, row = {}, existing = null) {
  const movingToDone = row.lane === 'done' && (!existing || existing.lane !== 'done')
  if (!movingToDone) return
  const closeoutText = [
    row.source,
    row.next_action,
    row.status_note,
  ].filter(Boolean).join(' ')
  const hasCloseoutTrail = closeoutText.length >= 80 &&
    /(closed|done|accepted|shipped|verified|proof|foundation:verify|route|sample|commit|sha|npm run|docs\/)/i.test(closeoutText) &&
    /(\b20\d{2}-\d{2}-\d{2}\b|proof|foundation:verify|route|sample|commit|sha|npm run|docs\/)/i.test(closeoutText)
  if (!hasCloseoutTrail) {
    throw new Error(`Backlog item ${id} moving to done requires a closeout statusNote with build/change proof, not just a lane change.`)
  }
}

export async function createBacklogItem(input, actor = 'steve') {
  return withFoundationTransaction(async client => {
    const id = await getNextPrefixedId(client, 'backlog_items', input.idPrefix)
    const scope = normalizeBacklogScopeKey(input.scope ?? input.team)
    assertBacklogDoneCloseout(id, {
      lane: input.lane,
      source: input.source,
      next_action: input.nextAction,
      status_note: input.statusNote,
    })
    const result = await client.query(
      `
        INSERT INTO backlog_items (
          id, title, team, lane, priority, rank, source, summary,
          why_it_matters, next_action, status_note, owner
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING *
      `,
      [
        id,
        input.title,
        scope,
        input.lane,
        input.priority,
        input.rank ?? null,
        input.source ?? null,
        input.summary ?? null,
        input.whyItMatters ?? null,
        input.nextAction ?? null,
        input.statusNote ?? null,
        input.owner ?? null,
      ]
    )

    await insertChangeEvent(client, {
      eventType: 'backlog_created',
      entityTable: 'backlog_items',
      entityId: id,
      actor,
      summary: `Created backlog item ${id}: ${input.title}`,
      metadata: {
        lane: input.lane,
        priority: input.priority,
        scope,
      },
    })

    return mapBacklogRow(result.rows[0])
  })
}

export async function updateBacklogItem(id, input, actor = 'steve') {
  return withFoundationTransaction(async client => {
    const existingResult = await client.query(`SELECT * FROM backlog_items WHERE id = $1`, [id])
    const existing = existingResult.rows[0]
    if (!existing) throw new Error(`Backlog item not found: ${id}`)

    const nextRow = {
      title: input.title ?? existing.title,
      team: normalizeBacklogScopeKey(input.scope ?? input.team ?? existing.team),
      lane: input.lane ?? existing.lane,
      priority: input.priority ?? existing.priority,
      rank: input.rank ?? existing.rank,
      source: input.source ?? existing.source,
      summary: input.summary ?? existing.summary,
      why_it_matters: input.whyItMatters ?? existing.why_it_matters,
      next_action: input.nextAction ?? existing.next_action,
      status_note: input.statusNote ?? existing.status_note,
      owner: input.owner ?? existing.owner,
    }
    assertBacklogDoneCloseout(id, nextRow, existing)

    const result = await client.query(
      `
        UPDATE backlog_items
        SET title = $2,
            team = $3,
            lane = $4,
            priority = $5,
            rank = $6,
            source = $7,
            summary = $8,
            why_it_matters = $9,
            next_action = $10,
            status_note = $11,
            owner = $12,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [
        id,
        nextRow.title,
        nextRow.team,
        nextRow.lane,
        nextRow.priority,
        nextRow.rank,
        nextRow.source,
        nextRow.summary,
        nextRow.why_it_matters,
        nextRow.next_action,
        nextRow.status_note,
        nextRow.owner,
      ]
    )

    const laneChanged = existing.lane !== nextRow.lane
    await insertChangeEvent(client, {
      eventType: laneChanged ? 'backlog_status_changed' : 'backlog_updated',
      entityTable: 'backlog_items',
      entityId: id,
      actor,
      summary: laneChanged
        ? `Moved backlog item ${id} to ${nextRow.lane}`
        : `Updated backlog item ${id}`,
      metadata: {
        before: {
          scope: normalizeBacklogScopeKey(existing.team),
          lane: existing.lane,
          priority: existing.priority,
          owner: existing.owner,
        },
        after: {
          scope: nextRow.team,
          lane: nextRow.lane,
          priority: nextRow.priority,
          owner: nextRow.owner,
        },
      },
    })

    return mapBacklogRow(result.rows[0])
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
      eventType: 'decision_proposed',
      entityTable: 'decisions',
      entityId: id,
      actor,
      summary: `Proposed decision ${id}: ${input.title}`,
      metadata: {
        category,
        supersedesIds,
        decisionOwner: input.decisionOwner ?? null,
        confirmedBy: input.confirmedBy ?? null,
        participantNames,
        contextRef: input.contextRef ?? null,
      },
    })

    return mapDecisionRow(result.rows[0])
  })
}

export async function updateDecision(id, input, actor = 'steve') {
  return withFoundationTransaction(async client => {
    const existingResult = await client.query(`SELECT * FROM decisions WHERE id = $1`, [id])
    const existing = existingResult.rows[0]
    if (!existing) throw new Error(`Decision not found: ${id}`)

    const nextCategory = normalizeDecisionCategory(input.category ?? existing.category)
    const nextStatus = input.status ?? existing.status
    const nextSupersedesIds = normalizeDecisionIdList(input.supersedesIds ?? existing.supersedes_ids ?? [], id)
    const hasDecisionOwner = Object.prototype.hasOwnProperty.call(input, 'decisionOwner')
    const hasConfirmedBy = Object.prototype.hasOwnProperty.call(input, 'confirmedBy')
    const hasParticipantNames = Object.prototype.hasOwnProperty.call(input, 'participantNames')
    const hasContextRef = Object.prototype.hasOwnProperty.call(input, 'contextRef')
    const hasEvidenceNotes = Object.prototype.hasOwnProperty.call(input, 'evidenceNotes')
    const nextDecisionOwner = hasDecisionOwner ? (input.decisionOwner ?? null) : (existing.decision_owner ?? null)
    const nextConfirmedBy = hasConfirmedBy ? (input.confirmedBy ?? null) : (existing.confirmed_by ?? null)
    const nextParticipantNames = hasParticipantNames
      ? normalizeStringList(input.participantNames)
      : normalizeStringList(existing.participant_names)
    const nextContextRef = hasContextRef ? (input.contextRef ?? null) : (existing.context_ref ?? null)
    const nextEvidenceNotes = hasEvidenceNotes ? (input.evidenceNotes ?? null) : (existing.evidence_notes ?? null)

    const result = await client.query(
      `
        UPDATE decisions
        SET category = $2,
            status = $3,
            rationale = CASE WHEN $4 THEN $5 ELSE rationale END,
            source_ref = CASE WHEN $6 THEN $7 ELSE source_ref END,
            classified_at = CASE WHEN $2 IS DISTINCT FROM category THEN NOW() ELSE classified_at END,
            classified_by = CASE WHEN $2 IS DISTINCT FROM category THEN $8 ELSE classified_by END,
            supersedes_ids = $9,
            decision_owner = $10,
            confirmed_by = $11,
            participant_names = $12,
            context_ref = $13,
            evidence_notes = $14,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [
        id,
        nextCategory,
        nextStatus,
        Object.prototype.hasOwnProperty.call(input, 'rationale'),
        input.rationale ?? null,
        Object.prototype.hasOwnProperty.call(input, 'sourceRef'),
        input.sourceRef ?? null,
        actor,
        nextSupersedesIds,
        nextDecisionOwner,
        nextConfirmedBy,
        nextParticipantNames,
        nextContextRef,
        nextEvidenceNotes,
      ]
    )

    const shouldApplySupersedes = (nextStatus === 'locked' || existing.status === 'locked') && nextSupersedesIds.length
    const appliedSupersedesIds = shouldApplySupersedes
      ? await markSupersededDecisions(client, nextSupersedesIds, id, actor)
      : []

    let eventType = 'decision_classified'
    let summary = `Updated decision ${id}`

    if (existing.status !== nextStatus && nextStatus === 'locked') {
      eventType = 'decision_locked'
      summary = `Locked decision ${id}`
    } else if (existing.status !== nextStatus && nextStatus === 'superseded') {
      eventType = 'decision_superseded'
      summary = `Superseded decision ${id}`
    } else if (existing.category !== nextCategory) {
      eventType = 'decision_classified'
      summary = `Reclassified decision ${id} as ${nextCategory}`
    }

    if (appliedSupersedesIds.length) {
      summary += ` · supersedes ${appliedSupersedesIds.join(', ')}`
    }

    await insertChangeEvent(client, {
      eventType,
      entityTable: 'decisions',
      entityId: id,
      actor,
      summary,
      metadata: {
        before: {
          category: existing.category,
          status: existing.status,
          supersedesIds: existing.supersedes_ids || [],
          decisionOwner: existing.decision_owner ?? null,
          confirmedBy: existing.confirmed_by ?? null,
          participantNames: existing.participant_names || [],
          contextRef: existing.context_ref ?? null,
        },
        after: {
          category: nextCategory,
          status: nextStatus,
          supersedesIds: nextSupersedesIds,
          decisionOwner: nextDecisionOwner,
          confirmedBy: nextConfirmedBy,
          participantNames: nextParticipantNames,
          contextRef: nextContextRef,
        },
      },
    })

    return mapDecisionRow(result.rows[0])
  })
}

export async function createOpenQuestion(input, actor = 'steve') {
  return withFoundationTransaction(async client => {
    const id = await getNextPrefixedId(client, 'open_questions', 'Q')
    const result = await client.query(
      `
        INSERT INTO open_questions (
          id, title, summary, owner, status
        )
        VALUES ($1,$2,$3,$4,'open')
        RETURNING *
      `,
      [id, input.title, input.summary, input.owner ?? null]
    )

    await insertChangeEvent(client, {
      eventType: 'question_created',
      entityTable: 'open_questions',
      entityId: id,
      actor,
      summary: `Opened question ${id}: ${input.title}`,
      metadata: {},
    })

    return mapOpenQuestionRow(result.rows[0])
  })
}

export async function updateOpenQuestion(id, input, actor = 'steve') {
  return withFoundationTransaction(async client => {
    const existingResult = await client.query(`SELECT * FROM open_questions WHERE id = $1`, [id])
    const existing = existingResult.rows[0]
    if (!existing) throw new Error(`Open question not found: ${id}`)

    const nextStatus = input.status ?? existing.status ?? 'open'
    const resolving = existing.status !== 'resolved' && nextStatus === 'resolved'
    const reopening = existing.status === 'resolved' && nextStatus === 'open'

    const result = await client.query(
      `
        UPDATE open_questions
        SET title = COALESCE($2, title),
            summary = COALESCE($3, summary),
            owner = COALESCE($4, owner),
            status = $5,
            resolved_at = CASE
              WHEN $5 = 'resolved' AND resolved_at IS NULL THEN NOW()
              WHEN $5 = 'open' THEN NULL
              ELSE resolved_at
            END,
            resolved_by = CASE
              WHEN $5 = 'resolved' AND resolved_by IS NULL THEN $6
              WHEN $5 = 'open' THEN NULL
              ELSE resolved_by
            END,
            resolution_note = CASE
              WHEN $5 = 'resolved' THEN COALESCE($7, resolution_note)
              WHEN $5 = 'open' THEN NULL
              ELSE resolution_note
            END,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [id, input.title ?? null, input.summary ?? null, input.owner ?? null, nextStatus, actor, input.resolutionNote ?? null]
    )

    let eventType = 'question_updated'
    let summary = `Updated question ${id}`
    if (resolving) {
      eventType = 'question_resolved'
      summary = `Resolved question ${id}`
    } else if (reopening) {
      eventType = 'question_reopened'
      summary = `Reopened question ${id}`
    }

    await insertChangeEvent(client, {
      eventType,
      entityTable: 'open_questions',
      entityId: id,
      actor,
      summary,
      metadata: {
        before: { status: existing.status || 'open', owner: existing.owner },
        after: { status: nextStatus, owner: input.owner ?? existing.owner },
      },
    })

    return mapOpenQuestionRow(result.rows[0])
  })
}

export async function listPendingDocUpdates() {
  const result = await pool.query(
    `
      SELECT p.id, p.decision_id, d.title AS decision_title, d.category AS decision_category, d.status AS decision_status,
             d.source_ref AS decision_source_ref, d.decision_owner AS decision_owner, d.confirmed_by AS decision_confirmed_by,
             d.participant_names AS decision_participant_names, d.context_ref AS decision_context_ref,
             d.evidence_notes AS decision_evidence_notes, d.rationale AS decision_rationale,
             p.target_doc_path, p.target_section, p.summary,
             p.current_text, p.proposed_text, p.proposed_diff, p.status, p.proposed_at, p.proposed_by,
             p.reviewed_at, p.reviewed_by, p.applied_at, p.applied_commit, p.expires_at, p.metadata
      FROM pending_doc_updates p
      LEFT JOIN decisions d ON d.id = p.decision_id
      ORDER BY p.proposed_at DESC
    `
  )

  return result.rows.map(mapPendingDocUpdateRow)
}

export async function getPendingDocUpdate(id) {
  const result = await pool.query(
    `
      SELECT p.id, p.decision_id, d.title AS decision_title, d.category AS decision_category, d.status AS decision_status,
             d.source_ref AS decision_source_ref, d.decision_owner AS decision_owner, d.confirmed_by AS decision_confirmed_by,
             d.participant_names AS decision_participant_names, d.context_ref AS decision_context_ref,
             d.evidence_notes AS decision_evidence_notes, d.rationale AS decision_rationale,
             p.target_doc_path, p.target_section, p.summary,
             p.current_text, p.proposed_text, p.proposed_diff, p.status, p.proposed_at, p.proposed_by,
             p.reviewed_at, p.reviewed_by, p.applied_at, p.applied_commit, p.expires_at, p.metadata
      FROM pending_doc_updates p
      LEFT JOIN decisions d ON d.id = p.decision_id
      WHERE p.id = $1
    `,
    [id]
  )

  return result.rows[0] ? mapPendingDocUpdateRow(result.rows[0]) : null
}

export async function createPendingDocUpdate(input, actor = 'steve') {
  return withFoundationTransaction(async client => {
    const id = await getNextPrefixedId(client, 'pending_doc_updates', 'DU')
    const result = await client.query(
      `
        INSERT INTO pending_doc_updates (
          id, decision_id, target_doc_path, target_section, summary,
          current_text, proposed_text, proposed_diff, proposed_by, expires_at, metadata
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW() + INTERVAL '72 hours',$10::jsonb)
        RETURNING *
      `,
      [
        id,
        input.decisionId ?? null,
        input.targetDocPath,
        input.targetSection ?? null,
        input.summary,
        input.currentText ?? null,
        input.proposedText,
        input.proposedDiff ?? null,
        actor,
        JSON.stringify(input.metadata || {}),
      ]
    )

    await insertChangeEvent(client, {
      eventType: 'doc_update_proposed',
      entityTable: 'pending_doc_updates',
      entityId: id,
      actor,
      summary: `Proposed doc update ${id} for ${input.targetDocPath}`,
      metadata: {
        decisionId: input.decisionId ?? null,
        targetDocPath: input.targetDocPath,
        targetSection: input.targetSection ?? null,
      },
    })

    return mapPendingDocUpdateRow({ ...result.rows[0], decision_title: null })
  })
}

export async function approvePendingDocUpdate(id, actor = 'steve') {
  return withFoundationTransaction(async client => {
    const existingResult = await client.query(
      `SELECT id, status FROM pending_doc_updates WHERE id = $1 FOR UPDATE`,
      [id]
    )
    const existing = existingResult.rows[0]
    if (!existing) throw new Error(`Pending doc update not found: ${id}`)
    if (!['pending', 'failed'].includes(existing.status)) {
      throw new Error(`Pending doc update ${id} cannot be approved from ${existing.status}`)
    }

    const result = await client.query(
      `
        UPDATE pending_doc_updates
        SET status = 'approved',
            reviewed_at = NOW(),
            reviewed_by = $2,
            metadata = metadata - 'errorDetail' - 'partialWrite'
        WHERE id = $1
        RETURNING *
      `,
      [id, actor]
    )

    const row = result.rows[0]
    if (!row) throw new Error(`Pending doc update not found: ${id}`)

    await insertChangeEvent(client, {
      eventType: 'doc_update_approved',
      entityTable: 'pending_doc_updates',
      entityId: id,
      actor,
      summary: `Approved doc update ${id}`,
      metadata: {
        decisionId: row.decision_id ?? null,
        targetDocPath: row.target_doc_path,
        targetSection: row.target_section ?? null,
      },
    })

    return mapPendingDocUpdateRow({ ...row, decision_title: null })
  })
}

export async function rejectPendingDocUpdate(id, actor = 'steve') {
  return withFoundationTransaction(async client => {
    const existingResult = await client.query(
      `SELECT id, status FROM pending_doc_updates WHERE id = $1 FOR UPDATE`,
      [id]
    )
    const existing = existingResult.rows[0]
    if (!existing) throw new Error(`Pending doc update not found: ${id}`)
    if (!['pending', 'approved', 'failed'].includes(existing.status)) {
      throw new Error(`Pending doc update ${id} cannot be rejected from ${existing.status}`)
    }

    const result = await client.query(
      `
        UPDATE pending_doc_updates
        SET status = 'rejected',
            reviewed_at = NOW(),
            reviewed_by = $2
        WHERE id = $1
        RETURNING *
      `,
      [id, actor]
    )

    const row = result.rows[0]
    if (!row) throw new Error(`Pending doc update not found: ${id}`)

    await insertChangeEvent(client, {
      eventType: 'doc_update_rejected',
      entityTable: 'pending_doc_updates',
      entityId: id,
      actor,
      summary: `Rejected doc update ${id}`,
      metadata: {
        decisionId: row.decision_id ?? null,
        targetDocPath: row.target_doc_path,
        targetSection: row.target_section ?? null,
      },
    })

    return mapPendingDocUpdateRow({ ...row, decision_title: null })
  })
}

export async function markPendingDocUpdateFailed(id, metadata, actor = 'system') {
  return withFoundationTransaction(async client => {
    const existingResult = await client.query(
      `SELECT id, status FROM pending_doc_updates WHERE id = $1 FOR UPDATE`,
      [id]
    )
    const existing = existingResult.rows[0]
    if (!existing) throw new Error(`Pending doc update not found: ${id}`)
    if (!['approved', 'failed'].includes(existing.status)) {
      throw new Error(`Pending doc update ${id} cannot be marked failed from ${existing.status}`)
    }

    const result = await client.query(
      `
        UPDATE pending_doc_updates
        SET status = 'failed',
            reviewed_at = NOW(),
            reviewed_by = $2,
            metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
        WHERE id = $1
        RETURNING *
      `,
      [id, actor, JSON.stringify(metadata || {})]
    )

    const row = result.rows[0]
    if (!row) throw new Error(`Pending doc update not found: ${id}`)

    await insertChangeEvent(client, {
      eventType: 'doc_update_failed',
      entityTable: 'pending_doc_updates',
      entityId: id,
      actor,
      summary: `Doc update ${id} failed during apply`,
      metadata: {
        ...(metadata || {}),
        decisionId: row.decision_id ?? null,
        targetDocPath: row.target_doc_path,
        targetSection: row.target_section ?? null,
      },
    })

    return mapPendingDocUpdateRow({ ...row, decision_title: null })
  })
}

export async function markPendingDocUpdateApplied(id, appliedCommit, actor = 'system') {
  return withFoundationTransaction(async client => {
    const pendingResult = await client.query(`SELECT * FROM pending_doc_updates WHERE id = $1 FOR UPDATE`, [id])
    const pending = pendingResult.rows[0]
    if (!pending) throw new Error(`Pending doc update not found: ${id}`)
    if (!['approved', 'failed'].includes(pending.status)) {
      throw new Error(`Pending doc update ${id} cannot be applied from ${pending.status}`)
    }

    const result = await client.query(
      `
        UPDATE pending_doc_updates
        SET status = 'applied',
            reviewed_at = COALESCE(reviewed_at, NOW()),
            reviewed_by = COALESCE(reviewed_by, $2),
            applied_at = NOW(),
            applied_commit = $3,
            metadata = metadata - 'errorDetail' - 'partialWrite'
        WHERE id = $1
        RETURNING *
      `,
      [id, actor, appliedCommit]
    )

    if (pending.decision_id) {
      await client.query(
        `
          UPDATE decisions
          SET status = CASE WHEN status = 'proposed' THEN 'locked' ELSE status END,
              updated_at = NOW()
          WHERE id = $1
        `,
        [pending.decision_id]
      )

      await insertChangeEvent(client, {
        eventType: 'decision_locked',
        entityTable: 'decisions',
        entityId: pending.decision_id,
        actor,
        summary: `Locked decision ${pending.decision_id}`,
        metadata: { docUpdateId: id },
      })
    }

    await insertChangeEvent(client, {
      eventType: 'doc_update_applied',
      entityTable: 'pending_doc_updates',
      entityId: id,
      actor,
      summary: `Applied doc update ${id}`,
      metadata: {
        appliedCommit,
        decisionId: pending.decision_id ?? null,
        targetDocPath: pending.target_doc_path,
        targetSection: pending.target_section ?? null,
      },
    })

    return mapPendingDocUpdateRow({ ...result.rows[0], decision_title: null })
  })
}

export async function getDocSourceSnapshot(docPath) {
  if (docPath === BHAG_DOC_PATH) {
    try {
      return await getLiveBhagSourceSnapshot()
    } catch (error) {
      console.warn(`Falling back to stored BHAG snapshot: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  if (docPath === AGENT_ENGINE_DOC_PATH) {
    try {
      return await getLiveAgentEngineSourceSnapshot()
    } catch (error) {
      console.warn(`Falling back to stored Agent Engine snapshot: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const result = await pool.query(
    `
      SELECT doc_path AS "docPath", source_id AS "sourceId", group_title AS "groupTitle",
             label, value, detail, as_of AS "asOf", sort_order AS "sortOrder"
      FROM doc_source_snapshots
      WHERE doc_path = $1
      ORDER BY group_title ASC, sort_order ASC, created_at ASC
    `,
    [docPath]
  )

  return result.rows
}

export async function saveStrategyHubSnapshot(input = {}, actor = 'system') {
  const snapshotKey = String(input.snapshotKey || input.snapshot_key || 'source_to_gap_route_review').trim()
  if (!snapshotKey) throw new Error('Strategy Hub snapshot key is required.')
  const payload = input.payload && typeof input.payload === 'object' && !Array.isArray(input.payload)
    ? input.payload
    : {}
  const generatedAt = input.generatedAt || input.generated_at || payload.generatedAt || new Date().toISOString()
  const sourceStatus = input.sourceStatus || input.source_status || 'live'
  if (!['live', 'degraded'].includes(sourceStatus)) throw new Error(`Invalid Strategy Hub snapshot source status: ${sourceStatus}`)

  const result = await pool.query(
    `
      INSERT INTO strategy_hub_snapshots (
        snapshot_key, payload, source_status, generated_at, updated_at, updated_by
      )
      VALUES ($1,$2::jsonb,$3,$4,NOW(),$5)
      ON CONFLICT (snapshot_key) DO UPDATE SET
        payload = EXCLUDED.payload,
        source_status = EXCLUDED.source_status,
        generated_at = EXCLUDED.generated_at,
        updated_at = NOW(),
        updated_by = EXCLUDED.updated_by
      RETURNING snapshot_key, payload, source_status, generated_at, updated_at, updated_by
    `,
    [snapshotKey, JSON.stringify(payload), sourceStatus, generatedAt, actor]
  )
  return {
    snapshotKey: result.rows[0].snapshot_key,
    payload: result.rows[0].payload || {},
    sourceStatus: result.rows[0].source_status,
    generatedAt: result.rows[0].generated_at?.toISOString?.() || result.rows[0].generated_at,
    updatedAt: result.rows[0].updated_at?.toISOString?.() || result.rows[0].updated_at,
    updatedBy: result.rows[0].updated_by,
  }
}

export async function getStrategyHubSnapshot(snapshotKey = 'source_to_gap_route_review') {
  const normalizedKey = String(snapshotKey || '').trim()
  if (!normalizedKey) throw new Error('Strategy Hub snapshot key is required.')
  const result = await pool.query(
    `
      SELECT snapshot_key, payload, source_status, generated_at, updated_at, updated_by
      FROM strategy_hub_snapshots
      WHERE snapshot_key = $1
    `,
    [normalizedKey]
  )
  const row = result.rows[0]
  if (!row) return null
  return {
    snapshotKey: row.snapshot_key,
    payload: row.payload || {},
    sourceStatus: row.source_status,
    generatedAt: row.generated_at?.toISOString?.() || row.generated_at,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
    updatedBy: row.updated_by,
  }
}

export async function listFubLeadSourceRules() {
  const result = await pool.query(
    `
      SELECT source_name, marketing_type, ownership_type, flag_state, source_group, notes, updated_at, updated_by
      FROM fub_lead_source_rules
      ORDER BY source_name ASC
    `
  )

  return result.rows.map(mapFubLeadSourceRuleRow)
}

export async function getFubLeadSourceSnapshot(contextKey) {
  const result = await pool.query(
    `
      SELECT context_key, context_label, payload, unique_sources, people_scanned, pages_scanned,
             truncated, refreshed_at, refreshed_by
      FROM fub_lead_source_snapshots
      WHERE context_key = $1
      LIMIT 1
    `,
    [contextKey]
  )

  if (!result.rows.length) return null
  return mapFubLeadSourceSnapshotRow(result.rows[0])
}

export async function upsertFubLeadSourceRule(input, actor = 'steve') {
  return withFoundationTransaction(async client => {
    const source = String(input.source || '').trim()
    if (!source) throw new Error('Lead source is required.')

    const marketingType = String(input.marketingType || 'unclassified').trim() || 'unclassified'
    const ownershipType = String(input.ownershipType || 'unclassified').trim() || 'unclassified'
    const flagState = String(input.flagState || 'none').trim() || 'none'
    const sourceGroup = input.sourceGroup == null ? null : String(input.sourceGroup).trim() || null
    const notes = input.notes == null ? null : String(input.notes).trim() || null

    const result = await client.query(
      `
        INSERT INTO fub_lead_source_rules (
          source_name, marketing_type, ownership_type, flag_state, source_group, notes, updated_at, updated_by
        )
        VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7)
        ON CONFLICT (source_name) DO UPDATE SET
          marketing_type = EXCLUDED.marketing_type,
          ownership_type = EXCLUDED.ownership_type,
          flag_state = EXCLUDED.flag_state,
          source_group = EXCLUDED.source_group,
          notes = EXCLUDED.notes,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by
        RETURNING source_name, marketing_type, ownership_type, flag_state, source_group, notes, updated_at, updated_by
      `,
      [source, marketingType, ownershipType, flagState, sourceGroup, notes, actor]
    )

    return mapFubLeadSourceRuleRow(result.rows[0])
  })
}

export async function saveFubLeadSourceSnapshot(input, actor = 'steve') {
  return withFoundationTransaction(async client => {
    const contextKey = String(input.contextKey || '').trim()
    const contextLabel = String(input.contextLabel || '').trim()
    if (!contextKey) throw new Error('FUB lead-source snapshot context key is required.')
    if (!contextLabel) throw new Error('FUB lead-source snapshot context label is required.')

    const sources = Array.isArray(input.sources)
      ? input.sources
          .map(function(item) {
            var source = String(item && item.source || '').trim()
            if (!source) return null
            return {
              source,
              count: Math.max(0, Number(item.count) || 0),
            }
          })
          .filter(Boolean)
      : []

    const scan = input.scan || {}
    const result = await client.query(
      `
        INSERT INTO fub_lead_source_snapshots (
          context_key, context_label, payload, unique_sources, people_scanned, pages_scanned,
          truncated, refreshed_at, refreshed_by
        )
        VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, NOW(), $8)
        ON CONFLICT (context_key) DO UPDATE SET
          context_label = EXCLUDED.context_label,
          payload = EXCLUDED.payload,
          unique_sources = EXCLUDED.unique_sources,
          people_scanned = EXCLUDED.people_scanned,
          pages_scanned = EXCLUDED.pages_scanned,
          truncated = EXCLUDED.truncated,
          refreshed_at = NOW(),
          refreshed_by = EXCLUDED.refreshed_by
        RETURNING context_key, context_label, payload, unique_sources, people_scanned, pages_scanned,
                  truncated, refreshed_at, refreshed_by
      `,
      [
        contextKey,
        contextLabel,
        JSON.stringify(sources),
        Math.max(0, Number(scan.uniqueSources) || sources.length),
        Math.max(0, Number(scan.peopleScanned) || 0),
        Math.max(0, Number(scan.pagesScanned) || 0),
        Boolean(scan.truncated),
        actor,
      ]
    )

    return mapFubLeadSourceSnapshotRow(result.rows[0])
  })
}

export async function listSalesListingAssignments(taskIds = []) {
  const normalizedTaskIds = Array.from(new Set((taskIds || []).map(id => String(id || '').trim()).filter(Boolean)))
  if (!normalizedTaskIds.length) return []

  try {
    const result = await pool.query(
      `
        SELECT clickup_task_id, listing_title, listing_url, agent_name, reset_date,
               days_since_reset, assigned_leader_key, assigned_leader_name,
               assigned_leader_email, action_plan_status, case_status,
               outcome_status, action_plan_state, action_plan_no_reason,
               first_seen_stale_date, stale_since_date, original_reset_date,
               current_reset_date, adjusted_at, adjustment_detected_at,
               action_plan_text, metadata, created_at, updated_at, updated_by
        FROM sales_listing_assignments
        WHERE clickup_task_id = ANY($1::text[])
      `,
      [normalizedTaskIds]
    )

    return result.rows.map(mapSalesListingAssignmentRow)
  } catch (error) {
    if (error?.code === '42P01') return []
    throw error
  }
}

export async function listSalesListingCases() {
  try {
    const result = await pool.query(
      `
        SELECT clickup_task_id, listing_title, listing_url, agent_name, reset_date,
               days_since_reset, assigned_leader_key, assigned_leader_name,
               assigned_leader_email, action_plan_status, case_status,
               outcome_status, action_plan_state, action_plan_no_reason,
               first_seen_stale_date, stale_since_date, original_reset_date,
               current_reset_date, adjusted_at, adjustment_detected_at,
               action_plan_text, metadata, created_at, updated_at, updated_by
        FROM sales_listing_assignments
        ORDER BY updated_at DESC, clickup_task_id ASC
      `
    )

    return result.rows.map(mapSalesListingAssignmentRow)
  } catch (error) {
    if (error?.code === '42P01') return []
    throw error
  }
}

export async function upsertSalesListingAssignment(input = {}, actor = 'system') {
  const taskId = String(input.clickUpTaskId || input.taskId || '').trim()
  if (!taskId) throw new Error('ClickUp task id is required.')
  const hasCaseStatus = Object.prototype.hasOwnProperty.call(input, 'caseStatus')
  const hasOutcomeStatus = Object.prototype.hasOwnProperty.call(input, 'outcomeStatus')
  const hasActionPlanState = Object.prototype.hasOwnProperty.call(input, 'actionPlanState')
  const hasActionPlanNoReason = Object.prototype.hasOwnProperty.call(input, 'actionPlanNoReason')
  const hasActionPlanText = Object.prototype.hasOwnProperty.call(input, 'actionPlanText')
  const existingResult = await pool.query('SELECT * FROM sales_listing_assignments WHERE clickup_task_id = $1 LIMIT 1', [taskId])
  const existing = existingResult.rows[0] ? mapSalesListingAssignmentRow(existingResult.rows[0]) : null
  const inputMetadata = input.metadata && typeof input.metadata === 'object' ? input.metadata : {}
  const nextCaseHistory = buildSalesCaseHistory(existing, input, inputMetadata, actor, {
    hasCaseStatus,
    hasOutcomeStatus,
    hasActionPlanState,
    hasActionPlanNoReason,
    hasActionPlanText,
  })
  const metadata = nextCaseHistory ? { ...inputMetadata, caseHistory: nextCaseHistory } : inputMetadata

  const result = await pool.query(
    `
      INSERT INTO sales_listing_assignments (
        clickup_task_id, listing_title, listing_url, agent_name, reset_date,
        days_since_reset, assigned_leader_key, assigned_leader_name,
        assigned_leader_email, action_plan_status, case_status, outcome_status,
        action_plan_state, action_plan_no_reason, first_seen_stale_date,
        stale_since_date, original_reset_date, current_reset_date, adjusted_at,
        adjustment_detected_at, action_plan_text, metadata, updated_by,
        created_at, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11, 'identified'),COALESCE($12, 'open'),COALESCE($13, 'unknown'),COALESCE($14, ''),$15,$16,$17,$18,$19,$20,COALESCE($21, ''),$22::jsonb,$23,NOW(),NOW())
      ON CONFLICT (clickup_task_id) DO UPDATE
      SET listing_title = EXCLUDED.listing_title,
          listing_url = EXCLUDED.listing_url,
          agent_name = EXCLUDED.agent_name,
          reset_date = EXCLUDED.reset_date,
          days_since_reset = EXCLUDED.days_since_reset,
          assigned_leader_key = EXCLUDED.assigned_leader_key,
          assigned_leader_name = EXCLUDED.assigned_leader_name,
          assigned_leader_email = EXCLUDED.assigned_leader_email,
          action_plan_status = EXCLUDED.action_plan_status,
          case_status = CASE WHEN $11 IS NULL THEN sales_listing_assignments.case_status ELSE EXCLUDED.case_status END,
          outcome_status = CASE WHEN $12 IS NULL THEN sales_listing_assignments.outcome_status ELSE EXCLUDED.outcome_status END,
          action_plan_state = CASE WHEN $13 IS NULL THEN sales_listing_assignments.action_plan_state ELSE EXCLUDED.action_plan_state END,
          action_plan_no_reason = CASE WHEN $14 IS NULL THEN sales_listing_assignments.action_plan_no_reason ELSE EXCLUDED.action_plan_no_reason END,
          first_seen_stale_date = COALESCE(sales_listing_assignments.first_seen_stale_date, EXCLUDED.first_seen_stale_date),
          stale_since_date = COALESCE(sales_listing_assignments.stale_since_date, EXCLUDED.stale_since_date),
          original_reset_date = COALESCE(sales_listing_assignments.original_reset_date, EXCLUDED.original_reset_date),
          current_reset_date = EXCLUDED.current_reset_date,
          adjusted_at = COALESCE(EXCLUDED.adjusted_at, sales_listing_assignments.adjusted_at),
          adjustment_detected_at = COALESCE(EXCLUDED.adjustment_detected_at, sales_listing_assignments.adjustment_detected_at),
          action_plan_text = CASE WHEN $21 IS NULL THEN sales_listing_assignments.action_plan_text ELSE EXCLUDED.action_plan_text END,
          metadata = sales_listing_assignments.metadata || EXCLUDED.metadata,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
      RETURNING clickup_task_id, listing_title, listing_url, agent_name,
                reset_date, days_since_reset, assigned_leader_key,
                assigned_leader_name, assigned_leader_email, action_plan_status,
                case_status, outcome_status, action_plan_state,
                action_plan_no_reason, first_seen_stale_date, stale_since_date,
                original_reset_date, current_reset_date, adjusted_at,
                adjustment_detected_at, action_plan_text, metadata, created_at,
                updated_at, updated_by
    `,
    [
      taskId,
      String(input.listingTitle || '').trim(),
      String(input.listingUrl || '').trim(),
      String(input.agentName || '').trim(),
      input.resetDate || null,
      input.daysSinceReset == null ? null : Number(input.daysSinceReset),
      String(input.assignedLeaderKey || '').trim(),
      String(input.assignedLeaderName || '').trim(),
      String(input.assignedLeaderEmail || '').trim(),
      String(input.actionPlanStatus || 'not_started').trim(),
      hasCaseStatus ? String(input.caseStatus || 'identified').trim() : null,
      hasOutcomeStatus ? String(input.outcomeStatus || 'open').trim() : null,
      hasActionPlanState ? String(input.actionPlanState || 'unknown').trim() : null,
      hasActionPlanNoReason ? String(input.actionPlanNoReason || '').trim() : null,
      input.firstSeenStaleDate || null,
      input.staleSinceDate || null,
      input.originalResetDate || input.resetDate || null,
      input.currentResetDate || input.resetDate || null,
      input.adjustedAt || null,
      input.adjustmentDetectedAt || null,
      hasActionPlanText ? String(input.actionPlanText || '').trim() : null,
      JSON.stringify(metadata),
      actor,
    ]
  )

  return mapSalesListingAssignmentRow(result.rows[0])
}

export async function upsertAgentOnboardingFeedbackResponse(input, actor = 'agent-feedback') {
  const tokenHash = String(input.tokenHash || '').trim()
  const clickUpTaskId = String(input.clickUpTaskId || '').trim()
  const agentName = String(input.agentName || '').trim()
  const milestoneDay = Number(input.milestoneDay)
  const score = Number(input.score)
  const improvementFeedback = String(input.improvementFeedback || '').trim()
  const userAgent = input.userAgent == null ? null : String(input.userAgent).slice(0, 500)

  if (!tokenHash) throw new Error('Feedback token hash is required.')
  if (!clickUpTaskId) throw new Error('ClickUp task id is required.')
  if (!agentName) throw new Error('Agent name is required.')
  if (![30, 60, 90].includes(milestoneDay)) throw new Error('Invalid feedback milestone.')
  if (!Number.isInteger(score) || score < 1 || score > 10) throw new Error('Feedback score must be between 1 and 10.')

  return withFoundationTransaction(async client => {
    const result = await client.query(
      `
        INSERT INTO agent_onboarding_feedback_responses (
          id, token_hash, clickup_task_id, agent_name, milestone_day, score,
          improvement_feedback, submitted_at, user_agent, metadata, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9::jsonb, NOW(), NOW())
        ON CONFLICT (token_hash) DO NOTHING
        RETURNING id, token_hash, clickup_task_id, agent_name, milestone_day, score,
                  improvement_feedback, submitted_at, user_agent, metadata, created_at, updated_at
      `,
      [
        randomUUID(),
        tokenHash,
        clickUpTaskId,
        agentName,
        milestoneDay,
        score,
        improvementFeedback,
        userAgent,
        JSON.stringify({
          actor,
          source: 'aios-agent-feedback-form',
          ...(input.metadata && typeof input.metadata === 'object' ? input.metadata : {}),
        }),
      ]
    )

    if (!result.rows[0]) {
      throw new Error('Feedback link has already been used.')
    }

    return mapAgentOnboardingFeedbackResponseRow(result.rows[0])
  })
}

export async function getActiveAgentFeedbackSendAttempt(input = {}) {
  const taskId = String(input.taskId || input.clickUpTaskId || '').trim()
  const milestoneDay = Number(input.milestoneDay)
  if (!taskId) throw new Error('ClickUp task id is required.')
  if (![30, 60, 90].includes(milestoneDay)) throw new Error('Invalid feedback milestone.')

  const result = await pool.query(
    `
      SELECT id, clickup_task_id, agent_name, milestone_day, token_hash, status,
             gmail_message_id, gmail_thread_id, metadata, created_at, updated_at
      FROM agent_onboarding_feedback_send_attempts
      WHERE clickup_task_id = $1
        AND milestone_day = $2
        AND status IN ('sending', 'sent', 'clickup_requested')
      ORDER BY updated_at DESC
      LIMIT 1
    `,
    [taskId, milestoneDay],
  )

  return result.rows[0] ? mapAgentOnboardingFeedbackSendAttemptRow(result.rows[0]) : null
}

export async function createAgentFeedbackSendAttempt(input = {}) {
  const taskId = String(input.taskId || input.clickUpTaskId || '').trim()
  const agentName = String(input.agentName || '').trim()
  const milestoneDay = Number(input.milestoneDay)
  const tokenHash = String(input.tokenHash || '').trim()

  if (!taskId) throw new Error('ClickUp task id is required.')
  if (!agentName) throw new Error('Agent name is required.')
  if (![30, 60, 90].includes(milestoneDay)) throw new Error('Invalid feedback milestone.')
  if (!tokenHash) throw new Error('Feedback token hash is required.')

  const result = await pool.query(
    `
      INSERT INTO agent_onboarding_feedback_send_attempts (
        id, clickup_task_id, agent_name, milestone_day, token_hash, status, metadata, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, 'sending', $6::jsonb, NOW(), NOW())
      RETURNING id, clickup_task_id, agent_name, milestone_day, token_hash, status,
                gmail_message_id, gmail_thread_id, metadata, created_at, updated_at
    `,
    [
      randomUUID(),
      taskId,
      agentName,
      milestoneDay,
      tokenHash,
      JSON.stringify(input.metadata && typeof input.metadata === 'object' ? input.metadata : {}),
    ],
  )

  return mapAgentOnboardingFeedbackSendAttemptRow(result.rows[0])
}

export async function updateAgentFeedbackSendAttemptStatus(id, input = {}) {
  const attemptId = String(id || '').trim()
  const status = String(input.status || '').trim()
  if (!attemptId) throw new Error('Send attempt id is required.')
  if (!['sending', 'sent', 'clickup_requested', 'failed', 'superseded'].includes(status)) {
    throw new Error('Invalid feedback send attempt status.')
  }

  const result = await pool.query(
    `
      UPDATE agent_onboarding_feedback_send_attempts
      SET status = $2,
          gmail_message_id = COALESCE($3, gmail_message_id),
          gmail_thread_id = COALESCE($4, gmail_thread_id),
          metadata = metadata || $5::jsonb,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, clickup_task_id, agent_name, milestone_day, token_hash, status,
                gmail_message_id, gmail_thread_id, metadata, created_at, updated_at
    `,
    [
      attemptId,
      status,
      input.gmailMessageId || null,
      input.gmailThreadId || null,
      JSON.stringify(input.metadata && typeof input.metadata === 'object' ? input.metadata : {}),
    ],
  )

  if (!result.rows[0]) throw new Error('Feedback send attempt not found.')
  return mapAgentOnboardingFeedbackSendAttemptRow(result.rows[0])
}

export async function listAgentFeedbackSendAttemptsForMilestone(input = {}) {
  const taskId = String(input.taskId || input.clickUpTaskId || '').trim()
  const milestoneDay = Number(input.milestoneDay)
  if (!taskId) throw new Error('ClickUp task id is required.')
  if (![30, 60, 90].includes(milestoneDay)) throw new Error('Invalid feedback milestone.')

  const result = await pool.query(
    `
      SELECT id, clickup_task_id, agent_name, milestone_day, token_hash, status,
             gmail_message_id, gmail_thread_id, metadata, created_at, updated_at
      FROM agent_onboarding_feedback_send_attempts
      WHERE clickup_task_id = $1
        AND milestone_day = $2
      ORDER BY updated_at DESC
    `,
    [taskId, milestoneDay],
  )

  return result.rows.map(mapAgentOnboardingFeedbackSendAttemptRow)
}

export async function supersedeAgentFeedbackSendAttemptForRepair(id, input = {}) {
  const attemptId = String(id || '').trim()
  if (!attemptId) throw new Error('Send attempt id is required.')
  const result = await pool.query(
    `
      UPDATE agent_onboarding_feedback_send_attempts
      SET status = 'superseded',
          metadata = metadata || $2::jsonb,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, clickup_task_id, agent_name, milestone_day, token_hash, status,
                gmail_message_id, gmail_thread_id, metadata, created_at, updated_at
    `,
    [
      attemptId,
      JSON.stringify({
        supersededByRepair: true,
        repairCardId: input.repairCardId || '',
        repairReason: input.repairReason || '',
        supersededAt: new Date().toISOString(),
        evidencePreserved: true,
      }),
    ],
  )

  if (!result.rows[0]) throw new Error('Feedback send attempt not found.')
  return mapAgentOnboardingFeedbackSendAttemptRow(result.rows[0])
}

export async function getAgentOnboardingFeedbackResponseForMilestone(input = {}) {
  const taskId = String(input.taskId || input.clickUpTaskId || '').trim()
  const milestoneDay = Number(input.milestoneDay)
  if (!taskId) throw new Error('ClickUp task id is required.')
  if (![30, 60, 90].includes(milestoneDay)) throw new Error('Invalid feedback milestone.')

  const result = await pool.query(
    `
      SELECT id, token_hash, clickup_task_id, agent_name, milestone_day, score,
             improvement_feedback, submitted_at, user_agent, metadata, created_at, updated_at
      FROM agent_onboarding_feedback_responses
      WHERE clickup_task_id = $1
        AND milestone_day = $2
        AND COALESCE((metadata ->> 'supersededByRepair')::boolean, false) = false
      ORDER BY submitted_at DESC
      LIMIT 1
    `,
    [taskId, milestoneDay],
  )

  return result.rows[0] ? mapAgentOnboardingFeedbackResponseRow(result.rows[0]) : null
}

export async function getAgentOnboardingFeedbackResponseByTokenHash(tokenHash) {
  const normalizedTokenHash = String(tokenHash || '').trim()
  if (!normalizedTokenHash) throw new Error('Feedback token hash is required.')

  const result = await pool.query(
    `
      SELECT id, token_hash, clickup_task_id, agent_name, milestone_day, score,
             improvement_feedback, submitted_at, user_agent, metadata, created_at, updated_at
      FROM agent_onboarding_feedback_responses
      WHERE token_hash = $1
      LIMIT 1
    `,
    [normalizedTokenHash],
  )

  return result.rows[0] ? mapAgentOnboardingFeedbackResponseRow(result.rows[0]) : null
}

export async function listAgentOnboardingFeedbackResponsesForMilestone(input = {}) {
  const taskId = String(input.taskId || input.clickUpTaskId || '').trim()
  const milestoneDay = Number(input.milestoneDay)
  if (!taskId) throw new Error('ClickUp task id is required.')
  if (![30, 60, 90].includes(milestoneDay)) throw new Error('Invalid feedback milestone.')

  const result = await pool.query(
    `
      SELECT id, token_hash, clickup_task_id, agent_name, milestone_day, score,
             improvement_feedback, submitted_at, user_agent, metadata, created_at, updated_at
      FROM agent_onboarding_feedback_responses
      WHERE clickup_task_id = $1
        AND milestone_day = $2
      ORDER BY submitted_at DESC
    `,
    [taskId, milestoneDay],
  )

  return result.rows.map(mapAgentOnboardingFeedbackResponseRow)
}

export async function supersedeAgentOnboardingFeedbackResponseForRepair(id, input = {}) {
  const responseId = String(id || '').trim()
  if (!responseId) throw new Error('Feedback response id is required.')
  const result = await pool.query(
    `
      UPDATE agent_onboarding_feedback_responses
      SET metadata = metadata || $2::jsonb,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, token_hash, clickup_task_id, agent_name, milestone_day, score,
                improvement_feedback, submitted_at, user_agent, metadata, created_at, updated_at
    `,
    [
      responseId,
      JSON.stringify({
        supersededByRepair: true,
        repairCardId: input.repairCardId || '',
        repairReason: input.repairReason || '',
        supersededAt: new Date().toISOString(),
        evidencePreserved: true,
      }),
    ],
  )

  if (!result.rows[0]) throw new Error('Feedback response not found.')
  return mapAgentOnboardingFeedbackResponseRow(result.rows[0])
}

export async function listAgentFeedbackReminderAttemptsForMilestone(input = {}) {
  const taskId = String(input.taskId || input.clickUpTaskId || '').trim()
  const milestoneDay = Number(input.milestoneDay)
  if (!taskId) throw new Error('ClickUp task id is required.')
  if (![30, 60, 90].includes(milestoneDay)) throw new Error('Invalid feedback milestone.')

  const result = await pool.query(
    `
      SELECT id, clickup_task_id, agent_name, milestone_day, reminder_slot_key,
             reminder_due_at, status, gmail_message_id, gmail_thread_id,
             metadata, created_at, updated_at
      FROM agent_onboarding_feedback_reminder_attempts
      WHERE clickup_task_id = $1
        AND milestone_day = $2
      ORDER BY reminder_due_at ASC, updated_at DESC
    `,
    [taskId, milestoneDay],
  )

  return result.rows.map(mapAgentOnboardingFeedbackReminderAttemptRow)
}

export async function getAgentFeedbackReminderAttemptBySlot(input = {}) {
  const taskId = String(input.taskId || input.clickUpTaskId || '').trim()
  const milestoneDay = Number(input.milestoneDay)
  const reminderSlotKey = String(input.reminderSlotKey || '').trim()
  if (!taskId) throw new Error('ClickUp task id is required.')
  if (![30, 60, 90].includes(milestoneDay)) throw new Error('Invalid feedback milestone.')
  if (!reminderSlotKey) throw new Error('Reminder slot key is required.')

  const result = await pool.query(
    `
      SELECT id, clickup_task_id, agent_name, milestone_day, reminder_slot_key,
             reminder_due_at, status, gmail_message_id, gmail_thread_id,
             metadata, created_at, updated_at
      FROM agent_onboarding_feedback_reminder_attempts
      WHERE clickup_task_id = $1
        AND milestone_day = $2
        AND reminder_slot_key = $3
      LIMIT 1
    `,
    [taskId, milestoneDay, reminderSlotKey],
  )

  return result.rows[0] ? mapAgentOnboardingFeedbackReminderAttemptRow(result.rows[0]) : null
}

export async function createAgentFeedbackReminderAttempt(input = {}) {
  const taskId = String(input.taskId || input.clickUpTaskId || '').trim()
  const agentName = String(input.agentName || '').trim()
  const milestoneDay = Number(input.milestoneDay)
  const reminderSlotKey = String(input.reminderSlotKey || '').trim()
  const reminderDueAt = input.reminderDueAt ? new Date(input.reminderDueAt) : null
  if (!taskId) throw new Error('ClickUp task id is required.')
  if (!agentName) throw new Error('Agent name is required.')
  if (![30, 60, 90].includes(milestoneDay)) throw new Error('Invalid feedback milestone.')
  if (!reminderSlotKey) throw new Error('Reminder slot key is required.')
  if (!reminderDueAt || Number.isNaN(reminderDueAt.getTime())) throw new Error('Valid reminder due date is required.')

  const result = await pool.query(
    `
      INSERT INTO agent_onboarding_feedback_reminder_attempts (
        id, clickup_task_id, agent_name, milestone_day, reminder_slot_key,
        reminder_due_at, status, gmail_message_id, gmail_thread_id, metadata, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'pending', NULL, NULL, $7::jsonb, NOW(), NOW())
      ON CONFLICT (clickup_task_id, milestone_day, reminder_slot_key) DO NOTHING
      RETURNING id, clickup_task_id, agent_name, milestone_day, reminder_slot_key,
                reminder_due_at, status, gmail_message_id, gmail_thread_id,
                metadata, created_at, updated_at
    `,
    [
      randomUUID(),
      taskId,
      agentName,
      milestoneDay,
      reminderSlotKey,
      reminderDueAt.toISOString(),
      JSON.stringify(input.metadata && typeof input.metadata === 'object' ? input.metadata : {}),
    ],
  )

  if (result.rows[0]) return mapAgentOnboardingFeedbackReminderAttemptRow(result.rows[0])
  return getAgentFeedbackReminderAttemptBySlot({ taskId, milestoneDay, reminderSlotKey })
}

export async function updateAgentFeedbackReminderAttemptStatus(id, input = {}) {
  const attemptId = String(id || '').trim()
  const status = String(input.status || '').trim()
  if (!attemptId) throw new Error('Reminder attempt id is required.')
  if (!['pending', 'sending', 'sent', 'skipped', 'blocked', 'maxed_out', 'repair', 'failed'].includes(status)) {
    throw new Error('Invalid feedback reminder attempt status.')
  }

  const result = await pool.query(
    `
      UPDATE agent_onboarding_feedback_reminder_attempts
      SET status = $2,
          gmail_message_id = COALESCE($3, gmail_message_id),
          gmail_thread_id = COALESCE($4, gmail_thread_id),
          metadata = metadata || $5::jsonb,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, clickup_task_id, agent_name, milestone_day, reminder_slot_key,
                reminder_due_at, status, gmail_message_id, gmail_thread_id,
                metadata, created_at, updated_at
    `,
    [
      attemptId,
      status,
      input.gmailMessageId || null,
      input.gmailThreadId || null,
      JSON.stringify(input.metadata && typeof input.metadata === 'object' ? input.metadata : {}),
    ],
  )

  if (!result.rows[0]) throw new Error('Feedback reminder attempt not found.')
  return mapAgentOnboardingFeedbackReminderAttemptRow(result.rows[0])
}

export async function getAgentFeedbackResponseNotificationByResponseId(responseId) {
  const normalizedResponseId = String(responseId || '').trim()
  if (!normalizedResponseId) throw new Error('Feedback response id is required.')

  const result = await pool.query(
    `
      SELECT id, response_id, clickup_task_id, agent_name, milestone_day, status,
             gmail_message_id, gmail_thread_id, metadata, created_at, updated_at
      FROM agent_onboarding_feedback_response_notifications
      WHERE response_id = $1
      ORDER BY updated_at DESC
      LIMIT 1
    `,
    [normalizedResponseId],
  )

  return result.rows[0] ? mapAgentOnboardingFeedbackResponseNotificationRow(result.rows[0]) : null
}

export async function createAgentFeedbackResponseNotification(input = {}) {
  const responseId = String(input.responseId || '').trim()
  const taskId = String(input.taskId || input.clickUpTaskId || '').trim()
  const agentName = String(input.agentName || '').trim()
  const milestoneDay = Number(input.milestoneDay)
  if (!responseId) throw new Error('Feedback response id is required.')
  if (!taskId) throw new Error('ClickUp task id is required.')
  if (!agentName) throw new Error('Agent name is required.')
  if (![30, 60, 90].includes(milestoneDay)) throw new Error('Invalid feedback milestone.')

  const result = await pool.query(
    `
      INSERT INTO agent_onboarding_feedback_response_notifications (
        id, response_id, clickup_task_id, agent_name, milestone_day, status,
        gmail_message_id, gmail_thread_id, metadata, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, 'sending', NULL, NULL, $6::jsonb, NOW(), NOW())
      ON CONFLICT (response_id) DO NOTHING
      RETURNING id, response_id, clickup_task_id, agent_name, milestone_day, status,
                gmail_message_id, gmail_thread_id, metadata, created_at, updated_at
    `,
    [
      randomUUID(),
      responseId,
      taskId,
      agentName,
      milestoneDay,
      JSON.stringify(input.metadata && typeof input.metadata === 'object' ? input.metadata : {}),
    ],
  )

  if (result.rows[0]) return mapAgentOnboardingFeedbackResponseNotificationRow(result.rows[0])
  return getAgentFeedbackResponseNotificationByResponseId(responseId)
}

export async function updateAgentFeedbackResponseNotificationStatus(id, input = {}) {
  const notificationId = String(id || '').trim()
  const status = String(input.status || '').trim()
  if (!notificationId) throw new Error('Response notification id is required.')
  if (!['sending', 'sent', 'failed'].includes(status)) {
    throw new Error('Invalid feedback response notification status.')
  }

  const result = await pool.query(
    `
      UPDATE agent_onboarding_feedback_response_notifications
      SET status = $2,
          gmail_message_id = COALESCE($3, gmail_message_id),
          gmail_thread_id = COALESCE($4, gmail_thread_id),
          metadata = metadata || $5::jsonb,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, response_id, clickup_task_id, agent_name, milestone_day, status,
                gmail_message_id, gmail_thread_id, metadata, created_at, updated_at
    `,
    [
      notificationId,
      status,
      input.gmailMessageId || null,
      input.gmailThreadId || null,
      JSON.stringify(input.metadata && typeof input.metadata === 'object' ? input.metadata : {}),
    ],
  )

  if (!result.rows[0]) throw new Error('Feedback response notification record not found.')
  return mapAgentOnboardingFeedbackResponseNotificationRow(result.rows[0])
}

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
