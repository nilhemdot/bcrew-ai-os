# FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001 Closeout

Date: 2026-05-19
Card: `FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001`
Closeout key: `foundation-client-current-state-extract-v1`

## What Shipped

- Added reusable proof for the Foundation client Current State extraction invariant.
- Updated the nightly code-quality audit so it does not reopen the stale `foundation-client-current-state-monolith` finding when the extractor proof passes.
- Updated the May 19 deep-audit route for `foundation-client-current-state-monolith` from scoped to done with this closeout key.
- Added a focused proof script and package command.
- Closed the card and advanced Current Sprint to `BUILD-LOG-API-CACHE-AND-SLIM-001`.

## Proof

- `node --check lib/foundation-client-current-state-extract.js scripts/process-foundation-client-current-state-extract-check.mjs`
- `npm run process:foundation-client-current-state-extract-check -- --close-card --json`
- `npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001 --planApprovalRef=docs/process/approvals/FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001.json --closeoutKey=foundation-client-current-state-extract-v1 --commitRef=HEAD`

## Key Result

`public/foundation.js` no longer owns the Current State renderer. `public/foundation-current-state-renderers.js` owns the renderer functions, remains below the V1 line budget, and loads in the required script order.

The old failure mode is now dogfooded:

- root-owned `renderCurrentState` fails
- missing Current State module fails
- wrong script order fails

## Not Shipped

- No Foundation Overview redesign.
- No Current State UI rewrite.
- No Foundation API contract change.
- No source/value expansion.
- No private/provider/Drive permission/credential mutation.

## Next

Continue `BUILD-LOG-API-CACHE-AND-SLIM-001`.
