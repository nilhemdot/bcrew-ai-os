# Sales GLS Manager Usability Closeout - 2026-05-14

Backlog card: `SALES-GLS-MANAGER-USABILITY-001`

Closeout key: `sales-gls-manager-usability-v1`

## What Changed

- Added GLS Manager filters for Active, Needs owner, Needs plan, Adjusted, Snoozed, Blocked / failed, Sold / closed, and All.
- Added per-listing and grouped-project snooze controls with 2-week, 30-day, custom date, note, and clear actions.
- Default Active view now hides snoozed, blocked/failed, sold/closed, cancelled, and expired cases.
- Adjusted-but-unsold cases remain active and also appear in the Adjusted filter.
- Active-pipeline metrics now keep assigned/taken-on/game-plan counts tighter, so adjusted or closed outcomes do not automatically masquerade as game-plan-created proof.
- Weekly cohort rows now carry task IDs for follow-up debugging.
- Snooze metadata is stored in existing GLS assignment metadata as `glsSnooze`; no schema migration was added.
- New case metadata behavior lives in `lib/sales-hub-case-metadata.js` instead of expanding the oversized `server.js` helper block.
- The Sales proof script now executes the real browser filter functions in a VM and proves the exact filter behavior.

## Proof

- `node --check scripts/process-sales-listings-hub-check.mjs public/sales.js lib/sales-listing-assignments.js lib/sales-listing-inventory.js lib/sales-hub-case-metadata.js server.js`
- `git diff --check`
- `npm run process:sales-listings-hub-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run process:ship-check -- --card=SALES-GLS-MANAGER-USABILITY-001 --planApprovalRef=docs/process/approvals/SALES-GLS-MANAGER-USABILITY-001.json --closeoutKey=sales-gls-manager-usability-v1`
- `npm run process:fanout-check -- --card=SALES-GLS-MANAGER-USABILITY-001 --closeoutKey=sales-gls-manager-usability-v1`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=SALES-GLS-MANAGER-USABILITY-001 --planApprovalRef=docs/process/approvals/SALES-GLS-MANAGER-USABILITY-001.json --closeoutKey=sales-gls-manager-usability-v1 --commitRef=HEAD`

## Known Limits

- This does not add ClickUp writes.
- This does not add manual group split/merge overrides.
- This does not create a separate Hub Sprint board; this slice was reviewed and closed after the Sales chat built it.
- This does not build the Sales KPI coach, FUB cleanup, or other Sales Hub systems.

## Next

Follow-up card `HUB-001` is scoped: create a lightweight hub-sprint/checkpoint flow so Sales/Ops hub work cannot bypass backlog, proof, and closeout again while Foundation work continues in parallel.
