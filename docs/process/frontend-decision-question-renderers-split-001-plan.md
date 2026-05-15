# FRONTEND-DECISION-QUESTION-RENDERERS-SPLIT-001 Plan

## What

Split the Foundation Decisions / Open Questions renderer cluster out of `public/foundation.js` into `public/foundation-decision-question-renderers.js` without changing product behavior.

This V1 moves decision memory cards, parking-lot capture cards, open-question cards, decision review grouping, decision/open-question create and editor controls, pending doc-update cards, and supporting decision/question helpers into a dedicated classic browser script.

The route owners `renderDecisions()` and `renderOpenQuestions()` remain in `public/foundation.js` for this slice. They keep calling the same browser-global helper functions after the new module loads.

## Why

`public/foundation.js` is still about 6,348 lines after the Current State split. That is below the old 10K active-danger line but still above Steve's 5K refactor threshold.

Decisions and Open Questions are route-local review surfaces with a clean ownership seam. Splitting their helper/render cluster should pull `public/foundation.js` below 5,000 lines without changing Foundation Hub API contracts, Backlog, Action Review, source lifecycle, or hub behavior.

## Acceptance Criteria

- `public/foundation-decision-question-renderers.js` exists and is loaded by `public/foundation.html` after `public/foundation-current-state-renderers.js` and before `foundation-router.js`.
- `public/foundation.js` no longer defines the moved Decisions / Open Questions helper functions, including `renderDecisionMemoryCard()`, `renderOpenQuestionCard()`, `renderDecisionReviewPanel()`, `renderDecisionCreatePanel()`, `renderDecisionEditor()`, `renderPendingDocUpdateCard()`, `renderQuestionCreatePanel()`, and `renderQuestionEditor()`.
- `public/foundation.js` line count decreases from the pre-split baseline of 6,348 lines and lands under 5,000 lines.
- Existing route behavior remains stable: `renderDecisions()` and `renderOpenQuestions()` can still call the moved globals after script load.
- Focused proof executes the split browser scripts in a VM-backed fake DOM and proves:
  - moved Decisions / Open Questions globals are present,
  - decision cards render from synthetic decision data,
  - decision review grouping renders from synthetic hub data,
  - pending doc update cards render from synthetic doc-update data,
  - open-question groups/cards render from synthetic question data,
  - create/editor controls still construct DOM nodes without live mutation,
  - missing or wrong Decisions / Open Questions module script order fails closed,
  - `/foundation` and the new split browser script serve under the route/script budget.
- Split-source verifier/readers are updated so moved decision/question symbols are read from the combined frontend surface instead of forcing them back into `public/foundation.js`.

## Definition Of Done

- Live backlog card `FRONTEND-DECISION-QUESTION-RENDERERS-SPLIT-001` is `done` and Current Sprint shows it as `Done This Sprint`.
- Plan approval validates at 9.8+ and a durable Plan Critic pass row exists before build.
- Focused proof passes through `npm run process:frontend-decision-question-renderers-split-check -- --json`.
- `foundation:verify` and full `process:foundation-ship` pass before push.
- Closeout and Recent Work identify `frontend-decision-question-renderers-split-v1`.

## Details

Existing code to reuse: the Decisions / Open Questions helper cluster currently inside `public/foundation.js`, data loaders in `public/foundation-data.js`, route owners in `public/foundation.js`, and VM-backed proof patterns from the prior frontend split scripts.

Implementation split plan: mechanically move the route-local Decisions / Open Questions helper cluster from `formatDecisionStatusLabel()` through `renderQuestionEditor()` into `public/foundation-decision-question-renderers.js`. Leave Backlog, Action Review, shared form helpers, Data Sources, Current State, and route owner functions in their current files for this slice.

Update `public/foundation.html` script order to:

