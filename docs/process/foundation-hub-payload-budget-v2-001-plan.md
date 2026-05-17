# FOUNDATION-HUB-PAYLOAD-BUDGET-V2-001 Plan

## What
Make the default `/api/foundation-hub` payload budget explicit, source-backed, and hard to game.

V2 sets the canonical summary route budget at 650KB, adds live payload-budget metadata to the default Foundation Hub response, and moves the guard into `lib/foundation-hub-payload-budget-v2.js`.

## Why
Foundation Hub has already needed several payload repairs as backlog, sprint, runtime, and change-event surfaces grew. The route is currently healthy, but the system has too many budget definitions: older performance metadata allowed 1.5MB, route cleanup checked 800KB, and the backlog contract checked 650KB.

The useful operator outcome is payload stability before more Foundation/source/extractor work builds on this route. Steve should not have to notice the Hub getting heavier. The route should fail proof if summary mode leaks full diagnostics, loses backlog card identity, or only passes by hiding rows.

## Acceptance Criteria
- Live backlog card `FOUNDATION-HUB-PAYLOAD-BUDGET-V2-001` exists and owns this sprint.
- Default `/api/foundation-hub` exposes `foundationHubPayloadBudgetV2`.
- The default route stays in summary mode and under 650KB.
- `foundationHubPerformance.budget.maxPayloadBytes` uses the same canonical 650KB budget.
- Full-diagnostic keys stay out of the summary route.
- Backlog card count is preserved: budget proof must not pass by dropping rows.
- Explicit full diagnostics remains under the existing 4.2MB budget after V2 metadata/card growth.
- Dogfood proof rejects oversized payloads, full-diagnostic leaks, hidden backlog rows, missing compaction markers, and arbitrary row dropping.
- Focused proof is read-only by default and does not write backlog, sprint, DB schema, files, Gmail, ClickUp, or connector state.
- Full `process:foundation-ship` passes before commit and push.

## Definition Of Done
- Add `lib/foundation-hub-payload-budget-v2.js`.
- Wire V2 metadata through `lib/foundation-hub-performance.js`.
- Add verifier coverage through the hub-safety verifier and root progression guard.
- Add `scripts/process-foundation-hub-payload-budget-v2-check.mjs`.
- Register `process:foundation-hub-payload-budget-v2-check`.
- Add approval artifact and closeout registry record.
- Write closeout handoff after focused proof, backlog hygiene, `foundation:verify`, and full Foundation ship gate pass.

## Details
Existing code to reuse: `lib/foundation-hub-performance.js`, `lib/foundation-hub-backlog-contract.js`, `lib/foundation-hub-safety-verifier.js`, live backlog/current sprint truth, approval integrity, Plan Critic rows, backlog hygiene, and `process:foundation-ship`.

Gate decision tree: static gate is `node --check`; focused gate is `process:foundation-hub-payload-budget-v2-check`; full gate is required because the sprint touches route payload metadata, verifier coverage, process docs, and package scripts.

The full diagnostics route keeps detailed diagnostic surfaces available, but it may reuse existing compactors for large repeated ledgers when a detail/source-backed path already owns the expanded rows.

Budget rules:
- Summary route max payload: 650KB.
- Summary route max duration: 2.5 seconds.
- Backlog section max payload: 500KB.
- Max compact backlog row: 1.6KB.
- Summary route must not include full-diagnostic keys such as extraction control, LLM runtime, Drive inventory, source lifecycle, shared communication synthesis, runtime process control, or Agent Feedback diagnostics.
- Full diagnostics remain available at `/api/foundation-hub?view=full`.

No UI polish. No Harlan/Fal/voice. No Canva, connector auth, external-write jobs, DB schema changes, hub feature work, or Steve local mockup assets.

## Risks
The main risk is turning payload budget work into a fake byte-count win by dropping useful rows. The repair path is to fail proof unless the summary route preserves every backlog card identity and keeps full detail available behind existing full/detail paths.

Another risk is budget flake from natural backlog growth. The repair path is not to raise the budget blindly; first compact the highest byte section while preserving IDs/counts and source-backed detail paths.

## Tests
- `node --check lib/foundation-hub-payload-budget-v2.js lib/foundation-hub-performance.js lib/foundation-hub-safety-verifier.js scripts/foundation-verify.mjs scripts/process-foundation-hub-payload-budget-v2-check.mjs lib/foundation-verify-coverage-card-ids.js lib/foundation-build-closeout-cleanup-records.js`
- `npm run process:foundation-hub-payload-budget-v2-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=FOUNDATION-HUB-PAYLOAD-BUDGET-V2-001 --planApprovalRef=docs/process/approvals/FOUNDATION-HUB-PAYLOAD-BUDGET-V2-001.json --closeoutKey=foundation-hub-payload-budget-v2-v1 --commitRef=HEAD`

## Not Next
Do not start SOURCE-CONTRACT-VALIDATION-LAYER in this sprint. Do not build hub UI, Foundation surface polish, Harlan, Fal, voice, Canva, connector auth, extraction runtime jobs, external-write jobs, DB schema changes, or another critical-root split.
