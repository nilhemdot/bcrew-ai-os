# Code Quality Nightly Audit Report - 2026-05-13

Closeout key: `foundation-code-quality-nightly-audit-v1`
Sprint: `foundation-code-quality-nightly-audit-2026-05-13`
Generated at: `2026-05-16T09:25:48.271Z`

## Morning Read

- Status: `report_ready`
- Findings: 57 total (40 P0, 11 P1, 6 P2, 0 P3)
- Proposed backlog fixes: 18
- Detection mode: deterministic code first; no LLM detection used.
- Mutation boundary: report-only; no auto-fixes, no auto backlog mutation, no autonomous dev, no feature work.
- Synthetic proof: passed (hardcoded=2, mutator=1, slowEndpoint=risk)

## Endpoint Coverage

- /api/foundation-hub: status=200 latency=77ms payload=526051B risk=healthy (Within V1 audit budget.)
- /api/source-of-truth: status=200 latency=14ms payload=134032B risk=healthy (Within V1 audit budget.)
- /api/foundation/source-lifecycle: status=200 latency=350ms payload=628121B risk=healthy (Within V1 audit budget.)
- /api/foundation/build-log: status=200 latency=84ms payload=366927B risk=healthy (Within V1 audit budget.)
- /api/foundation/gstack-build-intel: status=200 latency=72ms payload=33955B risk=healthy (Within V1 audit budget.)

## Asset And Monolith Metrics

Assets:
- public/foundation.html: 7685B raw, 1661B gzip, 113 lines
- public/styles.css: 489B raw, 268B gzip, 12 lines
- public/foundation-nav-config.js: 8135B raw, 2284B gzip, 171 lines
- public/foundation-data.js: 11993B raw, 2648B gzip, 399 lines
- public/foundation.js: 174221B raw, 33899B gzip, 4910 lines
- public/foundation-source-registry-renderers.js: 55416B raw, 10722B gzip, 1450 lines
- public/foundation-fub-lead-source-renderers.js: 27456B raw, 5884B gzip, 678 lines
- public/foundation-system-inventory-renderers.js: 51986B raw, 10161B gzip, 1390 lines
- public/foundation-current-state-renderers.js: 56586B raw, 12629B gzip, 1362 lines
- public/foundation-decision-question-renderers.js: 52409B raw, 9280B gzip, 1443 lines
- public/foundation-source-lifecycle-renderers.js: 65313B raw, 9812B gzip, 1498 lines
- public/foundation-runtime-renderers.js: 59394B raw, 13604B gzip, 1489 lines
- public/foundation-operations-renderers.js: 45944B raw, 9575B gzip, 1100 lines
- public/foundation-router.js: 5221B raw, 1498B gzip, 192 lines

Largest files:
- scripts/foundation-verify.mjs: 12902 LOC, 735252B
- public/foundation.js: 4910 LOC, 174221B
- server.js: 4804 LOC, 159475B
- lib/foundation-db.js: 4713 LOC, 214423B
- lib/foundation-backlog-seed.js: 4652 LOC, 477958B
- lib/foundation-build-closeout-records.js: 4328 LOC, 297517B
- lib/foundation-build-closeout-overnight-records.js: 3585 LOC, 289872B
- public/styles-foundation-workflows.css: 2526 LOC, 48968B

## Top Findings

### P0 Focused checks assert exact dated active sprint IDs
- Card lane: `CODEBASE-HARDCODE-AUDIT-001`
- Type: `drift_risk`
- Evidence: `lib/foundation-current-sprint.js:103` (const FOUNDATION_CURRENT_SPRINT_ID = 'foundation-current-2026-05-12), `lib/foundation-current-sprint.js:145` (const FOUNDATION_SOURCE_ONCE_OVER_SPRINT_ID = 'foundation-source-once-over-2026-05-12), `lib/kpi-health.js:8` (const KPI_HEALTH_API_CACHE_SPRINT_ID = 'kpi-health-api-cache-2026-05-15), `lib/gstack-build-intel.js:13` (const GSTACK_BUILD_INTEL_SPRINT_ID = 'gstack-build-intel-extraction-2026-05-13), `scripts/process-agent-feedback-routes-split-check.mjs:219` (activeSprint.sprint?.sprintId ===), `scripts/process-app-page-routes-split-check.mjs:159` (activeSprint.sprint?.sprintId ===)
- Why it matters: One-time closeout checks are unsafe as nightly checks after rollover if they hard-fail on the current active sprint.
- Proposed owner/card: Foundation Process / `SPRINT-CHECK-HISTORICAL-MODE-001`
- Detector: dated active-sprint assertion detector
- False-positive note: Acceptable only in explicitly historical closeout or migration checks.

### P0 Foundation DB mixes schema, seed, stores, and query APIs
- Card lane: `FOUNDATION-MONOLITH-RISK-AUDIT-001`
- Type: `refactor_candidate`
- Evidence: `lib/foundation-db.js:826`
- Why it matters: Large mixed-responsibility surfaces slow audits, increase merge risk, and make future proof harder to isolate.
- Proposed owner/card: Foundation Engineering / `FOUNDATION-DB-SCHEMA-SEED-SPLIT-001`
- Detector: largest file/function ownership detector
- False-positive note: This is not approval to refactor during the audit sprint.

### P0 Foundation verifier is one large execution surface
- Card lane: `FOUNDATION-MONOLITH-RISK-AUDIT-001`
- Type: `refactor_candidate`
- Evidence: `scripts/foundation-verify.mjs:2120`
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

- `CODEBASE-HARDCODE-AUDIT-001`: 9 findings
- `FOUNDATION-API-PERF-AUDIT-001`: 2 findings
- `FOUNDATION-FRONTEND-PERF-AUDIT-001`: 0 findings
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
- `FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001`
- `KPI-HEALTH-DYNAMIC-YEAR-CONTRACT-001`
- `SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001`
- `DB-SEED-001`
- `ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001`
- `APPROVAL-THRESHOLD-REGISTRY-001`
- `BUILD-CLOSEOUT-REGISTRY-EXTRACT-001`
- `BUILD-INTEL-CONTEXT-SEARCH-INDEX-001`
- `BUILD-LOG-API-CACHE-AND-SLIM-001`
- `BUILD-INTEL-SNAPSHOT-BASELINE-001`

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
