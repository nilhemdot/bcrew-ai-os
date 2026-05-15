# FRONTEND-MONOLITH-SPLIT-001 Plan

## What

Split the first safe Foundation browser seams out of `public/foundation.js` without changing the Foundation page behavior.

V1 extracts three bounded browser modules:

- `public/foundation-nav-config.js` owns doc path maps, section labels, and breadcrumb parent config.
- `public/foundation-data.js` owns cache state, admin-token handling, Foundation read/mutation helpers, and fetch wrappers.
- `public/foundation-router.js` owns hash parsing, focus, nav updates, route dispatch, mobile nav init, and page init.

`public/foundation.js` keeps the heavy renderers for this slice. The HTML loads the new modules in dependency order before and after the remaining renderer file.

## Why

`public/foundation.js` is about 16K lines and is actively dangerous as a single edit surface. Steve wants hubs and Foundation work to move faster, but every new Foundation UI change currently risks touching one giant browser file.

The operator value is safer speed: future hub-safe Foundation UI work can use stable browser seams instead of adding cache, route, or fetch behavior to the frontend monolith. This also makes browser failures easier to diagnose because data access and routing have named files.

## Acceptance Criteria

- `public/foundation-nav-config.js`, `public/foundation-data.js`, and `public/foundation-router.js` exist and are loaded by `public/foundation.html` in the right order.
- `public/foundation.js` no longer owns the cache/data helper block or router/init block.
- `public/foundation.js` line count decreases from the pre-split baseline of 16,061 lines.
- A focused proof executes the served browser scripts in a VM-backed fake browser and proves routing dispatches to the right renderer.
- The same proof dogfoods cache behavior: repeated reads use cache, `clearFoundationCaches()` invalidates the cache, and mutation helpers clear cache after successful writes.
- The proof rejects old failure modes: missing script order, missing router module, missing data module, and route dispatch that does not call the expected renderer.

## Definition Of Done

- Live backlog card `FRONTEND-MONOLITH-SPLIT-001` is `done` and Current Sprint shows it as `Done This Sprint`.
- Plan approval validates at 9.8+ and a durable Plan Critic pass row exists before build.
- Focused proof passes through `npm run process:frontend-monolith-split-check -- --json`.
- `foundation:verify` and full `process:foundation-ship` pass before push.
- Closeout and Recent Builds identify `frontend-monolith-split-v1`.

## Details

Existing code to reuse: the current `public/foundation.js` data cache block, router/init block, nav config maps, admin-token helpers, `foundationRead`, `foundationMutation`, and all render functions. No renderer rewrite in V1.

Existing docs and policy to reuse: AGENTS.md Foundation Rebuild Discipline, the 2026-05-13 deep audit monolith finding, `FRONTEND-MONOLITH-SPLIT-001` live backlog row, and the prior no-auth monolith split closeouts.

Existing scripts to reuse: `foundation:verify`, `process:foundation-ship`, `node --check`, and the new focused proof script.

Implementation split/extraction plan: keep classic browser scripts instead of converting to ES modules. That is the smallest safe move because current Foundation renderers are global functions. V1 extracts only nav config, data/cache helpers, and router/init helpers out of the 16,061-line `public/foundation.js`. It adds no new responsibility to `public/foundation.js`. It may touch `scripts/foundation-verify.mjs` only to add verifier coverage for the split; no new verifier responsibility is added without a follow-up verifier-module split. Load order:

1. `foundation-nav-config.js`
2. `foundation-data.js`
3. `foundation.js`
4. `foundation-router.js`

The proof should evaluate these files in that order with fake `window`, `document`, `fetch`, `localStorage`, `URL`, and renderer functions where needed. It must call real frontend functions, not only check source markers.

Gate decision tree: static proof is too weak because script order and route dispatch can compile while failing in the browser; focused proof is required because this changes browser behavior; full gate is required before push because `public/foundation.html`, `public/foundation.js`, package scripts, verifier coverage, and closeout records change. Keep the focused proof under 2 minutes so future browser splits can use it.

Route/performance budget: this slice must not make the Foundation browser route heavier. `/foundation` must return HTML in under 2 seconds locally, the four browser scripts must each return `200`, and the combined bytes of `foundation-nav-config.js`, `foundation-data.js`, `foundation.js`, and `foundation-router.js` must not exceed the pre-split `public/foundation.js` bytes by more than 5%. The focused proof records the served route/script budget.

## Risks

- Risk: script load order breaks globals used by renderers.
  - Repair path: proof fails if HTML order is wrong or required globals are missing.
- Risk: route dispatch stops rendering sections.
  - Repair path: VM proof sets hashes and proves expected render functions are called.
- Risk: cache invalidation behavior changes.
  - Repair path: dogfood repeated reads, clear-cache, and mutation success paths.
- Risk: this becomes a broad frontend rewrite.
  - Repair path: do not move renderers, CSS, route semantics, API contracts, or UI copy in V1.

## Tests

```bash
node --check public/foundation-nav-config.js public/foundation-data.js public/foundation.js public/foundation-router.js scripts/process-frontend-monolith-split-check.mjs
npm run process:frontend-monolith-split-check -- --json
curl -s -o /tmp/foundation.html -w "status=%{http_code} time=%{time_total} bytes=%{size_download}\n" http://localhost:3000/foundation
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FRONTEND-MONOLITH-SPLIT-001 --planApprovalRef=docs/process/approvals/FRONTEND-MONOLITH-SPLIT-001.json --closeoutKey=frontend-monolith-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the unsafe old shape: one giant file owning data cache and routing without a separate script-order boundary. It proves missing modules or broken route dispatch fail before ship.

## Not Next

- Do not rewrite Foundation UI styling.
- Do not move large renderer groups in this slice.
- Do not convert the frontend to ES modules or a build system.
- Do not change Foundation API contracts.
- Do not touch hub UI, Marketing Video Lab live wiring, paid-source auth, source extraction, Drive permissions, Meeting Vault ACL Phase B, or autonomous dev.
