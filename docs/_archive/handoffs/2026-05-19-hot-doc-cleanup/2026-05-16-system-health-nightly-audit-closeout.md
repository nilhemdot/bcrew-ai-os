# System Health Nightly Audit Closeout

Date: 2026-05-16
Card: `SYSTEM-HEALTH-NIGHTLY-AUDIT-001`
Closeout key: `system-health-nightly-audit-v1`

## What Changed

- Added `lib/foundation-system-health.js` as the read-only system health rollup for jobs, scheduled run freshness, nightly audit freshness, connector status, endpoint budgets, source coverage, and current sprint status.
- Added `scripts/process-system-health-nightly-audit-check.mjs` and `package.json` script `process:system-health-nightly-audit-check`.
- Added scheduled Foundation job `system-health-nightly-audit` at 05:15 America/Toronto, after the nightly deep audit window.
- Added the scheduled-job mutation allowlist row so the job is actually runnable, not just configured.
- Added report artifacts at `docs/handoffs/system-health-2026-05-16.md` and `docs/handoffs/system-health-2026-05-16.json`.
- Ran the job through `scripts/run-foundation-job.mjs` so the Foundation job ledger records a successful latest run.

## Proof

- `node --check lib/foundation-system-health.js lib/foundation-job-mutation-allowlist.js scripts/process-system-health-nightly-audit-check.mjs`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:system-health-nightly-audit-check -- --json --write-report`
- `node --env-file-if-exists=.env scripts/run-foundation-job.mjs --job=system-health-nightly-audit --actor=codex`
- `npm run process:ship-check -- --card=SYSTEM-HEALTH-NIGHTLY-AUDIT-001 --planApprovalRef=docs/process/approvals/SYSTEM-HEALTH-NIGHTLY-AUDIT-001.json --closeoutKey=system-health-nightly-audit-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=SYSTEM-HEALTH-NIGHTLY-AUDIT-001 --closeoutKey=system-health-nightly-audit-v1`
- `npm run foundation:verify -- --json-summary` passed `411/411`.

## Dogfood

The proof recreates the hidden-failure class Steve found:

- A scheduled job with no successful run after its due window renders red.
- A failed latest run renders red.
- A fresh scheduled success renders green.
- Manual jobs render neutral gray.
- The system-health snapshot stays report-only and does not auto-fix, mutate backlog, or mutate source systems.

## Known Red Rows

The system-health report intentionally shows red rows for real current failures, including failed scheduled extraction/sync jobs. This is expected. The card's job is visibility and fail-loud behavior, not auto-repair.

## Not Done Here

- No automatic repair of failed jobs.
- No automatic backlog creation from health findings.
- No connector/auth/source extraction repair.
- No hub feature work.
