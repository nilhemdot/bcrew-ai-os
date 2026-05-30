# EXTRACT-CURRENT-001 Current-Day Source Freshness Closeout

Card: `EXTRACT-CURRENT-001`
Closeout key: `extract-current-source-freshness-v1`

## Summary

Closed current-day freshness proof for Gmail, Missive, meeting notes, Google Calendar, and Slack.

The focused proof verifies active scheduled target state, latest governed job success, cadence freshness, item-level crawl proof, failed-item visibility, and governed retry recovery. The one eligible `meetings-current-day` retry item was repaired through the existing governed recovery path before closeout.

## What Changed

- Added a reusable current-day freshness evaluator and dogfood proof.
- Added focused process proof for live extraction-control and Foundation job-ledger state.
- Added `process:extract-current-check`.
- Confirmed current-day failed item count is zero after governed recovery.
- Kept recovery manual and dry-run-first.
- Advanced Current Sprint to `EXTRACT-BACKFILL-001`.

## Proof

- `node --check lib/extract-current-source-freshness.js scripts/process-extract-current-check.mjs`
- `npm run process:extract-current-check -- --apply --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=EXTRACT-CURRENT-001 --planApprovalRef=docs/process/approvals/EXTRACT-CURRENT-001.json --closeoutKey=extract-current-source-freshness-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=EXTRACT-CURRENT-001 --closeoutKey=extract-current-source-freshness-v1`
- `npm run process:foundation-ship -- --card=EXTRACT-CURRENT-001 --planApprovalRef=docs/process/approvals/EXTRACT-CURRENT-001.json --closeoutKey=extract-current-source-freshness-v1 --commitRef=HEAD`

## Boundaries

- No broad historical extraction.
- No sends or external writes.
- No Drive permission mutation.
- No credential, provider config, or key mutation.
- No new source access or paid/browser-auth work.
- No Value Builder split.

## Next

Continue Foundation-only with `EXTRACT-BACKFILL-001`.
