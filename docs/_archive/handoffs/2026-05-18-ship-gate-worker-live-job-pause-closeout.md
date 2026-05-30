# Ship Gate Worker Live Job Pause Closeout

Card: `SHIP-GATE-WORKER-LIVE-JOB-PAUSE-001`
Closeout key: `ship-gate-worker-live-job-pause-v1`

## What Changed

- `process:foundation-ship` now arms a short `.git/foundation-worker-ship-pause.json` marker before restarting the Foundation worker LaunchAgent.
- `scripts/foundation-worker.mjs` still records startup commit/PID for served-code proof, but skips due scheduled job selection while the pause marker is active.
- The ship gate clears the marker in a `finally` path, and the marker expires automatically if the ship gate is interrupted.
- Full `foundation:verify` now requires the ship-gate pause wiring through the extraction runtime verifier.

## Why It Matters

During the FUB monitoring-gap ship, the ship gate restarted the worker and the worker selected a due Gmail sync job. That created a live running extraction-control row and turned extraction runtime readiness red. This card prevents ship verification from becoming an accidental live extraction trigger.

## Where It Lives

- `lib/ship-gate-worker-live-job-pause.js`
- `scripts/process-foundation-ship.mjs`
- `scripts/foundation-worker.mjs`
- `lib/foundation-extraction-runtime-verifier.js`
- `scripts/process-ship-gate-worker-live-job-pause-check.mjs`
- `docs/process/foundation-ship-gate.md`
- `docs/process/ship-gate-worker-live-job-pause-001-plan.md`
- `docs/process/approvals/SHIP-GATE-WORKER-LIVE-JOB-PAUSE-001.json`

## Proof

- `node --check lib/ship-gate-worker-live-job-pause.js scripts/process-foundation-ship.mjs scripts/foundation-worker.mjs scripts/process-ship-gate-worker-live-job-pause-check.mjs`
- `npm run process:ship-gate-worker-live-job-pause-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=SHIP-GATE-WORKER-LIVE-JOB-PAUSE-001 --planApprovalRef=docs/process/approvals/SHIP-GATE-WORKER-LIVE-JOB-PAUSE-001.json --closeoutKey=ship-gate-worker-live-job-pause-v1 --commitRef=HEAD`

## Known Limits

- This does not disable the Foundation worker permanently.
- This does not authorize any live extraction, auth-required run, paid run, external write, Drive permission mutation, or Agent Feedback auto-send.
- This does not run or repair connector/OAuth jobs.
- This does not build Harlan/Fal/voice/Canva/OpenHuman feature work.

## Review Next

Continue safe Foundation source/connector work from live truth. If a due scheduled job must run during ship verification, it needs explicit operator approval outside this card.
