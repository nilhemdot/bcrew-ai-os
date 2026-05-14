# CONNECTOR-UPTIME-MONITOR-001 Plan

## What

Add a recurring, read-only connector uptime monitor for the six operational connector groups Steve keeps asking about: ClickUp, FUB, Google Workspace, Slack, Missive, and KPI/Supabase.

V1 creates one normalized source-health snapshot with redacted errors, stale/due status, job linkage, and a dogfood proof. It exposes the snapshot through Foundation runtime data. It does not run paid-source auth, write to external systems, or auto-create backlog cards.

## Why

ClickUp going down should not be discovered because a ship gate or hub explodes. Foundation needs a clear health layer that answers: what connector is healthy, degraded, down, stale, manual-only, or blocked, and what should Steve do next?

This is Foundation work because hubs depend on these connectors. Sales, Ops, and Strategy can only move in parallel safely when Foundation can tell whether the source layer is alive.

## Acceptance Criteria

- Connector uptime snapshot includes ClickUp, FUB, Google Workspace, Slack, Missive, and KPI/Supabase.
- Snapshot uses read-only probes or existing job/credential metadata only.
- Errors are redacted and never expose tokens, authorization headers, API keys, cookies, or raw PII-bearing response bodies.
- Status vocabulary is normalized to healthy, degraded, down, stale, manual, blocked, or unknown.
- Runtime job definitions include a recurring read-only monitor job that passes the scheduled mutation guard.
- Foundation hub full payload exposes the connector uptime snapshot without slowing the summary route.
- Dogfood proof simulates healthy, degraded, down, stale, and secret-bearing error inputs and proves normalization plus redaction.

## Definition Of Done

- `lib/connector-uptime-monitor.js` owns the status normalization, redaction, snapshot, and dogfood proof.
- `lib/foundation-jobs.js` registers the recurring read-only monitor job.
- `server.js` exposes the snapshot on full Foundation Hub diagnostics only.
- A focused proof script validates the real snapshot and dogfood proof.
- Current Sprint doctrine is populated and the card moves through sprint_ready, building_now, and done_this_sprint.
- Full ship gate passes before push.

## Details

Reuse existing code and truth:

- Source contracts and connectors from `lib/source-contracts.js`.
- Credential metadata from `lib/connector-credential-registry.js`.
- Job scheduling and mutation posture from `lib/foundation-jobs.js`.
- Source outage fail-soft behavior from `lib/source-outage-boundary.js`.
- Foundation Hub performance split from `lib/foundation-hub-performance.js`.

Gate decision for this card: full.

Decision tree: static proof is too weak because status behavior changes; focused proof is required through the real function path and API payload; full proof is required because the blast radius touches the job registry, Foundation Hub diagnostics, package scripts, and verifier/process proof. The route touch in `server.js` must stay a thin composition layer only; durable behavior lives in the new module and does not add new responsibility to the large route file.

Existing docs to reuse: the two-sprint scope handoff, Source Outage Boundary closeout, and Current Sprint doctrine. Existing scripts to reuse: `process:source-outage-boundary-check`, `process:code-quality-nightly-audit-check`, `foundation:verify`, and `process:foundation-ship`. Live backlog and Current Sprint truth stay the source of card status.

Operator behavior unlocked: Steve and the team can see connector health before a Sales/Ops/Strategy hub workflow depends on a down source. This improves speed and quality because the operator sees the degraded connector, source ID, and next action without translating raw stack traces.

The focused proof command must be fast, proportional, and target under 2 minutes so it becomes the default pre-ship check instead of another heavy gate.

## Risks

- Risk: health monitoring becomes another live-truth snapshot that drifts.
  - Repair path: derive connector identities from source contracts, connector definitions, and job registry metadata.
- Risk: a health probe leaks raw secrets in an error.
  - Repair path: central redaction is part of the dogfood proof.
- Risk: scheduled monitoring accidentally mutates.
  - Repair path: register the job with read_only posture and prove the scheduled mutation guard accepts it.
- Risk: Foundation Hub summary gets slow again.
  - Repair path: expose detail in full diagnostics only and keep summary payload out of scope.

## Tests

```bash
npm run process:foundation-operating-reliability-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=CONNECTOR-UPTIME-MONITOR-001 --planApprovalRef=docs/process/approvals/CONNECTOR-UPTIME-MONITOR-001.json --closeoutKey=foundation-operating-reliability-v1 --commitRef=HEAD
```

Focused dogfood must recreate the failure class: feed a synthetic connector error containing token-like values and prove the monitor returns degraded/down status with redacted error text instead of crashing or leaking.

The proof command must report pass/revise style checks and reject substring-only proof. A source substring or `.includes()` marker is not accepted unless the real function behavior also passes.

## Not Next

- Do not add Skool, myICOR, Loom, or YouTube paid extraction.
- Do not build hub feature UI.
- Do not add connector writebacks.
- Do not auto-create backlog cards from connector failures.
- Do not broaden into full monolith splitting.
