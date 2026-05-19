# HUB-READ-ROUTES-SPLIT-001 Closeout

Date: 2026-05-15
Sprint: `foundation-server-monolith-closeout-2026-05-15`
Closeout key: `hub-read-routes-split-v1`

## What Changed

The read-only hub route cluster moved out of `server.js` into `lib/hub-read-routes.js`:

- `GET /api/foundation-hub`
- `GET /api/foundation/current-sprint`
- `GET /api/ops-hub`
- `GET /api/sales-hub`

`server.js` now delegates through `registerHubReadRoutes(app, deps)`. Sales write routes remain in `server.js`.

## Why It Matters

These routes are high-traffic operator surfaces. Moving them behind a focused registrar reduces `server.js` blast radius without changing hub behavior, payload contracts, auth posture, or write paths.

## Proof

- `node --check lib/hub-read-routes.js scripts/process-hub-read-routes-split-check.mjs server.js`
- `npm run process:hub-read-routes-split-check -- --json`

Focused proof passed:

- approval file validates
- live backlog card is in executing/done lane
- Current Sprint has the card in Building Now / Done
- durable Plan Critic pass row exists
- module owns the four hub read route strings
- `server.js` delegates through `registerHubReadRoutes(app, deps)`
- `server.js` no longer owns the moved hub read handlers
- Sales write routes remain in `server.js`
- proof script is read-only
- dogfood rejects missing module, old inline routes, missing registrar, moved Sales write route, and weak proof
- live route probes pass shape and budget checks

Measured focused route probes:

- `/api/foundation-hub`: 200, summary mode, about 0.53 MB, ~0.1s warm
- `/api/foundation/current-sprint`: 200, healthy Current Sprint, about 54 KB, ~0.36s
- `/api/ops-hub`: 200, Ops payload with source outage metadata, about 122 KB, ~5.3s
- `/api/sales-hub`: 200, Sales payload, about 0.64 MB, warm cache ~0.01s

`server.js` line count for this slice: `6,592 -> 6,116`.

## Not Changed

- No Sales write route moved.
- No hub UI changed.
- No Marketing Video Lab live route wiring.
- No source extraction or paid-source auth.
- No payload expansion.
- No broad server rewrite.

## Next

Continue the Server Monolith Closeout sprint with `STRATEGY-SHARED-COMMS-ROUTES-SPLIT-001`, then `FOUNDATION-WRITE-ROUTES-SPLIT-001`, unless Steve stops for review.
