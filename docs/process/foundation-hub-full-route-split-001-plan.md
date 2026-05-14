# FOUNDATION-HUB-FULL-ROUTE-SPLIT-001 Plan

## What

Split the slow Agent Feedback / source-outage part of the full Foundation Hub route out of `server.js` into a named module.

V1 does not attempt to split the entire route. It extracts the riskiest slow-path responsibility so performance logic, timeout behavior, source-health fallback, and dogfood proof live outside the server route file.

## Why

`server.js` is over 7,000 lines. Adding more full-diagnostic performance logic directly to the route would repeat the monolith pattern Steve called out. The right shape is a thin route delegating named behavior to a focused module.

Steve and the team need speed with quality when Runtime Health is part of a real workflow review. The useful operator value this unlocks is that slow full diagnostics has a named module, explicit route budget, and proof command to inspect instead of another long inline route block hidden in `server.js`.

## Acceptance Criteria

- `server.js` delegates Agent Feedback full-diagnostic building to `lib/foundation-hub-full-diagnostics.js`.
- The module owns the bounded deadline behavior and source outage boundary builder.
- The old sequential full-route Agent Feedback block is removed from the full route.
- The Ops Hub reuses the same bounded diagnostic builder so Ops does not become the next hidden slow route.
- Focused proof checks the actual server source and module source, not only markers.
- Route performance budget is explicit: full diagnostics under 15 seconds and under 5.5 MB, measured by `npm run process:foundation-full-diagnostics-perf-check -- --json`.

## Definition Of Done

- `lib/foundation-hub-full-diagnostics.js` exports the full-diagnostic builder, source-outage boundary builder, measurement evaluator, and dogfood proof.
- `server.js` changes are thin imports and delegation only.
- `package.json` exposes `process:foundation-full-diagnostics-perf-check`.
- Current Sprint has complete doctrine and durable Plan Critic pass rows before build.
- Full Foundation ship gate passes before push.

## Details

Existing code to reuse: current Foundation Hub route, Ops Hub Agent Feedback block, source outage boundary shape, Agent Feedback readiness builders, ClickUp fail-soft source health, Plan Critic architectural rules, and Current Sprint doctrine gates.

Existing docs to reuse: the Foundation Verification + Cleanup closeout, the Foundation Hub performance baseline, the monolith explanation and 5K-line file rule in AGENTS.md, and the current plan/current state cleanup notes.

Existing scripts to reuse: `process:foundation-full-diagnostics-perf-check`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`.

Gate decision tree: static checks are insufficient because this changes a hot API route. Focused proof is required through `npm run process:foundation-full-diagnostics-perf-check -- --json` because it measures `/api/foundation-hub?view=full`, dogfoods the timeout path, and checks the route split. Full proof is required through `foundation:verify` and `process:foundation-ship` because server route behavior and package scripts changed. Blast radius is Foundation Runtime Health and Ops Hub source-health visibility.

Split plan: this card intentionally touches `server.js` only to remove inline route responsibility and call the new module. It must not add a new long helper to `server.js`.

## Risks

- Risk: this is a partial split and the full route remains large.
  - Repair path: call that out in closeout and queue the next `server.js` route extraction instead of claiming the server monolith is solved.
- Risk: source outage behavior diverges between Foundation and Ops.
  - Repair path: both routes call the same module builder.
- Risk: proof becomes substring theater.
  - Repair path: proof runs the synthetic timeout dogfood path and checks server source no longer has the exact sequential full-route block.

## Tests

```bash
npm run process:foundation-full-diagnostics-perf-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=FOUNDATION-HUB-FULL-ROUTE-SPLIT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-HUB-FULL-ROUTE-SPLIT-001.json --closeoutKey=foundation-full-diagnostics-perf-v1 --commitRef=HEAD
```

Dogfood proof recreates the route-risk class by making optional Agent Feedback builders slow and proving the extracted module returns degraded source health quickly. The proof also checks the route delegates to the module rather than rebuilding the same inline block.

## Not Next

- Do not split every `server.js` route in this card.
- Do not move auth/session route logic.
- Do not build hub features or Sales/Ops UI changes.
- Do not change the source of truth for Agent Feedback.
- Do not build Build Intel extraction, paid-source auth, autonomous dev, or Drive permission mutation.
