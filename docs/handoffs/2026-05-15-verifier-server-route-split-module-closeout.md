# Verifier Server Route Split Module Closeout - 2026-05-15

## Summary

Closed `VERIFIER-SERVER-ROUTE-SPLIT-MODULE-001` under `verifier-server-route-split-module-v1`.

This slice extracts the server-route split verifier checks from `scripts/foundation-verify.mjs` into `lib/foundation-server-route-split-verifier.js`. The canonical verifier still emits the same route-split PASS/FAIL rows; the predicates now live in a focused module with dogfood proof.

## What Changed

- Added `lib/foundation-server-route-split-verifier.js`.
- Added `scripts/process-verifier-server-route-split-module-check.mjs`.
- Registered `process:verifier-server-route-split-module-check`.
- Updated `scripts/foundation-verify.mjs` to delegate server-route split checks to the focused module.
- Added closeout coverage for `verifier-server-route-split-module-v1`.
- Updated current rebuild docs to name the active verifier cleanup sprint.

## Dogfood Proof

The focused proof accepts the healthy shipped server route split state and rejects:

- missing route module ownership,
- old inline server route ownership,
- missing server registrar delegation,
- moved out-of-scope routes,
- weak substring-only proof scripts.

The proof script is read-only and rejects substring-only proof as insufficient.

## Line Count

- `scripts/foundation-verify.mjs` before this slice: `15,980` lines.
- Focused proof measurement after extraction: `15,699` lines.
- Delta: `-281` lines.

## Proof Commands

```bash
node --check lib/foundation-server-route-split-verifier.js scripts/process-verifier-server-route-split-module-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:verifier-server-route-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-SERVER-ROUTE-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-SERVER-ROUTE-SPLIT-MODULE-001.json --closeoutKey=verifier-server-route-split-module-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-SERVER-ROUTE-SPLIT-MODULE-001 --closeoutKey=verifier-server-route-split-module-v1
npm run process:foundation-ship -- --card=VERIFIER-SERVER-ROUTE-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-SERVER-ROUTE-SPLIT-MODULE-001.json --closeoutKey=verifier-server-route-split-module-v1 --commitRef=HEAD
```

## Known Limits

- This does not rewrite the whole verifier.
- This does not split all remaining route, frontend, source, or DB verifier checks.
- This does not change route behavior, auth/session behavior, source contracts, or hub APIs.
- This does not split `lib/foundation-db.js`.
- This does not wire Marketing Video Lab live routes, hub features, paid-source auth, Build Intel extraction, Meeting Vault Phase B, or Drive permission mutation.

## Next

Continue no-auth Foundation cleanup after sprint review. Best next candidates are another bounded verifier module split, the next `lib/foundation-db.js` store boundary, or the highest remaining nightly audit P0 finding.
