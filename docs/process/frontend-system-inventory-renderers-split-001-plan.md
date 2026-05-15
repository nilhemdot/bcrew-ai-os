# FRONTEND-SYSTEM-INVENTORY-RENDERERS-SPLIT-001 Plan

## What

Split the Foundation Systems and System Inventory renderer cluster out of `public/foundation.js` into `public/foundation-system-inventory-renderers.js` without changing Foundation page behavior.

This slice moves the renderers and helpers that power:

- Foundation Systems route and service-area cards
- System Inventory Current Docs route
- System Inventory Archive / History route
- Skills, Plugins / MCPs, and Agents capability routes
- capability catalog and inventory category constants that those route owners consume

The new browser module stays a classic script loaded after `foundation-source-registry-renderers.js` and before the source lifecycle, runtime, operations, and router scripts. Existing global route function names remain stable for `foundation-router.js`.

## Why

`public/foundation.js` is still about 9,774 lines after the source registry split. It is below the 10K actively-dangerous threshold, but it is still far above the 5K refactor threshold Steve asked Codex to enforce as senior-engineer responsibility.

The Systems / System Inventory cluster is the next safest frontend slice because it is operator-facing renderer code, mostly route-local, and already depends on shared helpers loaded before the router. Splitting it gives the "what exists in the system" workflow a named ownership seam without changing source contracts, DB shape, APIs, hub behavior, styling, or product scope.

The useful operator value is quality in the real workflow Steve uses to understand Foundation: Systems shows what the source-backed operating bundles are, and System Inventory shows what docs, skills, plugins, and agent boundaries exist. Keeping those surfaces working while shrinking the monolith unlocks safer hub work later because Steve and hub builders can inspect Foundation capability boundaries without digging through a 9K-line frontend file.

## Acceptance Criteria

- `public/foundation-system-inventory-renderers.js` exists and is loaded by `public/foundation.html` after `foundation-source-registry-renderers.js` and before `foundation-router.js`.
- `public/foundation.js` no longer defines the moved Systems / System Inventory route renderers, helper functions, capability catalog, or inventory category constants.
- `public/foundation.js` line count decreases from the pre-split baseline of 9,774 lines and lands under 9,000 lines.
- `foundation-router.js` still routes to the same global functions: `renderFoundationSystems()`, `renderInventoryDocs()`, `renderInventoryArchiveHistory()`, and `renderCapabilitySection(section)`.
- The moved module can reach shared source helper globals from `foundation-source-registry-renderers.js`, including `renderSourceTag`, `renderSourceMetaItem`, and `renderSourceBulletGroup`.
- Focused proof executes the split scripts in a VM-backed fake browser and proves:
  - Systems helper behavior creates real DOM nodes and service-area grouping,
  - System Inventory doc splitting separates current docs from archive/history docs,
  - capability rendering works from the moved `capabilityCatalog`,
  - the route owner globals exist after script loading,
  - missing or wrong system-inventory-module script order fails closed,
  - `/foundation` and split browser scripts remain under route/script budget.
- Existing reviewer/check helpers that read split frontend source include the new module so moved symbols do not become false reds.

## Definition Of Done

- Live backlog card `FRONTEND-SYSTEM-INVENTORY-RENDERERS-SPLIT-001` is `done` and Current Sprint shows it as `Done This Sprint`.
- Plan approval validates at 9.8+ and a durable Plan Critic pass row exists before build.
- Focused proof passes through `npm run process:frontend-system-inventory-renderers-split-check -- --json`.
- `foundation:verify` and full `process:foundation-ship` pass before push.
- Closeout and Recent Work identify `frontend-system-inventory-renderers-split-v1`.

## Details

Existing code to reuse: Systems and System Inventory renderer functions currently inside `public/foundation.js`, shared source helpers in `public/foundation-source-registry-renderers.js`, `public/foundation-nav-config.js`, `public/foundation-data.js`, `public/foundation-source-lifecycle-renderers.js`, `public/foundation-runtime-renderers.js`, `public/foundation-operations-renderers.js`, `public/foundation-router.js`, and the VM-backed proof pattern from the prior frontend split checks.

Existing docs and policy to reuse: AGENTS.md Foundation Rebuild Discipline, the 2026-05-13 deep audit monolith finding, `FRONTEND-MONOLITH-SPLIT-001`, `FRONTEND-OPERATIONS-RENDERERS-SPLIT-001`, `FRONTEND-RUNTIME-RENDERERS-SPLIT-001`, `FRONTEND-SOURCE-LIFECYCLE-RENDERERS-SPLIT-001`, `FRONTEND-SOURCE-REGISTRY-RENDERERS-SPLIT-001`, and the no-auth overnight cleanup direction.

