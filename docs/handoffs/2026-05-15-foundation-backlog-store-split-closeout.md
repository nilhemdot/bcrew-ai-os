# Foundation Backlog Store Split Closeout

Date: 2026-05-15
Sprint: `foundation-backlog-store-split-2026-05-15`
Card: `FOUNDATION-DB-MONOLITH-SPLIT-001`
Closeout key: `foundation-backlog-store-split-v1`

## What Changed

- Added `lib/foundation-backlog-store.js`.
- Moved backlog create/update write behavior out of `lib/foundation-db.js`.
- Kept public exports as `createBacklogItem` and `updateBacklogItem` from `lib/foundation-db.js`.
- Added focused dogfood proof at `scripts/process-foundation-backlog-store-split-check.mjs`.
- Added package script `process:foundation-backlog-store-split-check`.
- Added verifier coverage for `foundation-backlog-store-split-v1`.

## What It Does

The backlog write store now owns:

- backlog item creation
- backlog item updates
- done-lane closeout guard
- locked `FOR UPDATE` merge path
- backlog change-event before/after state
- changedFields metadata

`lib/foundation-db.js` still owns connection pooling, transactions, schema, seed drift, read snapshots, and wrapper-preserved public exports.

## Why It Matters

Backlog is task truth. This split keeps task-truth write safety intact while shrinking the 19K-line Foundation DB monolith. Future backlog write changes can now land in a focused module instead of making `lib/foundation-db.js` more dangerous.

## Where It Lives

- `lib/foundation-backlog-store.js`
- `lib/foundation-db.js`
- `scripts/process-foundation-backlog-store-split-check.mjs`
- `package.json`
- `scripts/foundation-verify.mjs`
- `docs/process/foundation-db-monolith-split-001-plan.md`
- `docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-001.json`
- `docs/handoffs/2026-05-15-foundation-backlog-store-split-closeout.md`

## Proof Commands

```bash
node --check lib/foundation-backlog-store.js scripts/process-foundation-backlog-store-split-check.mjs lib/foundation-db.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:foundation-backlog-store-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=FOUNDATION-DB-MONOLITH-SPLIT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-001.json --closeoutKey=foundation-backlog-store-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=FOUNDATION-DB-MONOLITH-SPLIT-001 --closeoutKey=foundation-backlog-store-split-v1
npm run process:foundation-ship -- --card=FOUNDATION-DB-MONOLITH-SPLIT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-001.json --closeoutKey=foundation-backlog-store-split-v1 --commitRef=HEAD
```

## Proof Status

Focused proof passes. It validates the approval, live sprint state, Plan Critic row, module ownership, row-lock marker, before/after/changedFields metadata, dogfood rejection of weak done-lane closeouts, wrapper-preserved exports, and line-count reduction.

Line count: `lib/foundation-db.js` dropped from `18,961` to `18,801` lines in this slice.

## Known Limits

- This does not split all of `lib/foundation-db.js`.
- This does not move backlog read snapshot, seed drift, schema, source crawl, job, intelligence, decision, sales, or hub behavior.
- This does not change backlog schema or public route behavior.
- This does not wire Marketing Video Lab live routes.
- This does not build hub feature UI, paid-source auth, Build Intel extraction, Meeting Vault Phase B, or Drive permission mutation.

## Review Next

Stop at sprint review. Continue no-auth Foundation cleanup with the next bounded DB store, verifier proof module, or frontend route/cache split.
