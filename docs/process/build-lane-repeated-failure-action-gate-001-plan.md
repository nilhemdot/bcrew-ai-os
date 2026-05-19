# BUILD-LANE-REPEATED-FAILURE-ACTION-GATE-001 Plan

Card: `BUILD-LANE-REPEATED-FAILURE-ACTION-GATE-001`
Closeout key: `build-lane-repeated-failure-action-gate-v1`

## What

Build the P0 action gate that sits between `FOUNDATION-MAIN-INTEGRATION-LOCK-001` and `PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001`.

The gate upgrades repeated build-lane failures from passive telemetry into sprint truth. Every repeated red fingerprint or repeated Foundation job failure must have count, latest affected card/job, owner, repair card, next action, and blocking decision before the sprint proceeds.

## Why

The current system already records repeated failures, but it still lets builders keep hand-fixing the same patterns. Steve called out the real issue: dozens of failures from `connector-uptime-monitor` and `foundation-verify` are not acceptable background noise.

Operator value: the build machine stops wasting hours on the same failure shape. If the failure is resolved by later proof, the gate says that. If it is still red, the sprint either blocks or routes to a live P0 repair card.

This unlocks a real workflow Steve can trust: fast all-day building with quality because repeated failures create a visible owner/repair/blocking decision instead of another manual terminal loop.

## Acceptance Criteria

- Focused proof runs from `main`.
- Live Backlog has `BUILD-LANE-REPEATED-FAILURE-ACTION-GATE-001` as P0.
- Current Sprint includes this card before `PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001`.
- Red repeated build-lane fingerprints cannot be treated as watch-only.
- Red repeated Foundation job failures cannot be treated as watch-only.
- Each action item includes count, latest affected card/job, owner, repair card, next action, and sprint-blocking decision.
- Resolved historical repeats stay visible when later successful proof exists.
- Unresolved red repeats block the sprint or attach to an active repair card.
- `.git/foundation-build-lane-failure-summary.json` is refreshed with the action-gate decision during the focused proof.
- Successful ship proof refreshes stale local failure-summary status.
- No parallel builders start until this card is closed or a higher-priority repair card becomes the active blocker.

## Definition Of Done

- Existing telemetry and job-run ledgers are reused.
- `lib/build-lane-repeated-failure-action-gate.js` owns the pure action decision engine and dogfood proof.
- `scripts/process-build-lane-repeated-failure-action-gate-check.mjs` is read-only by default and needs `--apply` or `--close-card` for live Backlog/Current Sprint writes.
- `lib/process-git-hooks.js` refreshes the local build-lane failure summary after a successful ship proof.
- The focused proof creates/updates the live backlog card, Plan Critic row, Current Sprint item, and local failure summary.
- Closeout registry includes `build-lane-repeated-failure-action-gate-v1`.
- Focused proof, telemetry check, backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass.
- Commit is pushed to `main`.

## Details

The gate reads:

- local build-lane telemetry events
- local Foundation ship proofs
- the last 24 hours of `foundation_job_runs`
- live backlog repair-card state
- Current Sprint state

Existing work reused:

- existing code: `lib/build-lane-failure-telemetry.js`, `lib/process-git-hooks.js`, `lib/foundation-current-sprint.js`, and `lib/foundation-db.js`
- existing docs: build-lane telemetry and telemetry-resolution repair plans, plus the May 19 green/main/audit/source sprint handoff
- existing scripts: `scripts/process-build-lane-failure-telemetry-check.mjs`, `scripts/process-foundation-ship.mjs`, `scripts/process-ship-check.mjs`, and `scripts/foundation-verify.mjs`
- live backlog and Current Sprint truth: `backlog_items`, `plan_critic_runs`, and the active Current Sprint overlay

Behavior proof, not substring-only proof:

- The focused proof calls the actual function path `buildBuildLaneRepeatedFailureActionGateStatus`.
- The dogfood proof creates real synthetic telemetry/job-run objects and proves red, attached, resolved, and blocked outcomes.
- The script reads live DB rows and local telemetry artifacts instead of accepting a marker.
- Substring-only proof is rejected; source markers can support coverage, but they are not accepted as the behavior proof.

Gate decision tree:

- static gate: `node --check` for the module, proof script, telemetry module, and git hook module
- focused gate: `process:build-lane-repeated-failure-action-gate-check` because the change has a bounded process surface and must run fast by default
- full gate: `foundation:verify` because the card touches live Backlog, Current Sprint, package scripts, closeout registry, and verifier coverage
- ship gate: `process:foundation-ship` because protected Foundation paths changed

Speed bound:

- The focused gate is designed to run in under 2 minutes by reading local telemetry, one 24-hour job-run query, and existing live sprint/backlog rows.
- Heavy verification stays in the full gate and ship gate after the fast focused proof passes.

The decision rules:

- resolved by later successful ship proof: record as resolved and non-blocking
- resolved by later successful job run: record as resolved and non-blocking
- repeated red telemetry with active repair card: close this gate and route sprint to the repair card
- repeated red telemetry without active repair card: block this gate
- repeated red job failure without later success: block this gate or route to the mapped repair card
- yellow/watch rows need thresholds and next action, but cannot masquerade as green if red is unresolved

Current dogfood:

- served-code fanout repeat routes to `BUILD-LANE-SERVED-CODE-FANOUT-SYNC-REPAIR-001`
- missing repair card blocks the sprint
- 30 connector uptime failures followed by a later success become resolved historical evidence
- repeated `foundation-verify` failures without a later success block

## Not Next

- Do not start parallel builders from this card.
- Do not work `PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001` until this P0 gate closes or routes a higher-priority repair.
- Do not work `MEETING-VAULT-ACL-001` Phase B.
- Do not mutate Drive permissions.
- Do not run live extraction.
- Do not run auth-required or paid jobs.
- Do not run provider/model probes.
- Do not send emails or Agent Feedback messages.
- Do not weaken, skip, bypass, or demote verifier, ship, fanout, or backlog hygiene failures.

## Risks

Risk: the gate becomes documentation polish. Repair path: the focused proof must update live Backlog/Current Sprint under explicit write flags and fail if unresolved red repeats have no repair route.

Risk: old failures stay red after successful proof. Repair path: ship-proof and later-success resolution remain explicit, and new repeats after the proof become red again.

Risk: the system hides real failures under a resolved label. Repair path: only a later successful ship proof or later successful job run can resolve the specific historical repeat window.

## Tests

Run:

```sh
node --check lib/build-lane-repeated-failure-action-gate.js scripts/process-build-lane-repeated-failure-action-gate-check.mjs lib/build-lane-failure-telemetry.js lib/process-git-hooks.js
npm run process:build-lane-repeated-failure-action-gate-check -- --apply --close-card --json
npm run process:build-lane-failure-telemetry-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=BUILD-LANE-REPEATED-FAILURE-ACTION-GATE-001 --planApprovalRef=docs/process/approvals/BUILD-LANE-REPEATED-FAILURE-ACTION-GATE-001.json --closeoutKey=build-lane-repeated-failure-action-gate-v1 --commitRef=HEAD
```
