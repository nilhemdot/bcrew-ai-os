# GATE-RELIABILITY-002 Diagnostics

Closeout: `gate-reliability-recurring-transient-v1`

## What Was Inspected

- The live LaunchAgent definitions for dashboard and worker.
- Dashboard stdout/stderr paths:
  - `/Users/bensoncrew/Library/Logs/bcrew-ai-os/dashboard.log`
  - `/Users/bensoncrew/Library/Logs/bcrew-ai-os/dashboard.err.log`
- Worker stdout/stderr paths:
  - `/Users/bensoncrew/Library/Logs/bcrew-ai-os/foundation-worker.log`
  - `/Users/bensoncrew/Library/Logs/bcrew-ai-os/foundation-worker.err.log`
- Fresh direct `npm run foundation:verify` output at repo head `a101bd7` before this patch.

## Classification

- Fresh direct verifier run before the patch passed without retry.
- The latest dashboard error log tail showed Google Sheets 429 quota fallback messages. That maps to the new `external-quota` retry class if it ever bubbles up to a gate retry.
- The user-reported recurring retry class from the Foundation gate path remains covered by the deterministic `deadlock detected` fixture, now classified as `postgres-deadlock` / `postgres`.
- The old closed-pool retry defect remains covered as `foundation-db-pool-closed` / `foundation-db-pool`.
- The first post-patch ship wrapper run classified a live `process:post-ship-fanout` retry as `postgres-deadlock` / `postgres` while fanout gates were still parallel.

## Result

No current local code path reproduced the old closed-pool failure. The live wrapper retry did identify local fanout-gate concurrency as a Postgres deadlock class, so the wrapper now runs fanout gates sequentially by default and leaves `--parallelFanout=true` as explicit profiling mode. This keeps bounded retry behavior and makes any future retry name the failing subsystem instead of printing only a generic transient retry.
