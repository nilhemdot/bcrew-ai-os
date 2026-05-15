# FRONTEND-FUB-LEAD-SOURCE-RENDERERS-SPLIT-001 Plan

## What

Split the Foundation FUB lead-source taxonomy renderer cluster out of `public/foundation.js` into `public/foundation-fub-lead-source-renderers.js` without changing product behavior.

This narrow V1 moves the FUB lead-source view state, source group ordering, FUB source tag helpers, drift bucket renderers, Owners lead-source governance panel, FUB lead-source rule editor, and `renderFubLeadSourceManagerPanel()` into a dedicated classic browser script.

The new module loads after `foundation-source-registry-renderers.js` and before `foundation-router.js` so it can keep using existing shared helpers such as `renderSourceTag`, `buildSelect`, `buildField`, `buildInput`, `buildTextarea`, `foundationMutation`, `fetchFubLeadSources`, and `refreshFubLeadSources`.

## Why

`public/foundation.js` is still about 8,388 lines after the System Inventory split. It is under the 10K active-danger threshold, but still above Steve's 5K refactor threshold. This cleanup keeps reducing the frontend monolith through bounded, behavior-proven slices instead of broad rewrites.

The FUB lead-source taxonomy manager is a useful operator workflow, not abstract cleanup. Steve and the team use it to see FUB source drift, classify lead sources once, separate marketing and ownership states, and route invalid or legacy source cleanup through the right Foundation/Ops lanes. Giving that workflow a named module makes future hub work safer because builders can consume the source-health surface without editing the general Foundation monolith.

## Acceptance Criteria

- `public/foundation-fub-lead-source-renderers.js` exists and is loaded by `public/foundation.html` after `foundation-source-registry-renderers.js` and before `foundation-router.js`.
- `public/foundation.js` no longer defines the moved FUB lead-source view state, source group options, ordering helper, FUB tag helpers, drift bucket helpers, Owners governance panel, rule item renderer, or `renderFubLeadSourceManagerPanel()`.
- `public/foundation.js` line count decreases from the pre-split baseline of 8,388 lines and lands under 7,750 lines.
- Existing route behavior remains stable: the Source APIs route can still append `renderOwnersLeadSourceGovernancePanel(governance)` and `renderFubLeadSourceManagerPanel()`.
- Focused proof executes the split browser scripts in a VM-backed fake DOM and proves:
  - FUB tag helpers return the expected marketing, ownership, and flag labels,
  - source group ordering keeps the approved taxonomy order and pushes `Ungrouped` last,
  - the FUB manager route global renders controls and calls `fetchFubLeadSources` without mutating live FUB data,
  - the drift panel renders the review queue from synthetic loaded data,
  - missing or wrong FUB module script order fails closed,
  - `/foundation` and the new split browser script serve under the route/script budget.
- Split-source verifier/readers are updated so they read the combined frontend surface instead of forcing moved FUB symbols back into `public/foundation.js`.

## Definition Of Done

- Live backlog card `FRONTEND-FUB-LEAD-SOURCE-RENDERERS-SPLIT-001` is `done` and Current Sprint shows it as `Done This Sprint`.
- Plan approval validates at 9.8+ and a durable Plan Critic pass row exists before build.
- Focused proof passes through `npm run process:frontend-fub-lead-source-renderers-split-check -- --json`.
- `foundation:verify` and full `process:foundation-ship` pass before push.
- Closeout and Recent Work identify `frontend-fub-lead-source-renderers-split-v1`.

## Details

Existing code to reuse: the FUB lead-source renderer cluster currently inside `public/foundation.js`, shared source helpers in `public/foundation-source-registry-renderers.js`, data loaders in `public/foundation-data.js`, route calls in the existing Source APIs renderer, and the VM-backed proof pattern from prior frontend split scripts.

Existing docs and policy to reuse: AGENTS.md Foundation Rebuild Discipline, the 2026-05-13 deep audit monolith finding, and the previous frontend split cards `FRONTEND-MONOLITH-SPLIT-001`, `FRONTEND-OPERATIONS-RENDERERS-SPLIT-001`, `FRONTEND-RUNTIME-RENDERERS-SPLIT-001`, `FRONTEND-SOURCE-LIFECYCLE-RENDERERS-SPLIT-001`, `FRONTEND-SOURCE-REGISTRY-RENDERERS-SPLIT-001`, and `FRONTEND-SYSTEM-INVENTORY-RENDERERS-SPLIT-001`.

Existing scripts to reuse: `foundation:verify`, `process:foundation-ship`, `node --check`, and the existing frontend split focused proof shape.

