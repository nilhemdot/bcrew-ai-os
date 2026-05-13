# FOUNDATION-API-PERF-AUDIT-001 Plan

## What
Build the Foundation API performance lane for the read-only nightly audit. V1 measures the required Foundation endpoints and reports status, latency, payload size, timeout behavior, and likely hotspot category.

## Why
Steve needs the Foundation control panel to feel trustworthy. Slow source-truth and Foundation APIs create operational drag, hide overfetch, and make system health look fragile even when data is correct.

## Acceptance Criteria
- `FOUNDATION-API-PERF-AUDIT-001` returns a pass/fail proof status from the focused command.
- The audit measures `/api/foundation-hub`, `/api/source-of-truth`, `/api/foundation/source-lifecycle`, `/api/foundation/build-log`, and `/api/foundation/gstack-build-intel` when a local base URL is reachable.
- Static API hotspot detectors run even when the local server is unavailable.
- A synthetic slow-endpoint fixture is classified as a performance risk through the same classifier used for real endpoint metrics.
- Findings include endpoint, file references, severity, hotspot category, and proposed follow-up card.
- The audit produces a report only and does not alter API behavior.

## Definition Of Done
- Existing code, existing docs, existing scripts, Current Sprint, live backlog, and Foundation endpoint conventions are reused.
- `lib/code-quality-nightly-audit.js` contains endpoint metric and static hotspot reporting.
- The morning report includes endpoint coverage and API follow-up proposals.
- The proof calls real metric/classifier functions and rejects report-only marker proof.

## Details
The V1 route budget is report-first. It identifies request-time KPI probes, `getFoundationSnapshot()` overfetch, source lifecycle overfetch, GStack request-time scans, build-log git subprocess cost, and oversized hub payload risk. Behavior proof calls the actual function path `measureFoundationEndpoint`, the endpoint-risk classifier, real local API route fetches when available, a report write/read round-trip, and a synthetic weak endpoint fixture. Gate decision tree: static hotspot checks plus focused endpoint proof first, then full `process:foundation-ship` because the blast radius touches package scripts, verifier coverage, job registry, and process docs. The focused check remains fast, targeting under 2 minutes through bounded fetch timeouts, so Steve and the operator team can trust the report without waiting on a heavy audit.

## Risks
Risk is unstable local runtime timing. Repair path is to keep static hotspot findings authoritative and mark live endpoint metrics as unavailable when the server is not reachable. Risk is tuning budgets too tightly; repair path is adjust thresholds after Steve reviews the first report quality.

## Tests
- `npm run process:code-quality-nightly-audit-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=CODEBASE-HARDCODE-AUDIT-001 --planApprovalRef=docs/process/approvals/CODEBASE-HARDCODE-AUDIT-001.json --closeoutKey=foundation-code-quality-nightly-audit-v1 --commitRef=HEAD`

## Not Next
Do not cache, slim, or refactor APIs in this sprint. Do not change route payloads. Do not schedule the audit job until Steve approves report quality.
