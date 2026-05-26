# ENGINE-001 Planning Attrition Input Closeout

Card: `ENGINE-001`
Closeout key: `engine-001-planning-attrition-input-v1`
Generated: 2026-05-20T08:43:45.882Z

## What Changed

- Made `Planning Attrition Assumption` a first-class `Engine Inputs` source snapshot row backed by `SRC-FREEDOM-BHAG-001`.
- Kept the same value visible beside required recruiting pace in `Current Requirement` so operator context does not disappear.
- Kept `Live Attrition Pressure` separate and backed by `SRC-FREEDOM-ENGINE-001`.
- Updated both doc renderers so the Agent Engine input card shows attrition alongside GCI and split.
- Added focused proof that rejects missing input visibility and merged planning/live attrition semantics.

## Proof

- Focused status: `healthy`
- Planning attrition value: `15%`
- Planning attrition source: `SRC-FREEDOM-BHAG-001`

Proof commands:

- `node --check lib/foundation-strategy-source-snapshots.js lib/engine-001-planning-attrition-input.js scripts/process-engine-001-check.mjs public/doc.js public/foundation-doc-markdown-renderers.js`
- `npm run process:engine-001-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=ENGINE-001 --planApprovalRef=docs/process/approvals/ENGINE-001.json --closeoutKey=engine-001-planning-attrition-input-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=ENGINE-001 --closeoutKey=engine-001-planning-attrition-input-v1`
- `npm run process:foundation-ship -- --card=ENGINE-001 --planApprovalRef=docs/process/approvals/ENGINE-001.json --closeoutKey=engine-001-planning-attrition-input-v1 --commitRef=HEAD`

## Not Next

- No Google Sheet formula edits or spreadsheet-era blind cell rewrites.
- No ClickUp, FUB, finance, credential, OAuth, provider, Drive permission, external send, or public exposure mutation.
- No full Agent Engine rebuild, bonus-system rebuild, planning model redesign, or new source extraction.
- Do not hardcode live planning attrition values in markdown or frontend fixtures.
- Do not collapse planning attrition and live attrition into one metric.

## Next

Continue `MEMORY-005`.
