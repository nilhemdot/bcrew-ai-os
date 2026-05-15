# Verifier Source Contracts Module Closeout - 2026-05-15

## Summary

Closed `VERIFIER-MONOLITH-SPLIT-CONTINUE-002` under `verifier-source-contracts-module-v1`.

This slice extracts the source-contract/signoff verifier checks from `scripts/foundation-verify.mjs` into `lib/foundation-source-contract-verifier.js`. The canonical verifier still emits the same source-contract PASS/FAIL rows; the predicates now live in a focused module with dogfood proof.

## What Changed

- Added `lib/foundation-source-contract-verifier.js`.
- Added `scripts/process-verifier-source-contracts-module-check.mjs`.
- Registered `process:verifier-source-contracts-module-check`.
- Updated `scripts/foundation-verify.mjs` to delegate source-contract/signoff checks to the focused module.
- Added closeout coverage for `verifier-source-contracts-module-v1`.
- Updated current rebuild docs to name the active verifier cleanup sprint.

## Dogfood Proof

The focused proof accepts healthy source-contract fixtures and rejects:

- missing `SRC-OWNERS-001` signoff,
- missing Owners signed-off tab coverage,
- stale source-registry Owners signoff rows,
- stale current-state helper/mirror boundary text.

The proof script is read-only and rejects substring-only proof as insufficient.

## Line Count

- `scripts/foundation-verify.mjs` before this slice: `15,732` lines.
- Focused proof measurement after extraction: `15,714` lines.
- Delta: `-18` lines.

## Proof Commands

```bash
node --check lib/foundation-source-contract-verifier.js scripts/process-verifier-source-contracts-module-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:verifier-source-contracts-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-MONOLITH-SPLIT-CONTINUE-002 --planApprovalRef=docs/process/approvals/VERIFIER-MONOLITH-SPLIT-CONTINUE-002.json --closeoutKey=verifier-source-contracts-module-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-MONOLITH-SPLIT-CONTINUE-002 --closeoutKey=verifier-source-contracts-module-v1
npm run process:foundation-ship -- --card=VERIFIER-MONOLITH-SPLIT-CONTINUE-002 --planApprovalRef=docs/process/approvals/VERIFIER-MONOLITH-SPLIT-CONTINUE-002.json --closeoutKey=verifier-source-contracts-module-v1 --commitRef=HEAD
```

## Known Limits

- This does not rewrite the whole verifier.
- This does not split all remaining source, route, frontend, or DB verifier checks.
- This does not split `lib/foundation-db.js`.
- This does not wire Marketing Video Lab live routes, hub features, paid-source auth, Build Intel extraction, Meeting Vault Phase B, or Drive permission mutation.

## Next

Continue no-auth Foundation cleanup after sprint review. Best next candidates are another bounded verifier module split, the next `lib/foundation-db.js` store boundary, or the highest remaining nightly audit P0 finding.
