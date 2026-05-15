# FRONTEND-SOURCE-LIFECYCLE-RENDERERS-SPLIT-001 Plan

## What

Split the Foundation source lifecycle renderer cluster out of `public/foundation.js` into `public/foundation-source-lifecycle-renderers.js` without changing Foundation page behavior.

This slice moves the renderers that power the Source Lifecycle and source-health review surfaces:

- Source lifecycle tone, hero, and summary renderers
- Foundation UI complete panel
- Source maturity, connector matrix, hub routing, extraction coverage, and coverage closeout panels
- Marketing source map, brand stack, tier completion, verification runs, per-user changelog, and restricted decision queue panels
- Source lifecycle definitions, evidence, lanes, targets, parked items, and scope panels

The new browser module stays a classic script loaded after `foundation.js` and before the runtime, operations, and router modules. Existing global function names remain stable.

## Why

`public/foundation.js` is still over 12K lines after the frontend/runtime renderer splits. That is still actively dangerous under the Foundation rebuild discipline. The source lifecycle cluster is the next safest contiguous frontend slice because it is coherent, source-oriented, and used by `renderSourceLifecycle()` rather than by hub feature work.

Steve needs Foundation to keep getting smaller while preserving the operating surfaces that show whether source contracts, connector coverage, extraction readiness, and source lifecycle work are real. Splitting this cluster gives that surface a named ownership seam without changing data contracts, route behavior, styling, or product scope.

The useful operator value is that Steve can still use Source Lifecycle as the real workflow for checking which sources are healthy, which connector/source contracts are ready, which extraction paths are covered, which hub routes can use the mined source value, and which restricted decisions still need review. This slice improves speed and quality for that workflow by making the source-health renderer ownership smaller and easier to audit without weakening the operator page.

## Acceptance Criteria

- `public/foundation-source-lifecycle-renderers.js` exists and is loaded by `public/foundation.html` after `foundation.js` and before `foundation-runtime-renderers.js`, `foundation-operations-renderers.js`, and `foundation-router.js`.
- `public/foundation.js` no longer defines the source lifecycle renderer names moved by this card.
- `public/foundation.js` line count decreases from the pre-split baseline of 12,717 lines.
- `renderSourceLifecycle()` stays in `public/foundation.js` and can reach the extracted renderer globals.
- Focused proof executes the split scripts in a VM-backed fake browser and proves:
  - extracted source lifecycle helper behavior creates real DOM nodes,
  - `renderSourceLifecycle()` dispatch can call extracted source lifecycle renderer functions,
  - missing/wrong source-lifecycle-module script order fails closed,
  - `/foundation` and split browser scripts remain under route/script budget.
- Existing reviewer/check helpers that read split frontend source include the source lifecycle module so moved renderer symbols do not become false reds.

## Definition Of Done

- Live backlog card `FRONTEND-SOURCE-LIFECYCLE-RENDERERS-SPLIT-001` is `done` and Current Sprint shows it as `Done This Sprint`.
- Plan approval validates at 9.8+ and a durable Plan Critic pass row exists before build.
- Focused proof passes through `npm run process:frontend-source-lifecycle-renderers-split-check -- --json`.
- `foundation:verify` and full `process:foundation-ship` pass before push.
- Closeout and Recent Work identify `frontend-source-lifecycle-renderers-split-v1`.

## Details

Existing code to reuse: source lifecycle renderer functions currently inside `public/foundation.js`, shared source helpers that remain in `public/foundation.js`, `public/foundation-nav-config.js`, `public/foundation-data.js`, `public/foundation-runtime-renderers.js`, `public/foundation-operations-renderers.js`, `public/foundation-router.js`, and the VM-backed proof pattern from the prior frontend split checks.

Existing docs and policy to reuse: AGENTS.md Foundation Rebuild Discipline, the 2026-05-13 deep audit monolith finding, `FRONTEND-MONOLITH-SPLIT-001`, `FRONTEND-OPERATIONS-RENDERERS-SPLIT-001`, `FRONTEND-RUNTIME-RENDERERS-SPLIT-001`, and the no-auth overnight cleanup direction.

