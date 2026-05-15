# NIGHTLY-DEEP-AUDIT-UPGRADE-001 Plan

## What

Upgrade the manual code-review posture into a scheduled nightly hybrid deep audit.

V1 runs as report-only Foundation work. It combines the existing deterministic backend/frontend scanner with changed/high-risk file selection, LLM review packet generation, optional approved LLM execution, debt/performance trend tracking, and a diff-only morning report.

## Why

Steve expected the system to catch backend bugs, frontend bugs, hardcoded truth, slow routes, write-boundary leaks, monolith growth, and simplification opportunities every night. What existed was weaker: a deterministic report-first scanner plus a manual recurring deep-audit contract.

The operator value is an actual nightly reviewer loop that surfaces new or worsening code quality risk before it becomes another messy rebuild. The system must not auto-fix code, auto-create backlog, or pretend a scheduled scanner is the same thing as autonomous engineering judgment.

## Acceptance Criteria

- A scheduled Foundation job exists for the nightly hybrid deep audit at 03:00 America/Toronto, report-only posture, no auto-fixes, and no auto-backlog mutation.
- The audit writes a date-based report under `docs/handoffs/nightly-deep-audit-{date}.md`.
- Deterministic coverage scans backend (`lib/`, `scripts/`, `server.js`) and frontend (`public/*.js`, `public/*.html`, `public/*.css`) surfaces.
- The audit selects changed and high-risk files for senior-engineer review, including oversized files, hot routes, verifier/check paths, write-boundary code, source-health code, and frontend route/cache code.
- The LLM lane is explicit: approved/runnable routes may execute bounded report-only review; otherwise the report contains review packets and route blockers instead of silently claiming LLM review ran.
- Morning output is diff-oriented: new findings, changed severity, resolved/still-open findings, file-growth trend, endpoint/payload trend, and next review actions.
- Dogfood proof recreates the known 2026-05-13 failures: 70s API / 4.63 MB payload, self-repairing verifier, write-capable checks, hardcoded live truth/source counts, and 10K+ line monoliths.

## Definition Of Done

- New behavior lives in a small module, not inside `scripts/foundation-verify.mjs`, `lib/foundation-db.js`, `server.js`, or `public/foundation.js`.
- Package scripts expose a focused proof command and the scheduled job target.
- Morning health/runtime activation distinguishes the new scheduled reviewer from the old manual recurring audit.
- Current Sprint doctrine is populated and the card has a durable Plan Critic pass row before build.
- Focused dogfood proof passes.
- Full Foundation ship gate passes before push.

## Details

Existing code, existing docs, existing scripts, live backlog, and Current Sprint truth to reuse:

- Existing deterministic scanner: `lib/code-quality-nightly-audit.js` and `scripts/process-code-quality-nightly-audit-check.mjs`.
- Existing job registry and scheduled mutation guard: `lib/foundation-jobs.js`.
- Existing LLM router: `lib/llm-router.js`, with report-only/dry-run posture when routes are not approved or runnable.
- Existing morning health surface: `lib/connector-uptime-monitor.js`.
- Existing process gates: approval integrity, Plan Critic, Current Sprint overlay, `foundation:verify`, and `process:foundation-ship`.

Gate decision: full.

Decision tree: static proof is too weak because this changes scheduled review behavior. Focused proof must call the real audit builder and prove the historical failure fixtures are caught. Full proof is required because job scheduling, report output, verifier coverage, and Current Sprint truth change.

Architecture boundary: this card may add a new module and a new focused process script. It may make thin registrations in `package.json`, `lib/foundation-jobs.js`, `lib/connector-uptime-monitor.js`, and `scripts/foundation-verify.mjs`. It may not add large business logic to any existing monolith.

LLM boundary: a nightly audit may plan and optionally execute a bounded report-only review only through the approved router. If no runnable approved route exists, the report must say that plainly and include review packets for the next builder. It must not fake LLM review.

Verifier/check boundary: all verifier and process-check paths in this card are read-only by default, perform zero repairs, do not seed or write live state, and fail closed. The report artifact write is the only allowed output write, and it is report-only.

## Risks

- Risk: this becomes noisy and Steve stops reading it.
  - Repair path: keep the morning report diff-oriented and severity-ranked.
- Risk: this burns model credits blindly.
  - Repair path: deterministic scan always runs; LLM review is bounded, changed/high-risk only, and route-gated.
- Risk: this becomes autonomous dev.
  - Repair path: report-only posture, no auto-fixes, no auto-backlog mutation, and no code writes beyond the report artifact.
- Risk: dogfood proof becomes theater.
  - Repair path: fixtures must recreate the specific May 13 failure modes and assert detector behavior, not string markers.

## Tests

```bash
npm run process:nightly-deep-audit-upgrade-check -- --json --skipEndpointFetch
npm run process:code-quality-nightly-audit-check -- --json --skipEndpointFetch --no-write
npm run process:foundation-operating-reliability-check -- --json --no-api
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=NIGHTLY-DEEP-AUDIT-UPGRADE-001 --planApprovalRef=docs/process/approvals/NIGHTLY-DEEP-AUDIT-UPGRADE-001.json --closeoutKey=nightly-deep-audit-upgrade-v1 --commitRef=HEAD
```

Focused proof must show the scheduled job is report-only and accepted by the mutation guard, the audit writes the date-based report path, the high-risk selector includes backend/frontend/verifier/hot-route surfaces, and the dogfood fixtures catch the May 13 failures.

## Not Next

- Do not auto-fix code.
- Do not auto-create backlog cards.
- Do not build Marketing/Sales/Ops hub features.
- Do not run paid-source extraction or Build Intel extraction.
- Do not perform broad monolith refactors in this card.
- Do not add live provider spend without approved/runnable router posture.
- Do not work `MEETING-VAULT-ACL-001` Phase B or mutate Drive permissions.
