# DATA-003 Source-Backed Values Closeout

Closeout key: `data-003-source-backed-values-v1`

## What Changed

- Added `lib/data-003-source-backed-values.js`.
- Added `scripts/process-data-003-check.mjs` and package script `process:data-003-check`.
- Added a Strategy Overview panel that fetches the live BHAG and Agent Engine doc snapshots.
- Rendered source-backed cards for team BHAG pace, community BHAG pace, Agent Engine assumptions, and Agent Engine capacity.
- Added compact responsive styles for the live source value cards.
- Wired closeout registry proof and Current Sprint advancement to `FOUNDATION-OVERNIGHT-CLOSEOUT-AND-MORNING-READINESS-001`.

## What It Does

Strategy Overview now shows the first live source-backed values instead of leaving key numbers only inside supporting docs or markdown prose.

The cards reuse the existing `/api/doc` source snapshot path:

- `docs/strategy/bhag-model.md`
- `docs/strategy/agent-engine.md`

Each card keeps source badges, source actions, as-of dates, value labels, and provenance details.

## Why It Matters

Markdown explains the model. Source rows carry the numbers.

This closes the first practical slice of `DATA-003`: when BHAG milestones or Agent Engine assumptions change in their source systems, the system has a rendered source-backed surface instead of requiring manual strategy doc edits.

## Where It Lives

- `lib/data-003-source-backed-values.js`
- `scripts/process-data-003-check.mjs`
- `public/foundation-strategy-renderers.js`
- `public/styles-strategy-docs.css`
- `docs/process/data-003-plan.md`
- `docs/process/approvals/DATA-003.json`
- `docs/_archive/handoffs/2026-05-20-data-003-source-backed-values-closeout.md`
- `lib/foundation-build-closeout-intelligence-records.js`
- `package.json` script `process:data-003-check`

## Proof Commands

- `node --check lib/data-003-source-backed-values.js scripts/process-data-003-check.mjs public/foundation-strategy-renderers.js`
- `npm run process:data-003-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=DATA-003 --planApprovalRef=docs/process/approvals/DATA-003.json --closeoutKey=data-003-source-backed-values-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=DATA-003 --closeoutKey=data-003-source-backed-values-v1`
- `npm run process:foundation-ship -- --card=DATA-003 --planApprovalRef=docs/process/approvals/DATA-003.json --closeoutKey=data-003-source-backed-values-v1 --commitRef=HEAD`

## Known Limits

- No extraction or source sync.
- No browser session, screenshots, OCR, transcription, provider/model calls, or broad crawl.
- No source-data mutation, Drive permission mutation, credential mutation, or external write.
- No Strategy Hub redesign.
- No Value Builder split.

## Review Next

Continue `FOUNDATION-OVERNIGHT-CLOSEOUT-AND-MORNING-READINESS-001`: verify raw health, repeated-failure gate, backlog hygiene, `foundation:verify`, main sync, and choose the next safe Foundation sprint if Steve is still asleep.
