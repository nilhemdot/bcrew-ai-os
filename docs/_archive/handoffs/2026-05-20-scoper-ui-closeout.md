# SCOPER-UI-001 Closeout

Status: shipped after focused proof and full Foundation ship gate.

Closeout key: `scoper-ui-v1`

Next card: `SOURCE-001`

## What Changed

- Added `lib/scoper-ui.js` as the Scoper output review model.
- Added `planningWorkflow.scoperUi` so Strategy Hub v2 receives structured Scoper outputs.
- Added Strategy Hub rendering for Scoper output cards with collapsible sections:
  - verified / already answered
  - partial evidence
  - actual gaps
  - owner suggestion
  - next steps
  - blocked auto-actions
- Linked route cards to related Scoper output through `routeRefs`.
- Closed `SCOPER-UI-001` and advanced Current Sprint to `SOURCE-001`.

## What It Does

Steve can review Scoper output in the Strategy Hub without reading raw DB rows or JSON. Each output shows the plain-English issue, owner suggestion, evidence refs, remaining gaps, next review action, and the actions the system is not allowed to take automatically.

## Boundaries

- No backlog cards are auto-created.
- No decisions are approved, locked, or applied.
- No external writes, sends, provider calls, source sync, extraction, browser, OCR, transcription, Drive permission mutation, credential change, or paid/provider access.
- Route action remains in the existing human approval path.

## Proof

- `node --check lib/scoper-ui.js lib/strategy-planning-workflow.js public/strategic-execution.js scripts/process-scoper-ui-check.mjs`
- `npm run process:scoper-ui-check -- --close-card --json` passed: 26/26 checks, 5 live Scoper outputs rendered, 10 route refs, 0 failures.
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=SCOPER-UI-001 --planApprovalRef=docs/process/approvals/SCOPER-UI-001.json --closeoutKey=scoper-ui-v1 --commitRef=HEAD`

## Next

Continue `SOURCE-001` or the next safe Foundation card in Current Sprint order after clean ship and push.
