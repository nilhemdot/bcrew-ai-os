# DB-SEED-001 Closeout

Date: 2026-05-15
Card: `DB-SEED-001`
Sprint: `db-seed-2026-05-15`
Closeout key: `db-seed-v1`

## What Changed

- Extracted the static backlog seed literal from `lib/foundation-db.js` into `lib/foundation-backlog-seed.js`.
- Added `lib/foundation-db-seed-governance.js` to classify seed/live backlog drift as report-only governance.
- Added `scripts/process-db-seed-check.mjs` as the focused read-only proof.
- Added thin `foundation:verify` coverage for the seed split and governance dogfood.
- Updated verifier/follow-up checks that previously assumed backlog seed strings lived inside `foundation-db.js`.

## Why It Matters

Live Postgres/API remains operational truth after bootstrap. The seed file is now explicitly bootstrap/default doctrine. Seed/live drift is visible, classified, and report-only by default instead of being treated like something `initFoundationDb()`, verifier, or startup should silently repair.

## Dogfood Proof

The focused proof recreates the failure mode:

- seed says a card is `scoped`
- live truth says the card is `done`
- result is `live_mutable_drift_report_only`
- `wouldWriteByDefault` remains `false`

It also proves a missing live row becomes `bootstrap_candidate`, not an automatic write from a read/check path.

## Proof

```bash
node --check lib/foundation-backlog-seed.js lib/foundation-db-seed-governance.js scripts/process-db-seed-check.mjs lib/foundation-db.js scripts/foundation-verify.mjs
npm run process:db-seed-check -- --json
npm run foundation:verify -- --json-summary
```

Observed proof:

- `process:db-seed-check`: pass
- `foundation:verify`: 345/345
- `foundation-db.js`: 17,852 lines before this split, 13,200 lines after the seed extraction
- live seed governance report: 358 seed rows, 358 live rows, 62 report-only findings

## Known Limits

- This does not rewrite every seed table.
- This does not create a runtime migration framework.
- This does not auto-sync seed truth into live backlog.
- This does not finish splitting `foundation-db.js`; it removes the largest static backlog seed block only.
- This does not wire Marketing Video Lab live routes, hub UI, Build Intel extraction, paid-source auth, Meeting Vault Phase B, or Drive permission mutation.

## Review Next

Continue no-auth Foundation cleanup. Best next options are another bounded Foundation DB store split, a verifier module split, or source-count dynamic cleanup under `SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001`.
