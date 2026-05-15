# SOURCE-ROUTE-SPLIT-001 Plan

## What

Extract the Foundation source/control read-route cluster from `server.js` into a named route registration module.

V1 moves only this bounded read-route cluster:

- `GET /api/source-of-truth`
- `GET /api/foundation/source-lifecycle`
- `GET /api/foundation/marketing-source-map`
- `GET /api/foundation/brand-stack`
- `GET /api/foundation/tier-behavioral-completion`
- `GET /api/foundation/verification-runs`
- `GET /api/foundation/per-user-changelog`
- `GET /api/foundation/restricted-decision-queue`
- `GET /api/foundation/source-coverage-closeout`
- `GET /api/foundation/source-extraction-coverage`
- `GET /api/foundation/source-maturity-grid`
- `GET /api/foundation/source-connector-matrix`
- `GET /api/foundation/connector-credential-preflight`
- `GET /api/foundation/source-hub-routing-matrix`

The route behavior stays the same. `server.js` becomes a thin wrapper that calls `registerFoundationSourceRoutes(app, deps)`.

## Why

`server.js` is still over 7,000 lines after `server-route-split-v1`. The source/control read routes are a natural next boundary because they are all admin-gated Foundation source visibility surfaces and they reuse the same source contract, extraction control, source matrix, and source lifecycle helpers.

This is cleanup, not a feature. The operator value is faster and safer Foundation route maintenance: source truth, source lifecycle, source coverage, connector matrix, credential preflight, and source-to-hub routing can be inspected and tested in one named module instead of hidden in the server monolith. It also dogfoods the architecture rule that plans touching files over 5,000 lines require a split/extraction plan and no new responsibility in the monolith.

Useful operator behavior this unlocks: when Steve or a hub builder asks "is a source connected, trusted, extracted, monitored, or routeable into a hub?", the code path lives in one source-route module instead of a 7,000+ line server file. That makes source-health bugs, connector-matrix regressions, and source-to-hub payload bloat faster to locate, prove, and repair without interrupting hub work or touching unrelated auth/write routes.

## Acceptance Criteria

- New module `lib/foundation-source-routes.js` registers the bounded source/control read-route cluster.
- `server.js` imports the route registrar and delegates the cluster through a thin wrapper only.
- Extracted routes keep admin gating, no-store cache behavior where already present, access-denied handling, error codes, query limits, payload shape, and existing dependencies.
- Focused proof calls live API routes and validates behavior/payload shape for every moved route.
- Focused proof dogfoods the monolith failure mode by proving the old inline source route cluster no longer lives in `server.js`.
- Source-marker checks are supplemental only. A substring/source check cannot pass this card unless live route behavior checks also pass.
- Route budget is explicit: moved routes must return under 2 seconds each in focused proof, and large source lifecycle/control payloads must stay under 1 MB each unless a route already has a documented larger diagnostic contract.
- Current Sprint, live backlog, current plan/state, closeout, Plan Critic run, and verifier coverage all name this card and closeout key.

## Definition Of Done

- `SOURCE-ROUTE-SPLIT-001` is live in backlog and closed under `source-route-split-v1`.
- `docs/process/source-route-split-001-plan.md` and `docs/process/approvals/SOURCE-ROUTE-SPLIT-001.json` exist and validate.
- `plan_critic_runs` has a durable pass row at 9.8+ for this plan with architecture rules enabled.
- `lib/foundation-source-routes.js` owns the extracted route cluster.
- `scripts/process-source-route-split-check.mjs` passes and proves live route behavior plus the split boundary.
- `server.js` line count decreases and does not gain new business logic.
- `foundation:verify` and `process:foundation-ship` pass before push.

## Details

Existing code to reuse: the current route bodies in `server.js`, `requireAdminToken`, `sendApiError`, `sendAccessDenied`, `cacheHeadersNoStore`, `AccessDeniedError`, `buildSourceOfTruthPayload`, `getFoundationSnapshot`, `getExtractionControlSnapshot`, `getSourceContracts`, `getSourceConnectors`, `getGroupedSourceSystems`, `getFoundationJobDefinitions`, source lifecycle/maturity/extraction/coverage/connector/routing helpers, marketing source map helpers, brand stack helpers, tier behavior helpers, verification runs helpers, per-user changelog helpers, restricted decision queue helpers, backlog hygiene helpers, research curation helpers, current sprint helpers, and `readFileSafe`.

Existing docs to reuse: `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, `docs/process/server-route-split-001-plan.md`, and the monolith rules in `AGENTS.md`.

Existing scripts to reuse: `backlog:hygiene`, `foundation:verify`, `process:foundation-ship`, and the recent server route split focused proof shape.

Split plan: all moved route behavior lives in the new module. `server.js` only imports `registerFoundationSourceRoutes` and passes dependencies. No new responsibility is added to `server.js`. This is not a broad server refactor; it is one route cluster extraction.

Verifier/check posture: the focused proof script is read-only by default and has no `--apply` path. It must not call `createBacklogItem`, `updateBacklogItem`, `upsertFoundationCurrentSprintOverlay`, `INSERT`, `UPDATE`, `DELETE`, `fs.writeFile`, or any live-state mutation. The verifier addition is read-only coverage only; if the route split is missing or live routes regress, it fails closed instead of repairing state.

Gate decision tree: static proof is too weak because this changes served API route registration. Focused proof is required with `npm run process:source-route-split-check -- --json`, which calls live routes and checks the exact route ownership boundary. Full proof is required because this touches `server.js`, route behavior, package scripts, verifier coverage, current sprint state, and build closeouts.

## Risks

- Risk: the extraction changes route behavior.
  - Response path: focused proof hits all moved routes and validates status/payload basics before the full verifier runs.
- Risk: `server.js` becomes smaller but the new module becomes a dumping ground.
  - Response path: closeout must say this module owns only Foundation source/control read routes; later unrelated routes need their own module.
- Risk: proof becomes substring theater.
  - Repair path: dogfood includes live HTTP route checks plus a structural check that the moved route handlers are registered in the module and not still inline in `server.js`.
- Risk: this hides the larger monolith problem.
  - Response path: closeout must explicitly state that `server.js`, `public/foundation.js`, `scripts/foundation-verify.mjs`, and `lib/foundation-db.js` still need more measured splits.

## Tests

```bash
node --check lib/foundation-source-routes.js scripts/process-source-route-split-check.mjs server.js scripts/foundation-verify.mjs
npm run process:source-route-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=SOURCE-ROUTE-SPLIT-001 --planApprovalRef=docs/process/approvals/SOURCE-ROUTE-SPLIT-001.json --closeoutKey=source-route-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the failure class by checking the old inline source route-cluster pattern in `server.js` is gone while live route behavior remains healthy. Substring-only proof is rejected: the focused proof calls actual routes and fails closed if the route calls do not pass.

## Not Next

- Do not split every `server.js` route.
- Do not touch auth/session routes.
- Do not move write routes.
- Do not wire Marketing Video Lab live routes.
- Do not build hub features or Sales/Ops/Marketing UI.
- Do not change source semantics, backlog semantics, connector status semantics, or extraction behavior.
- Do not build Build Intel extraction, paid-source auth, autonomous dev, Meeting Vault Phase B, or Drive permission mutation.
