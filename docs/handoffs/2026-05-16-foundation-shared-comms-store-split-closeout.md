# FOUNDATION-DB-MONOLITH-SPLIT-009 Closeout

Closeout key: `foundation-shared-comms-store-split-v1`
Sprint: `foundation-db-shared-comms-store-split-2026-05-16`
Status: verified

## What Changed

Moved the shared-communications archive, candidate, synthesis, and review-application store behavior out of `lib/foundation-db.js` into `lib/foundation-shared-comms-store.js`.

`lib/foundation-db.js` keeps the existing public export names as delegates, so current callers do not change imports.

## Why It Matters

`lib/foundation-db.js` was still above the architecture-risk line. Shared communications is a clear Foundation store boundary because it owns the source archive and proposal path that moves extracted signal toward governed backlog, decisions, and open questions.

This slice reduced `lib/foundation-db.js` from 11,187 lines to about 9,410 lines without changing schema or source behavior.

## Proof

- `npm run process:foundation-shared-comms-store-split-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=FOUNDATION-DB-MONOLITH-SPLIT-009 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-009.json --closeoutKey=foundation-shared-comms-store-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=FOUNDATION-DB-MONOLITH-SPLIT-009 --closeoutKey=foundation-shared-comms-store-split-v1`
- `npm run process:foundation-ship -- --card=FOUNDATION-DB-MONOLITH-SPLIT-009 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-009.json --closeoutKey=foundation-shared-comms-store-split-v1 --commitRef=HEAD`

Focused dogfood proved the split accepts delegated store ownership and rejects missing module ownership, old inline archive ownership, missing delegate wiring, and weak split plans.

Synthetic fake-pool proof exercised the real store methods for source stats, existing external IDs, archive snapshot mapping, context search, candidate snapshot mapping, artifact upsert mapping, and candidate-to-backlog transaction behavior.

## Known Limits

- This does not split all of `lib/foundation-db.js`.
- This does not change shared communication table schema, indexes, constraints, columns, or migrations.
- This does not run source extraction or change extraction schedules, quotas, prompts, providers, or source crawler behavior.
- This does not build Strategy, Sales, Marketing, Ops, Canva, paid-source auth, Build Intel extraction, or Drive permission mutation.
- This does not wire Marketing Video Lab live routes.
