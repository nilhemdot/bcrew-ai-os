# Foundation Source Route Split Closeout

Date: 2026-05-15
Sprint: `source-route-split-2026-05-15`
Closeout key: `source-route-split-v1`
Card: `SOURCE-ROUTE-SPLIT-001`

## What Changed

Extracted the Foundation source/control read-route cluster from `server.js` into `lib/foundation-source-routes.js`.

The moved routes are:

- `GET /api/source-of-truth`
- `GET /api/foundation/source-lifecycle`
- `GET /api/foundation/marketing-source-map`
- `GET /api/foundation/brand-stack`
- `GET /api/foundation/tier-behavioral-completion`
- `GET /api/foundation/verification-runs`
- `GET /api/foundation/per-user-changelog`
- `GET /api/foundation/restricted-decision-queue`
- `GET /api/foundation/source-coverage-closeout`
- `GET /api/foundation/source-extraction-coverage`
- `GET /api/foundation/source-maturity-grid`
- `GET /api/foundation/source-connector-matrix`
- `GET /api/foundation/connector-credential-preflight`
- `GET /api/foundation/source-hub-routing-matrix`

`server.js` now delegates this cluster through `registerFoundationSourceRoutes(app, deps)`.

## Why It Matters

`server.js` is still a monolith, but it is now materially smaller and has clearer route ownership. Source-health and source-control fixes can land in a focused module instead of expanding the server file.

This is cleanup work, not a new feature lane. It does not change source truth, run extraction, connect paid sources, or wire hub tools.

## Dogfood Proof

Focused proof command:

```bash
npm run process:source-route-split-check -- --json
```

Result: passed.

Proof highlights:

- all 14 moved routes returned `2xx`
- worst measured route was `/api/foundation/source-lifecycle` at `371ms` / `622,389B`
- `/api/source-of-truth` measured `30ms` / `134,033B`
- `/api/foundation/source-hub-routing-matrix` measured `284ms` / `158,559B`
- old inline `app.get(...)` markers for the moved routes are absent from `server.js`
- focused proof script is read-only

## Where It Lives

- `lib/foundation-source-routes.js`
- `server.js`
- `scripts/process-source-route-split-check.mjs`
- `package.json`
- `scripts/foundation-verify.mjs`
- `lib/foundation-build-closeout-overnight-records.js`
- `docs/process/source-route-split-001-plan.md`
- `docs/process/approvals/SOURCE-ROUTE-SPLIT-001.json`
- `docs/handoffs/2026-05-15-source-route-split-closeout.md`

## Known Limits

- does not split every `server.js` route
- does not touch auth/session routes
- does not wire Marketing Video Lab live routes
- does not build hub feature UI
- does not shrink `scripts/foundation-verify.mjs`, `public/foundation.js`, or `lib/foundation-db.js`

## Recommended Next

Continue no-auth Foundation cleanup. Best next candidates:

1. split the Build Intel route cluster out of `server.js`
2. split another verifier module out of `scripts/foundation-verify.mjs`
3. carve the next clean `lib/foundation-db.js` boundary
