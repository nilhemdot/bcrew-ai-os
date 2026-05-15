# FRONTEND-SOURCE-REGISTRY-RENDERERS-SPLIT-001 Plan

## What

Split the Foundation Data Sources / Source Registry renderer cluster out of `public/foundation.js` into `public/foundation-source-registry-renderers.js` without changing Foundation page behavior.

This slice moves the renderers and helpers that power the Data Sources, connector, grouped source system, and KPI source-health surfaces:

- source kind, presence, trust, filtering, sorting, tag, metadata, link, and bullet helpers
- source contract cards, accordion items, legend, grouped source systems, source systems panel, source hero, and purpose panel
- connector state, connector cards, connector stacks, and connector panel
- KPI / Supabase health cards, runtime warning, and table/RPC source-health renderers
- source operator notes drawer

The new browser module stays a classic script loaded after `foundation.js` and before `foundation-source-lifecycle-renderers.js`, `foundation-runtime-renderers.js`, `foundation-operations-renderers.js`, and `foundation-router.js`. Existing global function names remain stable.

## Why

`public/foundation.js` is still over 11K lines after the frontend/source lifecycle splits. That is still actively dangerous under the Foundation rebuild discipline. The Data Sources / Source Registry cluster is the next safest contiguous frontend slice because it is source-oriented, mostly renderer-only, and called by the route owner `renderSourceRegistry()` rather than by hub feature code.

Steve needs the Foundation frontend to keep shrinking while preserving the operator surfaces that show source contracts, connector trust, KPI health, and source notes. Splitting this cluster gives Data Sources a named ownership seam and should pull `public/foundation.js` below the 10K-line danger threshold without changing APIs, CSS, source contracts, hub behavior, or product scope.

The useful operator value is quality in the real workflow Steve uses to audit Foundation: Data Sources stays fast and readable when checking whether a source is trusted, whether a connector is only a pipe, and whether KPI/Supabase health needs attention. This unlocks safer hub work later because Steve can inspect source trust without asking a builder to read an 11K-line frontend file.

## Acceptance Criteria

- `public/foundation-source-registry-renderers.js` exists and is loaded by `public/foundation.html` after `foundation.js` and before the source lifecycle, runtime, operations, and router scripts.
- `public/foundation.js` no longer defines the source registry renderer names moved by this card.
- `public/foundation.js` line count decreases from the pre-split baseline of 11,223 lines and lands under 10,000 lines.
- `renderSourceRegistry()` stays in `public/foundation.js` as the route owner and can reach the extracted renderer globals.
- Existing split modules that use `renderSourceTag`, `renderSourceMetaItem`, or `renderSourceBulletGroup` still work because script order makes those globals available before route dispatch.
- Focused proof executes the split scripts in a VM-backed fake browser and proves:
  - extracted source registry helper behavior creates real DOM nodes,
  - `renderSourceRegistry()` dispatch can call extracted source registry renderer functions,
  - Source Lifecycle renderers can still call shared source helpers,
  - missing/wrong source-registry-module script order fails closed,
  - `/foundation` and split browser scripts remain under route/script budget.
- Existing reviewer/check helpers that read split frontend source include the source registry module so moved renderer symbols do not become false reds.

## Definition Of Done

- Live backlog card `FRONTEND-SOURCE-REGISTRY-RENDERERS-SPLIT-001` is `done` and Current Sprint shows it as `Done This Sprint`.
- Plan approval validates at 9.8+ and a durable Plan Critic pass row exists before build.
- Focused proof passes through `npm run process:frontend-source-registry-renderers-split-check -- --json`.
- `foundation:verify` and full `process:foundation-ship` pass before push.
- Closeout and Recent Work identify `frontend-source-registry-renderers-split-v1`.

## Details

Existing code to reuse: source registry renderer functions currently inside `public/foundation.js`, shared source helpers used by the existing source lifecycle split module, `public/foundation-nav-config.js`, `public/foundation-data.js`, `public/foundation-source-lifecycle-renderers.js`, `public/foundation-runtime-renderers.js`, `public/foundation-operations-renderers.js`, `public/foundation-router.js`, and the VM-backed proof pattern from the prior frontend split checks.

Existing docs and policy to reuse: AGENTS.md Foundation Rebuild Discipline, the 2026-05-13 deep audit monolith finding, `FRONTEND-MONOLITH-SPLIT-001`, `FRONTEND-OPERATIONS-RENDERERS-SPLIT-001`, `FRONTEND-RUNTIME-RENDERERS-SPLIT-001`, `FRONTEND-SOURCE-LIFECYCLE-RENDERERS-SPLIT-001`, and the no-auth overnight cleanup direction.

