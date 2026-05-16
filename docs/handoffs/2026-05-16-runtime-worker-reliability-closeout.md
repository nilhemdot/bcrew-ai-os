# RUNTIME-WORKER-001 Closeout

Date: 2026-05-16
Closeout key: `runtime-worker-reliability-v1`
Card: `RUNTIME-WORKER-001`

## What Shipped

`RUNTIME-WORKER-001` closed the next Foundation runtime reliability gap:

- `scripts/foundation-worker.mjs` now accepts both `--dryRun` and `--dry-run`.
- One-shot dry-run worker proof no longer overwrites the long-running `foundation-worker` runtime status row with the proof process pid.
- Foundation job snapshots now include `workerReliability`.
- Runtime Health shows worker reliability: scheduled/due jobs, failed latest runs, retry candidates, blocked scheduled jobs, and stale active runs.
- Default `/api/foundation-hub` keeps a compact worker reliability summary without re-expanding the payload.
- Runtime reliability verifier covers `RUNTIME-WORKER-001`.

## Senior-Engineer Note

The card found a real bug during proof: `npm run foundation:worker -- --once --dry-run --maxJobs=1` was initially accepted as dry-run after parser work, but it still wrote runtime service status for the one-shot dry-run process. That poisoned LaunchAgent pid truth and made `foundation:verify` fail with a worker pid mismatch.

Fix: one-shot dry-run worker passes now skip runtime status capture. The long-running LaunchAgent worker remains the source of service status truth.

## Proof

- `npm run process:runtime-worker-check -- --json` passed 23/23.
- `npm run foundation:worker -- --once --dry-run --maxJobs=1` printed `dryRun=true`, ran no jobs, and did not update runtime service status.
- `npm run foundation:verify -- --json-summary` passed 399/399 before closeout.

Measured route budgets during focused proof:

- `/api/foundation/jobs`: 48-88ms, ~172KB.
- default `/api/foundation-hub`: 63-72ms, ~573KB.

## Not Shipped

- No new scheduler framework.
- No new scheduled jobs.
- No auto-restart-on-push install.
- No source extraction or Build Intel extraction.
- No hub feature work.
- No Marketing Video Lab wiring.
- No Canva asset-library behavior.
- No paid-source auth.
- No Meeting Vault Phase B.
- No Drive permission mutation.

## Next

Continue the no-auth Foundation cleanup queue. Good candidates:

- next verifier proof-domain split,
- next Foundation DB store split,
- or the next runtime reliability card if the live worker reports stale/failed scheduled lanes in Runtime Health.
