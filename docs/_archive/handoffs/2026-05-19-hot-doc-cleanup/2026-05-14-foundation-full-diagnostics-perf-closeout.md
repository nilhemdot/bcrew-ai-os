# Foundation Full Diagnostics Performance Closeout

Sprint: `foundation-full-diagnostics-perf-2026-05-14`

Closeout key: `foundation-full-diagnostics-perf-v1`

Cards:
- `FOUNDATION-FULL-DIAGNOSTICS-PERF-001`
- `FOUNDATION-HUB-FULL-ROUTE-SPLIT-001`

## What Shipped

Full Foundation diagnostics no longer waits on slow optional Agent Feedback / ClickUp panels before returning.

The profiler showed `getFoundationSnapshot()` was about 0.4s, while `buildAgentFeedbackAutoSendReadiness()` took about 82s. This sprint moved that slow optional surface behind a bounded diagnostic module. If ClickUp or the Agent Feedback scan is slow, Runtime Health now receives explicit degraded `sourceHealth` with `runtime_diagnostic_timeout`; it does not block the core Foundation diagnostic payload.

## Key Changes

- Added `lib/foundation-hub-full-diagnostics.js`.
- Added bounded ClickUp request timeout and page-cap options in `lib/clickup.js`.
- Let Agent Feedback Auto-Send and Reminder readiness accept an injected roster snapshot getter.
- Updated `/api/foundation-hub?view=full` to delegate Agent Feedback/source-outage diagnostics to the new module.
- Updated `/api/ops-hub` to reuse the same bounded diagnostics path.
- Added `scripts/process-foundation-full-diagnostics-perf-check.mjs`.
- Added two plan/approval pairs for the sprint cards.

## Proof

Focused live proof on a fresh server:

```bash
npm run process:foundation-full-diagnostics-perf-check -- --json --baseUrl=http://127.0.0.1:3010
```

Measured:

- `/api/foundation-hub?view=full`
- HTTP `200`
- `11.066248s`
- `4,710,675` bytes
- Budget: under `15s` and under `5.5 MB`
- `foundationHubFullDiagnostics.boundedSourceHealth: true`
- `sourceOutageBoundary.status: degraded`

Dogfood proof:

- Injects slow Agent Feedback builders.
- Proves the module returns degraded source health quickly.
- Proves external ClickUp slowness does not block the full diagnostic route.

## Known Limits

- Full diagnostics is faster, but still large at about `4.7 MB`.
- This is a partial `server.js` split, not a complete server route extraction.
- ClickUp is still degraded for this surface; the route now reports that clearly instead of hanging.
- The next cleanup should reduce full-diagnostics payload size or continue verifier / DB / frontend monolith splits.

## Not Shipped

- No hub feature work.
- No Build Intel extraction.
- No paid-source auth.
- No autonomous dev.
- No Meeting Vault Phase B.
- No Drive permission mutation.
