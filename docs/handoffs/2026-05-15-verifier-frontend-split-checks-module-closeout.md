# Verifier Frontend Split Checks Module Closeout

Date: 2026-05-15
Card: `VERIFIER-FRONTEND-SPLIT-CHECKS-MODULE-001`
Closeout key: `verifier-frontend-split-checks-module-v1`

## What Changed

Extracted the already-shipped frontend split verifier checks from `scripts/foundation-verify.mjs` into `lib/foundation-frontend-split-verifier.js`.

## What It Does

The canonical verifier still emits the same frontend split PASS/FAIL rows for the nine frontend split cards, but detailed predicates now live in a focused module with dogfood proof. `scripts/foundation-verify.mjs` delegates through `evaluateFoundationFrontendSplitVerifier(frontendSplitVerifierInput)` and adds one new guard for this verifier split card.

## Why It Matters

`public/foundation.js` is now below the 5,000-line threshold, but the trusted verifier was still over 15,000 lines. Moving a large repeated verifier block out of the monolith reduces false-green risk and makes future proof logic easier to inspect.

## Where It Lives

- `lib/foundation-frontend-split-verifier.js`
- `scripts/process-verifier-frontend-split-checks-module-check.mjs`
- `scripts/foundation-verify.mjs`
- `package.json`
- `docs/process/verifier-frontend-split-checks-module-001-plan.md`
- `docs/process/approvals/VERIFIER-FRONTEND-SPLIT-CHECKS-MODULE-001.json`
- `docs/handoffs/2026-05-15-verifier-frontend-split-checks-module-closeout.md`
- `lib/foundation-build-closeout-overnight-records.js`

## Proof Commands

```bash
node --check lib/foundation-frontend-split-verifier.js scripts/process-verifier-frontend-split-checks-module-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:verifier-frontend-split-checks-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-FRONTEND-SPLIT-CHECKS-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-FRONTEND-SPLIT-CHECKS-MODULE-001.json --closeoutKey=verifier-frontend-split-checks-module-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-FRONTEND-SPLIT-CHECKS-MODULE-001 --closeoutKey=verifier-frontend-split-checks-module-v1
npm run process:foundation-ship -- --card=VERIFIER-FRONTEND-SPLIT-CHECKS-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-FRONTEND-SPLIT-CHECKS-MODULE-001.json --closeoutKey=verifier-frontend-split-checks-module-v1 --commitRef=HEAD
```

## Proof Status

Focused dogfood proof accepts healthy live frontend split fixtures and rejects missing module source, old inline renderer source, missing closeout ownership, and wrong script-order fixtures. `scripts/foundation-verify.mjs` drops from 15,644 to about 15,172 lines and delegates the frontend split checks to the focused module.

## Known Limits

- This does not rewrite the whole verifier.
- This does not split `lib/foundation-db.js`, `server.js`, or another frontend renderer.
- This does not change UI, API, source extraction, hub behavior, auth, Drive permissions, or Meeting Vault behavior.
- Some frontend split constants and source reads still live in the verifier until a later cleanup slice decides whether moving those is worth it.

## Review Next

Continue no-auth Foundation cleanup only if Steve remains unavailable. Good next slices are a small verifier import/source-read cleanup, a DB read seam, or a server route seam with focused proof.
