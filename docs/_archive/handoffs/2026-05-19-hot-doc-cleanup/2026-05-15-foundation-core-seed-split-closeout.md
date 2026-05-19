# Foundation Core Seed Split Closeout - 2026-05-15

Card: `FOUNDATION-DB-MONOLITH-SPLIT-003`
Sprint: `foundation-db-core-seed-split-2026-05-15`
Closeout key: `foundation-core-seed-split-v1`
Status: closed

## What Changed

- Added `lib/foundation-core-seed.js` for static Foundation bootstrap seed defaults.
- Moved these static arrays out of `lib/foundation-db.js`:
  - `foundationUserSeed`
  - `decisionsSeed`
  - `parkingLotSeed`
  - `openQuestionsSeed`
  - `memoryStatusSeed`
  - `docSourceSnapshotsSeed`
- Kept `lib/foundation-db.js` as the owner of pool, schema/init, bootstrap seed calls, source-backed live snapshot builders, source crawl, intelligence, shared communications, and public DB exports.
- Added `scripts/process-foundation-core-seed-split-check.mjs`.
- Added `process:foundation-core-seed-split-check`.
- Added thin verifier coverage and closeout registry coverage.

## Proof

Focused proof:

```bash
npm run process:foundation-core-seed-split-check -- --json
```

Result: pass.

Full verifier:

```bash
npm run foundation:verify -- --json-summary
```

Result: `348/348`.

Dogfood result:

- Old inline seed ownership shape fails.
- Split module shape passes only when:
  - `lib/foundation-core-seed.js` owns the static arrays.
  - `lib/foundation-db.js` imports them.
  - expected seed IDs/counts match.
  - `initFoundationDb()` keeps explicit bootstrap seed posture.

Line count:

- `lib/foundation-db.js`: `13,200 -> 12,629` lines.
- Delta: `-571`.

Seed invariants preserved:

- Foundation users: 12.
- Decisions: 7.
- Parking lot items: 2.
- Open questions: 5.
- Memory status rows: 5.
- Doc source snapshots: 25.

## Not Changed

- No schema changes.
- No live Postgres seed repair path.
- No source-backed live BHAG / Agent Engine snapshot builder movement.
- No source crawl, job runtime, intelligence, shared communications, sales, FUB, or hub behavior movement.
- No hub UI or Marketing Video Lab live wiring.
- No paid-source auth.
- No `MEETING-VAULT-ACL-001 Phase B`.
- No Drive permissions mutation.

## Next

Continue no-auth Foundation cleanup with one bounded slice:

1. Split the source-backed BHAG / Agent Engine snapshot builder out of `lib/foundation-db.js`, or
2. Extract another verifier proof module, or
3. Address the highest remaining nightly-audit P0 that does not require Steve auth.

Do not start hub feature work from this closeout.
