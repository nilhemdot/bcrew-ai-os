# FOUNDATION-BACKLOG-DONE-ARCHIVE-LAZY-LOAD-001 Plan

## What
Ship a narrow Foundation backlog loading-architecture slice before extractor readiness.

V1 changes the default backlog route from "all cards including all old done cards" to "all non-done cards plus a bounded recent-done window." Older done cards remain accessible through an explicit done archive route/page. This is not a backlog semantic rewrite, UI redesign, or Recent Work rewrite.

## Why
`FOUNDATION-LAZY-SURFACE-LOADING-001` moved Backlog onto a dedicated route, but that route still returned the full done-card history by default. As shipped work grows, that makes normal sprint planning carry old history it does not need.

Useful operator behavior: Steve can open Backlog and get the active planning queue quickly, see preserved total counts, and still open older done cards through an explicit archive without losing history. Builders can link to a done card by ID without forcing the default page to load every older done row.

This protects Foundation speed before extraction adds more queue and research data.

## Acceptance Criteria
- `FOUNDATION-BACKLOG-DONE-ARCHIVE-LAZY-LOAD-001` gets a Plan Critic score of 10/10 and returns `pass`; weak plans must return `revise`.
- `GET /api/foundation/backlog` returns all non-done cards plus a recent done window by default.
- `GET /api/foundation/backlog/done-archive` returns older done cards behind an explicit route.
- Default route summary preserves total item count, active count, done count, recent-done count, and archived-done count.
- Done archive summary preserves total item count, active count, done count, archived-done count, returned count, limit, offset, and has-more state.
- Focused backlog links can request explicit card IDs with `ids=` so older done card links still resolve without loading the full archive.
- `#backlog-done-archive` renders older done cards using the existing backlog card renderer.
- Recent Work remains shipped-build history through `/api/foundation/build-log`.
- Default backlog route stays under its dedicated budget.
- Done archive route has a separate explicit budget.
- Dogfood rejects a default payload that keeps all done history loaded and rejects a missing archive route.

## Definition Of Done
- Update the backlog list/detail contract module with the default list split and done archive payload.
- Add the done archive operator route before `:cardId` detail routing.
- Register the done archive route in the security access registry.
- Add frontend data helpers for focused backlog IDs and done archive loading.
- Add a dedicated backlog renderer module and minimal archive hash route/page without redesigning the UI.
- Add focused proof script, package script, Plan Critic row, approval JSON, closeout handoff, closeout registry record, and verifier coverage.
- Run focused proof, backlog hygiene, `foundation:verify`, and full `process:foundation-ship`.
- Commit and push the Foundation branch.
- Command-proven DoD for `FOUNDATION-BACKLOG-DONE-ARCHIVE-LAZY-LOAD-001`: focused proof passes, Plan Critic passes 10/10, route budgets pass with measured bytes/ms, `foundation:verify` passes, and full ship gate records proof for HEAD.

## Details
Existing work to reuse:

- `FOUNDATION-ENGINEERING-FITNESS-GATES-001` for route/page/agent loading standards.
- `FOUNDATION-LAZY-SURFACE-LOADING-001` for dedicated Backlog route ownership.
- `FOUNDATION-HUB-PAYLOAD-BUDGET-V2-001` for default summary-payload discipline.
- `FOUNDATION-BACKLOG-DETAIL-ENDPOINT-001` for single-card detail access.
- Existing live `backlog_items`, `getFoundationSnapshot()`, `renderBacklogAccordionItem`, Current Sprint overlay, Plan Critic, backlog hygiene, approval integrity, `foundation:verify`, and `process:foundation-ship`.

Implementation shape:

- `lib/foundation-backlog-detail.js` owns the default list contract, done archive contract, validators, budgets, and split behavior.
- `lib/foundation-operator-routes.js` exposes `/api/foundation/backlog` and `/api/foundation/backlog/done-archive`; the archive route must be registered before `/api/foundation/backlog/:cardId`.
- `public/foundation-backlog-renderers.js` owns the Backlog and Done Archive renderers so `public/foundation.js` stays under the current critical root threshold.
- `public/foundation-data.js` supports `fetchFoundationBacklog({ ids })` and `fetchFoundationBacklogDoneArchive()`.
- `lib/foundation-backlog-done-archive-lazy-load.js` owns focused evaluation and dogfood fixtures.
- `foundation:verify` gets thin route payload wiring only; focused proof owns detailed behavior.

