# KPI-HEALTH-API-CACHE-001 Plan

Status: approved for build
Card: `KPI-HEALTH-API-CACHE-001`
Sprint: `kpi-health-api-cache-2026-05-15`
Closeout key: `kpi-health-api-cache-v1`

## What

Finish the KPI health request-path boundary so Foundation and hub routes use cached/degraded KPI health and individual Supabase probes have an explicit timeout.

V1 is a bounded reliability slice:

- keep `/api/source-of-truth` and hub read paths on `getCachedSafeKpiHealthSnapshot()`;
- add a per-probe KPI fetch timeout and degraded error shape;
- add focused dogfood proof that a slow KPI fetch is blocked by timeout instead of hanging a route;
- close the existing scoped P0 card without changing KPI data semantics.

## Why

The nightly audit flagged KPI health as a request-path timeout risk. A previous route-budget sprint already added a KPI route cache, which is useful but incomplete: if the cache refresh path performs unbounded Supabase fetches, a slow provider can still drag refreshes, worker jobs, or direct health checks.

Root invariant: external source health belongs in source-health surfaces and should degrade visibly. It must not become unbounded route drag for Foundation, Sales, Ops, or future hubs.

Operator value and useful operator behavior: Steve and the team can open Foundation, Sales, Ops, and future hub views without waiting on a slow KPI/Supabase health probe. This unlocks speed and quality for the real workflow: if Supabase is slow, the system reports degraded KPI health within budget instead of blocking the operator route, so source-health problems become visible decisions instead of app slowness.

## Acceptance Criteria

- KPI route consumers continue to use `getCachedSafeKpiHealthSnapshot()` rather than direct live probes on normal request paths.
- KPI Supabase fetches use an explicit timeout budget.
- Timeout failures are returned as degraded/risk KPI health with `probeSilent: true`, not thrown through hub/source routes.
- Dogfood proof simulates a slow KPI fetch and proves the timeout fires.
- Focused proof measures `/api/source-of-truth` and `/api/foundation-hub` and confirms KPI health payloads expose cache metadata.
- The focused check script is read-only by default. It performs no live backlog/sprint/database writes. If a future check adds writes, that future change must use explicit `--apply` posture and prove no-flag writes are blocked.
- No KPI writes, no schema changes, no Sales/Marketing/Ops hub feature work, and no broad KPI redesign.

## Definition Of Done

- `docs/process/approvals/KPI-HEALTH-API-CACHE-001.json` exists and validates at score `>= 9.8`.
- Durable Plan Critic pass row exists for `KPI-HEALTH-API-CACHE-001`.
- `npm run process:kpi-health-api-cache-check -- --json` passes.
- `npm run backlog:hygiene -- --json` passes.
- `npm run foundation:verify -- --json-summary` passes.
- `npm run process:foundation-ship -- --card=KPI-HEALTH-API-CACHE-001 --planApprovalRef=docs/process/approvals/KPI-HEALTH-API-CACHE-001.json --closeoutKey=kpi-health-api-cache-v1 --commitRef=HEAD` passes before push.
- Live backlog card is `done`, Current Sprint shows the card in `done_this_sprint`, and Recent Work exposes `kpi-health-api-cache-v1`.

## Details

Implementation path:

1. Add KPI health constants/helpers in `lib/kpi-health.js` for per-fetch timeout and dogfood proof.
2. Update the internal Supabase fetch path to attach an `AbortSignal` by default.
3. Add `scripts/process-kpi-health-api-cache-check.mjs` as a read-only focused proof.
4. Register `process:kpi-health-api-cache-check` in `package.json`.
5. Add thin `scripts/foundation-verify.mjs` coverage delegating to the focused behavior proof.
6. Add closeout record and rebuild plan/state notes.

Existing work reused:

- Existing code: `getCachedSafeKpiHealthSnapshot()`, `refreshKpiHealthRouteCache()`, `getSafeKpiHealthSnapshot()`, source-of-truth payload builder, hub read route cache wiring, route-budget verifier helpers, and Current Sprint helpers.
- Existing docs: `docs/handoffs/nightly-deep-audit-2026-05-14.md`, `docs/handoffs/2026-05-15-nightly-deep-audit-p0-triage.md`, `docs/rebuild/current-plan.md`, and `docs/rebuild/current-state.md`.
- Existing scripts: `kpi:health`, `process:foundation-route-budget-cleanup-check`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`.
- Existing policy: external source failures should surface as degraded source health, not take down Foundation or hub routes.

Split plan for oversized files: keep verifier coverage thin. Behavior lives in `lib/kpi-health.js` and the focused proof script. Do not grow `server.js`, `lib/foundation-db.js`, or the verifier with broad inline logic.

Actual function path: the proof calls the KPI timeout dogfood helper and real cached KPI route APIs. Substring-only proof is rejected; source markers can only support behavior proof. The check path is read-only by default and has no apply mode because V1 has no write behavior.

Gate decision tree: static syntax checks cover changed JS/JSON, focused proof validates KPI timeout/cache behavior, and the full ship gate is required because this touches Foundation source health, verifier coverage, package scripts, Current Sprint truth, and Recent Work.

## Risks

- Risk: timeout handling breaks successful KPI reads.
  - Repair path: keep timeout wrapping at the fetch boundary and preserve the existing response parsing/headers.
- Risk: cache hides real KPI health failures.
  - Repair path: cache metadata stays visible; direct `kpi:health` remains the live proof path; route cache is an optimization, not source truth.
- Risk: this turns into KPI/Sales feature work.
  - Repair path: V1 only changes health/read reliability. No Sales dashboard, no KPI writes, no new data model.
- Risk: the verifier grows again.
  - Repair path: verifier receives only thin delegated coverage.

## Tests

Run in order:

```bash
node --check lib/kpi-health.js scripts/process-kpi-health-api-cache-check.mjs scripts/foundation-verify.mjs
npm run process:kpi-health-api-cache-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=KPI-HEALTH-API-CACHE-001 --planApprovalRef=docs/process/approvals/KPI-HEALTH-API-CACHE-001.json --closeoutKey=kpi-health-api-cache-v1 --commitRef=HEAD
```

Not next: KPI writes, Sales Hub feature work, Marketing Video Lab live routes, broad source extraction, paid-source auth, schema redesign, full KPI dashboard rebuild, broad Foundation DB rewrite, Meeting Vault Phase B, or Drive permission mutation.
