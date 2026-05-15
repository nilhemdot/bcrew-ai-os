# FOUNDATION-HUB-PAYLOAD-EXTRACT-001 Plan

## What
Reduce the default `/api/foundation-hub` payload under the warning budget by compacting expensive summary-only runtime data and keeping full-detail data available through existing full/detail paths.

## Why
The nightly deep audit reported the default Foundation Hub payload around 870KB, above the 800KB warning budget. The route is now fast, but oversized default payloads make every dashboard refresh heavier and make future hub work slower. The useful operator value for Steve is a dashboard that stays fast while hubs start building on top of Foundation. This unlocks speed for the real workflow of reviewing Foundation status while Sales, Ops, and Marketing hub work happens in parallel. This is the next reliability pass after the 70-second endpoint fix.

## Acceptance Criteria
- Default `/api/foundation-hub` response falls below the committed payload warning budget.
- Full/detail Foundation Hub behavior remains available for diagnostics and verifier paths.
- The default summary payload keeps operator-facing fields used by the dashboard: current sprint, backlog hygiene, review status, research curation, runtime supervisor, and compact foundation job status.
- Dogfood proof measures the route and fails if payload exceeds the committed payload budget: default `/api/foundation-hub` must stay under 800KB.
- Dogfood proof simulates the old audit failure by evaluating an over-budget synthetic payload and proving the checker rejects it.
- The implementation avoids broad frontend rewrites and avoids adding new inline logic to files already over 5,000 lines without an extraction boundary.

## Definition Of Done
- A focused proof command validates approval, Plan Critic pass, live backlog card, Current Sprint stage, payload budget, compact runtime shape, and dogfood failure rejection.
- `foundation:verify` still passes and the dashboard can still load the default Foundation Hub payload.
- The measured before/after payload size is recorded in the sprint closeout.
- The card moves through Scoping, Sprint Ready, Building Now, and Done This Sprint with timestamps.

## Details
Reuse existing code, existing docs, existing scripts, live Backlog, Current Sprint, and `process:foundation-ship`. The implementation reuses `getFoundationCoreSnapshot()`, `getFoundationJobRunSnapshot()`, existing Foundation Hub summary/full route modes, the current dashboard renderer, and the new focused proof script.

Extract compact Foundation Hub summary shaping into a dedicated helper module instead of growing `server.js`. This is a new module boundary / split plan for a route in a file over 5,000 lines; `server.js` stays a thin wrapper and no new responsibility is added to the monolith. The first target is `foundationJobs`, because it is summary-panel data but currently carries a large run snapshot in the default payload. Preserve job keys, status, schedule posture, runtime mode, `servesHubs`, due state, next run time, and compact latest run metadata.

If compacting foundation jobs alone does not bring the payload under budget, compact only other summary-owned surfaces that have existing detail/full routes. Do not remove `backlogItems` from the default route in this sprint unless the proof shows the frontend no longer needs it.

Gate decision tree: static proof is insufficient because the blast radius touches a hot route, `server.js`, and dashboard data contracts. This is a full-gate card because it touches `server.js`, route payload shape, and dashboard data contracts. The focused proof comes first with `npm run process:foundation-route-budget-cleanup-check -- --json`; full proof follows with `npm run foundation:verify` and `npm run process:foundation-ship`.

## Risks
The main risk is breaking dashboard panels that expect fields from the current default payload. Keep the compact shape conservative and test with the existing verifier plus focused payload checks. Another risk is treating the 800KB warning as a vanity metric; this card is only done if measured bytes actually drop. If proof fails or a panel loses required data, repair path is fail closed, reopen `FOUNDATION-HUB-PAYLOAD-EXTRACT-001`, and preserve full detail behind the full route until the summary contract is corrected.

## Tests
- `npm run process:foundation-route-budget-cleanup-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=FOUNDATION-HUB-PAYLOAD-EXTRACT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-HUB-PAYLOAD-EXTRACT-001.json --closeoutKey=foundation-route-budget-cleanup-v1 --commitRef=HEAD`

## Not Next
Do not build hub UI, Marketing Video Lab UI, Build Intel extraction, Skool/myICOR auth, or a broad frontend refactor. Do not remove full diagnostics data; move heavy data to full/detail paths instead.
