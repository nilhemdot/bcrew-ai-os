# Code Quality Nightly Audit Report - 2026-05-13

Closeout key: `foundation-code-quality-nightly-audit-v1`
Sprint: `foundation-code-quality-nightly-audit-2026-05-13`
Generated at: `2026-05-13T18:07:09.423Z`

## Morning Read

- Status: `report_ready`
- Findings: 79 total (51 P0, 20 P1, 7 P2, 1 P3)
- Proposed backlog fixes: 28
- Detection mode: deterministic code first; no LLM detection used.
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev, no feature work.
- Synthetic proof: passed (hardcoded=2, mutator=1, slowEndpoint=risk)

## Endpoint Coverage

- /api/foundation-hub: status=200 latency=2839ms payload=4633376B risk=risk (Latency 2839ms exceeds 2000ms budget.)
- /api/source-of-truth: status=200 latency=2519ms payload=133868B risk=risk (Latency 2519ms exceeds 2000ms budget.)
- /api/foundation/source-lifecycle: status=200 latency=324ms payload=665298B risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: status=200 latency=61ms payload=316264B risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: status=200 latency=49ms payload=33955B risk=healthy (Within V1 audit budget.)

## Asset And Monolith Metrics

Assets:
- public/foundation.js: 612773B raw, 115632B gzip, 16055 lines
- public/styles.css: 191210B raw, 26597B gzip, 9750 lines
- public/foundation.html: 6908B raw, 1569B gzip, 102 lines

Largest files:
- lib/foundation-db.js: 18908 LOC, 1057750B
- public/foundation.js: 16055 LOC, 612773B
- scripts/foundation-verify.mjs: 13508 LOC, 750197B
- public/styles.css: 9750 LOC, 191210B
- server.js: 7641 LOC, 271150B
- lib/foundation-build-log.js: 5650 LOC, 378586B
- lib/foundation-current-sprint.js: 1594 LOC, 79114B
- lib/intelligence-action-router.js: 1567 LOC, 66835B

## Top Findings

### P0 Current Sprint upsert helper defaults to active and closes other active sprints
- Card lane: `SPRINT-STATE-MUTATION-AUDIT-001`
- Type: `drift_risk`
- Evidence: `lib/foundation-db.js:6150`, `lib/foundation-db.js:6072`
- Why it matters: A proof/check script can accidentally become the active sprint writer unless active writes require explicit confirmation.
- Proposed owner/card: Foundation Process / `SPRINT-MUTATION-SAFE-MODE-001`
- Detector: active sprint default detector

### P0 Focused checks assert exact dated active sprint IDs
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `lib/foundation-current-sprint.js:102` (const FOUNDATION_CURRENT_SPRINT_ID = 'foundation-current-2026-05-12), `lib/foundation-current-sprint.js:143` (const FOUNDATION_SOURCE_ONCE_OVER_SPRINT_ID = 'foundation-source-once-over-2026-05-12), `lib/gstack-build-intel.js:13` (const GSTACK_BUILD_INTEL_SPRINT_ID = 'gstack-build-intel-extraction-2026-05-13), `scripts/process-atom-flow-auto-demotion-check.mjs:28` (const SPRINT_ID = 'source-truth-guardrails-2026-05-13), `scripts/process-build-intel-extraction-check.mjs:78` (activeSprint.sprint?.sprintId ===), `scripts/process-connector-credential-check.mjs:31` (const SPRINT_ID = 'control-plane-connector-readiness-2026-05-12)
- Why it matters: One-time closeout checks are unsafe as nightly checks after rollover if they hard-fail on the current active sprint.
- Proposed owner/card: Foundation Process / `SPRINT-CHECK-HISTORICAL-MODE-001`
- Detector: dated active-sprint assertion detector
- False-positive note: Acceptable only in explicitly historical closeout or migration checks.

### P0 Foundation DB mixes schema, seed, stores, and query APIs
- Card lane: `FOUNDATION-MONOLITH-RISK-AUDIT-001`
- Type: `refactor_candidate`
- Evidence: `lib/foundation-db.js:7467`
- Why it matters: Large mixed-responsibility surfaces slow audits, increase merge risk, and make future proof harder to isolate.
- Proposed owner/card: Foundation Engineering / `FOUNDATION-DB-SCHEMA-SEED-SPLIT-001`
- Detector: largest file/function ownership detector
- False-positive note: This is not approval to refactor during the audit sprint.

### P0 /api/foundation-hub is an all-in-one aggregation chokepoint
- Card lane: `FOUNDATION-API-PERF-AUDIT-001`
- Type: `performance_risk`
- Evidence: `server.js:5112`, `lib/foundation-db.js:14017`
- Why it matters: The first Foundation render depends on the heaviest aggregate endpoint and serial builder fanout.
- Proposed owner/card: Foundation API / `FOUNDATION-HUB-API-PERF-BUDGET-001`
- Detector: foundation hub aggregate route detector
- False-positive note: Aggregator routes are fine when section timing, payload budgets, and cache boundaries are explicit.

### P0 Foundation verifier is one large execution surface
- Card lane: `FOUNDATION-MONOLITH-RISK-AUDIT-001`
- Type: `refactor_candidate`
- Evidence: `scripts/foundation-verify.mjs:1369`
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
- Evidence: `lib/foundation-build-log.js:667`
- Why it matters: Current Sprint command truth must come from live sprint records, not stale code or docs that can block rollover.
- Proposed owner/card: Foundation verifier / `LIVE-TRUTH-VERIFY-DECOUPLE-001`
- Detector: Current Sprint dated-string detector
- False-positive note: Historical closeout sections are acceptable when explicitly labeled as history.

### P0 Live-looking Current Sprint truth is hardcoded
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/foundation-verify.mjs:10866`
- Why it matters: Current Sprint command truth must come from live sprint records, not stale code or docs that can block rollover.
- Proposed owner/card: Foundation verifier / `LIVE-TRUTH-VERIFY-DECOUPLE-001`
- Detector: Current Sprint dated-string detector
- False-positive note: Historical closeout sections are acceptable when explicitly labeled as history.

### P0 Live-looking Current Sprint truth is hardcoded
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-connector-credential-check.mjs:31`
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
- Evidence: `scripts/process-llm-auth-audit-check.mjs:23`
- Why it matters: Current Sprint command truth must come from live sprint records, not stale code or docs that can block rollover.
- Proposed owner/card: Foundation verifier / `LIVE-TRUTH-VERIFY-DECOUPLE-001`
- Detector: Current Sprint dated-string detector
- False-positive note: Historical closeout sections are acceptable when explicitly labeled as history.

### P0 Live-looking Current Sprint truth is hardcoded
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `scripts/process-source-extraction-gap-followup-check.mjs:42`
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
- Evidence: `server.js:217`, `lib/kpi-health.js:289`
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

## Findings By Sprint Card

- `CODEBASE-HARDCODE-AUDIT-001`: 22 findings
- `FOUNDATION-API-PERF-AUDIT-001`: 8 findings
- `FOUNDATION-FRONTEND-PERF-AUDIT-001`: 3 findings
- `FOUNDATION-MONOLITH-RISK-AUDIT-001`: 5 findings
- `VERIFIER-ASSUMPTION-REGISTRY-001`: 3 findings
- `SPRINT-STATE-MUTATION-AUDIT-001`: 38 findings
- `NIGHTLY-AUDIT-REPORT-001`: 0 findings

## Proposed Backlog Fixes

- `SPRINT-MUTATION-SAFE-MODE-001`
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
