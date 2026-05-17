# FOUNDATION-LAZY-SURFACE-LOADING-001 Plan

## What
Ship the Foundation loading architecture follow-up from the engineering fitness sprint.

This sprint makes detail surfaces fetch owned, narrow read routes instead of using the default Foundation Hub as an all-data side channel.

## Why
Steve called out that Foundation still feels slow and fat. Engineering fitness gates made the loading standard executable, but left lazy surface loading as a scoped follow-up because Backlog did not yet have a clean read-only list route.

The immediate fix is loading architecture, not visual redesign: keep the Foundation shell and summary Hub lean, then let Recent Work, Backlog, Source Registry, Current Sprint, System Health, and Diagnostics use dedicated routes when opened.

## Acceptance Criteria
- `FOUNDATION-LAZY-SURFACE-LOADING-001` is the live sprint card and closes under `foundation-lazy-surface-loading-v1`.
- A read-only backlog list route exists at `/api/foundation/backlog`.
- The backlog list route preserves all live backlog rows and exposes the metadata Backlog needs without requiring `/api/foundation-hub`.
- Backlog uses `fetchFoundationBacklog()` instead of `fetchFoundationHub()`.
- Recent Work uses `/api/foundation/build-log` and `/api/foundation/current-sprint` instead of `fetchFoundationHub()`.
- Source Registry continues to use `/api/source-of-truth`.
- System Health/Diagnostics continue to use the explicit full diagnostics route, not the default Hub.
- Default `/api/foundation-hub` remains under the V2 summary budget.
- Agents have a narrow backlog list route in the route usage contract.
- Dogfood rejects all-in-one loading through the default Hub and rejects a missing backlog list route.
- `foundation:verify` includes coverage for the card once it is done.
- Plan Critic score is 10/10 or at least 9.8/10 for `FOUNDATION-LAZY-SURFACE-LOADING-001`.

## Definition Of Done
- Add route/payload ownership for `/api/foundation/backlog`.
- Add frontend fetch helper and wire Backlog to the backlog route.
- Wire Recent Work to the current-sprint route and build-log route only.
- Add focused proof script and package script.
- Add plan, approval, closeout registry record, verifier coverage, and closeout handoff.
- Update live backlog/current sprint state only through explicit process write flags.
- Run focused proof, backlog hygiene, `foundation:verify`, and full `process:foundation-ship`.
- Commit and push the Foundation branch.
- Proof command must pass: `npm run process:foundation-lazy-surface-loading-check -- --json`.

## Existing Work
- Reuse Foundation Hub payload budget V2.
- Reuse `FOUNDATION-ENGINEERING-FITNESS-GATES-001` standards and lazy-loading evaluator.
- Reuse `/api/foundation/current-sprint`, `/api/foundation/build-log`, `/api/source-of-truth`, `/api/foundation-hub`, and `/api/foundation-hub?view=full`.
- Reuse the existing backlog detail endpoint for single-card detail.

## Details
Implementation shape:

- `lib/foundation-backlog-detail.js` owns both the existing single-card detail contract and the new read-only backlog list contract.
- `lib/foundation-operator-routes.js` serves `/api/foundation/backlog` from live snapshot truth and preserves all live backlog rows.
- `public/foundation-data.js` exposes `fetchFoundationBacklog()` and `fetchFoundationCurrentSprint()`.
- `public/foundation.js` switches only Backlog loading from the default Hub to the backlog route.
- `public/foundation-operations-renderers.js` switches only Recent Work loading from the default Hub to build-log plus current-sprint routes.
- `lib/security-access.js` registers the new read-only route beside the existing backlog write route policy.
- `lib/foundation-current-sprint-verifier.js` accepts the new narrow Current Sprint frontend source shape while preserving the old `hub.currentSprint` acceptance path for historical compatibility.
- `scripts/foundation-verify.mjs` receives the new live backlog/current-sprint route payloads through the existing live API snapshot loader and reuses the engineering fitness verifier coverage.

Behavior proof is through real route/API/function paths: the focused proof calls live `/api/foundation/backlog`, `/api/foundation/build-log`, `/api/foundation/current-sprint`, `/api/source-of-truth`, `/api/foundation-hub`, and `/api/foundation-hub?view=full`, then validates the actual function path through `evaluateFoundationLazySurfaceRouteLoadingArchitecture()` and dogfood failure cases. No substring-only proof is accepted; substring-only proof is rejected. The proof checks real behavior, API route payloads, route byte budgets, and a dogfood revise/fail case for broad Hub loading.

