# SOURCE-012 Closeout

Closeout key: `source-012-source-connector-live-layers-v1`

## Summary

`SOURCE-012` makes source contracts and connectors visible as separate live layers.

The key rule is now carried in API/UI/proof: connector reach does not equal source trust.

## What Changed

- Added `lib/source-012-source-connector-layers.js`.
- Added `sourceLayerStatus` to `/api/source-of-truth`.
- Added a compact Source Layers panel to Data Sources.
- Added `scripts/process-source-012-check.mjs`.
- Closed `SOURCE-012` in live backlog and Current Sprint.
- Promoted `SOURCE-018` as the next Foundation card before extraction work.

## Proof

- `node --check lib/source-012-source-connector-layers.js lib/source-of-truth-payload.js public/foundation-source-registry-renderers.js public/foundation.js scripts/process-source-012-check.mjs`
- `npm run process:source-012-check -- --apply --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=SOURCE-012 --planApprovalRef=docs/process/approvals/SOURCE-012.json --closeoutKey=source-012-source-connector-live-layers-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=SOURCE-012 --closeoutKey=source-012-source-connector-live-layers-v1`
- `npm run process:foundation-ship -- --card=SOURCE-012 --planApprovalRef=docs/process/approvals/SOURCE-012.json --closeoutKey=source-012-source-connector-live-layers-v1 --commitRef=HEAD`

## Known Limits

- This does not run extraction.
- This does not add new connector access.
- This does not mutate source data, Drive permissions, credentials, provider config, or external systems.
- This does not redesign Data Sources beyond a compact live layer panel.

## Next

Continue Foundation-only with `SOURCE-018`.