Existing scripts to reuse: `foundation:verify`, `process:foundation-ship`, `node --check`, and the existing frontend split focused proof shape.

Implementation split plan: mechanically move the contiguous Foundation Systems route cluster from `buildByKey()` through `renderFoundationSystems()` into `public/foundation-system-inventory-renderers.js`. Also move the capability catalog, inventory category constants, and the System Inventory / capability route cluster from `renderCapabilityCard()` through `renderCapabilitySection()`. Keep FUB lead-source manager, Source Lifecycle, Backlog, Decisions, Open Questions, Current State, Daily Summary, and Build Log out of this slice.

Update `public/foundation.html` script order to:

1. `foundation-nav-config.js`
2. `foundation-data.js`
3. `foundation.js`
4. `foundation-source-registry-renderers.js`
5. `foundation-system-inventory-renderers.js`
6. `foundation-source-lifecycle-renderers.js`
7. `foundation-runtime-renderers.js`
8. `foundation-operations-renderers.js`
9. `foundation-router.js`

Reviewer split-source plan: update status helpers and verifier/readers touched by this slice so they read the combined split frontend surface instead of forcing moved Systems / Inventory symbols back into `public/foundation.js`.

Root invariant: the Foundation page must not care which file owns a renderer as long as the global renderer functions load before the router and the route can execute the moved functions. The focused proof must reject missing or wrong system-inventory-module script order instead of passing on substring markers.

Gate decision tree: static proof is too weak because global script order can compile while Systems or Inventory route dispatch fails. Focused proof is required because this changes browser file ownership and global function availability. Full ship is required before push because this touches browser scripts, package scripts, verifier coverage, closeout records, and current sprint docs.

Route/performance budget: keep the proof fast and proportional. `/foundation` must return under 2 seconds locally, all split browser scripts must return `200`, the focused proof should stay under 1 minute, the full ship gate should stay under the existing 300-second target, and the combined split script bytes must not exceed the pre-split frontend bytes by more than 5%. The focused check is read-only by default and must not update backlog, sprint state, job controls, source truth, or filesystem artifacts.

## Risks

- Risk: `foundation-router.js` calls Systems or Inventory route owners before the new module is loaded.
  - Repair path: focused proof fails on script order and VM-rendered route globals.
- Risk: moved Systems cards fail because shared source helpers moved in the prior split.
  - Repair path: focused proof executes Systems helper calls after source registry helpers load.
- Risk: capability routes break because `capabilityCatalog` moved out of `public/foundation.js`.
  - Repair path: focused proof checks `capabilityCatalog` is available before router dispatch.
- Risk: an older reviewer falsely expects moved Systems or Inventory symbols in `public/foundation.js`.
  - Repair path: update the reviewer to read the split frontend surface and dogfood that moved symbols are found there.
- Risk: this turns into a UI redesign or capability model expansion.
  - Repair path: no CSS, UI copy rewrite, API contract, route semantic, DB schema, hub feature, or agent registry behavior changes in this slice.

## Tests

```bash
node --check public/foundation-nav-config.js public/foundation-data.js public/foundation.js public/foundation-source-registry-renderers.js public/foundation-system-inventory-renderers.js public/foundation-source-lifecycle-renderers.js public/foundation-runtime-renderers.js public/foundation-operations-renderers.js public/foundation-router.js scripts/process-frontend-system-inventory-renderers-split-check.mjs lib/foundation-frontend-system-inventory-renderers-split.js
npm run process:frontend-system-inventory-renderers-split-check -- --json
curl -s -o /tmp/foundation.html -w "status=%{http_code} time=%{time_total} bytes=%{size_download}\n" http://localhost:3000/foundation
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FRONTEND-SYSTEM-INVENTORY-RENDERERS-SPLIT-001 --planApprovalRef=docs/process/approvals/FRONTEND-SYSTEM-INVENTORY-RENDERERS-SPLIT-001.json --closeoutKey=frontend-system-inventory-renderers-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the unsafe old shape by checking a missing system inventory module and wrong script order. It only passes when Systems / Inventory renderers live in their own module, `public/foundation.js` shrinks below 9,000 lines, route owner globals exist for router dispatch, shared helper behavior works after `foundation-source-registry-renderers.js`, and substring-only markers are not accepted.

## Not Next

- Do not redesign Systems or System Inventory UI styling.
- Do not change Foundation API contracts.
- Do not convert the frontend to ES modules or introduce a build system.
- Do not split FUB lead-source manager, backlog, decision, current-state, daily-summary, build-log, or open-question renderers in this slice.
- Do not change capability semantics, build Agent Registry, or start business-agent work.
- Do not touch hub UI, Marketing Video Lab live wiring, paid-source auth, source extraction, Drive permissions, Meeting Vault ACL Phase B, or autonomous dev.