Operator behavior:

- Backlog opens from the backlog-owned route instead of blocking on the default Hub.
- Recent Work opens from build-log and current-sprint routes instead of pulling broad Hub data just to render the sprint panel and related changes.
- Source Registry and Diagnostics keep their existing route ownership.
- Agents can use the backlog list route without requesting full diagnostics or the default Hub.

Speed budget:

- Default Hub remains under the V2 summary budget.
- Full diagnostics remains under the separate diagnostics budget.
- Backlog list route gets an explicit dedicated budget of 1.1 MB and 1.5 seconds because it intentionally preserves all live backlog rows for the operator board.
- The focused proof measures live route bytes/timing and fails if the backlog route exceeds its explicit budget.
- The focused proof is fast enough for the default loop: target under 5 minutes, with full verification reserved for final gate.

File-size plan:

- `public/foundation.js` stays under 3,000 lines; this sprint changes existing calls instead of adding page code there.
- `scripts/foundation-verify.mjs` receives minimal orchestration wiring, no new responsibility, and remains under 5,000 lines.
- `server.js` receives only thin route dependency wiring, no new responsibility, and no broad route behavior rewrite.
- `lib/security-access.js` receives only a thin read-route registration, no new responsibility.
- `lib/foundation-current-sprint-verifier.js` receives only a thin compatibility update for `currentSprintPayload.currentSprint`, no new responsibility.
- New proof logic stays inside `lib/foundation-engineering-fitness-gates.js` and `scripts/process-foundation-lazy-surface-loading-check.mjs`, both under the 1,500-line preferred module budget.
- Approval JSON is a data record with explicit size budget under 5 KB.
- Closeout handoff is a report artifact with explicit file-size budget under 180 lines.

Process posture:

- The focused proof is read-only by default.
- Live backlog/current sprint writes require explicit `--apply` or `--close-card`.
- Shared-file touches are intentionally Foundation process/loading architecture work approved in this sprint: `package.json`, `server.js`, `lib/security-access.js`, `scripts/foundation-verify.mjs`, `public/foundation.js`, and process artifacts.
- Main-session approved coordination owns the shared route integration. requestedSharedFiles are `package.json`, `server.js`, `lib/security-access.js`, `lib/foundation-current-sprint-verifier.js`, `scripts/foundation-verify.mjs`, `public/foundation.js`, `public/foundation-data.js`, and `public/foundation-operations-renderers.js`.
- This is active sprint scope, not hub side work; main session owns commit and push after full Foundation ship gate.

Gate decision tree:

- Blast radius is shared Foundation route/frontend/verifier wiring, so the selected gate level is full before push.
- Static gate: use `node --check` for syntax while iterating.
- Focused gate: use `npm run process:foundation-lazy-surface-loading-check -- --json` as the focused proof loop.
- Targeted gate: use route/API checks only for focused proof failures.
- Full gate: run full `npm run foundation:verify` once focused proof is green.
- Final full gate: run `process:foundation-ship` before commit/push.

## Risks
The main risk is claiming lazy loading while simply moving bloat into a new route. The mitigation is an explicit backlog-list budget plus source checks proving only the surfaces that need backlog data fetch it.

Another risk is changing Backlog behavior by truncating card text. The mitigation for V1 is to preserve all live backlog rows on the backlog route and use the existing single-card detail endpoint as the future path for deeper per-card lazy loading if the board route grows.

The shared-file risk is real because this card touches `package.json`, `server.js`, `lib/security-access.js`, frontend route consumers, and verifier wiring. The mitigation is narrow edits, focused proof, full `foundation:verify`, and `process:foundation-ship` before push.

## Not Next
No extractor runtime work, connectors, OAuth, auth-required extraction, Harlan, Fal, voice, Canva, OpenHuman, broad UI redesign, `MEETING-VAULT-ACL-001` Phase B, Drive permission mutation, or live Agent Feedback auto-send job.

## Tests
- `node --check lib/foundation-backlog-detail.js lib/foundation-operator-routes.js lib/foundation-engineering-fitness-gates.js scripts/process-foundation-lazy-surface-loading-check.mjs scripts/foundation-verify.mjs`
- `npm run process:foundation-lazy-surface-loading-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=FOUNDATION-LAZY-SURFACE-LOADING-001 --planApprovalRef=docs/process/approvals/FOUNDATION-LAZY-SURFACE-LOADING-001.json --closeoutKey=foundation-lazy-surface-loading-v1 --commitRef=HEAD`
