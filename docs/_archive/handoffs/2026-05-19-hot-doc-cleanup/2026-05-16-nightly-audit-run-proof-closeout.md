# NIGHTLY-AUDIT-RUN-PROOF-001 Closeout

Date: 2026-05-16
Sprint: foundation-audit-reliability-2026-05-16
Closeout key: nightly-audit-run-proof-v1

## Verdict

Accepted. The nightly deep audit now has fail-closed run freshness proof. Foundation can no longer treat a configured nightly audit as healthy unless the actual job ledger has a fresh successful run for the current schedule window, or the current schedule window is still open.

Steve found the missed audit manually. This card moves that detection into code.

## What Changed

- Added `lib/nightly-audit-run-proof.js`.
- Added `scripts/process-nightly-audit-run-proof-check.mjs`.
- Added `process:nightly-audit-run-proof-check`.
- Extended `lib/foundation-intelligence-audit-verifier.js` so the nightly audit check consumes actual run freshness.
- Added dogfood fixtures for:
  - missing run before the current window deadline: pending, not failed
  - missing run after the deadline: failed
  - failed latest run after the deadline: failed
  - stale prior-day success after the deadline: failed
  - fresh current-day success after the deadline: passed

## Proof

```bash
node --check lib/nightly-audit-run-proof.js
node --check lib/foundation-intelligence-audit-verifier.js
node --check scripts/process-nightly-audit-run-proof-check.mjs
npm run process:nightly-audit-run-proof-check -- --json
npm run foundation:verify -- --json-summary
```

Focused proof passed with the live backfilled audit run:

- run id: `job-nightly-deep-audit-20260516185220-pjgs1s`
- job key: `nightly-deep-audit`
- status: `succeeded`
- finished at: `2026-05-16T18:52:21.495Z`
- current verifier: `410/410`

## Dogfood Result

The proof recreates the exact miss class: a scheduled audit exists, but no successful run exists after the schedule window. That now fails closed. A stale prior-day success also fails closed. A fresh success passes.

## Known Limits

- This verifies `nightly-deep-audit` run freshness only.
- The broader system-health layer still needs to cover every scheduled job, source, endpoint, extraction, verifier check, and agent/job run.
- The dashboard still needs a visible scheduled-job staleness surface so stale jobs turn red on first glance.
- This does not auto-repair stale jobs, auto-create backlog cards, auto-fix code, or perform source extraction.

## Next

Continue the Audit Reliability queue:

1. `FOUNDATION-CLEANUP-ARC-CLOSEOUT-001`
2. Proposal-only stab capture for system health, scheduled-job staleness dashboard, doc/report bloat guards, WIP protocol, connector completion, and other next-sprint candidates
3. Whole-system health audit and visible staleness surface so hidden failures do not depend on Steve noticing them
