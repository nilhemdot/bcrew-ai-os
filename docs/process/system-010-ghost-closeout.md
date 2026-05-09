# SYSTEM-010-GHOST-CLOSEOUT-001 Runtime Process-Control Closeout

Status: shipped slice for `system-010-ghost-closeout-v1`.

This closeout covers the runtime/process-control leg of the Foundation readiness exit test. It does not complete unrelated Foundation blockers.

## What Is Now Covered

- Active process view across Foundation job runs, source-crawl runs/items, LLM calls, dashboard code trust, and worker code trust.
- Dead-man/liveness rollup for active Foundation runs and stale source-crawl runs.
- Owned PID stop decisions for Foundation job child processes.
- Confirmation-gated job decommission route and durable `decommissioned` runtime mode.
- Pause/decommission safety: generic pause/resume control cannot silently decommission a job.
- Auto-restart-on-push status is explicit and honest; current status is manual unless a push hook or LaunchAgent WatchPaths proof exists.
- Cost/process risk is visible from active job budgets, source-crawl leases, and planned/started LLM calls.
- `process:system-010-ghost-closeout-check` verifies the slice with a harmless owned process fixture.

## Fail-Closed Rules

- Missing child PID means stop is blocked.
- Unowned PID means stop is blocked.
- Stale served-code trust blocks stop.
- Decommission is blocked unless the operator types `DECOMMISSION <jobKey>`.
- Decommission is blocked while the job has an active run.
- Decommissioned jobs cannot run through the normal runner, even with `--force=true`.

## Routes

- `GET /api/foundation/active-processes`
- `POST /api/foundation/job-runs/:runId/stop`
- `POST /api/foundation/jobs/:jobKey/decommission`

## Proof

- `npm run process:system-010-ghost-closeout-check`
- `npm run process:foundation-done-test -- --report-only`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=SYSTEM-010-GHOST-CLOSEOUT-001 --planApprovalRef=docs/process/approvals/SYSTEM-010-GHOST-CLOSEOUT-001.json --closeoutKey=system-010-ghost-closeout-v1 --commitRef=HEAD`

## Still Not Foundation Ready

Foundation can still report `not_ready` because these blocker cards remain open:

- `SOURCE-LIFECYCLE-COMPLETION-001`
- `SYNTHESIS-VERIFY-001`
- `EXTRACT-RUN-HARDENING-001`
- `MEETING-VAULT-ACL-001`
- `DRIVE-ACCESS-REQUEST-001`
