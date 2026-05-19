# Runtime Supervisor Closeout - 2026-05-16

Card: `RUNTIME-SUPERVISOR-001`
Closeout key: `runtime-supervisor-v1`
Sprint: `foundation-identity-visibility-2026-05-16`

## What Changed

- Added dashboard and Foundation worker service-supervision snapshots to runtime process control.
- Wired live LaunchAgent status into the server-side runtime snapshot for:
  - `ai.bcrew.dashboard`
  - `ai.bcrew.foundation-worker`
- Rendered supervised services in Foundation Runtime Health with LaunchAgent label/pid, recorded pid, code trust, metadata age, restart command, and log paths.
- Added focused Runtime Supervisor proof plus runtime reliability verifier coverage.

## Why It Matters

Foundation can now see whether the Mac Mini services that make the dashboard and worker alive are actually running current repo code under the expected LaunchAgents. The proof fails closed for missing LaunchAgent, pid mismatch, stale running commit, and stale runtime metadata instead of trusting a stale green check.

## Proof

- `node --check lib/runtime-process-control.js server.js public/foundation-runtime-renderers.js lib/foundation-runtime-reliability-verifier.js scripts/foundation-verify.mjs scripts/process-runtime-supervisor-check.mjs lib/foundation-build-closeout-overnight-records.js`
- `npm run process:runtime-supervisor-check -- --json`
- `npm run foundation:verify -- --json-summary`

Focused proof while active:

- `process:runtime-supervisor-check`: 17/17 passed
- `/api/foundation-hub`: 97ms / 566,981 bytes
- `/api/foundation/active-processes`: 376ms / 21,894 bytes
- Supervisor status: `healthy`
- Service count: `2`
- `foundation:verify`: 398/398 passed

## Dogfood

The proof recreates/simulates these failure modes and proves the validator rejects them:

- missing LaunchAgent
- LaunchAgent pid mismatch
- stale running commit
- stale heartbeat/runtime metadata

## Not Included

- No auto-restart-on-push installation.
- No new scheduler framework.
- No job execution, retry, cadence, or Foundation job definition changes.
- No route auth, DB schema, source contract, hub feature, Marketing Video Lab, Canva asset-library, paid-source auth, Build Intel extraction, Meeting Vault Phase B, or Drive permission mutation.

## Next

Open `RUNTIME-WORKER-001` as the next active blocker if continuing runtime reliability. Keep restart-on-push as manual until a separate push-hook/WatchPaths proof exists.
