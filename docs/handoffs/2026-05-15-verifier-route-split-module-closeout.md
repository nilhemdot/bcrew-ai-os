# Verifier Route Split Module Closeout

Date: 2026-05-15

Sprint: `verifier-route-split-module-2026-05-15`

Card: `VERIFIER-MONOLITH-SPLIT-CONTINUE-001`

Closeout key: `verifier-route-split-module-v1`

## What Changed

Moved the server/source/Build Intel route-split verifier checks out of the canonical verifier body and into `lib/foundation-route-split-verifier.js`.

`scripts/foundation-verify.mjs` still emits the same three ID-named checks:

- `SERVER-ROUTE-SPLIT-001 extracts Foundation operator routes from server.js without behavior drift`
- `SOURCE-ROUTE-SPLIT-001 extracts Foundation source/control routes from server.js without behavior drift`
- `BUILD-INTEL-ROUTE-SPLIT-001 extracts Foundation Build Intel read routes from server.js without behavior drift`

The detailed predicates now live in a focused module instead of another inline verifier block.

## Why It Matters

`scripts/foundation-verify.mjs` was nearly 15,000 lines and kept getting larger every time we shipped cleanup. That is the monolith failure pattern Steve called out. This split keeps the verifier authoritative while giving route-split proof a reusable module boundary.

## Where It Lives

- `lib/foundation-route-split-verifier.js`
- `scripts/process-verifier-route-split-module-check.mjs`
- `scripts/foundation-verify.mjs`
- `package.json`
- `docs/process/verifier-monolith-split-continue-001-plan.md`
- `docs/process/approvals/VERIFIER-MONOLITH-SPLIT-CONTINUE-001.json`
- `lib/foundation-build-closeout-overnight-records.js`

## Proof

```bash
node --check lib/foundation-route-split-verifier.js scripts/process-verifier-route-split-module-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:verifier-route-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=VERIFIER-MONOLITH-SPLIT-CONTINUE-001 --planApprovalRef=docs/process/approvals/VERIFIER-MONOLITH-SPLIT-CONTINUE-001.json --closeoutKey=verifier-route-split-module-v1 --commitRef=HEAD
```

## Dogfood

The focused proof recreates the failure class instead of checking strings only:

- healthy route-split fixtures pass
- old inline route markers fail
- missing module route markers fail
- wrong Build Intel payload shape fails
- missing closeout ownership fails

## Known Limits

- This does not rewrite the full verifier.
- This does not split `lib/foundation-db.js` or `public/foundation.js`.
- This does not wire Marketing Video Lab live routes.
- This does not build hub UI, paid-source auth, Build Intel extraction, Drive permission mutation, or Meeting Vault Phase B.

## Review Next

Continue no-auth Foundation cleanup. Good next work is another bounded verifier proof module, a `foundation-db.js` store boundary, or a `public/foundation.js` route/cache extraction.
