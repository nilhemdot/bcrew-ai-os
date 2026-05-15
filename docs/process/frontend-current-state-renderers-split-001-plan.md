# FRONTEND-CURRENT-STATE-RENDERERS-SPLIT-001 Plan

## What

Split the Foundation Overview / Current State renderer cluster out of `public/foundation.js` into `public/foundation-current-state-renderers.js` without changing product behavior.

This narrow V1 moves Current State-only cards, source stamps, backlog cells, closeout boards, package detail tables, surface tables, level guide, Phase G helpers, Foundation truth/execution panels, Owners review queue panel, and `renderCurrentState()` into a dedicated classic browser script.

The new module loads after the existing Foundation renderer modules and before `foundation-router.js` so the router can still call the same global `renderCurrentState()` function.

## Why

`public/foundation.js` is still about 7,710 lines after the FUB lead-source split. It is below the old 10K active-danger line but remains above Steve's 5K refactor threshold.

The Overview / Current State page is the main operator surface for the question "what is actually closed, what is still partial, and what closes next?" Giving it a named module keeps the Foundation command surface intact while removing another large route-local renderer cluster from the frontend monolith.

## Acceptance Criteria

- `public/foundation-current-state-renderers.js` exists and is loaded by `public/foundation.html` before `foundation-router.js`.
- `public/foundation.js` no longer defines the moved Current State renderer functions, including `renderFoundationSequenceCard()`, `renderCurrentStateSurfaceTable()`, `renderFoundationCurrentTruthPanel()`, `renderOwnersReviewQueuePanel()`, and `renderCurrentState()`.
- `public/foundation.js` line count decreases from the pre-split baseline of 7,710 lines and lands under 6,500 lines.
- Existing route behavior remains stable: `foundation-router.js` can still dispatch `#current-state` through global `renderCurrentState()`.
- Focused proof executes the split browser scripts in a VM-backed fake DOM and proves:
  - Current State route globals are present,
  - source href/stamp helpers still route source IDs to the right Foundation source sections,
  - closeout and backlog cells render from synthetic hub data,
  - surface tables render package details and backlog links from synthetic rows,
  - `renderCurrentState()` can execute the route using synthetic `fetchSourceOfTruth()` and `fetchFoundationHub()` payloads,
  - missing or wrong Current State module script order fails closed,
  - `/foundation` and the new split browser script serve under the route/script budget.
- Split-source verifier/readers are updated so they read the combined frontend surface instead of forcing moved Current State symbols back into `public/foundation.js`.

## Definition Of Done

- Live backlog card `FRONTEND-CURRENT-STATE-RENDERERS-SPLIT-001` is `done` and Current Sprint shows it as `Done This Sprint`.
- Plan approval validates at 9.8+ and a durable Plan Critic pass row exists before build.
- Focused proof passes through `npm run process:frontend-current-state-renderers-split-check -- --json`.
- `foundation:verify` and full `process:foundation-ship` pass before push.
- Closeout and Recent Work identify `frontend-current-state-renderers-split-v1`.

## Details

Existing code to reuse: the Current State renderer cluster currently inside `public/foundation.js`, data loaders in `public/foundation-data.js`, routing in `public/foundation-router.js`, and VM-backed proof patterns from the prior frontend split scripts.

Existing docs and policy to reuse: AGENTS.md Foundation Rebuild Discipline, the 2026-05-13 deep audit monolith finding, and the previous frontend split cards `FRONTEND-MONOLITH-SPLIT-001`, `FRONTEND-OPERATIONS-RENDERERS-SPLIT-001`, `FRONTEND-RUNTIME-RENDERERS-SPLIT-001`, `FRONTEND-SOURCE-LIFECYCLE-RENDERERS-SPLIT-001`, `FRONTEND-SOURCE-REGISTRY-RENDERERS-SPLIT-001`, `FRONTEND-SYSTEM-INVENTORY-RENDERERS-SPLIT-001`, and `FRONTEND-FUB-LEAD-SOURCE-RENDERERS-SPLIT-001`.

