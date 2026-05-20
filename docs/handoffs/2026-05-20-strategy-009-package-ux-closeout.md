# STRATEGY-009 Package UX Closeout

Date: 2026-05-20
Card: `STRATEGY-009`
Closeout key: `strategy-009-package-ux-v1`

## What Changed

- Added a reusable Strategy package UX contract and focused proof.
- Cleaned Strategic Execution navigation labels around the current live package:
  - Overview
  - Planning Workflow
  - Meeting Packet
  - Source Truth
  - Review Queue
- Removed the duplicate full Strategy review-board preview from Overview.
- Kept route action controls owned by Review Queue.

## What It Does

The Strategy package now has a contract that each section has one job:

- Overview is the command cockpit and compact preview surface.
- Planning Workflow owns planning queues.
- Meeting Packet owns meeting agenda, pressure cards, and meeting-safe review readout.
- Source Truth owns source-backed goal and operating truth.
- Route Review owns action controls.

The focused proof dogfoods the failure modes that caused the card: duplicate Overview route boards, route controls leaking into readout surfaces, missing nav sections, revived old advisor surfaces, and missing Review Queue action controls.

## Why It Matters

Steve needs to use Strategy live without translating repeated packet/board/priority blocks. This card keeps the page useful while preventing the old Strategy Advisor package from returning as a messy pile of duplicated panels.

## Where It Lives

- `lib/strategy-package-ux-contract.js`
- `public/strategic-execution.html`
- `public/strategic-execution.js`
- `scripts/process-strategy-009-check.mjs`
- `docs/process/strategy-009-package-ux-plan.md`
- `docs/process/approvals/STRATEGY-009.json`
- `docs/handoffs/2026-05-20-strategy-009-package-ux-closeout.md`
- `package.json` script `process:strategy-009-check`
- `Foundation > Current Sprint`

## Proof Commands

- `node --check lib/strategy-package-ux-contract.js public/strategic-execution.js scripts/process-strategy-009-check.mjs`
- `npm run process:strategy-009-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=STRATEGY-009 --planApprovalRef=docs/process/approvals/STRATEGY-009.json --closeoutKey=strategy-009-package-ux-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=STRATEGY-009 --closeoutKey=strategy-009-package-ux-v1`
- `npm run process:foundation-ship -- --card=STRATEGY-009 --planApprovalRef=docs/process/approvals/STRATEGY-009.json --closeoutKey=strategy-009-package-ux-v1 --commitRef=HEAD`

## Known Limits

- V1 does not create new Strategy features or new data products.
- V1 does not revive advisor chat, provider/model calls, or recommended-priority generation.
- V1 does not apply route decisions automatically.
- V1 does not implement KPI appointment or lead-quality cards.

## Review Next

Continue `KPI-APPT-QUALITY-001` after full ship gates pass and main is pushed clean.
