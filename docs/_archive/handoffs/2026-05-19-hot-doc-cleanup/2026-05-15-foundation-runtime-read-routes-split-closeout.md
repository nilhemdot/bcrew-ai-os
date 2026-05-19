# Foundation Runtime Read Routes Split Closeout - 2026-05-15

Card: `FOUNDATION-RUNTIME-READ-ROUTES-SPLIT-001`
Closeout key: `foundation-runtime-read-routes-split-v1`
Sprint: `foundation-runtime-read-routes-split-2026-05-15`
Status: closing under Foundation ship gate

## What Changed

Extracted the read-only Foundation runtime status route cluster from `server.js` into `lib/foundation-runtime-read-routes.js`:

- `GET /api/foundation/jobs`
- `GET /api/foundation/active-processes`
- `GET /api/foundation/llm-runtime`
- `GET /api/foundation/extraction-control`

`server.js` now delegates through `registerFoundationRuntimeReadRoutes(app, deps)`. The runtime job-control mutation routes remain in `server.js`:

- `POST /api/foundation/jobs/:jobKey/control`
- `POST /api/foundation/job-runs/:runId/stop`
- `POST /api/foundation/jobs/:jobKey/decommission`

## Why It Matters

This keeps runtime diagnostics available while reducing the server monolith. The slice is deliberately no-auth and no-feature: it moves read-route ownership, proves payload shape and route budgets, and leaves mutation behavior for a separate reviewed card.

## Dogfood Proof

The focused proof recreates the route-split failure modes and rejects them:

- missing runtime read-route module
- old inline server route remaining in `server.js`
- missing registrar call from `server.js`
- runtime-control mutation route leaking into the read-route module

It also probes the moved GET routes without POSTing runtime job-control mutations.

Latest focused route measurements:

- `/api/foundation/jobs?limit=1`: HTTP 200, under 5 seconds, under 1 MB
- `/api/foundation/active-processes`: HTTP 200, under 5 seconds, under 1 MB
- `/api/foundation/llm-runtime?limit=1`: HTTP 200, under 5 seconds, under 1 MB
- `/api/foundation/extraction-control?limit=1`: HTTP 200, under 5 seconds, under 1 MB

`server.js` line count dropped from `6,831` to about `6,779` lines for this slice.

## Proof Commands

```bash
node --check lib/foundation-runtime-read-routes.js scripts/process-foundation-runtime-read-routes-split-check.mjs server.js scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:foundation-runtime-read-routes-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=FOUNDATION-RUNTIME-READ-ROUTES-SPLIT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-RUNTIME-READ-ROUTES-SPLIT-001.json --closeoutKey=foundation-runtime-read-routes-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=FOUNDATION-RUNTIME-READ-ROUTES-SPLIT-001 --closeoutKey=foundation-runtime-read-routes-split-v1
npm run process:foundation-ship -- --card=FOUNDATION-RUNTIME-READ-ROUTES-SPLIT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-RUNTIME-READ-ROUTES-SPLIT-001.json --closeoutKey=foundation-runtime-read-routes-split-v1 --commitRef=HEAD
```

## Not Done

- This does not change runtime job-control, stop, or decommission mutation behavior.
- This does not build Runtime Health UI.
- This does not wire Marketing Video Lab or any hub feature.
- This does not add source extraction or paid-source auth.
- This does not finish the remaining `server.js`, `scripts/foundation-verify.mjs`, or `lib/foundation-db.js` monolith cleanup.

## Next

Stop at sprint review unless Steve remains unavailable. If continuing overnight, only take another bounded no-auth Foundation cleanup card with a fresh plan, Plan Critic pass, and dogfood proof.
