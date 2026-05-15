# FRONTEND-RUNTIME-RENDERERS-SPLIT-001 Plan

## What

Split the Foundation runtime diagnostics renderer cluster out of `public/foundation.js` into `public/foundation-runtime-renderers.js` without changing Foundation page behavior.

This slice moves the renderers that power the Runtime Health diagnostics used by the already-split operations renderer module:

- Foundation operations purpose panel
- Foundation jobs and runtime process control
- Meeting Vault auto-enforcement
- Agent Feedback auto-send, dry-run, and reminder panels
- Served-code and worker-code trust
- Backlog hygiene, post-ship fanout, card/source reference trust
- Doc archive, exception curation, hit-list reconcile, archive retire, research curation
- Sheets API trust, doctrine propagation, decision auto-emit, and LLM runtime panels

The new browser module stays a classic script loaded after `foundation.js` and before `foundation-operations-renderers.js`, so existing global function names remain stable.

## Why

`public/foundation.js` is still over 14K lines after the operations renderer split. That is actively dangerous and still violates the senior-engineer file-size guardrail. The safest next frontend split is the runtime diagnostics panel cluster because it is contiguous, coherent, and consumed by `renderDataHealth()` rather than scattered through hub feature work.

Steve needs the Foundation to get tighter while still moving fast. Runtime Health is the operator surface that explains whether jobs, source health, ship gates, stale runs, and trust checks are healthy. The real workflow this unlocks is cleaner morning review and faster diagnosis when a connector, worker, verifier, or ship gate goes degraded. Splitting this cluster makes that operator surface easier to maintain without adding more code to the main frontend monolith.

## Acceptance Criteria

- `public/foundation-runtime-renderers.js` exists and is loaded by `public/foundation.html` after `foundation.js` and before `foundation-operations-renderers.js`.
- `public/foundation.js` no longer defines the runtime diagnostics renderer names moved by this card.
- `public/foundation.js` line count decreases from the pre-split baseline of 14,206 lines.
- `public/foundation-operations-renderers.js` still owns `renderDataHealth()` and can reach the extracted runtime renderer globals.
- Focused proof executes the split scripts in a VM-backed fake browser and proves:
  - runtime renderer helper behavior still creates real DOM nodes,
  - `renderDataHealth()` can call at least three extracted runtime panel functions,
  - missing/wrong runtime-module script order fails closed,
  - `/foundation` and split browser scripts remain under route/script budget.
- Existing reviewer/check helpers that read split frontend source include the runtime module so moved renderer symbols do not become false reds.

## Definition Of Done

- Live backlog card `FRONTEND-RUNTIME-RENDERERS-SPLIT-001` is `done` and Current Sprint shows it as `Done This Sprint`.
- Plan approval validates at 9.8+ and a durable Plan Critic pass row exists before build.
- Focused proof passes through `npm run process:frontend-runtime-renderers-split-check -- --json`.
- `foundation:verify` and full `process:foundation-ship` pass before push.
- Closeout and Recent Work identify `frontend-runtime-renderers-split-v1`.

## Details

Existing code to reuse: runtime diagnostics panel functions currently inside `public/foundation.js`, `public/foundation-nav-config.js`, `public/foundation-data.js`, `public/foundation-operations-renderers.js`, `public/foundation-router.js`, and the VM-backed proof pattern from `scripts/process-frontend-operations-renderers-split-check.mjs`.

Existing docs and policy to reuse: AGENTS.md Foundation Rebuild Discipline, the 2026-05-13 deep audit monolith finding, `FRONTEND-MONOLITH-SPLIT-001`, `FRONTEND-OPERATIONS-RENDERERS-SPLIT-001`, and the no-auth overnight cleanup direction.

Existing scripts to reuse: `foundation:verify`, `process:foundation-ship`, `node --check`, and the existing frontend split focused proof shape.

Implementation split plan: mechanically move the contiguous runtime diagnostics renderer cluster from `renderFoundationOperationsPurposePanel()` through `renderLlmRuntimePanel()` into `public/foundation-runtime-renderers.js`. Keep helper names and global function names stable. Update `public/foundation.html` script order to:

1. `foundation-nav-config.js`
2. `foundation-data.js`
3. `foundation.js`
4. `foundation-runtime-renderers.js`
5. `foundation-operations-renderers.js`
6. `foundation-router.js`

Reviewer split-source plan: update any status helper or verifier touched by this slice that still reads only `public/foundation.js` for moved runtime renderer symbols. Those helpers should read the combined split frontend surface instead of forcing moved code back into the monolith.

Root invariant: the Foundation page must not care which file owns a renderer as long as the global renderer functions load before the router and the calling renderer can execute the moved functions. The focused proof must reject missing or wrong runtime script order instead of passing on substring markers.

Gate decision tree: static proof is too weak because global script order can compile while runtime route rendering fails. Focused proof is required because this changes browser file ownership and global function availability. Full ship is required before push because this touches browser scripts, package scripts, verifier coverage, closeout records, and current sprint docs.

Route/performance budget: `/foundation` must return under 2 seconds locally, all split browser scripts must return `200`, and the combined split script bytes must not exceed the pre-split frontend bytes by more than 5%. The focused check is read-only by default and must not update backlog, sprint state, job controls, source truth, or filesystem artifacts.

## Risks

- Risk: `renderDataHealth()` runs before runtime renderer globals exist.
  - Repair path: focused proof fails on script order and VM-rendered `renderDataHealth()` calls.
- Risk: an older reviewer falsely expects moved runtime symbols in `public/foundation.js`.
  - Repair path: update the reviewer to read the split frontend surface and dogfood that moved symbols are found there.
- Risk: this turns into a broad runtime UI rewrite.
  - Repair path: no CSS, UI copy, API contract, route semantic, or renderer behavior changes in this slice.
- Risk: adding verifier coverage grows the verifier monolith.
  - Repair path: keep verifier additions thin and explicit; continue verifier-module split work in later cleanup sprints.

## Tests

```bash
node --check public/foundation-nav-config.js public/foundation-data.js public/foundation.js public/foundation-runtime-renderers.js public/foundation-operations-renderers.js public/foundation-router.js scripts/process-frontend-runtime-renderers-split-check.mjs lib/foundation-frontend-runtime-renderers-split.js
npm run process:frontend-runtime-renderers-split-check -- --json
curl -s -o /tmp/foundation.html -w "status=%{http_code} time=%{time_total} bytes=%{size_download}\n" http://localhost:3000/foundation
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FRONTEND-RUNTIME-RENDERERS-SPLIT-001 --planApprovalRef=docs/process/approvals/FRONTEND-RUNTIME-RENDERERS-SPLIT-001.json --closeoutKey=frontend-runtime-renderers-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the unsafe old shape by checking a missing runtime module and wrong script order. It only passes when runtime renderers live in their own module, `public/foundation.js` shrinks, and `renderDataHealth()` can execute the extracted runtime panel functions.

## Not Next

- Do not redesign Runtime Health UI styling.
- Do not change Foundation API contracts.
- Do not convert the frontend to ES modules or introduce a build system.
- Do not split source registry, backlog, decision, current-state, or system-inventory renderers in this slice.
- Do not touch hub UI, Marketing Video Lab live wiring, paid-source auth, source extraction, Drive permissions, Meeting Vault ACL Phase B, or autonomous dev.
