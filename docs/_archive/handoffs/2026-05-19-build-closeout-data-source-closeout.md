# BUILD-CLOSEOUT-DATA-SOURCE-001 Closeout

Closeout key: `build-closeout-data-source-v1`

## What Changed

- Added `SRC-FOUNDATION-BUILD-CLOSEOUTS-001` as the source identity for Foundation build closeout history.
- Added `lib/build-closeout-data-source.js` as the data-source boundary for closeout record access, validation, runtime source snapshot, and dogfood proof.
- Registered the closeout source contract in `lib/source-contracts.js` and mirrored it into `source_contract_registry`.
- Changed Build Log to read through the closeout data-source boundary instead of importing the raw closeout record registry.
- Updated the Build Log registry verifier to accept the new data-source import boundary.
- Added source-validation coverage for `SRC-FOUNDATION-BUILD-CLOSEOUTS-001`.
- Kept `/api/source-of-truth` under payload budget by preserving top-level connectors while removing duplicated `sourceLayerStatus.connectorRows`.
- Updated code-quality and deep-audit routing so the May 19 closeout-history finding is closed only by `build-closeout-data-source-v1`.

## Proof

Run:

```bash
node --check lib/build-closeout-data-source.js scripts/process-build-closeout-data-source-check.mjs lib/foundation-build-log.js lib/foundation-verifier-build-log-registry-assurance.js lib/code-quality-nightly-audit.js lib/source-of-truth-payload.js lib/source-contract-validation-layer.js scripts/process-source-contract-validation-layer-check.mjs scripts/process-foundation-build-log-monolith-slice-check.mjs
npm run process:build-closeout-data-source-check -- --close-card --json
npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch
npm run process:system-health-nightly-audit-check -- --json
npm run process:build-lane-repeated-failure-action-gate-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=BUILD-CLOSEOUT-DATA-SOURCE-001 --planApprovalRef=docs/process/approvals/BUILD-CLOSEOUT-DATA-SOURCE-001.json --closeoutKey=build-closeout-data-source-v1 --commitRef=HEAD
```

## Not Next

- Does not redesign Recent Builds or Build Log UI.
- Does not migrate all closeout records into a new Postgres table.
- Does not delete or rewrite closeout history.
- Does not change closeout matching/enrichment behavior.
- Does not start source/value/extraction expansion.

## Next

Continue `FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001`.
