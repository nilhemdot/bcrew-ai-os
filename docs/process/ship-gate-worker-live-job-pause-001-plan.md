# SHIP-GATE-WORKER-LIVE-JOB-PAUSE-001 Plan

Card: `SHIP-GATE-WORKER-LIVE-JOB-PAUSE-001`

## What

Prevent the Foundation ship gate from accidentally starting due scheduled worker jobs while proving served-code/runtime freshness.

This repairs the failure exposed during `SOURCE-MATURITY-FUB-MONITORING-GAP-REPAIR-001`: `process:foundation-ship` restarted the worker LaunchAgent, the worker selected due `gmail-sync-current`, and extraction runtime readiness went red because a live Gmail crawl row was running. Foundation ships must prove runtime truth without triggering live extraction or connector jobs that Steve did not approve.

## Why

Steve asked for a building machine that learns instead of repeating the same mistakes. This is a concrete build-lane failure: a ship gate meant to verify served code created new live runtime work. The operator value is direct: a builder can ship Foundation cards without accidentally starting Gmail, extraction, connector, or other scheduled worker jobs during the verification window.

This is Foundation process work, not feature work. It keeps the runtime proof trustworthy and prevents one class of repeated red verifier loops before the next long queue continues.

## Details

- Add a short-lived local worker pause marker under `.git/foundation-worker-ship-pause.json`.
- Make `process:foundation-ship` write the marker before restarting the worker LaunchAgent and clear it in a `finally` path.
- Make `scripts/foundation-worker.mjs` record startup metadata, then skip due scheduled job selection while the marker is active.
- Expire the marker automatically if the ship gate is interrupted.
- Fail closed on invalid marker content.
- Keep served-code proof intact: the worker still starts, records commit/PID, and `foundation:verify` can compare worker code to repo `HEAD`.
- Add focused proof, verifier coverage, docs, closeout registry, and live backlog/current-sprint scaffold.

Existing code/docs/scripts/backlog truth reused:

- `scripts/process-foundation-ship.mjs` for the canonical ship gate and runtime restart.
- `scripts/foundation-worker.mjs` for worker startup metadata, stale reapers, and scheduled job selection.
- `scripts/process-ship-check.mjs`, `scripts/process-fanout-check.mjs`, and `scripts/process-post-ship-fanout.mjs` for ship/fanout proof.
- `scripts/foundation-verify.mjs` and `lib/foundation-extraction-runtime-verifier.js` for final verifier coverage.
- `BUILD-LANE-FAILURE-TELEMETRY-001` for the repeated-failure lesson.
- `docs/process/foundation-ship-gate.md` for operator-facing ship-gate doctrine.
- Live backlog/current-sprint scaffolding, Plan Critic, approval integrity, and closeout registry.

## Acceptance Criteria

- `process:foundation-ship` writes a short-lived worker pause marker before restarting `ai.bcrew.foundation-worker`.
- The worker records startup code truth, then skips due scheduled job selection while the marker is active.
- The marker clears in `finally` and expires automatically if interrupted.
- Invalid marker content fails closed.
- Expired markers resume normal worker selection.
- Final `foundation:verify` fails if the process/worker pause wiring is removed.
- The focused proof exercises actual functions/process wiring, not just substring markers.
- The added ship-gate work stays fast enough for default use and does not add a repeated full-verify loop.

## Boundaries

- No live extraction.
- No auth-required or paid run.
- No external write.
- No Google Drive permission mutation.
- No live Agent Feedback auto-send.
- Do not work `MEETING-VAULT-ACL-001` Phase B.
- No Harlan/Fal/voice/Canva/OpenHuman feature work.
- Do not disable the worker permanently.
- Do not hide stale/running job failures.
- Do not bypass served-code proof or final `foundation:verify`.

## Implementation

- Create `lib/ship-gate-worker-live-job-pause.js` for pause marker construction, read/write/clear helpers, active/expired/invalid evaluation, closeout rendering, and dogfood proof.
- Update `scripts/process-foundation-ship.mjs` to arm the pause before LaunchAgent restart unless runtime restart or worker pause is explicitly skipped.
- Update `scripts/foundation-worker.mjs` to evaluate the marker after stale reapers and before `getFoundationJobRunSnapshot()`/due-job selection.
- Update `lib/foundation-extraction-runtime-verifier.js` so full `foundation:verify` requires ship-gate pause wiring and worker pause behavior.
- Add `scripts/process-ship-gate-worker-live-job-pause-check.mjs` as the focused proof and scaffold path.
- Register the package script, done-card coverage ID, closeout registry, closeout handoff, and current plan/state notes.

## Risks

- Risk: the repair weakens served-code proof by skipping the worker restart. Mitigation: the worker still restarts and records commit/PID; only scheduled job selection is paused.
- Risk: the worker stays paused after a failed ship. Mitigation: `finally` cleanup plus marker expiry.
- Risk: an invalid marker silently allows jobs. Mitigation: invalid marker fails closed.
- Risk: this becomes permanent scheduler disablement. Mitigation: no job definitions are disabled or deleted; the pause is local and short-lived.
- Risk: ship gate slows down. Mitigation: pause marker write/clear is a local file operation and the final gate remains the same single full verifier run.

## Tests

The focused proof must show:

- real behavior through the actual function path, not substring-only proof;
- a black-box process-style round trip where active ship-gate pause blocks worker scheduled job selection;
- expired pause resumes normal worker selection;
- invalid pause marker fails closed;
- `process:foundation-ship` writes and clears the pause marker;
- `foundation-worker` reads the marker before selecting due jobs;
- final verifier coverage requires the wiring;
- live backlog and Current Sprint scaffold are complete before `building_now`.

Substring-only proof is rejected: the focused script may inspect wiring as supporting evidence, but the acceptance proof must call `buildFoundationWorkerShipPause()` and `evaluateFoundationWorkerShipPause()` and show pass/revise outcomes through dogfood cases.

Gate decision tree:

- static check: `node --check` for touched modules/scripts;
- focused proof: `process:ship-gate-worker-live-job-pause-check`;
- hygiene: `backlog:hygiene`;
- full gate: one final `process:foundation-ship`, which runs `foundation:verify` once after fanout.

## Definition Of Done

Done means `SHIP-GATE-WORKER-LIVE-JOB-PAUSE-001` is a live done card under `ship-gate-worker-live-job-pause-v1`, Current Sprint is closed with complete scaffold metadata, focused proof passes, backlog hygiene passes, full `foundation:verify` passes, full `process:foundation-ship` passes, closeout is registered, and the commit is pushed.

Acceptance criteria score is pass only when the actual pause behavior works, the card remains P0/live-backed, and the focused script returns healthy. If the behavior regresses, the plan/review state is revise and the card must not close.

Useful operator behavior: Steve can send a builder into a real workflow of Foundation card shipping at speed and quality without the ship gate accidentally kicking off Gmail, extraction, connector, or other scheduled worker jobs during proof.

## Proof Commands

```sh
node --check lib/ship-gate-worker-live-job-pause.js scripts/process-foundation-ship.mjs scripts/foundation-worker.mjs scripts/process-ship-gate-worker-live-job-pause-check.mjs
npm run process:ship-gate-worker-live-job-pause-check -- --apply --stage=building_now --json
npm run process:ship-gate-worker-live-job-pause-check -- --close-card --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=SHIP-GATE-WORKER-LIVE-JOB-PAUSE-001 --planApprovalRef=docs/process/approvals/SHIP-GATE-WORKER-LIVE-JOB-PAUSE-001.json --closeoutKey=ship-gate-worker-live-job-pause-v1 --commitRef=HEAD
```