Implementation split plan: mechanically move the Current State cluster from `renderFoundationSequenceCard()` through `renderCurrentState()` into `public/foundation-current-state-renderers.js`. Keep general markdown/doc helpers, Backlog, Decision, Open Questions, Data Sources, and strategy docs in their current owners for this slice.

Update `public/foundation.html` script order to:

1. `foundation-nav-config.js`
2. `foundation-data.js`
3. `foundation.js`
4. `foundation-source-registry-renderers.js`
5. `foundation-fub-lead-source-renderers.js`
6. `foundation-system-inventory-renderers.js`
7. `foundation-current-state-renderers.js`
8. `foundation-source-lifecycle-renderers.js`
9. `foundation-runtime-renderers.js`
10. `foundation-operations-renderers.js`
11. `foundation-router.js`

Root invariant: the Foundation Overview route must not care which file owns Current State rendering as long as the global renderer functions load before route dispatch and the page can execute against synthetic source/backlog state without live mutation.

Gate decision tree: static proof is too weak because script order can compile while the Overview route fails at runtime. Focused VM proof is required for browser global availability, helper behavior, synthetic route render, and missing/wrong script order. Full Foundation ship is required before push because this touches browser scripts, package scripts, verifier coverage, closeout records, and current sprint docs.

Route/performance budget: keep the proof fast and proportional. `/foundation` must return under 2 seconds locally, the new split browser script must return `200`, the focused proof should stay under 1 minute, and the full ship gate should stay under the existing 300-second target. The focused check is read-only by default and must not update backlog, sprint state, job controls, source truth, or filesystem artifacts outside this card's planned files.

## Risks

- Risk: `foundation-router.js` calls `renderCurrentState()` before the new module is loaded.
  - Repair path: focused proof fails on missing or wrong Current State module order.
- Risk: moved renderers lose access to shared helpers such as `renderTable()`, `createActionLink()`, `getSectionFocus()`, or source/backlog data loaders.
  - Repair path: focused proof executes the route after `foundation-data.js`, `foundation.js`, and prior split renderer modules load in the expected order.
- Risk: this accidentally becomes a broad Overview rewrite.
  - Repair path: no visual redesign, no API contract changes, no Backlog/Decision/Open Questions split, and no product/hub work in this slice.
- Risk: an older verifier falsely expects moved Current State symbols in `public/foundation.js`.
  - Repair path: update split-source readers to use the combined frontend bundle and dogfood that moved symbols live in the new module.

## Tests

```bash
node --check public/foundation-nav-config.js public/foundation-data.js public/foundation.js public/foundation-source-registry-renderers.js public/foundation-fub-lead-source-renderers.js public/foundation-system-inventory-renderers.js public/foundation-current-state-renderers.js public/foundation-source-lifecycle-renderers.js public/foundation-runtime-renderers.js public/foundation-operations-renderers.js public/foundation-router.js scripts/process-frontend-current-state-renderers-split-check.mjs lib/foundation-frontend-current-state-renderers-split.js
npm run process:frontend-current-state-renderers-split-check -- --json
curl -s -o /tmp/foundation.html -w "status=%{http_code} time=%{time_total} bytes=%{size_download}\n" http://localhost:3000/foundation
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FRONTEND-CURRENT-STATE-RENDERERS-SPLIT-001 --planApprovalRef=docs/process/approvals/FRONTEND-CURRENT-STATE-RENDERERS-SPLIT-001.json --closeoutKey=frontend-current-state-renderers-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the unsafe old shape by checking a missing Current State module and wrong script order. It only passes when Current State renderers live in their own module, `public/foundation.js` shrinks below 6,500 lines, route globals remain callable, the synthetic Overview route renders, and substring-only proof is rejected. Source-substring or string-match checks are allowed only as secondary artifact guards after the VM behavior path proves the moved route works.

## Not Next

- Do not redesign the Foundation Overview or Current State UX.
- Do not change Foundation Hub, source-of-truth, Backlog, Decision, Open Questions, or source API contracts.
- Do not split Backlog, Decisions, Open Questions, Data Sources, strategy docs, or Live Doc freshness in this slice.
- Do not touch hub UI, Marketing Video Lab live wiring, paid-source auth, source extraction, Drive permissions, Meeting Vault ACL Phase B, or autonomous dev.
