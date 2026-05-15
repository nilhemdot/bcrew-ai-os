# AUTH-ROUTES-SPLIT-001 Closeout

Date: 2026-05-15
Card: `AUTH-ROUTES-SPLIT-001`
Sprint: `foundation-server-monolith-closeout-2026-05-15`
Closeout key: `auth-routes-split-v1`

## What Changed

Extracted the auth/session/static route cluster from `server.js` into `lib/auth-routes.js`.

Moved route and middleware ownership:

- security headers middleware
- API request logging middleware
- JSON parser middleware
- access-context attachment middleware
- `GET /login`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `GET /api/auth/session`
- `POST /api/auth/logout`
- direct `.html` redirects
- static public asset serving

## What It Does

`server.js` now delegates through `registerAuthRoutes(app, deps)`. The auth route module owns the handlers and route-specific dogfood proof while preserving existing auth providers, cookie behavior, local-dev session behavior, no-store login/static behavior, and direct HTML redirects.

## Why It Matters

`server.js` was still above the 5,000-line warning gate and owned high-blast-radius auth/static routing inline. This removes a coherent route cluster without changing auth semantics, hub UI, source extraction, or Marketing Video Lab wiring.

## Where It Lives

- `lib/auth-routes.js`
- `scripts/process-auth-routes-split-check.mjs`
- `server.js`
- `package.json`
- `scripts/foundation-verify.mjs`
- `docs/process/auth-routes-split-001-plan.md`
- `docs/process/approvals/AUTH-ROUTES-SPLIT-001.json`
- `lib/foundation-build-closeout-overnight-records.js`

## Proof Commands

```bash
node --check lib/auth-routes.js scripts/process-auth-routes-split-check.mjs server.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:auth-routes-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=AUTH-ROUTES-SPLIT-001 --planApprovalRef=docs/process/approvals/AUTH-ROUTES-SPLIT-001.json --closeoutKey=auth-routes-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=AUTH-ROUTES-SPLIT-001 --closeoutKey=auth-routes-split-v1
npm run process:foundation-ship -- --card=AUTH-ROUTES-SPLIT-001 --planApprovalRef=docs/process/approvals/AUTH-ROUTES-SPLIT-001.json --closeoutKey=auth-routes-split-v1 --commitRef=HEAD
```

## Dogfood

Focused proof accepts the healthy split and rejects:

- missing auth route module ownership
- old inline login route still present in `server.js`
- old inline session route still present in `server.js`
- missing `registerAuthRoutes(app)` delegation
- weak proof that only checks markers

Live route probes verify `/login`, `/api/auth/session`, `/api/auth/logout`, invalid password login, missing Google credential handling, direct HTML redirect, and static Foundation JS serving. The probes stay under the 2,000ms / 1MB route budget.

## Known Limits

- This does not rewrite auth providers.
- This does not change cookie semantics.
- This does not wire Marketing Video Lab live routes.
- This does not change Sales/Ops/Marketing/Strategy/Docs/Agent Feedback UI.
- `server.js`, `scripts/foundation-verify.mjs`, and `lib/foundation-db.js` still need more cleanup slices.

## Review Next

Continue `foundation-server-monolith-closeout-2026-05-15` with `HUB-READ-ROUTES-SPLIT-001`, then shared comms/strategy routes, then Foundation write routes, then agent-feedback routes.