Existing scripts to reuse: `foundation:verify`, `process:foundation-ship`, `node --check`, and the existing frontend split focused proof shape.

Implementation split plan: mechanically move the contiguous source registry renderer cluster from `getSourceKind()` through `renderKpiHealthRuntimeWarning()` plus `renderSourceConnectorsPanel()` and `renderSourceOperatorNotesDrawer()` into `public/foundation-source-registry-renderers.js`. Keep route-level `renderSourceRegistry()` in `public/foundation.js`. Keep `renderFoundationSystems()` in `public/foundation.js` for this slice, but let it call shared source helpers from the new module. Keep FUB lead-source manager and System Inventory renderers out of this slice.

Update `public/foundation.html` script order to:

1. `foundation-nav-config.js`
2. `foundation-data.js`
3. `foundation.js`
4. `foundation-source-registry-renderers.js`
5. `foundation-source-lifecycle-renderers.js`
6. `foundation-runtime-renderers.js`
7. `foundation-operations-renderers.js`
8. `foundation-router.js`

Reviewer split-source plan: update any status helper or verifier touched by this slice that still reads only `public/foundation.js` plus the prior split modules for moved source registry renderer symbols. Those helpers should read the combined split frontend surface instead of forcing moved code back into the monolith.

Root invariant: the Foundation page must not care which file owns a renderer as long as the global renderer functions load before the router and the calling route can execute the moved functions. The focused proof must reject missing or wrong source registry script order instead of passing on substring markers.

Gate decision tree: static proof is too weak because global script order can compile while Data Sources rendering fails. Focused proof is required because this changes browser file ownership and global function availability. Full ship is required before push because this touches browser scripts, package scripts, verifier coverage, closeout records, and current sprint docs.

Route/performance budget: `/foundation` must return under 2 seconds locally, all split browser scripts must return `200`, and the combined split script bytes must not exceed the pre-split frontend bytes by more than 5%. The focused check is read-only by default and must not update backlog, sprint state, job controls, source truth, or filesystem artifacts.

## Risks

- Risk: `renderSourceRegistry()` runs before source registry renderer globals exist.
  - Repair path: focused proof fails on script order and VM-rendered `renderSourceRegistry()` calls.
- Risk: Source Lifecycle renderers fail because shared source helpers moved.
  - Repair path: focused proof executes source lifecycle helper calls after the new module loads.
- Risk: an older reviewer falsely expects moved source registry symbols in `public/foundation.js`.
  - Repair path: update the reviewer to read the split frontend surface and dogfood that moved symbols are found there.
- Risk: this turns into a Data Sources UI redesign.
  - Repair path: no CSS, UI copy, API contract, route semantic, or renderer behavior changes in this slice.
- Risk: adding verifier coverage grows the verifier monolith.
  - Repair path: keep verifier additions thin and explicit; continue verifier-module split work in later cleanup sprints.

## Tests

```bash
node --check public/foundation-nav-config.js public/foundation-data.js public/foundation.js public/foundation-source-registry-renderers.js public/foundation-source-lifecycle-renderers.js public/foundation-runtime-renderers.js public/foundation-operations-renderers.js public/foundation-router.js scripts/process-frontend-source-registry-renderers-split-check.mjs lib/foundation-frontend-source-registry-renderers-split.js
npm run process:frontend-source-registry-renderers-split-check -- --json
curl -s -o /tmp/foundation.html -w "status=%{http_code} time=%{time_total} bytes=%{size_download}\n" http://localhost:3000/foundation
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FRONTEND-SOURCE-REGISTRY-RENDERERS-SPLIT-001 --planApprovalRef=docs/process/approvals/FRONTEND-SOURCE-REGISTRY-RENDERERS-SPLIT-001.json --closeoutKey=frontend-source-registry-renderers-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the unsafe old shape by checking a missing source registry module and wrong script order. It only passes when source registry renderers live in their own module, `public/foundation.js` shrinks below 10K lines, `renderSourceRegistry()` can execute the extracted Data Sources panel functions, and Source Lifecycle can still call shared source helper globals.

## Not Next

- Do not redesign Data Sources UI styling.
- Do not change Foundation API contracts.
- Do not convert the frontend to ES modules or introduce a build system.
- Do not split FUB lead-source manager, system inventory, backlog, decision, current-state, or open-question renderers in this slice.
- Do not touch hub UI, Marketing Video Lab live wiring, paid-source auth, source extraction, Drive permissions, Meeting Vault ACL Phase B, or autonomous dev.
