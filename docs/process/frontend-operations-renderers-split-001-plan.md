# FRONTEND-OPERATIONS-RENDERERS-SPLIT-001 Plan

## What

Split the Foundation operations renderer cluster out of `public/foundation.js` without changing the Foundation page behavior.

This slice extracts the renderers for:

- Runtime Health (`renderDataHealth`)
- System Activity (`renderSystemActivity`)
- Daily Summary (`renderDailySummary` and helpers)
- Recent Work / Current Sprint build log (`renderBuildLog` and helpers)

The new browser module is `public/foundation-operations-renderers.js`. It stays a classic browser script, loaded after `public/foundation.js` and before `public/foundation-router.js`, so the existing global render-function pattern remains intact while the monolith shrinks.

## Why

`public/foundation.js` is still more than 15K lines after the first frontend split. That is still actively dangerous for Foundation UI work. The first split separated nav, data/cache, and routing. The next safest cut is the operations renderer tail because it is already a coherent cluster and is only called through the router or data-helper callbacks.

Steve needs speed with quality. The useful operator value is faster, safer work on the surfaces Steve actually uses to decide what happened overnight: Recent Work, Runtime Health, Daily Summary, and System Activity. Those pages are the morning review and sprint-control surfaces. Moving them into a named module unlocks safer product behavior changes on those real workflow pages without adding more code to the frontend monolith or slowing Steve down during sprint review.

## Acceptance Criteria

- `public/foundation-operations-renderers.js` exists and is loaded by `public/foundation.html` after `foundation.js` and before `foundation-router.js`.
- `public/foundation.js` no longer defines the operations renderers named above.
- `public/foundation.js` line count decreases from the pre-split baseline of 15,305 lines.
- Focused proof executes the split scripts in a VM-backed fake browser and proves:
  - the extracted helper functions execute real behavior,
  - router dispatch can reach the extracted operations renderers,
  - missing/wrong operations-module script order fails closed,
  - `/foundation` and the split scripts remain under route/script budget.
- Existing reviewer/check helpers that read the split frontend source include the new operations renderer module so old UI checks do not become false reds.

## Definition Of Done

- Live backlog card `FRONTEND-OPERATIONS-RENDERERS-SPLIT-001` is `done` and Current Sprint shows it as `Done This Sprint`.
- Plan approval validates at 9.8+ and a durable Plan Critic pass row exists before build.
- Focused proof passes through `npm run process:frontend-operations-renderers-split-check -- --json`.
- `foundation:verify` and full `process:foundation-ship` pass before push.
- Closeout and Recent Work identify `frontend-operations-renderers-split-v1`.

## Details

Existing code to reuse: the operations renderer tail currently inside `public/foundation.js`, `public/foundation-nav-config.js`, `public/foundation-data.js`, `public/foundation-router.js`, previous `FRONTEND-MONOLITH-SPLIT-001` proof patterns, and split-source reviewer changes from the prior frontend split.

Existing docs and policy to reuse: AGENTS.md Foundation Rebuild Discipline, the 2026-05-13 deep audit monolith finding, `FRONTEND-MONOLITH-SPLIT-001` closeout, and the no-auth overnight cleanup direction.

Existing scripts to reuse: `foundation:verify`, `process:foundation-ship`, `node --check`, and the VM-backed focused browser proof pattern from `scripts/process-frontend-monolith-split-check.mjs`.

Implementation split plan: do not rewrite renderer logic. Mechanically move the contiguous operations renderer cluster into `public/foundation-operations-renderers.js`. Keep helper names and global function names stable. Update `public/foundation.html` script order to:

1. `foundation-nav-config.js`
2. `foundation-data.js`
3. `foundation.js`
4. `foundation-operations-renderers.js`
5. `foundation-router.js`

Reviewer split-source plan: update any current status helpers touched by this slice that still read only `public/foundation.js` for moved operations renderer symbols. Those helpers should read the combined split frontend surface instead of forcing moved code back into the monolith.

Gate decision tree: static proof is too weak because global script order can compile while route dispatch fails in the browser. Focused proof is required because this changes browser file ownership and global function availability. The focused process check is read-only by default: it may read files, call read-only APIs, validate DB truth, and measure served routes, but it must not update backlog, sprint state, plan critic rows, job controls, source truth, or filesystem artifacts. If a future version needs writes, it must add explicit `--apply` posture and a separate approval. Full ship is required before push because this touches browser scripts, package scripts, verifier coverage, docs, and closeout records.

Route/performance budget: `/foundation` must return under 2 seconds locally, all split browser scripts must return `200`, and the combined split script bytes must not exceed the pre-split frontend bytes by more than 5%.

## Risks

- Risk: the router loads before extracted renderer globals exist.
  - Repair path: focused proof fails on script order and route dispatch.
- Risk: an older reviewer falsely expects moved operations symbols in `public/foundation.js`.
  - Repair path: update the reviewer to read the split frontend surface and dogfood that moved symbols are found there.
- Risk: this turns into a broad frontend rewrite.
  - Repair path: no CSS, UI copy, API contract, route semantic, or renderer behavior changes in this slice.
- Risk: adding verifier coverage grows the verifier monolith.
  - Repair path: keep verifier additions thin and explicit; continue verifier-module split work in later cleanup sprints.

## Tests

```bash
node --check public/foundation-nav-config.js public/foundation-data.js public/foundation.js public/foundation-operations-renderers.js public/foundation-router.js scripts/process-frontend-operations-renderers-split-check.mjs lib/foundation-frontend-operations-renderers-split.js
npm run process:frontend-operations-renderers-split-check -- --json
curl -s -o /tmp/foundation.html -w "status=%{http_code} time=%{time_total} bytes=%{size_download}\n" http://localhost:3000/foundation
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FRONTEND-OPERATIONS-RENDERERS-SPLIT-001 --planApprovalRef=docs/process/approvals/FRONTEND-OPERATIONS-RENDERERS-SPLIT-001.json --closeoutKey=frontend-operations-renderers-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the unsafe old shape by checking a missing operations module and wrong script order. It only passes when the operations renderers live in their own module, `public/foundation.js` shrinks, and route dispatch can reach the extracted renderer globals.

## Not Next

- Do not redesign Foundation UI styling.
- Do not change Foundation API contracts.
- Do not convert the frontend to ES modules or introduce a build system.
- Do not split every renderer in this slice.
- Do not touch hub UI, Marketing Video Lab live wiring, paid-source auth, source extraction, Drive permissions, Meeting Vault ACL Phase B, or autonomous dev.