Gate decision tree: use static `node --check` for syntax, focused `npm run process:foundation-backlog-done-archive-lazy-load-check -- --json` while iterating, targeted checks for exact red items, full `npm run foundation:verify` once after focused proof is green, and full `process:foundation-ship` before push.

File-size plan: new hand-written module and focused proof stay under 1,500 lines. `public/foundation.js` should not grow. `scripts/foundation-verify.mjs` gets minimal wiring and stays under 5,000 lines. Closeout handoff stays under report-artifact budget.

Split plan: `public/foundation.js` stays a stable root and receives no new responsibility; new Backlog behavior lives in `public/foundation-backlog-renderers.js`. `server.js` stays a thin wrapper with only dependency injection for the route module. `scripts/foundation-verify.mjs` stays a thin verifier wrapper/source aggregation path and only passes the done archive route payload to the existing engineering-fitness coverage function. No new business behavior is added to over-budget roots.

Generated files, data records, and report artifacts have explicit budgets: approval JSON under 100 lines, closeout report under 180 lines, package script change one line, and closeout registry record under the existing data-record budget. New hand-written modules stay under 1,500 lines.

For server.js route or API work, the performance budget is explicit: default backlog route under 1.5 seconds and under 700KB; done archive route under 1.5 seconds and under 900KB. Route proof command is `npm run process:foundation-backlog-done-archive-lazy-load-check -- --json`, which records time_total-style durationMs and bytes for both routes; manual repair can use `curl --max-time 5 -w '%{time_total} %{size_download}'`.

For `scripts/process-foundation-backlog-done-archive-lazy-load-check.mjs`, any live write path is read-only by default and requires explicit `--apply` or `--close-card` posture. No-flag writes are blocked by the process write guard.

For `scripts/foundation-verify.mjs`, verifier/check behavior remains read-only, performs zero repairs, and fails closed instead of repairing live state.

requestedSharedFiles are main-session approved for this Foundation sprint: `server.js`, `lib/security-access.js`, `package.json`, `scripts/foundation-verify.mjs`, `docs/process/*`, `lib/foundation-verify-coverage-card-ids.js`, and `lib/foundation-build-closeout-cleanup-records.js`. This is not side/hub work; no separate hub chat commits or pushes.

## Risks
Primary risk: breaking direct links to older done cards. Repair path: keep the `ids=` query path on `/api/foundation/backlog`, and prove a requested archived done card appears without loading the full archive.

Secondary risk: confusing Recent Work with older done-card history. Repair path: keep Recent Work on `/api/foundation/build-log`; the done archive is only backlog history.

Third risk: silently hiding history. Repair path: preserve total counts in both routes, keep all older done cards in the archive payload, and prove no deletion/mutation occurs.

If any route budget or engineering fitness gate turns red, repair that red before moving to extractor readiness.

## Tests
- `node --check lib/foundation-backlog-detail.js lib/foundation-backlog-done-archive-lazy-load.js lib/foundation-operator-routes.js scripts/process-foundation-backlog-done-archive-lazy-load-check.mjs scripts/foundation-verify.mjs`
- `npm run process:foundation-backlog-done-archive-lazy-load-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=FOUNDATION-BACKLOG-DONE-ARCHIVE-LAZY-LOAD-001 --planApprovalRef=docs/process/approvals/FOUNDATION-BACKLOG-DONE-ARCHIVE-LAZY-LOAD-001.json --closeoutKey=foundation-backlog-done-archive-lazy-load-v1 --commitRef=HEAD`

## Not Next
Do not start `EXTRACTION-RUNTIME-READINESS-001` until this card ships. Do not run live extraction, auth-required extraction, paid extraction, connector work, OAuth, Harlan, Fal, voice, Canva, OpenHuman, broad visual UI redesign, backlog semantic rewrite, deletion/data loss, Drive permission mutation, or the live Agent Feedback auto-send job.
