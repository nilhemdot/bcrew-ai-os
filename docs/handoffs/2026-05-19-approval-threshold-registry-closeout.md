# APPROVAL-THRESHOLD-REGISTRY-001 Closeout

Status: shipped on `main`.

## What Shipped

- Added `lib/approval-threshold-registry.js` as the shared source of truth for the Plan Critic approval threshold.
- Wired Plan Critic, approval integrity, Current Sprint normalization, Current Sprint store mapping, and code-quality audit drift detection to the registry.
- Updated the deep-audit findings route so the May 19 approval-threshold finding closes through `approval-threshold-registry-v1`.
- Added focused dogfood proving stale local threshold logic fails while the registry-owned path passes.

## Proof

- `node --check lib/approval-threshold-registry.js scripts/process-approval-threshold-registry-check.mjs`
- `npm run process:approval-threshold-registry-check -- --close-card --json`
- `npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=APPROVAL-THRESHOLD-REGISTRY-001 --planApprovalRef=docs/process/approvals/APPROVAL-THRESHOLD-REGISTRY-001.json --closeoutKey=approval-threshold-registry-v1 --commitRef=HEAD`

## Not Next

- This does not rewrite historical approval JSON or closeout text that mentions `9.8`.
- This does not change the approval threshold value.
- This does not redesign Plan Critic.

## Next

Continue `BUILD-INTEL-SNAPSHOT-BASELINE-001`.
