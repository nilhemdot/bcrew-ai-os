# Foundation FUB Lead-Source Store Split Closeout - 2026-05-15

Card: `FOUNDATION-DB-MONOLITH-SPLIT-007`
Sprint: `foundation-db-fub-lead-source-store-split-2026-05-15`
Closeout key: `foundation-fub-lead-source-store-split-v1`

## What Changed

Moved FUB lead-source rules and snapshot storage out of `lib/foundation-db.js` into `lib/foundation-fub-lead-source-store.js`.

Public callers keep using the same exports from `lib/foundation-db.js`:

- `listFubLeadSourceRules()`
- `getFubLeadSourceSnapshot(contextKey)`
- `upsertFubLeadSourceRule(input, actor)`
- `saveFubLeadSourceSnapshot(input, actor)`

## Why It Matters

FUB lead-source classification is Foundation source truth used by Strategy, Owners, FUB source review, and operator diagnostics. This split keeps the behavior intact while shrinking the DB monolith and giving FUB source-governance storage a named module.

## Proof

Required proof before push:

```bash
node --check lib/foundation-fub-lead-source-store.js scripts/process-foundation-fub-lead-source-store-split-check.mjs lib/foundation-db.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:foundation-fub-lead-source-store-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=FOUNDATION-DB-MONOLITH-SPLIT-007 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-007.json --closeoutKey=foundation-fub-lead-source-store-split-v1 --commitRef=HEAD
```

Dogfood proof:

- Old inline FUB lead-source store ownership in `lib/foundation-db.js` is rejected.
- Split module ownership plus thin public exports is accepted.
- Synthetic fake-pool/fake-client calls preserve list/get/upsert/save mapping, normalization, ordering, and conflict behavior.

## Not Done

- This does not split all of `lib/foundation-db.js`.
- This does not change FUB schema, indexes, constraints, routes, API refreshes, ClickUp integration, Sales listing assignments, Strategy Operating Truth behavior, hub UI, Marketing Video Lab wiring, Canva client work, paid-source auth, Drive permissions, or Meeting Vault Phase B.

## Next

After this card ships, continue no-auth Foundation cleanup with the next cohesive `lib/foundation-db.js` store/helper block only after reviewing blast radius.
