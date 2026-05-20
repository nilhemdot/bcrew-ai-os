# MEMORY-005 Temporal Truth Model Closeout

Card: `MEMORY-005`
Closeout key: `memory-005-temporal-truth-model-v1`
Generated: 2026-05-20T08:54:02.139Z

## What Changed

- Added a reusable temporal truth contract for decision and strategy records.
- Added current-state query helpers that use `validFrom`, `validUntil`, and `supersededBy` instead of trusting whichever note looks newest.
- Added decision-store/database support for decision temporal fields: `valid_from`, `valid_until`, and `superseded_by`.
- Documented the temporal meaning rule in Operating Truths without putting live values in markdown.
- Added dogfood proof that rejects overlapping current truth, missing provenance, invalid temporal windows, and future truth becoming current too early.

## Proof

- Focused status: `healthy`
- Live decision temporal columns: `superseded_by, valid_from, valid_until`
- Dogfood current IDs: `DEC-CURRENT`

Proof commands:

- `node --check lib/memory-005-temporal-truth-model.js scripts/process-memory-005-check.mjs lib/foundation-db-schema-seed-store.js lib/foundation-db.js lib/foundation-decision-store.js`
- `npm run process:memory-005-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=MEMORY-005 --planApprovalRef=docs/process/approvals/MEMORY-005.json --closeoutKey=memory-005-temporal-truth-model-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=MEMORY-005 --closeoutKey=memory-005-temporal-truth-model-v1`
- `npm run process:foundation-ship -- --card=MEMORY-005 --planApprovalRef=docs/process/approvals/MEMORY-005.json --closeoutKey=memory-005-temporal-truth-model-v1 --commitRef=HEAD`

## Not Next

- No Graphiti, vector memory rebuild, broad conversation import, or autonomous memory agent.
- No external model upload of private memory, chats, source data, or decision history.
- No automatic locking, applying, or rewriting decisions without explicit human approval.
- No Strategy Hub UI rebuild, Strategy atom system, governance workflow, or DATA-003 live-value rendering inside this card.
- No destructive history rewrite: superseded truth stays queryable as history.

## Next

Continue `STRATEGY-001`.
