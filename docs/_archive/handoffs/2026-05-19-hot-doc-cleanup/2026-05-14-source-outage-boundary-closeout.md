# Source Outage Boundary Closeout - 2026-05-14

Card: `SOURCE-OUTAGE-BOUNDARY-001`
Closeout key: `source-outage-boundary-v1`
Sprint: `source-outage-boundary-2026-05-14`

## What Changed

Added a fail-soft source boundary for ClickUp read/report paths:

- `lib/clickup.js`
- `lib/agent-roster-review.js`
- `lib/agent-feedback-auto-send.js`
- `lib/agent-feedback-production-autosend-dry-run.js`
- `lib/agent-feedback-reminders.js`
- `lib/source-outage-boundary.js`
- `scripts/process-source-outage-boundary-check.mjs`
- `server.js`
- `package.json` script `process:source-outage-boundary-check`

## Why It Matters

ClickUp returned `500 DB_003` while `HUB-001` was being shipped. The vendor outage was outside AIOS control. The internal flaw was that Foundation and Ops read surfaces could crash or block ship proof instead of exposing explicit degraded source health.

This card makes ClickUp read outages visible without pretending data is clean:

- Foundation Hub full view keeps serving.
- Ops Hub keeps serving.
- Agent Roster shows a source-degraded queue item instead of zero clean rows.
- Auto-send, production dry-run, and reminder readiness fail closed with no Gmail, ClickUp, or ledger side effects.

## Dogfood Proof

`process:source-outage-boundary-check` recreates the exact failure class with a synthetic ClickUp `500 DB_003` response and validates the real report builders.

The proof verifies:

- The ClickUp error is converted to sanitized degraded source health.
- Raw tokens are not leaked.
- Agent Roster reports source degradation instead of fake clean state.
- Auto-send does not send or write when source data is unavailable.
- Production dry-run does not pretend it scanned ClickUp.
- Reminder readiness does not send, write ClickUp, or write reminder ledger rows.
- `/api/foundation-hub?view=full` and `/api/ops-hub` serve JSON.

## Not Shipped

- No ClickUp credential repair.
- No ClickUp write-path fail-softening.
- No Sales, Ops, or Build Intel feature work.
- No autonomous nightly repair.
- No broad connector-monitoring scheduler.

## Next

Ship the recovery card with the normal gates, then return to sprint review. The next process work should be selected explicitly; do not silently open hub work or Build Intel while Foundation recovery is active.