Implementation split plan: mechanically move the FUB lead-source constants and helper cluster from `fubLeadSourceViewState` / `FUB_SOURCE_GROUP_OPTIONS` through `renderFubLeadSourceManagerPanel()` into `public/foundation-fub-lead-source-renderers.js`. Keep the broader Source APIs route owner in `public/foundation.js` for this slice, but leave its calls to `renderOwnersLeadSourceGovernancePanel()` and `renderFubLeadSourceManagerPanel()` unchanged.

Update `public/foundation.html` script order to:

1. `foundation-nav-config.js`
2. `foundation-data.js`
3. `foundation.js`
4. `foundation-source-registry-renderers.js`
5. `foundation-fub-lead-source-renderers.js`
6. `foundation-system-inventory-renderers.js`
7. `foundation-source-lifecycle-renderers.js`
8. `foundation-runtime-renderers.js`
9. `foundation-operations-renderers.js`
10. `foundation-router.js`

Root invariant: the Foundation Source APIs route must not care which file owns the FUB lead-source manager as long as the global renderer functions load before route dispatch and the manager can execute against synthetic source data without live FUB mutation.

Gate decision tree: static proof is too weak because global script order can compile while the FUB manager route fails at runtime. Focused VM proof is required for browser global availability, helper behavior, and missing/wrong script order. Full Foundation ship is required before push because this touches browser scripts, package scripts, verifier coverage, closeout records, and current sprint docs.

Route/performance budget: keep the proof fast and proportional. `/foundation` must return under 2 seconds locally, the new split browser script must return `200`, the focused proof should stay under 1 minute, and the full ship gate should stay under the existing 300-second target. The focused check is read-only by default and must not update FUB, backlog, sprint state, job controls, source truth, or filesystem artifacts outside this card's planned files.

## Risks

- Risk: the Source APIs route calls the FUB manager before the new module is loaded.
  - Repair path: focused proof fails on missing or wrong FUB module order.
- Risk: the moved FUB manager loses access to shared helpers or data loaders.
  - Repair path: focused proof executes the manager after `foundation-data.js`, `foundation.js`, and `foundation-source-registry-renderers.js` load in the expected order.
- Risk: this accidentally runs a live FUB refresh or writes source classifications.
  - Repair path: proof uses synthetic loaders and verifies no live mutation call is needed for initial render.
- Risk: an older verifier falsely expects moved FUB symbols in `public/foundation.js`.
  - Repair path: update split-source readers to use the combined frontend bundle and dogfood that moved symbols live in the new module.
- Risk: this becomes a FUB feature sprint.
  - Repair path: no API contract changes, no live FUB requests, no source taxonomy edits, no Ops Hub work, no Sales/Marketing hub work, and no UX redesign in this slice.

## Tests

```bash
node --check public/foundation-nav-config.js public/foundation-data.js public/foundation.js public/foundation-source-registry-renderers.js public/foundation-fub-lead-source-renderers.js public/foundation-system-inventory-renderers.js public/foundation-source-lifecycle-renderers.js public/foundation-runtime-renderers.js public/foundation-operations-renderers.js public/foundation-router.js scripts/process-frontend-fub-lead-source-renderers-split-check.mjs lib/foundation-frontend-fub-lead-source-renderers-split.js
npm run process:frontend-fub-lead-source-renderers-split-check -- --json
curl -s -o /tmp/foundation.html -w "status=%{http_code} time=%{time_total} bytes=%{size_download}\n" http://localhost:3000/foundation
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FRONTEND-FUB-LEAD-SOURCE-RENDERERS-SPLIT-001 --planApprovalRef=docs/process/approvals/FRONTEND-FUB-LEAD-SOURCE-RENDERERS-SPLIT-001.json --closeoutKey=frontend-fub-lead-source-renderers-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the unsafe old shape by checking a missing FUB module and wrong script order. It only passes when FUB lead-source renderers live in their own module, `public/foundation.js` shrinks below 7,750 lines, route globals remain callable, helper behavior works from synthetic loaded data, no live FUB mutation is required for initial render, and substring-only proof is rejected. Source-substring or string-match checks are allowed only as secondary artifact guards after the VM behavior path proves the moved route works.

## Not Next

- Do not redesign the FUB lead-source taxonomy UI.
- Do not change FUB API routes, source contracts, source taxonomy rules, or write behavior.
- Do not run live FUB refreshes as proof.
- Do not split Backlog, Decisions, Open Questions, Daily Summary, Build Log, Current State, or Source APIs route ownership in this slice.
- Do not touch hub UI, Marketing Video Lab live wiring, paid-source auth, source extraction, Drive permissions, Meeting Vault ACL Phase B, or autonomous dev.
