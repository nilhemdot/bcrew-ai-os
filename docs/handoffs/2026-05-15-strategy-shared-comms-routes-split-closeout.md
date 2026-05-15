# STRATEGY-SHARED-COMMS-ROUTES-SPLIT-001 Closeout

Date: 2026-05-15
Sprint: `foundation-server-monolith-closeout-2026-05-15`
Closeout key: `strategy-shared-comms-routes-split-v1`

## What Changed

The Strategy/shared-communications route cluster moved out of `server.js` into `lib/strategy-shared-comms-routes.js`:

- shared communications archive, coverage, candidates, synthesis, and candidate review/apply routes
- Strategy prework, goal truth, operating truth, v2 payload, action routes, advisor offline route, and action-route review
- Foundation Action Review read and guarded review route

`server.js` now delegates through `registerStrategySharedCommsRoutes(app, deps)`.

## Why It Matters

Strategy Hub, Action Review, and Shared Communications review now have a focused route owner. This reduces `server.js` blast radius before the higher-risk Foundation write-route split, while preserving current behavior and keeping direct Foundation/Sales/Agent Feedback routes out of scope.

## Proof

- `node --check lib/strategy-shared-comms-routes.js scripts/process-strategy-shared-comms-routes-split-check.mjs server.js`
- `npm run process:strategy-shared-comms-routes-split-check -- --json`

Focused proof passed:

- approval file validates
- live backlog card is in executing/done lane
- Current Sprint has the card in Building Now / Done
- durable Plan Critic pass row exists
- module owns the moved Strategy/shared-comms route strings
- `server.js` delegates through `registerStrategySharedCommsRoutes(app, deps)`
- `server.js` no longer owns moved route handler strings
- direct Foundation write routes remain in `server.js`
- Intelligence evidence, Sales, and Agent Feedback routes remain in `server.js`
- proof script is read-only and only uses safe invalid POST probes
- dogfood rejects missing module, old inline routes, missing registrar, direct Foundation write leakage, and weak proof
- moved read routes return expected payload shapes and stay under budget
- invalid POST probes fail before mutation

Measured focused route probes:

- `/api/shared-communications/archive?limit=1`: 200, about 1.6 KB, ~0.07s
- `/api/shared-communications/coverage`: 200, about 8.5 KB, ~0.19s
- `/api/shared-communications/candidates?limit=1`: 200, about 1.8 KB, ~0.01s
- `/api/shared-communications/synthesis?limit=1&itemLimit=1`: 200, about 390 KB, ~0.02s
- `/api/strategic-execution/goal-truth`: 200, about 7.5 KB, ~1.1s
- `/api/strategic-execution/operating-truth`: 200, about 24 KB, ~0.6s
- `/api/strategic-execution/v2`: 200, about 75 KB, ~0.24s
- `/api/strategic-execution/action-routes`: 200, about 268 KB, ~0.03s
- `/api/foundation/action-review`: 200, about 270 KB, ~0.04s

Safe invalid POST probes returned expected fail-closed statuses: 404 for missing action routes, 400 for invalid shared-candidate payloads/actions, and 423 for the intentionally offline Strategy Advisor.

`server.js` line count for this slice: `6,115 -> 5,447`.

## Not Changed

- No direct Foundation backlog/decision/question/doc-update route moved.
- No Sales route moved.
- No Agent Feedback route moved.
- No `/api/intelligence/evidence` route moved.
- No Marketing Video Lab route wired.
- No source extraction or paid-source auth.
- No hub UI changed.

## Next

Continue the Server Monolith Closeout sprint with `FOUNDATION-WRITE-ROUTES-SPLIT-001`, then `AGENT-FEEDBACK-ROUTES-SPLIT-001`, unless Steve stops for review.
