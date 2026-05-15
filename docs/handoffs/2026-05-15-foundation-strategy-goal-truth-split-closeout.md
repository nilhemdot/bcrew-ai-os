# Foundation Strategy Goal Truth Split Closeout - 2026-05-15

Card: `FOUNDATION-DB-MONOLITH-SPLIT-006`
Sprint: `foundation-db-strategy-goal-truth-split-2026-05-15`
Closeout key: `foundation-strategy-goal-truth-split-v1`

## What Changed

Moved Strategy Prework Coverage and Strategy Goal Truth snapshot builders out of `lib/foundation-db.js` into `lib/foundation-strategy-goal-truth.js`.

`lib/foundation-db.js` now keeps the public exports as small dependency-injected wrappers:

- `getStrategyPreworkCoverageSnapshot()`
- `getStrategyGoalTruthSnapshot()`

## What It Does

The new module owns the Strategy source-truth read/build logic:

- prework participant expectations
- participant inference
- current-cycle detection
- read-method labels
- prework artifact mapping
- strategy goal fact normalization
- strategy goal group assembly
- synthetic behavior fixtures
- split evaluator and dogfood proof

## Why It Matters

The Foundation DB monolith is still above the senior-engineer risk line. This split removes another cohesive Strategy source-truth boundary without changing caller behavior, source IDs, doc paths, goal labels, participant logic, or hub routes.

## Where It Lives

- `lib/foundation-strategy-goal-truth.js`
- `lib/foundation-db.js`
- `scripts/process-foundation-strategy-goal-truth-split-check.mjs`
- `package.json`
- `scripts/foundation-verify.mjs`
- `lib/foundation-build-closeout-overnight-records.js`
- `docs/process/foundation-db-strategy-goal-truth-split-006-plan.md`
- `docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-006.json`

## Proof Commands

```bash
node --check lib/foundation-strategy-goal-truth.js scripts/process-foundation-strategy-goal-truth-split-check.mjs lib/foundation-db.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:foundation-strategy-goal-truth-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=FOUNDATION-DB-MONOLITH-SPLIT-006 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-006.json --closeoutKey=foundation-strategy-goal-truth-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=FOUNDATION-DB-MONOLITH-SPLIT-006 --closeoutKey=foundation-strategy-goal-truth-split-v1
npm run process:foundation-ship -- --card=FOUNDATION-DB-MONOLITH-SPLIT-006 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-006.json --closeoutKey=foundation-strategy-goal-truth-split-v1 --commitRef=HEAD
```

## Dogfood

The focused proof recreates the unsafe old shape: Strategy prework/goal truth builder logic still buried inline in `foundation-db.js`.

Expected result:

- old inline ownership fails
- split module ownership passes
- synthetic prework participant behavior remains intact
- synthetic Strategy goal group statuses remain intact
- `foundation-db.js` line count decreases

## Known Limits

- This does not split all of `lib/foundation-db.js`.
- This does not change Google source IDs, doc paths, labels, participant names, goal labels, rules, caveats, or return shapes.
- This does not change `doc_source_snapshots` schema, writes, or API shape.
- This does not change BHAG / Agent Engine source snapshot behavior from `FOUNDATION-DB-MONOLITH-SPLIT-004`.
- This does not change Strategy Operating Truth behavior from `FOUNDATION-DB-MONOLITH-SPLIT-005`.
- This does not move FUB storage, source crawl, jobs, intelligence, shared communications, sales, or hub behavior.
- This does not wire Marketing Video Lab live routes.

## Review Next

Continue no-auth Foundation cleanup with another bounded Foundation DB split after this one ships and pushes. Good next candidates are FUB lead-source storage or another cohesive shared-communications helper/status block, but review blast radius before opening the next card.
