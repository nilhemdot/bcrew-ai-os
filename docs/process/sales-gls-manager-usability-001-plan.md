# SALES-GLS-MANAGER-USABILITY-001 Plan

## What

Ship the first GLS Manager usability slice for Sales Hub: manager queue filters, active-view hiding for snoozed/failed/sold work, per-listing and grouped-project snooze controls, and print/PDF support.

## Why

Steve and Nick need the GLS Manager to behave like an operating queue, not a raw list. Adjusted-but-unsold work should stay visible, sold/failed work should leave the active lane, and temporarily paused cases need a visible snooze path so the manager can focus on the cases that need action now.

## Acceptance Criteria

- GLS Manager exposes filters for Active, Needs owner, Needs plan, Adjusted, Snoozed, Blocked / failed, Sold / closed, and All.
- Active view hides snoozed, blocked, failed, sold, cancelled, and expired cases while keeping adjusted-but-unsold cases visible.
- Listing and grouped-project cases can be snoozed for 2 weeks, 30 days, or a custom date, with a note and clear action.
- Snooze metadata is stored under existing GLS case metadata without adding a schema migration.
- Sales Hub case metadata logic lives in a Sales-owned helper module instead of adding another helper block to oversized `server.js`.
- Active-pipeline metrics keep assigned/taken-on/game-plan counts separate from adjusted or sold outcomes.
- The Sales Hub proof script dogfoods the filter rules and proves snoozed/blocked/sold cases leave active while adjusted cases stay visible.
- The change is closed against the existing live backlog card instead of shipping as orphan Sales Hub work.

## Definition Of Done

- `SALES-GLS-MANAGER-USABILITY-001` is closed in live backlog with closeout trail.
- A closeout record exists for Recent Builds / operator review.
- `npm run process:sales-listings-hub-check -- --json` passes and covers the manager filter/snooze behavior.
- `node --check` passes for changed JS files.
- `git diff --check`, `backlog:hygiene`, `foundation:verify`, and the full ship gate pass before push.

## Details

Use the existing GLS V1 source boundary:

- Source truth stays ClickUp Deal Data Entry / `SRC-CLICKUP-001` plus persisted AIOS GLS case state.
- Existing persisted GLS case metadata can carry `glsSnooze`; do not introduce a new table or schema migration for this slice.
- Keep new server-adjacent behavior in `lib/sales-hub-case-metadata.js`; `server.js` should only import and call it.
- Existing card `SALES-GLS-MANAGER-USABILITY-001` owns this manager-page usability work; do not invent a duplicate Sales card.
- This is a review-and-ship plan because the Sales chat already built the slice before the main session review. Do not fake a pre-build sprint history; close it with honest code review, focused proof, backlog closeout, and follow-up process work.

## Risks

- If filters are only source-text checks, they can become theater. The proof must execute the actual browser filter functions in a VM and assert the active/snoozed/blocked/sold/adjusted behavior.
- If snooze saves overwrite metadata, GLS history can be lost. Keep metadata merged through the existing assignment upsert path.
- If Sales Hub keeps bypassing the sprint/backlog process, hub work can drift from Foundation. Capture a follow-up hub-sprint-flow card instead of pretending this already had full stage progression.

## Tests

- `node --check scripts/process-sales-listings-hub-check.mjs public/sales.js lib/sales-listing-assignments.js lib/sales-listing-inventory.js lib/sales-hub-case-metadata.js server.js`
- `git diff --check`
- `npm run process:sales-listings-hub-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run process:ship-check -- --card=SALES-GLS-MANAGER-USABILITY-001 --planApprovalRef=docs/process/approvals/SALES-GLS-MANAGER-USABILITY-001.json --closeoutKey=sales-gls-manager-usability-v1`
- `npm run process:fanout-check -- --card=SALES-GLS-MANAGER-USABILITY-001 --closeoutKey=sales-gls-manager-usability-v1`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=SALES-GLS-MANAGER-USABILITY-001 --planApprovalRef=docs/process/approvals/SALES-GLS-MANAGER-USABILITY-001.json --closeoutKey=sales-gls-manager-usability-v1 --commitRef=HEAD`

## Not Next

- Do not rebuild Sales Hub.
- Do not add writes to ClickUp.
- Do not build grouping split/merge overrides.
- Do not build the Sales KPI coach, FUB cleanup, or Hub Sprint Flow card in this slice.
- Do not touch unrelated Foundation process files except the proof, approval, and closeout records required to ship this safely.
