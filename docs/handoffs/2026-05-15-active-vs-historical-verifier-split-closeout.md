# Active vs Historical Verifier Split Closeout

Date: 2026-05-15
Sprint: `active-vs-historical-verifier-split-2026-05-15`
Card: `ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001`
Closeout key: `active-vs-historical-verifier-split-v1`

## What Changed

Added a focused verifier helper that separates active live-truth assertions from historical closeout assertions.

- `lib/foundation-active-historical-verifier.js` owns the active/historical helper functions and dogfood proof.
- `scripts/process-active-vs-historical-verifier-split-check.mjs` is the read-only focused proof.
- `scripts/foundation-verify.mjs` has thin delegated coverage.
- `package.json` registers `process:active-vs-historical-verifier-split-check`.
- `lib/foundation-build-closeout-overnight-records.js` records this closeout for Recent Builds / historical proof.

## Why It Matters

The verifier should not let stale active truth pass because an old sprint has a valid closeout. Active truth and historical evidence are different proof modes:

- active mode proves the current live value is current
- historical mode proves a done backlog card has a matching verified closeout

This reduces false-green risk and false-history blockers before broader verifier and DB cleanup.

## Dogfood Proof

`npm run process:active-vs-historical-verifier-split-check -- --json` passed.

The proof recreates the audit failure mode:

- active current value passes when expected and actual match
- stale active value fails even with verified historical closeout evidence present
- missing active value fails closed
- historical done-card plus matching verified closeout passes
- historical missing closeout fails
- historical wrong closeout key fails
- historical card-not-done fails

## Proof Commands

```bash
node --check lib/foundation-active-historical-verifier.js scripts/process-active-vs-historical-verifier-split-check.mjs scripts/foundation-verify.mjs
npm run process:active-vs-historical-verifier-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001 --planApprovalRef=docs/process/approvals/ACTIVE-VS-HISTORICAL-VERIFIER-SPLIT-001.json --closeoutKey=active-vs-historical-verifier-split-v1 --commitRef=HEAD
```

## Known Limits

- This migrates one verifier reliability cluster, not every historical verifier check.
- This does not remove every old `activeSprintAtOrPast` call.
- This does not rewrite the verifier monolith.
- This does not start DB seed split.
- This does not wire Marketing Video Lab live routes, build hub feature UI, add paid-source auth, run Build Intel extraction, run `MEETING-VAULT-ACL-001 Phase B`, or mutate Drive permissions.

## Next

Continue no-auth Foundation cleanup after sprint review/rollover. Best next candidates are `DB-SEED-001` if we want to tackle bootstrap/live-seed truth, or another verifier/foundation-db split if we want a smaller low-auth cleanup slice first.
