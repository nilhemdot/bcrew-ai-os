# FOUNDATION-RUNTIME-READ-ROUTES-SPLIT-001 Plan

## What

Extract only the read-only Foundation runtime status routes from `server.js` into `lib/foundation-runtime-read-routes.js`:

- `GET /api/foundation/jobs`
- `GET /api/foundation/active-processes`
- `GET /api/foundation/llm-runtime`
- `GET /api/foundation/extraction-control`

`server.js` will keep a thin `registerFoundationRuntimeReadRoutes(app, deps)` call. The new module receives dependencies from `server.js`; it does not import DB helpers directly.

This is a narrow server monolith split. It does not change route behavior, runtime data models, auth, hub UI, or any mutation route.

## Why

Steve and the team need speed with quality in the real Foundation workflow. The useful operator value is that Runtime Health and source-health diagnosis keep loading while the server monolith shrinks, so Steve can see jobs, active processes, LLM runtime, and extraction control without waiting on a 6,800-line route owner. `server.js` is still over 6,800 lines, and runtime read routes are bounded enough to move without building a feature. This improves reviewability for future runtime/source-health work and keeps the system tighter without slowing down into broad refactor work.

Existing code, existing docs, existing scripts, live backlog, and Current Sprint truth are reused:

- Existing code: `server.js`, `getFoundationJobRunSnapshot()`, `buildRuntimeProcessControlApiSnapshot()`, `getLlmRuntimeSnapshot()`, `getExtractionControlSnapshot()`, `requireAdminToken`, `sendApiError`, and `cacheHeadersNoStore`.
- Existing docs: `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, and prior server/FUB route split closeouts.
- Existing scripts: `scripts/process-fub-source-route-split-check.mjs`, `scripts/process-server-route-split-check.mjs`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`.
- Existing policy: AGENTS.md Foundation rebuild discipline, dogfood proof per audit-fix card, no verifier/check live-state mutation, and explicit not-next boundaries.

## Acceptance Criteria

- `FOUNDATION-RUNTIME-READ-ROUTES-SPLIT-001` is closed under `foundation-runtime-read-routes-split-v1`.
- `lib/foundation-runtime-read-routes.js` owns the four read route strings and exports `registerFoundationRuntimeReadRoutes()`.
- `server.js` delegates through `registerFoundationRuntimeReadRoutes(app, deps)` and no longer owns the four moved inline GET handlers.
- Mutating runtime control routes stay in `server.js` and are absent from the read-route module:
  - `POST /api/foundation/jobs/:jobKey/control`
  - `POST /api/foundation/job-runs/:runId/stop`
  - `POST /api/foundation/jobs/:jobKey/decommission`
- Dogfood proof rejects missing module, old inline server route, missing registrar, and mutating runtime-control route leakage.
- Focused proof probes all four moved GET routes without POSTing job-control mutations.
- `server.js` line count decreases.
- For server.js route or API work, the plan includes a performance budget: default route under 5 seconds and under 1 MB, with a curl route proof command using --max-time and time_total/bytes output.

## Definition Of Done

- The live backlog card is `done`, the Current Sprint item is `done_this_sprint`, and Recent Builds exposes `foundation-runtime-read-routes-split-v1`.
- Plan approval validates at 9.8+ and the durable Plan Critic row passes with architecture rules enabled.
- Focused proof command passes:

```bash
npm run process:foundation-runtime-read-routes-split-check -- --json
```

- Full proof commands pass:

```bash
node --check lib/foundation-runtime-read-routes.js scripts/process-foundation-runtime-read-routes-split-check.mjs server.js scripts/foundation-verify.mjs
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-RUNTIME-READ-ROUTES-SPLIT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-RUNTIME-READ-ROUTES-SPLIT-001.json --closeoutKey=foundation-runtime-read-routes-split-v1 --commitRef=HEAD
```

## Details

Implementation:

1. Add `lib/foundation-runtime-read-routes.js`.
2. Move the four GET route handlers into `registerFoundationRuntimeReadRoutes(app, deps)`.
3. Keep the route dependencies injected from `server.js`.
4. Leave job-control, stop, and decommission POST routes in `server.js`.
5. Register the new module in `server.js` near the existing Foundation route registrars.
6. Add `scripts/process-foundation-runtime-read-routes-split-check.mjs`.
7. Add package script `process:foundation-runtime-read-routes-split-check`.
8. Add verifier/Recent Builds/current-plan/current-state coverage.

Route budgets:

- Each moved route probe must complete under 5 seconds.
- Each moved route probe must return under 1 MB.
- The focused proof records status, `durationMs`, and bytes for each route.
- Manual curl budget check shape:

```bash
curl --max-time 5 -o /tmp/foundation-runtime-jobs.json -w "time=%{time_total} bytes=%{size_download}\n" http://localhost:3000/api/foundation/jobs?limit=1
```

Gate decision tree:

- Static checks are required for syntax.
- Focused route proof is required because this is a route ownership split.
- Full `foundation:verify` and `process:foundation-ship` are required because `server.js`, `scripts/foundation-verify.mjs`, package scripts, live Current Sprint, and build closeouts are affected.
- For scripts/process-foundation-runtime-read-routes-split-check.mjs and scripts/foundation-verify.mjs, any live write path is read-only by default and requires explicit --apply posture. No-flag writes are blocked. This slice adds no live write path in either script.

## Risks

- Risk: a read route changes shape while being moved. Repair path: fail the focused proof, keep the route in `server.js`, and revise the module until the same GET response shape passes.
- Risk: mutating runtime controls accidentally move or become reachable through the read module. Repair path: dogfood fails when the module contains `jobs/:jobKey/control`, `job-runs/:runId/stop`, or `jobs/:jobKey/decommission`; leave those routes in `server.js`.
- Risk: the slice grows into broad runtime or server refactor work. Repair path: stop at the four GET routes and backlog any additional route cluster.
- Risk: verifier/source ownership becomes stale. Repair path: update the verifier to check the new module source for the moved route strings and keep admin-gate checks tied to the module owner.

## Tests

```bash
node --check lib/foundation-runtime-read-routes.js scripts/process-foundation-runtime-read-routes-split-check.mjs server.js scripts/foundation-verify.mjs
npm run process:foundation-runtime-read-routes-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-RUNTIME-READ-ROUTES-SPLIT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-RUNTIME-READ-ROUTES-SPLIT-001.json --closeoutKey=foundation-runtime-read-routes-split-v1 --commitRef=HEAD
```

## Not Next

- Do not change job-control, stop, or decommission mutation behavior.
- Do not run live job-control mutations as proof.
- Do not build Runtime Health UI, Sales/Ops/Marketing Hub UI, or Marketing Video Lab wiring.
- Do not mutate Google Drive permissions or work `MEETING-VAULT-ACL-001 Phase B`.
- Do not add paid-source auth, source extraction, Build Intel extraction, or a broad `server.js` rewrite.
