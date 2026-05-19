# Foundation Decision Store Split Closeout - 2026-05-15

## Summary

Closed `FOUNDATION-DB-MONOLITH-SPLIT-002` under `foundation-decision-store-split-v1`.

This sprint extracted the decision, open-question, and pending-doc-update store domain from `lib/foundation-db.js` into `lib/foundation-decision-store.js` without changing public caller imports. `lib/foundation-db.js` now delegates the existing decision/question/doc-update exports through the focused store.

## What Changed

- Added `lib/foundation-decision-store.js`.
- Moved decision/open-question/pending-doc-update row mappers, traceability/review helpers, decision validation, pending-doc-update transition guards, and public decision/doc-update store functions into the new module.
- Kept public exports from `lib/foundation-db.js` by delegating to `foundationDecisionStore`.
- Added `scripts/process-foundation-decision-store-split-check.mjs`.
- Added `process:foundation-decision-store-split-check`.
- Added verifier coverage for `FOUNDATION-DB-MONOLITH-SPLIT-002`.
- Added build closeout record `foundation-decision-store-split-v1`.
- Updated Current Sprint docs and state.

## Proof

Commands run before closeout:

```bash
node --check lib/foundation-decision-store.js scripts/process-foundation-decision-store-split-check.mjs lib/foundation-db.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:foundation-decision-store-split-check -- --json
```

Focused proof result:

- `FOUNDATION-DB-MONOLITH-SPLIT-002` plan approval validates at 10/10.
- Live backlog card and Current Sprint state are present.
- Durable Plan Critic pass row exists at 10/10.
- Dogfood rejects unsupported decision categories.
- Dogfood normalizes duplicate/self supersedes IDs.
- Dogfood rejects invalid pending doc-update transitions.
- Dogfood preserves decision/doc-update traceability mapping.
- `lib/foundation-db.js` delegates the moved exports.
- `lib/foundation-db.js` line count dropped from `18,800` to about `17,852` lines in the focused proof.

Full ship proof is run through `process:foundation-ship` after commit.

## Not Changed

- No schema changes.
- No broad DB rewrite.
- No source crawl, job runtime, intelligence, shared communications, sales, FUB, or hub behavior movement.
- No Marketing Video Lab live wiring.
- No paid-source auth.
- No Meeting Vault Phase B.
- No Drive permission mutation.

## Next

Continue no-auth Foundation cleanup. The next good candidates are another bounded `lib/foundation-db.js` store split, a verifier proof-module split, or the highest remaining nightly-audit P0 that does not require Steve auth or business input.