1. `foundation-nav-config.js`
2. `foundation-data.js`
3. `foundation.js`
4. `foundation-source-registry-renderers.js`
5. `foundation-fub-lead-source-renderers.js`
6. `foundation-system-inventory-renderers.js`
7. `foundation-current-state-renderers.js`
8. `foundation-decision-question-renderers.js`
9. `foundation-source-lifecycle-renderers.js`
10. `foundation-runtime-renderers.js`
11. `foundation-operations-renderers.js`
12. `foundation-router.js`

Root invariant: the Foundation Decisions and Open Questions routes must not care which file owns their route-local helper functions as long as the globals load before route dispatch and the pages can execute against synthetic hub state without live mutation.

Gate decision tree: static proof is too weak because script order can compile while the routes fail at runtime. Focused VM proof is required for browser global availability, helper behavior, synthetic render behavior, and missing/wrong script order. Full Foundation ship is required before push because this touches browser scripts, package scripts, verifier coverage, closeout records, and current sprint docs.

Route/performance budget: keep the proof fast and proportional. `/foundation` must return under 2 seconds locally, the new split browser script must return `200`, the focused proof should stay under 1 minute, and the full ship gate should stay under the existing 300-second target. The focused check is read-only by default and must not update backlog, sprint state, job controls, source truth, or filesystem artifacts outside this card's planned files.

## Risks

- Risk: `renderDecisions()` or `renderOpenQuestions()` calls a moved helper before the new module is loaded.
  - Repair path: focused proof fails on missing or wrong Decisions / Open Questions module order.
- Risk: moved renderers lose access to shared helpers such as `buildField()`, `buildInput()`, `buildTextarea()`, `buildSelect()`, `renderStatusCard()`, `sortBacklogItems()`, or `foundationMutation()`.
  - Repair path: focused proof executes the moved helpers after `foundation-data.js` and `foundation.js` load in the expected order.
- Risk: this accidentally becomes a Backlog or Action Review split.
  - Repair path: no Backlog/Action Review extraction, no visual redesign, no API contract changes, and no product/hub work in this slice.
- Risk: an older verifier falsely expects moved Decisions / Open Questions symbols in `public/foundation.js`.
  - Repair path: update split-source readers to use the combined frontend bundle and dogfood that moved symbols live in the new module.

## Tests

```bash
node --check public/foundation-nav-config.js public/foundation-data.js public/foundation.js public/foundation-source-registry-renderers.js public/foundation-fub-lead-source-renderers.js public/foundation-system-inventory-renderers.js public/foundation-current-state-renderers.js public/foundation-decision-question-renderers.js public/foundation-source-lifecycle-renderers.js public/foundation-runtime-renderers.js public/foundation-operations-renderers.js public/foundation-router.js scripts/process-frontend-decision-question-renderers-split-check.mjs lib/foundation-frontend-decision-question-renderers-split.js
npm run process:frontend-decision-question-renderers-split-check -- --json
curl -s -o /tmp/foundation.html -w "status=%{http_code} time=%{time_total} bytes=%{size_download}\n" http://localhost:3000/foundation
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FRONTEND-DECISION-QUESTION-RENDERERS-SPLIT-001 --planApprovalRef=docs/process/approvals/FRONTEND-DECISION-QUESTION-RENDERERS-SPLIT-001.json --closeoutKey=frontend-decision-question-renderers-split-v1 --commitRef=HEAD
```

Dogfood proof recreates the unsafe old shape by checking a missing Decisions / Open Questions module and wrong script order. It only passes when moved renderers live in their own module, `public/foundation.js` shrinks below 5,000 lines, route globals remain callable, synthetic Decisions/Open Questions rendering works, and substring-only proof is rejected. Source-substring checks are allowed only as secondary artifact guards after the VM behavior path proves the moved routes work.

## Not Next

- Do not redesign Decisions or Open Questions UX.
- Do not change Foundation Hub, Decisions, Open Questions, Backlog, Action Review, or source API contracts.
- Do not split Backlog, Action Review, Data Sources, strategy docs, or Live Doc freshness in this slice.
- Do not touch hub UI, Marketing Video Lab live wiring, paid-source auth, source extraction, Drive permissions, Meeting Vault ACL Phase B, or autonomous dev.
