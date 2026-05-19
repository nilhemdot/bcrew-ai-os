# Foundation Shared-Comms Coverage Split Closeout

Date: 2026-05-15
Card: `FOUNDATION-DB-MONOLITH-SPLIT-008`
Sprint: `foundation-db-shared-comms-coverage-split-2026-05-15`
Closeout key: `foundation-shared-comms-coverage-split-v1`

## What Changed

- Added `lib/foundation-shared-comms-coverage.js`.
- Moved shared-communications coverage snapshot SQL, aggregation math, latest synthesis mapping, evaluator, and dogfood proof into the new module.
- Updated `lib/foundation-db.js` so `getSharedCommunicationCoverageSnapshot()` remains the stable public export and delegates to the focused module.
- Added `scripts/process-foundation-shared-comms-coverage-split-check.mjs`.
- Added verifier and Recent Builds coverage for this split.

## Why It Matters

`lib/foundation-db.js` remains above the architecture-risk line. This card removes one cohesive read-only reporting responsibility from the DB monolith without changing schema, callers, extraction behavior, Strategy UI, hub behavior, or live connector/auth paths.

## Proof Commands

```bash
node --check lib/foundation-shared-comms-coverage.js scripts/process-foundation-shared-comms-coverage-split-check.mjs lib/foundation-db.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:foundation-shared-comms-coverage-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-DB-MONOLITH-SPLIT-008 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-008.json --closeoutKey=foundation-shared-comms-coverage-split-v1 --commitRef=HEAD
```

## Dogfood

The focused proof recreates the failure pattern this card addresses:

- old inline shared-comms coverage aggregation inside `foundation-db.js` fails the evaluator
- split module ownership passes
- synthetic coverage fixture preserves total artifacts, total candidates, candidate coverage, processing coverage, pending counts, candidate type keys, and latest synthesis run mapping

## Proof Status

- Focused proof passed.
- Backlog hygiene passed across 500 cards with 0 findings.
- `foundation:verify -- --failures-only` passed 353/353.
- Full `process:foundation-ship` must pass before push.

## Not Changed

- No schema changes.
- No shared-comms extraction, candidate generation, synthesis, routing, or Strategy UI behavior changes.
- No Meeting Vault ACL Phase B.
- No Drive permission mutation or request-access emails.
- No live Missive/Gmail/Slack API calls.
- No Sales, Marketing, Ops, Canva, or paid-source auth work.

## Next

Continue no-auth Foundation cleanup with another bounded `lib/foundation-db.js` split after reviewing blast radius.
