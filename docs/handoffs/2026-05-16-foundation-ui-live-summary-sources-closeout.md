# FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001 Closeout

Date: 2026-05-16

Closeout key: `foundation-ui-live-summary-sources-v1`

## What Shipped

- Added `lib/foundation-current-state-summary.js` as the source-backed Current State summary payload contract.
- Added `currentStateSummary` to `/api/foundation-hub` default and full payloads.
- Updated `public/foundation-current-state-renderers.js` to render system maturity rows from `hub.currentStateSummary.surfaceRows`.
- Added a visible degraded fallback when the payload is unavailable.
- Added `scripts/process-foundation-ui-live-summary-sources-check.mjs` and `process:foundation-ui-live-summary-sources-check`.
- Added nightly audit scan coverage for `public/foundation-current-state-renderers.js`.
- Added thin root-verifier coverage and Recent Work closeout registration.

## Dogfood Proof

The focused proof mutates synthetic KPI/current-sprint payload inputs and proves the Current State row copy changes from payload data without editing frontend code. It also proves the previous frontend-owned static surface row array is gone and the active hardcoded-summary detector is clean.

## Boundaries

This did not change KPI data, source contracts, DB schema, auth, external integrations, Marketing Video Lab wiring, Canva asset-library behavior, paid-source auth, Build Intel extraction, Meeting Vault Phase B, or Drive permissions.

## Proof

- `node --check lib/foundation-current-state-summary.js public/foundation-current-state-renderers.js scripts/process-foundation-ui-live-summary-sources-check.mjs scripts/foundation-verify.mjs server.js lib/hub-read-routes.js`
- `npm run process:foundation-ui-live-summary-sources-check -- --json` passed `20/20`, including live `/api/foundation-hub` at about `84ms` / `544 KB`.
- `npm run process:code-quality-nightly-audit-check -- --json` passed with the active current-summary detector clean.
- `npm run backlog:hygiene -- --json` passed with `0` findings across `525` cards.
- `npm run foundation:verify -- --json-summary` passed `389/389`.
- `npm run process:ship-check -- --card=FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001 --planApprovalRef=docs/process/approvals/FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001.json --closeoutKey=foundation-ui-live-summary-sources-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001 --closeoutKey=foundation-ui-live-summary-sources-v1`
- `npm run process:foundation-ship -- --card=FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001 --planApprovalRef=docs/process/approvals/FOUNDATION-UI-LIVE-SUMMARY-SOURCES-001.json --closeoutKey=foundation-ui-live-summary-sources-v1 --commitRef=HEAD`

## Next

Continue no-auth Foundation cleanup. Good next slices are frontend DOM budgets, another verifier proof-domain split, source-of-truth latency cleanup if it regresses, or a separate cache-policy card if the measured no-store posture becomes an active blocker.
