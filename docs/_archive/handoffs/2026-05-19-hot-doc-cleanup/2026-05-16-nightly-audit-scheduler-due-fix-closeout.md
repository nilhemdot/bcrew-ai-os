# Nightly Audit Scheduler Due Fix Closeout

Date: 2026-05-16
Card: `NIGHTLY-AUDIT-SCHEDULER-DUE-FIX-001`
Closeout key: `nightly-audit-scheduler-due-fix-v1`
Sprint: `foundation-audit-reliability-2026-05-16`

## What Changed

Fixed the first-run scheduled job bug for local-time Foundation jobs. A scheduled job with no prior successful run now becomes due when the worker checks after today's configured local schedule time instead of rolling forward to tomorrow.

## Why It Matters

Steve found the missing nightly audit report manually. The system did not surface the miss. This card fixes the scheduler path that allowed the nightly audit to look scheduled while never becoming due after the `03:00 America/Toronto` window.

The fix is not the full detection layer. It is the first required repair: the job must be able to run before freshness, staleness, and whole-system health checks can be trusted.

## Where It Lives

- `lib/foundation-jobs.js` first-run local schedule due logic and scheduler dogfood proof.
- `scripts/process-nightly-audit-scheduler-due-fix-check.mjs` focused read-only proof.
- `lib/foundation-intelligence-audit-verifier.js` nightly audit verifier dogfood coverage.
- `package.json` `process:nightly-audit-scheduler-due-fix-check`.
- `docs/process/nightly-audit-scheduler-due-fix-001-plan.md`.
- `docs/process/approvals/NIGHTLY-AUDIT-SCHEDULER-DUE-FIX-001.json`.

## Dogfood Proof

The proof recreates the exact scheduler failure shape:

- no latest run exists,
- worker checks at `03:01 America/Toronto`,
- old behavior would schedule the next run for tomorrow,
- new behavior is due now at today's scheduled run time.

It also verifies that before the schedule window the job is not due, that a successful latest run schedules the next day, and that running/queued latest runs do not launch duplicate jobs.

## Proof Commands

```bash
node --check lib/foundation-jobs.js scripts/process-nightly-audit-scheduler-due-fix-check.mjs scripts/foundation-verify.mjs
npm run process:nightly-audit-scheduler-due-fix-check -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=NIGHTLY-AUDIT-SCHEDULER-DUE-FIX-001 --planApprovalRef=docs/process/approvals/NIGHTLY-AUDIT-SCHEDULER-DUE-FIX-001.json --closeoutKey=nightly-audit-scheduler-due-fix-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=NIGHTLY-AUDIT-SCHEDULER-DUE-FIX-001 --closeoutKey=nightly-audit-scheduler-due-fix-v1
npm run process:foundation-ship -- --card=NIGHTLY-AUDIT-SCHEDULER-DUE-FIX-001 --planApprovalRef=docs/process/approvals/NIGHTLY-AUDIT-SCHEDULER-DUE-FIX-001.json --closeoutKey=nightly-audit-scheduler-due-fix-v1 --commitRef=HEAD
```

## Known Limits

- This does not prove the nightly audit actually ran after the fix. That is `NIGHTLY-DEEP-AUDIT-BACKFILL-001`.
- This does not fail the verifier when the audit is stale. That is `NIGHTLY-AUDIT-RUN-PROOF-001`.
- This does not make scheduled job staleness visible on the dashboard.
- This does not audit all systems, jobs, sources, endpoints, and verifier checks.
- This does not run source extraction, connector auth, paid-source auth, Build Intel extraction, hub feature work, Canva asset mutation, Drive permissions mutation, or Marketing Video Lab wiring.

## Review Next

Run and backfill a fresh nightly audit, then add a fail-closed freshness proof and a visible scheduled-job staleness surface. The larger principle is: Foundation health cannot trust "scheduled" as truth; it must trust latest successful run age and make stale jobs red without Steve having to ask.
