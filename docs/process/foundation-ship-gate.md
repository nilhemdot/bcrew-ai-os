# Foundation Ship Gate

Plain English: this is the one command builders should run before a Foundation ship is trusted.

It does not replace Steve's 9.8 plan review. It only makes the approved ship gates harder to forget.

## How To Run

```sh
npm run process:foundation-ship -- --card=<CARD_ID> --planApprovalRef=docs/process/approvals/<CARD_ID>.json --closeoutKey=<CLOSEOUT_KEY> --commitRef=HEAD
```

## What It Runs

1. Run the fast Foundation ship preflight.
2. Arm a short Foundation worker scheduled-job pause marker, then restart the supervised dashboard and Foundation worker through `launchctl` when running on the Mac mini. Restart the supervised dashboard first-class runtime surface before served-code proof; the worker pause prevents scheduled jobs from starting during that restart.
3. `npm run process:ship-check`
4. `npm run process:fanout-check`
5. `npm run process:post-ship-fanout`
6. `npm run foundation:verify`

The wrapper intentionally runs `foundation:verify` once at the end. It passes an explicit skip reason into `process:ship-check` so the same live verifier does not run twice in the same wrapper call.

The runtime restart happens before `process:ship-check` because that check proves the served dashboard commit equals repo `HEAD`. Before the worker restart, the wrapper writes `.git/foundation-worker-ship-pause.json` so the worker can record its current commit and process ID without selecting due scheduled jobs during the ship gate. The marker is cleared in a `finally` path and expires automatically if the ship gate is interrupted. Use `--skipRuntimeRestart=true` only for a deliberate one-off investigation.

After all gates pass, the wrapper records a local proof file in `.git/foundation-ship-proof.json`. The repo-managed pre-push hook uses that local proof to confirm protected Foundation changes were shipped through the canonical gate.

## Required Inputs

- `--card`
- `--planApprovalRef`
- `--closeoutKey`

If any required input is missing, the wrapper refuses to run and prints the missing argument. It does not silently skip a gate.

## Boundaries

- The wrapper orchestrates existing gates; it does not invent a new approval process.
- The wrapper does not replace the 9.8 plan score.
- Emergency bypass still needs a reason and follow-up card through the existing ship-check behavior.
- Strict mode remains available with `--strictShipCheckVerify=true` when an operator wants the old duplicate verifier behavior for a one-off investigation.
- Runtime restart is automatic on macOS through `ai.bcrew.dashboard` and `ai.bcrew.foundation-worker`; non-macOS environments skip that step because LaunchAgent labels do not exist there.
- Worker scheduled-job pause is automatic when runtime restart is enabled. Use `--skipWorkerScheduledPause=true` only for an explicitly approved operational run where due scheduled jobs are allowed during ship verification.
- Fanout runs sequentially by default to avoid local Postgres deadlock contention between gate scripts. The opt-in `--parallelFanout=true` profiling mode runs `npm run process:fanout-check` and `npm run process:post-ship-fanout` in parallel.
- Run this command once per card unless the wrapper is explicitly upgraded and verified to support multi-card invocation. A shared closeout key is allowed only when each card's proof ownership stays exact.
- Direct verifier and process gate read paths are read-only under normal review. They assert the Foundation DB is already initialized with metadata checks instead of running schema/seed initialization while dashboard and worker are live.

## Timing

The wrapper prints a timing summary for each gate and the total run. The Phase G target is a normal four-gate ship under five minutes.

If the total is above target, the ship can still be valid when all gates pass, but the slow step is visible and should be profiled before the next gate-performance pass.

Transient gate failures such as a DB deadlock, request timeout, closed local DB pool after cleanup, or quota/429 response get one retry. The retry output names the transient class and subsystem so a future recurrence points at Postgres, Foundation DB pool cleanup, network transport, or an external API quota instead of only saying "transient gate error." Permanent failures still fail the ship.

For Postgres deadlocks, retry diagnostics may include safe metadata such as code, relation OIDs, process IDs, routine, gate label, and retry attempt. Gate logs must not include row data, source content, or private content.
