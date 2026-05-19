# FOUNDATION-DB-MONOLITH-SPLIT-015 Closeout

Closeout key: `foundation-sales-listing-store-split-v1`
Sprint: `foundation-db-sales-listing-store-split-2026-05-16`
Card: `FOUNDATION-DB-MONOLITH-SPLIT-015`

## What Changed

- Added `lib/foundation-sales-listing-store.js`.
- Moved Sales Listing assignment row mapping, GLS case-history helpers, assignment reads, tracked case reads, and assignment upsert behavior out of `lib/foundation-db.js`.
- Kept stable `lib/foundation-db.js` delegates for `listSalesListingAssignments`, `listSalesListingCases`, and `upsertSalesListingAssignment`.
- Added focused read-only proof at `scripts/process-foundation-sales-listing-store-split-check.mjs`.
- Extended Foundation-DB split verifier coverage and root verifier source wiring for `FOUNDATION-DB-MONOLITH-SPLIT-015`.
- Added `process:foundation-sales-listing-store-split-check`.

## What It Does

Sales Listing storage now has a named DB store module. The rest of the system can keep importing from `lib/foundation-db.js` while the actual Sales Listing storage logic lives in a smaller focused file.

## Why It Matters

This brings `lib/foundation-db.js` below the 5,000-line architecture-risk line. The DB monolith is no longer actively over the hard threshold, and the Sales Listing workflow has a focused storage owner before more Sales Hub work builds on it.

## Where It Lives

- `lib/foundation-sales-listing-store.js`
- `lib/foundation-db.js`
- `scripts/process-foundation-sales-listing-store-split-check.mjs`
- `lib/foundation-db-split-verifier.js`
- `scripts/process-verifier-foundation-db-split-module-check.mjs`
- `scripts/foundation-verify.mjs`
- `docs/process/foundation-db-sales-listing-store-split-015-plan.md`
- `docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-015.json`

## Proof Commands

```bash
node --check lib/foundation-sales-listing-store.js lib/foundation-db.js lib/foundation-db-split-verifier.js scripts/foundation-verify.mjs scripts/process-foundation-sales-listing-store-split-check.mjs scripts/process-verifier-foundation-db-split-module-check.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:foundation-sales-listing-store-split-check -- --json
npm run process:verifier-foundation-db-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-DB-MONOLITH-SPLIT-015 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-015.json --closeoutKey=foundation-sales-listing-store-split-v1 --commitRef=HEAD
```

## Known Limits

- This does not change Sales Listing table schema, indexes, constraints, columns, route behavior, ClickUp read behavior, ClickUp writeback behavior, listing sync cadence, case status semantics, Sales Hub UI, auth, or source extraction.
- This does not run ClickUp, FUB, Google, Gmail, Slack, Missive, Canva, OpenAI, Anthropic, Gemini, Skool, myICOR, Loom, YouTube, or paid-source APIs.
- This does not change Canva asset work, Marketing Video Lab, Build Intel extraction, Drive permissions, Meeting Vault Phase B, or hub feature work.

## Review Next

Review that `lib/foundation-db.js` is under 5,000 lines and the full ship gate passed, then continue Foundation cleanup with the next no-auth verifier/store slice instead of hub feature work unless Steve explicitly changes priority.
