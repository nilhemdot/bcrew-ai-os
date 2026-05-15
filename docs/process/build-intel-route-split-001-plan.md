# BUILD-INTEL-ROUTE-SPLIT-001 Plan

## What

Extract the Foundation Build Intel read-route cluster from `server.js` into a named route registration module.

V1 moves only this bounded read-route cluster:

- `GET /api/foundation/build-intel-watchlist`
- `GET /api/foundation/multimodal-extractor-contract`
- `GET /api/foundation/research-inbox-contract`
- `GET /api/foundation/control-compression`
- `GET /api/foundation/implementation-intelligence`
- `GET /api/foundation/build-intel-extraction`
- `GET /api/foundation/gstack-build-intel`

The route behavior stays the same. `server.js` becomes a thin wrapper that calls `registerFoundationBuildIntelRoutes(app, deps)`.

## Why

`server.js` remains over the 5,000-line architecture threshold after the operator and source route splits. Build Intel routes are a clean next boundary because the actual logic already lives in Build Intel, Research Inbox, implementation intelligence, and GStack modules. Keeping those route handlers inline in the server monolith makes future Build Intel maintenance harder to inspect and easier to accidentally mix with unrelated hub or auth work.

This is cleanup, not feature work. The useful operator behavior this unlocks is safer parallel work: Steve can keep using Build Intel and Research Inbox visibility while Foundation shrinks the server route monolith, and future Build Intel changes can be reviewed in one named module without opening the whole server file. When Steve asks "what are we learning from builders and where do proposals land?", the API routes for that answer live in one Build Intel route module instead of buried in a 7,000+ line server file.

## Acceptance Criteria

- New module `lib/foundation-build-intel-routes.js` registers the bounded Build Intel read-route cluster.
- `server.js` imports the route registrar and delegates the cluster through a thin wrapper only.
- Extracted routes keep admin gating, error codes, query behavior, payload shape, and existing dependencies.
- Focused proof calls every moved live API route and validates behavior/payload shape.
- Focused proof dogfoods the monolith failure mode by proving the old inline Build Intel route cluster no longer lives in `server.js`.
- Source-marker checks are supplemental only. A substring/source check cannot pass this card unless live route behavior checks also pass.
- Route budget is explicit: moved routes must return under 5 seconds each and under 2.5 MB each in focused proof.
- Current Sprint, live backlog, current plan/state, closeout, Plan Critic run, and verifier coverage all name this card and closeout key.

## Definition Of Done

- `BUILD-INTEL-ROUTE-SPLIT-001` is live in backlog and closed under `build-intel-route-split-v1`.
- `docs/process/build-intel-route-split-001-plan.md` and `docs/process/approvals/BUILD-INTEL-ROUTE-SPLIT-001.json` exist and validate.
- `plan_critic_runs` has a durable pass row at 9.8+ for this plan with architecture rules enabled.
- `lib/foundation-build-intel-routes.js` owns the extracted route cluster.
- `scripts/process-build-intel-route-split-check.mjs` passes and proves live route behavior plus the split boundary.
- `server.js` line count decreases and does not gain new business logic.
- `foundation:verify` and `process:foundation-ship` pass before push.

## Details

Existing code to reuse: the current route bodies in `server.js`, `requireAdminToken`, `sendApiError`, `getFoundationSnapshot`, `getActiveFoundationCurrentSprint`, `listFoundationFeedbackItems`, `listFoundationAcknowledgedStates`, `searchSharedCommunicationArtifactsForContext`, `getFoundationBuildCloseouts`, `getSourceContracts`, `buildCreatorWatchlistSnapshot`, `buildMultimodalExtractorContractSnapshot`, `buildResearchInboxContractSnapshot`, `buildFoundationControlCompressionSnapshot`, `buildImplementationIntelligenceSnapshot`, `buildBuildIntelExtractionImplementationSnapshot`, and `buildGStackBuildIntelSnapshot`.

Existing docs to reuse: `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, `docs/process/source-route-split-001-plan.md`, `docs/process/server-route-split-001-plan.md`, and the monolith rules in `AGENTS.md`.

Existing scripts to reuse: `backlog:hygiene`, `foundation:verify`, `process:foundation-ship`, and the recent route split focused proof shape.

Split plan: all moved route behavior lives in the new module. `server.js` only imports `registerFoundationBuildIntelRoutes` and passes dependencies. No new responsibility is added to `server.js`. This is not a broad server refactor; it is one route cluster extraction.

Verifier/check posture: the focused proof script is read-only by default and has no `--apply` path. It must not call `createBacklogItem`, `updateBacklogItem`, `upsertFoundationCurrentSprintOverlay`, `INSERT`, `UPDATE`, `DELETE`, `fs.writeFile`, or any live-state mutation. The verifier addition is read-only coverage only; if the route split is missing or live routes regress, it fails closed instead of repairing state.

Gate decision tree: static proof is too weak because this changes served API route registration. Focused proof is required with `npm run process:build-intel-route-split-check -- --json`, which calls live routes and checks the exact route ownership boundary. Full proof is required because this touches `server.js`, route behavior, package scripts, verifier coverage, Current Sprint state, and build closeouts.

## Risks

- Risk: the extraction changes route behavior.
  - Response path: focused proof hits all moved routes and validates status/payload basics before the full verifier runs.
- Risk: `server.js` becomes smaller but the new module becomes a dumping ground.
  - Response path: closeout must say this module owns only Foundation Build Intel read routes; later unrelated routes need their own module.
- Risk: proof becomes substring theater.
  - Repair path: dogfood includes live HTTP route checks plus a structural check that moved route handlers are registered in the module and not still inline in `server.js`.
- Risk: this looks like Build Intel feature work.
  - Response path: no extraction, no paid auth, no crawling, no atom creation, and no Research Inbox mutation ship in this card.

## Tests

```bash
node --check lib/foundation-build-intel-routes.js scripts/process-build-intel-route-split-check.mjs server.js scripts/foundation-verify.mjs
npm run process:build-intel-route-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=BUILD-INTEL-ROUTE-SPLIT-001 --planApprovalRef=docs/process/approvals/BUILD-INTEL-ROUTE-SPLIT-001.json --closeoutKey=build-intel-route-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the failure class by checking the old inline Build Intel route-cluster pattern in `server.js` is gone while live route behavior remains healthy. Substring-only proof is rejected: the focused proof calls actual routes and fails closed if the route calls do not pass.

## Not Next

- Do not split every `server.js` route.
- Do not touch auth/session routes.
- Do not move write routes.
- Do not wire Marketing Video Lab live routes.
- Do not build hub features or Sales/Ops/Marketing UI.
- Do not change Build Intel extraction semantics.
- Do not crawl YouTube, connect paid Skool/myICOR, create atoms, or mutate Research Inbox/backlog from extracted content.
- Do not run Meeting Vault Phase B or mutate Drive permissions.
