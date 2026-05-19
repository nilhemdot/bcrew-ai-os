# Server Monolith Closeout Summary - 2026-05-15

## Status

The Server Monolith Closeout route-split run is closed for the current pass.

`server.js` is now under the active architecture-risk line at about `4,800` lines. This summary does not replace the per-card closeouts; it ties them together so the next Foundation builder can see the whole pass before starting verifier work.

## Cards Closed

- `SERVER-ROUTE-SPLIT-001` under `server-route-split-v1`
- `FUB-SOURCE-ROUTE-SPLIT-001` under `fub-source-route-split-v1`
- `FOUNDATION-RUNTIME-READ-ROUTES-SPLIT-001` under `foundation-runtime-read-routes-split-v1`
- `APP-PAGE-ROUTES-SPLIT-001` under `app-page-routes-split-v1`
- `AUTH-ROUTES-SPLIT-001` under `auth-routes-split-v1`
- `HUB-READ-ROUTES-SPLIT-001` under `hub-read-routes-split-v1`
- `STRATEGY-SHARED-COMMS-ROUTES-SPLIT-001` under `strategy-shared-comms-routes-split-v1`
- `FOUNDATION-WRITE-ROUTES-SPLIT-001` under `foundation-write-routes-split-v1`
- `AGENT-FEEDBACK-ROUTES-SPLIT-001` under `agent-feedback-routes-split-v1`

## What Changed

Route ownership moved out of `server.js` by coherent domain boundaries:

- Foundation operator reads
- FUB source routes
- Foundation runtime read routes
- app page and fallback routes
- auth/session/static routes
- hub read routes
- Strategy/shared communications routes
- direct Foundation write routes
- public Agent Feedback session/submit routes

`server.js` remains the app composition point, but no longer owns those route bodies inline.

## Why It Matters

This pass reduces the highest-blast-radius monolith that could break Foundation and hubs together. The split is behavior-preserving route extraction, not feature work.

The operating rule proven by this pass: large shared files should be split by natural ownership boundaries before more features are added to them.

## Proof Pattern

Each card had:

- a focused process check
- dogfood proof that old inline ownership or missing registrar fails
- live route probes where route behavior moved
- `node --check` coverage
- backlog hygiene
- full `foundation:verify`
- process ship/fanout proof where required

## Known Limits

- This does not mean all Foundation code is clean.
- `scripts/foundation-verify.mjs` remains over the architecture-risk line and is the next cleanup target.
- `lib/foundation-db.js` remains over the architecture-risk line and still needs more splits.
- This did not wire Marketing Video Lab routes or Canva writes.
- This did not build Build Intel extraction or hub feature work.

## Next

Start verifier monolith cleanup before Build Intel or hub expansion. The first verifier split should keep `foundation:verify` as the aggregate runner, extract one coherent proof domain at a time, and include dogfood proof that old inline ownership or weak proof fails.