Existing scripts to reuse: `foundation:verify`, `process:foundation-ship`, `node --check`, and the existing frontend split focused proof shape.

Implementation split plan: mechanically move the contiguous source lifecycle renderer cluster from `sourceLifecycleTone()` through `renderSourceLifecycleScope()` into `public/foundation-source-lifecycle-renderers.js`. Keep shared helpers in `public/foundation.js` for this slice. Keep helper names and global function names stable. Update `public/foundation.html` script order to:

1. `foundation-nav-config.js`
2. `foundation-data.js`
3. `foundation.js`
4. `foundation-source-lifecycle-renderers.js`
5. `foundation-runtime-renderers.js`
6. `foundation-operations-renderers.js`
7. `foundation-router.js`

Reviewer split-source plan: update any status helper or verifier touched by this slice that still reads only `public/foundation.js` plus the prior split modules for moved source lifecycle renderer symbols. Those helpers should read the combined split frontend surface instead of forcing moved code back into the monolith.

Root invariant: the Foundation page must not care which file owns a renderer as long as the global renderer functions load before the router and the calling renderer can execute the moved functions. The focused proof must reject missing or wrong source lifecycle script order instead of passing on substring markers.

Gate decision tree: static proof is too weak because global script order can compile while source lifecycle rendering fails. Focused proof is required because this changes browser file ownership and global function availability. Full ship is required before push because this touches browser scripts, package scripts, verifier coverage, closeout records, and current sprint docs.

Route/performance budget: `/foundation` must return under 2 seconds locally, all split browser scripts must return `200`, and the combined split script bytes must not exceed the pre-split frontend bytes by more than 5%. The focused check is read-only by default and must not update backlog, sprint state, job controls, source truth, or filesystem artifacts.

## Risks

- Risk: `renderSourceLifecycle()` runs before source lifecycle renderer globals exist.
  - Repair path: focused proof fails on script order and VM-rendered `renderSourceLifecycle()` calls.
- Risk: an older reviewer falsely expects moved source lifecycle symbols in `public/foundation.js`.
  - Repair path: update the reviewer to read the split frontend surface and dogfood that moved symbols are found there.
- Risk: this turns into a source lifecycle UI redesign.
  - Repair path: no CSS, UI copy, API contract, route semantic, or renderer behavior changes in this slice.
- Risk: adding verifier coverage grows the verifier monolith.
  - Repair path: keep verifier additions thin and explicit; continue verifier-module split work in later cleanup sprints.

## Tests

```bash
node --check public/foundation-nav-config.js public/foundation-data.js public/foundation.js public/foundation-source-lifecycle-renderers.js public/foundation-runtime-renderers.js public/foundation-operations-renderers.js public/foundation-router.js scripts/process-frontend-source-lifecycle-renderers-split-check.mjs lib/foundation-frontend-source-lifecycle-renderers-split.js
npm run process:frontend-source-lifecycle-renderers-split-check -- --json
curl -s -o /tmp/foundation.html -w "status=%{http_code} time=%{time_total} bytes=%{size_download}\n" http://localhost:3000/foundation
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FRONTEND-SOURCE-LIFECYCLE-RENDERERS-SPLIT-001 --planApprovalRef=docs/process/approvals/FRONTEND-SOURCE-LIFECYCLE-RENDERERS-SPLIT-001.json --closeoutKey=frontend-source-lifecycle-renderers-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the unsafe old shape by checking a missing source lifecycle module and wrong script order. It only passes when source lifecycle renderers live in their own module, `public/foundation.js` shrinks, and `renderSourceLifecycle()` can execute the extracted source lifecycle panel functions.

## Not Next

- Do not redesign Source Lifecycle UI styling.
- Do not change Foundation API contracts.
- Do not convert the frontend to ES modules or introduce a build system.
- Do not split source registry, backlog, decision, current-state, or system-inventory renderers in this slice.
- Do not touch hub UI, Marketing Video Lab live wiring, paid-source auth, source extraction, Drive permissions, Meeting Vault ACL Phase B, or autonomous dev.
