# LIVE-TRUTH-VERIFY-DECOUPLE-001 Closeout

Date: 2026-05-15
Closeout key: `live-truth-verify-decouple-v1`
Sprint ID: `live-truth-verify-decouple-2026-05-15`
Status: closed pending final post-commit ship gate

## What Changed

- Added `lib/live-truth-verify-decouple.js`.
- Updated `lib/code-quality-nightly-audit.js` to classify current-sprint literals by local `liveTruthPosture`.
- Added explicit historical/bootstrap posture labels for the eight 2026-05-14 audit refs.
- Added `scripts/process-live-truth-verify-decouple-check.mjs`.
- Added `process:live-truth-verify-decouple-check` to `package.json`.
- Added thin verifier coverage in `scripts/foundation-verify.mjs`.

## What It Does

The nightly code-quality audit no longer treats explicitly labeled historical closeout proof or bootstrap defaults as active Current Sprint truth. Unlabeled active current-sprint literals still fail as P0.

## Why It Matters

The morning audit should catch real drift without making Steve chase old historical evidence. This keeps active command truth tied to live DB/API state while preserving closed-sprint proof where it is clearly labeled.

## Dogfood Proof

Focused proof:

```bash
npm run process:live-truth-verify-decouple-check -- --json
```

Expected behavior:

- current audit has zero P0 `hardcoded-current-sprint-truth` findings
- eight baseline refs classify as historical/bootstrap
- unlabeled synthetic active current-sprint literal fails as P0
- labeled historical/bootstrap snippets pass without P0
- focused proof script stays read-only

## Proof Commands

```bash
node --check lib/live-truth-verify-decouple.js lib/code-quality-nightly-audit.js scripts/process-live-truth-verify-decouple-check.mjs scripts/foundation-verify.mjs
npm run process:live-truth-verify-decouple-check -- --json
npm run process:code-quality-nightly-audit-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=LIVE-TRUTH-VERIFY-DECOUPLE-001 --planApprovalRef=docs/process/approvals/LIVE-TRUTH-VERIFY-DECOUPLE-001.json --closeoutKey=live-truth-verify-decouple-v1 --commitRef=HEAD
```

## Known Limits

- This does not remove every old sprint ID from historical proof scripts.
- This does not change active Current Sprint DB/API truth.
- This does not address source-count, KPI year, or Foundation UI live-summary hardcodes.
- This does not wire Marketing Video Lab live routes.
- This does not build hub feature UI, paid-source auth, Build Intel extraction, Meeting Vault Phase B, or Drive permission mutation.

## Review Next

Continue no-auth Foundation cleanup with another verifier proof-module split or another bounded `lib/foundation-db.js` store split. Keep source-count dynamic cleanup queued separately under `SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001`.
