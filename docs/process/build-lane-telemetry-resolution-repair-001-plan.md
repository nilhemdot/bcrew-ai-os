# BUILD-LANE-TELEMETRY-RESOLUTION-REPAIR-001 Plan

Card: `BUILD-LANE-TELEMETRY-RESOLUTION-REPAIR-001`
Closeout key: `build-lane-telemetry-resolution-repair-v1`

## What

Repair build-lane failure telemetry so stale red fingerprints resolve from later successful Foundation ship proof without deleting the local telemetry log.

This is a narrow build-lane reliability card. It does not rewrite historical `.git` telemetry events, weaken verifier/ship/fanout gates, or hide new failures. It changes how the snapshot classifies old failure groups after a later clean `process:foundation-ship` proof.

## Why

After the verifier snapshot repair and the code-quality audit repair shipped cleanly, System Health still showed old build-lane red fingerprints from earlier served-code fanout failures, verifier parser false positives, and stale verifier wiring. Those events are useful history, but they are no longer current red work when a later ship gate has passed.

For Steve, the build lane needs to learn from failures without trapping the operator in stale alarms. A current failure after the latest ship proof should still go red. A stale failure before a later successful ship proof should be marked resolved and removed from red/yellow System Health counts.

## Acceptance Criteria

- Live backlog card exists with rich context for `BUILD-LANE-TELEMETRY-RESOLUTION-REPAIR-001`.
- Plan and approval exist.
- Telemetry snapshots keep historical failure events immutable.
- Failure groups whose latest event is before a later successful Foundation ship proof classify as `resolved`.
- Resolved groups are not counted in red/yellow System Health rollups.
- New repeated failures after the latest ship proof still become red.
- Original `process:build-lane-failure-telemetry-check` is historical-aware after its own card is done.
- Focused dogfood proves stale failures resolve and new repeats fail closed.
- Focused proof projects that a successful ship of this card clears current local red build-lane telemetry fingerprints.
- `process:fanout-check` proves `FOUNDATION-DB-SCHEMA-SEED-SPLIT-001` fanout is now genuinely green.
- Full ship gate passes before push.

## Definition Of Done

- `lib/build-lane-failure-telemetry.js` adds resolution-aware snapshots from local ship proof.
- `lib/foundation-system-health.js` reads telemetry through the resolution-aware path.
- `scripts/process-build-lane-failure-telemetry-check.mjs` validates the original telemetry card from active or historical sprint proof.
- `scripts/process-build-lane-telemetry-resolution-repair-check.mjs` validates approval, Plan Critic, live card/current sprint truth, dogfood, package script, closeout registry, verifier coverage, and no hidden worker tooling.
- `docs/handoffs/2026-05-18-build-lane-telemetry-resolution-repair-closeout.md` records the closeout.
- Focused proof, backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass before push.

## Details

Existing code/docs/scripts/backlog truth to reuse:

- Existing code: `lib/build-lane-failure-telemetry.js` owns event extraction, grouping, thresholds, local JSONL log, summary, and dogfood.
- Existing code: `.git/foundation-ship-proof.json` is the existing local proof record written only after `process:foundation-ship` passes.
- Existing code: `lib/foundation-system-health.js` already surfaces build-lane telemetry counts.
- Existing scripts: `scripts/process-build-lane-failure-telemetry-check.mjs` already proves the telemetry layer and should use the existing historical sprint helper after rollover.
- Existing docs: the done-card closeouts for `BUILD-LANE-SERVED-CODE-FANOUT-SYNC-REPAIR-001`, `BUILD-LANE-VERIFIER-RESULT-PARSER-REPAIR-001`, and `BUILD-LANE-VERIFIER-SNAPSHOT-WIRING-REPAIR-001` are the context for the stale fingerprints.
- Live backlog and Current Sprint truth are reused through the build-lane scaffold and overlay path.

Implementation details:

- Do not remove old events from `.git/foundation-build-lane-failure-telemetry.jsonl`.
- Read local ship proofs from `.git/foundation-ship-proof.json`.
- If every event in a fingerprint group occurred before the latest successful ship proof, classify the group as `resolved`.
- Exclude resolved groups from red/yellow/healthy active counts; expose resolved counts separately.
- Keep a synthetic repeated failure after the proof red, so the repair cannot become a blanket suppressor.
- Update System Health to call the resolution-aware read path.
- Update the original telemetry proof to accept a verified historical closeout instead of requiring its closed sprint to remain active.
- Behavior proof uses the actual function path `buildBuildLaneFailureTelemetrySnapshot()` with synthetic stale events, a synthetic later ship proof, and synthetic post-proof repeats.
- Substring-only proof is rejected. Source marker checks are allowed only as secondary wiring checks after the function-path dogfood passes.
- The focused proof is designed to stay fast, under 2 minutes on the normal path; full verifier and ship gate run once at closeout.

Gate decision tree:

- Static gate: `node --check` for changed JS.
- Focused gate: `npm run process:build-lane-telemetry-resolution-repair-check -- --close-card --json`.
- Regression gate: `npm run process:build-lane-failure-telemetry-check -- --json`.
- Fanout regression: `npm run process:fanout-check -- --card=FOUNDATION-DB-SCHEMA-SEED-SPLIT-001 --closeoutKey=foundation-db-schema-seed-split-v1`.
- Full gate: `foundation:verify` and `process:foundation-ship` because this changes System Health/build-lane proof behavior.

## Risks

- Risk: telemetry resolution hides active failures. Mitigation: only events before a later successful ship proof resolve; dogfood proves post-proof repeats remain red.
- Risk: local history is lost. Mitigation: the log is immutable; only snapshot classification changes.
- Risk: System Health goes falsely green. Mitigation: scheduled jobs, connectors, file-size, and new build-lane failures still contribute red/yellow counts.
- Risk: proof becomes substring-only. Mitigation: dogfood calls the real snapshot function with synthetic events and ship proof.

## Tests

```bash
node --check lib/build-lane-failure-telemetry.js lib/foundation-system-health.js scripts/process-build-lane-failure-telemetry-check.mjs scripts/process-build-lane-telemetry-resolution-repair-check.mjs
npm run process:build-lane-telemetry-resolution-repair-check -- --close-card --json
npm run process:build-lane-failure-telemetry-check -- --json
npm run process:fanout-check -- --card=FOUNDATION-DB-SCHEMA-SEED-SPLIT-001 --closeoutKey=foundation-db-schema-seed-split-v1
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=BUILD-LANE-TELEMETRY-RESOLUTION-REPAIR-001 --planApprovalRef=docs/process/approvals/BUILD-LANE-TELEMETRY-RESOLUTION-REPAIR-001.json --closeoutKey=build-lane-telemetry-resolution-repair-v1 --commitRef=HEAD
```

## Not Next

- Do not delete or rewrite historical local telemetry events.
- Do not weaken, skip, bypass, or demote real verifier, ship, fanout, or backlog hygiene failures.
- Do not launch parallel builders.
- Do not use hidden subagents.
- Do not run live extraction, auth-required jobs, paid jobs, provider/model probes, external writes, Drive permission mutation, or Agent Feedback auto-send.
- Do not build Harlan/Fal/voice/Canva/OpenHuman features.
- Do not redesign Foundation UI.
