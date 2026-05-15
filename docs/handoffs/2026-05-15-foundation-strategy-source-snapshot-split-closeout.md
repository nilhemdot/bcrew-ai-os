# Foundation Strategy Source Snapshot Split Closeout - 2026-05-15

Card: `FOUNDATION-DB-MONOLITH-SPLIT-004`
Sprint: `foundation-db-strategy-source-snapshot-split-2026-05-15`
Closeout key: `foundation-strategy-source-snapshot-split-v1`
Status: closed

## What Changed

- Added `lib/foundation-strategy-source-snapshots.js` for source-backed BHAG and Agent Engine doc snapshot builders.
- Moved these builders out of `lib/foundation-db.js`:
  - `getLiveBhagSourceSnapshot()`
  - `getLiveAgentEngineSourceSnapshot()`
  - Strategy/BHAG date, number, currency, pace, and row-formatting helpers used by those builders.
- Kept `lib/foundation-db.js` as the owner of pool, schema/init, `doc_source_snapshots` writes/reads, source crawl, intelligence, shared communications, finance snapshot behavior, and public DB exports.
- Added `scripts/process-foundation-strategy-source-snapshot-split-check.mjs`.
- Added `process:foundation-strategy-source-snapshot-split-check`.
- Added thin verifier coverage and closeout registry coverage.

## Proof

Focused proof:

```bash
npm run process:foundation-strategy-source-snapshot-split-check -- --json
```

Result: pass.

Dogfood result:

- Old inline Strategy/BHAG builder ownership shape fails.
- Split module shape passes only when:
  - `lib/foundation-strategy-source-snapshots.js` owns the two live builders.
  - `lib/foundation-db.js` imports the builders.
  - required Google ranges and source IDs remain present.
  - synthetic row proof preserves source-backed row shape.

Full verifier:

```bash
npm run foundation:verify -- --json-summary
```

Result: `349/349`.

Line count:

- `lib/foundation-db.js`: `12,629 -> 12,098` split-count lines.
- Delta: `-531`.

## Not Changed

- No Google source ID, range, doc path, label, or sort-order changes.
- No `doc_source_snapshots` schema/write/API changes.
- No finance snapshot movement.
- No schema/init or bootstrap seed changes.
- No source crawl, job runtime, intelligence, shared communications, sales, FUB, or hub behavior movement.
- No hub UI or Marketing Video Lab live wiring.
- No paid-source auth.
- No `MEETING-VAULT-ACL-001 Phase B`.
- No Drive permissions mutation.

## Next

Continue no-auth Foundation cleanup with one bounded slice:

1. Split another `lib/foundation-db.js` store/helper section, or
2. Extract another verifier proof module, or
3. Address the highest remaining nightly-audit P0 that does not require Steve auth.

Do not start hub feature work from this closeout.
