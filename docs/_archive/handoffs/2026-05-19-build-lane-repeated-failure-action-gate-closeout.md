# Build Lane Repeated Failure Action Gate Closeout

Date: 2026-05-19
Card: `BUILD-LANE-REPEATED-FAILURE-ACTION-GATE-001`
Closeout key: `build-lane-repeated-failure-action-gate-v1`

## What Changed

- Added a P0 action gate for repeated build-lane and Foundation job failures.
- Added dogfood proof that repeated red failures either block the sprint or attach to a live repair card.
- Wired the gate into package scripts, approval integrity, Plan Critic, live Backlog, Current Sprint, closeout lookup, and verifier coverage.
- Refreshed `.git/foundation-build-lane-failure-summary.json` with the action-gate decision during focused proof.
- Refreshed the local build-lane failure summary after successful Foundation ship proof.

## What It Proves

- Repeated red fingerprints are not watch noise.
- Repeated job failures are not watch noise.
- Every repeated action item has count, latest affected card/job, owner, repair card, next action, and sprint-blocking decision.
- Historical repeats can be resolved only by later successful ship proof or later successful job run.
- New repeats after a success still reopen as current risk.
- `PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001` stays gated until this P0 closes or the active blocker becomes a live repair card.

## Current Signal

- Current build-lane telemetry fingerprints are retired by the latest successful Foundation ship proof unless they repeat after that proof.
- The current-day `connector-uptime-monitor` and `foundation-verify` repeated failures stay visible as historical failure evidence when a later success exists.
- If either repeats again without later success, the gate blocks or routes to the mapped repair card.

## Proof Commands

```sh
node --check lib/build-lane-repeated-failure-action-gate.js scripts/process-build-lane-repeated-failure-action-gate-check.mjs lib/build-lane-failure-telemetry.js lib/process-git-hooks.js
npm run process:build-lane-repeated-failure-action-gate-check -- --apply --close-card --json
npm run process:build-lane-failure-telemetry-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=BUILD-LANE-REPEATED-FAILURE-ACTION-GATE-001 --planApprovalRef=docs/process/approvals/BUILD-LANE-REPEATED-FAILURE-ACTION-GATE-001.json --closeoutKey=build-lane-repeated-failure-action-gate-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=BUILD-LANE-REPEATED-FAILURE-ACTION-GATE-001 --closeoutKey=build-lane-repeated-failure-action-gate-v1
npm run process:post-ship-fanout -- --card=BUILD-LANE-REPEATED-FAILURE-ACTION-GATE-001 --closeoutKey=build-lane-repeated-failure-action-gate-v1 --commitRef=HEAD
npm run process:foundation-ship -- --card=BUILD-LANE-REPEATED-FAILURE-ACTION-GATE-001 --planApprovalRef=docs/process/approvals/BUILD-LANE-REPEATED-FAILURE-ACTION-GATE-001.json --closeoutKey=build-lane-repeated-failure-action-gate-v1 --commitRef=HEAD
```

## Next

No parallel builders yet.

Run `PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001` next only after this gate is clean and pushed.

## Known Limits

- This does not auto-repair failed jobs.
- This does not delete or rewrite historical local telemetry.
- This does not launch parallel builders.
- This does not run live extraction, provider probes, credential repair, Drive mutation, sends, or external writes.
- This does not approve auth-required or paid provider work.
