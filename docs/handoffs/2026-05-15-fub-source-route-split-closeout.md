# FUB-SOURCE-ROUTE-SPLIT-001 Closeout

Date: 2026-05-15
Card: `FUB-SOURCE-ROUTE-SPLIT-001`
Closeout key: `fub-source-route-split-v1`

## What Changed

Extracted the FUB source-control route cluster from `server.js` into `lib/fub-source-routes.js`.

Moved route ownership:

- `GET /api/fub/health`
- `GET /api/fub/person`
- `GET /api/fub/lead-sources`
- `POST /api/fub/lead-sources/refresh`
- `PATCH /api/fub/lead-sources`
- `POST /api/fub/request`

## What It Does

`server.js` now delegates through `registerFubSourceRoutes(app, deps)`. The FUB route module owns the handlers and route-specific dogfood proof while preserving the same validation behavior and dependency wiring.

## Why It Matters

`server.js` was still over 7,000 lines. This removes another coherent route cluster without building a feature, changing FUB business logic, or calling live FUB refresh in proof.

## Where It Lives

- `lib/fub-source-routes.js`
- `scripts/process-fub-source-route-split-check.mjs`
- `server.js`
- `package.json`
- `scripts/foundation-verify.mjs`
- `docs/process/fub-source-route-split-001-plan.md`
- `docs/process/approvals/FUB-SOURCE-ROUTE-SPLIT-001.json`
- `lib/foundation-build-closeout-overnight-records.js`

## Proof Commands

```bash
node --check lib/fub-source-routes.js scripts/process-fub-source-route-split-check.mjs server.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:fub-source-route-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=FUB-SOURCE-ROUTE-SPLIT-001 --planApprovalRef=docs/process/approvals/FUB-SOURCE-ROUTE-SPLIT-001.json --closeoutKey=fub-source-route-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=FUB-SOURCE-ROUTE-SPLIT-001 --closeoutKey=fub-source-route-split-v1
npm run process:foundation-ship -- --card=FUB-SOURCE-ROUTE-SPLIT-001 --planApprovalRef=docs/process/approvals/FUB-SOURCE-ROUTE-SPLIT-001.json --closeoutKey=fub-source-route-split-v1 --commitRef=HEAD
```

## Dogfood

Focused proof accepts the healthy split and rejects:

- missing FUB route module ownership
- old inline FUB route markers still present in `server.js`
- missing `registerFubSourceRoutes(app)` delegation
- mutating proof script content

The live route probes are validation-only and return `400` for invalid inputs, staying under the 1,000ms / 25KB route budget. They do not call live FUB refresh or success-path lead-source sync.

## Known Limits

- This does not change FUB business logic.
- This does not call live FUB refresh in proof.
- This does not wire Marketing Video Lab live routes.
- This does not change Sales/Ops/Marketing Hub UI.
- This does not touch auth/session routes.
- `server.js`, `scripts/foundation-verify.mjs`, and `lib/foundation-db.js` still need more cleanup slices.

## Review Next

Continue no-auth Foundation cleanup only if Steve remains unavailable. Good next slices are another small server route cluster, a verifier module split, or a DB read/write seam with focused proof.
