# SPRINT-CHECK-HISTORICAL-MODE-001 Closeout

Date: 2026-05-15
Closeout key: `sprint-check-historical-mode-v1`
Sprint ID: `sprint-check-historical-mode-2026-05-15`
Status: closed; final post-commit ship gate is the authoritative proof

## What Changed

- Added `lib/sprint-check-historical-mode.js`.
- Added `scripts/process-sprint-check-historical-mode-check.mjs`.
- Updated `scripts/process-check-readonly-mode-check.mjs` to validate either active-current sprint proof or verified historical closeout proof.
- Added `process:sprint-check-historical-mode-check` to `package.json`.
- Added verifier coverage in `scripts/foundation-verify.mjs`.
- Added closeout registry entry in `lib/foundation-build-closeout-overnight-records.js`.

## What It Does

Focused sprint proof scripts can now stay useful after sprint rollover. The rule is:

- if the expected sprint is active, the card must be in `building_now` or `done_this_sprint`
- if the active sprint has moved on, the live backlog card must be `done`
- the exact matching closeout key must be verified for that card

This avoids a broad `activeSprintAtOrPast` bypass. Historical mode is not a free pass.

## Why It Matters

The previous focused proof pattern could fail after closeout only because the active sprint had changed. That created false blockers and verifier drag. This card keeps old proof scripts useful as evidence without weakening active Current Sprint checks for cards currently being built.

## Dogfood Proof

Focused proof command:

```bash
npm run process:sprint-check-historical-mode-check -- --json
```

Observed result before closeout:

- current card validated in `active_current` mode
- `PROCESS-CHECK-READONLY-MODE-001` validated in `historical_closeout` mode after rollover
- synthetic active-current fixture passed
- synthetic historical-closeout fixture passed
- wrong stage failed closed
- missing closeout failed closed
- wrong closeout key failed closed
- non-done card with verified closeout failed closed

Regression command:

```bash
npm run process:process-check-readonly-mode-check -- --json
```

Observed result:

- previous readonly proof passed after sprint rollover using verified historical closeout evidence
- process-check scanner still found zero unclassified unguarded live mutators

## Proof Commands

```bash
node --check lib/sprint-check-historical-mode.js scripts/process-sprint-check-historical-mode-check.mjs scripts/process-check-readonly-mode-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:sprint-check-historical-mode-check -- --json
npm run process:process-check-readonly-mode-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=SPRINT-CHECK-HISTORICAL-MODE-001 --planApprovalRef=docs/process/approvals/SPRINT-CHECK-HISTORICAL-MODE-001.json --closeoutKey=sprint-check-historical-mode-v1 --commitRef=HEAD
```

## Known Limits

- This migrates one real focused proof script, not every historical process script.
- This does not add an `activeSprintAtOrPast` bypass.
- This does not weaken active Current Sprint checks for the current card.
- This does not wire Marketing Video Lab live routes.
- This does not build hub feature UI, paid-source auth, Build Intel extraction, Meeting Vault Phase B, or Drive permission mutation.

## Review Next

Continue no-auth Foundation cleanup with `LIVE-TRUTH-VERIFY-DECOUPLE-001`, another verifier proof-module split, or another bounded `lib/foundation-db.js` store split.
