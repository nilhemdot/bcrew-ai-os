# SOURCE-OF-TRUTH-PERF-BUDGET-001 Plan

## What
Make `/api/source-of-truth` meet an operator-route performance budget by removing the live KPI/Supabase probe from the hot request path. Preserve the same response contract while serving KPI health from a bounded cache that is refreshed by the existing health job/proof path.

## Why
The nightly deep audit flagged `/api/source-of-truth` at roughly 2.1-2.5 seconds. This route is an operator truth surface, so a slow source-health dependency makes the whole Foundation feel unreliable even when the underlying docs and source contracts are local. The useful operator value for Steve is that opening the Foundation truth surface feels fast and trustworthy instead of making the system look broken. This unlocks speed for the real workflow of checking source truth before deciding the next sprint. This is Foundation reliability work, not polish.

## Acceptance Criteria
- `/api/source-of-truth` returns the same required contract fields: `foundation`, `sources`, `connectors`, `groupedSystems`, `systemServiceAreas`, `kpiHealth`, and `systemStatus`.
- The hot route uses a cached KPI health snapshot rather than probing live Supabase on every request.
- Cached KPI health keeps `contractVersion`, `primarySurface`, `summary.probeSilent`, `tables`, `rpcs`, and `schemaDrift` compatible with existing verifier expectations.
- Dogfood proof measures the route and fails if it exceeds the committed latency budget: warmed `/api/source-of-truth` must stay under 1,000ms and under 200KB.
- Dogfood proof simulates the old audit failure by evaluating an over-budget synthetic measurement and proving the checker rejects it.
- The implementation avoids adding business logic to `server.js`; route behavior is moved behind a new module boundary because `server.js` is over 5,000 lines. `server.js` stays a thin wrapper with no new responsibility.

## Definition Of Done
- A focused proof command validates approval, Plan Critic pass, live backlog card, Current Sprint stage, route budget, KPI cache behavior, and dogfood failure rejection.
- `foundation:verify` still passes with the cached KPI snapshot exposed through `/api/source-of-truth`.
- Source-of-truth latency baseline and budget result are recorded in the sprint closeout.
- The card moves through Scoping, Sprint Ready, Building Now, and Done This Sprint with timestamps.

## Details
Reuse existing code and existing docs: `getSourceContracts()`, `getSourceConnectors()`, `getGroupedSourceSystems()`, `getSystemServiceAreas()`, `docs/business-strategy.md`, and `docs/source-registry.md`. Reuse existing scripts and live process truth: the new focused proof script, `foundation:verify`, live Backlog, Current Sprint, and `process:foundation-ship`.

Add a small `lib/source-of-truth-payload.js` module that builds the route payload from repo docs, source contracts, source connectors, grouped systems, service areas, and a cached KPI health snapshot. `server.js` should delegate to that module instead of holding the full route implementation inline.

Add a cached KPI health helper in `lib/kpi-health.js`. It should prefer a fresh in-memory snapshot, then a persisted cache file under `store/`, then live `getSafeKpiHealthSnapshot()` when no usable cache exists. Cache reads must never mutate business truth; cache writes only store the last health snapshot for route performance.

Gate decision tree: static proof is insufficient because the blast radius touches route behavior, `server.js`, and KPI health. This is a full-gate card because it touches `server.js`, `lib/kpi-health.js`, and route behavior. The focused proof comes first with `npm run process:foundation-route-budget-cleanup-check -- --json`; full proof follows with `npm run foundation:verify` and `npm run process:foundation-ship`.

This card does not weaken KPI health proof. `npm run kpi:health` and `foundation:verify` still exercise the live health path separately.

## Risks
The main risk is creating a false-green route by caching a stale or risk snapshot forever. The cache must expose metadata and stay bounded by age. If the cache is missing or stale, the helper may refresh from the live health path, but the route proof should warm the cache before measuring the hot path. If proof fails or the verifier contract regresses, repair path is fail closed, reopen `SOURCE-OF-TRUTH-PERF-BUDGET-001`, and keep the old live health path until the cached shape proves compatible.

Another risk is breaking the existing verifier contract by returning a compact KPI object. Do not compact KPI health for this card; keep the full shape intact.

## Tests
- `npm run process:foundation-route-budget-cleanup-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=SOURCE-OF-TRUTH-PERF-BUDGET-001 --planApprovalRef=docs/process/approvals/SOURCE-OF-TRUTH-PERF-BUDGET-001.json --closeoutKey=foundation-route-budget-cleanup-v1 --commitRef=HEAD`

## Not Next
Do not rebuild KPI health, change Supabase read rules, mutate source contracts, build hub features, build Marketing Video Lab UI, or broaden this into a full `server.js` refactor.
