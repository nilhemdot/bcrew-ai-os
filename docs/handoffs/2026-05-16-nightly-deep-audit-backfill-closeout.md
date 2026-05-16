# Nightly Deep Audit Backfill Closeout

Date: 2026-05-16
Card: `NIGHTLY-DEEP-AUDIT-BACKFILL-001`
Closeout key: `nightly-deep-audit-backfill-v1`
Sprint: `foundation-audit-reliability-2026-05-16`

## What Changed

Ran the `nightly-deep-audit` Foundation job through the governed job runner after the scheduler due fix and produced fresh dated audit artifacts for 2026-05-16.

## Why It Matters

Steve found that the nightly auditor had not produced the expected reports. A scheduled job definition is not proof. This card proves the actual job path can run, records a successful job-ledger run, and writes current report artifacts without auto-fixing, mutating backlog, or spending on live LLM review.

## Where It Lives

- `docs/handoffs/nightly-deep-audit-2026-05-16.md`.
- `docs/handoffs/nightly-deep-audit-2026-05-16.json`.
- `scripts/process-nightly-deep-audit-upgrade-check.mjs` recurring-run sprint-state decoupling.
- Foundation job ledger run `job-nightly-deep-audit-20260516185220-pjgs1s`.
- `docs/process/nightly-deep-audit-backfill-001-plan.md`.
- `docs/process/approvals/NIGHTLY-DEEP-AUDIT-BACKFILL-001.json`.

## Dogfood Proof

The dogfood proof is the actual backfill run:

- the job ran through `npm run foundation:job -- --job=nightly-deep-audit --actor=codex-nightly-audit-backfill`,
- the latest job-ledger run for `nightly-deep-audit` is `succeeded`,
- the report and JSON artifacts exist for 2026-05-16,
- backlog lane counts were unchanged before/after the audit command,
- the run stayed report-only with no auto-fixes, no auto backlog creation, no autonomous dev, and no live provider spend by default.

The first worker attempt failed because the legacy audit proof still required the original upgrade card to be in the current active sprint. That was the same historical-proof/current-sprint coupling failure class. The proof script now accepts either the original upgrade card during active build or the already-closed upgrade card for recurring runs.

## Report Summary

- Deterministic findings: 55 total.
- Severity: 40 P0, 8 P1, 7 P2, 0 P3.
- Proposed cards: 17.
- Endpoint measurements: 5/5 healthy.
- `/api/foundation-hub`: 76.956ms / 577,894 bytes.
- `/api/source-of-truth`: 15.323ms / 134,286 bytes.
- LLM review: not executed; approved route available, packet mode only.

## Proof Commands

```bash
node --check scripts/process-nightly-deep-audit-upgrade-check.mjs
npm run foundation:job -- --job=nightly-deep-audit --actor=codex-nightly-audit-backfill
npm run process:nightly-deep-audit-upgrade-check -- --json --endpointTimeoutMs=8000
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=NIGHTLY-DEEP-AUDIT-BACKFILL-001 --planApprovalRef=docs/process/approvals/NIGHTLY-DEEP-AUDIT-BACKFILL-001.json --closeoutKey=nightly-deep-audit-backfill-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=NIGHTLY-DEEP-AUDIT-BACKFILL-001 --closeoutKey=nightly-deep-audit-backfill-v1
npm run process:foundation-ship -- --card=NIGHTLY-DEEP-AUDIT-BACKFILL-001 --planApprovalRef=docs/process/approvals/NIGHTLY-DEEP-AUDIT-BACKFILL-001.json --closeoutKey=nightly-deep-audit-backfill-v1 --commitRef=HEAD
```

## Known Limits

- This proves the audit can run now; it does not yet make stale audit runs fail the verifier.
- This does not yet show stale scheduled jobs in the Foundation 30-second read.
- This does not yet create the broader system-health audit across every job, source, endpoint, verifier, extraction, and agent run.
- This does not auto-promote findings to backlog or auto-fix any P0s.
- This does not run live LLM review by default.

## Review Next

Build `NIGHTLY-AUDIT-RUN-PROOF-001`: fail closed when the latest successful nightly audit run is stale or missing. Then build the visible scheduled-job staleness dashboard and the broader system-health nightly audit so Steve never has to discover missing runs manually again.
