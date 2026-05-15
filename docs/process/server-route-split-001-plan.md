# SERVER-ROUTE-SPLIT-001 Plan

## What

Extract the Foundation operator read-route cluster from `server.js` into a named route registration module.

V1 moves only the bounded operator cluster:

- `GET /api/foundation/changes`
- `GET /api/foundation/change-log`
- `GET /api/foundation/daily-summary`
- `GET /api/foundation/build-log`
- `GET /api/foundation/backlog/:cardId`
- `GET /api/foundation/doc-updates`

The route behavior stays the same. `server.js` becomes a thin wrapper that calls `registerFoundationOperatorRoutes(app, deps)`.

## Why

`server.js` is over 7,000 lines and keeps absorbing Foundation route responsibility. That is the same monolith pattern Steve called out: one large file becomes the place every future route patch lands.

This card is cleanup, not a feature. The operator value is faster, safer Foundation review work for Steve and the team: future fixes to change log, daily summary, build log, doc updates, and single-card backlog detail can be found and tested in one named route module instead of hidden in a 7,000+ line server file. This unlocks a real workflow where Foundation route bugs are easier to inspect, prove, and ship without slowing hub work. It also dogfoods the architecture rule that plans touching files over 5,000 lines must include a split plan and no new responsibility.

## Acceptance Criteria

- New module `lib/foundation-operator-routes.js` registers the bounded operator route cluster.
- `server.js` imports the route registrar and delegates the cluster through a thin wrapper only.
- The extracted routes keep admin gating, no-store cache behavior where already present, error codes, query limits, payload shape, and existing dependencies.
- Focused proof calls live API routes and validates behavior for each moved route, including valid/missing/malformed backlog detail behavior.
- Focused proof dogfoods the monolith failure mode by proving the operator route cluster no longer lives inline in `server.js`.
- Source-marker checks are supplemental only. A substring/source check cannot pass this card unless the live route behavior checks also pass.
- Route budget is explicit: moved routes must return under 2 seconds each in focused proof, and `/api/foundation/backlog/:cardId` must remain under 500ms and 50KB.
- Current Sprint, live backlog, current plan/state, closeout, Plan Critic run, and verifier coverage all name this card and closeout key.

## Definition Of Done

- `SERVER-ROUTE-SPLIT-001` is live in backlog and closed under `server-route-split-v1`.
- `docs/process/server-route-split-001-plan.md` and `docs/process/approvals/SERVER-ROUTE-SPLIT-001.json` exist and validate.
- `plan_critic_runs` has a durable pass row at 9.8+ for this plan with architecture rules enabled.
- `lib/foundation-operator-routes.js` owns the extracted route cluster.
- `scripts/process-server-route-split-check.mjs` passes and proves live route behavior plus the split boundary.
- `server.js` line count decreases and does not gain new business logic.
- `foundation:verify` and `process:foundation-ship` pass before push.

## Details

Existing code to reuse: the current route bodies in `server.js`, `requireAdminToken`, `sendApiError`, `cacheHeadersNoStore`, `getRequestActor` only if needed, `getRecentChangeEvents`, `getFoundationSnapshot`, `getBacklogItemsByIds`, `listPendingDocUpdates`, build-log helpers, change-log helpers, daily-summary helpers, backlog-detail helpers, and Foundation snapshot helpers.

Existing docs to reuse: `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, the prior Foundation full-diagnostics route split plan, and the monolith rules in `AGENTS.md`.

Existing scripts to reuse: `backlog:hygiene`, `foundation:verify`, `process:foundation-ship`, and the recent backlog-detail focused proof shape.

Split plan: all moved route behavior lives in the new module. `server.js` only imports `registerFoundationOperatorRoutes` and passes dependencies. No new responsibility is added to `server.js`. This is not a broad server refactor; it is one route cluster extraction.

Verifier/check posture: the focused proof script is read-only by default and has no `--apply` path. It must not call `createBacklogItem`, `updateBacklogItem`, `upsertFoundationCurrentSprintOverlay`, `INSERT`, `UPDATE`, `DELETE`, `fs.writeFile`, or any live-state mutation. The verifier addition is read-only coverage only; if the route split is missing or live routes regress, it fails closed instead of repairing state.

Gate decision tree: static proof is too weak because this changes served API route registration. Focused proof is required with `npm run process:server-route-split-check -- --json`, which calls live routes and checks the exact route ownership boundary. Full proof is required because this touches `server.js`, route behavior, package scripts, verifier coverage, current sprint state, and build closeouts.

## Risks

- Risk: the extraction changes route behavior.
  - Response path: focused proof hits all moved routes and validates status/payload basics before the full verifier runs.
- Risk: `server.js` becomes smaller but the new module becomes a dumping ground.
  - Response path: closeout must say this module owns only Foundation operator read routes; later unrelated routes need their own module.
- Risk: proof becomes substring theater.
  - Repair path: dogfood includes live HTTP route checks plus a structural check that the moved route handlers are registered in the module and not still inline in `server.js`.
- Risk: this hides the larger monolith problem.
  - Response path: closeout must explicitly state that `server.js`, `public/foundation.js`, `scripts/foundation-verify.mjs`, and `lib/foundation-db.js` still need more measured splits.

## Tests

```bash
node --check lib/foundation-operator-routes.js scripts/process-server-route-split-check.mjs server.js scripts/foundation-verify.mjs
npm run process:server-route-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=SERVER-ROUTE-SPLIT-001 --planApprovalRef=docs/process/approvals/SERVER-ROUTE-SPLIT-001.json --closeoutKey=server-route-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the failure class by checking the old inline route-cluster pattern in `server.js` is gone while live route behavior remains healthy. Substring-only proof is rejected: the focused proof calls actual routes and fails closed if the route calls do not pass.

## Not Next

- Do not split every `server.js` route.
- Do not touch auth/session routes.
- Do not wire Marketing Video Lab live routes.
- Do not build hub features or Sales/Ops UI.
- Do not change backlog semantics or build a new backlog editor.
- Do not build Build Intel extraction, paid-source auth, autonomous dev, Meeting Vault Phase B, or Drive permission mutation.
