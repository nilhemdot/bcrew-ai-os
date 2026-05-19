# Foundation Strategy Operating Truth Split Closeout

Date: 2026-05-15
Card: `FOUNDATION-DB-MONOLITH-SPLIT-005`
Sprint: `foundation-db-strategy-operating-truth-split-2026-05-15`
Closeout key: `foundation-strategy-operating-truth-split-v1`

## What Changed

Moved the Strategy Operating Truth finance/Owners/FUB/KPI source-card builder out of `lib/foundation-db.js` into `lib/foundation-strategy-operating-truth.js`.

`lib/foundation-db.js` now keeps the public `getStrategyOperatingTruthSnapshot()` export as a small dependency-injected wrapper. The new module owns the sheet metric helpers, source facts, source-card assembly, synthetic source-card proof, and split evaluator.

## Why It Matters

`lib/foundation-db.js` is still above the architecture-risk line. This split removes another cohesive source-truth builder from the DB monolith without changing public callers, source IDs, Google ranges, KPI card reads, FUB snapshot reads, or hub behavior.

This keeps the Foundation moving toward smaller named modules while preserving the Strategy guardrail that prevents hallucinated "build this source" recommendations when the source already exists.

## Where It Lives

- `lib/foundation-strategy-operating-truth.js`
- `lib/foundation-db.js`
- `scripts/process-foundation-strategy-operating-truth-split-check.mjs`
- `package.json`
- `scripts/foundation-verify.mjs`
- `lib/foundation-build-closeout-overnight-records.js`
- `docs/process/foundation-db-strategy-operating-truth-split-005-plan.md`
- `docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-005.json`

## Proof

Focused proof:

```bash
npm run process:foundation-strategy-operating-truth-split-check -- --json
```

Result:

- old inline Strategy Operating Truth ownership rejected
- split module shape accepted
- synthetic finance/Owners/FUB/KPI source-card shape preserved
- focused proof stays read-only and avoids live Google reads
- `lib/foundation-db.js` line count decreased from 12,098 to about 11,926 split-count lines

Full proof will be recorded after the final ship gate:

```bash
node --check lib/foundation-strategy-operating-truth.js scripts/process-foundation-strategy-operating-truth-split-check.mjs lib/foundation-db.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:foundation-strategy-operating-truth-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=FOUNDATION-DB-MONOLITH-SPLIT-005 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-005.json --closeoutKey=foundation-strategy-operating-truth-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=FOUNDATION-DB-MONOLITH-SPLIT-005 --closeoutKey=foundation-strategy-operating-truth-split-v1
npm run process:foundation-ship -- --card=FOUNDATION-DB-MONOLITH-SPLIT-005 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-005.json --closeoutKey=foundation-strategy-operating-truth-split-v1 --commitRef=HEAD
```

## Known Limits

- This does not split all of `lib/foundation-db.js`.
- This does not change Google source IDs, ranges, labels, doc paths, or source IDs.
- This does not change BHAG / Agent Engine snapshot behavior from `FOUNDATION-DB-MONOLITH-SPLIT-004`.
- This does not move FUB storage, source crawl, jobs, intelligence, shared communications, sales, or hub behavior.
- This does not wire Marketing Video Lab live routes.

## Review Next

Continue no-auth Foundation cleanup with another bounded Foundation DB split. Pick the next largest cohesive store/helper block that does not require Steve auth or hub feature decisions.
